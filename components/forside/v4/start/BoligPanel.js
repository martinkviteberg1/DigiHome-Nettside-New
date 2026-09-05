'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import AdresseKart from '@/components/dh/AdresseKart';
import { EASE, T, display } from '../motion';

/* ---------------------------------------------------------------------------
   BoligPanel — «boligen din er scenen». Høyre kolonne på desktop, en stripe
   over stegene på mobil.

   Tre tilstander, én flate:
   · TOM (før adresse): papir. Setter forventning — tre steg, under ett
     minutt, ingenting sendes før du sier ja. Panelet har en jobb fra sekund én.
   · BOLIG: bygget ditt via Street View-proxyen (samme som heroen). Bildet
     lever — langsom drift inn over 18 s, aldri loop. Finnes ikke panorama
     nært nok → kartet (AdresseKart, live Google Maps — ingen filter over det).
   · Kvitteringen nederst fylles ut mens du svarer: Bolig · Modell · Kontakt.
     Radene har fast plass; verdiene glir inn. Ingenting hopper.
--------------------------------------------------------------------------- */

const OFF = '#F4F1EA';
const PAPIR = '#FBFAF8';

const SLIK = [
  { n: '1', t: 'Adressen', d: 'Vi finner boligen og viser den her.' },
  { n: '2', t: 'Hvordan du vil leie ut', d: 'Selv — eller med fast forvalter.' },
  { n: '3', t: 'Hvem du er', d: 'Navn, e-post og telefon. Det er alt.' },
];

