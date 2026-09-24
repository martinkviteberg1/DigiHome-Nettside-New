'use client';

/* Kunder — tabell + editor. Fakturaen for valgt måned vises i skuff (samme panel
   som månedskjøringen), slik at kunde-editoren holder seg ren. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, CheckCircle2, Loader2, X, Star, Server, Building2, ReceiptText, Users, Lock, ChevronRight } from 'lucide-react';
import { LILLA, fmt, fmtV, kr, mndLabel, datoNb, Kort, Felt, Nedtrekk, Bryter, StatusPille, Tomt, GRUNNLAG, STATUS, inputCls, knappPrimær, knappSekundær, th, thR, td, tdR } from './felles';
import { FakturaSkuff } from './FakturaPanel';

export default function Kunder({ q, data, maaned, onLagret, tick }) {
  const [valgtId, setValgtId] = useState(null);
  const [utkast, setUtkast] = useState(null);
  const [lagrer, setLagrer] = useState(false);
  const [ok, setOk] = useState(false);
  const [ov, setOv] = useState(null);
  const [historikk, setHistorikk] = useState([]);
  const [visFaktura, setVisFaktura] = useState(null); // maaned

  const planer = data?.planer || [];
  const kunder = data?.kunder || [];
  const planFor = useCallback((id) => planer.find((p) => p.id === id) || planer.find((p) => p.standard) || planer[0], [planer]);

  useEffect(() => { (async () => { try { const r = await fetch(`/api/admin/fakturering/oversikt?${q}&maaned=${maaned}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) setOv(d); } catch (e) {} })(); }, [q, maaned, tick]);
  useEffect(() => { (async () => { try { const r = await fetch(`/api/admin/fakturering/fakturaer?${q}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) setHistorikk(d.fakturaer || []); } catch (e) {} })(); }, [q, tick]);

  const radFor = (id) => (ov?.per || []).find((p) => p.kundeId === id);
  const velg = (k) => { setValgtId(k.id); setUtkast({ ...k }); setOk(false); };
  const ny = () => { setValgtId('ny'); setUtkast({ navn: '', orgnr: '', epost: '', planId: planFor()?.id || '', enhetskilde: 'manuell', manueltAntall: 0, grunnlag: 'alle', grunnlagSelvbetjent: 'alle', prorata: true, status: 'aktiv', notat: '' }); };
  const lukk = () => { setValgtId(null); setUtkast(null); };

  const lagre = async () => {
    if (!utkast?.navn) return; setLagrer(true);
    try { const r = await fetch(`/api/admin/pris/kunder?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(utkast) }); const d = await r.json(); if (d.ok) { setValgtId(d.kunde.id); setUtkast({ ...d.kunde }); setOk(true); setTimeout(() => setOk(false), 2000); onLagret(); } else window.alert(d.feil || 'Kunne ikke lagre'); } catch (e) {}
    setLagrer(false);
  };
  const antForste = kunder.filter((k) => k.forste).length;
  const kanSlette = Boolean(utkast?.id) && (!utkast?.forste || antForste > 1);
  const slett = async () => {
    if (!kanSlette) return;
    if (!window.confirm(utkast.forste ? `Slette duplikatet av ${utkast.navn}? PowerOffice-utkast flyttes til den som beholdes.` : `Slette ${utkast.navn}? Frosne grunnlag og utkast beholdes i historikken.`)) return;
    const r = await fetch(`/api/admin/pris/kunder?${q}&id=${utkast.id}`, { method: 'DELETE' }); const d = await r.json().catch(() => ({}));
    if (!d.ok) { window.alert(d.feil || 'Kunne ikke slette kunden'); return; }
    lukk(); onLagret();
  };

  const kundeHist = useMemo(() => (utkast?.id ? historikk.filter((h) => h.kundeId === utkast.id).slice(0, 8) : []), [historikk, utkast]);
  const manglerData = (k) => !(/\d{9}/.test(String(k.orgnr || '').replace(/\s/g, ''))) && !String(k.epost || '').includes('@');

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
      {/* Liste */}
      <div>
        <Kort className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
            <p className="text-[13.5px] font-semibold text-black/80">Kunder <span className="ml-1 text-[12px] font-normal text-black/40">{kunder.length}</span></p>
            <button onClick={ny} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: LILLA }}><Plus className="h-4 w-4" /> Ny kunde</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-black/[0.02]"><tr className="border-b border-black/[0.06]"><th className={th}>Kunde</th><th className={th}>Plan</th><th className={thR}>Enheter</th><th className={thR}>{mndLabel(maaned).split(' ')[0]}</th><th className={th}></th></tr></thead>
              <tbody>
                {kunder.map((k) => {
                  const r = radFor(k.id); const on = valgtId === k.id;
                  return (
                    <tr key={k.id} onClick={() => velg(k)} className={`cursor-pointer border-b border-black/[0.04] last:border-0 ${on ? 'bg-[rgba(122,63,168,0.05)]' : 'hover:bg-black/[0.015]'}`}>
                      <td className={td}>
                        <div className="flex items-center gap-1.5 font-medium text-black/85">{k.navn}{k.forste ? <Star className="h-3 w-3" style={{ color: LILLA, fill: LILLA }} /> : null}<StatusPille status={k.status} />{manglerData(k) ? <span className="text-[10.5px] font-medium text-amber-700" title="Mangler org.nr og faktura-e-post">· mangler kundedata</span> : null}</div>
                        <div className="flex items-center gap-1 text-[11.5px] text-black/40">{k.enhetskilde === 'plattform' ? <Server className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}{k.enhetskilde === 'plattform' ? 'plattform' : 'manuelt antall'}{k.orgnr ? ` · ${k.orgnr}` : ''}</div>
                      </td>
                      <td className={`${td} text-black/60`}>{planFor(k.planId)?.navn || '—'}</td>
                      <td className={tdR}>{r ? <>{fmt(r.antallEnheter)}{r.vektet != null && r.vektet !== r.antallEnheter ? <span className="block text-[11px] text-black/40">vektet {fmtV(r.vektet)}</span> : null}</> : '…'}</td>
                      <td className={`${tdR} font-semibold text-black/85`}>{r ? <>{kr(r.sumEksMva)}{r.laast ? <span className="ml-1 inline-flex align-middle" title={`Låst ${datoNb(r.laast.tid)}`}><Lock className="h-3 w-3" style={{ color: '#059669' }} /></span> : null}</> : ''}</td>
                      <td className={`${td} text-right`}><ChevronRight className="inline h-4 w-4 text-black/30" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Kort>
      </div>

      {/* Editor */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        {utkast ? (
          <div className="space-y-4">
            <Kort className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-black/85">{valgtId === 'ny' ? 'Ny kunde' : utkast.navn || 'Kunde'}</h3>
                <button onClick={lukk} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/35 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Felt label="Kundenavn"><input value={utkast.navn} onChange={(e) => setUtkast({ ...utkast, navn: e.target.value })} className={inputCls} placeholder="F.eks. Bergen Eiendom AS" /></Felt>
                <Felt label="Org.nr" hint={!/\d{9}/.test(String(utkast.orgnr || '').replace(/\s/g, '')) ? 'Kreves for EHF-levering' : undefined}><input value={utkast.orgnr} onChange={(e) => setUtkast({ ...utkast, orgnr: e.target.value })} className={inputCls} placeholder="9 siffer" /></Felt>
                <Felt label="Faktura-e-post" hint={!String(utkast.epost || '').includes('@') ? 'Kreves for PDF på e-post' : undefined}><input value={utkast.epost} onChange={(e) => setUtkast({ ...utkast, epost: e.target.value })} className={inputCls} placeholder="faktura@…" /></Felt>
                <Felt label="Prisplan"><Nedtrekk verdi={utkast.planId} valg={planer.map((p) => ({ v: p.id, l: p.navn }))} onChange={(v) => setUtkast({ ...utkast, planId: v })} /></Felt>
                <Felt label="Status"><Nedtrekk verdi={utkast.status} valg={Object.entries(STATUS).map(([v, s]) => ({ v, l: s.l }))} onChange={(v) => setUtkast({ ...utkast, status: v })} /></Felt>
                <Felt label="Enhetskilde" hint={utkast.enhetskilde === 'plattform' ? 'Teller enheter fra plattformens leieforhold' : 'Sett antall manuelt inntil kunden er på plattformen'}>
                  <Nedtrekk verdi={utkast.enhetskilde} valg={[{ v: 'plattform', l: 'Plattform (leieforhold)' }, { v: 'manuell', l: 'Manuelt antall' }]} onChange={(v) => setUtkast({ ...utkast, enhetskilde: v })} />
                </Felt>
                {utkast.enhetskilde === 'manuell' ? (
                  <Felt label="Antall enheter"><input type="number" min={0} value={utkast.manueltAntall} onChange={(e) => setUtkast({ ...utkast, manueltAntall: Number(e.target.value) })} className={inputCls} /></Felt>
                ) : (
                  <Felt label="Hva som telles" hint={GRUNNLAG.find((g) => g.v === utkast.grunnlag)?.d}><Nedtrekk verdi={utkast.grunnlag} valg={GRUNNLAG} onChange={(v) => setUtkast({ ...utkast, grunnlag: v })} /></Felt>
                )}
                {utkast.enhetskilde === 'plattform' && planFor(utkast.planId)?.prisModell === 'per_type' ? (
                  <Felt label="Telles for selvbetjente"><Nedtrekk verdi={utkast.grunnlagSelvbetjent} valg={GRUNNLAG} onChange={(v) => setUtkast({ ...utkast, grunnlagSelvbetjent: v })} /></Felt>
                ) : null}
                {utkast.enhetskilde === 'plattform' ? (
                  <div className="rounded-xl bg-black/[0.02] p-3 sm:col-span-2">
                    <Bryter på={utkast.prorata !== false} onChange={(v) => setUtkast({ ...utkast, prorata: v })} label="Prorata ved inn- og utflytting" hint={utkast.prorata !== false ? 'Enheten vektes med dager i måneden den var med (10 av 31 dager = 0,32). Rettferdig ved bytte av leietaker.' : 'Av: én dag i måneden teller som hel måned.'} />
                  </div>
                ) : null}
                <div className="sm:col-span-2"><Felt label="Internt notat"><input value={utkast.notat || ''} onChange={(e) => setUtkast({ ...utkast, notat: e.target.value })} className={inputCls} placeholder="Vises kun her" /></Felt></div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button onClick={slett} disabled={!kanSlette} title={utkast.forste && !kanSlette ? 'Den konserninterne kunden kan ikke slettes' : ''} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-red-600/80 transition-colors hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /> Slett</button>
                <div className="flex items-center gap-2">
                  {utkast.id ? <button onClick={() => setVisFaktura(maaned)} className={knappSekundær}><ReceiptText className="h-4 w-4" /> Faktura {mndLabel(maaned).split(' ')[0]}</button> : null}
                  <button onClick={lagre} disabled={!utkast.navn || lagrer} className={knappPrimær} style={{ background: LILLA }}>{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{ok ? 'Lagret' : 'Lagre kunde'}</button>
                </div>
              </div>
            </Kort>

            {utkast.id ? (
              <Kort className="p-5">
                <p className="text-[13px] font-semibold text-black/80">Fakturahistorikk</p>
                {kundeHist.length ? (
                  <ul className="mt-3 divide-y divide-black/[0.05]">
                    {kundeHist.map((h) => (
                      <li key={`${h.kundeId}|${h.maaned}`}>
                        <button onClick={() => setVisFaktura(h.maaned)} className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-black/[0.015]">
                          <span className="text-[13px] font-medium text-black/75">{mndLabel(h.maaned)}</span>
                          <span className="flex items-center gap-2 text-[12px] text-black/45">{h.laast ? <Lock className="h-3 w-3" style={{ color: '#059669' }} /> : null}{h.utkast ? <span className="text-emerald-700">utkast{h.utkast.env === 'demo' ? ' · demo' : ''}</span> : null}<span className="font-semibold tabular-nums text-black/80">{kr(h.sumEksMva)}</span></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-[12.5px] text-black/40">Ingen frosne måneder eller utkast ennå.</p>}
              </Kort>
            ) : null}
          </div>
        ) : (
          <Tomt ikon={Users} tittel="Velg en kunde" tekst="Rediger plan, grunnlag og kundedata. Fakturaen for måneden åpnes fra knappen «Faktura» — eller fra Månedskjøring." />
        )}
      </div>

      {visFaktura && utkast?.id ? <FakturaSkuff q={q} kunde={kunder.find((k) => k.id === utkast.id) || utkast} plan={planFor(utkast.planId)} maaned={visFaktura} onLukk={() => setVisFaktura(null)} onEndret={onLagret} /> : null}
    </div>
  );
}
