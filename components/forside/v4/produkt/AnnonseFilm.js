'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall } from '../motion';
import { PAPIR, HVIT, STEIN, HAIR, DIM, OFF, H, P, MORF, LYSKANT, GLASS, BLUR_INN, FilmStil, Hake, Finn, Portrett, Inn, Vokse, Chip, Lapp, Dok, AutoKnapp, Peker, usePeker, Tekstbytte, Akter, NesteBro, Sms, ValgtKort, Bilde, fremdriftFor, Ramme } from './filmdeler';

/* ---------------------------------------------------------------------------
   AnnonseFilm — konseptfilm i én ramme. «Fra ledig til utleid. Du trykker tre ganger.»

   Ingen navigasjon inni rammen. Én setning + ett bilde per akt. Filmen spiller
   av seg selv; trykkene vises.

   Åpningen — «filmen begynner der heroen slutter». Ingen logo, ingen app-hode,
   ingen hilsen. Samme grid som resten av filmen: tekstspalten («Begynn med
   adressen.») til venstre, scenen til høyre — og adressefeltet er det eneste
   objektet i scenen:
     · Stillhet. Adressefeltet (samme som i heroen) kommer rolig opp midt i
       scenen. Markøren blinker.
     · «Nygårdsgaten 5» skrives med menneskelig rytme (ujevne tastetrykk, en
       liten pause før husnummeret). Etter tre tegn faller forslagslisten ned
       (hårlinjer, ingen kort) og smalner mens det skrives. Første rad markeres
       med ↵ — Enter velger. Feltet lander på «Nygårdsgaten 5, 5015 Bergen».
     · Boligen kjennes igjen: feltet glir opp og blir toppen av et «boligark».
       Fasadebildet (bygården i skumring) stiger opp til venstre, og til høyre
       glir fakta inn rad for rad med kilde under — Matrikkelen, Kartverket,
       Entur, leiemarkedet. Ingen spinner, ingen skannelinjer. Adressen blir et
       sted, stedet blir data.
     · «Lag annonse» kommer i tekstspalten (der alle filmens handlinger står).
       Pekeren glir inn, knappen løfter seg, trykk.
     · Knappen blir opplastingsfeltet i scenen. Fasadebildet systemet fant glir
       selv ned i feltet som det første bildet. Pekeren kommer med fire fra
       mobilen; de spretter ut i en løs bunke oppå. Så sorterer bunken seg i mosaikk.

   Akter (tekstspalten til venstre, scenen til høyre; stablet under lg):
     0 Begynn med adressen.       Feltet, skrivingen, boligarket, «Lag annonse».
     1 Legg til bildene.          Fasaden ligger i feltet; fire fra mobilen → bunke → mosaikk.
     2 Bildene leses.             Stue → kjøkken → soverom; nåler på det systemet ser.
                                  Detaljene samles som brikker i tekstspalten.
     3 Bildene styles.            Før/etter på soverommet: usengen res opp. Skillelinjen
                                  glir inn fra høyre, hviler (kan dras — filmen venter),
                                  fullføres. Merkes «Redigert».
     4 Annonsen skriver seg selv. Bildet blir banner i et utkast; overskrift, tekst, pris.
     5 Ett trykk — FINN.          Knappen trykkes. Utkastet blir FINN-siden.
     6 Visninger bookes.          Interessenter (ekte portretter) legitimerer seg, velger
                                  tidspunkt, får SMS-bekreftelse.
     7 Du velger.                 «Velg Emma» → kontrakt til BankID. SMS til Emma.
     Slutt                        «Fra ledig til utleid.» Loop.

   Teknikk: fast rammehøyde (H) på desktop. Bildet er ETT element som reiser
   gjennom aktene (rektangel per fase). Redusert bevegelse: ingen overganger.
   Ingen skannelinjer, spinnere, cursor, dashbord, telefonrammer.
--------------------------------------------------------------------------- */

const HVIL = 44;        // hvor skillelinjen hviler (prosent fra venstre)
const ADRESSE = 'Nygårdsgaten 5 · Leilighet 2';

/* Fasene i rekkefølge. START–TRYKK_START = åpningen (tomt adressefelt → skriving → valg → boligen kjennes igjen →
   «Lag annonse» trykkes). FELT = knappen blir opplastingsfeltet; fasaden glir ned i det. DRA = pekeren kommer med en
   fanet bunke på fire bilder og glir til feltet. SLIPP = bunken slippes og spretter ut oppå fasaden. BUNKE = bildene
   hviler. BILDER = de sorterer seg i mosaikken og får romnavn. */
const FASE_NAVN = ['START', 'SKRIV', 'VELG', 'FUNNET', 'PEKER', 'HOVER', 'TRYKK_START', 'FELT', 'DRA', 'SLIPP', 'BUNKE', 'BILDER',
  'LES1', 'LES2', 'LES3', 'STYLE', 'SKILLE', 'STYLET', 'TITTEL', 'TEKST', 'PRIS', 'KLAR', 'TRYKK', 'PUBLISERT',
  'INT1', 'INT2', 'BOOK1', 'BOOK2', 'SPM', 'ETTER', 'VELG_LEIETAKER', 'VALGT', 'SLUTT'];
const F = Object.fromEntries(FASE_NAVN.map((n, i) => [n, i]));
/* Tastetrykkene i «Nygårdsgaten 5» — ms fra forrige tegn. Ujevnt, som et menneske: «å» tar lengre, pause før
   husnummeret. Skrivingen starter SKRIV_FORSPRANG ms inn i fasen (feltet får fokus først). */
