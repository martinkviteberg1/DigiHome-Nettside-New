'use client';
/**
 * ProductTour — PROTOTYPE av «Interaktiv omvisning» (in-app guided tour).
 *
 * Idé: vi gjenbruker de EKSISTERENDE, pixel-perfekte app-skjermene (PipelineSurface,
 * ProposalSurface …) NØYAKTIG som de er, og legger kun på et nytt «tur-lag»:
 *   • myk SPOTLIGHT som dimmer alt utenom elementet i fokus (filmatisk fokus-pull via lys)
 *   • en realistisk MARKØR som beveger seg og klikker
 *   • korte COACHMARKS (én linje) festet ved elementet
 *   • slank stegindikator
 * Ingen keynote-tekst. Appen er helten.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PipelineSurface, ProposalSurface, Cursor } from '@/components/deck/SystemFilm';
import { Play, Pause, ChevronLeft, ChevronRight, MousePointer2, RotateCcw } from 'lucide-react';

const WIN_W = 1480, WIN_H = 832;
const INK = '#1a1612';
const INK2 = '#3b342c';
const SUB = '#6e6357';
const FAINT = '#9a9183';
const LINE = '#ece7dd';
const SURF = '#ffffff';
const CANVAS = '#faf8f5';
const LILAC = '#cf97fc';
const LILAC_TXT = '#6f54b4';
const LILAC_BG = 'rgba(207,151,252,0.12)';
const SCRIM = 'rgba(22,18,14,0.58)';
const FH = "var(--font-heading), 'PP Right Grotesk', sans-serif";
const F = "var(--font-body), 'ABC Diatype', sans-serif";

type Side = 'left' | 'right' | 'top' | 'bottom';
type Step = {
  screen: 'pipeline' | 'proposal';
  focus: { x: number; y: number; w: number; h: number };
  cursor: { x: number; y: number };
  down?: boolean;
  coach: { x: number; y: number; side: Side; text: string };
  dur: number;
};

/* steg i WIN-koordinater (1480×832) — samme rom som skjermene */
const STEPS: Step[] = [
  {
    screen: 'pipeline',
    focus: { x: 276, y: 150, w: 232, h: 322 },
    cursor: { x: 392, y: 300 }, down: false,
    coach: { x: 540, y: 250, side: 'left', text: 'Nye henvendelser lander øverst i pipelinen — helt automatisk.' },
    dur: 4400,
  },
  {
    screen: 'pipeline',
    focus: { x: 1132, y: 28, w: 258, h: 86 },
    cursor: { x: 1262, y: 150 }, down: false,
    coach: { x: 980, y: 152, side: 'top', text: 'Vektet prognose oppdateres i sanntid.' },
    dur: 4200,
  },
  {
    screen: 'pipeline',
    focus: { x: 1040, y: 150, w: 232, h: 322 },
    cursor: { x: 1156, y: 300 }, down: false,
    coach: { x: 700, y: 250, side: 'right', text: 'Leads flyttes gjennom løpet — ingen faller mellom.' },
    dur: 4400,
  },
  {
    screen: 'proposal',
    focus: { x: 543, y: 690, w: 394, h: 92 },
    cursor: { x: 740, y: 736 }, down: true,
    coach: { x: 470, y: 540, side: 'bottom', text: 'Huseier åpner lenken og signerer med BankID — uten papir.' },
    dur: 4800,
  },
];

/* ── spotlight: dimmer alt utenom fokus-rektangelet (box-shadow-triks) + glødende ring ── */
function Spotlight({ rect }: { rect: { x: number; y: number; w: number; h: number } }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: 18,
        boxShadow: `0 0 0 2px ${LILAC}, 0 0 22px 2px ${LILAC}66, 0 0 0 9999px ${SCRIM}`,
        transition: 'left 0.8s cubic-bezier(0.16,1,0.3,1), top 0.8s cubic-bezier(0.16,1,0.3,1), width 0.8s cubic-bezier(0.16,1,0.3,1), height 0.8s cubic-bezier(0.16,1,0.3,1)',
      }}
    />
  );
}

