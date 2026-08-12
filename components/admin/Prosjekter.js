'use client';

/* ═══════════════ Prosjekter — Linear-modellen for større leveranser ═══════════════
   Et prosjekt = konkret leveranse (f.eks. «Ny modul: Depositum») med:
   · Brief (kartleggingsdokumentet, markdown) — prosjektets «hvorfor og hva»
   · Status: Utforskes (kartlegging) → Planlagt → Pågår → Ferdig / Skrinlagt
   · Lead, måldato, milepæler med fremdrift, og sakene som utgjør arbeidet
   Delte primitiver (Meny, DatoVelger, Avatar, RikTekst, MentionTekstfelt,
   StatusIkon) kommer via `ui`-prop fra TasksTab — ingen sirkulær import. */

import { useState, useEffect, useMemo } from 'react';
import {
  Compass, CalendarClock, PlayCircle, CheckCircle2, Archive, X, Plus,
  Trash2, Pencil, Flag, Target, ChevronRight, FolderKanban, Loader2, CornerDownLeft,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
export const PSTATUS = [
  { k: 'utforskes', l: 'Utforskes', icon: Compass, farge: '#0ea5e9', hint: 'Kartlegging — skriv briefen og avklar hva «ferdig» betyr' },
  { k: 'planlagt', l: 'Planlagt', icon: CalendarClock, farge: '#6366f1', hint: 'Briefen er avklart, arbeidet er brutt ned i saker' },
  { k: 'pagar', l: 'Pågår', icon: PlayCircle, farge: '#8b5cf6', hint: 'Utvikling i gang' },
  { k: 'ferdig', l: 'Ferdig', icon: CheckCircle2, farge: '#059669', hint: 'Levert' },
  { k: 'skrinlagt', l: 'Skrinlagt', icon: Archive, farge: '#9ca3af', hint: 'Lagt bort — bevisst valg' },
];
const pstatus = (k) => PSTATUS.find((s) => s.k === k) || PSTATUS[2];
const fmtMaal = (iso) => {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }); }
  catch (e) { return iso; }
};

/* Fremdriftslinje — stille, tynn, med brøk. */
function Fremdrift({ done = 0, total = 0, farge = '#8b5cf6', className = '' }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: farge }} />
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-[#999] tabular-nums">{done}/{total}</span>
    </div>
  );
}

/* ═══ Prosjektkort i oversikten ═══ */
function ProsjektKort({ p, members, today, onOpen }) {
  const st = pstatus(p.status);
  const SIkon = st.icon;
  const lead = p.leadId ? members.find((m) => m.id === p.leadId) : null;
  const forfalt = p.targetDate && p.status !== 'ferdig' && p.status !== 'skrinlagt' && p.targetDate < today;
  const nesteMs = (p.milestones || []).find((m) => !m.done);
  return (
    <button
      onClick={onOpen}
      data-testid={`project-card-${p.id}`}
      className="group w-full rounded-2xl border border-black/[0.05] bg-white p-4 text-left shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: p.color }} />
        <p className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-[#1a1a1a]" style={heading}>{p.name}</p>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#ddd] transition-transform group-hover:translate-x-0.5 group-hover:text-[#999]" />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold" style={{ color: st.farge, background: `${st.farge}14` }}>
          <SIkon className="h-3 w-3" /> {st.l}
        </span>
        {p.targetDate && (
          <span className={`flex items-center gap-1 text-[11.5px] font-semibold ${forfalt ? 'text-rose-600' : 'text-[#999]'}`}>
            <Target className="h-3 w-3" /> {fmtMaal(p.targetDate)}
          </span>
        )}
        {nesteMs && (
          <span className="flex min-w-0 items-center gap-1 text-[11.5px] font-medium text-[#999]">
            <Flag className="h-3 w-3 shrink-0 text-[#c2beb8]" /> <span className="truncate">{nesteMs.name}</span>
          </span>
        )}
        {lead && <span className="ml-auto"><MiniAvatar m={lead} /></span>}
      </div>
      {(p.progress?.total || 0) > 0 && <Fremdrift done={p.progress.done} total={p.progress.total} farge={p.color} className="mt-3" />}
    </button>
  );
}

function MiniAvatar({ m }) {
  const init = (m.name || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span title={m.name} className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a0a0a] text-[9.5px] font-bold text-white">{init}</span>
  );
}

