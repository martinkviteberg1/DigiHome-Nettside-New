// Verifiser at CAPI kan sende en (test-)hendelse til datasettet.
// node --env-file=/app/.env /app/scripts/meta_capi_test.mjs
import crypto from 'crypto';
const VER = process.env.META_API_VERSION || 'v21.0';
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

(async () => {
  const event = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_id: 'capi-selftest-' + Date.now(),
    event_source_url: 'https://digihome.no/bli-utleier',
    user_data: {
      em: [sha('qa-capi-test@example.test')],
      ph: [sha('4790000099')],
      client_ip_address: '203.0.113.10',
      client_user_agent: 'Mozilla/5.0 (selftest)',
    },
    custom_data: { content_name: 'selftest' },
  };
  const url = `https://graph.facebook.com/${VER}/${PIXEL}/events?access_token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [event] }) });
  const j = await res.json();
  console.log('STATUS', res.status);
  console.log(JSON.stringify(j, null, 2));
})();
