'use client';

// ---------------------------------------------------------------------------
// INVESTOR-ROM — levende DD-rom for DigiHome.
// Token-gatet (?t=): levende tall fra finance-motoren, dokumenthvelv og Q&A.
// Mørk, konfidensiell premium-design. All aktivitet logges (audit).
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Loader2, Lock, TrendingUp, Wallet, LineChart, FolderLock, MessageCircleQuestion,
  ShieldCheck, Download, Send, ChevronRight, Activity, Landmark, Users, Target,
  Clock, FileText, CheckCircle2, AlertTriangle, Sparkles, Layers,
} from 'lucide-react';

const nf = new Intl.NumberFormat('nb-NO');
const fmtKr = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${nf.format(Math.round(Number(v)))} kr`);
const fmtNum = (v) => (v == null || !isFinite(Number(v)) ? '—' : nf.format(Math.round(Number(v))));
const fmtPct = (v) => (v == null || !isFinite(Number(v)) ? '—' : `${Math.round(Number(v) * 10) / 10} %`);
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; } };
const fmtBytes = (b) => { const n = Number(b) || 0; if (n > 1048576) return `${(n / 1048576).toFixed(1)} MB`; if (n > 1024) return `${Math.round(n / 1024)} kB`; return `${n} B`; };

const SECTIONS_NAV = [
  { id: 'oversikt', label: 'Oversikt', icon: Activity, needs: 'metrics' },
  { id: 'vekst', label: 'Vekst', icon: TrendingUp, needs: 'metrics' },
  { id: 'okonomi', label: 'Økonomi', icon: Wallet, needs: 'economy' },
  { id: 'prognose', label: 'Prognose', icon: LineChart, needs: 'forecast' },
  { id: 'dokumenter', label: 'Dokumenter', icon: FolderLock, needs: 'docs' },
  { id: 'qa', label: 'Q&A', icon: MessageCircleQuestion, needs: 'qa' },
];

export default function InvestorRoomPage() {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorReason, setErrorReason] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') || '';
    setToken(t);
    if (!t) { setError('Denne siden krever en personlig tilgangslenke.'); setLoading(false); return; }
    (async () => {
      try {
        const r = await fetch(`/api/investor/room?t=${encodeURIComponent(t)}`);
        const j = await r.json();
        if (j.ok) setData(j);
        else { setError(j.error || 'Kunne ikke åpne rommet'); setErrorReason(j.reason || ''); }
      } catch (e) { setError('Nettverksfeil — prøv igjen'); }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#cf97fc]/10 flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#cf97fc] animate-spin" /></div>
        <p className="text-[14px] text-white/40">Åpner investor-rommet …</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center mb-6"><Lock className="w-7 h-7 text-[#cf97fc]" /></div>
          <h1 className="text-[26px] font-bold text-white tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>
            {errorReason === 'revoked' ? 'Tilgangen er trukket tilbake' : errorReason === 'expired' ? 'Lenken er utløpt' : 'Ingen tilgang'}
          </h1>
          <p className="text-[14.5px] text-white/45 mt-3 leading-relaxed">{error || 'Lenken er ugyldig.'} Kontakt DigiHome for å få en ny tilgangslenke.</p>
        </div>
      </div>
    );
  }

  const inv = data.metrics?.investor || null;
  const nav = SECTIONS_NAV.filter((s) => {
    if (s.needs === 'metrics') return !!data.metrics;
    if (s.needs === 'economy') return !!data.economy;
    if (s.needs === 'forecast') return !!data.forecast;
    if (s.needs === 'docs') return !!data.documents;
    if (s.needs === 'qa') return !!data.questions || (data.viewer?.sections || []).includes('qa');
    return false;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Konfidensielt-stripe */}
      <div className="bg-[#cf97fc]/[0.08] border-b border-[#cf97fc]/15">
        <div className="max-w-[1200px] mx-auto px-5 py-2 flex items-center justify-center gap-2 text-[11px] tracking-[0.12em] uppercase font-semibold text-[#cf97fc]/90">
          <ShieldCheck className="w-3.5 h-3.5" /> Konfidensielt · Delt med {data.viewer?.label} · All aktivitet logges
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0a]/85 border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 h-16 flex items-center gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[18px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome</span>
            <span className="hidden sm:inline text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#cf97fc] bg-[#cf97fc]/10 rounded-full px-2.5 py-1">Investor-rom</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {nav.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="px-3 py-1.5 rounded-full text-[13px] font-medium text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors">{s.label}</a>
            ))}
          </nav>
          <div className="ml-auto md:ml-4 flex items-center gap-2 text-[11.5px] text-white/40 shrink-0">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
            Levende data
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 pb-24">
        {/* Hero */}
        <section id="oversikt" className="pt-14 pb-10 scroll-mt-24">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#cf97fc] mb-3">Due diligence · sanntid</p>
          <h1 className="text-[38px] sm:text-[52px] font-bold tracking-[-0.03em] leading-[1.05]" style={{ fontFamily: 'var(--font-heading)' }}>
            Hele selskapet.<br /><span className="text-white/40">Levende tall, null pynt.</span>
          </h1>
          <p className="text-[15px] text-white/45 mt-4 max-w-xl leading-relaxed">
            Alt du ser genereres direkte fra DigiHomes driftssystemer — samme tall ledelsen styrer etter.
            Sist beregnet {fmtDate(data.generatedAt)}.
          </p>

          {inv && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
              <HeroKpi label="MRR" value={fmtKr(inv.mrrNow)} sub={`ARR ${fmtKr(inv.arrNow)}`} icon={TrendingUp} accent />
              <HeroKpi label="Aktive enheter" value={fmtNum(inv.activeUnits)} sub={`ARPA ${fmtKr(inv.arpa)}/mnd`} icon={Layers} />
              <HeroKpi label="LTV / CAC" value={inv.payback?.ltvCac != null ? `${inv.payback.ltvCac}×` : '—'} sub={`CAC ${fmtKr(inv.payback?.cac)} · LTV ${fmtKr(inv.payback?.ltv)}`} icon={Target} />
              <HeroKpi label="CAC-payback" value={inv.payback?.paybackMonths != null ? `${inv.payback.paybackMonths} mnd` : '—'} sub={`Bruttomargin ${inv.payback?.grossMarginPct != null ? Math.round(inv.payback.grossMarginPct * 100) : '—'} %`} icon={Clock} />
            </div>
          )}

          {/* Levende deck — planen som presentasjon, med drivere investoren kan skru på selv */}
          {(data.viewer?.sections || []).includes('deck') && (
            <a href={`/investor/deck?t=${encodeURIComponent(token)}`} className="group mt-8 flex flex-col gap-4 rounded-2xl bg-[#cf97fc]/[0.08] ring-1 ring-[#cf97fc]/25 p-6 transition-colors hover:bg-[#cf97fc]/[0.12] sm:flex-row sm:items-center sm:justify-between" data-testid="investor-deck-lenke">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#cf97fc] mb-2 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Levende deck</p>
                <p className="text-[20px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Planen – som presentasjon du kan skru på</p>
                <p className="text-[13.5px] text-white/50 mt-1.5 max-w-xl leading-relaxed">To motorer, ett konsern. Se budsjettet måned for måned, prøv «hva om» og endre driverne selv – ingenting lagres.</p>
              </div>
              <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[#0a0a0a] transition-transform group-hover:translate-x-0.5">Åpne decket <ChevronRight className="w-4 h-4" /></span>
            </a>
          )}
        </section>

        {data.metrics && <GrowthSection metrics={data.metrics} />}
        {data.economy && <EconomySection economy={data.economy} />}
        {data.forecast && <ForecastSection forecast={data.forecast} />}
        {data.documents && <DocumentsSection documents={data.documents} categories={data.categories || []} token={token} />}
        {(data.questions || (data.viewer?.sections || []).includes('qa')) && (
          <QaSection questions={data.questions || []} token={token} />
        )}

        {/* Metodikk */}
        <section className="mt-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-[#cf97fc]" /> Metodikk</p>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-[12.5px] text-white/40 leading-relaxed list-disc list-inside">
            <li><b className="text-white/60">MRR</b> = summen av månedlige forvaltningshonorarer fra aktive kontrakter (prosent av leie).</li>
            <li><b className="text-white/60">CAC</b> = markedsføringskostnad delt på nye kunder, siste 90 dager, kun sporet/betalt trafikk.</li>
            <li><b className="text-white/60">NRR/GRR</b> = netto/brutto inntektsretensjon målt fra første måned med omsetning.</li>
            <li><b className="text-white/60">Runway</b> = kontantbeholdning delt på gjennomsnittlig netto brenn (forventet-scenario).</li>
            <li><b className="text-white/60">Prognosen</b> er driver-basert (nye kontrakter/mnd, churn, snittleie) — ikke en ekstrapolering.</li>
            <li><b className="text-white/60">Personvern:</b> rommet viser kun aggregater — aldri person- eller kundedata.</li>
          </ul>
        </section>

        <footer className="mt-10 text-center text-[12px] text-white/25">
          DigiHome AS · Bergen · Dette rommet er delt konfidensielt med {data.viewer?.label} og kan trekkes tilbake når som helst.
        </footer>
      </main>
    </div>
  );
}

/* ═══════════════════ Seksjoner ═══════════════════ */

function GrowthSection({ metrics }) {
  const inv = metrics.investor || {};
  const hist = Array.isArray(metrics.mrrHistory) ? metrics.mrrHistory : (metrics.mrrHistory?.series || []);
  const wf = inv.waterfall || null;
  const ret = inv.retention || {};
  const movement = inv.movement || [];
  const histData = hist.map((p) => ({ label: p.label, value: p.mrrForventet ?? p.mrrActual ?? 0 }));

  return (
    <Section id="vekst" icon={TrendingUp} title="Vekst" subtitle="MRR-utvikling, bevegelse og retensjon">
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHead label="MRR siste 12 måneder" hint="Forventet honorarinntekt per måned" />
          {histData.length > 1 ? <AreaChart data={histData} /> : <Empty text="For lite historikk ennå" />}
        </Card>
        <Card className="lg:col-span-2">
          <CardHead label="MRR-bevegelse" hint="Ny · ekspansjon · kontraksjon · churn" />
          {movement.length ? <MovementBars data={movement.slice(-8)} /> : <Empty text="Ingen bevegelse registrert" />}
        </Card>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <MiniStat label="NRR" value={ret.nrr != null ? fmtPct(ret.nrr) : '—'} sub={ret.windowMonths ? `${ret.windowMonths} mnd vindu` : 'Trenger mer historikk'} />
        <MiniStat label="GRR" value={ret.grr != null ? fmtPct(ret.grr) : '—'} sub="Brutto retensjon" />
        <MiniStat label="Ny MRR (kohort)" value={fmtKr(wf?.neu)} sub="Siden første omsetningsmåned" />
        <MiniStat label="Churnet MRR" value={fmtKr(wf?.churn)} sub={wf?.churn > 0 ? 'Tapt siden start' : 'Ingen churn registrert'} good={!(wf?.churn > 0)} />
      </div>
    </Section>
  );
}

function EconomySection({ economy }) {
  const m = economy.resultat?.monthly || {};
  const liq = economy.likviditet || {};
  const sumE = liq.summary?.forventet || {};
  const runway = sumE.runwayMonths;

  return (
    <Section id="okonomi" icon={Wallet} title="Økonomi" subtitle="Resultat, kontantstrøm og runway — forventet scenario">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Inntekt / mnd" value={fmtKr(m.incomeForventet ?? m.incomeActual)} sub={`Faktisk ${fmtKr(m.incomeActual)}`} />
        <MiniStat label="Kostnader / mnd" value={fmtKr(m.opexTotal)} sub={`Annonser ${fmtKr(m.adSpendMonthly)} inkludert`} />
        <MiniStat label="Resultat / mnd" value={fmtKr(m.resultatForventet ?? m.resultatActual)} sub={m.marginForventet != null ? `Margin ${fmtPct(m.marginForventet)}` : ''} good={(m.resultatForventet ?? 0) >= 0} bad={(m.resultatForventet ?? 0) < 0} />
        <MiniStat label="Runway" value={runway != null ? `${runway} mnd` : '∞'} sub={liq.opening != null ? `Kasse ${fmtKr(liq.opening)} · brenn ${fmtKr(sumE.burnRate)}/mnd` : 'Åpningssaldo ikke satt'} good={runway == null || runway >= 12} bad={runway != null && runway < 6} />
      </div>
      {Array.isArray(liq.scenarios?.forventet) && liq.scenarios.forventet.length > 1 && liq.opening != null && (
        <Card className="mt-4">
          <CardHead label="Kontantbeholdning — 12 mnd frem" hint="Forventet scenario, inkl. planlagte hendelser" />
          <AreaChart data={liq.scenarios.forventet.map((p) => ({ label: p.label, value: p.cash ?? 0 }))} allowNegative />
        </Card>
      )}
    </Section>
  );
}

function ForecastSection({ forecast }) {
  const [scen, setScen] = useState('base');
  const scenarios = forecast.scenarios || {};
  const cur = scenarios[scen] || {};
  const series = cur.series || [];
  const sum = cur.summary || {};
  const A = forecast.assumptions || {};

  return (
    <Section id="prognose" icon={LineChart} title="Prognose" subtitle="Driver-basert 18-måneders fremskrivning">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[['konservativ', 'Konservativ'], ['base', 'Base'], ['aggressiv', 'Aggressiv']].map(([k, l]) => (
          <button key={k} onClick={() => setScen(k)}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold transition-colors ${scen === k ? 'bg-[#cf97fc] text-[#0a0a0a]' : 'bg-white/[0.05] text-white/55 hover:text-white ring-1 ring-white/[0.07]'}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-white/35">Forutsetninger: {A.newContractsPerMonth ?? '—'} nye kontrakter/mnd · {A.monthlyChurnPct != null ? `${A.monthlyChurnPct} % churn` : '— churn'} · snittleie {fmtKr(A.avgMonthlyRent)}</span>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHead label={`MRR — ${scen}`} hint="Månedlig honorarinntekt i scenariet" />
          {series.length > 1 ? <AreaChart data={series.map((p) => ({ label: p.label, value: p.mrr }))} /> : <Empty text="Ingen prognosedata" />}
        </Card>
        <div className="space-y-3">
          <MiniStat label="MRR om 18 mnd" value={fmtKr(sum.endMrr)} sub={`≈ ARR ${fmtKr((sum.endMrr || 0) * 12)}`} />
          <MiniStat label="Aktive kontrakter (slutt)" value={fmtNum(sum.endActiveContracts)} sub="Ved horisontens slutt" />
          <MiniStat label="Break-even" value={sum.breakevenMonth ? sum.breakevenMonth : 'Ikke i horisonten'} sub={sum.cashoutMonth ? `Kasse tom: ${sum.cashoutMonth}` : 'Kassen holder hele horisonten'} good={!sum.cashoutMonth} bad={!!sum.cashoutMonth} />
        </div>
      </div>
    </Section>
  );
}

function DocumentsSection({ documents, categories, token }) {
  const byCat = useMemo(() => {
    const map = {};
    for (const d of documents) { if (!map[d.category]) map[d.category] = []; map[d.category].push(d); }
    return map;
  }, [documents]);
  const catLabel = Object.fromEntries((categories || []).map((c) => [c.key, c.label]));

  return (
    <Section id="dokumenter" icon={FolderLock} title="Dokumenter" subtitle="Selskapsdokumenter med versjonskontroll — nedlastinger logges">
      {!documents.length ? (
        <Card><Empty text="Ingen dokumenter er delt ennå" /></Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(byCat).map(([cat, docs]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 mb-2">{catLabel[cat] || cat}</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {docs.map((d) => (
                  <a key={d.id} href={`/api/investor/file?t=${encodeURIComponent(token)}&docId=${encodeURIComponent(d.id)}`}
                    className="group flex items-center gap-3.5 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] hover:ring-[#cf97fc]/40 hover:bg-white/[0.05] transition-all p-4">
                    <span className="w-10 h-10 rounded-lg bg-[#cf97fc]/10 flex items-center justify-center shrink-0"><FileText className="w-4.5 h-4.5 text-[#cf97fc]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-white/90 truncate">{d.title}</span>
                      <span className="block text-[11.5px] text-white/35 mt-0.5">v{d.version} · {fmtBytes(d.size)} · oppdatert {new Date(d.updatedAt).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </span>
                    <Download className="w-4 h-4 text-white/25 group-hover:text-[#cf97fc] transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function QaSection({ questions: initial, token }) {
  const [questions, setQuestions] = useState(initial);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const ask = async () => {
    if (q.trim().length < 5) { setMsg({ ok: false, text: 'Skriv et spørsmål (minst 5 tegn)' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/investor/qa?t=${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim() }),
      });
      const j = await r.json();
      if (j.ok) {
        setQuestions((prev) => [j.question, ...prev]);
        setQ('');
        setMsg({ ok: true, text: 'Spørsmålet er sendt — du får svar her i rommet.' });
      } else setMsg({ ok: false, text: j.error || 'Kunne ikke sende' });
    } catch (e) { setMsg({ ok: false, text: 'Nettverksfeil' }); }
    setBusy(false);
  };

  return (
    <Section id="qa" icon={MessageCircleQuestion} title="Spørsmål & svar" subtitle="Still spørsmål direkte — svar loggføres her i rommet">
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} placeholder="F.eks.: Hva er planen for å redusere CAC de neste seks månedene?"
            className="flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] focus:ring-[#cf97fc]/50 text-[14px] text-white placeholder:text-white/25 px-4 py-3 outline-none resize-none" />
          <button onClick={ask} disabled={busy}
            className="h-12 sm:self-end px-6 rounded-xl bg-[#cf97fc] text-[#0a0a0a] text-[14px] font-bold hover:bg-[#dbb0fd] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
          </button>
        </div>
        {msg && (
          <p className={`mt-3 text-[13px] flex items-center gap-1.5 ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {msg.text}
          </p>
        )}
      </Card>
      {questions.length > 0 && (
        <div className="mt-4 space-y-3">
          {questions.map((item) => (
            <div key={item.id} className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] text-white/85 leading-relaxed">{item.question}</p>
                <span className="text-[11px] text-white/30 whitespace-nowrap shrink-0">{new Date(item.askedAt).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' })}</span>
              </div>
              {item.answer ? (
                <div className="mt-3 pl-3 border-l-2 border-[#cf97fc]/40">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#cf97fc]/80 mb-1">Svar fra DigiHome</p>
                  <p className="text-[13.5px] text-white/60 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                </div>
              ) : (
                <p className="mt-2.5 text-[12px] text-white/30 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Venter på svar</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ═══════════════════ Byggeklosser ═══════════════════ */

function Section({ id, icon: Icon, title, subtitle, children }) {
  return (
    <section id={id} className="pt-14 scroll-mt-24">
      <div className="flex items-center gap-3 mb-1.5">
        <span className="w-9 h-9 rounded-xl bg-[#cf97fc]/10 flex items-center justify-center"><Icon className="w-4.5 h-4.5 text-[#cf97fc]" /></span>
        <h2 className="text-[26px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h2>
      </div>
      <p className="text-[13.5px] text-white/40 mb-6 ml-12">{subtitle}</p>
      {children}
    </section>
  );
}

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-5 ${className}`}>{children}</div>;
}

function CardHead({ label, hint }) {
  return (
    <div className="mb-4">
      <p className="text-[13px] font-semibold text-white/80">{label}</p>
      {hint && <p className="text-[11.5px] text-white/30 mt-0.5">{hint}</p>}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-[13px] text-white/30 py-8 text-center">{text}</p>;
}

function HeroKpi({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className={`rounded-2xl p-5 ring-1 transition-colors ${accent ? 'bg-[#cf97fc]/[0.08] ring-[#cf97fc]/25' : 'bg-white/[0.03] ring-white/[0.06]'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</p>
        <Icon className={`w-4 h-4 ${accent ? 'text-[#cf97fc]' : 'text-white/25'}`} />
      </div>
      <p className="text-[30px] font-bold tracking-[-0.02em] mt-2 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {sub && <p className="text-[12px] text-white/35 mt-2">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, sub, good, bad }) {
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/35">{label}</p>
      <p className={`text-[22px] font-bold mt-1.5 leading-none ${bad ? 'text-rose-400' : good ? 'text-emerald-400' : 'text-white'}`} style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {sub && <p className="text-[11.5px] text-white/30 mt-1.5">{sub}</p>}
    </div>
  );
}

// Enkel, avhengighetsfri areal-graf (SVG). Tåler negative verdier (kontanter).
function AreaChart({ data, allowNegative = false }) {
  const W = 640, H = 200, PAD = { t: 12, r: 8, b: 26, l: 8 };
  const vals = data.map((d) => Number(d.value) || 0);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (!allowNegative) min = Math.min(0, min);
  if (max === min) max = min + 1;
  const x = (i) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const line = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(vals.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`;
  const zeroY = min < 0 && max > 0 ? y(0) : null;
  const last = vals[vals.length - 1];
  const step = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        <defs>
          <linearGradient id="ddArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cf97fc" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#cf97fc" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {zeroY != null && <line x1={PAD.l} x2={W - PAD.r} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />}
        <path d={area} fill="url(#ddArea)" />
        <path d={line} fill="none" stroke="#cf97fc" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(vals.length - 1)} cy={y(last)} r="4" fill="#cf97fc" />
        <circle cx={x(vals.length - 1)} cy={y(last)} r="8" fill="#cf97fc" opacity="0.25" />
        {data.map((d, i) => (i % step === 0 || i === data.length - 1) ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,0.32)">{d.label}</text>
        ) : null)}
      </svg>
      <p className="text-right text-[12.5px] text-white/50 mt-1">Siste: <b className="text-[#cf97fc]">{fmtKr(last)}</b></p>
    </div>
  );
}

// Netto ny MRR per måned — grønn/rød stolpe.
function MovementBars({ data }) {
  const vals = data.map((d) => Number(d.netNew) || 0);
  const maxAbs = Math.max(1, ...vals.map((v) => Math.abs(v)));
  return (
    <div>
      <div className="flex items-stretch justify-between gap-2 h-[160px]">
        {data.map((d, i) => {
          const v = vals[i];
          const hPct = Math.max(4, (Math.abs(v) / maxAbs) * 100);
          return (
            <div key={d.ym} className="flex-1 flex flex-col items-center justify-end gap-1.5 min-w-0" title={`${d.label}: ${fmtKr(v)} netto ny MRR`}>
              <span className="text-[10px] text-white/40 font-semibold">{v !== 0 ? fmtNum(v) : ''}</span>
              <div className={`w-full max-w-[38px] rounded-t-md ${v >= 0 ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`} style={{ height: `${hPct}%` }} />
              <span className="text-[10px] text-white/30 truncate">{d.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-white/25 mt-2">Netto ny MRR = ny + ekspansjon − kontraksjon − churn</p>
    </div>
  );
}
