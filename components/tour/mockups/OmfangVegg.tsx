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

// Mikro-byggeklosser — ekte mikrotekst og presise detaljer, én familie
const Linje = ({ w = '70%', h = 5, c = C.strek, r = 3 }: { w?: string | number; h?: number; c?: string; r?: number }) => (
  <div style={{ width: w, height: h, backgroundColor: c, borderRadius: r }} />
);
const Chip = ({ tekst, bg, farge }: { tekst: string; bg: string; farge: string }) => (
  <span className="whitespace-nowrap rounded-full px-1.5 py-[2px] text-[6.5px] font-bold leading-none" style={{ backgroundColor: bg, color: farge }}>{tekst}</span>
);

function MiniKontrakter() {
  const rader = [
    { navn: 'Leiekontrakt · Nygård 12', chip: <Chip tekst="Signert" bg="rgba(106,171,142,0.14)" farge={C.green} /> },
    { navn: 'Leiekontrakt · Marken 8', chip: <Chip tekst="Til signering" bg="rgba(201,160,106,0.16)" farge="#a87f4a" /> },
    { navn: 'Depositum · Skuteviken 5', chip: <Chip tekst="Utkast" bg={C.flate} farge={C.sub} /> },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 p-3">
      {rader.map((r) => (
        <div key={r.navn} className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5" style={{ borderColor: C.border }}>
          <div className="flex h-5 w-4 shrink-0 items-center justify-center rounded-[3px]" style={{ backgroundColor: C.flate }}>
            <div className="flex flex-col gap-[2px]"><Linje w={7} h={1.5} c="#cfccd6" /><Linje w={7} h={1.5} c="#cfccd6" /><Linje w={5} h={1.5} c="#cfccd6" /></div>
          </div>
          <p className="flex-1 truncate text-[7.5px] font-semibold" style={{ color: C.tekst }}>{r.navn}</p>
          {r.chip}
        </div>
      ))}
    </div>
  );
}

function MiniSignering() {
  return (
    <div className="flex h-full items-center justify-center gap-3 p-3">
      <div className="relative flex h-[86%] w-[52%] flex-col gap-1.5 rounded-md border bg-white p-2.5" style={{ borderColor: C.border, boxShadow: '0 4px 14px rgba(20,15,30,0.06)' }}>
        <p className="text-[6.5px] font-bold" style={{ color: C.tekst }}>Leiekontrakt</p>
        <Linje w="85%" h={3} /><Linje w="70%" h={3} /><Linje w="78%" h={3} />
        <p className="mt-auto font-serif text-[9px] italic" style={{ color: '#6b6479' }}>Sofie Hansen</p>
        <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #b57bff)', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Chip tekst="Signert med BankID" bg="rgba(106,171,142,0.14)" farge={C.green} />
        <p className="text-[6.5px] font-medium" style={{ color: C.sub }}>2 av 2 parter</p>
      </div>
    </div>
  );
}

