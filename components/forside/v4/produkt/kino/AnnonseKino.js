'use client';

import React from 'react';
import { EASE, T, display, tall } from '../../motion';
import { Finn, Portrett, useFilm, BOLIG, EMMA } from '../filmdeler';
import { OFF, INK, MORF, SCRIM, bilde, dekk, margPx, useKino, farger, KinoStage, KinoTekst, Etikett, Fokus, Autofokus, Hjorne, Flyt, Rad, Sone, Merke, KinoDok, KinoNeste, KinoKnapp } from './Kino';

/* ---------------------------------------------------------------------------
   AnnonseKino — kapittel 1 i full bleed. «Fra fem bilder til valgt leietaker.»

   Hele skjermen er kameraet. Fasaden står alene; søkeren (fire hjørner, svakt
   tredelingsnett, «Fasade · 1 av 5», utløseren) legger seg over fotoet. Hvert
   trykk: bildet løsner fra scenen og krymper ned i bunken nede til høyre —
   og neste rom står allerede der bak. Fem rom, fem bilder. Så leses bildene:
   etiketter lander rett i fotoet der systemet ser noe. Sengen res opp med én
   skillelinje over hele skjermen. Annonsen skriver seg på fotoet, publiseres
   på FINN, interessentene kommer — og Emma velges.

   Kun transform/opacity i bevegelse. Ingen kort, ingen papir, ingen telefon.
--------------------------------------------------------------------------- */

const FASE_NAVN = ['START', 'KAM', 'F1', 'T1', 'F2', 'T2', 'F3', 'T3', 'F4', 'T4', 'F5', 'T5', 'STABEL',
  'LES1', 'LES2', 'LES3', 'STYLE', 'STYLET', 'TITTEL', 'TEKST', 'PRIS', 'KLAR', 'TRYKK', 'PUBLISERT',
  'INT1', 'INT2', 'BOOK', 'SPM', 'ETTER', 'VELG', 'VALGT', 'SLUTT'];
