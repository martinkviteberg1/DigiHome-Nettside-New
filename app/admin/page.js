'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Loader2, Lock, BarChart3, Users, CreditCard, FileText, LogOut,
  Menu, X, ChevronRight, ChevronDown, ShieldCheck, Sparkles, MessageSquare,
  LayoutDashboard, Radio, Activity, GitBranch, Gauge, Megaphone, Database,
  Command, Search, CornerDownLeft, LayoutTemplate, Crosshair, TrendingUp, Wallet,
  Globe, ExternalLink, PenLine, Mail, Home, History, Landmark, Wand2, Layers, UserPlus,
  ClipboardCheck, CalendarDays, ArrowLeft, KeyRound, Check, User, Eye, EyeOff,
} from 'lucide-react';
import InnsiktDashboard from '@/components/admin/InnsiktDashboard';
import KpiDashboard from '@/components/admin/KpiDashboard';
import FinanceDashboard from '@/components/admin/FinanceDashboard';
import CustomersDashboard from '@/components/admin/CustomersDashboard';
import AgentBridge from '@/components/admin/AgentBridge';
import PlaybookTab from '@/components/admin/PlaybookTab';
import NewsletterTab from '@/components/admin/NewsletterTab';
import LandingPagesTab from '@/components/admin/LandingPagesTab';
import PropertiesTab from '@/components/admin/PropertiesTab';
import HistoryTab from '@/components/admin/HistoryTab';
import InvestorRoomTab from '@/components/admin/InvestorRoomTab';
import SeoAeoTab from '@/components/admin/SeoAeoTab';
import TasksTab from '@/components/admin/TasksTab';
import MeetingsTab from '@/components/admin/MeetingsTab';

const SESSION_KEY = 'dh_admin_session';
const LEGACY_KEY = 'dh_admin_key';

// Menystruktur 2026 — gruppert etter jobben som skal gjøres, ikke etter modul.
// Elementer med `insight` peker inn i Innsikt-motoren (samme data, ny inngang).
const NAV = [
  {
    group: 'Ledelse',
    items: [
      { k: 'nokkeltall', l: 'Nøkkeltall', icon: TrendingUp, desc: 'Investorklare KPIer · CAC · LTV · konvertering' },
      { k: 'okonomi', l: 'Økonomi', icon: Wallet, desc: 'Resultat · likviditet · burn · runway' },
      { k: 'saker', l: 'Saker', icon: ClipboardCheck, badge: 'tasks', desc: 'Internt sakssystem — oppfølging, frister og ansvar' },
      { k: 'moter', l: 'Møter', icon: CalendarDays, desc: 'Styremøter & ledermøter — agenda, referat, vedtak og aksjonspunkter' },
      { k: 'investorrom', l: 'Investor-rom', icon: Landmark, desc: 'Levende DD-rom — tilgangslenker, dokumenter & Q&A' },
      { k: 'playbook', l: 'Playbook', icon: FileText, desc: 'Marketing-strategi · konkurrentanalyse · 90-dagersplan' },
    ],
  },
  {
    group: 'Salg',
    items: [
      { k: 'i-leads', insight: 'leads', l: 'Leads', icon: UserPlus, badge: 'pending', desc: 'Innkommende leads — status, kilde og CRM-synk' },
      { k: 'kunder', l: 'Kunder', icon: Users, desc: 'Utleiere · kontrakter · MRR fra plattformen' },
      { k: 'historikk', l: 'Historikk', icon: History, desc: 'Leads fra før sporingen — sett kilde & verdi manuelt' },
      { k: 'abonnementer', l: 'Abonnementer', icon: CreditCard, soon: true, desc: 'Aktive avtaler & fakturering' },
    ],
  },
  {
    group: 'Markedsføring',
    items: [
      { k: 'i-annonser', insight: 'annonser', l: 'Annonser', icon: Megaphone, desc: 'Meta & Google Ads — forbruk, ROAS og resultater' },
      { k: 'i-annonsestudio', insight: 'annonsestudio', l: 'Annonsestudio', icon: Wand2, desc: 'Lag og publiser annonser med AI' },
      { k: 'nyhetsbrev', l: 'Nyhetsbrev', icon: Mail, desc: 'E-post til leads & kunder — komponer, test og send' },
      { k: 'landingssider', l: 'Landingssider', icon: LayoutTemplate, desc: 'Kampanjesider · annonse-LP-er · hovedsider — med live ytelse' },
      { k: 'i-finnstudio', insight: 'finnstudio', l: 'FINN-studio', icon: Layers, desc: 'FINN-annonser — analyse og optimalisering' },
      { k: 'i-konkurrent', insight: 'konkurrent', l: 'Konkurrentanalyse', icon: Crosshair, desc: 'Overvåk konkurrentene i Bergen' },
      { k: 'seo', l: 'SEO & AEO', icon: Globe, desc: 'Google-posisjoner · AI-synlighet · teknisk SEO-helse' },
    ],
  },
  {
    group: 'Analyse',
    items: [
      { k: 'i-oversikt', insight: 'oversikt', l: 'Oversikt', icon: LayoutDashboard, desc: 'Totalbildet — trafikk, leads og kanaler' },
      { k: 'i-trafikk', insight: 'trafikk', l: 'Trafikk', icon: Activity, desc: 'Økter, kilder og sider — cookieless' },
      { k: 'i-live', insight: 'live', l: 'Sanntid', icon: Radio, desc: 'Hvem er på nettsiden akkurat nå' },
      { k: 'i-trakt', insight: 'trakt', l: 'Trakt & A/B', icon: GitBranch, desc: 'Konverteringstrakt og eksperimenter' },
      { k: 'i-innsikt', insight: 'innsikt', l: 'Lead-innsikt', icon: BarChart3, desc: 'Dybdeinnsikt i leads og segmenter' },
      { k: 'i-leiemarked', insight: 'leiemarked', l: 'Leiemarked', icon: Database, desc: 'Leiepriser og markedsdata for Bergen' },
      { k: 'i-ytelse', insight: 'ytelse', l: 'Ytelse', icon: Gauge, desc: 'Web Vitals og teknisk ytelse' },
      { k: 'i-ai', insight: 'ai', l: 'AI-assistent', icon: Sparkles, desc: 'Spør AI om dataene dine' },
    ],
  },
  {
    group: 'Innhold',
    items: [
      { k: 'artikler', l: 'Artikler', icon: FileText, href: '/admin/artikler' },
      { k: 'boliger', l: 'Boliger', icon: Home, desc: 'Vis forvaltede boliger på forsiden — synk & synlighet' },
    ],
  },
  {
    group: 'Koordinering',
    items: [
      { k: 'bro', l: 'Agent-bro', icon: MessageSquare, desc: 'Meldinger til/fra plattform-prosjektet' },
    ],
  },
];

