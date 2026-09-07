'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X } from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';
import { EASE, T, display, useRedusert, useSmal } from '../motion';
import { VALG, Dor, DorStor, DIM, SVAK } from './velg';

/* ---------------------------------------------------------------------------
   KomIGangVelger — «Hvem leier ut?» som overlay fra nav-knappen.

   Desktop: sentrert dialog med to dører (bilde + tittel + én setning).
   Mobil:   bottom drawer som glir opp, med radene fra /kom-i-gang.

   Valget er binart og tar to sekunder — du skal ikke forlate siden du står
   på for å svare. /kom-i-gang finnes fortsatt som lenkbar fallback (annonser,
   e-post, uten JS, cmd-klikk).

   Portal til body (header har backdrop-filter — fixed inni den ville brutt).
   Esc / backdrop / X lukker. Fokus låses i dialogen og går tilbake til knappen.
   Kun opacity/transform, ingen blur på backdrop. Redusert bevegelse → rett på.
--------------------------------------------------------------------------- */

const UT_MS = 260;

export default function KomIGangVelger({ apen, onLukk }) {
  const [montert, setMontert] = useState(false); // i DOM (også under utgangsanimasjonen)
  const [inne, setInne] = useState(false);       // animert inn
  const [aktiv, setAktiv] = useState(null);     // nøytral til du peker — valget skal ikke være ledet
  const panel = useRef(null);
  const utloser = useRef(null);
  const lukkRef = useRef(onLukk);
  const smal = useSmal();
  const redusert = useRedusert();

  useEffect(() => { lukkRef.current = onLukk; }, [onLukk]);

  /* Åpne: monter → neste frame: inn. Lukke: ut → avmonter etter animasjonen. */
  useEffect(() => {
    if (apen) {
      utloser.current = typeof document !== 'undefined' ? document.activeElement : null;
      setAktiv(null);
      setMontert(true);
      let r2 = 0;
      const r1 = window.requestAnimationFrame(() => { r2 = window.requestAnimationFrame(() => setInne(true)); });
      return () => { window.cancelAnimationFrame(r1); window.cancelAnimationFrame(r2); };
    }
    setInne(false);
    const t = window.setTimeout(() => setMontert(false), redusert ? 0 : UT_MS);
    return () => window.clearTimeout(t);
  }, [apen, redusert]);

  /* Mens dialogen er inne: scroll-lås, Esc, fokusfelle, fokus tilbake ved lukking */
  useEffect(() => {
    if (!inne) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    try { panel.current?.focus({ preventScroll: true }); } catch (e) { /* ok */ }

    const tast = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); lukkRef.current?.(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const f = Array.from(panel.current.querySelectorAll('a[href], button:not([disabled])')).filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const forste = f[0]; const siste = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === forste || document.activeElement === panel.current)) { e.preventDefault(); siste.focus(); }
      else if (!e.shiftKey && document.activeElement === siste) { e.preventDefault(); forste.focus(); }
    };
    window.addEventListener('keydown', tast);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', tast);
      try { utloser.current?.focus?.({ preventScroll: true }); } catch (e) { /* ok */ }
    };
  }, [inne]);

  const velg = (v) => {
    try { track('kom_i_gang_valg', { valg: v.id, kilde: 'nav' }); } catch (e) { /* ok */ }
    lukkRef.current?.();
  };

  if (!montert || typeof document === 'undefined') return null;

  const d = redusert ? 0 : 1;
  const panelTransform = inne ? 'none' : (smal ? 'translateY(100%)' : 'translateY(16px) scale(0.985)');

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" data-testid="kig-velger" data-inne={inne ? 'true' : 'false'}>
      {/* Backdrop — klikk lukker. Ingen blur (lag). */}
      <button
        type="button"
        aria-label="Lukk"
        tabIndex={-1}
        onClick={() => lukkRef.current?.()}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(21,19,15,0.56)', opacity: inne ? 1 : 0, transition: `opacity ${320 * d}ms ${EASE}` }}
        data-testid="kig-velger-backdrop"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kig-velger-tittel"
        tabIndex={-1}
        className="relative w-full max-h-[calc(100svh-24px)] overflow-y-auto rounded-t-[24px] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 focus:outline-none sm:max-h-[calc(100svh-48px)] sm:w-[min(940px,100%)] sm:rounded-[24px] sm:p-8 lg:p-9"
        style={{ background: T.canvas, color: T.ink, boxShadow: '0 30px 80px rgba(21,19,15,0.35)', transform: panelTransform, opacity: smal || inne ? 1 : 0, transition: `transform ${(smal ? 460 : 380) * d}ms ${EASE}, opacity ${260 * d}ms ${EASE}`, willChange: 'transform, opacity' }}
        data-testid="kig-velger-panel"
      >
        {/* Håndtak (mobil) */}
        <div className="mx-auto mb-4 h-1 w-9 rounded-full sm:hidden" style={{ background: 'rgba(21,19,15,0.16)' }} aria-hidden="true" />

        <div className="flex items-center justify-between">
          <p className="text-[13.5px] font-medium" style={{ color: SVAK }}>Kom i gang</p>
          <button
            type="button"
            onClick={() => lukkRef.current?.()}
            aria-label="Lukk"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#15130F]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
            data-testid="kig-velger-lukk"
          >
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>

        <h2 id="kig-velger-tittel" className="mt-1 text-[36px] sm:mt-2 sm:text-[44px] lg:text-[50px]" style={{ ...display, color: T.ink }} data-testid="kig-velger-tittel">
          Hvem leier ut<span style={{ color: T.lilla, marginLeft: '0.03em' }}>?</span>
        </h2>
        <p className="mt-3 max-w-[46ch] text-[15.5px] leading-[1.5] sm:text-[16.5px]" style={{ color: DIM }}>
          Velg det som passer, så tar vi deg rett til riktig start. Du binder deg ikke til noe.
        </p>

        {/* Mobil: rader */}
        <ol className="mt-5 flex flex-col gap-1 sm:hidden" data-testid="kig-velger-rader">
          {VALG.map((v, i) => (
            <Dor key={v.id} v={v} aktiv={aktiv === v.id} onAktiv={() => setAktiv(v.id)} onClick={() => velg(v)} delay={0.06 + i * 0.06} kompakt testid={`kig-velger-rad-${v.id}`} />
          ))}
        </ol>

        {/* Desktop: to dører */}
        <div className="mt-8 hidden gap-5 sm:grid sm:grid-cols-2" data-testid="kig-velger-dorer">
          {VALG.map((v, i) => (
            <DorStor key={v.id} v={v} aktiv={aktiv === v.id} onAktiv={() => setAktiv(v.id)} onClick={() => velg(v)} delay={0.08 + i * 0.07} />
          ))}
        </div>

        <p className="mt-6 text-[13.5px] leading-[1.6] sm:mt-8" style={{ color: SVAK }} data-testid="kig-velger-fot">
          Usikker på hva som passer?{' '}
          <Link href="/book-mote" onClick={() => lukkRef.current?.()} className="underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: T.ink }} data-testid="kig-velger-samtale">Book en samtale</Link>
          <span className="mx-2" aria-hidden="true">·</span>
          Allerede kunde?{' '}
          <a href={site.loginUrl} className="underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: T.ink }}>Logg inn</a>
        </p>
      </div>
    </div>,
    document.body,
  );
}
