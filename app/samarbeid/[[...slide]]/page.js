'use client';
/* /samarbeid[/<seksjon>] – tilbudsdecket. `?print=1[&auto=1]` – PDF-siden: én 16:9-side per seksjon fra samme register. */
import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Gate from '../../../components/samarbeid/Gate';
import Deck from '../../../components/samarbeid/Deck';
import DeckPrint from '../../../components/samarbeid/DeckPrint';
import { CONFIG, indexIn } from '../../../components/samarbeid/register';

function Inner() {
  const params = useParams();
  const sp = useSearchParams();
  const param = Array.isArray(params?.slide) ? params.slide[0] : params?.slide;
  if (sp.get('print') === '1') return <DeckPrint auto={sp.get('auto') === '1'} config={CONFIG} />;
  return <Deck initial={indexIn(param)} config={CONFIG} />;
}

export default function SamarbeidPage() {
  return (
    <Gate>
      <Suspense fallback={null}>
        <Inner />
      </Suspense>
    </Gate>
  );
}
