'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   SALGSPIPELINE — UI-laget for tildeling, pipeline-tavle og provisjon.
   Brukes av Salgsradar.js. Følger radarens rolige, varme designspråk.
   Modell: hybrid pool — selgere tar ledige leads selv, leder omfordeler fritt.
   ═══════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Users, Trophy, CalendarClock, Loader2, X, RotateCcw, Hand } from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading, inherit)', letterSpacing: '-0.01em' };
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO')} kr`;
const TERMINALE = ['vunnet', 'tapt', 'ikke_relevant'];

const initialer = (navn = '') => navn.split(/\s+/).filter(Boolean).slice(0, 2).map((d) => d[0]).join('').toUpperCase() || '?';
// Stabil, dempet badge-farge per selger (hash av id)
const BADGE_FARGER = ['#6d28d9', '#0e7490', '#b45309', '#be185d', '#15803d', '#4338ca', '#a16207', '#0f766e'];
export const selgerFarge = (id = '') => BADGE_FARGER[[...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0) % BADGE_FARGER.length];

export function SelgerBadge({ selger, størrelse = 22 }) {
  if (!selger) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#d6d2cb] px-2 py-[2px] text-[10.5px] font-medium text-[#a8a29a]">
        <Users className="h-3 w-3" /> Pool
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5" title={selger.navn}>
      <span className="flex items-center justify-center rounded-full text-[9.5px] font-bold text-white"
        style={{ width: størrelse, height: størrelse, background: selgerFarge(selger.id) }}>
        {initialer(selger.navn)}
      </span>
    </span>
  );
}

/* ── ANNONSØR-BADGE: hvem står bak FINN-annonsen? ──
   Privat = kjernemålet (huseier uten forvalter). Husleie.no = selvbetjent
   utleier, også godt mål. Megler/Utleiemegleren = konkurrent har oppdraget. */
export const ANNONSOR_META = {
  privat: { l: 'Privat', c: '#1f7a45', bg: '#eef6f0', d: 'Privat utleier — kjernemålet. Kontakt via FINN-melding.' },
  husleie: { l: 'Husleie.no', c: '#9a6b1c', bg: '#fdf3e0', d: 'Selvbetjent utleier via Husleie.no — godt mål.' },
  utleiemegleren: { l: 'Utleiemegleren', c: '#c2413b', bg: '#fdf0ef', d: 'Utleiemegleren har oppdraget — konkurrent.' },
  megler: { l: 'Megler', c: '#c2413b', bg: '#fdf0ef', d: 'Profesjonell aktør har annonsen — konkurrent.' },
};
export function AnnonsorBadge({ annonsor, liten = false }) {
  const meta = ANNONSOR_META[annonsor?.type];
  if (!meta) return null; // mangler data eller 'ukjent' → ingen badge
  const tekst = annonsor.type === 'megler' && annonsor.orgNavn ? annonsor.orgNavn : meta.l;
  return (
    <span title={annonsor.orgNavn ? `${annonsor.orgNavn} — ${meta.d}` : meta.d} data-testid="annonsor-badge"
      className={`inline-flex shrink-0 items-center rounded-full font-semibold ${liten ? 'max-w-[110px] px-1.5 py-px text-[9.5px]' : 'max-w-[160px] px-2 py-[2px] text-[10.5px]'}`}
      style={{ color: meta.c, background: meta.bg }}>
      <span className="truncate">{tekst}</span>
    </span>
  );
}

