// ─────────────────────────────────────────────────────────────────────────
//  lib/pris.js — DigiHome Tech AS sin B2B-prising, bygget for MANGE kunder.
//
//  KONTEKST (avklart med eier):
//   • Tech er ren programvareleverandør og fakturerer KUN B2B: forvaltere og
//     eiendomsselskaper, per enhet med volumtrinn. DigiHome AS er FØRSTE kunde
//     – ikke den eneste. Alt er derfor modellert som en katalog av prisplaner
//     og en liste kunder som hver er tildelt en plan.
//   • Sluttkundepriser (5 %/honorar) er DigiHome AS sin sak (appens fakturamotor)
//     og ligger IKKE her.
//
//  Datamodell (Mongo):
//   • pris_innstillinger (id='konsern'): felles fakturainnstillinger.
//   • pris_planer: [{ id, navn, beskrivelse, prisModell, trinn[], selvbetjentPris,
//                     aktiv, standard }]
//   • pris_kunder:  [{ id, navn, orgnr, epost, planId, grunnlag, grunnlagSelvbetjent,
//                     enhetskilde('plattform'|'manuell'), manueltAntall, status,
//                     forste, notat, opprettet }]
//
//  «plattform»-kunden (DigiHome AS) teller enheter fra leieforholdene. Framtidige
//  kunder kan enten kobles til egen portefølje senere, eller settes med et manuelt
//  enhetsantall i mellomtiden.
// ─────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import { getDb } from './mongodb';

const C_SET = 'pris_innstillinger';
const C_PLAN = 'pris_planer';
const C_KUNDE = 'pris_kunder';
const C_GAMMEL = 'pris_config'; // v1 (én global config) — migreres inn
const C_PO_UTKAST = 'po_faktura_utkast'; // PowerOffice-utkast peker på kunde-id
const C_LAAST = 'pris_grunnlag_laast'; // frosset faktureringsgrunnlag per kunde+måned
const SET_ID = 'konsern';

export const STANDARD_SETTINGS = {
  id: SET_ID, valuta: 'NOK', produktnavn: 'Plattformlisens',
  mvaSats: 25, betalingsfristDager: 14, fakturadag: 1, levering: 'EHF',
  // ── Selger (DigiHome Tech AS) — alt redigerbart i adminportalen ──
  selgerNavn: 'DigiHome Tech AS', selgerOrgnr: '', selgerAdresse: '', selgerPostnr: '', selgerSted: '',
  selgerEpost: '', selgerTelefon: '', bankkonto: '', iban: '', mvaRegistrert: true,
  fakturaPrefiks: 'DHT',
  fakturanotat: 'Ved forsinket betaling påløper forsinkelsesrente etter forsinkelsesrenteloven.',
};

const STANDARD_TRINN = [
  { fraEnheter: 0, pris: 200 },
  { fraEnheter: 50, pris: 150 },
  { fraEnheter: 200, pris: 99 },
];

// Grunnlag = HVA som telles per kunde. «prorata» er ikke lenger et eget grunnlag,
// men en egen bryter (kunde.prorata) som gjelder begge grunnlagene.
const GRUNNLAG_VALG = ['alle', 'utleid_mnd'];
const GRUNNLAG_GAMMEL = { prorata: 'utleid_mnd' }; // v1-verdi → v2
const TRINNMODELL_VALG = ['progressiv', 'alle'];
const STATUS_VALG = ['aktiv', 'prove', 'inaktiv'];
const ROMMODELL_VALG = ['rom', 'bolig'];
// Selvbetjente enheter: 'leieforhold' = teller kun måneder med aktiv leietaker (alltid
// prorata) — «gratis å prøve, betal når det er ekte»; 'kunde' = følger kundens grunnlag.
const SELVBETJENT_GRUNNLAG_VALG = ['leieforhold', 'kunde'];
const MODELL_VERSJON = 4; // v4: selvbetjente enheter (grunnlag / prøveperiode / dvale på plan)

function num(v, fallback, { min = 0, maks = 1e9 } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(maks, Math.max(min, n));
}
const rens = (s, maks = 120) => String(s ?? '').slice(0, maks).trim();

function normaliserTrinn(trinnInn, fallback = STANDARD_TRINN) {
  const arr = Array.isArray(trinnInn) ? trinnInn : fallback;
  const t = arr
    .map((x) => ({ fraEnheter: Math.round(num(x.fraEnheter, 0, { maks: 1e6 })), pris: Math.round(num(x.pris, 0, { maks: 1e6 })) }))
    .sort((a, b) => a.fraEnheter - b.fraEnheter);
  if (!t.length) t.push({ fraEnheter: 0, pris: 0 });
  if (t[0].fraEnheter !== 0) t[0].fraEnheter = 0;
  return t;
}

function normaliserPlan(inn = {}, base = {}) {
  const trinnModell = TRINNMODELL_VALG.includes(inn.trinnModell) ? inn.trinnModell : (TRINNMODELL_VALG.includes(base.trinnModell) ? base.trinnModell : 'progressiv');
  return {
    id: base.id || inn.id || randomUUID(),
    navn: rens(inn.navn ?? base.navn ?? 'Ny plan', 80) || 'Ny plan',
    beskrivelse: rens(inn.beskrivelse ?? base.beskrivelse ?? '', 200),
    prisModell: (inn.prisModell ?? base.prisModell) === 'per_type' ? 'per_type' : 'blandet',
    trinn: normaliserTrinn(inn.trinn ?? base.trinn),
    // progressiv: hvert trinn priser kun enhetene i sitt intervall (ingen hopp).
    // alle: totalt antall bestemmer én pris for hele porteføljen (v1-oppførsel).
    trinnModell,
    selvbetjentPris: Math.round(num(inn.selvbetjentPris, base.selvbetjentPris ?? 79, { maks: 1e6 })),
    // Minstepris per måned (eks. mva). 0 = ingen. Justeringslinje når summen er lavere.
    minstepris: Math.round(num(inn.minstepris, base.minstepris ?? 0, { maks: 1e7 })),
    // Andel av enhetsprisen for LEDIGE enheter under forvaltning (0–100 %).
    ledigFaktor: Math.round(num(inn.ledigFaktor, base.ledigFaktor ?? 100, { min: 0, maks: 100 })),
    // Rom i bofellesskap: 'rom' = hvert rom er én enhet × romFaktor %; 'bolig' = hele boligen én enhet.
    romModell: ROMMODELL_VALG.includes(inn.romModell) ? inn.romModell : (ROMMODELL_VALG.includes(base.romModell) ? base.romModell : 'rom'),
    romFaktor: Math.round(num(inn.romFaktor, base.romFaktor ?? 100, { min: 0, maks: 100 })),
    // Selvbetjente enheter (anbefalt: kun med leieforhold, 30 dager prøve, dvale etter 90 dager).
    selvbetjentGrunnlag: SELVBETJENT_GRUNNLAG_VALG.includes(inn.selvbetjentGrunnlag) ? inn.selvbetjentGrunnlag : (SELVBETJENT_GRUNNLAG_VALG.includes(base.selvbetjentGrunnlag) ? base.selvbetjentGrunnlag : 'leieforhold'),
    // Dager gratis fra første innflytting i enheten (0 = ingen prøveperiode).
    selvbetjentProveDager: Math.round(num(inn.selvbetjentProveDager, base.selvbetjentProveDager ?? 30, { min: 0, maks: 365 })),
    // Enhet uten leieforhold i så mange dager regnes som i dvale og telles ikke (0 = aldri).
    selvbetjentDvaleDager: Math.round(num(inn.selvbetjentDvaleDager, base.selvbetjentDvaleDager ?? 90, { min: 0, maks: 730 })),
    aktiv: inn.aktiv != null ? !!inn.aktiv : (base.aktiv != null ? base.aktiv : true),
    standard: inn.standard != null ? !!inn.standard : (base.standard || false),
    modell: MODELL_VERSJON,
    opprettet: base.opprettet || new Date().toISOString(),
    oppdatert: new Date().toISOString(),
  };
}

function normGrunnlag(v, fallback) {
  const x = GRUNNLAG_GAMMEL[v] || v;
  return GRUNNLAG_VALG.includes(x) ? x : fallback;
}

