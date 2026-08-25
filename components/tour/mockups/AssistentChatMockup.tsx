import React, { useEffect, useState } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Bot, ArrowUp, Minus, Droplets, FileSignature, Home } from 'lucide-react';

// ---------------------------------------------------------------------------
// AssistentChatMockup — DigiHomes AI-driftsassistent som flytende chatpanel
// over forvalterportalen i Bergen Urban-revealen.
// Designet følger portalens eget språk (AdminDashboard C_LIGHT): hvite kort,
// #eae7ef-rammer, mørke pille-knapper, aksent #d298ff — ingen glass/gradienter.
// FAST høyde som en standard chat-widget: panelet vokser ikke per melding.
// `vis`-prop koreograferer samtalen: brukerboble → tenkeprikker → svar →
// handlingsknapper. Alle data er fiktive demo-data.
// ---------------------------------------------------------------------------

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });

const C = {
  bg: '#fdfcfb', card: '#ffffff', border: '#eae7ef',
  text: '#2d2d2d', sub: '#8a8a8e', muted: '#b8b5be',
  accent: '#d298ff', accentSoft: '#f3ebff', invBg: '#1a1a1a',
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
      setTimeout(() => setFase(2), 3100),
      setTimeout(() => setFase(3), 4400),
      setTimeout(() => setFase(4), 5400),
    ];
    return () => ts.forEach(clearTimeout);
  }, [vis]);

  return (
    <div
      className={`${jakarta.className} flex h-[450px] flex-col overflow-hidden rounded-2xl`}
      style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 30px 80px -18px rgba(20,15,30,0.28), 0 4px 16px rgba(20,15,30,0.08)' }}
    >
      {/* Topplinje — som portalens kort */}
      <div className="flex shrink-0 items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#7c3aed]/15" style={{ animationDuration: '2.6s' }} />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa]">
            <Bot className="h-[16px] w-[16px] text-white" strokeWidth={2} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13.5px] font-bold tracking-tight" style={{ color: C.text }}>
            Driftsassistent
            <span className="rounded-full px-1.5 py-[1px] text-[8.5px] font-bold tracking-wide" style={{ backgroundColor: C.accentSoft, color: '#7c3aed' }}>AI</span>
          </p>
          <p className="mt-[1px] flex items-center gap-1.5 text-[10.5px]" style={{ color: C.sub }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34c759]" /> Aktiv nå · svarer på sekunder
          </p>
        </div>
        <Minus className="h-4 w-4" style={{ color: C.muted }} strokeWidth={2} />
      </div>

      {/* Samtalen — fast høyde, standard chatflyt ovenfra og ned */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden px-4 py-4" style={{ backgroundColor: C.bg }}>
        {/* Brukerens spørsmål */}
        {fase >= 1 && (
          <div className="dh-ai-inn flex justify-end">
            <div className="rounded-2xl rounded-br-md px-3.5 py-2 text-[12.5px] font-medium text-white" style={{ backgroundColor: C.invBg }}>
              Hva bør jeg følge opp i dag?
            </div>
          </div>
        )}

        {/* Tenkeprikker */}
        {fase === 2 && (
          <div className="dh-ai-inn flex justify-start">
            <div className="flex items-center gap-[5px] rounded-2xl rounded-bl-md px-3.5 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <span className="dh-ai-dot h-[6px] w-[6px] rounded-full" style={{ backgroundColor: C.muted }} />
              <span className="dh-ai-dot h-[6px] w-[6px] rounded-full" style={{ backgroundColor: C.muted, animationDelay: '0.16s' }} />
              <span className="dh-ai-dot h-[6px] w-[6px] rounded-full" style={{ backgroundColor: C.muted, animationDelay: '0.32s' }} />
            </div>
          </div>
        )}

        {/* Assistentens svar */}
        {fase >= 3 && (
          <div className="dh-ai-inn">
            <div className="rounded-2xl rounded-bl-md px-3.5 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-[12.5px] leading-snug" style={{ color: C.text }}>
                God morgen! Tre ting krever oppmerksomhet i dag:
              </p>
              <div className="mt-2.5 space-y-2">
                {PRIORITERINGER.map((p, i) => (
                  <div key={p.tekst} className="dh-ai-inn flex items-center gap-2.5" style={{ animationDelay: `${160 + i * 150}ms` }}>
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: p.bg }}>
                      <p.Ikon className="h-[14px] w-[14px]" style={{ color: p.c }} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold leading-tight" style={{ color: C.text }}>{p.tekst}</span>
                      <span className="block truncate text-[11px] leading-tight" style={{ color: C.sub }}>{p.detalj}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Handlinger — som portalens piller (aksent + omriss) */}
            {fase >= 4 && (
              <div className="dh-ai-inn mt-2.5 flex gap-2" style={{ animationDelay: '80ms' }}>
                <span className="rounded-full px-3.5 py-2 text-[11.5px] font-semibold" style={{ backgroundColor: C.accent, color: '#1a1a1a' }}>
                  Godkjenn annonser
                </span>
                <span className="rounded-full px-3.5 py-2 text-[11.5px] font-semibold" style={{ border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.text }}>
                  Åpne saker
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skrivefelt — mørk sendeknapp som portalens primærknapp */}
      <div className="flex shrink-0 items-center gap-2 px-3.5 py-3" style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.card }}>
        <div className="flex h-10 flex-1 items-center rounded-full px-4 text-[12px]" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>
          Spør assistenten …
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: C.invBg }}>
          <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>

      {/* Lokale animasjoner */}
      <style jsx global>{`
        @keyframes dhAiInn {
          from { opacity: 0; transform: translateY(9px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dh-ai-inn { animation: dhAiInn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes dhAiDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        .dh-ai-dot { animation: dhAiDot 1.15s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .dh-ai-inn, .dh-ai-dot { animation: none !important; }
          .dh-ai-inn { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
