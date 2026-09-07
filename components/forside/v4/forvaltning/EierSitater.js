'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, useRedusert, useSynlig } from '../motion';
import { testimonials } from '@/lib/site';

/* ---------------------------------------------------------------------------
   EierSitater — «Fra eierne» på /forvaltning.

   Ett sitat om gangen, stort, i display — som et oppslag, ikke tre kort på
   rad. Sitatene bytter selv (7 s) når seksjonen er synlig; navnene under er
   både innholdsfortegnelse og fremdrift (lilla hårlinje som fyller).
   Kilden er `testimonials` i lib/site.js — én sannhet for hele nettstedet.

   Kun opacity/transform. prefers-reduced-motion → ingen autobytte.
--------------------------------------------------------------------------- */

const MS = 7000;

const SITATER = (testimonials || []).map((t) => {
  const [rolle, ...sted] = String(t.role || '').split(',').map((s) => s.trim());
  return { navn: t.name, rolle: rolle || 'Eiendomseier', sted: sted.join(', '), tekst: t.quote };
});

export default function EierSitater() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.3);
  const redusert = useRedusert();
  const [i, setI] = useState(0);
  const [runde, setRunde] = useState(0); // nøkkel for fremdriftslinjen — starter på nytt ved bytte
  const n = SITATER.length;

  useEffect(() => {
    if (!synlig || redusert || n < 2) return undefined;
    const t = window.setTimeout(() => { setI((v) => (v + 1) % n); setRunde((r) => r + 1); }, MS);
    return () => window.clearTimeout(t);
  }, [i, runde, synlig, redusert, n]);

  // Når seksjonen blir synlig, start fremdriften fra null
  useEffect(() => { if (synlig) setRunde((r) => r + 1); }, [synlig]);

  const velg = (k) => { setI(k); setRunde((r) => r + 1); };

  if (!n) return null;

  return (
    <section id="eierne" ref={ref} className="relative overflow-hidden" style={{ background: T.charcoal, color: T.offwhite }} data-testid="v4f-eiere">
      {/* Samme stille spotlys som heroen — statisk */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 70% at 22% 40%, rgba(212,150,255,0.10) 0%, rgba(212,150,255,0.03) 45%, rgba(212,150,255,0) 75%)' }} />
      <div className="relative mx-auto w-full max-w-[1360px] px-5 pb-20 pt-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-28">
        <div className="flex items-baseline justify-between gap-6">
          <p className="text-[14px] font-medium" style={{ color: 'rgba(244,241,234,0.55)' }} data-testid="v4f-eiere-label">Fra eierne · Bergen</p>
          <p className="text-[13px] tabular-nums" style={{ color: 'rgba(244,241,234,0.45)' }} aria-hidden="true" data-testid="v4f-eiere-teller">
            <span style={{ color: T.offwhite }}>{String(i + 1).padStart(2, '0')}</span> / {String(n).padStart(2, '0')}
          </p>
        </div>

        {/* Sitatene ligger i samme rutenettcelle — ingen høydehopp, ekte krysstoning */}
        <div className="mt-10 grid lg:mt-14" data-testid="v4f-eiere-sitater">
          {SITATER.map((s, k) => {
            const er = k === i;
            return (
              <blockquote
                key={s.navn}
                aria-hidden={!er}
                className="lg:max-w-[1040px]"
                style={{ gridArea: '1 / 1', opacity: er ? 1 : 0, transform: er ? 'none' : 'translateY(14px)', transition: `opacity 720ms ${EASE}, transform 900ms ${EASE}`, pointerEvents: er ? 'auto' : 'none' }}
                data-testid={`v4f-eiere-sitat-${k}`}
                data-aktiv={er ? 'true' : 'false'}
              >
                <p className="text-[30px] sm:text-[40px] lg:text-[clamp(40px,3.6vw,60px)]" style={{ ...display, lineHeight: 1.06, letterSpacing: '-0.03em', color: T.offwhite }}>
                  <span aria-hidden="true" style={{ color: T.lilla }}>“</span>{s.tekst}<span aria-hidden="true" style={{ color: T.lilla }}>”</span>
                </p>
                <footer className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[17px] font-medium" style={{ color: T.offwhite }}>{s.navn}</span>
                  <span className="text-[14.5px]" style={{ color: 'rgba(244,241,234,0.55)' }}>{s.rolle}{s.sted ? ` · ${s.sted}` : ''}</span>
                </footer>
              </blockquote>
            );
          })}
        </div>

        {/* Navnene: innholdsfortegnelse + fremdrift */}
        <ol className="mt-14 grid gap-5 lg:mt-20 lg:gap-8" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} data-testid="v4f-eiere-navn">
          {SITATER.map((s, k) => {
            const er = k === i;
            return (
              <li key={s.navn}>
                <button
                  type="button"
                  onClick={() => velg(k)}
                  aria-pressed={er}
                  aria-label={`Vis sitat fra ${s.navn}`}
                  className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  data-testid={`v4f-eiere-velg-${k}`}
                >
                  <span className="block h-px w-full overflow-hidden" style={{ background: 'rgba(244,241,234,0.16)' }}>
                    {er ? (
                      <span
                        key={runde}
                        className="block h-full w-full origin-left"
                        style={redusert || !synlig || n < 2
                          ? { background: T.lilla }
                          : { background: T.lilla, animation: `v4fyll ${MS}ms linear forwards` }}
                      />
                    ) : null}
                  </span>
                  <span className="mt-4 block text-[15px] font-medium transition-colors duration-300" style={{ color: er ? T.offwhite : 'rgba(244,241,234,0.5)' }}>{s.navn}</span>
                  <span className="mt-0.5 hidden text-[13px] sm:block" style={{ color: 'rgba(244,241,234,0.42)' }}>{s.sted || s.rolle}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
