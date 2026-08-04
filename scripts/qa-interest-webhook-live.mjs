// LIVE-SJEKK mot plattformens webhook-endepunkt. Sender ÉN tydelig merket
// QA-post på en enhets-ID som ikke finnes, slik at den havner i deres
// «unmatched»-lager og ingen ekte bolig får en falsk henvendelse.
// Kjøres manuelt: node scripts/qa-interest-webhook-live.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { pushInterestWebhook, webhookTarget, buildInterestItem } = await import('/app/lib/interest-webhook.js');

const target = webhookTarget();
console.log('MÅL:', target.ok ? target.host : `AVSLÅTT (${target.reason})`);
if (!target.ok) process.exit(1);

const at = new Date().toISOString();
const item = buildInterestItem(
  { id: 'qa-webhook-selftest', name: 'QA – DigiHome markedsside', email: 'qa+webhook@example.com', phone: '00000000' },
  {
    unitId: 'qa-webhook-selftest-unit',
    propertyId: 'qa-webhook-selftest-unit',
    propertyTitle: 'QA – ikke en reell bolig',
    propertyAddress: 'QA-veien 0, 0000 Test',
    propertySlug: 'qa-webhook-selftest',
    propertyUrl: 'https://digihome.no/ledige-boliger/qa-webhook-selftest',
    rentalScope: 'hele',
    scope: ['hele'],
    scopeLabel: 'Hele enheten',
    message: 'QA fra markedssiden: verifiserer HMAC-signatur og idempotens. Ikke en reell interessent — ingen oppfølging nødvendig.',
    source: 'qa-webhook-selftest',
    at,
  },
);

const first = await pushInterestWebhook(item, target);
console.log('\n1. FØRSTE PUSH');
console.log('   http:', first.http, '· ok:', first.ok);
console.log('   status:', first.platformStatus, '· lead_id:', first.platformRef);
if (first.error) console.log('   feil:', first.error);

const second = await pushInterestWebhook(item, target);
console.log('\n2. SAMME item.id PÅ NYTT (idempotens)');
console.log('   http:', second.http, '· ok:', second.ok);
console.log('   status:', second.platformStatus, '· lead_id:', second.platformRef);
if (second.error) console.log('   feil:', second.error);

// Feil signatur MÅ avvises — ellers er ikke endepunktet beskyttet.
const bad = await pushInterestWebhook(item, { ...target, secret: 'feil-hemmelighet' });
console.log('\n3. FEIL SIGNATUR (skal gi 401)');
console.log('   http:', bad.http, '· ok:', bad.ok, '·', bad.error || '');

const verdict = first.ok && second.ok && !bad.ok && bad.http === 401;
console.log(`\n${verdict ? '✓ Kontrakten holder: signert push godtas, samme id deduperes, feil signatur avvises.' : '✗ Noe stemmer ikke — se over.'}`);
process.exit(verdict ? 0 : 1);
