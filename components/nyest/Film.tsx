'use client';

import React, { useState } from 'react';
import { Play } from 'lucide-react';

// ---------------------------------------------------------------------------
// Én stor produktflate — filmen. Klikk for å spille, så laster ikke siden
// 6 MB video før noen ber om det.
// ---------------------------------------------------------------------------

export default function Film() {
  const [spiller, setSpiller] = useState(false);

  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-film">
      <div className="e-shell pb-24 sm:pb-32">
        <h2 className="e-reveal e-h2 max-w-[20ch]">Én plattform for hele utleien<span className="text-[#9B5BD6]">.</span></h2>

        <div className="e-reveal mt-12 overflow-hidden rounded-[20px] sm:mt-14">
          {spiller ? (
            <video
              src="/brandfilm-web.mp4"
              poster="/brandfilm-poster.jpg"
              controls
              autoPlay
              playsInline
              className="aspect-video w-full object-cover"
              data-testid="nyest-film-video"
            />
          ) : (
            <button
              type="button"
              onClick={() => setSpiller(true)}
              aria-label="Spill av filmen om DigiHome"
              data-testid="nyest-film-play"
              className="group relative block w-full"
            >
              <img
                src="/brandfilm-poster.jpg"
                alt="Fra filmen om DigiHome"
                loading="lazy"
                className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <span className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/20" />
              <span className="absolute left-1/2 top-1/2 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform duration-300 group-hover:scale-105">
                <Play className="ml-1 h-6 w-6 text-[#0a0a0a]" fill="currentColor" strokeWidth={0} />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
