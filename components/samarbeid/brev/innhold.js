import 'server-only';
/** Privat invitasjon til Martin Vikesland og Øyvind Storli Hoel – ett brev, på /samarbeid. Ikke søkbart, ikke lenket fra noe sted.
 *  En personlig invitasjon fra Erik, Sarah og Martin – ikke en landingsside. Gjelder KUN DigiHome Tech AS.
 *  SERVER-ONLY: teksten leses av server-komponenten i app/samarbeid og sendes bare til nettlesere med gyldig sesjon – den ligger ikke i JS-bundlen.
 *  Én kilde til sannhet for tall: DEAL (emisjonen), PORTEFOLJE (aktive enheter). Alt annet refererer hit.
 *  v8 (05.10.2026): teksten skrevet på nytt av brukeren – si hva som er gjort, hvorfor vi vil ha dem med, og hva som skjer videre.
 *  Ingen «investor-presentasjon»-språk (verdiløft, SaaS-bevis, risikoreduksjon). «Hva som er gjort» og «Det neste vi skal bevise» er
 *  slått sammen, og de fire bevispunktene ligger i roadmapens resultatkolonne. Skjermbildene i produkt.js er uendret.
 *  v9: nytt kapittel 04 Strategi (B2B / B2C / kombinasjon – vår hypotese, et diskusjonsgrunnlag). 12 kapitler.
 *  v10 (05.10.2026, økonomi): DEAL = 1 000 000 kr ny kapital, 10 % samlet, 9,0 pre / 10,0 post – ingen antatt fordeling. KAPITAL = foreløpig
 *  3-månedersplan (226 000 kr/mnd · 678 000 kr + 20 000 emisjon/juridisk + 50 000 buffer = 748 000 avsatt; 252 000 ikke disponert). PRIS = ett
 *  hypotetisk oppsideeksempel (1 000 enheter → 130 000 kr/mnd → 1,56 MNOK ARR; 780 000 kr fakturert år 1 fra måned 7). Base case/7,8 MNOK fjernet. */

/* ── Emisjonen – én kilde til sannhet (v10, 05.10.2026): 1 000 000 kr ny kapital for 10 % SAMLET eierandel etter emisjonen
 *     → 9,0 MNOK pre-money, 10,0 MNOK post-money. Fordelingen mellom de to er IKKE bestemt – ingen «500 000 kr» eller «5 % hver». ── */
const INVESTERING = 1_000_000;
const EIERANDEL = 0.10;
const POST_MONEY = INVESTERING / EIERANDEL; // 10 000 000 kr
const PRE_MONEY = POST_MONEY - INVESTERING; // 9 000 000 kr
const kr = (n) => `${Math.round(n).toLocaleString('nb-NO').replace(/\s/g, '\u00a0')}\u00a0kr`;
const mnok = (n, d = 1) => `${(n / 1e6).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d })}\u00a0MNOK`;
const pct = (p) => `${(p * 100).toLocaleString('nb-NO', { maximumFractionDigits: 1 })}\u00a0%`;

export const DEAL = {
  preMoney: PRE_MONEY,
  postMoney: POST_MONEY,
  investering: INVESTERING,
  eierandel: EIERANDEL,
  investorer: ['Martin Vikesland', 'Øyvind Storli Hoel'],
  /* Ferdig formaterte strenger – brukes i teksten. */
  f: {
    investering: kr(INVESTERING),
    investeringKort: mnok(INVESTERING),
    preMoney: mnok(PRE_MONEY),
    postMoney: mnok(POST_MONEY),
    eierandel: pct(EIERANDEL),
    regnestykke: `${mnok(PRE_MONEY)} før + ${mnok(INVESTERING)} ny kapital = ${mnok(POST_MONEY)} etter · ${mnok(INVESTERING)} ÷ ${mnok(POST_MONEY)} = ${pct(EIERANDEL)} samlet`,
  },
  fordeling: 'Hvordan investeringen og aksjene fordeles mellom dere, er ikke bestemt. Det avklarer vi sammen med dere før term sheet.',
};

/* ── Kapitalplanen – én kilde til sannhet for de første tre månedene. Grunnplanen tåler null ekstern inntekt. Ingen inntekt lagt inn.
 *     kilde 'bekreftet' = inngangsverdi oppgitt av oss (gründerlønn 600 000 kr/år brutto = 50 000 kr/mnd, utviklingskreditter, hosting).
 *     kilde 'estimat' = planleggingsestimat, ikke innhentet tilbud. Gründerressursen: 50 000 kr brutto (bekreftet) + en avrundet, konservativ
 *     arbeidsgiverreserve (estimat) – ikke en nøyaktig årsberegning. Ingen lønn eller forpliktelse for Sarah er lagt inn. ── */
