'use client';
/** Produktet, gjenskapt komponent for komponent fra DigiHome-appen (repoet DigiHome, branch «branky», 4. okt 2026):
 *  forvalterens oversikt (frontend/src/admin/dashboard/DashboardHome.tsx + AdminLayout.tsx sin rail) og eierens hjem i mobilappen
 *  (mobile/app/owner/index.tsx + src/owner/kit.tsx). Samme tokens (app-system v1.2: ivory/lilla, hårlinjer, ink), samme typografi
 *  (PP Right Grotesk / ABC Diatype), samme rekkefølge og tetthet. Tegnes i fast designbredde og skaleres til plassen den får.
 *  Tallene er illustrative for en portefølje på 35 enheter – ikke hentet fra drift. */
import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpen, Bot, Building2, CalendarDays, Check, ChevronRight, ChevronsUpDown,
  ClipboardCheck, ClipboardList, Droplets, FileSignature, FileText, Gauge, Handshake, Home, Image as ImageIcon, KeyRound, LayoutDashboard, LayoutGrid, MapPin,
  Megaphone, MessageSquare, PieChart, Radio, Receipt, Rocket, Scissors, Search, Sparkles, TrendingUp, User, Users, Wallet, Wrench,
} from 'lucide-react';

/* ─── Tokens fra appen (frontend/src/index.css · mobile/src/theme.ts) ─── */
export const A = {
  canvas: '#fbfaf8', canvas2: '#f4f1ec', field: '#ffffff',
  ink: '#1a1a1a', ink2: '#4a443d', ink3: '#6b6257', onInk: '#ffffff',
  hair: '#e5dfd6', hairStrong: '#c9c0b3',
  purple: '#7c3aed', purpleBg: '#f3ecff',
  ok: '#1f7a4d', okBg: '#eef7f1', warn: '#9a5b06', warnBg: '#fdf3df', danger: '#b42318', dangerBg: '#fdf1ef', info: '#2f5fa8', infoBg: '#ebf1fb',
};
const H = 'font-heading';
/** Smalt, ikke-brytende mellomrom som tusenskille – som appens nok(). Vanlig mellomrom blir sifferbredt i tabular-nums. */
const N = (v) => String(v).replace(/ /g, '\u202f');

/** Fast designflate som skaleres til bredden den får. `h` er designhøyden; wrapperen får h·skala. */
export const Skaler = ({ w, h, children, className = '', style, max = 1, testid }) => {
  const ref = useRef(null);
  const [s, setS] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => setS(Math.min(max, el.clientWidth / w));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [w, max]);
  return (
    <div ref={ref} className={className} style={{ ...style, height: s ? h * s : undefined }} data-testid={testid}>
      <div style={{ width: w, height: h, transform: `scale(${s})`, transformOrigin: 'top left', visibility: s ? 'visible' : 'hidden' }}>{children}</div>
    </div>
  );
};

/* ═══════════════════════════════════ FORVALTERENS OVERSIKT (web) ═══════════════════════════════════ */

const Dot = ({ c, size = 6 }) => <span aria-hidden className="rounded-full shrink-0" style={{ width: size, height: size, background: c }} />;
const Arrow = () => <ArrowRight className="w-4 h-4 shrink-0" style={{ color: A.ink3 }} strokeWidth={1.75} />;

/** Tonet ikonsirkel (Tint i DashboardHome). */
const Tint = ({ tone = 'neutral', icon: Icon }) => {
  const m = { warn: [A.warnBg, A.warn], danger: [A.dangerBg, A.danger], purple: [A.purpleBg, A.purple], ok: [A.okBg, A.ok], neutral: [A.canvas2, A.ink2] }[tone];
  return <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: m[0], color: m[1] }}><Icon className="w-4 h-4" strokeWidth={1.75} /></span>;
};

/** Seksjonshode: tittel · ev. antall · «Se alle». */
const Head = ({ title, count, right, to }) => (
  <div className="flex items-center justify-between h-8 mb-1">
    <h2 className={`${H} text-[15px] font-semibold tracking-[-0.01em] flex items-baseline gap-2`} style={{ color: A.ink, margin: 0 }}>{title}{typeof count === 'number' && <span className="text-[12.5px] font-medium tabular-nums" style={{ color: A.ink3 }}>{count}</span>}</h2>
    {right || (to && <span className="inline-flex items-center gap-1 text-[12.5px] font-medium" style={{ color: A.ink3 }}>{to}<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} /></span>)}
  </div>
);

/* ── Rail (AdminLayout.tsx · 236 px, canvas-2, tonal aktiv-fill, lilla kun som mikrosignal) ── */
const RAIL = [
  ['Arbeid', [[LayoutDashboard, 'Oversikt', { active: true }], [Gauge, 'Operasjonssentral'], [MessageSquare, 'Innboks', { count: 3 }], [CalendarDays, 'Kalender'], [Radio, 'Kanaler'], [ClipboardCheck, 'Oppgaver'], [Bot, 'AI-assistent']]],
  ['Drift', [[Building2, 'Eiendommer'], [Rocket, 'Utleieprosesser'], [FileSignature, 'Leieforhold'], [FileText, 'Dokumenter'], [AlertCircle, 'Saker', { count: 7 }], [Users, 'Brukere'], [Wrench, 'Leverandører'], [BookOpen, 'Driftshåndbok']]],
  ['Verktøy', [[ImageIcon, 'Bildestudio']]],
  ['Administrasjon', [[BarChart3, 'Analyse'], [Sparkles, 'Innsikt'], [Handshake, 'Forvaltningsavtaler'], [Megaphone, 'Salg'], [PieChart, 'Økonomi']]],
];

