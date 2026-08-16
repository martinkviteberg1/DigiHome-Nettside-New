// E2E-røyk-test: oppretter en QA-sak + test-PDF og sender et EKTE
// signeringsoppdrag til Posten (signatar: martin@kviteberg.no).
// Beviser at Posten aksepterer vår signerte ASiC-E/XAdES-dokumentpakke.
const BASE = 'http://localhost:3000/api/admin';
const KEY = 'dh_admin_b3Kx92Qz7Lm4';

// Minimal, gyldig PDF med tekst
const pdfInnhold = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 120>>stream
BT /F1 18 Tf 60 770 Td (DigiHome - test av BankID-signering) Tj ET
BT /F1 12 Tf 60 740 Td (Dette dokumentet kan trygt signeres.) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;

const api = async (sti, opts = {}) => {
  const r = await fetch(`${BASE}/${sti}${sti.includes('?') ? '&' : '?'}key=${KEY}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
};

// 1) QA-sak
const sak = await api('tasks', { method: 'POST', body: JSON.stringify({ title: 'BankID-signering — testdokument', description: 'QA-sak for første ekte signeringstest. Kan slettes etterpå.' }) });
const taskId = sak.j.task?.id || sak.j.id;
console.log('1) Sak opprettet:', sak.status, taskId);

// 2) Last opp PDF (chunk)
const b64 = Buffer.from(pdfInnhold).toString('base64');
const opp = await api('task-files/chunk', {
  method: 'POST',
  body: JSON.stringify({ uploadId: `qa-sign-${Date.now()}`, taskId, index: 0, total: 1, data: b64, name: 'Testdokument for signering.pdf', type: 'application/pdf', actor: 'E1' }),
});
const filId = opp.j.attachment?.id || opp.j.filId || opp.j.id;
console.log('2) PDF lastet opp:', opp.status, JSON.stringify(opp.j).slice(0, 200));

// 3) Send til Posten signering
const sign = await api(`task-files/${filId}/signering`, {
  method: 'POST',
  body: JSON.stringify({
    tittel: 'DigiHome — test av BankID-signering',
    melding: 'Første test av elektronisk signering. Signer med BankID.',
    dagerFrist: 7,
    actor: 'E1 (systemtest)',
    signatarer: [{ navn: 'Martin Kviteberg', epost: 'martin@kviteberg.no' }],
  }),
});
console.log('3) Signeringsoppdrag:', sign.status, JSON.stringify(sign.j).slice(0, 600));
if (sign.j.ok) {
  console.log('✅ POSTEN AKSEPTERTE DOKUMENTPAKKEN! Jobb-id:', sign.j.jobb.id, '| Posten-id:', sign.j.jobb.postenJobId);
  console.log('TaskId for opprydding/oppfølging:', taskId, '| FilId:', filId);
} else {
  console.log('❌ Avvist — se feilmelding over. TaskId:', taskId);
}
