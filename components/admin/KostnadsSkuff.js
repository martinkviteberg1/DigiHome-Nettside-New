'use client';

/* ═══════════ Faste kostnader — administrasjonsskuff (admin) ═══════════
   Delt skuff for å administrere DigiHomes faste kostnader (lønn, markeds-
   føring m.m.) i `enhetsokonomi`-kolleksjonen (type: 'felles'). Brukes fra
   Datarom → Oversikt (økonomiens ene hjem). CRUD går mot
   /api/admin/leieforhold/okonomi/felles (admin-only i API-et).
   Props:
     apiKey      — sesjonstoken/adminnøkkel
     felles      — full liste av kostnadsposter
     onOppdatert — kalles etter vellykket lagring/sletting (refetch hos parent)
     onLukk      — lukker skuffen */

import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Pencil, Trash2, Pause, Play } from 'lucide-react';
import { aktiveKostnader } from '@/lib/leieforhold-filter';

const heading = { fontFamily: 'var(--font-heading)' };
const ETIKETT = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a8a29a]';
const KNAPP_PRIMAER = 'flex h-7 items-center gap-1.5 rounded-[7px] bg-gradient-to-b from-[#2b2825] to-[#131110] px-3 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_1px_2px_rgba(28,25,23,0.2)] transition-all hover:from-[#211f1c] hover:to-[#0a0908] active:scale-[0.98]';

const KATEGORI_LABEL = { lonn: 'Lønn', markedsforing: 'Markedsføring', programvare: 'Programvare', annet: 'Annet' };
const FORDELING_LABEL = { alle: 'likt per enhet', utleide: 'kun utleide', honorar: 'etter honorar' };

