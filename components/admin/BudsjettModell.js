'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   BudsjettModell — editor/visning for budsjett av typen «Investormodell».
   · Alle drivere er synlige og justerbare i frontend; hele modellen
     omberegnes UMIDDELBART ved endring (sensitivitetsanalyse i sanntid).
   · Samme rene motor (lib/budsjett-modell.js) kjører her og på serveren.
   · Tre lag: FAKTA (porteføljesnapshot fra leieforholdene) →
     FORUTSETNINGER (drivere) → BESLUTNINGER (bemanningstrapp).
   · Investor (readOnly): identisk visning, drivere synlige men låst.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Trash2, RefreshCw, Loader2, Check, Eye, EyeOff, Plus, X,
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

/* Ett driverfelt: etikett + input (eller låst verdi) + enhet */
const Felt = ({ label, verdi, onEndre, enhet, readOnly, testid, bredde = 'w-[92px]', hint }) => (
  <label className="flex items-center justify-between gap-3 py-[7px]">
    <span className="min-w-0">
      <span className="block text-[13px] text-[#57534e]">{label}</span>
      {hint && <span className="block text-[11px] text-[#a6a19a]">{hint}</span>}
    </span>
    <span className="flex shrink-0 items-center gap-1.5">
      {readOnly ? (
        <span className="text-[13px] font-semibold text-[#1c1917]">{verdi}</span>
      ) : (
        <input value={verdi} inputMode="decimal" data-testid={testid} onChange={(e) => onEndre(e.target.value)}
          className={`h-8 ${bredde} rounded-[8px] border border-black/[0.08] bg-white px-2 text-right text-[13px] font-semibold text-[#1c1917] outline-none transition-colors focus:border-[#1c1917]/25`} />
      )}
      <span className="w-10 text-[11.5px] text-[#a6a19a]">{enhet}</span>
    </span>
  </label>
);

