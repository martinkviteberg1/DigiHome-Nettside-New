'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall } from '../motion';

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

const PAPIR = '#FBFAF8';
const HVIT = '#FFFFFF';
const STEIN = '#F3F1EC';
const HAIR = 'rgba(21,19,15,0.08)';
const DIM = 'rgba(21,19,15,0.55)';
const H = 660;          // rammens høyde
const P = 48;           // rammens indre marg
const HVIL = 44;        // hvor skillelinjen hviler (prosent fra venstre)
const KW = 176;         // «Lag annonse»-knappen (åpningen) — bredde
const KH = 54;          // … og høyde
const ADRESSE = 'Nygårdsgaten 5, leilighet 2 · ledig fra 1. november';
const OFF = '#F4F1EA';  // brukes av den gamle åpningen til den nye er på plass

const F = {
  START: 0, TRYKK_START: 1,
  BILDER: 2,
  LES1: 3, LES2: 4, LES3: 5, FAKTA: 6,
  STYLE: 7, SKILLE: 8, STYLET: 9,
  TITTEL: 10, TEKST: 11, PRIS: 12,
  KLAR: 13, TRYKK: 14, PUBLISERT: 15,
  INT1: 16, INT2: 17, BOOK1: 18, BOOK2: 19, SPM: 20,
  ETTER: 21, VELG: 22, VALGT: 23, SLUTT: 24,
};
const AUTO = {
  [F.START]: 2600, [F.TRYKK_START]: 380,
  [F.BILDER]: 2700,
  [F.LES1]: 1900, [F.LES2]: 1600, [F.LES3]: 1600, [F.FAKTA]: 1500,
  [F.STYLE]: 1200, [F.SKILLE]: 2800, [F.STYLET]: 2000,
  [F.TITTEL]: 1000, [F.TEKST]: 1100, [F.PRIS]: 1700,
  [F.KLAR]: 1500, [F.TRYKK]: 300, [F.PUBLISERT]: 3000,
  [F.INT1]: 1300, [F.INT2]: 1100, [F.BOOK1]: 1900, [F.BOOK2]: 1800, [F.SPM]: 1500,
  [F.ETTER]: 1800, [F.VELG]: 300, [F.VALGT]: 2800, [F.SLUTT]: 2600,
};
const SISTE = F.SLUTT;

const AKTER = [
  { fra: F.BILDER, tittel: 'Last opp bildene.', tekst: 'Ta dem med mobilen — fem bilder holder. Resten begynner her.' },
  { fra: F.LES1, tittel: 'Bildene leses — detalj for detalj.', tekst: 'Hver detalj kan spores tilbake til et bilde. Så hentes resten fra boligen og leieavtalen.' },
  { fra: F.STYLE, tittel: 'Bildene styles.', tekst: 'Sengen res opp og rotet ryddes — samme rom, samme seng, på sitt beste. Merkes alltid som redigert.' },
  { fra: F.TITTEL, tittel: 'Annonsen skriver seg selv.', tekst: 'Overskrift, tekst og prisforslag — fra det bildene og boligen forteller. Du kan endre alt.' },
  { fra: F.KLAR, tittel: 'Ett trykk — og den ligger på FINN.', tekst: 'Du ser gjennom og godkjenner. Spørsmål og interessenter går rett inn i DigiHome.' },
  { fra: F.INT1, tittel: 'Interessentene booker visning selv.', tekst: 'De legitimerer seg med BankID, velger et ledig tidspunkt og får bekreftelse på SMS. Du bare møter opp.' },
  { fra: F.ETTER, tittel: 'Du velger. Kontrakten går til signering.', tekst: 'Inntekt og referanse er dokumentert. Ett trykk — kontrakten fylles ut fra annonsen og sendes til BankID.' },
];
const SLUTT = { tittel: 'Fra ledig til utleid.', tekst: 'Seks dager. Tre trykk fra deg — resten gjorde systemet, og du så alt underveis.' };
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
  { id: 'fasade', src: '/v4/bolig-oslo-1200.webp', navn: 'Fasade', pos: '20% 45%' },
];
const KILDE = Object.fromEntries(FOTOS.map((b) => [b.id, b]));
const SMAA = ['kjokken', 'soverom', 'spisestue', 'fasade'];

/* Nåler — det systemet ser i hvert bilde. Prosent av bildeflaten (3:2). */
const PINNER = {
  stue: [
    { x: 30, y: 37, t: 'Store vinduer' },
    { x: 27, y: 65, t: 'Kjøkkenøy' },
    { x: 64, y: 84, t: 'Parkett' },
  ],
  kjokken: [
    { x: 31, y: 70, t: 'Integrert ovn' },
    { x: 84, y: 74, t: 'Spiseplass' },
  ],
  soverom: [
    { x: 42, y: 76, t: 'Dobbeltseng' },
    { x: 92, y: 36, t: 'Garderobe' },
  ],
};