const ADRESSE_SKREVET = 'Nygårdsgaten 5';
const TAST = [0, 135, 95, 170, 85, 110, 75, 120, 90, 80, 95, 105, 250, 175];
const SKRIV_FORSPRANG = 420;
const TAST_SUM = TAST.reduce((s, x) => s + x, 0);
const tastTid = (n) => SKRIV_FORSPRANG + TAST.slice(0, n).reduce((s, x) => s + x, 0);   // når tegn nr n (1-basert) står
const AUTO = {
  /* Åpningen: tom flate → feltet kommer opp (START) → skrives, listen faller ned, første rad markeres (SKRIV) → Enter:
     listen lukker, adressen står (VELG) → feltet glir opp, fasaden og faktaene kommer, knappen (FUNNET) → pekeren glir
     inn (~1,3 s), hviler (HOVER), trykker (TRYKK_START) */
  [F.START]: 900, [F.SKRIV]: SKRIV_FORSPRANG + TAST_SUM + 620, [F.VELG]: 720, [F.FUNNET]: 2500, [F.PEKER]: 1150, [F.HOVER]: 420, [F.TRYKK_START]: 340,
  /* Feltet vokser ut av knappen, fasaden glir ned i det, pekeren går ut (FELT). Pekeren kommer tilbake med bunken og glir
     til feltet (DRA). Slipp: bunken spretter ut (SLIPP), hviler (BUNKE), sorterer seg med romnavn (BILDER). */
  [F.FELT]: 1500, [F.DRA]: 1450, [F.SLIPP]: 1100, [F.BUNKE]: 500, [F.BILDER]: 2600,
  [F.LES1]: 3300, [F.LES2]: 3000, [F.LES3]: 3200,
  [F.STYLE]: 3400, [F.SKILLE]: 2800, [F.STYLET]: 2000,
  [F.TITTEL]: 1000, [F.TEKST]: 1100, [F.PRIS]: 1700,
  [F.KLAR]: 1700, [F.TRYKK]: 380, [F.PUBLISERT]: 3000,
  [F.INT1]: 1300, [F.INT2]: 1100, [F.BOOK1]: 1900, [F.BOOK2]: 1800, [F.SPM]: 1500,
  [F.ETTER]: 1900, [F.VELG_LEIETAKER]: 380, [F.VALGT]: 2700, [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

/* Pekeren: hvilken knapp den sikter på i hver fase (ellers skjult). Trykkfasene presser. I DRA holder den bunken
   og sikter på slippunktet midt i feltet. */
const PEKER_MAAL = {
  [F.PEKER]: 'start', [F.HOVER]: 'start', [F.TRYKK_START]: 'start',
  [F.DRA]: 'felt',
  [F.KLAR]: 'publiser', [F.TRYKK]: 'publiser',
  [F.ETTER]: 'velg', [F.VELG_LEIETAKER]: 'velg',
};
const PRESSER = new Set([F.TRYKK_START, F.TRYKK, F.VELG_LEIETAKER]);
/* Der pekeren kommer inn fra, relativt til målet: med bunken kommer den langt utenfra (rammen klipper), ellers tett på */
const PEKER_INN = (navn) => (navn === 'felt' ? { x: 420, y: 290 } : { x: 230, y: 150 });


/* Aktene — én setning per akt. Ingen «vi gjør resten»: det bildene gjør (sorterer seg, får navn) vises, ikke listes. */
const AKTER = [
  { fra: F.START, tittel: 'Begynn med adressen.', tekst: 'Skriv den inn. Systemet finner boligen selv — byggeår, areal og hva den leies ut for i området.' },
  { fra: F.FELT, tittel: 'Legg til bildene.', tekst: 'Fasaden fant systemet selv. Fire fra mobilen holder — resten skjer mens du ser på.' },
  { fra: F.BILDER, tittel: 'Sortert. Rom for rom.', tekst: 'Stue først, fasade sist. Hvert bilde vet hvilket rom det er.' },
  { fra: F.LES1, tittel: 'Ser hva rommet har.', tekst: 'Parkett, kjøkkenøy, store vinduer. Alt i annonsen kan spores til et bilde.' },
  { fra: F.LES2, tittel: 'Svarer før noen spør.', tekst: 'Hvitevarer, spiseplass, oppvaskmaskin. Svarene ligger i bildene.' },
  { fra: F.LES3, tittel: 'Foreslår det som kan bli bedre.', tekst: 'Sengen er uoppredd. Forslag: re den opp — digitalt.' },
  { fra: F.STYLE, tittel: 'Kun sengen. Rommet står urørt.', tekst: 'Én instruks, avgrenset til sengen. Bildet merkes som redigert.' },
  { fra: F.TITTEL, tittel: 'Utkastet skriver seg.', tekst: 'Overskrift, tekst og pris — fra bildene og det du vet om boligen. Endre, eller publiser som det er.' },
  { fra: F.KLAR, tittel: 'Ute på FINN.no. Ett trykk.', tekst: 'Interessentene melder seg med BankID. Du vet hvem du snakker med.' },
  { fra: F.INT1, tittel: 'Visningen booker de selv.', tekst: 'De velger tid og får bekreftelsen på SMS. Du møter opp.' },
  { fra: F.ETTER, tittel: 'Du velger.', tekst: 'Inntekt og referanse ligger klart. De andre får beskjed samtidig.' },
];
const SLUTT = { tittel: 'Emma flytter inn 1. november.', tekst: 'Kontrakten er neste — og den er allerede fylt ut.' };
const aktIndeks = (f) => { let i = -1; AKTER.forEach((a, k) => { if (f >= a.fra) i = k; }); return i; };
const varighet = (i) => {
  const fra = AKTER[i].fra; const til = i + 1 < AKTER.length ? AKTER[i + 1].fra : SISTE + 1;
  let sum = 0; for (let f = fra; f < til; f += 1) sum += AUTO[f] || 0; return sum;
};
function aktTekst(fase) {
  if (fase >= F.SLUTT) return { id: 'slutt', ...SLUTT };
  const i = Math.max(0, aktIndeks(fase));
  return { id: String(i), ...AKTER[i] };
}

const FOTOS = [
  { id: 'stue', src: '/v4/annonse/stue-tom-1200.webp', liten: '/v4/annonse/stue-tom-700.webp', navn: 'Stue', les: F.LES1 },
  { id: 'kjokken', src: '/v4/annonse/kjokken-1280.webp', liten: '/v4/annonse/kjokken-600.webp', navn: 'Kjøkken', les: F.LES2 },
  { id: 'soverom', src: '/v4/annonse/soverom-useng-1000.webp', liten: '/v4/annonse/soverom-useng-700.webp', stylet: '/v4/annonse/soverom-1000.webp', styletLiten: '/v4/annonse/soverom-700.webp', navn: 'Soverom', les: F.LES3 },
  { id: 'spisestue', src: '/v4/annonse/spisestue-1280.webp', liten: '/v4/annonse/spisestue-600.webp', navn: 'Spisestue' },
  /* Heroens bygård (Nygårdsgaten 5) i skumring, uten eieren — filmens verden fortsetter inn i produktet. Laget fra filmens første bilde (scripts/generer-variant.py fasade). */
  { id: 'fasade', src: '/v4/annonse/fasade-kveld-1920.webp', liten: '/v4/annonse/fasade-kveld-1200.webp', navn: 'Fasade', pos: '56% 46%', posLiten: '46% 50%', posFlis: '50% 58%' },
];
const KILDE = Object.fromEntries(FOTOS.map((b) => [b.id, b]));
/* Vinduet til Leilighet 2 i fasadebildet (andel av bildet: 75,5 % / 57 %) → andel av 3:2-kortet: bildet (1,75:1) dekker
   kortets høyde, er 116,7 % bredt og ligger −9,3 % (object-position 56 %). x = 0,755·1,1667 − 0,0933. */
const LEILIGHET = { x: 78.8, y: 57 };
const SMAA = ['kjokken', 'soverom', 'spisestue', 'fasade'];
/* Opplastingen: rekkefølgen i bunken. Fasaden ligger allerede der (systemet fant den fra adressen); de fire andre
   kommer med pekeren. Stua sist — heltebildet, øverst i bunken, blir det store i mosaikken. */
const OPPTAK = ['fasade', 'kjokken', 'soverom', 'spisestue', 'stue'];
const HAAND = ['kjokken', 'soverom', 'spisestue', 'stue'];
const iOpplasting = (fase) => fase >= F.FELT && fase <= F.BUNKE;
/* Bunken pekeren holder: fire miniatyrer (3:2), fanet. Samme geometri brukes når flisene spretter ut av den. */
const MINI_W = 64; const MINI_H = 43; const MINI_R = 6;
const FAN = [-7.5, -2.5, 2.5, 7.5];
const miniPos = (k) => ({ x: 12 + k * 2, y: 10 + k * 1.5 });   // fra pekerens spiss

/* ── Åpningen: det systemet vet om adressen. Forslagene smalner mens det skrives (n = antall tegn). ── */
const ADRESSE_FULL = 'Nygårdsgaten 5, 5015 Bergen';
const forslagFor = (n) => {
  if (n < 3) return [];
  if (n >= 14) return [{ t: 'Nygårdsgaten 5', s: '5015 Bergen' }, { t: 'Nygårdsgaten 5B', s: '5015 Bergen' }, { t: 'Nygårdsgaten 51', s: '5015 Bergen' }];
  if (n >= 8) return [{ t: 'Nygårdsgaten', s: 'Bergen' }];
  return [{ t: 'Nygårdsgaten', s: 'Bergen' }, { t: 'Nygårdstangen', s: 'Bergen' }, { t: 'Nygårdshøyden', s: 'Bergen' }];
};
/* Faktaene som glir inn når boligen er kjent — verdi og kilde. Ingen ord om KI: dette er offentlige data. */
const BOLIGFAKTA = [
  { v: 'Bygård fra 1890 · leilighet 2', k: 'Matrikkelen' },
  { v: '54 m² · 2 rom · 2. etasje', k: 'Kartverket' },
  { v: 'Bybanen · 5 min gange', k: 'Entur' },
  { v: 'Leie i området 12 000–13 500 kr', k: 'Leiemarkedet · per måned' },
];

/* Lesingen av et bilde — én rolig linje går over bildet fra venstre til høyre (ease-in-out-sine). Til høyre for
   linjen ligger det uleste svakt dempet; bak den er bildet «kjent». Der linjen passerer noe systemet kjenner igjen,
   lander en fokusramme (fire hjørner) rundt området, punktet popper, etiketten glir ut — og brikken i tekstspalten
   kommer i samme takt. Ingen ord om KI; det ser ut som et kamera som stiller fokus. */
const SKANN_START = 420; const SKANN_MS = 1500;
const LESE_EASE = 'cubic-bezier(0.37, 0, 0.63, 1)';   // ≈ ease-in-out-sine — invers i leseTid()
/* Når linjen passerer x % av bildet (ms fra fasestart) */
const leseTid = (x) => SKANN_START + Math.round((Math.acos(1 - 2 * Math.min(1, Math.max(0, x / 100))) / Math.PI) * SKANN_MS);
/* Fokusrammen kommer idet linjen er et stykke inn i området (aldri etter punktet) */
const fokusTid = (p) => leseTid(p.omr ? Math.min(p.x, p.omr.x + p.omr.w * 0.35) : p.x);

/* Nåler — det systemet ser i hvert bilde. Prosent av bildeflaten (3:2). `omr` = området fokusrammen legger seg rundt
   (holdes innenfor det kameraet viser når det har drevet inn 14 %). */
const PINNER = {
  stue: [
    { id: 'vinduer', x: 30, y: 37, t: 'Store vinduer', omr: { x: 25, y: 16, w: 34, h: 48 } },
    { id: 'oy', x: 27, y: 65, t: 'Kjøkkenøy', omr: { x: 3, y: 61, w: 52, h: 37 } },
    { id: 'parkett', x: 64, y: 84, t: 'Parkett', omr: { x: 57, y: 74, w: 29, h: 22 } },
  ],
  kjokken: [
    { id: 'hvitevarer', x: 31, y: 70, t: 'Integrerte hvitevarer', omr: { x: 23, y: 56, w: 17, h: 28 } },
    { id: 'oppvask', x: 22, y: 86, t: 'Oppvaskmaskin', omr: { x: 11, y: 62, w: 13, h: 27 } },
    { id: 'spise', x: 84, y: 74, t: 'Spiseplass til fire', omr: { x: 66, y: 60, w: 28, h: 36 } },
  ],
  soverom: [
    { id: 'seng', x: 42, y: 76, t: 'Uoppredd seng', tone: 'forslag', under: 'Forslag: re opp', omr: { x: 15, y: 56, w: 58, h: 38 } },
    { id: 'garderobe', x: 92, y: 36, t: 'Garderobe' },
  ],
};
const ROM_FOR_LES = Object.fromEntries(FOTOS.filter((b) => b.les != null).map((b) => [b.les, b.id]));
const pinAv = (les, id) => PINNER[ROM_FOR_LES[les]].find((p) => p.id === id);
/* Kameraet: én rolig bevegelse per bilde — svakt inn (14 %) mot detaljene. Nålene ligger i bildet og følger med. */
const DRIFT = 1.14;
const FOKUS = { stue: { x: 40, y: 62 }, kjokken: { x: 52, y: 70 }, soverom: { x: 66, y: 56 } };
const DRIFT_EASE = 'cubic-bezier(0.3, 0, 0.2, 1)';
function driftTransform(id) {
  const f = FOKUS[id]; const maks = (DRIFT - 1) * 50;
  const tx = Math.max(-maks, Math.min(maks, (50 - f.x) * DRIFT));
  const ty = Math.max(-maks, Math.min(maks, (50 - f.y) * DRIFT));
  return `translate(${tx}%, ${ty}%) scale(${DRIFT})`;
}
/* Hvor kameraet står for hvert bilde i hver fase: 'ro' (før), 'inn' (leses), 'tilbake' (soverommet før styling) */
function kameraFor(id, fase) {
  const les = KILDE[id].les;
  if (fase < les) return { transform: 'translate(0%, 0%) scale(1)', transition: 'none', skala: 1 };
  if (fase === les) return { transform: driftTransform(id), transition: `transform ${AUTO[les] + 400}ms ${DRIFT_EASE}`, skala: DRIFT };
  if (id === 'soverom') return { transform: 'translate(0%, 0%) scale(1)', transition: `transform 1500ms ${MORF}`, skala: 1 };
  return { transform: driftTransform(id), transition: 'none', skala: DRIFT };
}

/* Brikkene i tekstspalten — det som hentes ut, i samme takt som nålene (`pin` peker på nålen). `tone: 'forslag'` = lilla. */
const FAKTA = [
  { t: 'Store vinduer', fra: F.LES1, pin: 'vinduer' }, { t: 'Kjøkkenøy', fra: F.LES1, pin: 'oy' }, { t: 'Parkett', fra: F.LES1, pin: 'parkett' },
  { t: 'Hvitevarer inkludert', fra: F.LES2, pin: 'hvitevarer' }, { t: 'Oppvaskmaskin', fra: F.LES2, pin: 'oppvask' }, { t: 'Spiseplass', fra: F.LES2, pin: 'spise' },
  { t: 'Garderobe', fra: F.LES3, pin: 'garderobe' }, { t: 'Re opp sengen', fra: F.LES3, tone: 'forslag', pin: 'seng' },
];

/* Styling: utvalget rundt sengen (prosent av bildeflaten) og instruksen — setning for setning. */
const UTVALG = { x: 3.5, y: 41, w: 75, h: 56.5 };
const PROMPT = ['Re opp sengen og glatt ut dynen.', 'Legg to puter symmetrisk.', 'Behold rommet, lyset og alt som er fast, nøyaktig som det er.'];

const ANNONSE = {
  tittel: 'Lys 2-roms med åpen kjøkkenløsning i Nygårdsgaten',
  spes: '54 m² · 1 soverom · 2. etasje · parkett · ledig 1. november',
};
const BRODTEKST_REN = 'Lys 2-roms i klassisk bygård. Åpen kjøkkenløsning med kjøkkenøy, integrert ovn og spiseplass, parkett og store vinduer mot rolig gate. Soverom med dobbeltseng og garderobe. Ledig fra 1. november.';

/* Interessentene — ekte portretter */
const FOLK = [
  {
    n: 'Emma Sørensen', bilde: '/v4/annonse/leietaker-emma.webp', fra: F.INT1,
    d: (f) => (f >= F.VALGT ? 'Valgt · kontrakten forberedes' : f >= F.ETTER ? 'Visning gjennomført · ønsker 3 års leie' : f >= F.BOOK1 ? 'Visning tirsdag 17:30 · bekreftet på SMS' : 'Meldte interesse via FINN · ønsker fra 1. nov'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt', 'Referanse'] : f >= F.BOOK1 ? ['BankID', 'Inntekt'] : ['BankID']),
    chip: (f) => (f >= F.VALGT ? ['Valgt', 'lilla'] : f >= F.ETTER ? ['Anbefalt', 'lilla'] : f >= F.BOOK1 ? ['Visning 17:30', 'noytral'] : null),
  },
  {
    n: 'Martin Berg', bilde: '/v4/annonse/leietaker-martin.webp', fra: F.INT2,
    d: (f) => (f >= F.VALGT ? 'Varslet på SMS · boligen er utleid' : f >= F.ETTER ? 'Visning gjennomført' : f >= F.BOOK2 ? 'Visning tirsdag 18:00 · bekreftet på SMS' : 'Meldte interesse via FINN'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt'] : ['BankID']),
    chip: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : f >= F.BOOK2 ? ['Visning 18:00', 'noytral'] : null),
  },
  {
    n: 'Sara Haugen', bilde: '/v4/annonse/leietaker-sara.webp', fra: F.SPM,
    d: (f) => (f >= F.VALGT ? 'Varslet på SMS · boligen er utleid' : 'Spurte om husdyr via FINN · besvart fra annonsen'),
    dok: () => [],
    chip: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : ['Besvart', 'noytral']),
  },
];
const HVEM = Object.fromEntries(FOLK.map((p) => [p.n.split(' ')[0], p]));

const SLOTS = [
  { t: '17:30', hvem: 'Emma', fra: F.BOOK1 },
  { t: '18:00', hvem: 'Martin', fra: F.BOOK2 },
  { t: '18:30', hvem: null },
];

const SMS = [
  { id: 'e1', til: 'Emma', fra: F.BOOK1, tilOg: F.VELG_LEIETAKER, tid: 'i dag 17:52', tekst: 'Hei Emma! Visningen i Nygårdsgaten 5 er bekreftet tirsdag kl. 17:30. Svar AVBESTILL om du ikke kan komme. – DigiHome' },
  { id: 'm1', til: 'Martin', fra: F.BOOK2, tilOg: F.VELG_LEIETAKER, tid: 'i dag 19:14', tekst: 'Hei Martin! Visningen i Nygårdsgaten 5 er bekreftet tirsdag kl. 18:00. Svar AVBESTILL om du ikke kan komme. – DigiHome' },
  { id: 'e2', til: 'Emma', fra: F.VALGT, tilOg: F.VALGT, tid: 'i dag 10:05', tekst: 'Gratulerer, Emma! Du er valgt som leietaker i Nygårdsgaten 5. Leiekontrakten kommer til deg for signering med BankID. – DigiHome' },
];









/* Knapp som trykkes av seg selv. `hover` = pekeren hviler på den. `knappRef` lar pekeren finne den. */

/* Pekeren — glir inn fra nede til høyre, hviler på knappen, trykker (krymper mot spissen + tynn ring), tones bort. */

/* Peker-logikk: måler målknappen relativt til rammen, kommer inn fra en forskjøvet posisjon og glir til målet. */

function G({ children }) {
  return <span style={{ textDecoration: 'underline dotted', textDecorationColor: 'rgba(160,90,220,0.7)', textUnderlineOffset: 4, textDecorationThickness: 1.5 }}>{children}</span>;
}
const Brodtekst = () => (
  <>Lys 2-roms i klassisk bygård. Åpen kjøkkenløsning med <G>kjøkkenøy</G>, <G>integrert ovn</G> og <G>spiseplass</G>, <G>parkett</G> og <G>store vinduer</G> mot rolig gate. Soverom med <G>dobbeltseng</G> og <G>garderobe</G>. Ledig fra 1. november.</>
);

/* Sekvensielt tekstbytte: det gamle går ut (240 ms), så kommer det nye inn — aldri to tekster samtidig. */

/* ── Åpningen: filmen begynner der heroen slutter. ──
   START: tom flate → adressefeltet kommer rolig opp midt i. SKRIV: feltet får fokus (lilla ring), «Nygårdsgaten 5»
   skrives tegn for tegn (TAST); forslagslisten faller ned etter tre tegn og smalner mens det skrives; første rad
   markeres med ↵. VELG: Enter — listen lukker, adressen står komplett med hake. FUNNET: feltet glir opp og gjør plass;
   fasadebildet (flisen 'fasade') stiger opp til venstre, faktaene glir inn til høyre, så «Lag annonse». PEKER/HOVER/
   TRYKK_START: pekeren trykker. FELT: knappen blir opplastingsfeltet i scenen, fasaden glir ned i det, adressen går til
   kontekstlinjen øverst til høyre. DRA/SLIPP: pekeren kommer med fire bilder som spretter ut oppå fasaden.
   Alt som beveger seg: transform/opacity. Ingen logo, ingen app-hode, ingen hilsen. ── */
const UT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const ADRESSE_LANG = 'Nygårdsgaten 5 · Leilighet 2 · ledig fra 1. november';
const FELT_H = 56;
const RING_RO = 'inset 0 0 0 1px rgba(21,19,15,0.12)';
const RING_FOKUS = `0 0 0 1px ${T.lilla}, 0 0 0 4px rgba(212,150,255,0.22)`;

function Opplastingsikon({ size = 22, color = 'rgba(21,19,15,0.6)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5V5M7.5 9.5L12 5l4.5 4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v2.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* Skrivingen: hvor mange tegn som står, styrt av TAST fra SKRIV starter. Før SKRIV: ingen. Etter: alle. */
function useSkriving(fase) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (fase < F.SKRIV) { setN(0); return undefined; }
    if (fase > F.SKRIV) { setN(TAST.length); return undefined; }
    setN(0);
    const ids = TAST.map((_, i) => window.setTimeout(() => setN(i + 1), tastTid(i + 1)));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [fase]);
  return n;
}

/* Adressefeltet — samme objekt som i heroen: hvit flate, hårlinje-ring, lilla fokusring mens det skrives. Under:
   forslagene som hårlinjerader (ingen kort, ingen ikoner). Første rad får ↵ når treffet er eksakt; VELG «trykker» den
   (mørkere) idet listen lukker. Haken kommer når adressen er valgt. Markøren blinker når ingen skriver. */
function AdresseBoks({ fase, ov, n, h = FELT_H, kompakt = false }) {
  const skriver = fase === F.SKRIV;
  const valgt = fase >= F.VELG;
  const tekst = valgt ? ADRESSE_FULL : ADRESSE_SKREVET.slice(0, n);
  const rader = skriver ? forslagFor(n) : fase === F.VELG ? forslagFor(TAST.length) : [];
  const apen = skriver && rader.length > 0;
  const markert = (skriver && n >= TAST.length) || fase === F.VELG;
  const skrevet = ADRESSE_SKREVET.slice(0, n).toLowerCase();
  const blink = skriver && (n === 0 || n >= TAST.length);
  return (
    <div className="relative" data-testid="v4-adresseboks" data-tekst={tekst} data-apen={apen ? '1' : '0'}>
      <div className={`flex items-center rounded-[14px] ${kompakt ? 'pl-4 pr-3' : 'pl-5 pr-4'}`} style={{ height: h, background: HVIT, boxShadow: skriver ? RING_FOKUS : RING_RO, transition: ov ? 'none' : `box-shadow 240ms ${EASE} ${skriver ? 0 : 180}ms` }}>
        <span className={`min-w-0 truncate ${kompakt ? 'text-[15px]' : 'text-[16px]'}`} style={{ color: tekst ? T.ink : 'rgba(21,19,15,0.42)' }}>{tekst || 'Skriv inn adressen din'}</span>
        <span aria-hidden="true" className="ml-[1px] inline-block w-[1.5px] shrink-0 rounded-[1px]" style={{ height: kompakt ? 18 : 20, background: T.ink, opacity: skriver ? 1 : 0, animation: blink && !ov ? 'v4-caret 1.05s steps(1) infinite' : 'none' }} />
        <span className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C', opacity: valgt ? 1 : 0, transform: valgt ? 'none' : 'scale(0.6)', transition: ov ? 'none' : valgt ? `opacity 300ms ${EASE} 260ms, transform 520ms ${LANDING} 260ms` : 'none' }} data-testid="v4-adresse-hake" data-vis={valgt ? '1' : '0'}><Hake size={12} /></span>
      </div>
      <ul className="absolute inset-x-0 top-[calc(100%+8px)] z-[9] overflow-hidden rounded-[14px] py-1" style={{ background: HVIT, boxShadow: '0 24px 48px -24px rgba(21,19,15,0.35), inset 0 0 0 1px rgba(21,19,15,0.08)', opacity: apen ? 1 : 0, transform: apen ? 'none' : 'translateY(-4px)', transition: ov ? 'none' : apen ? `opacity 220ms ${EASE}, transform 260ms ${UT}` : `opacity 200ms ${EASE} 170ms, transform 240ms ${EASE} 170ms`, pointerEvents: 'none' }} aria-hidden={!apen} data-testid="v4-film-forslag" data-n={rader.length}>
        {rader.map((s, i) => {
          const treff = s.t.toLowerCase().startsWith(skrevet) ? s.t.slice(0, skrevet.length) : '';
          const aktiv = i === 0 && markert;
          return (
            <li key={`${s.t}-${s.s}`} className={`flex items-center justify-between gap-4 ${kompakt ? 'px-4' : 'px-5'}`} style={{ height: kompakt ? 44 : 46, boxShadow: i > 0 ? 'inset 0 1px 0 rgba(21,19,15,0.06)' : 'none', background: aktiv ? (fase === F.VELG ? 'rgba(21,19,15,0.085)' : 'rgba(21,19,15,0.045)') : 'transparent', transition: `background 140ms ${EASE}` }} data-aktiv={aktiv ? '1' : '0'}>
              <span className={`truncate ${kompakt ? 'text-[14.5px]' : 'text-[15px]'}`} style={{ color: T.ink }}><span className="font-medium">{treff}</span>{s.t.slice(treff.length)}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-[13px]" style={{ color: 'rgba(21,19,15,0.5)' }}>{s.s}</span>
                <span aria-hidden="true" className="inline-flex h-[20px] w-[22px] items-center justify-center rounded-[5px] text-[11px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.16)', color: 'rgba(21,19,15,0.55)', opacity: aktiv ? 1 : 0, transition: `opacity 160ms ${EASE}` }}>↵</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Feltet på desktop: midt i flaten mens det skrives (translateY = feltDy), glir opp til hvileposisjonen når boligen er
   funnet (MORF) og gjør plass til fasaden og faktaene under. Kommer opp fra ro ved START, slipper ved trykket. */
function AdresseScene({ fase, L, ov, inne }) {
  const n = useSkriving(fase);
  const vis = (fase === F.START && inne) || (fase > F.START && fase <= F.TRYKK_START);
  const funnet = fase >= F.FUNNET;
  const ut = fase > F.TRYKK_START;
  const r = L.apn.felt;
  const transform = vis ? `translateY(${funnet ? 0 : L.apn.feltDy}px)` : ut ? 'translateY(-12px)' : `translateY(${L.apn.feltDy + 16}px)`;
  const overgang = ov ? 'none' : vis ? `opacity 700ms ${EASE}, transform ${funnet ? 950 : 800}ms ${funnet ? MORF : UT}` : `opacity 280ms ${EASE}, transform 420ms ${EASE}`;
  return (
    <div className="absolute z-[8]" style={{ left: r.x, top: r.y, width: r.w, opacity: vis ? 1 : 0, transform, transition: overgang, pointerEvents: 'none', willChange: 'transform, opacity' }} aria-hidden={!vis} data-testid="v4-adressefelt-film" data-funnet={funnet ? '1' : '0'}>
      <AdresseBoks fase={fase} ov={ov} n={n} />
    </div>
  );
}

/* Faktaene — det systemet vet om adressen, rad for rad med kilden under. Glir inn i takt etter at feltet har gjort plass. */
function Boligfakta({ fase, L, ov, rader = BOLIGFAKTA, r = L.apn.fakta, radH = L.apn.radH, kompakt = false, forsinkelse = 760 }) {
  const funnet = fase >= F.FUNNET && fase <= F.TRYKK_START;
  const ut = fase > F.TRYKK_START;
  return (
    <div className="absolute z-[8]" style={{ left: r.x, top: r.y, width: r.w, pointerEvents: 'none' }} aria-hidden={!funnet} data-testid="v4-boligfakta" data-vis={funnet ? '1' : '0'}>
      {rader.map((f, i) => (
        <div key={f.v} style={{ height: radH, boxShadow: 'inset 0 -1px 0 rgba(21,19,15,0.09)', opacity: funnet ? 1 : 0, transform: funnet ? 'none' : ut ? 'translateY(-6px)' : 'translateY(10px)', transition: ov ? 'none' : funnet ? `opacity 520ms ${EASE} ${forsinkelse + i * 170}ms, transform 640ms ${UT} ${forsinkelse + i * 170}ms` : `opacity 220ms ${EASE} ${i * 30}ms, transform 300ms ${EASE} ${i * 30}ms` }}>
          <p className={`${kompakt ? 'pt-2 text-[14px]' : 'pt-3 text-[15px]'} font-medium leading-[1.3] tracking-[-0.005em]`} style={{ color: T.ink }}>{f.v}</p>
          <p className={`mt-0.5 ${kompakt ? 'text-[11.5px]' : 'text-[12px]'} leading-[1.3]`} style={{ color: DIM }}>{f.k}</p>
        </div>
      ))}
    </div>
  );
}

/* Kontekstlinjen øverst til høyre — adressen følger resten av filmen. Kommer idet feltet slipper (FELT). */
function Adresse({ fase, L, ov }) {
  const vis = fase >= F.FELT;
  return (
    <p className="absolute z-[8] inline-flex h-5 items-center gap-2 whitespace-nowrap text-[13px] font-medium" style={{ right: P, top: L.hode.y, color: 'rgba(21,19,15,0.62)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: ov ? 'none' : vis ? `opacity 500ms ${EASE} 420ms, transform 600ms ${UT} 420ms` : `opacity 200ms ${EASE}`, pointerEvents: 'none' }} aria-hidden={!vis} data-testid="v4-app-adresse">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />{ADRESSE_LANG}
    </p>
  );
}

/* Etiketten på fasaden i åpningen — samme glass-lapp som romnavnene i mosaikken, så «Fasade» følger bildet videre. */
function FasadeLapp({ fase, r, ov, kompakt = false }) {
  const vis = fase >= F.FUNNET && fase <= F.TRYKK_START;
  return (
    <div className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 6, pointerEvents: 'none' }} aria-hidden="true">
      <Lapp vis={vis} delay={1050} ov={ov} className={kompakt ? 'left-2.5 top-2.5' : 'left-3 top-3'}>Fasade · hentet fra adressen</Lapp>
    </div>
  );
}

/* Opplastingsfeltet — vokser ut fra «Lag annonse» i tekstspalten (uniform skala fra knappens senter; `fra` måles i
   Desktop). Fasaden ligger allerede i det (flisen glir ned fra åpningen); nederst en stille linje om de fire fra
   mobilen. Når pekeren kommer inn med bunken (DRA), markeres feltet som slippsone (lilla kant, svak tone). */
function Felt({ fase, L, ov, slippRef, fra: b }) {
  const vis = fase >= F.FELT && fase <= F.BUNKE;
  const tom = fase === F.FELT || fase === F.DRA;
  const over = fase === F.DRA;
  const r = L.felt;
  const fra = b ? `translate(${(b.x + b.w / 2) - (r.x + r.w / 2)}px, ${(b.y + b.h / 2) - (r.y + r.h / 2)}px) scale(${Math.max(0.08, b.w / r.w)})` : 'scale(0.94)';
  return (
    <div className="absolute z-[2]" style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 18, border: `1.5px dashed ${over ? 'rgba(210,152,255,0.95)' : 'rgba(21,19,15,0.20)'}`, background: over ? 'rgba(210,152,255,0.08)' : 'rgba(21,19,15,0.025)', opacity: vis ? 1 : 0, transform: vis || fase > F.BUNKE ? 'none' : fra, transition: ov ? 'none' : vis ? `transform 820ms ${MORF}, opacity 320ms ${EASE}, border-color 400ms ${EASE} ${over ? 1000 : 0}ms, background-color 400ms ${EASE} ${over ? 1000 : 0}ms` : `opacity 600ms ${EASE}`, pointerEvents: 'none', willChange: 'transform, opacity' }} aria-hidden={!vis} data-testid="v4-felt" data-over={over ? '1' : '0'}>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2" style={{ height: 56, opacity: tom ? 1 : 0, transform: tom ? 'none' : 'translateY(4px)', transition: ov ? 'none' : tom ? `opacity 450ms ${EASE} 700ms, transform 650ms ${UT} 700ms` : `opacity 180ms ${EASE}, transform 180ms ${EASE}` }} aria-hidden={!tom}>
        <Opplastingsikon size={16} color={over ? 'rgba(122,63,168,0.8)' : 'rgba(21,19,15,0.5)'} />
        <p className="text-[13px] font-medium" style={{ color: over ? 'rgba(122,63,168,0.9)' : DIM, transition: `color 400ms ${EASE}` }}>Slipp fire bilder fra mobilen her</p>
      </div>
      {/* Slippunktet — pekerens mål (målt av usePeker) */}
      <span ref={slippRef} aria-hidden="true" className="absolute" style={{ left: '50%', top: '50%', width: 1, height: 1 }} />
    </div>
  );
}

/* Bunken pekeren holder — fire fanede miniatyrer, rett nedenfor spissen. Skjules i samme øyeblikk som flisene tar over. */
function HoldtBunke({ vis }) {
  return (
    <div className="absolute left-0 top-0" style={{ opacity: vis ? 1 : 0, transition: vis ? `opacity 200ms ${EASE}` : 'none' }} aria-hidden="true" data-testid="v4-holdt-bunke" data-vis={vis ? '1' : '0'}>
      {HAAND.map((id, k) => {
        const p = miniPos(k);
        return (
          <div key={id} className="absolute overflow-hidden" style={{ left: p.x, top: p.y, width: MINI_W, height: MINI_H, borderRadius: MINI_R, transform: `rotate(${FAN[k]}deg)`, transformOrigin: '50% 50%', boxShadow: '0 10px 24px -12px rgba(21,19,15,0.55), 0 0 0 1px rgba(255,255,255,0.7)', zIndex: k, background: 'rgba(21,19,15,0.05)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KILDE[id].liten || KILDE[id].src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: KILDE[id].posLiten || KILDE[id].pos || '50% 50%' }} draggable={false} />
          </div>
        );
      })}
    </div>
  );
}

function Aapning({ fase, L, ov, startet, slippRef, fra }) {
  const inne = useAapning(fase, startet);
  return (
    <>
      <AdresseScene fase={fase} L={L} ov={ov} inne={inne} />
      <Boligfakta fase={fase} L={L} ov={ov} />
      <FasadeLapp fase={fase} r={L.apn.funnet} ov={ov} />
      <Adresse fase={fase} L={L} ov={ov} />
      <Felt fase={fase} L={L} ov={ov} slippRef={slippRef} fra={fra} />
    </>
  );
}

/* ── Bildeflaten — bildene, nålene og før/etter-skillet ── */
function navnFor(fase) {
  if (fase >= F.BILDER && fase <= F.LES1) return 'Stue';
  if (fase === F.LES2) return 'Kjøkken';
  if (fase >= F.LES3 && fase <= F.STYLET) return 'Soverom';
  return null;
}
function viserBilde(fase) {
  if (fase === F.LES2) return 'kjokken';
  if (fase >= F.LES3) return 'soverom';
  return 'stue';
}

/* `myk` = åpningsnålen (Leilighet 2): lengre, mykere entré uten oversving — punktet vokser rolig fram (760 ms),
   ringen puster én gang, etiketten glir ut over 900 ms. Ellers (lesingen): punktet popper med en liten oversving
   idet leselinjen passerer, etiketten følger etter 240 ms. Kun transform/opacity — ingen filter under bevegelse. */
function Pinne({ x, y, t, vis, delay = 0, ov, skala = 1, kamera, tone, under, myk = false, barePunkt = false }) {
  const speil = x > 60;
  const forslag = tone === 'forslag' || tone === 'lilla';
  const dl = vis ? delay : 0;
  const punktAnim = myk ? `v4-pinne-punkt 760ms cubic-bezier(0.16, 1, 0.3, 1) ${dl}ms both` : `v4-pinne-punkt 520ms cubic-bezier(0.2, 0.9, 0.3, 1.25) ${dl}ms both`;
  const ringAnim = myk ? `v4-ping 1400ms cubic-bezier(0.2, 0.6, 0.2, 1) ${dl + 260}ms forwards` : `v4-ping 900ms cubic-bezier(0.2, 0.6, 0.2, 1) ${dl + 200}ms forwards`;
  const etikettD = myk ? dl + 320 : dl + 240;
  const etikettInn = myk ? `opacity 700ms ${EASE} ${etikettD}ms, transform 900ms ${EASE} ${etikettD}ms` : `opacity 460ms ${EASE} ${etikettD}ms, transform 560ms ${EASE} ${etikettD}ms`;
  return (
    <span className="pointer-events-none absolute z-[2]" style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${1 / skala})`, transformOrigin: '0 0', transition: kamera || 'none' }}>
      <span
        className="flex items-center gap-2"
        style={{ flexDirection: speil ? 'row-reverse' : 'row', transform: `translate(${speil ? 'calc(-100% + 6px)' : '-6px'}, -50%)`, opacity: vis ? 1 : 0, transition: ov ? 'none' : vis ? `opacity 0ms linear ${dl}ms` : `opacity ${myk ? 420 : 260}ms ${EASE}` }}
        aria-hidden={!vis}
        data-testid={`v4-pinne-${t}`}
      >
        <span key={vis ? 'inn' : 'ut'} className="relative h-3 w-3 shrink-0 rounded-full" style={{ background: forslag ? T.lilla : T.ink, boxShadow: '0 0 0 2.5px rgba(251,250,248,0.96), 0 2px 8px rgba(21,19,15,0.3)', animation: vis && !ov ? punktAnim : 'none', willChange: 'transform' }}>
          {vis && !ov && <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 1.5px rgba(251,250,248,0.9)', animation: ringAnim, opacity: 0 }} />}
        </span>
        {!barePunkt && (
          <span className={`whitespace-nowrap font-medium ${under ? 'rounded-[12px] px-3 py-1.5 text-left' : 'rounded-full px-2.5 py-1'} text-[12px]`} style={{ ...GLASS, color: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'translateX(0px)' : `translateX(${speil ? (myk ? 14 : 10) : (myk ? -14 : -10)}px)`, transition: ov ? 'none' : vis ? etikettInn : 'none', willChange: 'transform, opacity' }}>
            {t}
            {under && <span className="block text-[11px] font-medium" style={{ color: '#7A3FB0' }}>{under}</span>}
          </span>
        )}
      </span>
    </span>
  );
}

/* Fokusrammen — fire hjørner rundt det lesingen kjenner igjen. Kommer litt for stor idet linjen går inn i området,
   lander, holder mens etiketten glir ut, og slipper. Hvite streker med en tynn blekk-skygge under, så de leses både
   på hvit vegg og mørkt treverk. Kun transform/opacity. */
function Hjorne({ style, rot }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute" style={{ ...style, transform: `rotate(${rot}deg)` }}>
      <path d="M1.5 13V4A2.5 2.5 0 0 1 4 1.5h9" stroke="rgba(21,19,15,0.32)" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M1.5 13V4A2.5 2.5 0 0 1 4 1.5h9" stroke="rgba(251,250,248,0.98)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function Fokus({ omr, delay, ov }) {
  if (!omr || ov) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute z-[2]" style={{ left: `${omr.x}%`, top: `${omr.y}%`, width: `${omr.w}%`, height: `${omr.h}%`, animation: `v4-fokus 1500ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms both`, transformOrigin: '50% 50%', willChange: 'transform, opacity' }} data-testid="v4-fokus">
      {/* Gjenkjenningens lille lysning — flaten innenfor hjørnene lyser svakt opp idet rammen lander, og slipper */}
      <div className="absolute inset-0 rounded-[6px]" style={{ background: 'rgba(255,255,255,0.14)', opacity: 0, animation: `v4-lysning 1000ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay + 120}ms both` }} />
      <Hjorne style={{ left: -2, top: -2 }} rot={0} />
      <Hjorne style={{ right: -2, top: -2 }} rot={90} />
      <Hjorne style={{ right: -2, bottom: -2 }} rot={180} />
      <Hjorne style={{ left: -2, bottom: -2 }} rot={270} />
    </div>
  );
}

/* Leselinjen — går én gang over bildet. Til høyre for linjen: det uleste, svakt dempet. Rett bak linjen: et smalt
   lysbånd (det som nettopp ble lest). Alt i ett element som flyttes med transform. */
function Leselinje({ fase }) {
  return (
    <div key={`lese-${fase}`} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]" style={{ animation: `v4-lese ${SKANN_MS}ms ${LESE_EASE} ${SKANN_START}ms both, v4-lese-inn 320ms linear ${Math.max(0, SKANN_START - 320)}ms both`, willChange: 'transform, opacity' }} data-testid="v4-skann">
      <div className="absolute inset-0" style={{ background: 'rgba(21,19,15,0.13)' }} />
      <div className="absolute inset-y-0 right-full" style={{ width: '18%', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 58%, rgba(255,255,255,0.38) 100%)' }} />
      <span className="absolute inset-y-0 left-0 w-[1.5px]" style={{ transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.98)', boxShadow: '0 0 22px 3px rgba(255,255,255,0.6), 1px 0 0 rgba(21,19,15,0.2)' }} />
    </div>
  );
}

/* Leselappen — oppe til høyre mens bildet leses: en levende lilla prikk og «Leser bildet», så «3 detaljer» med hake
   når linjen har gått over. */
function LeseLapp({ fase, ov }) {
  const leser = fase >= F.LES1 && fase <= F.LES3;
  const [ferdig, setFerdig] = useState(false);
  useEffect(() => {
    setFerdig(false);
    if (!leser) return undefined;
    if (ov) { setFerdig(true); return undefined; }
    const t = window.setTimeout(() => setFerdig(true), SKANN_START + SKANN_MS + 120);
    return () => window.clearTimeout(t);
  }, [fase, leser, ov]);
  const rom = leser ? viserBilde(fase) : 'stue';
  const n = PINNER[rom].length;
  return (
    <Lapp vis={leser} className="right-2.5 top-2.5" ov={ov} testid="v4-lese-lapp">
      {ferdig ? (
        <span key="f" className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-300" data-testid="v4-lese-ferdig"><span style={{ color: '#166B3C' }}><Hake size={11} /></span>{n} detaljer</span>
      ) : (
        <span key="l" className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-300">
          <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }}>
            {!ov && <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 1px ${T.lilla}`, animation: 'v4-ping 1300ms cubic-bezier(0.2, 0.6, 0.2, 1) infinite', opacity: 0 }} />}
          </span>
          Leser bildet
        </span>
      )}
    </Lapp>
  );
}

/* Utvalget — en rolig ramme rundt sengen: dette, og bare dette, skal endres. */
function Utvalg({ fase, ov }) {
  const vis = fase === F.STYLE;
  const inn = fase >= F.STYLE;
  return (
    <div className="pointer-events-none absolute z-[3]" style={{ left: `${UTVALG.x}%`, top: `${UTVALG.y}%`, width: `${UTVALG.w}%`, height: `${UTVALG.h}%`, opacity: vis ? 1 : 0, transform: vis ? 'scale(1)' : inn ? 'scale(1.01)' : 'scale(1.03)', transition: ov ? 'none' : vis ? `opacity 600ms ${EASE} 500ms, transform 900ms ${EASE} 500ms` : `opacity 450ms ${EASE}, transform 450ms ${EASE}` }} aria-hidden={!vis} data-testid="v4-utvalg">
      <div className="absolute inset-0 rounded-[10px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(251,250,248,0.55), 0 0 0 9999px rgba(21,19,15,0.20)' }} />
      {/* Hjørnemarkører — slik et utvalg ser ut i moderne bilderedigering */}
      {[['left-[-2px] top-[-2px]', 'border-l-2 border-t-2 rounded-tl-[8px]'], ['right-[-2px] top-[-2px]', 'border-r-2 border-t-2 rounded-tr-[8px]'], ['left-[-2px] bottom-[-2px]', 'border-l-2 border-b-2 rounded-bl-[8px]'], ['right-[-2px] bottom-[-2px]', 'border-r-2 border-b-2 rounded-br-[8px]']].map(([pos, kant]) => (
        <span key={pos} aria-hidden="true" className={`absolute h-5 w-5 ${pos} ${kant}`} style={{ borderColor: 'rgba(251,250,248,0.98)', filter: 'drop-shadow(0 0 1.5px rgba(21,19,15,0.6)) drop-shadow(0 1px 2px rgba(21,19,15,0.35))' }} />
      ))}
      <span className="absolute left-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium" style={{ ...GLASS, color: T.ink }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Seng
      </span>
    </div>
  );
}

/* Instruksen — et stille kort øverst i bildet. Setningene kommer én og én, en tynn strek viser at arbeidet går. */
function Prompt({ fase, ov, liten = false }) {
  const vis = fase === F.STYLE;
  const ferdig = fase >= F.SKILLE && fase <= F.STYLET;
  return (
    <>
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-[5] flex justify-center ${liten ? 'px-2.5 pt-10' : 'px-4 pt-12'}`} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(-10px)', filter: vis ? 'blur(0px)' : BLUR_INN, transition: ov ? 'none' : vis ? `opacity 550ms ${EASE} 900ms, transform 650ms ${EASE} 900ms, filter 550ms ${EASE} 900ms` : `opacity 300ms ${EASE}, transform 300ms ${EASE}, filter 300ms ${EASE}` }} aria-hidden={!vis} data-testid="v4-prompt">
        <div className={`w-full rounded-[16px] ${liten ? 'max-w-full px-3.5 py-3' : 'max-w-[440px] px-4 py-3.5'}`} style={{ background: 'rgba(251,250,248,0.84)', backdropFilter: 'blur(14px) saturate(1.2)', WebkitBackdropFilter: 'blur(14px) saturate(1.2)', color: T.ink, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(21,19,15,0.06), 0 24px 60px -24px rgba(21,19,15,0.45)' }}>
          <div className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: DIM }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Instruks til stylingen</span>
            <span className="inline-flex items-center gap-2 font-medium" style={{ color: DIM }}>
              Arbeider
              <span className="relative block h-[2px] w-9 overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.10)' }}>
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: T.ink, width: vis ? '100%' : '0%', transition: ov || !vis ? 'none' : `width ${AUTO[F.STYLE] - 1300}ms linear 1200ms` }} />
              </span>
            </span>
          </div>
          <p className={`${liten ? 'mt-2 text-[13px] leading-[1.45]' : 'mt-2.5 text-[14.5px] leading-[1.5]'}`} style={{ color: 'rgba(21,19,15,0.86)' }}>
            {PROMPT.map((setning, i) => (
              <span key={setning} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity 520ms ${EASE} ${vis ? 1150 + i * 560 : 0}ms` }}>{setning}{i < PROMPT.length - 1 ? ' ' : ''}</span>
            ))}
          </p>
        </div>
      </div>
      <span className="pointer-events-none absolute right-2.5 top-2.5 z-[5] inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-[11.5px] font-medium" style={{ ...GLASS, color: T.ink, opacity: ferdig ? 1 : 0, transform: ferdig ? 'none' : 'translateY(-4px)', transition: ov ? 'none' : `opacity 400ms ${EASE} ${ferdig ? 350 : 0}ms, transform 400ms ${EASE} ${ferdig ? 350 : 0}ms` }} aria-hidden={!ferdig} data-testid="v4-prompt-ferdig">
        <span style={{ color: '#166B3C' }}><Hake size={11} /></span>Sengen er redd opp
      </span>
    </>
  );
}

