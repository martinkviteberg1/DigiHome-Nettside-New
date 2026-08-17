'use client';

/* ═════════════════════════════════════════════════════════════════════════════
   ENHETSØKONOMI — egen analyseside. Svarer på tre spørsmål på 20 sekunder:
     1. Hva tjener vi på én ny enhet?
     2. Hvor raskt får vi tilbake kostnaden ved å skaffe den?
     3. Hvor robust er økonomien hvis antakelsene endres?

   Arkitektur: Actuals → Benchmark → Modell.
     · Faktisk porteføljeøkonomi beregnes automatisk fra leieforholdene
       (vektet honorar, ikke aritmetisk snitt) — «Bruk porteføljesnitt».
     · Ny enhet modelleres med egne, synlige drivere (venstre rail).
     · Alt beregnes i lib/enhetsokonomi-modell.js (ren motor, delt m/ server).

   Én hovedhistorie nedover siden — ikke dashboardsalat:
     Hero-setning → KPI-er (m/ før/etter bemanning-bryter) → Anatomi →
     Portefølje-benchmark → Før/etter → Livsløpsgraf → LTV → Scenarioer →
     2D-sensitivitet → Prisverktøy → Modellforklaring.
   Investor får read-only; admin justerer og lagrer driverne.
   ═════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, Check, ChevronDown, RotateCcw, ArrowRight, Sparkles, Scale, Info,
} from 'lucide-react';
import {
  EO_STANDARD, rensEoDrivere, beregnEnhet, minHonorarPct, minLeie, scenarioDrivere,
} from '@/lib/enhetsokonomi-modell';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const kr0 = (n) => Math.round(Number(n) || 0).toLocaleString('nb-NO');
const kma = (s) => String(s).replace('.', ',');
const visTall = (v) => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && String(v) !== '' ? Math.round(n).toLocaleString('nb-NO') : String(v ?? '');
};
const datoKort = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) { return null; }
};
const paybackTekst = (v) => (v === null ? '—' : `${kma(v)} mnd`);

/* ── Kollapsbar driverseksjon (samme språk som investormodellen) ── */
const Seksjon = ({ tittel, sammendrag, open, onToggle, children }) => (
  <div className="border-t border-black/[0.05] first:border-0">
    <button onClick={onToggle} className="group flex w-full items-center justify-between gap-2 py-2.5 text-left">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.09em] text-[#78716c] transition-colors group-hover:text-[#1c1917]">{tittel}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        {!open && sammendrag && <span className="truncate text-[11.5px] text-[#a6a19a]">{sammendrag}</span>}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#c2beb8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </span>
    </button>
    {open && <div className="pb-2.5">{children}</div>}
  </div>
);

/* ── Driverfelt: etikett + tall (m/ tusenskille for kr) + slider + endrings-prikk ── */
const Felt = ({ label, k, drivere, sanert, lagret, onEndre, enhet, hint, slider, readOnly, testid, heltall }) => {
  const endret = lagret && sanert && Math.abs((sanert[k] ?? 0) - (lagret[k] ?? 0)) > 1e-9;
  const vis = heltall ? visTall(drivere[k]) : drivere[k];
  const endre = (e) => onEndre(k, heltall ? e.target.value.replace(/[^\d]/g, '') : e.target.value);
  return (
    <div className="py-[6px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13.5px] text-[#57534e]">{label}</span>
          {endret && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d28d9]" title="Endret siden sist lagring" />}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {readOnly ? (
            <span className="text-[13.5px] font-semibold text-[#1c1917]">{heltall ? visTall(drivere[k]) : kma(drivere[k])}</span>
          ) : (
            <input value={vis} inputMode={heltall ? 'numeric' : 'decimal'} data-testid={testid} onChange={endre}
              className={`h-8 ${heltall ? 'w-[112px]' : 'w-[100px]'} rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13.5px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40`} />
          )}
          <span className="w-12 text-[11px] text-[#a6a19a]">{enhet}</span>
        </span>
      </div>
      {slider && !readOnly && (
        <input type="range" min={slider.min} max={slider.max} step={slider.step} value={Math.min(slider.max, Math.max(slider.min, sanert?.[k] ?? slider.min))}
          onChange={(e) => onEndre(k, e.target.value)} aria-label={label}
          className="mt-1.5 h-[3px] w-full cursor-pointer appearance-none rounded-full bg-black/[0.07] accent-[#6d28d9]" />
      )}
      {hint && <p className="mt-1 text-[11px] leading-snug text-[#a6a19a]">{hint}</p>}
    </div>
  );
};

