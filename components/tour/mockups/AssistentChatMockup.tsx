import React, { useEffect, useState } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Sparkles, ArrowUp, Minus, Droplets, FileSignature, Home } from 'lucide-react';

// ---------------------------------------------------------------------------
// AssistentChatMockup — DigiHomes AI-driftsassistent som flytende glasspanel
// over forvalterportalen i Bergen Urban-revealen.
// Moderne «Apple Intelligence»-språk: frostet glass (backdrop-blur over
// dashbordet), levende gradient-ramme, gradient-orb, mini-kort for
// prioriteringene og glødende gradient-sendeknapp.
// `vis`-prop koreograferer samtalen: brukerboble → tenkeprikker → svar →
// handlingsknapper. Alle data er fiktive demo-data.
// ---------------------------------------------------------------------------

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });

const PRIORITERINGER = [
  { Ikon: Droplets, c: '#5f8fbf', bg: 'rgba(125,164,201,0.16)', tekst: 'Vannlekkasje på badet', detalj: 'rørlegger bekreftet kl. 12:00' },
  { Ikon: FileSignature, c: '#7c68c4', bg: 'rgba(139,126,199,0.16)', tekst: 'Leiekontrakt Marken 8', detalj: 'sendt til BankID-signering' },
  { Ikon: Home, c: '#b98d4f', bg: 'rgba(201,160,106,0.16)', tekst: '2 ledige enheter', detalj: 'annonseutkast klart til godkjenning' },
];