const PLAN_MND = 3;
const LONN_BRUTTO_AAR = 600_000;
const LONN_BRUTTO_MND = LONN_BRUTTO_AAR / 12; // 50 000 kr
const FERIEPENGER = 0.12;
const AGA = 0.141; // sone I
const PENSJON = 0.02; // OTP
const GRUNDER_RESERVE_MND = 66_000; // avrundet opp fra ≈ 65 000 kr
const RESERVE_BEREGNET = LONN_BRUTTO_MND * (1 + FERIEPENGER) * (1 + AGA) + LONN_BRUTTO_MND * PENSJON * (1 + AGA); // ≈ 65 037 kr
const POSTER = [
  { key: 'grunder', post: 'Gründerressurs', sub: `${kr(LONN_BRUTTO_MND)} brutto lønn/mnd (bekreftet) + foreløpig arbeidsgiverreserve for feriepenger, arbeidsgiveravgift og pensjon (estimat)`, kilde: 'estimat', mnd: GRUNDER_RESERVE_MND, lonn: true },
  { key: 'kreditter', post: 'Utviklingskreditter', sub: 'Utviklingskapasitet. Føres én gang – ikke dobbelt.', kilde: 'bekreftet', mnd: 150_000 },
  { key: 'hosting', post: 'Hosting', sub: 'Dekker ikke nødvendigvis KI/API-, signerings-, integrasjons- og transaksjonskostnader – avklares før prising.', kilde: 'bekreftet', mnd: 500 },
  { key: 'regnskap', post: 'Regnskap', sub: 'Løpende regnskapsføring.', kilde: 'estimat', mnd: 4_000 },
  { key: 'bank', post: 'Bank og verktøy', sub: 'Bank, lisenser og programvare.', kilde: 'estimat', mnd: 1_500 },
  { key: 'forsikring', post: 'Bedriftsforsikring', sub: 'Ikke innhentet tilbud.', kilde: 'estimat', mnd: 1_000 },
  { key: 'pilot', post: 'Pilot og reise', sub: 'Møter og pilotarbeid hos kunde.', kilde: 'estimat', mnd: 3_000 },
];
const SUM_MND = POSTER.reduce((s, p) => s + p.mnd, 0); // 226 000 kr
const SUM_PLAN = SUM_MND * PLAN_MND; // 678 000 kr
const EMISJON_JUR = 20_000; // estimat, engang
const BUFFER = 50_000; // avsatt, engang
const AVSATT = SUM_PLAN + EMISJON_JUR + BUFFER; // 748 000 kr
const IKKE_DISPONERT = INVESTERING - AVSATT; // 252 000 kr
const EKSTRA_MND = IKKE_DISPONERT / SUM_MND; // ≈ 1,1 måned

export const KAPITAL = {
  planMnd: PLAN_MND,
  poster: POSTER.map((p) => ({ ...p, tre: p.mnd * PLAN_MND, f: { mnd: kr(p.mnd), tre: kr(p.mnd * PLAN_MND) } })),
  sum: { mnd: SUM_MND, tre: SUM_PLAN, f: { mnd: kr(SUM_MND), tre: kr(SUM_PLAN) } },
  engang: [
    { key: 'emisjon', post: 'Emisjon og juridisk arbeid', sub: 'Estimat – ikke innhentet tilbud.', kilde: 'estimat', belop: EMISJON_JUR, f: kr(EMISJON_JUR) },
    { key: 'buffer', post: 'Buffer', sub: 'Særskilt reserve. Brukes ikke i grunnplanen.', kilde: 'avsatt', belop: BUFFER, f: kr(BUFFER) },
  ],
  avsatt: { belop: AVSATT, f: kr(AVSATT) },
  ikkeDisponert: { belop: IKKE_DISPONERT, f: kr(IKKE_DISPONERT), ekstraMnd: EKSTRA_MND },
  emisjon: { belop: INVESTERING, f: kr(INVESTERING) },
  /* Disponeringen av emisjonen – fire deler som summerer til 1 000 000 kr. */
  disponering: [
    ['Løpende plan · 3 mnd', SUM_PLAN, kr(SUM_PLAN)],
    ['Emisjon og juridisk', EMISJON_JUR, kr(EMISJON_JUR)],
    ['Buffer', BUFFER, kr(BUFFER)],
    ['Ikke disponert', IKKE_DISPONERT, kr(IKKE_DISPONERT)],
  ],
  /* Forutsetningene bak gründerressursen – vises i en åpne/lukke-blokk (tastatur) og alltid i utskrift. */
  lonn: {
    bruttoAar: kr(LONN_BRUTTO_AAR),
    bruttoMnd: kr(LONN_BRUTTO_MND),
    steg: [
      ['Brutto lønn per måned', kr(LONN_BRUTTO_MND), 'bekreftet inngangsverdi – 600 000 kr brutto i året'],
      ['+ feriepenger 12 %', kr(LONN_BRUTTO_MND * FERIEPENGER), 'forutsetning'],
      ['+ arbeidsgiveravgift 14,1 % (sone I)', kr(LONN_BRUTTO_MND * (1 + FERIEPENGER) * AGA), 'forutsetning – av lønn og feriepenger'],
      ['+ pensjon 2 % (OTP) inkl. avgift', kr(LONN_BRUTTO_MND * PENSJON * (1 + AGA)), 'forutsetning'],
      ['≈ beregnet', kr(Math.round(RESERVE_BEREGNET / 100) * 100), 'avrundet opp til likviditetsreserve'],
      ['Lagt inn i planen', kr(GRUNDER_RESERVE_MND), `per måned · ${kr(GRUNDER_RESERVE_MND * PLAN_MND)} for tre måneder`],
    ],
  },
};

/* ── Prismodellen – IKKE validert. Tallene under er ett hypotetisk oppsideeksempel (stor kunde etter full utrulling), ikke prisliste. ── */
const PRIS_FAST = 30_000;
const PRIS_ENHET = 100;
const EKS_ENHETER = 1_000;
const EKS_MND = PRIS_FAST + EKS_ENHETER * PRIS_ENHET; // 130 000 kr
const EKS_ARR = EKS_MND * 12; // 1 560 000 kr
const EKS_FRA_MND = 7;
const EKS_FAKTURERT_AAR1 = EKS_MND * (12 - EKS_FRA_MND + 1); // 6 × 130 000 = 780 000 kr
export const PRIS = {
  fast: kr(PRIS_FAST),
  enhet: kr(PRIS_ENHET),
  eks: {
    enheter: EKS_ENHETER.toLocaleString('nb-NO').replace(/\s/g, '\u00a0'),
    variabel: kr(EKS_ENHETER * PRIS_ENHET),
    mnd: kr(EKS_MND),
    arr: mnok(EKS_ARR, 2),
    fraMnd: EKS_FRA_MND,
    mndFakturert: 12 - EKS_FRA_MND + 1,
    fakturertAar1: kr(EKS_FAKTURERT_AAR1),
  },
};

/* ── Porteføljen – ett tall, én dato. Oppdateres her før utsendelse. ── */
export const PORTEFOLJE = { aktiveEnheter: 35, per: '5. oktober 2026' };

