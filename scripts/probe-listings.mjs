// Verifiserer /ledige-boliger ende-til-ende UTEN å etterlate noe publisert.
// Setter én bolig synlig, sjekker sidene, og skjuler den igjen.
// Kjør: node scripts/probe-listings.mjs
const BASE = 'http://localhost:3000';
const KEY = 'dh_admin_b3Kx92Qz7Lm4';
const q = `key=${encodeURIComponent(KEY)}`;

const j = async (u, init) => { const r = await fetch(u, init); const t = await r.text(); try { return { s: r.status, b: JSON.parse(t) }; } catch (e) { return { s: r.status, b: t }; } };
const html = async (u) => { const r = await fetch(u); return { s: r.status, t: await r.text() }; };

const list = await j(`${BASE}/api/admin/properties?${q}`);
const props = list.b.properties || [];
const cand = props.find((p) => /wernersholm/i.test(p.area || ''));
if (!cand) { console.error('fant ikke testboligen'); process.exit(1); }
console.log('testbolig:', cand.area, '| id:', cand.id, '| synlig nå:', cand.visible);

const before = await j(`${BASE}/api/public/listings`);
console.log('publiserte før:', before.b.total);

// --- publiser midlertidig ---------------------------------------------------
const on = await j(`${BASE}/api/admin/properties/visibility?${q}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: cand.id, visible: true }),
});
console.log('sett synlig:', on.s, on.b.ok);

const pub = await j(`${BASE}/api/public/listings`);
console.log('publiserte etter:', pub.b.total, '| slug:', pub.b.listings?.[0]?.slug);
const slug = pub.b.listings?.[0]?.slug;

const idx = await html(`${BASE}/ledige-boliger`);
console.log('\nINDEKS →', idx.s, '| kort i HTML:', idx.t.includes(`/ledige-boliger/${slug}`), '| ItemList-schema:', idx.t.includes('"@type":"ItemList"') || idx.t.includes('ItemList'));

const det = await html(`${BASE}/ledige-boliger/${slug}`);
console.log('DETALJ →', det.s, '| bytes', det.t.length);
console.log('  RealEstateListing-schema:', det.t.includes('RealEstateListing'));
console.log('  UnitPriceSpecification:', det.t.includes('UnitPriceSpecification'));
console.log('  canonical:', (/<link rel="canonical" href="([^"]+)"/.exec(det.t) || [])[1] || 'MANGLER');
console.log('  title:', (/<title>(.*?)<\/title>/.exec(det.t) || [])[1]);
console.log('  interesseskjema:', det.t.includes('listing-interest-form'));
console.log('  FINN-lenke:', det.t.includes('listing-finn-link'), '| plattform-lenke:', det.t.includes('listing-platform-link'));

// --- PERSONVERN: ingenting av dette skal finnes i HTML ----------------------
const leaks = [];
const banned = {
  husnummer: /Wernersholmvegen\s*\d/i,
  eier: cand.ownerName ? new RegExp(cand.ownerName.split(' ')[0], 'i') : null,
  leietaker: cand.tenantName ? new RegExp(cand.tenantName.split(' ')[0], 'i') : null,
  fullAdresse: cand.fullAddress ? new RegExp(cand.fullAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null,
  eksaktLeie: cand.rentAmount ? new RegExp(`\\b${String(cand.rentAmount).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\u00a0]?')}\\b`) : null,
};
for (const [k, re] of Object.entries(banned)) if (re && re.test(det.t)) leaks.push(k);
console.log('  PERSONVERN:', leaks.length ? `LEKKASJE: ${leaks.join(', ')}` : 'OK — ingen husnummer/eier/leietaker/eksakt leie');

// --- ukjent slug skal gi 404 -----------------------------------------------
const ghost = await html(`${BASE}/ledige-boliger/leilighet-oslo-deadbeef`);
console.log('\nukjent slug →', ghost.s, '(forventet 404)');

// --- skjul igjen ------------------------------------------------------------
const off = await j(`${BASE}/api/admin/properties/visibility?${q}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: cand.id, visible: false }),
});
const after = await j(`${BASE}/api/public/listings`);
console.log('\nskjult igjen:', off.s, off.b.ok, '| publiserte nå:', after.b.total, after.b.total === 0 ? '(OPPRYDDET)' : '(!! FORTSATT PUBLISERT)');
