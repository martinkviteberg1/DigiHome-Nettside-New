'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Check, Clock, PenTool, Landmark, ShieldCheck } from 'lucide-react';

// ---------------------------------------------------------------------------
// KontraktDemo — tro replika av systemets kontraktkort: leiekontrakten
// genereres ferdig utfylt (Husleieloven + AI-badges), leietaker velger
// sikkerhet (depositumskonto vs. forsikring), begge parter signerer med
// BankID — og signeringsstatusen går fra «Venter» til «Signert».
// Selvspillende, looper rolig. Basert på produktets faktiske kontraktvisning.
// ---------------------------------------------------------------------------

const INK = '#0a0a0a';
const LAVENDEL = '#cf97fc';

const TRINN: { navn: string; ms: number }[] = [
  { navn: 'start', ms: 900 },
  { navn: 'rad1', ms: 340 },
  { navn: 'rad2', ms: 340 },
  { navn: 'rad3', ms: 340 },
  { navn: 'rad4', ms: 750 },
  { navn: 'opsjoner', ms: 1000 },
  { navn: 'velg', ms: 950 },
  { navn: 'knapp', ms: 1200 },
  { navn: 'trykk', ms: 420 },
  { navn: 'sign1', ms: 1050 },
  { navn: 'sign2', ms: 1500 },
  { navn: 'aktiv', ms: 5000 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

// Kontraktdetaljene — samme tall som tidligere i reisen.
const DETALJER = [
  { l: 'Leietaker', v: 'Emma Strand' },
  { l: 'Månedsleie', v: '18 500 kr' },
  { l: 'Depositum', v: '55 500 kr (3 mnd)' },
  { l: 'Innflytting', v: '1. august 2026' },
];

const EMMA_FOTO = 'https://images.unsplash.com/photo-1610659523060-816c02b94529?w=80&h=80&fit=crop&crop=face';

export default function KontraktDemo() {
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
  const trykker = TRINN[fase].navn === 'trykk';

  const F = { fontFamily: 'var(--font-heading), sans-serif' } as React.CSSProperties;

  return (
    <div ref={rot} className="relative w-full max-w-[500px] lg:mx-auto" data-testid="tour-kontrakt-demo">
      {/* --- Kontraktkortet — systemets design ------------------------------ */}
      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_16px_70px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0eeeb] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#0a0a0a]">
              <FileText className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ ...F, color: INK }}>
                Leiekontrakt
              </p>
              <p className="mt-0.5 text-[10px] text-[#aaa]">Generert fra annonsen og søknaden</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-[#059669]">
              Husleieloven
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider"
              style={{ color: '#9B5BD6', backgroundColor: 'rgba(155,91,214,0.08)' }}
            >
              AI
            </span>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {/* Detaljene — fylles ut rad for rad. */}
          <div className="divide-y divide-[#f5f3f0] rounded-[14px] border border-[#f0eeeb]">
            {DETALJER.map((r, i) => {
              const synlig = er(`rad${i + 1}`);
              return (
                <div key={r.l} className="flex items-center justify-between px-4 py-[9px]">
                  <span className="text-[11px] text-[#aaa]">{r.l}</span>
                  <span
                    className={`text-[11px] font-semibold tabular-nums transition-all duration-500 ${
                      synlig ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                    }`}
                    style={{ color: INK }}
                  >
                    {r.v}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sikkerheten — leietaker velger depositumsløsning. */}
          <div
            className={`transition-all duration-600 ${er('opsjoner') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
          >
            <p className="mb-2.5 mt-5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#737373]">
              Leietaker velger sikkerhet
            </p>
            <div className="space-y-2.5">
              <div
                className={`flex items-center gap-3 rounded-[14px] border px-3.5 py-3 transition-all duration-500 ${
                  er('velg')
                    ? 'border-[#0a0a0a] bg-[#fafafa] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                    : 'border-[#f0eeeb]'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-[#dbeafe] bg-[#f0f7ff]">
                  <Landmark className="h-4 w-4 text-[#3b82f6]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold" style={{ ...F, color: INK }}>
                    Depositumskonto
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-[#aaa]">Opprettes automatisk via bankintegrasjon</p>
                </div>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] transition-all duration-300 ${
                    er('velg') ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
              </div>
              <div
                className={`flex items-center gap-3 rounded-[14px] border border-[#f0eeeb] px-3.5 py-3 transition-opacity duration-500 ${
                  er('velg') ? 'opacity-55' : 'opacity-100'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-[#d1fae5] bg-[#ecfdf5]">
                  <ShieldCheck className="h-4 w-4 text-[#059669]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold" style={{ ...F, color: INK }}>
                    Depositumsforsikring
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-[#aaa]">Leieboerforsikring — ingen kapital fryses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Signer-knappen — våkner, trykkes, blir kvittering. */}
          <div
            className={`mt-5 flex h-[48px] items-center justify-center gap-2.5 rounded-[14px] text-[13px] font-bold transition-all duration-500 ${
              er('sign1')
                ? 'bg-[#e8f6ee] text-[#166534]'
                : er('knapp')
                  ? 'bg-[#0a0a0a] text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)]'
                  : 'bg-[#f0ece5] text-[#b3aca2]'
            } ${trykker ? 'scale-[0.97]' : 'scale-100'}`}
            style={F}
          >
            {er('sign1') ? (
              <>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e]">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
                Signert med BankID
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4" strokeWidth={1.75} />
                Signer med BankID
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- Signeringsstatus — systemets statuskort ------------------------ */}
      <div
        className={`mt-3.5 rounded-[20px] bg-white px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          er('sign1') ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#737373]">Signeringsstatus</p>
        <div className="space-y-3">
          {/* Utleier — signert først. */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#059669]">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-[11px] font-bold" style={{ ...F, color: INK }}>
                  Anna Berg
                </p>
                <span className="text-[9px] text-[#737373]">Utleier</span>
              </div>
              <p className="mt-0.5 text-[9px] text-[#aaa]">I dag, 14:22</p>
            </div>
            <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[8px] font-bold text-[#059669]">Signert</span>
          </div>
          {/* Leietaker — venter, så signert. */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
                er('sign2') ? 'bg-[#059669]' : 'bg-[#f5f3f0]'
              }`}
            >
              {er('sign2') ? (
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              ) : (
                <Clock className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <img src={EMMA_FOTO} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[11px] font-bold" style={{ ...F, color: INK }}>
                    Emma Strand
                  </p>
                  <span className="text-[9px] text-[#737373]">Leietaker</span>
                </div>
                <p className="mt-0.5 text-[9px] text-[#aaa]">{er('sign2') ? 'I dag, 14:26' : 'Sendt 14:23'}</p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[8px] font-bold transition-colors duration-500 ${
                er('sign2') ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fff7ed] text-[#d97706]'
              }`}
            >
              {er('sign2') ? 'Signert' : 'Venter på signering'}
            </span>
          </div>
        </div>
      </div>

      {/* Sluttlinjen — kontrakten er aktiv. */}
      <p
        className={`mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-opacity delay-300 duration-700 ${
          er('aktiv') ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ color: INK }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
        Kontrakten er aktiv — depositumskontoen opprettes automatisk
      </p>
    </div>
  );
}
