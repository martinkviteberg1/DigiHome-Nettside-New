// ---------------------------------------------------------------------------
// BOLIGVARSEL — etterspørselssiden av utleie
//
// HVORFOR: /ledige-boliger ligger i hovedmenyen, men publiseringsporten slipper
// bare gjennom boliger med bilder, areal og pris FRA PLATTFORMEN. Akkurat nå
// betyr det at siden ofte er tom eller tynn. En tom side som bare sier «ingen
// ledige boliger» kaster bort trafikken vi betaler for.
//
// I stedet fanger vi kriteriene til boligsøkeren. Det gir tre ting:
//  1. LEAD: en boligsøker med budsjett og bydel er verdt noe selv uten en
//     matchende bolig i dag.
//  2. PRIORITERING: vi kan si til forvalteren «4 søkere venter på noe i
//     Årstad under 18 000 — Baglergaten 8 mangler bare pris». Da blir et
//     datahull i plattformen en konkret, tallfestet salgsmulighet.
//  3. SEGMENTERING: nyhetsbrevet kan sendes til dem boligen faktisk passer for,
//     i stedet for til alle.
//
// PERSONVERN: vi lagrer kun det boligsøkeren selv skriver inn, med eksplisitt
// samtykketekst og tidspunkt. Ingen sporing, ingen kjøpte data. Varselet
// leveres via nyhetsbrevlisten vår, som er den samme opt-in-kanalen tom-
// tilstanden brukte før — så samtykkeomfanget er uendret, bare mer presist.
//
// REN LOGIKK: ingen databasekall her, slik at både klientkomponenter og
// API-ruten kan importere fila. DB-arbeidet ligger i API-ruten.
// ---------------------------------------------------------------------------
import { BERGEN_DISTRICTS } from './geo-bergen';
import { parseBand } from './listings';

export const ALERTS_COLL = 'housing_alerts';

export const ALERT_CONSENT_TEXT =
  'Ja, varsle meg om ledige boliger fra DigiHome i Bergen — også før de annonseres. Jeg kan melde meg av når som helst.';

export const MOVE_IN_OPTIONS = [
  { key: 'asap', label: 'Så snart som mulig' },
  { key: '1-3', label: 'Innen 1–3 måneder' },
  { key: '3+', label: 'Om 3 måneder eller senere' },
  { key: 'flexible', label: 'Jeg er fleksibel' },
];
export const MOVE_IN_LABEL = MOVE_IN_OPTIONS.reduce((a, o) => { a[o.key] = o.label; return a; }, {});

// Budsjettrinnene følger prisintervallene plattformen bruker (2 000-bøtter),
// slik at et valg alltid treffer en reell nedre grense.
export const BUDGET_OPTIONS = [12000, 14000, 16000, 18000, 20000, 24000, 30000, 40000];

export const ALERT_DISTRICTS = BERGEN_DISTRICTS;

export function normEmail(s) {
  return String(s || '').trim().toLowerCase();
}

// «Bergen sentrum», «Sentrum» og «bergenhus » skal treffe hverandre. Bydel er
// utledet fra postnummer på vår side og skrevet av mennesker på skjemasiden.
export function districtKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^bergen\s+/, '')
    .trim();
}

const KR = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  if (n < min) return null;
  return Math.min(n, max);
}

// Validerer og normaliserer et innsendt boligvarsel. Returnerer { error } ved
// ugyldig e-post — alt annet er valgfritt, fordi vi tar e-posten først og
// kriteriene i steg to (lavere terskel gir flere leads).
export function normalizeAlert(body = {}) {
  const email = normEmail(body.email);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return { error: 'Ugyldig e-postadresse' };
  }
  const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const allowed = new Map(ALERT_DISTRICTS.map((d) => [districtKey(d), d]));
  const districts = [...new Set(
    asArray(body.districts).map((d) => allowed.get(districtKey(d))).filter(Boolean),
  )].slice(0, ALERT_DISTRICTS.length);

  const moveIn = MOVE_IN_LABEL[body.moveIn] ? body.moveIn : null;

  return {
    email,
    name: String(body.name || '').trim().slice(0, 120) || null,
    phone: String(body.phone || '').replace(/[^\d+\s]/g, '').trim().slice(0, 24) || null,
    districts,
    bedroomsMin: clampInt(body.bedroomsMin, 1, 9),
    maxRent: clampInt(body.maxRent, 1000, 200000),
    moveIn,
    message: String(body.message || '').trim().slice(0, 600) || null,
    source: String(body.source || 'ledige-boliger').slice(0, 40),
  };
}

// Publisert månedsleie finnes både som rentBand/rentText (offentlig kort) og
// monthlyRentBand (adminobjektet). Samme verdi, flere navn. parseBand takler
// både et eksakt beløp («23 000 kr/mnd») og et gammelt intervall.
const bandOf = (p) => p?.rentBand || p?.monthlyRentBand || '';

