'use client';

/**
 * MØTER — styremøter, ledermøter og andre interne møter.
 *
 * Filosofi: dette er IKKE en kalender. Modulen eier *innholdet* i møtet:
 * agenda, referat, vedtak — og det viktigste: aksjonspunkter som blir
 * saker på sakstavlen med ansvarlig og frist (koblet tilbake til møtet).
 *
 * Gjenbruker sakssystemets designspråk: Meny-popovers, hairline-felter,
 * samme skuff-/modalmønster.
 *
 * Tilgang: admin ser og redigerer alt. Rollen «bruker» har LESETILGANG til
 * møter de deltar i eller møtetyper de har fått tilgang til (moteTilgang,
 * satt per person under Personer). Filtreres og håndheves server-side —
 * her styrer kanRedigere kun hva som vises som redigerbart.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus, X, Loader2, Users, Trash2, CalendarDays, Clock, Check,
  ChevronDown, Repeat, CheckCircle2, Circle, Gavel, ClipboardCheck,
  Mail, AlertTriangle, User, ArrowRight, FileText, RotateCcw, ArrowUpRight, Archive, Eye,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };

// Sakstatus-metadata for koblede aksjonspunkter (speiler sakstavlens statuser)
const SAK_STATUS = {
  inbox: { l: 'Innboks', farge: '#6b7280', bg: '#f3f4f6' },
  doing: { l: 'Pågår', farge: '#8b5cf6', bg: '#f4f0fb' },
  waiting: { l: 'Venter', farge: '#b45309', bg: '#fef3c7' },
  done: { l: 'Ferdig', farge: '#059669', bg: '#d1fae5' },
};

const MOTE_TYPER = [
  { k: 'styremote', l: 'Styremøte', farge: '#8b5cf6', bg: '#f4f0fb' },
  { k: 'ledermote', l: 'Ledermøte', farge: '#0e7490', bg: '#ecfeff' },
  { k: 'annet', l: 'Annet møte', farge: '#6b7280', bg: '#f3f4f6' },
];
const REC_VALG = [
  { k: '', l: 'Gjentar ikke' },
  { k: 'weekly', l: 'Ukentlig' },
  { k: 'monthly', l: 'Månedlig' },
  { k: 'quarterly', l: 'Kvartalsvis' },
];

const moteType = (k) => MOTE_TYPER.find((t) => t.k === k) || MOTE_TYPER[2];

function fmtMoteDato(iso) {
  if (!iso) return 'Dato ikke satt';
  try {
    const d = new Date(iso);
    const s = d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
    const kl = d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    return `${s.charAt(0).toUpperCase()}${s.slice(1)} · kl. ${kl}`;
  } catch (e) { return iso; }
}

function fmtKort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) { return iso; }
}

/* ───────── Gjenbrukte primitiver (samme språk som Saker) ───────── */

function Avatar({ member, size = 24 }) {
  if (!member) return null;
  const init = member.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      title={member.name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: member.color || '#8B5CF6', fontSize: size * 0.4 }}
    >
      {init}
    </span>
  );
}