const RailRow = ({ icon: Icon, label, active, count }) => (
  <div className={`flex items-center h-[38px] rounded-[8px] pl-[11px] pr-2 text-[14px] ${active ? 'font-medium' : ''}`} style={{ background: active ? 'rgba(0,0,0,0.055)' : 'transparent', color: active ? A.ink : A.ink2 }}>
    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} style={{ color: active ? A.purple : A.ink3 }} />
    <span className="min-w-0 flex-1 truncate ml-3">{label}</span>
    {count && <span className="text-[11px] font-medium tabular-nums ml-2" style={{ color: A.purple }}>{count}</span>}
  </div>
);

const Rail = ({ user }) => (
  <aside className="flex flex-col shrink-0 h-full" style={{ width: 236, background: A.canvas2, borderRight: `1px solid ${A.hair}` }}>
    <div className="px-2 pt-3">
      <div className="flex items-center h-10 pl-[11px] pr-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[22px] w-auto select-none" draggable={false} />
      </div>
      <div className="mt-2 flex items-center h-[38px] rounded-[8px] pl-[11px] pr-2 text-[14px]" style={{ color: A.ink2 }}>
        <Search className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} style={{ color: A.ink3 }} />
        <span className="flex-1 ml-3">Søk</span>
        <kbd className="text-[11px] font-medium tracking-wide" style={{ color: A.ink3 }}>⌘K</kbd>
      </div>
    </div>
    <nav className="flex-1 px-2 overflow-hidden">
      {RAIL.map(([sec, rows]) => (
        <div key={sec}>
          <p className="h-7 mt-2 mb-0.5 pl-[11px] flex items-center text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: A.ink3, margin: '8px 0 2px' }}>{sec}</p>
          {rows.map(([Icon, label, o = {}]) => <RailRow key={label} icon={Icon} label={label} active={o.active} count={o.count} />)}
        </div>
      ))}
    </nav>
    <div className="px-2 pb-3 pt-2" style={{ borderTop: `1px solid ${A.hair}` }}>
      <div className="flex items-center gap-2.5 h-11 pl-[11px] pr-2 rounded-[8px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.img} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06)', objectPosition: user.pos }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium truncate leading-tight" style={{ color: A.ink }}>{user.name}</span>
          <span className="block text-[11px] truncate leading-tight mt-0.5" style={{ color: A.ink3 }}>{user.email}</span>
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 shrink-0" style={{ color: A.ink3 }} strokeWidth={1.75} />
      </div>
    </div>
  </aside>
);

/* ── Innholdet i oversikten – i samme rekkefølge som i appen ── */
const DATA = {
  user: { name: 'Sarah Sleeman', first: 'Sarah', email: 'sarah@digihome.no', img: '/brand/sarah-sleeman-360.webp', pos: '50% 28%' },
  date: 'lørdag 4. oktober 2026',
  brief: '3 ting venter på deg. 12 hendelser er håndtert siden i går, og husleien for oktober er 94 % inne.',
  prioritert: [
    ['danger', 2, 'husleier forfalt', 'Nygårdsgaten 5 · Kong Oscars gate 12 · purring sendt automatisk'],
    ['warn', 1, 'sak venter på eiers godkjenning', 'Varmtvannsbereder lekker · tilbud fra rørlegger 4 800 kr'],
    ['purple', 1, 'leietaker klar for signering', 'Møhlenpris 8, H0302 · BankID-signering sendt'],
  ],
  aktivitet: [
    ['warn', Droplets, ['I dag', '08:12'], 'Sak', 'Varmtvannsbereder lekker – rørlegger har sendt tilbud', 'Nygårdsgaten 5, H0201 · Emma Sørensen', true, A.ink],
    ['purple', Receipt, ['I dag', '07:40'], 'Husleie', '31 av 35 innbetalinger matchet mot KID', 'Oktober · 2 venter på forfall · 2 purret', false, A.purple],
    ['purple', Megaphone, ['I går', '16:05'], 'Annonse', '6 nye henvendelser på Møhlenpris 8', 'FINN · visning lørdag 11:00 · 4 påmeldt', false, A.purple],
    ['neutral', FileSignature, ['I går', '14:30'], 'Kontrakt', 'Signert med BankID – Kong Oscars gate 12, H0101', 'Fra 1. november · 3 år · depositumskonto opprettet', false, A.ink],
  ],
  venter: { n: 3, tittel: 'Godkjenn tilbud fra rørlegger – 4 800 kr', sub: 'Varmtvannsbereder lekker · Nygårdsgaten 5', mer: ['2 saker trenger en avgjørelse', '1 utgift til attestering · 4 800 kr'] },
  autopilot: [[Receipt, '14 innbetalinger matchet'], [Bell, '2 purringer sendt'], [MessageSquare, '6 henvendelser besvart'], [FileSignature, '1 kontrakt klargjort']],
  kpi: [
    { label: 'Månedlig husleie', v: '486 400', trend: '4 %', pot: 'Ved fullt belegg: 512 300 kr', gap: '+ 25 900 kr på 2 ledige' },
    { label: 'Årsestimat', v: '5,8 M', pot: 'Basert på løpende kontrakter' },
    { label: 'Forvaltningshonorar', v: '38 900', pot: 'Faktureres 1. november' },
    { occ: true, label: 'Belegg', pct: 94, text: '33 av 35 enheter utleid' },
  ],
  saker: [
    ['Venter på deg', [
      ['warn', Droplets, 'Varmtvannsbereder lekker', 'Emma Sørensen · Nygårdsgaten 5, H0201 · Rørlegger · 2 d siden', 'Godkjenn tilbud 4 800 kr', true],
      ['warn', Wrench, 'Oppvaskmaskin stopper midt i program', 'Jonas Berg · Møhlenpris 8, H0302 · Hvitevarer · 3 d siden', 'Velg leverandør', true],
    ]],
    ['Pågår', [
      ['purple', KeyRound, 'Dørlås henger', 'Sara Lie · Damsgårdsveien 41, H0401 · Låsesmed · 1 d siden', 'Låsesmed kommer i dag 14:00', false],
      ['purple', Scissors, 'Behov for hageklipp', 'Fellesareal · Kong Oscars gate 12 · Utomhus · 5 d siden', 'Vaktmester bestilt · fredag', false],
    ]],
  ],
  portefolje: { eiendommer: 12, enheter: 35, utleid: 33, ledige: 2, rader: [['Møhlenpris 8', 5, 6], ['Kong Oscars gate 12', 3, 4], ['Damsgårdsveien 41', 8, 8]] },
};