export default function AssistentChatMockup({ vis = true }: { vis?: boolean }) {
  // Faser: 0 = tom · 1 = brukerboble · 2 = tenker · 3 = svar · 4 = handlinger
  const [fase, setFase] = useState(0);

  useEffect(() => {
    if (!vis) { setFase(0); return undefined; }
    const ts = [
      setTimeout(() => setFase(1), 2350),
      setTimeout(() => setFase(2), 3100),
      setTimeout(() => setFase(3), 4400),
      setTimeout(() => setFase(4), 5400),
    ];
    return () => ts.forEach(clearTimeout);
  }, [vis]);

  return (
    <div className={`${jakarta.className} relative`}>
      {/* Ambient glød bak panelet */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-5 rounded-[40px] opacity-60"
        style={{ background: 'radial-gradient(60% 55% at 50% 60%, rgba(124,58,237,0.35) 0%, transparent 70%)', filter: 'blur(30px)' }}
      />

      {/* Levende gradient-ramme */}
      <div
        className="dh-ai-ramme relative rounded-[26px] p-[1.5px]"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.6) 0%, rgba(207,151,252,0.35) 28%, rgba(255,255,255,0.5) 50%, rgba(181,123,255,0.4) 72%, rgba(124,58,237,0.6) 100%)',
          boxShadow: '0 40px 110px -22px rgba(50,20,100,0.45), 0 6px 24px rgba(40,20,80,0.18)',
        }}
      >
        {/* Frostet glasspanel — dashbordet skimtes gjennom */}
        <div
          className="overflow-hidden rounded-[24.5px]"
          style={{
            backgroundColor: 'rgba(252,251,255,0.78)',
            backdropFilter: 'blur(26px) saturate(1.45)',
            WebkitBackdropFilter: 'blur(26px) saturate(1.45)',
          }}
        >
          {/* Topplinje — minimal, glass */}
          <div className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3.5">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#7c3aed]/25" style={{ animationDuration: '2.6s' }} />
              <span
                className="relative flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: 'linear-gradient(140deg, #7c3aed 0%, #a78bfa 55%, #cf97fc 100%)', boxShadow: '0 4px 16px rgba(124,58,237,0.45)' }}
              >
                <Sparkles className="h-[16px] w-[16px] text-white" strokeWidth={2} />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[13.5px] font-bold tracking-tight text-[#1a1a1a]">
                Driftsassistent
                <span
                  className="rounded-full px-1.5 py-[1px] text-[8.5px] font-bold tracking-wide text-white"
                  style={{ background: 'linear-gradient(120deg, #7c3aed, #b57bff)' }}
                >
                  AI
                </span>
              </p>
              <p className="mt-[1px] flex items-center gap-1.5 text-[10.5px] text-[#8a8a8e]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34c759]" /> Aktiv nå · svarer på sekunder
              </p>
            </div>
            <Minus className="h-4 w-4 text-[#b8b5be]" strokeWidth={2} />
          </div>

          {/* Samtalen */}
          <div className="space-y-2.5 px-4 py-4">
            {/* Brukerens spørsmål */}
            {fase >= 1 && (
              <div className="dh-ai-inn flex justify-end">
                <div className="rounded-[18px] rounded-br-[6px] bg-[#1a1a1a] px-3.5 py-2 text-[12.5px] font-medium text-white shadow-[0_3px_12px_rgba(20,15,30,0.2)]">
                  Hva bør jeg følge opp i dag?
                </div>
              </div>
            )}

            {/* Tenkeprikker */}
            {fase === 2 && (
              <div className="dh-ai-inn flex justify-start">
                <div className="flex items-center gap-[5px] rounded-[18px] rounded-bl-[6px] border border-black/[0.05] bg-white/70 px-3.5 py-3">
                  <span className="dh-ai-dot h-[6px] w-[6px] rounded-full bg-[#7c3aed]/70" />
                  <span className="dh-ai-dot h-[6px] w-[6px] rounded-full bg-[#7c3aed]/70" style={{ animationDelay: '0.16s' }} />
                  <span className="dh-ai-dot h-[6px] w-[6px] rounded-full bg-[#7c3aed]/70" style={{ animationDelay: '0.32s' }} />
                </div>
              </div>
            )}

            {/* Assistentens svar */}
            {fase >= 3 && (
              <div className="dh-ai-inn">
                <p className="px-0.5 text-[12.5px] leading-snug text-[#2d2d2d]">
                  God morgen! Tre ting krever oppmerksomhet i dag:
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {PRIORITERINGER.map((p, i) => (
                    <div
                      key={p.tekst}
                      className="dh-ai-inn flex items-center gap-2.5 rounded-[14px] border border-black/[0.05] bg-white/75 px-3 py-2.5 shadow-[0_2px_10px_rgba(20,15,30,0.05)]"
                      style={{ animationDelay: `${180 + i * 160}ms` }}
                    >
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: p.bg }}>
                        <p.Ikon className="h-[14px] w-[14px]" style={{ color: p.c }} strokeWidth={2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold leading-tight text-[#1a1a1a]">{p.tekst}</span>
                        <span className="block truncate text-[11px] leading-tight text-[#8a8a8e]">{p.detalj}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Handlinger */}
                {fase >= 4 && (
                  <div className="dh-ai-inn mt-2.5 flex gap-2" style={{ animationDelay: '80ms' }}>
                    <span
                      className="rounded-full px-3.5 py-2 text-[11.5px] font-semibold text-white"
                      style={{ background: 'linear-gradient(120deg, #7c3aed, #b57bff)', boxShadow: '0 6px 18px rgba(124,58,237,0.4)' }}
                    >
                      Godkjenn annonser
                    </span>
                    <span className="rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-2 text-[11.5px] font-semibold text-[#1a1a1a]">
                      Åpne saker
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Skrivefelt */}
          <div className="flex items-center gap-2 border-t border-black/[0.05] px-3.5 py-3">
            <div className="flex h-10 flex-1 items-center gap-2 rounded-full border border-black/[0.06] bg-black/[0.035] px-4">
              <Sparkles className="h-[13px] w-[13px] text-[#a78bfa]" strokeWidth={2} />
              <span className="text-[12px] text-[#b8b5be]">Spør assistenten …</span>
            </div>
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: 'linear-gradient(140deg, #7c3aed, #b57bff)', boxShadow: '0 6px 18px rgba(124,58,237,0.45)' }}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
            </span>
          </div>
        </div>
      </div>

      {/* Lokale animasjoner */}
      <style jsx global>{`
        @keyframes dhAiRamme {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .dh-ai-ramme { background-size: 300% 300% !important; animation: dhAiRamme 9s ease-in-out infinite; }
        @keyframes dhAiInn {
          from { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .dh-ai-inn { animation: dhAiInn 0.75s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes dhAiDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        .dh-ai-dot { animation: dhAiDot 1.15s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .dh-ai-ramme, .dh-ai-inn, .dh-ai-dot { animation: none !important; }
          .dh-ai-inn { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
