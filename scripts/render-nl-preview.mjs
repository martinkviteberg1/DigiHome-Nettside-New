// Bygger et midlertidig «Ledige boliger»-utkast med ekte boligdata, rendrer
// e-post-HTML til /app/public/_nlpreview.html og sletter utkastet etterpå.
// Sender ALDRI e-post. Kjør: node scripts/render-nl-preview.mjs [grouping]
import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const KEY = 'dh_admin_b3Kx92Qz7Lm4';
const grouping = process.argv[2] || 'always';

const jf = async (u, init) => {
  const r = await fetch(u, init);
  return r.json();
};
const post = (p, body) => jf(`${BASE}${p}?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const put = (p, body) => jf(`${BASE}${p}?key=${KEY}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const props = (await jf(`${BASE}/api/admin/properties?key=${KEY}&limit=50`)).properties || [];
const usable = props.filter((p) => p.status === 'active' && (p.images || []).length);
console.log('brukbare boliger:', usable.length);

const created = await post('/api/admin/newsletter/draft', { template: 'boliger', title: 'QA designforhåndsvisning' });
const id = created.campaign?.id;
if (!id) { console.error('kunne ikke lage utkast', created); process.exit(1); }

try {
  const camp = (await jf(`${BASE}/api/admin/newsletter/campaign?id=${id}&key=${KEY}`)).campaign;
  console.log('mal-blokker:', (camp.blocks || []).map((b) => b.type).join(', '));

  // Fyll boligblokken med ekte boliger (samme felter som editoren lager)
  const items = usable.slice(0, 6).map((p) => ({
    pid: p.externalId || p.id, localId: p.id || '',
    title: p.listingTitle || p.title || 'Bolig',
    image: (p.images || [])[0] || '',
    band: p.monthlyRentBand || '', status: p.status,
    district: p.district || 'Andre områder',
  }));
  const blocks = (camp.blocks || []).map((b) => (b.type === 'properties'
    ? { ...b, items, grouping, groupingThreshold: 3, groupOrder: 'auto', title: b.title || 'Ledige boliger i Bergen', cta: 'Se alle ledige boliger', url: '/ledige-boliger' }
    : b.type === 'map'
      ? { ...b, url: 'https://www.finn.no/realestate/lettings/search.html?location=1.22.216&mapView=1' }
      : b));
  await put('/api/admin/newsletter/draft', { id, blocks });

  // GET → auto-oppfrisk fyller inn adresse/fakta/ledig fra plattformen
  const fresh = (await jf(`${BASE}/api/admin/newsletter/campaign?id=${id}&key=${KEY}`)).campaign;
  const pb = (fresh.blocks || []).find((b) => b.type === 'properties');
  console.log('boliger i blokken:', (pb?.items || []).length);
  (pb?.items || []).forEach((i) => console.log('  ·', i.title, '|', i.address, '|', i.facts, '|', i.available, '|', i.band, '|', i.district));

  const pv = await post('/api/admin/newsletter/preview', {
    blocks: fresh.blocks, theme: fresh.theme, subject: fresh.subject, preheader: fresh.preheader,
  });
  if (!pv.ok) { console.error('preview feilet', pv.error); process.exit(1); }
  fs.writeFileSync('/app/public/_nlpreview.html', pv.html);
  console.log('\nskrev /app/public/_nlpreview.html ·', pv.html.length, 'tegn');
} finally {
  await fetch(`${BASE}/api/admin/newsletter/campaign?id=${id}&key=${KEY}`, { method: 'DELETE' });
  const rest = (await jf(`${BASE}/api/admin/newsletter?key=${KEY}`)).campaigns || [];
  console.log('utkast slettet:', !rest.some((c) => c.id === id));
}
