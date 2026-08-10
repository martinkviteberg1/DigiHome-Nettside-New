'use client';

/* ==========================================================================
   TasksTab — «Saker»: internt sakssystem på selskapsnivå (styre, drift, adhoc).
   Linear-inspirert: lynraskt, tastaturdrevet (N = ny sak), optimistisk UI.
   Bevisst IKKE koblet til leads/kunder — de bor i selve plattformen.

   Responsiv arkitektur (mobile-first):
   · Tavle: horisontal sveip med scroll-snap per kolonne på mobil, grid på md+.
   · Sak-skuff / Ny sak / Personer: bottom-sheets på mobil (med grab-handle,
     safe-area og scroll-lås), panel/kort på desktop. Én klasse (dh-panel-in)
     gir riktig inntreden per flate.
   · Flytende «+»-knapp (FAB) på mobil, verktøyrad med hurtigtast-hint på desktop.
   · Drag & drop på desktop; på touch endres status i skuffen (segmentkontroll).
   ========================================================================== */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus, X, Loader2, Search, Users, Trash2, Bell, Clock, MessageSquare,
  CheckCircle2, Inbox, PlayCircle, LayoutGrid, List, Calendar,
  ChevronDown, AlertTriangle, Pencil, Check, CornerDownLeft, History,
  ClipboardCheck, UserPlus,
} from 'lucide-react';

const STATUSER = [
  { k: 'inbox', l: 'Innboks', icon: Inbox, farge: '#8b8b8b' },
  { k: 'doing', l: 'Pågår', icon: PlayCircle, farge: '#8b5cf6' },
  { k: 'waiting', l: 'Venter', icon: Clock, farge: '#d97706' },
  { k: 'done', l: 'Ferdig', icon: CheckCircle2, farge: '#059669' },
];

const PRI = {
  1: { l: 'P1', full: 'Kritisk', farge: '#e11d48', bg: '#ffe4e6' },
  2: { l: 'P2', full: 'Normal', farge: '#b45309', bg: '#fef3c7' },
  3: { l: 'P3', full: 'Lav', farge: '#6b7280', bg: '#f3f4f6' },
};

const heading = { fontFamily: 'var(--font-heading)' };

function fmtDato(iso) {
  if (!iso) return '';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  } catch (e) { return iso; }
}

