'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building2, ChevronLeft, ArrowUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// ChatDemo — leietakerens meldingstråd i telefonen, tro mot systemets
// TenantInbox: lilla gradient for leietaker, emerald for DigiHome AI med
// AI-header, hvit for forvalteren. Neste nivå-reveal: Emmas meldinger
// skrives live i composeren med markør, send-knappen våkner og trykkes,
// boblene fjærer inn fra sitt hjørne — og til slutt popper utleiervarselet
// opp ved siden av telefonen: Anna ser alt, uten å ha gjort noe.
// ---------------------------------------------------------------------------

const M1 = 'Hei! Strømmen gikk akkurat i hele leiligheten 😅';
const M3 = 'Ja! Skrudde den på, men den slår seg av igjen etter noen sekunder.';
const M6 = 'Supert, tusen takk for kjapt svar! 🙏';

const G = (s: string) => Array.from(s); // grafem-trygg splitting (emoji)

const TRINN: { navn: string; ms: number; tekst?: string; takt?: number }[] = [
  { navn: 'start', ms: 900 },
  { navn: 't1', ms: G(M1).length * 26 + 420, tekst: M1, takt: 26 },
  { navn: 'send1', ms: 260 },
  { navn: 'm1', ms: 1100 },
  { navn: 's1', ms: 1300 },
  { navn: 'm2', ms: 2400 },
  { navn: 't3', ms: G(M3).length * 20 + 420, tekst: M3, takt: 20 },
  { navn: 'send3', ms: 260 },
  { navn: 'm3', ms: 1100 },
  { navn: 's2', ms: 1300 },
  { navn: 'm4', ms: 2400 },
  { navn: 'sak1', ms: 1700 },
  { navn: 's3', ms: 1500 },
  { navn: 'm5', ms: 2900 },
  { navn: 't6', ms: G(M6).length * 24 + 380, tekst: M6, takt: 24 },
  { navn: 'send6', ms: 260 },
  { navn: 'm6', ms: 1400 },
  { navn: 'dato2', ms: 1200 },
  { navn: 'sak2', ms: 1600 },
  { navn: 's4', ms: 1300 },
  { navn: 'm7', ms: 3400 },
  { navn: 'eier', ms: 2400 },
  { navn: 'slutt', ms: 5800 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

const SENDES: Record<string, string> = { send1: M1, send3: M3, send6: M6 };

type Rad =
  | { type: 'dato'; id: string; tekst: string }
  | { type: 'chip'; id: string; tekst: string; farge: string }
  | { type: 'melding'; id: string; fra: 'meg' | 'ai' | 'forvalter'; tid: string; tekst: string };

const RADER: Rad[] = [
  { type: 'dato', id: 'start', tekst: 'I dag' },
  { type: 'melding', id: 'm1', fra: 'meg', tid: '21:47', tekst: M1 },
  {
    type: 'melding',
    id: 'm2',
    fra: 'ai',
    tid: '21:47',
    tekst: 'Hei Emma! Det ordner vi. Sjekk sikringsskapet i gangen — står hovedbryteren øverst på AV?',
  },
  { type: 'melding', id: 'm3', fra: 'meg', tid: '21:49', tekst: M3 },
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
  { type: 'melding', id: 'm6', fra: 'meg', tid: '22:01', tekst: M6 },
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

const FJAER = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

function Skriver({ variant }: { variant: 'ai' | 'forvalter' }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-[20px] rounded-bl-[6px] px-[13px] py-[11px]" style={BOBLE[variant]}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-[5px] w-[5px] animate-bounce rounded-full"
            style={{ background: variant === 'ai' ? '#059669' : '#b3aca2', animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Haker() {
  return (
    <svg viewBox="0 0 18 12" className="h-[8px] w-[12px]" fill="none">
      <path d="M1 6.5l3.5 3.5L11 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 6.5l3.5 3.5L17 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ChatDemo() {
  const rot = useRef<HTMLDivElement | null>(null);
  const [kjorer, setKjorer] = useState(false);
  const [fase, setFase] = useState(0);
  const [tegn, setTegn] = useState(0);

  useEffect(() => {
    const el = rot.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setKjorer(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setKjorer(entry.isIntersecting);
        if (!entry.isIntersecting) {
          setFase(0);
          setTegn(0);
        }
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

  // Typewriter i composeren for Emmas meldinger.
  useEffect(() => {
    if (!kjorer) return;
    const trinn = TRINN[fase];
    if (!trinn.tekst) return;
    setTegn(0);
    const lengde = G(trinn.tekst).length;
    const iv = window.setInterval(() => {
      setTegn((n) => Math.min(n + 1, lengde));
    }, trinn.takt || 24);
    return () => window.clearInterval(iv);
  }, [kjorer, fase]);

  const er = (navn: string) => fase >= IDX[navn];
  const navnNaa = TRINN[fase].navn;

  const skriverNaa = Boolean(TRINN[fase].tekst);
  const composerTekst = skriverNaa
    ? G(TRINN[fase].tekst!).slice(0, tegn).join('')
    : SENDES[navnNaa] || '';
  const harTekst = composerTekst.length > 0;
  const trykker = navnNaa.startsWith('send');

  const sisteMin = er('m6') ? 'm6' : er('m3') ? 'm3' : 'm1';

  return (
    <div ref={rot} className="relative w-full max-w-[420px] lg:mx-auto" data-testid="tour-chat-demo">
      {/* --- Telefonen ------------------------------------------------------- */}
      <div className="mx-auto w-[300px] sm:w-[312px]">
        <div className="rounded-[42px] bg-[#0a0a0a] p-[7px] shadow-[0_70px_140px_-40px_rgba(10,10,10,0.55)] ring-1 ring-black/30">
          <div className="relative overflow-hidden rounded-[35px] bg-[#faf8f5]">
            {/* Notch */}
            <div className="absolute left-1/2 top-2.5 z-10 h-[17px] w-[62px] -translate-x-1/2 rounded-full bg-black" />

            {/* App-header */}
            <div className="flex items-center gap-2.5 border-b border-[#f0ebe4] bg-[#faf8f5] px-3.5 pb-2.5 pt-9">
              <ChevronLeft className="h-4 w-4 shrink-0 text-[#7c7466]" strokeWidth={2.25} />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[11px] font-bold text-white">
                AI
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold leading-tight tracking-[-0.01em] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>
                  DigiHome
                </p>
                <p className="mt-[1px] flex items-center gap-1 text-[9.5px] text-[#7c7466]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  Svarer på sekunder
                </p>
              </div>
            </div>

            {/* Tråden — nye bobler skyver de eldre opp gjennom fade-masken. */}
            <div
              className="flex h-[380px] flex-col justify-end px-3 pb-1"
              style={{
                maskImage: 'linear-gradient(180deg, transparent 0%, black 12%)',
                WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 12%)',
              }}
            >
              {RADER.map((r) => {
                const synlig = er(r.id);
                const wrapper = `transition-all duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  synlig ? 'max-h-[200px] opacity-100' : 'max-h-0 overflow-hidden opacity-0'
                }`;

                if (r.type === 'dato') {
                  return (
                    <div key={r.id} className={wrapper}>
                      <div className="flex justify-center pb-3 pt-1.5">
                        <span
                          className="inline-block rounded-full border border-[#ece6da] bg-white px-2.5 py-[3px] text-[9.5px] font-bold tabular-nums text-[#5e5749] transition-transform duration-500"
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
                      <div className="flex justify-center py-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#ece6da] bg-white px-2.5 py-[3px] text-[9px] font-bold text-[#5e5749] transition-transform duration-500"
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
                    <div className="space-y-[3px] pb-2.5">
                      {m.fra === 'ai' && (
                        <div className="flex items-center gap-1.5 pb-[2px] pl-1">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[7.5px] font-bold text-white">
                            AI
                          </span>
                          <span className="text-[9.5px] font-semibold tracking-[-0.005em] text-emerald-700">DigiHome AI</span>
                        </div>
                      )}
                      {m.fra === 'forvalter' && (
                        <div className="flex items-center gap-1.5 pb-[2px] pl-1">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0a0a0a]">
                            <Building2 className="h-2 w-2 text-white" strokeWidth={2} />
                          </span>
                          <span className="text-[9.5px] font-semibold tracking-[-0.005em] text-[#6b6050]">Martin · Forvaltningen</span>
                        </div>
                      )}

                      <div className={`flex ${erMeg ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] whitespace-pre-wrap px-[13px] py-[8px] text-[11px] leading-[1.5] tracking-[-0.005em] text-[#0a0a0a] transition-transform duration-500 ${
                            erMeg
                              ? 'origin-bottom-right rounded-[20px] rounded-br-[5px]'
                              : 'origin-bottom-left rounded-[20px] rounded-bl-[5px]'
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

                      <div className={`flex items-center gap-1 ${erMeg ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                        <span className="text-[8.5px] font-medium uppercase tracking-[0.04em] text-[#7c7466] tabular-nums">{m.tid}</span>
                        {erMeg && sisteMin === m.id && (
                          <span className="inline-flex items-center gap-0.5 text-[8.5px] font-medium uppercase tracking-[0.04em] text-[#7c7466]">
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

              {(navnNaa === 's1' || navnNaa === 's2' || navnNaa === 's3' || navnNaa === 's4') && (
                <div className="pb-2.5">
                  <Skriver variant={navnNaa === 's3' ? 'forvalter' : 'ai'} />
                </div>
              )}
            </div>

            {/* Composer — Emmas meldinger skrives live her. */}
            <div className="border-t border-[#f0ebe4] px-3 pb-3 pt-2">
              <p className="mb-1.5 flex items-center gap-1 pl-1 text-[8.5px] font-medium text-emerald-600">
                <span className="flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[6px] font-extrabold text-white">
                  AI
                </span>
                AI svarer i tråden — synlig for utleier
              </p>
              <div className="flex items-center gap-2">
                <div className="flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-full border border-[#e5ded3] bg-white px-3">
                  {harTekst ? (
                    <span className="truncate text-[10.5px] text-[#0a0a0a]">
                      {composerTekst}
                      {skriverNaa && <span className="ml-[1px] inline-block h-[11px] w-[1.5px] translate-y-[2px] animate-pulse bg-[#0a0a0a]" />}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-[#b3aca2]">Skriv en melding …</span>
                  )}
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    harTekst ? 'bg-[#0a0a0a]' : 'bg-[#f0ece5]'
                  } ${trykker ? 'scale-[0.85]' : 'scale-100'}`}
                >
                  <ArrowUp className={`h-4 w-4 ${harTekst ? 'text-white' : 'text-[#b3aca2]'}`} strokeWidth={2.25} />
                </span>
              </div>
            </div>

            {/* Hjem-indikator */}
            <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-black/15" />
          </div>
        </div>
      </div>

      {/* --- Utleiervarselet — Annas perspektiv (desktop) -------------------- */}
      <div
        className={`absolute -right-4 bottom-20 hidden w-[224px] rotate-2 rounded-[18px] bg-white p-4 shadow-[0_30px_70px_-24px_rgba(10,10,10,0.3),0_0_0_1px_rgba(0,0,0,0.03)] transition-all duration-600 lg:block xl:-right-10 ${
          er('eier') ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-90 opacity-0'
        }`}
        style={{ transitionTimingFunction: FJAER }}
      >
        <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#7c7466]">Varsel · Huseierportalen</p>
        <div className="mt-2.5 flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[10px] font-bold text-white">
            AB
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold leading-snug text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>
              Sak #1042 løst
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-[#7c7466]">Ingen handling nødvendig. Storgata 12 · 09:42</p>
          </div>
        </div>
      </div>
    </div>
  );
}