function normaliserKunde(inn = {}, base = {}) {
  const enhetskilde = (inn.enhetskilde ?? base.enhetskilde) === 'manuell' ? 'manuell' : 'plattform';
  // v1-kunder med grunnlag 'prorata' → 'utleid_mnd' + prorata på.
  const baseProrata = base.prorata != null ? !!base.prorata : (base.grunnlag === 'prorata' || base.grunnlagSelvbetjent === 'prorata');
  return {
    id: base.id || inn.id || randomUUID(),
    navn: rens(inn.navn ?? base.navn ?? '', 100),
    orgnr: rens(inn.orgnr ?? base.orgnr ?? '', 20),
    epost: rens(inn.epost ?? base.epost ?? '', 120),
    // Fakturaadresse + kundens referanse (vises på fakturaen; PowerOffice henter adresse fra kundekortet)
    adresse: rens(inn.adresse ?? base.adresse ?? '', 120),
    postnr: rens(inn.postnr ?? base.postnr ?? '', 10),
    sted: rens(inn.sted ?? base.sted ?? '', 60),
    referanse: rens(inn.referanse ?? base.referanse ?? '', 80),
    planId: rens(inn.planId ?? base.planId ?? '', 60),
    // Nye kunder: «alle enheter under forvaltning» (anbefalt). Eksisterende beholder sitt.
    grunnlag: normGrunnlag(inn.grunnlag, normGrunnlag(base.grunnlag, 'alle')),
    grunnlagSelvbetjent: normGrunnlag(inn.grunnlagSelvbetjent, normGrunnlag(base.grunnlagSelvbetjent, 'alle')),
    // Prorata: vekt = dager i måneden enheten var med / dager i måneden. Av → én dag = hel måned.
    prorata: inn.prorata != null ? !!inn.prorata : (base.id ? baseProrata : true),
    enhetskilde,
    manueltAntall: Math.round(num(inn.manueltAntall, base.manueltAntall ?? 0, { maks: 1e6 })),
    status: STATUS_VALG.includes(inn.status) ? inn.status : (base.status || 'aktiv'),
    // «forste» (konsernintern kunde) kan aldri settes fra klienten — kun seedingen
    // oppretter den, og den arves fra eksisterende dokument ved redigering.
    forste: Boolean(base.forste),
    notat: rens(inn.notat ?? base.notat ?? '', 400),
    modell: MODELL_VERSJON,
    opprettet: base.opprettet || new Date().toISOString(),
    oppdatert: new Date().toISOString(),
  };
}

const utenId = (d) => { if (!d) return d; const { _id, ...rest } = d; return rest; };
const erDuplikatFeil = (e) => Boolean(e && (e.code === 11000 || /E11000/.test(String(e.message || ''))));
const tidStr = (v) => String(v || '');

// ── Integritet: unike indekser (én gang per prosess) ────────────────────────
// Seedingen var før «tell → sett inn». Ved første lasting mot en tom database
// fyrer admin-siden to API-kall samtidig; begge så 0 kunder og begge satte inn
// «DigiHome AS» (prod, sept. 2026). Nå garanterer databasen selv at det finnes
// maks ÉN konsernintern kunde, ÉN standardplan og ÉN innstillingsrad, og
// seedingen skjer som upsert med $setOnInsert (atomisk).
let _indekserOk = false;
async function sikreIndekser(db) {
  if (_indekserOk) return;
  const spes = [
    [C_SET, { id: 1 }, { unique: true, name: 'pris_uniq_id' }],
    [C_PLAN, { id: 1 }, { unique: true, name: 'pris_uniq_id' }],
    [C_PLAN, { standard: 1 }, { unique: true, name: 'pris_uniq_standard', partialFilterExpression: { standard: true } }],
    [C_KUNDE, { id: 1 }, { unique: true, name: 'pris_uniq_id' }],
    [C_KUNDE, { forste: 1 }, { unique: true, name: 'pris_uniq_forste', partialFilterExpression: { forste: true } }],
    [C_LAAST, { kundeId: 1, maaned: 1 }, { unique: true, name: 'pris_uniq_kunde_maaned' }],
  ];
  let alleOk = true;
  for (const [koll, nokler, opts] of spes) {
    // eslint-disable-next-line no-await-in-loop
    try { await db.collection(koll).createIndex(nokler, opts); } catch (e) { alleOk = false; }
  }
  _indekserOk = alleOk; // feilet én (f.eks. duplikater ennå ikke ryddet) → prøv igjen neste kall
}

// PowerOffice-utkast som pekte på en slettet/duplisert kunde flyttes til kunden
// som beholdes. Ingen rader slettes — et utkast i Go er et faktum vi vil se.
async function flyttUtkast(db, fraKundeId, tilKundeId) {
  if (!fraKundeId || !tilKundeId || fraKundeId === tilKundeId) return 0;
  const r = await db.collection(C_PO_UTKAST).updateMany(
    { kundeId: fraKundeId },
    { $set: { kundeId: tilKundeId, flyttetFraKundeId: fraKundeId, flyttet: new Date().toISOString() } },
  );
  return r.modifiedCount || 0;
}

// ── Selvhelbredende opprydding av duplikater fra den gamle seedingen ────────
// Kjøres før indeksene opprettes (unik indeks kan ikke bygges over duplikater).
// Idempotent og trygg å kjøre parallelt: sletting av samme rad to ganger er no-op.
async function ryddDuplikater(db) {
  const rapport = { innstillinger: 0, planer: 0, kunder: 0 };

  // Innstillinger: flere rader med id='konsern' → behold den sist oppdaterte.
  const sett = await db.collection(C_SET).find({ id: SET_ID }).toArray();
  if (sett.length > 1) {
    const behold = [...sett].sort((a, b) => tidStr(b.oppdatert).localeCompare(tidStr(a.oppdatert)))[0];
    const r = await db.collection(C_SET).deleteMany({ id: SET_ID, _id: { $ne: behold._id } });
    rapport.innstillinger = r.deletedCount || 0;
  }

  // Planer: flere standardplaner → eldste beholdes som standard. Identiske
  // seed-kopier slås sammen (kunder pekes om, kopien slettes); en plan som er
  // redigert beholdes, men mister standard-flagget.
  const standardPlaner = await db.collection(C_PLAN).find({ standard: true }).sort({ opprettet: 1 }).toArray();
  if (standardPlaner.length > 1) {
    const [behold, ...andre] = standardPlaner;
    const signatur = (p) => JSON.stringify({ n: p.navn, m: p.prisModell, t: p.trinn, s: p.selvbetjentPris });
    for (const p of andre) {
      if (signatur(p) === signatur(behold)) {
        // eslint-disable-next-line no-await-in-loop
        await db.collection(C_KUNDE).updateMany({ planId: p.id }, { $set: { planId: behold.id } });
        // eslint-disable-next-line no-await-in-loop
        await db.collection(C_PLAN).deleteOne({ _id: p._id });
        rapport.planer += 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        await db.collection(C_PLAN).updateOne({ _id: p._id }, { $set: { standard: false, oppdatert: new Date().toISOString() } });
      }
    }
  }

  // Kunder: flere «forste» (konsernintern) → behold den som (1) har flest
  // PowerOffice-utkast, (2) er mest utfylt, (3) er eldst. Tomme felt på den som
  // beholdes fylles fra duplikatene, utkast pekes om, duplikatene slettes.
  const forste = await db.collection(C_KUNDE).find({ forste: true }).sort({ opprettet: 1 }).toArray();
  if (forste.length > 1) {
    const utkast = await db.collection(C_PO_UTKAST).find({ kundeId: { $in: forste.map((k) => k.id) } }).project({ kundeId: 1 }).toArray();
    const antUtkast = (k) => utkast.filter((u) => u.kundeId === k.id).length;
    const utfylt = (k) => ['orgnr', 'epost', 'notat'].filter((f) => rens(k[f]).length > 0).length + (k.enhetskilde === 'manuell' && k.manueltAntall > 0 ? 1 : 0);
    const behold = [...forste].sort((a, b) => (antUtkast(b) - antUtkast(a)) || (utfylt(b) - utfylt(a)) || tidStr(a.opprettet).localeCompare(tidStr(b.opprettet)))[0];
    const andre = forste.filter((k) => String(k._id) !== String(behold._id));
    const patch = {};
    for (const f of ['orgnr', 'epost', 'notat']) {
      if (!rens(behold[f])) { const kilde = andre.find((k) => rens(k[f])); if (kilde) patch[f] = kilde[f]; }
    }
    if (Object.keys(patch).length) await db.collection(C_KUNDE).updateOne({ _id: behold._id }, { $set: { ...patch, oppdatert: new Date().toISOString() } });
    for (const k of andre) {
      // eslint-disable-next-line no-await-in-loop
      await flyttUtkast(db, k.id, behold.id);
      // eslint-disable-next-line no-await-in-loop
      const r = await db.collection(C_KUNDE).deleteOne({ _id: k._id });
      rapport.kunder += r.deletedCount || 0;
    }
  }

  if (rapport.innstillinger || rapport.planer || rapport.kunder) {
    console.warn('[pris] Ryddet duplikater fra gammel seeding:', JSON.stringify(rapport));
  }
  return rapport;
}

