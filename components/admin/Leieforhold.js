'use client';

/* ═══════════════ Leieforhold & inntekter — 1:1-speil av plattformen ═══════════════
   LINEAR-INSPIRERT FLATE: én samlet arbeidsflate (surface) med hårfine skille-
   linjer — verktøylinje (søk «/», statusfiltre, filtermodal, scenario, sortering)
   → KPI-bånd i TO SONER → kontekstlinjer → tabell som fyller skjermen.
   KPI-BÅNDET skiller tydelig mellom to pengestrømmer:
   · SONE A «Leiegrunnlag» — huseiernes leie: inntektstrappen (i dag → kommende →
     pipeline → ledig) + utleigrad
   · SONE B «DigiHome honorar» — vårt honorar som egen trapp: i dag → sikret
     (m/signert) → m/annonsert → full utleie (usikre trinn estimeres m/snittsats, ~)
   SELSKAPSØKONOMIEN (faste kostnader, margin, break-even, CAC totalt) bor i
   Datarom → Oversikt — én kilde, ett hjem. Her ligger kun andel/CAC per enhet
   i enhetsskuffen (admin redigerer CAC der).
   · Investor: alt read-only (full åpenhet)
   FASE 1–4:
   · Flervalgs-filter (status/type/inntekt/huseier) i modal — KPI-ene regnes LIVE
     av de filtrerte radene (lib/leieforhold-filter, delt med eksport-rutene)
   · Excel/CSV-eksport respekterer aktiv filtrering (eksplisitt valg i meny)
   · Scenario-dato: «hvordan ser porteføljen ut om 1 måned?» — innflyttinger t.o.m.
     datoen telles som utleid, utflyttinger før datoen som ledig
   Datakilder: /api/admin/leieforhold (live plattform) + /api/admin/leieforhold/okonomi */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  KeyRound, Search, Download, FileSpreadsheet, RefreshCw, ChevronDown, ChevronRight,
  Check, AlertTriangle, Megaphone, Pencil, X,
  FileText, ExternalLink, SlidersHorizontal, CalendarClock, Eye,
} from 'lucide-react';
import {
  TOM_FILTER, anvendScenario, filtrerRader, antallAktiveFiltre, harFilter,
  tilQuery, beregnTotals, aktiveKostnader, fordelKostnader, radNokkel,
  visGruppe, annonsertSplitt,
} from '@/lib/leieforhold-filter';

const heading = { fontFamily: 'var(--font-heading)' };

// ── Linear-inspirert kontrollspråk: 28 px høyde, hairline-kant, 7 px radius ──
const KNAPP_GHOST = 'flex h-7 items-center gap-1.5 rounded-[7px] border border-black/[0.08] bg-white px-2.5 text-[12px] font-medium text-[#57534e] shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917]';
const KNAPP_PRIMAER = 'flex h-7 items-center gap-1.5 rounded-[7px] bg-gradient-to-b from-[#2b2825] to-[#131110] px-3 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_1px_2px_rgba(28,25,23,0.2)] transition-all hover:from-[#211f1c] hover:to-[#0a0908] active:scale-[0.98]';
const MENY = 'rounded-[10px] border border-black/[0.07] bg-white/95 p-1 shadow-[0_12px_40px_rgba(28,25,23,0.14)] backdrop-blur-md dh-meny-inn';
const MENY_PUNKT = 'flex w-full items-center justify-between rounded-[6px] px-2.5 py-1.5 text-left text-[12.5px] transition-colors';
const ETIKETT = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a8a29a]';
// Sticky tabellhode/sum-rad: frostet glass (translucent bg + backdrop-blur) og
// inset-skygge i stedet for border (border-collapse + sticky mister kantlinjer
// i enkelte nettlesere; inset-skygge følger cellen).
const HODE_CELLE = 'sticky top-0 z-10 bg-white/85 backdrop-blur-md shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]';
const SUM_CELLE = 'sticky bottom-0 z-10 bg-[#fbfaf9]/85 backdrop-blur-md shadow-[inset_0_1px_0_rgba(0,0,0,0.08)]';

// Statuschip-farger — inntektstrappens nivåer (annonsert = pipeline, teal).
const STATUS_STIL = {
  leased: { bg: '#e7f4ec', tekst: '#1f7a45' },
  future: { bg: '#e8eefc', tekst: '#3757c4' },
  signing: { bg: '#fdf3e0', tekst: '#9a6b1c' },
  advertised: { bg: '#e4f2f4', tekst: '#0e7490' },
  vacant: { bg: '#f1ece4', tekst: '#8a8278' },
};
const GRUPPE_LABEL = { leased: 'Utleid', future: 'Fremtidig', signing: 'Under signering', advertised: 'Annonsert', vacant: 'Ledig' };
const SEKSJON_LABEL = { leased: 'Utleid', future: 'Fremtidig innflytting', signing: 'Under signering', advertised: 'Annonsert — pipeline', vacant: 'Ledig · uten annonse' };
const INNTEKT_VALG = [
  ['actual', 'Faktisk leie'], ['expected_signed', 'Forventet (signert)'],
  ['pending_signing', 'Under signering'], ['estimate', 'Estimat'],
];

// Tusenskiller: smalt no-break space (U+202F) gir tettere, riktigere tall.
const medTynnSkiller = (s) => String(s).replace(/[\s\u00A0]/g, '\u202F');
const kr = (v) => `${medTynnSkiller(Math.round(v || 0).toLocaleString('nb-NO'))}\u202Fkr`;
const dato = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const tilIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plussMnd = (m) => { const d = new Date(); d.setMonth(d.getMonth() + m); return tilIso(d); };
const imorgen = () => { const d = new Date(); d.setDate(d.getDate() + 1); return tilIso(d); };

const SORTERINGER = [
  { k: 'standard', l: 'Standard (status → beløp)' },
  { k: 'belop', l: 'Beløp — høyest først' },
  { k: 'honorar', l: 'Honorar — høyest først' },
  { k: 'adresse', l: 'Adresse A–Å' },
];

function StatusChip({ row }) {
  const vg = visGruppe(row);
  const s = STATUS_STIL[vg] || STATUS_STIL.vacant;
  const label = vg === 'advertised' ? 'Annonsert' : row.status_label;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[10.5px] font-semibold" style={{ background: s.bg, color: s.tekst }}>
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: s.tekst }} />
      {label}
      {row.advertised && <Megaphone className="h-3 w-3 opacity-70" />}
      {row._scenario && (
        <span title={row._scenario === 'inn' ? 'Scenario: innflyttet innen valgt dato' : 'Scenario: flyttet ut innen valgt dato'}>
          <CalendarClock className="h-3 w-3 opacity-70" />
        </span>
      )}
    </span>
  );
}

function AdresseCelle({ r }) {
  const erRom = r.unit_type === 'Rom i bofellesskap';
  const [gate, ...resten] = String(r.address || '').split(',');
  const omraade = resten.join(',').replace(/,?\s*Norge\s*$/i, '').trim();
  return (
    <>
      <p className="max-w-[240px] truncate text-[12.5px] font-medium text-[#1c1917]" title={r.address}>
        {(gate || '').trim() || '—'}
        {erRom && (
          <span className="ml-1.5 rounded-[4px] bg-[#f4f0fb] px-1 py-[1px] text-[9px] font-bold uppercase tracking-wide text-[#8b5cf6]">{r.enhet_detalj || 'Rom'}</span>
        )}
      </p>
      {omraade && <p className="mt-[1px] max-w-[240px] truncate text-[10.5px] text-[#a8a29a]">{omraade}</p>}
    </>
  );
}

/* ── Animerte tall: KPI-ene ruller mykt til ny verdi ved filtrering/scenario ── */
function useTellOpp(verdi, ms = 480) {
  const [vist, setVist] = useState(Number(verdi) || 0);
  const fraRef = useRef(Number(verdi) || 0);
  useEffect(() => {
    const fra = fraRef.current; const til = Number(verdi) || 0;
    if (fra === til) { setVist(til); return undefined; }
    let raf; const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVist(fra + (til - fra) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fraRef.current = til;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); fraRef.current = til; };
  }, [verdi, ms]);
  return vist;
}
const TallOpp = ({ verdi }) => <>{kr(useTellOpp(verdi))}</>;

/* ── Donut-ring for utleiegrad ── */
function Ring({ pct, farge = '#1f9a53', size = 34 }) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const fylt = (c * Math.max(0, Math.min(100, pct || 0))) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1ece4" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={farge} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${fylt} ${c}`}
        style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
  );
}

