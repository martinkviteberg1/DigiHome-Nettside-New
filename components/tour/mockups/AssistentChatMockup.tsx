import React, { useEffect, useState } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ArrowUp, Minus, Droplets, FileSignature, Home } from 'lucide-react';

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
  { Ikon: Droplets, c: C.blue, tekst: 'Vannlekkasje på badet', detalj: 'Rørlegger bekreftet', status: 'kl. 12:00', sc: C.blue, sbg: C.blueBg },
  { Ikon: FileSignature, c: C.purple, tekst: 'Leiekontrakt Marken 8', detalj: 'BankID-signering', status: 'Sendt', sc: C.purple, sbg: C.purpleBg },
  { Ikon: Home, c: C.amber, tekst: '2 ledige enheter', detalj: 'Annonseutkast', status: 'Klar', sc: C.amber, sbg: C.amberBg },
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-favicon-purple.svg" alt="" className="h-9 w-9 shrink-0 rounded-[10px]" style={{ boxShadow: `inset 0 0 0 1px ${C.border}` }} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold tracking-tight" style={{ color: C.text }}>Driftsassistent</p>
          <p className="mt-[1px] flex items-center gap-1.5 text-[10.5px]" style={{ color: C.sub }}>
            <span className="h-[5px] w-[5px] rounded-full bg-[#34c759]" /> Koblet til hele driften
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
                Tre ting skiller seg ut:
              </p>
              <div className="mt-1.5">
                {PRIORITERINGER.map((p, i) => (
                  <div
                    key={p.tekst}
                    className="dh-ai-inn flex items-center gap-2.5 py-[9px]"
                    style={{ animationDelay: `${160 + i * 150}ms`, borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}
                  >
                    <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[9px]" style={{ backgroundColor: '#f6f5f8' }}>
                      <p.Ikon className="h-[13px] w-[13px]" style={{ color: p.c }} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold leading-tight" style={{ color: C.text }}>{p.tekst}</span>
                      <span className="block truncate text-[10.5px] leading-tight" style={{ color: C.sub }}>{p.detalj}</span>
                    </span>
                    <span className="shrink-0 rounded-full px-2 py-[3px] text-[9.5px] font-bold tabular-nums" style={{ backgroundColor: p.sbg, color: p.sc }}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Handlinger — som portalens piller (aksent + omriss) */}
            {fase >= 4 && (
              <div className="dh-ai-inn mt-2.5 flex gap-2" style={{ animationDelay: '80ms' }}>
                <span className="rounded-full px-3.5 py-[7px] text-[11.5px] font-semibold text-white" style={{ backgroundColor: C.invBg }}>
                  Godkjenn annonser
                </span>
                <span className="rounded-full px-3.5 py-[7px] text-[11.5px] font-semibold" style={{ border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.text }}>
                  Se alle saker
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
