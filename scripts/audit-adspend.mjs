// ---------------------------------------------------------------------------
// Diagnose: stemmer annonseforbruket vi viser i Nøkkeltall?
//
// Sammenligner for samme tidsvindu:
//   Google:  (A) kampanjenivå  FROM campaign          ← autoritativ (alle kampanjetyper)
//            (B) annonsenivå   FROM ad_group_ad       ← det appen bruker i dag
//   Meta:    (C) kampanjenivå  /insights level=campaign ← autoritativ for perioden
//            (D) annonseliste  /ads?insights...        ← det appen bruker i dag
//            (E) samme som D, men MED «lifetime-fallback» som i lib/meta-ads.js
//
// Kjør:  node scripts/audit-adspend.mjs [dager]
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';

// --- Minimal .env-lasting (håndterer 'quotes' og # i verdier) ---------------
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.split(' #')[0].trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(path.join(process.cwd(), '.env'));

const DAYS = Math.max(1, Number(process.argv[2]) || 7);
const nowMs = Date.now();
const fromMs = nowMs - DAYS * 86400000;
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const FROM = ymd(fromMs);
const TO = ymd(nowMs);
const nok = (x) => (Math.round((Number(x) || 0) * 100) / 100).toLocaleString('nb-NO');

console.log(`\n=== ANNONSEFORBRUK-REVISJON · ${DAYS} dager · ${FROM} → ${TO} ===\n`);

// --- Google Ads -------------------------------------------------------------
const G_DEV = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();
const G_CID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
const G_LOGIN = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '');
const API_VER = process.env.GOOGLE_ADS_API_VERSION || 'v21';