/* Brikkene i tekstspalten — det som hentes ut */
const FAKTA = [
  { t: 'Parkett', fra: F.LES1 }, { t: 'Kjøkkenøy', fra: F.LES1 }, { t: 'Store vinduer', fra: F.LES1 },
  { t: 'Integrert ovn', fra: F.LES2 }, { t: 'Spiseplass', fra: F.LES2 },
  { t: '1 soverom', fra: F.LES3 }, { t: 'Dobbeltseng', fra: F.LES3 }, { t: 'Garderobe', fra: F.LES3 },
  { t: '54 m²', fra: F.FAKTA, kilde: 'bolig' }, { t: '2. etasje', fra: F.FAKTA, kilde: 'bolig' }, { t: 'Ledig 1. nov', fra: F.FAKTA, kilde: 'avtale' },
];

const ANNONSE = {
  tittel: 'Lys 2-roms med åpen kjøkkenløsning i Nygårdsgaten',
  spes: '54 m² · 1 soverom · 2. etasje · parkett · ledig 1. november',
};
const BRODTEKST_REN = 'Lys 2-roms i klassisk bygård. Åpen kjøkkenløsning med kjøkkenøy, integrert ovn og spiseplass, parkett og store vinduer mot rolig gate. Soverom med dobbeltseng og garderobe. Ledig fra 1. november.';

/* Interessentene — ekte portretter */
const FOLK = [
  {
    n: 'Emma Sørensen', bilde: '/v4/annonse/leietaker-emma.webp', fra: F.INT1,
    d: (f) => (f >= F.VALGT ? 'Kontrakt sendt · signeres med BankID' : f >= F.ETTER ? 'Visning gjennomført · ønsker 3 års leie' : f >= F.BOOK1 ? 'Visning tirsdag 17:30 · bekreftet på SMS' : 'Meldte interesse via FINN · ønsker fra 1. nov'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt', 'Referanse'] : f >= F.BOOK1 ? ['BankID', 'Inntekt'] : ['BankID']),
    chip: (f) => (f >= F.VALGT ? ['Kontrakt sendt', 'gronn'] : f >= F.ETTER ? ['Anbefalt', 'lilla'] : f >= F.BOOK1 ? ['Visning 17:30', 'noytral'] : null),
  },
  {
    n: 'Martin Berg', bilde: '/v4/annonse/leietaker-martin.webp', fra: F.INT2,
    d: (f) => (f >= F.VALGT ? 'Varslet · boligen er reservert' : f >= F.ETTER ? 'Visning gjennomført' : f >= F.BOOK2 ? 'Visning tirsdag 18:00 · bekreftet på SMS' : 'Meldte interesse via FINN'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt'] : ['BankID']),
    chip: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : f >= F.BOOK2 ? ['Visning 18:00', 'noytral'] : null),
  },
  {
    n: 'Sara Haugen', bilde: '/v4/annonse/leietaker-sara.webp', fra: F.SPM,
    d: (f) => (f >= F.VALGT ? 'Varslet · boligen er reservert' : 'Spurte om husdyr via FINN · besvart fra annonsen'),
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
  { id: 'e2', til: 'Emma', fra: F.VALGT, tilOg: F.SLUTT, tid: 'i dag 10:05', tekst: 'Gratulerer, Emma! Leiekontrakten for Nygårdsgaten 5 er klar. Signer med BankID i DigiHome. – DigiHome' },
];

const TONE = {
  noytral: { background: 'rgba(21,19,15,0.06)', color: 'rgba(21,19,15,0.72)' },
  lilla: { background: 'rgba(212,150,255,0.22)', color: T.ink },
  gronn: { background: 'rgba(31,157,85,0.14)', color: '#166B3C' },
};

/* ── Små byggeklosser ── */

function Hake({ size = 14 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* FINN-logoen (ekte): mørkeblått blad + lyseblått felt med FINN, hvit kant. viewBox 184×64. */
function Finn({ h = 16, className = '' }) {
  const w = Math.round((h * 184) / 64);
  return (
    <svg role="img" aria-label="FINN" width={w} height={h} viewBox="0 0 184 64" className={`inline-block shrink-0 align-middle ${className}`}>
      <path fill="#06bffc" d="M179.8 58V6c0-1-.8-1.9-1.9-1.9H66c-1 0-1.9.8-1.9 1.9v53.8H178c1 0 1.8-.8 1.8-1.8" />
      <path fill="#0063fc" d="M22.5 4.2H6C5 4.2 4.2 5 4.2 6v52c0 1 .8 1.9 1.9 1.9H60V41.5C59.9 20.9 43.2 4.2 22.5 4.2" />
      <path fill="#fff" d="M178 0H66c-3.3 0-6 2.7-6 6v17.4C53.2 9.6 38.9 0 22.5 0H6C2.7 0 0 2.7 0 6v52c0 3.3 2.7 6 6 6h172c3.3 0 6-2.7 6-6V6c0-3.3-2.7-6-6-6m1.8 58c0 1-.8 1.9-1.9 1.9H64.1V6c0-1 .8-1.9 1.9-1.9h112c1 0 1.9.8 1.9 1.9v52zM4.2 58V6C4.2 5 5 4.2 6 4.2h16.5c20.6 0 37.4 16.8 37.4 37.4v18.3H6c-1-.1-1.8-.9-1.8-1.9" />
      <path fill="#fff" d="M110.1 21.1h-4.2c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2V22.3c0-.6-.6-1.2-1.2-1.2m-12 0H83c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2v-4h7.7c.7 0 1.2-.5 1.2-1.2v-3.2c0-.7-.5-1.2-1.2-1.2h-7.7v-4.9h9.7c.7 0 1.2-.5 1.2-1.2v-3.7c0-.5-.6-1.1-1.2-1.1m62.8 0h-4.2c-.7 0-1.2.5-1.2 1.2v9.5l-6.6-10c-.3-.4-.8-.7-1.3-.7h-3.2c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2v-9.4l6.5 9.8c.3.4.8.7 1.3.7h3.4c.7 0 1.2-.5 1.2-1.2V22.3c-.1-.6-.6-1.2-1.3-1.2m-25.4 0h-4.2c-.7 0-1.2.5-1.2 1.2v9.5l-6.6-10c-.3-.4-.8-.7-1.3-.7H119c-.7 0-1.2.5-1.2 1.2v19.3c0 .7.5 1.2 1.2 1.2h4.2c.7 0 1.2-.5 1.2-1.2v-9.4l6.5 9.8c.3.4.8.7 1.3.7h3.4c.7 0 1.2-.5 1.2-1.2V22.3c-.1-.6-.6-1.2-1.3-1.2" />
    </svg>
  );
}

function Portrett({ src, alt, size = 40, className = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} draggable={false} />
  );
}

function Inn({ vis, delay = 0, y = 10, children, className = '', ov, style }) {
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? delay : 0}ms, transform 500ms ${EASE} ${vis ? delay : 0}ms`, pointerEvents: vis ? 'auto' : 'none', ...style }} aria-hidden={!vis}>
      {children}
    </div>
  );
}

function Vokse({ vis, children, className = '', ov, delay = 150 }) {
  return (
    <div className={`grid ${className}`} style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: ov ? 'none' : `grid-template-rows 600ms ${EASE}` }} aria-hidden={!vis}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? delay : 0}ms, transform 500ms ${EASE} ${vis ? delay : 0}ms` }}>{children}</div>
      </div>
    </div>
  );
}

