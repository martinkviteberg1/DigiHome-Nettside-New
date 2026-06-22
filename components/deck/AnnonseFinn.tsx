'use client';
/**
 * AnnonseFinn — investor-slide: «Fra bolig til FINN. På minutter.»
 *
 * Kinematisk, auto-spillende sekvens som rekonstruerer den ekte
 * klargjørings-flyten (jf. repo-spec / SystemFilm-flatene):
 *   01 Last opp bilder        → 3 foto inn
 *   02 AI fyller boligdata     → skann + auto-utfylte felter/fasiliteter + stylet for visning
 *   03 Annonse skrevet av AI   → FINN.no-annonse (galleri + tekst + «Skrevet av DigiHome»)
 *   04 Publisert               → FINN.no + egen utleieside · Live
 *
 * Mørk SlideFrame der det lyse grensesnittet gløder (matcher produkt-sliden).
 * Selvstendig — importerer ikke app-kode. Deck-DNA: RG/Diatype, #d298ff.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Check, Wand2, Camera, MapPin, ShieldCheck, ArrowRight,
  Home, Ruler, Layers, CalendarDays, Sofa, Loader2,
} from 'lucide-react';

/* ── fonter ── */
const PJ = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const F = "var(--font-body), 'ABC Diatype', -apple-system, sans-serif";
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, sans-serif";

/* ── palett (lyst app/browser-grensesnitt) ── */
const ACCENT = '#d298ff', ACCENT_DK = '#7c3aed', ACCENT_SOFT = '#f3ebff', ACCENT_TXT = '#6d28d9';
const FINN_BLUE = '#0063fb';
const INK = '#1a1a1a', INK2 = '#2d2d2d', SUB = '#6f6b76', MUTED = '#9a96a1', FAINT = '#c5c1cc';
const LINE = '#ebe8f0', SURF = '#ffffff', BG = '#fbfaf8', SOFT = '#f6f4f9';
const GREEN = '#0c9b6a', GREEN_BG = '#e6f6ef';
const GOLD = '#a98a52';

/* ── dimensjoner (fast canvas → skala-til-fyll for skarphet) ── */
const DESK_W = 1160;
const FRAME_H = 588;
const ease = [0.22, 1, 0.36, 1] as const;

/* ── data ── */
const STAGES = [1700, 2100, 3200, 2900, 4000]; // 0 upload, 1 scan, 2 data, 3 publiserer, 4 live
const UPLOAD = ['/film/photos/stue.jpg', '/film/photos/kjokken.jpg', '/film/photos/soverom.jpg'];
const UPLOAD_LABELS = ['Stue', 'Kjøkken', 'Soverom'];
const FIELDS: [any, string, string][] = [
  [Home, 'Boligtype', '3-roms leilighet'],
  [Ruler, 'Areal', '74 m²'],
  [Layers, 'Etasje', '4. av 5'],
  [CalendarDays, 'Byggeår', '1899'],
  [Sofa, 'Møblering', 'Møblert'],
];
const FACILITIES = ['Balkong', 'Oppvaskmaskin', 'Heis', 'Kjeller', 'Peis', 'Bredbånd'];
const GALLERY = ['/film/photos/stue.jpg', '/film/photos/kjokken.jpg', '/film/photos/bad.jpg', '/film/photos/soverom.jpg', '/film/photos/ext1.jpg'];
const RAIL = ['Last opp', 'AI fyller data', 'Annonse skrevet', 'Publisert'];
const RAIL_NODE = [0, 0, 1, 2, 3]; // stage → rail-node

