// Røyktest for boligvarsel: oppretter to varsler, sjekker matching mot ledige
// boliger, og RYDDER OPP etter seg (sletter begge). Ingen e-post sendes.
// Kjør: node scripts/probe-housing-alerts.mjs
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
const KEY = process.env.ADMIN_KEY || '';
const q = `key=${encodeURIComponent(KEY)}`;
const ok = (b, m) => console.log(`${b ? 'OK  ' : 'FEIL'} · ${m}`);

const A = 'qa.boligvarsel.1@example.com';
const B = 'qa.boligvarsel.2@example.com';

async function post(body) {
  const r = await fetch(`${BASE}/api/housing-alerts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}

try {
  // 1. Validering
  const bad = await post({ email: 'ikke-en-epost' });
  ok(bad.status === 400 && bad.json?.ok === false, `ugyldig e-post avvises (${bad.status}: ${bad.json?.error})`);

  // 2. Steg 1 — bare e-post
  const s1 = await post({ email: A, source: 'ledige-boliger' });
  ok(s1.status === 200 && s1.json?.ok === true && s1.json?.isNew === true, `steg 1 lagret, isNew=${s1.json?.isNew}, matches=${s1.json?.matches}`);

  // 3. Steg 2 — kriterier på samme e-post skal OPPDATERE, ikke duplisere
  const s2 = await post({ email: A, districts: ['Årstad', 'Bergenhus'], bedroomsMin: 2, maxRent: 18000, moveIn: '1-3' });
  ok(s2.status === 200 && s2.json?.isNew === false, `steg 2 oppdaterte samme varsel, isNew=${s2.json?.isNew}`);
  ok(/2\+ soverom/.test(s2.json?.summary || '') && /18 000/.test(s2.json?.summary || ''), `oppsummering: «${s2.json?.summary}»`);

  // 4. Ugyldig bydel skal siles bort, ikke lagres
  const s3 = await post({ email: B, districts: ['Oslo sentrum', 'Fana'], bedroomsMin: 99, maxRent: 5 });
  ok(s3.status === 200, 'varsel 2 lagret');

  // 5. Admin: liste + etterspørsel + matching
  const ad = await (await fetch(`${BASE}/api/admin/housing-alerts?${q}`)).json();
  const mine = (ad.alerts || []).filter((x) => [A, B].includes(x.email));
  ok(ad.ok === true, `admin-liste: ${ad.alerts?.length} varsler totalt, ${ad.demand?.active} aktive`);
  ok(mine.length === 2, `nøyaktig 2 QA-varsler (ingen duplikater): ${mine.length}`);
  const b = mine.find((x) => x.email === B);
  ok(JSON.stringify(b?.districts) === JSON.stringify(['Fana']), `ugyldig bydel silt bort: ${JSON.stringify(b?.districts)}`);
  ok(b?.bedroomsMin === 9, `soverom klampet til 9: ${b?.bedroomsMin}`);
  ok(b?.maxRent === null, `urimelig lav maksleie forkastet: ${b?.maxRent}`);
  const waiting = (ad.properties || []).filter((p) => p.matches > 0);
  ok(true, `boliger med ventende søkere: ${waiting.length} av ${ad.properties?.length}`);
  for (const p of waiting.slice(0, 6)) console.log(`      · ${p.matches} søker(e) — ${p.area} (${p.district || 'ukjent bydel'}) — ${p.state} — mangler: ${(p.missingLabels || []).join(', ') || 'ingenting'}`);

  // 6. Uautorisert admin
  const un = await fetch(`${BASE}/api/admin/housing-alerts`);
  ok(un.status === 401, `admin uten nøkkel gir 401 (${un.status})`);

  // 7. Personvern: offentlig endepunkt lekker ikke varsler
  const pub = await (await fetch(`${BASE}/api/public/listings`)).json();
  ok(!('alerts' in pub) && !('demand' in pub), 'offentlig listings-svar inneholder ingen varseldata');
} finally {
  // OBLIGATORISK OPPRYDDING
  for (const email of [A, B]) {
    const r = await fetch(`${BASE}/api/admin/housing-alerts?${q}&email=${encodeURIComponent(email)}`, { method: 'DELETE' });
    const j = await r.json().catch(() => null);
    ok(r.status === 200 && j?.ok, `slettet QA-varsel ${email} (varsel: ${j?.deleted}, nyhetsbrev: ${j?.deletedSubscriber})`);
  }
  const after = await (await fetch(`${BASE}/api/admin/housing-alerts?${q}`)).json();
  const left = (after.alerts || []).filter((x) => [A, B].includes(x.email));
  ok(left.length === 0, `0 QA-varsler igjen (${after.alerts?.length} ekte varsler i basen)`);
}