export const INV = {
  date: '5. oktober 2026',
  to: 'Til Martin og Øyvind',
  toLong: 'Til Martin Vikesland og Øyvind Storli Hoel',
  from: 'Fra Erik, Sarah og Martin',
  firstNames: 'Martin og Øyvind',
  fullNames: 'Martin Vikesland og Øyvind Storli Hoel',
};

/** Portrettene – én definisjon per person, brukt både i hero-stripen og i laget. `sm` er en 600 px-variant (scripts/samarbeid-portretter.mjs)
 *  som nettleseren velger på kort og mobil via srcset; `w` er originalens bredde. HUSK: nye/endrede filer i /public må også lastes opp til
 *  objektlagringen (scripts/upload_public_to_storage.mjs) – i tillegg traces de inn i standalone-bygget (next.config.js → SAMARBEID_MEDIA). */
const PORTRETT = {
  erik: { img: '/team-erik.webp', imgW: 600, pos: '50% 18%' },
  sarah: { img: '/brand/sarah-sleeman-1000.webp', imgSm: '/brand/sarah-sleeman-600.webp', imgW: 1000, pos: '50% 28%' },
  martin: { img: '/v4/martin.webp', imgSm: '/v4/martin-600.webp', imgW: 800, pos: '50% 22%' },
  /* ?v=2: den gamle filen (13 KB) lå igjen i Cloudflare-cachen med immutable-header etter at filen ble byttet 05.10. */
  jens: { img: '/team/jens-petter-glittenberg.webp?v=2', imgSm: '/team/jens-petter-glittenberg-600.webp', imgW: 900, pos: '50% 28%' },
  kevin: { img: '/team/kevin-ai-v2.webp', imgSm: '/team/kevin-ai-v2-600.webp', imgW: 800, pos: '50% 22%' },
  vikesland: { img: '/team/martin-vikesland.webp', imgSm: '/team/martin-vikesland-600.webp', imgW: 900, pos: '50% 30%' },
  hoel: { img: '/team/oyvind-storli-hoel.webp', imgSm: '/team/oyvind-storli-hoel-600.webp', imgW: 759, pos: '50% 22%' },
};

export const AVSENDERE = [
  { key: 'erik', name: 'Erik Hoffmann-Dahl', role: 'Styreleder · Chief Legal Officer', ...PORTRETT.erik },
  { key: 'sarah', name: 'Sarah Sleeman', role: 'Daglig leder · styremedlem', ...PORTRETT.sarah },
  { key: 'martin', name: 'Martin C. Kviteberg', role: 'Produktsjef · styremedlem', ...PORTRETT.martin },
];

/** Hele laget i ett rutenett (rekkefølgen her er rekkefølgen på siden): daglig leder, produktsjef, styreleder/CLO, styremedlem, utvikling – så de to vi inviterer inn.
 *  Ingen definerte roller på Martin og Øyvind før de har investert. Bioene er korte og ulikt bygget opp – kapittel 01 sier allerede «vi ser for oss …», så det gjentas ikke her. */
export const TEAM = [
  { key: 'sarah', name: 'Sarah Sleeman', role: 'Daglig leder', ...PORTRETT.sarah, bio: 'Eiendomsmegler med seks år i DNB. Leder kundeakkvisisjon og forvaltning og sitter tett på den operative driften og kundene.' },
  { key: 'martin', name: 'Martin C. Kviteberg', role: 'Produktsjef', ...PORTRETT.martin, bio: 'Grunnla BnbSpesialisten og jobbet ti år i Adonis frem mot exit. Leder produkt- og teknologiutviklingen i DigiHome.' },
  { key: 'erik', name: 'Erik Hoffmann-Dahl', role: 'Styreleder · Chief Legal Officer', ...PORTRETT.erik, bio: 'Advokat og partner i Hoffmann Thinn. Har jobbet med selskapsstruktur og juridiske rammer rundt DigiHome.' },
  { key: 'jens', name: 'Jens-Petter Glittenberg', role: 'Styremedlem', ...PORTRETT.jens, bio: 'Medgründer av Meltwater og styreleder i CARN Capital. Har erfaring med internasjonal skalering, kapitalmarked og selskapsbygging.' },
  { key: 'kevin', name: 'Kevin Ha', role: 'Utvikling', ...PORTRETT.kevin, bio: 'Bistår Martin i utviklingen av plattformen. Siviløkonom fra NHH med kompetanse innen KI-drevet utvikling og automatisering.' },
  { key: 'vikesland', name: 'Martin Vikesland', role: 'Inviteres inn som medeier', ...PORTRETT.vikesland, invited: true, bio: 'Økonomi og finans. Den vi vil diskutere tallene, kapitalplanen og finansieringen med – og ha med oss i investordialogen når neste runde kommer.' },
  { key: 'hoel', name: 'Øyvind Storli Hoel', role: 'Inviteres inn som medeier', ...PORTRETT.hoel, invited: true, bio: 'Kjenner eiendomsmarkedet, kundene og den kommersielle siden. Viktig for oss på marked, produkt og veien inn mot større eiendomsaktører.' },
];

/** srcset/sizes for et portrett – samme logikk i hero (Person) og i gatens forhåndslasting, så nettleseren varmer akkurat den varianten den senere velger. */
export const portrettKilder = (p) => ({
  src: p.img,
  srcSet: p.imgSm ? `${p.imgSm} 600w, ${p.img} ${p.imgW || 1000}w` : undefined,
});
export const HERO_SIZES = '(max-width: 640px) 72vw, 400px';