/* ═══════════════════ FLATE 1 · REGISTRER (AI-boligdata) ═══════════════════ */
function RegistrerView({ stage }: { stage: number }) {
  const scanning = stage === 1;
  const dataIn = stage >= 2;
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
      {/* app top bar */}
      <div className="flex items-center justify-between px-7 shrink-0" style={{ height: 72, borderBottom: `1px solid ${LINE}`, background: SURF }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ fontFamily: PJ, color: MUTED }}>Ny utleie · Camilla Colletts gate 14A</p>
          <h3 className="text-[22px] tracking-[-0.02em] leading-tight" style={{ fontFamily: FH, fontWeight: 700, color: INK }}>Registrer boligen</h3>
        </div>
        <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold" style={{ fontFamily: PJ, background: ACCENT_SOFT, color: ACCENT_TXT }}>
          <Wand2 className="w-4 h-4" strokeWidth={2} /> AI-registrering
        </span>
      </div>
      {/* body */}
      <div className="flex-1 p-6 grid min-h-0" style={{ gridTemplateColumns: '1.05fr 1fr', gap: 20 }}>
        {/* venstre: bilder + skann */}
        <div className="rounded-2xl p-5 relative overflow-hidden flex flex-col" style={{ background: SURF, border: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4" style={{ color: SUB }} strokeWidth={1.8} />
            <span className="text-[12.5px] font-semibold" style={{ fontFamily: FH, color: INK }}>Bilder lastet opp</span>
            <span className="ml-auto text-[11px] tabular-nums" style={{ fontFamily: PJ, color: FAINT }}>3 / 3</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {UPLOAD.map((src, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', boxShadow: 'inset 0 0 0 1px rgba(26,22,18,0.05)', filter: dataIn ? 'saturate(1.06) contrast(1.02)' : 'saturate(0.94) brightness(0.98)', transition: 'filter 0.6s ease' }}>
                <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 flex items-center justify-between" style={{ background: 'linear-gradient(to top, rgba(20,16,12,0.66), transparent)' }}>
                  <span className="text-[10px] font-semibold text-white" style={{ fontFamily: FH }}>{UPLOAD_LABELS[i]}</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: GREEN }}><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></span>
                </div>
                {scanning && <div className="absolute inset-x-0 z-10" style={{ height: 42, top: 0, background: `linear-gradient(to bottom, transparent, ${ACCENT}66, transparent)`, animation: 'afScan 1.6s ease-in-out infinite' }} />}
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4">
            {scanning && (
              <div className="flex items-center gap-2 text-[12.5px] font-medium" style={{ fontFamily: F, color: ACCENT_TXT }}>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.2} /> Gjenkjenner rom og fasiliteter …
              </div>
            )}
            {dataIn && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: ACCENT_SOFT, animation: 'afRise 0.5s ease both' }}>
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: ACCENT_TXT }} strokeWidth={2} />
                <span className="text-[12px] font-medium" style={{ fontFamily: F, color: ACCENT_TXT }}>Bildene er stylet for visning</span>
              </div>
            )}
          </div>
        </div>
        {/* høyre: auto-utfylte data */}
        <div className="rounded-2xl p-6 relative overflow-hidden flex flex-col" style={{ background: SURF, border: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} /><span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ fontFamily: PJ, color: GOLD }}>Hentet automatisk</span></div>
          <h3 className="text-[19px] font-bold tracking-[-0.01em] mb-3" style={{ fontFamily: FH, color: INK }}>Boligdata</h3>
          <div>
            {FIELDS.map(([Ic, k, v], i) => (
              <div key={k} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < FIELDS.length - 1 ? `1px solid ${LINE}` : 'none', opacity: dataIn ? 1 : 0, transform: dataIn ? 'none' : 'translateY(6px)', transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s` }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: SOFT }}><Ic className="w-4 h-4" style={{ color: INK2 }} strokeWidth={1.8} /></span>
                <span className="text-[13px]" style={{ fontFamily: F, color: SUB }}>{k}</span>
                <span className="ml-auto text-[14px] font-semibold tabular-nums" style={{ fontFamily: FH, color: INK }}>{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold mt-4 mb-2.5" style={{ fontFamily: PJ, color: GOLD }}>Fasiliteter</p>
          <div className="flex flex-wrap gap-2">
            {FACILITIES.map((f, i) => (
              <span key={f} className="text-[12px] font-medium px-3 py-1.5 rounded-full" style={{ fontFamily: F, background: SOFT, color: INK2, opacity: dataIn ? 1 : 0, transform: dataIn ? 'none' : 'scale(0.92)', transition: `all 0.4s ease ${0.4 + i * 0.06}s` }}>{f}</span>
            ))}
          </div>
          <div className="mt-auto pt-5">
            <span className="inline-flex items-center gap-2 h-11 px-5 rounded-full font-semibold text-[13.5px]" style={{ fontFamily: FH, background: dataIn ? INK : SOFT, color: dataIn ? '#fff' : FAINT, transition: 'all 0.4s ease' }}>Bekreft og publiser <ArrowRight className="w-4 h-4" strokeWidth={2.4} /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ FLATE 2 · FINN-PUBLISERING (browser) ═══════════════════ */
function FinnView({ stage }: { stage: number }) {
  const published = stage >= 4;
  return (
    <div className="absolute inset-0" style={{ background: '#f4f4f4' }}>
      {/* browser-chrome */}
      <div className="flex items-center gap-2 px-4" style={{ height: 44, background: '#e9e9ea', borderBottom: '1px solid #dadada' }}>
        <span className="flex gap-1.5">{['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</span>
        <div className="ml-3 flex-1 max-w-[460px] h-7 rounded-lg flex items-center gap-2 px-3" style={{ background: '#fff', border: '1px solid #dadada' }}><ShieldCheck className="w-3.5 h-3.5" style={{ color: GREEN }} /><span className="text-[12px]" style={{ fontFamily: F, color: '#555' }}>finn.no/realestate/lettings/…</span></div>
        <span className="ml-3 font-black text-[15px] tracking-tight" style={{ color: FINN_BLUE }}>FINN</span>
      </div>
      <div className="px-12 pt-7" style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* galleri */}
        <div className="grid gap-2.5 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: '2fr 1fr 1fr', height: 312 }}>
          <div className="row-span-2 relative overflow-hidden">
            <img src={GALLERY[0]} alt="" className="w-full h-full object-cover" draggable={false} />
            <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.94)', color: INK, fontFamily: FH }}>Til leie</span>
          </div>
          <div className="relative overflow-hidden"><img src={GALLERY[1]} alt="" className="w-full h-full object-cover" draggable={false} /></div>
          <div className="relative overflow-hidden"><img src={GALLERY[3]} alt="" className="w-full h-full object-cover" draggable={false} /></div>
          <div className="relative overflow-hidden"><img src={GALLERY[2]} alt="" className="w-full h-full object-cover" draggable={false} /></div>
          <div className="relative overflow-hidden">
            <img src={GALLERY[4]} alt="" className="w-full h-full object-cover" draggable={false} />
            <span className="absolute bottom-2.5 right-2.5 text-[10.5px] font-semibold px-2 py-1 rounded-md flex items-center gap-1" style={{ background: 'rgba(20,16,12,0.66)', color: '#fff' }}><Camera className="w-3 h-3" /> 24 bilder</span>
          </div>
        </div>
        {/* annonse-tekst */}
        <div className="flex items-start justify-between mt-6">
          <div className="max-w-[600px]">
            <h1 className="text-[28px] font-bold tracking-[-0.02em] leading-tight" style={{ color: '#1a1a1a', fontFamily: FH }}>Lys og nyoppusset 3-roms i Møhlenpris</h1>
            <p className="flex items-center gap-1.5 mt-2 text-[14px]" style={{ color: '#555', fontFamily: F }}><MapPin className="w-4 h-4" strokeWidth={1.8} /> Camilla Colletts gate 14A, 5006 Bergen</p>
            <div className="flex gap-7 mt-4">
              {[['Leie', '16 800 kr'], ['Areal', '74 m²'], ['Soverom', '3'], ['Type', 'Leilighet']].map(([k, v]) => (
                <div key={k}><p className="text-[11px] uppercase tracking-[0.1em]" style={{ color: '#888', fontFamily: F }}>{k}</p><p className="text-[16px] font-bold mt-0.5 tabular-nums" style={{ color: '#1a1a1a', fontFamily: FH }}>{v}</p></div>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2" style={{ background: ACCENT_SOFT, color: ACCENT_TXT }}><Wand2 className="w-3 h-3" /> Skrevet av DigiHome</span>
            <p className="text-[12px]" style={{ color: '#888', fontFamily: F }}>Annonsert av</p>
            <p className="text-[15px] font-bold" style={{ color: INK, fontFamily: FH }}>digihome</p>
          </div>
        </div>
      </div>
      {/* publiser-status */}
      <div className="absolute z-40" style={{ bottom: 24, right: 24, width: 430 }}>
        <div className="rounded-2xl px-6 py-5" style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 28px 70px -20px rgba(26,22,18,0.34)', animation: 'afRise 0.5s ease both' }}>
          <p className="text-[11px] uppercase tracking-[0.16em] font-bold mb-3" style={{ fontFamily: PJ, color: published ? GREEN : GOLD }}>{published ? 'Publisert · 2 kanaler' : 'Publiserer …'}</p>
          {([['FINN.no', FINN_BLUE], ['din-utleieside.no', ACCENT_TXT]] as [string, string][]).map(([t]) => (
            <div key={t} className="flex items-center gap-3 py-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: published ? GREEN_BG : SOFT }}>
                {published ? <Check className="w-3.5 h-3.5" style={{ color: GREEN }} strokeWidth={3} /> : <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: FAINT }} />}
              </span>
              <span className="text-[14px] font-semibold" style={{ fontFamily: FH, color: INK }}>{t}</span>
              {published && <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: GREEN }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />Live</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ FREMDRIFTS-SKINNE (på mørk slide → hvit) ═══════════════════ */
function Rail({ active }: { active: number }) {
  const progress = active / (RAIL.length - 1);
  return (
    <div className="mt-7 mx-auto w-full" style={{ maxWidth: 720 }}>
      <div className="relative flex items-center justify-between px-2">
        <span className="absolute left-6 right-6 top-[7px] h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.14)' }} />
        <span className="absolute left-6 top-[7px] h-[2px] rounded-full" style={{ width: `calc((100% - 48px) * ${progress})`, background: `linear-gradient(90deg, ${ACCENT_DK}, ${ACCENT})`, boxShadow: `0 0 12px ${ACCENT}66`, transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
        {RAIL.map((label, i) => {
          const on = active === i, done = active > i, last = i === RAIL.length - 1;
          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-2" style={{ width: 130 }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: on ? ACCENT : done ? ACCENT_DK : 'rgba(255,255,255,0.08)', border: `1.5px solid ${on || done ? ACCENT : 'rgba(255,255,255,0.2)'}`, boxShadow: on ? `0 0 0 5px ${ACCENT}22` : 'none', transition: 'all 0.5s ease' }}>
                {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                {on && last && <Sparkles className="w-2.5 h-2.5 text-white" strokeWidth={2.4} />}
              </span>
              <span className="text-[11px] font-semibold whitespace-nowrap" style={{ fontFamily: F, color: on ? '#fff' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)', fontWeight: on ? 700 : 500, transition: 'color 0.5s ease' }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════ SLIDE-INNHOLD ═══════════════════ */
export default function AnnonseFinn({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const on = active || pdfMode;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(DESK_W);
  const [stage, setStage] = useState(0);

  // mål bredde → skala-til-fyll
  useEffect(() => {
    const update = () => { if (wrapRef.current) setCw(wrapRef.current.offsetWidth); };
    update();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && wrapRef.current) { ro = new ResizeObserver(update); ro.observe(wrapRef.current); }
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); if (ro) ro.disconnect(); };
  }, []);

  // sekvens (reset)
  useEffect(() => {
    if (pdfMode) { setStage(4); return; }
    setStage(0);
  }, [active, pdfMode]);

  // sekvens (auto-spill)
  useEffect(() => {
    if (!active || pdfMode) return;
    const t = setTimeout(() => setStage((s) => (s + 1) % STAGES.length), STAGES[stage]);
    return () => clearTimeout(t);
  }, [active, pdfMode, stage]);

  const surface = stage <= 2 ? 'reg' : 'finn';
  const scale = Math.min(1, cw / DESK_W);

  return (
    <div className="mx-auto self-stretch px-6 sm:px-12 w-full relative z-10 flex flex-col justify-center" style={{ maxWidth: 1340 }}>
      <style>{`
        @keyframes afFade { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes afHeadIn { from { opacity:0; transform: translateY(16px); filter: blur(6px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes afIn { from { opacity:0; transform: translateY(26px); filter: blur(8px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes afRise { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes afScan { 0% { top:-14%; opacity:0; } 18% { opacity:1; } 100% { top:114%; opacity:0; } }
      `}</style>

      {/* header */}
      <div className="mb-5 sm:mb-7">
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] mb-4" style={{ fontFamily: F, color: 'rgba(255,255,255,0.5)', animation: on ? 'afFade 0.7s ease 0.1s both' : undefined, opacity: on ? undefined : 0 }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }} /> Klargjøring · ett klikk
            </span>
            <h2 className="font-bold tracking-[-0.042em] leading-[1.0]" style={{ fontFamily: FH, fontWeight: 700, color: '#fff', fontSize: 'clamp(28px, 3.8vw, 52px)', animation: on ? 'afHeadIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined, opacity: on ? undefined : 0 }}>
              Fra bolig til FINN. På minutter.
            </h2>
          </div>
          <p className="font-light leading-[1.55] max-w-[430px] mb-1" style={{ fontFamily: F, color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(12px, 1vw, 14px)', animation: on ? 'afFade 0.7s ease 0.4s both' : undefined, opacity: on ? undefined : 0 }}>
            Last opp bildene. <span style={{ color: '#fff' }}>AI fyller inn boligdata, styler bildene og skriver annonsen</span> — du publiserer til FINN.no og egen utleieside med ett klikk.
          </p>
        </div>
      </div>

      {/* enhet-ramme (lyst grensesnitt som gløder) */}
      <div ref={wrapRef} className="w-full">
        <div style={{ animation: on && !pdfMode ? 'afIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s both' : undefined, opacity: on ? undefined : 0 }}>
          <div style={{ height: FRAME_H * scale, position: 'relative' }}>
            <div style={{ width: DESK_W, transform: `scale(${scale})`, transformOrigin: 'top center', position: 'absolute', left: '50%', marginLeft: -DESK_W / 2, top: 0 }}>
              <div className="rounded-[24px] overflow-hidden relative" style={{ width: DESK_W, height: FRAME_H, background: BG, border: '1px solid #e2deea', boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 60px 130px -44px rgba(0,0,0,0.62), 0 24px 60px -34px rgba(120,70,210,0.28)' }}>
                <AnimatePresence>
                  {surface === 'reg' ? (
                    <motion.div key="reg" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }} transition={{ duration: 0.6, ease }}>
                      <RegistrerView stage={stage} />
                    </motion.div>
                  ) : (
                    <motion.div key="finn" className="absolute inset-0" initial={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease }}>
                      <FinnView stage={stage} />
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* fin vignett for dybde */}
                <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 45%, transparent 62%, rgba(12,10,18,0.10) 100%)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* fremdrifts-skinne */}
      <Rail active={RAIL_NODE[stage]} />
    </div>
  );
}