/* Stablet søylegraf: portefølje (mørk) + modellert (lys lilla) + kostnadslinje */
const Graf = ({ m, startYm }) => {
  const N = m.N;
  const W = 720, H = 150;
  const maks = Math.max(...m.inntekt, ...m.kostSum, 1);
  const yS = (H - 6) / maks;
  const bw = Math.max(4, (W / N) * 0.68);
  const x = (i) => (W / N) * i + ((W / N) - bw) / 2;
  const hopp = Math.max(1, Math.ceil(N / 8));
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
                <text x={x(i) + bw / 2} y={H + 13} textAnchor="middle" fontSize="9.5" fill="#a6a19a">{mndKort(ymPluss(startYm, i))}</text>
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

export default function BudsjettModell({ plan, api, readOnly = false, onTilbake, onEndret }) {
  const [navn, setNavn] = useState(plan.navn);
  const [investorSynlig, setInvestorSynlig] = useState(Boolean(plan.investorSynlig));
  const [drivere, setDrivere] = useState(() => ({ ...rensModellDrivere(plan.drivere) }));
  const [fakta, setFakta] = useState(plan.fakta || { eksisterende: [], enheter: [], oppdatertAt: null });
  const [skittent, setSkittent] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [feil, setFeil] = useState('');
  const [henterFakta, setHenterFakta] = useState(false);
  const [detaljer, setDetaljer] = useState(false);
  const [sletteBekreft, setSletteBekreft] = useState(false);

  // Hele modellen omberegnes umiddelbart når en driver endres.
  const m = useMemo(
    () => beregnInvestorModell({ antallMnd: plan.antallMnd, fakta, drivere }),
    [plan.antallMnd, fakta, drivere],
  );

  const settDriver = (k, v) => { setDrivere((d) => ({ ...d, [k]: v })); setSkittent(true); };
  const settTrinn = (i, felt, v) => {
    setDrivere((d) => {
      const trinn = d.bemanningstrinn.map((t, j) => (j === i ? { ...t, [felt]: v } : t));
      return { ...d, bemanningstrinn: trinn };
    });
    setSkittent(true);
  };
  const leggTrinn = () => {
    setDrivere((d) => {
      const siste = d.bemanningstrinn[d.bemanningstrinn.length - 1] || { fraEnheter: 0, prosent: 30 };
      return { ...d, bemanningstrinn: [...d.bemanningstrinn, { fraEnheter: Number(siste.fraEnheter || 0) + 50, prosent: Math.min(2000, Number(siste.prosent || 0) + 25) }] };
    });
    setSkittent(true);
  };
  const fjernTrinn = (i) => {
    setDrivere((d) => ({ ...d, bemanningstrinn: d.bemanningstrinn.filter((_, j) => j !== i) }));
    setSkittent(true);
  };

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
      const ny = {
        eksisterende: (f.sikret || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        enheter: (f.enheterSerie || []).map((x) => Math.max(0, Math.round(Number(x) || 0))),
        oppdatertAt: new Date().toISOString(),
      };
      setFakta(ny); setSkittent(true);
    } catch (e) { setFeil(e.message); }
    setHenterFakta(false);
  };

  const slett = async () => {
    try { await api(`plan?id=${encodeURIComponent(plan.id)}`, { method: 'DELETE' }); onTilbake?.(true); }
    catch (e) { setFeil(e.message); }
  };

  const s = m.sammendrag;
  const breakEvenTekst = s.breakEvenIdx === null
    ? 'Nås ikke i perioden'
    : s.breakEvenIdx === 0
      ? 'Lønnsom fra start'
      : stor(mndLang(ymPluss(plan.startYm, s.breakEvenIdx)));
  const fullkost = Math.round(m.drivere.aarslonn * (1 + m.drivere.paslagPct / 100));
  const sisteIdx = m.N - 1;

  return (
    <div className="mx-auto w-full max-w-[880px]" data-testid="modell-editor">
      <button onClick={() => onTilbake?.()} data-testid="budsjett-tilbake" className="flex items-center gap-1.5 text-[13px] font-medium text-[#8f8a82] transition-colors hover:text-[#1c1917]">
        <ArrowLeft className="h-3.5 w-3.5" /> Alle budsjetter
      </button>

      {/* Hode */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {readOnly ? (
            <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{navn}</h2>
          ) : (
            <input value={navn} maxLength={80} data-testid="modell-navn"
              onChange={(e) => { setNavn(e.target.value); setSkittent(true); }}
              className="-ml-1 w-full min-w-[240px] rounded-[8px] border border-transparent bg-transparent px-1 text-[22px] font-bold tracking-[-0.01em] text-[#1c1917] outline-none transition-colors hover:border-black/[0.07] focus:border-black/[0.15]" style={heading} />
          )}
          <p className="mt-1 text-[13.5px] text-[#8f8a82]">
            {stor(mndLang(plan.startYm))} – {mndLang(ymPluss(plan.startYm, plan.antallMnd - 1))} · {plan.antallMnd} mnd · Investormodell
          </p>
        </div>
        {!readOnly && (
          <button onClick={() => { const ny = !investorSynlig; setInvestorSynlig(ny); lagre({ investorSynlig: ny }); }}
            data-testid="budsjett-investor-bryter"
            className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium transition-all ${investorSynlig ? 'bg-[#f0ebfa] text-[#6d28d9]' : 'bg-white text-[#8f8a82] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] hover:text-[#57534e]'}`}>
            {investorSynlig ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {investorSynlig ? 'Synlig i investorrommet' : 'Ikke synlig i investorrommet'}
          </button>
        )}
      </div>

      {/* Nøkkeltallstripe */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4" data-testid="modell-nokkeltall">
        <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
          <p className="text-[11.5px] font-medium text-[#8f8a82]">Resultat i perioden</p>
          <p className={`mt-1 text-[21px] font-bold tracking-[-0.01em] ${s.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`} style={heading} data-testid="modell-resultat">{kr(s.resultat)}</p>
        </div>
        <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
          <p className="text-[11.5px] font-medium text-[#8f8a82]">Break-even</p>
          <p className="mt-1 text-[21px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading} data-testid="modell-breakeven">{breakEvenTekst}</p>
          {s.breakEvenIdx !== null && s.breakEvenIdx > 0 && (
            <p className="text-[11.5px] text-[#a6a19a]">ved ~{Math.round(m.enheter[s.breakEvenIdx])} enheter</p>
          )}
        </div>
        <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
          <p className="text-[11.5px] font-medium text-[#8f8a82]">Enheter ved slutt</p>
          <p className="mt-1 text-[21px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{Math.round(m.enheter[sisteIdx] || 0)}</p>
          <p className="text-[11.5px] text-[#a6a19a]">{Math.round(fakta.enheter?.[sisteIdx] || 0)} fra dagens portefølje</p>
        </div>
        <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
          <p className="text-[11.5px] font-medium text-[#8f8a82]">Fra dagens portefølje</p>
          <p className="mt-1 text-[21px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading} data-testid="modell-andel">{s.andelEksisterendePct === null ? '—' : `${s.andelEksisterendePct} %`}</p>
          <p className="text-[11.5px] text-[#a6a19a]">av inntekten er kontraktsfestet</p>
        </div>
      </div>

      {/* Graf */}
      <div className="mt-3 rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
        <Graf m={m} startYm={plan.startYm} />
      </div>

      {/* Drivere — synlige forutsetninger, umiddelbar omberegning */}
      <div className="mt-3 rounded-[14px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-drivere">
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <p className="text-[12.5px] font-medium text-[#8f8a82]">Forutsetninger — alt under omberegnes umiddelbart</p>
          {!readOnly && (
            <button onClick={oppdaterFakta} disabled={henterFakta} data-testid="modell-oppdater-fakta" title="Henter kontraktsfestet honorar og enheter på nytt fra leieforholdene"
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6d28d9] transition-colors hover:text-[#4c1d95] disabled:opacity-50">
              {henterFakta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Oppdater porteføljefakta
            </button>
          )}
        </div>
        <div className="grid gap-x-8 px-5 pb-4 lg:grid-cols-2">
          <div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Vekst og inntekt</p>
            <Felt label="Nye enheter per måned" verdi={drivere.nyePerMnd} onEndre={(v) => settDriver('nyePerMnd', v)} enhet="enh." readOnly={readOnly} testid="driver-nye" />
            <Felt label="Årlig churn (modellerte enheter)" hint={`≈ ${String(s.mndChurnPct).replace('.', ',')} % per måned — dagens portefølje churnes ikke`} verdi={drivere.aarligChurnPct} onEndre={(v) => settDriver('aarligChurnPct', v)} enhet="%" readOnly={readOnly} testid="driver-churn" />
            <Felt label="Snittleie nye enheter" verdi={drivere.snittleieNye} onEndre={(v) => settDriver('snittleieNye', v)} enhet="kr/mnd" readOnly={readOnly} testid="driver-leie" />
            <Felt label="Honorar nye enheter" hint={`≈ ${kr0(m.cac.bruttoHonorarNy)} kr eks. mva per enhet/mnd`} verdi={drivere.honorarPctNye} onEndre={(v) => settDriver('honorarPctNye', v)} enhet="%" readOnly={readOnly} testid="driver-honorar" />
            <Felt label="Oppstartshonorar per ny enhet" verdi={drivere.oppstartPerEnhet} onEndre={(v) => settDriver('oppstartPerEnhet', v)} enhet="kr" readOnly={readOnly} testid="driver-oppstart" />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Kostnader</p>
            <Felt label="Systemkostnad per enhet" verdi={drivere.systemPerEnhet} onEndre={(v) => settDriver('systemPerEnhet', v)} enhet="kr/mnd" readOnly={readOnly} testid="driver-system" />
            <Felt label="Fast markedsføring" verdi={drivere.mfFast} onEndre={(v) => settDriver('mfFast', v)} enhet="kr/mnd" readOnly={readOnly} testid="driver-mf" />
            <Felt label="Salgsprovisjon per ny enhet (CAC)" verdi={drivere.provisjonPerNyEnhet} onEndre={(v) => settDriver('provisjonPerNyEnhet', v)} enhet="kr" readOnly={readOnly} testid="driver-cac" />
            <Felt label="Administrasjon" verdi={drivere.adminFast} onEndre={(v) => settDriver('adminFast', v)} enhet="kr/mnd" readOnly={readOnly} testid="driver-admin" />
            <Felt label="Andre faste kostnader" verdi={drivere.andreFaste} onEndre={(v) => settDriver('andreFaste', v)} enhet="kr/mnd" readOnly={readOnly} testid="driver-andre" />
          </div>
          <div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Bemanning — kapasitet</p>
            <Felt label="Kapasitet per årsverk" hint="enheter én forvalter (100 %) dekker" verdi={drivere.enheterPerAarsverk} onEndre={(v) => settDriver('enheterPerAarsverk', v)} enhet="enh." readOnly={readOnly} testid="driver-kapasitet" />
            <Felt label="Brutto årslønn" verdi={drivere.aarslonn} onEndre={(v) => settDriver('aarslonn', v)} enhet="kr/år" readOnly={readOnly} testid="driver-lonn" />
            <Felt label="Arbeidsgiverpåslag" hint={`fullkost: ${kr0(fullkost)} kr per årsverk`} verdi={drivere.paslagPct} onEndre={(v) => settDriver('paslagPct', v)} enhet="%" readOnly={readOnly} testid="driver-paslag" />

            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Bemanning — beslutning (budsjettert)</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#a6a19a]">Det dere faktisk betaler for, i trinn. Kapasitetsbehovet beregnes glidende ved siden av.</p>
            <div className="mt-1.5">
              {drivere.bemanningstrinn.map((t, i) => (
                <div key={i} className="flex items-center gap-2 py-1" data-testid={`trinn-${i}`}>
                  <span className="w-8 text-[12.5px] text-[#8f8a82]">{i === 0 ? 'Fra' : 'Fra'}</span>
                  {readOnly ? (
                    <span className="text-[13px] font-semibold text-[#1c1917]">{t.fraEnheter}</span>
                  ) : (
                    <input value={t.fraEnheter} inputMode="numeric" onChange={(e) => settTrinn(i, 'fraEnheter', e.target.value)} data-testid={`trinn-fra-${i}`}
                      className="h-8 w-[64px] rounded-[8px] border border-black/[0.08] bg-white px-2 text-right text-[13px] font-semibold outline-none focus:border-[#1c1917]/25" />
                  )}
                  <span className="text-[12.5px] text-[#8f8a82]">enheter →</span>
                  {readOnly ? (
                    <span className="text-[13px] font-semibold text-[#1c1917]">{t.prosent} %</span>
                  ) : (
                    <>
                      <input value={t.prosent} inputMode="decimal" onChange={(e) => settTrinn(i, 'prosent', e.target.value)} data-testid={`trinn-pct-${i}`}
                        className="h-8 w-[60px] rounded-[8px] border border-black/[0.08] bg-white px-2 text-right text-[13px] font-semibold outline-none focus:border-[#1c1917]/25" />
                      <span className="text-[12.5px] text-[#8f8a82]">% stilling</span>
                      {drivere.bemanningstrinn.length > 1 && (
                        <button onClick={() => fjernTrinn(i)} className="rounded p-1 text-[#c2beb8] transition-colors hover:text-[#c2413b]" title="Fjern trinn"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {!readOnly && drivere.bemanningstrinn.length < 12 && (
                <button onClick={leggTrinn} data-testid="trinn-legg-til" className="mt-1 flex items-center gap-1 text-[12.5px] font-medium text-[#6d28d9] hover:text-[#4c1d95]">
                  <Plus className="h-3.5 w-3.5" /> Legg til trinn
                </button>
              )}
            </div>

            {/* Bemanningsstatus siste måned */}
            <div className="mt-3 rounded-[10px] bg-[#faf9f7] p-3 text-[12.5px]" data-testid="modell-bemanningsstatus">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Ved periodens slutt</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                <span><span className="block text-[#8f8a82]">Kapasitetsbehov</span><span className="font-bold text-[#1c1917]">{Math.round((m.behovAarsverk[sisteIdx] || 0) * 100)} %</span></span>
                <span><span className="block text-[#8f8a82]">Budsjettert</span><span className="font-bold text-[#1c1917]">{m.budsjettertPct[sisteIdx]} %</span></span>
                <span><span className="block text-[#8f8a82]">Utnyttelse</span><span className={`font-bold ${(m.utnyttelsePct[sisteIdx] || 0) > 100 ? 'text-[#b3261e]' : 'text-[#0a7d55]'}`}>{m.utnyttelsePct[sisteIdx] === null ? '—' : `${m.utnyttelsePct[sisteIdx]} %`}</span></span>
              </div>
              {(m.utnyttelsePct[sisteIdx] || 0) > 100 && (
                <p className="mt-1.5 text-[11.5px] text-[#b3261e]">Behovet overstiger budsjettert bemanning — vurder et nytt trinn.</p>
              )}
            </div>
          </div>
        </div>
        <p className="border-t border-black/[0.05] px-5 py-2.5 text-[11.5px] text-[#a6a19a]">
          Porteføljefakta: {Math.round(fakta.enheter?.[0] || 0)} enheter · {kr0(fakta.eksisterende?.[0] || 0)} kr kontraktsfestet honorar/mnd
          {fakta.oppdatertAt ? ` · hentet ${new Date(fakta.oppdatertAt).toLocaleDateString('nb-NO')}` : ''}
          {' '}· Kjente utflyttinger telles; leiekontraktens slutt churner ikke forvaltningskunden.
        </p>
      </div>

      {/* Unit economics per ny enhet */}
      <div className="mt-3 rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="modell-cac">
        <p className="text-[12.5px] font-medium text-[#8f8a82]">Unit economics per ny enhet</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
          <span>CAC <span className="font-bold text-[#1c1917]">{kr(m.cac.provisjon)}</span></span>
          <span>Honorar <span className="font-bold text-[#1c1917]">{kr0(m.cac.bruttoHonorarNy)} kr/mnd</span> <span className="text-[#a6a19a]">eks. mva</span></span>
          <span>− System <span className="font-bold text-[#1c1917]">{kr0(m.cac.systemPerEnhet)} kr/mnd</span></span>
          <span>= Bidrag før bemanning <span className={`font-bold ${m.cac.bidrag > 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(m.cac.bidrag)} kr/mnd</span></span>
          <span className="rounded-full bg-[#f0ebfa] px-3 py-1 font-bold text-[#6d28d9]" data-testid="modell-payback">
            {m.cac.paybackMnd === null ? (m.cac.bidrag <= 0 ? 'Bidraget dekker ikke systemkostnaden' : 'Ingen CAC') : `CAC payback: ${String(m.cac.paybackMnd).replace('.', ',')} mnd`}
          </span>
        </div>
      </div>

      {/* Månedstabell (output) */}
      <div className="mt-3 overflow-x-auto rounded-[14px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <p className="text-[12.5px] font-medium text-[#8f8a82]">Måned for måned — beregnet, ikke redigerbar</p>
          <button onClick={() => setDetaljer((v) => !v)} data-testid="modell-detaljer-bryter" className="text-[12.5px] font-medium text-[#6d28d9] hover:text-[#4c1d95]">
            {detaljer ? 'Skjul kostnadsdetaljer' : 'Vis kostnads- og bemanningsdetaljer'}
          </button>
        </div>
        <table className="w-full text-[12.5px]" data-testid="modell-tabell">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[#a6a19a]">
              <th className="py-2 pl-5 pr-2 font-semibold">Måned</th>
              <th className="px-2 py-2 text-right font-semibold">Enheter</th>
              {detaljer ? (
                <>
                  <th className="px-2 py-2 text-right font-semibold">Bemanning</th>
                  <th className="px-2 py-2 text-right font-semibold">System</th>
                  <th className="px-2 py-2 text-right font-semibold">Lønn</th>
                  <th className="px-2 py-2 text-right font-semibold">Marked + CAC</th>
                  <th className="px-2 py-2 text-right font-semibold">Admin + andre</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2 text-right font-semibold">Portefølje</th>
                  <th className="px-2 py-2 text-right font-semibold">Vekst</th>
                  <th className="px-2 py-2 text-right font-semibold">Inntekt</th>
                  <th className="px-2 py-2 text-right font-semibold">Kostnader</th>
                </>
              )}
              <th className="py-2 pl-2 pr-5 text-right font-semibold">Resultat</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: m.N }, (_, i) => (
              <tr key={i} className="border-t border-black/[0.04]">
                <td className="py-[7px] pl-5 pr-2 text-[#57534e]">{stor(mndLang(ymPluss(plan.startYm, i)))}</td>
                <td className="px-2 py-[7px] text-right font-medium text-[#1c1917]">{Math.round(m.enheter[i])}</td>
                {detaljer ? (
                  <>
                    <td className="px-2 py-[7px] text-right">
                      <span className="font-medium text-[#1c1917]">{m.budsjettertPct[i]} %</span>
                      <span className="text-[#a6a19a]"> · behov {Math.round(m.behovAarsverk[i] * 100)} %</span>
                    </td>
                    <td className="px-2 py-[7px] text-right text-[#57534e]">{kr0(m.kost.system[i])}</td>
                    <td className="px-2 py-[7px] text-right text-[#57534e]">{kr0(m.kost.bemanning[i])}</td>
                    <td className="px-2 py-[7px] text-right text-[#57534e]">{kr0(m.kost.mfFast[i] + m.kost.provisjon[i])}</td>
                    <td className="px-2 py-[7px] text-right text-[#57534e]">{kr0(m.kost.admin[i] + m.kost.andre[i])}</td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-[7px] text-right text-[#57534e]">{kr0(m.eksisterende[i])}</td>
                    <td className="px-2 py-[7px] text-right text-[#6d28d9]">{kr0(m.vekst[i] + m.oppstart[i])}</td>
                    <td className="px-2 py-[7px] text-right font-medium text-[#1c1917]">{kr0(m.inntekt[i])}</td>
                    <td className="px-2 py-[7px] text-right text-[#57534e]">{kr0(m.kostSum[i])}</td>
                  </>
                )}
                <td className={`py-[7px] pl-2 pr-5 text-right font-bold ${m.resultat[i] >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{kr0(m.resultat[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {feil && <p className="mt-3 text-[13px] text-[#b3261e]" data-testid="modell-feil">{feil}</p>}

      {!readOnly && (
        <div className="mt-5 flex items-center gap-2">
          <button onClick={() => lagre()} disabled={lagrer || !skittent} data-testid="modell-lagre" className={KNAPP_PRIMAER}>
            {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lagret ? <Check className="h-3.5 w-3.5" /> : null}
            {lagret ? 'Lagret' : 'Lagre'}
          </button>
          {skittent && !lagrer && <span className="text-[12.5px] text-[#a6a19a]">Ulagrede endringer</span>}
          <span className="ml-auto">
            {!sletteBekreft ? (
              <button onClick={() => setSletteBekreft(true)} data-testid="budsjett-slett" className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#c2beb8] transition-colors hover:bg-[#fdf0ef] hover:text-[#c2413b]">
                <Trash2 className="h-3.5 w-3.5" /> Slett budsjett
              </button>
            ) : (
              <span className="flex items-center gap-1.5">
                <button onClick={slett} data-testid="budsjett-slett-bekreft" className="rounded-[7px] bg-[#fdf0ef] px-3 py-1.5 text-[12.5px] font-bold text-[#c2413b]">Ja, slett</button>
                <button onClick={() => setSletteBekreft(false)} className="rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#a8a29a]">Avbryt</button>
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
