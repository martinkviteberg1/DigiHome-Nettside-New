'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Loader2, Mail, Phone, MapPin, Home, Ruler, BedDouble, Hash, Building2,
  Sparkles, Eye, Search, FileEdit, Send, MousePointerClick, ExternalLink,
  CheckCircle2, Clock, Route, Target, ShieldCheck, Zap, BadgeCheck, History,
  Archive, Trash2, RefreshCw, Undo2, AlertTriangle,
} from 'lucide-react';

const STATUS_OPTS = [
  { v: 'new', l: 'Ny' }, { v: 'contacted', l: 'Kontaktet' }, { v: 'qualified', l: 'Kvalifisert' },
  { v: 'viewing', l: 'Befaring' }, { v: 'offer', l: 'Tilbud sendt' },
  { v: 'won', l: 'Vunnet' }, { v: 'lost', l: 'Tapt' }, { v: 'disqualified', l: 'Diskvalifisert' },
];
// Samme fulle CRM-pipeline for alle leads — historiske og nye.
const IMPORTED_STATUS_OPTS = STATUS_OPTS;
const STATUS_COLOR = {
  new: 'text-[#555] bg-[#f3f3f3]', contacted: 'text-sky-600 bg-sky-50',
  qualified: 'text-violet-600 bg-violet-50', viewing: 'text-blue-600 bg-blue-50',
  offer: 'text-indigo-600 bg-indigo-50', won: 'text-emerald-600 bg-emerald-50', lost: 'text-rose-600 bg-rose-50',
  disqualified: 'text-slate-600 bg-slate-100',
};

// Hendelsestype → norsk etikett + ikon (kundereise)
const EVENT_META = {
  pageview: { l: 'Så på side', icon: Eye, c: 'text-slate-500 bg-slate-100' },
  address_search: { l: 'Søkte adresse', icon: Search, c: 'text-sky-600 bg-sky-50' },
  form_start: { l: 'Startet skjema', icon: FileEdit, c: 'text-violet-600 bg-violet-50' },
  form_step: { l: 'Fylte skjemasteg', icon: FileEdit, c: 'text-violet-600 bg-violet-50' },
  form_input_mode: { l: 'Valgte inngang', icon: Route, c: 'text-amber-600 bg-amber-50' },
  lead_submit: { l: 'Sendte inn lead', icon: Send, c: 'text-emerald-600 bg-emerald-50' },
  cta_click: { l: 'Klikket CTA', icon: MousePointerClick, c: 'text-fuchsia-600 bg-fuchsia-50' },
  outbound: { l: 'Gikk til ekstern lenke', icon: ExternalLink, c: 'text-slate-500 bg-slate-100' },
};

function fmtTime(ts) {
  try { return new Date(ts).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return ''; }
}
function fmtMoney(v, cur) {
  if (v == null || v === '') return null;
  try { return new Intl.NumberFormat('nb-NO').format(Number(v)) + ' ' + (cur || 'kr'); } catch (e) { return String(v); }
}

