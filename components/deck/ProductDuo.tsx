'use client';
/**
 * ProductDuo — investor-slide-innhold: «Én motor. To produkter.»
 *
 * Venstre (helt):  B2B forvalter-plattform (desktop) — STOR, levende mockup som
 *                  auto-veksler mellom fire ekte app-visninger:
 *                  Oversikt → Operasjonssentral → Kalender → Saker.
 *                  Sidebar-markøren glir, URL-en endres, innholdet crossfader.
 * Høyre (companion): B2C privat-utleier-app (mobil — Owner Portal), flytende.
 *
 * Pixel-DNA hentet 1:1 fra den ekte AdminLayout/AdminDashboard.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Gauge, MessageSquare, UserCheck, CalendarDays,
  Building2, FileText, AlertCircle, DollarSign, Home, Users, TrendingUp,
  Search, Bell, Wrench, ChevronRight, ChevronLeft, MapPin, Sparkles,
  Check, Clock, Filter, PenLine, Tag, ArrowUpRight, Zap, MoreHorizontal,
} from 'lucide-react';

/* ── ekte portal-DNA ── */
const PJ = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const INK = '#1a1a1a', SUB = '#6b6358', MUTED = '#a09888', FAINT = '#9b9080';
const BORDER = '#ece7df', CARD = '#ffffff', BG = '#faf8f5', SIDEBAR = '#171717';
const ACCENT = '#7c3aed', LILAC = '#cf97fc', GREEN = '#16a34a', BLUE = '#5b8def', SLATE = '#64748b', ROSE = '#e5484d', AMBER = '#d97706';
/* deck-typografi for ytre etiketter */
const F: React.CSSProperties = { fontFamily: "var(--font-body), 'ABC Diatype', sans-serif" };
const FH: React.CSSProperties = { fontFamily: "var(--font-heading), 'PP Right Grotesk', sans-serif" };

/* ── desktop-dimensjoner ── */
const DESK_W = 868;
const SIDE_W = 194;
const CHROME_H = 32;
const BODY_H = 506;
const ease = [0.22, 1, 0.36, 1] as const;

const TABS = [
  { key: 'oversikt', label: 'Oversikt', url: 'app.digihome.no/forvalter' },
  { key: 'operasjon', label: 'Operasjonssentral', url: 'app.digihome.no/forvalter/operasjonssentral' },
  { key: 'kalender', label: 'Kalender', url: 'app.digihome.no/forvalter/kalender' },
  { key: 'saker', label: 'Saker', url: 'app.digihome.no/forvalter/saker' },
];

/* ═══════════════════════ SIDEBAR ═══════════════════════ */
function NavItem({ icon: Icon, label, on, badge, badgeColor, innerRef }: any) {
  return (
    <div ref={innerRef} className="relative flex items-center gap-2.5 mx-2 px-2.5 rounded-lg" style={{ height: 30, zIndex: 2 }}>
      <Icon className="w-[15px] h-[15px] shrink-0" style={{ color: on ? LILAC : 'rgba(255,255,255,0.46)', transition: 'color 0.45s ease' }} strokeWidth={1.9} />
      <span className="text-[11.5px] font-medium flex-1 truncate" style={{ fontFamily: PJ, color: on ? '#fff' : 'rgba(255,255,255,0.52)', transition: 'color 0.45s ease' }}>{label}</span>
      {badge && <span className="text-[7.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, background: badgeColor || 'rgba(207,151,252,0.22)', color: badgeColor ? '#fff' : LILAC }}>{badge}</span>}
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
        {/* glidende markør */}
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

/* ═══════════════════════ DELTE BITER ═══════════════════════ */
function TopHeader({ title, sub, right }: any) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.03em] leading-tight" style={{ fontFamily: PJ, color: INK }}>{title}</h1>
        {sub && <p className="text-[12px] mt-1" style={{ fontFamily: PJ, color: MUTED }}>{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}
function GhostBtn({ children }: any) {
  return <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11.5px] font-medium" style={{ fontFamily: PJ, color: SUB, background: CARD, border: `1px solid ${BORDER}` }}>{children}</span>;
}
function SearchBell() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-[11px]" style={{ fontFamily: PJ, color: MUTED, background: CARD, border: `1px solid ${BORDER}` }}><Search className="w-3.5 h-3.5" />Søk…</span>
      <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}><Bell className="w-3.5 h-3.5" style={{ color: SUB }} /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: ROSE }} /></span>
    </div>
  );
}

