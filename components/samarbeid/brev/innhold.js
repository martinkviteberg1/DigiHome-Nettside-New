import 'server-only';
/** Privat invitasjon til Martin Vikesland og Øyvind Storli Hoel – ett brev, på /samarbeid. Ikke søkbart, ikke lenket fra noe sted.
 *  En personlig invitasjon fra Erik, Sarah og Martin – ikke en landingsside. Gjelder KUN DigiHome Tech AS.
 *  SERVER-ONLY: teksten leses av server-komponenten i app/samarbeid og sendes bare til nettlesere med gyldig sesjon – den ligger ikke i JS-bundlen.
 *  Én kilde til sannhet for tall: DEAL (emisjonen), PORTEFOLJE (aktive enheter), BUDSJETT (12 mnd). Alt annet refererer hit.
 *  v7 (05.10.2026): investeringscase – kortere og mer konkret. Brevet rett under brevhodet, «Hvorfor nå» som tese, roadmap med resultatkrav,
 *  kapitalplan med runway og use of funds, laget og rollen i én seksjon, tilbud med pre- og post-money. */

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

export const TEAM = [
  { key: 'sarah', gruppe: 'ledelse', name: 'Sarah Sleeman', role: 'Daglig leder', img: '/brand/sarah-sleeman-1000.webp', pos: '50% 28%', bio: 'Eiendomsmegler med seks år i DNB. Leder kundeakkvisisjon og forvaltning.' },
  { key: 'martin', gruppe: 'ledelse', name: 'Martin C. Kviteberg', role: 'Produktsjef', img: '/v4/martin.webp', pos: '50% 22%', bio: 'Grunnla BnbSpesialisten, ti år i Adonis frem mot exit. Leder produkt og teknologi.' },
  { key: 'erik', gruppe: 'ledelse', name: 'Erik Hoffmann-Dahl', role: 'Styreleder', img: '/team-erik.webp', pos: '50% 18%', bio: 'Advokat og partner i Hoffmann Thinn. Har tegnet selskapsstrukturen.' },
  { key: 'vikesland', gruppe: 'inviteres', name: 'Martin Vikesland', role: 'Medeier · økonomi og kapital', img: '/team/martin-vikesland.webp', pos: '50% 30%', invited: true, bio: 'Finansiell sparringspartner i økonomiske modeller, kapitalplan og investordialog.' },
  { key: 'hoel', gruppe: 'inviteres', name: 'Øyvind Storli Hoel', role: 'Medeier · marked, produkt og kommersialisering', img: '/team/oyvind-storli-hoel.webp', pos: '50% 22%', invited: true, bio: 'Operativ markedskunnskap og relasjoner inn mot eiendomsselskapene vi ønsker som design- og pilotkunder.' },
  { key: 'kevin', gruppe: 'rundt', name: 'Kevin Ha', role: 'Teknisk ressurs · utvikling', img: '/team/kevin-ai-v2.webp', pos: '50% 22%', bio: 'Bistår Martin i utviklingen av plattformen. Siviløkonom fra NHH, AI-drevet utvikling og automatisering.' },
  { key: 'jens', gruppe: 'rundt', name: 'Jens-Petter Glittenberg', role: 'Styremedlem', img: '/team/jens-petter-glittenberg.webp', pos: '50% 28%', bio: 'Medgründer av Meltwater, styreleder i CARN Capital. Erfaring med internasjonal skalering, kapitalmarked og selskapsbygging.' },
];

