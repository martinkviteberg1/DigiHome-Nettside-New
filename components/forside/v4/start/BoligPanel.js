'use client';

import React, { useEffect, useRef, useState } from 'react';
import AdresseKart from '@/components/dh/AdresseKart';
import { EASE, T, display } from '../motion';

/* ---------------------------------------------------------------------------
   BoligPanel — «boligen din er scenen». Høyre kolonne på desktop, en stripe
   over stegene på mobil.

   · Uten adresse: rolig tom tilstand (én setning).
   · Med koordinater: bygget ditt via Street View-proxyen (samme som heroen).
     Finnes ikke panorama nært nok → kartet (AdresseKart, live Google Maps —
     ingen filter over det).
   · Nederst: kvitteringen. Radene fylles ut etter hvert som du svarer:
     Bolig · Modell · Kontakt. Ingenting hopper — radene har fast plass.
--------------------------------------------------------------------------- */

const OFF = '#F4F1EA';

export default function BoligPanel({ adresse, postal, city, pos, modell, kontakt, kompakt = false }) {
  const ref = useRef(null);
  const [bilde, setBilde] = useState(null);       // Street View-URL
  const [bildeKlar, setBildeKlar] = useState(false);
  const [sjekket, setSjekket] = useState(false);   // meta sjekket for denne posisjonen
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
          const h = Math.min(1000, Math.max(500, Math.round(kompakt ? 500 : 1000)));
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

  const rader = [
    { k: 'Bolig', v: gate ? `${gate}${sted ? ` · ${sted}` : ''}` : '' },
    { k: 'Modell', v: modell === 'selvforvaltning' ? 'Lei ut selv' : modell === 'full_forvaltning' ? 'Full forvaltning' : '' },
    { k: 'Kontakt', v: kontakt || '' },
  ];

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${kompakt ? 'rounded-[16px]' : 'rounded-[24px]'}`}
      style={{ background: T.charcoal, height: kompakt ? 132 : '100%', minHeight: kompakt ? 132 : 520, boxShadow: '0 0 0 1px rgba(21,19,15,0.08)' }}
      data-testid="start-boligpanel"
    >
      {/* Bilde / kart */}
      {bilde ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bilde} alt="" onLoad={() => setBildeKlar(true)} className="absolute inset-0 h-full w-full object-cover" style={{ opacity: bildeKlar ? 1 : 0, transform: bildeKlar ? 'scale(1)' : 'scale(1.03)', transition: `opacity 700ms ${EASE}, transform 1400ms ${EASE}`, filter: 'saturate(0.9) contrast(0.97)' }} />
      ) : null}
      {visKart ? (
        <div className="absolute inset-0" data-testid="start-kart"><AdresseKart pos={pos} tekst={adresse} adresse={adresse} /></div>
      ) : null}
      {/* Vignett: topp for caption, bunn for kvitteringen. Kartet får bare en lett kant. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: visKart
        ? 'linear-gradient(180deg, rgba(21,18,15,0.55) 0%, rgba(21,18,15,0) 26%, rgba(21,18,15,0) 60%, rgba(21,18,15,0.78) 100%)'
        : 'linear-gradient(180deg, rgba(21,18,15,0.62) 0%, rgba(21,18,15,0.10) 30%, rgba(21,18,15,0.05) 55%, rgba(21,18,15,0.82) 100%)' }} />

      {/* Caption */}
      <div className={`absolute inset-x-0 top-0 ${kompakt ? 'p-4' : 'p-6 lg:p-7'}`} style={{ color: OFF }}>
        <p className={`truncate ${kompakt ? 'text-[19px]' : 'text-[24px] lg:text-[28px]'}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, textWrap: 'nowrap' }} data-testid="start-panel-adresse">{gate || 'Din bolig'}</p>
        <p className="mt-1 text-[13px]" style={{ color: 'rgba(244,241,234,0.72)' }}>{gate ? (sted || '\u00a0') : 'Skriv inn adressen — så viser vi bygget ditt her.'}</p>
      </div>

      {/* Kvittering — kun i full størrelse */}
      {!kompakt ? (
        <dl className="absolute inset-x-0 bottom-0 p-6 lg:p-7" style={{ color: OFF }} data-testid="start-kvittering">
          {rader.map((r, i) => (
            <div key={r.k} className={`flex items-baseline justify-between gap-6 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'rgba(244,241,234,0.14)' }}>
              <dt className="text-[13px]" style={{ color: 'rgba(244,241,234,0.55)' }}>{r.k}</dt>
              <dd className="min-w-0 truncate text-right text-[14.5px] font-medium" style={{ color: r.v ? OFF : 'rgba(244,241,234,0.30)', transition: `color 400ms ${EASE}` }}>{r.v || '—'}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
