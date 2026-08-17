'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   BudsjettModell — «Investormodell»-cockpit i fullbredde.
   · Venstre: sticky driver-rail (forutsetninger + bemanningstrapp) med slidere
     på de myke driverne og endrings-indikatorer.
   · Høyre: nøkkeltall (inkl. maks kapitalbehov), graf, finansmatrise
     (måneder/kvartaler som KOLONNER, resultatlinjer nedover, totalt-kolonne),
     og automatisk tornado-sensitivitet (±10 % per driver).
   · Samme rene motor (lib/budsjett-modell.js) på klient og server —
     alt omberegnes umiddelbart når en driver endres.
   · Investor (readOnly): identisk visning, drivere synlige men låst.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Trash2, RefreshCw, Loader2, Check, Eye, EyeOff, Plus, X, RotateCcw,
} from 'lucide-react';
import { beregnInvestorModell, rensModellDrivere } from '@/lib/budsjett-modell';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const KNAPP_PRIMAER = 'flex h-9 items-center gap-1.5 rounded-[9px] bg-[#141414] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/80 active:scale-[0.98] disabled:opacity-40';

const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO')} kr`;
const kr0 = (n) => Math.round(Number(n) || 0).toLocaleString('nb-NO');
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => {
  const { y, m } = ymDeler(ym);
  const t = y * 12 + (m - 1) + i;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const mndKort = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}. ${String(y).slice(2)}` : ym; };
const mndLang = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}. ${y}` : ym; };
const stor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ── Driverfelt: etikett + tall + valgfri slider + endrings-prikk ── */
const Felt = ({ label, k, drivere, sanert, lagret, onEndre, enhet, hint, slider, readOnly, testid }) => {
  const endret = lagret && sanert && Math.abs((sanert[k] ?? 0) - (lagret[k] ?? 0)) > 1e-9;
  return (
    <div className="py-[7px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[12.5px] text-[#57534e]">{label}</span>
          {endret && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d28d9]" title="Endret siden sist lagring" />}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {readOnly ? (
            <span className="text-[12.5px] font-semibold text-[#1c1917]">{String(drivere[k]).replace('.', ',')}</span>
          ) : (
            <input value={drivere[k]} inputMode="decimal" data-testid={testid} onChange={(e) => onEndre(k, e.target.value)}
              className="h-7 w-[84px] rounded-[7px] border border-black/[0.08] bg-white px-2 text-right text-[12.5px] font-semibold text-[#1c1917] outline-none transition-colors focus:border-[#6d28d9]/50" />
          )}
          <span className="w-11 text-[10.5px] text-[#a6a19a]">{enhet}</span>
        </span>
      </div>
      {slider && !readOnly && (
        <input type="range" min={slider.min} max={slider.max} step={slider.step} value={Math.min(slider.max, Math.max(slider.min, sanert?.[k] ?? slider.min))}
          onChange={(e) => onEndre(k, e.target.value)} aria-label={label}
          className="mt-1 h-[3px] w-full cursor-pointer appearance-none rounded-full bg-black/[0.08] accent-[#6d28d9]" />
      )}
      {hint && <p className="mt-0.5 text-[10.5px] text-[#a6a19a]">{hint}</p>}
    </div>
  );
};

const SeksjonTittel = ({ tittel, sammendrag }) => (
  <div className="mt-4 flex items-baseline justify-between gap-2 first:mt-0">
    <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">{tittel}</p>
    {sammendrag && <p className="truncate text-[10.5px] text-[#c2beb8]">{sammendrag}</p>}
  </div>
);

