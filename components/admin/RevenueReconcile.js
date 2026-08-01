'use client';
// ---------------------------------------------------------------------------
// PROD-FASIT — «stemmer Nøkkeltall med virkeligheten?»
//
// Henter plattformens kontrakter direkte (read-only) og kjører dem gjennom
// SAMME motor som dashbordet. Alt som avviker er derfor et datagap, ikke en
// forskjell i regnemåte. Panelet svarer på tre spørsmål:
//   1. Stemmer beløpene?           → tabellen
//   2. Hvis nei — hvilken kontrakt? → listene
//   3. Hva gjør jeg med det?        → handlingene
// ---------------------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Building2, Megaphone, CalendarClock } from 'lucide-react';

const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const kr = (v) => (v == null || !isFinite(v) ? '—' : nf0.format(Math.round(v)));
const n1 = (v) => (v == null || !isFinite(v) ? '—' : nf1.format(v));
const EMER_TEXT = '#047857';

function fmtVal(v, unit) {
  if (v == null || !isFinite(v)) return '—';
  if (unit === '%') return `${n1(v)} %`;
  if (unit === 'stk') return nf0.format(v);
  return `${kr(v)} ${unit}`;
}

function Section({ title, count, tone = 'amber', children, testid }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  const tones = {
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    rose: 'text-rose-700 bg-rose-50 border-rose-100',
    slate: 'text-[#67646f] bg-black/[0.03] border-black/[0.06]',
  };
  return (
    <div className={`mt-3 rounded-xl border ${tones[tone]} overflow-hidden`} data-testid={testid}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-semibold text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
        <span>{title}</span>
        <span className="ml-auto tabular-nums rounded-full bg-white/70 px-2 py-0.5 text-[11px]">{count}</span>
      </button>
      {open && <div className="bg-white/60 border-t border-black/[0.05] px-4 py-3 overflow-x-auto">{children}</div>}
    </div>
  );
}