/** Porteføljehelse – KPI-stripen (border-t, hårlinjer mellom cellene, 34 px heading-tall, lilla/grønn beleggslinje). */
export const KpiStripe = ({ bare = false }) => (
  <section>
    {!bare && <Head title="Porteføljehelse" right={<span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: A.ink3 }}><ArrowUpRight className="w-3.5 h-3.5" style={{ color: A.ok }} strokeWidth={2} />mot forrige måned</span>} />}
    <div className="grid grid-cols-2 lg:grid-cols-4" style={{ borderTop: `1px solid ${A.hair}` }} data-testid="produkt-kpi">
      {DATA.kpi.map((k, i) => (
        <div key={k.label} className={`flex flex-col pt-5 pb-4 pr-4 border-[#e5dfd6] ${['', 'pl-5 border-l', 'border-t lg:border-t-0 lg:border-l lg:pl-5', 'pl-5 border-l border-t lg:border-t-0'][i]}`}>
          <p className="text-[13px]" style={{ color: A.ink2, margin: 0 }}>{k.label}</p>
          {k.occ ? (
            <>
              <p className={`${H} mt-2 text-[34px] font-bold tracking-[-0.03em] tabular-nums leading-none`} style={{ color: A.ink, margin: '8px 0 0' }}>{k.pct}<span className="font-body text-[15px] font-medium ml-1" style={{ color: A.ink3 }}>%</span></p>
              <div className="mt-3.5 h-1.5 rounded-full overflow-hidden" style={{ background: A.canvas2 }}><div className="h-full rounded-full" style={{ width: `${k.pct}%`, background: k.pct < 95 ? A.purple : A.ok }} /></div>
              <p className="mt-2 text-[12.5px]" style={{ color: A.ink2, margin: '8px 0 0' }}>{k.text}</p>
            </>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <p className={`${H} text-[34px] font-bold tracking-[-0.03em] tabular-nums leading-none`} style={{ color: A.ink, margin: 0 }}>{N(k.v)}<span className="font-body text-[15px] font-medium ml-1" style={{ color: A.ink3 }}>kr</span></p>
                {k.trend && <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold" style={{ color: A.ok }}><ArrowUpRight className="w-4 h-4" strokeWidth={2} />{k.trend}</span>}
              </div>
              <div className="mt-3 text-[12.5px] leading-snug">
                <span className="block" style={{ color: A.ink2 }}>{k.pot}</span>
                {k.gap ? <span className="block font-medium mt-0.5" style={{ color: A.ok }}>{k.gap}</span> : <span className="block h-[18px]" />}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </section>
);

/** «Venter på deg» – den ene mørke flaten i oversikten, fordi den har en grunn. */
export const VenterKort = () => {
  const v = DATA.venter;
  return (
    <section data-testid="produkt-venter">
      <div className="relative block rounded-[16px] p-5 overflow-hidden" style={{ background: A.ink, color: A.onInk }}>
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 w-56 h-56 rounded-full rotate-12" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span aria-hidden className="pointer-events-none absolute right-16 -bottom-24 w-48 h-48 rounded-full blur-2xl" style={{ background: 'rgba(124,58,237,0.25)' }} />
        <div className="relative">
          <p className="text-[13px] font-semibold flex items-center gap-2" style={{ margin: 0 }}><span className="w-2 h-2 rounded-full" style={{ background: A.purple, boxShadow: '0 0 0 4px rgba(124,58,237,0.25)' }} />Venter på deg</p>
          <div className="mt-3 flex items-end gap-3">
            <span className={`${H} text-[48px] font-bold leading-none tracking-[-0.04em] tabular-nums`}>{v.n}</span>
            <span className="text-[15px] leading-snug pb-1.5" style={{ opacity: 0.9 }}>beslutninger venter på deg</span>
            <span className="ml-auto w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }}><ArrowRight className="w-5 h-5" strokeWidth={2} /></span>
          </div>
          <p className="mt-4 pt-3.5 text-[13px] leading-snug" style={{ borderTop: '1px solid rgba(255,255,255,0.10)', margin: '16px 0 0' }}>
            <span className="block font-medium truncate">{v.tittel}</span>
            <span className="block truncate mt-0.5" style={{ opacity: 0.7 }}>{v.sub}</span>
          </p>
        </div>
      </div>
      <ul className="mt-2.5 px-1 space-y-1 text-[12.5px] list-none p-0" style={{ color: A.ink2, margin: '10px 0 0' }}>
        {v.mer.map((m) => <li key={m} className="inline-flex items-center gap-1 w-full">{m}<ArrowRight className="w-3 h-3" strokeWidth={2} /></li>)}
      </ul>
    </section>
  );
};

/** Aktive saker – gruppert «Venter på deg» / «Pågår», tonet ikon, neste steg til høyre. */
export const SakerListe = () => (
  <section className="min-w-0" data-testid="produkt-saker">
    <Head title="Aktive saker" count={7} to="Se alle" />
    {DATA.saker.map(([g, items]) => (
      <div key={g} className="mb-3 last:mb-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1 mt-1" style={{ color: A.ink3, margin: '4px 0' }}>{g} <span className="tabular-nums font-medium">· {items.length}</span></p>
        <ul className="list-none p-0 m-0">
          {items.map(([tone, Icon, t, meta, next, needs], i) => (
            <li key={t} className="flex items-center gap-3.5 min-h-[60px] py-2.5" style={{ borderTop: i > 0 ? `1px solid ${A.hair}` : undefined }}>
              <Tint tone={tone} icon={Icon} />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold truncate" style={{ color: A.ink }}>{t}</span>
                <span className="block text-[12.5px] truncate mt-0.5" style={{ color: A.ink3 }}>{meta}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] shrink-0 max-w-[220px]">
                <Dot c={needs ? A.warn : A.ink} />
                <span className={`truncate ${needs ? 'font-medium' : ''}`} style={{ color: needs ? A.warn : A.ink2 }}>{next}</span>
              </span>
              <Arrow />
            </li>
          ))}
        </ul>
      </div>
    ))}
  </section>
);

/** Portefølje – én setning, fordelingslinje, eiendommene som trenger oppmerksomhet. */
export const PortefoljePanel = () => {
  const p = DATA.portefolje;
  return (
    <section className="min-w-0" data-testid="produkt-portefolje">
      <Head title="Portefølje" to="Se alle" />
      <p className="text-[14px] font-medium flex items-center gap-2" style={{ color: A.ink, margin: 0 }}><Building2 className="w-4 h-4" style={{ color: A.ink3 }} strokeWidth={1.75} />{p.eiendommer} eiendommer · {p.enheter} enheter</p>
      <div className="mt-3.5 h-2 rounded-full overflow-hidden flex gap-px" style={{ background: A.canvas2 }}>
        <div className="h-full rounded-full" style={{ width: `${(p.utleid / p.enheter) * 100}%`, background: A.ok }} />
        <div className="h-full rounded-full" style={{ width: `${(p.ledige / p.enheter) * 100}%`, background: A.warn }} />
      </div>
      <div className="mt-2.5 flex items-center gap-4 text-[12.5px]" style={{ color: A.ink2 }}>
        <span className="flex items-center gap-1.5"><Dot c={A.ok} />{p.utleid} utleid</span>
        <span className="flex items-center gap-1.5"><Dot c={A.warn} />{p.ledige} ledige</span>
      </div>
      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${A.hair}` }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: A.ink3, margin: '0 0 8px' }}>Trenger oppmerksomhet</p>
        <ul className="list-none p-0 m-0 space-y-1">
          {p.rader.map(([n, occ, tot]) => (
            <li key={n} className="flex items-center gap-3 h-9 px-2 -mx-2 rounded-[8px]">
              <Home className="w-3.5 h-3.5 shrink-0" style={{ color: A.ink3 }} strokeWidth={1.75} />
              <span className="flex-1 min-w-0 text-[13px] truncate" style={{ color: A.ink }}>{n}</span>
              <span className="w-16 h-1 rounded-full overflow-hidden shrink-0" style={{ background: A.canvas2 }}><span className="block h-full rounded-full" style={{ width: `${(occ / tot) * 100}%`, background: occ === tot ? A.ok : A.ink }} /></span>
              <span className="text-[13px] font-semibold tabular-nums shrink-0 w-10 text-right" style={{ color: A.ink }}>{occ}/{tot}</span>
            </li>
          ))}
        </ul>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium" style={{ color: A.ink3 }}>Alle eiendommer<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} /></span>
    </section>
  );
};

/** Hele oversikten – rail + innhold, 1280 px designbredde. */
export const DASH_W = 1280;
export const DASH_H = 1290;
export const Oversikt = () => (
  <div className="flex overflow-hidden text-left font-body" style={{ width: DASH_W, height: DASH_H, background: A.canvas, color: A.ink, WebkitFontSmoothing: 'antialiased' }} data-testid="produkt-oversikt">
    <Rail user={DATA.user} />
    <main className="flex-1 min-w-0 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-10 pt-9 pb-14">
        {/* 1 · Briefing */}
        <header className="mb-10">
          <div className="flex items-center justify-between gap-4 text-[12.5px]" style={{ color: A.ink3 }}><span className="font-medium tracking-[0.01em]">DigiHome</span><span>{DATA.date}</span></div>
          <h1 className={`${H} mt-2 text-[40px] font-bold tracking-[-0.03em] leading-[1.05]`} style={{ color: A.ink, margin: '8px 0 0' }}>God morgen, {DATA.user.first}.</h1>
          <p className="mt-2.5 text-[17px] leading-snug max-w-[820px]" style={{ color: A.ink2, margin: '10px 0 0' }}>{DATA.brief}</p>
        </header>

        {/* 2 · Prioritert nå */}
        <section className="mb-9">
          <Head title="Prioritert nå" />
          <ul className="list-none p-0 m-0" style={{ borderTop: `1px solid ${A.hair}` }}>
            {DATA.prioritert.map(([tone, n, label, sub], i) => (
              <li key={label} className="flex items-center gap-4 min-h-[60px] py-3" style={{ borderTop: i > 0 ? `1px solid ${A.hair}` : undefined }}>
                <Dot c={{ danger: A.danger, warn: A.warn, purple: A.purple }[tone]} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14.5px] leading-[1.3] truncate" style={{ color: A.ink }}><span className="font-medium tabular-nums">{n} </span>{label}</span>
                  <span className="block text-[12.5px] truncate mt-0.5" style={{ color: A.ink3 }}>{sub}</span>
                </span>
                <Arrow />
              </li>
            ))}
          </ul>
        </section>

        {/* 3 · Siden sist | Venter på deg + DigiHome i arbeid */}
        <div className="grid grid-cols-3 gap-10 mb-10">
          <section className="col-span-2 min-w-0">
            <Head title="Siden sist" to="Se alle" />
            <ol className="list-none p-0 m-0">
              {DATA.aktivitet.map(([tone, Icon, when, pre, rest, detail, needs, src], i) => (
                <li key={rest} className="flex items-center gap-3.5 min-h-[58px] py-2" style={{ borderTop: i > 0 ? `1px solid ${A.hair}` : undefined }}>
                  <Tint tone={tone} icon={Icon} />
                  <span className="w-[54px] shrink-0 text-[12px] leading-[1.3] tabular-nums" style={{ color: A.ink3 }}><span className="block">{when[0]}</span><span className="block">{when[1]}</span></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] truncate leading-[1.35]" style={{ color: A.ink }}><span className="font-semibold">{pre} </span>{rest}</span>
                    <span className="block text-[12.5px] truncate mt-0.5" style={{ color: A.ink3 }}>{detail}</span>
                  </span>
                  {needs && <span className="inline-flex h-[22px] px-2 items-center rounded-full text-[11px] font-semibold shrink-0" style={{ background: A.warnBg, color: A.warn }}>Trenger deg</span>}
                  <Dot c={src} />
                </li>
              ))}
            </ol>
            <div className="flex items-center justify-between h-10 text-[12.5px]" style={{ borderTop: `1px solid ${A.hair}`, color: A.ink3 }}><span>12 håndtert siden i går · 8 til</span><span className="font-medium" style={{ color: A.warn }}>3 trenger deg</span></div>
          </section>
          <aside className="flex flex-col gap-8 min-w-0">
            <VenterKort />
            <section>
              <h2 className={`${H} text-[15px] font-semibold tracking-[-0.01em] flex items-center gap-2 h-8 mb-1`} style={{ color: A.ink, margin: '0 0 4px' }}><Activity className="w-4 h-4" style={{ color: A.purple }} strokeWidth={1.75} />DigiHome i arbeid</h2>
              <ul className="list-none p-0 m-0">
                {DATA.autopilot.map(([Icon, t], i) => (
                  <li key={t} className="flex items-center gap-3 min-h-[44px] py-1.5" style={{ borderTop: i > 0 ? `1px solid ${A.hair}` : undefined }}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: A.purple }} strokeWidth={1.75} />
                    <span className="flex-1 min-w-0 text-[13.5px] truncate" style={{ color: A.ink }}>{t}</span>
                    <span className="text-[11.5px] shrink-0" style={{ color: A.ink3 }}>siden i går</span>
                  </li>
                ))}
              </ul>
              <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium" style={{ color: A.ink3 }}>Operasjonssentralen<ArrowRight className="w-3.5 h-3.5" strokeWidth={2} /></span>
            </section>
          </aside>
        </div>

        {/* 4 · Porteføljehelse */}
        <div className="mb-10"><KpiStripe /></div>

        {/* 5 · Aktive saker | Portefølje */}
        <div className="grid grid-cols-3 gap-10 mb-8">
          <div className="col-span-2 min-w-0"><SakerListe /></div>
          <PortefoljePanel />
        </div>
      </div>
    </main>
  </div>
);

/* ═══════════════════════════════════ EIERENS HJEM (mobilappen) ═══════════════════════════════════ */

export const TLF_W = 390;
export const TLF_H = 844;
const BEZEL = 12;
export const RAMME_W = TLF_W + BEZEL * 2;
export const RAMME_H = TLF_H + BEZEL * 2;

/** Telefonen: mørk titanramme, Dynamic Island, papirhvit skjerm. Én enhet rett forfra – ingen glans, ingen skråstilling. */
export const Telefon = ({ children, kl = '09:41' }) => (
  <div className="relative select-none" style={{ width: RAMME_W, height: RAMME_H }} data-testid="produkt-telefon">
    <span aria-hidden className="absolute rounded-l-[2px]" style={{ left: -3, top: 150, width: 3, height: 34, background: '#2a2a2c' }} />
    <span aria-hidden className="absolute rounded-l-[2px]" style={{ left: -3, top: 206, width: 3, height: 64, background: '#2a2a2c' }} />
    <span aria-hidden className="absolute rounded-l-[2px]" style={{ left: -3, top: 282, width: 3, height: 64, background: '#2a2a2c' }} />
    <span aria-hidden className="absolute rounded-r-[2px]" style={{ right: -3, top: 236, width: 3, height: 98, background: '#2a2a2c' }} />
    <div className="relative h-full w-full" style={{ borderRadius: 64, padding: BEZEL, background: 'linear-gradient(165deg, #3b3b3e 0%, #1d1d1f 45%, #2a2a2d 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(0,0,0,0.6), 0 60px 120px -40px rgba(0,0,0,0.5), 0 24px 48px -24px rgba(0,0,0,0.35)' }}>
      <div className="relative flex h-full w-full flex-col overflow-hidden font-body" style={{ borderRadius: 64 - BEZEL, background: A.canvas, color: A.ink, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.9)', WebkitFontSmoothing: 'antialiased' }}>
        <div className="relative flex items-center justify-between px-9 pt-[18px] text-[16px] font-semibold tabular-nums" style={{ color: A.ink, height: 54 }}>
          <span>{kl}</span>
          <span aria-hidden className="absolute left-1/2 top-[12px] h-[36px] w-[122px] -translate-x-1/2 rounded-full" style={{ background: '#0b0b0c' }} />
          <span className="inline-flex items-center gap-2" aria-hidden>
            <svg width="18" height="12" viewBox="0 0 14 10" fill={A.ink}><rect x="0" y="6" width="2.4" height="4" rx="0.6" /><rect x="3.8" y="4" width="2.4" height="6" rx="0.6" /><rect x="7.6" y="2" width="2.4" height="8" rx="0.6" /><rect x="11.4" y="0" width="2.4" height="10" rx="0.6" /></svg>
            <svg width="28" height="13" viewBox="0 0 22 10" fill="none"><rect x="0.5" y="0.5" width="18" height="9" rx="2.5" stroke={A.ink} strokeOpacity="0.5" /><rect x="2" y="2" width="15" height="6" rx="1.2" fill={A.ink} /><rect x="19.5" y="3" width="1.8" height="4" rx="0.6" fill={A.ink} fillOpacity="0.5" /></svg>
          </span>
        </div>
        {children}
        <span aria-hidden className="absolute bottom-[8px] left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full" style={{ background: 'rgba(26,26,26,0.2)' }} />
      </div>
    </div>
  </div>
);

const EIER = {
  first: 'Jonas', img: '/v4/jonas.webp', eyebrow: 'Lørdag 4. oktober',
  summary: '27 400 kr/mnd i leieinntekt · 2 av 2 boliger utleid · 1 sak venter.',
  monthly: '27 400', annual: '328 800',
  facts: [['2 av 2', 'Utleid'], ['100 %', 'Belegg', A.ok], ['2', 'Kontrakter'], ['1', 'Åpne saker', A.danger]],
  trenger: [
    [A.warnBg, A.warn, ClipboardList, 'Varmtvannsbereder lekker', 'Nygårdsgaten 5 · Emma Sørensen', 'Pågår'],
    [A.purpleBg, A.purple, MessageSquare, '1 ulest melding', 'Forvalteren venter på svar', null],
  ],
  boliger: [
    ['/v4/annonse/stue-moblert-700.webp', 'Nygårdsgaten 5, H0201', 'Bergen sentrum · 3-roms', '14 500'],
    ['/v4/annonse/kjokken-600.webp', 'Nygårdsgaten 5, H0302', 'Bergen sentrum · 2-roms', '12 900'],
  ],
  tabs: [[LayoutGrid, 'Oversikt', true], [Building2, 'Boliger'], [Wallet, 'Økonomi'], [MessageSquare, 'Meldinger', false, 1], [User, 'Profil']],
};

const Label = ({ children }) => <p className="text-[11px] font-medium uppercase" style={{ letterSpacing: 1.1, color: A.ink3, margin: 0 }}>{children}</p>;
const Lead = ({ bg, children }) => <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: bg }}>{children}</span>;

/** Eierens hjem – mobile/app/owner/index.tsx: hilsen, inntekt, fakta-stripe, «Trenger deg», «Mine boliger», tabs. */
export const EierHjem = () => (
  <>
    <div className="flex-1 min-h-0 overflow-hidden px-5 pt-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2"><Label>{EIER.eyebrow}</Label></div>
          <p className={`${H} text-[30px] font-bold leading-[34px]`} style={{ letterSpacing: -0.8, color: A.ink, margin: 0 }}>God morgen, {EIER.first}.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={EIER.img} alt="" className="w-[38px] h-[38px] rounded-full object-cover shrink-0 mt-[22px]" style={{ background: A.canvas2 }} />
      </div>
      <p className="text-[15.5px] leading-[23px] mt-2.5" style={{ color: A.ink2, margin: '10px 0 0' }}>{EIER.summary}</p>

      <div className="mt-6 rounded-[16px] p-5" style={{ background: A.field, border: `1px solid ${A.hair}` }}>
        <Label>Månedlig inntekt</Label>
        <div className="flex items-end mt-2">
          <span className={`${H} text-[36px] font-bold leading-[40px] tabular-nums`} style={{ letterSpacing: -1.2, color: A.ink }}>{N(EIER.monthly)}</span>
          <span className="text-[12.5px] ml-1.5 mb-1.5" style={{ color: A.ink3 }}>kr/mnd</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[12.5px]" style={{ color: A.ink2 }}><TrendingUp className="w-3.5 h-3.5" style={{ color: A.ok }} strokeWidth={2} />Est. {EIER.annual} kr/år</div>
      </div>

      <div className="mt-4 flex py-3.5" style={{ borderTop: `1px solid ${A.hair}`, borderBottom: `1px solid ${A.hair}` }}>
        {EIER.facts.map(([v, l, c], i) => (
          <div key={l} className="flex-1 px-2" style={{ borderLeft: i ? `1px solid ${A.hair}` : undefined }}>
            <p className={`${H} text-[20px] font-bold leading-[24px] tabular-nums whitespace-nowrap`} style={{ letterSpacing: -0.6, color: c || A.ink, margin: 0 }}>{N(v)}</p>
            <p className="text-[11.5px] mt-0.5 whitespace-nowrap" style={{ color: A.ink3, margin: '2px 0 0' }}>{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-baseline gap-2 mb-1.5"><p className={`${H} text-[17px] font-bold leading-[22px]`} style={{ letterSpacing: -0.3, color: A.ink, margin: 0 }}>Trenger deg</p><span className="text-[12.5px] tabular-nums" style={{ color: A.ink3 }}>2</span></div>
        {EIER.trenger.map(([bg, fg, Icon, t, s, pill], i) => (
          <div key={t} className="flex items-center gap-3 py-3" style={{ borderBottom: i < EIER.trenger.length - 1 ? `1px solid ${A.hair}` : undefined }}>
            <Lead bg={bg}><Icon className="w-4 h-4" style={{ color: fg }} strokeWidth={2} /></Lead>
            <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-medium truncate" style={{ color: A.ink }}>{t}</span><span className="block text-[12.5px] truncate" style={{ color: A.ink3 }}>{s}</span></span>
            {pill ? <span className="text-[11.5px] font-medium px-2.5 h-6 inline-flex items-center rounded-full" style={{ background: A.canvas2, color: A.ink2 }}>{pill}</span> : <ChevronRight className="w-[17px] h-[17px]" style={{ color: A.ink3 }} />}
          </div>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-baseline justify-between mb-3"><div className="flex items-baseline gap-2"><p className={`${H} text-[17px] font-bold leading-[22px]`} style={{ letterSpacing: -0.3, color: A.ink, margin: 0 }}>Mine boliger</p><span className="text-[12.5px] tabular-nums" style={{ color: A.ink3 }}>2</span></div></div>
        <div className="flex flex-col gap-3">
          {EIER.boliger.map(([img, t, s, rent]) => (
            <div key={t} className="rounded-[16px] overflow-hidden" style={{ background: A.field, border: `1px solid ${A.hair}` }}>
              <div className="relative w-full" style={{ aspectRatio: '16 / 9', background: A.canvas2 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute left-3 top-3 inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-medium" style={{ background: 'rgba(250,249,246,0.92)', color: A.ok }}>Utleid</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <span className="flex-1 min-w-0">
                  <span className={`${H} block text-[15px] font-bold leading-[20px] truncate`} style={{ color: A.ink }}>{t}</span>
                  <span className="flex items-center gap-1 mt-[3px] text-[12.5px]" style={{ color: A.ink3 }}><MapPin className="w-3 h-3" strokeWidth={1.6} />{s}</span>
                </span>
                <span className="text-right"><span className={`${H} block text-[16px] font-bold tabular-nums`} style={{ color: A.ink }}>{N(rent)}</span><span className="block text-[11px]" style={{ color: A.ink3 }}>kr/mnd</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="shrink-0 flex items-start justify-around px-2 pt-2" style={{ height: 84, background: A.field, borderTop: `1px solid ${A.hair}` }}>
      {EIER.tabs.map(([Icon, l, on, badge]) => (
        <span key={l} className="relative inline-flex flex-col items-center gap-1 py-1 w-16 text-[10.5px] font-medium" style={{ color: on ? A.ink : A.ink3, letterSpacing: 0.3 }}>
          <Icon className="w-[22px] h-[22px]" strokeWidth={on ? 2 : 1.75} />{l}
          {badge && <span className="absolute top-0 right-3 w-[8px] h-[8px] rounded-full" style={{ background: A.purple, boxShadow: `0 0 0 2px ${A.field}` }} />}
        </span>
      ))}
    </div>
  </>
);

/** Telefonen med eierens hjem, skalert til bredden den får. */
export const EierTelefon = ({ className = '', style, testid }) => (
  <Skaler w={RAMME_W} h={RAMME_H} className={className} style={style} testid={testid}><Telefon><EierHjem /></Telefon></Skaler>
);

/* ─── Leietakerens hjem – mobile/app/tenant/index.tsx: hilsen og status, boligen (16:9 m/ adresse), nøkkeltall, leieforholdet, forvalteren ─── */
const LEIE = {
  first: 'Emma', img: '/v4/annonse/leietaker-emma.webp', eyebrow: 'Lørdag 4. oktober',
  status: 'Husleien for oktober er betalt. Leieforholdet løper til 31. august 2029.',
  cover: '/v4/annonse/stue-moblert-700.webp', adresse: 'Nygårdsgaten 5, H0201', bilder: 12,
  stats: [['14 500', 'Leie/mnd'], ['43 500', 'Depositum'], ['64 m²', 'Areal'], ['2', 'Soverom']],
  rows: [
    ['Leieperiode', '1. sep 2026 – 31. aug 2029', null],
    ['Husleie', 'Forfall den 1. · KID', null],
    ['Depositum', 'Depositumskonto · Keyhole', 'Sikret'],
    ['Dokumenter', 'Leiekontrakt · Innflyttingsprotokoll', null],
  ],
  forvalter: { name: 'Sarah Sleeman', role: 'Din forvalter · DigiHome', img: '/brand/sarah-sleeman-360.webp', pos: '50% 28%' },
  tabs: [[Home, 'Hjem', true], [ClipboardList, 'Saker'], [Receipt, 'Husleie'], [MessageSquare, 'Meldinger'], [User, 'Profil']],
};

export const LeietakerHjem = () => (
  <>
    <div className="flex-1 min-h-0 overflow-hidden px-5 pt-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2"><Label>{LEIE.eyebrow}</Label></div>
          <p className={`${H} text-[30px] font-bold leading-[34px]`} style={{ letterSpacing: -0.8, color: A.ink, margin: 0 }}>God morgen, {LEIE.first}.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LEIE.img} alt="" className="w-[38px] h-[38px] rounded-full object-cover shrink-0 mt-[22px]" style={{ background: A.canvas2 }} />
      </div>
      <p className="text-[15.5px] leading-[23px] mt-2.5" style={{ color: A.ink2, margin: '10px 0 0' }}>{LEIE.status}</p>

      <div className="mt-6 rounded-[16px] overflow-hidden" style={{ background: A.field, border: `1px solid ${A.hair}` }}>
        <div className="relative w-full" style={{ aspectRatio: '16 / 9', background: A.canvas2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LEIE.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 h-7 pl-2.5 pr-3 rounded-full text-[12px] font-medium" style={{ background: 'rgba(250,249,246,0.92)', color: A.ink }}><MapPin className="w-3 h-3" strokeWidth={1.8} />{LEIE.adresse}</span>
          <span className="absolute right-3 bottom-3 inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-medium tabular-nums" style={{ background: 'rgba(26,26,26,0.72)', color: A.onInk }}>{LEIE.bilder} bilder</span>
        </div>
        <div className="flex py-3.5 px-2">
          {LEIE.stats.map(([v, l], i) => (
            <div key={l} className="flex-1 px-2" style={{ borderLeft: i ? `1px solid ${A.hair}` : undefined }}>
              <p className={`${H} text-[17px] font-bold leading-[22px] tabular-nums whitespace-nowrap`} style={{ letterSpacing: -0.5, color: A.ink, margin: 0 }}>{N(v)}</p>
              <p className="text-[11px] mt-0.5 whitespace-nowrap" style={{ color: A.ink3, margin: '2px 0 0' }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <p className={`${H} text-[17px] font-bold leading-[22px] mb-1`} style={{ letterSpacing: -0.3, color: A.ink, margin: '0 0 4px' }}>Leieforholdet</p>
        {LEIE.rows.map(([t, s, pill], i) => (
          <div key={t} className="flex items-center gap-3 py-3" style={{ borderBottom: i < LEIE.rows.length - 1 ? `1px solid ${A.hair}` : undefined }}>
            <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-medium" style={{ color: A.ink }}>{t}</span><span className="block text-[12.5px] truncate" style={{ color: A.ink3 }}>{s}</span></span>
            {pill ? <span className="text-[11.5px] font-medium px-2.5 h-6 inline-flex items-center rounded-full" style={{ background: A.okBg, color: A.ok }}>{pill}</span> : <ChevronRight className="w-[17px] h-[17px]" style={{ color: A.ink3 }} />}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[16px] p-4 flex items-center gap-3" style={{ background: A.field, border: `1px solid ${A.hair}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LEIE.forvalter.img} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" style={{ objectPosition: LEIE.forvalter.pos }} />
        <span className="flex-1 min-w-0"><span className={`${H} block text-[15px] font-bold leading-[20px] truncate`} style={{ color: A.ink }}>{LEIE.forvalter.name}</span><span className="block text-[12.5px] truncate" style={{ color: A.ink3 }}>{LEIE.forvalter.role}</span></span>
        <span className="inline-flex items-center h-9 px-4 rounded-full text-[13px] font-medium shrink-0" style={{ background: A.ink, color: A.onInk }}>Ta kontakt</span>
      </div>
    </div>
    <div className="shrink-0 flex items-start justify-around px-2 pt-2" style={{ height: 84, background: A.field, borderTop: `1px solid ${A.hair}` }}>
      {LEIE.tabs.map(([Icon, l, on]) => (
        <span key={l} className="relative inline-flex flex-col items-center gap-1 py-1 w-16 text-[10.5px] font-medium" style={{ color: on ? A.ink : A.ink3, letterSpacing: 0.3 }}>
          <Icon className="w-[22px] h-[22px]" strokeWidth={on ? 2 : 1.75} />{l}
        </span>
      ))}
    </div>
  </>
);

export const LeietakerTelefon = ({ className = '', style, testid }) => (
  <Skaler w={RAMME_W} h={RAMME_H} className={className} style={style} testid={testid}><Telefon kl="09:41"><LeietakerHjem /></Telefon></Skaler>
);
