// To meldinger til plattformteamet:
//  1) KVITTERING: FINN-kildefeilen er rettet, og readiness/rent/publicUrl er tatt i bruk
//  2) ØNSKE: annonsetittel + beskrivelse i units/export (og de siste datahullene)
// Radene bygges fra LIVE eksport slik at tallene er korrekte når meldingen sendes.
// Kjør: node scripts/send-platform-ack-and-adtext.mjs
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
const PLATFORM = (process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no').replace(/\/+$/, '');
const KEY = process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY || '';

// ---- hent fersk eksport ----------------------------------------------------
const ju = await (await fetch(`${PLATFORM}/api/units/export?limit=100`, { headers: { 'x-api-key': KEY } })).json();
const units = ju.units || [];
const jp = await (await fetch(`${PLATFORM}/api/properties/export?limit=100`, { headers: { 'x-api-key': KEY } })).json();
const propById = new Map((jp.properties || []).map((p) => [p.id, p]));

const addr = (u) => {
  const a = u.address || {};
  return [a.street, a.houseNumber].filter(Boolean).join(' ') || a.full || a.street || '(uten adresse)';
};
const floorLabel = (f) => {
  if (f === null || f === undefined || f === '') return '';
  const s = String(f).trim();
  if (/^\d+$/.test(s)) return Number(s) > 0 ? `${s}. etg` : '';
  return s;
};
const row = (u) => {
  const p = propById.get(u.unitId) || {};
  return {
    unitId: u.unitId,
    address: `${addr(u)}${floorLabel(u.floor) ? ` · ${floorLabel(u.floor)}` : ''}${u.sqm ? ` · ${u.sqm} m²` : ''}`,
    unitStatus: u.status || null,
    rent: u.rent && u.rent.amount ? u.rent.amount : null,
    rentIsEstimate: u.rent ? u.rent.isEstimate : null,
    images: (u.images || []).length,
    sqm: u.sqm || 0,
    bedrooms: u.bedrooms || 0,
    rooms: u.rooms || 0,
    postalCode: u.postalCode || p.postalCode || null,
    publicUrl: u.publicUrl || null,
    platformTitle: p.title || null,
    monthlyRentBand: p.monthlyRentBand || null,
    finnSource: u.finnSource || null,
    finnStatus: u.finnStatus || null,
    listingStatus: u.listingStatus || null,
    blockers: (u.readiness && u.readiness.blockers) || [],
    readyToMarket: !!(u.readiness && u.readiness.readyToMarket),
  };
};
const rows = units.map(row);
const vacant = rows.filter((r) => r.unitStatus === 'ledig');
const missingPrice = vacant.filter((r) => r.blockers.includes('pris_mangler'));
const missingPhotos = vacant.filter((r) => r.blockers.includes('bilder_mangler'));
const priceReadyNoPhotos = missingPhotos.filter((r) => !r.blockers.includes('pris_mangler'));
const photosReadyNoPrice = missingPrice.filter((r) => !r.blockers.includes('bilder_mangler') && r.sqm > 0);
const onlyPriceMissing = photosReadyNoPrice.filter((r) => r.blockers.length === 1 && r.blockers[0] === 'pris_mangler');
const priceAndOtherMissing = photosReadyNoPrice.filter((r) => !(r.blockers.length === 1 && r.blockers[0] === 'pris_mangler'));
const withFinn = rows.filter((r) => r.finnSource);
const genericTitles = rows.filter((r) => /^(m[øo]blert|um[øo]blert)?\s*(leilighet|hybel|hus|enebolig|rekkehus|rom)(\s*·.*)?$/i.test(String(r.platformTitle || '')));

const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const GARTNERGATEN = '1169e968-453f-40fa-9e26-d0b6a1d1c5b9';
const gartner = rows.find((r) => r.unitId === GARTNERGATEN);
const gartnerFixed = !!gartner && !gartner.finnSource;
const finnSourcesNow = uniq(withFinn.map((r) => r.finnSource));
const finnStatusesNow = uniq(withFinn.map((r) => r.finnStatus));
const list = (arr) => arr.map((r) => `· ${r.unitId} — ${r.address}${r.images ? ` — ${r.images} bilder` : ''}${r.rent ? ` — ${num(r.rent)} kr/mnd${r.rentIsEstimate ? ' (estimat)' : ''}` : ''}${r.blockers.length ? ` — blockers: ${r.blockers.join(', ')}` : ''}`).join('\n');

// ---------------------------------------------------------------------------
const msg1 = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'info',
  author: 'landingsside-admin',
  subject: 'Kvittering: FINN-kildefeilen er rettet hos dere, og readiness + rent.amount + publicUrl er nå i bruk hos oss',
  body: `Takk — vi har verifisert eksporten på nytt i dag, og alle de fire tingene vi ba om er på plass eller løst. Kort kvittering så dere vet hva som faktisk er tatt i bruk.

== 1. FINN-KILDEN ER RETTET (F1/F2) ==
Før: 10 av 22 enheter hadde finnUrl, 7 av dem med finnStatus 'ukjent', og Nedre Gartnergaten 4 (1169e968-…) hadde en lenke som ikke tilhørte utleiemodulen.
Nå: ${withFinn.length} enheter har finnUrl${finnSourcesNow.length ? `, med finnSource '${finnSourcesNow.join("' / '")}' og finnStatus '${finnStatusesNow.join("' / '")}'` : ''}. ${gartnerFixed ? 'Nedre Gartnergaten 4 har ingen finnUrl lenger.' : `Nedre Gartnergaten 4 har fortsatt finnUrl (finnSource: ${gartner ? gartner.finnSource : 'ukjent'}) — den bør fjernes hvis det ikke finnes en reell annonse i utleiemodulen.`}

Vi har lagt inn regelen på vår side: en FINN-lenke vises bare mot leietaker når finnSource er 'manual_ad' (eller vi selv har koblet den manuelt) OG finnStatus ikke er 'utgatt'. Alt annet skjules. Da er vi robuste også hvis feltet får nye kilder senere.

== 2. readiness ER TATT I BRUK DIREKTE (forrige ønske) ==
Vi bruker blockers ordrett i admin, så eieren får en presis begrunnelse i stedet for «mangler data». Dagens bilde over de ${rows.length} enhetene:
· pris_mangler: ${rows.filter((r) => r.blockers.includes('pris_mangler')).length}
· bilder_mangler: ${rows.filter((r) => r.blockers.includes('bilder_mangler')).length}
· areal_mangler: ${rows.filter((r) => r.blockers.includes('areal_mangler')).length}
· eier_mangler: ${rows.filter((r) => r.blockers.includes('eier_mangler')).length}
· readyToMarket: ${rows.filter((r) => r.readyToMarket).length}

Én presisering vi tolket selv: readyToMarket=true betyr «har eier, bilder, areal og pris» — den sier ingenting om at enheten er ledig. ${rows.filter((r) => r.readyToMarket && r.unitStatus !== 'ledig').length} av de ${rows.filter((r) => r.readyToMarket).length} readyToMarket-enhetene er utleid. Det er helt greit for oss, vi filtrerer på unitStatus i tillegg — men si gjerne hvis intensjonen var noe annet.

== 3. rent.amount + isEstimate ==
${rows.filter((r) => r.rent).length} av ${rows.length} enheter har nå beløp. Vi har lest semantikken slik, og vil gjerne ha den bekreftet:
· isEstimate=false ⇔ enheten er utleid ⇔ beløpet er faktisk kontraktsleie.
· isEstimate=true ⇔ enheten er ledig ⇔ beløpet er prisantydning/markedsestimat.
Det stemmer med all data vi ser (${rows.filter((r) => r.rent && r.rentIsEstimate === false).length} med isEstimate=false, alle utleid).

Slik bruker vi det: boligeksporten sender ferdig monthlyRentBand på bare ${rows.filter((r) => r.monthlyRentBand).length} av ${rows.length} boliger, så for resten bygger vi intervallet selv fra rent.amount i samme 2 000-kroners bøtte dere bruker (16 000 → «16 000–18 000 kr/mnd»). Vi publiserer aldri et eksakt beløp utad, og et estimat merkes «prisantydning». I nøkkeltallene våre teller estimat ALDRI som realisert inntekt — bare faktisk startet leiekontrakt gjør det.

== 4. publicUrl ==
${rows.filter((r) => r.publicUrl).length} av ${rows.length} enheter har publicUrl nå (var 0). Den er primær-CTA hos oss: «Book visning i DigiHome».

== FORTSATT ÅPENT FRA FORRIGE RUNDE ==
· F4: listingStatus er fortsatt null på alle ${rows.length} enheter, og listingPublishedAt likeså. Vi ønsker 'kladd' | 'publisert' | 'pauset' | 'avsluttet' + publishedAt, så vi kan skrive «annonsert nå» og velge riktig CTA i stedet for å gjette.
· district er fortsatt null på alle ${rows.length}. Vi utleder Bergen-bydel selv fra postnummer via Kartverket, og det fungerer — men postalCode mangler på ${rows.filter((r) => !r.postalCode).length} enheter, og da må vi gjette fra gatenavn.

Ingenting av dette blokkerer oss. Vi skriver aldri til plattformen — alt er read-only.`,
  data: {
    kind: 'ack_finn_fix_and_readiness_adoption',
    priority: 'low',
    verifiedAt: new Date().toISOString(),
    finnLinksNow: withFinn.map((r) => ({ unitId: r.unitId, address: r.address, finnSource: r.finnSource, finnStatus: r.finnStatus })),
    blockerCounts: {
      pris_mangler: rows.filter((r) => r.blockers.includes('pris_mangler')).length,
      bilder_mangler: rows.filter((r) => r.blockers.includes('bilder_mangler')).length,
      areal_mangler: rows.filter((r) => r.blockers.includes('areal_mangler')).length,
      eier_mangler: rows.filter((r) => r.blockers.includes('eier_mangler')).length,
      readyToMarket: rows.filter((r) => r.readyToMarket).length,
    },
    rentSemanticsAssumed: {
      'isEstimate=false': 'utleid — faktisk kontraktsleie',
      'isEstimate=true': 'ledig — prisantydning/markedsestimat',
      confirmPlease: true,
    },
    stillOpen: {
      F4: 'listingStatus + listingPublishedAt er null på alle enheter',
      district: `null på alle ${rows.length}; postalCode mangler på ${rows.filter((r) => !r.postalCode).length}`,
    },
    ourRule: "FINN-lenke vises mot leietaker kun når finnSource='manual_ad' (eller egen manuell kobling) og finnStatus != 'utgatt'.",
  },
};

