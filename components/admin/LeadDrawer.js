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

// Forvalterens svar til interessenten. Sendes via
// POST /api/property-interest/reply — samme endepunkt som DigiHome-plattformen
// bruker — så svaret ser identisk ut for interessenten uansett hvor forvalteren
// satt da hun svarte, og alt logges på leadet.
function InterestReply({ apiKey, leadId, interest, email, replies = [], onSent }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const unitId = interest.unitId || interest.propertyId || '';

  const send = async () => {
    if (!msg.trim() || busy) return;
    setBusy(true); setResult(null);
    try {
      const res = await fetch(`/api/property-interest/reply?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, unit_id: unitId, message: msg }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        setResult({ ok: true, sent: j.sent, skipped: j.skipped });
        setMsg(''); setOpen(false);
        if (onSent) onSent();
      } else {
        setResult({ ok: false, error: j.error || 'Kunne ikke sende svaret' });
      }
    } catch (e) {
      setResult({ ok: false, error: 'Nettverksfeil — prøv igjen' });
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-2 border-t border-[#f0ebf7] pt-2">
      {replies.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {replies.slice(-3).map((r) => (
            <div key={r.id} className="rounded-lg bg-[#f6fbf7] p-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7fae91]">
                Svar sendt {r.at ? new Date(r.at).toLocaleString('nb-NO') : ''}{r.sent ? '' : ' (ikke levert)'}
              </p>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-[12px] leading-relaxed text-[#4a4a4a]">{r.message}</p>
            </div>
          ))}
        </div>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} disabled={!email} data-testid={`interest-reply-open-${unitId}`}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#7A3EC8] hover:underline disabled:text-[#bbb] disabled:no-underline">
          <Send className="h-3 w-3" /> {email ? 'Svar til interessenten' : 'Ingen e-post å svare til'}
        </button>
      ) : (
        <div>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} autoFocus
            data-testid={`interest-reply-input-${unitId}`}
            placeholder={`Skriv svaret til ${email || 'interessenten'} …`}
            className="w-full resize-none rounded-lg border border-[#e7e0ee] bg-white p-2.5 text-[12.5px] leading-relaxed text-[#222] outline-none focus:border-[#7A3EC8]" />
          <div className="mt-1.5 flex items-center gap-2">
            <button type="button" onClick={send} disabled={busy || !msg.trim()} data-testid={`interest-reply-send-${unitId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-3.5 text-[11.5px] font-bold text-white disabled:opacity-40">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send svar
            </button>
            <button type="button" onClick={() => { setOpen(false); setMsg(''); }} className="text-[11.5px] font-semibold text-[#888]">Avbryt</button>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-[#a09aa8]">Svaret sendes som e-post fra DigiHome med boligen som kontekst. Interessenten kan svare direkte.</p>
        </div>
      )}
      {result && (
        <p className={`mt-1.5 text-[11px] font-semibold ${result.ok ? 'text-emerald-600' : 'text-rose-600'}`} data-testid={`interest-reply-result-${unitId}`}>
          {result.ok
            ? (result.sent ? 'Svaret er sendt på e-post.' : `Svaret er logget, men ikke sendt (${result.skipped || 'ukjent årsak'}).`)
            : result.error}
        </p>
      )}
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

  // `detail` overstyrer listeraden som før, men feeTruth beregnes i
  // listeendepunktet — behold den så «estimat vs. fasit» ikke forsvinner.
  const d = detail ? { ...detail, feeTruth: detail.feeTruth || lead?.feeTruth || null } : (lead || {});
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

  const updatePropertyInterest = async (propertyId, status) => {
    setActionBusy(`interest-${propertyId}`);
    try {
      const r = await fetch(`/api/admin/tenant-interest?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, type: d.pre_tracking ? 'imported' : 'tenant', propertyId, status }),
      });
      const j = await r.json();
      if (j.ok) { await load(); onChanged?.(); }
    } catch (e) { /* status kan forsøkes igjen uten datatap */ }
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
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa]">Forventet årshonorar</p>
                  <p className="text-[18px] font-bold text-emerald-600 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>{wonStr}</p>
                  <p className="text-[10.5px] text-[#aaa]">estimert leie ved signering</p>
                </div>
              )}
            </div>
            {/* Estimat vs. fasit: honoraret utløses av faktisk inngått leiekontrakt */}
            {d.feeTruth && (
              <div className="mt-3 rounded-xl border border-black/[0.06] bg-[#fafafa] p-3.5" data-testid="lead-fee-truth">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa]">Faktisk årshonorar</p>
                    <p className={`text-[18px] font-bold mt-1 ${d.feeTruth.actualAnnualFee > 0 ? 'text-emerald-600' : 'text-[#bbb]'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                      {d.feeTruth.actualAnnualFee > 0 ? `${Math.round(d.feeTruth.actualAnnualFee).toLocaleString('nb-NO')} kr` : '— ingen leiekontrakt ennå'}
                    </p>
                    <p className="text-[10.5px] text-[#aaa]">
                      {d.feeTruth.activeLeases > 0
                        ? `${d.feeTruth.activeLeases} aktiv leiekontrakt${d.feeTruth.activeLeases === 1 ? '' : 'er'} · ${Math.round(d.feeTruth.monthlyFeeActual).toLocaleString('nb-NO')} kr/mnd`
                        : (d.feeTruth.contractedAnnualFee > 0 ? `Kontrahert: ${Math.round(d.feeTruth.contractedAnnualFee).toLocaleString('nb-NO')} kr/år starter snart` : 'Boligen er ikke utleid ennå')}
                    </p>
                  </div>
                  {d.feeTruth.deltaPct != null && (
                    <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold tabular-nums ${Math.abs(d.feeTruth.deltaPct) <= 15 ? 'bg-emerald-50 text-emerald-700' : (d.feeTruth.deltaPct < 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700')}`}>
                      {d.feeTruth.deltaPct > 0 ? '+' : ''}{d.feeTruth.deltaPct} % vs. estimat
                    </span>
                  )}
                </div>
                {d.feeTruth.lifetimeFee > 0 && (
                  <p className="text-[11px] text-[#999] mt-2">Opptjent honorar til nå: {Math.round(d.feeTruth.lifetimeFee).toLocaleString('nb-NO')} kr</p>
                )}
              </div>
            )}
            {d.syncedFromPlatform && (
              <p className="text-[11.5px] text-[#999] mt-2.5 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Utfall styres av plattformen{d.statusUpdatedAt ? ` · oppdatert ${fmtTime(d.statusUpdatedAt)}` : ''}</p>
            )}
          </div>


          {isTenant && Array.isArray(d.property_interests) && d.property_interests.length > 0 ? (
            <div className="rounded-2xl border border-[#eadff5] bg-[#faf7fe] p-4" data-testid="tenant-property-interests">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b5cf6]">Interessert i</p><p className="mt-1 text-[12px] text-[#777]">Boligsiden og nyhetsbrev</p></div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#7A3EC8]">{d.property_interests.length}</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {[...d.property_interests].reverse().map((interest) => (
                  <div key={`${interest.propertyId}-${interest.at}`} className="rounded-xl border border-[#ece6f3] bg-white p-3">
                    {/* propertyTitle/propertyAddress er den kanoniske formen. De
                        gamle feltnavnene (title/area) leses fortsatt, slik at
                        interesser lagret før feltene ble samkjørt ikke vises som
                        en rå ID. */}
                    <p className="text-[13px] font-bold text-[#222]">{interest.propertyAddress || interest.propertyTitle || interest.title || interest.propertyId}</p>
                    <p className="mt-0.5 text-[11px] text-[#999]">
                      {interest.propertyTitle && interest.propertyAddress ? `${interest.propertyTitle} · ` : ''}
                      {interest.propertyDistrict || interest.propertyArea || interest.area || 'Område ikke oppgitt'}
                      {interest.at ? ` · ${new Date(interest.at).toLocaleString('nb-NO')}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {interest.scopeLabel ? (
                        <span className="rounded-full bg-[#f3ecfd] px-2 py-[3px] text-[10.5px] font-bold text-[#6d28d9]" data-testid="interest-scope-label">{interest.scopeLabel}</span>
                      ) : null}
                      {interest.unitId ? <span className="rounded-full bg-[#f5f5f5] px-2 py-[3px] text-[10.5px] font-semibold text-[#888]">Enhet {String(interest.unitId).slice(0, 8)}</span> : null}
                      {interest.propertyUrl ? (
                        <a href={interest.propertyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#7A3EC8] hover:underline">Se boligen <ExternalLink className="h-3 w-3" /></a>
                      ) : null}
                    </div>
                    {interest.message ? (
                      <div className="mt-2 rounded-lg bg-[#fbf9fd] p-2.5" data-testid="interest-message">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b0a8bb]">Melding</p>
                        <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-[#444]">{interest.message}</p>
                      </div>
                    ) : null}
                    <select value={interest.status || 'interested'} onChange={(e) => updatePropertyInterest(interest.propertyId, e.target.value)} disabled={actionBusy === `interest-${interest.propertyId}`}
                      data-testid={`tenant-interest-status-${interest.propertyId}`}
                      className="mt-2 h-8 w-full rounded-lg border border-[#e7e0ee] bg-[#faf8fc] px-2.5 text-[11.5px] font-semibold text-[#5e4677] outline-none disabled:opacity-50">
                      <option value="interested">Interessert</option><option value="contacted">Kontaktet</option><option value="viewing">Visning</option><option value="matched">Matchet</option><option value="declined">Avslått</option>
                    </select>
                    <InterestReply apiKey={apiKey} leadId={d.id} interest={interest} email={d.email}
                      replies={(Array.isArray(d.interest_replies) ? d.interest_replies : []).filter((r) => String(r.unitId || '') === String(interest.unitId || interest.propertyId || ''))}
                      onSent={load} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