/* ── Graf: stablede inntektssøyler + kostnadslinje ── */
const Graf = ({ m, startYm }) => {
  const N = m.N;
  const W = 960, H = 150;
  const maks = Math.max(...m.inntekt, ...m.kostSum, 1);
  const yS = (H - 6) / maks;
  const bw = Math.max(4, (W / N) * 0.68);
  const x = (i) => (W / N) * i + ((W / N) - bw) / 2;
  const hopp = Math.max(1, Math.ceil(N / 10));
  return (
    <div data-testid="modell-graf">
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" style={{ height: 'auto' }}>
        {Array.from({ length: N }, (_, i) => {
          const eksH = m.eksisterende[i] * yS;
          const modH = (m.vekst[i] + m.oppstart[i]) * yS;
          return (
            <g key={i}>
              <rect x={x(i)} y={H - eksH} width={bw} height={Math.max(0, eksH)} rx="1.5" fill="#1c1917" />
              <rect x={x(i)} y={H - eksH - modH} width={bw} height={Math.max(0, modH)} rx="1.5" fill="#c4b5fd" />
              {i % hopp === 0 && (
                <text x={x(i) + bw / 2} y={H + 13} textAnchor="middle" fontSize="10" fill="#a6a19a">{mndKort(ymPluss(startYm, i))}</text>
              )}
            </g>
          );
        })}
        <polyline
          points={Array.from({ length: N }, (_, i) => `${x(i) + bw / 2},${H - m.kostSum[i] * yS}`).join(' ')}
          fill="none" stroke="#b3261e" strokeWidth="1.6" strokeLinejoin="round" opacity="0.85"
        />
      </svg>
      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[11.5px] text-[#8f8a82]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#1c1917]" /> Kontraktsfestet (dagens portefølje)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#c4b5fd]" /> Modellert vekst</span>
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4 rounded bg-[#b3261e]" /> Kostnader</span>
      </div>
    </div>
  );
};

/* ── Bemanningskurve: glidende behov (grå) vs. budsjettert trapp (lilla) ── */
const TrappKurve = ({ m }) => {
  const N = m.N;
  const W = 280, H = 56;
  const behov = m.behovAarsverk.map((a) => a * 100);
  const maks = Math.max(...behov, ...m.budsjettertPct, 10) * 1.15;
  const x = (i) => (W / Math.max(1, N - 1)) * i;
  const y = (v) => H - (v / maks) * H;
  const steg = [];
  for (let i = 0; i < N; i++) {
    if (i === 0) steg.push(`${x(0)},${y(m.budsjettertPct[0])}`);
    else {
      steg.push(`${x(i)},${y(m.budsjettertPct[i - 1])}`);
      steg.push(`${x(i)},${y(m.budsjettertPct[i])}`);
    }
  }
  return (
    <div className="mt-2" data-testid="modell-trappkurve">
      <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full" style={{ height: 'auto' }}>
        <polyline points={Array.from({ length: N }, (_, i) => `${x(i)},${y(behov[i])}`).join(' ')} fill="none" stroke="#c2beb8" strokeWidth="1.3" strokeDasharray="3 2.5" />
        <polyline points={steg.join(' ')} fill="none" stroke="#6d28d9" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex items-center gap-3 text-[10.5px] text-[#a6a19a]">
        <span className="flex items-center gap-1"><span className="h-[2px] w-3.5 rounded bg-[#6d28d9]" /> Budsjettert</span>
        <span className="flex items-center gap-1"><span className="h-[2px] w-3.5 rounded border-b border-dashed border-[#c2beb8]" style={{ background: 'transparent' }} /> Kapasitetsbehov</span>
      </div>
    </div>
  );
};

export default function BudsjettModell({ plan, api, readOnly = false, onTilbake, onEndret }) {
  const [navn, setNavn] = useState(plan.navn);
  const [investorSynlig, setInvestorSynlig] = useState(Boolean(plan.investorSynlig));
  const [drivere, setDrivere] = useState(() => ({ ...rensModellDrivere(plan.drivere) }));
  const [lagretDrivere, setLagretDrivere] = useState(() => rensModellDrivere(plan.drivere));
  const [fakta, setFakta] = useState(plan.fakta || { eksisterende: [], enheter: [], oppdatertAt: null });
  const [skittent, setSkittent] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [feil, setFeil] = useState('');
  const [henterFakta, setHenterFakta] = useState(false);
  const [visning, setVisning] = useState('mnd'); // 'mnd' | 'kvartal'
  const [sletteBekreft, setSletteBekreft] = useState(false);

  // Hele modellen omberegnes umiddelbart når en driver endres.
  const m = useMemo(
    () => beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere }),
    [plan.antallMnd, fakta, drivere],
  );
  const sanert = m.drivere;

  const settDriver = (k, v) => { setDrivere((d) => ({ ...d, [k]: v })); setSkittent(true); };
  const settTrinn = (i, felt, v) => {
    setDrivere((d) => ({ ...d, bemanningstrinn: d.bemanningstrinn.map((t, j) => (j === i ? { ...t, [felt]: v } : t)) }));
    setSkittent(true);
  };
  const leggTrinn = () => {
    setDrivere((d) => {
      const siste = d.bemanningstrinn[d.bemanningstrinn.length - 1] || { fraEnheter: 0, prosent: 30 };
      return { ...d, bemanningstrinn: [...d.bemanningstrinn, { fraEnheter: Number(siste.fraEnheter || 0) + 50, prosent: Math.min(2000, Number(siste.prosent || 0) + 25) }] };
    });
    setSkittent(true);
  };
  const fjernTrinn = (i) => { setDrivere((d) => ({ ...d, bemanningstrinn: d.bemanningstrinn.filter((_, j) => j !== i) })); setSkittent(true); };
  const tilbakestill = () => { setDrivere({ ...lagretDrivere }); setSkittent(false); };

  const lagre = useCallback(async (overstyr = {}) => {
    if (lagrer) return;
    setLagrer(true); setFeil('');
    try {
      await api('plan', {
        method: 'PUT',
        body: {
          id: plan.id, type: 'modell',
          navn: (overstyr.navn ?? navn) || 'Investormodell',
          startYm: plan.startYm, antallMnd: plan.antallMnd,
          status: plan.status, notat: plan.notat || '',
          investorSynlig: overstyr.investorSynlig ?? investorSynlig,
          drivere: overstyr.drivere ?? drivere,
          fakta: overstyr.fakta ?? fakta,
        },
      });
      setLagretDrivere(rensModellDrivere(overstyr.drivere ?? drivere));
      setSkittent(false); setLagret(true); setTimeout(() => setLagret(false), 1800);
      onEndret?.();
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  }, [api, plan, navn, investorSynlig, drivere, fakta, lagrer, onEndret]);

  const oppdaterFakta = async () => {
    if (henterFakta) return;
    setHenterFakta(true); setFeil('');
    try {
      const f = await api(`plan/forslag?startYm=${plan.startYm}&antallMnd=${plan.antallMnd}`);
      setFakta({
        eksisterende: (f.sikret || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        enheter: (f.enheterSerie || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        oppdatertAt: new Date().toISOString(),
      });
      setSkittent(true);
    } catch (e) { setFeil(e.message); }
    setHenterFakta(false);
  };

  const slett = async () => {
    try { await api(`plan?id=${encodeURIComponent(plan.id)}`, { method: 'DELETE' }); onTilbake?.(true); }
    catch (e) { setFeil(e.message); }
  };

  /* ── Tornado-sensitivitet: ±10 % per driver → effekt på periodens resultat ── */
  const tornado = useMemo(() => {
    const basis = m.sammendrag.resultat;
    const kandidater = [
      ['nyePerMnd', 'Nye enheter per måned'], ['aarligChurnPct', 'Årlig churn'],
      ['snittleieNye', 'Snittleie nye enheter'], ['honorarPctNye', 'Honorar-% nye'],
      ['oppstartPerEnhet', 'Oppstartshonorar'], ['systemPerEnhet', 'Systemkostnad per enhet'],
      ['enheterPerAarsverk', 'Kapasitet per årsverk'], ['aarslonn', 'Årslønn'],
      ['paslagPct', 'Arbeidsgiverpåslag'], ['mfFast', 'Fast markedsføring'],
      ['provisjonPerNyEnhet', 'Salgsprovisjon (CAC)'], ['adminFast', 'Administrasjon'],
      ['andreFaste', 'Andre faste'],
    ];
    const rader = kandidater.map(([k, label]) => {
      const v = sanert[k];
      if (!Number.isFinite(v) || v === 0) return null;
      const opp = beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere: { ...sanert, [k]: v * 1.1 } }).sammendrag.resultat - basis;
      const ned = beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere: { ...sanert, [k]: v * 0.9 } }).sammendrag.resultat - basis;
      const spenn = (Math.abs(opp) + Math.abs(ned)) / 2;
      if (spenn < 1) return null;
      return { k, label, opp, spenn };
    }).filter(Boolean).sort((a, b) => b.spenn - a.spenn).slice(0, 7);
    return { rader, maks: Math.max(...rader.map((r) => r.spenn), 1) };
  }, [m, sanert, fakta, plan.antallMnd]);

  /* ── Matrise: perioder (måned/kvartal) som kolonner ── */
  const perioder = useMemo(() => {
    if (visning === 'mnd') return Array.from({ length: m.N }, (_, i) => ({ label: stor(mndKort(ymPluss(plan.startYm, i))), idx: [i] }));
    const grupper = [];
    for (let i = 0; i < m.N; i++) {
      const { y, m: mm } = ymDeler(ymPluss(plan.startYm, i));
      const key = `Q${Math.floor((mm - 1) / 3) + 1} ${String(y).slice(2)}`;
      const siste = grupper[grupper.length - 1];
      if (siste && siste.label === key) siste.idx.push(i); else grupper.push({ label: key, idx: [i] });
    }
    return grupper;
  }, [visning, m.N, plan.startYm]);

  const flyt = (serie, idx) => idx.reduce((s, i) => s + (serie[i] || 0), 0);
  const beholdning = (serie, idx) => serie[idx[idx.length - 1]] || 0;

  const matriseRader = useMemo(() => {
    const alleNull = (serie) => serie.every((v) => !v);
    const r = [];
    r.push({ label: 'Enheter under forvaltning', serie: m.enheter, type: 'stock', info: true, fmt: (v) => String(Math.round(v)) });
    r.push({ header: 'Inntekter' });
    r.push({ label: 'Portefølje (kontraktsfestet)', serie: m.eksisterende });
    r.push({ label: 'Modellert vekst', serie: m.vekst, lilla: true });
    if (!alleNull(m.oppstart)) r.push({ label: 'Oppstartshonorar', serie: m.oppstart, lilla: true });
    r.push({ label: 'Sum inntekter', serie: m.inntekt, sum: true });
    r.push({ header: 'Kostnader' });
    r.push({ label: 'System', serie: m.kost.system });
    r.push({ label: 'Bemanning', serie: m.kost.bemanning });
    r.push({ label: 'Bemanning, budsjettert %', serie: m.budsjettertPct, type: 'stock', info: true, fmt: (v) => `${v} %` });
    if (!alleNull(m.kost.mfFast)) r.push({ label: 'Fast markedsføring', serie: m.kost.mfFast });
    if (!alleNull(m.kost.provisjon)) r.push({ label: 'Salgsprovisjon (CAC)', serie: m.kost.provisjon });
    if (!alleNull(m.kost.admin)) r.push({ label: 'Administrasjon', serie: m.kost.admin });
    if (!alleNull(m.kost.andre)) r.push({ label: 'Andre faste', serie: m.kost.andre });
    r.push({ label: 'Sum kostnader', serie: m.kostSum, sum: true });
    r.push({ label: 'Resultat', serie: m.resultat, resultat: true });
    r.push({ label: 'Akkumulert resultat', serie: m.akkumulert, type: 'stock', akk: true });
    return r;
  }, [m]);

  const s = m.sammendrag;
  const breakEvenTekst = s.breakEvenIdx === null ? 'Nås ikke i perioden'
    : s.breakEvenIdx === 0 ? 'Lønnsom fra start'
      : stor(mndLang(ymPluss(plan.startYm, s.breakEvenIdx)));
  const fullkost = Math.round(sanert.aarslonn * (1 + sanert.paslagPct / 100));
  const sisteIdx = m.N - 1;
  const antallEndret = ['nyePerMnd', 'aarligChurnPct', 'snittleieNye', 'honorarPctNye', 'oppstartPerEnhet', 'systemPerEnhet', 'enheterPerAarsverk', 'aarslonn', 'paslagPct', 'mfFast', 'provisjonPerNyEnhet', 'adminFast', 'andreFaste']
    .filter((k) => Math.abs((sanert[k] ?? 0) - (lagretDrivere[k] ?? 0)) > 1e-9).length;

  const Nokkel = ({ tittel, verdi, under, farge, testid }) => (
    <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
      <p className="text-[11px] font-medium text-[#8f8a82]">{tittel}</p>
      <p className={`mt-1 truncate text-[19px] font-bold tracking-[-0.01em] ${farge || 'text-[#1c1917]'}`} style={heading} data-testid={testid}>{verdi}</p>
      {under && <p className="truncate text-[11px] text-[#a6a19a]">{under}</p>}
    </div>
  );

  return (
    <div className="w-full" data-testid="modell-editor">
      {/* Topplinje: tilbake + navn + handlinger */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <button onClick={() => onTilbake?.()} data-testid="budsjett-tilbake" className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[#8f8a82] transition-colors hover:text-[#1c1917]">
            <ArrowLeft className="h-3.5 w-3.5" /> Budsjetter
          </button>
          <span className="hidden h-4 w-px bg-black/10 sm:block" />
          {readOnly ? (
            <h2 className="truncate text-[17px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{navn}</h2>
          ) : (
            <input value={navn} maxLength={80} data-testid="modell-navn"
              onChange={(e) => { setNavn(e.target.value); setSkittent(true); }}
              className="-ml-1 w-[240px] min-w-0 rounded-[8px] border border-transparent bg-transparent px-1 text-[17px] font-bold tracking-[-0.01em] text-[#1c1917] outline-none transition-colors hover:border-black/[0.07] focus:border-black/[0.15] sm:w-[320px]" style={heading} />
          )}
          <span className="hidden shrink-0 text-[12.5px] text-[#a6a19a] md:block">
            {stor(mndLang(plan.startYm))} – {mndLang(ymPluss(plan.startYm, plan.antallMnd - 1))} · {plan.antallMnd} mnd
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {skittent && !lagrer && <span className="text-[12px] text-[#a6a19a]">Ulagret</span>}
            <button onClick={() => { const ny = !investorSynlig; setInvestorSynlig(ny); lagre({ investorSynlig: ny }); }}
              data-testid="budsjett-investor-bryter"
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium transition-all ${investorSynlig ? 'bg-[#f0ebfa] text-[#6d28d9]' : 'bg-white text-[#8f8a82] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] hover:text-[#57534e]'}`}>
              {investorSynlig ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {investorSynlig ? 'I investorrommet' : 'Ikke delt'}
            </button>
            <button onClick={() => lagre()} disabled={lagrer || !skittent} data-testid="modell-lagre" className={KNAPP_PRIMAER}>
              {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lagret ? <Check className="h-3.5 w-3.5" /> : null}
              {lagret ? 'Lagret' : 'Lagre'}
            </button>
          </div>
        )}
      </div>

      {feil && <p className="mt-3 text-[13px] text-[#b3261e]" data-testid="modell-feil">{feil}</p>}

      {/* Cockpit: driver-rail + output */}
      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
        {/* ── Venstre: forutsetninger (sticky) ── */}
        <aside className="w-full shrink-0 xl:sticky xl:top-3 xl:max-h-[calc(100vh-24px)] xl:w-[320px] xl:overflow-y-auto" data-testid="modell-drivere">
          <div className="rounded-[14px] bg-white px-4 pb-4 pt-3.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-[#1c1917]" style={heading}>Forutsetninger</p>
              {!readOnly && antallEndret > 0 && (
                <button onClick={tilbakestill} className="flex items-center gap-1 text-[11.5px] font-medium text-[#8f8a82] hover:text-[#1c1917]" title="Tilbakestill til sist lagrede verdier">
                  <RotateCcw className="h-3 w-3" /> Tilbakestill ({antallEndret})
                </button>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[#a6a19a]">Alt til høyre omberegnes umiddelbart.</p>

            <SeksjonTittel tittel="Vekst og inntekt" sammendrag={`${String(sanert.nyePerMnd).replace('.', ',')} nye/mnd · ${String(sanert.aarligChurnPct).replace('.', ',')} % churn`} />
            <Felt label="Nye enheter per måned" k="nyePerMnd" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="enh." readOnly={readOnly} testid="driver-nye" slider={{ min: 0, max: 10, step: 0.5 }} />
            <Felt label="Årlig churn (modellerte enheter)" k="aarligChurnPct" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="%" readOnly={readOnly} testid="driver-churn" slider={{ min: 0, max: 40, step: 1 }} hint={`≈ ${String(s.mndChurnPct).replace('.', ',')} %/mnd — dagens portefølje churnes ikke`} />
            <Felt label="Snittleie nye enheter" k="snittleieNye" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr/mnd" readOnly={readOnly} testid="driver-leie" slider={{ min: 5000, max: 40000, step: 500 }} />
            <Felt label="Honorar nye enheter" k="honorarPctNye" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="%" readOnly={readOnly} testid="driver-honorar" slider={{ min: 0, max: 20, step: 0.5 }} hint={`≈ ${kr0(m.cac.bruttoHonorarNy)} kr eks. mva per enhet/mnd`} />
            <Felt label="Oppstartshonorar per ny enhet" k="oppstartPerEnhet" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr" readOnly={readOnly} testid="driver-oppstart" />

            <SeksjonTittel tittel="Kostnader" sammendrag={`${kr0(sanert.systemPerEnhet)}/enh · CAC ${kr0(sanert.provisjonPerNyEnhet)}`} />
            <Felt label="Systemkostnad per enhet" k="systemPerEnhet" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr/mnd" readOnly={readOnly} testid="driver-system" />
            <Felt label="Fast markedsføring" k="mfFast" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr/mnd" readOnly={readOnly} testid="driver-mf" />
            <Felt label="Salgsprovisjon per ny enhet (CAC)" k="provisjonPerNyEnhet" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr" readOnly={readOnly} testid="driver-cac" />
            <Felt label="Administrasjon" k="adminFast" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr/mnd" readOnly={readOnly} testid="driver-admin" />
            <Felt label="Andre faste kostnader" k="andreFaste" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr/mnd" readOnly={readOnly} testid="driver-andre" />

            <SeksjonTittel tittel="Bemanning — kapasitet" sammendrag={`fullkost ${kr0(fullkost)}/åv`} />
            <Felt label="Kapasitet per årsverk" k="enheterPerAarsverk" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="enh." readOnly={readOnly} testid="driver-kapasitet" slider={{ min: 50, max: 400, step: 10 }} hint="enheter én forvalter (100 %) dekker" />
            <Felt label="Brutto årslønn" k="aarslonn" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="kr/år" readOnly={readOnly} testid="driver-lonn" />
            <Felt label="Arbeidsgiverpåslag" k="paslagPct" drivere={drivere} sanert={sanert} lagret={lagretDrivere} onEndre={settDriver} enhet="%" readOnly={readOnly} testid="driver-paslag" hint={`fullkost: ${kr0(fullkost)} kr per årsverk`} />

            <SeksjonTittel tittel="Bemanning — beslutning" sammendrag={`${sanert.bemanningstrinn.length} trinn`} />
            <p className="mt-1 text-[11px] leading-relaxed text-[#a6a19a]">Budsjettert stillingsprosent i trinn — det dere faktisk betaler for.</p>
            <div className="mt-1">
              {drivere.bemanningstrinn.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 py-1" data-testid={`trinn-${i}`}>
                  <span className="w-6 text-[11.5px] text-[#8f8a82]">Fra</span>
                  {readOnly ? (
                    <span className="text-[12.5px] font-semibold text-[#1c1917]">{t.fraEnheter}</span>
                  ) : (
                    <input value={t.fraEnheter} inputMode="numeric" onChange={(e) => settTrinn(i, 'fraEnheter', e.target.value)} data-testid={`trinn-fra-${i}`}
                      className="h-7 w-[54px] rounded-[7px] border border-black/[0.08] bg-white px-1.5 text-right text-[12.5px] font-semibold outline-none focus:border-[#6d28d9]/50" />
                  )}
                  <span className="text-[11.5px] text-[#8f8a82]">enh. →</span>
                  {readOnly ? (
                    <span className="text-[12.5px] font-semibold text-[#1c1917]">{t.prosent} %</span>
                  ) : (
                    <>
                      <input value={t.prosent} inputMode="decimal" onChange={(e) => settTrinn(i, 'prosent', e.target.value)} data-testid={`trinn-pct-${i}`}
                        className="h-7 w-[52px] rounded-[7px] border border-black/[0.08] bg-white px-1.5 text-right text-[12.5px] font-semibold outline-none focus:border-[#6d28d9]/50" />
                      <span className="text-[11.5px] text-[#8f8a82]">%</span>
                      {drivere.bemanningstrinn.length > 1 && (
                        <button onClick={() => fjernTrinn(i)} className="ml-auto rounded p-1 text-[#c2beb8] transition-colors hover:text-[#c2413b]" title="Fjern trinn"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {!readOnly && drivere.bemanningstrinn.length < 12 && (
                <button onClick={leggTrinn} data-testid="trinn-legg-til" className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[#6d28d9] hover:text-[#4c1d95]">
                  <Plus className="h-3.5 w-3.5" /> Legg til trinn
                </button>
              )}
            </div>
            <TrappKurve m={m} />
            <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-[10px] bg-[#faf9f7] p-2.5 text-[11px]" data-testid="modell-bemanningsstatus">
              <span><span className="block text-[#8f8a82]">Behov v/slutt</span><span className="font-bold text-[#1c1917]">{Math.round((m.behovAarsverk[sisteIdx] || 0) * 100)} %</span></span>
              <span><span className="block text-[#8f8a82]">Budsjettert</span><span className="font-bold text-[#1c1917]">{m.budsjettertPct[sisteIdx]} %</span></span>
              <span><span className="block text-[#8f8a82]">Utnyttelse</span><span className={`font-bold ${(m.utnyttelsePct[sisteIdx] || 0) > 100 ? 'text-[#b3261e]' : 'text-[#0a7d55]'}`}>{m.utnyttelsePct[sisteIdx] === null ? '—' : `${m.utnyttelsePct[sisteIdx]} %`}</span></span>
            </div>
            {(m.utnyttelsePct[sisteIdx] || 0) > 100 && (
              <p className="mt-1.5 text-[11px] text-[#b3261e]">Behovet overstiger budsjettert bemanning — vurder et nytt trinn.</p>
            )}

            <div className="mt-4 border-t border-black/[0.05] pt-3">
              <p className="text-[11px] leading-relaxed text-[#a6a19a]">
                Porteføljefakta: {Math.round(fakta.enheter?.[0] || 0)} enheter · {kr0(fakta.eksisterende?.[0] || 0)} kr/mnd kontraktsfestet
                {fakta.oppdatertAt ? ` · hentet ${new Date(fakta.oppdatertAt).toLocaleDateString('nb-NO')}` : ''}
              </p>
              {!readOnly && (
                <button onClick={oppdaterFakta} disabled={henterFakta} data-testid="modell-oppdater-fakta"
                  className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#6d28d9] transition-colors hover:text-[#4c1d95] disabled:opacity-50">
                  {henterFakta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Oppdater fra leieforholdene
                </button>
              )}
            </div>

            {!readOnly && (
              <div className="mt-3 border-t border-black/[0.05] pt-2.5">
                {!sletteBekreft ? (
                  <button onClick={() => setSletteBekreft(true)} data-testid="budsjett-slett" className="flex items-center gap-1.5 rounded-[7px] px-1 py-1 text-[11.5px] font-medium text-[#c2beb8] transition-colors hover:text-[#c2413b]">
                    <Trash2 className="h-3 w-3" /> Slett budsjett
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <button onClick={slett} data-testid="budsjett-slett-bekreft" className="rounded-[7px] bg-[#fdf0ef] px-2.5 py-1 text-[11.5px] font-bold text-[#c2413b]">Ja, slett</button>
                    <button onClick={() => setSletteBekreft(false)} className="rounded-[7px] px-2 py-1 text-[11.5px] font-medium text-[#a8a29a]">Avbryt</button>
                  </span>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Høyre: output ── */}
        <main className="min-w-0 flex-1">
          {/* Nøkkeltall */}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 2xl:grid-cols-5" data-testid="modell-nokkeltall">
            <Nokkel tittel="Resultat i perioden" verdi={kr(s.resultat)} farge={s.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'} testid="modell-resultat" />
            <Nokkel tittel="Break-even" verdi={breakEvenTekst} under={s.breakEvenIdx !== null && s.breakEvenIdx > 0 ? `ved ~${Math.round(m.enheter[s.breakEvenIdx])} enheter` : undefined} testid="modell-breakeven" />
            <Nokkel tittel="Maks kapitalbehov" verdi={s.kapitalbehov > 0 ? kr(s.kapitalbehov) : 'Ingen'}
              under={s.kapitalbehov > 0 && s.kapitalbehovIdx !== null ? `dypest i ${mndLang(ymPluss(plan.startYm, s.kapitalbehovIdx))}` : 'positiv akkumulert hele veien'}
              farge={s.kapitalbehov > 0 ? 'text-[#1c1917]' : 'text-[#0a7d55]'} testid="modell-kapitalbehov" />
            <Nokkel tittel="Enheter ved slutt" verdi={String(Math.round(m.enheter[sisteIdx] || 0))} under={`${Math.round(fakta.enheter?.[sisteIdx] || 0)} fra dagens portefølje`} />
            <Nokkel tittel="Fra dagens portefølje" verdi={s.andelEksisterendePct === null ? '—' : `${s.andelEksisterendePct} %`} under="av inntekten er kontraktsfestet" testid="modell-andel" />
          </div>

          {/* Graf */}
          <div className="mt-2.5 rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <Graf m={m} startYm={plan.startYm} />
          </div>

          {/* Finansmatrise: måneder/kvartaler bortover */}
          <div className="mt-2.5 rounded-[14px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-3.5">
              <p className="text-[12.5px] font-medium text-[#8f8a82]">Resultatoppstilling <span className="text-[#c2beb8]">· beløp i kr · beregnet fra driverne</span></p>
              <div className="flex items-center gap-0.5 rounded-[8px] bg-[#f0efec] p-0.5" data-testid="modell-visning">
                {[['mnd', 'Måned'], ['kvartal', 'Kvartal']].map(([v, l]) => (
                  <button key={v} onClick={() => setVisning(v)} data-testid={`modell-visning-${v}`}
                    className={`rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium transition-colors ${visning === v ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82] hover:text-[#57534e]'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto pb-1" data-testid="modell-matrise">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.05em] text-[#a6a19a]">
                    <th className="sticky left-0 z-10 bg-white py-2 pl-4 pr-3 text-left font-semibold">&nbsp;</th>
                    {perioder.map((p) => (
                      <th key={p.label} className="whitespace-nowrap px-2 py-2 text-right font-semibold">{p.label}</th>
                    ))}
                    <th className="sticky right-0 z-10 whitespace-nowrap border-l border-black/[0.06] bg-[#faf9f7] py-2 pl-2.5 pr-4 text-right font-semibold text-[#57534e]">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {matriseRader.map((rad, ri) => {
                    if (rad.header) {
                      return (
                        <tr key={ri}>
                          <td className="sticky left-0 z-10 bg-white pb-1 pl-4 pr-3 pt-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">{rad.header}</td>
                          <td colSpan={perioder.length} />
                          <td className="sticky right-0 z-10 border-l border-black/[0.06] bg-[#faf9f7]" />
                        </tr>
                      );
                    }
                    const verdi = (idx) => (rad.type === 'stock' ? beholdning(rad.serie, idx) : flyt(rad.serie, idx));
                    const total = rad.type === 'stock' ? rad.serie[m.N - 1] : rad.serie.reduce((a, b) => a + b, 0);
                    const fmt = rad.fmt || kr0;
                    const celleFarge = (v) => {
                      if (rad.resultat || rad.akk) return v >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]';
                      if (rad.info) return 'text-[#a6a19a]';
                      if (rad.lilla) return 'text-[#6d28d9]';
                      return 'text-[#57534e]';
                    };
                    const vekt = rad.sum || rad.resultat ? 'font-bold' : rad.akk ? 'font-medium' : '';
                    return (
                      <tr key={ri} className={`border-t border-black/[0.04] ${rad.resultat ? 'bg-[#fbfaf8]' : ''}`}>
                        <td className={`sticky left-0 z-10 whitespace-nowrap py-[6px] pl-4 pr-3 text-left ${rad.resultat ? 'bg-[#fbfaf8]' : 'bg-white'} ${rad.sum || rad.resultat ? 'font-bold text-[#1c1917]' : rad.info || rad.akk ? 'text-[#8f8a82]' : 'text-[#57534e]'}`}>
                          {rad.label}
                        </td>
                        {perioder.map((p) => {
                          const v = verdi(p.idx);
                          return <td key={p.label} className={`whitespace-nowrap px-2 py-[6px] text-right ${vekt} ${celleFarge(v)}`}>{fmt(v)}</td>;
                        })}
                        <td className={`sticky right-0 z-10 whitespace-nowrap border-l border-black/[0.06] bg-[#faf9f7] py-[6px] pl-2.5 pr-4 text-right font-bold ${rad.resultat || rad.akk ? (total >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]') : rad.info ? 'text-[#a6a19a]' : 'text-[#1c1917]'}`}>
                          {fmt(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sensitivitet + unit economics */}
          <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
            <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-tornado">
              <p className="text-[12.5px] font-medium text-[#8f8a82]">Sensitivitet — hva betyr mest?</p>
              <p className="mt-0.5 text-[11px] text-[#a6a19a]">Effekt på periodens resultat når hver driver endres ±10 %.</p>
              <div className="mt-3 space-y-2">
                {tornado.rader.map((r) => (
                  <div key={r.k} className="flex items-center gap-2.5">
                    <span className="w-[150px] shrink-0 truncate text-[12px] text-[#57534e]">{r.label}</span>
                    <span className="h-[10px] flex-1 overflow-hidden rounded-full bg-black/[0.04]">
                      <span className={`block h-full rounded-full ${r.opp >= 0 ? 'bg-[#0a7d55]/70' : 'bg-[#b3261e]/60'}`} style={{ width: `${Math.max(3, (r.spenn / tornado.maks) * 100)}%` }} />
                    </span>
                    <span className="w-[104px] shrink-0 text-right text-[11.5px] font-semibold text-[#1c1917]">±{kr0(r.spenn)} kr</span>
                  </div>
                ))}
                {tornado.rader.length === 0 && <p className="text-[12px] text-[#a6a19a]">Sett driverne over 0 for å se sensitivitet.</p>}
              </div>
            </div>
            <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-cac">
              <p className="text-[12.5px] font-medium text-[#8f8a82]">Unit economics per ny enhet</p>
              <div className="mt-3 space-y-1.5 text-[12.5px]">
                <div className="flex justify-between"><span className="text-[#57534e]">Anskaffelseskostnad (CAC)</span><span className="font-semibold text-[#1c1917]">{kr(m.cac.provisjon)}</span></div>
                <div className="flex justify-between"><span className="text-[#57534e]">Månedlig honorar <span className="text-[#a6a19a]">eks. mva</span></span><span className="font-semibold text-[#1c1917]">{kr0(m.cac.bruttoHonorarNy)} kr</span></div>
                <div className="flex justify-between"><span className="text-[#57534e]">− Systemkostnad</span><span className="font-semibold text-[#1c1917]">{kr0(m.cac.systemPerEnhet)} kr</span></div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5"><span className="text-[#57534e]">= Bidrag før bemanning</span><span className={`font-bold ${m.cac.bidrag > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(m.cac.bidrag)} kr/mnd</span></div>
              </div>
              <p className="mt-3 inline-flex rounded-full bg-[#f0ebfa] px-3 py-1 text-[12px] font-bold text-[#6d28d9]" data-testid="modell-payback">
                {m.cac.paybackMnd === null ? (m.cac.bidrag <= 0 ? 'Bidraget dekker ikke systemkostnaden' : 'Ingen CAC') : `CAC payback: ${String(m.cac.paybackMnd).replace('.', ',')} mnd`}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
