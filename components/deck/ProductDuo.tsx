'use client';
/**
 * ProductDuo — investor-slide-innhold: «Én motor. To produkter.»
 *
 * Venstre (helt):  B2B forvalter-plattform (desktop) — STOR, levende mockup som
 *                  auto-veksler mellom fire ekte app-visninger, bygget 1:1 mot
 *                  den faktiske appen (AdminDashboard, OperasjonssentralPage,
 *                  AdminCalendar, AdminCases) — eksakt palett, fonter og layout.
 * Høyre (companion): B2C privat-utleier-app (mobil — Owner Portal).
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Gauge, MessageSquare, UserCheck, CalendarDays,
  Building2, FileText, AlertCircle, DollarSign, Home, Users, TrendingUp,
  Search, Bell, Wrench, ChevronRight, ChevronLeft, MapPin, Sparkles,
  Check, Clock, Filter, PenLine, Tag, ArrowUpRight, Zap,
  Circle, Timer, Pause, CheckCircle2, Droplets,
} from 'lucide-react';

/* ── fonter (lastet i denne appen) ── */
const PJ = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";        // app-body
const FH = "var(--font-heading), 'PP Right Grotesk', 'Plus Jakarta Sans', sans-serif";   // app-overskrift
/* deck-typografi (ytre etiketter) */
const F: React.CSSProperties = { fontFamily: "var(--font-body), 'ABC Diatype', sans-serif" };
const FHd: React.CSSProperties = { fontFamily: FH };

/* ── EKSAKT app-palett (fra AdminDashboard C_LIGHT) ── */
const INK = '#2d2d2d', SUB = '#8a8a8e', MUTED = '#b8b5be';
const BORDER = '#eae7ef', CARD = '#ffffff', CANVAS = '#fdfcfb', ICONBG = '#f5f4f7', HOVER = '#faf9fc';
const ACCENT = '#d298ff', ACCENT_SOFT = '#f3ebff';
const GREEN = '#6aab8e', GREEN_BG = '#eef6f2';
const BLUE = '#7da4c9';
const ROSE = '#c47e86', ROSE_BG = '#faf0f1';
const SLATE = '#8b8d94';
const INVBG = '#1a1a1a', INVSUB = 'rgba(255,255,255,0.58)';
const SIDEBAR = '#171717';

/* ── desktop-dimensjoner ── */
const DESK_W = 1000;
const SIDE_W = 202;
const CHROME_H = 34;
const BODY_H = 532;
const ease = [0.22, 1, 0.36, 1] as const;

const TABS = [
  { key: 'oversikt', label: 'Oversikt', url: 'app.digihome.no/forvalter' },
  { key: 'operasjon', label: 'Operasjonssentral', url: 'app.digihome.no/forvalter/operasjonssentral' },
  { key: 'kalender', label: 'Kalender', url: 'app.digihome.no/forvalter/kalender' },
  { key: 'saker', label: 'Saker', url: 'app.digihome.no/forvalter/saker' },
];

