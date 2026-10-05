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
  fordeling: 'Fordelingen mellom dere er ikke bestemt. Om dere tegner likt eller ulikt, avklarer vi sammen med dere før term sheet.',
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

/* ── Porteføljen – ett tall, én dato. Oppdateres her før utsendelse. Skjermbildene i produkt.js viser illustrative data. ── */
export const PORTEFOLJE = { aktiveEnheter: 35, per: '5. oktober 2026' };

export const INV = {
  date: '5. oktober 2026',
  to: 'Til Martin og Øyvind',
  toLong: 'Til Martin Vikesland og Øyvind Storli Hoel',
  from: 'Fra Erik, Sarah og Martin',
  firstNames: 'Martin og Øyvind',
  fullNames: 'Martin Vikesland og Øyvind Storli Hoel',
};

export const AVSENDERE = [
  { key: 'erik', name: 'Erik Hoffmann-Dahl', role: 'Styreleder · Chief Legal Officer', img: '/team-erik.webp', pos: '50% 18%' },
  { key: 'sarah', name: 'Sarah Sleeman', role: 'Daglig leder · styremedlem', img: '/brand/sarah-sleeman-1000.webp', pos: '50% 28%' },
  { key: 'martin', name: 'Martin C. Kviteberg', role: 'Produktsjef · styremedlem', img: '/v4/martin.webp', pos: '50% 22%' },
];

/** Hele laget i ett rutenett (rekkefølgen her er rekkefølgen på siden): daglig leder, produktsjef, styreleder/CLO, styremedlem – så de to vi inviterer inn – og utvikling.
 *  Ingen definerte roller på Martin og Øyvind før de har investert – bare hva vi særlig ser for oss at de kan være sparringspartnere på. */
export const TEAM = [
  { key: 'sarah', name: 'Sarah Sleeman', role: 'Daglig leder', img: '/brand/sarah-sleeman-1000.webp', pos: '50% 28%', bio: 'Eiendomsmegler med seks år i DNB. Leder kundeakkvisisjon og forvaltning, og sitter tett på kundene og den operative driften.' },
  { key: 'martin', name: 'Martin C. Kviteberg', role: 'Produktsjef', img: '/v4/martin.webp', pos: '50% 22%', bio: 'Grunnla BnbSpesialisten og jobbet ti år i Adonis frem mot exit. Leder produkt- og teknologiutviklingen i DigiHome.' },
  { key: 'erik', name: 'Erik Hoffmann-Dahl', role: 'Styreleder · Chief Legal Officer', img: '/team-erik.webp', pos: '50% 18%', bio: 'Advokat og partner i Hoffmann Thinn. Har tegnet selskapsstrukturen.' },
  { key: 'jens', name: 'Jens-Petter Glittenberg', role: 'Styremedlem', img: '/team/jens-petter-glittenberg.webp', pos: '50% 28%', bio: 'Medgründer av Meltwater og styreleder i CARN Capital. Erfaring med internasjonal skalering, kapitalmarked og selskapsbygging.' },
  { key: 'vikesland', name: 'Martin Vikesland', role: 'Inviteres inn som medeier', img: '/team/martin-vikesland.webp', pos: '50% 30%', invited: true, bio: 'Vi ser særlig for oss Martin som en viktig sparringspartner på økonomiske modeller, kapitalplan, finansiering og senere investordialog.' },
  { key: 'hoel', name: 'Øyvind Storli Hoel', role: 'Inviteres inn som medeier', img: '/team/oyvind-storli-hoel.webp', pos: '50% 22%', invited: true, bio: 'Vi ser særlig for oss Øyvind som en viktig sparringspartner på marked, produkt og kommersialisering, med erfaring og relasjoner inn mot eiendomsaktørene vi ønsker å nå.' },
  { key: 'kevin', name: 'Kevin Ha', role: 'Utvikling', img: '/team/kevin-ai-v2.webp', pos: '50% 22%', bio: 'Bistår Martin i utviklingen av plattformen. Siviløkonom fra NHH med kompetanse innen KI-drevet utvikling og automatisering.' },
];

