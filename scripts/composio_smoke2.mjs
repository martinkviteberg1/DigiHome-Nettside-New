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
  const tk = await composio.toolkits.get('googleads');
  console.log('=== composioManagedAuthSchemes ===');
  console.log(JSON.stringify(tk.composioManagedAuthSchemes, null, 2));
  console.log('=== authConfigDetails ===');
  console.log(JSON.stringify(tk.authConfigDetails, null, 2).slice(0, 1500));

  const tools = await composio.tools.get(USER_ID, { toolkits: ['googleads'], limit: 100 });
  const arr = Array.isArray(tools) ? tools : (tools.items || []);
  console.log('\n=== TOOL[0] raw keys ===');
  console.log(Object.keys(arr[0] || {}));
  console.log('\n=== ALL TOOL identifiers ===');
  for (const t of arr) {
    // try function shape (provider-wrapped) and raw shape
    const slug = t.slug || t.name || (t.function && t.function.name) || t.toolSlug;
    const desc = t.description || (t.function && t.function.description) || '';
    console.log('-', slug, '::', String(desc).slice(0, 80));
  }
  console.log('\n=== TOOL[0] full JSON ===');
  console.log(JSON.stringify(arr[0], null, 2).slice(0, 1200));
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