const F = Object.fromEntries(FASE_NAVN.map((n, i) => [n, i]));
const AUTO = {
  [F.START]: 1800, [F.KAM]: 1300,
  [F.F1]: 1500, [F.T1]: 950, [F.F2]: 1200, [F.T2]: 950, [F.F3]: 1200, [F.T3]: 950, [F.F4]: 1200, [F.T4]: 950, [F.F5]: 1400, [F.T5]: 950,
  [F.STABEL]: 3000,
  [F.LES1]: 3400, [F.LES2]: 3200, [F.LES3]: 3000, [F.STYLE]: 3400, [F.STYLET]: 1700,
  [F.TITTEL]: 1000, [F.TEKST]: 1000, [F.PRIS]: 1500, [F.KLAR]: 1500, [F.TRYKK]: 380, [F.PUBLISERT]: 2600,
  [F.INT1]: 1200, [F.INT2]: 1100, [F.BOOK]: 1900, [F.SPM]: 1500, [F.ETTER]: 1900, [F.VELG]: 380, [F.VALGT]: 2600,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

/* Scenefotoene. posLiten = utsnitt på mobil (stående). */
const BILDER = [
  bilde('fasade', '/v4/annonse/fasade-kveld-1920.webp', '/v4/annonse/fasade-kveld-1200.webp', 1920, 1097, '56% 46%', '70% 50%'),
  bilde('kjokken', '/v4/annonse/kjokken-1280.webp', '/v4/annonse/kjokken-600.webp', 1280, 853, '50% 50%', '42% 50%'),
  bilde('soverom-useng', '/v4/annonse/soverom-useng-1000.webp', '/v4/annonse/soverom-useng-700.webp', 1000, 667, '50% 50%', '46% 50%'),
  bilde('soverom', '/v4/annonse/soverom-1000.webp', '/v4/annonse/soverom-700.webp', 1000, 667, '50% 50%', '46% 50%'),
  bilde('spisestue', '/v4/annonse/spisestue-1280.webp', '/v4/annonse/spisestue-600.webp', 1280, 853, '50% 50%', '56% 50%'),
  bilde('stue', '/v4/annonse/stue-tom-1200.webp', '/v4/annonse/stue-tom-700.webp', 1200, 800, '50% 50%', '42% 50%'),
];
const K = Object.fromEntries(BILDER.map((b) => [b.id, b]));

/* Kameraet: rekkefølgen du tar bildene i, og hvor autofokusen lander (prosent av bildet). */
const OPPTAK = [
  { id: 'fasade', navn: 'Fasade', fokus: { x: 66, y: 44, w: 19, h: 26 } },
  { id: 'kjokken', navn: 'Kjøkken', fokus: { x: 36, y: 46, w: 26, h: 26 } },
  { id: 'soverom-useng', navn: 'Soverom', fokus: { x: 26, y: 52, w: 34, h: 28 } },
  { id: 'spisestue', navn: 'Spisestue', fokus: { x: 38, y: 36, w: 26, h: 30 } },
  { id: 'stue', navn: 'Stue', fokus: { x: 26, y: 20, w: 16, h: 40 } },
];
const fotoIndeks = (fase) => (fase >= F.F1 && fase <= F.T5 ? Math.floor((fase - F.F1) / 2) : -1);
const tarBilde = (fase) => fase >= F.F1 && fase <= F.T5 && (fase - F.F1) % 2 === 1;

/* Hvilket foto som er scenen i hver fase */
function bildeFor(fase) {
  if (fase <= F.F1) return 'fasade';
  if (fase <= F.F2) return 'kjokken';
  if (fase <= F.F3) return 'soverom-useng';
  if (fase <= F.F4) return 'spisestue';
  if (fase <= F.LES1) return 'stue';
  if (fase === F.LES2) return 'kjokken';
  if (fase <= F.STYLE) return 'soverom-useng';
  if (fase === F.STYLET) return 'soverom';
  if (fase <= F.PUBLISERT) return 'stue';
  return 'fasade';
}

/* Teksten nede til venstre — én akt om gangen */
const AKTER = [
  { id: 'start', fra: F.START, tittel: 'Begynn med bildene.', tekst: 'Fem bilder fra mobilen holder. DigiHome ordner resten mens de lastes opp.' },
  { id: 'rest', fra: F.STABEL, tittel: 'Vi gjør resten.', liste: ['Romtype gjenkjent', 'Bilde optimalisert', 'Rekkefølge foreslått'] },
  { id: 'les1', fra: F.LES1, tittel: 'Ser hva rommet har.', tekst: 'Store vinduer, kjøkkenøy, parkett. Alt som havner i annonsen, kan spores tilbake til et bilde.' },
  { id: 'les2', fra: F.LES2, tittel: 'Finner det leietakere spør om.', tekst: 'Hvitevarer, spiseplass, dagslys. Svarene ligger i bildene — før noen rekker å spørre.' },
  { id: 'les3', fra: F.LES3, tittel: 'Foreslår det som kan bli bedre.', tekst: 'Sengen er uoppredd. Forslaget: re den opp digitalt — resten av rommet får være som det er.' },
  { id: 'style', fra: F.STYLE, tittel: 'Sengen res opp.', tekst: 'Én instruks, avgrenset til sengen. Rommet, lyset og alt som er fast, står urørt — og bildet merkes som redigert.' },
  { id: 'utkast', fra: F.TITTEL, tittel: 'Utkastet er klart.', tekst: 'Overskrift, tekst og prisforslag — fra bildene og det du allerede vet om boligen. Endre det du vil, eller publiser som det er.' },
  { id: 'finn', fra: F.PUBLISERT, tittel: 'Ute på FINN.no.', tekst: 'Samme bilder, samme tekst. Interessentene melder seg med BankID, så du vet hvem du har med å gjøre.' },
  { id: 'visning', fra: F.INT1, tittel: 'Visningen booker de selv.', tekst: 'Interessentene velger et ledig tidspunkt og får bekreftelsen på SMS. Du møter opp.' },
  { id: 'velg', fra: F.ETTER, tittel: 'Du velger leietaker.', tekst: 'Inntekt og referanse ligger klart. Velg Emma — de andre får beskjed samtidig, uten at du skriver noe.' },
  { id: 'slutt', fra: F.SLUTT, tittel: 'Boligen har fått leietaker.', tekst: 'Emma flytter inn 1. november. Kontrakten er neste — og den er allerede fylt ut.' },
];
const aktFor = (fase) => { let a = AKTER[0]; AKTER.forEach((x) => { if (fase >= x.fra) a = x; }); return a; };

/* Det systemet ser i hvert bilde — punkt (prosent av bildet), etikett, ev. fokusområde. Holder seg unna tekstsonen nede til venstre. */
const PINNER = {
  [F.LES1]: { bilde: 'stue', liste: [
    { id: 'vinduer', t: 'Store vinduer', p: [30, 30], omr: { x: 24, y: 14, w: 17, h: 42 }, plass: 'hoyre', d: 500 },
    { id: 'oy', t: 'Kjøkkenøy', p: [50, 62], omr: { x: 34, y: 58, w: 22, h: 12 }, plass: 'hoyre', d: 1400 },
    { id: 'parkett', t: 'Parkett', p: [74, 75], plass: 'over', d: 2200 },
  ] },
  [F.LES2]: { bilde: 'kjokken', liste: [
    { id: 'hvitevarer', t: 'Integrerte hvitevarer', p: [33, 56], omr: { x: 24, y: 56, w: 16, h: 24 }, plass: 'over', d: 500 },
    { id: 'spise', t: 'Spiseplass til fire', p: [84, 70], plass: 'over', d: 1400 },
    { id: 'vindu', t: 'Dagslys fra to sider', p: [8, 38], plass: 'hoyre', d: 2200 },
  ] },
  [F.LES3]: { bilde: 'soverom-useng', liste: [
    { id: 'garderobe', t: 'Garderobe', p: [93, 34], plass: 'venstre', d: 500 },
    { id: 'seng', t: 'Uoppredd seng · forslag: re opp', p: [60, 68], tone: 'lilla', omr: { x: 20, y: 50, w: 52, h: 26 }, plass: 'over', d: 1400 },
  ] },
};

const ANNONSE = {
  tittel: 'Lys 2-roms med åpen kjøkkenløsning i Nygårdsgaten',
  spes: '54 m² · 1 soverom · 2. etasje · parkett · ledig 1. november',
  tekst: 'Lys 2-roms i klassisk bygård. Åpen kjøkkenløsning med kjøkkenøy, integrerte hvitevarer og spiseplass, parkett og store vinduer mot rolig gate.',
};

/* Interessentene — ekte portretter */
const FOLK = [
  {
    n: 'Emma Sørensen', bilde: EMMA.bilde, fra: F.INT1,
    d: (f) => (f >= F.VALGT ? 'Valgt · kontrakten forberedes' : f >= F.ETTER ? 'Visning gjennomført · ønsker 3 års leie' : f >= F.BOOK ? 'Visning tirsdag 17:30 · bekreftet på SMS' : 'Meldte interesse via FINN'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt', 'Referanse'] : f >= F.BOOK ? ['BankID', 'Inntekt'] : ['BankID']),
    merke: (f) => (f >= F.VALGT ? ['Valgt', 'lilla'] : f >= F.ETTER ? ['Anbefalt', 'lilla'] : f >= F.BOOK ? ['Visning 17:30', 'noytral'] : null),
  },
  {
    n: 'Martin Berg', bilde: '/v4/annonse/leietaker-martin.webp', fra: F.INT2,
    d: (f) => (f >= F.VALGT ? 'Varslet på SMS · boligen er utleid' : f >= F.ETTER ? 'Visning gjennomført' : f >= F.BOOK ? 'Visning tirsdag 18:00 · bekreftet på SMS' : 'Meldte interesse via FINN'),
    dok: (f) => (f >= F.ETTER ? ['BankID', 'Inntekt'] : ['BankID']),
    merke: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : f >= F.BOOK ? ['Visning 18:00', 'noytral'] : null),
  },
  {
    n: 'Sara Haugen', bilde: '/v4/annonse/leietaker-sara.webp', fra: F.SPM,
    d: (f) => (f >= F.VALGT ? 'Varslet på SMS · boligen er utleid' : 'Spurte om husdyr · besvart fra annonsen'),
    dok: () => ['BankID'],
    merke: (f) => (f >= F.VALGT ? ['Varslet', 'noytral'] : null),
  },
];

/* ── Bunken nede til høyre (desktop) / oppe til høyre (mobil): fem plasser med stagens proporsjoner ── */
function plasser({ w, h, kompakt }) {
  const n = 5;
  if (kompakt) {
    const sw = 50; const gap = 6; const top = 180; const right = 20; const sh = Math.round((sw * h) / w);
    return Array.from({ length: n }, (_, i) => ({ x: w - right - (n - i) * sw - (n - 1 - i) * gap, y: top, w: sw, h: sh }));
  }
  const sw = 96; const gap = 8; const m = margPx(w, h); const sh = Math.round((sw * h) / w);
  return Array.from({ length: n }, (_, i) => ({ x: w - m.x - (n - i) * sw - (n - 1 - i) * gap, y: h - m.y - sh, w: sw, h: sh }));
}

function Stabel({ fase, ov }) {
  const st = useKino();
  if (!st.w) return null;
  const vis = fase >= F.KAM && fase < F.LES1;
  return plasser(st).map((s, i) => (
    <div key={i} aria-hidden="true" className="absolute" style={{ left: s.x, top: s.y, width: s.w, height: s.h, borderRadius: 10, zIndex: 2, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.20)', background: 'rgba(255,255,255,0.05)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? 300 + i * 70 : 0}ms, transform 600ms ${EASE} ${vis ? 300 + i * 70 : 0}ms` }} data-testid={`v4-kino-plass-${i}`} />
  ));
}

/* Bildene som tas: en kopi av fotoet i full størrelse ligger over scenen, og krymper ned til sin plass i bunken
   (transform fra origo øverst til venstre). Under står neste rom allerede. */
function Kloner({ fase, ov }) {
  const st = useKino();
  const { w, h, kompakt } = st;
  if (!w || fase < F.F1 || fase > F.LES1) return null;
  const s = plasser(st);
  return OPPTAK.map((rom, i) => {
    const fF = F.F1 + i * 2; const fT = fF + 1;
    if (fase < fF) return null;
    const fly = fase >= fT;
    const p = s[i]; const k = p.w / w;
    const ute = fase >= F.LES1;
    return (
      <div key={rom.id} className="absolute left-0 top-0 overflow-hidden" style={{ width: w, height: h, zIndex: 3, transformOrigin: '0 0', transform: fly ? `translate(${p.x}px, ${p.y}px) scale(${k})` : 'translate(0px, 0px) scale(1)', borderRadius: fly ? 10 / k : 0, opacity: ute ? 0 : 1, transition: ov ? 'none' : `transform 900ms ${MORF}, border-radius 900ms ${MORF}, opacity 600ms ${EASE}`, willChange: 'transform', boxShadow: fly ? `0 ${Math.round(40 / k)}px ${Math.round(80 / k)}px ${Math.round(-30 / k)}px rgba(0,0,0,0.55)` : 'none' }} data-testid={`v4-kino-klone-${rom.id}`} data-fly={fly ? '1' : '0'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={K[rom.id].src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: kompakt ? K[rom.id].posLiten : K[rom.id].pos }} draggable={false} />
        {/* Kopien bærer stagens scrim til den løsner — så teksten leser like godt mens bildet ligger i full størrelse */}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: SCRIM.mork, opacity: fly ? 0 : 1, transition: ov ? 'none' : `opacity 500ms ${EASE}` }} />
      </div>
    );
  });
}

/* Søkeren — hele skjermen: fire hjørner, svakt tredelingsnett, etiketten, utløseren og blitsen. */
const grid = (l) => `linear-gradient(90deg, transparent calc(33.33% - 0.5px), ${l} calc(33.33% - 0.5px), ${l} calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), ${l} calc(66.66% - 0.5px), ${l} calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(180deg, transparent calc(33.33% - 0.5px), ${l} calc(33.33% - 0.5px), ${l} calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), ${l} calc(66.66% - 0.5px), ${l} calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))`;

function Soker({ fase, ov }) {
  const st = useKino();
  const { kompakt } = st;
  const aktiv = fase >= F.KAM && fase <= F.T5;
  const inn = kompakt ? 14 : 28;
  const topp = kompakt ? 84 : 76;   // under navigasjonen (72/64 px) når seksjonen står øverst
  const i = Math.max(0, fotoIndeks(fase));
  const rom = OPPTAK[i];
  const tar = tarBilde(fase);
  const g = dekk(st, K[rom.id]);
  return (
    <div className="pointer-events-none absolute inset-0 z-[4]" style={{ opacity: aktiv ? 1 : 0, transition: ov ? 'none' : `opacity ${aktiv ? 800 : 500}ms ${EASE}` }} aria-hidden={!aktiv} data-testid="v4-kino-soker" data-rom={aktiv ? rom.id : ''} data-tar={tar ? '1' : '0'}>
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: grid('rgba(250,248,244,0.09)') }} />
      <Hjorne style={{ left: inn, top: topp }} rot={0} size={22} />
      <Hjorne style={{ right: inn, top: topp }} rot={90} size={22} />
      <Hjorne style={{ right: inn, bottom: inn }} rot={180} size={22} />
      <Hjorne style={{ left: inn, bottom: inn }} rot={270} size={22} />
      {/* Etiketten: «Fasade · 1 av 5» */}
      <div className="absolute" style={{ left: kompakt ? 20 : inn + 22, top: kompakt ? 140 : 104 }}>
        <span className="inline-flex h-7 items-center gap-2 rounded-full pl-2.5 pr-3 text-[12px] font-medium tabular-nums" style={{ background: 'rgba(12,11,10,0.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)', color: 'rgba(250,248,244,0.96)' }} data-testid="v4-kino-soker-etikett">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
          <span key={rom.id} className="animate-in fade-in-0 duration-300">{rom.navn}</span>
          <span style={{ color: 'rgba(250,248,244,0.5)' }}>· {i + 1} av 5</span>
        </span>
      </div>
      {/* Autofokus — lander der kameraet stiller seg inn */}
      {fase >= F.F1 && !tar && g && <Autofokus r={g.rekt(rom.fokus)} nokkel={rom.id} dur={Math.max(700, (AUTO[fase] || 1000) - 150)} delay={120} ov={ov} />}
      {/* Utløseren — høyre, midt på */}
      <div className="absolute" style={{ right: inn + (kompakt ? 6 : 22), top: '50%', width: kompakt ? 50 : 58, height: kompakt ? 50 : 58, marginTop: kompakt ? -25 : -29, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.92), 0 6px 20px -8px rgba(0,0,0,0.6)' }} data-testid="v4-kino-utloser">
        <div key={tar ? `p${fase}` : 'px'} className="absolute" style={{ inset: 5, borderRadius: '50%', background: '#FFFFFF', animation: tar && !ov ? 'v4-kino-utloser 360ms cubic-bezier(0.3, 0, 0.2, 1) both' : 'none' }} />
      </div>
      {/* Blitsen */}
      <div key={tar ? `b${fase}` : 'bx'} aria-hidden="true" className="absolute inset-0" style={{ background: '#FFFFFF', opacity: 0, animation: tar && !ov ? 'v4-kino-blits 420ms ease-out both' : 'none' }} data-testid="v4-kino-blits" />
    </div>
  );
}

/* Sengen res opp: det ryddige fotoet avdekkes med én skillelinje over hele skjermen. */
function Wipe({ fase, ov }) {
  const st = useKino();
  const { w, kompakt } = st;
  if (!w || fase < F.LES3 || fase > F.STYLET) return null;
  const paa = fase >= F.STYLE; const ferdig = fase >= F.STYLET;
  return (
    <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: paa ? '100%' : '0%', transition: ov ? 'none' : `width 2500ms ${MORF} 500ms` }} data-testid="v4-kino-wipe" data-paa={paa ? '1' : '0'}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={K.soverom.src} alt="" className="absolute inset-y-0 left-0 h-full object-cover" style={{ width: w, objectPosition: kompakt ? K.soverom.posLiten : K.soverom.pos }} draggable={false} />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px" style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 0 18px 2px rgba(255,255,255,0.35)', opacity: ferdig ? 0 : 1, transition: ov ? 'none' : `opacity 500ms ${EASE} ${ferdig ? 200 : 0}ms` }} />
    </div>
  );
}

/* Det systemet ser — etiketter festet i fotoet (desktop). På mobil: pillene stables i sonen øverst. */
function Pinner({ fase, ov }) {
  const st = useKino();
  const { kompakt } = st;
  if (!st.w) return null;
  if (kompakt) {
    return (
      <Sone testid="v4-kino-pinner">
        <div className="flex flex-wrap gap-2">
          {Object.entries(PINNER).map(([les, sett]) => sett.liste.map((p) => {
            const vis = fase === Number(les);
            return (
              <Flyt key={p.id} vis={vis} ov={ov} delay={vis ? Math.round(p.d * 0.6) : 0} y={8} style={{ position: vis ? 'relative' : 'absolute' }}>
                <Merke tekst={p.t} tone={p.tone || 'noytral'} />
              </Flyt>
            );
          }))}
          <Flyt vis={fase === F.STYLET} ov={ov} delay={200} y={8} style={{ position: fase === F.STYLET ? 'relative' : 'absolute' }}><Merke tekst="Redigert · kun sengen" tone="gronn" /></Flyt>
        </div>
      </Sone>
    );
  }
  const redigert = dekk(st, K.soverom);
  return (
    <>
      {Object.entries(PINNER).map(([les, sett]) => {
        const g = dekk(st, K[sett.bilde]);
        if (!g) return null;
        const vis = fase === Number(les);
        return sett.liste.map((p) => {
          const pt = g.punkt(p.p[0] / 100, p.p[1] / 100);
          return (
            <React.Fragment key={`${les}-${p.id}`}>
              {p.omr && vis && <Autofokus r={g.rekt(p.omr)} nokkel={`${les}-${p.id}`} dur={1700} delay={Math.max(0, p.d - 250)} ov={ov} />}
              <Etikett vis={vis} x={pt.x} y={pt.y} tone={p.tone || 'noytral'} plass={p.plass} delay={p.d} ov={ov} testid={`v4-kino-pin-${p.id}`}>{p.t}</Etikett>
            </React.Fragment>
          );
        });
      })}
      {/* «Redigert» — når sengen er redd opp */}
      {redigert && <Etikett vis={fase === F.STYLET} x={redigert.punkt(0.6, 0.68).x} y={redigert.punkt(0.6, 0.68).y} tone="gronn" plass="over" delay={200} ov={ov} testid="v4-kino-redigert">Redigert · kun sengen</Etikett>}
    </>
  );
}

/* Annonsen skriver seg på fotoet — høyre halvdel (desktop), øverst (mobil). */
function Annonsen({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.TITTEL && fase <= F.PUBLISERT;
  const pub = fase >= F.PUBLISERT;
  return (
    <Sone testid="v4-kino-annonsen" style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Flyt vis={fase >= F.TITTEL} ov={ov}>
        <p className="inline-flex items-center gap-2 text-[12.5px] font-medium tabular-nums" style={{ color: f.svak }}>
          {pub ? <><Finn h={13} /> Publisert · i dag 14:02</> : 'Utkast til annonse'}
        </p>
      </Flyt>
      <Flyt vis={fase >= F.TITTEL} ov={ov} delay={150}>
        <h4 className={`${kompakt ? 'mt-2.5 text-[22px]' : 'mt-3 text-[clamp(22px,1.7vw,30px)]'} font-medium leading-[1.15] tracking-[-0.015em]`} style={{ color: f.tekst }} data-testid="v4-kino-annonse-tittel">{ANNONSE.tittel}</h4>
      </Flyt>
      <Flyt vis={fase >= F.TEKST} ov={ov}>
        <p className={`${kompakt ? 'mt-2.5 text-[13.5px]' : 'mt-3 text-[14px]'}`} style={{ color: f.brod }}>{ANNONSE.spes}</p>
        {!kompakt && <p className="mt-2 text-[14px] leading-[1.5]" style={{ color: f.brod }}>{ANNONSE.tekst}</p>}
      </Flyt>
      <Flyt vis={fase >= F.PRIS} ov={ov}>
        <p className={`${kompakt ? 'mt-4 text-[32px]' : 'mt-5 text-[clamp(34px,2.6vw,46px)]'}`} style={{ ...display, color: f.tekst }} data-testid="v4-kino-pris">
          {tall(BOLIG.leie)} kr<span className={`${kompakt ? 'text-[14px]' : 'text-[16px]'}`} style={{ color: f.svak, fontFamily: 'inherit', letterSpacing: 0 }}> / mnd</span>
        </p>
      </Flyt>
      <Flyt vis={fase >= F.KLAR} ov={ov} className={kompakt ? 'mt-5' : 'mt-7'}>
        <KinoKnapp presser={fase === F.TRYKK} trykket={pub} etter="Publisert på FINN" testid="v4-kino-publiser" stor={!kompakt}><Finn h={14} /> Publiser på FINN</KinoKnapp>
      </Flyt>
    </Sone>
  );
}

/* Interessentene — rader rett på fotoet. Emma velges. */
function Folk({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.INT1 && fase <= F.VALGT;
  return (
    <Sone testid="v4-kino-folk" bredde={460} style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 400 : 350}ms ${EASE}`, pointerEvents: 'none' }}>
      <Flyt vis={fase >= F.INT1} ov={ov}><p className="text-[12.5px] font-medium tabular-nums" style={{ color: f.svak }}>Interessenter · {Math.min(3, FOLK.filter((p) => fase >= p.fra).length)} med BankID</p></Flyt>
      <div className="mt-2">
        {FOLK.map((p, i) => {
          const m = p.merke(fase);
          return (
            <Rad
              key={p.n}
              vis={fase >= p.fra}
              ov={ov}
              sist={i === FOLK.length - 1}
              testid={`v4-kino-person-${i}`}
              venstre={(
                <>
                  <Portrett src={p.bilde} alt={p.n} size={kompakt ? 34 : 40} />
                  <span className="min-w-0">
                    <span className={`block truncate font-medium ${kompakt ? 'text-[14px]' : 'text-[15px]'}`} style={{ color: f.tekst }}>{p.n}</span>
                    <span key={p.d(fase)} className={`block truncate ${kompakt ? 'text-[12px]' : 'text-[12.5px]'} animate-in fade-in-0 duration-300`} style={{ color: f.svak }}>{p.d(fase)}</span>
                  </span>
                </>
              )}
              hoyre={(
                <span className="flex flex-col items-end gap-1.5">
                  {m ? <Merke tekst={m[0]} tone={m[1]} /> : <span className="h-6" />}
                  {!kompakt && <KinoDok liste={p.dok(fase)} />}
                </span>
              )}
            />
          );
        })}
      </div>
      <Flyt vis={fase >= F.ETTER} ov={ov} className={kompakt ? 'mt-4' : 'mt-6'}>
        <KinoKnapp presser={fase === F.VELG} trykket={fase >= F.VALGT} etter="Emma er valgt" testid="v4-kino-velg" stor={!kompakt}>Velg Emma</KinoKnapp>
      </Flyt>
    </Sone>
  );
}