export const BREV = {
  eyebrow: 'Privat invitasjon',
  role: 'Medeier i DigiHome Tech',
  brand: 'DigiHome',
  confidential: 'Konfidensielt',
  h1: ['Vi vil gjerne ha dere', 'med på eiersiden.'],
  /* Tre korte avsnitt under tittelen. */
  sub: [
    'Etter flere gode møter har vi fått et klart inntrykk av at dere kan tilføre DigiHome mye i det som kommer nå.',
    'Plattformen er bygget og i drift. Neste jobb er å gjøre den klar for større eksterne kunder og bygge DigiHome Tech som et selvstendig programvareselskap.',
    'I den jobben ønsker vi dere med som medeiere.',
  ],
  cta: 'Les invitasjonen',
  hi: 'Hei Martin og Øyvind,',
  signature: 'Erik, Sarah og Martin',

  /* Brevet – sju avsnitt. Det siste tones ned (muted) av komponenten; `letterStrong` er det uthevede. */
  letter: [
    'Takk for gode samtaler den siste tiden.',
    'Gjennom møtene våre, både fysisk og på Teams, har vi blitt godt kjent med hvordan dere tenker rundt eiendom, teknologi, økonomi og skalering. Dere har stilt gode spørsmål og utfordret oss på ting vi selv mener blir avgjørende fremover.',
    'DigiHome er nå på et naturlig punkt mellom to faser.',
    'Den første har handlet om å bygge produktet og bruke det i vår egen forvaltning. Det har gitt oss en plattform som allerede håndterer reelle eiendommer, eiere, leietakere, kontrakter, innbetalinger og saker.',
    'Den neste handler om å gjøre det samme produktet klart for andre.',
    'Det er i denne fasen vi ønsker dere med – ikke bare som investorer, men som medeiere vi kan diskutere de viktigste valgene med underveis.',
    'Her har vi samlet det vi mener dere trenger for å vurdere det: hva som er bygget, hvor vi vil med DigiHome, hva kapitalen skal brukes til og tilbudet vi ønsker å gi dere.',
  ],
  letterStrong: 5,

  /* ── 01 Derfor ønsker vi dere med ── */
  why: {
    eyebrow: 'Derfor ønsker vi dere med',
    title: 'Dette handler om mer enn kapital.',
    paragraphs: [
      'Martin kommer med en sterk økonomisk og finansiell bakgrunn. Øyvind kjenner eiendomsmarkedet, kundene og den kommersielle siden godt. Det utfyller laget vi allerede har.',
      'Samtidig er det samtalene vi har hatt som gjør at vi ønsker akkurat dere med. Vi har diskutert produkt, prismodell, kapitalbehov, marked og hvordan DigiHome kan bygges som et eget teknologiselskap. Det er nettopp slike diskusjoner vi kommer til å ha mange av det neste året.',
      'Vi ser derfor for oss Martin som en viktig sparringspartner på økonomi, finansiering og kapital, og Øyvind som en viktig sparringspartner på marked, produkt og veien inn mot større eiendomsaktører.',
      'Vi ønsker dere rundt bordet når disse valgene skal tas.',
    ],
  },

  /* ── 10 Laget – og rollen vi ser for dere ── */
  team: {
    eyebrow: 'Laget',
    title: 'Og rollen vi ser for dere.',
    paragraphs: [
      'I dag har vi produkt, teknologi, operativ eiendomsforvaltning, juss og erfaring med selskapsbygging rundt bordet.',
      'Når DigiHome nå skal ut til større eksterne kunder, ønsker vi særlig å styrke to områder: økonomi og kapital på den ene siden, og marked og eiendom på den andre. Det er her vi mener dere passer godt inn.',
    ],
    rolleH: 'Hva innebærer det for dere?',
    rolleLead: 'Vi forventer ikke at dere skal gå inn i operative stillinger eller få en liste med faste arbeidsoppgaver. Men dette er heller ikke tenkt som en helt passiv investering. Vi ønsker at dere deltar når vi diskuterer de viktigste valgene for selskapet, og at vi kan bruke dere som sparringspartnere på områdene dere kjenner best. Hvor ofte og i hvilken form finner vi en praktisk løsning på sammen. Poenget er at dere blir reelle medeiere i selskapet vi nå skal bygge videre.',
    rolle: [],
  },

  /* ── 02 DigiHome i dag – produktbeviset. Skjermbildene står uten bildetekster. ── */
  built: {
    eyebrow: 'DigiHome i dag',
    title: ['Produktet er bygget', 'og brukes hver dag.'],
    paragraphs: [
      'DigiHome er ikke en prototype som skal begynne å testes etter denne emisjonen. Plattformen brukes allerede i vår egen forvaltning, med faktiske eiere, leietakere, kontrakter, innbetalinger og saker.',
      'Det betyr at mye av grunnarbeidet allerede er gjort. Vi har kunnet bygge produktet tett på den virkeligheten det skal fungere i – og endre det fortløpende når vi har sett hva som fungerer og hva som ikke gjør det.',
    ],
    /* Ett tall, stort. */
    stat: [String(PORTEFOLJE.aktiveEnheter), 'aktive enheter på plattformen', `per ${PORTEFOLJE.per}`],
    listH: 'Dette finnes i dag',
    list: [
      ['Forvalterens arbeidsflate', 'Oversikt over portefølje, eiendommer, leieforhold, saker, kommunikasjon, oppgaver og økonomi.'],
      ['Utleieprosessen', 'Fra markedsføring og henvendelser til visning, oppfølging, kontrakt og innflytting.'],
      ['Økonomi', 'KID-matching, purring, eieroppgjør og bokføringsgrunnlag.'],
      ['Eierapp og leietakerapp', 'Egne flater for de viktigste delene av kundeforholdet.'],
      ['KI i arbeidsflytene', 'Brukes blant annet i kommunikasjon, saksbehandling og rutinearbeid.'],
      ['Nettsted og kundereise', 'Fra første søk og henvendelse til inngått leieforhold.'],
    ],
    integrasjoner: [
      ['Integrasjoner i drift', 'FINN · BankID · Keyhole · PowerOffice Go'],
      ['Videre integrasjoner', 'Blant annet Fiken og andre systemer som blir relevante for eksterne kunder.'],
    ],
    note: 'Den løpende forvaltningen er fortsatt viktig for produktutviklingen. Den gir oss et produksjonsmiljø der vi kan bruke DigiHome hver dag og se konsekvensene av det vi bygger.',
  },

  /* ── 03 Hvor vi skal ── */
  target: {
    eyebrow: 'Hvor vi skal',
    title: 'Et operativt system for profesjonell boligutleie.',
    paragraphs: [
      'Vi ønsker at DigiHome skal være systemet forvalter, eier og leietaker faktisk bruker gjennom hele leieforholdet. Ikke bare et register over eiendommer og kontrakter, men arbeidsflaten der den daglige driften skjer.',
      'Dagens produkt er bygget rundt vår egen forvaltning. Det har vært en effektiv måte å komme langt på, fordi vi selv har vært brukeren og kunnet teste alt i praksis. Nå skal vi finne ut hvordan det fungerer hos andre.',
    ],
    principle: 'Det betyr også at vi må skille mellom det som er spesielt for måten DigiHome forvalter på, og det som bør være en generell del av produktet for alle profesjonelle eiendomsaktører. Det er den viktigste produktjobben foran oss.',
  },

  /* ── 04 Strategi – B2B først. Vår vurdering, ikke dokumentert markedsfakta. Videre retning tar vi stilling til sammen med investorene. ── */
  strategi: {
    eyebrow: 'Strategi',
    title: 'Først profesjonelle eiendomsselskaper og forvaltere.',
    paragraphs: [
      'DigiHome kan i prinsippet selges både til profesjonelle eiendomsaktører og direkte til private utleiere. Vi tror det er klokt å velge én retning først.',
      'Vår foreløpige vurdering er derfor å prioritere B2B i Norge: eiendomsselskaper og profesjonelle forvaltere med større porteføljer og reelle behov for bedre systemstøtte. Det er også her produktet vi allerede har bygget ligger nærmest kundens behov.',
      'Vi tror markedet er interessant, men har ennå ikke dokumentert betalingsviljen eller hvor raskt slike kunder vil bytte system. Det er nettopp dette de første eksterne kundene skal hjelpe oss å finne ut.',
    ],
    alternativer: [
      ['B2B', 'Første prioritet', 'Profesjonelle eiendomsselskaper og forvaltere. Vi vil starte smalt, få én god kunde i drift og lære før vi bygger en større salgsorganisasjon.'],
      ['B2C', 'Ikke prioritert nå', 'Direkte salg til private utleiere kan bli aktuelt senere, men vi ønsker ikke å bygge to kommersielle modeller samtidig.'],
      ['Videre retning', 'Tar vi stilling til sammen', 'B2B først trenger ikke bety B2B alene på lang sikt. Men vi vil ha reelle erfaringer fra markedet før vi bestemmer neste steg.'],
    ],
  },

  /* ── 05 DigiHome Tech og forvaltningen ── */
  structure: {
    eyebrow: 'DigiHome Tech og forvaltningen',
    title: 'To selskaper med hver sin jobb.',
    paragraphs: [
      'DigiHome Tech AS skal eie teknologien, utvikle produktet og selge plattformen til profesjonelle eiendomsselskaper og forvaltere. Forvaltningsselskapet driver den operative eiendomsforvaltningen og bruker DigiHome som sitt system.',
      'Det gir Tech to fordeler i starten: et reelt produksjonsmiljø å utvikle i og tett tilgang til brukere og problemstillinger fra den daglige driften. Samtidig er det viktig at skillet mellom selskapene er tydelig. DigiHome Tech skal kunne selge til hele markedet, også selskaper som konkurrerer med vår egen forvaltningsvirksomhet.',
    ],
    rows: [
      ['DigiHome Tech AS', 'Eier og utvikler plattformen. Det er dette selskapet dere inviteres inn i.'],
      ['Forvaltningsselskapet', 'Bruker DigiHome i den daglige driften og blir et av produksjonsmiljøene produktet utvikles i.'],
      ['Avtalen mellom selskapene', 'Forholdet reguleres gjennom en ordinær kunde- og lisensavtale på kommersielle vilkår.'],
      ['IP og rettigheter', 'Kildekode, produkt-IP, merkevare, produktdesign, datamodeller og øvrige teknologirettigheter skal ligge i DigiHome Tech AS. Dette dokumenteres før emisjonen gjennomføres.'],
    ],
  },

  /* ── 06 Arbeidet så langt ── */
  naa: {
    eyebrow: 'Arbeidet så langt',
    title: ['Den første byggejobben', 'er allerede gjort.'],
    paragraphs: [
      'Siden oppstarten har vi brukt rundt 500\u00a0000 kroner i direkte utviklingskostnader og anslagsvis 1\u00a0000–1\u00a0500 timer på produktarbeid. Det viktigste er likevel hva arbeidet har resultert i.',
      'Vi har bygget merkevaren, nettstedet og kundereisen. Vi har utviklet forvalterens arbeidsflate, eierappen og leietakerappen. Vi har bygget arbeidsflyter for utleie, drift, saker og økonomi, koblet på eksterne tjenester og brukt løsningen i faktisk drift.',
      'Det gjør at de som kommer inn nå ikke investerer i en idé om et fremtidig produkt. Produktet finnes. Det som fortsatt må bevises, er at andre profesjonelle eiendomsaktører vil ta det i bruk og betale for det.',
    ],
    steg: [
      ['Bygget', 'Fase 1 · gjennomført', 'Produkt, merkevare, arbeidsflyter, integrasjoner og grunnplattform. DigiHome brukes i egen drift.'],
      ['Nå', 'Fase 2 · produktisering og første eksterne kunde', 'Gjøre plattformen kundeuavhengig, enkel å implementere og klar for profesjonelle eiendomsselskaper. Målet er én god pilotkunde først.'],
      ['Skalere', 'Fase 3 · etter at modellen er bevist', 'Når vi har vist at en ekstern kunde kan onboardes, bruke produktet og betale for det, kan vi øke investeringene i produkt, salg og organisasjon. Det vil også være et naturlig tidspunkt å vurdere en større kapitalrunde.'],
    ],
    risikoH: 'Hva er bevist – og hva gjenstår?',
    risiko: [
      ['Kan vi bygge produktet?', 'Ja', 'Kjerneplattformen finnes og er i drift.'],
      ['Fungerer arbeidsflytene i praksis?', 'Testet i egen drift', 'De er utviklet og forbedret gjennom vår egen forvaltning.'],
      ['Kan DigiHome implementeres effektivt hos andre?', 'Jobben nå', 'Det er en av de viktigste tingene vi skal finne ut nå.'],
      ['Vil større eiendomsselskaper bruke og betale for produktet?', 'Gjenstår', 'Det er det neste kommersielle beviset.'],
    ],
  },

  /* ── 07 Roadmap – produktisering, enkel onboarding og pilotdrevet utvikling. Måned 1–3 finansieres av emisjonen; resten følger kundens
   *     tempo og er betinget av finansiering. Beslutningspunkt ved slutten av måned 2. ── */
  roadmap: {
    eyebrow: 'Roadmap',
    title: ['Fra vårt eget system til et produkt', 'større eiendomsselskaper kan ta i bruk.'],
    paragraphs: [
      'Den viktigste jobben de kommende månedene er ikke å bygge flest mulig nye funksjoner. Vi har allerede et omfattende produkt. Jobben nå er å gjøre DigiHome klart for andre selskaper – og gjøre terskelen for å ta det i bruk så lav som mulig.',
      'Vi ønsker heller ikke å bruke kapital på å gjette oss frem til hvilke nye funksjoner større kunder trenger. Strategien er å gjøre grunnplattformen klar, få med én god pilotkunde og bruke den faktiske implementeringen til å styre hva som bør bygges videre.',
    ],
    status: { emisjon: 'Finansiert av denne emisjonen', betinget: 'Følger kundens tempo · betinget av finansiering' },
    steg: [
      {
        n: 'Måned 1–3', h: 'Gjøre DigiHome klart for eksterne kunder', status: 'emisjon',
        avsnitt: ['DigiHome er i dag bygget for vår egen organisasjon. Før en større ekstern kunde kan ta det i bruk, skal plattformen gjøres tydelig kundeuavhengig. Arbeidet omfatter blant annet:'],
        punkter: ['separate kundemiljøer, data og tilganger', 'roller og tilgangsstyring', 'administrasjon og sikkerhet', 'onboarding og import av eksisterende data', 'et mer generelt integrasjonslag', 'tydelig skille mellom DigiHomes egen forvaltning og eksterne kunder', 'kartlegging og avgrensning av første pilot'],
        deler: [
          ['Onboarding blir en viktig del av produktet', [
            'For en større eiendomsaktør er ikke spørsmålet bare om det nye systemet er bedre. Det må også være realistisk å bytte. Eksisterende porteføljedata skal over. Brukere skal settes opp. Arbeidsprosesser må ivaretas. Og DigiHome må fungere sammen med systemene kunden allerede bruker.',
            'Vi tror derfor enkel onboarding kan bli et viktig konkurransefortrinn. Målet er å redusere tiden, arbeidet og risikoen ved å gå fra eksisterende systemer til DigiHome så mye som mulig. Vi vil bruke den første piloten til å utvikle en onboardingmodell som senere kan gjentas hos kunde nummer to, tre og ti.',
          ]],
          ['Integrasjoner', [
            'Vi forventer ikke at DigiHome skal erstatte alle systemene en større eiendomsaktør bruker. Plattformen må fungere godt sammen med kundens eksisterende systemer, særlig økonomi og andre sentrale fagsystemer. Vi har allerede integrasjon mot PowerOffice Go.',
            'I stedet for å bygge et stort bibliotek av integrasjoner basert på antakelser, vil vi kartlegge systemlandskapet hos pilotkunden og prioritere de integrasjonene som faktisk er nødvendige. Målet er å bygge integrasjonene på en måte som også gjør det enklere å koble på nye systemer senere.',
          ]],
        ],
        maalH: 'Mål etter de første tre månedene',
        maal: 'DigiHome skal være klart til å settes opp for en ekstern virksomhet med egne brukere, data, roller og integrasjoner. Vi skal samtidig ha en konkret pilotkunde eller pilotprosess der omfang, dataflyt, onboarding og nødvendige integrasjoner er avklart.',
      },
      {
        n: 'Måned 4–6', h: 'Første eksterne pilot', status: 'betinget',
        avsnitt: [
          'En avgrenset del av en kundes portefølje settes i drift i DigiHome. Piloten skal brukes til å teste hele overgangen, ikke bare funksjonene i produktet.',
          'Vi skal blant annet finne ut hvor enkelt det er å flytte kunden over, hvilke tilpasninger som faktisk trengs, hvilke integrasjoner som er nødvendige og hvor mye arbeid implementeringen krever.',
          'Samtidig skal vi være bevisste på forskjellen mellom et reelt produktbehov og et særønske fra én kunde. DigiHome skal ikke bli et konsulentprosjekt bygget rundt pilotkunden. Det kunden lærer oss skal brukes til å gjøre standardproduktet bedre.',
        ],
        maalH: 'Målet',
        maal: 'Én ekstern kunde bruker DigiHome i reell drift, og vi har et langt bedre svar på hva som kreves for å onboarde den neste.',
      },
      {
        n: 'Måned 6–12', h: 'Fra pilot til repeterbar modell', status: 'betinget',
        avsnitt: [
          'Når første kunde er i drift, begynner jobben med å standardisere det vi har lært. Onboarding, integrasjoner, konfigurasjon, avtaler, support og pris skal bli enklere å gjenta.',
          'Deretter kan vi gradvis rulle produktet videre ut hos den første kunden og eventuelt ta inn pilotkunde nummer to.',
        ],
        maalH: 'Målet',
        maal: 'Betalende aktive enheter i produksjon og en implementeringsmodell som i størst mulig grad kan gjentas hos neste kunde.',
      },
    ],
    kjede: ['Pilotkunde 1', 'Læring', 'Standardisering', 'Kunde 2', 'Skalering'],
    beslutningH: 'Beslutningspunkt · slutten av måned 2',
    beslutningLead: 'Kapitalen i denne emisjonen er først og fremst ment å finansiere produktiseringen og arbeidet frem mot første pilot. Før måned tre går mot slutten vurderer vi status på tre områder:',
    beslutning: [
      ['Produkt', 'Er plattformen klar for ekstern implementering?'],
      ['Pilot', 'Har vi en konkret kunde og et avklart pilotløp?'],
      ['Kapital', 'Har vi nok finansiering til å gjennomføre neste del av planen?'],
    ],
    beslutningNote: 'Hvis pilotløpet tar lenger tid enn planlagt, justerer vi kostnadene eller henter mer kapital før dagens kapital er brukt opp.',
  },

  /* ── 08 Forretningsmodell – prisen er ikke satt (bevisst). Ett regneeksempel (PRIS), tydelig merket. ── */
  modell: {
    eyebrow: 'Forretningsmodell',
    title: ['DigiHome skal selges', 'som programvare.'],
    paragraphs: [
      'Vi ser for oss en modell med en fast plattformavgift og en pris per aktiv boenhet. Den endelige prisen er ikke satt. Det er et bevisst valg.',
      'Før vi låser prismodellen ønsker vi å vite mer om hvor mye verdi DigiHome skaper for en profesjonell kunde, hva implementeringen faktisk koster og hva markedet er villig til å betale. Den første piloten blir derfor også viktig for prisarbeidet.',
    ],
    stegH: 'Rekkefølgen',
    steg: [
      ['Avgrenset pilot', 'DigiHome tas i bruk på en del av kundens portefølje.'],
      ['Dokumentere verdien', 'Vi må forstå hva kunden faktisk sparer i tid, kostnader og manuelt arbeid – og hva kunden er villig til å betale for det.'],
      ['Gradvis utrulling', 'Flere aktive enheter tas over i DigiHome og faktureres etter hvert som de kommer i drift.'],
    ],
    enhetH: 'Hva er en aktiv enhet?',
    enhet: 'En aktiv enhet er en boenhet som faktisk forvaltes i DigiHome og har et aktivt leieforhold. En kundes totale eiendomsportefølje er derfor ikke det samme som antall fakturerbare enheter.',
    eksempelH: 'Regneeksempel',
    eksempelSub: 'Dette er kun en illustrasjon av hvordan modellen kan se ut for én større kunde etter full utrulling.',
    eksempelRader: [
      ['Aktive boenheter', PRIS.eks.enheter, ''],
      ['Fast plattformavgift', PRIS.fast, 'per måned'],
      ['Per aktiv boenhet', `${PRIS.eks.enheter} × ${PRIS.enhet} = ${PRIS.eks.variabel}`, 'per måned'],
      ['Totalt abonnement', PRIS.eks.mnd, 'per måned'],
      ['Årlig abonnementsrate', PRIS.eks.arr, '12 × abonnement'],
    ],
    arr: [
      [PRIS.eks.arr, 'Årlig abonnementsrate', 'ved full utrulling, hele året'],
      [PRIS.eks.fakturertAar1, `${PRIS.eks.mndFakturert} måneder med abonnement`, `hvis full utrulling først skjer fra måned ${PRIS.eks.fraMnd === 7 ? 'syv' : PRIS.eks.fraMnd}`],
    ],
    arrNote: 'Dette er et regneeksempel, ikke en salgsprognose. Faktisk pris, utrullingstakt og eventuell separat betaling for onboarding og integrasjoner skal valideres med de første kundene.',
  },

  /* ── 09 Kapitalplan – de første tre månedene (tallene i KAPITAL). Uten eksterne kundeinntekter. Finansierer ikke tolv måneder. ── */
  kapital: {
    eyebrow: 'Kapitalplan',
    title: 'Hva den første millionen skal brukes til.',
    paragraphs: [
      `Emisjonen er på ${DEAL.f.investering.replace('\u00a0kr', ' kroner')}. Vi har lagt en konkret plan for de første tre månedene, fordi det er denne perioden emisjonen først og fremst skal finansiere.`,
      'Planen er satt opp uten eksterne kundeinntekter. Det betyr at vi ikke er avhengige av å fakturere en pilotkunde innen en bestemt dato for at de første månedene skal gå rundt.',
    ],
    kjenteH: 'Tre av inngangsverdiene er konkrete tall vi allerede kjenner:',
    kjente: [
      `gründerlønn på ${KAPITAL.lonn.bruttoMnd.replace('\u00a0kr', ' kroner')} brutto per måned`,
      `utviklingskreditter på ${KAPITAL.poster[1].f.mnd.replace('\u00a0kr', ' kroner')} per måned`,
      `hosting på ${KAPITAL.poster[2].f.mnd.replace('\u00a0kr', ' kroner')} per måned`,
    ],
    kjenteNote: 'Øvrige poster er foreløpige estimater. Det er ikke lagt inn lønn eller andre faste forpliktelser for Sarah.',
    legend: { bekreftet: 'Kjent tall', estimat: 'Foreløpig estimat', avsatt: 'Avsatt' },
    head: ['Post', 'Grunnlag', 'Per måned', '3 måneder'],
    sumLabel: 'Løpende plan',
    engangH: 'I tillegg',
    emisjonLabel: 'Emisjon',
    avsattLabel: 'Planlagt bruk de første tre månedene, juridisk arbeid og buffer',
    ikkeDisponertLabel: 'Ikke disponert',
    ikkeDisponertNote: `Tilsvarer litt over én ekstra måned med dagens kostnadsnivå (${KAPITAL.sum.f.mnd} per måned) dersom det blir nødvendig. Det gir rom til å justere planen underveis, men er ikke ment som finansiering av et helt ekstra kvartal.`,
    forbehold: 'Beløp er ekskl. mva der det er relevant. Mva-likviditet og valutakurs er ikke modellert. Hostingbeløpet dokumenterer ikke at KI/API-, signerings-, integrasjons- eller transaksjonskostnader er dekket – disse, og support/onboarding, avklares før de prises.',
    lonnH: 'Slik er gründerressursen beregnet',
    lonnToggle: ['Vis forutsetningene', 'Skjul forutsetningene'],
    lonnNote: [
      `De ${KAPITAL.poster[0].f.mnd} per måned er en avrundet, konservativ likviditetsreserve for tre måneders lønn og arbeidsgiverkostnad – ikke en nøyaktig årsberegning. Feriepengene er lagt inn som reserve for perioden, ikke som et tillegg til full årslønn.`,
      'Forutsetningene (12 % feriepenger, arbeidsgiveravgift 14,1 % i sone I, 2 % pensjon) må verifiseres mot faktisk arbeidsgiver, sone, avtale og pensjonsplikt.',
    ],
    disponeringH: 'Slik disponeres emisjonen',
    bruddH: 'Hva emisjonen ikke finansierer',
    brudd: [
      'Én million kroner finansierer ikke tolv måneders full drift på dagens kostnadsnivå.',
      'Hvis første pilot tar vesentlig lenger tid enn planlagt, må vi enten redusere kostnadene eller hente mer kapital. Det skal vi ta stilling til mens vi fortsatt har handlingsrom.',
    ],
  },

  /* ── 11 Tilbudet – alle tall fra DEAL. 1 000 000 kr ny kapital · 10 % samlet · 9,0 MNOK før · 10,0 MNOK etter. Fordelingen avklares sammen. ── */
  offer: {
    eyebrow: 'Tilbudet',
    title: `Vi tilbyr dere samlet ${DEAL.f.eierandel} av DigiHome Tech AS.`,
    paragraphs: [
      `${DEAL.investorer[0]} og ${DEAL.investorer[1]} tilbys å tegne nye aksjer for samlet ${DEAL.f.investering.replace('\u00a0kr', ' kroner')}. Etter emisjonen vil dere samlet eie ${DEAL.f.eierandel} av DigiHome Tech AS. Hvordan investeringen og aksjene fordeles mellom dere, avklarer vi sammen.`,
      'Prisingen er satt ut fra hvor DigiHome står i dag. Produktet er bygget og brukes i egen drift. Samtidig har vi ennå ikke bevist at vi kan rulle det ut kommersielt hos større eksterne kunder. Det er nettopp derfor vi mener tidspunktet er interessant.',
      'Hvis vi lykkes med produktiseringen og får den første større kunden i drift, vil selskapet stå et annet sted enn i dag. En eventuell senere kapitalrunde og verdsettelsen i den vil naturligvis avhenge av hva vi faktisk har oppnådd frem til da.',
      'Investeringen gjelder DigiHome Tech AS, ikke forvaltningsvirksomheten.',
    ],
    terms: [
      [DEAL.f.preMoney, 'Verdsettelse før emisjonen', 'pre-money'],
      [DEAL.f.investeringKort, 'Ny kapital', 'nye aksjer · fordelingen avklares sammen'],
      [DEAL.f.postMoney, 'Verdsettelse etter emisjonen', 'post-money'],
      [DEAL.f.eierandel, 'Deres samlede eierandel', 'etter emisjonen'],
    ],
    regnestykkeH: 'Regnestykket er enkelt',
    regnestykke: [
      `${DEAL.f.preMoney} før emisjonen + ${DEAL.f.investeringKort} ny kapital = ${DEAL.f.postMoney} etter emisjonen.`,
      `${DEAL.f.investeringKort} av ${DEAL.f.postMoney} tilsvarer ${DEAL.f.eierandel}.`,
    ],
    fordelingH: 'Fordelingen mellom dere',
    fordeling: DEAL.fordeling,
    aksjerH: 'Aksjene',
    aksjer: 'Aksjene er ordinære aksjer i samme aksjeklasse som dagens aksjer. Det knyttes ikke vesting eller arbeidsplikt til aksjene. Øvrige rettigheter reguleres gjennom vedtekter og aksjonæravtale.',
    formal: {
      h: 'Før gjennomføring',
      text: 'Vi lager et kort term sheet og blir enige om aksjonæravtalen.',
      listH: 'Der avklarer vi blant annet',
      list: [
        'pro rata-rett og senere utvanning',
        'forkjøpsrett, tag-along og drag-along',
        'informasjon og rapportering',
        'styresammensetning og eventuelle saker som krever særskilt godkjenning',
        'at all relevant IP ligger i DigiHome Tech AS',
        'kunde- og lisensavtalen mellom Tech og forvaltningsselskapet',
        'hvordan et eventuelt senere salg av aksjer håndteres',
      ],
      closing: 'Målet er en ryddig struktur som fungerer både for dagens eiere og for eventuelle nye investorer senere.',
    },
  },

  /* ── 12 Veien videre ── */
  next: {
    eyebrow: 'Veien videre',
    title: 'Vi håper dere har lyst til å være med.',
    paragraphs: [
      'Ta dere gjerne tid til å gå gjennom materialet.',
      'Hvis dette fortsatt ser interessant ut, foreslår vi at vi setter oss ned sammen og går gjennom business caset, kostnadene og kapitalplanen med de faktiske regnearkene på bordet. Da kan vi også diskutere roadmapen, pilotstrategien, prisingen og hvilke beslutninger vi bør ta først.',
      'Hvis vi fortsatt er enige om retningen etter det, lager vi et kort term sheet og tar de juridiske dokumentene derfra.',
      'Vi har stor tro på DigiHome. Og etter samtalene vi har hatt med dere, har vi lyst til å bygge neste del sammen.',
    ],
  },

  footer: 'Privat og konfidensiell invitasjon til Martin Vikesland og Øyvind Storli Hoel.',
  footerFrom: 'Erik, Sarah og Martin · DigiHome Tech AS · oktober 2026',
  footerTop: 'Til toppen',
};

/** Alt server-komponenten sender til brevet – i ett objekt. */
export const INNHOLD = { INV, AVSENDERE, TEAM, BREV, DEAL, PORTEFOLJE, KAPITAL, PRIS };
