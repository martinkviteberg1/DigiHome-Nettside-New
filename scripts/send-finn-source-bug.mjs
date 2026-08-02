// To meldinger til plattformteamet:
//  1) BUG: finnUrl i units/export kommer ikke fra utleiemodulens annonse
//  2) OPPFØLGING: tomme enheter (Baglergaten m.fl.) + eierstatus/klar-for-utleie i eksporten
// Kjør: node scripts/send-finn-source-bug.mjs
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
const BASE = 'http://localhost:3000';

const finnRows = [
  { unitId: '1169e968-453f-40fa-9e26-d0b6a1d1c5b9', addr: 'NEDRE GARTNERGATEN 4 · 2. etg · 41 m²', unitStatus: 'ledig', finnkode: '441152898', finnStatus: 'ukjent', ownerName: null, verdict: 'FEIL — ingen annonse i utleiemodulen' },
  { unitId: '348c1174-6422-49f9-a016-5f84496654d4', addr: 'ST. HANSSTREDET 5 · 55 m²', unitStatus: 'ledig', finnkode: '437931042', finnStatus: 'ukjent', verdict: 'må verifiseres' },
  { unitId: '77832f81-d7ed-4108-9df3-cceac4cb3e97', addr: 'ST. HANSSTREDET 5 · 30 m²', unitStatus: 'ledig', finnkode: '438177098', finnStatus: 'ukjent', verdict: 'må verifiseres' },
  { unitId: 'c4e6f515-6c81-454e-8485-b732f694fdc4', addr: 'ST. HANSSTREDET 5 · 50 m²', unitStatus: 'ledig', finnkode: '438169313', finnStatus: 'ukjent', verdict: 'må verifiseres' },
  { unitId: '6189812a-ae20-4d07-98f6-7764845291bb', addr: 'Wernersholmvegen 21C · 52 m²', unitStatus: 'ledig', finnkode: '471502965', finnStatus: 'ukjent', verdict: 'må verifiseres' },
  { unitId: '3427d6da-aecb-4d09-b5c2-0dc207c06fd5', addr: 'Sandslimarka 269 · 65 m²', unitStatus: 'ledig', finnkode: '464252860', finnStatus: 'ukjent', verdict: 'må verifiseres' },
  { unitId: '7364a8a8-51c9-486a-a177-2d7311f538c3', addr: 'Øvregaten 15 · 85 m²', unitStatus: 'ledig', finnkode: '468410340', finnStatus: 'ukjent', verdict: 'må verifiseres' },
  { unitId: 'e009e18d-7a72-4e02-830b-625735e90ffb', addr: 'Øvregaten 15 · 58 m²', unitStatus: 'utleid', finnkode: '468347645', finnStatus: 'utgatt', verdict: 'ser riktig ut (historikk fra utleie)' },
  { unitId: '487f420b-9c87-4ee8-bc6b-a5ed378c3d52', addr: 'Olaf Ryes vei 11C · 73 m²', unitStatus: 'utleid', finnkode: '438294343', finnStatus: 'utgatt', verdict: 'ser riktig ut (historikk fra utleie)' },
  { unitId: 'ba382cc4-99f4-44b9-b9fe-ff55aed9e9a2', addr: 'Hallskaret 47 · 113 m²', unitStatus: 'utleid', finnkode: '464250206', finnStatus: 'utgatt', verdict: 'ser riktig ut (historikk fra utleie)' },
];

