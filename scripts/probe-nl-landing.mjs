// ---------------------------------------------------------------------------
// PROBE: NYHETSBREV → VÅR BOLIGSIDE → ETT-KLIKKS INTERESSE
//
// Nyhetsbrevets boligkort pekte tidligere til /boliginteresse (en tynn
// bekreftelsesside) og derfra videre ut til app-prosjektet. Nå peker det til
// /ledige-boliger/<slug> — vår egen boligside — og mottakeren gjenkjennes av det
// HMAC-signerte tokenet i lenken.
//
// Hva dekkes:
//  1. Token-tilgang: upublisert bolig gir 404 uten token, 200 MED gyldig token,
//     og alltid noindex. Manipulert token gir 404.
//  2. Gamle lenker: /boliginteresse?property=… videresender til boligsiden med
//     tokenet intakt (brev som alt er sendt kan ikke endres).
//  3. Lookup: fornavn + alreadyInterested.
//  4. Ett-klikks interesse: obligatorisk utleieenhet når boligen tilbyr begge,
//     kanonisk interesse med unitId + full adresse + valgt scope + melding.
//  5. Nyhetsbrev-HTML: CTA-en peker på boligsiden, ikke /boliginteresse.
//
// E-POST: mottakeren er @example.com. lib/email.js stopper reserverte
// testdomener før SendGrid, og QA-leads utløser ikke internt varsel.
//
// Kjør: node scripts/probe-nl-landing.mjs
// ---------------------------------------------------------------------------
import fs from 'fs';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

