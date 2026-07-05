'use client';

// API-forbruk — KONSOLIDERT kostnadspanel (lys Stripe/Carta-stil).
// Én samlet tabell for BEGGE prosjekter (Landingsside + Plattform-CRM) med
// filtrering på prosjekt og type, drill-down per funksjon og modellbytte.
// Alt omregnet til NOK for ekte sammenlignbarhet.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, RefreshCw, ChevronDown, ChevronRight, Zap, Cpu, Image as ImageIcon,
  MessageSquareText, Info, CheckCircle2, Clock3, AlertTriangle, Wallet, Hash, Layers,
} from 'lucide-react';

const VIOLET = '#7c5cf0';
const BLUE = '#2f7de1';
const EMER = '#10b981';
const EMER_TEXT = '#059669';

const PERIODS = [
  { k: 7, l: '7 d' },
  { k: 30, l: '30 d' },
  { k: 90, l: '90 d' },
];

// Norske visningsnavn per funksjons-id: [område, beskrivelse]
const FEATURE_LABELS = {
  annonsestudio_tekst: ['Annonsestudio', 'AI-annonsetekst (Meta)'],
  annonsestudio_bildeprompt: ['Annonsestudio', 'Bildeprompt fra brief'],
  annonsestudio_bildesyn: ['Annonsestudio', 'AI-syn — bildebeskrivelse'],
  annonsestudio_bilde: ['Annonsestudio', 'Bildegenerering (Nano Banana)'],
  nyhetsbrev_emne: ['Nyhetsbrev', 'Emne & forhåndstekst'],
  nyhetsbrev_bildeprompt: ['Nyhetsbrev', 'Bildeprompt-forslag'],
  nyhetsbrev_bilde: ['Nyhetsbrev', 'Bildegenerering (Nano Banana)'],
  lead_svar: ['Leads', 'AI-scoring av leads'],
  ai_assistent: ['Innsikt', 'AI-assistent & sammendrag'],
  artikkel: ['Artikler', 'AI-artikkelutkast'],
  ads_rsa_tekst: ['Google Ads', 'RSA-annonsetekster'],
  ads_meta_tekst: ['Meta', 'Annonsetekster'],
  ads_ukerapport: ['Annonser', 'Ukerapport (AI)'],
  leiemarked_analyse: ['Leiemarked', 'Markedsvurdering'],
  general: ['Øvrig', 'Umerkede kall'],
};
const IMAGE_FEATURES = new Set(['annonsestudio_bilde', 'nyhetsbrev_bilde']);

const PROVIDER_LABELS = {
  openai: { label: 'OpenAI', sub: 'din nøkkel — tekst (landingsside)', color: EMER },
  emergent: { label: 'Emergent-gateway', sub: 'fallback tekst + bilder (landingsside)', color: VIOLET },
  anthropic: { label: 'Anthropic', sub: 'plattform-CRM (Claude)', color: BLUE },
  gemini: { label: 'Gemini', sub: 'plattform-CRM (bilder)', color: BLUE },
};

// — Formattering —
const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtNok(v) {
  const n = Number(v) || 0;
  if (n === 0) return '0 kr';
  if (n < 0.01) return '< 0,01 kr';
  return `${nf2.format(n)} kr`;
}
function fmtTok(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} k`;
  return nf0.format(n);
}

// — Småkomponenter —
function Card({ children, className = '', testid }) {
  return (
    <div data-testid={testid} className={`rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] ${className}`}>{children}</div>
  );
}

function StatCard({ icon: Icon, label, value, sub, testid }) {
  return (
    <Card className="p-5" testid={testid}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#c4c2cc]" />}{label}
      </p>
      <p className="mt-2.5 text-[#16141d] font-bold text-[26px] leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-[#a5a3af]">{sub}</p>}
    </Card>
  );
}

function Spark({ data = [], color = VIOLET, height = 26 }) {
  const vals = data.map((d) => Number(d.value) || 0);
  const max = Math.max(...vals, 0.0001);
  if (!vals.length || vals.every((v) => v === 0)) return <span className="text-[10.5px] text-[#d0ced8]">—</span>;
  const w = 120, h = height;
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  const pts = vals.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`).join(' L ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Prosjekt-chip: Landingsside (lilla) / Plattform (blå)
function ProjectChip({ project }) {
  const isLp = project === 'landingsside';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.05em] rounded-full px-2 py-0.5 whitespace-nowrap"
      style={{ color: isLp ? VIOLET : BLUE, background: isLp ? `${VIOLET}14` : `${BLUE}12` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: isLp ? VIOLET : BLUE }} />
      {isLp ? 'Landingsside' : 'Plattform'}
    </span>
  );
}