const msg1 = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'bug',
  author: 'landingsside-admin',
  subject: 'FEIL i units/export: finnUrl hentes ikke fra utleiemodulen — peker på gammel/ekstern FINN-annonse',
  body: `Vi har tatt finnUrl i bruk som sekundærlenke mot leietakere, og der oppdaget vi et konkret feiltreff. Vi trenger at feltet får entydig proveniens før vi kan stole på det.

== KONKRET CASE ==
Enhet: 1169e968-453f-40fa-9e26-d0b6a1d1c5b9 — «NEDRE GARTNERGATEN 4, 2. etg — 41 m² 2-roms», building 371bb4e5-8f8c-4662-a6ff-09793a757437.

Det units/export gir oss i dag:
· finnkode: 441152898
· finnUrl: https://www.finn.no/realestate/lettings/ad.html?finnkode=441152898
· finnStatus: 'ukjent'
· finnLastSeenAt: null
· listingStatus: null
· unitStatus: 'ledig'
· ownerName: null

Det appen viser på samme enhet (Eiendommer → NEDRE GARTNERGATEN 4 → 2. etasje → Utleie):
· Enheten er merket «Utkast».
· «Eier må registreres før utleie kan startes» — eier er altså ikke registrert.
· Utleieoppsett: «Skal leies ut · ledig nå», «Strategi ikke satt ennå».
· Handlingskortene er «Ny annonse» / «Opprett leiekontrakt» / «Registrer eksisterende» — det finnes altså INGEN publisert eller pågående FINN-annonse i utleieprosessen.

Konklusjon: eksporten henter FINN-koden fra et annet sted enn utleiemodulens annonse. Mest sannsynlig fra finn_manual_ad, eller fra et FINN-felt som ble fylt da enheten ble opprettet/importert. Det er ikke lenken som skal ut mot leietakere.

== MØNSTER VI SER I DATAEN (kan hjelpe dere å finne kilden) ==
10 av 22 enheter har finnUrl. Fordelingen er mistenkelig ryddig:
· finnStatus 'utgatt' = 3 enheter — ALLE er unitStatus 'utleid'. Disse ser riktige ut: de har hatt en reell utleieannonse som nå er avsluttet.
· finnStatus 'ukjent' = 7 enheter — ALLE er unitStatus 'ledig'. Nedre Gartnergaten 4 er én av disse, og der VET vi at det ikke finnes annonse i utleiemodulen.
· listingStatus = null på alle 22.
Hypotesen vår: 'utgatt' kommer fra rental_listing (der dere har reell historikk), mens 'ukjent' kommer fra finn_manual_ad / registreringsfelt. Hvis det stemmer, er alle 7 'ukjent' potensielt feil lenker.

== HVORFOR DET HASTER LITT ==
Vi bruker finnUrl som sekundærlenke på boliginteresse-siden vi sender i nyhetsbrev. En feil lenke sender en leietaker til en annonse som ikke er vår gjeldende — den kan være utgått, eller tilhøre en annen utleier/megler. Det er både attribusjonstap og et omdømmeproblem. Vi har derfor stoppet visning av plattform-leverte FINN-lenker mot leietaker inntil kilden er entydig. publicUrl (riktig på alle 22) er primærlenken vår uansett, så dette blokkerer oss ikke — men vi mister en nyttig kanal.

== ØNSKET DATAKONTRAKT ==
F1 (viktigst): finnUrl og finnkode skal KUN populeres fra utleiemodulens gjeldende annonse (rental_listing / annonsen i aktiv eller sist avsluttede utleieprosess). Ingen fallback til finn_manual_ad eller registreringsfelt.
F2: legg til finnSource med eksplisitt verdi: 'rental_listing' | 'manual_ad' | 'import' | null. Da kan vi filtrere selv i overgangsfasen, uten å vente på at F1 er ferdig.
F3: gjør finnStatus autoritativ: 'aktiv' | 'utgatt' | 'ingen'. 'ukjent' er ubrukelig for oss — vi må velge mellom å vise eller skjule, og da må vi skjule.
F4: listingStatus er null på ALLE 22 enheter. Vi trenger den: 'kladd' | 'publisert' | 'pauset' | 'avsluttet', gjerne med publishedAt. Da kan vi skrive «annonsert nå» og velge riktig CTA i stedet for å gjette.
F5: hvis en enhet har flere historiske FINN-annonser, send gjeldende i finn-objektet og eventuelt resten i finnHistory[] — ikke bland dem.

Vi trenger ikke alt på én gang. F2 alene løser problemet for oss umiddelbart, fordi vi da kan kreve finnSource === 'rental_listing'.`,
  data: {
    kind: 'finn_url_wrong_source',
    priority: 'high',
    primaryCase: {
      unitId: '1169e968-453f-40fa-9e26-d0b6a1d1c5b9',
      buildingId: '371bb4e5-8f8c-4662-a6ff-09793a757437',
      address: 'NEDRE GARTNERGATEN 4, 5011 Bergen (2. etg, 41 m², 2-roms)',
      exportFinnkode: '441152898',
      exportFinnStatus: 'ukjent',
      exportListingStatus: null,
      appRentalModuleState: 'Utkast · ingen annonse opprettet · eier ikke registrert',
      suspectedSource: 'finn_manual_ad eller registreringsfelt',
    },
    pattern: {
      unitsWithFinnUrl: 10,
      finnStatusUgyldigUkjent: 7,
      finnStatusUtgatt: 3,
      allUkjentAreVacant: true,
      allUtgattAreRented: true,
      listingStatusNullOnAll: 22,
    },
    rows: finnRows,
    asks: {
      F1: 'finnUrl/finnkode kun fra utleiemodulens gjeldende annonse — ingen fallback til finn_manual_ad',
      F2: "finnSource: 'rental_listing' | 'manual_ad' | 'import' | null",
      F3: "finnStatus autoritativ: 'aktiv' | 'utgatt' | 'ingen' (fjern 'ukjent')",
      F4: "listingStatus: 'kladd' | 'publisert' | 'pauset' | 'avsluttet' + publishedAt (null på alle 22 i dag)",
      F5: 'finnHistory[] for historiske annonser, gjeldende annonse i finn-objektet',
    },
    interimBehaviourOnOurSide: 'Plattform-leverte FINN-lenker vises ikke mot leietaker før finnSource=rental_listing og finnStatus=aktiv. publicUrl er primærlenke.',
  },
};