const INSIGHT_TABS = [
  { k: 'oversikt', l: 'Oversikt', icon: LayoutDashboard },
  { k: 'leads', l: 'Leads', icon: Users, badge: 'pending' },
  { k: 'live', l: 'Sanntid', icon: Radio },
  { k: 'trafikk', l: 'Trafikk', icon: Activity },
  { k: 'trakt', l: 'Trakt & A/B', icon: GitBranch },
  { k: 'annonser', l: 'Annonser', icon: Megaphone },
  { k: 'annonsestudio', l: 'Annonsestudio', icon: Wand2 },
  { k: 'finnstudio', l: 'FINN-studio', icon: Layers },
  { k: 'konkurrent', l: 'Konkurrentanalyse', icon: Crosshair },
  { k: 'innsikt', l: 'Lead-innsikt', icon: BarChart3 },
  { k: 'leiemarked', l: 'Leiemarked', icon: Database },
  { k: 'ytelse', l: 'Ytelse', icon: Gauge },
  { k: 'ai', l: 'AI-assistent', icon: Sparkles },
];

const SECTION_TITLES = {
  nokkeltall: { t: 'Nøkkeltall', s: 'Investorklare KPIer · CAC · LTV · tid til kunde · konvertering' },
  investorrom: { t: 'Investor-rom', s: 'Levende DD-rom — del tilgangslenker, administrer dokumenthvelv og svar på investorspørsmål. All aktivitet logges' },
  playbook: { t: 'Playbook', s: 'Head of Marketing-strategi · Utleiemegleren-analyse · 90-dagersplan · budsjettmatematikk' },
  innsikt: { t: 'Innsikt', s: 'Førsteparts analyse · cookieless · GDPR-trygt' },
  okonomi: { t: 'Økonomi', s: 'Resultat & likviditet · honorar (prosent av leie) · burn rate & runway' },
  saker: { t: 'Saker', s: 'Internt sakssystem — fang, fordel og følg opp saker til de er ferdige. N = ny sak' },
  moter: { t: 'Møter', s: 'Styremøter & ledermøter — agenda, referat, vedtak og aksjonspunkter som blir saker' },
  kunder: { t: 'Kunder', s: 'Utleiere (betalende kunder) · kontrakter · eiendommer · MRR — synket fra plattformen' },
  abonnementer: { t: 'Abonnementer', s: 'Kommer snart — aktive avtaler & fakturering' },
  bro: { t: 'Agent-bro', s: 'Delt meldingstråd for koordinering med plattform-prosjektet' },
  nyhetsbrev: { t: 'Nyhetsbrev', s: 'Komponer, forhåndsvis og send e-post til leads og kunder — med samtykke-merking og avmelding' },
  landingssider: { t: 'Landingssider', s: 'Alle konverteringssider på ett sted — kampanjer, annonse-LP-er og hovedsider med live ytelse' },
  boliger: { t: 'Boliger på forsiden', s: 'Synk forvaltede boliger fra plattformen og velg hvilke som vises offentlig — personvern-trygt' },
  historikk: { t: 'Historikk', s: 'Leads fra før sporingen startet — sett kilde, status og verdi manuelt. Teller i helhetsbildet, aldri i annonse-ROAS' },
  seo: { t: 'SEO & AEO', s: 'Google-posisjoner (Bergen) · synlighet i AI-svar · teknisk revisjon av alle sider' },
};

// Undertitler i toppbaren når en Innsikt-modul er aktiv (egen inngang i menyen)
const INSIGHT_SUBTITLES = {
  oversikt: 'Totalbildet — trafikk, leads og kanaler · cookieless · GDPR-trygt',
  leads: 'Innkommende leads — status, kilde og toveis CRM-synk',
  live: 'Sanntidsaktivitet på nettsiden akkurat nå',
  trafikk: 'Økter, kilder og sider — førsteparts og cookieless',
  trakt: 'Konverteringstrakt og A/B-eksperimenter',
  annonser: 'Meta & Google Ads — forbruk, ROAS og resultater',
  annonsestudio: 'Lag og publiser annonser med AI',
  finnstudio: 'FINN-annonser — analyse og optimalisering',
  konkurrent: 'Konkurrentanalyse og markedsovervåking',
  innsikt: 'Dybdeinnsikt i leads og segmenter',
  leiemarked: 'Leiepriser og markedsdata for Bergen',
  ytelse: 'Web Vitals og teknisk ytelse',
  ai: 'Spør AI om dataene dine — trafikk, leads og annonser',
};

const NAV_OPEN_KEY = 'dh_admin_nav_open';


