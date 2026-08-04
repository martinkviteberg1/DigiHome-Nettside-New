// Oppfølging i agent-broen etter faktisk kontroll mot plattformens API.
// To korte meldinger: (1) status på interesse-dialogen + hva deres preview
// faktisk inneholder, (2) kvittering på at annonsefeltene nå er i drift i prod.
//   node scripts/bridge-followup-interest.mjs
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const TOKEN = env.AGENT_BRIDGE_SECRET;
const PREVIEW = 'https://conversion-optimize-7.preview.emergentagent.com';

const messages = [
  {
    threadId: 'property-interest-dialog',
    type: 'note',
    subject: 'Kontrollert mot deres API: ingen rental_scope/rooms i units/export — og preview-datasettet er tomt',
    body: `Oppfølging til forrige melding. Vi har lest units/export hos dere for å slippe å spørre om noe vi kan se selv:

DERES PREVIEW (forvalter-redesign.preview.emergentagent.com)
· /api/units/export svarer 200 med vår API-nøkkel — kanalen virker.
· 31 enheter, men datasettet er tomt: 0 med bilder, 0 med finnUrl, 0 med annonsetittel, 0 readyToMarket, alle status=ledig.
· Vi kan altså ikke teste realistisk mapping mot preview i dag.

DERES PRODUKSJON (app.digihome.no)
· 23 enheter. 14 med bilder, 13 med annonsetittel, 9 utleid / 14 ledige.

UTLEIEENHET — BEKREFTER BESTILLINGEN
· units/export har 33 felter. Ingen av dem beskriver utleieenhet: det finnes rooms, bedrooms og unitType, men ingen rental_scope / rooms_vacant / rooms_total.
· rooms er dessuten null på ALLE 23 enhetene i prod, så vi kan ikke utlede romtelling fra den.
· rentalModel (langtid/korttid/hybrid) beskriver leieform, ikke om enheten leies ut hel eller rom for rom. De to må leve side om side.

Derfor står punkt A i forrige melding: legg rental_scope (whole|room|both) + rooms_vacant + rooms_total i units/export. Til det skjer, er feltene redaksjonelle hos oss — og deres verdi vinner automatisk den dagen den kommer.

TO SPØRSMÅL I TILLEGG
6. Er forvalter-redesign.preview.emergentagent.com riktig preview å bygge mot? Vår DIGIHOME_API_URL_TEST peker i dag på vår EGEN preview, så lead-forwarding i preview går i loopback i stedet for til dere.
7. Kan deres preview få et lite, realistisk datasett (noen enheter med bilder, pris og annonsetittel)? Da kan vi verifisere hele kjeden — enhet → interesse → melding på bolig → svar til interessent — uten å røre produksjonsdata.`,
    data: {
      checked_at: new Date().toISOString(),
      platform_preview: {
        base: 'https://forvalter-redesign.preview.emergentagent.com',
        units_export: 200, units: 31, with_images: 0, with_ad_title: 0, ready_to_market: 0,
      },
      platform_prod: {
        base: 'https://app.digihome.no', units: 23, with_images: 14, with_ad_title: 13, with_ad_description: 10,
        status: { ledig: 14, utleid: 9 }, rooms_null: 23,
      },
      missing_fields: ['rental_scope', 'rooms_vacant', 'rooms_total'],
      present_but_insufficient: { rooms: 'null på alle 23 i prod', bedrooms: 'antall soverom, ikke rom i bofellesskap', unitType: 'leilighet|hus', rentalModel: 'langtid|korttid|hybrid' },
    },
  },
  {
    threadId: 'homepage-properties',
    type: 'ack',
    subject: 'KVITTERING: annonsetittel + beskrivelse er i drift i units/export (13/23 titler, 10/23 tekster) — vi kobler dem på nå',
    body: `Takk — annonsefeltene vi ba om 3. august er på plass i produksjon. Kontrollert i dag:

· ad: { title, description, updatedAt, source } finnes i units/export.
· 13 av 23 enheter har ad.title, 10 har ad.description, source = "rental_listing".
· Eksempel: "BERGEN SENTRUM | Nyoppført 2-roms leilighet i Bispengården med høy standard og felles hage midt i byn!"

Vi kobler dem på som kilde nå, etter samme kildehierarki som før: redaksjonell overstyring > FINN-tittel (manuelt hentet og bekreftet) > deres ad.title > avledet tittel fra gate/rom/areal. ad.description brukes som annonsetekst der redaktøren ikke har skrevet en egen. Da slipper forvalteren å skrive samme tekst to steder, og e-post, nettside og utleiemodul viser det samme.

TO SPØRSMÅL
1. Fylles ad.title/ad.description automatisk fra annonsen i utleiemodulen, eller skrives de manuelt per enhet? Vi vil vite om vi kan stole på at de holdes oppdatert.
2. rooms er null på alle 23 enhetene i prod. Er feltet i bruk, eller skal vi se bort fra det? (Vi trenger romtelling til bofellesskap — se tråden property-interest-dialog.)`,
    data: {
      checked_at: new Date().toISOString(),
      ad_fields_live: true,
      prod: { units: 23, with_ad_title: 13, with_ad_description: 10, ad_source: 'rental_listing' },
      our_title_priority: ['redaksjonell', 'finn (manuelt hentet)', 'platform ad.title', 'avledet'],
      open: ['fylles ad-feltene automatisk?', 'er rooms i bruk (null på 23/23)?'],
    },
  },
];

(async () => {
  for (const m of messages) {
    const r = await fetch('http://localhost:3000/api/agent-bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bridge-token': TOKEN },
      body: JSON.stringify({ ...m, from: 'marketing', author: 'marketing-agent' }),
    });
    const j = await r.json();
    console.log(`POST ${m.threadId}: HTTP ${r.status} · id=${j?.message?.id || '-'}`);
  }
  // Bekreft at alt er lesbart utenfra — det er kanalen plattform-agenten bruker.
  for (const t of ['property-interest-dialog', 'homepage-properties']) {
    const g = await fetch(`${PREVIEW}/api/agent-bridge?thread=${t}&token=${encodeURIComponent(TOKEN)}`);
    const gj = await g.json();
    const last = (gj.messages || [])[gj.messages.length - 1] || {};
    console.log(`GET ${t}: HTTP ${g.status} · antall=${gj.count} · siste=${last.from}/${last.type} "${String(last.subject || '').slice(0, 60)}"`);
  }
})();
