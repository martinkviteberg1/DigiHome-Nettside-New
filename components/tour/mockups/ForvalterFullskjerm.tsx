import React, { useEffect, useState } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import {
  LayoutDashboard, Gauge, MessageSquare, ClipboardList, CalendarDays, Radio,
  ClipboardCheck, Bot, Building2, Rocket, FileText, FileSignature, AlertCircle,
  Users, Wrench, BookOpen, Wand2, PieChart, ScrollText, TrendingUp, DollarSign,
  Search, PanelLeftClose, ChevronDown, Sparkles, ArrowUpRight, Home,
  Droplets, HelpCircle, Timer, Circle, Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ForvalterFullskjerm — 1:1-replika av den faktiske forvalterportalen
// (AdminLayout.tsx + AdminDashboard.tsx) på designflate 1600×1000 for
// fullskjerm-reveal i Bergen Urban-presentasjonen.
//
// Sidebar: eksakt som AdminLayout — 220px, #1a1a1a, Plus Jakarta Sans,
//   ⌘K-søk, seksjonene Arbeid/Drift/Verktøy/Administrasjon, aktiv rad med
//   lilla gradient + glødende indikator (#cf97fc→#7c5cff), brukerchip nederst.
// Dashboard: eksakt som AdminDashboard (C_LIGHT) — hilsen m/avatar,
//   inntektsstripe (4 celler, p-7, sparklines, potensiale), KPI-kort,
//   mørkt innsiktskort, «Aktive saker» + «Portefølje».
// Alle data er fiktive demo-data. `vis`-prop koreograferer materialiseringen
// (sidebar glir inn først, deretter kaskade av seksjonene).
// ---------------------------------------------------------------------------

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

// Palett — C_LIGHT fra AdminDashboard
const C = {
  bg: '#fdfcfb', card: '#ffffff', iconBg: '#f5f4f7', border: '#eae7ef',
  text: '#2d2d2d', sub: '#8a8a8e', muted: '#b8b5be',
  accent: '#d298ff', accentSoft: '#f3ebff',
  green: '#6aab8e', greenBg: '#eef6f2', blue: '#7da4c9', blueBg: '#edf3f9',
  amber: '#c9a06a', amberBg: '#faf4eb', rose: '#c47e86', roseBg: '#faf0f1',
  slate: '#8b8d94', invBg: '#1a1a1a', invSub: 'rgba(255,255,255,0.55)',
  purple: '#8b7ec7', purpleBg: '#f0edf7',
};

const NAV: { seksjon?: string; navn?: string; Ikon?: any; aktiv?: boolean; badge?: string; antall?: number }[] = [
  { seksjon: 'Arbeid' },
  { navn: 'Oversikt', Ikon: LayoutDashboard, aktiv: true },
  { navn: 'Operasjonssentral', Ikon: Gauge, badge: 'Ny' },
  { navn: 'Innboks', Ikon: MessageSquare, antall: 3 },
  { navn: 'Reservasjoner', Ikon: ClipboardList },
  { navn: 'Kalender', Ikon: CalendarDays },
  { navn: 'Kanaler', Ikon: Radio },
  { navn: 'Oppgaver', Ikon: ClipboardCheck },
  { navn: 'Driftsassistent', Ikon: Bot },
  { seksjon: 'Drift' },
  { navn: 'Eiendommer', Ikon: Building2 },
  { navn: 'Utleieprosesser', Ikon: Rocket },
  { navn: 'Leieforhold', Ikon: FileText },
  { navn: 'Dokumenter', Ikon: FileSignature },
  { navn: 'Saker', Ikon: AlertCircle },
  { navn: 'Personer', Ikon: Users },
  { navn: 'Leverandører', Ikon: Wrench },
  { navn: 'Driftshåndbok', Ikon: BookOpen },
  { seksjon: 'Verktøy' },
  { navn: 'Bildestudio', Ikon: Wand2, badge: 'Ny' },
  { seksjon: 'Administrasjon' },
  { navn: 'Analyse', Ikon: PieChart },
  { navn: 'Forvaltningsavtaler', Ikon: ScrollText },
  { navn: 'Salg', Ikon: TrendingUp },
  { navn: 'Økonomi', Ikon: DollarSign },
];

const NBSP = '\u00A0';
const kr = (n: number) => n.toLocaleString('nb-NO').replace(/\s/g, NBSP);

const SPARK_LEIE = [421, 428, 425, 439, 447, 458, 486];
const SPARK_HONORAR = [63, 64, 64, 66, 67, 69, 73];
const SPARK_NETTO = [358, 364, 361, 373, 380, 389, 413];
const SPARK_ENHETER = [48, 50, 51, 52, 54, 55, 56];
const SPARK_LEIETAKERE = [52, 54, 55, 57, 58, 60, 61];
const SPARK_SAKER = [7, 6, 8, 5, 4, 5, 3];

function Spark({ data, color, w = 100, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...data); const min = Math.min(...data); const r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / r) * (h - 4) - 2}`).join(' ');
  const lastY = h - ((data[data.length - 1] - min) / r) * (h - 4) - 2;
  return (
    <svg width={w} height={h} className="overflow-visible opacity-60">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r={2.5} fill={color} opacity={0.8} />
    </svg>
  );
}

const SAKER = [
  { Ikon: Droplets, c: C.blue, bg: C.blueBg, tittel: 'Vannlekkasje på badet', meta: 'Skade · 2t', StIkon: Timer, stTekst: 'Pågår', stC: C.purple, stBg: C.purpleBg, prio: C.amber },
  { Ikon: Wrench, c: C.amber, bg: C.amberBg, tittel: 'Service av ventilasjonsanlegg', meta: 'Vedlikehold · 5t', StIkon: Circle, stTekst: 'Åpen', stC: C.blue, stBg: C.blueBg, prio: C.muted },
  { Ikon: HelpCircle, c: C.purple, bg: C.purpleBg, tittel: 'Spørsmål om depositum', meta: 'Henvendelse · 1d', StIkon: Clock, stTekst: 'Venter', stC: C.amber, stBg: C.amberBg, prio: C.muted },
];

const PORTEFOLJE = [
  { navn: 'Aktive eiendommer', verdi: 12, farge: C.green },
  { navn: 'Aktive kontrakter', verdi: 54, farge: C.blue },
  { navn: 'Leverandører', verdi: 9, farge: C.slate },
  { navn: 'Leads', verdi: 4, farge: C.amber },
  { navn: 'Onboarding', verdi: 2, farge: C.accent },
];

export default function ForvalterFullskjerm({ vis = true }: { vis?: boolean }) {
  // Hilsen/dato beregnes KUN på klienten (etter mount) — serverens klokke
  // (UTC) og publikums klokke kan være i ulike timer, og ville ellers gitt
  // React hydration-feil («God morgen» vs «God dag»).
  const [naaTekst, setNaaTekst] = useState({ hilsen: 'God dag', dato: '' });
  useEffect(() => {
    const naa = new Date();
    const time = naa.getHours();
    setNaaTekst({
      hilsen: time < 6 ? 'God natt' : time < 12 ? 'God morgen' : time < 18 ? 'God dag' : 'God kveld',
      dato: naa.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }),
    });
  }, []);
  const { hilsen, dato } = naaTekst;

  const inn = (delay: number): React.CSSProperties => ({
    opacity: vis ? 1 : 0,
    transform: vis ? 'translateY(0)' : 'translateY(26px)',
    transition: `opacity 850ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 850ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  return (
    <div className={`${jakarta.className} flex overflow-hidden`} style={{ width: 1600, height: 1000, backgroundColor: C.bg }}>
      {/* ═══ SIDEBAR — eksakt som AdminLayout ═══ */}
      <aside
        className="flex shrink-0 flex-col bg-[#1a1a1a] text-white"
        style={{
          width: 220,
          transform: vis ? 'translateX(0)' : 'translateX(-105%)',
          transition: 'transform 950ms cubic-bezier(0.22,1,0.36,1) 60ms',
        }}
      >
        {/* Logo + kollaps-knapp */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-[26px] w-auto shrink-0 select-none" draggable={false} />
            <span className="flex h-7 w-7 items-center justify-center rounded-md text-white/55">
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
            </span>
          </div>
        </div>

        {/* Global søk / ⌘K */}
        <div className="px-3 pb-2 pt-0.5">
          <div className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-white/70">
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span className="flex-1 text-left text-[13px]">Søk</span>
            <kbd className="inline-flex h-5 items-center rounded bg-white/10 px-1.5 text-[10.5px] font-semibold text-white/60">⌘K</kbd>
          </div>
        </div>

        {/* Navigasjon */}
        <nav className="flex-1 space-y-1 overflow-hidden px-2.5">
          {NAV.map((item, idx) => {
            if (item.seksjon) {
              return (
                <p key={`sec-${idx}`} className="px-3 pb-2 pt-5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  {item.seksjon}
                </p>
              );
            }
            const Ikon = item.Ikon;
            return (
              <div
                key={item.navn}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${
                  item.aktiv ? 'bg-gradient-to-r from-[#cf97fc]/[0.20] to-[#cf97fc]/[0.04] text-white' : 'text-white/50'
                }`}
              >
                {item.aktiv && (
                  <span className="absolute left-0 top-1/2 h-6 w-[4px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#cf97fc] to-[#7c5cff] shadow-[0_0_12px_rgba(207,151,252,0.65)]" />
                )}
                <Ikon
                  className={`h-[18px] w-[18px] shrink-0 ${item.aktiv ? 'text-[#cf97fc]' : 'text-white/55'}`}
                  strokeWidth={item.aktiv ? 2.2 : 1.6}
                />
                <span className="truncate">{item.navn}</span>
                {item.antall && (
                  <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold text-white">
                    {item.antall}
                  </span>
                )}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/55">{item.badge}</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Brukerchip nederst */}
        <div className="border-t border-white/5 px-3 pb-4 pt-3">
          <div className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/50">M</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-white/50">Martin Kviteberg</span>
              <span className="block truncate text-[10px] text-white/15">martin@digihome.no</span>
            </span>
            <ChevronDown className="h-3 w-3 text-white/15" />
          </div>
        </div>
      </aside>

      {/* ═══ DASHBOARD — eksakt som AdminDashboard ═══ */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="mx-auto max-w-[1100px] px-8 pt-10">
          {/* ── Hilsen ── */}
          <div className="mb-10 flex items-center justify-between gap-4" style={inn(380)}>
            <div className="flex items-center gap-5">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] text-[22px] font-bold text-white"
                style={{ boxShadow: `0 0 0 3px ${C.bg}, 0 0 0 5px ${C.border}` }}
              >
                M
              </div>
              <div>
                <h1 className="mb-2 text-[32px] font-bold leading-none tracking-[-0.04em]" style={{ color: C.text }}>
                  {hilsen}, Martin <span className="align-middle text-[26px]">👋</span>
                </h1>
                <p suppressHydrationWarning className="text-[16px] capitalize" style={{ color: C.sub }}>{dato}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 items-center gap-2.5 rounded-full px-6 text-[14px] font-medium" style={{ border: `1px solid ${C.border}`, color: C.text, backgroundColor: C.card }}>
                Saker
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ backgroundColor: C.rose }}>3</span>
              </span>
              <span className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-white" style={{ backgroundColor: C.invBg }}>
                Eiendommer
              </span>
            </div>
          </div>

          {/* ── Inntektsstripe (4 celler) ── */}
          <div className="mb-6 grid grid-cols-4 gap-0 overflow-hidden rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, ...inn(540) }}>
            {/* Leieinntekt / mnd */}
            <div className="p-7">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px]" style={{ color: C.sub }}>Leieinntekt / mnd</p>
              </div>
              <p className="mb-3 text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums" style={{ color: C.text }}>
                {kr(486300)} <span className="text-[14px] font-normal" style={{ color: C.muted }}>kr</span>
              </p>
              <Spark data={SPARK_LEIE} color={C.green} />
              <div className="mt-3 pt-2.5" style={{ borderTop: `1px dashed ${C.border}` }}>
                <p className="text-[12.5px] font-semibold tabular-nums" style={{ color: C.accent }}>Potensiale: {kr(512800)} kr/mnd</p>
                <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: C.muted }}>+{kr(26500)} fra 2 ledige</p>
              </div>
            </div>
            {/* Honorar / mnd */}
            <div className="p-7" style={{ borderLeft: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px]" style={{ color: C.sub }}>Honorar / mnd</p>
              </div>
              <p className="mb-3 text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums" style={{ color: C.text }}>
                {kr(72900)} <span className="text-[14px] font-normal" style={{ color: C.muted }}>kr</span>
              </p>
              <Spark data={SPARK_HONORAR} color={C.accent} />
              <div className="mt-3 pt-2.5" style={{ borderTop: `1px dashed ${C.border}` }}>
                <p className="text-[12.5px] font-semibold tabular-nums" style={{ color: C.accent }}>Potensiale: {kr(76900)} kr/mnd</p>
                <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: C.muted }}>+{kr(4000)} fra 2 ledige</p>
              </div>
            </div>
            {/* Netto til huseiere / mnd */}
            <div className="p-7" style={{ borderLeft: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px]" style={{ color: C.sub }}>Netto til huseiere / mnd</p>
              </div>
              <p className="mb-3 text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums" style={{ color: C.text }}>
                {kr(413400)} <span className="text-[14px] font-normal" style={{ color: C.muted }}>kr</span>
              </p>
              <Spark data={SPARK_NETTO} color={C.slate} />
              <div className="mt-3 pt-2.5" style={{ borderTop: `1px dashed ${C.border}` }}>
                <p className="text-[12.5px] font-semibold tabular-nums" style={{ color: C.accent }}>Potensiale: {kr(435900)} kr/mnd</p>
                <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: C.muted }}>+{kr(22500)} fra 2 ledige</p>
              </div>
            </div>
            {/* Belegg */}
            <div className="p-7" style={{ borderLeft: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px]" style={{ color: C.sub }}>Belegg</p>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.sub }}>54/56</span>
              </div>
              <p className="mb-3 text-[28px] font-bold leading-none tracking-[-0.03em] tabular-nums" style={{ color: C.text }}>
                96<span className="text-[14px] font-normal" style={{ color: C.muted }}>%</span>
              </p>
              <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: C.border }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: vis ? '96%' : '0%', backgroundColor: C.accent, transitionDelay: '1250ms' }} />
              </div>
              <p className="mt-2 text-[12px]" style={{ color: C.muted }}>54 enheter utleid</p>
            </div>
          </div>

          {/* ── KPI-kort ── */}
          <div className="mb-6 grid grid-cols-4 gap-4" style={inn(700)}>
            {/* Eiendommer */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: C.iconBg }}>
                  <Building2 className="h-[18px] w-[18px]" style={{ color: C.sub }} strokeWidth={1.5} />
                </div>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: C.green }}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: C.green }} />Live
                </span>
              </div>
              <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums" style={{ color: C.text }}>12</p>
              <p className="mt-1 text-[14px]" style={{ color: C.sub }}>Eiendommer</p>
            </div>
            {/* Enheter */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: C.iconBg }}>
                  <Home className="h-[18px] w-[18px]" style={{ color: C.sub }} strokeWidth={1.5} />
                </div>
                <Spark data={SPARK_ENHETER} color={C.blue} w={60} h={20} />
              </div>
              <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums" style={{ color: C.text }}>56</p>
              <p className="mt-1 text-[14px]" style={{ color: C.sub }}>Enheter</p>
              <p className="mt-0.5 text-[12px] font-semibold" style={{ color: C.green }}>54 utleid</p>
            </div>
            {/* Leietakere */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: C.iconBg }}>
                  <Users className="h-[18px] w-[18px]" style={{ color: C.sub }} strokeWidth={1.5} />
                </div>
                <Spark data={SPARK_LEIETAKERE} color={C.slate} w={60} h={20} />
              </div>
              <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums" style={{ color: C.text }}>61</p>
              <p className="mt-1 text-[14px]" style={{ color: C.sub }}>Leietakere</p>
            </div>
            {/* Åpne saker */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: C.roseBg }}>
                  <AlertCircle className="h-[18px] w-[18px]" style={{ color: C.rose }} strokeWidth={1.5} />
                </div>
                <Spark data={SPARK_SAKER} color={C.rose} w={60} h={20} />
              </div>
              <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums" style={{ color: C.text }}>3</p>
              <p className="mt-1 text-[14px]" style={{ color: C.sub }}>Åpne saker</p>
              <p className="mt-0.5 text-[12px] font-semibold" style={{ color: C.rose }}>Trenger oppfølging</p>
            </div>
          </div>

          {/* ── Innsiktskort (mørkt) ── */}
          <div className="relative mb-10 flex items-center gap-6 overflow-hidden rounded-2xl p-6" style={{ backgroundColor: C.invBg, ...inn(860) }}>
            <div className="absolute right-[-5%] top-[-30%] h-[300px] w-[300px] rounded-full" style={{ opacity: 0.08, backgroundColor: C.accent }} />
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(167,139,250,0.18)' }}>
              <Sparkles className="h-6 w-6" style={{ color: C.accent }} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[16px] font-semibold text-white">Porteføljen presterer over gjennomsnittet</p>
              <p className="text-[14px]" style={{ color: C.invSub }}>54 av 56 enheter utleid. 96% belegg.</p>
            </div>
            <span className="flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-[13px] font-semibold" style={{ backgroundColor: C.accent, color: '#1a1a1a' }}>
              Se detaljer <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
            </span>
          </div>

          {/* ── To kolonner: Aktive saker + Portefølje ── */}
          <div className="grid grid-cols-12 gap-8" style={inn(1020)}>
            <div className="col-span-7">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: C.text }}>Aktive saker</h2>
                <span className="text-[14px] font-semibold underline underline-offset-4" style={{ color: C.text, textDecorationColor: C.border }}>Se alle</span>
              </div>
              <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                {SAKER.map((s, i) => (
                  <div key={s.tittel} className="flex items-center gap-4 px-6 py-5" style={i > 0 ? { borderTop: `1px solid ${C.border}` } : {}}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: s.bg }}>
                      <s.Ikon className="h-5 w-5" style={{ color: s.c }} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold" style={{ color: C.text }}>{s.tittel}</p>
                      <p className="mt-0.5 text-[13px]" style={{ color: C.muted }}>{s.meta}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ color: s.stC, backgroundColor: s.stBg }}>
                      <s.StIkon className="h-3.5 w-3.5" strokeWidth={2} />{s.stTekst}
                    </span>
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.prio }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[18px] font-bold" style={{ color: C.text }}>Portefølje</h3>
                <span className="text-[13px] font-semibold underline underline-offset-4" style={{ color: C.text, textDecorationColor: C.border }}>Se alle</span>
              </div>
              <div className="space-y-4 rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                {PORTEFOLJE.map((p) => (
                  <div key={p.navn} className="flex items-center">
                    <div className="mr-3 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.farge }} />
                    <span className="flex-1 text-[15px]" style={{ color: C.sub }}>{p.navn}</span>
                    <span className="text-[16px] font-bold tabular-nums" style={{ color: C.text }}>{p.verdi}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
