'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, EyeOff, ArrowLeft, AlertTriangle } from 'lucide-react';
import ListingDetail from '@/components/dh/ListingDetail';

// FORHÅNDSVISNING AV EN UPUBLISERT BOLIGSIDE.
//
// Serveren viser aldri en bolig som ikke er publisert — ellers kunne hvem som
// helst gjette seg til en skjult enhet via slug-halen. Men eieren må kunne se
// hvordan siden blir FØR den publiseres. Løsningen: adminnøkkelen leses fra
// localStorage i nettleseren (aldri fra URL-en) og boligen hentes fra
// /api/public/listings?preview=1. Siden er alltid noindex.

export default function ListingPreview({ slug }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const key = localStorage.getItem('dh_admin_session') || localStorage.getItem('dh_admin_key') || '';
        if (!key) { if (alive) setState({ error: 'Logg inn i adminportalen først — forhåndsvisning krever innlogging.' }); return; }
        const r = await fetch(`/api/public/listings?preview=1&key=${encodeURIComponent(key)}`);
        const jd = await r.json();
        if (!alive) return;
        if (!jd.ok) { setState({ error: jd.error || 'Kunne ikke hente forhåndsvisningen.' }); return; }
        const hit = [...(jd.candidates || []), ...(jd.listings || [])].find((c) => c.slug === slug);
        if (!hit) { setState({ error: 'Fant ingen bolig med denne adressen blant de publiseringsklare. Sjekk «Boliger» i adminportalen — den mangler kanskje bilder eller pris.' }); return; }
        setState({ listing: hit });
      } catch (e) { if (alive) setState({ error: 'Kunne ikke hente forhåndsvisningen.' }); }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (state.loading && !state.error && !state.listing) {
    return (
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-6 pt-32 text-[14px] text-[#78726a] sm:px-10 lg:px-16">
        <Loader2 className="h-4 w-4 animate-spin" /> Henter forhåndsvisning …
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 pb-24 pt-32 sm:px-10 lg:px-16">
        <div className="max-w-[62ch] rounded-[26px] bg-white p-8 ring-1 ring-black/[0.05]">
          <AlertTriangle className="h-5 w-5 text-[#c08a2e]" />
          <h1 className="mt-3 text-[22px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Forhåndsvisningen er ikke tilgjengelig</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#4a4a4a]">{state.error}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin" className="inline-flex h-11 items-center rounded-full bg-[#0a0a0a] px-5 text-[14px] font-semibold text-white">Åpne adminportalen</Link>
            <Link href="/ledige-boliger" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-[14px] font-semibold text-[#0a0a0a] ring-1 ring-inset ring-black/[0.1]"><ArrowLeft className="h-4 w-4" /> Ledige boliger</Link>
          </div>
        </div>
      </div>
    );
  }

  const l = state.listing;
  return (
    <>
      <div className="mx-auto max-w-[1400px] px-6 pt-28 sm:px-10 sm:pt-32 lg:px-16">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f6f1ff] px-5 py-3.5" data-testid="listing-preview-banner">
          <p className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#5b4499]">
            <EyeOff className="h-4 w-4" /> Forhåndsvisning — denne boligen er ikke publisert
          </p>
          <p className="text-[12.5px] text-[#7a68a8]">Slå på «Vis på nettsiden» i Boliger for å publisere.</p>
        </div>
        <Link href="/ledige-boliger?forhandsvis=1" className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#78726a] transition-colors hover:text-[#0a0a0a]">
          <ArrowLeft className="h-4 w-4" /> Alle ledige boliger
        </Link>
      </div>
      <ListingDetail listing={l} available={l.status === 'active'} />
    </>
  );
}
