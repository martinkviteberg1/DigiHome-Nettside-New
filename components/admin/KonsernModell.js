'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   KonsernModell — «Konsern»: forvaltningsmotoren + plattformmotoren + felles,
   konsolidert måned for måned. Bor som en visning inne i BudsjettModell.

   · Venstre rail: Plattform (vekst · unit economics · faste) og Felles
     (poster + fordelingsnøkkel). Forvaltningens drivere redigeres i sin egen
     visning — her vises de som fakta.
   · Høyre: nøkkeltall, stablet inntektsgraf med kostnadslinje og break-even,
     årstabell per segment, unit economics side om side.
   · Samme rene motor (lib/budsjett-modell.js) som resten — ingen serverkall
     for beregning. «Lagre» skriver plattform + felles på planen.
   ───────────────────────────────────────────────────────────────────────────── */
import React, { useMemo, useState, useCallback } from 'react';
import { Check, Loader2, Plus, X, ChevronDown, Layers, HelpCircle } from 'lucide-react';
import {
  beregnInvestorModell, beregnPlattform, beregnKonsern,
  rensPlattformDrivere, rensFelles, STANDARD_PLATTFORM, STANDARD_FELLES, FELLES_POSTER,
} from '@/lib/budsjett-modell';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const KNAPP_PRIMAER = 'flex h-9 items-center gap-1.5 rounded-[9px] bg-[#141414] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/80 active:scale-[0.98] disabled:opacity-40';
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const smal = (s) => String(s).replace(/[\u00A0\u0020]/g, ' ');
const kr = (n) => `${smal(Math.round(Number(n) || 0).toLocaleString('nb-NO'))} kr`;
const kr0 = (n) => smal(Math.round(Number(n) || 0).toLocaleString('nb-NO'));
const mkr = (n) => { const v = Number(n) || 0; return Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} MNOK` : kr(v); };
const ymPluss = (ym, i) => { const [y, m] = String(ym).split('-').map(Number); const t = y * 12 + (m - 1) + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const mndLabel = (ym, i) => { const [y, m] = ymPluss(ym, i).split('-').map(Number); return `${MND_KORT[m - 1]} ${String(y).slice(2)}`; };

/* ── Små byggesteiner ── */
function Felt({ label, verdi, onChange, enhet, steg = 1, min = 0, hint, readOnly, testid }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5" title={hint || ''}>
      <span className="min-w-0 truncate text-[12.5px] text-[#57534e]">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          type="number" inputMode="decimal" step={steg} min={min} value={verdi} disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="h-8 w-[104px] rounded-[8px] border border-black/[0.08] bg-white px-2 text-right text-[13px] text-[#1c1917] outline-none transition-colors focus:border-[#6d28d9]/50 disabled:bg-[#f7f6f3]"
        />
        {enhet ? <span className="w-8 text-[11.5px] text-[#a6a19a]">{enhet}</span> : null}
      </span>
    </label>
  );
}
function Gruppe({ tittel, under, aapen, onToggle, children, testid }) {
  return (
    <div className="rounded-[14px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid={testid}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-[#1c1917]" style={heading}>{tittel}</span>
          {under ? <span className="block truncate text-[11.5px] text-[#a6a19a]">{under}</span> : null}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#a6a19a] transition-transform ${aapen ? 'rotate-180' : ''}`} />
      </button>
      {aapen ? <div className="border-t border-black/[0.05] px-4 pb-3 pt-1">{children}</div> : null}
    </div>
  );
}
function Nokkel({ label, verdi, under, tone, testid }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid={testid}>
      <p className="text-[11.5px] font-medium text-[#8f8a82]">{label}</p>
      <p className={`mt-1 text-[22px] font-bold tracking-[-0.02em] ${tone === 'neg' ? 'text-[#b3261e]' : tone === 'pos' ? 'text-[#15803d]' : 'text-[#1c1917]'}`} style={heading}>{verdi}</p>
      {under ? <p className="mt-0.5 text-[11.5px] text-[#a6a19a]">{under}</p> : null}
    </div>
  );
}

