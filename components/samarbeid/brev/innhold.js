import 'server-only';
/** Privat invitasjon til Martin Vikesland og Øyvind Storli Hoel – ett brev, på /samarbeid. Ikke søkbart, ikke lenket fra noe sted.
 *  En personlig invitasjon fra Erik, Sarah og Martin – ikke en landingsside. Gjelder KUN DigiHome Tech AS.
 *  SERVER-ONLY: teksten leses av server-komponenten i app/samarbeid og sendes bare til nettlesere med gyldig sesjon – den ligger ikke i JS-bundlen.
 *  Én kilde til sannhet for tall: DEAL (emisjonen), PORTEFOLJE (aktive enheter). Alt annet refererer hit.
 *  v8 (05.10.2026): teksten skrevet på nytt av brukeren – si hva som er gjort, hvorfor vi vil ha dem med, og hva som skjer videre.
 *  Ingen «investor-presentasjon»-språk (verdiløft, SaaS-bevis, risikoreduksjon). 11 kapitler: «Hva som er gjort» og «Det neste vi skal
 *  bevise» er slått sammen, og de fire bevispunktene ligger i roadmapens resultatkolonne. Skjermbildene i produkt.js er uendret. */

/* ── Emisjonen – én kilde til sannhet. Pre-money 10,0 MNOK, 10 % samlet etter emisjonen, delt likt. Alt regnes herfra. ── */
const PRE_MONEY = 10_000_000;
const EIERANDEL = 0.10;
const ANTALL = 2;
const INVESTERING = Math.round((PRE_MONEY * EIERANDEL) / (1 - EIERANDEL)); // 1 111 111 kr
const kr = (n) => `${Math.round(n).toLocaleString('nb-NO').replace(/\s/g, '\u00a0')}\u00a0kr`;
const mnok = (n, d = 1) => `${(n / 1e6).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d })}\u00a0MNOK`;
const pct = (p) => `${(p * 100).toLocaleString('nb-NO', { maximumFractionDigits: 1 })}\u00a0%`;