function fmtTid(iso) {
  try {
    return new Date(iso).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}

// Lås bakgrunnsscroll mens en flate (skuff/modal) er åpen — kritisk på mobil,
// ellers scroller tavlen bak bottom-sheeten mens man drar i den.
function useLaasBakgrunn() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

// Fristmerke: rød = forfalt, amber = i dag, ellers nøytral.
function DueChip({ due, today, done }) {
  if (!due) return null;
  const forfalt = !done && due < today;
  const iDag = !done && due === today;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
        forfalt ? 'bg-rose-50 text-rose-600' : iDag ? 'bg-amber-50 text-amber-700' : 'bg-[#f3f2f0] text-[#777]'
      }`}
    >
      <Calendar className="h-3 w-3" />
      {forfalt ? `Forfalt · ${fmtDato(due)}` : iDag ? 'I dag' : fmtDato(due)}
    </span>
  );
}

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

export default function TasksTab({ apiKey, user, onStats }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [today, setToday] = useState(new Date().toISOString().slice(0, 10));
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [view, setView] = useState('tavle');
  const [fAnsvarlig, setFAnsvarlig] = useState('alle');
  const [fPri, setFPri] = useState(0);
  const [sok, setSok] = useState('');
  const [valgtId, setValgtId] = useState(null);
  const [nyOpen, setNyOpen] = useState(false);
  const [personerOpen, setPersonerOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [hoverKol, setHoverKol] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(0);

  const actor = (user && (user.name || user.email)) || 'Admin';

  const visToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const api = useCallback((p, opts) => {
    const sep = p.includes('?') ? '&' : '?';
    return fetch(`/api/admin/${p}${sep}key=${encodeURIComponent(apiKey)}`, opts);
  }, [apiKey]);

  const meldStats = useCallback((liste, dag) => {
    if (!onStats) return;
    const aapne = liste.filter((t) => t.status !== 'done');
    onStats({ open: aapne.length, overdue: aapne.filter((t) => t.dueDate && t.dueDate < dag).length });
  }, [onStats]);

  const last = useCallback(async () => {
    try {
      const r = await api('tasks');
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke laste saker');
      setTasks(j.tasks || []);
      setMembers(j.members || []);
      setToday(j.today || today);
      meldStats(j.tasks || [], j.today || today);
      setFeil('');
    } catch (e) {
      setFeil(e.message || 'Nettverksfeil');
    } finally {
      setLaster(false);
    }
  }, [api, meldStats]); // eslint-disable-line

  useEffect(() => { last(); }, [last]);

  // N = ny sak (når man ikke skriver i et felt og ingenting annet er åpent)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (nyOpen || valgtId || personerOpen) return;
      e.preventDefault();
      setNyOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nyOpen, valgtId, personerOpen]);

  const medlem = useCallback((id) => members.find((m) => m.id === id) || null, [members]);

  // --- CRUD (optimistisk der det er trygt) ---
  const oppdater = useCallback(async (id, patch, { stille = false } = {}) => {
    setTasks((prev) => {
      const neste = prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
      meldStats(neste, today);
      return neste;
    });
    try {
      const r = await api(`tasks/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Lagring feilet');
      setTasks((prev) => prev.map((t) => (t.id === id ? j.task : t)));
      if (j.emailed && !stille) visToast('Lagret — e-postvarsel sendt', 'ok');
    } catch (e) {
      visToast(e.message || 'Lagring feilet', 'feil');
      last();
    }
  }, [api, actor, last, meldStats, today, visToast]);

  const opprett = useCallback(async (payload) => {
    const r = await api('tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, actor }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Kunne ikke opprette sak');
    setTasks((prev) => {
      const neste = [j.task, ...prev];
      meldStats(neste, today);
      return neste;
    });
    visToast(j.emailed ? 'Sak opprettet — e-postvarsel sendt' : 'Sak opprettet');
    return j.task;
  }, [api, actor, meldStats, today, visToast]);

  const slett = useCallback(async (id) => {
    if (!window.confirm('Slette saken permanent?')) return;
    setValgtId(null);
    setTasks((prev) => {
      const neste = prev.filter((t) => t.id !== id);
      meldStats(neste, today);
      return neste;
    });
    try {
      await api(`tasks/${id}`, { method: 'DELETE' });
      visToast('Sak slettet');
    } catch (e) { last(); }
  }, [api, last, meldStats, today, visToast]);

  const kommenter = useCallback(async (id, text) => {
    const r = await api(`tasks/${id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author: actor }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Kommentar feilet');
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, comments: [...(t.comments || []), j.comment] } : t)));
  }, [api, actor]);

  const purr = useCallback(async (id) => {
    try {
      const r = await api(`tasks/${id}/remind`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke sende');
      visToast('Påminnelse sendt på e-post');
      last();
    } catch (e) {
      visToast(e.message, 'feil');
    }
  }, [api, actor, last, visToast]);

  // --- Filtrering ---
  const filtrert = useMemo(() => {
    const s = sok.trim().toLowerCase();
    return tasks.filter((t) => {
      if (fAnsvarlig !== 'alle' && (t.assigneeId || '') !== fAnsvarlig) return false;
      if (fPri && t.priority !== fPri) return false;
      if (s && !`${t.title} ${t.description} ${(t.labels || []).join(' ')}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [tasks, fAnsvarlig, fPri, sok]);

  const perStatus = useMemo(() => {
    const m = { inbox: [], doing: [], waiting: [], done: [] };
    // Innen kolonnen: nærmeste frist først, så prioritet, så sist oppdatert
    const sorter = (a, b) => {
      const fa = a.dueDate || '9999', fb = b.dueDate || '9999';
      if (fa !== fb) return fa < fb ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    };
    filtrert.forEach((t) => { (m[t.status] || m.inbox).push(t); });
    Object.values(m).forEach((arr) => arr.sort(sorter));
    return m;
  }, [filtrert]);

  const stats = useMemo(() => {
    const aapne = tasks.filter((t) => t.status !== 'done');
    const uke = new Date(Date.now() - 7 * 864e5).toISOString();
    return {
      aapne: aapne.length,
      forfalt: aapne.filter((t) => t.dueDate && t.dueDate < today).length,
      iDag: aapne.filter((t) => t.dueDate === today).length,
      ferdig7d: tasks.filter((t) => t.status === 'done' && (t.completedAt || '') >= uke).length,
    };
  }, [tasks, today]);

  const valgt = valgtId ? tasks.find((t) => t.id === valgtId) : null;
  const tomt = !laster && tasks.length === 0;

  if (laster) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#cf97fc]" />
      </div>
    );
  }

  return (
    <div data-testid="tasks-tab">
      {/* ═══ Toppstripe ═══ */}
      <div className="mb-4 md:mb-5">
        <div className="flex items-center gap-2">
          {/* Sammendrag — sveipbart på mobil, statisk på desktop */}
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 lg:flex-none lg:overflow-visible lg:pb-0">
            <SummaryChip label="Åpne" value={stats.aapne} />
            <SummaryChip label="Forfalt" value={stats.forfalt} warn={stats.forfalt > 0} testid="tasks-overdue-chip" />
            <SummaryChip label="I dag" value={stats.iDag} />
            <SummaryChip label="Ferdig siste 7 d" value={stats.ferdig7d} good />
          </div>

          {/* Desktop-verktøy */}
          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#b5b5b5]" />
              <input
                value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk i saker …"
                data-testid="tasks-search"
                className="h-9 w-44 rounded-full bg-white pl-8 pr-3 text-[13px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none placeholder:text-[#bbb] focus:ring-2 focus:ring-[#cf97fc]/40"
              />
            </div>
            <select
              value={fAnsvarlig} onChange={(e) => setFAnsvarlig(e.target.value)}
              data-testid="tasks-filter-assignee"
              className="h-9 rounded-full bg-white px-3 text-[13px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none"
            >
              <option value="alle">Alle ansvarlige</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              value={fPri} onChange={(e) => setFPri(Number(e.target.value))}
              className="h-9 rounded-full bg-white px-3 text-[13px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none"
            >
              <option value={0}>Alle prioriteter</option>
              <option value={1}>P1 · Kritisk</option>
              <option value={2}>P2 · Normal</option>
              <option value={3}>P3 · Lav</option>
            </select>
            <div className="flex rounded-full bg-white p-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              <ViewBtn active={view === 'tavle'} onClick={() => setView('tavle')} icon={LayoutGrid} label="Tavle" testid="tasks-view-board" />
              <ViewBtn active={view === 'liste'} onClick={() => setView('liste')} icon={List} label="Liste" testid="tasks-view-list" />
            </div>
            <button
              onClick={() => setPersonerOpen(true)}
              data-testid="tasks-members-btn"
              className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-medium text-[#555] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-colors hover:text-[#0a0a0a]"
            >
              <Users className="w-3.5 h-3.5" /> Personer
            </button>
            <button
              onClick={() => setNyOpen(true)}
              data-testid="tasks-new-btn"
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" /> Ny sak <kbd className="ml-1 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold">N</kbd>
            </button>
          </div>
        </div>

        {/* Mobil/nettbrett-verktøy: fullbredde søk, filtre i egen rad */}
        <div className="mt-3 space-y-2 lg:hidden">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b5b5b5]" />
            <input
              value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk i saker …"
              data-testid="tasks-search-mobile"
              className="h-11 w-full rounded-2xl bg-white pl-10 pr-3 text-[15px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none placeholder:text-[#bbb] focus:ring-2 focus:ring-[#cf97fc]/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={fAnsvarlig} onChange={(e) => setFAnsvarlig(e.target.value)}
              className="h-11 w-full rounded-2xl bg-white px-3 text-[13.5px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none"
            >
              <option value="alle">Alle ansvarlige</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              value={fPri} onChange={(e) => setFPri(Number(e.target.value))}
              className="h-11 w-full rounded-2xl bg-white px-3 text-[13.5px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none"
            >
              <option value={0}>Alle prioriteter</option>
              <option value={1}>P1 · Kritisk</option>
              <option value={2}>P2 · Normal</option>
              <option value={3}>P3 · Lav</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-11 items-center rounded-2xl bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              <ViewBtn active={view === 'tavle'} onClick={() => setView('tavle')} icon={LayoutGrid} label="Tavle" />
              <ViewBtn active={view === 'liste'} onClick={() => setView('liste')} icon={List} label="Liste" />
            </div>
            <button
              onClick={() => setPersonerOpen(true)}
              className="ml-auto flex h-11 items-center gap-1.5 rounded-2xl bg-white px-4 text-[13.5px] font-medium text-[#555] shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              <Users className="w-4 h-4" /> Personer
            </button>
          </div>
        </div>
      </div>

      {feil && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {feil}
        </div>
      )}

      {/* ═══ Førstegangsopplevelse ═══ */}
      {tomt && (
        <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:py-20" data-testid="tasks-empty">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f0fb]">
            <ClipboardCheck className="h-7 w-7 text-[#8b5cf6]" />
          </span>
          <h3 className="mt-5 text-[20px] font-bold text-[#0a0a0a]" style={heading}>Fang den første saken</h3>
          <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] leading-relaxed text-[#888]">
            Alt som må følges opp internt — styresaker, frister, rutiner — samlet på ett brett,
            med ansvarlig person og e-postvarsel.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              onClick={() => setNyOpen(true)}
              data-testid="empty-new-task"
              className="flex h-11 w-full max-w-[240px] items-center justify-center gap-1.5 rounded-full bg-[#0a0a0a] px-5 text-[13.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.98] sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Ny sak
            </button>
            <button
              onClick={() => setPersonerOpen(true)}
              className="flex h-11 w-full max-w-[240px] items-center justify-center gap-1.5 rounded-full bg-[#f4f0fb] px-5 text-[13.5px] font-semibold text-[#8b5cf6] transition-all hover:bg-[#ece4fa] sm:w-auto"
            >
              <UserPlus className="w-4 h-4" /> Legg til personer
            </button>
          </div>
        </div>
      )}

      {/* ═══ Tavle — sveipbar med snap på mobil, grid på md+ ═══ */}
      {!tomt && view === 'tavle' && (
        <div
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4"
          data-testid="tasks-board"
        >
          {STATUSER.map((st) => {
            const Icon = st.icon;
            const liste = perStatus[st.k];
            return (
              <div
                key={st.k}
                onDragOver={(e) => { e.preventDefault(); setHoverKol(st.k); }}
                onDragLeave={() => setHoverKol((h) => (h === st.k ? null : h))}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoverKol(null);
                  if (dragId) { oppdater(dragId, { status: st.k }); setDragId(null); }
                }}
                className={`w-[82vw] shrink-0 snap-center rounded-2xl p-2 transition-colors sm:w-[320px] md:w-auto md:shrink md:snap-align-none ${
                  hoverKol === st.k ? 'bg-[#efe9fb]' : 'bg-[#f0efec]'
                }`}
                data-testid={`tasks-col-${st.k}`}
              >
                <div className="flex items-center gap-2 px-2 py-2">
                  <Icon className="w-4 h-4" style={{ color: st.farge }} />
                  <span className="text-[12.5px] font-bold text-[#333]" style={heading}>{st.l}</span>
                  <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10.5px] font-bold text-[#888] tabular-nums">{liste.length}</span>
                </div>
                <div className="space-y-2 min-h-[64px]">
                  {liste.map((t) => (
                    <SakKort
                      key={t.id} t={t} today={today} member={medlem(t.assigneeId)}
                      dras={dragId === t.id}
                      onClick={() => setValgtId(t.id)}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))}
                  {!liste.length && (
                    <p className="px-2 py-6 text-center text-[12px] text-[#b0aca6]">Ingen saker</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Liste ═══ */}
      {!tomt && view === 'liste' && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="tasks-list">
          {filtrert.length === 0 && (
            <p className="py-14 text-center text-[13.5px] text-[#aaa]">Ingen saker matcher filtrene.</p>
          )}
          {STATUSER.map((st) => {
            const liste = perStatus[st.k];
            if (!liste.length) return null;
            const Icon = st.icon;
            return (
              <div key={st.k}>
                <div className="flex items-center gap-2 border-b border-black/[0.05] bg-[#fafaf8] px-4 py-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: st.farge }} />
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#666]">{st.l}</span>
                  <span className="text-[11px] text-[#aaa] tabular-nums">{liste.length}</span>
                </div>
                {liste.map((t) => {
                  const m = medlem(t.assigneeId);
                  const p = PRI[t.priority] || PRI[2];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setValgtId(t.id)}
                      className="flex w-full items-center gap-2.5 border-b border-black/[0.04] px-4 py-3 text-left transition-colors hover:bg-[#faf8fd] active:bg-[#f6f2fc] sm:gap-3 sm:py-2.5"
                      data-testid={`task-row-${t.id}`}
                    >
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ color: p.farge, background: p.bg }}>{p.l}</span>
                      <span className={`min-w-0 flex-1 truncate text-[13.5px] font-medium ${t.status === 'done' ? 'text-[#9a9a9a] line-through' : 'text-[#1a1a1a]'}`}>{t.title}</span>
                      {(t.labels || []).slice(0, 3).map((l) => (
                        <span key={l} className="hidden md:inline rounded-md bg-[#f4f0fb] px-1.5 py-0.5 text-[10.5px] font-medium text-[#8b5cf6]">{l}</span>
                      ))}
                      {(t.comments || []).length > 0 && (
                        <span className="hidden sm:flex items-center gap-1 text-[11px] text-[#aaa]"><MessageSquare className="w-3 h-3" />{t.comments.length}</span>
                      )}
                      <DueChip due={t.dueDate} today={today} done={t.status === 'done'} />
                      {m ? <Avatar member={m} size={24} /> : <span className="hidden w-6 sm:block" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ FAB — mobil/nettbrett ═══ */}
      <button
        onClick={() => setNyOpen(true)}
        data-testid="tasks-fab"
        aria-label="Ny sak"
        className="fixed bottom-5 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#0a0a0a] text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform active:scale-90 lg:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ═══ Sak-skuff ═══ */}
      {valgt && (
        <SakSkuff
          t={valgt} members={members} today={today} actor={actor}
          onClose={() => setValgtId(null)}
          onPatch={(patch) => oppdater(valgt.id, patch)}
          onComment={(text) => kommenter(valgt.id, text)}
          onRemind={() => purr(valgt.id)}
          onDelete={() => slett(valgt.id)}
        />
      )}

      {/* ═══ Ny sak ═══ */}
      {nyOpen && (
        <NySakModal
          members={members}
          onClose={() => setNyOpen(false)}
          onCreate={async (payload) => { await opprett(payload); setNyOpen(false); }}
        />
      )}

      {/* ═══ Personer ═══ */}
      {personerOpen && (
        <PersonerModal
          api={api} members={members} setMembers={setMembers}
          onClose={() => setPersonerOpen(false)} visToast={visToast}
        />
      )}

      {/* Toast — over FAB-en på mobil */}
      {toast && (
        <div
          data-testid="tasks-toast"
          className={`fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-semibold text-white shadow-xl dh-fade lg:bottom-6 ${toast.type === 'feil' ? 'bg-rose-600' : 'bg-[#0a0a0a]'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function SummaryChip({ label, value, warn, good, testid }) {
  return (
    <span
      data-testid={testid}
      className={`inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[12.5px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] ${
        warn ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-white text-[#888]'
      }`}
    >
      <span className={`text-[14px] font-bold tabular-nums ${warn ? 'text-rose-700' : good ? 'text-emerald-600' : 'text-[#0a0a0a]'}`}>{value}</span>
      {label}
    </span>
  );
}

function ViewBtn({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button
      onClick={onClick} data-testid={testid}
      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-all ${
        active ? 'bg-[#0a0a0a] text-white' : 'text-[#777] hover:text-[#0a0a0a]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function SakKort({ t, today, member, dras, onClick, onDragStart, onDragEnd }) {
  const p = PRI[t.priority] || PRI[2];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="button"
      data-testid={`task-card-${t.id}`}
      className={`cursor-pointer select-none rounded-xl bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all touch-manipulation hover:-translate-y-[1px] hover:shadow-[0_6px_18px_rgba(0,0,0,0.09)] active:scale-[0.98] ${dras ? 'opacity-50 ring-2 ring-[#cf97fc]' : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none" style={{ color: p.farge, background: p.bg }}>{p.l}</span>
        <p className={`flex-1 text-[13px] font-semibold leading-snug ${t.status === 'done' ? 'text-[#9a9a9a] line-through' : 'text-[#1a1a1a]'}`}>{t.title}</p>
      </div>
      {(t.labels || []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {t.labels.slice(0, 3).map((l) => (
            <span key={l} className="rounded-md bg-[#f4f0fb] px-1.5 py-0.5 text-[10px] font-medium text-[#8b5cf6]">{l}</span>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <DueChip due={t.dueDate} today={today} done={t.status === 'done'} />
        {(t.comments || []).length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-[#aaa]"><MessageSquare className="w-3 h-3" />{t.comments.length}</span>
        )}
        <span className="ml-auto">{member && <Avatar member={member} size={22} />}</span>
      </div>
    </div>
  );
}

/* Delt skall for skuff/modaler: bottom-sheet på mobil, panel/kort på desktop. */
function Overlegg({ onClose, children, variant = 'sheet', testid }) {
  useLaasBakgrunn();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // variant 'panel' = sak-skuffen (full høyde til høyre på desktop)
  // variant 'sheet' = modaler (sentrert kort på desktop)
  const ytre = variant === 'panel'
    ? 'fixed inset-0 z-[110] flex items-end justify-center md:items-stretch md:justify-end'
    : 'fixed inset-0 z-[110] flex items-end justify-center md:items-start md:px-4 md:pt-[12vh]';
  const indre = variant === 'panel'
    ? 'relative flex h-[93dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:h-full md:max-w-[480px] md:rounded-none md:shadow-[-16px_0_48px_rgba(0,0,0,0.14)]'
    : 'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:max-h-[80vh] md:max-w-xl md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.28)]';

  return (
    <div className={ytre}>
      <div className="absolute inset-0 bg-[#0a0a0a]/35 backdrop-blur-[2px] dh-fade" onClick={onClose} />
      <div className={indre} data-testid={testid}>
        {/* Grab-handle — kun mobil */}
        <div className="flex shrink-0 justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════ Skuff: full redigering av én sak ═══════════════ */
function SakSkuff({ t, members, today, actor, onClose, onPatch, onComment, onRemind, onDelete }) {
  const [tittel, setTittel] = useState(t.title);
  const [beskrivelse, setBeskrivelse] = useState(t.description || '');
  const [kommentar, setKommentar] = useState('');
  const [sender, setSender] = useState(false);
  const [visLogg, setVisLogg] = useState(false);
  const [varsle, setVarsle] = useState(true);

  useEffect(() => { setTittel(t.title); setBeskrivelse(t.description || ''); }, [t.id]); // eslint-disable-line

  const member = members.find((m) => m.id === t.assigneeId) || null;

  const sendKommentar = async () => {
    const tekst = kommentar.trim();
    if (!tekst || sender) return;
    setSender(true);
    try { await onComment(tekst); setKommentar(''); } catch (e) {}
    setSender(false);
  };

  return (
    <Overlegg onClose={onClose} variant="panel" testid="task-drawer">
      {/* Topp: status + lukk */}
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-4 py-3 sm:px-5">
        <div className="no-scrollbar flex min-w-0 overflow-x-auto rounded-full bg-[#f3f2f0] p-0.5">
          {STATUSER.map((st) => (
            <button
              key={st.k}
              onClick={() => onPatch({ status: st.k })}
              data-testid={`drawer-status-${st.k}`}
              className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
                t.status === st.k ? 'bg-white shadow-[0_1px_6px_rgba(0,0,0,0.1)]' : 'text-[#888] hover:text-[#333]'
              }`}
              style={t.status === st.k ? { color: st.farge } : undefined}
            >
              {st.l}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="ml-auto shrink-0 rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0] hover:text-[#333]" data-testid="drawer-close">
          <X className="w-[18px] h-[18px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        {/* Tittel */}
        <input
          value={tittel}
          onChange={(e) => setTittel(e.target.value)}
          onBlur={() => { const v = tittel.trim(); if (v && v !== t.title) onPatch({ title: v }); }}
          data-testid="drawer-title"
          className="w-full bg-transparent text-[18px] font-bold leading-snug text-[#0a0a0a] outline-none placeholder:text-[#ccc] sm:text-[19px]"
          style={heading}
          placeholder="Sakens tittel"
        />

        {/* Beskrivelse */}
        <textarea
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          onBlur={() => { if (beskrivelse !== (t.description || '')) onPatch({ description: beskrivelse }); }}
          rows={3}
          data-testid="drawer-description"
          placeholder="Beskrivelse — hva handler saken om, og hva er «ferdig»?"
          className="mt-2 w-full resize-y rounded-xl bg-[#fafaf8] p-3 text-[13.5px] leading-relaxed text-[#333] outline-none placeholder:text-[#bbb] focus:ring-2 focus:ring-[#cf97fc]/30"
        />

        {/* Meta */}
        <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <MetaFelt label="Ansvarlig">
            <select
              value={t.assigneeId || ''}
              onChange={(e) => onPatch({ assigneeId: e.target.value || null, notify: varsle })}
              data-testid="drawer-assignee"
              className="h-11 w-full rounded-lg bg-[#fafaf8] px-2.5 text-[13.5px] outline-none sm:h-10 sm:text-[13px]"
            >
              <option value="">Ingen</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </MetaFelt>
          <MetaFelt label="Frist">
            <input
              type="date"
              value={t.dueDate || ''}
              onChange={(e) => onPatch({ dueDate: e.target.value || null })}
              data-testid="drawer-due"
              className="h-11 w-full rounded-lg bg-[#fafaf8] px-2.5 text-[13.5px] outline-none sm:h-10 sm:text-[13px]"
            />
          </MetaFelt>
          <MetaFelt label="Prioritet">
            <select
              value={t.priority}
              onChange={(e) => onPatch({ priority: Number(e.target.value) })}
              data-testid="drawer-priority"
              className="h-11 w-full rounded-lg bg-[#fafaf8] px-2.5 text-[13.5px] outline-none sm:h-10 sm:text-[13px]"
            >
              <option value={1}>P1 · Kritisk</option>
              <option value={2}>P2 · Normal</option>
              <option value={3}>P3 · Lav</option>
            </select>
          </MetaFelt>
          <MetaFelt label="Etiketter (komma)">
            <input
              defaultValue={(t.labels || []).join(', ')}
              onBlur={(e) => {
                const labels = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                if (JSON.stringify(labels) !== JSON.stringify(t.labels || [])) onPatch({ labels });
              }}
              placeholder="styre, økonomi …"
              className="h-11 w-full rounded-lg bg-[#fafaf8] px-2.5 text-[13.5px] outline-none placeholder:text-[#ccc] sm:h-10 sm:text-[13px]"
            />
          </MetaFelt>
        </div>

        <label className="mt-3 flex items-center gap-2 text-[12px] text-[#888]">
          <input type="checkbox" checked={varsle} onChange={(e) => setVarsle(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" />
          Send e-postvarsel ved ny tildeling
        </label>

        {/* Frist-status */}
        {t.dueDate && t.status !== 'done' && t.dueDate < today && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Fristen ({fmtDato(t.dueDate)}) er passert
          </div>
        )}

        {/* Kommentarer */}
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Kommentarer</p>
          <div className="mt-2 space-y-2.5">
            {(t.comments || []).map((c) => (
              <div key={c.id} className="rounded-xl bg-[#fafaf8] px-3.5 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-bold text-[#333]">{c.author}</span>
                  <span className="text-[10.5px] text-[#b5b5b5]">{fmtTid(c.at)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#444]">{c.text}</p>
              </div>
            ))}
            {!(t.comments || []).length && <p className="text-[12.5px] text-[#bbb]">Ingen kommentarer ennå.</p>}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <textarea
              value={kommentar}
              onChange={(e) => setKommentar(e.target.value)}
              onKeyDown={(e) => {
                // Enter sender på desktop; på mobil gir Enter linjeskift (send-knappen brukes)
                if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); sendKommentar(); }
              }}
              rows={2}
              data-testid="drawer-comment-input"
              placeholder={`Kommenter som ${actor} …`}
              className="min-w-0 flex-1 resize-none rounded-xl bg-[#fafaf8] p-3 text-[13.5px] outline-none placeholder:text-[#bbb] focus:ring-2 focus:ring-[#cf97fc]/30"
            />
            <button
              onClick={sendKommentar}
              disabled={!kommentar.trim() || sender}
              data-testid="drawer-comment-send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a0a0a] text-white transition-all hover:bg-black/85 active:scale-95 disabled:opacity-40"
            >
              {sender ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Aktivitetslogg */}
        <div className="mt-6 pb-2">
          <button onClick={() => setVisLogg((v) => !v)} className="flex items-center gap-1.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#999] hover:text-[#555]">
            <History className="w-3.5 h-3.5" /> Aktivitet ({(t.activity || []).length})
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${visLogg ? 'rotate-180' : ''}`} />
          </button>
          {visLogg && (
            <div className="mt-2 space-y-1.5 border-l-2 border-[#eee] pl-3.5">
              {[...(t.activity || [])].reverse().map((a, i) => (
                <p key={i} className="text-[12px] leading-relaxed text-[#888]">
                  <span className="font-semibold text-[#555]">{a.actor}</span> · {a.text}
                  <span className="text-[#c0c0c0]"> — {fmtTid(a.at)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bunnhandlinger — med safe-area på mobil */}
      <div
        className="flex shrink-0 items-center gap-2 border-t border-black/[0.06] px-4 py-3 sm:px-5"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onRemind}
          disabled={!member || !member.email}
          title={member && member.email ? `Send påminnelse til ${member.name}` : 'Krever ansvarlig med e-post'}
          data-testid="drawer-remind"
          className="flex h-10 items-center gap-1.5 rounded-full bg-[#f4f0fb] px-4 text-[12.5px] font-semibold text-[#8b5cf6] transition-all hover:bg-[#ece4fa] active:scale-[0.97] disabled:opacity-40"
        >
          <Bell className="w-3.5 h-3.5" /> Purr på e-post
        </button>
        <button
          onClick={onDelete}
          data-testid="drawer-delete"
          className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-[#bbb] transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="w-3.5 h-3.5" /> Slett
        </button>
      </div>
    </Overlegg>
  );
}

function MetaFelt({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">{label}</span>
      {children}
    </label>
  );
}

/* ═══════════════ Ny sak ═══════════════ */
function NySakModal({ members, onClose, onCreate }) {
  const [tittel, setTittel] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [status, setStatus] = useState('inbox');
  const [prioritet, setPrioritet] = useState(2);
  const [ansvarlig, setAnsvarlig] = useState('');
  const [frist, setFrist] = useState('');
  const [varsle, setVarsle] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const ref = useRef(null);

  useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 60); }, []);

  const lagre = async () => {
    if (!tittel.trim() || lagrer) return;
    setLagrer(true); setFeil('');
    try {
      await onCreate({
        title: tittel.trim(), description: beskrivelse.trim(), status,
        priority: prioritet, assigneeId: ansvarlig || null, dueDate: frist || null,
        notify: varsle,
      });
    } catch (e) {
      setFeil(e.message || 'Kunne ikke opprette');
      setLagrer(false);
    }
  };

  return (
    <Overlegg onClose={onClose} variant="sheet" testid="task-new-modal">
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') lagre(); }}
      >
        <div className="px-5 pt-4 md:pt-5">
          <input
            ref={ref}
            value={tittel}
            onChange={(e) => setTittel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lagre(); } }}
            data-testid="new-task-title"
            placeholder="Hva må gjøres?"
            className="w-full bg-transparent text-[18px] font-bold text-[#0a0a0a] outline-none placeholder:text-[#ccc] sm:text-[19px]"
            style={heading}
          />
          <textarea
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            rows={2}
            data-testid="new-task-description"
            placeholder="Beskrivelse (valgfritt)"
            className="mt-2 w-full resize-none bg-transparent text-[13.5px] text-[#444] outline-none placeholder:text-[#c5c5c5]"
          />
        </div>

        {/* Kontroller: 2×2-grid på mobil, én rad på md+ */}
        <div className="grid grid-cols-2 gap-2 px-5 pt-2 md:flex md:flex-wrap md:items-center">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl bg-[#f4f3f1] px-2.5 text-[13px] outline-none md:h-8 md:rounded-lg md:text-[12.5px]">
            {STATUSER.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
          <select value={prioritet} onChange={(e) => setPrioritet(Number(e.target.value))} className="h-10 rounded-xl bg-[#f4f3f1] px-2.5 text-[13px] outline-none md:h-8 md:rounded-lg md:text-[12.5px]" data-testid="new-task-priority">
            <option value={1}>P1 · Kritisk</option>
            <option value={2}>P2 · Normal</option>
            <option value={3}>P3 · Lav</option>
          </select>
          <select value={ansvarlig} onChange={(e) => setAnsvarlig(e.target.value)} className="h-10 min-w-0 rounded-xl bg-[#f4f3f1] px-2.5 text-[13px] outline-none md:h-8 md:max-w-[170px] md:rounded-lg md:text-[12.5px]" data-testid="new-task-assignee">
            <option value="">{members.length ? 'Ingen ansvarlig' : 'Legg til personer først'}</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" value={frist} onChange={(e) => setFrist(e.target.value)} className="h-10 min-w-0 rounded-xl bg-[#f4f3f1] px-2.5 text-[13px] outline-none md:h-8 md:rounded-lg md:text-[12.5px]" data-testid="new-task-due" />
        </div>

        {ansvarlig && (
          <label className="flex items-center gap-2 px-5 pt-3 text-[12px] text-[#888]">
            <input type="checkbox" checked={varsle} onChange={(e) => setVarsle(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" />
            Send e-postvarsel til ansvarlig
          </label>
        )}
        {feil && <p className="px-5 pt-2 text-[12.5px] text-rose-600">{feil}</p>}
      </div>

      <div
        className="flex shrink-0 items-center gap-3 border-t border-black/[0.06] px-5 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <span className="hidden text-[11px] text-[#b5b5b5] md:inline">⌘/Ctrl + Enter for å lagre</span>
        <button onClick={onClose} className="ml-auto h-10 rounded-full px-4 text-[13.5px] font-medium text-[#888] hover:text-[#333] md:h-9 md:text-[13px]">Avbryt</button>
        <button
          onClick={lagre}
          disabled={!tittel.trim() || lagrer}
          data-testid="new-task-save"
          className="flex h-10 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-5 text-[13.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40 md:h-9 md:text-[13px]"
        >
          {lagrer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Opprett sak
        </button>
      </div>
    </Overlegg>
  );
}

/* ═══════════════ Personer (ansvarlige) ═══════════════ */
function PersonerModal({ api, members, setMembers, onClose, visToast }) {
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [lagrer, setLagrer] = useState(false);
  const [redigerId, setRedigerId] = useState(null);
  const [redNavn, setRedNavn] = useState('');
  const [redEpost, setRedEpost] = useState('');

  const leggTil = async () => {
    if (!navn.trim() || lagrer) return;
    setLagrer(true);
    try {
      const r = await api('task-members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: navn.trim(), email: epost.trim() }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke legge til');
      setMembers((prev) => [...prev, j.member]);
      setNavn(''); setEpost('');
      visToast(`${j.member.name} lagt til`);
    } catch (e) { visToast(e.message, 'feil'); }
    setLagrer(false);
  };

  const lagreEndring = async (id) => {
    try {
      const r = await api(`task-members/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: redNavn.trim(), email: redEpost.trim() }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Lagring feilet');
      setMembers((prev) => prev.map((m) => (m.id === id ? j.member : m)));
      setRedigerId(null);
    } catch (e) { visToast(e.message, 'feil'); }
  };

  const slettPerson = async (m) => {
    if (!window.confirm(`Fjerne ${m.name}? Saker de er ansvarlig for beholdes uten ansvarlig.`)) return;
    try {
      await api(`task-members/${m.id}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      visToast(`${m.name} fjernet`);
    } catch (e) { visToast('Kunne ikke fjerne', 'feil'); }
  };

  return (
    <Overlegg onClose={onClose} variant="sheet" testid="task-members-modal">
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-5 py-4">
        <Users className="w-[18px] h-[18px] shrink-0 text-[#8b5cf6]" />
        <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>Personer</h3>
        <span className="hidden text-[12px] text-[#aaa] sm:inline">— kan stå som ansvarlig og få e-postvarsler</span>
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0]"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
        {!members.length && (
          <div className="py-8 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f0fb]">
              <UserPlus className="h-5 w-5 text-[#8b5cf6]" />
            </span>
            <p className="mt-3 text-[13px] text-[#999]">Ingen personer ennå — legg til den første under.</p>
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-black/[0.04] py-3 last:border-0" data-testid={`member-row-${m.id}`}>
            <Avatar member={m} size={32} />
            {redigerId === m.id ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <input value={redNavn} onChange={(e) => setRedNavn(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-[#f4f3f1] px-2.5 py-2 text-[13.5px] outline-none" />
                <input value={redEpost} onChange={(e) => setRedEpost(e.target.value)} placeholder="e-post" className="min-w-0 flex-1 rounded-lg bg-[#f4f3f1] px-2.5 py-2 text-[13px] outline-none" />
                <div className="flex gap-1.5">
                  <button onClick={() => lagreEndring(m.id)} className="rounded-lg bg-[#0a0a0a] p-2 text-white"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setRedigerId(null)} className="rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0]"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#1a1a1a]">{m.name}</p>
                  <p className="truncate text-[12px] text-[#999]">{m.email || 'Ingen e-post — får ikke varsler'}</p>
                </div>
                <button
                  onClick={() => { setRedigerId(m.id); setRedNavn(m.name); setRedEpost(m.email || ''); }}
                  className="rounded-lg p-2 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => slettPerson(m)} className="rounded-lg p-2 text-[#bbb] hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div
        className="shrink-0 border-t border-black/[0.06] px-5 py-4"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Legg til person</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn"
            data-testid="member-name-input"
            className="min-w-0 rounded-xl bg-[#f4f3f1] px-3.5 py-3 text-[14px] outline-none placeholder:text-[#bbb] focus:ring-2 focus:ring-[#cf97fc]/40 sm:py-2.5 sm:text-[13.5px]"
          />
          <input
            value={epost} onChange={(e) => setEpost(e.target.value)} placeholder="E-post (for varsler)"
            onKeyDown={(e) => { if (e.key === 'Enter') leggTil(); }}
            data-testid="member-email-input"
            className="min-w-0 rounded-xl bg-[#f4f3f1] px-3.5 py-3 text-[14px] outline-none placeholder:text-[#bbb] focus:ring-2 focus:ring-[#cf97fc]/40 sm:py-2.5 sm:text-[13.5px]"
          />
          <button
            onClick={leggTil}
            disabled={!navn.trim() || lagrer}
            data-testid="member-add-btn"
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#0a0a0a] px-4 text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40 sm:h-auto sm:w-[46px] sm:px-0"
          >
            {lagrer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-[18px] h-[18px]" />}
            <span className="text-[14px] font-semibold sm:hidden">Legg til</span>
          </button>
        </div>
      </div>
    </Overlegg>
  );
}
