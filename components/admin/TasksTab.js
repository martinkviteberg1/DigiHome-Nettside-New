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
  ClipboardCheck, UserPlus, Repeat, Paperclip, Archive, ArchiveRestore,
  Download, KeyRound, Circle, Table2, CalendarRange, ArrowUpDown, User,
  MoreHorizontal, Send, Maximize2, Minimize2,
} from 'lucide-react';

const VISNINGER = [
  { k: 'tavle', l: 'Tavle', icon: LayoutGrid },
  { k: 'liste', l: 'Liste', icon: List },
  { k: 'tabell', l: 'Tabell', icon: Table2 },
  { k: 'tidslinje', l: 'Tidslinje', icon: CalendarRange },
  { k: 'arkiv', l: 'Arkiv', icon: Archive },
];

const REC_VALG = [
  { k: '', l: 'Gjentas ikke' },
  { k: 'weekly', l: 'Ukentlig' },
  { k: 'monthly', l: 'Månedlig' },
  { k: 'quarterly', l: 'Kvartalsvis' },
];

const ROLLE_LABEL = { owner: 'Eier', admin: 'Admin', bruker: 'Bruker' };

function fmtStr(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

function fmtDatoLang(iso) {
  try {
    const s = new Date(`${iso}T12:00:00`).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch (e) { return iso; }
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

// Linear-inspirert prioritetsikon: signalbarer i stedet for tekst-chip.
function PriIkon({ p, size = 13 }) {
  const pri = PRI[p] || PRI[2];
  const fylt = p === 1 ? 3 : p === 2 ? 2 : 1;
  return (
    <span title={`${pri.l} · ${pri.full}`} className="inline-flex shrink-0 items-end gap-[2px]" style={{ height: size }} aria-label={`Prioritet ${pri.full}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className="w-[3px] rounded-[1px] transition-colors" style={{ height: `${Math.round((i / 3) * size)}px`, background: i <= fylt ? pri.farge : '#e5e2dc' }} />
      ))}
    </span>
  );
}

// Kakestykke-path for delvis fylte statussirkler
function piePath(cx, cy, r, pct) {
  const ang = pct * Math.PI * 2 - Math.PI / 2;
  const x = cx + r * Math.cos(ang);
  const y = cy + r * Math.sin(ang);
  const stor = pct > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${stor} 1 ${x} ${y} Z`;
}

/* Linear-signaturen: status som progresjonssirkel.
   Innboks = stiplet ring, Pågår = halvfylt, Venter = kvartfylt, Ferdig = fylt m/ hake. */
function StatusIkon({ status, size = 14 }) {
  const st = STATUSER.find((s) => s.k === status) || STATUSER[0];
  const c = st.farge;
  if (status === 'done') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" className="shrink-0" aria-label={st.l}>
        <circle cx="7" cy="7" r="6.2" fill={c} />
        <path d="M4.3 7.2l1.9 1.9 3.5-4" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const fyll = status === 'doing' ? 0.5 : status === 'waiting' ? 0.25 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className="shrink-0" aria-label={st.l}>
      <circle cx="7" cy="7" r="5.4" fill="none" stroke={c} strokeWidth="1.7" strokeDasharray={status === 'inbox' ? '2.4 2.1' : undefined} strokeLinecap="round" />
      {fyll > 0 && <path d={piePath(7, 7, 3.1, fyll)} fill={c} />}
    </svg>
  );
}


// Tastatur-kbd i hint-raden
function Kbd({ children }) {
  return <kbd className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#999] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">{children}</kbd>;
}

// Statusbadge med Linear-progresjonssirkel
function StatusBadge({ status }) {
  const st = STATUSER.find((s) => s.k === status) || STATUSER[0];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-black/[0.06] bg-white px-2 py-0.5 text-[11.5px] font-semibold text-[#444]">
      <StatusIkon status={status} size={11} />
      {st.l}
    </span>
  );
}

/* Meny — Linear-style popover-dropdown som erstatter native <select>.
   options: [{ v, l, icon?, dot?, avatar?, sub? }] */
function Meny({ value, options, onChange, placeholder, compact, testid, className = '', menyBredde = 220, oppover }) {
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
  const Ikon = valgt && valgt.icon;

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid={testid}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-1.5 rounded-lg border bg-white text-left transition-all ${
          open ? 'border-[#8b5cf6]/50 ring-2 ring-[#8b5cf6]/15' : 'border-black/[0.08] hover:border-black/[0.16]'
        } ${compact ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3 text-[13px]'}`}
      >
        {valgt && valgt.dot && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: valgt.dot }} />}
        {valgt && valgt.avatar && <Avatar member={valgt.avatar} size={18} />}
        {Ikon && <Ikon className="h-3.5 w-3.5 shrink-0 text-[#888]" />}
        <span className={`min-w-0 flex-1 truncate font-medium ${valgt ? 'text-[#333]' : 'text-[#aaa]'}`}>{valgt ? valgt.l : placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#b5b5b5] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className={`dh-fade absolute left-0 z-[130] max-h-[280px] overflow-y-auto rounded-xl border border-black/[0.07] bg-white p-1 shadow-[0_16px_48px_rgba(0,0,0,0.16)] ${oppover ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          style={{ minWidth: Math.max(menyBredde, 160) }}
        >
          {options.map((o) => {
            const OIkon = o.icon;
            const aktiv = String(o.v) === String(value ?? '');
            return (
              <button
                key={String(o.v)}
                type="button"
                role="option"
                aria-selected={aktiv}
                onClick={() => { onChange(o.v); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  aktiv ? 'bg-[#f4f0fb] text-[#1a1a1a]' : 'text-[#444] hover:bg-[#f7f6f4]'
                }`}
              >
                {o.dot && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: o.dot }} />}
                {o.avatar && <Avatar member={o.avatar} size={20} />}
                {OIkon && <OIkon className="h-3.5 w-3.5 shrink-0 text-[#888]" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-tight">{o.l}</span>
                  {o.sub && <span className="block truncate text-[11px] text-[#aaa]">{o.sub}</span>}
                </span>
                {aktiv && <Check className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
  const [fokusId, setFokusId] = useState(null);
  const [valgteIds, setValgteIds] = useState([]);
  const [sortKey, setSortKey] = useState('due');
  const [sortDir, setSortDir] = useState(1);
  const [toast, setToast] = useState(null);
  const [arkivTasks, setArkivTasks] = useState([]);
  const [arkivLaster, setArkivLaster] = useState(false);
  const toastTimer = useRef(0);

  const actor = (user && (user.name || user.email)) || 'Admin';
  const erBrukerRolle = !!(user && user.role === 'bruker');

  // «Mine saker»: koble innlogget konto til person-listen via e-post.
  const minId = useMemo(() => {
    const epost = ((user && user.email) || '').toLowerCase();
    if (!epost) return null;
    const m = members.find((x) => (x.email || '').toLowerCase() === epost);
    return m ? m.id : null;
  }, [members, user]);

  const [mine, setMine] = useState(false);
  useEffect(() => {
    try { setMine(localStorage.getItem('dh_tasks_mine') === '1'); } catch (e) {}
  }, []);
  const toggleMine = useCallback(() => {
    setMine((v) => {
      const n = !v;
      try { localStorage.setItem('dh_tasks_mine', n ? '1' : '0'); } catch (e) {}
      return n;
    });
  }, []);

  const visToast = useCallback((msg, type = 'ok', handling = null) => {
    setToast({ msg, type, handling });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), handling ? 6000 : 2600);
  }, []);

  // Øyeblikksbilder for angre-sletting og bulk-operasjoner
  const tasksRef = useRef([]);
  const arkivRef = useRef([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { arkivRef.current = arkivTasks; }, [arkivTasks]);

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

  // Arkivet lastes når man åpner arkiv-visningen
  const lastArkiv = useCallback(async () => {
    setArkivLaster(true);
    try {
      const r = await api('tasks?arkiv=1');
      const j = await r.json();
      if (j.ok) setArkivTasks(j.tasks || []);
    } catch (e) {}
    setArkivLaster(false);
  }, [api]);

  useEffect(() => { if (view === 'arkiv') lastArkiv(); }, [view, lastArkiv]);

  // N = ny sak, M = mine saker (når man ikke skriver i et felt og ingenting annet er åpent)
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (nyOpen || valgtId || personerOpen) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setNyOpen(true); return; }
      if ((e.key === 'm' || e.key === 'M') && minId) { e.preventDefault(); toggleMine(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nyOpen, valgtId, personerOpen, minId, toggleMine]);

  const medlem = useCallback((id) => members.find((m) => m.id === id) || null, [members]);

  // ⌘K-paletten fjernstyrer Saker via window-events (dispatches fra admin-siden)
  useEffect(() => {
    const onCmd = (e) => {
      const d = (e && e.detail) || {};
      if (d.do === 'ny') setNyOpen(true);
      else if (d.do === 'mine' && minId) toggleMine();
      else if (d.do === 'personer') setPersonerOpen(true);
      else if (d.do === 'view' && d.view) setView(d.view);
      else if (d.do === 'aapne' && d.id) {
        // Åpne en spesifikk sak (f.eks. aksjonspunkt fra Møter). Arkiverte
        // saker krever arkivvisningen — skuffen åpnes når listen er lastet.
        if (d.arkivert) setView('arkiv');
        setValgtId(String(d.id));
      }
    };
    window.addEventListener('dh:saker', onCmd);
    return () => window.removeEventListener('dh:saker', onCmd);
  }, [minId, toggleMine]);

  // Stille synk: hold tavlen fersk når flere jobber samtidig.
  // Hopper over midt i drag og mens en angre-sletting venter.
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (dragId || pendingSlett.current) return;
      last();
    }, 30000);
    return () => window.clearInterval(iv);
  }, [last, dragId]);

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
      setTasks((prev) => {
        let neste = prev.map((t) => (t.id === id ? j.task : t)).filter((t) => !t.archived);
        // Gjentakende sak fullført → neste forekomst dukker opp umiddelbart
        if (j.nesteTask && !neste.some((t) => t.id === j.nesteTask.id)) neste = [j.nesteTask, ...neste];
        meldStats(neste, today);
        return neste;
      });
      if (j.nesteTask) visToast('Fullført — neste forekomst opprettet');
      else if (j.task && j.task.archived) visToast('Sak arkivert');
      else if (j.emailed && !stille) visToast('Lagret — e-postvarsel sendt', 'ok');
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

  // --- Sletting med Angre (Linear-style: ingen bekreftelsesdialog) ---
  // Saken fjernes umiddelbart fra UI; selve DELETE utsettes 6 s slik at
  // «Angre» i toasten kan hente den tilbake uten datatap.
  const pendingSlett = useRef(null);

  const utforPendingSlett = useCallback(() => {
    const p = pendingSlett.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pendingSlett.current = null;
    p.tasks.forEach((t) => { api(`tasks/${t.id}`, { method: 'DELETE' }).catch(() => {}); });
  }, [api]);

  const angreSlett = useCallback(() => {
    const p = pendingSlett.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pendingSlett.current = null;
    const aktive = p.tasks.filter((t) => !t.archived);
    const arkiverte = p.tasks.filter((t) => t.archived);
    if (aktive.length) setTasks((prev) => { const neste = [...aktive, ...prev]; meldStats(neste, today); return neste; });
    if (arkiverte.length) setArkivTasks((prev) => [...arkiverte, ...prev]);
    visToast(p.tasks.length === 1 ? 'Saken er gjenopprettet' : 'Sakene er gjenopprettet');
  }, [meldStats, today, visToast]);

  const slettMedAngre = useCallback((ids) => {
    utforPendingSlett(); // maks én angre-buffer om gangen
    const idSet = new Set(ids);
    const alle = [
      ...tasksRef.current.filter((t) => idSet.has(t.id)),
      ...arkivRef.current.filter((t) => idSet.has(t.id)),
    ];
    if (!alle.length) return;
    setValgtId(null);
    setTasks((prev) => { const neste = prev.filter((t) => !idSet.has(t.id)); meldStats(neste, today); return neste; });
    setArkivTasks((prev) => prev.filter((t) => !idSet.has(t.id)));
    pendingSlett.current = { tasks: alle, timer: window.setTimeout(utforPendingSlett, 6000) };
    visToast(
      alle.length === 1 ? 'Sak slettet' : `${alle.length} saker slettet`,
      'ok',
      { label: 'Angre', onClick: angreSlett },
    );
  }, [angreSlett, meldStats, today, utforPendingSlett, visToast]);

  const slett = useCallback((id) => slettMedAngre([id]), [slettMedAngre]);

  // --- Multi-select: bulk-endring og markering ---
  const toggleValg = useCallback((id) => {
    setValgteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const bulkPatch = useCallback((patch) => {
    const ids = [...valgteIds];
    setValgteIds([]);
    // notify:false — bulk-operasjoner skal ikke utløse e-postregn
    ids.forEach((id) => oppdater(id, { ...patch, notify: false }, { stille: true }));
    visToast(`${ids.length} ${ids.length === 1 ? 'sak' : 'saker'} oppdatert`);
  }, [valgteIds, oppdater, visToast]);

  // Utfør ventende sletting hvis komponenten demonteres midt i angrefristen
  useEffect(() => () => {
    const p = pendingSlett.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pendingSlett.current = null;
    p.tasks.forEach((t) => {
      try { fetch(`/api/admin/tasks/${t.id}?key=${encodeURIComponent(apiKey)}`, { method: 'DELETE', keepalive: true }); } catch (e) {}
    });
  }, [apiKey]);

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

  // --- Arkiv: gjenopprett / slett permanent ---
  const gjenopprett = useCallback(async (id) => {
    try {
      const r = await api(`tasks/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false, actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke gjenopprette');
      setArkivTasks((prev) => prev.filter((t) => t.id !== id));
      visToast('Sak gjenopprettet fra arkivet');
      last();
    } catch (e) { visToast(e.message, 'feil'); }
  }, [api, actor, last, visToast]);

  const slettFraArkiv = useCallback((id) => slettMedAngre([id]), [slettMedAngre]);

  // --- Filtrering ---
  const filtrert = useMemo(() => {
    const s = sok.trim().toLowerCase();
    return tasks.filter((t) => {
      if (mine && minId && t.assigneeId !== minId && !(t.followers || []).includes(minId)) return false;
      if (fAnsvarlig !== 'alle' && (t.assigneeId || '') !== fAnsvarlig) return false;
      if (fPri && t.priority !== fPri) return false;
      if (s && !`${t.title} ${t.description} ${(t.labels || []).join(' ')}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [tasks, mine, minId, fAnsvarlig, fPri, sok]);

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

  // Linear-navigasjon: flat rekkefølge i samme rekkefølge som aktiv visning.
  const tabellData = useMemo(() => {
    const idxStatus = (t) => STATUSER.findIndex((s) => s.k === t.status);
    const cmp = {
      pri: (a, b) => a.priority - b.priority,
      tittel: (a, b) => a.title.localeCompare(b.title, 'nb'),
      status: (a, b) => idxStatus(a) - idxStatus(b),
      ansvarlig: (a, b) => ((medlem(a.assigneeId) || {}).name || 'øøø').localeCompare((medlem(b.assigneeId) || {}).name || 'øøø', 'nb'),
      due: (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
      oppdatert: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    }[sortKey] || (() => 0);
    return [...filtrert].sort((a, b) => cmp(a, b) * sortDir);
  }, [filtrert, sortKey, sortDir, medlem]);

  const sorterEtter = (k) => {
    if (sortKey === k) setSortDir((d) => -d);
    else { setSortKey(k); setSortDir(1); }
  };

  // Tidslinje: saker gruppert per frist-dato (stigende), uten frist til slutt.
  const tidslinjeData = useMemo(() => {
    const datoer = new Map();
    const uten = [];
    filtrert.forEach((t) => {
      if (!t.dueDate) { uten.push(t); return; }
      if (!datoer.has(t.dueDate)) datoer.set(t.dueDate, []);
      datoer.get(t.dueDate).push(t);
    });
    const grupper = [...datoer.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    grupper.forEach(([, arr]) => arr.sort((a, b) => a.priority - b.priority));
    return { grupper, uten };
  }, [filtrert]);

  const flatListe = useMemo(() => {
    if (view === 'tabell') return tabellData;
    if (view === 'tidslinje') return [...tidslinjeData.grupper.flatMap(([, arr]) => arr), ...tidslinjeData.uten];
    return STATUSER.flatMap((st) => perStatus[st.k]);
  }, [view, tabellData, tidslinjeData, perStatus]);

  useEffect(() => {
    const onKey = (e) => {
      if (nyOpen || valgtId || personerOpen || view === 'arkiv') return;
      const mål = e.target;
      if (mål && ['INPUT', 'TEXTAREA', 'SELECT'].includes(mål.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (!['arrowdown', 'arrowup', 'j', 'k', 'enter', 'escape', 'x'].includes(k)) return;
      if (k === 'escape') {
        // Esc rydder markeringen først, deretter fokus
        setValgteIds((prev) => {
          if (prev.length) return [];
          setFokusId(null);
          return prev;
        });
        return;
      }
      if (k === 'x') {
        if (fokusId) {
          e.preventDefault();
          setValgteIds((prev) => (prev.includes(fokusId) ? prev.filter((x) => x !== fokusId) : [...prev, fokusId]));
        }
        return;
      }
      if (!flatListe.length) return;
      const idx = flatListe.findIndex((x) => x.id === fokusId);
      if (k === 'enter') {
        if (idx >= 0) { e.preventDefault(); setValgtId(flatListe[idx].id); }
        return;
      }
      e.preventDefault();
      const frem = k === 'arrowdown' || k === 'j';
      const neste = frem
        ? flatListe[Math.min(idx + 1, flatListe.length - 1)]
        : flatListe[Math.max(idx - 1, 0)];
      if (neste) {
        setFokusId(neste.id);
        // Shift + navigasjon utvider markeringen (Linear-style)
        if (e.shiftKey) {
          setValgteIds((prev) => {
            const s = new Set(prev);
            if (fokusId) s.add(fokusId);
            s.add(neste.id);
            return [...s];
          });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flatListe, fokusId, nyOpen, valgtId, personerOpen, view]);

  // Hold det fokuserte kortet synlig
  useEffect(() => {
    if (!fokusId) return;
    const el = document.querySelector(`[data-fokus-id="${fokusId}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [fokusId]);

  const valgt = valgtId ? (tasks.find((t) => t.id === valgtId) || arkivTasks.find((t) => t.id === valgtId)) : null;
  const tomt = !laster && tasks.length === 0;

  if (laster) {
    return (
      <div data-testid="tasks-skeleton">
        <div className="mb-5 flex items-center gap-2">
          {[72, 84, 64, 120].map((w, i) => (
            <div key={i} className="h-8 animate-pulse rounded-full bg-black/[0.05]" style={{ width: w }} />
          ))}
          <div className="ml-auto hidden h-9 w-72 animate-pulse rounded-lg bg-black/[0.05] lg:block" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="rounded-2xl bg-[#f0efec] p-2">
              <div className="mx-2 my-2.5 h-4 w-24 animate-pulse rounded bg-black/[0.06]" />
              <div className="space-y-2">
                {Array.from({ length: 3 - (k % 2) }).map((_, i) => (
                  <div key={i} className="h-[78px] animate-pulse rounded-xl bg-white/80" style={{ animationDelay: `${(k * 2 + i) * 120}ms` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="tasks-tab">
      {/* ═══ Toppstripe ═══ */}
      <div className="mb-4 md:mb-5">
        <div className="flex items-center gap-2">
          {/* Sammendrag — sveipbart ved plassmangel, alle brekkpunkter */}
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5">
            <SummaryChip label="Åpne" value={stats.aapne} />
            <SummaryChip label="Forfalt" value={stats.forfalt} warn={stats.forfalt > 0} testid="tasks-overdue-chip" />
            <SummaryChip label="I dag" value={stats.iDag} />
            <SummaryChip label="Ferdig siste 7 d" value={stats.ferdig7d} good />
          </div>

          {/* Desktop-verktøy — Linear-style: hairline-borders, popover-menyer */}
          <div className="ml-auto hidden shrink min-w-0 flex-wrap items-center justify-end gap-2 lg:flex">
            {minId && (
              <button
                onClick={toggleMine}
                data-testid="tasks-mine-btn"
                title="Vis bare saker der du er ansvarlig eller følger — hurtigtast M"
                className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-all active:scale-[0.97] ${
                  mine
                    ? 'border-[#8b5cf6]/40 bg-[#f4f0fb] text-[#6d28d9]'
                    : 'border-black/[0.08] bg-white text-[#555] hover:border-black/[0.16] hover:text-[#0a0a0a]'
                }`}
              >
                <User className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Mine saker</span><span className="xl:hidden">Mine</span>
                {mine && <X className="w-3 h-3" />}
              </button>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b5b5b5]" />
              <input
                value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk i saker …"
                data-testid="tasks-search"
                className="h-9 w-32 rounded-lg border border-black/[0.08] bg-white pl-8 pr-3 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15 focus:w-48 xl:w-36"
              />
            </div>
            <Meny
              value={fAnsvarlig} onChange={setFAnsvarlig} testid="tasks-filter-assignee" className="w-40"
              options={[{ v: 'alle', l: 'Alle ansvarlige', icon: Users }, ...members.map((m) => ({ v: m.id, l: m.name, avatar: m }))]}
            />
            <Meny
              value={fPri} onChange={(v) => setFPri(Number(v))} className="w-36" testid="tasks-filter-priority"
              options={[
                { v: 0, l: 'Alle prioriteter', icon: ArrowUpDown },
                { v: 1, l: 'P1 · Kritisk', dot: '#e11d48' },
                { v: 2, l: 'P2 · Normal', dot: '#b45309' },
                { v: 3, l: 'P3 · Lav', dot: '#6b7280' },
              ]}
            />
            <div className="flex rounded-lg border border-black/[0.08] bg-white p-0.5">
              {VISNINGER.map((v) => (
                <ViewBtn key={v.k} active={view === v.k} onClick={() => setView(v.k)} icon={v.icon} label={v.l} testid={`tasks-view-${v.k}`} />
              ))}
            </div>
            <button
              onClick={() => setPersonerOpen(true)}
              data-testid="tasks-members-btn"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 text-[13px] font-medium text-[#555] transition-all hover:border-black/[0.16] hover:text-[#0a0a0a]"
            >
              <Users className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Personer</span>
            </button>
            <button
              onClick={() => setNyOpen(true)}
              data-testid="tasks-new-btn"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
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
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-10 pr-3 text-[15px] outline-none transition-all placeholder:text-[#bbb] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={fAnsvarlig} onChange={(e) => setFAnsvarlig(e.target.value)}
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13.5px] outline-none"
            >
              <option value="alle">Alle ansvarlige</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              value={fPri} onChange={(e) => setFPri(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13.5px] outline-none"
            >
              <option value={0}>Alle prioriteter</option>
              <option value={1}>P1 · Kritisk</option>
              <option value={2}>P2 · Normal</option>
              <option value={3}>P3 · Lav</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-11 items-center rounded-xl border border-black/[0.08] bg-white p-1">
              {VISNINGER.map((v) => (
                <ViewBtn key={v.k} active={view === v.k} onClick={() => setView(v.k)} icon={v.icon} label={v.l} />
              ))}
            </div>
            {minId && (
              <button
                onClick={toggleMine}
                data-testid="tasks-mine-btn-mobile"
                className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium transition-all ${
                  mine ? 'border-[#8b5cf6]/40 bg-[#f4f0fb] text-[#6d28d9]' : 'border-black/[0.08] bg-white text-[#555]'
                }`}
              >
                <User className="w-4 h-4" /> Mine
              </button>
            )}
            <button
              onClick={() => setPersonerOpen(true)}
              className="ml-auto flex h-11 items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-4 text-[13.5px] font-medium text-[#555]"
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
      {tomt && view !== 'arkiv' && (
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
            const liste = perStatus[st.k];
            const drarOver = hoverKol === st.k && dragId;
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
                className={`w-[82vw] shrink-0 snap-center rounded-2xl p-2 transition-all sm:w-[320px] md:w-auto md:shrink md:snap-align-none ${
                  drarOver
                    ? 'bg-[#efe9fb] ring-2 ring-inset ring-[#8b5cf6]/35'
                    : dragId
                      ? 'bg-[#f0efec] ring-1 ring-inset ring-[#8b5cf6]/15'
                      : 'bg-[#f0efec]'
                }`}
                data-testid={`tasks-col-${st.k}`}
              >
                <div className="flex items-center gap-2 px-2 py-2">
                  <StatusIkon status={st.k} size={15} />
                  <span className="text-[12.5px] font-bold text-[#333]" style={heading}>{st.l}</span>
                  <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[10.5px] font-bold text-[#888] tabular-nums">{liste.length}</span>
                  <button
                    onClick={() => setNyOpen(st.k)}
                    title={`Ny sak i ${st.l}`}
                    data-testid={`col-add-${st.k}`}
                    className="ml-auto rounded-md p-1 text-[#b5b5b5] transition-colors hover:bg-black/[0.06] hover:text-[#333]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 min-h-[64px]">
                  {liste.map((t, i) => (
                    <SakKort
                      key={t.id} t={t} today={today} member={medlem(t.assigneeId)}
                      dras={dragId === t.id} fokus={fokusId === t.id} valgt={valgteIds.includes(t.id)} index={i}
                      onClick={(e) => { if (e && (e.metaKey || e.ctrlKey)) { toggleValg(t.id); } else { setValgtId(t.id); } }}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onHurtig={(patch) => oppdater(t.id, patch)}
                      onSlett={() => slett(t.id)}
                    />
                  ))}
                  {!liste.length && (
                    <button
                      onClick={() => setNyOpen(st.k)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed px-2 py-6 text-[12px] font-medium transition-colors ${
                        drarOver
                          ? 'border-[#8b5cf6]/50 bg-white/60 text-[#8b5cf6]'
                          : 'border-black/[0.08] text-[#b0aca6] hover:border-black/[0.18] hover:text-[#777]'
                      }`}
                    >
                      {dragId ? 'Slipp her' : (<><Plus className="h-3.5 w-3.5" /> Ny sak</>)}
                    </button>
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
            return (
              <div key={st.k}>
                <div className="flex items-center gap-2 border-b border-black/[0.05] bg-[#fafaf8] px-4 py-2">
                  <StatusIkon status={st.k} size={13} />
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#666]">{st.l}</span>
                  <span className="text-[11px] text-[#aaa] tabular-nums">{liste.length}</span>
                </div>
                {liste.map((t) => {
                  const m = medlem(t.assigneeId);
                  return (
                    <button
                      key={t.id}
                      onClick={(e) => { if (e.metaKey || e.ctrlKey) { toggleValg(t.id); } else { setValgtId(t.id); } }}
                      className={`flex w-full items-center gap-2.5 border-b border-black/[0.04] px-4 py-3 text-left transition-colors hover:bg-[#faf8fd] active:bg-[#f6f2fc] sm:gap-3 sm:py-2.5 ${valgteIds.includes(t.id) || fokusId === t.id ? 'bg-[#f4f0fb] ring-2 ring-inset ring-[#8b5cf6]/40' : ''}`}
                      data-testid={`task-row-${t.id}`}
                      data-fokus-id={t.id}
                    >
                      <PriIkon p={t.priority} />
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

      {/* ═══ Tabell — sorterbar, tett oversikt ═══ */}
      {!tomt && view === 'tabell' && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="tasks-table">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#fafaf8]">
                <SortTh k="pri" label="Pri" sortKey={sortKey} sortDir={sortDir} onSort={sorterEtter} w="64px" />
                <SortTh k="tittel" label="Sak" sortKey={sortKey} sortDir={sortDir} onSort={sorterEtter} />
                <SortTh k="status" label="Status" sortKey={sortKey} sortDir={sortDir} onSort={sorterEtter} w="118px" />
                <SortTh k="ansvarlig" label="Ansvarlig" sortKey={sortKey} sortDir={sortDir} onSort={sorterEtter} w="170px" />
                <SortTh k="due" label="Frist" sortKey={sortKey} sortDir={sortDir} onSort={sorterEtter} w="136px" />
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#999]" style={{ width: '130px' }}>Fremdrift</th>
                <SortTh k="oppdatert" label="Oppdatert" sortKey={sortKey} sortDir={sortDir} onSort={sorterEtter} w="128px" />
              </tr>
            </thead>
            <tbody>
              {tabellData.map((t) => {
                const m = medlem(t.assigneeId);
                const sub = t.subtasks || [];
                const subFerdig = sub.filter((s) => s.done).length;
                return (
                  <tr
                    key={t.id}
                    onClick={(e) => { if (e.metaKey || e.ctrlKey) { toggleValg(t.id); } else { setValgtId(t.id); } }}
                    data-testid={`table-row-${t.id}`}
                    data-fokus-id={t.id}
                    className={`cursor-pointer border-b border-black/[0.04] transition-colors last:border-0 hover:bg-[#faf8fd] ${valgteIds.includes(t.id) ? 'bg-[#f4f0fb]' : fokusId === t.id ? 'bg-[#f4f0fb]' : ''}`}
                  >
                    <td className="px-4 py-2.5"><PriIkon p={t.priority} /></td>
                    <td className="max-w-0 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`truncate text-[13.5px] font-medium ${t.status === 'done' ? 'text-[#9a9a9a] line-through' : 'text-[#1a1a1a]'}`}>{t.title}</span>
                        {t.recurrence && <Repeat className="h-3 w-3 shrink-0 text-[#b5b5b5]" />}
                        {(t.labels || []).slice(0, 2).map((l) => (
                          <span key={l} className="hidden shrink-0 rounded-md bg-[#f4f0fb] px-1.5 py-0.5 text-[10.5px] font-medium text-[#8b5cf6] xl:inline">{l}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-2.5">
                      {m ? (
                        <span className="flex items-center gap-2 min-w-0"><Avatar member={m} size={22} /><span className="truncate text-[13px] text-[#444]">{m.name}</span></span>
                      ) : <span className="text-[12.5px] text-[#c5c5c5]">—</span>}
                    </td>
                    <td className="px-4 py-2.5"><DueChip due={t.dueDate} today={today} done={t.status === 'done'} /></td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5 text-[11px] text-[#aaa]">
                        {sub.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1 w-9 overflow-hidden rounded-full bg-[#eee]">
                              <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(subFerdig / sub.length) * 100}%` }} />
                            </span>
                            <span className="tabular-nums">{subFerdig}/{sub.length}</span>
                          </span>
                        )}
                        {(t.attachments || []).length > 0 && <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{t.attachments.length}</span>}
                        {(t.comments || []).length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{t.comments.length}</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-[#999]">{fmtTid(t.updatedAt)}</td>
                  </tr>
                );
              })}
              {!tabellData.length && (
                <tr><td colSpan={7} className="py-14 text-center text-[13.5px] text-[#aaa]">Ingen saker matcher filtrene.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Tidslinje — saker langs fristene ═══ */}
      {!tomt && view === 'tidslinje' && (
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-7" data-testid="tasks-timeline">
          {!tidslinjeData.grupper.length && !tidslinjeData.uten.length && (
            <p className="py-10 text-center text-[13.5px] text-[#aaa]">Ingen saker matcher filtrene.</p>
          )}
          <div>
            {tidslinjeData.grupper.map(([dato, saker], gi) => {
              const forfalt = dato < today && saker.some((t) => t.status !== 'done');
              const iDag = dato === today;
              return (
                <div key={dato} className={`relative border-l-2 pl-6 ${gi === tidslinjeData.grupper.length - 1 && !tidslinjeData.uten.length ? 'pb-1' : 'pb-7'} ${forfalt ? 'border-rose-200' : 'border-[#eee]'}`} data-testid={`timeline-group-${dato}`}>
                  <span className={`absolute -left-[7px] top-0.5 h-3 w-3 rounded-full ring-4 ring-white ${forfalt ? 'bg-rose-500' : iDag ? 'bg-amber-400' : 'bg-[#cf97fc]'}`} />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-[13.5px] font-bold text-[#0a0a0a]" style={heading}>{fmtDatoLang(dato)}</p>
                    {forfalt && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-600">Forfalt</span>}
                    {iDag && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700">I dag</span>}
                    <span className="text-[11px] text-[#b5b5b5]">{saker.length} {saker.length === 1 ? 'sak' : 'saker'}</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {saker.map((t) => <TidslinjeRad key={t.id} t={t} member={medlem(t.assigneeId)} fokus={fokusId === t.id} onClick={() => setValgtId(t.id)} />)}
                  </div>
                </div>
              );
            })}
            {tidslinjeData.uten.length > 0 && (
              <div className="relative border-l-2 border-dashed border-[#e5e2dc] pl-6" data-testid="timeline-no-due">
                <span className="absolute -left-[7px] top-0.5 h-3 w-3 rounded-full bg-[#d5d2cc] ring-4 ring-white" />
                <div className="flex items-baseline gap-2">
                  <p className="text-[13.5px] font-bold text-[#777]" style={heading}>Uten frist</p>
                  <span className="text-[11px] text-[#b5b5b5]">{tidslinjeData.uten.length} {tidslinjeData.uten.length === 1 ? 'sak' : 'saker'}</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {tidslinjeData.uten.map((t) => <TidslinjeRad key={t.id} t={t} member={medlem(t.assigneeId)} fokus={fokusId === t.id} onClick={() => setValgtId(t.id)} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Arkiv — ferdige saker som er lagt bort ═══ */}
      {view === 'arkiv' && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="tasks-archive">
          {arkivLaster && (
            <div className="flex items-center justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-[#cf97fc]" /></div>
          )}
          {!arkivLaster && !arkivTasks.length && (
            <div className="py-14 text-center">
              <Archive className="mx-auto h-8 w-8 text-[#d5d2cc]" />
              <p className="mt-3 text-[13.5px] text-[#aaa]">Arkivet er tomt — ferdige saker kan arkiveres fra sak-skuffen.</p>
            </div>
          )}
          {!arkivLaster && arkivTasks.map((t) => {
            const m = medlem(t.assigneeId);
            return (
              <div key={t.id} className="flex items-center gap-3 border-b border-black/[0.04] px-4 py-3 last:border-0" data-testid={`archive-row-${t.id}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-[#555]">{t.title}</p>
                  <p className="text-[11.5px] text-[#b0aca6]">
                    {t.completedAt ? `Ferdig ${fmtTid(t.completedAt)}` : `Oppdatert ${fmtTid(t.updatedAt)}`}
                    {m ? ` · ${m.name}` : ''}
                  </p>
                </div>
                <button onClick={() => gjenopprett(t.id)} title="Gjenopprett" data-testid={`archive-restore-${t.id}`} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#f4f0fb] px-3.5 text-[12px] font-semibold text-[#8b5cf6] transition-colors hover:bg-[#ece4fa]">
                  <ArchiveRestore className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Gjenopprett</span>
                </button>
                <button onClick={() => slettFraArkiv(t.id)} title="Slett permanent" className="shrink-0 rounded-lg p-2 text-[#ccc] transition-colors hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Hurtigtast-hint — kun desktop, Linear-style ═══ */}
      {!tomt && view !== 'arkiv' && (
        <div className="mt-4 hidden select-none items-center gap-4 text-[11px] text-[#b0aca6] lg:flex" data-testid="tasks-shortcuts-hint">
          <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> naviger</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> åpne sak</span>
          <span className="flex items-center gap-1.5"><Kbd>N</Kbd> ny sak</span>
          <span className="flex items-center gap-1.5"><Kbd>M</Kbd> mine saker</span>
          <span className="flex items-center gap-1.5"><Kbd>X</Kbd> marker</span>
          <span className="flex items-center gap-1.5"><Kbd>⇧↑↓</Kbd> utvid markering</span>
          <span className="flex items-center gap-1.5"><Kbd>1–4</Kbd> status i åpen sak</span>
          <span className="flex items-center gap-1.5"><Kbd>P</Kbd> prioritet i åpen sak</span>
          <span className="flex items-center gap-1.5"><Kbd>esc</Kbd> lukk</span>
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
          apiKey={apiKey} api={api} visToast={visToast} onReload={last}
          onClose={() => setValgtId(null)}
          onPatch={(patch) => oppdater(valgt.id, patch)}
          onComment={(text) => kommenter(valgt.id, text)}
          onRemind={() => purr(valgt.id)}
          onDelete={() => slett(valgt.id)}
          onArchive={() => { setValgtId(null); oppdater(valgt.id, { archived: true }); }}
        />
      )}

      {/* ═══ Ny sak ═══ */}
      {nyOpen && (
        <NySakModal
          members={members}
          defaultStatus={typeof nyOpen === 'string' ? nyOpen : 'inbox'}
          onClose={() => setNyOpen(false)}
          onCreate={async (payload) => { await opprett(payload); setNyOpen(false); }}
        />
      )}

      {/* ═══ Personer ═══ */}
      {personerOpen && (
        <PersonerModal
          api={api} members={members} setMembers={setMembers} erBruker={erBrukerRolle}
          onClose={() => setPersonerOpen(false)} visToast={visToast}
        />
      )}

      {/* ═══ Bulk-handlinger — vises når saker er markert (X / Cmd-klikk / Shift+piler) ═══ */}
      {valgteIds.length > 0 && (
        <div
          className="dh-pop fixed bottom-24 left-1/2 z-[118] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-black/[0.08] bg-white py-2 pl-2.5 pr-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.2)] lg:bottom-6"
          data-testid="bulk-bar"
        >
          <span className="rounded-lg bg-[#f4f0fb] px-2 py-1 text-[12px] font-bold tabular-nums text-[#6d28d9]">{valgteIds.length} valgt</span>
          <Meny
            compact oppover value="" placeholder="Sett status" menyBredde={170} testid="bulk-status"
            options={STATUSER.map((s) => ({ v: s.k, l: s.l, dot: s.farge }))}
            onChange={(v) => bulkPatch({ status: v })}
            className="w-[126px]"
          />
          <Meny
            compact oppover value="" placeholder="Tildel" menyBredde={190} testid="bulk-assignee"
            options={[{ v: '__ingen', l: 'Ingen ansvarlig', icon: User }, ...members.map((m) => ({ v: m.id, l: m.name, avatar: m }))]}
            onChange={(v) => bulkPatch({ assigneeId: v === '__ingen' ? null : v })}
            className="w-[104px]"
          />
          <button
            onClick={() => { const ids = [...valgteIds]; setValgteIds([]); slettMedAngre(ids); }}
            data-testid="bulk-delete"
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Slett
          </button>
          <button onClick={() => setValgteIds([])} title="Avbryt markering (Esc)" className="rounded-lg p-1.5 text-[#999] transition-colors hover:bg-[#f3f2f0]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toast — over FAB-en på mobil */}
      {toast && (
        <div
          data-testid="tasks-toast"
          className={`fixed bottom-24 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full py-2.5 pl-4 pr-5 text-[13px] font-semibold text-white shadow-xl dh-fade lg:bottom-6 ${toast.type === 'feil' ? 'bg-rose-600' : 'bg-[#0a0a0a]'}`}
        >
          {toast.type === 'feil'
            ? <AlertTriangle className="h-4 w-4 shrink-0" />
            : <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
          {toast.msg}
          {toast.handling && (
            <button
              onClick={toast.handling.onClick}
              data-testid="toast-action"
              className="ml-1 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold text-white transition-colors hover:bg-white/25"
            >
              {toast.handling.label}
            </button>
          )}
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
      onClick={onClick} data-testid={testid} title={label}
      className={`flex h-[30px] items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-all ${
        active ? 'bg-[#0a0a0a] text-white shadow-sm' : 'text-[#777] hover:bg-black/[0.04] hover:text-[#0a0a0a]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> <span className="hidden 2xl:inline">{label}</span>
    </button>
  );
}

function SortTh({ k, label, sortKey, sortDir, onSort, w }) {
  const aktiv = sortKey === k;
  return (
    <th style={w ? { width: w } : undefined} className="px-4 py-2.5">
      <button
        onClick={() => onSort(k)}
        data-testid={`table-sort-${k}`}
        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors ${aktiv ? 'text-[#0a0a0a]' : 'text-[#999] hover:text-[#555]'}`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 transition-all ${aktiv ? 'text-[#8b5cf6]' : 'text-[#ccc]'} ${aktiv && sortDir < 0 ? 'rotate-180' : ''}`} />
      </button>
    </th>
  );
}

function TidslinjeRad({ t, member, fokus, onClick }) {
  const sub = t.subtasks || [];
  const subFerdig = sub.filter((s) => s.done).length;
  return (
    <button
      onClick={onClick}
      data-testid={`timeline-row-${t.id}`}
      data-fokus-id={t.id}
      className={`flex w-full items-center gap-2.5 rounded-xl border bg-[#fdfdfc] px-3 py-2 text-left transition-all hover:bg-white ${
        fokus ? 'border-[#8b5cf6]/50 ring-2 ring-[#8b5cf6]/15' : 'border-black/[0.05] hover:border-black/[0.14]'
      }`}
    >
      <PriIkon p={t.priority} />
      <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${t.status === 'done' ? 'text-[#9a9a9a] line-through' : 'text-[#1a1a1a]'}`}>{t.title}</span>
      {sub.length > 0 && (
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="h-1 w-8 overflow-hidden rounded-full bg-[#eee]">
            <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(subFerdig / sub.length) * 100}%` }} />
          </span>
          <span className="text-[10.5px] tabular-nums text-[#aaa]">{subFerdig}/{sub.length}</span>
        </span>
      )}
      {(t.attachments || []).length > 0 && <Paperclip className="hidden h-3 w-3 text-[#b5b5b5] sm:block" />}
      {t.recurrence && <Repeat className="hidden h-3 w-3 text-[#b5b5b5] sm:block" />}
      <span className="hidden sm:block"><StatusBadge status={t.status} /></span>
      {member && <Avatar member={member} size={22} />}
    </button>
  );
}

function SakKort({ t, today, member, dras, fokus, valgt, index = 0, onClick, onDragStart, onDragEnd, onHurtig, onSlett }) {
  const [meny, setMeny] = useState(false);
  const menyRef = useRef(null);

  useEffect(() => {
    if (!meny) return;
    const onDoc = (e) => { if (menyRef.current && !menyRef.current.contains(e.target)) setMeny(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [meny]);

  const ferdig = t.status === 'done';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="button"
      data-testid={`task-card-${t.id}`}
      data-fokus-id={t.id}
      style={{ animationDelay: `${Math.min(index * 28, 280)}ms` }}
      className={`dh-kort-inn group relative cursor-pointer select-none rounded-xl border border-black/[0.045] bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all touch-manipulation hover:-translate-y-[1px] hover:border-black/[0.08] hover:shadow-[0_6px_18px_rgba(0,0,0,0.09)] active:scale-[0.98] ${dras ? 'opacity-50 ring-2 ring-[#cf97fc]' : ''} ${valgt ? 'ring-2 ring-[#8b5cf6] bg-[#fbfaff]' : fokus ? 'ring-2 ring-[#8b5cf6]/60 shadow-[0_6px_20px_rgba(139,92,246,0.18)]' : ''}`}
    >
      {valgt && (
        <span className="absolute -left-1.5 -top-1.5 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#8b5cf6] text-white shadow-md" data-testid={`card-selected-${t.id}`}>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      {/* Hurtighandlinger — synlige ved hover (desktop) */}
      {onHurtig && (
        <div
          ref={menyRef}
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-1.5 top-1.5 z-20 hidden items-center gap-0.5 rounded-lg border border-black/[0.06] bg-white/95 p-0.5 shadow-[0_4px_14px_rgba(0,0,0,0.1)] backdrop-blur transition-opacity md:flex ${meny ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <button
            onClick={() => { setMeny(false); onHurtig({ status: ferdig ? 'inbox' : 'done' }); }}
            title={ferdig ? 'Gjenåpne saken' : 'Merk som ferdig'}
            data-testid={`card-quick-done-${t.id}`}
            className={`rounded-md p-1 transition-colors ${ferdig ? 'text-[#999] hover:bg-black/[0.05] hover:text-[#333]' : 'text-emerald-600 hover:bg-emerald-50'}`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setMeny((v) => !v)}
            title="Flere handlinger"
            data-testid={`card-menu-${t.id}`}
            className={`rounded-md p-1 transition-colors ${meny ? 'bg-black/[0.06] text-[#333]' : 'text-[#999] hover:bg-black/[0.05] hover:text-[#333]'}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {meny && (
            <div className="dh-fade absolute right-0 top-8 z-30 w-44 rounded-xl border border-black/[0.07] bg-white p-1 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
              {STATUSER.filter((s) => s.k !== t.status).map((s) => (
                <button
                  key={s.k}
                  onClick={() => { setMeny(false); onHurtig({ status: s.k }); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-[#444] transition-colors hover:bg-[#f7f6f4]"
                >
                  <StatusIkon status={s.k} size={12} /> Flytt til {s.l}
                </button>
              ))}
              <div className="mx-2 my-1 h-px bg-black/[0.06]" />
              <div className="flex items-center gap-1 px-2 py-1">
                {[1, 2, 3].map((p) => (
                  <button
                    key={p}
                    onClick={() => { setMeny(false); onHurtig({ priority: p }); }}
                    title={`Prioritet ${PRI[p].full}`}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[11px] font-bold transition-colors ${t.priority === p ? 'bg-[#f4f0fb] text-[#6d28d9]' : 'text-[#888] hover:bg-[#f7f6f4]'}`}
                  >
                    <PriIkon p={p} size={10} /> {PRI[p].l}
                  </button>
                ))}
              </div>
              {onSlett && (
                <>
                  <div className="mx-2 my-1 h-px bg-black/[0.06]" />
                  <button
                    onClick={() => { setMeny(false); onSlett(); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Slett saken
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2">
        <span className="mt-1"><PriIkon p={t.priority} /></span>
        <p className={`flex-1 text-[13px] font-semibold leading-snug ${ferdig ? 'text-[#9a9a9a] line-through' : 'text-[#1a1a1a]'}`}>{t.title}</p>
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
        {(t.subtasks || []).length > 0 && (
          <span className={`flex items-center gap-1 text-[11px] ${t.subtasks.every((s) => s.done) ? 'text-emerald-600' : 'text-[#aaa]'}`}>
            <CheckCircle2 className="w-3 h-3" />{t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
          </span>
        )}
        {(t.attachments || []).length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-[#aaa]"><Paperclip className="w-3 h-3" />{t.attachments.length}</span>
        )}
        {t.recurrence && <Repeat className="w-3 h-3 text-[#aaa]" title="Gjentakende sak" />}
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
  // variant 'full'  = utvidet sakvisning (stort sentrert kort, Linear-style)
  // variant 'sheet' = modaler (sentrert kort på desktop)
  const ytre = variant === 'panel'
    ? 'fixed inset-0 z-[110] flex items-end justify-center md:items-stretch md:justify-end'
    : variant === 'full'
    ? 'fixed inset-0 z-[110] flex items-end justify-center md:items-center md:justify-center md:p-6'
    : 'fixed inset-0 z-[110] flex items-end justify-center md:items-start md:px-4 md:pt-[12vh]';
  const indre = variant === 'panel'
    ? 'relative flex h-[93dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:h-full md:max-w-[480px] md:rounded-none md:shadow-[-16px_0_48px_rgba(0,0,0,0.14)]'
    : variant === 'full'
    ? 'relative flex h-[93dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:h-full md:max-h-[880px] md:max-w-[1100px] md:rounded-2xl md:shadow-[0_40px_120px_rgba(0,0,0,0.38)]'
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
function SakSkuff({ t, members, today, actor, apiKey, api, visToast, onReload, onClose, onPatch, onComment, onRemind, onDelete, onArchive }) {
  const [tittel, setTittel] = useState(t.title);
  const [beskrivelse, setBeskrivelse] = useState(t.description || '');
  const [kommentar, setKommentar] = useState('');
  const [sender, setSender] = useState(false);
  const [visLogg, setVisLogg] = useState(false);
  const [varsle, setVarsle] = useState(true);
  // Utvidet visning: stort sentrert kort med to kolonner (Linear-style)
  const [utvidet, setUtvidet] = useState(false);
  // @mention-autocomplete i kommentarfeltet (null = inaktiv)
  const [mentionSok, setMentionSok] = useState(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const kommentarRef = useRef(null);

  useEffect(() => { setTittel(t.title); setBeskrivelse(t.description || ''); }, [t.id]); // eslint-disable-line

  // Linear-hurtigtaster i skuffen: 1–4 setter status, P sykler prioritet.
  useEffect(() => {
    const onKey = (e) => {
      const mål = e.target;
      if (mål && ['INPUT', 'TEXTAREA', 'SELECT'].includes(mål.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) {
        e.preventDefault();
        if (STATUSER[idx].k !== t.status) onPatch({ status: STATUSER[idx].k });
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onPatch({ priority: (t.priority % 3) + 1 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [t.status, t.priority, onPatch]);

  const member = members.find((m) => m.id === t.assigneeId) || null;

  const sendKommentar = async () => {
    const tekst = kommentar.trim();
    if (!tekst || sender) return;
    setSender(true);
    try { await onComment(tekst); setKommentar(''); setMentionSok(null); } catch (e) {}
    setSender(false);
  };

  // --- @mentions: «@» + tekst rett før markøren aktiverer autocompleten ---
  const oppdaterMention = (val, pos) => {
    const del = val.slice(0, pos);
    const m = del.match(/(^|\s)@([^\s@]{0,30})$/);
    if (m) { setMentionSok(m[2].toLowerCase()); setMentionIdx(0); }
    else setMentionSok(null);
  };

  const mentionKandidater = mentionSok === null
    ? []
    : members.filter((m) => m.name.toLowerCase().includes(mentionSok)).slice(0, 6);

  const settInnMention = (m) => {
    const el = kommentarRef.current;
    const pos = el ? el.selectionStart : kommentar.length;
    const foer = kommentar.slice(0, pos).replace(/@[^\s@]{0,30}$/, '');
    const ny = `${foer}@${m.name} ${kommentar.slice(pos)}`;
    setKommentar(ny);
    setMentionSok(null);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        const p = foer.length + m.name.length + 2;
        el.setSelectionRange(p, p);
      }
    });
  };

  return (
    <Overlegg onClose={onClose} variant={utvidet ? 'full' : 'panel'} testid="task-drawer">
      {/* Topp: status + lukk */}
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-4 py-3 sm:px-5">
        <div className="no-scrollbar flex min-w-0 overflow-x-auto rounded-full bg-[#f3f2f0] p-0.5">
          {STATUSER.map((st, i) => (
            <button
              key={st.k}
              onClick={() => onPatch({ status: st.k })}
              data-testid={`drawer-status-${st.k}`}
              title={`${st.l} — hurtigtast ${i + 1}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-all ${
                t.status === st.k ? 'bg-white shadow-[0_1px_6px_rgba(0,0,0,0.1)]' : 'text-[#888] hover:text-[#333]'
              }`}
              style={t.status === st.k ? { color: st.farge } : undefined}
            >
              <StatusIkon status={st.k} size={11} />
              {st.l}
            </button>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setUtvidet((v) => !v)}
            title={utvidet ? 'Tilbake til sidepanel' : 'Utvid til full visning'}
            data-testid="drawer-expand"
            className="hidden rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0] hover:text-[#333] md:block"
          >
            {utvidet ? <Minimize2 className="w-[17px] h-[17px]" /> : <Maximize2 className="w-[17px] h-[17px]" />}
          </button>
          <button onClick={onClose} className="rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0] hover:text-[#333]" data-testid="drawer-close">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 ${utvidet ? 'md:px-8 md:py-6' : ''}`}>
        {(() => {
        /* Seksjonene defineres én gang og komponeres ulikt:
           · Sidepanel: én kolonne i klassisk rekkefølge
           · Utvidet:   Linear-style — innhold til venstre, detaljer i høyre kolonne */
        const sekTittel = (
          <input
            value={tittel}
            onChange={(e) => setTittel(e.target.value)}
            onBlur={() => { const v = tittel.trim(); if (v && v !== t.title) onPatch({ title: v }); }}
            data-testid="drawer-title"
            className={`w-full bg-transparent font-bold leading-snug text-[#0a0a0a] outline-none placeholder:text-[#ccc] ${utvidet ? 'text-[20px] sm:text-[23px]' : 'text-[18px] sm:text-[19px]'}`}
            style={heading}
            placeholder="Sakens tittel"
          />
        );

        const sekBeskrivelse = (
          <textarea
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            onBlur={() => { if (beskrivelse !== (t.description || '')) onPatch({ description: beskrivelse }); }}
            rows={utvidet ? 5 : 3}
            data-testid="drawer-description"
            placeholder="Beskrivelse — hva handler saken om, og hva er «ferdig»?"
            className="mt-2 w-full resize-y rounded-xl border border-black/[0.07] bg-white p-3 text-[13.5px] leading-relaxed text-[#333] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.14] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
          />
        );

        const sekMeta = (
          <div className={`mt-4 grid grid-cols-1 gap-3 ${utvidet ? '' : 'min-[420px]:grid-cols-2'}`}>
            <MetaFelt label="Ansvarlig">
              <Meny
                value={t.assigneeId || ''}
                onChange={(v) => onPatch({ assigneeId: v || null, notify: varsle })}
                testid="drawer-assignee"
                placeholder="Ingen"
                options={[{ v: '', l: 'Ingen', icon: User }, ...members.map((m) => ({ v: m.id, l: m.name, avatar: m, sub: m.email || undefined }))]}
              />
            </MetaFelt>
            <MetaFelt label="Frist">
              <input
                type="date"
                value={t.dueDate || ''}
                onChange={(e) => onPatch({ dueDate: e.target.value || null })}
                data-testid="drawer-due"
                className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
              />
            </MetaFelt>
            <MetaFelt label="Prioritet">
              <Meny
                value={t.priority}
                onChange={(v) => onPatch({ priority: Number(v) })}
                testid="drawer-priority"
                options={[
                  { v: 1, l: 'P1 · Kritisk', dot: '#e11d48' },
                  { v: 2, l: 'P2 · Normal', dot: '#b45309' },
                  { v: 3, l: 'P3 · Lav', dot: '#6b7280' },
                ]}
              />
            </MetaFelt>
            <MetaFelt label="Gjentakelse">
              <Meny
                value={t.recurrence || ''}
                onChange={(v) => onPatch({ recurrence: v || null })}
                testid="drawer-recurrence"
                options={REC_VALG.map((r) => ({ v: r.k, l: r.l, icon: r.k ? Repeat : undefined }))}
              />
            </MetaFelt>
            <MetaFelt label="Etiketter (komma)">
              <input
                defaultValue={(t.labels || []).join(', ')}
                onBlur={(e) => {
                  const labels = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  if (JSON.stringify(labels) !== JSON.stringify(t.labels || [])) onPatch({ labels });
                }}
                placeholder="styre, økonomi …"
                className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#ccc] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
              />
            </MetaFelt>
          </div>
        );

        const sekRec = t.recurrence ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#8b5cf6]">
            <Repeat className="w-3.5 h-3.5" /> Når saken fullføres, opprettes neste forekomst automatisk.
          </p>
        ) : null;

        const sekVarsle = (
          <label className="mt-3 flex items-center gap-2 text-[12px] text-[#888]">
            <input type="checkbox" checked={varsle} onChange={(e) => setVarsle(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" />
            Send e-postvarsel ved ny tildeling
          </label>
        );

        const sekFrist = (t.dueDate && t.status !== 'done' && t.dueDate < today) ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Fristen ({fmtDato(t.dueDate)}) er passert
          </div>
        ) : null;

        const sekSjekkliste = <Sjekkliste items={t.subtasks || []} onChange={(subtasks) => onPatch({ subtasks })} />;
        const sekFolgere = <FolgereFelt t={t} members={members} onPatch={onPatch} />;
        const sekVedlegg = <VedleggSeksjon t={t} apiKey={apiKey} api={api} actor={actor} onReload={onReload} visToast={visToast} />;

        const sekKommentarer = (
          <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Kommentarer</p>
          <div className="mt-2 space-y-2.5">
            {(t.comments || []).map((c) => (
              <div key={c.id} className="rounded-xl bg-[#fafaf8] px-3.5 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-bold text-[#333]">{c.author}</span>
                  <span className="text-[10.5px] text-[#b5b5b5]">{fmtTid(c.at)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#444]">
                  <KommentarTekst text={c.text} members={members} />
                </p>
              </div>
            ))}
            {!(t.comments || []).length && <p className="text-[12.5px] text-[#bbb]">Ingen kommentarer ennå.</p>}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              {mentionKandidater.length > 0 && (
                <div className="absolute bottom-full left-0 z-[140] mb-1.5 w-64 rounded-xl border border-black/[0.07] bg-white p-1 shadow-[0_16px_48px_rgba(0,0,0,0.16)]" data-testid="mention-popup">
                  {mentionKandidater.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); settInnMention(m); }}
                      data-testid={`mention-option-${m.id}`}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${i === mentionIdx ? 'bg-[#f4f0fb]' : 'hover:bg-[#f7f6f4]'}`}
                    >
                      <Avatar member={m} size={20} />
                      <span className="min-w-0 flex-1 truncate font-medium text-[#333]">{m.name}</span>
                      {m.email
                        ? <span className="shrink-0 text-[10.5px] font-medium text-[#8b5cf6]">varsles</span>
                        : <span className="shrink-0 text-[10.5px] text-[#c5c5c5]">ingen e-post</span>}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={kommentarRef}
                value={kommentar}
                onChange={(e) => { setKommentar(e.target.value); oppdaterMention(e.target.value, e.target.selectionStart); }}
                onKeyDown={(e) => {
                  // Autocompleten fanger navigasjon når den er åpen
                  if (mentionKandidater.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % mentionKandidater.length); return; }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + mentionKandidater.length) % mentionKandidater.length); return; }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); settInnMention(mentionKandidater[mentionIdx]); return; }
                    if (e.key === 'Escape') { e.stopPropagation(); setMentionSok(null); return; }
                  }
                  // Enter sender på desktop; på mobil gir Enter linjeskift (send-knappen brukes)
                  if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); sendKommentar(); }
                }}
                onBlur={() => setTimeout(() => setMentionSok(null), 150)}
                rows={2}
                data-testid="drawer-comment-input"
                placeholder={`Kommenter som ${actor} … (@ nevner en person)`}
                className="w-full resize-none rounded-xl border border-black/[0.07] bg-white p-3 text-[13.5px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.14] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
              />
            </div>
            <button
              onClick={sendKommentar}
              disabled={!kommentar.trim() || sender}
              data-testid="drawer-comment-send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a0a0a] text-white transition-all hover:bg-black/85 active:scale-95 disabled:opacity-40"
            >
              {sender ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[#b5b5b5]">Skriv <span className="font-semibold text-[#8b5cf6]">@navn</span> for å nevne noen — de får e-postvarsel.</p>
          </div>
        );

        const sekAktivitet = (
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
        );

        if (utvidet) {
          return (
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-x-10">
              <div className="min-w-0">
                {sekTittel}
                {sekBeskrivelse}
                {sekFrist}
                {sekSjekkliste}
                {sekVedlegg}
                {sekKommentarer}
                {sekAktivitet}
              </div>
              <aside className="mt-6 md:mt-1 md:rounded-2xl md:border md:border-black/[0.05] md:bg-[#fafaf8] md:p-5">
                <p className="hidden text-[11px] font-bold uppercase tracking-[0.1em] text-[#999] md:block">Detaljer</p>
                {sekMeta}
                {sekRec}
                {sekVarsle}
                {sekFolgere}
              </aside>
            </div>
          );
        }
        return (
          <>
            {sekTittel}
            {sekBeskrivelse}
            {sekMeta}
            {sekRec}
            {sekVarsle}
            {sekFrist}
            {sekSjekkliste}
            {sekFolgere}
            {sekVedlegg}
            {sekKommentarer}
            {sekAktivitet}
          </>
        );
        })()}
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
        {t.status === 'done' && !t.archived && (
          <button
            onClick={onArchive}
            data-testid="drawer-archive"
            title="Legg saken i arkivet — kan gjenopprettes senere"
            className="flex h-10 items-center gap-1.5 rounded-full bg-[#f3f2f0] px-4 text-[12.5px] font-semibold text-[#666] transition-all hover:bg-[#e9e7e3] active:scale-[0.97]"
          >
            <Archive className="w-3.5 h-3.5" /> Arkiver
          </button>
        )}
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

// Uthever @Fullt Navn i kommentartekst for personer som finnes i personlisten.
function KommentarTekst({ text, members }) {
  const deler = useMemo(() => {
    if (!text || !text.includes('@') || !members.length) return [text];
    const navn = members
      .map((m) => m.name)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!navn.length) return [text];
    const re = new RegExp(`@(${navn.join('|')})`, 'gi');
    const ut = [];
    let sist = 0; let m;
    while ((m = re.exec(text))) {
      if (m.index > sist) ut.push(text.slice(sist, m.index));
      ut.push({ mention: m[0] });
      sist = m.index + m[0].length;
    }
    if (sist < text.length) ut.push(text.slice(sist));
    return ut;
  }, [text, members]);
  return (
    <>
      {deler.map((d, i) => (typeof d === 'string'
        ? <React.Fragment key={i}>{d}</React.Fragment>
        : <span key={i} className="rounded-md bg-[#f4f0fb] px-1 py-0.5 font-semibold text-[#6d28d9]">{d.mention}</span>))}
    </>
  );
}

/* ═══════════════ Underoppgaver / sjekkliste ═══════════════ */
function Sjekkliste({ items, onChange }) {
  const [nytt, setNytt] = useState('');
  const ferdig = items.filter((s) => s.done).length;
  const leggTil = () => {
    const tekst = nytt.trim();
    if (!tekst) return;
    onChange([...items, { text: tekst, done: false }]);
    setNytt('');
  };
  return (
    <div className="mt-6" data-testid="drawer-subtasks">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Underoppgaver</p>
        {items.length > 0 && (
          <span className={`text-[11px] font-bold tabular-nums ${ferdig === items.length ? 'text-emerald-600' : 'text-[#aaa]'}`}>{ferdig}/{items.length}</span>
        )}
      </div>
      {items.length > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eee]">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(ferdig / items.length) * 100}%` }} />
        </div>
      )}
      <div className="mt-2 space-y-0.5">
        {items.map((s, i) => (
          <div key={s.id || `st-${i}`} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-[#fafaf8]">
            <button
              onClick={() => onChange(items.map((x, xi) => (xi === i ? { ...x, done: !x.done } : x)))}
              data-testid={`subtask-toggle-${i}`}
              className="shrink-0"
              aria-label={s.done ? 'Merk som ikke ferdig' : 'Merk som ferdig'}
            >
              {s.done
                ? <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
                : <Circle className="w-[18px] h-[18px] text-[#ccc] transition-colors hover:text-[#8b5cf6]" />}
            </button>
            <span className={`min-w-0 flex-1 text-[13.5px] ${s.done ? 'text-[#b0aca6] line-through' : 'text-[#333]'}`}>{s.text}</span>
            <button
              onClick={() => onChange(items.filter((_, xi) => xi !== i))}
              className="shrink-0 rounded p-1 text-[#ddd] transition-colors hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Fjern underoppgave"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Plus className="w-4 h-4 shrink-0 text-[#bbb]" />
        <input
          value={nytt}
          onChange={(e) => setNytt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTil(); } }}
          onBlur={() => { if (nytt.trim()) leggTil(); }}
          data-testid="subtask-add-input"
          placeholder="Legg til underoppgave …"
          className="h-9 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
        />
      </div>
    </div>
  );
}

/* ═══════════════ Følgere ═══════════════ */
function FolgereFelt({ t, members, onPatch }) {
  const followers = t.followers || [];
  const kandidater = members.filter((m) => !followers.includes(m.id) && m.id !== t.assigneeId);
  return (
    <div className="mt-6" data-testid="drawer-followers">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Følgere</p>
      <p className="mt-0.5 text-[11.5px] text-[#b5b5b5]">Holdes orientert — varsles på e-post når de legges til og ved purring.</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {followers.map((fid) => {
          const m = members.find((x) => x.id === fid);
          if (!m) return null;
          return (
            <span key={fid} className="flex items-center gap-1.5 rounded-full bg-[#f4f0fb] py-1 pl-1 pr-2 text-[12px] font-medium text-[#6d28d9]" data-testid={`follower-chip-${fid}`}>
              <Avatar member={m} size={20} />
              {m.name}
              <button onClick={() => onPatch({ followers: followers.filter((x) => x !== fid) })} aria-label={`Fjern ${m.name} som følger`} className="text-[#b79ae0] transition-colors hover:text-rose-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        {kandidater.length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) onPatch({ followers: [...followers, e.target.value] }); }}
            data-testid="drawer-follower-add"
            className="h-8 rounded-full bg-[#fafaf8] px-2.5 text-[12px] text-[#888] outline-none"
          >
            <option value="">+ Legg til følger</option>
            {kandidater.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
        {!followers.length && !kandidater.length && <span className="text-[12.5px] text-[#bbb]">Ingen flere personer å legge til.</span>}
      </div>
    </div>
  );
}

/* ═══════════════ Vedlegg — chunket opplasting med fremdrift ═══════════════ */
function VedleggSeksjon({ t, apiKey, api, actor, onReload, visToast }) {
  const [lasterOpp, setLasterOpp] = useState(false);
  const [prosent, setProsent] = useState(0);
  const filRef = useRef(null);
  const vedlegg = t.attachments || [];

  const lastOpp = async (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { visToast('Filen er for stor (maks 8 MB)', 'feil'); return; }
    if (vedlegg.length >= 12) { visToast('Maks 12 vedlegg per sak', 'feil'); return; }
    setLasterOpp(true); setProsent(0);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
        fr.onerror = () => reject(new Error('Kunne ikke lese filen'));
        fr.readAsDataURL(file);
      });
      const CHUNK = 900000; // ~900 KB base64 per bit — trygt under proxy-grenser
      const total = Math.max(1, Math.ceil(base64.length / CHUNK));
      const uploadId = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `up-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let siste = null;
      for (let i = 0; i < total; i++) {
        const r = await api('task-files/chunk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId, taskId: t.id, index: i, total,
            data: base64.slice(i * CHUNK, (i + 1) * CHUNK),
            name: file.name, type: file.type || 'application/octet-stream', actor,
          }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Opplasting feilet');
        siste = j;
        setProsent(Math.round(((i + 1) / total) * 100));
      }
      if (!siste || !siste.complete) throw new Error('Opplastingen ble ikke fullført');
      visToast(`«${file.name}» lastet opp`);
      if (onReload) onReload();
    } catch (e) {
      visToast(e.message || 'Opplasting feilet', 'feil');
    }
    setLasterOpp(false);
    if (filRef.current) filRef.current.value = '';
  };

  const slettFil = async (a) => {
    if (!window.confirm(`Slette vedlegget «${a.name}»?`)) return;
    try {
      const r = await api(`task-files/${a.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke slette');
      visToast('Vedlegg slettet');
      if (onReload) onReload();
    } catch (e) { visToast(e.message, 'feil'); }
  };

  return (
    <div className="mt-6" data-testid="drawer-attachments">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Vedlegg</p>
        {vedlegg.length > 0 && <span className="text-[11px] text-[#bbb] tabular-nums">{vedlegg.length}/12</span>}
      </div>
      <div className="mt-2 space-y-1.5">
        {vedlegg.map((a) => (
          <div key={a.id} className="group flex items-center gap-2.5 rounded-xl bg-[#fafaf8] px-3 py-2.5" data-testid={`attachment-${a.id}`}>
            <Paperclip className="w-4 h-4 shrink-0 text-[#8b5cf6]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#333]">{a.name}</p>
              <p className="text-[11px] text-[#b0aca6]">{fmtStr(a.size)}</p>
            </div>
            <a
              href={`/api/admin/task-files/${a.id}?key=${encodeURIComponent(apiKey)}`}
              download={a.name}
              title="Last ned"
              className="shrink-0 rounded-lg p-2 text-[#bbb] transition-colors hover:bg-white hover:text-[#8b5cf6]"
            >
              <Download className="w-4 h-4" />
            </a>
            <button onClick={() => slettFil(a)} title="Slett vedlegg" className="shrink-0 rounded-lg p-2 text-[#ccc] transition-colors hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!vedlegg.length && !lasterOpp && <p className="text-[12.5px] text-[#bbb]">Ingen vedlegg ennå.</p>}
      </div>
      {lasterOpp ? (
        <div className="mt-2.5" data-testid="attachment-progress">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#8b5cf6]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Laster opp … {prosent}%
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eee]">
            <div className="h-full rounded-full bg-[#8b5cf6] transition-all" style={{ width: `${prosent}%` }} />
          </div>
        </div>
      ) : (
        <>
          <input ref={filRef} type="file" className="hidden" onChange={(e) => lastOpp(e.target.files && e.target.files[0])} data-testid="attachment-file-input" />
          <button
            onClick={() => filRef.current && filRef.current.click()}
            data-testid="attachment-upload-btn"
            className="mt-2.5 flex h-9 items-center gap-1.5 rounded-full bg-[#f4f0fb] px-4 text-[12.5px] font-semibold text-[#8b5cf6] transition-colors hover:bg-[#ece4fa]"
          >
            <Paperclip className="w-3.5 h-3.5" /> Last opp fil <span className="font-normal text-[#b79ae0]">· maks 8 MB</span>
          </button>
        </>
      )}
    </div>
  );
}

/* ═══════════════ Ny sak ═══════════════ */
function NySakModal({ members, defaultStatus, onClose, onCreate }) {
  const [tittel, setTittel] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [status, setStatus] = useState(defaultStatus || 'inbox');
  const [prioritet, setPrioritet] = useState(2);
  const [ansvarlig, setAnsvarlig] = useState('');
  const [frist, setFrist] = useState('');
  const [gjentakelse, setGjentakelse] = useState('');
  const [sjekkliste, setSjekkliste] = useState([]);
  const [nyttPunkt, setNyttPunkt] = useState('');
  const [varsle, setVarsle] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const ref = useRef(null);

  useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 60); }, []);

  const leggTilPunkt = () => {
    const tekst = nyttPunkt.trim();
    if (!tekst) return;
    setSjekkliste((prev) => [...prev, { text: tekst, done: false }]);
    setNyttPunkt('');
  };

  const lagre = async () => {
    if (!tittel.trim() || lagrer) return;
    setLagrer(true); setFeil('');
    try {
      await onCreate({
        title: tittel.trim(), description: beskrivelse.trim(), status,
        priority: prioritet, assigneeId: ansvarlig || null, dueDate: frist || null,
        recurrence: gjentakelse || null,
        subtasks: nyttPunkt.trim() ? [...sjekkliste, { text: nyttPunkt.trim(), done: false }] : sjekkliste,
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

        {/* Kontroller: 2×2-grid på mobil, én rad på md+ — Linear-style popovers */}
        <div className="grid grid-cols-2 gap-2 px-5 pt-3 md:flex md:flex-wrap md:items-center">
          <Meny
            compact value={status} onChange={setStatus} testid="new-task-status"
            options={STATUSER.map((s) => ({ v: s.k, l: s.l, dot: s.farge }))} className="md:w-[120px]"
          />
          <Meny
            compact value={prioritet} onChange={(v) => setPrioritet(Number(v))} testid="new-task-priority"
            options={[
              { v: 1, l: 'P1 · Kritisk', dot: '#e11d48' },
              { v: 2, l: 'P2 · Normal', dot: '#b45309' },
              { v: 3, l: 'P3 · Lav', dot: '#6b7280' },
            ]} className="md:w-[136px]"
          />
          <Meny
            compact value={ansvarlig} onChange={setAnsvarlig} testid="new-task-assignee"
            placeholder={members.length ? 'Ingen ansvarlig' : 'Legg til personer først'}
            options={[{ v: '', l: 'Ingen ansvarlig', icon: User }, ...members.map((m) => ({ v: m.id, l: m.name, avatar: m }))]}
            className="md:w-[170px]"
          />
          <input
            type="date" value={frist} onChange={(e) => setFrist(e.target.value)}
            data-testid="new-task-due"
            className="h-8 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
          />
          <Meny
            compact value={gjentakelse} onChange={setGjentakelse} testid="new-task-recurrence"
            options={REC_VALG.map((r) => ({ v: r.k, l: r.l, icon: r.k ? Repeat : undefined }))} className="md:w-[140px]"
          />
        </div>

        {/* Sjekkliste — valgfrie underoppgaver rett fra opprettelsen */}
        <div className="px-5 pt-3">
          {sjekkliste.map((s, i) => (
            <div key={i} className="group flex items-center gap-2 py-1">
              <Circle className="w-4 h-4 shrink-0 text-[#ccc]" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#444]">{s.text}</span>
              <button onClick={() => setSjekkliste((prev) => prev.filter((_, xi) => xi !== i))} className="shrink-0 rounded p-1 text-[#ccc] hover:text-rose-500" aria-label="Fjern">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0 text-[#bbb]" />
            <input
              value={nyttPunkt}
              onChange={(e) => setNyttPunkt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTilPunkt(); } }}
              data-testid="new-task-subtask-input"
              placeholder="Underoppgave (valgfritt) — Enter legger til"
              className="h-9 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
            />
          </div>
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

/* ═══════════════ Personer & kontoer ═══════════════
   Én kilde: en person kan stå som ansvarlig/følger, og kan (valgfritt) få
   passord + rolle for innlogging på /admin. Rollen 'bruker' har tilgang til
   Saker + møter de deltar i eller har fått typetilgang til (moteTilgang).
   Verv (tittel) vises i møter og protokoller — f.eks. Styreleder.
   Alle endringer er admin-only (serveren håndhever); 'bruker' ser listen. */
const VERV_FORSLAG = ['Styreleder', 'Nestleder', 'Styremedlem', 'Varamedlem', 'Daglig leder', 'Økonomiansvarlig', 'Driftsansvarlig'];
const MOTE_TILGANG_VALG = [
  { k: 'styremote', l: 'Styremøter' },
  { k: 'ledermote', l: 'Ledermøter' },
  { k: 'annet', l: 'Andre møter' },
];
const MOTE_TILGANG_LABEL = { styremote: 'Styremøter', ledermote: 'Ledermøter', annet: 'Andre møter' };

// Verdensklasse-detalj: vervet foreslår fornuftig møtetilgang automatisk
// (styreverv → styremøter, daglig leder → begge). Kun et forslag — admin
// kan alltid overstyre med chipsene.
function foreslaMoteTilgang(verv) {
  const v = String(verv || '').toLowerCase();
  if (!v) return null;
  if (/daglig leder|adm\.? ?dir|ceo/.test(v)) return ['styremote', 'ledermote'];
  if (/styre/.test(v)) return ['styremote'];
  if (/leder|sjef|direkt/.test(v)) return ['ledermote'];
  return null;
}

// Chips for møtetilgang per møtetype. Admin ser alle møter uansett —
// chipsene er derfor deaktivert (med forklaring) når rollen er admin.
function MoteTilgangVelger({ value, onChange, disabled, testid }) {
  const valgt = Array.isArray(value) ? value : [];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" data-testid={testid}>
      {MOTE_TILGANG_VALG.map((o) => {
        const aktiv = valgt.includes(o.k);
        return (
          <button
            key={o.k}
            type="button"
            disabled={disabled}
            onClick={() => onChange(aktiv ? valgt.filter((x) => x !== o.k) : [...valgt, o.k])}
            data-testid={`${testid}-${o.k}`}
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
              aktiv ? 'bg-[#f4f0fb] text-[#6d28d9] ring-1 ring-[#8b5cf6]/30' : 'bg-[#f3f2f0] text-[#999] hover:text-[#555]'
            }`}
          >
            {aktiv && <Check className="h-3 w-3" />}{o.l}
          </button>
        );
      })}
    </div>
  );
}

function PersonerModal({ api, members, setMembers, erBruker, onClose, visToast }) {
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [rolle, setRolle] = useState('bruker');
  const [passord, setPassord] = useState('');
  const [tittel, setTittel] = useState(''); // verv, f.eks. Styreleder
  const [moteTilgang, setMoteTilgang] = useState([]);
  const [inviter, setInviter] = useState(true); // velkomst-e-post — brukeren velger eget passord
  const [inviterer, setInviterer] = useState(null); // person-id under (re)utsending
  const [lagrer, setLagrer] = useState(false);
  const [redigerId, setRedigerId] = useState(null);
  const [red, setRed] = useState({ name: '', email: '', role: 'bruker', password: '', tittel: '', moteTilgang: [] });

  const leggTil = async () => {
    if (!navn.trim() || lagrer) return;
    setLagrer(true);
    try {
      const r = await api('users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: navn.trim(), email: epost.trim(), role: rolle, password: passord,
          tittel: tittel.trim(), moteTilgang,
          invite: inviter && !!epost.trim() && !passord,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke legge til');
      setMembers((prev) => [...prev, j.member]);
      setNavn(''); setEpost(''); setPassord(''); setRolle('bruker'); setTittel(''); setMoteTilgang([]);
      visToast(j.invitert
        ? `Invitasjon sendt til ${j.member.email} — de velger eget passord`
        : j.member.harPassord ? `${j.member.name} lagt til — kan nå logge inn` : `${j.member.name} lagt til`);
    } catch (e) { visToast(e.message, 'feil'); }
    setLagrer(false);
  };

  // (Re)send velkomst-e-post til person med e-post men uten aktivert konto.
  const sendInvitasjon = async (m) => {
    if (inviterer) return;
    setInviterer(m.id);
    try {
      const r = await api(`users/${m.id}/invite`, { method: 'POST' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke sende invitasjon');
      if (j.member) setMembers((prev) => prev.map((x) => (x.id === m.id ? j.member : x)));
      if (j.invitert) visToast(`Invitasjon sendt til ${m.email}`);
      else visToast('Invitasjonen ble ikke sendt — e-post er ikke konfigurert', 'feil');
    } catch (e) { visToast(e.message, 'feil'); }
    setInviterer(null);
  };

  const lagreEndring = async (id) => {
    try {
      const payload = { name: red.name.trim(), email: red.email.trim(), role: red.role, tittel: red.tittel.trim(), moteTilgang: red.moteTilgang };
      if (red.password) payload.password = red.password;
      const r = await api(`users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Lagring feilet');
      setMembers((prev) => prev.map((m) => (m.id === id ? j.member : m)));
      setRedigerId(null);
      visToast('Lagret');
    } catch (e) { visToast(e.message, 'feil'); }
  };

  const slettPerson = async (m) => {
    if (!window.confirm(`Fjerne ${m.name}? Kontoen slettes og saker de er ansvarlig for beholdes uten ansvarlig.`)) return;
    try {
      const r = await api(`users/${m.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke fjerne');
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      visToast(`${m.name} fjernet`);
    } catch (e) { visToast(e.message, 'feil'); }
  };

  return (
    <Overlegg onClose={onClose} variant="sheet" testid="task-members-modal">
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] px-5 py-4">
        <Users className="w-[18px] h-[18px] shrink-0 text-[#8b5cf6]" />
        <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={heading}>Personer & kontoer</h3>
        <span className="hidden text-[12px] text-[#aaa] sm:inline">— ansvarlige, følgere og innlogging</span>
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0]"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
        {erBruker && (
          <p className="mb-2 rounded-xl bg-[#f4f0fb] px-3.5 py-2.5 text-[12.5px] text-[#6d28d9]">
            Kun administratorer kan legge til eller endre personer.
          </p>
        )}
        {!members.length && (
          <div className="py-8 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f0fb]">
              <UserPlus className="h-5 w-5 text-[#8b5cf6]" />
            </span>
            <p className="mt-3 text-[13px] text-[#999]">Ingen personer ennå — legg til den første under.</p>
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="border-b border-black/[0.04] py-3 last:border-0" data-testid={`member-row-${m.id}`}>
            {redigerId === m.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input value={red.name} onChange={(e) => setRed((p) => ({ ...p, name: e.target.value }))} placeholder="Navn" className="h-10 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15" />
                  <input value={red.email} onChange={(e) => setRed((p) => ({ ...p, email: e.target.value }))} placeholder="E-post" className="h-10 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15" />
                  {m.role === 'owner' ? (
                    <span className="flex h-10 items-center gap-2 rounded-lg border border-black/[0.06] bg-[#fafaf8] px-2.5 text-[13px] text-[#999]"><KeyRound className="h-3.5 w-3.5" /> Eier — rollen kan ikke endres</span>
                  ) : (
                    <Meny
                      value={red.role}
                      onChange={(v) => setRed((p) => ({ ...p, role: v }))}
                      testid={`member-role-select-${m.id}`}
                      options={[
                        { v: 'admin', l: 'Admin', sub: 'Full tilgang til hele admin' },
                        { v: 'bruker', l: 'Bruker', sub: 'Saker + møter de har tilgang til' },
                      ]}
                      className="h-10 [&>button]:h-10"
                    />
                  )}
                  <input
                    type="password" value={red.password}
                    onChange={(e) => setRed((p) => ({ ...p, password: e.target.value }))}
                    placeholder={m.harPassord ? 'Nytt passord (valgfritt)' : 'Sett passord — gir innlogging'}
                    autoComplete="new-password"
                    className="h-10 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
                    data-testid={`member-password-input-${m.id}`}
                  />
                  <input
                    value={red.tittel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRed((p) => {
                        const forslag = !p.moteTilgang.length ? foreslaMoteTilgang(v) : null;
                        return { ...p, tittel: v, ...(forslag ? { moteTilgang: forslag } : {}) };
                      });
                    }}
                    list="verv-forslag"
                    placeholder="Verv — f.eks. Styreleder (valgfritt)"
                    data-testid={`member-tittel-input-${m.id}`}
                    className="h-10 min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none transition-all hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
                  />
                  <div className="flex min-w-0 items-center">
                    <MoteTilgangVelger
                      value={red.moteTilgang}
                      onChange={(v) => setRed((p) => ({ ...p, moteTilgang: v }))}
                      disabled={red.role === 'admin' || m.role === 'owner'}
                      testid={`member-motetilgang-${m.id}`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="mr-auto text-[11px] text-[#b5b5b5]">{(red.role === 'admin' || m.role === 'owner') ? 'Admin ser alle møter — møtetilgang gjelder kun rollen Bruker.' : 'Møtetilgang: hvilke møtetyper personen kan se. Passord krever e-post og minst 8 tegn.'}</p>
                  <button onClick={() => lagreEndring(m.id)} data-testid={`member-save-${m.id}`} className="flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3 py-2 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"><Check className="w-4 h-4" /> Lagre</button>
                  <button onClick={() => setRedigerId(null)} className="rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0]"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar member={m} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[14px] font-semibold text-[#1a1a1a]">{m.name}</p>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      m.role === 'owner' ? 'bg-[#0a0a0a] text-white' : m.role === 'admin' ? 'bg-[#f4f0fb] text-[#8b5cf6]' : 'bg-[#f3f2f0] text-[#888]'
                    }`}>{ROLLE_LABEL[m.role] || m.role}</span>
                    {m.tittel && (
                      <span title="Verv" className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#777] ring-1 ring-black/[0.08]" data-testid={`member-verv-${m.id}`}>{m.tittel}</span>
                    )}
                    {m.harPassord && (
                      <span title="Har passord — kan logge inn" className="shrink-0 text-emerald-500"><KeyRound className="w-3.5 h-3.5" /></span>
                    )}
                    {!m.harPassord && m.invitedAt && (
                      <span title="Invitasjon sendt — venter på at brukeren velger passord" className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">Invitert</span>
                    )}
                  </div>
                  <p className="truncate text-[12px] text-[#999]">{m.email || 'Ingen e-post — får ikke varsler'}{m.harPassord ? ' · kan logge inn' : ''}{m.role === 'bruker' && (m.moteTilgang || []).length > 0 ? ` · ser ${m.moteTilgang.map((k) => (MOTE_TILGANG_LABEL[k] || k).toLowerCase()).join(', ')}` : ''}</p>
                </div>
                {!erBruker && (
                  <>
                    {m.email && !m.harPassord && (
                      <button
                        onClick={() => sendInvitasjon(m)}
                        title={m.invitedAt ? 'Send invitasjonen på nytt' : 'Send invitasjon — brukeren velger eget passord'}
                        data-testid={`member-invite-${m.id}`}
                        className="rounded-lg p-2 text-[#bbb] hover:bg-[#f4f0fb] hover:text-[#8b5cf6]"
                      >
                        {inviterer === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => { setRedigerId(m.id); setRed({ name: m.name, email: m.email || '', role: m.role || 'bruker', password: '', tittel: m.tittel || '', moteTilgang: Array.isArray(m.moteTilgang) ? m.moteTilgang : [] }); }}
                      data-testid={`member-edit-${m.id}`}
                      className="rounded-lg p-2 text-[#bbb] hover:bg-[#f3f2f0] hover:text-[#555]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {m.role !== 'owner' && (
                      <button onClick={() => slettPerson(m)} data-testid={`member-delete-${m.id}`} className="rounded-lg p-2 text-[#bbb] hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!erBruker && (
        <div
          className="shrink-0 border-t border-black/[0.06] px-5 py-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Legg til person</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn"
              data-testid="member-name-input"
              className="h-11 min-w-0 rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15 sm:h-10 sm:text-[13.5px]"
            />
            <input
              value={epost} onChange={(e) => setEpost(e.target.value)} placeholder="E-post (varsler + innlogging)"
              data-testid="member-email-input"
              className="h-11 min-w-0 rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15 sm:h-10 sm:text-[13.5px]"
            />
            <Meny
              value={rolle} onChange={setRolle} testid="member-role-input" oppover
              options={[
                { v: 'bruker', l: 'Bruker', sub: 'Saker + møter de har tilgang til' },
                { v: 'admin', l: 'Admin', sub: 'Full tilgang til hele admin' },
              ]}
              className="[&>button]:h-11 sm:[&>button]:h-10"
            />
            <input
              type="password" value={passord} onChange={(e) => setPassord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') leggTil(); }}
              placeholder="Passord (valgfritt — eller bruk invitasjon)"
              autoComplete="new-password"
              data-testid="member-password-input"
              className="h-11 min-w-0 rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15 sm:h-10 sm:text-[13.5px]"
            />
            <input
              value={tittel}
              onChange={(e) => {
                const v = e.target.value;
                setTittel(v);
                if (!moteTilgang.length) {
                  const forslag = foreslaMoteTilgang(v);
                  if (forslag) setMoteTilgang(forslag);
                }
              }}
              list="verv-forslag"
              placeholder="Verv — f.eks. Styreleder (valgfritt)"
              data-testid="member-tittel-input"
              className="h-11 min-w-0 rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15 sm:h-10 sm:text-[13.5px]"
            />
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#b5b5b5]">Ser</span>
              <MoteTilgangVelger value={moteTilgang} onChange={setMoteTilgang} disabled={rolle === 'admin'} testid="member-motetilgang" />
            </div>
          </div>
          <datalist id="verv-forslag">
            {VERV_FORSLAG.map((v) => <option key={v} value={v} />)}
          </datalist>
          <label className={`mt-2.5 flex items-center gap-2 select-none ${!epost.trim() || passord ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={inviter && !!epost.trim() && !passord}
              disabled={!epost.trim() || !!passord}
              onChange={(e) => setInviter(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#8b5cf6]"
              data-testid="member-invite-toggle"
            />
            <span className="text-[12px] text-[#666]">Send velkomst-e-post — brukeren aktiverer kontoen og velger eget passord</span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <p className="mr-auto text-[11px] text-[#b5b5b5]">{passord ? 'Du setter passordet manuelt — ingen invitasjon sendes.' : 'Uten passord eller invitasjon: kan stå som ansvarlig og få varsler, men ikke logge inn.'}</p>
            <button
              onClick={leggTil}
              disabled={!navn.trim() || lagrer}
              data-testid="member-add-btn"
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
            >
              {lagrer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-[18px] h-[18px]" />}
              <span className="text-[13.5px] font-semibold">Legg til</span>
            </button>
          </div>
        </div>
      )}
    </Overlegg>
  );
}
