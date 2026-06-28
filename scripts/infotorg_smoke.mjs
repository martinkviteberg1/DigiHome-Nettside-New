// Røyk-test av /api/infotorg/* mot dev-serveren (node fetch).
const BASE = 'http://localhost:3000/api';

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  let json; try { json = JSON.parse(txt); } catch { json = txt.slice(0, 300); }
  return { status: r.status, json };
}

(async () => {
  console.log('=== SAMEIE: Olaf Ryes vei 11C, 5007 Bergen ===');
  let r = await post('/infotorg/lookup', { address: 'Olaf Ryes vei 11C, 5007 Bergen' });
  console.log('lookup status', r.status, '| building_type', r.json.building_type,
    '| seksjonert', r.json.edr?.seksjonert, '| #seksjoner', (r.json.edr?.seksjoner || []).length,
    '| source', r.json.source);

  if (r.json.matrikkel) {
    const m = r.json.matrikkel;
    const snrs = (r.json.edr?.seksjoner || []).filter(s => s.formaal_kode === 'B').slice(0, 5).map(s => s.snr);
    console.log('  first bolig-snrs:', snrs);
    const so = await post('/infotorg/section-owners', { kommunenr: m.kommunenr, gaardsnr: m.gaardsnr, bruksnr: m.bruksnr, seksjonsnr_list: snrs });
    console.log('  section-owners status', so.status, '| owners:', JSON.stringify(so.json.owners));
    const ow = await post('/infotorg/owner', { kommunenr: m.kommunenr, gaardsnr: m.gaardsnr, bruksnr: m.bruksnr, seksjonsnr: '18' });
    console.log('  owner(snr18) status', ow.status, '|', JSON.stringify(ow.json.owner));
  }

  console.log('\n=== Cache-hit (samme adresse igjen) ===');
  r = await post('/infotorg/lookup', { address: 'Olaf Ryes vei 11C, 5007 Bergen' });
  console.log('lookup source (forventet cache):', r.json.source);

  console.log('\n=== BORETTSLAG: Deichmans gate 2A, 0178 Oslo ===');
  r = await post('/infotorg/lookup', { address: 'Deichmans gate 2A, 0178 Oslo' });
  console.log('lookup status', r.status, '| building_type', r.json.building_type,
    '| borettslag.orgnr', r.json.borettslag?.orgnr, '| #andeler', (r.json.borettslag?.andeler || []).length);
  if (r.json.borettslag?.andeler?.length) {
    const ans = r.json.borettslag.andeler.slice(0, 4).map(a => a.andelsnr);
    const ao = await post('/infotorg/andel-owners', { orgnr: r.json.borettslag.orgnr, andelsnr_list: ans });
    console.log('  andel-owners:', JSON.stringify(ao.json.owners));
  }

  console.log('\n=== ENEBOLIG-fallback: ukjent/feil adresse ===');
  r = await post('/infotorg/lookup', { address: 'Tulleveien 99999, 9999 Ingenstad' });
  console.log('status', r.status, '| body', JSON.stringify(r.json).slice(0, 120));
})().catch(e => { console.error('ERR', e); process.exit(1); });
