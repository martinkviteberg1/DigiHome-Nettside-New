/* ---------------------------------------------------------------------------
   Privat forslag til Martin Vikesland og Øyvind Storli Hoel · innhold.
   Alt som er tekst og tall står her. Komponenten (Forslag.js) er bare form.
   Gjelder KUN DigiHome Tech AS. Forvaltning er eget selskap og pilotkunde.
--------------------------------------------------------------------------- */

export const VERSJON = 'Oktober 2026';
export const STED_DATO = 'Bergen, oktober 2026';

export const MOTTAKERE = ['Martin Vikesland', 'Øyvind Storli Hoel'];

export const AVSENDERE = [
  { navn: 'Erik Hoffmann-Dahl', rolle: 'Styreleder', img: '/team-erik.webp', pos: '50% 22%' },
  { navn: 'Sarah Sleeman', rolle: 'Daglig leder', img: '/brand/sarah-sleeman-360.webp', pos: '50% 30%' },
  { navn: 'Martin C. Kviteberg', rolle: 'Produkt og teknologi', img: '/v4/martin-320.webp', pos: '50% 20%' },
];

/* Tilbudet – bekreftet av oss. Emisjonsmekanikk (pre/post) avklares i term sheet. */
export const TILBUD = {
  selskap: 'DigiHome Tech AS',
  andel: '10\u202f%',
  verdsettelse: '10 MNOK',
  vesting: 'Ingen',
};

export const SEKSJONER = [
  { id: 'kort-fortalt', nr: '01', navn: 'Kort fortalt' },
  { id: 'malbildet', nr: '02', navn: 'Målbildet' },
  { id: 'det-vi-bygger', nr: '03', navn: 'Det vi bygger' },
  { id: 'strukturen', nr: '04', navn: 'Strukturen' },
  { id: 'hvorfor-dere', nr: '05', navn: 'Hvorfor dere' },
  { id: 'invitasjonen', nr: '06', navn: 'Invitasjonen' },
  { id: 'veien-videre', nr: '07', navn: 'Veien videre' },
  { id: 'hilsen', nr: '08', navn: 'Hilsen' },
];

export const HERO = {
  eyebrow: `Privat forslag · ${VERSJON} · Konfidensielt`,
  til: `Til ${MOTTAKERE[0]} og ${MOTTAKERE[1]}`,
  tittel: 'La oss vinne Bergen',
  tittelEm: 'sammen.',
  lead: 'Takk for gode samtaler. Vi leser målbildet likt – og vi tror veien dit går raskere sammen. Dette er en invitasjon til å bli medeiere i DigiHome Tech AS: teknologiselskapet bak plattformen som skal gjøre oss til utfordreren til Utleiemegleren.',
  fra: 'Fra Erik, Sarah og Martin',
};

export const KORT = {
  tittel: 'Tre ting å ta med seg.',
  punkter: [
    { k: 'Invitasjonen', t: `${TILBUD.andel} av aksjene i ${TILBUD.selskap}, som nye aksjer i en rettet emisjon. Verdsettelse ${TILBUD.verdsettelse}. Ingen vesting.` },
    { k: 'Målet', t: 'Vinne det norske langtidsmarkedet med høyere effektivitet, bedre kundeopplevelse og et mer moderne merke enn Utleiemegleren. Bergen først.' },
    { k: 'Strukturen', t: 'Tech og Forvaltning er to selskaper. Forvaltning blir kunde av Tech på pilotvilkår – og rigges separat for vekst. Dette forslaget gjelder Tech.' },
  ],
};

export const MALBILDET = {
  tittel: 'Først Bergen. Så Oslo. Så resten.',
  avsnitt: [
    'Vi leser målbildet likt: lange leieforhold i Norge, vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne merke enn den etablerte aktøren. Ikke ved å gjøre det samme litt billigere – men ved å gjøre det på en måte som faktisk er bedre for eieren og leietakeren.',
    'Bergen er hjemmebanen. Her har vi driften, nettverket og troverdigheten til å bevise modellen raskt. Når den sitter – prosesser, prising, produkt – tar vi den til Oslo og de andre byene der volumet er.',
    'Plattformen internasjonalt er et parallelt spor. Det krever ikke egen forvaltning i hvert marked – og det er der den langsiktige oppsiden i Tech ligger.',
  ],
  steg: [
    { navn: 'Bergen', tekst: 'Vinne hjemmemarkedet. Bevise modellen.', naa: true },
    { navn: 'Oslo', tekst: 'De store byene – der volumet er.' },
    { navn: 'Norge', tekst: 'Nasjonal utfordrer til Utleiemegleren.' },
    { navn: 'Internasjonalt', tekst: 'Plattformen som eget spor.' },
  ],
  bilde: { src: '/brand/tilbud-cover-bergen.jpg', alt: 'Bergen sentrum og Vågen i skumringen', tekst: 'Bergen, kveld. Hjemmebanen – og det første markedet vi skal vinne.' },
};

export const BYGGER = {
  tittel: 'Forvaltning som programvare.',
  avsnitt: [
    'Alt en forvalter gjør manuelt i dag – leieforhold, innbetalinger, fakturering, saker, eierrapport – samlet i ett system som eieren, leietakeren og forvalteren deler.',
    'Resultatet er langt flere enheter per ansatt, og en kundeopplevelse bransjen ikke har i dag.',
  ],
  roller: [
    { k: 'Eieren', t: 'Egen app. Full innsikt i husleie, utleiegrad og saker – og en assistent som hjelper når noe må avgjøres.' },
    { k: 'Leietakeren', t: 'Kontrakt med BankID, betaling og saker på samme sted. I appen – ikke på telefon.' },
    { k: 'Forvalteren', t: 'Én arbeidsflate for hele porteføljen. Automatikk der bransjen i dag bruker folk.' },
  ],
  bildetekst: 'Eierappen slik den står i dag: husleie, utleiegrad og dagens hendelser – på én skjerm.',
};

