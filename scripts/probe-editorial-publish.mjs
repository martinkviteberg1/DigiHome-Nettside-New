// Ende-til-ende: redaksjonell prisantydning + annonsetekst → publisert boligside.
// Gjør boligen KORT synlig, verifiserer HTML/SEO, og setter ALT tilbake.
// Kjør: node scripts/probe-editorial-publish.mjs
import fs from 'fs';

function loadEnv(f) {
  if (!fs.existsSync(f)) return;
  for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
    const l = raw.trim(); if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('='); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.split(' #')[0].trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv('/app/.env');

const BASE = 'http://localhost:3000';
const q = `key=${encodeURIComponent(process.env.ADMIN_KEY || '')}`;
let pass = 0, fail = 0;
const ok = (b, m) => { if (b) pass++; else fail++; console.log(`${b ? 'OK  ' : 'FEIL'} · ${m}`); };

const ID = '999db4b1-92db-4c8c-829a-147942782b4e'; // Baglergaten — 12 bilder, 40 m², mangler kun pris
const TEKST = 'Strøken 2-roms i Sandviken med balkong og høy standard.\n\nKort vei til sentrum, og bybanen ligger noen minutter unna. Boligen forvaltes av DigiHome.';

const put = (path, body) => fetch(`${BASE}${path}?${q}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

async function setVisible(v) {
  const r = await fetch(`${BASE}/api/admin/properties/visibility?${q}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ID, visible: v }),
  });
  return r.status;
}

try {
  // 1. Lagre redaksjonelle felt
  const r1 = await put('/api/admin/properties/fields', {
    id: ID, fields: { rentAmount: 22000, description: TEKST, title: 'Strøken 2-roms i Sandviken med balkong' },
  });
  ok(r1.status === 200 && r1.json?.contentReady === true, `lagret · contentReady=${r1.json?.contentReady} · band=${r1.json?.property?.monthlyRentBand}`);
  const slug = null;

  // 2. Gjør kort synlig
  const vs = await setVisible(true);
  ok(vs === 200, `boligen midlertidig synlig (${vs})`);

  const pub = await (await fetch(`${BASE}/api/public/listings`)).json();
  ok(pub.total === 1, `1 publisert bolig nå (${pub.total})`);
  const card = (pub.listings || pub.items || [])[0] || {};
  ok(card.rentIndicative === true, `kortet merker prisen som PRISANTYDNING (rentIndicative=${card.rentIndicative})`);
  ok(card.rentBand === '22 000–24 000 kr/mnd', `prisintervall: ${card.rentBand}`);
  ok(card.title === 'Strøken 2-roms i Sandviken med balkong', `tittel: ${card.title}`);
  ok(!('description' in card), 'annonsetekst ligger IKKE på listekortet (bare på detaljsiden)');

  // 3. Detaljsiden
  const url = `${BASE}/ledige-boliger/${card.slug}`;
  const html = await (await fetch(url)).text();
  ok(html.includes('Strøken 2-roms i Sandviken med balkong'), 'tittel i HTML');
  ok(html.includes('Kort vei til sentrum'), 'ANNONSETEKSTEN publiseres på boligsiden');
  ok(html.includes('data-testid="listing-description"'), 'annonseteksten rendres i eget felt');
  ok(/22 000/.test(html), 'prisintervall i HTML');
  ok(/Prisantydning|prisantydning/.test(html), 'prisen presenteres som prisantydning utad');
  const meta = /<meta name="description" content="([^"]*)"/.exec(html);
  ok(!!meta && /Strøken 2-roms i Sandviken med balkong/.test(meta[1]), `meta-beskrivelse bruker annonseteksten: «${meta ? meta[1].slice(0, 90) : '—'}»`);
  const ld = /"@type":"RealEstateListing"[\s\S]{0,900}?"description":"([^"]{0,120})/.exec(html);
  ok(!!ld, `schema.org description satt: «${ld ? ld[1].slice(0, 70) : '—'}»`);
  ok(!/Baglergaten 8/.test(html), 'PERSONVERN: husnummer lekker ikke ut i HTML');

  // 4. Sitemap
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  ok(sm.includes(`/ledige-boliger/${card.slug}`), 'boligen er med i sitemap når den er publisert');
} catch (e) {
  fail++; console.log('FEIL · unntak:', e.message);
} finally {
  console.log('\n— TILBAKESTILLING —');
  const hv = await setVisible(false);
  ok(hv === 200, `synlighet skrudd av igjen (${hv})`);
  const rr = await put('/api/admin/properties/fields', { id: ID, resetAll: true });
  const p = rr.json?.property || {};
  ok((p.editorialFields || []).length === 0, `alle overstyringer nullstilt (pris=${p.monthlyRentBand}, tekst=${p.description ?? 'null'})`);
  const end = await (await fetch(`${BASE}/api/public/listings`)).json();
  ok(end.total === 0, `0 publiserte boliger til slutt (${end.total})`);
  console.log(`\nRESULTAT: ${pass} OK · ${fail} feil`);
}
