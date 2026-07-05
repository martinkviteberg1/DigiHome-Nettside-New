'use client';

// API-forbruk — samlet kostnadspanel (lys Stripe/Carta-stil, matcher Nøkkeltall).
// · LLM-kostnad per leverandør/modell (self-metering)
// · Drill-down per funksjon m/ modellfordeling, trend og MODELLBYTTE fra UI
// · Eksterne tjenester (egen telling: SendGrid, SerpAPI, Google Maps)
// · Plattform-prosjektets /api/usage/external (venter-status til de leverer)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, RefreshCw, ChevronDown, ChevronRight, Zap, Cpu, Image as ImageIcon,
  MessageSquareText, Info, CheckCircle2, Clock3, AlertTriangle, Wallet, Hash, Layers,
} from 'lucide-react';

const INK = '#16141d';
const VIOLET = '#7c5cf0';
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
  openai: { label: 'OpenAI', sub: 'din nøkkel — tekst (primær)', color: EMER },
  emergent: { label: 'Emergent-gateway', sub: 'fallback tekst + bildegenerering', color: VIOLET },
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

function featureLabel(id) {
  const hit = FEATURE_LABELS[id];
  return hit ? hit : ['—', id];
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
  if (!vals.length || vals.every((v) => v === 0)) return <div className="text-[10.5px] text-[#d0ced8]" style={{ height, lineHeight: `${height}px` }}>ingen aktivitet</div>;
  const w = 120, h = height;
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  const pts = vals.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`).join(' L ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function ApiUsageTab({ apiKey }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openFeature, setOpenFeature] = useState(null);
  const [savingFeature, setSavingFeature] = useState(null);
  const [overrides, setOverrides] = useState({});

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

  const setModel = async (feature, model) => {
    setSavingFeature(feature);
    try {
      const res = await fetch(`/api/admin/usage/llm/model?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, model }),
      });
      const j = await res.json();
      if (j.ok) setOverrides(j.overrides || {});
      else setErr(j.error || 'Kunne ikke lagre modellvalg');
    } catch (e) { setErr('Nettverksfeil ved lagring'); }
    finally { setSavingFeature(null); }
  };

  const llm = data?.llm || { totals: {}, byProvider: [], byModel: [], byFeature: [], series: [] };
  const ext = data?.ext || { services: [], totalNok: 0 };
  const platform = data?.platform || { status: 'waiting' };
  const models = data?.models || [];
  const defaultModel = data?.defaultModel || 'gpt-4o-mini';

  // Alle funksjoner: bruksdata + kjente funksjoner uten bruk (slik at modell kan
  // endres også for funksjoner som ikke er brukt i perioden).
  const featureRows = useMemo(() => {
    const used = new Map((llm.byFeature || []).map((f) => [f.feature, f]));
    const all = [...used.values()];
    for (const id of Object.keys(FEATURE_LABELS)) {
      if (id === 'general') continue;
      if (!used.has(id)) all.push({ feature: id, kind: IMAGE_FEATURES.has(id) ? 'image' : 'text', calls: 0, tokens: 0, images: 0, costNok: 0, models: [], series: [] });
    }
    return all.sort((a, b) => (b.costNok - a.costNok) || (b.calls - a.calls) || a.feature.localeCompare(b.feature));
  }, [llm.byFeature]);

  const maxProviderCost = Math.max(...(llm.byProvider || []).map((p) => p.costNok), 0.0001);

  if (loading && !data) {
    return <div className="h-[420px] grid place-items-center rounded-2xl bg-white border border-black/[0.06]"><Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Topplinje */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="text-[#16141d] text-[17px] font-bold tracking-[-0.01em]">API-forbruk</h3>
          <p className="text-[12.5px] text-[#8b8894] mt-0.5">LLM per modell & funksjon · eksterne tjenester · estimerte kostnader i NOK</p>
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
        <StatCard icon={Wallet} label="AI-kostnad" value={fmtNok(llm.totals.costNok)} sub={`siste ${days} dager · estimat`} testid="usage-total-cost" />
        <StatCard icon={Hash} label="AI-kall" value={nf0.format(llm.totals.calls || 0)} sub={`${fmtTok(llm.totals.tokens)} tokens`} />
        <StatCard icon={ImageIcon} label="Bilder generert" value={nf0.format(llm.totals.images || 0)} sub="Nano Banana via Emergent" />
        <StatCard icon={Layers} label="Eksterne tjenester" value={fmtNok(ext.totalNok)} sub="SendGrid · SerpAPI · Maps (egen telling)" />
      </div>

      {/* Per leverandør + per modell */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] mb-4 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-[#c4c2cc]" /> Per LLM-leverandør</p>
          {(llm.byProvider || []).length === 0 && <p className="text-[13px] text-[#b8b6c0]">Ingen AI-kall i perioden</p>}
          <div className="space-y-4">
            {(llm.byProvider || []).map((p) => {
              const meta = PROVIDER_LABELS[p.provider] || { label: p.provider, sub: '', color: '#94a3b8' };
              return (
                <div key={p.provider}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="font-semibold text-[#16141d]">{meta.label} <span className="font-normal text-[#a5a3af]">· {meta.sub}</span></span>
                    <span className="text-[#514e5a] tabular-nums font-medium">{fmtNok(p.costNok)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-black/[0.05] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, (p.costNok / maxProviderCost) * 100)}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}99)` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-[#a5a3af] tabular-nums">{nf0.format(p.calls)} kall · {fmtTok(p.tokens)} tokens{p.images > 0 ? ` · ${p.images} bilder` : ''}</p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] mb-3">Per modell</p>
          {(llm.byModel || []).length === 0 && <p className="text-[13px] text-[#b8b6c0]">Ingen AI-kall i perioden</p>}
          <div className="divide-y divide-black/[0.04]">
            {(llm.byModel || []).map((m) => (
              <div key={m.model} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                {m.kind === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-[#c4c2cc] shrink-0" /> : <MessageSquareText className="w-3.5 h-3.5 text-[#c4c2cc] shrink-0" />}
                <span className="text-[13px] font-medium text-[#16141d] truncate">{m.model}</span>
                <span className="ml-auto text-[11.5px] text-[#a5a3af] tabular-nums shrink-0">{nf0.format(m.calls)} kall · {m.kind === 'image' ? `${m.images} bilder` : `${fmtTok(m.tokens)} tok`}</span>
                <span className="text-[12.5px] font-semibold text-[#16141d] tabular-nums w-20 text-right shrink-0">{fmtNok(m.costNok)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Drill-down per funksjon + modellbytte */}
      <Card className="overflow-hidden" testid="usage-features">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894]">Per funksjon — drill-down & modellvalg</p>
          <span className="text-[11px] text-[#c4c2cc]">· klikk en rad for modellfordeling</span>
        </div>
        <div className="hidden sm:grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,0.8fr))_minmax(0,1fr)_minmax(0,1.6fr)] gap-3 px-5 py-2 border-y border-black/[0.04] bg-[#fafafb] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#a5a3af]">
          <span>Funksjon</span><span className="text-right">Kall</span><span className="text-right">Tokens/bilder</span><span className="text-right">Kostnad</span><span>Trend</span><span>Modell</span>
        </div>
        <div className="divide-y divide-black/[0.04]">
          {featureRows.map((f) => {
            const [area, desc] = featureLabel(f.feature);
            const isImage = f.kind === 'image' || IMAGE_FEATURES.has(f.feature);
            const open = openFeature === f.feature;
            const ov = overrides[f.feature];
            return (
              <div key={f.feature} data-testid={`usage-feature-row-${f.feature}`}>
                <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,0.8fr))_minmax(0,1fr)_minmax(0,1.6fr)] gap-x-3 gap-y-2 px-5 py-3 items-center hover:bg-[#fafafb] transition-colors">
                  <button onClick={() => setOpenFeature(open ? null : f.feature)} className="flex items-center gap-2 text-left min-w-0 col-span-2 sm:col-span-1">
                    {open ? <ChevronDown className="w-3.5 h-3.5 text-[#a5a3af] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#c4c2cc] shrink-0" />}
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#16141d] truncate">{area} <span className="font-normal text-[#8b8894]">· {desc}</span></span>
                      <span className="block text-[10.5px] text-[#c4c2cc] font-mono truncate">{f.feature}</span>
                    </span>
                  </button>
                  <span className="text-[12.5px] text-[#514e5a] tabular-nums sm:text-right">{nf0.format(f.calls)}</span>
                  <span className="text-[12.5px] text-[#514e5a] tabular-nums sm:text-right">{isImage ? `${f.images} bilder` : fmtTok(f.tokens)}</span>
                  <span className="text-[12.5px] font-semibold text-[#16141d] tabular-nums sm:text-right">{fmtNok(f.costNok)}</span>
                  <span className="hidden sm:block pr-2"><Spark data={f.series} color={isImage ? EMER : VIOLET} /></span>
                  <span className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                    {isImage ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#8b8894] bg-black/[0.04] rounded-lg px-2.5 py-1.5"><ImageIcon className="w-3 h-3" /> Nano Banana (fast)</span>
                    ) : (
                      <>
                        <select
                          data-testid={`usage-model-select-${f.feature}`}
                          value={ov || ''}
                          disabled={savingFeature === f.feature}
                          onChange={(e) => setModel(f.feature, e.target.value)}
                          className="w-full max-w-[220px] h-9 px-2 rounded-lg border border-black/[0.1] bg-white text-[12px] text-[#16141d] focus:outline-none focus:border-[#7c5cf0] disabled:opacity-50"
                        >
                          <option value="">Standard — {defaultModel}</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>{m.label} · ${m.in}/${m.out} per 1M</option>
                          ))}
                        </select>
                        {savingFeature === f.feature ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a5a3af] shrink-0" />
                        ) : ov ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.06em] rounded-full px-2 py-0.5 shrink-0" style={{ color: VIOLET, background: `${VIOLET}14` }}>Overstyrt</span>
                        ) : null}
                      </>
                    )}
                  </span>
                </div>
                {open && (
                  <div className="px-5 pb-4 pl-11">
                    {(f.models || []).length === 0 ? (
                      <p className="text-[12px] text-[#b8b6c0]">Ingen kall i perioden{ov ? ` — neste kall bruker ${ov}` : ''}</p>
                    ) : (
                      <div className="rounded-xl bg-[#fafafb] border border-black/[0.04] divide-y divide-black/[0.04]">
                        {f.models.map((m) => (
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
      </Card>

      {/* Eksterne tjenester + plattform */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-5" testid="usage-ext">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] mb-3">Eksterne tjenester <span className="normal-case tracking-normal text-[#c4c2cc]">· egen telling · estimat</span></p>
          <div className="divide-y divide-black/[0.04]">
            {(ext.services || []).map((s) => (
              <div key={s.service} data-testid={`usage-ext-${s.service}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#16141d]">{s.label}</span>
                  <span className="block text-[11px] text-[#a5a3af] truncate">{s.detail}</span>
                </span>
                <span className="ml-auto text-[11.5px] text-[#a5a3af] tabular-nums shrink-0">{nf0.format(s.units)} {s.unit}</span>
                <span className="text-[12.5px] font-semibold text-[#16141d] tabular-nums w-20 text-right shrink-0">{fmtNok(s.costNok)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 pt-3 border-t border-black/[0.05] text-[11px] text-[#b8b6c0]">Telles ved hvert fakturerbare kall fra og med i dag — historikk bygges opp over tid. Leverandørfakturaen er fasit.</p>
        </Card>

        <Card className="p-5" testid="usage-platform">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894]">Plattform-prosjektet (CRM)</p>
            {platform.status === 'ok' && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 bg-emerald-50" style={{ color: EMER_TEXT }} data-testid="usage-platform-status"><CheckCircle2 className="w-3 h-3" /> Tilkoblet</span>}
            {platform.status === 'waiting' && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 text-amber-700 bg-amber-50" data-testid="usage-platform-status"><Clock3 className="w-3 h-3" /> Venter på leveranse</span>}
            {(platform.status === 'error' || platform.status === 'invalid') && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 text-rose-700 bg-rose-50" data-testid="usage-platform-status"><AlertTriangle className="w-3 h-3" /> Får ikke kontakt</span>}
          </div>
          {platform.status === 'ok' ? (
            <div className="divide-y divide-black/[0.04]">
              {(platform.services || []).map((s) => (
                <div key={s.service} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[#16141d]">{s.label || s.service}</span>
                    <span className="block text-[11px] text-[#a5a3af]">{s.source === 'exact' ? 'eksakt fra leverandør' : 'estimat'}</span>
                  </span>
                  <span className="ml-auto text-[11.5px] text-[#a5a3af] tabular-nums shrink-0">{nf0.format(s.used || 0)} {s.unit || ''}</span>
                  <span className="text-[12.5px] font-semibold text-[#16141d] tabular-nums shrink-0">{s.cost != null ? `${nf2.format(s.cost)} ${s.currency || ''}` : '—'}</span>
                </div>
              ))}
              {(platform.services || []).length === 0 && <p className="text-[12.5px] text-[#b8b6c0] py-2">Ingen tjenester rapportert ennå</p>}
            </div>
          ) : (
            <div className="rounded-xl bg-[#fafafb] border border-dashed border-black/[0.08] p-4">
              <p className="text-[13px] text-[#514e5a] leading-relaxed">
                Plattformens kostnader (Twilio SMS, betaling, e-signering m.m.) hentes automatisk når de leverer <span className="font-mono text-[11.5px] bg-black/[0.04] rounded px-1.5 py-0.5">GET /api/usage/external</span>.
              </p>
              <p className="mt-2 text-[12px] text-[#8b8894] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" style={{ color: VIOLET }} />
                Bestilling sendt 5. juli · purring sendt via Agent-broen — panelet kobler seg til automatisk (sjekker hvert 10. min).
              </p>
            </div>
          )}
        </Card>
      </div>

      <p className="text-[11.5px] text-[#b0aeb8] flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        Alle beløp er estimater basert på listepriser (USD→NOK 11). Tekstmodell kan overstyres per funksjon — bildegenerering bruker alltid Nano Banana via Emergent-nøkkelen.
      </p>
    </div>
  );
}
