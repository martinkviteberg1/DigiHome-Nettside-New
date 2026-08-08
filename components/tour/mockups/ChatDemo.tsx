'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// ChatDemo — tro replika av leietakerens meldingstråd i systemet
// (TenantInbox): lilla gradient-bobler for leietaker, emerald gradient for
// DigiHome AI med AI-avatar-header, hvite bobler for forvalteren — og
// composer-linjen «AI svarer i tråden — synlig for utleier».
// En hel samtale over to dager: strømmen går sent på kvelden → AI-en
// feilsøker → sak opprettes og forvalteren trer inn → løst dagen etter.
// Boblene popper inn med fjæring fra sitt hjørne, skriver-indikator går
// foran hvert svar, og Emmas siste melding får «Sendt»-kvittering.
// ---------------------------------------------------------------------------

const TRINN: { navn: string; ms: number }[] = [
  { navn: 'start', ms: 800 },
  { navn: 'm1', ms: 1500 },
  { navn: 's1', ms: 1300 },
  { navn: 'm2', ms: 2500 },
  { navn: 'm3', ms: 2100 },
  { navn: 's2', ms: 1300 },
  { navn: 'm4', ms: 2500 },
  { navn: 'sak1', ms: 1700 },
  { navn: 's3', ms: 1500 },
  { navn: 'm5', ms: 3000 },
  { navn: 'm6', ms: 2200 },
  { navn: 'dato2', ms: 1300 },
  { navn: 'sak2', ms: 1700 },
  { navn: 's4', ms: 1300 },
  { navn: 'm7', ms: 3800 },
  { navn: 'slutt', ms: 6500 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

type Rad =
  | { type: 'dato'; id: string; tekst: string }
  | { type: 'chip'; id: string; tekst: string; farge: string }
  | { type: 'melding'; id: string; fra: 'meg' | 'ai' | 'forvalter'; tid: string; tekst: string };

const RADER: Rad[] = [
  { type: 'dato', id: 'start', tekst: 'I dag' },
  { type: 'melding', id: 'm1', fra: 'meg', tid: '21:47', tekst: 'Hei! Strømmen gikk akkurat i hele leiligheten 😅' },
  {
    type: 'melding',
    id: 'm2',
    fra: 'ai',
    tid: '21:47',
    tekst: 'Hei Emma! Det ordner vi. Sjekk sikringsskapet i gangen — står hovedbryteren øverst på AV?',
  },
  { type: 'melding', id: 'm3', fra: 'meg', tid: '21:49', tekst: 'Ja! Skrudde den på, men den slår seg av igjen etter noen sekunder.' },
  {
    type: 'melding',
    id: 'm4',
    fra: 'ai',
    tid: '21:49',
    tekst: 'Da er det trolig en jordfeil — ikke prøv flere ganger. Jeg oppretter en sak og kobler på forvalteren nå.',
  },
  { type: 'chip', id: 'sak1', tekst: 'Sak #1042 opprettet — elektro', farge: '#d97706' },
  {
    type: 'melding',
    id: 'm5',
    fra: 'forvalter',
    tid: '21:56',
    tekst: 'Hei Emma, Martin fra forvaltningen. Elektriker er booket til i morgen kl. 09:00 — du får varsel når han er på vei.',
  },
  { type: 'melding', id: 'm6', fra: 'meg', tid: '22:01', tekst: 'Supert, tusen takk for kjapt svar! 🙏' },
  { type: 'dato', id: 'dato2', tekst: 'Dagen etter' },
  { type: 'chip', id: 'sak2', tekst: 'Sak #1042 løst — jordfeil utbedret', farge: '#22c55e' },
  {
    type: 'melding',
    id: 'm7',
    fra: 'ai',
    tid: '09:42',
    tekst: 'Saken er løst! Elektrikeren fant en jordfeil på kjøkkenkursen og utbedret den. God dag videre, Emma 👋',
  },
];

// Systemets eksakte boblestiler (TenantInbox).
const BOBLE: Record<string, React.CSSProperties> = {
  meg: {
    background: 'linear-gradient(135deg, #ece1ff 0%, #ddc8ff 100%)',
    boxShadow: '0 2px 8px -3px rgba(124,58,237,0.18), 0 0 0 1px rgba(124,58,237,0.06) inset',
  },
  ai: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    boxShadow: '0 2px 8px -3px rgba(16,185,129,0.18), 0 0 0 1px rgba(16,185,129,0.06) inset',
  },
  forvalter: {
    background: '#fff',
    boxShadow: '0 2px 10px -4px rgba(20,20,30,0.08), 0 0 0 1px rgba(20,20,30,0.04) inset',
  },
};

const FJAER = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // fjærende overshoot

function Skriver({ variant }: { variant: 'ai' | 'forvalter' }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-[22px] rounded-bl-[6px] px-[15px] py-[12px]" style={BOBLE[variant]}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full"
            style={{ background: variant === 'ai' ? '#059669' : '#b3aca2', animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// Dobbel hake — systemets «Sendt»-kvittering.
function Haker() {
  return (
    <svg viewBox="0 0 18 12" className="h-[9px] w-[13px]" fill="none">
      <path d="M1 6.5l3.5 3.5L11 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 6.5l3.5 3.5L17 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ChatDemo() {
  const rot = useRef<HTMLDivElement | null>(null);
  const [kjorer, setKjorer] = useState(false);
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const el = rot.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setKjorer(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setKjorer(entry.isIntersecting);
        if (!entry.isIntersecting) setFase(0);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!kjorer) return;
    const t = window.setTimeout(() => {
      setFase((f) => (f + 1) % TRINN.length);
    }, TRINN[fase].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, fase]);

  const er = (navn: string) => fase >= IDX[navn];
  const navnNaa = TRINN[fase].navn;

  // Emmas siste synlige melding får «Sendt»-kvitteringen.
  const sisteMin = er('m6') ? 'm6' : er('m3') ? 'm3' : 'm1';

  return (
    <div ref={rot} className="relative w-full max-w-[440px] lg:mx-auto" data-testid="tour-chat-demo">
      {/* Meldingsområdet — nye bobler skyver de eldre opp gjennom fade-masken. */}
      <div
        className="flex h-[460px] flex-col justify-end gap-0 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(180deg, transparent 0%, black 14%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 14%)',
        }}
      >
        {RADER.map((r) => {
          const synlig = er(r.id);
          const wrapper = `transition-all duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            synlig ? 'max-h-[190px] opacity-100' : 'max-h-0 overflow-hidden opacity-0'
          }`;

          if (r.type === 'dato') {
            return (
              <div key={r.id} className={wrapper}>
                <div className="flex justify-center pb-4 pt-1.5">
                  <span
                    className="inline-block rounded-full border border-[#ece6da] bg-white px-3 py-1 text-[10.5px] font-bold tabular-nums text-[#5e5749] transition-transform duration-500"
                    style={{ transform: synlig ? 'scale(1)' : 'scale(0.8)', transitionTimingFunction: FJAER }}
                  >
                    {r.tekst}
                  </span>
                </div>
              </div>
            );
          }

          if (r.type === 'chip') {
            return (
              <div key={r.id} className={wrapper}>
                <div className="flex justify-center py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#ece6da] bg-white px-3 py-1 text-[10px] font-bold text-[#5e5749] transition-transform duration-500"
                    style={{ transform: synlig ? 'scale(1)' : 'scale(0.8)', transitionTimingFunction: FJAER }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.farge }} />
                    {r.tekst}
                  </span>
                </div>
              </div>
            );
          }

          const m = r;
          const erMeg = m.fra === 'meg';
          return (
            <div key={m.id} className={wrapper}>
              <div className="space-y-1 pb-3">
                {/* Avsender-header — systemets AI- og forvalter-merking. */}
                {m.fra === 'ai' && (
                  <div className="flex items-center gap-2 pb-1 pl-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[9px] font-bold text-white">
                      AI
                    </span>
                    <span className="text-[11px] font-semibold tracking-[-0.005em] text-emerald-700">DigiHome AI</span>
                  </div>
                )}
                {m.fra === 'forvalter' && (
                  <div className="flex items-center gap-2 pb-1 pl-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0a0a0a]">
                      <Building2 className="h-2.5 w-2.5 text-white" strokeWidth={2} />
                    </span>
                    <span className="text-[11px] font-semibold tracking-[-0.005em] text-[#6b6050]">Martin · DigiHome Forvaltning</span>
                  </div>
                )}

                {/* Boblen — fjærer inn fra sitt hjørne. */}
                <div className={`flex ${erMeg ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] whitespace-pre-wrap px-[16px] py-[10px] text-[12.5px] leading-[1.5] tracking-[-0.005em] text-[#0a0a0a] transition-transform duration-500 ${
                      erMeg ? 'origin-bottom-right rounded-[22px] rounded-br-[6px]' : 'origin-bottom-left rounded-[22px] rounded-bl-[6px]'
                    }`}
                    style={{
                      ...BOBLE[m.fra],
                      transform: synlig ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(8px)',
                      transitionTimingFunction: FJAER,
                    }}
                  >
                    {m.tekst}
                  </div>
                </div>

                {/* Tid + «Sendt»-kvittering på Emmas siste melding. */}
                <div className={`flex items-center gap-1.5 ${erMeg ? 'justify-end pr-3' : 'justify-start pl-3'}`}>
                  <span className="text-[9.5px] font-medium uppercase tracking-[0.04em] text-[#7c7466] tabular-nums">{m.tid}</span>
                  {erMeg && sisteMin === m.id && (
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] font-medium uppercase tracking-[0.04em] text-[#7c7466]">
                      <span>·</span>
                      <Haker />
                      Sendt
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Skriver-indikatoren — AI eller forvalter. */}
        {(navnNaa === 's1' || navnNaa === 's2' || navnNaa === 's3' || navnNaa === 's4') && (
          <div className="pb-3">
            <Skriver variant={navnNaa === 's3' ? 'forvalter' : 'ai'} />
          </div>
        )}
      </div>

      {/* Composer — systemets eksakte info-linje. */}
      <div className="mt-2">
        <p className="mb-2 flex items-center gap-1.5 pl-1 text-[10.5px] font-medium text-emerald-600">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[7.5px] font-extrabold text-white">
            AI
          </span>
          AI svarer i tråden — synlig for utleier
        </p>
        <div className="flex h-11 items-center rounded-full border border-[#e5ded3] bg-white px-4 text-[12px] text-[#b3aca2]">
          Skriv en melding …
        </div>
      </div>
    </div>
  );
}
