'use client';

import { useEffect } from 'react';
import { RotateCcw, Home } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Logg til konsoll for feilsøking i preview …
    console.error(error);

    // Auto-gjenopprett fra utdaterte JS-chunks: etter en ny bygging peker gammel
    // HTML på chunk-navn som ikke finnes lenger → ChunkLoadError. Da hjelper det
    // ikke å rendre på nytt; vi må HENTE siden på nytt (én gang, med vakt mot loop).
    const melding = String(error?.message || error || '');
    const erChunkFeil = /ChunkLoadError|Loading chunk|Loading CSS chunk|error loading dynamically imported module|Failed to fetch dynamically imported/i.test(melding);
    if (erChunkFeil) {
      try {
        const n = Number(sessionStorage.getItem('dh_chunk_reload') || '0');
        if (n < 2) { sessionStorage.setItem('dh_chunk_reload', String(n + 1)); window.location.reload(); return; }
      } catch (e) { /* ok */ }
    } else {
      try { sessionStorage.removeItem('dh_chunk_reload'); } catch (e) { /* ok */ }
    }

    // … og til serveren, så «Vi har logget hendelsen» faktisk er sant og vi kan
    // lese den ekte feilen i serverloggen (ikke bare i brukerens konsoll).
    try {
      const body = JSON.stringify({
        message: melding.slice(0, 600),
        stack: String(error?.stack || '').slice(0, 3000),
        digest: error?.digest || '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      fetch('/api/klientfeil', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (e) { /* stille */ }
  }, [error]);

  // Ekte reload (ikke bare reset()): en gammel/utdatert JS-chunk etter en
  // ny bygging kan ikke repareres ved å rendre på nytt — kun ved å hente på nytt.
  const provIgjen = () => {
    try { window.location.reload(); } catch (e) { reset(); }
  };

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
            onClick={provIgjen}
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