function Chip({ tekst, tone = 'noytral', liten = false, className = '', testid }) {
  const hake = tone === 'gronn';
  return (
    <span key={tekst} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-medium animate-in fade-in-0 duration-300 ${liten ? 'text-[11.5px]' : 'text-[12px]'} ${className}`} style={{ ...TONE[tone], height: liten ? 24 : 28 }} data-testid={testid}>
      {hake ? <Hake size={12} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone === 'lilla' ? T.lilla : 'rgba(21,19,15,0.35)' }} />}
      {tekst}
    </span>
  );
}

function Lapp({ vis, children, className = '', delay = 0, testid, ov }) {
  return (
    <span className={`absolute z-[4] inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium ${className}`} style={{ background: 'rgba(251,250,248,0.92)', color: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(4px)', transition: ov ? 'none' : `opacity 400ms ${EASE} ${vis ? delay : 0}ms, transform 400ms ${EASE} ${vis ? delay : 0}ms` }} aria-hidden={!vis} data-testid={testid}>
      {children}
    </span>
  );
}

function Dok({ liste }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {liste.map((d) => (
        <span key={d} className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-medium animate-in fade-in-0 duration-300" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C' }}><Hake size={9} />{d}</span>
      ))}
    </span>
  );
}

/* Knapp som trykkes av seg selv */
function AutoKnapp({ presser, trykket, children, etter, testid, stor = false }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium ${stor ? 'h-12 rounded-[12px] px-6 text-[15px]' : 'h-10 rounded-[10px] px-4 text-[14px]'}`}
      style={{ background: trykket ? 'rgba(212,150,255,0.55)' : presser ? T.lillaHover : T.lilla, color: T.ink, transform: presser ? 'scale(0.95)' : 'none', transition: `transform 200ms ${EASE}, background-color 200ms ${EASE}, box-shadow 300ms ${EASE}`, boxShadow: stor && !presser && !trykket ? '0 18px 40px -22px rgba(160,90,220,0.55)' : 'none' }}
      data-testid={testid}
      data-trykket={trykket ? '1' : '0'}
    >
      {trykket ? <><Hake />{etter}</> : children}
    </span>
  );
}

function G({ children }) {
  return <span style={{ textDecoration: 'underline dotted', textDecorationColor: 'rgba(160,90,220,0.7)', textUnderlineOffset: 4, textDecorationThickness: 1.5 }}>{children}</span>;
}
const Brodtekst = () => (
  <>Lys 2-roms i klassisk bygård. Åpen kjøkkenløsning med <G>kjøkkenøy</G>, <G>integrert ovn</G> og <G>spiseplass</G>, <G>parkett</G> og <G>store vinduer</G> mot rolig gate. Soverom med <G>dobbeltseng</G> og <G>garderobe</G>. Ledig fra 1. november.</>
);

/* Sekvensielt tekstbytte: det gamle går ut (240 ms), så kommer det nye inn — aldri to tekster samtidig. */
function Tekstbytte({ id, ov, children, className = '' }) {
  const [vist, setVist] = useState(id);
  const [ut, setUt] = useState(false);
  useEffect(() => {
    if (id === vist) return undefined;
    if (ov) { setVist(id); return undefined; }
    setUt(true);
    const t = window.setTimeout(() => { setVist(id); setUt(false); }, 240);
    return () => window.clearTimeout(t);
  }, [id, vist, ov]);
  return (
    <div className={className} style={{ opacity: ut ? 0 : 1, transform: ut ? 'translateY(-6px)' : 'none', transition: ov ? 'none' : ut ? `opacity 240ms ${EASE}, transform 240ms ${EASE}` : `opacity 560ms ${EASE} 40ms, transform 560ms ${EASE} 40ms` }} data-testid="v4-tekstbytte" data-vist={vist}>
      {children(vist)}
    </div>
  );
}

