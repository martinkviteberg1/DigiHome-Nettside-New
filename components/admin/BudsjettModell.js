'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   BudsjettModell — «Investormodell»-cockpit (hypermoderne utgave).
   · Venstre: sticky driver-rail med KOLLAPSBARE seksjoner (sammendrag i
     headeren når lukket), slidere på myke drivere, endrings-prikker.
   · Høyre: samlet nøkkeltall-linje m/ resultat-sparkline, graf med
     hover-tooltip + break-even-markør + rutenett, finansmatrise
     (måneder/kvartaler bortover, radhover, seksjonsbånd, sticky Totalt),
     tornado-sensitivitet og unit economics.
   · Samme rene motor (lib/budsjett-modell.js) klient/server — alt
     omberegnes umiddelbart. Investor (readOnly): identisk, men låst.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Trash2, RefreshCw, Loader2, Check, Eye, EyeOff, Plus, X, RotateCcw, ChevronDown,
  SlidersHorizontal, PanelLeftClose,
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
const kma = (s) => String(s).replace('.', ',');

/* ── Kollapsbar seksjon i driver-railen ── */
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

/* ── Driverfelt: etikett + tall + valgfri slider + endrings-prikk ── */
const Felt = ({ label, k, drivere, sanert, lagret, onEndre, enhet, hint, slider, readOnly, testid }) => {
  const endret = lagret && sanert && Math.abs((sanert[k] ?? 0) - (lagret[k] ?? 0)) > 1e-9;
  return (
    <div className="py-[7px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13.5px] text-[#57534e]">{label}</span>
          {endret && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d28d9]" title="Endret siden sist lagring" />}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {readOnly ? (
            <span className="text-[13.5px] font-semibold text-[#1c1917]">{kma(drivere[k])}</span>
          ) : (
            <input value={drivere[k]} inputMode="decimal" data-testid={testid} onChange={(e) => onEndre(k, e.target.value)}
              className="h-8 w-[100px] rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13.5px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
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

/* ── Mini-sparkline for resultat per måned (med nullinje) ── */
const Sparkline = ({ serie }) => {
  const N = serie.length;
  if (N < 2) return null;
  const W = 84, H = 26;
  const min = Math.min(...serie, 0), maks = Math.max(...serie, 0);
  const spenn = maks - min || 1;
  const x = (i) => (W / (N - 1)) * i;
  const y = (v) => H - ((v - min) / spenn) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[26px] w-[84px] shrink-0" aria-hidden>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#e7e5e0" strokeWidth="1" strokeDasharray="2 2" />
      <polyline points={serie.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none"
        stroke={serie[N - 1] >= 0 ? '#0a7d55' : '#b3261e'} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
};

/* ── Graf: stablede søyler + kostnadslinje + rutenett + hover + break-even ── */
const Graf = ({ m, startYm }) => {
  const [hov, setHov] = useState(null);
  const N = m.N;
  const W = 960, H = 168, TOPP = 14;
  const maks = Math.max(...m.inntekt, ...m.kostSum, 1);
  const yS = (H - TOPP) / maks;
  const bw = Math.max(5, (W / N) * 0.66);
  const x = (i) => (W / N) * i + ((W / N) - bw) / 2;
  const hopp = Math.max(1, Math.ceil(N / 10));
  const beIdx = m.sammendrag.breakEvenIdx;
  return (
    <div className="relative" data-testid="modell-graf">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: 'auto' }} onMouseLeave={() => setHov(null)}>
        {/* Rutenett */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1="0" x2={W} y1={H - maks * f * yS} y2={H - maks * f * yS} stroke="#f0efec" strokeWidth="1" />
            <text x="2" y={H - maks * f * yS - 3} fontSize="10" fill="#c2beb8">{kr0(maks * f)}</text>
          </g>
        ))}
        {/* Break-even-markør */}
        {beIdx !== null && beIdx > 0 && (
          <g>
            <line x1={x(beIdx) + bw / 2} x2={x(beIdx) + bw / 2} y1={2} y2={H} stroke="#6d28d9" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
            <text x={x(beIdx) + bw / 2 + 4} y={9} fontSize="8.5" fill="#6d28d9" fontWeight="600">Break-even</text>
          </g>
        )}
        {Array.from({ length: N }, (_, i) => {
          const eksH = m.eksisterende[i] * yS;
          const modH = (m.vekst[i] + m.oppstart[i]) * yS;
          const dim = hov !== null && hov !== i;
          return (
            <g key={i} opacity={dim ? 0.45 : 1} style={{ transition: 'opacity 120ms' }}>
              <rect x={x(i)} y={H - eksH} width={bw} height={Math.max(0, eksH)} rx="2" fill="#1c1917" />
              <rect x={x(i)} y={H - eksH - modH} width={bw} height={Math.max(0, modH)} rx="2" fill="#c4b5fd" />
              {i % hopp === 0 && (
                <text x={x(i) + bw / 2} y={H + 15} textAnchor="middle" fontSize="11" fill="#a6a19a">{mndKort(ymPluss(startYm, i))}</text>
              )}
              {/* usynlig hover-flate for hele kolonnen */}
              <rect x={(W / N) * i} y="0" width={W / N} height={H} fill="transparent" onMouseEnter={() => setHov(i)} />
            </g>
          );
        })}
        <polyline
          points={Array.from({ length: N }, (_, i) => `${x(i) + bw / 2},${H - m.kostSum[i] * yS}`).join(' ')}
          fill="none" stroke="#b3261e" strokeWidth="1.6" strokeLinejoin="round" opacity="0.85" pointerEvents="none"
        />
      </svg>
      {/* Tooltip */}
      {hov !== null && (
        <div className="pointer-events-none absolute top-0 z-20 w-[216px] -translate-x-1/2 rounded-[10px] bg-[#1c1917] px-3.5 py-3 text-[12px] leading-relaxed text-white shadow-xl"
          style={{ left: `${Math.min(92, Math.max(8, ((hov + 0.5) / N) * 100))}%` }}>
          <p className="font-bold">{stor(mndLang(ymPluss(startYm, hov)))} · {Math.round(m.enheter[hov])} enheter</p>
          <div className="mt-1 space-y-0.5 text-white/85">
            <p className="flex justify-between gap-3"><span>Portefølje</span><span>{kr0(m.eksisterende[hov])}</span></p>
            <p className="flex justify-between gap-3"><span>Modellert vekst</span><span>{kr0(m.vekst[hov] + m.oppstart[hov])}</span></p>
            <p className="flex justify-between gap-3"><span>Kostnader</span><span>−{kr0(m.kostSum[hov])}</span></p>
            <p className={`flex justify-between gap-3 border-t border-white/15 pt-0.5 font-bold ${m.resultat[hov] >= 0 ? 'text-[#7ee2b8]' : 'text-[#ff9d94]'}`}>
              <span>Resultat</span><span>{kr0(m.resultat[hov])}</span>
            </p>
          </div>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[12.5px] text-[#8f8a82]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#1c1917]" /> Kontraktsfestet (dagens portefølje)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#c4b5fd]" /> Modellert vekst</span>
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4 rounded bg-[#b3261e]" /> Kostnader</span>
      </div>
    </div>
  );
};

/* ── Bemanningskurve: glidende behov (grå, stiplet) vs. budsjettert trapp ── */
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
    else { steg.push(`${x(i)},${y(m.budsjettertPct[i - 1])}`); steg.push(`${x(i)},${y(m.budsjettertPct[i])}`); }
  }
  return (
    <div className="mt-2" data-testid="modell-trappkurve">
      <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full" style={{ height: 'auto' }}>
        <polyline points={Array.from({ length: N }, (_, i) => `${x(i)},${y(behov[i])}`).join(' ')} fill="none" stroke="#c2beb8" strokeWidth="1.3" strokeDasharray="3 2.5" />
        <polyline points={steg.join(' ')} fill="none" stroke="#6d28d9" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex items-center gap-3 text-[10.5px] text-[#a6a19a]">
        <span className="flex items-center gap-1"><span className="h-[2px] w-3.5 rounded bg-[#6d28d9]" /> Budsjettert</span>
        <span className="flex items-center gap-1"><span className="h-[2px] w-3.5 rounded bg-[#c2beb8]" /> Kapasitetsbehov</span>
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
  const [aapne, setAapne] = useState({ vekst: true, kostnader: false, kapasitet: false, beslutning: false });
  const [railAapen, setRailAapen] = useState(true);
  const [skittent, setSkittent] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [feil, setFeil] = useState('');
  const [henterFakta, setHenterFakta] = useState(false);
  const [visning, setVisning] = useState('mnd'); // 'mnd' | 'kvartal'
  const [sletteBekreft, setSletteBekreft] = useState(false);

  const m = useMemo(
    () => beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere }),
    [plan.antallMnd, fakta, drivere],
  );
  const sanert = m.drivere;

  const veksle = (id) => setAapne((a) => ({ ...a, [id]: !a[id] }));
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

  /* Tornado: ±10 % per driver → effekt på periodens resultat */
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

  /* Matrise-perioder (måned/kvartal som kolonner) */
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
  const utn = m.utnyttelsePct[sisteIdx];

  const feltProps = { drivere, sanert, lagret: lagretDrivere, onEndre: settDriver, readOnly };

  const Stat = ({ tittel, verdi, under, farge, testid, hoyre }) => (
    <div className="flex min-w-[184px] flex-1 items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">{tittel}</p>
        <p className={`mt-0.5 truncate text-[24px] font-bold tracking-[-0.015em] ${farge || 'text-[#1c1917]'}`} style={heading} data-testid={testid}>{verdi}</p>
        {under && <p className="truncate text-[11.5px] text-[#a6a19a]">{under}</p>}
      </div>
      {hoyre}
    </div>
  );

  return (
    <div className="w-full" data-testid="modell-editor">
      {/* Topplinje */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => onTilbake?.()} data-testid="budsjett-tilbake" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[#8f8a82] transition-colors hover:bg-black/[0.05] hover:text-[#1c1917]" title="Alle budsjetter">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {readOnly ? (
            <h2 className="truncate text-[19px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{navn}</h2>
          ) : (
            <input value={navn} maxLength={80} data-testid="modell-navn"
              onChange={(e) => { setNavn(e.target.value); setSkittent(true); }}
              className="-ml-1 w-[220px] min-w-0 rounded-[8px] border border-transparent bg-transparent px-1 text-[19px] font-bold tracking-[-0.01em] text-[#1c1917] outline-none transition-colors hover:border-black/[0.07] focus:border-black/[0.15] sm:w-[300px]" style={heading} />
          )}
          <span className="hidden shrink-0 rounded-full bg-[#f0efec] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#78716c] sm:block">Investormodell</span>
          <span className="hidden shrink-0 text-[13px] text-[#a6a19a] lg:block">
            {stor(mndLang(plan.startYm))} – {mndLang(ymPluss(plan.startYm, plan.antallMnd - 1))} · {plan.antallMnd} mnd
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button onClick={() => { const ny = !investorSynlig; setInvestorSynlig(ny); lagre({ investorSynlig: ny }); }}
              data-testid="budsjett-investor-bryter"
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium transition-all ${investorSynlig ? 'bg-[#f0ebfa] text-[#6d28d9]' : 'bg-white text-[#8f8a82] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] hover:text-[#57534e]'}`}>
              {investorSynlig ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {investorSynlig ? 'I investorrommet' : 'Ikke delt'}
            </button>
            <button onClick={() => lagre()} disabled={lagrer || !skittent} data-testid="modell-lagre" className={`${KNAPP_PRIMAER} relative`}>
              {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lagret ? <Check className="h-3.5 w-3.5" /> : null}
              {lagret ? 'Lagret' : 'Lagre'}
              {skittent && !lagrer && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#6d28d9] ring-2 ring-[#f7f7f5]" title="Ulagrede endringer" />}
            </button>
          </div>
        )}
      </div>

      {feil && <p className="mt-3 text-[13px] text-[#b3261e]" data-testid="modell-feil">{feil}</p>}

      {/* Cockpit */}
      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-start">
        {/* ── Venstre: forutsetninger (sticky, kollapsbare seksjoner) ── */}
        {!railAapen && (
          <aside className="w-full shrink-0 xl:sticky xl:top-3 xl:w-auto">
            <button onClick={() => setRailAapen(true)} data-testid="modell-rail-vis" title="Vis forutsetninger"
              className="relative flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white px-3 text-[13.5px] font-medium text-[#57534e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-colors hover:text-[#1c1917] xl:h-[46px] xl:w-[46px]">
              <SlidersHorizontal className="h-[18px] w-[18px]" />
              <span className="xl:hidden">Vis forutsetninger</span>
              {antallEndret > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#6d28d9] ring-2 ring-[#f7f7f5]" />}
            </button>
          </aside>
        )}
        {railAapen && (
        <aside className="w-full shrink-0 xl:sticky xl:top-3 xl:max-h-[calc(100vh-24px)] xl:w-[344px] xl:overflow-y-auto" data-testid="modell-drivere" style={{ scrollbarWidth: 'thin' }}>
          <div className="rounded-[16px] bg-white px-4 pb-3.5 pt-3.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[14.5px] font-bold text-[#1c1917]" style={heading}>Forutsetninger</p>
              <span className="flex items-center gap-1.5">
                {!readOnly && antallEndret > 0 && (
                  <button onClick={tilbakestill} className="flex items-center gap-1 rounded-full bg-[#f0ebfa] px-2 py-0.5 text-[11px] font-bold text-[#6d28d9] transition-colors hover:bg-[#e5dbf7]" title="Tilbakestill til sist lagrede verdier">
                    <RotateCcw className="h-2.5 w-2.5" /> {antallEndret} endret · nullstill
                  </button>
                )}
                <button onClick={() => setRailAapen(false)} data-testid="modell-rail-skjul" title="Skjul forutsetninger — mer plass til tallene"
                  className="rounded-[8px] p-1.5 text-[#c2beb8] transition-colors hover:bg-black/[0.04] hover:text-[#57534e]">
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </span>
            </div>

            <Seksjon tittel="Vekst og inntekt" open={aapne.vekst} onToggle={() => veksle('vekst')}
              sammendrag={`${kma(sanert.nyePerMnd)} nye/mnd · ${kma(sanert.aarligChurnPct)} % churn · ${kma(sanert.honorarPctNye)} %`}>
              <Felt label="Nye enheter per måned" k="nyePerMnd" {...feltProps} enhet="enh." testid="driver-nye" slider={{ min: 0, max: 10, step: 0.5 }} />
              <Felt label="Årlig churn" k="aarligChurnPct" {...feltProps} enhet="%" testid="driver-churn" slider={{ min: 0, max: 40, step: 1 }} hint={`≈ ${kma(s.mndChurnPct)} %/mnd på modellerte enheter — dagens portefølje churnes ikke`} />
              <Felt label="Snittleie nye enheter" k="snittleieNye" {...feltProps} enhet="kr/mnd" testid="driver-leie" slider={{ min: 5000, max: 40000, step: 500 }} />
              <Felt label="Honorar nye enheter" k="honorarPctNye" {...feltProps} enhet="%" testid="driver-honorar" slider={{ min: 0, max: 20, step: 0.5 }} hint={`≈ ${kr0(m.cac.bruttoHonorarNy)} kr eks. mva per enhet/mnd`} />
              <Felt label="Oppstartshonorar (per ny)" k="oppstartPerEnhet" {...feltProps} enhet="kr" testid="driver-oppstart" />
            </Seksjon>

            <Seksjon tittel="Kostnader" open={aapne.kostnader} onToggle={() => veksle('kostnader')}
              sammendrag={`${kr0(sanert.systemPerEnhet)}/enh · CAC ${kr0(sanert.provisjonPerNyEnhet)} · ${kr0(sanert.mfFast + sanert.adminFast + sanert.andreFaste)}/mnd fast`}>
              <Felt label="Systemkostnad per enhet" k="systemPerEnhet" {...feltProps} enhet="kr/mnd" testid="driver-system" />
              <Felt label="Fast markedsføring" k="mfFast" {...feltProps} enhet="kr/mnd" testid="driver-mf" />
              <Felt label="Salgsprovisjon per ny (CAC)" k="provisjonPerNyEnhet" {...feltProps} enhet="kr" testid="driver-cac" />
              <Felt label="Administrasjon" k="adminFast" {...feltProps} enhet="kr/mnd" testid="driver-admin" />
              <Felt label="Andre faste kostnader" k="andreFaste" {...feltProps} enhet="kr/mnd" testid="driver-andre" />
            </Seksjon>

            <Seksjon tittel="Bemanning — kapasitet" open={aapne.kapasitet} onToggle={() => veksle('kapasitet')}
              sammendrag={`${kma(sanert.enheterPerAarsverk)} enh/åv · fullkost ${kr0(fullkost)}`}>
              <Felt label="Kapasitet per årsverk" k="enheterPerAarsverk" {...feltProps} enhet="enh." testid="driver-kapasitet" slider={{ min: 50, max: 400, step: 10 }} hint="enheter én forvalter (100 %) dekker" />
              <Felt label="Brutto årslønn" k="aarslonn" {...feltProps} enhet="kr/år" testid="driver-lonn" />
              <Felt label="Arbeidsgiverpåslag" k="paslagPct" {...feltProps} enhet="%" testid="driver-paslag" hint={`fullkost: ${kr0(fullkost)} kr per årsverk`} />
            </Seksjon>

            <Seksjon tittel="Bemanning — beslutning" open={aapne.beslutning} onToggle={() => veksle('beslutning')}
              sammendrag={`${sanert.bemanningstrinn.length} trinn · ${m.budsjettertPct[sisteIdx]} % v/slutt · utn. ${utn === null ? '—' : `${utn} %`}`}>
              <p className="text-[11px] leading-relaxed text-[#a6a19a]">Budsjettert stillingsprosent i trinn — det dere faktisk betaler for. Den stiplede linjen er det glidende kapasitetsbehovet.</p>
              <div className="mt-1">
                {drivere.bemanningstrinn.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-1" data-testid={`trinn-${i}`}>
                    <span className="w-7 text-[12.5px] text-[#8f8a82]">Fra</span>
                    {readOnly ? (
                      <span className="text-[13.5px] font-semibold text-[#1c1917]">{t.fraEnheter}</span>
                    ) : (
                      <input value={t.fraEnheter} inputMode="numeric" onChange={(e) => settTrinn(i, 'fraEnheter', e.target.value)} data-testid={`trinn-fra-${i}`}
                        className="h-8 w-[60px] rounded-[8px] bg-[#f5f4f1] px-1.5 text-right text-[13.5px] font-semibold outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                    )}
                    <span className="text-[12.5px] text-[#8f8a82]">enh. →</span>
                    {readOnly ? (
                      <span className="text-[13.5px] font-semibold text-[#1c1917]">{t.prosent} %</span>
                    ) : (
                      <>
                        <input value={t.prosent} inputMode="decimal" onChange={(e) => settTrinn(i, 'prosent', e.target.value)} data-testid={`trinn-pct-${i}`}
                          className="h-8 w-[58px] rounded-[8px] bg-[#f5f4f1] px-1.5 text-right text-[13.5px] font-semibold outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />
                        <span className="text-[12.5px] text-[#8f8a82]">%</span>
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
              <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-[10px] bg-[#faf9f7] p-2.5 text-[12px]" data-testid="modell-bemanningsstatus">
                <span><span className="block text-[#8f8a82]">Behov v/slutt</span><span className="font-bold text-[#1c1917]">{Math.round((m.behovAarsverk[sisteIdx] || 0) * 100)} %</span></span>
                <span><span className="block text-[#8f8a82]">Budsjettert</span><span className="font-bold text-[#1c1917]">{m.budsjettertPct[sisteIdx]} %</span></span>
                <span><span className="block text-[#8f8a82]">Utnyttelse</span><span className={`font-bold ${(utn || 0) > 100 ? 'text-[#b3261e]' : 'text-[#0a7d55]'}`}>{utn === null ? '—' : `${utn} %`}</span></span>
              </div>
              {(utn || 0) > 100 && (
                <p className="mt-1.5 text-[11px] text-[#b3261e]">Behovet overstiger budsjettert bemanning — vurder et nytt trinn.</p>
              )}
            </Seksjon>

            <div className="border-t border-black/[0.05] pt-2.5">
              <p className="text-[11.5px] leading-relaxed text-[#a6a19a]">
                Porteføljefakta: {Math.round(fakta.enheter?.[0] || 0)} enheter · {kr0(fakta.eksisterende?.[0] || 0)} kr/mnd kontraktsfestet
                {fakta.oppdatertAt ? ` · hentet ${new Date(fakta.oppdatertAt).toLocaleDateString('nb-NO')}` : ''}
              </p>
              <div className="mt-2 flex items-center justify-between">
                {!readOnly ? (
                  <button onClick={oppdaterFakta} disabled={henterFakta} data-testid="modell-oppdater-fakta"
                    className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#6d28d9] transition-colors hover:text-[#4c1d95] disabled:opacity-50">
                    {henterFakta ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Oppdater fra leieforholdene
                  </button>
                ) : <span />}
                {!readOnly && (!sletteBekreft ? (
                  <button onClick={() => setSletteBekreft(true)} data-testid="budsjett-slett" className="flex items-center gap-1 text-[11.5px] font-medium text-[#c2beb8] transition-colors hover:text-[#c2413b]">
                    <Trash2 className="h-3 w-3" /> Slett
                  </button>
                ) : (
                  <span className="flex items-center gap-1">
                    <button onClick={slett} data-testid="budsjett-slett-bekreft" className="rounded-[7px] bg-[#fdf0ef] px-2 py-0.5 text-[11px] font-bold text-[#c2413b]">Ja, slett</button>
                    <button onClick={() => setSletteBekreft(false)} className="px-1 py-0.5 text-[11px] font-medium text-[#a8a29a]">Avbryt</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
        )}

        {/* ── Høyre: output ── */}
        <main className="min-w-0 flex-1">
          {/* Nøkkeltall-linje */}
          <div className="flex flex-wrap divide-x divide-black/[0.05] rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-nokkeltall">
            <Stat tittel="Resultat i perioden" verdi={kr(s.resultat)} farge={s.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'} testid="modell-resultat"
              hoyre={<Sparkline serie={m.resultat} />} />
            <Stat tittel="Break-even" verdi={breakEvenTekst} under={s.breakEvenIdx !== null && s.breakEvenIdx > 0 ? `ved ~${Math.round(m.enheter[s.breakEvenIdx])} enheter` : undefined} testid="modell-breakeven" />
            <Stat tittel="Maks kapitalbehov" verdi={s.kapitalbehov > 0 ? kr(s.kapitalbehov) : 'Ingen'}
              under={s.kapitalbehov > 0 && s.kapitalbehovIdx !== null ? `dypest i ${mndLang(ymPluss(plan.startYm, s.kapitalbehovIdx))}` : 'positiv akkumulert hele veien'}
              farge={s.kapitalbehov > 0 ? 'text-[#1c1917]' : 'text-[#0a7d55]'} testid="modell-kapitalbehov" />
            <Stat tittel="Enheter ved slutt" verdi={String(Math.round(m.enheter[sisteIdx] || 0))} under={`${Math.round(fakta.enheter?.[sisteIdx] || 0)} fra dagens portefølje`} />
            <Stat tittel="Kontraktsfestet" verdi={s.andelEksisterendePct === null ? '—' : `${s.andelEksisterendePct} %`} under="av inntekten i perioden" testid="modell-andel" />
          </div>

          {/* Graf */}
          <div className="mt-2.5 rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <Graf m={m} startYm={plan.startYm} />
          </div>

          {/* Finansmatrise */}
          <div className="mt-2.5 rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-3.5">
              <p className="text-[13.5px] font-medium text-[#8f8a82]">Resultatoppstilling <span className="text-[#c2beb8]">· beløp i kr · beregnet fra driverne</span></p>
              <div className="flex items-center gap-0.5 rounded-[8px] bg-[#f0efec] p-0.5" data-testid="modell-visning">
                {[['mnd', 'Måned'], ['kvartal', 'Kvartal']].map(([v, l]) => (
                  <button key={v} onClick={() => setVisning(v)} data-testid={`modell-visning-${v}`}
                    className={`rounded-[6px] px-3 py-1 text-[12.5px] font-medium transition-colors ${visning === v ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82] hover:text-[#57534e]'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto pb-1" data-testid="modell-matrise" style={{ scrollbarWidth: 'thin' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.05em] text-[#a6a19a]">
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
                        <tr key={ri} className="bg-[#faf9f7]">
                          <td className="sticky left-0 z-10 bg-[#faf9f7] py-1.5 pl-4 pr-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8f8a82]">{rad.header}</td>
                          <td colSpan={perioder.length} className="bg-[#faf9f7]" />
                          <td className="sticky right-0 z-10 border-l border-black/[0.06] bg-[#f4f3f0]" />
                        </tr>
                      );
                    }
                    const verdi = (idx) => (rad.type === 'stock' ? beholdning(rad.serie, idx) : flyt(rad.serie, idx));
                    const total = rad.type === 'stock' ? rad.serie[m.N - 1] : rad.serie.reduce((a, b) => a + b, 0);
                    const fmt = rad.fmt || kr0;
                    const celleFarge = (v) => {
                      if (rad.resultat || rad.akk) return v >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]';
                      if (rad.info) return 'text-[#b5b0a8]';
                      if (rad.lilla) return 'text-[#6d28d9]';
                      return 'text-[#57534e]';
                    };
                    const vekt = rad.sum || rad.resultat ? 'font-bold' : rad.akk ? 'font-medium' : '';
                    const radBg = rad.resultat ? 'bg-[#fbfaf8]' : 'bg-white';
                    return (
                      <tr key={ri} className={`group border-t border-black/[0.04] ${rad.resultat ? 'bg-[#fbfaf8]' : ''} transition-colors hover:bg-[#f7f6f3]`}>
                        <td className={`sticky left-0 z-10 whitespace-nowrap py-[7px] pl-4 pr-3 text-left ${radBg} transition-colors group-hover:bg-[#f7f6f3] ${rad.sum || rad.resultat ? 'font-bold text-[#1c1917]' : rad.info || rad.akk ? 'text-[#8f8a82]' : 'text-[#57534e]'}`}>
                          {rad.label}
                        </td>
                        {perioder.map((p) => {
                          const v = verdi(p.idx);
                          return <td key={p.label} className={`whitespace-nowrap px-2 py-[7px] text-right ${vekt} ${celleFarge(v)}`}>{fmt(v)}</td>;
                        })}
                        <td className={`sticky right-0 z-10 whitespace-nowrap border-l border-black/[0.06] bg-[#faf9f7] py-[7px] pl-2.5 pr-4 text-right font-bold transition-colors group-hover:bg-[#f2f1ee] ${rad.resultat || rad.akk ? (total >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]') : rad.info ? 'text-[#b5b0a8]' : 'text-[#1c1917]'}`}>
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
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-tornado">
              <p className="text-[13.5px] font-medium text-[#8f8a82]">Sensitivitet — hva betyr mest?</p>
              <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">Effekt på periodens resultat når hver driver endres ±10 %.</p>
              <div className="mt-3 space-y-2">
                {tornado.rader.map((r) => (
                  <div key={r.k} className="flex items-center gap-2.5">
                    <span className="w-[164px] shrink-0 truncate text-[13px] text-[#57534e]">{r.label}</span>
                    <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-black/[0.04]">
                      <span className={`block h-full rounded-full transition-all duration-300 ${r.opp >= 0 ? 'bg-[#0a7d55]/70' : 'bg-[#b3261e]/60'}`} style={{ width: `${Math.max(3, (r.spenn / tornado.maks) * 100)}%` }} />
                    </span>
                    <span className="w-[112px] shrink-0 text-right text-[12.5px] font-semibold text-[#1c1917]">±{kr0(r.spenn)} kr</span>
                  </div>
                ))}
                {tornado.rader.length === 0 && <p className="text-[12px] text-[#a6a19a]">Sett driverne over 0 for å se sensitivitet.</p>}
              </div>
            </div>
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-cac">
              <p className="text-[13.5px] font-medium text-[#8f8a82]">Unit economics per ny enhet</p>
              <div className="mt-3 space-y-1.5 text-[13.5px]">
                <div className="flex justify-between"><span className="text-[#57534e]">Anskaffelseskostnad (CAC)</span><span className="font-semibold text-[#1c1917]">{kr(m.cac.provisjon)}</span></div>
                <div className="flex justify-between"><span className="text-[#57534e]">Månedlig honorar <span className="text-[#a6a19a]">eks. mva</span></span><span className="font-semibold text-[#1c1917]">{kr0(m.cac.bruttoHonorarNy)} kr</span></div>
                <div className="flex justify-between"><span className="text-[#57534e]">− Systemkostnad</span><span className="font-semibold text-[#1c1917]">{kr0(m.cac.systemPerEnhet)} kr</span></div>
                <div className="flex justify-between border-t border-black/[0.05] pt-1.5"><span className="text-[#57534e]">= Bidrag før bemanning</span><span className={`font-bold ${m.cac.bidrag > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(m.cac.bidrag)} kr/mnd</span></div>
              </div>
              <p className="mt-3 inline-flex rounded-full bg-[#f0ebfa] px-3 py-1 text-[13px] font-bold text-[#6d28d9]" data-testid="modell-payback">
                {m.cac.paybackMnd === null ? (m.cac.bidrag <= 0 ? 'Bidraget dekker ikke systemkostnaden' : 'Ingen CAC') : `CAC payback: ${kma(m.cac.paybackMnd)} mnd`}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
