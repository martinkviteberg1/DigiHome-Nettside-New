'use client';

/* ═══════════ ENHETSØKONOMI — Datarom-siden som beviser skalerbarheten ═══════════
   Investorhistorien for en asset-light forvalter: hver enhet bærer seg selv,
   og marginen per enhet ØKER når porteføljen vokser (faste kostnader deles på
   flere enheter, og manpower vokser i trapp — ikke lineært).
   · Nå-bilde: honorar/kostnad/margin per utleid enhet, CAC/payback, break-even
   · Skaleringsgraf: enheter under forvaltning + kostnad per enhet (historisk)
   · Manpower-modell: 1 forvalter per N enheter → lønnstrapp + marginutvikling
   Lese-only for investor. Admin kan justere modellantakelsene.
   API: GET /api/admin/datarom/enhetsokonomi, PUT .../enhetsokonomi/antakelser */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, TrendingUp, Wallet, Scale, Target, Users, Check, Pencil, X, Info,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';

const heading = { fontFamily: 'var(--font-heading)' };
const tallFmt = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const kr = (v) => `${tallFmt.format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F')}\u202Fkr`;
const mndNavn = (ym) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  return `${['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'][m - 1]} ${String(y).slice(2)}`;
};

const Kort = ({ children, className = '', ...rest }) => (
  <div className={`rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] ${className}`} {...rest}>{children}</div>
);
const Etikett = ({ children }) => (
  <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a8a29a]">{children}</p>
);

function KpiKort({ label, verdi, sub, farge = '#0a0a0a', icon: Icon, testid }) {
  return (
    <Kort className="min-w-0" data-testid={testid}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: '#b3ada3' }} />}
        <Etikett>{label}</Etikett>
      </div>
      <p className="mt-1.5 truncate text-[22px] font-bold tabular-nums leading-none" style={{ ...heading, color: farge }}>{verdi}</p>
      {sub && <p className="mt-1.5 text-[11px] leading-snug text-[#a8a29a]">{sub}</p>}
    </Kort>
  );
}

/* Rolig tooltip i samme stil som resten av datarommet. */
function GrafTip({ active, payload, label, rader }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-[11.5px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
      <p className="font-semibold text-[#1c1917]">{label}</p>
      {rader(payload[0]?.payload || {}).map(([l, v, c]) => (
        <p key={l} className="mt-0.5 tabular-nums" style={{ color: c || '#78716c' }}>{l}: <b>{v}</b></p>
      ))}
    </div>
  );
}

