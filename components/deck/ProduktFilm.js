'use client';

/* ═══════════════════ DigiHome — produktfilm (/film) ═══════════════════
   En kodet, selvspillende motion graphics-film — samme teknikk som
   «Tables»-referansen: alt du ser er kode, ingen videoredigering.

   Dramaturgi (~65 sek):
   1) INTRO (mørk): «Introducing» → DigiHome-logo → «Utleie på autopilot.»
   2) PROMPTEN (mørk): eieren skriver «Lei ut leiligheten min i Marken 8.»
      → AI-en jobber steg for steg (annonse, FINN, visninger, kontrakt)
   3) PORTALEN (lys): dashboard → kalenderen fylles → enhetssiden
   4) SYSTEMET (lys): «All utleie. Ett system.» + faktalinjen
   5) OUTRO (mørk): «Utleie på autopilot.» + logo + digihome.no

   Avspilling: klikk starter filmen (perfekt for skjermopptak).
   R = start forfra · F = fullskjerm. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ArrowUp } from 'lucide-react';
import ForvalterFullskjerm from '@/components/tour/mockups/ForvalterFullskjerm';
import AssistentChatMockup from '@/components/tour/mockups/AssistentChatMockup';

/* Fasene i rekkefølge — tidslinjen mapper tidspunkt → fase */
const F = {
  sort: 0,
  introducing: 1,
  logo: 2,
  tagline: 3,
  introUt: 4,
  prompt: 5,
  skriver: 6,
  sender: 7,
  steg: 8,
  klart: 9,
  tenning: 10,
  portal: 11,
  kalender: 12,
  enhet: 13,
  portalUt: 14,
  system: 15,
  systemUt: 16,
  outro: 17,
  outroLogo: 18,
};

const TIDSLINJE = [
  [600, F.introducing],
  [2600, F.logo],
  [5600, F.tagline],
  [8600, F.introUt],
  [9500, F.prompt],
  [10600, F.skriver],
  [13400, F.sender],
  [14700, F.steg],
  [21600, F.klart],
  [23600, F.tenning],
  [24700, F.portal],
  [32500, F.kalender],
  [40500, F.enhet],
  [48000, F.portalUt],
  [49200, F.system],
  [55600, F.systemUt],
  [56700, F.outro],
  [60300, F.outroLogo],
];

const PROMPT = 'Lei ut leiligheten min i Marken 8.';

const AI_STEG = [
  'Analyserer enheten — 3-roms · 74 m² · Marken 8',
  'Skriver annonsetekst og velger bilder',
  'Publiserer til FINN og digihome.no',
  'Legger ut visningstider i kalenderen',
  'Klargjør leiekontrakt for BankID-signering',
];

