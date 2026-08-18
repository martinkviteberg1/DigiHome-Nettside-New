'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   DATAROM → OVERSIKT — «kommandosenteret».
   Supermoderne, minimalistisk bento-grid med KPI-fokus:
     · Mørk hero-flis: honorar/mnd (ett dominant tall), fremtidsbilde-kontroller,
       investorpakke og veksttrappen — alt live fra plattformen.
     · KPI-fliser: margin, utleiegrad, pipeline, ARR-potensial, leie u/forvaltning.
     · Puls-rad: driftssignaler — åpne saker, signeringer, kontraktsutløp,
       innflyttinger og annonse-avvik. Team-only signaler skjules for investor.
     · Bevegelser (30 dgr) + porteføljefordeling, resultat fra oppstart med
       narrativ, selskapsøkonomi og snarveier.
   Alle tall er ekte — mangler data vises «—» eller raden skjules.
   ──────────────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet, HelpCircle, CalendarClock, X, Home, TrendingUp, BarChart3,
  ShieldCheck, ArrowRight, Wallet, Settings2, AlertTriangle, ListTodo, PenLine,
  CalendarX, ArrowUpRight, Megaphone, CircleDollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import KostnadsSkuff from '@/components/admin/KostnadsSkuff';
import { aktiveKostnader, beregnHonorarTrapp, visGruppe, anvendScenario } from '@/lib/leieforhold-filter';
import { cacheLes, cacheHent } from '@/lib/klient-cache';
import Omvisning from '@/components/admin/Omvisning';

const heading = { fontFamily: 'var(--font-heading)' };
const tallFmt = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const tall = (v) => tallFmt.format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const kr = (v) => `${tall(v)}\u202Fkr`;
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymLabel = (ym) => { const [y, m] = String(ym).split('-'); return `${MND_KORT[Number(m) - 1]} ${y}`; };

const Kort = ({ className = '', children, ...rest }) => (
  <div className={`rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] ${className}`} {...rest}>{children}</div>
);

/* Tellende tall — myk easeOut når verdien endres (f.eks. ved fremtidsbilde). */
function useCountUp(verdi, dur = 650) {
  const [vist, setVist] = useState(verdi);
  const forrige = useRef(verdi);
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

const TomtFelt = ({ icon: Icon, tittel, tekst }) => (
  <div className="flex flex-col items-center gap-3 py-14 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f0fb]"><Icon className="h-6 w-6 text-[#8b5cf6]" /></span>
    <p className="text-[15px] font-bold text-[#0a0a0a]" style={heading}>{tittel}</p>
    <p className="max-w-[380px] text-[12.5px] leading-relaxed text-[#999]">{tekst}</p>
  </div>
);

/* Skeleton — speiler bento-oppsettet slik at siden ikke «hopper» ved lasting. */
function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="h-[300px] animate-pulse rounded-3xl bg-[#e9e6e1] xl:col-span-8" />
        <div className="grid grid-cols-2 gap-3 xl:col-span-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />)}
          <div className="col-span-2 h-[76px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[86px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />)}
      </div>
      <div className="h-[240px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />
    </div>
  );
}

