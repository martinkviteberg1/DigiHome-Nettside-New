// Seeder 3 redaksjonelle start-artikler i 'posts'-collection.
// Kjør: node scripts/seed-posts.mjs  (idempotent på slug)
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const U = (id, pexels = false) => pexels
  ? `${id}?auto=compress&cs=tinysrgb&w=1600`
  : `${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80`;

const now = Date.now();
const iso = (daysAgo) => new Date(now - daysAgo * 86400000).toISOString();

const posts = [
  {
    slug: 'skatt-pa-utleieinntekt-2026',
    title: 'Skatt på utleieinntekt: Slik fungerer det',
    excerpt: 'En enkel guide til når utleie er skattefritt, når det skattlegges, og hva du kan trekke fra som utleier i Norge.',
    coverImage: U('https://images.unsplash.com/photo-1580946443359-1126222f9224'),
    tags: ['Skatt', 'Utleie', 'Guide'],
    seoTitle: 'Skatt på utleieinntekt — slik fungerer det | DigiHome',
    seoDescription: 'Når er utleie skattefritt, når skattlegges det, og hva kan du trekke fra? En enkel guide for norske utleiere.',
    publishedAt: iso(2),
    content: `Skatt er noe av det første mange lurer på før de leier ut. Reglene er faktisk ganske oversiktlige når du først forstår hovedprinsippene. Her er en enkel gjennomgang — husk at du alltid bør sjekke gjeldende satser og regler hos Skatteetaten.

## Når er utleie skattefritt?

Hovedregelen er knyttet til om du selv bor i boligen. Leier du ut en del av boligen du selv bor i, og bruker minst halvparten av boligen selv (regnet etter utleieverdi), er leieinntekten som hovedregel **skattefri**. Dette gjelder for eksempel utleie av et soverom eller en hybel i egen enebolig.

## Når skattlegges utleien?

Leier du ut en **sekundærbolig** — altså en bolig du ikke bor i selv — er leieinntekten skattepliktig. Den skattlegges som kapitalinntekt. Det samme gjelder dersom du leier ut mer enn halvparten av din egen bolig over tid.

Korttidsutleie (under 30 dager, for eksempel via Airbnb) i egen bolig har egne regler, der en del av inntekten kan være skattefri og resten skattlegges. Dette er et område der det lønner seg å være nøyaktig.

## Hva kan du trekke fra?

Når utleien er skattepliktig, kan du som regel trekke fra kostnader knyttet til utleien, for eksempel:

- Vedlikehold og reparasjoner
- Kommunale avgifter og eiendomsskatt
- Forsikring og felleskostnader
- Forvaltningshonorar

Påkostninger som hever standarden (oppgradering) behandles annerledes enn ordinært vedlikehold, så det er verdt å skille mellom de to.

## Slik gjør DigiHome det enkelt

Som forvalter holder vi oversikt over leieinntekter og relevante kostnader gjennom hele året, slik at du har dokumentasjonen klar til skattemeldingen. Vi gir deg en samlet oversikt — uten at du må lete i kvitteringer og kontoutskrifter.

> Tips: Sett av tid før skattemeldingen til å gå gjennom inntekter og fradrag. God dokumentasjon gjennom året gjør jobben langt enklere.

Vil du leie ut uten å bekymre deg for det administrative? [Få en gratis verdivurdering](/bli-utleier) — så tar vi oss av detaljene.`,
  },
  {
    slug: 'korttid-eller-langtid-velg-riktig-utleiemodell',
    title: 'Korttid eller langtid? Slik velger du riktig utleiemodell',
    excerpt: 'Langtidsutleie gir forutsigbarhet, korttidsutleie gir høyere inntekt i sesong. Her er hvordan du finner den beste balansen.',
    coverImage: U('https://images.unsplash.com/photo-1696454596382-df8fd11ba53b'),
    tags: ['Utleiemodell', 'Korttid', 'Langtid'],
    seoTitle: 'Korttid eller langtid? Velg riktig utleiemodell | DigiHome',
    seoDescription: 'Langtid gir forutsigbarhet, korttid gir høyere inntekt i sesong. Slik finner du den beste balansen for boligen din.',
    publishedAt: iso(6),
    content: `Et av de viktigste valgene du tar som utleier er hvilken modell du skal bruke. Begge har klare fordeler — og ofte er svaret en kombinasjon.

## Langtidsutleie: forutsigbar inntekt

Langtidsutleie betyr en fast leietaker over måneder eller år. Fordelene er tydelige:

- **Forutsigbar månedlig inntekt** og enklere budsjettering
- **Lavere arbeidsmengde** — færre inn- og utflyttinger
- **Stabil belastning** på boligen

Ulempen er at du er bundet til en fast pris, selv i perioder der etterspørselen (og prisene) er høye.

## Korttidsutleie: høyere inntekt i sesong

Korttidsutleie — for eksempel via Airbnb og Booking.com — gir mulighet for vesentlig høyere døgnpriser, særlig i turistsesong og rundt arrangementer. I en by som Bergen kan sommermånedene gi betydelig meravkastning.

Til gjengjeld krever det mer: hyppigere renhold, gjestekommunikasjon, dynamisk prising og mer aktiv drift.

## 10+2-modellen: det beste fra begge

Hos DigiHome anbefaler vi ofte en hybrid vi kaller **10+2-modellen**: boligen leies ut langtid i ti måneder for trygg inntekt, og korttid i de to mest lønnsomme høysesongmånedene. Resultatet er forutsigbarhet *og* en inntektstopp når etterspørselen er på sitt høyeste — opptil 30 % mer enn ren langtidsutleie.

## Hva passer for din bolig?

Valget avhenger av beliggenhet, boligtype og hvor mye du vil være involvert. Sentrale leiligheter egner seg godt for hybrid, mens familieboliger i rolige strøk ofte passer best for langtid.

DigiHome analyserer boligen din og foreslår den modellen som gir høyest avkastning — og håndterer hele driften for deg. [Start med en gratis vurdering](/bli-utleier).`,
  },
  {
    slug: '5-ting-som-gjor-at-boligen-leies-ut-raskere',
    title: '5 ting som gjør at boligen din leies ut raskere',
    excerpt: 'Små grep gir stor forskjell. Slik gjør du boligen mer attraktiv og kutter tiden den står tom.',
    coverImage: U('https://images.pexels.com/photos/11622889/pexels-photo-11622889.jpeg', true),
    tags: ['Utleietips', 'Guide'],
    seoTitle: '5 ting som gjør at boligen leies ut raskere | DigiHome',
    seoDescription: 'Reduser tomgangstiden: fem konkrete grep som gjør utleieboligen mer attraktiv og leies ut raskere.',
    publishedAt: iso(11),
    content: `Hver uke boligen står tom er tapt inntekt. Den gode nyheten: med noen enkle grep kan du gjøre boligen langt mer attraktiv og kutte tiden frem til signert kontrakt.

## 1. Profesjonelle bilder

Annonsen din konkurrerer med hundrevis av andre. Lyse, skarpe og godt komponerte bilder er det første — og viktigste — leietakere ser. Dårlige bilder gjør at folk scroller forbi, uansett hvor fin boligen er.

## 2. Riktig pris fra start

For høy pris gir tomgang; for lav pris gir tapt inntekt. Bruk faktiske markedsdata for området og boligtypen til å treffe riktig. Det er bedre å prise riktig fra start enn å justere ned etter tre uker uten interesse.

## 3. En ryddig og nøytral bolig

En ren, ryddig og nøytralt innredet bolig gjør det lettere for leietakeren å se seg selv bo der. Vurder enkel styling før visning — det trenger ikke koste mye.

## 4. Rask respons på henvendelser

Leietakere som tar kontakt, ser ofte på flere boliger samtidig. Den som svarer raskt og profesjonelt, vinner ofte leietakeren. Sen respons betyr tapte muligheter.

## 5. En tydelig og trygg annonse

Vær konkret om hva som er inkludert, innflyttingsdato og betingelser. Tydelighet skaper tillit — og tillit gjør at seriøse leietakere tar steget.

## La oss ta jobben

Hos DigiHome håndterer vi alt dette for deg: profesjonell fotografering, datadrevet prising, annonsering på de riktige kanalene og rask oppfølging av interessenter. Resultatet er kortere tomgang og bedre leietakere.

[Få en gratis verdivurdering](/bli-utleier) og se hvor raskt boligen din kan være utleid.`,
  },
];

async function main() {
  const client = new MongoClient(env.MONGO_URL);
  await client.connect();
  const db = client.db(env.DB_NAME);
  const col = db.collection('posts');
  let created = 0;
  for (const p of posts) {
    const existing = await col.findOne({ slug: p.slug });
    const doc = {
      id: existing ? existing.id : randomUUID(),
      ...p,
      author: 'DigiHome',
      status: 'published',
      updatedAt: new Date().toISOString(),
      createdAt: existing ? existing.createdAt : p.publishedAt,
    };
    await col.updateOne({ slug: p.slug }, { $set: doc }, { upsert: true });
    created++;
  }
  const total = await col.countDocuments({});
  console.log(`Seedet/oppdatert ${created} artikler. Totalt i db: ${total}`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