/* ── Åpningen: boligen fyller rammen, én setning, én knapp ── */
function StartTekst({ fase, kompakt = false }) {
  return (
    <div data-testid="v4-start" style={{ color: OFF }}>
      <p className={kompakt ? 'text-[12.5px]' : 'text-[13.5px]'} style={{ color: 'rgba(244,241,234,0.72)' }}>Nygårdsgaten 5 · Leilighet 2</p>
      <h3 className={kompakt ? 'mt-1.5 text-[34px]' : 'mt-2 text-[clamp(36px,3.4vw,54px)]'} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.0, color: OFF }}>Ledig fra 1. november.</h3>
      <div className={`flex items-center gap-4 ${kompakt ? 'mt-5' : 'mt-7'}`}>
        <AutoKnapp presser={fase === F.TRYKK_START} stor testid="v4-lag-annonse">Lag annonse</AutoKnapp>
        <span className="text-[12.5px]" style={{ color: 'rgba(244,241,234,0.62)' }}>Trykk 1 av 3</span>
      </div>
    </div>
  );
}
const START_GRADIENT = 'linear-gradient(180deg, rgba(21,19,15,0.10) 0%, rgba(21,19,15,0.02) 38%, rgba(21,19,15,0.30) 66%, rgba(21,19,15,0.70) 100%)';

/* ── Bildeflaten — bildene, nålene og før/etter-skillet ── */
function navnFor(fase) {
  if (fase === F.LES1) return 'Stue';
  if (fase === F.LES2) return 'Kjøkken';
  if (fase >= F.LES3 && fase <= F.STYLET) return 'Soverom';
  return null;
}
function viserBilde(fase) {
  if (fase === F.LES2) return 'kjokken';
  if (fase >= F.LES3) return 'soverom';
  return 'stue';
}

