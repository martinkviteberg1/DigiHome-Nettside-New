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

const GRUNNLAG_VALG = ['utleid_mnd', 'prorata', 'alle'];
const STATUS_VALG = ['aktiv', 'prove', 'inaktiv'];

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
  return {
    id: base.id || inn.id || randomUUID(),
    navn: rens(inn.navn ?? base.navn ?? 'Ny plan', 80) || 'Ny plan',
    beskrivelse: rens(inn.beskrivelse ?? base.beskrivelse ?? '', 200),
    prisModell: (inn.prisModell ?? base.prisModell) === 'per_type' ? 'per_type' : 'blandet',
    trinn: normaliserTrinn(inn.trinn ?? base.trinn),
    selvbetjentPris: Math.round(num(inn.selvbetjentPris, base.selvbetjentPris ?? 79, { maks: 1e6 })),
    aktiv: inn.aktiv != null ? !!inn.aktiv : (base.aktiv != null ? base.aktiv : true),
    standard: inn.standard != null ? !!inn.standard : (base.standard || false),
    opprettet: base.opprettet || new Date().toISOString(),
    oppdatert: new Date().toISOString(),
  };
}

function normaliserKunde(inn = {}, base = {}) {
  const enhetskilde = (inn.enhetskilde ?? base.enhetskilde) === 'manuell' ? 'manuell' : 'plattform';
  return {
    id: base.id || inn.id || randomUUID(),
    navn: rens(inn.navn ?? base.navn ?? '', 100),
    orgnr: rens(inn.orgnr ?? base.orgnr ?? '', 20),
    epost: rens(inn.epost ?? base.epost ?? '', 120),
    planId: rens(inn.planId ?? base.planId ?? '', 60),
    grunnlag: GRUNNLAG_VALG.includes(inn.grunnlag) ? inn.grunnlag : (base.grunnlag || 'utleid_mnd'),
    grunnlagSelvbetjent: GRUNNLAG_VALG.includes(inn.grunnlagSelvbetjent) ? inn.grunnlagSelvbetjent : (base.grunnlagSelvbetjent || 'utleid_mnd'),
    enhetskilde,
    manueltAntall: Math.round(num(inn.manueltAntall, base.manueltAntall ?? 0, { maks: 1e6 })),
    status: STATUS_VALG.includes(inn.status) ? inn.status : (base.status || 'aktiv'),
    // «forste» (konsernintern kunde) kan aldri settes fra klienten — kun seedingen
    // oppretter den, og den arves fra eksisterende dokument ved redigering.
    forste: Boolean(base.forste),
    notat: rens(inn.notat ?? base.notat ?? '', 400),
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

// ── Seeding + migrering fra v1 (pris_config) ────────────────────────────────
// Rekkefølge er bevisst: rydd → indekser → atomisk upsert. Parallelle kall kan
// i verste fall få E11000 fra databasen — det betyr bare at «den andre vant»,
// og svelges. Ingen «tell → sett inn» lenger.
async function ensureSeed(db) {
  await ryddDuplikater(db);
  await sikreIndekser(db);
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

// ── Volumpris (flat modell) ──────────────────────────────────────────────────
export function prisForAntall(trinn, n) {
  const sortert = [...(trinn || [])].sort((a, b) => a.fraEnheter - b.fraEnheter);
  let pris = sortert[0]?.pris || 0;
  for (const t of sortert) if (n >= t.fraEnheter) pris = t.pris;
  return pris;
}

// ── Grunnlagshjelpere ─────────────────────────────────────────────────────────
function mndSpenn(maaned) {
  const [y, m] = String(maaned).split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), slutt: new Date(Date.UTC(y, m, 0)), dager: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}
const dato = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00Z`) : null);
const erForvaltet = (row) => /forvalt/i.test(String(row.service_level || 'Full forvaltning'));
function utleidIMnd(row, start, slutt) {
  if (row.income_type && row.income_type !== 'actual') return false;
  const inn = dato(row.move_in_date); if (!inn || inn > slutt) return false;
  const ut = dato(row.move_out_date); if (ut && ut < start) return false;
  return true;
}
function prorataVekt(row, start, slutt, dager) {
  const inn = dato(row.move_in_date); if (!inn) return 0;
  const ut = dato(row.move_out_date);
  const fra = inn > start ? inn : start; const til = ut && ut < slutt ? ut : slutt;
  if (til < fra) return 0;
  return Math.max(0, Math.min(1, (Math.round((til - fra) / 86400000) + 1) / dager));
}
function underForvaltning(row, slutt) {
  const aktiv = !row.forvaltning_status || row.forvaltning_status === 'active';
  const start = dato(row.forvaltning_start);
  return aktiv && (!start || start <= slutt);
}
// Antall dager enheten faktisk var leid i måneden (til enhetsspesifikasjonen).
function overlappDager(row, start, slutt, dager) {
  const inn = dato(row.move_in_date);
  if (!inn) return dager; // ukjent innflytting → regn hele måneden (alle-grunnlag)
  const ut = dato(row.move_out_date);
  const fra = inn > start ? inn : start;
  const til = ut && ut < slutt ? ut : slutt;
  if (til < fra) return 0;
  return Math.min(dager, Math.round((til - fra) / 86400000) + 1);
}
function tell(rows, grunnlag, start, slutt, dager) {
  let antall = 0; let vekt = 0; const enheter = [];
  for (const r of rows) {
    let med = false; let v = 0;
    if (grunnlag === 'alle') { med = underForvaltning(r, slutt); v = med ? 1 : 0; }
    else if (grunnlag === 'prorata') { v = prorataVekt(r, start, slutt, dager); med = v > 0; }
    else { med = utleidIMnd(r, start, slutt); v = med ? 1 : 0; }
    if (med) {
      antall += 1; vekt += v;
      enheter.push({
        enhet_id: r.enhet_id || '',
        address: r.address || r.unit_room || '',
        unit_type: r.unit_type || '',
        tenant_name: r.tenant_name || '',
        status_label: r.status_label || '',
        monthly_rent: Number(r.monthly_rent) || 0,
        move_in_date: r.move_in_date || '',
        move_out_date: r.move_out_date || '',
        dager: overlappDager(r, start, slutt, dager),
        type: erForvaltet(r) ? 'forvaltet' : 'selvbetjent',
        vekt: Math.round(v * 100) / 100,
      });
    }
  }
  return { antall, vekt, enheter };
}

// ── Faktureringsgrunnlag for én kunde en måned ───────────────────────────────
export function beregnGrunnlag(rows, plan, kunde, settings, maaned) {
  const { start, slutt, dager } = mndSpenn(maaned);
  const mvaSats = (settings?.mvaRegistrert === false) ? 0 : (settings?.mvaSats ?? 25);
  const produktnavn = settings?.produktnavn || 'Plattformlisens';
  const linjer = [];

  if (!plan) return { maaned, linjer: [], antallEnheter: 0, sumEksMva: 0, mva: 0, mvaSats, sumInkMva: 0, valuta: settings?.valuta || 'NOK', beregnet: new Date().toISOString() };

  if (kunde.enhetskilde === 'manuell') {
    const antall = kunde.manueltAntall || 0;
    const pris = prisForAntall(plan.trinn, antall);
    if (antall > 0) linjer.push({ type: 'manuell', beskrivelse: produktnavn, antall, vekt: antall, pris, belop: antall * pris, enheter: [] });
  } else if (plan.prisModell === 'per_type') {
    const alle = Array.isArray(rows) ? rows : [];
    const f = tell(alle.filter(erForvaltet), kunde.grunnlag, start, slutt, dager);
    const s = tell(alle.filter((r) => !erForvaltet(r)), kunde.grunnlagSelvbetjent, start, slutt, dager);
    if (f.antall) { const pris = prisForAntall(plan.trinn, f.antall); linjer.push({ type: 'forvaltet', beskrivelse: `${produktnavn} – forvaltede enheter`, antall: f.antall, vekt: Math.round(f.vekt * 100) / 100, pris, belop: Math.round(f.vekt * pris), enheter: f.enheter }); }
    if (s.antall) { const pris = plan.selvbetjentPris; linjer.push({ type: 'selvbetjent', beskrivelse: `${produktnavn} – selvbetjente enheter`, antall: s.antall, vekt: Math.round(s.vekt * 100) / 100, pris, belop: Math.round(s.vekt * pris), enheter: s.enheter }); }
  } else {
    const t = tell(Array.isArray(rows) ? rows : [], kunde.grunnlag, start, slutt, dager);
    if (t.antall) { const pris = prisForAntall(plan.trinn, t.antall); linjer.push({ type: 'alle', beskrivelse: produktnavn, antall: t.antall, vekt: Math.round(t.vekt * 100) / 100, pris, belop: Math.round(t.vekt * pris), enheter: t.enheter }); }
  }

  // Fest pris + beløp på hver enhet i spesifikasjonen (til faktura/PDF).
  for (const l of linjer) {
    l.enheter = (l.enheter || []).map((e) => ({ ...e, pris: l.pris, belop: Math.round((e.vekt ?? 1) * l.pris) }));
  }

  const antallEnheter = linjer.reduce((s, l) => s + l.antall, 0);
  const sumEksMva = linjer.reduce((s, l) => s + l.belop, 0);
  const mva = Math.round(sumEksMva * (mvaSats / 100));
  return { maaned, linjer, antallEnheter, sumEksMva, mva, mvaSats, sumInkMva: sumEksMva + mva, valuta: settings?.valuta || 'NOK', beregnet: new Date().toISOString() };
}

export function forrigeMaaned(d = new Date()) {
  const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}`;
}
