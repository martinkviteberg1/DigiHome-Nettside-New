// QA: isolert test av signeringsstatus-mapping (finnSignatarForAttr +
// behandleDirectStatus) uten nettverk/BankID. Kjøres: node _qa_signering_test.mjs
import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';

copyFileSync('./lib/signering.js', './_qa_signering_copy.mjs');
const S = await import('./_qa_signering_copy.mjs');

let feil = 0;
const sjekk = (navn, ok) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${navn}`); if (!ok) feil += 1; };

// ── 1) finnSignatarForAttr ───────────────────────────────────────────────────
const signatarer = [
  { sid: 'aaaa1111-0000-4000-8000-000000000001', postenId: 'Martin & Co · aaaa11', navn: 'Martin' },
  { sid: 'bbbb2222-0000-4000-8000-000000000002', postenId: 'Erik Nordmann · bbbb22', navn: 'Erik' },
];
sjekk('eksakt match på postenId', S.finnSignatarForAttr(signatarer, 'Erik Nordmann · bbbb22') === signatarer[1]);
sjekk('eksakt match på sid', S.finnSignatarForAttr(signatarer, 'bbbb2222-0000-4000-8000-000000000002') === signatarer[1]);
sjekk('XML-escapet & (&amp;)', S.finnSignatarForAttr(signatarer, 'Martin &amp; Co · aaaa11') === signatarer[0]);
sjekk('numerisk tegnreferanse for ·', S.finnSignatarForAttr(signatarer, 'Martin &amp; Co &#183; aaaa11') === signatarer[0]);
sjekk('suffiks-fallback ved navne-normalisering', S.finnSignatarForAttr(signatarer, 'ERIK NORDMANN · bbbb22') === signatarer[1]);
sjekk('ukjent attr gir null', S.finnSignatarForAttr(signatarer, 'Noen Andre · cccc33') === null);
sjekk('tomt attr gir null', S.finnSignatarForAttr(signatarer, '') === null);

// ── 2) behandleDirectStatus med falsk db ─────────────────────────────────────
function lagFakeDb(jobb) {
  const oppdateringer = [];
  return {
    oppdateringer,
    collection: (navn) => ({
      findOne: async () => (navn === 'signering_jobber' ? jobb : null),
      updateOne: async (q, u) => { oppdateringer.push({ navn, q, u }); return { modifiedCount: 1 }; },
      insertOne: async () => ({}),
      countDocuments: async () => 0,
      find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }), toArray: async () => [] }),
    }),
  };
}
const basisJobb = () => ({
  id: 'j1', postenJobId: 'pj1', flyt: 'direkte', status: 'I_GANG', taskId: 'DOKUMENTER', filId: 'f1', tittel: 'Testdok',
  signatarer: [
    { sid: 'aaaa1111-0000-4000-8000-000000000001', postenId: 'Martin Kviteberg · aaaa11', navn: 'Martin', epost: 'qa1@example.com', status: 'VENTER', epostSendtAt: '2026-01-01T00:00:00Z' },
    { sid: 'bbbb2222-0000-4000-8000-000000000002', postenId: 'Erik Nordmann · bbbb22', navn: 'Erik', epost: 'qa2@example.com', status: 'VENTER', epostSendtAt: '2026-01-01T00:00:00Z' },
  ],
});
const xmlHode = '<?xml version="1.0"?><direct-signature-job-status-response xmlns="http://signering.posten.no/schema/v1">'
  + '<signature-job-id>pj1</signature-job-id>';

// 2a: én signerer (escapet attr) → riktig signatar oppdateres, jobb fortsatt I_GANG
{
  const jobb = basisJobb();
  const db = lagFakeDb(jobb);
  const xml = `${xmlHode}<signature-job-status>IN_PROGRESS</signature-job-status>`
    + '<status signer="Martin Kviteberg &#183; aaaa11" since="2026-02-01T10:00:00Z">SIGNED</status>'
    + '<status signer="Erik Nordmann · bbbb22">WAITING</status>'
    + '</direct-signature-job-status-response>';
  await S.behandleDirectStatus(db, {}, xml);
  const lagret = db.oppdateringer.find((o) => o.navn === 'signering_jobber' && o.u.$set && o.u.$set.signatarer);
  const s1 = lagret && lagret.u.$set.signatarer.find((s) => s.sid.startsWith('aaaa1111'));
  const s2 = lagret && lagret.u.$set.signatarer.find((s) => s.sid.startsWith('bbbb2222'));
  sjekk('2a: Martin → SIGNERT (numerisk ref-attr)', !!s1 && s1.status === 'SIGNERT' && s1.signertAt === '2026-02-01T10:00:00Z');
  sjekk('2a: Erik forblir VENTER', !!s2 && s2.status === 'VENTER');
  sjekk('2a: jobbstatus I_GANG', !!lagret && lagret.u.$set.status === 'I_GANG');
}

// 2b: monotont vern per signatar — SIGNERT nedgraderes ikke av forsinket WAITING
{
  const jobb = basisJobb();
  jobb.signatarer[0].status = 'SIGNERT';
  jobb.signatarer[0].signertAt = '2026-02-01T09:00:00Z';
  const db = lagFakeDb(jobb);
  const xml = `${xmlHode}<signature-job-status>IN_PROGRESS</signature-job-status>`
    + '<status signer="Martin Kviteberg · aaaa11">WAITING</status>'
    + '<status signer="Erik Nordmann · bbbb22">WAITING</status>'
    + '</direct-signature-job-status-response>';
  await S.behandleDirectStatus(db, {}, xml);
  const lagret = db.oppdateringer.find((o) => o.navn === 'signering_jobber' && o.u.$set && o.u.$set.signatarer);
  const s1 = lagret && lagret.u.$set.signatarer.find((s) => s.sid.startsWith('aaaa1111'));
  sjekk('2b: SIGNERT nedgraderes ikke til VENTER', !!s1 && s1.status === 'SIGNERT' && s1.signertAt === '2026-02-01T09:00:00Z');
}

// 2c: monotont vern på jobbnivå — FULLFORT rulles ikke tilbake av I_GANG-svar
{
  const jobb = basisJobb();
  jobb.status = 'FULLFORT';
  const db = lagFakeDb(jobb);
  const xml = `${xmlHode}<signature-job-status>IN_PROGRESS</signature-job-status>`
    + '<status signer="Martin Kviteberg · aaaa11">WAITING</status>'
    + '</direct-signature-job-status-response>';
  await S.behandleDirectStatus(db, {}, xml);
  const lagret = db.oppdateringer.find((o) => o.navn === 'signering_jobber' && o.u.$set && o.u.$set.status);
  sjekk('2c: ingen statusskriving ved utdatert I_GANG-svar', !lagret);
}

// 2d: umappbar status → kast (bekreftes ikke — forblir i kø)
{
  const jobb = basisJobb();
  const db = lagFakeDb(jobb);
  const xml = `${xmlHode}<signature-job-status>IN_PROGRESS</signature-job-status>`
    + '<status signer="Helt Ukjent Person · zzzz99">SIGNED</status>'
    + '</direct-signature-job-status-response>';
  let kastet = false;
  try { await S.behandleDirectStatus(db, {}, xml); } catch (e) { kastet = true; }
  sjekk('2d: umappbar status kaster (ingen bekreftelse)', kastet);
}

// 2e: ukjent jobb → stille retur uten skriving
{
  const db = lagFakeDb(null);
  const xml = `${xmlHode}<signature-job-status>IN_PROGRESS</signature-job-status>`
    + '<status signer="X">SIGNED</status></direct-signature-job-status-response>';
  await S.behandleDirectStatus(db, {}, xml);
  sjekk('2e: ukjent jobb → ingen skriving', db.oppdateringer.length === 0);
}

execSync('rm -f ./_qa_signering_copy.mjs');
console.log(feil === 0 ? '\nALLE TESTER BESTÅTT' : `\n${feil} TEST(ER) FEILET`);
process.exit(feil === 0 ? 0 : 1);