/* ── Livsløpsgraf: akkumulert økonomi for én enhet fra måned 0 (starter på −CAC) ── */
function LivslopGraf({ u, visning }) {
  const [hov, setHov] = useState(null);
  const bidrag = visning === 'etter' ? u.bidragEtter : u.bidragFor;
  const T = u.levetidMnd !== null ? Math.min(120, Math.max(36, Math.ceil(u.levetidMnd * 1.15))) : 60;
  const yV = (t) => -u.nettoCac + bidrag * t;
  const payback = bidrag > 0 ? u.nettoCac / bidrag : null;

  const W = 960, H = 190, PAD = 8;
  const yMin = Math.min(-u.nettoCac, 0) * 1.08 - 1;
  const yMaks = Math.max(yV(T), 1) * 1.05;
  const x = (t) => (W / T) * t;
  const y = (v) => PAD + (H - 2 * PAD) * (1 - (v - yMin) / (yMaks - yMin));
  const merker = [12, 24].filter((t) => t < T);

  return (
    <div className="relative" data-testid="eo-livslop">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }} preserveAspectRatio="none"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const t = Math.max(0, Math.min(T, Math.round(((e.clientX - r.left) / r.width) * T)));
          setHov(t);
        }}
        onMouseLeave={() => setHov(null)}>
        {/* nullinje */}
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#dcd9d3" strokeWidth="1" />
        {/* 12/24 mnd-guider */}
        {merker.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD} y2={H - PAD} stroke="#eceae6" strokeWidth="1" />
            <text x={x(t) + 4} y={H - PAD - 2} fontSize="10" fill="#c2beb8">{t} mnd</text>
          </g>
        ))}
        {/* forventet levetid */}
        {u.levetidMnd !== null && u.levetidMnd < T && (
          <g>
            <line x1={x(u.levetidMnd)} x2={x(u.levetidMnd)} y1={PAD} y2={H - PAD} stroke="#9a6b1c" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x={x(u.levetidMnd) + 4} y={PAD + 10} fontSize="10.5" fontWeight="700" fill="#9a6b1c">Forventet levetid · {kma(u.levetidAar)} år</text>
          </g>
        )}
        {/* negativt område (investeringen) */}
        {payback !== null && payback > 0 && (
          <polygon points={`${x(0)},${y(0)} ${x(0)},${y(-u.nettoCac)} ${x(Math.min(payback, T))},${y(yV(Math.min(payback, T)))} ${x(Math.min(payback, T))},${y(0)}`}
            fill="#b3261e" opacity="0.07" />
        )}
        {/* kurven */}
        <polyline points={`${x(0)},${y(-u.nettoCac)} ${x(T)},${y(yV(T))}`} fill="none"
          stroke={bidrag > 0 ? '#0a7d55' : '#b3261e'} strokeWidth="2.2" strokeLinecap="round" />
        {/* CAC tilbakebetalt */}
        {payback !== null && payback < T && (
          <g>
            <circle cx={x(payback)} cy={y(0)} r="4.5" fill="#fff" stroke="#6d28d9" strokeWidth="2.2" />
            <text x={x(payback) + 7} y={y(0) - 7} fontSize="11" fontWeight="700" fill="#6d28d9">CAC tilbakebetalt · {kma(Math.round(payback * 10) / 10)} mnd</text>
          </g>
        )}
        {/* hover */}
        {hov !== null && (
          <line x1={x(hov)} x2={x(hov)} y1={PAD} y2={H - PAD} stroke="#6d28d9" strokeWidth="1" opacity="0.35" />
        )}
      </svg>
      {hov !== null && (
        <div className="pointer-events-none absolute rounded-[9px] bg-[#141414] px-2.5 py-1.5 text-[11.5px] text-white shadow-lg"
          style={{ left: `${Math.min(86, (hov / T) * 100)}%`, top: 0 }}>
          <span className="font-bold">Måned {hov}</span> · akkumulert {kr0(yV(hov))} kr
        </div>
      )}
      <div className="mt-1 flex items-center justify-between text-[10.5px] text-[#a6a19a]">
        <span>Start: −{kr0(u.nettoCac)} kr (CAC{u.d.oppstartPerEnhet > 0 ? ' − oppstartshonorar' : ''})</span>
        <span>Måned {T}: {kr0(yV(T))} kr akkumulert</span>
      </div>
    </div>
  );
}

