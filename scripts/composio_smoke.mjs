// Smoke test for Composio Google Ads integration.
// Discovers: client init, googleads toolkit + tool slugs, existing auth configs + connected accounts.
// Run: node scripts/composio_smoke.mjs
import fs from 'fs';
import path from 'path';
import { Composio } from '@composio/core';

// --- minimal .env loader ---
function loadEnv() {
  const p = path.resolve('.env');
  const txt = fs.readFileSync(p, 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, k, v] = m;
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const API_KEY = process.env.COMPOSIO_API_KEY;
const USER_ID = process.env.COMPOSIO_USER_ID || 'digihome-admin';
console.log('API key present:', !!API_KEY, 'userId:', USER_ID);

const composio = new Composio({ apiKey: API_KEY });

async function main() {
  // 1) Toolkit detail
  try {
    const tk = await composio.toolkits.get('googleads');
    console.log('\n=== TOOLKIT googleads ===');
    console.log('slug:', tk.slug, '| name:', tk.name);
    console.log('auth_schemes:', JSON.stringify(tk.authConfigDetails?.map?.((a) => a.mode || a.name) || tk.meta?.authConfigDetails || tk.authConfigDetails || 'n/a'));
    console.log('toolkit keys:', Object.keys(tk));
  } catch (e) {
    console.log('toolkits.get(googleads) ERROR:', e.message);
  }

  // 2) Tools for googleads
  try {
    const tools = await composio.tools.get(USER_ID, { toolkits: ['googleads'], limit: 100 });
    const arr = Array.isArray(tools) ? tools : (tools.items || []);
    console.log(`\n=== TOOLS for googleads (${arr.length}) ===`);
    for (const t of arr) {
      console.log('-', t.slug || t.name, '::', (t.description || '').slice(0, 70));
    }
  } catch (e) {
    console.log('tools.get ERROR:', e.message);
  }

  // 3) Existing auth configs
  try {
    const acs = await composio.authConfigs.list({ toolkit: 'googleads' });
    const items = acs.items || acs;
    console.log('\n=== AUTH CONFIGS (googleads) ===');
    console.log(JSON.stringify((items || []).map((a) => ({ id: a.id, name: a.name, mode: a.authScheme || a.type, isComposioManaged: a.isComposioManaged })), null, 2));
  } catch (e) {
    console.log('authConfigs.list ERROR:', e.message);
  }

  // 4) Existing connected accounts for this user
  try {
    const cas = await composio.connectedAccounts.list({ userIds: [USER_ID], toolkitSlugs: ['googleads'] });
    const items = cas.items || cas;
    console.log('\n=== CONNECTED ACCOUNTS (user, googleads) ===');
    console.log(JSON.stringify((items || []).map((c) => ({ id: c.id, status: c.status, toolkit: c.toolkit?.slug || c.toolkitSlug, authConfig: c.authConfig?.id })), null, 2));
  } catch (e) {
    console.log('connectedAccounts.list ERROR:', e.message);
  }
}

main().then(() => { console.log('\nDONE'); process.exit(0); }).catch((e) => { console.error('FATAL', e); process.exit(1); });
