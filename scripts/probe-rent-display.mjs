// ---------------------------------------------------------------------------
// PROBE: EKSAKT MÅNEDSLEIE UT PÅ ALLE FLATER
//
// Bakgrunn: prisen ble tidligere rundet ned i en 2 000-kroners bøtte
// («23 000» → «22 000–24 000 kr/mnd») og merket «PRISANTYDNING». Regelen var
// laget for kontraktsleie på en UTLEID bolig — men bare LEDIGE boliger
// publiseres, og de har verken leietaker eller kontrakt. Intervallet gjorde
// dermed bare annonsen dårligere. Nå publiseres den eksakte annonserte
// månedsleien.
//
// Hva dekkes:
//  1. Ren logikk: formatRent / exactRentAmount / publicRent / listingGate /
//     toListingCard / buildFacets.
//  2. Levende data: ingen bolig i admin- eller den offentlige feeden har et
//     prisintervall som publisert pris.
//  3. KPI-trygghet: en redaksjonell månedsleie rører ALDRI plattformens
//     rentAmount.
//  4. Publisert boligside: eksakt beløp + «Månedsleie», ingen «prisantydning»,
//     og JSON-LD med price som ett tall (ikke minPrice/maxPrice).
//  5. Nyhetsbrev: auto-oppfrisk setter eksakt beløp i boligkortet, og et
//     intervall en redaktør har skrevet blir erstattet.
//  6. Romutleie: helboligleien vises ALDRI som rompris.
//
// Sender aldri e-post. Rydder opp etter seg (synlighet av, overstyringer
// nullstilt, utkast slettet).
// Kjør: node scripts/probe-rent-display.mjs
// ---------------------------------------------------------------------------
import fs from 'fs';
import { formatRent, exactRentAmount, publicRent, listingGate, toListingCard, buildFacets, GATE } from '../lib/listings.js';

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