function MiniOkonomi() {
  const h = [38, 55, 46, 68, 60, 84];
  const mnd = ['S', 'O', 'N', 'D', 'J', 'F'];
  return (
    <div className="flex h-full flex-col p-3.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[6.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.sub }}>Leieinntekter</p>
          <p className="text-[11px] font-bold tabular-nums leading-tight" style={{ color: C.tekst }}>84 200 kr</p>
        </div>
        <Chip tekst="+12 %" bg="rgba(106,171,142,0.14)" farge={C.green} />
      </div>
      <div className="mt-auto flex items-end justify-between gap-1.5">
        {h.map((v, i) => (
          <div key={mnd[i]} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-[3px]" style={{ height: `${v * 0.55}px`, backgroundColor: i === h.length - 1 ? C.accent : C.strek }} />
            <span className="text-[6px] font-semibold" style={{ color: i === h.length - 1 ? C.accent : C.sub }}>{mnd[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniSaker() {
  const rader = [
    { farge: C.rose, tekst: 'Rørlegger · bad', chip: <Chip tekst="Pågår" bg="rgba(196,126,134,0.14)" farge={C.rose} /> },
    { farge: C.amber, tekst: 'Vaskemaskin bråker', chip: <Chip tekst="Tildelt" bg="rgba(201,160,106,0.16)" farge="#a87f4a" /> },
    { farge: C.blue, tekst: 'Lyspære i oppgang', chip: <Chip tekst="Ny" bg="rgba(125,164,201,0.15)" farge={C.blue} /> },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 p-3">
      {rader.map((r) => (
        <div key={r.tekst} className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5" style={{ borderColor: C.border }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.farge }} />
          <p className="flex-1 truncate text-[7.5px] font-semibold" style={{ color: C.tekst }}>{r.tekst}</p>
          {r.chip}
        </div>
      ))}
    </div>
  );
}

function MiniKalender() {
  const booket = [9, 10, 11, 16, 17, 22, 23, 24];
  return (
    <div className="flex h-full flex-col p-3.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[8px] font-bold" style={{ color: C.tekst }}>Februar</p>
        <p className="text-[6.5px] font-medium tabular-nums" style={{ color: C.sub }}>98 % belegg</p>
      </div>
      <div className="mt-2 grid flex-1 grid-cols-7 content-center gap-[4px]">
        {Array.from({ length: 28 }, (_, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded-[3px] text-[5.5px] font-semibold tabular-nums"
            style={{
              backgroundColor: booket.includes(i) ? 'rgba(181,123,255,0.35)' : C.flate,
              color: booket.includes(i) ? '#7c3aed' : C.sub,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBildestudio() {
  return (
    <div className="flex h-full gap-2 p-3">
      <div className="relative flex-1 overflow-hidden rounded-md" style={{ background: 'linear-gradient(135deg, #d8d5de, #eae7ef)' }}>
        <span className="absolute bottom-1.5 left-1.5 rounded-[3px] bg-black/20 px-1 py-[1.5px] text-[6px] font-bold text-white">Før</span>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-md" style={{ background: 'linear-gradient(135deg, #c9b4ec, #e6d9fb)' }}>
        <span className="absolute bottom-1.5 left-1.5 rounded-[3px] bg-black/25 px-1 py-[1.5px] text-[6px] font-bold text-white">Etter</span>
        <Wand2 className="absolute right-1.5 top-1.5 h-3 w-3 text-white" strokeWidth={2.2} />
      </div>
    </div>
  );
}

function MiniInnboks() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 p-3.5">
      <div className="mb-0.5 flex items-center gap-1.5">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[5.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #9a8fb8, #7d729e)' }}>SH</span>
        <p className="text-[7px] font-bold" style={{ color: C.tekst }}>Sofie Hansen</p>
        <p className="text-[6px]" style={{ color: C.sub }}>· Leietaker</p>
      </div>
      <div className="mr-auto max-w-[78%] rounded-xl rounded-bl-[4px] px-2 py-1.5" style={{ backgroundColor: C.flate }}>
        <p className="text-[7px] font-medium leading-snug" style={{ color: '#55505e' }}>Hei! Når kan jeg hente nøklene?</p>
      </div>
      <div className="ml-auto max-w-[78%] rounded-xl rounded-br-[4px] bg-[#1a1a1a] px-2 py-1.5">
        <p className="text-[7px] font-medium leading-snug text-white/85">1. mars kl. 12 — du får kode på SMS</p>
      </div>
    </div>
  );
}

function MiniAnnonse() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="relative h-[50%] overflow-hidden rounded-md" style={{ background: 'linear-gradient(135deg, #dcd9e2, #edeaf1)' }}>
        <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-white px-1 py-[1.5px] text-[6px] font-bold" style={{ color: '#0063fb', boxShadow: '0 1px 4px rgba(20,15,30,0.12)' }}>Publisert på FINN</span>
      </div>
      <div className="mt-2 flex flex-col gap-[3px]">
        <p className="text-[8px] font-bold leading-tight" style={{ color: C.tekst }}>Lys 2-roms på Marken</p>
        <div className="flex items-center justify-between">
          <p className="text-[6.5px] font-medium" style={{ color: C.sub }}>124 visninger · 9 henvendelser</p>
          <p className="text-[8px] font-bold tabular-nums" style={{ color: C.tekst }}>18 500 kr</p>
        </div>
      </div>
    </div>
  );
}

function MiniKanaler() {
  const rader = [
    { navn: 'Airbnb', farge: '#FF5A5F' },
    { navn: 'Booking.com', farge: '#003580' },
    { navn: 'FINN.no', farge: '#0063fb' },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 p-3">
      {rader.map((r) => (
        <div key={r.navn} className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5" style={{ borderColor: C.border }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.farge }} />
          <p className="flex-1 text-[7.5px] font-semibold" style={{ color: C.tekst }}>{r.navn}</p>
          <span className="flex items-center gap-1">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            <span className="text-[6.5px] font-semibold" style={{ color: C.green }}>Synk OK</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniEierapp() {
  return (
    <div className="flex h-full items-center justify-center p-2">
      <div className="flex h-[92%] w-[44%] flex-col gap-1.5 rounded-[10px] border bg-white p-1.5 pt-2" style={{ borderColor: '#d8d5de', boxShadow: '0 4px 14px rgba(20,15,30,0.08)' }}>
        <div className="mx-auto h-1 w-6 rounded-full" style={{ backgroundColor: C.strek }} />
        <div className="rounded-md p-1.5" style={{ backgroundColor: C.flate }}>
          <p className="text-[5.5px] font-semibold" style={{ color: C.sub }}>Belegg</p>
          <p className="text-[7.5px] font-bold tabular-nums" style={{ color: C.tekst }}>98 %</p>
        </div>
        <div className="rounded-md bg-[#1a1a1a] p-1.5">
          <p className="text-[5.5px] font-semibold text-white/45">Utbetaling</p>
          <p className="text-[7.5px] font-bold tabular-nums text-white">18 200 kr</p>
        </div>
        <div className="rounded-md p-1.5" style={{ backgroundColor: C.flate }}>
          <p className="text-[5.5px] font-semibold" style={{ color: C.sub }}>Neste gjest</p>
          <p className="text-[7px] font-bold" style={{ color: C.tekst }}>13. feb</p>
        </div>
      </div>
    </div>
  );
}

function MiniAssistent() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-3.5">
      <div className="flex items-start gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: 'linear-gradient(140deg, #7c3aed, #cf97fc)', boxShadow: '0 3px 10px rgba(124,58,237,0.3)' }}>
          <Bot className="h-2.5 w-2.5 text-white" strokeWidth={2.2} />
        </span>
        <div className="rounded-xl rounded-tl-[4px] px-2 py-1.5" style={{ backgroundColor: C.flate }}>
          <p className="text-[7px] font-medium leading-snug" style={{ color: '#55505e' }}>3 saker krever oppfølging i dag — skal jeg purre rørleggeren?</p>
        </div>
      </div>
      <div className="ml-auto rounded-full border px-2 py-1" style={{ borderColor: C.border }}>
        <p className="text-[6.5px] font-semibold" style={{ color: C.accent }}>Ja, send purring →</p>
      </div>
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
