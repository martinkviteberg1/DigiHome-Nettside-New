'use client';
/**
 * ProductDuo — investor-slide: «Alt du forventer. Pluss autopiloten ingen andre har.»
 *
 * Fullbredde, lys desktop-mockup av den ekte DigiHome-forvalter-plattformen.
 * En narrated, guidet tur viser FØRST bredden (et komplett CRM):
 *   Salg → Eiendommer → Saker → Kalender
 * ...og lander så på det unike: ALT flyter inn i Autopiloten.
 *
 * Bygget 1:1 mot appen (AdminLayout/OperasjonssentralPage): mørk sidebar,
 * lyst innhold, eksakt palett og fonter — uten nettleser-chrome.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Gauge, MessageSquare, UserCheck, CalendarDays, CalendarCheck,
  Radio, ClipboardList, Bot, Building2, Building, Rocket, ScrollText, FileText,
  AlertCircle, DollarSign, Home, Users, Search, Bell, Wrench,
  ChevronRight, ChevronLeft, MapPin, Sparkles, Check, Clock, Filter, History,
  RefreshCw, Wallet, ArrowUpRight, ArrowRight, Zap, Circle, Timer, Pause, CheckCircle2, Droplets, Plus, TrendingUp,
} from 'lucide-react';

/* ── fonter ── */
const PJ = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const FH = "var(--font-heading), 'PP Right Grotesk', 'Plus Jakarta Sans', sans-serif";

/* ── palett (mørk sidebar + lyst innhold, 1:1 med appen) ── */
const SIDE = '#171717';
const BG = '#fdfcfb', CARD = '#ffffff', CARDSOFT = '#f7f5fa';
const BORDER = '#eae7ef', BORDER_S = '#e2deea', HAIRLINE = '#ECE7DF';
const INK = '#1a1a1a', TXT = '#2d2d2d', SUB = '#8a8a8e', MUTED = '#b8b5be', FAINT = '#d3d0d9';
const ICONBG = '#f5f4f7';
const ACCENT = '#d298ff', ACCENT_DK = '#7c3aed', ACCENT_SOFT = '#f3ebff';
const DARKBTN = '#1a1a1a';
const GREEN = '#6aab8e', GREEN_BG = '#eef6f2', BLUE = '#7da4c9', ROSE = '#c47e86', ROSE_BG = '#faf0f1', AMBER = '#c9a06a', SLATE = '#8b8d94';
const FINN = '#06BFFC', AIRBNB = '#FF5A5F', CYAN = '#0891b2';

/* ── dimensjoner (fullbredde, uten chrome) ── */
const DESK_W = 1300;
const SIDE_W = 212;
const BODY_H = 720;
const ease = [0.22, 1, 0.36, 1] as const;

const TABS = [
  { key: 'salg', label: 'Salg' },
  { key: 'eiendommer', label: 'Eiendommer' },
  { key: 'saker', label: 'Saker' },
  { key: 'kalender', label: 'Kalender' },
  { key: 'autopilot', label: 'Autopilot' },
];

/* ── omvisnings-koreografi: tom ramme → fortellende tekst → app-UI → (naviger i sidebar → coachmark-highlight m/ forklaring) → autopilot ── */
type Focus = { scale: number; x: number; y: number };
type Beat = {
  kind: 'nav' | 'view' | 'converge';
  key: string;
  side: number;     // hvilken sidebar-modul som er markert (markør-mål)
  content: number;  // hvilken modul-skjerm som vises i innholdet
  node: number;     // fremdrifts-skinne
  dur: number;
};
const FULL: Focus = { scale: 1.0, x: 0, y: 0 };
// rolig kamera i full visning under hele turen → stabile koordinater for coachmarks
const BEATS: Beat[] = [
  { kind: 'nav',  key: 'salg',       side: 0, content: 0, node: 0, dur: 2000 },
  { kind: 'view', key: 'salg',       side: 0, content: 0, node: 0, dur: 4400 },
  { kind: 'nav',  key: 'eiendommer', side: 1, content: 0, node: 1, dur: 1900 },
  { kind: 'view', key: 'eiendommer', side: 1, content: 1, node: 1, dur: 4400 },
  { kind: 'nav',  key: 'saker',      side: 2, content: 1, node: 2, dur: 1900 },
  { kind: 'view', key: 'saker',      side: 2, content: 2, node: 2, dur: 4400 },
  { kind: 'nav',  key: 'kalender',   side: 3, content: 2, node: 3, dur: 1900 },
  { kind: 'view', key: 'kalender',   side: 3, content: 3, node: 3, dur: 4400 },
  { kind: 'converge', key: 'converge', side: 3, content: 3, node: 3, dur: 2600 },
  { kind: 'nav',  key: 'autopilot',  side: 4, content: 3, node: 4, dur: 2000 },
  { kind: 'view', key: 'autopilot',  side: 4, content: 4, node: 4, dur: 5600 },
];
const INTRO_DUR = 5200;

