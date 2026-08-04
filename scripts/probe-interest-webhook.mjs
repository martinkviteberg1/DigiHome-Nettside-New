// PROBE: sanntidslevering av boliginteresse (webhook) + kø som sikkerhetsnett.
//
// Verifiserer kontrakten vi avtalte med plattformagenten UTEN å røre noe ekte:
// en lokal mock-mottaker validerer HMAC-signaturen selv, og alle QA-poster
// merkes med leadId «probe-wh-…» og slettes til slutt.
//
// Kjør:  node scripts/probe-interest-webhook.mjs
import fs from 'fs';
import http from 'node:http';
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const lib = await import('/app/lib/interest-webhook.js');
const {
  enqueueInterest, retryInterestWebhooks, webhookTarget, signBody, wireItem,
  buildInterestItem, deliveryView, platformThreadUrl, platformInboxUrl, platformUnitUrl,
  platformAppBase, isTestEmail, MAX_WEBHOOK_ATTEMPTS, OUTBOX_COLL,
} = lib;

let ok = 0; const fails = [];
const t = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  ✓ ${name}`); }
  else { fails.push(name); console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); }
};

// ── Mock-mottaker som oppfører seg som plattformens endepunkt ───────────────
const PORT = 4599;
const received = [];
let flakyLeft = 1;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const sig = req.headers['x-digihome-signature'] || '';
    const expect = `sha256=${crypto.createHmac('sha256', process.env.AGENT_BRIDGE_SECRET).update(body, 'utf8').digest('hex')}`;
    received.push({ path: req.url, headers: req.headers, body, sigValid: sig === expect });
    const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (sig && sig !== expect) return json(401, { success: false, error: 'ugyldig signatur' });
    if (req.url.startsWith('/ok')) return json(200, { success: true, data: { status: 'created', lead_id: 'rl-11111111' } });
    if (req.url.startsWith('/dup')) return json(200, { success: true, data: { status: 'duplicate', lead_id: 'rl-22222222' } });
    if (req.url.startsWith('/unmatched')) return json(200, { success: true, data: { status: 'unmatched', lead_id: null } });
    if (req.url.startsWith('/500')) return json(500, { success: false, error: 'nede' });
    if (req.url.startsWith('/403')) return json(403, { success: false, error: 'nektet' });
    if (req.url.startsWith('/flaky')) {
      if (flakyLeft > 0) { flakyLeft -= 1; return json(503, { success: false, error: 'ustabil' }); }
      return json(200, { success: true, data: { status: 'created', lead_id: 'rl-33333333' } });
    }
    if (req.url.startsWith('/slow')) { setTimeout(() => json(200, { success: true, data: { status: 'created', lead_id: 'rl-slow' } }), 1500); return; }
    return json(404, { success: false, error: 'ukjent' });
  });
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const mock = (p) => `http://127.0.0.1:${PORT}${p}`;

// ── Mongo ──────────────────────────────────────────────────────────────────
const client = new MongoClient(process.env.MONGO_URL);
await client.connect();
const db = client.db(process.env.DB_NAME);
const coll = db.collection(OUTBOX_COLL);
const MARK = 'probe-wh-';
const lead = (n) => ({ id: `${MARK}${n}`, name: 'QA Interessent', email: 'qa+webhook@example.com', phone: '90000000', platform_id: null });
const ev = (n) => ({
  unitId: `unit-${n}`, propertyId: `unit-${n}`, localPropertyId: `local-${n}`,
  propertyTitle: 'Lys 2-roms', propertyAddress: 'Testveien 1A, 0150 Oslo',
  propertySlug: 'testveien-1a', propertyUrl: 'https://digihome.no/ledige-boliger/testveien-1a',
  rentalScope: 'begge', scope: ['rom'], scopeLabel: 'Rom i bofellesskap',
  message: 'Hei, er rommet ledig fra 1. september?', source: 'ledige-boliger', at: new Date().toISOString(),
});
const doc = (leadId) => coll.findOne({ leadId }, { projection: { _id: 0 } });

