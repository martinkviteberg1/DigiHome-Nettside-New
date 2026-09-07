'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DeckKonsept from '@/components/investor/DeckKonsept';

/* /investor/deck?t=<lenke>            → investor (ev. passord)
   /investor/deck?plan=<id>            → presenter (admin-sesjon fra localStorage eller ?key=) */
function DeckInnhold() {
  const sp = useSearchParams();
  const t = sp.get('t') || '';
  const planId = sp.get('plan') || '';
  const techId = sp.get('tech') || '';
  const [adminKey, setAdminKey] = useState(sp.get('key') || '');
  const [klar, setKlar] = useState(Boolean(t || sp.get('key')));
  useEffect(() => {
    if (klar) return;
    // Presenter: admin-sesjonen ligger i localStorage — les den FØR første henting, så vi aldri
    // fyrer et uautentisert kall som kan rase mot det riktige.
    try { const s = localStorage.getItem('dh_admin_session'); if (s) setAdminKey(s); } catch (e) { /* ok */ }
    setKlar(true);
  }, [klar]);
  if (!klar) return <div className="min-h-[100svh]" style={{ background: '#F3F1EC' }} />;
  return <DeckKonsept token={t} adminKey={t ? '' : adminKey} planId={planId} techId={techId} />;
}

export default function DeckSide() {
  return (
    <Suspense fallback={<div className="min-h-[100svh]" style={{ background: '#F3F1EC' }} />}>
      <DeckInnhold />
    </Suspense>
  );
}
