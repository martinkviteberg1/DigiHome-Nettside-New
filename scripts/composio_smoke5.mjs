import fs from 'fs';
import path from 'path';
import { Composio } from '@composio/core';

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
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
const USER_ID = process.env.COMPOSIO_USER_ID || 'digihome-admin';

async function main() {
  const tools = await composio.tools.get(USER_ID, { toolkits: ['googleads'], limit: 100 });
  const arr = Array.isArray(tools) ? tools : (tools.items || []);
  for (const want of ['GOOGLEADS_SEARCH_STREAM_GAQL', 'GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS']) {
    const t = arr.find((x) => (x.function && x.function.name) === want);
    console.log(`\n===== ${want} =====`);
    if (!t) { console.log('NOT FOUND'); continue; }
    console.log('description:', t.function.description);
    console.log('parameters:', JSON.stringify(t.function.parameters, null, 2));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e.message); process.exit(1); });