const ENV_KEEP = { ...process.env };
const setEnv = (patch) => {
  for (const k of ['DIGIHOME_INTEREST_WEBHOOK_URL', 'DIGIHOME_INTEREST_WEBHOOK_URL_PROD', 'DIGIHOME_APP_URL', 'DIGIHOME_APP_URL_PROD', 'NEXT_PUBLIC_BASE_URL', 'INTEREST_WEBHOOK_TIMEOUT_MS']) {
    if (k in patch) { if (patch[k] === null) delete process.env[k]; else process.env[k] = patch[k]; }
    else process.env[k] = ENV_KEEP[k];
  }
  for (const k of ['DIGIHOME_INTEREST_WEBHOOK_URL_PROD', 'DIGIHOME_APP_URL_PROD', 'INTEREST_WEBHOOK_TIMEOUT_MS']) {
    if (!(k in patch) && !(k in ENV_KEEP)) delete process.env[k];
  }
};

console.log('\n══ 1. SIGNATUR OG PAYLOAD-FORM ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/ok') });
{
  const id = await enqueueInterest(db, lead('sig'), ev('sig'));
  const d = await doc(`${MARK}sig`);
  const r = received.at(-1);
  t('webhooken ble kalt', !!r && r.path === '/ok');
  t('HMAC-SHA256 over rå body validerer hos mottaker', !!r?.sigValid);
  t('signaturen har formen sha256=<hex>', /^sha256=[0-9a-f]{64}$/.test(String(r?.headers['x-digihome-signature'] || '')));
  t('x-bridge-token sendes som alternativ auth', r?.headers['x-bridge-token'] === process.env.AGENT_BRIDGE_SECRET);
  t('idempotensnøkkel = item.id i header', r?.headers['x-idempotency-key'] === id);
  const sent = JSON.parse(r.body);
  t('body er { item: {...} }', !!sent.item && typeof sent.item === 'object');
  const it = sent.item;
  const need = ['id', 'leadId', 'unitId', 'contact', 'message', 'scope', 'scopeLabel', 'rentalScope', 'propertyAddress', 'propertyUrl', 'at'];
  t(`alle avtalte felt er med (${need.length})`, need.every((k) => it[k] !== undefined), need.filter((k) => it[k] === undefined).join(','));
  t('kontakt har navn/e-post/telefon', it.contact?.email === 'qa+webhook@example.com' && !!it.contact.name && !!it.contact.phone);
  t('intern køtilstand lekker ikke over tråden', it.status === undefined && it.webhookAttempts === undefined && it.deliveredVia === undefined);
  t('item.id i payload = item.id i basen', it.id === d?.id);
  t('QA-e-post merkes test:true', d?.test === true && isTestEmail('qa+webhook@example.com'));
}

console.log('\n══ 2. VELLYKKET LEVERING ══');
{
  const d = await doc(`${MARK}sig`);
  t('status = delivered', d?.status === 'delivered');
  t('deliveredVia = webhook', d?.deliveredVia === 'webhook');
  t('platformRef fra data.lead_id', d?.platformRef === 'rl-11111111');
  t('platformStatus = created', d?.platformStatus === 'created');
  t('webhookAttempts = 1', d?.webhookAttempts === 1);
  t('ingen ny planlagt push', d?.nextWebhookAt === null && d?.webhookGaveUp === false);
  const v = deliveryView(d, d?.unitId);
  t('deep-link til samtalen bygges av platformRef', v.threadUrl === `${platformAppBase()}/portal/meldinger/rl-11111111`, v.threadUrl || 'null');
}

console.log('\n══ 3. FEIL SOM KAN PRØVES IGJEN (5xx) ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/500') });
{
  await enqueueInterest(db, lead('500'), ev('500'));
  const d = await doc(`${MARK}500`);
  t('posten blir liggende pending (pullen tar den)', d?.status === 'pending');
  t('gir ikke opp ennå', d?.webhookGaveUp === false);
  t('nytt forsøk planlagt med backoff', !!d?.nextWebhookAt && new Date(d.nextWebhookAt) > new Date());
  t('http-kode og feiltekst lagret', d?.lastWebhookHttp === 500 && !!d?.lastWebhookError);
  t('ingen falsk platformRef', !d?.platformRef);
}