export const BREV = {
  eyebrow: 'Privat invitasjon',
  role: 'Medeier i DigiHome Tech',
  brand: 'DigiHome',
  confidential: 'Konfidensielt',
  h1: ['Vi ønsker dere', 'med på eiersiden.'],
  sub: 'Etter flere gode møter er vi overbevist om at dere kan tilføre DigiHome mye i fasen vi nå går inn i. Plattformen er bygget og i drift – nå skal den gjøres klar for større eksterne kunder. I den jobben ønsker vi dere med rundt bordet, som medeiere i DigiHome Tech.',
  cta: 'Les invitasjonen',
  hi: 'Hei Martin og Øyvind,',
  signature: 'Erik, Sarah og Martin',

  /* Brevet – fem avsnitt. Det siste tones ned (muted) av komponenten. */
  letter: [
    'Takk for veldig gode samtaler den siste tiden.',
    'Gjennom møtene våre, både fysisk og på Teams, har vi blitt godt kjent med hvordan dere tenker rundt eiendom, drift, teknologi, økonomi og skalering. Dere har stilt gode spørsmål, utfordret oss på relevante ting og kommet med perspektiver vi mener DigiHome vil ha stor nytte av videre.',
    'Vi er nå på vei inn i en viktig fase. Plattformen er bygget og brukes i egen drift. Neste steg er å gjøre den klar for større eiendomsselskaper og få de første eksterne kundene i produksjon.',
    'Vi ønsker dere med i den fasen. Ikke bare som noen vi diskuterer med underveis, men som medeiere i DigiHome Tech.',
    'På de neste sidene har vi samlet det vi mener trengs for å vurdere det ordentlig: hva som er bygget, hvor vi skal, hvordan vi ser på markedet, budsjettet for neste fase og tilbudet vi ønsker å gi dere.',
  ],
  letterStrong: 3,

  /* ── 01 Hvorfor vi ønsker dere med ── */
  why: {
    eyebrow: 'Hvorfor vi ønsker dere med',
    title: 'Dere kan bli svært verdifulle for DigiHome videre.',
    paragraphs: [
      'Dere kommer med erfaring og perspektiver som utfyller det vi allerede har i selskapet. Martin har en sterk økonomisk og finansiell bakgrunn, mens Øyvind kjenner eiendomsmarkedet, kundene og de kommersielle sidene godt.',
      'Like viktig er inntrykket fra samtalene. Dere har vært nysgjerrige på mer enn hva DigiHome gjør i dag – vi har hatt gode diskusjoner om økonomien i modellen, hvordan produktet kan skaleres og hva som skal til for å bygge et selvstendig teknologiselskap.',
      'Vi tror derfor dere kan bidra både i de konkrete beslutningene vi skal ta de neste månedene og i den langsiktige utviklingen av selskapet. Vi ser på dere som strategisk viktige i neste fase av DigiHome.',
    ],
  },

  /* ── 10 Laget – og rollen vi ser for oss for dere ── */
  team: {
    eyebrow: 'Laget – og rollen vi ser for oss',
    title: 'Vi mener dere vil styrke laget vesentlig.',
    paragraphs: [
      'I dag har vi produkt, teknologi, forvaltning, juss og selskapsbygging rundt bordet. Når DigiHome skal ut til større eksterne kunder og etter hvert hente mer kapital, vil vi styrke laget på to områder: finansiell sparring rundt økonomi, kapital og investorer – og kommersiell innsikt og relasjoner inn mot eiendomsselskapene vi ønsker som kunder.',
      'Det er her vi mener dere kan tilføre mye. Derfor ønsker vi dere ikke bare inn som investorer, men med rundt bordet i utviklingen av selskapet.',
    ],
    rolleH: 'Hva innebærer det i praksis?',
    rolleLead: 'Dette er ikke ment som en passiv investering. Samtidig forventer vi ikke at dere skal ha operative stillinger eller faste arbeidsoppgaver i selskapet. Vi ser for oss at dere deltar i de viktigste strategiske diskusjonene gjennom neste fase, og at vi kan bruke dere aktivt som sparringspartnere på områdene dere kjenner best. Omfanget finner vi en pragmatisk form på sammen – det viktigste for oss er at dere blir reelle medeiere vi kan bygge selskapet sammen med.',
    rolle: [],
  },

  /* ── 02 Dette er allerede bygget – produktbeviset: én desktopflate, de to appene og seks punkter ── */
  built: {
    eyebrow: 'Dette er allerede bygget',
    title: ['Ikke en idé.', 'En plattform i drift.'],
    paragraphs: [
      'DigiHome starter ikke med denne kapitalrunden. Plattformen er bygget og brukes hver dag i reell forvaltning, med faktiske eiere, leietakere, kontrakter, innbetalinger og saker.',
      `${PORTEFOLJE.aktiveEnheter} aktive enheter på plattformen per ${PORTEFOLJE.per}. Skjermbildene under viser forvalterens arbeidsflate, eierappen og leietakerappen slik produktet står i dag.`,
    ],
    desktopCaption: ['Forvalterens arbeidsflate', 'Det som venter, det som skjedde siden sist, og porteføljens helse – i én flate.'],
    phoneCaptions: ['Eierappen', 'Leietakerappen'],
    listH: 'Dette finnes i dag',
    list: [
      'Forvalterens arbeidsflate, eierapp og leietakerapp i daglig drift',
      'Leadmotor, markedsføring og oppfølging fra første henvendelse til signert kontrakt',
      'Økonomiflyt for blant annet KID-matching, purring, eieroppgjør og bokføringsgrunnlag',
      'KI-funksjoner som hjelper med saker, kommunikasjon og rutinearbeid',
      'Nettsted, merkevare og kundereise fra første søk til signert leieavtale',
      'Produktet utvikles og testes kontinuerlig gjennom egen forvaltning',
    ],
    integrasjonerH: 'Integrasjoner',
    integrasjoner: [
      ['I drift', 'FINN · BankID · Keyhole'],
      ['Under implementering', 'PowerOffice Go · Fiken'],
    ],
  },

  /* ── 03 Hvor vi skal ── */
  target: {
    eyebrow: 'Hvor vi skal',
    title: 'Plattformen for profesjonell boligutleie.',
    paragraphs: [
      'Ambisjonen er at DigiHome skal være systemet eier, leietaker og forvalter faktisk arbeider i gjennom hele leieforholdet. Det handler ikke først og fremst om å lage en billigere versjon av dagens systemer – vi mener arbeidsflytene kan bygges bedre fra bunnen av, med moderne teknologi og KI som en naturlig del av produktet.',
    ],
    principle: 'Egen forvaltning har latt oss bygge og teste produktet tett på virkeligheten. Nå skal vi finne ut hvor godt det fungerer hos andre – de første eksterne kundene blir den viktigste milepælen for selskapet.',
  },

  /* ── 04 Strategi – B2B, B2C eller begge. Et veivalg vi vil ta sammen med investorene. Formulert som vår vurdering/hypotese,
   *     ikke som dokumentert markedsfakta. Et diskusjonsgrunnlag – ikke en endelig besluttet roadmap. Ingen tall her. ── */
  strategi: {
    eyebrow: 'Strategi',
    title: 'B2B, B2C eller begge. Et veivalg vi vil ta sammen med dere.',
    paragraphs: [
      'DigiHome kan gå flere veier ut i markedet: til eiendomsselskaper og profesjonelle forvaltere (B2B), direkte til private utleiere (B2C) – eller en kombinasjon av de to. Det er en av de viktigste strategiske diskusjonene vi ønsker å ta sammen med dere.',
      'Foreløpig holder vi en knapp på B2B i Norge først. Vår vurdering er at det finnes et stort og åpent marked for slike systemer blant norske eiendomsselskaper og forvaltere. Det er en hypotese vi ønsker å teste med de første eksterne kundene – ikke noe vi har dokumentert ennå. B2C opplever vi som mer konkurranseutsatt, og vi er bevisste på å ikke gape over for mye.',
    ],
    alternativer: [
      ['B2B', 'Vår foreløpige prioritet', 'Plattformen selges til eiendomsselskaper og profesjonelle forvaltere i Norge. Vi mener markedet er stort og åpent – en vurdering vi vil teste med de første eksterne kundene.'],
      ['B2C', 'Mer konkurranseutsatt', 'DigiHome tilbys direkte til private utleiere. Et marked vi opplever som mer konkurranseutsatt, og som vi ikke ønsker å gape over samtidig med B2B.'],
      ['Kombinasjon', 'Åpent spørsmål', 'B2B som inngang og B2C på sikt – eller en annen rekkefølge. Om og når det er riktig, vil vi vurdere sammen med dere.'],
    ],
    noteH: 'Diskusjonsgrunnlag',
    note: 'Dette er vår foreløpige vurdering og et grunnlag for diskusjon – ikke en endelig besluttet roadmap. Veivalget ønsker vi å ta sammen med dere.',
  },

  /* ── 05 Tech og forvaltning ── */
  structure: {
    eyebrow: 'Tech og forvaltning',
    title: 'To selskaper med forskjellige roller.',
    paragraphs: [
      'DigiHome Tech AS skal eie og utvikle teknologien og selge plattformen til eiendomsselskaper og profesjonelle forvaltere. Selve forvaltningen ligger i et eget selskap, som er kunde av Tech.',
      'I oppstartsfasen vil selskapene ha mye kontakt – forvaltningen gir Tech tett tilgang til brukere, data og konkrete problemstillinger produktet kan utvikles rundt. Samtidig skal Tech bygges som et selvstendig programvareselskap som kan selge til hele markedet, også til selskaper som konkurrerer med vår egen forvaltning.',
      'Denne invitasjonen gjelder DigiHome Tech AS.',
    ],
    rows: [
      ['DigiHome Tech AS', 'Eier og utvikler plattformen og skal selge den til profesjonelle forvaltere og eiendomsselskaper. Det er dette selskapet vi inviterer dere inn i.'],
      ['Forvaltningsselskapet', 'Drifter boliger og bruker DigiHome som sitt operative system. Fungerer samtidig som det første produksjonsmiljøet for plattformen.'],
      ['Avtalen mellom selskapene', 'Forholdet reguleres gjennom en ordinær kunde- og lisensavtale. Målet er at Tech har en tydelig egen økonomi og kommersielle vilkår som også fungerer når eksterne kunder kommer inn.'],
      ['IP og rettigheter', 'Kildekode, produkt-IP, merkevare, produktdesign, datamodeller og øvrige teknologirettigheter skal ligge i DigiHome Tech AS. Dette dokumenteres før emisjonen gjennomføres.'],
    ],
  },

  /* ── 06 Hva som er gjort frem til nå – og hvor risikoen står ── */
  naa: {
    eyebrow: 'Hva som er gjort frem til nå',
    title: ['Den første byggefasen', 'er allerede tatt.'],
    paragraphs: [
      'Siden starten har vi brukt rundt 500\u00a0000 kroner i direkte utviklingskostnader, i tillegg til anslagsvis 1\u00a0000–1\u00a0500 timer med produktarbeid. Men det viktigste er ikke hvor mange timer eller kroner som er brukt.',
      'I denne perioden har vi bygget opp DigiHome som konsept og merkevare, utviklet plattformen, etablert arbeidsflytene og fått produktet ut i faktisk drift: merkevaren, nettstedet og kundereisen, produktdesignet, eier- og leietakeropplevelsen, forvalterens arbeidsflate, driftsprosessene, integrasjonene, økonomiflytene – og erfaringen fra å bruke systemet hver dag.',
      'De som kommer inn nå, kommer derfor inn i et vesentlig mer modent selskap enn det vi startet med. Samtidig er vi tidlig nok til at mye av verdiskapingen ligger foran oss.',
      'Produktet finnes. Konseptet er tydelig. Neste jobb er å bevise at det fungerer også hos større eksterne kunder.',
    ],
    steg: [
      ['Bygget', 'Fase 1 · gjennomført', 'Merkevare, produkt, arbeidsflyter, integrasjoner og grunnplattform. DigiHome er i bruk i egen drift.'],
      ['Nå', 'Fase 2 · første eksterne pilot', 'Plattformen gjøres kundeuavhengig og klar for profesjonelle eiendomsselskaper. Målet er én ekstern pilot – deretter eventuelt en til.'],
      ['Skalere', 'Fase 3 · betinget', 'Når en ekstern kunde har tatt DigiHome i bruk, tar vi sikte på en større kapitalrunde for å bygge salg, produkt og organisasjon videre. Tidspunkt og vilkår er ikke gitt.'],
    ],
    risikoH: 'Hvor står risikoen i dag?',
    risiko: [
      ['Bygge produktet', 'Dokumentert', 'Kan vi bygge produktet? Det mener vi allerede er godt dokumentert – kjerneplattformen eksisterer og brukes i drift.'],
      ['Arbeidsflytene', 'Testet i egen drift', 'Fungerer arbeidsflytene i praksis? De er utviklet og forbedret gjennom egen forvaltning.'],
      ['Implementering hos andre', 'Jobben nå', 'Kan produktet implementeres hos andre uten omfattende spesialutvikling? Det er en av de viktigste oppgavene nå.'],
      ['Betalende kunder', 'Det neste vi skal bevise', 'Vil større eiendomsselskaper betale for og bruke DigiHome? Det er det neste vi skal bevise.'],
    ],
  },

  /* ── 07 Roadmap – det denne emisjonen finansierer (måned 1–3), beslutningspunktet ved slutten av måned 2, og det som er betinget av
   *     finansiering. Mål, ikke garantier. Lover ikke pilotbevis etter at kapitalen er brukt opp. ── */
  roadmap: {
    eyebrow: 'Roadmap',
    title: ['Fra egen drift', 'til et produkt flere kan kjøpe.'],
    paragraphs: [
      'Den viktigste jobben de kommende månedene er ikke å legge til flest mulig nye funksjoner. Den er å få DigiHome fra egen drift og inn hos én ekstern pilotkunde.',
      'Denne emisjonen finansierer de første tre månedene: produktisering og pilotberedskap. Det som kommer etter, er betinget av kundetilgang, faktisk fremdrift og finansiering. Fasene under er mål, ikke garantier.',
    ],
    head: ['Periode', 'Fokus', 'Målet'],
    /* [periode, fokus, hva som gjøres, målet, status] – status: 'emisjon' (finansiert av denne emisjonen), 'beslutning', 'betinget'. */
    faser: [
      ['Måned 1–3', 'Produktisering og pilotberedskap', 'Multi-tenant-arkitektur, roller og tilgangsstyring, onboarding, datamodell, integrasjonslag, sikkerhet og tydelig separasjon fra egen forvaltning. Pilotkandidat avklares.', 'En ny kunde kan få sitt eget miljø med egne brukere, data, roller og integrasjoner – og én avgrenset pilot er klar til å settes i drift.', 'emisjon'],
      ['Slutten av måned 2', 'Beslutningspunkt', 'Kostnader, pilotfremdrift og finansiering vurderes – før kapitalen er brukt opp.', 'Avklart om vi fortsetter som planlagt, reduserer kostnader, henter brofinansiering eller ny kapital.', 'beslutning'],
      ['Måned 4–6', 'Første eksterne pilot', 'Én avgrenset pilot på en del av en eiendomsaktørs portefølje settes i drift og følges tett. Pilotvilkår er ikke fastsatt.', 'Dokumentert nytte og betalingsvilje hos én ekstern kunde.', 'betinget'],
      ['Måned 6–12', 'Gradvis utrulling', 'Fra pilot til betalende aktive enheter. Eventuelt pilot nummer to, avhengig av kundetilgang og fremdrift. Avtaler, onboarding og pris valideres.', 'De første betalende aktive enhetene i produksjon – og grunnlag for å vurdere en større runde.', 'betinget'],
    ],
    status: { emisjon: 'Finansiert av denne emisjonen', beslutning: 'Beslutningspunkt', betinget: 'Betinget av finansiering' },
    maal: [
      ['Mål for de første tre månedene', 'Produktisert plattform og én avgrenset pilot klar til drift – finansiert av denne emisjonen.'],
      ['Deretter – betinget', 'Én ekstern pilot i drift, så eventuelt en til. Mål, ikke garantier.'],
    ],
    maalNote: 'Pilotbeviset kommer etter at kapitalen fra denne emisjonen etter planen er brukt. Derfor ligger beslutningspunktet ved slutten av måned 2 – slik at kostnadsreduksjon, brofinansiering eller ny kapital er på plass i tide, ikke etterpå.',
  },

  /* ── 08 Forretningsmodell – prisen er IKKE validert og fastsettes ikke her. Rekkefølge: avgrenset pilot → dokumentert nytte og
   *     betalingsvilje → gradvis utrulling av betalende aktive enheter. Ett hypotetisk oppsideeksempel (PRIS), tydelig merket.
   *     Fjernet: «fem like kunder / 7,8 MNOK» og «nøkternt base case 1,5–3 MNOK ARR». Ingen pilotpris, ingen garantert besparelse. ── */
  modell: {
    eyebrow: 'Forretningsmodell',
    title: ['DigiHome skal prises som programvare.', 'Prisen er ikke validert ennå.'],
    paragraphs: [
      'Vi ser for oss en fast plattformavgift pluss en pris per aktiv boenhet. Endelig kommersiell pris er ikke validert, og vi fastsetter den ikke nå – den skal testes mot de første eksterne kundene. Vi har ikke dokumentert signert pipeline, konvertering, betalingsvilje eller hele porteføljer i drift.',
      'Rekkefølgen vi ser for oss: en avgrenset pilot på en del av kundens portefølje, dokumentert nytte og betalingsvilje – og deretter gradvis utrulling av faktisk betalende aktive enheter.',
    ],
    enhet: 'Med «aktiv enhet» mener vi en boenhet som forvaltes i DigiHome og har et aktivt leieforhold. Et selskaps totale portefølje er ikke det samme som enhetene som faktisk er i bruk og kan faktureres.',
    stegH: 'Rekkefølgen',
    steg: [
      ['Avgrenset pilot', 'På en del av porteføljen. Pilotvilkår er ikke fastsatt.'],
      ['Dokumentert nytte og betalingsvilje', 'Hva kunden faktisk sparer og vil betale for – målt, ikke antatt.'],
      ['Gradvis utrulling', 'Flere aktive enheter tas i bruk og faktureres etter hvert som de er i drift.'],
    ],
    eksempelH: 'Hypotetisk oppsideeksempel',
    eksempelSub: 'Én stor kunde etter full utrulling. Ikke godkjent prisliste, ikke signert kontrakt, ikke forventet førsteårsinntekt.',
    eksempelRader: [
      ['Aktive boenheter i drift', PRIS.eks.enheter, 'enheter'],
      ['Fast plattformavgift', PRIS.fast, 'per måned'],
      ['Per aktiv boenhet', `${PRIS.eks.enheter} × ${PRIS.enhet} = ${PRIS.eks.variabel}`, 'per måned'],
      ['Abonnement', PRIS.eks.mnd, 'per måned'],
      ['Årlig gjentakende inntektsrate (ARR)', PRIS.eks.arr, 'årsrate · 12 × abonnement'],
    ],
    arrH: 'ARR er en årsrate – ikke opptjent omsetning, fakturering eller innbetaling',
    arr: [
      [PRIS.eks.arr, 'Årsrate ved årsslutt', 'ARR · hvis hele kunden er i drift'],
      [PRIS.eks.fakturertAar1, 'Fakturert abonnement år 1', `${PRIS.eks.mndFakturert} × ${PRIS.eks.mnd} · hvis full utrulling først faktureres fra måned ${PRIS.eks.fraMnd}`],
    ],
    arrNote: 'Matematisk illustrasjon, ikke prognose. Hva som faktisk faktureres og innbetales i et første år, avhenger av pilotens omfang, når enheter tas i bruk, og betalingsvilkår. Separat betaling for onboarding og integrasjoner er noe som kan vurderes i prisvalideringen – ikke en avtalt pris.',
  },

  /* ── 09 Kapitalplan – foreløpig plan for de første tre månedene (tallene i KAPITAL). Ikke et årsbudsjett. Grunnplanen tåler null ekstern
   *     inntekt. Finansierer IKKE seks eller tolv måneder. Beslutningspunkt ved slutten av måned 2. Senere runde er betinget. ── */
  kapital: {
    eyebrow: 'Kapitalplan',
    title: 'En foreløpig plan for de første tre månedene.',
    paragraphs: [
      'Vi har byttet ut et grovt årsbudsjett med en konkret plan for de tre første månedene – perioden denne emisjonen faktisk skal finansiere. Grunnplanen tåler null ekstern inntekt: det er ikke lagt inn pilot- eller kundeinntekt før en betalt pilot er validert.',
      `Tre av tallene er bekreftede inngangsverdier fra oss: én gründerlønn på ${KAPITAL.lonn.bruttoAar} brutto i året (${KAPITAL.lonn.bruttoMnd} per måned), utviklingskreditter på ${KAPITAL.poster[1].f.mnd} per måned og hosting på ${KAPITAL.poster[2].f.mnd} per måned. Resten er planleggingsestimater – ikke innhentede tilbud. Det er ikke lagt inn lønn eller andre forpliktelser for Sarah.`,
    ],
    legend: { bekreftet: 'Bekreftet inngangsverdi – oppgitt av oss', estimat: 'Planleggingsestimat – ikke tilbud', avsatt: 'Avsatt reserve' },
    head: ['Post', 'Grunnlag', 'Per måned', '3 måneder'],
    sumLabel: 'Løpende plan',
    engangH: 'I tillegg – engangsposter',
    avsattLabel: 'Totalt avsatt av emisjonen',
    ikkeDisponertLabel: 'Ikke disponert',
    ikkeDisponertNote: `Tilsvarer rundt én ekstra måned ved ${KAPITAL.sum.f.mnd} per måned – uten at bufferen brukes. Dette er ikke inntekt eller garantert overskudd.`,
    forbehold: 'Beløp er ekskl. mva der det er relevant. Mva-likviditet og valutakurs er ikke modellert. Hostingbeløpet dokumenterer ikke at KI/API-, signerings-, integrasjons- eller transaksjonskostnader er dekket – disse, og support/onboarding, avklares før de prises.',
    lonnH: 'Slik er gründerressursen beregnet',
    lonnToggle: ['Vis forutsetningene', 'Skjul forutsetningene'],
    lonnNote: [
      `De ${KAPITAL.poster[0].f.mnd} per måned er en avrundet, konservativ likviditetsreserve for tre måneders lønn og arbeidsgiverkostnad – ikke en nøyaktig årsberegning. Feriepengene er lagt inn som reserve for perioden, ikke som et tillegg til full årslønn.`,
      'Forutsetningene (12 % feriepenger, arbeidsgiveravgift 14,1 % i sone I, 2 % pensjon) må verifiseres mot faktisk arbeidsgiver, sone, avtale og pensjonsplikt.',
    ],
    disponeringH: 'Slik disponeres emisjonen',
    bruddH: 'Hva denne emisjonen finansierer – og ikke',
    brudd: [
      `Emisjonen på ${DEAL.f.investering} finansierer den løpende planen i tre måneder (${KAPITAL.sum.f.tre}), emisjon og juridisk arbeid (${KAPITAL.engang[0].f}) og en buffer (${KAPITAL.engang[1].f}). De ${KAPITAL.ikkeDisponert.f} som ikke er disponert, tilsvarer rundt én ekstra måned ved ${KAPITAL.sum.f.mnd} per måned – uten at bufferen brukes.`,
      'Den finansierer ikke seks eller tolv måneders drift. Tar piloten fire til seks måneder, trengs kostnadsreduksjon, brofinansiering eller ny kapital – i tide, ikke når pengene er brukt opp.',
    ],
    beslutningH: 'Beslutningspunkt · slutten av måned 2',
    beslutningLead: 'Før kapitalen er brukt opp, tar vi stilling til tre ting sammen med dere:',
    beslutning: [
      ['Kostnader', `Holder vi planen på ${KAPITAL.sum.f.mnd} per måned, eller må den ned?`],
      ['Pilotfremdrift', 'Har vi en avgrenset pilot klar til drift – hos en navngitt kunde?'],
      ['Finansiering', 'Er brofinansiering eller ny kapital i gang, slik at den er på plass før måned 3 er over?'],
    ],
    rundeNote: 'En senere kapitalrunde, tidspunktet for den og en eventuell høyere verdsettelse er betinget av faktisk fremdrift – ikke noe vi kan garantere. Regnestykket går vi gjennom sammen med dere, med regnearket på bordet.',
  },

  /* ── 11 Tilbudet – alle tall fra DEAL. 1 000 000 kr ny kapital · 10 % samlet · 9,0 MNOK pre · 10,0 MNOK post. Ingen antatt fordeling. ── */
  offer: {
    eyebrow: 'Tilbudet',
    title: 'Vi ønsker dere med som medeiere i DigiHome Tech.',
    paragraphs: [
      `Vi tilbyr ${DEAL.investorer[0]} og ${DEAL.investorer[1]} å tegne nye aksjer for samlet ${DEAL.f.investering}. Etter emisjonen eier dere samlet ${DEAL.f.eierandel} av DigiHome Tech AS. Fordelingen mellom dere er ikke bestemt – den avklarer vi sammen med dere.`,
      `Prisingen – ${DEAL.f.preMoney} før emisjonen – er satt i den fasen selskapet er i nå: produktet er bygget og brukes i egen drift, men vi har ennå ikke dokumentert kommersiell utrulling hos eksterne kunder. Lykkes vi med produktiseringen og den første piloten, mener vi utgangspunktet for en senere kapitalrunde blir sterkere. Tidspunktet for en slik runde, og en eventuell høyere verdsettelse, er betinget av det – ikke noe vi kan garantere.`,
      'Investeringen gjelder DigiHome Tech AS, ikke forvaltningsvirksomheten.',
    ],
    terms: [
      [DEAL.f.investering, 'Ny kapital', 'nye aksjer · fordelingen mellom dere avklares'],
      [DEAL.f.eierandel, 'Eierandel', 'samlet, etter emisjonen'],
      [DEAL.f.preMoney, 'Pre-money', 'verdsettelse før emisjonen'],
      [DEAL.f.postMoney, 'Post-money', 'verdsettelse etter emisjonen'],
    ],
    regnestykkeH: 'Regnestykket',
    regnestykke: DEAL.f.regnestykke,
    fordelingH: 'Fordelingen mellom dere',
    fordeling: DEAL.fordeling,
    aksjer: 'Aksjene er ordinære aksjer i samme aksjeklasse som dagens aksjer. Det knyttes ingen vesting eller arbeidsplikt til aksjene. Øvrige rettigheter og spilleregler reguleres gjennom vedtekter og aksjonæravtale.',
    formal: {
      h: 'Gjennomføring',
      text: 'Investeringen gjennomføres som en rettet emisjon mot dere. Før tegning lager vi et kort term sheet og blir enige om aksjonæravtalen.',
      listH: 'Der avklarer vi blant annet',
      list: [
        'pro rata-rett og håndtering av utvanning i senere kapitalrunder',
        'forkjøpsrett, tag-along og drag-along',
        'informasjon og rapportering til aksjonærene',
        'styresammensetning og saker som krever særskilt godkjenning',
        'at all relevant IP ligger i DigiHome Tech AS',
        'kunde- og lisensavtalen mellom Tech og forvaltningsselskapet',
        'mekanismene dersom en aksjonær senere ønsker å selge seg ut',
      ],
      closing: 'Dette utarbeider vi sammen med dere, slik at strukturen fungerer både for dagens eiere og for investorer vi eventuelt tar inn senere.',
    },
  },

  /* ── 12 Veien videre ── */
  next: {
    eyebrow: 'Veien videre',
    title: 'Vi håper dere har lyst til å være med.',
    paragraphs: [
      'Ta dere gjerne litt tid til å gå gjennom materialet og tenke på det.',
      'Hvis dette fortsatt ser interessant ut, setter vi oss ned og går gjennom business caset, budsjettet og kapitalplanen i detalj – ikke en ny presentasjon, men de faktiske forutsetningene og regnearkene. Er vi fortsatt enige om retningen etter det, lager vi et kort term sheet og tar de juridiske dokumentene derfra.',
      'Vi har stor tro på DigiHome og på mulighetene som ligger foran oss. Og etter samtalene vi har hatt med dere, tror vi dere kan bli en viktig del av det vi bygger videre.',
    ],
  },

  footer: 'Privat og konfidensiell invitasjon til Martin Vikesland og Øyvind Storli Hoel.',
  footerFrom: 'Erik, Sarah og Martin · DigiHome Tech AS · oktober 2026',
  footerTop: 'Til toppen',
};

/** Alt server-komponenten sender til brevet – i ett objekt. */
export const INNHOLD = { INV, AVSENDERE, TEAM, BREV, DEAL, PORTEFOLJE, KAPITAL, PRIS };
