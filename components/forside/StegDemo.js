'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Check, MessageSquare, FileSignature, ShieldCheck, Sparkles,
  Wrench, RefreshCw, CalendarDays,
} from 'lucide-react';
import Avsloer from '@/components/forside/Avsloer';

/* ---------------------------------------------------------------------------
   StegDemo — «Fra manuelt arbeid til automatisert drift.»
   Klikkbar vertikal stepper (01–05) koblet til en LEVENDE produktflate.
   Hvert steg er selvspillende koreografi (samme teknikk som tour-demoene):
   tidslinje-state-machine, IntersectionObserver (spiller kun når synlig),
   kun opacity/transform, prefers-reduced-motion → statisk sluttbilde.
   Demo-data og stockportretter — ingen ekte personer eller kunder.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const STEG = [
  { nr: '01', t: 'Finn leietaker', b: 'Publiser på FINN og motta interessenter — vi hjelper deg hele veien.' },
  { nr: '02', t: 'Velg', b: 'Screening og vurdering av leietakere.' },
  { nr: '03', t: 'Signer', b: 'Digital kontrakt og BankID-signering.' },
  { nr: '04', t: 'Få betalt', b: 'Automatisk betaling, KID og purring.' },
  { nr: '05', t: 'Drift', b: 'Saker, kommunikasjon og fornyelser.' },
];

const P = (kjønn, n) => `https://randomuser.me/api/portraits/${kjønn}/${n}.jpg`;

/* ── Koreografi-verktøy ── */

