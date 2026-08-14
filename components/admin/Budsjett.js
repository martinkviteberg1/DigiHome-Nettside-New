'use client';

/* ═══════════════ Budsjett — årsbudsjett per kategori/måned ═══════════════
   Verdensklasse 2026:
   · Resultatgraf — budsjettet (myke søyler) mot faktisk (fargede søyler)
   · KPI-kort med delta-chips (faktisk vs. budsjett hittil i år)
   · Excel-følelse i rutenettet: piltast-/Enter-navigasjon mellom celler,
     formaterte tall når cellen ikke er i fokus, ⌘S / Ctrl+S lagrer
   · Inneværende måned markeres med en egen kolonnestripe
   · «Foreslå fra porteføljen»: driver-basert seeding fra Leieforhold
   · Faktiske tall automatisk fra Økonomi-motoren — aldri fabrikkert
   · readOnly: investor-/datarom-visning — kun lesing                        */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Target, Loader2, Save, Sparkles, ChevronLeft, ChevronRight, ChevronsRight,
  AlertTriangle, X, TrendingUp, Wallet, Flag, Check, BarChart3, Plus, Trash2,
  FileSpreadsheet, CopyPlus, StickyNote, MessageSquare, Lock, ChevronDown,
} from 'lucide-react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { cacheLes, cacheHent, cacheSlett } from '@/lib/klient-cache';
import BudsjettWizard from '@/components/admin/BudsjettWizard';
import BudsjettPlan from '@/components/admin/BudsjettPlan';

const heading = { fontFamily: 'var(--font-heading)' };
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
// Tusenskiller: nb-NO gir hardt mellomrom (U+00A0) som ser for bredt ut i
// display-fonter — vi bytter til smalt no-break space (U+202F), slik
// finansverktøy i verdensklasse gjør.
const medTynnSkiller = (s) => String(s).replace(/[\s\u00A0]/g, '\u202F');
const kr = (v) => `${medTynnSkiller(Math.round(v || 0).toLocaleString('nb-NO'))}\u202Fkr`;
const tall = (v) => medTynnSkiller(Math.round(v || 0).toLocaleString('nb-NO'));
const planYmLabel = (ym) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  return y && m ? `${MND[m - 1].toLowerCase()} ${String(y).slice(2)}` : ym;
};
const sum12 = (arr) => (arr || []).reduce((s, x) => s + (Number(x) || 0), 0);

function sumPerMnd(serier) {
  const ut = Array(12).fill(0);
  for (const arr of Object.values(serier || {})) for (let m = 0; m < 12; m++) ut[m] += Number(arr?.[m]) || 0;
  return ut;
}

/* Animert talloppgang — KPI-ene «teller» seg til ny verdi (respekterer redusert bevegelse). */
function TallAnim({ verdi, formater = kr }) {
  const [vist, setVist] = useState(verdi);
  const forrige = useRef(verdi);
  useEffect(() => {
    const fra = Number(forrige.current) || 0;
    const til = Number(verdi) || 0;
    forrige.current = til;
    if (fra === til) { setVist(til); return undefined; }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setVist(til); return undefined; }
    const t0 = performance.now();
    let raf;
    const stegg = (t) => {
      const p = Math.min(1, (t - t0) / 550);
      setVist(fra + (til - fra) * (1 - Math.pow(1 - p, 3))); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(stegg);
    };
    raf = requestAnimationFrame(stegg);
    return () => cancelAnimationFrame(raf);
  }, [verdi]);
  return <>{formater(Math.round(vist))}</>;
}

/* Avvikschip: inntekter → over budsjett er bra; kostnader → under budsjett er bra. */
function Avvik({ faktisk, budsjett, inverter = false }) {  if (faktisk == null) return <span className="text-[#c2beb8]">—</span>;
  const diff = faktisk - (budsjett || 0);
  if (Math.abs(diff) < 1) return <Check className="mx-auto h-3 w-3 text-emerald-500" />;
  const bra = inverter ? diff < 0 : diff > 0;
  return (
    <span className={`text-[10px] font-bold tabular-nums ${bra ? 'text-emerald-600' : 'text-rose-500'}`}>
      {diff > 0 ? '+' : '−'}{tall(Math.abs(diff))}
    </span>
  );
}

/* Graf-tooltip på norsk — kompakt kort i samme stil som resten av admin. */
function GrafTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const bud = payload.find((p) => p.dataKey === 'budsjett');
  const fak = payload.find((p) => p.dataKey === 'faktisk');
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-[0_10px_32px_rgba(0,0,0,0.12)]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">{label}</p>
      <p className="mt-1 text-[12px] tabular-nums text-[#777]">Budsjett <span className="font-bold text-[#6d28d9]">{kr(bud?.value)}</span></p>
      {fak?.value != null && <p className="text-[12px] tabular-nums text-[#777]">Faktisk <span className={`font-bold ${fak.value >= 0 ? 'text-[#1f7a45]' : 'text-rose-600'}`}>{kr(fak.value)}</span></p>}
    </div>
  );
}