function Pinne({ x, y, t, vis, delay = 0, ov }) {
  const speil = x > 60;
  return (
    <span
      className="pointer-events-none absolute z-[2] flex items-center gap-2"
      style={{ left: `${x}%`, top: `${y}%`, flexDirection: speil ? 'row-reverse' : 'row', transform: `translate(${speil ? 'calc(-100% + 6px)' : '-6px'}, -50%) scale(${vis ? 1 : 0.96})`, opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity 420ms ${EASE} ${vis ? delay : 0}ms, transform 420ms ${EASE} ${vis ? delay : 0}ms` }}
      aria-hidden={!vis}
    >
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: T.ink, boxShadow: '0 0 0 2.5px rgba(251,250,248,0.96), 0 2px 8px rgba(21,19,15,0.3)' }} />
      <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium" style={{ background: 'rgba(251,250,248,0.94)', color: T.ink, boxShadow: '0 1px 6px rgba(21,19,15,0.12)' }}>{t}</span>
    </span>
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
  const linje = fase === F.SKILLE || fase === F.STYLET;
  const kanDra = fase === F.SKILLE;
  const navn = navnFor(fase);
  const bildeStil = { objectPosition: objPos, transition: ov ? 'none' : `opacity 550ms ${EASE}, object-position 950ms ${EASE}` };

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
      {lag.map((b) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={b.id} src={b.src} alt={b.alt} className="absolute inset-0 h-full w-full object-cover" style={{ ...bildeStil, opacity: naa === b.id ? 1 : 0 }} draggable={false} data-testid={`v4-bilde-${b.id}`} />
      ))}
      {/* Stylet — klippes fra venstre; skillet er kanten */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={liten ? KILDE.soverom.styletLiten : KILDE.soverom.stylet} alt="Soverommet, stylet med KI" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: objPos, clipPath: `inset(0 0 0 ${pos}%)`, transition: ov ? 'none' : `${dur ? `clip-path ${dur}ms ${EASE}, ` : ''}object-position 950ms ${EASE}` }} draggable={false} data-testid="v4-bilde-stylet" />

      {/* Nåler */}
      {Object.entries(PINNER).map(([id, liste]) => liste.map((p, i) => (
        <Pinne key={`${id}-${i}`} {...p} vis={fase === KILDE[id].les} delay={i * 240} ov={ov} />
      )))}

      {/* Skillelinjen */}
      <div className="absolute inset-y-0 z-[3]" style={{ left: `${pos}%`, width: 0, opacity: linje ? 1 : 0, transition: ov ? 'none' : `left ${dur}ms ${EASE}, opacity ${fase === F.STYLET ? `700ms ${EASE} 700ms` : `400ms ${EASE}`}` }} aria-hidden={!linje} data-testid="v4-skille">
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
      <Lapp vis={!!navn} className="left-2.5 top-2.5" ov={ov}><span key={navn} className="animate-in fade-in-0 duration-300">{navn}</span></Lapp>
      <Lapp vis={fase === F.SKILLE && pos > 14} className="bottom-2.5 left-2.5" ov={ov} testid="v4-original-merke">Original</Lapp>
      <Lapp vis={fase >= F.SKILLE && fase <= F.PUBLISERT && pos < 86} className="bottom-2.5 right-2.5" delay={500} ov={ov} testid="v4-ki-merke">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
        <span key={fase >= F.STYLET ? 'r' : 's'} className="animate-in fade-in-0 duration-300">{fase >= F.STYLET ? 'Redigert · stylet med KI' : 'Stylet med KI'}</span>
      </Lapp>
    </div>
  );
}

/* ── Brikkene — det som hentes ut ── */
function Brikke({ tekst, vis, delay = 0, ov, kilde }) {
  return (
    <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium" style={{ background: kilde ? 'transparent' : 'rgba(21,19,15,0.06)', boxShadow: kilde ? `inset 0 0 0 1px ${HAIR}` : 'none', color: 'rgba(21,19,15,0.82)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: ov ? 'none' : `opacity 420ms ${EASE} ${vis ? delay : 0}ms, transform 420ms ${EASE} ${vis ? delay : 0}ms` }} aria-hidden={!vis}>{tekst}</span>
  );
}

function Fakta({ fase, ov }) {
  const bilder = FAKTA.filter((x) => !x.kilde);
  const bolig = FAKTA.filter((x) => x.kilde);
  const stagger = (liste) => {
    const teller = {}; return liste.map((x) => { teller[x.fra] = (teller[x.fra] || 0) + 1; return (teller[x.fra] - 1) * 240; });
  };
  const d1 = stagger(bilder); const d2 = stagger(bolig);
  return (
    <div data-testid="v4-fakta">
      <p className="text-[12px]" style={{ color: DIM }}>Fra bildene</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {bilder.map((x, i) => <Brikke key={x.t} tekst={x.t} vis={fase >= x.fra} delay={d1[i]} ov={ov} />)}
      </div>
      <Inn vis={fase >= F.FAKTA} ov={ov} className="mt-4" y={6}>
        <p className="text-[12px]" style={{ color: DIM }}>Fra boligen og leieavtalen</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bolig.map((x, i) => <Brikke key={x.t} tekst={x.t} vis={fase >= x.fra} delay={200 + d2[i]} ov={ov} kilde />)}
        </div>
      </Inn>
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

function SmsBoble({ s, fase, ov, kompakt = false }) {
  const vis = fase >= s.fra && fase <= s.tilOg;
  return (
    <Vokse vis={vis} ov={ov} delay={fase === s.fra ? 500 : 150}>
      <div className={`${kompakt ? 'mt-3' : 'mt-3'} rounded-[14px] px-3.5 py-3`} style={{ background: 'rgba(21,19,15,0.06)' }} data-testid={`v4-sms-${s.id}`}>
        <div className="flex items-center justify-between text-[11.5px]" style={{ color: DIM }}>
          <span className="inline-flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2.5h8a1 1 0 011 1v4a1 1 0 01-1 1H5L2.5 10.5V8.5H2a1 1 0 01-1-1v-4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            SMS til {s.til}
          </span>
          <span>{s.tid}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-[#15130F]/82">{s.tekst}</p>
      </div>
    </Vokse>
  );
}

/* Kontrakten — sluttbildet. Utfylt fra annonsen; går til BankID-signering. */
function KontraktKort({ kompakt = false }) {
  const dimt = { color: 'rgba(244,241,234,0.62)' };
  return (
    <div className={`rounded-[14px] ${kompakt ? 'p-4' : 'p-4'}`} style={{ background: T.charcoal, color: T.offwhite, boxShadow: '0 24px 60px -30px rgba(0,0,0,0.6)' }} data-testid="v4-kontrakt">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]" style={dimt}>
        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: '#7DDBA1' }}><Hake />Kontrakt sendt</span>
        <span>Leilighet 2</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Portrett src={HVEM.Emma.bilde} alt="Emma Sørensen" size={36} />
        <span><span className="block text-[15px] font-medium">Emma Sørensen</span><span className="block text-[12.5px]" style={dimt}>Signerer med BankID</span></span>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3">
        {[['Leie', `${tall(12500)} kr /mnd`], ['Innflytting', '1. november'], ['Varighet', '3 år'], ['Depositum', '3 mnd']].map(([k, v]) => (
          <div key={k}><p className="text-[12px]" style={dimt}>{k}</p><p className="mt-0.5 text-[14px] font-medium tracking-[-0.005em]">{v}</p></div>
        ))}
      </div>
    </div>
  );
}

/* Hele akt 6–7 i scenen: liste til venstre, visning/kontrakt + SMS til høyre (stablet når smalt) */
function Leietakere({ fase, ov, smal = false, kompakt = false }) {
  const slutt = fase >= F.SLUTT;
  return (
    <div className={`flex ${smal ? 'flex-col gap-6' : 'flex-row gap-8'}`} data-testid="v4-leietakere">
      <div className="min-w-0 flex-1"><Liste fase={fase} ov={ov} kompakt={kompakt} dempet={slutt} /></div>
      <div className={smal ? 'w-full' : 'w-[300px] shrink-0'}>
        <div className="grid">
          <div className="col-start-1 row-start-1" style={{ opacity: fase >= F.VALGT ? 0 : 1, transition: ov ? 'none' : `opacity 300ms ${EASE}`, pointerEvents: fase >= F.VALGT ? 'none' : 'auto' }} aria-hidden={fase >= F.VALGT}>
            <VisningKort fase={fase} ov={ov} />
          </div>
          <div className="col-start-1 row-start-1" style={{ opacity: fase >= F.VALGT ? 1 : 0, transform: fase >= F.VALGT ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 500ms ${EASE} 250ms, transform 500ms ${EASE} 250ms`, pointerEvents: fase >= F.VALGT ? 'auto' : 'none' }} aria-hidden={fase < F.VALGT}>
            <KontraktKort kompakt={kompakt} />
          </div>
        </div>
        {SMS.map((s) => <SmsBoble key={s.id} s={s} fase={fase} ov={ov} kompakt={kompakt} />)}
      </div>
    </div>
  );
}

