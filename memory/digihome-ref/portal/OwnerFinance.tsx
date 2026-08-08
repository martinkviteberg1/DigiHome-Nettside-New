/**
 * OwnerFinance — Huseierportal «Eieroppgjør»
 *
 * Viser NØYAKTIG det konsoliderte eieroppgjøret forvalteren sender (System B:
 * billing_payouts + build_owner_statement). Read-only arkiv på tvers av
 * måneder — kun SENDTE oppgjør. Eieren ser samme tall + laster ned samme PDF.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader2, Home, Search, ArrowUpRight, ArrowDownRight, Receipt, DollarSign,
  Download, X, FileText, CircleCheck, Send, ChevronRight, Calendar, Wallet,
} from 'lucide-react';
import { fmtKr, fmtKrExact, fmtDate } from '../shared/economy';

const font = { fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" };

const periodLabel = (p: string) =>
  p ? new Date(p + '-01').toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }) : '';

type Row = {
  period: string; net_payout: number; owner_owes: number; settled: boolean;
  gross: number; fee_charged: number; expenses: number; status: string;
  sent_at?: string; paid_at?: string; payment_reference?: string; eierfaktura_no?: string;
};

export default function OwnerFinance() {
  const { api } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ count?: number; net_ytd?: number }>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openPeriod, setOpenPeriod] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api('get', '/api/portal/owner/statements');
      setRows(r.data?.data || []);
      setTotals(r.data?.totals || {});
    } catch { /* keep */ } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => periodLabel(r.period).toLowerCase().includes(q) || (r.eierfaktura_no || '').toLowerCase().includes(q));
  }, [rows, search]);

  const latestNet = rows[0]?.net_payout || 0;

  return (
    <div className="min-h-screen" style={{ ...font, background: '#faf8f5' }} data-testid="owner-finance">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-14">
        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7c7466] mb-3">Huseierportal · Økonomi</p>
          <h1 className="text-[30px] sm:text-[40px] lg:text-[46px] leading-[1.05] font-bold text-[#1a1a1a] tracking-[-0.025em]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Eieroppgjør
          </h1>
          <p className="text-[14px] text-[#6b6050] mt-3 max-w-[640px] leading-relaxed">
            Dine månedlige oppgjør fra DigiHome — innbetalt husleie, forvaltningshonorar, utlegg og netto utbetalt. Last ned PDF-en for ditt regnskap.
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <KpiCard label="Netto i år" value={`${fmtKr(totals.net_ytd)} kr`} Icon={Wallet} iconTone="#16a34a" testid="kpi-net-ytd" dark />
          <KpiCard label="Siste utbetaling" value={`${fmtKr(latestNet)} kr`} Icon={DollarSign} iconTone="#cf97fc" testid="kpi-latest" />
          <KpiCard label="Antall oppgjør" value={`${totals.count || 0}`} suffix="" Icon={FileText} iconTone="#0891b2" testid="kpi-count" />
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-[420px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7c7466]" />
            <input
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              placeholder="Søk måned..."
              data-testid="owner-finance-search"
              className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-[#ebe6df] text-[13px] text-[#1a1a1a] placeholder:text-[#7c7466] outline-none focus:border-[#1a1a1a] transition-colors"
            />
          </div>
          <p className="text-[11.5px] text-[#6e6357]">{filtered.length} av {rows.length} oppgjør</p>
        </div>

        {/* Table */}
        {loading && !rows.length ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-5 h-5 animate-spin text-[#7c7466]" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState hasRows={rows.length > 0} />
        ) : (
          <div className="rounded-2xl bg-white border border-[#ebe6df] overflow-hidden" data-testid="owner-finance-table">
            <div className="px-5 py-3 grid grid-cols-[1fr_auto_28px] sm:grid-cols-[1fr_120px_120px_150px_40px] gap-3 sm:gap-4 items-center border-b border-[#f0ebe4] bg-[#fafaf7]">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6e6357]">Periode</span>
              <span className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.1em] text-[#6e6357] text-right">Brutto</span>
              <span className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.1em] text-[#6e6357] text-right">Honorar</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6e6357] text-right">Netto til deg</span>
              <span />
            </div>
            {filtered.map(r => <StatementRow key={r.period} row={r} onOpen={() => setOpenPeriod(r.period)} />)}
          </div>
        )}
      </div>

      {openPeriod && <OwnerStatementSheet api={api} period={openPeriod} onClose={() => setOpenPeriod(null)} />}
    </div>
  );
}

