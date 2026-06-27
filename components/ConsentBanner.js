'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { gaEnabled, getStoredConsent, applyConsent, restoreConsent } from '@/lib/gtag';

// Diskré GDPR-samtykkebanner (Consent Mode v2). Vises kun når GA4 er aktivert
// og brukeren ikke har tatt et valg ennå. «Godta alle» / «Kun nødvendige».
export default function ConsentBanner() {
  const [decided, setDecided] = useState(true); // anta avgjort til vi vet
  const [mounted, setMounted] = useState(false);

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

  const choose = (choice) => {
    applyConsent(choice);
    setDecided(true);
  };

  if (!mounted || decided) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-3 pb-3 sm:px-5 sm:pb-5 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[560px] rounded-[20px] bg-surface border border-hairline shadow-[0_24px_70px_-24px_rgba(10,10,10,0.35)] p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill">
            <Cookie className="h-4.5 w-4.5 text-lavender" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-bold tracking-[-0.01em] text-ink text-[16px]">
              Vi bruker informasjonskapsler
            </p>
            <p className="mt-1.5 text-quiet text-[13.5px] leading-relaxed">
              Nødvendige kapsler får siden til å fungere. Med ditt samtykke bruker vi også
              analyse og markedsføring for å forbedre tjenesten og måle annonser.{' '}
              <Link href="/personvern" className="text-ink underline underline-offset-2 hover:text-lavender">
                Personvern
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center gap-2.5">
              <button
                onClick={() => choose('necessary')}
                className="inline-flex items-center justify-center rounded-full bg-surface border border-hairline px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-fill"
              >
                Kun nødvendige
              </button>
              <button
                onClick={() => choose('all')}
                className="inline-flex items-center justify-center rounded-full bg-ink text-canvas px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-[#333]"
              >
                Godta alle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