const j = async (u, init) => {
  const r = await fetch(u, init);
  const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch (e) { return { s: r.status, b: t }; }
};
const put = (p, body) => j(`${BASE}${p}?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const post = (p, body) => j(`${BASE}${p}?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Et prisintervall kjennetegnes av to tallgrupper i samme tekst.
const isRange = (s) => !!s && exactRentAmount(s) <= 0;

let testId = null;
let draftId = null;

try {
  // ══ 1. REN LOGIKK ════════════════════════════════════════════════════════
  console.log('\n— FORMATERING OG TOLKNING —');
  ok(formatRent(23000) === '23 000 kr/mnd', `formatRent(23000) = «${formatRent(23000)}»`);
  ok(formatRent(15600) === '15 600 kr/mnd', `formatRent(15600) = «${formatRent(15600)}»`);
  ok(formatRent(0) === null && formatRent(null) === null, 'formatRent(0/null) = null — ingen «0 kr/mnd»');
  ok(exactRentAmount('23 000 kr/mnd') === 23000, 'exactRentAmount leser eksakt beløp');
  ok(exactRentAmount('23\u00a0000 kr/mnd') === 23000, 'tåler hardt mellomrom (nb-NO-formatering)');
  ok(exactRentAmount('22 000–24 000 kr/mnd') === 0, 'intervall er IKKE et beløp');
  ok(exactRentAmount('14 000 – 16 000 kr') === 0, 'intervall med bindestrek og mellomrom fanges også');
  ok(exactRentAmount('') === 0 && exactRentAmount(null) === 0, 'tom verdi gir 0');

  const r1 = publicRent({ monthlyRentBand: '23 000 kr/mnd', rentBandSource: 'plattform-belop' });
  ok(r1.amount === 23000 && r1.text === '23 000 kr/mnd' && r1.rangeOnly === false && r1.missing === false,
    `publicRent(eksakt) = ${JSON.stringify(r1)}`);
  const r2 = publicRent({ monthlyRentBand: '22 000–24 000 kr/mnd', rentBandSource: 'plattform' });
  ok(r2.amount === null && r2.text === null && r2.rangeOnly === true, `publicRent(intervall) = ${JSON.stringify(r2)}`);
  const r3 = publicRent({});
  ok(r3.amount === null && r3.missing === true && r3.rangeOnly === false, 'publicRent(ingen pris) markerer missing');

  console.log('\n— PUBLISERINGSPORT —');
  const base = { images: ['a.jpg'], sqm: 40, area: 'Baglergaten', status: 'active', visible: true };
  ok(listingGate({ ...base, monthlyRentBand: '23 000 kr/mnd' }).publishable === true, 'eksakt månedsleie → publiserbar');
  const gRange = listingGate({ ...base, monthlyRentBand: '22 000–24 000 kr/mnd' });
  ok(gRange.publishable === false && gRange.blocking.includes('pris_uten_belop'), `bare intervall → sperret (${JSON.stringify(gRange.blocking)})`);
  ok(listingGate({ ...base }).blocking.includes('mangler_pris'), 'ingen pris → mangler_pris som før');
  ok(listingGate({ ...base, monthlyRentBand: '23 000 kr/mnd', rentBandSource: 'finn' }).blocking.includes('pris_fra_finn'), 'FINN-pris fortsatt sperret');
  ok(!!GATE.pris_uten_belop && /Rediger boligdata/.test(GATE.pris_uten_belop.fix), 'porten forteller HVOR intervallet fikses');

  console.log('\n— BOLIGKORT —');
  const cardExact = toListingCard({ id: 'x1', ...base, monthlyRentBand: '23 000 kr/mnd', rentBandSource: 'plattform-belop' });
  ok(cardExact.rentAmount === 23000, `kortet har tallet (${cardExact.rentAmount})`);
  ok(cardExact.rentText === '23 000 kr/mnd' && cardExact.rentBand === '23 000 kr/mnd', 'rentText og rentBand er samme eksakte tekst');
  ok(!('rentIndicative' in cardExact), 'prisantydning-flagget er fjernet fra kortet');
  const cardRange = toListingCard({ id: 'x2', ...base, monthlyRentBand: '22 000–24 000 kr/mnd' });
  ok(cardRange.rentAmount === null && cardRange.rentText === null, 'intervall gir INGEN pris på kortet — «Pris på forespørsel»');

  // Romutleie: plattformens beløp gjelder hele enheten og skal ikke bli rompris.
  const roomPlatform = toListingCard({ id: 'x3', ...base, rentalScope: 'rom', roomsVacant: 2, roomsTotal: 4, monthlyRentBand: '30 000 kr/mnd', rentBandSource: 'plattform-belop' });
  ok(roomPlatform.rentAmount === null, 'ROM: helboligleien vises ikke som rompris');
  const roomEditorial = toListingCard({ id: 'x4', ...base, rentalScope: 'rom', roomsVacant: 2, roomsTotal: 4, monthlyRentBand: '8 500 kr/mnd', rentBandSource: 'redaksjonell' });
  ok(roomEditorial.rentAmount === 8500 && roomEditorial.rentScopeNote === 'per rom', `ROM: redaksjonell rompris vises (${roomEditorial.rentText} ${roomEditorial.rentScopeNote})`);

  const facets = buildFacets([cardExact, roomEditorial, cardRange]);
  ok(facets.priceMin === 8500 && facets.priceMax === 23000, `prisfilteret bygges på beløp (${facets.priceMin}–${facets.priceMax})`);

  // ══ 2. LEVENDE DATA ══════════════════════════════════════════════════════
  console.log('\n— LEVENDE DATA —');
  const adm = await j(`${BASE}/api/admin/properties?${q}&limit=60`);
  const props = adm.b.properties || adm.b.items || [];
  ok(props.length > 0, `${props.length} boliger fra admin-API-et`);
  const ranges = props.filter((p) => isRange(p.monthlyRentBand));
  ok(ranges.length === 0, `ingen bolig har intervall som publisert pris (${ranges.map((p) => `${p.area}: ${p.monthlyRentBand}`).join(', ') || 'ingen'})`);
  const fromPlatform = props.filter((p) => ['plattform-belop', 'plattform-estimat'].includes(p.rentBandSource));
  ok(fromPlatform.length > 0, `${fromPlatform.length} boliger får eksakt månedsleie rett fra utleiemodulen`);
  ok(fromPlatform.every((p) => exactRentAmount(p.monthlyRentBand) === Number(p.rentAmount)),
    'publisert pris = utleiemodulens beløp, krone for krone');

  const pubFeed = await j(`${BASE}/api/public/properties?limit=24`);
  const feedRanges = (pubFeed.b.properties || []).filter((p) => isRange(p.rentBand || p.rentText || p.monthlyRentBand));
  ok(feedRanges.length === 0, `offentlig feed har ingen intervallpriser (${feedRanges.length})`);

  // ══ 3. ENDE-TIL-ENDE PUBLISERING ════════════════════════════════════════
  console.log('\n— REDAKSJONELL MÅNEDSLEIE → PUBLISERT SIDE —');
  // Velg en ledig bolig med bilder, areal og gate, men uten pris fra plattformen.
  const cand = props.find((p) => p.status === 'active' && (p.images || []).length && p.sqm && p.area && !p.monthlyRentBand)
    || props.find((p) => p.status === 'active' && (p.images || []).length && p.sqm && p.area);
  ok(!!cand, `testbolig: ${cand?.area} (${String(cand?.id).slice(0, 8)})`);
  if (!cand) throw new Error('fant ingen egnet testbolig');
  testId = cand.id;
  const platformRentBefore = cand.rentAmount ?? null;

  const saved = await put('/api/admin/properties/fields', { id: testId, fields: { rentAmount: 21500 } });
  const sp = saved.b?.property || {};
  ok(saved.s === 200 && sp.monthlyRentBand === '21 500 kr/mnd', `21500 → «${sp.monthlyRentBand}» (ikke intervall)`);
  ok(sp.rentBandSource === 'redaksjonell', `kilde merket redaksjonell (${sp.rentBandSource})`);
  ok((sp.rentAmount ?? null) === platformRentBefore, `KPI-TRYGGHET: plattformens rentAmount urørt (${platformRentBefore} → ${sp.rentAmount ?? null})`);
  ok(saved.b?.contentReady === true, `innhold komplett (contentReady=${saved.b?.contentReady})`);

  const vis = await put('/api/admin/properties/visibility', { id: testId, visible: true });
  ok(vis.s === 200, `boligen midlertidig synlig (${vis.s})`);

  const pubList = await j(`${BASE}/api/public/listings`);
  const card = (pubList.b.listings || pubList.b.items || []).find((c) => c.id === testId) || {};
  ok(card.rentAmount === 21500, `offentlig kort: rentAmount=${card.rentAmount}`);
  ok(card.rentText === '21 500 kr/mnd', `offentlig kort: rentText=«${card.rentText}»`);

  const html = await (await fetch(`${BASE}/ledige-boliger/${card.slug}`)).text();
  ok(/21 500|21\u00a0500/.test(html), 'eksakt månedsleie står i HTML');
  ok(/Månedsleie/.test(html), 'prisen er merket «Månedsleie»');
  ok(!/[Pp]risantydning/.test(html), 'ordet «prisantydning» finnes ikke på siden');
  ok(!/–\s*23 500|22 000–/.test(html), 'ingen prisintervall i HTML');
  ok(/"price":21500/.test(html), 'JSON-LD: price er ett tall');
  ok(!/minPrice|maxPrice/.test(html), 'JSON-LD: min/maks-intervall er borte');

  // ══ 4. NYHETSBREV ════════════════════════════════════════════════════════
  console.log('\n— NYHETSBREV —');
  const created = await post('/api/admin/newsletter/draft', { template: 'boliger', title: 'QA eksakt månedsleie' });
  draftId = created.b?.campaign?.id || null;
  ok(!!draftId, `utkast opprettet (${String(draftId).slice(0, 8)})`);
  if (draftId) {
    const pid = cand.externalId || cand.id;
    const blocks = [
      { type: 'text', text: 'QA-tekst så brevet har innhold.' },
      {
        type: 'properties',
        title: 'Ledige boliger',
        cta: '', url: '',
        // Redaktøren har (feilaktig) et intervall i utkastet — auto-oppfrisk
        // skal erstatte det med den eksakte månedsleien fra boligen.
        items: [{ pid, localId: cand.id, title: cand.listingTitle || cand.title || 'Bolig', image: (cand.images || [])[0] || '', band: '20 000–22 000 kr/mnd', status: 'active', district: cand.district || 'Andre områder' }],
        grouping: 'off', groupingThreshold: 6, groupOrder: 'auto',
      },
    ];
    const savedNl = await put('/api/admin/newsletter/draft', { id: draftId, blocks });
    ok(savedNl.b.ok === true, 'boligblokk lagret i utkastet');
    const got = await j(`${BASE}/api/admin/newsletter/campaign?id=${encodeURIComponent(draftId)}&${q}`);
    const pb = (got.b.campaign?.blocks || []).find((b) => b.type === 'properties');
    const item = (pb?.items || [])[0] || {};
    ok(item.band === '21 500 kr/mnd', `nyhetsbrevkortet viser eksakt månedsleie (${item.band})`);
    ok(!isRange(item.band), 'intervallet i utkastet er erstattet');
  }
} catch (e) {
  fail++; console.log('FEIL · uventet unntak:', e.message);
} finally {
  console.log('\n— OPPRYDDING —');
  if (draftId) {
    await j(`${BASE}/api/admin/newsletter/campaign?id=${encodeURIComponent(draftId)}&${q}`, { method: 'DELETE' });
    const after = (await j(`${BASE}/api/admin/newsletter?${q}`)).b.campaigns || [];
    ok(!after.some((c) => c.id === draftId), 'QA-utkast slettet');
  }
  if (testId) {
    const hv = await put('/api/admin/properties/visibility', { id: testId, visible: false });
    ok(hv.s === 200, `synlighet skrudd av igjen (${hv.s})`);
    const rr = await put('/api/admin/properties/fields', { id: testId, resetAll: true });
    ok((rr.b?.property?.editorialFields || []).length === 0, `overstyringer nullstilt (pris=${rr.b?.property?.monthlyRentBand})`);
  }
  const end = await j(`${BASE}/api/public/listings`);
  ok(end.b.total === 0, `0 publiserte boliger til slutt (${end.b.total})`);
  console.log(`\nRESULTAT: ${pass} OK · ${fail} feil`);
}
