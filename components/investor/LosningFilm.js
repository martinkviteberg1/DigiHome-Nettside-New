'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   LosningFilm — Løsningen-sliden som SPLIT: tekst til venstre, animasjon til høyre.

   Venstre halvdel: rolig investor-tekst + levende steg-pipeline (Annonse ·
   Kontrakt · Drift · Økonomi) på deck-lerretet. Høyre halvdel: forsidens
   kino-film som en NYDELIG EDITORIAL flate UTEN hvit ramme — foto/produkt blør
   helt ut til kanten, med filmens egen tittel som editorial helt. En myk skjøt
   toner filmen inn i lerretet der halvdelene møtes.

   Styrt av DECKET (ikke skroll):
   · `aktiv` (slide fremme) er avspillingsporten — klokken går kun når sliden er
     fremme og PAUSER ellers (ytelse). Filmene lastes/monteres først ved besøk.
   · Stegene spiller videre av seg selv og looper; klikk et steg for å hoppe.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { T, display, EASE, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';

const AnnonseKino = dynamic(() => import('@/components/forside/v4/produkt/kino/AnnonseKino'), { ssr: false });
const KontraktKino = dynamic(() => import('@/components/forside/v4/produkt/kino/KontraktKino'), { ssr: false });
const DriftKino = dynamic(() => import('@/components/forside/v4/produkt/kino/DriftKino'), { ssr: false });
const OkonomiKino = dynamic(() => import('@/components/forside/v4/produkt/kino/OkonomiKino'), { ssr: false });

const LAST = {
  annonse: () => import('@/components/forside/v4/produkt/kino/AnnonseKino'),
  kontrakt: () => import('@/components/forside/v4/produkt/kino/KontraktKino'),
  drift: () => import('@/components/forside/v4/produkt/kino/DriftKino'),
  okonomi: () => import('@/components/forside/v4/produkt/kino/OkonomiKino'),
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
  const [valgt, setValgt] = useState('annonse');
  const [bytter, setBytter] = useState(false);
  const [frem, setFrem] = useState({ andel: 0, ms: 0 });
  const byttRef = useRef(0);

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

  const gaaTil = (id, ut) => {
    setBytter(true);
    const tok = byttRef.current + 1; byttRef.current = tok;
    window.setTimeout(() => { if (byttRef.current !== tok) return; setValgt(id); setBytter(false); }, ut);
  };
  const videre = useCallback(() => { gaaTil(nesteId, 340); return true; }, [nesteId]); // eslint-disable-line react-hooks/exhaustive-deps
  const bytt = (id) => { if (id !== valgt) gaaTil(id, 280); };

  const filmProps = { synlig: aktiv, spiller: aktiv, onFerdig: videre, onFremdrift, neste: nesteNavn };
  const andel = Math.max(0, Math.min(100, Math.round((frem.andel || 0) * 1000) / 10));

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="deck-losning-film" data-tent={tent ? '1' : '0'} data-kapittel={valgt}>
      {/* HØYRE — filmen blør helt ut til kanten, uten hvit ramme (mobil: nedre 56%) */}
      <div className="absolute inset-x-0 bottom-0 top-[44%] lg:inset-y-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[54%]" style={{ background: '#0E0D0B' }}>
        {tent ? (
          <div key={valgt} className="absolute inset-0" style={{ opacity: bytter ? 0 : 1, transition: `opacity 420ms ${EASE}` }}>
            {valgt === 'annonse' && <AnnonseKino {...filmProps} />}
            {valgt === 'kontrakt' && <KontraktKino {...filmProps} />}
            {valgt === 'drift' && <DriftKino {...filmProps} />}
            {valgt === 'okonomi' && <OkonomiKino {...filmProps} />}
          </div>
        ) : (
          <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(60% 60% at 55% 46%, rgba(212,150,255,0.14) 0%, rgba(212,150,255,0.03) 44%, rgba(14,12,16,0) 72%), #0E0D0B' }} />
        )}
      </div>

      {/* Myk skjøt — filmen toner inn i lerretet der halvdelene møtes (mobil: over/topp, desktop: venstre kant) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[44%] z-10 h-24 lg:inset-y-0 lg:left-[46%] lg:right-auto lg:top-0 lg:h-full lg:w-24" style={{ background: `linear-gradient(180deg, ${CANVAS} 0%, rgba(243,241,236,0) 100%)` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[44%] z-10 hidden h-full lg:block lg:inset-y-0 lg:left-[46%] lg:right-auto lg:top-0 lg:w-28" style={{ background: `linear-gradient(90deg, ${CANVAS} 0%, rgba(243,241,236,0) 100%)` }} />

      {/* VENSTRE — tekst + levende steg-pipeline på lerretet (mobil: øvre 44%) */}
      <div className="absolute inset-x-0 top-0 bottom-[56%] z-20 lg:inset-y-0 lg:bottom-0 lg:right-auto lg:left-0 lg:w-[50%]" style={{ background: CANVAS }}>
        <div className="flex h-full flex-col justify-center px-6 py-8 sm:px-10 lg:py-10 lg:pl-[clamp(28px,5vw,96px)] lg:pr-14">
          <div className="deck-inn flex items-center gap-3" style={{ '--i': 0 }}>
            <span className="text-[11px] font-semibold tabular-nums tracking-[0.12em]" style={{ color: LILLA_M }}>{String(nr).padStart(2, '0')}</span>
            <span aria-hidden="true" className="h-px w-7" style={{ background: 'linear-gradient(90deg, rgba(122,63,168,0.5), rgba(122,63,168,0))' }} />
            <span className="text-[12.5px] font-medium tracking-[0.01em]" style={{ color: SVAK }}>Løsningen<span style={{ color: 'rgba(21,19,15,0.35)' }}> · med autopilot</span></span>
          </div>

          <h2 className="deck-inn mt-4 text-[30px] leading-[1.02] sm:text-[40px] lg:text-[52px]" style={{ ...display, color: T.ink, maxWidth: '13ch', letterSpacing: '-0.02em', '--i': 1 }}>
            <span className="deck-ord mr-[0.24em]" style={{ '--o': 0 }}>Boligdrift</span>
            <span className="deck-ord mr-[0.24em]" style={{ '--o': 1 }}>på</span>
            <span className="deck-ord" style={{ '--o': 2 }}>autopilot<span style={{ color: LILLA_M }}>.</span></span>
          </h2>

          <p className="deck-inn mt-4 hidden text-[15.5px] leading-[1.55] sm:block" style={{ color: DIM, maxWidth: '40ch', '--i': 2 }}>
            Ett AI-drevet system samler hele driften. Eieren godkjenner kun det som betyr noe.
          </p>

          {/* Stegindeks — pipeline-skinne + fire steg. Aktivt lyser og navigerer filmen. */}
          <div className="deck-inn relative mt-5 lg:mt-8" style={{ '--i': 3 }} role="tablist" aria-label="Driftsstegene">
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

          {/* Aktivt steg — beskrivelse (kryss­toner) + fremdriftslinje i takt med filmen (kun desktop) */}
          <div className="deck-inn mt-5 hidden lg:block" style={{ '--i': 4 }}>
            <div className="min-h-[3em] max-w-[40ch]">
              <p key={valgt} className="text-[14px] leading-[1.55] duration-500 animate-in fade-in-0" style={{ color: DIM }}>{aktivSteg.desc}</p>
            </div>
            <div className="mt-3 h-[2px] w-full max-w-[280px] overflow-hidden rounded-full" style={{ background: HAIR }}>
              <div className="h-full rounded-full" style={{ width: `${andel}%`, background: LILLA_M, transition: frem.ms ? `width ${frem.ms}ms linear` : `width 320ms ${EASE}` }} data-testid="deck-losning-fremdrift" />
            </div>
          </div>

          {/* Investor-gevinsten */}
          <div className="deck-inn mt-5 flex items-center gap-2.5 lg:mt-7" style={{ '--i': 5 }}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA_M }}><Sparkles className="h-3.5 w-3.5" strokeWidth={2} /></span>
            <p className="text-[13.5px]" style={{ color: T.ink }}>Skalerer <span className="font-semibold tabular-nums" style={{ color: LILLA_M }}>1&nbsp;→&nbsp;1&nbsp;000</span> enheter — uten nye ansatte.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
