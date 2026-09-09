'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   LosningFilm — Løsningen-sliden: forsidens produktanimasjon, LIKT SOM PÅ FRAMSIDEN.

   Høyre side: forsidens framede produktfilm i den hvite rammen — nøyaktig som på
   forsiden — som STARTER MED ADRESSE-STEGET (Annonse) og går videre gjennom
   Kontrakt · Drift · Økonomi. Venstre side: rolig investor-tekst + en levende
   steg-pipeline som lyser og fylles i takt med filmen. Ett system, ikke to kolonner.

   Styrt av DECKET (ikke skroll):
   · `aktiv` (slide fremme) er avspillingsporten — klokken går kun når sliden er
     fremme og PAUSER ellers (ytelse). Filmene lastes/monteres først ved besøk.
   · Stegene spiller videre av seg selv og looper; klikk et steg for å hoppe.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { T, display, EASE, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';

const AnnonseFilm = dynamic(() => import('@/components/forside/v4/produkt/AnnonseFilm'), { ssr: false });
const KontraktFilm = dynamic(() => import('@/components/forside/v4/produkt/KontraktFilm'), { ssr: false });
const DriftFilm = dynamic(() => import('@/components/forside/v4/produkt/DriftFilm'), { ssr: false });
const OkonomiFilm = dynamic(() => import('@/components/forside/v4/produkt/OkonomiFilm'), { ssr: false });

const LAST = {
  annonse: () => import('@/components/forside/v4/produkt/AnnonseFilm'),
  kontrakt: () => import('@/components/forside/v4/produkt/KontraktFilm'),
  drift: () => import('@/components/forside/v4/produkt/DriftFilm'),
  okonomi: () => import('@/components/forside/v4/produkt/OkonomiFilm'),
};

const LILLA_M = '#7A3FA8';
const CANVAS = '#F3F1EC';

const STEG = [
  { id: 'annonse', navn: 'Annonse', desc: 'Adressen inn — annonsen skriver seg selv, legges ut på FINN, og visninger bookes av seg selv.' },
  { id: 'kontrakt', navn: 'Kontrakt', desc: 'Kontrakt og depositum signeres med BankID. Overtakelsen dokumenteres i en protokoll.' },
  { id: 'drift', navn: 'Drift', desc: 'Leietaker melder fra i chatten. Håndverker foreslår tid og pris — du godkjenner med ett trykk.' },
  { id: 'okonomi', navn: 'Økonomi', desc: 'Husleien kommer inn, purringer går på Vipps, og alt bokføres av seg selv.' },
];
const REKKE = STEG.map((s) => s.id);

export default function LosningFilm({ aktiv = false, nr = 3 }) {
  const [tent, setTent] = useState(false);
  const [valgt, setValgt] = useState('annonse');   // STARTER alltid på adresse-steget
  const [bytter, setBytter] = useState(false);
  const [holdH, setHoldH] = useState(null);
  const [frem, setFrem] = useState({ andel: 0, ms: 0 });
  const byttRef = useRef(0);
  const sceneRef = useRef(null);

  useEffect(() => { if (aktiv) setTent(true); }, [aktiv]);
  useEffect(() => {
    if (!tent) return undefined;
    const t = window.setTimeout(() => { REKKE.forEach((id) => LAST[id]?.().catch(() => {})); }, 600);
    return () => window.clearTimeout(t);
  }, [tent]);

  const idx = REKKE.indexOf(valgt);
  const nesteId = REKKE[(idx + 1) % REKKE.length];
  const nesteNavn = STEG.find((s) => s.id === nesteId)?.navn || null;
  const aktivSteg = STEG[idx] || STEG[0];

  const onFremdrift = useCallback((f) => setFrem(f), []);
  useEffect(() => { setFrem({ andel: 0, ms: 0 }); }, [valgt]);

  const slippH = (tok) => {
    const el = sceneRef.current; const barn = el?.firstElementChild;
    if (!el || !barn) { setHoldH(null); return; }
    setHoldH(barn.offsetHeight);
    window.setTimeout(() => { if (byttRef.current === tok) setHoldH(null); }, 450);
  };
  const gaaTil = (id, ut) => {
    const el = sceneRef.current; if (el) setHoldH(el.offsetHeight);
    setBytter(true);
    const tok = byttRef.current + 1; byttRef.current = tok;
    window.setTimeout(() => {
      if (byttRef.current !== tok) return;
      setValgt(id); setBytter(false);
      window.setTimeout(() => { if (byttRef.current === tok) slippH(tok); }, 700);
    }, ut);
  };
  const videre = useCallback(() => { gaaTil(nesteId, 300); return true; }, [nesteId]); // eslint-disable-line react-hooks/exhaustive-deps
  const bytt = (id) => { if (id !== valgt) gaaTil(id, 260); };

  const filmProps = { synlig: aktiv, spiller: aktiv, tema: 'lys', onFerdig: videre, onFremdrift, neste: nesteNavn };
  const andel = Math.max(0, Math.min(100, Math.round((frem.andel || 0) * 1000) / 10));

  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14" data-testid="deck-losning-film" data-tent={tent ? '1' : '0'} data-kapittel={valgt}>
      {/* VENSTRE — levende stegindeks */}
      <div className="lg:col-span-5">
        <div className="deck-inn flex items-center gap-3" style={{ '--i': 0 }}>
          <span className="text-[11px] font-semibold tabular-nums tracking-[0.12em]" style={{ color: LILLA_M }}>{String(nr).padStart(2, '0')}</span>
          <span aria-hidden="true" className="h-px w-7" style={{ background: 'linear-gradient(90deg, rgba(122,63,168,0.5), rgba(122,63,168,0))' }} />
          <span className="text-[12.5px] font-medium tracking-[0.01em]" style={{ color: SVAK }}>Løsningen<span style={{ color: 'rgba(21,19,15,0.35)' }}> · med autopilot</span></span>
        </div>

        <h2 className="deck-inn mt-5 text-[36px] sm:text-[48px] lg:text-[54px]" style={{ ...display, color: T.ink, maxWidth: '14ch', '--i': 1 }}>
          <span className="deck-ord mr-[0.24em]" style={{ '--o': 0 }}>Boligdrift</span>
          <span className="deck-ord mr-[0.24em]" style={{ '--o': 1 }}>på</span>
          <span className="deck-ord" style={{ '--o': 2 }}>autopilot<span style={{ color: LILLA_M }}>.</span></span>
        </h2>

        <p className="deck-inn mt-5 text-[15px] leading-[1.55] sm:text-[16px]" style={{ color: DIM, maxWidth: '40ch', '--i': 2 }}>
          Ett AI-drevet system samler hele driften. Eieren godkjenner kun det som betyr noe.
        </p>

        {/* Stegindeks — pipeline-skinne + fire steg. Aktivt lyser og navigerer filmen. */}
        <div className="deck-inn relative mt-7 lg:mt-8" style={{ '--i': 3 }} role="tablist" aria-label="Driftsstegene">
          <span aria-hidden="true" className="absolute w-px" style={{ left: 12, top: 20, bottom: 20, background: HAIR }} />
          <span aria-hidden="true" className="absolute w-px" style={{ left: 12, top: 20, height: `calc((100% - 40px) * ${idx} / ${STEG.length - 1})`, background: `linear-gradient(180deg, ${LILLA_M}, rgba(122,63,168,0.35))`, transition: `height 520ms ${EASE}` }} />
          <ol>
            {STEG.map((s, i) => {
              const er = s.id === valgt;
              const forbi = i < idx;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={er}
                    onClick={() => bytt(s.id)}
                    className="group flex w-full items-center gap-4 py-2 text-left focus-visible:outline-none lg:py-2.5"
                    data-testid={`deck-losning-steg-${s.id}`}
                    data-aktiv={er ? '1' : '0'}
                  >
                    <span
                      className="relative z-[1] flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-all duration-300"
                      style={er
                        ? { background: LILLA_M, color: '#fff', boxShadow: '0 8px 20px -8px rgba(122,63,168,0.7)' }
                        : { background: CANVAS, color: forbi ? LILLA_M : 'rgba(21,19,15,0.42)', boxShadow: `inset 0 0 0 1px ${forbi ? 'rgba(122,63,168,0.4)' : HAIR}` }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="text-[18px] font-medium tracking-[-0.01em] transition-colors duration-300 lg:text-[21px]"
                      style={{ ...display, letterSpacing: '-0.02em', color: er ? T.ink : 'rgba(21,19,15,0.42)' }}
                    >
                      {s.navn}
                    </span>
                    {er ? <span aria-hidden="true" className="ml-1 h-1.5 w-1.5 rounded-full" style={{ background: LILLA_M, boxShadow: '0 0 0 4px rgba(122,63,168,0.14)' }} /> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Aktivt steg — beskrivelse (kryss­toner) + fremdriftslinje i takt med filmen */}
        <div className="deck-inn mt-5 lg:mt-6" style={{ '--i': 4 }}>
          <div className="min-h-[3.2em] max-w-[40ch]">
            <p key={valgt} className="text-[14px] leading-[1.55] duration-500 animate-in fade-in-0" style={{ color: DIM }}>{aktivSteg.desc}</p>
          </div>
          <div className="mt-3 h-[2px] w-full max-w-[280px] overflow-hidden rounded-full" style={{ background: HAIR }}>
            <div className="h-full rounded-full" style={{ width: `${andel}%`, background: LILLA_M, transition: frem.ms ? `width ${frem.ms}ms linear` : `width 320ms ${EASE}` }} data-testid="deck-losning-fremdrift" />
          </div>
        </div>

        {/* Investor-gevinsten */}
        <div className="deck-inn mt-6 flex items-center gap-2.5 lg:mt-7" style={{ '--i': 5 }}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA_M }}><Sparkles className="h-3.5 w-3.5" strokeWidth={2} /></span>
          <p className="text-[13.5px]" style={{ color: T.ink }}>Skalerer <span className="font-semibold tabular-nums" style={{ color: LILLA_M }}>1&nbsp;→&nbsp;1&nbsp;000</span> enheter — uten nye ansatte.</p>
        </div>
      </div>

      {/* HØYRE — forsidens produkt i den hvite rammen (starter på adresse-steget), lever naturlig på høyre side */}
      <div className="deck-inn relative lg:col-span-7" style={{ '--i': 2 }}>
        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-10" style={{ background: 'radial-gradient(56% 58% at 60% 55%, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0) 70%)' }} />
        <div ref={sceneRef} className="relative w-full" style={{ minHeight: holdH || undefined, transition: `min-height 400ms ${EASE}` }}>
          {tent ? (
            <div key={valgt} className="w-full" style={{ opacity: bytter ? 0 : 1, transform: bytter ? 'translateY(-8px)' : 'none', transition: `opacity 300ms ${EASE}, transform 300ms ${EASE}` }}>
              {valgt === 'annonse' && <AnnonseFilm {...filmProps} />}
              {valgt === 'kontrakt' && <KontraktFilm {...filmProps} />}
              {valgt === 'drift' && <DriftFilm {...filmProps} />}
              {valgt === 'okonomi' && <OkonomiFilm {...filmProps} />}
            </div>
          ) : (
            <div aria-hidden="true" className="mx-auto w-full max-w-[min(1400px,86vw)] rounded-[18px]" style={{ height: 460, background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)' }} />
          )}
        </div>
      </div>
    </div>
  );
}
