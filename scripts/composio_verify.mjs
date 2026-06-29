import fs from 'fs';
import path from 'path';
function loadEnv() {
  const txt = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, k, v] = m; v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();
const lib = await import('../lib/composio-google-ads.js');

async function main() {
  const st = await lib.getConnectionStatus();
  console.log('STATUS:', JSON.stringify(st));
  if (!st.connected) { console.log('not connected'); return; }
  const r = await lib.runCampaignReport({});
  console.log('REPORT OK → customerId:', r.customerId, '| rows:', r.rowCount, '| campaigns:', r.campaigns.length);
  console.log('totals:', JSON.stringify(r.totals));
  console.log('campaigns:', JSON.stringify(r.campaigns));
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e.message); process.exit(1); });
