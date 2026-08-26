'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cookie } from 'lucide-react';
import { gaEnabled, getStoredConsent, applyConsent, restoreConsent } from '@/lib/gtag';
import { track } from '@/lib/analytics';

// Diskré GDPR-samtykkebanner (Consent Mode v2). Vises kun når GA4 er aktivert
// og brukeren ikke har tatt et valg ennå. «Godta alle» / «Kun nødvendige».
// Vises ALDRI i admin-portalen (/admin) — intern bruk, ingen sporing der.
export default function ConsentBanner() {
  const [decided, setDecided] = useState(true); // anta avgjort til vi vet
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef(null);
  const pathname = usePathname();
  // Skjules også i investor-rommet (/investor) — konfidensielt, ingen marketing-sporing der.
  const isAdmin = (pathname || '').startsWith('/admin') || (pathname || '').startsWith('/investor') || (pathname || '').startsWith('/signering') || (pathname || '').startsWith('/tilbud') || (pathname || '').startsWith('/bergen-urban') || (pathname || '').startsWith('/film');
  // Skjul banneret under offline film-render (?record=1) slik at MP4-rammene blir rene.
  const [isRecord, setIsRecord] = useState(false);
  useEffect(() => {
    try { setIsRecord(new URLSearchParams(window.location.search).get('record') === '1'); } catch (e) { /* query/cookie-forbedring er valgfri */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!gaEnabled()) return; // ingen GA4 → ingen banner (no-op)
    const stored = getStoredConsent();
    if (stored && stored.choice) {
      restoreConsent();
      setDecided(true);
    } else {
      setDecided(false);
    }
  }, []);

  // Samtykkeraten er et av de viktigste måletallene vi har: Meta-pixelen laster
  // KUN ved «Godta alle». Ved ~38 % samtykke ser Meta bare en tredjedel av
  // trafikken, og optimaliseringen blir tilsvarende dårligere. Vi logger derfor
  // både visning og valg som førstepartshendelser (ingen kapsel, ingen samtykke
  // nødvendig — vi måler vår egen økt).
  useEffect(() => {
    if (decided || !mounted || isAdmin || isRecord) return;
    try { track('consent_view', {}); } catch (e) { /* måling skal aldri blokkere banneret */ }
  }, [decided, mounted, isAdmin, isRecord]);

  // Eksponer bannerhøyde som CSS-variabel slik at klistrede CTA-er (skjemaer)
  // kan løfte seg over banneret i stedet for å bli skjult. Nullstilles ved valg.
  useEffect(() => {
    const root = document.documentElement;
    const setVar = (px) => root.style.setProperty('--dh-consent-h', `${px}px`);
    if (decided || !mounted || isAdmin) {
      setVar(0);
      return;
    }
    const measure = () => {
      const h = cardRef.current ? cardRef.current.getBoundingClientRect().height : 0;
      setVar(h ? Math.round(h + 28) : 0); // + bunnmarg/pust
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      root.style.setProperty('--dh-consent-h', '0px');
    };
  }, [decided, mounted]);

  const choose = (choice) => {
    applyConsent(choice);
    try { track('consent_choice', { choice }); } catch (e) { /* måling skal aldri blokkere valget */ }
    try { document.documentElement.style.setProperty('--dh-consent-h', '0px'); } catch (e) { /* query/cookie-forbedring er valgfri */ }
    setDecided(true);
  };

  if (!mounted || decided || isAdmin || isRecord) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] px-3 pb-3 sm:px-5 sm:pb-5 pointer-events-none">
      <div ref={cardRef} className="pointer-events-auto mx-auto w-full max-w-[920px] rounded-[16px] bg-surface border border-hairline shadow-[0_16px_50px_-28px_rgba(10,10,10,0.4)] px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill sm:flex">
            <Cookie className="h-4 w-4 text-lavender" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold tracking-[-0.01em] text-ink text-[14px] sm:text-[15px]">Personvern og informasjonskapsler</p>
            <p className="mt-1 text-quiet text-[12px] leading-relaxed sm:text-[12.5px]">
              Nødvendige kapsler får siden til å fungere. Med samtykke måler vi annonser og forbedrer tjenesten.{' '}
              <span className="whitespace-nowrap"><Link href="/personvern" className="text-ink underline underline-offset-2 hover:text-lavender">Les mer</Link>.</span>
            </p>
          </div>
          <div className="grid w-[128px] shrink-0 gap-1.5 sm:flex sm:w-auto sm:items-center">
            <button onClick={() => choose('all')} className="inline-flex h-9 items-center justify-center rounded-full bg-ink px-4 text-[12px] font-semibold text-canvas transition-colors hover:bg-[#333] sm:order-2">Godta alle</button>
            <button onClick={() => choose('necessary')} className="inline-flex h-9 items-center justify-center rounded-full border border-hairline bg-surface px-3 text-[11.5px] font-medium text-ink transition-colors hover:bg-fill sm:order-1 sm:text-[12px]">Kun nødvendige</button>
          </div>
        </div>
      </div>
    </div>
  );
}