const tallFmt = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const kr = (v) => `${tallFmt.format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F')}\u202Fkr`;
const dato = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function KostnadsSkuff({ apiKey, felles = [], onOppdatert, onLukk }) {
  const [skjema, setSkjema] = useState(null);
  const [lagrer, setLagrer] = useState(false);
  const iDag = new Date().toISOString().slice(0, 10);
  const aktive = aktiveKostnader(felles, '');
  const aktivSum = aktive.reduce((s, p) => s + (p.belop || 0), 0);

  useEffect(() => {
    const paaTast = (e) => { if (e.key === 'Escape') { if (skjema) setSkjema(null); else onLukk?.(); } };
    window.addEventListener('keydown', paaTast);
    return () => window.removeEventListener('keydown', paaTast);
  }, [skjema, onLukk]);

  const lagre = async () => {
    if (!skjema?.navn?.trim() || !Number(skjema?.belop)) return;
    setLagrer(true);
    try {
      const r = await fetch(`/api/admin/leieforhold/okonomi/felles?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skjema),
      });
      if (r.ok) { setSkjema(null); await onOppdatert?.(); }
    } catch (e) { /* behold skjemaet åpent */ }
    setLagrer(false);
  };
  const slett = async (id) => {
    setLagrer(true);
    try {
      await fetch(`/api/admin/leieforhold/okonomi/felles?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await onOppdatert?.();
    } catch (e) { /* ignorer */ }
    setLagrer(false);
  };
  const togglePause = async (p) => {
    setLagrer(true);
    try {
      await fetch(`/api/admin/leieforhold/okonomi/felles?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, aktiv: p.aktiv === false }),
      });
      await onOppdatert?.();
    } catch (e) { /* ignorer */ }
    setLagrer(false);
  };

  const postStatus = (p) => {
    if (p.aktiv === false) return { t: 'Pauset', c: '#8a8278', bg: '#f1ece4' };
    if (p.startDato && p.startDato > iDag) return { t: `Starter ${dato(p.startDato)}`, c: '#3757c4', bg: '#e8eefc' };
    if (p.sluttDato && p.sluttDato < iDag) return { t: 'Utløpt', c: '#8a8278', bg: '#f1ece4' };
    return { t: 'Aktiv', c: '#1f7a45', bg: '#e7f4ec' };
  };

  return (
    <div className="fixed inset-0 z-[45] flex justify-end bg-black/20 backdrop-blur-[2px]" onClick={() => { onLukk?.(); }}>
      <div className="flex h-full w-full max-w-[460px] flex-col border-l border-black/[0.07] bg-white shadow-[-16px_0_60px_rgba(28,25,23,0.14)] dh-drawer-inn" onClick={(e) => e.stopPropagation()} data-testid="kostnadsskuff">
        <div className="border-b border-black/[0.05] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-[#1c1917]" style={heading}>Faste kostnader</p>
              <p className="mt-0.5 text-[11.5px] text-[#a8a29a]">Løpende kostnader (lønn m.m.) — teller i marginen. CAC settes per enhet i Leieforhold-skuffen.</p>
            </div>
            <button onClick={() => onLukk?.()} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]" data-testid="kostnadsskuff-lukk"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!skjema && (
            <button
              onClick={() => setSkjema({ navn: '', belop: '', fordeling: 'alle', kategori: 'lonn', startDato: '', sluttDato: '', aktiv: true })}
              data-testid="kostnadsskuff-ny"
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[#d8d4cd] text-[12px] font-medium text-[#8a8278] transition-colors hover:border-[#8b5cf6]/40 hover:bg-[#faf8ff] hover:text-[#6d28d9]"
            >
              <Plus className="h-3.5 w-3.5" /> Legg til fast kostnad
            </button>
          )}

          {skjema && (
            <div className="rounded-[10px] border border-[#8b5cf6]/20 bg-[#faf8ff] p-3.5" data-testid="kostnadsskuff-skjema">
              <p className="text-[12px] font-semibold text-[#6d28d9]" style={heading}>{skjema.id ? 'Rediger post' : 'Ny fast kostnad'}</p>
              <label className="mt-2.5 block">
                <span className={`mb-1 block ${ETIKETT}`}>Navn</span>
                <input value={skjema.navn} onChange={(e) => setSkjema((f) => ({ ...f, navn: e.target.value }))} placeholder="F.eks. Lønn — 1 ansatt" autoFocus className="h-8 w-full rounded-[7px] border border-black/[0.08] bg-white px-2.5 text-[12.5px] outline-none transition-all focus:border-[#8b5cf6]/40 focus:ring-2 focus:ring-[#8b5cf6]/10" />
              </label>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label>
                  <span className={`mb-1 block ${ETIKETT}`}>Kr / mnd</span>
                  <input type="number" min="0" value={skjema.belop} onChange={(e) => setSkjema((f) => ({ ...f, belop: e.target.value }))} placeholder="60000" className="h-8 w-full rounded-[7px] border border-black/[0.08] bg-white px-2.5 text-[12.5px] tabular-nums outline-none transition-all focus:border-[#8b5cf6]/40 focus:ring-2 focus:ring-[#8b5cf6]/10" />
                </label>
                <label>
                  <span className={`mb-1 block ${ETIKETT}`}>Kategori</span>
                  <select value={skjema.kategori} onChange={(e) => setSkjema((f) => ({ ...f, kategori: e.target.value }))} className="h-8 w-full rounded-[7px] border border-black/[0.08] bg-white px-2 text-[12px] outline-none focus:border-[#8b5cf6]/40">
                    <option value="lonn">Lønn</option>
                    <option value="markedsforing">Markedsføring</option>
                    <option value="programvare">Programvare</option>
                    <option value="annet">Annet</option>
                  </select>
                </label>
              </div>
              <label className="mt-2.5 block">
                <span className={`mb-1 block ${ETIKETT}`}>Fordeling</span>
                <select value={skjema.fordeling} onChange={(e) => setSkjema((f) => ({ ...f, fordeling: e.target.value }))} className="h-8 w-full rounded-[7px] border border-black/[0.08] bg-white px-2 text-[12px] outline-none focus:border-[#8b5cf6]/40">
                  <option value="alle">Likt per enhet</option>
                  <option value="utleide">Kun utleide</option>
                  <option value="honorar">Etter honorar</option>
                </select>
              </label>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label>
                  <span className={`mb-1 block ${ETIKETT}`}>Fra dato (valgfritt)</span>
                  <input type="date" value={skjema.startDato || ''} onChange={(e) => setSkjema((f) => ({ ...f, startDato: e.target.value }))} className="h-8 w-full rounded-[7px] border border-black/[0.08] bg-white px-2 text-[11.5px] outline-none focus:border-[#8b5cf6]/40" />
                </label>
                <label>
                  <span className={`mb-1 block ${ETIKETT}`}>Til dato (valgfritt)</span>
                  <input type="date" value={skjema.sluttDato || ''} min={skjema.startDato || undefined} onChange={(e) => setSkjema((f) => ({ ...f, sluttDato: e.target.value }))} className="h-8 w-full rounded-[7px] border border-black/[0.08] bg-white px-2 text-[11.5px] outline-none focus:border-[#8b5cf6]/40" />
                </label>
              </div>
              <p className="mt-1.5 text-[10.5px] text-[#a8a29a]">Uten datoer løper posten fast. Med datoer telles den kun i perioden.</p>
              <div className="mt-3 flex items-center justify-end gap-1.5">
                <button onClick={() => setSkjema(null)} className="h-7 rounded-[7px] px-2.5 text-[12px] font-medium text-[#a8a29a] transition-colors hover:text-[#57534e]">Avbryt</button>
                <button onClick={lagre} disabled={lagrer || !skjema.navn?.trim() || !Number(skjema.belop)} data-testid="kostnadsskuff-lagre" className={`${KNAPP_PRIMAER} disabled:opacity-40`}>
                  <Check className="h-3.5 w-3.5" /> Lagre
                </button>
              </div>
            </div>
          )}

          {felles.length === 0 && !skjema && (
            <p className="mt-4 text-[12px] text-[#a8a29a]">Ingen faste kostnader registrert — legg inn f.eks. «Lønn — 1 ansatt · 60 000/mnd», så teller den i marginen.</p>
          )}

          {felles.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {felles.map((p) => {
                const st = postStatus(p);
                const teller = aktive.some((a) => a.id === p.id);
                const periode = p.startDato || p.sluttDato
                  ? `${p.startDato ? `fra ${dato(p.startDato)}` : ''}${p.startDato && p.sluttDato ? ' ' : ''}${p.sluttDato ? `til ${dato(p.sluttDato)}` : ''}`
                  : 'løpende';
                return (
                  <div key={p.id} className={`rounded-[10px] border border-black/[0.05] bg-[#fbfaf8] px-3 py-2.5 transition-opacity ${teller ? '' : 'opacity-55'}`} data-testid={`kostnadsskuff-post-${p.id}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[4px] bg-[#f4f0fb] px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wide text-[#8b5cf6]">{KATEGORI_LABEL[p.kategori] || 'Annet'}</span>
                      <span className="text-[12.5px] font-medium text-[#1c1917]">{p.navn}</span>
                      <span className="rounded-full px-1.5 py-[2px] text-[9.5px] font-semibold" style={{ background: st.bg, color: st.c }}>{st.t}</span>
                      <span className="ml-auto text-[12.5px] font-semibold tabular-nums text-[#1c1917]">{kr(p.belop)}<span className="text-[10px] font-medium text-[#b8b2a9]">/mnd</span></span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10.5px] text-[#a8a29a]">{FORDELING_LABEL[p.fordeling] || 'likt per enhet'} · {periode}</span>
                      <span className="ml-auto flex items-center gap-0.5">
                        <button
                          onClick={() => togglePause(p)}
                          disabled={lagrer}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#b3ada3] transition-colors hover:bg-white hover:text-[#57534e]"
                          title={p.aktiv === false ? 'Aktiver posten' : 'Sett på pause'}
                        >
                          {p.aktiv === false ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setSkjema({ ...p, startDato: p.startDato || '', sluttDato: p.sluttDato || '' })} className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#b3ada3] transition-colors hover:bg-white hover:text-[#57534e]" title="Rediger"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => slett(p.id)} disabled={lagrer} className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#b3ada3] transition-colors hover:bg-rose-50 hover:text-rose-500" title="Slett"><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-black/[0.05] bg-[#fbfaf8] px-5 py-3">
          <div className="flex items-baseline justify-between">
            <span className={ETIKETT}>Aktive nå</span>
            <span className="text-[14.5px] font-semibold tabular-nums text-[#1c1917]" style={heading} data-testid="kostnadsskuff-sum">{kr(aktivSum)}<span className="text-[10.5px] font-medium text-[#b8b2a9]">/mnd</span></span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-[#c2beb8]">{aktive.length} av {felles.length} {felles.length === 1 ? 'post' : 'poster'} teller i marginen</p>
        </div>
      </div>
    </div>
  );
}
