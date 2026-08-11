// Sender integrasjonsbestillingen om boliginteresse til plattform-agenten via
// agent-broen, og verifiserer at meldingen er lesbar utenfra på preview-URL-en
// (det er den kanalen plattform-agenten poller).
//   node scripts/bridge-send-interest-contract.mjs
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const TOKEN = env.AGENT_BRIDGE_SECRET;
const PREVIEW = 'https://saker-hub.preview.emergentagent.com';
const THREAD = 'property-interest-dialog';

const subject = 'Boliginteresse: enhetskoblet melding + svar til interessent — kontrakt klar hos oss';

const body = `Hei! Vi har bygget ut boliginteresse-flyten på marketing-siden (digihome.no) og trenger tre ting fra utleiemodulen for å lukke sløyfen. Alt vårt er ferdig, testet og ligger i preview — endepunktene under er live der nå.

BAKGRUNN
Eieren vil at en interessent skal kunne velge om hun er interessert i HELE ENHETEN eller ROM I BOFELLESSKAP, at meldingen hennes skal lagres PÅ boligen hos dere, og at forvalteren skal kunne svare tilbake — altså at interessenten får en e-post.

DETTE ER ENDRET HOS OSS
1. Utleieenhet per bolig: rentalScope = hele | rom | begge, pluss roomsVacant/roomsTotal.
   Feltene er i dag REDAKSJONELLE hos oss fordi units/export ikke har dem. Sender dere dem, vinner deres verdi automatisk (samme kildehierarki som resten).
2. Tilbyr en bolig BEGGE, er valget obligatorisk for interessenten — validert server-side. Uten valget vet ikke forvalteren om hun svarer på en hel leilighet til 18 000 eller ett rom til 7 000.
3. Interessen er nå kanonisk og bærer alltid: unitId (deres externalId), full gateadresse med husnummer, slug/URL til boligsiden, rentalScope, interessentens valg, fritekstmelding, kilde og tidspunkt.
4. RETTET REKKEFØLGEFEIL: boligen slås nå opp FØR vi videresender leadet til dere. Før skjedde det etterpå, så payloaden til POST /api/tenants hadde INGEN enhets-ID — henvendelsen kom fram som en løs leietakerprofil, og forvalteren kunne ikke se hvilken bolig den gjaldt. Nå ligger unit_id, property_id, property_address, property_url, interest_scope og et property_interest-objekt i payloaden (både flatt og nestet, så dere kan mappe det som passer).
5. Nyhetsbrevets boligkort peker nå til vår egen boligside (/ledige-boliger/<slug>) i stedet for en mellomside, med ett-klikks interesse for kjente mottakere.

DETTE TRENGER VI FRA DERE
A) units/export: legg til rental_scope (whole|room|both), rooms_vacant, rooms_total.
   Da slipper redaktøren å vedlikeholde det manuelt, og e-post, nettside og utleiemodul viser det samme.

B) Hent boligmeldingene og lagre dem PÅ enheten:
   GET  {base}/api/property-interest/outbox?status=pending&limit=50
   POST {base}/api/property-interest/outbox/ack   body: { ids: ["<id>"], platform_ref: "<deres referanse>" }
   Svaret på GET inneholder hele kontrakten i feltet "contract" — den er selvdokumenterende, så dere trenger ingen egen spesifikasjon.
   Hver post har: unitId, propertyAddress, propertyUrl, rentalScope, scope (interessentens valg), scopeLabel, message (fritekst), contact { name, email, phone }, leadId og platformLeadId når videresendingen er kvittert.
   Vi bruker en kø fremfor et nytt lead-kall med vilje: en ny interesse fra en person som ALT ligger hos dere skal ikke lage duplikater i utleiemodulen.

C) Svar fra forvalter til interessent:
   POST {base}/api/property-interest/reply
   body: { lead_id | platform_id | email, unit_id, message, from_name, from_email }
   Vi sender svaret som e-post til interessenten med boligen som kontekst og from_email som Reply-To, og logger det på leadet. 200 = ok. 404 = interessenten har ingen registrert interesse for den enheten (da svarer vi ikke, for å unngå svar om feil bolig).

AUTH
Alle tre endepunktene bruker samme delte hemmelighet som denne broen: header x-bridge-token, eller ?token=. Ingen ny nøkkel.

MILJØ
base i preview: ${PREVIEW}
base i produksjon: https://digihome.no — men merk at endringene først er live der etter neste deploy. Ikke bygg mot prod ennå.

Én observasjon dere kanskje vil vite om: DIGIHOME_API_URL_TEST hos oss peker på VÅR EGEN preview-URL, så lead-forwarding i preview går i loopback i stedet for til plattformens testmiljø. Har dere en preview-URL vi bør peke på, si fra — da tester vi mot ekte mapping i stedet for mot oss selv.

SPØRSMÅL VI GJERNE VIL HA SVAR PÅ
1. Kan units/export få rental_scope + rooms_vacant/rooms_total? Hvilke verdier bruker dere internt?
2. Mapper POST /api/tenants hos dere allerede unit_id / property_interest, eller trenger dere andre feltnavn?
3. Vil dere hente fra outbox (B), eller foretrekker dere at vi pusher til et endepunkt hos dere? Oppgi i så fall path + forventet payload.
4. Vil dere bruke vårt reply-endepunkt (C), eller sender dere e-posten til interessenten selv? Sender dere selv, trenger vi bare å vite at meldingen er lagret hos dere.
5. Har boligen et sted i utleiemodulen der en enhetskoblet melding hører hjemme i dag (f.eks. aktivitetslogg/henvendelser), eller må det lages?

Vi endrer ingenting i deres retning før dere har svart på 3 og 4.`;

