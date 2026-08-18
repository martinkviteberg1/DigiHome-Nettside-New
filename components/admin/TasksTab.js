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
import { Marked } from 'marked';
import SakerInnsikt from './SakerInnsikt';
import FilViser, { filIkonInfo } from './FilViser';
import DokumentModal from './DokumentModal';
import ProduktAdmin from './ProduktAdmin';
import ProsjekterVisning from './Prosjekter';
import {
  Plus, X, Loader2, Search, Users, Trash2, Bell, Clock, MessageSquare,
  CheckCircle2, Inbox, PlayCircle, LayoutGrid, List, Calendar,
  ChevronDown, AlertTriangle, Pencil, Check, CornerDownLeft, History,
  ClipboardCheck, UserPlus, Repeat, Paperclip, Archive, ArchiveRestore,
  Download, KeyRound, Circle, Table2, CalendarRange, ArrowUpDown, User,
  MoreHorizontal, Send, Maximize2, Minimize2, Settings, AtSign, PenLine,
  Bold, Italic, Link2, Image as ImageIcon, Heading,
  Folder, FolderPlus, Ban, GitBranch, Layers, BarChart3,
  Home, Landmark, Briefcase, Wrench, Lock, Globe,
  Bug, Sparkles, Rocket, Hammer, Boxes, ListFilter, Keyboard, ChevronLeft, ChevronRight,
} from 'lucide-react';

const VISNINGER = [
  { k: 'tavle', l: 'Tavle', icon: LayoutGrid },
  { k: 'liste', l: 'Liste', icon: List },
  { k: 'tabell', l: 'Tabell', icon: Table2 },
  { k: 'tidslinje', l: 'Tidslinje', icon: CalendarRange },
  { k: 'prosjekter', l: 'Prosjekter', icon: Folder },
  { k: 'innsikt', l: 'Innsikt', icon: BarChart3 },
  { k: 'arkiv', l: 'Arkiv', icon: Archive },
];

/* Områder (spaces) — saken «bor» et sted, og stedet avgjør hvem som ser den.
   Tilgang styres av grupper på personene (Styret/Ledelsen/Utvikling); admin
   ser alltid alt. Selve håndhevingen skjer på serveren (lib/sak-tilgang.js). */
const OMRADER_UI = [
  { k: 'drift', l: 'Drift', icon: Home },
  { k: 'styret', l: 'Styret', icon: Landmark },
  { k: 'ledelse', l: 'Ledelse', icon: Briefcase },
  { k: 'utvikling', l: 'Utvikling', icon: Wrench },
];
const GRUPPER_UI = [
  { k: 'styret', l: 'Styret' },
  { k: 'ledelsen', l: 'Ledelsen' },
  { k: 'utvikling', l: 'Utvikling' },
];

/* Sakstyper — kun for Utvikling-området. Én type per sak, fargekodet merke
   på kortet og i skuffen. Labels beholdes for frie/tverrgående temaer. */
const SAKSTYPE_UI = [
  { k: 'feil', l: 'Feil', icon: Bug, farge: '#e11d48' },
  { k: 'forbedring', l: 'Forbedring', icon: Sparkles, farge: '#2563eb' },
  { k: 'funksjon', l: 'Funksjon', icon: Rocket, farge: '#059669' },
  { k: 'vedlikehold', l: 'Vedlikehold', icon: Hammer, farge: '#71717a' },
];
const sakstypeInfo = (k) => SAKSTYPE_UI.find((t) => t.k === k) || null;

const REC_VALG = [
  { k: '', l: 'Gjentas ikke' },
  { k: 'weekly', l: 'Ukentlig' },
  { k: 'monthly', l: 'Månedlig' },
  { k: 'quarterly', l: 'Kvartalsvis' },
];

const ROLLE_LABEL = { owner: 'Systemeier', admin: 'Admin', bruker: 'Bruker', partner: 'Partner', eier: 'Eier' };

