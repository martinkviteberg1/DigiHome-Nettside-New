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
  const ac = await composio.authConfigs.create('googleads', { type: 'use_composio_managed_auth', name: 'DigiHome Google Ads' });
  console.log('auth config:', ac.id, 'managed:', ac.isComposioManaged);

  const req = await composio.connectedAccounts.link(USER_ID, ac.id, { callbackUrl: 'https://hero-premiere-4.preview.emergentagent.com/admin?googleads=connected' });
  console.log('connection request id:', req.id);
  console.log('redirectUrl present:', !!req.redirectUrl);
  console.log('redirectUrl:', req.redirectUrl);
  console.log('req keys:', Object.keys(req));

  // cleanup: delete the connection request + auth config so we don't leave clutter (real flow recreates)
  try { await composio.connectedAccounts.delete(req.id); console.log('deleted connection req'); } catch (e) { console.log('del conn skip:', e.message); }
  try { await composio.authConfigs.delete(ac.id); console.log('deleted auth config'); } catch (e) { console.log('del ac skip:', e.message); }
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e.message); process.exit(1); });