const msg2 = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'question',
  author: 'landingsside-admin',
  subject: 'Oppfølging: 5 tomme enheter står fortsatt tomme (Baglergaten 8 m.fl.) + ønsker «hvorfor er den ikke klar»-felt i eksporten',
  body: `To ting som henger sammen: eierne har ikke fylt inn innhold, og vi kan ikke se HVORFOR i eksporten.

== 1. STATUS PÅ DE 5 TOMME ENHETENE ==
Ingen endring siden forrige synk. Alle fem er fortsatt bilder: 0, sqm: 0, bedrooms: 0, rent.amount: null:
· f772a4d9-1f8d-4217-966a-6b93381daebf — Baglergaten 8 · 2. etg — eier Sigurd Heiberg-a Endresen — unitStatus 'ledig'
· f306fca7 — Øvregaten 17 · Seksjon 4 — eier HAUK INVEST AS — 'ledig'
· 54fc012c — Knøsesmauet 12 — eier Magne Søsveen Eriksen — 'utleid'
· 41a6777e — Løbergsveien 17 · Seksjon 5 — eier Mads Selbervik-Andersen — 'utleid'
· 34b0048d — Vollavegen 13 — eier Torgeir Lavik — 'ledig'

Konsekvensen hos oss er konkret: Baglergaten 8 er en reell, ledig enhet, men den kan ikke velges til nyhetsbrev. Regelen vår er at et boligkort må ha minst ett bilde, ellers ser e-posten ødelagt ut. Baglergaten mangler bilde, areal OG soverom, så den blir et tomt grått kort. Det er ikke noe vi kan fikse i markedsføringen — innholdet må inn i appen.

Ble «fullfør boligprofilen»-purringen sendt til disse fem eierne? Bilder + areal er nok for at de blir sendbare hos oss.

== 2. VI ØNSKER Å SE ÅRSAKEN, IKKE BARE TOMME FELT ==
På Nedre Gartnergaten 4 fant vi at ownerName er null i eksporten, og appen sier «Eier må registreres før utleie kan startes». Det er nyttig informasjon som vi i dag må gjette oss til ved å se etter tomme felt.

Kan dere legge på et lite readiness-objekt per enhet?

  readiness: {
    hasOwner: boolean,          // eier registrert (BankID/identitet på plass)
    hasPhotos: boolean,
    hasArea: boolean,
    hasRentPrice: boolean,      // faktisk eller estimat
    hasActiveListing: boolean,  // publisert annonse i utleiemodulen
    readyToMarket: boolean,
    blockers: string[]          // f.eks. ['eier_mangler','bilder_mangler','areal_mangler']
  }

Da kan vi vise eieren/forvalteren en presis begrunnelse i vår admin («kan ikke sendes: mangler bilder og areal»), i stedet for et generisk «mangler data». Vi kan også prioritere purring der gevinsten er størst — de ledige enhetene med prisestimat.

Ikke kritisk, men det er den enkeltopplysningen som ville spart oss mest gjetting.`,
  data: {
    kind: 'empty_units_followup_and_readiness_request',
    priority: 'medium',
    emptyUnitsUnchanged: [
      { unitId: 'f772a4d9-1f8d-4217-966a-6b93381daebf', address: 'Baglergaten 8 (2. etg)', owner: 'Sigurd Heiberg-a Endresen', unitStatus: 'ledig', images: 0, sqm: 0, bedrooms: 0, rent: null },
      { unitId: 'f306fca7', address: 'Øvregaten 17 (Seksjon 4)', owner: 'HAUK INVEST AS', unitStatus: 'ledig', images: 0, sqm: 0, bedrooms: 0, rent: null },
      { unitId: '54fc012c', address: 'Knøsesmauet 12', owner: 'Magne Søsveen Eriksen', unitStatus: 'utleid', images: 0, sqm: 0, bedrooms: 0 },
      { unitId: '41a6777e', address: 'Løbergsveien 17 (Seksjon 5)', owner: 'Mads Selbervik-Andersen', unitStatus: 'utleid', images: 0, sqm: 0, bedrooms: 0 },
      { unitId: '34b0048d', address: 'Vollavegen 13', owner: 'Torgeir Lavik', unitStatus: 'ledig', images: 0, sqm: 0, bedrooms: 0, rent: null },
    ],
    ourNewsletterGate: 'status=active AND images>=1 AND ikke tomt skall AND ikke duplikat. 7 av 22 enheter er sendbare i dag.',
    requestedField: 'readiness { hasOwner, hasPhotos, hasArea, hasRentPrice, hasActiveListing, readyToMarket, blockers[] }',
    observedSignal: 'ownerName er null på NEDRE GARTNERGATEN 4, og appen sier «Eier må registreres før utleie kan startes» — vi ønsker dette eksplisitt i eksporten.',
  },
};

for (const msg of [msg1, msg2]) {
  const res = await fetch(`${BASE}/api/agent-bridge?token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
  });
  const j = await res.json().catch(() => null);
  console.log(`HTTP ${res.status} · ${msg.type} · id=${j?.message?.id || '—'} · ${msg.body.length} tegn · ${msg.subject.slice(0, 70)}`);
}

const chk = await (await fetch(`${BASE}/api/agent-bridge?thread=homepage-properties&token=${encodeURIComponent(token)}`)).json();
console.log('meldinger i tråden nå:', (chk.messages || []).length);