function fmtStr(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUSER = [
  { k: 'inbox', l: 'Ny', icon: Inbox, farge: '#8b8b8b' },
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
  if (member.avatar) {
    return (
      <img
        src={member.avatar} alt="" title={member.name}
        className="inline-flex shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
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
   Ny = stiplet ring, Pågår = halvfylt, Venter = kvartfylt, Ferdig = fylt m/ hake. */
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
function Meny({ value, options, onChange, placeholder, compact, naken, testid, className = '', menyBredde = 220, oppover }) {
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
        className={naken
          ? `flex h-7 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-[12.5px] transition-colors ${open ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]'}`
          : `flex w-full items-center gap-1.5 rounded-lg border bg-white text-left transition-all ${
          open ? 'border-[#8b5cf6]/50 ring-2 ring-[#8b5cf6]/15' : 'border-black/[0.08] hover:border-black/[0.16]'
        } ${compact ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3 text-[13px]'}`}
      >
        {valgt && valgt.dot && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: valgt.dot }} />}
        {valgt && valgt.avatar && <Avatar member={valgt.avatar} size={18} />}
        {Ikon && <Ikon className="h-3.5 w-3.5 shrink-0 text-[#888]" />}
        <span className={`min-w-0 flex-1 truncate font-medium ${valgt ? 'text-[#333]' : 'text-[#aaa]'}`}>{valgt ? valgt.l : placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${naken ? 'text-[#d5d2cc]' : 'text-[#b5b5b5]'} ${open ? 'rotate-180' : ''}`} />
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

const VARSEL_IKON = { tildelt: UserPlus, nevnt: AtSign, kommentar: MessageSquare, deloppgave: ClipboardCheck, status: Repeat, frist: Clock, folger: Bell, paaminnelse: Bell };
const VARSEL_FARGE = { tildelt: '#6d28d9', nevnt: '#8b5cf6', kommentar: '#0ea5e9', deloppgave: '#7c3aed', status: '#b45309', frist: '#e11d48', folger: '#059669', paaminnelse: '#e11d48' };
function tidSiden(iso) {
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'nå'; if (s < 3600) return `${Math.floor(s / 60)} min`; if (s < 86400) return `${Math.floor(s / 3600)} t`;
  const dg = Math.floor(s / 86400); if (dg < 7) return `${dg} d`;
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

// Varsel-innboks: fast panel øverst til høyre. Viser enten listen eller
// e-postpreferansene (tannhjul). Klikk på et varsel åpner saken.
function VarselDropdown({ innerRef, varsler, ulest, onOpen, onMerkAlle, prefsOpen, setPrefsOpen, prefs, katalog, onTogglePref }) {
  const kategorier = Object.keys(katalog || {});
  return (
    <div
      ref={innerRef}
      data-testid="varsel-panel"
      className="dh-panel-in fixed right-3 top-14 z-[60] flex max-h-[min(560px,calc(100vh-80px))] w-[min(384px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#0a0a0a]" />
          <span className="text-[14px] font-semibold text-[#0a0a0a]">{prefsOpen ? 'Varselinnstillinger' : 'Varsler'}</span>
          {!prefsOpen && ulest > 0 && <span className="rounded-full bg-[#f4f0fb] px-1.5 py-0.5 text-[11px] font-bold text-[#6d28d9]">{ulest}</span>}
        </div>
        <div className="flex items-center gap-1">
          {!prefsOpen && ulest > 0 && (
            <button onClick={onMerkAlle} data-testid="varsel-merk-alle" title="Merk alle som lest" className="rounded-md px-2 py-1 text-[12px] font-medium text-[#6d28d9] hover:bg-[#f4f0fb]">Merk alle lest</button>
          )}
          <button
            onClick={() => setPrefsOpen((v) => !v)} data-testid="varsel-prefs-toggle"
            title="Varselinnstillinger"
            className={`rounded-md p-1.5 transition-colors ${prefsOpen ? 'bg-[#f4f0fb] text-[#6d28d9]' : 'text-[#999] hover:bg-black/[0.04] hover:text-[#0a0a0a]'}`}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {prefsOpen ? (
        <div className="overflow-y-auto p-3">
          <p className="mb-2 px-1 text-[12px] leading-relaxed text-[#888]">Innboksen viser alltid alt. Her styrer du kun hvilke typer du vil ha på <b>e-post</b>.</p>
          {!prefs ? (
            <div className="flex items-center gap-2 p-4 text-[13px] text-[#999]"><Loader2 className="h-4 w-4 animate-spin" /> Laster …</div>
          ) : kategorier.map((k) => {
            const Ikon = VARSEL_IKON[k] || Bell;
            const on = prefs[k] !== false;
            return (
              <div key={k} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-black/[0.02]">
                <span className="flex items-center gap-2.5 text-[13px] text-[#333]">
                  <Ikon className="h-4 w-4" style={{ color: VARSEL_FARGE[k] || '#666' }} />
                  {katalog[k]}
                </span>
                <button
                  onClick={() => onTogglePref(k)} data-testid={`varsel-pref-${k}`} role="switch" aria-checked={on}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-[#8b5cf6]' : 'bg-black/[0.15]'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-y-auto">
          {(!varsler || !varsler.length) ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6f5f3]"><Bell className="h-5 w-5 text-[#c8c8c8]" /></div>
              <p className="text-[13px] font-medium text-[#555]">Ingen varsler ennå</p>
              <p className="text-[12px] text-[#aaa]">Tildelinger, @omtaler og kommentarer dukker opp her.</p>
            </div>
          ) : varsler.map((n) => {
            const Ikon = VARSEL_IKON[n.type] || Bell;
            return (
              <button
                key={n.id} onClick={() => onOpen(n)} data-testid="varsel-rad"
                className={`flex w-full items-start gap-3 border-b border-black/[0.04] px-4 py-3 text-left transition-colors hover:bg-black/[0.02] ${n.read ? '' : 'bg-[#faf8ff]'}`}
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: `${VARSEL_FARGE[n.type] || '#666'}18` }}>
                  <Ikon className="h-3.5 w-3.5" style={{ color: VARSEL_FARGE[n.type] || '#666' }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#0a0a0a]">{n.taskTitle || 'Sak'}</span>
                  <span className="block text-[12.5px] leading-snug text-[#666]">{n.text}</span>
                  <span className="mt-0.5 block text-[11px] text-[#aaa]">{tidSiden(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8b5cf6]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TasksTab({ apiKey, user, onStats, onOpenBrukere }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fProsjekt, setFProsjekt] = useState('alle');
  const [fType, setFType] = useState('alle'); // sakstype-filter (kun Utvikling)
  const [fProdukt, setFProdukt] = useState('alle'); // produktfilter (kun Utvikling)
  const [gruppe, setGruppe] = useState('ingen');
  const [today, setToday] = useState(new Date().toISOString().slice(0, 10));
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [view, setView] = useState('tavle');
  const [fAnsvarlig, setFAnsvarlig] = useState('alle');
  const [fPri, setFPri] = useState(0);
  const [sok, setSok] = useState('');
  // Dyplenke: /admin/saker/<sak-id> åpner saken direkte (delbar URL).
  const [valgtId, setValgtId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const deler = window.location.pathname.split('/');
    return deler[2] === 'saker' && deler[3] ? decodeURIComponent(deler[3]) : null;
  });
  const [omrader, setOmrader] = useState(['drift']); // områder jeg har tilgang til (fra serveren)
  const [aktivtOmrade, setAktivtOmrade] = useState('drift');
  const [nyOpen, setNyOpen] = useState(false);
  const [personerOpen, setPersonerOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [hoverKol, setHoverKol] = useState(null);
  const [fokusId, setFokusId] = useState(null);
  const [valgteIds, setValgteIds] = useState([]);
  // Ekspanderte deloppgave-paneler i liste-/tabellvisning (per sak-id)
  const [utvidde, setUtvidde] = useState([]);
  const toggleUtvid = (id) => setUtvidde((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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

  // Rot-nivå bilde-opplasting (brukes av Ny sak-modalen).
  const uploadBildeRoot = useCallback(async (dataUrl) => {
    try {
      const r = await api('tasks/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl }) });
      const j = await r.json();
      return j.ok ? j.url : null;
    } catch (e) { return null; }
  }, [api]);

  // ═══ Prosjekter (Fase 4) ═══
  const [prosjektModal, setProsjektModal] = useState(false);
  const hentProsjekter = useCallback(async () => {
    try { const r = await api('projects'); const j = await r.json(); if (j.ok) setProjects(j.projects || []); } catch (e) {}
  }, [api]);
  const lagProsjekt = useCallback(async (navn, farge) => {
    try {
      const r = await api('projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: navn, color: farge }) });
      const j = await r.json();
      if (j.ok) { await hentProsjekter(); return j.project; }
    } catch (e) {}
    return null;
  }, [api, hentProsjekter]);

  // ═══ Utviklingsprodukter (Produkt → Komponenter) ═══
  const [devProducts, setDevProducts] = useState([]);
  const [produktAdminOpen, setProduktAdminOpen] = useState(false);
  const hentDevProdukter = useCallback(async () => {
    try { const r = await api('dev-products'); const j = await r.json(); if (j.ok) setDevProducts(j.products || []); } catch (e) {}
  }, [api]);

  // ═══ Varsler (in-app innboks) ═══
  const [varsler, setVarsler] = useState([]);
  const [varselUlest, setVarselUlest] = useState(0);
  const [varselOpen, setVarselOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [prefsKatalog, setPrefsKatalog] = useState({});
  const varselRef = useRef(null);

  const hentVarsler = useCallback(async () => {
    try {
      const r = await api('notifications');
      if (!r.ok) return;
      const j = await r.json();
      if (j.ok) { setVarsler(j.notifications || []); setVarselUlest(j.unread || 0); }
    } catch (e) {}
  }, [api]);

  const merkLest = useCallback(async (ids) => {
    setVarsler((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    setVarselUlest((u) => Math.max(0, u - ids.length));
    try { await api('notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }); } catch (e) {}
  }, [api]);

  const merkAlleLest = useCallback(async () => {
    setVarsler((prev) => prev.map((n) => ({ ...n, read: true })));
    setVarselUlest(0);
    try { await api('notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }); } catch (e) {}
  }, [api]);

  const apneVarsel = useCallback((n) => {
    if (!n.read) merkLest([n.id]);
    if (n.taskId) { setValgtId(n.taskId); setVarselOpen(false); }
  }, [merkLest]);

  const lastPrefs = useCallback(async () => {
    try {
      const r = await api('notifications/prefs');
      const j = await r.json();
      if (j.ok) { setPrefs(j.prefs.email || {}); setPrefsKatalog(j.katalog || {}); }
    } catch (e) {}
  }, [api]);

  const lagrePrefs = useCallback(async (neste) => {
    setPrefs(neste);
    try { await api('notifications/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: neste }) }); } catch (e) {}
  }, [api]);

  // Poll for varsler (30 s) + ved fanebytte-fokus.
  useEffect(() => {
    hentVarsler();
    const iv = window.setInterval(hentVarsler, 30000);
    const onFocus = () => hentVarsler();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [hentVarsler]);

  // Lukk varselpanel ved klikk utenfor.
  useEffect(() => {
    if (!varselOpen) return undefined;
    const onDoc = (e) => { if (varselRef.current && !varselRef.current.contains(e.target)) { setVarselOpen(false); setPrefsOpen(false); } };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [varselOpen]);

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
      setProjects(j.projects || []);
      setOmrader(Array.isArray(j.spaces) && j.spaces.length ? j.spaces : ['drift']);
      setToday(j.today || today);
      meldStats(j.tasks || [], j.today || today);
      sisteSyncRef.current = new Date().toISOString();
      setFeil('');
    } catch (e) {
      setFeil(e.message || 'Nettverksfeil');
    } finally {
      setLaster(false);
    }
  }, [api, meldStats]); // eslint-disable-line

  useEffect(() => { last(); }, [last]);
  useEffect(() => { hentDevProdukter(); }, [hentDevProdukter]);

  // ═══ Sanntid (Fase 2): diff-poll hvert 10 s → tavla oppdateres live uten
  // refresh når andre endrer saker. Hopper over mens man drar (drag) eller har
  // en meny/skuff-interaksjon som ikke tåler at lista bytter under føttene. ═══
  const sisteSyncRef = useRef(new Date().toISOString());
  const [liveSync, setLiveSync] = useState(false);
  useEffect(() => {
    let stoppet = false;
    const poll = async () => {
      if (dragId) return; // ikke forstyrr pågående drag
      try {
        const r = await api(`tasks/since?ts=${encodeURIComponent(sisteSyncRef.current)}`);
        if (!r.ok) return;
        const j = await r.json();
        if (!j.ok || stoppet) return;
        sisteSyncRef.current = j.now || sisteSyncRef.current;
        const endret = j.changed || [];
        const fjern = new Set(j.removedIds || []);
        if (!endret.length && !fjern.size) return;
        setTasks((prev) => {
          const byId = new Map(prev.map((t) => [t.id, t]));
          for (const t of endret) byId.set(t.id, t);
          for (const id of fjern) byId.delete(id);
          const neste = [...byId.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          meldStats(neste, today);
          return neste;
        });
        setLiveSync(true);
        window.setTimeout(() => setLiveSync(false), 1200);
      } catch (e) {}
    };
    const iv = window.setInterval(poll, 10000);
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    return () => { stoppet = true; window.clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [api, dragId, today, meldStats]);

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
      else if (d.do === 'personer') { if (onOpenBrukere) onOpenBrukere(); else setPersonerOpen(true); }
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

  // --- Sletting med passordbekreftelse + Angre ---
  // Sikkerhet: å slette saker krever at brukeren bekrefter med eget passord
  // (håndhevet server-side på DELETE). Etter bekreftelse fjernes saken
  // umiddelbart fra UI, og selve DELETE utsettes 6 s slik at «Angre» i
  // toasten kan hente den tilbake uten datatap.
  const pendingSlett = useRef(null);
  const slettPassordRef = useRef(''); // bekreftet passord for ventende DELETE
  const [bekreftSlett, setBekreftSlett] = useState(null); // { ids, bulk? }

  const utforPendingSlett = useCallback(() => {
    const p = pendingSlett.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pendingSlett.current = null;
    p.tasks.forEach((t) => {
      api(`tasks/${t.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: slettPassordRef.current }),
      }).catch(() => {});
    });
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

  const slett = useCallback((id) => setBekreftSlett({ ids: [id] }), []);

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
      try {
        fetch(`/api/admin/tasks/${t.id}?key=${encodeURIComponent(apiKey)}`, {
          method: 'DELETE', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: slettPassordRef.current }),
        });
      } catch (e) {}
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

  const slettFraArkiv = useCallback((id) => setBekreftSlett({ ids: [id] }), []);

  // --- Filtrering ---
  const filtrert = useMemo(() => {
    const s = sok.trim().toLowerCase();
    return tasks.filter((t) => {
      if ((t.space || 'drift') !== aktivtOmrade) return false;
      if (aktivtOmrade === 'utvikling') {
        if (fType !== 'alle' && (t.taskType || 'uten') !== fType) return false;
        if (fProdukt !== 'alle' && (t.productId || '') !== (fProdukt === 'ingen' ? '' : fProdukt)) return false;
      }
      if (mine && minId && t.assigneeId !== minId && !(t.followers || []).includes(minId)) return false;
      if (fAnsvarlig !== 'alle' && (t.assigneeId || '') !== fAnsvarlig) return false;
      if (fPri && t.priority !== fPri) return false;
      if (fProsjekt !== 'alle' && (t.projectId || '') !== (fProsjekt === 'ingen' ? '' : fProsjekt)) return false;
      if (s && !`${t.title} ${t.description} ${(t.labels || []).join(' ')}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [tasks, mine, minId, fAnsvarlig, fPri, fProsjekt, sok, aktivtOmrade, fType, fProdukt]);

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
    const iOmrade = tasks.filter((t) => (t.space || 'drift') === aktivtOmrade);
    const aapne = iOmrade.filter((t) => t.status !== 'done');
    const uke = new Date(Date.now() - 7 * 864e5).toISOString();
    return {
      aapne: aapne.length,
      forfalt: aapne.filter((t) => t.dueDate && t.dueDate < today).length,
      iDag: aapne.filter((t) => t.dueDate === today).length,
      ferdig7d: iOmrade.filter((t) => t.status === 'done' && (t.completedAt || '') >= uke).length,
    };
  }, [tasks, today, aktivtOmrade]);

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
      if (nyOpen || valgtId || personerOpen || view === 'arkiv' || view === 'innsikt') return;
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

  // ── Delbar saks-URL: adressen følger åpen sak (/admin/saker/<id>).
  // replaceState (ikke push) — tilbakeknappen navigerer seksjoner, ikke skuffer.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const deler = window.location.pathname.split('/');
    if (deler[2] !== 'saker') return; // annen seksjon aktiv — ikke rør adressen
    const maal = valgtId ? `/admin/saker/${encodeURIComponent(valgtId)}` : '/admin/saker';
    if (window.location.pathname !== maal) window.history.replaceState({ dh: true }, '', maal + window.location.search);
  }, [valgtId]);
  // Dyplenke som ikke finnes (slettet/utenfor tilgang) → rydd + gi beskjed.
  const deepSjekket = useRef(false);
  useEffect(() => {
    if (laster || deepSjekket.current) return;
    deepSjekket.current = true;
    if (valgtId && !tasks.some((t) => t.id === valgtId) && !arkivTasks.some((t) => t.id === valgtId)) {
      setValgtId(null);
      visToast('Fant ikke saken — den kan være slettet eller utenfor din tilgang', 'feil');
    }
  }, [laster, valgtId, tasks, arkivTasks, visToast]);

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

  // Aktive filtre → fjernbare chips på kontrollinjen (Linear-style).
  const aktiveFiltre = [];
  if (mine) aktiveFiltre.push({ k: 'mine', l: 'Mine saker', clear: toggleMine });
  if (fAnsvarlig !== 'alle') aktiveFiltre.push({ k: 'ansvarlig', l: (members.find((m) => m.id === fAnsvarlig) || {}).name || 'Ansvarlig', clear: () => setFAnsvarlig('alle') });
  if (fPri !== 0) aktiveFiltre.push({ k: 'pri', l: fPri === 1 ? 'P1 · Kritisk' : fPri === 2 ? 'P2 · Normal' : 'P3 · Lav', dot: fPri === 1 ? '#e11d48' : fPri === 2 ? '#b45309' : '#6b7280', clear: () => setFPri(0) });
  if (fProsjekt !== 'alle') {
    const prF = projects.find((p) => p.id === fProsjekt);
    aktiveFiltre.push({ k: 'prosjekt', l: prF ? prF.name : 'Uten prosjekt', dot: prF && prF.color, clear: () => setFProsjekt('alle') });
  }
  if (aktivtOmrade === 'utvikling' && fType !== 'alle') {
    const tiF = sakstypeInfo(fType);
    aktiveFiltre.push({ k: 'type', l: tiF ? tiF.l : 'Uten type', dot: tiF && tiF.farge, clear: () => setFType('alle') });
  }
  if (aktivtOmrade === 'utvikling' && fProdukt !== 'alle') {
    const pdF = devProducts.find((p) => p.id === fProdukt);
    aktiveFiltre.push({ k: 'produkt', l: pdF ? pdF.name : 'Uten produkt', dot: pdF && pdF.color, clear: () => setFProdukt('alle') });
  }
  const nullstillFiltre = () => {
    if (mine) toggleMine();
    setFAnsvarlig('alle'); setFPri(0); setFProsjekt('alle'); setFType('alle'); setFProdukt('alle');
  };

  // Områdefaner — gjenbrukes på kommandolinjen (desktop) og mobil-toppen.
  const omradeFaner = omrader.length > 1 ? (
    <div className="no-scrollbar flex min-w-0 shrink items-center gap-1.5 overflow-x-auto" data-testid="space-switcher">
      {OMRADER_UI.filter((o) => omrader.includes(o.k)).map((o) => {
        const antall = tasks.filter((t) => (t.space || 'drift') === o.k && t.status !== 'done' && !t.archived).length;
        const aktiv = aktivtOmrade === o.k;
        const OIkon = o.icon;
        return (
          <button
            key={o.k}
            onClick={() => setAktivtOmrade(o.k)}
            data-testid={`space-${o.k}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[12.5px] font-semibold transition-all active:scale-[0.97] ${
              aktiv ? 'bg-[#0a0a0a] text-white shadow-[0_2px_10px_rgba(0,0,0,0.18)]' : 'border border-black/[0.07] bg-white text-[#777] hover:border-black/[0.16] hover:text-[#0a0a0a]'
            }`}
          >
            <OIkon className="h-3.5 w-3.5" />
            {o.l}
            {antall > 0 && <span className={`text-[11px] font-bold tabular-nums ${aktiv ? 'text-white/60' : 'text-[#bbb]'}`}>{antall}</span>}
            {o.k !== 'drift' && <Lock className={`h-3 w-3 ${aktiv ? 'text-white/50' : 'text-[#d5d2cc]'}`} />}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div data-testid="tasks-tab">
      {/* ═══ Kommandolinje (desktop) — ALT på én rad, slik Linear gjør det:
          områder · søk · filter · chips | puls · visninger · hjelp · varsler · personer · ny sak ═══ */}
      <div className="mb-4 hidden items-center gap-2 md:mb-5 lg:flex">
        {omradeFaner}
        {omradeFaner && <span className="mx-0.5 h-5 w-px shrink-0 bg-black/[0.08]" aria-hidden />}
        {/* Søk — kollapset til ikon til det trengs (Linear-style) */}
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999]" />
          <input
            value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk i saker …"
            data-testid="tasks-search"
            title="Søk i saker"
            className={`h-8 rounded-lg border bg-white pl-8 text-[12.5px] outline-none transition-all ${
              sok
                ? 'w-48 border-[#8b5cf6]/40 pr-3 ring-2 ring-[#8b5cf6]/10'
                : 'w-8 cursor-pointer border-black/[0.08] pr-0 placeholder:text-transparent hover:border-black/[0.16] focus:w-52 focus:cursor-text focus:border-[#8b5cf6]/50 focus:pr-3 focus:ring-2 focus:ring-[#8b5cf6]/15 focus:placeholder:text-[#bbb]'
            }`}
          />
        </div>
        <FilterKnapp
          antall={aktiveFiltre.length}
          minId={minId} mine={mine} toggleMine={toggleMine}
          fAnsvarlig={fAnsvarlig} setFAnsvarlig={setFAnsvarlig}
          fPri={fPri} setFPri={setFPri}
          fProsjekt={fProsjekt} setFProsjekt={setFProsjekt}
          fType={fType} setFType={setFType}
          fProdukt={fProdukt} setFProdukt={setFProdukt}
          members={members} projects={projects} devProducts={devProducts}
          utvikling={aktivtOmrade === 'utvikling'}
          onNyttProsjekt={() => setProsjektModal(true)}
          onNullstill={nullstillFiltre}
        />
        {aktiveFiltre.length > 0 && (
          <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
            {aktiveFiltre.map((f) => (
              <FilterChip key={f.k} label={f.l} dot={f.dot} onClear={f.clear} testid={`filter-chip-${f.k}`} />
            ))}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Stille puls — tall uten støy; rødt kun når noe faktisk haster */}
          <span className="mr-1.5 hidden items-center gap-2.5 text-[11.5px] font-medium text-[#b0aca6] xl:flex" data-testid="tasks-quiet-stats">
            <span><span className="font-bold text-[#777] tabular-nums">{stats.aapne}</span> åpne</span>
            {stats.forfalt > 0 && <span className="font-bold text-rose-600 tabular-nums">{stats.forfalt} forfalt</span>}
            {stats.iDag > 0 && <span><span className="font-bold text-[#777] tabular-nums">{stats.iDag}</span> i dag</span>}
          </span>
          <div className="flex rounded-lg border border-black/[0.08] bg-white p-0.5">
            {VISNINGER.map((v) => (
              <ViewBtn key={v.k} active={view === v.k} onClick={() => setView(v.k)} icon={v.icon} label={v.l} testid={`tasks-view-${v.k}`} />
            ))}
          </div>
          <HurtigtastKnapp />
          <span className="mx-0.5 h-5 w-px shrink-0 bg-black/[0.08]" aria-hidden />
          <button
            onClick={() => { setVarselOpen((v) => !v); setPrefsOpen(false); }}
            data-testid="tasks-bell-btn"
            title="Varsler"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#555] transition-all hover:border-black/[0.16] hover:text-[#0a0a0a]"
          >
            <Bell className="h-3.5 w-3.5" />
            {varselUlest > 0 && (
              <span data-testid="tasks-bell-badge" className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e11d48] px-1 text-[10px] font-bold text-white">{varselUlest > 9 ? '9+' : varselUlest}</span>
            )}
          </button>
          <button
            onClick={() => (onOpenBrukere ? onOpenBrukere() : setPersonerOpen(true))}
            data-testid="tasks-members-btn"
            title="Personer og tilgang"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#555] transition-all hover:border-black/[0.16] hover:text-[#0a0a0a]"
          >
            <Users className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setNyOpen(true)}
            data-testid="tasks-new-btn"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
          >
            <Plus className="h-3.5 w-3.5" /> Ny sak <kbd className="ml-0.5 hidden rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold xl:inline">N</kbd>
          </button>
        </div>
      </div>

      {/* ═══ Mobil/nettbrett — faner + puls + verktøy ═══ */}
      <div className="mb-4 lg:hidden">
        {omradeFaner && <div className="mb-2.5">{omradeFaner}</div>}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
          <SummaryChip label="Åpne" value={stats.aapne} />
          <SummaryChip label="Forfalt" value={stats.forfalt} warn={stats.forfalt > 0} testid="tasks-overdue-chip" />
          <SummaryChip label="I dag" value={stats.iDag} />
          <SummaryChip label="Ferdig siste 7 d" value={stats.ferdig7d} good />
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
              onClick={() => { setVarselOpen((v) => !v); setPrefsOpen(false); }}
              data-testid="tasks-bell-btn-mobile"
              title="Varsler"
              className="relative ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-[#555]"
            >
              <Bell className="h-5 w-5" />
              {varselUlest > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e11d48] px-1 text-[10px] font-bold text-white">{varselUlest > 9 ? '9+' : varselUlest}</span>
              )}
            </button>
            <button
              onClick={() => (onOpenBrukere ? onOpenBrukere() : setPersonerOpen(true))}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-4 text-[13.5px] font-medium text-[#555]"
            >
              <Users className="w-4 h-4" /> Personer
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Varsel-innboks (fast panel øverst til høyre) ═══ */}
      {varselOpen && (
        <VarselDropdown
          innerRef={varselRef}
          varsler={varsler}
          ulest={varselUlest}
          onOpen={apneVarsel}
          onMerkAlle={merkAlleLest}
          prefsOpen={prefsOpen}
          setPrefsOpen={(fn) => setPrefsOpen((v) => { const nv = typeof fn === 'function' ? fn(v) : fn; if (nv && !prefs) lastPrefs(); return nv; })}
          prefs={prefs}
          katalog={prefsKatalog}
          onTogglePref={(k) => lagrePrefs({ ...(prefs || {}), [k]: !(prefs && prefs[k] === false) ? false : true })}
        />
      )}

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
              onClick={() => (onOpenBrukere ? onOpenBrukere() : setPersonerOpen(true))}
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
                      key={t.id} t={t} today={today} member={medlem(t.assigneeId)} members={members} devProducts={devProducts}
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
                  const subL = t.subtasks || [];
                  const utvidet = utvidde.includes(t.id);
                  return (
                    <React.Fragment key={t.id}>
                    <button
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
                      {subL.length > 0 && (
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleUtvid(t.id); }}
                          title={utvidet ? 'Skjul sjekkliste' : 'Vis sjekkliste'}
                          data-testid={`list-subtasks-toggle-${t.id}`}
                          className={`flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-[11px] transition-colors hover:bg-black/[0.05] ${subL.every((s) => s.done) ? 'text-emerald-600' : 'text-[#aaa]'}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />{subL.filter((s) => s.done).length}/{subL.length}
                          <ChevronDown className={`h-3 w-3 transition-transform ${utvidet ? 'rotate-180' : ''}`} />
                        </span>
                      )}
                      {(t.comments || []).length > 0 && (
                        <span className="hidden sm:flex items-center gap-1 text-[11px] text-[#aaa]"><MessageSquare className="w-3 h-3" />{t.comments.length}</span>
                      )}
                      <DueChip due={t.dueDate} today={today} done={t.status === 'done'} />
                      {m ? <Avatar member={m} size={24} /> : <span className="hidden w-6 sm:block" />}
                    </button>
                    {utvidet && subL.length > 0 && (
                      <div className="border-b border-black/[0.04] bg-[#fbfaf9] py-2 pl-12 pr-4">
                        <SubtaskMiniListe t={t} members={members} onPatch={(p) => oppdater(t.id, p)} />
                      </div>
                    )}
                    </React.Fragment>
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
                const utvidet = utvidde.includes(t.id);
                return (
                  <React.Fragment key={t.id}>
                  <tr
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
                          <span
                            onClick={(e) => { e.stopPropagation(); toggleUtvid(t.id); }}
                            title={utvidet ? 'Skjul sjekkliste' : 'Vis sjekkliste'}
                            data-testid={`table-subtasks-toggle-${t.id}`}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-black/[0.05]"
                          >
                            <span className="h-1 w-9 overflow-hidden rounded-full bg-[#eee]">
                              <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(subFerdig / sub.length) * 100}%` }} />
                            </span>
                            <span className="tabular-nums">{subFerdig}/{sub.length}</span>
                            <ChevronDown className={`h-3 w-3 transition-transform ${utvidet ? 'rotate-180' : ''}`} />
                          </span>
                        )}
                        {(t.attachments || []).length > 0 && <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{t.attachments.length}</span>}
                        {(t.comments || []).length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{t.comments.length}</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-[#999]">{fmtTid(t.updatedAt)}</td>
                  </tr>
                  {utvidet && sub.length > 0 && (
                    <tr className="border-b border-black/[0.04] bg-[#fbfaf9]">
                      <td colSpan={7} className="py-2 pl-16 pr-4">
                        <SubtaskMiniListe t={t} members={members} onPatch={(p) => oppdater(t.id, p)} />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
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

      {/* ═══ Innsikt — KPI-er, gjennomstrømning, arbeidsmengde ═══ */}
      {view === 'innsikt' && (
        <SakerInnsikt api={api} members={members} projects={projects} onOpenTask={(id) => setValgtId(id)} />
      )}

      {/* ═══ Prosjekter — Linear-modellen: brief, status, milepæler, fremdrift ═══ */}
      {view === 'prosjekter' && (
        <ProsjekterVisning
          api={api}
          projects={projects}
          tasks={tasks}
          members={members}
          today={today}
          visToast={visToast}
          onChanged={hentProsjekter}
          onReloadTasks={last}
          onOpenTask={(id) => setValgtId(id)}
          onNyttProsjekt={() => setProsjektModal(true)}
          ui={{ Meny, DatoVelger, Avatar, RikTekst, MentionTekstfelt, StatusIkon }}
        />
      )}

      {/* Hurtigtast-hint flyttet til «?»-knappen på kontrollinjen (HurtigtastKnapp). */}

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
          projects={projects} alleSaker={tasks} onOpenTask={(id) => setValgtId(id)}
          onNyProsjekt={() => setProsjektModal(true)}
          omrader={omrader}
          devProducts={devProducts}
          onManageProducts={() => setProduktAdminOpen(true)}
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
          projects={projects}
          omrader={omrader}
          devProducts={devProducts}
          defaultSpace={aktivtOmrade}
          defaultStatus={typeof nyOpen === 'string' ? nyOpen : 'inbox'}
          uploadBilde={uploadBildeRoot}
          onClose={() => setNyOpen(false)}
          onCreate={async (payload) => { await opprett(payload); setNyOpen(false); }}
        />
      )}

      {/* ═══ Nytt prosjekt ═══ */}
      {prosjektModal && (
        <ProsjektModal
          onClose={() => setProsjektModal(false)}
          onCreate={async (navn, farge) => {
            const p = await lagProsjekt(navn, farge);
            if (p) { setFProsjekt(p.id); visToast(`Prosjektet «${p.name}» opprettet`); }
            setProsjektModal(false);
          }}
        />
      )}

      {/* ═══ Produkter og komponenter (Utvikling) ═══ */}
      {produktAdminOpen && (
        <ProduktAdmin
          api={api}
          products={devProducts}
          members={members}
          onChanged={hentDevProdukter}
          visToast={visToast}
          onClose={() => setProduktAdminOpen(false)}
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
            onClick={() => setBekreftSlett({ ids: [...valgteIds], bulk: true })}
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

      {/* ═══ Passordbekreftelse før sletting ═══ */}
      {bekreftSlett && (
        <SlettBekreftModal
          antall={bekreftSlett.ids.length}
          api={api}
          onClose={() => setBekreftSlett(null)}
          onConfirm={(pw) => {
            slettPassordRef.current = pw;
            if (bekreftSlett.bulk) setValgteIds([]);
            slettMedAngre(bekreftSlett.ids);
            setBekreftSlett(null);
          }}
        />
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
      <Icon className="w-3.5 h-3.5" /> <span className={active ? 'inline' : 'hidden'}>{label}</span>
    </button>
  );
}

/* ═══ FilterKnapp — samler ALLE filtre i én popover (Linear-style).
   Aktive filtre vises som fjernbare chips ved siden av knappen i stedet
   for en vegg av permanente dropdown-knapper. ═══ */
function FilterKnapp({ antall, minId, mine, toggleMine, fAnsvarlig, setFAnsvarlig, fPri, setFPri, fProsjekt, setFProsjekt, fType, setFType, fProdukt, setFProdukt, members, projects, devProducts, utvikling, onNyttProsjekt, onNullstill }) {
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
  const etikett = 'mb-1 mt-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b0aca6]';
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="tasks-filter-btn"
        aria-expanded={open}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-all active:scale-[0.97] ${
          open || antall > 0
            ? 'border-[#8b5cf6]/40 bg-[#f4f0fb] text-[#6d28d9]'
            : 'border-black/[0.08] bg-white text-[#555] hover:border-black/[0.16] hover:text-[#0a0a0a]'
        }`}
      >
        <ListFilter className="h-3.5 w-3.5" /> Filter
        {antall > 0 && <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#8b5cf6] px-1 text-[10px] font-bold text-white tabular-nums">{antall}</span>}
      </button>
      {open && (
        <div className="dh-fade absolute left-0 top-full z-[120] mt-1 w-[262px] rounded-xl border border-black/[0.07] bg-white p-3 shadow-[0_16px_48px_rgba(0,0,0,0.16)]" data-testid="tasks-filter-panel">
          {minId && (
            <button
              onClick={toggleMine}
              data-testid="tasks-mine-btn"
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-[13px] font-medium text-[#333] transition-colors hover:bg-[#f7f6f4]"
            >
              <User className="h-3.5 w-3.5 text-[#888]" />
              <span className="flex-1">Mine saker</span>
              <span className={`flex h-[18px] w-8 items-center rounded-full p-[2px] transition-colors ${mine ? 'bg-[#8b5cf6]' : 'bg-black/[0.12]'}`}>
                <span className={`h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${mine ? 'translate-x-[14px]' : ''}`} />
              </span>
            </button>
          )}
          <p className={etikett}>Ansvarlig</p>
          <Meny
            value={fAnsvarlig} onChange={setFAnsvarlig} compact className="w-full" menyBredde={234} testid="tasks-filter-assignee"
            options={[{ v: 'alle', l: 'Alle ansvarlige', icon: Users }, ...members.map((m) => ({ v: m.id, l: m.name, avatar: m }))]}
          />
          <p className={etikett}>Prioritet</p>
          <Meny
            value={fPri} onChange={(v) => setFPri(Number(v))} compact className="w-full" menyBredde={234} testid="tasks-filter-priority"
            options={[
              { v: 0, l: 'Alle prioriteter', icon: ArrowUpDown },
              { v: 1, l: 'P1 · Kritisk', dot: '#e11d48' },
              { v: 2, l: 'P2 · Normal', dot: '#b45309' },
              { v: 3, l: 'P3 · Lav', dot: '#6b7280' },
            ]}
          />
          <p className={etikett}>Prosjekt</p>
          <Meny
            value={fProsjekt} onChange={(v) => { if (v === '__nytt__') { onNyttProsjekt(); setOpen(false); return; } setFProsjekt(v); }}
            compact className="w-full" menyBredde={234} testid="tasks-filter-project"
            options={[
              { v: 'alle', l: 'Alle prosjekter', icon: Folder },
              { v: 'ingen', l: 'Uten prosjekt' },
              ...projects.map((p) => ({ v: p.id, l: p.name, dot: p.color })),
              { v: '__nytt__', l: 'Nytt prosjekt …', icon: FolderPlus },
            ]}
          />
          {utvikling && (
            <>
              <p className={etikett}>Sakstype</p>
              <Meny
                value={fType} onChange={setFType} compact className="w-full" menyBredde={234} testid="tasks-filter-type"
                options={[
                  { v: 'alle', l: 'Alle typer' },
                  ...SAKSTYPE_UI.map((t) => ({ v: t.k, l: t.l, dot: t.farge })),
                  { v: 'uten', l: 'Uten type' },
                ]}
              />
              <p className={etikett}>Produkt</p>
              <Meny
                value={fProdukt} onChange={setFProdukt} compact className="w-full" menyBredde={234} testid="tasks-filter-product"
                options={[
                  { v: 'alle', l: 'Alle produkter', icon: Boxes },
                  ...devProducts.map((p) => ({ v: p.id, l: p.name, dot: p.color })),
                  { v: 'ingen', l: 'Uten produkt' },
                ]}
              />
            </>
          )}
          {antall > 0 && (
            <button
              onClick={() => { onNullstill(); setOpen(false); }}
              data-testid="tasks-filter-reset"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] py-1.5 text-[12.5px] font-semibold text-[#666] transition-all hover:border-black/[0.16] hover:text-[#0a0a0a]"
            >
              <X className="h-3.5 w-3.5" /> Nullstill filtre
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* Fjernbar chip for et aktivt filter — vises ved siden av Filter-knappen. */
function FilterChip({ label, dot, onClear, testid }) {
  return (
    <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#f4f0fb] pl-2.5 pr-1 text-[12.5px] font-medium text-[#6d28d9]" data-testid={testid}>
      {dot && <span className="h-[7px] w-[7px] rounded-full" style={{ background: dot }} />}
      <span className="max-w-[140px] truncate">{label}</span>
      <button onClick={onClear} className="rounded-md p-1 text-[#a78bda] transition-colors hover:bg-[#e8def8] hover:text-[#6d28d9]" aria-label={`Fjern filter ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/* ═══ Hurtigtast-hjelp — liten «?»-knapp med popover i stedet for en
   permanent hint-rad under tavlen. ═══ */
function HurtigtastKnapp() {
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
  const rader = [
    ['↑↓', 'Naviger mellom saker'], ['↵', 'Åpne valgt sak'], ['N', 'Ny sak'], ['M', 'Mine saker'],
    ['X', 'Marker sak'], ['⇧↑↓', 'Utvid markering'], ['1–4', 'Sett status i åpen sak'], ['P', 'Prioritet i åpen sak'], ['esc', 'Lukk'],
  ];
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Hurtigtaster"
        data-testid="tasks-shortcuts-btn"
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
          open ? 'border-[#8b5cf6]/40 bg-[#f4f0fb] text-[#6d28d9]' : 'border-black/[0.08] bg-white text-[#999] hover:border-black/[0.16] hover:text-[#555]'
        }`}
      >
        <Keyboard className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="dh-fade absolute right-0 top-full z-[120] mt-1 w-[240px] rounded-xl border border-black/[0.07] bg-white p-3 shadow-[0_16px_48px_rgba(0,0,0,0.16)]" data-testid="tasks-shortcuts-hint">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b0aca6]">Hurtigtaster</p>
          <div className="space-y-1.5">
            {rader.map(([k, l]) => (
              <div key={k} className="flex items-center justify-between text-[12px] text-[#666]">
                <span>{l}</span><Kbd>{k}</Kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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

function SakKort({ t, today, member, members = [], devProducts = [], dras, fokus, valgt, index = 0, onClick, onDragStart, onDragEnd, onHurtig, onSlett }) {
  const [meny, setMeny] = useState(false);
  const [visSub, setVisSub] = useState(false); // ekspander deloppgavene på kortet
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
        {t.space === 'utvikling' && sakstypeInfo(t.taskType) && (() => {
          const ti = sakstypeInfo(t.taskType); const TIkon = ti.icon;
          return <span className="mt-1" title={ti.l} data-testid={`card-type-${t.id}`}><TIkon className="h-3.5 w-3.5" style={{ color: ti.farge }} /></span>;
        })()}
        <p className={`flex-1 text-[13px] font-semibold leading-snug ${ferdig ? 'text-[#9a9a9a] line-through' : 'text-[#1a1a1a]'}`}>{t.title}</p>
      </div>
      {(() => {
        // Produkt → Komponent-merke (kun utviklingssaker med produkt).
        if (t.space !== 'utvikling' || !t.productId) return null;
        const prod = devProducts.find((p) => p.id === t.productId);
        if (!prod) return null;
        const komp = t.componentId ? (prod.components || []).find((c) => c.id === t.componentId) : null;
        return (
          <div className="mt-1.5">
            <span className="inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: prod.color, background: `${prod.color}14` }} data-testid={`card-product-${t.id}`}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: prod.color }} />
              <span className="truncate">{prod.name.replace(' (digihome.no)', '')}{komp ? ` → ${komp.name}` : ''}</span>
            </span>
          </div>
        );
      })()}
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
          <button
            onClick={(e) => { e.stopPropagation(); setVisSub((v) => !v); }}
            title={visSub ? 'Skjul sjekkliste' : 'Vis sjekkliste'}
            data-testid={`card-subtasks-toggle-${t.id}`}
            className={`flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] transition-colors hover:bg-black/[0.05] ${t.subtasks.every((s) => s.done) ? 'text-emerald-600' : 'text-[#aaa]'}`}
          >
            <CheckCircle2 className="w-3 h-3" />{t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
            <ChevronDown className={`h-3 w-3 transition-transform ${visSub ? 'rotate-180' : ''}`} />
          </button>
        )}
        {(t.attachments || []).length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-[#aaa]"><Paperclip className="w-3 h-3" />{t.attachments.length}</span>
        )}
        {t.recurrence && <Repeat className="w-3 h-3 text-[#aaa]" title="Gjentakende sak" />}
        {Array.isArray(t.restrictedTo) && t.restrictedTo.length > 0 && (
          <Lock className="h-3 w-3 text-[#d97706]" title={`Begrenset synlighet — kun ${t.restrictedTo.length} personer + admin`} data-testid={`card-lock-${t.id}`} />
        )}
        {(t.comments || []).length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-[#aaa]"><MessageSquare className="w-3 h-3" />{t.comments.length}</span>
        )}
        <span className="ml-auto">{member && <Avatar member={member} size={22} />}</span>
      </div>
      {visSub && (t.subtasks || []).length > 0 && (
        <div className="mt-2 border-t border-black/[0.05] pt-2" onClick={(e) => e.stopPropagation()}>
          <SubtaskMiniListe t={t} members={members} onPatch={onHurtig} />
        </div>
      )}
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
  // variant 'stor'  = store modaler (Ny sak) — bredere og høyere
  const ytre = variant === 'panel'
    ? 'fixed inset-0 z-[110] flex items-end justify-center md:items-stretch md:justify-end'
    : variant === 'full'
    ? 'fixed inset-0 z-[110] flex items-end justify-center md:items-center md:justify-center md:p-6'
    : variant === 'stor'
    ? 'fixed inset-0 z-[110] flex items-end justify-center md:items-start md:px-4 md:pt-[6vh]'
    : 'fixed inset-0 z-[110] flex items-end justify-center md:items-start md:px-4 md:pt-[12vh]';
  const indre = variant === 'panel'
    ? 'relative flex h-[93dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:h-full md:max-w-[480px] md:rounded-none md:shadow-[-16px_0_48px_rgba(0,0,0,0.14)]'
    : variant === 'full'
    ? 'relative flex h-[93dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:h-full md:max-h-[880px] md:max-w-[1100px] md:rounded-2xl md:shadow-[0_40px_120px_rgba(0,0,0,0.38)]'
    : variant === 'stor'
    ? 'relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:max-h-[88vh] md:max-w-2xl md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.28)]'
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

/* ═══ DatoVelger — moderne dato-popover (Linear-style, norsk, uke fra mandag).
   Hurtigvalg (I dag / I morgen / Neste uke) + kalendergrid + «Fjern frist».
   Erstatter de gammeldagse native <input type="date">-feltene. ═══ */
const DV_DAGER = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];
const DV_MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const dvIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function DatoVelger({ value, onChange, placeholder = 'Ingen frist', testid, forfalt = false, naken = true, oppover = false, className = '' }) {
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

  const velg = (iso) => { onChange(iso); setOpen(false); };

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid={testid}
        aria-expanded={open}
        className={naken
          ? `flex h-7 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-[12.5px] transition-colors ${open ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]'}`
          : `flex h-8 w-full items-center gap-1.5 rounded-lg border bg-white px-2.5 text-left text-[12.5px] transition-all ${open ? 'border-[#8b5cf6]/50 ring-2 ring-[#8b5cf6]/15' : 'border-black/[0.08] hover:border-black/[0.16]'}`}
      >
        <Calendar className={`h-3.5 w-3.5 shrink-0 ${forfalt ? 'text-rose-500' : 'text-[#999]'}`} />
        <span className={`min-w-0 flex-1 truncate font-medium ${value ? (forfalt ? 'text-rose-600' : 'text-[#333]') : 'text-[#aaa]'}`}>
          {value ? `${fmtDato(value)}${forfalt ? ' · forfalt' : ''}` : placeholder}
        </span>
        {value && (
          <span
            role="button" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
            title="Fjern frist"
            className="rounded p-0.5 text-[#ccc] transition-colors hover:bg-black/[0.06] hover:text-[#777]"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>
      {open && <DatoPanel value={value || ''} onVelg={velg} oppover={oppover} testid={testid ? `${testid}-panel` : undefined} />}
    </div>
  );
}

/* Selve kalenderpanelet — deles av DatoVelger og sjekklistens frist-chip. */
function DatoPanel({ value, onVelg, oppover = false, hoyre = false, testid }) {
  const [mnd, setMnd] = useState(() => {
    const d = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const idagIso = dvIso(new Date());
  const hurtig = (() => {
    const n = new Date();
    const imorgen = new Date(n); imorgen.setDate(n.getDate() + 1);
    const nesteUke = new Date(n); nesteUke.setDate(n.getDate() + (((8 - n.getDay()) % 7) || 7)); // neste mandag
    return [
      { l: 'I dag', iso: dvIso(n) },
      { l: 'I morgen', iso: dvIso(imorgen) },
      { l: 'Neste uke', iso: dvIso(nesteUke) },
    ];
  })();
  // 42 celler: man–søn, med nabomånedenes dager nedtonet.
  const celler = (() => {
    const start = new Date(mnd);
    start.setDate(1 - ((mnd.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      return { d, iso: dvIso(d), iMnd: d.getMonth() === mnd.getMonth() };
    });
  })();

  return (
    <div className={`dh-fade absolute z-[130] w-[252px] rounded-xl border border-black/[0.07] bg-white p-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.16)] ${hoyre ? 'right-0' : 'left-0'} ${oppover ? 'bottom-full mb-1' : 'top-full mt-1'}`} data-testid={testid}>
      <div className="flex gap-1">
        {hurtig.map((h) => (
          <button
            key={h.l} type="button" onClick={() => onVelg(h.iso)}
            className={`flex-1 rounded-lg border py-1 text-[11.5px] font-semibold transition-all ${value === h.iso ? 'border-[#8b5cf6]/40 bg-[#f4f0fb] text-[#6d28d9]' : 'border-black/[0.07] text-[#666] hover:border-black/[0.16] hover:text-[#0a0a0a]'}`}
          >
            {h.l}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between px-0.5">
        <button type="button" onClick={() => setMnd(new Date(mnd.getFullYear(), mnd.getMonth() - 1, 1))} className="rounded-md p-1 text-[#999] hover:bg-black/[0.05] hover:text-[#333]" aria-label="Forrige måned">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <p className="text-[12px] font-bold capitalize text-[#333]">{DV_MND[mnd.getMonth()]} {mnd.getFullYear()}</p>
        <button type="button" onClick={() => setMnd(new Date(mnd.getFullYear(), mnd.getMonth() + 1, 1))} className="rounded-md p-1 text-[#999] hover:bg-black/[0.05] hover:text-[#333]" aria-label="Neste måned">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-7">
        {DV_DAGER.map((d) => (
          <span key={d} className="py-1 text-center text-[10px] font-bold uppercase text-[#c2beb8]">{d}</span>
        ))}
        {celler.map((c) => {
          const valgt = value === c.iso;
          const iDag = c.iso === idagIso;
          return (
            <button
              key={c.iso} type="button" onClick={() => onVelg(c.iso)}
              className={`mx-auto flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[12px] tabular-nums transition-colors ${
                valgt ? 'bg-[#0a0a0a] font-bold text-white' : iDag ? 'font-bold text-[#8b5cf6] hover:bg-[#f4f0fb]' : c.iMnd ? 'text-[#444] hover:bg-black/[0.05]' : 'text-[#d0cdc7] hover:bg-black/[0.04]'
              }`}
            >
              {c.d.getDate()}
            </button>
          );
        })}
      </div>
      {value && (
        <button
          type="button" onClick={() => onVelg(null)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.07] py-1.5 text-[12px] font-semibold text-[#888] transition-all hover:border-black/[0.16] hover:text-rose-600"
        >
          <X className="h-3 w-3" /> Fjern frist
        </button>
      )}
    </div>
  );
}

/* Kompakt egenskapsrad i saksskuffen — etikett venstre, verdi høyre. */
function PropRad({ label, children, testid }) {
  return (
    <div className="flex min-h-[32px] items-center gap-2 py-px" data-testid={testid}>
      <span className="w-[92px] shrink-0 text-[12px] font-medium text-[#999]">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ═══════════════ Skuff: full redigering av én sak ═══════════════ */
function SakSkuff({ t, members, today, actor, apiKey, api, projects = [], alleSaker = [], omrader = ['drift'], devProducts = [], onManageProducts = null, onOpenTask, onNyProsjekt, visToast, onReload, onClose, onPatch, onComment, onRemind, onDelete, onArchive }) {
  const [tittel, setTittel] = useState(t.title);
  const [beskrivelse, setBeskrivelse] = useState(t.description || '');
  const [beskRediger, setBeskRediger] = useState(false);
  // Last opp innlimt/sluppet bilde → intern URL (brukes av rik-tekst-editoren).
  const uploadBilde = useCallback(async (dataUrl) => {
    try {
      const r = await api('tasks/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl }) });
      const j = await r.json();
      if (j.ok) return j.url;
      visToast && visToast(j.error || 'Kunne ikke laste opp bildet');
    } catch (e) { visToast && visToast('Kunne ikke laste opp bildet'); }
    return null;
  }, [api, visToast]);
  const [kommentar, setKommentar] = useState('');
  const [sender, setSender] = useState(false);
  const [visLogg, setVisLogg] = useState(false);
  const [varsle, setVarsle] = useState(true);
  // Utvidet visning: stort sentrert kort med to kolonner (Linear-style)
  const [utvidet, setUtvidet] = useState(false);

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
    try { await onComment(tekst); setKommentar(''); } catch (e) {}
    setSender(false);
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
            onClick={async () => {
              const url = `${window.location.origin}/admin/saker/${encodeURIComponent(t.id)}`;
              try { await navigator.clipboard.writeText(url); visToast && visToast('Lenke til saken kopiert'); }
              catch (e) { window.prompt('Kopier lenken:', url); }
            }}
            title="Kopier lenke til saken"
            data-testid="drawer-share"
            className="rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0] hover:text-[#333]"
          >
            <Link2 className="w-[17px] h-[17px]" />
          </button>
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

        const sekBeskrivelse = (beskRediger || !(t.description || '').trim()) ? (
          <MentionTekstfelt
            value={beskrivelse}
            onChange={setBeskrivelse}
            members={members}
            rows={utvidet ? 6 : 4}
            testid="drawer-description"
            placeholder="Beskrivelse — hva handler saken om, og hva er «ferdig»? (@ nevner, ** ** = fet, lim inn bilde)"
            className="mt-2"
            popover="under"
            rik
            uploadBilde={uploadBilde}
            autoFocus={beskRediger}
            onBlurValue={() => { if (beskrivelse !== (t.description || '')) onPatch({ description: beskrivelse }); setBeskRediger(false); }}
          />
        ) : (
          <div
            className="dh-rik-wrap group/desc relative mt-2 cursor-text rounded-lg px-1 py-1 transition-colors hover:bg-black/[0.02]"
            onClick={() => setBeskRediger(true)}
            data-testid="drawer-description-preview"
            title="Klikk for å redigere"
          >
            <RikTekst text={t.description || ''} members={members} apiKey={apiKey} />
            <span className="pointer-events-none absolute right-1 top-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-[#999] opacity-0 shadow-sm transition-opacity group-hover/desc:opacity-100">Rediger</span>
          </div>
        );

        // ── Egenskaper — kompakte rader (Linear-style): etikett venstre, verdi
        // høyre, hårlinje over/under blokken. Erstatter de gamle seksjonene.
        const aktivProd = t.productId ? devProducts.find((p) => p.id === t.productId) : null;
        const sekEgenskaper = (
          <div className="mt-4 border-y border-black/[0.05] py-1.5" data-testid="drawer-props">
            <PropRad label="Ansvarlig">
              <Meny
                naken
                value={t.assigneeId || ''}
                onChange={(v) => onPatch({ assigneeId: v || null, notify: varsle })}
                testid="drawer-assignee"
                placeholder="Ingen"
                options={[{ v: '', l: 'Ingen', icon: User }, ...members.map((m) => ({ v: m.id, l: m.name, avatar: m, sub: m.email || undefined }))]}
              />
            </PropRad>
            <PropRad label="Frist">
              <DatoVelger
                value={t.dueDate || ''}
                onChange={(v) => onPatch({ dueDate: v })}
                testid="drawer-due"
                forfalt={!!(t.dueDate && t.status !== 'done' && t.dueDate < today)}
              />
            </PropRad>
            <PropRad label="Prioritet">
              <Meny
                naken
                value={t.priority}
                onChange={(v) => onPatch({ priority: Number(v) })}
                testid="drawer-priority"
                options={[
                  { v: 1, l: 'P1 · Kritisk', dot: '#e11d48' },
                  { v: 2, l: 'P2 · Normal', dot: '#b45309' },
                  { v: 3, l: 'P3 · Lav', dot: '#6b7280' },
                ]}
              />
            </PropRad>
            <PropRad label="Etiketter">
              <input
                key={`${t.id}:${(t.labels || []).join(',')}`}
                defaultValue={(t.labels || []).join(', ')}
                onBlur={(e) => {
                  const labels = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  if (JSON.stringify(labels) !== JSON.stringify(t.labels || [])) onPatch({ labels });
                }}
                placeholder="styre, økonomi …"
                data-testid="drawer-labels"
                className="h-7 w-full rounded-md bg-transparent px-1.5 text-[12.5px] font-medium outline-none transition-colors placeholder:text-[#ccc] hover:bg-black/[0.04] focus:bg-white focus:ring-2 focus:ring-[#8b5cf6]/15"
              />
            </PropRad>
            <PropRad label="Prosjekt">
              <Meny
                naken value={t.projectId || ''} testid="drawer-project"
                onChange={(v) => { if (v === '__nytt__') { onNyProsjekt && onNyProsjekt(); return; } onPatch({ projectId: v || null }); }}
                options={[
                  { v: '', l: 'Uten prosjekt', icon: Folder },
                  ...projects.map((p) => ({ v: p.id, l: p.name, dot: p.color })),
                  { v: '__nytt__', l: 'Nytt prosjekt …', icon: FolderPlus },
                ]}
              />
            </PropRad>
            {(() => {
              const projMs = t.projectId ? projects.find((p) => p.id === t.projectId) : null;
              if (!projMs || !(projMs.milestones || []).length) return null;
              return (
                <PropRad label="Milepæl">
                  <Meny
                    naken value={t.milestoneId || ''} testid="drawer-milestone" placeholder="Uten milepæl"
                    onChange={(v) => onPatch({ milestoneId: v || null })}
                    options={[
                      { v: '', l: 'Uten milepæl' },
                      ...projMs.milestones.map((m) => ({ v: m.id, l: m.name, dot: m.done ? '#059669' : '#8b5cf6' })),
                    ]}
                  />
                </PropRad>
              );
            })()}
            {omrader.length > 1 && (
              <PropRad label="Område">
                <Meny
                  naken value={OMRADER_UI.some((o) => o.k === t.space) ? t.space : 'drift'} testid="drawer-space"
                  onChange={(v) => onPatch({ space: v })}
                  options={OMRADER_UI.filter((o) => omrader.includes(o.k)).map((o) => ({ v: o.k, l: o.l, icon: o.icon }))}
                />
              </PropRad>
            )}
            {t.space === 'utvikling' && (
              <>
                <PropRad label="Sakstype" testid="drawer-dev">
                  <div className="flex flex-wrap gap-1 py-0.5">
                    {SAKSTYPE_UI.map((ty) => {
                      const TIkon = ty.icon; const aktivTy = t.taskType === ty.k;
                      return (
                        <button
                          key={ty.k}
                          onClick={() => onPatch({ taskType: aktivTy ? null : ty.k })}
                          data-testid={`drawer-type-${ty.k}`}
                          className={`flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold transition-all ${aktivTy ? 'shadow-[0_1px_4px_rgba(0,0,0,0.10)]' : 'border border-black/[0.07] text-[#999] hover:text-[#555]'}`}
                          style={aktivTy ? { color: ty.farge, background: `${ty.farge}14` } : undefined}
                        >
                          <TIkon className="h-3 w-3" /> {ty.l}
                        </button>
                      );
                    })}
                  </div>
                </PropRad>
                <PropRad label="Produkt">
                  <Meny
                    naken value={t.productId || ''} testid="drawer-product" placeholder="Uten produkt"
                    onChange={(v) => { if (v === '__adm__') { onManageProducts && onManageProducts(); return; } onPatch({ productId: v || null, componentId: null }); }}
                    options={[
                      { v: '', l: 'Uten produkt', icon: Boxes },
                      ...devProducts.map((p) => ({ v: p.id, l: p.name, dot: p.color })),
                      { v: '__adm__', l: 'Administrer produkter …', icon: Settings },
                    ]}
                  />
                </PropRad>
                {aktivProd && (aktivProd.components || []).length > 0 && (
                  <PropRad label="Komponent">
                    <Meny
                      naken value={t.componentId || ''} testid="drawer-component" placeholder="Uten komponent"
                      onChange={(v) => onPatch({ componentId: v || null })}
                      options={[{ v: '', l: 'Uten komponent' }, ...aktivProd.components.map((c) => ({ v: c.id, l: c.name }))]}
                    />
                  </PropRad>
                )}
              </>
            )}
            <PropRad label="Gjentakelse">
              <Meny
                naken value={t.recurrence || ''} onChange={(v) => onPatch({ recurrence: v || null })} testid="drawer-recurrence"
                options={REC_VALG.map((r) => ({ v: r.k, l: r.l, icon: r.k ? Repeat : undefined }))}
              />
            </PropRad>
            <PropRad label="E-postvarsel">
              <button
                onClick={() => setVarsle((v) => !v)}
                data-testid="drawer-notify-toggle"
                className="flex h-7 items-center gap-2 rounded-md px-1.5 text-[12.5px] font-medium text-[#555] transition-colors hover:bg-black/[0.04]"
              >
                <span className={`flex h-[16px] w-7 items-center rounded-full p-[2px] transition-colors ${varsle ? 'bg-[#8b5cf6]' : 'bg-black/[0.12]'}`}>
                  <span className={`h-3 w-3 rounded-full bg-white shadow transition-transform ${varsle ? 'translate-x-[12px]' : ''}`} />
                </span>
                {varsle ? 'På ved ny tildeling' : 'Av'}
              </button>
            </PropRad>
            {t.recurrence && (
              <p className="flex items-center gap-1.5 px-1.5 pb-1 pt-0.5 text-[11.5px] text-[#8b5cf6]">
                <Repeat className="h-3 w-3" /> Neste forekomst opprettes automatisk når saken fullføres.
              </p>
            )}
          </div>
        );

        const sekFrist = (t.dueDate && t.status !== 'done' && t.dueDate < today) ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Fristen ({fmtDato(t.dueDate)}) er passert
          </div>
        ) : null;

        // Sjekklistepunkt → fullverdig undersak (tekst/frist/ansvarlig følger med).
        const promoterSjekkpunkt = async (index, s) => {
          try {
            const r = await api(`tasks/${t.id}/promote-subtask`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ index, text: s.text, actor }),
            });
            const j = await r.json();
            if (!j.ok) throw new Error(j.error || 'Kunne ikke gjøre om til undersak');
            await onReload();
            visToast && visToast(`«${String(s.text).slice(0, 40)}${String(s.text).length > 40 ? '…' : ''}» er nå en undersak`);
          } catch (e) {
            visToast && visToast(e.message || 'Kunne ikke gjøre om til undersak', 'feil');
          }
        };
        const sekSjekkliste = <Sjekkliste items={t.subtasks || []} members={members} onChange={(subtasks) => onPatch({ subtasks })} onPromote={promoterSjekkpunkt} />;
        const sekFolgere = <FolgereFelt t={t} members={members} onPatch={onPatch} />;
        const sekVedlegg = <VedleggSeksjon t={t} apiKey={apiKey} api={api} actor={actor} onReload={onReload} visToast={visToast} />;
        const sekRelasjoner = (
          <RelasjonSeksjon t={t} alleSaker={alleSaker} onPatch={onPatch} onOpenTask={onOpenTask} />
        );
        const sekSynlighet = (
          <SynlighetSeksjon t={t} members={members} onPatch={onPatch} />
        );
        const sekUndersaker = (
          <UndersakSeksjon t={t} alleSaker={alleSaker} api={api} actor={actor} onReload={onReload} onOpenTask={onOpenTask} visToast={visToast} />
        );
        const sekTraader = <ChatTraadSeksjon sakId={t.id} apiKey={apiKey} />;

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
                <div className="mt-0.5 text-[13px] leading-relaxed text-[#444]">
                  <KommentarTekst text={c.text} members={members} apiKey={apiKey} />
                </div>
              </div>
            ))}
            {!(t.comments || []).length && <p className="text-[12.5px] text-[#bbb]">Ingen kommentarer ennå.</p>}
          </div>
          <div className="mt-2.5 flex items-end gap-2">
            <MentionTekstfelt
              value={kommentar}
              onChange={setKommentar}
              members={members}
              rows={2}
              testid="drawer-comment-input"
              placeholder={`Kommenter som ${actor} … (@ nevner, lim inn bilde)`}
              className="flex-1"
              popover="over"
              rik
              uploadBilde={uploadBilde}
              onEnterSend={sendKommentar}
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
                {sekUndersaker}
                {sekRelasjoner}
                {sekTraader}
                {sekVedlegg}
                {sekKommentarer}
                {sekAktivitet}
              </div>
              <aside className="mt-6 md:mt-1 md:rounded-2xl md:border md:border-black/[0.05] md:bg-[#fafaf8] md:px-4 md:py-3">
                <p className="hidden text-[11px] font-bold uppercase tracking-[0.1em] text-[#999] md:block">Detaljer</p>
                {sekEgenskaper}
                {sekFolgere}
                {sekSynlighet}
              </aside>
            </div>
          );
        }
        return (
          <>
            {sekTittel}
            {sekBeskrivelse}
            {sekEgenskaper}
            {sekFrist}
            {sekSjekkliste}
            {sekUndersaker}
            {sekRelasjoner}
            {sekTraader}
            {sekFolgere}
            {sekSynlighet}
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

/* ═══════════════ MentionTekstfelt — tekstfelt med @-mentions ═══════════════
   Best practice: mens du skriver vises @Navn som badge (pikselsynkront
   bakteppe bak et transparent tekstfelt), og «@» åpner autocomplete med
   personlisten (piltaster + Enter/Tab, mus). Gjenbrukes i beskrivelse,
   kommentarer og Ny sak-modalen. */
function MentionTekstfelt({
  value, onChange, members = [], placeholder, rows = 2, testid,
  className = '', popover = 'under', onEnterSend = null, onBlurValue = null,
  rik = false, uploadBilde = null, autoFocus = false,
}) {
  const [sok, setSok] = useState(null);
  const [idx, setIdx] = useState(0);
  const [lasterBilde, setLasterBilde] = useState(false);
  const taRef = useRef(null);
  const bakRef = useRef(null);
  const filRef = useRef(null);
  const minHRef = useRef(0);

  useEffect(() => { if (autoFocus && taRef.current) { const ta = taRef.current; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }, [autoFocus]);

  // Autovekst: feltet vokser med innholdet (Linear-stil) — minst `rows` høyt,
  // maks ~320px, deretter indre scroll. Bakteppet (badge-laget) er absolutt
  // posisjonert og følger høyden automatisk.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    if (!minHRef.current) minHRef.current = ta.offsetHeight; // høyden rows gir
    const MAKS = 320;
    ta.style.height = 'auto';
    const maal = Math.min(Math.max(ta.scrollHeight + 2, minHRef.current), MAKS);
    ta.style.height = `${maal}px`;
    ta.style.overflowY = ta.scrollHeight + 2 > MAKS ? 'auto' : 'hidden';
  }, [value]);

  // ─ Markdown-verktøy: opererer på markeringen i tekstfeltet ─
  const medTa = (fn) => { const ta = taRef.current; if (!ta) return; fn(ta, ta.selectionStart, ta.selectionEnd); };
  const omslutt = (pre, post, ph) => medTa((ta, s, e) => {
    const sel = value.slice(s, e) || ph || '';
    onChange(value.slice(0, s) + pre + sel + post + value.slice(e));
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + pre.length, s + pre.length + sel.length); });
  });
  const linjePre = (pre) => medTa((ta, s) => {
    const ls = value.lastIndexOf('\n', s - 1) + 1;
    onChange(value.slice(0, ls) + pre + value.slice(ls));
    requestAnimationFrame(() => { ta.focus(); const p = s + pre.length; ta.setSelectionRange(p, p); });
  });
  const settInnRaw = (str) => medTa((ta, s, e) => {
    onChange(value.slice(0, s) + str + value.slice(e));
    requestAnimationFrame(() => { ta.focus(); const p = s + str.length; ta.setSelectionRange(p, p); });
  });
  const settInnLenke = () => medTa((ta, s, e) => {
    const sel = value.slice(s, e) || 'tekst';
    const str = `[${sel}](https://)`;
    onChange(value.slice(0, s) + str + value.slice(e));
    requestAnimationFrame(() => { ta.focus(); const start = s + sel.length + 3; ta.setSelectionRange(start, start + 8); });
  });
  const behandleFiler = useCallback(async (files) => {
    const bilde = [...(files || [])].find((f) => f.type && f.type.startsWith('image/'));
    if (!bilde || !uploadBilde) return false;
    setLasterBilde(true);
    try {
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(bilde); });
      const url = await uploadBilde(dataUrl);
      if (url) settInnRaw(`\n![bilde](${url})\n`);
    } catch (e) {} finally { setLasterBilde(false); }
    return true;
  }, [uploadBilde, value]); // eslint-disable-line

  const oppdaterSok = (val, pos) => {
    const m = val.slice(0, pos).match(/(^|\s)@([^\s@]{0,30})$/);
    if (m) { setSok(m[2].toLowerCase()); setIdx(0); } else setSok(null);
  };
  const kandidater = sok === null ? [] : members.filter((m) => m.name.toLowerCase().includes(sok)).slice(0, 6);
  const settInn = (m) => {
    const ta = taRef.current;
    const pos = ta ? ta.selectionStart : value.length;
    const foer = value.slice(0, pos).replace(/@[^\s@]{0,30}$/, '');
    const ny = `${foer}@${m.name} ${value.slice(pos)}`;
    onChange(ny);
    setSok(null);
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); const p = foer.length + m.name.length + 2; ta.setSelectionRange(p, p); }
    });
  };

  // Badge-bakteppet: identisk typografi som feltet — @Navn utheves live
  const deler = useMemo(() => {
    if (!value || !value.includes('@') || !members.length) return [value];
    const navn = members.map((m) => m.name).filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!navn.length) return [value];
    const re = new RegExp(`@(${navn.join('|')})`, 'gi');
    const ut = []; let sist = 0; let m;
    while ((m = re.exec(value))) {
      if (m.index > sist) ut.push(value.slice(sist, m.index));
      ut.push({ mention: m[0] });
      sist = m.index + m[0].length;
    }
    if (sist < value.length) ut.push(value.slice(sist));
    return ut;
  }, [value, members]);

  const typo = 'p-3 text-[13.5px] leading-relaxed';
  const VerktoyKnapp = ({ onClick, title, children }) => (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onClick(); }} className="flex h-7 w-7 items-center justify-center rounded-md text-[#777] transition-colors hover:bg-black/[0.06] hover:text-[#0a0a0a]">{children}</button>
  );
  return (
    <div className={`relative min-w-0 ${className}`}>
      {rik && (
        <div className="mb-1.5 flex items-center gap-0.5 rounded-lg border border-black/[0.06] bg-[#faf9f7] px-1 py-0.5" data-testid={`${testid}-toolbar`}>
          <VerktoyKnapp title="Fet (**tekst**)" onClick={() => omslutt('**', '**', 'fet tekst')}><Bold className="h-3.5 w-3.5" /></VerktoyKnapp>
          <VerktoyKnapp title="Kursiv (*tekst*)" onClick={() => omslutt('*', '*', 'kursiv')}><Italic className="h-3.5 w-3.5" /></VerktoyKnapp>
          <VerktoyKnapp title="Overskrift" onClick={() => linjePre('## ')}><Heading className="h-3.5 w-3.5" /></VerktoyKnapp>
          <VerktoyKnapp title="Punktliste" onClick={() => linjePre('- ')}><List className="h-3.5 w-3.5" /></VerktoyKnapp>
          <VerktoyKnapp title="Lenke" onClick={settInnLenke}><Link2 className="h-3.5 w-3.5" /></VerktoyKnapp>
          {uploadBilde && (
            <VerktoyKnapp title="Sett inn bilde (eller lim inn / dra hit)" onClick={() => filRef.current && filRef.current.click()}>
              {lasterBilde ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            </VerktoyKnapp>
          )}
          <span className="ml-auto pr-1 text-[10px] text-[#c0bbb0]">Markdown</span>
          {uploadBilde && <input ref={filRef} type="file" accept="image/*" className="hidden" onChange={(e) => { behandleFiler(e.target.files); e.target.value = ''; }} />}
        </div>
      )}
      {kandidater.length > 0 && (
        <div
          className={`absolute left-0 z-[140] w-64 rounded-xl border border-black/[0.07] bg-white p-1 shadow-[0_16px_48px_rgba(0,0,0,0.16)] ${popover === 'over' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
          data-testid="mention-popup"
        >
          {kandidater.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); settInn(m); }}
              data-testid={`mention-option-${m.id}`}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${i === idx ? 'bg-[#f4f0fb]' : 'hover:bg-[#f7f6f4]'}`}
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
      <div className="relative">
      <div
        aria-hidden
        ref={bakRef}
        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-transparent bg-white text-[#333] ${typo}`}
      >
        {deler.map((d, i) => (typeof d === 'string'
          ? <React.Fragment key={i}>{d}</React.Fragment>
          : <span key={i} className="rounded-[5px] bg-[#ede9fe] font-semibold text-[#6d28d9] [box-decoration-break:clone]">{d.mention}</span>))}
        {'\u200b'}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); oppdaterSok(e.target.value, e.target.selectionStart); }}
        onScroll={() => { if (bakRef.current && taRef.current) bakRef.current.scrollTop = taRef.current.scrollTop; }}
        onPaste={(e) => { if (uploadBilde && e.clipboardData && e.clipboardData.files && e.clipboardData.files.length && [...e.clipboardData.files].some((f) => f.type.startsWith('image/'))) { e.preventDefault(); behandleFiler(e.clipboardData.files); } }}
        onDrop={(e) => { if (uploadBilde && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); behandleFiler(e.dataTransfer.files); } }}
        onKeyDown={(e) => {
          if (kandidater.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i + 1) % kandidater.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i - 1 + kandidater.length) % kandidater.length); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); settInn(kandidater[idx]); return; }
            if (e.key === 'Escape') { e.stopPropagation(); setSok(null); return; }
          }
          if (onEnterSend && e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); onEnterSend(); }
        }}
        onBlur={() => { setTimeout(() => setSok(null), 150); if (onBlurValue) onBlurValue(); }}
        rows={rows}
        data-testid={testid}
        placeholder={placeholder}
        className={`relative w-full resize-none rounded-xl border border-black/[0.07] bg-transparent text-transparent caret-[#0a0a0a] outline-none transition-all placeholder:text-[#bbb] selection:bg-[#8b5cf6]/25 hover:border-black/[0.14] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15 ${typo}`}
      />
      </div>
    </div>
  );
}

