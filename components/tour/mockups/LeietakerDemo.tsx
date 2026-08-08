'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, UserCheck, Star, ShieldCheck } from 'lucide-react';

// ---------------------------------------------------------------------------
// LeietakerDemo — tro replika av systemets «Kandidatoversikt» (fra produktets
// egen kandidatvisning): hvitt kort med header og Matchanalyse-chip, rangerte
// rader med rank, avatar, inntekt/ratio/husstand, score-flis og status-pill —
// pluss det mørke AI-anbefalingskortet med lavendel-accent. Selvspillende:
// søknadene tikker inn → AI-en scorer → listen sorterer seg selv → kreditt-
// sjekk via Creditsafe → anbefaling. Looper rolig.
// ---------------------------------------------------------------------------

const INK = '#0a0a0a';
const LAVENDEL = '#cf97fc'; // systemets accent på mørk flate

const TRINN: { navn: string; ms: number }[] = [
  { navn: 'start', ms: 1100 },
  { navn: 'sok1', ms: 560 },
  { navn: 'sok2', ms: 560 },
  { navn: 'sok3', ms: 560 },
  { navn: 'sok4', ms: 1000 },
  { navn: 'analyse', ms: 1600 },
  { navn: 'rangert', ms: 1400 },
  { navn: 'kreditt', ms: 1800 },
  { navn: 'anbefalt', ms: 1200 },
  { navn: 'ai', ms: 5200 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

// Kandidatene i endelig (rangert) rekkefølge — data og statusfarger fra
// systemets kandidatoversikt. `ankomst` er rekkefølgen søknadene tikker inn i.
const KANDIDATER = [
  {
    navn: 'Emma Strand',
    foto: 'https://images.unsplash.com/photo-1610659523060-816c02b94529?w=80&h=80&fit=crop&crop=face',
    score: 94,
    inntekt: '72 000 kr/mnd',
    ratio: 5.9,
    pers: '1 pers',
    status: 'Kredittsjekk OK',
    sc: '#059669',
    sb: '#ecfdf5',
    ankomst: 1,
  },
  {
    navn: 'Sara Olsen',
    foto: 'https://images.unsplash.com/photo-1758523672300-500f7148726c?w=80&h=80&fit=crop&crop=face',
    score: 87,
    inntekt: '65 000 kr/mnd',
    ratio: 5.3,
    pers: '2 pers',
    status: 'Kredittsjekk OK',
    sc: '#059669',
    sb: '#ecfdf5',
    ankomst: 3,
  },
  {
    navn: 'Kristian Dahl',
    foto: 'https://images.unsplash.com/photo-1758874574397-e56dfcfc116d?w=80&h=80&fit=crop&crop=face',
    score: 76,
    inntekt: '55 000 kr/mnd',
    ratio: 4.5,
    pers: '2 pers',
    status: 'Venter på sjekk',
    sc: '#d97706',
    sb: '#fff7ed',
    ankomst: 0,
  },
  {
    navn: 'Mia Larsen',
    foto: null,
    score: 68,
    inntekt: '48 000 kr/mnd',
    ratio: 3.9,
    pers: '3 pers',
    status: 'Lav ratio',
    sc: '#999999',
    sb: '#f5f3f0',
    ankomst: 2,
  },
];

const RH = 72; // radhøyde i kortet

// Score-flisenes palett — som i systemet.
const scoreStil = (s: number): React.CSSProperties =>
  s >= 90
    ? { background: '#059669', color: '#fff' }
    : s >= 80
      ? { background: '#d4edda', color: '#059669' }
      : s >= 70
        ? { background: '#fff7ed', color: '#d97706' }
        : { background: '#f5f3f0', color: '#999' };

const ratioFarge = (r: number) => (r >= 5 ? '#059669' : r >= 3 ? '#d97706' : '#ef4444');

export default function LeietakerDemo() {
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
      { threshold: 0.35 }
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
  const antall = [1, 2, 3, 4].filter((i) => er(`sok${i}`)).length;
  const rangert = er('rangert');

  const F = { fontFamily: 'var(--font-heading), sans-serif' } as React.CSSProperties;

  return (
    <div ref={rot} className="relative w-full max-w-[520px] lg:mx-auto" data-testid="tour-leietaker-demo">
      {/* --- Kandidatoversikten — systemets kort ---------------------------- */}
      <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_60px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f5f3f0] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#0a0a0a]">
              <UserCheck className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ ...F, color: INK }}>
                Kandidatoversikt
              </p>
              <p className="text-[10.5px] text-[#aaa]">
                Storgata 12, Oslo ·{' '}
                {antall === 0
                  ? 'annonsen er live'
                  : er('analyse')
                    ? '4 kandidater'
                    : `${antall} ${antall === 1 ? 'ny søknad' : 'nye søknader'}`}
              </p>
            </div>
          </div>
          {/* Matchanalyse-chip — våkner når AI-en begynner å vurdere. */}
          <div
            className={`flex h-7 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3 text-[10px] font-bold text-white transition-all duration-500 ${
              er('analyse') ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
            }`}
            style={F}
          >
            {er('rangert') ? (
              <Sparkles className="h-3 w-3" style={{ color: LAVENDEL }} />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: LAVENDEL }} />
            )}
            Matchanalyse
          </div>
        </div>

        {/* Kandidatradene — tikker inn og sorterer seg selv. */}
        <div className="relative" style={{ height: KANDIDATER.length * RH }}>
          {KANDIDATER.map((k, i) => {
            const synlig = er(`sok${k.ankomst + 1}`);
            const slot = rangert ? i : k.ankomst;
            const anbefalt = i === 0 && er('anbefalt');
            return (
              <div
                key={k.navn}
                className={`absolute inset-x-0 top-0 flex items-center gap-3 border-b border-[#f5f3f0] px-5 transition-all duration-[750ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  anbefalt ? 'bg-[#f0fdf4]' : 'bg-white'
                }`}
                style={{
                  height: RH,
                  transform: `translateY(${slot * RH + (synlig ? 0 : 18)}px)`,
                  opacity: synlig ? 1 : 0,
                  zIndex: KANDIDATER.length - i,
                }}
              >
                {/* Rank — toner inn når listen er rangert. */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold transition-all duration-500 ${
                    rangert ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  } ${i === 0 ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f3f0] text-[#aaa]'}`}
                  style={F}
                >
                  {i + 1}
                </div>

                {/* Avatar */}
                {k.foto ? (
                  <img src={k.foto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b8a98f]">
                    <span className="text-[10px] font-bold text-white">
                      {k.navn.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12.5px] font-bold" style={{ ...F, color: INK }}>
                      {k.navn}
                    </p>
                    {/* Kredittsjekk-hake på mobil, der status-pillen er skjult. */}
                    {k.status === 'Kredittsjekk OK' && (
                      <ShieldCheck
                        className={`h-[14px] w-[14px] shrink-0 transition-all duration-500 sm:hidden ${
                          er('kreditt') ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                        }`}
                        strokeWidth={2}
                        style={{ color: '#059669' }}
                      />
                    )}
                    {anbefalt && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[9px] font-bold text-[#059669]">
                        <Star className="h-2.5 w-2.5" />
                        Anbefalt
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2.5 text-[10.5px]">
                    <span className="text-[#aaa]">{k.inntekt}</span>
                    <span className="font-semibold tabular-nums" style={{ color: ratioFarge(k.ratio) }}>
                      {String(k.ratio).replace('.', ',')}×
                    </span>
                    <span className="text-[#aaa]">{k.pers}</span>
                  </div>
                </div>

                {/* Status-pill — resultatet av kredittsjekken. Skjult på mobil. */}
                <span
                  className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold transition-all duration-500 sm:inline-block ${
                    er('kreditt') ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                  }`}
                  style={{ color: k.sc, backgroundColor: k.sb }}
                >
                  {k.status}
                </span>

                {/* Score-flis */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[15px] font-bold tabular-nums transition-all duration-500 ${
                    rangert ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                  style={{ ...F, ...scoreStil(k.score) }}
                >
                  {k.score}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- AI-anbefalingen — systemets mørke kort -------------------------- */}
      <div
        className={`mt-3.5 flex items-start gap-3.5 rounded-[18px] bg-[#0a0a0a] px-5 py-4 shadow-[0_8px_40px_rgba(0,0,0,0.15)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          er('ai') ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: `${LAVENDEL}20` }}
        >
          <Sparkles className="h-4 w-4" style={{ color: LAVENDEL }} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-bold text-white" style={F}>
            AI-anbefaling
          </p>
          <p className="text-[11px] leading-[1.65] text-white/50">
            <span className="font-semibold text-white/80">Emma Strand</span> scorer høyest med 94/100.
            Stabil inntekt (5,9× ratio), én person, godkjent kredittsjekk. Anbefales som leietaker.
          </p>
        </div>
      </div>
    </div>
  );
}