// ── Migrering til modell v2 (progressive trinn, prorata-bryter, minstepris) ──
// Kjøres én gang per dokument (modell < 2). Planer: nye felt med v1-ekvivalent
// oppførsel der det finnes (trinnModell 'progressiv' er avklart med eier; med
// færre enheter enn andre trinn gir den identisk beløp). Kunder: 'prorata' som
// grunnlag blir 'utleid_mnd' + prorata på. Den konserninterne kunden får det
// anbefalte grunnlaget «alle enheter under forvaltning» + prorata (avklart med
// eier sept. 2026) — kan endres i admin med ett klikk.
async function migrerModellV2(db) {
  const planer = await db.collection(C_PLAN).find({ $or: [{ modell: { $exists: false } }, { modell: { $lt: MODELL_VERSJON } }] }).toArray();
  for (const p of planer) {
    // eslint-disable-next-line no-await-in-loop
    await db.collection(C_PLAN).updateOne({ _id: p._id }, { $set: {
      trinnModell: TRINNMODELL_VALG.includes(p.trinnModell) ? p.trinnModell : 'progressiv',
      minstepris: Math.round(num(p.minstepris, 0, { maks: 1e7 })),
      ledigFaktor: Math.round(num(p.ledigFaktor, 100, { min: 0, maks: 100 })),
      romModell: ROMMODELL_VALG.includes(p.romModell) ? p.romModell : 'rom',
      romFaktor: Math.round(num(p.romFaktor, 100, { min: 0, maks: 100 })),
      // v4: selvbetjente enheter — anbefalte standardverdier (avklart med eier sept. 2026)
      selvbetjentGrunnlag: SELVBETJENT_GRUNNLAG_VALG.includes(p.selvbetjentGrunnlag) ? p.selvbetjentGrunnlag : 'leieforhold',
      selvbetjentProveDager: Math.round(num(p.selvbetjentProveDager, 30, { min: 0, maks: 365 })),
      selvbetjentDvaleDager: Math.round(num(p.selvbetjentDvaleDager, 90, { min: 0, maks: 730 })),
      modell: MODELL_VERSJON,
    } });
  }
  const kunder = await db.collection(C_KUNDE).find({ $or: [{ modell: { $exists: false } }, { modell: { $lt: MODELL_VERSJON } }] }).toArray();
  for (const k of kunder) {
    // v2-reglene (grunnlag/prorata) gjelder KUN dokumenter fra før v2 — senere
    // versjonshopp skal aldri overskrive valg eier har gjort i admin.
    const fraV1 = !(Number(k.modell) >= 2);
    const varProrata = k.grunnlag === 'prorata' || k.grunnlagSelvbetjent === 'prorata';
    const set = fraV1 ? {
      grunnlag: k.forste ? 'alle' : normGrunnlag(k.grunnlag, 'utleid_mnd'),
      grunnlagSelvbetjent: k.forste ? 'alle' : normGrunnlag(k.grunnlagSelvbetjent, 'utleid_mnd'),
      prorata: k.prorata != null ? !!k.prorata : (k.forste ? true : varProrata),
      modell: MODELL_VERSJON,
    } : { modell: MODELL_VERSJON };
    // eslint-disable-next-line no-await-in-loop
    await db.collection(C_KUNDE).updateOne({ _id: k._id }, { $set: set });
  }
  if (planer.length || kunder.length) console.warn(`[pris] Migrerte til modell v${MODELL_VERSJON}:`, JSON.stringify({ planer: planer.length, kunder: kunder.length }));
}

// ── Seeding + migrering fra v1 (pris_config) ────────────────────────────────
// Rekkefølge er bevisst: rydd → indekser → atomisk upsert. Parallelle kall kan
// i verste fall få E11000 fra databasen — det betyr bare at «den andre vant»,
// og svelges. Ingen «tell → sett inn» lenger.
async function ensureSeed(db) {
  await ryddDuplikater(db);
  await sikreIndekser(db);
  await migrerModellV2(db);
  const gammel = await db.collection(C_GAMMEL).findOne({ id: 'konsern' }).catch(() => null);

  const set = {
    ...STANDARD_SETTINGS,
    valuta: gammel?.valuta || STANDARD_SETTINGS.valuta,
    produktnavn: gammel?.produktnavn || STANDARD_SETTINGS.produktnavn,
    mvaSats: gammel?.mvaSats ?? STANDARD_SETTINGS.mvaSats,
    betalingsfristDager: gammel?.betalingsfristDager ?? STANDARD_SETTINGS.betalingsfristDager,
    fakturadag: gammel?.fakturadag ?? STANDARD_SETTINGS.fakturadag,
    levering: gammel?.levering || STANDARD_SETTINGS.levering,
    oppdatert: new Date().toISOString(),
  };
  try { await db.collection(C_SET).updateOne({ id: SET_ID }, { $setOnInsert: set }, { upsert: true }); } catch (e) { if (!erDuplikatFeil(e)) throw e; }

  if ((await db.collection(C_PLAN).countDocuments({}, { limit: 1 })) === 0) {
    const plan = normaliserPlan({
      navn: 'Forvalter',
      beskrivelse: 'Standard plan for forvaltere og eiendomsselskaper. Volumtrinn per enhet.',
      prisModell: gammel?.prisModell || 'blandet',
      trinn: gammel?.trinn || STANDARD_TRINN,
      selvbetjentPris: gammel?.selvbetjentPris ?? 79,
      aktiv: true, standard: true,
    });
    try { await db.collection(C_PLAN).updateOne({ standard: true }, { $setOnInsert: plan }, { upsert: true }); } catch (e) { if (!erDuplikatFeil(e)) throw e; }
  }

  if ((await db.collection(C_KUNDE).countDocuments({}, { limit: 1 })) === 0) {
    const std = await db.collection(C_PLAN).findOne({ standard: true }) || await db.collection(C_PLAN).findOne({});
    const kunde = {
      ...normaliserKunde({
        navn: 'DigiHome AS', enhetskilde: 'plattform',
        grunnlag: gammel?.grunnlag || 'utleid_mnd',
        grunnlagSelvbetjent: gammel?.grunnlagSelvbetjent || 'utleid_mnd',
        planId: std?.id || '', status: 'aktiv',
        notat: 'Konsernintern kunde — driftsselskapet. Første kunde på plattformen.',
      }),
      forste: true,
    };
    try { await db.collection(C_KUNDE).updateOne({ forste: true }, { $setOnInsert: kunde }, { upsert: true }); } catch (e) { if (!erDuplikatFeil(e)) throw e; }
  }
}

// ── Hent alt (seeder ved behov) ─────────────────────────────────────────────
export async function hentAlt(dbArg) {
  const db = dbArg || (await getDb());
  await ensureSeed(db);
  const [settings, planer, kunder] = await Promise.all([
    db.collection(C_SET).findOne({ id: SET_ID }),
    db.collection(C_PLAN).find({}).sort({ standard: -1, navn: 1 }).toArray(),
    db.collection(C_KUNDE).find({}).sort({ forste: -1, navn: 1 }).toArray(),
  ]);
  return { settings: utenId({ ...STANDARD_SETTINGS, ...settings }), planer: planer.map(utenId), kunder: kunder.map(utenId) };
}

