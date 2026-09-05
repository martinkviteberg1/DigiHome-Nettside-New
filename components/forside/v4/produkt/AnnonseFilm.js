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

const F = {
  START: 0, PEKER: 1, HOVER: 2, TRYKK_START: 3,
  STABEL: 4, BILDER: 5,
  LES1: 6, LES2: 7, LES3: 8,
  STYLE: 9, SKILLE: 10, STYLET: 11,
  TITTEL: 12, TEKST: 13, PRIS: 14,
  KLAR: 15, TRYKK: 16, PUBLISERT: 17,
  INT1: 18, INT2: 19, BOOK1: 20, BOOK2: 21, SPM: 22,
  ETTER: 23, VELG: 24, VALGT: 25, SLUTT: 26,
};
const AUTO = {
  [F.START]: 1500, [F.PEKER]: 900, [F.HOVER]: 300, [F.TRYKK_START]: 340,
  [F.STABEL]: 2050, [F.BILDER]: 2700,
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


const AKTER = [
  { fra: F.STABEL, tittel: 'Begynn med bildene.', tekst: 'Fem bilder fra mobilen holder. Hvert rom kjennes igjen idet det lastes opp.' },
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
  { id: 'kjokken', src: '/v4/annonse/kjokken-600.webp', navn: 'Kjøkken', les: F.LES2 },
  { id: 'soverom', src: '/v4/annonse/soverom-useng-1000.webp', liten: '/v4/annonse/soverom-useng-700.webp', stylet: '/v4/annonse/soverom-1000.webp', styletLiten: '/v4/annonse/soverom-700.webp', navn: 'Soverom', les: F.LES3 },
  { id: 'spisestue', src: '/v4/annonse/spisestue-600.webp', navn: 'Spisestue' },
  /* Heroens bygård (Nygårdsgaten 5) i skumring, uten eieren — filmens verden fortsetter inn i produktet. Laget fra filmens første bilde (scripts/generer-variant.py fasade). */
  { id: 'fasade', src: '/v4/annonse/fasade-kveld-1920.webp', liten: '/v4/annonse/fasade-kveld-1200.webp', navn: 'Fasade', pos: '56% 46%', posLiten: '46% 50%', posFlis: '50% 58%' },
];
const KILDE = Object.fromEntries(FOTOS.map((b) => [b.id, b]));
/* Vinduet til Leilighet 2 i fasadebildet (andel av bildet: 75,5 % / 57 %) → andel av 3:2-kortet: bildet (1,75:1) dekker
   kortets høyde, er 116,7 % bredt og ligger −9,3 % (object-position 56 %). x = 0,755·1,1667 − 0,0933. */
const LEILIGHET = { x: 78.8, y: 57 };
const SMAA = ['kjokken', 'soverom', 'spisestue', 'fasade'];

/* Nåler — det systemet ser i hvert bilde. Prosent av bildeflaten (3:2). Kommer én og én mens kameraet driver. */
const PINNER = {
  stue: [
    { id: 'vinduer', x: 30, y: 37, t: 'Store vinduer' },
    { id: 'oy', x: 27, y: 65, t: 'Kjøkkenøy' },
    { id: 'parkett', x: 64, y: 84, t: 'Parkett' },
  ],
  kjokken: [
    { id: 'hvitevarer', x: 31, y: 70, t: 'Integrerte hvitevarer' },
    { id: 'oppvask', x: 22, y: 86, t: 'Oppvaskmaskin' },
    { id: 'spise', x: 84, y: 74, t: 'Spiseplass til fire' },
  ],
  soverom: [
    { id: 'seng', x: 42, y: 76, t: 'Uoppredd seng', tone: 'forslag', under: 'Forslag: re opp' },
    { id: 'garderobe', x: 92, y: 36, t: 'Garderobe' },
  ],
};
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

/* Brikkene i tekstspalten — det som hentes ut, i takt med nålene. `tone: 'forslag'` = lilla. */
const FAKTA = [
  { t: 'Store vinduer', fra: F.LES1 }, { t: 'Kjøkkenøy', fra: F.LES1 }, { t: 'Parkett', fra: F.LES1 },
  { t: 'Hvitevarer inkludert', fra: F.LES2 }, { t: 'Oppvaskmaskin', fra: F.LES2 }, { t: 'Spiseplass', fra: F.LES2 },
  { t: 'Garderobe', fra: F.LES3 }, { t: 'Re opp sengen', fra: F.LES3, tone: 'forslag' },
];
const PIN_DELAY = 620;   // avstand mellom nålene i samme bilde

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
  const linjer = [['Fra', 'ledig'], ['til', 'utleid.']];
  const steg = (i) => ({ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(16px)', filter: inne ? 'blur(0px)' : 'blur(8px)', transition: ov ? 'none' : inne ? `opacity 640ms ${EASE} ${i}ms, transform 820ms ${EASE} ${i}ms, filter 640ms ${EASE} ${i}ms` : `opacity 220ms ${EASE}, transform 220ms ${EASE}, filter 220ms ${EASE}` });
  let k = 0;
  return (
    <div className="text-left" data-testid="v4-start" style={{ color: OFF }}>
      <p className={`inline-flex items-center gap-2 rounded-full ${kompakt ? 'h-7 px-3 text-[12px]' : 'h-8 px-3.5 text-[13px]'}`} style={{ color: 'rgba(244,241,234,0.92)', background: 'rgba(21,19,15,0.30)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.20)', ...steg(140) }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />{kompakt ? ADRESSE : 'Nygårdsgaten 5 · Bergen'}</p>
      <h3 className={kompakt ? 'mt-3 text-[38px]' : 'mt-4 text-[clamp(44px,3.9vw,64px)]'} style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.96, color: OFF, textWrap: 'nowrap' }}>
        {linjer.map((linje, li) => (
          <span key={li} className="block">
            {linje.map((o, i) => { k += 1; return <span key={o} className="inline-block" style={{ ...steg(360 + k * 90), marginRight: i < linje.length - 1 ? '0.22em' : 0 }}>{o}</span>; })}
          </span>
        ))}
      </h3>
      <div className={`flex items-center ${kompakt ? 'mt-5' : 'mt-7'}`} style={steg(820)}>
        <AutoKnapp presser={fase === F.TRYKK_START} hover={!kompakt && hover} stor testid="v4-lag-annonse" knappRef={knappRef}>Lag annonse</AutoKnapp>
      </div>
    </div>
  );
}
/* Vignett — rolig dybde mot kantene mens bygården står */
const START_VIGNETT = 'radial-gradient(120% 95% at 50% 42%, rgba(21,19,15,0) 55%, rgba(21,19,15,0.38) 100%)';
/* Mørk, varm tone fra venstre der teksten står — nesten ingenting til høyre, så fasaden og de lyse vinduene får lyset */
const START_GRADIENT = 'linear-gradient(90deg, rgba(21,19,15,0.66) 0%, rgba(21,19,15,0.42) 34%, rgba(21,19,15,0.10) 62%, rgba(21,19,15,0.06) 100%), linear-gradient(180deg, rgba(21,19,15,0.18) 0%, rgba(21,19,15,0) 30%, rgba(21,19,15,0.22) 100%)';
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

function Pinne({ x, y, t, vis, delay = 0, ov, skala = 1, kamera, tone, under }) {
  const speil = x > 60;
  const forslag = tone === 'forslag';
  return (
    <span className="pointer-events-none absolute z-[2]" style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${1 / skala})`, transformOrigin: '0 0', transition: kamera || 'none' }}>
      <span
        className="flex items-center gap-2"
        style={{ flexDirection: speil ? 'row-reverse' : 'row', transform: `translate(${speil ? 'calc(-100% + 6px)' : '-6px'}, -50%) scale(${vis ? 1 : 0.96})`, opacity: vis ? 1 : 0, filter: vis ? 'blur(0px)' : 'blur(4px)', transition: ov ? 'none' : `opacity 420ms ${EASE} ${vis ? delay : 0}ms, transform 420ms ${EASE} ${vis ? delay : 0}ms, filter 420ms ${EASE} ${vis ? delay : 0}ms` }}
        aria-hidden={!vis}
        data-testid={`v4-pinne-${t}`}
      >
        <span className="relative h-3 w-3 shrink-0 rounded-full" style={{ background: forslag ? T.lilla : T.ink, boxShadow: '0 0 0 2.5px rgba(251,250,248,0.96), 0 2px 8px rgba(21,19,15,0.3)' }}>
          {vis && !ov && <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 1.5px rgba(251,250,248,0.9)', animation: `v4-ping 900ms cubic-bezier(0.2, 0.6, 0.2, 1) ${delay + 120}ms forwards`, opacity: 0 }} />}
        </span>
        <span className={`whitespace-nowrap font-medium ${under ? 'rounded-[12px] px-3 py-1.5 text-left' : 'rounded-full px-2.5 py-1'} text-[12px]`} style={{ ...GLASS, color: T.ink }}>
          {t}
          {under && <span className="block text-[11px] font-medium" style={{ color: '#7A3FB0' }}>{under}</span>}
        </span>
      </span>
    </span>
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
        <span key={pos} aria-hidden="true" className={`absolute h-5 w-5 ${pos} ${kant}`} style={{ borderColor: 'rgba(251,250,248,0.98)', filter: 'drop-shadow(0 1px 2px rgba(21,19,15,0.35))' }} />
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
              {PINNER[b.id].map((p, i) => (
                <Pinne key={p.id} x={p.x} y={p.y} t={p.t} tone={p.tone} under={p.under} vis={fase === KILDE[b.id].les} delay={520 + i * PIN_DELAY} ov={ov} skala={k.skala} kamera={k.transition} />
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
  const teller = {};
  const delay = FAKTA.map((x) => { teller[x.fra] = (teller[x.fra] || 0) + 1; return 520 + (teller[x.fra] - 1) * PIN_DELAY; });
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
  return { hel, tekst, omr, mosaikk, stabel, stor, banner, finnBilde, finnTekst, finnBeskrivelse, topp, smal: VW < 660 };
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

/* Ytelse — regelen for hele opplastingssekvensen: alt som beveger seg, beveger seg KUN med transform og opacity.
   Hver flis har en fast basisflate = bunkens størrelse (3:2), og glir til bunken/mosaikken med translate/rotate/scale.
   Ingen animert left/top/width/height, ingen animert blur eller skygge på bilder. Skyggen bytter i ett steg.
   `start` (bare fasaden): flisen er skalert opp så den dekker hele rammen — og krymper ned i bunken ved trykket. */
function bunkeTransform({ id, fase, L, ov, slot, z, start = false, base = L.stabel }) {
  const b = BUNKE[id];
  const iBunke = fase === F.STABEL; const iMosaikk = fase === F.BILDER; const foer = fase < F.STABEL;
  /* Mål-rektangel per fase → translate (senter til senter) + skala (bredde/bredde). Alle flater er 3:2. */
  const til = (r, skala = 1) => {
    const sc = (r.w / base.w) * skala;
    const dx = (r.x + r.w / 2) - (base.x + base.w / 2); const dy = (r.y + r.h / 2) - (base.y + base.h / 2);
    return { dx, dy, sc };
  };
  const bunke = { x: L.stabel.x + b.dx, y: L.stabel.y + b.dy, w: L.stabel.w, h: L.stabel.h };
  let transform; let overgang = 'none'; let radius = 12;
  if (foer && start) {
    /* Dekker rammen: skalert til rammens bredde, sentrert. Radius 0 (kortets kanter ligger utenfor rammen). */
    const k = til({ x: 0, y: (L.hel.h - L.hel.w / 1.5) / 2, w: L.hel.w, h: L.hel.w / 1.5 });
    transform = `translate(${k.dx}px, ${k.dy}px) rotate(0deg) scale(${k.sc})`; radius = 0;
    overgang = ov ? 'none' : `transform 1100ms ${MORF}, border-radius 1100ms ${MORF}`;
  } else if (foer) {
    const k = til({ ...bunke, y: bunke.y + 96 }, 0.9);
    transform = `translate(${k.dx}px, ${k.dy}px) rotate(${b.rot - 7}deg) scale(${k.sc})`; radius = 12 / k.sc;
  } else if (iBunke) {
    const k = til(bunke);
    transform = `translate(${k.dx}px, ${k.dy}px) rotate(${b.rot}deg) scale(${k.sc})`; radius = 12 / k.sc;
    overgang = ov ? 'none' : start ? `transform 1100ms ${MORF}, border-radius 1100ms ${MORF}, opacity 420ms ${EASE}` : `opacity 420ms ${EASE} ${b.delay}ms, transform 760ms ${LANDING} ${b.delay}ms`;
  } else if (iMosaikk) {
    const k = til(slot);
    transform = `translate(${k.dx}px, ${k.dy}px) rotate(0deg) scale(${k.sc})`; radius = 10 / k.sc;
    overgang = ov ? 'none' : `transform 950ms ${MORF} ${z * 45}ms, border-radius 950ms ${MORF} ${z * 45}ms`;
  } else {
    const k = til(slot, 0.94);
    transform = `translate(${k.dx}px, ${k.dy}px) rotate(0deg) scale(${k.sc})`; radius = 10 / k.sc;
    overgang = ov ? 'none' : `opacity 480ms ${EASE} ${z * 40}ms, transform 600ms ${EASE} ${z * 40}ms`;
  }
  return {
    left: base.x, top: base.y, width: base.w, height: base.h,
    transform, transformOrigin: '50% 50%', borderRadius: radius,
    opacity: iBunke || iMosaikk || (start && foer) ? 1 : 0,
    boxShadow: iBunke ? SKYGGE_LOFT : start && foer ? 'none' : SKYGGE_FLAT,
    background: 'rgba(21,19,15,0.05)', transition: overgang, zIndex: z,
    willChange: 'transform, opacity',
  };
}

/* Romnavn på flisen — kommer etter at bunken har sortert seg */
function Romlapp({ navn, vis, delay, ov }) {
  return <Lapp vis={vis} delay={delay} ov={ov} className="left-2.5 top-2.5">{navn}</Lapp>;
}

/* Stuen som flis (≤ BILDER): lander sist i bunken (øverst) og blir det store bildet i mosaikken — kun transform.
   Ved LES1 tar det store bildet (Foto) over på nøyaktig samme rektangel, uten overgang: samme piksler, ingen sømmer. */
function StueFlis({ fase, L, ov }) {
  const inne = fase >= F.STABEL && fase <= F.BILDER;
  const st = bunkeTransform({ id: 'stue', fase, L, ov, slot: L.mosaikk.stor, z: 6 });
  if (fase > F.BILDER) { st.transition = 'none'; st.opacity = 0; }
  return (
    <div className="absolute overflow-hidden" style={st} aria-hidden={!inne} data-testid="v4-stue-flis">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KILDE.stue.src} alt="Stuen" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 50%' }} draggable={false} />
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
  const overgang = ov || foer ? 'none' : [m('left', 1100), m('top', 1100), m('width', 1100), m('height', 1100), t('opacity', 500), t('box-shadow', 700), t('border-radius', 800)].join(', ');
  return (
    <div
      className="absolute overflow-hidden"
      style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: banner ? '14px 14px 0 0' : finn ? 10 : foer ? 10 : 14, opacity: inne ? 1 : 0, background: 'rgba(21,19,15,0.05)', boxShadow: stor ? '0 40px 90px -40px rgba(21,19,15,0.45)' : banner || finn ? 'none' : SKYGGE_FLAT, transition: fase === F.LES1 ? overgang.replace(t('opacity', 500), 'opacity 0ms linear') : overgang, zIndex: 2, transform: 'rotate(0deg)' }}
      aria-hidden={!inne}
      data-testid="v4-foto"
      data-bilde={fase >= F.STYLET ? 'stylet' : viserBilde(fase)}
    >
      {fase >= F.LES1 || fase === F.BILDER ? <Bildeflate fase={fase} ov={ov} onHold={onHold} pos={banner ? '50% 55%' : '50% 50%'} /> : null}
    </div>
  );
}

/* Bygården — dekker rammen i åpningen (stille zoom inni), krymper ned i bunken som det første bildet ved trykket,
   glir så til «Fasade»-plassen i mosaikken og følger de andre små ut. Alt med transform. Tonene over bildet
   (gradient, vignett, eksponering) ligger i egne fullramme-lag i Desktop — de skal ikke skaleres med kortet. */
function Fasade({ fase, L, ov }) {
  const start = fase <= F.TRYKK_START;
  const inne = fase <= F.BILDER;
  const b = KILDE.fasade;
  const [zoomet, setZoomet] = useState(false);
  useEffect(() => {
    if (fase !== F.START) return undefined;
    setZoomet(false);
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setZoomet(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [fase]);
  /* Basisflaten er den store 3:2-flaten (skarp når kortet dekker rammen, ~1,6×) — skaleres ned til bunken og mosaikken. */
  const st = bunkeTransform({ id: 'fasade', fase, L, ov, slot: L.mosaikk.smaa[3], z: start ? 3 : 1, start: true, base: L.stor });
  /* Kameraet i åpningen: svakt inn og en anelse sideveis (1.05 → 1, 1,2 % → 0) over 3,8 s. Nålen ligger i kameralaget
     og følger bildet; motskaleres med kortets skala (rammen/basis) × kameraets, så den holder ekte størrelse. */
  const KAM = 'cubic-bezier(0.25, 0.6, 0.3, 1)';
  const sd = L.hel.w / L.stor.w;
  const kamera = start ? (zoomet ? 'translate(0%, 0%) scale(1)' : 'translate(1.2%, 0%) scale(1.05)') : 'translate(0%, 0%) scale(1)';
  const skala = start ? sd * (zoomet ? 1 : 1.05) : 1;
  return (
    <div className="absolute overflow-hidden" style={st} aria-hidden={!inne} data-testid="v4-fasade" data-start={start ? '1' : '0'}>
      <div className="absolute inset-0" style={{ transform: kamera, transition: ov ? 'none' : start ? `transform 3800ms ${KAM}` : `transform 1100ms ${MORF}`, willChange: 'transform' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.src} alt="Bygården i Nygårdsgaten" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: b.pos }} draggable={false} />
        {/* Leiligheten som blir ledig — pekt ut på fasaden, i samme nålespråk som detaljene senere i filmen */}
        <Pinne x={LEILIGHET.x} y={LEILIGHET.y} t="Leilighet 2" under="Ledig fra 1. november" vis={fase <= F.HOVER} delay={fase === F.START ? 760 : 0} ov={ov} skala={skala} kamera={ov ? 'none' : start ? `transform 3800ms ${KAM}` : 'none'} />
      </div>
    </div>
  );
}

/* Tonene over åpningsbildet — fullramme, kun opacity. Eksponering: bildet kommer opp fra mørkt, som en film som starter. */
function StartToner({ fase, ov }) {
  const start = fase <= F.TRYKK_START;
  const [zoomet, setZoomet] = useState(false);
  useEffect(() => {
    if (fase !== F.START) return undefined;
    setZoomet(false);
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setZoomet(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [fase]);
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4]" style={{ background: START_GRADIENT, opacity: start ? 1 : 0, transition: ov ? 'none' : `opacity ${start ? 600 : 500}ms ${EASE}` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4]" style={{ background: START_VIGNETT, opacity: start ? 1 : 0, transition: ov ? 'none' : `opacity ${start ? 600 : 400}ms ${EASE}` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4]" style={{ background: START_EKSPONERING, opacity: start && !zoomet ? 0.72 : 0, transition: ov ? 'none' : 'opacity 1300ms cubic-bezier(0.3, 0, 0.2, 1)' }} />
    </>
  );
}

/* De tre andre små (fasaden er sitt eget element). Lander i bunken, glir ut i mosaikken — kun transform. */
function Smaa({ fase, L, ov }) {
  const inne = fase === F.STABEL || fase === F.BILDER;
  return SMAA.filter((id) => id !== 'fasade').map((id, i) => {
    const b = KILDE[id];
    const st = bunkeTransform({ id, fase, L, ov, slot: L.mosaikk.smaa[i], z: 2 + i });
    return (
      <div key={id} className="absolute overflow-hidden" style={st} aria-hidden={!inne} data-testid={`v4-mosaikk-${id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.src} alt={b.navn} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
      </div>
    );
  });
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

