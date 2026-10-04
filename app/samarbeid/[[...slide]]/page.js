'use client';
/* /samarbeid[/<seksjon>] – det private forslaget som én lang scrollside bak passordgaten. */
import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Gate from '../../../components/samarbeid/Gate';
import Forslag from '../../../components/samarbeid/forslag/Forslag';

function Inner() {
  const params = useParams();
  const start = Array.isArray(params?.slide) ? params.slide[0] : params?.slide;
  return <Forslag start={start || ''} />;
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
