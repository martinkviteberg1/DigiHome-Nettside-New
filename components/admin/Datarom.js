'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   DATAROM — investorrommet. Seks sider (styrt av `tab` fra sidemenyen):
     oversikt   · nøkkeltall, resultatgraf og investorpakke
     resultat   · månedlig P&L fra oppstart (kan stå tomt)
     enheter    · enhetsøkonomi per leilighet/rom (import fra Leieforhold)
     pipeline   · enheter på vei inn — signert kontra forventet
     selskap    · ansatte, faste kostnader, gjeld og aksjonærlån
     dokumenter · lesetilgang til DD-hvelvet (administreres i Investor-rom)
   Admin ser og redigerer alt; investor får read-only av sine tildelte sider.
   ──────────────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Landmark, TrendingUp, Wallet, Home, KeyRound, FileSpreadsheet, Loader2, Plus,
  Trash2, X, Check, RefreshCw, FileText, Download, ShieldCheck, ArrowRight,
  BarChart3, AlertTriangle, Pencil, CircleDollarSign, Building2, Users, Settings2,
  CalendarClock, ArrowUpRight, ArrowDownRight, HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import KostnadsSkuff from '@/components/admin/KostnadsSkuff';
import Enhetsokonomi from '@/components/admin/Enhetsokonomi';
import { aktiveKostnader, beregnHonorarTrapp, visGruppe, anvendScenario } from '@/lib/leieforhold-filter';
import { cacheLes, cacheHent, cacheSlett } from '@/lib/klient-cache';
import Omvisning from '@/components/admin/Omvisning';

const heading = { fontFamily: 'var(--font-heading)' };
const tallFmt = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const tall = (v) => tallFmt.format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const kr = (v) => `${tall(v)}\u202Fkr`;
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymLabel = (ym) => { const [y, m] = String(ym).split('-'); return `${MND_KORT[Number(m) - 1]} ${y}`; };

const STATUS_META = {
  utleid: { l: 'Utleid', farge: '#1f7a45', bg: '#e7f4ec' },
  ledig: { l: 'Ledig', farge: '#8a7f72', bg: '#f3f2f0' },
  signert: { l: 'Signert', farge: '#1f7a45', bg: '#e7f4ec' },
  forventet: { l: 'Forventet', farge: '#9a6b1c', bg: '#fdf3e0' },
};

const Kort = ({ className = '', children, ...rest }) => (
  <div className={`rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] ${className}`} {...rest}>{children}</div>
);

/* ── Dashboard-byggeklosser (moderne kortspråk — samme som Leieforhold) ── */
const Chip = ({ bg, fg, children }) => (
  <span className="inline-flex items-center rounded-full px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.07em]" style={{ background: bg, color: fg }}>{children}</span>
);

function RingLite({ pct = 0, size = 34, farge = '#0e7490' }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceae6" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={farge} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)}
        style={{ transition: 'stroke-dashoffset 0.7s ease' }}
      />
    </svg>
  );
}

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.ledig;
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: m.farge, background: m.bg }}>{m.l}</span>;
};

/* Tellende tall — myk easeOut-animasjon når verdien endres (f.eks. ved
   fremtidsbilde). Respekterer prefers-reduced-motion. */
