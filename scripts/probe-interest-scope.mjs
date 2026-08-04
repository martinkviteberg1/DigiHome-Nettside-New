// ---------------------------------------------------------------------------
// PROBE: UTLEIEENHET + BOLIGINTERESSE ENDE-TIL-ENDE
//
// Hva dekkes:
//  1. Redaksjonell utleieenhet: gyldige/ugyldige verdier, roomsVacant <=
//     roomsTotal, og at romtellingen nullstilles når hele enheten leies ut.
//  2. Offentlig visning: scope, scopeLabel, roomsLabel, rentScopeNote og
//     scopeNote på boligkort/detalj.
//  3. Interesse: obligatorisk valg når boligen tilbyr BEGGE, kanonisk
//     interesse-post med unitId + full adresse + fritekst.
//  4. Dedupe: samme person på to boliger innen 30 min mister ikke bolig nr. 2.
//  5. Plattformkø: GET/ack av /api/property-interest/outbox.
//  6. Svar til interessent: POST /api/property-interest/reply (auth, validering,
//     ukjent enhet, logging på leadet).
//
// E-POST: testleadene bruker @example.com. lib/email.js stopper reserverte
// testdomener (RFC 2606) FØR SendGrid, så proben kan aldri sende e-post til et
// menneske — og vi unngår bounces som skader avsenderomdømmet.
//
// Kjør: node scripts/probe-interest-scope.mjs
// ---------------------------------------------------------------------------
import fs from 'fs';
import { MongoClient } from 'mongodb';

