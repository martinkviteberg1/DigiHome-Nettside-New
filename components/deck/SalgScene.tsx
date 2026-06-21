'use client';
/**
 * SalgScene — investor-scene for modulen «Salg» (mal for de øvrige modulene).
 *
 * Nivå: posisjonering, ikke klikk-for-klikk. Budskap:
 *   «Hver forvalter driver en salgsprosess. Huseiere er leads.
 *    Innebygd og automatisert i DigiHome — ikke Excel, HubSpot eller Salesforce.»
 *
 * Layout (verdensklasse, rolig):
 *   • Venstre: eyebrow + tittel + «erstatter»-chips + borderless ACCORDION (4 poeng)
 *   • Høyre: ren pipeline-mockup som MORFER rolig for å fremheve det aktive poenget
 */
import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Bell, PenTool, Inbox, Check, Play, Pause, Search, SlidersHorizontal, ArrowRight, Sparkles } from 'lucide-react';

/* ── DNA (matcher den ekte appen / salesTokens.T) ── */
const INK = '#1a1612', INK2 = '#3b342c', SUB = '#6e6357', FAINT = '#9a9183';
const LINE = '#ece7dd', DIVIDER = '#e8e4df', SURF = '#ffffff', SURF2 = '#fcfbf9', CANVAS = '#faf8f5';
const LILAC = '#cf97fc', LILAC_TXT = '#6f54b4', LILAC_BG = 'rgba(207,151,252,0.12)';
const SAND = '#d8c4a6', SUCCESS = '#3f7d52', SUCCESS_BG = 'rgba(63,125,82,0.10)';
const FH = "var(--font-heading), 'PP Right Grotesk', sans-serif";
const F = "var(--font-body), 'ABC Diatype', sans-serif";

const SLIDE_W = 1680, SLIDE_H = 945;

const ITEMS = [
  { icon: Inbox, t: 'Huseiere blir leads — automatisk', d: 'Henvendelser fra nettsiden og FINN havner rett i pipelinen. Ingen manuell punching, ingen løse e-poster.' },
  { icon: TrendingUp, t: 'Vektet pipeline & prognose', d: 'Hvert steg har en sannsynlighet. Den vektede prognosen oppdateres i sanntid — du vet alltid hva som ligger i løpet.' },
  { icon: Bell, t: 'Automatisk oppfølging', d: 'SLA-varsler sikrer at ingen lead blir liggende. Systemet purrer og minner deg på neste steg.' },
  { icon: PenTool, t: 'Tilbud & signering innebygd', d: 'Generer forvaltningsavtale og signer med BankID — uten å forlate systemet eller bytte verktøy.' },
];

const REPLACES = ['Excel', 'HubSpot', 'Salesforce'];

/* ── stages + leads for mockupen ── */
const STAGES = [
  { name: 'Ny', p: 10 },
  { name: 'Kontaktet', p: 25 },
  { name: 'Visning', p: 50 },
  { name: 'Tilbud', p: 75 },
  { name: 'Signert', p: 100 },
];
const LEADS: Record<number, { in: string; name: string; addr: string; rent: string; tag?: string }[]> = {
  0: [
    { in: 'AB', name: 'Anna Berg', addr: 'Camilla Colletts gate 14A', rent: '16 800', tag: 'NY' },
    { in: 'ON', name: 'Ola Nyland', addr: 'Møllergata 4', rent: '14 200' },
  ],
  1: [
    { in: 'MS', name: 'Mariam Sayed', addr: 'Bjørnsons gate 9', rent: '11 800' },
    { in: 'JF', name: 'Jonas Five', addr: 'Strandkaien 2', rent: '9 600' },
  ],
  2: [
    { in: 'LH', name: 'Linn Haug', addr: 'Nygårdsgaten 31', rent: '16 500' },
    { in: 'KV', name: 'Kari Vold', addr: 'Bergveien 12', rent: '13 100' },
  ],
  3: [{ in: 'ES', name: 'Eivind Sørli', addr: 'Kong Oscars gate 18', rent: '13 400' }],
  4: [{ in: 'HB', name: 'Hanne Borge', addr: 'Fjellveien 7', rent: '12 900' }],
};

/* fokus-kolonne per aktivt accordion-poeng (-1 = ingen / prognose) */
const FOCUS_COL = [0, -1, 1, 3];

function Ring({ on }: { on: boolean }) {
  return (
    <div className="absolute inset-0 rounded-[inherit] pointer-events-none" style={{
      boxShadow: on ? `0 0 0 2px ${LILAC}, 0 0 26px 1px ${LILAC}55` : '0 0 0 0 transparent',
      opacity: on ? 1 : 0, transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), box-shadow 0.55s cubic-bezier(0.16,1,0.3,1)',
    }} />
  );
}

