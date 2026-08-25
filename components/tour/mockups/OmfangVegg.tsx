import React from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Sparkles, Bot, Wand2 } from 'lucide-react';
import ForvalterFullskjerm from './ForvalterFullskjerm';

// ---------------------------------------------------------------------------
// OmfangVegg — «produktveggen» i Bergen Urban-decket.
// Kameraet trekker ut fra dashbordet (midtflisen = ekte ForvalterFullskjerm i
// miniatyr) og avslører 11 stiliserte mini-flater rundt: kontrakter,
// BankID-signering, økonomi, saker, kalender, bildestudio, innboks,
// annonsering, kanaler, eierapp og driftsassistent.
// Skjelett-stil (grå flater + sparsom aksent) så veggen leses som ÉN familie.
// `vis` styrer den staggerte materialiseringen (radielt ut fra dashbordet).
// ---------------------------------------------------------------------------

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });

const C = {
  border: '#eae7ef', flate: '#f4f3f6', strek: '#e7e4ec', tekst: '#2d2d2d',
  sub: '#b0b5be', accent: '#b57bff', green: '#6aab8e', blue: '#7da4c9', amber: '#c9a06a', rose: '#c47e86',
};

// Skjelett-byggeklosser
const Linje = ({ w = '70%', h = 5, c = C.strek, r = 3 }: { w?: string | number; h?: number; c?: string; r?: number }) => (
  <div style={{ width: w, height: h, backgroundColor: c, borderRadius: r }} />
);

function MiniKontrakter() {
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: C.border }}>
          <div className="h-5 w-4 rounded-[3px]" style={{ backgroundColor: C.flate }} />
          <div className="flex flex-1 flex-col gap-1"><Linje w="72%" /><Linje w="45%" h={4} /></div>
          {i === 0 && <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold" style={{ backgroundColor: 'rgba(106,171,142,0.15)', color: C.green }}>Signert</span>}
        </div>
      ))}
    </div>
  );
}

function MiniSignering() {
  return (
    <div className="flex h-full items-center justify-center p-3">
      <div className="relative flex h-full w-[58%] flex-col gap-1.5 rounded-md border bg-white p-2.5" style={{ borderColor: C.border, boxShadow: '0 4px 14px rgba(20,15,30,0.06)' }}>
        <Linje w="85%" /><Linje w="70%" /><Linje w="78%" /><Linje w="40%" />
        <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #b57bff)', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
      </div>
    </div>
  );
}

function MiniOkonomi() {
  const h = [38, 55, 46, 68, 60, 84];
  return (
    <div className="flex h-full items-end justify-center gap-2 p-4 pb-5">
      {h.map((v, i) => (
        <div key={v} className="w-[11%] rounded-t-[3px]" style={{ height: `${v}%`, backgroundColor: i === h.length - 1 ? C.accent : C.strek }} />
      ))}
    </div>
  );
}

function MiniSaker() {
  const rader = [C.blue, C.amber, C.rose];
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-3">
      {rader.map((farge, i) => (
        <div key={farge} className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: C.border }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: farge }} />
          <div className="flex-1"><Linje w={`${72 - i * 12}%`} /></div>
          <Linje w={18} h={8} r={4} c={C.flate} />
        </div>
      ))}
    </div>
  );
}

function MiniKalender() {
  return (
    <div className="grid h-full grid-cols-7 content-center gap-[5px] p-4">
      {Array.from({ length: 28 }, (_, i) => (
        <div key={i} className="aspect-square rounded-[3px]" style={{ backgroundColor: [9, 12, 17, 22].includes(i) ? 'rgba(181,123,255,0.4)' : C.flate }} />
      ))}
    </div>
  );
}

function MiniBildestudio() {
  return (
    <div className="flex h-full gap-2 p-3">
      <div className="flex-1 rounded-md" style={{ background: 'linear-gradient(135deg, #d8d5de, #eae7ef)' }} />
      <div className="relative flex-1 rounded-md" style={{ background: 'linear-gradient(135deg, #c9b4ec, #e6d9fb)' }}>
        <Wand2 className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-white" strokeWidth={2.2} />
      </div>
    </div>
  );
}