/* ═══════════════════════ VISNING 1 · OVERSIKT ═══════════════════════ */
function ViewOversikt() {
  const kpis = [
    { icon: Building2, color: GREEN, value: '142', label: 'Eiendommer', live: true },
    { icon: Home, color: BLUE, value: '142', label: 'Enheter', sub: '137 utleid', subColor: GREEN },
    { icon: Users, color: SLATE, value: '137', label: 'Leietakere' },
    { icon: AlertCircle, color: ROSE, value: '3', label: 'Åpne saker', sub: 'Krever oppfølging', subColor: ROSE },
  ];
  const props = [
    { addr: 'Kalfaret 22B', area: 'Bergen · 64 m²', img: '/interior-living.webp', status: 'Utleid', sc: GREEN, rent: '16 800' },
    { addr: 'Nygårdsgaten 15', area: 'Bergen · 48 m²', img: '/interior-kitchen.webp', status: 'Ledig', sc: AMBER, rent: '14 200' },
    { addr: 'Strandgaten 44', area: 'Bergen · 72 m²', img: '/interior-bedroom.webp', status: 'Utleid', sc: GREEN, rent: '18 400' },
  ];
  return (
    <div className="h-full px-6 py-5 flex flex-col" style={{ background: BG }}>
      <TopHeader
        title={<>God morgen, Martin <span style={{ fontSize: 18 }}>👋</span></>}
        sub="torsdag 12. juni"
        right={<><GhostBtn>Saker <span className="min-w-[17px] h-[17px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1" style={{ background: ROSE }}>3</span></GhostBtn><span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11.5px] font-semibold text-white" style={{ fontFamily: PJ, background: INK }}><Building2 className="w-3.5 h-3.5" />Eiendommer</span></>}
      />
      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-3.5">
        {kpis.map((k) => { const Icon = k.icon; return (
          <div key={k.label} className="rounded-2xl p-3.5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${k.color}1f` }}><Icon className="w-[16px] h-[16px]" style={{ color: k.color }} strokeWidth={2} /></span>
              {k.live && <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider" style={{ fontFamily: PJ, color: GREEN }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />Live</span>}
            </div>
            <p className="text-[22px] font-bold tabular-nums leading-none tracking-tight" style={{ fontFamily: PJ, color: INK }}>{k.value}</p>
            <p className="text-[12px] mt-1.5" style={{ fontFamily: PJ, color: SUB }}>{k.label}</p>
            {k.sub && <p className="text-[10.5px] font-semibold mt-0.5" style={{ fontFamily: PJ, color: k.subColor }}>{k.sub}</p>}
          </div>
        ); })}
      </div>
      {/* graf + liste */}
      <div className="grid gap-3 flex-1 min-h-0" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
        {/* inntektsgraf */}
        <div className="rounded-2xl p-4 flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: FAINT }}>Inntekt</p>
              <p className="text-[20px] font-bold tabular-nums tracking-tight mt-0.5" style={{ fontFamily: PJ, color: INK }}>1,25 M <span className="text-[12px] font-medium" style={{ color: MUTED }}>kr/mnd</span></p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-lg" style={{ fontFamily: PJ, color: GREEN, background: `${GREEN}14` }}><ArrowUpRight className="w-3 h-3" />+12 %</span>
          </div>
          <div className="relative flex-1 min-h-0 mt-1">
            <svg viewBox="0 0 320 110" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="pdArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,86 L46,72 L92,78 L138,54 L184,60 L230,36 L276,30 L320,18 L320,110 L0,110 Z" fill="url(#pdArea)" />
              <path d="M0,86 L46,72 L92,78 L138,54 L184,60 L230,36 L276,30 L320,18" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="320" cy="18" r="3.5" fill={ACCENT} />
              <circle cx="320" cy="18" r="6" fill={ACCENT} opacity="0.18" />
            </svg>
          </div>
          <div className="flex justify-between mt-1.5 px-0.5">
            {['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun'].map((m) => <span key={m} className="text-[8.5px]" style={{ fontFamily: PJ, color: FAINT }}>{m}</span>)}
          </div>
        </div>
        {/* eiendomsliste */}
        <div className="rounded-2xl p-3.5 flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[12px] font-semibold" style={{ fontFamily: PJ, color: INK }}>Eiendommer</p>
            <span className="text-[10px] font-medium" style={{ fontFamily: PJ, color: ACCENT }}>Se alle</span>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {props.map((p) => (
              <div key={p.addr} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0" style={{ border: `1px solid ${BORDER}` }}><img src={p.img} alt="" className="w-full h-full object-cover" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>{p.addr}</p>
                  <p className="text-[9.5px] truncate" style={{ fontFamily: PJ, color: MUTED }}>{p.area}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, color: p.sc, background: `${p.sc}16` }}>{p.status}</span>
                  <p className="text-[10px] font-semibold tabular-nums mt-1" style={{ fontFamily: PJ, color: SUB }}>{p.rent} kr</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING 2 · OPERASJONSSENTRAL ═══════════════════════ */
function ViewOperasjon() {
  const cards = [
    { cat: 'Annonse', icon: Tag, cc: ACCENT, title: 'Pris bør justeres opp 8 %', ctx: 'Kalfaret 22B · sesongtopp i juni → 18 200 kr/mnd', pri: 'Viktig', pc: AMBER, primary: 'Godkjenn', ghost: 'Avvis' },
    { cat: 'Signering', icon: PenLine, cc: BLUE, title: 'Kontrakt klar for BankID-signering', ctx: 'Strandgaten 44 · Anna Berg har bekreftet vilkårene', pri: 'Haster', pc: ROSE, primary: 'Send', ghost: 'Utsett' },
    { cat: 'Visning', icon: CalendarDays, cc: '#0ea5e9', title: 'Visning bekreftet — Damsgårdsveien 9', ctx: '3 interessenter · automatisk lagt i kalenderen', pri: 'Normal', pc: SLATE, primary: 'Se detaljer', ghost: null },
    { cat: 'Drift', icon: Wrench, cc: GREEN, title: 'Sak #1042 løst automatisk', ctx: 'Nygårdsgaten 15 · Bergen Elektro fullførte — faktura matchet', pri: 'Normal', pc: SLATE, primary: 'Marker ferdig', ghost: null },
  ];
  return (
    <div className="h-full px-6 py-5 flex flex-col" style={{ background: BG }}>
      <TopHeader
        title="Operasjonssentralen"
        sub="Autopiloten håndterer driften — du godkjenner."
        right={<>
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold" style={{ fontFamily: PJ, color: GREEN, background: `${GREEN}14`, border: `1px solid ${GREEN}26` }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />Autopilot aktiv</span>
          <GhostBtn><Filter className="w-3.5 h-3.5" />Filter</GhostBtn>
        </>}
      />
      <div className="flex items-center gap-2 mb-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: PJ, color: FAINT }}>I dag</p>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ fontFamily: PJ, color: ACCENT, background: `${ACCENT}12` }}>4 gjøremål</span>
        <div className="flex-1 h-px" style={{ background: BORDER }} />
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {cards.map((c) => { const Icon = c.icon; return (
          <div key={c.title} className="rounded-2xl p-3.5 flex items-center gap-3.5" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 3px rgba(10,10,10,0.03)' }}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.cc}16` }}><Icon className="w-[18px] h-[18px]" style={{ color: c.cc }} strokeWidth={2} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, color: c.cc, background: `${c.cc}14` }}>{c.cat}</span>
                <span className="text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, color: c.pc, background: `${c.pc}14` }}>{c.pri}</span>
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-semibold" style={{ fontFamily: PJ, color: ACCENT }}><Sparkles className="w-2.5 h-2.5" />AI foreslår</span>
              </div>
              <p className="text-[12.5px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>{c.title}</p>
              <p className="text-[10.5px] truncate mt-0.5" style={{ fontFamily: PJ, color: MUTED }}>{c.ctx}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.ghost && <span className="inline-flex items-center h-7 px-3 rounded-full text-[10.5px] font-medium" style={{ fontFamily: PJ, color: SUB, background: BG, border: `1px solid ${BORDER}` }}>{c.ghost}</span>}
              <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[10.5px] font-semibold text-white" style={{ fontFamily: PJ, background: INK }}><Check className="w-3 h-3" />{c.primary}</span>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING 3 · KALENDER ═══════════════════════ */
function ViewKalender() {
  const weekdays = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
  // 5 uker, startdag forskjøvet (1. juni = lørdag → start onsdag for visuell variasjon)
  const startOffset = 2; // tomme celler før dag 1
  const days = Array.from({ length: 35 }, (_, i) => i - startOffset + 1).map((d) => (d >= 1 && d <= 30 ? d : null));
  const legend = [
    { l: 'Booket', c: BLUE }, { l: 'Dynamisk', c: ACCENT }, { l: 'Direkte', c: GREEN }, { l: 'Blokkert', c: '#94a3b8' },
  ];
  // bookingbjelker: { row, startCol, span, color, label }
  const bars = [
    { row: 0, start: 2, span: 4, c: BLUE, l: 'Airbnb · 4 netter' },
    { row: 1, start: 0, span: 3, c: ACCENT, l: 'Dynamisk' },
    { row: 1, start: 4, span: 3, c: GREEN, l: 'FINN · Anna B.' },
    { row: 2, start: 1, span: 5, c: BLUE, l: 'Booking.com · 5 netter' },
    { row: 3, start: 3, span: 2, c: '#94a3b8', l: 'Blokkert' },
    { row: 3, start: 5, span: 2, c: ACCENT, l: 'Dynamisk' },
    { row: 4, start: 0, span: 4, c: GREEN, l: 'FINN · langtid' },
  ];
  return (
    <div className="h-full px-6 py-5 flex flex-col" style={{ background: BG }}>
      <TopHeader
        title="Kalender"
        right={<>
          <span className="inline-flex items-center gap-2.5 h-8 px-2 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <ChevronLeft className="w-3.5 h-3.5" style={{ color: MUTED }} />
            <span className="text-[11.5px] font-semibold" style={{ fontFamily: PJ, color: INK }}>Juni 2026</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: MUTED }} />
          </span>
          <SearchBell />
        </>}
      />
      {/* legend */}
      <div className="flex items-center gap-3.5 mb-2.5">
        {legend.map((g) => <span key={g.l} className="inline-flex items-center gap-1.5 text-[10px] font-medium" style={{ fontFamily: PJ, color: SUB }}><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: g.c }} />{g.l}</span>)}
      </div>
      {/* kalender */}
      <div className="rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {weekdays.map((w) => <div key={w} className="text-center py-1.5 text-[9.5px] font-bold uppercase tracking-wide" style={{ fontFamily: PJ, color: FAINT }}>{w}</div>)}
        </div>
        <div className="relative flex-1 grid grid-cols-7 grid-rows-5">
          {days.map((d, i) => (
            <div key={i} className="px-1.5 pt-1" style={{ borderRight: (i % 7 !== 6) ? `1px solid ${BORDER}` : 'none', borderBottom: (i < 28) ? `1px solid ${BORDER}` : 'none' }}>
              {d && <span className="text-[10px] font-semibold tabular-nums" style={{ fontFamily: PJ, color: d === 12 ? ACCENT : SUB }}>{d}</span>}
            </div>
          ))}
          {/* bookingbjelker */}
          {bars.map((b, i) => (
            <div key={i} className="absolute flex items-center px-2 rounded-md overflow-hidden" style={{
              left: `calc(${(b.start / 7) * 100}% + 3px)`,
              width: `calc(${(b.span / 7) * 100}% - 6px)`,
              top: `calc(${(b.row / 5) * 100}% + 22px)`,
              height: 18,
              background: b.c, boxShadow: `0 2px 6px ${b.c}40`,
            }}>
              <span className="text-[8.5px] font-semibold text-white truncate" style={{ fontFamily: PJ }}>{b.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING 4 · SAKER ═══════════════════════ */
function ViewSaker() {
  const rows = [
    { sak: 'Stekeovn defekt', eiendom: 'Parkveien 12A', status: 'Pågår', sc: AMBER, pri: 'Haster', pc: ROSE, vendor: 'Bergen Elektro', vi: '/team-sarah.webp' },
    { sak: 'Vannlekkasje bad', eiendom: 'Kalfaret 22B', status: 'Åpen', sc: BLUE, pri: 'Viktig', pc: AMBER, vendor: 'Tildeles…', vi: null },
    { sak: 'Bytte av lås', eiendom: 'Strandgaten 44', status: 'Løst', sc: GREEN, pri: 'Normal', pc: SLATE, vendor: 'Låsservice AS', vi: '/team-martin.webp' },
    { sak: 'Maling stue', eiendom: 'Nygårdsgaten 15', status: 'Venter', sc: SLATE, pri: 'Lav', pc: SLATE, vendor: 'Maler Bergen', vi: '/team-erik.webp' },
    { sak: 'Bytte ventilasjonsfilter', eiendom: 'Vestre Torvgate 7', status: 'Løst', sc: GREEN, pri: 'Normal', pc: SLATE, vendor: 'DigiHome AI', vi: null, ai: true },
  ];
  return (
    <div className="h-full px-6 py-5 flex flex-col" style={{ background: BG }}>
      <TopHeader
        title="Saker"
        sub="3 åpne · 1 løst i dag"
        right={<>
          <div className="flex items-center gap-1 p-0.5 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {['Alle', 'Åpne', 'Pågår'].map((f, i) => <span key={f} className="px-3 h-7 flex items-center rounded-full text-[10.5px] font-semibold" style={{ fontFamily: PJ, color: i === 0 ? '#fff' : SUB, background: i === 0 ? INK : 'transparent' }}>{f}</span>)}
          </div>
          <SearchBell />
        </>}
      />
      <div className="rounded-2xl flex-1 min-h-0 overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="grid items-center px-4 py-2.5" style={{ gridTemplateColumns: '1.6fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: `1px solid ${BORDER}` }}>
          {['Sak', 'Eiendom', 'Status', 'Prioritet', 'Tildelt'].map((h) => <span key={h} className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: FAINT }}>{h}</span>)}
        </div>
        {rows.map((r, i) => (
          <div key={r.sak} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: '1.6fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${r.sc}14` }}><Wrench className="w-3.5 h-3.5" style={{ color: r.sc }} /></span>
              <span className="text-[12px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>{r.sak}</span>
            </div>
            <span className="text-[11.5px] truncate" style={{ fontFamily: PJ, color: SUB }}>{r.eiendom}</span>
            <span><span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full" style={{ fontFamily: PJ, color: r.sc, background: `${r.sc}14` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: r.sc }} />{r.status}</span></span>
            <span className="text-[10.5px] font-semibold" style={{ fontFamily: PJ, color: r.pc }}>{r.pri}</span>
            <div className="flex items-center gap-2 min-w-0">
              {r.vi ? (
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0"><img src={r.vi} alt="" className="w-full h-full object-cover" /></div>
              ) : r.ai ? (
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: `${ACCENT}16` }}><Sparkles className="w-3 h-3" style={{ color: ACCENT }} /></div>
              ) : (
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: BG, border: `1px dashed ${MUTED}` }}><Clock className="w-3 h-3" style={{ color: MUTED }} /></div>
              )}
              <span className="text-[10.5px] truncate" style={{ fontFamily: PJ, color: r.ai ? ACCENT : (r.vi ? SUB : MUTED), fontWeight: r.ai ? 600 : 400, fontStyle: (!r.vi && !r.ai) ? 'italic' : 'normal' }}>{r.vendor}</span>
            </div>
          </div>
        ))}
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
    const id = setInterval(() => setTab((t) => (t + 1) % TABS.length), 4200);
    return () => clearInterval(id);
  }, [active, pdfMode]);

  const View = VIEWS[tab];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ width: DESK_W, background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 50px 110px -40px rgba(26,22,18,0.5), 0 18px 50px -30px rgba(26,22,18,0.3)' }}>
      {/* window chrome */}
      <div className="flex items-center gap-2 px-4" style={{ height: CHROME_H, background: '#f3efe9', borderBottom: `1px solid ${BORDER}` }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e2d6c6' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e9ddcd' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#efe5d6' }} />
        <div className="mx-auto flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ border: `1.5px solid ${MUTED}`, opacity: 0.6 }} />
          <AnimatePresence mode="wait">
            <motion.span key={tab} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }} transition={{ duration: 0.3 }} className="text-[10px] font-medium" style={{ fontFamily: PJ, color: MUTED }}>{TABS[tab].url}</motion.span>
          </AnimatePresence>
        </div>
      </div>
      {/* body */}
      <div className="flex" style={{ height: BODY_H }}>
        <Sidebar tab={tab} />
        <div className="flex-1 relative overflow-hidden" style={{ background: BG }}>
          <AnimatePresence mode="sync">
            <motion.div
              key={tab}
              className="absolute inset-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease }}
            >
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
      <div className="rounded-[34px] overflow-hidden relative" style={{ background: BG, height: 498 }}>
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] font-bold" style={{ fontFamily: PJ, color: INK }}>9:41</span>
          <span className="w-3.5 h-2 rounded-[2px]" style={{ border: `1px solid ${INK}`, opacity: 0.5 }} />
        </div>
        <div className="px-4 pt-1">
          <p className="text-[11px]" style={{ fontFamily: PJ, color: SUB }}>God morgen</p>
          <p className="text-[22px] font-bold tracking-[-0.03em] leading-tight" style={{ fontFamily: PJ, color: INK }}>Martin <span style={{ fontSize: 18 }}>👋</span></p>
          {/* property card */}
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
          {/* kpi tiles */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div className="rounded-xl px-2.5 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: FAINT }}>Inntekt mnd</p>
              <p className="text-[14px] font-bold tabular-nums" style={{ fontFamily: PJ, color: INK }}>16 800 kr</p>
            </div>
            <div className="rounded-xl px-2.5 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: FAINT }}>Neste utbetaling</p>
              <p className="text-[14px] font-bold" style={{ fontFamily: PJ, color: INK }}>28. jun</p>
            </div>
          </div>
          {/* forvalter card */}
          <div className="mt-2.5 rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"><img src="/team-sarah.webp" alt="" className="w-full h-full object-cover" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: FAINT }}>Din forvalter</p>
              <p className="text-[12px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>Sarah Lia</p>
            </div>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: 'rgba(207,151,252,0.14)' }}><MessageSquare className="w-3.5 h-3.5" style={{ color: ACCENT }} /></span>
          </div>
        </div>
        {/* tab bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 pt-2 pb-3" style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${BORDER}` }}>
          {[{ i: Home, l: 'Oversikt', on: true }, { i: DollarSign, l: 'Økonomi' }, { i: Wrench, l: 'Saker' }, { i: MessageSquare, l: 'Meldinger' }].map((t) => {
            const Icon = t.i;
            return (
              <div key={t.l} className="flex flex-col items-center gap-0.5">
                <Icon className="w-[17px] h-[17px]" style={{ color: t.on ? ACCENT : FAINT }} strokeWidth={t.on ? 2.2 : 1.7} />
                <span className="text-[7.5px] font-semibold" style={{ fontFamily: PJ, color: t.on ? INK : FAINT }}>{t.l}</span>
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
      <p className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ ...FH, color: INK }}>{tag}</p>
      <p className="text-[11.5px] mt-1.5" style={{ ...F, color: '#8a8276' }}>{plan}</p>
    </div>
  );
}

/* ═══════════════════════ KOMPOSISJON ═══════════════════════ */
export default function ProductDuo({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const show = active || pdfMode;
  const anim = (d: number) => (show && !pdfMode ? `pd-in 0.9s cubic-bezier(0.16,1,0.3,1) ${d}s both` : undefined);
  return (
    <div className="w-full mx-auto" style={{ maxWidth: 1340 }}>
      <style>{`@keyframes pd-in { from { opacity:0; transform: translateY(26px); filter: blur(8px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }`}</style>
      <div className="flex items-end justify-center" style={{ gap: 28 }}>
        {/* HELT — desktop */}
        <div className="flex flex-col items-center shrink-0" style={{ animation: anim(0.1), opacity: show ? undefined : 0, zIndex: 10 }}>
          <DesktopMock active={active} pdfMode={pdfMode} />
          <DeviceLabel tag="B2B · Forvalter-plattform" plan="For profesjonelle forvaltere · Pro / Enterprise" />
        </div>
        {/* COMPANION — flytende mobil (lavere, kraftig skygge → dybde uten å skjule innhold) */}
        <div className="flex flex-col items-center shrink-0" style={{ zIndex: 30, animation: anim(0.3), opacity: show ? undefined : 0 }}>
          <PhoneMock />
          <DeviceLabel tag="B2C · Privat-utleier-app" plan="For private utleiere · Gratis / Essential" />
        </div>
      </div>
    </div>
  );
}