/* ── coachmark: én kort linje, festet ved elementet ── */
function Coach({ step, n, total, k }: { step: Step; n: number; total: number; k: number }) {
  const { x, y, side, text } = step.coach;
  const caret: React.CSSProperties =
    side === 'left' ? { right: -5, top: 26 } :
    side === 'right' ? { left: -5, top: 26 } :
    side === 'top' ? { bottom: -5, left: 30 } :
    { top: -5, left: 30 };
  return (
    <div key={k} className="absolute" style={{ left: x, top: y, width: 320, animation: 'pt-coachin 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div className="relative rounded-2xl px-5 py-4" style={{ background: SURF, boxShadow: `0 2px 8px rgba(22,18,14,0.06), 0 30px 70px -26px rgba(22,18,14,0.5)` }}>
        <span className="absolute w-3 h-3 rotate-45" style={{ background: SURF, ...caret }} />
        <div className="flex items-center gap-2.5 mb-2">
          <span className="inline-flex items-center justify-center rounded-full text-[11px] font-bold" style={{ width: 22, height: 22, background: INK, color: '#fff', fontFamily: FH }}>{n}</span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] tabular-nums" style={{ color: FAINT, fontFamily: F }}>{n} / {total}</span>
        </div>
        <p className="text-[16px] leading-[1.45] font-medium" style={{ color: INK, fontFamily: FH, letterSpacing: '-0.01em' }}>{text}</p>
      </div>
    </div>
  );
}

export default function ProductTour() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.7);
  const last = STEPS.length - 1;
  const step = STEPS[idx];

  useEffect(() => {
    const upd = () => setScale(Math.min((window.innerWidth - 130) / WIN_W, (window.innerHeight - 190) / WIN_H, 1.1));
    upd(); window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    if (!playing || idx >= last) return;
    const t = setTimeout(() => setIdx(i => Math.min(i + 1, last)), step.dur);
    return () => clearTimeout(t);
  }, [idx, playing, last, step.dur]);

  const next = useCallback(() => setIdx(i => Math.min(i + 1, last)), [last]);
  const prev = useCallback(() => setIdx(i => Math.max(i - 1, 0)), []);
  const restart = useCallback(() => { setIdx(0); setPlaying(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center" style={{ background: CANVAS, fontFamily: F }}>
      {/* rolig ambient bakgrunn */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(100% 70% at 50% -6%, ${SURF} 0%, ${CANVAS} 56%)` }} />
      <div className="absolute pointer-events-none" style={{ top: '-12%', left: '12%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(207,151,252,0.10) 0%, transparent 70%)', filter: 'blur(30px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-14%', right: '8%', width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle, rgba(216,196,166,0.14) 0%, transparent 70%)', filter: 'blur(34px)' }} />

      {/* tittel-chrome */}
      <div className="absolute z-30 flex items-center justify-between" style={{ left: 40, right: 40, top: 28 }}>
        <span className="flex items-center gap-2.5 font-bold text-[17px]" style={{ color: INK, fontFamily: FH }}>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white text-[14px]" style={{ background: 'linear-gradient(135deg,#cf97fc,#7c5cff)' }}>H</span>digihome
        </span>
        <span className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.22em]" style={{ color: LILAC_TXT, fontFamily: F }}>
          <MousePointer2 className="w-3.5 h-3.5" strokeWidth={2.2} /> Interaktiv omvisning
        </span>
      </div>

      {/* enhets-scene (appen som helt) */}
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <div className="relative" style={{ width: WIN_W, height: WIN_H, borderRadius: 24, overflow: 'hidden', background: SURF, boxShadow: `0 0 0 1px ${LINE}, 0 50px 120px -44px rgba(22,18,14,0.5)` }}>
          {/* skjermene — gjenbrukt NØYAKTIG som de er, kryss-toner mellom dem */}
          <div className="absolute inset-0" style={{ opacity: step.screen === 'pipeline' ? 1 : 0, transition: 'opacity 0.6s ease' }}>
            <PipelineSurface mode="still" />
          </div>
          <div className="absolute inset-0" style={{ opacity: step.screen === 'proposal' ? 1 : 0, transition: 'opacity 0.6s ease' }}>
            <ProposalSurface mode="still" />
          </div>

          {/* tur-lag */}
          <Spotlight rect={step.focus} />
          <Coach step={step} n={idx + 1} total={STEPS.length} k={idx} />
          <Cursor x={step.cursor.x} y={step.cursor.y} down={!!step.down} />
        </div>
      </div>

      {/* stegprikker + kontroller */}
      <div className="absolute z-30 flex flex-col items-center gap-4" style={{ bottom: 30, left: 0, right: 0 }}>
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className="rounded-full transition-all" style={{ width: i === idx ? 26 : 8, height: 8, background: i === idx ? LILAC_TXT : i < idx ? LILAC : LINE }} aria-label={`Steg ${i + 1}`} />
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full p-1" style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px -12px rgba(26,22,18,0.22), 0 0 0 1px rgba(26,22,18,0.05)' }}>
          <button onClick={prev} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5" style={{ color: INK }} aria-label="Forrige"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => (idx >= last ? restart() : setPlaying(p => !p))} className="w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: INK, boxShadow: '0 6px 16px -6px rgba(26,22,18,0.5)' }} aria-label="Spill/pause">
            {idx >= last ? <RotateCcw className="w-[17px] h-[17px]" /> : playing ? <Pause className="w-[18px] h-[18px]" /> : <Play className="w-[18px] h-[18px]" style={{ marginLeft: 1 }} />}
          </button>
          <button onClick={next} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5" style={{ color: INK }} aria-label="Neste"><ChevronRight className="w-5 h-5" /></button>
          <span className="px-3 text-[12px] font-bold tabular-nums" style={{ color: FAINT, fontFamily: F }}>{String(idx + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>
        </div>
      </div>

      <style>{`
        @keyframes pt-coachin { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