export default function Enhetsokonomi({ api, erAdmin = false }) {
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [redigerAnt, setRedigerAnt] = useState(false);
  const [antForm, setAntForm] = useState({ kapasitetPerForvalter: 40, lonnPerAarsverk: 45000, minsteAarsverkPst: 30, aarsverkTrinn: 0.1 });
  const [lagrer, setLagrer] = useState(false);

  const hent = useCallback(async () => {
    try {
      const j = await api('enhetsokonomi');
      setData(j);
      setAntForm({
        kapasitetPerForvalter: j.antakelser?.kapasitetPerForvalter || 40,
        lonnPerAarsverk: j.antakelser?.lonnPerAarsverk ?? 45000,
        minsteAarsverkPst: Math.round((j.antakelser?.minsteAarsverk ?? 0.3) * 100),
        aarsverkTrinn: j.antakelser?.aarsverkTrinn || 0.1,
      });
      setFeil('');
    } catch (e) { setFeil(e.message || 'Kunne ikke hente enhetsøkonomien'); }
    setLaster(false);
  }, [api]);
  useEffect(() => { hent(); }, [hent]);

  const lagreAntakelser = async () => {
    if (lagrer) return;
    setLagrer(true);
    try {
      await api('enhetsokonomi/antakelser', {
        method: 'PUT',
        body: {
          kapasitetPerForvalter: antForm.kapasitetPerForvalter,
          lonnPerAarsverk: antForm.lonnPerAarsverk,
          minsteAarsverk: Math.round(Number(antForm.minsteAarsverkPst) || 30) / 100,
          aarsverkTrinn: antForm.aarsverkTrinn,
        },
      });
      setRedigerAnt(false);
      await hent();
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  };

  const naa = data?.naa || {};
  const antak = data?.antakelser || { kapasitetPerForvalter: 40, lonnPerAarsverk: 45000 };

  /* ── Manpower-/skaleringsmodell (klientberegnet fra nå-bildet + antakelser):
     honorar(N) = N × dagens snitthonorar; bemanning kan være brøkstilling —
     årsverk(N) = max(minste stillingsbrøk, behov rundet OPP til nærmeste trinn);
     øvrige faste holdes på dagens nivå (konservativt). ── */
  const beregnAarsverk = useCallback((nEnh) => {
    const kap = Math.max(1, antak.kapasitetPerForvalter || 40);
    const minste = Math.max(0.05, antak.minsteAarsverk || 0.3);
    const trinn = antak.aarsverkTrinn || 0.1;
    const behov = nEnh / kap;
    const trappet = Math.ceil((behov - 1e-9) / trinn) * trinn;
    return Math.max(minste, Math.round(trappet * 100) / 100);
  }, [antak]);
  const fmtAarsverk = (v) => Number(v).toLocaleString('nb-NO', { maximumFractionDigits: 2 });

  const modell = useMemo(() => {
    const hPer = naa.honorarPerEnhet || 0;
    const dPer = naa.direktePerEnhet || 0;
    const andre = naa.andreFasteMnd || 0;
    const lonn = Math.max(0, antak.lonnPerAarsverk || 0);
    const maks = Math.max(120, Math.ceil(((naa.utleide || 0) * 3) / 10) * 10);
    const punkter = [];
    for (let nEnh = 5; nEnh <= maks; nEnh += 5) {
      const aarsverk = beregnAarsverk(nEnh);
      const lonnMnd = Math.round(aarsverk * lonn);
      const margin = nEnh * (hPer - dPer) - lonnMnd - andre;
      punkter.push({ enheter: nEnh, aarsverk, lonnMnd, margin, marginPerEnhet: Math.round(margin / nEnh) });
    }
    return { punkter, maks };
  }, [naa, antak, beregnAarsverk]);

  const trapp = useMemo(() => {
    const hPer = naa.honorarPerEnhet || 0;
    const dPer = naa.direktePerEnhet || 0;
    const andre = naa.andreFasteMnd || 0;
    const lonn = Math.max(0, antak.lonnPerAarsverk || 0);
    const steg = Array.from(new Set([naa.utleide || 0, 25, 50, 75, 100].filter((x) => x > 0))).sort((a, b) => a - b);
    return steg.map((nEnh) => {
      const aarsverk = beregnAarsverk(nEnh);
      const lonnMnd = Math.round(aarsverk * lonn);
      const honorar = nEnh * hPer;
      const margin = honorar - nEnh * dPer - lonnMnd - andre;
      return { enheter: nEnh, aarsverk, lonnMnd, andre, honorar, margin, marginPerEnhet: Math.round(margin / nEnh), erNaa: nEnh === (naa.utleide || 0) };
    });
  }, [naa, antak, beregnAarsverk]);

  if (laster) return <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" /></div>;
  if (feil && !data) return <Kort><p className="text-[13px] text-[#999]">{feil}</p></Kort>;

  const serie = (data?.serie || []).map((p) => ({ ...p, navn: mndNavn(p.ym) }));
  const marginFarge = (v) => (v >= 0 ? '#1f7a45' : '#c2413b');

  return (
    <div className="space-y-4" data-testid="datarom-enhetsokonomi">
      {/* ── Nå-bildet ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiKort
          label="Honorar / enhet" icon={TrendingUp} testid="eo-kpi-honorar"
          verdi={`${kr(naa.honorarPerEnhet)}`}
          sub={`${naa.utleide || 0} utleide enheter · ${kr(naa.honorarMnd)}/mnd totalt`}
        />
        <KpiKort
          label="Kostnad / enhet" icon={Wallet} testid="eo-kpi-kostnad"
          verdi={`${kr(naa.kostnadPerEnhet)}`}
          sub={`Faste ${kr(naa.fasteMnd)}/mnd delt på utleide${naa.direkteMnd ? ` + direkte ${kr(naa.direktePerEnhet)}/enhet` : ''}`}
        />
        <KpiKort
          label="Margin / enhet" icon={Scale} testid="eo-kpi-margin"
          verdi={`${naa.marginPerEnhet >= 0 ? '+' : '−'}${kr(Math.abs(naa.marginPerEnhet || 0))}`}
          farge={marginFarge(naa.marginPerEnhet || 0)}
          sub={naa.marginPerEnhet >= 0 ? 'Etter alle faste kostnader' : 'Snur ved break-even — se neste kort'}
        />
        <KpiKort
          label="Break-even" icon={Target} testid="eo-kpi-breakeven"
          verdi={naa.breakEvenEnheter ? `${naa.breakEvenEnheter} enheter` : '—'}
          sub={naa.breakEvenEnheter
            ? (naa.utleide >= naa.breakEvenEnheter
              ? `Passert — ${naa.utleide} utleide i dag`
              : `${naa.utleide} av ${naa.breakEvenEnheter} utleide · ${naa.breakEvenEnheter - naa.utleide} igjen`)
            : 'Krever honorar per enhet > 0'}
        />
        <KpiKort
          label="CAC · payback" icon={Users} testid="eo-kpi-cac"
          verdi={naa.cacSnitt ? kr(naa.cacSnitt) : '—'}
          sub={naa.paybackMnd ? `Tjener inn anskaffelsen på ~${naa.paybackMnd} mnd` : 'CAC settes per enhet i Leieforhold'}
        />
      </div>

      {/* ── Skaleringsgrafen: enheter opp, kostnad per enhet ned ── */}
      <Kort data-testid="eo-skaleringsgraf">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-[14px] font-semibold text-[#1c1917]" style={heading}>Skalering — kostnad per enhet faller når porteføljen vokser</p>
            <p className="mt-0.5 text-[11.5px] text-[#a8a29a]">Faste kostnader deles på stadig flere enheter — kjernen i den asset-lette modellen.</p>
          </div>
          <span className="flex items-center gap-3 text-[10.5px] font-semibold text-[#a8a29a]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[3px] bg-[#ded5f5]" /> Enheter under forvaltning</span>
            <span className="flex items-center gap-1"><span className="h-[2px] w-3.5 rounded bg-[#9a6b1c]" /> Kostnad / enhet</span>
          </span>
        </div>
        {serie.length >= 2 ? (
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f1efe9" vertical={false} />
                <XAxis dataKey="navn" tick={{ fontSize: 10.5, fill: '#b3ada3' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="enh" tick={{ fontSize: 10.5, fill: '#b3ada3' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <YAxis yAxisId="kost" orientation="right" tick={{ fontSize: 10.5, fill: '#c4a978' }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => tallFmt.format(v)} />
                <Tooltip content={<GrafTip rader={(p) => [
                  ['Enheter', p.enheter, '#6d28d9'],
                  ['Kostnad totalt', kr(p.kostnad), '#78716c'],
                  ['Kostnad per enhet', p.kostnadPerEnhet != null ? kr(p.kostnadPerEnhet) : '—', '#9a6b1c'],
                ]} />} />
                <Bar yAxisId="enh" dataKey="enheter" fill="#ded5f5" radius={[4, 4, 0, 0]} maxBarSize={34} />
                <Line yAxisId="kost" dataKey="kostnadPerEnhet" stroke="#9a6b1c" strokeWidth={2} dot={{ r: 2.5, fill: '#9a6b1c' }} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-[#fafaf8] px-4 py-3 text-[12px] text-[#a8a29a]">Historikken tegnes automatisk etter hvert som porteføljen og kostnadsregisteret får flere måneder.</p>
        )}
        <p className="mt-3 text-[10.5px] leading-snug text-[#b8b2a9]">Kostnad per måned hentes fra regnskapet der det er ført, ellers fra kostnadsregisteret (aktive poster i måneden). Enheter = porteføljen fra Leieforhold, plassert på startmåned.</p>
      </Kort>

      {/* ── Manpower-modellen ── */}
      <Kort data-testid="eo-manpower">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-[#1c1917]" style={heading}>Manpower-modellen — bemanning i brøkstillinger, ikke lineær lønn</p>
            <p className="mt-0.5 text-[11.5px] text-[#a8a29a]">Én forvalter håndterer ~{antak.kapasitetPerForvalter} enheter. Bemanningen starter på {Math.round((antak.minsteAarsverk || 0.3) * 100)}&nbsp;% stilling og vokser i trinn på {Math.round((antak.aarsverkTrinn || 0.1) * 100)}&nbsp;% — honoraret vokser per enhet.</p>
          </div>
          {!redigerAnt ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#f4f0fb] px-2.5 py-1 text-[10.5px] font-semibold text-[#6d28d9]" data-testid="eo-antakelse-kapasitet">{antak.kapasitetPerForvalter} enh/forvalter</span>
              <span className="rounded-full bg-[#fdf3e0] px-2.5 py-1 text-[10.5px] font-semibold text-[#9a6b1c]" data-testid="eo-antakelse-lonn">{kr(antak.lonnPerAarsverk)}/årsverk/mnd</span>
              <span className="rounded-full bg-[#eef6f0] px-2.5 py-1 text-[10.5px] font-semibold text-[#1f7a45]" data-testid="eo-antakelse-bemanning">min {Math.round((antak.minsteAarsverk || 0.3) * 100)} % · trinn {Math.round((antak.aarsverkTrinn || 0.1) * 100)} %</span>
              {erAdmin && (
                <button onClick={() => setRedigerAnt(true)} data-testid="eo-rediger-antakelser" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]" title="Juster antakelsene">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#8b5cf6]/20 bg-[#faf8ff] p-2.5" data-testid="eo-antakelse-skjema">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Enheter per forvalter</span>
                <input type="number" min="1" max="500" value={antForm.kapasitetPerForvalter} onChange={(e) => setAntForm((f) => ({ ...f, kapasitetPerForvalter: Number(e.target.value) }))} className="h-8 w-[90px] rounded-[7px] border border-black/[0.08] bg-white px-2 text-[12.5px] tabular-nums outline-none focus:border-[#8b5cf6]/40" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Lønn per årsverk (kr/mnd)</span>
                <input type="number" min="0" step="1000" value={antForm.lonnPerAarsverk} onChange={(e) => setAntForm((f) => ({ ...f, lonnPerAarsverk: Number(e.target.value) }))} className="h-8 w-[120px] rounded-[7px] border border-black/[0.08] bg-white px-2 text-[12.5px] tabular-nums outline-none focus:border-[#8b5cf6]/40" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Minste bemanning (%)</span>
                <input type="number" min="5" max="1000" step="5" value={antForm.minsteAarsverkPst} onChange={(e) => setAntForm((f) => ({ ...f, minsteAarsverkPst: Number(e.target.value) }))} data-testid="eo-input-minste" className="h-8 w-[80px] rounded-[7px] border border-black/[0.08] bg-white px-2 text-[12.5px] tabular-nums outline-none focus:border-[#8b5cf6]/40" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Trinn</span>
                <select value={antForm.aarsverkTrinn} onChange={(e) => setAntForm((f) => ({ ...f, aarsverkTrinn: Number(e.target.value) }))} data-testid="eo-input-trinn" className="h-8 rounded-[7px] border border-black/[0.08] bg-white px-2 text-[12.5px] outline-none focus:border-[#8b5cf6]/40">
                  <option value={0.05}>5 %</option>
                  <option value={0.1}>10 %</option>
                  <option value={0.2}>20 %</option>
                  <option value={0.25}>25 %</option>
                  <option value={0.5}>50 %</option>
                  <option value={1}>100 %</option>
                </select>
              </label>
              <button onClick={lagreAntakelser} disabled={lagrer} data-testid="eo-lagre-antakelser" className="flex h-8 items-center gap-1 rounded-[7px] bg-[#0a0a0a] px-3 text-[12px] font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-40">
                {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Lagre
              </button>
              <button onClick={() => setRedigerAnt(false)} className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#a8a29a] hover:text-[#57534e]"><X className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <div className="mt-4 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={modell.punkter} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f1efe9" vertical={false} />
              <XAxis dataKey="enheter" tick={{ fontSize: 10.5, fill: '#b3ada3' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
              <YAxis tick={{ fontSize: 10.5, fill: '#b3ada3' }} axisLine={false} tickLine={false} width={58} tickFormatter={(v) => tallFmt.format(v)} />
              <Tooltip content={<GrafTip rader={(p) => [
                ['Enheter', p.enheter, '#6d28d9'],
                ['Årsverk', fmtAarsverk(p.aarsverk), '#78716c'],
                ['Lønn / mnd', kr(p.lonnMnd), '#9a6b1c'],
                ['Margin / mnd', kr(p.margin), p.margin >= 0 ? '#1f7a45' : '#c2413b'],
                ['Margin / enhet', kr(p.marginPerEnhet), p.marginPerEnhet >= 0 ? '#1f7a45' : '#c2413b'],
              ]} />} />
              {(naa.utleide || 0) > 0 && <ReferenceLine x={Math.round((naa.utleide || 0) / 5) * 5} stroke="#c9c2f0" strokeDasharray="4 3" label={{ value: 'I dag', position: 'top', fontSize: 10, fill: '#8b5cf6' }} />}
              <ReferenceLine y={0} stroke="#e4e0d8" />
              <Line dataKey="lonnMnd" stroke="#9a6b1c" strokeWidth={2} dot={false} type="stepAfter" />
              <Line dataKey="margin" stroke="#1f7a45" strokeWidth={2} dot={false} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex items-center gap-3 text-[10.5px] font-semibold text-[#a8a29a]">
          <span className="flex items-center gap-1"><span className="h-[2px] w-3.5 rounded bg-[#9a6b1c]" /> Lønnskostnad (trapp)</span>
          <span className="flex items-center gap-1"><span className="h-[2px] w-3.5 rounded bg-[#1f7a45]" /> Margin / mnd</span>
        </p>
      </Kort>

      {/* ── Margintrappen i tall ── */}
      <Kort data-testid="eo-margintrapp">
        <p className="text-[14px] font-semibold text-[#1c1917]" style={heading}>Margintrappen — dagens satser, voksende portefølje</p>
        <div className="mt-3 -mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[620px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">
                <th className="py-2 pr-3 font-bold">Utleide enheter</th>
                <th className="py-2 pr-3 font-bold">Årsverk</th>
                <th className="py-2 pr-3 text-right font-bold">Lønn / mnd</th>
                <th className="py-2 pr-3 text-right font-bold">Øvrige faste</th>
                <th className="py-2 pr-3 text-right font-bold">Honorar / mnd</th>
                <th className="py-2 pr-3 text-right font-bold">Margin / mnd</th>
                <th className="py-2 text-right font-bold">Margin / enhet</th>
              </tr>
            </thead>
            <tbody>
              {trapp.map((r) => (
                <tr key={r.enheter} className={`border-t border-black/[0.04] ${r.erNaa ? 'bg-[#faf8ff]' : ''}`} data-testid={`eo-trapp-${r.enheter}`}>
                  <td className="py-2.5 pr-3 font-semibold text-[#1c1917]">{r.enheter}{r.erNaa && <span className="ml-1.5 rounded bg-[#f4f0fb] px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-[#8b5cf6]">I dag</span>}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-[#57534e]">{fmtAarsverk(r.aarsverk)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-[#57534e]">{kr(r.lonnMnd)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-[#57534e]">{kr(r.andre)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-[#57534e]">{kr(r.honorar)}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums" style={{ color: marginFarge(r.margin) }}>{r.margin >= 0 ? '+' : '−'}{kr(Math.abs(r.margin))}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums" style={{ color: marginFarge(r.marginPerEnhet) }}>{r.marginPerEnhet >= 0 ? '+' : '−'}{kr(Math.abs(r.marginPerEnhet))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-snug text-[#b8b2a9]">
          <Info className="mt-[1px] h-3 w-3 shrink-0" />
          Modell med dagens snitthonorar ({kr(naa.honorarPerEnhet)}/enhet) og dagens øvrige faste kostnader holdt flate. Honorar er DigiHomes inntekt eks. mva — aldri huseiers leie. Antakelsene ({antak.kapasitetPerForvalter} enheter per forvalter, {kr(antak.lonnPerAarsverk)}/årsverk, minste bemanning {Math.round((antak.minsteAarsverk || 0.3) * 100)} %, trinn {Math.round((antak.aarsverkTrinn || 0.1) * 100)} %) settes av DigiHome og kan justeres.
        </p>
      </Kort>
    </div>
  );
}