/* ── Initial-avatarer (hash-basert, rolig palett) ── */
const AVATAR_FARGER = [
  ['#eef2fd', '#3757c4'], ['#e7f4ec', '#1f7a45'], ['#fdf3e0', '#9a6b1c'],
  ['#f5f1fd', '#6d28d9'], ['#fdeef0', '#be123c'], ['#e8f4f4', '#0e7490'],
];
function Initialer({ navn }) {
  const s = String(navn || '').trim();
  if (!s || s === '—') return null;
  const deler = s.split(/\s+/);
  const init = ((deler[0]?.[0] || '') + (deler.length > 1 ? deler[deler.length - 1][0] || '' : '')).toUpperCase();
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  const [bg, fg] = AVATAR_FARGER[h % AVATAR_FARGER.length];
  return (
    <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold" style={{ background: bg, color: fg }}>
      {init}
    </span>
  );
}

// Seksjonshode i tabellen — Linear-stil gruppelinje
function SeksjonsRad({ nokkel, rader, colSpan, aggregat }) {
  return (
    <tr className="bg-[#faf9f7]">
      <td colSpan={colSpan} className="border-y border-black/[0.04] px-3 py-[5px]">
        <div className="flex items-center gap-2">
          <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUS_STIL[nokkel].tekst }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8278]">{SEKSJON_LABEL[nokkel] || nokkel}</span>
          <span className="text-[10px] tabular-nums text-[#c2beb8]">{rader.length}</span>
          <span className="ml-auto text-[10px] font-medium tabular-nums text-[#a8a29a]">{aggregat}</span>
        </div>
      </td>
    </tr>
  );
}

