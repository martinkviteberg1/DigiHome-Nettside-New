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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target, Loader2, Save, Sparkles, ChevronLeft, ChevronRight, ChevronsRight,
  AlertTriangle, X, TrendingUp, Wallet, Flag, Check, BarChart3,
} from 'lucide-react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';

const heading = { fontFamily: 'var(--font-heading)' };
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const kr = (v) => `${Math.round(v || 0).toLocaleString('nb-NO')} kr`;
const tall = (v) => Math.round(v || 0).toLocaleString('nb-NO');
const sum12 = (arr) => (arr || []).reduce((s, x) => s + (Number(x) || 0), 0);

function sumPerMnd(serier) {
  const ut = Array(12).fill(0);
  for (const arr of Object.values(serier || {})) for (let m = 0; m < 12; m++) ut[m] += Number(arr?.[m]) || 0;
  return ut;
}

/* Avvikschip: inntekter → over budsjett er bra; kostnader → under budsjett er bra. */
function Avvik({ faktisk, budsjett, inverter = false }) {
  if (faktisk == null) return <span className="text-[#c2beb8]">—</span>;
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

export default function Budsjett({ apiKey, readOnly = false }) {
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
  const [mobilMnd, setMobilMnd] = useState(iAar === year ? naaMnd : 0); // mobil: én måned om gangen

  // «Foreslå fra porteføljen»
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedLaster, setSeedLaster] = useState(false);
  const [seedFeil, setSeedFeil] = useState('');
  const [forslag, setForslag] = useState(null);
  const [drivere, setDrivere] = useState({ nye: '', fyll: '', snittleie: '', honorarpct: '', oppstart: '' });
  const [seedKostnader, setSeedKostnader] = useState(true);

  const hent = useCallback(async (y) => {
    setLaster(true); setFeil('');
    try {
      const r = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}&year=${y}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke hente budsjettet');
      setData(j);
      setInntekter(j.inntekter || {});
      setKostnader(j.kostnader || {});
      setDirty(false);
    } catch (e) { setFeil(e.message); setData(null); }
    setLaster(false);
  }, [apiKey]);

  useEffect(() => { hent(year); }, [hent, year]);

  const byttAar = (y) => {
    if (dirty && !window.confirm('Du har ulagrede endringer — forkast dem?')) return;
    setYear(y);
    setMobilMnd(y === iAar ? naaMnd : 0);
  };

  const settCelle = (type, kat, m, verdi) => {
    if (readOnly) return;
    const n = parseInt(String(verdi).replace(/[^\d]/g, ''), 10);
    const setter = type === 'inn' ? setInntekter : setKostnader;
    setter((prev) => {
      const arr = [...(prev[kat] || Array(12).fill(0))];
      arr[m] = Number.isFinite(n) ? n : 0;
      return { ...prev, [kat]: arr };
    });
    setDirty(true);
  };

  // Fyll hele raden med første måned som har verdi — rask årsutfylling.
  const fyllRad = (type, kat) => {
    if (readOnly) return;
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
      const r = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, inntekter, kostnader }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke lagre');
      setData((d) => ({ ...d, updatedAt: j.updatedAt, updatedBy: j.updatedBy, finnes: true }));
      setDirty(false);
      setLagretNaa(true); setTimeout(() => setLagretNaa(false), 2500);
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  }, [apiKey, year, inntekter, kostnader]);

  // ⌘S / Ctrl+S lagrer — som i verktøyene folk er vant til.
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !readOnly && !lagrer) lagre();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dirty, readOnly, lagrer, lagre]);

  const hentForslag = useCallback(async (d) => {
    setSeedLaster(true); setSeedFeil('');
    try {
      const qs = new URLSearchParams({ key: apiKey, year: String(year), env: 'prod' });
      if (d.nye !== '') qs.set('nye', d.nye);
      if (d.fyll !== '') qs.set('fyll', d.fyll);
      if (d.snittleie !== '') qs.set('snittleie', d.snittleie);
      if (d.honorarpct !== '') qs.set('honorarpct', d.honorarpct);
      if (d.oppstart !== '') qs.set('oppstart', d.oppstart);
      const r = await fetch(`/api/admin/budsjett/forslag?${qs}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke lage forslag');
      setForslag(j);
      setDrivere({
        nye: String(j.drivere.nyeEnheterPerMnd), fyll: String(j.drivere.fyllLedigPerMnd),
        snittleie: String(j.drivere.snittLeie), honorarpct: String(j.drivere.honorarPct),
        oppstart: String(j.drivere.oppstartPerEnhet),
      });
    } catch (e) { setSeedFeil(e.message); }
    setSeedLaster(false);
  }, [apiKey, year]);

  const aapneSeed = () => { setSeedOpen(true); setForslag(null); hentForslag({ nye: '', fyll: '', snittleie: '', honorarpct: '', oppstart: '' }); };
  const brukForslag = () => {
    if (!forslag) return;
    setInntekter(forslag.inntekter);
    if (seedKostnader) setKostnader(forslag.kostnader);
    setDirty(true); setSeedOpen(false);
  };

  const katInn = data?.kategorier?.inntekter || Object.keys(inntekter);
  const katKost = data?.kategorier?.kostnader || Object.keys(kostnader);
  const faktisk = data?.faktisk || { honorar: [], kostnaderPerKategori: {}, kostnaderSum: [] };

  const budInn = useMemo(() => sumPerMnd(inntekter), [inntekter]);
  const budKost = useMemo(() => sumPerMnd(kostnader), [kostnader]);
  const budRes12 = MND.map((_, m) => budInn[m] - budKost[m]);
  const fakRes12 = MND.map((_, m) => (faktisk.honorar?.[m] != null ? faktisk.honorar[m] - (faktisk.kostnaderSum?.[m] || 0) : null));

  const kpi = useMemo(() => {
    const kjent = (m) => faktisk.honorar?.[m] != null;
    let fInn = 0, fKost = 0, bInnYtd = 0, bKostYtd = 0, aarsslutt = 0, kjenteMnd = 0;
    for (let m = 0; m < 12; m++) {
      const bi = budInn[m], bk = budKost[m];
      if (kjent(m)) {
        kjenteMnd++;
        fInn += faktisk.honorar[m]; fKost += faktisk.kostnaderSum[m] || 0;
        bInnYtd += bi; bKostYtd += bk;
        aarsslutt += (faktisk.honorar[m] - (faktisk.kostnaderSum[m] || 0));
      } else {
        aarsslutt += (bi - bk);
      }
    }
    const budRes = sum12(budInn) - sum12(budKost);
    return { fInn, fKost, bInnYtd, bKostYtd, budInnAar: sum12(budInn), budKostAar: sum12(budKost), budRes, aarsslutt, kjenteMnd, harFaktisk: kjenteMnd > 0 };
  }, [budInn, budKost, faktisk]);

  const grafData = MND.map((label, m) => ({ label, budsjett: budRes12[m], faktisk: fakRes12[m] }));
  const harGrafTall = budRes12.some((x) => x !== 0) || fakRes12.some((x) => x != null && x !== 0);
  const erNaa = (m) => year === iAar && m === naaMnd;

  // Radindeks for piltast-navigasjon (alle redigerbare rader i rekkefølge).
  const radIndeks = useMemo(() => {
    const map = {};
    let i = 0;
    for (const k of katInn) map[`inn|${k}`] = i++;
    for (const k of katKost) map[`kost|${k}`] = i++;
    return map;
  }, [katInn, katKost]);

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

  const rCelle = (type, kat, m) => {
    const serie = type === 'inn' ? inntekter : kostnader;
    const v = Number(serie[kat]?.[m]) || 0;
    const naaBg = erNaa(m) ? 'bg-[#f8f5ff]' : '';
    if (mode === 'avvik') {
      const f = type === 'inn'
        ? (kat === katInn[0] ? faktisk.honorar?.[m] : null)
        : faktisk.kostnaderPerKategori?.[kat]?.[m];
      return (
        <td key={m} className={`px-1 py-1.5 text-right ${naaBg}`}>
          <div className="text-[12px] tabular-nums text-[#333]">{f != null ? tall(f) : <span className="text-[#d8d4ce]">{v ? tall(v) : '—'}</span>}</div>
          <div className="h-[13px] leading-[13px]"><Avvik faktisk={f} budsjett={v} inverter={type === 'kost'} /></div>
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
          onFocus={(e) => { setFokusCelle(id); try { e.target.select(); } catch (_) {} }}
          onBlur={() => setFokusCelle('')}
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
    const serie = type === 'inn' ? inntekter : kostnader;
    const s = sum12(serie[kat]);
    return (
      <tr key={`${type}-${kat}`} className="group border-b border-black/[0.03] last:border-b-0 hover:bg-[#fbfaf8]">
        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 group-hover:bg-[#fbfaf8]">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] text-[#444]">{kat}</span>
            {!readOnly && mode === 'budsjett' && (
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
          <span className="text-[10.5px] font-bold tabular-nums" style={{ color: farge }}>{kr(aarsSum)}/år</span>
        </div>
      </td>
    </tr>
  );

  /* ── Mobil: én måned om gangen — Linear-følelse på små skjermer ── */

  const rMobilRad = (type, kat) => {
    const serie = type === 'inn' ? inntekter : kostnader;
    const v = Number(serie[kat]?.[mobilMnd]) || 0;
    if (mode === 'avvik') {
      const f = type === 'inn'
        ? (kat === katInn[0] ? faktisk.honorar?.[mobilMnd] : null)
        : faktisk.kostnaderPerKategori?.[kat]?.[mobilMnd];
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

  const rMobilSum = (label, serie, faktiskSerie, { negativRod = false, inverter = false } = {}) => {
    const v = serie[mobilMnd];
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

  return (
    <div className="mx-auto max-w-[1280px]" data-testid="budsjett-modul">
      {/* Topplinje: år + visning + handlinger */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 items-center rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <button onClick={() => byttAar(year - 1)} data-testid="budsjett-aar-forrige" className="flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-2 text-[13.5px] font-bold tabular-nums text-[#0a0a0a]" style={heading} data-testid="budsjett-aar">{year}</span>
          <button onClick={() => byttAar(year + 1)} data-testid="budsjett-aar-neste" className="flex h-7 w-7 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9]"><ChevronRight className="h-4 w-4" /></button>
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
        {!readOnly && (
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={aapneSeed} data-testid="budsjett-forslag-knapp" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#6d28d9] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:bg-[#f4f0fb] active:scale-[0.97]">
              <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Foreslå fra porteføljen</span><span className="sm:hidden">Forslag</span>
            </button>
            <button
              onClick={lagre}
              disabled={!dirty || lagrer}
              data-testid="budsjett-lagre"
              title="⌘S / Ctrl+S"
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-all active:scale-[0.97] ${dirty ? 'bg-[#0a0a0a] text-white hover:bg-black/85' : lagretNaa ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-[#c2beb8] shadow-[0_2px_10px_rgba(0,0,0,0.04)]'}`}
            >
              {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : lagretNaa ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {lagretNaa ? 'Lagret' : 'Lagre'}
            </button>
          </div>
        )}
      </div>

      {feil && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {feil}
        </div>
      )}

      {/* KPI-kort med delta-chips */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            l: `Inntekter ${year}`, v: kpi.budInnAar, icon: TrendingUp, farge: '#1f7a45', bg: '#e7f4ec',
            chip: kpi.harFaktisk ? { diff: kpi.fInn - kpi.bInnYtd, bra: kpi.fInn >= kpi.bInnYtd } : null,
            sub: kpi.harFaktisk ? `Faktisk hittil ${kr(kpi.fInn)} · budsjett ${kr(kpi.bInnYtd)}` : 'Ingen faktiske tall ennå',
          },
          {
            l: `Kostnader ${year}`, v: kpi.budKostAar, icon: Wallet, farge: '#9a6b1c', bg: '#fdf3e0',
            chip: kpi.harFaktisk ? { diff: kpi.fKost - kpi.bKostYtd, bra: kpi.fKost <= kpi.bKostYtd } : null,
            sub: kpi.harFaktisk ? `Faktisk hittil ${kr(kpi.fKost)} · budsjett ${kr(kpi.bKostYtd)}` : 'Ingen faktiske tall ennå',
          },
          {
            l: `Resultat ${year} · budsjett`, v: kpi.budRes, icon: Target, farge: kpi.budRes >= 0 ? '#1f7a45' : '#be123c', bg: kpi.budRes >= 0 ? '#e7f4ec' : '#fde8ec',
            chip: null, sub: 'Sum inntekter − sum kostnader',
          },
          {
            l: 'Forventet årsslutt', v: kpi.aarsslutt, icon: Flag, farge: '#3757c4', bg: '#e8eefc',
            chip: kpi.harFaktisk ? { diff: kpi.aarsslutt - kpi.budRes, bra: kpi.aarsslutt >= kpi.budRes } : null,
            sub: `Faktisk hittil + budsjett for resten av året`,
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
                {laster ? '…' : kr(s.v)}
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
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]"><BarChart3 className="h-3.5 w-3.5" /> Resultat per måned</p>
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
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" /></div>
        ) : (
          <>
            {/* Desktop-rutenett */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px]" data-testid="budsjett-tabell">
                <thead>
                  <tr className="border-b border-black/[0.05]">
                    <th className="sticky left-0 z-10 w-[190px] bg-white px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">Kategori</th>
                    {MND.map((m, i) => (
                      <th key={m} className={`px-2 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] ${erNaa(i) ? 'bg-[#f8f5ff] text-[#8b5cf6]' : 'text-[#b5b5b5]'}`}>
                        {m}{erNaa(i) && <span className="mx-auto mt-0.5 block h-[3px] w-4 rounded-full bg-[#8b5cf6]/60" />}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#888]">Sum</th>
                  </tr>
                </thead>
                <tbody>
                  {rSeksjon('Inntekter', '#1f7a45', '#f4f9f5', sum12(budInn))}
                  {katInn.map((kat) => rRad('inn', kat))}
                  {rSumRad('Sum inntekter', budInn, faktisk.honorar)}
                  {rSeksjon('Kostnader', '#9a6b1c', '#fdf6ec', sum12(budKost))}
                  {katKost.map((kat) => rRad('kost', kat))}
                  {rSumRad('Sum kostnader', budKost, faktisk.kostnaderSum, { inverter: true })}
                  {rSumRad('Resultat', budRes12, fakRes12, { negativRod: true })}
                </tbody>
              </table>
            </div>

            {/* Mobil: månedspiller + kategoriliste */}
            <div className="lg:hidden" data-testid="budsjett-mobil">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-black/[0.05] px-3 py-2.5">
                {MND.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => setMobilMnd(i)}
                    data-testid={`budsjett-mobil-mnd-${i}`}
                    className={`relative h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold transition-all active:scale-[0.96] ${i === mobilMnd ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`}
                  >
                    {m}
                    {erNaa(i) && <span className={`absolute bottom-[3px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full ${i === mobilMnd ? 'bg-white/70' : 'bg-[#8b5cf6]'}`} />}
                  </button>
                ))}
              </div>
              <div className="bg-[#f4f9f5] px-4 py-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#1f7a45]">Inntekter · {MND[mobilMnd]}</span>
                  <span className="text-[10.5px] font-bold tabular-nums text-[#1f7a45]">{kr(sum12(budInn))}/år</span>
                </div>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {katInn.map((kat) => rMobilRad('inn', kat))}
              </div>
              {rMobilSum('Sum inntekter', budInn, faktisk.honorar)}
              <div className="bg-[#fdf6ec] px-4 py-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#9a6b1c]">Kostnader · {MND[mobilMnd]}</span>
                  <span className="text-[10.5px] font-bold tabular-nums text-[#9a6b1c]">{kr(sum12(budKost))}/år</span>
                </div>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {katKost.map((kat) => rMobilRad('kost', kat))}
              </div>
              {rMobilSum('Sum kostnader', budKost, faktisk.kostnaderSum, { inverter: true })}
              <div className="border-t border-black/[0.06]">
                {rMobilSum(`Resultat · ${MND[mobilMnd]}`, budRes12, fakRes12, { negativRod: true })}
              </div>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-[11.5px] text-[#b5b5b5]">
        Alle tall i kr eks. mva. {!readOnly && 'Piltaster/Enter flytter mellom celler · ⌘S lagrer. '}«Mot faktisk» henter tallene automatisk fra Økonomi: honorar fra signerte leiekontrakter og løpende kostnader per kategori. Faktiske inntekter føres mot «{katInn[0] || 'Honorar (forvaltning)'}» — oppstartshonorar og annen inntekt følges foreløpig ikke automatisk.
      </p>

      {/* ── «Foreslå fra porteføljen»-modal ── */}
      {seedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={() => setSeedOpen(false)}>
          <div className="max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="budsjett-forslag-modal">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0fb]"><Sparkles className="h-4 w-4 text-[#8b5cf6]" /></span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>Foreslå fra porteføljen</h3>
                <p className="text-[11.5px] text-[#999]">Bygger inntektsbudsjettet {year} fra dagens leieforhold + antakelsene under</p>
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

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[
                    { k: 'nye', l: 'Nye enheter / mnd', hint: 'vekst utover porteføljen' },
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
                  <div className="flex items-end pb-4">
                    <button onClick={() => hentForslag(drivere)} disabled={seedLaster} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#f4f0fb] px-3 text-[12px] font-semibold text-[#6d28d9] transition-all hover:bg-[#ece4fa]">
                      {seedLaster ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Oppdater forslag
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-[#fafaf8] p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">Honorar-forslag (jan → des)</p>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-[#0a0a0a]" style={heading} data-testid="budsjett-forslag-honorar">
                    {kr(forslag.inntekter['Honorar (forvaltning)'][0])} → {kr(forslag.inntekter['Honorar (forvaltning)'][11])}
                    <span className="ml-2 text-[12px] font-semibold text-[#1f7a45]">sum {kr(sum12(forslag.inntekter['Honorar (forvaltning)']))}/år</span>
                  </p>
                  {/* Mini-forhåndsvisning av forslagsserien */}
                  <div className="mt-2 flex h-[36px] items-end gap-[3px]">
                    {forslag.inntekter['Honorar (forvaltning)'].map((v, i) => {
                      const maks = Math.max(...forslag.inntekter['Honorar (forvaltning)'], 1);
                      return <span key={i} className="flex-1 rounded-t-[2px] bg-[#8b5cf6]/70 transition-all" style={{ height: `${Math.max(4, (v / maks) * 100)}%` }} title={`${MND[i]}: ${kr(v)}`} />;
                    })}
                  </div>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[12.5px] text-[#555]">
                    <input type="checkbox" checked={seedKostnader} onChange={(e) => setSeedKostnader(e.target.checked)} className="h-4 w-4 rounded accent-[#8b5cf6]" data-testid="budsjett-seed-kostnader" />
                    Fyll også kostnadene fra Økonomi ({kr(sum12(sumPerMnd(forslag.kostnader)))}/år)
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button onClick={() => setSeedOpen(false)} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-[#999] hover:text-[#555]">Avbryt</button>
                  <button onClick={brukForslag} data-testid="budsjett-bruk-forslag" className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]">
                    <Check className="h-4 w-4" /> Bruk forslaget
                  </button>
                </div>
                <p className="mt-2 text-[10.5px] text-[#c2beb8]">Forslaget overskriver inntektsradene{seedKostnader ? ' og kostnadsradene' : ''} i rutenettet — ingenting lagres før du trykker «Lagre».</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
