// Røyktest for redaksjonelle overstyringer på bolig.
// Tester (1) ren portlogikk, (2) hele API-kjeden, og RYDDER OPP etter seg.
// Kjør: node scripts/probe-property-editorial.mjs
import fs from 'fs';
import { listingGate, GATE } from '../lib/listings.js';

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
const KEY = process.env.ADMIN_KEY || '';
const q = `key=${encodeURIComponent(KEY)}`;
let pass = 0, fail = 0;
const ok = (b, m) => { if (b) pass++; else fail++; console.log(`${b ? 'OK  ' : 'FEIL'} · ${m}`); };

const BAGLER = '999db4b1';   // 12 bilder, 40 m², 1 sov, FINN-lenke — mangler KUN pris
const OVRE = 'ba187cd6';     // mangler alt — for nullstillingstest
const touched = new Set();

async function put(body) {
  const r = await fetch(`${BASE}/api/admin/properties/fields?${q}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}
async function findId(prefix) {
  const d = await (await fetch(`${BASE}/api/admin/properties?${q}&limit=50`)).json();
  const ps = d.properties || d.items || [];
  const hit = ps.find((p) => String(p.id).startsWith(prefix));
  return hit ? hit.id : null;
}

try {
  // ══ DEL 1: REN PORTLOGIKK ════════════════════════════════════════════════
  console.log('\n— PORTLOGIKK —');
  const base = { images: ['a.jpg'], monthlyRentBand: '17 000 kr/mnd', sqm: 40, area: 'Baglergaten', status: 'active', visible: true };
  ok(listingGate(base).publishable === true, 'komplett bolig er publiserbar');
  ok(listingGate({ ...base, monthlyRentBand: '16 000–18 000 kr/mnd' }).blocking.includes('pris_uten_belop'), 'BARE prisintervall er ikke en pris — sperres');
  ok(listingGate({ ...base, rentBandSource: 'finn' }).blocking.includes('pris_fra_finn'), 'pris fra FINN er fortsatt sperret');
  ok(listingGate({ ...base, rentBandSource: 'redaksjonell' }).publishable === true, 'REDAKSJONELL pris slipper gjennom porten');
  ok(listingGate({ ...base, imageSource: 'finn' }).blocking.includes('bilderettigheter'), 'FINN-bilder sperres som før');
  ok(listingGate({ ...base, imageSource: 'finn', imageRights: true }).publishable === true, 'FINN-bilder slipper gjennom NÅR rettigheter er bekreftet');
  ok(listingGate({ ...base, imageSource: 'finn', imageRights: 'ja' }).blocking.includes('bilderettigheter'), 'bare ekte true teller som bekreftelse');
  ok(/Rediger boligdata/.test(GATE.mangler_pris.fix), 'instruksjonstekst peker på den nye muligheten');

  // ══ DEL 2: API ═══════════════════════════════════════════════════════════
  console.log('\n— API —');
  const bag = await findId(BAGLER);
  const ovre = await findId(OVRE);
  ok(!!bag && !!ovre, `fant testboliger: ${bag?.slice(0, 8)} og ${ovre?.slice(0, 8)}`);

  ok((await put({})).status === 400, 'uten id → 400');
  const noauth = await fetch(`${BASE}/api/admin/properties/fields`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bag }) });
  ok(noauth.status === 401, `uten adminnøkkel → 401 (${noauth.status})`);
  ok((await put({ id: 'finnes-ikke', fields: { sqm: 40 } })).status === 404, 'ukjent id → 404');

  // Validering
  for (const [f, v, lbl] of [['rentAmount', 500, 'pris under 1000'], ['rentAmount', 999999, 'pris over 200000'],
    ['sqm', 2, 'areal under 5'], ['bedrooms', 99, 'soverom over 20'],
    ['type', 'slott', 'ukjent boligtype'], ['model', 'evig', 'ukjent utleieform'],
    ['district', 'Oslo sentrum', 'bydel utenfor Bergen']]) {
    const r = await put({ id: bag, fields: { [f]: v } });
    ok(r.status === 400 && /Ugyldig verdi/.test(r.json?.error || ''), `${lbl} avvises (${r.json?.error})`);
  }

  // Hovedscenariet: prisantydning låser opp publisering
  touched.add(bag);
  const before = await (await fetch(`${BASE}/api/admin/properties?${q}&limit=50`)).json();
  const bagBefore = (before.properties || []).find((p) => p.id === bag);
  ok(!bagBefore.monthlyRentBand, `Baglergaten mangler pris før (band=${bagBefore.monthlyRentBand})`);
  const platformRent = bagBefore.rentAmount ?? null;

  const r1 = await put({ id: bag, fields: { rentAmount: 17000 } });
  const p1 = r1.json?.property || {};
  ok(r1.status === 200 && p1.monthlyRentBand === '17 000 kr/mnd', `pris 17000 → eksakt «${p1.monthlyRentBand}»`);
  ok(p1.rentBandSource === 'redaksjonell', `kilde merket redaksjonell (${p1.rentBandSource})`);
  ok(p1.editorialRentAmount === 17000, `editorialRentAmount=${p1.editorialRentAmount}`);
  ok((p1.rentAmount ?? null) === platformRent, `KPI-TRYGGHET: plattformens rentAmount urørt (${platformRent} → ${p1.rentAmount ?? null})`);
  ok(r1.json?.contentReady === true, `innhold er nå komplett (contentReady=${r1.json?.contentReady})`);
  ok(r1.json?.publishable === false, `men fortsatt IKKE publisert — synlighet er skrudd av (publishable=${r1.json?.publishable})`);

  // Flere felt, og at tittel ikke vasker bort de andre (regresjonen jeg fikset)
  const r2 = await put({ id: bag, fields: { sqm: 42, bedrooms: 2, description: 'Lys og nyoppusset leilighet\n\n\n\nmidt i Sandviken.', availableFrom: 'Ledig nå' } });
  const p2 = r2.json?.property || {};
  ok(p2.sqm === 42 && p2.bedrooms === 2, `areal 42 og soverom 2 overstyrt (${p2.sqm}, ${p2.bedrooms})`);
  ok(p2.description === 'Lys og nyoppusset leilighet\n\nmidt i Sandviken.', 'annonsetekst lagret, doble blanklinjer normalisert');
  ok(p2.monthlyRentBand === '17 000 kr/mnd', 'prisen står fortsatt etter ny lagring');
  ok(p2.platformValues?.sqm === 40, `plattformens egen verdi bevart for sammenligning (sqm=${p2.platformValues?.sqm})`);

  const rTitle = await fetch(`${BASE}/api/admin/properties/title?${q}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bag, title: 'Nyoppusset 2-roms i Sandviken' }),
  });
  const pT = (await rTitle.json()).property || {};
  ok(pT.listingTitle === 'Nyoppusset 2-roms i Sandviken', `tittel lagret (${pT.listingTitle})`);
  ok(pT.monthlyRentBand === '17 000 kr/mnd' && pT.sqm === 42, 'REGRESJON: tittellagring sletter ikke pris/areal');

  // Gatefeltet deles: area = gatenavn (gruppering/slug), street = full adresse
  const r3 = await put({ id: bag, fields: { area: 'Baglergaten 8B' } });
  ok(r3.json?.property?.area === 'Baglergaten', `area uten husnummer: «Baglergaten 8B» → «${r3.json?.property?.area}»`);
  ok(r3.json?.property?.street === 'Baglergaten 8B', `full gateadresse beholdt: «${r3.json?.property?.street}»`);
  ok(r3.json?.property?.houseNumber === '8B', `husnummer tatt vare på: «${r3.json?.property?.houseNumber}»`);

  // Nullstilling av ett felt → plattformens verdi tilbake
  const r4 = await put({ id: bag, fields: { sqm: '' } });
  ok(r4.json?.property?.sqm === 40, `nullstilt areal → plattformens 40 tilbake (${r4.json?.property?.sqm})`);
  ok((r4.json?.removed || []).includes('sqm'), `svaret sier hva som ble fjernet: ${JSON.stringify(r4.json?.removed)}`);

  // Bilderettigheter
  const r5 = await put({ id: bag, fields: { imageRights: true } });
  ok(r5.json?.property?.imageRights === true, 'bilderettigheter bekreftet');
  const r6 = await put({ id: bag, fields: { imageRights: false } });
  ok(r6.json?.property?.imageRights === false, 'bilderettigheter trukket tilbake');

  // Personvern: ingenting av dette skal ut offentlig
  const pub = await (await fetch(`${BASE}/api/public/properties?limit=24`)).json();
  const blob = JSON.stringify(pub);
  const leaks = ['editorialValues', 'platformValues', 'editorialRentAmount', 'imageRights', 'editorialFields', 'rentIndicativeEditorial', 'rentBandSource', 'sqmSource'].filter((k) => blob.includes(k));
  ok(leaks.length === 0, `offentlig feed lekker ingen adminfelt (${leaks.join(', ') || 'ingen'})`);
  const bagPub = (pub.properties || []).find((p) => p.id === bag);
  ok(!bagPub || bagPub.sqm === 40, 'offentlig feed viser riktig areal');

  // finn-suggest: henter forslag UTEN å lagre
  const sg = await fetch(`${BASE}/api/admin/properties/finn-suggest?${q}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bag }),
  });
  const sj = await sg.json().catch(() => null);
  if (sg.status === 200) {
    ok(!!sj?.suggest, `FINN-forslag hentet: tittel=«${String(sj.suggest.title).slice(0, 44)}» pris=${sj.suggest.rentAmount} areal=${sj.suggest.sqm} sov=${sj.suggest.bedrooms} bilder=${sj.images?.length}`);
    ok(!!sj?.current, 'svaret viser også boligens nåværende verdier for sammenligning');
    const after = await (await fetch(`${BASE}/api/admin/properties?${q}&limit=50`)).json();
    const nowBag = (after.properties || []).find((p) => p.id === bag);
    ok(nowBag.description === 'Lys og nyoppusset leilighet\n\nmidt i Sandviken.', 'forslaget lagret INGENTING av seg selv');
  } else {
    ok(sg.status === 502, `FINN utilgjengelig nå (${sg.status}: ${sj?.error}) — forventet uten nettilgang til finn.no`);
  }
  const sgNo = await fetch(`${BASE}/api/admin/properties/finn-suggest?${q}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ovre }),
  });
  ok(sgNo.status === 400, `bolig uten FINN-lenke → 400 (${sgNo.status})`);

  // Bolig som mangler alt kan fylles helt ut redaksjonelt
  touched.add(ovre);
  const r7 = await put({ id: ovre, fields: { rentAmount: 14000, sqm: 55, bedrooms: 2, area: 'Øvregaten 17', district: 'Bergenhus' } });
  const p7 = r7.json?.property || {};
  ok(p7.sqm === 55 && p7.area === 'Øvregaten' && p7.district === 'Bergenhus', `tom bolig fylt ut: ${p7.sqm} m², ${p7.area}, ${p7.district}`);
  ok((r7.json?.gate?.blocking || []).includes('mangler_bilder'), `bilder mangler fortsatt — porten holder (${JSON.stringify(r7.json?.gate?.blocking)})`);
} catch (e) {
  fail++; console.log('FEIL · uventet unntak:', e.message);
} finally {
  console.log('\n— OPPRYDDING —');
  for (const id of touched) {
    const r = await put({ id, resetAll: true });
    const p = r.json?.property || {};
    ok(r.status === 200 && (p.editorialFields || []).length === 0, `nullstilt alle overstyringer på ${id.slice(0, 8)} (pris=${p.monthlyRentBand}, areal=${p.sqm}, tittel=${String(p.editorialTitle)})`);
  }
  const pubEnd = await (await fetch(`${BASE}/api/public/listings`)).json();
  ok(pubEnd.total === 0, `0 publiserte boliger til slutt (${pubEnd.total})`);
  console.log(`\nRESULTAT: ${pass} OK · ${fail} feil`);
}
