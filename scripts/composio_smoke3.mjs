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

async function tryManaged() {
  console.log('--- TEST A: create managed auth config (no creds) ---');
  try {
    const ac = await composio.authConfigs.create('googleads', { type: 'use_composio_managed_auth', name: 'DigiHome GoogleAds (managed test)' });
    console.log('MANAGED OK:', JSON.stringify({ id: ac.id, name: ac.name, isComposioManaged: ac.isComposioManaged, scheme: ac.authScheme }, null, 2));
    return ac;
  } catch (e) {
    console.log('MANAGED FAILED:', e.message);
    if (e.metadata) console.log('meta:', JSON.stringify(e.metadata).slice(0, 400));
    return null;
  }
}

async function tryAuthorize() {
  console.log('\n--- TEST B: toolkits.authorize (auto managed) ---');
  try {
    const req = await composio.toolkits.authorize(USER_ID, 'googleads');
    console.log('AUTHORIZE OK. redirectUrl present:', !!req.redirectUrl, '| id:', req.id);
    console.log('redirectUrl:', req.redirectUrl);
  } catch (e) {
    console.log('AUTHORIZE FAILED:', e.message);
    if (e.metadata) console.log('meta:', JSON.stringify(e.metadata).slice(0, 600));
  }
}

async function main() {
  const ac = await tryManaged();
  if (ac) {
    // cleanup managed test config so we don't leave clutter
    try { await composio.authConfigs.delete(ac.id); console.log('cleaned up test auth config'); } catch (e) { console.log('cleanup skip:', e.message); }
  }
  await tryAuthorize();
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e); process.exit(1); });