console.log('\n══ 4. SVEIP: NYTT FORSØK LYKKES ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/flaky') });
{
  await enqueueInterest(db, lead('flaky'), ev('flaky'));   // 1. forsøk: 503
  const first = await doc(`${MARK}flaky`);
  t('første forsøk feilet og står i kø', first?.status === 'pending' && first?.webhookAttempts === 1);
  // Forfall nå — vi tester logikken, ikke klokka.
  await coll.updateOne({ leadId: `${MARK}flaky` }, { $set: { nextWebhookAt: new Date(Date.now() - 1000).toISOString() } });
  const sweep = await retryInterestWebhooks(db, { limit: 50 });
  const d = await doc(`${MARK}flaky`);
  t('sveipen leverte posten', d?.status === 'delivered' && d?.deliveredVia === 'webhook');
  t('forsøksteller økte til 2', d?.webhookAttempts === 2);
  t('sveipen rapporterer levert', sweep.delivered >= 1, JSON.stringify(sweep));
}

console.log('\n══ 5. PERMANENT FEIL (4xx) — GIR OPP SANNTID, ALDRI KØEN ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/403') });
{
  await enqueueInterest(db, lead('403'), ev('403'));
  const d = await doc(`${MARK}403`);
  t('status fortsatt pending', d?.status === 'pending');
  t('markert som oppgitt etter ett forsøk', d?.webhookGaveUp === true && d?.webhookAttempts === 1);
  t('ingen ny push planlagt', d?.nextWebhookAt === null);
  setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/ok') });
  const before = received.length;
  await retryInterestWebhooks(db, { limit: 50 });
  const after = await doc(`${MARK}403`);
  t('sveipen plukker ikke opp oppgitte poster', after?.webhookAttempts === 1 && received.length === before);
}

console.log('\n══ 6. FORSØKSTAK ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/500') });
{
  await enqueueInterest(db, lead('tak'), ev('tak'));
  await coll.updateOne({ leadId: `${MARK}tak` }, { $set: { webhookAttempts: MAX_WEBHOOK_ATTEMPTS - 1, nextWebhookAt: new Date(Date.now() - 1000).toISOString(), webhookGaveUp: false } });
  await retryInterestWebhooks(db, { limit: 50 });
  const d = await doc(`${MARK}tak`);
  t(`gir opp ved ${MAX_WEBHOOK_ATTEMPTS} forsøk`, d?.webhookAttempts === MAX_WEBHOOK_ATTEMPTS && d?.webhookGaveUp === true);
  t('posten er fortsatt pending for pullen', d?.status === 'pending');
}

console.log('\n══ 7. PLATTFORMSVAR: duplicate / unmatched ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/dup') });
{
  await enqueueInterest(db, lead('dup'), ev('dup'));
  const d = await doc(`${MARK}dup`);
  t('duplicate regnes som levert', d?.status === 'delivered' && d?.platformStatus === 'duplicate');
}
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/unmatched') });
{
  await enqueueInterest(db, lead('unm'), ev('unm'));
  const d = await doc(`${MARK}unm`);
  t('unmatched regnes som levert (de lagrer den)', d?.status === 'delivered' && d?.platformStatus === 'unmatched');
  const v = deliveryView(d, d?.unitId);
  t('uten lead_id blir det ingen deep-link', v.threadUrl === null);
  t('men per-bolig-lenke finnes', typeof v.unitUrl === 'string' && v.unitUrl.includes('/utleie/unit-unm'));
}

console.log('\n══ 8. TIDSAVBRUDD ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: mock('/slow'), INTEREST_WEBHOOK_TIMEOUT_MS: '300' });
{
  const t0 = Date.now();
  await enqueueInterest(db, lead('slow'), ev('slow'));
  const ms = Date.now() - t0;
  const d = await doc(`${MARK}slow`);
  t('avbrytes raskt — interessenten venter ikke', ms < 1400, `${ms}ms`);
  t('tidsavbrudd gir nytt forsøk senere', d?.status === 'pending' && d?.lastWebhookHttp === 0 && !!d?.nextWebhookAt);
  t('feilteksten sier tidsavbrudd', /tidsavbrudd/.test(String(d?.lastWebhookError || '')));
}

console.log('\n══ 9. IKKE KONFIGURERT = KØEN ALENE ══');
setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: null });
{
  const before = received.length;
  await enqueueInterest(db, lead('nourl'), ev('nourl'));
  const d = await doc(`${MARK}nourl`);
  t('interessen havner likevel i køen', !!d && d.status === 'pending');
  t('ingen push forsøkt', received.length === before && d?.webhookAttempts === 0);
  const sweep = await retryInterestWebhooks(db, { limit: 5 });
  t('sveipen sier hvorfor den hoppet av', sweep.skipped === 'webhook ikke konfigurert', JSON.stringify(sweep));
}

