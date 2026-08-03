// Sanity-probe over HTTP: hvilken tittel og leiekilde havner boligkortene på?
// Kjør: node scripts/probe-listing-title.mjs
const BASE = 'http://localhost:3000';
const KEY = 'dh_admin_b3Kx92Qz7Lm4';
const q = `key=${encodeURIComponent(KEY)}`;

const j = async (url, init) => {
  const r = await fetch(url, init);
  const text = await r.text();
  try { return { status: r.status, body: JSON.parse(text) }; } catch (e) { return { status: r.status, body: text.slice(0, 400) }; }
};

const list = await j(`${BASE}/api/admin/properties?${q}`);
if (!list.body?.ok) { console.error('FEIL', list.status, list.body); process.exit(1); }
const props = list.body.properties;
console.log('boliger:', props.length);
const bySource = props.reduce((a, p) => { a[p.listingTitleSource || 'ukjent'] = (a[p.listingTitleSource || 'ukjent'] || 0) + 1; return a; }, {});
console.log('tittelkilde:', bySource);
console.log('finnUrl:', props.filter((p) => p.finnUrl).length, '| finnTitle:', props.filter((p) => p.finnTitle).length, '| snapshot:', props.filter((p) => p.finnSnapshotAt).length);
console.log('rentBandSource:', props.reduce((a, p) => { a[p.rentBandSource || 'ingen'] = (a[p.rentBandSource || 'ingen'] || 0) + 1; return a; }, {}));
console.table(props.slice(0, 24).map((p) => ({
  gate: (p.area || '—').slice(0, 22),
  plattform: (p.title || '').slice(0, 30),
  brukt: (p.listingTitle || '').slice(0, 40),
  kilde: p.listingTitleSource,
  band: (p.monthlyRentBand || '—').slice(0, 16),
  bandKilde: p.rentBandSource || '—',
  finnLeie: p.finnRentAmount || '—',
  finn: p.finnUrl ? 'ja' : '—',
})));

// --- Redaksjonell tittel: sett, verifiser, nullstill --------------------------
const target = props[0];
const setRes = await j(`${BASE}/api/admin/properties/title?${q}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: target.id, title: '  Lys 3-roms med  utsikt over Puddefjorden ' }),
});
console.log('\nPUT title:', setRes.status, setRes.body?.ok, '→', setRes.body?.property?.listingTitle, '| kilde:', setRes.body?.property?.listingTitleSource, '| kandidater:', (setRes.body?.candidates || []).map((c) => c.source).join('/'));
const clearRes = await j(`${BASE}/api/admin/properties/title?${q}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: target.id, title: '' }),
});
console.log('CLEAR title:', clearRes.status, clearRes.body?.ok, 'cleared:', clearRes.body?.cleared, '→', clearRes.body?.property?.listingTitle, '| kilde:', clearRes.body?.property?.listingTitleSource);

// --- Uautorisert skal gi 401 -------------------------------------------------
const noAuth = await j(`${BASE}/api/admin/properties/finn-snapshot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
console.log('\nfinn-snapshot uten nøkkel:', noAuth.status, '(forventet 401)');

// --- FINN-snapshot for én bolig med lenke -----------------------------------
const withFinn = props.find((p) => p.finnUrl);
if (!withFinn) { console.log('ingen bolig med finnUrl — hopper over snapshot-test'); process.exit(0); }
console.log('\nhenter snapshot for', withFinn.area, withFinn.finnUrl);
const snap = await j(`${BASE}/api/admin/properties/finn-snapshot?${q}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: withFinn.id }),
});
console.log('snapshot:', snap.status, JSON.stringify(snap.body?.results || snap.body, null, 1).slice(0, 900));
console.log('etter snapshot → listingTitle:', snap.body?.property?.listingTitle, '| kilde:', snap.body?.property?.listingTitleSource, '| finnLeie:', snap.body?.property?.finnRentAmount, '| plattformleie:', snap.body?.property?.rentAmount);
