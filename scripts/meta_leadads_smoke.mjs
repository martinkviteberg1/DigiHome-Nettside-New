// Sonder Meta Lead Ads-tilgang via system-user-tokenet.
// node --env-file=/app/.env /app/scripts/meta_leadads_smoke.mjs
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const VER = process.env.META_API_VERSION || 'v21.0';
const ACC = process.env.META_AD_ACCOUNT_ID;
const BASE = `https://graph.facebook.com/${VER}`;

async function gget(path, params = {}, token = TOKEN) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString());
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

(async () => {
  // 1) Sider system-brukeren har tilgang til (med page-token)
  console.log('=== /me/accounts (pages) ===');
  const acc = await gget('/me/accounts', { fields: 'id,name,access_token,tasks', limit: '50' });
  console.log(acc.status);
  const pages = (acc.json && acc.json.data) || [];
  if (!pages.length) console.log(JSON.stringify(acc.json));
  for (const p of pages) {
    console.log(`  PAGE ${p.id} | ${p.name} | tasks: ${(p.tasks || []).join(',')} | page_token: ${p.access_token ? 'JA' : 'nei'}`);
  }

  // 2) For hver side: lead-skjemaer (bruk page-token hvis tilgjengelig)
  for (const p of pages) {
    const tk = p.access_token || TOKEN;
    console.log(`\n=== /${p.id}/leadgen_forms (${p.name}) ===`);
    const f = await gget(`/${p.id}/leadgen_forms`, { fields: 'id,name,status,leads_count', limit: '25' }, tk);
    console.log(f.status);
    const forms = (f.json && f.json.data) || [];
    if (!forms.length) console.log(JSON.stringify(f.json));
    for (const form of forms) {
      console.log(`  FORM ${form.id} | ${form.name} | status ${form.status} | leads_count ${form.leads_count}`);
      if (form.leads_count > 0) {
        const l = await gget(`/${form.id}/leads`, { fields: 'id,created_time,ad_id,campaign_name,field_data', limit: '2' }, tk);
        console.log(`    sample leads (${l.status}):`, JSON.stringify((l.json && l.json.data) || l.json).slice(0, 600));
      }
    }
  }

  // 3) Fallback: er det leadgen-skjemaer knyttet til annonsekontoen?
  console.log(`\n=== ${ACC} (promote_pages / owner) ===`);
  const accInfo = await gget(`/${ACC}`, { fields: 'name,business,promote_pages' });
  console.log(accInfo.status, JSON.stringify(accInfo.json));
})();
