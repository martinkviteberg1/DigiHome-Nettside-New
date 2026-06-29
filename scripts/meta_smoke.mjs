// Smoke-test for Meta Marketing API.
// Kjør: node --env-file=/app/.env /app/scripts/meta_smoke.mjs
// Verifiserer System User-tokenet, lister tilgjengelige annonsekontoer,
// og henter et lite forbruks-utdrag (siste 30 dager, per kampanje).

const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const VER = process.env.META_API_VERSION || 'v21.0';
const BASE = `https://graph.facebook.com/${VER}`;

function mask(t) { return t ? `${t.slice(0, 8)}…${t.slice(-6)} (len ${t.length})` : '(tom)'; }

async function gget(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', TOKEN);
  const res = await fetch(url.toString());
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

(async () => {
  console.log('TOKEN:', mask(TOKEN));
  if (!TOKEN) { console.error('Mangler META_SYSTEM_USER_TOKEN'); process.exit(1); }

  // 1) Hvem er tokenet?
  console.log('\n=== 1) /me ===');
  const me = await gget('/me', { fields: 'id,name' });
  console.log(me.status, JSON.stringify(me.json));

  // 2) Token-debug (type, scopes, utløp)
  console.log('\n=== 2) /debug_token ===');
  const dbg = await gget('/debug_token', { input_token: TOKEN });
  if (dbg.json && dbg.json.data) {
    const d = dbg.json.data;
    console.log('type:', d.type, '| app_id:', d.app_id, '| expires_at:', d.expires_at, '(0 = aldri)', '| data_access_expires_at:', d.data_access_expires_at);
    console.log('scopes:', (d.scopes || []).join(', '));
    console.log('is_valid:', d.is_valid);
  } else {
    console.log(dbg.status, JSON.stringify(dbg.json));
  }

  // 3) Tilgjengelige annonsekontoer
  console.log('\n=== 3) /me/adaccounts ===');
  const acc = await gget('/me/adaccounts', { fields: 'id,account_id,name,currency,account_status,amount_spent', limit: '25' });
  console.log(acc.status);
  const accounts = (acc.json && acc.json.data) || [];
  if (!accounts.length) { console.log(JSON.stringify(acc.json)); }
  accounts.forEach((a) => console.log(`  ${a.id} | ${a.name} | ${a.currency} | status ${a.account_status} | brukt totalt ${a.amount_spent}`));

  // 4) Forbruks-utdrag for første konto
  const first = (process.env.META_AD_ACCOUNT_ID && process.env.META_AD_ACCOUNT_ID.trim()) || (accounts[0] && accounts[0].id);
  if (first) {
    console.log(`\n=== 4) ${first}/insights (siste 30 dager, per kampanje) ===`);
    const ins = await gget(`/${first}/insights`, {
      level: 'campaign',
      fields: 'campaign_name,spend,impressions,clicks,cpc,ctr',
      date_preset: 'last_30d',
      limit: '10',
    });
    console.log(ins.status);
    const rows = (ins.json && ins.json.data) || [];
    if (!rows.length) console.log(JSON.stringify(ins.json));
    rows.forEach((r) => console.log(`  ${r.campaign_name}: ${r.spend} (${r.impressions} visn, ${r.clicks} klikk, CPC ${r.cpc})`));
  } else {
    console.log('\nIngen konto å hente insights fra.');
  }
})();
