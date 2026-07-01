'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, X, Crosshair, ShieldCheck, CheckCircle2, AlertCircle, Sparkles,
  Target, Ban, Wallet, Link2 as LinkIcon, Info, Play,
} from 'lucide-react';

const toLines = (arr) => (arr || []).join('\n');
const fromLines = (txt) => String(txt || '').split('\n').map((s) => s.trim()).filter(Boolean);

export default function CompetitorCampaign({ apiKey, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [existing, setExisting] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');           // 'validate' | 'create'
  const [result, setResult] = useState(null);      // { ok, validateOnly, campaignId, note, duplicate, message }
  const [form, setForm] = useState({
    competitor: 'Utleiemegleren', name: '', dailyBudget: 150, finalUrl: '',
    geoLabel: 'Norge', geoTargetConstantIds: ['2578'], path1: 'forvaltning', path2: 'bergen',
    keywordsText: '', negativesText: '', headlines: [], descriptions: [],
  });

  const loadTemplate = useCallback(async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const res = await fetch(`/api/admin/ads/competitor-campaign/template?key=${encodeURIComponent(apiKey)}`);
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Kunne ikke laste mal'); }
      else {
        setConfigured(!!j.configured);
        setExisting(j.existing || null);
        const t = j.template || {};
        setForm({
          competitor: t.competitor || 'Utleiemegleren',
          name: t.name || '', dailyBudget: t.dailyBudget || 150, finalUrl: t.finalUrl || '',
          geoLabel: t.geoLabel || 'Norge', geoTargetConstantIds: t.geoTargetConstantIds || ['2578'],
          path1: t.path1 || '', path2: t.path2 || '',
          keywordsText: toLines(t.keywords), negativesText: toLines(t.negatives),
          headlines: t.headlines || [], descriptions: t.descriptions || [],
        });
      }
    } catch (e) { setErr('Kunne ikke laste mal'); }
    finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { if (open && apiKey) loadTemplate(); }, [open, apiKey, loadTemplate]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = async (validateOnly) => {
    setBusy(validateOnly ? 'validate' : 'create'); setErr(''); setResult(null);
    try {
      const payload = {
        name: form.name, dailyBudget: Number(form.dailyBudget), finalUrl: form.finalUrl,
        geoTargetConstantIds: form.geoTargetConstantIds, path1: form.path1, path2: form.path2,
        keywords: fromLines(form.keywordsText), negatives: fromLines(form.negativesText),
        headlines: form.headlines, descriptions: form.descriptions,
        validateOnly,
      };
      const res = await fetch(`/api/admin/ads/competitor-campaign?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const j = await res.json();
      setResult(j);
      if (j && j.ok === false && j.error) setErr(j.error);
      if (!validateOnly && j && (j.ok !== false)) { setExisting({ id: j.campaignId, name: form.name }); }
    } catch (e) { setErr('Noe gikk galt. Prøv igjen.'); }
    finally { setBusy(''); }
  };

  if (!open) return null;
  const kwCount = fromLines(form.keywordsText).length;
  const negCount = fromLines(form.negativesText).length;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 py-[6vh] overflow-y-auto">
      <div className="absolute inset-0 bg-[#0a0a0a]/45 backdrop-blur-[2px] dh-fade" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] overflow-hidden dh-scale-in">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 bg-[#0a0a0a] text-white">
          <button onClick={onClose} className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#8b5cf6] flex items-center justify-center shadow-[0_10px_30px_rgba(139,92,246,0.5)]"><Crosshair className="w-6 h-6 text-white" /></div>
            <div>
              <h3 className="text-[19px] font-bold leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Konkurrent-kampanje</h3>
              <p className="text-[12.5px] text-white/60 mt-0.5">Søk-kampanje som fanger søk etter <b className="text-white/90">{form.competitor}</b></p>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-[62vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-[#999]"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              {!configured && (
                <div className="mb-4 bg-amber-50 text-amber-700 rounded-xl px-4 py-3 text-[13px] flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> Google Ads-API er ikke konfigurert. Du kan redigere og validere, men ikke opprette kampanjen ennå.</div>
              )}

              {/* PAUSE-forsikring */}
              <div className="mb-5 bg-[#f4f0fb] rounded-2xl px-4 py-3 flex items-start gap-2.5">
                <ShieldCheck className="w-4.5 h-4.5 text-[#8b5cf6] mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-[#5b4a75] leading-relaxed">Kampanjen opprettes <b>på pause</b> — den bruker <b>ingen penger</b> før du aktiverer den i Google Ads. Vi byr på konkurrentens navn som <i>søkeord</i>, men bruker det ikke i annonseteksten (Google-policy).</p>
              </div>

              {existing && (
                <div className="mb-4 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Kampanjen finnes allerede i kontoen (ID {existing.id}). Styr den under «Kampanjestyring».</div>
              )}

              {/* Grunnfelt */}
              <div className="space-y-4">
                <Field label="Kampanjenavn">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dagsbudsjett (NOK)" icon={Wallet}>
                    <input type="number" min="1" value={form.dailyBudget} onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Geografi" icon={Target}>
                    <input value={form.geoLabel} disabled className={`${inputCls} bg-[#f6f5f3] text-[#888]`} />
                  </Field>
                </div>
                <Field label="Landingsside (final URL)" icon={LinkIcon}>
                  <input value={form.finalUrl} onChange={(e) => setForm({ ...form, finalUrl: e.target.value })} className={`${inputCls} font-mono text-[12.5px]`} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={`Søkeord (${kwCount}) — ett per linje`} icon={Target}>
                    <textarea value={form.keywordsText} onChange={(e) => setForm({ ...form, keywordsText: e.target.value })} rows={5} className={`${inputCls} resize-none leading-relaxed`} />
                  </Field>
                  <Field label={`Negative søkeord (${negCount})`} icon={Ban}>
                    <textarea value={form.negativesText} onChange={(e) => setForm({ ...form, negativesText: e.target.value })} rows={5} className={`${inputCls} resize-none leading-relaxed`} />
                  </Field>
                </div>

                {/* Annonsetekst-forhåndsvisning */}
                <div className="rounded-2xl bg-[#f8f7f5] p-4">
                  <p className="text-[11px] uppercase tracking-[0.06em] text-[#a3a3a3] font-semibold flex items-center gap-1.5 mb-2.5"><Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" /> Responsiv søkeannonse</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {form.headlines.map((h, i) => <span key={i} className="text-[11.5px] bg-white text-[#333] rounded-lg px-2.5 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">{h}</span>)}
                  </div>
                  <div className="space-y-1.5">
                    {form.descriptions.map((d, i) => <p key={i} className="text-[12px] text-[#666] leading-snug">· {d}</p>)}
                  </div>
                </div>
              </div>

              {/* Resultat */}
              {result && (
                <div className={`mt-5 rounded-2xl px-4 py-3.5 text-[13px] flex items-start gap-2.5 ${result.ok === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {result.ok === false ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div>
                    {result.ok === false ? (
                      <p>{result.message || err || 'Kunne ikke fullføre.'}</p>
                    ) : result.validateOnly ? (
                      <p><b>Validering OK.</b> Alt er gyldig — ingenting er opprettet ennå. Trykk «Opprett kampanje» for å legge den inn (på pause).</p>
                    ) : (
                      <p><b>Kampanjen er opprettet på pause.</b> {result.keywordsAdded || 0} søkeord{result.negativesAdded ? `, ${result.negativesAdded} negative` : ''}. {result.campaignId ? `Kampanje-ID ${result.campaignId}.` : ''} Aktiver den under «Kampanjestyring» når du er klar.</p>
                    )}
                  </div>
                </div>
              )}
              {err && !result && <div className="mt-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}
            </>
          )}
        </div>

        {/* Footer-handlinger */}
        <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-between gap-3 bg-white">
          <p className="text-[11.5px] text-[#aaa] flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Alltid PAUSED ved oppretting</p>
          <div className="flex items-center gap-2">
            <button onClick={() => submit(true)} disabled={!!busy || loading} className="h-10 px-4 rounded-full bg-white text-[#0a0a0a] text-[12.5px] font-semibold flex items-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06] hover:ring-black/[0.14] disabled:opacity-40 active:scale-[0.97] transition-all">
              {busy === 'validate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Tørrkjør
            </button>
            <button onClick={() => submit(false)} disabled={!!busy || loading || !configured} title={!configured ? 'Google Ads-API er ikke konfigurert' : ''} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">
              {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Opprett kampanje
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-black/[0.08] bg-white outline-none text-[13.5px] text-[#1f1f1f] focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] transition-all';

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="text-[11.5px] uppercase tracking-[0.05em] text-[#a3a3a3] font-semibold flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#c9b8e4]" />} {label}
      </span>
      {children}
    </label>
  );
}