function Meny({ value, options, onChange, placeholder, compact, testid, className = '', menyBredde = 200, oppover }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey, true); };
  }, [open]);
  const valgt = options.find((o) => String(o.v) === String(value ?? ''));
  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button" onClick={() => setOpen((o) => !o)} data-testid={testid}
        className={`flex w-full items-center gap-1.5 rounded-lg border bg-white text-left transition-all ${
          open ? 'border-[#8b5cf6]/50 ring-2 ring-[#8b5cf6]/15' : 'border-black/[0.08] hover:border-black/[0.16]'
        } ${compact ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3 text-[13px]'}`}
      >
        {valgt && valgt.dot && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: valgt.dot }} />}
        {valgt && valgt.avatar && <Avatar member={valgt.avatar} size={18} />}
        <span className={`min-w-0 flex-1 truncate font-medium ${valgt ? 'text-[#333]' : 'text-[#aaa]'}`}>{valgt ? valgt.l : placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#b5b5b5] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`dh-fade absolute left-0 z-[130] max-h-[260px] overflow-y-auto rounded-xl border border-black/[0.07] bg-white p-1 shadow-[0_16px_48px_rgba(0,0,0,0.16)] ${oppover ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          style={{ minWidth: Math.max(menyBredde, 150) }}
        >
          {options.map((o) => {
            const aktiv = String(o.v) === String(value ?? '');
            return (
              <button
                key={String(o.v)} type="button"
                onClick={() => { onChange(o.v); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${aktiv ? 'bg-[#f4f0fb] text-[#1a1a1a]' : 'text-[#444] hover:bg-[#f7f6f4]'}`}
              >
                {o.dot && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: o.dot }} />}
                {o.avatar && <Avatar member={o.avatar} size={20} />}
                <span className="min-w-0 flex-1 truncate font-medium">{o.l}</span>
                {aktiv && <Check className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Overlegg({ onClose, children, variant = 'sheet', testid }) {
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const ytre = variant === 'panel'
    ? 'fixed inset-0 z-[110] flex items-end justify-center md:items-stretch md:justify-end'
    : 'fixed inset-0 z-[110] flex items-end justify-center md:items-start md:px-4 md:pt-[12vh]';
  const indre = variant === 'panel'
    ? 'relative flex h-[93dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:h-full md:max-w-[500px] md:rounded-none md:shadow-[-16px_0_48px_rgba(0,0,0,0.14)]'
    : 'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:max-h-[82vh] md:max-w-xl md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.28)]';
  return (
    <div className={ytre}>
      <div className="absolute inset-0 bg-[#0a0a0a]/35 backdrop-blur-[2px] dh-fade" onClick={onClose} />
      <div className={indre} data-testid={testid}>
        <div className="flex shrink-0 justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>
        {children}
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const t = moteType(type);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ color: t.farge, background: t.bg }}>
      <Gavel className="h-3 w-3" /> {t.l}
    </span>
  );
}

const feltKlasse = 'h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15';

/* ═══════════════ Hovedkomponent ═══════════════ */
export default function MeetingsTab({ apiKey, user, onOpenTask }) {
  // 'bruker' har lesetilgang (møter de deltar i / har typetilgang til, filtrert
  // server-side). All redigering, utsendelse og sletting er forbeholdt admin.
  const kanRedigere = !(user && user.role === 'bruker');
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [laster, setLaster] = useState(true);
  const [nyOpen, setNyOpen] = useState(false);
  const [valgtId, setValgtId] = useState(null);
  const [visAvholdte, setVisAvholdte] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(0);

  const actor = (user && (user.name || user.email)) || 'Admin';

  const api = useCallback((sti, opts) => {
    const sep = sti.includes('?') ? '&' : '?';
    return fetch(`/api/admin/${sti}${sep}key=${encodeURIComponent(apiKey)}`, opts);
  }, [apiKey]);

  const visToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const last = useCallback(async () => {
    try {
      const r = await api('meetings');
      const j = await r.json();
      if (j.ok) { setMeetings(j.meetings || []); setMembers(j.members || []); }
    } catch (e) {}
    setLaster(false);
  }, [api]);

  useEffect(() => { last(); }, [last]);

  const medlem = useCallback((id) => members.find((m) => m.id === id) || null, [members]);

  const opprett = useCallback(async (payload) => {
    const r = await api('meetings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Kunne ikke opprette');
    setMeetings((prev) => [j.meeting, ...prev]);
    visToast(j.innkalt ? `Møte opprettet — innkalling sendt til ${j.innkalt}` : 'Møte opprettet');
    last();
  }, [api, last, visToast]);

  const oppdater = useCallback(async (id, patch) => {
    // Optimistisk — samme filosofi som Saker
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    try {
      const r = await api(`meetings/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Lagring feilet');
      setMeetings((prev) => {
        let neste = prev.map((m) => (m.id === id ? j.meeting : m));
        if (j.nesteMote && !neste.some((m) => m.id === j.nesteMote.id)) neste = [j.nesteMote, ...neste];
        return neste;
      });
      if (j.nesteMote) visToast('Avholdt — neste møte er planlagt');
    } catch (e) {
      visToast(e.message, 'feil');
      last();
    }
  }, [api, last, visToast]);

  const slettMote = useCallback(async (id) => {
    if (!window.confirm('Slette møtet? Koblede saker beholdes på sakstavlen.')) return;
    setValgtId(null);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    try {
      await api(`meetings/${id}`, { method: 'DELETE' });
      visToast('Møte slettet');
    } catch (e) { last(); }
  }, [api, last, visToast]);

  const valgt = useMemo(() => meetings.find((m) => m.id === valgtId) || null, [meetings, valgtId]);
  const kommende = useMemo(() => meetings.filter((m) => m.status !== 'avholdt'), [meetings]);
  const avholdte = useMemo(() => meetings.filter((m) => m.status === 'avholdt'), [meetings]);

  if (laster) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="meetings-skeleton">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[140px] animate-pulse rounded-2xl bg-white/80" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="meetings-tab">
      {/* Verktøyrad */}
      <div className="mb-5 flex items-center gap-2">
        <div className="min-w-0">
          <p className="text-[13px] text-[#888]">
            {kommende.length
              ? `${kommende.length} planlagt${kommende.length > 1 ? 'e' : ''} · ${avholdte.length} avholdt${avholdte.length === 1 ? '' : 'e'}`
              : kanRedigere ? 'Agenda, referat, vedtak — og aksjonspunkter som blir saker.' : 'Møter du deltar i eller har tilgang til.'}
          </p>
        </div>
        {kanRedigere && (
        <button
          onClick={() => setNyOpen(true)}
          data-testid="meetings-new-btn"
          className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" /> Nytt møte
        </button>
        )}
      </div>

      {/* Tom-tilstand */}
      {!meetings.length && (
        <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f0fb]">
            <CalendarDays className="h-6 w-6 text-[#8b5cf6]" />
          </span>
          <h3 className="mt-4 text-[17px] font-bold text-[#0a0a0a]" style={heading}>Ingen møter ennå</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[#999]">
            {kanRedigere
              ? 'Opprett første styremøte med agenda — deltakerne får innkalling på e-post, og aksjonspunktene blir saker med ansvarlig og frist.'
              : 'Her vises møter du er deltaker i, og møtetyper du har fått tilgang til. Ta kontakt med en administrator hvis noe mangler.'}
          </p>
          {kanRedigere && (
          <button
            onClick={() => setNyOpen(true)}
            data-testid="meetings-empty-new"
            className="mx-auto mt-5 flex h-10 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-[13.5px] font-semibold text-white transition-all hover:bg-black/85"
          >
            <Plus className="w-4 h-4" /> Nytt møte
          </button>
          )}
        </div>
      )}

      {/* Kommende møter */}
      {kommende.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="meetings-upcoming">
          {kommende.map((m, i) => {
            const t = moteType(m.type);
            const d = m.datetime ? new Date(m.datetime) : null;
            const agendaFerdig = (m.agenda || []).filter((p) => p.done).length;
            return (
              <button
                key={m.id}
                onClick={() => setValgtId(m.id)}
                data-testid={`meeting-card-${m.id}`}
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                className="dh-kort-inn group flex items-start gap-4 rounded-2xl bg-white p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)] active:scale-[0.99]"
              >
                <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: t.bg }}>
                  <span className="text-[20px] font-bold leading-none" style={{ ...heading, color: t.farge }}>{d ? d.getDate() : '–'}</span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: t.farge }}>
                    {d ? d.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '') : 'dato'}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <TypeBadge type={m.type} />
                  <p className="mt-1.5 truncate text-[14px] font-bold text-[#0a0a0a]" style={heading}>{m.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#999]">
                    <Clock className="h-3 w-3" />
                    {d ? d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : 'Tid ikke satt'}
                    {m.recurrence && <Repeat className="ml-1 h-3 w-3 text-[#b5b5b5]" />}
                  </p>
                  <span className="mt-2.5 flex items-center gap-2">
                    <span className="flex -space-x-1.5">
                      {(m.attendees || []).slice(0, 4).map((aid) => {
                        const p = medlem(aid);
                        return p ? <span key={aid} className="rounded-full ring-2 ring-white"><Avatar member={p} size={22} /></span> : null;
                      })}
                    </span>
                    {(m.attendees || []).length > 4 && <span className="text-[11px] text-[#aaa]">+{m.attendees.length - 4}</span>}
                    {(m.agenda || []).length > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-[#aaa]">
                        <CheckCircle2 className="h-3 w-3" /> {agendaFerdig}/{m.agenda.length}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Avholdte møter */}
      {avholdte.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setVisAvholdte((v) => !v)}
            data-testid="meetings-past-toggle"
            className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#999] transition-colors hover:text-[#555]"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${visAvholdte ? '' : '-rotate-90'}`} />
            Avholdte møter ({avholdte.length})
          </button>
          {visAvholdte && (
            <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
              {avholdte.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setValgtId(m.id)}
                  data-testid={`meeting-row-${m.id}`}
                  className="flex w-full items-center gap-3 border-b border-black/[0.04] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#faf8fd]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-[#555]">{m.title}</span>
                    <span className="text-[11.5px] text-[#b0aca6]">{fmtKort(m.datetime)} · {moteType(m.type).l}</span>
                  </span>
                  {(m.vedtak || []).length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-[#aaa]"><Gavel className="h-3 w-3" />{m.vedtak.length}</span>
                  )}
                  {(m.taskIds || []).length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-[#aaa]"><ClipboardCheck className="h-3 w-3" />{m.taskIds.length}</span>
                  )}
                  {m.referatSendtAt && <Mail className="h-3.5 w-3.5 text-emerald-500" title="Referat sendt" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nytt møte */}
      {nyOpen && (
        <NyMoteModal
          members={members}
          onClose={() => setNyOpen(false)}
          onCreate={async (payload) => { await opprett(payload); setNyOpen(false); }}
        />
      )}

      {/* Møteskuff */}
      {valgt && (
        <MoteSkuff
          m={valgt} members={members} actor={actor} api={api} visToast={visToast}
          apiKey={apiKey}
          kanRedigere={kanRedigere}
          onClose={() => setValgtId(null)}
          onPatch={(patch) => oppdater(valgt.id, patch)}
          onDelete={() => slettMote(valgt.id)}
          onReload={last}
          onOpenTask={onOpenTask}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          data-testid="meetings-toast"
          className={`fixed bottom-24 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full py-2.5 pl-4 pr-5 text-[13px] font-semibold text-white shadow-xl dh-fade lg:bottom-6 ${toast.type === 'feil' ? 'bg-rose-600' : 'bg-[#0a0a0a]'}`}
        >
          {toast.type === 'feil' ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Nytt møte ═══════════════ */
function NyMoteModal({ members, onClose, onCreate }) {
  const [tittel, setTittel] = useState('');
  const [type, setType] = useState('styremote');
  const [dato, setDato] = useState('');
  const [tid, setTid] = useState('10:00');
  const [deltakere, setDeltakere] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [nyttPunkt, setNyttPunkt] = useState('');
  const [gjentakelse, setGjentakelse] = useState('');
  const [varsle, setVarsle] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const ref = useRef(null);

  useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 60); }, []);

  const toggleDeltaker = (id) => {
    setDeltakere((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const leggTilPunkt = () => {
    const t = nyttPunkt.trim();
    if (!t) return;
    setAgenda((prev) => [...prev, { text: t }]);
    setNyttPunkt('');
  };

  const lagre = async () => {
    if (!tittel.trim() || lagrer) return;
    setLagrer(true); setFeil('');
    try {
      await onCreate({
        title: tittel.trim(),
        type,
        datetime: dato ? `${dato}T${tid || '10:00'}` : null,
        attendees: deltakere,
        agenda: nyttPunkt.trim() ? [...agenda, { text: nyttPunkt.trim() }] : agenda,
        recurrence: gjentakelse || null,
        notify: varsle,
      });
    } catch (e) {
      setFeil(e.message || 'Kunne ikke opprette');
      setLagrer(false);
    }
  };

  return (
    <Overlegg onClose={onClose} testid="new-meeting-modal">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-5 pt-4">
          <input
            ref={ref}
            value={tittel}
            onChange={(e) => setTittel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) lagre(); }}
            placeholder="Møtetittel — f.eks. «Styremøte Q3»"
            data-testid="new-meeting-title"
            className="w-full bg-transparent text-[18px] font-bold text-[#0a0a0a] outline-none placeholder:font-normal placeholder:text-[#c5c5c5]"
            style={heading}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pt-3 md:flex md:flex-wrap md:items-center">
          <Meny
            compact value={type} onChange={setType} testid="new-meeting-type"
            options={MOTE_TYPER.map((t) => ({ v: t.k, l: t.l, dot: t.farge }))} className="md:w-[136px]"
          />
          <input
            type="date" value={dato} onChange={(e) => setDato(e.target.value)}
            data-testid="new-meeting-date"
            className="h-8 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
          />
          <input
            type="time" value={tid} onChange={(e) => setTid(e.target.value)}
            data-testid="new-meeting-time"
            className="h-8 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
          />
          <Meny
            compact value={gjentakelse} onChange={setGjentakelse} testid="new-meeting-recurrence"
            options={REC_VALG.map((r) => ({ v: r.k, l: r.l }))} className="md:w-[132px]"
          />
        </div>

        {/* Deltakere */}
        <div className="px-5 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Deltakere</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {members.map((p) => {
              const med = deltakere.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleDeltaker(p.id)}
                  data-testid={`new-meeting-attendee-${p.id}`}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[12px] font-medium transition-all ${
                    med ? 'border-[#8b5cf6]/40 bg-[#f4f0fb] text-[#6d28d9]' : 'border-black/[0.08] bg-white text-[#666] hover:border-black/[0.18]'
                  }`}
                >
                  <Avatar member={p} size={20} />
                  {p.name}
                  {med && <Check className="h-3 w-3" />}
                </button>
              );
            })}
            {!members.length && <p className="text-[12.5px] text-[#bbb]">Legg til personer under Saker → Personer først.</p>}
          </div>
        </div>

        {/* Agenda */}
        <div className="px-5 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Agenda</p>
          {agenda.map((p, i) => (
            <div key={i} className="group flex items-center gap-2 py-1">
              <span className="w-4 shrink-0 text-right text-[11px] font-bold text-[#c5c5c5]">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#444]">{p.text}</span>
              <button onClick={() => setAgenda((prev) => prev.filter((_, xi) => xi !== i))} className="shrink-0 rounded p-1 text-[#ccc] hover:text-rose-500" aria-label="Fjern">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0 text-[#bbb]" />
            <input
              value={nyttPunkt}
              onChange={(e) => setNyttPunkt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTilPunkt(); } }}
              data-testid="new-meeting-agenda-input"
              placeholder="Agendapunkt — Enter legger til"
              className={feltKlasse}
            />
          </div>
        </div>

        {feil && <p className="px-5 pt-3 text-[12.5px] font-medium text-rose-600">{feil}</p>}
      </div>

      <div
        className="flex shrink-0 items-center gap-3 border-t border-black/[0.06] px-5 py-3.5"
        style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
      >
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[#777]">
          <input type="checkbox" checked={varsle} onChange={(e) => setVarsle(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" data-testid="new-meeting-notify" />
          Send innkalling på e-post
        </label>
        <button onClick={onClose} className="ml-auto rounded-lg px-3 py-2 text-[13px] font-medium text-[#888] hover:bg-[#f3f2f0]">Avbryt</button>
        <button
          onClick={lagre}
          disabled={!tittel.trim() || lagrer}
          data-testid="new-meeting-save"
          className="flex h-10 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-[13.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
        >
          {lagrer && <Loader2 className="w-4 h-4 animate-spin" />} Opprett møte
        </button>
      </div>
    </Overlegg>
  );
}

/* ═══════════════ Møteskuff — agenda, referat, vedtak, aksjonspunkter ═══════════════ */
function MoteSkuff({ m, members, actor, api, visToast, onClose, onPatch, onDelete, onReload, onOpenTask, apiKey, kanRedigere = true }) {
  const [tittel, setTittel] = useState(m.title);
  const [referat, setReferat] = useState(m.referat || '');
  const [nyttAgenda, setNyttAgenda] = useState('');
  const [nyttVedtak, setNyttVedtak] = useState('');
  const [aksjoner, setAksjoner] = useState([]);
  const [aksTittel, setAksTittel] = useState('');
  const [aksAnsvarlig, setAksAnsvarlig] = useState('');
  const [aksFrist, setAksFrist] = useState('');
  const [aksLagrer, setAksLagrer] = useState(false);
  const [senderReferat, setSenderReferat] = useState(false);

  useEffect(() => { setTittel(m.title); setReferat(m.referat || ''); }, [m.id]); // eslint-disable-line

  // Hent koblede saker (aksjonspunkter) for dette møtet — både aktive og
  // arkiverte, slik at koblingen aldri «mister» saker. today brukes til
  // forfalt-markering (samme Oslo-dato som sakstavlen).
  const [iDag, setIDag] = useState('');
  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const [rA, rB] = await Promise.all([api('tasks'), api('tasks?arkiv=1')]);
        const jA = await rA.json();
        let jB = { ok: false };
        try { jB = await rB.json(); } catch (e) {}
        if (aktiv && jA.ok) {
          const aktive = (jA.tasks || []).filter((t) => t.meetingId === m.id);
          const arkiverte = ((jB.ok && jB.tasks) || []).filter((t) => t.meetingId === m.id).map((t) => ({ ...t, archived: true }));
          setAksjoner([...aktive, ...arkiverte]);
          setIDag(jA.today || '');
        }
      } catch (e) {}
    })();
    return () => { aktiv = false; };
  }, [api, m.id, m.taskIds && m.taskIds.length]); // eslint-disable-line

  const medlem = (id) => members.find((x) => x.id === id) || null;
  const agenda = m.agenda || [];
  const vedtak = m.vedtak || [];
  const avholdt = m.status === 'avholdt';
  const d = m.datetime ? new Date(m.datetime) : null;
  const datoVal = d ? m.datetime.slice(0, 10) : '';
  const tidVal = d && m.datetime.length > 10 ? m.datetime.slice(11, 16) : '10:00';

  const leggTilAgenda = () => {
    const t = nyttAgenda.trim();
    if (!t) return;
    onPatch({ agenda: [...agenda, { text: t, done: false }] });
    setNyttAgenda('');
  };

  const leggTilVedtak = () => {
    const t = nyttVedtak.trim();
    if (!t) return;
    onPatch({ vedtak: [...vedtak, { text: t }] });
    setNyttVedtak('');
  };

  const opprettAksjon = async () => {
    const t = aksTittel.trim();
    if (!t || aksLagrer) return;
    setAksLagrer(true);
    try {
      const r = await api(`meetings/${m.id}/aksjonspunkt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, assigneeId: aksAnsvarlig || null, dueDate: aksFrist || null, actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke opprette');
      setAksjoner((prev) => [...prev, j.task]);
      setAksTittel(''); setAksAnsvarlig(''); setAksFrist('');
      visToast(j.emailed ? 'Sak opprettet — e-postvarsel sendt' : 'Sak opprettet på sakstavlen');
      if (onReload) onReload();
    } catch (e) { visToast(e.message, 'feil'); }
    setAksLagrer(false);
  };

  // Eksterne mottakere av referatet (f.eks. revisor) — chips, lagres på møtet
  // ved utsendelse slik at de huskes til neste gang.
  const [eksterne, setEksterne] = useState(() => (Array.isArray(m.eksterneEpost) ? m.eksterneEpost : []));
  const [eksternInput, setEksternInput] = useState('');
  const EPOST_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const leggTilEkstern = () => {
    const e = eksternInput.trim().toLowerCase();
    if (!e) return;
    if (!EPOST_RE.test(e)) { visToast('Ugyldig e-postadresse', 'feil'); return; }
    if (eksterne.includes(e)) { setEksternInput(''); return; }
    setEksterne((prev) => [...prev, e].slice(0, 10));
    setEksternInput('');
  };

  const sendReferat = async () => {
    if (senderReferat) return;
    setSenderReferat(true);
    try {
      const r = await api(`meetings/${m.id}/send-referat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ekstraEpost: eksterne }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke sende');
      visToast(`Referat + PDF-protokoll sendt til ${j.sendt} mottaker${j.sendt > 1 ? 'e' : ''}${j.eksterne ? ` (${j.eksterne} ekstern${j.eksterne > 1 ? 'e' : ''})` : ''}`);
      if (onReload) onReload();
    } catch (e) { visToast(e.message, 'feil'); }
    setSenderReferat(false);
  };

  return (
    <Overlegg onClose={onClose} variant="panel" testid="meeting-drawer">
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-5 py-3">
        <TypeBadge type={m.type} />
        {avholdt && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Avholdt
          </span>
        )}
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0]" data-testid="meeting-drawer-close"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <input
          value={tittel}
          onChange={(e) => setTittel(e.target.value)}
          onBlur={() => { const t = tittel.trim(); if (t && t !== m.title) onPatch({ title: t }); }}
          readOnly={!kanRedigere}
          data-testid="meeting-title-input"
          className="w-full bg-transparent text-[19px] font-bold leading-snug text-[#0a0a0a] outline-none"
          style={heading}
        />
        <p className="mt-1 text-[12.5px] text-[#999]">{fmtMoteDato(m.datetime)}</p>

        {/* Tid og gjentakelse — kun admin redigerer */}
        {kanRedigere && (
        <>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Dato</span>
            <input
              type="date" value={datoVal}
              onChange={(e) => onPatch({ datetime: e.target.value ? `${e.target.value}T${tidVal}` : null })}
              data-testid="meeting-date-input"
              className={feltKlasse}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Tid</span>
            <input
              type="time" value={tidVal}
              onChange={(e) => { if (datoVal) onPatch({ datetime: `${datoVal}T${e.target.value}` }); }}
              className={feltKlasse}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Type</span>
            <Meny
              value={m.type} onChange={(v) => onPatch({ type: v })}
              options={MOTE_TYPER.map((t) => ({ v: t.k, l: t.l, dot: t.farge }))}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Gjentakelse</span>
            <Meny
              value={m.recurrence || ''} onChange={(v) => onPatch({ recurrence: v || null })}
              options={REC_VALG.map((r) => ({ v: r.k, l: r.l }))}
            />
          </label>
        </div>
        {m.recurrence && !avholdt && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#8b5cf6]">
            <Repeat className="w-3.5 h-3.5" /> Når møtet avholdes, planlegges neste automatisk med samme agenda.
          </p>
        )}
        </>
        )}

        {/* Deltakere */}
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Deltakere</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {(m.attendees || []).map((aid) => {
              const p = medlem(aid);
              if (!p) return null;
              return (
                <span key={aid} className="flex items-center gap-1.5 rounded-full bg-[#f4f0fb] py-1 pl-1 pr-2 text-[12px] font-medium text-[#6d28d9]">
                  <Avatar member={p} size={20} />
                  {p.name}{p.tittel ? <span className="font-normal text-[#a78bda]">· {p.tittel}</span> : null}
                  {kanRedigere && (
                  <button onClick={() => onPatch({ attendees: m.attendees.filter((x) => x !== aid) })} aria-label={`Fjern ${p.name}`} className="text-[#b79ae0] hover:text-rose-500">
                    <X className="w-3 h-3" />
                  </button>
                  )}
                </span>
              );
            })}
            {kanRedigere && members.filter((p) => !(m.attendees || []).includes(p.id)).length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) onPatch({ attendees: [...(m.attendees || []), e.target.value] }); }}
                data-testid="meeting-attendee-add"
                className="h-8 rounded-full bg-[#fafaf8] px-2.5 text-[12px] text-[#888] outline-none"
              >
                <option value="">+ Legg til deltaker</option>
                {members.filter((p) => !(m.attendees || []).includes(p.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Agenda */}
        <div className="mt-6" data-testid="meeting-agenda">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Agenda</p>
            {agenda.length > 0 && (
              <span className="text-[11px] font-bold tabular-nums text-[#aaa]">{agenda.filter((p) => p.done).length}/{agenda.length}</span>
            )}
          </div>
          <div className="mt-2 space-y-0.5">
            {agenda.map((p, i) => (
              <div key={p.id || i} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-[#fafaf8]">
                <button
                  onClick={() => { if (kanRedigere) onPatch({ agenda: agenda.map((x, xi) => (xi === i ? { ...x, done: !x.done } : x)) }); }}
                  disabled={!kanRedigere}
                  className="shrink-0 disabled:cursor-default"
                  data-testid={`agenda-toggle-${i}`}
                  aria-label={p.done ? 'Ikke behandlet' : 'Behandlet'}
                >
                  {p.done
                    ? <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
                    : <Circle className={`w-[18px] h-[18px] text-[#ccc] ${kanRedigere ? 'hover:text-[#8b5cf6]' : ''}`} />}
                </button>
                <span className={`min-w-0 flex-1 text-[13.5px] ${p.done ? 'text-[#b0aca6] line-through' : 'text-[#333]'}`}>{p.text}</span>
                {kanRedigere && (
                <button
                  onClick={() => onPatch({ agenda: agenda.filter((_, xi) => xi !== i) })}
                  className="shrink-0 rounded p-1 text-[#ddd] hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Fjern"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                )}
              </div>
            ))}
            {!agenda.length && !kanRedigere && <p className="text-[12.5px] text-[#bbb]">Ingen agendapunkter.</p>}
          </div>
          {kanRedigere && (
          <div className="mt-1.5 flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0 text-[#bbb]" />
            <input
              value={nyttAgenda}
              onChange={(e) => setNyttAgenda(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTilAgenda(); } }}
              onBlur={() => { if (nyttAgenda.trim()) leggTilAgenda(); }}
              data-testid="agenda-add-input"
              placeholder="Legg til agendapunkt …"
              className={feltKlasse}
            />
          </div>
          )}
        </div>

        {/* Referat */}
        <div className="mt-6" data-testid="meeting-referat">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Referat</p>
            {m.referatSendtAt && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600"><Mail className="h-3 w-3" /> Sendt {fmtKort(m.referatSendtAt)}</span>
            )}
          </div>
          {kanRedigere ? (
          <textarea
            value={referat}
            onChange={(e) => setReferat(e.target.value)}
            onBlur={() => { if (referat !== (m.referat || '')) onPatch({ referat }); }}
            rows={5}
            data-testid="meeting-referat-input"
            placeholder="Skriv referatet her — lagres automatisk. Send til deltakerne når det er klart."
            className="mt-2 w-full resize-y rounded-xl border border-black/[0.07] bg-white p-3 text-[13.5px] leading-relaxed text-[#333] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.14] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
          />
          ) : String(m.referat || '').trim() ? (
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#fafaf8] p-3 text-[13.5px] leading-relaxed text-[#333]" data-testid="meeting-referat-read">{m.referat}</p>
          ) : (
            <p className="mt-2 text-[12.5px] text-[#bbb]">Ingen referat ennå.</p>
          )}
        </div>

        {/* Vedtak */}
        <div className="mt-6" data-testid="meeting-vedtak">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Vedtak</p>
          <div className="mt-2 space-y-1">
            {vedtak.map((v, i) => (
              <div key={v.id || i} className="group flex items-start gap-2.5 rounded-xl bg-[#fafaf8] px-3 py-2.5">
                <Gavel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />
                <span className="min-w-0 flex-1 text-[13px] font-medium leading-relaxed text-[#333]">{v.text}</span>
                {kanRedigere && (
                <button
                  onClick={() => onPatch({ vedtak: vedtak.filter((_, xi) => xi !== i) })}
                  className="shrink-0 rounded p-1 text-[#ddd] hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Fjern vedtak"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                )}
              </div>
            ))}
            {!vedtak.length && <p className="text-[12.5px] text-[#bbb]">Ingen vedtak ført ennå.</p>}
          </div>
          {kanRedigere && (
          <div className="mt-1.5 flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0 text-[#bbb]" />
            <input
              value={nyttVedtak}
              onChange={(e) => setNyttVedtak(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTilVedtak(); } }}
              data-testid="vedtak-add-input"
              placeholder="Før et vedtak — Enter legger til"
              className={feltKlasse}
            />
          </div>
          )}
        </div>

        {/* Aksjonspunkter → saker */}
        <div className="mt-6" data-testid="meeting-actions">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Aksjonspunkter</p>
            {aksjoner.length > 0 && (() => {
              const fullfort = aksjoner.filter((t) => t.status === 'done').length;
              return (
                <span className="ml-auto flex items-center gap-2" data-testid="meeting-actions-progress">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-black/[0.07]">
                    <span
                      className="block h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.round((fullfort / aksjoner.length) * 100)}%` }}
                    />
                  </span>
                  <span className={`text-[11px] font-bold tabular-nums ${fullfort === aksjoner.length ? 'text-emerald-600' : 'text-[#999]'}`}>
                    {fullfort}/{aksjoner.length} fullført
                  </span>
                </span>
              );
            })()}
          </div>
          <p className="mt-0.5 text-[11.5px] text-[#b5b5b5]">{kanRedigere ? 'Blir saker på sakstavlen med ansvarlig og frist — klikk en sak for å åpne den.' : 'Klikk en sak for å åpne den på sakstavlen.'}</p>
          <div className="mt-2 space-y-1.5">
            {aksjoner.map((t) => {
              const p = medlem(t.assigneeId);
              const st = SAK_STATUS[t.status] || SAK_STATUS.inbox;
              const ferdig = t.status === 'done';
              const forfalt = !ferdig && !t.archived && t.dueDate && iDag && t.dueDate < iDag;
              const subs = t.subtasks || [];
              return (
                <button
                  key={t.id}
                  onClick={() => onOpenTask && onOpenTask(t.id, !!t.archived)}
                  title="Åpne saken på sakstavlen"
                  data-testid={`action-task-${t.id}`}
                  className="group flex w-full items-center gap-2.5 rounded-xl bg-[#fafaf8] px-3 py-2.5 text-left transition-all hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:ring-1 hover:ring-[#8b5cf6]/25 active:scale-[0.995]"
                >
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: st.farge, background: st.bg }}
                  >
                    {ferdig ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" style={{ fill: 'currentColor', opacity: t.status === 'inbox' ? 0.35 : 1 }} />}
                    {st.l}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${ferdig ? 'text-[#b0aca6] line-through' : 'text-[#333]'}`}>{t.title}</span>
                  {subs.length > 0 && (
                    <span className={`hidden shrink-0 items-center gap-1 text-[11px] sm:flex ${subs.every((s) => s.done) ? 'text-emerald-600' : 'text-[#aaa]'}`}>
                      <CheckCircle2 className="h-3 w-3" />{subs.filter((s) => s.done).length}/{subs.length}
                    </span>
                  )}
                  {t.archived && (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-[#f3f2f0] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#999]">
                      <Archive className="h-3 w-3" /> Arkivert
                    </span>
                  )}
                  {t.dueDate && (
                    <span className={`shrink-0 text-[11px] ${forfalt ? 'font-bold text-rose-600' : 'text-[#aaa]'}`}>
                      {forfalt ? 'Forfalt · ' : ''}{fmtKort(t.dueDate)}
                    </span>
                  )}
                  {p && <Avatar member={p} size={20} />}
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6] opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
            {!aksjoner.length && <p className="text-[12.5px] text-[#bbb]">Ingen aksjonspunkter ennå.</p>}
          </div>
          {kanRedigere && (
          <div className="mt-2 space-y-2 rounded-xl border border-dashed border-black/[0.1] p-3">
            <input
              value={aksTittel}
              onChange={(e) => setAksTittel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); opprettAksjon(); } }}
              data-testid="action-title-input"
              placeholder="Nytt aksjonspunkt — hva skal gjøres?"
              className={feltKlasse}
            />
            <div className="flex items-center gap-2">
              <Meny
                compact value={aksAnsvarlig} onChange={setAksAnsvarlig} oppover
                placeholder="Ansvarlig" testid="action-assignee"
                options={[{ v: '', l: 'Ingen ansvarlig', }, ...members.map((p) => ({ v: p.id, l: p.name, avatar: p }))]}
                className="w-[150px]"
              />
              <input
                type="date" value={aksFrist} onChange={(e) => setAksFrist(e.target.value)}
                data-testid="action-due"
                className="h-8 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
              />
              <button
                onClick={opprettAksjon}
                disabled={!aksTittel.trim() || aksLagrer}
                data-testid="action-create-btn"
                className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#0a0a0a] px-3 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-40"
              >
                {aksLagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                Til Saker
              </button>
            </div>
          </div>
          )}
        </div>

        {/* ── Utsendelse: PDF-protokoll + eksterne mottakere ── */}
        <div className="mt-6" data-testid="meeting-distribution">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Utsendelse</p>
          <p className="mt-0.5 text-[11.5px] text-[#b5b5b5]">
            {kanRedigere
              ? '«Send referat» sender referat, vedtak og aksjonspunkter til alle deltakere med e-post — med full PDF-protokoll vedlagt.'
              : 'Last ned den formelle møteprotokollen som PDF.'}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <a
              href={`/api/admin/meetings/${m.id}/protokoll?key=${encodeURIComponent(apiKey || '')}`}
              target="_blank" rel="noopener noreferrer"
              data-testid="meeting-pdf-download"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 text-[12.5px] font-semibold text-[#555] transition-all hover:border-black/[0.16] hover:text-[#0a0a0a] active:scale-[0.98]"
            >
              <FileText className="h-3.5 w-3.5 text-[#8b5cf6]" /> Last ned protokoll (PDF)
            </a>
          </div>
          {kanRedigere && (
          <div className="mt-3">
            <p className="text-[11.5px] font-semibold text-[#888]">Eksterne mottakere <span className="font-normal text-[#b5b5b5]">— f.eks. revisor eller eksternt styremedlem</span></p>
            {eksterne.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {eksterne.map((e) => (
                  <span key={e} className="flex items-center gap-1 rounded-full bg-[#f4f0fb] py-1 pl-2.5 pr-1.5 text-[11.5px] font-medium text-[#6d28d9]" data-testid={`extern-chip-${e}`}>
                    {e}
                    <button
                      onClick={() => setEksterne((prev) => prev.filter((x) => x !== e))}
                      className="rounded-full p-0.5 text-[#8b5cf6] hover:bg-[#e3d7f7]"
                      title="Fjern"
                      data-testid={`extern-remove-${e}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={eksternInput}
              onChange={(e) => setEksternInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); leggTilEkstern(); } }}
              onBlur={leggTilEkstern}
              data-testid="extern-email-input"
              placeholder="navn@firma.no — Enter for å legge til"
              className={`mt-1.5 ${feltKlasse}`}
            />
          </div>
          )}
        </div>
      </div>
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-t border-black/[0.06] px-5 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {!kanRedigere ? (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#aaa]" data-testid="meeting-readonly-badge">
            <Eye className="h-3.5 w-3.5" /> Lesetilgang — kontakt en administrator for endringer
          </span>
        ) : (
        <>
        {avholdt ? (
          <button
            onClick={() => onPatch({ status: 'planlagt' })}
            data-testid="meeting-reopen"
            className="flex h-10 items-center gap-1.5 rounded-full bg-[#f3f2f0] px-4 text-[12.5px] font-semibold text-[#666] transition-all hover:bg-[#e9e7e3] active:scale-[0.97]"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Gjenåpne
          </button>
        ) : (
          <button
            onClick={() => onPatch({ status: 'avholdt' })}
            data-testid="meeting-complete"
            className="flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.97]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Marker som avholdt
          </button>
        )}
        <button
          onClick={sendReferat}
          disabled={senderReferat || (!String(m.referat || '').trim() && !vedtak.length)}
          title={(!String(m.referat || '').trim() && !vedtak.length) ? 'Skriv referat eller vedtak først' : 'Send referat og vedtak til alle deltakere med e-post'}
          data-testid="meeting-send-referat"
          className="flex h-10 items-center gap-1.5 rounded-full bg-[#f4f0fb] px-4 text-[12.5px] font-semibold text-[#8b5cf6] transition-all hover:bg-[#ece4fa] active:scale-[0.97] disabled:opacity-40"
        >
          {senderReferat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          Send referat
        </button>
        <button
          onClick={onDelete}
          data-testid="meeting-delete"
          className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-rose-600 transition-colors hover:bg-rose-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> Slett
        </button>
        </>
        )}
      </div>
    </Overlegg>
  );
}
