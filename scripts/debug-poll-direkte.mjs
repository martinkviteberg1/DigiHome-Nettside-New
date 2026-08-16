// Debug: poll Postens direktekø med og uten polling_queue for å finne hvor
// statushendelsen etter ekte BankID-signering faktisk ligger. GET fjerner
// IKKE hendelsen fra køen (den fjernes først ved POST til confirmation-url).
import https from 'node:https';
import fs from 'node:fs';
for (const linje of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = linje.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const orgnr = process.env.POSTEN_ORGNR || '835674622';
const ko = process.env.POSTEN_POLLING_QUEUE || 'digihome-saker';
const { parseP12 } = await import('../lib/signering.js');
const info = parseP12(process.env.POSTEN_P12_B64, process.env.POSTEN_P12_PASSORD);

function kall(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'GET', host: 'api.signering.posten.no', path,
      key: info.keyPem, cert: info.kjedePem.join(''),
      headers: { Accept: 'application/xml' },
      rejectUnauthorized: false, checkServerIdentity: () => undefined, timeout: 30000,
    }, (res) => {
      const b = [];
      res.on('data', (d) => b.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(b).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

console.log('Nå:', new Date().toISOString());
for (const [navn, path] of [
  ['direct MED kø', `/api/${orgnr}/direct/signature-jobs?polling_queue=${encodeURIComponent(ko)}`],
  ['direct UTEN kø', `/api/${orgnr}/direct/signature-jobs`],
]) {
  try {
    const r = await kall(path);
    console.log(`\n== ${navn} → HTTP ${r.status}`);
    console.log('   next-poll:', r.headers['x-next-permitted-poll-time'] || '(ingen)');
    if (r.body) console.log('   body:', r.body.slice(0, 1200));
  } catch (e) { console.log(`\n== ${navn} → FEIL: ${e.message}`); }
}
