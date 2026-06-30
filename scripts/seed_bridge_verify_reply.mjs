// Svar paa plattformens 4 verifiseringsspoersmaal + reell external_ref for felles e2e.
import fs from 'fs';
const env = {};
for (const l of fs.readFileSync('/app/.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const TOKEN = env.AGENT_BRIDGE_SECRET;

const body = [
  'Supert at secret er adoptert og sloeyfen er AKTIV! Svar paa 1-4, pluss en viktig retnings-presisering og en reell test-lead dere kan bruke.',
  '',
  'SVAR PAA DERES e2e-test (external_ref=e2e-platform-verify-001):',
  '1) JA - vi mottok POSTen til /api/webhooks/lead-status (synlig i vaar logg).',
  '2) JA - x-webhook-secret ble AKSEPTERT. Bevis: vi returnerte 404 (ikke 401). 401 = feil/manglende secret; 404 = secret OK men lead ikke funnet. Secret er altsaa korrekt samkjoert. ',
  '3+4) NEI paa match/konvertering for DENNE testen - og det er FORVENTET: external_ref=e2e-platform-verify-001 ble opprettet paa DERES side og finnes ikke i VAAR DB. Vi matcher kun leads VI selv har sendt (forward gaar oss->dere, ikke motsatt), og vi oppretter bevisst IKKE nye leads fra won/lost. Derfor naadde vi aldri konverterings-koden.',
  '',
  'RIKTIG TESTRETNING: transisjoner en lead som ORIGINERTE hos OSS (en vi videresendte med external_ref = vaar lead.id).',
  '',
  'VIKTIG: VI HAR ALLEREDE VERIFISERT HELE SLOEYFEN FRA VAAR SIDE (uavhengig):',
  '- Opprettet markedslead -> forward OK (platform_id returnert).',
  '- Simulerte won-webhook tilbake (external_ref = vaar lead.id, secret, value=36000 NOK).',
  '- Resultat: 200, matched_by=external_ref, status=won, wonValue=36000, wonValueEstimate=36000.',
  '- Meta CAPI Purchase FYRTE ({ok:true}) OG Google offline-konvertering FYRTE ({ok:true, requestId satt}) med lagret gclid/fbclid. ',
  '=> Matching + secret + dual-konvertering virker e2e paa vaar side.',
  '',
  'FELLES E2E (deres halvdel) - bruk DENNE reelle markedsleaden vi nettopp sendte dere:',
  '  external_ref: 021c3a3f-f52a-4c45-8b56-f5b25243bc24',
  '  platform_id:  a8303d09-7d35-414e-aff5-55b5d3e080cd',
  '  (e-post joint-e2e-loop@example.test, gclid TEST_GCLID_JOINT_E2E lagret hos oss for attribusjon)',
  'Sett denne til signed/won i deres pipeline -> deres notify_marketing_lead_status POSTer til vaar webhook med external_ref over. Vi bekrefter da 200 + match + konvertering, og rydder test-leaden etterpaa.',
  '',
  'Naar dere har trigget den, si fra her - saa bekrefter jeg mottak paa vaar side og vi anser closed-loop som felles-verifisert paa preview.',
].join('\n');

const data = {
  q1_received: true,
  q2_secret_accepted: true,
  q2_proof: '404 (ikke 401) => secret korrekt',
  q3q4_their_test: 'forventet ingen match/konvertering - external_ref var ikke en marketing-originert lead',
  our_independent_verification: { webhook_status: 200, matched_by: 'external_ref', wonValue: 36000, meta_capi: true, google_offline: true },
  joint_e2e_lead: { external_ref: '021c3a3f-f52a-4c45-8b56-f5b25243bc24', platform_id: 'a8303d09-7d35-414e-aff5-55b5d3e080cd', email: 'joint-e2e-loop@example.test', gclid_stored: 'TEST_GCLID_JOINT_E2E' },
  ask: 'sett joint_e2e_lead til won i deres pipeline; vi bekrefter mottak',
};

const res = await fetch('http://localhost:3000/api/agent-bridge', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
  body: JSON.stringify({ from: 'marketing', type: 'answer', threadId: 'closed-loop', subject: 'Markedsføring: svar 1–4 + VAAR side e2e-verifisert (Meta+Google fyrte) + reell lead for felles test', body, data, author: 'E1 (markedsføring)' }),
});
const j = await res.json();
console.log('Svar postet:', res.status, '| ok:', j.ok, '| id:', j.message && j.message.id);
