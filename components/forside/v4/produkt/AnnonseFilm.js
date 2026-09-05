'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall } from '../motion';

/* ---------------------------------------------------------------------------
   AnnonseFilm — «Fra ledig til utleid. Du trykker tre ganger.»

   En film som spiller av seg selv innenfor rammen. Ingen knapper å trykke —
   trykkene vises. Starter superminimalistisk: tom flate, én knapp midt på:
   «Lag annonse». Den trykkes, og historien folder seg ut i samme ramme.

   Kapitler:
     Bildene leses   Viseren (stort bilde) + filmstripe. Stue → kjøkken → soverom.
                     Nåler settes på det systemet ser i bildet (parkett, kjøkkenøy …);
                     detaljpanelet til høyre fyller seg rad for rad, med kilden på
                     hver rad. Så areal/etasje fra boligens data, dato fra avtalen.
     Møbleres        Viseren vokser til stort format. Før/etter: en skillelinje glir
                     inn fra høyre og møblerer rommet — original til venstre, møblert
                     til høyre. Hviler midt på, så fullføres den. Linjen kan dras
                     mens den hviler (filmen venter). Merkes «Illustrasjon».
     Skrives         Bildet glir til venstre; annonsen komponeres i stor typografi.
                     Stiplet = ord som kommer fra bildene.
     Publiseres      Fortellerlinjen får knappen «Publiser på FINN.no». Den trykkes.
                     Bildet glir inn i en FINN-forhåndsvisning — slik boligsøkerne ser den.
     Leietaker       Systemet trer frem innenfor rammen. Interessenter via FINN,
                     dag for dag, legitimert med BankID · inntekt · referanse.
                     Dag 6: «Velg Emma» → kontrakt til BankID-signering.

   Teknikk: fast rammehøyde (H) på desktop. Scenen er absolutt posisjonerte
   lag; viseren er ETT element med et rektangel per fase. Systemlaget ligger
   under og glir inn. Under lg: samme akter stablet (Vokse). Redusert
   bevegelse: ingen overganger. Ingen skannelinjer, spinnere, cursor.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const STEIN = '#F3F1EC';
const HAIR = 'rgba(21,19,15,0.08)';
const DIM = 'rgba(21,19,15,0.55)';
const FINN_BLA = '#0063FB';
const H = 660;          // rammens høyde
const TOPP = 100;       // topplinjen (brødsmule · kapitler · status)
const BUNN = 60;        // fortellerlinjen
const HVIL = 44;        // hvor skillelinjen hviler (prosent fra venstre)

const F = {
  START: 0, TRYKK_START: 1,
  ARK: 2, LES1: 3, LES2: 4, LES3: 5, DETALJER: 6,
  FORSIDE: 7, SKILLE: 8, MOBLERT: 9,
  TITTEL: 10, TEKST: 11, PRIS: 12,
  KLAR: 13, TRYKK: 14, PUBLISERT: 15, FINN: 16,
  SYSTEM: 17, DAG1: 18, DAG2: 19, DAG3: 20, DAG6: 21, VELG: 22, VALGT: 23,
};
const AUTO = {
  [F.START]: 2200, [F.TRYKK_START]: 320,
  [F.ARK]: 1000, [F.LES1]: 1600, [F.LES2]: 1500, [F.LES3]: 1500, [F.DETALJER]: 1700,
  [F.FORSIDE]: 1200, [F.SKILLE]: 2800, [F.MOBLERT]: 2300,
  [F.TITTEL]: 800, [F.TEKST]: 1000, [F.PRIS]: 1200,
  [F.KLAR]: 1500, [F.TRYKK]: 300, [F.PUBLISERT]: 1300, [F.FINN]: 3000,
  [F.SYSTEM]: 1500, [F.DAG1]: 1200, [F.DAG2]: 1200, [F.DAG3]: 1300, [F.DAG6]: 1600, [F.VELG]: 300, [F.VALGT]: 4200,
};
const SISTE = F.VALGT;

const KAPITLER = [
  { navn: 'Bildene leses', fra: F.ARK },
  { navn: 'Møbleres', fra: F.FORSIDE },
  { navn: 'Skrives', fra: F.TITTEL },
  { navn: 'Publiseres', fra: F.KLAR },
  { navn: 'Leietaker', fra: F.SYSTEM },
];
const varighet = (i) => {
  const fra = KAPITLER[i].fra; const til = i + 1 < KAPITLER.length ? KAPITLER[i + 1].fra : SISTE + 1;
  let sum = 0; for (let f = fra; f < til; f += 1) sum += AUTO[f] || 0; return sum;
};

const FOTOS = [
  { id: 'stue', src: '/v4/annonse/stue-tom-1200.webp', liten: '/v4/annonse/stue-tom-700.webp', moblert: '/v4/annonse/stue-moblert-1200.webp', moblertLiten: '/v4/annonse/stue-moblert-700.webp', navn: 'Stue', les: F.LES1 },
  { id: 'kjokken', src: '/v4/annonse/kjokken-600.webp', navn: 'Kjøkken', les: F.LES2 },
  { id: 'soverom', src: '/v4/annonse/soverom-600.webp', navn: 'Soverom', les: F.LES3 },
  { id: 'spisestue', src: '/v4/annonse/spisestue-600.webp', navn: 'Spisestue' },
  { id: 'fasade', src: '/v4/bolig-oslo-1200.webp', navn: 'Fasade', pos: '20% 45%' },
];
const KILDE = Object.fromEntries(FOTOS.map((b) => [b.id, b]));

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
    { x: 40, y: 74, t: 'Dobbeltseng' },
    { x: 92, y: 38, t: 'Garderobe' },
  ],
};

const RADER = [
  { k: 'Gulv', v: 'Parkett', kilde: 'stue', fase: F.LES1 },
  { k: 'Stue', v: 'Åpen løsning med kjøkkenøy · store vinduer', kilde: 'stue', fase: F.LES1 },
  { k: 'Kjøkken', v: 'Integrert ovn · spiseplass', kilde: 'kjokken', fase: F.LES2 },
  { k: 'Soverom', v: '1 · dobbeltseng · garderobe', kilde: 'soverom', fase: F.LES3 },
  { k: 'Areal', v: '54 m²', kilde: 'bolig', fase: F.DETALJER },
  { k: 'Etasje', v: '2. etasje · bygård', kilde: 'bolig', fase: F.DETALJER },
  { k: 'Ledig fra', v: '1. november', kilde: 'avtale', fase: F.DETALJER },
];

const ANNONSE = {
  tittel: 'Lys 2-roms med åpen kjøkkenløsning i Nygårdsgaten',
  spes: '54 m² · 1 soverom · 2. etasje · parkett · ledig 1. november',
};

const FOLK = [
  {
    n: 'Emma Sørensen', b: 'E', fra: F.DAG1,
    d: (f) => (f >= F.VALGT ? 'Kontrakt sendt · signeres med BankID' : f >= F.DAG6 ? 'Visning gjennomført · ønsker 3 års leie' : f >= F.DAG2 ? 'Visning tirsdag 17:30 · ønsker fra 1. nov' : 'Meldte interesse via FINN · ønsker fra 1. nov'),
    dok: (f) => (f >= F.DAG3 ? ['BankID', 'Inntekt', 'Referanse'] : f >= F.DAG2 ? ['BankID', 'Inntekt'] : ['BankID']),
    chip: (f) => (f >= F.VALGT ? ['Kontrakt sendt', 'gronn'] : f >= F.DAG3 ? ['Anbefalt', 'lilla'] : null),
  },
  {
    n: 'Martin Berg', b: 'M', fra: F.DAG2,
    d: (f) => (f >= F.VALGT ? 'Varslet · boligen er reservert' : f >= F.DAG6 ? 'Visning gjennomført' : 'Meldte interesse via FINN · visning tirsdag 18:00'),
    dok: (f) => (f >= F.DAG3 ? ['BankID', 'Inntekt'] : ['BankID']),
    chip: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : null),
  },
  {
    n: 'Sara Haugen', b: 'S', fra: F.DAG3,
    d: (f) => (f >= F.VALGT ? 'Varslet · boligen er reservert' : 'Spørsmål om husdyr via FINN · besvart fra annonsen'),
    dok: () => [],
    chip: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : ['Besvart', 'noytral']),
  },
];

const TONE = {
  noytral: { background: 'rgba(21,19,15,0.06)', color: 'rgba(21,19,15,0.72)' },
  lilla: { background: 'rgba(212,150,255,0.22)', color: T.ink },
  gronn: { background: 'rgba(31,157,85,0.14)', color: '#166B3C' },
};

function status(f) {
  if (f <= F.TRYKK_START) return ['Ny annonse', 'noytral'];
  if (f === F.ARK) return ['Henter bildene', 'noytral'];
  if (f <= F.LES3) return ['Leser bildene', 'noytral'];
  if (f === F.DETALJER) return ['Detaljer hentet ut', 'noytral'];
  if (f <= F.MOBLERT) return ['Møblerer forsidebildet', 'noytral'];
  if (f <= F.PRIS) return ['Skriver annonsen', 'noytral'];
  if (f <= F.TRYKK) return ['Klar til publisering', 'lilla'];
  if (f <= F.SYSTEM) return ['Publisert på FINN.no', 'gronn'];
  if (f < F.DAG6) return [`Annonse aktiv · dag ${[1, 2, 3][f - F.DAG1]}`, 'lilla'];
  if (f <= F.VELG) return ['Dag 6 · velg leietaker', 'lilla'];
  return ['Kontrakt sendt · BankID', 'gronn'];
}

function undertekst(f) {
  if (f <= F.SYSTEM) return 'Publisert på FINN.no · venter på interessenter';
  if (f === F.DAG1) return '1 interessent · legitimert med BankID';
  if (f === F.DAG2) return '2 interessenter · 2 visninger tirsdag';
  if (f === F.DAG3) return '3 interessenter · 1 anbefalt · 1 spørsmål besvart';
  return '3 interessenter · 2 visninger gjennomført · 1 anbefalt';
}

/* Fortellerlinjen — én setning per øyeblikk */
const FORTELLER = {
  [F.START]: '',
  [F.TRYKK_START]: '',
  [F.ARK]: 'Bildene fra boligen hentes.',
  [F.LES1]: 'Stuen leses: parkett, kjøkkenøy, store vinduer — åpen løsning.',
  [F.LES2]: 'Kjøkkenet leses: integrert ovn og spiseplass.',
  [F.LES3]: 'Soverommet leses: ett soverom, dobbeltseng, garderobe.',
  [F.DETALJER]: 'Areal og etasje kommer fra boligens data, datoen fra leieavtalen. Alt kan rettes.',
  [F.FORSIDE]: 'Forsidebildet velges — det tomme rommet.',
  [F.SKILLE]: 'Rommet møbleres med KI. Original til venstre, møblert til høyre.',
  [F.MOBLERT]: 'Det møblerte bildet merkes alltid som illustrasjon.',
  [F.TITTEL]: 'Overskrift og nøkkeltall skrives fra detaljene.',
  [F.TEKST]: 'Teksten skrives. Stiplet er ord som kommer fra bildene.',
  [F.PRIS]: 'Pris foreslås ut fra forrige leie. Du kan endre alt før det går ut.',
  [F.KLAR]: 'Utkastet er klart. Ett trykk publiserer annonsen.',
  [F.TRYKK]: 'Utkastet er klart. Ett trykk publiserer annonsen.',
  [F.PUBLISERT]: 'Annonsen er ute på FINN.no.',
  [F.FINN]: 'Slik ser boligsøkerne annonsen. Spørsmål og interessenter går rett inn i DigiHome.',
  [F.SYSTEM]: 'Boligen følger annonsen — alt som skjer, ligger på Leilighet 2.',
  [F.DAG1]: 'Dag 1: Emma melder interesse via FINN og legitimerer seg med BankID.',
  [F.DAG2]: 'Dag 2: Martin melder seg. Visninger avtales tirsdag.',
  [F.DAG3]: 'Dag 3: Emma har dokumentert inntekt og referanse. Sara fikk svar fra annonsen.',
  [F.DAG6]: 'Dag 6: Visningene er gjennomført. Du velger leietaker.',
  [F.VELG]: 'Dag 6: Visningene er gjennomført. Du velger leietaker.',
  [F.VALGT]: 'Kontrakten er sendt til BankID-signering. De andre er varslet.',
};

