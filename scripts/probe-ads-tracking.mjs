// PROBE — annonsesporing og lukket sløyfe (august 2026).
//   node scripts/probe-ads-tracking.mjs
//
// Dekker:
//  1. Nye hendelsestyper lagres som SEG SELV (call_click, consent_choice,
//     consent_view) og kollapser ikke stille til 'pageview'.
//  2. Lukket sløyfe logger ALLTID et utfall — også når den hopper av.
//  3. Paid funnel eksponerer ringeklikk, samtykkerate og kost pr. henvendelse.
//  4. KPI skiller CPL (alle leads) fra CPL (betalte leads).
//  5. Rydder opp etter seg.
import fs from 'fs';
import { MongoClient } from 'mongodb';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const BASE = 'http://localhost:3000';
const KEY = process.env.ADMIN_KEY;
const TAG = `PROBE-ADS-${Date.now()}`;
// Ekte nettleser-UA: /api/track filtrerer bort bot-UA (derfor lagres ingenting
// når man tester med curl eller headless Chrome uten å overstyre UA).
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

let ok = 0; const fails = [];
const check = (cond, label, detail = '') => {
  if (cond) { ok += 1; console.log(`  ✓ ${label}`); } else { fails.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
};

const post = async (path, body, headers = {}) => {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': UA, ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, body: j };
};
const get = async (path) => {
  const r = await fetch(`${BASE}${path}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(90000) });
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, body: j };
};

const mongo = new MongoClient(process.env.MONGO_URL);
await mongo.connect();
const db = mongo.db(process.env.DB_NAME);

const sessionId = `${TAG}-sess`;
const createdLeadIds = [];

try {
  // ---------------------------------------------------------------------
  // Ren logikk testes uten nettverk. Da får vi full grendekning UTEN å sende
  // én eneste ekte konvertering til Meta eller Google.
  console.log('\n0) ÅRSAKSLOGIKK (ren funksjon, ingen nettverk)');
  const { resolveSkipReason, isSyntheticLead } = await import('/app/lib/closed-loop-reasons.js');
  check(resolveSkipReason('google', {}) === null, 'alt i orden → ingen årsak');
  check(resolveSkipReason('google', { hasClickId: false }) === 'mangler_gclid', 'google uten klikk-ID → mangler_gclid');
  check(resolveSkipReason('meta', { hasClickId: false }) === null, 'meta trenger ikke klikk-ID');
  check(resolveSkipReason('google', { consentOk: false, hasClickId: false }) === 'ingen_markedsforingssamtykke', 'samtykke rapporteres FØR gclid');
  check(resolveSkipReason('google', { configured: false, consentOk: false }) === 'ikke_konfigurert', 'oppsett rapporteres FØR samtykke');
  check(resolveSkipReason('google', { allowAdConversions: false, configured: false }) === 'annonsekonverteringer_av', 'av-bryter rapporteres først');
  check(resolveSkipReason('ga4', { configured: false }) === 'ga4_api_secret_mangler', 'ga4 får egen oppsett-årsak');
  check(resolveSkipReason('google', { synthetic: true }) === 'testlead', 'testlead slår ut alt annet');
  check(isSyntheticLead({ email: 'a@probe.test' }) === true, 'e-post på .test regnes som testlead');
  check(isSyntheticLead({ email: 'x@example.com' }) === true, 'example.com regnes som testlead');
  check(isSyntheticLead({ qa: true }) === true, 'qa-flagg regnes som testlead');
  check(isSyntheticLead({ email: 'kunde@digihome.no', name: 'Kari' }) === false, 'ekte kunde er IKKE testlead');

  // ---------------------------------------------------------------------
  console.log('\n1) HENDELSESTYPER — lagres de som seg selv?');
  const types = ['call_click', 'consent_choice', 'consent_view', 'cta_click', 'form_error', 'wizard_step'];
  for (const t of types) {
    const res = await post('/api/track', {
      type: t, sessionId, path: '/probe', source: 'meta', medium: 'cpc',
      meta: t === 'consent_choice' ? { choice: 'all' } : { placement: 'footer' },
    });
    check(res.status === 204 || res.status === 200, `POST /api/track type=${t} godtatt`, `status ${res.status}`);
  }
  await new Promise((r) => setTimeout(r, 900));
  const stored = await db.collection('events').find({ sessionId }).project({ _id: 0, type: 1, meta: 1 }).toArray();
  console.log(`     lagret: ${stored.map((s) => s.type).join(', ') || '(ingenting)'}`);
  for (const t of types) {
    check(stored.some((s) => s.type === t), `«${t}» lagret med riktig type (ikke omdøpt til pageview)`);
  }
  const choiceEv = stored.find((s) => s.type === 'consent_choice');
  check(choiceEv && choiceEv.meta && choiceEv.meta.choice === 'all', 'consent_choice beholder meta.choice');

  // ---------------------------------------------------------------------
  console.log('\n2) LUKKET SLØYFE — logges det ALLTID et utfall?');

  // 2a. Lead UTEN gclid → forventer skipped: mangler_gclid
  const leadA = await post('/api/leads', {
    name: `${TAG} uten gclid`, email: `${TAG.toLowerCase()}-a@probe.test`, phone: '40000001',
    address: 'Probeveien 1, 5003 Bergen', lead_type: 'huseier', source: 'probe',
    attribution: { source: 'meta', medium: 'cpc', campaign: 'probe' },
  });
  check(leadA.status === 200 || leadA.status === 201, 'lead A opprettet', `status ${leadA.status}`);
  const idA = leadA.body?.lead?.id || leadA.body?.id;
  if (idA) createdLeadIds.push(idA);
  check(!!idA, 'lead A har id');

  if (idA) {
    const wonA = await post(`/api/admin/lead-status?key=${KEY}`, { id: idA, status: 'won', value: 26350 });
    check(wonA.status === 200, 'status=won godtatt for lead A', `status ${wonA.status}`);
    check(!!wonA.body?.conversions, 'svaret inneholder conversions-objekt');
    const docA = await db.collection('leads').findOne({ id: idA });
    console.log(`     googleAdsWon: ${JSON.stringify(docA?.googleAdsWon)}`);
    console.log(`     metaCapiWon:  ${JSON.stringify(docA?.metaCapiWon)}`);
    console.log(`     ga4Won:       ${JSON.stringify(docA?.ga4Won)}`);
    check(!!docA?.googleAdsWon, 'googleAdsWon er logget (ikke stille avhopp)');
    check(docA?.googleAdsWon?.ok === true || !!docA?.googleAdsWon?.reason || !!docA?.googleAdsWon?.error,
      'googleAdsWon har enten ok, årsak eller feil');
    // Probe-leadet har e-post på .test → skal stoppes som testlead FØR noe sendes.
    check(docA?.googleAdsWon?.reason === 'testlead', 'testlead-vakten stopper Google-opplasting', `fikk ${docA?.googleAdsWon?.reason}`);
    check(docA?.metaCapiWon?.reason === 'testlead', 'testlead-vakten stopper Meta-hendelsen', `fikk ${docA?.metaCapiWon?.reason}`);
    check(docA?.metaCapiWon?.ok !== true, 'ingen ekte Meta-hendelse sendt for testleadet');
    check(!!docA?.metaCapiWon, 'metaCapiWon er logget');
    check(!!docA?.ga4Won, 'ga4Won er logget');
    check(docA?.wonValue === 26350, 'wonValue lagret', String(docA?.wonValue));
  }

  // 2b. Lead MED gclid, men UTEN markedsføringssamtykke.
  //
  // Vi setter marketingConsent: false med vilje. Første kjøring (05.08.2026)
  // testet den ekte veien og fikk requestId fra Google — altså FUNGERER
  // opplastingen. Men den sendte samtidig en ekte Purchase-hendelse til Meta og
  // en opplasting til Google Ads. En test skal ikke forurense live måledata, så
  // fra nå av verifiserer vi grenlogikken uten å sende noe utover.
  // Riktig årsak skal være «ingen_markedsforingssamtykke» — IKKE «mangler_gclid».
  const leadB = await post('/api/leads', {
    name: `${TAG} med gclid`, email: `${TAG.toLowerCase()}-b@probe.test`, phone: '40000002',
    address: 'Probeveien 2, 5003 Bergen', lead_type: 'huseier', source: 'probe',
    marketingConsent: false,
    attribution: { source: 'google', medium: 'cpc', campaign: 'probe', gclid: `PROBE_${Date.now()}` },
  });
  const idB = leadB.body?.lead?.id || leadB.body?.id;
  if (idB) createdLeadIds.push(idB);
  check(!!idB, 'lead B opprettet med gclid');
  if (idB) {
    await post(`/api/admin/lead-status?key=${KEY}`, { id: idB, status: 'won', value: 26350 });
    const docB = await db.collection('leads').findOne({ id: idB });
    console.log(`     googleAdsWon: ${JSON.stringify(docB?.googleAdsWon)}`);
    check(!!docB?.googleAdsWon, 'googleAdsWon logget for lead B');
    check(docB?.googleAdsWon?.reason !== 'mangler_gclid', 'ikke «mangler_gclid» når gclid finnes');
    check(docB?.googleAdsWon?.reason === 'testlead', 'testlead-vakten treffer også med gclid', `reason=${docB?.googleAdsWon?.reason}`);
    check(docB?.metaCapiWon?.ok !== true, 'ingen ekte Meta-hendelse sendt for testleadet');

    // Idempotens: samme status igjen skal ikke overskrive et OK-signal
    const before = JSON.stringify(docB?.googleAdsWon);
    await post(`/api/admin/lead-status?key=${KEY}`, { id: idB, status: 'won', value: 26350 });
    const docB2 = await db.collection('leads').findOne({ id: idB });
    check(docB2?.googleAdsWon?.ok !== true || JSON.stringify(docB2.googleAdsWon) === before,
      'et OK-signal sendes ikke på nytt (idempotent)');
  }

  // ---------------------------------------------------------------------
  console.log('\n3) PAID FUNNEL — ringeklikk, samtykkerate, kost pr. henvendelse');
  const an = await get(`/api/admin/analytics?days=30&key=${KEY}`);
  check(an.status === 200, 'GET /api/admin/analytics 200', `status ${an.status}`);
  const rows = an.body?.paid?.channels || an.body?.paid?.rows || an.body?.paid || [];
  const arr = Array.isArray(rows) ? rows : Object.values(rows || {});
  const meta = arr.find((c) => c && c.key === 'meta');
  console.log(`     meta-rad: ${JSON.stringify(meta).slice(0, 320)}`);
  check(!!meta, 'meta-kanal finnes i paid funnel');
  if (meta) {
    check('calls' in meta, 'paid funnel har «calls»');
    check('consentRate' in meta, 'paid funnel har «consentRate»');
    check('contacts' in meta, 'paid funnel har «contacts»');
    check('costPerContact' in meta, 'paid funnel har «costPerContact»');
    check(meta.calls >= 1, 'ringeklikket fra probe er telt', `calls=${meta.calls}`);
    check(meta.consentRate !== null && meta.consentRate !== undefined, 'samtykkerate beregnet', String(meta.consentRate));
  }

  // ---------------------------------------------------------------------
  console.log('\n4) KPI — CPL betalt vs CPL alle');
  const kpi = await get(`/api/admin/kpi?key=${KEY}`);
  check(kpi.status === 200, 'GET /api/admin/kpi 200', `status ${kpi.status}`);
  const cpl = kpi.body?.hero?.cpl;
  console.log(`     hero.cpl: ${JSON.stringify(cpl)}`);
  check(!!cpl, 'hero.cpl finnes');
  if (cpl) {
    check('paid' in cpl, 'hero.cpl.paid finnes');
    check('paidLeads' in cpl, 'hero.cpl.paidLeads finnes');
    check('allLeads' in cpl, 'hero.cpl.allLeads finnes');
    check('organicLeads' in cpl, 'hero.cpl.organicLeads finnes');
    check(typeof cpl.basis === 'string', 'hero.cpl.basis forklarer grunnlaget');
    if (cpl.paidLeads != null && cpl.allLeads != null) {
      check(cpl.paidLeads <= cpl.allLeads, 'betalte leads ≤ alle huseierleads', `${cpl.paidLeads} / ${cpl.allLeads}`);
    }
  }
  const leadsBlock = kpi.body?.metrics?.leads || null;
  if (leadsBlock) console.log(`     metrics.leads: ${JSON.stringify(leadsBlock).slice(0, 200)}`);

  // ---------------------------------------------------------------------
  console.log('\n5) LANDINGSSIDE — /lp/gratis-vurdering');
  const lp = await fetch(`${BASE}/lp/gratis-vurdering`, { headers: { 'user-agent': UA } });
  const html = await lp.text();
  check(lp.status === 200, 'siden svarer 200', `status ${lp.status}`);
  check(/Hva kan boligen din tjene i leie\?/.test(html), 'overskriften matcher annonseløftet');
  check(/noindex/.test(html), 'siden er noindex (kampanjeside)');
  check(/lp-gratis-vurdering|gratis-vurdering/.test(html), 'kildemerking finnes i siden');
} finally {
  // ---------------------------------------------------------------------
  console.log('\n6) OPPRYDDING');
  const ev = await db.collection('events').deleteMany({ sessionId });
  console.log(`  slettet ${ev.deletedCount} probe-hendelser`);
  let del = 0;
  for (const id of createdLeadIds) {
    const r = await db.collection('leads').deleteOne({ id });
    del += r.deletedCount;
  }
  console.log(`  slettet ${del} probe-leads`);
  const rest = await db.collection('leads').countDocuments({ name: { $regex: '^PROBE-ADS-' } });
  console.log(`  gjenstående PROBE-ADS-leads: ${rest}`);
  if (rest !== 0) fails.push(`opprydding ufullstendig: ${rest} probe-leads igjen`);
  // Utboks-poster laget av probe-leadene (pushback) ryddes også.
  try {
    const ob = await db.collection('lead_pushback_outbox').deleteMany({ platform_id: { $in: createdLeadIds } });
    if (ob.deletedCount) console.log(`  slettet ${ob.deletedCount} utboks-poster`);
  } catch (e) { /* samlingen finnes kanskje ikke */ }
  await mongo.close();
}

console.log(`\n══════════ RESULTAT: ${ok} OK, ${fails.length} feil ══════════`);
for (const f of fails) console.log(`  FEIL: ${f}`);
process.exit(fails.length ? 1 : 0);
