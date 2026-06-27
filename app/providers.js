'use client';

// Client-only context wrapper. QueryClient is created once at module load.
// Toaster (sonner) lazy-lastes så den ikke ligger i den kritiske bundelen.

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

const Toaster = dynamic(() => import('sonner').then((m) => m.Toaster), { ssr: false });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