/* Én kvitteringsverdi. Glir inn når den settes, uten å endre radens høyde. */
function Verdi({ v, tom = '—' }) {
  const [vist, setVist] = useState(v);
  const [inn, setInn] = useState(true);
  useEffect(() => {
    if (v === vist) return undefined;
    setInn(false);
    const t = window.setTimeout(() => { setVist(v); setInn(true); }, 180);
    return () => window.clearTimeout(t);
  }, [v, vist]);
  return (
    <span className="inline-block max-w-full truncate align-bottom" style={{ opacity: inn ? 1 : 0, transform: inn ? 'none' : 'translateY(4px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}`, color: vist ? OFF : 'rgba(244,241,234,0.30)' }}>{vist || tom}</span>
  );
}

export default function BoligPanel({ adresse, postal, city, pos, modell, selskap, kontakt, kompakt = false, ferdig = false }) {
  const ref = useRef(null);
  const [bilde, setBilde] = useState(null);
  const [bildeKlar, setBildeKlar] = useState(false);
  const [sjekket, setSjekket] = useState(false);
  const sisteNokkel = useRef('');

  useEffect(() => {
    const lat = Number(pos?.lat); const lng = Number(pos?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setBilde(null); setBildeKlar(false); setSjekket(false); sisteNokkel.current = ''; return undefined; }
    const nokkel = `${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (nokkel === sisteNokkel.current) return undefined;
    sisteNokkel.current = nokkel;
    let avbrutt = false;
    setBildeKlar(false);
    setSjekket(false);
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
          if (ok) { setBilde(url); setSjekket(true); return; }
        }
        setBilde(null); setSjekket(true);
      } catch (e) { if (!avbrutt) { setBilde(null); setSjekket(true); } }
    })();
    return () => { avbrutt = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng]);

  const harPos = Number.isFinite(Number(pos?.lat)) && Number.isFinite(Number(pos?.lng));
  const visKart = harPos && sjekket && !bilde;
  const gate = (() => {
    let g = String(adresse || '').trim();
    for (const suffiks of [`, ${postal} ${city}`, `, ${city}`]) {
      if (city && g.toLowerCase().endsWith(suffiks.toLowerCase())) { g = g.slice(0, -suffiks.length); break; }
    }
    return g;
  })();
  const sted = [postal, city].filter(Boolean).join(' ');
  const tom = !gate && !harPos;
  const modellTekst = modell === 'selvforvaltning' ? 'Lei ut selv' : modell === 'full_forvaltning' ? 'Full forvaltning' : '';

  /* ── Kompakt (mobil): bilde + caption ── */
  if (kompakt) {
    return (
      <div ref={ref} className="relative overflow-hidden rounded-[16px]" style={{ height: 132, background: T.charcoal, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)' }} data-testid="start-boligpanel">
        {bilde ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bilde} alt="" onLoad={() => setBildeKlar(true)} className="absolute inset-0 h-full w-full object-cover" style={{ opacity: bildeKlar ? 1 : 0, transition: `opacity 700ms ${EASE}`, filter: 'saturate(0.9) contrast(0.97)' }} />
        ) : null}
        {visKart ? <div className="absolute inset-0"><AdresseKart pos={pos} tekst={adresse} adresse={adresse} /></div> : null}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.62) 0%, rgba(21,18,15,0.10) 45%, rgba(21,18,15,0.35) 100%)' }} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4" style={{ color: OFF }}>
          <div className="min-w-0">
            <p className="truncate text-[19px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'nowrap' }} data-testid="start-panel-adresse">{gate || 'Din bolig'}</p>
            <p className="mt-0.5 text-[13px]" style={{ color: 'rgba(244,241,234,0.72)' }}>{sted || '\u00a0'}</p>
          </div>
          {modellTekst ? <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: 'rgba(244,241,234,0.14)', color: OFF }}>{modellTekst}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[24px]"
      style={{ height: '100%', minHeight: 520, background: tom ? PAPIR : T.charcoal, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)', transition: `background 500ms ${EASE}` }}
      data-testid="start-boligpanel"
    >
      {/* ── TOM: slik fungerer det ── */}
      <div className="absolute inset-0 flex flex-col justify-between p-7 lg:p-8" style={{ color: T.ink, opacity: tom ? 1 : 0, transform: tom ? 'none' : 'translateY(-6px)', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}`, pointerEvents: tom ? 'auto' : 'none' }} aria-hidden={!tom} data-testid="start-panel-tom">
        <div>
          <p className="text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }}>Under ett minutt</p>
          <h2 className="mt-3 text-[34px] lg:text-[40px]" style={{ ...display, color: T.ink, maxWidth: '12ch' }}>Tre steg. Ingen forpliktelse.</h2>
          <ol className="mt-9 flex flex-col">
            {SLIK.map((s, i) => (
              <li key={s.n} className={`flex items-baseline gap-5 py-4 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'rgba(21,19,15,0.08)' }}>
                <span className="w-5 shrink-0 text-[13px] tabular-nums" style={{ color: 'rgba(21,19,15,0.4)' }}>{s.n}</span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-medium" style={{ color: T.ink }}>{s.t}</span>
                  <span className="mt-0.5 block text-[14px]" style={{ color: 'rgba(21,19,15,0.6)' }}>{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[13.5px]" style={{ color: 'rgba(21,19,15,0.5)' }}>Ingenting sendes før du sier ja. Adressen brukes bare til å finne boligen.</p>
      </div>

      {/* ── BOLIG: bildet lever ── */}
      {bilde ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bilde}
          alt=""
          onLoad={() => setBildeKlar(true)}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{ opacity: bildeKlar ? 1 : 0, transform: bildeKlar ? 'scale(1)' : 'scale(1.06)', transition: `opacity 800ms ${EASE}, transform 18000ms linear`, filter: 'saturate(0.9) contrast(0.97)' }}
        />
      ) : null}
      {visKart ? (
        <div className="absolute inset-0" data-testid="start-kart"><AdresseKart pos={pos} tekst={adresse} adresse={adresse} /></div>
      ) : null}
      {!tom ? (
        <>
          {/* Varm vignett: topp for caption, bunn for kvitteringen. Kartet får bare en lett kant. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: visKart
            ? 'linear-gradient(180deg, rgba(21,18,15,0.55) 0%, rgba(21,18,15,0) 26%, rgba(21,18,15,0) 60%, rgba(21,18,15,0.78) 100%)'
            : 'linear-gradient(180deg, rgba(21,18,15,0.66) 0%, rgba(21,18,15,0.12) 32%, rgba(21,18,15,0.06) 55%, rgba(21,18,15,0.84) 100%)' }} />

          {/* Caption */}
          <div className="absolute inset-x-0 top-0 p-6 lg:p-7" style={{ color: OFF, opacity: gate ? 1 : 0, transition: `opacity 500ms ${EASE} 150ms` }}>
            <p className="truncate text-[24px] lg:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'nowrap' }} data-testid="start-panel-adresse">{gate || 'Din bolig'}</p>
            <p className="mt-1 flex items-center gap-2 text-[13px]" style={{ color: 'rgba(244,241,234,0.72)' }}>
              {sted || '\u00a0'}
              {bildeKlar ? <span className="inline-flex items-center gap-1" style={{ color: 'rgba(244,241,234,0.6)' }}><span aria-hidden="true">·</span><Check className="h-3 w-3" strokeWidth={2.4} /> Boligen er funnet</span> : null}
            </p>
          </div>

          {/* Kvittering */}
          <dl className="absolute inset-x-0 bottom-0 p-6 lg:p-7" style={{ color: OFF }} data-testid="start-kvittering">
            {[
              { k: 'Bolig', v: gate ? `${gate}${sted ? ` · ${sted}` : ''}` : '' },
              ...(selskap !== undefined ? [{ k: 'Selskap', v: selskap || '' }] : []),
              { k: 'Modell', v: modellTekst },
              { k: 'Kontakt', v: kontakt || '' },
            ].map((r, i) => (
              <div key={r.k} className={`flex items-baseline justify-between gap-6 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'rgba(244,241,234,0.14)' }}>
                <dt className="text-[13px]" style={{ color: 'rgba(244,241,234,0.55)' }}>{r.k}</dt>
                <dd className="min-w-0 text-right text-[14.5px] font-medium"><Verdi v={r.v} /></dd>
              </div>
            ))}
            {ferdig ? (
              <div className="mt-4 flex items-center gap-2 text-[13px]" style={{ color: 'rgba(244,241,234,0.7)' }}><Check className="h-3.5 w-3.5 text-[#5FCB8A]" strokeWidth={2.4} /> Registrert</div>
            ) : null}
          </dl>
        </>
      ) : null}
    </div>
  );
}