export async function lagreInnstillinger(patch = {}, dbArg) {
  const db = dbArg || (await getDb());
  await ensureSeed(db);
  const naa = await db.collection(C_SET).findOne({ id: SET_ID });
  const oppd = {
    ...STANDARD_SETTINGS, ...utenId(naa),
    valuta: rens(patch.valuta ?? naa?.valuta ?? 'NOK', 8) || 'NOK',
    produktnavn: rens(patch.produktnavn ?? naa?.produktnavn ?? STANDARD_SETTINGS.produktnavn, 80),
    mvaSats: num(patch.mvaSats, naa?.mvaSats ?? 25, { min: 0, maks: 100 }),
    betalingsfristDager: Math.round(num(patch.betalingsfristDager, naa?.betalingsfristDager ?? 14, { min: 0, maks: 180 })),
    fakturadag: Math.round(num(patch.fakturadag, naa?.fakturadag ?? 1, { min: 1, maks: 28 })),
    levering: patch.levering === 'PdfByEmail' ? 'PdfByEmail' : 'EHF',
    // ── Selgeropplysninger + faktura-oppsett ──
    selgerNavn: rens(patch.selgerNavn ?? naa?.selgerNavn ?? STANDARD_SETTINGS.selgerNavn, 120) || STANDARD_SETTINGS.selgerNavn,
    selgerOrgnr: rens(patch.selgerOrgnr ?? naa?.selgerOrgnr ?? '', 20),
    selgerAdresse: rens(patch.selgerAdresse ?? naa?.selgerAdresse ?? '', 160),
    selgerPostnr: rens(patch.selgerPostnr ?? naa?.selgerPostnr ?? '', 12),
    selgerSted: rens(patch.selgerSted ?? naa?.selgerSted ?? '', 80),
    selgerEpost: rens(patch.selgerEpost ?? naa?.selgerEpost ?? '', 120),
    selgerTelefon: rens(patch.selgerTelefon ?? naa?.selgerTelefon ?? '', 40),
    bankkonto: rens(patch.bankkonto ?? naa?.bankkonto ?? '', 40),
    iban: rens(patch.iban ?? naa?.iban ?? '', 60),
    mvaRegistrert: patch.mvaRegistrert != null ? !!patch.mvaRegistrert : (naa?.mvaRegistrert != null ? !!naa.mvaRegistrert : true),
    fakturaPrefiks: (rens(patch.fakturaPrefiks ?? naa?.fakturaPrefiks ?? 'DHT', 8) || 'DHT').toUpperCase(),
    fakturanotat: rens(patch.fakturanotat ?? naa?.fakturanotat ?? STANDARD_SETTINGS.fakturanotat, 400),
    // PowerOffice-selskap det faktureres FRA (regnskap_selskaper.id). Tom = auto («Tech» i navnet, ellers første).
    poSelskapId: rens(patch.poSelskapId ?? naa?.poSelskapId ?? '', 60),
    oppdatert: new Date().toISOString(),
  };
  await db.collection(C_SET).updateOne({ id: SET_ID }, { $set: oppd }, { upsert: true });
  return utenId(oppd);
}

// ── Planer CRUD ─────────────────────────────────────────────────────────────
export async function lagrePlan(inn = {}, dbArg) {
  const db = dbArg || (await getDb());
  await ensureSeed(db);
  const eksisterende = inn.id ? await db.collection(C_PLAN).findOne({ id: inn.id }) : null;
  const plan = normaliserPlan(inn, utenId(eksisterende) || {});
  if (plan.standard) await db.collection(C_PLAN).updateMany({ id: { $ne: plan.id } }, { $set: { standard: false } });
  await db.collection(C_PLAN).updateOne({ id: plan.id }, { $set: plan }, { upsert: true });
  return plan;
}
export async function slettPlan(id, dbArg) {
  const db = dbArg || (await getDb());
  const brukt = await db.collection(C_KUNDE).countDocuments({ planId: id });
  if (brukt > 0) return { ok: false, feil: 'Planen er i bruk av kunder', brukt };
  const total = await db.collection(C_PLAN).countDocuments();
  if (total <= 1) return { ok: false, feil: 'Kan ikke slette siste plan' };
  await db.collection(C_PLAN).deleteOne({ id });
  return { ok: true };
}

// ── Kunder CRUD ──────────────────────────────────────────────────────────────
export async function lagreKunde(inn = {}, dbArg) {
  const db = dbArg || (await getDb());
  await ensureSeed(db);
  const eksisterende = inn.id ? await db.collection(C_KUNDE).findOne({ id: inn.id }) : null;
  const kunde = normaliserKunde(inn, utenId(eksisterende) || {});
  if (!kunde.navn) return { ok: false, feil: 'Navn kreves' };
  if (!kunde.planId) { const std = await db.collection(C_PLAN).findOne({ standard: true }) || await db.collection(C_PLAN).findOne({}); kunde.planId = std?.id || ''; }
  try {
    await db.collection(C_KUNDE).updateOne({ id: kunde.id }, { $set: kunde }, { upsert: true });
  } catch (e) {
    if (erDuplikatFeil(e)) return { ok: false, feil: 'Kunden finnes allerede — last siden på nytt' };
    throw e;
  }
  return { ok: true, kunde };
}
// Den konserninterne kunden («forste») kan ikke slettes — med ett unntak: finnes
// det flere (rest fra gammel seeding) kan overskuddet slettes, og PowerOffice-
// utkastene deres flyttes til den som blir igjen.
export async function slettKunde(id, dbArg) {
  const db = dbArg || (await getDb());
  const k = await db.collection(C_KUNDE).findOne({ id });
  if (!k) return { ok: false, feil: 'Fant ikke kunden' };
  if (k.forste) {
    const annenForste = await db.collection(C_KUNDE).findOne({ forste: true, id: { $ne: id } });
    if (!annenForste) return { ok: false, feil: 'Kan ikke slette den konserninterne kunden' };
    await flyttUtkast(db, id, annenForste.id);
  }
  await db.collection(C_KUNDE).deleteOne({ id });
  return { ok: true };
}

// ═════════════════════════════════════════════════════════════════════════════
//  PRISBEREGNING (modell v2)
//
//  Per enhet og måned beregnes to vekter (0–1):
//   · vektUtleid   — andel av måneden enheten var UTLEID (faktisk leie).
//   · vektLedig    — andel av måneden enheten var under forvaltning men ledig.
//  Kundens grunnlag bestemmer hva som telles:
//   · 'alle'       — alle enheter under forvaltning: vekt = utleid + ledig × ledigFaktor
//   · 'utleid_mnd' — kun utleide: vekt = utleid
//  Kundens prorata-bryter bestemmer om vektene følger dager (på) eller er 0/1 (av).
//
//  Vektet antall fordeles så på planens volumtrinn:
//   · 'progressiv' — hvert trinn priser kun enhetene i sitt intervall (ingen hopp)
//   · 'alle'       — antall enheter bestemmer én pris for hele porteføljen (v1)
//  Til slutt: minstepris (justeringslinje) og mva.
//
//  Datakilden er plattformens ØYEBLIKKSBILDE (én rad per enhet med nåværende
//  leieforhold). Derfor fryses grunnlaget per måned ved fakturering (se laas*).
// ═════════════════════════════════════════════════════════════════════════════

// ── Volumtrinn ───────────────────────────────────────────────────────────────
export function prisForAntall(trinn, n) {
  const sortert = [...(trinn || [])].sort((a, b) => a.fraEnheter - b.fraEnheter);
  let pris = sortert[0]?.pris || 0;
  for (const t of sortert) if (n >= t.fraEnheter) pris = t.pris;
  return pris;
}

const r2 = (x) => Math.round(x * 100) / 100;
const EPS = 1e-9;