/* ═══ Prosjektskuff — brief, status, milepæler og saker ═══ */
function ProsjektSkuff({ p, tasks, members, today, api, visToast, onChanged, onReloadTasks, onOpenTask, onClose, ui }) {
  const { Meny, DatoVelger, RikTekst, MentionTekstfelt, StatusIkon } = ui;
  const [redigerBrief, setRedigerBrief] = useState(false);
  const [briefTekst, setBriefTekst] = useState(p.description || '');
  const [nyMilepael, setNyMilepael] = useState('');
  const [nySak, setNySak] = useState('');
  const [jobber, setJobber] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !redigerBrief) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, redigerBrief]);

  const oppdater = async (patch, feilmelding = 'Kunne ikke lagre endringen') => {
    try {
      const r = await api(`projects/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const j = await r.json();
      if (!j.ok) { visToast(j.error || feilmelding); return false; }
      await onChanged();
      return true;
    } catch (e) { visToast(feilmelding); return false; }
  };

  const slett = async () => {
    if (!window.confirm(`Slette prosjektet «${p.name}»? Sakene beholdes, men løsnes fra prosjektet.`)) return;
    try {
      const r = await api(`projects/${p.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.ok) { visToast(`Prosjektet «${p.name}» slettet`); await onChanged(); await onReloadTasks(); onClose(); }
    } catch (e) { visToast('Kunne ikke slette prosjektet'); }
  };

  const leggTilMilepael = async () => {
    const navn = nyMilepael.trim();
    if (!navn) return;
    const ok = await oppdater({ milestones: [...(p.milestones || []), { name: navn }] }, 'Kunne ikke legge til milepælen');
    if (ok) setNyMilepael('');
  };
  const endreMilepael = (id, patch) => oppdater({ milestones: (p.milestones || []).map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const fjernMilepael = (id) => oppdater({ milestones: (p.milestones || []).filter((m) => m.id !== id) });

  const hurtigSak = async () => {
    const tittel = nySak.trim();
    if (!tittel || jobber) return;
    setJobber(true);
    try {
      const r = await api('tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: tittel, projectId: p.id, notify: false }) });
      const j = await r.json();
      if (j.ok) { setNySak(''); await onReloadTasks(); await onChanged(); }
      else visToast(j.error || 'Kunne ikke opprette saken');
    } catch (e) { visToast('Kunne ikke opprette saken'); }
    setJobber(false);
  };

  const st = pstatus(p.status);
  const prosjektSaker = tasks.filter((t) => t.projectId === p.id && !t.archived);
  const sakerFor = (msId) => prosjektSaker
    .filter((t) => (msId ? t.milestoneId === msId : !t.milestoneId))
    .sort((a, b) => (a.status === 'done') - (b.status === 'done'));
  const etikett = 'text-[11px] font-bold uppercase tracking-[0.08em] text-[#b0aca6]';

  const SakRad = ({ t }) => (
    <button
      onClick={() => onOpenTask(t.id)}
      data-testid={`project-task-${t.id}`}
      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-[5px] text-left transition-colors hover:bg-black/[0.03]"
    >
      <StatusIkon status={t.status} size={13} />
      <span className={`min-w-0 flex-1 truncate text-[13px] ${t.status === 'done' ? 'text-[#b5b5b5] line-through' : 'font-medium text-[#333]'}`}>{t.title}</span>
      {t.dueDate && t.status !== 'done' && (
        <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${t.dueDate < today ? 'text-rose-600' : 'text-[#b0aca6]'}`}>{fmtMaal(t.dueDate)}</span>
      )}
      {t.assigneeId && (() => { const m = members.find((x) => x.id === t.assigneeId); return m ? <MiniAvatar m={m} /> : null; })()}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[105]">
      <div className="absolute inset-0 bg-[#0a0a0a]/30 backdrop-blur-[2px] dh-fade" onClick={onClose} />
      <div className="dh-slide-in absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-white shadow-[-24px_0_80px_rgba(0,0,0,0.18)]" data-testid="project-drawer">
        {/* Topplinje */}
        <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.05] px-5 py-3">
          <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: p.color }} />
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#999]">Prosjekt</p>
          <div className="ml-auto flex items-center gap-0.5">
            <button onClick={slett} title="Slett prosjekt" data-testid="project-delete" className="rounded-lg p-2 text-[#bbb] hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} data-testid="project-close" className="rounded-lg p-2 text-[#999] hover:bg-[#f3f2f0] hover:text-[#333]" aria-label="Lukk">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-4">
          {/* Navn */}
          <input
            key={p.id + p.name}
            defaultValue={p.name}
            onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== p.name) oppdater({ name: n }); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            data-testid="project-name"
            className="w-full rounded-lg bg-transparent px-1 py-0.5 text-[20px] font-bold text-[#1a1a1a] outline-none transition-colors hover:bg-black/[0.03] focus:bg-white focus:ring-2 focus:ring-[#8b5cf6]/15"
            style={heading}
          />

          {/* Status — fasene. Utforskes = kartleggingen. */}
          <div className="mt-3 flex flex-wrap gap-1" data-testid="project-status-row">
            {PSTATUS.map((s) => {
              const SIkon = s.icon; const aktiv = p.status === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => oppdater({ status: s.k })}
                  title={s.hint}
                  data-testid={`project-status-${s.k}`}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-all ${aktiv ? 'shadow-[0_1px_4px_rgba(0,0,0,0.10)]' : 'border border-black/[0.07] text-[#999] hover:text-[#555]'}`}
                  style={aktiv ? { color: s.farge, background: `${s.farge}14` } : undefined}
                >
                  <SIkon className="h-3 w-3" /> {s.l}
                </button>
              );
            })}
          </div>
          {p.status === 'utforskes' && (
            <p className="mt-2 text-[11.5px] text-[#b0aca6]">Kartleggingsfasen: skriv briefen under — hva er problemet, målet og hva betyr «ferdig»? Flytt til Planlagt når den er avklart.</p>
          )}

          {/* Egenskaper */}
          <div className="mt-4 border-y border-black/[0.05] py-1.5">
            <div className="flex min-h-[32px] items-center gap-2">
              <span className="w-[92px] shrink-0 text-[12px] font-medium text-[#999]">Lead</span>
              <div className="min-w-0 flex-1">
                <Meny
                  naken value={p.leadId || ''} testid="project-lead" placeholder="Ingen lead"
                  onChange={(v) => oppdater({ leadId: v || null })}
                  options={[{ v: '', l: 'Ingen lead' }, ...members.map((m) => ({ v: m.id, l: m.name, avatar: m }))]}
                />
              </div>
            </div>
            <div className="flex min-h-[32px] items-center gap-2">
              <span className="w-[92px] shrink-0 text-[12px] font-medium text-[#999]">Måldato</span>
              <div className="min-w-0 flex-1">
                <DatoVelger
                  value={p.targetDate || ''} testid="project-target" placeholder="Ingen måldato"
                  forfalt={!!(p.targetDate && p.status !== 'ferdig' && p.status !== 'skrinlagt' && p.targetDate < today)}
                  onChange={(v) => oppdater({ targetDate: v })}
                />
              </div>
            </div>
            {(p.progress?.total || 0) > 0 && (
              <div className="flex min-h-[32px] items-center gap-2">
                <span className="w-[92px] shrink-0 text-[12px] font-medium text-[#999]">Fremdrift</span>
                <Fremdrift done={p.progress.done} total={p.progress.total} farge={p.color} className="min-w-0 flex-1 pr-1" />
              </div>
            )}
          </div>

          {/* Brief — kartleggingsdokumentet */}
          <div className="mt-5">
            <div className="flex items-center gap-2">
              <p className={etikett}>Brief</p>
              {!redigerBrief && (
                <button
                  onClick={() => { setBriefTekst(p.description || ''); setRedigerBrief(true); }}
                  data-testid="project-brief-edit"
                  className="rounded-md p-1 text-[#bbb] transition-colors hover:bg-black/[0.04] hover:text-[#555]"
                  title="Rediger brief"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            {redigerBrief ? (
              <div className="mt-2">
                <MentionTekstfelt value={briefTekst} onChange={setBriefTekst} members={members} rows={8} testid="project-brief-input" placeholder="Problemet · målet · hva «ferdig» betyr · avgrensninger …" />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={async () => { const ok = await oppdater({ description: briefTekst }); if (ok) setRedigerBrief(false); }}
                    data-testid="project-brief-save"
                    className="rounded-lg bg-[#0a0a0a] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
                  >
                    Lagre brief
                  </button>
                  <button onClick={() => setRedigerBrief(false)} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-[#888] hover:bg-black/[0.04]">Avbryt</button>
                </div>
              </div>
            ) : p.description ? (
              <div className="mt-2 rounded-xl border border-black/[0.05] bg-[#fbfaf9] px-4 py-3">
                <RikTekst text={p.description} members={members} className="text-[13.5px]" />
              </div>
            ) : (
              <button
                onClick={() => { setBriefTekst(''); setRedigerBrief(true); }}
                className="mt-2 w-full rounded-xl border border-dashed border-black/[0.1] py-4 text-[12.5px] text-[#aaa] transition-colors hover:border-[#8b5cf6]/40 hover:text-[#8b5cf6]"
              >
                + Skriv briefen — kartleggingen starter her
              </button>
            )}
          </div>

          {/* Milepæler */}
          <div className="mt-6">
            <p className={etikett}>Milepæler</p>
            <div className="mt-2 space-y-1">
              {(p.milestones || []).map((m) => {
                const ms = m.progress || { total: 0, done: 0 };
                const msForfalt = m.due && !m.done && m.due < today;
                return (
                  <div key={m.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-black/[0.03]" data-testid={`milestone-${m.id}`}>
                    <button
                      onClick={() => endreMilepael(m.id, { done: !m.done })}
                      title={m.done ? 'Gjenåpne milepælen' : 'Marker som nådd'}
                      data-testid={`milestone-toggle-${m.id}`}
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all ${m.done ? 'border-[#059669] bg-[#059669] text-white' : 'border-black/[0.15] text-transparent hover:border-[#059669]'}`}
                    >
                      <Flag className="h-2.5 w-2.5" />
                    </button>
                    <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${m.done ? 'text-[#b5b5b5] line-through' : 'text-[#333]'}`}>{m.name}</span>
                    {ms.total > 0 && <span className="shrink-0 text-[11px] font-semibold text-[#b0aca6] tabular-nums">{ms.done}/{ms.total}</span>}
                    <span className="w-[92px] shrink-0">
                      <DatoVelger value={m.due || ''} onChange={(v) => endreMilepael(m.id, { due: v })} placeholder="Dato" forfalt={!!msForfalt} testid={`milestone-due-${m.id}`} />
                    </span>
                    <button onClick={() => fjernMilepael(m.id)} className="shrink-0 rounded-md p-1 text-transparent transition-colors hover:bg-rose-50 hover:!text-rose-500 group-hover:text-[#ccc]" title="Fjern milepæl">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5 px-1.5">
                <Flag className="h-3 w-3 shrink-0 text-[#d5d2cc]" />
                <input
                  value={nyMilepael}
                  onChange={(e) => setNyMilepael(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') leggTilMilepael(); }}
                  placeholder="Ny milepæl — f.eks. «Kartlegging ferdig» …"
                  data-testid="milestone-new"
                  className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#c2beb8]"
                />
                {nyMilepael.trim() && (
                  <button onClick={leggTilMilepael} className="rounded-full bg-[#0a0a0a] p-1 text-white" data-testid="milestone-add">
                    <CornerDownLeft className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Saker — gruppert per milepæl */}
          <div className="mt-6">
            <p className={etikett}>Saker i prosjektet</p>
            <div className="mt-2 space-y-3">
              {(p.milestones || []).map((m) => {
                const liste = sakerFor(m.id);
                if (!liste.length) return null;
                return (
                  <div key={m.id}>
                    <p className="flex items-center gap-1.5 px-1.5 text-[11px] font-bold text-[#b0aca6]">
                      <Flag className="h-2.5 w-2.5" /> {m.name}
                    </p>
                    <div className="mt-0.5">{liste.map((t) => <SakRad key={t.id} t={t} />)}</div>
                  </div>
                );
              })}
              {sakerFor(null).length > 0 && (
                <div>
                  {(p.milestones || []).length > 0 && <p className="px-1.5 text-[11px] font-bold text-[#b0aca6]">Uten milepæl</p>}
                  <div className="mt-0.5">{sakerFor(null).map((t) => <SakRad key={t.id} t={t} />)}</div>
                </div>
              )}
              {!prosjektSaker.length && (
                <p className="px-1.5 text-[12.5px] text-[#b0aca6]">Ingen saker ennå — legg til den første under.</p>
              )}
              {/* Hurtig-opprett sak rett i prosjektet */}
              <div className="flex items-center gap-1.5 px-1.5">
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#d5d2cc]" />
                <input
                  value={nySak}
                  onChange={(e) => setNySak(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') hurtigSak(); }}
                  placeholder="Legg til sak i prosjektet …"
                  data-testid="project-quick-task"
                  className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#c2beb8]"
                />
                {jobber ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#cf97fc]" /> : nySak.trim() && (
                  <button onClick={hurtigSak} className="rounded-full bg-[#0a0a0a] p-1 text-white" data-testid="project-quick-task-add">
                    <CornerDownLeft className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Prosjektoversikten (visning i saksflaten) ═══ */
export default function ProsjekterVisning({ api, projects, tasks, members, today, visToast, onChanged, onReloadTasks, onOpenTask, onNyttProsjekt, ui }) {
  const [valgtProsjektId, setValgtProsjektId] = useState(null);
  const valgt = valgtProsjektId ? projects.find((x) => x.id === valgtProsjektId) : null;
  const synlige = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const grupper = [
    { k: 'pagar', l: 'Pågår' },
    { k: 'planlagt', l: 'Planlagt' },
    { k: 'utforskes', l: 'Utforskes' },
    { k: 'ferdig', l: 'Ferdig' },
    { k: 'skrinlagt', l: 'Skrinlagt' },
  ].map((g) => ({ ...g, prosjekter: synlige.filter((p) => (p.status || 'pagar') === g.k) })).filter((g) => g.prosjekter.length);

  return (
    <div data-testid="projects-view">
      {!synlige.length ? (
        <div className="rounded-2xl border border-dashed border-black/[0.1] py-16 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-[#d5d2cc]" />
          <p className="mt-3 text-[14px] font-semibold text-[#888]" style={heading}>Ingen prosjekter ennå</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#b0aca6]">
            Et prosjekt er en større leveranse — f.eks. en ny modul. Start i «Utforskes», skriv briefen, og bryt arbeidet ned i saker og milepæler.
          </p>
          <button
            onClick={onNyttProsjekt}
            data-testid="projects-empty-new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Nytt prosjekt
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grupper.map((g) => {
            const st = pstatus(g.k); const SIkon = st.icon;
            return (
              <div key={g.k}>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: st.farge }}>
                  <SIkon className="h-3.5 w-3.5" /> {g.l}
                  <span className="text-[#c2beb8]">{g.prosjekter.length}</span>
                </p>
                <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {g.prosjekter.map((p) => (
                    <ProsjektKort key={p.id} p={p} members={members} today={today} onOpen={() => setValgtProsjektId(p.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {valgt && (
        <ProsjektSkuff
          p={valgt}
          tasks={tasks}
          members={members}
          today={today}
          api={api}
          visToast={visToast}
          onChanged={onChanged}
          onReloadTasks={onReloadTasks}
          onOpenTask={(id) => { setValgtProsjektId(null); onOpenTask(id); }}
          onClose={() => setValgtProsjektId(null)}
          ui={ui}
        />
      )}
    </div>
  );
}