async function gToken() {
  const body = new URLSearchParams({
    client_id: (process.env.GOOGLE_ADS_CLIENT_ID || '').trim(),
    client_secret: (process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim(),
    refresh_token: (process.env.GOOGLE_ADS_REFRESH_TOKEN || '').trim(),
    grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  if (!r.ok) throw new Error('OAuth: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

async function gaql(token, query) {
  const out = [];
  let pageToken;
  do {
    const r = await fetch(`https://googleads.googleapis.com/${API_VER}/customers/${G_CID}/googleAds:search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'developer-token': G_DEV, ...(G_LOGIN ? { 'login-customer-id': G_LOGIN } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify(pageToken ? { query, pageToken } : { query }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error('GAQL: ' + JSON.stringify(j).slice(0, 400));
    out.push(...(j.results || []));
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}

const num = (x) => Number(x) || 0;

async function google() {
  if (!(G_DEV && G_CID)) { console.log('Google Ads: ikke konfigurert\n'); return null; }
  const token = await gToken();
  // (A) kampanjenivå — autoritativ
  const campRows = await gaql(token, `SELECT campaign.id, campaign.name, campaign.advertising_channel_type, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${FROM}' AND '${TO}'`);
  const byCamp = new Map();
  let campTotal = 0;
  for (const r of campRows) {
    const c = num(r.metrics?.costMicros) / 1e6;
    campTotal += c;
    const k = `${r.campaign?.name || r.campaign?.id} [${r.campaign?.advertisingChannelType || '?'}]`;
    byCamp.set(k, (byCamp.get(k) || 0) + c);
  }
  // (B) annonsenivå — det appen bruker (ekskl. REMOVED)
  const adRows = await gaql(token, `SELECT ad_group_ad.ad.id, metrics.cost_micros FROM ad_group_ad WHERE segments.date BETWEEN '${FROM}' AND '${TO}' AND ad_group_ad.status != 'REMOVED'`);
  const adTotal = adRows.reduce((s, r) => s + num(r.metrics?.costMicros) / 1e6, 0);
  // (B2) annonsenivå inkl. REMOVED
  const adAllRows = await gaql(token, `SELECT ad_group_ad.ad.id, metrics.cost_micros FROM ad_group_ad WHERE segments.date BETWEEN '${FROM}' AND '${TO}'`);
  const adAllTotal = adAllRows.reduce((s, r) => s + num(r.metrics?.costMicros) / 1e6, 0);

  console.log('--- GOOGLE ADS ---');
  console.log(`(A) Kampanjenivå (autoritativ):        ${nok(campTotal)} kr`);
  console.log(`(B) Annonsenivå ekskl. REMOVED (app):  ${nok(adTotal)} kr`);
  console.log(`(B2) Annonsenivå inkl. REMOVED:        ${nok(adAllTotal)} kr`);
  console.log(`    → Avvik app vs. autoritativ:      ${nok(adTotal - campTotal)} kr (${campTotal > 0 ? Math.round(((adTotal - campTotal) / campTotal) * 100) : 0} %)`);
  console.log('    Kampanjer:');
  for (const [k, v] of [...byCamp.entries()].sort((a, b) => b[1] - a[1])) console.log(`      · ${k}: ${nok(v)} kr`);
  console.log('');
  return { campTotal, adTotal, adAllTotal };
}

// --- Meta -------------------------------------------------------------------
const M_ACC = process.env.META_AD_ACCOUNT_ID || '';
const M_TOK = process.env.META_SYSTEM_USER_TOKEN || '';
const M_VER = process.env.META_API_VERSION || 'v21.0';

async function graph(p, params) {
  const url = new URL(`https://graph.facebook.com/${M_VER}${p}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', M_TOK);
  const r = await fetch(url.toString());
  const j = await r.json();
  if (!r.ok) throw new Error('Meta: ' + JSON.stringify(j.error || j).slice(0, 300));
  return j;
}

async function meta() {
  if (!(M_ACC && M_TOK)) { console.log('Meta: ikke konfigurert\n'); return null; }
  const tr = JSON.stringify({ since: FROM, until: TO });
  // (C) kampanjenivå insights — autoritativ for perioden
  const ins = await graph(`/${M_ACC}/insights`, { level: 'campaign', fields: 'campaign_name,spend,impressions,clicks', time_range: tr, limit: '500' });
  const campTotal = (ins.data || []).reduce((s, r) => s + num(r.spend), 0);

  // (D/E) annonseliste med periode-insights + lifetime-alias (som lib/meta-ads.js)
  const ads = await graph(`/${M_ACC}/ads`, {
    fields: `id,name,effective_status,insights.time_range(${tr}){spend},insights.date_preset(maximum).as(insights_lifetime){spend}`,
    limit: '200',
  });
  let periodOnly = 0, withFallback = 0;
  const inflated = [];
  for (const a of (ads.data || [])) {
    const p = num(a.insights?.data?.[0]?.spend);
    const l = num(a.insights_lifetime?.data?.[0]?.spend);
    periodOnly += p;
    const use = (p <= 0 && l > 0) ? l : p;
    withFallback += use;
    if (p <= 0 && l > 0) inflated.push({ name: (a.name || a.id).slice(0, 48), lifetime: l, status: a.effective_status });
  }

  console.log('--- META ---');
  console.log(`(C) Kampanjenivå (autoritativ):            ${nok(campTotal)} kr`);
  console.log(`(D) Annonsenivå, kun perioden:             ${nok(periodOnly)} kr`);
  console.log(`(E) Annonsenivå MED lifetime-fallback(app):${nok(withFallback)} kr`);
  console.log(`    → Oppblåsing fra fallback:            ${nok(withFallback - periodOnly)} kr`);
  if (inflated.length) {
    console.log(`    Annonser uten forbruk i perioden som likevel bidrar med LIVSTIDS-forbruk (${inflated.length}):`);
    for (const x of inflated.sort((a, b) => b.lifetime - a.lifetime).slice(0, 15)) console.log(`      · ${x.name} [${x.status}]: +${nok(x.lifetime)} kr`);
  }
  console.log('');
  return { campTotal, periodOnly, withFallback };
}

const g = await google().catch((e) => { console.log('Google-feil:', e.message, '\n'); return null; });
const m = await meta().catch((e) => { console.log('Meta-feil:', e.message, '\n'); return null; });

const appTotal = (g?.adTotal || 0) + (m?.withFallback || 0);
const trueTotal = (g?.campTotal || 0) + (m?.campTotal || 0);
console.log('=== SUM ===');
console.log(`Appens tall i dag (Nøkkeltall):  ${nok(appTotal)} kr`);
console.log(`Korrekt forbruk (kampanjenivå):  ${nok(trueTotal)} kr`);
console.log(`Avvik:                           ${nok(appTotal - trueTotal)} kr${trueTotal > 0 ? ` (${Math.round(((appTotal - trueTotal) / trueTotal) * 100)} %)` : ''}\n`);
