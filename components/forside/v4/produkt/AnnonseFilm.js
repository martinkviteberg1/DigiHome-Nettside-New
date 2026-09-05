'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall } from '../motion';
import { PAPIR, HVIT, STEIN, HAIR, DIM, OFF, H, P, MORF, LYSKANT, GLASS, BLUR_INN, FilmStil, Hake, Finn, Portrett, Inn, Vokse, Chip, Lapp, Dok, AutoKnapp, Peker, usePeker, Tekstbytte, Akter, NesteBro, Sms, ValgtKort, Bilde, fremdriftFor } from './filmdeler';

/* ---------------------------------------------------------------------------
   AnnonseFilm — konseptfilm i én ramme. «Fra ledig til utleid. Du trykker tre ganger.»

   Ingen navigasjon inni rammen. Én setning + ett bilde per akt. Filmen spiller
   av seg selv; trykkene vises. Åpner superminimalistisk: tom papirflate, én
   stille adresselinje, én knapp midt i rammen — «Lag annonse». Knappen løfter
   seg svakt (forventning), trykkes av seg selv, og morfer så til det første
   bildet: samme element reiser fra knapp til mosaikk til stort bilde til banner
   til FINN-siden. Én sammenhengende bevegelse — aldri klipp.

   Akter (tekstspalten til venstre, scenen til høyre; stablet under lg):
     1 Last opp bildene.          Fem bilder faller inn i en mosaikk.
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

/* Fasene i rekkefølge. FOTO1–5 = kameraet: du tar bildene selv (fasade → kjøkken → soverom → spisestue → stue),
   hvert bilde krymper ned i hjørnet som en telefonkamera-miniatyr. STABEL = bunken hviler på papiret. */
const FASE_NAVN = ['START', 'OPP', 'PEKER', 'HOVER', 'TRYKK_START', 'FOTO1', 'FOTO2', 'FOTO3', 'FOTO4', 'FOTO5', 'STABEL', 'BILDER',
  'LES1', 'LES2', 'LES3', 'STYLE', 'SKILLE', 'STYLET', 'TITTEL', 'TEKST', 'PRIS', 'KLAR', 'TRYKK', 'PUBLISERT',
  'INT1', 'INT2', 'BOOK1', 'BOOK2', 'SPM', 'ETTER', 'VELG', 'VALGT', 'SLUTT'];
