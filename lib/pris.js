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
const SET_ID = 'konsern';

export const STANDARD_SETTINGS = {
  id: SET_ID, valuta: 'NOK', produktnavn: 'Plattformlisens',
  mvaSats: 25, betalingsfristDager: 14, fakturadag: 1, levering: 'EHF',
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
    forste: base.forste || inn.forste || false,
    notat: rens(inn.notat ?? base.notat ?? '', 400),
    opprettet: base.opprettet || new Date().toISOString(),
    oppdatert: new Date().toISOString(),
  };
}

const utenId = (d) => { if (!d) return d; const { _id, ...rest } = d; return rest; };

// ── Seeding + migrering fra v1 (pris_config) ────────────────────────────────
async function ensureSeed(db) {
  const gammel = await db.collection(C_GAMMEL).findOne({ id: 'konsern' }).catch(() => null);

  let set = await db.collection(C_SET).findOne({ id: SET_ID });
  if (!set) {
    set = {
      ...STANDARD_SETTINGS,
      valuta: gammel?.valuta || STANDARD_SETTINGS.valuta,
      produktnavn: gammel?.produktnavn || STANDARD_SETTINGS.produktnavn,
      mvaSats: gammel?.mvaSats ?? STANDARD_SETTINGS.mvaSats,
      betalingsfristDager: gammel?.betalingsfristDager ?? STANDARD_SETTINGS.betalingsfristDager,
      fakturadag: gammel?.fakturadag ?? STANDARD_SETTINGS.fakturadag,
      levering: gammel?.levering || STANDARD_SETTINGS.levering,
      oppdatert: new Date().toISOString(),
    };
    await db.collection(C_SET).insertOne(set);
  }

  const antPlaner = await db.collection(C_PLAN).countDocuments();
  if (antPlaner === 0) {
    const plan = normaliserPlan({
      navn: 'Forvalter',
      beskrivelse: 'Standard plan for forvaltere og eiendomsselskaper. Volumtrinn per enhet.',
      prisModell: gammel?.prisModell || 'blandet',
      trinn: gammel?.trinn || STANDARD_TRINN,
      selvbetjentPris: gammel?.selvbetjentPris ?? 79,
      aktiv: true, standard: true,
    });
    await db.collection(C_PLAN).insertOne(plan);
  }

  const antKunder = await db.collection(C_KUNDE).countDocuments();
  if (antKunder === 0) {
    const std = await db.collection(C_PLAN).findOne({ standard: true }) || await db.collection(C_PLAN).findOne({});
    const kunde = normaliserKunde({
      navn: 'DigiHome AS', enhetskilde: 'plattform',
      grunnlag: gammel?.grunnlag || 'utleid_mnd',
      grunnlagSelvbetjent: gammel?.grunnlagSelvbetjent || 'utleid_mnd',
      planId: std?.id || '', status: 'aktiv', forste: true,
      notat: 'Konsernintern kunde — driftsselskapet. Første kunde på plattformen.',
    });
    await db.collection(C_KUNDE).insertOne(kunde);
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
  await db.collection(C_KUNDE).updateOne({ id: kunde.id }, { $set: kunde }, { upsert: true });
  return { ok: true, kunde };
}
export async function slettKunde(id, dbArg) {
  const db = dbArg || (await getDb());
  const k = await db.collection(C_KUNDE).findOne({ id });
  if (k?.forste) return { ok: false, feil: 'Kan ikke slette den konserninterne kunden' };
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
function tell(rows, grunnlag, start, slutt, dager) {
  let antall = 0; let vekt = 0; const enheter = [];
  for (const r of rows) {
    let med = false; let v = 0;
    if (grunnlag === 'alle') { med = underForvaltning(r, slutt); v = med ? 1 : 0; }
    else if (grunnlag === 'prorata') { v = prorataVekt(r, start, slutt, dager); med = v > 0; }
    else { med = utleidIMnd(r, start, slutt); v = med ? 1 : 0; }
    if (med) { antall += 1; vekt += v; enheter.push({ enhet_id: r.enhet_id, address: r.address, type: erForvaltet(r) ? 'forvaltet' : 'selvbetjent', vekt: Math.round(v * 100) / 100 }); }
  }
  return { antall, vekt, enheter };
}

// ── Faktureringsgrunnlag for én kunde en måned ───────────────────────────────
export function beregnGrunnlag(rows, plan, kunde, settings, maaned) {
  const { start, slutt, dager } = mndSpenn(maaned);
  const mvaSats = settings?.mvaSats ?? 25;
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

  const antallEnheter = linjer.reduce((s, l) => s + l.antall, 0);
  const sumEksMva = linjer.reduce((s, l) => s + l.belop, 0);
  const mva = Math.round(sumEksMva * (mvaSats / 100));
  return { maaned, linjer, antallEnheter, sumEksMva, mva, mvaSats, sumInkMva: sumEksMva + mva, valuta: settings?.valuta || 'NOK', beregnet: new Date().toISOString() };
}

export function forrigeMaaned(d = new Date()) {
  const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}`;
}
