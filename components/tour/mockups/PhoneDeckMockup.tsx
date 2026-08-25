import React from 'react';
import { TrendingUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// PhoneDeckMockup — slank scene-utgave av mobilappens Oversikt-skjerm for
// presentasjonsdeck: tynn titanium-ramme (4 px bezel med metallisk gradient
// og hairline-kant), mindre dynamic island, ekte statusbar (09:41 + batteri)
// og samme eierapp-innhold som PhoneMockup. Fiktive demo-data.
// ---------------------------------------------------------------------------

const heading = "var(--font-heading), sans-serif";

const STATS: [string, string][] = [
  ['Belegg', '100%'],
  ['Boliger', '1'],
  ['Kontrakter', '1'],
  ['Åpne saker', '0'],
];

export default function PhoneDeckMockup() {
  return (
    <div
      className="rounded-[44px] p-[4px]"
      style={{
        background: 'linear-gradient(160deg,#4a4a4e 0%,#232326 38%,#141416 100%)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.14), inset 0 0 0 1px rgba(0,0,0,0.7), 0 70px 150px -35px rgba(0,0,0,0.95)',
      }}
    >
      <div className="relative overflow-hidden rounded-[40px] bg-[#0E0C0B]">
        {/* Statusbar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-[9px]">
          <span className="text-[8px] font-semibold tracking-tight text-white/90 tabular-nums">09:41</span>
          <span className="flex items-center gap-1">
            {/* Signal */}
            <svg viewBox="0 0 14 8" className="h-[7px] w-[11px]" fill="currentColor" style={{ color: 'rgba(255,255,255,0.9)' }}>
              <rect x="0" y="5" width="2.2" height="3" rx="0.6" /><rect x="3.8" y="3.5" width="2.2" height="4.5" rx="0.6" /><rect x="7.6" y="2" width="2.2" height="6" rx="0.6" /><rect x="11.4" y="0.5" width="2.2" height="7.5" rx="0.6" />
            </svg>
            {/* Batteri */}
            <span className="relative ml-0.5 inline-flex h-[8px] w-[16px] items-center rounded-[2.5px] border border-white/50 p-[1.2px]">
              <span className="h-full w-[72%] rounded-[1px] bg-white/90" />
              <span className="absolute -right-[2.5px] top-1/2 h-[3.5px] w-[1.5px] -translate-y-1/2 rounded-r-full bg-white/50" />
            </span>
          </span>
        </div>
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-[7px] z-10 h-[14px] w-[50px] -translate-x-1/2 rounded-full bg-black" />

        <div className="px-3.5 pb-3 pt-9">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#F4EFE7]" style={{ fontFamily: heading }}>God morgen, Anna</p>
              <p className="mt-0.5 truncate text-[8.5px] text-[#6E665B]">18 500 kr/mnd · 1 av 1 utleid</p>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#CF97FC]/[0.16] text-[9px] font-bold text-[#D9B4FF]">
              AB
            </span>
          </div>

          {/* IncomeHero — lilla gradient med lavendel-glød */}
          <div
            className="relative mt-3 overflow-hidden rounded-[16px] p-3.5"
            style={{ background: 'linear-gradient(135deg,#2A2140 0%,#1A1522 55%,#14100F 100%)' }}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(circle,rgba(207,151,252,0.4),transparent 70%)' }}
            />
            <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#D9B4FF]/85">Månedlig inntekt</p>
            <p className="mt-1.5 text-[23px] font-bold leading-none tracking-[-0.03em] text-white tabular-nums" style={{ fontFamily: heading }}>
              18 500 <span className="text-[10.5px] font-medium text-white/40">kr</span>
            </p>
            <p className="mt-2 flex items-center gap-1 text-[8.5px] text-white/55">
              <TrendingUp className="h-2.5 w-2.5 shrink-0 text-[#D9B4FF]" strokeWidth={2.2} />
              222 000 kr estimert årlig
            </p>
          </div>

          {/* Statkort 2×2 */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {STATS.map(([l, v]) => (
              <div key={l} className="rounded-[12px] border border-[#2A2520] bg-[#181410] p-2.5">
                <p className="text-[6.5px] font-bold uppercase tracking-[0.12em] text-[#6E665B]">{l}</p>
                <p className="mt-1 text-[14px] font-bold leading-none tabular-nums text-[#F4EFE7]" style={{ fontFamily: heading }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Mine boliger */}
          <p className="mt-3 text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#6E665B]">Mine boliger</p>
          <div className="mt-1.5 overflow-hidden rounded-[14px] border border-[#2A2520] bg-[#181410]">
            <div className="h-[54px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/interior-dining.webp" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center justify-between p-2.5">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-[#F4EFE7]" style={{ fontFamily: heading }}>Storgata 12</p>
                <p className="text-[7.5px] text-[#6E665B]">0155 Oslo · 2-roms</p>
              </div>
              <span className="shrink-0 rounded-full px-2 py-[3px] text-[7.5px] font-semibold text-[#5CC98E]" style={{ background: 'rgba(92,201,142,0.15)' }}>
                Utleid
              </span>
            </div>
          </div>

          {/* Home-indicator */}
          <div className="mx-auto mt-2.5 h-1 w-14 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