/* Telleren — «Laster opp · 3 av 5» mens bildene lander, «5 bilder · rom gjenkjent» når de har sortert seg.
   Kun opacity/transform (ingen blur, ingen animert bredde) — den skal aldri hakke mens bunken beveger seg. */
function Teller({ fase, L, ov }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (fase !== F.STABEL) { setN(fase > F.STABEL ? 5 : 0); return undefined; }
    setN(0);
    const tider = [1000, BUNKE.kjokken.delay + 700, BUNKE.soverom.delay + 700, BUNKE.spisestue.delay + 700, BUNKE.stue.delay + 700];
    const ids = tider.map((ms, i) => window.setTimeout(() => setN(i + 1), ms));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [fase]);
  const vis = fase === F.STABEL || fase === F.BILDER;
  const ferdig = fase === F.BILDER;
  return (
    <div className="absolute z-[7]" style={{ left: L.omr.x, top: L.omr.y + L.omr.h - 32, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: ov ? 'none' : `opacity 400ms ${EASE} ${vis ? 250 : 0}ms, transform 400ms ${EASE}`, willChange: 'transform, opacity' }} aria-hidden={!vis} data-testid="v4-teller" data-n={n}>
      <div className="inline-flex h-8 items-center gap-2.5 rounded-full pl-3 pr-3.5 text-[12.5px] font-medium" style={{ background: 'rgba(251,250,248,0.98)', boxShadow: `inset 0 0 0 1px ${HAIR}, 0 6px 20px -10px rgba(21,19,15,0.3)`, color: T.ink }}>
        {ferdig ? <span style={{ color: '#166B3C' }}><Hake size={13} /></span> : <span className="relative block h-[2px] w-9 overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.12)' }}><span className="absolute inset-y-0 left-0 w-full rounded-full" style={{ background: T.ink, transform: `scaleX(${n / 5})`, transformOrigin: '0 50%', transition: ov ? 'none' : `transform 350ms ${EASE}` }} /></span>}
        <span key={ferdig ? 'f' : n} className="animate-in fade-in-0 duration-300">{ferdig ? '5 bilder · rom gjenkjent' : `Laster opp · ${n} av 5`}</span>
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

function Desktop({ fase, ov, onAkt, onHold, neste }) {
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
  const folk = fase >= F.INT1 && fase < F.SLUTT;
  const slutt = fase >= F.SLUTT;
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);
  const knapper = useRef({});
  const peker = usePeker(fase, ref, knapper, PEKER_MAAL, PRESSER);

  return (
    <div ref={ref} className="relative overflow-hidden text-[#15130F]" style={{ height: H, background: PAPIR }} data-testid="v4-annonse-desktop">
      {L && <Fasade fase={fase} L={L} ov={ov} />}
      {L && <StartToner fase={fase} ov={ov} />}
      {L && <StueFlis fase={fase} L={L} ov={ov} />}
      {L && <Foto fase={fase} L={L} ov={ov} onHold={onHold} />}

      {/* Åpningsteksten — i venstre spalte, der aktenes tekst står. Kommer inn ord for ord; går raskt ut i trykket. */}
      <div className="absolute z-[5]" style={{ left: P, top: L ? L.tekst.y : P + 96, width: L ? L.tekst.w + 40 : 400, pointerEvents: start ? 'auto' : 'none' }} aria-hidden={!start}>
        <StartTekst fase={fase} inne={start} ov={ov} knappRef={(el) => { knapper.current.start = el; }} />
      </div>

      {L && (
        <div style={{ opacity: start ? 0 : 1, transition: `opacity ${bt(700, start ? 0 : 420)}` }} aria-hidden={start}>
          <Tekstspalte fase={fase} L={L} ov={ov} onAkt={onAkt} knapper={knapper} neste={neste} />
          <KortLag fase={fase} L={L} ov={ov} />
          <Smaa fase={fase} L={L} ov={ov} />
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

function StartKompakt({ fase, ov }) {
  const [zoomet, setZoomet] = useState(false);
  useEffect(() => {
    if (fase !== F.START) return undefined;
    setZoomet(false);
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setZoomet(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [fase]);
  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 5' }} data-testid="v4-start-kompakt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KILDE.fasade.liten} alt="Bygården i Nygårdsgaten" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: KILDE.fasade.posLiten, transform: zoomet ? 'scale(1)' : 'scale(1.06)', transition: ov ? 'none' : 'transform 3600ms cubic-bezier(0.25, 0.6, 0.3, 1)' }} draggable={false} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0.12) 0%, rgba(21,19,15,0.04) 34%, rgba(21,19,15,0.52) 68%, rgba(21,19,15,0.84) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 p-5"><StartTekst fase={fase} kompakt inne={zoomet} ov={ov} /></div>
    </div>
  );
}

function MosaikkKompakt({ fase, ov }) {
  const inne = fase === F.STABEL || fase === F.BILDER;
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

function Kompakt({ fase, ov, onAkt, onHold, neste }) {
  const start = fase <= F.TRYKK_START;
  const akt = aktTekst(fase);
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-kompakt">
      <Vokse vis={start} ov={ov}><StartKompakt fase={fase} ov={ov} /></Vokse>

      <Vokse vis={!start} ov={ov}>
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
          <Vokse vis={fase === F.STABEL || fase === F.BILDER} ov={ov}><MosaikkKompakt fase={fase} ov={ov} /></Vokse>
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
  const felles = { fase, ov, onAkt: tilAkt, onHold: setHoldt, neste };
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
