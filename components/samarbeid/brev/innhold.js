/** Privat invitasjon til Martin Vikesland og Øyvind Storli Hoel – ett brev, på /samarbeid. Ikke søkbart, ikke lenket fra noe sted.
 *  En personlig invitasjon fra Erik, Sarah og Martin – ikke en landingsside. Rød tråd: vi liker dere → dette er målbildet → dette bygger vi →
 *  slik henger Tech og forvaltning sammen → dette tilbyr vi → dette bygger vi sammen → ring oss når dere har tenkt.
 *  Gjelder KUN DigiHome Tech AS. Forvaltningsselskapet (ca. 35 enheter) er eget selskap, pilotkunde og stresstest for plattformen.
 *  Neste steg: én–to større eiendomsselskaper som eksterne pilotkunder → større kapitalrunde med mål tidlig Q1 2027.
 *  v6 (05.10.2026): investeringscase – brevet før produktet, hvert poeng eies av én seksjon, «Hvorfor nå» som ryggrad, presist tilbud. */

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
  { key: 'martin', gruppe: 'ledelse', name: 'Martin C. Kviteberg', role: 'Produktsjef', img: '/v4/martin.webp', pos: '50% 22%', bio: 'Grunnla BnbSpesialisten, ti år i Adonis frem mot exit. Eier produktet.' },
  { key: 'erik', gruppe: 'ledelse', name: 'Erik Hoffmann-Dahl', role: 'Styreleder', img: '/team-erik.webp', pos: '50% 18%', bio: 'Advokat og partner i Hoffmann Thinn. Har tegnet selskapsstrukturen.' },
  { key: 'vikesland', gruppe: 'inviteres', name: 'Martin Vikesland', role: 'Medeier · CFO-rolle på deltid', img: '/team/martin-vikesland.webp', pos: '50% 30%', invited: true, bio: 'Økonomiske analyser og modeller – inn i strategi, kapitalplan og investordialoger.' },
  { key: 'hoel', gruppe: 'inviteres', name: 'Øyvind Storli Hoel', role: 'Medeier · marked og strategi', img: '/team/oyvind-storli-hoel.webp', pos: '50% 22%', invited: true, bio: 'Produkt og strategi – og nettverket inn mot eiendomsselskapene som kan bli de første kundene.' },
  { key: 'kevin', gruppe: 'rundt', name: 'Kevin Ha', role: 'Teknisk ressurs · utvikling', img: '/team/kevin-ai-v2.webp', pos: '50% 22%', bio: 'Bistår Martin i utviklingen av plattformen. Siviløkonom fra NHH, AI-drevet utvikling og automatisering.' },
  { key: 'jens', gruppe: 'rundt', name: 'Jens-Petter Glittenberg', role: 'Styremedlem', img: '/team/jens-petter-glittenberg.webp', pos: '50% 28%', bio: 'Medgründer av Meltwater, styreleder i CARN Capital. Stort nettverk, kapital og relasjoner.' },
];