export const STRUKTUR = {
  tittel: 'To selskaper. Én retning.',
  ingress: 'DigiHome er rigget som to selskaper med hver sin jobb. Dette forslaget gjelder det ene.',
  tech: {
    navn: 'DigiHome Tech AS',
    merke: 'Dette forslaget',
    tekst: 'Eier og utvikler plattformen. Selger den til forvaltere og eiendomsselskaper – også utover vår egen drift.',
    punkter: ['Produkt, teknologi og data', 'Lisensinntekter fra forvaltere', 'Internasjonalt spor på sikt'],
  },
  forvaltning: {
    navn: 'Forvaltning',
    merke: 'Eget selskap',
    tekst: 'Rigges separat for vekst i Norge: egne folk, lokal drift, egen balanse. Kunde av Tech – på pilotvilkår i starten.',
    punkter: ['Lokal drift og egne ansatte', 'Pilotkunde med gunstig avtale', 'Vokser på egne premisser'],
  },
  kobling: { over: 'Plattform og produkt', under: 'Pilotavtale · innsikt fra drift' },
  avsnitt: [
    'I starten utnytter vi synergiene: samme folk rundt bordet, felles kundeinnsikt og kort vei fra drift til produkt. Men selskapene holdes adskilt – slik at Forvaltning kan vokse på egne premisser, og Tech kan selge til hele markedet, også til forvaltere som konkurrerer med vår egen.',
  ],
  note: {
    k: 'Om driftsmodellen',
    t: 'Vi har diskutert ren langtid mot langtid pluss 10+2 med egne ansatte. Den første er enklere, mer sentralisert og skalerer raskere geografisk. Den andre gir høyere inntekt per by og et større marked, men tyngre lokal drift og flere folk. Valget tas i Forvaltning. Plattformen skal bære begge.',
  },
};

export const HVORFOR = {
  tittel: 'Mer enn kapital.',
  ingress: 'Dette er ikke først og fremst en kapitalinnhenting. Det er en invitasjon til å bygge sammen – og grunnen er det dere tar med dere.',
  punkter: [
    { k: 'Markedet i Bergen', t: 'Dere kjenner eierne, byggene og driften. Det korter ned veien til volum i hjemmemarkedet – og lar oss bevise modellen raskere enn vi klarer alene.' },
    { k: 'Tilbakemeldingssløyfen', t: 'Et forvaltningsmiljø som bruker plattformen hver dag, gjør produktet bedre på måter ingen demo kan. Pilotkunden er ikke bare en kunde – den er en del av utviklingen.' },
    { k: 'Et tydelig lag', t: 'Sammen blir vi en troverdig utfordrer til Utleiemegleren: moderne merke, effektiv drift og et produkt eierne faktisk vil ha. I Bergen først, så nasjonalt.' },
  ],
  sitat: 'Vi kunne hentet kapital fra mange. Vi vil heller bygge dette med folk som kjenner markedet vi skal vinne.',
};

export const INVITASJON = {
  tittel: 'Ti prosent. Ingen vesting.',
  storTall: '10',
  storTekst: `av aksjene i ${TILBUD.selskap}`,
  vilkaar: [
    { k: 'Selskap', v: TILBUD.selskap },
    { k: 'Andel', v: `${TILBUD.andel} – nye aksjer i en rettet emisjon` },
    { k: 'Verdsettelse', v: TILBUD.verdsettelse },
    { k: 'Vesting', v: 'Ingen', s: 'Aksjene er deres fra dag én.' },
    { k: 'Aksjeklasse', v: 'Ordinære aksjer', s: 'Samme klasse som gründerne.' },
    { k: 'Kapitalen', v: 'Går inn i selskapet', s: 'Til produkt og salg.' },
    { k: 'Avklares sammen', v: 'Emisjonsmekanikk, aksjonæravtale og tidsplan', s: 'Dokumenteres i et term sheet når vi er enige om retningen.' },
  ],
  stille: 'Forvaltningsselskapet er ikke part i emisjonen. Pilotavtalen mellom Tech og Forvaltning settes opp separat – med vilkår som gjør det attraktivt å være først.',
};

export const VEIEN = {
  tittel: 'Fire steg til vi er i gang.',
  steg: [
    { k: 'Samtale', t: 'Vi går gjennom dette forslaget sammen og svarer på alt dere lurer på.' },
    { k: 'Tallene', t: 'Vi deler business case og forutsetninger – åpne regneark, ikke konklusjoner – og enes om modellen.' },
    { k: 'Pilotrammen', t: 'Vi definerer avtalen mellom Tech og Forvaltning: omfang, pris, varighet og hva som måles.' },
    { k: 'Term sheet', t: 'Emisjon og aksjonæravtale dokumenteres. Så gjennomfører vi – og går i gang med Bergen.' },
  ],
};

export const HILSEN = {
  tittel: 'Vi tror på dette.',
  tekst: 'Og vi tror det blir bedre – og går raskere – sammen med dere. Svar gjerne direkte til en av oss.',
  hilsen: 'Med vennlig hilsen',
};

export const FOOTER = {
  linje1: 'Dette dokumentet er et diskusjonsgrunnlag og ikke et bindende tilbud.',
  linje2: 'Delt konfidensielt med navngitte mottakere.',
  selskap: `DigiHome Tech AS · ${STED_DATO}`,
  print: 'Skriv ut eller lagre som PDF',
};
