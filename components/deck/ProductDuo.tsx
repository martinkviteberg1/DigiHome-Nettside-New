'use client';
/**
 * ProductDuo — investor-slide: «Én motor. To produkter.»
 *
 * Mørk premium-versjon av den ekte DigiHome-appen.
 * Desktop (B2B forvalter) auto-veksler mellom fire visninger:
 *   Autopilot (Operasjonssentral) → Oversikt → Kalender → Saker.
 * Mobil (B2C privat-utleier) som flytende companion.
 *
 * Bygget mot den faktiske appen (AdminLayout/OperasjonssentralPage),
 * men i en mørk, kinematisk drakt — ingen nettleser-chrome.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Gauge, MessageSquare, UserCheck, CalendarDays, CalendarCheck,
  Radio, ClipboardList, Bot, Building2, Building, Rocket, ScrollText, FileText,
  AlertCircle, Shield, DollarSign, Home, Users, Search, Bell, Wrench,
  ChevronRight, ChevronLeft, MapPin, Sparkles, Check, Clock, Filter, History,
  RefreshCw, Wallet, ArrowUpRight, Zap, Circle, Timer, Pause, CheckCircle2, Droplets,
} from 'lucide-react';

/* ── fonter (lastet i appen) ── */
const PJ = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const FH = "var(--font-heading), 'PP Right Grotesk', 'Plus Jakarta Sans', sans-serif";
const F: React.CSSProperties = { fontFamily: "var(--font-body), 'ABC Diatype', sans-serif" };
const FHd: React.CSSProperties = { fontFamily: FH };

/* ── MØRK PREMIUM-TEMA ── */
const D = {
  bg: '#0e0e11', side: '#08080a', card: '#161619', cardSoft: '#121215',
  border: 'rgba(255,255,255,0.075)', borderS: 'rgba(255,255,255,0.12)',
  txt: '#f4f4f6', sub: 'rgba(255,255,255,0.56)', muted: 'rgba(255,255,255,0.34)', faint: 'rgba(255,255,255,0.20)',
  icon: 'rgba(255,255,255,0.06)', accent: '#cf97fc', accentDim: 'rgba(207,151,252,0.15)',
};
const CARD = '#16161a';
const GREEN = '#5fcf98', BLUE = '#7db4e6', ROSE = '#e08a9a', AMBER = '#e0b060', SLATE = '#9aa3b2';

/* ── desktop-dimensjoner (uten chrome) ── */
const DESK_W = 1010;
const SIDE_W = 210;
const BODY_H = 600;
const ease = [0.22, 1, 0.36, 1] as const;

const TABS = [
  { key: 'operasjon', label: 'Operasjonssentral' },
  { key: 'oversikt', label: 'Oversikt' },
  { key: 'kalender', label: 'Kalender' },
  { key: 'saker', label: 'Saker' },
];