export default function AdminPage() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState('innsikt');
  const [insightTab, setInsightTab] = useState('oversikt');
  const [insightStats, setInsightStats] = useState({ pending: 0 });
  const [taskStats, setTaskStats] = useState({ open: 0, overdue: 0 });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Sammenleggbare menygrupper — false = manuelt lukket (persisteres).
  // Gruppen med aktivt element tvinges alltid åpen, så man aldri «mister» seg selv.
  const [navOpen, setNavOpen] = useState({});
  useEffect(() => {
    try { setNavOpen(JSON.parse(localStorage.getItem(NAV_OPEN_KEY) || '{}') || {}); } catch (e) {}
  }, []);
  const toggleGroup = (g) => setNavOpen((prev) => {
    const next = { ...prev, [g]: prev[g] === false };
    try { localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  });

  // Saker-badge: antall forfalte saker i sidemenyen (oppdateres hvert 90. sek
  // og umiddelbart via onStats når man jobber inne i Saker-fanen).
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/admin/tasks/summary?key=${encodeURIComponent(token)}`);
        const j = await r.json();
        if (alive && j.ok) setTaskStats({ open: j.open || 0, overdue: j.overdue || 0 });
      } catch (e) {}
    };
    load();
    const iv = setInterval(load, 90000);
    return () => { alive = false; clearInterval(iv); };
  }, [token]);


  // Global ⌘K / Ctrl+K — åpne kommandopaletten
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Gjenopprett sesjon ved oppstart
  useEffect(() => {
    let t = '';
    try { t = localStorage.getItem(SESSION_KEY) || ''; } catch (e) {}
    if (!t) { setChecking(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/admin/auth/me?key=${encodeURIComponent(t)}`);
        if (res.ok) {
          const j = await res.json();
          setToken(t); setUser(j.user);
          try { localStorage.setItem(LEGACY_KEY, t); } catch (e) {}
        } else {
          try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
        }
      } catch (e) {}
      finally { setChecking(false); }
    })();
  }, []);

  // Rollestyring (hooks MÅ ligge før tidlige returns): kontoer med rollen
  // 'bruker' har tilgang til Saker og Møter (møtelisten filtreres server-side
  // til møter de deltar i eller har fått typetilgang til) — alt annet tvinges bort.
  const erBruker = !!(user && user.role === 'bruker');
  useEffect(() => {
    if (erBruker && section !== 'saker' && section !== 'moter') setSection('saker');
  }, [erBruker, section]);

  // Innlogging skjer i AuthSkjerm (passord, magic link, invitasjon, reset) —
  // alle veier ender her med et gyldig sesjonstoken + brukerobjekt.
  const onLoggedIn = (t, u) => {
    setToken(t); setUser(u);
    try { localStorage.setItem(SESSION_KEY, t); localStorage.setItem(LEGACY_KEY, t); } catch (e) {}
  };

  const logout = () => {
    try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
    setToken(''); setUser(null); setSection('innsikt');
  };

  // --- Laster sesjon ---
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f4]">
        <Loader2 className="w-6 h-6 animate-spin text-[#cf97fc]" />
      </div>
    );
  }

  // --- Innlogging / konto-flyt ---
  if (!token) {
    return <AuthSkjerm onLoggedIn={onLoggedIn} />;
  }

  // --- Innlogget: sidebar-shell ---
  const initials = (user && user.name ? user.name : (user && user.email || 'A')).slice(0, 1).toUpperCase();
  const sectionMeta = SECTION_TITLES[section] || { t: section, s: '' };

  // Menyen filtreres for 'bruker'-rollen, og admin-widgets (puls, hurtig-
  // handlinger) skjules. Serveren håndhever det samme på API-nivå.
  const synligNav = erBruker
    ? [{ group: 'Verktøy', items: NAV.flatMap((g) => g.items).filter((it) => it.k === 'saker' || it.k === 'moter') }]
    : NAV;

  const NavList = () => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
      {synligNav.map((grp) => {
        const containsActive = grp.items.some((it) => (it.insight ? (section === 'innsikt' && insightTab === it.insight) : section === it.k));
        const isOpen = navOpen[grp.group] !== false || containsActive;
        return (
        <div key={grp.group}>
          <button
            onClick={() => toggleGroup(grp.group)}
            className="w-full px-3 mb-1.5 flex items-center justify-between group/hdr"
            aria-expanded={isOpen}
            data-testid={`nav-group-${grp.group}`}
          >
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/30 group-hover/hdr:text-white/55 transition-colors">{grp.group}</span>
            <ChevronDown className={`w-3 h-3 text-white/20 group-hover/hdr:text-white/55 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
          </button>
          {isOpen && (
          <div className="space-y-0.5 dh-fade">
            {grp.items.map((it) => {
              const Icon = it.icon;
              const active = it.insight ? (section === 'innsikt' && insightTab === it.insight) : section === it.k;
              const pend = it.badge === 'pending' ? (insightStats.pending || 0) : it.badge === 'tasks' ? (taskStats.overdue || 0) : 0;
              const common = 'relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all group';
              const content = (
                <>
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-[#cf97fc] shadow-[0_0_12px_rgba(207,151,252,0.8)]" />}
                  <Icon className={`w-[17px] h-[17px] shrink-0 transition-colors ${active ? 'text-[#cf97fc]' : 'text-white/50 group-hover:text-white/80'}`} />
                  <span className="flex-1 text-left">{it.l}</span>
                  {pend > 0 && <span className="text-[9.5px] font-bold bg-amber-400 text-[#0a0a0a] rounded-full px-1.5 py-0.5 leading-none">{pend}</span>}
                  {it.soon && <span className="text-[9.5px] font-semibold uppercase tracking-wide text-[#cf97fc] bg-[#cf97fc]/12 rounded-full px-1.5 py-0.5">Snart</span>}
                  {it.href && <ChevronRight className="w-3.5 h-3.5 text-white/25" />}
                </>
              );
              if (it.href) {
                return (
                  <a key={it.k} href={it.href} className={`${common} text-white/70 hover:bg-white/[0.06] hover:text-white`}>{content}</a>
                );
              }
              return (
                <button
                  key={it.k}
                  onClick={() => {
                    if (it.insight) { setSection('innsikt'); setInsightTab(it.insight); }
                    else setSection(it.k);
                    setSidebarOpen(false);
                  }}
                  data-testid={`nav-item-${it.k}`}
                  className={`${common} ${active ? 'bg-white/[0.08] text-white' : 'text-white/70 hover:bg-white/[0.05] hover:text-white'}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
          )}
        </div>
        );
      })}
    </nav>
  );

  const SidebarInner = () => (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-white/[0.07] shrink-0">
        <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-[22px] w-auto" />
        <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.14em] border border-white/15 rounded-full px-2 py-0.5">Admin</span>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <NavList />
      <div className="px-3 py-3 border-t border-white/[0.07] shrink-0">
        <div className="flex items-center gap-1 px-2 py-2">
          <button
            onClick={() => { setProfileOpen(true); setSidebarOpen(false); }}
            title="Min profil — navn, farge og passord"
            data-testid="profile-open-btn"
            className="flex items-center gap-3 flex-1 min-w-0 rounded-lg -mx-1 px-1 py-1 text-left hover:bg-white/[0.06] transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-[#cf97fc] text-[#0a0a0a] flex items-center justify-center text-[14px] font-bold shrink-0">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[13px] font-semibold truncate">{(user && user.name) || (user && user.email)}</p>
              <p className="text-white/35 text-[11px] capitalize">{(user && user.role) || 'admin'} · Min profil</p>
            </div>
          </button>
          <button onClick={logout} title="Logg ut" className="text-white/40 hover:text-rose-400 transition-colors p-1.5"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );

  const activeInsight = INSIGHT_TABS.find((t) => t.k === insightTab) || INSIGHT_TABS[0];
  const runNavigate = (sec) => { setSection(sec); setSidebarOpen(false); setPaletteOpen(false); };
  const runInsight = (k) => { setSection('innsikt'); setInsightTab(k); setSidebarOpen(false); setPaletteOpen(false); };
  // Sakshandlinger: bytt til Saker-seksjonen og send kommandoen dit via window-event.
  // Liten forsinkelse ved seksjonsbytte slik at TasksTab rekker å montere lytteren.
  const runSaker = (detail) => {
    setPaletteOpen(false);
    setSidebarOpen(false);
    const varDer = section === 'saker';
    if (!varDer) setSection('saker');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('dh:saker', { detail })), varDer ? 0 : 420);
  };
  const paletteCommands = [
    // Hele menyen — automatisk fra NAV-strukturen (alltid i synk med sidemenyen)
    ...synligNav.flatMap((g) => g.items.filter((it) => !it.soon).map((it) => ({
      id: `nav-${it.k}`, group: g.group, label: it.l, icon: it.icon,
      action: () => {
        setPaletteOpen(false);
        if (it.href) { window.location.href = it.href; return; }
        if (it.insight) { runInsight(it.insight); return; }
        runNavigate(it.k);
      },
    }))),
    // Sakshandlinger — direkte fra paletten (Linear-style)
    { id: 'sak-ny', group: 'Saker', label: 'Ny sak', icon: ClipboardCheck, action: () => runSaker({ do: 'ny' }) },
    { id: 'sak-mine', group: 'Saker', label: 'Mine saker av/på', icon: UserPlus, action: () => runSaker({ do: 'mine' }) },
    { id: 'sak-tidslinje', group: 'Saker', label: 'Saker: Tidslinje', icon: History, action: () => runSaker({ do: 'view', view: 'tidslinje' }) },
    { id: 'sak-arkiv', group: 'Saker', label: 'Saker: Arkiv', icon: Layers, action: () => runSaker({ do: 'view', view: 'arkiv' }) },
    ...(erBruker ? [] : [
      { id: 'sak-personer', group: 'Saker', label: 'Personer & kontoer', icon: Users, action: () => runSaker({ do: 'personer' }) },
    ]),
    // Hurtighandlinger — 2026: gjør ting direkte fra paletten (kun admin)
    ...(erBruker ? [] : [
    { id: 'qa-site', group: 'Hurtighandlinger', label: 'Åpne nettsiden (ny fane)', icon: Globe, action: () => { setPaletteOpen(false); window.open('/', '_blank'); } },
    { id: 'qa-artikkel', group: 'Hurtighandlinger', label: 'Skriv ny artikkel', icon: PenLine, action: () => { setPaletteOpen(false); window.location.href = '/admin/artikler'; } },
    { id: 'qa-lp-inntekt', group: 'Hurtighandlinger', label: 'Åpne landingsside: Inntekt', icon: ExternalLink, action: () => { setPaletteOpen(false); window.open('/lp/inntekt', '_blank'); } },
    { id: 'qa-lp-forvaltning', group: 'Hurtighandlinger', label: 'Åpne landingsside: Forvaltning', icon: ExternalLink, action: () => { setPaletteOpen(false); window.open('/lp/forvaltning', '_blank'); } },
    { id: 'qa-lp-10pluss2', group: 'Hurtighandlinger', label: 'Åpne landingsside: 10+2', icon: ExternalLink, action: () => { setPaletteOpen(false); window.open('/lp/10pluss2', '_blank'); } },
    { id: 'qa-lp-leietaker', group: 'Hurtighandlinger', label: 'Åpne landingsside: Leietaker', icon: ExternalLink, action: () => { setPaletteOpen(false); window.open('/lp/leietaker', '_blank'); } },
    ]),
    { id: 'profil', group: 'Konto', label: 'Min profil — navn, farge og passord', icon: User, action: () => { setPaletteOpen(false); setProfileOpen(true); } },
    { id: 'logout', group: 'Konto', label: 'Logg ut', icon: LogOut, action: () => { setPaletteOpen(false); logout(); } },
  ];

  return (
    <div className="min-h-screen bg-[#f7f6f4] flex">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} />
      {profileOpen && (
        <ProfilModal
          token={token} user={user}
          onClose={() => setProfileOpen(false)}
          onUpdated={(u) => setUser((prev) => ({ ...prev, ...u }))}
        />
      )}
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 sticky top-0 h-screen">
        <SidebarInner />
      </aside>

      {/* Sidebar — mobil drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full"><SidebarInner /></div>
        </div>
      )}

      {/* Hovedinnhold */}
      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <div className="sticky top-0 z-30 bg-[#f7f6f4]/85 backdrop-blur-md border-b border-black/[0.05]">
          <div className="h-16 px-4 sm:px-8 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Åpne meny" data-testid="admin-menu-open" className="lg:hidden h-9 w-9 rounded-lg bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-center text-[#444]"><Menu className="w-5 h-5" /></button>
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-bold text-[#0a0a0a] tracking-[-0.02em] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{section === 'innsikt' ? activeInsight.l : sectionMeta.t}</h1>
              <p className="text-[12px] text-[#999] mt-1 truncate">{section === 'innsikt' ? (INSIGHT_SUBTITLES[insightTab] || 'Førsteparts analyse · cookieless · GDPR-trygt') : sectionMeta.s}</p>
            </div>
            {!erBruker && <PulseStrip token={token} onJump={(sec, tab) => { setSection(sec); if (tab) { setSection('innsikt'); setInsightTab(tab); } }} />}
            <button onClick={() => setPaletteOpen(true)} title="Søk & hurtignavigasjon (⌘K)" className="ml-auto xl:ml-0 hidden sm:flex items-center gap-2 h-9 pl-3 pr-2 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-[#9a9a9a] hover:text-[#0a0a0a] transition-colors">
              <Search className="w-4 h-4" />
              <span className="text-[12.5px] font-medium">Søk eller hopp til …</span>
              <span className="ml-1 flex items-center gap-0.5 text-[10.5px] font-semibold text-[#aaa] bg-[#f1f0ee] rounded-md px-1.5 py-1 leading-none"><Command className="w-3 h-3" />K</span>
            </button>
            <button onClick={() => setPaletteOpen(true)} aria-label="Søk" className="sm:hidden ml-auto h-9 w-9 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#9a9a9a]"><Search className="w-4 h-4" /></button>
          </div>
        </div>

        <div key={section} className="px-4 sm:px-8 py-6 max-w-[1440px] dh-fade">
          {section === 'nokkeltall' && <KpiDashboard apiKey={token} />}
          {section === 'investorrom' && <InvestorRoomTab apiKey={token} />}
          {section === 'playbook' && <PlaybookTab apiKey={token} />}
          {section === 'nyhetsbrev' && <NewsletterTab apiKey={token} />}
          {section === 'landingssider' && <LandingPagesTab apiKey={token} />}
          {section === 'boliger' && <PropertiesTab apiKey={token} />}
          {section === 'historikk' && <HistoryTab apiKey={token} />}
          {section === 'seo' && <SeoAeoTab apiKey={token} />}
          {section === 'okonomi' && <FinanceDashboard apiKey={token} />}
          {section === 'saker' && <TasksTab apiKey={token} user={user} onStats={setTaskStats} />}
          {section === 'moter' && <MeetingsTab apiKey={token} user={user} onOpenTask={(id, arkivert) => runSaker({ do: 'aapne', id, arkivert })} />}
          {section === 'innsikt' && <InnsiktDashboard apiKey={token} tab={insightTab} onTabChange={setInsightTab} onStats={setInsightStats} />}
          {section === 'kunder' && <CustomersDashboard apiKey={token} />}
          {section === 'abonnementer' && <ComingSoon icon={CreditCard} title="Abonnementer" body="Oversikt over aktive avtaler, fakturering og inntekt per kunde — hentet direkte fra app-prosjektet. Kommer i neste fase." />}
          {section === 'bro' && <AgentBridge apiKey={token} />}
        </div>
      </main>
    </div>
  );
}

