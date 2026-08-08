import React from 'react';
import { TrendingUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// PhoneMockup — nøyaktig replika av mobilappens Oversikt-skjerm (Expo-appen i
// repoet): varm koksgrå flate #0E0C0B, kort #181410 med border #2A2520,
// IncomeHero med lilla gradient (#2A2140→#1A1522→#14100F) og lavendel-glød,
// statkort-grid og boligkort med «Utleid»-status — alt fra owner/theme.ts.
// ---------------------------------------------------------------------------

const heading = "var(--font-heading), sans-serif";

const STATS: [string, string][] = [
  ['Belegg', '100%'],
  ['Boliger', '1'],
  ['Kontrakter', '1'],
  ['Åpne saker', '0'],
];

export default function PhoneMockup() {
  return (
    <div className="rounded-[42px] bg-[#0a0a0a] p-[7px] shadow-[0_70px_140px_-40px_rgba(10,10,10,0.6)] ring-1 ring-black/30">
      <div className="relative overflow-hidden rounded-[35px] bg-[#0E0C0B]">
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-2.5 h-[17px] w-[62px] -translate-x-1/2 rounded-full bg-black" />

        <div className="px-3.5 pb-3.5 pt-10">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#F4EFE7]" style={{ fontFamily: heading }}>God morgen, Anna</p>
              <p className="mt-0.5 truncate text-[8.5px] text-[#6E665B]">18 500 kr/mnd · 1 av 1 utleid</p>
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
              18 500 <span className="text-[10.5px] font-medium text-white/40">kr</span>
            </p>
            <p className="mt-2 flex items-center gap-1 text-[8.5px] text-white/55">
              <TrendingUp className="h-2.5 w-2.5 shrink-0 text-[#D9B4FF]" strokeWidth={2.2} />
              222 000 kr estimert årlig
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
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