/* ── PIPELINE-TAVLE (kanban): én kolonne per steg, dra-og-slipp ── */
export function PipelineTavle({ leads, statuser, valgtId, onAapne, onsketStatus }) {
  const [drarId, setDrarId] = useState(null);
  const [overKol, setOverKol] = useState(null);
  const perKol = useMemo(() => {
    const m = new Map(statuser.map((s) => [s.k, []]));
    for (const l of leads) if (m.has(l.status)) m.get(l.status).push(l);
    return m;
  }, [leads, statuser]);

  return (
    <div className="no-scrollbar -mx-1 flex items-start gap-2.5 overflow-x-auto px-1 pb-4" data-testid="salg-tavle">
      {statuser.map((kol) => {
        const kolLeads = perKol.get(kol.k) || [];
        const sum = kolLeads.reduce((s, l) => s + (Number(l.pris) || 0), 0);
        return (
          <div key={kol.k}
            onDragOver={(e) => { e.preventDefault(); setOverKol(kol.k); }}
            onDragLeave={() => setOverKol((v) => (v === kol.k ? null : v))}
            onDrop={(e) => {
              e.preventDefault(); setOverKol(null);
              const lead = leads.find((l) => l.id === drarId);
              setDrarId(null);
              if (lead && lead.status !== kol.k) onsketStatus(lead, kol.k);
            }}
            className={`w-[248px] shrink-0 rounded-[12px] border p-1.5 transition-colors ${overKol === kol.k ? 'border-[#1c1917]/30 bg-[#f1efeb]' : 'border-black/[0.05] bg-[#f7f6f3]'}`}
            data-testid={`salg-kolonne-${kol.k}`}>
            <div className="flex items-baseline gap-1.5 px-2 pb-1.5 pt-1">
              <span className="h-[6px] w-[6px] shrink-0 self-center rounded-full" style={{ background: kol.farge }} />
              <span className="text-[11.5px] font-bold text-[#44403c]" style={heading}>{kol.l}</span>
              <span className="text-[11px] text-[#a8a29a]">{kolLeads.length}</span>
              {sum > 0 && <span className="ml-auto text-[10.5px] font-medium text-[#a8a29a]">{kr(sum)}/mnd</span>}
            </div>
            <div className="flex min-h-[52px] flex-col gap-1.5">
              {kolLeads.map((l) => (
                <div key={l.id} role="button" tabIndex={0} draggable
                  onDragStart={() => setDrarId(l.id)}
                  onDragEnd={() => setDrarId(null)}
                  onClick={() => onAapne(l.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onAapne(l.id); }}
                  data-testid={`salg-kort-${l.id}`}
                  className={`cursor-grab rounded-[10px] border bg-white p-2.5 shadow-[0_1px_2px_rgba(28,25,23,0.05)] transition-all hover:shadow-[0_2px_8px_rgba(28,25,23,0.09)] active:cursor-grabbing ${l.id === valgtId ? 'border-[#1c1917]/35' : 'border-black/[0.06]'} ${drarId === l.id ? 'opacity-40' : ''}`}>
                  <p className="truncate text-[12px] font-semibold leading-snug text-[#1c1917]" style={heading}>{l.adresse || l.tittel || 'Uten adresse'}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {l.pris ? <span className="text-[11px] font-medium text-[#78716c]">{kr(l.pris)}/mnd</span> : null}
                    <AnnonsorBadge annonsor={l.annonsor} liten />
                    {l.status === 'vunnet' && l.salg?.vunnet ? (
                      <span className="text-[10.5px] font-semibold text-[#1f7a45]">+{kr(l.salg.vunnet.provisjon)}</span>
                    ) : null}
                    <span className="ml-auto"><SelgerBadge selger={l.salg?.tildeltTil} størrelse={20} /></span>
                  </div>
                  {l.salg?.oppfolging && !TERMINALE.includes(l.status) && (
                    <p className={`mt-1.5 flex items-center gap-1 text-[10.5px] ${new Date(l.salg.oppfolging) < new Date() ? 'font-semibold text-[#c2413b]' : 'text-[#a8a29a]'}`}>
                      <CalendarClock className="h-3 w-3" /> {new Date(l.salg.oppfolging).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              ))}
              {kolLeads.length === 0 && <div className="rounded-[10px] border border-dashed border-black/[0.06] py-4 text-center text-[10.5px] text-[#c2beb8]">Tom</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── SALG-SEKSJON i lead-skuffen: tildeling, pipeline-handlinger, logg ── */
export function SalgSeksjon({ lead, aktor, selgere, statuser, onTildel, onsketStatus, onOppfolging }) {
  const [visLogg, setVisLogg] = useState(false);
  if (!lead || !aktor) return null;
  const salg = lead.salg || {};
  const eier = salg.tildeltTil || null;
  const erMin = eier?.id === aktor.id;
  const terminal = TERMINALE.includes(lead.status);
  const stMeta = statuser.find((s) => s.k === lead.status);
  // Neste naturlige steg i pipelinen (uten terminale)
  const lop = ['ny', 'analysert', 'kontaktet', 'dialog', 'tilbud'];
  const neste = lop[lop.indexOf(lead.status) + 1] || null;
  const logg = [...(salg.logg || [])].reverse();

  return (
    <div className="rounded-[12px] border border-black/[0.06] bg-white p-3.5 shadow-[0_1px_2px_rgba(28,25,23,0.04)]" data-testid="salg-seksjon">
      {/* Tildeling */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a8a29a]">Selger</span>
        {eier ? (
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1c1917]" style={heading}>
            <SelgerBadge selger={eier} størrelse={20} /> {eier.navn}
          </span>
        ) : (
          <span className="text-[12px] text-[#a8a29a]">I poolen — ledig</span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {!eier && !terminal && (
            <button onClick={() => onTildel(lead.id, aktor.id === 'admin' ? null : aktor.id)} data-testid="salg-ta-lead"
              disabled={aktor.id === 'admin'}
              title={aktor.id === 'admin' ? 'Leder tildeler via listen til høyre' : 'Ta leaden — den blir din'}
              className="flex h-[26px] items-center gap-1 rounded-[7px] bg-[#141414] px-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-black/80 disabled:hidden">
              <Hand className="h-3 w-3" /> Ta lead
            </button>
          )}
          {erMin && !terminal && (
            <button onClick={() => onTildel(lead.id, null)} data-testid="salg-frasi"
              className="h-[26px] rounded-[7px] px-2 text-[11px] font-medium text-[#a8a29a] transition-colors hover:bg-[#f4f2ee] hover:text-[#1c1917]">
              Legg i pool
            </button>
          )}
          {aktor.erLeder && (
            <select value={eier?.id || ''} onChange={(e) => onTildel(lead.id, e.target.value || null)} data-testid="salg-tildel-velger"
              className="h-[26px] max-w-[150px] rounded-[7px] border border-black/[0.08] bg-white px-1.5 text-[11.5px] font-medium text-[#44403c] outline-none">
              <option value="">— Pool —</option>
              {selgere.map((s) => <option key={s.id} value={s.id}>{s.navn}</option>)}
            </select>
          )}
        </span>
      </div>

      {/* Utfall eller handlinger */}
      {terminal ? (
        <div className={`mt-3 rounded-[10px] px-3 py-2.5 ${lead.status === 'vunnet' ? 'bg-[#eef6f0]' : 'bg-[#f4f2ee]'}`} data-testid="salg-utfall">
          {lead.status === 'vunnet' && salg.vunnet ? (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#1f7a45]" style={heading}><Trophy className="h-3.5 w-3.5" /> Vunnet</span>
              <span className="text-[12px] text-[#57534e]">Grunnlag <b>{kr(salg.vunnet.grunnlag)}</b></span>
              <span className="text-[12px] text-[#57534e]">Provisjon <b className="text-[#1f7a45]">{kr(salg.vunnet.provisjon)}</b> ({salg.vunnet.provisjonssats} %)</span>
              <span className="text-[11.5px] text-[#a8a29a]">til {salg.vunnet.selger?.navn} · {new Date(salg.vunnet.at).toLocaleDateString('nb-NO')}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[12.5px] font-bold text-[#57534e]" style={heading}>{stMeta?.l}</span>
              {salg.arsak?.valg && <span className="text-[12px] text-[#78716c]">{salg.arsak.valg}{salg.arsak.tekst ? ` — ${salg.arsak.tekst}` : ''}</span>}
            </div>
          )}
          {aktor.erLeder && (
            <button onClick={() => onsketStatus(lead, 'dialog')} data-testid="salg-gjenaapne"
              className="mt-2 flex h-[24px] items-center gap-1 rounded-[7px] border border-black/[0.08] bg-white px-2 text-[11px] font-medium text-[#57534e] transition-colors hover:border-black/20">
              <RotateCcw className="h-3 w-3" /> Gjenåpne
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {neste && (
            <button onClick={() => onsketStatus(lead, neste)} data-testid="salg-neste-steg"
              className="flex h-[27px] items-center gap-1.5 rounded-[8px] bg-[#141414] px-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-black/80">
              → {statuser.find((s) => s.k === neste)?.l}
            </button>
          )}
          <button onClick={() => onsketStatus(lead, 'vunnet')} data-testid="salg-vunnet-btn"
            className="flex h-[27px] items-center gap-1 rounded-[8px] bg-[#1f7a45] px-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#196a3b]">
            <Trophy className="h-3 w-3" /> Vunnet
          </button>
          <button onClick={() => onsketStatus(lead, 'tapt')} data-testid="salg-tapt-btn"
            className="h-[27px] rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[11.5px] font-medium text-[#c2413b] transition-colors hover:border-[#c2413b]/40">
            Tapt
          </button>
          <button onClick={() => onsketStatus(lead, 'ikke_relevant')} data-testid="salg-ikkerelevant-btn"
            className="h-[27px] rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[11.5px] font-medium text-[#78716c] transition-colors hover:border-black/20">
            Ikke relevant
          </button>
          <span className="ml-auto flex items-center gap-1" title="Neste oppfølging — du varsles når datoen kommer">
            <CalendarClock className={`h-3.5 w-3.5 ${salg.oppfolging && new Date(salg.oppfolging) < new Date() ? 'text-[#c2413b]' : 'text-[#a8a29a]'}`} />
            <input type="date" value={salg.oppfolging ? salg.oppfolging.slice(0, 10) : ''} data-testid="salg-oppfolging"
              onChange={(e) => onOppfolging(lead.id, e.target.value || null)}
              className="h-[26px] rounded-[7px] border border-black/[0.08] bg-white px-1.5 text-[11px] text-[#57534e] outline-none" />
          </span>
        </div>
      )}

      {/* Salgslogg — kompakt, nyeste først */}
      {logg.length > 0 && (
        <div className="mt-3 border-t border-black/[0.05] pt-2">
          <button onClick={() => setVisLogg((v) => !v)} className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a8a29a] transition-colors hover:text-[#1c1917]" data-testid="salg-logg-toggle">
            Salgslogg ({logg.length}) {visLogg ? '▾' : '▸'}
          </button>
          {visLogg && (
            <div className="mt-1.5 space-y-1">
              {logg.slice(0, 8).map((h) => (
                <p key={h.id} className="text-[11.5px] leading-snug text-[#78716c]">
                  <span className="text-[#c2beb8]">{new Date(h.at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}</span>{' '}
                  {h.tekst} <span className="text-[#c2beb8]">· {h.av}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Modal-skall ── */
function ModalSkall({ tittel, onLukk, children, bred = false }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onClick={onLukk}>
      <div className={`w-full ${bred ? 'max-w-[760px]' : 'max-w-[440px]'} rounded-[14px] bg-white p-5 shadow-[0_24px_60px_rgba(28,25,23,0.25)]`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1c1917]" style={heading}>{tittel}</h3>
          <button onClick={onLukk} className="rounded-md p-1 text-[#a8a29a] transition-colors hover:bg-[#f4f2ee] hover:text-[#1c1917]" aria-label="Lukk"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── ÅRSAK-MODAL: obligatorisk ved Tapt / Ikke relevant ── */
export function ArsakModal({ lead, status, arsaker, onBekreft, onLukk }) {
  const [valg, setValg] = useState('');
  const [tekst, setTekst] = useState('');
  const [sender, setSender] = useState(false);
  const liste = arsaker?.[status] || [];
  return (
    <ModalSkall tittel={status === 'tapt' ? 'Marker som tapt' : 'Marker som ikke relevant'} onLukk={onLukk}>
      <p className="mt-1 truncate text-[12px] text-[#a8a29a]">{lead.adresse || lead.tittel}</p>
      <div className="mt-3 space-y-1" data-testid="arsak-liste">
        {liste.map((a) => (
          <label key={a} className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2 text-[12.5px] font-medium transition-colors ${valg === a ? 'border-[#1c1917]/40 bg-[#f7f6f3] text-[#1c1917]' : 'border-black/[0.06] text-[#57534e] hover:border-black/15'}`}>
            <input type="radio" name="arsak" checked={valg === a} onChange={() => setValg(a)} className="accent-[#1c1917]" />
            {a}
          </label>
        ))}
      </div>
      <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Utdyp gjerne (valgfritt) …" rows={2} data-testid="arsak-tekst"
        className="mt-2.5 w-full resize-none rounded-[9px] border border-black/[0.08] bg-white px-3 py-2 text-[12.5px] outline-none placeholder:text-[#c2beb8] focus:border-[#1c1917]/25" />
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onLukk} className="h-[32px] rounded-[8px] px-3 text-[12.5px] font-medium text-[#78716c] transition-colors hover:bg-[#f4f2ee]">Avbryt</button>
        <button disabled={!valg || sender} data-testid="arsak-bekreft"
          onClick={async () => { setSender(true); await onBekreft({ valg, tekst }); setSender(false); }}
          className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#141414] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black/80 disabled:opacity-40">
          {sender && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Bekreft
        </button>
      </div>
    </ModalSkall>
  );
}

/* ── VUNNET-MODAL: verdigrunnlag + provisjon (auto-forslag, justerbart) ── */
export function VunnetModal({ lead, aktor, selgere, onBekreft, onLukk }) {
  const eier = lead.salg?.tildeltTil || null;
  const [selgerId, setSelgerId] = useState(eier?.id || (aktor.id !== 'admin' ? aktor.id : ''));
  const [mndLeie, setMndLeie] = useState(Number(lead.analyse?.anbefaltLeie) || Number(lead.pris) || 0);
  const [honorarPct, setHonorarPct] = useState(Number(lead.analyse?.honorarPct) || 8);
  const [grunnlagManuell, setGrunnlagManuell] = useState(null); // null = auto
  const [sender, setSender] = useState(false);
  const selger = selgere.find((s) => s.id === selgerId) || null;
  const [sats, setSats] = useState(null); // null = selgers sats
  const effSats = sats != null ? sats : (selger?.provisjonssats ?? 0);
  const autoGrunnlag = Math.round((Number(mndLeie) * 12 * Number(honorarPct)) / 100) || 0;
  const grunnlag = grunnlagManuell != null ? grunnlagManuell : autoGrunnlag;
  const provisjon = Math.round((grunnlag * effSats) / 100);
  const felt = 'h-[32px] w-full rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[13px] font-medium outline-none focus:border-[#1c1917]/25';
  return (
    <ModalSkall tittel="Marker som vunnet" onLukk={onLukk}>
      <p className="mt-1 truncate text-[12px] text-[#a8a29a]">{lead.adresse || lead.tittel}</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <label className="text-[11px] font-semibold text-[#78716c]">Månedsleie
          <input type="number" value={mndLeie} onChange={(e) => { setMndLeie(Number(e.target.value)); setGrunnlagManuell(null); }} className={`${felt} mt-1`} data-testid="vunnet-leie" />
        </label>
        <label className="text-[11px] font-semibold text-[#78716c]">Honorar %
          <input type="number" step="0.5" value={honorarPct} onChange={(e) => { setHonorarPct(Number(e.target.value)); setGrunnlagManuell(null); }} className={`${felt} mt-1`} data-testid="vunnet-honorar" />
        </label>
        <label className="col-span-2 text-[11px] font-semibold text-[#78716c]">Grunnlag — første års honorar (justerbart)
          <input type="number" value={grunnlag} onChange={(e) => setGrunnlagManuell(Number(e.target.value))} className={`${felt} mt-1`} data-testid="vunnet-grunnlag" />
        </label>
        <label className="text-[11px] font-semibold text-[#78716c]">Selger
          <select value={selgerId} onChange={(e) => { setSelgerId(e.target.value); setSats(null); }} disabled={!aktor.erLeder && !!eier} className={`${felt} mt-1`} data-testid="vunnet-selger">
            <option value="">Velg selger …</option>
            {selgere.map((s) => <option key={s.id} value={s.id}>{s.navn} ({s.provisjonssats} %)</option>)}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-[#78716c]">Provisjonssats %
          <input type="number" step="0.5" value={effSats} onChange={(e) => setSats(Number(e.target.value))} disabled={!aktor.erLeder} className={`${felt} mt-1 disabled:bg-[#f7f6f3] disabled:text-[#a8a29a]`} data-testid="vunnet-sats" />
        </label>
      </div>
      <div className="mt-3 flex items-baseline justify-between rounded-[10px] bg-[#eef6f0] px-3.5 py-2.5">
        <span className="text-[12px] font-semibold text-[#1f7a45]">Provisjon til selger</span>
        <span className="text-[17px] font-bold text-[#1f7a45]" style={heading} data-testid="vunnet-provisjon">{kr(provisjon)}</span>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onLukk} className="h-[32px] rounded-[8px] px-3 text-[12.5px] font-medium text-[#78716c] transition-colors hover:bg-[#f4f2ee]">Avbryt</button>
        <button disabled={!selgerId || !grunnlag || sender} data-testid="vunnet-bekreft"
          onClick={async () => {
            setSender(true);
            await onBekreft({ mndLeie, honorarPct, grunnlag, selgerId, ...(aktor.erLeder && sats != null ? { provisjonssats: sats } : {}) });
            setSender(false);
          }}
          className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#1f7a45] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#196a3b] disabled:opacity-40">
          {sender ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />} Registrer vunnet
        </button>
      </div>
    </ModalSkall>
  );
}

/* ── SELGERRAPPORT: vunnet, grunnlag, provisjon og win-rate per selger ── */
export function RapportModal({ api, aktor, onLukk }) {
  const [data, setData] = useState(null);
  const [periode, setPeriode] = useState('alt'); // 'mnd' | 'aar' | 'alt'
  const [lagrer, setLagrer] = useState(null);
  const hent = async (p = periode) => {
    const naa = new Date();
    const q = p === 'mnd'
      ? `?fra=${new Date(naa.getFullYear(), naa.getMonth(), 1).toISOString()}`
      : p === 'aar' ? `?fra=${new Date(naa.getFullYear(), 0, 1).toISOString()}` : '';
    try { const j = await api(`rapport${q}`); setData(j); } catch (e) { /* stille */ }
  };
  useEffect(() => { hent(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const settSats = async (brukerId, sats) => {
    setLagrer(brukerId);
    try { await api('provisjonssats', { method: 'PUT', body: { brukerId, sats } }); await hent(); } catch (e) { /* stille */ }
    setLagrer(null);
  };
  return (
    <ModalSkall tittel="Selgerrapport" onLukk={onLukk} bred>
      <div className="mt-2 flex items-center gap-1">
        {[{ k: 'mnd', l: 'Denne måneden' }, { k: 'aar', l: 'I år' }, { k: 'alt', l: 'Alt' }].map((p) => (
          <button key={p.k} onClick={() => { setPeriode(p.k); hent(p.k); }} data-testid={`rapport-periode-${p.k}`}
            className={`h-[26px] rounded-[7px] px-2.5 text-[11.5px] font-medium transition-colors ${periode === p.k ? 'bg-[#1c1917] text-white' : 'text-[#78716c] hover:bg-[#f4f2ee]'}`}>
            {p.l}
          </button>
        ))}
        {data && <span className="ml-auto text-[11.5px] text-[#a8a29a]">{data.pool} lead{data.pool === 1 ? '' : 's'} i poolen</span>}
      </div>
      {!data ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#a8a29a]" /></div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-[12.5px]" data-testid="rapport-tabell">
            <thead>
              <tr className="border-b border-black/[0.07] text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">
                <th className="py-2 pr-3">Selger</th>
                <th className="px-2 py-2 text-right">Aktive</th>
                <th className="px-2 py-2 text-right">Vunnet</th>
                <th className="px-2 py-2 text-right">Tapt</th>
                <th className="px-2 py-2 text-right">Win-rate</th>
                <th className="px-2 py-2 text-right">Grunnlag</th>
                <th className="px-2 py-2 text-right">Provisjon</th>
                <th className="py-2 pl-2 text-right">Sats %</th>
              </tr>
            </thead>
            <tbody>
              {data.selgere.map((s) => (
                <tr key={s.id} className="border-b border-black/[0.04] last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2 font-semibold text-[#1c1917]" style={heading}>
                      <SelgerBadge selger={s} størrelse={20} /> {s.navn}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right text-[#57534e]">{s.aktive}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-[#1f7a45]">{s.vunnet}</td>
                  <td className="px-2 py-2.5 text-right text-[#c2413b]">{s.tapt}</td>
                  <td className="px-2 py-2.5 text-right text-[#57534e]">{s.winRate == null ? '—' : `${s.winRate} %`}</td>
                  <td className="px-2 py-2.5 text-right text-[#57534e]">{kr(s.grunnlag)}</td>
                  <td className="px-2 py-2.5 text-right font-bold text-[#1f7a45]">{kr(s.provisjon)}</td>
                  <td className="py-2 pl-2 text-right">
                    {aktor.erLeder ? (
                      <span className="inline-flex items-center gap-1">
                        {lagrer === s.id && <Loader2 className="h-3 w-3 animate-spin text-[#a8a29a]" />}
                        <input type="number" step="0.5" defaultValue={s.provisjonssats} data-testid={`rapport-sats-${s.id}`}
                          onBlur={(e) => { const v = Number(e.target.value); if (v !== s.provisjonssats) settSats(s.id, v); }}
                          className="h-[26px] w-[58px] rounded-[7px] border border-black/[0.08] bg-white px-1.5 text-right text-[12px] outline-none focus:border-[#1c1917]/25" />
                      </span>
                    ) : `${s.provisjonssats}`}
                  </td>
                </tr>
              ))}
              {data.selgere.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-[12px] text-[#a8a29a]">Ingen selgere ennå — gi brukere tilgang til Salgsradar-modulen, så dukker de opp her.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#a8a29a]">
        <UserPlus className="h-3.5 w-3.5" /> Provisjonssats settes per selger og låses til leaden i vinnerøyeblikket — senere satsendringer påvirker ikke allerede vunnede avtaler.
      </p>
    </ModalSkall>
  );
}