/* ── Små byggeklosser ── */

function Hake({ size = 14 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* FINN.no-merket — blått felt, hvitt ordmerke */
function Finn({ h = 18, className = '' }) {
  const w = Math.round(h * 2.9);
  return (
    <svg aria-label="FINN.no" role="img" width={w} height={h} viewBox="0 0 58 20" className={`inline-block shrink-0 align-middle ${className}`}>
      <rect width="58" height="20" rx="4" fill={FINN_BLA} />
      <text x="29" y="14.6" textAnchor="middle" fontFamily="Inter, Helvetica, Arial, sans-serif" fontWeight="800" fontSize="12.5" letterSpacing="-0.3" fill="#FFFFFF">FINN.no</text>
    </svg>
  );
}

function Avatar({ src, alt, size = 24 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} />
  );
}

function Initial({ bokstav, size = 30 }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium" style={{ width: size, height: size, background: 'rgba(21,19,15,0.07)', color: 'rgba(21,19,15,0.72)', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>{bokstav}</span>
  );
}

function Inn({ vis, delay = 0, y = 10, children, className = '', ov, style }) {
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: ov ? 'none' : `opacity 500ms ${EASE} ${delay}ms, transform 500ms ${EASE} ${delay}ms`, pointerEvents: vis ? 'auto' : 'none', ...style }} aria-hidden={!vis}>
      {children}
    </div>
  );
}