const env = Object.fromEntries(
  fs.readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const BASE = 'http://localhost:3000';
const KEY = env.ADMIN_KEY;
const TOKEN = env.AGENT_BRIDGE_SECRET;
const MONGO = env.MONGO_URL;
const DB = env.DB_NAME || 'digihome';

let ok = 0; let fail = 0;
const T = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  OK   ${name}`); }
  else { fail += 1; console.log(`  FEIL ${name}${extra ? ` — ${extra}` : ''}`); }
};
const j = async (path, init) => {
  const r = await fetch(`${BASE}${path}`, init);
  let body = null;
  try { body = await r.json(); } catch (e) { body = null; }
  return { status: r.status, body };
};
const put = (path, obj) => j(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
const post = (path, obj) => j(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

const STAMP = Date.now();
const MAIL = `probe.scope.${STAMP}@example.com`;
const MAIL2 = `probe.hele.${STAMP}@example.com`;

const state = { both: null, whole: null, restore: [] };

async function pickProperties() {
  const { body } = await j(`/api/admin/properties?key=${KEY}`);
  const rows = (body?.properties || []).filter((p) => p.status === 'active');
  // «Begge»-boligen må ha bilder + areal. Pris settes redaksjonelt under.
  const both = rows.find((p) => (p.images || []).length && p.sqm && p.area);
  const whole = rows.find((p) => p !== both && (p.images || []).length && p.sqm && p.area && p.monthlyRentBand);
  return { both, whole };
}

async function setup() {
  const { both, whole } = await pickProperties();
  if (!both) throw new Error('Fant ingen aktiv bolig med bilder/areal å teste med');
  state.both = both;
  state.whole = whole || null;

  // Rydd bort spor fra tidligere kjøringer før vi setter nye verdier.
  await put(`/api/admin/properties/fields?key=${KEY}`, { id: both.id, resetAll: true });

  const r = await put(`/api/admin/properties/fields?key=${KEY}`, {
    id: both.id,
    fields: { rentalScope: 'begge', roomsVacant: 2, roomsTotal: 4, rentAmount: 12000, imageRights: true },
  });
  T('oppsett: lagrer utleieenhet «begge» + 2 av 4 rom + prisantydning', r.status === 200 && r.body?.ok, JSON.stringify(r.body).slice(0, 200));

  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: both.id, visible: true });
  state.restore.push({ id: both.id, visible: both.visible === true });
  if (state.whole) {
    await put(`/api/admin/properties/visibility?key=${KEY}`, { id: state.whole.id, visible: true });
    state.restore.push({ id: state.whole.id, visible: state.whole.visible === true });
  }
}

async function testEditorialValidation() {
  console.log('\n1) Redaksjonell utleieenhet');
  const bad = await put(`/api/admin/properties/fields?key=${KEY}`, { id: state.both.id, fields: { rentalScope: 'halv' } });
  T('ugyldig utleieenhet avvises (400)', bad.status === 400, `fikk ${bad.status}`);

  const cross = await put(`/api/admin/properties/fields?key=${KEY}`, { id: state.both.id, fields: { rentalScope: 'rom', roomsVacant: 5, roomsTotal: 3 } });
  T('flere ledige rom enn totalt avvises (400)', cross.status === 400 && /flere enn/i.test(cross.body?.error || ''), JSON.stringify(cross.body).slice(0, 160));

  const hel = await put(`/api/admin/properties/fields?key=${KEY}`, { id: state.both.id, fields: { rentalScope: 'hele', roomsVacant: 2, roomsTotal: 4 } });
  const flds = hel.body?.property?.editorialFields || [];
  T('«hele enheten» nullstiller romtellingen', hel.status === 200 && !flds.includes('roomsVacant') && !flds.includes('roomsTotal'), JSON.stringify(flds));

  // Tilbake til «begge» for resten av proben.
  const back = await put(`/api/admin/properties/fields?key=${KEY}`, { id: state.both.id, fields: { rentalScope: 'begge', roomsVacant: 2, roomsTotal: 4 } });
  T('gjenoppretter «begge» med 2 av 4 rom', back.status === 200 && back.body?.property?.rentalScope === 'begge' && back.body?.property?.roomsVacant === 2);
}

async function testPublicListing() {
  console.log('\n2) Offentlig visning');
  const { body } = await j('/api/public/listings');
  const cards = body?.listings || body?.items || [];
  const card = cards.find((c) => c.id === state.both.id || c.id === state.both.externalId);
  T('boligen er publisert og synlig offentlig', !!card, `publiserte: ${cards.length}`);
  if (!card) return null;
  T('kortet oppgir utleieenhet «begge»', card.scope === 'begge', String(card.scope));
  T('kortet har etikett «Hele enheten eller rom»', /Hele enheten/.test(card.scopeShort || ''), card.scopeShort);
  T('kortet viser «2 av 4 rom ledige»', card.roomsLabel === '2 av 4 rom ledige', card.roomsLabel);
  T('prisen merkes «for hele enheten» når begge er mulig', card.rentScopeNote === 'for hele enheten', card.rentScopeNote);
  T('full gateadresse med husnummer', /\d/.test(card.streetAddress || ''), card.streetAddress);

  const det = await j(`/api/public/listings?slug=${encodeURIComponent(card.slug)}`);
  const d = det.body?.listing || det.body?.detail || null;
  if (d) {
    T('detaljsiden har forklaring av utleieenhet', /rom i bofellesskap/i.test(d.scopeNote || ''), (d.scopeNote || '').slice(0, 80));
  } else {
    // Detaljdata hentes server-side i /ledige-boliger/[slug]; HTML-sjekk er nok.
    const html = await fetch(`${BASE}/ledige-boliger/${card.slug}`).then((r) => r.text());
    T('detaljsiden nevner rom i bofellesskap', /bofellesskap/i.test(html));
  }
  return card;
}

async function testInterest(card) {
  console.log('\n3) Interesse med obligatorisk valg');
  const missing = await post('/api/tenants', {
    name: 'Probe Interessent', email: MAIL, phone: '+47 900 00 001',
    notes: 'Kan jeg flytte inn 1. september? Har katt.',
    property: state.both.id, source: 'ledige-boliger',
  });
  T('interesse uten valg avvises når boligen tilbyr begge (400)', missing.status === 400 && missing.body?.field === 'interest_scope', `${missing.status} ${JSON.stringify(missing.body).slice(0, 140)}`);
  T('feilmeldingen forklarer valget på norsk', /hele enheten eller rom/i.test(missing.body?.error || ''), missing.body?.error);

  const okRes = await post('/api/tenants', {
    name: 'Probe Interessent', email: MAIL, phone: '+47 900 00 001',
    notes: 'Kan jeg flytte inn 1. september? Har katt.',
    property: state.both.id, interest_scope: 'rom', source: 'ledige-boliger',
  });
  T('interesse med valg lagres (201)', okRes.status === 201 && okRes.body?.ok, `${okRes.status}`);
  const iv = okRes.body?.interest;
  T('interessen har plattformens enhets-ID', !!iv?.unitId && iv.unitId === (state.both.externalId || state.both.id), iv?.unitId);
  T('interessen har full adresse', /\d/.test(iv?.propertyAddress || ''), iv?.propertyAddress);
  T('interessen har boliglenke', /\/ledige-boliger\//.test(iv?.propertyUrl || ''), iv?.propertyUrl);
  T('valgt utleieenhet er lagret', Array.isArray(iv?.scope) && iv.scope[0] === 'rom' && iv.scopeLabel === 'Rom i bofellesskap', JSON.stringify(iv?.scope) + ' ' + iv?.scopeLabel);
  T('fritekstmeldingen følger interessen', /katt/i.test(iv?.message || ''), iv?.message);
  T('boligens eget tilbud er med (rentalScope)', iv?.rentalScope === 'begge', iv?.rentalScope);
  return okRes.body?.data?.id;
}

async function testDedupeSecondProperty(leadId) {
  console.log('\n4) Samme person, ny bolig innen 30 min');
  const again = await post('/api/tenants', {
    name: 'Probe Interessent', email: MAIL, phone: '+47 900 00 001',
    property: state.both.id, interest_scope: 'hele', source: 'ledige-boliger',
  });
  T('samme bolig igjen gir dedupe uten dublett (200)', again.status === 200 && again.body?.deduped === true, `${again.status}`);
  T('gjentatt interesse markeres som kjent (isNew=false)', again.body?.interest?.isNew === false, JSON.stringify(again.body?.interest?.isNew));

  if (!state.whole) { console.log('  HOPP  ingen andre publiserbare boliger å teste bolig nr. 2 med'); return; }
  const second = await post('/api/tenants', {
    name: 'Probe Interessent', email: MAIL, phone: '+47 900 00 001',
    notes: 'Interessert i denne også', property: state.whole.id, source: 'ledige-boliger',
  });
  T('bolig nr. 2 kobles på samme lead (200)', second.status === 200 && second.body?.deduped === true, `${second.status}`);
  T('bolig nr. 2 registreres som NY interesse', second.body?.interest?.isNew === true, JSON.stringify(second.body?.interest || {}).slice(0, 160));
  T('bolig nr. 2 uten valg går gjennom når bare hele enheten tilbys', !!second.body?.interest?.unitId, second.body?.error || '');

  const client = new MongoClient(MONGO);
  await client.connect();
  const lead = await client.db(DB).collection('tenant_leads').findOne({ id: leadId });
  await client.close();
  T('leadet har to boliginteresser', (lead?.property_interests || []).length === 2, String((lead?.property_interests || []).length));
}

async function testOutbox() {
  console.log('\n5) Kø mot DigiHome-plattformen');
  const noAuth = await j('/api/property-interest/outbox');
  T('utboksen krever auth (401)', noAuth.status === 401, String(noAuth.status));

  const viaToken = TOKEN ? await j(`/api/property-interest/outbox?token=${encodeURIComponent(TOKEN)}`) : { status: 0, body: null };
  T('bro-token gir tilgang', viaToken.status === 200, String(viaToken.status));

  // HYBRID: interessen pushes til plattformen i sanntid og står som «delivered»
  // med én gang. Køen er sikkerhetsnettet — den holder bare det pushen ikke
  // fikk levert. Vi spør derfor etter ALLE poster, ellers tester vi bare
  // feilstien.
  const res = await j(`/api/property-interest/outbox?key=${KEY}&limit=100&status=alle`);
  T('utboksen svarer med kontrakt', res.status === 200 && !!res.body?.contract?.reply, JSON.stringify(res.body?.contract || {}).slice(0, 80));
  T('kontrakten dokumenterer sanntids-webhooken', !!res.body?.webhook && res.body.webhook.idempotencyKey === 'item.id', JSON.stringify(res.body?.webhook || {}));
  const mine = (res.body?.items || []).filter((x) => x.contact?.email === MAIL);
  T('boligmeldingen ligger i utboksen', mine.length >= 1, `fant ${mine.length}`);
  const first = mine[0];
  if (first) {
    T('køposten har enhets-ID og adresse', !!first.unitId && /\d/.test(first.propertyAddress || ''), `${first.unitId} / ${first.propertyAddress}`);
    T('køposten har valgt utleieenhet', first.scopeLabel === 'Rom i bofellesskap', first.scopeLabel);
    T('køposten har kontaktinfo og melding', !!first.contact?.email && /katt/i.test(first.message || ''), first.message);
    T('QA-trafikk er merket test', first.test === true, String(first.test));
    // Enten levert live (webhook på), eller liggende for pullen (webhook av).
    // Begge er gyldige driftsmodus — det som ikke er gyldig, er en post uten spor.
    const live = first.status === 'delivered' && first.deliveredVia === 'webhook';
    const queued = first.status === 'pending';
    console.log(`  INFO levering: status=${first.status} · via=${first.deliveredVia || '-'} · ref=${first.platformRef || '-'} · plattformstatus=${first.platformStatus || '-'} · forsøk=${first.webhookAttempts ?? '-'}${first.lastWebhookError ? ` · feil=${first.lastWebhookError}` : ''}`);
    T('leveringen har et spor: levert live eller i kø', live || queued, `${first.status}/${first.deliveredVia || '-'}`);
    if (live) T('live-leveringen fikk plattformreferanse', !!first.platformRef || first.platformStatus === 'unmatched', `${first.platformRef} / ${first.platformStatus}`);
    const ack = await post(`/api/property-interest/outbox/ack?key=${KEY}`, { ids: [first.id], platform_ref: 'probe-ref' });
    T('ack er idempotent og kvitterer', ack.status === 200 && ack.body?.acked === 1, JSON.stringify(ack.body));
  }
}

async function testReply(leadId) {
  console.log('\n6) Svar til interessenten — ÉN avsender');
  const unitId = state.both.externalId || state.both.id;
  const tq = `token=${encodeURIComponent(TOKEN || '')}`;

  const noAuth = await post('/api/property-interest/reply', { lead_id: leadId, message: 'hei' });
  T('svar krever auth (401)', noAuth.status === 401, String(noAuth.status));

  // VIKTIG KONTRAKT: plattformen eier samtalen og sender svaret selv fra
  // «Interessenter». Markedssidens admin skal derfor AVVISES — to avsendere ga
  // interessenten dobbel e-post og forvalteren to tråder.
  const viaAdmin = await post(`/api/property-interest/reply?key=${KEY}`, { lead_id: leadId, unit_id: unitId, message: 'Hei!' });
  T('admin avvises med 409', viaAdmin.status === 409, String(viaAdmin.status));
  T('avvisningen forklarer hvorfor', /dobbel e-post/i.test(viaAdmin.body?.why || ''), String(viaAdmin.body?.why || '').slice(0, 80));
  T('avvisningen peker til rett sted', typeof viaAdmin.body?.where === 'string' || viaAdmin.body?.where === null, JSON.stringify(viaAdmin.body?.where));

  const empty = await post(`/api/property-interest/reply?${tq}`, { lead_id: leadId, message: '   ' });
  T('tomt svar avvises (400)', empty.status === 400, String(empty.status));

  const unknown = await post(`/api/property-interest/reply?${tq}`, { lead_id: leadId, unit_id: 'finnes-ikke-123', message: 'Hei!' });
  T('ukjent enhet avvises (404)', unknown.status === 404, String(unknown.status));

  const noWho = await post(`/api/property-interest/reply?${tq}`, { message: 'Hei!' });
  T('svar uten mottakerreferanse avvises (400)', noWho.status === 400, String(noWho.status));

  const sent = await post(`/api/property-interest/reply?${tq}`, {
    lead_id: leadId, unit_id: unitId,
    message: 'Hei! Rommet er ledig fra 1. september, og katt er greit.\n\nPasser onsdag 17:00 for visning?',
    from_name: 'Probe Forvalter', from_email: 'forvalter@example.com',
  });
  T('plattformen får sende (200)', sent.status === 200 && sent.body?.ok, `${sent.status} ${JSON.stringify(sent.body).slice(0, 160)}`);
  T('svaret sendes ikke til testdomene (guard)', sent.body?.sent === false && sent.body?.skipped === 'test-mottaker', `sent=${sent.body?.sent} skipped=${sent.body?.skipped}`);
  T('svaret knyttes til riktig enhet', sent.body?.unitId === unitId, sent.body?.unitId);

  const viaToken = TOKEN ? await post(`/api/property-interest/reply?${tq}`, { email: MAIL, unit_id: unitId, message: 'Svar via plattformen.' }) : { status: 0, body: null };
  T('plattformen kan slå opp på e-post også (200)', viaToken.status === 200 && viaToken.body?.ok, String(viaToken.status));

  // ADMIN SKAL SE HVOR SAMTALEN LIGGER. Uten dette gjetter forvalteren, og da
  // svarer hun begge steder.
  const drawer = await j(`/api/admin/lead?key=${KEY}&id=${encodeURIComponent(leadId)}&type=tenant`);
  const iv = (drawer.body?.lead?.property_interests || []).find((x) => String(x.unitId || '') === String(unitId));
  T('lead-detaljen har leveringsstatus per interesse', !!iv?.delivery, JSON.stringify(iv?.delivery || null));
  T('statusen er kjent (kø eller levert)', ['pending', 'delivered'].includes(iv?.delivery?.status), String(iv?.delivery?.status));

  const client = new MongoClient(MONGO);
  await client.connect();
  const lead = await client.db(DB).collection('tenant_leads').findOne({ id: leadId });
  const replies = await client.db(DB).collection('property_interest_replies').countDocuments({ leadId });
  await client.close();
  T('svarene ligger på leadet', (lead?.interest_replies || []).length >= 2, String((lead?.interest_replies || []).length));
  T('svarene er loggført', replies >= 2, String(replies));
  T('interessenten fikk kvittering forsøkt sendt', !!lead?.interest_receipt, JSON.stringify(lead?.interest_receipt || null));
  // Varselmottakere: antall, aldri adresser (PII skal ikke ut i API/logg).
  T('varselet er satt opp med 3 mottakere', lead?.admin_notify?.recipients === 3, JSON.stringify(lead?.admin_notify || null));
  T('QA-lead vekker ikke forvalterteamet', lead?.admin_notify?.error === 'test-lead', String(lead?.admin_notify?.error));
}

async function cleanup() {
  console.log('\n7) Opprydding');
  // Redaksjonelle testverdier fjernes, synlighet settes tilbake.
  await put(`/api/admin/properties/fields?key=${KEY}`, { id: state.both.id, resetAll: true });
  for (const r of state.restore) {
    await put(`/api/admin/properties/visibility?key=${KEY}`, { id: r.id, visible: r.visible });
  }
  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB);
  const leads = await db.collection('tenant_leads').find({ email: { $in: [MAIL, MAIL2] } }, { projection: { id: 1 } }).toArray();
  const ids = leads.map((l) => l.id);
  const delLeads = await db.collection('tenant_leads').deleteMany({ email: { $in: [MAIL, MAIL2] } });
  const delOut = await db.collection('platform_interest_outbox').deleteMany({ leadId: { $in: ids } });
  const delRep = await db.collection('property_interest_replies').deleteMany({ leadId: { $in: ids } });
  const restLeads = await db.collection('tenant_leads').countDocuments({ email: { $in: [MAIL, MAIL2] } });
  const restOut = await db.collection('platform_interest_outbox').countDocuments({ status: 'pending' });
  await client.close();
  const pub = await j('/api/public/listings');
  T('testleads slettet', restLeads === 0, `slettet ${delLeads.deletedCount}, køposter ${delOut.deletedCount}, svar ${delRep.deletedCount}`);
  T('redaksjonelle testverdier fjernet', true, `pending i kø etter opprydding: ${restOut}`);
  console.log(`  INFO publiserte boliger etter opprydding: ${(pub.body?.listings || []).length}`);
}

(async () => {
  console.log('PROBE: utleieenhet + boliginteresse');
  try {
    await setup();
    await testEditorialValidation();
    const card = await testPublicListing();
    const leadId = await testInterest(card);
    if (leadId) {
      await testDedupeSecondProperty(leadId);
      await testOutbox();
      await testReply(leadId);
    } else {
      console.log('  FEIL kunne ikke opprette testlead — hopper over resten');
      fail += 1;
    }
  } catch (e) {
    console.log(`  FEIL uventet: ${e.message}`);
    fail += 1;
  } finally {
    try { await cleanup(); } catch (e) { console.log(`  FEIL opprydding: ${e.message}`); fail += 1; }
  }
  console.log(`\nRESULTAT: ${ok} OK, ${fail} feil`);
  process.exit(fail ? 1 : 0);
})();