function PipelineMock({ active }: { active: number }) {
  const focusCol = FOCUS_COL[active];
  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: SURF, fontFamily: F }}>
      {/* topbar */}
      <div className="flex items-center justify-between px-7 shrink-0" style={{ height: 70, borderBottom: `1px solid ${DIVIDER}` }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: FAINT }}>Salg · Huseiere</p>
          <p className="text-[19px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative rounded-2xl px-4 py-2" style={{ background: SURF2, border: `1px solid ${LINE}` }}>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-right" style={{ color: FAINT }}>Vektet prognose</p>
            <p className="text-[20px] font-bold tracking-[-0.02em] text-right tabular-nums" style={{ color: INK, fontFamily: FH }}>742 000 <span className="text-[12px]" style={{ color: SUB }}>kr</span></p>
            <Ring on={active === 1} />
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: SURF2, border: `1px solid ${LINE}` }}><Search className="w-4 h-4" style={{ color: FAINT }} /></div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: SURF2, border: `1px solid ${LINE}` }}><SlidersHorizontal className="w-4 h-4" style={{ color: FAINT }} /></div>
        </div>
      </div>

      {/* board */}
      <div className="flex-1 grid px-5 py-5 gap-2.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {STAGES.map((st, ci) => {
          const dim = focusCol >= 0 && ci !== focusCol;
          const cards = LEADS[ci] || [];
          return (
            <div key={st.name} className="relative rounded-2xl p-2" style={{ background: ci === focusCol ? LILAC_BG : 'transparent', opacity: dim ? 0.42 : 1, transition: 'opacity 0.55s ease, background 0.55s ease' }}>
              <div className="flex items-center justify-between px-1.5 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: ci === 4 ? SUCCESS : ci === focusCol ? LILAC_TXT : '#cfc6b8' }} />
                  <span className="text-[11px] font-bold tracking-[-0.01em]" style={{ color: INK2, fontFamily: FH }}>{st.name}</span>
                </div>
                <span className="text-[9px] font-bold tabular-nums" style={{ color: FAINT }}>{st.p}%</span>
              </div>
              <div className="space-y-2">
                {cards.map((c, i) => {
                  const isNew = active === 0 && ci === 0 && i === 0;
                  const isFollow = active === 2 && ci === 1 && i === 0;
                  const isOffer = active === 3 && ci === 3 && i === 0;
                  return (
                    <div key={c.name} className="relative rounded-xl p-2.5" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(26,22,18,0.03)', animation: isNew ? 'sg-cardin 0.6s cubic-bezier(0.16,1,0.3,1) both' : undefined }}>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: '#efe9e0', color: INK2, fontFamily: FH }}>{c.in}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold leading-tight truncate" style={{ color: INK, fontFamily: FH }}>{c.name}</p>
                          <p className="text-[9px] truncate" style={{ color: FAINT }}>{c.addr}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: SUB }}>{c.rent} kr</span>
                        {c.tag && <span className="text-[7.5px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-full" style={{ background: LILAC_BG, color: LILAC_TXT }}>{c.tag}</span>}
                      </div>
                      {/* dynamiske merker */}
                      {isFollow && (
                        <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full px-2 py-1" style={{ background: INK, animation: 'sg-pop 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
                          <Bell className="w-2.5 h-2.5 text-white" /><span className="text-[8px] font-bold text-white">Følg opp</span>
                        </div>
                      )}
                      {isOffer && (
                        <div className="mt-2 pt-2 flex items-center gap-1.5" style={{ borderTop: `1px solid ${LINE}`, animation: 'sg-pop 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
                          <PenTool className="w-2.5 h-2.5" style={{ color: SUCCESS }} /><span className="text-[8.5px] font-bold" style={{ color: SUCCESS }}>Sendt til BankID</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* footer */}
      <div className="flex items-center justify-between px-7 shrink-0" style={{ height: 46, borderTop: `1px solid ${DIVIDER}` }}>
        <span className="text-[10.5px] font-semibold" style={{ color: SUB }}>24 aktive leads · 6 nye denne uken</span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: SUCCESS }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: SUCCESS }} />Automatisk oppdatert</span>
      </div>
    </div>
  );
}

export default function SalgScene() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.7);

  useEffect(() => {
    const upd = () => setScale(Math.min((window.innerWidth - 80) / SLIDE_W, (window.innerHeight - 60) / SLIDE_H, 1.05));
    upd(); window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setActive(a => (a + 1) % ITEMS.length), 4200);
    return () => clearTimeout(t);
  }, [active, playing]);

  const select = useCallback((i: number) => { setActive(i); setPlaying(false); }, []);

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center" style={{ background: CANVAS, fontFamily: F }}>
      {/* ambient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(100% 68% at 50% -4%, ${SURF} 0%, ${CANVAS} 56%)` }} />
      <div className="absolute pointer-events-none" style={{ top: '-12%', left: '8%', width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(207,151,252,0.10) 0%, transparent 70%)', filter: 'blur(34px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-16%', right: '6%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(216,196,166,0.14) 0%, transparent 70%)', filter: 'blur(36px)' }} />

      <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'center', position: 'relative' }}>
        {/* header */}
        <div className="absolute flex items-center justify-between" style={{ left: 100, top: 54, right: 100 }}>
          <span className="flex items-center gap-2.5 font-bold text-[18px]" style={{ color: INK, fontFamily: FH }}>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white text-[14px]" style={{ background: 'linear-gradient(135deg,#cf97fc,#7c5cff)' }}>H</span>digihome
          </span>
          <span className="text-[12px] font-bold uppercase tracking-[0.22em]" style={{ color: FAINT, fontFamily: F }}>Modul 01 — Salg</span>
        </div>

        {/* venstre: posisjonering + accordion */}
        <div className="absolute flex flex-col justify-center" style={{ left: 100, top: 150, height: 660, width: 540 }}>
          <div className="flex items-center gap-2.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC_TXT }} />
            <span className="text-[12px] font-bold uppercase tracking-[0.24em]" style={{ color: LILAC_TXT, fontFamily: F }}>Salg · Innebygd CRM</span>
          </div>
          <h1 className="font-bold tracking-[-0.035em]" style={{ color: INK, fontFamily: FH, fontSize: 44, lineHeight: 1.05 }}>Huseiere er leads.<br />Salget driver seg selv.</h1>
          <p className="mt-5 text-[16.5px]" style={{ color: SUB, fontFamily: F, lineHeight: 1.6, maxWidth: 480 }}>Hver forvalter driver en salgsprosess. I DigiHome er den <span style={{ color: INK, fontWeight: 600 }}>innebygd og automatisert</span> — i stedet for:</p>
          <div className="mt-4 flex items-center gap-2">
            {REPLACES.map(r => (
              <span key={r} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: SURF, border: `1px solid ${LINE}`, color: FAINT, textDecoration: 'line-through', textDecorationColor: 'rgba(189,81,71,0.55)' }}>{r}</span>
            ))}
            <ArrowRight className="w-4 h-4" style={{ color: FAINT }} />
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: INK }}><Sparkles className="w-3 h-3" style={{ color: LILAC }} />DigiHome</span>
          </div>

          {/* accordion */}
          <div className="mt-9 -mx-3">
            {ITEMS.map((it, i) => {
              const on = i === active;
              const Icon = it.icon;
              return (
                <button key={it.t} onClick={() => select(i)} className="w-full text-left relative block" style={{ padding: '14px 12px', cursor: 'pointer' }}>
                  {/* aksentstrek */}
                  <span className="absolute left-0 top-3 bottom-3 rounded-full" style={{ width: 3, background: LILAC, opacity: on ? 1 : 0, transition: 'opacity 0.4s ease' }} />
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0" style={{ background: on ? LILAC_BG : 'transparent', transition: 'background 0.4s ease' }}>
                      <Icon className="w-[17px] h-[17px]" style={{ color: on ? LILAC_TXT : FAINT, transition: 'color 0.4s ease' }} strokeWidth={1.9} />
                    </span>
                    <span className="text-[16px] font-bold tracking-[-0.01em]" style={{ color: on ? INK : FAINT, fontFamily: FH, transition: 'color 0.4s ease' }}>{it.t}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateRows: on ? '1fr' : '0fr', transition: 'grid-template-rows 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <p className="text-[14px] pl-11 pr-2 pt-2" style={{ color: SUB, fontFamily: F, lineHeight: 1.55 }}>{it.d}</p>
                      <div className="ml-11 mr-2 mt-3 rounded-full overflow-hidden" style={{ height: 2, background: LINE }}>
                        <div key={active} style={{ height: '100%', width: '0%', background: `linear-gradient(90deg, ${LILAC}, ${LILAC_TXT})`, animation: on && playing ? 'sg-fill 4200ms linear forwards' : 'none' }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* høyre: mockup */}
        <div className="absolute" style={{ left: 700, top: 232, width: 880, height: 500 }}>
          <div className="absolute pointer-events-none" style={{ inset: '-8% -6%', background: `radial-gradient(56% 56% at 50% 36%, ${LILAC}12 0%, transparent 72%)`, filter: 'blur(40px)' }} />
          <div className="absolute pointer-events-none" style={{ left: '8%', right: '8%', bottom: -26, height: 52, borderRadius: '50%', background: 'rgba(26,22,18,0.16)', filter: 'blur(30px)' }} />
          <div className="relative w-full h-full rounded-[22px] overflow-hidden" style={{ boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 1px ${LINE}, 0 44px 96px -36px rgba(26,22,18,0.4)` }}>
            <PipelineMock active={active} />
          </div>
        </div>

        {/* play/pause */}
        <div className="absolute" style={{ left: 700, bottom: 70 }}>
          <button onClick={() => setPlaying(p => !p)} className="flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 8px 24px -12px rgba(26,22,18,0.2)' }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: INK }}>{playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" style={{ marginLeft: 1 }} />}</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: SUB, fontFamily: F }}>{playing ? 'Spiller' : 'Pauset'}</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sg-fill { from { width:0%; } to { width:100%; } }
        @keyframes sg-cardin { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes sg-pop { from { opacity:0; transform: scale(0.85); } to { opacity:1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