export const BREV = {
  eyebrow: 'Privat invitasjon',
  role: 'Medeier i DigiHome Tech',
  brand: 'DigiHome',
  confidential: 'Konfidensielt',
  h1: ['Vi ønsker dere', 'med på eiersiden.'],
  sub: 'Etter samtalene våre er vi blitt sikre på at dere er folk vi ønsker rundt bordet når DigiHome går fra egen drift til de første store eksterne kundene.',
  sub2: 'Derfor ønsker vi å invitere dere inn som medeiere i DigiHome Tech.',
  cta: 'Les brevet',
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

  /* ── 02 Laget ── */
  team: {
    eyebrow: 'Laget',
    title: 'Produkt, forvaltning, teknologi og juss rundt bordet.',
    paragraphs: [
      'Vi har produkt, forvaltning, teknologi, juss og erfaring med å bygge selskaper rundt bordet. Det vi ønsker å tilføre nå, er økonomisk styring og analyse inn mot strategi og investorer – og operativ eiendomskompetanse og nettverk inn mot de første større kundene.',
      'Det er der dere kommer inn.',
    ],
  },

  /* ── 03 Hva som allerede er bygget – produktet, slik det står i dag ── */
  built: {
    eyebrow: 'Hva som er bygget',
    title: ['Ikke en idé.', 'En plattform i drift.'],
    paragraphs: [
      'Dere investerer ikke i at vi skal begynne å bygge DigiHome. Plattformen finnes, og den er i reell drift: forvaltningsselskapet driftes på den – rundt 35 enheter, med ekte leietakere, innbetalinger og saker.',
      'De viktigste arbeidsflytene i den løpende forvaltningen samles i én plattform – og bygges videre direkte fra erfaringene i faktisk drift. Under er forvalterens oversikt og de to appene, gjenskapt komponent for komponent slik de står i dag.',
    ],
    desktopCaption: ['Forvalterens oversikt', 'Det som venter, det som skjedde siden sist, og porteføljens helse – i én flate.'],
    flater: [
      ['Forvalteren', 'Én arbeidsflate for saker, leieforhold, innbetalinger, annonsering og regnskap. Det som venter på en beslutning, ligger øverst.'],
      ['Eieren', 'Ser inntekt, belegg og boligene sine live. Godkjenner tilbud og svarer forvalteren – uten å ringe.'],
      ['Leietakeren', 'Har leieforholdet, husleien, depositumet og kontakten med forvalteren på ett sted. Melder saker i appen.'],
    ],
    phoneCaptions: ['Eierens hjem', 'Leietakerens hjem'],
    listH: 'Dette finnes i dag',
    list: [
      'Eierapp, leietakerapp og forvalterens arbeidsflate – i daglig drift',
      'Leadmotor, markedsføring og attribusjon fra interessent til kontrakt',
      'Økonomikontroll: KID-matching, purring, oppgjør til eier og bokføring',
      'AI-funksjoner i driften – saker, svar og rutineoppgaver',
      'Integrasjoner: FINN, BankID, Keyhole, PowerOffice Go og Fiken',
      'Stresstestet på egen portefølje, hver dag',
    ],
    note: 'Skjermbildene er gjenskapt fra plattformen slik den står i dag. Tallene i dem er illustrative.',
  },

  /* ── 04 Målbildet ── */
  target: {
    eyebrow: 'Målbildet',
    title: 'Plattformen for lange leieforhold i Norge.',
    paragraphs: [
      'Det eieren, leietakeren og forvalteren faktisk jobber i – vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne produkt enn systemene som finnes i dag. Ikke ved å gjøre det samme litt billigere, men ved å bygge det på nytt rundt hvordan forvaltere jobber.',
    ],
    principle: 'Forvaltningsselskapet beviser plattformen. De første eksterne pilotkundene beviser at den kan selges. Derfra skalerer vi.',
  },

  /* ── 05 Tech og forvaltning ── */
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
      ['Forvaltningsselskapet', 'Eget selskap. Første kunde på plattformen, på pilotvilkår – og første referanse.'],
    ],
  },

  /* ── 06 Hvorfor nå – et tydelig mellomsteg. Ryggraden i caset. ── */
  naa: {
    eyebrow: 'Hvorfor nå',
    title: ['Dere kommer ikke inn', 'på idéstadiet.'],
    paragraphs: [
      'DigiHome Tech starter ikke fra null.',
      'Siden starten har vi brukt betydelig tid og kapital på å bygge både merkevaren, konseptet og teknologien. Plattformen er utviklet gjennom anslagsvis 1\u00a0000–1\u00a0500 timer produktarbeid, i tillegg til rundt 500\u00a0000 kroner i utviklingskostnader.',
      'Den viktigste investeringen er likevel det vi har lært underveis. Plattformen er bygget mens den har vært i reell utleiedrift – rundt faktiske boliger, eiere, leietakere, innbetalinger og saker – og videreutvikles hver uke.',
      'Det betyr at mye av den tidligste risikoen allerede er tatt.',
    ],
    steg: [
      ['Bygget', 'Fase 1 · gjennomført', 'Merkevare, konsept, produkt og IP. 1\u00a0000–1\u00a0500 timer og rundt 500\u00a0000 kr i utvikling. Brukt i egen drift.'],
      ['Nå', 'Fase 2 · dere kommer inn', 'Produktisering – og én–to større eiendomsselskaper som eksterne pilotkunder.'],
      ['Neste runde', 'Fase 3 · ekstern validering', 'Dokumentert etterspørsel. Større kapitalrunde for å skalere salg, produkt og organisasjon.'],
    ],
    mellom: [
      'Den neste milepælen er ikke å bevise at vi kan bygge en plattform. Det har vi gjort. Nå skal vi bevise at den kan brukes og kjøpes av andre.',
      'De kommende månedene gjør vi derfor én målrettet produktiserings- og kommersialiseringsjobb med ett mål: én–to større eiendomsselskaper som eksterne pilotkunder. Fungerer plattformen i skala også utenfor egen forvaltning, har DigiHome bevist noe vesentlig mer enn i dag – at dette er et produkt andre profesjonelle aktører er villige til å bygge driften sin rundt.',
      'Det er på dette tidspunktet vi inviterer dere inn: etter at merkevaren, produktet og grunnplattformen er bygget – men før den eksterne kommersielle valideringen er på plass.',
    ],
    risikoH: 'Tre typer risiko',
    risiko: [
      ['Teknologirisiko', 'Kraftig redusert', 'Plattformen eksisterer og er i drift.'],
      ['Produktrisiko', 'Redusert', 'Utviklet og iterert gjennom egen forvaltning.'],
      ['Kommersiell risiko', 'Det vi nå skal bevise', 'Eksterne eiendomsselskaper som kjøper og bruker plattformen.'],
    ],
    verdi: [
      'Lykkes vi med de første større pilotkundene, møter vi neste kapitalrunde med et ferdig produkt, dokumentert bruk i egen drift, ekstern validering og de første større kundereferansene. Planen er da å hente en større runde for å skalere salg, produkt og organisasjon.',
      'Dersom vi lykkes, mener vi selskapet vil stå i en vesentlig sterkere posisjon ved neste kapitalrunde enn det gjør i dag. Hva det betyr for verdsettelsen, kan ingen garantere – men det er nettopp denne verdiskapingen vi skal forsøke å utløse sammen de neste månedene.',
    ],
  },

  /* ── 07 Roadmap ── */
  roadmap: {
    eyebrow: 'Roadmap',
    title: ['Fra egen drift', 'til et produkt andre kan kjøpe.'],
    paragraphs: [
      'Kapitalen skal ikke brukes på å finne ut om DigiHome fungerer.',
      'Den skal ta plattformen fra et system bygget for egen drift til et produkt som kan implementeres hos profesjonelle eiendomsselskaper – i fire faser, der hver fase har ett resultat som kan etterprøves.',
    ],
    head: ['Periode', 'Fokus', 'Hva som skjer'],
    faser: [
      ['Nå → 3 mnd', 'Produktisering', 'Multi-tenant, roller, onboarding, datamodell, integrasjonslag, enterprise-sikkerhet og separasjon fra egen forvaltning.'],
      ['3 → 6 mnd', 'Eksterne piloter', 'Én–to eksterne pilotkunder. Plattformen brukes i faktisk drift utenfor DigiHome.'],
      ['6 → 12 mnd', 'Kommersiell V1', 'Standardisert onboarding, kontraktsmodell, support, prising og flere betalende kunder.'],
      ['12 → 24 mnd', 'Skalering', 'Flere eiendomsselskaper, større porteføljer, nye integrasjoner og mer automatisering og KI.'],
    ],
    maal: [
      ['Hovedmål første 6 måneder', 'DigiHome i produksjon hos minst én ekstern, profesjonell eiendomsaktør.'],
      ['Mål innen 12 måneder', '2–5 betalende selskaper – og dokumentert at DigiHome kan implementeres hos en ny kunde uten å bygges om fra bunnen.'],
    ],
    maalNote: 'Det siste er nøkkelen til at dette kan bli et programvareselskap.',
  },

  /* ── 08 Forretningsmodell ── */
  modell: {
    eyebrow: 'Forretningsmodell',
    title: ['Programvare –', 'ikke en andel av leien.'],
    paragraphs: [
      'DigiHome prises som programvare, ikke som en prosentandel av kundens leieinntekter.',
      'Modellen består av en fast plattformavgift kombinert med pris per aktiv enhet, med volumprising for større porteføljer. For store kunder regner vi med 100–150 kroner per enhet i måneden, blandet – ikke 490–990. Man trenger ikke presse prisen per bolig høyt dersom man kan vinne større porteføljer.',
    ],
    eksempelH: 'Illustrativt – én kunde med 1 000 enheter',
    eksempel: ['1 000 enheter', '30 000 kr plattform + 1 000 × 100 kr', '130 000 kr/mnd', '1,56 MNOK ARR'],
    baseH: 'Base case – første 12 måneder',
    baseHead: ['Periode', 'Hva skjer', 'Inntekt'],
    base: [
      ['Måned 1–3', 'Produktisering.', 'Ingen ekstern inntekt'],
      ['Måned 4–6', 'Første pilotkunde i drift.', 'Begrenset eller betalt pilot'],
      ['Måned 7–9', 'Pilot går over i kontrakt. Kunde nummer to.', '1–2 betalende kunder'],
      ['Måned 10–12', 'Standardisert onboarding av neste kunder.', '2–3 betalende · 1 500–3 000 enheter'],
    ],
    baseResult: ['1,5–3 MNOK', 'ARR ved utgangen av år 1', 'avhengig av kontraktsstørrelser. Har én pilot 5 000 boliger, ligger oppsiden utenfor base case.'],
    skaleringH: 'Den større muligheten – ikke budsjettert',
    skalering: [
      ['12 MNOK', 'ARR', '10 000 enheter × 100 kr/mnd'],
      ['30 MNOK', 'ARR', '25 000 enheter × 100 kr/mnd'],
      ['60 MNOK', 'ARR', '50 000 enheter × 100 kr/mnd'],
    ],
  },

  /* ── 09 Budsjett og kapitalbruk ── */
  kapital: {
    eyebrow: 'Budsjett og kapitalbruk',
    title: 'Hva krever de neste 12 månedene?',
    paragraphs: [
      'Med om lag 150 000 kroner i måneden i produkt- og utviklingskapasitet, gründerlønn og øvrige kostnader er et realistisk basisbudsjett rundt 3–4 MNOK. Vi vil heller vise det enn å late som 1 MNOK finansierer hele reisen.',
    ],
    head: ['Kostnad', '12 mnd, indikativt'],
    budsjett: [
      ['Produkt- og softwareutvikling', '1,35–1,80 MNOK'],
      ['Gründer/CEO – total selskapskostnad', '1,0–1,2 MNOK'],
      ['Hosting, AI, API-er, data og sikkerhet', '0,25–0,40 MNOK'],
      ['Pilotimplementering og integrasjoner', '0,20–0,40 MNOK'],
      ['Juridisk, regnskap, forsikring mv.', '0,10–0,20 MNOK'],
      ['Salg, reise og marked', '0,15–0,30 MNOK'],
    ],
    total: ['Totalt', 'ca. 3,1–4,3 MNOK'],
    basis: ['3,5 MNOK', 'Planlagt basisbudsjett', 'første 12 måneder'],
    forhold: [
      'Den foreslåtte emisjonen er ikke ment å finansiere hele skaleringsfasen.',
      'Den skal finansiere den viktigste neste milepælen: å gjøre DigiHome pilotklart for eksterne eiendomsselskaper og få de første kundene på plattformen. Resten dekkes av kundeinntekter og en større kapitalrunde, med mål tidlig i første kvartal 2027 – fra en langt sterkere posisjon.',
    ],
    kobling: [
      ['Denne emisjonen', ['Produktisering', 'Grunnleggende enterprise-arkitektur', 'Pilotklar løsning', 'Første eksterne pilotkunde']],
      ['Neste runde og kundeinntekter', ['Pilotimplementering', 'Kommersiell V1', 'Flere integrasjoner', 'Salg og skalering']],
    ],
  },

  /* ── 10 Tilbudet ── */
  offer: {
    eyebrow: 'Tilbudet',
    title: 'Vi ønsker dere med som medeiere.',
    paragraphs: [
      'Martin Vikesland og Øyvind Storli Hoel tegner nye aksjer for samlet 1 000 000 kroner, og eier samlet 10 % av DigiHome Tech AS etter emisjonen – 5 % hver.',
      'Det tilsvarer en verdsettelse på 10 MNOK etter emisjonen – prisingen før den neste store risikoreduksjonen, ikke etter. Dere kjøper dere ikke inn i dagens inntekter eller i forvaltningsvirksomheten, men i en eksisterende teknologi som skal skilles ut og produktiseres, med en konkret plan for å bevise markedet.',
    ],
    terms: [
      ['1\u00a0000\u00a0000\u00a0kr', 'Investering', 'nye aksjer i en rettet emisjon – samlet for dere to'],
      ['10\u00a0%', 'Eierandel', 'samlet etter emisjonen · 5 % + 5 %'],
      ['10\u00a0MNOK', 'Verdsettelse', 'etter emisjonen (post-money)'],
      ['Ordinære', 'Aksjer', 'tegnes ved emisjonen, samme aksjeklasse som dagens eiere'],
    ],
    noVesting: {
      h: 'Eierskap, ikke ansettelse',
      paragraphs: [
        'Dette er ikke en ansettelse eller en operativ fulltidsrolle, og eierskapet knyttes derfor ikke til en tradisjonell vestingmodell.',
        'Aksjene er deres fra tegning, i samme klasse og med samme rettigheter som dagens eiere.',
      ],
    },
    formal: {
      h: 'Gjennomføringen',
      text: 'Emisjonen gjennomføres som en rettet emisjon mot dere, med term sheet og aksjonæravtale før tegning.',
      listH: 'Aksjonæravtalen regulerer blant annet',
      list: [
        'neste kapitalrunde og utvanning',
        'forkjøpsrett og aksjeoverdragelser',
        'stemmerett og styresammensetning',
        'pilotavtalen mellom Tech og forvaltningsselskapet',
        'hva som skjer dersom en part senere ønsker å selge seg ut',
      ],
      closing: 'Mekanismene utarbeides sammen med dere, slik at de blir ryddige og balanserte for alle eierne og for selskapet.',
    },
  },

  /* ── 11 Rollen deres ── */
  owners: {
    eyebrow: 'Rollen deres',
    title: 'Hva vi faktisk forventer.',
    paragraphs: [
      'Eierskapet er reelt – ikke en samarbeidsavtale med en aksjepost på toppen. Men det er heller ikke en jobb.',
    ],
    rows: [
      ['Rundt bordet', 'Dere involveres i sentrale produkt- og strategivalg – særlig hva eiendomsselskaper faktisk trenger for å ta plattformen i bruk.'],
      ['Økonomi og investordialog', 'Martin bidrar med økonomiske analyser og modeller – inn i strategi, kapitalplan og dialogen med fremtidige investorer. En CFO-rolle på deltid, ikke en stilling.'],
      ['Marked, produkt og nettverk', 'Øyvind bidrar i produkt og strategi, og åpner dører inn mot eiendomsselskapene som kan bli de første pilotkundene.'],
      ['Ingen arbeidsplikt', 'Innsatsen er eierens, ikke den ansattes. Omfanget avtaler vi sammen.'],
      ['Ryddige spilleregler', 'Aksjonæravtale med tydelige mekanismer for neste kapitalrunde, vekst og dersom noen senere vil ut.'],
    ],
  },

  /* ── 12 Neste steg ── */
  next: {
    eyebrow: 'Neste steg',
    title: 'Vi håper dere har lyst til å være med.',
    paragraphs: [
      'Ta gjerne litt tid til å tenke gjennom dette.',
      'Dersom det fortsatt føles interessant, tar vi en ny samtale og går gjennom tallene, planen frem mot pilotene og det praktiske rundt emisjonen – åpne regneark, ikke konklusjoner.',
      'Det er ingen grunn til å gi noe formelt svar her. Ring eller skriv når dere har fått tenkt litt på det, så tar vi det videre derfra.',
    ],
  },

  footer: 'Privat og konfidensiell invitasjon til Martin Vikesland og Øyvind Storli Hoel.',
  footerFrom: 'Fra Erik, Sarah og Martin · DigiHome Tech AS',
  footerTop: 'Til toppen',
};
