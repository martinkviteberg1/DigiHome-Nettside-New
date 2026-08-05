// FASE 2 — Meta: utvid målgruppen fra ETT nabolag til Bergen + 25 km.
// Kjør tørt:   node scripts/apply-meta-optim.mjs --dry
// Kjør ekte:   node scripts/apply-meta-optim.mjs --live
//
// Hvorfor: annonsesettet optimaliserer mot LEAD, men får 2–3 leads/uke.
// Publikummet (nabolaget Bergenhus, est. 53 800–63 300) er så lite at frekvensen
// er 2,0–2,5 PR. UKE og CPM 188 kr. Å utvide geo er det ene grepet som treffer
// rotårsaken uten å koste noe.
//
// Vi RØRER IKKE: alder (18–65), optimaliseringsmål (LEAD), plasseringer
// (Advantage+ beholdes), budsjett eller kreativer.
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const LIVE = process.argv.includes('--live');
const V = process.env.META_API_VERSION || 'v21.0';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const ADSET = '120240669705410688'; // DigiHome | Branding
const BERGEN_CITY_KEY = '1658008';
const RADIUS_KM = 25;

const num = (v) => Number(v || 0).toLocaleString('nb-NO');

async function g(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set('access_token', TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  const j = await r.json().catch(() => ({}));
  if (j.error) throw new Error(`${j.error.code}/${j.error.error_subcode || '-'}: ${j.error.message}`);
  return j;
}
async function post(path, body = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  form.set('access_token', TOKEN);
  const r = await fetch(u, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  const j = await r.json().catch(() => ({}));
  if (j.error) throw new Error(`${j.error.code}/${j.error.error_subcode || '-'}: ${j.error.message}`);
  return j;
}

console.log(LIVE ? '*** LIVE ***\n' : '*** TØRRKJØRING (execution_options=validate_only) ***\n');

// --- Før ---
const before = await g(ADSET, { fields: 'id,name,effective_status,daily_budget,optimization_goal,targeting,promoted_object' });
console.log(`Annonsesett: ${before.name} [${before.effective_status}] · ${Math.round(before.daily_budget / 100)} kr/dag`);
console.log(`Mål: ${before.optimization_goal} · promoted: ${JSON.stringify(before.promoted_object)}`);
console.log(`FØR — targeting:\n  ${JSON.stringify(before.targeting)}\n`);

const est0 = await g(`${ADSET}/delivery_estimate`, { fields: 'estimate_mau_lower_bound,estimate_mau_upper_bound,estimate_ready' });
const e0 = (est0.data || [])[0] || {};
console.log(`FØR — est. månedlig rekkevidde: ${num(e0.estimate_mau_lower_bound)}–${num(e0.estimate_mau_upper_bound)}\n`);

// Idempotens: er byen allerede satt?
const geo = before.targeting?.geo_locations || {};
const alreadyCity = (geo.cities || []).some((c) => String(c.key) === BERGEN_CITY_KEY && Number(c.radius) >= RADIUS_KM && c.distance_unit === 'kilometer');
if (alreadyCity && !(geo.neighborhoods || []).length) {
  console.log('✓ Allerede satt til Bergen + 25 km. Ingenting å gjøre.');
  process.exit(0);
}

// --- Ny targeting: bevar ALT annet nøyaktig som det var ---
const targeting = JSON.parse(JSON.stringify(before.targeting || {}));
targeting.geo_locations = {
  location_types: geo.location_types || ['home', 'recent'],
  cities: [{ key: BERGEN_CITY_KEY, radius: RADIUS_KM, distance_unit: 'kilometer' }],
};
// nabolagslåsen fjernes ved at vi ikke tar med 'neighborhoods'

console.log(`ETTER — targeting:\n  ${JSON.stringify(targeting)}\n`);

const body = { targeting };
if (!LIVE) body.execution_options = ['validate_only'];
const res = await post(ADSET, body);
console.log(`API-svar: ${JSON.stringify(res)}`);

if (!LIVE) { console.log('\nTørrkjøring OK — kjør med --live for å lagre.'); process.exit(0); }

// --- Etter ---
await new Promise((r) => setTimeout(r, 4000));
const after = await g(ADSET, { fields: 'targeting' });
console.log(`\nVERIFISERT — targeting:\n  ${JSON.stringify(after.targeting)}`);
const est1 = await g(`${ADSET}/delivery_estimate`, { fields: 'estimate_mau_lower_bound,estimate_mau_upper_bound,estimate_ready' });
const e1 = (est1.data || [])[0] || {};
console.log(`\nETTER — est. månedlig rekkevidde: ${num(e1.estimate_mau_lower_bound)}–${num(e1.estimate_mau_upper_bound)}`);
const growth = Number(e1.estimate_mau_upper_bound || 0) / Math.max(1, Number(e0.estimate_mau_upper_bound || 0));
console.log(`Vekst i publikum: ${growth.toFixed(1)}×`);
console.log('\nMERK: targeting-endring nullstiller læringsfasen. Forvent 7–14 dager med');
console.log('ustabile tall før nivået kan vurderes. Ikke gjør nye endringer i mellomtiden.');