export default function DataromOversikt({ api, apiKey, xlsxHref, erAdmin, onGaaTil, onAapneBudsjett, autoTour = false }) {
  // Klient-cache (stale-while-revalidate): rendrer momentant fra sist kjente
  // data ved fanebytte, og revaliderer stille i bakgrunnen.
  const [data, setData] = useState(() => (cacheLes('dr:oversikt') || {}).oversikt || null);
  const [lf, setLf] = useState(() => cacheLes('lf:data') || null); // live leieforhold-rader fra plattformen
  const [puls, setPuls] = useState(() => cacheLes('dr:puls') || null); // team-signaler (saker/signering) — 401 for investor er OK
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

  // Livstall fra plattformen — deler cache-nøkkel med Leieforhold-flaten.
  useEffect(() => {
    cacheHent('lf:data', `/api/admin/leieforhold?key=${encodeURIComponent(apiKey)}`)
      .then((j) => { if (j?.ok) setLf(j); })
      .catch(() => { /* dashboardet fungerer også uten livstall */ });
  }, [apiKey]);

  // Puls — team-signaler (saker + signering). Investorer får 401 → raden skjules.
  useEffect(() => {
    cacheHent('dr:puls', () => api('puls'))
      .then((j) => { if (j?.ok) setPuls(j); })
      .catch(() => { setPuls(null); });
  }, [api]);

  if (laster) return <Skeleton />;
  if (!data) return <Kort><TomtFelt icon={AlertTriangle} tittel="Kunne ikke laste oversikten" tekst="Prøv å laste siden på nytt." /></Kort>;

  /* ── Nøkkeltall regnet live — samme motor som Leieforhold-flaten.
     Med fremtidsbilde flyttes porteføljen fram i tid: signerte innflyttinger
     t.o.m. datoen telles som utleid, utflyttinger før datoen som ledig. ── */
  const rows = lf?.rows || [];
  const visRows = scenario ? anvendScenario(rows, scenario) : rows;
  const trapp = visRows.length ? beregnHonorarTrapp(visRows) : null;
  const trappIdag = scenario && rows.length ? beregnHonorarTrapp(rows) : trapp;
  const mrr = trapp ? trapp.iDag : (data.drift.honorarMnd || 0);
  const mrrDelta = scenario && trapp && trappIdag ? trapp.iDag - trappIdag.iDag : 0;
  const ok = data.okonomi || {};
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
  const antallEnheter = visRows.length || data.drift.antall || 0;
  const utleide = visRows.length ? (fordeling[0]?.antall || 0) : (data.drift.utleide || 0);
  const utleidLeie = fordeling[0]?.leie || 0;
  const utleiegrad = antallEnheter ? Math.round((utleide / antallEnheter) * 100) : 0;
  const paaVei = visRows.length
    ? fordeling.slice(1, 4).reduce((s, f) => s + f.antall, 0)
    : (data.pipeline?.antall || 0);
  const enheterIgjen = margin < 0 && utleide > 0 && mrr > 0 ? Math.ceil(-margin / (mrr / utleide)) : 0;
  // Pipeline-honorar: livstall fra trappen, ellers datarommets pipeline-register.
  const pipelineHonorar = trapp
    ? trapp.medAnnonsert - trapp.iDag
    : ((data.pipeline?.signert?.honorarMnd || 0) + (data.pipeline?.forventet?.honorarMnd || 0)) || null;
  const arrPotensial = trapp ? trapp.potensial * 12 : (data.drift.arr || 0);

  // Neste 30 dager — inn- og utflyttinger fra kontraktenes datoer.
  const iDagIso = new Date().toISOString().slice(0, 10);
  const baseIso = scenario || iDagIso;
  const om30 = new Date(new Date(`${baseIso}T12:00:00`).getTime() + 30 * 864e5).toISOString().slice(0, 10);
  const bevegelser = [
    ...rows.filter((r) => r.move_in_date && r.move_in_date > baseIso && r.move_in_date <= om30).map((r) => ({ type: 'inn', dato: r.move_in_date, r })),
    ...rows.filter((r) => r.move_out_date && r.move_out_date > baseIso && r.move_out_date <= om30).map((r) => ({ type: 'ut', dato: r.move_out_date, r })),
  ].sort((a, b) => a.dato.localeCompare(b.dato));
  const innMoves = bevegelser.filter((b) => b.type === 'inn');
  const innLeie = innMoves.reduce((s, b) => s + (b.r.monthly_rent || 0), 0);
  const utLeie = bevegelser.filter((b) => b.type === 'ut').reduce((s, b) => s + (b.r.monthly_rent || 0), 0);
  const nettoEndring = innLeie - utLeie;
  const dtoNo = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  const plussMnd = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
  const imorgen = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  /* ── Puls-signaler: alltid regnet fra i dag (uavhengig av fremtidsbilde) ── */
  const om60 = new Date(new Date(`${iDagIso}T12:00:00`).getTime() + 60 * 864e5).toISOString().slice(0, 10);
  const utlop60 = rows.filter((r) => r.group === 'leased' && r.move_out_date && r.move_out_date > iDagIso && r.move_out_date <= om60);
  const utlopLeie = utlop60.reduce((s, r) => s + (r.monthly_rent || 0), 0);
  const ledigUtenAnnonse = rows.filter((r) => visGruppe(r) === 'vacant').length;
  const inn30 = rows.filter((r) => r.move_in_date && r.move_in_date > iDagIso && r.move_in_date <= new Date(new Date(`${iDagIso}T12:00:00`).getTime() + 30 * 864e5).toISOString().slice(0, 10));
  const inn30Leie = inn30.reduce((s, r) => s + (r.monthly_rent || 0), 0);

  const signaler = [];
  if (puls?.ok && puls.saker) {
    signaler.push({
      tid: 'saker', Ikon: ListTodo, verdi: puls.saker.open, label: 'Åpne saker',
      sub: puls.saker.overdue > 0 ? `${puls.saker.overdue} over frist` : (puls.saker.dueToday > 0 ? `${puls.saker.dueToday} forfaller i dag` : 'ingen over frist'),
      tone: puls.saker.overdue > 0 ? 'alert' : (puls.saker.dueToday > 0 ? 'varsom' : 'ok'),
    });
    signaler.push({
      tid: 'signering', Ikon: PenLine, verdi: puls.signering?.aktive || 0, label: 'Signeringer i gang',
      sub: (puls.signering?.aktive || 0) > 0 ? `venter på ${puls.signering.venterPaa} signatar${puls.signering.venterPaa === 1 ? '' : 'er'}` : 'ingen aktive runder',
      tone: (puls.signering?.aktive || 0) > 0 ? 'varsom' : 'ok',
    });
  }
  if (rows.length) {
    signaler.push({
      tid: 'utlop', Ikon: CalendarX, verdi: utlop60.length, label: 'Kontrakter utløper',
      sub: utlop60.length > 0 ? `−${kr(utlopLeie)}/mnd innen 60 dgr` : 'ingen neste 60 dager',
      tone: utlop60.length > 0 ? 'alert' : 'ok',
    });
    signaler.push({
      tid: 'innflytt', Ikon: ArrowUpRight, verdi: inn30.length, label: 'Innflyttinger 30 dgr',
      sub: inn30.length > 0 ? `+${kr(inn30Leie)}/mnd leie` : 'ingen planlagte',
      tone: inn30.length > 0 ? 'positiv' : 'ok',
    });
    signaler.push({
      tid: 'annonse', Ikon: Megaphone, verdi: ledigUtenAnnonse, label: 'Ledig uten annonse',
      sub: ledigUtenAnnonse > 0 ? 'bør ut i markedet' : 'alt er annonsert',
      tone: ledigUtenAnnonse > 0 ? 'varsom' : 'ok',
    });
  }
  const TONE_SUB = { alert: 'text-[#be123c]', varsom: 'text-[#b45309]', positiv: 'text-[#15803d]', ok: 'text-[#a8a29a]' };
  const TONE_DOT = { alert: '#e11d48', varsom: '#d97706', positiv: '#16a34a', ok: '#d5d0c8' };

  // P&L-narrativ — akkumulert + siste måned regnet fra serien.
  const pnlSerie = data.pnl?.serie || [];
  const pnlSiste = pnlSerie[pnlSerie.length - 1] || null;
  const pnlAkk = pnlSiste ? pnlSiste.akkumulert : 0;

  // Snarveier — budsjettmodellen legges til for admin (åpner egen seksjon).
  const snarveier = [
    ['enheter', Home, 'Enhetsøkonomi', 'Honorar og margin per enhet'],
    ['pipeline', TrendingUp, 'Pipeline', 'Enheter på vei inn'],
    ['resultat', BarChart3, 'Regnskap', 'Månedlig resultat fra oppstart'],
    ['selskap', ShieldCheck, 'Selskap', 'Ansatte, kostnader, gjeld og lån'],
    ...(erAdmin && onAapneBudsjett ? [['budsjett', CircleDollarSign, 'Budsjett & vekstplan', 'Investormodell og scenarioer']] : []),
  ];

  /* ── Omvisning: 5 steg med levende fremtidsbilde-demo ── */
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
      {/* ═══ BENTO RAD 1: mørk hero + KPI-fliser ═══ */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        {/* ── Mørk hero-flis: honoraret — ett dominant tall + veksttrappen ── */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl bg-[#0c0a09] p-5 text-white shadow-[0_2px_20px_rgba(0,0,0,0.08)] sm:p-6 xl:col-span-8" data-testid="dr-hero">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(560px_300px_at_88%_-12%,rgba(139,92,246,0.26),transparent_62%),radial-gradient(420px_260px_at_-4%_112%,rgba(139,92,246,0.10),transparent_60%)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Topprad: etikett + kontroller (fremtidsbilde · investorpakke · omvisning) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/40">
                {scenario ? `Honorar per måned · ved ${dtoNo(scenario)}` : 'Honorar per måned'}
                {trapp && !scenario && (
                  <span className="flex items-center gap-1.5 normal-case tracking-normal text-emerald-300/80">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    live
                  </span>
                )}
              </p>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.05] p-[3px]" data-testid="dr-scenario">
                  <CalendarClock className="ml-1.5 h-3.5 w-3.5 shrink-0 text-white/30" />
                  {[['', 'I dag'], [plussMnd(1), '+1 mnd'], [plussMnd(3), '+3 mnd']].map(([v, l]) => (
                    <button
                      key={l}
                      onClick={() => setScenario(v)}
                      data-testid={`dr-scenario-${l === 'I dag' ? 'idag' : l.replace(/\W/g, '')}`}
                      className={`h-6 rounded-full px-2.5 text-[11px] font-semibold transition-all ${scenario === v ? 'bg-white text-[#0a0a0a]' : 'text-white/50 hover:text-white'}`}
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
                    className="h-6 w-[118px] rounded-full bg-transparent px-1.5 text-[11px] text-white/60 outline-none [color-scheme:dark]"
                    title="Velg en dato og se hvordan porteføljen ser ut da"
                  />
                </div>
                {scenario && (
                  <button
                    onClick={() => setScenario('')}
                    data-testid="dr-scenario-badge"
                    title="Tilbake til i dag"
                    className="flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-[5px] text-[11px] font-semibold text-amber-300 transition-colors hover:bg-amber-400/25"
                  >
                    Fremtidsbilde {dtoNo(scenario)} <X className="h-3 w-3" />
                  </button>
                )}
                <a
                  href={xlsxHref}
                  data-testid="datarom-xlsx"
                  title="Last ned investorpakke (Excel)"
                  className="flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12px] font-semibold text-[#0a0a0a] transition-all hover:bg-white/90 active:scale-[0.97]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Investorpakke
                </a>
                <button
                  onClick={() => setTourAktiv(true)}
                  data-testid="datarom-omvisning-knapp"
                  title="Omvisning — se hva oversikten kan"
                  aria-label="Start omvisning"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] text-white/40 transition-all hover:bg-white/[0.06] hover:text-white"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Det dominante tallet */}
            <div className="mt-5" data-testid="dr-kpi-mrr">
              <div className="flex flex-wrap items-baseline gap-3">
                <AnimertTall verdi={mrr} className="text-[42px] font-bold leading-none tabular-nums tracking-[-0.035em] text-white sm:text-[52px]" style={heading} />
                {scenario && mrrDelta !== 0 && (
                  <span className={`rounded-full px-2.5 py-[4px] text-[12px] font-bold tabular-nums ${mrrDelta > 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`} data-testid="dr-mrr-delta">
                    {mrrDelta > 0 ? '+' : ''}{kr(mrrDelta)} vs. i dag
                  </span>
                )}
              </div>
              <p className="mt-2 text-[12.5px] text-white/40">≈ {kr(mrr * 12)}/år run-rate · eks. mva · DigiHomes inntekt — ikke leie</p>
            </div>

            {/* Veksttrappen — kumulativt fra i dag til full utleie */}
            {trapp && (
              <div className="mt-auto pt-6" data-testid="dr-honorar-trapp">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-white/35">Veksttrappen — kumulativt til full utleie</p>
                  <p className="hidden text-[10px] text-white/25 sm:block">live fra plattformen · ~ = estimert med snittsats</p>
                </div>
                <div className="flex h-[9px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                  {trapp.potensial > 0 && (
                    <>
                      <div className="h-full bg-white transition-all duration-700" style={{ width: `${(trapp.iDag / trapp.potensial) * 100}%` }} />
                      <div className="h-full bg-[#a78bfa] transition-all duration-700" style={{ width: `${((trapp.sikret - trapp.iDag) / trapp.potensial) * 100}%` }} />
                      <div className="h-full bg-[#8b5cf6]/40 transition-all duration-700" style={{ width: `${((trapp.medAnnonsert - trapp.sikret) / trapp.potensial) * 100}%` }} />
                    </>
                  )}
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
                  {[
                    ['#ffffff', scenario ? `Ved ${dtoNo(scenario)}` : 'I dag', kr(trapp.iDag), `${utleide} enheter betaler`],
                    ['#a78bfa', '+ Signert', `${trapp.estSikret ? '~' : ''}${kr(trapp.sikret)}`, `+${trapp.estSikret ? '~' : ''}${kr(trapp.sikret - trapp.iDag)} signerte kontrakter`],
                    ['rgba(139,92,246,0.45)', '+ Annonsert', `${trapp.estAnnonsert ? '~' : ''}${kr(trapp.medAnnonsert)}`, `+${trapp.estAnnonsert ? '~' : ''}${kr(trapp.medAnnonsert - trapp.sikret)} ute i markedet`],
                    ['rgba(255,255,255,0.22)', 'Full utleie', `${trapp.estFull ? '~' : ''}${kr(trapp.potensial)}`, `≈ ${trapp.estFull ? '~' : ''}${kr(trapp.potensial * 12)}/år`],
                  ].map(([farge, l, v, sub], i) => (
                    <div key={l} className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-white/35"><span className="h-[6px] w-[6px] rounded-full" style={{ background: farge }} />{l}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[16px] font-bold leading-none tabular-nums tracking-[-0.01em] text-white" style={heading}>
                        {i > 0 && <span aria-hidden className="text-[13px] font-semibold leading-none text-white/25">→</span>}
                        {v}
                      </p>
                      <p className="mt-1 truncate text-[10.5px] text-white/30">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI-flisene: margin · utleiegrad · pipeline · ARR · leiegrunnlag ── */}
        <div className="grid grid-cols-2 gap-3 xl:col-span-4" data-testid="dr-statstripe">
          <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="dr-kpi-margin">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Margin / mnd</p>
            <div>
              <AnimertTall verdi={margin} className="mt-2 block text-[21px] font-bold leading-none tabular-nums tracking-[-0.02em]" style={{ ...heading, color: margin >= 0 ? '#15803d' : '#be123c' }} />
              {bePct != null && (
                <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-[#f0eee9]">
                  <div className={`h-full rounded-full transition-all duration-700 ${bePct >= 100 ? 'bg-[#1f9a53]' : 'bg-[#8b5cf6]'}`} style={{ width: `${Math.min(bePct, 100)}%` }} />
                </div>
              )}
              <p className="mt-1.5 truncate text-[10.5px] font-medium text-[#78716c]">{bePct != null ? (bePct >= 100 ? 'over break-even' : `dekker ${bePct} % · ~${enheterIgjen} enheter igjen`) : 'honorar − faste kostnader'}</p>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="dr-kpi-utleiegrad">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Utleiegrad</p>
            <div>
              <div className="mt-2 flex items-center gap-2">
                <RingLite pct={utleiegrad} size={26} farge="#0a0a0a" />
                <p className="text-[21px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{utleiegrad} %</p>
              </div>
              <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">{utleide} av {antallEnheter || '—'} enheter utleid</p>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="dr-kpi-pipeline">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Pipeline honorar</p>
            <div>
              <p className="mt-2 text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{pipelineHonorar != null ? `+${trapp?.estAnnonsert ? '~' : ''}${kr(pipelineHonorar)}` : '—'}</p>
              <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">{paaVei} enheter på vei · signert + annonsert</p>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="dr-kpi-arr">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">ARR-potensial</p>
            <div>
              <p className="mt-2 text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{arrPotensial ? `${trapp?.estFull ? '~' : ''}${kr(arrPotensial)}` : '—'}</p>
              <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">{trapp ? `ved full utleie · ${trapp.estFull ? '~' : ''}${kr(trapp.potensial)}/mnd` : 'fra dagens honorar'}</p>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="dr-kpi-leie">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Leie under forvaltning</p>
              <p className="mt-1.5 truncate text-[10.5px] text-[#a8a29a]">huseiernes leiegrunnlag — ikke DigiHomes inntekt</p>
            </div>
            <p className="shrink-0 text-[21px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{utleidLeie > 0 ? kr(utleidLeie) : '—'}</p>
          </div>
        </div>
      </div>

      {/* ═══ PULS: driftssignaler — saker, signering, utløp, innflytting, annonse ═══ */}
      {signaler.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5" data-testid="dr-puls">
          {signaler.map(({ tid, Ikon, verdi, label, sub, tone }) => (
            <div key={tid} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid={`dr-puls-${tid}`}>
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#faf9f7]">
                <Ikon className="h-4 w-4 text-[#78716c]" />
                <span className="absolute -right-[2px] -top-[2px] h-[7px] w-[7px] rounded-full ring-2 ring-white" style={{ background: TONE_DOT[tone] }} />
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-[#0a0a0a]" style={heading}>{verdi}</span>
                  <span className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-[#b5b5b5]">{label}</span>
                </span>
                <span className={`mt-1 block truncate text-[10.5px] font-medium ${TONE_SUB[tone]}`}>{sub}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Neste 30 dager + porteføljefordeling ═══ */}
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
          {visRows.length > 0 && (
            <>
              <div className="mt-3 flex h-[8px] w-full overflow-hidden rounded-full bg-[#f0eee9]">
                {fordeling.filter((f) => f.antall > 0).map((f) => (
                  <div key={f.k} className="h-full transition-all duration-700" style={{ width: `${(f.antall / visRows.length) * 100}%`, background: f.farge }} title={`${f.l}: ${f.antall}`} />
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {fordeling.map((f) => (
                  <div key={f.k} className="flex items-center gap-2 rounded-lg px-1.5 py-[5px] transition-colors hover:bg-[#fafaf8]">
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: f.farge }} />
                    <span className="text-[12px] font-medium text-[#57534e]">{f.l}</span>
                    <span className="text-[11px] tabular-nums text-[#b5b5b5]">{f.antall}{f.antall > 0 ? ` · ${Math.round((f.antall / visRows.length) * 100)} %` : ''}</span>
                    <span className="ml-auto text-[11.5px] font-semibold tabular-nums text-[#78716c]">{f.leie > 0 ? `${kr(f.leie)}/mnd` : '—'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {visRows.length === 0 && <p className="mt-3 rounded-xl bg-[#fafaf8] px-3.5 py-3 text-[12px] text-[#999]">Henter porteføljen fra plattformen …</p>}
        </Kort>
      </div>

      {/* ═══ Selskapsøkonomi — asset-light: kostnader, break-even, CAC, selskapet ═══ */}
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

      {/* ═══ Resultat fra oppstart — graf + narrativ ═══ */}
      <Kort>
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><BarChart3 className="h-3.5 w-3.5" /> Resultat fra oppstart</p>
          {data.pnl.harData && pnlSiste && (
            <span className={`rounded-full px-2 py-[3px] text-[10px] font-bold tabular-nums ${pnlAkk >= 0 ? 'bg-[#e8f6ee] text-[#15803d]' : 'bg-[#fdeef1] text-[#be123c]'}`} data-testid="dr-pnl-akk">
              {pnlAkk >= 0 ? '+' : ''}{kr(pnlAkk)} akkumulert · {pnlSerie.length} mnd ført
            </span>
          )}
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

      {/* ═══ Snarveier videre inn i datarommet ═══ */}
      <div className={`grid grid-cols-2 gap-2.5 ${snarveier.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`} data-testid="dr-snarveier">
        {snarveier.map(([k, Ikon, t, sub]) => (
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