// Fordeler et (vektet) antall på trinnene. Returnerer segmenter { fra, til, antall, pris }.
//  progressiv: fyller trinn for trinn (fra = første enhetsnummer i trinnet, til = siste, null = åpent).
//  alle:       ett segment — prisen bestemmes av antallEnheter (hele enheter), ikke vekten.
export function fordelPaaTrinn(trinn, vektet, modell = 'progressiv', antallEnheter = null) {
  const sortert = [...(trinn || [])].sort((a, b) => a.fraEnheter - b.fraEnheter);
  const W = Math.max(0, Number(vektet) || 0);
  if (!sortert.length || W <= EPS) return [];
  if (modell !== 'progressiv') {
    const n = antallEnheter != null ? antallEnheter : Math.ceil(W - EPS);
    return [{ fra: 1, til: null, antall: r2(W), pris: prisForAntall(sortert, n) }];
  }
  // Trinn «fra 50» betyr at enhet nr. 50 er den første til trinnets pris (som i
  // v1: n ≥ fraEnheter). Første trinn dekker derfor enhet 1–49, neste 50–199, osv.
  const seg = [];
  let rest = W;
  for (let i = 0; i < sortert.length && rest > EPS; i += 1) {
    const fraNr = Math.max(1, sortert[i].fraEnheter);
    const nesteFra = i + 1 < sortert.length ? sortert[i + 1].fraEnheter : Infinity;
    const kap = nesteFra - fraNr;
    if (kap <= 0) continue;
    const ant = Math.min(rest, kap);
    if (ant > EPS) seg.push({ fra: fraNr, til: nesteFra === Infinity ? null : nesteFra - 1, antall: r2(ant), pris: sortert[i].pris });
    rest -= ant;
  }
  return seg;
}

// Sum eks. mva for et vektet antall (brukes av UI-eksempler og tester).
export function belopForVektet(trinn, vektet, modell = 'progressiv', antallEnheter = null) {
  return Math.round(fordelPaaTrinn(trinn, vektet, modell, antallEnheter).reduce((s, x) => s + x.antall * x.pris, 0));
}

// ── Grunnlagshjelpere ─────────────────────────────────────────────────────────
function mndSpenn(maaned) {
  const [y, m] = String(maaned).split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), slutt: new Date(Date.UTC(y, m, 0)), dager: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}