// Uthever @Fullt Navn i kommentartekst for personer som finnes i personlisten.
// ═══════════════ Rik tekst (Fase 3): markdown → trygg HTML + @mentions + bilder ═══════════════
// Sikkerhet: vi nøytraliserer rå HTML ved å escape < og > FØR marked, så de
// eneste taggene i resultatet er de marked selv genererer (overskrift, liste,
// lenke, bilde, kode osv.). Deretter saneres href/src (kun http(s)/mailto,
// interne bilde-URL-er får ?key). @mentions bevares via placeholder-tokens som
// overlever markdown og byttes til badges til slutt.
const _md = new Marked({ gfm: true, breaks: true });
const _okUrl = (h) => /^(https?:|mailto:)/i.test(String(h || '').trim());
function renderRik(text, members = [], apiKey = '') {
  if (!text) return '';
  let src = String(text);
  // 1) @mentions → tokens (lengste navn først for korrekt match)
  const mentions = [];
  const navn = members.map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (navn.length) {
    const re = new RegExp(`@(${navn.join('|')})`, 'gi');
    src = src.replace(re, (hel) => { const i = mentions.push(hel) - 1; return `%%MENTION${i}%%`; });
  }
  // 2) nøytraliser rå HTML
  src = src.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 3) markdown → HTML
  let html = '';
  try { html = _md.parse(src); } catch (e) { html = src; }
  // 4) saner lenker (åpne i ny fane) og bilder (kun trygge; interne får key)
  html = html.replace(/<a href="([^"]*)"([^>]*)>/gi, (m, href, rest) => (_okUrl(href) ? `<a href="${href}" target="_blank" rel="noopener noreferrer"${rest}>` : '<a>'));
  html = html.replace(/<img([^>]*?)src="([^"]*)"([^>]*)>/gi, (m, pre, src2, post) => {
    let s = src2;
    if (/^\/api\/admin\/tasks\/image\//.test(s)) s = `${s}${s.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
    else if (!_okUrl(s)) return '';
    return `<img${pre}src="${s}"${post} loading="lazy">`;
  });
  // 5) tokens → badges
  html = html.replace(/%%MENTION(\d+)%%/g, (m, i) => {
    const navnTxt = mentions[Number(i)] || '';
    return `<span class="dh-mention">${navnTxt.replace(/</g, '&lt;')}</span>`;
  });
  return html;
}