// ---------------------------------------------------------------------------
const msg2 = {
  threadId: 'homepage-properties',
  from: 'marketing',
  type: 'question',
  author: 'landingsside-admin',
  subject: 'Ønske: annonsetittel + beskrivelse i units/export — plattformtittelen er generisk og gir identiske boligkort',
  body: `Vi har bygget en offentlig boligflate på digihome.no/ledige-boliger — egen søkbar side per bolig med schema.org RealEstateListing — i tillegg til boligkortene i nyhetsbrevet. Den er ikke publisert med boliger ennå, nettopp fordi vi mangler data (se A4). Underveis ble ett datahull svært synlig: vi har ingen annonsetekst.

== PROBLEMET, KONKRET ==
properties/export sender title, men den er generisk og bygget av strukturerte felt:
${genericTitles.slice(0, 6).map((r) => `· ${r.unitId} → «${r.platformTitle}»`).join('\n')}
${genericTitles.length > 6 ? `· … totalt ${genericTitles.length} av ${rows.length} enheter har en slik generisk tittel.` : ''}

I et nyhetsbrev med 12 boligkort blir det 12 nesten identiske overskrifter — leietakeren klarer ikke skille dem, og klikkraten lider. På en boligside blir det i tillegg en dårlig <title> og H1 for søk.

Vi forstår hvorfor den er slik: eksporten er personvern-trygg, og en generisk tittel lekker ingenting. Vi ber ikke om at den endres.

== HVA VI HAR GJORT I MELLOMTIDEN (så dere ser hva vi kompenserer for) ==
Vi bygger tittelen etter et kildehierarki, og viser alltid kilden i vår admin:
1. redigert — tittel en redaktør har skrevet selv (overstyrer alt)
2. FINN-annonsen — vi henter og:title fra annonsen når finnSource='manual_ad'. Fungerer, men gjelder bare ${withFinn.length} av ${rows.length} enheter, og teksten er ofte 100+ tegn med bydel og fasilitetsliste («Paradis / Hop | Nyoppusset og fullt møblert hybel i attraktivt boligområde - Gulvvarme - Parkeringplass»), så vi må forkorte den maskinelt.
3. plattformtittelen — brukes bare hvis den ikke er generisk
4. avledet — vi bygger «Møblert 2-soveroms leilighet i Løbergsveien» av type, soverom og gatenavn (aldri husnummer)

I praksis havner nesten alle boliger på punkt 4. Det er lesbart, men det er ikke selgende tekst, og det er ikke eierens/forvalterens egne ord.

== ØNSKET (A1, viktigst) ==
Utleiemodulen har allerede annonsetekst når en annonse opprettes. Kan units/export sende den?

  ad: {
    title: string | null,        // annonseoverskriften i utleiemodulen
    description: string | null,  // annonsetekst/ingress
    updatedAt: string | null,
    source: 'rental_listing' | 'manual_ad'
  }

Da bruker vi eierens/forvalterens egen tekst som primærkilde i stedet for å gjette, og FINN-scraping blir helt unødvendig. Vi trenger ikke HTML — ren tekst er fint, og vi kutter selv til e-postbredde. Hvis tittelen kun finnes på annonser, er det greit: da faller vi tilbake som i dag for enheter uten annonse.

== ØNSKE A2: rooms og postalCode ==
rooms er 0 på alle ${rows.length} enheter, mens bedrooms er utfylt. Vi skriver derfor «2-soveroms» der «3-roms» er den norske normen i boligannonser. Har dere rooms i basen?
postalCode mangler på ${rows.filter((r) => !r.postalCode).length} av ${rows.length}. Vi bruker den til å utlede Bergen-bydel (district er null på alle), og uten den må vi gjette fra gatenavn.

== ØNSKE A3: bilderettigheter — trenger en avklaring, ikke et felt ==
Vi publiserer KUN bilder som kommer fra utleiemodulen på digihome.no. FINN-bilder bruker vi bare internt i admin, fordi vi ikke antar at vi har rett til å republisere dem på egen kommersiell side.
Kan dere bekrefte at bildene i units/export er lastet opp av eier/forvalter i DigiHome, og at de kan publiseres på digihome.no? Hvis noen av dem er importert fra en ekstern annonse, ville et flagg per bilde (eller per enhet) vært gull: imageSource: 'owner_upload' | 'imported'.

== ØNSKE A4: pris på ledige enheter er det som faktisk blokkerer oss ==
Dette er ikke et API-ønske, men et produktinnspill. Publiseringsporten vår krever bilder + areal + pris + gateadresse, og at enheten er ledig. Status i dag, av ${vacant.length} ledige enheter:

· ${onlyPriceMissing.length} ${onlyPriceMissing.length === 1 ? 'ledig enhet har' : 'ledige enheter har'} bilder og areal, og mangler KUN pris. De er ett tastetrykk fra å kunne publiseres:
${list(onlyPriceMissing) || '· (ingen)'}
${priceAndOtherMissing.length ? `
· ${priceAndOtherMissing.length} ${priceAndOtherMissing.length === 1 ? 'ledig enhet har' : 'ledige enheter har'} bilder og areal, men mangler pris OG noe mer:
${list(priceAndOtherMissing)}` : ''}
· ${priceReadyNoPhotos.length} ${priceReadyNoPhotos.length === 1 ? 'ledig enhet har' : 'ledige enheter har'} pris, men mangler bilder:
${list(priceReadyNoPhotos) || '· (ingen)'}

Hvis utleiemodulen ba om prisantydning når en enhet merkes «skal leies ut», ville ${onlyPriceMissing.length} boliger blitt publiserbare umiddelbart. Det er den enkeltendringen med størst effekt for oss nå.

Ingen hast på noe av dette — A1 er det som gir mest verdi, og A4 er en oppfordring til dere som produkt.`,
  data: {
    kind: 'request_ad_text_and_data_gaps',
    priority: 'medium',
    A1: {
      ask: "ad { title, description, updatedAt, source } i units/export",
      why: `${genericTitles.length} av ${rows.length} enheter har generisk plattformtittel; nyhetsbrev og boligsider får identiske overskrifter`,
      ourFallbackChain: ['redigert', 'finn_og_title', 'plattformtittel_hvis_ikke_generisk', 'avledet_av_type_soverom_gate'],
      finnCoverage: `${withFinn.length}/${rows.length}`,
    },
    A2: {
      rooms: `0/${rows.length} utfylt (bedrooms er utfylt)`,
      postalCode: `${rows.filter((r) => r.postalCode).length}/${rows.length} utfylt`,
      district: `0/${rows.length} — vi utleder selv via Kartverket`,
    },
    A3: {
      question: 'Er bildene i units/export eier-opplastede og klarert for publisering på digihome.no?',
      requestedFlag: "imageSource: 'owner_upload' | 'imported'",
      ourInterimRule: 'Vi publiserer kun plattformbilder offentlig. FINN-bilder brukes bare internt i admin.',
    },
    A4: {
      publishGate: 'bilder + areal + pris + gateadresse + ledig + synlig',
      vacantUnits: vacant.length,
      vacantMissingPriceOnly: onlyPriceMissing.map((r) => ({ unitId: r.unitId, address: r.address, images: r.images, sqm: r.sqm, bedrooms: r.bedrooms })),
      vacantMissingPriceAndMore: priceAndOtherMissing.map((r) => ({ unitId: r.unitId, address: r.address, images: r.images, sqm: r.sqm, blockers: r.blockers })),
      vacantMissingPhotosOnly: priceReadyNoPhotos.map((r) => ({ unitId: r.unitId, address: r.address, rent: r.rent })),
      productSuggestion: 'Spør om prisantydning når en enhet merkes «skal leies ut»',
    },
    rows,
  },
};

const DRY = process.argv.includes('--dry') || process.env.DRY === '1';

for (const msg of [msg1, msg2]) {
  if (DRY) {
    console.log('\n' + '='.repeat(78));
    console.log(`[DRY] ${msg.type.toUpperCase()} · ${msg.subject}`);
    console.log('='.repeat(78));
    console.log(msg.body);
    console.log('--- data ---');
    console.log(JSON.stringify({ ...msg.data, rows: undefined }, null, 2));
    continue;
  }
  const res = await fetch(`${BASE}/api/agent-bridge?token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
  });
  const j = await res.json().catch(() => null);
  console.log(`HTTP ${res.status} · ${msg.type} · id=${j?.message?.id || '—'} · ${msg.body.length} tegn · ${msg.subject.slice(0, 72)}`);
}

if (DRY) {
  console.log('\n[DRY] Ingenting sendt. Kjør uten --dry for å sende.');
  process.exit(0);
}

const chk = await (await fetch(`${BASE}/api/agent-bridge?thread=homepage-properties&token=${encodeURIComponent(token)}`)).json();
console.log('meldinger i tråden nå:', (chk.messages || []).length);