const F = Object.fromEntries(FASE_NAVN.map((n, i) => [n, i]));
const AUTO = {
  /* Åpningen: bygården alene (etablering) → telefonen løftes med appen på skjermen → pekeren trykker «Lag annonse» */
  [F.START]: 1500, [F.OPP]: 1000, [F.PEKER]: 700, [F.HOVER]: 300, [F.TRYKK_START]: 340,
  /* Kameraet (FOTO1): fasaden alene et øyeblikk → teksten nede til venstre → kamerautsnittet glir inn over høyre
     halvdel → autofokus → utløser. Så kjøkken, soverom, spisestue i rolig rytme; stua får litt ekstra.
     STABEL: kameraet legges ned, «Vi gjør resten.» — tre handlinger kommer én og én. */
  [F.FOTO1]: 3400, [F.FOTO2]: 1100, [F.FOTO3]: 1000, [F.FOTO4]: 1000, [F.FOTO5]: 1300,
  [F.STABEL]: 2600, [F.BILDER]: 2400,
  [F.LES1]: 3300, [F.LES2]: 3000, [F.LES3]: 3200,
  [F.STYLE]: 3400, [F.SKILLE]: 2800, [F.STYLET]: 2000,
  [F.TITTEL]: 1000, [F.TEKST]: 1100, [F.PRIS]: 1700,
  [F.KLAR]: 1700, [F.TRYKK]: 380, [F.PUBLISERT]: 3000,
  [F.INT1]: 1300, [F.INT2]: 1100, [F.BOOK1]: 1900, [F.BOOK2]: 1800, [F.SPM]: 1500,
  [F.ETTER]: 1900, [F.VELG]: 380, [F.VALGT]: 2700, [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

/* Pekeren: hvilken knapp den sikter på i hver fase (ellers skjult). Trykkfasene presser. */
const PEKER_MAAL = {
  [F.PEKER]: 'start', [F.HOVER]: 'start', [F.TRYKK_START]: 'start',
  [F.KLAR]: 'publiser', [F.TRYKK]: 'publiser',
  [F.ETTER]: 'velg', [F.VELG]: 'velg',
};
const PRESSER = new Set([F.TRYKK_START, F.TRYKK, F.VELG]);


/* Kamerascenen (FOTO1–STABEL) står på fasaden, ikke på papiret: kort editorial tekst nede til venstre. `under` er
   den svakeste linjen. Ved STABEL bytter tittelen til «Vi gjør resten.» og HANDLINGER kommer én og én. */
const HANDLINGER = ['Romtype gjenkjent', 'Bilde optimalisert', 'Rekkefølge foreslått'];
const AKTER = [
  { fra: F.FOTO1, tittel: 'Begynn med bildene.', tekst: 'Fem bilder fra mobilen holder.', under: 'DigiHome ordner resten mens de lastes opp.' },
  { fra: F.STABEL, tittel: 'Vi gjør resten.', tekst: 'Rommene kjennes igjen, bildene justeres og legges i rekkefølge — før du har lagt fra deg telefonen.' },
  { fra: F.LES1, tittel: 'Ser hva rommet har.', tekst: 'Parkett, kjøkkenøy, store vinduer. Alt som havner i annonsen, kan spores tilbake til et bilde.' },
  { fra: F.LES2, tittel: 'Finner det leietakere spør om.', tekst: 'Hvitevarer, spiseplass, oppvaskmaskin. Svarene ligger i bildene — før noen rekker å spørre.' },
  { fra: F.LES3, tittel: 'Foreslår det som kan bli bedre.', tekst: 'Sengen er uoppredd. Forslaget: re den opp digitalt — resten av rommet får være som det er.' },
  { fra: F.STYLE, tittel: 'Sengen res opp.', tekst: 'Én instruks, avgrenset til sengen. Rommet, lyset og alt som er fast, står urørt — og bildet merkes som redigert.' },
  { fra: F.TITTEL, tittel: 'Utkastet er klart.', tekst: 'Overskrift, tekst og prisforslag — fra bildene og det du allerede vet om boligen. Endre det du vil, eller publiser som det er.' },
  { fra: F.KLAR, tittel: 'Ute på FINN.no.', tekst: 'Samme bilder, samme tekst. Interessentene melder seg med BankID, så du vet hvem du har med å gjøre.' },
  { fra: F.INT1, tittel: 'Visningen booker de selv.', tekst: 'Interessentene velger et ledig tidspunkt og får bekreftelsen på SMS. Du møter opp.' },
  { fra: F.ETTER, tittel: 'Du velger leietaker.', tekst: 'Inntekt og referanse ligger klart. Velg Emma — de andre får beskjed samtidig, uten at du skriver noe.' },
];
const SLUTT = { tittel: 'Boligen har fått leietaker.', tekst: 'Emma flytter inn 1. november. Kontrakten er neste — og den er allerede fylt ut.' };
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
/* Kameraet: rekkefølgen du tar bildene i. Stua sist — heltebildet, øverst i bunken, blir det store i mosaikken. */
const OPPTAK = ['fasade', 'kjokken', 'soverom', 'spisestue', 'stue'];
const fotoFase = (id) => F.FOTO1 + OPPTAK.indexOf(id);
const iSoker = (fase) => fase >= F.FOTO1 && fase <= F.FOTO5;
const sokerId = (fase) => OPPTAK[fase - F.FOTO1];

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
  { id: 'e1', til: 'Emma', fra: F.BOOK1, tilOg: F.VELG, tid: 'i dag 17:52', tekst: 'Hei Emma! Visningen i Nygårdsgaten 5 er bekreftet tirsdag kl. 17:30. Svar AVBESTILL om du ikke kan komme. – DigiHome' },
  { id: 'm1', til: 'Martin', fra: F.BOOK2, tilOg: F.VELG, tid: 'i dag 19:14', tekst: 'Hei Martin! Visningen i Nygårdsgaten 5 er bekreftet tirsdag kl. 18:00. Svar AVBESTILL om du ikke kan komme. – DigiHome' },
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

/* ── Åpningen: Nygårdsgaten 5 i skumring — samme bygård som heroen (filmens verden fortsetter her), uten eieren.
   Teksten står i venstre spalte, på samme sted som aktenes tekst: adresse, én setning i to linjer, én knapp.
   Pekeren glir inn og trykker. Ved trykket krymper bygården til «Fasade»-bildet i mosaikken — og teksten
   bytter til første akt på samme sted. ── */
function StartTekst({ fase, kompakt = false, knappRef, inne = true, ov = false }) {
  const hover = fase === F.HOVER || fase === F.TRYKK_START;
  const ord = ['Fra', 'ledig', 'til', 'utleid'];
  const vis = inne && fase >= F.OPP;   // bildet står rent først — så kommer teksten
  const steg = (i) => ({ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(18px)', filter: vis ? 'blur(0px)' : 'blur(8px)', transition: ov ? 'none' : vis ? `opacity 700ms ${EASE} ${i}ms, transform 900ms ${EASE} ${i}ms, filter 700ms ${EASE} ${i}ms` : `opacity 220ms ${EASE}, transform 220ms ${EASE}, filter 220ms ${EASE}` });
  return (
    <div className="text-left" data-testid="v4-start" style={{ color: OFF }}>
      <p className={`inline-flex items-center gap-2 rounded-full ${kompakt ? 'h-7 px-3 text-[12px]' : 'h-8 px-3.5 text-[13px]'}`} style={{ color: 'rgba(244,241,234,0.92)', background: 'rgba(21,19,15,0.30)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.20)', ...steg(100) }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />{kompakt ? ADRESSE : 'Nygårdsgaten 5 · Bergen'}</p>
      {/* Én linje, stor — setningen er hele kapittelet */}
      <h3 className={kompakt ? 'mt-3 text-[40px]' : 'mt-4 text-[clamp(52px,5.6vw,98px)]'} style={{ ...display, letterSpacing: '-0.04em', lineHeight: 0.94, color: OFF, textWrap: kompakt ? 'balance' : 'nowrap' }}>
        {ord.map((o, i) => (
          <span key={o} className="inline-block" style={{ ...steg(240 + i * 90), marginRight: i < ord.length - 1 ? '0.22em' : 0 }}>
            {o}{i === ord.length - 1 ? <span style={{ color: T.lilla }}>.</span> : null}
          </span>
        ))}
      </h3>
      <div className={`flex items-center ${kompakt ? 'mt-5' : 'mt-7'}`} style={steg(720)}>
        <AutoKnapp presser={fase === F.TRYKK_START} hover={!kompakt && hover} stor testid="v4-lag-annonse" knappRef={knappRef}>Lag annonse</AutoKnapp>
      </div>
    </div>
  );
}
/* Vignett — rolig dybde mot kantene mens bygården står */
const START_VIGNETT = 'radial-gradient(120% 95% at 50% 42%, rgba(21,19,15,0) 55%, rgba(21,19,15,0.38) 100%)';
/* Mørk, varm tone fra venstre der teksten står — nesten ingenting til høyre, så fasaden og de lyse vinduene får lyset */
const START_GRADIENT = 'linear-gradient(180deg, rgba(21,19,15,0.06) 0%, rgba(21,19,15,0.02) 36%, rgba(21,19,15,0.42) 66%, rgba(21,19,15,0.84) 100%), linear-gradient(90deg, rgba(21,19,15,0.28) 0%, rgba(21,19,15,0) 55%)';
const START_EKSPONERING = '#15130F';

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
  /* Kameraet: ikke en telefon, men et kamerautsnitt — ett stort, avrundet 3:2-utsnitt som flyter over høyre del av
     fasaden. Under det: raden med fem plasser der bildene lander etter hvert som de tas (raden ER telleren).
     Teksten står nede til venstre, i samme hjørne som åpningsteksten. */
  const kw = Math.min(Math.round(H * 0.6 * 1.5), Math.round((W - 2 * P) * 0.5));
  const kh = Math.round(kw / 1.5);
  const rg = 8; const rw = Math.round(kw * 0.148); const rh = Math.round(rw / 1.5);
  const blokk = kh + 14 + rh;
  const sy = Math.round((H - blokk) / 2) - 6; const sx = W - P - kw;
  const soker = { x: sx, y: sy, w: kw, h: kh, radius: 22 };
  const utloser = { cx: sx + kw - 46, cy: sy + Math.round(kh / 2), r: 22 };
  const rull = [0, 1, 2, 3, 4].map((i) => ({ x: sx + i * (rw + rg), y: sy + kh + 14, w: rw, h: rh }));
  /* Teksten nede til venstre får plassen fram til kameraet */
  const kameraTekst = { x: P, w: Math.min(560, sx - P - 40) };
  return { hel, tekst, omr, mosaikk, stabel, stor, banner, finnBilde, finnTekst, finnBeskrivelse, topp, soker, utloser, rull, kameraTekst, smal: VW < 660 };
}

function fotoRekt(L, f) {
  if (f <= F.STABEL) return L.stabel;
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

/* Ytelse — regelen for hele kamerasekvensen: alt som beveger seg, beveger seg KUN med transform og opacity.
   Hver flis har en fast basisflate = den store 3:2-flaten, og glir med translate/rotate/scale:
   (fasaden: dekker rammen →) søkeren → filmrullen → mosaikken. Ingen animert left/top/width/height, ingen animert blur. */
function bunkeTransform({ id, fase, L, ov, base = L.stor }) {
  const k = OPPTAK.indexOf(id); const ff = fotoFase(id); const fasade = id === 'fasade';
  const til = (r, skala = 1) => {
    const sc = (r.w / base.w) * skala;
    const dx = (r.x + r.w / 2) - (base.x + base.w / 2); const dy = (r.y + r.h / 2) - (base.y + base.h / 2);
    return { dx, dy, sc };
  };
  const tr = (kk) => `translate(${kk.dx}px, ${kk.dy}px) scale(${kk.sc})`;
  let transform; let overgang = 'none'; let radius = 0; let zi = 1; let skygge = 'none'; let op = 0;
  if (fasade && fase <= F.TRYKK_START) {
    /* Åpningen: bygården dekker rammen (kortets kanter ligger utenfor rammen) */
    const kk = til({ x: 0, y: (L.hel.h - L.hel.w / 1.5) / 2, w: L.hel.w, h: L.hel.w / 1.5 });
    transform = tr(kk); op = 1; zi = 3; radius = '0px 0px 0px 0px';
  } else if (fase <= ff) {
    /* I kamerautsnittet, usynlig — utsnittet viser rommet selv. Flisen ligger klar her med nøyaktig samme piksler,
       så den kan «løsne» fra utsnittet idet bildet tas. Fasaden hopper hit uten overgang ved FOTO1; bakteppet
       (Bakteppe) tar over hele rammen med samme bilde i samme posisjon, så byttet er usynlig. */
    const kk = til(L.soker);
    transform = tr(kk); radius = `${L.soker.radius / kk.sc}px`; op = 0; zi = 1;
    overgang = 'none';
  } else if (fase < F.BILDER) {
    /* Tatt: løsner fra utsnittet og glir ned til sin plass i raden */
    const kk = til(L.rull[k]);
    transform = tr(kk); radius = `${8 / kk.sc}px`; op = 1; zi = 10 + k; skygge = SKYGGE_FLAT;
    overgang = ov ? 'none' : `transform 720ms ${MORF}, border-radius 720ms ${MORF}, box-shadow 400ms ${EASE} 300ms`;
  } else if (fase === F.BILDER) {
    const kk = til(SLOT[id](L));
    transform = tr(kk); radius = `${10 / kk.sc}px`; op = 1; zi = LAG[id]; skygge = SKYGGE_FLAT;
    overgang = ov ? 'none' : `transform 900ms ${MORF} ${k * 40}ms, border-radius 900ms ${MORF} ${k * 40}ms`;
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

/* Ett bilde i kamerasekvensen: ligger usynlig i rammen til det «tas», glir så ut til rullen, og videre til mosaikken.
   Fasaden er åpningsbildet: dekker rammen (stille kamera inn + en anelse sideveis, nålen på Leilighet 2), krymper
   inn i rammen ved trykket og blir bilde 1. Stua tar det store bildet (Foto) over fra ved LES1 — samme piksler. */
function OpptakFlis({ id, fase, L, ov, startet }) {
  const b = KILDE[id]; const ff = fotoFase(id);
  const fasade = id === 'fasade';
  const inne = fasade ? fase <= F.BILDER : fase > ff && fase <= F.BILDER;
  const st = bunkeTransform({ id, fase, L, ov });
  if (id === 'stue' && fase > F.BILDER) { st.transition = 'none'; st.opacity = 0; }
  const start = fasade && fase <= F.TRYKK_START;
  const zoomet = useAapning(fase, startet);
  const KAM = 'cubic-bezier(0.25, 0.6, 0.3, 1)';
  const sd = L.hel.w / L.stor.w;
  const kamera = start ? (zoomet ? 'translate(0%, 0%) scale(1)' : 'translate(1.2%, 0%) scale(1.05)') : 'translate(0%, 0%) scale(1)';
  const skala = start ? sd * (zoomet ? 1 : 1.05) : 1;
  return (
    <div className="absolute overflow-hidden" style={st} aria-hidden={!inne} data-testid={fasade ? 'v4-fasade' : `v4-mosaikk-${id}`} data-start={start ? '1' : '0'}>
      <div className="absolute inset-0" style={{ transform: kamera, transition: ov ? 'none' : start ? `transform 3800ms ${KAM}` : `transform 900ms ${MORF}`, willChange: 'transform' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.src} alt={fasade ? 'Bygården i Nygårdsgaten' : b.navn} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
        {fasade && (
          <Pinne x={LEILIGHET.x} y={LEILIGHET.y} t="Leilighet 2" under="Ledig fra 1. november" tone="lilla" vis={fase <= F.HOVER && zoomet} delay={fase === F.START ? 700 : 0} ov={ov} skala={skala} kamera={ov ? 'none' : start ? `transform 3800ms ${KAM}` : 'none'} myk />
        )}
      </div>
    </div>
  );
}

/* ── Kamerascenen (FOTO1–STABEL) ──
   Ikke «bakgrunn → hvit boks → telefon i boksen», men «eiendom → editorial tekst → et intelligent lag rett over scenen».
   Fasaden fortsetter bak hele scenen (Bakteppe), mykt uskarp og svakt dempet idet kamerautsnittet kommer. Utsnittet er
   et produktobjekt — ett stort avrundet 3:2-utsnitt med rommet, tynt tredelingsnett, én etikett og utløseren. Ingen
   telefonkropp, ingen statuslinje. Hvert bilde løsner som en miniatyr og legger seg i raden under. Kun transform/opacity
   under bevegelse; uskarpheten er statisk (én forhåndsrastrert kopi som tones inn). */

/* Bakteppet: fasaden i nøyaktig samme geometri som åpningsflisen (3:2-rekt med rammens bredde, vertikalt sentrert),
   så byttet fra flis til bakteppe ved FOTO1 er usynlig. Oppå: en statisk uskarp kopi (blur 7 px, 8 % mørkere) som tones
   inn mens utsnittet kommer, og ut igjen når papiret tar over (BILDER). */
function Bakteppe({ fase, L, ov }) {
  const b = KILDE.fasade;
  const inne = fase >= F.FOTO1 && fase <= F.STABEL;
  const uskarp = inne && fase >= F.FOTO1;
  const ut = fase === F.BILDER;
  const r = { x: 0, y: (L.hel.h - L.hel.w / 1.5) / 2, w: L.hel.w, h: L.hel.w / 1.5 };
  const img = { objectPosition: b.pos || '50% 50%' };
  return (
    <div className="absolute overflow-hidden" style={{ left: 0, top: 0, width: L.hel.w, height: L.hel.h, zIndex: 1, opacity: inne ? 1 : 0, transition: ov ? 'none' : ut ? `opacity 900ms ${EASE}` : 'none', pointerEvents: 'none' }} aria-hidden={!inne} data-testid="v4-bakteppe">
      <div className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={img} draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ ...img, filter: 'blur(7px) brightness(0.92)', transform: 'scale(1.04)', opacity: uskarp ? 1 : 0, transition: ov ? 'none' : `opacity 1100ms ${EASE} ${fase === F.FOTO1 ? 900 : 0}ms`, willChange: 'opacity' }} draggable={false} />
      </div>
    </div>
  );
}

/* Raden — fem stille plasser under utsnittet. Tomme: en tynn lys hårlinje. Bildene (flisene) lander oppå etter hvert
   som de tas. Raden er telleren; ingen egen fremdriftsstrek. */
function KameraRad({ fase, L, ov }) {
  const aktiv = iSoker(fase) || fase === F.STABEL;
  const inn = fase === F.FOTO1;
  return L.rull.map((r, i) => (
    <div key={i} className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 8, zIndex: 5, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.035)', opacity: aktiv ? 1 : 0, transform: aktiv ? 'none' : 'translateY(6px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${aktiv && inn ? 1500 + i * 60 : 0}ms, transform 600ms ${EASE} ${aktiv && inn ? 1500 + i * 60 : 0}ms`, pointerEvents: 'none' }} aria-hidden={!aktiv} data-testid={`v4-rad-${i}`} />
  ));
}

/* Autofokus — én fokusramme (fire hjørner) lander rolig der kameraet stiller seg inn, holder, og slipper. Fasaden får
   den lange (spec: 3,0–4,2 s); rommene får en kortere idet de kommer i utsnittet. */
const FOKUS_OMR = {
  fasade: { x: 44, y: 34, w: 24, h: 30 },
  kjokken: { x: 38, y: 40, w: 26, h: 30 },
  soverom: { x: 30, y: 38, w: 30, h: 32 },
  spisestue: { x: 36, y: 36, w: 28, h: 32 },
  stue: { x: 34, y: 34, w: 30, h: 32 },
};
function Autofokus({ id, fase, ov }) {
  if (ov || !id) return null;
  const o = FOKUS_OMR[id]; const forste = id === 'fasade';
  const dur = forste ? 1300 : Math.max(600, (AUTO[fotoFase(id)] || 900) - 250);
  const delay = forste ? 2050 : 120;
  return (
    <div key={id} aria-hidden="true" className="pointer-events-none absolute z-[3]" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.w}%`, height: `${o.h}%`, animation: `v4-fokus ${dur}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms both`, transformOrigin: '50% 50%', willChange: 'transform, opacity' }} data-testid="v4-autofokus">
      <Hjorne style={{ left: -2, top: -2 }} rot={0} />
      <Hjorne style={{ right: -2, top: -2 }} rot={90} />
      <Hjorne style={{ right: -2, bottom: -2 }} rot={180} />
      <Hjorne style={{ left: -2, bottom: -2 }} rot={270} />
    </div>
  );
}

/* Kamerautsnittet. Glir rolig inn fra høyre (48 px, 0.94 → 1) idet teksten har landet; legges ned etter siste bilde
   (litt ned, 0.97, tones ut). Inni: rommet (rolig håndholdt driv), tredelingsnett, «Fasade · 1 av 5», utløseren til
   høyre, et kort svart blink idet den går. */
function Soker({ fase, L, ov }) {
  const aktiv = iSoker(fase);
  const id = aktiv ? sokerId(fase) : null;
  const k = aktiv ? OPPTAK.indexOf(id) + 1 : 0;
  const blink = !ov && fase >= F.FOTO2 && fase <= F.STABEL;
  const presser = blink;
  const r = L.soker; const u = L.utloser;
  const inn = fase === F.FOTO1; const etter = fase > F.FOTO5;
  const linje = 'rgba(250,248,244,0.16)';
  const liten = r.h < 300;
  const transform = aktiv ? 'translate(0px, 0px) scale(1)' : etter ? 'translate(0px, 14px) scale(0.97)' : 'translate(48px, 0px) scale(0.94)';
  const transition = ov ? 'none' : aktiv ? `opacity 600ms ${EASE} ${inn ? 1200 : 0}ms, transform 1000ms ${MORF} ${inn ? 1200 : 0}ms` : etter ? `opacity 520ms ${EASE} 120ms, transform 700ms ${EASE} 120ms` : 'none';
  return (
    <div className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 6, opacity: aktiv ? 1 : 0, transform, transformOrigin: '50% 50%', transition, pointerEvents: 'none', willChange: 'transform, opacity' }} aria-hidden={!aktiv} data-testid="v4-soker" data-rom={id || ''}>
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: r.radius, background: '#15130F', boxShadow: '0 70px 120px -50px rgba(0,0,0,0.75), 0 24px 48px -30px rgba(0,0,0,0.5)' }}>
        {/* Rommene — krysstoning + håndholdt driv */}
        {OPPTAK.map((rid) => {
          const rb = KILDE[rid]; const paa = rid === id;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={rid} src={rb.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: rb.pos || '50% 50%', opacity: paa ? 1 : 0, transition: ov ? 'none' : `opacity 320ms ${EASE}`, animation: paa && !ov ? `v4-kamera ${(AUTO[fotoFase(rid)] || 900) + 400}ms cubic-bezier(0.25, 0.6, 0.3, 1) both` : 'none', willChange: 'transform, opacity' }} draggable={false} aria-hidden={!paa} />
          );
        })}
        {/* Tredelingsnett — svakt */}
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, transparent calc(33.33% - 0.5px), ${linje} calc(33.33% - 0.5px), ${linje} calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), ${linje} calc(66.66% - 0.5px), ${linje} calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(180deg, transparent calc(33.33% - 0.5px), ${linje} calc(33.33% - 0.5px), ${linje} calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), ${linje} calc(66.66% - 0.5px), ${linje} calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))` }} />
        <Autofokus id={id} fase={fase} ov={ov} />
        {/* Etiketten: «Fasade · 1 av 5» — oppe til venstre */}
        <div className="absolute" style={{ left: liten ? 12 : 16, top: liten ? 12 : 16 }}>
          <span className={`inline-flex items-center gap-2 rounded-full font-medium tabular-nums ${liten ? 'h-6 pl-2 pr-2.5 text-[11px]' : 'h-7 pl-2.5 pr-3 text-[12px]'}`} style={{ background: 'rgba(12,11,10,0.50)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)', color: 'rgba(250,248,244,0.96)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
            <span key={id} className="animate-in fade-in-0 duration-300">{id ? KILDE[id].navn : ''}</span>
            <span style={{ color: 'rgba(250,248,244,0.5)' }}>· {k} av 5</span>
          </span>
        </div>
        {/* Utløseren — ring med hvit skive, trykkes idet et bilde tas */}
        <div className="absolute" style={{ left: u.cx - r.x - u.r, top: u.cy - r.y - u.r, width: u.r * 2, height: u.r * 2, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.92), 0 6px 20px -8px rgba(0,0,0,0.6)' }} data-testid="v4-utloser">
          <div key={presser ? `p${fase}` : 'px'} className="absolute" style={{ inset: 5, borderRadius: '50%', background: '#FFFFFF', animation: presser ? 'v4-utloser 360ms cubic-bezier(0.3, 0, 0.2, 1) both' : 'none' }} />
        </div>
        {/* Utløseren: utsnittet går svart et øyeblikk */}
        <div key={blink ? `b${fase}` : 'bx'} aria-hidden="true" className="absolute inset-0" style={{ background: '#000', opacity: 0, animation: blink ? 'v4-blink-sort 240ms ease-out both' : 'none' }} data-testid="v4-blink" />
      </div>
    </div>
  );
}

/* Teksten i kamerascenen — nede til venstre, rett på fasaden, ingen boks. «01 · Annonsen», tittelen ord for ord,
   én setning, én svakere linje. Ved STABEL: «Vi gjør resten.» og tre handlinger, én og én. */
function KameraTekst({ fase, L, ov }) {
  const inne = fase >= F.FOTO1 && fase <= F.STABEL;
  const rest = fase >= F.STABEL;
  const akt = rest ? AKTER[1] : AKTER[0];
  const forste = fase === F.FOTO1;
  const ord = akt.tittel.split(' ');
  const steg = (i) => ({ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(14px)', filter: inne ? 'blur(0px)' : 'blur(8px)', transition: ov ? 'none' : inne ? `opacity 700ms ${EASE} ${forste ? 600 + i : i}ms, transform 900ms ${EASE} ${forste ? 600 + i : i}ms, filter 700ms ${EASE} ${forste ? 600 + i : i}ms` : `opacity 320ms ${EASE}, transform 320ms ${EASE}, filter 320ms ${EASE}` });
  return (
    <div className="absolute z-[5]" style={{ left: L.kameraTekst.x, width: L.kameraTekst.w, bottom: P + 6, color: OFF, pointerEvents: 'none' }} aria-hidden={!inne} data-testid="v4-kamera-tekst" data-rest={rest ? '1' : '0'}>
      <p className="text-[12.5px] font-medium tabular-nums" style={{ color: 'rgba(244,241,234,0.58)', ...steg(0) }}>01 · Annonsen</p>
      <Tekstbytte id={rest ? 'rest' : 'start'} ov={ov}>
        {(id) => {
          const a = id === 'rest' ? AKTER[1] : AKTER[0];
          const o = a.tittel.split(' ');
          return (
            <h3 className="mt-3 text-[clamp(34px,3.4vw,54px)]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1.0, color: OFF }} data-testid="v4-kamera-tittel">
              {o.map((w, i) => (
                <span key={`${id}-${w}-${i}`} className="inline-block" style={{ ...steg(120 + i * 80), marginRight: i < o.length - 1 ? '0.24em' : 0 }}>{w}</span>
              ))}
            </h3>
          );
        }}
      </Tekstbytte>
      {/* Første del: setningen + den svake linjen. STABEL: handlingene, én og én. */}
      <div className="grid">
        <div className="col-start-1 row-start-1" style={{ opacity: inne && !rest ? 1 : 0, transition: ov ? 'none' : `opacity 300ms ${EASE}` }} aria-hidden={rest}>
          <p className="mt-4 text-[16px] leading-[1.45]" style={{ color: 'rgba(244,241,234,0.82)', ...steg(520) }}>{AKTER[0].tekst}</p>
          <p className="mt-1.5 text-[13.5px] leading-[1.45]" style={{ color: 'rgba(244,241,234,0.48)', ...steg(680) }}>{AKTER[0].under}</p>
        </div>
        <ul className="col-start-1 row-start-1 mt-4 space-y-2" style={{ opacity: rest ? 1 : 0, transition: ov ? 'none' : `opacity 300ms ${EASE}` }} aria-hidden={!rest} data-testid="v4-handlinger">
          {HANDLINGER.map((h, i) => {
            const vis = rest && inne;
            const d = 520 + i * 560;
            return (
              <li key={h} className="flex items-center gap-2.5 text-[15px]" style={{ color: 'rgba(244,241,234,0.9)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(8px)', transition: ov ? 'none' : `opacity 520ms ${EASE} ${vis ? d : 0}ms, transform 620ms ${EASE} ${vis ? d : 0}ms` }}>
                <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: T.lilla, color: T.ink }}><Hake size={10} /></span>
                {h}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* Tonene over åpningsbildet — fullramme, kun opacity. Bildet står rent først; gradient og vignett kommer idet
   teksten kommer (OPP). Loopens toning håndteres av `blend` i AnnonseFilm. */
function StartToner({ fase, ov }) {
  /* Står fra OPP gjennom hele kamerascenen (teksten nede til venstre trenger den), slipper når papiret tar over */
  const overlay = fase >= F.OPP && fase <= F.STABEL;
  const ut = fase === F.BILDER;
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4]" style={{ background: START_GRADIENT, opacity: overlay ? 1 : 0, transition: ov ? 'none' : `opacity ${overlay ? 900 : ut ? 800 : 450}ms ${EASE}` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4]" style={{ background: START_VIGNETT, opacity: overlay ? 1 : 0, transition: ov ? 'none' : `opacity ${overlay ? 900 : ut ? 800 : 400}ms ${EASE}` }} />
    </>
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
        <span>5 bilder · rom gjenkjent</span>
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
  const publiser = fase >= F.KLAR && fase <= F.PUBLISERT;
  const velg = fase >= F.ETTER && fase < F.SLUTT;
  const hoverP = fase === F.KLAR || fase === F.TRYKK;
  const hoverV = fase === F.ETTER || fase === F.VELG;
  const ref = (navn) => (el) => { if (knapper) knapper.current[navn] = el; };
  return (
    <div className="grid">
      <Inn vis={fase >= F.LES1 && fase <= F.LES3} ov={ov} className="col-start-1 row-start-1"><Fakta fase={fase} ov={ov} /></Inn>
      <Inn vis={publiser} ov={ov} delay={200} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.TRYKK} hover={hoverP && !!knapper} trykket={fase >= F.PUBLISERT} etter="Publisert på FINN.no" testid="v4-publiser" stor knappRef={ref('publiser')}>Publiser på <Finn h={18} /></AutoKnapp>
      </Inn>
      <Inn vis={velg} ov={ov} delay={200} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.VELG} hover={hoverV && !!knapper} trykket={fase >= F.VALGT} etter="Emma er valgt" testid="v4-velg" stor knappRef={ref('velg')}>Velg Emma</AutoKnapp>
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

function Desktop({ fase, ov, onAkt, onHold, neste, startet }) {
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
  const start = fase <= F.TRYKK_START;
  const skjult = fase <= F.STABEL;   // åpningen og kamerascenen står på fasaden: ingen tekstspalte, ingen papirflate
  const folk = fase >= F.INT1 && fase < F.SLUTT;
  const slutt = fase >= F.SLUTT;
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);
  const knapper = useRef({});
  const peker = usePeker(fase, ref, knapper, PEKER_MAAL, PRESSER);

  return (
    <div ref={ref} className="relative overflow-hidden text-[#15130F]" style={{ height: H, background: PAPIR }} data-testid="v4-annonse-desktop">
      {/* Kamerascenen: fasaden bak alt (Bakteppe), de fem bildene som fliser (usynlige i utsnittet → raden → mosaikken),
          tonene, raden, utsnittet og teksten nede til venstre */}
      {L && <Bakteppe fase={fase} L={L} ov={ov} />}
      {L && OPPTAK.map((id) => <OpptakFlis key={id} id={id} fase={fase} L={L} ov={ov} startet={startet} />)}
      {L && <StartToner fase={fase} ov={ov} />}
      {L && <KameraRad fase={fase} L={L} ov={ov} />}
      {L && <Soker fase={fase} L={L} ov={ov} />}
      {L && <KameraTekst fase={fase} L={L} ov={ov} />}
      {L && <Foto fase={fase} L={L} ov={ov} onHold={onHold} />}

      {/* Åpningsteksten — i venstre spalte, der aktenes tekst står. Kommer inn ord for ord; går raskt ut i trykket. */}
      <div className="absolute z-[5]" style={{ left: P, right: P, bottom: P + 6, pointerEvents: start ? 'auto' : 'none' }} aria-hidden={!start}>
        <StartTekst fase={fase} inne={start} ov={ov} knappRef={(el) => { knapper.current.start = el; }} />
      </div>

      {L && (
        <div style={{ opacity: skjult ? 0 : 1, transition: `opacity ${bt(700, skjult ? 0 : 380)}` }} aria-hidden={skjult}>
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

      {!ov && <Peker pos={peker} vis={peker.vis} presser={peker.presser} hopp={peker.hopp} ring={peker.ring} />}
    </div>
  );
}

/* ── Under lg: samme akter, stablet ── */

function StartKompakt({ fase, ov, startet }) {
  const zoomet = useAapning(fase, startet);
  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 5' }} data-testid="v4-start-kompakt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KILDE.fasade.liten} alt="Bygården i Nygårdsgaten" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: KILDE.fasade.posLiten, transform: zoomet ? 'scale(1)' : 'scale(1.06)', transition: ov ? 'none' : 'transform 3600ms cubic-bezier(0.25, 0.6, 0.3, 1)' }} draggable={false} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0.12) 0%, rgba(21,19,15,0.04) 34%, rgba(21,19,15,0.52) 68%, rgba(21,19,15,0.84) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 p-5"><StartTekst fase={fase} kompakt inne={zoomet} ov={ov} /></div>
    </div>
  );
}

/* Kamerascenen på mobil — samme idé som på desktop, stående: fasaden bak (uskarp, dempet), teksten oppe til venstre,
   kamerautsnittet (4:3) som objekt, raden med fem plasser under. Ingen telefonkropp. */
function KameraKompakt({ fase, ov }) {
  const aktiv = iSoker(fase);
  const id = aktiv ? sokerId(fase) : OPPTAK[OPPTAK.length - 1];
  const k = aktiv ? OPPTAK.indexOf(id) + 1 : 5;
  const rest = fase === F.STABEL;
  const presser = !ov && fase >= F.FOTO2 && fase <= F.STABEL;
  const inn = fase === F.FOTO1;
  const linje = 'rgba(250,248,244,0.16)';
  const steg = (i) => ({ opacity: 1, transform: 'none', transition: ov ? 'none' : `opacity 600ms ${EASE} ${i}ms, transform 800ms ${EASE} ${i}ms` });
  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 5', background: '#15130F' }} data-testid="v4-soker-kompakt" data-rom={aktiv ? id : ''}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KILDE.fasade.liten} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: KILDE.fasade.posLiten, filter: 'blur(6px) brightness(0.8)', transform: 'scale(1.06)' }} draggable={false} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0.55) 0%, rgba(21,19,15,0.15) 40%, rgba(21,19,15,0.55) 100%)' }} />
      <div className="absolute inset-0 flex flex-col p-4" style={{ color: OFF }}>
        <p className="text-[11.5px] font-medium tabular-nums" style={{ color: 'rgba(244,241,234,0.58)', ...steg(inn ? 300 : 0) }}>01 · Annonsen</p>
        <Tekstbytte id={rest ? 'rest' : 'start'} ov={ov}>
          {(tid) => {
            const a = tid === 'rest' ? AKTER[1] : AKTER[0];
            return (
              <>
                <h3 className="mt-2 text-[28px]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1.0, color: OFF, textWrap: 'balance' }}>{a.tittel}</h3>
                {tid === 'rest' ? (
                  <ul className="mt-3 space-y-1.5">
                    {HANDLINGER.map((h, i) => (
                      <li key={h} className="flex items-center gap-2 text-[13.5px] animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-500" style={{ color: 'rgba(244,241,234,0.9)', animationDelay: `${400 + i * 480}ms` }}>
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: T.lilla, color: T.ink }}><Hake size={9} /></span>
                        {h}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[13.5px] leading-[1.45]" style={{ color: 'rgba(244,241,234,0.78)' }}>{a.tekst}</p>
                )}
              </>
            );
          }}
        </Tekstbytte>
        <div className="flex-1" />
        {/* Utsnittet */}
        {/* Utsnittet står også gjennom STABEL på mobil (siste bilde), så kortet ikke blir tomt */}
        <div className="relative overflow-hidden" style={{ borderRadius: 18, aspectRatio: '4 / 3', background: '#15130F', boxShadow: '0 40px 80px -40px rgba(0,0,0,0.8)', opacity: aktiv || rest ? 1 : 0, transform: aktiv || rest ? 'none' : 'translateX(32px) scale(0.95)', transition: ov ? 'none' : aktiv || rest ? `opacity 600ms ${EASE} ${inn ? 700 : 0}ms, transform 900ms ${MORF} ${inn ? 700 : 0}ms` : 'none' }} aria-hidden={!(aktiv || rest)}>
          {OPPTAK.map((rid) => {
            const rb = KILDE[rid]; const paa = rid === id;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={rid} src={rb.liten || rb.src} alt={rb.navn} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: rb.posLiten || rb.pos || '50% 50%', opacity: paa ? 1 : 0, transition: ov ? 'none' : `opacity 320ms ${EASE}`, animation: paa && !ov ? `v4-kamera ${(AUTO[fotoFase(rid)] || 900) + 400}ms cubic-bezier(0.25, 0.6, 0.3, 1) both` : 'none' }} draggable={false} aria-hidden={!paa} />
            );
          })}
          <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, transparent calc(33.33% - 0.5px), ${linje} calc(33.33% - 0.5px), ${linje} calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), ${linje} calc(66.66% - 0.5px), ${linje} calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(180deg, transparent calc(33.33% - 0.5px), ${linje} calc(33.33% - 0.5px), ${linje} calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), ${linje} calc(66.66% - 0.5px), ${linje} calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))` }} />
          <Autofokus id={aktiv ? id : null} fase={fase} ov={ov} />
          <div className="absolute" style={{ left: 12, top: 12 }}>
            <span className="inline-flex h-6 items-center gap-2 rounded-full pl-2 pr-2.5 text-[11px] font-medium tabular-nums" style={{ background: 'rgba(12,11,10,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)', color: 'rgba(250,248,244,0.96)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
              <span key={id} className="animate-in fade-in-0 duration-300">{KILDE[id].navn}</span>
              <span style={{ color: 'rgba(250,248,244,0.5)' }}>· {k} av 5</span>
            </span>
          </div>
          <div className="absolute" style={{ right: 14, top: '50%', width: 40, height: 40, marginTop: -20, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.92), 0 6px 20px -8px rgba(0,0,0,0.6)' }}>
            <div key={presser ? `p${fase}` : 'px'} className="absolute" style={{ inset: 4, borderRadius: '50%', background: '#fff', animation: presser ? 'v4-utloser 360ms cubic-bezier(0.3, 0, 0.2, 1) both' : 'none' }} />
          </div>
          <div key={presser ? `b${fase}` : 'bx'} aria-hidden="true" className="absolute inset-0" style={{ background: '#000', opacity: 0, animation: presser ? 'v4-blink-sort 240ms ease-out both' : 'none' }} />
        </div>
        {/* Raden: fem plasser som fylles etter hvert som bildene tas */}
        <div className="mt-3 grid grid-cols-5 gap-2" data-testid="v4-rull-kompakt">
          {OPPTAK.map((rid) => (
            <div key={rid} className="relative overflow-hidden rounded-[6px]" style={{ aspectRatio: '3 / 2', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.035)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={KILDE[rid].liten || KILDE[rid].src} alt={KILDE[rid].navn} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: KILDE[rid].posLiten || KILDE[rid].pos || '50% 50%', opacity: fase > fotoFase(rid) ? 1 : 0, transform: fase > fotoFase(rid) ? 'scale(1)' : 'scale(1.3)', transition: ov ? 'none' : `opacity 400ms ${EASE}, transform 700ms ${MORF}` }} draggable={false} />
            </div>
          ))}
        </div>
      </div>
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
  const kamera = iSoker(fase) || fase === F.STABEL;
  const akt = aktTekst(fase);
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-kompakt">
      <Vokse vis={start || kamera} ov={ov}>{kamera ? <KameraKompakt fase={fase} ov={ov} /> : <StartKompakt fase={fase} ov={ov} startet={startet} />}</Vokse>

      <Vokse vis={!start && !kamera} ov={ov}>
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
          <Vokse vis={fase >= F.LES1 && fase <= F.LES3} ov={ov}><div className="pt-5"><Fakta fase={fase} ov={ov} /></div></Vokse>
          <Vokse vis={fase >= F.KLAR && fase <= F.PUBLISERT} ov={ov}>
            <div className="pt-5"><AutoKnapp presser={fase === F.TRYKK} trykket={fase >= F.PUBLISERT} etter="Publisert på FINN.no" testid="v4-publiser" stor>Publiser på <Finn h={18} /></AutoKnapp></div>
          </Vokse>
          <Vokse vis={fase >= F.ETTER && fase < F.SLUTT} ov={ov}>
            <div className="pt-5"><AutoKnapp presser={fase === F.VELG} trykket={fase >= F.VALGT} etter="Emma er valgt" testid="v4-velg" stor>Velg Emma</AutoKnapp></div>
          </Vokse>
          <Vokse vis={fase >= F.SLUTT && !!neste} ov={ov}><div className="pt-5"><NesteBro aktiv={fase >= F.SLUTT} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></div></Vokse>
        </div>

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
      </Vokse>
    </div>
  );
}

/* `onFerdig` — kalles når sluttbildet har stått ferdig. Returnerer den true, tar forelderen over (neste kapittel);
   ellers looper filmen. `neste` = navnet på neste kapittel (vises i broen). */
/* `synlig` = seksjonen er i bildet (inngang). `spiller` = produktflaten er i bildet — klokken går bare da. */
export default function AnnonseFilm({ synlig, spiller = synlig, tema = 'mork', onFerdig, onFremdrift, neste = null }) {
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
  const felles = { fase, ov, startet, onAkt: tilAkt, onHold: setHoldt, neste };
  const blend = { opacity: morkt ? 0 : 1, transition: ov ? 'none' : `opacity 450ms ${EASE}` };

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
