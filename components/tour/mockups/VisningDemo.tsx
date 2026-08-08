'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, MessageSquare } from 'lucide-react';

// ---------------------------------------------------------------------------
// VisningDemo — tro mot systemets visningsbooking: interessentene fra
// annonsen velger visningstid selv (fellesvisning med kapasitetsstyring),
// påmeldingene tikker inn til fullbooket — og bekreftelse + påminnelse går
// automatisk på SMS. Selvspillende, looper rolig.
// ---------------------------------------------------------------------------

const INK = '#0a0a0a';

const TRINN: { navn: string; ms: number }[] = [
  { navn: 'start', ms: 900 },
  { navn: 'tider', ms: 1000 },
  { navn: 'velg', ms: 1100 },
  { navn: 'pm1', ms: 450 },
  { navn: 'pm2', ms: 450 },
  { navn: 'pm3', ms: 750 },
  { navn: 'fullt', ms: 1500 },
  { navn: 'sms1', ms: 2700 },
  { navn: 'dag', ms: 1000 },
  { navn: 'sms2', ms: 3000 },
  { navn: 'slutt', ms: 5200 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

// Påmeldte — de samme fire som senere søker på boligen.
const STACK = [
  { init: 'KD', farge: '#8f9fb8' },
  { init: 'ES', farge: '#9a8fb8' },
  { init: 'ML', farge: '#b88f9f' },
  { init: 'SO', farge: '#b8a98f' },
];

const FJAER = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

function Sms({
  synlig,
  tid,
  tekst,
}: {
  synlig: boolean;
  tid: string;
  tekst: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[18px] bg-white p-4 shadow-[0_10px_36px_-16px_rgba(10,10,10,0.16),0_0_0_1px_rgba(0,0,0,0.03)] transition-all duration-600"
      style={{
        opacity: synlig ? 1 : 0,
        transform: synlig ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)',
        transitionTimingFunction: FJAER,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-[#ecfdf5] px-2.5 py-[3px] text-[8.5px] font-bold uppercase tracking-wider text-[#059669]">
          SMS
        </span>
        <span className="text-[10px] font-semibold text-[#5e5749]">DigiHome</span>
        <span className="ml-auto text-[9.5px] tabular-nums text-[#aaa]">{tid}</span>
      </div>
      <p className="text-[11.5px] leading-[1.65] text-[#555]">{tekst}</p>
    </div>
  );
}

export default function VisningDemo() {
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

  // Påmeldingstelleren: 5 → 8.
  const antall = 5 + ['pm1', 'pm2', 'pm3'].filter((n) => er(n)).length;
  const fullt = er('fullt');

  const F = { fontFamily: 'var(--font-heading), sans-serif' } as React.CSSProperties;

  return (
    <div ref={rot} className="relative w-full max-w-[460px] lg:mx-auto" data-testid="tour-visning-demo">
      {/* --- Visningskortet — systemets design ------------------------------ */}
      <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_60px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 border-b border-[#f5f3f0] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#0a0a0a]">
            <CalendarDays className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[13px] font-bold" style={{ ...F, color: INK }}>
              Visning
            </p>
            <p className="text-[10.5px] text-[#aaa]">Storgata 12, Oslo · Fellesvisning · ca. 30 min</p>
          </div>
        </div>

        {/* Tidsradene */}
        <div className="space-y-2.5 px-4 py-4">
          {/* Onsdag — velges og fylles opp. */}
          <div
            className={`flex items-center gap-3 rounded-[14px] border px-3.5 py-3 transition-all duration-500 ${
              er('velg') ? 'border-[#0a0a0a] bg-[#fafafa] shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'border-[#f0eeeb]'
            } ${er('tider') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold" style={{ ...F, color: INK }}>
                Onsdag 13. aug
              </p>
              <p className="mt-0.5 text-[10px] tabular-nums text-[#aaa]">kl. 17:00–17:30</p>
            </div>
            {/* Avatar-stack + teller */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {STACK.map((a, i) => {
                  const inne = i < 3 || er('pm2');
                  return (
                    <span
                      key={a.init}
                      className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[7.5px] font-bold text-white ring-2 ring-white transition-all duration-400 first:ml-0"
                      style={{
                        background: a.farge,
                        opacity: inne ? 1 : 0,
                        transform: inne ? 'scale(1)' : 'scale(0.3)',
                        transitionTimingFunction: FJAER,
                      }}
                    >
                      {a.init}
                    </span>
                  );
                })}
                <span
                  className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#f0ece5] text-[7.5px] font-bold text-[#7c7466] ring-2 ring-white"
                >
                  +{antall - (er('pm2') ? 4 : 3)}
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-[3px] text-[9px] font-bold tabular-nums transition-colors duration-500 ${
                  fullt ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#f5f3f0] text-[#7c7466]'
                }`}
              >
                {fullt ? 'Fullbooket' : `${antall}/8`}
              </span>
            </div>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] transition-all duration-300 ${
                er('velg') ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
              }`}
            >
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Torsdag — neste ledige. */}
          <div
            className={`flex items-center gap-3 rounded-[14px] border border-[#f0eeeb] px-3.5 py-3 transition-all delay-100 duration-500 ${
              er('tider') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            } ${er('velg') ? 'opacity-55' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold" style={{ ...F, color: INK }}>
                Torsdag 14. aug
              </p>
              <p className="mt-0.5 text-[10px] tabular-nums text-[#aaa]">kl. 18:00–18:30</p>
            </div>
            <span className="rounded-full bg-[#f5f3f0] px-2 py-[3px] text-[9px] font-bold tabular-nums text-[#7c7466]">2/8</span>
          </div>
        </div>
      </div>

      {/* --- SMS-ene — automatisk bekreftelse og påminnelse ------------------ */}
      <div className="mt-3.5 space-y-2.5">
        <Sms
          synlig={er('sms1')}
          tid="nå"
          tekst={
            <>
              Visning bekreftet! Onsdag 13. aug kl. 17:00, <span className="font-bold text-[#0a0a0a]">Storgata 12, Oslo</span>.
              Velkommen! — DigiHome
            </>
          }
        />

        {/* Visningsdagen — liten tidsmarkør. */}
        <div
          className={`flex justify-center py-0.5 transition-all duration-500 ${er('dag') ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="inline-block rounded-full border border-[#ece6da] bg-white px-3 py-1 text-[9.5px] font-bold text-[#5e5749]">
            Visningsdagen
          </span>
        </div>

        <Sms
          synlig={er('sms2')}
          tid="09:00"
          tekst={<>Hei! Husk visning i dag kl. 17:00 på Storgata 12. Vi gleder oss! — DigiHome</>}
        />
      </div>

      {/* Sluttlinjen */}
      <p
        className={`mt-4 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-opacity delay-300 duration-700 ${
          er('slutt') ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ color: INK }}
      >
        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} style={{ color: '#059669' }} />
        Bekreftelse, påminnelse og venteliste — automatisk på SMS
      </p>
    </div>
  );
}