// Treffer varselet denne boligen?
//
// VIKTIG VALG: manglende data ekskluderer ALDRI. En bolig som mangler pris er
// nettopp den vi vil vise forvalteren at det finnes etterspørsel etter — hvis
// et manglende felt filtrerte den bort, ville hele poenget forsvunnet.
export function alertMatches(alert, property) {
  if (!alert || !property) return false;
  const wanted = (alert.districts || []).map(districtKey).filter(Boolean);
  if (wanted.length) {
    const k = districtKey(property.district || '');
    if (k && !wanted.includes(k)) return false;   // kjent, men feil bydel
  }
  if (alert.bedroomsMin) {
    const b = Number(property.bedrooms || 0);
    if (b && b < alert.bedroomsMin) return false; // kjent, men for lite
  }
  if (alert.maxRent) {
    const band = parseBand(bandOf(property));
    if (band && band.min > alert.maxRent) return false; // kjent, men for dyrt
  }
  return true;
}

// Kort, menneskelig oppsummering vi viser tilbake til boligsøkeren: «2+ soverom
// i Årstad eller Bergenhus, under 18 000 kr/mnd».
export function alertSummaryText(alert = {}) {
  const parts = [];
  if (alert.bedroomsMin) parts.push(`${alert.bedroomsMin}+ soverom`);
  const ds = alert.districts || [];
  if (ds.length === 1) parts.push(`i ${ds[0]}`);
  else if (ds.length === 2) parts.push(`i ${ds[0]} eller ${ds[1]}`);
  else if (ds.length > 2) parts.push(`i ${ds.slice(0, -1).join(', ')} eller ${ds[ds.length - 1]}`);
  else parts.push('i hele Bergen');
  if (alert.maxRent) parts.push(`under ${KR(alert.maxRent)} kr/mnd`);
  if (alert.moveIn && alert.moveIn !== 'flexible') parts.push(MOVE_IN_LABEL[alert.moveIn].toLowerCase());
  return parts.join(' · ');
}

function topEntries(obj, limit = 6) {
  return Object.entries(obj)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'nb'))
    .slice(0, limit);
}

// Etterspørselsbildet: hvem venter på hva, og hvilke boliger de venter på.
// properties er adminobjekter (district, bedrooms, monthlyRentBand).
export function summarizeDemand(alerts = [], properties = []) {
  const list = Array.isArray(alerts) ? alerts : [];
  const active = list.filter((a) => a && a.status !== 'paused');

  const districts = {};
  const bedrooms = {};
  const moveIn = {};
  const budgets = [];
  let withCriteria = 0;

  for (const a of active) {
    const ds = (a.districts || []).length ? a.districts : ['Hele Bergen'];
    for (const d of ds) districts[d] = (districts[d] || 0) + 1;
    const b = a.bedroomsMin ? `${a.bedroomsMin}+ soverom` : 'Uansett størrelse';
    bedrooms[b] = (bedrooms[b] || 0) + 1;
    if (a.moveIn) moveIn[MOVE_IN_LABEL[a.moveIn] || a.moveIn] = (moveIn[MOVE_IN_LABEL[a.moveIn] || a.moveIn] || 0) + 1;
    if (a.maxRent) budgets.push(a.maxRent);
    if ((a.districts || []).length || a.bedroomsMin || a.maxRent || a.moveIn) withCriteria += 1;
  }

  budgets.sort((x, y) => x - y);
  const medianBudget = budgets.length ? budgets[Math.floor((budgets.length - 1) / 2)] : null;

  const perProperty = (Array.isArray(properties) ? properties : []).map((p) => ({
    id: p.id,
    matches: active.filter((a) => alertMatches(a, p)).length,
  }));

  return {
    total: list.length,
    active: active.length,
    withCriteria,
    districts: topEntries(districts),
    bedrooms: topEntries(bedrooms, 5),
    moveIn: topEntries(moveIn, 4),
    medianBudget,
    budgetCount: budgets.length,
    perProperty,
  };
}

// Adminvisning: e-post og navn er lov bak innlogging, men vi tar aldri med
// interne mongo-felt.
export function toAdminAlert(a = {}) {
  return {
    id: a.id || null,
    email: a.email || null,
    name: a.name || null,
    phone: a.phone || null,
    districts: a.districts || [],
    bedroomsMin: a.bedroomsMin || null,
    maxRent: a.maxRent || null,
    moveIn: a.moveIn || null,
    moveInLabel: a.moveIn ? MOVE_IN_LABEL[a.moveIn] || a.moveIn : null,
    message: a.message || null,
    source: a.source || null,
    status: a.status || 'active',
    summary: alertSummaryText(a),
    created_at: a.created_at || null,
    updated_at: a.updated_at || null,
  };
}

export default { ALERTS_COLL, normalizeAlert, alertMatches, summarizeDemand, alertSummaryText, toAdminAlert };
