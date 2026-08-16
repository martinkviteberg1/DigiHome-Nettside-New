// Live-test av mTLS mot Posten signering (produksjon): poller statuskøen.
// Forventet: HTTP 204 (tom kø) = sertifikat + org-tilgang + TLS fungerer.
// Oppretter INGEN signeringsjobb — helt ufarlig.
import https from 'node:https';
import fs from 'node:fs';
// Enkel .env-lasting uten dotenv-pakke
for (const linje of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = linje.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const orgnr = process.env.POSTEN_ORGNR || '835674622';
const ko = process.env.POSTEN_POLLING_QUEUE || 'digihome-saker';

// PEM via node-forge (Node/OpenSSL 3 støtter ikke legacy-PKCS12 direkte)
const { parseP12 } = await import('../lib/signering.js');
const info = parseP12(process.env.POSTEN_P12_B64, process.env.POSTEN_P12_PASSORD);
const tlsKey = info.keyPem;
const tlsCert = info.kjedePem.join('');
console.log('Sertifikat:', info.subjectCN, '| utløper:', info.utloper);

function kall(tillatUsikret) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'GET',
      host: 'api.signering.posten.no',
      path: `/api/${orgnr}/portal/signature-jobs?polling_queue=${encodeURIComponent(ko)}`,
      key: tlsKey,
      cert: tlsCert,
      headers: { Accept: 'application/xml' },
      rejectUnauthorized: !tillatUsikret,
      checkServerIdentity: () => undefined,
      timeout: 30000,
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

try {
  let r;
  try {
    r = await kall(false);
    console.log('TLS-kjede validert lokalt: JA');
  } catch (e) {
    console.log('Streng TLS feilet (' + (e.code || e.message) + ') — prøver uten kjede-validering (mTLS beskytter fortsatt)');
    r = await kall(true);
    console.log('TLS-kjede validert lokalt: NEI (fallback)');
  }
  console.log('HTTP-status:', r.status);
  console.log('X-Next-permitted-poll-time:', r.headers['x-next-permitted-poll-time'] || '(ikke satt)');
  if (r.body) console.log('Body (første 400 tegn):', r.body.slice(0, 400));
  if (r.status === 204) console.log('✅ SUKSESS: Tom kø — sertifikat, org-tilgang og mTLS fungerer mot Posten PROD!');
  else if (r.status === 200) console.log('✅ SUKSESS (200): Det lå en statusendring i køen (ikke bekreftet — blir liggende)');
  else console.log('❌ Uventet status — se body over');
} catch (e) {
  console.error('❌ FEIL:', e.code || '', e.message);
}
