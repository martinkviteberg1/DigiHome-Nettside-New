'use client';

/* Faktura-panel: proforma med linjer, modell, enhetsspesifikasjon, frys/lås opp,
   PDF og PowerOffice-utkast. Brukes både i kunde-editoren (live) og i
   skuffen fra månedskjøring/historikk (lagret kunde). */

import React, { useEffect, useState } from 'react';
import { ReceiptText, Loader2, Lock, Unlock, MapPin, ChevronRight, Download, Eye, Landmark, CheckCircle2, ArrowUpRight, FileText, X, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { LILLA, BLEKK, GRONN, AMBER, fmt, fmtV, kr, mndLabel, datoNb, perNb, adresseKort, Pille, useFaktura } from './felles';

export function PdfModal({ url, tittel, onLukk }) {
  useEffect(() => { const h = (e) => { if (e.key === 'Escape') onLukk(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onLukk]);
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4" onClick={onLukk}>
      <div className="flex h-[92vh] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.08] px-4 py-3">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-black/80"><FileText className="h-4 w-4" style={{ color: LILLA }} /> {tittel}</p>
          <div className="flex items-center gap-2">
            <a href={url} download className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 text-[12.5px] font-medium text-black/70 hover:bg-black/[0.03]"><Download className="h-3.5 w-3.5" /> Last ned</a>
            <button onClick={onLukk} className="flex h-8 w-8 items-center justify-center rounded-lg text-black/45 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <iframe title="Proforma-faktura" src={url} className="h-full w-full flex-1 bg-neutral-100" />
      </div>
    </div>
  );
}

export default function FakturaPanel({ q, kunde, plan, maaned, onEndret, kompakt = false }) {
  const f = useFaktura({ q, kunde, plan, maaned, onEndret });
  const [åpen, setÅpen] = useState(false);
  const faktura = f.faktura;
  const mva = faktura?.mvaSats ?? 25;
  const spec = faktura?.spesifikasjon || [];
  const tom = !faktura || !(faktura.linjer || []).length;
  const laast = faktura?.grunnlagLaast || null;
  const s = faktura?.sammendrag || null;
  const m = faktura?.modell || {};
  const visLedig = m.grunnlag === 'alle' && s && (s.ledig + s.delvis) > 0;
  const lagret = Boolean(kunde?.id);
  const poUtkast = f.poUtkast;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.28)]">
        {/* Toppfelt */}
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: BLEKK, color: '#F4F1EA' }}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(244,241,234,0.1)' }}><ReceiptText className="h-4 w-4" /></span>
            <div><p className="text-[14px] font-semibold">Proforma-faktura</p><p className="text-[11.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>{faktura?.selger?.navn || 'DigiHome Tech AS'} → {kunde?.navn || 'kunde'} · {mndLabel(maaned)}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {f.laster ? <Loader2 className="h-4 w-4 animate-spin text-white/60" /> : null}
            {laast ? (
              <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{ background: 'rgba(52,211,153,0.18)', color: '#a7f3d0' }} title={`Grunnlaget ble frosset ${datoNb(laast.tid)} (${laast.av === 'poweroffice' ? 'ved PowerOffice-utkast' : laast.av === 'auto' ? 'automatisk' : 'manuelt'}). Endringer i kunde/plan påvirker ikke denne måneden.`}><Lock className="h-3 w-3" /> LÅST · {datoNb(laast.tid)}</span>
            ) : (
              <span className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{ background: 'rgba(212,150,255,0.22)', color: '#e9d5ff' }} title="Beregnes live fra plattformens øyeblikksbilde. Frys grunnlaget før fakturering.">UTKAST · LIVE</span>
            )}
          </div>
        </div>

        <div className="p-5">
          {/* Beløp */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-black/40">Å fakturere</p>
              <p className="mt-1 text-[34px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-black/90">{kr(faktura?.sumInkMva || 0)}</p>
              <p className="mt-1.5 text-[12.5px] text-black/45">{faktura?.mvaRegistrert === false ? 'uten mva (ikke mva-registrert)' : `inkl. ${mva}% mva`}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA }}>{fmt(faktura?.antallEnheter || 0)} enheter</span>
              {s && s.vektet !== s.enheter && faktura?.grunnlagType !== 'manuell' ? <span className="text-[11px] tabular-nums text-black/40">vektet {fmtV(s.vektet)}</span> : null}
            </div>
          </div>

          {/* Modell */}
          {faktura && faktura.grunnlagType !== 'manuell' && m.grunnlag ? (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-black/45">
              <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5">{m.grunnlag === 'alle' ? 'Alle under forvaltning' : 'Kun utleide'}</span>
              <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5">{m.prorata ? 'Prorata per dag' : 'Hel måned per enhet'}</span>
              {visLedig ? <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5">Ledige {m.ledigFaktor ?? 100} %</span> : null}
              {s && s.rom > 0 ? <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5">{m.romModell === 'bolig' ? `${s.bofellesskap} bofellesskap = ${s.bofellesskap} enhet${s.bofellesskap === 1 ? '' : 'er'} (${s.rom} rom)` : `${s.rom} rom${(m.romFaktor ?? 100) !== 100 ? ` à ${m.romFaktor} %` : ''}`}</span> : null}
              <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5">{m.trinnModell === 'progressiv' ? 'Progressive trinn' : 'Én trinnpris'}</span>
              {s ? <span className="ml-auto tabular-nums">{s.utleid} utleid · {s.ledig} ledig{s.delvis ? ` · ${s.delvis} delvis` : ''}</span> : null}
            </p>
          ) : null}
          {/* Selvbetjente enheter — hvorfor tallet er lavere enn antall registrerte */}
          {s?.selvbetjent ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-black/[0.06] bg-black/[0.015] px-2.5 py-1.5 text-[11.5px] text-black/55">
              <span className="font-semibold text-black/65">Selvbetjente</span>
              <span className="tabular-nums">{s.selvbetjent.registrert} registrert</span>
              <span className="text-black/25">·</span>
              <span className="tabular-nums">{s.selvbetjent.medLeieforhold} med leieforhold</span>
              {s.selvbetjent.prove ? <><span className="text-black/25">·</span><span className="tabular-nums text-emerald-700">{s.selvbetjent.prove} i prøveperiode</span></> : null}
              {s.selvbetjent.dvale ? <><span className="text-black/25">·</span><span className="tabular-nums text-black/40">{s.selvbetjent.dvale} i dvale</span></> : null}
              <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 font-semibold tabular-nums text-black/70 ring-1 ring-black/[0.06]">→ {s.selvbetjent.fakturert} fakturert</span>
              <span className="w-full text-[10.5px] text-black/35">{s.selvbetjent.regel === 'leieforhold' ? 'Teller kun måneder med leietaker (prorata)' : 'Følger kundens grunnlag'}{s.selvbetjent.proveDager ? ` · ${s.selvbetjent.proveDager} dager gratis fra første innflytting` : ''}{s.selvbetjent.dvaleDager ? ` · dvale etter ${s.selvbetjent.dvaleDager} dager uten leieforhold` : ''}</span>
            </div>
          ) : null}

          {/* Meta */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-black/[0.06] pt-4 text-[12px]">
            <div><p className="text-black/40">Fakturanr</p><p className="mt-0.5 font-medium text-black/75">{faktura?.fakturanr || 'UTKAST'}</p></div>
            <div><p className="text-black/40">Fakturadato</p><p className="mt-0.5 font-medium tabular-nums text-black/75">{datoNb(faktura?.fakturaDato) || '—'}</p></div>
            <div><p className="text-black/40">Forfall</p><p className="mt-0.5 font-medium tabular-nums text-black/75">{datoNb(faktura?.forfallsDato) || '—'}</p></div>
          </div>

          {/* Linjer — per enhet grupperes de under produktnavnet, med markører (ny/prøve/ledig/delvis) */}
          <div className="mt-4 space-y-2.5 border-t border-black/[0.06] pt-4">
            {(faktura?.linjer || []).map((l, i, arr) => {
              const nyGruppe = l.gruppe && l.gruppe !== arr[i - 1]?.gruppe;
              const antallIGruppe = l.gruppe ? arr.filter((x) => x.gruppe === l.gruppe).length : 0;
              return (
                <React.Fragment key={i}>
                  {nyGruppe ? (
                    <div className={`flex items-baseline justify-between gap-3 ${i > 0 ? 'mt-3 border-t border-black/[0.05] pt-3' : ''}`}>
                      <p className="text-[13px] font-semibold text-black/75">{l.gruppe}</p>
                      <p className="text-[11.5px] text-black/40">{antallIGruppe} enhet{antallIGruppe === 1 ? '' : 'er'}</p>
                    </div>
                  ) : null}
                  <div className={`flex items-start justify-between gap-3 ${l.gruppe ? 'pl-3' : ''}`}>
                    <div className="min-w-0">
                      <p className={`break-words ${l.gruppe ? 'text-[13px] text-black/75' : 'text-[13.5px] font-medium text-black/80'}`}>{l.beskrivelse}</p>
                      {l.detalj ? <p className="text-[11px] text-black/40">{l.detalj}</p> : null}
                      <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-black/45">
                        <span>{l.type === 'minstepris' ? 'Sum under planens minstepris' : (l.vekt !== l.antall ? `${fmtV(l.vekt)}${l.gruppe ? '' : ` av ${fmt(l.antall)} (vektet)`}` : `${fmtV(l.antall)} enhet${l.antall === 1 ? '' : 'er'}`)}{l.type === 'minstepris' ? '' : ` × ${kr(l.pris)}`}</span>
                        {(l.merker || []).map((mk) => <span key={mk.k} className={`rounded px-1 py-px text-[10px] font-medium ${mk.k === 'ny' || mk.k === 'prove' ? 'bg-emerald-50 text-emerald-700' : mk.k === 'ledig' ? 'bg-black/[0.05] text-black/45' : mk.k === 'delvis' ? 'bg-amber-50 text-amber-700' : 'bg-black/[0.05] text-black/50'}`}>{mk.t}</span>)}
                      </p>
                    </div>
                    <p className={`shrink-0 tabular-nums ${l.gruppe ? 'text-[13px] font-medium text-black/75' : 'text-[14px] font-semibold text-black/85'}`}>{kr(l.belop)}</p>
                  </div>
                </React.Fragment>
              );
            })}
            {tom ? <p className="text-[13px] text-black/40">Ingen enheter i grunnlaget for {mndLabel(maaned)}.</p> : null}
          </div>

          {/* Totaler */}
          <div className="mt-4 space-y-1.5 border-t border-black/[0.06] pt-4 text-[13px]">
            <div className="flex justify-between text-black/55"><span>Sum eks. mva</span><span className="tabular-nums">{kr(faktura?.sumEksMva || 0)}</span></div>
            <div className="flex justify-between text-black/55"><span>Mva {mva}%</span><span className="tabular-nums">{kr(faktura?.mva || 0)}</span></div>
            <div className="flex justify-between pt-1 text-[15px] font-semibold text-black/90"><span>Å betale</span><span className="tabular-nums">{kr(faktura?.sumInkMva || 0)}</span></div>
          </div>

          {/* Enhetsspesifikasjon */}
          {spec.length ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-black/[0.07]">
              <button onClick={() => setÅpen((v) => !v)} className="flex w-full items-center justify-between gap-2 bg-black/[0.02] px-3.5 py-2.5 text-left transition-colors hover:bg-black/[0.035]">
                <span className="flex items-center gap-2 text-[12.5px] font-semibold text-black/70"><MapPin className="h-3.5 w-3.5" style={{ color: LILLA }} /> Enhetsspesifikasjon · {spec.length} enhet{spec.length === 1 ? '' : 'er'}</span>
                <ChevronRight className={`h-4 w-4 text-black/40 transition-transform ${åpen ? 'rotate-90' : ''}`} />
              </button>
              {åpen ? (
                <div className={`${kompakt ? 'max-h-[420px]' : 'max-h-[320px]'} overflow-auto`}>
                  <table className="w-full text-[11.5px]">
                    <thead className="sticky top-0 bg-white text-left text-[10px] uppercase tracking-[0.05em] text-black/40">
                      <tr className="border-b border-black/[0.06]">
                        <th className="px-3.5 py-2 font-medium">Adresse</th>
                        <th className="px-2 py-2 font-medium">Leietaker</th>
                        <th className="px-2 py-2 font-medium">Periode</th>
                        <th className="px-2 py-2 text-right font-medium" title="Utleide dager / dager under forvaltning">Dager</th>
                        <th className="px-2 py-2 text-right font-medium">Vekt</th>
                        <th className="px-3.5 py-2 text-right font-medium">Beløp</th>
                      </tr>
                    </thead>
                    <tbody className="text-black/70">
                      {spec.map((e, i) => (
                        <tr key={i} className="border-b border-black/[0.04] last:border-0">
                          <td className="max-w-[200px] px-3.5 py-1.5 font-medium text-black/80" title={`${e.address || ''}${e.detalj || e.unit_room ? ` · ${e.detalj || e.unit_room}` : ''}`}>
                            <span className="block break-words">{adresseKort(e.address) || e.enhet_id || '—'}{e.erRom && e.unit_room ? <span className="text-black/50"> · {String(e.unit_room).match(/\brom\s*\d+/i)?.[0] || ''}</span> : null}</span>
                            {(e.detalj || e.unit_room) ? <span className="block text-[10.5px] font-normal text-black/45">{e.unit_type === 'Bofellesskap' ? e.unit_room : (e.detalj || e.unit_room).replace(/\s*·\s*rom\s*\d+\s*$/i, '')}{e.romFaktor != null && e.romFaktor !== 100 ? ` · ${e.romFaktor} %` : ''}</span> : null}
                            {e.type === 'selvbetjent' || e.dagerProve > 0 ? <span className="mt-0.5 flex flex-wrap gap-1">{e.type === 'selvbetjent' ? <span className="rounded bg-black/[0.05] px-1 py-px text-[9.5px] font-medium uppercase tracking-[0.04em] text-black/45">selvbetjent</span> : null}{e.dagerProve > 0 ? <span className="rounded bg-emerald-50 px-1 py-px text-[9.5px] font-medium text-emerald-700" title="Prøveperiode — dagene er trukket fra">{e.dagerProve} d prøve</span> : null}</span> : null}
                          </td>
                          <td className="max-w-[120px] truncate px-2 py-1.5" title={e.tenant_name}>{e.tenant_name ? e.tenant_name : (e.status === 'ledig' ? <Pille farge="#b45309" bg="rgba(180,83,9,0.08)">Ledig</Pille> : '—')}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-black/50">{(e.move_in_date || e.move_out_date) ? `${perNb(e.move_in_date) || '—'}–${e.move_out_date ? perNb(e.move_out_date) : ''}` : '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-black/50">{e.status === 'ledig' ? `0/${e.dagerForvaltet ?? ''}` : (e.status === 'delvis' ? `${e.dager}/${e.dagerForvaltet}` : (e.dager ?? ''))}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-black/50">{e.vekt != null ? fmtV(e.vekt) : ''}</td>
                          <td className="whitespace-nowrap px-3.5 py-1.5 text-right font-medium tabular-nums text-black/85">{kr(e.belop)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* PDF */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-4">
            <label className="mr-auto flex cursor-pointer items-center gap-2 text-[12.5px] text-black/60">
              <input type="checkbox" checked={!!f.spesifiser} onChange={(e) => f.setSpesifiser(e.target.checked)} className="h-4 w-4 rounded accent-[#7a3fa8]" /> Spesifiser per enhet
            </label>
            <button onClick={f.lastNedPdf} disabled={tom || f.pdfLaster} className="flex h-9 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-[13px] font-medium text-black/70 transition-colors hover:bg-black/[0.03] disabled:opacity-40"><Download className="h-4 w-4" /> Last ned</button>
            <button onClick={f.forhaandsvisPdf} disabled={tom || f.pdfLaster} className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: LILLA }}>{f.pdfLaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Forhåndsvis PDF</button>
          </div>

          {/* Frys grunnlag */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-black/55">{laast ? <Lock className="h-3.5 w-3.5" style={{ color: GRONN }} /> : <Unlock className="h-3.5 w-3.5" style={{ color: LILLA }} />} Grunnlag</span>
            <span className="hidden text-[12px] text-black/45 sm:inline">
              {laast ? `Frosset ${datoNb(laast.tid)} — fakturaen endrer seg ikke selv om plattformen gjør det.` : (f.maanedAvsluttet ? 'Plattformens øyeblikksbilde endrer seg. Frys før du fakturerer.' : 'Kan fryses fra den 1. i måneden etter.')}
            </span>
            {laast ? (
              <button onClick={f.laasOpp} disabled={f.laasLaster || !!poUtkast} title={poUtkast ? 'Det finnes et PowerOffice-utkast for måneden' : 'Slett det frosne grunnlaget og beregn på nytt'} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] font-medium text-black/70 hover:bg-black/[0.03] disabled:opacity-40">{f.laasLaster ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />} Lås opp</button>
            ) : (
              <button onClick={f.frys} disabled={tom || f.laasLaster || !lagret || !f.maanedAvsluttet} title={!lagret ? 'Lagre kunden først' : (!f.maanedAvsluttet ? 'Måneden er ikke avsluttet' : '')} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] font-medium text-black/70 hover:bg-black/[0.03] disabled:opacity-40">{f.laasLaster ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />} Frys grunnlag</button>
            )}
          </div>

          {/* PowerOffice */}
          <div className={`mt-3 rounded-xl border px-3 py-2.5 ${f.utkastAvvik ? 'border-amber-200 bg-amber-50/60' : 'border-black/[0.06] bg-black/[0.02]'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-black/55"><Landmark className="h-3.5 w-3.5" style={{ color: LILLA }} /> PowerOffice Go</span>
              {poUtkast ? (
                <>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Utkast{poUtkast.poOrderNo ? ` · ordre ${poUtkast.poOrderNo}` : ''}{poUtkast.env === 'demo' ? ' · demo' : ''}</span>
                  <span className="text-[11.5px] tabular-nums text-black/45" title="Beløp eks. mva slik utkastet ble sendt til Go">{kr(poUtkast.sumEksMva || 0)} i Go</span>
                  {poUtkast.gui ? <a href={poUtkast.gui} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] font-medium text-black/70 hover:bg-black/[0.03]">Åpne i Go <ArrowUpRight className="h-3.5 w-3.5" /></a> : null}
                  <button onClick={f.slettUtkast} disabled={f.poLaster} title="Sletter det usendte utkastet i Go. Er det sendt, nektes slettingen." className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-red-600/80 transition-colors hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Slett utkast</button>
                </>
              ) : (
                <>
                  <span className="hidden text-[12px] text-black/45 sm:inline">Fryser grunnlaget og lager et usendt utkast i regnskapet — du kontrollerer og sender det i Go.</span>
                  <button onClick={f.opprettUtkast} disabled={tom || f.poLaster || !lagret || !f.maanedAvsluttet} title={!lagret ? 'Lagre kunden først' : (!f.maanedAvsluttet ? 'Måneden er ikke avsluttet' : '')} className="ml-auto flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: BLEKK }}>{f.poLaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />} Opprett utkast</button>
                </>
              )}
            </div>
            {f.utkastAvvik ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-amber-200/70 pt-2 text-[12px] text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="min-w-0 flex-1">Utkastet i Go ({kr(poUtkast.sumEksMva || 0)}) avviker fra {laast ? 'det frosne' : 'dagens'} grunnlaget ({kr(faktura?.sumEksMva || 0)}) — laget {laast ? 'før frysing' : 'med en annen modell'}. Erstatt det før du sender.</span>
                <button onClick={f.erstattUtkast} disabled={f.poLaster || !f.maanedAvsluttet} className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold text-white disabled:opacity-40" style={{ background: AMBER }}>{f.poLaster ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Erstatt utkast</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {f.pdfUrl ? <PdfModal url={f.pdfUrl} tittel={`Proforma · ${kunde?.navn || ''} · ${mndLabel(maaned)}`} onLukk={f.lukkPdf} /> : null}
    </>
  );
}

/* Skuff (slide-over) fra høyre — brukes fra månedskjøring og historikk */
export function FakturaSkuff({ q, kunde, plan, maaned, onLukk, onEndret }) {
  useEffect(() => { const h = (e) => { if (e.key === 'Escape') onLukk(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onLukk]);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  if (!kunde) return null;
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/35" onClick={onLukk}>
      <div className="flex h-full w-full max-w-[640px] flex-col overflow-hidden bg-[#F7F5F0] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.08] bg-white px-5 py-3">
          <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-black/85">{kunde.navn}</p><p className="text-[12px] text-black/45">Faktura · {mndLabel(maaned)}</p></div>
          <button onClick={onLukk} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black/45 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <FakturaPanel q={q} kunde={kunde} plan={plan} maaned={maaned} onEndret={onEndret} kompakt />
        </div>
      </div>
    </div>
  );
}