/* ── 2D-sensitivitetsmatrise med fargeskala ── */
function Matrise({ tittel, under, rader, kolonner, radFmt, kolFmt, verdi, fmt, bedre, fremhevRad, fremhevKol, testid }) {
  const alle = rader.flatMap((r) => kolonner.map((k) => verdi(r, k))).filter((v) => v !== null && Number.isFinite(v));
  const min = Math.min(...alle, 0), maks = Math.max(...alle, 1);
  const farge = (v) => {
    if (v === null || !Number.isFinite(v)) return { bg: '#faf9f7', fg: '#a6a19a' };
    let p = maks > min ? (v - min) / (maks - min) : 0.5;
    if (bedre === 'lav') p = 1 - p;
    if (p > 0.78) return { bg: '#dff1e7', fg: '#0a6b48' };
    if (p > 0.55) return { bg: '#eef7f1', fg: '#0a7d55' };
    if (p > 0.34) return { bg: '#faf9f7', fg: '#57534e' };
    if (p > 0.16) return { bg: '#fdf3f0', fg: '#b3562e' };
    return { bg: '#fbe7e4', fg: '#b3261e' };
  };
  return (
    <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid={testid}>
      <p className="text-[13.5px] font-medium text-[#8f8a82]">{tittel}</p>
      <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">{under}</p>
      <div className="mt-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className="pb-1.5 pr-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a6a19a]">&nbsp;</th>
              {kolonner.map((k) => (
                <th key={k} className={`pb-1.5 text-right text-[11px] font-bold ${k === fremhevKol ? 'text-[#6d28d9]' : 'text-[#78716c]'}`}>{kolFmt(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rader.map((r) => (
              <tr key={r} className="border-t border-black/[0.04]">
                <td className={`py-1 pr-2 text-[12px] font-semibold ${r === fremhevRad ? 'text-[#6d28d9]' : 'text-[#57534e]'}`}>{radFmt(r)}</td>
                {kolonner.map((k) => {
                  const v = verdi(r, k);
                  const f = farge(v);
                  const erBasis = r === fremhevRad && k === fremhevKol;
                  return (
                    <td key={k} className="py-[3px] pl-1">
                      <span className={`block rounded-[7px] px-2 py-1 text-right font-semibold tabular-nums ${erBasis ? 'ring-1 ring-[#6d28d9]/50' : ''}`}
                        style={{ background: f.bg, color: f.fg }}>
                        {v === null || !Number.isFinite(v) ? '—' : fmt(v)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═════════════════════════════ Hovedkomponent ═════════════════════════════ */

export default function Enhetsokonomi({ api, erAdmin = false }) {
  const [drivere, setDrivere] = useState({ ...EO_STANDARD });
  const [lagretDrivere, setLagretDrivere] = useState(null);
  const [portefolje, setPortefolje] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [skittent, setSkittent] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [visning, setVisning] = useState('etter'); // 'for' | 'etter'
  const [scenario, setScenario] = useState('basis');
  const [aapne, setAapne] = useState({ inntekt: true, direkte: false, kapasitet: false, anskaffelse: false });
  // Prisverktøy (flyktig — lagres ikke)
  const [pvLeie, setPvLeie] = useState('');
  const [pvSats, setPvSats] = useState('');
  const [pvMargin, setPvMargin] = useState('60');

  useEffect(() => {
    let aktivt = true;
    (async () => {
      try {
        const j = await api('enhetsokonomi');
        if (!aktivt) return;
        const d = rensEoDrivere(j.drivere || {});
        setDrivere(d);
        setLagretDrivere(d);
        setPortefolje(j.portefolje || null);
        setPvLeie(String(d.snittleie));
        setPvSats(String(d.honorarPct));
        setFeil('');
      } catch (e) { if (aktivt) setFeil(e.message || 'Kunne ikke hente enhetsøkonomien'); }
      if (aktivt) setLaster(false);
    })();
    return () => { aktivt = false; };
  }, [api]);

  const basis = useMemo(() => rensEoDrivere(drivere), [drivere]);
  const aktive = useMemo(() => scenarioDrivere(basis, scenario), [basis, scenario]);
  const u = useMemo(() => beregnEnhet(aktive), [aktive]);

  // Alle tre scenarioer for sammenligningstabellen
  const scenarioer = useMemo(() => (
    ['konservativ', 'basis', 'ambisios'].map((sc) => {
      const dd = scenarioDrivere(basis, sc);
      return { sc, navn: sc === 'konservativ' ? 'Konservativ' : sc === 'ambisios' ? 'Ambisiøs' : 'Basis', d: dd, u: beregnEnhet(dd) };
    })
  ), [basis]);

  const settDriver = (k, v) => { setDrivere((d) => ({ ...d, [k]: v })); setSkittent(true); };
  const tilbakestill = () => { if (lagretDrivere) { setDrivere({ ...lagretDrivere }); setSkittent(false); } };

  const lagre = useCallback(async () => {
    if (lagrer) return;
    setLagrer(true); setFeil('');
    try {
      const r = await api('enhetsokonomi/antakelser', { method: 'PUT', body: { drivere } });
      setLagretDrivere(rensEoDrivere(r.drivere || drivere));
      setSkittent(false); setLagret(true); setTimeout(() => setLagret(false), 1800);
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  }, [api, drivere, lagrer]);

  const brukPortefoljesnitt = () => {
    if (!portefolje || !portefolje.antallAktive) return;
    setDrivere((d) => ({
      ...d,
      snittleie: portefolje.snittleie || d.snittleie,
      honorarPct: portefolje.vektetHonorarPct ?? d.honorarPct,
    }));
    setSkittent(true);
  };

  // Verdier styrt av før/etter-bryteren
  const valgt = visning === 'etter'
    ? { bidrag: u.bidragEtter, margin: u.marginEtter, payback: u.paybackEtter, ltv: u.ltvEtter, ltvCac: u.ltvCacEtter, aarlig: u.aarligVerdiEtter }
    : { bidrag: u.bidragFor, margin: u.marginFor, payback: u.paybackFor, ltv: u.ltvFor, ltvCac: u.ltvCacFor, aarlig: u.aarligVerdiFor };

  // Matriser (rundt aktive drivere)
  const paybackRader = useMemo(() => {
    const b = aktive.honorarPct;
    return [...new Set([Math.max(0.5, Math.round((b - 2) * 10) / 10), Math.max(0.5, Math.round((b - 1) * 10) / 10), b, Math.round((b + 1) * 10) / 10])];
  }, [aktive.honorarPct]);
  const paybackKolonner = useMemo(() => {
    const c = aktive.cac > 0 ? aktive.cac : 5000;
    return [...new Set([Math.round(c * 0.6), c, Math.round(c * 1.4), c * 2])];
  }, [aktive.cac]);
  const bidragRader = useMemo(() => {
    const k = aktive.enheterPerAarsverk;
    return [...new Set([Math.round(k * 0.75), k, Math.round(k * 1.125), Math.round(k * 1.25)])].sort((a, b2) => a - b2);
  }, [aktive.enheterPerAarsverk]);
  const bidragKolonner = useMemo(() => {
    const L = aktive.snittleie;
    return [...new Set([Math.round(L * 0.8), Math.round(L * 0.9), L, Math.round(L * 1.1)])].sort((a, b2) => a - b2);
  }, [aktive.snittleie]);

  // Prisverktøy-utledninger
  const pv = useMemo(() => {
    const leie = Number(String(pvLeie).replace(/\s/g, '')) || 0;
    const sats = Number(String(pvSats).replace(',', '.')) || 0;
    const maal = Math.min(95, Math.max(0, Number(String(pvMargin).replace(',', '.')) || 0));
    const anbefaltSats = leie > 0 ? minHonorarPct({ leie, maalMarginPct: maal, drivere: aktive }) : null;
    const minsteLeie = sats > 0 ? minLeie({ honorarPct: sats, maalMarginPct: maal, drivere: aktive }) : null;
    const vedAnbefalt = leie > 0 && anbefaltSats !== null
      ? beregnEnhet({ ...aktive, snittleie: leie, honorarPct: anbefaltSats }) : null;
    const satsTabell = [...new Set([8, 9, 10, 11, aktive.honorarPct])].sort((a, b2) => a - b2)
      .map((s2) => ({ sats: s2, leie: minLeie({ honorarPct: s2, maalMarginPct: maal, drivere: aktive }) }));
    return { leie, sats, maal, anbefaltSats, minsteLeie, vedAnbefalt, satsTabell };
  }, [pvLeie, pvSats, pvMargin, aktive]);

  const antallEndret = lagretDrivere
    ? Object.keys(EO_STANDARD).filter((k) => Math.abs((basis[k] ?? 0) - (lagretDrivere[k] ?? 0)) > 1e-9).length
    : 0;

  const Stat = ({ tittel, verdi, under, farge, testid }) => (
    <div className="min-w-[168px] flex-1 px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">{tittel}</p>
      <p className={`mt-0.5 truncate text-[24px] font-bold tracking-[-0.015em] ${farge || 'text-[#1c1917]'}`} style={heading} data-testid={testid}>{verdi}</p>
      {under && <p className="truncate text-[11.5px] text-[#a6a19a]">{under}</p>}
    </div>
  );

  if (laster) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="eo-laster">
        <Loader2 className="h-6 w-6 animate-spin text-[#c2beb8]" />
      </div>
    );
  }

  const heroPositiv = u.bidragEtter > 0;
  const feltProps = { drivere, sanert: basis, lagret: lagretDrivere, onEndre: settDriver, readOnly: !erAdmin };
  const scLabel = { konservativ: 'Konservativ', basis: 'Basis', ambisios: 'Ambisiøs' };

  return (
    <div className="w-full" data-testid="eo-side">
      {/* ── Hero: setningen som oppsummerer caset — generert fra modellen ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-[880px]">
          {/* Egen overskrift — den globale toppraden (m/ søk) er skjult på desktop */}
          <p className="hidden text-[11px] font-bold uppercase tracking-[0.1em] text-[#a6a19a] lg:block">Enhetsøkonomi</p>
          <p className="mt-1 text-[20px] font-bold leading-snug tracking-[-0.01em] text-[#1c1917] md:text-[23px]" style={heading} data-testid="eo-hero">
            En gjennomsnittlig ny enhet gir{' '}
            <span className={heroPositiv ? 'text-[#0a7d55]' : 'text-[#b3261e]'}>{kr0(u.bidragEtter)} kr</span>
            {' '}i månedlig bidrag etter normalisert bemanning
            {u.paybackEtter !== null
              ? <> og tilbakebetaler CAC på <span className="text-[#6d28d9]">{kma(u.paybackEtter)} måneder</span>.</>
              : heroPositiv ? '.' : ' — økonomien bærer ikke en fullt skalert organisasjon med dagens forutsetninger.'}
          </p>
          {portefolje && portefolje.antallAktive > 0 && (
            <p className="mt-1.5 text-[12px] text-[#a6a19a]" data-testid="eo-datagrunnlag">
              Datagrunnlag: {portefolje.antallAktive} aktive enheter · snitt beregnet fra faktisk portefølje
              {datoKort(portefolje.oppdatertAt) ? ` · oppdatert ${datoKort(portefolje.oppdatertAt)}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Scenariobrytere */}
          <div className="flex items-center gap-0.5 rounded-[9px] bg-[#f0efec] p-0.5" data-testid="eo-scenariovalg">
            {['konservativ', 'basis', 'ambisios'].map((sc) => (
              <button key={sc} onClick={() => setScenario(sc)} data-testid={`eo-scenario-${sc}`}
                className={`rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-colors ${scenario === sc ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82] hover:text-[#57534e]'}`}>
                {scLabel[sc]}
              </button>
            ))}
          </div>
          {erAdmin && (
            <>
              {skittent && (
                <button onClick={tilbakestill} title="Tilbakestill til sist lagret" className="flex h-9 items-center gap-1 rounded-[9px] px-2.5 text-[12.5px] font-medium text-[#8f8a82] transition-colors hover:bg-black/[0.05] hover:text-[#1c1917]">
                  <RotateCcw className="h-3.5 w-3.5" />{antallEndret > 0 ? `${antallEndret} endret` : ''}
                </button>
              )}
              <button onClick={lagre} disabled={lagrer || !skittent} data-testid="eo-lagre"
                className="flex h-9 items-center gap-1.5 rounded-[9px] bg-[#141414] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/80 active:scale-[0.98] disabled:opacity-40">
                {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lagret ? <Check className="h-3.5 w-3.5" /> : null}
                {lagret ? 'Lagret' : 'Lagre antakelser'}
              </button>
            </>
          )}
        </div>
      </div>

      {scenario !== 'basis' && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-[9px] bg-[#f0ebfa] px-3 py-1.5 text-[12px] font-medium text-[#6d28d9]" data-testid="eo-scenario-banner">
          <Sparkles className="h-3.5 w-3.5" />
          Viser scenarioet {scLabel[scenario]} — beregnet fra basisdriverne. Driverne i panelet redigerer alltid Basis.
        </p>
      )}
      {feil && <p className="mt-2 text-[13px] text-[#b3261e]" data-testid="eo-feil">{feil}</p>}

      {/* ── KPI-stripe m/ før/etter-bryter ── */}
      <div className="mt-4 rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-kpi">
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.05] px-5 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">Nøkkeltall per enhet</p>
          <div className="flex items-center gap-0.5 rounded-[8px] bg-[#f0efec] p-0.5" data-testid="eo-visningsvalg">
            <button onClick={() => setVisning('for')} data-testid="eo-visning-for"
              className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${visning === 'for' ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82] hover:text-[#57534e]'}`}>
              Før bemanning
            </button>
            <button onClick={() => setVisning('etter')} data-testid="eo-visning-etter"
              className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${visning === 'etter' ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82] hover:text-[#57534e]'}`}>
              Etter normalisert bemanning
            </button>
          </div>
        </div>
        <div className="flex flex-wrap divide-x divide-black/[0.05]">
          <Stat tittel="Bidrag per enhet" verdi={`${kr0(valgt.bidrag)} kr`} under="per måned, eks. mva"
            farge={valgt.bidrag > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'} testid="eo-kpi-bidrag" />
          <Stat tittel="Bidragsmargin" verdi={valgt.margin === null ? '—' : `${valgt.margin} %`} under="av inntekt per enhet" testid="eo-kpi-margin" />
          <Stat tittel="CAC payback" verdi={paybackTekst(valgt.payback)} under={`CAC ${kr0(aktive.cac)} kr per ny enhet`} farge="text-[#6d28d9]" testid="eo-kpi-payback" />
          <Stat tittel={`LTV · ${aktive.ltvHorisontAar} år`} verdi={`${kr0(valgt.ltv.horisont)} kr`} under="overlevelsesvektet bidrag" testid="eo-kpi-ltv" />
          <Stat tittel="LTV/CAC" verdi={valgt.ltvCac === null ? '—' : `${kma(valgt.ltvCac)}×`}
            farge={valgt.ltvCac !== null && valgt.ltvCac >= 3 ? 'text-[#0a7d55]' : undefined} under="mål: over 3×" testid="eo-kpi-ltvcac" />
          <Stat tittel="Årlig verdi" verdi={`${kr0(valgt.aarlig)} kr`} under="bidrag × 12 måneder" testid="eo-kpi-aarlig" />
        </div>
      </div>

      {/* ── Rail + hovedhistorie ── */}
      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
        {/* Venstre: forutsetninger */}
        <aside className="w-full shrink-0 xl:sticky xl:top-3 xl:max-h-[calc(100vh-24px)] xl:w-[344px] xl:overflow-y-auto" data-testid="eo-drivere" style={{ scrollbarWidth: 'thin' }}>
          <div className="rounded-[16px] bg-white px-4 py-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between py-2">
              <p className="text-[13px] font-bold text-[#1c1917]" style={heading}>Forutsetninger</p>
              <Scale className="h-3.5 w-3.5 text-[#c2beb8]" />
            </div>
            <Seksjon tittel="Inntekt" open={aapne.inntekt} onToggle={() => setAapne((a) => ({ ...a, inntekt: !a.inntekt }))}
              sammendrag={`${kr0(basis.snittleie)} kr · ${kma(basis.honorarPct)} %`}>
              <Felt label="Gj.sn. husleie" k="snittleie" {...feltProps} enhet="kr/mnd" heltall testid="eo-driver-snittleie" slider={{ min: 5000, max: 40000, step: 250 }} />
              <Felt label="Forvaltningshonorar" k="honorarPct" {...feltProps} enhet="%" testid="eo-driver-honorar" slider={{ min: 4, max: 15, step: 0.1 }}
                hint={`≈ ${kr0(u.honorarInntekt)} kr eks. mva per enhet/mnd`} />
              <Felt label="Tilleggstjenester" k="tilleggPerMnd" {...feltProps} enhet="kr/mnd" heltall testid="eo-driver-tillegg" hint="Andre løpende inntekter per enhet (eks. mva)" />
              <Felt label="Oppstartshonorar" k="oppstartPerEnhet" {...feltProps} enhet="kr" heltall testid="eo-driver-oppstart" hint="Engangsinntekt ved signering — reduserer netto CAC" />
            </Seksjon>
            <Seksjon tittel="Direkte kostnader" open={aapne.direkte} onToggle={() => setAapne((a) => ({ ...a, direkte: !a.direkte }))}
              sammendrag={`${kr0(basis.systemPerEnhet + basis.andreDirekte)} kr/enhet`}>
              <Felt label="Systemkostnad" k="systemPerEnhet" {...feltProps} enhet="kr/mnd" heltall testid="eo-driver-system" />
              <Felt label="Andre direkte" k="andreDirekte" {...feltProps} enhet="kr/mnd" heltall testid="eo-driver-andre" hint="Betaling/faktura o.l. per enhet" />
            </Seksjon>
            <Seksjon tittel="Kapasitet" open={aapne.kapasitet} onToggle={() => setAapne((a) => ({ ...a, kapasitet: !a.kapasitet }))}
              sammendrag={`${kr0(basis.enheterPerAarsverk)} enh/åv · ${kr0(u.bemanningPerEnhet)} kr/enh`}>
              <Felt label="Enheter per årsverk" k="enheterPerAarsverk" {...feltProps} enhet="enh" heltall testid="eo-driver-kapasitet" slider={{ min: 50, max: 400, step: 5 }} />
              <Felt label="Årslønn" k="aarslonn" {...feltProps} enhet="kr/år" heltall testid="eo-driver-aarslonn" />
              <Felt label="Arbeidsgiverpåslag" k="paslagPct" {...feltProps} enhet="%" testid="eo-driver-paslag"
                hint={`Fullkost ${kr0(u.fullkostAar)} kr/år → normalisert ${kr0(u.bemanningPerEnhet)} kr per enhet/mnd`} />
            </Seksjon>
            <Seksjon tittel="Anskaffelse & levetid" open={aapne.anskaffelse} onToggle={() => setAapne((a) => ({ ...a, anskaffelse: !a.anskaffelse }))}
              sammendrag={`CAC ${kr0(basis.cac)} · ${kma(basis.aarligChurnPct)} % churn`}>
              <Felt label="CAC / salgsprovisjon" k="cac" {...feltProps} enhet="kr" heltall testid="eo-driver-cac" />
              <Felt label="Årlig churn" k="aarligChurnPct" {...feltProps} enhet="%" testid="eo-driver-churn" slider={{ min: 0, max: 40, step: 0.5 }}
                hint={u.levetidAar !== null ? `≈ ${kma(u.levetidAar)} år forventet levetid per kunde` : 'Ingen churn — uendelig levetid'} />
              <Felt label="LTV-horisont" k="ltvHorisontAar" {...feltProps} enhet="år" heltall testid="eo-driver-horisont"
                hint="Hoved-LTV beregnes over denne horisonten — mer troverdig enn «evig» LTV" />
            </Seksjon>
          </div>
        </aside>

        {/* Høyre: hovedhistorien */}
        <main className="min-w-0 flex-1 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Anatomien til én enhet */}
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-anatomi">
              <p className="text-[13.5px] font-medium text-[#8f8a82]">Anatomien til én enhet</p>
              <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Fra husleie til bidrag — per måned, eks. mva.</p>
              <div className="mt-3 space-y-1.5 text-[13.5px]">
                <div className="flex justify-between"><span className="text-[#8f8a82]">Gjennomsnittlig husleie</span><span className="font-medium text-[#57534e]">{kr0(aktive.snittleie)} kr</span></div>
                <div className="flex justify-between"><span className="text-[#8f8a82]">× Forvaltningshonorar</span><span className="font-medium text-[#57534e]">{kma(aktive.honorarPct)} %</span></div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5"><span className="text-[#57534e]">Honorarinntekt <span className="text-[#a6a19a]">eks. mva</span></span><span className="font-semibold text-[#1c1917]">{kr0(u.honorarInntekt)} kr</span></div>
                {aktive.tilleggPerMnd > 0 && (
                  <div className="flex justify-between"><span className="text-[#57534e]">+ Tilleggstjenester</span><span className="font-semibold text-[#1c1917]">{kr0(aktive.tilleggPerMnd)} kr</span></div>
                )}
                <div className="flex justify-between"><span className="text-[#57534e]">− Systemkostnad</span><span className="font-semibold text-[#1c1917]">{kr0(aktive.systemPerEnhet)} kr</span></div>
                {aktive.andreDirekte > 0 && (
                  <div className="flex justify-between"><span className="text-[#57534e]">− Andre direkte</span><span className="font-semibold text-[#1c1917]">{kr0(aktive.andreDirekte)} kr</span></div>
                )}
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5">
                  <span className="font-semibold text-[#1c1917]">Bidrag før bemanning</span>
                  <span className={`font-bold ${u.bidragFor > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(u.bidragFor)} kr{u.marginFor !== null && <span className="ml-1 text-[11px] font-bold text-[#a6a19a]">({u.marginFor} %)</span>}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534e]">− Normalisert forvalterkost <span className="text-[#c2beb8]" title={`Fullkost ${kr0(u.fullkostAar)} kr ÷ ${kr0(aktive.enheterPerAarsverk)} enheter ÷ 12`}>ⓘ</span></span>
                  <span className="font-semibold text-[#1c1917]">{kr0(u.bemanningPerEnhet)} kr</span>
                </div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5">
                  <span className="font-semibold text-[#1c1917]">Bidrag etter bemanning</span>
                  <span className={`font-bold ${u.bidragEtter > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`} data-testid="eo-anatomi-bidrag-etter">{kr0(u.bidragEtter)} kr{u.marginEtter !== null && <span className="ml-1 text-[11px] font-bold text-[#a6a19a]">({u.marginEtter} %)</span>}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex rounded-full bg-[#f5f4f1] px-3 py-1 text-[12.5px] font-semibold text-[#57534e]">CAC {kr0(aktive.cac)} kr</span>
                <span className="inline-flex rounded-full bg-[#f0ebfa] px-3 py-1 text-[12.5px] font-bold text-[#6d28d9]">Payback før: {paybackTekst(u.paybackFor)}</span>
                <span className="inline-flex rounded-full bg-[#f0ebfa] px-3 py-1 text-[12.5px] font-bold text-[#6d28d9]">Payback etter: {paybackTekst(u.paybackEtter)}</span>
              </div>
            </div>

            {/* Dagens portefølje vs. ny enhet (benchmark) */}
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-portefolje">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13.5px] font-medium text-[#8f8a82]">Dagens portefølje vs. ny enhet</p>
                  <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Faktiske tall er vektet (sum honorar ÷ sum leie) — ikke aritmetisk snitt.</p>
                </div>
                {erAdmin && portefolje && portefolje.antallAktive > 0 && (
                  <button onClick={brukPortefoljesnitt} data-testid="eo-bruk-snitt"
                    className="shrink-0 rounded-[8px] bg-[#f5f4f1] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#57534e] transition-colors hover:bg-[#eceae6] hover:text-[#1c1917]">
                    Bruk porteføljesnitt
                  </button>
                )}
              </div>
              {portefolje && portefolje.antallAktive > 0 ? (
                <table className="mt-3 w-full text-[13px]">
                  <thead>
                    <tr className="text-[10.5px] uppercase tracking-[0.06em] text-[#a6a19a]">
                      <th className="pb-1.5 text-left font-semibold">&nbsp;</th>
                      <th className="pb-1.5 text-right font-bold">Dagens portefølje</th>
                      <th className="pb-1.5 text-right font-bold text-[#6d28d9]">Ny enhet · modell</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-black/[0.04]">
                      <td className="py-1.5 text-[#8f8a82]">Enheter</td>
                      <td className="py-1.5 text-right font-medium text-[#57534e]">{portefolje.antallAktive} aktive</td>
                      <td className="py-1.5 text-right font-medium text-[#57534e]">1 ny</td>
                    </tr>
                    <tr className="border-t border-black/[0.04]">
                      <td className="py-1.5 text-[#8f8a82]">Snittleie</td>
                      <td className="py-1.5 text-right font-medium text-[#57534e]">{kr0(portefolje.snittleie)} kr</td>
                      <td className="py-1.5 text-right font-semibold text-[#1c1917]">{kr0(aktive.snittleie)} kr</td>
                    </tr>
                    <tr className="border-t border-black/[0.04]">
                      <td className="py-1.5 text-[#8f8a82]">Vektet honorar</td>
                      <td className="py-1.5 text-right font-medium text-[#57534e]">{portefolje.vektetHonorarPct === null ? '—' : `${kma(portefolje.vektetHonorarPct)} %`}</td>
                      <td className="py-1.5 text-right font-semibold text-[#1c1917]">{kma(aktive.honorarPct)} %</td>
                    </tr>
                    <tr className="border-t border-black/[0.04]">
                      <td className="py-1.5 text-[#8f8a82]">Inntekt per enhet <span className="text-[#c2beb8]">eks. mva</span></td>
                      <td className="py-1.5 text-right font-medium text-[#57534e]">{kr0(portefolje.inntektPerEnhet)} kr</td>
                      <td className="py-1.5 text-right font-semibold text-[#1c1917]">{kr0(u.inntekt)} kr</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="mt-4 text-[12.5px] text-[#a6a19a]">Ingen aktive enheter i porteføljen ennå — modellen kjører på egne antakelser.</p>
              )}
              {portefolje && portefolje.antallAktive > 0 && portefolje.inntektPerEnhet > 0 && (
                <p className="mt-3 rounded-[10px] bg-[#faf9f7] px-3 py-2 text-[12px] leading-snug text-[#78716c]" data-testid="eo-benchmark-delta">
                  {u.inntekt >= portefolje.inntektPerEnhet
                    ? <>Nye enheter modelleres <b className="text-[#0a7d55]">{Math.round(((u.inntekt / portefolje.inntektPerEnhet) - 1) * 100)} % bedre</b> enn porteføljesnittet i inntekt per enhet.</>
                    : <>Nye enheter modelleres <b className="text-[#b3562e]">{Math.round((1 - (u.inntekt / portefolje.inntektPerEnhet)) * 100)} % lavere</b> enn porteføljesnittet i inntekt per enhet.</>}
                </p>
              )}
            </div>
          </div>

          {/* Livsløpsøkonomi */}
          <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[13.5px] font-medium text-[#8f8a82]">Livsløpsøkonomi — én enhet fra dag null</p>
                <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">
                  Vi investerer {kr0(u.nettoCac)} kr i dag{u.paybackEtter !== null || u.paybackFor !== null
                    ? <>, er tilbake i null etter {paybackTekst(visning === 'etter' ? u.paybackEtter : u.paybackFor)} — resten av levetiden er positiv kontantgenerering.</>
                    : '.'}
                  {' '}Viser {visning === 'etter' ? 'bidrag etter normalisert bemanning' : 'bidrag før bemanning'}.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <LivslopGraf u={u} visning={visning} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Før vs. etter normalisert bemanning */}
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-foretter">
              <p className="text-[13.5px] font-medium text-[#8f8a82]">Før vs. etter normalisert bemanning</p>
              <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Før: marginaløkonomien ved ledig kapasitet. Etter: økonomien i en fullt skalert virksomhet.</p>
              <table className="mt-3 w-full text-[13px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.06em] text-[#a6a19a]">
                    <th className="pb-1.5 text-left font-semibold">&nbsp;</th>
                    <th className="pb-1.5 text-right font-bold">Før bemanning</th>
                    <th className="pb-1.5 text-right font-bold">Etter bemanning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">Inntekt</td>
                    <td className="py-1.5 text-right font-medium text-[#57534e]">{kr0(u.inntekt)}</td>
                    <td className="py-1.5 text-right font-medium text-[#57534e]">{kr0(u.inntekt)}</td>
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">Direkte kostnader</td>
                    <td className="py-1.5 text-right font-medium text-[#57534e]">−{kr0(u.direkte)}</td>
                    <td className="py-1.5 text-right font-medium text-[#57534e]">−{kr0(u.direkte)}</td>
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">Bemanning</td>
                    <td className="py-1.5 text-right font-medium text-[#a6a19a]">—</td>
                    <td className="py-1.5 text-right font-medium text-[#57534e]">−{kr0(u.bemanningPerEnhet)}</td>
                  </tr>
                  <tr className="border-t border-black/[0.06]">
                    <td className="py-1.5 font-semibold text-[#1c1917]">Bidrag</td>
                    <td className={`py-1.5 text-right font-bold ${u.bidragFor > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(u.bidragFor)}</td>
                    <td className={`py-1.5 text-right font-bold ${u.bidragEtter > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(u.bidragEtter)}</td>
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">Margin</td>
                    <td className="py-1.5 text-right font-medium text-[#57534e]">{u.marginFor === null ? '—' : `${u.marginFor} %`}</td>
                    <td className="py-1.5 text-right font-medium text-[#57534e]">{u.marginEtter === null ? '—' : `${u.marginEtter} %`}</td>
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">CAC payback</td>
                    <td className="py-1.5 text-right font-semibold text-[#6d28d9]">{paybackTekst(u.paybackFor)}</td>
                    <td className="py-1.5 text-right font-semibold text-[#6d28d9]">{paybackTekst(u.paybackEtter)}</td>
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-[#8f8a82]">LTV/CAC · {aktive.ltvHorisontAar} år</td>
                    <td className="py-1.5 text-right font-semibold text-[#57534e]">{u.ltvCacFor === null ? '—' : `${kma(u.ltvCacFor)}×`}</td>
                    <td className="py-1.5 text-right font-semibold text-[#57534e]">{u.ltvCacEtter === null ? '—' : `${kma(u.ltvCacEtter)}×`}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* LTV — behandlet forsiktig */}
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-ltv">
              <p className="text-[13.5px] font-medium text-[#8f8a82]">Levetidsverdi (LTV) — {visning === 'etter' ? 'etter bemanning' : 'før bemanning'}</p>
              <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Overlevelsesvektet: hver måned teller med sannsynligheten for at kunden fortsatt er der.</p>
              <div className="mt-3 space-y-1.5 text-[13.5px]">
                <div className="flex justify-between"><span className="text-[#8f8a82]">Forventet levetid <span className="text-[#c2beb8]">(fra {kma(aktive.aarligChurnPct)} % churn)</span></span><span className="font-semibold text-[#1c1917]">{u.levetidAar === null ? 'Uendelig' : `${kma(u.levetidAar)} år`}</span></div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5"><span className="text-[#8f8a82]">LTV over 3 år</span><span className="font-semibold text-[#1c1917]">{kr0(valgt.ltv.aar3)} kr</span></div>
                <div className="flex justify-between"><span className="text-[#8f8a82]">LTV over 5 år</span><span className="font-semibold text-[#1c1917]">{kr0(valgt.ltv.aar5)} kr</span></div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#1c1917]">LTV over {aktive.ltvHorisontAar} år <span className="text-[10.5px] font-bold text-[#6d28d9]">valgt horisont</span></span>
                  <span className="font-bold text-[#1c1917]">{kr0(valgt.ltv.horisont)} kr</span>
                </div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5"><span className="text-[#8f8a82]">Teoretisk churn-basert LTV <span className="text-[#c2beb8]">(uendelig horisont)</span></span><span className="font-medium text-[#57534e]">{valgt.ltv.teoretisk === null ? '—' : `${kr0(valgt.ltv.teoretisk)} kr`}</span></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className={`inline-flex rounded-full px-3 py-1 text-[13px] font-bold ${valgt.ltvCac !== null && valgt.ltvCac >= 3 ? 'bg-[#e7f4ee] text-[#0a7d55]' : 'bg-[#fdf3e0] text-[#9a6b1c]'}`}>
                  LTV/CAC: {valgt.ltvCac === null ? '—' : `${kma(valgt.ltvCac)}×`}
                </span>
                <span className="inline-flex rounded-full bg-[#f5f4f1] px-3 py-1 text-[12.5px] font-semibold text-[#57534e]">Netto CAC {kr0(u.nettoCac)} kr</span>
              </div>
              <p className="mt-2.5 text-[10.5px] leading-snug text-[#c2beb8]">For investorcaset er 3–5 års LTV mer troverdig enn «evig» LTV — lav churn kan implisere urealistisk lang levetid.</p>
            </div>
          </div>

          {/* Scenarioer */}
          <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-scenarioer">
            <p className="text-[13.5px] font-medium text-[#8f8a82]">Scenarioer — hvor robust er økonomien?</p>
            <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Tre sett kommersielle drivere. Klikk knappene øverst for å se hele siden i et scenario.</p>
            <div className="mt-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.06em] text-[#a6a19a]">
                    <th className="pb-1.5 text-left font-semibold">&nbsp;</th>
                    {scenarioer.map((sc) => (
                      <th key={sc.sc} className={`pb-1.5 text-right font-bold ${sc.sc === scenario ? 'text-[#6d28d9]' : ''}`}>{sc.navn}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Honorar', (x) => `${kma(x.d.honorarPct)} %`],
                    ['Snittleie', (x) => `${kr0(x.d.snittleie)} kr`],
                    ['Enheter/årsverk', (x) => kr0(x.d.enheterPerAarsverk)],
                    ['CAC', (x) => `${kr0(x.d.cac)} kr`],
                    ['Årlig churn', (x) => `${kma(x.d.aarligChurnPct)} %`],
                  ].map(([lbl, f]) => (
                    <tr key={lbl} className="border-t border-black/[0.04]">
                      <td className="py-1.5 text-[#8f8a82]">{lbl}</td>
                      {scenarioer.map((sc) => <td key={sc.sc} className={`py-1.5 text-right font-medium ${sc.sc === scenario ? 'text-[#1c1917]' : 'text-[#57534e]'}`}>{f(sc)}</td>)}
                    </tr>
                  ))}
                  <tr className="border-t border-black/[0.06]">
                    <td className="py-1.5 font-semibold text-[#1c1917]">Bidrag etter bemanning</td>
                    {scenarioer.map((sc) => (
                      <td key={sc.sc} className={`py-1.5 text-right font-bold ${sc.u.bidragEtter > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(sc.u.bidragEtter)} kr</td>
                    ))}
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 font-semibold text-[#1c1917]">CAC payback</td>
                    {scenarioer.map((sc) => <td key={sc.sc} className="py-1.5 text-right font-bold text-[#6d28d9]">{paybackTekst(sc.u.paybackEtter)}</td>)}
                  </tr>
                  <tr className="border-t border-black/[0.04]">
                    <td className="py-1.5 font-semibold text-[#1c1917]">LTV/CAC · {basis.ltvHorisontAar} år</td>
                    {scenarioer.map((sc) => <td key={sc.sc} className="py-1.5 text-right font-bold text-[#1c1917]">{sc.u.ltvCacEtter === null ? '—' : `${kma(sc.u.ltvCacEtter)}×`}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2.5 text-[10.5px] leading-snug text-[#c2beb8]">Konservativ: −2 pp honorar · −20 % leie · −25 % kapasitet · +50 % CAC · dobbel churn. Ambisiøs: +0,5 pp honorar · +7 % leie · +12,5 % kapasitet · −20 % CAC · −30 % churn.</p>
          </div>

          {/* 2D-sensitivitet */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Matrise
              tittel={`CAC payback — honorar vs. CAC (${visning === 'etter' ? 'etter' : 'før'} bemanning)`}
              under="Måneder før anskaffelseskostnaden er tilbakebetalt."
              rader={paybackRader} kolonner={paybackKolonner}
              radFmt={(r) => `${kma(r)} %`} kolFmt={(k) => `CAC ${kr0(k)}`}
              verdi={(r, k) => {
                const uu = beregnEnhet({ ...aktive, honorarPct: r, cac: k });
                return visning === 'etter' ? uu.paybackEtter : uu.paybackFor;
              }}
              fmt={(v) => `${kma(v)} mnd`} bedre="lav"
              fremhevRad={aktive.honorarPct} fremhevKol={aktive.cac}
              testid="eo-matrise-payback" />
            <Matrise
              tittel="Bidrag per enhet — kapasitet vs. husleie (etter bemanning)"
              under="Hvor modellen begynner å bli svak — kr per enhet per måned."
              rader={bidragRader} kolonner={bidragKolonner}
              radFmt={(r) => `${kr0(r)} enh/åv`} kolFmt={(k) => `${kr0(k)} kr`}
              verdi={(r, k) => beregnEnhet({ ...aktive, enheterPerAarsverk: r, snittleie: k }).bidragEtter}
              fmt={(v) => `${kr0(v)}`} bedre="hoy"
              fremhevRad={aktive.enheterPerAarsverk} fremhevKol={aktive.snittleie}
              testid="eo-matrise-bidrag" />
          </div>

          {/* Prisverktøy — minimum attraktiv enhet */}
          <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-prisverktoy">
            <p className="text-[13.5px] font-medium text-[#8f8a82]">Prisverktøy — bør vi ta denne kunden?</p>
            <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Beregner minstepris fra kostnadsstrukturen og ønsket bidragsmargin etter normalisert bemanning. Endrer ingenting — bare et regnestykke.</p>
            <div className="mt-3 grid gap-4 md:grid-cols-[280px_1fr]">
              <div className="space-y-2.5">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Husleie</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input value={visTall(pvLeie)} inputMode="numeric" data-testid="eo-pv-leie"
                      onChange={(e) => setPvLeie(e.target.value.replace(/[^\d]/g, ''))}
                      className="h-9 w-full rounded-[8px] bg-[#f5f4f1] px-2.5 text-right text-[14px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                    <span className="w-14 text-[11px] text-[#a6a19a]">kr/mnd</span>
                  </div>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Honorar i dag</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input value={pvSats} inputMode="decimal" data-testid="eo-pv-sats"
                      onChange={(e) => setPvSats(e.target.value)}
                      className="h-9 w-full rounded-[8px] bg-[#f5f4f1] px-2.5 text-right text-[14px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                    <span className="w-14 text-[11px] text-[#a6a19a]">%</span>
                  </div>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Ønsket bidragsmargin</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input value={pvMargin} inputMode="decimal" data-testid="eo-pv-margin"
                      onChange={(e) => setPvMargin(e.target.value)}
                      className="h-9 w-full rounded-[8px] bg-[#f5f4f1] px-2.5 text-right text-[14px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                    <span className="w-14 text-[11px] text-[#a6a19a]">%</span>
                  </div>
                  <span className="mt-1 block text-[10.5px] text-[#c2beb8]">Etter normalisert bemanning</span>
                </label>
              </div>
              <div className="space-y-3">
                <div className="rounded-[12px] bg-[#faf9f7] p-3.5">
                  <p className="text-[12.5px] text-[#78716c]">
                    Ved <b>{kr0(pv.leie)} kr</b> husleie må honoraret være minst
                  </p>
                  <p className="mt-0.5 text-[26px] font-bold tracking-[-0.015em] text-[#6d28d9]" style={heading} data-testid="eo-pv-anbefalt">
                    {pv.anbefaltSats === null ? '—' : `${kma(pv.anbefaltSats)} %`}
                  </p>
                  <p className="text-[12px] text-[#a6a19a]">
                    for {kma(pv.maal)} % bidragsmargin etter bemanning
                    {pv.vedAnbefalt && pv.vedAnbefalt.paybackEtter !== null ? ` · gir payback på ${kma(pv.vedAnbefalt.paybackEtter)} mnd` : ''}
                  </p>
                  <p className="mt-2 border-t border-black/[0.05] pt-2 text-[12.5px] text-[#78716c]">
                    Ved dagens honorar (<b>{kma(pv.sats)} %</b>) må husleien være minst{' '}
                    <b className="text-[#1c1917]" data-testid="eo-pv-minleie">{pv.minsteLeie === null ? '—' : `${kr0(pv.minsteLeie)} kr`}</b>.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Minste attraktive husleie per honorarsats · {kma(pv.maal)} % mål</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="eo-pv-satstabell">
                    {pv.satsTabell.map((r) => (
                      <span key={r.sats} className={`inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12.5px] ${r.sats === aktive.honorarPct ? 'bg-[#f0ebfa] font-bold text-[#6d28d9]' : 'bg-[#f5f4f1] font-medium text-[#57534e]'}`}>
                        {kma(r.sats)} % <ArrowRight className="h-3 w-3 opacity-50" /> {kr0(r.leie)} kr
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modellforklaring — investorvennlig transparens */}
          <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="eo-forklaring">
            <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#8f8a82]"><Info className="h-3.5 w-3.5" /> Slik regner modellen</p>
            <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
              {[
                ['Normalisert bemanning', `Beregnet andel av en fulltidsforvalter per enhet: fullkost ${kr0(u.fullkostAar)} kr/år ÷ ${kr0(aktive.enheterPerAarsverk)} enheter ÷ 12 = ${kr0(u.bemanningPerEnhet)} kr/mnd. «Før bemanning» viser marginaløkonomien når det er ledig kapasitet; «etter» viser en fullt skalert virksomhet.`],
                ['Honorar og mva', `Honorarsatsen oppgis inkl. mva (privatmarkedet); inntekten bokføres eks. mva (÷1,25). ${kma(aktive.honorarPct)} % av ${kr0(aktive.snittleie)} kr gir derfor ${kr0(u.honorarInntekt)} kr/mnd.`],
                ['CAC og payback', `CAC er kostnaden for å skaffe én ny enhet (provisjon/markedsføring). Oppstartshonorar trekkes fra: netto ${kr0(u.nettoCac)} kr. Payback = netto CAC ÷ månedsbidrag.`],
                ['Churn, levetid og LTV', `${kma(aktive.aarligChurnPct)} % årlig churn tilsvarer ${kma(Math.round(u.mChurn * 1000) / 10)} % per måned → forventet levetid ${u.levetidAar === null ? 'uendelig' : `${kma(u.levetidAar)} år`}. LTV er overlevelsesvektet sum av bidrag over valgt horisont — mer edruelig enn evig LTV.`],
              ].map(([t, tekst]) => (
                <div key={t}>
                  <p className="text-[12.5px] font-bold text-[#1c1917]">{t}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[#8f8a82]">{tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
