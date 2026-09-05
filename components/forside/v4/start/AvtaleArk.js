'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { avtaleSelvforvaltning as A } from '@/lib/avtale-selvforvaltning';
import { EASE, T, display, useRedusert, useSmal } from '../motion';

/* ---------------------------------------------------------------------------
   AvtaleArk — avtalen som et dokument du faktisk kan lese. Ikke en ny fane.

   Desktop: ark fra høyre (560 px), papir, hele høyden. Mobil: ark fra bunnen
   (94 svh) med håndtak. Ett dokument:
     tittel · versjon · «Kort fortalt» (fire linjer) · avtalen med nummererte
     seksjoner · sticky fot: «Jeg har lest og godtar».
   Leseindikator: tynn ink-linje øverst som fylles når du blar.
   Esc lukker. Bakgrunnen dempes og låses. Fokus flyttes inn i arket.
   Kun opacity/transform i overgangene; redusert bevegelse → ingen glid.
--------------------------------------------------------------------------- */

export default function AvtaleArk({ apen, onLukk, onGodta, godtatt = false, paVegneAv = '' }) {
  const smal = useSmal();
  const redusert = useRedusert();
  const [montert, setMontert] = useState(false);
  const [inne, setInne] = useState(false);
  const [lest, setLest] = useState(0);
  const arkRef = useRef(null);
  const scrollRef = useRef(null);
  const forrigeFokus = useRef(null);

  /* Montering i to steg så overgangen alltid spiller: mount (opacity 0) → neste frame (opacity 1). */
  useEffect(() => {
    if (apen) {
      forrigeFokus.current = document.activeElement;
      setMontert(true);
      const r = window.requestAnimationFrame(() => { setInne(true); try { arkRef.current?.focus({ preventScroll: true }); } catch (e) { /* ok */ } });
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { window.cancelAnimationFrame(r); document.body.style.overflow = prev; };
    }
    setInne(false);
    const t = window.setTimeout(() => { setMontert(false); setLest(0); try { forrigeFokus.current?.focus?.({ preventScroll: true }); } catch (e) { /* ok */ } }, redusert ? 0 : 360);
    return () => window.clearTimeout(t);
  }, [apen, redusert]);

  useEffect(() => {
    if (!apen) return undefined;
    const tast = (e) => { if (e.key === 'Escape') { e.preventDefault(); onLukk(); } };
    document.addEventListener('keydown', tast);
    return () => document.removeEventListener('keydown', tast);
  }, [apen, onLukk]);

  const scroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maks = el.scrollHeight - el.clientHeight;
    setLest(maks > 0 ? Math.min(1, el.scrollTop / maks) : 1);
  };

  if (!montert) return null;
  const varighet = redusert ? 0 : 360;

  return (
    <div className="fixed inset-0 z-[80]" role="presentation" data-testid="avtale-ark">
      {/* Bakgrunn */}
      <button
        type="button"
        aria-label="Lukk avtalen"
        onClick={onLukk}
        className="absolute inset-0 h-full w-full cursor-default"
        style={{ background: 'rgba(21,19,15,0.42)', opacity: inne ? 1 : 0, transition: `opacity ${varighet}ms ${EASE}` }}
        tabIndex={-1}
      />

      {/* Arket */}
      <section
        ref={arkRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avtale-tittel"
        tabIndex={-1}
        className={`absolute flex flex-col outline-none ${smal ? 'inset-x-0 bottom-0 rounded-t-[22px]' : 'bottom-0 right-0 top-0 w-[560px] max-w-[92vw]'}`}
        style={{
          background: '#FBFAF8',
          color: T.ink,
          height: smal ? '94svh' : undefined,
          boxShadow: smal ? '0 -30px 80px -40px rgba(21,19,15,0.5)' : '-30px 0 80px -40px rgba(21,19,15,0.5)',
          transform: inne ? 'none' : smal ? 'translateY(24px)' : 'translateX(28px)',
          opacity: inne ? 1 : 0,
          transition: `opacity ${varighet}ms ${EASE}, transform ${varighet}ms ${EASE}`,
        }}
        data-testid="avtale-dialog"
      >
        {/* Leseindikator */}
        <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-[2px] ${smal ? 'rounded-t-[22px]' : ''}`} style={{ background: 'rgba(21,19,15,0.06)' }}>
          <div className="h-full" style={{ width: `${Math.round(lest * 100)}%`, background: T.ink, transition: 'width 120ms linear' }} />
        </div>

        {/* Topp */}
        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-5 sm:px-8 sm:pt-7">
          {smal ? <span aria-hidden="true" className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full" style={{ background: 'rgba(21,19,15,0.18)' }} /> : null}
          <div className="min-w-0">
            <h2 id="avtale-tittel" className="text-[26px] sm:text-[30px]" style={{ ...display, color: T.ink }}>{A.tittel}</h2>
            <p className="mt-1.5 text-[13.5px] text-[#15130F]/55">{A.undertittel} · {A.versjonTekst}</p>
          </div>
          <button type="button" onClick={onLukk} aria-label="Lukk" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#15130F]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" data-testid="avtale-lukk">
            <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </header>

        {/* Dokumentet */}
        <div ref={scrollRef} onScroll={scroll} className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-8" data-testid="avtale-innhold">
          {/* Kort fortalt */}
          <section aria-label="Kort fortalt" className="rounded-[16px] p-5 sm:p-6" style={{ background: 'rgba(21,19,15,0.045)' }}>
            <p className="text-[13.5px] font-medium text-[#15130F]/60">Kort fortalt</p>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {A.kortFortalt.map((k) => (
                <div key={k.t}>
                  <dt className="text-[14.5px] font-medium text-[#15130F]">{k.t}</dt>
                  <dd className="mt-0.5 text-[14px] leading-[1.5] text-[#15130F]/65">{k.d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12.5px] text-[#15130F]/45">Oppsummeringen er til hjelp. Det er avtaleteksten under som gjelder.</p>
          </section>

          {/* Avtalen */}
          <ol className="mt-8 flex flex-col">
            {A.seksjoner.map((s, i) => (
              <li key={s.n} className={`py-6 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'rgba(21,19,15,0.08)' }}>
                <h3 className="flex items-baseline gap-3 text-[18px] sm:text-[19px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.ink }}>
                  <span className="w-6 shrink-0 text-[13px] tabular-nums" style={{ fontFamily: 'inherit', color: 'rgba(21,19,15,0.4)' }}>{s.n}</span>
                  {s.t}
                </h3>
                <div className="mt-3 flex flex-col gap-3 pl-9 text-[15px] leading-[1.6] text-[#15130F]/75">
                  {s.p.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
                  {s.liste ? (
                    <ul className="flex flex-col gap-1.5">
                      {s.liste.map((l) => (
                        <li key={l} className="flex gap-3"><span aria-hidden="true" className="mt-[10px] h-1 w-1 shrink-0 rounded-full" style={{ background: 'rgba(21,19,15,0.45)' }} />{l}</li>
                      ))}
                    </ul>
                  ) : null}
                  {s.etter ? s.etter.map((p) => <p key={p.slice(0, 40)}>{p}</p>) : null}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[12.5px] text-[#15130F]/45">Avtale-ID {A.id}. Du får en kopi på e-post når registreringen er fullført.</p>
        </div>

        {/* Fot — sticky */}
        <footer className="border-t px-6 py-4 sm:px-8 sm:py-5" style={{ borderColor: 'rgba(21,19,15,0.08)', background: '#FBFAF8' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => { onGodta(); onLukk(); }}
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-[12px] px-6 text-[15px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
              style={{ background: godtatt ? T.gronn : T.ink, color: '#F4F1EA' }}
              data-testid="avtale-godta"
            >
              {godtatt ? <><Check className="h-4 w-4" strokeWidth={2.4} /> Godtatt</> : 'Jeg har lest og godtar avtalen'}
            </button>
            <a href="/avtale/selvforvaltning" target="_blank" rel="noopener noreferrer" className="text-[13.5px] text-[#15130F]/60 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F]" data-testid="avtale-egen-side">Åpne som egen side</a>
          </div>
          {paVegneAv ? <p className="mt-2.5 text-[12.5px] text-[#15130F]/50">På vegne av <span className="font-medium text-[#15130F]/75">{paVegneAv}</span>, som du har signaturrett for.</p> : null}
        </footer>
      </section>
    </div>
  );
}
