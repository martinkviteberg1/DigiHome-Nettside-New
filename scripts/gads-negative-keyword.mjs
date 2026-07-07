// Legger NEGATIVT søkeord «utleiemegleren» (PHRASE) på den generiske
// Search-kampanjen — konkurrentkampanjen røres IKKE (der er termen tilsiktet).
// Kjøring: node scripts/gads-negative-keyword.mjs [--apply]
import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('/app/.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const VER = env.GOOGLE_ADS_API_VERSION || 'v21';
const BASE = `https://googleads.googleapis.com/${VER}`;
const CID = (env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/\D/g, '');
const LOGIN = (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/\D/g, '');
const CAMPAIGN = `customers/${CID}/campaigns/23984331113`; // DH | Utleie | Bergen | Search
const APPLY = process.argv.includes('--apply');

async function token() {
  const body = new URLSearchParams({ client_id: env.GOOGLE_ADS_CLIENT_ID, client_secret: env.GOOGLE_ADS_CLIENT_SECRET, refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN, grant_type: 'refresh_token' });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error);
  return j.access_token;
}
function headers(t) {
  const h = { Authorization: `Bearer ${t}`, 'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN, 'Content-Type': 'application/json' };
  if (LOGIN) h['login-customer-id'] = LOGIN;
  return h;
}

const t = await token();

// 1) Vis eksisterende negative søkeord på kampanjen
const q = `SELECT campaign_criterion.criterion_id, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign_criterion.negative, campaign.name FROM campaign_criterion WHERE campaign.id = 23984331113 AND campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE`;
const sr = await (await fetch(`${BASE}/customers/${CID}/googleAds:search`, { method: 'POST', headers: headers(t), body: JSON.stringify({ query: q }) })).json();
const existing = (sr.results || []).map((r) => `${r.campaignCriterion.keyword.text} [${r.campaignCriterion.keyword.matchType}]`);
console.log('Eksisterende negative søkeord på «DH | Utleie | Bergen | Search»:', existing.length ? existing : '(ingen)');
if (existing.some((e) => /utleiemegleren/i.test(e))) { console.log('→ «utleiemegleren» finnes allerede. Avslutter.'); process.exit(0); }

if (!APPLY) { console.log('DRY-RUN: ville lagt til negativt søkeord «utleiemegleren» (PHRASE) på', CAMPAIGN); process.exit(0); }

// 2) Legg til negativt søkeord (phrase — dekker «utleiemegleren bergen/pris» osv.)
const mr = await (await fetch(`${BASE}/customers/${CID}/campaignCriteria:mutate`, {
  method: 'POST', headers: headers(t),
  body: JSON.stringify({ operations: [{ create: { campaign: CAMPAIGN, negative: true, keyword: { text: 'utleiemegleren', matchType: 'PHRASE' } } }] }),
})).json();
if (mr.error) throw new Error(JSON.stringify(mr.error).slice(0, 400));
console.log('LAGT TIL ✔', JSON.stringify(mr.results || mr));

// 3) Verifiser
const vr = await (await fetch(`${BASE}/customers/${CID}/googleAds:search`, { method: 'POST', headers: headers(t), body: JSON.stringify({ query: q }) })).json();
console.log('Negative søkeord etter endring:', (vr.results || []).map((r) => `${r.campaignCriterion.keyword.text} [${r.campaignCriterion.keyword.matchType}]`));
