'use client';

/* Eiendomsoppslag for husleiekontrakt-wizarden.
   Skriv adresse → Kartverket-autofullføring → slår opp i Eiendomsregisteret
   (Infotorg EDR via markedssidens offentlige /api/infotorg/*). For eierseksjons-
   sameier velger brukeren riktig seksjon (med sameiebrøk + hjemmelshaver), for
   borettslag riktig andel. Matrikkel, seksjon og hjemmelshaver berikes tilbake
   til `bolig` og vises i kontrakten. Faller alltid tilbake til manuell adresse. */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Loader2, Check, MapPin, Building2, Home, Pencil, TriangleAlert, RotateCcw, User } from 'lucide-react';
import { T, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';

const INK = T.ink; const GRONN = T.gronn; const LILLA = T.lilla;

const TYPE_MAP = { sameie: 'leilighet', borettslag: 'leilighet', enebolig: 'enebolig', tomannsbolig: 'tomannsbolig', rekkehus: 'rekkehus' };
const REG_LABEL = { sameie: 'Eierseksjonssameie', borettslag: 'Borettslag', enebolig: 'Enebolig', tomannsbolig: 'Tomannsbolig', rekkehus: 'Rekkehus', hybel: 'Hybel', annet: 'Bolig' };
const REG_IKON = { sameie: Building2, borettslag: Building2, enebolig: Home, tomannsbolig: Home, rekkehus: Home };

const brok = (s) => (s.sameiebroek_teller && s.sameiebroek_nevner ? `${s.sameiebroek_teller}/${s.sameiebroek_nevner}` : '');
const matStr = (m, snr) => {
  if (!m || !m.kommunenr) return '';
  const base = `${m.kommunenr}-${m.gaardsnr}/${m.bruksnr}`;
  return snr && String(snr) !== '0' ? `${base}/${snr}` : base;
};

const jsonPost = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { status: r.status, data: d };
};

