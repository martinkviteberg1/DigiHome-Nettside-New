'use client';

import React from 'react';
import { TrendingUp, TrendingDown, FlaskConical, Trophy, AlertCircle, ArrowDownRight, Layers } from 'lucide-react';

const nf = (n) => new Intl.NumberFormat('nb-NO').format(n || 0);

// Vertikal trakt for ett skjema: start → steg → sendt, med drop-off pr. trinn.
function FormFunnel({ f }) {
  const steps = f.steps || [];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{f.label}</h3>
          <p className="text-[12px] text-[#999] mt-0.5">{nf(f.starts)} åpnet · {nf(f.submits)} sendt</p>
        </div>
        <div className="text-right">
          <p className="text-[26px] leading-none font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{f.conversionRate}%</p>
          <p className="text-[10.5px] uppercase tracking-[0.08em] text-[#bbb] font-semibold mt-1">fullfører</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          const isWorst = f.biggestDropoff && f.biggestDropoff.label === s.label && s.dropoffRate > 0;
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="text-[#444] font-medium flex items-center gap-1.5">
                  {i + 1}. {s.label}
                  {isLast && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold">mål</span>}
                </span>
                <span className="text-[#0a0a0a] font-semibold tabular-nums">
                  {nf(s.count)} <span className="text-[#bbb] font-normal">· {s.rate}%</span>
                  {i > 0 && s.dropoff > 0 && (
                    <span className={`ml-2 text-[11px] font-semibold ${isWorst ? 'text-rose-500' : 'text-amber-500'}`}>−{nf(s.dropoff)} ({s.dropoffRate}%)</span>
                  )}
                </span>
              </div>
              <div className="h-7 rounded-lg bg-[#f4f0fb] overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all"
                  style={{
                    width: `${Math.max(4, s.rate)}%`,
                    background: isLast ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#cf97fc,#a78bfa)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {f.biggestDropoff && f.biggestDropoff.dropoffRate > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50/70 px-3.5 py-2.5">
          <ArrowDownRight className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-[#7a2e3a] leading-snug">
            Størst frafall: <b>{f.biggestDropoff.fromLabel}</b> → <b>{f.biggestDropoff.label}</b>{' '}
            (<b>−{f.biggestDropoff.dropoffRate}%</b>, {nf(f.biggestDropoff.dropoff)} mistet). Prioriter dette steget for optimalisering.
          </p>
        </div>
      )}
    </div>
  );
}

// A/B-eksperiment: sammenlign varianter på konverteringsrate, marker vinner.
function ExperimentCard({ exp }) {
  const variants = exp.variants || [];
  const maxCr = Math.max(1, ...variants.map((v) => v.conversionRate || 0));
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-bold text-[#0a0a0a] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
          <FlaskConical className="w-4 h-4 text-[#cf97fc]" /> {exp.label}
        </h3>
        <span className="text-[11px] text-[#aaa] font-mono">{exp.experiment}</span>
      </div>
      <p className="text-[12px] text-[#999] mb-4">{nf(exp.totalStarts)} besøkende i test{exp.controlVariant ? ` · kontroll = ${exp.controlVariant}` : ''}</p>

      {!exp.enoughData && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2 text-[12px] text-amber-700 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> For lite data for en sikker konklusjon (mål: 30+ pr. variant).
        </div>
      )}

      <div className="space-y-3.5">
        {variants.map((v) => {
          const isWinner = exp.winner === v.variant && exp.totalStarts > 0;
          const liftUp = v.lift != null && v.lift > 0;
          const liftDown = v.lift != null && v.lift < 0;
          return (
            <div key={v.variant}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="text-[#444] font-medium flex items-center gap-1.5">
                  Variant {v.variant}
                  {isWinner && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold"><Trophy className="w-3 h-3" /> leder</span>}
                </span>
                <span className="text-[#0a0a0a] font-semibold tabular-nums flex items-center gap-2">
                  {v.conversionRate}%
                  {liftUp && <span className="text-[11px] text-emerald-500 font-semibold inline-flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" />+{v.lift}%</span>}
                  {liftDown && <span className="text-[11px] text-rose-500 font-semibold inline-flex items-center"><TrendingDown className="w-3 h-3 mr-0.5" />{v.lift}%</span>}
                </span>
              </div>
              <div className="h-6 rounded-lg bg-[#f4f0fb] overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all"
                  style={{ width: `${Math.max(4, Math.round((v.conversionRate / maxCr) * 100))}%`, background: isWinner ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#cf97fc,#a78bfa)' }}
                />
              </div>
              <p className="text-[11px] text-[#aaa] mt-1">{nf(v.starts)} startet · {nf(v.submits)} fullførte</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FunnelTab({ funnels }) {
  const forms = (funnels && funnels.forms) || [];
  const experiments = (funnels && funnels.experiments) || [];

  const totalStarts = forms.reduce((a, f) => a + f.starts, 0);
  const totalSubmits = forms.reduce((a, f) => a + f.submits, 0);
  const overallCr = totalStarts ? +(totalSubmits / totalStarts * 100).toFixed(1) : 0;

  if (!funnels) {
    return <div className="bg-white rounded-2xl p-10 text-center text-[14px] text-[#aaa] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Laster trakt-data …</div>;
  }

  return (
    <div className="space-y-5">
      {/* KPI-er */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { l: 'Skjema åpnet', v: nf(totalStarts), s: 'alle flyter' },
          { l: 'Leads sendt', v: nf(totalSubmits), s: 'fullførte', c: '#22c55e' },
          { l: 'Fullføringsrate', v: `${overallCr}%`, s: 'åpnet → sendt', c: '#cf97fc' },
          { l: 'Aktive A/B-tester', v: nf(experiments.length), s: experiments.length ? 'kjører' : 'ingen' },
        ].map((k) => (
          <div key={k.l} className="bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#aaa] font-semibold">{k.l}</p>
            <p className="text-[24px] font-bold mt-1" style={{ fontFamily: 'var(--font-heading)', color: k.c || '#0a0a0a' }}>{k.v}</p>
            <p className="text-[11.5px] text-[#bbb] mt-0.5">{k.s}</p>
          </div>
        ))}
      </div>

      {/* Trakt pr. skjema */}
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] mb-3 flex items-center gap-2"><Layers className="w-4 h-4" /> Drop-off pr. skjema</h2>
        {forms.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-[14px] text-[#aaa] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Ingen skjema-aktivitet i perioden ennå.</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {forms.map((f) => <FormFunnel key={f.form} f={f} />)}
          </div>
        )}
      </div>

      {/* A/B-eksperimenter */}
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] mb-3 flex items-center gap-2"><FlaskConical className="w-4 h-4" /> A/B-eksperimenter</h2>
        {experiments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <FlaskConical className="w-8 h-8 text-[#e4d7f5] mx-auto mb-3" />
            <p className="text-[14px] text-[#888] font-medium">Ingen aktive A/B-tester med data ennå</p>
            <p className="text-[12.5px] text-[#bbb] mt-1 max-w-md mx-auto">Når et eksperiment kjører på onboarding-flytene, vises vinnervarianten og løft her automatisk.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {experiments.map((e) => <ExperimentCard key={e.experiment} exp={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}