/* ── Fremdrift — stille streker ── */
function Fyll({ aktiv, gjort, dur }) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!aktiv) { setFull(false); return undefined; }
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setFull(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [aktiv]);
  const bredde = gjort ? '100%' : aktiv && full ? '100%' : '0%';
  return <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: aktiv ? T.lilla : 'rgba(21,19,15,0.35)', width: bredde, transition: aktiv && full ? `width ${dur}ms linear` : 'none' }} />;
}

function Akter({ fase, onVelg }) {
  const aktiv = aktIndeks(fase);
  return (
    <ol className="flex items-center gap-2" aria-label="Akter" data-testid="v4-akter">
      {AKTER.map((a, i) => (
        <li key={a.fra}>
          <button type="button" onClick={() => onVelg(i)} aria-label={a.tittel} aria-current={i === aktiv ? 'step' : undefined} className="block py-3 focus-visible:outline-none" data-testid={`v4-akt-${i}`}>
            <span className="relative block h-[2px] w-7 overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.12)' }}>
              <Fyll aktiv={i === aktiv} gjort={i < aktiv} dur={varighet(i)} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* ── Desktop: layout ── */
function layout(W) {
  const TW = Math.round(Math.min(380, Math.max(300, W * 0.3)));
  const vx = P + TW + 48; const vy = P; const VW = W - vx - P; const VH = H - 2 * P;
  const hel = { x: 0, y: 0, w: W, h: H };
  const tekst = { x: P, y: P, w: TW };
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
  /* Stort: fyller scenen i 3:2 */
  const gw = Math.min(VW, Math.round(VH * 1.5)); const gh = Math.round(gw / 1.5);
  const stor = { x: vx + Math.round((VW - gw) / 2), y: vy + Math.round((VH - gh) / 2), w: gw, h: gh };
  /* Utkast: banner øverst i kortet */
  const banner = { x: vx, y: vy, w: VW, h: Math.round(VH * 0.42) };
  /* FINN: topplinje, bildet til venstre, teksten til høyre, beskrivelse under */
  const topp = 48; const ip = 20;
  const fw = Math.round((VW - 2 * ip) * 0.52); const fh = Math.round(fw / 1.5);
  const finnBilde = { x: vx + ip, y: vy + topp + 24, w: fw, h: fh };
  const finnTekst = { x: vx + ip + fw + 24, y: finnBilde.y, w: VW - 2 * ip - fw - 24, h: fh };
  const finnBeskrivelse = { x: vx + ip, y: finnBilde.y + fh + 26, w: VW - 2 * ip };
  return { hel, tekst, omr, mosaikk, stor, banner, finnBilde, finnTekst, finnBeskrivelse, topp, smal: VW < 660 };
}

function fotoRekt(L, f) {
  if (f <= F.TRYKK_START) return L.hel;
  if (f <= F.BILDER) return L.mosaikk.stor;
  if (f <= F.STYLET) return L.stor;
  if (f <= F.TRYKK) return L.banner;
  return L.finnBilde;
}

/* Bildet — ett element som reiser gjennom aktene. Åpner som hel flate med stille zoom. */
function Foto({ fase, L, ov, onHold }) {
  const r = fotoRekt(L, fase);
  const start = fase <= F.TRYKK_START;
  const inne = fase <= F.PUBLISERT;
  const stor = fase >= F.LES1 && fase <= F.STYLET;
  const banner = fase >= F.TITTEL && fase <= F.TRYKK;
  const finn = fase === F.PUBLISERT;
  const [zoomet, setZoomet] = useState(false);
  useEffect(() => {
    if (fase !== F.START) return undefined;
    setZoomet(false);
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setZoomet(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [fase]);
  const t = (p, ms, d = 0) => `${p} ${ms}ms ${EASE} ${d}ms`;
  const overgang = ov ? 'none' : [t('left', 950), t('top', 950), t('width', 950), t('height', 950), t('opacity', 500), t('box-shadow', 600), t('border-radius', 700)].join(', ');
  const skala = start ? (zoomet ? 'scale(1)' : 'scale(1.07)') : 'scale(1)';
  return (
    <div className="absolute overflow-hidden" style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: start ? 0 : banner ? '14px 14px 0 0' : finn ? 10 : 14, opacity: inne ? 1 : 0, background: 'rgba(21,19,15,0.05)', boxShadow: stor ? '0 40px 90px -40px rgba(21,19,15,0.45)' : banner || finn || start ? 'none' : `0 0 0 1px ${HAIR}`, transition: overgang, zIndex: 2 }} aria-hidden={!inne} data-testid="v4-foto" data-bilde={fase >= F.STYLET ? 'stylet' : viserBilde(fase)}>
      <div className="absolute inset-0" style={{ transform: skala, transition: ov ? 'none' : start ? 'transform 3400ms cubic-bezier(0.25, 0.6, 0.3, 1)' : `transform 950ms ${EASE}` }}>
        <Bildeflate fase={fase} ov={ov} onHold={onHold} pos={start ? '50% 60%' : banner ? '50% 55%' : '50% 50%'} />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]" style={{ background: START_GRADIENT, opacity: start ? 1 : 0, transition: ov ? 'none' : `opacity ${start ? 600 : 700}ms ${EASE}` }} />
    </div>
  );
}

/* De fire små i mosaikken */
function Smaa({ fase, L, ov }) {
  const inne = fase === F.BILDER;
  const kommet = fase >= F.BILDER;
  return SMAA.map((id, i) => {
    const r = L.mosaikk.smaa[i]; const b = KILDE[id];
    return (
      <div key={id} className="absolute overflow-hidden rounded-[10px]" style={{ left: r.x, top: kommet ? r.y : r.y - 22, width: r.w, height: r.h, opacity: inne ? 1 : 0, background: 'rgba(21,19,15,0.05)', boxShadow: `0 0 0 1px ${HAIR}`, transition: ov ? 'none' : `opacity ${inne ? 500 : 350}ms ${EASE} ${inne ? 420 + i * 90 : 0}ms, top 700ms ${EASE} ${inne ? 420 + i * 90 : 0}ms` }} aria-hidden={!inne} data-testid={`v4-mosaikk-${id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.liten || b.src} alt={b.navn} className="h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
      </div>
    );
  });
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
function Handling({ fase, ov }) {
  const publiser = fase >= F.KLAR && fase <= F.PUBLISERT;
  const velg = fase >= F.ETTER;
  return (
    <div className="grid">
      <Inn vis={fase >= F.LES1 && fase <= F.FAKTA} ov={ov} className="col-start-1 row-start-1"><Fakta fase={fase} ov={ov} /></Inn>
      <Inn vis={publiser} ov={ov} delay={200} className="col-start-1 row-start-1">
        <p className="mb-2.5 text-[12px]" style={{ color: 'rgba(21,19,15,0.42)' }}>Trykk 2 av 3</p>
        <AutoKnapp presser={fase === F.TRYKK} trykket={fase >= F.PUBLISERT} etter="Publisert på FINN.no" testid="v4-publiser" stor>Publiser på <Finn h={18} /></AutoKnapp>
      </Inn>
      <Inn vis={velg} ov={ov} delay={200} className="col-start-1 row-start-1">
        <p className="mb-2.5 text-[12px]" style={{ color: 'rgba(21,19,15,0.42)' }}>Trykk 3 av 3</p>
        <AutoKnapp presser={fase === F.VELG} trykket={fase >= F.VALGT} etter="Kontrakt sendt" testid="v4-velg" stor>Velg Emma</AutoKnapp>
      </Inn>
    </div>
  );
}

function Tekstspalte({ fase, L, ov, onAkt }) {
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
      <div className="mt-7"><Handling fase={fase} ov={ov} /></div>
      <div className="absolute bottom-0 left-0"><Akter fase={fase} onVelg={onAkt} /></div>
    </div>
  );
}

function Desktop({ fase, ov, onAkt, onHold }) {
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
  const folk = fase >= F.INT1;
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);

  return (
    <div ref={ref} className="relative overflow-hidden text-[#15130F]" style={{ height: H, background: PAPIR }} data-testid="v4-annonse-desktop">
      {L && <Foto fase={fase} L={L} ov={ov} onHold={onHold} />}

      {/* Åpningsteksten — nede til venstre over bildet. Går raskt ut; resten kommer inn etterpå. */}
      <div className="absolute z-[5]" style={{ left: P, bottom: P, right: P, opacity: start ? 1 : 0, transform: start ? 'none' : 'translateY(8px)', transition: ov ? 'none' : start ? `opacity 700ms ${EASE} 250ms, transform 700ms ${EASE} 250ms` : `opacity 260ms ${EASE}, transform 260ms ${EASE}`, pointerEvents: start ? 'auto' : 'none' }} aria-hidden={!start}>
        <StartTekst fase={fase} />
      </div>

      {L && (
        <div style={{ opacity: start ? 0 : 1, transition: `opacity ${bt(600, start ? 0 : 320)}` }} aria-hidden={start}>
          <Tekstspalte fase={fase} L={L} ov={ov} onAkt={onAkt} />
          <KortLag fase={fase} L={L} ov={ov} />
          <Smaa fase={fase} L={L} ov={ov} />
          <div className="absolute" style={{ left: L.omr.x, top: L.omr.y + 6, width: L.omr.w, opacity: folk ? 1 : 0, transform: folk ? 'none' : 'translateY(14px)', transition: `opacity ${bt(500, folk ? 250 : 0)}, transform ${bt(600, folk ? 250 : 0)}`, pointerEvents: folk ? 'auto' : 'none' }} aria-hidden={!folk}>
            <Leietakere fase={fase} ov={ov} smal={L.smal} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Under lg: samme akter, stablet ── */
function Bilde({ src, alt, pos, vis, delay = 0, ov, className = '', ratio = '3 / 2' }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: ratio, background: 'rgba(21,19,15,0.05)', boxShadow: `0 0 0 1px ${HAIR}`, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(-14px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? delay : 0}ms, transform 700ms ${EASE} ${vis ? delay : 0}ms` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos || '50% 50%' }} draggable={false} />
    </div>
  );
}

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
      <img src={KILDE.stue.liten} alt="Stuen" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '40% 60%', transform: zoomet ? 'scale(1)' : 'scale(1.07)', transition: ov ? 'none' : 'transform 3400ms cubic-bezier(0.25, 0.6, 0.3, 1)' }} draggable={false} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: START_GRADIENT }} />
      <div className="absolute inset-x-0 bottom-0 p-5"><StartTekst fase={fase} kompakt /></div>
    </div>
  );
}