function Vokse({ vis, children, className = '', ov }) {
  return (
    <div className={`grid ${className}`} style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: ov ? 'none' : `grid-template-rows 600ms ${EASE}` }} aria-hidden={!vis}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? 150 : 0}ms, transform 500ms ${EASE} ${vis ? 150 : 0}ms` }}>{children}</div>
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
    <span className="flex flex-wrap items-center gap-1.5">
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
      style={{ background: trykket ? 'rgba(212,150,255,0.55)' : presser ? T.lillaHover : T.lilla, color: T.ink, transform: presser ? 'scale(0.95)' : 'none', transition: `transform 200ms ${EASE}, background-color 200ms ${EASE}`, boxShadow: stor && !presser ? '0 18px 40px -22px rgba(160,90,220,0.55)' : 'none' }}
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
  <>Lys og luftig 2-roms i klassisk bygård. Åpen kjøkkenløsning med <G>kjøkkenøy</G>, <G>integrert ovn</G> og <G>spiseplass</G>, <G>parkett</G> og <G>store vinduer</G> mot rolig gate. Soverom med plass til <G>dobbeltseng</G> og <G>garderobe</G>. Ledig fra 1. november.</>
);

/* ── Starten: tom flate, én knapp ── */
function Start({ fase, ov, kompakt = false }) {
  return (
    <div className="flex flex-col items-center text-center" data-testid="v4-start">
      <p className={`${kompakt ? 'text-[12.5px]' : 'text-[13.5px]'}`} style={{ color: DIM }}>Nygårdsgaten 5 · Leilighet 2 · ledig fra 1. november</p>
      <div className="mt-5">
        <AutoKnapp presser={fase === F.TRYKK_START} stor testid="v4-lag-annonse">Lag annonse</AutoKnapp>
      </div>
    </div>
  );
}

/* ── Bildeflaten — bildene, nålene og før/etter-skillet. Brukes i viseren (desktop) og kompakt. ── */
function navnFor(fase) {
  if (fase >= F.ARK && fase <= F.DETALJER) return fase === F.LES2 ? 'Kjøkken' : fase === F.LES3 ? 'Soverom' : 'Stue';
  if (fase >= F.FORSIDE && fase <= F.MOBLERT) return 'Forsidebilde';
  return null;
}
function viserBilde(fase) {
  if (fase === F.LES2) return 'kjokken';
  if (fase === F.LES3) return 'soverom';
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

function Bildeflate({ fase, ov, onHold, liten = false, testid = 'v4-bildeflate' }) {
  const naa = viserBilde(fase);
  const [manuell, setManuell] = useState(null);
  const boks = useRef(null);
  const drar = useRef(false);
  useEffect(() => { if (fase !== F.SKILLE) setManuell(null); }, [fase]);

  const posAuto = fase < F.SKILLE ? 100 : fase === F.SKILLE ? HVIL : 0;
  const pos = manuell != null ? manuell : posAuto;
  const dur = ov || manuell != null ? 0 : fase === F.SKILLE ? 1800 : 1500;
  const linje = fase === F.SKILLE || fase === F.MOBLERT;
  const kanDra = fase === F.SKILLE;
  const navn = navnFor(fase);

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
    { id: 'stue', src: liten ? KILDE.stue.liten : KILDE.stue.src, alt: 'Stuen, original' },
    { id: 'kjokken', src: KILDE.kjokken.src, alt: 'Kjøkkenet' },
    { id: 'soverom', src: KILDE.soverom.src, alt: 'Soverommet' },
  ];

  return (
    <div ref={boks} className="absolute inset-0 select-none" data-testid={testid} data-pos={Math.round(pos)}>
      {lag.map((b) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={b.id} src={b.src} alt={b.alt} className="absolute inset-0 h-full w-full object-cover" style={{ opacity: naa === b.id ? 1 : 0, transition: ov ? 'none' : `opacity 550ms ${EASE}` }} draggable={false} data-testid={`v4-bilde-${b.id}`} />
      ))}
      {/* Møblert — klippes fra venstre; skillet er kanten */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={liten ? KILDE.stue.moblertLiten : KILDE.stue.moblert} alt="Stuen, møblert med KI" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 0 0 ${pos}%)`, transition: dur ? `clip-path ${dur}ms ${EASE}` : 'none' }} draggable={false} data-testid="v4-bilde-moblert" />

      {/* Nåler */}
      {Object.entries(PINNER).map(([id, liste]) => liste.map((p, i) => (
        <Pinne key={`${id}-${i}`} {...p} vis={fase === KILDE[id].les} delay={i * 240} ov={ov} />
      )))}

      {/* Skillelinjen */}
      <div className="absolute inset-y-0 z-[3]" style={{ left: `${pos}%`, width: 0, opacity: linje ? 1 : 0, transition: ov ? 'none' : `left ${dur}ms ${EASE}, opacity ${fase === F.MOBLERT ? `700ms ${EASE} 800ms` : `400ms ${EASE}`}` }} aria-hidden={!linje} data-testid="v4-skille">
        <span className="absolute inset-y-0 left-[-1px] w-[2px]" style={{ background: 'rgba(251,250,248,0.96)', boxShadow: '0 0 0 0.5px rgba(21,19,15,0.10), 0 0 18px rgba(21,19,15,0.28)' }} />
        <button
          type="button"
          role="slider"
          aria-label="Sammenlign original og møblert"
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
      <Lapp vis={fase >= F.SKILLE && fase < F.SYSTEM && pos < 86} className="bottom-2.5 right-2.5" delay={500} ov={ov} testid="v4-ki-merke">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
        <span key={fase >= F.MOBLERT ? 'i' : 'm'} className="animate-in fade-in-0 duration-300">{fase >= F.MOBLERT ? 'Illustrasjon · møblert med KI' : 'Møblert med KI'}</span>
      </Lapp>
    </div>
  );
}

/* ── FINN-forhåndsvisningen — slik boligsøkerne ser annonsen ── */
function FinnTopp({ h, kompakt = false }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5" style={{ height: h, background: FINN_BLA, color: '#FFFFFF' }}>
      <span className="text-[17px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif' }}>FINN.no</span>
      {!kompakt && <span className="flex h-7 max-w-[260px] flex-1 items-center rounded-full px-3 text-[12px]" style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.82)' }}>Søk i Bolig til leie</span>}
      <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.82)' }}>Eiendom · Bolig til leie</span>
    </div>
  );
}

