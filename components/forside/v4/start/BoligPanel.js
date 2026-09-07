'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import BoligKart from './BoligKart';
import { EASE, T, display } from '../motion';

/* ---------------------------------------------------------------------------
   BoligPanel — «kartet våkner». Høyre kolonne på desktop, en stripe over
   stegene på mobil. Én flate som forvandler seg — aldri en boks som forklarer.

   · 0 s: Bergen i V4-palett, langsom drift. Ingen overskrift, ingen liste.
     Kvitteringen nederst (Bolig · Modell · Kontakt) ER de tre stegene.
   · Skriving: nålen lander på forslaget, kartet flyr. Caption glir inn.
   · Bekreftet adresse: kameraet dykker trinnvis mot nålen → hold → push-in
     og morph til Street View (bygget ditt). Fotoet slippes aldri før kartet
     har landet og fått sitt øyeblikk — uansett hvor raskt det lastet.
   · Finnes ikke panorama: kartet blir stående tett på nålen.
   · Kun opacity/transform i bevegelse. Tekstfarger følger flaten (lys på
     kart, offwhite på foto).
--------------------------------------------------------------------------- */

const OFF = '#F4F1EA';
const HOLD_ETTER_LANDING = 1100;   // nålen får stå litt før fotoet slippes
const FALLBACK_UTEN_KART = 3500;   // kartet kom aldri → vis fotoet likevel
const FALLBACK_UTEN_LANDING = 4500;

