'use client';

/* ═══════════════ Saksinnsikt — dashboard for sakssystemet ═══════════════
   KPI-kort, gjennomstrømning (8 uker), arbeidsmengde per person, prosjekt-
   fordeling og eldste åpne saker. Data fra GET /api/admin/tasks/insights.
   Egen fil for å holde TasksTab.js-monolitten nede. */

import { useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Loader2, Inbox, CheckCircle2, AlertTriangle, Timer, RefreshCw,
  PlayCircle, Clock, Folder, History, TrendingUp,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
const FARGER = { inbox: '#8b8b8b', doing: '#8b5cf6', waiting: '#d97706', done: '#059669', overdue: '#e11d48' };
const nb = (x) => (x === null || x === undefined ? '–' : String(x).replace('.', ','));

function Initialer({ navn, farge, size = 26 }) {
  const init = (navn || '?')
    .split(/\s+/)
    .map((d) => d[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: farge || '#b0aca6' }}
    >
      {init}
    </span>
  );
}

function KpiKort({ ikon: Ikon, farge, bg, verdi, enhet, tittel, sub, subFarge, testid }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-5" data-testid={testid}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: bg }}>
          <Ikon className="h-3.5 w-3.5" style={{ color: farge }} />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">{tittel}</p>
      </div>
      <p className="mt-2.5 text-[30px] font-bold leading-none tracking-tight text-[#0a0a0a]" style={heading}>
        {verdi}
        {enhet && <span className="ml-1 text-[15px] font-semibold text-[#b0aca6]">{enhet}</span>}
      </p>
      {sub && <p className="mt-1.5 text-[12px] font-medium" style={{ color: subFarge || '#aaa' }}>{sub}</p>}
    </div>
  );
}

function ThroughputTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.10)]">
      <p className="text-[11px] font-bold text-[#999]">Uke fra {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: p.dataKey === 'done' ? FARGER.done : '#777' }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.fill }} />
          {p.dataKey === 'done' ? 'Fullført' : 'Opprettet'}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function SakerInnsikt({ api, members = [], projects = [], onOpenTask }) {
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');

  const last = useCallback(async () => {
    setLaster(true);
    setFeil('');
    try {
      const r = await api('tasks/insights');
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke hente innsikt');
      setData(j);
    } catch (e) {
      setFeil(e.message || 'Kunne ikke hente innsikt');
    }
    setLaster(false);
  }, [api]);

  useEffect(() => { last(); }, [last]);

  const medlem = (id) => members.find((m) => m.id === id) || null;

  if (laster && !data) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="insights-loading">
        <Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" />
      </div>
    );
  }
  if (feil && !data) {
    return (
      <div className="rounded-2xl bg-white py-14 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="insights-error">
        <AlertTriangle className="mx-auto h-8 w-8 text-[#e11d48]/60" />
        <p className="mt-3 text-[13.5px] text-[#aaa]">{feil}</p>
        <button onClick={last} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:bg-black/85">
          <RefreshCw className="h-3.5 w-3.5" /> Prøv igjen
        </button>
      </div>
    );
  }
  if (!data) return null;

  const { kpi, status, priority, throughput, perPerson, perProject, oldest } = data;
  const maksAapne = Math.max(1, ...perPerson.map((p) => p.open));
  const nettoTrend = kpi.done30 - kpi.created30;
  const helttomt = kpi.open === 0 && kpi.done30 === 0 && kpi.created30 === 0;

  if (helttomt) {
    return (
      <div className="rounded-2xl bg-white py-16 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="insights-empty">
        <TrendingUp className="mx-auto h-8 w-8 text-[#d5d2cc]" />
        <p className="mt-3 text-[14px] font-semibold text-[#777]">Ingen data ennå</p>
        <p className="mt-1 text-[13px] text-[#aaa]">Innsikten fylles etter hvert som saker opprettes og fullføres.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tasks-insights">
      {/* KPI-rad */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiKort
          ikon={Inbox} farge="#8b5cf6" bg="#f4f0fb" testid="insight-kpi-open"
          verdi={kpi.open} tittel="Åpne saker"
          sub={`${kpi.created7} nye siste 7 d`}
        />
        <KpiKort
          ikon={CheckCircle2} farge="#059669" bg="#ecfdf5" testid="insight-kpi-done"
          verdi={kpi.done30} tittel="Fullført · 30 d"
          sub={`${kpi.done7} siste 7 d · netto ${nettoTrend >= 0 ? '−' : '+'}${Math.abs(nettoTrend)} i køen`}
          subFarge={nettoTrend >= 0 ? '#059669' : '#d97706'}
        />
        <KpiKort
          ikon={AlertTriangle} farge="#e11d48" bg="#fff1f2" testid="insight-kpi-overdue"
          verdi={kpi.overdue} tittel="Forfalt"
          sub={kpi.open ? `${kpi.overdueRatio} % av åpne saker` : 'Ingen åpne saker'}
          subFarge={kpi.overdue > 0 ? '#e11d48' : '#059669'}
        />
        <KpiKort
          ikon={Timer} farge="#d97706" bg="#fffbeb" testid="insight-kpi-lead"
          verdi={kpi.leadMedianDays === null ? '–' : nb(kpi.leadMedianDays)} enhet={kpi.leadMedianDays === null ? '' : 'd'}
          tittel="Median ledetid"
          sub={kpi.leadCount ? `Basert på ${kpi.leadCount} fullførte · 90 d` : 'Ingen fullførte siste 90 d'}
        />
      </div>

      {/* Gjennomstrømning + status/prioritet */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-5 xl:col-span-2" data-testid="insight-throughput">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Gjennomstrømning · siste 8 uker</p>
            <div className="flex items-center gap-3 text-[11.5px] font-semibold text-[#999]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: '#d9d4f5' }} /> Opprettet</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: FARGER.doing }} /> Fullført</span>
            </div>
          </div>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughput} margin={{ top: 4, right: 0, bottom: 0, left: -26 }} barCategoryGap="28%">
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#b0aca6', fontWeight: 600 }} dy={6} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#d0ccc6', fontWeight: 600 }} allowDecimals={false} />
                <Tooltip content={<ThroughputTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 }} />
                <Bar dataKey="created" fill="#d9d4f5" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="done" fill={FARGER.doing} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-5" data-testid="insight-status">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Åpne saker nå</p>
          <div className="mt-3.5 space-y-3">
            {[
              { k: 'inbox', l: 'Innboks', ikon: Inbox, v: status.inbox },
              { k: 'doing', l: 'Pågår', ikon: PlayCircle, v: status.doing },
              { k: 'waiting', l: 'Venter', ikon: Clock, v: status.waiting },
            ].map((r) => (
              <div key={r.k}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-1.5 font-semibold text-[#555]">
                    <r.ikon className="h-3.5 w-3.5" style={{ color: FARGER[r.k] }} /> {r.l}
                  </span>
                  <span className="font-bold tabular-nums text-[#333]">{r.v}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f1efec]">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${kpi.open ? (r.v / kpi.open) * 100 : 0}%`, background: FARGER[r.k] }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-black/[0.05] pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Prioritet</p>
            <div className="mt-2.5 flex gap-2">
              {[
                { l: 'P1', v: priority.p1, farge: '#e11d48', bg: '#fff1f2' },
                { l: 'P2', v: priority.p2, farge: '#b45309', bg: '#fffbeb' },
                { l: 'P3', v: priority.p3, farge: '#6b7280', bg: '#f3f4f6' },
              ].map((p) => (
                <div key={p.l} className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: p.bg }}>
                  <p className="text-[18px] font-bold leading-none tabular-nums" style={{ ...heading, color: p.farge }}>{p.v}</p>
                  <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: p.farge, opacity: 0.75 }}>{p.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Arbeidsmengde per person */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-5" data-testid="insight-workload">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Arbeidsmengde per person</p>
          <div className="hidden items-center gap-3 text-[11px] font-semibold text-[#999] sm:flex">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: FARGER.doing }} /> Pågår</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: FARGER.waiting }} /> Venter</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#d5d2cc' }} /> Innboks</span>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {perPerson.map((p) => (
            <div key={p.id || 'ingen'} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#fafaf8]" data-testid={`insight-person-${p.id || 'ingen'}`}>
              <Initialer navn={p.name} farge={p.color} />
              <div className="w-28 min-w-0 sm:w-40">
                <p className="truncate text-[13px] font-semibold text-[#333]">{p.name}</p>
                <p className="text-[11px] font-medium text-[#b0aca6]">{p.done30} fullført · 30 d</p>
              </div>
              <div className="flex h-3 flex-1 gap-px overflow-hidden rounded-full bg-[#f1efec]">
                {p.open > 0 && (
                  <>
                    {p.doing > 0 && <div className="h-full" style={{ width: `${(p.doing / maksAapne) * 100}%`, background: FARGER.doing }} title={`Pågår: ${p.doing}`} />}
                    {p.waiting > 0 && <div className="h-full" style={{ width: `${(p.waiting / maksAapne) * 100}%`, background: FARGER.waiting }} title={`Venter: ${p.waiting}`} />}
                    {p.inbox > 0 && <div className="h-full" style={{ width: `${(p.inbox / maksAapne) * 100}%`, background: '#d5d2cc' }} title={`Innboks: ${p.inbox}`} />}
                  </>
                )}
              </div>
              <span className="w-7 text-right text-[14px] font-bold tabular-nums text-[#333]" style={heading}>{p.open}</span>
              {p.overdue > 0 ? (
                <span className="flex w-16 items-center justify-end gap-1 text-[11.5px] font-bold text-[#e11d48]">
                  <AlertTriangle className="h-3 w-3" /> {p.overdue}
                </span>
              ) : (
                <span className="w-16" />
              )}
            </div>
          ))}
          {!perPerson.length && <p className="px-2 py-4 text-[13px] text-[#aaa]">Ingen personer registrert.</p>}
        </div>
      </div>

      {/* Prosjekter + eldste åpne saker */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-5" data-testid="insight-projects">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Prosjekter</p>
          <div className="mt-3 space-y-3">
            {perProject.map((p) => (
              <div key={p.id || 'ingen'} data-testid={`insight-project-${p.id || 'ingen'}`}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-[#444]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ background: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="ml-2 shrink-0 font-medium text-[#999]">
                    {p.open} åpne{p.overdue > 0 && <span className="font-bold text-[#e11d48]"> · {p.overdue} forfalt</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f1efec]">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%`, background: FARGER.done }} />
                </div>
                <p className="mt-1 text-[10.5px] font-medium text-[#c2beb8]">{p.done} av {p.total} fullført</p>
              </div>
            ))}
            {!perProject.length && (
              <div className="py-6 text-center">
                <Folder className="mx-auto h-6 w-6 text-[#d5d2cc]" />
                <p className="mt-2 text-[12.5px] text-[#aaa]">Ingen prosjekter ennå.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-5" data-testid="insight-oldest">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]">Eldste åpne saker</p>
          <div className="mt-2 space-y-0.5">
            {oldest.map((t) => {
              const m = medlem(t.assigneeId);
              return (
                <button
                  key={t.id}
                  onClick={() => onOpenTask && onOpenTask(t.id)}
                  data-testid={`insight-oldest-${t.id}`}
                  className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#fafaf8]"
                >
                  <History className="h-3.5 w-3.5 shrink-0 text-[#d0ccc6]" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#333] transition-colors group-hover:text-[#8b5cf6]">{t.title}</span>
                  {m && <Initialer navn={m.name} farge={m.color} size={20} />}
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums ${t.ageDays >= 30 ? 'bg-[#fff1f2] text-[#e11d48]' : 'bg-[#f3f2f0] text-[#999]'}`}>
                    {t.ageDays} d
                  </span>
                </button>
              );
            })}
            {!oldest.length && (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-300" />
                <p className="mt-2 text-[12.5px] text-[#aaa]">Ingen åpne saker — alt er i boks!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