export const DEAL = {
  preMoney: PRE_MONEY,
  postMoney: PRE_MONEY + INVESTERING,
  investering: INVESTERING,
  perPerson: INVESTERING / ANTALL,
  eierandel: EIERANDEL,
  eierandelPerPerson: EIERANDEL / ANTALL,
  investorer: ['Martin Vikesland', 'Øyvind Storli Hoel'],
  /* Ferdig formaterte strenger – brukes i teksten. */
  f: {
    investering: kr(INVESTERING),
    investeringKort: mnok(INVESTERING, 2),
    perPerson: kr(INVESTERING / ANTALL),
    preMoney: mnok(PRE_MONEY),
    postMoney: mnok(PRE_MONEY + INVESTERING),
    eierandel: pct(EIERANDEL),
    eierandelPerPerson: pct(EIERANDEL / ANTALL),
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
  { key: 'erik', name: 'Erik Hoffmann-Dahl', role: 'Styreleder · advokat', img: '/team-erik.webp', pos: '50% 18%' },
  { key: 'sarah', name: 'Sarah Sleeman', role: 'Daglig leder · styremedlem', img: '/brand/sarah-sleeman-1000.webp', pos: '50% 28%' },
  { key: 'martin', name: 'Martin C. Kviteberg', role: 'Produktsjef · styremedlem', img: '/v4/martin.webp', pos: '50% 22%' },
];

/** Laget fremover – tre rader: de som leder i dag, de to vi inviterer inn, og ressursene rundt. Rekkefølgen i radene er rekkefølgen på siden. */
export const TEAM_GRUPPER = [
  { key: 'ledelse', label: 'Daglig ledelse og styreleder' },
  { key: 'inviteres', label: 'Inviteres inn som medeiere' },
  { key: 'rundt', label: 'Utvikling og styre' },
];

/** Ingen definerte roller på Martin og Øyvind før de har investert – bare hva vi særlig ser for oss at de kan være sparringspartnere på. */
export const TEAM = [
  { key: 'sarah', gruppe: 'ledelse', name: 'Sarah Sleeman', role: 'Daglig leder', img: '/brand/sarah-sleeman-1000.webp', pos: '50% 28%', bio: 'Eiendomsmegler med seks år i DNB. Leder kundeakkvisisjon og forvaltning, og sitter tett på kundene og den operative driften.' },
  { key: 'martin', gruppe: 'ledelse', name: 'Martin C. Kviteberg', role: 'Produktsjef', img: '/v4/martin.webp', pos: '50% 22%', bio: 'Grunnla BnbSpesialisten og jobbet ti år i Adonis frem mot exit. Leder produkt- og teknologiutviklingen i DigiHome.' },
  { key: 'erik', gruppe: 'ledelse', name: 'Erik Hoffmann-Dahl', role: 'Styreleder', img: '/team-erik.webp', pos: '50% 18%', bio: 'Advokat og partner i Hoffmann Thinn. Har bistått med den selskapsmessige og juridiske strukturen rundt DigiHome.' },
  { key: 'vikesland', gruppe: 'inviteres', name: 'Martin Vikesland', role: 'Inviteres som medeier', img: '/team/martin-vikesland.webp', pos: '50% 30%', invited: true, bio: 'Vi ser særlig for oss Martin som en viktig sparringspartner på økonomiske modeller, kapitalplan, finansiering og senere investordialog.' },
  { key: 'hoel', gruppe: 'inviteres', name: 'Øyvind Storli Hoel', role: 'Inviteres som medeier', img: '/team/oyvind-storli-hoel.webp', pos: '50% 22%', invited: true, bio: 'Vi ser særlig for oss Øyvind som en viktig sparringspartner på marked, produkt og kommersialisering, med erfaring og relasjoner inn mot eiendomsaktørene vi ønsker å nå.' },
  { key: 'kevin', gruppe: 'rundt', name: 'Kevin Ha', role: 'Utvikling', img: '/team/kevin-ai-v2.webp', pos: '50% 22%', bio: 'Bistår Martin i utviklingen av plattformen. Siviløkonom fra NHH med kompetanse innen KI-drevet utvikling og automatisering.' },
  { key: 'jens', gruppe: 'rundt', name: 'Jens-Petter Glittenberg', role: 'Styremedlem', img: '/team/jens-petter-glittenberg.webp', pos: '50% 28%', bio: 'Medgründer av Meltwater og styreleder i CARN Capital. Erfaring med internasjonal skalering, kapitalmarked og selskapsbygging.' },
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

  /* ── 09 Laget – og rollen vi ser for oss for dere ── */
  team: {
    eyebrow: 'Laget – og rollen vi ser for oss',
    title: 'Vi mener dere vil styrke laget vesentlig.',
    paragraphs: [
      'I dag har vi kompetanse innen produkt, teknologi, forvaltning, juss og selskapsbygging. Når DigiHome skal ut til større eksterne kunder og etter hvert hente mer kapital, vil vi styrke laget på to områder: finansiell sparring rundt økonomi, kapital og investorer – og kommersiell innsikt og relasjoner inn mot eiendomsselskapene vi ønsker som kunder.',
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
    note: 'Skjermbildene er gjenskapt fra plattformen slik den står i dag og inneholder illustrative data.',
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

  /* ── 04 Tech og forvaltning ── */
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

  /* ── 05 Hva som er gjort frem til nå – og hvor risikoen står ── */
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
      ['Nå', 'Fase 2 · første eksterne kunder', 'Plattformen gjøres kundeuavhengig og klar for profesjonelle eiendomsselskaper. Målet er én til to større pilotkunder.'],
      ['Skalere', 'Fase 3', 'Når eksterne kunder har tatt DigiHome i bruk, tar vi sikte på en større kapitalrunde for å bygge salg, produkt og organisasjon videre.'],
    ],
    risikoH: 'Hvor står risikoen i dag?',
    risiko: [
      ['Bygge produktet', 'Dokumentert', 'Kan vi bygge produktet? Det mener vi allerede er godt dokumentert – kjerneplattformen eksisterer og brukes i drift.'],
      ['Arbeidsflytene', 'Testet i egen drift', 'Fungerer arbeidsflytene i praksis? De er utviklet og forbedret gjennom egen forvaltning.'],
      ['Implementering hos andre', 'Jobben nå', 'Kan produktet implementeres hos andre uten omfattende spesialutvikling? Det er en av de viktigste oppgavene nå.'],
      ['Betalende kunder', 'Det neste vi skal bevise', 'Vil større eiendomsselskaper betale for og bruke DigiHome? Det er det neste vi skal bevise.'],
    ],
  },

  /* ── 06 Roadmap – fire faser, hver med et mål som skal være nådd før vi går videre ── */
  roadmap: {
    eyebrow: 'Roadmap',
    title: ['Fra egen drift', 'til et produkt flere kan kjøpe.'],
    paragraphs: [
      'Den viktigste jobben de kommende månedene er ikke å legge til flest mulig nye funksjoner. Den er å få DigiHome fra egen drift og inn hos profesjonelle eksterne kunder.',
      'Kapitalen skal derfor først og fremst brukes til å gjøre DigiHome klart for eksterne kunder – i fire faser, hver med et mål som skal være nådd før vi går videre.',
    ],
    head: ['Periode', 'Fokus', 'Målet'],
    faser: [
      ['Nå → 3 mnd', 'Produktisering', 'Multi-tenant-arkitektur, roller og tilgangsstyring, onboarding, datamodell, integrasjonslag, sikkerhet og tydelig separasjon fra egen forvaltning.', 'En ny kunde kan få sitt eget miljø med egne brukere, data, roller og integrasjoner – uten at vi bygger en separat versjon av produktet.'],
      ['3 → 6 mnd', 'Første eksterne kunder', 'Én til to eksterne pilotkunder implementeres og tas i bruk.', 'Minst én større eiendomsaktør har reelle boliger, brukere og arbeidsflyter i produksjon.'],
      ['6 → 12 mnd', 'Standardisere leveransen', 'Avtaler, onboarding, support og prismodell standardiseres.', 'Kunde nummer to kan settes opp vesentlig raskere og enklere enn kunde nummer én.'],
      ['12 → 24 mnd', 'Skalering', 'Flere kunder og større porteføljer, flere integrasjoner og stadig mer automatisering og KI.', 'Veksten fortsetter uten at hver ny kunde utløser ny grunnutvikling.'],
    ],
    maal: [
      ['Hovedmål de første seks månedene', 'DigiHome i produksjon hos minst én større ekstern eiendomsaktør.'],
      ['Mål innen tolv måneder', '2–5 betalende selskaper – og dokumentert at en ny kunde kan implementeres uten at produktet bygges om fra bunnen av.'],
    ],
    maalNote: 'Det er dette som gjør DigiHome til et skalerbart programvareselskap. Når det er dokumentert, står selskapet etter vår vurdering i en helt annen posisjon enn i dag – og det er denne fasen vi ønsker å finansiere nå.',
  },

  /* ── 07 Forretningsmodell ── */
  modell: {
    eyebrow: 'Forretningsmodell',
    title: ['DigiHome skal prises', 'som programvare.'],
    paragraphs: [
      'Vi ser for oss en kombinasjon av en fast plattformavgift og en pris per aktiv boenhet. For større porteføljer vil enhetsprisen være lavere, mens den faste plattformkomponenten blir viktigere. Det gir kundene en forutsigbar kostnad, og gjør samtidig at kontraktsverdien øker når DigiHome brukes på større porteføljer.',
      'For store kunder arbeider vi foreløpig med en effektiv pris på rundt 100–150 kroner per enhet per måned, avhengig av størrelse, funksjonalitet og fast plattformavgift. Den endelige prismodellen skal testes sammen med de første eksterne kundene.',
    ],
    enhet: 'Med «enhet» mener vi en boenhet som forvaltes i DigiHome og har et aktivt leieforhold.',
    eksempelH: 'Illustrativt eksempel – kunde med 1 000 enheter',
    eksempel: ['1 000 enheter', '30 000 kr plattformavgift + 1 000 × 100 kr', '130 000 kr/mnd', '1,56 MNOK ARR'],
    skalering: ['7,8 MNOK', 'ARR · fem kunder av samme størrelse', 'Poenget er ikke at alle kunder vil ha samme pris eller størrelse – men at noen få store porteføljer kan gi DigiHome betydelig gjentakende programvareinntekt.'],
    baseH: 'Base case – første 12 måneder',
    baseHead: ['Periode', 'Hva skjer', 'Inntekt'],
    base: [
      ['Måned 1–3', 'Produktisering.', 'Ingen ekstern inntekt lagt til grunn'],
      ['Måned 4–6', 'Første pilotkunde tas i bruk.', 'Gratis, rabattert eller betalt pilot'],
      ['Måned 7–9', 'Første pilot går over i kommersiell avtale. Kunde nummer to implementeres.', '1–2 betalende kunder'],
      ['Måned 10–12', 'Videre onboarding av nye kunder med en mer standardisert leveransemodell.', '2–3 betalende kunder'],
    ],
    baseResult: ['1,5–3 MNOK', 'Kontrakts-ARR ved utgangen av år 1', 'Ambisjon: 2–3 betalende kunder og 1 500–3 000 enheter. Et nøkternt scenario med pilotvilkår og rabatter i den første fasen – større kunder kan gi vesentlig høyere inntekter.'],
  },

  /* ── 08 Kapitalplan: budsjett, hva emisjonen skal brukes til, og runway ── */
  kapital: {
    eyebrow: 'Kapitalplan',
    title: 'Hva trenger vi de neste 12 månedene?',
    paragraphs: [
      'Vi ønsker å være åpne om at denne emisjonen ikke alene finansierer hele de neste tolv månedene. Med planlagt produkt- og utviklingskapasitet, gründerressurs og øvrige kostnader anslår vi et basisbudsjett på rundt 3,5 MNOK for det første året.',
    ],
    head: ['Kostnad', '12 mnd, indikativt'],
    budsjett: [
      ['Produkt- og softwareutvikling', '1,35–1,80 MNOK'],
      ['Produkt- og teknologiledelse / gründerressurs', '1,0–1,2 MNOK'],
      ['Hosting, KI, API-er, data og sikkerhet', '0,25–0,40 MNOK'],
      ['Pilotimplementering og integrasjoner', '0,20–0,40 MNOK'],
      ['Juridisk, regnskap og forsikring', '0,10–0,20 MNOK'],
      ['Salg, reise og marked', '0,15–0,30 MNOK'],
    ],
    total: ['Totalt estimert', 'ca. 3,1–4,3 MNOK'],
    basis: ['3,5 MNOK', 'Planlagt basisbudsjett', 'tilsvarende omtrent 290 000 kroner per måned i gjennomsnitt'],
    budsjettNote: 'Daglig leders kostnad ligger i dag i forvaltningsselskapet. Hvilken del av ressursen som fremover skal belastes Tech, avklares og tas inn i den endelige kapitalplanen.',
    bruddH: 'Hva skal denne emisjonen brukes til?',
    brudd: [
      `Emisjonen på ${DEAL.f.investeringKort} finansierer ikke tolv måneders drift. Den er kapital til den neste konkrete fasen: produktisere DigiHome, gjøre løsningen klar for eksterne kunder, få den første større pilotkunden i produksjon – og stå sterkere når vi henter neste kapitalrunde.`,
      'Beløpet tilsvarer isolert sett omtrent tre til fire måneders planlagt kostnadsbase før nye inntekter. I praksis avhenger runway også av kontantbeholdning ved closing, eksisterende inntekter i Tech, eventuelle pilotinntekter og når kostnadene trappes opp.',
    ],
    kobling: [
      ['Denne emisjonen', ['Produktisere DigiHome', 'Gjøre løsningen klar for eksterne kunder', 'Første større pilotkunde i produksjon', 'Et sterkere utgangspunkt for neste runde']],
      ['Neste runde og kundeinntekter', ['Pilotimplementering i skala', 'Standardisert leveranse og support', 'Flere integrasjoner', 'Salg og organisasjon']],
    ],
    runwayH: 'Runway til neste runde',
    runway: ['Kontantbeholdning ved closing', `+ emisjonen (${DEAL.f.investeringKort})`, '+ eksisterende inntekter i Tech', '+ eventuelle pilotinntekter', '– månedlig kostnadsbase', '= runway til neste runde'],
    runwayNote: 'Dette regnestykket går vi gjennom sammen med dere, med de faktiske forutsetningene og regnearket på bordet. Ambisjonen er å hente en større runde når den første eksterne valideringen er på plass – og dermed gå inn i den med et sterkere selskap enn i dag.',
  },

  /* ── 10 Tilbudet – alle tall fra DEAL ── */
  offer: {
    eyebrow: 'Tilbudet',
    title: 'Vi ønsker dere med som medeiere i DigiHome Tech.',
    paragraphs: [
      `Vi tilbyr ${DEAL.investorer[0]} og ${DEAL.investorer[1]} å tegne nye aksjer for samlet ${DEAL.f.investering}, fordelt likt mellom dere. Etter emisjonen eier dere ${DEAL.f.eierandelPerPerson} hver – samlet ${DEAL.f.eierandel} av DigiHome Tech AS.`,
      'Prisingen er satt i den fasen selskapet er i nå: produktet er bygget og brukes i egen drift, men vi har ennå ikke dokumentert kommersiell utrulling hos større eksterne kunder. Det er også grunnen til at vi ønsker å gjøre runden nå – lykkes vi med produktiseringen og de første større kundene, mener vi utgangspunktet for en senere kapitalrunde blir vesentlig sterkere.',
      'Investeringen gjelder DigiHome Tech AS, ikke forvaltningsvirksomheten.',
    ],
    terms: [
      [DEAL.f.investeringKort, 'Investering', `${DEAL.f.investering} samlet · ${DEAL.f.perPerson} hver`],
      [DEAL.f.preMoney, 'Pre-money', 'verdsettelse før emisjonen'],
      [DEAL.f.postMoney, 'Post-money', 'verdsettelse etter emisjonen'],
      [DEAL.f.eierandel, 'Eierandel', `samlet etter emisjonen · ${DEAL.f.eierandelPerPerson} hver`],
    ],
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

  /* ── 11 Veien videre ── */
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
export const INNHOLD = { INV, AVSENDERE, TEAM, TEAM_GRUPPER, BREV, DEAL, PORTEFOLJE };