/* mini-sparkline (1:1 med appens Sparkline) */
function Spark({ data, color, w = 60, h = 20 }: any) {
  const min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1;
  const pts = data.map((v: number, i: number) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  const ly = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2;
  return (
    <svg width={w} height={h} className="overflow-visible" style={{ opacity: 0.6 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={ly} r={2.5} fill={color} opacity={0.85} />
    </svg>
  );
}

/* ═══════════════════════ SIDEBAR ═══════════════════════ */
function NavItem({ icon: Icon, label, on, badge, badgeColor, innerRef }: any) {
  return (
    <div ref={innerRef} className="relative flex items-center gap-2.5 mx-2 px-2.5 rounded-lg" style={{ height: 30, zIndex: 2 }}>
      <Icon className="w-[15px] h-[15px] shrink-0" style={{ color: on ? '#cf97fc' : 'rgba(255,255,255,0.46)', transition: 'color 0.45s ease' }} strokeWidth={1.9} />
      <span className="text-[11.5px] font-medium flex-1 truncate" style={{ fontFamily: PJ, color: on ? '#fff' : 'rgba(255,255,255,0.52)', transition: 'color 0.45s ease' }}>{label}</span>
      {badge && <span className="text-[7.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, background: badgeColor || 'rgba(207,151,252,0.22)', color: badgeColor ? '#fff' : '#cf97fc' }}>{badge}</span>}
    </div>
  );
}

function Sidebar({ tab }: { tab: number }) {
  const navRef = useRef<HTMLDivElement>(null);
  const rOversikt = useRef<HTMLDivElement>(null);
  const rOperasjon = useRef<HTMLDivElement>(null);
  const rKalender = useRef<HTMLDivElement>(null);
  const rSaker = useRef<HTMLDivElement>(null);
  const tabRefs = [rOversikt, rOperasjon, rKalender, rSaker];
  const [ind, setInd] = useState({ top: 0, h: 0, ready: false });

  useEffect(() => {
    const el = tabRefs[tab]?.current;
    if (el) setInd({ top: el.offsetTop, h: el.offsetHeight, ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const activeKey = TABS[tab].key;

  return (
    <div className="shrink-0 flex flex-col py-3.5" style={{ width: SIDE_W, background: SIDEBAR }}>
      <div className="px-4 mb-4 pt-0.5">
        <img src="/img/digihome-logo-white.svg" alt="DigiHome" className="h-[22px] w-auto select-none" draggable={false} />
      </div>
      <div ref={navRef} className="relative flex-1">
        <div style={{
          position: 'absolute', left: 8, right: 8, top: ind.top, height: ind.h, borderRadius: 9,
          background: 'linear-gradient(90deg, rgba(207,151,252,0.22), rgba(207,151,252,0.045))',
          transition: 'top 0.55s cubic-bezier(0.22,1,0.36,1), height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
          opacity: ind.ready ? 1 : 0, zIndex: 1,
        }}>
          <span style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 4, height: 20, borderRadius: '0 4px 4px 0', background: 'linear-gradient(to bottom,#cf97fc,#7c5cff)', boxShadow: '0 0 12px rgba(207,151,252,0.7)' }} />
        </div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] px-4 pt-1 pb-1.5" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.33)' }}>Arbeid</p>
        <NavItem innerRef={rOversikt} icon={LayoutDashboard} label="Oversikt" on={activeKey === 'oversikt'} />
        <NavItem innerRef={rOperasjon} icon={Gauge} label="Operasjonssentral" on={activeKey === 'operasjon'} badge="Ny" />
        <NavItem icon={MessageSquare} label="Innboks" on={false} />
        <NavItem icon={UserCheck} label="Leads" on={false} badge="Pro" />
        <NavItem innerRef={rKalender} icon={CalendarDays} label="Kalender" on={activeKey === 'kalender'} />
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] px-4 pt-3 pb-1.5" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.33)' }}>Drift</p>
        <NavItem icon={Building2} label="Eiendommer" on={false} />
        <NavItem icon={FileText} label="Kontrakter" on={false} />
        <NavItem innerRef={rSaker} icon={AlertCircle} label="Saker" on={activeKey === 'saker'} />
        <NavItem icon={DollarSign} label="Økonomi" on={false} />
      </div>
      <div className="mt-auto mx-2 flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0"><img src="/team/martin-kviteberg-face.jpg" alt="" className="w-full h-full object-cover" /></div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white truncate" style={{ fontFamily: PJ }}>Martin Kviteberg</p>
          <p className="text-[9px] truncate" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.45)' }}>Forvalter</p>
        </div>
      </div>
    </div>
  );
}

/* delte topptekst-bits */
function SearchBell() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px]" style={{ fontFamily: PJ, color: MUTED, background: CARD, border: `1px solid ${BORDER}` }}><Search className="w-3.5 h-3.5" />Søk…</span>
      <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}><Bell className="w-4 h-4" style={{ color: SUB }} /><span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: ROSE }} /></span>
    </div>
  );
}

