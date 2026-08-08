import React from 'react';
import { LayoutGrid, Building2, Wallet, MessageSquare, FileText, TrendingUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// PortalMockup — nøyaktig replika av huseierportalens OwnerDashboard (web):
// mørk sidebar med lavendel-aksent og aktiv-indikator, lys hovedflate #F7F5F1,
// signatur INK-hero («Månedlig leieinntekt») med lavendel-glød og belegg-ring,
// statkort og boligrad — alt hentet fra den faktiske koden i repoet.
// ---------------------------------------------------------------------------

const heading = "var(--font-heading), sans-serif";

const NAV = [
  { ikon: LayoutGrid, navn: 'Oversikt', aktiv: true },
  { ikon: Building2, navn: 'Boliger' },
  { ikon: Wallet, navn: 'Økonomi' },
  { ikon: MessageSquare, navn: 'Meldinger', badge: 2 },
  { ikon: FileText, navn: 'Dokumenter' },
];

const STATS: [string, string, string][] = [
  ['Boliger', '1', ''],
  ['Kontrakter', '1', 'aktiv'],
  ['Åpne saker', '0', 'alt løst'],
];

const AKTIVITET = [
  { farge: '#22c55e', tekst: 'Husleie mottatt — 18 500 kr', tid: 'i dag' },
  { farge: '#CF97FC', tekst: 'Ny melding fra leietaker', tid: 'man.' },
];

export default function PortalMockup() {
  const omkrets = 2 * Math.PI * 26;
  return (
    <div className="flex overflow-hidden rounded-[20px] border border-[#e5e0d8] bg-[#F7F5F1] shadow-[0_60px_140px_-40px_rgba(10,10,10,0.4)]">
      {/* Sidebar — mørk, som i portalen */}
      <aside
        className="flex w-[164px] shrink-0 flex-col border-r border-[#2A2520] p-4"
        style={{ background: 'linear-gradient(180deg,#15110D 0%,#0E0C0B 45%)' }}
      >
        <div className="flex items-center gap-2">
          <img src="/digihome-mark.svg" alt="" className="h-5 w-5 rounded-[5px]" />
          <span className="text-[12px] font-bold text-[#F4EFE7]" style={{ fontFamily: heading }}>DigiHome</span>
        </div>
        <nav className="mt-6 space-y-1">
          {NAV.map((n) => {
            const Ikon = n.ikon;
            return (
              <div
                key={n.navn}
                className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] font-medium ${
                  n.aktiv ? 'bg-[#CF97FC]/[0.14] text-[#F4EFE7]' : 'text-[#A89F92]'
                }`}
              >
                {n.aktiv && (
                  <span className="absolute -left-4 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#CF97FC]" />
                )}
                <Ikon className="h-[13px] w-[13px] shrink-0" strokeWidth={1.7} />
                {n.navn}
                {n.badge && (
                  <span className="ml-auto flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#CF97FC] px-1 text-[8.5px] font-bold text-[#141009]">
                    {n.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2 border-t border-[#2A2520] pt-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#CF97FC]/[0.16] text-[9px] font-bold text-[#D9B4FF]">
            AB
          </span>
          <span className="truncate text-[10.5px] text-[#A89F92]">Anna Berg</span>
        </div>
      </aside>

      {/* Hovedflate */}
      <main className="min-w-0 flex-1 p-5">
        <p className="text-[11px] text-[#6B7280]">God morgen</p>
        <h4 className="mt-0.5 text-[24px] font-bold leading-none tracking-[-0.035em] text-[#111827]" style={{ fontFamily: heading }}>
          Anna
        </h4>

        {/* INK-hero — signaturflisen fra portalen */}
        <div
          className="relative mt-4 overflow-hidden rounded-[18px] p-5"
          style={{ background: 'linear-gradient(150deg,#2E2547 0%,#1A1612 58%,#171310 100%)' }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-14 h-44 w-44 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle,#CF97FC33,transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg,transparent,#CF97FC55,transparent)' }}
          />
          <div className="relative flex items-center justify-between gap-4 md:pr-[80px]">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">Månedlig leieinntekt</p>
              <p className="mt-2 text-[32px] font-bold leading-[0.9] tracking-[-0.04em] text-white tabular-nums" style={{ fontFamily: heading }}>
                18 500 <span className="text-[14px] font-medium text-white/40">kr</span>
              </p>
              <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/55">
                <TrendingUp className="h-3 w-3 shrink-0 text-[#D9B4FF]" strokeWidth={2.2} />
                222 000 kr estimert årlig
              </p>
            </div>
            <div className="relative h-[62px] w-[62px] shrink-0">
              <svg width="62" height="62" className="-rotate-90">
                <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                <circle
                  cx="31" cy="31" r="26" fill="none" stroke="#CF97FC" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={omkrets} strokeDashoffset="0"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[12px] font-bold text-white" style={{ fontFamily: heading }}>100%</span>
                <span className="text-[6.5px] uppercase tracking-[0.1em] text-white/45">Belegg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statkort */}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {STATS.map(([l, v, sub]) => (
            <div key={l} className="rounded-[14px] border border-[#ECE6DA] bg-white p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">{l}</p>
              <p className="mt-1 text-[17px] font-bold leading-none tabular-nums text-[#111827]" style={{ fontFamily: heading }}>{v}</p>
              {sub && (
                <p className="mt-0.5 text-[8.5px]" style={{ color: sub === 'alt løst' ? '#059669' : '#6B7280' }}>{sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Boligrad */}
        <div className="mt-2.5 flex items-center gap-3 rounded-[16px] border border-[#ECE6DA] bg-white p-2.5">
          <div className="h-[46px] w-[64px] shrink-0 overflow-hidden rounded-[10px]">
            <img src="/nyest-hero-portrett.webp" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-[#111827]" style={{ fontFamily: heading }}>Storgata 12</p>
            <p className="truncate text-[9.5px] text-[#6B7280]">0155 Oslo · 2-roms · 64 m²</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[9px] font-semibold text-[#166534]">Utleid</span>
          <p className="shrink-0 text-[11.5px] font-bold tabular-nums text-[#111827]" style={{ fontFamily: heading }}>18 500 kr</p>
        </div>

        {/* Siste aktivitet */}
        <div className="mt-2.5 rounded-[16px] border border-[#ECE6DA] bg-white p-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Siste aktivitet</p>
          <div className="mt-2 space-y-2">
            {AKTIVITET.map((a) => (
              <div key={a.tekst} className="flex items-center gap-2">
                <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: a.farge }} />
                <span className="min-w-0 flex-1 truncate text-[10px] text-[#374151]">{a.tekst}</span>
                <span className="shrink-0 text-[9px] text-[#9CA3AF]">{a.tid}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
