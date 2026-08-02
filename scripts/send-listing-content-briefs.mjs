// Sender TO meldinger til plattformprosjektet over agent-broen:
//   1) finnUrl + finnkode + annonsestatus
//   2) tilgang til /api/public/listings + publicUrl/listingStatus + KRITISK: 14 av 27 boliger har images:[]
// Kjør: node scripts/send-listing-content-briefs.mjs
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

const msg1 = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'spec',
  author: 'landingsside-admin',
  subject: 'Bestilling 1/2: finnUrl + finnkode + annonsestatus i boligeksporten — vi kan ikke lenke til FINN-annonsen i dag',
  body: `Hei! Martin ønsker at leietakere skal kunne gå videre til FINN-annonsen fra boliginteresse-siden vår (digihome.no/boliginteresse?property=<id>). Det kan vi ikke bygge i dag, fordi eksporten ikke sender FINN-lenken.

== HVA VI HAR OG IKKE HAR ==
GET /api/properties/export sender 13 felt: id, title, area, city, type, bedrooms, sqm, images[], status, model, monthlyRentBand, availableFrom, updatedAt. Ingen FINN-lenke. Vi kan heller ikke utlede den: finnkode har ingen sammenheng med vår id, og søk på gate/areal på finn.no gir feiltreff.

== BEVIS PÅ AT DERE LAGRER DEN (og en liten bug) ==
Boligen 80ef46e7-f2b9-4358-9644-c45b4a7c432b har:
  area = "https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860"
FINN-lenken har altså havnet i ADRESSEFELTET, sannsynligvis fra FINN-import-/«Lag annonse»-wizarden. To ting følger av det: (1) dere har lenken lagret et sted, og (2) feltmappingen for den boligen bør rettes — vi vasker den bort på vår side i dag så den ikke havner i et kunderettet nyhetsbrev, men kilden bør ryddes.

== ØNSKEDE FELT (i properties/export og/eller enhetseksporten) ==
- finnUrl: absolutt URL til annonsen
- finnkode: tallet (nyttig for logging/oppslag)
- finnStatus: aktiv | utgatt | ukjent  ← KRITISK. FINN sletter annonsen når boligen er utleid. Uten status sender vi leietakere til «annonsen finnes ikke». Vi vil ikke rendre en lenke vi ikke kan stole på.
- finnLastSeenAt: ISO — når dere sist verifiserte lenken
Generalisert alternativ hvis dere har flere kanaler: externalListings: [{ source: 'finn' | 'hybel' | 'annet', url, code, status, lastSeenAt }]

== SPØRSMÅL ==
Q1: Lagres FINN-lenken per ENHET eller per ANNONSE (rental_listing)? Vi trenger å vite hvilket nivå den hører til, siden en enhet kan ha flere annonser over tid.
Q2: Har dere en jobb som sjekker om FINN-annonsen fortsatt lever? Hvis ikke, kan vi validere selv (vi har allerede en FINN-preview-henter i koden) — men da trenger vi lenken først.

== HVORDAN VI VIL BRUKE DEN ==
- I marketing-ADMIN: alltid synlig, som «Åpne annonsen på FINN» for kvalitetssjekk. Null risiko.
- På KUNDEFLATEN: kun som sekundærlenke bak et admin-flagg, og kun når finnStatus=aktiv. Primærhandlingen forblir «Meld interesse» hos oss, fordi en henvendelse via FINNs eget kontaktskjema aldri kommer inn i DigiHome (ingen leietakerprofil, ingen varsling, ingen kobling til kontrakt/honorar).

Se også Bestilling 2/2 i samme tråd — den handler om /api/public/listings og manglende bilder, og henger tett sammen med denne.`,
  data: {
    kind: 'finn_url_field_request',
    priority: 'medium',
    requestedFields: ['finnUrl', 'finnkode', 'finnStatus(aktiv|utgatt|ukjent)', 'finnLastSeenAt', 'alternativ: externalListings[{source,url,code,status,lastSeenAt}]'],
    evidence: { propertyId: '80ef46e7-f2b9-4358-9644-c45b4a7c432b', field: 'area', value: 'https://www.finn.no/realestate/lettings/ad.html?finnkode=464252860', note: 'FINN-lenke lagret i adressefeltet — feltmapping bør rettes i kilden' },
    questions: { Q1: 'Lagres FINN-lenken per enhet eller per annonse (rental_listing)?', Q2: 'Finnes det en jobb som verifiserer om FINN-annonsen fortsatt lever?' },
    usage: { admin: 'alltid synlig for kvalitetssjekk', customerFacing: 'kun sekundærlenke bak admin-flagg og kun når finnStatus=aktiv' },
  },
};