function Field({ icon: Icon, label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-[#b39ddb] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa] leading-none">{label}</p>
        <p className="text-[13.5px] text-[#1f1f1f] mt-1 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function LeadDrawer({ apiKey, lead, type, onClose, onStatusChange, statusBusy, scoreData, onScore, scoring, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(null); // 'resend' | 'archive' | 'delete' | 'restore'
  const [resendResult, setResendResult] = useState(null);
  const isTenant = type === 'tenant';
  const isContact = type === 'contact';

  const load = useCallback(async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lead?id=${encodeURIComponent(lead.id)}&type=${isTenant ? 'tenant' : 'lead'}&key=${encodeURIComponent(apiKey)}`);
      const j = await res.json();
      if (j.ok) { setDetail(j.lead); setTimeline((j.timeline || []).filter((e) => e.type !== 'web_vital')); }
    } catch (e) {} finally { setLoading(false); }
  }, [lead, isTenant, apiKey]);

  useEffect(() => { load(); }, [load]);
  // ESC for å lukke
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const d = detail || lead || {};
  const att = d.attribution || {};
  const status = d.status || 'new';
  const wonStr = fmtMoney(d.wonValue, d.wonCurrency);

  // Kolleksjonstype for arkiver/slett (historiske ligger i egen samling)
  const recType = isTenant ? 'tenant' : (d.pre_tracking ? 'imported' : 'lead');

  const doResend = async () => {
    setActionBusy('resend'); setResendResult(null);
    try {
      const r = await fetch(`/api/admin/leads/resend?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, type: isTenant ? 'tenant' : 'lead' }),
      });
      const j = await r.json();
      setResendResult(j.ok && j.forwarded ? { ok: true } : { ok: false, error: j.error || 'Levering feilet' });
      if (j.ok) { await load(); onChanged?.(); }
    } catch (e) { setResendResult({ ok: false, error: e.message }); }
    setActionBusy(null);
  };

  const doArchive = async (undo) => {
    if (!undo && !confirm(`Arkivere ${d.name || d.email || 'denne leaden'}?\n\nLeaden skjules fra pipeline, eksport og statistikk — men sporet beholdes og den kan gjenopprettes.`)) return;
    setActionBusy(undo ? 'restore' : 'archive');
    try {
      const r = await fetch(`/api/admin/leads/archive?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, type: recType, undo: !!undo }),
      });
      const j = await r.json();
      if (j.ok) {
        onChanged?.();
        if (undo) await load(); else onClose();
      }
    } catch (e) {}
    setActionBusy(null);
  };

  const doHardDelete = async () => {
    const svar = prompt(`SLETT PERMANENT — kun for testdata/GDPR.\n\n«${d.name || d.email || d.id}» fjernes for alltid, inkludert attribusjon og historikk.\n\nSkriv SLETT for å bekrefte:`);
    if (svar !== 'SLETT') return;
    setActionBusy('delete');
    try {
      const r = await fetch(`/api/admin/leads/delete?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, type: recType, confirm: 'SLETT' }),
      });
      const j = await r.json();
      if (j.ok) { onChanged?.(); onClose(); }
    } catch (e) {}
    setActionBusy(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-[fadeIn_.2s_ease]" onClick={onClose} />
      {/* Panel */}
      <div className="relative w-full max-w-[480px] h-full bg-[#fbfbfd] shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.4)] overflow-y-auto animate-[slideInRight_.32s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-[#f0f0f0] px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b39ddb]">{isTenant ? 'Leietaker' : isContact ? 'Kontakt' : 'Utleier'}</span>
              {d.pre_tracking && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8b5cf6] bg-[#f4f0fb] rounded-full px-1.5 py-0.5" title="Kom inn før sporingen — teller i helhetsbildet, aldri i live ROAS/CAC"><History className="w-3 h-3" /> Historisk</span>
              )}
              {d.self_service && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5" title="Selvforvaltning — avtale akseptert digitalt i skjemaet, hoppet rett til Kunde">Selvbetjent</span>
              )}
              {d.newsletter_source && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7A3EC8] bg-[#f6f0fe] rounded-full px-1.5 py-0.5 max-w-[200px]"
                  title={`${d.newsletter_source.via === 'landing' ? 'Kom via kampanje-lenke i nyhetsbrevet' : 'E-postadressen gjenkjent fra nyhetsbrevets mottakerliste'}${d.newsletter_source.at ? ' · ' + new Date(d.newsletter_source.at).toLocaleDateString('nb-NO') : ''}`}>
                  <span className="truncate">Nyhetsbrev · {d.newsletter_source.campaign || d.newsletter_source.campaignId}</span>
                </span>
              )}
              {d.self_service ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5"><BadgeCheck className="w-3 h-3" /> Konto provisjonert</span>
              ) : d.forwarded === true && d.platform_id ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5" title={`Verifisert CRM-ID: ${d.platform_id}`}><BadgeCheck className="w-3 h-3" /> CRM verifisert</span>
              ) : d.forwarded === true ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5" title="Tidligere markert sendt, men mangler platform_id — bør sendes på nytt"><AlertTriangle className="w-3 h-3" /> Ubekreftet levering</span>
              ) : null}
              {d.syncedFromPlatform && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5"><BadgeCheck className="w-3 h-3" /> Status synket{d.platformTenant ? ` · ${d.platformTenant}` : ''}</span>
              )}
            </div>
            <h3 className="text-[20px] font-bold text-[#0a0a0a] leading-tight truncate" style={{ fontFamily: 'var(--font-heading)' }}>{d.name || '—'}</h3>
          </div>
          <button onClick={onClose} aria-label="Lukk" className="shrink-0 w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e8e8e8] flex items-center justify-center text-[#666] transition-colors"><X className="w-4.5 h-4.5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + verdi */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa]">Status</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <select
                    value={status} disabled={statusBusy === d.id}
                    onChange={(e) => onStatusChange(d.id, e.target.value, isTenant ? 'tenant' : 'lead')}
                    className={`text-[13px] font-semibold rounded-lg border-0 px-2.5 py-1.5 outline-none ${STATUS_COLOR[status] || STATUS_COLOR.new}`}
                  >
                    {(d.pre_tracking ? IMPORTED_STATUS_OPTS : STATUS_OPTS).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                  {statusBusy === d.id && <Loader2 className="w-4 h-4 animate-spin text-[#bbb]" />}
                </div>
              </div>
              {wonStr && (
                <div className="text-right">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa]">Kontraktsverdi</p>
                  <p className="text-[18px] font-bold text-emerald-600 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>{wonStr}</p>
                </div>
              )}
            </div>
            {d.syncedFromPlatform && (
              <p className="text-[11.5px] text-[#999] mt-2.5 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Utfall styres av plattformen{d.statusUpdatedAt ? ` · oppdatert ${fmtTime(d.statusUpdatedAt)}` : ''}</p>
            )}
          </div>

          {/* Kontakt */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f]">Kontakt</p>
            {d.email && <a href={`mailto:${d.email}`} className="flex items-center gap-2.5 group"><Mail className="w-4 h-4 text-[#b39ddb] shrink-0" /><span className="text-[13.5px] text-[#1f1f1f] group-hover:text-[#7c3aed] break-all">{d.email}</span></a>}
            {d.phone && <a href={`tel:${d.phone}`} className="flex items-center gap-2.5 group"><Phone className="w-4 h-4 text-[#b39ddb] shrink-0" /><span className="text-[13.5px] text-[#1f1f1f] group-hover:text-[#7c3aed]">{d.phone}</span></a>}
            {!d.email && !d.phone && <p className="text-[13px] text-[#aaa]">Ingen kontaktinfo</p>}
          </div>

          {/* Eiendom / Ønsker */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] grid grid-cols-2 gap-x-4 gap-y-3.5">
            <p className="col-span-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f]">{isTenant ? 'Ønsker' : 'Eiendom'}</p>
            {isTenant ? (
              <>
                <Field icon={MapPin} label="Område" value={d.preferred_area} />
                <Field icon={Home} label="Budsjett" value={fmtMoney(d.budget_max)} />
                <Field icon={BedDouble} label="Soverom" value={d.bedrooms} />
                <Field icon={Clock} label="Innflytting" value={d.move_in_date} />
              </>
            ) : (
              <>
                <Field icon={MapPin} label="Adresse" value={[d.address, d.postal_code].filter(Boolean).join(', ')} />
                <Field icon={Home} label="Boligtype" value={d.property_type} />
                <Field icon={Ruler} label="Areal" value={d.sqm ? `${d.sqm} m²` : null} />
                <Field icon={BedDouble} label="Soverom" value={d.bedrooms} />
                <Field icon={Hash} label="Matrikkel" value={d.matrikkel_number} />
                <Field icon={Building2} label="Seksjon/andel" value={d.seksjonsnr || d.andelsnr} />
                <div className="col-span-2"><Field icon={ShieldCheck} label="Hjemmelshaver (Eiendomsregisteret)" value={d.registry_owner_name} /></div>
                {d.num_properties > 1 && <Field icon={Home} label="Antall enheter" value={d.num_properties} />}
              </>
            )}
          </div>

          {/* Attribusjon */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f] mb-3">Attribusjon</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {att.channel && <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8b5cf6] bg-[#f4f0fb] rounded-full px-2.5 py-1"><Target className="w-3 h-3" />{att.channel}</span>}
              {!att.channel && d.pre_tracking && d.channel && d.channel !== 'unknown' && <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8b5cf6] bg-[#f4f0fb] rounded-full px-2.5 py-1"><Target className="w-3 h-3" />{d.channel} (manuelt satt)</span>}
              {att.source && <span className="text-[12px] text-[#666] bg-[#f5f5f5] rounded-full px-2.5 py-1">{att.source}{att.medium ? ` / ${att.medium}` : ''}</span>}
              {att.campaign && <span className="text-[12px] text-[#666] bg-[#f5f5f5] rounded-full px-2.5 py-1">{att.campaign}</span>}
            </div>
            {att.gclid && <p className="text-[11px] text-[#999] flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> gclid: <code className="text-[#666] break-all">{att.gclid}</code></p>}
            {!att.channel && !att.source && !att.gclid && !(d.pre_tracking && d.channel && d.channel !== 'unknown') && <p className="text-[13px] text-[#aaa]">{d.pre_tracking ? 'Kilde ukjent — kan settes manuelt i lead-oversikten eller Historikk-fanen.' : 'Ingen attribusjonsdata'}</p>}
          </div>

          {/* Kundereise / tidslinje */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f] mb-4 flex items-center gap-1.5"><Route className="w-3.5 h-3.5 text-[#b39ddb]" /> Kundereise</p>
            {loading ? (
              <div className="flex items-center gap-2 text-[13px] text-[#aaa] py-4"><Loader2 className="w-4 h-4 animate-spin" /> Henter reisen …</div>
            ) : timeline.length === 0 ? (
              <p className="text-[13px] text-[#aaa] py-2">{d.pre_tracking ? 'Historisk lead — kom inn før sporingen ble aktivert, så ingen kundereise er registrert.' : 'Ingen sporingshendelser knyttet til denne kontakten (kan skyldes manglende samtykke eller direkte registrering).'}</p>
            ) : (
              <ol className="relative border-l-2 border-[#f0ecf8] ml-1.5 space-y-4">
                {timeline.map((e, i) => {
                  const m = EVENT_META[e.type] || { l: e.type, icon: Eye, c: 'text-slate-500 bg-slate-100' };
                  const Icon = m.icon;
                  const stepInfo = e.meta && (e.meta.step || e.meta.mode || e.meta.label);
                  return (
                    <li key={i} className="ml-5 relative">
                      <span className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center ${m.c}`}><Icon className="w-3.5 h-3.5" /></span>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[#1f1f1f]">{m.l}{stepInfo ? <span className="font-normal text-[#999]"> · {stepInfo}</span> : ''}</p>
                        <span className="text-[11px] text-[#bbb] shrink-0 whitespace-nowrap">{fmtTime(e.ts)}</span>
                      </div>
                      {e.path && <p className="text-[11.5px] text-[#999] mt-0.5 truncate">{e.path}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* AI-vurdering (ikke for historiske — mangler sporings-/skjemadata) */}
          {!d.pre_tracking && (
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f]">AI-vurdering</p>
              <button onClick={() => onScore(d.id, isTenant ? 'tenant' : 'lead')} disabled={scoring === d.id} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold text-[#8b5cf6] bg-[#f4f0fb] hover:bg-[#ece2fb] disabled:opacity-40 transition-colors">
                {scoring === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Vurder
              </button>
            </div>
            {scoreData && !scoreData.error && (
              <div className="flex items-start gap-3 mt-3">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#1f1f1f] text-white flex flex-col items-center justify-center"><span className="text-[16px] font-bold leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{scoreData.score}</span><span className="text-[8px] text-white/50">/100</span></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1f1f1f]">{scoreData.label}</p>
                  <p className="text-[12.5px] text-[#555] mt-0.5">{scoreData.reasoning}</p>
                  {scoreData.nextAction && <p className="text-[12px] text-[#8b5cf6] mt-1.5"><b>Neste steg:</b> {scoreData.nextAction}</p>}
                </div>
              </div>
            )}
            {scoreData && scoreData.error && <p className="text-[12.5px] text-rose-500 mt-2">AI-scoring feilet: {scoreData.error}</p>}
          </div>
          )}

          {/* Handlinger: re-send til CRM, arkiver (soft delete), slett permanent */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" data-testid="lead-actions">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f] mb-3">Handlinger</p>
            {d.deleted ? (
              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <span className="text-[12.5px] text-amber-700 font-medium flex items-center gap-1.5"><Archive className="w-3.5 h-3.5" /> Arkivert {d.deletedAt ? fmtTime(d.deletedAt) : ''}</span>
                <button onClick={() => doArchive(true)} disabled={!!actionBusy} data-testid="lead-restore-btn"
                  className="h-8 px-3 rounded-full text-[12px] font-semibold text-amber-700 bg-white border border-amber-200 hover:bg-amber-100 disabled:opacity-40 flex items-center gap-1.5">
                  {actionBusy === 'restore' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Gjenopprett
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {!d.mirrored && !d.pre_tracking && (
                  <button onClick={doResend} disabled={!!actionBusy} data-testid="lead-resend-btn"
                    title="Leverer leaden til CRM-plattformen på nytt (for leads som er mistet der)"
                    className="h-9 px-3.5 rounded-full text-[12.5px] font-semibold text-[#8b5cf6] bg-[#f4f0fb] hover:bg-[#ece2fb] disabled:opacity-40 flex items-center gap-1.5 transition-colors">
                    {actionBusy === 'resend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Send til CRM på nytt
                  </button>
                )}
                <button onClick={() => doArchive(false)} disabled={!!actionBusy} data-testid="lead-archive-btn"
                  title="Skjules fra pipeline/eksport/statistikk — sporet beholdes og kan gjenopprettes"
                  className="h-9 px-3.5 rounded-full text-[12.5px] font-semibold text-[#666] bg-[#f4f4f2] hover:bg-[#ebebe8] disabled:opacity-40 flex items-center gap-1.5 transition-colors">
                  {actionBusy === 'archive' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />} Arkiver
                </button>
                <button onClick={doHardDelete} disabled={!!actionBusy} data-testid="lead-delete-btn"
                  title="Kun for testdata/GDPR — fjernes for alltid"
                  className="h-9 px-3.5 rounded-full text-[12.5px] font-semibold text-rose-500 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 flex items-center gap-1.5 transition-colors ml-auto">
                  {actionBusy === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Slett permanent
                </button>
              </div>
            )}
            {resendResult && (
              <p className={`text-[12px] mt-2.5 flex items-center gap-1.5 font-medium ${resendResult.ok ? 'text-emerald-600' : 'text-rose-500'}`} data-testid="lead-resend-result">
                {resendResult.ok ? <><CheckCircle2 className="w-3.5 h-3.5" /> Levert til CRM-et ✓</> : <><AlertTriangle className="w-3.5 h-3.5" /> {resendResult.error}</>}
              </p>
            )}
            {!d.deleted && (d.mirrored || d.pre_tracking) && (
              <p className="text-[11px] text-[#bbb] mt-2.5">Denne leaden {d.mirrored ? 'kommer fra CRM-et (speil)' : 'er historisk (finnes allerede i CRM-et)'} — re-send er derfor ikke aktuelt.</p>
            )}
          </div>

          <p className="text-[11px] text-[#bbb] text-center pt-1">Mottatt {d.createdAt ? fmtTime(d.createdAt) : '—'}</p>
        </div>
      </div>
    </div>
  );
}
