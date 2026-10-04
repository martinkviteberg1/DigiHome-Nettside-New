'use client';
/* /samarbeid[/<kapittel>] – den private invitasjonen (brevet) bak passordgaten. */
import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Gate from '../../../components/samarbeid/Gate';
import Brev from '../../../components/samarbeid/brev/Brev';

function Inner() {
  const params = useParams();
  const start = Array.isArray(params?.slide) ? params.slide[0] : params?.slide;
  return <Brev start={start || ''} />;
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
