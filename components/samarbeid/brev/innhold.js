/** Privat invitasjon til Martin Vikesland og Øyvind Storli Hoel – ett brev, på /samarbeid. Ikke søkbart, ikke lenket fra noe sted.
 *  En personlig invitasjon fra Erik, Sarah og Martin – ikke en landingsside. Rød tråd: vi liker dere → dette er målbildet → dette bygger vi →
 *  slik henger Tech og forvaltning sammen → dette tilbyr vi → dette bygger vi sammen → ring oss når dere har tenkt.
 *  Gjelder KUN DigiHome Tech AS. Forvaltningen er eget selskap og pilotkunde. Tall merket «per 4. oktober 2026» er hentet fra plattformen. */

export const INV = {
  date: '4. oktober 2026',
  to: 'Til Martin og Øyvind',
  firstNames: 'Martin og Øyvind',
  fullNames: 'Martin Vikesland og Øyvind Storli Hoel',
};

export const AVSENDERE = [
  { key: 'erik', name: 'Erik Hoffmann-Dahl', role: 'Styreleder · advokat', img: '/team-erik.webp', pos: '50% 18%' },
  { key: 'sarah', name: 'Sarah Sleeman', role: 'Daglig leder · styremedlem', img: '/brand/sarah-sleeman-1000.webp', pos: '50% 28%' },
  { key: 'martin', name: 'Martin C. Kviteberg', role: 'Produktsjef · styremedlem', img: '/v4/martin.webp', pos: '50% 22%' },
];