function ContractRows({ rows = [], showOrphan = false }) {
  return (
    <table className="w-full text-[11.5px]">
      <thead>
        <tr className="text-[#8b8894] text-left">
          <th className="pb-1.5 pr-3 font-semibold">Eier</th>
          <th className="pb-1.5 pr-3 font-semibold">Bolig</th>
          <th className="pb-1.5 pr-3 font-semibold">Type</th>
          <th className="pb-1.5 pr-3 font-semibold">Status</th>
          <th className="pb-1.5 pr-3 font-semibold">Start</th>
          <th className="pb-1.5 pr-3 font-semibold text-right">Honorar</th>
          {showOrphan && <th className="pb-1.5 font-semibold">Teller?</th>}
        </tr>
      </thead>
      <tbody className="text-[#67646f]">
        {rows.map((r) => (
          <tr key={r.contractId} className="border-t border-black/[0.04]">
            <td className="py-1.5 pr-3 text-[#16141d] font-medium">{r.owner || '—'}</td>
            <td className="py-1.5 pr-3">{r.property || '—'}</td>
            <td className="py-1.5 pr-3">{r.type === 'leiekontrakt' ? 'leie' : 'forvaltning'}</td>
            <td className="py-1.5 pr-3">{r.status || '—'}</td>
            <td className="py-1.5 pr-3 tabular-nums">{r.startDate || '—'}</td>
            <td className="py-1.5 pr-3 tabular-nums text-right whitespace-nowrap">{kr(r.fee)} kr/mnd</td>
            {showOrphan && (
              <td className="py-1.5">
                {r.orphaned
                  ? <span className="text-[10.5px] text-[#8b8894]">nei · foreldreløs</span>
                  : <span className="text-[10.5px] font-semibold text-rose-700">ja</span>}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function RevenueReconcile({ apiKey, days = 30 }) {
  const [env, setEnv] = useState('prod');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState('');

  const run = useCallback(async (which) => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/revenue-reconcile?key=${encodeURIComponent(apiKey)}&env=${which || env}&days=${days}`);
      const j = await res.json();
      setData(j);
      if (!j.ok) setErr(j.error || 'Avstemming feilet');
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey, env, days]);

  const sync = useCallback(async () => {
    const label = env === 'prod' ? 'PRODUKSJON (app.digihome.no)' : 'dette miljøet';
    if (!window.confirm(`Hente kontrakter fra ${label} inn i denne databasen?\n\nDette skriver kontraktsdata lokalt og oppdaterer Nøkkeltall. Kontrakter som ikke finnes i plattformen merkes som foreldreløse og slutter å telle i MRR/LTV.`)) return;
    setSyncing(true); setErr('');
    try {
      const res = await fetch(`/api/admin/finance/sync-contracts?key=${encodeURIComponent(apiKey)}&env=${env}`, { method: 'POST' });
      const j = await res.json();
      if (!j.ok) setErr(j.error || 'Synk feilet');
      await run(env);
    } catch (e) { setErr('Nettverksfeil under synk'); }
    finally { setSyncing(false); }
  }, [apiKey, env, run]);

  const v = data?.verdict;
  const ok = data?.ok && v?.match;
  const truth = data?.truth;

  return (
    <div className="mt-3 sm:mt-4 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6" data-testid="kpi-reconcile">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c4c2cc]" /> Prod-fasit · avstemming
          </p>
          <p className="mt-1 text-[12.5px] text-[#8b8894] max-w-[62ch]">
            Henter kontraktene rett fra plattformen og regner dem med <b>samme motor</b> som Nøkkeltall. Alt som avviker er et datagap — ikke en forskjell i regnemåte. Leser bare; endrer ingenting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-black/[0.04] p-0.5" data-testid="reconcile-env">
            {[['prod', 'Produksjon'], ['test', 'Dette miljøet']].map(([k, l]) => (
              <button key={k} onClick={() => setEnv(k)}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${env === k ? 'bg-white text-[#16141d] shadow-[0_1px_2px_rgba(22,20,29,0.08)]' : 'text-[#8b8894] hover:text-[#67646f]'}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => run()} disabled={loading}
            className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-white bg-[#16141d] hover:bg-[#2a2733] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            data-testid="reconcile-run">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Avstemmer…' : 'Kjør avstemming'}
          </button>
        </div>
      </div>

      {err && <p className="mt-4 rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-[12.5px] text-rose-700" data-testid="reconcile-error">{err}</p>}

      {!data && !loading && (
        <p className="mt-5 text-[12.5px] text-[#a5a3af]">
          Ingen avstemming kjørt ennå. «Produksjon» sammenligner mot <b>app.digihome.no</b> — trygt herfra, ingenting skrives.
        </p>
      )}

      {data?.ok && (
        <>
          {/* Dom */}
          <div className={`mt-5 rounded-xl px-4 py-3 border ${ok ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`} data-testid="reconcile-verdict">
            <p className="text-[13px] font-semibold flex items-start gap-2" style={{ color: ok ? EMER_TEXT : '#b45309' }}>
              {ok ? <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{v.headline}</span>
            </p>
            {v.diagnosis && <p className="mt-1.5 pl-6 text-[12px] text-[#67646f] leading-relaxed">{v.diagnosis}</p>}
            <p className="mt-1.5 pl-6 text-[11.5px] text-[#8b8894] tabular-nums">
              {data.platform.host} · {data.platform.rows} kontraktsrader · HTTP {data.platform.httpStatus} · {data.tookMs} ms · regel: {data.settings.ruleLabel}
            </p>
          </div>

          {/* Tall mot tall */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[12.5px]" data-testid="reconcile-table">
              <thead>
                <tr className="text-[#8b8894] text-left border-b border-black/[0.06]">
                  <th className="pb-2 pr-3 font-semibold">Metrikk</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Lokalt (Nøkkeltall)</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Plattform (fasit)</th>
                  <th className="pb-2 font-semibold text-right">Avvik</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.map((m) => (
                  <tr key={m.key} className="border-b border-black/[0.04]" data-testid={`reconcile-metric-${m.key}`}>
                    <td className="py-2 pr-3">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${m.match ? 'bg-emerald-500' : (m.critical ? 'bg-rose-500' : 'bg-amber-500')}`} />
                      <span className="text-[#16141d] font-medium">{m.label}</span>
                      {m.hint && <span className="text-[#a5a3af]"> · {m.hint}</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-[#67646f] whitespace-nowrap">{fmtVal(m.local, m.unit)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-[#16141d] font-semibold whitespace-nowrap">{fmtVal(m.platform, m.unit)}</td>
                    <td className={`py-2 text-right tabular-nums whitespace-nowrap ${m.match ? 'text-[#c4c2cc]' : (m.critical ? 'text-rose-600 font-semibold' : 'text-amber-600 font-semibold')}`}>
                      {m.match ? 'stemmer' : `${m.delta > 0 ? '+' : ''}${fmtVal(m.delta, m.unit)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Oppstartsplan — når slår kontrahert MRR inn? */}
          {truth?.ramp?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-black/[0.05]" data-testid="reconcile-ramp">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-[#c4c2cc]" /> Når slår signert leie inn? <span className="normal-case tracking-normal text-[#c4c2cc]">· plattformdata</span>
              </p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: EMER_TEXT }}>I dag</p>
                  <p className="mt-1 text-[#16141d] font-bold text-[20px] leading-none tabular-nums">{kr(truth.mrr?.actual)} <span className="text-[#a5a3af] text-[11.5px] font-semibold">kr/mnd</span></p>
                  <p className="mt-1 text-[11px] text-[#8b8894]">{nf0.format(truth.customers?.earning || 0)} kunder med leieinntekt</p>
                </div>
                {truth.ramp.map((r) => (
                  <div key={r.inDays} className="rounded-xl bg-black/[0.03] px-4 py-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#67646f]">Om {r.inDays} dager</p>
                    <p className="mt-1 text-[#16141d] font-bold text-[20px] leading-none tabular-nums">{kr(r.mrr)} <span className="text-[#a5a3af] text-[11.5px] font-semibold">kr/mnd</span></p>
                    <p className="mt-1 text-[11px] text-[#8b8894] tabular-nums">+{kr(r.addedMrr)} kr fra {nf0.format(r.startingCount)} kontrakt{r.startingCount === 1 ? '' : 'er'}</p>
                  </div>
                ))}
              </div>
              {truth.ltvForward?.value != null && (
                <p className="mt-3 text-[12px] text-[#8b8894]">
                  Framoverskuende LTV (inkl. kontraherte leiekontrakter): <b className="text-[#16141d] tabular-nums">{kr(truth.ltvForward.value)} kr</b>
                  {' '}({kr(truth.ltvForward.monthlyFee)} kr/mnd × {truth.ltv?.lifetimeMonths} mnd, {nf0.format(truth.ltvForward.customersWithLease)} kunder med leiekontrakt).
                  {' '}Faktisk LTV i dag er <b className="text-[#16141d] tabular-nums">{kr(truth.ltv?.value)} kr</b> — differansen er signert leie som ikke har startet ennå.
                </p>
              )}
              {truth.upcomingStarts?.length > 0 && (
                <Section title="Kommende leiestarter" count={truth.upcomingStarts.length} tone="slate" testid="reconcile-upcoming">
                  <table className="w-full text-[11.5px]">
                    <tbody className="text-[#67646f]">
                      {truth.upcomingStarts.map((r) => (
                        <tr key={r.id} className="border-t border-black/[0.04]">
                          <td className="py-1.5 pr-3 tabular-nums text-[#16141d] font-medium whitespace-nowrap">{r.startDate}</td>
                          <td className="py-1.5 pr-3">{r.owner || '—'}</td>
                          <td className="py-1.5 pr-3">{r.property || '—'}</td>
                          <td className="py-1.5 pr-3">{r.status}</td>
                          <td className="py-1.5 tabular-nums text-right whitespace-nowrap">{kr(r.fee)} kr/mnd</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}
            </div>
          )}

          {/* Kontraktsgrunnlag */}
          <div className="mt-5 pt-5 border-t border-black/[0.05]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#c4c2cc]" /> Kontraktsgrunnlag
              </p>
              {data.contracts.counts.onlyInPlatform > 0 && (
                <button onClick={sync} disabled={syncing}
                  className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  data-testid="reconcile-sync">
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Synker…' : 'Synk kontrakter nå'}
                </button>
              )}
            </div>
            <p className="mt-2 text-[12px] text-[#8b8894] tabular-nums">
              Lokalt {nf0.format(data.contracts.localTotal)} ({nf0.format(data.contracts.localFromPlatform)} fra plattformen, {nf0.format(data.contracts.localManual)} manuelle) · plattformen {nf0.format(data.contracts.platformTotal)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11.5px] tabular-nums">
              {data.contracts.feeImpact.missingFromLocal > 0 && (
                <span className="rounded-full bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 font-semibold">
                  {kr(data.contracts.feeImpact.missingFromLocal)} kr/mnd honorar usynlig lokalt
                </span>
              )}
              {data.contracts.feeImpact.staleInLocal > 0 && (
                <span className="rounded-full bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1 font-semibold">
                  {kr(data.contracts.feeImpact.staleInLocal)} kr/mnd telles lokalt uten dekning
                </span>
              )}
              {data.contracts.feeImpact.orphanedExcluded > 0 && (
                <span className="rounded-full bg-black/[0.04] text-[#67646f] px-2.5 py-1 font-semibold">
                  {kr(data.contracts.feeImpact.orphanedExcluded)} kr/mnd alt nøytralisert (foreldreløs)
                </span>
              )}
              {data.contracts.feeImpact.fieldMismatch !== 0 && (
                <span className="rounded-full bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1 font-semibold">
                  {kr(data.contracts.feeImpact.fieldMismatch)} kr/mnd feltavvik
                </span>
              )}
            </div>

            <Section title="Finnes i plattformen, mangler lokalt" count={data.contracts.counts.onlyInPlatform} tone="rose" testid="reconcile-only-platform">
              <ContractRows rows={data.contracts.onlyInPlatform} />
            </Section>
            <Section title="Finnes lokalt, ikke i plattformen" count={data.contracts.counts.onlyLocal} tone="amber" testid="reconcile-only-local">
              <ContractRows rows={data.contracts.onlyLocal} showOrphan />
            </Section>
            <Section title="Ulike felt på samme kontrakt" count={data.contracts.counts.mismatched} tone="amber" testid="reconcile-mismatched">
              <table className="w-full text-[11.5px]">
                <tbody className="text-[#67646f]">
                  {data.contracts.mismatched.map((r) => (
                    <tr key={r.contractId} className="border-t border-black/[0.04]">
                      <td className="py-1.5 pr-3 text-[#16141d] font-medium align-top">{r.owner || '—'}<br /><span className="text-[#a5a3af] font-normal">{r.property}</span></td>
                      <td className="py-1.5 pr-3">
                        {r.diffs.map((d) => (
                          <div key={d.field}>{d.label}: <span className="text-[#8b8894]">{String(d.local ?? '—')}</span> → <b className="text-[#16141d]">{String(d.platform ?? '—')}</b></div>
                        ))}
                      </td>
                      <td className="py-1.5 tabular-nums text-right whitespace-nowrap align-top">{r.feeDelta > 0 ? '+' : ''}{kr(r.feeDelta)} kr/mnd</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>

          {/* Annonseforbruk */}
          {data.spend && !data.spend.error && (
            <div className="mt-5 pt-5 border-t border-black/[0.05]" data-testid="reconcile-spend">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-[#c4c2cc]" /> Annonseforbruk <span className="normal-case tracking-normal text-[#c4c2cc]">· {data.spend.period?.label}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[12.5px] text-[#67646f] tabular-nums">
                <span>Totalt <b className="text-[#16141d]">{kr(data.spend.total)} kr</b></span>
                <span>Google <b className="text-[#16141d]">{kr(data.spend.google)} kr</b></span>
                <span>Meta <b className="text-[#16141d]">{kr(data.spend.meta)} kr</b></span>
                <span>Kost per lead <b className="text-[#16141d]">{kr(data.spend.cpl)} kr</b></span>
                <span>Kost per kunde <b className="text-[#16141d]">{kr(data.spend.cac)} kr</b></span>
              </div>
              <ul className="mt-3 space-y-1">
                {(data.spend.checks || []).map((c) => (
                  <li key={c.label} className="text-[11.5px] flex items-start gap-1.5">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={c.ok ? 'text-[#8b8894]' : 'text-rose-700 font-medium'}>{c.label} — {c.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Handlinger */}
          {v.actions?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-black/[0.05]" data-testid="reconcile-actions">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894]">Hva som må gjøres</p>
              <ul className="mt-2 space-y-1.5">
                {v.actions.map((a, i) => (
                  <li key={i} className="text-[12.5px] text-[#67646f] flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7c3aed] shrink-0" />{a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.financeSync && (
            <p className="mt-4 text-[11px] text-[#c4c2cc] tabular-nums">
              Siste kontraktsynk: {data.financeSync.lastSyncAt ? new Date(data.financeSync.lastSyncAt).toLocaleString('nb-NO') : 'aldri'}
              {data.financeSync.lastError ? ` · feil: ${data.financeSync.lastError}` : ''}
              {data.financeSync.skipped ? ` · ${data.financeSync.skipped}` : ''}
            </p>
          )}
        </>
      )}

      {data && !data.ok && !err && (
        <p className="mt-4 rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-[12.5px] text-rose-700">{data.error}</p>
      )}
    </div>
  );
}
