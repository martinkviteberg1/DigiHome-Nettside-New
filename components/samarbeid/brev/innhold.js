/** Privat invitasjon til Martin Vikesland og Øyvind Storli Hoel – ett brev, på /samarbeid. Ikke søkbart, ikke lenket fra noe sted.
 *  En personlig invitasjon fra Erik, Sarah og Martin – ikke en landingsside. Rød tråd: vi liker dere → dette er målbildet → dette bygger vi →
 *  slik henger Tech og forvaltning sammen → dette tilbyr vi → dette bygger vi sammen → ring oss når dere har tenkt.
 *  Gjelder KUN DigiHome Tech AS. Forvaltningsselskapet (ca. 35 enheter) er eget selskap, pilotkunde og stresstest for plattformen.
 *  Neste steg: én–to større eiendomsselskaper som eksterne pilotkunder → større kapitalrunde med mål tidlig Q1 2027. */

export const INV = {
  date: '4. oktober 2026',
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

/** Laget fremover – de som bygger i dag, styret, og de to vi inviterer inn. Rekkefølgen er rekkefølgen i rutenettet (4 + 3). */
export const TEAM = [
  { key: 'sarah', name: 'Sarah Sleeman', role: 'Daglig leder', img: '/brand/sarah-sleeman-1000.webp', pos: '50% 28%', bio: 'Eiendomsmegler med seks år i DNB. Leder kundeakkvisisjon og forvaltning.' },
  { key: 'martin', name: 'Martin C. Kviteberg', role: 'Produktsjef', img: '/v4/martin.webp', pos: '50% 22%', bio: 'Grunnla BnbSpesialisten, ti år i Adonis frem mot exit. Eier produktet.' },
  { key: 'erik', name: 'Erik Hoffmann-Dahl', role: 'Styreleder', img: '/team-erik.webp', pos: '50% 18%', bio: 'Advokat og partner i Hoffmann Thinn. Har tegnet selskapsstrukturen.' },
  { key: 'jens', name: 'Jens-Petter Glittenberg', role: 'Styremedlem', img: '/team/jens-petter-glittenberg.webp', pos: '50% 30%', bio: 'Medgründer av Meltwater (2001–2021). Styreleder i CARN Capital.' },
  { key: 'kevin', name: 'Kevin Ha', role: 'AI-rådgiver', img: '/team/kevin-ai-v2.webp', pos: '50% 22%', bio: 'Siviløkonom fra NHH, analytiker i DNB. Bygger og automatiserer plattformen med AI-drevet utvikling.' },
  { key: 'vikesland', name: 'Martin Vikesland', role: 'Inviteres inn som medeier', initials: 'MV', bio: 'Markedet fra innsiden, driften i praksis – og blikk for selskapet.' },
  { key: 'hoel', name: 'Øyvind Storli Hoel', role: 'Inviteres inn som medeier', initials: 'ØH', bio: 'Markedet fra innsiden, driften i praksis – og blikk for selskapet.' },
];

export const BREV = {
  eyebrow: 'Privat invitasjon',
  role: 'Medeier i DigiHome Tech',
  brand: 'DigiHome',
  confidential: 'Konfidensielt',
  h1: ['Vi vil bygge dette', 'sammen med dere.'],
  sub: 'Etter samtalene våre er vi blitt enda sikrere på at dere er folk vi ønsker rundt bordet når DigiHome Tech skal ut til de første eksterne kundene – og videre mot neste kapitalrunde.',
  cta: 'Les brevet',
  stage: ['Forvalterens oversikt', 'Eierens hjem i appen'],
  hi: 'Hei Martin og Øyvind,',
  signature: 'Erik, Sarah og Martin',

  letter: [
    'Takk for gode samtaler den siste tiden.',
    'Vi har fått et veldig godt inntrykk av dere – av hvordan dere tenker om markedet, om driften og om hva som faktisk skal til for å bygge noe forvaltere og eiendomsselskaper vil jobbe i. Dere har utfordret oss på de riktige tingene, og samtidig sett det samme målbildet som oss: én plattform for lange leieforhold i Norge, vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne produkt enn det som finnes i dag.',
    'Vi ønsker derfor ikke bare å samarbeide med dere.',
    'Vi ønsker å invitere dere inn som medeiere i DigiHome Tech AS – teknologiselskapet bak plattformen.',
    'Det betyr å være med og forme produktet, modellen og selskapet fra en tidlig fase – mens plattformen går fra pilot på egen portefølje til de første eksterne kundene, og videre mot en større kapitalrunde.',
    'Under har vi forsøkt å gjøre invitasjonen så konkret som mulig: hvorfor vi ønsker akkurat dere med, hvordan vi ser målbildet, hva vi bygger, hvor vi står, og hvilke vilkår vi ønsker å tilby.',
  ],
  letterStrong: 3,

  why: {
    eyebrow: 'Hvorfor dere',
    title: 'Vi tror dere tilfører noe vi trenger rundt bordet.',
    paragraphs: [
      'Dere kjenner utleiemarkedet fra innsiden – eierne, byggene og den daglige driften. Det er kunnskap vi ikke kan lese oss til, og den blir avgjørende når plattformen nå skal ut til eiendomsselskaper som driver dette i stor skala.',
      'Gjennom Bergen Beds har dere bygget og drevet utleie med egne folk. Dere vet hva det koster å levere kvalitet, hvor tiden går, og hva et system faktisk må løse for at det skal gå rundt.',
      'Men bakgrunnen deres er bare en del av grunnen.',
      'I samtalene våre har vi særlig merket oss hvordan dere tenker. Dere har gått inn i tallene, stilt spørsmål ved modellen, og sett på selskapet som mer enn en ny kanal for egen portefølje.',
      'Det er nettopp den typen medeiere vi ønsker.',
    ],
    points: [
      ['Markedet fra innsiden', 'Eierne, byggene og driften – det eiendomsselskapene skal kjenne igjen i produktet.'],
      ['Drift i praksis', 'Erfaring med å drive utleie med egne folk – ikke bare på papiret.'],
      ['Blikk for selskapet', 'Interesse for plattformen og modellen – ikke bare for egne enheter.'],
    ],
  },

  target: {
    eyebrow: 'Målbildet',
    title: ['Først bevist på egen portefølje.', 'Så ut til eiendomsselskapene.'],
    paragraphs: [
      'Vi leser målbildet likt.',
      'Plattformen for lange leieforhold i Norge – den eieren, leietakeren og forvalteren faktisk jobber i. Vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne produkt enn systemene som finnes i dag. Ikke ved å gjøre det samme litt billigere, men ved å bygge det på nytt rundt hvordan forvaltere jobber.',
    ],
    principle: 'Forvaltningsselskapet beviser plattformen. De første eksterne pilotkundene beviser at den kan selges. Så henter vi kapital til å skalere.',
    rows: [
      ['Nå · pilot og stresstest', 'Rundt 35 enheter i forvaltningsselskapet driftes på plattformen i dag. Det er her vi stresstester produktet – hver dag, med ekte leietakere, ekte innbetalinger og ekte saker.'],
      ['Neste · én–to eksterne pilotkunder', 'Vi retter oss nå mot større eiendomsselskaper, og vil ha med én eller to som eksterne pilotkunder. De beviser at plattformen fungerer utenfor vår egen drift – og gir oss referansene vi trenger.'],
      ['Tidlig Q1 2027 · neste kapitalrunde', 'Med pilotene på plass går vi ganske raskt mot en større kapitalrunde. Målet er tidlig første kvartal 2027. Denne emisjonen skal ta oss dit.'],
      ['Deretter · skalering', 'Flere forvaltere og eiendomsselskaper i Norge på samme plattform. Internasjonalt er et eget spor – det er der den langsiktige oppsiden i Tech ligger.'],
    ],
  },

  build: {
    eyebrow: 'Hva vi bygger',
    title: ['Ikke et nytt forvaltningsselskap.', 'Systemet forvaltere vokser på.'],
    paragraphs: [
      'DigiHome Tech skal ikke drive forvaltning.',
      'Vi bygger systemet eieren, leietakeren og forvalteren deler: leieforhold, innbetalinger, fakturering, saker og eierrapport – samlet på ett sted, slik at én ansatt kan håndtere langt flere enheter enn i dag, og eieren ser alt uten å måtte ringe.',
    ],
    principle: 'Eieren følger alt live. Leietakeren får svar i appen. Forvalteren jobber i én arbeidsflate.',
    flow: [
      ['Boligen legges ut', 'Annonsen publiseres på FINN, visninger bookes, og leietakeren identifiseres og kredittsjekkes med BankID.'],
      ['Kontrakten signeres', 'Leiekontrakt med BankID, depositumskonto og innflyttingsprotokoll rom for rom.'],
      ['Husleien kommer inn', 'Innbetalinger matches automatisk, purring går av seg selv, og oppgjøret til eieren bokføres i regnskapet.'],
      ['Saker løses', 'Leietakeren melder fra i appen, forvalteren får saken med kategori og frist, og eieren godkjenner med ett trykk.'],
    ],
    guarantee: 'Alt forvalteren gjør i dag, finnes i systemet – men gjøres én gang, og deles med eieren og leietakeren.',
    phoneCaption: 'Eierens hjem i mobilappen – slik skjermen står i dag.',
  },

  structure: {
    eyebrow: 'Tech og forvaltning',
    title: 'To selskaper, med hver sin jobb.',
    paragraphs: [
      'DigiHome er rigget som to selskaper.',
      'DigiHome Tech AS eier og utvikler plattformen, og skal selge den til forvaltere og eiendomsselskaper. Forvaltningen ligger i et eget selskap med rundt 35 enheter, som er kunde av Tech – og som vi bruker som pilot og stresstest for produktet.',
      'I starten utnytter vi synergiene: de samme folkene rundt bordet, felles kundeinnsikt og kort vei fra drift til produkt. Men selskapene holdes adskilt, slik at Tech kan selge til hele markedet – også til forvaltere som konkurrerer med vår egen.',
      'Denne invitasjonen gjelder DigiHome Tech AS.',
    ],
    rows: [
      ['DigiHome Tech AS', 'Eier og utvikler plattformen. Selger den til forvaltere og eiendomsselskaper. Det er dette selskapet vi inviterer dere inn i.'],
      ['Forvaltningsselskapet', 'Eget selskap med rundt 35 enheter i dag. Første kunde på plattformen – og stedet vi stresstester den, hver dag.'],
      ['Pilotavtalen', 'Forvaltningsselskapet er pilotkunde på gunstige vilkår. Innsikten fra driften går rett inn i produktet – men Tech bygges for hele markedet, ikke for én kunde.'],
    ],
  },

  team: {
    eyebrow: 'Teamet',
    title: 'Dette er laget vi vil bygge selskapet med.',
    paragraphs: [
      'DigiHome Tech bygges i dag av et lite team med ganske forskjellig bakgrunn – og et styre som har bygget selskaper før.',
      'Sarah er eiendomsmegler med seks år i rådgivende roller i DNB, og leder kundeakkvisisjon og forvaltning. Martin grunnla BnbSpesialisten – en av Norges første profesjonelle utleieforvaltere – og hadde ti år i Adonis AS frem mot exit; han eier produktet. Kevin er siviløkonom fra NHH og analytiker i DNB, og bygger og automatiserer plattformen med AI-drevet utvikling. Erik er advokat og partner i Hoffmann Thinn, og har tegnet selskapsstrukturen som skal bære vekst og emisjon. Jens-Petter var med og grunnla Meltwater og bygget selskapet globalt gjennom tjue år; i dag er han styreleder i CARN Capital og sitter i styret vårt.',
      'Med dere to rundt bordet får vi det vi mangler: markedet fra innsiden og driften i praksis. Slik ser vi laget for oss fremover.',
    ],
    inviteLabel: 'Inviteres inn',
  },

  built: {
    eyebrow: 'Hvor vi står',
    title: 'Dette starter ikke fra null.',
    paragraphs: [
      'Plattformen er i drift i dag. Forvaltningsselskapet driftes på den – rundt 35 enheter, med ekte leietakere, ekte innbetalinger og ekte saker. Det er slik produktet er blitt til, og det er slik vi stresstester det.',
      'Det siste året har vi bygget eierappen, leietakerappen og forvalterens arbeidsflate ende til ende: annonsering, BankID, depositum, fakturering, saker og regnskap. Mye av grunnarbeidet er gjort.',
      'Nå går vi inn i fasen der plattformen skal ut til de første eksterne kundene – større eiendomsselskaper som forvalter i et helt annet volum enn oss.',
    ],
    points: [
      ['Produkt i drift', 'Eierapp, leietakerapp og forvalterens arbeidsflate – bygget ende til ende og i daglig bruk.'],
      ['Integrasjoner', 'FINN, BankID, Keyhole (depositum), PowerOffice Go og Fiken.'],
      ['Pilot på egen portefølje', 'Rundt 35 enheter driftes på plattformen i dag. Det som ikke fungerer, merker vi før kundene gjør det.'],
      ['Neste steg', 'Én–to større eiendomsselskaper som eksterne pilotkunder – og en større kapitalrunde tidlig Q1 2027.'],
    ],
    figures: [
      ['Porteføljehelse', 'Forvalterens nøkkeltall – komponenten slik den står i appen.'],
      ['Aktive saker og det som venter', 'Saker gruppert etter hvem som må handle, og den ene mørke flaten: det forvalteren må beslutte.'],
    ],
    note: 'Skjermbildene i brevet er gjenskapt fra plattformen slik den står i dag. Tallene i dem er illustrative.',
  },

  offer: {
    eyebrow: 'Tilbudet',
    title: 'Vi ønsker dere med som medeiere.',
    paragraphs: [
      'Vi ønsker å invitere dere inn som medeiere med 10 % av DigiHome Tech AS.',
      'Vilkårene reflekterer to ting: at dere kommer inn tidlig, og at rollen er ment å være mer enn en finansiell investering. Vi ønsker medeiere som er med og bygger selskapet sammen med oss frem mot neste kapitalrunde – og som hjelper oss å åpne dørene til de første eksterne pilotkundene.',
    ],
    terms: [
      ['10\u00a0%', 'Eierskap', 'av aksjene i DigiHome Tech AS – nye aksjer i en rettet emisjon'],
      ['10\u00a0MNOK', 'Verdsettelse', 'av selskapet – grunnlaget for emisjonen'],
      ['Ingen', 'Vesting', 'aksjene er deres fra dag én, i samme aksjeklasse som gründerne'],
      ['Q1\u00a02027', 'Neste runde', 'mål for en større kapitalrunde – når de første eksterne pilotene er på plass'],
    ],
    noVesting: {
      h: 'Hvorfor ingen vesting',
      paragraphs: [
        'Vi har valgt å ikke knytte eierskapet til opptjening over tid.',
        'Dere kommer inn med kapital og et marked – ikke med en arbeidsplikt i Tech. Da mener vi eierskapet bør være enkelt og likt fra første dag: ordinære aksjer, samme klasse som gründerne, uten opptjening eller tilbakekjøp knyttet til rolle.',
      ],
    },
    formal: {
      h: 'Den formelle gjennomføringen',
      text: 'Emisjonen gjennomføres som en rettet emisjon mot dere. Detaljene – antall aksjer, om verdsettelsen regnes før eller etter emisjonen, og tidsplanen – fastsettes i et term sheet når vi er enige om retningen.',
      listH: 'Aksjonæravtalen vil også regulere blant annet',
      list: [
        'fremtidige emisjoner og utvanning',
        'forkjøpsrett og aksjeoverdragelser',
        'stemmerett og styresammensetning',
        'pilotavtalen mellom Tech og forvaltningsselskapet',
        'hva som skjer dersom en av partene senere ønsker å selge seg ut',
      ],
      closing: 'De konkrete mekanismene utarbeides i neste fase, slik at de blir ryddige og balanserte for alle eierne og for selskapet.',
    },
  },

  owners: {
    eyebrow: 'Som medeiere',
    title: 'Vi vil bygge verdiene sammen.',
    paragraphs: [
      'Eierskapet er reelt – ikke en samarbeidsavtale med en aksjepost på toppen.',
      'Vi ønsker at dere er med på å forme produktet, modellen og selskapets retning, og samtidig tar del i verdiene som skapes dersom vi lykkes.',
    ],
    rows: [
      ['Reell påvirkning', 'Dere involveres i sentrale produkt- og strategivalg – særlig hva eiendomsselskaper og forvaltere faktisk trenger for å vokse.'],
      ['Verdiene ligger i selskapet', 'Programvare, data, merkevare og øvrig plattform-IP bygges i DigiHome Tech AS.'],
      ['Kapitalen går til produkt og salg', 'Emisjonen går inn i selskapet – til produkt, de første eksterne pilotene og salg mot eiendomsselskapene. Ikke til dagens eiere.'],
      ['Ryddige spilleregler', 'Aksjonæravtalen skal ha tydelige mekanismer for neste kapitalrunde, vekst og dersom noen senere ønsker å tre ut.'],
    ],
  },

  next: {
    eyebrow: 'Hva skjer herfra?',
    title: 'Vi håper dere har lyst til å være med.',
    paragraphs: [
      'Dette handler for oss om mer enn kapital.',
      'Vi ønsker dere med som medeiere og rundt bordet når DigiHome Tech skal ut til de første eksterne kundene – og videre mot neste kapitalrunde tidlig 2027.',
      'Ta gjerne litt tid til å tenke gjennom invitasjonen. Dersom dette fortsatt føles interessant, tar vi en ny samtale og går gjennom tallene, planen frem mot pilotene og det praktiske rundt emisjonen.',
      'Før vi ferdigstiller avtalene, vil vi gjerne gå gjennom business caset sammen – åpne regneark, ikke konklusjoner – og bli enige om modellen.',
      'Det er ingen grunn til å gi noe formelt svar her.',
      'Ring eller skriv når dere har fått tenkt litt på det, så tar vi det videre derfra.',
    ],
  },

  footer: 'Privat og konfidensiell invitasjon til Martin Vikesland og Øyvind Storli Hoel.',
  footerFrom: 'Fra Erik, Sarah og Martin · DigiHome Tech AS',
  footerTop: 'Til toppen',
};