/* mini-sparkline */
function Spark({ data, color, w = 60, h = 20 }: any) {
  const min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1;
  const pts = data.map((v: number, i: number) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  const ly = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2;
  return (
    <svg width={w} height={h} className="overflow-visible" style={{ opacity: 0.85 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

/* ═══════════════════════ SIDEBAR ═══════════════════════ */
function NavItem({ icon: Icon, label, on, badge, badgeColor, innerRef }: any) {
  return (
    <div ref={innerRef} className="relative flex items-center gap-2.5 mx-2.5 px-2.5 rounded-lg" style={{ height: 29, zIndex: 2 }}>
      <Icon className="w-[15px] h-[15px] shrink-0" style={{ color: on ? D.accent : 'rgba(255,255,255,0.42)', transition: 'color 0.45s ease' }} strokeWidth={1.9} />
      <span className="text-[11.5px] font-medium flex-1 truncate" style={{ fontFamily: PJ, color: on ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'color 0.45s ease' }}>{label}</span>
      {badge && <span className="text-[7.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, background: badgeColor || D.accentDim, color: badgeColor ? '#fff' : D.accent }}>{badge}</span>}
    </div>
  );
}
function SideLabel({ children }: any) {
  return <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] px-4 pt-2.5 pb-1" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.28)' }}>{children}</p>;
}

function Sidebar({ tab }: { tab: number }) {
  const navRef = useRef<HTMLDivElement>(null);
  const rOperasjon = useRef<HTMLDivElement>(null);
  const rOversikt = useRef<HTMLDivElement>(null);
  const rKalender = useRef<HTMLDivElement>(null);
  const rSaker = useRef<HTMLDivElement>(null);
  const tabRefs = [rOperasjon, rOversikt, rKalender, rSaker];
  const [ind, setInd] = useState({ top: 0, h: 0, ready: false });

  useEffect(() => {
    const el = tabRefs[tab]?.current;
    if (el) setInd({ top: el.offsetTop, h: el.offsetHeight, ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  const k = TABS[tab].key;

  return (
    <div className="shrink-0 flex flex-col py-3" style={{ width: SIDE_W, background: D.side, borderRight: `1px solid ${D.border}` }}>
      <div className="px-4 mb-2 pt-0.5 flex items-center justify-between">
        <img src="/img/digihome-logo-white.svg" alt="DigiHome" className="h-[21px] w-auto select-none" draggable={false} />
      </div>
      <div ref={navRef} className="relative flex-1 overflow-hidden">
        <div style={{
          position: 'absolute', left: 10, right: 10, top: ind.top, height: ind.h, borderRadius: 9,
          background: 'linear-gradient(90deg, rgba(207,151,252,0.20), rgba(207,151,252,0.04))',
          transition: 'top 0.55s cubic-bezier(0.22,1,0.36,1), height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
          opacity: ind.ready ? 1 : 0, zIndex: 1,
        }}>
          <span style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 4px 4px 0', background: 'linear-gradient(to bottom,#cf97fc,#7c5cff)', boxShadow: '0 0 12px rgba(207,151,252,0.75)' }} />
        </div>
        <SideLabel>Arbeid</SideLabel>
        <NavItem innerRef={rOversikt} icon={LayoutDashboard} label="Oversikt" on={k === 'oversikt'} />
        <NavItem innerRef={rOperasjon} icon={Gauge} label="Operasjonssentral" on={k === 'operasjon'} badge="Ny" />
        <NavItem icon={MessageSquare} label="Innboks" on={false} />
        <NavItem icon={UserCheck} label="Leads" on={false} badge="Pro" />
        <NavItem icon={CalendarCheck} label="Reservasjoner" on={false} />
        <NavItem innerRef={rKalender} icon={CalendarDays} label="Kalender" on={k === 'kalender'} />
        <NavItem icon={Radio} label="Kanaler" on={false} />
        <NavItem icon={ClipboardList} label="Oppgaver" on={false} />
        <NavItem icon={Bot} label="Driftsassistent" on={false} />
        <SideLabel>Drift</SideLabel>
        <NavItem icon={Building2} label="Eiendommer" on={false} />
        <NavItem icon={Rocket} label="Utleieprosesser" on={false} />
        <NavItem icon={ScrollText} label="Leieforhold" on={false} />
        <NavItem icon={FileText} label="Dokumenter" on={false} />
        <NavItem innerRef={rSaker} icon={AlertCircle} label="Saker" on={k === 'saker'} />
        <NavItem icon={Users} label="Personer" on={false} />
        <NavItem icon={Building} label="Organisasjon" on={false} />
      </div>
      <div className="mt-1 mx-2.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.045)' }}>
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0"><img src="/team/martin-kviteberg-face.jpg" alt="" className="w-full h-full object-cover" /></div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white truncate" style={{ fontFamily: PJ }}>Martin Kviteberg</p>
          <p className="text-[9px] truncate" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.4)' }}>martin@kviteberg.no</p>
        </div>
      </div>
    </div>
  );
}

/* delte topptekst-bits (mørk) */
function GhostBtn({ children }: any) {
  return <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-medium" style={{ fontFamily: PJ, color: D.sub, background: D.card, border: `1px solid ${D.border}` }}>{children}</span>;
}
function SearchBell() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px]" style={{ fontFamily: PJ, color: D.muted, background: D.card, border: `1px solid ${D.border}` }}><Search className="w-3.5 h-3.5" />Søk…</span>
      <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full" style={{ background: D.card, border: `1px solid ${D.border}` }}><Bell className="w-4 h-4" style={{ color: D.sub }} /><span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: ROSE }} /></span>
    </div>
  );
}

/* ═══════════════════════ VISNING · AUTOPILOT (Operasjonssentral) ═══════════════════════ */
const CAT: Record<string, { bg: string; fg: string; icon: any }> = {
  Forvaltningsavtale: { bg: 'rgba(124,58,237,0.16)', fg: '#b794f6', icon: ScrollText },
  Annonse: { bg: 'rgba(192,38,211,0.15)', fg: '#e879f9', icon: Rocket },
  Depositum: { bg: 'rgba(16,185,129,0.15)', fg: '#34d399', icon: Wallet },
  Signering: { bg: 'rgba(124,58,237,0.16)', fg: '#b794f6', icon: FileText },
};
function ViewOperasjon() {
  const items = [
    { cat: 'Forvaltningsavtale', ctx: 'BYTT METODE DEMO', title: 'Forvaltningsavtale venter på signering', why: null, hi: true },
    { cat: 'Annonse', ctx: 'OLAF RYES VEI 11C · ENHET 10', title: 'Ledig bolig – klar for annonse', why: 'Ledig nå · ingen annonse eller kontrakt', hi: true },
    { cat: 'Annonse', ctx: 'DEICHMANS GATE 2A · ENHET H0101', title: 'Ledig bolig – forvaltningsavtale mangler', why: 'Ledig nå · signer avtale før annonsering', hi: true },
    { cat: 'Depositum', ctx: 'RØO 93 · ENHET HOVEDENHET', title: 'Depositum venter på betaling', why: '90 000 kr', hi: false },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: D.bg }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5" style={{ fontFamily: PJ, color: D.muted, fontWeight: 700 }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: D.accent }} />Operasjonssentral · mandag 22. juni</p>
          <h1 className="text-[44px] leading-[0.92]" style={{ fontFamily: FH, fontWeight: 800, letterSpacing: '-0.04em', color: D.txt }}>Autopilot</h1>
          <p className="text-[13.5px] mt-2.5" style={{ fontFamily: PJ, color: D.sub }}>Du har <span style={{ color: D.txt, fontWeight: 700 }}>4</span> gjøremål.</p>
        </div>
        <div className="flex items-center gap-2">
          <GhostBtn><Filter className="w-3.5 h-3.5" />Filter</GhostBtn>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-semibold" style={{ fontFamily: PJ, color: D.txt, background: D.card, border: `1px solid ${D.border}` }}><Sparkles className="w-3.5 h-3.5" style={{ color: D.accent }} />Autopilot <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: D.accent, color: '#160d22', fontWeight: 800 }}>På</span></span>
          <GhostBtn><History className="w-3.5 h-3.5" />Historikk</GhostBtn>
          <GhostBtn><RefreshCw className="w-3.5 h-3.5" />Oppdater</GhostBtn>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {items.map((a) => {
          const cc = CAT[a.cat]; const Icon = cc.icon;
          return (
            <div key={a.title} className="group relative rounded-[20px] overflow-hidden flex items-center gap-4 px-5 py-4" style={{ background: D.card, border: `1px solid ${D.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>
              <div className="w-14 h-14 rounded-[16px] shrink-0 flex items-center justify-center" style={{ background: cc.bg }}><Icon className="w-6 h-6" style={{ color: cc.fg }} strokeWidth={2} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.hi ? '#ea7a3c' : D.faint }} />
                  <p className="text-[10px] uppercase tracking-[0.13em] truncate" style={{ fontFamily: PJ, color: D.muted, fontWeight: 700 }}>{a.cat}<span className="opacity-50"> · </span><span style={{ color: D.sub }}>{a.ctx}</span></p>
                </div>
                <p className="text-[17px] leading-[1.2] truncate" style={{ fontFamily: FH, fontWeight: 700, letterSpacing: '-0.015em', color: D.txt }}>{a.title}</p>
                {a.why && <p className="text-[12.5px] truncate mt-1" style={{ fontFamily: PJ, color: D.muted }}>{a.why}</p>}
              </div>
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors" style={{ color: D.muted, background: 'rgba(255,255,255,0.04)' }}><ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.2} /></span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[11px] mt-4 flex items-center justify-center gap-1.5" style={{ fontFamily: PJ, color: D.muted }}>Klikk et gjøremål for full kontekst <span style={{ color: D.faint }}>·</span> <Zap className="w-3 h-3" style={{ color: D.accent }} /> kjører handlingen direkte</p>
    </div>
  );
}

/* ═══════════════════════ VISNING · OVERSIKT ═══════════════════════ */
function ViewOversikt() {
  const quick = [
    { n: '3', l: 'Saker krever oppfølging', c: ROSE, icon: AlertCircle },
    { n: '2', l: 'Kontrakter til signering', c: D.accent, icon: FileText },
    { n: '1', l: 'Ledig enhet', c: AMBER, icon: Home },
  ];
  const revenue = [
    { label: 'Månedlig inntekt', value: '1,25 M', unit: 'kr', spark: [6, 7, 6, 8, 9, 8, 11], sparkC: GREEN, trend: '+12 %' },
    { label: 'Årlig estimat', value: '15,0 M', unit: 'kr', spark: [5, 6, 7, 7, 9, 10, 12], sparkC: D.accent },
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
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: D.bg }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[24px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: D.txt }}>God morgen, Martin <span style={{ fontSize: 20 }}>👋</span></h1>
          <p className="text-[12.5px] mt-1" style={{ fontFamily: PJ, color: D.muted }}>torsdag 12. juni</p>
        </div>
        <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12.5px] font-semibold" style={{ fontFamily: PJ, background: D.accent, color: '#160d22' }}><Building2 className="w-3.5 h-3.5" />Eiendommer</span>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {quick.map((q) => { const Icon = q.icon; return (
          <div key={q.l} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-bold tabular-nums" style={{ fontFamily: PJ, background: `${q.c}22`, color: q.c }}>{q.n}</span>
            <span className="text-[12px] flex-1 leading-tight" style={{ fontFamily: PJ, color: D.sub }}>{q.l}</span>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: D.faint }} />
          </div>
        ); })}
      </div>

      {/* revenue row */}
      <div className="grid grid-cols-4 rounded-2xl overflow-hidden mb-4" style={{ background: D.card, border: `1px solid ${D.border}` }}>
        {revenue.map((r: any, i: number) => (
          <div key={i} className="px-5 py-4" style={i > 0 ? { borderLeft: `1px solid ${D.border}` } : undefined}>
            {r.occ ? (
              <>
                <div className="flex items-center justify-between mb-2"><p className="text-[12px]" style={{ fontFamily: PJ, color: D.sub }}>Belegg</p><span className="text-[10.5px] font-semibold tabular-nums" style={{ fontFamily: PJ, color: D.muted }}>137/142</span></div>
                <p className="text-[26px] font-bold tracking-[-0.03em] tabular-nums leading-none mb-2.5" style={{ fontFamily: PJ, color: D.txt }}>96<span className="text-[13px] font-normal" style={{ color: D.muted }}>%</span></p>
                <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}><div className="h-full rounded-full" style={{ width: '96%', background: D.accent }} /></div>
                <p className="text-[11px] mt-2" style={{ fontFamily: PJ, color: D.muted }}>137 enheter utleid</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2"><p className="text-[12px]" style={{ fontFamily: PJ, color: D.sub }}>{r.label}</p>{r.trend && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ fontFamily: PJ, color: GREEN, background: `${GREEN}1f` }}>{r.trend}</span>}</div>
                <p className="text-[26px] font-bold tracking-[-0.03em] tabular-nums leading-none mb-2.5" style={{ fontFamily: PJ, color: D.txt }}>{r.value} <span className="text-[13px] font-normal" style={{ color: D.muted }}>{r.unit}</span></p>
                <Spark data={r.spark} color={r.sparkC} w={104} height={22} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {kpis.map((k: any) => { const Icon = k.icon; return (
          <div key={k.label} className="p-5 rounded-2xl" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.alert ? `${ROSE}1f` : D.icon }}><Icon className="w-[18px] h-[18px]" style={{ color: k.alert ? ROSE : D.sub }} strokeWidth={1.7} /></div>
              {k.live ? <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: PJ, color: GREEN }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />Live</span> : <Spark data={k.spark} color={k.sparkC} w={56} height={20} />}
            </div>
            <p className="text-[26px] font-bold tracking-tight tabular-nums leading-none" style={{ fontFamily: PJ, color: D.txt }}>{k.value}</p>
            <p className="text-[13.5px] mt-1" style={{ fontFamily: PJ, color: D.sub }}>{k.label}</p>
            {k.sub && <p className="text-[12px] font-semibold mt-0.5" style={{ fontFamily: PJ, color: GREEN }}>{k.sub}</p>}
            {k.alert && <p className="text-[12px] font-semibold mt-0.5" style={{ fontFamily: PJ, color: ROSE }}>Krever oppfølging</p>}
          </div>
        ); })}
      </div>

      {/* insight */}
      <div className="rounded-2xl px-6 py-5 flex items-center gap-5 overflow-hidden relative" style={{ background: 'linear-gradient(110deg,#1a1326,#141417)', border: `1px solid ${D.borderS}` }}>
        <div className="absolute top-[-50%] right-[-2%] w-[280px] h-[280px] rounded-full" style={{ opacity: 0.16, background: D.accent }} />
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(207,151,252,0.2)' }}><Sparkles className="w-6 h-6" style={{ color: D.accent }} strokeWidth={1.6} /></div>
        <div className="flex-1 min-w-0 relative">
          <p className="text-[15px] font-semibold mb-0.5" style={{ fontFamily: PJ, color: D.txt }}>Porteføljen presterer godt</p>
          <p className="text-[13px]" style={{ fontFamily: PJ, color: D.sub }}>137 av 142 enheter utleid (96 %) · 1,25 M kr/mnd</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-semibold" style={{ fontFamily: PJ, background: D.accent, color: '#160d22' }}>Se detaljer <ArrowUpRight className="w-4 h-4" strokeWidth={1.9} /></span>
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING · KALENDER ═══════════════════════ */
const CH = { airbnb: '#FF5A5F', booking: '#3b6fd4', finn: '#06BFFC', dynamic: '#a78bfa', blocked: '#6b7280' };
function ViewKalender() {
  const weekdays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
  const days = Array.from({ length: 35 }, (_, i) => i - 2 + 1).map((d) => (d >= 1 && d <= 30 ? d : null));
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
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: D.bg }}>
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-[28px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: D.txt }}>Kalender</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2.5 h-9 px-2.5 rounded-full" style={{ background: D.card, border: `1px solid ${D.border}` }}><ChevronLeft className="w-4 h-4" style={{ color: D.muted }} /><span className="text-[12.5px] font-semibold" style={{ fontFamily: PJ, color: D.txt }}>Juni 2026</span><ChevronRight className="w-4 h-4" style={{ color: D.muted }} /></span>
          <SearchBell />
        </div>
      </div>
      <div className="flex items-center gap-3.5 mb-3">
        {legend.map((g) => <span key={g.l} className="inline-flex items-center gap-1.5 text-[10.5px] font-medium" style={{ fontFamily: PJ, color: D.sub }}><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: g.c }} />{g.l}</span>)}
      </div>
      <div className="rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: D.card, border: `1px solid ${D.border}` }}>
        <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${D.border}` }}>
          {weekdays.map((w) => <div key={w} className="text-center py-2 text-[9.5px] font-bold uppercase tracking-wide" style={{ fontFamily: PJ, color: D.muted }}>{w}</div>)}
        </div>
        <div className="relative flex-1 grid grid-cols-7 grid-rows-5">
          {days.map((d, i) => (
            <div key={i} className="px-2 pt-1.5" style={{ borderRight: (i % 7 !== 6) ? `1px solid ${D.border}` : 'none', borderBottom: (i < 28) ? `1px solid ${D.border}` : 'none' }}>
              {d && (d === 12
                ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold tabular-nums" style={{ fontFamily: PJ, background: D.accent, color: '#160d22' }}>{d}</span>
                : <span className="text-[10.5px] font-semibold tabular-nums" style={{ fontFamily: PJ, color: D.sub }}>{d}</span>)}
            </div>
          ))}
          {bars.map((b, i) => (
            <div key={i} className="absolute flex items-center px-2 rounded-md overflow-hidden" style={{ left: `calc(${(b.start / 7) * 100}% + 3px)`, width: `calc(${(b.span / 7) * 100}% - 6px)`, top: `calc(${(b.row / 5) * 100}% + 26px)`, height: 19, background: b.c, boxShadow: `0 2px 10px ${b.c}55` }}>
              <span className="text-[8.5px] font-semibold text-white truncate" style={{ fontFamily: PJ }}>{b.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING · SAKER ═══════════════════════ */
const ST: Record<string, { c: string; icon: any; label: string }> = {
  open: { c: '#60a5fa', icon: Circle, label: 'Åpen' },
  in_progress: { c: '#b794f6', icon: Timer, label: 'Pågår' },
  waiting: { c: '#e0b060', icon: Pause, label: 'Venter' },
  resolved: { c: '#5fcf98', icon: CheckCircle2, label: 'Løst' },
};
const TYP: Record<string, { c: string; icon: any }> = {
  maintenance: { c: '#ea7a3c', icon: Wrench },
  damage: { c: '#60a5fa', icon: Droplets },
  other: { c: '#b794f6', icon: Zap },
};
const PRC: Record<string, { c: string; label: string }> = {
  urgent: { c: '#ef6b6b', label: 'Haster' }, high: { c: '#ea7a3c', label: 'Viktig' }, medium: { c: '#e0b060', label: 'Middels' }, low: { c: D.muted, label: 'Lav' },
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
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: D.bg }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[28px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: D.txt }}>Saker</h1>
          <p className="text-[12.5px] mt-1" style={{ fontFamily: PJ, color: D.muted }}>3 åpne · 1 løst i dag</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded-full" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            {['Alle', 'Åpne', 'Pågår'].map((f, i) => <span key={f} className="px-3.5 h-8 flex items-center rounded-full text-[11.5px] font-semibold" style={{ fontFamily: PJ, color: i === 0 ? '#160d22' : D.sub, background: i === 0 ? D.accent : 'transparent' }}>{f}</span>)}
          </div>
          <SearchBell />
        </div>
      </div>
      <div className="rounded-2xl flex-1 min-h-0 overflow-hidden" style={{ background: D.card, border: `1px solid ${D.border}` }}>
        <div className="grid items-center px-5 py-3" style={{ gridTemplateColumns: '1.7fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: `1px solid ${D.border}` }}>
          {['Sak', 'Eiendom', 'Status', 'Prioritet', 'Tildelt'].map((h) => <span key={h} className="text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: D.muted }}>{h}</span>)}
        </div>
        {rows.map((r, i) => { const s = ST[r.status]; const ty = TYP[r.typ]; const pr = PRC[r.pri]; const SIcon = s.icon; const TIcon = ty.icon; return (
          <div key={r.sak} className="grid items-center px-5 py-3.5" style={{ gridTemplateColumns: '1.7fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: i < rows.length - 1 ? `1px solid ${D.border}` : 'none' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ty.c}22` }}><TIcon className="w-4 h-4" style={{ color: ty.c }} strokeWidth={1.9} /></span>
              <span className="text-[13px] font-semibold truncate" style={{ fontFamily: PJ, color: D.txt }}>{r.sak}</span>
            </div>
            <span className="text-[12px] truncate" style={{ fontFamily: PJ, color: D.sub }}>{r.eiendom}</span>
            <span><span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ fontFamily: PJ, color: s.c, background: `${s.c}1f` }}><SIcon className="w-3 h-3" strokeWidth={2.2} />{s.label}</span></span>
            <span className="text-[11.5px] font-semibold" style={{ fontFamily: PJ, color: pr.c }}>{pr.label}</span>
            <div className="flex items-center gap-2 min-w-0">
              {r.vi ? <div className="w-6 h-6 rounded-full overflow-hidden shrink-0"><img src={r.vi} alt="" className="w-full h-full object-cover" /></div>
                : r.ai ? <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: D.accentDim }}><Sparkles className="w-3 h-3" style={{ color: D.accent }} /></div>
                : <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: D.bg, border: `1px dashed ${D.muted}` }}><Clock className="w-3 h-3" style={{ color: D.muted }} /></div>}
              <span className="text-[11.5px] truncate" style={{ fontFamily: PJ, color: r.ai ? D.accent : (r.vi ? D.sub : D.muted), fontWeight: r.ai ? 600 : 400, fontStyle: (!r.vi && !r.ai) ? 'italic' : 'normal' }}>{r.vendor}</span>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}

const VIEWS = [ViewOperasjon, ViewOversikt, ViewKalender, ViewSaker];

/* ═══════════════════════ DESKTOP-MOCKUP (auto-veksler, ingen chrome) ═══════════════════════ */
function DesktopMock({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const [tab, setTab] = useState(0);
  useEffect(() => {
    if (!active || pdfMode) { setTab(0); return; }
    const id = setInterval(() => setTab((t) => (t + 1) % TABS.length), 4600);
    return () => clearInterval(id);
  }, [active, pdfMode]);
  const View = VIEWS[tab];
  return (
    <div className="rounded-[22px] overflow-hidden relative" style={{ width: DESK_W, background: D.bg, border: `1px solid ${D.borderS}`, boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 60px 130px -42px rgba(0,0,0,0.7), 0 24px 60px -32px rgba(0,0,0,0.6)' }}>
      <div className="flex" style={{ height: BODY_H }}>
        <Sidebar tab={tab} />
        <div className="flex-1 relative overflow-hidden" style={{ background: D.bg }}>
          <AnimatePresence mode="sync">
            <motion.div key={tab} className="absolute inset-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease }}>
              <View />
            </motion.div>
          </AnimatePresence>
          {/* Spør Autopilot — flytende */}
          <div className="absolute bottom-4 right-5 z-20 inline-flex items-center gap-2 h-10 px-4 rounded-full" style={{ background: '#0a0a0c', border: `1px solid ${D.borderS}`, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.7), 0 0 0 4px rgba(207,151,252,0.06)' }}>
            <Sparkles className="w-4 h-4" style={{ color: D.accent }} strokeWidth={2} />
            <span className="text-[12.5px] font-semibold" style={{ fontFamily: PJ, color: D.txt }}>Spør Autopilot</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ B2C · MOBIL (mørk premium) ═══════════════════════ */
function PhoneMock() {
  return (
    <div className="relative rounded-[40px] p-[7px]" style={{ width: 250, background: '#050506', boxShadow: '0 56px 110px -38px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)' }}>
      <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-[78px] h-[20px] rounded-b-[12px] z-20" style={{ background: '#050506' }} />
      <div className="rounded-[34px] overflow-hidden relative" style={{ background: D.bg, height: 498 }}>
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] font-bold" style={{ fontFamily: PJ, color: D.txt }}>9:41</span>
          <span className="w-3.5 h-2 rounded-[2px]" style={{ border: `1px solid ${D.sub}` }} />
        </div>
        <div className="px-4 pt-1">
          <p className="text-[11px]" style={{ fontFamily: PJ, color: D.muted }}>God morgen</p>
          <p className="text-[22px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: D.txt }}>Martin <span style={{ fontSize: 18 }}>👋</span></p>
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: '#000' }}>
            <div className="relative" style={{ height: 92 }}>
              <img src="/bergen-houses.webp" alt="" className="w-full h-full object-cover" style={{ opacity: 0.82 }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), transparent 66%)' }} />
              <div className="absolute bottom-2 left-3 right-3">
                <div className="flex items-center gap-1 mb-0.5"><MapPin className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.6)' }} /><span className="text-[9px]" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.6)' }}>Bergen</span></div>
                <p className="text-[13px] font-semibold text-white tracking-tight" style={{ fontFamily: PJ }}>Camilla Colletts gate 14A</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2" style={{ background: D.card }}>
              <span className="text-[10px]" style={{ fontFamily: PJ, color: D.sub }}>Utleid · Anna Berg</span>
              <span className="text-[12px] font-bold tabular-nums" style={{ fontFamily: PJ, color: D.txt }}>16 800 <span className="text-[9px]" style={{ color: D.muted }}>kr/mnd</span></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div className="rounded-xl px-2.5 py-2" style={{ background: D.card, border: `1px solid ${D.border}` }}><p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: D.muted }}>Inntekt mnd</p><p className="text-[14px] font-bold tabular-nums" style={{ fontFamily: PJ, color: D.txt }}>16 800 kr</p></div>
            <div className="rounded-xl px-2.5 py-2" style={{ background: D.card, border: `1px solid ${D.border}` }}><p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: D.muted }}>Neste utbetaling</p><p className="text-[14px] font-bold" style={{ fontFamily: PJ, color: D.txt }}>28. jun</p></div>
          </div>
          <div className="mt-2.5 rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"><img src="/team-sarah.webp" alt="" className="w-full h-full object-cover" /></div>
            <div className="min-w-0 flex-1"><p className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: D.muted }}>Din forvalter</p><p className="text-[12px] font-semibold truncate" style={{ fontFamily: PJ, color: D.txt }}>Sarah Lia</p></div>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: D.accentDim }}><MessageSquare className="w-3.5 h-3.5" style={{ color: D.accent }} /></span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 pt-2 pb-3" style={{ background: 'rgba(8,8,10,0.92)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${D.border}` }}>
          {[{ i: Home, l: 'Oversikt', on: true }, { i: DollarSign, l: 'Økonomi' }, { i: Wrench, l: 'Saker' }, { i: MessageSquare, l: 'Meldinger' }].map((t) => {
            const Icon = t.i;
            return <div key={t.l} className="flex flex-col items-center gap-0.5"><Icon className="w-[17px] h-[17px]" style={{ color: t.on ? D.accent : D.muted }} strokeWidth={t.on ? 2.2 : 1.7} /><span className="text-[7.5px] font-semibold" style={{ fontFamily: PJ, color: t.on ? D.txt : D.muted }}>{t.l}</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}

function DeviceLabel({ tag, plan }: { tag: string; plan: string }) {
  return (
    <div className="text-center mt-6">
      <p className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ ...FHd, color: '#1a1a1a' }}>{tag}</p>
      <p className="text-[11.5px] mt-1.5" style={{ ...F, color: '#8a8276' }}>{plan}</p>
    </div>
  );
}

/* ═══════════════════════ KOMPOSISJON (skala-til-fyll, venstrejustert) ═══════════════════════ */
const PHONE_DEV_H = 512;
const GAP = 26;
const PHONE_W = 246;
const STAGE_W = DESK_W + GAP + PHONE_W;
const DESK_H = BODY_H;
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
  const scale = Math.min(1.14, cw / STAGE_W);
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