/* Sluttbildet: Emma, valgt. */
function Slutt({ fase, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  const vis = fase >= F.SLUTT;
  return (
    <Sone testid="v4-kino-slutt" bredde={400} style={{ pointerEvents: 'none' }}>
      <Flyt vis={vis} ov={ov} delay={300}>
        <div className={kompakt ? 'flex items-center gap-4' : 'flex flex-col items-start gap-5'}>
          <Portrett src={EMMA.bilde} alt={EMMA.navn} size={kompakt ? 56 : 84} />
          <div>
            <p className={`${kompakt ? 'text-[18px]' : 'text-[24px]'} font-medium tracking-[-0.012em]`} style={{ color: f.tekst }}>{EMMA.navn}</p>
            <p className="mt-1 text-[13px]" style={{ color: f.svak }}>Valgt leietaker · {BOLIG.adresse}, {BOLIG.enhet.toLowerCase()}</p>
            <div className="mt-2.5"><KinoDok liste={EMMA.dok} /></div>
          </div>
        </div>
      </Flyt>
      {!kompakt && (
        <Flyt vis={vis} ov={ov} delay={700} className="mt-6 grid grid-cols-3 gap-4 border-t pt-4" style={{ borderColor: f.hair }}>
          {[['Innflytting', BOLIG.innflyttingKort], ['Leie', `${tall(BOLIG.leie)} kr`], ['Ønsker', BOLIG.varighet]].map(([k, v]) => (
            <div key={k}><p className="text-[11.5px]" style={{ color: f.svak }}>{k}</p><p className="mt-0.5 text-[14px] font-medium tracking-[-0.005em]" style={{ color: f.tekst }}>{v}</p></div>
          ))}
        </Flyt>
      )}
    </Sone>
  );
}

export default function AnnonseKino({ synlig, spiller, onFerdig, onFremdrift, neste, onTema }) {
  const { fase, ov, morkt } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.SLUTT, onFerdig, onFremdrift });
  const akt = aktFor(fase);
  React.useEffect(() => { onTema?.('mork'); }, [onTema]);
  const sone = (fase >= F.TITTEL && fase <= F.PUBLISERT) || fase >= F.INT1;
  return (
    <KinoStage bilder={BILDER} aktiv={bildeFor(fase)} tema="mork" sone={sone} driv={fase >= F.STABEL} ov={ov} synlig={synlig} morkt={morkt} fase={fase} testid="v4-kino-annonse" lag={<Wipe fase={fase} ov={ov} />}>
      <Soker fase={fase} ov={ov} />
      <Stabel fase={fase} ov={ov} />
      <Kloner fase={fase} ov={ov} />
      <Pinner fase={fase} ov={ov} />
      <Annonsen fase={fase} ov={ov} />
      <Folk fase={fase} ov={ov} />
      <Slutt fase={fase} ov={ov} />
      <KinoTekst nr="01" kapittel="Annonsen" akter={AKTER} id={akt.id} ov={ov} />
      <KinoNeste vis={fase >= F.SLUTT} navn={neste} dur={AUTO[F.SLUTT]} ov={ov} />
    </KinoStage>
  );
}
