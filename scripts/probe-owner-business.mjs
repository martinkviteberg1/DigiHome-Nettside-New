// PROBE: huseier som BEDRIFT — Enhetsregisteret, org.nr-validering,
// serverbekreftelse og riktig kundetype mot plattformen.
//
// Kjernespørsmålet: blir et selskap som eier boligen registrert SOM selskap?
// Hvis ikke havner leiekontrakt, depositum og honorarfaktura på en privatperson.
//
// Alle QA-leads bruker @example.com (varsel-e-post hoppes over) og slettes til
// slutt. Vi provisjonerer ingen ekte kundekonto: i preview peker plattform-URL
// på oss selv, og vi tester payloaden som ren funksjon i stedet.
//
// Kjør:  node scripts/probe-owner-business.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const BASE = 'http://localhost:3000';
const KEY = process.env.ADMIN_KEY;
const { isValidOrgNr, normalizeOrgNr, formatOrgNr } = await import('/app/lib/brreg.js');
const { resolveOwnerKind, buildSelfServicePayload, ownerOrgNo } = await import('/app/lib/self-service.js');

let ok = 0; const fails = [];
const T = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  OK   ${name}`); }
  else { fails.push(name); console.log(`  FEIL ${name}${extra ? ` — ${extra}` : ''}`); }
};
const j = async (path, init) => {
  const r = await fetch(`${BASE}${path}`, init);
  let body = null; try { body = await r.json(); } catch (e) { body = null; }
  return { status: r.status, body };
};

// DNB BANK ASA og DIGIHOME AS er stabile, offentlige referanser.
const DNB = '984851006';
const DIGIHOME = '835595242';

console.log('\n══ 1. ORGANISASJONSNUMMER: MOD-11 ══');
T('gyldig org.nr godtas (DNB)', isValidOrgNr(DNB));
T('gyldig org.nr godtas (DigiHome)', isValidOrgNr(DIGIHOME));
T('mellomrom og punktum tolereres', isValidOrgNr('984 851 006') && isValidOrgNr('984.851.006'));
T('feil kontrollsiffer avvises', !isValidOrgNr('984851007'));
T('for kort avvises', !isValidOrgNr('98485100'));
T('for langt avvises', !isValidOrgNr('9848510066'));
T('bokstaver avvises', !isValidOrgNr('98485100A'));
T('tomt avvises', !isValidOrgNr('') && !isValidOrgNr(null) && !isValidOrgNr(undefined));
T('normalisering fjerner alt annet enn siffer', normalizeOrgNr(' 984-851.006 ') === DNB);
T('visningsformat grupperer i tre', formatOrgNr(DNB) === '984 851 006');

console.log('\n══ 2. KLASSIFISERING: PRIVAT ELLER BEDRIFT ══');
T('erklært bedrift', resolveOwnerKind({ owner_kind: 'business' }) === 'business');
T('erklært privat', resolveOwnerKind({ owner_kind: 'private' }) === 'private');
T('erklært privat slår registerdata', resolveOwnerKind({ owner_kind: 'private', registry_owner_type: 'organisasjon' }) === 'private');
// Dette var den stille feilen: Infotorg svarer «organisasjon», men koden
// sammenliknet med 'org' — foretak ble klassifisert som privatpersoner.
T('registerdata «organisasjon» gir bedrift', resolveOwnerKind({ registry_owner_type: 'organisasjon' }) === 'business');
T('registerdata «org» gir bedrift', resolveOwnerKind({ registry_owner_type: 'org' }) === 'business');
T('registerdata «person» gir privat', resolveOwnerKind({ registry_owner_type: 'person' }) === 'private');
T('org.nr alene gir bedrift', resolveOwnerKind({ org_no: DNB }) === 'business');
T('registry_orgnr alene gir bedrift', resolveOwnerKind({ registry_orgnr: DIGIHOME }) === 'business');
T('ingen signaler gir privat', resolveOwnerKind({}) === 'private');
T('org.nr hentes fra begge kilder', ownerOrgNo({ registry_orgnr: `  ${DNB} ` }) === DNB && ownerOrgNo({ org_no: DNB }) === DNB);

console.log('\n══ 3. PROVISJONERINGS-PAYLOAD MOT PLATTFORMEN ══');
{
  const lead = {
    id: 'probe-1', name: 'Ola Nordmann', email: 'qa+biz@example.com', phone: '90000000',
    owner_kind: 'business', org_no: DNB, company_name: 'DNB BANK ASA', company_form: 'Allmennaksjeselskap',
    company_verified: true, address: 'Testveien 1', postal_code: '5003', city: 'Bergen',
    property_type: 'leilighet', sqm: 68, bedrooms: '2', rental_model: 'langtid',
    terms_accepted: { version: 'selvforvaltning-2025-06', at: '2026-08-04T10:00:00.000Z' },
    createdAt: '2026-08-04T10:00:00.000Z',
  };
  const p = buildSelfServicePayload(lead, { ip: '1.2.3.4', termsUrl: 'https://digihome.no/vilkar' });
  T('kundetype = business', p.contact.type === 'business', p.contact.type);
  T('org.nr følger med', p.contact.org_no === DNB);
  T('selskapsnavn følger med', p.contact.company_name === 'DNB BANK ASA');
  T('kontaktnavn er personen, ikke selskapet', p.contact.name === 'Ola Nordmann');
  T('org.nr er merket bekreftet', p.contact.org_verified === true);
  T('avtalen er akseptert på vegne av selskapet', p.agreement.accepted_on_behalf_of === 'DNB BANK ASA');
  T('signatur føres på personen', p.agreement.signatory === 'Ola Nordmann');
  T('boligdata er uendret', p.property.unit_type === 'Leilighet' && p.property.desired_model === 'Langtid' && p.property.area_m2 === 68);

  const priv = buildSelfServicePayload({ ...lead, owner_kind: 'private', org_no: '', company_name: '' });
  T('privat gir type=private', priv.contact.type === 'private');
  T('privat sender ikke selskapsfelt', priv.contact.company_name === undefined && !priv.contact.org_no);
  T('privat har ingen «på vegne av»', priv.agreement.accepted_on_behalf_of === undefined);
}

console.log('\n══ 4. ENHETSREGISTERET VIA VÅR RUTE ══');
{
  const navn = await j('/api/brreg?q=DNB');
  T('navnesøk svarer 200', navn.status === 200 && navn.body?.mode === 'navn');
  T('mest relevante treff først', navn.body?.items?.[0]?.orgNo === DNB, navn.body?.items?.[0]?.name);
  const it = navn.body?.items?.[0] || {};
  T('treffet har navn, form og status', !!it.name && !!it.formCode && it.status === 'aktiv');
  T('treffet har forretningsadresse', !!it.address?.city, JSON.stringify(it.address || {}));
  T('maks 8 forslag', (navn.body?.items || []).length <= 8, String((navn.body?.items || []).length));

  const orgnr = await j(`/api/brreg?q=${DNB}`);
  T('org.nr-søk gir ett treff', orgnr.status === 200 && orgnr.body?.mode === 'orgnr' && orgnr.body.items.length === 1);
  T('org.nr-treffet er riktig selskap', orgnr.body?.items?.[0]?.orgNo === DNB);

  const spaced = await j(`/api/brreg?q=${encodeURIComponent('984 851 006')}`);
  T('org.nr med mellomrom fungerer', spaced.body?.items?.[0]?.orgNo === DNB);

  const partial = await j('/api/brreg?q=98485100');
  T('halvferdig org.nr belaster ikke registeret', partial.body?.incomplete === true && partial.body.items.length === 0, JSON.stringify(partial.body));

  const bad = await j('/api/brreg?q=984851007');
  T('ugyldig kontrollsiffer forklares', bad.status === 200 && bad.body?.invalid === true && /kontrollsiffer/i.test(bad.body?.message || ''), JSON.stringify(bad.body));

  const unknown = await j('/api/brreg?q=999999999');
  T('ukjent org.nr gir vennlig «ikke funnet»', unknown.body?.notFound === true && unknown.body.items.length === 0, JSON.stringify(unknown.body));

  const short = await j('/api/brreg?q=a');
  T('ett tegn søker ikke', short.body?.mode === 'tom' && short.body.items.length === 0);

  const empty = await j('/api/brreg');
  T('tomt søk krasjer ikke', empty.status === 200 && (empty.body?.items || []).length === 0);
}

console.log('\n══ 5. LEAD MED BEDRIFT — SERVEREN BEKREFTER SELV ══');
const created = [];
const leadBody = (extra) => ({
  address: 'Testveien 1A', postal_code: '5003', city: 'Bergen',
  property_type: 'leilighet', sqm: 68, bedrooms: 2,
  name: 'QA Kontaktperson', phone: '+4790000000',
  lead_type: 'huseier', tier: 'full_forvaltning',
  ...extra,
});
{
  // Klienten sender et FEIL selskapsnavn på et riktig org.nr. Serveren skal
  // overskrive med registerets navn — ellers kan hvem som helst få et hvilket
  // som helst navn på et gyldig organisasjonsnummer.
  const res = await j('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadBody({
      email: 'qa+biz1@example.com', owner_kind: 'business', org_no: '984 851 006',
      company_name: 'Helt Feil Navn AS', company_form: 'Tullform',
    })),
  });
  T('bedriftslead opprettes', res.status === 201 || res.status === 200, JSON.stringify(res.body).slice(0, 120));
  const id = res.body?.lead?.id || res.body?.id;
  if (id) created.push(id);
  const det = await j(`/api/admin/lead?id=${id}&type=huseier&key=${KEY}`);
  const d = det.body?.lead || {};
  T('lagret som bedrift', d.owner_kind === 'business', d.owner_kind);
  T('org.nr normalisert til ni siffer', d.org_no === DNB, d.org_no);
  T('selskapsnavnet er hentet fra registeret', d.company_name === 'DNB BANK ASA', d.company_name);
  T('organisasjonsform er registerets', /allmennaksjeselskap/i.test(d.company_form || ''), d.company_form);
  T('adresse hentet fra registeret', /oslo/i.test(d.company_address || ''), d.company_address);
  T('merket bekreftet', d.company_verified === true && d.company_status === 'aktiv');
  T('bekreftelsestidspunkt lagret', !!d.company_verified_at);
}
{
  // Ugyldig org.nr: registrer bedriften, men ikke lat som at den er bekreftet.
  const res = await j('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadBody({ email: 'qa+biz2@example.com', owner_kind: 'business', org_no: '984851007', company_name: 'Ugyldig AS' })),
  });
  const id = res.body?.lead?.id || res.body?.id;
  if (id) created.push(id);
  const d = (await j(`/api/admin/lead?id=${id}&type=huseier&key=${KEY}`)).body?.lead || {};
  T('ugyldig org.nr lagres ikke', d.org_no === '', String(d.org_no));
  T('fortsatt registrert som bedrift', d.owner_kind === 'business');
  T('flagget som ikke bekreftet', d.company_verified === false && /organisasjonsnummer/i.test(d.company_verify_note || ''), d.company_verify_note);
  T('brukerens navn beholdes som oppgitt', d.company_name === 'Ugyldig AS');
}
{
  const res = await j('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadBody({ email: 'qa+priv@example.com', owner_kind: 'private' })),
  });
  const id = res.body?.lead?.id || res.body?.id;
  if (id) created.push(id);
  const d = (await j(`/api/admin/lead?id=${id}&type=huseier&key=${KEY}`)).body?.lead || {};
  T('privatperson lagres som privat', d.owner_kind === 'private');
  T('ingen selskapsdata på privatperson', !d.org_no && !d.company_name && d.company_verified === undefined);
}
{
  // Ingen owner_kind i det hele tatt (eldre klient / annet skjema).
  const res = await j('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadBody({ email: 'qa+legacy@example.com' })),
  });
  const id = res.body?.lead?.id || res.body?.id;
  if (id) created.push(id);
  const d = (await j(`/api/admin/lead?id=${id}&type=huseier&key=${KEY}`)).body?.lead || {};
  T('manglende felt tolkes som privat (bakoverkompatibelt)', d.owner_kind === 'private');
}

console.log('\n══ 6. VARSEL-E-POST NEVNER SELSKAPET ══');
{
  const { buildLeadAdminNotification } = await import('/app/lib/lead-emails.js');
  const biz = buildLeadAdminNotification({
    name: 'Ola', email: 'qa@example.com', phone: '90000000', address: 'Testveien 1',
    owner_kind: 'business', company_name: 'DNB BANK ASA', org_no: DNB, company_form: 'Allmennaksjeselskap',
    company_verified: true, company_status: 'aktiv',
  }, { kind: 'huseier' });
  T('varselet viser at det er en bedrift', /Registrerer som/.test(biz.html) && /Bedrift/.test(biz.html));
  T('varselet viser selskap og org.nr', biz.html.includes('DNB BANK ASA') && biz.html.includes(DNB));
  T('varselet viser at org.nr er bekreftet', /Bekreftet i Enhetsregisteret/.test(biz.html));

  const unver = buildLeadAdminNotification({
    name: 'Ola', email: 'qa@example.com', owner_kind: 'business', company_name: 'Ukjent AS',
    company_verified: false, company_verify_note: 'Mangler gyldig organisasjonsnummer',
  }, { kind: 'huseier' });
  T('ubekreftet org.nr flagges tydelig', /Ikke bekreftet/.test(unver.html) && /Mangler gyldig organisasjonsnummer/.test(unver.html));

  const priv = buildLeadAdminNotification({ name: 'Ola', email: 'qa@example.com', owner_kind: 'private' }, { kind: 'huseier' });
  T('privatperson får ingen tomme selskapsrader', !/Registrerer som/.test(priv.html) && !/Org\.nr sjekket/.test(priv.html));
}

console.log('\n══ 7. TESTLEADS VEKKER IKKE TEAMET ══');
{
  const { sendLeadAdminNotification } = await import('/app/lib/lead-emails.js');
  const res = await sendLeadAdminNotification({ name: 'QA', email: 'qa+biz1@example.com' }, { kind: 'huseier' });
  T('varsel til teamet hoppes over for testlead', res?.skipped === 'testlead', JSON.stringify(res));
}

console.log('\n══ 8. OPPRYDDING ══');
{
  let slettet = 0;
  for (const id of created) {
    const r = await j('/api/admin/leads/delete?key=' + KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'huseier', confirm: 'SLETT' }),
    });
    if (r.status === 200) slettet += 1;
  }
  T(`alle ${created.length} QA-leads slettet`, slettet === created.length, `slettet ${slettet}`);
  const { MongoClient } = await import('mongodb');
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  // Bare VÅRE poster. Basen inneholder eldre QA-leads fra tidligere økter, og
  // en probe skal ikke rapportere andres rot som sin egen feil.
  const rest = await c.db(process.env.DB_NAME).collection('leads').countDocuments({ id: { $in: created } });
  const oldQa = await c.db(process.env.DB_NAME).collection('leads').countDocuments({ email: { $regex: '@example\\.(com|test)$' } });
  await c.close();
  T('ingen av probens leads igjen i basen', rest === 0, `fant ${rest}`);
  if (oldQa) console.log(`  INFO ${oldQa} eldre QA-leads (@example.com/.test) ligger fortsatt i basen fra tidligere økter.`);
}

console.log(`\n══ RESULTAT: ${ok} OK, ${fails.length} feil ══`);
if (fails.length) { console.log('FEIL:'); for (const f of fails) console.log(`  · ${f}`); }
process.exit(fails.length ? 1 : 0);