function FilterChip({ active, onClick, children, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className={`px-3 h-7.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${active ? 'bg-[#16141d] text-white' : 'bg-black/[0.04] text-[#8b8894] hover:text-[#16141d]'}`}>
      {children}
    </button>
  );
}

export default function ApiUsageTab({ apiKey }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openRow, setOpenRow] = useState(null);
  const [savingFeature, setSavingFeature] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [fProject, setFProject] = useState('alle'); // alle | landingsside | plattform
  const [fType, setFType] = useState('alle');       // alle | ai | tjenester

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/usage/api?key=${encodeURIComponent(apiKey)}&days=${days}`);
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'Kunne ikke hente forbruk'); }
      setData(j);
      setOverrides(j.overrides || {});
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey, days]);

  useEffect(() => { load(); }, [load]);

  const setModel = async (feature, model, scope) => {
    const saveKey = scope === 'platform' ? `pf:${feature}` : feature;
    setSavingFeature(saveKey);
    try {
      const res = await fetch(`/api/admin/usage/llm/model?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scope === 'platform' ? { feature, model, scope: 'platform' } : { feature, model }),
      });
      const j = await res.json();
      if (j.ok && scope === 'platform') {
        // Forespørselen ligger nå i broen — vis «venter på plattformen» umiddelbart.
        setData((d) => (d ? { ...d, platformControl: { ...(d.platformControl || {}), [feature]: j.request } } : d));
      } else if (j.ok) setOverrides(j.overrides || {});
      else setErr(j.error || 'Kunne ikke lagre modellvalg');
    } catch (e) { setErr('Nettverksfeil ved lagring'); }
    finally { setSavingFeature(null); }
  };

  const llm = data?.llm || { totals: {}, byProvider: [], byModel: [], byFeature: [], series: [] };
  const ext = data?.ext || { services: [], totalNok: 0 };
  const platform = data?.platform || { status: 'waiting' };
  const models = data?.models || [];
  const platformControl = data?.platformControl || {};
  const platformModels = data?.platformModels || [];
  const defaultModel = data?.defaultModel || 'gpt-4o-mini';
  const usdToNok = Number(data?.usdToNok) || 11;
  const toNok = (cost, currency) => ((currency || 'USD').toUpperCase() === 'NOK' ? (Number(cost) || 0) : (Number(cost) || 0) * usdToNok);

  // —— KONSOLIDERTE RADER: våre LLM-funksjoner + våre tjenester + plattformens alt ——
  const rows = useMemo(() => {
    const out = [];
    // 1) Våre LLM-funksjoner (inkl. kjente uten bruk — så modell kan velges)
    const used = new Map((llm.byFeature || []).map((f) => [f.feature, f]));
    const featIds = new Set([...used.keys(), ...Object.keys(FEATURE_LABELS).filter((k) => k !== 'general')]);
    for (const id of featIds) {
      const f = used.get(id) || { calls: 0, tokens: 0, images: 0, costNok: 0, models: [], series: [] };
      const [area, desc] = FEATURE_LABELS[id] || ['—', id];
      const isImage = IMAGE_FEATURES.has(id) || f.kind === 'image';
      out.push({
        key: `lp-ai-${id}`, project: 'landingsside', type: 'ai', feature: id,
        title: area, sub: desc, calls: f.calls, tokens: f.tokens, images: f.images,
        nok: f.costNok, series: f.series, modelsBreakdown: f.models || [],
        isImage, switchable: !isImage, badge: null,
      });
    }
    // 2) Våre eksterne tjenester
    for (const s of ext.services || []) {
      out.push({
        key: `lp-svc-${s.service}`, project: 'landingsside', type: 'tjenester', service: s.service,
        title: s.label, sub: s.detail || '', units: s.units, unitLabel: s.unit,
        nok: s.costNok, badge: 'estimat', switchable: false,
      });
    }
    // 3) Plattformens tjenester (hittil denne mnd)
    if (platform.status === 'ok') {
      for (const s of platform.services || []) {
        out.push({
          key: `pf-svc-${s.service}`, project: 'plattform', type: 'tjenester',
          title: s.label || s.service, sub: s.source === 'exact' ? 'eksakt fra leverandør' : 'estimat',
          units: s.used || 0, unitLabel: s.unit || '', nok: toNok(s.cost, s.currency),
          origCost: s.cost, origCurrency: s.currency, badge: 'denne mnd', switchable: false,
        });
      }
      // 4) Plattformens AI-funksjoner
      for (const f of (platform.llm && platform.llm.byFeature) || []) {
        out.push({
          key: `pf-ai-${f.feature}`, project: 'plattform', type: 'ai', feature: f.feature,
          title: f.label || f.feature, sub: f.model || '', calls: f.calls || 0, tokens: f.tokens || 0,
          nok: toNok(f.cost, f.currency), origCost: f.cost, origCurrency: f.currency,
          badge: 'denne mnd', switchable: false, platformSwitchable: true, fixedModel: f.model,
        });
      }
    }
    return out.sort((a, b) => (b.nok - a.nok) || ((b.calls || b.units || 0) - (a.calls || a.units || 0)) || a.title.localeCompare(b.title));
  }, [llm.byFeature, ext.services, platform, usdToNok]);

  const filtered = rows.filter((r) =>
    (fProject === 'alle' || r.project === fProject) &&
    (fType === 'alle' || r.type === fType)
  );

  // Leverandører på tvers av prosjekter
  const providers = useMemo(() => {
    const list = (llm.byProvider || []).map((p) => ({ ...p, project: 'landingsside' }));
    if (platform.status === 'ok') {
      const byProv = new Map();
      for (const m of (platform.llm && platform.llm.byModel) || []) {
        const prov = m.provider || 'ukjent';
        const cur = byProv.get(prov) || { provider: prov, calls: 0, tokens: 0, images: 0, costNok: 0, project: 'plattform' };
        cur.calls += m.calls || 0; cur.tokens += m.tokens || 0; cur.costNok += toNok(m.cost, m.currency);
        byProv.set(prov, cur);
      }
      list.push(...byProv.values());
    }
    return list.sort((a, b) => b.costNok - a.costNok);
  }, [llm.byProvider, platform, usdToNok]);
  const maxProviderCost = Math.max(...providers.map((p) => p.costNok), 0.0001);

  // Totaler
  const lpTotal = (llm.totals.costNok || 0) + (ext.totalNok || 0);
  const pfTotal = platform.status === 'ok'
    ? [...(platform.services || []).map((s) => toNok(s.cost, s.currency)), ...(((platform.llm && platform.llm.byModel) || []).map((m) => toNok(m.cost, m.currency)))].reduce((a, b) => a + b, 0)
    : 0;

  if (loading && !data) {
    return <div className="h-[420px] grid place-items-center rounded-2xl bg-white border border-black/[0.06]"><Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Topplinje */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="text-[#16141d] text-[17px] font-bold tracking-[-0.01em]">API-forbruk</h3>
          <p className="text-[12.5px] text-[#8b8894] mt-0.5">Begge prosjekter samlet · alt i NOK · estimerte kostnader</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5">
            {PERIODS.map((p) => (
              <button key={p.k} onClick={() => setDays(p.k)} data-testid={`usage-period-${p.k}`}
                className={`px-3 h-8 rounded-full text-[12px] font-semibold transition-all ${days === p.k ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(22,20,29,0.12)]' : 'text-[#8b8894] hover:text-[#16141d]'}`}>{p.l}</button>
            ))}
          </div>
          <button onClick={load} title="Oppdater" className="h-8 w-8 rounded-full bg-white border border-black/[0.07] text-[#8b8894] hover:text-[#16141d] hover:border-black/[0.14] grid place-items-center transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {err && <div className="text-[13px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-center gap-2"><Info className="w-4 h-4" />{err}</div>}

      {/* Totalkort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Total API-kostnad" value={fmtNok(lpTotal + pfTotal)} sub={`Landingsside ${fmtNok(lpTotal)} · Plattform ${fmtNok(pfTotal)}`} testid="usage-total-cost" />
        <StatCard icon={Hash} label="AI-kall (landingsside)" value={nf0.format(llm.totals.calls || 0)} sub={`${fmtTok(llm.totals.tokens)} tokens · siste ${days} d`} />
        <StatCard icon={ImageIcon} label="Bilder generert" value={nf0.format(llm.totals.images || 0)} sub="Nano Banana via Emergent" />
        <StatCard icon={Layers} label="Plattform (CRM)" value={fmtNok(pfTotal)} sub={platform.status === 'ok' ? `måned ${platform.month || ''} · hittil` : 'venter på tilkobling'} />
      </div>

      {/* Per leverandør — begge prosjekter */}
      <Card className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] mb-4 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-[#c4c2cc]" /> Per LLM-leverandør <span className="normal-case tracking-normal text-[#c4c2cc]">· begge prosjekter</span></p>
        {providers.length === 0 && <p className="text-[13px] text-[#b8b6c0]">Ingen AI-kall i perioden</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {providers.map((p) => {
            const meta = PROVIDER_LABELS[p.provider] || { label: p.provider, sub: '', color: '#94a3b8' };
            const sub = p.project === 'plattform' ? 'plattform-CRM' : meta.sub;
            const color = p.project === 'plattform' ? BLUE : meta.color;
            return (
              <div key={`${p.project}-${p.provider}`}>
                <div className="flex items-center justify-between text-[12.5px] mb-1 gap-2">
                  <span className="font-semibold text-[#16141d] truncate">{meta.label} <span className="font-normal text-[#a5a3af]">· {sub}</span></span>
                  <span className="text-[#514e5a] tabular-nums font-medium shrink-0">{fmtNok(p.costNok)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-black/[0.05] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, (p.costNok / maxProviderCost) * 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
                </div>
                <p className="mt-1 text-[11px] text-[#a5a3af] tabular-nums">{nf0.format(p.calls)} kall · {fmtTok(p.tokens)} tokens{p.images > 0 ? ` · ${p.images} bilder` : ''}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* —— KONSOLIDERT TABELL —— */}
      <Card className="overflow-hidden" testid="usage-features">
        <div className="px-5 pt-5 pb-3 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894]">Alle API-kostnader</p>
          <span className="text-[11px] text-[#c4c2cc]">· klikk AI-rad for modellfordeling</span>
          <span className="ml-auto" data-testid="usage-platform-status">
            {platform.status === 'ok' && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 bg-emerald-50" style={{ color: EMER_TEXT }}><CheckCircle2 className="w-3 h-3" /> Plattform tilkoblet</span>}
            {platform.status === 'waiting' && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 text-amber-700 bg-amber-50"><Clock3 className="w-3 h-3" /> Plattform: venter på leveranse</span>}
            {(platform.status === 'error' || platform.status === 'invalid') && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 text-rose-700 bg-rose-50"><AlertTriangle className="w-3 h-3" /> Plattform: får ikke kontakt</span>}
          </span>
        </div>

        {/* Filtre */}
        <div className="px-5 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#b0aeb8] mr-0.5">Prosjekt</span>
            <FilterChip active={fProject === 'alle'} onClick={() => setFProject('alle')} testid="usage-filter-project-alle">Alle</FilterChip>
            <FilterChip active={fProject === 'landingsside'} onClick={() => setFProject('landingsside')} testid="usage-filter-project-landingsside">Landingsside</FilterChip>
            <FilterChip active={fProject === 'plattform'} onClick={() => setFProject('plattform')} testid="usage-filter-project-plattform">Plattform</FilterChip>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#b0aeb8] mr-0.5">Type</span>
            <FilterChip active={fType === 'alle'} onClick={() => setFType('alle')} testid="usage-filter-type-alle">Alle</FilterChip>
            <FilterChip active={fType === 'ai'} onClick={() => setFType('ai')} testid="usage-filter-type-ai">AI / LLM</FilterChip>
            <FilterChip active={fType === 'tjenester'} onClick={() => setFType('tjenester')} testid="usage-filter-type-tjenester">Tjenester</FilterChip>
          </div>
          <span className="ml-auto text-[11px] text-[#b0aeb8] tabular-nums">{filtered.length} rader · {fmtNok(filtered.reduce((s, r) => s + (r.nok || 0), 0))}</span>
        </div>

        {/* Kolonneoverskrifter */}
        <div className="hidden sm:grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_repeat(2,minmax(0,0.75fr))_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.7fr)] gap-3 px-5 py-2 border-y border-black/[0.04] bg-[#fafafb] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#a5a3af]">
          <span>Funksjon / tjeneste</span><span>Prosjekt</span><span className="text-right">Kall/enh.</span><span className="text-right">Tokens/bilder</span><span className="text-right">Kostnad</span><span>Trend</span><span>Modell</span>
        </div>

        <div className="divide-y divide-black/[0.04]">
          {filtered.length === 0 && <p className="px-5 py-6 text-[13px] text-[#b8b6c0]">Ingen rader matcher filteret</p>}
          {filtered.map((r) => {
            const open = openRow === r.key;
            const ov = r.feature ? overrides[r.feature] : null;
            const expandable = r.project === 'landingsside' && r.type === 'ai';
            return (
              <div key={r.key} data-testid={r.feature ? `usage-feature-row-${r.feature}` : (r.service ? `usage-ext-${r.service}` : undefined)}>
                <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_repeat(2,minmax(0,0.75fr))_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.7fr)] gap-x-3 gap-y-2 px-5 py-3 items-center hover:bg-[#fafafb] transition-colors">
                  <button onClick={() => expandable && setOpenRow(open ? null : r.key)} className={`flex items-center gap-2 text-left min-w-0 col-span-2 sm:col-span-1 ${expandable ? '' : 'cursor-default'}`}>
                    {expandable ? (open ? <ChevronDown className="w-3.5 h-3.5 text-[#a5a3af] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#c4c2cc] shrink-0" />) : <span className="w-3.5 shrink-0" />}
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#16141d] truncate">{r.title} {r.sub && <span className="font-normal text-[#8b8894]">· {r.sub}</span>}</span>
                      {r.feature && <span className="block text-[10.5px] text-[#c4c2cc] font-mono truncate">{r.feature}</span>}
                    </span>
                  </button>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <ProjectChip project={r.project} />
                    {r.badge && <span className="text-[9.5px] font-semibold uppercase tracking-[0.04em] text-[#a5a3af] bg-black/[0.04] rounded-full px-1.5 py-0.5 whitespace-nowrap">{r.badge}</span>}
                  </span>
                  <span className="text-[12.5px] text-[#514e5a] tabular-nums sm:text-right">{r.units != null ? `${nf0.format(r.units)} ${r.unitLabel || ''}` : nf0.format(r.calls || 0)}</span>
                  <span className="text-[12.5px] text-[#514e5a] tabular-nums sm:text-right">{r.isImage ? `${r.images || 0} bilder` : (r.tokens != null && r.type === 'ai' ? fmtTok(r.tokens) : '—')}</span>
                  <span className="text-[12.5px] font-semibold text-[#16141d] tabular-nums sm:text-right" title={r.origCost != null ? `${nf2.format(r.origCost)} ${r.origCurrency || 'USD'}` : undefined}>{fmtNok(r.nok)}</span>
                  <span className="hidden sm:block pr-2">{r.series ? <Spark data={r.series} color={r.isImage ? EMER : (r.project === 'plattform' ? BLUE : VIOLET)} /> : <span className="text-[10.5px] text-[#d0ced8]">—</span>}</span>
                  <span className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                    {r.switchable ? (
                      <>
                        <select
                          data-testid={`usage-model-select-${r.feature}`}
                          value={ov || ''}
                          disabled={savingFeature === r.feature}
                          onChange={(e) => setModel(r.feature, e.target.value)}
                          className="w-full max-w-[210px] h-9 px-2 rounded-lg border border-black/[0.1] bg-white text-[12px] text-[#16141d] focus:outline-none focus:border-[#7c5cf0] disabled:opacity-50"
                        >
                          <option value="">Standard — {defaultModel}</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>{m.label} · ${m.in}/${m.out} per 1M</option>
                          ))}
                        </select>
                        {savingFeature === r.feature ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a5a3af] shrink-0" />
                        ) : ov ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.06em] rounded-full px-2 py-0.5 shrink-0" style={{ color: VIOLET, background: `${VIOLET}14` }}>Overstyrt</span>
                        ) : null}
                      </>
                    ) : r.platformSwitchable ? (
                      (() => {
                        const ctrl = platformControl[r.feature];
                        const current = ctrl?.model || r.fixedModel || '';
                        const opts = platformModels.some((m) => m.id === current) || !current
                          ? platformModels
                          : [{ id: current, label: current, note: 'i bruk nå' }, ...platformModels];
                        return (
                          <>
                            <select
                              data-testid={`usage-pf-model-select-${r.feature}`}
                              value={current}
                              disabled={savingFeature === `pf:${r.feature}`}
                              onChange={(e) => { if (e.target.value && e.target.value !== current) setModel(r.feature, e.target.value, 'platform'); }}
                              className="w-full max-w-[210px] h-9 px-2 rounded-lg border border-black/[0.1] bg-white text-[12px] text-[#16141d] focus:outline-none focus:border-[#4f7df0] disabled:opacity-50"
                            >
                              {opts.map((m) => (
                                <option key={m.id} value={m.id}>{m.label}{m.note ? ` · ${m.note}` : ''}</option>
                              ))}
                            </select>
                            {savingFeature === `pf:${r.feature}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a5a3af] shrink-0" />
                            ) : ctrl?.status === 'pending' ? (
                              <span className="text-[10px] font-bold uppercase tracking-[0.04em] rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap text-amber-600 bg-amber-500/10" title={`Forespurt ${ctrl.requestedAt ? new Date(ctrl.requestedAt).toLocaleString('nb-NO') : ''} — plattform-agenten må bekrefte via broen`}>⏳ venter</span>
                            ) : ctrl?.status === 'applied' ? (
                              <span className="text-[10px] font-bold uppercase tracking-[0.04em] rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap text-emerald-600 bg-emerald-500/10" title={`Bekreftet av plattformen ${ctrl.appliedAt ? new Date(ctrl.appliedAt).toLocaleString('nb-NO') : ''}`}>✓ aktiv</span>
                            ) : ctrl?.status === 'rejected' ? (
                              <span className="text-[10px] font-bold uppercase tracking-[0.04em] rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap text-rose-600 bg-rose-500/10" title={ctrl.reason || 'Avvist av plattformen'}>avvist</span>
                            ) : null}
                          </>
                        );
                      })()
                    ) : r.isImage ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#8b8894] bg-black/[0.04] rounded-lg px-2.5 py-1.5"><ImageIcon className="w-3 h-3" /> Nano Banana (fast)</span>
                    ) : r.fixedModel ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#8b8894] bg-black/[0.04] rounded-lg px-2.5 py-1.5 truncate"><MessageSquareText className="w-3 h-3 shrink-0" /> {r.fixedModel}</span>
                    ) : (
                      <span className="text-[11px] text-[#d0ced8]">—</span>
                    )}
                  </span>
                </div>
                {open && expandable && (
                  <div className="px-5 pb-4 pl-11">
                    {(r.modelsBreakdown || []).length === 0 ? (
                      <p className="text-[12px] text-[#b8b6c0]">Ingen kall i perioden{ov ? ` — neste kall bruker ${ov}` : ''}</p>
                    ) : (
                      <div className="rounded-xl bg-[#fafafb] border border-black/[0.04] divide-y divide-black/[0.04]">
                        {r.modelsBreakdown.map((m) => (
                          <div key={m.model} className="flex items-center gap-3 px-4 py-2 text-[12px]">
                            <span className="font-medium text-[#16141d]">{m.model}</span>
                            <span className="ml-auto text-[#a5a3af] tabular-nums">{nf0.format(m.calls)} kall · {m.images > 0 ? `${m.images} bilder` : `${fmtTok(m.tokens)} tokens`}</span>
                            <span className="font-semibold text-[#16141d] tabular-nums w-20 text-right">{fmtNok(m.costNok)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {platform.status !== 'ok' && (
          <div className="mx-5 mb-4 rounded-xl bg-[#fafafb] border border-dashed border-black/[0.08] p-3.5">
            <p className="text-[12px] text-[#8b8894] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{ color: VIOLET }} />
              Plattform-CRM-radene (Twilio, e-signering m.m.) dukker opp her automatisk når <span className="font-mono text-[11px] bg-black/[0.04] rounded px-1 py-0.5">/api/usage/external</span> svarer (sjekkes hvert 10. min).
            </p>
          </div>
        )}
      </Card>

      <p className="text-[11.5px] text-[#b0aeb8] flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        Beløp er estimater fra listepriser (USD→NOK {usdToNok}). Plattform-rader viser hittil denne måneden; landingsside følger valgt periode. Kostnadene flyter automatisk inn i Økonomi → Resultat & Likviditet.
      </p>
    </div>
  );
}