function MosaikkKompakt({ fase, ov }) {
  const inne = fase === F.BILDER;
  return (
    <div data-testid="v4-mosaikk-kompakt">
      <Bilde src={KILDE.stue.liten} alt="Stue" vis={inne} ov={ov} className="rounded-[12px]" />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {SMAA.map((id, i) => <Bilde key={id} src={KILDE[id].liten || KILDE[id].src} alt={KILDE[id].navn} pos={KILDE[id].pos} vis={inne} delay={120 + i * 90} ov={ov} className="rounded-[8px]" />)}
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

function Kompakt({ fase, ov, onAkt, onHold }) {
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
          <Vokse vis={fase >= F.LES1 && fase <= F.FAKTA} ov={ov}><div className="pt-5"><Fakta fase={fase} ov={ov} /></div></Vokse>
          <Vokse vis={fase >= F.KLAR && fase <= F.PUBLISERT} ov={ov}>
            <div className="pt-5">
              <p className="mb-2.5 text-[12px]" style={{ color: 'rgba(21,19,15,0.42)' }}>Trykk 2 av 3</p>
              <AutoKnapp presser={fase === F.TRYKK} trykket={fase >= F.PUBLISERT} etter="Publisert på FINN.no" testid="v4-publiser" stor>Publiser på <Finn h={18} /></AutoKnapp>
            </div>
          </Vokse>
          <Vokse vis={fase >= F.ETTER} ov={ov}>
            <div className="pt-5">
              <p className="mb-2.5 text-[12px]" style={{ color: 'rgba(21,19,15,0.42)' }}>Trykk 3 av 3</p>
              <AutoKnapp presser={fase === F.VELG} trykket={fase >= F.VALGT} etter="Kontrakt sendt" testid="v4-velg" stor>Velg Emma</AutoKnapp>
            </div>
          </Vokse>
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
          <Vokse vis={fase >= F.INT1} ov={ov}><Leietakere fase={fase} ov={ov} smal kompakt /></Vokse>
        </div>

        <div className="px-5 pb-4 pt-4"><Akter fase={fase} onVelg={onAkt} /></div>
      </Vokse>
    </div>
  );
}

export default function AnnonseFilm({ synlig, tema = 'mork' }) {
  const [fase, setFase] = useState(F.START);
  const [startet, setStartet] = useState(false);
  const [ov, setOv] = useState(false);
  const [morkt, setMorkt] = useState(false);
  const [holdt, setHoldt] = useState(false);      // brukeren holder i skillelinjen — filmen venter
  const [bred, setBred] = useState(null);         // null før mount → begge varianter med CSS-skjuling

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

  useEffect(() => { if (synlig && !startet) setStartet(true); }, [synlig, startet]);

  useEffect(() => {
    if (!startet || morkt || holdt) return undefined;
    const ms = AUTO[fase];
    if (ms == null) return undefined;
    const t = window.setTimeout(() => {
      if (fase >= SISTE) {
        if (ov) { setFase(F.PRIS); return; }
        setMorkt(true);
        window.setTimeout(() => { setFase(F.START); window.setTimeout(() => setMorkt(false), 700); }, 500);
      } else {
        setFase((f) => f + 1);
      }
    }, ms);
    return () => window.clearTimeout(t);
  }, [fase, startet, ov, morkt, holdt]);

  const tilAkt = (i) => { setMorkt(false); setStartet(true); setFase(AKTER[i].fra); };

  const inn = { opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(28px)', transition: ov ? 'none' : `opacity 800ms ${EASE}, transform 800ms ${EASE}` };
  const lys = tema === 'lys';
  const skygge = lys
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';
  const felles = { fase, ov, onAkt: tilAkt, onHold: setHoldt };
  const blend = { opacity: morkt ? 0 : 1, transition: ov ? 'none' : `opacity 450ms ${EASE}` };

  return (
    <div className="relative mx-auto w-full max-w-[min(1400px,86vw)]" data-testid="v4-annonse-scene" data-fase={fase} data-holdt={holdt ? '1' : '0'}>
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