/* Én valgbar rad (seksjon eller andel) — DigiHome-stil. */
function ValgRad({ aktiv, tittel, undertekst, eier, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 text-left transition-colors"
      style={aktiv ? { background: 'rgba(212,150,255,0.12)', boxShadow: `inset 0 0 0 1.5px ${LILLA}` } : { background: '#fff', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold" style={{ color: INK }}>{tittel}</span>
        {undertekst ? <span className="block text-[12.5px]" style={{ color: SVAK }}>{undertekst}</span> : null}
        {eier ? (
          <span className="mt-0.5 flex items-center gap-1 text-[12.5px]" style={{ color: DIM }}>
            <User className="h-3 w-3 shrink-0" /> {eier.navn}
          </span>
        ) : null}
      </span>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={aktiv ? { background: LILLA } : { boxShadow: `inset 0 0 0 1.5px ${HAIR}` }}>
        {aktiv ? <Check className="h-3 w-3 text-white" /> : null}
      </span>
    </button>
  );
}

export default function EiendomsOppslag({ bolig = {}, onFyll }) {
  const bekreftetInit = !!(bolig && bolig.matrikkel && bolig.adresse);
  const [q, setQ] = useState(bolig.adresse || '');
  const [forslag, setForslag] = useState([]);
  const [apen, setApen] = useState(false);
  const [aktiv, setAktiv] = useState(-1);
  const [laster, setLaster] = useState(false);
  const [resultat, setResultat] = useState(null);          // { matrikkel, edr, building_type, borettslag }
  const [feil, setFeil] = useState('');                     // '' | not_found | unavailable | disabled | generic
  const [valgtSnr, setValgtSnr] = useState(bolig.seksjonsnr || '');
  const [valgtAndel, setValgtAndel] = useState(bolig.andelsnr || '');
  const [seksjonEiere, setSeksjonEiere] = useState({});
  const [andelEiere, setAndelEiere] = useState({});
  const [visAndeler, setVisAndeler] = useState([]);
  const [sok, setSok] = useState('');
  const [manuell, setManuell] = useState(false);
  const [bekreftet, setBekreftet] = useState(bekreftetInit);

  const boksRef = useRef(null);
  const abortRef = useRef(null);
  const hoppOverSok = useRef(false);
  const valgtSnrRef = useRef(valgtSnr);
  const valgtAndelRef = useRef(valgtAndel);
  valgtSnrRef.current = valgtSnr;
  valgtAndelRef.current = valgtAndel;

  /* Debounced adresse-autofullføring (Google Places via /api/address) */
  useEffect(() => {
    if (bekreftet || manuell) return undefined;
    if (hoppOverSok.current) { hoppOverSok.current = false; return undefined; }
    const term = q.trim();
    if (term.length < 3) { setForslag([]); setApen(false); setAktiv(-1); return undefined; }
    const t = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController(); abortRef.current = ctrl;
        const r = await fetch(`/api/address?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        const alle = Array.isArray(j?.suggestions) ? j.suggestions : [];
        const medNr = alle.filter((s) => /\d/.test(String(s.text || '')));
        const liste = (medNr.length ? medNr : alle).slice(0, 5);
        setForslag(liste); setApen(liste.length > 0); setAktiv(-1);
      } catch (e) { /* avbrutt/nett — stille */ }
    }, 220);
    return () => clearTimeout(t);
  }, [q, bekreftet, manuell]);

  useEffect(() => {
    const f = (e) => { if (boksRef.current && !boksRef.current.contains(e.target)) setApen(false); };
    document.addEventListener('pointerdown', f);
    return () => document.removeEventListener('pointerdown', f);
  }, []);

  /* Når hjemmelshavere lastes inn etter et auto-valgt objekt: berik utleier-forslaget. */
  useEffect(() => {
    const snr = valgtSnrRef.current;
    if (snr && seksjonEiere[snr]) onFyll?.({ hjemmelshaver: seksjonEiere[snr].navn, hjemmelshaver_type: seksjonEiere[snr].type });
  }, [seksjonEiere, onFyll]);
  useEffect(() => {
    const an = valgtAndelRef.current;
    if (an && andelEiere[an]) onFyll?.({ hjemmelshaver: andelEiere[an].navn, hjemmelshaver_type: andelEiere[an].type });
  }, [andelEiere, onFyll]);

  const velgSeksjon = useCallback((s, d) => {
    const res = d || resultat; const m = (res && res.matrikkel) || {};
    setValgtSnr(s.snr); setValgtAndel('');
    const eier = seksjonEiere[s.snr];
    onFyll?.({ seksjonsnr: s.snr, andelsnr: '', register_type: 'sameie', matrikkel_str: matStr(m, s.snr), ...(eier ? { hjemmelshaver: eier.navn, hjemmelshaver_type: eier.type } : {}) });
    setBekreftet(true);
  }, [resultat, seksjonEiere, onFyll]);

  const velgAndel = useCallback((a, d) => {
    const res = d || resultat; const brl = (res && res.borettslag) || {};
    setValgtAndel(a.andelsnr); setValgtSnr('');
    const eier = andelEiere[a.andelsnr];
    onFyll?.({ andelsnr: a.andelsnr, seksjonsnr: '', orgnr: brl.orgnr || '', register_type: 'borettslag', bruksenhetsnummer: a.bolignr || '', matrikkel_str: `Borettslag ${brl.orgnr || ''} · andel ${a.andelsnr}`, ...(eier ? { hjemmelshaver: eier.navn, hjemmelshaver_type: eier.type } : {}) });
    setBekreftet(true);
  }, [resultat, andelEiere, onFyll]);

  const slaOpp = useCallback(async (adresse) => {
    const address = String(adresse || '').trim();
    if (!address) return;
    setLaster(true); setFeil(''); setResultat(null); setApen(false);
    setValgtSnr(''); setValgtAndel(''); setSeksjonEiere({}); setAndelEiere({}); setVisAndeler([]); setSok('');
    try {
      const { status, data: d } = await jsonPost('/api/infotorg/lookup', { address });
      if (status === 503 || d.status === 'disabled') { setFeil('disabled'); setManuell(true); onFyll?.({ adresse: address }); setLaster(false); return; }
      if (status === 429) { setFeil('generic'); setLaster(false); return; }
      if (status === 502 || d.status === 'error') { setFeil('unavailable'); setLaster(false); return; }
      if (d.status === 'not_found') { setFeil('not_found'); setLaster(false); return; }
      if (d.status !== 'ok') { setFeil('generic'); setLaster(false); return; }

      setResultat(d);
      const m = d.matrikkel || {};
      const bt = d.building_type || 'enebolig';
      const base = {
        adresse: m.adressetekst || address,
        postnr: m.postnummer || '',
        poststed: m.poststed || '',
        type: TYPE_MAP[bt] || 'leilighet',
        matrikkel: { kommunenr: m.kommunenr, gaardsnr: m.gaardsnr, bruksnr: m.bruksnr },
        register_type: bt,
        bruksenhetsnummer: Array.isArray(m.bruksenhetsnummer) && m.bruksenhetsnummer.length === 1 ? m.bruksenhetsnummer[0] : '',
        seksjonsnr: '', andelsnr: '', orgnr: (d.borettslag && d.borettslag.orgnr) || '', hjemmelshaver: '', hjemmelshaver_type: '',
      };

      // Borettslag → andelsvelger
      if (bt === 'borettslag' && d.borettslag && (d.borettslag.andeler || []).length) {
        onFyll?.(base);
        const andeler = d.borettslag.andeler;
        const bm = address.match(/\b\d+\s*([A-Za-z])\b/);
        const bokstav = bm ? bm[1].toUpperCase() : '';
        const subset = bokstav ? andeler.filter((a) => (a.bokstav || '').toUpperCase() === bokstav) : [];
        const vis = (subset.length ? subset : andeler).slice(0, 60);
        setVisAndeler(vis);
        if (vis.length === 1) velgAndel(vis[0], d);
        jsonPost('/api/infotorg/andel-owners', { orgnr: d.borettslag.orgnr, andelsnr_list: vis.slice(0, 30).map((a) => a.andelsnr) })
          .then(({ data }) => { if (data && data.owners) setAndelEiere(data.owners); }).catch(() => {});
        setLaster(false);
        return;
      }

      // Eierseksjonssameie → seksjonsvelger (kun boligseksjoner, formål B)
      const boligSeksjoner = (d.edr?.seksjoner || []).filter((s) => s.formaal_kode === 'B');
      if (boligSeksjoner.length) {
        onFyll?.(base);
        if (boligSeksjoner.length === 1) velgSeksjon(boligSeksjoner[0], d);
        jsonPost('/api/infotorg/section-owners', { kommunenr: m.kommunenr, gaardsnr: m.gaardsnr, bruksnr: m.bruksnr, seksjonsnr_list: boligSeksjoner.slice(0, 40).map((s) => s.snr) })
          .then(({ data }) => { if (data && data.owners) setSeksjonEiere(data.owners); }).catch(() => {});
        setLaster(false);
        return;
      }

      // Enebolig / rekkehus / tomannsbolig / useksjonert → bekreft direkte + hent hjemmelshaver (snr 0)
      onFyll?.({ ...base, matrikkel_str: matStr(m, '0') });
      try {
        const { data: oj } = await jsonPost('/api/infotorg/owner', { kommunenr: m.kommunenr, gaardsnr: m.gaardsnr, bruksnr: m.bruksnr, seksjonsnr: '0' });
        if (oj && oj.owner) onFyll?.({ hjemmelshaver: oj.owner.navn, hjemmelshaver_type: oj.owner.type });
      } catch (e) { /* ikke-kritisk */ }
      setBekreftet(true);
      setLaster(false);
    } catch (e) {
      setFeil('unavailable'); setLaster(false);
    }
  }, [onFyll, velgSeksjon, velgAndel]);

  const velgForslag = (s) => {
    if (!s) return;
    hoppOverSok.current = true;
    const tekst = s.text || s.label || '';
    setQ(tekst); setApen(false);
    slaOpp(tekst);
  };

  const paaTast = (e) => {
    if (e.key === 'Escape') { setApen(false); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (aktiv >= 0 && forslag[aktiv]) velgForslag(forslag[aktiv]);
      else if (forslag.length) velgForslag(forslag[0]);
      else slaOpp(q);
      return;
    }
    if (!forslag.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setApen(true); setAktiv((i) => (i + 1) % forslag.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setApen(true); setAktiv((i) => (i <= 0 ? forslag.length - 1 : i - 1)); }
  };

  const nyttSok = () => {
    setBekreftet(false); setManuell(false); setResultat(null); setFeil(''); setQ(''); setValgtSnr(''); setValgtAndel('');
    onFyll?.({ matrikkel: null, seksjonsnr: '', andelsnr: '', orgnr: '', register_type: '', matrikkel_str: '', bruksenhetsnummer: '', hjemmelshaver: '', hjemmelshaver_type: '', adresse: '', postnr: '', poststed: '' });
  };

  const byttTilManuell = () => {
    setManuell(true); setApen(false); setFeil('');
    onFyll?.({ matrikkel: null, seksjonsnr: '', andelsnr: '', orgnr: '', register_type: '', matrikkel_str: '', bruksenhetsnummer: '', hjemmelshaver: '', hjemmelshaver_type: '' });
  };

  // ── BEKREFTET: kompakt kvittering ──
  if (bekreftet) {
    const Ikon = REG_IKON[bolig.register_type] || MapPin;
    return (
      <div className="rounded-[12px] p-4 sm:p-5" style={{ background: 'rgba(31,157,85,0.06)', boxShadow: `inset 0 0 0 1px rgba(31,157,85,0.22)` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)' }}><Ikon className="h-4.5 w-4.5" style={{ color: GRONN }} /></span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold" style={{ color: INK }}>{bolig.adresse}</p>
              <p className="text-[13px]" style={{ color: DIM }}>{[bolig.postnr, bolig.poststed].filter(Boolean).join(' ')}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]" style={{ color: DIM }}>
                {bolig.register_type ? <span className="font-medium" style={{ color: INK }}>{REG_LABEL[bolig.register_type] || 'Bolig'}</span> : null}
                {bolig.matrikkel_str ? <span>Matrikkel {bolig.matrikkel_str}</span> : null}
                {bolig.bruksenhetsnummer ? <span>Bolignr {bolig.bruksenhetsnummer}</span> : null}
              </div>
              {bolig.hjemmelshaver ? <p className="mt-1.5 flex items-center gap-1 text-[12.5px]" style={{ color: DIM }}><User className="h-3 w-3" /> Registrert eier: <span style={{ color: INK }}>{bolig.hjemmelshaver}</span></p> : null}
            </div>
          </div>
          <button type="button" onClick={nyttSok} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium" style={{ color: DIM, boxShadow: `inset 0 0 0 1px ${HAIR}`, background: '#fff' }}>
            <RotateCcw className="h-3.5 w-3.5" /> Nytt søk
          </button>
        </div>
      </div>
    );
  }

  // ── MANUELL adresse ──
  if (manuell) {
    return (
      <div className="rounded-[12px] p-4 sm:p-5" style={{ background: '#fff', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-[12.5px] font-medium" style={{ color: DIM }}>Adresse</label>
            <input value={bolig.adresse || ''} onChange={(e) => onFyll?.({ adresse: e.target.value })} placeholder="Nygårdsgaten 5" className="mt-1.5 w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[14.5px] outline-none" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: INK }} />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium" style={{ color: DIM }}>Postnummer</label>
            <input value={bolig.postnr || ''} onChange={(e) => onFyll?.({ postnr: String(e.target.value).replace(/\D/g, '').slice(0, 4) })} placeholder="5015" inputMode="numeric" className="mt-1.5 w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[14.5px] outline-none" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: INK }} />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium" style={{ color: DIM }}>Poststed</label>
            <input value={bolig.poststed || ''} onChange={(e) => onFyll?.({ poststed: e.target.value })} placeholder="Bergen" className="mt-1.5 w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[14.5px] outline-none" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: INK }} />
          </div>
        </div>
        <button type="button" onClick={() => { setManuell(false); setFeil(''); }} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: LILLA }}>
          <Search className="h-3.5 w-3.5" /> Søk i Eiendomsregisteret i stedet
        </button>
      </div>
    );
  }

  // ── SØK + RESULTAT ──
  const bt = resultat && resultat.building_type;
  const boligSeksjoner = ((resultat && resultat.edr && resultat.edr.seksjoner) || []).filter((s) => s.formaal_kode === 'B');
  const filtrer = (tekst, eier) => {
    const term = sok.trim().toLowerCase();
    if (!term) return true;
    return String(tekst).toLowerCase().includes(term) || String(eier?.navn || '').toLowerCase().includes(term);
  };
  const synligeSeksjoner = boligSeksjoner.filter((s) => filtrer(`seksjon ${s.snr} ${brok(s)}`, seksjonEiere[s.snr]));
  const synligeAndeler = visAndeler.filter((a) => filtrer(`andel ${a.andelsnr} ${a.adressetekst}`, andelEiere[a.andelsnr]));
  const manyeValg = (bt === 'sameie' && boligSeksjoner.length > 6) || (bt === 'borettslag' && visAndeler.length > 6);

  return (
    <div ref={boksRef} className="rounded-[12px] p-4 sm:p-5" style={{ background: '#fff', boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
      <label className="block text-[12.5px] font-medium" style={{ color: DIM }}>Søk opp adressen</label>
      <div className="relative mt-1.5">
        <div className="flex items-center rounded-[10px] px-3" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, background: '#fff' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: SVAK }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={paaTast}
            onFocus={() => { if (forslag.length) setApen(true); }}
            placeholder="Nygårdsgaten 5, Bergen"
            autoComplete="off" spellCheck={false}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2.5 text-[15px] outline-none placeholder:opacity-60"
            style={{ color: INK }}
            data-testid="lk-adresse-input"
          />
          {laster ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: SVAK }} /> : null}
        </div>
        {apen && forslag.length ? (
          <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[10px] py-1" style={{ background: '#fff', boxShadow: `0 20px 44px -22px rgba(21,19,15,0.35), inset 0 0 0 1px ${HAIR}` }}>
            {forslag.map((s, i) => (
              <li key={`${s.text || s.label}-${i}`}
                onPointerDown={(e) => { e.preventDefault(); velgForslag(s); }}
                onMouseEnter={() => setAktiv(i)}
                className={`flex cursor-pointer items-baseline justify-between gap-3 px-3.5 py-2.5 text-[14px] ${i > 0 ? 'border-t' : ''}`}
                style={{ borderColor: HAIR, background: i === aktiv ? 'rgba(21,19,15,0.04)' : 'transparent' }}>
                <span className="truncate" style={{ color: INK }}>{s.text}</span>
                <span className="shrink-0 text-[12.5px]" style={{ color: SVAK }}>{s.sub}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Feiltilstander */}
      {feil === 'not_found' ? (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] px-3 py-2.5" style={{ background: 'rgba(224,150,60,0.1)' }}>
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#b7791f' }} />
          <p className="text-[13px]" style={{ color: DIM }}>Vi fant ikke adressen i registeret. <button type="button" onClick={byttTilManuell} className="font-medium underline" style={{ color: INK }}>Skriv den inn manuelt</button>.</p>
        </div>
      ) : null}
      {feil === 'unavailable' || feil === 'generic' ? (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] px-3 py-2.5" style={{ background: 'rgba(224,108,94,0.1)' }}>
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#c0503f' }} />
          <p className="text-[13px]" style={{ color: DIM }}>Eiendomsregisteret svarer ikke akkurat nå. <button type="button" onClick={() => slaOpp(q)} className="font-medium underline" style={{ color: INK }}>Prøv igjen</button> eller <button type="button" onClick={byttTilManuell} className="font-medium underline" style={{ color: INK }}>skriv inn manuelt</button>.</p>
        </div>
      ) : null}

      {/* Seksjon-/andelsvelger */}
      {resultat && (bt === 'sameie' && boligSeksjoner.length) ? (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium" style={{ color: INK }}><Building2 className="h-4 w-4" style={{ color: LILLA }} /> Velg din seksjon ({boligSeksjoner.length} boligseksjoner)</p>
          {manyeValg ? (
            <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk på seksjonsnr eller eiernavn" className="mb-2 w-full rounded-[10px] bg-white px-3.5 py-2 text-[13.5px] outline-none" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: INK }} />
          ) : null}
          <div className="grid max-h-[300px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {synligeSeksjoner.map((s) => (
              <ValgRad key={s.snr} aktiv={valgtSnr === s.snr} tittel={`Seksjon ${s.snr}`} undertekst={brok(s) ? `Sameiebrøk ${brok(s)}` : ''} eier={seksjonEiere[s.snr]} onClick={() => velgSeksjon(s)} />
            ))}
          </div>
          <button type="button" onClick={byttTilManuell} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: SVAK }}><Pencil className="h-3.5 w-3.5" /> Finner du ikke riktig seksjon? Skriv inn manuelt</button>
        </div>
      ) : null}

      {resultat && (bt === 'borettslag' && visAndeler.length) ? (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium" style={{ color: INK }}><Building2 className="h-4 w-4" style={{ color: LILLA }} /> Velg din andel ({visAndeler.length} andeler)</p>
          {manyeValg ? (
            <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk på andelsnr eller eiernavn" className="mb-2 w-full rounded-[10px] bg-white px-3.5 py-2 text-[13.5px] outline-none" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: INK }} />
          ) : null}
          <div className="grid max-h-[300px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {synligeAndeler.map((a) => (
              <ValgRad key={a.andelsnr} aktiv={valgtAndel === a.andelsnr} tittel={`Andel ${a.andelsnr}`} undertekst={a.adressetekst || (a.bolignr ? `Bolignr ${a.bolignr}` : '')} eier={andelEiere[a.andelsnr]} onClick={() => velgAndel(a)} />
            ))}
          </div>
          <button type="button" onClick={byttTilManuell} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: SVAK }}><Pencil className="h-3.5 w-3.5" /> Finner du ikke riktig andel? Skriv inn manuelt</button>
        </div>
      ) : null}

      {!resultat && !feil ? (
        <p className="mt-2.5 text-[12.5px]" style={{ color: SVAK }}>Vi henter matrikkel og seksjon fra Eiendomsregisteret. Du kan alltid <button type="button" onClick={byttTilManuell} className="underline" style={{ color: DIM }}>skrive inn adressen manuelt</button>.</p>
      ) : null}
    </div>
  );
}
