// Verifiserer AUTO-OPPFRISK av boligblokken i nyhetsbrevet.
// Lager et midlertidig utkast, legger inn én ledig og én utleid bolig, sjekker
// at den utleide fjernes automatisk (og rapporteres), at en helt tom boligblokk
// gir en tydelig 409 FØR e-post sendes, og at synk-sikringen holder.
// Sender ALDRI e-post. Sletter utkastet til slutt.
// Kjør: node scripts/probe-nl-property-refresh.mjs
const BASE = 'http://localhost:3000';
const KEY = 'dh_admin_b3Kx92Qz7Lm4';
const q = `key=${encodeURIComponent(KEY)}`;

let ok = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FEIL ${name} ${extra}`); }
};
const j = async (u, init) => {
  const r = await fetch(u, init);
  const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch (e) { return { s: r.status, b: t }; }
};
const post = (p, body) => j(`${BASE}${p}?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const put = (p, body) => j(`${BASE}${p}?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// 1) Finn én publiserbar (ledig, med bilder) og én utleid bolig
const props = (await j(`${BASE}/api/admin/properties?${q}&limit=50`)).b.properties || [];
const pid = (p) => p.externalId || p.id;
const live = props.find((p) => p.status === 'active' && (p.images || []).length && p.sqm && p.bedrooms);
const rented = props.find((p) => p.status !== 'active' && (p.images || []).length);
console.log('ledig bolig :', live && `${live.area} (${pid(live)})`);
console.log('utleid bolig:', rented && `${rented.area} [${rented.status}] (${pid(rented)})`);
if (!live || !rented) { console.error('mangler testboliger'); process.exit(1); }

const item = (p) => ({
  pid: pid(p), localId: p.id || '', title: p.listingTitle || p.title || 'Bolig',
  image: (p.images || [])[0] || '', meta: [p.area, p.sqm ? `${p.sqm} m²` : null].filter(Boolean).join(' · '),
  band: p.monthlyRentBand || '', status: p.status || 'active', district: p.district || 'Andre områder',
});

// 2) Midlertidig utkast
const created = await post('/api/admin/newsletter/draft', { template: 'boliger', title: 'QA auto-oppfrisk' });
const id = created.b?.campaign?.id;
check('utkast opprettet', !!id, JSON.stringify(created.b).slice(0, 160));
if (!id) process.exit(1);

const cleanup = async () => {
  await j(`${BASE}/api/admin/newsletter/campaign?id=${encodeURIComponent(id)}&${q}`, { method: 'DELETE' });
  const after = (await j(`${BASE}/api/admin/newsletter?${q}`)).b.campaigns || [];
  check('utkast slettet etter test', !after.some((c) => c.id === id));
};

try {
  // 3) Blokker: én tekst + boligblokk med 1 ledig + 1 utleid
  const blocks = [
    { type: 'text', text: 'QA-tekst så brevet har innhold.' },
    { type: 'properties', title: 'Ledige boliger', cta: '', url: '', items: [item(live), item(rented)], grouping: 'off', groupingThreshold: 6, groupOrder: 'auto' },
  ];
  const saved = await put('/api/admin/newsletter/draft', { id, blocks });
  check('blokker lagret', saved.b.ok === true);

  // 4) GET kampanje → auto-oppfrisk skal fjerne den utleide og rapportere det
  const got = await j(`${BASE}/api/admin/newsletter/campaign?id=${encodeURIComponent(id)}&${q}`);
  const pb = (got.b.campaign?.blocks || []).find((b) => b.type === 'properties');
  const refresh = got.b.propertyRefresh;
  check('boligblokk beholdt', !!pb);
  check('utleid bolig fjernet automatisk', (pb?.items || []).length === 1, JSON.stringify(pb?.items?.map((x) => x.title)));
  check('ledig bolig beholdt', (pb?.items || [])[0]?.pid === pid(live));
  check('fjerning rapportert', (refresh?.removed || []).length === 1, JSON.stringify(refresh));
  check('rapporten sier hvilken bolig', (refresh?.removed || [])[0]?.pid === pid(rented));
  check('ingen tom blokk rapportert', (refresh?.emptied || []).length === 0);

  // 5) Endringen skal være lagret — andre GET gir ingen ny rapport
  const got2 = await j(`${BASE}/api/admin/newsletter/campaign?id=${encodeURIComponent(id)}&${q}`);
  check('endringen er lagret (ingen ny rapport)', got2.b.propertyRefresh === null || got2.b.propertyRefresh === undefined, JSON.stringify(got2.b.propertyRefresh));
  const pb2 = (got2.b.campaign?.blocks || []).find((b) => b.type === 'properties');
  check('fortsatt 1 bolig etter reload', (pb2?.items || []).length === 1);

  // 6) Test-utsending med KUN utleid bolig → 409 med tydelig beskjed, ingen e-post
  const onlyRented = [{ type: 'properties', title: 'Bare utleid', cta: '', url: '', items: [item(rented)], grouping: 'off', groupingThreshold: 6, groupOrder: 'auto' }];
  const t = await post('/api/admin/newsletter/test', {
    to: 'qa-skal-ikke-sendes@digihome.no', blocks: onlyRented, subject: 'QA', theme: 'lavendel', campaignId: id,
  });
  check('tom boligblokk stopper test (409)', t.s === 409, `status=${t.s} ${JSON.stringify(t.b).slice(0, 200)}`);
  check('feilmeldingen ber om nye boliger', /velg nye boliger/i.test(t.b?.error || ''), t.b?.error);
  check('ingen e-post sendt', !t.b?.sentTo, JSON.stringify(t.b?.sentTo || null));
  check('rapporterer hva som ble fjernet', (t.b?.removedProperties || []).length === 1);

  // 7) Synk-sikring: ukjente pid-er skal IKKE tømme blokken
  const ghost = [{ type: 'properties', title: 'Ukjente', cta: '', url: '', items: [{ ...item(live), pid: '00000000-0000-4000-8000-000000000001' }], grouping: 'off', groupingThreshold: 6, groupOrder: 'auto' }];
  const saved2 = await put('/api/admin/newsletter/draft', { id, blocks: [blocks[0], ...ghost] });
  check('spøkelsesblokk lagret', saved2.b.ok === true);
  const got3 = await j(`${BASE}/api/admin/newsletter/campaign?id=${encodeURIComponent(id)}&${q}`);
  const pb3 = (got3.b.campaign?.blocks || []).find((b) => b.type === 'properties');
  check('synk-sikring: blokken røres ikke når ingen bolig kan verifiseres', (pb3?.items || []).length === 1, JSON.stringify(pb3?.items));
  check('synk-sikring: ingen falsk rapport', !got3.b.propertyRefresh, JSON.stringify(got3.b.propertyRefresh));
} finally {
  await cleanup();
}

console.log(`\nResultat: ${ok} ok, ${fail} feil`);
process.exit(fail ? 1 : 0);
