'use client';

/* Innstillinger — alt oppsett samlet: PowerOffice-selskap det faktureres fra,
   selger (avsender), betaling, faktura. Ingen av disse valgene finnes andre steder. */

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Landmark, FileText, Save, CheckCircle2, Loader2, Percent, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { LILLA, BLEKK, datoNb, Felt, Nedtrekk, Bryter, Seksjon, MiljøPille, Pille, inputCls, knappPrimær } from './felles';

export default function Innstillinger({ q, data, onLagret, onGaaTilRegnskap }) {
  const [s, setS] = useState(data?.settings || null);
  const [lagrer, setLagrer] = useState(false);
  const [ok, setOk] = useState(false);
  const [selskaper, setSelskaper] = useState(null);
  const [poEnv, setPoEnv] = useState(null);

  useEffect(() => { setS(data?.settings || null); }, [data]);
  useEffect(() => { (async () => { try { const r = await fetch(`/api/admin/regnskap/selskaper?${q}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) { setSelskaper(d.selskaper || []); setPoEnv(d); } } catch (e) { setSelskaper([]); } })(); }, [q]);

  const lagre = useCallback(async () => {
    setLagrer(true);
    try { const r = await fetch(`/api/admin/pris/innstillinger?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }); const d = await r.json(); if (d.ok) { setS(d.settings); setOk(true); setTimeout(() => setOk(false), 2000); onLagret(); } } catch (e) {}
    setLagrer(false);
  }, [q, s, onLagret]);

  if (!s) return null;
  const valgt = (selskaper || []).find((x) => x.id === s.poSelskapId) || null;
  const auto = !s.poSelskapId ? ((selskaper || []).find((x) => /tech/i.test(x.navn || '')) || (selskaper || [])[0] || null) : null;
  const effektiv = valgt || auto;
  const harProd = (selskaper || []).some((x) => x.env === 'production');

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* PowerOffice */}
        <Seksjon tittel="Fakturer fra selskap" ikon={Landmark} beskrivelse="PowerOffice-klienten utkastene opprettes i. Dette er SELGEREN (DigiHome Tech AS) — ikke kunden. Selskaper og klientnøkler administreres under Regnskap · PowerOffice.">
          {selskaper === null ? <p className="text-[12.5px] text-black/40">Laster selskaper …</p> : !selskaper.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12.5px] text-amber-800">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Ingen PowerOffice-selskap registrert</p>
              <p className="mt-1">Legg til DigiHome Tech AS (produksjon) under Regnskap · PowerOffice — da kan utkast opprettes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {[{ id: '', navn: 'Automatisk', hint: 'Velger selskapet med «Tech» i navnet, ellers det første' }, ...selskaper].map((x) => {
                  const on = (s.poSelskapId || '') === x.id;
                  return (
                    <button key={x.id || 'auto'} type="button" onClick={() => setS({ ...s, poSelskapId: x.id })} className="flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all" style={{ borderColor: on ? LILLA : 'rgba(0,0,0,0.08)', background: on ? 'rgba(122,63,168,0.05)' : '#fff' }}>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-black/85">{x.navn}</span>
                        <span className="block text-[11.5px] text-black/45">{x.id ? `${x.klientNavn || 'klientnavn ukjent'}${x.sistTestet ? ` · testet ${datoNb(x.sistTestet)}` : ' · ikke testet'}` : x.hint}</span>
                      </span>
                      {x.id ? <MiljøPille env={x.env} /> : (auto ? <span className="flex items-center gap-1.5 text-[11.5px] text-black/45">→ {auto.navn} <MiljøPille env={auto.env} /></span> : null)}
                    </button>
                  );
                })}
              </div>
              {effektiv ? (
                <div className={`flex items-start gap-2 rounded-xl p-3 text-[12.5px] ${effektiv.env === 'production' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  {effektiv.env === 'production' ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{effektiv.env === 'production' ? <>Utkast opprettes i <b>{effektiv.navn}</b> (produksjon). Fakturaen sendes og bokføres først når du gjør det i Go.</> : <>Utkast går til <b>{effektiv.navn}</b> i <b>demo</b>-miljøet — ingen ekte faktura kan sendes derfra.{!harProd ? ' Legg til et produksjonsselskap under Regnskap · PowerOffice.' : ''}</>}</span>
                </div>
              ) : null}
              <button type="button" onClick={onGaaTilRegnskap} className="flex items-center gap-1.5 text-[12.5px] font-medium hover:underline" style={{ color: LILLA }}>Administrer selskaper og klientnøkler <ExternalLink className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </Seksjon>

        {/* Selger */}
        <Seksjon tittel="Selger (avsender på faktura)" ikon={Building2} beskrivelse="Vises øverst på proforma-PDF. PowerOffice bruker sine egne firmaopplysninger på den ekte fakturaen.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Felt label="Selskapsnavn"><input value={s.selgerNavn || ''} onChange={(e) => setS({ ...s, selgerNavn: e.target.value })} className={inputCls} placeholder="DigiHome Tech AS" /></Felt></div>
            <Felt label="Org.nr"><input value={s.selgerOrgnr || ''} onChange={(e) => setS({ ...s, selgerOrgnr: e.target.value })} className={inputCls} placeholder="9 siffer" /></Felt>
            <Felt label="Telefon"><input value={s.selgerTelefon || ''} onChange={(e) => setS({ ...s, selgerTelefon: e.target.value })} className={inputCls} placeholder="+47 …" /></Felt>
            <div className="sm:col-span-2"><Felt label="Gateadresse"><input value={s.selgerAdresse || ''} onChange={(e) => setS({ ...s, selgerAdresse: e.target.value })} className={inputCls} placeholder="Gate 1" /></Felt></div>
            <Felt label="Postnr"><input value={s.selgerPostnr || ''} onChange={(e) => setS({ ...s, selgerPostnr: e.target.value })} className={inputCls} placeholder="5003" /></Felt>
            <Felt label="Poststed"><input value={s.selgerSted || ''} onChange={(e) => setS({ ...s, selgerSted: e.target.value })} className={inputCls} placeholder="Bergen" /></Felt>
            <div className="sm:col-span-2"><Felt label="E-post"><input value={s.selgerEpost || ''} onChange={(e) => setS({ ...s, selgerEpost: e.target.value })} className={inputCls} placeholder="faktura@digihome.no" /></Felt></div>
          </div>
          <div className="mt-4 rounded-xl bg-black/[0.02] p-3">
            <Bryter på={s.mvaRegistrert !== false} onChange={(v) => setS({ ...s, mvaRegistrert: v })} label="Mva-registrert" hint="Av → fakturaen viser 0 % mva" />
          </div>
        </Seksjon>

        {/* Betaling */}
        <Seksjon tittel="Betaling og periode" ikon={Landmark} beskrivelse="Lisensen faktureres etterskuddsvis: måneden er grunnlaget, fakturaen dateres på fakturadagen i måneden etter.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Felt label="Bankkonto"><input value={s.bankkonto || ''} onChange={(e) => setS({ ...s, bankkonto: e.target.value })} className={inputCls} placeholder="1234.56.78901" /></Felt>
            <Felt label="IBAN"><input value={s.iban || ''} onChange={(e) => setS({ ...s, iban: e.target.value })} className={inputCls} placeholder="NO…" /></Felt>
            <Felt label="Betalingsfrist (dager)"><input type="number" min={0} max={90} value={s.betalingsfristDager} onChange={(e) => setS({ ...s, betalingsfristDager: Number(e.target.value) })} className={inputCls} /></Felt>
            <Felt label="Fakturadag (i måneden etter)" hint="Grunnlaget kan fryses fra den 1."><input type="number" min={1} max={28} value={s.fakturadag} onChange={(e) => setS({ ...s, fakturadag: Number(e.target.value) })} className={inputCls} /></Felt>
          </div>
        </Seksjon>

        {/* Faktura */}
        <Seksjon tittel="Faktura" ikon={FileText} beskrivelse="Produktnavnet blir varelinjen i PowerOffice. Leveringsmåten settes på kunden i Go når den opprettes.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Felt label="Produktnavn (fakturalinje)"><input value={s.produktnavn} onChange={(e) => setS({ ...s, produktnavn: e.target.value })} className={inputCls} /></Felt>
            <Felt label="Fakturaprefiks (referanse)"><input value={s.fakturaPrefiks || ''} onChange={(e) => setS({ ...s, fakturaPrefiks: e.target.value })} className={inputCls} placeholder="DHT" /></Felt>
            <Felt label="Mva-sats (%)"><div className="relative"><input type="number" min={0} max={100} value={s.mvaSats} onChange={(e) => setS({ ...s, mvaSats: Number(e.target.value) })} className={`${inputCls} pr-9`} /><Percent className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" /></div></Felt>
            <Felt label="Leveringsmåte" hint={s.levering === 'EHF' ? 'Krever org.nr på kunden og at mottaker er i ELMA-registeret.' : 'Krever faktura-e-post på kunden.'}><Nedtrekk verdi={s.levering} valg={[{ v: 'EHF', l: 'EHF (elektronisk)' }, { v: 'PdfByEmail', l: 'PDF på e-post' }]} onChange={(v) => setS({ ...s, levering: v })} /></Felt>
            <div className="sm:col-span-2"><Felt label="Fakturanotat (bunntekst)"><textarea rows={2} value={s.fakturanotat || ''} onChange={(e) => setS({ ...s, fakturanotat: e.target.value })} className={`${inputCls} resize-none`} placeholder="F.eks. betingelser ved forsinket betaling" /></Felt></div>
          </div>
        </Seksjon>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={lagre} disabled={lagrer} className={`${knappPrimær} h-10 px-5 shadow-lg`} style={{ background: BLEKK }}>{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{ok ? 'Lagret' : 'Lagre innstillinger'}</button>
      </div>
    </div>
  );
}