export const BREV = {
  eyebrow: 'Privat invitasjon',
  role: 'Medeier i DigiHome Tech',
  brand: 'DigiHome',
  confidential: 'Konfidensielt',
  h1: ['Vi ønsker dere', 'med på eiersiden.'],
  sub: 'Etter samtalene våre er vi blitt sikre på at dere er folk vi ønsker rundt bordet når DigiHome går fra egen drift til de første store eksterne kundene.',
  sub2: 'Derfor ønsker vi å invitere dere inn som medeiere i DigiHome Tech.',
  cta: 'Les invitasjonen',
  hi: 'Hei Martin og Øyvind,',
  signature: 'Erik, Sarah og Martin',

  /* Brevet – fire avsnitt. */
  letter: [
    'Takk for gode samtaler den siste tiden. Vi sitter igjen med et veldig godt inntrykk – ikke bare av erfaringen deres fra utleie, men av hvordan dere har gått inn i DigiHome, utfordret modellen og sett mulighetene i teknologiselskapet.',
    'Vi er nå på vei inn i en ny fase. Plattformen brukes i egen drift i dag. Neste steg er å gjøre den klar for større eiendomsselskaper og få de første eksterne pilotkundene på.',
    'I den fasen ønsker vi dere ikke bare som samarbeidspartnere. Vi ønsker dere inn som medeiere i DigiHome Tech.',
    'På de neste sidene har vi forsøkt å være konkrete om hvorfor, hva vi allerede har bygget, planen videre, kapitalbehovet og tilbudet vi ønsker å gi dere.',
  ],
  letterStrong: 2,

  /* ── 01 Hvorfor dere ── */
  why: {
    eyebrow: 'Hvorfor dere',
    title: 'Det er måten dere har gått inn i DigiHome på.',
    paragraphs: [
      'Det som har gjort oss mest sikre etter samtalene våre, er ikke bare erfaringen deres fra Bergen Beds. Det er måten dere har gått inn i DigiHome på.',
      'Dere har vært opptatt av driften, økonomien og skalerbarheten – ikke bare hva plattformen kan gjøre for egne boliger. Dere har utfordret antakelser, gått inn i tallene og sett potensialet i Tech-selskapet.',
      'Det er nettopp den typen medeiere vi ønsker rundt bordet nå.',
    ],
  },

  /* ── 10 Laget og rollen deres – i én seksjon ── */
  team: {
    eyebrow: 'Laget og rollen deres',
    title: 'Produkt, forvaltning, teknologi og juss rundt bordet.',
    paragraphs: [
      'Vi har produkt, forvaltning, teknologi, juss og erfaring med å bygge selskaper rundt bordet. Det vi ønsker å tilføre nå, er finansiell sparring inn mot kapitalplan og investorer – og operativ markedskunnskap og relasjoner inn mot de første større kundene.',
      'Det er der dere kommer inn.',
    ],
    rolleH: 'Hva vi ser for oss',
    rolleLead: 'Eierskapet er reelt – ikke en samarbeidsavtale med en aksjepost på toppen. Men det er heller ikke et ansettelsesforhold. Vi ser for oss at dere deltar aktivt i de strategiske diskusjonene gjennom pilotfasen, er tilgjengelige som sparringspartnere og bidrar innenfor de områdene dere kjenner best. Omfanget avtales pragmatisk.',
    rolle: [
      ['Rundt bordet', 'Dere involveres i sentrale produkt- og strategivalg – særlig hva eiendomsselskaper faktisk trenger for å ta plattformen i bruk.'],
      ['Økonomi og kapital · Martin', 'Finansiell sparringspartner i økonomiske modeller, kapitalplan og dialogen med fremtidige investorer.'],
      ['Marked, produkt og kommersialisering · Øyvind', 'Operativ markedskunnskap og relasjoner inn mot eiendomsselskapene vi ønsker som design- og pilotkunder.'],
      ['Ryddige spilleregler', 'Aksjonæravtale med tydelige mekanismer for neste kapitalrunde, vekst og dersom noen senere vil ut.'],
    ],
  },

  /* ── 02 Hva som allerede er bygget – produktbeviset, kort: én desktopflate, de to appene og seks punkter ── */
  built: {
    eyebrow: 'Dette er bygget',
    title: ['Ikke en idé.', 'En plattform i drift.'],
    paragraphs: [
      'Dere investerer ikke i at vi skal begynne å bygge DigiHome. Plattformen finnes og brukes i reell drift: forvaltningsselskapet driftes på den – med ekte eiere, leietakere, innbetalinger og saker.',
      `Aktive enheter på plattformen per ${PORTEFOLJE.per}: ${PORTEFOLJE.aktiveEnheter}. Under er forvalterens oversikt og de to appene, gjenskapt komponent for komponent slik de står i dag.`,
    ],
    desktopCaption: ['Forvalterens oversikt', 'Det som venter, det som skjedde siden sist, og porteføljens helse – i én flate.'],
    phoneCaptions: ['Eierens app', 'Leietakerens app'],
    listH: 'Dette finnes i dag',
    list: [
      'Forvalterens arbeidsflate, eierapp og leietakerapp – i daglig drift',
      'Leadmotor, markedsføring og attribusjon fra interessent til kontrakt',
      'Økonomikontroll: KID-matching, purring, oppgjør til eier og bokføringsgrunnlag',
      'AI-funksjoner i driften – saker, svar og rutineoppgaver',
      'Nettsted, merkevare og kundereise – fra første søk til signert kontrakt',
      'Stresstestet på egen portefølje, hver dag',
    ],
    integrasjonerH: 'Integrasjoner',
    integrasjoner: [
      ['I drift', 'FINN · BankID · Keyhole'],
      ['Under implementering', 'PowerOffice Go · Fiken'],
    ],
    note: 'Skjermbildene er gjenskapt fra plattformen slik den står i dag og viser illustrative data.',
  },

  /* ── 03 Målbildet ── */
  target: {
    eyebrow: 'Målbildet',
    title: 'Plattformen for lange leieforhold i Norge.',
    paragraphs: [
      'Det eieren, leietakeren og forvalteren faktisk jobber i – vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne produkt enn systemene som finnes i dag. Ikke ved å gjøre det samme litt billigere, men ved å bygge det på nytt rundt hvordan forvaltere jobber.',
    ],
    principle: 'Forvaltningsselskapet beviser plattformen. De første eksterne pilotkundene beviser at den kan selges. Derfra skalerer vi.',
  },

  /* ── 04 Tech og forvaltning ── */
  structure: {
    eyebrow: 'Tech og forvaltning',
    title: 'To selskaper, med hver sin jobb.',
    paragraphs: [
      'DigiHome Tech AS eier og utvikler plattformen, og skal selge den til forvaltere og eiendomsselskaper. Forvaltningen ligger i et eget selskap, som er kunde av Tech.',
      'I starten utnytter vi synergiene – de samme folkene, felles kundeinnsikt og kort vei fra drift til produkt. Men selskapene skilles, teknisk og selskapsmessig, slik at Tech kan selge til hele markedet. Også til forvaltere som konkurrerer med vår egen.',
      'Denne invitasjonen gjelder DigiHome Tech AS.',
    ],
    rows: [
      ['DigiHome Tech AS', 'Eier og utvikler plattformen. Selger den til forvaltere og eiendomsselskaper. Det er dette selskapet vi inviterer dere inn i.'],
      ['Forvaltningsselskapet', 'Eget selskap. Første produksjonsmiljø og designkunde på plattformen, på pilotvilkår. Den første uavhengige referansen kommer når en ekstern pilot lykkes.'],
      ['Avtalen mellom selskapene', 'Forholdet reguleres gjennom en skriftlig kunde-/lisensavtale, slik at Tech utvikles som et selvstendig selskap med egen økonomi og markedsmessige kommersielle vilkår.'],
      ['IP og rettigheter', 'Kildekode, produkt-IP, merkevare, produktdesign, datamodeller og øvrige teknologirettigheter ligger i DigiHome Tech AS. Dette bekreftes og dokumenteres før emisjonen gjennomføres.'],
    ],
  },

  /* ── 05 Hvorfor nå – investeringstesen: det som er bygget er mer enn kode, og hva det har redusert av risiko ── */
  naa: {
    eyebrow: 'Hvorfor nå',
    title: ['Dere kommer ikke inn', 'på idéstadiet.'],
    paragraphs: [
      'DigiHome Tech starter ikke fra null.',
      'Siden starten har vi investert rundt 500\u00a0000 kroner i direkte utviklingskostnader, i tillegg til anslagsvis 1\u00a0000–1\u00a0500 timer produktarbeid. Men det som er bygget, er mer enn kode: merkevaren DigiHome, kundereisen, nettstedet og salgsmotoren, produktdesignet, eier- og leietakeropplevelsen, forvalterens arbeidsflate, driftsprosessene, integrasjonene og økonomiflytene – og erfaringen med hvordan alt dette fungerer i reell drift.',
      'Det er ikke den historiske kostnaden som bærer caset. Det er at investeringen har gitt et fungerende produkt, know-how, plattform-IP og vesentlig redusert gjennomføringsrisiko.',
    ],
    steg: [
      ['Bygget', 'Fase 1 · gjennomført', 'Merkevare, posisjonering, produkt, arbeidsflyter, integrasjoner og plattform-IP. I bruk i egen drift.'],
      ['Nå', 'Fase 2 · dere kommer inn', 'Produktisering – og én–to større eiendomsselskaper som eksterne pilotkunder.'],
      ['Neste runde', 'Fase 3 · ekstern validering', 'Dokumentert etterspørsel. Større kapitalrunde for å skalere salg, produkt og organisasjon.'],
    ],
    risikoH: 'Fire typer risiko – og hvor de står',
    risiko: [
      ['Byggerisiko', 'Vesentlig redusert', 'Kjerneproduktet eksisterer og brukes i reell drift.'],
      ['Operativ produktrisiko', 'Delvis redusert', 'Arbeidsflytene er utviklet og iterert gjennom egen forvaltning.'],
      ['Produktiseringsrisiko', 'Neste milepæl', 'Plattformen skal gjøres kundeuavhengig, sikker og repeterbart implementerbar.'],
      ['Kommersiell risiko', 'Det vi nå skal bevise', 'At større eksterne eiendomsselskaper faktisk kjøper og bruker produktet.'],
    ],
  },

  /* ── 06 Neste verdiløft: én–to eksterne piloter – det emisjonen skal oppnå, og hva det betyr for neste runde ── */
  loft: {
    eyebrow: 'Neste verdiløft',
    title: ['Én–to eksterne piloter', 'i reell drift.'],
    paragraphs: [
      'Den neste milepælen er ikke å bevise at vi kan bygge en plattform. Det har vi gjort. Nå skal vi bevise at den kan brukes og kjøpes av andre.',
      'De kommende månedene gjør vi derfor én målrettet produktiserings- og kommersialiseringsjobb med ett mål: én–to større eiendomsselskaper som eksterne pilotkunder. Fungerer plattformen i skala også utenfor egen forvaltning, har DigiHome bevist noe vesentlig mer enn i dag – at dette er et produkt andre profesjonelle aktører er villige til å bygge driften sin rundt.',
      'Det er på dette tidspunktet vi inviterer dere inn: etter at merkevaren, produktet og grunnplattformen er bygget – men før den eksterne kommersielle valideringen er på plass.',
    ],
    bevisH: 'Det vi skal kunne vise før neste runde',
    bevis: [
      'Et produkt som kan settes opp for en ny kunde uten en egen kodeversjon',
      'Minst én større ekstern eiendomsaktør i produksjon – ekte boliger, brukere og arbeidsflyter',
      'Signerte pilot-/kundeavtaler og en kontraktsmodell som kan gjentas',
      'Dokumentert bruk i egen drift og de første eksterne referansene',
    ],
    verdi: [
      'Lykkes vi med dette, mener vi selskapet vil stå i en vesentlig sterkere posisjon ved neste kapitalrunde enn det gjør i dag. Hva det betyr for verdsettelsen, kan ingen garantere – men det er nettopp denne verdiskapingen vi skal forsøke å utløse sammen de neste månedene.',
    ],
  },

  /* ── 07 Roadmap – fire faser med resultatkrav: hva som må være sant før vi går videre ── */
  roadmap: {
    eyebrow: 'Roadmap',
    title: ['Fra egen drift', 'til et produkt andre kan kjøpe.'],
    paragraphs: [
      'Kapitalen skal ikke brukes på å finne ut om DigiHome fungerer.',
      'Den skal ta plattformen fra et system bygget for egen drift til et produkt som kan implementeres hos profesjonelle eiendomsselskaper – i fire faser. Hver fase har ett resultat som må være sant før vi går videre.',
    ],
    head: ['Periode', 'Fokus', 'Resultat – det som må være sant'],
    faser: [
      ['Nå → 3 mnd', 'Produktisering', 'Multi-tenant, roller, onboarding, datamodell, integrasjonslag og enterprise-sikkerhet. Separasjon fra egen forvaltning.', 'En ekstern kunde kan settes opp med egne brukere, data, roller og integrasjoner – uten at vi lager en egen kodeversjon for kunden.'],
      ['3 → 6 mnd', 'Ekstern validering', 'Én–to eksterne pilotkunder implementeres og tas i bruk.', 'Minst én større ekstern eiendomsaktør har ekte boliger, brukere og arbeidsflyter i produksjon.'],
      ['6 → 12 mnd', 'Repeterbar kommersialisering', 'Standard avtale, onboarding, support og prismodell.', 'Kunde nummer to kan onboardes vesentlig raskere enn kunde nummer én – med standard avtale, onboarding og prismodell.'],
      ['12 → 24 mnd', 'Skalering', 'Flere eiendomsselskaper og større porteføljer, nye integrasjoner, mer automatisering og KI.', 'Systematisk salg og onboarding, uten at veksten krever ny grunnarkitektur.'],
    ],
    maal: [
      ['Hovedmål første 6 måneder', 'DigiHome i produksjon hos minst én ekstern, profesjonell eiendomsaktør.'],
      ['Mål innen 12 måneder', '2–5 betalende selskaper – og dokumentert at DigiHome kan implementeres hos en ny kunde uten å bygges om fra bunnen.'],
    ],
    maalNote: 'Det siste er det virkelige SaaS-beviset – og nøkkelen til at dette kan bli et programvareselskap.',
  },

  /* ── 08 Forretningsmodell ── */
  modell: {
    eyebrow: 'Forretningsmodell',
    title: ['Programvare –', 'ikke en andel av leien.'],
    paragraphs: [
      'DigiHome prises som programvare, ikke som en prosentandel av kundens leieinntekter.',
      'Modellen består av en fast plattformavgift kombinert med pris per aktiv enhet. For større porteføljer legger modellen opp til en lavere enhetspris og en fast plattformkomponent. Det gir kunden forutsigbar økonomi, samtidig som DigiHome bygger høy kontraktsverdi på større porteføljer. For store kunder regner vi med 100–150 kroner per enhet i måneden, blandet.',
    ],
    enhet: 'Med «enhet» mener vi en forvaltet boenhet med aktivt leieforhold i plattformen. Det er også grunnlaget for fakturering.',
    eksempelH: 'Illustrativt – én kunde med 1 000 enheter',
    eksempel: ['1 000 enheter', '30 000 kr plattform + 1 000 × 100 kr', '130 000 kr/mnd', '1,56 MNOK ARR'],
    skalering: ['7,8 MNOK', 'ARR · fem kunder av tilsvarende størrelse', '5 000 enheter til samme vilkår. Skalerbarheten ligger i antall porteføljer, ikke i prisen per bolig.'],
    baseH: 'Base case – første 12 måneder',
    baseHead: ['Periode', 'Hva skjer', 'Inntekt'],
    base: [
      ['Måned 1–3', 'Produktisering.', 'Ingen ekstern inntekt'],
      ['Måned 4–6', 'Første pilotkunde i drift.', 'Begrenset eller betalt pilot'],
      ['Måned 7–9', 'Pilot går over i kontrakt. Kunde nummer to.', '1–2 betalende kunder'],
      ['Måned 10–12', 'Standardisert onboarding av neste kunder.', '2–3 betalende · 1 500–3 000 enheter'],
    ],
    baseResult: ['1,5–3 MNOK', 'Kontrakts-ARR ved utgangen av år 1', 'forutsatt pilotvilkår og rabatter i første fase. Til listepris tilsvarer samme volum om lag 2,5–4,5 MNOK. Har én pilot 5 000 boliger, ligger oppsiden utenfor base case.'],
  },

  /* ── 09 Kapitalplan: budsjett, runway og use of funds ── */
  kapital: {
    eyebrow: 'Kapitalplan',
    title: 'Hva krever de neste 12 månedene – og hva skal emisjonen oppnå?',
    paragraphs: [
      'Med om lag 150 000 kroner i måneden i produkt- og utviklingskapasitet, gründerressurs og øvrige kostnader er et realistisk basisbudsjett rundt 3–4 MNOK. Vi vil heller vise det enn å late som emisjonen finansierer hele reisen.',
    ],
    head: ['Kostnad', '12 mnd, indikativt'],
    budsjett: [
      ['Produkt- og softwareutvikling', '1,35–1,80 MNOK'],
      ['Produkt- og teknologiledelse (gründerressurs) – total selskapskostnad', '1,0–1,2 MNOK'],
      ['Hosting, AI, API-er, data og sikkerhet', '0,25–0,40 MNOK'],
      ['Pilotimplementering og integrasjoner', '0,20–0,40 MNOK'],
      ['Juridisk, regnskap, forsikring mv.', '0,10–0,20 MNOK'],
      ['Salg, reise og marked', '0,15–0,30 MNOK'],
    ],
    total: ['Totalt', 'ca. 3,1–4,3 MNOK'],
    basis: ['3,5 MNOK', 'Planlagt basisbudsjett', 'første 12 måneder · ca. 290 000 kr/mnd'],
    budsjettNote: 'Daglig leders kostnad ligger i dag i forvaltningsselskapet. Andelen som skal belastes Tech, tas inn i kapitalplanen vi går gjennom sammen.',
    bruddH: 'Hva denne emisjonen skal finansiere',
    brudd: [
      `${DEAL.f.investeringKort} dekker alene om lag 3–4 måneders kostnadsbase før inntekter. Emisjonen er et milepælsbeløp, ikke driftsfinansiering for tolv måneder.`,
      'Den skal finansiere neste verdiløft: produktisering → første eksterne pilot → grunnlag for en større runde. Målet er å gå inn i neste kapitalrunde når den første eksterne valideringen er på plass – ideelt gjennom signerte pilotavtaler og første implementeringer i første kvartal 2027. Milepælen er viktigere enn kalenderen.',
    ],
    kobling: [
      ['Denne emisjonen', ['Produktisering og enterprise-grunnarkitektur', 'Pilotklar løsning', 'Første eksterne pilotkunde', 'Grunnlag for større runde']],
      ['Neste runde og kundeinntekter', ['Pilotimplementering i skala', 'Repeterbar kommersialisering', 'Flere integrasjoner', 'Salg og organisasjon']],
    ],
    runwayH: 'Runway til neste runde',
    runway: ['Kontantbeholdning ved closing', `+ emisjonen (${DEAL.f.investeringKort})`, '+ eksisterende Tech-inntekter', '+ pilotinntekter', '– månedlig kostnadsbase', '= runway til neste runde'],
    runwayNote: 'Regnestykket går vi gjennom sammen i gjennomgangen av kapitalplanen – med åpne regneark.',
  },

  /* ── 11 Tilbudet – alle tall fra DEAL ── */
  offer: {
    eyebrow: 'Tilbudet',
    title: 'Vi ønsker dere med som medeiere.',
    paragraphs: [
      `${DEAL.investorer[0]} og ${DEAL.investorer[1]} tegner nye aksjer for samlet ${DEAL.f.investering} – ${DEAL.f.perPerson} hver – og eier samlet ${DEAL.f.eierandel} av DigiHome Tech AS etter emisjonen, ${DEAL.f.eierandelPerPerson} hver.`,
      `Emisjonen priser selskapet til ${DEAL.f.preMoney} før emisjonen (pre-money) og ${DEAL.f.postMoney} etter (post-money) – prisingen før den neste store risikoreduksjonen, ikke etter. Dere kjøper dere ikke inn i dagens inntekter eller i forvaltningsvirksomheten, men i en eksisterende teknologi som skal produktiseres, med en konkret plan for å bevise markedet.`,
    ],
    terms: [
      [DEAL.f.investeringKort, 'Investering', `${DEAL.f.investering} samlet · ${DEAL.f.perPerson} hver`],
      [DEAL.f.preMoney, 'Pre-money', 'verdsettelse før emisjonen'],
      [DEAL.f.postMoney, 'Post-money', 'verdsettelse etter emisjonen'],
      [DEAL.f.eierandel, 'Eierandel', `samlet etter emisjonen · ${DEAL.f.eierandelPerPerson} hver`],
    ],
    aksjer: 'Investeringen gir ordinære aksjer i samme aksjeklasse som dagens aksjer, ved gjennomført emisjon. Det er ingen vesting eller arbeidsplikt knyttet til aksjene. Øvrige eierrettigheter reguleres i vedtekter og aksjonæravtale.',
    formal: {
      h: 'Gjennomføringen',
      text: 'Emisjonen gjennomføres som en rettet emisjon mot dere, med term sheet og aksjonæravtale før tegning.',
      listH: 'Term sheet og aksjonæravtale avklarer blant annet',
      list: [
        'pro rata-rett og utvanning i neste kapitalrunde',
        'forkjøpsrett, tag-along og drag-along',
        'informasjon og rapportering til eierne',
        'styresammensetning og eventuelle reserved matters',
        'bekreftelse av at IP ligger i DigiHome Tech AS',
        'kunde-/lisensavtalen mellom Tech og forvaltningsselskapet',
        'hva som skjer dersom en part senere ønsker å selge seg ut',
        'closing-betingelser',
      ],
      closing: 'Mekanismene utarbeides sammen med dere, slik at de blir ryddige og balanserte for alle eierne og for selskapet.',
    },
  },

  /* ── 12 Neste steg ── */
  next: {
    eyebrow: 'Neste steg',
    title: 'Vi håper dere har lyst til å være med.',
    paragraphs: [
      'Ta gjerne litt tid til å tenke gjennom dette.',
      'Dersom dette fortsatt føles riktig, tar vi først en gjennomgang av business caset og kapitalplanen sammen – åpne regneark, ikke konklusjoner. Deretter setter vi et kort term sheet med de kommersielle hovedpunktene. Når vi er enige om det, ferdigstiller vi emisjon og aksjonæravtale.',
      'Det er ingen grunn til å gi noe formelt svar her. Ring eller skriv når dere har fått tenkt litt, så tar vi det videre derfra.',
    ],
  },

  footer: 'Privat og konfidensiell invitasjon til Martin Vikesland og Øyvind Storli Hoel.',
  footerFrom: 'Fra Erik, Sarah og Martin · DigiHome Tech AS',
  footerTop: 'Til toppen',
};

/** Alt server-komponenten sender til brevet – i ett objekt. */
export const INNHOLD = { INV, AVSENDERE, TEAM, TEAM_GRUPPER, BREV, DEAL, PORTEFOLJE };