/* coachmark-tekst per modul (highlight-feltet måles fra faktisk DOM-element via data-hi) */
const COACH: Record<string, { no: string; t: string; d: string }> = {
  salg:       { no: '01', t: 'Salg', d: 'Fra interessent til signert leieavtale — automatisk oppfølging i hvert steg.' },
  eiendommer: { no: '02', t: 'Eiendommer', d: 'Hele porteføljen samlet — enheter, leieforhold og økonomi per eiendom.' },
  saker:      { no: '03', t: 'Saker', d: 'Drift og vedlikehold — meldt, tildelt og løst, med full sporbarhet.' },
  kalender:   { no: '04', t: 'Kalender', d: 'Belegg og dynamisk prising på tvers av kanaler.' },
  autopilot:  { no: '05', t: 'Autopilot', d: 'Ser alt fra modulene — og handler på det. Du godkjenner.' },
};
const COACH_W = 312;
type Spot = { x: number; y: number; w: number; h: number };
type Place = { spot: Spot; cx: number; cy: number };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function Spark({ data, color, w = 60, h = 20 }: any) {
  const min = Math.min(...data), max = Math.max(...data), range = (max - min) || 1;
  const pts = data.map((v: number, i: number) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  const ly = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2;
  return (
    <svg width={w} height={h} className="overflow-visible" style={{ opacity: 0.7 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

/* ═══════════════════════ SIDEBAR (mørk) ═══════════════════════ */
function NavItem({ icon: Icon, label, on, badge, badgeColor, innerRef }: any) {
  return (
    <div ref={innerRef} className="relative flex items-center gap-2.5 mx-2.5 px-2.5 rounded-lg" style={{ height: 29, zIndex: 2 }}>
      <Icon className="w-[15px] h-[15px] shrink-0" style={{ color: on ? '#cf97fc' : 'rgba(255,255,255,0.42)', transition: 'color 0.45s ease' }} strokeWidth={1.9} />
      <span className="text-[11.5px] font-medium flex-1 truncate" style={{ fontFamily: PJ, color: on ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'color 0.45s ease' }}>{label}</span>
      {badge && <span className="text-[7.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, background: badgeColor || 'rgba(207,151,252,0.2)', color: badgeColor ? '#fff' : '#cf97fc' }}>{badge}</span>}
    </div>
  );
}
function SideLabel({ children }: any) {
  return <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] px-4 pt-2.5 pb-1" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.28)' }}>{children}</p>;
}

function Sidebar({ tab, cursorOn, pulseKey }: { tab: number; cursorOn?: boolean; pulseKey?: number }) {
  const navRef = useRef<HTMLDivElement>(null);
  const rSalg = useRef<HTMLDivElement>(null);
  const rEiendommer = useRef<HTMLDivElement>(null);
  const rSaker = useRef<HTMLDivElement>(null);
  const rKalender = useRef<HTMLDivElement>(null);
  const rOperasjon = useRef<HTMLDivElement>(null);
  const tabRefs = [rSalg, rEiendommer, rSaker, rKalender, rOperasjon];
  const [ind, setInd] = useState({ top: 0, h: 0, ready: false });

  useEffect(() => {
    const el = tabRefs[tab]?.current;
    if (el) setInd({ top: el.offsetTop, h: el.offsetHeight, ready: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  const k = TABS[tab].key;

  return (
    <div className="shrink-0 flex flex-col py-3" style={{ width: SIDE_W, background: SIDE, borderRight: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="px-4 mb-2 pt-0.5">
        <img src="/img/digihome-logo-white.svg" alt="DigiHome" className="h-[21px] w-auto select-none" draggable={false} />
      </div>
      <div ref={navRef} className="relative flex-1 overflow-hidden">
        <div style={{
          position: 'absolute', left: 10, right: 10, top: ind.top, height: ind.h, borderRadius: 9,
          background: 'linear-gradient(90deg, rgba(207,151,252,0.22), rgba(207,151,252,0.05))',
          transition: 'top 0.55s cubic-bezier(0.22,1,0.36,1), height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
          opacity: ind.ready ? 1 : 0, zIndex: 1,
        }}>
          <span style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 4px 4px 0', background: 'linear-gradient(to bottom,#cf97fc,#7c5cff)', boxShadow: '0 0 12px rgba(207,151,252,0.75)' }} />
        </div>
        {/* navigasjons-markør + klikk-ripple */}
        {cursorOn && (
          <span key={'rip' + pulseKey} style={{ position: 'absolute', left: 14, top: ind.top + ind.h / 2 - 13, width: 26, height: 26, borderRadius: '50%', border: '2px solid #cf97fc', opacity: 0, zIndex: 5, pointerEvents: 'none', animation: 'pdRipple 0.8s ease-out 0.5s both' }} />
        )}
        <div style={{ position: 'absolute', left: 40, top: ind.top + ind.h / 2 - 6, zIndex: 6, pointerEvents: 'none', opacity: cursorOn ? 1 : 0, transition: 'top 0.6s cubic-bezier(0.22,1,0.36,1), left 0.3s ease, opacity 0.35s ease', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.55))' }}>
          <span key={'tap' + pulseKey} style={{ display: 'inline-block', animation: cursorOn ? 'pdTap 0.8s ease-out 0.5s both' : undefined }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 3 L5 19 L9 15 L11.5 21 L14.2 19.9 L11.8 14.2 L17 14 Z" fill="#fff" stroke="#0a0a0a" strokeWidth="1.1" strokeLinejoin="round" /></svg>
          </span>
        </div>
        <SideLabel>Arbeid</SideLabel>
        <NavItem icon={LayoutDashboard} label="Oversikt" on={false} />
        <NavItem innerRef={rOperasjon} icon={Gauge} label="Operasjonssentral" on={k === 'autopilot'} badge="Ny" />
        <NavItem icon={MessageSquare} label="Innboks" on={false} />
        <NavItem innerRef={rSalg} icon={UserCheck} label="Salg" on={k === 'salg'} />
        <NavItem icon={CalendarCheck} label="Reservasjoner" on={false} />
        <NavItem innerRef={rKalender} icon={CalendarDays} label="Kalender" on={k === 'kalender'} />
        <NavItem icon={Radio} label="Kanaler" on={false} />
        <NavItem icon={ClipboardList} label="Oppgaver" on={false} />
        <NavItem icon={Bot} label="Driftsassistent" on={false} />
        <SideLabel>Drift</SideLabel>
        <NavItem innerRef={rEiendommer} icon={Building2} label="Eiendommer" on={k === 'eiendommer'} />
        <NavItem icon={Rocket} label="Utleieprosesser" on={false} />
        <NavItem icon={ScrollText} label="Leieforhold" on={false} />
        <NavItem icon={FileText} label="Dokumenter" on={false} />
        <NavItem innerRef={rSaker} icon={AlertCircle} label="Saker" on={k === 'saker'} />
        <NavItem icon={Users} label="Personer" on={false} />
        <NavItem icon={Building} label="Organisasjon" on={false} />
      </div>
      <div className="mt-1 mx-2.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0"><img src="/team/martin-kviteberg-face.jpg" alt="" className="w-full h-full object-cover" /></div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white truncate" style={{ fontFamily: PJ }}>Martin Kviteberg</p>
          <p className="text-[9px] truncate" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.4)' }}>martin@kviteberg.no</p>
        </div>
      </div>
    </div>
  );
}

/* delte bits */
function GhostBtn({ children }: any) {
  return <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-medium" style={{ fontFamily: PJ, color: TXT, background: CARD, border: `1px solid ${BORDER}` }}>{children}</span>;
}
function DarkBtn({ children }: any) {
  return <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12.5px] font-semibold text-white" style={{ fontFamily: PJ, background: DARKBTN }}>{children}</span>;
}
function SearchBell() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px]" style={{ fontFamily: PJ, color: MUTED, background: CARD, border: `1px solid ${BORDER}` }}><Search className="w-3.5 h-3.5" />Søk…</span>
      <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}><Bell className="w-4 h-4" style={{ color: SUB }} /><span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: ROSE }} /></span>
    </div>
  );
}
function PageHead({ title, sub, right }: any) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-[27px] tracking-[-0.03em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: INK }}>{title}</h1>
        {sub && <p className="text-[12.5px] mt-1" style={{ fontFamily: PJ, color: MUTED }}>{sub}</p>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

/* ═══════════════════════ VISNING · SALG (kanban-pipeline) ═══════════════════════ */
const CHAN: Record<string, string> = { FINN, Airbnb: AIRBNB, Direkte: SLATE };
function LeadCard({ name, prop, value, chan }: any) {
  const initials = name.split(' ').map((s: string) => s[0]).join('').slice(0, 2);
  return (
    <div className="rounded-xl p-2.5" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 3px rgba(10,10,10,0.03)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ fontFamily: PJ, background: ACCENT_SOFT, color: ACCENT_DK }}>{initials}</span>
        <span className="text-[12px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>{name}</span>
      </div>
      <p className="text-[10.5px] truncate mb-2" style={{ fontFamily: PJ, color: SUB }}>{prop}</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tabular-nums" style={{ fontFamily: PJ, color: TXT }}>{value}</span>
        <span className="text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, color: CHAN[chan], background: `${CHAN[chan]}1c` }}>{chan}</span>
      </div>
    </div>
  );
}
function ViewSalg() {
  const cols = [
    { name: 'Nye', c: BLUE, leads: [{ name: 'Kari Nordmann', prop: 'Olaf Ryes vei 11C', value: '16 800', chan: 'FINN' }, { name: 'Jonas Vik', prop: 'Kalfaret 22B', value: '14 200', chan: 'Airbnb' }, { name: 'Sofie Lien', prop: 'Nøstegaten 6', value: '13 500', chan: 'FINN' }] },
    { name: 'Kvalifisert', c: ACCENT_DK, leads: [{ name: 'Mari Holt', prop: 'Strandgaten 44', value: '18 400', chan: 'Direkte' }, { name: 'Tomas Aas', prop: 'Møhlenpris 12', value: '15 900', chan: 'FINN' }] },
    { name: 'Visning', c: AMBER, leads: [{ name: 'Erik Sund', prop: 'Nygårdsgaten 15', value: '15 000', chan: 'FINN' }, { name: 'Nina Dahl', prop: 'Kong Oscars 8', value: '14 700', chan: 'Airbnb' }] },
    { name: 'Tilbud', c: CYAN, leads: [{ name: 'Lise Berg', prop: 'Damsgårdsveien 9', value: '17 200', chan: 'FINN' }, { name: 'Henrik Vold', prop: 'Sandviken 31', value: '19 100', chan: 'Direkte' }] },
    { name: 'Vunnet', c: GREEN, leads: [{ name: 'Anna Berg', prop: 'Camilla Colletts 14A', value: '16 800', chan: 'Direkte' }, { name: 'Petter Ruud', prop: 'Fjellveien 22', value: '15 400', chan: 'FINN' }] },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: BG }}>
      <PageHead title="Salg" sub="Pipeline · 12 aktive leads · 1,2 M kr i potensial"
        right={<><GhostBtn><Filter className="w-3.5 h-3.5" />Filter</GhostBtn><DarkBtn><Plus className="w-3.5 h-3.5" />Ny lead</DarkBtn></>} />
      <div className="grid grid-cols-5 gap-3 flex-1 min-h-0">
        {cols.map((col, i) => (
          <div key={col.name} {...(i === 0 ? { 'data-hi': '1' } : {})} className="flex flex-col gap-2.5 rounded-2xl p-2.5" style={{ background: CARDSOFT }}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: col.c }} /><span className="text-[11px] font-bold" style={{ fontFamily: PJ, color: TXT }}>{col.name}</span></div>
              <span className="text-[9.5px] font-bold px-1.5 rounded-full" style={{ fontFamily: PJ, color: SUB, background: CARD }}>{col.leads.length}</span>
            </div>
            {col.leads.map((l) => <LeadCard key={l.name} {...l} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING · EIENDOMMER (kort-grid) ═══════════════════════ */
function ViewEiendommer() {
  const props = [
    { addr: 'Kalfaret 22B', img: '/interior-living.webp', units: '1 enhet', occ: 'Utleid', oc: GREEN, rent: '16 800' },
    { addr: 'Olaf Ryes vei 11C', img: '/bergen-houses.webp', units: '4 enheter', occ: '75 % utleid', oc: AMBER, rent: '58 400' },
    { addr: 'Nygårdsgaten 15', img: '/interior-kitchen.webp', units: '1 enhet', occ: 'Ledig', oc: AMBER, rent: '14 200' },
    { addr: 'Strandgaten 44', img: '/interior-bedroom.webp', units: '1 enhet', occ: 'Utleid', oc: GREEN, rent: '18 400' },
    { addr: 'Damsgårdsveien 9', img: '/bryggen-alley.webp', units: '2 enheter', occ: '100 % utleid', oc: GREEN, rent: '31 600' },
    { addr: 'Vestre Torvgate 7', img: '/interior-dining.webp', units: '3 enheter', occ: '100 % utleid', oc: GREEN, rent: '47 100' },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: BG }}>
      <PageHead title="Eiendommer" sub="142 eiendommer · 137 utleid · 96 % belegg"
        right={<><span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px]" style={{ fontFamily: PJ, color: MUTED, background: CARD, border: `1px solid ${BORDER}` }}><Search className="w-3.5 h-3.5" />Søk…</span><DarkBtn><Plus className="w-3.5 h-3.5" />Legg til</DarkBtn></>} />
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        {props.map((p, i) => (
          <div key={p.addr} {...(i === 0 ? { 'data-hi': '1' } : {})} className="rounded-2xl overflow-hidden flex flex-col" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(10,10,10,0.03)' }}>
            <div className="relative" style={{ height: 96 }}>
              <img src={p.img} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ fontFamily: PJ, color: '#fff', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>{p.units}</span>
            </div>
            <div className="px-3.5 py-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[13px] font-semibold leading-tight" style={{ fontFamily: PJ, color: INK }}>{p.addr}</p>
                <p className="text-[10.5px] mt-0.5 flex items-center gap-1" style={{ fontFamily: PJ, color: MUTED }}><MapPin className="w-2.5 h-2.5" />Bergen</p>
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ fontFamily: PJ, color: p.oc, background: `${p.oc}1c` }}>{p.occ}</span>
                <span className="text-[11.5px] font-bold tabular-nums" style={{ fontFamily: PJ, color: TXT }}>{p.rent} <span className="text-[9px] font-normal" style={{ color: MUTED }}>kr/mnd</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING · SAKER ═══════════════════════ */
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
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: BG }}>
      <PageHead title="Saker" sub="3 åpne · 1 løst i dag"
        right={<><div className="flex items-center gap-1 p-0.5 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}>{['Alle', 'Åpne', 'Pågår'].map((f, i) => <span key={f} className="px-3.5 h-8 flex items-center rounded-full text-[11.5px] font-semibold" style={{ fontFamily: PJ, color: i === 0 ? '#fff' : SUB, background: i === 0 ? DARKBTN : 'transparent' }}>{f}</span>)}</div><SearchBell /></>} />
      <div className="rounded-2xl flex-1 min-h-0 overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="grid items-center px-5 py-3" style={{ gridTemplateColumns: '1.7fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: `1px solid ${BORDER}` }}>
          {['Sak', 'Eiendom', 'Status', 'Prioritet', 'Tildelt'].map((h) => <span key={h} className="text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: MUTED }}>{h}</span>)}
        </div>
        {rows.map((r, i) => { const s = ST[r.status]; const ty = TYP[r.typ]; const pr = PRC[r.pri]; const SIcon = s.icon; const TIcon = ty.icon; return (
          <div key={r.sak} {...(i === 0 ? { 'data-hi': '1' } : {})} className="grid items-center px-5 py-3.5" style={{ gridTemplateColumns: '1.7fr 1.2fr 0.9fr 0.9fr 1.2fr', borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: ty.bg }}><TIcon className="w-4 h-4" style={{ color: ty.c }} strokeWidth={1.9} /></span>
              <span className="text-[13px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>{r.sak}</span>
            </div>
            <span className="text-[12px] truncate" style={{ fontFamily: PJ, color: SUB }}>{r.eiendom}</span>
            <span><span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ fontFamily: PJ, color: s.c, background: s.bg }}><SIcon className="w-3 h-3" strokeWidth={2.2} />{s.label}</span></span>
            <span className="text-[11.5px] font-semibold" style={{ fontFamily: PJ, color: pr.c }}>{pr.label}</span>
            <div className="flex items-center gap-2 min-w-0">
              {r.vi ? <div className="w-6 h-6 rounded-full overflow-hidden shrink-0"><img src={r.vi} alt="" className="w-full h-full object-cover" /></div>
                : r.ai ? <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: ACCENT_SOFT }}><Sparkles className="w-3 h-3" style={{ color: ACCENT_DK }} /></div>
                : <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center" style={{ background: BG, border: `1px dashed ${MUTED}` }}><Clock className="w-3 h-3" style={{ color: MUTED }} /></div>}
              <span className="text-[11.5px] truncate" style={{ fontFamily: PJ, color: r.ai ? ACCENT_DK : (r.vi ? SUB : MUTED), fontWeight: r.ai ? 600 : 400, fontStyle: (!r.vi && !r.ai) ? 'italic' : 'normal' }}>{r.vendor}</span>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}

/* ═══════════════════════ VISNING · KALENDER ═══════════════════════ */
const CH = { airbnb: '#FF5A5F', booking: '#003580', finn: '#06BFFC', dynamic: '#7c3aed', blocked: '#94a3b8' };
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
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: BG }}>
      <PageHead title="Kalender"
        right={<><span className="inline-flex items-center gap-2.5 h-9 px-2.5 rounded-full" style={{ background: CARD, border: `1px solid ${BORDER}` }}><ChevronLeft className="w-4 h-4" style={{ color: MUTED }} /><span className="text-[12.5px] font-semibold" style={{ fontFamily: PJ, color: INK }}>Juni 2026</span><ChevronRight className="w-4 h-4" style={{ color: MUTED }} /></span><SearchBell /></>} />
      <div className="flex items-center gap-3.5 mb-3">
        {legend.map((g) => <span key={g.l} className="inline-flex items-center gap-1.5 text-[10.5px] font-medium" style={{ fontFamily: PJ, color: SUB }}><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: g.c }} />{g.l}</span>)}
      </div>
      <div data-hi="1" className="rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
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

/* ═══════════════════════ VISNING · AUTOPILOT (konvergens + kilde-tagger) ═══════════════════════ */
const CAT: Record<string, { bg: string; fg: string; icon: any }> = {
  Forvaltningsavtale: { bg: '#EBE7FC', fg: '#6D28D9', icon: ScrollText },
  Annonse: { bg: '#FBE5F6', fg: '#C026D3', icon: Rocket },
  Depositum: { bg: '#E2F5EC', fg: '#089B6A', icon: Wallet },
};
function ViewOperasjon() {
  const items = [
    { cat: 'Forvaltningsavtale', ctx: 'BYTT METODE DEMO', title: 'Forvaltningsavtale venter på signering', why: null, hi: true, src: 'Eiendommer' },
    { cat: 'Annonse', ctx: 'OLAF RYES VEI 11C · ENHET 10', title: 'Ledig bolig – klar for annonse', why: 'Ledig nå · ingen annonse eller kontrakt', hi: true, src: 'Salg' },
    { cat: 'Annonse', ctx: 'DEICHMANS GATE 2A · ENHET H0101', title: 'Ledig bolig – forvaltningsavtale mangler', why: 'Ledig nå · signer avtale før annonsering', hi: true, src: 'Utleieprosesser' },
    { cat: 'Depositum', ctx: 'RØO 93 · ENHET HOVEDENHET', title: 'Depositum venter på betaling', why: '90 000 kr', hi: false, src: 'Leieforhold' },
  ];
  return (
    <div className="h-full px-7 py-6 flex flex-col" style={{ background: BG }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5" style={{ fontFamily: PJ, color: MUTED, fontWeight: 700 }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT_DK }} />Operasjonssentral · mandag 22. juni</p>
          <h1 className="text-[42px] leading-[0.92]" style={{ fontFamily: FH, fontWeight: 800, letterSpacing: '-0.04em', color: INK }}>Autopilot</h1>
          <p className="text-[13.5px] mt-2.5" style={{ fontFamily: PJ, color: SUB }}>Du har <span style={{ color: INK, fontWeight: 700 }}>4</span> gjøremål — samlet fra hele plattformen.</p>
        </div>
        <div className="flex items-center gap-2">
          <GhostBtn><Filter className="w-3.5 h-3.5" />Filter</GhostBtn>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-semibold" style={{ fontFamily: PJ, color: INK, background: CARD, border: `1px solid ${BORDER}` }}><Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT_DK }} />Autopilot <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ background: ACCENT_DK, fontWeight: 800 }}>På</span></span>
          <GhostBtn><History className="w-3.5 h-3.5" />Historikk</GhostBtn>
          <GhostBtn><RefreshCw className="w-3.5 h-3.5" />Oppdater</GhostBtn>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {items.map((a, i) => {
          const cc = CAT[a.cat]; const Icon = cc.icon;
          return (
            <div key={a.title} {...(i === 0 ? { 'data-hi': '1' } : {})} className="group relative rounded-[20px] overflow-hidden flex items-center gap-4 px-5 py-4" style={{ background: CARD, border: `1px solid ${HAIRLINE}`, boxShadow: '0 2px 8px rgba(10,10,10,0.03)' }}>
              <div className="w-14 h-14 rounded-[16px] shrink-0 flex items-center justify-center" style={{ background: cc.bg }}><Icon className="w-6 h-6" style={{ color: cc.fg }} strokeWidth={2} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.hi ? '#ea580c' : '#cbc6bd' }} />
                  <p className="text-[10px] uppercase tracking-[0.13em] truncate" style={{ fontFamily: PJ, color: MUTED, fontWeight: 700 }}>{a.cat}<span className="opacity-50"> · </span><span style={{ color: SUB }}>{a.ctx}</span></p>
                </div>
                <p className="text-[17px] leading-[1.2] truncate" style={{ fontFamily: FH, fontWeight: 700, letterSpacing: '-0.015em', color: INK }}>{a.title}</p>
                {a.why && <p className="text-[12.5px] truncate mt-1" style={{ fontFamily: PJ, color: MUTED }}>{a.why}</p>}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-full shrink-0" style={{ fontFamily: PJ, color: ACCENT_DK, background: ACCENT_SOFT }}><ArrowRight className="w-3 h-3" strokeWidth={2.5} />fra {a.src}</span>
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ color: MUTED, background: '#f4f2f7' }}><ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.2} /></span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[11px] mt-4 flex items-center justify-center gap-1.5" style={{ fontFamily: PJ, color: MUTED }}>Alt samlet ett sted <span style={{ color: FAINT }}>·</span> <Zap className="w-3 h-3" style={{ color: ACCENT_DK }} /> autopiloten kjører handlingen direkte</p>
    </div>
  );
}

const VIEWS = [ViewSalg, ViewEiendommer, ViewSaker, ViewKalender, ViewOperasjon];

const VIEW_KEYS = ['salg', 'eiendommer', 'saker', 'kalender', 'autopilot'];

/* ═══════════════════════ INTRO-TEKST (inne i rammen, fortellende progressiv reveal) ═══════════════════════ */
function IntroCard() {
  const line1 = 'Alt du forventer.'.split(' ');
  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center px-16 overflow-hidden"
      style={{ background: 'radial-gradient(120% 120% at 50% 18%, #1a1726 0%, #100f17 48%, #0a0910 100%)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(6px)' }}
      transition={{ duration: 0.95, ease }}
    >
      {/* ambient glød + fin grid (puster sakte inn) */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(50% 50% at 50% 40%, rgba(210,152,255,0.18), transparent 70%)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.2, ease }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 30%, transparent 80%)' }} />

      {/* kicker */}
      <motion.span
        className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.4em] mb-8"
        style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.5)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.6 }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }} />
        DigiHome-plattformen
      </motion.span>

      <h2 className="leading-[1.04] tracking-[-0.035em]" style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(34px, 4.4vw, 62px)' }}>
        {/* linje 1 — bygges ord for ord (oppsett) */}
        <span className="block" style={{ color: '#fbfaff' }}>
          {line1.map((w, i) => (
            <motion.span key={i} className="inline-block" style={{ marginRight: '0.24em' }}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease, delay: 1.5 + i * 0.1 }}>{w}</motion.span>
          ))}
        </span>
        {/* tynn aksent-linje som tegnes mellom oppsett og payoff */}
        <motion.span className="block mx-auto my-3 rounded-full" style={{ height: 2, background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`, transformOrigin: 'center' }}
          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.9, ease, delay: 2.4 }} />
        {/* linje 2 — payoff, lander samlet med glød */}
        <motion.span
          className="block" initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.0, ease, delay: 2.9 }}
          style={{ backgroundImage: `linear-gradient(100deg, ${ACCENT} 0%, #e9ccff 55%, #b07be0 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 22px rgba(210,152,255,0.28))' }}
        >
          Pluss autopiloten ingen andre har.
        </motion.span>
      </h2>

      {/* CTA-linje */}
      <motion.p
        className="mt-9 text-[15px] font-light" style={{ fontFamily: "var(--font-body), 'ABC Diatype', sans-serif", color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 3.9 }}
      >
        <span style={{ color: 'rgba(255,255,255,0.74)' }}>Salg</span> · Eiendommer · Saker · Kalender — ett system.&nbsp;&nbsp;
        <span style={{ color: '#fff', fontWeight: 500 }}>La oss ta en omvisning</span>
        <motion.span className="inline-block" initial={{ x: -4, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, ease, delay: 4.4 }}>
          <ArrowRight className="inline-block w-4 h-4 ml-1.5 -mt-0.5" style={{ color: ACCENT }} strokeWidth={2.4} />
        </motion.span>
      </motion.p>
    </motion.div>
  );
}

/* ═══════════════════════ DESKTOP-MOCKUP (rolig kamera + nav-markør + coachmark guided tour) ═══════════════════════ */
function DesktopMock({ phase, beat, pulseKey }: { phase: 'intro' | 'tour'; beat: Beat; pulseKey: number }) {
  const View = VIEWS[beat.content];
  const isNav = beat.kind === 'nav';
  const isView = beat.kind === 'view';
  const isConv = beat.kind === 'converge';
  const isAuto = beat.key === 'autopilot' && isView;
  const coach = isView ? COACH[beat.key] : null;

  const frameRef = useRef<HTMLDivElement>(null);
  const curContent = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  // mål faktisk highlight-element (data-hi) → posisjoner spotlight + forklaringsboks
  useEffect(() => {
    if (!isView || !coach) { setPlace(null); return; }
    let t1: any, t2: any;
    const measure = () => {
      const frame = frameRef.current; const cur = curContent.current;
      if (!frame || !cur) return false;
      const el = cur.querySelector('[data-hi]') as HTMLElement | null;
      if (!el) return false;
      const fr = frame.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const s = fr.width / DESK_W;
      if (s <= 0 || er.width <= 0) return false;
      const pad = 9;
      const spot: Spot = {
        x: Math.max(4, (er.left - fr.left) / s - pad),
        y: Math.max(4, (er.top - fr.top) / s - pad),
        w: er.width / s + pad * 2,
        h: er.height / s + pad * 2,
      };
      // velg side med mest plass: høyre → under → venstre → over → fallback (over highlight, nederst)
      const GAP = 26;
      const rightRoom = (DESK_W - 22) - (spot.x + spot.w + GAP);
      const belowRoom = (BODY_H - 20) - (spot.y + spot.h + GAP);
      const leftRoom = (spot.x - GAP) - 22;
      const aboveRoom = (spot.y - GAP) - 16;
      let cx: number, cy: number;
      if (rightRoom >= COACH_W) {
        cx = spot.x + spot.w + GAP;
        cy = clamp(spot.y + spot.h / 2 - 74, 18, BODY_H - 172);
      } else if (belowRoom >= 150) {
        cx = clamp(spot.x + spot.w / 2 - COACH_W / 2, SIDE_W + 18, DESK_W - COACH_W - 20);
        cy = spot.y + spot.h + GAP;
      } else if (leftRoom >= COACH_W) {
        cx = spot.x - GAP - COACH_W;
        cy = clamp(spot.y + spot.h / 2 - 74, 18, BODY_H - 172);
      } else if (aboveRoom >= 150) {
        cx = clamp(spot.x + spot.w / 2 - COACH_W / 2, SIDE_W + 18, DESK_W - COACH_W - 20);
        cy = clamp(spot.y - GAP - 150, 16, BODY_H - 172);
      } else {
        // highlight fyller flaten → flytende kort nede til høyre inni feltet
        cx = clamp(spot.x + spot.w - COACH_W - 20, SIDE_W + 18, DESK_W - COACH_W - 20);
        cy = clamp(spot.y + spot.h - 168, 18, BODY_H - 172);
      }
      setPlace({ spot, cx, cy });
      return true;
    };
    t1 = setTimeout(() => { if (!measure()) t2 = setTimeout(measure, 380); }, 560);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat.key, beat.kind, beat.content]);

  return (
    <div ref={frameRef} className="rounded-[24px] overflow-hidden relative" style={{ width: DESK_W, background: BG, border: `1px solid ${BORDER_S}`, boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 60px 130px -44px rgba(26,22,18,0.46), 0 24px 60px -34px rgba(26,22,18,0.26)' }}>
      {/* app-flate (rolig — full visning hele turen) */}
      <div className="flex" style={{ height: BODY_H }}>
        <Sidebar tab={beat.side} cursorOn={isNav} pulseKey={pulseKey} />
        <div className="flex-1 relative overflow-hidden" style={{ background: BG }}>
          <AnimatePresence mode="sync">
            <motion.div key={beat.content} ref={(el) => { if (el) curContent.current = el; }} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease }}>
              <View />
            </motion.div>
          </AnimatePresence>
          {/* nav-dim: under navigasjon dempes innholdet så fokus er på sidebaren */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(8,7,12,0.5)', opacity: isNav ? 1 : 0, transition: 'opacity 0.7s ease' }} />
        </div>
      </div>

      {/* fin konstant vignett for dybde */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 45%, transparent 60%, rgba(12,10,18,0.12) 100%)' }} />

      {/* ── COACHMARK: dimmer hele mockupen, highlighter det målte elementet, forklaring ved siden av ── */}
      <AnimatePresence>
        {coach && place && (
          <motion.div key={beat.key} className="absolute inset-0 z-20 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease }}>
            {/* highlight-felt (box-shadow dimmer alt utenfor) */}
            <motion.div className="absolute rounded-[14px]"
              initial={{ left: place.spot.x, top: place.spot.y, width: place.spot.w, height: place.spot.h }}
              animate={{ left: place.spot.x, top: place.spot.y, width: place.spot.w, height: place.spot.h }}
              transition={{ duration: 0.7, ease }}
              style={{ boxShadow: '0 0 0 9999px rgba(8,6,14,0.6)', border: '1.5px solid rgba(210,152,255,0.7)', animation: 'pdGlow 2.8s ease-in-out infinite' }} />
            {/* forklaringsboks */}
            <motion.div className="absolute" style={{ left: place.cx, top: place.cy, width: COACH_W }}
              initial={{ opacity: 0, y: 16, filter: 'blur(7px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.7, ease, delay: 0.35 }}>
              <div className="rounded-[18px] px-5 py-4" style={{ background: 'rgba(17,14,24,0.86)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold" style={{ fontFamily: PJ, background: 'rgba(210,152,255,0.16)', color: ACCENT, border: `1px solid ${ACCENT}3a` }}>{coach.no}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.4)' }}>{coach.no} / 05</span>
                </div>
                <p className="text-[18px] font-semibold leading-tight mb-1.5" style={{ fontFamily: FH, color: '#fff', letterSpacing: '-0.015em' }}>{coach.t}</p>
                <p className="text-[12.5px] font-light leading-snug" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.62)' }}>{coach.d}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* autopilot-pille */}
      <AnimatePresence>
        {isAuto && (
          <motion.div className="absolute bottom-5 right-6 z-30 inline-flex items-center gap-2 h-10 px-4 rounded-full" style={{ background: '#0a0a0a', boxShadow: '0 12px 30px -8px rgba(0,0,0,0.45), 0 0 0 4px rgba(207,151,252,0.1)' }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease, delay: 0.8 }}>
            <Sparkles className="w-4 h-4" style={{ color: ACCENT }} strokeWidth={2} />
            <span className="text-[12.5px] font-semibold text-white" style={{ fontFamily: PJ }}>Spør Autopilot</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* konvergens-tekst */}
      <AnimatePresence>
        {isConv && (
          <motion.div className="absolute inset-0 z-30 flex items-center justify-center text-center px-12"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(10,9,16,0.62), rgba(10,9,16,0.4))', backdropFilter: 'blur(2px)' }} />
            <motion.h3 className="relative leading-[1.05] tracking-[-0.03em]" style={{ fontFamily: FH, fontWeight: 700, fontSize: 'clamp(28px, 3.4vw, 46px)', color: '#fff' }}
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease, delay: 0.2 }}>
              Alt dette flyter inn i{' '}
              <span style={{ backgroundImage: `linear-gradient(100deg, ${ACCENT}, #e9ccff)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>autopiloten.</span>
            </motion.h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* intro-kort */}
      <AnimatePresence>{phase === 'intro' && <IntroCard />}</AnimatePresence>
    </div>
  );
}

/* ═══════════════════════ FREMDRIFTS-SKINNE ═══════════════════════ */
function Rail({ phase, node }: { phase: 'intro' | 'tour'; node: number }) {
  const active = phase === 'tour' ? node : -1;
  const progress = active < 0 ? 0 : active / (VIEW_KEYS.length - 1);
  return (
    <div className="mt-8 mx-auto" style={{ maxWidth: 760 }}>
      <div className="relative flex items-center justify-between px-2">
        {/* bakgrunns-linje */}
        <span className="absolute left-6 right-6 top-[7px] h-[2px] rounded-full" style={{ background: '#ded9e4' }} />
        {/* fyll-linje */}
        <span className="absolute left-6 top-[7px] h-[2px] rounded-full" style={{ width: `calc((100% - 48px) * ${progress})`, background: `linear-gradient(90deg, ${ACCENT_DK}, ${ACCENT})`, boxShadow: `0 0 12px ${ACCENT}66`, transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)' }} />
        {TABS.map((t, i) => {
          const on = active === i;
          const done = active > i;
          const isAuto = i === 4;
          const isIntro = active < 0;
          return (
            <div key={t.key} className="relative z-10 flex flex-col items-center gap-2" style={{ width: 90 }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{
                background: on ? ACCENT : done ? ACCENT_DK : (isIntro ? '#eceaf1' : CARD),
                border: `1.5px solid ${on || done ? ACCENT_DK : (isIntro ? '#c7c2d1' : BORDER)}`,
                boxShadow: on ? `0 0 0 5px ${ACCENT}26` : 'none',
                transition: 'all 0.5s ease',
              }}>
                {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                {on && isAuto && <Sparkles className="w-2.5 h-2.5 text-white" strokeWidth={2.4} />}
              </span>
              <span className="text-[11px] font-semibold whitespace-nowrap" style={{
                fontFamily: PJ,
                color: on ? (isAuto ? ACCENT_DK : INK) : done ? SUB : (isIntro ? '#6f6b76' : MUTED),
                fontWeight: on ? 700 : isIntro ? 600 : 500,
                transition: 'color 0.5s ease',
              }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════ KOMPOSISJON (fullbredde, skala-til-fyll) ═══════════════════════ */
export default function ProductDuo({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const show = active || pdfMode;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(DESK_W);
  const [phase, setPhase] = useState<'intro' | 'tour'>('intro');
  const [bi, setBi] = useState(0);

  useEffect(() => {
    const update = () => { if (wrapRef.current) setCw(wrapRef.current.offsetWidth); };
    update();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && wrapRef.current) { ro = new ResizeObserver(update); ro.observe(wrapRef.current); }
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); if (ro) ro.disconnect(); };
  }, []);

  // PDF: statisk autopilot-visning, ingen timere
  const autoIdx = BEATS.findIndex((b) => b.key === 'autopilot' && b.kind === 'view');

  useEffect(() => {
    if (pdfMode) { setPhase('tour'); setBi(autoIdx); return; }
    if (!active) { setPhase('intro'); setBi(0); return; }
    setPhase('intro'); setBi(0);
    const t = setTimeout(() => { setPhase('tour'); setBi(0); }, INTRO_DUR);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pdfMode]);

  useEffect(() => {
    if (!active || pdfMode || phase !== 'tour') return;
    const t = setTimeout(() => setBi((b) => (b + 1) % BEATS.length), BEATS[bi].dur);
    return () => clearTimeout(t);
  }, [active, pdfMode, phase, bi]);

  const introBeat: Beat = { kind: 'view', key: 'intro', side: 0, content: 0, node: -1, dur: 0 };
  const beat = phase === 'intro' ? introBeat : BEATS[bi];

  const scale = Math.min(1.06, cw / DESK_W);
  const anim = show && !pdfMode ? 'pd-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both' : undefined;

  return (
    <div ref={wrapRef} className="w-full">
      <style>{`
        @keyframes pd-in { from { opacity:0; transform: translateY(26px); filter: blur(8px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes pdRipple { 0% { transform: scale(0.4); opacity: 0.85; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes pdTap { 0% { transform: scale(1); } 38% { transform: scale(0.8); } 100% { transform: scale(1); } }
        @keyframes pdGlow { 0%,100% { box-shadow: 0 0 0 9999px rgba(8,6,14,0.62), 0 0 22px 1px rgba(210,152,255,0.25); } 50% { box-shadow: 0 0 0 9999px rgba(8,6,14,0.62), 0 0 34px 4px rgba(210,152,255,0.45); } }
      `}</style>
      <div style={{ animation: anim, opacity: show ? undefined : 0 }}>
        <div style={{ height: BODY_H * scale, position: 'relative' }}>
          <div style={{ width: DESK_W, transform: `scale(${scale})`, transformOrigin: 'top center', position: 'absolute', left: '50%', marginLeft: -DESK_W / 2, top: 0 }}>
            <DesktopMock phase={phase} beat={beat} pulseKey={phase === 'tour' ? bi : -1} />
          </div>
        </div>
        <Rail phase={phase} node={phase === 'tour' ? BEATS[bi].node : -1} />
      </div>
    </div>
  );
}
