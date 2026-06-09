'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

export function VideoBlock({ poster, src, label }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative rounded-panel overflow-hidden bg-fill aspect-video shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-hairline">
      {playing ? (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
        />
      ) : (
        <>
          <Image
            src={poster}
            alt={label || 'DigiHome'}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center group"
            aria-label="Spill av video"
          >
            <span className="h-16 w-16 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              <Play className="h-6 w-6 text-ink translate-x-[1px]" fill="currentColor" />
            </span>
          </button>
          {label && (
            <span className="absolute left-6 bottom-6 text-white text-sm font-medium drop-shadow max-w-[70%]">
              {label}
            </span>
          )}
        </>
      )}
    </div>
  );
}
