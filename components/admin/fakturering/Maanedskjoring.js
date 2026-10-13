'use client';

/* Månedskjøring — én rad per kunde for valgt måned. Fire steg:
   1 Frys grunnlag → 2 Kontroller → 3 Utkast i PowerOffice → 4 Send i Go. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock, Loader2, ReceiptText, ArrowUpRight, CheckCircle2, AlertTriangle, Landmark, TrendingUp, Boxes, Users, ListChecks, Star, ExternalLink, RefreshCw } from 'lucide-react';
import { LILLA, BLEKK, GRONN, AMBER, fmt, fmtV, kr, mndLabel, datoNb, tidNb, skiftMnd, forrigeMnd, naaMnd, maanedValg, Kort, Pille, StatusPille, MiljøPille, Nedtrekk, Tomt, th, thR, td, tdR, knappPrimær, knappSekundær, knappLiten, lesJson, ventPaaJobb, jobbFeilTekst } from './felles';
import { FakturaSkuff } from './FakturaPanel';

function Kpi({ l, v, sub, ikon: Ikon, tone }) {
  return (
    <Kort className="p-4">
      <div className="flex items-center justify-between"><span className="text-[12px] font-medium text-black/50">{l}</span>{Ikon ? <Ikon className="h-4 w-4" style={{ color: tone || LILLA }} /> : null}</div>
      <p className="mt-2 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-black/90">{v}</p>
      <p className="text-[11.5px] text-black/40">{sub}</p>
    </Kort>
  );
}

function Steg({ nr, tittel, tekst, status, handling }) {
  const farge = status === 'ferdig' ? GRONN : status === 'delvis' ? AMBER : 'rgba(0,0,0,0.25)';
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-black/[0.06] bg-white p-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: farge }}>{status === 'ferdig' ? <CheckCircle2 className="h-4 w-4" /> : nr}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-black/80">{tittel}</p>
        <p className="mt-0.5 text-[11.5px] leading-[1.45] text-black/45">{tekst}</p>
        {handling ? <div className="mt-2">{handling}</div> : null}
      </div>
    </div>
  );
}

export default function Maanedskjoring({ q, data, maaned, setMaaned, onGaaTil, tick, onEndret }) {
  const [ov, setOv] = useState(null);
  const [laster, setLaster] = useState(true);
  const [kjorer, setKjorer] = useState(''); // 'frys' | 'utkast'
  const [kjorerSteg, setKjorerSteg] = useState(''); // framdrift fra bakgrunnsjobben
  const [resultat, setResultat] = useState(null);
  const [valgt, setValgt] = useState(null); // kundeId for skuff

  const last = useCallback(async () => {
    setLaster(true);
    try { const r = await fetch(`/api/admin/fakturering/oversikt?${q}&maaned=${maaned}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) setOv(d); } catch (e) {}
    setLaster(false);
  }, [q, maaned]);
  useEffect(() => { last(); }, [last, tick]);

  const per = useMemo(() => (ov?.per || []).slice().sort((a, b) => (a.status === 'inaktiv') - (b.status === 'inaktiv') || b.sumEksMva - a.sumEksMva), [ov]);
  const fakturerbare = per.filter((p) => p.status !== 'inaktiv' && p.linjer > 0);
  const uLaast = fakturerbare.filter((p) => !p.laast);
  const uUtkast = fakturerbare.filter((p) => !p.utkast);
  const avviker = fakturerbare.filter((p) => p.utkast && p.utkast.sumEksMva != null && Math.abs(Number(p.utkast.sumEksMva) - Number(p.sumEksMva || 0)) > 0.5);
  const manglerData = fakturerbare.filter((p) => !p.klar.orgnr && !p.klar.epost);
  const avsluttet = ov?.maanedAvsluttet ?? (maaned < naaMnd());
  const po = ov?.po;

  const kjorAlle = async (type) => {
    const n = type === 'frys' ? uLaast.length : uUtkast.length;
    const tekst = type === 'frys'
      ? `Fryse grunnlaget for ${n} kunde${n === 1 ? '' : 'r'} · ${mndLabel(maaned)}?\n\nEnhetsliste og pris lagres slik de er nå.`
      : `Opprette PowerOffice-utkast for ${n} kunde${n === 1 ? '' : 'r'} · ${mndLabel(maaned)}?\n\nGrunnlaget fryses først. Utkastene er usendte — du kontrollerer og sender i Go${po?.env === 'demo' ? ' (DEMO-miljø)' : ''}.`;
    if (!window.confirm(tekst)) return;
    setKjorer(type); setResultat(null); setKjorerSteg('Starter …');
    try {
      // Serveren starter en bakgrunnsjobb (202 + jobb) og vi poller til den er ferdig —
      // kjøringen tåler da at plattform + PowerOffice bruker minutter, uten tidsavbrudd.
      const r = await fetch(`/api/admin/fakturering/${type === 'frys' ? 'frys-alle' : 'utkast-alle'}?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maaned }) });
      const d = await lesJson(r);
      if (!d.ok) { window.alert(jobbFeilTekst(d, 'Kjøringen kunne ikke startes')); }
      else if (d.jobb) {
        const j = await ventPaaJobb(q, d.jobb.id, setKjorerSteg);
        if (j.status === 'ferdig' && j.resultat) setResultat({ type, ...j.resultat });
        else window.alert(jobbFeilTekst(j, 'Kjøringen feilet'));
      } else setResultat({ type, ...d });
    } catch (e) { window.alert(`Kjøringen ble avbrutt.\n\n${e?.message || e}\n\nListen oppdateres — det som rakk å bli gjort, vises.`); }
    finally { try { await last(); if (onEndret) onEndret(); } catch (e) { /* neste last */ } setKjorer(''); setKjorerSteg(''); }
  };

  const planFor = (id) => (data?.planer || []).find((p) => p.id === id) || (data?.planer || []).find((p) => p.standard) || (data?.planer || [])[0];
  const valgtKunde = valgt ? (data?.kunder || []).find((k) => k.id === valgt) : null;

  return (
    <div className="mt-5 space-y-5">
      {/* Måned + PowerOffice-kontekst */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMaaned(skiftMnd(maaned, -1))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/55 hover:bg-black/[0.03]"><ChevronLeft className="h-4 w-4" /></button>
          <div className="min-w-[190px]"><Nedtrekk verdi={maaned} valg={maanedValg(24)} onChange={setMaaned} /></div>
          <button onClick={() => setMaaned(skiftMnd(maaned, 1))} disabled={skiftMnd(maaned, 1) >= naaMnd()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/55 hover:bg-black/[0.03] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          {maaned !== forrigeMnd() ? <button onClick={() => setMaaned(forrigeMnd())} className="ml-1 text-[12.5px] font-medium hover:underline" style={{ color: LILLA }}>Forrige måned</button> : null}
          <button onClick={last} title="Oppdater" className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-black/40 hover:bg-black/[0.04]"><RefreshCw className={`h-4 w-4 ${laster ? 'animate-spin' : ''}`} /></button>
        </div>
        <button onClick={() => onGaaTil('innstillinger')} className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-left transition-colors hover:bg-black/[0.02]">
          <Landmark className="h-4 w-4" style={{ color: LILLA }} />
          <span className="text-[12.5px] text-black/60">PowerOffice · <span className="font-semibold text-black/80">{po?.selskapNavn || 'ikke valgt'}</span></span>
          <MiljøPille env={po?.env} konfigurert={po?.konfigurert !== false && !!po?.selskapNavn} />
        </button>
      </div>

      {ov?.plattformFeil ? <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{ov.plattformFeil}</span></div> : null}
      {po && po.env === 'demo' && avsluttet ? <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Utkast går til PowerOffice sin <b>demo</b>-klient («{po.selskapNavn}»). Legg til DigiHome Tech AS som produksjonsselskap under Regnskap og velg det i Innstillinger før ekte fakturering.</span></div> : null}

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi l="Å fakturere" v={kr(ov?.sum?.eks || 0)} sub={`${kr(ov?.sum?.ink || 0)} inkl. mva · ${mndLabel(maaned)}`} ikon={TrendingUp} />
        <Kpi l="Enheter" v={fmt(ov?.sum?.enheter || 0)} sub={ov?.sum?.vektet != null && ov.sum.vektet !== ov.sum.enheter ? `vektet ${fmtV(ov.sum.vektet)}` : 'alle fakturerbare kunder'} ikon={Boxes} />
        <Kpi l="Kunder" v={`${fakturerbare.length}`} sub={`fakturerbare av ${ov?.aktive || 0} aktive`} ikon={Users} />
        <Kpi l="Status" v={`${ov?.laaste || 0} / ${fakturerbare.length}`} sub={`låst · ${ov?.utkast || 0} utkast i PowerOffice`} ikon={ListChecks} tone={(ov?.laaste || 0) === fakturerbare.length && fakturerbare.length ? GRONN : LILLA} />
      </div>

      {/* Steg */}
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <Steg nr={1} tittel="Frys grunnlaget" tekst={avsluttet ? `${fakturerbare.length - uLaast.length} av ${fakturerbare.length} låst. Enhetslisten låses slik den er på fakturadagen.` : 'Måneden er ikke avsluttet — kan fryses fra den 1.'} status={!fakturerbare.length ? 'venter' : uLaast.length === 0 ? 'ferdig' : uLaast.length < fakturerbare.length ? 'delvis' : 'venter'}
          handling={avsluttet && uLaast.length ? <button onClick={() => kjorAlle('frys')} disabled={!!kjorer} className={knappLiten}>{kjorer === 'frys' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />} Frys alle ({uLaast.length})</button> : null} />
        <Steg nr={2} tittel="Kontroller" tekst={manglerData.length ? `${manglerData.length} kunde${manglerData.length === 1 ? '' : 'r'} mangler org.nr/faktura-e-post.` : 'Åpne hver kunde, sjekk linjer og enhetsspesifikasjon. Last ned PDF ved behov.'} status={manglerData.length ? 'delvis' : (fakturerbare.length && uLaast.length === 0 ? 'ferdig' : 'venter')}
          handling={manglerData.length ? <button onClick={() => onGaaTil('kunder')} className={knappLiten}>Fyll inn kundedata</button> : null} />
        <Steg nr={3} tittel="Utkast i PowerOffice" tekst={avviker.length ? `${avviker.length} utkast avviker fra grunnlaget — åpne raden og erstatt før sending.` : `${fakturerbare.length - uUtkast.length} av ${fakturerbare.length} opprettet. Usendte utkast — ingen bokføring ennå.`} status={!fakturerbare.length ? 'venter' : avviker.length ? 'delvis' : uUtkast.length === 0 ? 'ferdig' : uUtkast.length < fakturerbare.length ? 'delvis' : 'venter'}
          handling={avsluttet && uUtkast.length && po?.konfigurert !== false ? <button onClick={() => kjorAlle('utkast')} disabled={!!kjorer} className={knappLiten}>{kjorer === 'utkast' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ReceiptText className="h-3.5 w-3.5" />} Opprett alle utkast ({uUtkast.length})</button> : null} />
        <Steg nr={4} tittel="Send i PowerOffice Go" tekst="Fakturanummer, bokføring og utsending (EHF/e-post) gjøres i Go — der kontrollen skal ligge." status={fakturerbare.length && uUtkast.length === 0 ? 'delvis' : 'venter'}
          handling={<a href="https://go.poweroffice.net" target="_blank" rel="noreferrer" className={knappLiten}>Åpne Go <ExternalLink className="h-3.5 w-3.5" /></a>} />
      </div>

      {/* Framdrift fra pågående kjøring (bakgrunnsjobb) */}
      {kjorer ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 text-[12.5px] text-black/60" data-testid="kjoring-steg" aria-live="polite">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: LILLA }} />
          <span className="min-w-0 flex-1 truncate">{kjorer === 'frys' ? 'Fryser grunnlag' : 'Oppretter utkast i PowerOffice'} — {kjorerSteg || 'arbeider …'}</span>
          <span className="hidden text-[11px] text-black/35 sm:inline">Kjører på serveren — fortsetter selv om du venter lenge.</span>
        </div>
      ) : null}

      {/* Resultat fra siste kjøring */}
      {resultat ? (
        <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-black/80">{resultat.type === 'frys' ? <Lock className="h-4 w-4" style={{ color: GRONN }} /> : <ReceiptText className="h-4 w-4" style={{ color: GRONN }} />} {resultat.type === 'frys' ? `Frøs ${resultat.frosset || 0} grunnlag` : `Opprettet ${resultat.opprettet || 0} utkast`}{resultat.feilet ? ` · ${resultat.feilet} feilet` : ''}</p>
          <ul className="mt-2 grid gap-1 text-[12.5px] sm:grid-cols-2">
            {(resultat.resultat || []).map((r) => (
              <li key={r.kundeId} className="flex items-center gap-2 text-black/65">
                {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: GRONN }} /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: AMBER }} />}
                <span className="truncate">{r.navn}</span>
                <span className="ml-auto whitespace-nowrap text-black/45">{r.ok ? (r.alleredeLaast || r.alleredeOpprettet ? 'allerede gjort' : 'ok') : (r.feil || 'feil')}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Tabell */}
      <Kort className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
          <p className="text-[13.5px] font-semibold text-black/80">Kunder · {mndLabel(maaned)}</p>
          <span className="text-[12px] text-black/40">{laster ? 'Oppdaterer …' : `${per.length} kunde${per.length === 1 ? '' : 'r'}`}</span>
        </div>
        {!per.length && !laster ? (
          <div className="p-8 text-center text-[13px] text-black/45">Ingen kunder ennå. <button onClick={() => onGaaTil('kunder')} className="font-medium hover:underline" style={{ color: LILLA }}>Legg til første kunde</button></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="bg-black/[0.02]">
                <tr className="border-b border-black/[0.06]">
                  <th className={th}>Kunde</th>
                  <th className={th}>Plan</th>
                  <th className={thR}>Enheter</th>
                  <th className={thR}>Eks. mva</th>
                  <th className={thR}>Inkl. mva</th>
                  <th className={th}>Grunnlag</th>
                  <th className={th}>PowerOffice</th>
                  <th className={th}>Klar</th>
                  <th className={`${th} text-right`}></th>
                </tr>
              </thead>
              <tbody>
                {per.map((p) => {
                  const inaktiv = p.status === 'inaktiv';
                  return (
                    <tr key={p.kundeId} onClick={() => !inaktiv && setValgt(p.kundeId)} className={`border-b border-black/[0.04] last:border-0 ${inaktiv ? 'opacity-45' : 'cursor-pointer hover:bg-black/[0.015]'}`}>
                      <td className={td}>
                        <div className="flex items-center gap-1.5 font-medium text-black/85">{p.navn}{p.forste ? <Star className="h-3 w-3" style={{ color: LILLA, fill: LILLA }} /> : null}<StatusPille status={p.status} /></div>
                        <div className="text-[11.5px] text-black/40">{p.enhetskilde === 'plattform' ? (p.grunnlagType === 'alle' ? 'plattform · under forvaltning' : 'plattform · utleide') : 'manuelt antall'}</div>
                      </td>
                      <td className={`${td} text-black/60`}>{p.planNavn}</td>
                      <td className={tdR}><span className="font-medium text-black/80">{fmt(p.antallEnheter)}</span>{p.vektet != null && p.vektet !== p.antallEnheter ? <span className="block text-[11px] text-black/40">vektet {fmtV(p.vektet)}</span> : null}{p.sammendrag?.selvbetjent?.registrert ? <span className="block whitespace-nowrap text-[11px] text-black/40" title={`Selvbetjente: ${p.sammendrag.selvbetjent.registrert} registrert · ${p.sammendrag.selvbetjent.medLeieforhold} med leieforhold · ${p.sammendrag.selvbetjent.prove} i prøve · ${p.sammendrag.selvbetjent.dvale} i dvale → ${p.sammendrag.selvbetjent.fakturert} fakturert`}>{p.sammendrag.selvbetjent.fakturert}/{p.sammendrag.selvbetjent.registrert} selvbetj.</span> : null}</td>
                      <td className={`${tdR} font-semibold text-black/85`}>{kr(p.sumEksMva)}</td>
                      <td className={`${tdR} text-black/55`}>{kr(p.sumInkMva)}</td>
                      <td className={td}>{inaktiv ? <span className="text-black/35">—</span> : p.laast ? <Pille farge="#065f46" bg="rgba(5,150,105,0.12)" title={`Frosset ${tidNb(p.laast.tid)}`}><Lock className="h-3 w-3" /> Låst {datoNb(p.laast.tid)}</Pille> : <Pille farge="#6b21a8" bg="rgba(122,63,168,0.1)"><Unlock className="h-3 w-3" /> Live</Pille>}</td>
                      <td className={td}>
                        {inaktiv ? <span className="text-black/35">—</span> : p.utkast ? (() => {
                          const avvik = p.utkast.sumEksMva != null && Math.abs(Number(p.utkast.sumEksMva) - Number(p.sumEksMva || 0)) > 0.5;
                          return (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <Pille farge="#065f46" bg="rgba(5,150,105,0.12)"><CheckCircle2 className="h-3 w-3" /> Utkast{p.utkast.poOrderNo ? ` #${p.utkast.poOrderNo}` : ''}</Pille>
                              <MiljøPille env={p.utkast.env} />
                              {avvik ? <Pille farge="#92400e" bg="rgba(217,119,6,0.14)" title={`Utkastet i Go er på ${kr(p.utkast.sumEksMva)} eks. mva — grunnlaget er ${kr(p.sumEksMva)}. Åpne raden og erstatt utkastet.`}><AlertTriangle className="h-3 w-3" /> Avvik · {kr(p.utkast.sumEksMva)} i Go</Pille> : null}
                              {p.utkast.gui ? <a href={p.utkast.gui} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-black/40 hover:text-black/70" title="Åpne i Go"><ArrowUpRight className="h-3.5 w-3.5" /></a> : null}
                            </span>
                          );
                        })() : <span className="text-[12px] text-black/40">Ikke opprettet</span>}
                      </td>
                      <td className={td}>
                        <span className="flex items-center gap-1.5 text-[11.5px]">
                          <span className={p.klar.orgnr ? 'text-emerald-700' : 'text-black/35'} title={p.klar.orgnr ? `Org.nr ${p.orgnr}` : 'Mangler org.nr'}>{p.klar.orgnr ? '✓' : '○'} org.nr</span>
                          <span className={p.klar.epost ? 'text-emerald-700' : 'text-black/35'} title={p.klar.epost ? p.epost : 'Mangler faktura-e-post'}>{p.klar.epost ? '✓' : '○'} e-post</span>
                        </span>
                      </td>
                      <td className={`${td} text-right`}>{!inaktiv ? <span className="inline-flex items-center gap-1 text-[12.5px] font-medium" style={{ color: LILLA }}>Åpne <ChevronRight className="h-3.5 w-3.5" /></span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
              {fakturerbare.length > 1 ? (
                <tfoot>
                  <tr className="border-t border-black/[0.08] bg-black/[0.015]">
                    <td className={`${td} font-semibold text-black/70`} colSpan={2}>Sum</td>
                    <td className={`${tdR} font-semibold text-black/80`}>{fmt(ov?.sum?.enheter || 0)}</td>
                    <td className={`${tdR} font-semibold text-black/85`}>{kr(ov?.sum?.eks || 0)}</td>
                    <td className={`${tdR} text-black/55`}>{kr(ov?.sum?.ink || 0)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </Kort>

      {valgtKunde ? <FakturaSkuff q={q} kunde={valgtKunde} plan={planFor(valgtKunde.planId)} maaned={maaned} onLukk={() => setValgt(null)} onEndret={() => { last(); if (onEndret) onEndret(); }} /> : null}
    </div>
  );
}