export default function ProduktFilm() {
  const [startet, setStartet] = useState(false);
  const [fase, setFase] = useState(F.sort);
  const [tegn, setTegn] = useState(0);
  const [antallSteg, setAntallSteg] = useState(0);
  const [skala, setSkala] = useState(0.78);
  const timere = useRef([]);

  /* Skalering av portal-mockupen — cover-skalert som i decket */
  useEffect(() => {
    const maal = () => setSkala(Math.max(window.innerWidth / 1600, window.innerHeight / 1000));
    maal();
    window.addEventListener('resize', maal);
    return () => window.removeEventListener('resize', maal);
  }, []);

  /* Tidslinjen — én kjede av tidspunkter, satt i gang ved klikk */
  const start = useCallback(() => {
    setStartet((var_) => {
      if (var_) return var_;
      TIDSLINJE.forEach(([ved, f]) => {
        timere.current.push(setTimeout(() => setFase(f), ved));
      });
      return true;
    });
  }, []);

  useEffect(() => () => { timere.current.forEach(clearTimeout); }, []);

  /* Tastatur: R = forfra · F = fullskjerm · mellomrom/Enter = start */
  useEffect(() => {
    const paaTast = (e) => {
      if (e.key === 'r' || e.key === 'R') window.location.reload();
      if (e.key === 'f' || e.key === 'F') {
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        } catch (err) { /* stille */ }
      }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); }
    };
    window.addEventListener('keydown', paaTast);
    return () => window.removeEventListener('keydown', paaTast);
  }, [start]);

  /* Skriveanimasjon — naturlig, litt ujevn rytme */
  useEffect(() => {
    if (fase !== F.skriver) return undefined;
    if (tegn >= PROMPT.length) return undefined;
    const t = setTimeout(() => setTegn((n) => n + 1), 30 + Math.random() * 40);
    return () => clearTimeout(t);
  }, [fase, tegn]);

  /* AI-stegene — ett og ett, med jevn puls */
  useEffect(() => {
    if (fase !== F.steg) return undefined;
    if (antallSteg >= AI_STEG.length) return undefined;
    const t = setTimeout(() => setAntallSteg((n) => n + 1), antallSteg === 0 ? 200 : 1250);
    return () => clearTimeout(t);
  }, [fase, antallSteg]);

  const promptSynlig = fase >= F.prompt && fase < F.tenning;
  const portalSynlig = fase >= F.portal && fase < F.portalUt;
  const modul = fase >= F.enhet ? 'enhet' : fase >= F.kalender ? 'kalender' : 'oversikt';

  return (
    <main
      className={`relative h-dvh w-full select-none overflow-hidden bg-[#050505] font-body ${startet ? 'cursor-none' : 'cursor-pointer'}`}
      onClick={start}
      data-testid="film-rot"
    >
      {/* ══ START-HINT — før filmen ruller ══ */}
      {!startet && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <p className="fl-puls text-[13px] tracking-[0.28em] text-white/30">KLIKK FOR Å STARTE FILMEN</p>
        </div>
      )}

      {/* ══ AKT 1 — INTRO (mørk) ══ */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-[opacity,filter] duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${fase >= F.introducing && fase < F.introUt ? 'opacity-100 blur-0' : 'opacity-0 blur-[10px]'}`} data-testid="film-intro">
        {/* Aurora-pust */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="fl-aurora absolute left-1/2 top-[26%] h-[62vh] w-[56vw] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 62%)', filter: 'blur(90px)', opacity: 0.22 }} />
        </div>

        <p className={`text-[clamp(12px,1.1vw,15px)] font-medium tracking-[0.34em] text-white/[0.4] ${fase >= F.introducing ? 'fl-inn' : 'opacity-0'}`}>
          INTRODUCING
        </p>

        <div className={`mt-9 ${fase >= F.logo ? 'fl-foto' : 'opacity-0'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-[clamp(40px,6vh,58px)] w-auto" />
        </div>

        <p className={`mt-9 font-heading text-[clamp(22px,2.6vw,38px)] font-semibold tracking-[-0.025em] text-white/[0.85] ${fase >= F.tagline ? 'fl-inn' : 'opacity-0'}`} style={{ animationDuration: '1.5s' }}>
          Utleie på autopilot<span className="text-[#B57BFF]">.</span>
        </p>
      </div>

      {/* ══ AKT 2 — PROMPTEN + AI-STEGENE (mørk) ══ */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-[opacity,transform,filter] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${promptSynlig ? 'scale-100 opacity-100 blur-0' : 'scale-[1.03] opacity-0 blur-[10px]'}`} data-testid="film-prompt">
        {/* Scenelys */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(52% 42% at 50% 44%, rgba(255,255,255,0.05) 0%, transparent 100%)' }} />

        {/* Prompt-baren */}
        <div className={`relative flex w-[min(680px,88vw)] items-center gap-3 rounded-[26px] border border-white/[0.09] bg-[#161616] py-3 pl-5 pr-3 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] transition-transform duration-700 ${fase >= F.sender ? 'scale-[0.985]' : 'scale-100'}`}>
          <p className="min-h-[24px] flex-1 text-[clamp(14px,1.35vw,17.5px)] tracking-[-0.01em] text-white/[0.92]">
            {fase < F.skriver && <span className="text-white/30">Hva kan jeg hjelpe deg med?</span>}
            {fase >= F.skriver && (
              <>
                {PROMPT.slice(0, tegn)}
                {fase < F.sender && <span className="fl-blink ml-[1px] inline-block h-[1.1em] w-[2px] translate-y-[0.18em] bg-white/90" />}
              </>
            )}
          </p>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${tegn >= PROMPT.length ? 'bg-white text-black' : 'bg-white/10 text-white/30'} ${fase >= F.sender ? 'fl-puls-en' : ''}`}>
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </span>
        </div>

        {/* AI-stegene — steg-for-steg-kvittering */}
        <div className="mt-9 flex min-h-[220px] w-[min(560px,84vw)] flex-col gap-[13px]">
          {AI_STEG.map((s, i) => {
            const synlig = fase >= F.steg && antallSteg > i;
            const ferdig = (fase >= F.steg && antallSteg > i + 1) || fase >= F.klart;
            return (
              <div key={s} className={`flex items-center gap-3.5 transition-[opacity,transform,filter] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${synlig ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-[6px]'}`}>
                <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${ferdig ? 'bg-[#4ade80]/[0.14] text-[#4ade80]' : 'bg-white/[0.07] text-white/40'}`}>
                  {ferdig ? <Check className="h-[11px] w-[11px]" strokeWidth={3} /> : <span className="fl-spinn block h-[10px] w-[10px] rounded-full border border-white/25 border-t-white/70" />}
                </span>
                <p className={`text-[clamp(13px,1.2vw,15.5px)] tracking-[-0.008em] transition-colors duration-500 ${ferdig ? 'text-white/[0.55]' : 'text-white/[0.85]'}`}>{s}</p>
              </div>
            );
          })}

          {/* Klart */}
          <div className={`mt-2 flex items-center gap-3.5 transition-[opacity,transform,filter] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${fase >= F.klart ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-[6px]'}`} data-testid="film-klart">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#4ade80]/[0.16] text-[#4ade80] shadow-[0_0_30px_rgba(74,222,128,0.25)]">
              <Check className="h-[13px] w-[13px]" strokeWidth={3} />
            </span>
            <p className="text-[clamp(14.5px,1.35vw,17.5px)] font-semibold tracking-[-0.01em] text-white/[0.95]">Klart. Leiligheten er ute.</p>
          </div>
        </div>
      </div>

      {/* ══ LYS-TENNING — overgang mørk → lys ══ */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center transition-opacity duration-[1400ms] ${fase === F.tenning ? 'opacity-100' : 'opacity-0'}`}>
        {fase >= F.tenning && fase <= F.portal && (
          <div className="fl-bloom absolute h-[46vmax] w-[46vmax] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.99) 0%, rgba(233,214,255,0.8) 34%, rgba(155,91,214,0.25) 58%, transparent 72%)', filter: 'blur(14px)' }} />
        )}
      </div>

      {/* ══ AKT 3 — PORTALEN (lys) ══ */}
      <div className={`absolute inset-0 overflow-hidden bg-[#fafafa] transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${portalSynlig ? 'scale-100 opacity-100 blur-0' : 'pointer-events-none scale-[0.97] opacity-0 blur-[12px]'}`} data-testid="film-portal">
        <div className="origin-top-left" style={{ width: 1600, transform: `scale(${skala})` }}>
          <ForvalterFullskjerm vis={portalSynlig} modul={modul} />
        </div>

        {/* AI-assistenten glir inn på dashboardet */}
        <div className={`absolute bottom-[4vh] right-[2vw] z-10 transition-[opacity,transform,filter] duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${portalSynlig && modul === 'oversikt' ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-14 opacity-0 blur-[10px]'}`} style={{ width: 'clamp(300px, 20vw, 380px)', transitionDelay: portalSynlig && modul === 'oversikt' ? '1500ms' : '0ms' }}>
          <AssistentChatMockup vis={portalSynlig} />
        </div>

        {/* Fortellerlinje nederst — én rolig setning per modul */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[3vh] z-20 flex justify-center">
          {[
            ['oversikt', 'Alt samlet. Ett sted.'],
            ['kalender', 'Bookinger lander av seg selv.'],
            ['enhet', 'Full kontroll på hver enhet.'],
          ].map(([m, tekst]) => (
            <p key={m} className={`absolute rounded-full border border-black/[0.06] bg-white/85 px-6 py-2.5 text-[clamp(13px,1.2vw,16px)] font-medium tracking-[-0.01em] text-[#3d3d40] shadow-[0_16px_44px_-14px_rgba(15,15,15,0.18)] backdrop-blur-md transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${modul === m && portalSynlig ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`} style={{ transitionDelay: modul === m ? '1200ms' : '0ms' }}>
              {tekst}
            </p>
          ))}
        </div>
      </div>

      {/* ══ AKT 4 — SYSTEMET (lys tagline) ══ */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-[#fafafa] px-8 text-center transition-[opacity,transform,filter] duration-[1300ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${fase >= F.system && fase < F.systemUt ? 'scale-100 opacity-100 blur-0' : 'pointer-events-none scale-[1.02] opacity-0 blur-[12px]'}`} data-testid="film-system">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% 42%, rgba(124,58,237,0.05) 0%, transparent 100%)' }} />
        <h2 className="font-heading text-[clamp(38px,5.2vw,80px)] font-bold leading-[1.06] tracking-[-0.035em] text-[#0f0f0f]">
          {fase >= F.system && fase < F.systemUt && (
            <>
              <span className="fl-ord" style={{ animationDelay: '250ms' }}>All</span>{' '}
              <span className="fl-ord" style={{ animationDelay: '420ms' }}>utleie.</span>{' '}
              <span className="fl-ord" style={{ animationDelay: '750ms' }}>Ett</span>{' '}
              <span className="fl-ord" style={{ animationDelay: '920ms' }}>system.</span>
            </>
          )}
        </h2>
        <p className={`mt-8 text-[clamp(13px,1.3vw,17px)] font-medium tracking-[-0.005em] text-[#86868b] ${fase >= F.system && fase < F.systemUt ? 'fl-inn' : 'opacity-0'}`} style={{ animationDelay: '1700ms' }}>
          <span className="font-semibold text-[#0f0f0f]">Web og mobil app</span>
          <span className="mx-2.5 text-[#c7c7cc]">·</span>
          <span className="font-semibold text-[#0f0f0f]">10+ moduler</span>
          <span className="mx-2.5 text-[#c7c7cc]">·</span>
          <span className="font-semibold text-[#0f0f0f]">15+ integrasjoner</span>
        </p>
      </div>

      {/* ══ AKT 5 — OUTRO (mørk) ══ */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-[#050505] px-8 text-center transition-opacity duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${fase >= F.outro ? 'opacity-100' : 'pointer-events-none opacity-0'}`} data-testid="film-outro">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="fl-aurora absolute left-1/2 top-[30%] h-[58vh] w-[52vw] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 62%)', filter: 'blur(90px)', opacity: 0.2 }} />
        </div>

        <h2 className="font-heading text-[clamp(40px,5.8vw,92px)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
          {fase >= F.outro && (
            <>
              <span className="fl-ord" style={{ animationDelay: '300ms' }}>Utleie</span>{' '}
              <span className="fl-ord" style={{ animationDelay: '520ms' }}>på</span>{' '}
              <span className="fl-ord" style={{ animationDelay: '740ms' }}>
                <span className="fl-glans">autopilot</span>.
              </span>
            </>
          )}
        </h2>

        <div className={`mt-14 flex flex-col items-center gap-5 ${fase >= F.outroLogo ? 'fl-foto' : 'opacity-0'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-[clamp(28px,4vh,38px)] w-auto" />
          <p className="text-[12px] tracking-[0.26em] text-white/[0.3]">DIGIHOME.NO</p>
        </div>
      </div>

      {/* ══ Kinematografi — fl-prefiks (kolliderer ikke med decket) ══ */}
      <style jsx global>{`
        @keyframes flInn {
          from { opacity: 0; transform: translateY(14px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .fl-inn { opacity: 0; animation: flInn 1.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

        @keyframes flOrd {
          from { opacity: 0; transform: translateY(0.35em); filter: blur(16px); }
          60% { filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .fl-ord { opacity: 0; display: inline-block; animation: flOrd 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes flFoto {
          from { opacity: 0; transform: translateY(14px) scale(0.94); filter: blur(16px); }
          65% { filter: blur(2px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .fl-foto { opacity: 0; animation: flFoto 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .fl-glans {
          background: linear-gradient(108deg, #ffffff 34%, #dcc6ff 50%, #ffffff 66%);
          background-size: 240% 100%;
          background-position: 108% 0;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: flGlans 2.2s cubic-bezier(0.45, 0, 0.2, 1) 2.3s forwards;
        }
        @keyframes flGlans {
          from { background-position: 108% 0; }
          to { background-position: -60% 0; }
        }

        @keyframes flBlink {
          0%, 46% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .fl-blink { animation: flBlink 1.05s steps(1) infinite; }

        @keyframes flSpinn {
          to { transform: rotate(360deg); }
        }
        .fl-spinn { animation: flSpinn 0.9s linear infinite; }

        @keyframes flPuls {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 0.6; }
        }
        .fl-puls { animation: flPuls 2.4s ease-in-out infinite; }

        @keyframes flPulsEn {
          0% { transform: scale(1); }
          38% { transform: scale(0.82); }
          100% { transform: scale(1); }
        }
        .fl-puls-en { animation: flPulsEn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1; }

        @keyframes flAurora {
          from { transform: translate(-50%, 0) scale(1); }
          to { transform: translate(-44%, -5%) scale(1.16); }
        }
        .fl-aurora { animation: flAurora 20s ease-in-out infinite alternate; }

        @keyframes flBloom {
          0% { opacity: 0; transform: scale(0.25); }
          45% { opacity: 1; }
          100% { opacity: 1; transform: scale(3); }
        }
        .fl-bloom { animation: flBloom 2.2s cubic-bezier(0.3, 0, 0.25, 1) forwards; }

        @media (prefers-reduced-motion: reduce) {
          .fl-aurora, .fl-bloom, .fl-spinn { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