function FinnTekst({ kompakt = false }) {
  const dim = { color: 'rgba(27,27,31,0.58)' };
  return (
    <div className="flex h-full flex-col" style={{ color: '#1B1B1F' }}>
      <p className="text-[12.5px]" style={dim}>Nygårdsgaten 5, Bergen</p>
      <h4 className={`mt-1 font-semibold leading-[1.25] tracking-[-0.012em] ${kompakt ? 'text-[16.5px]' : 'text-[17.5px]'}`}>{ANNONSE.tittel}</h4>
      <p className="mt-2.5 text-[21px] font-semibold tracking-[-0.012em]"><span className="tabular-nums">{tall(12500)}</span> kr <span className="text-[13px] font-normal" style={dim}>per måned</span></p>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
        {[['Primærrom', '54 m²'], ['Soverom', '1'], ['Etasje', '2'], ['Ledig fra', '1. november']].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b pb-1" style={{ borderColor: 'rgba(27,27,31,0.08)' }}>
            <dt style={dim}>{k}</dt><dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className={`flex items-center gap-3 ${kompakt ? 'mt-4' : 'mt-auto pt-3'}`}>
        <span className="inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-semibold" style={{ background: FINN_BLA, color: '#FFFFFF' }}>Send melding</span>
        <span className="text-[12.5px]" style={dim}>Publisert i dag 18:02</span>
      </div>
    </div>
  );
}

function FinnRamme({ fase, L, ov }) {
  const vis = fase === F.FINN;
  const k = L.finn;
  return (
    <div className="absolute overflow-hidden rounded-[14px]" style={{ left: k.kort.x, top: k.kort.y, width: k.kort.w, height: k.kort.h, background: '#FFFFFF', boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 30px 80px -40px rgba(21,19,15,0.45)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(12px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? 350 : 0}ms, transform 600ms ${EASE} ${vis ? 350 : 0}ms`, zIndex: 1 }} aria-hidden={!vis} data-testid="v4-finn-kort">
      <FinnTopp h={k.topp} />
      <div className="absolute" style={{ left: k.tekst.x - k.kort.x, top: k.tekst.y - k.kort.y, width: k.tekst.w, height: k.tekst.h }}>
        <FinnTekst />
      </div>
    </div>
  );
}

function FinnKortKompakt({ ov }) {
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: '#FFFFFF', boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 24px 60px -36px rgba(21,19,15,0.45)' }} data-testid="v4-finn-kort-kompakt">
      <FinnTopp h={40} kompakt />
      <div className="relative" style={{ aspectRatio: '3 / 2' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={KILDE.stue.moblertLiten} alt="Stuen, møblert med KI" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <Lapp vis className="bottom-2.5 left-2.5" ov={ov}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Illustrasjon · møblert med KI</Lapp>
      </div>
      <div className="px-4 pb-4 pt-3"><FinnTekst kompakt /></div>
    </div>
  );
}

/* ── Innhold brukt i scenen (stor) og systemet (kompakt) ── */

function AnnonseTekst({ fase, ov, stor = false }) {
  const publisert = fase >= F.PUBLISERT;
  return (
    <div>
      <Inn vis={fase >= F.TITTEL} ov={ov}>
        <p key={publisert ? 'p' : 'u'} className={`inline-flex items-center gap-2 ${stor ? 'text-[12.5px]' : 'text-[12px]'} animate-in fade-in-0 duration-300`} style={{ color: publisert ? '#166B3C' : DIM }}>
          {publisert ? <><Hake size={12} />Publisert på <Finn h={16} /> · 18:02</> : <>Utkast · skrevet fra boligen · <span style={{ textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>stiplet</span> = fra bildene</>}
        </p>
        <h4 className={stor ? 'mt-3 text-[clamp(26px,2.4vw,36px)]' : 'mt-1.5 text-[15px] font-medium leading-[1.3] tracking-[-0.008em]'} style={stor ? { ...display, letterSpacing: '-0.025em', lineHeight: 1.05 } : undefined} data-testid="v4-annonse-tittel">{ANNONSE.tittel}</h4>
        <p className={`${stor ? 'mt-3 text-[15px]' : 'mt-1 text-[12.5px]'}`} style={{ color: DIM }} data-testid="v4-annonse-spes">{ANNONSE.spes}</p>
      </Inn>
      <Inn vis={fase >= F.TEKST} ov={ov} className={stor ? 'mt-5' : 'mt-2.5'}>
        <p className={`${stor ? 'max-w-[52ch] text-[16px] leading-[1.55]' : 'text-[13px] leading-[1.5]'} text-[#15130F]/78`} data-testid="v4-annonse-tekst"><Brodtekst /></p>
      </Inn>
      <Inn vis={fase >= F.PRIS} ov={ov} className={stor ? 'mt-6' : 'mt-3'}>
        <div className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t ${stor ? 'pt-4 text-[13.5px]' : 'pt-2.5 text-[12.5px]'}`} style={{ borderColor: HAIR, color: DIM }}>
          <span className={`${stor ? 'text-[22px]' : 'text-[15px]'} font-medium tracking-[-0.01em] text-[#15130F]`}><span className="tabular-nums">{tall(12500)}</span> kr <span className={`${stor ? 'text-[13.5px]' : 'text-[12px]'} font-normal`} style={{ color: DIM }}>/mnd</span></span>
          <span>Depositum 3 mnd</span>
          <span>Forslag · forrige leie {tall(12000)} kr</span>
        </div>
      </Inn>
    </div>
  );
}

/* Fortellerlinjen — nederst i rammen. Tekst + handling når det finnes en. */
function Forteller({ fase, ov, kompakt = false }) {
  const tekst = FORTELLER[fase] || '';
  const publiser = fase >= F.KLAR && fase <= F.FINN;
  const velg = fase >= F.DAG6;
  return (
    <div className={`flex items-center justify-between gap-4 border-t ${kompakt ? 'min-h-[56px] px-4 py-2.5' : 'px-8'}`} style={{ borderColor: HAIR, background: PAPIR, height: kompakt ? undefined : BUNN }} data-testid="v4-forteller">
      <p key={tekst} className={`min-w-0 ${kompakt ? 'text-[13px] leading-[1.4]' : 'truncate text-[14px]'} animate-in fade-in-0 slide-in-from-bottom-1 duration-400`} style={{ color: 'rgba(21,19,15,0.72)' }}>
        <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full" style={{ background: fase >= F.VALGT ? T.gronn : T.lilla }} aria-hidden="true" />{tekst}
      </p>
      {publiser && (
        <AutoKnapp presser={fase === F.TRYKK} trykket={fase >= F.PUBLISERT} etter="Publisert" testid="v4-publiser">
          Publiser på <Finn h={16} />
        </AutoKnapp>
      )}
      {velg && (
        <AutoKnapp presser={fase === F.VELG} trykket={fase >= F.VALGT} etter="Kontrakt sendt" testid="v4-velg">Velg Emma</AutoKnapp>
      )}
    </div>
  );
}

function ValgKort({ fase, ov }) {
  const klar = fase >= F.DAG6;
  const trykket = fase >= F.VALGT;
  const dimt = { color: 'rgba(244,241,234,0.62)' };
  return (
    <div className="rounded-[14px] p-5" style={{ background: T.charcoal, color: T.offwhite, boxShadow: '0 24px 60px -30px rgba(0,0,0,0.6)' }} data-testid="v4-valgkort">
      {!klar ? (
        <div key="venter" className="animate-in fade-in-0 duration-500">
          <div className="flex items-center justify-between text-[12px]" style={dimt}>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(244,241,234,0.4)' }} />Velg leietaker</span>
            <span>etter visning</span>
          </div>
          <p className="mt-3 text-[15px] font-medium">Interessentene legitimerer seg selv</p>
          <p className="mt-1 text-[13px] leading-[1.45]" style={dimt}>BankID, inntekt og referanse lastes opp i portalen. Du ser hvem som er dokumentert — og velger etter visning tirsdag.</p>
        </div>
      ) : (
        <div key="klar" className="animate-in fade-in-0 duration-500">
          <div className="flex items-center justify-between text-[12px]" style={dimt}>
            <span className="inline-grid">
              <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ opacity: trykket ? 0 : 1, transition: ov ? 'none' : `opacity 200ms ${EASE}` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Klar for valg</span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5" style={{ color: '#7DDBA1', opacity: trykket ? 1 : 0, transition: ov ? 'none' : `opacity 300ms ${EASE} 150ms` }}><Hake />Kontrakt sendt · BankID</span>
            </span>
            <span>Dag 6</span>
          </div>
          <p className="mt-3 text-[15px] font-medium">Emma Sørensen <span style={dimt}>· anbefalt</span></p>
          <p className="mt-1 text-[13px]" style={dimt}>BankID · inntekt · referanse dokumentert · ønsker 3 års leie</p>
          <p className="mt-3 text-[18px] font-medium tracking-[-0.01em] lg:text-[20px]"><span className="tabular-nums">{tall(12500)}</span> kr<span className="text-[13px] font-normal" style={dimt}> /mnd · 3 mnd depositum</span></p>
        </div>
      )}
    </div>
  );
}

function Rad({ p, fase, kompakt }) {
  const chip = p.chip(fase);
  const dok = p.dok(fase);
  return (
    <div className={`grid items-center gap-3 border-t ${kompakt ? 'grid-cols-[26px_minmax(0,1fr)] py-2.5' : 'grid-cols-[30px_minmax(0,1fr)_auto] py-3'}`} style={{ borderColor: HAIR }}>
      <Initial bokstav={p.b} size={kompakt ? 26 : 30} />
      <span className="min-w-0">
        <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${kompakt ? 'text-[13px]' : 'text-[14px]'} font-medium`}>
          {p.n}
          {dok.length > 0 && <Dok liste={dok} />}
        </span>
        <span key={p.d(fase)} className={`mt-0.5 block truncate ${kompakt ? 'text-[12px]' : 'text-[13px]'} text-[#15130F]/55 animate-in fade-in-0 duration-300`}>{p.d(fase)}</span>
        {kompakt && chip && <span className="mt-1.5 block"><Chip tekst={chip[0]} tone={chip[1]} liten /></span>}
      </span>
      {!kompakt && <span className="inline-flex min-w-[96px] justify-end">{chip ? <Chip tekst={chip[0]} tone={chip[1]} liten /> : null}</span>}
    </div>
  );
}

function Interessenter({ fase, ov, kompakt = false }) {
  const ingen = fase < F.DAG1;
  return (
    <div data-testid="v4-interessenter">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[#15130F]/45">Interessenter <span className="font-normal" style={{ color: DIM }}>· via <Finn h={13} /></span></span>
        <span style={{ color: DIM }}>BankID · inntekt · referanse</span>
      </div>
      <div className="grid">
        <div className="col-start-1 row-start-1 border-t py-3 text-[13px]" style={{ borderColor: HAIR, color: DIM, opacity: ingen ? 1 : 0, transition: ov ? 'none' : `opacity 300ms ${EASE}` }} aria-hidden={!ingen}>Annonsen er ute. Interessentene samles her.</div>
        <ol className="col-start-1 row-start-1 mt-2">
          {FOLK.map((p) => (
            <li key={p.n}><Vokse vis={fase >= p.fra} ov={ov}><Rad p={p} fase={fase} kompakt={kompakt} /></Vokse></li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function AnnonseKortKompakt({ fase, ov, stablet = false }) {
  const sendt = fase >= F.VALGT;
  return (
    <div className={`overflow-hidden rounded-[14px] ${stablet ? '' : 'grid grid-cols-[200px_minmax(0,1fr)]'}`} style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4-annonse-kort">
      <div className="relative" style={{ aspectRatio: stablet ? '16 / 9' : undefined, minHeight: stablet ? undefined : 132 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={KILDE.stue.moblertLiten} alt="Stuen, møblert med KI" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 60%' }} draggable={false} />
        <Lapp vis className="bottom-2 left-2" ov={ov}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Illustrasjon</Lapp>
      </div>
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between text-[12px]" style={{ color: DIM }}>
          <span className="font-medium text-[#15130F]/45">Annonse</span>
          <span key={sendt ? 'u' : 'a'} className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-300"><Finn h={14} />{sendt ? 'reservert' : 'aktiv'}</span>
        </div>
        <p className="mt-1.5 text-[15px] font-medium leading-[1.3] tracking-[-0.008em]">{ANNONSE.tittel}</p>
        <p className="mt-1 text-[12.5px]" style={{ color: DIM }}>{ANNONSE.spes}</p>
        <p className="mt-2 text-[12.5px]" style={{ color: DIM }}><span className="font-medium text-[#15130F]">{tall(12500)} kr</span> /mnd · depositum 3 mnd · 5 bilder</p>
      </div>
    </div>
  );
}

function BoligKort({ kompakt = false }) {
  return (
    <div className="rounded-[14px] p-4 text-[13px]" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4-boligkort">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[#15130F]/45">Boligen</span>
        <span style={{ color: DIM }}>Leilighet 2 · 54 m²</span>
      </div>
      <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2">
        <dt style={{ color: DIM }}>Detaljer</dt><dd>2-roms · 1 soverom · 2. etasje · parkett · kjøkkenøy · garderobe</dd>
        <dt style={{ color: DIM }}>Forrige leie</dt><dd>{tall(12000)} kr /mnd</dd>
        <dt style={{ color: DIM }}>Ledig fra</dt><dd>1. november</dd>
      </dl>
      {!kompakt && (
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {FOTOS.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-[6px]" style={{ aspectRatio: '3 / 2', background: 'rgba(21,19,15,0.05)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.id === 'stue' ? b.moblertLiten : b.src} alt={b.navn} className="h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Detaljpanelet */
function Kildemerke({ kilde }) {
  const b = KILDE[kilde];
  if (b) {
    return (
      <span className="inline-block h-[24px] w-[36px] shrink-0 overflow-hidden rounded-[5px]" style={{ boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.liten || b.src} alt="" className="h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
      </span>
    );
  }
  return <span className="inline-flex h-[24px] w-[36px] shrink-0 items-center justify-center rounded-[5px] text-[9.5px] font-medium" style={{ background: 'rgba(21,19,15,0.06)', color: 'rgba(21,19,15,0.6)' }} aria-hidden="true">{kilde === 'avtale' ? 'Avtale' : 'Bolig'}</span>;
}

function Detaljpanel({ fase, ov, kompakt = false }) {
  const klar = fase >= F.DETALJER;
  return (
    <div className={`rounded-[14px] ${kompakt ? 'p-4' : 'p-5'}`} style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4-detaljer">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-medium text-[#15130F]/45">Detaljer</span>
        <span key={klar ? 'k' : 'l'} className="animate-in fade-in-0 duration-300" style={{ color: DIM }}>{klar ? 'fra bildene, boligen og avtalen · du kan rette' : 'fra bildene'}</span>
      </div>
      <dl className="mt-2">
        {RADER.map((r) => (
          <Inn key={r.k} vis={fase >= r.fase} ov={ov} y={6}>
            <div className={`grid items-center gap-3 border-t ${kompakt ? 'grid-cols-[36px_72px_minmax(0,1fr)] py-2' : 'grid-cols-[36px_88px_minmax(0,1fr)] py-[10px]'}`} style={{ borderColor: HAIR }}>
              <Kildemerke kilde={r.kilde} />
              <dt className="text-[13px]" style={{ color: DIM }}>{r.k}</dt>
              <dd className={`${kompakt ? 'text-[13px]' : 'text-[14.5px]'} font-medium tracking-[-0.005em]`}>{r.v}</dd>
            </div>
          </Inn>
        ))}
      </dl>
      <Inn vis={klar} ov={ov} className="mt-3" delay={250}>
        <div className="flex items-center justify-between rounded-[10px] px-3.5 py-3 text-[13.5px]" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
          <span style={{ color: DIM }}>Sammendrag</span>
          <span className="font-medium">2-roms · 54 m² · 2. etasje · parkett</span>
        </div>
      </Inn>
    </div>
  );
}

/* ── Scenens layout på desktop ── */
function layout(W) {
  const pad = 40; const gap = 12;
  const y0 = TOPP; const sh = H - TOPP - BUNN;         // scenens område
  /* Viser + filmstripe til venstre, detaljpanel til høyre */
  const tw = Math.min(600, Math.round(W * 0.47));
  const rip = Math.round((tw - 4 * gap) / 5); const riph = Math.round(rip / 1.5);
  const th = Math.round(tw / 1.5);
  const blokkH = th + gap + riph;
  const vy = y0 + Math.round((sh - blokkH) / 2);
  const viser = { x: pad, y: vy, w: tw, h: th };
  const stripe = FOTOS.map((_, i) => ({ x: pad + i * (rip + gap), y: vy + th + gap, w: rip, h: riph }));
  const panel = { x: pad + tw + 36, y: Math.min(vy, y0 + 20), w: W - (pad + tw + 36) - pad };
  /* Stort */
  const bh = sh - 56; const bw = Math.min(Math.round(bh * 1.5), W - 2 * pad);
  const stor = { x: Math.round((W - bw) / 2), y: y0 + Math.round((sh - bh) / 2), w: bw, h: bh };
  /* Venstre + tekst */
  const pw = Math.min(600, Math.round(W * 0.46)); const ph = Math.round(pw / 1.5);
  const venstre = { x: pad, y: y0 + Math.round((sh - ph) / 2), w: pw, h: ph };
  const tekst = { x: pad + pw + 48, y: venstre.y - 2, w: W - (pad + pw + 48) - pad };
  /* FINN-forhåndsvisningen: kort med toppfelt, bildet til venstre, teksten til høyre */
  const fw = Math.min(820, W - 2 * pad); const topp = 44; const ip = 20;
  const iw = Math.round(fw * 0.46); const ih = Math.round(iw / 1.5);
  const ch = topp + ip + ih + ip;
  const kort = { x: Math.round((W - fw) / 2), y: y0 + Math.round((sh - ch) / 2), w: fw, h: ch };
  const finn = {
    kort, topp,
    bilde: { x: kort.x + ip, y: kort.y + topp + ip, w: iw, h: ih },
    tekst: { x: kort.x + ip + iw + 24, y: kort.y + topp + ip, w: fw - 2 * ip - iw - 24, h: ih },
  };
  return { viser, stripe, panel, stor, venstre, tekst, finn };
}

function viserRekt(L, fase) {
  if (fase <= F.DETALJER) return L.viser;
  if (fase <= F.MOBLERT) return L.stor;
  if (fase === F.FINN) return L.finn.bilde;
  return L.venstre;
}

/* Viseren — ett element gjennom hele historien */
function Viser({ fase, L, ov, onHold }) {
  const r = viserRekt(L, fase);
  const inne = fase >= F.ARK && fase < F.SYSTEM;
  const stor = fase >= F.FORSIDE && fase <= F.MOBLERT;
  const iFinn = fase === F.FINN;
  const t = (p, ms, d = 0) => `${p} ${ms}ms ${EASE} ${d}ms`;
  const overgang = ov ? 'none' : [t('left', 950), t('top', 950), t('width', 950), t('height', 950), t('opacity', 500), t('box-shadow', 600), t('border-radius', 600)].join(', ');
  return (
    <div className="absolute overflow-hidden" style={{ left: r.x, top: inne ? r.y : r.y + 28, width: r.w, height: r.h, borderRadius: iFinn ? 10 : 14, opacity: inne ? 1 : 0, background: 'rgba(21,19,15,0.05)', boxShadow: stor ? '0 40px 90px -40px rgba(21,19,15,0.5)' : iFinn ? 'none' : '0 0 0 1px rgba(21,19,15,0.06)', transition: overgang, zIndex: 2 }} aria-hidden={!inne} data-testid="v4-viser" data-bilde={fase >= F.MOBLERT ? 'moblert' : viserBilde(fase)}>
      <Bildeflate fase={fase} ov={ov} onHold={onHold} />
    </div>
  );
}

/* Filmstripen under viseren */
function Stripe({ fase, L, ov }) {
  const inne = fase >= F.ARK && fase <= F.DETALJER;
  return FOTOS.map((b, i) => {
    const r = L.stripe[i];
    const aktiv = b.les != null && fase === b.les;
    const lest = b.les != null && fase > b.les;
    return (
      <div key={b.id} className="absolute overflow-hidden rounded-[8px]" style={{ left: r.x, top: inne ? r.y : r.y + 20, width: r.w, height: r.h, opacity: inne ? 1 : 0, background: 'rgba(21,19,15,0.05)', boxShadow: aktiv ? `0 0 0 2px ${T.lilla}` : lest ? '0 0 0 1px rgba(21,19,15,0.25)' : '0 0 0 1px rgba(21,19,15,0.06)', transform: aktiv ? 'scale(1.06)' : 'none', transition: ov ? 'none' : `opacity 500ms ${EASE} ${fase === F.ARK ? i * 70 : 0}ms, top 700ms ${EASE} ${fase === F.ARK ? i * 70 : 0}ms, transform 400ms ${EASE}, box-shadow 400ms ${EASE}` }} aria-hidden={!inne} data-testid={`v4-stripe-${b.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.liten || b.src} alt={b.navn} className="h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
        <span className="absolute right-1 top-1 inline-flex h-[16px] w-[16px] items-center justify-center rounded-full" style={{ background: 'rgba(251,250,248,0.94)', color: T.ink, opacity: lest ? 1 : 0, transform: lest ? 'none' : 'scale(0.6)', transition: ov ? 'none' : `opacity 250ms ${EASE}, transform 250ms ${EASE}` }} aria-hidden="true"><Hake size={10} /></span>
      </div>
    );
  });
}

/* Kapittel-linjen */
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

function Kapitler({ fase, onVelg, kompakt = false }) {
  let aktiv = -1;
  KAPITLER.forEach((k, i) => { if (fase >= k.fra) aktiv = i; });
  return (
    <ol className={`flex items-end ${kompakt ? 'gap-3 overflow-x-auto' : 'gap-5'}`} data-testid="v4-kapitler">
      {KAPITLER.map((k, i) => {
        const er = i === aktiv; const gjort = i < aktiv;
        return (
          <li key={k.navn} className="shrink-0">
            <button type="button" onClick={() => onVelg(i)} aria-current={er ? 'step' : undefined} className="flex flex-col items-stretch gap-1.5 focus-visible:outline-none" data-testid={`v4-kapittel-${i}`}>
              <span className={`${kompakt ? 'text-[11.5px]' : 'text-[12.5px]'} transition-colors duration-300`} style={{ color: er ? T.ink : gjort ? 'rgba(21,19,15,0.55)' : 'rgba(21,19,15,0.38)', fontWeight: er ? 500 : 400 }}>{k.navn}</span>
              <span className="relative block h-[2px] overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.10)' }}>
                <Fyll aktiv={er} gjort={gjort} dur={varighet(i)} />
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Desktop ── */
function Desktop({ fase, ov, onKapittel, onHold }) {
  const NAV = ['Oversikt', 'Eiendommer', 'Leietakere', 'Saker', 'Økonomi', 'Dokumenter'];
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
  const system = fase >= F.SYSTEM;
  const [st, stTone] = status(fase);
  const venter = fase === F.DAG6 || fase === F.VELG;
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);
  const start = fase <= F.TRYKK_START;
  const ark = fase >= F.ARK && fase <= F.DETALJER;
  const tekst = fase >= F.TITTEL && fase < F.FINN;

  return (
    <div ref={ref} className="relative overflow-hidden text-[#15130F]" style={{ height: H, background: PAPIR }} data-testid="v4-annonse-desktop" data-system={system ? '1' : '0'}>
      {/* Starten — tom flate, én knapp midt på */}
      <Inn vis={start} ov={ov} className="absolute inset-x-0 z-[5] flex justify-center px-8" y={0} style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <Start fase={fase} ov={ov} />
      </Inn>

      {/* Topplinje — brødsmule · kapitler · status */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-6 px-8 pt-[46px] text-[13px]" style={{ color: DIM, opacity: start ? 0 : 1, transition: `opacity ${bt(500)}` }} aria-hidden={start}>
        <span className="min-w-0 shrink-0">Nygårdsgaten 5 <span className="mx-1.5 text-[#15130F]/30">/</span> Leilighet 2 <span className="mx-1.5 text-[#15130F]/30">/</span> <span key={system ? 'u' : 'n'} className="text-[#15130F] animate-in fade-in-0 duration-300">{system ? 'Utleie' : 'Ny annonse'}</span></span>
        <Kapitler fase={fase} onVelg={onKapittel} />
        <span className="flex shrink-0 justify-end" style={{ minWidth: 220 }}><Chip tekst={st} tone={stTone} testid="v4-status" /></span>
      </div>

      {/* ── Scenen ── */}
      <div className="absolute inset-x-0 top-0" style={{ bottom: BUNN, opacity: system || !L ? 0 : 1, transform: system ? 'scale(0.985)' : 'none', transition: `opacity ${bt(450)}, transform ${bt(650)}`, pointerEvents: system ? 'none' : 'auto' }} aria-hidden={system}>
        {L && <FinnRamme fase={fase} L={L} ov={ov} />}
        {L && <Viser fase={fase} L={L} ov={ov} onHold={onHold} />}
        {L && <Stripe fase={fase} L={L} ov={ov} />}

        {L && (
          <div className="absolute" style={{ left: L.panel.x, top: L.panel.y, width: L.panel.w, opacity: ark ? 1 : 0, transform: ark ? 'none' : 'translateY(16px)', transition: `opacity ${bt(500, ark ? 300 : 0)}, transform ${bt(600, ark ? 300 : 0)}` }} aria-hidden={!ark}>
            <Detaljpanel fase={fase} ov={ov} />
          </div>
        )}

        {L && (
          <div className="absolute" style={{ left: L.tekst.x, top: L.tekst.y, width: L.tekst.w, opacity: tekst ? 1 : 0, transition: `opacity ${bt(400)}` }} aria-hidden={!tekst}>
            <AnnonseTekst fase={fase} ov={ov} stor />
          </div>
        )}
      </div>

      {/* ── Systemet — trer frem innenfor rammen ── */}
      <div className="absolute inset-x-0 grid grid-cols-[224px_minmax(0,1fr)]" style={{ top: TOPP, bottom: BUNN, opacity: system ? 1 : 0, transition: `opacity ${bt(500, 250)}`, pointerEvents: system ? 'auto' : 'none' }} aria-hidden={!system} data-testid="v4-system">
        <aside className="flex flex-col border-r border-t px-4 py-5" style={{ background: STEIN, borderColor: HAIR, transform: system ? 'none' : 'translateX(-40px)', transition: `transform ${bt(800, 250)}` }}>
          <div className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[13px]" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
            <span className="font-medium">Nygårdsgaten 5</span>
            <span className="text-[#15130F]/40">▾</span>
          </div>
          <nav className="mt-5 flex flex-col gap-0.5 text-[13.5px]">
            {NAV.map((n) => {
              const er = n === 'Eiendommer';
              return (
                <span key={n} className="flex items-center justify-between rounded-[8px] px-3 py-2" style={{ background: er ? 'rgba(21,19,15,0.06)' : 'transparent', color: er ? T.ink : 'rgba(21,19,15,0.62)', fontWeight: er ? 500 : 400 }}>
                  {n}
                  {er && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium" style={{ background: T.lilla, color: T.ink, opacity: venter ? 1 : 0, transition: `opacity ${bt(300)}` }} aria-hidden={!venter}>1</span>}
                </span>
              );
            })}
          </nav>
          <div className="mt-auto flex items-center gap-2.5 px-2 pt-6 text-[13px]">
            <Avatar src="/v4/kari.webp" alt="Kari" size={26} />
            <span><span className="block font-medium">Kari Nilsen</span><span className="block text-[11.5px] text-[#15130F]/50">Eier</span></span>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col overflow-hidden border-t" style={{ borderColor: HAIR, transform: system ? 'none' : 'translateY(14px)', transition: `transform ${bt(800, 350)}` }}>
          <div className="px-7 pb-6 pt-5">
            <div>
              <h3 className="text-[22px] font-medium tracking-[-0.01em]">Leilighet 2 · ledig fra 1. november</h3>
              <p key={undertekst(fase)} className="mt-1 text-[13px] text-[#15130F]/55 animate-in fade-in-0 duration-300" data-testid="v4-undertekst">{undertekst(fase)}</p>
            </div>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_340px] gap-6">
              <div className="min-w-0">
                <AnnonseKortKompakt fase={fase} ov={ov} />
                <div className="pt-5"><Interessenter fase={fase} ov={ov} /></div>
              </div>
              <div className="flex flex-col gap-4">
                <ValgKort fase={fase} ov={ov} />
                <BoligKort />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fortellerlinjen — alltid nederst (etter starten) */}
      <div className="absolute inset-x-0 bottom-0 z-10" style={{ opacity: start ? 0 : 1, transition: `opacity ${bt(500)}` }} aria-hidden={start}><Forteller fase={fase} ov={ov} /></div>
    </div>
  );
}

/* ── Under lg: samme akter, stablet ── */
function Kompakt({ fase, ov, onKapittel, onHold }) {
  const system = fase >= F.SYSTEM;
  const start = fase <= F.TRYKK_START;
  const [st, stTone] = status(fase);
  const ark = fase >= F.ARK && fase <= F.DETALJER;
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-kompakt" data-system={system ? '1' : '0'}>
      <Vokse vis={start} ov={ov}>
        <div className="flex justify-center px-4 py-24"><Start fase={fase} ov={ov} kompakt /></div>
      </Vokse>

      <Vokse vis={!start} ov={ov}>
        <div className="border-b px-4 pb-3 pt-3" style={{ borderColor: HAIR }}>
          <div className="flex items-center justify-between gap-3 text-[12.5px] text-[#15130F]/55">
            <span className="truncate">Nygårdsgaten 5 <span className="mx-1 text-[#15130F]/30">/</span> Leilighet 2 <span className="mx-1 text-[#15130F]/30">/</span> <span className="text-[#15130F]">{system ? 'Utleie' : 'Ny annonse'}</span></span>
            <Chip tekst={st} tone={stTone} liten />
          </div>
          <div className="mt-3"><Kapitler fase={fase} onVelg={onKapittel} kompakt /></div>
        </div>
      </Vokse>

      <Vokse vis={!start && !system} ov={ov}>
        <div className="px-4 pb-4 pt-4">
          <Vokse vis={fase >= F.ARK && fase < F.FINN} ov={ov}>
            <div className="relative overflow-hidden rounded-[12px]" style={{ aspectRatio: '3 / 2', background: 'rgba(21,19,15,0.05)' }} data-testid="v4-viser-kompakt">
              <Bildeflate fase={fase} ov={ov} onHold={onHold} liten testid="v4-bildeflate-kompakt" />
            </div>
          </Vokse>
          <Vokse vis={ark} ov={ov}>
            <div className="grid grid-cols-5 gap-1.5 pt-2">
              {FOTOS.map((b) => {
                const aktiv = fase === b.les; const lest = b.les != null && fase > b.les;
                return (
                  <div key={b.id} className="relative overflow-hidden rounded-[6px]" style={{ aspectRatio: '3 / 2', background: 'rgba(21,19,15,0.05)', boxShadow: aktiv ? `0 0 0 2px ${T.lilla}` : lest ? '0 0 0 1px rgba(21,19,15,0.25)' : '0 0 0 1px rgba(21,19,15,0.06)', transform: aktiv ? 'scale(1.06)' : 'none', transition: ov ? 'none' : `box-shadow 400ms ${EASE}, transform 400ms ${EASE}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.liten || b.src} alt={b.navn} className="h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
                  </div>
                );
              })}
            </div>
            <div className="pt-3"><Detaljpanel fase={fase} ov={ov} kompakt /></div>
          </Vokse>
          <Vokse vis={fase >= F.TITTEL && fase < F.FINN} ov={ov}><div className="pt-4"><AnnonseTekst fase={fase} ov={ov} /></div></Vokse>
          <Vokse vis={fase === F.FINN} ov={ov}><FinnKortKompakt ov={ov} /></Vokse>
        </div>
      </Vokse>

      <Vokse vis={system} ov={ov}>
        <div className="px-4 pb-5 pt-4">
          <h4 className="text-[20px] font-medium tracking-[-0.01em]">Leilighet 2 · ledig fra 1. november</h4>
          <p key={undertekst(fase)} className="mt-1 text-[12.5px] text-[#15130F]/55 animate-in fade-in-0 duration-300">{undertekst(fase)}</p>
          <div className="mt-4"><AnnonseKortKompakt fase={fase} ov={ov} stablet /></div>
          <div className="mt-4"><ValgKort fase={fase} ov={ov} /></div>
          <div className="mt-5"><Interessenter fase={fase} ov={ov} kompakt /></div>
        </div>
      </Vokse>

      <Vokse vis={!start} ov={ov}><Forteller fase={fase} ov={ov} kompakt /></Vokse>
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
    if (r) { setOv(true); setFase(F.KLAR); }
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
        if (ov) { setFase(F.KLAR); return; }
        setMorkt(true);
        window.setTimeout(() => { setFase(F.START); window.setTimeout(() => setMorkt(false), 700); }, 500);
      } else {
        setFase((f) => f + 1);
      }
    }, ms);
    return () => window.clearTimeout(t);
  }, [fase, startet, ov, morkt, holdt]);

  const tilKapittel = (i) => { setMorkt(false); setStartet(true); setFase(KAPITLER[i].fra); };

  const inn = { opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(28px)', transition: ov ? 'none' : `opacity 800ms ${EASE}, transform 800ms ${EASE}` };
  const lys = tema === 'lys';
  const skygge = lys
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';
  const felles = { fase, ov, onKapittel: tilKapittel, onHold: setHoldt };
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