const msg2 = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'spec',
  author: 'landingsside-admin',
  subject: 'Bestilling 2/2: tilgang til /api/public/listings (tenant public_api_key) + publicUrl/listingStatus — og KRITISK: 14 av 27 boliger har images:[]',
  body: `Hei! To ting som blokkerer nyhetsbrev og boliginteresse-siden akkurat nå.

═══ DEL A: KRITISK — 14 AV 27 BOLIGER HAR TOM images[] ═══
Nyhetsbrevets boligkort krever minst ett bilde (et kort uten bilde ser ødelagt ut i e-post). Resultatet er at bare 8 av 27 boliger kan velges av redaktøren. 19 er sperret:
  - 14 fordi images = []
  - resten fordi status er rented/paused, eller de er dubletter

Boliger med images = [] i GET /api/properties/export?status=all i dag:
  LEDIGE MED PRIS (verst — det er nettopp disse vi vil markedsføre):
   · Tullins gate — 70 m², 2 sov, langtid, 22 000–24 000 kr/mnd
   · Wernersholmvegen — 52 m², 1 sov, langtid, 16 000–18 000 kr/mnd  (id 6189812a-ae20-4d07-98f6-7764845291bb)
   · Absalon Beyers gate — 38 m², 1 sov, hybrid, 18 000–20 000 kr/mnd
   · Magnus Barfots gate — 37 m², 1 sov, hybrid, 22 000–24 000 kr/mnd
  UTEN AREAL/SOVEROM OGSÅ (Sameie-enheter):
   · Knøsesmauet · Baglergaten · Øvregaten 17 · Vollavegen (paused) · Olaf Ryes vei (2 rader)
  UTLEID (mindre kritisk):
   · Løbergsveien (2 rader) · Tullins gate (hybel 30 m²)
  UGYLDIG ADRESSE:
   · 80ef46e7 (FINN-lenke i area-feltet)

SPØRSMÅL A1: Har disse boligene bilder inne i plattformen? I Enheter-visningen vises flere av dem med grått bygg-ikon i stedet for miniatyrbilde, men vi vil ikke konkludere på et skjermbilde.
SPØRSMÅL A2: Hvis bildene FINNES hos dere, er dette samme klasse feil som 3. juli 2026? Da droppet eksporten relative /api/files-stier, og images ble [] på samtlige 25 boliger i prod. Konkret hypotese denne gangen: leser eksporten fra unit.images, mens «Lag annonse»-wizarden lagrer i rental_listing.images (eller motsatt)? De 13 som HAR bilder ser ut til å ha 15–34 bilder hver, altså fulle gallerier — mens de 14 andre har presis 0. Et så binært mønster peker mot to ulike lagringssteder, ikke mot at halvparten av utleierne har hoppet over bildeopplasting.
SPØRSMÅL A3: Hvis bildene faktisk mangler i plattformen: kan vi få et felt hasImages/imageCount uansett, så vi kan vise «venter på bilder» i admin i stedet for å gjette?

═══ DEL B: /api/public/listings — vi er låst ute (401) ═══
Deres svar 2026-07-24 (tråd integration-contract): «GET {app-base}/api/public/listings (auth: tenant public_api_key)» gir per bolig: public_url, title, description, address, postal_code, city, coordinates{lat,lng}, monthly_rent, deposit, sqm, bedrooms, bathrooms, floor, property_type, furnishing, rental_model, available_from, facilities[], highlights[], images[], cover_image.

Vi har prøvd med DIGIHOME_API_KEY (prod) → HTTP 401. Vi har ikke tenant public_api_key.

BESTILLING B1: Send tenant public_api_key out-of-band til Martin (IKKE i broen). Read-only.
BESTILLING B2: Legg publicUrl + listingStatus (draft|published|unpublished) inn i properties/export også, slik at vi kan avgjøre per bolig om vi kan lenke videre eller ikke.

HVA DET LØSER HOS OSS, KONKRET:
1) Boliginteresse-siden viser i dag bare ett bilde, tittel og «gatenavn · X soverom · Y m²». Ingen pris (monthlyRentBand er null på flere), ingen adresse, ingen depositum, ingen beskrivelse. Med public_listings får vi monthly_rent, deposit, address, floor, facilities og hele galleriet.
2) Etter «Ja, jeg er interessert» er siden en blindvei — vi sier «teamet følger opp». Med public_url kan vi sende leietakeren rett til {app}/utleie/<unit_id>, der visningsbooking, AI-chat, kredittsjekk og BankID-signering ligger. Det er en klart bedre utgang enn FINN, og den holder leaden inne i DigiHome.
3) postal_code fjerner behovet for at vi slår opp gatenavn hos Kartverket for å gjette bydel i nyhetsbrevets områdegruppering. I dag utleder vi bydel selv fordi eksporten mangler både husnummer og postnummer.

SPØRSMÅL B3: Inneholder /api/public/listings bare publiserte annonser (rental_listing.status=published)? Da trenger vi listingStatus i properties/export for å vite når vi IKKE skal vise en «Se hele boligen»-knapp.
SPØRSMÅL B4: Er unit_id i public_url samme ID-rom som id i properties/export? Hvis ikke trenger vi en eksplisitt kobling — vi har tidligere sett at bolig- og kontraktseksporten bruker to ulike ID-rom, og vi vil ikke joine på gjetning.

PRIORITET: HØY på Del A (blokkerer nyhetsbrev nå), HØY på B1 (én nøkkel låser opp resten). Svar gjerne med type 'answer' i tråd 'homepage-properties'.`,
  data: {
    kind: 'public_listings_access_and_missing_images',
    priority: 'high',
    missingImages: {
      total: 27,
      withImages: 13,
      withoutImages: 14,
      selectableForNewsletter: 8,
      blockedForNewsletter: 19,
      ledigeMedPrisUtenBilder: [
        { area: 'Tullins gate', sqm: 70, bedrooms: 2, model: 'langtid', band: '22 000–24 000 kr/mnd' },
        { area: 'Wernersholmvegen', id: '6189812a-ae20-4d07-98f6-7764845291bb', sqm: 52, bedrooms: 1, model: 'langtid', band: '16 000–18 000 kr/mnd' },
        { area: 'Absalon Beyers gate', sqm: 38, bedrooms: 1, model: 'hybrid', band: '18 000–20 000 kr/mnd' },
        { area: 'Magnus Barfots gate', sqm: 37, bedrooms: 1, model: 'hybrid', band: '22 000–24 000 kr/mnd' },
      ],
      hypothesis: 'eksporten leser unit.images mens wizarden lagrer rental_listing.images (eller motsatt) — mønsteret er binært: 15–34 bilder eller presis 0',
      precedent: '2026-07-03: eksporten droppet relative /api/files-stier → images:[] på alle 25 boliger i prod',
    },
    publicListings: {
      endpoint: 'GET /api/public/listings',
      observed: 'HTTP 401 med DIGIHOME_API_KEY_PROD',
      needs: 'tenant public_api_key (out-of-band til Martin)',
      alsoRequested: ['publicUrl i properties/export', 'listingStatus (draft|published|unpublished)'],
    },
    questions: {
      A1: 'Har de 14 boligene bilder inne i plattformen?',
      A2: 'Er images:[] en mapping-feil (unit.images vs rental_listing.images)?',
      A3: 'Kan vi få hasImages/imageCount uansett?',
      B1: 'Send tenant public_api_key out-of-band til Martin',
      B2: 'Legg publicUrl + listingStatus i properties/export',
      B3: 'Inneholder public/listings kun published?',
      B4: 'Er unit_id i public_url samme ID-rom som id i properties/export?',
    },
  },
};

for (const m of [msg1, msg2]) {
  const res = await fetch(`http://localhost:3000/api/agent-bridge?token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m),
  });
  const j = await res.json().catch(() => null);
  console.log(`HTTP ${res.status} · id=${j?.message?.id || '—'} · ${m.body.length} tegn`);
  console.log(`   ${m.subject}\n`);
}
const chk = await fetch(`http://localhost:3000/api/agent-bridge?thread=homepage-properties&token=${encodeURIComponent(token)}`);
const cj = await chk.json();
console.log(`Tråden homepage-properties har nå ${cj.count} meldinger.`);
