'use client';

import { useEffect } from 'react';
import { RotateCcw, Home } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Logg til konsoll for feilsøking i preview.
    console.error(error);
  }, [error]);

  return (
    <div className="bg-canvas text-ink min-h-screen flex items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -right-32 h-[520px] w-[520px] rounded-full"
        style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.22) 0%, rgba(207,151,252,0) 70%)' }}
      />
      <div className="relative max-w-[560px] text-center">
        <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-taupe mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-lavender" /> Noe gikk galt
        </div>
        <h1 className="font-heading font-bold tracking-[-0.03em] leading-[1.05] text-[34px] sm:text-[46px]">
          Beklager — her oppsto en feil
        </h1>
        <p className="text-quiet text-[16px] sm:text-[18px] mt-5 leading-relaxed">
          Vi har logget hendelsen. Prøv igjen, eller gå tilbake til forsiden.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-full bg-ink text-canvas px-6 py-3.5 text-[15px] font-medium transition-colors hover:bg-[#333]"
          >
            <RotateCcw className="w-4 h-4" /> Prøv igjen
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-surface border border-hairline px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-fill"
          >
            <Home className="w-4 h-4" /> Til forsiden
          </a>
        </div>
      </div>
    </div>
  );
}