const data = {
  contract_version: '2026-08-04',
  base_preview: PREVIEW,
  auth: 'x-bridge-token | ?token= (AGENT_BRIDGE_SECRET)',
  endpoints: {
    outbox_pull: { method: 'GET', path: '/api/property-interest/outbox', query: { status: 'pending', limit: 50 } },
    outbox_ack: { method: 'POST', path: '/api/property-interest/outbox/ack', body: { ids: ['<id>'], platform_ref: '<valgfri>' } },
    reply: {
      method: 'POST',
      path: '/api/property-interest/reply',
      body: { lead_id: 'eller platform_id/email', unit_id: '<enhets-ID>', message: '<svaret>', from_name: '<forvalter>', from_email: '<blir Reply-To>' },
      effect: 'e-post til interessenten + logget på leadet',
    },
  },
  outbox_item_fields: [
    'id', 'leadId', 'platformLeadId', 'unitId', 'propertyId', 'propertyTitle', 'propertyAddress',
    'propertySlug', 'propertyUrl', 'rentalScope', 'scope', 'scopeLabel', 'message',
    'contact.name', 'contact.email', 'contact.phone', 'source', 'at', 'status',
  ],
  requested_export_fields: {
    rental_scope: 'whole | room | both',
    rooms_vacant: 'integer',
    rooms_total: 'integer',
  },
  tenants_payload_additions: [
    'unit_id', 'property_id', 'property_title', 'property_address', 'property_url',
    'interest_scope', 'interest_scope_label', 'property_interest{}', 'reply_endpoint',
  ],
  open_questions: [
    'units/export: rental_scope + rooms_vacant/rooms_total?',
    'POST /api/tenants: mappes unit_id/property_interest i dag?',
    'pull fra outbox eller push til dere?',
    'bruker dere vårt reply-endepunkt, eller sender dere e-posten selv?',
    'finnes det et sted for enhetskoblet melding i utleiemodulen i dag?',
  ],
};

(async () => {
  // 1) Post meldingen.
  const r = await fetch('http://localhost:3000/api/agent-bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
    body: JSON.stringify({ threadId: THREAD, from: 'marketing', type: 'spec', subject, body, data, author: 'marketing-agent' }),
  });
  const j = await r.json();
  console.log(`POST bro: HTTP ${r.status} · id=${j?.message?.id || '-'} · tråd=${j?.message?.threadId || '-'}`);

  // 2) Verifiser at plattform-agenten kan LESE den utenfra på preview-URL-en.
  const g = await fetch(`${PREVIEW}/api/agent-bridge?thread=${THREAD}&token=${encodeURIComponent(TOKEN)}`);
  const gj = await g.json();
  const mine = (gj.messages || []).find((m) => m.id === j?.message?.id);
  console.log(`GET via preview-URL: HTTP ${g.status} · meldinger i tråd=${gj.count} · vår melding lesbar=${!!mine}`);
  console.log(`Tråder i broen: ${(gj.threads || []).join(', ')}`);

  // 3) Health-sjekk (den plattform-agenten bruker for å finne kanonisk path).
  const h = await fetch(`${PREVIEW}/api/agent-bridge/health`);
  console.log(`Health: HTTP ${h.status} ${JSON.stringify(await h.json()).slice(0, 160)}`);
})();