function Bildeflate({ fase, ov, onHold, liten = false, pos: objPos = '50% 50%', testid = 'v4-bildeflate' }) {
  const naa = viserBilde(fase);
  const [manuell, setManuell] = useState(null);
  const boks = useRef(null);
  const drar = useRef(false);
  useEffect(() => { if (fase !== F.SKILLE) setManuell(null); }, [fase]);

  const posAuto = fase < F.SKILLE ? 100 : fase === F.SKILLE ? HVIL : 0;
  const pos = manuell != null ? manuell : posAuto;
  const dur = ov || manuell != null ? 0 : fase === F.SKILLE ? 1800 : 1500;
  const linje = fase === F.SKILLE;                 // synlig mens den hviler; glir ut til venstre og tones bort når stylingen er fullført
  const linjeOvergang = fase === F.STYLET ? `left ${dur}ms ${MORF}, opacity 500ms ${EASE} 1250ms` : `left ${dur}ms ${MORF}, opacity 400ms ${EASE}`;
  const kanDra = fase === F.SKILLE;
  const navn = navnFor(fase);
  const bildeStil = { objectPosition: objPos, transition: ov ? 'none' : `opacity 550ms ${EASE}, object-position 1100ms ${MORF}` };

  const oppdater = (e) => {
    const r = boks.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    setManuell(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  const ned = (e) => {
    if (!kanDra) return;
    e.preventDefault();
    drar.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onHold?.(true);
    oppdater(e);
  };
  const flytt = (e) => { if (drar.current) oppdater(e); };
  const opp = () => { if (!drar.current) return; drar.current = false; onHold?.(false); };

  const lag = [
    { id: 'stue', src: liten ? KILDE.stue.liten : KILDE.stue.src, alt: 'Stuen' },
    { id: 'kjokken', src: KILDE.kjokken.src, alt: 'Kjøkkenet' },
    { id: 'soverom', src: liten ? KILDE.soverom.liten : KILDE.soverom.src, alt: 'Soverommet, original' },
  ];

  return (
    <div ref={boks} className="absolute inset-0 select-none" data-testid={testid} data-pos={Math.round(pos)}>
      {/* Hvert bilde har sitt eget kamera: én rolig drift inn mens det leses. Nålene ligger i bildet og følger med
          (motskalert, så de holder størrelsen). Soverommets kamera går tilbake til ro før stylingen. */}
      {lag.map((b) => {
        const k = ov ? { transform: 'none', transition: 'none', skala: 1 } : kameraFor(b.id, fase);
        const aktiv = naa === b.id;
        return (
          <div key={b.id} className="absolute inset-0" style={{ opacity: aktiv ? 1 : 0, transition: ov ? 'none' : `opacity 600ms ${EASE}`, pointerEvents: aktiv ? 'auto' : 'none' }} aria-hidden={!aktiv} data-testid={`v4-lag-${b.id}`}>
            <div className="absolute inset-0" style={{ transform: k.transform, transformOrigin: '50% 50%', transition: k.transition, willChange: 'transform' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.alt} className="absolute inset-0 h-full w-full object-cover" style={bildeStil} draggable={false} data-testid={`v4-bilde-${b.id}`} />
              {b.id === 'soverom' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={liten ? KILDE.soverom.styletLiten : KILDE.soverom.stylet} alt="Soverommet, stylet med KI" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: objPos, clipPath: `inset(0 0 0 ${pos}%)`, transition: ov ? 'none' : `${dur ? `clip-path ${dur}ms ${MORF}, ` : ''}object-position 1100ms ${MORF}` }} draggable={false} data-testid="v4-bilde-stylet" />
              )}
              {/* Lesingen: linjen går én gang over bildet; fokusrammer og nåler kommer der den passerer.
                  På den lille flaten (mobil) står nålene uten etikett — ordene kommer som brikker rett over bildet. */}
              {fase === KILDE[b.id].les && !ov && <Leselinje fase={fase} />}
              {fase === KILDE[b.id].les && PINNER[b.id].map((p) => <Fokus key={`f-${p.id}`} omr={p.omr} delay={fokusTid(p)} ov={ov} />)}
              {PINNER[b.id].map((p) => (
                <Pinne key={p.id} x={p.x} y={p.y} t={p.t} tone={p.tone} under={p.under} vis={fase === KILDE[b.id].les} delay={leseTid(p.x)} ov={ov} skala={k.skala} kamera={k.transition} barePunkt={liten} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Styling: utvalget rundt sengen og instruksen — så går skillet */}
      <Utvalg fase={fase} ov={ov} />
      <Prompt fase={fase} ov={ov} liten={liten} />

      {/* Skillelinjen */}
      <div className="absolute inset-y-0 z-[3]" style={{ left: `${pos}%`, width: 0, opacity: linje ? 1 : 0, transition: ov ? 'none' : linjeOvergang }} aria-hidden={!linje} data-testid="v4-skille">
        <span className="absolute inset-y-0 left-[-1px] w-[2px]" style={{ background: 'rgba(251,250,248,0.96)', boxShadow: '0 0 0 0.5px rgba(21,19,15,0.10), 0 0 18px rgba(21,19,15,0.28)' }} />
        <button
          type="button"
          role="slider"
          aria-label="Sammenlign original og stylet"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          tabIndex={kanDra ? 0 : -1}
          onPointerDown={ned}
          onPointerMove={flytt}
          onPointerUp={opp}
          onPointerCancel={opp}
          className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
          style={{ background: PAPIR, color: T.ink, boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 8px 24px -8px rgba(21,19,15,0.45)', cursor: kanDra ? 'ew-resize' : 'default', touchAction: 'none' }}
          data-testid="v4-skille-hand"
        >
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M6 1.5L2 6l4 4.5M12 1.5L16 6l-4 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* Lapper */}
      <Lapp vis={!!navn} delay={fase === F.BILDER ? 1000 : 0} className="left-2.5 top-2.5" ov={ov}><span key={navn} className="animate-in fade-in-0 duration-300">{navn}</span></Lapp>
      <LeseLapp fase={fase} ov={ov} />
      <Lapp vis={fase === F.SKILLE && pos > 14} className="bottom-2.5 left-2.5" ov={ov} testid="v4-original-merke">Original</Lapp>
      <Lapp vis={fase >= F.SKILLE && fase <= F.PUBLISERT && pos < 86} className="bottom-2.5 right-2.5" delay={500} ov={ov} testid="v4-ki-merke">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
        <span key={fase >= F.STYLET ? 'r' : 's'} className="animate-in fade-in-0 duration-300">{fase >= F.STYLET ? 'Redigert med KI' : 'Redigert'}</span>
      </Lapp>
    </div>
  );
}

/* ── Brikkene — det som hentes ut ── */
function Brikke({ tekst, vis, delay = 0, ov, kilde, tone }) {
  const forslag = tone === 'forslag';
  return (
    <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium" style={{ background: forslag ? 'rgba(212,150,255,0.22)' : kilde ? 'transparent' : 'rgba(21,19,15,0.06)', boxShadow: kilde ? `inset 0 0 0 1px ${HAIR}` : 'none', color: forslag ? T.ink : 'rgba(21,19,15,0.82)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', filter: vis ? 'blur(0px)' : 'blur(4px)', transition: ov ? 'none' : `opacity 420ms ${EASE} ${vis ? delay : 0}ms, transform 420ms ${EASE} ${vis ? delay : 0}ms, filter 420ms ${EASE} ${vis ? delay : 0}ms` }} aria-hidden={!vis}>{forslag && <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />}{tekst}</span>
  );
}

function Fakta({ fase, ov }) {
  const delay = FAKTA.map((x) => leseTid(pinAv(x.fra, x.pin).x) + 300);
  const overskrift = fase >= F.LES3 ? 'Fra bildene · og ett forslag' : 'Fra bildene';
  return (
    <div data-testid="v4-fakta">
      <p className="text-[12px]" style={{ color: DIM }}><span key={overskrift} className="animate-in fade-in-0 duration-300">{overskrift}</span></p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FAKTA.map((x, i) => <Brikke key={x.t} tekst={x.t} vis={fase >= x.fra} delay={fase === x.fra ? delay[i] : 0} ov={ov} tone={x.tone} />)}
      </div>
    </div>
  );
}

/* ── Utkastet ── */
function UtkastTekst({ fase, ov, stor = false }) {
  return (
    <div data-testid="v4-utkast">
      <Inn vis={fase >= F.TITTEL} ov={ov}>
        <p className="text-[12.5px]" style={{ color: DIM }}>Utkast · skrevet fra boligen · <span style={{ textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>stiplet</span> = fra bildene</p>
        <h4 className={stor ? 'mt-2.5 text-[clamp(22px,2vw,30px)]' : 'mt-2 text-[20px]'} style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.08 }} data-testid="v4-annonse-tittel">{ANNONSE.tittel}</h4>
        <p className={stor ? 'mt-2 text-[14.5px]' : 'mt-1.5 text-[13px]'} style={{ color: DIM }} data-testid="v4-annonse-spes">{ANNONSE.spes}</p>
      </Inn>
      <Inn vis={fase >= F.TEKST} ov={ov} className={stor ? 'mt-4' : 'mt-3'}>
        <p className={`${stor ? 'max-w-[64ch] text-[15px] leading-[1.55]' : 'text-[13.5px] leading-[1.5]'} text-[#15130F]/78`} data-testid="v4-annonse-tekst"><Brodtekst /></p>
      </Inn>
      <Inn vis={fase >= F.PRIS} ov={ov} className={stor ? 'mt-4' : 'mt-3'}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t pt-3 text-[13px]" style={{ borderColor: HAIR, color: DIM }}>
          <span className="text-[20px] font-medium tracking-[-0.01em] text-[#15130F]"><span className="tabular-nums">{tall(12500)}</span> kr <span className="text-[13px] font-normal" style={{ color: DIM }}>/mnd</span></span>
          <span>Depositum 3 mnd</span>
          <span>Forslag · forrige leie {tall(12000)} kr</span>
        </div>
      </Inn>
    </div>
  );
}

/* ── FINN-siden — slik boligsøkerne ser annonsen (hvit topplinje som på finn.no) ── */
function FinnTopp({ h, kompakt = false }) {
  const dim = { color: 'rgba(27,27,31,0.62)' };
  return (
    <div className="flex items-center justify-between gap-4 border-b px-5" style={{ height: h, background: HVIT, borderColor: 'rgba(27,27,31,0.08)' }}>
      <Finn h={kompakt ? 20 : 24} />
      {!kompakt && (
        <span className="flex h-8 max-w-[300px] flex-1 items-center gap-2 rounded-full px-3.5 text-[12.5px]" style={{ background: '#F1F2F4', color: 'rgba(27,27,31,0.55)' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.5" /><path d="M9.2 9.2L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Søk i Bolig til leie
        </span>
      )}
      <span className="text-[12.5px]" style={dim}>Varsler · Meldinger · Logg inn</span>
    </div>
  );
}

function FinnTekst({ kompakt = false }) {
  const dim = { color: 'rgba(27,27,31,0.58)' };
  return (
    <div className="flex h-full flex-col" style={{ color: '#1B1B1F' }} data-testid="v4-finn-tekst">
      <p className="text-[12.5px]" style={dim}>Nygårdsgaten 5, Bergen</p>
      <h4 className={`mt-1 font-semibold leading-[1.25] tracking-[-0.012em] ${kompakt ? 'text-[16.5px]' : 'text-[18px]'}`}>{ANNONSE.tittel}</h4>
      <p className="mt-2.5 text-[22px] font-semibold tracking-[-0.012em]"><span className="tabular-nums">{tall(12500)}</span> kr <span className="text-[13px] font-normal" style={dim}>per måned</span></p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
        {[['Primærrom', '54 m²'], ['Soverom', '1'], ['Etasje', '2'], ['Ledig fra', '1. november']].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b pb-1" style={{ borderColor: 'rgba(27,27,31,0.08)' }}>
            <dt style={dim}>{k}</dt><dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className={`flex items-center gap-3 ${kompakt ? 'mt-4' : 'mt-auto pt-4'}`}>
        <span className="inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-semibold" style={{ background: '#0063fc', color: HVIT }}>Send melding</span>
        <span className="text-[12.5px]" style={dim}>Publisert i dag 18:02</span>
      </div>
    </div>
  );
}

function FinnBeskrivelse({ kompakt = false }) {
  const dim = { color: 'rgba(27,27,31,0.62)' };
  return (
    <div className="border-t pt-4" style={{ borderColor: 'rgba(27,27,31,0.08)', color: '#1B1B1F' }} data-testid="v4-finn-beskrivelse">
      <p className="text-[14px] font-semibold">Beskrivelse</p>
      <p className={`mt-1.5 ${kompakt ? 'text-[13px]' : 'max-w-[78ch] text-[13.5px]'} leading-[1.55]`} style={dim}>{BRODTEKST_REN}</p>
      <p className="mt-3 text-[12.5px]" style={dim}>Annonsør: Kari Nilsen · via DigiHome</p>
    </div>
  );
}

/* ── Interessentene, visningene, SMS-ene, kontrakten ── */
function Rad({ p, fase, kompakt }) {
  const chip = p.chip(fase);
  const dok = p.dok(fase);
  return (
    <div className={`grid items-center gap-3 border-t ${kompakt ? 'grid-cols-[34px_minmax(0,1fr)] py-3' : 'grid-cols-[40px_minmax(0,1fr)_auto] py-3.5'}`} style={{ borderColor: HAIR }}>
      <Portrett src={p.bilde} alt={p.n} size={kompakt ? 34 : 40} />
      <span className="min-w-0">
        <span className={`flex items-center gap-2.5 ${kompakt ? 'text-[14.5px]' : 'text-[15.5px]'} font-medium`}>
          {p.n}
        </span>
        <span className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 ${kompakt ? 'text-[12.5px]' : 'text-[13px]'} text-[#15130F]/55`}>
          {dok.length > 0 && <Dok liste={dok} />}
          <span key={p.d(fase)} className="min-w-0 truncate animate-in fade-in-0 duration-300">{p.d(fase)}</span>
        </span>
        {kompakt && chip && <span className="mt-1.5 block"><Chip tekst={chip[0]} tone={chip[1]} liten /></span>}
      </span>
      {!kompakt && <span className="inline-flex min-w-[110px] justify-end">{chip ? <Chip tekst={chip[0]} tone={chip[1]} /> : null}</span>}
    </div>
  );
}

function Liste({ fase, ov, kompakt = false, dempet = false }) {
  const dag = fase >= F.ETTER ? 'Dag 6 · visninger gjennomført' : fase >= F.BOOK2 ? 'Dag 3' : fase >= F.INT2 ? 'Dag 2' : 'Dag 1';
  return (
    <div style={{ opacity: dempet ? 0.38 : 1, transition: ov ? 'none' : `opacity 700ms ${EASE}` }} data-testid="v4-interessenter">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#15130F]/60">Interessenter <span className="font-normal" style={{ color: DIM }}>· via</span> <Finn h={13} /></span>
        <span key={dag} className="animate-in fade-in-0 duration-300" style={{ color: DIM }}>{dag}</span>
      </div>
      <ol className="mt-2">
        {FOLK.map((p) => (
          <li key={p.n}><Vokse vis={fase >= p.fra} ov={ov}><Rad p={p} fase={fase} kompakt={kompakt} /></Vokse></li>
        ))}
      </ol>
    </div>
  );
}

function VisningKort({ fase, ov }) {
  const ferdig = fase >= F.ETTER;
  return (
    <div className="rounded-[14px] p-4" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4-visning">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[#15130F]/60">Visning · tirsdag</span>
        <span key={ferdig ? 'f' : 'l'} className="animate-in fade-in-0 duration-300" style={{ color: ferdig ? '#166B3C' : DIM }}>{ferdig ? 'Gjennomført' : 'Interessentene velger selv'}</span>
      </div>
      <ol className="mt-2">
        {SLOTS.map((s) => {
          const tatt = s.hvem && fase >= s.fra;
          const p = s.hvem ? HVEM[s.hvem] : null;
          return (
            <li key={s.t} className="flex items-center justify-between gap-3 border-t py-2.5 text-[13.5px]" style={{ borderColor: HAIR }}>
              <span className="tabular-nums font-medium">{s.t}</span>
              <span className="grid justify-items-end">
                <span className="col-start-1 row-start-1 text-[13px]" style={{ color: DIM, opacity: tatt ? 0 : 1, transition: ov ? 'none' : `opacity 300ms ${EASE}` }}>Ledig</span>
                <span className="col-start-1 row-start-1 inline-flex items-center gap-2 text-[13px]" style={{ opacity: tatt ? 1 : 0, transform: tatt ? 'none' : 'translateY(4px)', transition: ov ? 'none' : `opacity 400ms ${EASE} 120ms, transform 400ms ${EASE} 120ms` }} aria-hidden={!tatt}>
                  {p && <Portrett src={p.bilde} alt="" size={20} />}{p ? p.n : ''}<span style={{ color: ferdig ? '#166B3C' : DIM }}><Hake size={12} /></span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SmsBoble({ s, fase, ov }) {
  return <Sms vis={fase >= s.fra && fase <= s.tilOg} til={s.til} tid={s.tid} tekst={s.tekst} ov={ov} delay={fase === s.fra ? 500 : 150} testid={`v4-sms-${s.id}`} />;
}

/* Emma-kortet — sluttbildet og overleveringsobjektet til neste kapittel (Kontrakt åpner med nøyaktig dette). */

/* Broen til neste kapittel — stille linje som fylles mens sluttbildet står, så glir tab-markøren videre. */

/* Hele akt 6–7 i scenen: liste til venstre, visning + SMS til høyre (stablet når smalt). Ved «Valgt» folder
   visningskortet seg sammen og SMS-en til Emma vokser inn. */
function Leietakere({ fase, ov, smal = false, kompakt = false }) {
  return (
    <div className={`flex ${smal ? 'flex-col gap-6' : 'flex-row gap-8'}`} data-testid="v4-leietakere">
      <div className="min-w-0 flex-1"><Liste fase={fase} ov={ov} kompakt={kompakt} /></div>
      <div className={smal ? 'w-full' : 'w-[300px] shrink-0'}>
        <Vokse vis={fase < F.VALGT} ov={ov} delay={0}><VisningKort fase={fase} ov={ov} /></Vokse>
        {SMS.map((s) => <SmsBoble key={s.id} s={s} fase={fase} ov={ov} kompakt={kompakt} />)}
      </div>
    </div>
  );
}


/* ── Desktop: layout ── */
function layout(W) {
  const TW = Math.round(Math.min(380, Math.max(300, W * 0.3)));
  const vx = P + TW + 48; const vy = P; const VW = W - vx - P; const VH = H - 2 * P;
  const hel = { x: 0, y: 0, w: W, h: H };
  /* Tekstspalten starter et stykke ned — leser som sentrert mot scenen, og står stille mellom aktene */
  const tekst = { x: P, y: P + 96, w: TW };
  const omr = { x: vx, y: vy, w: VW, h: VH };
  /* Mosaikk: ett stort + fire små */
  const gap = 10;
  const bw = Math.round((VW - gap) * 0.6); const bh = Math.round(bw / 1.5);
  const sw = VW - bw - gap; const cw = Math.round((sw - gap) / 2); const ch = Math.round(cw / 1.5);
  const mh = Math.max(bh, ch * 2 + gap); const my = vy + Math.round((VH - mh) / 2);
  const mosaikk = {
    stor: { x: vx, y: my + Math.round((mh - bh) / 2), w: bw, h: bh },
    smaa: [0, 1, 2, 3].map((i) => ({ x: vx + bw + gap + (i % 2) * (cw + gap), y: my + Math.round((mh - (ch * 2 + gap)) / 2) + Math.floor(i / 2) * (ch + gap), w: cw, h: ch })),
  };
  /* Bunken: bildene lander løst midt i scenen før de sorterer seg ut i mosaikken */
  const sbw = Math.round(Math.min(VW * 0.5, VH * 0.95)); const sbh = Math.round(sbw / 1.5);
  const stabel = { x: vx + Math.round((VW - sbw) / 2), y: vy + Math.round((VH - sbh) / 2) + 8, w: sbw, h: sbh };
  /* Stort: fyller scenen i 3:2 */
  const gw = Math.min(VW, Math.round(VH * 1.5)); const gh = Math.round(gw / 1.5);
  const stor = { x: vx + Math.round((VW - gw) / 2), y: vy + Math.round((VH - gh) / 2), w: gw, h: gh };
  /* Utkast: banner øverst i kortet */
  const banner = { x: vx, y: vy, w: VW, h: Math.round(VH * 0.47) };
  /* FINN: topplinje, bildet til venstre, teksten til høyre, beskrivelse under */
  const topp = 48; const ip = 20;
  const fw = Math.round((VW - 2 * ip) * 0.52); const fh = Math.round(fw / 1.5);
  const finnBilde = { x: vx + ip, y: vy + topp + 24, w: fw, h: fh };
  const finnTekst = { x: vx + ip + fw + 24, y: finnBilde.y, w: VW - 2 * ip - fw - 24, h: fh };
  const finnBeskrivelse = { x: vx + ip, y: finnBilde.y + fh + 26, w: VW - 2 * ip };
  /* Åpningen: samme grid som resten av filmen — tekstspalten til venstre, scenen til høyre. Adressefeltet står midt i
     scenen mens det skrives, og glir opp til toppen av «boligarket» når boligen er funnet: fasaden (3:2) til venstre,
     faktaene til høyre, kantene på linje med feltet. Kontekstlinjen (adressen) øverst til høyre fra trykket. */
  const hode = { y: 24 };
  const SW = Math.min(760, VW); const sx = vx + Math.round((VW - SW) / 2);
  const bildeW = Math.round(SW * 0.55); const bildeH = Math.round(bildeW / 1.5);
  const sy = vy + Math.round((VH - (FELT_H + 24 + bildeH)) / 2);
  const feltRest = { x: sx, y: sy, w: SW, h: FELT_H };
  const feltDy = (vy + Math.round((VH - FELT_H) / 2)) - sy;
  const funnet = { x: sx, y: sy + FELT_H + 24, w: bildeW, h: bildeH };
  const fakta = { x: sx + bildeW + 28, y: funnet.y, w: SW - bildeW - 28 };
  const apn = { felt: feltRest, feltDy, funnet, fakta, radH: 58 };
  /* Opplastingsfeltet rundt bunken i scenen — litt mer luft nederst til linjen om bildene fra mobilen */
  const felt = { x: stabel.x - 30, y: stabel.y - 30, w: stabel.w + 60, h: stabel.h + 30 + 64 };
  return { hel, tekst, omr, mosaikk, stabel, stor, banner, finnBilde, finnTekst, finnBeskrivelse, topp, hode, apn, felt, smal: VW < 660 };
}

function fotoRekt(L, f) {
  if (f <= F.BUNKE) return L.stabel;
  if (f <= F.BILDER) return L.mosaikk.stor;
  if (f <= F.STYLET) return L.stor;
  if (f <= F.TRYKK) return L.banner;
  return L.finnBilde;
}

/* Bunken: hvert bilde har sin egen skjeve landing (grader og små forskyvninger). Rekkefølgen er landingsrekkefølgen. */
const BUNKE = {
  fasade: { rot: -5, dx: -12, dy: 10, delay: 0 },
  kjokken: { rot: 4, dx: 14, dy: -8, delay: 480 },
  soverom: { rot: -2.5, dx: -6, dy: -12, delay: 660 },
  spisestue: { rot: 6, dx: 16, dy: 12, delay: 840 },
  stue: { rot: 1.5, dx: 0, dy: 0, delay: 1020 },
};
const LANDING = 'cubic-bezier(0.22, 1.08, 0.36, 1)';   // litt overshoot — kortet «setter seg»
const SKYGGE_LOFT = `0 22px 40px -24px rgba(21,19,15,0.45), 0 0 0 1px rgba(21,19,15,0.06), ${LYSKANT}`;
const SKYGGE_FLAT = `0 0 0 1px ${HAIR}, ${LYSKANT}`;

/* Ytelse — regelen for hele åpningen: alt som beveger seg, beveger seg KUN med transform og opacity.
   Hver flis har en fast basisflate = den store 3:2-flaten, og glir med translate/rotate/scale:
   i den holdte bunken (miniatyr, usynlig — pekeren viser sin egen) → spretter ut i bunken (SLIPP) → mosaikken (BILDER).
   Ingen animert left/top/width/height, ingen animert blur. */
function bunkeTransform({ id, fase, L, ov, base = L.stor }) {
  const k = OPPTAK.indexOf(id); const bk = BUNKE[id]; const h = Math.max(0, HAAND.indexOf(id));
  const til = (r, skala = 1) => {
    const sc = (r.w / base.w) * skala;
    const dx = (r.x + r.w / 2) - (base.x + base.w / 2); const dy = (r.y + r.h / 2) - (base.y + base.h / 2);
    return { dx, dy, sc };
  };
  const tr = (kk, rot = 0) => `translate(${kk.dx}px, ${kk.dy}px) rotate(${rot}deg) scale(${kk.sc})`;
  let transform; let overgang = 'none'; let radius = 0; let zi = 1; let skygge = 'none'; let op = 0;
  const bunke = til(L.stabel, 0.92);
  if (id === 'fasade' && fase < F.SLIPP) {
    /* Fasaden er funnet fra adressen: står stor til venstre i åpningen (FUNNET → TRYKK_START), glir så ned i
       opplastingsfeltet som det første bildet i bunken (FELT →). Samme piksler hele veien. */
    const kk = til(L.apn.funnet);
    if (fase < F.FUNNET) {
      transform = tr({ ...kk, sc: kk.sc * 0.96 }); radius = `${12 / kk.sc}px`; op = 0; zi = 3; skygge = SKYGGE_FLAT; overgang = 'none';
    } else if (fase <= F.TRYKK_START) {
      const d = fase === F.FUNNET ? 380 : 0;
      transform = tr(kk); radius = `${12 / kk.sc}px`; op = 1; zi = 3; skygge = SKYGGE_FLAT;
      overgang = ov ? 'none' : `opacity 700ms ${EASE} ${d}ms, transform 900ms ${UT} ${d}ms`;
    } else {
      transform = tr({ dx: bunke.dx + bk.dx, dy: bunke.dy + bk.dy, sc: bunke.sc }, bk.rot);
      radius = `${10 / bunke.sc}px`; op = 1; zi = 10; skygge = SKYGGE_LOFT;
      overgang = ov ? 'none' : `transform 1000ms ${MORF} 140ms, border-radius 1000ms ${MORF} 140ms, box-shadow 600ms ${EASE} 140ms`;
    }
  } else if (fase < F.SLIPP) {
    /* I pekerens hånd: samme geometri som miniatyrene i HoldtBunke (pekerens spiss står i feltets midte = bunkens midte) */
    const m = miniPos(h); const sc = MINI_W / base.w;
    transform = tr({ dx: bunke.dx + m.x + MINI_W / 2, dy: bunke.dy + m.y + MINI_H / 2, sc }, FAN[h]);
    radius = `${MINI_R / sc}px`; op = 0; zi = 10 + k; skygge = SKYGGE_LOFT;
    overgang = 'none';
  } else if (fase <= F.BUNKE) {
    /* Sluppet: spretter ut fra hånden til sin plass i bunken — løst, skjevt, med løftet skygge. Fasaden ligger der alt. */
    transform = tr({ dx: bunke.dx + bk.dx, dy: bunke.dy + bk.dy, sc: bunke.sc }, bk.rot);
    radius = `${10 / bunke.sc}px`; op = 1; zi = 10 + k; skygge = SKYGGE_LOFT;
    overgang = ov || id === 'fasade' ? 'none' : `transform 900ms ${LANDING} ${h * 55}ms, border-radius 900ms ${LANDING} ${h * 55}ms, opacity 0ms`;
  } else if (fase === F.BILDER) {
    const kk = til(SLOT[id](L));
    transform = tr(kk); radius = `${10 / kk.sc}px`; op = 1; zi = LAG[id]; skygge = SKYGGE_FLAT;
    overgang = ov ? 'none' : `transform 900ms ${MORF} ${k * 40}ms, border-radius 900ms ${MORF} ${k * 40}ms, box-shadow 600ms ${EASE}`;
  } else {
    const kk = til(SLOT[id](L), 0.94);
    transform = tr(kk); radius = `${10 / kk.sc}px`; op = 0; zi = LAG[id]; skygge = SKYGGE_FLAT;
    overgang = ov ? 'none' : `opacity 480ms ${EASE} ${k * 40}ms, transform 600ms ${EASE} ${k * 40}ms`;
  }
  return {
    left: base.x, top: base.y, width: base.w, height: base.h,
    transform, transformOrigin: '50% 50%', borderRadius: radius,
    opacity: op, boxShadow: skygge, background: 'rgba(21,19,15,0.05)', transition: overgang, zIndex: zi,
    willChange: 'transform, opacity',
  };
}

/* Romnavn på flisen — kommer etter at bunken har sortert seg */
function Romlapp({ navn, vis, delay, ov }) {
  return <Lapp vis={vis} delay={delay} ov={ov} className="left-2.5 top-2.5">{navn}</Lapp>;
}

/* Mosaikkplass og lag per bilde */
const SLOT = { stue: (L) => L.mosaikk.stor, kjokken: (L) => L.mosaikk.smaa[0], soverom: (L) => L.mosaikk.smaa[1], spisestue: (L) => L.mosaikk.smaa[2], fasade: (L) => L.mosaikk.smaa[3] };
const LAG = { stue: 6, kjokken: 2, soverom: 3, spisestue: 4, fasade: 1 };

/* Åpningskoreografien (kameraets driv, nålen på Leilighet 2, papirtoningen) starter først når filmen faktisk spiller
   (`startet`) — ikke ved montering. Ellers står nålen allerede på plass når man ruller ned til rammen. Nullstilles
   hver gang filmen går tilbake til START (loop). */
function useAapning(fase, startet) {
  const [inne, setInne] = useState(false);
  useEffect(() => {
    if (fase !== F.START) return undefined;
    setInne(false);
    if (!startet) return undefined;
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setInne(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [fase, startet]);
  return inne;
}

/* Ett bilde i opplastingen: venter usynlig i pekerens hånd, spretter ut i bunken når den slippes (SLIPP), sorterer seg
   i mosaikken (BILDER). Fasaden er unntaket: den kommer fra adressen og står i åpningen fra FUNNET. Stua tar det store
   bildet (Foto) over fra ved LES1 — samme piksler. */
function Flis({ id, fase, L, ov }) {
  const b = KILDE[id];
  const inne = (id === 'fasade' ? fase >= F.FUNNET : fase >= F.SLIPP) && fase <= F.BILDER;
  const st = bunkeTransform({ id, fase, L, ov });
  if (id === 'stue' && fase > F.BILDER) { st.transition = 'none'; st.opacity = 0; }
  return (
    <div className="absolute overflow-hidden" style={st} aria-hidden={!inne} data-testid={`v4-mosaikk-${id}`} data-landet={inne ? '1' : '0'}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.src} alt={b.navn} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
    </div>
  );
}


/* Det store bildet — fra LES1: leses og styles, så banner i utkastet, så bildet på FINN-siden.
   Før LES1 ligger det usynlig på mosaikkens store plass (uten overgang), så det kan ta over sømløst fra flisen. */
function Foto({ fase, L, ov, onHold }) {
  const foer = fase <= F.BILDER;
  const r = foer ? L.mosaikk.stor : fotoRekt(L, fase);
  const inne = fase >= F.LES1 && fase <= F.PUBLISERT;
  const stor = fase >= F.LES1 && fase <= F.STYLET;
  const banner = fase >= F.TITTEL && fase <= F.TRYKK;
  const finn = fase === F.PUBLISERT;
  const t = (p, ms, d = 0) => `${p} ${ms}ms ${EASE} ${d}ms`;
  const m = (p, ms, d = 0) => `${p} ${ms}ms ${MORF} ${d}ms`;
  const overgang = ov || foer ? 'none' : [m('left', 1100), m('top', 1100), m('width', 1100), m('height', 1100), fase === F.LES1 ? 'opacity 0ms linear' : t('opacity', 500), t('box-shadow', 700), t('border-radius', 800)].join(', ');
  return (
    <div
      className="absolute overflow-hidden"
      style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: banner ? '14px 14px 0 0' : finn || foer ? 10 : 14, opacity: inne ? 1 : 0, background: 'rgba(21,19,15,0.05)', boxShadow: stor ? '0 40px 90px -40px rgba(21,19,15,0.45)' : banner || finn ? 'none' : SKYGGE_FLAT, transition: overgang, zIndex: 2, transform: 'rotate(0deg)' }}
      aria-hidden={!inne}
      data-testid="v4-foto"
      data-bilde={fase >= F.STYLET ? 'stylet' : viserBilde(fase)}
    >
      {fase >= F.LES1 || fase === F.BILDER ? <Bildeflate fase={fase} ov={ov} onHold={onHold} pos={banner ? '50% 55%' : '50% 50%'} /> : null}
    </div>
  );
}

/* Romnavnene på flisene — eget lag utenfor flisene, så de ikke skaleres med dem. Stuen får sin fra Foto fra LES1. */
function Romlapper({ fase, L, ov }) {
  const vis = fase === F.BILDER;
  const lapper = [
    { id: 'stue', r: L.mosaikk.stor, delay: 1000 },
    ...SMAA.map((id, i) => ({ id, r: L.mosaikk.smaa[i], delay: 1000 + (i + 1) * 110 })),
  ];
  return lapper.map(({ id, r, delay }) => (
    <div key={id} className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 6, pointerEvents: 'none', transition: 'none' }}>
      <Romlapp navn={KILDE[id].navn} vis={vis} delay={delay} ov={ov || (id === 'stue' && fase > F.BILDER)} />
    </div>
  ));
}

/* Telleren — «5 bilder · rom gjenkjent» når bildene har sortert seg. Kun opacity/transform. */
function Teller({ fase, L, ov }) {
  const vis = fase === F.BILDER;
  return (
    <div className="absolute z-[7]" style={{ left: L.omr.x, top: L.omr.y + L.omr.h - 32, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: ov ? 'none' : `opacity 400ms ${EASE} ${vis ? 900 : 0}ms, transform 400ms ${EASE} ${vis ? 900 : 0}ms`, willChange: 'transform, opacity' }} aria-hidden={!vis} data-testid="v4-teller" data-n={vis ? 5 : 0}>
      <div className="inline-flex h-8 items-center gap-2.5 rounded-full pl-3 pr-3.5 text-[12.5px] font-medium" style={{ background: 'rgba(251,250,248,0.98)', boxShadow: `inset 0 0 0 1px ${HAIR}, 0 6px 20px -10px rgba(21,19,15,0.3)`, color: T.ink }}>
        <span style={{ color: '#166B3C' }}><Hake size={13} /></span>
        <span>5 bilder · 4 rom + fasade</span>
      </div>
    </div>
  );
}

/* Kortet — utkastet som blir FINN-siden */
function KortLag({ fase, L, ov }) {
  const utkast = fase >= F.TITTEL && fase <= F.TRYKK;
  const finn = fase === F.PUBLISERT;
  const vis = utkast || finn;
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);
  const o = L.omr;
  return (
    <div className="absolute overflow-hidden rounded-[14px]" style={{ left: o.x, top: o.y, width: o.w, height: o.h, background: HVIT, boxShadow: `0 0 0 1px ${HAIR}, 0 30px 80px -50px rgba(21,19,15,0.35)`, opacity: vis ? 1 : 0, transition: `opacity ${bt(500)}`, zIndex: 1 }} aria-hidden={!vis} data-testid="v4-kort" data-finn={finn ? '1' : '0'}>
      <div className="absolute inset-x-0 top-0" style={{ transform: finn ? 'none' : 'translateY(-100%)', transition: `transform ${bt(650)}` }}>
        <FinnTopp h={L.topp} />
      </div>
      <div className="absolute" style={{ left: 28, right: 28, top: L.banner.h + 26, opacity: utkast ? 1 : 0, transition: `opacity ${bt(utkast ? 400 : 200)}` }} aria-hidden={!utkast}>
        <UtkastTekst fase={fase} ov={ov} stor />
      </div>
      <div className="absolute" style={{ left: L.finnTekst.x - o.x, top: L.finnTekst.y - o.y, width: L.finnTekst.w, height: L.finnTekst.h, opacity: finn ? 1 : 0, transition: `opacity ${bt(500, finn ? 500 : 0)}` }} aria-hidden={!finn}>
        <FinnTekst />
      </div>
      <div className="absolute" style={{ left: L.finnBeskrivelse.x - o.x, top: L.finnBeskrivelse.y - o.y, width: L.finnBeskrivelse.w, opacity: finn ? 1 : 0, transition: `opacity ${bt(500, finn ? 700 : 0)}` }} aria-hidden={!finn}>
        <FinnBeskrivelse />
      </div>
    </div>
  );
}

/* Tekstspalten — én setning per akt, brikker, handling, fremdrift */
function Handling({ fase, ov, knapper, neste }) {
  const start = fase >= F.FUNNET && fase <= F.TRYKK_START;
  const publiser = fase >= F.KLAR && fase <= F.PUBLISERT;
  const velg = fase >= F.ETTER && fase < F.SLUTT;
  const hoverS = fase === F.HOVER || fase === F.TRYKK_START;
  const hoverP = fase === F.KLAR || fase === F.TRYKK;
  const hoverV = fase === F.ETTER || fase === F.VELG_LEIETAKER;
  const ref = (navn) => (el) => { if (knapper) knapper.current[navn] = el; };
  return (
    <div className="grid">
      {/* «Lag annonse» — kommer når boligen er kjent (etter faktaene), løftes av pekeren, trykkes, og slipper idet
          opplastingsfeltet vokser ut av den i scenen */}
      <Inn vis={start} ov={ov} delay={fase === F.FUNNET ? 1600 : 0} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.TRYKK_START} hover={hoverS && !!knapper} stor testid="v4-lag-annonse" knappRef={ref('start')}>Lag annonse</AutoKnapp>
      </Inn>
      <Inn vis={fase >= F.LES1 && fase <= F.LES3} ov={ov} className="col-start-1 row-start-1"><Fakta fase={fase} ov={ov} /></Inn>
      <Inn vis={publiser} ov={ov} delay={200} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.TRYKK} hover={hoverP && !!knapper} trykket={fase >= F.PUBLISERT} etter="Publisert på FINN.no" testid="v4-publiser" stor knappRef={ref('publiser')}>Publiser på <Finn h={18} /></AutoKnapp>
      </Inn>
      <Inn vis={velg} ov={ov} delay={200} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.VELG_LEIETAKER} hover={hoverV && !!knapper} trykket={fase >= F.VALGT} etter="Emma er valgt" testid="v4-velg" stor knappRef={ref('velg')}>Velg Emma</AutoKnapp>
      </Inn>
      <Inn vis={fase >= F.SLUTT} ov={ov} delay={350} className="col-start-1 row-start-1"><NesteBro aktiv={fase >= F.SLUTT} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></Inn>
    </div>
  );
}

function Tekstspalte({ fase, L, ov, onAkt, knapper, neste }) {
  const akt = aktTekst(fase);
  return (
    <div className="absolute" style={{ left: L.tekst.x, top: L.tekst.y, width: L.tekst.w, bottom: P }} data-testid="v4-tekstspalte">
      <Tekstbytte id={akt.id} ov={ov}>
        {(id) => {
          const a = id === 'slutt' ? SLUTT : AKTER[Number(id)];
          return (
            <>
              <h3 className="text-[clamp(28px,2.4vw,40px)]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.02, color: T.ink }} data-testid="v4-akt-tittel">{a.tittel}</h3>
              <p className="mt-4 max-w-[34ch] text-[15.5px] leading-[1.5]" style={{ color: DIM }}>{a.tekst}</p>
            </>
          );
        }}
      </Tekstbytte>
      <div className="mt-7"><Handling fase={fase} ov={ov} knapper={knapper} neste={neste} /></div>
      <div className="absolute bottom-0 left-0"><Akter antall={AKTER.length} aktiv={Math.max(0, aktIndeks(fase))} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} /></div>
    </div>
  );
}

function Desktop({ fase, ov, onAkt, onHold, neste, startet, tittel, ingress }) {
  const ref = useRef(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const maal = () => setW(el.offsetWidth);
    maal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maal) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const L = W ? layout(W) : null;
  const folk = fase >= F.INT1 && fase < F.SLUTT;
  const slutt = fase >= F.SLUTT;
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);
  const knapper = useRef({});
  const peker = usePeker(fase, ref, knapper, PEKER_MAAL, PRESSER, PEKER_INN);
  /* «Lag annonse» står i tekstspalten; opplastingsfeltet vokser ut fra den. Knappen måles (relativt til rammen) når den
     står stille og synlig (HOVER) — så vet Felt hvor den skal komme fra. */
  const [fraKnapp, setFraKnapp] = useState(null);
  useEffect(() => {
    if (fase !== F.HOVER) return;
    const ramme = ref.current; const el = knapper.current.start;
    if (!ramme || !el) return;
    const r = ramme.getBoundingClientRect(); const b = el.getBoundingClientRect();
    setFraKnapp({ x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height });
  }, [fase]);

  return (
    <div ref={ref} className="relative overflow-hidden text-[#15130F]" style={{ height: H, background: PAPIR }} data-testid="v4-annonse-desktop">
      {/* Åpningen: adressefeltet, faktaene, kontekstlinjen, opplastingsfeltet. Så de fem bildene som fliser (fasaden fra
          åpningen, fire fra pekeren → bunken → mosaikken) og det store bildet. */}
      {L && <Aapning fase={fase} L={L} ov={ov} startet={startet} slippRef={(el) => { knapper.current.felt = el; }} fra={fraKnapp} />}
      {L && OPPTAK.map((id) => <Flis key={id} id={id} fase={fase} L={L} ov={ov} />)}
      {L && <Foto fase={fase} L={L} ov={ov} onHold={onHold} />}

      {L && (
        <div>
          <Tekstspalte fase={fase} L={L} ov={ov} onAkt={onAkt} knapper={knapper} neste={neste} />
          <KortLag fase={fase} L={L} ov={ov} />
          <Romlapper fase={fase} L={L} ov={ov} />
          <Teller fase={fase} L={L} ov={ov} />
          <div className="absolute" style={{ left: L.omr.x, top: L.omr.y + 22, width: L.omr.w, opacity: folk ? 1 : 0, transform: folk ? 'none' : slutt ? 'translateY(-10px)' : 'translateY(14px)', transition: `opacity ${bt(folk ? 500 : 350, folk ? 250 : 0)}, transform ${bt(600, folk ? 250 : 0)}`, pointerEvents: folk ? 'auto' : 'none' }} aria-hidden={!folk}>
            <Leietakere fase={fase} ov={ov} smal={L.smal} />
          </div>
          {/* Sluttbildet: Emma-kortet midt i scenen — det Kontrakt-kapittelet åpner med */}
          <div className="absolute flex items-center justify-center" style={{ left: L.omr.x, top: L.omr.y, width: L.omr.w, height: L.omr.h, opacity: slutt ? 1 : 0, transform: slutt ? 'none' : 'translateY(16px) scale(0.985)', transition: `opacity ${bt(650, slutt ? 380 : 0)}, transform ${bt(800, slutt ? 380 : 0)}`, pointerEvents: slutt ? 'auto' : 'none' }} aria-hidden={!slutt}>
            <ValgtKort />
          </div>
        </div>
      )}

      {!ov && <Peker pos={peker} vis={peker.vis} presser={peker.presser} hopp={peker.hopp} ring={peker.ring} holder={fase === F.DRA}><HoldtBunke vis={fase === F.DRA} /></Peker>}
    </div>
  );
}

/* ── Under lg: samme akter, stablet ── */

/* Åpningen på mobil — samme idé, stående: tom flate, adressefeltet midt i, skrivingen og forslagene, så glir feltet
   opp; fasaden (full bredde) og to fakta under, og «Lag annonse». Knappen trykker seg selv (ingen peker på mobil).
   Etter trykket: opplastingsfeltet med fasaden liggende i, bunken på fire kommer opp midt i og spretter ut (SLIPP). */
function AapningKompakt({ fase, ov, startet }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const maal = () => setW(el.offsetWidth);
    maal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maal) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const inne = useAapning(fase, startet);
  const n = useSkriving(fase);
  const m = 0; const FH = 50;
  const fw = Math.max(0, w - 2 * m);
  /* Blokken når boligen er funnet: felt øverst, fasaden (3:2) under, to fakta. Knappen står i tekstblokken over. */
  const bilde = { x: m, y: FH + 12, w: fw, h: Math.round(fw / 1.5) };
  const radH = 50; const rader = BOLIGFAKTA.slice(1);
  const fakta = { x: m, y: bilde.y + bilde.h + 10, w: fw };
  const h = Math.max(Math.round(w * 1.1), fakta.y + radH * rader.length + 4);
  const feltDy = Math.round(h / 2 - FH / 2);                     // midt i flaten før boligen er funnet
  const vis = (fase === F.START && inne) || (fase > F.START && fase <= F.TRYKK_START);
  /* Opplastingsfeltet og bunken (etter trykket) */
  const felt = fase >= F.FELT && fase <= F.BUNKE;
  const tom = fase === F.FELT;                    // linjen slipper idet bunken kommer opp (DRA)
  const holdt = fase === F.DRA;                   // bunken ligger fanet midt i feltet (valgt fra bildebiblioteket)
  const f = { x: m, y: 36, w: fw, h: Math.max(0, h - 36) };
  const bw = Math.round(f.w * 0.74); const bh = Math.round(bw / 1.5);
  const base = { x: f.x + Math.round((f.w - bw) / 2), y: f.y + Math.round((f.h - bh) / 2) - 12, w: bw, h: bh };
  const fra = 'scale(0.94)';
  const sluppet = fase >= F.SLIPP && fase <= F.BUNKE;
  /* Fasaden: fra bilderekten i åpningen til sin plass i bunken (relativt til base) */
  const fasadeSc = bilde.w / Math.max(1, base.w);
  const fasadeAapning = `translate(${(bilde.x + bilde.w / 2) - (base.x + base.w / 2)}px, ${(bilde.y + bilde.h / 2) - (base.y + base.h / 2)}px) rotate(0deg) scale(${fasadeSc})`;
  return (
    <div ref={ref} className="relative overflow-hidden" style={{ height: w ? h : undefined, aspectRatio: w ? undefined : '4 / 5', background: PAPIR }} data-testid="v4-start-kompakt" data-fase={fase}>
      {w > 0 && (
        <>
          {/* Adressefeltet: midt i → øverst */}
          <div className="absolute z-[8]" style={{ left: m, top: 0, width: fw, opacity: vis ? 1 : 0, transform: vis ? `translateY(${fase >= F.FUNNET ? 0 : feltDy}px)` : fase > F.TRYKK_START ? 'translateY(-10px)' : `translateY(${feltDy + 14}px)`, transition: ov ? 'none' : vis ? `opacity 700ms ${EASE}, transform ${fase >= F.FUNNET ? 900 : 800}ms ${fase >= F.FUNNET ? MORF : UT}` : `opacity 260ms ${EASE}, transform 400ms ${EASE}`, pointerEvents: 'none', willChange: 'transform, opacity' }} aria-hidden={!vis} data-testid="v4-adressefelt-kompakt">
            <AdresseBoks fase={fase} ov={ov} n={n} h={FH} kompakt />
          </div>
          {/* Faktaene under fasaden */}
          <Boligfakta fase={fase} L={null} ov={ov} rader={rader} r={fakta} radH={radH} kompakt forsinkelse={700} />
          <FasadeLapp fase={fase} r={bilde} ov={ov} kompakt />
          {/* Kontekstlinjen øverst — fra trykket */}
          <p className="absolute z-[8] inline-flex h-[18px] items-center gap-2 whitespace-nowrap text-[12px] font-medium" style={{ left: m, top: 4, maxWidth: fw, color: 'rgba(21,19,15,0.62)', opacity: fase >= F.FELT ? 1 : 0, transform: fase >= F.FELT ? 'none' : 'translateY(6px)', transition: ov ? 'none' : fase >= F.FELT ? `opacity 500ms ${EASE} 420ms, transform 600ms ${UT} 420ms` : `opacity 200ms ${EASE}` }} aria-hidden={fase < F.FELT}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} /><span className="truncate">{ADRESSE}</span>
          </p>
          {/* Opplastingsfeltet */}
          <div className="absolute z-[2]" style={{ left: f.x, top: f.y, width: f.w, height: f.h, borderRadius: 16, border: `1.5px dashed ${fase === F.DRA ? 'rgba(210,152,255,0.95)' : 'rgba(21,19,15,0.20)'}`, background: fase === F.DRA ? 'rgba(210,152,255,0.08)' : 'rgba(21,19,15,0.025)', opacity: felt ? 1 : 0, transform: felt || fase > F.BUNKE ? 'none' : fra, transition: ov ? 'none' : felt ? `transform 820ms ${MORF}, opacity 320ms ${EASE}, border-color 400ms ${EASE} 600ms, background-color 400ms ${EASE} 600ms` : `opacity 600ms ${EASE}`, pointerEvents: 'none' }} aria-hidden={!felt} data-testid="v4-felt-kompakt">
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2" style={{ height: 48, opacity: tom ? 1 : 0, transform: tom ? 'none' : 'translateY(4px)', transition: ov ? 'none' : tom ? `opacity 450ms ${EASE} 700ms, transform 650ms ${UT} 700ms` : `opacity 180ms ${EASE}` }} aria-hidden={!tom}>
              <Opplastingsikon size={15} color="rgba(21,19,15,0.5)" />
              <p className="text-[12.5px] font-medium" style={{ color: DIM }}>Fire bilder fra mobilen holder</p>
            </div>
          </div>
          {/* Bildene: fasaden står i åpningen og glir ned i feltet; de fire andre kommer som miniatyrer midt i feltet og
              spretter ut til løse bilder */}
          {OPPTAK.map((id, k) => {
            const b = KILDE[id]; const bk = BUNKE[id]; const hI = Math.max(0, HAAND.indexOf(id));
            const sc = MINI_W / base.w; const mp = miniPos(hI);
            const iBunke = `translate(${bk.dx * 0.6}px, ${bk.dy * 0.6}px) rotate(${bk.rot}deg) scale(1)`;
            const iHaand = `translate(${mp.x + MINI_W / 2 - 44}px, ${mp.y + MINI_H / 2 - 31}px) rotate(${FAN[hI]}deg) scale(${sc})`;
            let t; let visF; let overgang; let radius; let zi = 10 + k;
            if (id === 'fasade') {
              if (fase < F.FUNNET) { t = fasadeAapning.replace(`scale(${fasadeSc})`, `scale(${fasadeSc * 0.96})`); visF = false; overgang = 'none'; radius = 12 / fasadeSc; zi = 3; }
              else if (fase <= F.TRYKK_START) { t = fasadeAapning; visF = true; overgang = ov ? 'none' : `opacity 700ms ${EASE} ${fase === F.FUNNET ? 360 : 0}ms, transform 900ms ${UT} ${fase === F.FUNNET ? 360 : 0}ms`; radius = 12 / fasadeSc; zi = 3; }
              else { t = iBunke; visF = fase <= F.BUNKE; overgang = ov ? 'none' : fase === F.FELT ? `transform 1000ms ${MORF} 140ms, border-radius 1000ms ${MORF} 140ms` : 'none'; radius = 10; zi = 10; }
            } else {
              t = sluppet || fase > F.BUNKE ? iBunke : iHaand;
              visF = sluppet || holdt;
              radius = sluppet ? 10 : MINI_R / sc;
              overgang = ov ? 'none' : sluppet ? `transform 900ms ${LANDING} ${hI * 55}ms, border-radius 900ms ${LANDING} ${hI * 55}ms, opacity 0ms` : holdt ? `opacity 320ms ${EASE} ${500 + hI * 60}ms` : 'none';
            }
            return (
              <div key={id} className="absolute overflow-hidden" style={{ left: base.x, top: base.y, width: base.w, height: base.h, borderRadius: radius, zIndex: zi, transform: t, transformOrigin: '50% 50%', opacity: visF ? 1 : 0, boxShadow: id === 'fasade' && fase <= F.TRYKK_START ? SKYGGE_FLAT : SKYGGE_LOFT, background: 'rgba(21,19,15,0.05)', transition: overgang, willChange: 'transform, opacity' }} aria-hidden={!visF} data-testid={`v4-bunke-kompakt-${id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.liten || b.src} alt={b.navn} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: b.posLiten || b.pos || '50% 50%' }} draggable={false} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function MosaikkKompakt({ fase, ov }) {
  const inne = fase === F.BILDER;
  return (
    <div data-testid="v4-mosaikk-kompakt">
      <Bilde src={KILDE.stue.liten} alt="Stue" vis={inne} ov={ov} className="rounded-[12px]" />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {SMAA.map((id, i) => <Bilde key={id} src={KILDE[id].liten || KILDE[id].src} alt={KILDE[id].navn} pos={KILDE[id].posLiten || KILDE[id].pos} vis={inne} delay={120 + i * 90} ov={ov} className="rounded-[8px]" />)}
      </div>
    </div>
  );
}

function UtkastKort({ fase, ov }) {
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: HVIT, boxShadow: `0 0 0 1px ${HAIR}` }} data-testid="v4-utkast-kort">
      <div className="relative" style={{ aspectRatio: '16 / 9' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={KILDE.soverom.styletLiten} alt="Soverommet, stylet med KI" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 55%' }} draggable={false} />
        <Lapp vis className="bottom-2.5 right-2.5" ov={ov}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Redigert · stylet med KI</Lapp>
      </div>
      <div className="px-4 pb-4 pt-3"><UtkastTekst fase={fase} ov={ov} /></div>
    </div>
  );
}

function FinnKortKompakt({ ov }) {
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: HVIT, boxShadow: `0 0 0 1px ${HAIR}, 0 24px 60px -36px rgba(21,19,15,0.45)` }} data-testid="v4-finn-kort-kompakt">
      <FinnTopp h={44} kompakt />
      <div className="relative" style={{ aspectRatio: '3 / 2' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={KILDE.soverom.styletLiten} alt="Soverommet, stylet med KI" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <Lapp vis className="bottom-2.5 right-2.5" ov={ov}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Redigert · stylet med KI</Lapp>
      </div>
      <div className="px-4 pb-4 pt-3"><FinnTekst kompakt /><div className="mt-4"><FinnBeskrivelse kompakt /></div></div>
    </div>
  );
}

function Kompakt({ fase, ov, onAkt, onHold, neste, startet }) {
  const start = fase <= F.TRYKK_START;
  const opp = iOpplasting(fase);
  const akt = aktTekst(fase);
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-kompakt">
      {/* Tekstblokken — samme akt-stemme som på desktop, fra første sekund. Handlingen (knappen) står under teksten. */}
      <div className="px-5 pt-6">
        <Tekstbytte id={akt.id} ov={ov}>
          {(id) => {
            const a = id === 'slutt' ? SLUTT : AKTER[Number(id)];
            return (
              <>
                <h3 className="text-[27px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.04, color: T.ink }}>{a.tittel}</h3>
                <p className="mt-3 text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{a.tekst}</p>
              </>
            );
          }}
        </Tekstbytte>
        <Vokse vis={fase >= F.FUNNET && fase <= F.TRYKK_START} ov={ov} delay={fase === F.FUNNET ? 1500 : 150}>
          <div className="pt-5"><AutoKnapp presser={fase === F.TRYKK_START} stor testid="v4-lag-annonse">Lag annonse</AutoKnapp></div>
        </Vokse>
        <Vokse vis={fase >= F.LES1 && fase <= F.LES3} ov={ov}><div className="pt-5"><Fakta fase={fase} ov={ov} /></div></Vokse>
        <Vokse vis={fase >= F.KLAR && fase <= F.PUBLISERT} ov={ov}>
          <div className="pt-5"><AutoKnapp presser={fase === F.TRYKK} trykket={fase >= F.PUBLISERT} etter="Publisert på FINN.no" testid="v4-publiser" stor>Publiser på <Finn h={18} /></AutoKnapp></div>
        </Vokse>
        <Vokse vis={fase >= F.ETTER && fase < F.SLUTT} ov={ov}>
          <div className="pt-5"><AutoKnapp presser={fase === F.VELG_LEIETAKER} trykket={fase >= F.VALGT} etter="Emma er valgt" testid="v4-velg" stor>Velg Emma</AutoKnapp></div>
        </Vokse>
        <Vokse vis={fase >= F.SLUTT && !!neste} ov={ov}><div className="pt-5"><NesteBro aktiv={fase >= F.SLUTT} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></div></Vokse>
      </div>

      {/* Åpningen og opplastingen — én flate: adressefeltet, fasaden og faktaene, så opplastingsfeltet med bunken */}
      <Vokse vis={start || opp} ov={ov}><div className="px-5 pt-6"><AapningKompakt fase={fase} ov={ov} startet={startet} /></div></Vokse>

      <div className="px-5 pt-6">
        <Vokse vis={fase === F.BILDER} ov={ov}><MosaikkKompakt fase={fase} ov={ov} /></Vokse>
        <Vokse vis={fase >= F.LES1 && fase <= F.STYLET} ov={ov}>
          <div className="relative overflow-hidden rounded-[12px]" style={{ aspectRatio: '3 / 2', background: 'rgba(21,19,15,0.05)' }} data-testid="v4-viser-kompakt">
            <Bildeflate fase={fase} ov={ov} onHold={onHold} liten testid="v4-bildeflate-kompakt" />
          </div>
        </Vokse>
        <Vokse vis={fase >= F.TITTEL && fase <= F.TRYKK} ov={ov}><UtkastKort fase={fase} ov={ov} /></Vokse>
        <Vokse vis={fase === F.PUBLISERT} ov={ov}><FinnKortKompakt ov={ov} /></Vokse>
        <Vokse vis={fase >= F.INT1 && fase < F.SLUTT} ov={ov}><Leietakere fase={fase} ov={ov} smal kompakt /></Vokse>
        <Vokse vis={fase >= F.SLUTT} ov={ov}><div className="py-2"><ValgtKort kompakt /></div></Vokse>
      </div>

      <div className="px-5 pb-4 pt-4"><Akter antall={AKTER.length} aktiv={Math.max(0, aktIndeks(fase))} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} /></div>
    </div>
  );
}

/* `onFerdig` — kalles når sluttbildet har stått ferdig. Returnerer den true, tar forelderen over (neste kapittel);
   ellers looper filmen. `neste` = navnet på neste kapittel (vises i broen). */
/* `synlig` = seksjonen er i bildet (inngang). `spiller` = produktflaten er i bildet — klokken går bare da. */
export default function AnnonseFilm({ synlig, spiller = synlig, tema = 'mork', onFerdig, onFremdrift, neste = null, full = false, tittel = null, ingress = null }) {
  const [fase, setFase] = useState(F.START);
  const [startet, setStartet] = useState(false);
  const [ov, setOv] = useState(false);
  const [morkt, setMorkt] = useState(false);
  const [holdt, setHoldt] = useState(false);      // brukeren holder i skillelinjen — filmen venter
  const [bred, setBred] = useState(null);         // null før mount → begge varianter med CSS-skjuling
  const ferdigRef = useRef(onFerdig);
  useEffect(() => { ferdigRef.current = onFerdig; }, [onFerdig]);
  const fremRef = useRef(onFremdrift);
  useEffect(() => { fremRef.current = onFremdrift; }, [onFremdrift]);
  useEffect(() => { fremRef.current?.({ andel: fremdriftFor(AUTO, SISTE, fase), ms: fase === F.START ? 0 : AUTO[fase] || 0 }); }, [fase]);

  useEffect(() => {
    const r = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (r) { setOv(true); setFase(F.PRIS); }
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return undefined;
    const sett = () => setBred(mq.matches);
    sett();
    mq.addEventListener?.('change', sett);
    return () => mq.removeEventListener?.('change', sett);
  }, []);

  useEffect(() => { if (spiller && !startet) setStartet(true); }, [spiller, startet]);

  useEffect(() => {
    if (!startet || morkt || holdt || !spiller) return undefined;   // ute av bildet → filmen venter der den er
    const ms = AUTO[fase];
    if (ms == null) return undefined;
    const t = window.setTimeout(() => {
      if (fase >= SISTE) {
        if (ov) { setFase(F.PRIS); return; }
        if (ferdigRef.current?.()) return;           // forelderen tar over — neste kapittel
        setMorkt(true);
        window.setTimeout(() => { setFase(F.START); window.setTimeout(() => setMorkt(false), 700); }, 500);
      } else {
        setFase((f) => f + 1);
      }
    }, ms);
    return () => window.clearTimeout(t);
  }, [fase, startet, ov, morkt, holdt, spiller]);

  const tilAkt = (i) => { setMorkt(false); setStartet(true); setFase(AKTER[i].fra); };

  const inn = { opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(28px)', transition: ov ? 'none' : `opacity 800ms ${EASE}, transform 800ms ${EASE}` };
  const lys = tema === 'lys';
  const skygge = lys
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';
  const felles = { fase, ov, startet, onAkt: tilAkt, onHold: setHoldt, neste, tittel, ingress };
  const blend = { opacity: morkt ? 0 : 1, transition: ov ? 'none' : `opacity 450ms ${EASE}` };

  /* Full bleed: filmen i den felles rammeløse stagen (FullStage i filmdeler) */
  if (full) {
    return <Ramme synlig={synlig} tema={tema} ov={ov} morkt={morkt} bred={bred} fase={fase} testid="v4-annonse-scene" full ekstra={{ 'data-holdt': holdt ? '1' : '0' }} desktop={<Desktop {...felles} />} kompakt={<Kompakt {...felles} />} />;
  }

  return (
    <div className="relative mx-auto w-full max-w-[min(1400px,86vw)]" data-testid="v4-annonse-scene" data-fase={fase} data-holdt={holdt ? '1' : '0'}>
      <FilmStil />
      {bred !== false && (
        <div className={`overflow-hidden rounded-[18px] ${bred === null ? 'hidden lg:block' : ''}`} style={{ boxShadow: skygge, background: PAPIR, ...inn }}>
          <div style={blend}><Desktop {...felles} /></div>
        </div>
      )}
      {bred !== true && (
        <div className={`mx-auto w-full max-w-[440px] overflow-hidden rounded-[18px] ${bred === null ? 'lg:hidden' : ''}`} style={{ boxShadow: skygge, background: PAPIR, ...inn }}>
          <div style={blend}><Kompakt {...felles} /></div>
        </div>
      )}
    </div>
  );
}
