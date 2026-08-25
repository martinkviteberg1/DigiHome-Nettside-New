import React, { useEffect, useState } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import {
  LayoutDashboard, Gauge, MessageSquare, ClipboardList, CalendarDays, Radio,
  ClipboardCheck, Bot, Building2, Rocket, FileText, FileSignature, AlertCircle,
  Users, Wrench, BookOpen, Wand2, PieChart, ScrollText, TrendingUp, DollarSign,
  Search, PanelLeftClose, ChevronDown, Sparkles, ArrowUpRight, Home,
  Droplets, HelpCircle, Timer, Circle, Clock, ChevronLeft, ChevronRight, Plus,
  LayoutGrid, Filter, Lock, ArrowLeft, KeyRound, Wallet, Camera, Mail, Phone, BedDouble,
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

export default function ForvalterFullskjerm({ vis = true, modul = 'oversikt' }: { vis?: boolean; modul?: 'oversikt' | 'kalender' | 'enhet' }) {
  // Aktiv modul i sidemenyen — portalen «navigerer selv» i presentasjonen
  // ('enhet' er enkeltvisningen inne i kalendermodulen, som i appen)
  const aktivNavn = modul === 'oversikt' ? 'Oversikt' : 'Kalender';
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
    <div className={`${jakarta.className} relative flex overflow-hidden`} style={{ width: 1600, height: 1000, backgroundColor: C.bg }}>
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
            const erAktiv = item.navn === aktivNavn;
            return (
              <div
                key={item.navn}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-500 ${erAktiv ? 'text-white' : 'text-white/50'}`}
              >
                {/* Aktiv-bakgrunn og indikator — alltid montert, toner inn/ut */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-[#cf97fc]/[0.20] to-[#cf97fc]/[0.04] transition-opacity duration-500"
                  style={{ opacity: erAktiv ? 1 : 0 }}
                />
                <span
                  className="absolute left-0 top-1/2 h-6 w-[4px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#cf97fc] to-[#7c5cff] shadow-[0_0_12px_rgba(207,151,252,0.65)] transition-opacity duration-500"
                  style={{ opacity: erAktiv ? 1 : 0 }}
                />
                <Ikon
                  className={`relative h-[18px] w-[18px] shrink-0 transition-colors duration-500 ${erAktiv ? 'text-[#cf97fc]' : 'text-white/55'}`}
                  strokeWidth={erAktiv ? 2.2 : 1.6}
                />
                <span className="relative truncate">{item.navn}</span>
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

      {/* ═══ HOVEDFLATE — bytter mykt mellom Oversikt og Kalender ═══ */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {/* ── OVERSIKT (dashbordet, eksakt som AdminDashboard) ── */}
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ opacity: modul === 'oversikt' ? 1 : 0, transform: modul === 'oversikt' ? 'translateY(0)' : 'translateY(-24px)' }}
        >
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

        {/* ── KALENDER — portalen navigerer selv hit etter chatten ── */}
        <div
          className="absolute inset-0 transition-[opacity,transform] duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: modul !== 'oversikt' ? 1 : 0,
            transform: modul !== 'oversikt' ? 'translateY(0)' : 'translateY(28px)',
            transitionDelay: modul !== 'oversikt' ? '200ms' : '0ms',
          }}
        >
          <KalenderVisning aktiv={modul !== 'oversikt'} />
        </div>
      </div>

      {/* ── ENHETEN — Eiendommer › Marken 8 › Leilighet 2 (detaljvisning).
          Dekker hele appen inkl. sidebar, akkurat som i appen der enheten
          får sin egen kontekstuelle venstre-rail ── */}
      <div
        className="absolute inset-0 z-20 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          opacity: modul === 'enhet' ? 1 : 0,
          transform: modul === 'enhet' ? 'scale(1)' : 'scale(1.015)',
          pointerEvents: 'none',
          transitionDelay: modul === 'enhet' ? '150ms' : '0ms',
        }}
      >
        <EnhetDetalj aktiv={modul === 'enhet'} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KalenderVisning — 1:1-replika av den faktiske kalendermodulen
// (AdminCalendar.tsx, multi-visning): Airbnb-aktig tidslinje der radene er
// enheter og kolonnene dager. Solide event-pills (korttidsbooking #FF385C,
// langtidsleie #6366f1, sperret #484848, vedlikehold beige), lilla
// «i dag»-pille (#7c3aed), hårfine rutenettlinjer og priser i cellene.
// Mål og typografi er hentet direkte fra appen: COL 76 · ROW 80 · SIDE 280.
// ═══════════════════════════════════════════════════════════════════════════

const KCOL = 76;   // kolonnebredde (én dag) — MULTI_COL i appen
const KROW = 80;   // radhøyde — MULTI_ROW i appen
const KSIDE = 280; // enhetskolonnen — SIDE i appen

// Februar 2026: 4.–21. — «i dag» er tirsdag 10. (indeks 6)
const KUKEDAG = ['On', 'To', 'Fr', 'Lø', 'Sø', 'Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø', 'Ma', 'Ti', 'On', 'To', 'Fr', 'Lø'];
const KDATO = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const K_IDAG = 6;
const K_DAGER = KDATO.length;
const kHelg = (i: number) => KUKEDAG[i] === 'Lø' || KUKEDAG[i] === 'Sø';
const kMandag = (i: number) => KUKEDAG[i] === 'Ma';

// Kanal-avatarer — som SRC-fallback i appen (farget sirkel + initial)
const KILDE: Record<string, { farge: string; bokstav: string }> = {
  A: { farge: '#FF5A5F', bokstav: 'A' },  // Airbnb
  B: { farge: '#003580', bokstav: 'B' },  // Booking.com
  D: { farge: '#1a1a1a', bokstav: 'D' },  // Direkte
};

type KBar = {
  type: 'booking' | 'lease' | 'block' | 'maint';
  fra: number; len: number; tittel: string;
  kilde?: string; netter?: number; pris?: string;
  rl?: number; rr?: number; // turnover-hjørner (4px der bookinger møtes)
};
type KEnhet = { navn: string; omraade: string; modell: 'KT' | 'LT'; pris?: number; barer: KBar[] };

const KENHETER: KEnhet[] = [
  { navn: 'Marken 8 · Leilighet 2', omraade: 'Bergenhus', modell: 'KT', pris: 1850, barer: [
    { type: 'booking', fra: 0, len: 4, tittel: 'Emma Berger', kilde: 'A', netter: 4, pris: '7 400 kr', rr: 4 },
    { type: 'booking', fra: 4, len: 5, tittel: 'Jonas Müller', kilde: 'B', netter: 5, pris: '9 250 kr', rl: 4 },
    { type: 'booking', fra: 11, len: 5, tittel: 'Claire Dubois', kilde: 'A', netter: 5, pris: '9 250 kr' },
  ] },
  { navn: 'Nygård 12 · H0301', omraade: 'Årstad', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 18, tittel: 'Sofie Hansen', pris: '18 500 kr/m' },
  ] },
  { navn: 'Skuteviken 5 · Sjøbod', omraade: 'Bergenhus', modell: 'KT', pris: 2400, barer: [
    { type: 'booking', fra: 1, len: 3, tittel: 'Liam Carter', kilde: 'A', netter: 3, pris: '7 200 kr' },
    { type: 'maint', fra: 5, len: 2, tittel: 'Rørlegger · bad' },
    { type: 'booking', fra: 8, len: 5, tittel: 'Nora Vik', kilde: 'B', netter: 5, pris: '12 000 kr' },
  ] },
  { navn: 'Kong Oscars gt. 21', omraade: 'Bergenhus', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 18, tittel: 'Martin Solheim', pris: '16 900 kr/m' },
  ] },
  { navn: 'Møhlenpris 3 · Studio', omraade: 'Årstad', modell: 'KT', pris: 1450, barer: [
    { type: 'booking', fra: 2, len: 4, tittel: 'Yuki Tanaka', kilde: 'B', netter: 4, pris: '5 800 kr' },
    { type: 'booking', fra: 7, len: 3, tittel: 'Ida Strøm', kilde: 'A', netter: 3, pris: '4 350 kr' },
    { type: 'block', fra: 12, len: 4, tittel: 'Eier · privat bruk' },
  ] },
  { navn: 'Sandviken 44 · H0102', omraade: 'Bergenhus', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 18, tittel: 'Anna Ruud', pris: '21 000 kr/m' },
  ] },
  { navn: 'Løvstakkveien 7 · H0203', omraade: 'Årstad', modell: 'KT', pris: 1650, barer: [
    { type: 'booking', fra: 0, len: 3, tittel: 'Piotr Nowak', kilde: 'A', netter: 3, pris: '4 950 kr' },
    { type: 'booking', fra: 5, len: 4, tittel: 'Sara Lie', kilde: 'A', netter: 4, pris: '6 600 kr' },
    { type: 'booking', fra: 13, len: 4, tittel: 'Direktebooking', kilde: 'D', netter: 4, pris: '6 600 kr' },
  ] },
  { navn: 'Strandgaten 19 · Loft', omraade: 'Bergenhus', modell: 'KT', pris: 2100, barer: [
    { type: 'booking', fra: 3, len: 5, tittel: 'María García', kilde: 'B', netter: 5, pris: '10 500 kr' },
    { type: 'booking', fra: 10, len: 4, tittel: 'Erik Dahl', kilde: 'A', netter: 4, pris: '8 400 kr' },
  ] },
  { navn: 'Fjellsiden 2 · H0401', omraade: 'Bergenhus', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 18, tittel: 'Kristoffer Aase', pris: '19 800 kr/m' },
  ] },
  { navn: 'Nordnes 14 · H0201', omraade: 'Bergenhus', modell: 'KT', pris: 1950, barer: [
    { type: 'maint', fra: 1, len: 2, tittel: 'Ventilasjon · service' },
    { type: 'booking', fra: 4, len: 5, tittel: 'Hannah Schmidt', kilde: 'A', netter: 5, pris: '9 750 kr' },
    { type: 'booking', fra: 11, len: 4, tittel: 'Ola Berg', kilde: 'B', netter: 4, pris: '7 800 kr' },
  ] },
  { navn: 'Lille Øvregate 6', omraade: 'Bergenhus', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 18, tittel: 'Mia Torgersen', pris: '17 400 kr/m' },
  ] },
];

// Bar-fyll per type — DigiHome-paletten fra portalen: lilla korttid,
// sort langtidsleie (som primærknappene), nøytral grå drift/sperring
const KBAR_STIL: Record<string, React.CSSProperties> = {
  booking: { backgroundColor: '#7c3aed', color: '#ffffff' },
  lease: { backgroundColor: '#1a1a1a', color: '#ffffff' },
  block: {
    backgroundColor: '#52525b', color: '#ffffff',
    backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.08) 5px 6px)',
  },
  maint: { backgroundColor: '#f1f0f4', color: '#52525b' },
};

function KalenderMulti({ aktiv, nyBooking }: { aktiv: boolean; nyBooking: boolean }) {
  const inn = (delay: number): React.CSSProperties => ({
    opacity: aktiv ? 1 : 0,
    transform: aktiv ? 'translateY(0)' : 'translateY(10px)',
    transition: `opacity 650ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 650ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* ── HEADER (60px) — segmentkontroll · enhetsvelger · nav · søk · filter ── */}
      <div
        className="flex shrink-0 items-center gap-3 px-6"
        style={{ height: 60, borderBottom: '1px solid #f2f2f2', backgroundColor: '#ffffff', ...inn(180) }}
      >
        <div className="flex shrink-0 items-center rounded-full p-0.5" style={{ backgroundColor: '#fafafa', border: '1px solid #ebebeb' }}>
          <span className="flex h-[30px] items-center rounded-full px-3.5 text-[12.5px] font-semibold tracking-[-0.005em]" style={{ backgroundColor: '#ffffff', color: '#222222', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>Kalender</span>
          <span className="flex h-[30px] items-center rounded-full px-3.5 text-[12.5px] font-semibold tracking-[-0.005em]" style={{ color: '#717171' }}>Perioder</span>
        </div>
        <span className="flex h-9 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3" style={{ border: '1px solid #ebebeb', backgroundColor: '#ffffff' }}>
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
            <LayoutGrid className="h-3 w-3 text-white" />
          </span>
          <span className="text-[12.5px] font-semibold tracking-[-0.005em]" style={{ color: '#222222' }}>Alle boliger</span>
          <ChevronDown className="h-3 w-3" style={{ color: '#717171' }} strokeWidth={2.4} />
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full" style={{ color: '#717171' }}>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <span className="flex h-[30px] items-center rounded-full px-3.5 text-[12px] font-semibold" style={{ border: '1px solid #ebebeb', backgroundColor: '#ffffff', color: '#222222' }}>I dag</span>
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full" style={{ color: '#717171' }}>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
        </div>
        <div className="flex-1" />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ color: '#717171' }}>
          <Search className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold" style={{ color: '#717171' }}>
          <Filter className="h-3.5 w-3.5" strokeWidth={2.2} />
          Filter
        </span>
      </div>

      {/* ── GRID-HEADER (58px) — månedslabel i enhetskolonnen + dagstripe ── */}
      <div className="flex shrink-0" style={inn(280)}>
        <div className="flex shrink-0 items-center" style={{ width: KSIDE, height: 58, borderRight: '1px solid #f2f2f2', borderBottom: '1px solid #f2f2f2', backgroundColor: '#ffffff' }}>
          <div className="px-5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[17px] font-bold capitalize leading-none tracking-[-0.02em]" style={{ color: '#222222' }}>februar</h2>
              <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: '#9b9b9b' }}>2026</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: '#10b981' }} />
              <p className="text-[10px] font-medium tabular-nums" style={{ color: '#9b9b9b' }}>11 enheter</p>
            </div>
          </div>
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden" style={{ height: 58, borderBottom: '1px solid #f2f2f2', backgroundColor: '#ffffff' }}>
          <div className="absolute bottom-0 left-0 flex" style={{ height: 38 }}>
            {KDATO.map((dato, i) => (
              <div key={i} className="flex shrink-0 flex-col items-center justify-center" style={{ width: KCOL, boxShadow: kMandag(i) ? 'inset 1px 0 0 #f2f2f2' : undefined }}>
                {i === K_IDAG ? (
                  <span className="flex items-baseline gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: '#7c3aed', boxShadow: '0 1px 3px rgba(124,58,237,0.22)' }}>
                    <span className="text-[10.5px] font-semibold leading-none tracking-[-0.01em] text-white">{KUKEDAG[i]}</span>
                    <span className="text-[14px] font-bold leading-none tabular-nums tracking-[-0.02em] text-white">{dato}</span>
                  </span>
                ) : (
                  <>
                    <span className="text-[10px] font-medium leading-none tracking-[-0.005em]" style={{ color: '#9b9b9b' }}>{KUKEDAG[i]}</span>
                    <span className="mt-1 text-[15px] font-semibold leading-tight tabular-nums tracking-[-0.02em]" style={{ color: kHelg(i) ? '#717171' : '#222222' }}>{dato}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RADENE — enheter til venstre, dagsceller + event-pills til høyre ── */}
      <div className="relative flex-1 overflow-hidden">
        {KENHETER.map((u, ri) => (
          <div
            key={u.navn}
            className="flex"
            style={{
              height: KROW,
              borderBottom: '1px solid rgba(0,0,0,0.04)',
              opacity: aktiv ? 1 : 0,
              transform: aktiv ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 600ms cubic-bezier(0.22,1,0.36,1) ${340 + ri * 40}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${340 + ri * 40}ms`,
            }}
          >
            {/* Enhetskolonnen (sticky-siden i appen) */}
            <div className="flex shrink-0 items-center gap-2.5 bg-white pl-2 pr-3" style={{ width: KSIDE, borderRight: '1px solid rgba(0,0,0,0.05)' }}>
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] text-[12px] font-bold"
                style={{ background: 'linear-gradient(135deg, #f5f4f7, #ecebef)', color: '#717171', boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)' }}
              >
                {u.navn.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold leading-[1.3] tracking-[-0.005em]" style={{ color: '#222222' }}>{u.navn}</p>
                <div className="mt-[2px] flex items-center gap-1.5">
                  <p className="truncate text-[11.5px] leading-tight" style={{ color: '#717171' }}>{u.omraade}</p>
                  <span
                    className="flex h-[15px] shrink-0 items-center rounded-[3px] px-1.5 text-[9px] font-bold leading-none tracking-[0.03em] text-white"
                    style={{ backgroundColor: u.modell === 'KT' ? '#7c3aed' : '#1a1a1a' }}
                  >
                    {u.modell}
                  </span>
                </div>
              </div>
            </div>

            {/* Dagscellene */}
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div className="absolute inset-0 flex">
                {KDATO.map((_, i) => (
                  <div
                    key={i}
                    className="relative shrink-0"
                    style={{
                      width: KCOL,
                      backgroundColor: i < K_IDAG ? '#fafafa' : kHelg(i) ? '#f8f6fc' : 'transparent',
                      boxShadow: kMandag(i) ? 'inset 1px 0 0 #f2f2f2' : undefined,
                    }}
                  >
                    {u.pris && (
                      <div className="absolute bottom-[6px] left-0 right-0 flex justify-center opacity-[0.55]">
                        <span className="text-[10px] font-medium leading-none tabular-nums tracking-[-0.01em]" style={{ color: '#9b9b9b' }}>
                          {kr(u.pris)}<span className="ml-[1px] text-[9px]">kr</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Event-pills — Airbnb-stil: solide flater, hvit tekst */}
              {u.barer.map((b, bi) => {
                const bred = b.len >= 3;
                const rundL = b.rl ?? (b.type === 'booking' || b.type === 'lease' ? 999 : 8);
                const rundR = b.rr ?? (b.type === 'booking' || b.type === 'lease' ? 999 : 8);
                const kilde = b.kilde ? KILDE[b.kilde] : null;
                return (
                  <div
                    key={bi}
                    className="absolute"
                    style={{
                      left: b.fra * KCOL + 2, width: b.len * KCOL - 4, top: 18, height: 42,
                      borderRadius: `${rundL}px ${rundR}px ${rundR}px ${rundL}px`,
                      zIndex: 2,
                      ...KBAR_STIL[b.type],
                    }}
                  >
                    {(b.type === 'block' || b.type === 'maint') ? (
                      <div className="flex h-full w-full items-center gap-1.5 overflow-hidden px-3" style={{ borderRadius: 'inherit' }}>
                        {b.type === 'maint'
                          ? <Wrench className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.2} />
                          : <Lock className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.2} />}
                        <span className="truncate text-[10.5px] font-semibold tracking-[-0.005em]">{b.tittel}</span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full min-w-0 items-center gap-2 overflow-hidden px-2.5" style={{ borderRadius: 'inherit' }}>
                        {kilde ? (
                          <span
                            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold leading-none tracking-[-0.01em] text-white"
                            style={{ backgroundColor: kilde.farge, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9)' }}
                          >
                            {kilde.bokstav}
                          </span>
                        ) : (
                          <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-current opacity-70" />
                        )}
                        <span className="flex-1 truncate text-[12px] font-semibold leading-none tracking-[-0.01em]">{b.tittel}</span>
                        {bred && (
                          <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-semibold tabular-nums tracking-[-0.005em] opacity-80">
                            {b.netter !== undefined && <><span aria-hidden="true" className="opacity-70">◐</span>{b.netter}</>}
                            {b.pris && (
                              <span className={b.netter !== undefined ? 'ml-1.5 border-l border-white/25 pl-1.5' : ''}>{b.pris}</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* KALENDER-LIV: ny helgebooking glir inn mens publikum ser på —
                  fyller hullet 13.–15. feb på Marken 8 (rad 1) med myk pop
                  og to pulsringer, som en kanal-sync som lander live */}
              {ri === 0 && (
                <div
                  className="absolute"
                  style={{
                    left: 9 * KCOL + 2, width: 2 * KCOL - 4, top: 18, height: 42,
                    borderRadius: 999, backgroundColor: '#7c3aed', color: '#ffffff',
                    zIndex: 3, transformOrigin: 'left center',
                    opacity: nyBooking ? 1 : 0,
                    animation: nyBooking
                      ? 'dhBookPop 0.75s cubic-bezier(0.2, 0.9, 0.3, 1.35) both, dhBookRing 1.5s ease-out 0.55s 2'
                      : 'none',
                  }}
                  data-testid="bu-ny-booking"
                >
                  <div className="flex h-full w-full min-w-0 items-center gap-2 overflow-hidden px-2.5" style={{ borderRadius: 'inherit' }}>
                    <span
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold leading-none tracking-[-0.01em] text-white"
                      style={{ backgroundColor: '#FF5A5F', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9)' }}
                    >
                      A
                    </span>
                    <span className="flex-1 truncate text-[12px] font-semibold leading-none tracking-[-0.01em]">Nina Holm</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* «I dag»-kolonnen — tynn lilla ring gjennom hele rutenettet */}
        <div
          className="pointer-events-none absolute bottom-0 top-0"
          style={{
            left: KSIDE + K_IDAG * KCOL, width: KCOL, zIndex: 1,
            boxShadow: 'inset 1px 0 0 rgba(124,58,237,0.18), inset -1px 0 0 rgba(124,58,237,0.18)',
            opacity: aktiv ? 1 : 0, transition: 'opacity 600ms ease 500ms',
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// KalenderVisning — multi-tidslinjen med «kalender-liv»: den nye bookingen
// (Nina Holm) trigges 3,4 s etter at kalenderen er aktiv, med myk pop og
// pulsringer i DigiHome-lilla.
// ═══════════════════════════════════════════════════════════════════════════

function KalenderVisning({ aktiv }: { aktiv: boolean }) {
  const [nyBooking, setNyBooking] = useState(false);
  useEffect(() => {
    if (!aktiv) { setNyBooking(false); return undefined; }
    const t = setTimeout(() => setNyBooking(true), 3400);
    return () => clearTimeout(t);
  }, [aktiv]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      <KalenderMulti aktiv={aktiv} nyBooking={nyBooking} />
      <style>{`
        @keyframes dhBookPop {
          0% { opacity: 0; transform: scaleX(0.3) scaleY(0.65); }
          55% { opacity: 1; }
          75% { transform: scaleX(1.03) scaleY(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes dhBookRing {
          0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          100% { box-shadow: 0 0 0 16px rgba(124,58,237,0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EnhetDetalj — 1:1-replika av appens enhetsside (Eiendommer › Marken 8 ›
// Leilighet 2, «Stedet»-fanen): egen kontekstuell venstre-rail (260px, varm
// palett #fdfcfb), foto-mosaikk (1 stor + 2×2), tittelblokk med status-pill,
// «Om boligen», soverom-kort og eier-kort i høyre rail — mål, farger og
// typografi hentet direkte fra AdminUnitDetail/StedetTab/UnitContextSidebar.
// ═══════════════════════════════════════════════════════════════════════════

const ENHET_FOTO = {
  stue: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200',
  soverom: 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
  kjokken: 'https://images.pexels.com/photos/19980206/pexels-photo-19980206.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  bad: 'https://images.unsplash.com/photo-1631048499052-e6d9f305d2c0?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
  spisestue: 'https://images.unsplash.com/photo-1747336754870-ca7b10cc75f5?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
};

const ENHET_FANER = [
  { navn: 'Stedet', Ikon: Home, aktiv: true },
  { navn: 'Utleie', Ikon: KeyRound, aktiv: false },
  { navn: 'Saker', Ikon: Wrench, aktiv: false },
  { navn: 'Meldinger', Ikon: MessageSquare, aktiv: false },
  { navn: 'Kalender', Ikon: CalendarDays, aktiv: false },
  { navn: 'Økonomi', Ikon: Wallet, aktiv: false },
  { navn: 'Dokumenter', Ikon: FileText, aktiv: false },
];

function EnhetDetalj({ aktiv }: { aktiv: boolean }) {
  const inn = (delay: number): React.CSSProperties => ({
    opacity: aktiv ? 1 : 0,
    transform: aktiv ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: '#fdfcfb' }}>
      {/* ── KONTEKSTUELL VENSTRE-RAIL (UnitContextSidebar) ── */}
      <aside className="flex shrink-0 flex-col" style={{ width: 260, borderRight: '1px solid rgba(236,232,225,0.6)', backgroundColor: '#fdfcfb', ...inn(80) }}>
        <div className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#8d867b' }}>
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Marken 8
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#6e6357' }}>Enhet</p>
          <h2 className="mt-1 text-[15px] font-bold leading-tight tracking-tight" style={{ color: '#1a1a1a' }}>Leilighet 2</h2>
          <p className="mt-0.5 text-[11.5px]" style={{ color: '#8d867b' }}>Marken 8, 5017 Bergen</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {ENHET_FANER.map((f) => (
            <span
              key={f.navn}
              className="flex items-center gap-2.5 rounded-xl px-3 py-[9px] text-[13px] font-semibold tracking-[-0.005em]"
              style={f.aktiv ? { backgroundColor: '#1a1a1a', color: '#ffffff', boxShadow: '0 4px 14px rgba(17,17,17,0.18)' } : { color: '#6e6357' }}
            >
              <f.Ikon className="h-[15px] w-[15px]" strokeWidth={1.7} style={{ color: f.aktiv ? '#ffffff' : '#a8a092' }} />
              {f.navn}
            </span>
          ))}
        </nav>
        <div className="mt-auto px-5 pb-6">
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: '#a8a092' }}>Andre enheter</p>
          {['Leilighet 1', 'Leilighet 3'].map((navn) => (
            <p key={navn} className="flex items-center gap-2 py-1 text-[12.5px] font-medium" style={{ color: '#6e6357' }}>
              <span className="text-[13px]" style={{ color: '#c4baa8' }}>↳</span> {navn}
            </p>
          ))}
        </div>
      </aside>

      {/* ── HOVEDINNHOLD (StedetTab) ── */}
      <div className="min-w-0 flex-1 overflow-hidden px-10 pt-6">
        {/* Breadcrumb + status */}
        <div className="flex items-center justify-between" style={inn(160)}>
          <p className="text-[12.5px]" style={{ color: '#8d867b' }}>
            Eiendommer <span className="mx-1.5" style={{ color: '#c4baa8' }}>›</span> Marken 8 <span className="mx-1.5" style={{ color: '#c4baa8' }}>›</span>
            <span className="font-semibold" style={{ color: '#1a1a1a' }}>Leilighet 2</span>
          </p>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold" style={{ backgroundColor: '#f5f0fc', color: '#6d28d9', border: '1px solid #e6d9f7' }}>
            <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#7c3aed' }} />
            Live · FINN + 2 kanaler
          </span>
        </div>

        {/* Foto-mosaikk — 1 stor + 2×2, som appen */}
        <div className="relative mt-4 grid h-[330px] grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl" style={inn(260)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ENHET_FOTO.stue} alt="Stue" className="col-span-2 row-span-2 h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ENHET_FOTO.kjokken} alt="Kjøkken" className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ENHET_FOTO.soverom} alt="Soverom" className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ENHET_FOTO.spisestue} alt="Spisestue" className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ENHET_FOTO.bad} alt="Bad" className="h-full w-full object-cover" />
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11.5px] font-semibold" style={{ color: '#1a1a1a', boxShadow: '0 4px 14px rgba(17,17,17,0.14)' }}>
            <Camera className="h-3.5 w-3.5" strokeWidth={1.8} />
            Vis alle 14 bilder
          </span>
        </div>

        {/* Tittel + innhold i 12-kolonners grid */}
        <div className="mt-6 grid grid-cols-12 gap-8">
          <div className="col-span-8" style={inn(380)}>
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em]" style={{ color: '#1a1a1a' }}>Leilighet 2 · 2. etasje</h1>
            <p className="mt-1.5 text-[13.5px]" style={{ color: '#6e6357' }}>Leilighet · 64 m² · 2 soverom · 3 senger · 1 bad</p>

            <div className="mt-6 border-t pt-5" style={{ borderColor: '#f1ede7' }}>
              <h3 className="text-[18px] font-bold tracking-tight" style={{ color: '#1a1a1a' }}>Om boligen</h3>
              <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.75]" style={{ color: '#4a453d' }}>
                Lys og gjennomgående toroms midt i Marken — Bergens mest sjarmerende smau.
                Originale tregulv, høye vinduer og nyoppusset kjøkken. Gangavstand til
                Bryggen, Fisketorget og Bybanen. Leiligheten driftes på korttid med
                automatisk kanalsynk, prising og gjestekommunikasjon.
              </p>
            </div>

            <div className="mt-6 border-t pt-5" style={{ borderColor: '#f1ede7' }}>
              <h3 className="text-[18px] font-bold tracking-tight" style={{ color: '#1a1a1a' }}>Hvor du sover</h3>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { navn: 'Soverom 1', seng: '1 dobbeltseng' },
                  { navn: 'Soverom 2', seng: '2 enkeltsenger' },
                ].map((r) => (
                  <div key={r.navn} className="rounded-xl border bg-white p-4" style={{ borderColor: '#ebebeb' }}>
                    <BedDouble className="h-5 w-5" strokeWidth={1.6} style={{ color: '#1a1a1a' }} />
                    <p className="mt-2.5 text-[13.5px] font-semibold" style={{ color: '#1a1a1a' }}>{r.navn}</p>
                    <p className="mt-0.5 text-[12px]" style={{ color: '#8a8276' }}>{r.seng}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Høyre rail — Personer */}
          <div className="col-span-4" style={inn(480)}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#a8a092' }}>Personer</p>
            <div className="mt-3 rounded-[20px] border bg-white p-5" style={{ borderColor: '#e8e4dd', boxShadow: '0 4px 18px rgba(17,17,17,0.035)' }}>
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #b8a88f, #96866d)' }}>KN</span>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: '#a8a092' }}>Eier</p>
                  <p className="text-[16px] font-bold leading-[1.15] tracking-tight" style={{ color: '#1a1a1a' }}>Kari Nordvik</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#18794E', boxShadow: '0 0 0 2px rgba(24,121,78,0.15)' }} />
                    <span className="text-[11.5px] font-medium" style={{ color: '#3d6b54' }}>Aktiv forvaltningsavtale</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: '#f1ede7' }}>
                <p className="flex items-center gap-2.5 text-[12.5px]" style={{ color: '#4a453d' }}>
                  <Mail className="h-[15px] w-[15px] shrink-0" strokeWidth={1.6} style={{ color: '#c0b7a6' }} />
                  kari@nordvikeiendom.no
                </p>
                <p className="flex items-center gap-2.5 text-[12.5px] tabular-nums" style={{ color: '#4a453d' }}>
                  <Phone className="h-[15px] w-[15px] shrink-0" strokeWidth={1.6} style={{ color: '#c0b7a6' }} />
                  +47 934 12 880
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border bg-white p-5" style={{ borderColor: '#e8e4dd', boxShadow: '0 4px 18px rgba(17,17,17,0.035)' }}>
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold" style={{ backgroundColor: '#f5f0fc', color: '#6d28d9' }}>NH</span>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: '#a8a092' }}>Neste gjest</p>
                  <p className="text-[16px] font-bold leading-[1.15] tracking-tight" style={{ color: '#1a1a1a' }}>Nina Holm</p>
                  <p className="mt-0.5 text-[11.5px]" style={{ color: '#8a8276' }}>13.–15. feb · 2 netter · Airbnb</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