// Viser rik tekst (markdown m/ @mentions + bilder). Tom tekst → ingenting.
function RikTekst({ text, members, apiKey, className = '' }) {
  const html = useMemo(() => renderRik(text, members, apiKey), [text, members, apiKey]);
  if (!html) return null;
  return <div className={`dh-rik ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Bakoverkompatibel alias (kommentarer): rik tekst uten egen wrapper-margin.
function KommentarTekst({ text, members, apiKey }) {
  return <RikTekst text={text} members={members} apiKey={apiKey} />;
}

/* ═══════════════ Sak-relasjoner (Fase 4) — Linear-nivå ═══════════════
   blocks / blocked_by / related / duplicate. Endringer sendes som hel
   relations-liste via onPatch; backend speiler motparten (synkRelasjoner). */
const REL_UI = [
  { k: 'blocks', l: 'Blokkerer', icon: Ban, farge: '#e11d48' },
  { k: 'blocked_by', l: 'Blokkert av', icon: AlertTriangle, farge: '#b45309' },
  { k: 'related', l: 'Relatert til', icon: GitBranch, farge: '#8b5cf6' },
  { k: 'duplicate', l: 'Duplikat av', icon: Layers, farge: '#6b7280' },
];

function RelasjonSeksjon({ t, alleSaker = [], onPatch, onOpenTask }) {
  const [apen, setApen] = useState(false); // «legg til»-panelet
  const [type, setType] = useState('blocks');
  const [sok, setSok] = useState('');
  const [idx, setIdx] = useState(0);
  const sokRef = useRef(null);
  const relations = t.relations || [];

  useEffect(() => { if (apen && sokRef.current) sokRef.current.focus(); }, [apen]);
  useEffect(() => { setIdx(0); }, [sok]);
  useEffect(() => { setApen(false); setSok(''); }, [t.id]);

  const kandidater = useMemo(() => {
    if (!apen) return [];
    const brukt = new Set(relations.map((r) => r.taskId));
    const q = sok.trim().toLowerCase();
    return alleSaker
      .filter((s) => s.id !== t.id && !s.archived && !brukt.has(s.id))
      .filter((s) => !q || (s.title || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [apen, sok, alleSaker, relations, t.id]);

  const leggTil = (taskId) => {
    onPatch({ relations: [...relations, { type, taskId }] });
    setSok(''); setApen(false);
  };
  const fjern = (r) => onPatch({ relations: relations.filter((x) => !(x.type === r.type && x.taskId === r.taskId)) });

  if (!relations.length && !apen) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setApen(true)}
          data-testid="relations-add-btn"
          className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-[12px] font-semibold text-[#aaa] transition-colors hover:text-[#8b5cf6]"
        >
          <GitBranch className="h-3.5 w-3.5" /> Legg til relasjon
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6" data-testid="drawer-relations">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Relasjoner</p>
        {relations.length > 0 && <span className="text-[11px] font-bold tabular-nums text-[#ccc]">{relations.length}</span>}
        <button
          onClick={() => setApen((v) => !v)}
          data-testid="relations-add-btn"
          aria-label="Legg til relasjon"
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-[#bbb] transition-colors hover:bg-black/[0.05] hover:text-[#8b5cf6]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 space-y-0.5">
        {relations.map((r) => {
          const sak = alleSaker.find((s) => s.id === r.taskId);
          const ui = REL_UI.find((u) => u.k === r.type) || REL_UI[2];
          const Ikon = ui.icon;
          return (
            <div key={`${r.type}-${r.taskId}`} className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-[#fafaf8]" data-testid={`relation-row-${r.type}-${r.taskId}`}>
              <span className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: ui.farge, background: `${ui.farge}14` }}>
                <Ikon className="h-3 w-3" /> {ui.l}
              </span>
              {sak ? (
                <button onClick={() => onOpenTask && onOpenTask(sak.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left" data-testid={`relation-open-${sak.id}`}>
                  <StatusIkon status={sak.status} size={12} />
                  <span className={`min-w-0 flex-1 truncate text-[13px] font-medium transition-colors ${sak.status === 'done' ? 'text-[#b0aca6] line-through' : 'text-[#333] hover:text-[#8b5cf6]'}`}>{sak.title}</span>
                </button>
              ) : (
                <span className="min-w-0 flex-1 truncate text-[13px] italic text-[#bbb]">Slettet sak</span>
              )}
              <button
                onClick={() => fjern(r)}
                data-testid={`relation-remove-${r.type}-${r.taskId}`}
                aria-label="Fjern relasjon"
                className="shrink-0 rounded p-1 text-[#ddd] transition-colors hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      {apen && (
        <div className="mt-2 rounded-xl border border-black/[0.07] bg-[#fafaf8] p-2">
          <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1.5">
            {REL_UI.map((u) => {
              const Ikon = u.icon;
              return (
                <button
                  key={u.k}
                  onClick={() => setType(u.k)}
                  data-testid={`relation-type-${u.k}`}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${type === u.k ? 'bg-white shadow-[0_1px_5px_rgba(0,0,0,0.12)]' : 'text-[#999] hover:text-[#555]'}`}
                  style={type === u.k ? { color: u.farge } : undefined}
                >
                  <Ikon className="h-3 w-3" /> {u.l}
                </button>
              );
            })}
          </div>
          <input
            ref={sokRef}
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, Math.max(kandidater.length - 1, 0))); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === 'Enter' && kandidater[idx]) { e.preventDefault(); leggTil(kandidater[idx].id); }
              else if (e.key === 'Escape') { e.stopPropagation(); setApen(false); setSok(''); }
            }}
            data-testid="relation-search"
            placeholder="Søk etter sak å koble …"
            className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
          />
          <div className="mt-1 max-h-44 overflow-y-auto">
            {kandidater.map((s, i) => (
              <button
                key={s.id}
                onClick={() => leggTil(s.id)}
                data-testid={`relation-pick-${s.id}`}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${i === idx ? 'bg-[#f4f0fb]' : 'hover:bg-white'}`}
              >
                <StatusIkon status={s.status} size={12} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#333]">{s.title}</span>
              </button>
            ))}
            {!kandidater.length && <p className="px-2 py-2 text-[12px] text-[#bbb]">{sok ? 'Ingen treff' : 'Ingen flere saker å koble'}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Undersaker (Fase 4) — ekte saker med parentId ═══════════════
   Viser forelder-lenke («Del av»), barnas status med fremdriftslinje, og lar
   deg opprette nye undersaker som arver prosjekt fra forelderen. */
function UndersakSeksjon({ t, alleSaker = [], api, actor, onReload, onOpenTask, visToast }) {
  const [nytt, setNytt] = useState('');
  const [visInput, setVisInput] = useState(false);
  const [oppretter, setOppretter] = useState(false);
  const inpRef = useRef(null);
  const barn = alleSaker.filter((s) => s.parentId === t.id && !s.archived);
  const forelder = t.parentId ? alleSaker.find((s) => s.id === t.parentId) : null;
  const ferdig = barn.filter((s) => s.status === 'done').length;

  useEffect(() => { if (visInput && inpRef.current) inpRef.current.focus(); }, [visInput]);
  useEffect(() => { setVisInput(false); setNytt(''); }, [t.id]);

  const opprettUndersak = async () => {
    const tittel = nytt.trim();
    if (!tittel || oppretter) return;
    setOppretter(true);
    try {
      const r = await api('tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: tittel, status: 'inbox', priority: 2, parentId: t.id, projectId: t.projectId || null, notify: false, actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke opprette undersak');
      setNytt('');
      await onReload();
    } catch (e) { visToast && visToast(e.message || 'Kunne ikke opprette undersak', 'feil'); }
    setOppretter(false);
  };

  const koblFra = async (id) => {
    try {
      await api(`tasks/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: null, actor }),
      });
      await onReload();
    } catch (e) {}
  };

  if (!barn.length && !forelder && !visInput) {
    return (
      <div className="mt-1.5">
        <button
          onClick={() => setVisInput(true)}
          data-testid="subissue-add-btn"
          title="Undersaker er egne saker med notater, kommentarer og vedlegg"
          className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-[12px] font-semibold text-[#aaa] transition-colors hover:text-[#8b5cf6]"
        >
          <Layers className="h-3.5 w-3.5" /> Legg til undersak <span className="hidden font-normal text-[#c2beb8] sm:inline">— egen sak med notater og kommentarer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6" data-testid="drawer-subissues">
      {forelder && (
        <button
          onClick={() => onOpenTask && onOpenTask(forelder.id)}
          data-testid="parent-task-link"
          className="mb-2.5 flex max-w-full items-center gap-1.5 rounded-full bg-[#f3f2f0] py-1 pl-2.5 pr-3 text-[11.5px] font-semibold text-[#666] transition-colors hover:bg-[#ece4fa] hover:text-[#8b5cf6]"
        >
          <Layers className="h-3 w-3 shrink-0" />
          <span className="shrink-0 text-[#999]">Del av:</span>
          <span className="min-w-0 truncate">{forelder.title}</span>
        </button>
      )}
      {(barn.length > 0 || visInput) && (
        <>
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[#a78bda]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Undersaker</p>
            {barn.length > 0 && (
              <span className={`text-[11px] font-bold tabular-nums ${ferdig === barn.length ? 'text-emerald-600' : 'text-[#aaa]'}`}>{ferdig}/{barn.length}</span>
            )}
            <button
              onClick={() => setVisInput((v) => !v)}
              data-testid="subissue-add-btn"
              aria-label="Ny undersak"
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-[#bbb] transition-colors hover:bg-black/[0.05] hover:text-[#8b5cf6]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-[#c2beb8]">Egne saker med notater, kommentarer og vedlegg — klikk for å åpne</p>
          {barn.length > 0 && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eee]">
              <div className="h-full rounded-full bg-[#8b5cf6] transition-all duration-300" style={{ width: `${(ferdig / barn.length) * 100}%` }} />
            </div>
          )}
          <div className="mt-2 space-y-0.5">
            {barn.map((s) => (
              <div key={s.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-[#fafaf8]" data-testid={`subissue-row-${s.id}`}>
                <StatusIkon status={s.status} size={14} />
                <button onClick={() => onOpenTask && onOpenTask(s.id)} className="min-w-0 flex-1 text-left" data-testid={`subissue-open-${s.id}`}>
                  <span className={`block truncate text-[13.5px] font-medium transition-colors ${s.status === 'done' ? 'text-[#b0aca6] line-through' : 'text-[#333] hover:text-[#8b5cf6]'}`}>{s.title}</span>
                </button>
                {s.dueDate && <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-[#aaa]">{fmtSubDato(s.dueDate)}</span>}
                <button
                  onClick={() => koblFra(s.id)}
                  data-testid={`subissue-detach-${s.id}`}
                  title="Koble fra (saken beholdes)"
                  aria-label="Koble fra undersak"
                  className="shrink-0 rounded p-1 text-[#ddd] transition-colors hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {visInput && (
            <div className="mt-1.5 flex items-center gap-2">
              {oppretter ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8b5cf6]" /> : <Plus className="h-4 w-4 shrink-0 text-[#bbb]" />}
              <input
                ref={inpRef}
                value={nytt}
                onChange={(e) => setNytt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); opprettUndersak(); }
                  else if (e.key === 'Escape') { e.stopPropagation(); setVisInput(false); setNytt(''); }
                }}
                data-testid="subissue-add-input"
                placeholder="Ny undersak — Enter oppretter …"
                className="h-9 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}


/* ═══════════════ Underoppgaver / deloppgaver (Linear-nivå) ═══════════════
   Hver deloppgave kan ha egen ansvarlig (avatar-velger) og egen frist
   (dato-chip m/ forfalt-markering). Vises også i tavle/liste/tabell. */
const fmtSubDato = (d) => {
  try { return new Date(`${d}T00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }); } catch (e) { return d; }
};

// Kompakt ansvarlig-velger per deloppgave — avatar som åpner en liten popover
function SubAnsvarlig({ value, members, onChange, testid }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const m = members.find((x) => x.id === value);
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title={m ? `Ansvarlig: ${m.name}` : 'Sett ansvarlig for punktet'}
        data-testid={testid}
        className="flex h-6 w-6 items-center justify-center rounded-full transition-all hover:ring-2 hover:ring-[#8b5cf6]/25"
      >
        {m ? <Avatar member={m} size={20} /> : <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-[#ccc] text-[#ccc] transition-colors hover:border-[#8b5cf6] hover:text-[#8b5cf6]"><User className="h-3 w-3" /></span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 max-h-56 w-52 overflow-y-auto rounded-xl border border-black/[0.06] bg-white p-1 shadow-[0_10px_36px_rgba(0,0,0,0.14)]">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#999] hover:bg-[#f6f5f3]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-[#ccc]"><X className="h-3 w-3 text-[#ccc]" /></span>
            Ingen ansvarlig
          </button>
          {members.map((p) => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              data-testid={`${testid}-valg-${p.id}`}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#333] hover:bg-[#f6f5f3]"
            >
              <Avatar member={p} size={20} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.id === value && <Check className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Frist-chip per deloppgave — åpner den moderne dato-popoveren (DatoPanel).
function SubFrist({ value, done, today, onChange, testid }) {
  const forfalt = value && !done && value < today;
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
  return (
    <span ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        data-testid={testid}
        title={value ? `Frist ${fmtSubDato(value)} — klikk for å endre` : 'Sett frist for punktet'}
        className={`flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold tabular-nums transition-colors ${
          value
            ? forfalt ? 'bg-rose-50 text-rose-600' : done ? 'bg-[#f3f2f0] text-[#b5b5b5]' : 'bg-[#f3f2f0] text-[#777]'
            : 'text-[#ccc] hover:text-[#8b5cf6]'
        }`}
      >
        <Calendar className="h-3 w-3" />
        {value ? fmtSubDato(value) : ''}
      </button>
      {open && (
        <span onClick={(e) => e.stopPropagation()}>
          <DatoPanel hoyre value={value || ''} onVelg={(iso) => { onChange(iso); setOpen(false); }} />
        </span>
      )}
    </span>
  );
}

function Sjekkliste({ items, onChange, members = [], onPromote = null }) {
  const [nytt, setNytt] = useState('');
  const [promoterer, setPromoterer] = useState(null); // index under konvertering
  const today = new Date().toISOString().slice(0, 10);
  const ferdig = items.filter((s) => s.done).length;
  const leggTil = () => {
    const tekst = nytt.trim();
    if (!tekst) return;
    onChange([...items, { text: tekst, done: false, assigneeId: null, due: null }]);
    setNytt('');
  };
  const endreRad = (i, patch) => onChange(items.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));
  const promoter = async (i, s) => {
    if (!onPromote || promoterer !== null) return;
    setPromoterer(i);
    await onPromote(i, s);
    setPromoterer(null);
  };
  return (
    <div className="mt-6" data-testid="drawer-subtasks">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-3.5 w-3.5 text-[#b5b5b5]" />
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Sjekkliste</p>
        {items.length > 0 && (
          <span className={`text-[11px] font-bold tabular-nums ${ferdig === items.length ? 'text-emerald-600' : 'text-[#aaa]'}`}>{ferdig}/{items.length}</span>
        )}
      </div>
      <p className="mt-0.5 text-[11.5px] leading-snug text-[#c2beb8]">Raske avkrysningspunkter — uten egne notater</p>
      {items.length > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eee]">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(ferdig / items.length) * 100}%` }} />
        </div>
      )}
      <div className="mt-2 space-y-0.5">
        {items.map((s, i) => (
          <div key={s.id || `st-${i}`} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-[#fafaf8]">
            <button
              onClick={() => endreRad(i, { done: !s.done })}
              data-testid={`subtask-toggle-${i}`}
              className="shrink-0"
              aria-label={s.done ? 'Merk som ikke ferdig' : 'Merk som ferdig'}
            >
              {s.done
                ? <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
                : <Circle className="w-[18px] h-[18px] text-[#ccc] transition-colors hover:text-[#8b5cf6]" />}
            </button>
            <span className={`min-w-0 flex-1 text-[13.5px] ${s.done ? 'text-[#b0aca6] line-through' : 'text-[#333]'}`}>{s.text}</span>
            <SubFrist value={s.due || null} done={s.done} today={today} onChange={(due) => endreRad(i, { due })} testid={`subtask-due-${i}`} />
            <SubAnsvarlig value={s.assigneeId || null} members={members} onChange={(assigneeId) => endreRad(i, { assigneeId })} testid={`subtask-assignee-${i}`} />
            {onPromote && (
              <button
                onClick={() => promoter(i, s)}
                disabled={promoterer !== null}
                data-testid={`subtask-promote-${i}`}
                title="Gjør om til undersak — egen sak med notater, kommentarer og vedlegg"
                aria-label="Gjør om til undersak"
                className="shrink-0 rounded p-1 text-[#ddd] transition-colors hover:bg-[#f4f0fb] hover:text-[#8b5cf6] disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100"
              >
                {promoterer === i ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8b5cf6]" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={() => onChange(items.filter((_, xi) => xi !== i))}
              className="shrink-0 rounded p-1 text-[#ddd] transition-colors hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Fjern punkt"
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
          placeholder="Legg til punkt i sjekklisten …"
          className="h-9 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
        />
      </div>
    </div>
  );
}

/* Kompakte deloppgave-rader for visningene (tavle/liste/tabell) — toggle,
   frist og ansvarlig-avatar rett fra oversikten. */
function SubtaskMiniListe({ t, members, onPatch }) {
  const sub = t.subtasks || [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-0.5" data-testid={`subtask-mini-${t.id}`}>
      {sub.map((s, i) => {
        const m = members.find((x) => x.id === s.assigneeId);
        const forfalt = s.due && !s.done && s.due < today;
        return (
          <div key={s.id || i} className="flex items-center gap-2 rounded-md px-0.5 py-[3px]">
            <button
              onClick={(e) => { e.stopPropagation(); onPatch({ subtasks: sub.map((x, xi) => (xi === i ? { ...x, done: !x.done } : x)) }); }}
              data-testid={`subtask-mini-toggle-${t.id}-${i}`}
              className="shrink-0"
              aria-label={s.done ? 'Merk som ikke ferdig' : 'Merk som ferdig'}
            >
              {s.done
                ? <CheckCircle2 className="h-[15px] w-[15px] text-emerald-500" />
                : <Circle className="h-[15px] w-[15px] text-[#ccc] transition-colors hover:text-[#8b5cf6]" />}
            </button>
            <span className={`min-w-0 flex-1 truncate text-[12px] ${s.done ? 'text-[#b0aca6] line-through' : 'text-[#444]'}`}>{s.text}</span>
            {s.due && (
              <span className={`shrink-0 text-[10.5px] font-semibold tabular-nums ${forfalt ? 'text-rose-600' : 'text-[#aaa]'}`}>{fmtSubDato(s.due)}</span>
            )}
            {m && <Avatar member={m} size={16} />}
          </div>
        );
      })}
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
      <p className="mt-0.5 text-[11.5px] text-[#b5b5b5]">Holdes orientert — får varsel og e-post ved kommentarer, statusendringer og purringer.</p>
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

/* ═══════════ Tråder fra teamchatten koblet til saken ═══════════
   Leser /api/admin/chat/traader?sakId= og åpner tråden i chat-boblen via
   window-eventet «dh-aapne-traad» (ChatBoble lytter). Rendrer ingenting
   når saken ikke har koblede tråder — null støy i skuffen. */
function ChatTraadSeksjon({ sakId, apiKey }) {
  const [traader, setTraader] = useState(null);
  useEffect(() => {
    if (!sakId || !apiKey) return undefined;
    let alive = true;
    fetch(`/api/admin/chat/traader?sakId=${encodeURIComponent(sakId)}&key=${encodeURIComponent(apiKey)}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setTraader(Array.isArray(j.traader) ? j.traader : []); })
      .catch(() => { if (alive) setTraader([]); });
    return () => { alive = false; };
  }, [sakId, apiKey]);
  if (!traader || !traader.length) return null;
  return (
    <div className="mt-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Tråder fra teamchatten</p>
      <div className="mt-2 space-y-1.5">
        {traader.map((tr) => (
          <button
            key={tr.id}
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('dh-aapne-traad', { detail: { traadId: tr.id } }))}
            data-testid={`sak-chat-traad-${tr.id}`}
            className="flex w-full items-center gap-2 rounded-xl bg-[#faf8fd] px-3 py-2 text-left transition-colors hover:bg-[#f3eefb]"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#333]">{tr.navn || tr.tekst}</span>
            <span className="shrink-0 text-[11px] font-bold text-[#8b5cf6]">{tr.antallSvar === 1 ? '1 svar' : `${tr.antallSvar} svar`}</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[#b5b5b5]">Åpner tråden i teamchatten nede til høyre.</p>
    </div>
  );
}

/* ═══════════════ Vedlegg — chunket opplasting med fremdrift ═══════════════ */
function VedleggSeksjon({ t, apiKey, api, actor, onReload, visToast }) {
  const [lasterOpp, setLasterOpp] = useState(false);
  const [prosent, setProsent] = useState(0);
  const [viserIdx, setViserIdx] = useState(null); // åpent vedlegg i FilViser
  const [dokFil, setDokFil] = useState(null); // åpen fil i DokumentModal
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
        {vedlegg.map((a, i) => {
          const { Ikon, farge } = filIkonInfo(a.type, a.name);
          const erBilde = String(a.type || '').startsWith('image/');
          return (
            <div key={a.id} className="group flex items-center gap-2.5 rounded-xl bg-[#fafaf8] px-3 py-2.5 transition-colors hover:bg-[#f4f0fb]/60" data-testid={`attachment-${a.id}`}>
              <button
                onClick={() => setViserIdx(i)}
                data-testid={`attachment-open-${a.id}`}
                title="Forhåndsvis"
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                {erBilde ? (
                  <img
                    src={`/api/admin/task-files/${a.id}?key=${encodeURIComponent(apiKey)}&inline=1`}
                    alt=""
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-sm"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${farge}14` }}>
                    <Ikon className="h-[18px] w-[18px]" style={{ color: farge }} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#333] transition-colors group-hover:text-[#8b5cf6]">{a.name}</p>
                  <p className="flex flex-wrap items-center gap-1 text-[11px] text-[#b0aca6]">
                    {fmtStr(a.size)}
                    {(a.versjon || 1) > 1 && <span className="rounded-[4px] bg-[#f4f4f2] px-1 py-px text-[9.5px] font-bold text-[#888]">v{a.versjon}</span>}
                    {a.laast && <span className="flex items-center gap-0.5 rounded-[4px] bg-emerald-50 px-1 py-px text-[9.5px] font-bold text-emerald-700"><Lock className="h-2.5 w-2.5" /> Signert</span>}
                    {!a.laast && a.signeringStatus === 'I_GANG' && <span className="rounded-[4px] bg-[#f4f0fb] px-1 py-px text-[9.5px] font-bold text-[#8b5cf6]">Til signering</span>}
                    {a.arkiv && <span className="rounded-[4px] bg-[#f4f4f2] px-1 py-px text-[9.5px] font-bold text-[#888]">Arkiv</span>}
                    <span>· klikk for å vise</span>
                  </p>
                </div>
              </button>
              <button
                onClick={() => setDokFil(a)}
                data-testid={`attachment-dok-${a.id}`}
                title="Dokumenthandlinger — signering, arkiv, versjoner, deling"
                className="shrink-0 rounded-lg p-2 text-[#bbb] transition-colors hover:bg-white hover:text-[#8b5cf6]"
              >
                <PenLine className="w-4 h-4" />
              </button>
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
          );
        })}
        {!vedlegg.length && !lasterOpp && <p className="text-[12.5px] text-[#bbb]">Ingen vedlegg ennå.</p>}
      </div>
      {viserIdx !== null && (
        <FilViser filer={vedlegg} index={viserIdx} apiKey={apiKey} onClose={() => setViserIdx(null)} onIndex={setViserIdx} />
      )}
      {dokFil && (
        <DokumentModal fil={dokFil} taskId={t.id} apiKey={apiKey} api={api} actor={actor} onClose={() => setDokFil(null)} onReload={onReload} visToast={visToast} />
      )}
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

/* ═══════════════ Nytt prosjekt ═══════════════ */

/* ═══════════════ Synlighet per sak (unntaksventil) ═══════════════
   «Alle i området» (standard) eller «Begrenset» til utvalgte personer.
   Håndheves på SERVEREN (liste, søk, varsler, e-post, påminnelser) — dette er
   bare kontrollflaten. Ansvarlig/følgere/aktør inkluderes alltid av backend,
   og administratorer ser alltid alt. */
function SynlighetSeksjon({ t, members = [], onPatch }) {
  const begrenset = Array.isArray(t.restrictedTo) && t.restrictedTo.length > 0;
  const valgte = new Set(t.restrictedTo || []);
  // Kun bruker-/partnerkontoer kan begrenses — admin ser alltid alt.
  const kandidater = members.filter((m) => ['bruker', 'partner'].includes(m.role));

  const settAlle = () => onPatch({ restrictedTo: [] });
  const settBegrenset = () => {
    // Fornuftig start: ansvarlig + følgere (backend unioner uansett).
    const start = new Set([t.assigneeId, ...(t.followers || [])].filter(Boolean));
    onPatch({ restrictedTo: start.size ? [...start] : [(kandidater[0] || {}).id].filter(Boolean) });
  };
  const veksle = (id) => {
    const s = new Set(valgte);
    if (s.has(id)) s.delete(id); else s.add(id);
    onPatch({ restrictedTo: [...s] });
  };

  return (
    <div className="mt-5" data-testid="drawer-visibility">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#999]">Synlighet</p>
      <div className="flex gap-1 rounded-xl bg-[#ecebe8] p-1">
        <button
          onClick={settAlle}
          data-testid="visibility-all"
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold transition-all ${!begrenset ? 'bg-white text-[#0a0a0a] shadow-[0_1px_5px_rgba(0,0,0,0.10)]' : 'text-[#999] hover:text-[#555]'}`}
        >
          <Globe className="h-3.5 w-3.5" /> Alle i området
        </button>
        <button
          onClick={settBegrenset}
          data-testid="visibility-restricted"
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold transition-all ${begrenset ? 'bg-white text-[#b45309] shadow-[0_1px_5px_rgba(0,0,0,0.10)]' : 'text-[#999] hover:text-[#555]'}`}
        >
          <Lock className="h-3.5 w-3.5" /> Begrenset
        </button>
      </div>
      {begrenset && (
        <div className="mt-2 rounded-xl border border-[#f0c98a]/50 bg-[#fffbeb]/60 p-2.5" data-testid="visibility-picker">
          <p className="text-[11.5px] font-semibold text-[#b45309]">Kun disse ser saken:</p>
          <div className="mt-1.5 space-y-0.5">
            {kandidater.map((m) => {
              const pa = m.id === t.assigneeId;
              const flg = (t.followers || []).includes(m.id);
              const laast = pa || flg; // inkluderes alltid av backend
              const med = valgte.has(m.id) || laast;
              return (
                <label
                  key={m.id}
                  data-testid={`visibility-person-${m.id}`}
                  className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 ${laast ? 'opacity-80' : 'cursor-pointer hover:bg-white/70'}`}
                >
                  <input
                    type="checkbox"
                    checked={med}
                    disabled={laast}
                    onChange={() => veksle(m.id)}
                    className="h-4 w-4 accent-[#b45309]"
                  />
                  <Avatar member={m} size={22} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#333]">{m.name}</span>
                  {laast && <span className="shrink-0 text-[10.5px] font-semibold text-[#c2a36b]">{pa ? 'ansvarlig' : 'følger'}</span>}
                </label>
              );
            })}
            {!kandidater.length && <p className="px-1.5 py-2 text-[12px] text-[#b0aca6]">Ingen brukerkontoer å begrense til.</p>}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-[#c2a36b]">Administratorer ser alltid alle saker. Skjulte saker vises aldri i lister, søk, varsler eller e-post for andre.</p>
        </div>
      )}
    </div>
  );
}

const PROSJEKT_FARGER = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#6366f1', '#ec4899', '#14b8a6'];
function ProsjektModal({ onClose, onCreate }) {
  const [navn, setNavn] = useState('');
  const [farge, setFarge] = useState(PROSJEKT_FARGER[0]);
  const [lagrer, setLagrer] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 60); }, []);
  const lagre = async () => { if (!navn.trim() || lagrer) return; setLagrer(true); await onCreate(navn.trim(), farge); setLagrer(false); };
  return (
    <Overlegg onClose={onClose} testid="project-modal">
      <div className="p-5">
        <h3 className="text-[16px] font-semibold text-[#0a0a0a]">Nytt prosjekt</h3>
        <p className="mt-1 text-[13px] text-[#888]">Samle relaterte saker under et initiativ.</p>
        <input
          ref={ref} value={navn} onChange={(e) => setNavn(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lagre(); }}
          placeholder="Prosjektnavn, f.eks. «Oppussing Storgata 4»"
          data-testid="project-name"
          className="mt-4 w-full rounded-xl border border-black/[0.1] bg-white px-3.5 py-2.5 text-[14px] outline-none transition-all placeholder:text-[#bbb] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
        />
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-[#666]">Farge</span>
          <div className="flex gap-1.5">
            {PROSJEKT_FARGER.map((c) => (
              <button key={c} type="button" onClick={() => setFarge(c)} data-testid={`project-color-${c}`}
                className={`h-6 w-6 rounded-full transition-transform ${farge === c ? 'scale-110 ring-2 ring-offset-2 ring-black/20' : 'hover:scale-105'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[13.5px] font-medium text-[#666] hover:bg-black/[0.04]">Avbryt</button>
          <button onClick={lagre} disabled={!navn.trim() || lagrer} data-testid="project-save"
            className="flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />} Opprett prosjekt
          </button>
        </div>
      </div>
    </Overlegg>
  );
}

/* ═══════════════ Ny sak ═══════════════ */
function NySakModal({ members, projects = [], omrader = ['drift'], defaultSpace = 'drift', defaultStatus, uploadBilde = null, devProducts = [], onClose, onCreate }) {
  const [tittel, setTittel] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [prosjekt, setProsjekt] = useState('');
  const [omrade, setOmrade] = useState(omrader.includes(defaultSpace) ? defaultSpace : 'drift');
  const [sakstype, setSakstype] = useState(''); // kun Utvikling
  const [produktId, setProduktId] = useState(''); // kun Utvikling
  const [komponentId, setKomponentId] = useState(''); // kun Utvikling
  const [status, setStatus] = useState(defaultStatus || 'inbox');
  const [prioritet, setPrioritet] = useState(2);
  const [ansvarlig, setAnsvarlig] = useState('');
  const [frist, setFrist] = useState('');
  const [gjentakelse, setGjentakelse] = useState('');
  const [sjekkliste, setSjekkliste] = useState([]); // {text, done, assigneeId, due}
  const [nyttPunkt, setNyttPunkt] = useState('');
  const [varsle, setVarsle] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const ref = useRef(null);
  const punktRef = useRef(null);
  const idag = new Date().toISOString().slice(0, 10);

  useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 60); }, []);

  const leggTilPunkt = (behold) => {
    const tekst = nyttPunkt.trim();
    if (!tekst) return;
    setSjekkliste((prev) => [...prev, { text: tekst, done: false, assigneeId: null, due: null }]);
    setNyttPunkt('');
    if (behold && punktRef.current) punktRef.current.focus();
  };
  const endrePunkt = (i, patch) => setSjekkliste((prev) => prev.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));

  const lagre = async () => {
    if (!tittel.trim() || lagrer) return;
    setLagrer(true); setFeil('');
    try {
      await onCreate({
        title: tittel.trim(), description: beskrivelse.trim(), status,
        priority: prioritet, assigneeId: ansvarlig || null, dueDate: frist || null,
        recurrence: gjentakelse || null, projectId: prosjekt || null,
        space: omrade,
        taskType: omrade === 'utvikling' ? (sakstype || null) : null,
        productId: omrade === 'utvikling' ? (produktId || null) : null,
        componentId: omrade === 'utvikling' ? (komponentId || null) : null,
        subtasks: nyttPunkt.trim() ? [...sjekkliste, { text: nyttPunkt.trim(), done: false, assigneeId: null, due: null }] : sjekkliste,
        notify: varsle,
      });
    } catch (e) {
      setFeil(e.message || 'Kunne ikke opprette');
      setLagrer(false);
    }
  };

  return (
    <Overlegg onClose={onClose} variant="stor" testid="task-new-modal">
      {/* Topplinje */}
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.05] px-5 py-3 md:px-6">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#f4f0fb]"><Plus className="h-3.5 w-3.5 text-[#8b5cf6]" /></span>
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#999]">Ny sak</p>
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[#999] transition-colors hover:bg-[#f3f2f0] hover:text-[#555]" aria-label="Lukk" data-testid="new-task-close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') lagre(); }}
      >
        <div className="px-5 pt-4 md:px-6 md:pt-5">
          <input
            ref={ref}
            value={tittel}
            onChange={(e) => setTittel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lagre(); } }}
            data-testid="new-task-title"
            placeholder="Hva må gjøres?"
            className="w-full bg-transparent text-[19px] font-bold text-[#0a0a0a] outline-none placeholder:text-[#ccc] sm:text-[21px]"
            style={heading}
          />
          <MentionTekstfelt
            value={beskrivelse}
            onChange={setBeskrivelse}
            members={members}
            rows={3}
            testid="new-task-description"
            placeholder="Beskrivelse (valgfritt) — @ nevner, ** ** = fet, lim inn bilde"
            className="mt-3"
            popover="under"
            rik
            uploadBilde={uploadBilde}
          />
        </div>

        {/* Egenskaper: 2-kolonner på mobil, én rad på md+ — Linear-style */}
        <div className="grid grid-cols-2 gap-2 px-5 pt-3 md:flex md:flex-wrap md:items-center md:px-6">
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
          <DatoVelger
            naken={false} value={frist} onChange={(v) => setFrist(v || '')}
            testid="new-task-due" placeholder="Ingen frist"
            className="md:w-[150px]"
          />
          <Meny
            compact value={gjentakelse} onChange={setGjentakelse} testid="new-task-recurrence"
            options={REC_VALG.map((r) => ({ v: r.k, l: r.l, icon: r.k ? Repeat : undefined }))} className="md:w-[140px]"
          />
          {projects.length > 0 && (
            <Meny
              compact value={prosjekt} onChange={setProsjekt} testid="new-task-project"
              placeholder="Uten prosjekt"
              options={[{ v: '', l: 'Uten prosjekt', icon: Folder }, ...projects.map((p) => ({ v: p.id, l: p.name, dot: p.color }))]}
              className="md:w-[150px]"
            />
          )}
          {omrader.length > 1 && (
            <Meny
              compact value={omrade} onChange={setOmrade} testid="new-task-space"
              options={OMRADER_UI.filter((o) => omrader.includes(o.k)).map((o) => ({ v: o.k, l: o.l, icon: o.icon }))}
              className="md:w-[140px]"
            />
          )}
          {omrade === 'utvikling' && (
            <>
              <Meny
                compact value={sakstype} onChange={setSakstype} testid="new-task-type"
                placeholder="Sakstype"
                options={[{ v: '', l: 'Uten type' }, ...SAKSTYPE_UI.map((t) => ({ v: t.k, l: t.l, dot: t.farge }))]}
                className="md:w-[140px]"
              />
              {devProducts.length > 0 && (
                <Meny
                  compact value={produktId} onChange={(v) => { setProduktId(v); setKomponentId(''); }} testid="new-task-product"
                  placeholder="Uten produkt"
                  options={[{ v: '', l: 'Uten produkt', icon: Boxes }, ...devProducts.map((p) => ({ v: p.id, l: p.name, dot: p.color }))]}
                  className="md:w-[160px]"
                />
              )}
              {(() => {
                const prod = devProducts.find((p) => p.id === produktId);
                if (!prod || !(prod.components || []).length) return null;
                return (
                  <Meny
                    compact value={komponentId} onChange={setKomponentId} testid="new-task-component"
                    placeholder="Uten komponent"
                    options={[{ v: '', l: 'Uten komponent' }, ...prod.components.map((c) => ({ v: c.id, l: c.name }))]}
                    className="md:w-[160px]"
                  />
                );
              })()}
            </>
          )}
        </div>

        {/* Sjekkliste — full kontroll allerede ved opprettelse: tekst,
            ansvarlig og frist per rad. Enter legger til og beholder fokus. */}
        <div className="px-5 pt-4 md:px-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-3.5 w-3.5 text-[#b5b5b5]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Sjekkliste</p>
            {sjekkliste.length > 0 && <span className="text-[11px] font-bold tabular-nums text-[#ccc]">{sjekkliste.length}</span>}
          </div>
          <div className="mt-1.5 space-y-0.5">
            {sjekkliste.map((s, i) => (
              <div key={i} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-[#fafaf8]" data-testid={`new-task-subtask-row-${i}`}>
                <Circle className="w-[18px] h-[18px] shrink-0 text-[#ccc]" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#333]">{s.text}</span>
                <SubFrist value={s.due || null} done={false} today={idag} onChange={(due) => endrePunkt(i, { due })} testid={`new-task-subtask-due-${i}`} />
                <SubAnsvarlig value={s.assigneeId || null} members={members} onChange={(assigneeId) => endrePunkt(i, { assigneeId })} testid={`new-task-subtask-assignee-${i}`} />
                <button onClick={() => setSjekkliste((prev) => prev.filter((_, xi) => xi !== i))} className="shrink-0 rounded p-1 text-[#ddd] transition-colors hover:text-rose-500" aria-label="Fjern deloppgave">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0 text-[#bbb]" />
            <input
              ref={punktRef}
              value={nyttPunkt}
              onChange={(e) => setNyttPunkt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); leggTilPunkt(true); } }}
              onBlur={() => { if (nyttPunkt.trim()) leggTilPunkt(false); }}
              data-testid="new-task-subtask-input"
              placeholder="Legg til punkt i sjekklisten — Enter legger til flere"
              className="h-9 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
            />
          </div>
        </div>

        {ansvarlig && (
          <label className="flex items-center gap-2 px-5 pt-3 text-[12px] text-[#888] md:px-6">
            <input type="checkbox" checked={varsle} onChange={(e) => setVarsle(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" />
            Send e-postvarsel til ansvarlig
          </label>
        )}
        {feil && <p className="px-5 pt-2 text-[12.5px] text-rose-600 md:px-6">{feil}</p>}
        <div className="h-4" />
      </div>

      <div
        className="flex shrink-0 items-center gap-3 border-t border-black/[0.06] px-5 py-3 md:px-6"
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

/* ═══════════════ Passordbekreftelse før sletting ═══════════════
   Sletting av saker er destruktivt — brukeren må bekrefte med sitt eget
   passord (verifiseres server-side, og DELETE-kallet krever det også).
   Angre-toasten fungerer fortsatt etter bekreftelse. */
function SlettBekreftModal({ antall, api, onClose, onConfirm }) {
  const [passord, setPassord] = useState('');
  const [feil, setFeil] = useState('');
  const [sjekker, setSjekker] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const t = setTimeout(() => ref.current && ref.current.focus(), 80); return () => clearTimeout(t); }, []);

  const bekreft = async () => {
    if (!passord || sjekker) return;
    setSjekker(true); setFeil('');
    try {
      const r = await api('auth/bekreft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passord }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Feil passord');
      onConfirm(passord);
    } catch (e) {
      setFeil(e.message || 'Feil passord');
      setSjekker(false);
    }
  };

  return (
    <Overlegg onClose={onClose} testid="delete-confirm-modal">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-black/[0.06] px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50">
          <Trash2 className="h-4 w-4 text-rose-600" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15.5px] font-bold text-[#0a0a0a]" style={heading}>
            Slette {antall === 1 ? 'saken' : `${antall} saker`}?
          </h3>
          <p className="text-[12px] text-[#999]">Bekreft med passordet ditt</p>
        </div>
        <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0]" data-testid="delete-confirm-close"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <p className="text-[13px] leading-relaxed text-[#777]">
          {antall === 1 ? 'Saken' : 'Sakene'} fjernes fra tavlen med en kort angrefrist — deretter slettes {antall === 1 ? 'den' : 'de'} permanent, inkludert vedlegg.
        </p>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Passord</span>
          <input
            ref={ref}
            type="password"
            value={passord}
            onChange={(e) => { setPassord(e.target.value); if (feil) setFeil(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); bekreft(); } }}
            autoComplete="current-password"
            placeholder="Skriv inn passordet ditt"
            data-testid="delete-confirm-password"
            className={`h-11 w-full rounded-lg border bg-white px-3 text-[14px] outline-none transition-all placeholder:text-[#bbb] focus:ring-2 sm:h-10 sm:text-[13.5px] ${
              feil ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : 'border-black/[0.08] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-[#8b5cf6]/15'
            }`}
          />
        </label>
        {feil && (
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-rose-600" data-testid="delete-confirm-error">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {feil}
          </p>
        )}
      </div>

      <div
        className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.06] px-5 py-3.5"
        style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
      >
        <button onClick={onClose} className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#888] hover:bg-[#f3f2f0]">Avbryt</button>
        <button
          onClick={bekreft}
          disabled={!passord || sjekker}
          data-testid="delete-confirm-submit"
          className="flex h-10 items-center gap-1.5 rounded-lg bg-rose-600 px-4 text-[13.5px] font-semibold text-white transition-all hover:bg-rose-700 active:scale-[0.97] disabled:opacity-40"
        >
          {sjekker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Slett {antall === 1 ? 'saken' : `${antall} saker`}
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
const VERV_FORSLAG = ['Styreleder', 'Nestleder', 'Styremedlem', 'Varamedlem', 'Daglig leder', 'Økonomiansvarlig', 'Driftsansvarlig', 'Partner', 'Investor', 'Aksjonær'];
const MOTE_TILGANG_VALG = [
  { k: 'styremote', l: 'Styremøter' },
  { k: 'ledermote', l: 'Ledermøter' },
  { k: 'annet', l: 'Andre møter' },
];
const MOTE_TILGANG_LABEL = { styremote: 'Styremøter', ledermote: 'Ledermøter', annet: 'Andre møter' };

// Moduler som kan tildeles begrensede kontoer (matcher menyen og håndheves
// i API-et: nokkeltall→/admin/kpi, okonomi+kunder→/admin/finance (les),
// i-leads→/admin/leads*, historikk→/admin/imported-leads*)
const MODUL_VALG = [
  { k: 'nokkeltall', l: 'Nøkkeltall' },
  { k: 'okonomi', l: 'Økonomi' },
  { k: 'kunder', l: 'Kunder' },
  { k: 'i-leads', l: 'Leads' },
  { k: 'historikk', l: 'Historikk' },
];
const MODUL_LABEL = Object.fromEntries(MODUL_VALG.map((m) => [m.k, m.l]));

// Verdensklasse-detalj: vervet foreslår fornuftig møtetilgang automatisk
// (styreverv → styremøter, daglig leder → begge). Kun et forslag — admin
// kan alltid overstyre med chipsene.
function foreslaMoteTilgang(verv) {
  const v = String(verv || '').toLowerCase();
  if (!v) return null;
  if (/daglig leder|adm\.? ?dir|ceo/.test(v)) return ['styremote', 'ledermote'];
  if (/styre|investor|aksjon/.test(v)) return ['styremote'];
  if (/leder|sjef|direkt/.test(v)) return ['ledermote'];
  return null;
}

// Chips for møtetilgang per møtetype (eller andre nøkkel/label-valg via
// `valg`-prop). Admin ser alt uansett — chipsene deaktiveres da.
function MoteTilgangVelger({ value, onChange, disabled, testid, valg = MOTE_TILGANG_VALG }) {
  const valgt = Array.isArray(value) ? value : [];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" data-testid={testid}>
      {valg.map((o) => {
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
  const [moduler, setModuler] = useState([]); // ekstra modultilgang
  const [grupper, setGrupper] = useState([]); // Styret/Ledelsen/Utvikling → saksområder
  const [inviter, setInviter] = useState(true); // velkomst-e-post — brukeren velger eget passord
  const [inviterer, setInviterer] = useState(null); // person-id under (re)utsending
  const [lagrer, setLagrer] = useState(false);
  const [redigerId, setRedigerId] = useState(null);
  const [red, setRed] = useState({ name: '', email: '', role: 'bruker', password: '', tittel: '', moteTilgang: [], moduler: [], groups: [] });

  const leggTil = async () => {
    if (!navn.trim() || lagrer) return;
    setLagrer(true);
    try {
      const r = await api('users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: navn.trim(), email: epost.trim(), role: rolle, password: passord,
          tittel: tittel.trim(), moteTilgang, moduler,
          invite: inviter && !!epost.trim() && !passord,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke legge til');
      setMembers((prev) => [...prev, j.member]);
      setNavn(''); setEpost(''); setPassord(''); setRolle('bruker'); setTittel(''); setMoteTilgang([]); setModuler([]);
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
      const payload = { name: red.name.trim(), email: red.email.trim(), role: red.role, tittel: red.tittel.trim(), moteTilgang: red.moteTilgang, moduler: red.moduler, groups: red.groups };
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
                        { v: 'partner', l: 'Partner', sub: 'Saker + møter de har tilgang til' },
                        { v: 'eier', l: 'Eier', sub: 'Nøkkeltall + Økonomi (les) + møter' },
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
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#b5b5b5]">Moduler</span>
                    <MoteTilgangVelger
                      value={red.moduler}
                      onChange={(v) => setRed((p) => ({ ...p, moduler: v }))}
                      disabled={red.role === 'admin' || m.role === 'owner'}
                      testid={`member-moduler-${m.id}`}
                      valg={MODUL_VALG}
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#b5b5b5]">Grupper</span>
                    <MoteTilgangVelger
                      value={red.groups}
                      onChange={(v) => setRed((p) => ({ ...p, groups: v }))}
                      disabled={red.role === 'admin' || m.role === 'owner'}
                      testid={`member-groups-${m.id}`}
                      valg={GRUPPER_UI}
                    />
                    <span className="hidden text-[10.5px] text-[#c2beb8] xl:inline">— styrer saksområdene Styret/Ledelse/Utvikling</span>
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
                      m.role === 'owner' ? 'bg-[#0a0a0a] text-white' : m.role === 'admin' ? 'bg-[#f4f0fb] text-[#8b5cf6]' : m.role === 'eier' ? 'bg-[#eff6ff] text-[#2563eb]' : m.role === 'partner' ? 'bg-[#f0fdfa] text-[#0d9488]' : 'bg-[#f3f2f0] text-[#888]'
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
                  <p className="truncate text-[12px] text-[#999]">{m.email || 'Ingen e-post — får ikke varsler'}{m.harPassord ? ' · kan logge inn' : ''}{['bruker', 'partner', 'eier'].includes(m.role) && (m.moteTilgang || []).length > 0 ? ` · ser ${m.moteTilgang.map((k) => (MOTE_TILGANG_LABEL[k] || k).toLowerCase()).join(', ')}` : ''}{['bruker', 'partner', 'eier'].includes(m.role) && (m.moduler || []).length > 0 ? ` · moduler: ${m.moduler.map((k) => MODUL_LABEL[k] || k).join(', ')}` : ''}{['bruker', 'partner'].includes(m.role) && (m.groups || []).length > 0 ? ` · grupper: ${m.groups.map((k) => (GRUPPER_UI.find((g) => g.k === k) || { l: k }).l).join(', ')}` : ''}</p>
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
                      onClick={() => { setRedigerId(m.id); setRed({ name: m.name, email: m.email || '', role: m.role || 'bruker', password: '', tittel: m.tittel || '', moteTilgang: Array.isArray(m.moteTilgang) ? m.moteTilgang : [], moduler: Array.isArray(m.moduler) ? m.moduler : [], groups: Array.isArray(m.groups) ? m.groups : [] }); }}
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
                { v: 'partner', l: 'Partner', sub: 'Saker + møter de har tilgang til' },
                { v: 'eier', l: 'Eier', sub: 'Nøkkeltall + Økonomi (les) + møter' },
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
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#b5b5b5]">Moduler</span>
              <MoteTilgangVelger value={moduler} onChange={setModuler} disabled={rolle === 'admin'} testid="member-moduler" valg={MODUL_VALG} />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#b5b5b5]">Grupper</span>
              <MoteTilgangVelger value={grupper} onChange={setGrupper} disabled={rolle === 'admin'} testid="member-groups" valg={GRUPPER_UI} />
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
