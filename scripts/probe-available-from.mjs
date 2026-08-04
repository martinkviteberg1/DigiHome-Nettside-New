// Røyktest for datofeltet «Ledig fra»: tolkning, FINN-henting, lagring, visning.
// Rydder opp etter seg. Kjør: node scripts/probe-available-from.mjs
import fs from 'fs';
import { toIsoDate, formatNoDate } from '../lib/listings.js';

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
const put = (body) => fetch(`${BASE}/api/admin/properties/fields?${q}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

const touched = new Set();

try {
  // ══ 1. TOLKNING ══════════════════════════════════════════════════════════
  console.log('— TOLKNING —');
  ok(toIsoDate('01.10.2026') === '2026-10-01', `norsk format: 01.10.2026 → ${toIsoDate('01.10.2026')}`);
  ok(toIsoDate('1.10.2026') === '2026-10-01', `uten ledende null: 1.10.2026 → ${toIsoDate('1.10.2026')}`);
  ok(toIsoDate('2026-10-01') === '2026-10-01', 'ISO beholdes');
  ok(toIsoDate('2026-10-01T00:00:00.000Z') === '2026-10-01', 'ISO med tidsstempel kuttes til dato');
  ok(toIsoDate('01/10/2026') === '2026-10-01', 'skråstrek godtas');
  ok(toIsoDate('31.02.2026') === null, 'ugyldig dato 31.02 avvises (ruller ikke over til mars)');
  ok(toIsoDate('Ledig nå') === null, '«Ledig nå» er ikke en dato');
  ok(toIsoDate('') === null && toIsoDate(null) === null, 'tomt gir null');
  ok(formatNoDate('01.10.2026') === '1. oktober 2026', `visning: 01.10.2026 → «${formatNoDate('01.10.2026')}»`);
  ok(formatNoDate('2026-10-01') === '1. oktober 2026', 'samme visning for ISO');
  // Selve feilen vi lukker:
  ok(new Date('01.10.2026').getMonth() === 0 && formatNoDate('01.10.2026') === '1. oktober 2026',
    'FEILEN ER LUKKET: new Date() sier januar, formatNoDate sier oktober');

  // ══ 2. FINN ══════════════════════════════════════════════════════════════
  console.log('\n— FINN —');
  const list = await (await fetch(`${BASE}/api/admin/properties?${q}&limit=50`)).json();
  const withFinn = (list.properties || []).filter((p) => p.finnUrl);
  ok(withFinn.length > 0, `${withFinn.length} boliger har FINN-lenke`);
  for (const p of withFinn) {
    const r = await fetch(`${BASE}/api/admin/properties/finn-suggest?${q}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }),
    });
    const j = await r.json().catch(() => null);
    if (r.status !== 200) { ok(false, `${p.area}: finn-suggest ga ${r.status} (${j?.error})`); continue; }
    ok(!!j.suggest.availableFrom, `${p.area}: LEDIG FRA hentet fra FINN → ${j.suggest.availableFrom} (${formatNoDate(j.suggest.availableFrom)})`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(j.suggest.availableFrom || ''), `${p.area}: forslaget er ISO, klart for datofeltet`);
  }

  // ══ 3. LAGRING ═══════════════════════════════════════════════════════════
  console.log('\n— LAGRING —');
  const target = withFinn[0];
  touched.add(target.id);
  const r1 = await put({ id: target.id, fields: { availableFrom: '01.10.2026' } });
  ok(r1.json?.property?.availableFrom === '2026-10-01', `norsk format lagres som ISO: ${r1.json?.property?.availableFrom}`);
  ok(r1.json?.property?.editorialValues?.availableFrom === '2026-10-01', 'også editorialValues er ISO (modalen leser den)');

  const r2 = await put({ id: target.id, fields: { availableFrom: 'Ledig nå' } });
  ok(r2.json?.property?.availableFrom === 'Ledig nå', `«Ledig nå» godtas som tekst: ${r2.json?.property?.availableFrom}`);
  const r3 = await put({ id: target.id, fields: { availableFrom: 'nå' } });
  ok(r3.json?.property?.availableFrom === 'Ledig nå', `«nå» normaliseres til «Ledig nå»`);

  for (const bad of ['i morgen', '31.02.2026', 'oktober', '2026']) {
    const rb = await put({ id: target.id, fields: { availableFrom: bad } });
    ok(rb.status === 400, `søppel avvises: «${bad}» → ${rb.status} ${rb.json?.error || ''}`);
  }

  const r4 = await put({ id: target.id, fields: { availableFrom: '' } });
  ok(!(r4.json?.property?.editorialValues || {}).availableFrom, 'tømming fjerner overstyringen');

  // ══ 4. VISNING PÅ BOLIGSIDEN ═════════════════════════════════════════════
  console.log('\n— VISNING —');
  await put({ id: target.id, fields: { availableFrom: '01.10.2026', rentAmount: 17000 } });
  const vis = await fetch(`${BASE}/api/admin/properties/visibility?${q}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: target.id, visible: true }),
  });
  ok(vis.status === 200, 'bolig midlertidig synlig');
  const pub = await (await fetch(`${BASE}/api/public/listings`)).json();
  const card = (pub.listings || pub.items || [])[0] || {};
  ok(card.availableFrom === '2026-10-01', `kortet gir ISO til klienten: ${card.availableFrom}`);
  const html = await (await fetch(`${BASE}/ledige-boliger/${card.slug}`)).text();
  ok(html.includes('1. oktober 2026'), 'boligsiden viser «1. oktober 2026»');
  ok(!html.includes('10. januar 2026'), 'KRITISK: viser IKKE «10. januar 2026» (den gamle feilen)');
} catch (e) {
  fail++; console.log('FEIL · unntak:', e.message);
} finally {
  console.log('\n— OPPRYDDING —');
  for (const id of touched) {
    await fetch(`${BASE}/api/admin/properties/visibility?${q}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, visible: false }),
    });
    const r = await put({ id, resetAll: true });
    ok((r.json?.property?.editorialFields || []).length === 0, `nullstilt ${id.slice(0, 8)}`);
  }
  const end = await (await fetch(`${BASE}/api/public/listings`)).json();
  ok(end.total === 0, `0 publiserte boliger til slutt (${end.total})`);
  console.log(`\nRESULTAT: ${pass} OK · ${fail} feil`);
}