const dato = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00Z`) : null);
const erForvaltet = (row) => /forvalt/i.test(String(row.service_level || 'Full forvaltning'));
const dagerMellom = (fra, til) => Math.round((til - fra) / 86400000) + 1;

// Dager i måneden enheten var utleid (faktisk leie). 0 hvis ikke utleid nå.
// Utleid nå men ukjent innflytting (kontrakt mangler i eksporten) → hele måneden.
function utleidSpenn(row, start, slutt) {
  if (row.income_type && row.income_type !== 'actual') return null;
  const inn = dato(row.move_in_date);
  if (!inn) return { fra: start, til: slutt };
  if (inn > slutt) return null;
  const ut = dato(row.move_out_date); if (ut && ut < start) return null;
  const fra = inn > start ? inn : start; const til = ut && ut < slutt ? ut : slutt;
  return til < fra ? null : { fra, til };
}
// Dager i måneden enheten var under (aktiv) forvaltning. Ukjent start → hele måneden.
// Enheter som har gått ut av forvaltning finnes ikke lenger i øyeblikksbildet —
// de faktureres t.o.m. siste måned de er med (grunnlaget fryses på fakturadagen).
function forvaltetSpenn(row, start, slutt) {
  const aktiv = !row.forvaltning_status || row.forvaltning_status === 'active';
  if (!aktiv) return null;
  const fs = dato(row.forvaltning_start);
  if (!fs) return { fra: start, til: slutt };
  if (fs > slutt) return null;
  return { fra: fs > start ? fs : start, til: slutt };
}
// Dager i spennet a som også ligger i vinduet v.
function overlappDager(a, v) {
  if (!a || !v) return 0;
  const fra = v.fra > a.fra ? v.fra : a.fra; const til = v.til < a.til ? v.til : a.til;
  return til < fra ? 0 : dagerMellom(fra, til);
}

// ── Selvbetjente enheter: prøveperiode og dvale ──────────────────────────────
// Øyeblikksbildet har bare NÅVÆRENDE leieforhold. Derfor husker vi per enhet
// (pris_enhet_minne) første innflytting vi har sett, når enheten først ble
// observert og sist var utleid — så prøveperioden gis én gang per enhet, ikke
// per leietakerbytte, og dvale kan regnes for enheter som aldri fikk leietaker.
const C_MINNE = 'pris_enhet_minne';
const isoDag = (d) => d.toISOString().slice(0, 10);

// Når kom enheten på plattformen? units/export.createdAt (via leieforhold.registrert), ellers
// minnets registrert. Ingen dato → ingen avgrensning (gammel oppførsel). NB: minnets forstSett
// brukes bevisst IKKE — vi begynte å observere sent, og ville ekskludert gamle enheter feil.
function registrertDato(row, minne) {
  return dato(row.registrert || minne?.registrert) || null;
}
// Prøvevindu: [anker, + proveDager − 1] der anker = seneste av første innflytting og registrering.
// En eier som legger inn en bolig i september med leietaker fra 2021 får prøven fra september —
// ikke en prøve som «utløp» i 2021. Ukjent innflytting → ingen prøve.
function proveVindu(row, minne, proveDager, reg = null) {
  if (!(proveDager > 0)) return null;
  const innflytting = dato(minne?.forsteInnflytting || row.move_in_date);
  if (!innflytting) return null;
  const forste = reg && reg > innflytting ? reg : innflytting;
  return { fra: forste, til: new Date(forste.getTime() + (proveDager - 1) * 86400000) };
}
// Dvale: ikke utleid i måneden og siste aktivitet (utleid / utflytting / først sett)
// er mer enn dvaleDager før månedens slutt. Uten minne vet vi ikke → ikke dvale.
function erIDvale(row, minne, dvaleDager, slutt, dU) {
  if (!(dvaleDager > 0) || dU > 0) return false;
  const kandidater = [minne?.sistUtleid, minne?.sisteUtflytting, row.move_out_date, minne?.forsteInnflytting, minne?.forstSett].map(dato).filter(Boolean);
  if (!kandidater.length) return false;
  const siste = new Date(Math.max(...kandidater.map((d) => d.getTime())));
  return (slutt - siste) / 86400000 > dvaleDager;
}

// Oppdaterer enhetsminnet fra et øyeblikksbilde (idempotent, én upsert per enhet).
export async function oppdaterEnhetMinne(db, rows, naa = new Date()) {
  const i = isoDag(naa);
  const ops = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const id = String(r.enhet_id || '').trim(); if (!id) continue;
    const utleidNaa = (!r.income_type || r.income_type === 'actual') && (r.group ? r.group === 'leased' : Boolean(r.tenant_name));
    const set = { sistSett: i, address: String(r.address || '').slice(0, 160), service_level: String(r.service_level || '').slice(0, 40) };
    const min = {}; const max = {};
    if (r.move_in_date) min.forsteInnflytting = String(r.move_in_date).slice(0, 10);
    if (r.registrert) min.registrert = String(r.registrert).slice(0, 10);
    if (r.move_out_date) max.sisteUtflytting = String(r.move_out_date).slice(0, 10);
    if (utleidNaa) max.sistUtleid = i;
    const upd = { $setOnInsert: { enhet_id: id, forstSett: i }, $set: set };
    if (Object.keys(min).length) upd.$min = min;
    if (Object.keys(max).length) upd.$max = max;
    ops.push({ updateOne: { filter: { enhet_id: id }, update: upd, upsert: true } });
  }
  if (!ops.length) return 0;
  try { await db.collection(C_MINNE).createIndex({ enhet_id: 1 }, { unique: true, name: 'pris_uniq_enhet' }); } catch (e) { /* finnes */ }
  try { await db.collection(C_MINNE).bulkWrite(ops, { ordered: false }); } catch (e) { if (!erDuplikatFeil(e)) throw e; }
  return ops.length;
}
export async function hentEnhetMinne(db) {
  const liste = await db.collection(C_MINNE).find({}, { projection: { _id: 0 } }).toArray();
  return new Map(liste.map((d) => [d.enhet_id, d]));
}
// Minnet oppdateres maks hvert 10. minutt per prosess — lesing skjer alltid.
let minneSistOppdatert = 0;
export async function beregnGrunnlagDb(db, rows, plan, kunde, settings, maaned) {
  let minne = null;
  if (kunde?.enhetskilde !== 'manuell' && Array.isArray(rows) && rows.length) {
    try {
      if (Date.now() - minneSistOppdatert > 10 * 60 * 1000) { await oppdaterEnhetMinne(db, rows); minneSistOppdatert = Date.now(); }
      minne = await hentEnhetMinne(db);
    } catch (e) { minne = null; }
  }
  return beregnGrunnlag(rows, plan, kunde, settings, maaned, { minne });
}

// Rom i bofellesskap: plattformen gir én rad per rom (enhet_id '<bolig>:rom-N').
const erRomRad = (r) => r.unit_type === 'Rom i bofellesskap' || /:rom-/.test(String(r.enhet_id || ''));
const boligNokkel = (r) => String(r.enhet_id || '').split(':')[0] || `adr:${String(r.address || '').trim().toLowerCase()}`;

// Vekter for én rad: dU/dF = dager utleid / under forvaltning, vU/vL = vekt utleid / ledig.
// prove = prøvevindu (selvbetjente): prøvedagene trekkes fra både utleid og forvaltet.
// reg = dato enheten kom på plattformen: ingen dager før den telles — verken utleid eller forvaltet.
function vekter(r, grunnlag, prorata, start, slutt, dager, prove = null, reg = null) {
  if (reg && reg > slutt) return { med: false, dU: 0, dF: 0, dP: 0, vU: 0, vL: 0, forRegistrering: true };
  const klipp = (sp) => (sp && reg && reg > sp.fra ? (reg > sp.til ? null : { fra: reg, til: sp.til }) : sp);
  const uS = klipp(utleidSpenn(r, start, slutt));
  let dU = uS ? dagerMellom(uS.fra, uS.til) : 0;
  let dP = 0;
  if (prove && uS) { dP = overlappDager(uS, prove); dU = Math.max(0, dU - dP); }
  let dF = dU;
  if (grunnlag === 'alle') {
    const fS = klipp(forvaltetSpenn(r, start, slutt));
    dF = fS ? dagerMellom(fS.fra, fS.til) : 0;
    if (prove && fS) dF = Math.max(0, dF - overlappDager(fS, prove));
  }
  let vU = 0; let vL = 0; let med = false;
  if (grunnlag === 'alle') {
    if (dF > 0) {
      med = true;
      const vF = prorata ? Math.min(1, dF / dager) : 1;
      vU = Math.min(vF, prorata ? Math.min(1, dU / dager) : (dU > 0 ? 1 : 0));
      vL = Math.max(0, vF - vU);
    }
  } else if (dU > 0) { med = true; vU = prorata ? Math.min(1, dU / dager) : 1; }
  return { med, dU, dF, dP, vU, vL };
}
const statusAv = (vU, vL) => (vL <= EPS ? 'utleid' : (vU <= EPS ? 'ledig' : 'delvis'));

// Teller enheter for ett grunnlag. Returnerer { antall, vektUtleid, vektLedig, enheter[], rom, bofellesskap, selv? }.
//  romModell 'rom'   → hvert rom er én enhet, vektet med romFaktor % (100 = som hel enhet)
//  romModell 'bolig' → hele bofellesskapet er én enhet; utleid-andel = utleide rom / alle rom
//  selv { proveDager, dvaleDager, minne } → selvbetjente regler: prøveperiode trekkes fra,
//  enheter i dvale telles ikke; stats i .selv { registrert, medLeieforhold, prove, dvale, fakturert }.
function tell(rows, grunnlag, prorata, start, slutt, dager, { romModell = 'rom', romFaktor = 100, selv = null, minne = null } = {}) {
  const rf = Math.max(0, Math.min(1, (Number(romFaktor) || 0) / 100));
  let antall = 0; let vektUtleid = 0; let vektLedig = 0; let rom = 0; let bofellesskap = 0; let nye = 0; let forRegistrering = 0;
  const enheter = [];
  const boliger = new Map();
  const stat = selv ? { registrert: 0, medLeieforhold: 0, prove: 0, dvale: 0, fakturert: 0, forRegistrering: 0 } : null;
  const alleMinne = minne || selv?.minne || null;
  const hentMinne = (r) => (alleMinne ? (alleMinne instanceof Map ? alleMinne.get(String(r.enhet_id || '')) : alleMinne[String(r.enhet_id || '')]) : null);
  for (const r of rows) {
    let prove = null; let dvale = false;
    const m = hentMinne(r);
    const reg = registrertDato(r, m);
    if (selv) {
      stat.registrert += 1;
      prove = proveVindu(r, m, selv.proveDager, reg);
    }
    const v = vekter(r, grunnlag, prorata, start, slutt, dager, prove, reg);
    if (v.forRegistrering) { forRegistrering += 1; if (stat) stat.forRegistrering += 1; continue; }
    const nyIMaaneden = Boolean(reg && reg >= start && reg <= slutt);
    if (selv) {
      const dURaa = v.dU + v.dP;
      if (dURaa > 0) stat.medLeieforhold += 1;
      if (v.dP > 0) stat.prove += 1;
      dvale = erIDvale(r, m, selv.dvaleDager, slutt, dURaa);
      if (dvale) { stat.dvale += 1; continue; }
    }
    const erRom = erRomRad(r);
    if (erRom && romModell === 'bolig') {
      const k = boligNokkel(r);
      if (!boliger.has(k)) boliger.set(k, []);
      boliger.get(k).push({ r, v });
      continue;
    }
    if (!v.med) continue;
    const f = erRom ? rf : 1;
    if (erRom) rom += 1;
    const vU = v.vU * f; const vL = v.vL * f;
    antall += 1; vektUtleid += vU; vektLedig += vL;
    if (stat) stat.fakturert += 1;
    enheter.push({
      enhet_id: r.enhet_id || '',
      address: r.address || r.unit_room || '',
      unit_room: erRom ? String(r.unit_room || '') : '',
      // Plattformens enhetstittel («Leilighet · 3. etg · 30m² 1-roms») — skiller enheter på samme adresse.
      detalj: String(r.unit_room || r.enhet_detalj || '').trim(),
      unit_type: r.unit_type || '',
      erRom,
      romFaktor: erRom ? Math.round(rf * 100) : null,
      tenant_name: r.tenant_name || '',
      status_label: r.status_label || '',
      monthly_rent: Number(r.monthly_rent) || 0,
      move_in_date: r.move_in_date || '',
      move_out_date: r.move_out_date || '',
      dager: v.dU,
      dagerForvaltet: v.dF,
      dagerProve: v.dP || 0,
      registrert: reg ? isoDag(reg) : '',
      nyIMaaneden,
      type: erForvaltet(r) ? 'forvaltet' : 'selvbetjent',
      status: statusAv(v.vU, v.vL),
      vektUtleid: r2(vU),
      vektLedig: r2(vL),
    });
    if (nyIMaaneden) nye += 1;
  }
  // Bofellesskap som én enhet. Alle rom (også ledige) teller i utleie-andelen.
  for (const [k, rader] of boliger) {
    const n = rader.length;
    const med = rader.filter((x) => x.v.med);
    if (!med.length) continue;
    const andelU = rader.reduce((s, x) => s + x.v.vU, 0) / n;
    let vU; let vL = 0;
    if (grunnlag === 'alle') {
      const vF = prorata ? Math.max(...med.map((x) => Math.min(1, x.v.dF / dager))) : 1;
      vU = prorata ? Math.min(vF, andelU) : (andelU > 0 ? 1 : 0);
      vL = Math.max(0, vF - vU);
    } else {
      vU = prorata ? Math.min(1, andelU) : (andelU > 0 ? 1 : 0);
    }
    if (vU + vL <= EPS) continue;
    const forste = med[0].r;
    const utleide = rader.filter((x) => x.v.dU > 0).length;
    const navn = rader.map((x) => String(x.r.tenant_name || '').trim()).filter(Boolean);
    antall += 1; vektUtleid += vU; vektLedig += vL; rom += n; bofellesskap += 1;
    if (stat) stat.fakturert += 1;
    enheter.push({
      enhet_id: k,
      address: forste.address || '',
      unit_room: `${n} rom · ${utleide} utleid`,
      detalj: '',
      unit_type: 'Bofellesskap',
      erRom: false,
      romFaktor: null,
      rom: n,
      romUtleid: utleide,
      tenant_name: navn.length ? `${navn.slice(0, 2).join(', ')}${navn.length > 2 ? ` +${navn.length - 2}` : ''}` : '',
      status_label: forste.status_label || '',
      monthly_rent: rader.reduce((s, x) => s + (Number(x.r.monthly_rent) || 0), 0),
      move_in_date: '',
      move_out_date: '',
      dager: Math.round(andelU * dager),
      dagerForvaltet: Math.round((grunnlag === 'alle' ? (vU + vL) : vU) * dager),
      dagerProve: rader.reduce((s, x) => s + (x.v.dP || 0), 0) > 0 ? Math.round(rader.reduce((s, x) => s + (x.v.dP || 0), 0) / n) : 0,
      registrert: forste.registrert || '',
      nyIMaaneden: rader.some((x) => { const d = registrertDato(x.r, hentMinne(x.r)); return Boolean(d && d >= start && d <= slutt); }),
      type: erForvaltet(forste) ? 'forvaltet' : 'selvbetjent',
      status: statusAv(vU, vL),
      vektUtleid: r2(vU),
      vektLedig: r2(vL),
    });
  }
  if (romModell === 'bolig') nye += enheter.filter((e) => e.unit_type === 'Bofellesskap' && e.nyIMaaneden).length;
  return { antall, vektUtleid, vektLedig, enheter, rom, bofellesskap, nye, forRegistrering, selv: stat };
}

// Slår sammen to tellinger (forvaltede + selvbetjente under samme trinn).
function slaaSammen(a, b) {
  return {
    antall: a.antall + b.antall,
    vektUtleid: a.vektUtleid + b.vektUtleid,
    vektLedig: a.vektLedig + b.vektLedig,
    enheter: [...a.enheter, ...b.enheter],
    rom: (a.rom || 0) + (b.rom || 0),
    bofellesskap: (a.bofellesskap || 0) + (b.bofellesskap || 0),
    nye: (a.nye || 0) + (b.nye || 0),
    forRegistrering: (a.forRegistrering || 0) + (b.forRegistrering || 0),
    selv: b.selv || a.selv || null,
  };
}

// Bygger fakturalinjer (ett eller flere trinnsegmenter) for en telling.
function lagLinjer({ t, trinn, trinnModell, ledigFaktor, type, beskrivelse, pris: fastPris = null }) {
  const f = Math.max(0, Math.min(1, (Number(ledigFaktor) || 0) / 100));
  const vektet = t.vektUtleid + t.vektLedig * f;
  if (vektet <= EPS) return [];
  const seg = fastPris != null
    ? [{ fra: 1, til: null, antall: r2(vektet), pris: Number(fastPris) || 0 }]
    : fordelPaaTrinn(trinn, vektet, trinnModell, t.antall);
  const flere = seg.length > 1;
  const linjer = seg.map((s) => ({
    type,
    beskrivelse: flere ? `${beskrivelse} · enhet ${s.fra}–${s.til ?? ''}`.replace(/–$/, '+') : beskrivelse,
    antall: flere ? s.antall : t.antall,
    vekt: s.antall,
    pris: s.pris,
    belop: Math.round(s.antall * s.pris),
    trinn: flere ? { fra: s.fra, til: s.til } : null,
    enheter: [],
  }));
  // Enhetsspesifikasjon: pris/beløp per enhet med blandet effektiv pris, slik at
  // spesifikasjonen summerer nøyaktig til linjene (øre-differansen legges på
  // enheten med størst beløp — ikke på «siste» rad, som ofte er et bofellesskap).
  const total = linjer.reduce((s, l) => s + l.belop, 0);
  const prisEff = vektet > EPS ? total / vektet : 0;
  const enheter = t.enheter.map((e) => {
    const v = r2(e.vektUtleid + e.vektLedig * f);
    return { ...e, vekt: v, ledigFaktor: Math.round(f * 100), pris: Math.round(prisEff), belop: Math.round(v * prisEff) };
  });
  const diff = total - enheter.reduce((s, e) => s + e.belop, 0);
  if (diff !== 0 && enheter.length) {
    // Differansen legges på den delvis vektede raden med størst beløp — en hel enhet skal
    // alltid vise hel pris (198 kr for «1 × 200 kr» ser ut som en feil). Fallback: største rad.
    const kandidater = enheter.map((e, i) => i).filter((i) => Math.abs(enheter[i].vekt - Math.round(enheter[i].vekt)) > EPS);
    const pool = kandidater.length ? kandidater : enheter.map((e, i) => i);
    let idx = pool[0];
    for (const i of pool) if (enheter[i].belop > enheter[idx].belop) idx = i;
    enheter[idx].belop += diff;
  }
  linjer[0].enheter = enheter;
  linjer[0].sammendrag = {
    enheter: t.antall,
    utleid: t.enheter.length ? t.enheter.filter((e) => e.status === 'utleid').length : t.antall,
    ledig: t.enheter.filter((e) => e.status === 'ledig').length,
    delvis: t.enheter.filter((e) => e.status === 'delvis').length,
    vektUtleid: r2(t.vektUtleid),
    vektLedig: r2(t.vektLedig),
    ledigFaktor: Math.round(f * 100),
    vektet: r2(vektet),
    rom: t.rom || 0,
    bofellesskap: t.bofellesskap || 0,
    nye: t.nye || 0,                       // registrert på plattformen denne måneden (telles fra registreringsdagen)
    forRegistrering: t.forRegistrering || 0, // fantes ikke på plattformen ennå — telles ikke
  };
  return linjer;
}

// ── Faktureringsgrunnlag for én kunde en måned ───────────────────────────────
// opts.minne: enhetsminne (Map enhet_id → { forsteInnflytting, forstSett, sistUtleid, … })
// brukt for prøveperiode/dvale på selvbetjente enheter. Uten minne: prøve fra radens
// innflytting, ingen dvale.
export function beregnGrunnlag(rows, plan, kunde, settings, maaned, opts = {}) {
  const { start, slutt, dager } = mndSpenn(maaned);
  const mvaSats = (settings?.mvaRegistrert === false) ? 0 : (settings?.mvaSats ?? 25);
  const produktnavn = settings?.produktnavn || 'Plattformlisens';
  const tomt = (ekstra = {}) => ({ maaned, linjer: [], antallEnheter: 0, sumEksMva: 0, mva: 0, mvaSats, sumInkMva: 0, valuta: settings?.valuta || 'NOK', beregnet: new Date().toISOString(), ...ekstra });
  if (!plan) return tomt();
  if (kunde?.status === 'inaktiv') return tomt({ inaktiv: true });

  const trinnModell = TRINNMODELL_VALG.includes(plan.trinnModell) ? plan.trinnModell : 'progressiv';
  const ledigFaktor = plan.ledigFaktor ?? 100;
  const romOpts = { romModell: plan.romModell === 'bolig' ? 'bolig' : 'rom', romFaktor: plan.romFaktor ?? 100, minne: opts.minne || null };
  const prorata = kunde?.prorata !== false;
  const grunnlag = normGrunnlag(kunde?.grunnlag, 'alle');
  // Selvbetjente: planens regel. 'leieforhold' = kun måneder med leietaker, alltid prorata.
  const selvRegel = SELVBETJENT_GRUNNLAG_VALG.includes(plan.selvbetjentGrunnlag) ? plan.selvbetjentGrunnlag : 'leieforhold';
  const grunnlagS = selvRegel === 'leieforhold' ? 'utleid_mnd' : normGrunnlag(kunde?.grunnlagSelvbetjent, grunnlag);
  const prorataS = selvRegel === 'leieforhold' ? true : prorata;
  const selv = { proveDager: Math.max(0, Number(plan.selvbetjentProveDager) || 0), dvaleDager: Math.max(0, Number(plan.selvbetjentDvaleDager) || 0), minne: opts.minne || null };
  const selvOpts = { ...romOpts, selv };
  const linjer = [];
  let antallEnheter = 0;
  const tellinger = [];
  let selvStat = null;

  if (kunde?.enhetskilde === 'manuell') {
    const antall = Math.max(0, Math.round(Number(kunde.manueltAntall) || 0));
    if (antall > 0) {
      const t = { antall, vektUtleid: antall, vektLedig: 0, enheter: [] };
      tellinger.push(t);
      linjer.push(...lagLinjer({ t, trinn: plan.trinn, trinnModell, ledigFaktor, type: 'manuell', beskrivelse: produktnavn }));
    }
  } else if (plan.prisModell === 'per_type') {
    const alle = Array.isArray(rows) ? rows : [];
    const f = tell(alle.filter(erForvaltet), grunnlag, prorata, start, slutt, dager, romOpts);
    const s = tell(alle.filter((r) => !erForvaltet(r)), grunnlagS, prorataS, start, slutt, dager, selvOpts);
    selvStat = s.selv;
    tellinger.push(f, s);
    linjer.push(...lagLinjer({ t: f, trinn: plan.trinn, trinnModell, ledigFaktor, type: 'forvaltet', beskrivelse: `${produktnavn} – forvaltede enheter` }));
    linjer.push(...lagLinjer({ t: s, trinn: plan.trinn, trinnModell, ledigFaktor, type: 'selvbetjent', beskrivelse: `${produktnavn} – selvbetjente enheter`, pris: plan.selvbetjentPris }));
  } else {
    const alle = Array.isArray(rows) ? rows : [];
    const f = tell(alle.filter(erForvaltet), grunnlag, prorata, start, slutt, dager, romOpts);
    const s = tell(alle.filter((r) => !erForvaltet(r)), grunnlagS, prorataS, start, slutt, dager, selvOpts);
    selvStat = s.selv;
    const t = slaaSammen(f, s);
    tellinger.push(t);
    linjer.push(...lagLinjer({ t, trinn: plan.trinn, trinnModell, ledigFaktor, type: 'alle', beskrivelse: produktnavn }));
  }
  antallEnheter = tellinger.reduce((s, t) => s + (t.antall || 0), 0);
  let sumEksMva = linjer.reduce((s, l) => s + l.belop, 0);

  // Minstepris: justeringslinje opp til planens minstebeløp (aktive og prøvekunder).
  const minstepris = Math.max(0, Number(plan.minstepris) || 0);
  let minsteprisJustering = 0;
  if (minstepris > 0 && sumEksMva < minstepris) {
    minsteprisJustering = minstepris - sumEksMva;
    linjer.push({ type: 'minstepris', beskrivelse: `Minstepris ${minstepris.toLocaleString('nb-NO')} kr/mnd – justering`, antall: 1, vekt: 1, pris: minsteprisJustering, belop: minsteprisJustering, enheter: [] });
    sumEksMva = minstepris;
  }

  const mva = Math.round(sumEksMva * (mvaSats / 100));
  // Samlet sammendrag på tvers av tellinger (per_type har to).
  const deler = linjer.map((l) => l.sammendrag).filter(Boolean);
  const sammendrag = deler.length ? deler.reduce((a, s) => ({
    enheter: a.enheter + s.enheter, utleid: a.utleid + s.utleid, ledig: a.ledig + s.ledig, delvis: a.delvis + s.delvis,
    vektUtleid: r2(a.vektUtleid + s.vektUtleid), vektLedig: r2(a.vektLedig + s.vektLedig), vektet: r2(a.vektet + s.vektet), ledigFaktor: s.ledigFaktor,
    rom: a.rom + (s.rom || 0), bofellesskap: a.bofellesskap + (s.bofellesskap || 0),
    nye: a.nye + (s.nye || 0), forRegistrering: a.forRegistrering + (s.forRegistrering || 0),
  }), { enheter: 0, utleid: 0, ledig: 0, delvis: 0, vektUtleid: 0, vektLedig: 0, vektet: 0, ledigFaktor: Math.round(ledigFaktor), rom: 0, bofellesskap: 0, nye: 0, forRegistrering: 0 }) : null;
  // Selvbetjente enheter: alltid med (også når ingen ble fakturert — det er poenget å vise).
  const selvbetjent = selvStat && selvStat.registrert > 0 ? { ...selvStat, regel: selvRegel, proveDager: selv.proveDager, dvaleDager: selv.dvaleDager } : null;
  return {
    maaned, linjer, antallEnheter, sumEksMva, mva, mvaSats, sumInkMva: sumEksMva + mva,
    valuta: settings?.valuta || 'NOK',
    modell: { grunnlag, prorata, trinnModell, ledigFaktor, minstepris, prisModell: plan.prisModell || 'blandet', romModell: romOpts.romModell, romFaktor: Math.round(romOpts.romFaktor), selvbetjentGrunnlag: selvRegel, selvbetjentProveDager: selv.proveDager, selvbetjentDvaleDager: selv.dvaleDager },
    sammendrag: sammendrag ? { ...sammendrag, selvbetjent } : (selvbetjent ? { enheter: 0, utleid: 0, ledig: 0, delvis: 0, vektUtleid: 0, vektLedig: 0, vektet: 0, ledigFaktor: Math.round(ledigFaktor), rom: 0, bofellesskap: 0, selvbetjent } : null),
    minsteprisJustering,
    beregnet: new Date().toISOString(),
  };
}

// ── Frosset grunnlag per kunde + måned ───────────────────────────────────────
// Øyeblikksbildet endrer seg; fakturaen skal ikke. Ved fakturering (eller manuelt)
// lagres grunnlaget + plan/kunde/innstillinger slik de var, og alle senere
// visninger av måneden leser det frosne. Låses opp kun uten PowerOffice-utkast.
const laastUtenId = (d) => (d ? utenId(d) : null);

export async function hentLaast(db, kundeId, maaned) {
  if (!kundeId || !maaned) return null;
  return laastUtenId(await db.collection(C_LAAST).findOne({ kundeId, maaned }));
}
export async function hentLaastForMaaned(db, maaned) {
  const liste = await db.collection(C_LAAST).find({ maaned }).toArray();
  return new Map(liste.map((d) => [d.kundeId, utenId(d)]));
}
export async function laasGrunnlag(db, { kunde, plan, settings, grunnlag, maaned, av = 'manuell', antallRader = null }) {
  const finnes = await db.collection(C_LAAST).findOne({ kundeId: kunde.id, maaned });
  if (finnes) return { laast: utenId(finnes), alleredeLaast: true };
  const doc = {
    id: randomUUID(),
    kundeId: kunde.id,
    maaned,
    laast: new Date().toISOString(),
    laastAv: av,
    grunnlag,
    plan: plan ? { id: plan.id, navn: plan.navn, prisModell: plan.prisModell, trinn: plan.trinn, trinnModell: plan.trinnModell, selvbetjentPris: plan.selvbetjentPris, minstepris: plan.minstepris, ledigFaktor: plan.ledigFaktor, romModell: plan.romModell, romFaktor: plan.romFaktor, selvbetjentGrunnlag: plan.selvbetjentGrunnlag, selvbetjentProveDager: plan.selvbetjentProveDager, selvbetjentDvaleDager: plan.selvbetjentDvaleDager } : null,
    kunde: { id: kunde.id, navn: kunde.navn, orgnr: kunde.orgnr, epost: kunde.epost, planId: kunde.planId, grunnlag: kunde.grunnlag, grunnlagSelvbetjent: kunde.grunnlagSelvbetjent, prorata: kunde.prorata, enhetskilde: kunde.enhetskilde, manueltAntall: kunde.manueltAntall, status: kunde.status },
    settings: { produktnavn: settings?.produktnavn, mvaSats: settings?.mvaSats, mvaRegistrert: settings?.mvaRegistrert, valuta: settings?.valuta },
    antallRader,
  };
  try {
    await db.collection(C_LAAST).insertOne(doc);
  } catch (e) {
    if (!erDuplikatFeil(e)) throw e;
    return { laast: utenId(await db.collection(C_LAAST).findOne({ kundeId: kunde.id, maaned })), alleredeLaast: true };
  }
  return { laast: utenId(doc), alleredeLaast: false };
}
export async function laasOpp(db, kundeId, maaned, { tvang = false } = {}) {
  const utkast = await db.collection(C_PO_UTKAST).findOne({ kundeId, maaned });
  if (utkast && !tvang) return { ok: false, feil: 'Det finnes et PowerOffice-utkast for måneden — grunnlaget kan ikke låses opp.' };
  const r = await db.collection(C_LAAST).deleteOne({ kundeId, maaned });
  return { ok: true, slettet: r.deletedCount || 0 };
}

export function forrigeMaaned(d = new Date()) {
  const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}`;
}
