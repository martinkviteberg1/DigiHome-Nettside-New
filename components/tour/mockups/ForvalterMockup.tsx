import React from 'react';
import {
  LayoutDashboard, Gauge, MessageSquare, ClipboardList, CalendarDays, Rocket,
  FileText, FileSignature, AlertCircle, Wallet, Search, Sparkles, Droplets,
  KeyRound, Volume2, TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ForvalterMockup — tro replika av forvalterportalens dashbord (AdminLayout +
// AdminDashboard fra DigiHome-repoet): mørk #1a1a1a-sidebar med ⌘K-søk og
// lavendel-aksent #cf97fc (aktiv rad = gradient cf97fc/20→4), lys hovedflate
// #fdfcfb med hvite kort #ffffff/#eae7ef, hero-stripe, innsiktskort (invBg
// #1a1a1a) og «Aktive saker». Alle data er fiktive demo-data.
// ---------------------------------------------------------------------------

const heading = "var(--font-heading), sans-serif";

const NAV = [
  { ikon: LayoutDashboard, navn: 'Oversikt', aktiv: true },
  { ikon: Gauge, navn: 'Operasjonssentral' },
  { ikon: MessageSquare, navn: 'Inbox', badge: 3 },
  { ikon: ClipboardList, navn: 'Reservasjoner' },
  { ikon: CalendarDays, navn: 'Kalender' },
  { ikon: Rocket, navn: 'Utleieprosesser' },
  { ikon: FileText, navn: 'Kontrakter' },
  { ikon: FileSignature, navn: 'Dokumenter' },
  { ikon: AlertCircle, navn: 'Saker' },
  { ikon: Wallet, navn: 'Økonomi' },
];

const HERO: [string, string, string][] = [
  ['Belegg', '96 %', '+2,1 %'],
  ['Leieinntekt / mnd', '842 000 kr', '+34 500 kr'],
  ['Enheter', '47', '3 ledige'],
  ['Åpne saker', '6', '2 nye i dag'],
];

const SAKER = [
  { Ikon: Droplets, farge: '#3b82f6', bg: 'rgba(59,130,246,0.10)', tittel: 'Vannlekkasje bad', sted: 'Storgata 12 · rørlegger booket', chip: 'Pågår', chipFarge: '#b45309', chipBg: 'rgba(217,119,6,0.12)' },
  { Ikon: KeyRound, farge: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', tittel: 'Mistet nøkkel', sted: 'Kong Oscars gate 3 · leietaker varslet', chip: 'Ny', chipFarge: '#7c3aed', chipBg: 'rgba(207,151,252,0.16)' },
  { Ikon: Volume2, farge: '#f43f5e', bg: 'rgba(244,63,94,0.10)', tittel: 'Klage på støy', sted: 'Marken 8 · nabovarsel sendt', chip: 'Venter', chipFarge: '#8a8a8e', chipBg: 'rgba(138,138,142,0.12)' },
];

const IDAG = [
  { tid: '12:00', hva: 'Visning', hvor: 'Storgata 12' },
  { tid: '14:30', hva: 'Innflytting', hvor: 'Marken 8' },
  { tid: '16:00', hva: 'Befaring', hvor: 'Nygårdsgaten 24' },
];

export default function ForvalterMockup() {
  return (
    <div className="flex overflow-hidden rounded-[20px] bg-[#fdfcfb]" style={{ height: 540 }}>
      {/* Sidebar — mørk, med ⌘K-søk og lavendel-aksent */}
      <aside className="flex w-[176px] shrink-0 flex-col bg-[#1a1a1a] p-3.5">
        <div className="flex items-center gap-2 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-mark.svg" alt="" className="h-5 w-5 rounded-[5px]" />
          <span className="text-[12px] font-bold text-white" style={{ fontFamily: heading }}>DigiHome</span>
          <span className="ml-auto rounded-full bg-[#cf97fc]/[0.16] px-1.5 py-[2px] text-[7px] font-bold text-[#cf97fc]">PRO</span>
        </div>

        {/* ⌘K-søk */}
        <div className="mt-3.5 flex h-[30px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-white/50">
          <Search className="h-[11px] w-[11px]" strokeWidth={2} />
          <span className="text-[9.5px]">Søk</span>
          <kbd className="ml-auto inline-flex h-[15px] items-center rounded bg-white/10 px-1 text-[8px] font-semibold text-white/60">⌘K</kbd>
        </div>

        <nav className="mt-3.5 space-y-[3px]">
          {NAV.map((n) => {
            const Ikon = n.ikon;
            return (
              <div
                key={n.navn}
                className={`relative flex items-center gap-2 rounded-lg px-2 py-[6px] text-[10px] font-medium ${
                  n.aktiv
                    ? 'bg-gradient-to-r from-[#cf97fc]/[0.20] to-[#cf97fc]/[0.04] text-white'
                    : 'text-white/50'
                }`}
              >
                {n.aktiv && <span className="absolute -left-3.5 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#cf97fc]" />}
                <Ikon className="h-[12px] w-[12px] shrink-0" strokeWidth={1.8} />
                <span className="truncate">{n.navn}</span>
                {n.badge && (
                  <span className="ml-auto flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-white/20 px-1 text-[8px] font-bold text-white">{n.badge}</span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2 border-t border-white/[0.08] px-1 pt-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] text-[8px] font-bold text-white">MK</span>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold text-white/85">Martin</p>
            <p className="text-[7px] text-white/40">Forvalter</p>
          </div>
        </div>
      </aside>

      {/* Hovedflate */}
      <div className="min-w-0 flex-1 overflow-hidden p-5">
        {/* Hilsen */}
        <p className="text-[19px] font-bold leading-none tracking-[-0.03em] text-[#2d2d2d]" style={{ fontFamily: heading }}>
          God morgen, Martin <span className="align-middle text-[15px]">👋</span>
        </p>
        <p className="mt-1.5 text-[9px] text-[#8a8a8e]">Her er dagens bilde av porteføljen — autopiloten har jobbet i natt.</p>

        {/* Hero-stripe */}
        <div className="mt-3.5 grid grid-cols-4 overflow-hidden rounded-2xl border border-[#eae7ef] bg-white">
          {HERO.map(([l, v, d], i) => (
            <div key={l} className={`p-3 ${i > 0 ? 'border-l border-[#eae7ef]' : ''}`}>
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#8a8a8e]">{l}</p>
              <p className="mt-1.5 text-[15px] font-bold leading-none tracking-[-0.03em] text-[#2d2d2d] tabular-nums" style={{ fontFamily: heading }}>{v}</p>
              <p className="mt-1.5 flex items-center gap-1 text-[7.5px] font-medium text-[#16a34a]">
                <TrendingUp className="h-2 w-2" strokeWidth={2.2} /> {d}
              </p>
            </div>
          ))}
        </div>

        {/* Innsiktskort — autopiloten */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#1a1a1a] p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(167,139,250,0.18)' }}>
            <Sparkles className="h-[13px] w-[13px] text-[#cf97fc]" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[9.5px] font-semibold text-white">Autopilot har besvart 14 henvendelser og booket 5 visninger i natt</p>
            <p className="mt-[3px] text-[7.5px] text-white/55">2 leiekontrakter klare til BankID-signering · husleie avstemt for februar</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-[#cf97fc]/[0.16] px-2 py-[3px] text-[7.5px] font-bold text-[#cf97fc]">Se detaljer</span>
        </div>

        {/* To kolonner: Aktive saker + I dag */}
        <div className="mt-3 grid grid-cols-[1.5fr_1fr] gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[-0.01em] text-[#2d2d2d]" style={{ fontFamily: heading }}>Aktive saker</p>
            <div className="mt-1.5 overflow-hidden rounded-2xl border border-[#eae7ef] bg-white">
              {SAKER.map((s, i) => (
                <div key={s.tittel} className={`flex items-center gap-2.5 p-2.5 ${i > 0 ? 'border-t border-[#eae7ef]' : ''}`}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: s.bg }}>
                    <s.Ikon className="h-[11px] w-[11px]" style={{ color: s.farge }} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[9.5px] font-semibold text-[#2d2d2d]">{s.tittel}</p>
                    <p className="truncate text-[7.5px] text-[#8a8a8e]">{s.sted}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full px-2 py-[3px] text-[7.5px] font-semibold" style={{ color: s.chipFarge, background: s.chipBg }}>{s.chip}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[-0.01em] text-[#2d2d2d]" style={{ fontFamily: heading }}>I dag</p>
            <div className="mt-1.5 overflow-hidden rounded-2xl border border-[#eae7ef] bg-white">
              {IDAG.map((r, i) => (
                <div key={r.tid} className={`flex items-center gap-2.5 p-2.5 ${i > 0 ? 'border-t border-[#eae7ef]' : ''}`}>
                  <span className="w-[26px] shrink-0 text-[8.5px] font-bold text-[#7c3aed] tabular-nums">{r.tid}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[9.5px] font-semibold text-[#2d2d2d]">{r.hva}</p>
                    <p className="truncate text-[7.5px] text-[#8a8a8e]">{r.hvor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leieinntekt siste 6 mnd — minigraf */}
        <div className="mt-3 rounded-2xl border border-[#eae7ef] bg-white p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a8a8e]">Leieinntekt siste 6 mnd</p>
            <p className="text-[8px] font-semibold text-[#16a34a]">+11 % mot i fjor</p>
          </div>
          <div className="mt-2 flex h-[52px] items-end gap-[10px]">
            {[
              ['Sep', 58], ['Okt', 64], ['Nov', 61], ['Des', 70], ['Jan', 82], ['Feb', 100],
            ].map(([mnd, h], i) => (
              <div key={mnd} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-[4px]"
                  style={{
                    height: `${(Number(h) / 100) * 40}px`,
                    background: i === 5 ? 'linear-gradient(180deg,#a78bfa,#7c3aed)' : '#eee9f6',
                  }}
                />
                <span className={`text-[6.5px] ${i === 5 ? 'font-bold text-[#7c3aed]' : 'text-[#b8b5be]'}`}>{mnd}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
