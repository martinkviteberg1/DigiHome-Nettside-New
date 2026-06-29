// Diagnostikk: sjekk status på Google Ads-konverteringshandling(er) + nylige konverteringer.
// Kjøres med: node scripts/composio_check_conversion.mjs
import fs from 'fs';

// Last .env manuelt (enkelt parse)
try {
  const env = fs.readFileSync('/app/.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch (e) {}

const API_KEY = process.env.COMPOSIO_API_KEY || '';
const USER_ID = process.env.COMPOSIO_USER_ID || 'digihome-admin';
const CID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/[^0-9]/g, '');
const GAQL_TOOL = 'GOOGLEADS_SEARCH_STREAM_GAQL';

function vparams() {
  const v = (process.env.COMPOSIO_TOOLKIT_VERSION || '').trim();
  if (v && v.toLowerCase() !== 'latest') return { version: v };
  return { version: 'latest', dangerouslySkipVersionCheck: true };
}

async function main() {
  if (!API_KEY) { console.log('MANGLER COMPOSIO_API_KEY'); return; }
  const mod = await import('@composio/core');
  const Composio = mod.Composio || (mod.default && mod.default.Composio) || mod.default;
  const co = new Composio({ apiKey: API_KEY });

  const list = await co.connectedAccounts.list({ userIds: [USER_ID], toolkitSlugs: ['googleads'] });
  const items = Array.isArray(list) ? list : (list.items || list.data || []);
  const active = items.find((c) => String(c.status || '').toUpperCase() === 'ACTIVE') || items[0];
  if (!active) { console.log('INGEN tilkoblet Google Ads-konto'); return; }
  console.log('Tilkoblet konto:', active.id, 'status:', active.status, 'customer_id:', CID);

  async function gaql(query, label) {
    const res = await co.tools.execute(GAQL_TOOL, {
      userId: USER_ID,
      connectedAccountId: active.id,
      arguments: CID ? { query, customer_id: CID } : { query },
      ...vparams(),
    });
    console.log('\n===== ' + label + ' =====');
    if (res && res.successful === false) {
      console.log('FEIL:', JSON.stringify(res.error));
      return;
    }
    const d = (res && (res.data ?? res)) || {};
    // skriv ut rå (begrenset)
    console.log(JSON.stringify(d).slice(0, 4000));
  }

  await gaql(
    "SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, conversion_action.primary_for_goal, conversion_action.counting_type FROM conversion_action",
    'KONVERTERINGSHANDLINGER'
  );

  await gaql(
    "SELECT metrics.all_conversions, metrics.conversions, metrics.clicks, metrics.impressions FROM customer WHERE segments.date DURING LAST_14_DAYS",
    'KONTO-TOTALER SISTE 14 DAGER'
  );

  await gaql(
    "SELECT conversion_action.name, metrics.all_conversions, metrics.conversions FROM conversion_action WHERE segments.date DURING LAST_14_DAYS",
    'KONVERTERINGER PR HANDLING SISTE 14 DAGER'
  );
}

main().catch((e) => { console.error('UNCAUGHT:', e.message); });