export const BREV = {
  eyebrow: 'Privat invitasjon',
  role: 'Medeier i DigiHome Tech',
  brand: 'DigiHome',
  confidential: 'Konfidensielt',
  h1: ['Vi vil bygge dette', 'sammen med dere.'],
  sub: 'Etter samtalene våre er vi blitt enda sikrere på at dere er folk vi ønsker rundt bordet når DigiHome Tech skal bygges videre – og at Bergen er stedet å begynne.',
  cta: 'Les brevet',
  hi: 'Hei Martin og Øyvind,',
  signature: 'Erik, Sarah og Martin',

  letter: [
    'Takk for gode samtaler den siste tiden.',
    'Vi har fått et veldig godt inntrykk av dere – av hvordan dere tenker om markedet, om driften og om hva som faktisk skal til for å vinne i Bergen. Dere har utfordret oss på de riktige tingene, og samtidig sett det samme målbildet som oss: lange leieforhold i Norge, vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne merke enn Utleiemegleren.',
    'Vi ønsker derfor ikke bare å samarbeide med dere om forvaltningen.',
    'Vi ønsker å invitere dere inn som medeiere i DigiHome Tech AS – teknologiselskapet bak plattformen.',
    'Det betyr å være med og forme produktet, modellen og selskapet fra en tidlig fase, samtidig som forvaltningen rigges som et eget selskap for vekst – med dere tett på.',
    'Under har vi forsøkt å gjøre invitasjonen så konkret som mulig: hvorfor vi ønsker akkurat dere med, hvordan vi ser målbildet, hva vi bygger, hvordan Tech og forvaltning henger sammen, og hvilke vilkår vi ønsker å tilby.',
  ],
  letterStrong: 3,

  why: {
    eyebrow: 'Hvorfor dere',
    title: 'Vi tror dere tilfører noe vi trenger rundt bordet.',
    paragraphs: [
      'Dere kjenner utleiemarkedet i Bergen fra innsiden – eierne, byggene og den daglige driften. Det er kunnskap vi ikke kan lese oss til, og den er avgjørende i byen vi skal vinne først.',
      'Gjennom Bergen Beds har dere bygget og drevet utleie med egne folk. Dere vet hva det koster å levere kvalitet, hvor tiden går, og hva som skal til for at det går rundt.',
      'Men bakgrunnen deres er bare en del av grunnen.',
      'I samtalene våre har vi særlig merket oss hvordan dere tenker. Dere har gått inn i tallene, stilt spørsmål ved modellen – ren langtid eller langtid pluss 10+2 – og sett på selskapet som mer enn en ny kanal for egen portefølje.',
      'Det er nettopp den typen medeiere vi ønsker.',
    ],
    points: [
      ['Markedet i Bergen', 'Eierne, byggene og driften i byen vi skal vinne først.'],
      ['Drift i praksis', 'Erfaring med å drive utleie med egne folk – ikke bare på papiret.'],
      ['Blikk for selskapet', 'Interesse for plattformen og modellen – ikke bare for egne enheter.'],
    ],
  },

  target: {
    eyebrow: 'Målbildet',
    title: ['Først Bergen.', 'Så resten av Norge.'],
    paragraphs: [
      'Vi leser målbildet likt.',
      'Lange leieforhold i Norge, vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne merke enn den etablerte aktøren. Ikke ved å gjøre det samme litt billigere, men ved å gjøre det på en måte som faktisk er bedre for eieren og leietakeren.',
    ],
    principle: 'Forvaltningen vinner byen. Plattformen gjør at vi kan gjøre det igjen – i neste by, og hos andre forvaltere.',
    rows: [
      ['Bergen', 'Hjemmebanen. Her beviser vi modellen – prosesser, prising og produkt – med forvaltningen og teknologien tett på hverandre.'],
      ['Oslo og de store byene', 'Der volumet er. Når modellen sitter i Bergen, tar vi den med oss – samme plattform, samme måte å jobbe på.'],
      ['Utleiemegleren', 'Den vi måler oss mot. Vi skal være mer effektive, gi en bedre kundeopplevelse og ha et mer moderne merke.'],
      ['Internasjonalt', 'Plattformen som et eget spor, uavhengig av egen forvaltning. Det er her den langsiktige oppsiden i Tech ligger.'],
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
    phoneCaption: 'Eierappen slik den står i dag.',
  },

  structure: {
    eyebrow: 'Tech og forvaltning',
    title: 'To selskaper, med hver sin jobb.',
    paragraphs: [
      'DigiHome er rigget som to selskaper.',
      'DigiHome Tech AS eier og utvikler plattformen, og skal selge den til forvaltere og eiendomsselskaper – også utover vår egen drift. Forvaltningen ligger i et eget selskap, som rigges for vekst i Norge med egne folk og lokal drift, og som blir kunde av Tech.',
      'I starten utnytter vi synergiene: de samme folkene rundt bordet, felles kundeinnsikt og kort vei fra drift til produkt. Men selskapene holdes adskilt, slik at forvaltningen kan vokse på egne premisser – og Tech kan selge til hele markedet, også til forvaltere som konkurrerer med vår egen.',
      'Denne invitasjonen gjelder DigiHome Tech AS.',
    ],
    rows: [
      ['DigiHome Tech AS', 'Eier og utvikler plattformen. Selger den til forvaltere og eiendomsselskaper. Det er dette selskapet vi inviterer dere inn i.'],
      ['Forvaltningen', 'Eget selskap, rigget for vekst i Norge med egne ansatte og lokal drift. Kunde av Tech – på pilotvilkår i starten.'],
      ['Pilotavtalen', 'Forvaltningsselskapet blir første kunde, med en avtale som gjør det gunstig å være først. Innsikten fra driften går rett inn i produktet.'],
      ['Driftsmodellen', 'Ren langtid, eller langtid pluss 10+2 med egne ansatte. Den første er enklere og skalerer raskere geografisk; den andre gir mer inntekt per by, men tyngre lokal drift. Valget tas i forvaltningen. Plattformen skal bære begge.'],
    ],
  },

  team: {
    eyebrow: 'Teamet',
    title: 'Et lite team med ulik styrke.',
    paragraphs: [
      'DigiHome bygges i dag av tre personer med ganske forskjellig bakgrunn.',
      'Sarah er eiendomsmegler med seks år i rådgivende roller i DNB, og leder kundeakkvisisjon og forvaltning. Martin grunnla BnbSpesialisten – en av Norges første profesjonelle utleieforvaltere – og hadde ti år i Adonis AS frem mot exit; han eier produktet. Erik er advokat og partner i Hoffmann Thinn, og har tegnet selskapsstrukturen som skal bære vekst og emisjon.',
      'Vi ønsker dere inn som medeiere i en eierkrets vi bevisst holder liten. Dere tilfører det vi mangler rundt bordet: markedet i Bergen, og driften i praksis.',
    ],
  },

  built: {
    eyebrow: 'Hvor vi står',
    title: 'Dette starter ikke fra null.',
    paragraphs: [
      'Plattformen er i drift i Bergen i dag. Vi forvalter selv, og bruker systemet hver dag – det er slik produktet er blitt til.',
      'Per 4. oktober 2026 ligger 39 enheter på plattformen, med rundt 540 000 kroner i månedlig husleie gjennom systemet. Eierne har kommet til oss uten oppsøkende salg – via digihome.no, guider og kalkulatorer.',
      'Det siste året har vi bygget eierappen, leietakerflyten og forvalterens arbeidsflate ende til ende: annonsering, BankID, depositum, fakturering, saker og regnskap. Mye av grunnarbeidet er gjort. Nå går vi inn i fasen der plattformen skal ut til flere forvaltere.',
    ],
    points: [
      ['Produkt i drift', 'Eierapp, leietakerflyt og forvalterens arbeidsflate – bygget ende til ende og i bruk i Bergen i dag.'],
      ['Integrasjoner', 'FINN, BankID, Keyhole (depositum), PowerOffice Go og Fiken.'],
      ['Forvaltning i praksis', 'Vi forvalter selv på plattformen. Det som ikke fungerer, merker vi før kundene gjør det.'],
      ['Klar for neste fase', 'Pilotavtale med forvaltningsselskapet, flere forvaltere på plattformen, og Bergen som første marked å vinne.'],
    ],
    note: 'Tallene er per 4. oktober 2026 og hentet fra plattformen.',
  },

  offer: {
    eyebrow: 'Tilbudet',
    title: 'Vi ønsker dere med som medeiere.',
    paragraphs: [
      'Vi ønsker å invitere dere inn som medeiere med 10 % av DigiHome Tech AS.',
      'Vilkårene reflekterer to ting: at dere kommer inn tidlig, og at rollen er ment å være mer enn en finansiell investering. Vi ønsker medeiere som er med og bygger selskapet sammen med oss over tid – og som tar forvaltningen med seg inn som første kunde.',
    ],
    terms: [
      ['10\u00a0%', 'Eierskap', 'av aksjene i DigiHome Tech AS – nye aksjer i en rettet emisjon'],
      ['10\u00a0MNOK', 'Verdsettelse', 'av selskapet – grunnlaget for emisjonen'],
      ['Ingen', 'Vesting', 'aksjene er deres fra dag én, i samme aksjeklasse som gründerne'],
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
      ['Reell påvirkning', 'Dere involveres i sentrale produkt- og strategivalg – særlig hva forvaltere faktisk trenger for å vokse.'],
      ['Verdiene ligger i selskapet', 'Programvare, data, merkevare og øvrig plattform-IP bygges i DigiHome Tech AS.'],
      ['Kapitalen går til produkt og salg', 'Emisjonen går inn i selskapet, ikke til dagens eiere.'],
      ['Ryddige spilleregler', 'Aksjonæravtalen skal ha tydelige mekanismer for nye emisjoner, vekst og dersom noen senere ønsker å tre ut.'],
    ],
  },

  next: {
    eyebrow: 'Hva skjer herfra?',
    title: 'Vi håper dere har lyst til å være med.',
    paragraphs: [
      'Dette handler for oss om mer enn kapital.',
      'Vi ønsker dere med som medeiere og rundt bordet når DigiHome Tech utvikles videre – og forvaltningen med som første kunde på plattformen.',
      'Ta gjerne litt tid til å tenke gjennom invitasjonen. Dersom dette fortsatt føles interessant, tar vi en ny samtale og går gjennom tallene, pilotavtalen og det praktiske rundt emisjonen.',
      'Før vi ferdigstiller avtalene, vil vi gjerne gå gjennom business caset sammen – åpne regneark, ikke konklusjoner – og bli enige om modellen.',
      'Det er ingen grunn til å gi noe formelt svar her.',
      'Ring eller skriv når dere har fått tenkt litt på det, så tar vi det videre derfra.',
    ],
  },

  footer: 'Privat og konfidensiell invitasjon til Martin Vikesland og Øyvind Storli Hoel.',
};