// ─── Sub components ─────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: string; suffix?: string; dark?: boolean; Icon?: any; iconTone?: string; testid?: string }> = ({ label, value, suffix = 'kr', dark, Icon, iconTone, testid }) => (
  <div className={`rounded-2xl p-5 border ${dark ? 'bg-[#1a1a1a] border-transparent' : 'bg-white border-[#ebe6df]'}`} data-testid={testid}>
    <div className="flex items-center justify-between mb-3">
      <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${dark ? 'text-white/50' : 'text-[#6e6357]'}`}>{label}</span>
      {Icon && <Icon className="w-4 h-4" style={{ color: iconTone }} />}
    </div>
    <p className={`text-[26px] font-bold tracking-tight tabular-nums ${dark ? 'text-white' : 'text-[#1a1a1a]'}`}>
      {value.split(' ')[0]} {suffix && <span className={`text-[12px] font-normal ${dark ? 'text-white/50' : 'text-[#7c7466]'}`}>{suffix}</span>}
    </p>
  </div>
);

const EmptyState: React.FC<{ hasRows: boolean }> = ({ hasRows }) => (
  <div className="rounded-2xl bg-white border border-[#ebe6df] p-14 text-center" data-testid="owner-finance-empty">
    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#faf8f5] border border-[#ebe6df] flex items-center justify-center">
      <FileText className="w-6 h-6 text-[#7c7466]" strokeWidth={1.4} />
    </div>
    <h3 className="text-[18px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {hasRows ? 'Ingen treff' : 'Ingen oppgjør ennå'}
    </h3>
    <p className="text-[13px] text-[#6b6050] mt-2 max-w-[460px] mx-auto leading-relaxed">
      {hasRows
        ? 'Prøv et annet søkeord.'
        : 'Eieroppgjørene dine dukker opp her så snart DigiHome har sendt det første oppgjøret.'}
    </p>
  </div>
);

const StatusPill: React.FC<{ row: Pick<Row, 'paid_at' | 'owner_owes'> }> = ({ row }) => {
  if (row.owner_owes > 0) {
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#fef2f2] text-[#b91c1c]"><ArrowDownRight className="w-3 h-3" strokeWidth={2.4} /> Du skylder</span>;
  }
  if (row.paid_at) {
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#ecfdf5] text-[#15803d]"><CircleCheck className="w-3 h-3" strokeWidth={2.4} /> Utbetalt</span>;
  }
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#ecfeff] text-[#0891b2]"><Send className="w-3 h-3" strokeWidth={2.4} /> Sendt</span>;
};

const StatementRow: React.FC<{ row: Row; onOpen: () => void }> = ({ row, onOpen }) => (
  <button
    onClick={onOpen}
    className="w-full px-5 py-4 grid grid-cols-[1fr_auto_28px] sm:grid-cols-[1fr_120px_120px_150px_40px] gap-3 sm:gap-4 items-center border-t border-[#f4efe7] hover:bg-[#fafaf7] transition-colors text-left group"
    data-testid={`owner-statement-row-${row.period}`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-11 h-11 rounded-xl bg-[#faf8f5] border border-[#ebe6df] flex items-center justify-center shrink-0">
        <Calendar className="w-4 h-4 text-[#6b6050]" strokeWidth={1.6} />
      </div>
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold text-[#1a1a1a] truncate tracking-[-0.005em] capitalize">{periodLabel(row.period)}</p>
        <div className="mt-1"><StatusPill row={row} /></div>
      </div>
    </div>
    <p className="hidden sm:block text-[13px] font-semibold text-[#1a1a1a] tabular-nums text-right">{fmtKr(row.gross)} kr</p>
    <p className="hidden sm:block text-[13px] font-semibold text-[#cf97fc] tabular-nums text-right">{fmtKr(row.fee_charged)} kr</p>
    <p className={`text-[14.5px] font-bold tabular-nums text-right ${row.owner_owes > 0 ? 'text-[#b91c1c]' : 'text-[#1a1a1a]'}`}>
      {row.owner_owes > 0 ? `−${fmtKr(row.owner_owes)}` : fmtKr(row.net_payout)} kr
    </p>
    <ChevronRight className="w-4 h-4 text-[#7c7466] group-hover:text-[#1a1a1a] group-hover:translate-x-0.5 transition-all justify-self-end" />
  </button>
);

// ─── Drill-down sheet ───────────────────────────────────────────────────

const OwnerStatementSheet: React.FC<{ api: any; period: string; onClose: () => void }> = ({ api, period, onClose }) => {
  const [st, setSt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await api('get', `/api/portal/owner/statements/${period}`);
        if (alive) setSt(r.data?.data);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [api, period]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api('get', `/api/portal/owner/statements/${period}/pdf`, { responseType: 'blob' });
      if (res?.data instanceof Blob) {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url; a.download = `Eieroppgjor-${period}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        window.open(`/api/portal/owner/statements/${period}/pdf`, '_blank');
      }
    } catch {
      window.open(`/api/portal/owner/statements/${period}/pdf`, '_blank');
    } finally { setDownloading(false); }
  };

  const owes = Number(st?.owner_owes || 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[720px] h-full bg-[#faf8f5] shadow-2xl flex flex-col" data-testid="owner-statement-sheet" style={font}>
        {/* Header */}
        <div className="px-5 sm:px-8 pt-7 pb-5 bg-white border-b border-[#ebe6df]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#7c7466] mb-2">Eieroppgjør</p>
              <h2 className="text-[26px] font-bold text-[#1a1a1a] tracking-[-0.02em] capitalize" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{periodLabel(period)}</h2>
              {st?.owner_name && <p className="text-[12px] text-[#6e6357] mt-1">{st.owner_name}</p>}
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#f5f1ec] flex items-center justify-center shrink-0" data-testid="owner-statement-close">
              <X className="w-4 h-4 text-[#6e6357]" />
            </button>
          </div>

          {/* Status banner */}
          {st?.paid_at ? (
            <div className="rounded-xl bg-[#ecfdf5] border border-[#bbf7d0] px-4 py-3 mb-3 flex items-center gap-3" data-testid="owner-statement-paid-banner">
              <CircleCheck className="w-4 h-4 text-[#15803d] shrink-0" strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] text-[#065f46] font-semibold">Utbetalt {fmtDate(st.paid_at)}</p>
                {st.payment_reference && <p className="text-[11.5px] text-[#047857] truncate">Referanse: <span className="font-mono tabular-nums">{st.payment_reference}</span></p>}
              </div>
            </div>
          ) : st?.sent_at ? (
            <div className="rounded-xl bg-[#ecfeff] border border-[#a5f3fc] px-4 py-3 mb-3 flex items-center gap-3">
              <Send className="w-4 h-4 text-[#0891b2] shrink-0" strokeWidth={2} />
              <p className="text-[12.5px] text-[#155e75]">Oppgjør sendt {fmtDate(st.sent_at)} — utbetaling kommer snart.</p>
            </div>
          ) : null}

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SheetKpi label="Brutto leie" value={`${fmtKr(st?.income_total)} kr`} />
            <SheetKpi label="Honorar" value={`${fmtKr(st?.eierfaktura_total)} kr`} tone="#cf97fc" />
            <SheetKpi label="Utlegg" value={`${fmtKr(st?.expenses_total)} kr`} tone="#e67e22" />
            {owes > 0
              ? <SheetKpi label="Du skylder" value={`${fmtKr(owes)} kr`} emphasised danger />
              : <SheetKpi label="Netto til deg" value={`${fmtKr(st?.net_payout)} kr`} emphasised />}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[#7c7466]" /></div>
          ) : !st ? (
            <p className="text-center text-[13px] text-[#6e6357] py-12">Fant ikke oppgjøret.</p>
          ) : (
            <>
              {/* Income */}
              <Section label="Innbetalt husleie" color="#16a34a">
                {(st.income || []).map((l: any, i: number) => (
                  <LineItem key={i} icon={<Home className="w-3.5 h-3.5 text-[#7c7466]" strokeWidth={2} />} label={l.label} sub={l.tenant} amount={l.amount} color="#16a34a" />
                ))}
                <SectionTotal label="Sum innbetalt" amount={st.income_total} color="#16a34a" />
              </Section>

              {/* Deduction groups */}
              {(st.deduction_groups || []).map((g: any, gi: number) => (
                <Section key={gi} label={g.title} color="#cf97fc">
                  {(g.lines || []).map((l: any, i: number) => (
                    <LineItem key={i} icon={<Receipt className="w-3.5 h-3.5 text-[#7c7466]" strokeWidth={2} />} label={l.label} amount={-Math.abs(l.amount)} color="#cf97fc" />
                  ))}
                  <SectionTotal label={`Sum ${g.title.toLowerCase()}`} amount={-Math.abs(g.subtotal)} color="#cf97fc" />
                </Section>
              ))}

              {/* VAT note on fees */}
              {Number(st.fee_vat || 0) > 0 && (
                <div className="flex items-center justify-between px-1 mb-6 text-[11.5px] text-[#6e6357]">
                  <span>herav mva på honorar/tjenester</span>
                  <span className="tabular-nums">{fmtKrExact(st.fee_vat)} kr</span>
                </div>
              )}

              {/* Expenses */}
              {(st.expenses || []).length > 0 && (
                <Section label="Utlegg (refusjon til DigiHome)" color="#e67e22">
                  {st.expenses.map((l: any, i: number) => (
                    <LineItem key={i} icon={<Receipt className="w-3.5 h-3.5 text-[#7c7466]" strokeWidth={2} />} label={l.label} amount={-Math.abs(l.amount)} color="#e67e22" />
                  ))}
                  <SectionTotal label="Sum utlegg" amount={-Math.abs(st.expenses_total)} color="#e67e22" />
                </Section>
              )}

              {/* Net result */}
              <div className={`rounded-2xl p-5 mt-2 ${owes > 0 ? 'bg-[#fef2f2] border border-[#fecaca]' : 'bg-[#1a1a1a]'}`} data-testid="owner-statement-net">
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-bold uppercase tracking-[0.1em] ${owes > 0 ? 'text-[#b91c1c]' : 'text-white/60'}`}>
                    {owes > 0 ? 'Til betaling fra deg' : 'Netto utbetalt til deg'}
                  </span>
                  <span className={`text-[26px] font-bold tabular-nums ${owes > 0 ? 'text-[#b91c1c]' : 'text-white'}`}>
                    {owes > 0 ? fmtKr(owes) : fmtKr(st.net_payout)} kr
                  </span>
                </div>
                {owes <= 0 && st.settled && Number(st.eierfaktura_total) > 0 && (
                  <p className="text-[11.5px] text-white/50 mt-2">Forvaltningshonorar og utlegg er trukket fra (motregnet) i den innbetalte husleien.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 py-4 bg-white border-t border-[#ebe6df] flex items-center gap-3">
          <button onClick={downloadPdf} disabled={downloading || loading || !st}
            className="h-10 px-5 rounded-full bg-[#1a1a1a] text-white text-[12.5px] font-semibold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-40"
            data-testid="owner-statement-download-pdf">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Last ned PDF
          </button>
          <div className="flex-1" />
          <p className="text-[11px] text-[#6e6357]">Lesetilgang — DigiHome håndterer utbetaling.</p>
        </div>
      </div>
    </div>
  );
};

const SheetKpi: React.FC<{ label: string; value: string; tone?: string; emphasised?: boolean; danger?: boolean }> = ({ label, value, tone, emphasised, danger }) => (
  <div className={`rounded-xl p-3 ${emphasised ? (danger ? 'bg-[#b91c1c]' : 'bg-[#1a1a1a]') : 'bg-[#faf8f5] border border-[#ebe6df]'}`}>
    <p className={`text-[9.5px] font-bold uppercase tracking-[0.08em] mb-1 ${emphasised ? 'text-white/50' : 'text-[#6e6357]'}`}>{label}</p>
    <p className={`text-[14.5px] font-bold tabular-nums ${emphasised ? 'text-white' : ''}`} style={{ color: emphasised ? undefined : (tone || '#1a1a1a') }}>{value}</p>
  </div>
);

const Section: React.FC<{ label: string; color: string; children: React.ReactNode }> = ({ label, color, children }) => (
  <div className="mb-6">
    <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2.5" style={{ color }}>{label}</p>
    <div className="rounded-xl bg-white border border-[#ebe6df] divide-y divide-[#f4efe7]">{children}</div>
  </div>
);

const LineItem: React.FC<{ icon: React.ReactNode; label: string; sub?: string; amount: number; color: string }> = ({ icon, label, sub, amount, color }) => (
  <div className="px-4 py-3 flex items-center gap-3">
    <span className="shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-[12.5px] text-[#1a1a1a] truncate">{label}</p>
      {sub && <p className="text-[11px] text-[#6e6357] truncate">{sub}</p>}
    </div>
    <p className="text-[13px] font-bold tabular-nums shrink-0 min-w-[100px] text-right" style={{ color: amount < 0 ? color : '#1a1a1a' }}>
      {amount < 0 ? '−' : ''}{fmtKrExact(Math.abs(amount))} kr
    </p>
  </div>
);

const SectionTotal: React.FC<{ label: string; amount: number; color: string }> = ({ label, amount, color }) => (
  <div className="px-4 py-2.5 flex items-center justify-between bg-[#fafaf7]">
    <p className="text-[11px] font-semibold text-[#6b6050]">{label}</p>
    <p className="text-[12.5px] font-bold tabular-nums" style={{ color }}>{amount < 0 ? '−' : ''}{fmtKrExact(Math.abs(amount))} kr</p>
  </div>
);