function useRedusert() {
  const [r, setR] = useState(false);
  useEffect(() => {
    try { setR(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* ok */ }
  }, []);
  return r;
}

/* Tidslinje-state-machine — som tour-demoene. Looper rolig. */
function useKoreografi(trinn, kjorer) {
  const [fase, setFase] = useState(0);
  const redusert = useRedusert();
  useEffect(() => { if (!kjorer) setFase(0); }, [kjorer]);
  useEffect(() => {
    if (!kjorer) return undefined;
    if (redusert) { setFase(trinn.length - 1); return undefined; }
    const t = window.setTimeout(() => {
      setFase((f) => (f + 1) % trinn.length);
    }, trinn[fase].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, fase, redusert, trinn]);
  const idx = useMemo(() => {
    const m = {};
    trinn.forEach((t, i) => { m[t.navn] = i; });
    return m;
  }, [trinn]);
  return { fase, navn: trinn[fase].navn, er: (n) => fase >= idx[n] };
}

/* Talloppteller — rAF med ease-out, tabular-nums-vennlig */
function useTell(aktiv, til, ms = 1100) {
  const [v, setV] = useState(0);
  const redusert = useRedusert();
  useEffect(() => {
    if (!aktiv) { setV(0); return undefined; }
    if (redusert) { setV(til); return undefined; }
    let raf;
    const t0 = performance.now();
    const stegFn = (t) => {
      const p = Math.min((t - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(til * e));
      if (p < 1) raf = requestAnimationFrame(stegFn);
    };
    raf = requestAnimationFrame(stegFn);
    return () => cancelAnimationFrame(raf);
  }, [aktiv, til, ms, redusert]);
  return v;
}

/* Myk reveal — kun opacity/transform */
function Inn({ vis, delay = 0, dy = 10, className = '', children }) {
  return (
    <div
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : `translateY(${dy}px)`,
        transition: `opacity 600ms ${EASE} ${delay}ms, transform 600ms ${EASE} ${delay}ms`,
      }}
    >{children}</div>
  );
}

/* Krysstoning mellom to tilstander — grid-stack så bredden er stabil */
function Bytt({ vis, a, b, className = '' }) {
  return (
    <span className={`inline-grid ${className}`}>
      <span className="col-start-1 row-start-1" style={{ opacity: vis ? 0 : 1, transform: vis ? 'translateY(-4px)' : 'none', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }}>{a}</span>
      <span className="col-start-1 row-start-1" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(4px)', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }} aria-hidden={!vis}>{b}</span>
    </span>
  );
}

/* Krysstoning mellom flere tilstander */
function ByttFlere({ idx, alternativer, className = '' }) {
  return (
    <span className={`inline-grid ${className}`}>
      {alternativer.map((alt, i) => (
        <span key={i} className="col-start-1 row-start-1" style={{ opacity: idx === i ? 1 : 0, transform: idx === i ? 'none' : 'translateY(4px)', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }} aria-hidden={idx !== i}>{alt}</span>
      ))}
    </span>
  );
}

const Avatar = ({ src, navn }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={navn} loading="lazy" className="h-[34px] w-[34px] shrink-0 rounded-full object-cover ring-2 ring-white" />
);

const Knapp = ({ children }) => (
  <span className="shrink-0 rounded-full px-3 py-[6px] text-[11px] font-semibold text-[#0A0A0A] ring-1 ring-black/[0.1] transition-colors">{children}</span>
);

/* ── 01: Finn leietaker — interessenter tikker inn, ny lander live øverst ── */
const FINN_TRINN = [
  { navn: 'start', ms: 650 },
  { navn: 'rad1', ms: 320 },
  { navn: 'rad2', ms: 320 },
  { navn: 'rad3', ms: 1050 },
  { navn: 'ny', ms: 900 },
  { navn: 'tall', ms: 1500 },
  { navn: 'hold', ms: 4600 },
];

function FlateFinn({ kjorer }) {
  const { er } = useKoreografi(FINN_TRINN, kjorer);
  const antall = er('tall') ? 12 : 11;
  const nye = er('tall') ? 4 : 3;
  const rader = [
    ['rad1', P('men', 32), 'Anders Pettersen', 'Leilighet 1A · 3 rom · 68 m²', 'Kontaktet', '1 time siden', '#0e7490'],
    ['rad2', P('women', 68), 'Sofie Larsen', 'Leilighet 3C · 2 rom · 49 m²', 'Visning avtalt', 'I morgen kl. 15:00', '#1f7a45'],
    ['rad3', P('men', 75), 'Jakob Nilsen', 'Leilighet 1A · 3 rom · 68 m²', 'Venter svar', '2 dager siden', '#9a6b1c'],
  ];
  return (
    <div>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Finn leietaker</p>
          <p className="mt-0.5 text-[12px] text-[#8d877d]">Publiser og motta interessenter på FINN</p>
        </div>
        <span className="rounded-full bg-[#7c3aed] px-3.5 py-[7px] text-[11.5px] font-semibold text-white shadow-[0_8px_18px_-6px_rgba(124,58,237,0.5)]">Ny annonse</span>
      </div>
      <div className="mt-4 flex gap-5 border-b border-black/[0.06] px-5 sm:px-6">
        {[['Annonser', null, false], ['Interessenter', antall, true], ['Visninger', null, false], ['Kandidater', null, false]].map(([t, n, aktiv]) => (
          <span key={t} className={`flex items-center gap-1.5 pb-2.5 text-[12.5px] font-semibold ${aktiv ? 'border-b-2 border-[#7c3aed] text-[#7c3aed]' : 'text-[#8d877d]'}`}>
            {t}{n ? <span className="rounded-full bg-[#F1E9FB] px-1.5 py-[1px] text-[9.5px] font-bold text-[#7c3aed] tabular-nums">{n}</span> : null}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 pt-3.5 sm:px-6">
        {[['Alle', antall, true], ['Nye', nye, false], ['Kontaktet', 3, false], ['Visning', 2, false], ['Venter svar', 3, false]].map(([t, n, aktiv]) => (
          <span key={t} className={`flex items-center gap-1 rounded-full px-2.5 py-[4px] text-[10.5px] font-semibold ${aktiv ? 'bg-[#141216] text-white' : 'text-[#8d877d] ring-1 ring-black/[0.08]'}`}>
            {t} <span className={`tabular-nums ${aktiv ? 'text-white/60' : 'text-[#b3aca1]'}`}>{n}</span>
          </span>
        ))}
      </div>
      <div className="px-3 pb-4 pt-2 sm:px-4">
        {/* Ny interessent — lander live øverst og skyver listen ned */}
        <div style={{ maxHeight: er('ny') ? 84 : 0, opacity: er('ny') ? 1 : 0, transform: er('ny') ? 'none' : 'translateY(-10px)', transition: `max-height 750ms ${EASE}, opacity 550ms ${EASE} 140ms, transform 750ms ${EASE}`, overflow: 'hidden' }}>
          <div className="flex items-center gap-3 rounded-[12px] bg-[#FBF9FE] px-2 py-2.5 ring-1 ring-[#7c3aed]/[0.14] sm:px-3">
            <Avatar src={P('women', 44)} navn="Maria Johansen" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#0A0A0A]" style={heading}>Maria Johansen</p>
              <p className="truncate text-[10.5px] text-[#a49e93]">Interessert i Olaf Ryes vei 11C · Leilighet 2B · 2 rom · 54 m²</p>
            </div>
            <div className="hidden w-[118px] shrink-0 sm:block">
              <p className="text-[11px] font-bold text-[#7c3aed]">Nytt</p>
              <p className="text-[9.5px] text-[#a49e93]">Akkurat nå</p>
            </div>
            <span className="hidden h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.08] sm:flex"><MessageSquare className="h-[11px] w-[11px] text-[#8d877d]" /></span>
            <Knapp>Se profil</Knapp>
          </div>
        </div>
        {rader.map(([nokkel, bilde, navn, enhet, status, når, farge], i) => (
          <Inn key={navn} vis={er(nokkel)} dy={12}>
            <div className="flex items-center gap-3 rounded-[12px] px-2 py-2.5 transition-colors hover:bg-[#FAF8F4] sm:px-3">
              <Avatar src={bilde} navn={navn} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#0A0A0A]" style={heading}>{navn}</p>
                <p className="truncate text-[10.5px] text-[#a49e93]">Interessert i Olaf Ryes vei 11C · {enhet}</p>
              </div>
              <div className="hidden w-[118px] shrink-0 sm:block">
                <p className="text-[11px] font-bold" style={{ color: farge }}>{status}</p>
                <p className="text-[9.5px] text-[#a49e93]">{når}</p>
              </div>
              <span className="hidden h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.08] sm:flex"><MessageSquare className="h-[11px] w-[11px] text-[#8d877d]" /></span>
              <Knapp>Se profil</Knapp>
            </div>
          </Inn>
        ))}
      </div>
    </div>
  );
}

/* ── 02: Velg — sjekker hukes av, score teller opp, listen sorterer seg selv ── */
const VELG_TRINN = [
  { navn: 'start', ms: 650 },
  { navn: 'kand1', ms: 320 },
  { navn: 'kand2', ms: 320 },
  { navn: 'kand3', ms: 950 },
  { navn: 'sjekk', ms: 1350 },
  { navn: 'score', ms: 1550 },
  { navn: 'sorter', ms: 1050 },
  { navn: 'anbefalt', ms: 1500 },
  { navn: 'hold', ms: 4600 },
];

/* Kandidatene i søknadsrekkefølge — posEtter = plass etter AI-sortering */
const KANDIDATER = [
  { bilde: P('men', 32), navn: 'Anders Pettersen', score: 88, posFør: 0, posEtter: 1, nokkel: 'kand1' },
  { bilde: P('men', 75), navn: 'Jakob Nilsen', score: 76, posFør: 1, posEtter: 2, nokkel: 'kand2' },
  { bilde: P('women', 68), navn: 'Sofie Larsen', score: 94, posFør: 2, posEtter: 0, nokkel: 'kand3', anbefalt: true },
];

function KandidatKort({ k, er, radH }) {
  const vis = er(k.nokkel);
  const pos = er('sorter') ? k.posEtter : k.posFør;
  const tall = useTell(er('score'), k.score, 1200);
  const anbefalt = Boolean(k.anbefalt) && er('anbefalt');
  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        transform: `translateY(${pos * radH}px)`,
        opacity: vis ? 1 : 0,
        transition: `transform 850ms ${EASE}, opacity 550ms ${EASE}`,
      }}
    >
      <div
        className="flex items-center rounded-[14px] p-3.5"
        style={{
          height: radH - 10,
          background: anbefalt ? '#FBF9FE' : '#ffffff',
          boxShadow: anbefalt ? 'inset 0 0 0 1px rgba(124,58,237,0.28), 0 10px 26px -18px rgba(84,50,160,0.35)' : 'inset 0 0 0 1px rgba(0,0,0,0.06)',
          transition: `background 600ms ${EASE}, box-shadow 600ms ${EASE}`,
        }}
      >
        <div className="flex w-full items-center gap-3">
          <Avatar src={k.bilde} navn={k.navn} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#0A0A0A]" style={heading}>
              {k.navn}
              <span
                className="rounded-full bg-[#7c3aed] px-2 py-[2px] text-[9px] font-bold text-white"
                style={{ opacity: anbefalt ? 1 : 0, transform: anbefalt ? 'none' : 'scale(0.7)', transition: `opacity 500ms ${EASE}, transform 500ms ${EASE}` }}
                aria-hidden={!anbefalt}
              >Anbefalt</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {['BankID verifisert', 'Inntekt dokumentert', 'Referanser OK'].map((tekst, i) => (
                <span
                  key={tekst}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#1f7a45]"
                  style={{ opacity: er('sjekk') ? 1 : 0, transform: er('sjekk') ? 'none' : 'translateY(4px)', transition: `opacity 450ms ${EASE} ${i * 170}ms, transform 450ms ${EASE} ${i * 170}ms` }}
                >
                  <Check className="h-[10px] w-[10px]" strokeWidth={3} />{tekst}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right" style={{ opacity: er('score') ? 1 : 0, transform: er('score') ? 'none' : 'translateY(4px)', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }} aria-hidden={!er('score')}>
            <p className="text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{tall}</p>
            <p className="text-[8.5px] text-[#a49e93]">av 100</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlateVelg({ kjorer }) {
  const { er } = useKoreografi(VELG_TRINN, kjorer);
  const radH = 92;
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Screening — Olaf Ryes vei 11C</p>
          <p className="mt-0.5 text-[12px] text-[#8d877d]">Kandidatene vurderes på dokumentert grunnlag</p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F1E9FB] px-2.5 py-[5px] text-[10px] font-bold text-[#6d28d9]"
          style={{ opacity: er('sorter') ? 1 : 0, transform: er('sorter') ? 'none' : 'translateY(-4px)', transition: `opacity 500ms ${EASE}, transform 500ms ${EASE}` }}
          aria-hidden={!er('sorter')}
        >
          <Sparkles className="h-[10px] w-[10px]" /> Rangert av AI
        </span>
      </div>
      <div className="relative mt-4" style={{ height: KANDIDATER.length * radH - 10 }}>
        {KANDIDATER.map((k) => <KandidatKort key={k.navn} k={k} er={er} radH={radH} />)}
      </div>
      <p
        className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[#8d877d]"
        style={{ opacity: er('anbefalt') ? 1 : 0, transition: `opacity 600ms ${EASE} 200ms` }}
        aria-hidden={!er('anbefalt')}
      >
        <Check className="h-[11px] w-[11px] text-[#1f7a45]" strokeWidth={3} /> Du velger alltid selv — DigiHome gir deg grunnlaget.
      </p>
    </div>
  );
}

/* ── 03: Signer — BankID trykkes, «Venter» flipper til «Signert» ── */
const SIGNER_TRINN = [
  { navn: 'start', ms: 650 },
  { navn: 'dok', ms: 500 },
  { navn: 'rad1', ms: 400 },
  { navn: 'rad2', ms: 950 },
  { navn: 'knapp', ms: 1000 },
  { navn: 'trykk', ms: 380 },
  { navn: 'sign', ms: 1300 },
  { navn: 'aktiv', ms: 1200 },
  { navn: 'hold', ms: 4600 },
];

function FlateSigner({ kjorer }) {
  const { er, navn } = useKoreografi(SIGNER_TRINN, kjorer);
  const signert = er('sign');
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Signering</p>
      <p className="mt-0.5 text-[12px] text-[#8d877d]">Leiekontrakt — Olaf Ryes vei 11C</p>
      <Inn vis={er('dok')} dy={12} className="mt-4">
        <div className="rounded-[14px] bg-white p-4 ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1E9FB]"><FileSignature className="h-[16px] w-[16px] text-[#7c3aed]" /></span>
              <div>
                <p className="text-[13px] font-bold text-[#0A0A0A]" style={heading}>Leiekontrakt.pdf</p>
                <p className="text-[10.5px] text-[#a49e93]">Generert av DigiHome · følger husleieloven</p>
              </div>
            </div>
            <span
              className="flex shrink-0 items-center gap-1 rounded-full bg-[#E7F3EC] px-2.5 py-[4px] text-[9.5px] font-bold text-[#1f7a45]"
              style={{ opacity: er('aktiv') ? 1 : 0, transform: er('aktiv') ? 'none' : 'scale(0.8)', transition: `opacity 500ms ${EASE}, transform 500ms ${EASE}` }}
              aria-hidden={!er('aktiv')}
            >
              <span className="h-[5px] w-[5px] rounded-full bg-[#1f7a45]" /> Aktiv leieavtale
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <Inn vis={er('rad1')} dy={8}>
              <div className="flex items-center justify-between rounded-[10px] bg-[#FAF8F4] px-3 py-2.5">
                <span className="text-[12px] font-semibold text-[#0A0A0A]">Martin (utleier)</span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#1f7a45]">
                  <Check className="h-[12px] w-[12px]" strokeWidth={3} /> Signert
                </span>
              </div>
            </Inn>
            <Inn vis={er('rad2')} dy={8}>
              <div className="flex items-center justify-between rounded-[10px] bg-[#FAF8F4] px-3 py-2.5">
                <span className="text-[12px] font-semibold text-[#0A0A0A]">Sofie Larsen (leietaker)</span>
                <Bytt
                  vis={signert}
                  className="justify-items-end"
                  a={<span className="flex items-center gap-1.5 text-[11px] font-bold text-[#9a6b1c]"><span className="h-[6px] w-[6px] animate-pulse rounded-full bg-[#9a6b1c]" />Venter på signering</span>}
                  b={<span className="flex items-center gap-1.5 text-[11px] font-bold text-[#1f7a45]"><Check className="h-[12px] w-[12px]" strokeWidth={3} />Signert</span>}
                />
              </div>
            </Inn>
          </div>
          <Inn vis={er('knapp')} dy={8} className="mt-4">
            <div
              className="flex items-center justify-center gap-2 rounded-[11px] py-3 text-[12.5px] font-bold text-white"
              style={{
                background: signert ? '#1f7a45' : '#141216',
                transform: navn === 'trykk' ? 'scale(0.97)' : 'none',
                transition: `transform 200ms ${EASE}, background 600ms ${EASE}`,
              }}
            >
              <Bytt
                vis={signert}
                className="justify-items-center"
                a={<span className="flex items-center gap-2"><ShieldCheck className="h-[14px] w-[14px] text-[#C9A6F0]" /> Signer med BankID</span>}
                b={<span className="flex items-center gap-2"><Check className="h-[14px] w-[14px]" strokeWidth={3} /> Signert av begge parter</span>}
              />
            </div>
          </Inn>
          <p className="mt-2.5 text-center text-[10px] text-[#a49e93]">
            <Bytt
              vis={er('aktiv')}
              className="justify-items-center"
              a={<span>Arkiveres automatisk på leieforholdet når begge har signert.</span>}
              b={<span className="font-semibold text-[#1f7a45]">Arkivert på leieforholdet — leieavtalen er aktiv.</span>}
            />
          </p>
        </div>
      </Inn>
    </div>
  );
}

/* ── 04: Få betalt — innbetaling lander live, raden flipper til betalt ── */
const BETALT_TRINN = [
  { navn: 'start', ms: 650 },
  { navn: 'rad1', ms: 320 },
  { navn: 'rad2', ms: 320 },
  { navn: 'rad3', ms: 1150 },
  { navn: 'innbet', ms: 950 },
  { navn: 'flip', ms: 1600 },
  { navn: 'hold', ms: 4600 },
];

function FlateBetalt({ kjorer }) {
  const { er } = useKoreografi(BETALT_TRINN, kjorer);
  const betalt = er('flip');
  const rader = [
    ['rad1', 'Husleie januar', 'Betalt 1. jan', true],
    ['rad2', 'Husleie februar', 'Betalt 1. feb', true],
  ];
  return (
    <div className="relative px-5 pb-5 pt-5 sm:px-6">
      {/* Innbetalings-toast — appens kvittering, glir inn øverst til høyre */}
      <div
        className="absolute right-5 top-4 z-[1] flex items-center gap-2 rounded-full bg-white py-[7px] pl-3 pr-4 shadow-[0_14px_34px_-14px_rgba(23,18,12,0.28)] ring-1 ring-black/[0.06] sm:right-6"
        style={{ opacity: er('innbet') ? 1 : 0, transform: er('innbet') ? 'none' : 'translateY(-10px)', transition: `opacity 550ms ${EASE}, transform 550ms ${EASE}` }}
        aria-hidden={!er('innbet')}
      >
        <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#E7F3EC]"><Check className="h-[10px] w-[10px] text-[#1f7a45]" strokeWidth={3} /></span>
        <span className="text-[11px] font-bold text-[#0A0A0A]" style={heading}>Innbetaling mottatt</span>
        <span className="text-[10.5px] font-semibold text-[#1f7a45] tabular-nums">18 500 kr</span>
      </div>

      <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Betalinger</p>
      <p className="mt-0.5 text-[12px] text-[#8d877d]">Olaf Ryes vei 11C · Sofie Larsen · 18 500 kr/mnd</p>
      <div className="mt-4 overflow-hidden rounded-[14px] bg-white ring-1 ring-black/[0.06]">
        {rader.map(([nokkel, t, s, ok], i) => (
          <Inn key={t} vis={er(nokkel)} dy={8}>
            <div className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-black/[0.05]' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#E7F3EC]">
                  <Check className="h-[11px] w-[11px] text-[#1f7a45]" strokeWidth={3} />
                </span>
                <div>
                  <p className="text-[12.5px] font-bold text-[#0A0A0A]" style={heading}>{t}</p>
                  <p className="text-[10px] text-[#a49e93]">{s}</p>
                </div>
              </div>
              <span className="text-[12.5px] font-bold text-[#1f7a45] tabular-nums">18 500 kr</span>
            </div>
          </Inn>
        ))}
        <Inn vis={er('rad3')} dy={8}>
          <div className="flex items-center justify-between border-t border-black/[0.05] px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
                style={{ background: betalt ? '#E7F3EC' : '#F4F1EB', transition: `background 600ms ${EASE}` }}
              >
                <span className="inline-grid">
                  <span className="col-start-1 row-start-1 flex items-center justify-center" style={{ opacity: betalt ? 0 : 1, transition: `opacity 450ms ${EASE}` }}><CalendarDays className="h-[11px] w-[11px] text-[#8d877d]" /></span>
                  <span className="col-start-1 row-start-1 flex items-center justify-center" style={{ opacity: betalt ? 1 : 0, transform: betalt ? 'none' : 'scale(0.6)', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }}><Check className="h-[11px] w-[11px] text-[#1f7a45]" strokeWidth={3} /></span>
                </span>
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-[#0A0A0A]" style={heading}>Husleie mars</p>
                <p className="text-[10px] text-[#a49e93]">
                  <Bytt vis={betalt} a={<span>Forfall 1. mars · KID sendt</span>} b={<span className="font-semibold text-[#1f7a45]">Betalt 1. mars · avstemt automatisk</span>} />
                </p>
              </div>
            </div>
            <span className="text-[12.5px] font-bold tabular-nums" style={{ color: betalt ? '#1f7a45' : '#0A0A0A', transition: `color 600ms ${EASE}` }}>18 500 kr</span>
          </div>
        </Inn>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[#8d877d]">
        <Sparkles className="h-[11px] w-[11px] text-[#7c3aed]" />
        <Bytt
          vis={betalt}
          a={<span>Purring sendes automatisk ved forsinkelse — du trenger ikke gjøre noe.</span>}
          b={<span>Purring ble aldri nødvendig — alt gikk av seg selv.</span>}
        />
      </p>
    </div>
  );
}

/* ── 05: Drift — ny sak lander, AI foreslår, rørlegger bookes ── */
const DRIFT_TRINN = [
  { navn: 'start', ms: 650 },
  { navn: 'rad1', ms: 320 },
  { navn: 'rad2', ms: 1100 },
  { navn: 'ny', ms: 1100 },
  { navn: 'ai', ms: 1400 },
  { navn: 'booket', ms: 1700 },
  { navn: 'hold', ms: 4600 },
];

function FlateDrift({ kjorer }) {
  const { er } = useKoreografi(DRIFT_TRINN, kjorer);
  const sakFase = er('booket') ? 2 : er('ai') ? 1 : 0;
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <p className="text-[16px] font-bold text-[#0A0A0A]" style={heading}>Drift og oppfølging</p>
      <p className="mt-0.5 text-[12px] text-[#8d877d]">Saker, kommunikasjon og fornyelser — samlet</p>
      <div className="mt-4">
        {/* Ny sak — lander live øverst og håndteres av systemet */}
        <div style={{ maxHeight: er('ny') ? 96 : 0, opacity: er('ny') ? 1 : 0, transform: er('ny') ? 'none' : 'translateY(-10px)', transition: `max-height 750ms ${EASE}, opacity 550ms ${EASE} 140ms, transform 750ms ${EASE}`, overflow: 'hidden' }}>
          <div className="mb-2.5 flex items-center gap-3 rounded-[14px] bg-white p-3.5 ring-1 ring-black/[0.06]">
            <span
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: sakFase === 2 ? '#FBF3E4' : '#FDEBEB', transition: `background 600ms ${EASE}` }}
            >
              <Wrench className="h-[14px] w-[14px]" style={{ color: sakFase === 2 ? '#9a6b1c' : '#d13438', transition: `color 600ms ${EASE}` }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[#0A0A0A]" style={heading}>Vannlekkasje på bad</p>
              <p className="truncate text-[10.5px] text-[#a49e93]">
                <ByttFlere
                  idx={sakFase}
                  alternativer={[
                    <span key="a">Meldt inn av Sofie · akkurat nå</span>,
                    <span key="b" className="flex items-center gap-1 font-medium text-[#7c3aed]"><Sparkles className="h-[9px] w-[9px]" /> DigiHome foreslår rørlegger …</span>,
                    <span key="c">Rørlegger booket · torsdag 09:00</span>,
                  ]}
                />
              </p>
            </div>
            <ByttFlere
              idx={sakFase}
              className="shrink-0 justify-items-end"
              alternativer={[
                <span key="a" className="rounded-full bg-[#FDEBEB] px-2.5 py-[4px] text-[10px] font-bold text-[#d13438]">Ny sak</span>,
                <span key="b" className="rounded-full bg-[#F1E9FB] px-2.5 py-[4px] text-[10px] font-bold text-[#7c3aed]">Håndteres</span>,
                <span key="c" className="rounded-full bg-[#FBF3E4] px-2.5 py-[4px] text-[10px] font-bold text-[#9a6b1c]">Under arbeid</span>,
              ]}
            />
          </div>
        </div>
        <div className="space-y-2.5">
          <Inn vis={er('rad1')} dy={10}>
            <div className="flex items-center gap-3 rounded-[14px] bg-white p-3.5 ring-1 ring-black/[0.06]">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#F1E9FB]"><MessageSquare className="h-[14px] w-[14px] text-[#7c3aed]" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#0A0A0A]" style={heading}>Ny melding fra Emma</p>
                <p className="truncate text-[10.5px] text-[#a49e93]">Leilighet 3C · «Når kommer vaktmesteren?»</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#F1E9FB] px-2.5 py-[4px] text-[10px] font-bold text-[#7c3aed]">Svar innen 24 t</span>
            </div>
          </Inn>
          <Inn vis={er('rad2')} dy={10}>
            <div className="flex items-center gap-3 rounded-[14px] bg-white p-3.5 ring-1 ring-black/[0.06]">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#E7F3EC]"><RefreshCw className="h-[14px] w-[14px] text-[#1f7a45]" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-[#0A0A0A]" style={heading}>Fornyelse — Leilighet 1A</p>
                <p className="truncate text-[10.5px] text-[#a49e93]">Foreslått KPI-justering +2,9 %</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#E7F3EC] px-2.5 py-[4px] text-[10px] font-bold text-[#1f7a45]">Klar til utsending</span>
            </div>
          </Inn>
        </div>
      </div>
      <p
        className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[#8d877d]"
        style={{ opacity: er('booket') ? 1 : 0, transition: `opacity 600ms ${EASE} 250ms` }}
        aria-hidden={!er('booket')}
      >
        <Sparkles className="h-[11px] w-[11px] text-[#7c3aed]" /> Håndtert automatisk — du ble bare varslet.
      </p>
    </div>
  );
}

const FLATER = [FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift];

export default function StegDemo() {
  const [aktiv, setAktiv] = useState(0);
  const Flate = FLATER[aktiv];
  const rot = useRef(null);
  const [synlig, setSynlig] = useState(false);

  useEffect(() => {
    const el = rot.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSynlig(true); return undefined; }
    const obs = new IntersectionObserver(([entry]) => setSynlig(entry.isIntersecting), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="produkt" className="relative scroll-mt-20">
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-start gap-12 px-6 pb-16 pt-8 sm:px-10 sm:pb-24 sm:pt-12 lg:grid-cols-[0.42fr_0.58fr] lg:gap-16">
        {/* Venstre: fortelling + stepper */}
        <Avsloer>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c7466]">Alt du trenger — på ett sted</p>
          <h2 className="e-display mt-3 max-w-[16ch] text-[28px] sm:text-[38px]">Fra manuelt arbeid til automatisert drift<span className="text-[#cf97fc]">.</span></h2>
          <p className="mt-4 max-w-[38ch] text-[14.5px] leading-[1.65] text-[#6F6A60]">
            DigiHome binder sammen oppgavene som tradisjonelt har ligget i
            forskjellige systemer, innbokser og regneark.
          </p>
          {/* Mobil: sveipbare steg-chips */}
          <div className="-mx-6 mt-6 flex gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-10 sm:px-10 lg:hidden">
            {STEG.map((s, i) => (
              <button
                key={s.nr}
                onClick={(e) => {
                  setAktiv(i);
                  try {
                    const el = e.currentTarget;
                    const boks = el.parentElement;
                    boks.scrollTo({ left: el.offsetLeft - (boks.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
                  } catch (err) { /* ok */ }
                }}
                data-testid={`steg-mobil-${s.nr}`}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-[9px] text-[13px] font-semibold transition-colors ${i === aktiv ? 'bg-[#1a1a1a] text-white shadow-[0_10px_22px_-8px_rgba(17,17,17,0.45)]' : 'bg-white text-[#57534e] ring-1 ring-black/[0.08]'}`}
              >
                <span className={`text-[11px] font-bold tabular-nums ${i === aktiv ? 'text-white/70' : 'text-[#b3aca1]'}`} style={heading}>{s.nr}</span>
                {s.t}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-[#8d877d] lg:hidden">{STEG[aktiv].b}</p>
          {/* Desktop: vertikal stepper */}
          <div className="mt-8 hidden lg:block">
            {STEG.map((s, i) => {
              const valgt = i === aktiv;
              return (
                <button key={s.nr} onClick={() => setAktiv(i)} data-testid={`steg-${s.nr}`}
                  className={`group flex w-full items-start gap-5 border-t border-[#EDE9E2] py-4 text-left transition-colors first:border-t-0 first:pt-0 ${valgt ? '' : 'opacity-60 hover:opacity-100'}`}>
                  <span className={`text-[15px] font-bold tabular-nums ${valgt ? 'text-[#1a1a1a]' : 'text-[#b3aca1]'}`} style={heading}>{s.nr}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{s.t}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.6] text-[#8d877d]">{s.b}</span>
                  </span>
                  <span className={`mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full transition-all ${valgt ? 'bg-[#1a1a1a] text-white shadow-[0_8px_18px_-6px_rgba(17,17,17,0.45)]' : 'text-[#c8c3ba] ring-1 ring-black/[0.08] group-hover:text-[#1a1a1a]'}`}>
                    <ArrowRight className="h-[13px] w-[13px]" />
                  </span>
                </button>
              );
            })}
          </div>
        </Avsloer>
        {/* Høyre: levende produktflate — selvspillende koreografi */}
        <Avsloer delay={150} className="lg:sticky lg:top-24">
          <div ref={rot}>
            <div key={aktiv} className="dh-cover-inn overflow-hidden rounded-[20px] bg-[#FCFBF9] shadow-[0_36px_90px_-42px_rgba(84,50,160,0.22),0_0_0_1px_rgba(0,0,0,0.05)] sm:min-h-[430px]">
              <Flate kjorer={synlig} />
            </div>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