export default function Leieforhold({ apiKey, readOnly = false, erInvestor = false }) {
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [sok, setSok] = useState('');
  const [sortering, setSortering] = useState('standard');
  const [visOpen, setVisOpen] = useState(false); // «Vis»-meny: sortering + scenario-dato
  const sokRef = useRef(null);

  // Fase 1: flervalgs-filter (status/type/inntekt/huseier)
  const [filtre, setFiltre] = useState(() => ({ status: [], typer: [], inntekt: [], eiere: [] }));
  const [filterOpen, setFilterOpen] = useState(false);
  // Fase 2: eksplisitt eksportvalg (filtrert vs. hele porteføljen)
  const [eksportOpen, setEksportOpen] = useState(false);
  // Fase 4: scenario-dato («hvordan ser det ut om 1 måned?»)
  const [scenario, setScenario] = useState('');
  const [egenDato, setEgenDato] = useState('');

  // Enhetsøkonomi-data (andel faste kostnader + CAC per enhet — vises i
  // enhetsskuffen; selskaps-KPI-ene bor i Datarom → Oversikt)
  const [okonomi, setOkonomi] = useState({ felles: [], enheter: {} });
  const [cacSkjema, setCacSkjema] = useState(null); // {enhetId, adresse, cac, notat}
  const [lagrer, setLagrer] = useState(false);
  const [valgtRad, setValgtRad] = useState(null); // enhets-skuff (side drawer)
  const [pdfVisning, setPdfVisning] = useState(null); // {id, tittel} → PDF-modal

  // Tabellen skal fylle skjermen helt ned (ingen blank plass nederst):
  // vi måler hvor tabellboksen starter og gir den nøyaktig resthøyde,
  // med plass til bunnteksten under kortet.
  const tabellBoksRef = useRef(null);
  const bunnTekstRef = useRef(null);
  const [tabellMaxH, setTabellMaxH] = useState(null);

  // Esc lukker øverste lag: PDF → CAC → filter → enhetsskuff
  useEffect(() => {
    const paaTast = (e) => {
      if (e.key !== 'Escape') return;
      if (pdfVisning) setPdfVisning(null);
      else if (cacSkjema) setCacSkjema(null);
      else if (filterOpen) setFilterOpen(false);
      else if (valgtRad) setValgtRad(null);
    };
    window.addEventListener('keydown', paaTast);
    return () => window.removeEventListener('keydown', paaTast);
  }, [pdfVisning, cacSkjema, filterOpen, valgtRad]);

  // «/» fokuserer søket (Linear-hurtigtast)
  useEffect(() => {
    const paaSlash = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target; const tag = (t?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || t?.isContentEditable) return;
      e.preventDefault(); sokRef.current?.focus();
    };
    window.addEventListener('keydown', paaSlash);
    return () => window.removeEventListener('keydown', paaSlash);
  }, []);

  const kanRedigere = !readOnly;

  const hent = useCallback(async (fresh = false) => {
    setLaster(true); setFeil('');
    try {
      const r = await fetch(`/api/admin/leieforhold?key=${encodeURIComponent(apiKey)}${fresh ? '&fresh=1' : ''}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke hente leieforhold');
      setData(j);
    } catch (e) { setFeil(e.message); setData(null); }
    setLaster(false);
  }, [apiKey]);

  const hentOkonomi = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/leieforhold/okonomi?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (r.ok && j.ok) setOkonomi({ felles: j.felles || [], enheter: j.enheter || {} });
    } catch (e) { /* økonomidata er valgfritt tillegg */ }
  }, [apiKey]);

  useEffect(() => { hent(); hentOkonomi(); }, [hent, hentOkonomi]);

  useEffect(() => {
    if (!visOpen && !eksportOpen) return;
    const lukk = () => { setVisOpen(false); setEksportOpen(false); };
    window.addEventListener('click', lukk);
    return () => window.removeEventListener('click', lukk);
  }, [visOpen, eksportOpen]);

  const rows = data?.rows || [];
  const totals = data?.totals || {};

  /* ── Scenario + filter + sortering (delt logikk: lib/leieforhold-filter) ── */
  const scenarioRows = useMemo(() => anvendScenario(rows, scenario), [rows, scenario]);

  const filtrert = useMemo(() => {
    let ut = filtrerRader(scenarioRows, filtre, sok);
    if (sortering === 'belop') ut = [...ut].sort((a, b) => (b.monthly_rent || 0) - (a.monthly_rent || 0));
    else if (sortering === 'honorar') ut = [...ut].sort((a, b) => (b.fee_amount || 0) - (a.fee_amount || 0));
    else if (sortering === 'adresse') ut = [...ut].sort((a, b) => (a.address || '').localeCompare(b.address || '', 'nb'));
    return ut;
  }, [scenarioRows, filtre, sok, sortering]);

  const grupper = useMemo(() => {
    const t = { alle: scenarioRows.length, leased: 0, future: 0, signing: 0, advertised: 0, vacant: 0 };
    scenarioRows.forEach((r) => { const g = visGruppe(r); t[g] = (t[g] || 0) + 1; });
    return t;
  }, [scenarioRows]);

  // Porteføljefordeling (etter leiebeløp) — tynn segmentbar i toppen av flaten
  const fordelingSegmenter = useMemo(() => {
    const sum = { leased: 0, future: 0, signing: 0, advertised: 0, vacant: 0 };
    scenarioRows.forEach((r) => { const g = visGruppe(r); sum[g] = (sum[g] || 0) + (r.monthly_rent || 0); });
    const tot = Object.values(sum).reduce((s, v) => s + v, 0) || 1;
    return ['leased', 'future', 'signing', 'advertised', 'vacant']
      .filter((k) => sum[k] > 0)
      .map((k) => ({ k, pct: (sum[k] / tot) * 100, v: sum[k] }));
  }, [scenarioRows]);

  const aktivFiltrering = harFilter(filtre, sok);
  const antallFiltre = antallAktiveFiltre(filtre);

  // KPI-grunnlag: uendret visning bruker plattform-totals (1:1); filtrert/
  // scenario-visning regner samme matematikk over de synlige radene.
  const visTotals = useMemo(
    () => ((aktivFiltrering || scenario) ? beregnTotals(filtrert) : totals),
    [aktivFiltrering, scenario, filtrert, totals],
  );

  // Linear-stil: grupper radene i statusseksjoner ved standardsortering.
  const seksjoner = useMemo(() => {
    if (sortering !== 'standard' || sok.trim()) return [{ key: null, rader: filtrert }];
    return ['leased', 'future', 'signing', 'advertised', 'vacant']
      .map((g) => ({ key: g, rader: filtrert.filter((r) => visGruppe(r) === g) }))
      .filter((s) => s.rader.length);
  }, [filtrert, sortering, sok]);

  /* ── Inntektstrappen: annonsert-splitt, pipeline og sikret leie ──────────
     Annonserte ledige enheter er PIPELINE (forventet, usignert) — de teller
     aldri i «sikret», men skilles fra passiv ledighet. */
  const annonsert = useMemo(() => annonsertSplitt(filtrert), [filtrert]);
  const sikretLeie = (visTotals.actual_rent || 0) + (visTotals.expected_rent || 0);
  const pipelineLeie = (visTotals.pending_rent || 0) + annonsert.leie;
  const pipelineAntall = (visTotals.signing || 0) + annonsert.antall;
  const ledigLeie = Math.max(0, (visTotals.estimate_rent || 0) - annonsert.leie);
  const ledigAntall = Math.max(0, (visTotals.vacant || 0) - annonsert.antall);

  /* ── Honorar-trappen: DigiHomes inntekt trinn for trinn ───────────────────
     I dag (utleide) → Sikret (m/signerte som ikke har startet) → m/Annonsert
     (aktive annonser + under signering) → Full utleie. Rader uten avtalt sats
     (typisk annonserte/ledige uten kontrakt) estimeres med porteføljens
     snittsats — trinnet merkes da med ~. */
  const honorarTrapp = useMemo(() => {
    const g = { leased: [], future: [], signing: [], advertised: [], vacant: [] };
    filtrert.forEach((r) => { (g[visGruppe(r)] || g.vacant).push(r); });
    const iDag = g.leased.reduce((s, r) => s + (r.fee_amount || 0), 0);
    const leieIDag = g.leased.reduce((s, r) => s + (r.monthly_rent || 0), 0);
    const snittSats = leieIDag > 0 ? iDag / leieIDag : 0;
    const est = { future: false, signing: false, advertised: false, vacant: false };
    const fee = (r, n3) => {
      if (r.fee_amount > 0) return r.fee_amount;
      const e = Math.round((r.monthly_rent || 0) * snittSats);
      if (e > 0) est[n3] = true;
      return e;
    };
    const sumG = (n2) => g[n2].reduce((s, r) => s + fee(r, n2), 0);
    const sikret = iDag + sumG('future');
    const medAnnonsert = sikret + sumG('signing') + sumG('advertised');
    const potensial = medAnnonsert + sumG('vacant');
    const estSikret = est.future;
    const estAnnonsert = estSikret || est.signing || est.advertised;
    const estFull = estAnnonsert || est.vacant;
    return { iDag, sikret, medAnnonsert, potensial, estSikret, estAnnonsert, estFull };
  }, [filtrert]);

  /* ── Enhetsøkonomi (kun til enhetsskuffen: andel faste kostnader + CAC per
     enhet). Selskaps-KPI-ene (margin, break-even, CAC totalt) bor i
     Datarom → Oversikt. ── */
  const fellesAktive = useMemo(() => aktiveKostnader(okonomi.felles, scenario), [okonomi.felles, scenario]);
  const fellesTotal = useMemo(() => fellesAktive.reduce((s, p) => s + (p.belop || 0), 0), [fellesAktive]);

  // Fordeling per enhet — grunnlaget er HELE porteføljen (filtrering endrer
  // aldri den enkelte enhets andel), scenario-tilstanden påvirker «utleide».
  const andelKart = useMemo(() => fordelKostnader(scenarioRows, fellesAktive), [scenarioRows, fellesAktive]);

  const cacFor = (r) => okonomi.enheter[radNokkel(r)]?.cac || 0;

  const scenarioInn = useMemo(() => scenarioRows.filter((r) => r._scenario === 'inn').length, [scenarioRows]);
  const scenarioUt = useMemo(() => scenarioRows.filter((r) => r._scenario === 'ut').length, [scenarioRows]);

  // Mål tilgjengelig høyde for tabellens scrolleområde: fra tabellboksens topp
  // ned til bunnen av vinduet, minus bunntekst + litt luft. Re-måles ved
  // resize og når laget over endrer seg (filter-/scenariobannere, KPI-wrap).
  useEffect(() => {
    const maal = () => {
      const boks = tabellBoksRef.current;
      if (!boks) return;
      const topp = boks.getBoundingClientRect().top + window.scrollY;
      const bunn = (bunnTekstRef.current?.offsetHeight || 34) + 24; // bunntekst + margin/luft
      setTabellMaxH(Math.max(320, Math.round(window.innerHeight - topp - bunn)));
    };
    maal();
    const t = setTimeout(maal, 60); // etter fonter/animasjoner har satt seg
    window.addEventListener('resize', maal);
    return () => { clearTimeout(t); window.removeEventListener('resize', maal); };
  }, [laster, filtrert.length, scenario, aktivFiltrering, fordelingSegmenter.length]);

  /* ── Filtervalg-lister (typer/eiere med antall, fra scenario-radene) ─────── */
  const typeValg = useMemo(() => {
    const m = new Map();
    scenarioRows.forEach((r) => { const t = r.bolig_type || r.unit_type || 'Ukjent'; m.set(t, (m.get(t) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [scenarioRows]);
  const eierValg = useMemo(() => {
    const m = new Map();
    scenarioRows.forEach((r) => { const e = r.owner_name || '—'; m.set(e, (m.get(e) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [scenarioRows]);
  const inntektAntall = useMemo(() => {
    const m = {};
    scenarioRows.forEach((r) => { m[r.income_type] = (m[r.income_type] || 0) + 1; });
    return m;
  }, [scenarioRows]);

  const toggleFilter = (felt, verdi) => setFiltre((f) => {
    const liste = f[felt] || [];
    return { ...f, [felt]: liste.includes(verdi) ? liste.filter((x) => x !== verdi) : [...liste, verdi] };
  });
  const nullstillFiltre = () => setFiltre({ ...TOM_FILTER, status: [], typer: [], inntekt: [], eiere: [] });

  const eksportUrl = (type, medFilter) => {
    const q = medFilter ? tilQuery(filtre, sok, scenario) : '';
    return `/api/admin/leieforhold/${type}?key=${encodeURIComponent(apiKey)}${q ? `&${q}` : ''}`;
  };

  /* ── Lagring (admin): CAC per enhet — faste kostnader administreres i
     Datarom → Oversikt (KostnadsSkuff) ─────────────────────────────────── */
  const lagreCac = async () => {
    if (!cacSkjema) return;
    setLagrer(true);
    try {
      const r = await fetch(`/api/admin/leieforhold/okonomi/enhet?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enhetId: cacSkjema.enhetId, cac: Number(cacSkjema.cac) || 0, notat: cacSkjema.notat || '' }),
      });
      if (r.ok) { setCacSkjema(null); await hentOkonomi(); }
    } catch (e) { /* behold skjema åpent */ }
    setLagrer(false);
  };

  const kildeLive = data?.source === 'lease-income' || data?.source === 'units-contracts';
  const kildeTekst = !data && laster ? 'Henter fra plattformen …'
    : data?.source === 'lease-income' ? 'Plattform-data (1:1)'
    : data?.source === 'units-contracts' ? 'Live fra plattformen'
    : 'Avledet fra kontrakter';

  // Inntektstrappen i KPI-stripen: I dag → Kommende (= sikret) → Pipeline → Ledig
  const KPI = [
    { id: 'faktisk', l: 'Leie i dag', v: visTotals.actual_rent, farge: '#1f7a45', sub: `${visTotals.leased ?? 0} ${visTotals.leased === 1 ? 'enhet betaler' : 'enheter betaler'} nå` },
    { id: 'forventet', l: 'Kommende · signert', v: visTotals.expected_rent, farge: '#3757c4', sub: `${visTotals.future ?? 0} sign. → sikret ${kr(sikretLeie)}` },
    { id: 'under', l: 'Pipeline', v: pipelineLeie, farge: '#0e7490', sub: `${visTotals.signing ?? 0} under signering · ${annonsert.antall} annonsert` },
    { id: 'ledig', l: 'Ledig · uten annonse', v: ledigLeie, farge: '#8a8278', sub: `${ledigAntall} ${ledigAntall === 1 ? 'enhet' : 'enheter'} · estimert nivå` },
  ];

  // KPI-celle — rolig, tett, tabulære tall
  const KpiCelle = ({ children, testid }) => (
    <div className="border-b border-black/[0.05] px-4 py-2.5 sm:border-b-0" data-testid={testid}>{children}</div>
  );

  return (
    <div className="w-full" data-testid="leieforhold-modul">
      {feil && (
        <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-rose-200/70 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {feil}
        </div>
      )}
      {data?.stale && (
        <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-amber-200/70 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-700" data-testid="leieforhold-stale">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Viser sist lagrede tall ({new Date(data.fetchedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}) — {data.warning || 'plattformen svarte ikke.'}
        </div>
      )}

      {/* ═══════════ ÉN SAMLET ARBEIDSFLATE ═══════════ */}
      <div className="rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_12px_32px_-16px_rgba(28,25,23,0.10)]">

        {/* ── ÉN verktøylinje (Linear-stil): søk/hurtigfiltre → visning/eksport ── */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 sm:px-4">
          <div className="relative order-last w-full sm:order-none sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b3ada3]" />
            <input
              ref={sokRef}
              value={sok} onChange={(e) => setSok(e.target.value)}
              placeholder="Søk adresse, eier, leietaker …"
              data-testid="leieforhold-sok"
              className="h-7 w-full rounded-[7px] border border-black/[0.08] bg-[#faf9f7] pl-8 pr-7 text-[12.5px] outline-none transition-all placeholder:text-[#b3ada3] focus:border-[#8b5cf6]/40 focus:bg-white focus:ring-2 focus:ring-[#8b5cf6]/10 sm:w-[210px]"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-[4px] border border-black/[0.08] bg-white px-[5px] py-[1px] text-[9.5px] font-semibold text-[#b3ada3] sm:block">/</kbd>
          </div>
          <div className="order-last flex w-full items-center gap-1 overflow-x-auto no-scrollbar lg:order-none lg:w-auto">
            <button
              onClick={() => setFiltre((f) => ({ ...f, status: [] }))}
              data-testid="leieforhold-filter-alle"
              className={`flex h-7 shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 text-[12px] transition-all ${!filtre.status.length ? 'bg-[#1c1917] font-medium text-white' : 'border border-black/[0.08] bg-white font-medium text-[#78716c] hover:bg-[#f7f6f3]'}`}
            >
              Alle
              <span className={`tabular-nums text-[10px] ${!filtre.status.length ? 'text-white/50' : 'text-[#c2beb8]'}`}>{grupper.alle ?? 0}</span>
            </button>
            {[['leased', GRUPPE_LABEL.leased], ['future', GRUPPE_LABEL.future], ['signing', GRUPPE_LABEL.signing], ['advertised', GRUPPE_LABEL.advertised], ['vacant', GRUPPE_LABEL.vacant]].map(([k, l]) => (
              <button
                key={k}
                onClick={() => toggleFilter('status', k)}
                data-testid={`leieforhold-filter-${k}`}
                title="Flervalg — klikk for å slå av/på"
                className={`flex h-7 shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 text-[12px] transition-all ${filtre.status.includes(k) ? 'bg-[#1c1917] font-medium text-white' : 'border border-black/[0.08] bg-white font-medium text-[#78716c] hover:bg-[#f7f6f3]'}`}
              >
                <span className="h-[5px] w-[5px] rounded-full" style={{ background: filtre.status.includes(k) ? '#fff' : STATUS_STIL[k].tekst, opacity: filtre.status.includes(k) ? 0.7 : 1 }} />
                {l}
                <span className={`tabular-nums text-[10px] ${filtre.status.includes(k) ? 'text-white/50' : 'text-[#c2beb8]'}`}>{grupper[k] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {/* Synk-status + oppdater i ETT: dot (live/ping) + tid — klikk henter ferskt */}
            <button
              onClick={() => hent(true)}
              data-testid="leieforhold-oppdater"
              title={`${kildeTekst}${data?.fetchedAt ? ` · oppdatert ${new Date(data.fetchedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : ''} — klikk for å hente ferske tall`}
              className="group flex h-7 items-center gap-1.5 rounded-[7px] border border-black/[0.08] bg-white px-2 text-[11px] font-medium text-[#8a857c] shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917]"
            >
              <span className="relative flex h-[6px] w-[6px] shrink-0" data-testid="leieforhold-kilde">
                {kildeLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1f9a53] opacity-40" style={{ animationDuration: '2.4s' }} />}
                <span className={`relative inline-flex h-[6px] w-[6px] rounded-full ${!data && laster ? 'animate-pulse bg-[#a8a29a]' : kildeLive ? 'bg-[#1f9a53]' : 'bg-amber-500'}`} />
              </span>
              {data?.fetchedAt && (
                <span className="hidden tabular-nums xl:inline">{new Date(data.fetchedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              <RefreshCw className={`h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100 ${laster ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setFilterOpen(true)}
              data-testid="leieforhold-filter-knapp"
              className={`flex h-7 items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] font-medium transition-all ${antallFiltre ? 'border-[#8b5cf6]/25 bg-[#f5f1fd] text-[#6d28d9]' : 'border-black/[0.08] bg-white text-[#78716c] shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:bg-[#f7f6f3] hover:text-[#1c1917]'}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
              {antallFiltre > 0 && (
                <span className="flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#6d28d9] px-1 text-[9.5px] font-bold text-white">{antallFiltre}</span>
              )}
            </button>
            {/* «Vis»-meny (Linear Display): sortering + per dato-scenario samlet */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setVisOpen((o) => !o); setEksportOpen(false); }}
                data-testid="leieforhold-vis-knapp"
                title="Sortering og «per dato»-scenario"
                className={`flex h-7 items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] font-medium transition-all ${scenario ? 'border-amber-300/50 bg-amber-50 text-amber-700' : 'border-black/[0.08] bg-white text-[#78716c] shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:bg-[#f7f6f3] hover:text-[#1c1917]'}`}
              >
                <Eye className="h-3.5 w-3.5" /> Vis
                {(scenario || sortering !== 'standard') && (
                  <span className={`h-[5px] w-[5px] rounded-full ${scenario ? 'bg-amber-500' : 'bg-[#8b5cf6]'}`} />
                )}
                <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${visOpen ? 'rotate-180' : ''}`} />
              </button>
              {visOpen && (
                <div className={`absolute right-0 top-full z-30 mt-1 w-[256px] ${MENY}`} data-testid="leieforhold-vis-meny" onClick={(e) => e.stopPropagation()}>
                  <p className={`px-2.5 pb-1 pt-1.5 ${ETIKETT}`}>Sortering</p>
                  {SORTERINGER.map((s) => (
                    <button
                      key={s.k}
                      onClick={() => { setSortering(s.k); setVisOpen(false); }}
                      className={`${MENY_PUNKT} ${s.k === sortering ? 'bg-[#f5f1fd] font-medium text-[#6d28d9]' : 'text-[#57534e] hover:bg-[#f7f6f3]'}`}
                    >
                      {s.l}
                      {s.k === sortering && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-black/[0.05] pt-1.5">
                    <p className={`px-2.5 pb-1 ${ETIKETT}`}>Per dato — scenario</p>
                    {[['', 'I dag'], [plussMnd(1), 'Om 1 måned'], [plussMnd(3), 'Om 3 måneder']].map(([v, l]) => (
                      <button
                        key={l}
                        onClick={() => { setScenario(v); setVisOpen(false); }}
                        className={`${MENY_PUNKT} ${scenario === v ? 'bg-amber-50 font-medium text-amber-700' : 'text-[#57534e] hover:bg-[#f7f6f3]'}`}
                      >
                        {l}{v ? <span className="text-[10.5px] text-[#b8b2a9]">{dato(v)}</span> : scenario === '' ? <Check className="h-3.5 w-3.5" /> : null}
                      </button>
                    ))}
                    <div className="px-2.5 pb-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date" min={imorgen()} value={egenDato}
                          onChange={(e) => setEgenDato(e.target.value)}
                          data-testid="leieforhold-scenario-dato"
                          className="h-7 flex-1 rounded-[6px] border border-black/[0.08] bg-white px-2 text-[12px] outline-none focus:border-amber-400/60"
                        />
                        <button
                          onClick={() => { if (egenDato && egenDato > tilIso(new Date())) { setScenario(egenDato); setVisOpen(false); } }}
                          disabled={!egenDato || egenDato <= tilIso(new Date())}
                          data-testid="leieforhold-scenario-bruk"
                          className="flex h-7 items-center rounded-[6px] bg-[#141311] px-2.5 text-[11.5px] font-medium text-white transition-all hover:bg-black disabled:opacity-40"
                        >
                          Bruk
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Eksport-meny: Excel (filtrert/alt) + CSV i én knapp */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setEksportOpen((o) => !o); setVisOpen(false); }}
                data-testid="leieforhold-xlsx"
                className={KNAPP_PRIMAER}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Eksport</span>
                <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${eksportOpen ? 'rotate-180' : ''}`} />
              </button>
              {eksportOpen && (
                <div className={`absolute right-0 top-full z-30 mt-1 w-[280px] ${MENY}`} data-testid="leieforhold-eksport-meny" onClick={(e) => e.stopPropagation()}>
                  {(aktivFiltrering || scenario) && (
                    <a
                      href={eksportUrl('xlsx', true)}
                      onClick={() => setEksportOpen(false)}
                      className="flex w-full items-start gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors hover:bg-[#f5f1fd]"
                      data-testid="leieforhold-eksport-filtrert"
                    >
                      <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-medium text-[#1c1917]">Excel — gjeldende visning</span>
                        <span className="block text-[10.5px] text-[#a8a29a]">{filtrert.length} enheter · filter{scenario ? ' + scenario' : ''} følger med</span>
                      </span>
                    </a>
                  )}
                  <a
                    href={eksportUrl('xlsx', false)}
                    onClick={() => setEksportOpen(false)}
                    className="flex w-full items-start gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors hover:bg-[#f7f6f3]"
                    data-testid="leieforhold-eksport-alt"
                  >
                    <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f9a53]" />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-medium text-[#1c1917]">Excel — hele porteføljen</span>
                      <span className="block text-[10.5px] text-[#a8a29a]">{rows.length} enheter · Oversikt-ark + levende formler</span>
                    </span>
                  </a>
                  {!readOnly && (
                    <>
                      <div className="my-1 border-t border-black/[0.05]" />
                      <a
                        href={eksportUrl('csv', true)}
                        onClick={() => setEksportOpen(false)}
                        className="flex w-full items-start gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors hover:bg-[#f7f6f3]"
                        data-testid="leieforhold-csv"
                      >
                        <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a8a29a]" />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-medium text-[#1c1917]">CSV — gjeldende visning</span>
                          <span className="block text-[10.5px] text-[#a8a29a]">{aktivFiltrering || scenario ? `${filtrert.length} enheter · rådata` : 'hele porteføljen · rådata'}</span>
                        </span>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Porteføljefordeling: tynn segmentbar (leiebeløp per status) ── */}
        {fordelingSegmenter.length > 0 && (
          <div className="flex h-[4px] gap-[3px] px-3 pb-2.5 sm:px-4" data-testid="leieforhold-fordelingsbar">
            {fordelingSegmenter.map((s) => (
              <div
                key={s.k}
                title={`${GRUPPE_LABEL[s.k]} · ${kr(s.v)}/mnd (${Math.round(s.pct)} %)`}
                className="rounded-full transition-all duration-700"
                style={{ width: `${s.pct}%`, background: STATUS_STIL[s.k].tekst, opacity: s.k === 'vacant' ? 0.4 : s.k === 'advertised' ? 0.8 : 0.9 }}
              />
            ))}
          </div>
        )}

        {/* ── KPI-bånd: to tydelig adskilte soner ─────────────────────────────
            SONE A «Leiegrunnlag» — huseiernes leie (inntektstrappen + utleigrad)
            SONE B «DigiHome honorar» — vårt honorar som egen trapp: i dag →
            m/signert (sikret) → m/annonsert → full utleie. Trinn uten avtalt
            sats estimeres med porteføljens snittsats og merkes ~.
            Selskapets økonomi (faste kostnader, margin, break-even, CAC) bor
            i Datarom → Oversikt — én kilde, ett hjem. ── */}
        <div className="grid grid-cols-1 border-t border-black/[0.05] xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
          {/* SONE A — Leiegrunnlag (huseiernes penger) */}
          <div className="min-w-0 pb-1" data-testid="leieforhold-sone-leie">
            <p className={`px-4 pt-2 ${ETIKETT}`}>Leiegrunnlag / mnd <span className="font-medium normal-case tracking-normal text-[#c2beb8]">— huseiernes leie</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-5 sm:divide-x sm:divide-black/[0.05]">
              {KPI.map((s) => (
                <KpiCelle key={s.id} testid={`leieforhold-kpi-${s.id}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="h-[6px] w-[6px] rounded-full" style={{ background: s.farge }} />
                    <p className={`truncate ${ETIKETT}`}>{s.l}</p>
                  </div>
                  <p className="mt-1 text-[16px] font-semibold tabular-nums tracking-[-0.01em] text-[#1c1917]" style={heading}>
                    {laster ? '…' : <TallOpp verdi={s.v} />}
                  </p>
                  <p className="mt-[1px] truncate text-[10.5px] text-[#b8b2a9]">{s.sub}</p>
                </KpiCelle>
              ))}
              <div className="flex items-center gap-2.5 px-4 py-2" data-testid="leieforhold-kpi-utleigrad">
                <Ring pct={visTotals.occupancy_pct || 0} />
                <div className="min-w-0">
                  <p className={`truncate ${ETIKETT}`}>Utleigrad</p>
                  <p className="mt-[1px] text-[14px] font-semibold tabular-nums tracking-[-0.01em] text-[#1c1917]" style={heading}>{visTotals.occupancy_pct ?? 0} %</p>
                  <p className="truncate text-[10.5px] text-[#b8b2a9]">{visTotals.leased ?? 0} av {visTotals.count ?? 0} utleid</p>
                </div>
              </div>
            </div>
          </div>

          {/* SONE B — DigiHome honorar-trapp (våre penger, lilla sone) */}
          <div className="border-t border-black/[0.05] bg-gradient-to-br from-[#faf7ff] via-[#faf8ff] to-white px-4 pb-2.5 pt-2 xl:border-l xl:border-t-0" data-testid="leieforhold-honorar-trapp">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b5cf6]">DigiHome honorar / mnd <span className="font-medium normal-case tracking-normal text-[#b5a8d6]">· eks. mva</span></p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-[17px] font-semibold tabular-nums tracking-[-0.01em]" style={{ ...heading, color: '#7c3aed' }} data-testid="leieforhold-honorar">
                {laster ? '…' : <TallOpp verdi={honorarTrapp.iDag} />}
              </p>
              <p className="truncate text-[10.5px] text-[#b8b2a9]">i dag · {visTotals.leased ?? 0} {visTotals.leased === 1 ? 'enhet betaler' : 'enheter betaler'} · netto eiere {kr(visTotals.net)}</p>
            </div>
            {/* Trappebar — kumulativ mot full utleie */}
            <div className="mt-2 flex h-[5px] w-full overflow-hidden rounded-full bg-[#ece5f9]">
              {honorarTrapp.potensial > 0 && (
                <>
                  <div className="h-full bg-[#7c3aed] transition-all duration-700" style={{ width: `${(honorarTrapp.iDag / honorarTrapp.potensial) * 100}%` }} />
                  <div className="h-full bg-[#a78bfa] transition-all duration-700" style={{ width: `${((honorarTrapp.sikret - honorarTrapp.iDag) / honorarTrapp.potensial) * 100}%` }} />
                  <div className="h-full bg-[#2aa3bf] transition-all duration-700" style={{ width: `${((honorarTrapp.medAnnonsert - honorarTrapp.sikret) / honorarTrapp.potensial) * 100}%` }} />
                </>
              )}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-[3px]">
              {[
                ['#7c3aed', 'I dag', honorarTrapp.iDag, false, 'leieforhold-hon-idag'],
                ['#a78bfa', 'Sikret · m/signert', honorarTrapp.sikret, honorarTrapp.estSikret, 'leieforhold-hon-sikret'],
                ['#2aa3bf', '+ Annonsert nå', honorarTrapp.medAnnonsert, honorarTrapp.estAnnonsert, 'leieforhold-hon-annonsert'],
                ['#c9c3ba', 'Full utleie', honorarTrapp.potensial, honorarTrapp.estFull, 'leieforhold-hon-full'],
              ].map(([farge, l, v, est, tid]) => (
                <div key={l} className="flex items-baseline justify-between gap-2" data-testid={tid}>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: farge }} />
                    <span className="truncate text-[10.5px] text-[#8a8278]">{l}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#57534e]">{est ? '~' : ''}{kr(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Kontekstlinjer: filtrert visning + scenario ── */}
        {(aktivFiltrering || scenario) && (
          <div className="flex items-center gap-2 border-t border-black/[0.05] bg-gradient-to-r from-[#f7f3ff] to-white px-3 py-1.5 sm:px-4" data-testid="leieforhold-kpi-filtrert">
            <SlidersHorizontal className="h-3 w-3 shrink-0 text-[#8b5cf6]" />
            <span className="truncate text-[11px] font-medium text-[#6d28d9]">
              KPI-ene viser {filtrert.length} av {scenarioRows.length} enheter{scenario ? ` · scenario ${dato(scenario)}` : ''}
            </span>
            {aktivFiltrering && (
              <button onClick={() => { nullstillFiltre(); setSok(''); }} className="ml-auto shrink-0 text-[11px] font-medium text-[#a8a29a] transition-colors hover:text-[#57534e]">
                Nullstill filter
              </button>
            )}
          </div>
        )}
        {scenario && (
          <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.05] bg-gradient-to-r from-[#fff6e2] to-white px-3 py-1.5 sm:px-4" data-testid="leieforhold-scenario-banner">
            <CalendarClock className="h-3 w-3 shrink-0 text-amber-600" />
            <span className="text-[11px] font-medium text-amber-800">Scenario: slik ser porteføljen ut {dato(scenario)}</span>
            <span className="text-[10.5px] text-amber-700/70">{scenarioInn} flytter inn · {scenarioUt} flytter ut innen datoen</span>
            <button
              onClick={() => setScenario('')}
              data-testid="leieforhold-scenario-nullstill"
              className="ml-auto flex h-[22px] items-center gap-1 rounded-[6px] px-1.5 text-[10.5px] font-medium text-amber-700 transition-colors hover:bg-amber-100/70"
            >
              <X className="h-3 w-3" /> Tilbake til i dag
            </button>
          </div>
        )}

        {/* ── Tabell ── */}
        <div className="border-t border-black/[0.05]">
          {laster && (
            <div className="space-y-1.5 p-4" data-testid="leieforhold-skeleton">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="dh-skjelett h-8 rounded-[7px]" style={{ opacity: Math.max(0.25, 1 - i * 0.11) }} />
              ))}
            </div>
          )}
          {!laster && !filtrert.length && (
            <div className="py-14 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-[10px] border border-black/[0.06] bg-[#faf9f7]"><KeyRound className="h-4.5 w-4.5 text-[#8b5cf6]" /></span>
              <p className="mt-3 text-[12.5px] text-[#a8a29a]">{aktivFiltrering ? 'Ingen treff — juster søk eller filter.' : 'Ingen leieforhold funnet.'}</p>
              {aktivFiltrering && (
                <button
                  onClick={() => { nullstillFiltre(); setSok(''); }}
                  className="mt-3 rounded-[7px] border border-[#8b5cf6]/25 bg-[#f5f1fd] px-3.5 py-1.5 text-[12px] font-medium text-[#6d28d9] transition-colors hover:bg-[#ece5f9]"
                >
                  Nullstill filter
                </button>
              )}
            </div>
          )}

          {/* ── Leieforholdstabellen ── */}
          {!laster && filtrert.length > 0 && (
            <>
              {/* Eget scrolleområde: kolonnehodet fester seg øverst og sum-raden
                  nederst — tabellen fyller resten av skjermen (målt høyde). */}
              <div
                ref={tabellBoksRef}
                className="hidden min-h-[340px] overflow-auto md:block"
                style={{ maxHeight: tabellMaxH ? `${tabellMaxH}px` : 'calc(100vh - 330px)' }}
              >
                <table className="w-full min-w-[1120px] text-left" data-testid="leieforhold-tabell">
                <thead>
                  <tr>
                    {['Adresse', 'Type', 'Huseier', 'Leietaker', 'Status', 'Innflytting', 'Utflytting', 'Beløp / mnd', 'Sats', 'Honorar', 'Netto', 'Depositum'].map((h, i) => (
                      <th key={h} className={`${HODE_CELLE} px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaa49b] ${i >= 7 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                    <th className={`${HODE_CELLE} w-8`} />
                  </tr>
                </thead>
                <tbody>
                  {(() => { let idx = -1; return seksjoner.map((sek) => (
                    <React.Fragment key={sek.key || 'alle'}>
                      {sek.key && (
                        <SeksjonsRad nokkel={sek.key} rader={sek.rader} colSpan={13} aggregat={`${kr(sek.rader.reduce((s, r) => s + (r.monthly_rent || 0), 0))}/mnd`} />
                      )}
                      {sek.rader.map((r) => {
                    idx += 1; const i = idx;
                    const erRom = r.unit_type === 'Rom i bofellesskap';
                    return (
                    <tr key={`${radNokkel(r)}-${i}`} onClick={() => setValgtRad(r)} className="group dh-rad-inn cursor-pointer border-b border-black/[0.03] transition-colors last:border-b-0 hover:bg-[#faf9f7]" style={{ animationDelay: `${Math.min(i, 16) * 16}ms` }} data-testid={`leieforhold-rad-${i}`}>
                      <td className="px-3 py-2"><AdresseCelle r={r} /></td>
                      <td className="whitespace-nowrap px-3 py-2 text-[12px] text-[#57534e]">{r.bolig_type || (erRom ? 'Rom' : '—')}</td>
                      <td className="max-w-[170px] px-3 py-2" title={r.owner_name}>
                        <span className="flex items-center gap-1.5">
                          <Initialer navn={r.owner_name} />
                          <span className="truncate text-[12px] text-[#57534e]">{r.owner_name || '—'}</span>
                        </span>
                      </td>
                      <td className="max-w-[170px] px-3 py-2" title={r.tenant_name}>
                        <span className="flex items-center gap-1.5">
                          <Initialer navn={r.tenant_name} />
                          <span className="truncate text-[12px] text-[#57534e]">{r.tenant_name || '—'}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2"><StatusChip row={r} /></td>
                      <td className="whitespace-nowrap px-3 py-2 text-[12px] text-[#78716c]">{r.move_in_date ? dato(r.move_in_date) : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-[12px]">
                        {r.move_out_date
                          ? <span className="text-[#78716c]">{dato(r.move_out_date)}</span>
                          : r.tenant_name
                            ? <span className="rounded-[4px] bg-[#e7f4ec] px-1.5 py-[2px] text-[10px] font-semibold text-[#1f7a45]">Løpende</span>
                            : <span className="text-[#78716c]">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-[12.5px] font-semibold tabular-nums text-[#1c1917]">
                        {r.group === 'vacant' && !r.monthly_rent
                          ? <span className="rounded-[4px] bg-amber-50 px-1.5 py-[2px] text-[10.5px] font-semibold text-amber-600">Ikke satt</span>
                          : kr(r.monthly_rent)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-[12px] tabular-nums text-[#78716c]">{r.fee_percent ? `${r.fee_percent.toLocaleString('nb-NO')} %` : '—'}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right text-[12px] tabular-nums ${r.group === 'leased' ? 'font-semibold' : ''}`} style={{ color: r.group === 'leased' ? '#7c3aed' : '#c2beb8' }} title={r.group === 'leased' ? 'Realisert honorar' : 'Potensielt honorar — ikke realisert ennå'}>
                        {r.fee_amount ? kr(r.fee_amount) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-[12px] tabular-nums" style={{ color: r.group === 'leased' ? '#57534e' : '#c2beb8' }}>
                        {r.net_to_owner ? kr(r.net_to_owner) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-[12px] tabular-nums text-[#78716c]">{r.deposit != null ? kr(r.deposit) : '—'}</td>
                      <td className="w-8 pr-3"><ChevronRight className="h-3.5 w-3.5 text-[#c9c3ba] opacity-0 transition-opacity group-hover:opacity-100" /></td>
                    </tr>
                    );
                  })}
                    </React.Fragment>
                  )); })()}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={`${SUM_CELLE} px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a8a29a]`}>Sum ({filtrert.length})</td>
                    <td colSpan={6} className={SUM_CELLE} />
                    <td className={`${SUM_CELLE} px-3 py-2 text-right text-[12.5px] font-semibold tabular-nums text-[#1c1917]`}>{kr(filtrert.reduce((s, r) => s + (r.monthly_rent || 0), 0))}</td>
                    <td className={SUM_CELLE} />
                    <td className={`${SUM_CELLE} px-3 py-2 text-right text-[12px] font-semibold tabular-nums`} style={{ color: '#7c3aed' }} title="Realisert honorar (kun utleide)">{kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.fee_amount || 0), 0))}</td>
                    <td className={`${SUM_CELLE} px-3 py-2 text-right text-[12px] font-semibold tabular-nums text-[#57534e]`}>{kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.net_to_owner || 0), 0))}</td>
                    <td colSpan={2} className={SUM_CELLE} />
                  </tr>
                </tfoot>
              </table>
              </div>

              {/* Mobil kortliste — utleie */}
              <div className="divide-y divide-black/[0.04] md:hidden" data-testid="leieforhold-kortliste">
                {(() => { let mIdx = -1; return seksjoner.map((sek) => (
                  <React.Fragment key={`m-${sek.key || 'alle'}`}>
                    {sek.key && (
                      <div className="flex items-center gap-2 bg-[#faf9f7] px-4 py-[5px]">
                        <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUS_STIL[sek.key].tekst }} />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8278]">{SEKSJON_LABEL[sek.key] || sek.key}</span>
                        <span className="text-[10px] tabular-nums text-[#c2beb8]">{sek.rader.length}</span>
                        <span className="ml-auto text-[10px] font-medium tabular-nums text-[#a8a29a]">{kr(sek.rader.reduce((s, r) => s + (r.monthly_rent || 0), 0))}/mnd</span>
                      </div>
                    )}
                    {sek.rader.map((r) => { mIdx += 1; const i = mIdx; return (
                  <div key={`${radNokkel(r)}-${i}`} className="dh-rad-inn px-4 py-3 transition-colors active:bg-[#faf9f7]" style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }} onClick={() => setValgtRad(r)} data-testid={`leieforhold-kort-${i}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-tight text-[#1c1917]">
                          {r.unit_room}
                          {r.unit_type === 'Rom i bofellesskap' && (
                            <span className="ml-1.5 rounded-[4px] bg-[#f4f0fb] px-1 py-[1px] text-[9px] font-bold uppercase tracking-wide text-[#8b5cf6]">Rom</span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#a8a29a]">{r.address}</p>
                      </div>
                      <span className="shrink-0"><StatusChip row={r} /></span>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="min-w-0 space-y-0.5 text-[11px] text-[#8a8278]">
                        {r.bolig_type && <p className="truncate">Type · {r.bolig_type}</p>}
                        {r.owner_name && <p className="truncate">Eier · {r.owner_name}</p>}
                        {r.tenant_name && <p className="truncate">Leietaker · {r.tenant_name}</p>}
                        {r.move_in_date && <p>{r.group === 'leased' ? 'Innflyttet' : 'Innflytting'} {dato(r.move_in_date)}{r.tenant_name ? (r.move_out_date ? ` → ${dato(r.move_out_date)}` : ' · løpende') : ''}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[14.5px] font-semibold tabular-nums text-[#1c1917]">
                          {r.group === 'vacant' && !r.monthly_rent
                            ? <span className="rounded-[4px] bg-amber-50 px-1.5 py-[2px] text-[10.5px] font-semibold text-amber-600">Ikke satt</span>
                            : kr(r.monthly_rent)}
                        </p>
                        {r.group === 'leased' && (
                          <p className="mt-0.5 text-[10.5px] font-medium tabular-nums" style={{ color: '#7c3aed' }}>honorar {kr(r.fee_amount)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                    ); })}
                  </React.Fragment>
                )); })()}
                <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-b-[11px] border-t border-black/[0.06] bg-[#fbfaf9] px-4 py-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a8a29a]">Sum ({filtrert.length})</span>
                  <div className="text-right">
                    <p className="text-[13.5px] font-semibold tabular-nums text-[#1c1917]">{kr(filtrert.reduce((s, r) => s + (r.monthly_rent || 0), 0))}</p>
                    <p className="text-[10.5px] font-medium tabular-nums" style={{ color: '#7c3aed' }}>honorar {kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.fee_amount || 0), 0))}</p>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ═══ Enhets-skuff (side drawer) ═══ */}
      {valgtRad && (() => {
        const r = valgtRad;
        const andel = andelKart.get(radNokkel(r)) || 0;
        const cac = cacFor(r);
        const notat = okonomi.enheter[radNokkel(r)]?.notat || '';
        const margin = (r.fee_amount || 0) - andel;
        const [gate, ...resten] = String(r.address || '').split(',');
        const omraade = resten.join(',').replace(/,?\s*Norge\s*$/i, '').trim();
        const Rad = ({ l, v, farge }) => (
          <div className="flex items-baseline justify-between gap-3 py-[7px]">
            <span className="shrink-0 text-[11.5px] text-[#a8a29a]">{l}</span>
            <span className="text-right text-[12.5px] font-medium tabular-nums" style={{ color: farge || '#1c1917' }}>{v}</span>
          </div>
        );
        const Seksjon = ({ t, children }) => (
          <div className="mt-4">
            <p className={`mb-1 ${ETIKETT}`}>{t}</p>
            <div className="divide-y divide-black/[0.04] rounded-[10px] border border-black/[0.05] bg-[#fbfaf8] px-3.5 py-0.5">{children}</div>
          </div>
        );
        const forvChip = r.forvaltning_status === 'active'
          ? { t: 'Aktiv', bg: '#e7f4ec', c: '#1f7a45' }
          : r.forvaltning_status === 'signed'
            ? { t: 'Signert', bg: '#e8eefc', c: '#3757c4' }
            : r.forvaltning_status ? { t: r.forvaltning_status, bg: '#f1ece4', c: '#8a8278' } : null;
        return (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[2px]" onClick={() => setValgtRad(null)}>
            <div className="flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-black/[0.07] bg-white shadow-[-16px_0_60px_rgba(28,25,23,0.14)] dh-drawer-inn" onClick={(e) => e.stopPropagation()} data-testid="leieforhold-skuff">
              <div className="sticky top-0 z-10 border-b border-black/[0.05] bg-white/95 px-5 py-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[#1c1917]" style={heading}>{(gate || '').trim()}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-[#a8a29a]">{omraade}{r.bolig_type ? ` · ${r.bolig_type}` : ''}{r.enhet_detalj ? ` · ${r.enhet_detalj}` : ''}</p>
                  </div>
                  <button onClick={() => setValgtRad(null)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]" data-testid="leieforhold-skuff-lukk"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-2.5"><StatusChip row={r} /></div>
              </div>

              <div className="flex-1 px-5 pb-6">
                <Seksjon t="Leieforhold">
                  <Rad l="Leietaker" v={r.tenant_name || '—'} />
                  <Rad l="Beløp / mnd" v={r.monthly_rent ? kr(r.monthly_rent) : 'Ikke satt'} />
                  <Rad l="Innflytting" v={r.move_in_date ? dato(r.move_in_date) : '—'} />
                  <Rad l="Utflytting" v={r.move_out_date ? dato(r.move_out_date) : (r.tenant_name ? 'Løpende' : '—')} farge={!r.move_out_date && r.tenant_name ? '#1f7a45' : undefined} />
                  <Rad l="Depositum" v={r.deposit != null ? kr(r.deposit) : '—'} />
                </Seksjon>

                <Seksjon t="Økonomi (DigiHome)">
                  <Rad l="Sats" v={r.fee_percent ? `${r.fee_percent.toLocaleString('nb-NO')} % eks. mva` : '—'} />
                  <Rad l="Honorar / mnd" v={r.fee_amount ? kr(r.fee_amount) : '—'} farge="#7c3aed" />
                  <Rad l="Netto til huseier" v={r.net_to_owner ? kr(r.net_to_owner) : '—'} />
                  {fellesTotal > 0 && <Rad l="Andel faste kostnader" v={andel ? `−${kr(andel)}` : '—'} farge="#9a6b1c" />}
                  <Rad l={fellesTotal > 0 ? 'Margin / mnd' : 'Dekningsbidrag / mnd'} v={kr(margin)} farge={margin >= 0 ? '#1f7a45' : '#e11d48'} />
                  <Rad l="CAC · engangs" v={cac ? `${kr(cac)}${r.fee_amount ? ` · payback ${(cac / r.fee_amount).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mnd` : ''}` : '—'} />
                  {notat && <Rad l="Notat" v={notat} />}
                </Seksjon>
                {kanRedigere && (
                  <button
                    onClick={() => setCacSkjema({ enhetId: radNokkel(r), adresse: r.address, cac: cac || '', notat })}
                    className="mt-2 flex h-7 items-center gap-1.5 rounded-[7px] border border-[#8b5cf6]/25 bg-[#f5f1fd] px-2.5 text-[11.5px] font-medium text-[#6d28d9] transition-colors hover:bg-[#ece5f9]"
                    data-testid="leieforhold-skuff-cac"
                  >
                    <Pencil className="h-3 w-3" /> Rediger CAC / notat
                  </button>
                )}

                <Seksjon t="Forvaltning">
                  <Rad l="Huseier" v={r.owner_name || '—'} />
                  <Rad l="Avtalestatus" v={forvChip ? (
                    <span className="rounded-full px-2 py-[2px] text-[10.5px] font-semibold" style={{ background: forvChip.bg, color: forvChip.c }}>{forvChip.t}</span>
                  ) : '—'} />
                  {r.forvaltning_start && <Rad l="Avtalestart" v={dato(r.forvaltning_start)} />}
                  <Rad l="Servicenivå" v={r.service_level || '—'} />
                </Seksjon>

                {(r.forvaltning_id || r.lease_id) && (
                  <div className="mt-4">
                    <p className={`mb-1 ${ETIKETT}`}>Dokumenter</p>
                    <div className="space-y-1.5">
                      {r.forvaltning_id && (
                        <button
                          onClick={() => setPdfVisning({ id: r.forvaltning_id, tittel: `Forvaltningsavtale — ${(gate || '').trim()}` })}
                          className="flex w-full items-center gap-2.5 rounded-[10px] border border-black/[0.05] bg-[#fbfaf8] px-3 py-2.5 text-left transition-colors hover:border-[#8b5cf6]/25 hover:bg-[#f5f1fd]"
                          data-testid="leieforhold-skuff-forvaltning-pdf"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-black/[0.05] bg-white"><FileText className="h-4 w-4 text-[#8b5cf6]" /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium text-[#1c1917]">Forvaltningsavtale</span>
                            <span className="block text-[10.5px] text-[#b3ada3]">Åpne PDF</span>
                          </span>
                        </button>
                      )}
                      {r.lease_id && (
                        <button
                          onClick={() => setPdfVisning({ id: r.lease_id, tittel: `Leiekontrakt — ${r.tenant_name || (gate || '').trim()}` })}
                          className="flex w-full items-center gap-2.5 rounded-[10px] border border-black/[0.05] bg-[#fbfaf8] px-3 py-2.5 text-left transition-colors hover:border-[#3757c4]/25 hover:bg-[#eef2fd]"
                          data-testid="leieforhold-skuff-leiekontrakt-pdf"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-black/[0.05] bg-white"><FileText className="h-4 w-4 text-[#3757c4]" /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium text-[#1c1917]">Leiekontrakt{r.tenant_name ? ` · ${r.tenant_name}` : ''}</span>
                            <span className="block text-[10.5px] text-[#b3ada3]">Åpne PDF</span>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ PDF-visning ═══ */}
      {pdfVisning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-6" onClick={() => setPdfVisning(null)}>
          <div className="dh-pop-inn flex h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[14px] border border-black/[0.07] bg-white shadow-[0_32px_120px_rgba(0,0,0,0.35)]" onClick={(e) => e.stopPropagation()} data-testid="leieforhold-pdf-modal">
            <div className="flex items-center gap-2 border-b border-black/[0.06] px-4 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-[#8b5cf6]" />
              <p className="min-w-0 truncate text-[13px] font-semibold text-[#1c1917]" style={heading}>{pdfVisning.tittel}</p>
              <a
                href={`/api/admin/leieforhold/kontrakt-pdf?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(pdfVisning.id)}`}
                target="_blank" rel="noreferrer"
                className={`ml-auto ${KNAPP_GHOST}`}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ny fane
              </a>
              <button onClick={() => setPdfVisning(null)} className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]"><X className="h-4 w-4" /></button>
            </div>
            <iframe
              title={pdfVisning.tittel}
              src={`/api/admin/leieforhold/kontrakt-pdf?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(pdfVisning.id)}`}
              className="h-full w-full flex-1 border-0 bg-[#faf9f7]"
            />
          </div>
        </div>
      )}

      {/* ═══ CAC-editor (admin) ═══ */}
      {kanRedigere && cacSkjema && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-4 backdrop-blur-[2px] sm:items-center" onClick={() => setCacSkjema(null)}>
          <div className="dh-pop-inn w-full max-w-[420px] rounded-[14px] border border-black/[0.07] bg-white p-5 shadow-[0_24px_80px_rgba(28,25,23,0.22)]" onClick={(e) => e.stopPropagation()} data-testid="leieforhold-cac-modal">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-[#1c1917]" style={heading}>Anskaffelseskostnad (CAC)</p>
                <p className="mt-0.5 text-[11.5px] text-[#a8a29a]">{cacSkjema.adresse}</p>
              </div>
              <button onClick={() => setCacSkjema(null)} className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-4 block">
              <span className={`mb-1 block ${ETIKETT}`}>Engangskostnad (kr) — markedsføring/salg for å vinne enheten</span>
              <input type="number" min="0" value={cacSkjema.cac} onChange={(e) => setCacSkjema((f) => ({ ...f, cac: e.target.value }))} placeholder="F.eks. 4500" autoFocus className="h-9 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 text-[13.5px] tabular-nums outline-none transition-all focus:border-[#8b5cf6]/40 focus:ring-2 focus:ring-[#8b5cf6]/10" data-testid="leieforhold-cac-input" />
            </label>
            <label className="mt-3 block">
              <span className={`mb-1 block ${ETIKETT}`}>Notat (valgfritt)</span>
              <input value={cacSkjema.notat} onChange={(e) => setCacSkjema((f) => ({ ...f, notat: e.target.value }))} placeholder="F.eks. Meta-annonser juli" className="h-9 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 text-[12.5px] outline-none transition-all focus:border-[#8b5cf6]/40 focus:ring-2 focus:ring-[#8b5cf6]/10" />
            </label>
            {Number(cacSkjema.cac) > 0 && (() => {
              const rad = rows.find((r) => radNokkel(r) === cacSkjema.enhetId);
              return rad?.fee_amount ? (
                <p className="mt-2 text-[11px] text-[#8a8278]">→ Payback: {(Number(cacSkjema.cac) / rad.fee_amount).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mnd med honorar {kr(rad.fee_amount)}/mnd</p>
              ) : null;
            })()}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setCacSkjema(null)} className="h-7 rounded-[7px] px-3 text-[12px] font-medium text-[#a8a29a] transition-colors hover:text-[#57534e]">Avbryt</button>
              <button onClick={lagreCac} disabled={lagrer} data-testid="leieforhold-cac-lagre" className={`${KNAPP_PRIMAER} disabled:opacity-40`}>
                <Check className="h-3.5 w-3.5" /> Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Filter-modal (flervalg — KPI-ene følger utvalget live) ═══ */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => setFilterOpen(false)}>
          <div className="dh-pop-inn flex max-h-[88vh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[14px] border border-black/[0.07] bg-white shadow-[0_24px_80px_rgba(28,25,23,0.22)] sm:rounded-[14px]" onClick={(e) => e.stopPropagation()} data-testid="leieforhold-filter-modal">
            <div className="flex items-center gap-2.5 border-b border-black/[0.05] px-5 py-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#8b5cf6]/15 bg-[#f5f1fd]"><SlidersHorizontal className="h-4 w-4 text-[#8b5cf6]" /></span>
              <div>
                <p className="text-[13.5px] font-semibold text-[#1c1917]" style={heading}>Filtrer porteføljen</p>
                <p className="text-[11px] text-[#a8a29a]">Flervalg — KPI-ene og eksporten følger utvalget</p>
              </div>
              <button onClick={() => setFilterOpen(false)} className="ml-auto flex h-7 w-7 items-center justify-center rounded-[7px] text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]" data-testid="leieforhold-filter-lukk"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Status */}
              <p className={ETIKETT}>Status</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[['leased', GRUPPE_LABEL.leased], ['future', GRUPPE_LABEL.future], ['signing', GRUPPE_LABEL.signing], ['advertised', GRUPPE_LABEL.advertised], ['vacant', GRUPPE_LABEL.vacant]].map(([k, l]) => {
                  const aktiv = filtre.status.includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggleFilter('status', k)}
                      data-testid={`leieforhold-filtermodal-status-${k}`}
                      className={`flex h-7 items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] font-medium transition-all ${aktiv ? 'border-transparent bg-[#1c1917] text-white' : 'border-black/[0.08] bg-white text-[#78716c] hover:bg-[#f7f6f3]'}`}
                    >
                      {aktiv && <Check className="h-3 w-3" />}
                      {l}
                      <span className={`tabular-nums text-[10px] ${aktiv ? 'text-white/50' : 'text-[#c2beb8]'}`}>{grupper[k] ?? 0}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inntektstype */}
              <p className={`mt-4 ${ETIKETT}`}>Inntektstype</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {INNTEKT_VALG.map(([k, l]) => {
                  const aktiv = filtre.inntekt.includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggleFilter('inntekt', k)}
                      className={`flex h-7 items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] font-medium transition-all ${aktiv ? 'border-transparent bg-[#1c1917] text-white' : 'border-black/[0.08] bg-white text-[#78716c] hover:bg-[#f7f6f3]'}`}
                    >
                      {aktiv && <Check className="h-3 w-3" />}
                      {l}
                      <span className={`tabular-nums text-[10px] ${aktiv ? 'text-white/50' : 'text-[#c2beb8]'}`}>{inntektAntall[k] ?? 0}</span>
                    </button>
                  );
                })}
              </div>

              {/* Boligtype */}
              {typeValg.length > 0 && (
                <>
                  <p className={`mt-4 ${ETIKETT}`}>Boligtype</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {typeValg.map(([t, antall]) => {
                      const aktiv = filtre.typer.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleFilter('typer', t)}
                          className={`flex h-7 items-center gap-1.5 rounded-[7px] border px-2.5 text-[12px] font-medium transition-all ${aktiv ? 'border-transparent bg-[#1c1917] text-white' : 'border-black/[0.08] bg-white text-[#78716c] hover:bg-[#f7f6f3]'}`}
                        >
                          {aktiv && <Check className="h-3 w-3" />}
                          {t}
                          <span className={`tabular-nums text-[10px] ${aktiv ? 'text-white/50' : 'text-[#c2beb8]'}`}>{antall}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Huseier */}
              {eierValg.length > 1 && (
                <>
                  <p className={`mt-4 ${ETIKETT}`}>Huseier</p>
                  <div className="mt-1.5 max-h-[168px] space-y-0.5 overflow-y-auto pr-1">
                    {eierValg.map(([e, antall]) => {
                      const aktiv = filtre.eiere.includes(e);
                      return (
                        <button
                          key={e}
                          onClick={() => toggleFilter('eiere', e)}
                          className={`flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12.5px] transition-colors ${aktiv ? 'bg-[#f5f1fd] font-medium text-[#6d28d9]' : 'text-[#57534e] hover:bg-[#f7f6f3]'}`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${aktiv ? 'border-[#6d28d9] bg-[#6d28d9]' : 'border-[#d8d4cd] bg-white'}`}>
                            {aktiv && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{e}</span>
                          <span className="shrink-0 tabular-nums text-[10px] text-[#c2beb8]">{antall}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-black/[0.05] bg-[#fbfaf8] px-5 py-3">
              <button
                onClick={nullstillFiltre}
                disabled={!antallFiltre}
                data-testid="leieforhold-filter-nullstill"
                className="flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[12px] font-medium text-[#a8a29a] transition-colors hover:text-[#57534e] disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" /> Nullstill
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                data-testid="leieforhold-filter-vis"
                className={`ml-auto ${KNAPP_PRIMAER} !px-4`}
              >
                Vis {filtrert.length} {filtrert.length === 1 ? 'enhet' : 'enheter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p ref={bunnTekstRef} className="mt-2.5 px-1 text-[11px] leading-relaxed text-[#b3ada3]">
        Leiegrunnlaget er huseiernes penger: Leie i dag (løpende) → Kommende (signert, ikke startet) → Pipeline (under signering + annonsert) → Ledig uten annonse (estimat). Honorar-trappen er DigiHomes inntekt eks. mva: i dag → sikret (m/signert) → m/annonsert → full utleie — trinn med ~ estimeres med porteføljens snittsats der sats ikke er avtalt. Selskapsøkonomien (faste kostnader, margin, break-even, CAC) ligger i Datarom → Oversikt. Excel-eksporten følger samme trapper og respekterer aktiv filtrering og scenario.
      </p>
    </div>
  );
}