export default function Budsjett({ apiKey, readOnly = false, investor = false }) {
  const iAar = new Date().getFullYear();
  const naaMnd = new Date().getMonth();
  const [year, setYear] = useState(iAar);
  const [data, setData] = useState(null);
  const [inntekter, setInntekter] = useState({});
  const [kostnader, setKostnader] = useState({});
  const [dirty, setDirty] = useState(false);
  const [laster, setLaster] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const [mode, setMode] = useState('budsjett');   // 'budsjett' | 'avvik'
  const [lagretNaa, setLagretNaa] = useState(false);
  const [fokusCelle, setFokusCelle] = useState(''); // 'inn|kat|m' — viser råtall kun der
  const [visSnarveier, setVisSnarveier] = useState(false); // «?»-oversikten
  const [mobilMnd, setMobilMnd] = useState(investor ? 0 : (iAar === year ? naaMnd : 0)); // mobil: én måned om gangen
  const [egnePoster, setEgnePoster] = useState([]); // brukerdefinerte budsjettlinjer
  const [notat, setNotat] = useState(''); // styrekommentar — lagres per år
  const [kommentarer, setKommentarer] = useState({}); // {'0'..'11': tekst} — månedskommentarer
  const [kopierer, setKopierer] = useState(false);
  // «Neste 12 mnd»: rullerende vindu over årsgrensen (visningslag — ingen
  // endring i datamodellen). neste = året etter inneværende, hentet ved behov.
  // Investorer lander rett i det rullerende vinduet: fremoverskuende NTM er
  // presentasjonsformatet deres — kalenderår beholdes som sekundærvalg.
  const [visning, setVisning] = useState(investor ? 'rullerende' : 'aar'); // 'aar' | 'rullerende'
  const [neste, setNeste] = useState({ lastet: false, finnes: false, inntekter: {}, kostnader: {}, egnePoster: [], kommentarer: {}, faktisk: null, honorarLaas: null });
  const [dirtyNeste, setDirtyNeste] = useState(false);
  const [kommentarModal, setKommentarModal] = useState(null); // {i, y, m, tekst} | null
  const [grafAkk, setGrafAkk] = useState(false); // graf: per måned ↔ akkumulert
  // «+ Ny post»-modal: navn, beløp og frekvens genererer 12-månedersserien
  const [nyPost, setNyPost] = useState(null); // null | {type,navn,belop,frekvens,fra,til,mapTil}

  // «Inntektsmodell» — sikret (auto) + antakelser (modell B)
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedLaster, setSeedLaster] = useState(false);
  const [seedFeil, setSeedFeil] = useState('');
  const [forslag, setForslag] = useState(null);
  const [drivere, setDrivere] = useState({ nye: '', churn: '', fyll: '', snittleie: '', honorarpct: '', oppstart: '' });
  const [seedKostnader, setSeedKostnader] = useState(true);

  // Budsjettveiviser + årsoversikt (intuitiv årsvelger med status per år)
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardAar, setWizardAar] = useState(null);
  const [aarListe, setAarListe] = useState([]);
  const [aarMenyOpen, setAarMenyOpen] = useState(false);
  const hentAarListe = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/budsjett/aar?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (r.ok && j.ok) setAarListe(j.aar || []);
    } catch (e) { /* stille — årsvelgeren viser da bare pilnavigasjon */ }
  }, [apiKey]);
  useEffect(() => { hentAarListe(); }, [hentAarListe]);
  useEffect(() => {
    if (!aarMenyOpen) return undefined;
    const lukk = () => setAarMenyOpen(false);
    window.addEventListener('click', lukk);
    return () => window.removeEventListener('click', lukk);
  }, [aarMenyOpen]);
  const aapneWizard = (aar) => { setWizardAar(aar || null); setAarMenyOpen(false); setWizardOpen(true); };

  // Frittstående budsjetter («planer»): fri periode + status — egen editor.
  // valgtPlan: null (årsvisning) | 'ny' (opprettelse) | plan-id (editor).
  const [planListe, setPlanListe] = useState([]);
  const [valgtPlan, setValgtPlan] = useState(null);
  const hentPlanListe = useCallback(async () => {
    if (readOnly) return;
    try {
      const r = await fetch(`/api/admin/budsjett/planer?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (r.ok && j.ok) setPlanListe(j.planer || []);
    } catch (e) { /* stille */ }
  }, [apiKey, readOnly]);
  useEffect(() => { hentPlanListe(); }, [hentPlanListe]);

  // Klient-cache (stale-while-revalidate): fanebytter rendres momentant fra
  // sist kjente data mens ferske tall hentes stille. dirtyRef vokter mot at
  // bakgrunnssvar klobrer pågående redigering.
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty || dirtyNeste; }, [dirty, dirtyNeste]);

  const hent = useCallback(async (y) => {
    const key = `bud:${y}`;
    const anvend = (j) => {
      setData(j);
      setInntekter(j.inntekter || {});
      setKostnader(j.kostnader || {});
      setEgnePoster(Array.isArray(j.egnePoster) ? j.egnePoster : []);
      setNotat(j.notat || '');
      setKommentarer(j.kommentarer || {});
      setDirty(false);
    };
    setFeil('');
    const cachet = cacheLes(key);
    if (cachet) { anvend(cachet); setLaster(false); } else setLaster(true);
    try {
      const j = await cacheHent(key, `/api/admin/budsjett?key=${encodeURIComponent(apiKey)}&year=${y}`, { force: true });
      if (!dirtyRef.current) anvend(j);
    } catch (e) {
      // Har vi cache å vise, feiler vi stille — ellers vis feilen som før.
      if (!cachet) { setFeil(e.message); setData(null); }
    }
    setLaster(false);
  }, [apiKey]);

  useEffect(() => { hent(year); }, [hent, year]);

  // Neste år (kun rullerende visning) — samme cache-mønster.
  const hentNeste = useCallback(async () => {
    const key = `bud:${iAar + 1}`;
    const anvend = (j) => {
      setNeste({ lastet: true, finnes: !!j.finnes, inntekter: j.inntekter || {}, kostnader: j.kostnader || {}, egnePoster: j.egnePoster || [], kommentarer: j.kommentarer || {}, faktisk: j.faktisk || null, honorarLaas: j.honorarLaas || null });
      setDirtyNeste(false);
    };
    const cachet = cacheLes(key);
    if (cachet) anvend(cachet);
    try {
      const j = await cacheHent(key, `/api/admin/budsjett?key=${encodeURIComponent(apiKey)}&year=${iAar + 1}`, { force: true });
      if (!dirtyRef.current) anvend(j);
    } catch (e) { if (!cachet) setFeil(e.message); }
  }, [apiKey, iAar]);

  // Investor starter i rullerende visning → neste år må hentes ved mount.
  useEffect(() => { if (investor) hentNeste(); }, [investor, hentNeste]);

  const byttVisning = (v) => {
    if (v === visning) return;
    if ((dirty || dirtyNeste) && !window.confirm('Du har ulagrede endringer — forkast dem?')) return;
    setVisning(v);
    setDirty(false); setDirtyNeste(false);
    if (v === 'rullerende') {
      if (year !== iAar) setYear(iAar); else hent(iAar);
      hentNeste();
      setMobilMnd(0); // vinduet starter på inneværende måned
    } else {
      hent(year);
      setMobilMnd(year === iAar ? naaMnd : 0);
    }
  };

  const byttAar = (y) => {
    if (dirty && !window.confirm('Du har ulagrede endringer — forkast dem?')) return;
    setYear(y);
    setMobilMnd(y === iAar ? naaMnd : 0);
  };

  // ── Vinduet: 12 kolonner. Kalenderår → jan–des i valgt år.
  //    Rullerende → inneværende måned og 11 frem (over årsgrensen).
  const erRull = visning === 'rullerende';
  const vindu = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    if (!erRull) return { y: year, m: i };
    const t = iAar * 12 + naaMnd + i;
    return { y: Math.floor(t / 12), m: t % 12 };
  }), [erRull, year, iAar, naaMnd]);
  const kolLabel = (i) => (erRull ? `${MND[vindu[i].m]} ${String(vindu[i].y).slice(2)}` : MND[i]);

  // Leser/skriver mot riktig årstilstand for kolonne i.
  // MODELLHALE (kun investor-visning): månedene etter nyttår uten lagret
  // budsjett fylles fra inntektsmodellen (modell24 fra API-et: kontraktsfestet
  // sikret-serie + årets lagrede antakelser — uten antakelser er halen ren
  // kontraktsfestet inntekt) og videreførte faste kostnader (desembernivået).
  // Admin ser fortsatt 0-kolonner med oppfordring om å legge neste års budsjett
  // — å injisere modelltall der ville risikert utilsiktet lagring.
  const modell24 = data?.modell24 || null;
  const HONORAR_RAD = 'Honorar (forvaltning)';
  const OPPSTART_RAD = 'Oppstartshonorar';
  const erModellKol = (i) => investor && erRull && !!modell24 && vindu[i].y === iAar + 1 && neste.lastet && !neste.finnes;
  const lesFast = (type, kat, i) => {
    if (erModellKol(i)) {
      const idx = 12 + vindu[i].m;
      if (type === 'inn') {
        if (kat === HONORAR_RAD) return Number(modell24.total?.[idx]) || 0;
        if (kat === OPPSTART_RAD) return Number(modell24.oppstart?.[idx]) || 0;
        return 0;
      }
      return Number(kostnader?.[kat]?.[11]) || 0; // videreført fra desember
    }
    const { y, m } = vindu[i];
    const kilde = y === year ? (type === 'inn' ? inntekter : kostnader) : (type === 'inn' ? neste.inntekter : neste.kostnader);
    return Number(kilde?.[kat]?.[m]) || 0;
  };
  const posterFor = (y) => (y === year ? egnePoster : (neste.egnePoster || []));
  const lesEgenSum = (type, i) => {
    const { y, m } = vindu[i];
    return posterFor(y).filter((p) => p.type === type).reduce((s, p) => s + (Number(p.verdier?.[m]) || 0), 0);
  };
  const faktiskFor = (y) => (y === year ? (data?.faktisk || null) : (neste.faktisk || null));

  const settAbs = (type, kat, y, m, nyVerdi) => {
    if (y === year) {
      const setter = type === 'inn' ? setInntekter : setKostnader;
      setter((prev) => {
        const arr = [...(prev[kat] || Array(12).fill(0))];
        arr[m] = nyVerdi;
        return { ...prev, [kat]: arr };
      });
      setDirty(true);
    } else {
      setNeste((prev) => {
        const felt = type === 'inn' ? 'inntekter' : 'kostnader';
        const arr = [...(prev[felt][kat] || Array(12).fill(0))];
        arr[m] = nyVerdi;
        return { ...prev, [felt]: { ...prev[felt], [kat]: arr } };
      });
      setDirtyNeste(true);
    }
  };

  const settCelle = (type, kat, i, verdi) => {
    if (readOnly) return;
    const { y, m } = vindu[i];
    const n = parseInt(String(verdi).replace(/[^\d]/g, ''), 10);
    settAbs(type, kat, y, m, Number.isFinite(n) ? n : 0);
  };

  /* ⌘Z-angring: én oppføring per redigeringsøkt (fanges ved fokus, pushes ved blur). */
  const angreStakk = useRef([]);
  const fokusStart = useRef(null);
  const merkFokus = (type, kat, i) => { fokusStart.current = { type, kat, ...vindu[i], verdi: lesFast(type, kat, i) }; };
  const merkBlur = (type, kat, i) => {
    const f = fokusStart.current;
    if (f && f.type === type && f.kat === kat && f.verdi !== lesFast(type, kat, i)) {
      angreStakk.current.push(f);
      if (angreStakk.current.length > 60) angreStakk.current.shift();
    }
    fokusStart.current = null;
  };
  const angre = useCallback(() => {
    const f = angreStakk.current.pop();
    if (f) settAbs(f.type, f.kat, f.y, f.m, f.verdi);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Mobil: sveip bytter måned; aktiv pille rulles inn i synsfeltet. */
  const svStart = useRef(null);
  useEffect(() => {
    document.querySelector(`[data-testid='budsjett-mobil-mnd-${mobilMnd}']`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [mobilMnd]);

  /* Lim inn fra Excel/Sheets: flere verdier (tab/linjeskift/semikolon) fyller mot høyre. */
  const lesLimVerdier = (e) => {
    const txt = e.clipboardData?.getData('text') || '';
    const biter = txt.trim().split(/[\t\r\n;]+/)
      .map((x) => x.replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.'))
      .filter((x) => x !== '' && x !== '-');
    return biter.length < 2 ? null : biter.map((b) => Math.max(0, Math.round(Number(b) || 0)));
  };
  const limInn = (e, type, kat, i) => {
    const verdier = lesLimVerdier(e);
    if (!verdier) return; // én verdi → vanlig liming i feltet
    e.preventDefault();
    verdier.slice(0, 12 - i).forEach((n, k) => {
      const idx = i + k;
      angreStakk.current.push({ type, kat, ...vindu[idx], verdi: lesFast(type, kat, idx) }); // angrbart per celle
      settCelle(type, kat, idx, String(n));
    });
  };
  const limInnEgen = (e, id, i) => {
    const verdier = lesLimVerdier(e);
    if (!verdier) return;
    e.preventDefault();
    verdier.slice(0, 12 - i).forEach((n, k) => settEgenCelle(id, i + k, String(n)));
  };

  // Fyll hele raden med første måned som har verdi — rask årsutfylling (kun kalenderår).
  const fyllRad = (type, kat) => {
    if (readOnly || erRull) return;
    const kilde = type === 'inn' ? inntekter : kostnader;
    const verdi = (kilde[kat] || []).find((x) => (Number(x) || 0) > 0) || 0;
    if (!verdi) return;
    const setter = type === 'inn' ? setInntekter : setKostnader;
    setter((prev) => ({ ...prev, [kat]: Array(12).fill(Math.round(verdi)) }));
    setDirty(true);
  };

  const lagre = useCallback(async () => {
    setLagrer(true); setFeil('');
    try {
      if (dirty || !erRull) {
        const r = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, inntekter, kostnader, egnePoster, kommentarer, notat }),
        });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke lagre');
        setData((d) => ({ ...d, updatedAt: j.updatedAt, updatedBy: j.updatedBy, finnes: true }));
      }
      // Rullerende: lagre også neste års dokument når det er endret.
      if (erRull && dirtyNeste) {
        const r2 = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: iAar + 1, inntekter: neste.inntekter, kostnader: neste.kostnader, egnePoster: neste.egnePoster, kommentarer: neste.kommentarer, notat: '' }),
        });
        const j2 = await r2.json();
        if (!r2.ok || !j2.ok) throw new Error(j2.error || `Kunne ikke lagre ${iAar + 1}`);
        setNeste((prev) => ({ ...prev, finnes: true }));
      }
      setDirty(false); setDirtyNeste(false);
      // Cache-invalidering: tøm og re-fyll stille slik at neste fanebesøk
      // rendrer momentant MED de nylagrede tallene (inkl. oppdatert modell24).
      cacheSlett('bud:');
      cacheHent(`bud:${year}`, `/api/admin/budsjett?key=${encodeURIComponent(apiKey)}&year=${year}`).catch(() => {});
      if (erRull) cacheHent(`bud:${iAar + 1}`, `/api/admin/budsjett?key=${encodeURIComponent(apiKey)}&year=${iAar + 1}`).catch(() => {});
      hentAarListe(); // årsvelgerens statuser (sum/låst) skal speile lagringen
      setLagretNaa(true); setTimeout(() => setLagretNaa(false), 2500);
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  }, [apiKey, year, inntekter, kostnader, egnePoster, kommentarer, notat, erRull, dirty, dirtyNeste, neste, iAar]);

  // ⌘S lagrer · ⌘Z angrer siste celleendring · «?» viser snarveier.
  useEffect(() => {
    const h = (e) => {
      const erFelt = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if ((dirty || dirtyNeste) && !readOnly && !lagrer) lagre();
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !erFelt) {
        e.preventDefault();
        if (!readOnly) angre();
      } else if (e.key === '?' && !erFelt) {
        e.preventDefault();
        setVisSnarveier((v) => !v);
      } else if (e.key === 'Escape') {
        setVisSnarveier(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dirty, dirtyNeste, readOnly, lagrer, lagre, angre]);

  const hentForslag = useCallback(async (d) => {
    setSeedLaster(true); setSeedFeil('');
    try {
      const qs = new URLSearchParams({ key: apiKey, year: String(year) });
      if (d.nye !== '') qs.set('nye', d.nye);
      if (d.churn !== '') qs.set('churn', d.churn);
      if (d.fyll !== '') qs.set('fyll', d.fyll);
      if (d.snittleie !== '') qs.set('snittleie', d.snittleie);
      if (d.honorarpct !== '') qs.set('honorarpct', d.honorarpct);
      if (d.oppstart !== '') qs.set('oppstart', d.oppstart);
      const r = await fetch(`/api/admin/budsjett/inntektsmodell?${qs}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke beregne inntektsmodellen');
      setForslag(j);
      setDrivere({
        nye: String(j.drivereBrukt.nyeEnheterPerMnd), churn: String(j.drivereBrukt.churnPctAar),
        fyll: String(j.drivereBrukt.fyllLedigPerMnd), snittleie: String(j.drivereBrukt.snittLeie),
        honorarpct: String(j.drivereBrukt.honorarPct), oppstart: String(j.drivereBrukt.oppstartPerEnhet),
      });
    } catch (e) { setSeedFeil(e.message); }
    setSeedLaster(false);
  }, [apiKey, year]);

  // Åpner modalen med årets lagrede antakelser som utgangspunkt.
  const aapneSeed = () => {
    setSeedOpen(true); setForslag(null);
    const a = data?.antakelser || {};
    hentForslag({
      nye: a.nyeEnheterPerMnd ? String(a.nyeEnheterPerMnd) : '',
      churn: a.churnPctAar ? String(a.churnPctAar) : '',
      fyll: a.fyllLedigPerMnd ? String(a.fyllLedigPerMnd) : '',
      snittleie: a.snittLeie != null ? String(a.snittLeie) : '',
      honorarpct: a.honorarPct != null ? String(a.honorarPct) : '',
      oppstart: a.oppstartPerEnhet ? String(a.oppstartPerEnhet) : '',
    });
  };

  // «Lås inntektsbudsjett»: fryser sikret + vekst inn i årsdokumentet og
  // speiler totalene inn i inntektsradene. Lagrer hele budsjettet samtidig.
  const laasInntekt = async () => {
    if (!forslag || seedLaster) return;
    setSeedLaster(true); setSeedFeil('');
    try {
      const r = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year, inntekter, kostnader: seedKostnader ? forslag.kostnader : kostnader,
          egnePoster, kommentarer, notat,
          antakelser: { nyeEnheterPerMnd: drivere.nye, churnPctAar: drivere.churn, fyllLedigPerMnd: drivere.fyll, snittLeie: drivere.snittleie, honorarPct: drivere.honorarpct, oppstartPerEnhet: drivere.oppstart },
          laasInntekt: true,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke låse inntektsbudsjettet');
      setSeedOpen(false);
      await hent(year);
    } catch (e) { setSeedFeil(e.message); }
    setSeedLaster(false);
  };

  const laasOppInntekt = async () => {
    if (!window.confirm('Låse opp inntektsbudsjettet? Tallene blir stående, men kan redigeres manuelt igjen.')) return;
    setSeedLaster(true); setSeedFeil('');
    try {
      const r = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, inntekter, kostnader, egnePoster, kommentarer, notat, laasOpp: true }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke låse opp');
      setSeedOpen(false);
      await hent(year);
    } catch (e) { setSeedFeil(e.message); }
    setSeedLaster(false);
  };

  const katInn = data?.kategorier?.inntekter || Object.keys(inntekter);
  const katKost = data?.kategorier?.kostnader || Object.keys(kostnader);
  const faktisk = data?.faktisk || { honorar: [], kostnaderPerKategori: {}, kostnaderSum: [], snapshotMnd: [] };
  const egneInn = egnePoster.filter((p) => p.type === 'inn');
  const egneKost = egnePoster.filter((p) => p.type === 'kost');

  // Inntektsmodellen (modell B): når året er låst styres honorar- og
  // oppstartsradene av modellen — cellene rendres skrivebeskyttet.
  const MODELL_RADER = ['Honorar (forvaltning)', 'Oppstartshonorar'];
  const laasFor = (y) => (y === year ? (data?.honorarLaas || null) : (neste.honorarLaas || null));
  const erLaastCelle = (type, kat, i) => type === 'inn' && MODELL_RADER.includes(kat) && !!laasFor(vindu[i].y);

  // Alle serier under er VINDU-baserte (12 kolonner): i kalenderår identisk
  // med månedene jan–des; i rullerende sydd sammen over årsgrensen.
  const budInn = vindu.map((_, i) => katInn.reduce((s, k) => s + lesFast('inn', k, i), 0) + lesEgenSum('inn', i));
  const budKost = vindu.map((_, i) => katKost.reduce((s, k) => s + lesFast('kost', k, i), 0) + lesEgenSum('kost', i));

  const fakInnV = vindu.map(({ y, m }) => { const f = faktiskFor(y); return f?.honorar?.[m] ?? null; });
  const fakKostV = vindu.map(({ y, m }) => { const f = faktiskFor(y); return f?.kostnaderSum?.[m] ?? null; });
  const fakKostKat = (kat, i) => { const { y, m } = vindu[i]; const f = faktiskFor(y); return f?.kostnaderPerKategori?.[kat]?.[m] ?? null; };
  const erSnapshot = (i) => { const { y, m } = vindu[i]; const f = faktiskFor(y); return !!f?.snapshotMnd?.[m]; };
  const lesKommentar = (i) => { const { y, m } = vindu[i]; const k = y === year ? kommentarer : (neste.kommentarer || {}); return k[String(m)] || ''; };
  const settKommentar = (i, tekst) => {
    const { y, m } = vindu[i];
    const t = tekst.trim().slice(0, 500);
    if (y === year) {
      setKommentarer((prev) => { const ny = { ...prev }; if (t) ny[String(m)] = t; else delete ny[String(m)]; return ny; });
      setDirty(true);
    } else {
      setNeste((prev) => { const ny = { ...prev.kommentarer }; if (t) ny[String(m)] = t; else delete ny[String(m)]; return { ...prev, kommentarer: ny }; });
      setDirtyNeste(true);
    }
  };
  const aapneKommentar = (i) => setKommentarModal({ i, tekst: lesKommentar(i) });

  // Egne poster koblet mot en Økonomi-kategori: budsjettet deres telles med i
  // avviket for den kategoriraden (ellers vises de kun i sum-radene).
  const mapTillegg = (type, kat, i) => { const { y, m } = vindu[i]; return posterFor(y).reduce((s, p) => s + (p.type === type && p.mapTil === kat ? (Number(p.verdier?.[m]) || 0) : 0), 0); };
  const budRes12 = vindu.map((_, i) => budInn[i] - budKost[i]);
  const fakRes12 = vindu.map((_, i) => (fakInnV[i] != null ? fakInnV[i] - (fakKostV[i] || 0) : null));

  const kpi = useMemo(() => {
    let fInn = 0, fKost = 0, bInnYtd = 0, bKostYtd = 0, aarsslutt = 0, kjenteMnd = 0;
    for (let i = 0; i < 12; i++) {
      const bi = budInn[i], bk = budKost[i];
      if (fakInnV[i] != null) {
        kjenteMnd++;
        fInn += fakInnV[i]; fKost += fakKostV[i] || 0;
        bInnYtd += bi; bKostYtd += bk;
        aarsslutt += (fakInnV[i] - (fakKostV[i] || 0));
      } else {
        aarsslutt += (bi - bk);
      }
    }
    const budRes = sum12(budInn) - sum12(budKost);
    return { fInn, fKost, bInnYtd, bKostYtd, budInnAar: sum12(budInn), budKostAar: sum12(budKost), budRes, aarsslutt, kjenteMnd, harFaktisk: kjenteMnd > 0 };
  }, [budInn, budKost, fakInnV, fakKostV]); // eslint-disable-line react-hooks/exhaustive-deps

  // Investor-NTM: hvor mye av vinduets inntekt som allerede er kontraktsfestet
  // (sikret-serien = signerte leiekontrakter, faset inn/ut på faktiske datoer),
  // og exit run-rate (inntektsnivået i siste vindusmåned × 12 — nivået
  // selskapet forlater perioden på). modell24-indeks: vinduskolonne i = naaMnd+i.
  const sikretVindu = useMemo(() => {
    if (!erRull || !modell24) return null;
    let s = 0;
    for (let i = 0; i < 12; i++) s += Number(modell24.sikret?.[naaMnd + i]) || 0;
    return s;
  }, [erRull, modell24, naaMnd]);
  const kontraktsfestetPct = (sikretVindu != null && kpi.budInnAar > 0)
    ? Math.min(100, Math.round((sikretVindu / kpi.budInnAar) * 100)) : null;
  const exitRunRate = (Number(budInn[11]) || 0) * 12;

  // Graf: per måned eller akkumulert (løpende sum — viser trend mot planen).
  const grafData = useMemo(() => {
    if (!grafAkk) return vindu.map((_, i) => ({ label: kolLabel(i), budsjett: budRes12[i], faktisk: fakRes12[i] }));
    let ab = 0, af = 0, kjent = true;
    return vindu.map((_, i) => {
      ab += budRes12[i];
      if (fakRes12[i] == null) kjent = false; else af += fakRes12[i];
      return { label: kolLabel(i), budsjett: ab, faktisk: kjent ? af : null };
    });
  }, [grafAkk, budRes12, fakRes12, vindu]); // eslint-disable-line react-hooks/exhaustive-deps
  const harGrafTall = budRes12.some((x) => x !== 0) || fakRes12.some((x) => x != null && x !== 0);
  const erNaa = (i) => vindu[i].y === iAar && vindu[i].m === naaMnd;

  // Radindeks for piltast-navigasjon (alle redigerbare rader i visningsrekkefølge).
  const radIndeks = useMemo(() => {
    const map = {};
    let i = 0;
    for (const k of katInn) map[`inn|${k}`] = i++;
    for (const p of egnePoster.filter((x) => x.type === 'inn')) map[`egen|${p.id}`] = i++;
    for (const k of katKost) map[`kost|${k}`] = i++;
    for (const p of egnePoster.filter((x) => x.type === 'kost')) map[`egen|${p.id}`] = i++;
    return map;
  }, [katInn, katKost, egnePoster]);

  /* ── Egne poster: opprett/endre/slett ── */

  const settEgenCelle = (id, m, verdi) => {
    if (readOnly) return;
    const n = parseInt(String(verdi).replace(/[^\d]/g, ''), 10);
    setEgnePoster((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const verdier = [...(p.verdier || Array(12).fill(0))];
      verdier[m] = Number.isFinite(n) ? n : 0;
      return { ...p, verdier };
    }));
    setDirty(true);
  };

  const omdopEgen = (id, navn) => {
    setEgnePoster((prev) => prev.map((p) => (p.id === id ? { ...p, navn: navn.slice(0, 60) } : p)));
    setDirty(true);
  };

  const slettEgen = (id) => {
    setEgnePoster((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  };

  // Frekvens → 12-månedersserie. «Årlig» = ett beløp i valgt måned (samme som
  // engangs innenfor ett år, men beholdes som metadata for neste års budsjett).
  const byggVerdier = ({ belop, frekvens, fra, til }) => {
    const v = Array(12).fill(0);
    const b = Math.round(Number(String(belop).replace(/[^\d]/g, '')) || 0);
    const f = Math.min(11, Math.max(0, fra));
    const t = Math.min(11, Math.max(f, til));
    if (frekvens === 'engangs' || frekvens === 'arlig') v[f] = b;
    else if (frekvens === 'manedlig') { for (let m = f; m <= t; m++) v[m] = b; }
    else if (frekvens === 'kvartalsvis') { for (let m = f; m <= t; m += 3) v[m] = b; }
    return v;
  };

  const aapneNyPost = (type) => setNyPost({
    type, navn: '', belop: '', frekvens: 'manedlig',
    fra: year === iAar ? naaMnd : 0, til: 11, mapTil: '',
  });

  const leggTilPost = () => {
    if (!nyPost || !nyPost.navn.trim()) return;
    const post = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: nyPost.type,
      navn: nyPost.navn.trim().slice(0, 60),
      frekvens: nyPost.frekvens,
      mapTil: nyPost.mapTil || null,
      verdier: byggVerdier(nyPost),
    };
    setEgnePoster((prev) => [...prev, post]);
    setDirty(true);
    setNyPost(null);
  };

  // Kopier et annet års budsjett inn som utgangspunkt (egne poster får nye id-er).
  const kopierFraAar = async (fraAar) => {
    setKopierer(true); setFeil('');
    try {
      const r = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}&year=${fraAar}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `Kunne ikke hente ${fraAar}`);
      if (!j.finnes) throw new Error(`Det finnes ikke noe lagret budsjett for ${fraAar}`);
      setInntekter(j.inntekter || {});
      setKostnader(j.kostnader || {});
      setEgnePoster((j.egnePoster || []).map((p) => ({ ...p, id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` })));
      setNotat(j.notat || '');
      setDirty(true);
    } catch (e) { setFeil(e.message); }
    setKopierer(false);
  };

  const tastNav = (e, r, c) => {
    const gaa = (nr, nc) => {
      if (nc < 0 || nc > 11) return;
      const el = document.querySelector(`[data-testid='budsjett-tabell'] input[data-r='${nr}'][data-c='${nc}']`);
      if (el) { e.preventDefault(); el.focus(); try { el.select(); } catch (_) {} }
    };
    if (e.key === 'ArrowUp') gaa(r - 1, c);
    else if (e.key === 'ArrowDown' || e.key === 'Enter') gaa(r + 1, c);
    else if (e.key === 'ArrowLeft' && (e.target.selectionStart ?? 0) === 0) gaa(r, c - 1);
    else if (e.key === 'ArrowRight' && (e.target.selectionStart ?? 0) >= String(e.target.value).length) gaa(r, c + 1);
  };

  /* ── Rendrere (funksjoner, IKKE inline-komponenter — bevarer input-fokus) ── */

  // Krysshev: kolonnen til cellen i fokus tones svakt (Linear-følelse).
  const fokusKol = fokusCelle ? Number(fokusCelle.split('|')[2]) : -1;

  const rCelle = (type, kat, m) => {
    const v = lesFast(type, kat, m); // m = kolonneindeks i vinduet
    const naaBg = erNaa(m) ? 'bg-[#f8f5ff]' : fokusKol === m ? 'bg-[#faf8ff]' : '';
    if (mode === 'avvik') {
      const f = type === 'inn'
        ? (kat === katInn[0] ? fakInnV[m] : null)
        : fakKostKat(kat, m);
      const budMedMap = v + mapTillegg(type, kat, m); // koblede egne poster teller med
      return (
        <td key={m} className={`px-1 py-1.5 text-right ${naaBg}`}>
          <div className="text-[12px] tabular-nums text-[#333]">{f != null ? tall(f) : <span className="text-[#d8d4ce]">{v ? tall(v) : '—'}</span>}</div>
          <div className="h-[13px] leading-[13px]"><Avvik faktisk={f} budsjett={budMedMap} inverter={type === 'kost'} /></div>
        </td>
      );
    }
    if (erLaastCelle(type, kat, m)) {
      return (
        <td key={m} className={`px-2 py-2 text-right text-[12px] tabular-nums text-[#6d28d9] ${naaBg}`} title="Styrt av inntektsmodellen (sikret + antakelser) — endre antakelsene og lås på nytt">
          {v ? tall(v) : <span className="text-[#d8d4ce]">·</span>}
        </td>
      );
    }
    if (readOnly) {
      return <td key={m} className={`px-2 py-2 text-right text-[12px] tabular-nums text-[#333] ${naaBg}`}>{v ? tall(v) : <span className="text-[#d8d4ce]">·</span>}</td>;
    }
    const id = `${type}|${kat}|${m}`;
    const iFokus = fokusCelle === id;
    const r = radIndeks[`${type}|${kat}`];
    return (
      <td key={m} className={`p-0.5 ${naaBg}`}>
        <input
          value={iFokus ? (v ? String(v) : '') : (v ? tall(v) : '')}
          onChange={(e) => settCelle(type, kat, m, e.target.value)}
          onFocus={(e) => { setFokusCelle(id); merkFokus(type, kat, m); try { e.target.select(); } catch (_) {} }}
          onBlur={() => { setFokusCelle(''); merkBlur(type, kat, m); }}
          onPaste={(e) => limInn(e, type, kat, m)}
          onKeyDown={(e) => tastNav(e, r, m)}
          placeholder="0"
          inputMode="numeric"
          data-r={r}
          data-c={m}
          data-testid={`budsjett-celle-${type}-${kat.replace(/[^a-zA-Z]/g, '')}-${m}`}
          className="h-8 w-full min-w-[64px] rounded-md border border-transparent bg-transparent px-1.5 text-right text-[12px] tabular-nums text-[#1a1a1a] outline-none transition-all placeholder:text-[#e0dcd6] hover:border-black/[0.07] hover:bg-white focus:border-[#8b5cf6]/45 focus:bg-white focus:shadow-[0_2px_12px_rgba(139,92,246,0.10)] focus:ring-2 focus:ring-[#8b5cf6]/12"
        />
      </td>
    );
  };

  const rRad = (type, kat) => {
    const s = vindu.reduce((acc, _, i) => acc + lesFast(type, kat, i), 0);
    const radIFokus = fokusCelle.startsWith(`${type}|${kat}|`);
    const radLaast = type === 'inn' && MODELL_RADER.includes(kat) && !!(laasFor(year) || (erRull && laasFor(iAar + 1)));
    return (
      <tr key={`${type}-${kat}`} className="group border-b border-black/[0.03] last:border-b-0 hover:bg-[#fbfaf8]">
        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 group-hover:bg-[#fbfaf8]">
          <div className="flex items-center gap-1.5">
            <span className={`truncate text-[12.5px] transition-colors ${radIFokus ? 'font-medium text-[#6d28d9]' : 'text-[#444]'}`}>{kat}</span>
            {radLaast && <Lock className="h-3 w-3 shrink-0 text-[#8b5cf6]/70" title="Låst av inntektsmodellen — endre antakelsene og lås på nytt" />}
            {!readOnly && mode === 'budsjett' && !erRull && !radLaast && (
              <button
                onClick={() => fyllRad(type, kat)}
                title="Fyll hele raden med første utfylte månedsverdi"
                className="rounded p-0.5 text-[#d0ccc5] opacity-0 transition-all hover:bg-[#f4f0fb] hover:text-[#8b5cf6] group-hover:opacity-100"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
        {MND.map((_, m) => rCelle(type, kat, m))}
        <td className="px-3 py-1.5 text-right text-[12px] font-semibold tabular-nums text-[#1a1a1a]">{s ? tall(s) : <span className="text-[#d8d4ce]">·</span>}</td>
      </tr>
    );
  };

  /* Dekomponering av låst honorar-rad: herav sikret (plattform) + vekst (antakelser). */
  const rLaasDelt = () => ['sikret', 'vekst'].map((slag) => {
    const serie = data?.honorarLaas?.[slag] || [];
    const s = serie.reduce((a, x) => a + (Number(x) || 0), 0);
    return (
      <tr key={`laas-${slag}`} className="border-b border-black/[0.03] bg-[#fcfbfe]" data-testid={`budsjett-laas-${slag}`}>
        <td className="sticky left-0 z-10 bg-[#fcfbfe] px-3 py-1">
          <span className="flex items-center gap-1.5 pl-3.5 text-[11px] text-[#a49eb2]">
            <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${slag === 'sikret' ? 'bg-[#0a0a0a]/70' : 'bg-[#8b5cf6]/60'}`} />
            {slag === 'sikret' ? 'herav sikret — kontraktsfestet fra plattformen' : 'herav vekst — antakelser (nye · utfylling · churn)'}
          </span>
        </td>
        {MND.map((_, m) => (
          <td key={m} className={`px-2 py-1 text-right text-[11px] tabular-nums ${(Number(serie[m]) || 0) < 0 ? 'text-rose-400' : 'text-[#a49eb2]'} ${erNaa(m) ? 'bg-[#f8f5ff]' : ''}`}>
            {serie[m] ? tall(serie[m]) : <span className="text-[#e4e1db]">·</span>}
          </td>
        ))}
        <td className="px-3 py-1 text-right text-[11px] font-medium tabular-nums text-[#a49eb2]">{s ? tall(s) : '·'}</td>
      </tr>
    );
  });

  /* Egen post-rad: inline-omdøping, frekvens-/koblings-chip og sletting. */
  const rEgenRad = (p) => {
    const s = sum12(p.verdier);
    const r = radIndeks[`egen|${p.id}`];
    const frekvensLabel = { engangs: 'engangs', manedlig: 'mnd', kvartalsvis: 'kvartal', arlig: 'årlig' }[p.frekvens] || '';
    return (
      <tr key={p.id} className="group border-b border-black/[0.03] last:border-b-0 hover:bg-[#fbfaf8]" data-testid={`budsjett-egen-rad-${p.id}`}>
        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 group-hover:bg-[#fbfaf8]">
          <div className="flex items-center gap-1.5">
            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#8b5cf6]/50" title="Egen post" />
            {readOnly ? (
              <span className="truncate text-[12.5px] text-[#444]">{p.navn}</span>
            ) : (
              <input
                value={p.navn}
                onChange={(e) => omdopEgen(p.id, e.target.value)}
                className="w-full min-w-0 bg-transparent text-[12.5px] text-[#444] outline-none placeholder:text-[#d8d4ce] focus:text-[#111]"
                placeholder="Navn på post"
              />
            )}
            <span className="shrink-0 rounded bg-[#f3f2f0] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-[#a3a3a3]">{frekvensLabel}</span>
            {p.mapTil && <span className="hidden shrink-0 rounded bg-[#f4f0fb] px-1 py-px text-[9px] font-bold text-[#8b5cf6] xl:inline" title={`Avviket telles mot ${p.mapTil}`}>→ {p.mapTil}</span>}
            {!readOnly && mode === 'budsjett' && (
              <button
                onClick={() => { if (window.confirm(`Slette posten «${p.navn}»?`)) slettEgen(p.id); }}
                title="Slett posten"
                data-testid={`budsjett-egen-slett-${p.id}`}
                className="shrink-0 rounded p-0.5 text-[#d0ccc5] opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
        {MND.map((_, m) => {
          const v = Number(p.verdier?.[m]) || 0;
          const naaBg = erNaa(m) ? 'bg-[#f8f5ff]' : fokusKol === m ? 'bg-[#faf8ff]' : '';
          if (mode === 'avvik') {
            return (
              <td key={m} className={`px-1 py-1.5 text-right ${naaBg}`}>
                <div className="text-[12px] tabular-nums text-[#b5b0a8]">{v ? tall(v) : '—'}</div>
                <div className="h-[13px] leading-[13px] text-[10px] text-[#d8d4ce]" title={p.mapTil ? `Inngår i avviket for ${p.mapTil}` : 'Ingen automatiske faktiske tall — telles i sum-radene'}>{v ? (p.mapTil ? '↦' : '·') : ''}</div>
              </td>
            );
          }
          if (readOnly) {
            return <td key={m} className={`px-2 py-2 text-right text-[12px] tabular-nums text-[#333] ${naaBg}`}>{v ? tall(v) : <span className="text-[#d8d4ce]">·</span>}</td>;
          }
          const id = `egen|${p.id}|${m}`;
          const iFokus = fokusCelle === id;
          return (
            <td key={m} className={`p-0.5 ${naaBg}`}>
              <input
                value={iFokus ? (v ? String(v) : '') : (v ? tall(v) : '')}
                onChange={(e) => settEgenCelle(p.id, m, e.target.value)}
                onFocus={(e) => { setFokusCelle(id); try { e.target.select(); } catch (_) {} }}
                onBlur={() => setFokusCelle('')}
                onPaste={(e) => limInnEgen(e, p.id, m)}
                onKeyDown={(e) => tastNav(e, r, m)}
                placeholder="0"
                inputMode="numeric"
                data-r={r}
                data-c={m}
                data-testid={`budsjett-egen-celle-${p.id}-${m}`}
                className="h-8 w-full min-w-[64px] rounded-md border border-transparent bg-transparent px-1.5 text-right text-[12px] tabular-nums text-[#1a1a1a] outline-none transition-all placeholder:text-[#e0dcd6] hover:border-black/[0.07] hover:bg-white focus:border-[#8b5cf6]/45 focus:bg-white focus:shadow-[0_2px_12px_rgba(139,92,246,0.10)] focus:ring-2 focus:ring-[#8b5cf6]/12"
              />
            </td>
          );
        })}
        <td className="px-3 py-1.5 text-right text-[12px] font-semibold tabular-nums text-[#1a1a1a]">{s ? tall(s) : <span className="text-[#d8d4ce]">·</span>}</td>
      </tr>
    );
  };

  /* «+ Ny post»-rad nederst i hver seksjon (kun admin i budsjett-modus). */
  const rNyPostRad = (type) => (
    <tr key={`ny-${type}`} className="border-b border-black/[0.03]">
      <td colSpan={14} className="px-3 py-1">
        <button
          onClick={() => aapneNyPost(type)}
          data-testid={`budsjett-ny-post-${type}`}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] font-semibold text-[#c2beb8] transition-all hover:bg-[#f4f0fb] hover:text-[#8b5cf6]"
        >
          <Plus className="h-3.5 w-3.5" /> Ny post
        </button>
      </td>
    </tr>
  );

  const rSumRad = (label, serie, faktiskSerie, { negativRod = false, inverter = false } = {}) => (
    <tr key={`sum-${label}`} className="border-b border-black/[0.06] bg-[#fafaf8]">
      <td className="sticky left-0 z-10 bg-[#fafaf8] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.07em] text-[#888]">{label}</td>
      {MND.map((_, m) => {
        const v = serie[m];
        const naaBg = erNaa(m) ? 'bg-[#f4eefe]' : '';
        if (mode === 'avvik') {
          const f = faktiskSerie ? faktiskSerie[m] : null;
          return (
            <td key={m} className={`px-1 py-1.5 text-right ${naaBg}`}>
              <div className={`text-[12px] font-bold tabular-nums ${f != null && negativRod && f < 0 ? 'text-rose-600' : 'text-[#1a1a1a]'}`}>{f != null ? tall(f) : <span className="text-[#d8d4ce]">{tall(v)}</span>}</div>
              <div className="h-[13px] leading-[13px]"><Avvik faktisk={f} budsjett={v} inverter={inverter} /></div>
            </td>
          );
        }
        return <td key={m} className={`px-2 py-2 text-right text-[12px] font-bold tabular-nums ${naaBg} ${negativRod && v < 0 ? 'text-rose-600' : 'text-[#1a1a1a]'}`}>{tall(v)}</td>;
      })}
      <td className={`px-3 py-2 text-right text-[12.5px] font-bold tabular-nums ${negativRod && sum12(serie) < 0 ? 'text-rose-600' : 'text-[#0a0a0a]'}`}>{tall(sum12(serie))}</td>
    </tr>
  );

  const rSeksjon = (label, farge, bg, aarsSum) => (
    <tr key={`seksjon-${label}`}>
      <td colSpan={14} className="px-3 py-1.5" style={{ background: bg }}>
        <div className="flex items-baseline justify-between">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: farge }}>{label}</span>
          <span className="whitespace-nowrap text-[10.5px] font-bold tabular-nums" style={{ color: farge }}>{kr(aarsSum)}/{erRull ? '12\u202Fmnd' : 'år'}</span>
        </div>
      </td>
    </tr>
  );

  /* Rullerende: egne poster aggregeres til én lesbar linje per seksjon
     (redigeres i kalenderårsvisningen der hver post har sin egen rad). */
  const rEgenAggRad = (type) => {
    const serie = vindu.map((_, i) => lesEgenSum(type, i));
    if (!serie.some((x) => x > 0)) return null;
    return (
      <tr key={`egen-agg-${type}`} className="border-b border-black/[0.03] hover:bg-[#fbfaf8]" data-testid={`budsjett-egen-agg-${type}`}>
        <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
          <div className="flex items-center gap-1.5" title="Aggregert — rediger enkeltposter i kalenderårsvisningen">
            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#8b5cf6]/50" />
            <span className="truncate text-[12.5px] italic text-[#8a8278]">Egne poster</span>
          </div>
        </td>
        {serie.map((v, i) => (
          <td key={i} className={`px-2 py-2 text-right text-[12px] tabular-nums text-[#8a8278] ${erNaa(i) ? 'bg-[#f8f5ff]' : ''}`}>{v ? tall(v) : <span className="text-[#d8d4ce]">·</span>}</td>
        ))}
        <td className="px-3 py-1.5 text-right text-[12px] font-semibold tabular-nums text-[#8a8278]">{tall(serie.reduce((s, x) => s + x, 0))}</td>
      </tr>
    );
  };

  /* ── Mobil: én måned om gangen — Linear-følelse på små skjermer ── */

  const rMobilRad = (type, kat) => {
    const v = lesFast(type, kat, mobilMnd); // mobilMnd = kolonneindeks i vinduet
    if (mode === 'avvik') {
      const f = type === 'inn'
        ? (kat === katInn[0] ? fakInnV[mobilMnd] : null)
        : fakKostKat(kat, mobilMnd);
      return (
        <div key={kat} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="min-w-0 truncate text-[13px] text-[#444]">{kat}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold tabular-nums text-[#1a1a1a]">{f != null ? tall(f) : <span className="text-[#d8d4ce]">{v ? tall(v) : '—'}</span>}</span>
            <span className="w-[54px] text-right"><Avvik faktisk={f} budsjett={v} inverter={type === 'kost'} /></span>
          </span>
        </div>
      );
    }
    if (erLaastCelle(type, kat, mobilMnd)) {
      return (
        <div key={kat} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-[#444]">{kat} <Lock className="h-3 w-3 shrink-0 text-[#8b5cf6]/70" /></span>
          <span className="text-[13px] font-semibold tabular-nums text-[#6d28d9]">{v ? tall(v) : <span className="text-[#d8d4ce]">·</span>}</span>
        </div>
      );
    }
    if (readOnly) {
      return (
        <div key={kat} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="min-w-0 truncate text-[13px] text-[#444]">{kat}</span>
          <span className="text-[13px] font-semibold tabular-nums text-[#1a1a1a]">{v ? tall(v) : <span className="text-[#d8d4ce]">·</span>}</span>
        </div>
      );
    }
    const id = `${type}|${kat}|mobil`;
    const iFokus = fokusCelle === id;
    return (
      <div key={kat} className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="min-w-0 truncate text-[13px] text-[#444]">{kat}</span>
        <input
          value={iFokus ? (v ? String(v) : '') : (v ? tall(v) : '')}
          onChange={(e) => settCelle(type, kat, mobilMnd, e.target.value)}
          onFocus={(e) => { setFokusCelle(id); try { e.target.select(); } catch (_) {} }}
          onBlur={() => setFokusCelle('')}
          placeholder="0"
          inputMode="numeric"
          data-testid={`budsjett-mobil-${type}-${kat.replace(/[^a-zA-Z]/g, '')}`}
          className="h-9 w-[118px] shrink-0 rounded-lg border border-black/[0.07] bg-white px-2.5 text-right text-[15px] tabular-nums text-[#1a1a1a] outline-none transition-all placeholder:text-[#e0dcd6] focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12"
        />
      </div>
    );
  };

  /* Egen post på mobil: verdi for valgt måned + slett. */
  const rEgenMobilRad = (p) => {
    const v = Number(p.verdier?.[mobilMnd]) || 0;
    if (mode === 'avvik' || readOnly) {
      return (
        <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#8b5cf6]/50" />
            <span className="truncate text-[13px] text-[#444]">{p.navn}</span>
          </span>
          <span className="flex items-baseline gap-2">
            <span className={`text-[13px] font-semibold tabular-nums ${mode === 'avvik' ? 'text-[#b5b0a8]' : 'text-[#1a1a1a]'}`}>{v ? tall(v) : mode === 'avvik' ? '—' : <span className="text-[#d8d4ce]">·</span>}</span>
            {mode === 'avvik' && <span className="w-[54px] text-right text-[10px] text-[#d8d4ce]">{v && p.mapTil ? '↦' : ''}</span>}
          </span>
        </div>
      );
    }
    const id = `egen|${p.id}|mobil`;
    const iFokus = fokusCelle === id;
    return (
      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#8b5cf6]/50" />
          <span className="truncate text-[13px] text-[#444]">{p.navn}</span>
          <button
            onClick={() => { if (window.confirm(`Slette posten «${p.navn}»?`)) slettEgen(p.id); }}
            className="shrink-0 rounded p-0.5 text-[#d8d4ce] active:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
        <input
          value={iFokus ? (v ? String(v) : '') : (v ? tall(v) : '')}
          onChange={(e) => settEgenCelle(p.id, mobilMnd, e.target.value)}
          onFocus={(e) => { setFokusCelle(id); try { e.target.select(); } catch (_) {} }}
          onBlur={() => setFokusCelle('')}
          placeholder="0"
          inputMode="numeric"
          data-testid={`budsjett-egen-mobil-${p.id}`}
          className="h-9 w-[118px] shrink-0 rounded-lg border border-black/[0.07] bg-white px-2.5 text-right text-[15px] tabular-nums text-[#1a1a1a] outline-none transition-all placeholder:text-[#e0dcd6] focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12"
        />
      </div>
    );
  };

  /* Rullerende (mobil): egne poster som én aggregert linje for valgt måned. */
  const rEgenMobilAgg = (type) => {
    const v = lesEgenSum(type, mobilMnd);
    if (!v) return null;
    return (
      <div key={`egen-agg-${type}`} className="flex items-center justify-between gap-3 px-4 py-2.5" data-testid={`budsjett-egen-mobilagg-${type}`}>
        <span className="flex min-w-0 items-center gap-1.5" title="Aggregert — rediger enkeltposter i kalenderårsvisningen">
          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#8b5cf6]/50" />
          <span className="truncate text-[13px] italic text-[#8a8278]">Egne poster</span>
        </span>
        <span className="text-[13px] font-semibold tabular-nums text-[#8a8278]">{tall(v)}</span>
      </div>
    );
  };

  const rMobilSum = (label, serie, faktiskSerie, { negativRod = false, inverter = false } = {}) => {    const v = serie[mobilMnd];
    const f = faktiskSerie ? faktiskSerie[mobilMnd] : null;
    return (
      <div className="flex items-center justify-between gap-3 bg-[#fafaf8] px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#888]">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className={`text-[14px] font-bold tabular-nums ${negativRod && (mode === 'avvik' && f != null ? f : v) < 0 ? 'text-rose-600' : 'text-[#0a0a0a]'}`}>
            {mode === 'avvik' && f != null ? tall(f) : tall(v)}
          </span>
          {mode === 'avvik' && <span className="w-[54px] text-right"><Avvik faktisk={f} budsjett={v} inverter={inverter} /></span>}
        </span>
      </div>
    );
  };

  // Frittstående budsjett valgt → egen fokusert editor (alle hooks er kjørt over).
  if (valgtPlan !== null) {
    return (
      <div className="mx-auto max-w-[1280px]" data-testid="budsjett-modul">
        <BudsjettPlan
          apiKey={apiKey}
          planId={valgtPlan === 'ny' ? null : valgtPlan}
          onLukk={(id) => setValgtPlan(id ?? null)}
          onEndret={hentPlanListe}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px]" data-testid="budsjett-modul">
      {/* Topplinje: år + visning + handlinger */}
      <div className="flex flex-wrap items-center gap-2">
        {erRull ? (
          <div className="flex h-9 items-center rounded-full bg-white px-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <span className="text-[13px] font-bold tabular-nums text-[#0a0a0a]" style={heading} data-testid="budsjett-vindu-label">{kolLabel(0)} → {kolLabel(11)}</span>
          </div>
        ) : (
          <div className="flex h-9 items-center rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <button onClick={() => byttAar(year - 1)} data-testid="budsjett-aar-forrige" className="flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9]"><ChevronLeft className="h-4 w-4" /></button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setAarMenyOpen((o) => !o); }}
                data-testid="budsjett-aar"
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[13.5px] font-bold tabular-nums text-[#0a0a0a] transition-colors hover:bg-[#f4f0fb]"
                style={heading}
                title="Se alle budsjettår"
              >
                {year} <ChevronDown className={`h-3 w-3 text-[#b5b5b5] transition-transform ${aarMenyOpen ? 'rotate-180' : ''}`} />
              </button>
              {aarMenyOpen && (
                <div className="absolute left-1/2 top-full z-40 mt-2 w-[248px] -translate-x-1/2 rounded-xl border border-black/[0.06] bg-white p-1.5 shadow-[0_14px_44px_rgba(0,0,0,0.14)]" data-testid="budsjett-aar-meny" onClick={(e) => e.stopPropagation()}>
                  {Array.from(new Set([...aarListe.map((a) => a.year), iAar, iAar + 1])).sort().map((y) => {
                    const eks = aarListe.find((a) => a.year === y);
                    return (
                      <button
                        key={y}
                        onClick={() => { setAarMenyOpen(false); byttAar(y); }}
                        data-testid={`budsjett-aar-valg-${y}`}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${y === year ? 'bg-[#f4f0fb]' : 'hover:bg-[#fafaf8]'}`}
                      >
                        <span className="text-[13px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{y}</span>
                        {eks?.laast && <Lock className="h-3 w-3 shrink-0 text-[#8b5cf6]" />}
                        <span className="ml-auto text-[11px] tabular-nums text-[#999]">
                          {eks ? `${eks.resultat >= 0 ? '+' : '−'}${tall(Math.abs(eks.resultat))} kr` : 'Ikke opprettet'}
                        </span>
                        {y === year && <Check className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />}
                      </button>
                    );
                  })}
                  {!readOnly && (
                    <>
                      <div className="mx-1 my-1 h-px bg-black/[0.05]" />
                      <button
                        onClick={() => aapneWizard(null)}
                        data-testid="budsjett-aar-nytt"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#6d28d9] transition-colors hover:bg-[#f4f0fb]"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Nytt budsjett — veiviser
                      </button>
                      <div className="mx-1 my-1 h-px bg-black/[0.05]" />
                      <p className="px-2.5 pb-1 pt-1.5 text-[9.5px] font-bold uppercase tracking-[0.09em] text-[#c9c4bd]">Frittstående budsjetter</p>
                      {planListe.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setAarMenyOpen(false); setValgtPlan(p.id); }}
                          data-testid={`budsjett-plan-valg-${p.id}`}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#fafaf8]"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-semibold text-[#333]">{p.navn}</span>
                            <span className="block text-[10.5px] tabular-nums text-[#b5b5b5]">{planYmLabel(p.startYm)} → {planYmLabel(p.sluttYm)} · {p.antallMnd} mnd</span>
                          </span>
                          {p.status === 'vedtatt' && <span className="shrink-0 rounded bg-[#eef6f0] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#1f7a45]">Vedtatt</span>}
                        </button>
                      ))}
                      <button
                        onClick={() => { setAarMenyOpen(false); setValgtPlan('ny'); }}
                        data-testid="budsjett-plan-ny-knapp"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#6d28d9] transition-colors hover:bg-[#f4f0fb]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Frittstående budsjett — fri periode
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => byttAar(year + 1)} data-testid="budsjett-aar-neste" className="flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9]"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
        <div className="flex h-9 items-center rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          {[{ k: 'aar', l: 'Kalenderår' }, { k: 'rullerende', l: 'Neste 12 mnd' }].map((o) => (
            <button key={o.k} onClick={() => byttVisning(o.k)} data-testid={`budsjett-visning-${o.k}`} className={`h-7 rounded-full px-3 text-[12px] font-semibold transition-all ${visning === o.k ? 'bg-[#f4f0fb] text-[#6d28d9]' : 'text-[#999] hover:text-[#555]'}`}>{o.l}</button>
          ))}
        </div>
        <div className="flex h-9 items-center rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          {[{ k: 'budsjett', l: 'Budsjett' }, { k: 'avvik', l: 'Mot faktisk' }].map((o) => (
            <button key={o.k} onClick={() => setMode(o.k)} data-testid={`budsjett-mode-${o.k}`} className={`h-7 rounded-full px-3 text-[12px] font-semibold transition-all ${mode === o.k ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`}>{o.l}</button>
          ))}
        </div>
        {data?.updatedAt && (
          <span className="hidden text-[11px] text-[#b5b5b5] lg:inline">
            Sist lagret {new Date(data.updatedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{data.updatedBy ? ` av ${data.updatedBy}` : ''}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <a
            href={`/api/admin/budsjett/xlsx?key=${encodeURIComponent(apiKey)}&${erRull ? `vindu=rullerende${investor ? '&modell=1' : ''}` : `year=${year}`}`}
            data-testid="budsjett-xlsx"
            title={erRull ? 'Last ned investorklar Excel for de neste 12 månedene' : 'Last ned styremøteklar Excel (budsjett + mot faktisk, levende formler)'}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#555] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#111] active:scale-[0.97]"
          >
            <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">Excel</span>
          </a>
          {!readOnly && (
            <>
              <button onClick={aapneSeed} data-testid="budsjett-forslag-knapp" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#6d28d9] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:bg-[#f4f0fb] active:scale-[0.97]">
                {data?.honorarLaas ? <Lock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} <span className="hidden sm:inline">Inntektsmodell</span><span className="sm:hidden">Modell</span>
                {data?.honorarLaas && <span className="rounded-full bg-[#f4f0fb] px-1.5 py-[1px] text-[9.5px] font-bold uppercase tracking-wide text-[#8b5cf6]">Låst</span>}
              </button>
              <button
                onClick={lagre}
                disabled={(!dirty && !dirtyNeste) || lagrer}
                data-testid="budsjett-lagre"
                title="⌘S / Ctrl+S"
                className={`relative flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-all active:scale-[0.97] ${dirty || dirtyNeste ? 'bg-[#0a0a0a] text-white hover:bg-black/85' : lagretNaa ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-[#c2beb8] shadow-[0_2px_10px_rgba(0,0,0,0.04)]'}`}
              >
                {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : lagretNaa ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {lagretNaa ? 'Lagret' : 'Lagre'}
                {(dirty || dirtyNeste) && !lagrer && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400" />
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {feil && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {feil}
        </div>
      )}

      {/* Tomt år: tilby å kopiere fjoråret eller foreslå fra porteføljen */}
      {!laster && !readOnly && !erRull && data && !data.finnes && !dirty && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="budsjett-tomt-aar">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0fb]"><Sparkles className="h-4 w-4 text-[#8b5cf6]" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-[#0a0a0a]">Budsjettet for {year} er ikke opprettet ennå</p>
            <p className="text-[12px] text-[#999]">Veiviseren henter inntekter og kostnader automatisk — du bestemmer bare tilvekst og churn.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => aapneWizard(year)}
              data-testid="budsjett-wizard-knapp"
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
            >
              <Sparkles className="h-4 w-4" /> Lag budsjettet på 2 minutter
            </button>
            <button
              onClick={() => kopierFraAar(year - 1)}
              disabled={kopierer}
              data-testid="budsjett-kopier-fjor"
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#f4f2ee] px-4 text-[12.5px] font-semibold text-[#57534e] transition-all hover:bg-[#ece9e3] active:scale-[0.97]"
            >
              {kopierer ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />} Kopier {year - 1}
            </button>
          </div>
        </div>
      )}

      {/* Rullerende: neste års budsjett finnes ikke ennå — forklar halen.
          Investor med modell24: kolonnene fylles av modellen (rolig forklaring).
          Ellers: 0-kolonner med oppfordring om å legge neste års budsjett. */}
      {!laster && erRull && neste.lastet && !neste.finnes && !dirtyNeste && vindu.some(({ y }) => y === iAar + 1) && (
        (investor && modell24) ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="budsjett-modellhale-info">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0fb]"><Sparkles className="h-4 w-4 text-[#6d28d9]" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[#0a0a0a]">Månedene i {iAar + 1} er modell</p>
              <p className="text-[12px] text-[#999]">Budsjettet for {iAar + 1} er ikke vedtatt ennå. Kolonnene merket «modell» viser kontraktsfestet honorar fra signerte avtaler{data?.antakelser && Object.values(data.antakelser).some((v) => Number(v) > 0) ? ' pluss årets vedtatte vekstantakelser' : ''}, med faste kostnader videreført fra desember.</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="budsjett-neste-tomt">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdf3e0]"><AlertTriangle className="h-4 w-4 text-[#9a6b1c]" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[#0a0a0a]">Budsjettet for {iAar + 1} er ikke opprettet ennå</p>
              <p className="text-[12px] text-[#999]">Kolonnene etter nyttår starter på 0. {readOnly ? 'Be en administrator fylle dem.' : `Fyll dem direkte her — de lagres automatisk i ${iAar + 1}-budsjettet.`}</p>
            </div>
          </div>
        )
      )}

      {/* KPI-kort med delta-chips */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            l: erRull ? 'Inntekter · neste 12 mnd' : `Inntekter ${year}`, v: kpi.budInnAar, icon: TrendingUp, farge: '#1f7a45', bg: '#e7f4ec',
            chip: kpi.harFaktisk ? { diff: kpi.fInn - kpi.bInnYtd, bra: kpi.fInn >= kpi.bInnYtd } : null,
            sub: (investor && erRull && kontraktsfestetPct != null)
              ? `${kontraktsfestetPct} % kontraktsfestet — ${kr(sikretVindu)} i signerte avtaler`
              : kpi.harFaktisk ? `Faktisk hittil ${kr(kpi.fInn)} · budsjett ${kr(kpi.bInnYtd)}` : 'Ingen faktiske tall ennå',
          },
          {
            l: erRull ? 'Kostnader · neste 12 mnd' : `Kostnader ${year}`, v: kpi.budKostAar, icon: Wallet, farge: '#9a6b1c', bg: '#fdf3e0',
            chip: kpi.harFaktisk ? { diff: kpi.fKost - kpi.bKostYtd, bra: kpi.fKost <= kpi.bKostYtd } : null,
            sub: kpi.harFaktisk ? `Faktisk hittil ${kr(kpi.fKost)} · budsjett ${kr(kpi.bKostYtd)}` : 'Ingen faktiske tall ennå',
          },
          {
            l: erRull ? 'Resultat · budsjett' : `Resultat ${year} · budsjett`, v: kpi.budRes, icon: Target, farge: kpi.budRes >= 0 ? '#1f7a45' : '#be123c', bg: kpi.budRes >= 0 ? '#e7f4ec' : '#fde8ec',
            chip: null, sub: 'Sum inntekter − sum kostnader',
          },
          (investor && erRull) ? {
            l: 'Exit run-rate', v: exitRunRate, icon: Flag, farge: '#3757c4', bg: '#e8eefc',
            chip: null, sub: `Inntektsnivået i ${kolLabel(11)} × 12 — årsraten perioden avsluttes på`,
          } : {
            l: erRull ? 'Forventet · 12 mnd' : 'Forventet årsslutt', v: kpi.aarsslutt, icon: Flag, farge: '#3757c4', bg: '#e8eefc',
            chip: kpi.harFaktisk ? { diff: kpi.aarsslutt - kpi.budRes, bra: kpi.aarsslutt >= kpi.budRes } : null,
            sub: `Faktisk hittil + budsjett for resten av ${erRull ? 'vinduet' : 'året'}`,
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.l} className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: s.bg }}>
                  <Icon className="h-4 w-4" style={{ color: s.farge }} />
                </span>
                {s.chip && (
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums ${s.chip.bra ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {s.chip.diff >= 0 ? '+' : '−'}{tall(Math.abs(s.chip.diff))}
                  </span>
                )}
              </div>
              <p className={`mt-3 text-[20px] font-bold tabular-nums tracking-tight sm:text-[22px] ${s.v < 0 ? 'text-rose-600' : 'text-[#0a0a0a]'}`} style={heading}>
                {laster ? '…' : <TallAnim verdi={s.v} formater={kr} />}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">{s.l}</p>
              <p className="mt-1 truncate text-[11px] text-[#b5b5b5]" title={s.sub}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Resultatgraf — budsjett vs. faktisk */}
      {!laster && harGrafTall && (
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="budsjett-graf">
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><BarChart3 className="h-3.5 w-3.5" /> Resultat {grafAkk ? 'akkumulert' : 'per måned'}</p>
            <div className="flex h-7 items-center rounded-full bg-[#fafaf8] p-0.5">
              {[{ k: false, l: 'Per måned' }, { k: true, l: 'Akkumulert' }].map((o) => (
                <button key={o.l} onClick={() => setGrafAkk(o.k)} data-testid={`budsjett-graf-${o.k ? 'akk' : 'mnd'}`} className={`h-6 rounded-full px-2.5 text-[10.5px] font-semibold transition-all ${grafAkk === o.k ? 'bg-white text-[#0a0a0a] shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-[#a3a3a3] hover:text-[#555]'}`}>{o.l}</button>
              ))}
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[#999]"><span className="h-2.5 w-2.5 rounded-sm bg-[#e4dcf6]" /> Budsjett</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#999]"><span className="h-2.5 w-2.5 rounded-sm bg-[#1f7a45]" /> Faktisk</span>
          </div>
          <div className="mt-2 h-[140px] sm:h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={grafData} barGap={3} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: '#b5b5b5' }} dy={4} />
                <YAxis hide />
                <ReferenceLine y={0} stroke="#eeece8" />
                <Tooltip content={<GrafTooltip />} cursor={{ fill: 'rgba(139,92,246,0.05)' }} />
                <Bar dataKey="budsjett" name="Budsjett" radius={[4, 4, 0, 0]} maxBarSize={26}>
                  {grafData.map((d, i) => <Cell key={i} fill={erNaa(i) ? '#d5c8f2' : '#e4dcf6'} />)}
                </Bar>
                <Bar dataKey="faktisk" name="Faktisk" radius={[4, 4, 0, 0]} maxBarSize={26}>
                  {grafData.map((d, i) => <Cell key={i} fill={d.faktisk == null ? 'transparent' : d.faktisk >= 0 ? '#1f7a45' : '#e11d48'} />)}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rutenettet — desktop: hele året · mobil: én måned om gangen */}
      <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        {laster ? (
          <div className="space-y-1.5 p-4" data-testid="budsjett-skeleton">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-[#f3f2f0]" style={{ opacity: Math.max(0.25, 1 - i * 0.1), animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop-rutenett */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px]" data-testid="budsjett-tabell">
                <thead>
                  <tr className="border-b border-black/[0.05]">
                    <th className="sticky left-0 z-10 w-[190px] bg-white px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Kategori</th>
                    {vindu.map((_, i) => (
                      <th key={i} className={`px-1 py-2.5 text-right transition-colors ${erNaa(i) ? 'bg-[#f8f5ff]' : fokusKol === i ? 'bg-[#faf8ff]' : ''}`}>
                        <button
                          onClick={() => aapneKommentar(i)}
                          title={`${kolLabel(i)}${erSnapshot(i) ? ' · faktisk låst (snapshot)' : ''}${erModellKol(i) ? ' · modell: kontraktsfestet inntekt + videreførte kostnader' : ''}${lesKommentar(i) ? `\n«${lesKommentar(i)}»` : '\nKlikk for månedskommentar'}`}
                          data-testid={`budsjett-mndhode-${i}`}
                          className={`group/mh ml-auto flex items-center gap-1 rounded px-1 text-[10.5px] font-bold uppercase tracking-[0.08em] transition-colors ${erNaa(i) || fokusKol === i ? 'text-[#8b5cf6]' : 'text-[#b5b5b5] hover:text-[#8b5cf6]'}`}
                        >
                          {erSnapshot(i) && <Lock className="h-2.5 w-2.5 shrink-0 text-[#3757c4]" />}
                          {kolLabel(i)}
                          <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${lesKommentar(i) ? 'bg-amber-400' : 'bg-transparent group-hover/mh:bg-[#e4dcf6]'}`} />
                        </button>
                        {erNaa(i) && <span className="ml-auto mt-0.5 block h-[3px] w-4 rounded-full bg-[#8b5cf6]/60" />}
                        {erModellKol(i) && <span className="ml-auto mt-0.5 block text-right text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#c4b5e8]" data-testid={`budsjett-modell-kol-${i}`}>modell</span>}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#888]">Sum</th>
                  </tr>
                </thead>
                <tbody>
                  {rSeksjon('Inntekter', '#1f7a45', '#f4f9f5', sum12(budInn))}
                  {katInn.map((kat, ki) => (
                    <React.Fragment key={`innrad-${kat}`}>
                      {rRad('inn', kat)}
                      {ki === 0 && !erRull && mode === 'budsjett' && data?.honorarLaas && rLaasDelt()}
                    </React.Fragment>
                  ))}
                  {erRull ? rEgenAggRad('inn') : egneInn.map((p) => rEgenRad(p))}
                  {!readOnly && mode === 'budsjett' && !erRull && rNyPostRad('inn')}
                  {rSumRad('Sum inntekter', budInn, fakInnV)}
                  {rSeksjon('Kostnader', '#9a6b1c', '#fdf6ec', sum12(budKost))}
                  {katKost.map((kat) => rRad('kost', kat))}
                  {erRull ? rEgenAggRad('kost') : egneKost.map((p) => rEgenRad(p))}
                  {!readOnly && mode === 'budsjett' && !erRull && rNyPostRad('kost')}
                  {rSumRad('Sum kostnader', budKost, fakKostV, { inverter: true })}
                  {rSumRad('Resultat', budRes12, fakRes12, { negativRod: true })}
                </tbody>
              </table>
              {!readOnly && mode === 'budsjett' && (
                <div className="flex items-center gap-3 border-t border-black/[0.04] px-3 py-2 text-[10.5px] text-[#c2beb8]">
                  <span><kbd className="rounded border border-black/[0.08] bg-[#fafaf8] px-1 font-sans">↑↓←→</kbd> naviger</span>
                  <span><kbd className="rounded border border-black/[0.08] bg-[#fafaf8] px-1 font-sans">⌘S</kbd> lagre</span>
                  <span><kbd className="rounded border border-black/[0.08] bg-[#fafaf8] px-1 font-sans">⌘Z</kbd> angre</span>
                  <span className="hidden xl:inline">Lim inn en hel rad rett fra Excel</span>
                  <button onClick={() => setVisSnarveier(true)} data-testid="budsjett-snarveier-knapp" className="ml-auto rounded-full px-2 py-0.5 font-semibold text-[#b5b5b5] transition-colors hover:bg-[#f4f0fb] hover:text-[#8b5cf6]">
                    <kbd className="mr-1 rounded border border-black/[0.08] bg-[#fafaf8] px-1 font-sans">?</kbd>Alle snarveier
                  </button>
                </div>
              )}
            </div>

            {/* Mobil: månedspiller + kategoriliste */}
            <div
              className="lg:hidden"
              data-testid="budsjett-mobil"
              onTouchStart={(e) => {
                if (e.target.closest('[data-svipp-ignor]')) { svStart.current = null; return; }
                svStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={(e) => {
                const s = svStart.current;
                svStart.current = null;
                if (!s) return;
                const dx = e.changedTouches[0].clientX - s.x;
                const dy = e.changedTouches[0].clientY - s.y;
                if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) {
                  setMobilMnd((m) => Math.min(11, Math.max(0, m + (dx < 0 ? 1 : -1))));
                }
              }}
            >
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-black/[0.05] px-3 py-2.5" data-svipp-ignor>
                {vindu.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setMobilMnd(i)}
                    data-testid={`budsjett-mobil-mnd-${i}`}
                    className={`relative h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold transition-all active:scale-[0.96] ${i === mobilMnd ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`}
                  >
                    {kolLabel(i)}
                    {erNaa(i) && <span className={`absolute bottom-[3px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full ${i === mobilMnd ? 'bg-white/70' : 'bg-[#8b5cf6]'}`} />}
                  </button>
                ))}
              </div>
              <div className="bg-[#f4f9f5] px-4 py-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#1f7a45]">Inntekter · {kolLabel(mobilMnd)}</span>
                  <span className="text-[10.5px] font-bold tabular-nums text-[#1f7a45]">{kr(sum12(budInn))}/{erRull ? '12\u202Fmnd' : 'år'}</span>
                </div>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {katInn.map((kat) => rMobilRad('inn', kat))}
                {erRull ? rEgenMobilAgg('inn') : egneInn.map((p) => rEgenMobilRad(p))}
              </div>
              {!readOnly && mode === 'budsjett' && !erRull && (
                <button onClick={() => aapneNyPost('inn')} className="flex w-full items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-[#c2beb8] active:text-[#8b5cf6]">
                  <Plus className="h-3.5 w-3.5" /> Ny post
                </button>
              )}
              {rMobilSum('Sum inntekter', budInn, fakInnV)}
              <div className="bg-[#fdf6ec] px-4 py-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#9a6b1c]">Kostnader · {kolLabel(mobilMnd)}</span>
                  <span className="text-[10.5px] font-bold tabular-nums text-[#9a6b1c]">{kr(sum12(budKost))}/{erRull ? '12\u202Fmnd' : 'år'}</span>
                </div>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {katKost.map((kat) => rMobilRad('kost', kat))}
                {erRull ? rEgenMobilAgg('kost') : egneKost.map((p) => rEgenMobilRad(p))}
              </div>
              {!readOnly && mode === 'budsjett' && !erRull && (
                <button onClick={() => aapneNyPost('kost')} className="flex w-full items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-[#c2beb8] active:text-[#8b5cf6]">
                  <Plus className="h-3.5 w-3.5" /> Ny post
                </button>
              )}
              {rMobilSum('Sum kostnader', budKost, fakKostV, { inverter: true })}
              <div className="border-t border-black/[0.06]">
                {rMobilSum(`Resultat · ${kolLabel(mobilMnd)}`, budRes12, fakRes12, { negativRod: true })}
              </div>
              {/* Månedskommentar — samme data som kolonneklikk på desktop */}
              <button
                onClick={() => aapneKommentar(mobilMnd)}
                data-testid="budsjett-mobil-kommentar"
                className="flex w-full items-start gap-2 border-t border-black/[0.05] px-4 py-3 text-left active:bg-[#fafaf8]"
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#c2beb8]" />
                <span className={`min-w-0 flex-1 truncate text-[12px] leading-relaxed ${lesKommentar(mobilMnd) ? 'text-[#555]' : 'text-[#c2beb8]'}`}>
                  {lesKommentar(mobilMnd) || `Kommentar til ${kolLabel(mobilMnd)} …`}
                </span>
                {erSnapshot(mobilMnd) && <Lock className="mt-0.5 h-3 w-3 shrink-0 text-[#3757c4]" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Notat: styrekommentar per år — følger med i Excel-eksporten */}
      {!laster && (!readOnly || !!notat) && (
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><StickyNote className="h-3.5 w-3.5" /> Notat</p>
          {readOnly ? (
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#555]">{notat}</p>
          ) : (
            <textarea
              value={notat}
              onChange={(e) => { setNotat(e.target.value.slice(0, 2000)); setDirty(true); }}
              rows={2}
              placeholder="Kommentar til budsjettet (forutsetninger, styrenotat …) — følger med i Excel-eksporten"
              data-testid="budsjett-notat"
              className="mt-2 w-full resize-y rounded-lg border border-black/[0.06] bg-[#fafaf8] px-3 py-2 text-[13px] leading-relaxed outline-none transition-all placeholder:text-[#c9c5bf] focus:border-[#8b5cf6]/40 focus:bg-white focus:ring-2 focus:ring-[#8b5cf6]/10"
            />
          )}
        </div>
      )}

      <p className="mt-4 text-[11.5px] text-[#b5b5b5]">
        Alle tall i kr eks. mva. {!readOnly && 'Piltaster/Enter flytter mellom celler · ⌘S lagrer. '}«Mot faktisk» henter tallene automatisk fra Økonomi: honorar fra signerte leiekontrakter og løpende kostnader per kategori. Faktiske inntekter føres mot «{katInn[0] || 'Honorar (forvaltning)'}» — oppstartshonorar og annen inntekt følges foreløpig ikke automatisk.
      </p>

      {/* ── «?»-snarveisoversikt — Linear-stil hurtigreferanse ── */}
      {visSnarveier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={() => setVisSnarveier(false)}>
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="budsjett-snarveier-modal">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>Tastatursnarveier</h3>
              <button onClick={() => setVisSnarveier(false)} className="ml-auto rounded-lg p-1.5 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-0.5">
              {[
                { k: '↑ ↓ ← →', b: 'Naviger mellom cellene' },
                { k: 'Enter', b: 'Hopp til neste rad' },
                { k: '⌘S · Ctrl+S', b: 'Lagre budsjettet' },
                { k: '⌘Z · Ctrl+Z', b: 'Angre siste celleendring' },
                { k: '⌘V · Ctrl+V', b: 'Lim inn en hel rad fra Excel — fyller mot høyre' },
                { k: 'Klikk månedshodet', b: 'Skriv en månedskommentar' },
                { k: '?', b: 'Vis / skjul denne oversikten' },
                { k: 'Esc', b: 'Lukk' },
              ].map((s) => (
                <div key={s.k} className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 hover:bg-[#fafaf8]">
                  <span className="text-[12.5px] text-[#555]">{s.b}</span>
                  <kbd className="shrink-0 rounded-md border border-black/[0.08] bg-[#fafaf8] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-[#888]">{s.k}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Månedskommentar-modal: én kommentar per måned, følger Excel-eksporten ── */}
      {kommentarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={() => setKommentarModal(null)}>
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="budsjett-kommentar-modal">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdf3e0]"><MessageSquare className="h-4 w-4 text-[#9a6b1c]" /></span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>Kommentar · {kolLabel(kommentarModal.i)}</h3>
                <p className="text-[11.5px] text-[#999]">Forklaring til måneden — følger med i Excel-eksporten</p>
              </div>
              <button onClick={() => setKommentarModal(null)} className="ml-auto rounded-lg p-1.5 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"><X className="h-4 w-4" /></button>
            </div>

            {erSnapshot(kommentarModal.i) && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#e8eefc] px-3.5 py-2 text-[12px] text-[#3757c4]">
                <Lock className="h-3.5 w-3.5 shrink-0" /> Faktiske tall for denne måneden er låst (månedsavslutning-snapshot).
              </div>
            )}

            {readOnly ? (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#fafaf8] px-3.5 py-3 text-[13px] leading-relaxed text-[#555]">{kommentarModal.tekst || 'Ingen kommentar for denne måneden.'}</p>
            ) : (
              <>
                <textarea
                  value={kommentarModal.tekst}
                  onChange={(e) => setKommentarModal((k) => ({ ...k, tekst: e.target.value.slice(0, 500) }))}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { settKommentar(kommentarModal.i, kommentarModal.tekst); setKommentarModal(null); } }}
                  rows={3}
                  autoFocus
                  placeholder="F.eks. «Depositum tilbakebetalt», «To nye kontrakter signert» …"
                  data-testid="budsjett-kommentar-tekst"
                  className="mt-4 w-full resize-y rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-all placeholder:text-[#c9c5bf] focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12"
                />
                <div className="mt-3 flex items-center gap-2">
                  {lesKommentar(kommentarModal.i) && (
                    <button
                      onClick={() => { settKommentar(kommentarModal.i, ''); setKommentarModal(null); }}
                      data-testid="budsjett-kommentar-fjern"
                      className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-rose-500 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Fjern
                    </button>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setKommentarModal(null)} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-[#999] hover:text-[#555]">Avbryt</button>
                    <button
                      onClick={() => { settKommentar(kommentarModal.i, kommentarModal.tekst); setKommentarModal(null); }}
                      data-testid="budsjett-kommentar-lagre"
                      className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
                    >
                      <Check className="h-4 w-4" /> Sett kommentar
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[10.5px] text-[#c2beb8]">Lagres sammen med budsjettet når du trykker «Lagre» (⌘S).</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── «Ny post»-modal: frekvens genererer 12-månedersserien ── */}
      {nyPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={() => setNyPost(null)}>
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="budsjett-ny-post-modal">
            <div className="flex items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${nyPost.type === 'inn' ? 'bg-[#e7f4ec]' : 'bg-[#fdf3e0]'}`}>
                <Plus className={`h-4 w-4 ${nyPost.type === 'inn' ? 'text-[#1f7a45]' : 'text-[#9a6b1c]'}`} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>Ny {nyPost.type === 'inn' ? 'inntektspost' : 'kostnadspost'}</h3>
                <p className="text-[11.5px] text-[#999]">Frekvensen fyller ut månedene — du kan justere hver celle etterpå</p>
              </div>
              <button onClick={() => setNyPost(null)} className="ml-auto rounded-lg p-1.5 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">Navn</span>
                <input
                  value={nyPost.navn}
                  onChange={(e) => setNyPost((p) => ({ ...p, navn: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') leggTilPost(); }}
                  placeholder={nyPost.type === 'inn' ? 'F.eks. Sponsorinntekt' : 'F.eks. Julebord, konsulentbistand …'}
                  autoFocus
                  data-testid="budsjett-ny-post-navn"
                  className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[13.5px] outline-none transition-all focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12"
                />
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">Beløp</span>
                  <input
                    value={nyPost.belop}
                    onChange={(e) => setNyPost((p) => ({ ...p, belop: e.target.value.replace(/[^\d]/g, '') }))}
                    placeholder="0"
                    inputMode="numeric"
                    data-testid="budsjett-ny-post-belop"
                    className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[13.5px] tabular-nums outline-none transition-all focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">Kobles mot avvik <span className="normal-case text-[#c2beb8]">(valgfritt)</span></span>
                  <select
                    value={nyPost.mapTil}
                    onChange={(e) => setNyPost((p) => ({ ...p, mapTil: e.target.value }))}
                    data-testid="budsjett-ny-post-map"
                    className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all focus:border-[#8b5cf6]/45"
                  >
                    <option value="">Ingen kobling</option>
                    {(nyPost.type === 'inn' ? katInn : katKost).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
              </div>

              <div>
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">Frekvens</span>
                <div className="flex flex-wrap gap-1">
                  {[['manedlig', 'Månedlig'], ['kvartalsvis', 'Kvartalsvis'], ['engangs', 'Engangs'], ['arlig', 'Årlig']].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setNyPost((p) => ({ ...p, frekvens: k }))}
                      data-testid={`budsjett-ny-post-frekvens-${k}`}
                      className={`h-8 rounded-full px-3 text-[12px] font-semibold transition-all ${nyPost.frekvens === k ? 'bg-[#0a0a0a] text-white' : 'bg-[#f3f2f0] text-[#999] hover:text-[#555]'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">{['engangs', 'arlig'].includes(nyPost.frekvens) ? 'Måned' : 'Fra måned'}</span>
                  <select
                    value={nyPost.fra}
                    onChange={(e) => setNyPost((p) => ({ ...p, fra: parseInt(e.target.value, 10) }))}
                    data-testid="budsjett-ny-post-fra"
                    className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all focus:border-[#8b5cf6]/45"
                  >
                    {MND.map((m, i) => <option key={m} value={i}>{m} {year}</option>)}
                  </select>
                </label>
                {['manedlig', 'kvartalsvis'].includes(nyPost.frekvens) && (
                  <label className="block">
                    <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">Til måned</span>
                    <select
                      value={nyPost.til}
                      onChange={(e) => setNyPost((p) => ({ ...p, til: parseInt(e.target.value, 10) }))}
                      data-testid="budsjett-ny-post-til"
                      className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all focus:border-[#8b5cf6]/45"
                    >
                      {MND.map((m, i) => <option key={m} value={i} disabled={i < nyPost.fra}>{m} {year}</option>)}
                    </select>
                  </label>
                )}
              </div>

              {/* Forhåndsvisning av serien */}
              {Number(nyPost.belop) > 0 && (
                <div className="rounded-xl bg-[#fafaf8] px-3.5 py-2.5 text-[12px] text-[#777]">
                  {(() => {
                    const v = byggVerdier(nyPost);
                    const antall = v.filter((x) => x > 0).length;
                    return <>Fyller <b className="text-[#0a0a0a]">{antall} måned{antall === 1 ? '' : 'er'}</b> · sum <b className="tabular-nums text-[#0a0a0a]">{kr(sum12(v))}</b>/år{nyPost.mapTil ? <> · avvik telles mot <b className="text-[#8b5cf6]">{nyPost.mapTil}</b></> : ''}</>;
                  })()}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setNyPost(null)} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-[#999] hover:text-[#555]">Avbryt</button>
              <button
                onClick={leggTilPost}
                disabled={!nyPost.navn.trim()}
                data-testid="budsjett-ny-post-lagre"
                className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-all active:scale-[0.97] ${nyPost.navn.trim() ? 'bg-[#0a0a0a] text-white hover:bg-black/85' : 'bg-[#f3f2f0] text-[#c2beb8]'}`}
              >
                <Plus className="h-4 w-4" /> Legg til post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── «Inntektsmodell»-modal: sikret (auto) + antakelser → lås ── */}
      {seedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={() => setSeedOpen(false)}>
          <div className="max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="budsjett-forslag-modal">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0fb]"><Lock className="h-4 w-4 text-[#8b5cf6]" /></span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>Inntektsmodell {year}</h3>
                <p className="text-[11.5px] text-[#999]">Sikret (kontraktsfestet fra plattformen) + antakelsene dine = inntektsbudsjettet</p>
              </div>
              <button onClick={() => setSeedOpen(false)} className="ml-auto rounded-lg p-1.5 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"><X className="h-4 w-4" /></button>
            </div>

            {seedFeil && <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0" />{seedFeil}</div>}

            {seedLaster && !forslag && (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" />
                <p className="text-[11.5px] text-[#b5b5b5]">Henter porteføljen fra plattformen …</p>
              </div>
            )}

            {forslag && (
              <>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#e7f4ec] px-2.5 py-1 text-[11px] font-bold text-[#1f7a45]">{forslag.grunnlag.utleide} utleid · {kr(forslag.grunnlag.baselineHonorar)}/mnd</span>
                  <span className="rounded-full bg-[#fdf3e0] px-2.5 py-1 text-[11px] font-bold text-[#9a6b1c]">{forslag.grunnlag.pipeline} i pipeline</span>
                  <span className="rounded-full bg-[#f1ece4] px-2.5 py-1 text-[11px] font-bold text-[#8a8278]">{forslag.grunnlag.ledige} ledige</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-[#999] ring-1 ring-black/[0.07]">{forslag.kilde?.env || ''}</span>
                </div>

                {/* Antakelsene — det eneste du styrer; sikret-laget kommer av seg selv */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[
                    { k: 'nye', l: 'Nye enheter / mnd', hint: 'vekst utover porteføljen' },
                    { k: 'churn', l: 'Churn % / år', hint: 'ukjent frafall av porteføljen' },
                    { k: 'fyll', l: 'Ledige fylles / mnd', hint: `av ${forslag.grunnlag.ledige} ledige` },
                    { k: 'snittleie', l: 'Snittleie ny enhet', hint: 'kr / mnd' },
                    { k: 'honorarpct', l: 'Honorar-%', hint: 'sats inkl. mva' },
                    { k: 'oppstart', l: 'Oppstartshonorar', hint: 'kr per ny enhet' },
                  ].map((f) => (
                    <label key={f.k} className="block">
                      <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">{f.l}</span>
                      <input
                        value={drivere[f.k]}
                        onChange={(e) => setDrivere((d) => ({ ...d, [f.k]: e.target.value.replace(/[^\d.,]/g, '') }))}
                        inputMode="decimal"
                        data-testid={`budsjett-driver-${f.k}`}
                        className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] tabular-nums outline-none transition-all focus:border-[#8b5cf6]/45 focus:ring-2 focus:ring-[#8b5cf6]/12"
                      />
                      <span className="mt-0.5 block text-[10px] text-[#c2beb8]">{f.hint}</span>
                    </label>
                  ))}
                </div>
                <button onClick={() => hentForslag(drivere)} disabled={seedLaster} className="mt-1 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#f4f0fb] px-3 text-[12px] font-semibold text-[#6d28d9] transition-all hover:bg-[#ece4fa]" data-testid="budsjett-modell-oppdater">
                  {seedLaster ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Oppdater beregningen
                </button>

                {/* Dekomponert forhåndsvisning: sikret (mørk) + vekst (lilla) */}
                <div className="mt-3 rounded-xl bg-[#fafaf8] p-3.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">Inntektsbudsjett {year}</p>
                    <p className="ml-auto text-[12px] tabular-nums text-[#555]" data-testid="budsjett-modell-sum">
                      <b className="text-[#0a0a0a]">{kr(sum12(forslag.sikret))}</b> sikret
                      <span className="mx-1 text-[#d5d0c8]">·</span>
                      <b className={sum12(forslag.vekst) < 0 ? 'text-rose-500' : 'text-[#8b5cf6]'}>{sum12(forslag.vekst) >= 0 ? '+' : ''}{kr(sum12(forslag.vekst))}</b> vekst
                      <span className="mx-1 text-[#d5d0c8]">·</span>
                      <b className="text-[#0a0a0a]">{kr(sum12(forslag.total))}</b>/år
                    </p>
                  </div>
                  <div className="mt-2.5 flex h-[46px] items-end gap-[3px]" data-testid="budsjett-modell-graf">
                    {forslag.total.map((t, i) => {
                      const maks = Math.max(...forslag.total, 1);
                      const sik = Math.max(0, Math.min(forslag.sikret[i], t));
                      const vek = Math.max(0, t - sik);
                      return (
                        <span key={i} className="flex flex-1 flex-col justify-end gap-[1px]" title={`${MND[i]}: ${kr(t)} — sikret ${kr(forslag.sikret[i])}`}>
                          {vek > 0 && <span className="rounded-t-[2px] bg-[#8b5cf6]/60" style={{ height: `${(vek / maks) * 46}px` }} />}
                          <span className={vek > 0 ? 'bg-[#1c1917]/80' : 'rounded-t-[2px] bg-[#1c1917]/80'} style={{ height: `${Math.max(2, (sik / maks) * 46)}px` }} />
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[#a8a29a]">
                    <span className="flex items-center gap-1"><span className="h-[6px] w-[6px] rounded-full bg-[#1c1917]/80" /> sikret — kontraktsfestet (inn-/utflytting på ekte datoer)</span>
                    <span className="flex items-center gap-1"><span className="h-[6px] w-[6px] rounded-full bg-[#8b5cf6]/60" /> vekst — antakelsene over</span>
                  </p>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[12.5px] text-[#555]">
                    <input type="checkbox" checked={seedKostnader} onChange={(e) => setSeedKostnader(e.target.checked)} className="h-4 w-4 rounded accent-[#8b5cf6]" data-testid="budsjett-seed-kostnader" />
                    Fyll også kostnadene fra Økonomi ({kr(sum12(sumPerMnd(forslag.kostnader)))}/år)
                  </label>
                </div>

                {/* Drift: budsjettets frosne sikret-lag vs. sikret nå (live) */}
                {data?.honorarLaas && Array.isArray(data?.sikretNaa) && (() => {
                  const budSik = sum12(data.honorarLaas.sikret);
                  const naaSik = sum12(data.sikretNaa);
                  const drift = naaSik - budSik;
                  return (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#eef4fc] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#3757c4]" data-testid="budsjett-sikret-naa">
                      <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Sikret nå (live): <b className="tabular-nums">{kr(naaSik)}</b>/år · budsjettets sikret-lag: <b className="tabular-nums">{kr(budSik)}</b>
                        {drift !== 0 && <> · drift <b className={`tabular-nums ${drift > 0 ? 'text-[#1f7a45]' : 'text-rose-600'}`}>{drift > 0 ? '+' : ''}{kr(drift)}</b></>}
                        {data.honorarLaas.laastAt ? <> · låst {new Date(data.honorarLaas.laastAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}{data.honorarLaas.laastAv ? ` av ${data.honorarLaas.laastAv}` : ''}</> : null}
                      </span>
                    </div>
                  );
                })()}

                <div className="mt-4 flex items-center gap-2">
                  {data?.honorarLaas && (
                    <button onClick={laasOppInntekt} data-testid="budsjett-laas-opp" className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-rose-500 transition-colors hover:bg-rose-50">
                      <X className="h-3.5 w-3.5" /> Lås opp
                    </button>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setSeedOpen(false)} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-[#999] hover:text-[#555]">Avbryt</button>
                    <button onClick={laasInntekt} disabled={seedLaster} data-testid="budsjett-laas-inntekt" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
                      {seedLaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {data?.honorarLaas ? 'Oppdater og lås på nytt' : 'Lås inntektsbudsjett'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-[#c2beb8]">
                  Låsingen lagrer budsjettet og overtar radene «Honorar (forvaltning)» og «Oppstartshonorar» — «Annen inntekt» og egne poster er fortsatt dine. Kjente utflyttinger ligger allerede i sikret-laget; churn dekker kun det ukjente.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Budsjettveiviser: fra tomt til låst budsjett i fire steg */}
      {!readOnly && (
        <BudsjettWizard
          apiKey={apiKey}
          aapen={wizardOpen}
          startAar={wizardAar}
          aarListe={aarListe}
          onLukk={() => setWizardOpen(false)}
          onFerdig={(y) => {
            setWizardOpen(false);
            cacheSlett('bud:');
            hentAarListe();
            if (y !== year && !erRull) setYear(y); else hent(erRull ? iAar : y);
            if (erRull) hentNeste();
          }}
        />
      )}
    </div>
  );
}
