'use client';

// Client-only context wrapper. QueryClient is created once at module load.

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }) {
  // På mobil reduserer vi bevegelse (slår av transform-/layout-animasjoner) for
  // lavere hovedtråd-arbeid og raskere oppfattet ytelse. Desktop beholder full
  // eleganse. Respekterer også brukerens "reduser bevegelse"-innstilling.
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 767px)');
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mqMobile.matches || mqReduce.matches);
    update();
    mqMobile.addEventListener('change', update);
    mqReduce.addEventListener('change', update);
    return () => { mqMobile.removeEventListener('change', update); mqReduce.removeEventListener('change', update); };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
        {children}
      </MotionConfig>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}