/* ── Stablet inntektsgraf + kostnadslinje + break-even ── */
function KonsernGraf({ k, startYm }) {
  const N = k.N; const W = 920; const H = 300; const padL = 56; const padR = 16; const padT = 16; const padB = 34;
  const maks = Math.max(1, ...k.inntekt.total, ...k.kost.total) * 1.08;
  const x = (i) => padL + ((W - padL - padR) * (i + 0.5)) / N;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maks);
  const bw = Math.max(3, ((W - padL - padR) / N) * 0.62);
  const be = k.sammendrag.breakEvenIdx;
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Konsern: inntekt per segment og kostnader per måned" data-testid="konsern-graf">
      {Array.from({ length: ticks + 1 }, (_, i) => { const v = (maks / ticks) * i; return (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(0,0,0,0.06)" />
          <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="#a6a19a">{v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}k`}</text>
        </g>
      ); })}
      {k.inntekt.total.map((tot, i) => {
        const f = k.inntekt.forvaltning[i]; const p = k.inntekt.plattform[i];
        return (
          <g key={i}>
            <rect x={x(i) - bw / 2} y={y(f)} width={bw} height={Math.max(0, y(0) - y(f))} fill="#1c1917" rx="1.5" />
            <rect x={x(i) - bw / 2} y={y(f + p)} width={bw} height={Math.max(0, y(f) - y(f + p))} fill="#c084fc" rx="1.5" />
          </g>
        );
      })}
      <polyline fill="none" stroke="#b3261e" strokeWidth="2" strokeLinejoin="round" points={k.kost.total.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {be !== null ? (
        <g>
          <line x1={x(be)} x2={x(be)} y1={padT} y2={H - padB} stroke="#15803d" strokeDasharray="3 4" />
          <text x={x(be) > W - 150 ? x(be) - 6 : x(be) + 6} y={padT + 12} textAnchor={x(be) > W - 150 ? 'end' : 'start'} fontSize="11" fill="#15803d" fontWeight="600">Break-even · {mndLabel(startYm, be)}</text>
        </g>
      ) : null}
      {Array.from({ length: N }, (_, i) => i).filter((i) => i % 3 === 0).map((i) => (
        <text key={i} x={x(i)} y={H - 12} textAnchor="middle" fontSize="10.5" fill="#a6a19a">{mndLabel(startYm, i)}</text>
      ))}
    </svg>
  );
}

export default function KonsernModell({ plan, drivere, fakta, antallMnd, startYm, api, readOnly = false, onLagret }) {
  const [pl, setPl] = useState(() => rensPlattformDrivere(plan.plattform || STANDARD_PLATTFORM));
  const [fe, setFe] = useState(() => rensFelles(plan.felles || STANDARD_FELLES));
  const [aapne, setAapne] = useState({ vekst: true, unit: false, faste: false, felles: true });
  const [skittent, setSkittent] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [feil, setFeil] = useState('');
  const N = Math.min(36, Math.max(1, Number(antallMnd) || 12));

  const mF = useMemo(() => beregnInvestorModell({ antallMnd: N, fakta, drivere, startYm }), [N, fakta, drivere, startYm]);
  const mP = useMemo(() => beregnPlattform({ antallMnd: N, drivere: pl }), [N, pl]);
  const k = useMemo(() => beregnKonsern({ forvaltning: mF, plattform: mP, felles: fe, antallMnd: N }), [mF, mP, fe, N]);

  const settPl = (key, v) => { setPl((c) => ({ ...c, [key]: v })); setSkittent(true); };
  const settFe = (key, v) => { setFe((c) => ({ ...c, [key]: v })); setSkittent(true); };
  const toggle = (g) => setAapne((c) => ({ ...c, [g]: !c[g] }));

  const lagre = useCallback(async () => {
    if (lagrer || readOnly) return;
    setLagrer(true); setFeil('');
    try {
      await api('plan', {
        method: 'PUT',
        body: {
          id: plan.id, type: 'modell', navn: plan.navn || 'Budsjett', startYm: plan.startYm, antallMnd: N,
          status: plan.status, notat: plan.notat || '', investorSynlig: Boolean(plan.investorSynlig),
          drivere, plattform: rensPlattformDrivere(pl), felles: rensFelles(fe),
        },
      });
      setSkittent(false); setLagret(true); setTimeout(() => setLagret(false), 1800);
      onLagret?.();
    } catch (e) { setFeil(e.message || 'Kunne ikke lagre'); }
    setLagrer(false);
  }, [api, plan, N, drivere, pl, fe, lagrer, readOnly, onLagret]);

  const s = k.sammendrag;
  const beTekst = (idx) => (idx === null || idx === undefined ? 'Ikke i perioden' : mndLabel(startYm, idx));
  const honorarF = mF.cac?.bruttoHonorarNy || 0;

  return (
    <div className="mt-4" data-testid="konsern-modell">
      {/* Nøkkeltall */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5" data-testid="konsern-nokkeltall">
        <Nokkel label="Konsernresultat i perioden" verdi={mkr(s.resultat)} tone={s.resultat < 0 ? 'neg' : 'pos'} under={`Forvaltning ${mkr(s.resultatForvaltning)} · Plattform ${mkr(s.resultatPlattform)}`} testid="konsern-resultat" />
        <Nokkel label="Break-even konsern" verdi={beTekst(s.breakEvenIdx)} under={`Forvaltning ${beTekst(s.breakEvenForvaltningIdx)} · Plattform ${beTekst(s.breakEvenPlattformIdx)}`} testid="konsern-breakeven" />
        <Nokkel label="Kapitalbehov" verdi={mkr(s.kapitalbehov)} under={s.kapitalbehovIdx !== null ? `dypest ${mndLabel(startYm, s.kapitalbehovIdx)}` : 'ingen negativ akkumulering'} testid="konsern-kapital" />
        <Nokkel label="ARR ved slutt" verdi={mkr(s.arrExit)} under={`Forvaltning ${mkr(s.arrExitForvaltning)} · Plattform ${mkr(s.arrExitPlattform)}`} testid="konsern-arr" />
        <Nokkel label="Plattformens andel" verdi={s.andelPlattformPct === null ? '—' : `${s.andelPlattformPct} %`} under={`Felles ${mkr(s.sumFelles)} fordelt ${fe.fordeling === 'omsetning' ? 'etter omsetning' : fe.fordeling === 'likt' ? '50/50' : `${fe.forvaltningPct}/${100 - fe.forvaltningPct}`}`} testid="konsern-andel" />
      </div>

      <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-start">
        {/* ── Rail: plattform + felles ── */}
        <aside className="flex w-full shrink-0 flex-col gap-2 xl:w-[340px]" data-testid="konsern-drivere">
          <Gruppe tittel="Plattform · vekst" under={`${kr0(pl.annonsePerMnd)} kr/mnd ÷ ${kr0(pl.cacPerEnhet)} kr CAC + ${pl.organiskPerMnd} organisk`} aapen={aapne.vekst} onToggle={() => toggle('vekst')} testid="konsern-gruppe-vekst">
            <Felt label="Aktive enheter i dag" verdi={pl.startEnheter} onChange={(v) => settPl('startEnheter', v)} enhet="enh" readOnly={readOnly} testid="pl-startEnheter" hint="Selvbetjente enheter som betaler ved planstart" />
            <Felt label="Organisk vekst" verdi={pl.organiskPerMnd} onChange={(v) => settPl('organiskPerMnd', v)} enhet="/mnd" steg={0.5} readOnly={readOnly} testid="pl-organisk" />
            <Felt label="Annonsebudsjett" verdi={pl.annonsePerMnd} onChange={(v) => settPl('annonsePerMnd', v)} enhet="kr/mnd" steg={1000} readOnly={readOnly} testid="pl-annonse" />
            <Felt label="CAC per aktivert enhet" verdi={pl.cacPerEnhet} onChange={(v) => settPl('cacPerEnhet', v)} enhet="kr" steg={100} min={1} readOnly={readOnly} testid="pl-cac" hint="Annonsekost per enhet som faktisk aktiveres" />
            <Felt label="Årlig churn" verdi={pl.aarligChurnPct} onChange={(v) => settPl('aarligChurnPct', v)} enhet="%" steg={1} readOnly={readOnly} testid="pl-churn" />
            {/* Annonsefaser */}
            <div className="mt-2 border-t border-black/[0.05] pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#57534e]">Annonsefaser</span>
                {!readOnly && pl.vekstplan.length < 11 ? (
                  <button onClick={() => settPl('vekstplan', [...pl.vekstplan, { fraMnd: Math.min(N, (pl.vekstplan.at(-1)?.fraMnd || 1) + 6), annonsePerMnd: pl.annonsePerMnd * 2 }])} className="flex h-7 items-center gap-1 rounded-full bg-[#f0efec] px-2.5 text-[11.5px] font-medium text-[#57534e] hover:text-[#1c1917]" data-testid="pl-fase-ny"><Plus className="h-3 w-3" /> Fase</button>
                ) : null}
              </div>
              {pl.vekstplan.length === 0 ? <p className="mt-1 text-[11.5px] text-[#a6a19a]">Konstant budsjett hele perioden.</p> : null}
              {pl.vekstplan.map((f, i) => (
                <div key={i} className="mt-1.5 flex items-center gap-2 text-[12px]">
                  <span className="text-[#8f8a82]">fra mnd</span>
                  <input type="number" min={2} max={N} value={f.fraMnd} disabled={readOnly} onChange={(e) => settPl('vekstplan', pl.vekstplan.map((x, j) => (j === i ? { ...x, fraMnd: e.target.value } : x)))} className="h-7 w-14 rounded-[7px] border border-black/[0.08] px-1.5 text-right" />
                  <input type="number" step={1000} value={f.annonsePerMnd} disabled={readOnly} onChange={(e) => settPl('vekstplan', pl.vekstplan.map((x, j) => (j === i ? { ...x, annonsePerMnd: e.target.value } : x)))} className="h-7 w-24 rounded-[7px] border border-black/[0.08] px-1.5 text-right" />
                  <span className="text-[#a6a19a]">kr/mnd</span>
                  {!readOnly ? <button onClick={() => settPl('vekstplan', pl.vekstplan.filter((_, j) => j !== i))} className="ml-auto text-[#a6a19a] hover:text-[#b3261e]"><X className="h-3.5 w-3.5" /></button> : null}
                </div>
              ))}
            </div>
          </Gruppe>
          <Gruppe tittel="Plattform · unit economics" under={`ARPU ${kr(mP.unit.arpu)} · bidrag ${kr(mP.unit.bidrag)} · ${mP.unit.bruttoMarginPct ?? '—'} %`} aapen={aapne.unit} onToggle={() => toggle('unit')} testid="konsern-gruppe-unit">
            <Felt label="Snitt månedsleie" verdi={pl.snittleie} onChange={(v) => settPl('snittleie', v)} enhet="kr" steg={500} readOnly={readOnly} testid="pl-snittleie" />
            <Felt label="Plattformsats (inkl. mva)" verdi={pl.satsPct} onChange={(v) => settPl('satsPct', v)} enhet="%" steg={0.5} readOnly={readOnly} testid="pl-sats" />
            <Felt label="Oppstart per ny enhet" verdi={pl.oppstartPerEnhet} onChange={(v) => settPl('oppstartPerEnhet', v)} enhet="kr" steg={100} readOnly={readOnly} testid="pl-oppstart" />
            <Felt label="Variabel kost per enhet" verdi={pl.variabelPerEnhet} onChange={(v) => settPl('variabelPerEnhet', v)} enhet="kr/mnd" steg={5} readOnly={readOnly} testid="pl-variabel" hint="LLM, kart/adresse, SMS, e-signering" />
            <Felt label="Support per 100 enheter" verdi={pl.supportTimerPer100} onChange={(v) => settPl('supportTimerPer100', v)} enhet="t/mnd" steg={0.5} readOnly={readOnly} testid="pl-support" />
            <Felt label="Timekost support" verdi={pl.timekost} onChange={(v) => settPl('timekost', v)} enhet="kr" steg={50} readOnly={readOnly} testid="pl-timekost" />
          </Gruppe>
          <Gruppe tittel="Plattform · faste og justering" under={`${kr0(pl.utviklingFast)} kr/mnd utvikling`} aapen={aapne.faste} onToggle={() => toggle('faste')} testid="konsern-gruppe-faste">
            <Felt label="Utvikling og drift" verdi={pl.utviklingFast} onChange={(v) => settPl('utviklingFast', v)} enhet="kr/mnd" steg={5000} readOnly={readOnly} testid="pl-utvikling" />
            <Felt label="Andre faste" verdi={pl.andreFaste} onChange={(v) => settPl('andreFaste', v)} enhet="kr/mnd" steg={1000} readOnly={readOnly} testid="pl-andre" />
            <Felt label="Leiejustering fra år 2" verdi={pl.indeksPct} onChange={(v) => settPl('indeksPct', v)} enhet="%/år" steg={0.5} readOnly={readOnly} testid="pl-indeks" />
            <Felt label="Kostnadsvekst fra år 2" verdi={pl.kostInflasjonPct} onChange={(v) => settPl('kostInflasjonPct', v)} enhet="%/år" steg={0.5} readOnly={readOnly} testid="pl-inflasjon" />
          </Gruppe>
          <Gruppe tittel="Felles" under={`${kr0(FELLES_POSTER.reduce((a, [kk]) => a + (Number(fe[kk]) || 0), 0))} kr/mnd · ${fe.fordeling === 'omsetning' ? 'etter omsetning' : fe.fordeling === 'likt' ? 'likt' : 'fast nøkkel'}`} aapen={aapne.felles} onToggle={() => toggle('felles')} testid="konsern-gruppe-felles">
            {FELLES_POSTER.map(([kk, label]) => (
              <Felt key={kk} label={label} verdi={fe[kk]} onChange={(v) => settFe(kk, v)} enhet="kr/mnd" steg={1000} readOnly={readOnly} testid={`fe-${kk}`} />
            ))}
            <div className="mt-2 border-t border-black/[0.05] pt-2">
              <span className="text-[12px] font-medium text-[#57534e]">Fordelingsnøkkel</span>
              <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-[10px] bg-[#f0efec] p-1" data-testid="fe-fordeling">
                {[['omsetning', 'Omsetning'], ['likt', '50/50'], ['fast', 'Fast']].map(([v, l]) => (
                  <button key={v} disabled={readOnly} onClick={() => settFe('fordeling', v)} className={`h-8 rounded-[8px] text-[12px] font-medium transition-colors ${fe.fordeling === v ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82] hover:text-[#1c1917]'}`}>{l}</button>
                ))}
              </div>
              {fe.fordeling === 'fast' ? <Felt label="Andel til forvaltning" verdi={fe.forvaltningPct} onChange={(v) => settFe('forvaltningPct', v)} enhet="%" readOnly={readOnly} testid="fe-andel" /> : null}
              <Felt label="Kostnadsvekst fra år 2" verdi={fe.kostInflasjonPct} onChange={(v) => settFe('kostInflasjonPct', v)} enhet="%/år" steg={0.5} readOnly={readOnly} testid="fe-inflasjon" />
            </div>
          </Gruppe>
          {!readOnly ? (
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <p className="text-[11.5px] text-[#a6a19a]">Forvaltningens drivere redigeres under «Forvaltning».</p>
              <button onClick={lagre} disabled={lagrer || !skittent} className={`${KNAPP_PRIMAER} relative shrink-0`} data-testid="konsern-lagre">
                {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lagret ? <Check className="h-3.5 w-3.5" /> : null}
                {lagret ? 'Lagret' : 'Lagre konsern'}
                {skittent && !lagrer ? <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#6d28d9] ring-2 ring-[#f7f7f5]" /> : null}
              </button>
            </div>
          ) : null}
          {feil ? <p className="px-1 text-[12.5px] text-[#b3261e]" data-testid="konsern-feil">{feil}</p> : null}
        </aside>

        {/* ── Innhold ── */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-[#1c1917]" style={heading}>Inntekt per segment og kostnader · {N} måneder</h3>
              <div className="flex items-center gap-4 text-[11.5px] text-[#8f8a82]">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#1c1917]" /> Forvaltning</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#c084fc]" /> Plattform</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#b3261e]" /> Kostnader inkl. felles</span>
              </div>
            </div>
            <KonsernGraf k={k} startYm={startYm} />
          </div>

          {/* Årstabell per segment */}
          <div className="overflow-x-auto rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="konsern-aarstabell">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead>
                <tr className="text-left text-[11.5px] text-[#8f8a82]">
                  <th className="pb-2 font-medium">Per planår</th>
                  {k.aar.map((a) => <th key={a.nr} className="pb-2 text-right font-medium">År {a.nr}{a.antallMnd < 12 ? ` (${a.antallMnd} mnd)` : ''}</th>)}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[
                  ['Inntekt forvaltning', (a) => a.inntektForvaltning],
                  ['Inntekt plattform', (a) => a.inntektPlattform],
                  ['Sum inntekt', (a) => a.inntekt, 'sum'],
                  ['Kost forvaltning', (a) => -a.kostForvaltning],
                  ['Kost plattform', (a) => -a.kostPlattform],
                  ['Felles', (a) => -a.felles],
                  ['Resultat forvaltning (etter felles)', (a) => a.resultatForvaltning],
                  ['Resultat plattform (etter felles)', (a) => a.resultatPlattform],
                  ['Konsernresultat', (a) => a.resultat, 'sum'],
                  ['Margin', (a) => (a.marginPct === null ? '—' : `${a.marginPct} %`), 'tekst'],
                  ['ARR ved årsslutt', (a) => a.arrExit],
                ].map(([label, fn, type]) => (
                  <tr key={label} className={`border-t border-black/[0.05] ${type === 'sum' ? 'font-semibold text-[#1c1917]' : 'text-[#57534e]'}`}>
                    <td className="py-1.5">{label}</td>
                    {k.aar.map((a) => { const v = fn(a); return <td key={a.nr} className={`py-1.5 text-right ${typeof v === 'number' && v < 0 ? 'text-[#b3261e]' : ''}`}>{typeof v === 'number' ? kr0(v) : v}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unit economics side om side */}
          <div className="grid gap-3 md:grid-cols-2" data-testid="konsern-unit">
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              <p className="text-[11.5px] font-medium text-[#8f8a82]">Forvaltning · per enhet per måned</p>
              <dl className="mt-2 divide-y divide-black/[0.05] text-[13px]">
                {[['Honorar (eks. mva)', kr(honorarF)], ['Systemkost', `−${kr(mF.cac?.systemPerEnhet || 0)}`], ['Bidrag før bemanning', kr(mF.cac?.bidrag || 0)], ['CAC (provisjon)', kr(mF.cac?.provisjon || 0)], ['Payback', mF.cac?.paybackMnd ? `${mF.cac.paybackMnd} mnd` : '—'], ['Enheter per årsverk', `${mF.drivere.enheterPerAarsverk}`]].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between py-1.5"><dt className="text-[#57534e]">{l}</dt><dd className="font-medium text-[#1c1917]">{v}</dd></div>
                ))}
              </dl>
            </div>
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              <p className="text-[11.5px] font-medium text-[#8f8a82]">Plattform · per enhet per måned</p>
              <dl className="mt-2 divide-y divide-black/[0.05] text-[13px]">
                {[['ARPU (eks. mva)', kr(mP.unit.arpu)], ['Variabel kost + support', `−${kr(mP.unit.variabelPerEnhet)}`], ['Bidrag', `${kr(mP.unit.bidrag)} · ${mP.unit.bruttoMarginPct ?? '—'} %`], ['CAC', kr(mP.unit.cac)], ['Payback', mP.unit.paybackMnd ? `${mP.unit.paybackMnd} mnd` : '—'], ['Levetid · LTV · LTV/CAC', `${mP.unit.levetidMnd ?? '—'} mnd · ${mP.unit.ltv ? kr(mP.unit.ltv) : '—'} · ${mP.unit.ltvCac ?? '—'}×`]].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between py-1.5"><dt className="text-[#57534e]">{l}</dt><dd className="font-medium text-[#1c1917]">{v}</dd></div>
                ))}
              </dl>
            </div>
          </div>
          <p className="flex items-start gap-1.5 px-1 text-[11.5px] text-[#a6a19a]"><HelpCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" /> Konsernet regnes måned for måned: forvaltning + plattform + felles. Break-even per segment er etter fordelt felles. Kapitalbehov = dypeste akkumulerte resultat for konsernet.</p>
        </div>
      </div>
    </div>
  );
}