function MiniInnboks() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4">
      <div className="mr-auto w-[62%] rounded-xl rounded-bl-[4px] px-2.5 py-2" style={{ backgroundColor: C.flate }}><Linje w="80%" h={4} c="#d8d5de" /></div>
      <div className="ml-auto w-[52%] rounded-xl rounded-br-[4px] bg-[#1a1a1a] px-2.5 py-2"><Linje w="75%" h={4} c="rgba(255,255,255,0.4)" /></div>
      <div className="mr-auto w-[40%] rounded-xl rounded-bl-[4px] px-2.5 py-2" style={{ backgroundColor: C.flate }}><Linje w="70%" h={4} c="#d8d5de" /></div>
    </div>
  );
}

function MiniAnnonse() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="h-[52%] rounded-md" style={{ background: 'linear-gradient(135deg, #dcd9e2, #edeaf1)' }} />
      <div className="mt-2 flex flex-col gap-1.5">
        <Linje w="78%" h={6} c="#d8d5de" />
        <div className="flex items-center justify-between">
          <Linje w="40%" h={4} />
          <span className="text-[8px] font-bold" style={{ color: C.tekst }}>18 500 kr</span>
        </div>
      </div>
    </div>
  );
}

function MiniKanaler() {
  const seg = [
    [['30%', C.blue], ['18%', C.strek], ['34%', C.accent]],
    [['22%', C.amber], ['40%', C.strek], ['20%', C.green]],
    [['45%', C.accent], ['12%', C.strek], ['28%', C.blue]],
  ] as [string, string][][];
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-4">
      {seg.map((rad, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="flex h-[10px] gap-1 overflow-hidden rounded-full">
          {rad.map(([w, farge], j) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={j} className="h-full rounded-full" style={{ width: w, backgroundColor: farge, opacity: farge === C.strek ? 1 : 0.55 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function MiniEierapp() {
  return (
    <div className="flex h-full items-center justify-center p-2">
      <div className="flex h-[92%] w-[38%] flex-col gap-1.5 rounded-[10px] border bg-white p-1.5 pt-2.5" style={{ borderColor: '#d8d5de', boxShadow: '0 4px 14px rgba(20,15,30,0.08)' }}>
        <div className="mx-auto h-1 w-6 rounded-full" style={{ backgroundColor: C.strek }} />
        <div className="rounded-md p-1.5" style={{ backgroundColor: C.flate }}><Linje w="70%" h={4} c="#d8d5de" /></div>
        <div className="rounded-md bg-[#1a1a1a] p-1.5"><Linje w="60%" h={4} c="rgba(255,255,255,0.35)" /></div>
        <div className="rounded-md p-1.5" style={{ backgroundColor: C.flate }}><Linje w="55%" h={4} c="#d8d5de" /></div>
      </div>
    </div>
  );
}

function MiniAssistent() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'linear-gradient(140deg, #7c3aed, #cf97fc)', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' }}>
        <Bot className="h-4 w-4 text-white" strokeWidth={2} />
      </span>
      <div className="flex w-full flex-col items-center gap-1.5"><Linje w="64%" h={4} /><Linje w="46%" h={4} /></div>
    </div>
  );
}

function MiniDrift() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4">
      {[86, 64, 74].map((w, i) => (
        <div key={w} className="flex items-center gap-2">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px]" style={{ backgroundColor: i === 0 ? 'rgba(106,171,142,0.2)' : C.flate }}>
            {i === 0 && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
          </span>
          <Linje w={`${w}%`} h={4} />
        </div>
      ))}
    </div>
  );
}

// Flisene i veggen — (rad, kolonne) i 4×3-grid, dashbordet i (1,1)
const FLISER: { navn: string; Mini: () => React.ReactElement; r: number; c: number }[] = [
  { navn: 'Annonsering', Mini: MiniAnnonse, r: 0, c: 0 },
  { navn: 'Kalender', Mini: MiniKalender, r: 0, c: 1 },
  { navn: 'Innboks', Mini: MiniInnboks, r: 0, c: 2 },
  { navn: 'Kontrakter', Mini: MiniKontrakter, r: 0, c: 3 },
  { navn: 'Saker', Mini: MiniSaker, r: 1, c: 0 },
  { navn: 'BankID-signering', Mini: MiniSignering, r: 1, c: 2 },
  { navn: 'Økonomi', Mini: MiniOkonomi, r: 1, c: 3 },
  { navn: 'Kanaler', Mini: MiniKanaler, r: 2, c: 0 },
  { navn: 'Bildestudio', Mini: MiniBildestudio, r: 2, c: 1 },
  { navn: 'Driftsassistent', Mini: MiniAssistent, r: 2, c: 2 },
  { navn: 'Eierapp', Mini: MiniEierapp, r: 2, c: 3 },
];

// Fast bredde 1160px → flis = (1160 − 3·12)/4 = 281px → 16:10 = 175,6px høy.
// Dashbord-miniatyren skaleres eksakt: 281/1600 = 0,175625.
const FLIS_SKALA = 281 / 1600;

export default function OmfangVegg({ vis = true }: { vis?: boolean }) {
  const flisStil = (dist: number): React.CSSProperties => ({
    opacity: vis ? 1 : 0,
    transform: vis ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.94)',
    filter: vis ? 'blur(0)' : 'blur(10px)',
    transition: 'opacity 750ms cubic-bezier(0.22,1,0.36,1), transform 750ms cubic-bezier(0.22,1,0.36,1), filter 750ms cubic-bezier(0.22,1,0.36,1)',
    transitionDelay: vis ? `${640 + dist * 160}ms` : '0ms',
  });

  return (
    <div className={`${jakarta.className} mx-auto grid w-[1160px] grid-cols-4 gap-3`}>
      {/* Rad 0 */}
      {FLISER.filter((f) => f.r === 0).map((f) => (
        <Flis key={f.navn} navn={f.navn} stil={flisStil(Math.abs(f.r - 1) + Math.abs(f.c - 1))}><f.Mini /></Flis>
      ))}
      {/* Rad 1 — Saker, DASHBORDET, Signering, Økonomi */}
      <Flis navn="Saker" stil={flisStil(1)}><MiniSaker /></Flis>
      {/* Dashbordet — det publikum nettopp så, i miniatyr (kamera-ankeret).
          Én stille ringpuls når veggen har landet: «det var denne flaten». */}
      <div className="flex flex-col gap-1.5">
        <div
          className={`relative aspect-[16/10] overflow-hidden rounded-xl border bg-white ${vis ? 'ov-puls' : ''}`}
          style={{ borderColor: '#d9c9f2', boxShadow: '0 10px 34px rgba(124,58,237,0.16), 0 0 0 3px rgba(181,123,255,0.14)' }}
        >
          <div className="origin-top-left" style={{ transform: `scale(${FLIS_SKALA})`, width: 1600, height: 1000 }}>
            <ForvalterFullskjerm />
          </div>
        </div>
        <p className="flex items-center justify-center gap-1 text-center text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#9a7bc9' }}>
          <Sparkles className="h-[10px] w-[10px]" strokeWidth={2.4} /> Oversikt
        </p>
      </div>
      {FLISER.filter((f) => f.r === 1).slice(1).map((f) => (
        <Flis key={f.navn} navn={f.navn} stil={flisStil(Math.abs(f.r - 1) + Math.abs(f.c - 1))}><f.Mini /></Flis>
      ))}
      {/* Rad 2 */}
      {FLISER.filter((f) => f.r === 2).map((f) => (
        <Flis key={f.navn} navn={f.navn} stil={flisStil(Math.abs(f.r - 1) + Math.abs(f.c - 1))}><f.Mini /></Flis>
      ))}
      <style>{`
        @keyframes ovPuls {
          0% { box-shadow: 0 10px 34px rgba(124,58,237,0.16), 0 0 0 3px rgba(181,123,255,0.14), 0 0 0 0 rgba(181,123,255,0.35); }
          100% { box-shadow: 0 10px 34px rgba(124,58,237,0.16), 0 0 0 3px rgba(181,123,255,0.14), 0 0 0 26px rgba(181,123,255,0); }
        }
        .ov-puls { animation: ovPuls 1.5s cubic-bezier(0.22, 1, 0.36, 1) 2100ms 1 both; }
      `}</style>
    </div>
  );
}

function Flis({ navn, stil, children }: { navn: string; stil: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5" style={stil}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-white" style={{ borderColor: '#eae7ef', boxShadow: '0 8px 26px rgba(20,15,30,0.07)' }}>
        {children}
      </div>
      <p className="text-center text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#9a9aa0]">{navn}</p>
    </div>
  );
}