/* ═══════════════════════ VISNING 1 · OVERSIKT ═══════════════════════ */
function ViewOversikt() {
  const revenue = [
    { label: 'Månedlig inntekt', value: '1,25 M', unit: 'kr', spark: [6, 7, 6, 8, 9, 8, 11], sparkC: GREEN, trend: '+12 %' },
    { label: 'Årlig estimat', value: '15,0 M', unit: 'kr', spark: [5, 6, 7, 7, 9, 10, 12], sparkC: ACCENT },
    { label: 'DigiHome-honorar', value: '125 000', unit: 'kr', spark: [3, 4, 4, 5, 5, 6, 7], sparkC: SLATE },
    { occ: true },
  ];
  const kpis = [
    { icon: Building2, value: '142', label: 'Eiendommer', live: true, spark: [6, 7, 6, 8, 9, 8, 10], sparkC: GREEN },
    { icon: Home, value: '142', label: 'Enheter', sub: '137 utleid', spark: [5, 6, 6, 7, 7, 8, 8], sparkC: BLUE },
    { icon: Users, value: '137', label: 'Leietakere', spark: [4, 5, 5, 6, 6, 7, 7], sparkC: SLATE },
    { icon: AlertCircle, value: '3', label: 'Åpne saker', alert: true, spark: [5, 4, 6, 3, 5, 4, 3], sparkC: ROSE },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: CANVAS }}>
      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[23px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: INK }}>God morgen, Martin <span style={{ fontSize: 19 }}>👋</span></h1>
          <p className="text-[12.5px] mt-1" style={{ fontFamily: PJ, color: MUTED }}>torsdag 12. juni</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12.5px] font-medium" style={{ fontFamily: PJ, color: INK, background: CARD, border: `1px solid ${BORDER}` }}>Saker <span className="min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1" style={{ background: ROSE }}>3</span></span>
          <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12.5px] font-semibold text-white" style={{ fontFamily: PJ, background: '#1a1a1a' }}><Building2 className="w-3.5 h-3.5" />Eiendommer</span>
        </div>
      </div>

      {/* revenue row (unified 4-col) */}
      <div className="grid grid-cols-4 rounded-2xl overflow-hidden mb-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        {revenue.map((r: any, i: number) => (
          <div key={i} className="px-5 py-4" style={i > 0 ? { borderLeft: `1px solid ${BORDER}` } : undefined}>
            {r.occ ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px]" style={{ fontFamily: PJ, color: SUB }}>Belegg</p>
                  <span className="text-[10.5px] font-semibold tabular-nums" style={{ fontFamily: PJ, color: SUB }}>137/142</span>
                </div>
                <p className="text-[26px] font-bold tracking-[-0.03em] tabular-nums leading-none mb-2.5" style={{ fontFamily: PJ, color: INK }}>96<span className="text-[13px] font-normal" style={{ color: MUTED }}>%</span></p>
                <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: BORDER }}><div className="h-full rounded-full" style={{ width: '96%', background: ACCENT }} /></div>
                <p className="text-[11px] mt-2" style={{ fontFamily: PJ, color: MUTED }}>137 enheter utleid</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px]" style={{ fontFamily: PJ, color: SUB }}>{r.label}</p>
                  {r.trend && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ fontFamily: PJ, color: GREEN, background: GREEN_BG }}>{r.trend}</span>}
                </div>
                <p className="text-[26px] font-bold tracking-[-0.03em] tabular-nums leading-none mb-2.5" style={{ fontFamily: PJ, color: INK }}>{r.value} <span className="text-[13px] font-normal" style={{ color: MUTED }}>{r.unit}</span></p>
                <Spark data={r.spark} color={r.sparkC} w={104} height={22} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {kpis.map((k: any) => { const Icon = k.icon; return (
          <div key={k.label} className="p-5 rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.alert ? ROSE_BG : ICONBG }}>
                <Icon className="w-[18px] h-[18px]" style={{ color: k.alert ? ROSE : SUB }} strokeWidth={1.6} />
              </div>
              {k.live ? <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: PJ, color: GREEN }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />Live</span> : <Spark data={k.spark} color={k.sparkC} w={56} height={20} />}
            </div>
            <p className="text-[26px] font-bold tracking-tight tabular-nums leading-none" style={{ fontFamily: PJ, color: INK }}>{k.value}</p>
            <p className="text-[13.5px] mt-1" style={{ fontFamily: PJ, color: SUB }}>{k.label}</p>
            {k.sub && <p className="text-[12px] font-semibold mt-0.5" style={{ fontFamily: PJ, color: GREEN }}>{k.sub}</p>}
            {k.alert && <p className="text-[12px] font-semibold mt-0.5" style={{ fontFamily: PJ, color: ROSE }}>Krever oppfølging</p>}
          </div>
        ); })}
      </div>

      {/* insight card (dark) */}
      <div className="rounded-2xl px-6 py-5 flex items-center gap-5 overflow-hidden relative" style={{ background: INVBG }}>
        <div className="absolute top-[-40%] right-[-3%] w-[260px] h-[260px] rounded-full" style={{ opacity: 0.1, background: ACCENT }} />
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.18)' }}><Sparkles className="w-6 h-6" style={{ color: ACCENT }} strokeWidth={1.5} /></div>
        <div className="flex-1 min-w-0 relative">
          <p className="text-[15px] font-semibold mb-0.5 text-white" style={{ fontFamily: PJ }}>Porteføljen presterer godt</p>
          <p className="text-[13px]" style={{ fontFamily: PJ, color: INVSUB }}>137 av 142 enheter utleid (96 %) · 1,25 M kr/mnd</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-semibold" style={{ fontFamily: PJ, background: ACCENT, color: '#1a1a1a' }}>Se detaljer <ArrowUpRight className="w-4 h-4" strokeWidth={1.8} /></span>
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING 2 · OPERASJONSSENTRAL (1:1) ═══════════════════════ */
const OC = {
  INK: '#0A0A0A', INK2: '#4A4A4A', MUTED: '#808080', HAIRLINE: '#ECE7DF', CANVAS: '#fdfcfb',
  SOFT: '#f1f0f4', SUBTLE: '#F9F9F9', LAV: '#7C3AED', BRAND: '#d298ff', GREEN: '#1d6f4b', RED: '#dc2626', ORANGE: '#ea580c',
};
const CAT: Record<string, { bg: string; fg: string }> = {
  Annonse: { bg: '#FBE5F6', fg: '#C026D3' },
  Signering: { bg: '#EFE6FC', fg: '#7C3AED' },
  Visning: { bg: '#DEF2F4', fg: '#0891B2' },
  Drift: { bg: '#E9ECF3', fg: '#4F5B6B' },
};
const PRI: Record<string, { dot: string; bg: string; label: string }> = {
  critical: { dot: OC.RED, bg: '#fef2f2', label: 'Haster' },
  high: { dot: OC.ORANGE, bg: '#fff7ed', label: 'Viktig' },
  normal: { dot: '#b8b2a8', bg: OC.SOFT, label: 'Normal' },
};
function ViewOperasjon() {
  const items = [
    { cat: 'Annonse', icon: Tag, prop: 'Kalfaret 22B', title: 'Pris bør opp 8 % → 18 200 kr', why: 'Sesongtopp i juni · Autopilot anbefaler', pri: 'high', due: 'I dag', cta: 'Godkjenn', suggested: true },
    { cat: 'Signering', icon: PenLine, prop: 'Strandgaten 44', title: 'Kontrakt klar for BankID-signering', why: 'Anna Berg har bekreftet vilkårene', pri: 'critical', due: 'I dag', cta: 'Send', urgent: true },
    { cat: 'Visning', icon: CalendarDays, prop: 'Damsgårdsveien 9', title: 'Visning bekreftet — 3 interessenter', why: 'Automatisk lagt i kalenderen', pri: 'normal', due: 'Fre 17:00', cta: 'Se' },
    { cat: 'Drift', icon: Wrench, prop: 'Nygårdsgaten 15', title: 'Sak #1042 løst automatisk', why: 'Bergen Elektro fullførte · faktura matchet', pri: 'normal', cta: 'Ferdig' },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: OC.CANVAS }}>
      {/* header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ fontFamily: PJ, color: OC.MUTED, fontWeight: 700 }}>Operasjonssentral · torsdag 12. juni</p>
          <h1 className="text-[30px] leading-[0.98]" style={{ fontFamily: FH, fontWeight: 800, letterSpacing: '-0.035em', color: OC.INK }}>Operasjonssentralen</h1>
          <p className="text-[12.5px] mt-2 flex items-center gap-1.5" style={{ fontFamily: PJ, color: OC.INK2 }}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#fef2f2', color: OC.RED, fontWeight: 700 }}>1 haster</span>
            Autopiloten håndterer driften — du godkjenner.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-medium" style={{ fontFamily: PJ, color: OC.INK2, background: '#fff', border: `1px solid ${OC.HAIRLINE}` }}><Filter className="w-3.5 h-3.5" />Filter</span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-semibold" style={{ fontFamily: PJ, color: OC.INK, background: '#fff', border: `1px solid ${OC.HAIRLINE}` }}><Sparkles className="w-3.5 h-3.5" style={{ color: OC.LAV }} />Autopilot <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ background: OC.LAV, fontWeight: 700 }}>Auto</span></span>
        </div>
      </div>

      {/* action cards */}
      <div className="flex flex-col gap-2.5 flex-1">
        {items.map((a) => {
          const Icon = a.icon; const cc = a.urgent ? { bg: '#fef2f2', fg: OC.RED } : CAT[a.cat]; const pr = PRI[a.pri];
          return (
            <div key={a.title} className="relative bg-white rounded-[20px] overflow-hidden" style={{ border: `1px solid ${a.urgent ? 'rgba(220,38,38,0.18)' : OC.HAIRLINE}`, boxShadow: '0 2px 8px rgba(10,10,10,0.03)' }}>
              {a.urgent && <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: OC.RED }} />}
              <div className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center" style={{ background: cc.bg, border: `1px solid ${OC.HAIRLINE}` }}><Icon className="w-[21px] h-[21px]" style={{ color: cc.fg }} strokeWidth={2.1} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pr.dot }} />
                    <p className="text-[10px] uppercase tracking-[0.13em] truncate" style={{ fontFamily: PJ, color: OC.MUTED, fontWeight: 700 }}>{a.cat}<span className="opacity-40"> · </span><span style={{ color: OC.INK2 }}>{a.prop}</span></p>
                  </div>
                  <p className="text-[15.5px] leading-[1.2] truncate" style={{ fontFamily: FH, fontWeight: 700, letterSpacing: '-0.01em', color: OC.INK }}>{a.title}</p>
                  {a.suggested ? (
                    <span className="inline-flex items-center gap-1.5 mt-1.5 pl-2 pr-2.5 py-1 rounded-full text-[11px]" style={{ fontFamily: PJ, background: '#FEF3E2', color: '#B45309', fontWeight: 700 }}><Sparkles className="w-3 h-3" strokeWidth={2.4} />Autopilot anbefaler nå</span>
                  ) : (
                    <p className="text-[12.5px] truncate mt-0.5" style={{ fontFamily: PJ, color: OC.MUTED }}>{a.why}</p>
                  )}
                </div>
                {a.due && <span className="hidden lg:inline-flex text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap shrink-0" style={{ fontFamily: PJ, background: pr.bg, color: pr.dot, fontWeight: 700 }}>{a.due}</span>}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: OC.MUTED }}><Clock className="w-4 h-4" strokeWidth={2.2} /></button>
                  <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: OC.GREEN, background: '#eef5f0' }}><Check className="w-[17px] h-[17px]" strokeWidth={2.4} /></button>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12.5px]" style={{ fontFamily: FH, fontWeight: 700, background: OC.BRAND, color: '#0A0A0A' }}><Zap className="w-3.5 h-3.5" strokeWidth={2.6} />{a.cta}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING 3 · KALENDER (ekte kanalfarger) ═══════════════════════ */
