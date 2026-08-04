// ANALYSE: er tilbakemeldingssløyfen til Google Ads i live? Vi har en
// konverteringshandling 'Vunnet utleier' (UPLOAD_CLICKS) som er PRIMÆR, men den
// hadde 0 konverteringer siste 30 dager. Enten lastes ingenting opp, eller
// gclid mangler på leadene. Dette avgjør om Google kan lære hva som ble kunde.
//   node scripts/analyse-offline-conv.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.ADMIN_KEY;
const PROD = 'https://digihome.no';

const r = await fetch(`${PROD}/api/admin/leads?key=${KEY}&limit=1000`, { signal: AbortSignal.timeout(60000) });
const body = await r.json().catch(() => null);
if (r.status !== 200) { console.log('status', r.status); process.exit(1); }
const all = body?.leads || [];
const now = Date.now();
const days = (d) => (now - new Date(d).getTime()) / 86400000;
const in90 = all.filter((l) => days(l.createdAt) <= 90);

console.log(`Leads siste 90 dager: ${in90.length}`);
const withGclid = in90.filter((l) => (l.attribution || {}).gclid);
const withFbclid = in90.filter((l) => (l.attribution || {}).fbclid);
console.log(`Med gclid (kan lastes opp til Google): ${withGclid.length}`);
console.log(`Med fbclid (kan matches i Meta CAPI): ${withFbclid.length}`);

const won = in90.filter((l) => l.status === 'won');
console.log(`\nVunnet siste 90 dager: ${won.length}`);
for (const l of won) {
  const a = l.attribution || {};
  console.log(`· ${String(l.createdAt).slice(0, 10)} · kilde ${a.source || l.source || '?'} · kampanje ${a.campaign || '-'} · gclid ${a.gclid ? 'JA' : 'nei'} · opplastet til Google: ${l.googleOfflineConversion ? JSON.stringify(l.googleOfflineConversion).slice(0, 120) : 'INGEN SPOR'}`);
}

console.log('\nCAPI-status på leads siste 90 dager (Meta server-side Lead):');
const capiOk = in90.filter((l) => l.metaCapi?.ok === true).length;
const capiFail = in90.filter((l) => l.metaCapi && l.metaCapi.ok === false).length;
const capiNone = in90.length - capiOk - capiFail;
console.log(`  sendt ok: ${capiOk} · feilet: ${capiFail} · ingen CAPI-spor: ${capiNone}`);
for (const l of in90.filter((x) => x.metaCapi && x.metaCapi.ok === false).slice(0, 5)) {
  console.log(`  feil: ${String(l.createdAt).slice(0, 10)} ${String(l.metaCapi.error || '').slice(0, 160)}`);
}
