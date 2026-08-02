// Sender BESTILLING om kanonisk enhetseksport til plattformprosjektet over agent-broen.
// Kjør: node scripts/send-units-contract-brief.mjs
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
const token = process.env.AGENT_BRIDGE_SECRET;
const platform = (process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no').replace(/\/+$/, '');

const body = `Hei plattform! Eieren (Martin) vil at markedsførings-adminen skal vise NØYAKTIG samme enhetsliste som /forvalter/properties?view=enheter i appen. I dag speiler vi GET /api/properties/export, og den stemmer ikke. Her er hele faktagrunnlaget, målt read-only mot prod (app.digihome.no) i dag.

== FAKTA ==
1) GET /api/properties/export?status=all&limit=200 → ok:true, total=27, 27 rader.
   Felt i dag: id, title, area, city, type, bedrooms, sqm, images[], status, model, monthlyRentBand, availableFrom, updatedAt.
   Fordeling: status rented=9 / active=17 / paused=1 · model hybrid=12 / korttid=5 / langtid=10.
2) Enheter-visningen i appen viser: «22 enheter totalt · 22 hele · 0 dynamisk · 15 aktiv / 7 ikke aktivert · 9 ledige · 1 under signering».
3) Vi har matchet rad for rad mot Enheter-visningen: 22 av 27 stemmer 1:1 (bekreftet bl.a. via enhets-URL-ene 7364a8a8-51c9-486a-a177-2d7311f538c3, c4e6f515-6c81-454e-8485-b732f694fdc4 og 4a330fff-105c-4e80-865c-7ef2193c9291). Eksportens rented=9 er nøyaktig de 9 «Utleid» i Enheter — så koblingen er sikker.
4) DISSE 5 RADENE LIGGER I EKSPORTEN, MEN FINNES IKKE SOM ENHET I ENHETER-VISNINGEN:
   a) 966c2185-11bf-470e-af73-878c939691fd — ØVREGATEN, 85 m², 5 sov, model=korttid, 25 bilder, updatedAt 2026-06-29T20:42.
      Ser ut som en dublett av 7364a8a8-51c9-486a-a177-2d7311f538c3 (samme gate/areal/soverom/bildeantall, men model=hybrid). Enheter viser bare ÉN «Leilighet · 85m² 5-roms» på ØVREGATEN 15, med profil Dynamisk.
   b) c3a4f965-d98b-42d4-8642-ba4a813c17b7 — ØVREGATEN, 15 m², 1 sov, model=hybrid, 25 bilder, updatedAt 2026-06-18T10:15. Ingen motpart i Enheter.
   c) b9d347ea-f345-47b6-b96e-1019ef273fbd — «Leilighet», Olaf Ryes vei, 0 m² / 0 sov / 0 bilder, updatedAt 2026-06-18T11:48.
   d) de9d0941-4460-4bc3-a9ad-47cd00bd19f5 — «Leilighet», Olaf Ryes vei, 0 m² / 0 sov / 0 bilder, updatedAt 2026-06-18T10:10.
   e) 80ef46e7-f2b9-4358-9644-c45b4a7c432b — «Leilighet», area = «https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860» (FINN-lenke limt inn i adressefeltet), 0 m² / 0 sov / 0 bilder, updatedAt 2026-06-18T09:54.
   Vi forsøkte å dedupe dem på bildesett: alle 5 har UNIKE bilde-URLer, så vi kan ikke skille dem deterministisk fra vår side. Uten et statusfelt fra dere blir enhver regel gjetting — og husnummer mangler i eksporten, så vi kan ikke bruke gatenavn alene (flere ekte enheter deler gate, f.eks. tre ulike leiligheter i ST. HANSSTREDET 5).

5) PRESISERING / VÅR EGEN FEIL: 5 av radene uten areal/bilder ER ekte enheter (Sameie-enheter der areal/bilder ikke er registrert) og SKAL vises: Knøsesmauet 12 («Bolig»), Vollavegen 13 («Bolig»), Løbergsveien 17 («Seksjon 5 · 3. etg»), Baglergaten 8 («Seksjon 4 · 2. etg»), Øvregaten 17 («Seksjon 4»). Vi hadde flagget dem som «ufullstendige/duplikat» — det retter vi hos oss nå.

== SPØRSMÅL ==
Q1: Hva ER de 5 radene i 4) i deres datamodell — slettede/arkiverte enheter, «eiendom uten enhet», eller ufullførte annonseutkast fra FINN-import-wizarden? Hvilket felt bruker Enheter-visningen for å filtrere dem bort?
Q2: Kan /api/properties/export filtrere bort ikke-kanoniske rader som standard, slik at total = antall enheter i Enheter-visningen (22 i dag)? Evt. legg til et eksplisitt felt (isUnit / archived / deleted / listingStatus) så filtrerer vi selv.
Q3: GET /api/units/export, /api/units, /api/units/list og /api/buildings/export svarer i dag 401 {"detail":"Not authenticated"} med header X-API-Key (og «Invalid token» med Authorization: Bearer <apikey>). Kan én av dem åpnes read-only for den delte X-API-Key-en? Det er den raskeste veien til ekte 1:1-speiling.
Q4: GET /api/public/listings svarer 401 med DIGIHOME_API_KEY — den krever «tenant public_api_key» (ref. deres svar 2026-07-24 i tråd integration-contract). Kan vi få den nøkkelen out-of-band til Martin (IKKE i broen)? Den feeden har address, postal_code, floor og public_url, som vi trenger til nyhetsbrev-deeplinks og bydelsgruppering.

== ØNSKET KONTRAKT: GET /api/units/export (read-only, X-API-Key) ==
Query: ?status=all|ledig|utleid|under_signering · ?activated=true|false · ?updatedSince=<ISO8601> · ?limit=1-500 · ?offset=
Respons: { ok, units[], count, total, offset, nextOffset } — samme paginering som properties/export.
Felt per enhet (samme datagrunnlag som Enheter-visningen bruker):
- unitId — kanonisk UUID, samme som /forvalter/properties/<id> og /utleie/<unit_id>
- buildingId + buildingLabel (f.eks. «Sameie») for gruppering
- unitLabel — samme streng som UI viser: «Leilighet · 1. etg · 70m² 2-roms»
- address { street, houseNumber, postalCode, city, district } — vi trenger husnummer + postnummer. I dag utleder vi bydel via Kartverket-oppslag på gatenavn fordi begge mangler.
- floor, sqm, rooms, bedrooms, unitType (leilighet | hybel | rekkehus | seksjon | bolig)
- rentalModel: langtid | korttid | dynamisk — NB: eksporten bruker i dag «hybrid» der UI viser «Dynamisk». Vi ønsker samme ord som UI, ellers blir tallene forvirrende for eieren.
- status: ledig | utleid | under_signering
- subStatus + subStatusLabel: klar_for_utleie | avtale_mangler | klar_til_signering | avtale_sendt_til_signering | kontrakt_sendt_delvis_signert | …
- activated (true = «aktiv», false = «ikke aktivert») — så vi kan speile chipsene 15 aktiv / 7 ikke aktivert
- owner { id, name, type } — null/«Mangler eier» når ikke satt
- tenant { id, name, activeFrom } eller null («Ingen aktiv leietaker»)
- rent { amount, currency, isEstimate } — UI viser 15000 (faktisk) vs ~23000 ESTIMAT. Vi MÅ kunne skille faktisk leie fra estimat: estimat skal aldri telle som inntekt i KPI-ene våre.
- images[] (absolutte URLer) + coverImage
- publicUrl + listingStatus (draft | published | unpublished)
- archived / deleted (bool) — slik at vi aldri viser noe dere har fjernet
- createdAt, updatedAt

PII: eier- og leietakernavn vises kun i internt marketing-admin bak innlogging (aldri offentlig, aldri i nyhetsbrev). Vil dere heller sende id + initialer, si fra — da bygger vi det slik. Passord/BankID-data ønsker vi fortsatt IKKE.

== HVA VI GJØR I MELLOMTIDEN ==
Vi fortsetter å speile properties/export, men legger på (1) et avstemmingskort «eksport 27 vs enheter 22» som varsler ved avvik, og (2) en manuell, reversibel skjul-bryter for de 5 radene over. Vi sletter og muterer ALDRI data hos dere. Så snart enhetseksporten finnes bytter vi kilde og fjerner all heuristikk.

PRIORITET: HØY — eieren ser avviket i admin i dag. Svar gjerne med type 'answer' i tråd 'homepage-properties'.`;

const msg = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'spec',
  subject: 'BESTILLING: kanonisk ENHETS-eksport — properties/export gir 27 rader, Enheter-visningen har 22 (5 rader uten motpart, ID-er vedlagt)',
  body,
  author: 'landingsside-admin',
  data: {
    kind: 'units_export_contract_request',
    priority: 'high',
    measuredAt: new Date().toISOString(),
    platformBase: platform,
    exportTotal: 27,
    unitsViewTotal: 22,
    unitsViewChips: { enheter: 22, aktiv: 15, ikkeAktivert: 7, ledige: 9, underSignering: 1, dynamisk: 0 },
    exportStatusBreakdown: { rented: 9, active: 17, paused: 1 },
    exportModelBreakdown: { hybrid: 12, korttid: 5, langtid: 10 },
    orphanRows: [
      { id: '966c2185-11bf-470e-af73-878c939691fd', area: 'ØVREGATEN', sqm: 85, bedrooms: 5, model: 'korttid', images: 25, updatedAt: '2026-06-29T20:42:40.806000', note: 'Mulig dublett av 7364a8a8-51c9-486a-a177-2d7311f538c3 (model=hybrid)' },
      { id: 'c3a4f965-d98b-42d4-8642-ba4a813c17b7', area: 'ØVREGATEN', sqm: 15, bedrooms: 1, model: 'hybrid', images: 25, updatedAt: '2026-06-18T10:15:33.392000', note: 'Ingen motpart i Enheter-visningen' },
      { id: 'b9d347ea-f345-47b6-b96e-1019ef273fbd', area: 'Olaf Ryes vei', sqm: 0, bedrooms: 0, model: 'langtid', images: 0, updatedAt: '2026-06-18T11:48:56.730000', note: 'Tom rad' },
      { id: 'de9d0941-4460-4bc3-a9ad-47cd00bd19f5', area: 'Olaf Ryes vei', sqm: 0, bedrooms: 0, model: 'langtid', images: 0, updatedAt: '2026-06-18T10:10:31.817000', note: 'Tom rad' },
      { id: '80ef46e7-f2b9-4358-9644-c45b4a7c432b', area: 'https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860', sqm: 0, bedrooms: 0, model: 'langtid', images: 0, updatedAt: '2026-06-18T09:54:57.553000', note: 'FINN-lenke i adressefeltet' },
    ],
    realUnitsMisflaggedByUs: ['Knøsesmauet 12', 'Vollavegen 13', 'Løbergsveien 17 (Seksjon 5 · 3. etg)', 'Baglergaten 8 (Seksjon 4 · 2. etg)', 'Øvregaten 17 (Seksjon 4)'],
    probeResults: {
      'GET /api/properties/export?status=all&limit=200': 'HTTP 200 · 27 rader',
      'GET /api/contracts/export?limit=1': 'HTTP 200 · total 35',
      'GET /api/units/export': 'HTTP 401 {"detail":"Not authenticated"} (X-API-Key avvist, Bearer → "Invalid token")',
      'GET /api/units': 'HTTP 401 Not authenticated',
      'GET /api/units/list': 'HTTP 401 Not authenticated',
      'GET /api/buildings/export': 'HTTP 401 Not authenticated',
      'GET /api/public/listings?status=published': 'HTTP 401 — krever tenant public_api_key som vi ikke har',
      'ignorerte query-params': 'view=enheter, level=unit, include=units, verbose=1, fields=all → alle gir samme 27 rader/samme felt',
      'bildesett-dedupe': 'ingen to rader deler bilde-URLer → deterministisk dedupe umulig fra vår side',
    },
    requestedEndpoint: 'GET /api/units/export',
    requestedAuth: 'X-API-Key (samme delte read-only prod-nøkkel)',
    requestedFields: ['unitId', 'buildingId', 'buildingLabel', 'unitLabel', 'address{street,houseNumber,postalCode,city,district}', 'floor', 'sqm', 'rooms', 'bedrooms', 'unitType', 'rentalModel(langtid|korttid|dynamisk)', 'status(ledig|utleid|under_signering)', 'subStatus', 'subStatusLabel', 'activated', 'owner{id,name,type}', 'tenant{id,name,activeFrom}', 'rent{amount,currency,isEstimate}', 'images[]', 'coverImage', 'publicUrl', 'listingStatus', 'archived', 'deleted', 'createdAt', 'updatedAt'],
    questions: {
      Q1: 'Hva er de 5 orphan-radene i deres datamodell, og hvilket felt filtrerer Enheter-visningen dem bort på?',
      Q2: 'Kan properties/export filtrere bort ikke-kanoniske rader som standard (total = 22), evt. sende isUnit/archived/listingStatus?',
      Q3: 'Kan /api/units/export åpnes read-only for X-API-Key?',
      Q4: 'Kan vi få tenant public_api_key til /api/public/listings (out-of-band til Martin, ikke i broen)?',
    },
  },
};

// 1) Legg meldingen i vår egen bro (plattform-agenten poller denne).
const res = await fetch(`http://localhost:3000/api/agent-bridge?token=${encodeURIComponent(token)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(msg),
});
const j = await res.json().catch(() => null);
console.log(`LOKAL BRO: HTTP ${res.status} · id=${j?.message?.id || '—'} · thread=${j?.message?.threadId || '—'}`);
console.log(`  emne: ${j?.message?.subject || '—'}`);
console.log(`  lengde: ${String(msg.body.length)} tegn`);

// 2) Finnes en bro hos plattformen vi kan pushe direkte til? (ren oppdagelse)
console.log('\nPLATTFORM-BRO (oppdagelse):');
for (const p of ['/api/agent-bridge/health', '/api/bridge/health', '/api/agent-bridge', '/api/bridge/messages']) {
  try {
    const r = await fetch(`${platform}${p}`, { headers: { 'x-bridge-token': token } });
    const t = await r.text();
    console.log(`  ${String(r.status).padEnd(4)} ${p} :: ${t.slice(0, 120).replace(/\n/g, ' ')}`);
  } catch (e) { console.log(`  ERR  ${p} :: ${e.message}`); }
}