const env = Object.fromEntries(
  fs.readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const BASE = 'http://localhost:3000';
const KEY = env.ADMIN_KEY;
const MONGO = env.MONGO_URL;
const DB = env.DB_NAME || 'digihome';

// Samme HMAC som lib/newsletter.js propertyInterestToken().
const SECRET = env.NEWSLETTER_SECRET || env.AGENT_BRIDGE_SECRET || env.SENDGRID_API_KEY || 'dh-nl';
const ptFor = (campaignId, rid, propertyId) => crypto
  .createHmac('sha256', `${SECRET}:property-interest`)
  .update(`${campaignId}:${rid}:${propertyId}`)
  .digest('hex').slice(0, 40);

let ok = 0; let fail = 0;
const T = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  OK   ${name}`); }
  else { fail += 1; console.log(`  FEIL ${name}${extra ? ` — ${extra}` : ''}`); }
};
const j = async (path, init) => {
  const r = await fetch(`${BASE}${path}`, init);
  let body = null; try { body = await r.json(); } catch (e) { body = null; }
  return { status: r.status, body };
};
const put = (path, obj) => j(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
const post = (path, obj) => j(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

const STAMP = Date.now();
const CAMPAIGN = `qa-nl-landing-${STAMP}`;
const RID = `qa${STAMP}`.slice(0, 24);
const MAIL = `probe.nl.${STAMP}@example.com`;

const st = { prop: null, slug: null, pid: null, pt: null, wasVisible: false };

async function setup() {
  console.log('0) Oppsett');
  const { body } = await j(`/api/admin/properties?key=${KEY}`);
  const rows = (body?.properties || []).filter((p) => p.status === 'active');
  const prop = rows.find((p) => (p.images || []).length && p.sqm && p.area);
  if (!prop) throw new Error('Fant ingen aktiv bolig med bilder/areal');
  st.prop = prop;
  st.pid = prop.externalId || prop.id;
  st.wasVisible = prop.visible === true;

  await put(`/api/admin/properties/fields?key=${KEY}`, { id: prop.id, resetAll: true });
  const r = await put(`/api/admin/properties/fields?key=${KEY}`, {
    id: prop.id,
    fields: { rentalScope: 'begge', roomsVacant: 2, roomsTotal: 4, rentAmount: 12000, imageRights: true },
  });
  T('boligen får utleieenhet «begge» + 2 av 4 rom', r.status === 200 && r.body?.property?.rentalScope === 'begge');

  // Boligen holdes SKJULT med vilje: da tester vi at nyhetsbrev-mottakeren
  // kommer inn med token, mens alle andre får 404.
  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: prop.id, visible: false });

  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB);
  await db.collection('newsletter_recipients').insertOne({
    id: `qa-${STAMP}`, campaignId: CAMPAIGN, rid: RID, email: MAIL, status: 'sent', createdAt: new Date().toISOString(), qaProbe: true,
  });
  await db.collection('newsletter_subscribers').updateOne(
    { email: MAIL },
    { $set: { email: MAIL, name: 'Kari Probe', status: 'active', qaProbe: true, createdAt: new Date().toISOString() } },
    { upsert: true },
  );
  await client.close();

  // Slug utledes av boligsiden selv; vi henter den fra en midlertidig
  // publisering slik at proben ikke duplikerer slug-logikken.
  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: prop.id, visible: true });
  const pub = await j('/api/public/listings');
  const card = (pub.body?.listings || []).find((c) => c.id === prop.id || c.id === prop.externalId);
  st.slug = card?.slug || null;
  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: prop.id, visible: false });
  T('fant boligsidens slug', !!st.slug, String(st.slug));

  st.pt = ptFor(CAMPAIGN, RID, st.pid);
}

async function testAccess() {
  console.log('\n1) Token-tilgang til boligsiden');
  const plain = await fetch(`${BASE}/ledige-boliger/${st.slug}`);
  T('upublisert bolig gir 404 uten token', plain.status === 404, String(plain.status));

  const bad = await fetch(`${BASE}/ledige-boliger/${st.slug}?c=${CAMPAIGN}&r=${RID}&pt=${'0'.repeat(40)}`);
  T('manipulert token gir 404', bad.status === 404, String(bad.status));

  const good = await fetch(`${BASE}/ledige-boliger/${st.slug}?c=${CAMPAIGN}&r=${RID}&pt=${st.pt}`);
  const html = await good.text();
  T('gyldig token gir tilgang (200)', good.status === 200, String(good.status));
  T('siden er noindex for nyhetsbrevlenker', /noindex/i.test(html), 'fant ingen noindex');
  T('boligsiden viser utleieenhet', /bofellesskap/i.test(html));
  T('boligsiden viser full adresse', /\d/.test(html) && /Baglergaten|gaten|vegen|veien|gata/i.test(html));
}

async function testLegacyRedirect() {
  console.log('\n2) Gamle nyhetsbrevlenker');
  const r = await fetch(`${BASE}/boliginteresse?property=${encodeURIComponent(st.pid)}&c=${CAMPAIGN}&r=${RID}&pt=${st.pt}&utm_source=nyhetsbrev`, { redirect: 'manual' });
  const loc = r.headers.get('location') || '';
  T('/boliginteresse videresender (307/308)', r.status === 307 || r.status === 308, String(r.status));
  T('videresender til boligsiden med slug', loc.includes(`/ledige-boliger/${st.slug}`), loc);
  T('tokenet følger med', loc.includes(`pt=${st.pt}`) && loc.includes(`c=${CAMPAIGN}`), loc);
  T('utm bevares', loc.includes('utm_source=nyhetsbrev'), loc);
}

async function testLookup() {
  console.log('\n3) Gjenkjenning av mottaker');
  const qs = `property=${encodeURIComponent(st.pid)}&c=${CAMPAIGN}&r=${RID}&pt=${st.pt}`;
  const res = await j(`/api/newsletter/property-interest/lookup?${qs}`);
  T('lookup svarer ok', res.status === 200 && res.body?.ok, String(res.status));
  T('mottakeren gjenkjennes med fornavn', res.body?.firstName === 'Kari', String(res.body?.firstName));
  T('preview-flagget er ikke satt (gyldig token)', !res.body?.preview);
  T('har ikke meldt interesse ennå', res.body?.alreadyInterested === false, String(res.body?.alreadyInterested));

  const bad = await j(`/api/newsletter/property-interest/lookup?property=${encodeURIComponent(st.pid)}&c=${CAMPAIGN}&r=${RID}&pt=feil`);
  T('ugyldig token gir preview-modus (ingen leaddata)', bad.body?.preview === true && !bad.body?.firstName, JSON.stringify(bad.body).slice(0, 120));
}

async function testOneClick() {
  console.log('\n4) Ett-klikks interesse');
  const bodyBase = { property: st.pid, c: CAMPAIGN, r: RID, pt: st.pt };

  const noScope = await post('/api/newsletter/property-interest/confirm', bodyBase);
  T('valg av utleieenhet er obligatorisk (400)', noScope.status === 400 && noScope.body?.field === 'interest_scope', `${noScope.status} ${JSON.stringify(noScope.body).slice(0, 140)}`);

  const badToken = await post('/api/newsletter/property-interest/confirm', { ...bodyBase, pt: 'feil', scope: 'rom' });
  T('ugyldig token avvises (401)', badToken.status === 401, String(badToken.status));

  const done = await post('/api/newsletter/property-interest/confirm', { ...bodyBase, scope: 'rom', message: 'Ser fint ut! Kan jeg få se rommet i helgen?' });
  T('interesse registreres med ett klikk', done.status === 200 && done.body?.ok, `${done.status} ${JSON.stringify(done.body).slice(0, 160)}`);

  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB);
  const lead = await db.collection('tenant_leads').findOne({ email: MAIL });
  const iv = (lead?.property_interests || [])[0] || null;
  const outbox = await db.collection('platform_interest_outbox').findOne({ leadId: lead?.id });
  await client.close();

  T('leietakerprofil opprettet fra nyhetsbrevkontakten', !!lead?.id, String(lead?.id));
  T('interessen har plattformens enhets-ID', iv?.unitId === st.pid, `${iv?.unitId} vs ${st.pid}`);
  T('interessen har full gateadresse med husnummer', /\d/.test(iv?.propertyAddress || ''), iv?.propertyAddress);
  T('valgt utleieenhet er lagret', Array.isArray(iv?.scope) && iv.scope[0] === 'rom' && iv.scopeLabel === 'Rom i bofellesskap', `${JSON.stringify(iv?.scope)} ${iv?.scopeLabel}`);
  T('meldingen følger interessen', /helgen/i.test(iv?.message || ''), iv?.message);
  T('boligens tilbud er med (rentalScope=begge)', iv?.rentalScope === 'begge', iv?.rentalScope);
  T('lenken peker på boligsiden', /\/ledige-boliger\//.test(iv?.propertyUrl || ''), iv?.propertyUrl);
  T('boligmeldingen ligger i plattformkøen', !!outbox?.unitId && outbox.scopeLabel === 'Rom i bofellesskap', JSON.stringify(outbox && { unitId: outbox.unitId, scope: outbox.scopeLabel }));

  const again = await j(`/api/newsletter/property-interest/lookup?property=${encodeURIComponent(st.pid)}&c=${CAMPAIGN}&r=${RID}&pt=${st.pt}`);
  T('lookup rapporterer nå «allerede meldt»', again.body?.alreadyInterested === true, String(again.body?.alreadyInterested));

  return lead?.id || null;
}

async function testNewsletterHtml() {
  console.log('\n5) Nyhetsbrevets CTA');
  const p = st.prop;
  const item = {
    pid: st.pid, localId: p.id, title: p.listingTitle || p.title || 'Bolig',
    image: (p.images || [])[0] || '', band: p.monthlyRentBand || '', status: 'active', district: p.district || 'Bergenhus',
  };
  const res = await post(`/api/admin/newsletter/preview?key=${KEY}`, {
    subject: 'QA landing', blocks: [{ type: 'properties', title: 'Ledige boliger', items: [item], grouping: 'never' }],
  });
  const html = res.body?.html || '';
  T('CTA peker på vår boligside', html.includes(`/ledige-boliger/${st.slug}`), html.includes('/boliginteresse') ? 'peker fortsatt på /boliginteresse' : 'fant ingen boliglenke');
  T('kortet viser utleieenhet', /Hele enheten eller rom/i.test(html));
  T('kortet viser romtelling', /2 av 4 rom ledige/.test(html));
}

async function cleanup(leadId) {
  console.log('\n6) Opprydding');
  await put(`/api/admin/properties/fields?key=${KEY}`, { id: st.prop.id, resetAll: true });
  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: st.prop.id, visible: st.wasVisible });

  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB);
  const ids = leadId ? [leadId] : (await db.collection('tenant_leads').find({ email: MAIL }, { projection: { id: 1 } }).toArray()).map((x) => x.id);
  await db.collection('tenant_leads').deleteMany({ email: MAIL });
  await db.collection('platform_interest_outbox').deleteMany({ leadId: { $in: ids } });
  await db.collection('property_interest_events').deleteMany({ email: MAIL });
  await db.collection('newsletter_recipients').deleteMany({ campaignId: CAMPAIGN });
  await db.collection('newsletter_subscribers').deleteMany({ email: MAIL });
  await db.collection('newsletter_events').deleteMany({ campaignId: CAMPAIGN });
  const rest = {
    leads: await db.collection('tenant_leads').countDocuments({ email: MAIL }),
    recipients: await db.collection('newsletter_recipients').countDocuments({ campaignId: CAMPAIGN }),
    contacts: await db.collection('newsletter_subscribers').countDocuments({ email: MAIL }),
    outbox: await db.collection('platform_interest_outbox').countDocuments({ status: 'pending' }),
  };
  await client.close();
  const pub = await j('/api/public/listings');
  T('alle testdata slettet', rest.leads === 0 && rest.recipients === 0 && rest.contacts === 0 && rest.outbox === 0, JSON.stringify(rest));
  console.log(`  INFO publiserte boliger etter opprydding: ${(pub.body?.listings || []).length}`);
}

(async () => {
  console.log('PROBE: nyhetsbrev → boligside → ett-klikks interesse');
  let leadId = null;
  try {
    await setup();
    await testAccess();
    await testLegacyRedirect();
    await testLookup();
    leadId = await testOneClick();
    await testNewsletterHtml();
  } catch (e) {
    console.log(`  FEIL uventet: ${e.message}`);
    fail += 1;
  } finally {
    try { await cleanup(leadId); } catch (e) { console.log(`  FEIL opprydding: ${e.message}`); fail += 1; }
  }
  console.log(`\nRESULTAT: ${ok} OK, ${fail} feil`);
  process.exit(fail ? 1 : 0);
})();