console.log('\n══ 10. VERN MOT FEIL MÅL ══');
{
  setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: `${ENV_KEEP.NEXT_PUBLIC_BASE_URL}/api/public/property-interest/incoming` });
  t('nekter å pushe til oss selv', webhookTarget().reason === 'webhook peker på oss selv', JSON.stringify(webhookTarget()));

  setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: 'https://forvalter-redesign.preview.emergentagent.com/api/public/property-interest/incoming', NEXT_PUBLIC_BASE_URL: 'https://digihome.no' });
  t('produksjon pusher ikke til et preview', webhookTarget().reason === 'preview-endepunkt blokkert fra produksjon', JSON.stringify(webhookTarget()));

  setEnv({
    DIGIHOME_INTEREST_WEBHOOK_URL: 'https://forvalter-redesign.preview.emergentagent.com/api/public/property-interest/incoming',
    DIGIHOME_INTEREST_WEBHOOK_URL_PROD: 'https://app.digihome.no/api/public/property-interest/incoming',
    NEXT_PUBLIC_BASE_URL: 'https://digihome.no',
  });
  t('produksjon bruker prod-endepunktet når det finnes', webhookTarget().ok === true && webhookTarget().host === 'app.digihome.no');
  t('deep-link i produksjon peker aldri på et preview', platformAppBase() === 'https://app.digihome.no', String(platformAppBase()));

  setEnv({ DIGIHOME_INTEREST_WEBHOOK_URL: 'ikke-en-url' });
  t('ugyldig URL avvises', webhookTarget().ok === false);
}

console.log('\n══ 11. LENKER TIL SAMTALEN ══');
setEnv({});
{
  t('deep-link til én samtale', platformThreadUrl('rl-abc') === 'https://forvalter-redesign.preview.emergentagent.com/portal/meldinger/rl-abc', String(platformThreadUrl('rl-abc')));
  t('innboks-lenke', platformInboxUrl() === 'https://forvalter-redesign.preview.emergentagent.com/portal/meldinger');
  t('per-bolig-lenke', platformUnitUrl('u-1') === 'https://forvalter-redesign.preview.emergentagent.com/utleie/u-1');
  t('uten referanse: ingen deep-link', platformThreadUrl(null) === null);
  setEnv({ DIGIHOME_APP_URL: null });
  t('faller tilbake på plattformens prod-vert, aldri vår egen', platformAppBase() === 'https://app.digihome.no', String(platformAppBase()));
  const v = deliveryView(null, 'u-9');
  t('interesse uten køpost markeres «ukjent»', v.status === 'ukjent' && v.threadUrl === null);
}

console.log('\n══ 12. WIRE-FORM OG SIGNATUR ER STABIL ══');
{
  const item = buildInterestItem(lead('x'), ev('x'), { campaignId: 'kamp-1' });
  const w = wireItem(item);
  t('campaignId følger med (nyhetsbrev-kilde)', w.campaignId === 'kamp-1');
  t('wireItem fjerner status/tellere', w.status === undefined && w.webhookAttempts === undefined);
  const raw = JSON.stringify({ item: w });
  t('samme body gir samme signatur', signBody(raw, 'hemmelig') === signBody(raw, 'hemmelig'));
  t('endret body gir ny signatur', signBody(raw, 'hemmelig') !== signBody(`${raw} `, 'hemmelig'));
  t('annen hemmelighet gir annen signatur', signBody(raw, 'hemmelig') !== signBody(raw, 'annen'));
}

// ── Rydd QA-data. Preview-basen skal ikke bære spor av prober. ──────────────
const del = await coll.deleteMany({ leadId: { $regex: `^${MARK}` } });
console.log(`\nRyddet ${del.deletedCount} QA-poster fra ${OUTBOX_COLL}.`);
const rest = await coll.countDocuments({ leadId: { $regex: `^${MARK}` } });
t('ingen QA-poster igjen', rest === 0);

await client.close();
server.close();

console.log(`\n══ RESULTAT: ${ok} OK, ${fails.length} feil ══`);
if (fails.length) { console.log('FEIL:'); for (const f of fails) console.log(`  · ${f}`); }
process.exit(fails.length ? 1 : 0);