function ComingSoon({ icon: Icon, title, body }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-10 sm:p-14 text-center max-w-2xl mx-auto mt-6">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-5"><Icon className="w-8 h-8 text-[#cf97fc]" /></div>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#cf97fc] bg-[#cf97fc]/10 rounded-full px-3 py-1 mb-4"><Sparkles className="w-3 h-3" /> Kommer snart</div>
      <h2 className="text-[24px] font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h2>
      <p className="text-[15px] text-[#666] mt-3 leading-relaxed">{body}</p>
    </div>
  );
}

function CommandPalette({ open, onClose, commands }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); }
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) => `${c.group} ${c.label}`.toLowerCase().includes(s));
  }, [q, commands]);

  useEffect(() => { if (active >= filtered.length) setActive(0); }, [filtered.length]); // eslint-disable-line

  if (!open) return null;

  const run = (c) => { if (c && c.action) c.action(); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(filtered[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-[#0a0a0a]/40 backdrop-blur-[2px] dh-fade" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.28)] overflow-hidden dh-scale-in" role="dialog" aria-modal="true">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-black/[0.06]">
          <Search className="w-4 h-4 text-[#bbb] shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Søk eller hopp til …"
            className="flex-1 h-full bg-transparent outline-none text-[15px] text-[#1f1f1f] placeholder:text-[#bbb]"
          />
          <button onClick={onClose} className="text-[10.5px] font-semibold text-[#aaa] bg-[#f1f0ee] rounded-md px-2 py-1 leading-none">ESC</button>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="py-10 text-center text-[14px] text-[#aaa]">Ingen treff på «{q}»</div>
          )}
          {filtered.map((c, i) => {
            const Icon = c.icon;
            const isActive = i === active;
            return (
              <button
                key={c.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${isActive ? 'bg-[#f4f0fb]' : 'hover:bg-[#f8f7f5]'}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white text-[#8b5cf6] shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'bg-[#f3f2f0] text-[#888]'}`}>
                  {Icon && <Icon className="w-4 h-4" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-[#1f1f1f] leading-tight">{c.label}</span>
                  <span className="block text-[11.5px] text-[#a3a3a3]">{c.group}</span>
                </span>
                {isActive && <CornerDownLeft className="w-4 h-4 text-[#c9b8e4] shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 px-4 h-10 border-t border-black/[0.06] text-[11px] text-[#aaa]">
          <span className="flex items-center gap-1"><span className="font-semibold">↑↓</span> naviger</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> velg</span>
          <span className="flex items-center gap-1"><span className="font-semibold">esc</span> lukk</span>
          <span className="ml-auto flex items-center gap-1"><Command className="w-3 h-3" />K</span>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PulseStrip — live «mission control»-tall i toppbaren (auto-oppdateres 60s).
   Klikkbare chips hopper rett til riktig modul.
   ========================================================================== */
function PulseStrip({ token, onJump }) {
  const [p, setP] = useState(null);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/admin/pulse?key=${encodeURIComponent(token)}`);
        const j = await r.json();
        if (alive && j.ok) setP(j);
      } catch (e) {}
    };
    load();
    const iv = setInterval(load, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, [token]);

  const nf = new Intl.NumberFormat('nb-NO');
  const chips = [
    { icon: Activity, label: 'økter i dag', value: p ? nf.format(p.sessionsToday) : '·', jump: ['innsikt', 'trafikk'] },
    { icon: Users, label: 'leads i dag', value: p ? nf.format((p.leadsToday || 0) + (p.tenantsToday || 0)) : '·', jump: ['innsikt', 'leads'] },
    ...(p && p.pending > 0 ? [{ icon: Radio, label: 'venter', value: nf.format(p.pending), warn: true, jump: ['innsikt', 'leads'] }] : []),
    { icon: Wallet, label: 'MRR', value: p && p.mrr != null ? `${nf.format(p.mrr)} kr` : '·', jump: ['kunder', null] },
  ];

  return (
    <div className="ml-auto hidden xl:flex items-center gap-1.5 mr-2">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b5b5b5] mr-1 select-none">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
      {chips.map((c, i) => {
        const Icon = c.icon;
        return (
          <button
            key={i}
            onClick={() => onJump(c.jump[0], c.jump[1])}
            title={`Gå til ${c.jump[1] || c.jump[0]}`}
            className={`group flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full text-[12px] transition-all active:scale-[0.96] ${c.warn
              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100'
              : 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-[#666] hover:shadow-[0_4px_14px_rgba(0,0,0,0.09)] hover:-translate-y-[1px]'}`}
          >
            <Icon className={`w-3.5 h-3.5 transition-colors ${c.warn ? 'text-amber-500' : 'text-[#c9b8e4] group-hover:text-[#8b5cf6]'}`} />
            <span className="font-bold text-[#0a0a0a] tabular-nums">{c.value}</span>
            <span className={`font-medium ${c.warn ? 'text-amber-700/80' : 'text-[#a3a3a3] group-hover:text-[#777]'}`}>{c.label}</span>
          </button>
        );
      })}
      <span className="mx-1 h-5 w-px bg-black/[0.07]" />
    </div>
  );
}

/* ==========================================================================
   AuthSkjerm — innlogging + hele konto-flyten på én mørk skjerm:
   · Passordinnlogging (som før) med «Glemt passord?»
   · Magic link: engangslenke på e-post som logger deg rett inn
   · Aktivering av invitasjon (?invite=…): brukeren velger EGET passord
   · Nytt passord via reset-lenke (?reset=…)
   Token leses fra URL ved oppstart og fjernes umiddelbart fra adressefeltet.
   ========================================================================== */
function AuthSkjerm({ onLoggedIn }) {
  const [view, setView] = useState('login'); // login|glemt|magic|sendt|aktiver|reset|magiclogin|ugyldig
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [urlToken, setUrlToken] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null); // { name, email, role }
  const [sendt, setSendt] = useState(null); // { type: 'glemt'|'magic', email }

  // Les invitasjons-/reset-/magic-token fra URL — én gang, og rens adressefeltet.
  useEffect(() => {
    let sp;
    try { sp = new URLSearchParams(window.location.search); } catch (e) { return; }
    const inv = sp.get('invite'); const rst = sp.get('reset'); const mag = sp.get('magic');
    if (!inv && !rst && !mag) return;
    try { window.history.replaceState({}, '', '/admin'); } catch (e) {}
    if (mag) {
      setView('magiclogin');
      (async () => {
        try {
          const r = await fetch('/api/admin/auth/magic/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: mag }),
          });
          const j = await r.json();
          if (r.ok && j.ok) { onLoggedIn(j.token, j.user); return; }
          setErr(j.error || 'Lenken er utløpt eller allerede brukt'); setView('ugyldig');
        } catch (e) { setErr('Nettverksfeil — prøv igjen'); setView('ugyldig'); }
      })();
      return;
    }
    const t = inv || rst;
    const type = inv ? 'invite' : 'reset';
    setUrlToken(t);
    setView(inv ? 'aktiver' : 'reset');
    (async () => {
      try {
        const r = await fetch(`/api/admin/auth/token-info?token=${encodeURIComponent(t)}&type=${type}`);
        const j = await r.json();
        if (r.ok && j.ok) setTokenInfo(j);
        else { setErr(j.error || 'Lenken er ugyldig eller utløpt'); setView('ugyldig'); }
      } catch (e) { setErr('Nettverksfeil — prøv igjen'); setView('ugyldig'); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doLogin = async (e) => {
    if (e) e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Innlogging feilet'); setBusy(false); return; }
      onLoggedIn(j.token, j.user);
    } catch (e2) { setErr('Nettverksfeil — prøv igjen'); }
    finally { setBusy(false); }
  };

  // Glemt passord / magic link — svarer alltid ok (lekker ikke kontoeksistens).
  const sendLenke = async (type) => {
    const adr = email.trim();
    if (!adr) { setErr('Fyll inn e-post'); return; }
    setErr(''); setBusy(true);
    try {
      const res = await fetch(`/api/admin/auth/${type === 'glemt' ? 'glemt' : 'magic'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adr }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Noe gikk galt — prøv igjen'); setBusy(false); return; }
      setSendt({ type, email: adr });
      setView('sendt');
    } catch (e) { setErr('Nettverksfeil — prøv igjen'); }
    finally { setBusy(false); }
  };

  // Aktivering (invitasjon) og reset deler valider-og-send-logikk.
  const settPassord = async (endepunkt) => {
    if (pw1.length < 8) { setErr('Passordet må ha minst 8 tegn'); return; }
    if (pw1 !== pw2) { setErr('Passordene er ikke like'); return; }
    setErr(''); setBusy(true);
    try {
      const res = await fetch(`/api/admin/auth/${endepunkt}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: urlToken, password: pw1 }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Noe gikk galt — prøv igjen'); setBusy(false); return; }
      onLoggedIn(j.token, j.user);
    } catch (e) { setErr('Nettverksfeil — prøv igjen'); }
    finally { setBusy(false); }
  };

  const inputCls = 'mt-1.5 w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/12 text-white placeholder:text-white/25 outline-none focus:border-[#cf97fc] focus:bg-white/[0.06] text-[15px] transition-colors';
  const labelCls = 'text-white/60 text-[12px] font-semibold uppercase tracking-[0.08em]';
  const primaryBtn = 'w-full h-12 rounded-xl bg-white text-[#0a0a0a] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-60';
  const tilbake = (mot = 'login') => (
    <button
      type="button" onClick={() => { setErr(''); setView(mot); }}
      data-testid="auth-back-btn"
      className="mt-5 flex items-center gap-1.5 text-white/40 hover:text-white/70 text-[13px] transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Tilbake til innlogging
    </button>
  );
  const feil = err ? <p className="text-[13px] text-rose-400 flex items-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" /> {err}</p> : null;

  // Passordvelger (deles av aktivering + reset)
  const PassordFelter = (
    <>
      <div>
        <label className={labelCls}>Nytt passord</label>
        <PassordInput
          value={pw1} onChange={(e) => setPw1(e.target.value)}
          autoComplete="new-password" placeholder="Minst 8 tegn"
          className={inputCls} testid="auth-pw1-input"
        />
      </div>
      <div>
        <label className={labelCls}>Gjenta passord</label>
        <PassordInput
          value={pw2} onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password" placeholder="Samme passord én gang til"
          className={inputCls} testid="auth-pw2-input"
        />
      </div>
      <div className="flex items-center gap-4 text-[12px]">
        <span className={`flex items-center gap-1.5 ${pw1.length >= 8 ? 'text-emerald-400' : 'text-white/30'}`}>
          <Check className="w-3.5 h-3.5" /> Minst 8 tegn
        </span>
        <span className={`flex items-center gap-1.5 ${pw1 && pw1 === pw2 ? 'text-emerald-400' : 'text-white/30'}`}>
          <Check className="w-3.5 h-3.5" /> Passordene er like
        </span>
      </div>
    </>
  );

  let innhold = null;

  if (view === 'magiclogin') {
    innhold = (
      <div className="py-10 flex flex-col items-center text-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#cf97fc]" />
        <p className="mt-4 text-white/70 text-[15px] font-medium">Logger deg inn …</p>
        <p className="mt-1 text-white/35 text-[13px]">Verifiserer engangslenken din.</p>
      </div>
    );
  } else if (view === 'ugyldig') {
    innhold = (
      <div>
        <h1 className="text-white text-[26px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Lenken virker ikke lenger</h1>
        <p className="text-white/45 text-[14px] mt-1.5">{err || 'Lenken er ugyldig, utløpt eller allerede brukt.'}</p>
        <div className="mt-7 space-y-3">
          <button type="button" onClick={() => { setErr(''); setView('glemt'); }} className={primaryBtn} data-testid="auth-request-new-btn">
            Be om ny lenke <ChevronRight className="w-4 h-4" />
          </button>
          {tilbake()}
        </div>
      </div>
    );
  } else if (view === 'sendt') {
    innhold = (
      <div data-testid="auth-sent-view">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#cf97fc]/15 border border-[#cf97fc]/25">
          <Mail className="w-5 h-5 text-[#cf97fc]" />
        </span>
        <h1 className="mt-5 text-white text-[26px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Sjekk innboksen din</h1>
        <p className="text-white/45 text-[14px] mt-1.5 leading-relaxed">
          Hvis <span className="text-white/80 font-medium">{sendt && sendt.email}</span> har en konto hos oss, har vi nå sendt {sendt && sendt.type === 'magic' ? 'en innloggingslenke' : 'en lenke for å velge nytt passord'}.
        </p>
        <p className="text-white/30 text-[12.5px] mt-3">{sendt && sendt.type === 'magic' ? 'Lenken er gyldig i 15 minutter og kan bare brukes én gang.' : 'Lenken er gyldig i 1 time. Sjekk også søppelpost.'}</p>
        {tilbake()}
      </div>
    );
  } else if (view === 'glemt' || view === 'magic') {
    const erMagic = view === 'magic';
    innhold = (
      <div>
        <h1 className="text-white text-[26px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          {erMagic ? 'Logg inn med e-post' : 'Glemt passord?'}
        </h1>
        <p className="text-white/45 text-[14px] mt-1.5">
          {erMagic
            ? 'Vi sender deg en engangslenke som logger deg rett inn — helt uten passord.'
            : 'Skriv inn e-posten din, så sender vi deg en lenke for å velge nytt passord.'}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); sendLenke(erMagic ? 'magic' : 'glemt'); }} className="mt-7 space-y-3">
          <div>
            <label className={labelCls}>E-post</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" placeholder="navn@digihome.no" autoFocus
              className={inputCls} data-testid={erMagic ? 'auth-magic-email-input' : 'auth-glemt-email-input'}
            />
          </div>
          {feil}
          <button type="submit" disabled={busy} className={primaryBtn} data-testid={erMagic ? 'auth-magic-send-btn' : 'auth-glemt-send-btn'}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{erMagic ? 'Send innloggingslenke' : 'Send tilbakestillingslenke'} <ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>
        {tilbake()}
      </div>
    );
  } else if (view === 'aktiver' || view === 'reset') {
    const erAktiver = view === 'aktiver';
    const fornavn = tokenInfo && tokenInfo.name ? tokenInfo.name.split(' ')[0] : '';
    innhold = (
      <div>
        {erAktiver && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cf97fc]/15 border border-[#cf97fc]/25 px-3 py-1 text-[12px] font-semibold text-[#cf97fc] mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Velkommen til teamet
          </span>
        )}
        <h1 className="text-white text-[26px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          {erAktiver ? (fornavn ? `Hei ${fornavn} 👋` : 'Aktiver kontoen din') : 'Velg nytt passord'}
        </h1>
        <p className="text-white/45 text-[14px] mt-1.5">
          {erAktiver
            ? <>Velg ditt eget passord for <span className="text-white/80 font-medium">{tokenInfo && tokenInfo.email}</span>, så er du i gang.</>
            : <>Sett et nytt passord for <span className="text-white/80 font-medium">{tokenInfo && tokenInfo.email}</span>.</>}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); settPassord(erAktiver ? 'aktiver' : 'reset'); }} className="mt-7 space-y-3">
          {PassordFelter}
          {feil}
          <button
            type="submit" disabled={busy || pw1.length < 8 || pw1 !== pw2}
            className={primaryBtn} data-testid={erAktiver ? 'auth-aktiver-btn' : 'auth-reset-btn'}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{erAktiver ? 'Aktiver konto og logg inn' : 'Lagre passord og logg inn'} <ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    );
  } else {
    innhold = (
      <div>
        <h1 className="text-white text-[26px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Logg inn</h1>
        <p className="text-white/45 text-[14px] mt-1.5">Tilgang til innsikt, leads og forretning.</p>

        <form onSubmit={doLogin} className="mt-7 space-y-3">
          <div>
            <label className={labelCls}>E-post</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" placeholder="navn@digihome.no"
              className={inputCls}
              data-testid="admin-email-input"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className={labelCls}>Passord</label>
              <button
                type="button" onClick={() => { setErr(''); setView('glemt'); }}
                className="text-[12px] text-white/35 hover:text-[#cf97fc] transition-colors"
                data-testid="auth-forgot-link"
              >
                Glemt passord?
              </button>
            </div>
            <PassordInput
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" placeholder="••••••••"
              className={inputCls}
              testid="admin-password-input"
            />
          </div>
          {feil}
          <button
            type="submit" disabled={busy}
            data-testid="admin-login-btn"
            className={primaryBtn}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Logg inn <ChevronRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-white/25 text-[11px] font-semibold uppercase tracking-[0.1em]">eller</span>
          <span className="h-px flex-1 bg-white/[0.08]" />
        </div>
        <button
          type="button" onClick={() => { setErr(''); setView('magic'); }}
          data-testid="auth-magic-link"
          className="mt-5 w-full h-12 rounded-xl border border-white/12 bg-white/[0.03] text-white/75 font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-white/[0.07] hover:text-white active:scale-[0.98] transition-all"
        >
          <Wand2 className="w-4 h-4 text-[#cf97fc]" /> Få innloggingslenke på e-post
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-24 h-[560px] w-[560px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.18) 0%, rgba(207,151,252,0) 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[440px] w-[440px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.10) 0%, rgba(207,151,252,0) 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-8 w-auto" />
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/45">Admin</span>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#cf97fc]/70 to-transparent" />
          {innhold}
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-white/25"><ShieldCheck className="w-3.5 h-3.5" /> Kryptert sesjon · noindex · kun for DigiHome-teamet</p>
      </div>
    </div>
  );
}

/* Passordfelt med vis/skjul-toggle (brukes på hele innloggingsflaten). */
function PassordInput({ value, onChange, placeholder, autoComplete, testid, className }) {
  const [vis, setVis] = useState(false);
  return (
    <div className="relative">
      <input
        type={vis ? 'text' : 'password'}
        value={value} onChange={onChange}
        autoComplete={autoComplete} placeholder={placeholder}
        className={`${className} pr-11`}
        data-testid={testid}
      />
      <button
        type="button" tabIndex={-1} onClick={() => setVis((v) => !v)}
        title={vis ? 'Skjul passord' : 'Vis passord'}
        className="absolute right-3 top-1/2 -translate-y-1/2 mt-[3px] p-0.5 text-white/30 transition-colors hover:text-white/70"
      >
        {vis ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

/* ==========================================================================
   ProfilModal — «Min profil»: alle innloggede kontoer (admin OG bruker) kan
   endre eget navn, egen avatarfarge og eget passord. Passordbytte krever
   gjeldende passord (verifiseres server-side i PUT /api/admin/auth/profile);
   e-post og rolle endres kun av admin via Personer & kontoer.
   ========================================================================== */
const PROFIL_FARGER = ['#8B5CF6', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

function ProfilModal({ token, user, onClose, onUpdated }) {
  const [name, setName] = useState((user && user.name) || '');
  const [color, setColor] = useState('');
  const [curPw, setCurPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');

  // Hent egen farge (og navn hvis tomt) fra personlisten — matcher på e-post.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/admin/users?key=${encodeURIComponent(token)}`);
        const j = await r.json();
        if (alive && j.ok) {
          const epost = ((user && user.email) || '').toLowerCase();
          const meg = (j.members || []).find((m) => (m.email || '').toLowerCase() === epost);
          if (meg) {
            setColor(meg.color || '');
            setName((prev) => prev || meg.name || '');
          }
        }
      } catch (e) {}
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc lukker
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const bytterPassord = !!(pw1 || pw2 || curPw);

  const lagre = async () => {
    setErr(''); setOkMsg('');
    if (!name.trim()) { setErr('Navn kan ikke være tomt'); return; }
    if (pw1 || pw2) {
      if (pw1.length < 8) { setErr('Nytt passord må ha minst 8 tegn'); return; }
      if (pw1 !== pw2) { setErr('Passordene er ikke like'); return; }
    }
    setBusy(true);
    try {
      const body = { name: name.trim() };
      if (color) body.color = color;
      if (pw1) { body.password = pw1; body.currentPassword = curPw; }
      const r = await fetch(`/api/admin/auth/profile?key=${encodeURIComponent(token)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setErr(j.error || 'Lagring feilet'); setBusy(false); return; }
      onUpdated(j.user);
      setOkMsg(pw1 ? 'Profil og passord oppdatert' : 'Profil oppdatert');
      setCurPw(''); setPw1(''); setPw2('');
      window.setTimeout(onClose, 900);
    } catch (e) { setErr('Nettverksfeil — prøv igjen'); }
    setBusy(false);
  };

  const felt = 'mt-1.5 w-full h-11 rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15';
  const label = 'text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]';
  const initialer = (name || (user && user.email) || 'A').slice(0, 1).toUpperCase();

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" data-testid="profile-modal">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-5 py-4">
          <User className="w-[18px] h-[18px] shrink-0 text-[#8b5cf6]" />
          <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Min profil</h3>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0]" data-testid="profile-close-btn"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Identitet */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full text-white flex items-center justify-center text-[18px] font-bold shrink-0" style={{ background: color || '#cf97fc' }}>{initialer}</div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#1a1a1a] truncate">{user && user.email}</p>
              <p className="text-[12px] text-[#999] capitalize">{(user && user.role) || 'admin'} — e-post og rolle endres av administrator</p>
            </div>
          </div>

          <div className="mt-5">
            <label className={label}>Navn</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ditt navn" className={felt}
              data-testid="profile-name-input"
            />
          </div>

          <div className="mt-4">
            <label className={label}>Avatarfarge</label>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {PROFIL_FARGER.map((f) => (
                <button
                  key={f} onClick={() => setColor(f)} title={f}
                  data-testid={`profile-color-${f.replace('#', '')}`}
                  className={`h-8 w-8 rounded-full transition-all active:scale-[0.9] ${color === f ? 'ring-2 ring-offset-2 ring-[#0a0a0a]' : 'hover:scale-110'}`}
                  style={{ background: f }}
                >
                  {color === f && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Passordbytte */}
          <div className="mt-6 rounded-xl border border-black/[0.06] bg-[#fafaf8] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#999]"><KeyRound className="w-3.5 h-3.5" /> Bytt passord</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={label}>Nåværende passord</label>
                <input
                  type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)}
                  autoComplete="current-password" placeholder="••••••••" className={felt}
                  data-testid="profile-current-pw"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={label}>Nytt passord</label>
                  <input
                    type="password" value={pw1} onChange={(e) => setPw1(e.target.value)}
                    autoComplete="new-password" placeholder="Minst 8 tegn" className={felt}
                    data-testid="profile-new-pw1"
                  />
                </div>
                <div>
                  <label className={label}>Gjenta</label>
                  <input
                    type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                    autoComplete="new-password" placeholder="Én gang til" className={felt}
                    data-testid="profile-new-pw2"
                  />
                </div>
              </div>
              {bytterPassord && (
                <div className="flex items-center gap-4 text-[12px]">
                  <span className={`flex items-center gap-1 ${pw1.length >= 8 ? 'text-emerald-600' : 'text-[#bbb]'}`}><Check className="w-3.5 h-3.5" /> Minst 8 tegn</span>
                  <span className={`flex items-center gap-1 ${pw1 && pw1 === pw2 ? 'text-emerald-600' : 'text-[#bbb]'}`}><Check className="w-3.5 h-3.5" /> Like</span>
                </div>
              )}
              <p className="text-[11px] text-[#b5b5b5]">La feltene stå tomme hvis du ikke vil bytte passord. Alle utestående e-postlenker invalideres ved bytte.</p>
            </div>
          </div>

          {err && <p className="mt-3 text-[13px] text-rose-600 flex items-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" /> {err}</p>}
          {okMsg && <p className="mt-3 text-[13px] text-emerald-600 flex items-center gap-1.5" data-testid="profile-ok-msg"><Check className="w-3.5 h-3.5 shrink-0" /> {okMsg}</p>}
        </div>

        <div className="shrink-0 border-t border-black/[0.06] px-5 py-4 flex items-center gap-2" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <button onClick={onClose} className="rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#888] hover:bg-[#f3f2f0]">Avbryt</button>
          <button
            onClick={lagre} disabled={busy || !name.trim()}
            data-testid="profile-save-btn"
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lagre profil
          </button>
        </div>
      </div>
    </div>
  );
}