const CH = { airbnb: '#FF5A5F', booking: '#003580', finn: '#06BFFC', dynamic: '#7c3aed', blocked: '#94a3b8' };
function ViewKalender() {
  const weekdays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
  const startOffset = 2;
  const days = Array.from({ length: 35 }, (_, i) => i - startOffset + 1).map((d) => (d >= 1 && d <= 30 ? d : null));
  const legend = [{ l: 'Airbnb', c: CH.airbnb }, { l: 'Booking', c: CH.booking }, { l: 'FINN', c: CH.finn }, { l: 'Dynamisk', c: CH.dynamic }, { l: 'Blokkert', c: CH.blocked }];
  const bars = [
    { row: 0, start: 2, span: 4, c: CH.airbnb, l: 'Airbnb · 4 netter' },
    { row: 1, start: 0, span: 3, c: CH.dynamic, l: 'Dynamisk' },
    { row: 1, start: 4, span: 3, c: CH.finn, l: 'FINN · Anna B.' },
    { row: 2, start: 1, span: 5, c: CH.booking, l: 'Booking.com · 5 netter' },
    { row: 3, start: 3, span: 2, c: CH.blocked, l: 'Blokkert' },
    { row: 3, start: 5, span: 2, c: CH.dynamic, l: 'Dynamisk' },
    { row: 4, start: 0, span: 4, c: CH.finn, l: 'FINN · langtid' },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: CANVAS }}>
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-[27px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: INK }}>Kalender</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2.5 h-9 px-2.5 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <ChevronLeft className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-[12.5px] font-semibold" style={{ fontFamily: PJ, color: INK }}>Juni 2026</span>
            <ChevronRight className="w-4 h-4" style={{ color: MUTED }} />
          </span>
          <SearchBell />
        </div>
      </div>
      <div className="flex items-center gap-3.5 mb-3">
        {legend.map((g) => <span key={g.l} className="inline-flex items-center gap-1.5 text-[10.5px] font-medium" style={{ fontFamily: PJ, color: SUB }}><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: g.c }} />{g.l}</span>)}
      </div>
      <div className="rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {weekdays.map((w) => <div key={w} className="text-center py-2 text-[9.5px] font-bold uppercase tracking-wide" style={{ fontFamily: PJ, color: MUTED }}>{w}</div>)}
        </div>
        <div className="relative flex-1 grid grid-cols-7 grid-rows-5">
          {days.map((d, i) => (
            <div key={i} className="px-2 pt-1.5" style={{ borderRight: (i % 7 !== 6) ? `1px solid ${BORDER}` : 'none', borderBottom: (i < 28) ? `1px solid ${BORDER}` : 'none' }}>
              {d && (d === 12
                ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white tabular-nums" style={{ fontFamily: PJ, background: ACCENT }}>{d}</span>
                : <span className="text-[10.5px] font-semibold tabular-nums" style={{ fontFamily: PJ, color: SUB }}>{d}</span>)}
            </div>
          ))}
          {bars.map((b, i) => (
            <div key={i} className="absolute flex items-center px-2 rounded-md overflow-hidden" style={{ left: `calc(${(b.start / 7) * 100}% + 3px)`, width: `calc(${(b.span / 7) * 100}% - 6px)`, top: `calc(${(b.row / 5) * 100}% + 26px)`, height: 19, background: b.c, boxShadow: `0 2px 6px ${b.c}40` }}>
              <span className="text-[8.5px] font-semibold text-white truncate" style={{ fontFamily: PJ }}>{b.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING 4 · SAKER (ekte status-/typefarger) ═══════════════════════ */
const ST: Record<string, { c: string; bg: string; icon: any; label: string }> = {
  open: { c: '#2563eb', bg: '#eff6ff', icon: Circle, label: 'Åpen' },
  in_progress: { c: '#7c3aed', bg: '#f5f3ff', icon: Timer, label: 'Pågår' },
  waiting: { c: '#d97706', bg: '#fffbeb', icon: Pause, label: 'Venter' },
  resolved: { c: '#059669', bg: '#ecfdf5', icon: CheckCircle2, label: 'Løst' },
};
const TYP: Record<string, { c: string; bg: string; icon: any }> = {
  maintenance: { c: '#ea580c', bg: '#fff7ed', icon: Wrench },
  damage: { c: '#2563eb', bg: '#eff6ff', icon: Droplets },
  other: { c: '#7c3aed', bg: '#f5f3ff', icon: Zap },
};
const PRC: Record<string, { c: string; label: string }> = {
  urgent: { c: '#dc2626', label: 'Haster' }, high: { c: '#ea580c', label: 'Viktig' }, medium: { c: '#ca8a04', label: 'Middels' }, low: { c: '#9ca3af', label: 'Lav' },
};
function ViewSaker() {
  const rows = [
    { sak: 'Stekeovn defekt', typ: 'maintenance', eiendom: 'Parkveien 12A', status: 'in_progress', pri: 'high', vendor: 'Bergen Elektro', vi: '/team-sarah.webp' },
    { sak: 'Vannlekkasje bad', typ: 'damage', eiendom: 'Kalfaret 22B', status: 'open', pri: 'urgent', vendor: 'Tildeles…', vi: null },
    { sak: 'Bytte av lås', typ: 'maintenance', eiendom: 'Strandgaten 44', status: 'resolved', pri: 'medium', vendor: 'Låsservice AS', vi: '/team-martin.webp' },
    { sak: 'Maling stue', typ: 'other', eiendom: 'Nygårdsgaten 15', status: 'waiting', pri: 'low', vendor: 'Maler Bergen', vi: '/team-erik.webp' },
    { sak: 'Ventilasjonsfilter', typ: 'maintenance', eiendom: 'Vestre Torvgate 7', status: 'resolved', pri: 'low', vendor: 'DigiHome AI', vi: null, ai: true },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: CANVAS }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[27px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: INK }}>Saker</h1>
          <p className="text-[12.5px] mt-1" style={{ fontFamily: PJ, color: MUTED }}>3 åpne · 1 løst i dag</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {['Alle', 'Åpne', 'Pågår'].map((f, i) => <span key={f} className="px-3.5 h-8 flex items-center rounded-full text-[11.5px] font-semibold" style={{ fontFamily: PJ, color: i === 0 ? '#fff' : SUB, background: i === 0 ? '#1a1a1a' : 'transparent' }}>{f}</span>)}
          </div>
          <SearchBell />
        </div>
      </div>
      <div className="rounded-2xl flex-1 min-h-0 overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="grid items-center px-5 py-3" style={{ gridTemplateColumns: '1.7fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: `1px solid ${BORDER}` }}>
          {['Sak', 'Eiendom', 'Status', 'Prioritet', 'Tildelt'].map((h) => <span key={h} className="text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: MUTED }}>{h}</span>)}
        </div>
        {rows.map((r, i) => { const s = ST[r.status]; const ty = TYP[r.typ]; const pr = PRC[r.pri]; const SIcon = s.icon; const TIcon = ty.icon; return (
          <div key={r.sak} className="grid items-center px-5 py-3.5" style={{ gridTemplateColumns: '1.7fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: ty.bg }}><TIcon className="w-4 h-4" style={{ color: ty.c }} strokeWidth={1.9} /></span>
              <span className="text-[13px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>{r.sak}</span>
            </div>
            <span className="text-[12px] truncate" style={{ fontFamily: PJ, color: SUB }}>{r.eiendom}</span>
            <span><span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ fontFamily: PJ, color: s.c, background: s.bg }}><SIcon className="w-3 h-3" strokeWidth={2.2} />{s.label}</span></span>
            <span className="text-[11.5px] font-semibold" style={{ fontFamily: PJ, color: pr.c }}>{pr.label}</span>
            <div className="flex items-center gap-2 min-w-0">
              {r.vi ? <div className="w-6 h-6 rounded-full overflow-hidden shrink-0"><img src={r.vi} alt="" className="w-full h-full object-cover" /></div>
                : r.ai ? <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: ACCENT_SOFT }}><Sparkles className="w-3 h-3" style={{ color: ACCENT }} /></div>
                : <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: CANVAS, border: `1px dashed ${MUTED}` }}><Clock className="w-3 h-3" style={{ color: MUTED }} /></div>}
              <span className="text-[11.5px] truncate" style={{ fontFamily: PJ, color: r.ai ? '#7c3aed' : (r.vi ? SUB : MUTED), fontWeight: r.ai ? 600 : 400, fontStyle: (!r.vi && !r.ai) ? 'italic' : 'normal' }}>{r.vendor}</span>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}

const VIEWS = [ViewOversikt, ViewOperasjon, ViewKalender, ViewSaker];

/* ═══════════════════════ DESKTOP-MOCKUP (auto-veksler) ═══════════════════════ */
function DesktopMock({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const [tab, setTab] = useState(0);
  useEffect(() => {
    if (!active || pdfMode) { setTab(0); return; }
    const id = setInterval(() => setTab((t) => (t + 1) % TABS.length), 4400);
    return () => clearInterval(id);
  }, [active, pdfMode]);
  const View = VIEWS[tab];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ width: DESK_W, background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 54px 120px -42px rgba(26,22,18,0.5), 0 20px 54px -32px rgba(26,22,18,0.3)' }}>
      <div className="flex items-center gap-2 px-4" style={{ height: CHROME_H, background: '#f3efe9', borderBottom: `1px solid ${BORDER}` }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e2d6c6' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e9ddcd' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#efe5d6' }} />
        <div className="mx-auto flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ border: `1.5px solid ${MUTED}`, opacity: 0.6 }} />
          <AnimatePresence mode="wait">
            <motion.span key={tab} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }} transition={{ duration: 0.3 }} className="text-[10.5px] font-medium" style={{ fontFamily: PJ, color: MUTED }}>{TABS[tab].url}</motion.span>
          </AnimatePresence>
        </div>
      </div>
      <div className="flex" style={{ height: BODY_H }}>
        <Sidebar tab={tab} />
        <div className="flex-1 relative overflow-hidden" style={{ background: CANVAS }}>
          <AnimatePresence mode="sync">
            <motion.div key={tab} className="absolute inset-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease }}>
              <View />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ B2C · MOBIL (companion) ═══════════════════════ */
function PhoneMock() {
  return (
    <div className="relative rounded-[40px] p-[7px]" style={{ width: 250, background: '#0a0a0a', boxShadow: '0 56px 110px -38px rgba(26,22,18,0.6), 0 0 0 1px rgba(26,22,18,0.07)' }}>
      <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-[78px] h-[20px] rounded-b-[12px] z-20" style={{ background: '#0a0a0a' }} />
      <div className="rounded-[34px] overflow-hidden relative" style={{ background: CANVAS, height: 498 }}>
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] font-bold" style={{ fontFamily: PJ, color: INK }}>9:41</span>
          <span className="w-3.5 h-2 rounded-[2px]" style={{ border: `1px solid ${INK}`, opacity: 0.5 }} />
        </div>
        <div className="px-4 pt-1">
          <p className="text-[11px]" style={{ fontFamily: PJ, color: SUB }}>God morgen</p>
          <p className="text-[22px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: INK }}>Martin <span style={{ fontSize: 18 }}>👋</span></p>
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: '#0a0a0a' }}>
            <div className="relative" style={{ height: 92 }}>
              <img src="/bergen-houses.webp" alt="" className="w-full h-full object-cover" style={{ opacity: 0.88 }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.9), transparent 66%)' }} />
              <div className="absolute bottom-2 left-3 right-3">
                <div className="flex items-center gap-1 mb-0.5"><MapPin className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.6)' }} /><span className="text-[9px]" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.6)' }}>Bergen</span></div>
                <p className="text-[13px] font-semibold text-white tracking-tight" style={{ fontFamily: PJ }}>Camilla Colletts gate 14A</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px]" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.6)' }}>Utleid · Anna Berg</span>
              <span className="text-[12px] font-bold text-white tabular-nums" style={{ fontFamily: PJ }}>16 800 <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.55)' }}>kr/mnd</span></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div className="rounded-xl px-2.5 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: MUTED }}>Inntekt mnd</p>
              <p className="text-[14px] font-bold tabular-nums" style={{ fontFamily: PJ, color: INK }}>16 800 kr</p>
            </div>
            <div className="rounded-xl px-2.5 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: MUTED }}>Neste utbetaling</p>
              <p className="text-[14px] font-bold" style={{ fontFamily: PJ, color: INK }}>28. jun</p>
            </div>
          </div>
          <div className="mt-2.5 rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"><img src="/team-sarah.webp" alt="" className="w-full h-full object-cover" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: MUTED }}>Din forvalter</p>
              <p className="text-[12px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>Sarah Lia</p>
            </div>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: ACCENT_SOFT }}><MessageSquare className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} /></span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 pt-2 pb-3" style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${BORDER}` }}>
          {[{ i: Home, l: 'Oversikt', on: true }, { i: DollarSign, l: 'Økonomi' }, { i: Wrench, l: 'Saker' }, { i: MessageSquare, l: 'Meldinger' }].map((t) => {
            const Icon = t.i;
            return (
              <div key={t.l} className="flex flex-col items-center gap-0.5">
                <Icon className="w-[17px] h-[17px]" style={{ color: t.on ? '#7c3aed' : MUTED }} strokeWidth={t.on ? 2.2 : 1.7} />
                <span className="text-[7.5px] font-semibold" style={{ fontFamily: PJ, color: t.on ? INK : MUTED }}>{t.l}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeviceLabel({ tag, plan }: { tag: string; plan: string }) {
  return (
    <div className="text-center mt-6">
      <p className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ ...FHd, color: INK }}>{tag}</p>
      <p className="text-[11.5px] mt-1.5" style={{ ...F, color: '#8a8276' }}>{plan}</p>
    </div>
  );
}

/* ═══════════════════════ KOMPOSISJON (skala-til-fyll, venstrejustert) ═══════════════════════ */
const PHONE_DEV_H = 512;
const GAP = 26;
const PHONE_W = 246;
const STAGE_W = DESK_W + GAP + PHONE_W;
const DESK_H = CHROME_H + BODY_H;
const CAP_H = 58;
const STAGE_H = DESK_H + CAP_H;

export default function ProductDuo({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const show = active || pdfMode;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(STAGE_W);
  useEffect(() => {
    const update = () => { if (wrapRef.current) setCw(wrapRef.current.offsetWidth); };
    update();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && wrapRef.current) { ro = new ResizeObserver(update); ro.observe(wrapRef.current); }
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); if (ro) ro.disconnect(); };
  }, []);
  const scale = Math.min(1.16, cw / STAGE_W);
  const anim = (d: number) => (show && !pdfMode ? `pd-in 0.9s cubic-bezier(0.16,1,0.3,1) ${d}s both` : undefined);
  return (
    <div ref={wrapRef} className="w-full">
      <style>{`@keyframes pd-in { from { opacity:0; transform: translateY(26px); filter: blur(8px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }`}</style>
      <div style={{ height: STAGE_H * scale, position: 'relative' }}>
        <div style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', left: 0, top: 0 }}>
          <div className="flex flex-col items-center" style={{ position: 'absolute', left: 0, top: 0, width: DESK_W, animation: anim(0.1), opacity: show ? undefined : 0, zIndex: 10 }}>
            <DesktopMock active={active} pdfMode={pdfMode} />
            <DeviceLabel tag="B2B · Forvalter-plattform" plan="For profesjonelle forvaltere · Pro / Enterprise" />
          </div>
          <div className="flex flex-col items-center" style={{ position: 'absolute', right: 0, top: DESK_H - PHONE_DEV_H, width: PHONE_W, animation: anim(0.3), opacity: show ? undefined : 0, zIndex: 30 }}>
            <PhoneMock />
            <DeviceLabel tag="B2C · Privat-utleier-app" plan="For private utleiere · Gratis / Essential" />
          </div>
        </div>
      </div>
    </div>
  );
}