/* Én kvitteringsverdi. Glir inn når den settes, uten å endre radens høyde. */
function Verdi({ v, tom = '—', farge, svak, overg }) {
  const [vist, setVist] = useState(v);
  const [inn, setInn] = useState(true);
  useEffect(() => {
    if (v === vist) return undefined;
    setInn(false);
    const t = window.setTimeout(() => { setVist(v); setInn(true); }, 180);
    return () => window.clearTimeout(t);
  }, [v, vist]);
  return (
    <span className="inline-block max-w-full truncate align-bottom" style={{ opacity: inn ? 1 : 0, transform: inn ? 'none' : 'translateY(4px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}, ${overg}`, color: vist ? farge : svak }}>{vist || tom}</span>
  );
}

const gyldigPos = (p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng));

export default function BoligPanel({ adresse, postal, city, pos, sikt, modell, selskap, kontakt, kompakt = false, ferdig = false }) {
  const ref = useRef(null);
  const [bilde, setBilde] = useState(null);
  const [bildeKlar, setBildeKlar] = useState(false);
  const [kartKlar, setKartKlar] = useState(false);
  const [landetTid, setLandetTid] = useState(0);   // kameraet landet på bekreftet posisjon
  const [avslor, setAvslor] = useState(false);     // morph kart → foto i gang
  const [rolig, setRolig] = useState(false);       // etter morphen: fotoet driver langsomt
  const sisteNokkel = useRef('');
  const bildeKlarTid = useRef(0);
  const harPosRef = useRef(false);

  /* Street View for bekreftet posisjon. Stille feil → kartet blir stående. */
  useEffect(() => {
    const lat = Number(pos?.lat); const lng = Number(pos?.lng);
    setLandetTid(0);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setBilde(null); setBildeKlar(false); sisteNokkel.current = ''; return undefined; }
    const nokkel = `${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (nokkel === sisteNokkel.current) return undefined;
    sisteNokkel.current = nokkel;
    let avbrutt = false;
    setBildeKlar(false);
    (async () => {
      try {
        const q = encodeURIComponent([adresse, city].filter(Boolean).join(', '));
        const m = await fetch(`/api/streetview/meta?lat=${lat}&lng=${lng}&q=${q}`).then((r) => r.json()).catch(() => null);
        if (avbrutt) return;
        if (m && m.ok) {
          const el = ref.current;
          const W = el?.offsetWidth || 600;
          const H = el?.offsetHeight || 800;
          const h = kompakt ? 500 : 1000;
          const w = Math.min(1600, Math.max(400, Math.round((h * W) / H)));
          const url = `/api/streetview?lat=${lat}&lng=${lng}&q=${q}&w=${w}&h=${h}&fov=${kompakt ? 80 : 72}&pitch=12`;
          const ok = await new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = url; });
          if (avbrutt) return;
          if (ok) { setBilde(url); return; }
        }
        setBilde(null);
      } catch (e) { if (!avbrutt) setBilde(null); }
    })();
    return () => { avbrutt = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng]);

  const harPos = gyldigPos(pos);
  harPosRef.current = harPos;
  const harSikt = !harPos && gyldigPos(sikt);
  const mal = harPos ? { lat: Number(pos.lat), lng: Number(pos.lng) } : harSikt ? { lat: Number(sikt.lat), lng: Number(sikt.lng) } : null;

  /* Morph-timing: fotoet slippes HOLD ms etter at kameraet landet — eller etter fallback hvis kartet aldri kom. */
  useEffect(() => {
    if (!bildeKlar || !harPos) { setAvslor(false); setRolig(false); return undefined; }
    const naa = performance.now();
    const vent = landetTid
      ? Math.max(0, landetTid + HOLD_ETTER_LANDING - naa)
      : Math.max(0, bildeKlarTid.current + (kartKlar ? FALLBACK_UTEN_LANDING : FALLBACK_UTEN_KART) - naa);
    const t = window.setTimeout(() => setAvslor(true), vent);
    return () => window.clearTimeout(t);
  }, [bildeKlar, landetTid, kartKlar, harPos]);
  useEffect(() => {
    if (!avslor) return undefined;
    const t = window.setTimeout(() => setRolig(true), 1500);
    return () => window.clearTimeout(t);
  }, [avslor]);

  const morkt = avslor;
  const gate = (() => {
    let g = String(adresse || '').trim();
    for (const suffiks of [`, ${postal} ${city}`, `, ${city}`]) {
      if (city && g.toLowerCase().endsWith(suffiks.toLowerCase())) { g = g.slice(0, -suffiks.length); break; }
    }
    return g;
  })();
  const sted = [postal, city].filter(Boolean).join(' ');
  const harCaption = harPos || harSikt;
  const tittel = harPos ? (gate || 'Din bolig') : (sikt?.text || 'Din bolig');
  const under = harPos ? sted : (sikt?.sub || '');
  const modellTekst = modell === 'selvforvaltning' ? 'Lei ut selv' : modell === 'full_forvaltning' ? 'Full forvaltning' : '';

  const fg = morkt ? OFF : T.ink;
  const fgSvak = morkt ? 'rgba(244,241,234,0.72)' : 'rgba(21,19,15,0.62)';
  const fgDim = morkt ? 'rgba(244,241,234,0.55)' : 'rgba(21,19,15,0.5)';
  const fgTom = morkt ? 'rgba(244,241,234,0.30)' : 'rgba(21,19,15,0.28)';
  const haar = morkt ? 'rgba(244,241,234,0.14)' : 'rgba(21,19,15,0.12)';
  const fargeOverg = `color 700ms ${EASE} 450ms`;

  const kart = (
    <div
      className="absolute inset-0 will-change-transform"
      style={{ opacity: avslor ? 0 : 1, transform: avslor ? 'scale(1.28)' : 'scale(1)', transformOrigin: '50% 50%', transition: `opacity 1400ms ${EASE}, transform ${avslor ? `1400ms ${EASE}` : `900ms ${EASE}`}` }}
      data-testid="start-kart"
    >
      <BoligKart mal={mal} zoom={harPos ? 17 : 15} onKlar={() => setKartKlar(true)} onLandet={() => { if (harPosRef.current) setLandetTid(performance.now()); }} />
    </div>
  );
  const foto = bilde ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bilde}
      alt=""
      onLoad={() => { bildeKlarTid.current = performance.now(); setBildeKlar(true); }}
      className="absolute inset-0 h-full w-full object-cover will-change-transform"
      style={{
        opacity: avslor ? 1 : 0,
        transform: avslor ? (rolig ? 'scale(1)' : 'scale(1.03)') : 'scale(1.12)',
        transition: rolig ? `opacity 1400ms ${EASE}, transform 22000ms linear` : `opacity 1400ms ${EASE}, transform 1400ms ${EASE}`,
        filter: 'saturate(0.9) contrast(0.97)',
      }}
    />
  ) : null;

  /* ── Kompakt (mobil): kart/foto + caption ── */
  if (kompakt) {
    return (
      <div ref={ref} className="relative overflow-hidden rounded-[16px]" style={{ height: 132, background: morkt ? T.charcoal : T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', transition: `background 700ms ${EASE}` }} data-testid="start-boligpanel">
        {kart}
        {foto}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: morkt
          ? 'linear-gradient(180deg, rgba(21,18,15,0.62) 0%, rgba(21,18,15,0.10) 45%, rgba(21,18,15,0.35) 100%)'
          : 'linear-gradient(180deg, rgba(243,241,236,0.92) 0%, rgba(243,241,236,0.2) 55%, rgba(243,241,236,0) 100%)', transition: `background 700ms ${EASE}` }} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4" style={{ color: fg, opacity: harCaption ? 1 : 0, transition: `${fargeOverg}, opacity 400ms ${EASE}` }}>
          <div className="min-w-0">
            <p className="truncate text-[19px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'nowrap' }} data-testid="start-panel-adresse">{tittel}</p>
            <p className="mt-0.5 text-[13px]" style={{ color: fgSvak, transition: fargeOverg }}>{under || '\u00a0'}</p>
          </div>
          {modellTekst ? <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: morkt ? 'rgba(244,241,234,0.14)' : 'rgba(21,19,15,0.08)', color: fg, transition: fargeOverg }}>{modellTekst}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[24px]"
      style={{ height: '100%', minHeight: 520, background: morkt ? T.charcoal : T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', transition: `background 900ms ${EASE}` }}
      data-testid="start-boligpanel"
    >
      {/* ── Kartet: scenen fra sekund én ── */}
      {kart}

      {/* ── Bygget ditt: Street View, sluppet når kartet har landet ── */}
      {foto}

      {/* Vignett: topp for caption, bunn for kvitteringen. Lys på kart, varm mørk på foto. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: morkt
        ? 'linear-gradient(180deg, rgba(21,18,15,0.66) 0%, rgba(21,18,15,0.12) 32%, rgba(21,18,15,0.06) 55%, rgba(21,18,15,0.84) 100%)'
        : 'linear-gradient(180deg, rgba(243,241,236,0.94) 0%, rgba(243,241,236,0) 24%, rgba(243,241,236,0) 56%, rgba(243,241,236,0.97) 100%)', transition: `background 900ms ${EASE}` }} />

      {/* Caption — kommer med første forslag */}
      <div className="absolute inset-x-0 top-0 p-6 lg:p-7" style={{ color: fg, opacity: harCaption ? 1 : 0, transform: harCaption ? 'none' : 'translateY(-6px)', transition: `${fargeOverg}, opacity 500ms ${EASE}, transform 500ms ${EASE}` }} aria-hidden={!harCaption}>
        <p className="truncate text-[24px] lg:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'nowrap' }} data-testid="start-panel-adresse">{tittel}</p>
        <p className="mt-1 flex items-center gap-2 text-[13px]" style={{ color: fgSvak, transition: fargeOverg }}>
          {under || '\u00a0'}
          {avslor ? <span className="inline-flex items-center gap-1" style={{ color: fgDim }}><span aria-hidden="true">·</span><Check className="h-3 w-3" strokeWidth={2.4} /> Boligen er funnet</span>
            : harSikt ? <span className="inline-flex items-center gap-1" style={{ color: fgDim }}><span aria-hidden="true">·</span>Forslag</span> : null}
        </p>
      </div>

      {/* Kvittering — de tre stegene, som fylles inn */}
      <dl className="absolute inset-x-0 bottom-0 p-6 lg:p-7" style={{ color: fg, transition: fargeOverg }} data-testid="start-kvittering">
        {[
          { k: 'Bolig', v: harPos && gate ? `${gate}${sted ? ` · ${sted}` : ''}` : '' },
          ...(selskap !== undefined ? [{ k: 'Selskap', v: selskap || '' }] : []),
          { k: 'Modell', v: modellTekst },
          { k: 'Kontakt', v: kontakt || '' },
        ].map((r, i) => (
          <div key={r.k} className={`flex items-baseline justify-between gap-6 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: haar, transition: `border-color 700ms ${EASE} 450ms` }}>
            <dt className="text-[13px]" style={{ color: fgDim, transition: fargeOverg }}>{r.k}</dt>
            <dd className="min-w-0 text-right text-[14.5px] font-medium"><Verdi v={r.v} farge={fg} svak={fgTom} overg={fargeOverg} /></dd>
          </div>
        ))}
        {ferdig ? (
          <div className="mt-4 flex items-center gap-2 text-[13px]" style={{ color: fgSvak }}><Check className="h-3.5 w-3.5" style={{ color: T.gronn }} strokeWidth={2.4} /> Registrert</div>
        ) : null}
      </dl>
    </div>
  );
}
