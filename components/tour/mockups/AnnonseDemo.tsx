'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Check, Loader2, ArrowUpRight, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// AnnonseDemo — selvspillende gjengivelse av annonse-flyten i systemet
// (LangtidWizard): bildene lastes opp → AI-en skanner bilde for bilde →
// tittelen skrives med typewriter og beskrivelsen toner inn → markedsestimat
// hentes og «Anbefalt» pris velges → annonsekortet kompileres og publiseres
// på FINN.no med kvittering. Rammeløst, minimalistisk, looper rolig.
// ---------------------------------------------------------------------------

const INK = '#1a1612';
const MUTED = '#7c7466';
const LILLA = '#9B5BD6';

const TITTEL_TEKST = 'Lys 2-roms med balkong';

const TRINN: { navn: string; ms: number; tekst?: string; takt?: number }[] = [
  { navn: 'start', ms: 900 },
  { navn: 'foto1', ms: 420 },
  { navn: 'foto2', ms: 420 },
  { navn: 'foto3', ms: 420 },
  { navn: 'foto4', ms: 700 },
  { navn: 'skann1', ms: 720 },
  { navn: 'skann2', ms: 720 },
  { navn: 'skann3', ms: 720 },
  { navn: 'skann4', ms: 780 },
  { navn: 'genererer', ms: 1050 },
  { navn: 'tittel', ms: TITTEL_TEKST.length * 58 + 520, tekst: TITTEL_TEKST, takt: 58 },
  { navn: 'beskrivelse', ms: 1600 },
  { navn: 'estimat', ms: 1050 },
  { navn: 'pris', ms: 1150 },
  { navn: 'prisvalgt', ms: 1900 },
  { navn: 'annonse', ms: 950 },
  { navn: 'knapp', ms: 1250 },
  { navn: 'trykk', ms: 420 },
  { navn: 'pub1', ms: 800 },
  { navn: 'pub2', ms: 4300 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

const FOTOS = [
  '/interior-dining.webp',
  '/interior-bedroom.webp',
  '/interior-hallway.webp',
  '/interior-bedroom2.webp',
];

const PILLER = [
  { n: 'Lavt', v: '17 200' },
  { n: 'Anbefalt', v: '18 500' },
  { n: 'Høyt', v: '19 800' },
];

export default function AnnonseDemo({ kjorer, onFerdig }: { kjorer: boolean; onFerdig?: () => void }) {
  const [fase, setFase] = useState(0);
  const [tegn, setTegn] = useState(0);
  const ferdigRef = useRef(onFerdig);
  ferdigRef.current = onFerdig;

  useEffect(() => {
    if (!kjorer) {
      setFase(0);
      setTegn(0);
    }
  }, [kjorer]);

  useEffect(() => {
    if (!kjorer) return;
    const t = window.setTimeout(() => {
      const neste = fase + 1;
      if (neste >= TRINN.length) {
        // Flyten er ferdig: meld fra og frys i publisert-tilstand — forelderen
        // starter reisen på nytt.
        if (ferdigRef.current) {
          ferdigRef.current();
        } else {
          setTegn(0);
          setFase(0);
        }
        return;
      }
      setFase(neste);
    }, TRINN[fase].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, fase]);

  useEffect(() => {
    if (!kjorer) return;
    const trinn = TRINN[fase];
    if (!trinn.tekst) return;
    setTegn(0);
    const iv = window.setInterval(() => {
      setTegn((n) => Math.min(n + 1, trinn.tekst!.length));
    }, trinn.takt || 60);
    return () => window.clearInterval(iv);
  }, [kjorer, fase]);

  const er = (navn: string) => fase >= IDX[navn];
  const navnNaa = TRINN[fase].navn;

  const iSkriv = er('genererer') && !er('annonse');
  const iPubl = er('annonse');
  const iBilder = !er('genererer');

  // Hvilket bilde skannes nå (-1 = ingen).
  const skannIdx = navnNaa.startsWith('skann') ? Number(navnNaa.slice(5)) - 1 : -1;
  const skanner = skannIdx >= 0;

  const fade = 'transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]';
  const tittelStil = {
    color: INK,
    fontFamily: 'var(--font-heading), sans-serif',
  } as React.CSSProperties;

  return (
    <div className="relative w-full max-w-[520px] lg:mx-auto" data-testid="tour-annonse-demo">
      <div className="relative h-[440px]">
        {/* --- Skjerm A: Bilder + skanning --------------------------------- */}
        <div
          className={`absolute inset-x-0 top-0 ${fade} ${
            iBilder ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.985] opacity-0'
          }`}
        >
          <p className="text-[17px] font-bold tracking-[-0.02em]" style={tittelStil}>
            {skanner || er('skann1') ? 'Skanner boligen' : 'Last opp bilder'}
          </p>
          <p className="mt-1.5 text-[12.5px]" style={{ color: MUTED }}>
            {skanner || er('skann1')
              ? 'AI-en leser rom, lys og detaljer ut av bildene.'
              : 'Ta dem med mobilen — ingen fotograf nødvendig.'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {FOTOS.map((src, i) => {
              const synlig = er(`foto${i + 1}`);
              const aktivScan = skannIdx === i;
              return (
                <div
                  key={src}
                  className={`relative aspect-[16/10] overflow-hidden rounded-[18px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    synlig ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.94] opacity-0'
                  } ${aktivScan ? 'ring-4 ring-[#9B5BD6]/35' : 'ring-0'}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <span
                    className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm transition-all duration-300 ${
                      aktivScan || (skanner && i < skannIdx) || er('skann4') && i <= 3 && er(`skann${i + 1}`)
                        ? 'scale-100 opacity-100'
                        : 'scale-50 opacity-0'
                    }`}
                  >
                    {aktivScan ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} style={{ color: LILLA }} />
                    ) : (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: LILLA }} />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-[12px]" style={{ color: MUTED }}>
            {skanner ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} style={{ color: LILLA }} />
                Analyserer bilde {skannIdx + 1} av 4
              </>
            ) : er('foto4') ? (
              <>
                <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
                4 bilder lastet opp
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" strokeWidth={2.25} />
                Laster opp …
              </>
            )}
          </p>
        </div>

        {/* --- Skjerm B: AI skriver annonsen ------------------------------- */}
        <div
          className={`absolute inset-x-0 top-0 ${fade} ${
            iSkriv ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.985] opacity-0'
          }`}
        >
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: LILLA }}>
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Skrevet av DigiHome AI
          </p>

          <h4 className="mt-5 min-h-[34px] text-[24px] font-bold leading-[1.15] tracking-[-0.028em] sm:text-[26px]" style={tittelStil}>
            {fase === IDX.tittel ? (TRINN[IDX.tittel].tekst || '').slice(0, tegn) : er('tittel') ? TITTEL_TEKST : ''}
            {fase === IDX.tittel && (
              <span className="ml-[2px] inline-block h-[22px] w-[2px] translate-y-[3px] animate-pulse bg-[#1a1612]" />
            )}
          </h4>

          <p
            className={`mt-3 max-w-[46ch] text-[13.5px] leading-[1.65] transition-all duration-700 ${
              er('beskrivelse') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
            style={{ color: MUTED }}
          >
            Lys og luftig 2-roms i 3. etasje med solrik balkong og nyoppusset kjøkken.
            Kort vei til sentrum, T-bane og Sofienbergparken.
          </p>

          <div className="mt-8 border-t border-[#ede8e0] pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              Leiepris
            </p>

            {/* Estimat-laster — én subtil linje, som i systemet. */}
            <p
              className={`mt-3 flex items-center gap-2 text-[12px] transition-all duration-400 ${
                fase === IDX.estimat ? 'opacity-100' : 'pointer-events-none absolute opacity-0'
              }`}
              style={{ color: MUTED }}
            >
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} />
              Henter markedsestimat …
            </p>

            <div
              className={`mt-3 flex items-stretch gap-2.5 transition-all duration-600 ${
                er('pris') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              {PILLER.map((p, i) => {
                const valgt = i === 1 && er('prisvalgt');
                return (
                  <div
                    key={p.n}
                    className={`flex flex-1 flex-col items-center gap-0.5 rounded-[16px] py-3 transition-all duration-500 ${
                      valgt
                        ? 'bg-[#1a1a1a] text-white shadow-[0_16px_36px_-14px_rgba(10,10,10,0.5)]'
                        : 'border border-[#e5ded3] bg-white'
                    }`}
                  >
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: valgt ? 'rgba(255,255,255,0.55)' : MUTED }}
                    >
                      {p.n}
                    </span>
                    <span className="text-[16px] font-bold tabular-nums" style={{ ...tittelStil, color: valgt ? '#fff' : INK }}>
                      {p.v}
                    </span>
                  </div>
                );
              })}
            </div>

            <p
              className={`mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-opacity duration-500 ${
                er('prisvalgt') ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ color: INK }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
              Innenfor markedsspennet
            </p>
          </div>
        </div>

        {/* --- Skjerm C: Publiser på FINN ---------------------------------- */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center ${fade} ${
            iPubl ? 'scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-[0.985] opacity-0'
          }`}
        >
          <div className="w-full max-w-[350px] overflow-hidden rounded-[24px] border border-[#eee9e2] bg-white shadow-[0_44px_100px_-32px_rgba(10,10,10,0.28)]">
            <div className="relative aspect-[16/9] overflow-hidden">
              <img src="/nyest-hero-portrett.webp" alt="" className="h-full w-full object-cover" />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-[5px] text-[11px] font-semibold backdrop-blur-sm" style={{ color: INK }}>
                Til leie
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-bold tracking-[-0.02em]" style={tittelStil}>
                  {TITTEL_TEKST}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
                  Storgata 12, Oslo · 64 m²
                </p>
              </div>
              <p className="shrink-0 text-[14px] font-bold tabular-nums" style={tittelStil}>
                18 500 kr
              </p>
            </div>
          </div>

          {/* Publiser-knappen — våkner, trykkes, og blir kvittering. */}
          <div className="relative mt-6 w-full max-w-[350px]">
            <div
              className={`flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[14.5px] font-semibold transition-all duration-500 ${
                er('pub1')
                  ? 'bg-[#e8f6ee] text-[#166534]'
                  : er('knapp')
                    ? 'bg-[#1a1a1a] text-white shadow-[0_24px_60px_-24px_rgba(10,10,10,0.45)]'
                    : 'bg-[#f0ece5] text-[#b3aca2]'
              } ${TRINN[fase].navn === 'trykk' ? 'scale-[0.96]' : 'scale-100'}`}
            >
              {er('pub1') ? (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22c55e]">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.75} />
                  </span>
                  Annonsen er live
                </>
              ) : (
                'Publiser annonsen'
              )}
            </div>

            {/* Kanalene — publisert på DigiHome, så på FINN gjennom integrasjonen. */}
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <span
                className={`flex items-center gap-2 rounded-full border border-[#eee9e2] bg-white py-2 pl-3 pr-3.5 text-[12px] font-semibold transition-all duration-500 ${
                  er('pub1') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
                style={{ color: INK }}
              >
                <img src="/digihome-mark.svg" alt="" className="h-4 w-4 rounded-[4px]" />
                DigiHome
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: '#22c55e' }} />
              </span>
              <span
                className={`flex items-center gap-2 rounded-full border border-[#eee9e2] bg-white py-2 pl-3 pr-3.5 transition-all duration-500 ${
                  er('pub2') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
              >
                <img src="/finn-logo.png" alt="FINN.no" className="h-[15px] w-auto rounded-[3px]" />
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: '#22c55e' }} />
              </span>
            </div>

            <p
              className={`mt-4 flex items-center justify-center gap-1 text-[12px] transition-opacity delay-500 duration-700 ${
                er('pub2') ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ color: MUTED }}
            >
              Én annonse, begge kanaler — søknadene lander i portalen
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
