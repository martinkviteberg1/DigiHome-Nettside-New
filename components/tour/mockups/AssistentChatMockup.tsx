import React, { useEffect, useState } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Bot, Sparkles, ArrowUp, Minus, Droplets, FileSignature, Home } from 'lucide-react';

// ---------------------------------------------------------------------------
// AssistentChatMockup — DigiHomes AI-driftsassistent som flytende chatpanel
// over forvalterportalen i Bergen Urban-revealen. Samme designspråk som
// appen (Plus Jakarta Sans, #1a1a1a, aksent #d298ff/#7c3aed, kort #ffffff).
// `vis`-prop starter en koreografert samtale: brukerboble → tenkeprikker →
// assistentens svar med dagens prioriteringer → handlingsknapper.
// Alle data er fiktive demo-data.
// ---------------------------------------------------------------------------

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });

const C = {
  bg: '#fdfcfb', card: '#ffffff', border: '#eae7ef',
  text: '#2d2d2d', sub: '#8a8a8e', muted: '#b8b5be',
  accent: '#d298ff', invBg: '#1a1a1a',
  blue: '#7da4c9', blueBg: '#edf3f9',
  amber: '#c9a06a', amberBg: '#faf4eb',
  purple: '#8b7ec7', purpleBg: '#f0edf7',
};

const PRIORITERINGER = [
  { Ikon: Droplets, c: C.blue, bg: C.blueBg, tekst: 'Vannlekkasje på badet', detalj: 'rørlegger bekreftet kl. 12:00' },
  { Ikon: FileSignature, c: C.purple, bg: C.purpleBg, tekst: 'Leiekontrakt Marken 8', detalj: 'sendt til BankID-signering' },
  { Ikon: Home, c: C.amber, bg: C.amberBg, tekst: '2 ledige enheter', detalj: 'annonseutkast klart til godkjenning' },
];

export default function AssistentChatMockup({ vis = true }: { vis?: boolean }) {
  // Faser: 0 = tom · 1 = brukerboble · 2 = tenker · 3 = svar · 4 = handlinger
  const [fase, setFase] = useState(0);

  useEffect(() => {
    if (!vis) { setFase(0); return undefined; }
    const ts = [
      setTimeout(() => setFase(1), 2350),
      setTimeout(() => setFase(2), 3050),
      setTimeout(() => setFase(3), 4250),
      setTimeout(() => setFase(4), 5150),
    ];
    return () => ts.forEach(clearTimeout);
  }, [vis]);

  const inn = (aktiv: boolean): string => (aktiv
    ? 'opacity-100 translate-y-0 blur-0'
    : 'opacity-0 translate-y-2 blur-[3px]');

  return (
    <div
      className={`${jakarta.className} overflow-hidden rounded-2xl`}
      style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 30px 90px -18px rgba(20,15,30,0.35), 0 4px 18px rgba(20,15,30,0.10)' }}
    >
      {/* Topplinje — mørk, som appens innsiktskort */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: C.invBg }}>
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#7c3aed]/30" style={{ animationDuration: '2.4s' }} />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa]">
            <Bot className="h-[17px] w-[17px] text-white" strokeWidth={1.9} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13.5px] font-bold tracking-tight text-white">
            Driftsassistent <Sparkles className="h-3.5 w-3.5 text-[#d298ff]" strokeWidth={2} />
          </p>
          <p className="flex items-center gap-1.5 text-[10.5px] text-white/45">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" /> Alltid på · svarer på sekunder
          </p>
        </div>
        <Minus className="h-4 w-4 text-white/30" strokeWidth={2} />
      </div>

      {/* Meldinger */}
      <div className="space-y-2.5 px-4 py-4" style={{ backgroundColor: C.bg }}>
        {/* Brukerens spørsmål */}
        <div className={`flex justify-end transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${inn(fase >= 1)}`}>
          <div className="rounded-2xl rounded-tr-md px-3.5 py-2 text-[12.5px] font-medium text-white" style={{ backgroundColor: C.invBg }}>
            Hva bør jeg følge opp i dag?
          </div>
        </div>

        {/* Tenkeprikker — bare mens assistenten «tenker» */}
        {fase === 2 && (
          <div className="flex items-center gap-[5px] px-1 pt-1">
            <span className="bu-dot h-[6px] w-[6px] rounded-full" style={{ backgroundColor: C.muted }} />
            <span className="bu-dot h-[6px] w-[6px] rounded-full" style={{ backgroundColor: C.muted, animationDelay: '0.18s' }} />
            <span className="bu-dot h-[6px] w-[6px] rounded-full" style={{ backgroundColor: C.muted, animationDelay: '0.36s' }} />
          </div>
        )}

        {/* Assistentens svar */}
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${inn(fase >= 3)}`}>
          <div className="rounded-2xl rounded-tl-md px-3.5 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-[12.5px] leading-snug" style={{ color: C.text }}>
              God morgen! Tre ting krever oppmerksomhet:
            </p>
            <div className="mt-2.5 space-y-2">
              {PRIORITERINGER.map((p) => (
                <div key={p.tekst} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: p.bg }}>
                    <p.Ikon className="h-[13px] w-[13px]" style={{ color: p.c }} strokeWidth={1.9} />
                  </span>
                  <p className="min-w-0 text-[11.5px] leading-tight" style={{ color: C.text }}>
                    <span className="font-semibold">{p.tekst}</span>
                    <span style={{ color: C.sub }}> — {p.detalj}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Handlingsknapper */}
          <div className={`mt-2 flex gap-2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${inn(fase >= 4)}`}>
            <span className="rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold" style={{ backgroundColor: C.accent, color: '#1a1a1a' }}>
              Godkjenn annonser
            </span>
            <span className="rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold" style={{ border: `1px solid ${C.border}`, color: C.text, backgroundColor: C.card }}>
              Åpne saker
            </span>
          </div>
        </div>
      </div>

      {/* Skrivefelt */}
      <div className="flex items-center gap-2 border-t px-3 py-2.5" style={{ borderColor: C.border, backgroundColor: C.card }}>
        <div className="flex h-9 flex-1 items-center rounded-full px-4 text-[12px]" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>
          Spør assistenten …
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: C.invBg }}>
          <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}
