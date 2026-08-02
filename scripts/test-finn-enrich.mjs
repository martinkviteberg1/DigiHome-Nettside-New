// Ende-til-ende-test av FINN-berikelsen. Kjører mot preview og RYDDER OPP ETTER SEG.
// Kjør: node scripts/test-finn-enrich.mjs
const BASE = 'http://localhost:3000/api';
const FINN = 'https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860'; // Sandslimarka 269

const login = async () => {
  const r = await fetch(`${BASE}/admin/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'martin@kviteberg.no', password: 'Pyramiden2025##' }),
  });
  const j = await r.json();
  return j.token;
};
const key = await login();
const q = `key=${encodeURIComponent(key)}`;

const getProps = async () => {
  const r = await fetch(`${BASE}/admin/properties?${q}`);
  return r.json();
};
const setFinn = async (id, url) => {
  const r = await fetch(`${BASE}/admin/properties/finn?${q}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, url }),
  });
  return { status: r.status, body: await r.json() };
};
const sendable = (list) => list.filter((p) => p.status === 'active' && !p.incomplete && !p.duplicate && (p.images || []).length).length;

let d = await getProps();
console.log(`START: ${d.total} boliger · uten bilder: ${d.properties.filter((p) => !(p.images || []).length).length} · kan sendes: ${sendable(d.properties)} · duplikater: ${d.duplicateCount} · mangler data: ${d.incompleteCount}`);

const sandsli = d.properties.find((p) => /sandslimarka/i.test(p.area || ''));
const werner = d.properties.find((p) => /wernersholm/i.test(p.area || ''));
console.log(`\nSandslimarka: ${sandsli?.id?.slice(0, 8)} · ${(sandsli?.images || []).length} bilder · ${sandsli?.sqm} m² · bydel ${sandsli?.district}`);
console.log(`Wernersholmvegen: ${werner?.id?.slice(0, 8)} · ${(werner?.images || []).length} bilder · ${werner?.sqm} m² · bydel ${werner?.district} · pris ${werner?.monthlyRentBand}`);

// ── TEST 1: plattformdata skal ALLTID vinne over FINN ────────────────────────
console.log('\n=== TEST 1: Sandslimarka (har 12 plattformbilder) — FINN skal IKKE overskrive ===');
let r1 = await setFinn(sandsli.id, FINN);
console.log(`HTTP ${r1.status} ok=${r1.body.ok}`);
if (r1.body.ok) {
  const p = r1.body.property;
  console.log(`  importert fra FINN: ${r1.body.imported.images} bilder, ${r1.body.imported.sqm} m², postnr ${r1.body.imported.postalCode}, bydel ${r1.body.imported.district}`);
  console.log(`  bolig etter berikelse: ${(p.images || []).length} bilder · imageSource=${p.imageSource || 'plattform'} · sqm=${p.sqm} · fylte felt: [${(p.enrichedFields || []).join(', ')}]`);
  console.log(`  finnUrl satt: ${p.finnUrl === FINN ? 'JA' : 'NEI'} · finnCode=${p.finnCode} · finnStatus=${p.finnStatus}`);
  console.log(`  ✔ FORVENTET: bilder IKKE erstattet (${(p.images || []).length} = plattformens), sqm uendret (${p.sqm})`);
}

// ── TEST 2: bolig UTEN bilder skal bli sendbar ───────────────────────────────
console.log('\n=== TEST 2: Wernersholmvegen (0 bilder) — FINN skal fylle hullet ===');
let r2 = await setFinn(werner.id, FINN);
console.log(`HTTP ${r2.status} ok=${r2.body.ok}`);
if (r2.body.ok) {
  const p = r2.body.property;
  console.log(`  bolig etter berikelse: ${(p.images || []).length} bilder · imageSource=${p.imageSource} · sqm=${p.sqm} (plattform 52 skal vinne) · pris ${p.monthlyRentBand}`);
  console.log(`  fylte felt: [${(p.enrichedFields || []).join(', ')}] · incomplete=${p.incomplete} · missingFields=[${(p.missingFields || []).join(', ')}]`);
  console.log(`  første bilde: ${(p.images || [])[0]}`);
}
d = await getProps();
console.log(`  ETTER: uten bilder: ${d.properties.filter((p) => !(p.images || []).length).length} · kan sendes: ${sendable(d.properties)} (skal ha økt med 1)`);

// ── TEST 3: nyhetsbrevets kvalitetsport skal slippe den gjennom ──────────────
console.log('\n=== TEST 3: nyhetsbrev-porten (POST /admin/newsletter/preview) ===');
const w = d.properties.find((p) => p.id === werner.id);
const item = { pid: w.externalId || w.id, title: w.title, image: (w.images || [])[0] || '', meta: `${w.area} · ${w.sqm} m²`, band: w.monthlyRentBand || '', status: w.status, district: w.district || '', url: '' };
const pv = await fetch(`${BASE}/admin/newsletter/preview?${q}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subject: 'Test', preheader: '', blocks: [{ type: 'properties', title: 'Test', grouping: 'off', items: [item] }] }),
});
const pj = await pv.json();
console.log(`HTTP ${pv.status} · unavailableProperties: ${JSON.stringify(pj.unavailableProperties || [])}`);
console.log(`  boligen med i HTML: ${String(pj.html || '').includes('images.finncdn.no') ? 'JA (FINN-bilde rendret)' : 'NEI'}`);

// ── TEST 4: ugyldige input ──────────────────────────────────────────────────
console.log('\n=== TEST 4: validering ===');
const bad1 = await setFinn(werner.id, 'https://www.vg.no');
console.log(`  ikke-FINN-lenke → HTTP ${bad1.status} · ${bad1.body.error}`);
const bad2 = await setFinn('finnes-ikke-123', FINN);
console.log(`  ukjent bolig-id → HTTP ${bad2.status} · ${bad2.body.error}`);
const bad3 = await setFinn(werner.id, 'https://www.finn.no/realestate/lettings/ad.html?finnkode=1');
console.log(`  utgått annonse → ok=${bad3.body.ok} · finnStatus=${bad3.body.finnStatus} · ${bad3.body.error}`);

// ── OPPRYDDING ──────────────────────────────────────────────────────────────
console.log('\n=== OPPRYDDING: fjerner testkoblingene ===');
for (const p of [sandsli, werner]) {
  const c = await setFinn(p.id, '');
  console.log(`  ${p.area}: ok=${c.body.ok} removed=${c.body.removed}`);
}
d = await getProps();
console.log(`SLUTT: ${d.total} boliger · uten bilder: ${d.properties.filter((x) => !(x.images || []).length).length} · kan sendes: ${sendable(d.properties)} · med FINN-lenke: ${d.properties.filter((x) => x.finnUrl).length} (skal være 0)`);
