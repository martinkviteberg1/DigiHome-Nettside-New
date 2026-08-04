// ANALYSE: f\u00f8rsteparts \u00f8ktdata fra produksjon (IKKE samtykke-gated).
// Dette er n\u00f8kkelen til \u00e5 skille to helt ulike problemer fra hverandre:
//   A) folk klikker men lander aldri  (ekte tap \u2014 hastighet/lenke/annonse)
//   B) folk lander, men Meta-pixelen er blokkert av samtykke (m\u00e5lefeil)
//   node scripts/analyse-prod-sessions.mjs [days]
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.ADMIN_KEY;
const PROD = 'https://digihome.no';
const DAYS = process.argv[2] || '30';

const r = await fetch(`${PROD}/api/admin/analytics?days=${DAYS}&key=${KEY}`, { signal: AbortSignal.timeout(90000) });
if (r.status !== 200) { console.log('status', r.status); process.exit(1); }
const a = await r.json();

console.log('Nøkler i svaret:', Object.keys(a).join(', '));

const j = (v) => JSON.stringify(v, null, 2);
for (const key of ['traffic', 'paid', 'leads']) {
  if (a[key] === undefined) continue;
  console.log(`\n══════════ ${key.toUpperCase()} ══════════`);
  console.log(j(a[key]).slice(0, 5000));
}
