'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Wallet, DollarSign, FileText, Calendar, ChevronRight, CircleCheck, Send } from 'lucide-react';

// ---------------------------------------------------------------------------
// OkonomiDemo — tro replika av portalens «Eieroppgjør» (OwnerFinance):
// mini-hero, KPI-kort (mørkt «Netto i år»-kort, lavendel/cyan ikoner) og
// oppgjørstabellen med kalender-ikonboks, status-pill under perioden,
// honorar i lavendel og netto i bold — nøyaktig som i portalen.
// Selvspillende: tallene teller opp, historikken tikker inn, og et nytt
// oppgjør lander øverst («Sendt» → «Utbetalt») før KPI-ene oppdaterer seg.
// ---------------------------------------------------------------------------

const INK = '#1a1a1a';
const LAVENDEL = '#cf97fc';

const TRINN: { navn: string; ms: number }[] = [
  { navn: 'start', ms: 900 },
  { navn: 'kpi', ms: 1500 },
  { navn: 'rad1', ms: 380 },
  { navn: 'rad2', ms: 380 },
  { navn: 'rad3', ms: 950 },
  { navn: 'nyrad', ms: 1400 },
  { navn: 'oppgjor', ms: 1400 },
  { navn: 'oppdater', ms: 1600 },
  { navn: 'slutt', ms: 5000 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

// Oppgjørene — samme leie som tidligere i reisen (18 500 kr).
const HISTORIKK = [
  { periode: 'Oktober 2026', brutto: '18 500', honorar: '925', netto: '17 575' },
  { periode: 'September 2026', brutto: '18 500', honorar: '925', netto: '17 575' },
  { periode: 'August 2026', brutto: '18 500', honorar: '925', netto: '17 575' },
];

const RH = 76; // radhøyde — portalens py-4 med ikonboks

// Teller — myk count-up med easing. Animerer videre fra forrige verdi når
// målet endres, og nullstilles når den deaktiveres (loop).
function Teller({ til, aktiv, varighet = 1100 }: { til: number; aktiv: boolean; varighet?: number }) {
  const [verdi, setVerdi] = useState(0);
  const fra = useRef(0);

  useEffect(() => {
    if (!aktiv) {
      setVerdi(0);
      fra.current = 0;
      return;
    }
    const start = performance.now();
    const fraV = fra.current;
    let raf = 0;
    const tikk = (t: number) => {
      const p = Math.min(1, (t - start) / varighet);
      const e = 1 - Math.pow(1 - p, 3);
      setVerdi(Math.round(fraV + (til - fraV) * e));
      if (p < 1) raf = requestAnimationFrame(tikk);
      else fra.current = til;
    };
    raf = requestAnimationFrame(tikk);
    return () => cancelAnimationFrame(raf);
  }, [aktiv, til, varighet]);

  return <>{verdi.toLocaleString('nb-NO')}</>;
}

// Status-pillen — portalens eksakte varianter.
function Pill({ type }: { type: 'utbetalt' | 'sendt' }) {
  return type === 'utbetalt' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[10px] font-bold text-[#15803d]">
      <CircleCheck className="h-3 w-3" strokeWidth={2.4} />
      Utbetalt
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecfeff] px-2.5 py-1 text-[10px] font-bold text-[#0891b2]">
      <Send className="h-3 w-3" strokeWidth={2.4} />
      Sendt
    </span>
  );
}

export default function OkonomiDemo() {
  const rot = useRef<HTMLDivElement | null>(null);
  const [kjorer, setKjorer] = useState(false);
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const el = rot.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setKjorer(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setKjorer(entry.isIntersecting);
        if (!entry.isIntersecting) setFase(0);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!kjorer) return;
    const t = window.setTimeout(() => {
      setFase((f) => (f + 1) % TRINN.length);
    }, TRINN[fase].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, fase]);

  const er = (navn: string) => fase >= IDX[navn];

  const F = { fontFamily: 'var(--font-heading), sans-serif' } as React.CSSProperties;
  const kpiInn = er('kpi');

  return (
    <div ref={rot} className="relative w-full max-w-[560px] lg:mx-auto" data-testid="tour-okonomi-demo">
      {/* --- Mini-hero — som i portalen -------------------------------------- */}
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c7466]">Huseierportal · Økonomi</p>
      <p className="mt-1.5 text-[21px] font-bold leading-none tracking-[-0.02em]" style={{ ...F, color: INK }}>
        Eieroppgjør
      </p>

      {/* --- KPI-stripen — portalens kort ------------------------------------ */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
        {/* Netto i år — det mørke kortet. */}
        <div
          className={`rounded-2xl bg-[#1a1a1a] p-3.5 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-4 ${
            kpiInn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between gap-1">
            <span className="truncate text-[8.5px] font-bold uppercase tracking-[0.08em] text-white/50 sm:text-[9.5px]">
              Netto i år
            </span>
            <Wallet className="h-4 w-4 shrink-0" style={{ color: '#16a34a' }} />
          </div>
          <p className="text-[16px] font-bold tabular-nums tracking-tight text-white sm:text-[21px]" style={F}>
            <Teller til={er('oppdater') ? 70300 : 52725} aktiv={kpiInn} />{' '}
            <span className="text-[10px] font-normal text-white/50 sm:text-[11px]">kr</span>
          </p>
        </div>
        {/* Siste utbetaling */}
        <div
          className={`rounded-2xl border border-[#ebe6df] bg-white p-3.5 transition-all delay-100 duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-4 ${
            kpiInn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between gap-1">
            <span className="truncate text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#6e6357] sm:text-[9.5px]">
              Siste utbetaling
            </span>
            <DollarSign className="h-4 w-4 shrink-0" style={{ color: LAVENDEL }} />
          </div>
          <p className="text-[16px] font-bold tabular-nums tracking-tight sm:text-[21px]" style={{ ...F, color: INK }}>
            <Teller til={17575} aktiv={kpiInn} />{' '}
            <span className="text-[10px] font-normal text-[#7c7466] sm:text-[11px]">kr</span>
          </p>
        </div>
        {/* Antall oppgjør */}
        <div
          className={`rounded-2xl border border-[#ebe6df] bg-white p-3.5 transition-all delay-200 duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-4 ${
            kpiInn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between gap-1">
            <span className="truncate text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#6e6357] sm:text-[9.5px]">
              Antall oppgjør
            </span>
            <FileText className="h-4 w-4 shrink-0" style={{ color: '#0891b2' }} />
          </div>
          <p className="text-[16px] font-bold tabular-nums tracking-tight sm:text-[21px]" style={{ ...F, color: INK }}>
            {er('oppdater') ? 4 : 3}
          </p>
        </div>
      </div>

      {/* --- Oppgjørstabellen — portalens design ----------------------------- */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#ebe6df] bg-white">
        {/* Kolonneheader */}
        <div className="grid grid-cols-[1fr_auto_20px] items-center gap-3 border-b border-[#f0ebe4] bg-[#fafaf7] px-4 py-2.5 sm:grid-cols-[1fr_76px_72px_98px_20px] sm:gap-3 sm:px-5">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357]">Periode</span>
          <span className="hidden text-right text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357] sm:block">Brutto</span>
          <span className="hidden text-right text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357] sm:block">Honorar</span>
          <span className="text-right text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357]">Netto til deg</span>
          <span />
        </div>

        {/* Radene — historikken tikker inn, nytt oppgjør lander øverst. */}
        <div
          className="relative transition-[height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ height: er('nyrad') ? 4 * RH : 3 * RH }}
        >
          {/* November — live-oppgjøret: sendes, så utbetales. */}
          <Rad
            slot={0}
            synlig={er('nyrad')}
            periode="November 2026"
            brutto="18 500"
            honorar="925"
            netto="17 575"
            status={er('oppgjor') ? 'utbetalt' : 'sendt'}
            F={F}
          />
          {HISTORIKK.map((r, i) => (
            <Rad
              key={r.periode}
              slot={er('nyrad') ? i + 1 : i}
              synlig={er(`rad${i + 1}`)}
              periode={r.periode}
              brutto={r.brutto}
              honorar={r.honorar}
              netto={r.netto}
              status="utbetalt"
              F={F}
            />
          ))}
        </div>
      </div>

      {/* Sluttlinjen — hele poenget. */}
      <p
        className={`mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-opacity delay-300 duration-700 ${
          er('slutt') ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ color: INK }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
        Innkreving, purring og utbetaling — helt automatisk
      </p>
    </div>
  );
}

// Én oppgjørsrad — portalens StatementRow, absolutt posisjonert slot slik at
// nye rader kan gli inn øverst.
function Rad({
  slot,
  synlig,
  periode,
  brutto,
  honorar,
  netto,
  status,
  F,
}: {
  slot: number;
  synlig: boolean;
  periode: string;
  brutto: string;
  honorar: string;
  netto: string;
  status: 'utbetalt' | 'sendt';
  F: React.CSSProperties;
}) {
  return (
    <div
      className="absolute inset-x-0 top-0 grid grid-cols-[1fr_auto_20px] items-center gap-3 border-b border-[#f4efe7] bg-white px-4 transition-all duration-[750ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:grid-cols-[1fr_76px_72px_98px_20px] sm:gap-3 sm:px-5"
      style={{ height: RH, transform: `translateY(${slot * RH + (synlig ? 0 : 18)}px)`, opacity: synlig ? 1 : 0 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ebe6df] bg-[#faf8f5]">
          <Calendar className="h-4 w-4 text-[#6b6050]" strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-bold tracking-[-0.005em] sm:text-[13px]" style={{ ...F, color: INK }}>
            {periode}
          </p>
          <div className="mt-1">
            <Pill type={status} />
          </div>
        </div>
      </div>
      <p className="hidden text-right text-[12.5px] font-semibold tabular-nums text-[#1a1a1a] sm:block">{brutto} kr</p>
      <p className="hidden text-right text-[12.5px] font-semibold tabular-nums sm:block" style={{ color: LAVENDEL }}>
        {honorar} kr
      </p>
      <p className="text-right text-[13.5px] font-bold tabular-nums text-[#1a1a1a] sm:text-[14px]">{netto} kr</p>
      <ChevronRight className="h-4 w-4 justify-self-end text-[#7c7466]" />
    </div>
  );
}