function useCountUp(verdi, dur = 650) {
  const [vist, setVist] = useState(verdi);
  const forrige = React.useRef(verdi);
  useEffect(() => {
    const fra = forrige.current;
    const til = verdi;
    forrige.current = til;
    if (fra === til) return undefined;
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) { setVist(til); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVist(fra + (til - fra) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [verdi, dur]);
  return vist;
}

const AnimertTall = ({ verdi, prefix = '', suffix = '\u202Fkr', className = '', style }) => {
  const vist = useCountUp(verdi);
  return <span className={className} style={style}>{prefix}{tall(vist)}{suffix}</span>;
};

const TomtFelt = ({ icon: Icon, tittel, tekst }) => (
  <div className="flex flex-col items-center gap-3 py-14 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f0fb]"><Icon className="h-6 w-6 text-[#8b5cf6]" /></span>
    <p className="text-[15px] font-bold text-[#0a0a0a]" style={heading}>{tittel}</p>
    <p className="max-w-[380px] text-[12.5px] leading-relaxed text-[#999]">{tekst}</p>
  </div>
);

export default function Datarom({ apiKey, tab = 'oversikt', erAdmin = false, onGaaTil, onAapneBudsjett, autoTour = false, eoAutoTour = false }) {
  const api = useCallback(async (sti, opts = {}) => {
    const skille = sti.includes('?') ? '&' : '?';
    const r = await fetch(`/api/admin/datarom/${sti}${skille}key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Noe gikk galt');
    return j;
  }, [apiKey]);

  const xlsxHref = `/api/admin/datarom/xlsx?key=${encodeURIComponent(apiKey)}`;

  return (
    <div data-testid="datarom-modul">
      {tab === 'oversikt' && <Oversikt api={api} apiKey={apiKey} xlsxHref={xlsxHref} erAdmin={erAdmin} onGaaTil={onGaaTil} onAapneBudsjett={onAapneBudsjett} autoTour={autoTour} />}
      {tab === 'resultat' && (
        <Kort data-testid="datarom-resultat-kommer-snart">
          <TomtFelt
            icon={BarChart3}
            tittel="Kommer snart"
            tekst="Regnskapet lanseres her — månedlig resultat fra oppstart med inntekter, kostnader og akkumulert utvikling."
          />
        </Kort>
      )}
      {tab === 'enheter' && <Enhetsokonomi api={api} erAdmin={erAdmin} autoTour={eoAutoTour} apiKey={apiKey} />}
      {tab === 'pipeline' && <Enheter api={api} erAdmin={erAdmin} fase="pipeline" />}
      {tab === 'selskap' && <Selskap api={api} erAdmin={erAdmin} />}
      {tab === 'dokumenter' && <Dokumenter api={api} apiKey={apiKey} erAdmin={erAdmin} />}
    </div>
  );
}

/* ── Oversikt ─────────────────────────────────────────────────────────────── */

function Oversikt({ api, apiKey, xlsxHref, erAdmin, onGaaTil, onAapneBudsjett, autoTour = false }) {
  // Klient-cache (stale-while-revalidate): rendrer momentant fra sist kjente
  // data ved fanebytte, og revaliderer stille i bakgrunnen. Første besøk viser
  // skeleton som før — alle senere besøk er øyeblikkelige.
  const [data, setData] = useState(() => (cacheLes('dr:oversikt') || {}).oversikt || null);
  const [lf, setLf] = useState(() => cacheLes('lf:data') || null); // live leieforhold-rader fra plattformen
  const [laster, setLaster] = useState(() => !cacheLes('dr:oversikt'));
  const [kostSkuff, setKostSkuff] = useState(false);
  const [scenario, setScenario] = useState(''); // fremtidsbilde: ISO-dato eller ''

  // Omvisning: auto-start første gang for investorer, «?» for alle.
  // (Hooks må ligge FØR skeleton-/feil-returene under.)
  const [tourAktiv, setTourAktiv] = useState(false);
  const tourStartetRef = useRef(false);  // maks én auto-start per økt
  const tourScenarioRef = useRef(false); // touren har satt fremtidsbilde → nullstill

  const tourFerdig = useCallback(() => {
    setTourAktiv(false);
    if (tourScenarioRef.current) { setScenario(''); tourScenarioRef.current = false; }
    try { localStorage.setItem('dh-omvisning-datarom', '1'); } catch (e) {}
    // Persistér «sett» på kontoen (best effort) — gjelder da alle enheter.
    fetch(`/api/admin/auth/profile?key=${encodeURIComponent(apiKey)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourSett: 'datarom' }),
    }).catch(() => {});
  }, [apiKey]);

  useEffect(() => {
    if (!autoTour || tourStartetRef.current || laster) return undefined;
    if (!(lf?.rows || []).length) return undefined; // vent på livstall (trapp/scenario trenger dem)
    if (typeof window === 'undefined' || window.innerWidth < 1024) return undefined;
    try { if (localStorage.getItem('dh-omvisning-datarom')) return undefined; } catch (e) {}
    tourStartetRef.current = true;
    const t = setTimeout(() => setTourAktiv(true), 900);
    return () => clearTimeout(t);
  }, [autoTour, laster, lf]);

  const hent = useCallback(async (force = false) => {
    try {
      const j = await cacheHent('dr:oversikt', () => api('oversikt'), { force });
      if (j?.oversikt) setData(j.oversikt);
    } catch (e) {}
    setLaster(false);
  }, [api]);
  useEffect(() => { hent(); }, [hent]);
  // Livstall fra plattformen — honorar-trapp, portefølje og bevegelser regnes
  // av samme motor som Leieforhold-flaten (lib/leieforhold-filter). Deler
  // cache-nøkkel med Leieforhold → bytte mellom flatene er momentant.
  useEffect(() => {
    cacheHent('lf:data', `/api/admin/leieforhold?key=${encodeURIComponent(apiKey)}`)
      .then((j) => { if (j?.ok) setLf(j); })
      .catch(() => { /* dashboardet fungerer også uten livstall */ });
  }, [apiKey]);

  if (laster) return <Skeleton />;
  if (!data) return <Kort><TomtFelt icon={AlertTriangle} tittel="Kunne ikke laste oversikten" tekst="Prøv å laste siden på nytt." /></Kort>;

  /* ── Selskapspulsen: alle nøkkeltall regnet live ──
     Med scenario-dato («fremtidsbilde») flyttes porteføljen fram i tid med
     samme motor som Leieforhold: signerte innflyttinger t.o.m. datoen telles
     som utleid, utflyttinger før datoen som ledig. ── */
  const rows = lf?.rows || [];
  const visRows = scenario ? anvendScenario(rows, scenario) : rows;
  const trapp = visRows.length ? beregnHonorarTrapp(visRows) : null;
  const trappIdag = scenario && rows.length ? beregnHonorarTrapp(rows) : trapp;
  const mrr = trapp ? trapp.iDag : (data.drift.honorarMnd || 0);
  const mrrDelta = scenario && trapp && trappIdag ? trapp.iDag - trappIdag.iDag : 0;
  const ok = data.okonomi || {};
  // Faste kostnader regnes på scenario-datoen (poster med start/slutt respekteres)
  const fellesVis = scenario
    ? aktiveKostnader(ok.felles || [], scenario).reduce((s, p) => s + (p.belop || 0), 0)
    : (ok.fellesMnd || 0);
  const margin = mrr - fellesVis;
  const bePct = fellesVis > 0 ? Math.round((mrr / fellesVis) * 100) : null;

  const GRUPPER = [
    ['leased', 'Utleid', '#1f9a53'],
    ['future', 'Fremtidig', '#3757c4'],
    ['signing', 'Signering', '#0e7490'],
    ['advertised', 'Annonsert', '#d97706'],
    ['vacant', 'Ledig', '#a8a29a'],
  ];
  const fordeling = GRUPPER.map(([k, l, farge]) => {
    const g = visRows.filter((r) => visGruppe(r) === k);
    return { k, l, farge, antall: g.length, leie: g.reduce((s, r) => s + (r.monthly_rent || 0), 0) };
  });
  const antallEnheter = visRows.length;
  const utleide = fordeling[0]?.antall || 0;
  const utleidLeie = fordeling[0]?.leie || 0;
  const utleiegrad = antallEnheter ? Math.round((utleide / antallEnheter) * 100) : 0;
  const paaVei = fordeling.slice(1, 4).reduce((s, f) => s + f.antall, 0);
  const enheterIgjen = margin < 0 && utleide > 0 && mrr > 0 ? Math.ceil(-margin / (mrr / utleide)) : 0;

  // Neste 30 dager — inn- og utflyttinger fra kontraktenes datoer.
  // Med fremtidsbilde: vinduet starter på scenario-datoen.
  const iDagIso = new Date().toISOString().slice(0, 10);
  const baseIso = scenario || iDagIso;
  const om30 = new Date(new Date(`${baseIso}T12:00:00`).getTime() + 30 * 864e5).toISOString().slice(0, 10);
  const bevegelser = [
    ...rows.filter((r) => r.move_in_date && r.move_in_date > baseIso && r.move_in_date <= om30).map((r) => ({ type: 'inn', dato: r.move_in_date, r })),
    ...rows.filter((r) => r.move_out_date && r.move_out_date > baseIso && r.move_out_date <= om30).map((r) => ({ type: 'ut', dato: r.move_out_date, r })),
  ].sort((a, b) => a.dato.localeCompare(b.dato));
  const innLeie = bevegelser.filter((b) => b.type === 'inn').reduce((s, b) => s + (b.r.monthly_rent || 0), 0);
  const utLeie = bevegelser.filter((b) => b.type === 'ut').reduce((s, b) => s + (b.r.monthly_rent || 0), 0);
  const nettoEndring = innLeie - utLeie;
  const dtoNo = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  const plussMnd = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
  const imorgen = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  /* ── Omvisning: 5 steg med levende fremtidsbilde-demo — steg 3 aktiverer
     faktisk «+3 mnd» slik at investoren SER hele oversikten regnes om.
     Nullstilles garantert i tourFerdig. ── */
  const tourSteg = [
    {
      id: 'selskapspuls',
      tittel: 'Månedlig honorar',
      tekst: 'DigiHomes løpende honorarinntekt (eks. mva). Trappen viser nivåene: i dag → signert → annonsert → full utleie.',
      maal: () => document.querySelector('[data-testid="dr-hero"]'),
    },
    {
      id: 'fremtidsbilde-kontroll',
      tittel: 'Beregning per dato',
      tekst: 'Oversikten kan beregnes per en fremtidig dato — «+1 mnd», «+3 mnd» eller en valgfri dato. Signerte kontrakter fases inn fra sin startdato.',
      maal: () => document.querySelector('[data-testid="dr-scenario"]'),
    },
    {
      id: 'fremtidsbilde-aktiv',
      tittel: 'Eksempel: om tre måneder',
      tekst: 'Tallene viser nå porteføljen tre måneder frem. Datoen nullstilles automatisk når omvisningen avsluttes.',
      foer: async () => { tourScenarioRef.current = true; setScenario(plussMnd(3)); },
      maal: () => document.querySelector('[data-testid="dr-hero"]'),
    },
    {
      id: 'statstripe',
      tittel: 'Nøkkeltallene',
      tekst: 'Margin, pipeline, ARR-potensial og utleiegrad — alle beregnet per valgt dato. Margin er honorar minus faste kostnader.',
      maal: () => document.querySelector('[data-testid="dr-statstripe"]'),
    },
    {
      id: 'investorpakke',
      tittel: 'Eksport',
      tekst: 'Hele datarommet — nøkkeltall, enheter og økonomi — kan lastes ned som formatert Excel med gjeldende tall.',
      maal: () => document.querySelector('[data-testid="datarom-xlsx"]'),
    },
  ];

  return (
    <div className="space-y-3">
      {/* ── HERO: honoraret — ett dominant tall; kontrollene bor i kortet (én topprad) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="dr-hero">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_240px_at_100%_0%,rgba(124,58,237,0.045),transparent_65%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <div className="min-w-0" data-testid="dr-kpi-mrr">
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#a3a3a3]">{scenario ? `Honorar per måned · ved ${dtoNo(scenario)}` : 'Honorar per måned'}</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
                <AnimertTall verdi={mrr} className="text-[32px] font-bold leading-none tabular-nums tracking-[-0.03em] text-[#0a0a0a] sm:text-[36px]" style={heading} />
                {scenario && mrrDelta !== 0 && (
                  <span className={`rounded-full px-2 py-[3px] text-[11.5px] font-bold tabular-nums ${mrrDelta > 0 ? 'bg-[#e8f6ee] text-[#15803d]' : 'bg-[#fdeef1] text-[#be123c]'}`} data-testid="dr-mrr-delta">
                    {mrrDelta > 0 ? '+' : ''}{kr(mrrDelta)} vs. i dag
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-[#a8a29a]">≈ {kr(mrr * 12)}/år run-rate · eks. mva · DigiHomes inntekt — ikke leie</p>
            </div>
            {/* Kontroller i kortet — én topprad totalt: fremtidsbilde + investorpakke */}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-[#fafaf8] p-[3px]" data-testid="dr-scenario">
                <CalendarClock className="ml-1.5 h-3.5 w-3.5 shrink-0 text-[#b5b5b5]" />
                {[['', 'I dag'], [plussMnd(1), '+1 mnd'], [plussMnd(3), '+3 mnd']].map(([v, l]) => (
                  <button
                    key={l}
                    onClick={() => setScenario(v)}
                    data-testid={`dr-scenario-${l === 'I dag' ? 'idag' : l.replace(/\W/g, '')}`}
                    className={`h-6 rounded-full px-2.5 text-[11px] font-semibold transition-all ${scenario === v ? 'bg-[#0a0a0a] text-white' : 'text-[#8a8278] hover:text-[#0a0a0a]'}`}
                  >
                    {l}
                  </button>
                ))}
                <input
                  type="date"
                  value={scenario}
                  min={imorgen}
                  onChange={(e) => setScenario(e.target.value && e.target.value >= imorgen ? e.target.value : '')}
                  data-testid="dr-scenario-dato"
                  className="h-6 w-[118px] rounded-full bg-transparent px-1.5 text-[11px] text-[#78716c] outline-none"
                  title="Velg en dato og se hvordan porteføljen ser ut da"
                />
              </div>
              {scenario && (
                <button
                  onClick={() => setScenario('')}
                  data-testid="dr-scenario-badge"
                  title="Tilbake til i dag"
                  className="flex items-center gap-1.5 rounded-full bg-[#fdf3e0] px-2.5 py-[5px] text-[11px] font-semibold text-[#9a6b1c] transition-colors hover:bg-[#f5e6c8]"
                >
                  Fremtidsbilde {dtoNo(scenario)} <X className="h-3 w-3" />
                </button>
              )}
              <a
                href={xlsxHref}
                data-testid="datarom-xlsx"
                title="Last ned investorpakke (Excel)"
                className="flex h-8 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-3.5 text-[12px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Investorpakke
              </a>
              <button
                onClick={() => setTourAktiv(true)}
                data-testid="datarom-omvisning-knapp"
                title="Omvisning — se hva oversikten kan"
                aria-label="Start omvisning"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] bg-white text-[#b5b5b5] transition-all hover:bg-[#fafaf8] hover:text-[#0a0a0a]"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {trapp && (
            <div className="mt-4" data-testid="dr-honorar-trapp">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Veksttrappen — kumulativt fra i dag til full utleie</p>
                <p className="hidden text-[10px] text-[#c2beb8] sm:block">live fra plattformen · ~ = estimert med snittsats</p>
              </div>
              <div className="flex h-[9px] w-full overflow-hidden rounded-full bg-[#f0eee9]">
                {trapp.potensial > 0 && (
                  <>
                    <div className="h-full bg-[#0a0a0a] transition-all duration-700" style={{ width: `${(trapp.iDag / trapp.potensial) * 100}%` }} />
                    <div className="h-full bg-[#8b5cf6] transition-all duration-700" style={{ width: `${((trapp.sikret - trapp.iDag) / trapp.potensial) * 100}%` }} />
                    <div className="h-full bg-[#d8ccf6] transition-all duration-700" style={{ width: `${((trapp.medAnnonsert - trapp.sikret) / trapp.potensial) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
                {[
                  ['#0a0a0a', scenario ? `Ved ${dtoNo(scenario)}` : 'I dag', kr(trapp.iDag), `${utleide} enheter betaler`],
                  ['#8b5cf6', '+ Signert', `${trapp.estSikret ? '~' : ''}${kr(trapp.sikret)}`, `+${trapp.estSikret ? '~' : ''}${kr(trapp.sikret - trapp.iDag)} signerte leiekontrakter`],
                  ['#d8ccf6', '+ Annonsert', `${trapp.estAnnonsert ? '~' : ''}${kr(trapp.medAnnonsert)}`, `+${trapp.estAnnonsert ? '~' : ''}${kr(trapp.medAnnonsert - trapp.sikret)} ute i markedet`],
                  ['#d5d0c8', 'Full utleie', `${trapp.estFull ? '~' : ''}${kr(trapp.potensial)}`, `≈ ${trapp.estFull ? '~' : ''}${kr(trapp.potensial * 12)}/år`],
                ].map(([farge, l, v, sub], i) => (
                  <div key={l} className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-[#b5b5b5]"><span className="h-[6px] w-[6px] rounded-full" style={{ background: farge }} />{l}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[16px] font-bold leading-none tabular-nums tracking-[-0.01em] text-[#0a0a0a]" style={heading}>
                      {i > 0 && <span aria-hidden className="text-[13px] font-semibold leading-none text-[#c9c4bc]">→</span>}
                      {v}
                    </p>
                    <p className="mt-1 truncate text-[10.5px] text-[#a8a29a]">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat-stripen: fem nøkkeltall — margin først (handlingssignalet) ── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-black/[0.05] shadow-[0_2px_16px_rgba(0,0,0,0.04)] xl:grid-cols-5" data-testid="dr-statstripe">
        <div className="bg-white px-4 py-3.5 sm:px-5" data-testid="dr-kpi-margin">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Margin / mnd</p>
          <AnimertTall verdi={margin} className="mt-1.5 block text-[21px] font-bold leading-none tabular-nums tracking-[-0.02em]" style={{ ...heading, color: margin >= 0 ? '#15803d' : '#be123c' }} />
          <p className="mt-1.5 truncate text-[10.5px] font-medium text-[#78716c]">{bePct != null ? (bePct >= 100 ? 'over break-even — ny enhet er ~ren margin' : `dekker ${bePct} % · ~${enheterIgjen} enheter til break-even`) : 'honorar − aktive faste kostnader'}</p>
        </div>
        <div className="bg-white px-4 py-3.5 sm:px-5" data-testid="dr-kpi-pipeline">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Pipeline honorar</p>
          <p className="mt-1.5 text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{trapp ? `+${trapp.estAnnonsert ? '~' : ''}${kr(trapp.medAnnonsert - trapp.iDag)}` : '—'}</p>
          <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">{paaVei} enheter på vei · signert + annonsert</p>
        </div>
        <div className="bg-white px-4 py-3.5 sm:px-5" data-testid="dr-kpi-arr">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">ARR-potensial</p>
          <p className="mt-1.5 text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{trapp ? `${trapp.estFull ? '~' : ''}${kr(trapp.potensial * 12)}` : '—'}</p>
          <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">{trapp ? `ved full utleie · ${trapp.estFull ? '~' : ''}${kr(trapp.potensial)}/mnd` : 'henter livstall …'}</p>
        </div>
        <div className="bg-white px-4 py-3.5 sm:px-5" data-testid="dr-kpi-utleiegrad">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Utleiegrad</p>
          <div className="mt-1.5 flex items-center gap-2">
            <RingLite pct={utleiegrad} size={26} farge="#0a0a0a" />
            <p className="text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{utleiegrad} %</p>
          </div>
          <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">{utleide} av {antallEnheter || '—'} enheter utleid</p>
        </div>
        <div className="col-span-2 bg-white px-4 py-3.5 sm:px-5 xl:col-span-1" data-testid="dr-kpi-leie">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Leie under forvaltning</p>
          <p className="mt-1.5 text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{utleidLeie > 0 ? kr(utleidLeie) : '—'}</p>
          <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">huseiernes leiegrunnlag — ikke DigiHomes inntekt</p>
        </div>
      </div>

      {/* ── Neste 30 dager + porteføljefordeling ──
          grid-cols-1 + minmax(0,…): uten dette får grid-barna min-width:auto
          og nekter å krympe under innholdsbredden på mobil (horisontal scroll). */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Kort className="min-w-0" data-testid="dr-bevegelser">
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><CalendarClock className="h-3.5 w-3.5" /> Neste 30 dager{scenario ? ` · fra ${dtoNo(baseIso)}` : ''}</p>
            {bevegelser.length > 0 && (
              <span className={`ml-auto rounded-full px-2 py-[3px] text-[10px] font-bold tabular-nums ${nettoEndring >= 0 ? 'bg-[#e8f6ee] text-[#15803d]' : 'bg-[#fdeef1] text-[#be123c]'}`}>
                {nettoEndring >= 0 ? '+' : ''}{kr(nettoEndring)} leie/mnd netto
              </span>
            )}
          </div>
          {bevegelser.length === 0 ? (
            <p className="mt-3 rounded-xl bg-[#fafaf8] px-3.5 py-3 text-[12px] text-[#999]">Ingen planlagte inn- eller utflyttinger de neste 30 dagene — porteføljen ligger stabilt.</p>
          ) : (
            <div className="mt-2.5 space-y-0.5">
              {bevegelser.slice(0, 6).map((b, i) => (
                <div key={`${b.dato}-${i}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#fafaf8]">
                  <span className={`flex h-6 w-[42px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold uppercase tracking-[0.06em] ${b.type === 'inn' ? 'bg-[#e8f6ee] text-[#15803d]' : 'bg-[#fdf3e0] text-[#b45309]'}`}>
                    {b.type === 'inn' ? 'Inn' : 'Ut'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-[#0a0a0a]">{b.r.unit_room || b.r.address}</span>
                    <span className="block truncate text-[11px] text-[#999]">{b.type === 'inn' ? 'Innflytting' : 'Utflytting'} · {dtoNo(b.dato)}{b.r.tenant_name ? ` · ${b.r.tenant_name}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-[12.5px] font-bold tabular-nums ${b.type === 'inn' ? 'text-[#15803d]' : 'text-[#b45309]'}`}>{b.type === 'inn' ? '+' : '−'}{kr(b.r.monthly_rent || 0)}</span>
                    {b.type === 'inn' && b.r.fee_amount > 0 && <span className="block text-[10px] tabular-nums text-[#a8a29a]">+{kr(b.r.fee_amount)} honorar</span>}
                  </span>
                </div>
              ))}
              {bevegelser.length > 6 && (
                <p className="px-2.5 pt-1 text-[11px] text-[#b5b5b5]">+ {bevegelser.length - 6} flere — se Leieforhold for full liste</p>
              )}
            </div>
          )}
        </Kort>

        <Kort className="min-w-0" data-testid="dr-portefolje">
          <div className="flex items-center gap-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><Home className="h-3.5 w-3.5" /> Porteføljen</p>
            <p className="ml-auto text-[11px] tabular-nums text-[#b5b5b5]">{antallEnheter || '—'} enheter</p>
          </div>
          {antallEnheter > 0 && (
            <>
              <div className="mt-3 flex h-[8px] w-full overflow-hidden rounded-full bg-[#f0eee9]">
                {fordeling.filter((f) => f.antall > 0).map((f) => (
                  <div key={f.k} className="h-full transition-all duration-700" style={{ width: `${(f.antall / antallEnheter) * 100}%`, background: f.farge }} title={`${f.l}: ${f.antall}`} />
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {fordeling.map((f) => (
                  <div key={f.k} className="flex items-center gap-2 rounded-lg px-1.5 py-[5px] transition-colors hover:bg-[#fafaf8]">
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: f.farge }} />
                    <span className="text-[12px] font-medium text-[#57534e]">{f.l}</span>
                    <span className="text-[11px] tabular-nums text-[#b5b5b5]">{f.antall}{antallEnheter > 0 && f.antall > 0 ? ` · ${Math.round((f.antall / antallEnheter) * 100)} %` : ''}</span>
                    <span className="ml-auto text-[11.5px] font-semibold tabular-nums text-[#78716c]">{f.leie > 0 ? `${kr(f.leie)}/mnd` : '—'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {antallEnheter === 0 && <p className="mt-3 rounded-xl bg-[#fafaf8] px-3.5 py-3 text-[12px] text-[#999]">Henter porteføljen fra plattformen …</p>}
        </Kort>
      </div>

      {/* Selskapsøkonomi — asset-light: kostnader, break-even, CAC og selskapet
          samlet i én rolig flate. Admin administrerer postene; investor leser. */}
      {(() => {
        const ok2 = data.okonomi || {};
        const aktive = aktiveKostnader(ok2.felles || [], '');
        const aktivNavn = aktive.map((p) => p.navn).join(' · ');
        const pct = ok2.breakEvenPct;
        const s = data.selskap;
        const minis = [
          ['Faste kostnader / mnd', kr(ok2.fellesMnd || 0), aktivNavn || (erAdmin ? 'ingen aktive — legg inn f.eks. lønn' : 'ingen aktive poster'), 'datarom-okonomi-faste'],
          ['Break-even', pct != null ? `${Math.min(pct, 999)} %` : '—', pct != null ? (pct >= 100 ? 'nådd — ny enhet er ~ren margin' : `~${ok2.enheterIgjen} enheter igjen`) : 'legg inn faste kostnader', 'datarom-okonomi-breakeven'],
          ['CAC totalt · engangs', kr(ok2.cacTotal || 0), ok2.paybackMnd ? `payback ~${ok2.paybackMnd.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mnd` : 'settes per enhet i Leieforhold', 'datarom-okonomi-cac'],
          ['Lønn per måned', kr(s.ansatteKostnadMnd), `${s.antallAnsatte} ${s.antallAnsatte === 1 ? 'rolle' : 'roller'} i selskapet`, 'datarom-okonomi-lonn'],
          ['Gjeld + aksjonærlån', kr(s.gjeldTotal + s.laanTotal), 'detaljer under Selskap', 'datarom-okonomi-gjeld'],
        ];
        return (
          <Kort data-testid="datarom-okonomi">
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><Wallet className="h-3.5 w-3.5" /> Selskapsøkonomi — asset-light</p>
              {erAdmin && (
                <button
                  onClick={() => setKostSkuff(true)}
                  data-testid="datarom-okonomi-adm"
                  className="ml-auto flex h-8 items-center gap-1.5 rounded-full border border-black/[0.08] px-3 text-[12px] font-semibold text-[#6d28d9] transition-all hover:bg-[#f4f0fb] active:scale-[0.97]"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Administrer faste kostnader
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {minis.map(([l, v, sub, tid]) => (
                <div key={tid} className="rounded-xl bg-[#fafaf8] px-3.5 py-3" data-testid={tid}>
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#b5b5b5]">{l}</p>
                  <p className="mt-1 text-[16px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{v}</p>
                  {tid === 'datarom-okonomi-breakeven' && pct != null ? (
                    <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-[#ecebe8]">
                      <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-[#1f9a53]' : 'bg-[#8b5cf6]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  ) : null}
                  <p className="mt-1 truncate text-[10.5px] text-[#999]">{sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[#b5b5b5]">
              DigiHome er asset-light: huseier bærer alle boligkostnader. Margin = honorar − aktive faste kostnader. CAC er engangs anskaffelseskost — payback viser hvor raskt honoraret tilbakebetaler den.
            </p>
          </Kort>
        );
      })()}

      {/* Resultatgraf fra oppstart */}
      <Kort>
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><BarChart3 className="h-3.5 w-3.5" /> Resultat fra oppstart</p>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[#999]"><span className="h-2.5 w-2.5 rounded-sm bg-[#c6e3cf]" /> Inntekter</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#999]"><span className="h-2.5 w-2.5 rounded-sm bg-[#f3ddba]" /> Kostnader</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#999]"><span className="h-[3px] w-4 rounded-full bg-[#8b5cf6]" /> Akkumulert</span>
        </div>
        {data.pnl.harData ? (
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.pnl.serie} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid stroke="#f3f2f0" vertical={false} />
                <XAxis dataKey="ym" tickFormatter={ymLabel} tick={{ fontSize: 10.5, fill: '#b5b5b5' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => tall(v / 1000) + 'k'} tick={{ fontSize: 10.5, fill: '#b5b5b5' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  formatter={(v, navn) => [kr(v), { inntekter: 'Inntekter', kostnader: 'Kostnader', akkumulert: 'Akkumulert' }[navn] || navn]}
                  labelFormatter={ymLabel}
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', fontSize: 12 }}
                />
                <Bar dataKey="inntekter" fill="#c6e3cf" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="kostnader" fill="#f3ddba" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Line dataKey="akkumulert" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <TomtFelt icon={BarChart3} tittel="Resultatregnskapet er tomt inntil videre" tekst={erAdmin ? 'Legg inn månedene under Datarom → Resultatregnskap — grafen tegnes automatisk.' : 'DigiHome fyller inn de historiske månedene fortløpende.'} />
        )}
      </Kort>

      {/* Snarveier videre inn i datarommet */}
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4" data-testid="dr-snarveier">
        {[
          ['enheter', Home, 'Enhetsøkonomi', 'Honorar og margin per enhet'],
          ['pipeline', TrendingUp, 'Pipeline', 'Enheter på vei inn'],
          ['resultat', BarChart3, 'Regnskap', 'Månedlig resultat fra oppstart'],
          ['selskap', ShieldCheck, 'Selskap', 'Ansatte, kostnader, gjeld og lån'],
        ].map(([k, Ikon, t, sub]) => (
          <button
            key={k}
            onClick={() => (k === 'budsjett' ? onAapneBudsjett?.() : onGaaTil?.(k))}
            data-testid={`datarom-snarvei-${k}`}
            className="group flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-[0_2px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(28,25,23,0.08)] active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb] transition-colors group-hover:bg-[#ece4fb]"><Ikon className="h-[17px] w-[17px] text-[#8b5cf6]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[#0a0a0a]">{t}</span>
              <span className="block truncate text-[11px] text-[#999]">{sub}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#d5d0c8] transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      {/* Kostnadsskuff (admin) — CRUD mot /api/admin/leieforhold/okonomi/felles */}
      {erAdmin && kostSkuff && (
        <KostnadsSkuff
          apiKey={apiKey}
          felles={data.okonomi?.felles || []}
          onOppdatert={() => hent(true)}
          onLukk={() => setKostSkuff(false)}
        />
      )}

      {/* Guidet omvisning — spotlight-motor med levende fremtidsbilde-demo */}
      <Omvisning steg={tourSteg} aktiv={tourAktiv} onFerdig={tourFerdig} />
    </div>
  );
}

/* ── Resultatregnskap ─────────────────────────────────────────────────────── */

function Resultat({ api, erAdmin }) {
  const [rader, setRader] = useState(() => (cacheLes('dr:pnl') || {}).rader || []);
  const [laster, setLaster] = useState(() => !cacheLes('dr:pnl'));
  const [ny, setNy] = useState({ ym: '', inntekter: '', kostnader: '', notat: '' });
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');

  const last = useCallback(async (force = false) => {
    try { setRader((await cacheHent('dr:pnl', () => api('pnl'), { force })).rader || []); } catch (e) {}
    setLaster(false);
  }, [api]);
  useEffect(() => { last(); }, [last]);

  const leggTil = async () => {
    if (!ny.ym) { setFeil('Velg måned'); return; }
    setLagrer(true); setFeil('');
    try {
      await api('pnl', { method: 'PUT', body: ny });
      setNy({ ym: '', inntekter: '', kostnader: '', notat: '' });
      await last(true);
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  };
  const slett = async (ym) => {
    if (!window.confirm(`Slette ${ymLabel(ym)}?`)) return;
    try { await api(`pnl?ym=${ym}`, { method: 'DELETE' }); await last(true); } catch (e) {}
  };

  let akk = 0;
  const medAkk = rader.map((r) => { const res = r.inntekter - r.kostnader; akk += res; return { ...r, resultat: res, akkumulert: akk }; });

  if (laster) return <Skeleton />;

  return (
    <div className="space-y-4">
      {erAdmin && (
        <Kort>
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Legg til / oppdater måned</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold text-[#999]">Måned</span>
              <input type="month" value={ny.ym} onChange={(e) => setNy((s) => ({ ...s, ym: e.target.value }))} data-testid="pnl-ym" className="h-9 rounded-lg border border-black/[0.08] px-2.5 text-[13px] outline-none focus:border-[#8b5cf6]/45" />
            </label>
            {[['inntekter', 'Inntekter'], ['kostnader', 'Kostnader']].map(([f, l]) => (
              <label key={f} className="block">
                <span className="mb-1 block text-[10.5px] font-semibold text-[#999]">{l}</span>
                <input inputMode="numeric" value={ny[f]} onChange={(e) => setNy((s) => ({ ...s, [f]: e.target.value.replace(/[^\d]/g, '') }))} placeholder="0" data-testid={`pnl-${f}`} className="h-9 w-[110px] rounded-lg border border-black/[0.08] px-2.5 text-right text-[13px] tabular-nums outline-none focus:border-[#8b5cf6]/45" />
              </label>
            ))}
            <label className="block min-w-[160px] flex-1">
              <span className="mb-1 block text-[10.5px] font-semibold text-[#999]">Notat (valgfritt)</span>
              <input value={ny.notat} onChange={(e) => setNy((s) => ({ ...s, notat: e.target.value }))} placeholder="F.eks. «Første hele driftsmåned»" className="h-9 w-full rounded-lg border border-black/[0.08] px-2.5 text-[13px] outline-none focus:border-[#8b5cf6]/45" />
            </label>
            <button onClick={leggTil} disabled={lagrer} data-testid="pnl-lagre" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
              {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lagre måned
            </button>
          </div>
          {feil && <p className="mt-2 text-[12px] font-semibold text-rose-600">{feil}</p>}
        </Kort>
      )}

      <Kort className="overflow-hidden p-0">
        {medAkk.length === 0 ? (
          <TomtFelt icon={BarChart3} tittel="Ingen måneder registrert ennå" tekst={erAdmin ? 'Resultatregnskapet kan stå tomt inntil videre — legg inn måneder over når tallene er klare.' : 'DigiHome fyller inn de historiske månedene fortløpende.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {['Måned', 'Inntekter', 'Kostnader', 'Resultat', 'Akkumulert', 'Notat', ''].map((h, i) => (
                    <th key={h || 'x'} className={`px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5] ${i === 0 || i === 5 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medAkk.map((r) => (
                  <tr key={r.ym} className="group border-b border-black/[0.03] last:border-b-0 hover:bg-[#fbfaf8]" data-testid={`pnl-rad-${r.ym}`}>
                    <td className="px-3.5 py-2.5 font-semibold text-[#0a0a0a]">{ymLabel(r.ym)}</td>
                    <td className="px-3.5 py-2.5 text-right tabular-nums text-[#1f7a45]">{tall(r.inntekter)}</td>
                    <td className="px-3.5 py-2.5 text-right tabular-nums text-[#9a6b1c]">{tall(r.kostnader)}</td>
                    <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums ${r.resultat < 0 ? 'text-rose-600' : 'text-[#0a0a0a]'}`}>{tall(r.resultat)}</td>
                    <td className={`px-3.5 py-2.5 text-right tabular-nums ${r.akkumulert < 0 ? 'text-rose-500' : 'text-[#555]'}`}>{tall(r.akkumulert)}</td>
                    <td className="max-w-[220px] truncate px-3.5 py-2.5 text-[12px] text-[#999]">{r.notat}</td>
                    <td className="px-2 py-2.5 text-right">
                      {erAdmin && (
                        <button onClick={() => slett(r.ym)} className="rounded p-1 text-[#d5d0c8] opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100" title="Slett">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kort>
    </div>
  );
}

/* ── Enheter (drift) og Pipeline — deler tabell + redigeringsmodal ────────── */

function Enheter({ api, erAdmin, fase }) {
  const [data, setData] = useState(() => { const c = cacheLes(`dr:enheter:${fase}`); return c ? { drift: c.drift || [], pipeline: c.pipeline || [] } : { drift: [], pipeline: [] }; });
  const [laster, setLaster] = useState(() => !cacheLes(`dr:enheter:${fase}`));
  const [importerer, setImporterer] = useState(false);
  const [importMelding, setImportMelding] = useState('');
  const [modal, setModal] = useState(null); // enhet under redigering (eller {} for ny)

  const last = useCallback(async (force = false) => {
    try { const j = await cacheHent(`dr:enheter:${fase}`, () => api(`enheter?fase=${fase}`), { force }); setData({ drift: j.drift || [], pipeline: j.pipeline || [] }); } catch (e) {}
    setLaster(false);
  }, [api, fase]);
  useEffect(() => {
    const c = cacheLes(`dr:enheter:${fase}`);
    if (c) { setData({ drift: c.drift || [], pipeline: c.pipeline || [] }); setLaster(false); } else setLaster(true);
    last();
  }, [last, fase]);

  const rader = fase === 'pipeline' ? data.pipeline : data.drift;
  const sum = (f) => rader.reduce((a, e) => a + (Number(e[f]) || 0), 0);

  const importer = async () => {
    setImporterer(true); setImportMelding('');
    try {
      const j = await api('enheter/import', { method: 'POST' });
      setImportMelding(`Hentet fra porteføljen: ${j.opprettet} nye · ${j.oppdatert} oppdatert`);
      await last(true);
    } catch (e) { setImportMelding(e.message); }
    setImporterer(false);
  };

  const slett = async (e) => {
    if (!window.confirm(`Slette «${e.navn}»?`)) return;
    try { await api(`enheter?id=${e.id}`, { method: 'DELETE' }); await last(); } catch (err) {}
  };

  if (laster) return <Skeleton />;

  const kpier = fase === 'pipeline'
    ? [
      ['Enheter på vei', `${rader.length}`],
      ['Signert · honorar/mnd', kr(rader.filter((e) => e.status === 'signert').reduce((a, e) => a + (e.honorar || 0), 0))],
      ['Forventet · honorar/mnd', kr(rader.filter((e) => e.status === 'forventet').reduce((a, e) => a + (e.honorar || 0), 0))],
      ['Samlet potensial/mnd', kr(sum('honorar'))],
    ]
    : [
      ['Enheter i drift', `${rader.length}`],
      ['Honorar per måned', kr(sum('honorar'))],
      ['Direkte kostnader/mnd', kr(sum('kostnader'))],
      ['Margin per måned', kr(sum('honorar') - sum('kostnader'))],
    ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          {kpier.map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white px-3.5 py-2.5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#b5b5b5]">{l}</p>
              <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{v}</p>
            </div>
          ))}
        </div>
        {erAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={importer} disabled={importerer} data-testid="enheter-import" title="Henter porteføljen fra Leieforhold — dine kostnader/notater røres aldri" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#555] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#0a0a0a] active:scale-[0.97]">
              {importerer ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Hent fra Leieforhold
            </button>
            <button onClick={() => setModal({ fase })} data-testid="enheter-ny" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Ny enhet
            </button>
          </div>
        )}
      </div>
      {importMelding && <p className="text-[12px] font-semibold text-[#1f7a45]" data-testid="import-melding">{importMelding}</p>}

      <Kort className="overflow-hidden p-0">
        {rader.length === 0 ? (
          <TomtFelt icon={fase === 'pipeline' ? TrendingUp : Home} tittel={fase === 'pipeline' ? 'Ingen enheter i pipeline ennå' : 'Ingen enheter registrert ennå'} tekst={erAdmin ? 'Hent porteføljen fra Leieforhold, eller legg til enheter manuelt.' : 'DigiHome oppdaterer oversikten fortløpende.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {(fase === 'pipeline'
                    ? ['Enhet', 'Type', 'Status', 'Forventet start', 'Leie/mnd', 'Honorar/mnd', '']
                    : ['Enhet', 'Type', 'Status', 'Leie/mnd', 'Honorar/mnd', 'Dir. kostn./mnd', 'Margin/mnd', '']
                  ).map((h, i) => (
                    <th key={h || 'x'} className={`px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5] ${i <= 2 ? 'text-left' : 'text-right'} ${i === 3 && fase === 'pipeline' ? 'text-left' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rader.map((e) => (
                  <tr key={e.id} className="group border-b border-black/[0.03] last:border-b-0 hover:bg-[#fbfaf8]" data-testid={`enhet-rad-${e.id}`}>
                    <td className="max-w-[320px] px-3.5 py-2.5">
                      <span className="block truncate font-semibold text-[#0a0a0a]">{e.navn}</span>
                      {e.notat && <span className="block truncate text-[11px] text-[#b5b5b5]">{e.notat}</span>}
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#777]">{e.type === 'rom' ? 'Rom' : 'Leilighet'}</td>
                    <td className="px-3.5 py-2.5"><StatusBadge status={e.status} /></td>
                    {fase === 'pipeline' ? (
                      <>
                        <td className="px-3.5 py-2.5 text-[12px] text-[#777]">{e.start || '—'}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#555]">{e.leie ? tall(e.leie) : '—'}</td>
                        <td className="px-3.5 py-2.5 text-right font-bold tabular-nums text-[#0a0a0a]">{tall(e.honorar)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#555]">{e.leie ? tall(e.leie) : '—'}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#1f7a45]">{tall(e.honorar)}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-[#9a6b1c]">{tall(e.kostnader)}</td>
                        <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums ${(e.honorar - e.kostnader) < 0 ? 'text-rose-600' : 'text-[#0a0a0a]'}`}>{tall(e.honorar - e.kostnader)}</td>
                      </>
                    )}
                    <td className="px-2 py-2.5 text-right">
                      {erAdmin && (
                        <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => setModal(e)} className="rounded p-1 text-[#b5b5b5] hover:bg-[#f4f0fb] hover:text-[#8b5cf6]" title="Rediger" data-testid={`enhet-rediger-${e.id}`}><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => slett(e)} className="rounded p-1 text-[#d5d0c8] hover:bg-rose-50 hover:text-rose-500" title="Slett"><Trash2 className="h-3.5 w-3.5" /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kort>

      {modal && <EnhetModal enhet={modal} api={api} onLukk={() => setModal(null)} onLagret={() => { setModal(null); last(true); }} />}
    </div>
  );
}

function EnhetModal({ enhet, api, onLukk, onLagret }) {
  const erNy = !enhet.id;
  const [f, setF] = useState({
    fase: enhet.fase || 'drift',
    navn: enhet.navn || '',
    type: enhet.type || 'leilighet',
    status: enhet.status || (enhet.fase === 'pipeline' ? 'forventet' : 'utleid'),
    leie: enhet.leie || '',
    honorar: enhet.honorar || '',
    kostnader: enhet.kostnader || '',
    start: enhet.start || '',
    notat: enhet.notat || '',
  });
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const statuser = f.fase === 'pipeline' ? ['signert', 'forventet'] : ['utleid', 'ledig'];

  const lagre = async () => {
    setLagrer(true); setFeil('');
    try {
      await api('enheter', { method: erNy ? 'POST' : 'PUT', body: { ...f, id: enhet.id } });
      onLagret();
    } catch (e) { setFeil(e.message); setLagrer(false); }
  };

  const felt = 'h-10 w-full rounded-lg border border-black/[0.08] px-3 text-[13px] outline-none transition-all focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12';
  const seg = (aktiv) => `h-8 flex-1 rounded-full text-[12px] font-semibold transition-all ${aktiv ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={onLukk}>
      <div className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="enhet-modal">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0fb]"><Building2 className="h-4 w-4 text-[#8b5cf6]" /></span>
          <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>{erNy ? 'Ny enhet' : 'Rediger enhet'}</h3>
          <button onClick={onLukk} className="ml-auto rounded-lg p-1.5 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div className="flex gap-2">
            <div className="flex h-9 flex-1 items-center rounded-full bg-[#f4f2ef] p-0.5">
              {[['drift', 'I drift'], ['pipeline', 'Pipeline']].map(([k, l]) => (
                <button key={k} onClick={() => setF((s) => ({ ...s, fase: k, status: k === 'pipeline' ? 'forventet' : 'utleid' }))} className={seg(f.fase === k)}>{l}</button>
              ))}
            </div>
            <div className="flex h-9 flex-1 items-center rounded-full bg-[#f4f2ef] p-0.5">
              {[['leilighet', 'Leilighet'], ['rom', 'Rom']].map(([k, l]) => (
                <button key={k} onClick={() => setF((s) => ({ ...s, type: k }))} className={seg(f.type === k)}>{l}</button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#999]">Navn / adresse</span>
            <input value={f.navn} onChange={(e) => setF((s) => ({ ...s, navn: e.target.value }))} placeholder="F.eks. «Rom 3 · Storgaten 12, 5015 Bergen»" data-testid="enhet-navn" className={felt} autoFocus />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#999]">Status</span>
              <select value={f.status} onChange={(e) => setF((s) => ({ ...s, status: e.target.value }))} className={felt} data-testid="enhet-status">
                {statuser.map((st) => <option key={st} value={st}>{STATUS_META[st].l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#999]">{f.fase === 'pipeline' ? 'Forventet start' : 'Startdato'}</span>
              <input type="date" value={f.start} onChange={(e) => setF((s) => ({ ...s, start: e.target.value }))} className={felt} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[['leie', 'Leie/mnd'], ['honorar', 'Honorar/mnd'], ['kostnader', 'Dir. kostn./mnd']].map(([k, l]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#999]">{l}</span>
                <input inputMode="numeric" value={f[k]} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value.replace(/[^\d]/g, '') }))} placeholder="0" data-testid={`enhet-${k}`} className={`${felt} text-right tabular-nums`} />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#999]">Notat (valgfritt)</span>
            <input value={f.notat} onChange={(e) => setF((s) => ({ ...s, notat: e.target.value }))} placeholder="Synlig i datarommet og i Excel" className={felt} />
          </label>
        </div>

        {feil && <p className="mt-3 text-[12px] font-semibold text-rose-600">{feil}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onLukk} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-[#999] hover:text-[#555]">Avbryt</button>
          <button onClick={lagre} disabled={lagrer} data-testid="enhet-lagre" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {erNy ? 'Opprett enhet' : 'Lagre'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Selskap ──────────────────────────────────────────────────────────────── */

function Selskap({ api, erAdmin }) {
  const [f, setF] = useState(() => (cacheLes('dr:selskap') || {}).selskap || null);
  const [laster, setLaster] = useState(() => !cacheLes('dr:selskap'));
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);

  useEffect(() => {
    (async () => {
      try { const j = await cacheHent('dr:selskap', () => api('selskap')); if (j?.selskap) setF(j.selskap); } catch (e) {}
      setLaster(false);
    })();
  }, [api]);

  const lagre = async () => {
    setLagrer(true);
    try {
      const j = await api('selskap', { method: 'PUT', body: f });
      cacheSlett('dr:selskap'); // skjemaet er sannheten nå — ikke server stale cache
      setF(j.selskap);
      setLagret(true); setTimeout(() => setLagret(false), 2500);
    } catch (e) {}
    setLagrer(false);
  };

  if (laster || !f) return <Skeleton />;

  const settLinje = (liste, id, felt, verdi) => setF((s) => ({ ...s, [liste]: s[liste].map((l) => (l.id === id ? { ...l, [felt]: verdi } : l)) }));
  const nyLinje = (liste, mal) => setF((s) => ({ ...s, [liste]: [...s[liste], { id: `ny-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...mal }] }));
  const fjernLinje = (liste, id) => setF((s) => ({ ...s, [liste]: s[liste].filter((l) => l.id !== id) }));

  const blokk = (tittel, liste, kolonner, mal, ikon) => {
    const Ikon = ikon;
    const sumFelt = kolonner.find((k) => k.sum);
    const sum = sumFelt ? (f[liste] || []).reduce((a, l) => a + (Number(l[sumFelt.f]) || 0), 0) : null;
    return (
      <Kort key={tittel}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f0fb]"><Ikon className="h-4 w-4 text-[#8b5cf6]" /></span>
          <p className="text-[13px] font-bold text-[#0a0a0a]" style={heading}>{tittel}</p>
          {sum !== null && <span className="ml-auto text-[13px] font-bold tabular-nums text-[#555]">{kr(sum)}{sumFelt.perMnd ? '/mnd' : ''}</span>}
        </div>
        <div className="mt-3 space-y-1.5">
          {(f[liste] || []).length === 0 && <p className="py-2 text-[12px] italic text-[#c2beb8]">Ingen registrert{erAdmin ? ' — legg til under' : ''}.</p>}
          {(f[liste] || []).map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              {kolonner.map((k) => (
                erAdmin ? (
                  <input
                    key={k.f}
                    value={l[k.f] ?? ''}
                    inputMode={k.tall ? 'numeric' : undefined}
                    onChange={(e) => settLinje(liste, l.id, k.f, k.tall ? e.target.value.replace(/[^\d.,]/g, '') : e.target.value)}
                    placeholder={k.ph}
                    className={`h-9 rounded-lg border border-black/[0.06] bg-[#fafaf8] px-2.5 text-[12.5px] outline-none transition-all focus:border-[#8b5cf6]/45 focus:bg-white ${k.tall ? 'w-[110px] text-right tabular-nums' : 'min-w-0 flex-1'}`}
                  />
                ) : (
                  <span key={k.f} className={`px-1 text-[13px] ${k.tall ? 'w-[110px] text-right tabular-nums font-semibold text-[#0a0a0a]' : 'min-w-0 flex-1 truncate text-[#555]'}`}>
                    {k.tall ? tall(l[k.f]) : l[k.f]}
                  </span>
                )
              ))}
              {erAdmin && (
                <button onClick={() => fjernLinje(liste, l.id)} className="shrink-0 rounded p-1.5 text-[#d5d0c8] hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          {erAdmin && (
            <button onClick={() => nyLinje(liste, mal)} className="flex items-center gap-1.5 pt-1 text-[12px] font-semibold text-[#c2beb8] transition-colors hover:text-[#8b5cf6]">
              <Plus className="h-3.5 w-3.5" /> Legg til
            </button>
          )}
        </div>
      </Kort>
    );
  };

  return (
    <div className="space-y-4" data-testid="datarom-selskap">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {blokk('Ansatte', 'ansatte', [
          { f: 'rolle', ph: 'Rolle — f.eks. «Daglig leder»' },
          { f: 'prosent', ph: '100', tall: true },
          { f: 'kostnad', ph: 'Kostnad/mnd', tall: true, sum: true, perMnd: true },
        ], { rolle: '', prosent: 100, kostnad: 0 }, Users)}
        {blokk('Faste kostnader', 'faste', [
          { f: 'navn', ph: 'Post — f.eks. «Kontorleie»' },
          { f: 'belop', ph: 'Beløp/mnd', tall: true, sum: true, perMnd: true },
        ], { navn: '', belop: 0 }, Wallet)}
        {blokk('Gjeld', 'gjeld', [
          { f: 'navn', ph: 'Långiver' },
          { f: 'belop', ph: 'Beløp', tall: true, sum: true },
          { f: 'rente', ph: 'Rente %', tall: true },
        ], { navn: '', belop: 0, rente: 0 }, Landmark)}
        {blokk('Aksjonærlån', 'laan', [
          { f: 'navn', ph: 'Aksjonær' },
          { f: 'belop', ph: 'Beløp', tall: true, sum: true },
          { f: 'rente', ph: 'Rente %', tall: true },
        ], { navn: '', belop: 0, rente: 0 }, ShieldCheck)}
      </div>

      <Kort>
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Notat til investor</p>
        {erAdmin ? (
          <textarea
            value={f.notat || ''}
            onChange={(e) => setF((s) => ({ ...s, notat: e.target.value.slice(0, 2000) }))}
            rows={3}
            placeholder="F.eks. kontekst rundt lån, avtaler eller planlagte ansettelser …"
            className="mt-2 w-full resize-y rounded-lg border border-black/[0.06] bg-[#fafaf8] px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-all focus:border-[#8b5cf6]/45 focus:bg-white"
          />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#555]">{f.notat || 'Ingen notater.'}</p>
        )}
      </Kort>

      {erAdmin && (
        <div className="flex items-center justify-end gap-3">
          {f.updatedAt && <span className="text-[11.5px] text-[#b5b5b5]">Sist oppdatert {new Date(f.updatedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
          <button onClick={lagre} disabled={lagrer} data-testid="selskap-lagre" className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-all active:scale-[0.97] ${lagret ? 'bg-emerald-50 text-emerald-600' : 'bg-[#0a0a0a] text-white hover:bg-black/85'}`}>
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {lagret ? 'Lagret' : 'Lagre selskapsdata'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Dokumenter (lesetilgang til DD-hvelvet) ──────────────────────────────── */

function Dokumenter({ api, apiKey, erAdmin }) {
  const [docs, setDocs] = useState(() => (cacheLes('dr:dokumenter') || {}).documents || []);
  const [kategorier, setKategorier] = useState(() => (cacheLes('dr:dokumenter') || {}).categories || []);
  const [laster, setLaster] = useState(() => !cacheLes('dr:dokumenter'));

  useEffect(() => {
    (async () => {
      try {
        const j = await cacheHent('dr:dokumenter', () => api('dokumenter'));
        setDocs(j.documents || []);
        setKategorier(j.categories || []);
      } catch (e) {}
      setLaster(false);
    })();
  }, [api]);

  if (laster) return <Skeleton />;

  const perKategori = kategorier
    .map((k) => ({ ...k, docs: docs.filter((d) => d.category === k.key) }))
    .filter((k) => k.docs.length > 0);
  const utenKategori = docs.filter((d) => !kategorier.some((k) => k.key === d.category));
  if (utenKategori.length) perKategori.push({ key: 'annet', label: 'Annet', docs: utenKategori });

  const strl = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);

  return (
    <div className="space-y-4" data-testid="datarom-dokumenter">
      <SakArkiv apiKey={apiKey} erAdmin={erAdmin} />
      {erAdmin && (
        <p className="text-[12px] text-[#999]">Dokumentene administreres i <span className="font-semibold text-[#555]">Investor-rom</span>-modulen (opplasting, versjoner og arkivering) — datarommet viser hvelvet i lesemodus.</p>
      )}
      {perKategori.length === 0 ? (
        <Kort><TomtFelt icon={FileText} tittel="Ingen dokumenter delt ennå" tekst={erAdmin ? 'Last opp rapporter og avtaler i Investor-rom-modulen — de dukker opp her automatisk.' : 'DigiHome deler rapporter og avtaler her fortløpende.'} /></Kort>
      ) : (
        perKategori.map((k) => (
          <Kort key={k.key} className="p-0">
            <p className="border-b border-black/[0.04] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">{k.label}</p>
            <div className="divide-y divide-black/[0.03]">
              {k.docs.map((d) => {
                const ver = (d.versions || []).find((v) => v.version === d.currentVersion) || (d.versions || [])[d.versions?.length - 1] || {};
                return (
                  <a
                    key={d.id}
                    href={`/api/admin/datarom/fil?docId=${encodeURIComponent(d.id)}&key=${encodeURIComponent(apiKey)}`}
                    data-testid={`dok-${d.id}`}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#fbfaf8]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><FileText className="h-4 w-4 text-[#8b5cf6]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-[#0a0a0a]">{d.title || ver.filename}</span>
                      <span className="block text-[11.5px] text-[#999]">
                        {ver.filename} · {ver.size ? strl(ver.size) : ''} · v{d.currentVersion} · {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-[#d5d0c8] transition-colors group-hover:text-[#8b5cf6]" />
                  </a>
                );
              })}
            </div>
          </Kort>
        ))
      )}
    </div>
  );
}

/* ── Dokumentarkiv fra sakene (rollestyrt synlighet: styret/investorer/alle) ── */
function SakArkiv({ apiKey, erAdmin }) {
  const [filer, setFiler] = useState([]);
  const [lastet, setLastet] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/dokumentarkiv?key=${encodeURIComponent(apiKey)}`);
        const j = await r.json();
        setFiler(j.filer || []);
      } catch (e) {}
      setLastet(true);
    })();
  }, [apiKey]);
  if (!lastet || !filer.length) return null;

  const strlA = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);
  const SYN_ETIKETT = { styret: 'Styret', investorer: 'Investorer', alle: 'Alle' };
  const perKat = {};
  for (const f of filer) {
    const k = (f.arkiv && f.arkiv.kategori) || 'Annet';
    perKat[k] = perKat[k] || [];
    perKat[k].push(f);
  }

  return (
    <Kort className="p-0" data-testid="datarom-sakarkiv">
      <div className="flex items-center gap-2 border-b border-black/[0.04] px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Dokumentarkiv fra sakene</p>
        <span className="text-[11px] text-[#c5c0b8]">· {filer.length} dokument{filer.length === 1 ? '' : 'er'}</span>
      </div>
      {Object.entries(perKat).map(([kat, fs]) => (
        <div key={kat}>
          <p className="bg-[#fbfaf8] px-5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#c5c0b8]">{kat}</p>
          <div className="divide-y divide-black/[0.03]">
            {fs.map((f) => (
              <a
                key={f.id}
                href={`/api/admin/dokumentarkiv/${f.id}?key=${encodeURIComponent(apiKey)}`}
                data-testid={`sakarkiv-${f.id}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#fbfaf8]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><FileText className="h-4 w-4 text-[#8b5cf6]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-[#0a0a0a]">{f.name}</span>
                    {f.laast && <span className="shrink-0 rounded-[4px] bg-emerald-50 px-1.5 py-px text-[9.5px] font-bold text-emerald-700">Signert</span>}
                  </span>
                  <span className="block truncate text-[11.5px] text-[#999]">
                    {f.sakTittel ? `${f.sakTittel} · ` : ''}{strlA(f.size)} · v{f.versjon || 1}{erAdmin && f.arkiv ? ` · ${SYN_ETIKETT[f.arkiv.synlighet] || 'Styret'}` : ''}
                  </span>
                </span>
                <Download className="h-4 w-4 shrink-0 text-[#d5d0c8] transition-colors group-hover:text-[#8b5cf6]" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </Kort>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[108px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />)}
      </div>
      <div className="h-[300px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />
    </div>
  );
}
