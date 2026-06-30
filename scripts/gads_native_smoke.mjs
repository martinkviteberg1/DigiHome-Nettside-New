import fs from 'fs';
const env = fs.readFileSync('/app/.env', 'utf8'); const E = {};
for (const l of env.split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) E[m[1]] = m[2]; }
const DEV = E.GOOGLE_ADS_DEVELOPER_TOKEN, CID = E.GOOGLE_ADS_CLIENT_ID, CS = E.GOOGLE_ADS_CLIENT_SECRET;
const RT = E.GOOGLE_ADS_REFRESH_TOKEN, LOGIN = E.GOOGLE_ADS_LOGIN_CUSTOMER_ID, CUST = E.GOOGLE_ADS_CUSTOMER_ID;

async function getAccessToken() {
  const body = new URLSearchParams({ client_id: CID, client_secret: CS, refresh_token: RT, grant_type: 'refresh_token' });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  if (!r.ok) throw new Error('OAuth feilet: ' + JSON.stringify(j));
  return j.access_token;
}

async function tryVersion(token, ver) {
  // listAccessibleCustomers
  const la = await fetch(`https://googleads.googleapis.com/${ver}/customers:listAccessibleCustomers`, {
    headers: { Authorization: `Bearer ${token}`, 'developer-token': DEV },
  });
  const laj = await la.json();
  return { status: la.status, body: laj };
}

(async () => {
  console.log('=== Konfig ===');
  console.log('dev-token:', DEV ? `satt (${DEV.length})` : 'MANGLER');
  console.log('client_id:', CID ? 'satt' : 'MANGLER', '| secret:', CS ? 'satt' : 'MANGLER', '| refresh:', RT ? `satt (${RT.length})` : 'MANGLER');
  console.log('login-customer-id:', LOGIN, '| customer-id:', CUST);

  console.log('\n=== 1) OAuth: bytt refresh→access token ===');
  let token;
  try { token = await getAccessToken(); console.log('OK access_token (len', token.length + ')'); }
  catch (e) { console.log('FEIL:', e.message); return; }

  console.log('\n=== 2) listAccessibleCustomers (prøver versjoner) ===');
  let goodVer = null;
  for (const ver of ['v21', 'v20', 'v19', 'v18', 'v17']) {
    try {
      const r = await tryVersion(token, ver);
      if (r.status === 200) { console.log(`[${ver}] 200 →`, JSON.stringify(r.body)); goodVer = ver; break; }
      else console.log(`[${ver}] ${r.status} →`, JSON.stringify(r.body).slice(0, 180));
    } catch (e) { console.log(`[${ver}] EXC`, e.message); }
  }
  if (!goodVer) { console.log('Ingen API-versjon svarte 200 på listAccessibleCustomers.'); return; }

  console.log(`\n=== 3) GAQL mot kunde ${CUST} (versjon ${goodVer}) ===`);
  const query = 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer LIMIT 1';
  const r = await fetch(`https://googleads.googleapis.com/${goodVer}/customers/${CUST}/googleAds:search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'developer-token': DEV, 'login-customer-id': LOGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const j = await r.json();
  console.log('status:', r.status);
  console.log('svar:', JSON.stringify(j).slice(0, 600));

  console.log(`\n=== 4) GAQL kampanje-kostnad siste 30 dager (versjon ${goodVer}) ===`);
  const q2 = "SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.impressions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 5";
  const r2 = await fetch(`https://googleads.googleapis.com/${goodVer}/customers/${CUST}/googleAds:search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'developer-token': DEV, 'login-customer-id': LOGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q2 }),
  });
  const j2 = await r2.json();
  console.log('status:', r2.status);
  console.log('svar:', JSON.stringify(j2).slice(0, 800));
})().catch(e => console.log('UNCAUGHT', e.message));
