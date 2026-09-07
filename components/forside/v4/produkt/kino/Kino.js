'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall } from '../../motion';
import { Hake, Portrett } from '../filmdeler';

/* ---------------------------------------------------------------------------
   Kino — full bleed-motoren for produktfilmene.

   Fotoet ER scenen. Hver scene har sitt eget fullskjermsfoto; alt som
   fortelles ligger rett på fotoet. Ingen kort, ingen papir, ingen ramme.

   Komposisjon (desktop)
   · Nede til venstre: én stor editorial overskrift per akt + én setning.
   · Til høyre, midtstilt: produktobjektet (én ting om gangen).
   · Øverst til venstre: «Topp» — stempel/teller (kamera, husleie).
   · Nederst, hele bredden: tidslinjen med de fire kapitlene (i ProduktSeksjon).

   Foto
   · Lyse interiører → tema 'lys' (blekk på fotoet). Fasader i kveld/natt →
     tema 'mork' (offwhite). Scrimmen er retningsbestemt (nede/venstre), ikke
     et grått slør over hele bildet.
   · Dissolve mellom scener (nytt bilde setter seg 1.04 → 1), eller harde kutt
     (`kutt`) for montasje.
   · Bare aktivt, forrige og neste foto er montert. Fotoet er alltid synlig —
     ingen synlighetsport på selve stagen (det ga svart flate).

   Bevegelse = transform/opacity. Ingen backdrop-filter, ingen animerte filtre.
--------------------------------------------------------------------------- */

export const OFF = '#F4F1EA';
export const INK = '#15130F';
export const BUNN = '#141117';
export const MORF = 'cubic-bezier(0.65, 0, 0.18, 1)';
export const UT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/* Marger — felles for tekst, sone, topp og tidslinje */
export const MARG_X = 'clamp(24px, 5vw, 96px)';
export const BUNN_Y = 'clamp(22px, 3.6vh, 40px)';                 // tidslinjens avstand fra bunnen
export const TEKST_BUNN = 'calc(clamp(22px, 3.6vh, 40px) + 92px)'; // teksten står over tidslinjen
export const TOPP_Y = 104;                                          // under navigasjonen (desktop)
export const TOPP_K = 100;                                          // produktsonen på mobil starter her
export const margPx = (w, h) => ({ x: Math.min(96, Math.max(24, w * 0.05)), y: Math.min(40, Math.max(22, h * 0.036)) });

/* Et scene-foto. kilder = [[bredde, url], …] → srcSet. iw/ih = originalens proporsjoner (til å feste etiketter),
   pos = object-position desktop, posLiten = mobil, tema = 'mork' | 'lys' (hva teksten skal være på dette fotoet). */
export function bilde(id, kilder, iw, ih, pos = '50% 50%', posLiten, tema = 'mork') {
  const k = [...kilder].sort((a, b) => a[0] - b[0]);
  const std = k.find(([w]) => w >= 1600) || k[k.length - 1];
  return { id, kilder: k, src: std[1], liten: k[0][1], srcSet: k.map(([w, u]) => `${u} ${w}w`).join(', '), iw, ih, pos, posLiten: posLiten || pos, tema };
}

const Ctx = createContext({ w: 0, h: 0, kompakt: false, tema: 'mork', ov: false });
export const useKino = () => useContext(Ctx);

/* Farger for alt som ligger på fotoet */
export function farger(tema) {
  const ink = tema === 'lys';
  return {
    ink,
    tekst: ink ? INK : OFF,
    svak: ink ? 'rgba(21,19,15,0.56)' : 'rgba(244,241,234,0.60)',
    brod: ink ? 'rgba(21,19,15,0.80)' : 'rgba(244,241,234,0.86)',
    dempet: ink ? 'rgba(21,19,15,0.40)' : 'rgba(244,241,234,0.42)',
    hair: ink ? 'rgba(21,19,15,0.13)' : 'rgba(244,241,234,0.18)',
    flate: ink ? 'rgba(21,19,15,0.05)' : 'rgba(244,241,234,0.10)',
    pille: ink ? 'rgba(251,250,248,0.96)' : 'rgba(14,12,16,0.72)',
    pilleSkygge: ink ? '0 12px 32px -14px rgba(0,0,0,0.35)' : 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 12px 32px -14px rgba(0,0,0,0.6)',
    halo: ink ? 'rgba(21,19,15,0.16)' : 'rgba(255,255,255,0.32)',
    gronn: ink ? '#166B3C' : '#9BE7B8',
    gronnBg: ink ? 'rgba(31,157,85,0.12)' : 'rgba(31,157,85,0.26)',
  };
}

/* Cover-geometri for et bilde på stagen. punkt(fx, fy) i bildeandel (0–1) → px; rekt({x,y,w,h} i %) → px. */
export function dekk(st, b) {
  if (!st?.w || !st?.h || !b) return null;
  const [px, py] = (st.kompakt ? b.posLiten : b.pos).split(' ').map((v) => parseFloat(v) / 100);
  const s = Math.max(st.w / b.iw, st.h / b.ih);
  const dw = b.iw * s; const dh = b.ih * s;
  const ox = (st.w - dw) * px; const oy = (st.h - dh) * py;
  return {
    dw, dh, ox, oy,
    punkt: (fx, fy) => ({ x: Math.round(ox + fx * dw), y: Math.round(oy + fy * dh) }),
    rekt: (o) => ({ x: Math.round(ox + (o.x / 100) * dw), y: Math.round(oy + (o.y / 100) * dh), w: Math.round((o.w / 100) * dw), h: Math.round((o.h / 100) * dh) }),
  };
}

/* Scrim — retningsbestemt: tung nede/venstre (teksten), svak øverst (navigasjonen), fri i midten (fotoet). */
export const SCRIM = {
  mork: 'linear-gradient(180deg, rgba(14,12,16,0.36) 0%, rgba(14,12,16,0.06) 20%, rgba(14,12,16,0) 46%, rgba(14,12,16,0.44) 72%, rgba(14,12,16,0.92) 100%), radial-gradient(ellipse 64% 72% at 10% 100%, rgba(14,12,16,0.86) 0%, rgba(14,12,16,0.44) 46%, rgba(14,12,16,0) 100%)',
  lys: 'linear-gradient(180deg, rgba(248,246,241,0.14) 0%, rgba(248,246,241,0) 18%, rgba(248,246,241,0) 50%, rgba(248,246,241,0.30) 74%, rgba(248,246,241,0.86) 100%), radial-gradient(ellipse 62% 70% at 10% 100%, rgba(248,246,241,0.90) 0%, rgba(248,246,241,0.46) 46%, rgba(248,246,241,0) 100%)',
};
const SONE = {
  mork: 'linear-gradient(270deg, rgba(14,12,16,0.72) 0%, rgba(14,12,16,0.46) 34%, rgba(14,12,16,0) 66%)',
  lys: 'linear-gradient(270deg, rgba(248,246,241,0.76) 0%, rgba(248,246,241,0.44) 34%, rgba(248,246,241,0) 66%)',
};
const SONE_TOPP = {
  mork: 'linear-gradient(180deg, rgba(14,12,16,0.80) 0%, rgba(14,12,16,0.58) 44%, rgba(14,12,16,0) 74%)',
  lys: 'linear-gradient(180deg, rgba(248,246,241,0.86) 0%, rgba(248,246,241,0.60) 44%, rgba(248,246,241,0) 74%)',
};

export function KinoStil() {
  return (
    <style>{`
@keyframes v4-kino-sett { from { transform: scale(1.045) } to { transform: scale(1) } }
@keyframes v4-kino-snapp { from { transform: scale(1.02) } to { transform: scale(1) } }
@keyframes v4-kino-driv { from { transform: scale(1) } to { transform: scale(1.035) } }
@keyframes v4-kino-ord { from { transform: translateY(110%) } to { transform: translateY(0) } }
@keyframes v4-kino-inn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
@keyframes v4-kino-blits { 0% { opacity: 0 } 12% { opacity: 0.55 } 100% { opacity: 0 } }
@keyframes v4-kino-ping { from { transform: scale(0.6); opacity: 0.55 } to { transform: scale(2.8); opacity: 0 } }
@keyframes v4-kino-puls { 0%, 100% { transform: scale(1); opacity: 0.55 } 50% { transform: scale(1.7); opacity: 0 } }
@keyframes v4-kino-prikk { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-2px) } }
@keyframes v4-kino-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
@keyframes v4-ring { from { transform: scale(0.45); opacity: 0.6 } to { transform: scale(1.7); opacity: 0 } }
`}</style>
  );
}

/* ── Stagen ──
   driv: 'av' (statisk — der etiketter er festet i fotoet), 'sett' (setter seg 1.045 → 1), 'full' (setter seg og driver 1 → 1.035 over 16 s).
   kutt: hardt kutt (montasje) i stedet for dissolve. */
export function KinoStage({ bilder, aktiv, neste = null, tema = 'mork', sone = false, driv = 'sett', kutt = false, ov = false, morkt = false, fase, testid = 'v4-kino', lag = null, korn = true, children }) {
  const ref = useRef(null);
  const [m, setM] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const maal = () => setM({ w: el.clientWidth, h: el.clientHeight });
    maal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maal) : null;
    ro?.observe(el);
    window.addEventListener('resize', maal);
    return () => { ro?.disconnect(); window.removeEventListener('resize', maal); };
  }, []);
  const kompakt = m.w > 0 && m.w < 1024;
  const ctx = useMemo(() => ({ w: m.w, h: m.h, kompakt, tema, ov, fase }), [m.w, m.h, kompakt, tema, ov, fase]);
  const ink = tema === 'lys';
  const modus = driv === true ? 'full' : driv === false ? 'av' : driv;

  /* Dissolve: nytt bilde monteres på nytt UNDER det gamle (nøkkel = aktiveringsteller), det gamle tones ut over det. */
  const sist = useRef(null);
  const forrige = useRef(null);
  const teller = useRef({});
  const kuttet = useRef(false);
  if (sist.current !== aktiv) {
    forrige.current = sist.current;
    sist.current = aktiv;
    teller.current[aktiv] = (teller.current[aktiv] || 0) + 1;
    kuttet.current = kutt;
  }
  const hardt = kuttet.current;
  const anim = ov || modus === 'av' ? 'none'
    : hardt ? `v4-kino-snapp 700ms ${UT} both`
      : modus === 'full' ? `v4-kino-sett 1200ms ${UT} both, v4-kino-driv 16s linear 1200ms forwards`
        : `v4-kino-sett 1200ms ${UT} both`;

  /* Svak parallakse etter musen (desktop, presis peker): fotoet 4 px, innholdet 7 px. Lerpet i rAF — kun transform. */
  const bgRef = useRef(null); const innRef = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || ov || kompakt || typeof window === 'undefined' || !window.matchMedia?.('(pointer: fine)').matches) return undefined;
    let maal = { x: 0, y: 0 }; let naa = { x: 0, y: 0 }; let raf = 0; let aktivt = false;
    const tikk = () => {
      naa = { x: naa.x + (maal.x - naa.x) * 0.08, y: naa.y + (maal.y - naa.y) * 0.08 };
      if (bgRef.current) bgRef.current.style.transform = `translate3d(${(naa.x * 4).toFixed(2)}px, ${(naa.y * 4).toFixed(2)}px, 0)`;
      if (innRef.current) innRef.current.style.transform = `translate3d(${(naa.x * 7).toFixed(2)}px, ${(naa.y * 7).toFixed(2)}px, 0)`;
      if (Math.abs(maal.x - naa.x) > 0.002 || Math.abs(maal.y - naa.y) > 0.002) raf = requestAnimationFrame(tikk); else aktivt = false;
    };
    const start = () => { if (!aktivt) { aktivt = true; raf = requestAnimationFrame(tikk); } };
    const flytt = (e) => { const r = el.getBoundingClientRect(); maal = { x: ((e.clientX - r.left) / r.width - 0.5) * -2, y: ((e.clientY - r.top) / r.height - 0.5) * -2 }; start(); };
    const ut = () => { maal = { x: 0, y: 0 }; start(); };
    el.addEventListener('mousemove', flytt, { passive: true }); el.addEventListener('mouseleave', ut);
    return () => { el.removeEventListener('mousemove', flytt); el.removeEventListener('mouseleave', ut); cancelAnimationFrame(raf); };
  }, [ov, kompakt]);

  return (
    <Ctx.Provider value={ctx}>
      <div ref={ref} className="absolute inset-0 overflow-hidden" style={{ background: BUNN, color: ink ? INK : OFF }} data-testid={testid} data-fase={fase} data-bilde={aktiv} data-tema={tema}>
        <KinoStil />
        <div ref={bgRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
          {bilder.map((b) => {
            const paa = b.id === aktiv; const var_ = b.id === forrige.current; const nest = b.id === neste;
            if (!paa && !var_ && !nest) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${b.id}-${teller.current[b.id] || 0}`}
                src={b.src}
                srcSet={b.srcSet}
                sizes="100vw"
                alt=""
                draggable={false}
                decoding="async"
                loading="eager"
                fetchPriority={paa ? 'high' : 'low'}
                onError={(e) => { const el = e.currentTarget; if (el.dataset.fall) return; el.dataset.fall = '1'; el.removeAttribute('srcset'); el.src = b.liten; }}
                className="absolute inset-0 h-full w-full select-none object-cover"
                style={{
                  objectPosition: kompakt ? b.posLiten : b.pos,
                  zIndex: var_ ? 2 : paa ? 1 : 0,
                  opacity: paa ? 1 : 0,
                  transition: ov || paa || hardt ? 'none' : `opacity 1100ms ${EASE}`,
                  animation: paa ? anim : 'none',
                  willChange: paa ? 'transform' : 'auto',
                }}
                data-testid={`v4-kino-bilde-${b.id}`}
                data-paa={paa ? '1' : '0'}
              />
            );
          })}
          {/* Lag som hører til fotoet (under scrimmen): f.eks. et bilde som avdekkes */}
          {lag && <div className="absolute inset-0 z-[2]">{lag}</div>}
        </div>
        {/* Scrim — begge temaer montert, krysstoner */}
        <div aria-hidden="true" className="absolute inset-0 z-[3]" style={{ background: SCRIM.mork, opacity: ink ? 0 : 1, transition: ov ? 'none' : `opacity 900ms ${EASE}` }} />
        <div aria-hidden="true" className="absolute inset-0 z-[3]" style={{ background: SCRIM.lys, opacity: ink ? 1 : 0, transition: ov ? 'none' : `opacity 900ms ${EASE}` }} />
        <div aria-hidden="true" className="absolute inset-0 z-[3]" style={{ background: kompakt ? SONE_TOPP[tema] : SONE[tema], opacity: sone ? 1 : 0, transition: ov ? 'none' : `opacity 700ms ${EASE}` }} data-testid="v4-kino-sone-scrim" data-paa={sone ? '1' : '0'} />
        {/* Filmkorn — statisk, svakt. Gir fotoene én felles tekstur. */}
        {korn && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]" style={{ backgroundImage: 'url(/v4/korn.png)', backgroundSize: '144px 144px', opacity: ink ? 0.045 : 0.065 }} />}
        <div ref={innRef} className="absolute inset-0 z-[4]" style={{ opacity: morkt ? 0 : 1, transition: ov ? 'none' : `opacity 450ms ${EASE}`, willChange: 'transform' }}>{children}</div>
      </div>
    </Ctx.Provider>
  );
}

/* ── Blits — lukkeren: ett hvitt blaff over hele stagen. Nøkkel restarter. ── */
export function Blits({ nokkel, ov }) {
  if (ov || nokkel == null) return null;
  return <div key={nokkel} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5]" style={{ background: '#FFFFFF', opacity: 0, animation: 'v4-kino-blits 460ms ease-out both' }} data-testid="v4-kino-blits" />;
}

/* ── Bytte: ut (opp og bort) → inn (nytt innhold monteres, egne animasjoner starter) ── */
export function KinoBytte({ id, ov, ut = 280, children }) {
  const [vist, setVist] = useState(id);
  const [gaar, setGaar] = useState(false);
  useEffect(() => {
    if (id === vist) return undefined;
    if (ov) { setVist(id); return undefined; }
    setGaar(true);
    const t = setTimeout(() => { setVist(id); setGaar(false); }, ut);
    return () => clearTimeout(t);
  }, [id, vist, ov, ut]);
  return (
    <div style={{ opacity: gaar ? 0 : 1, transform: gaar ? 'translateY(-12px)' : 'none', transition: ov ? 'none' : `opacity ${ut}ms ${EASE}, transform ${ut}ms ${EASE}` }}>
      {children(vist)}
    </div>
  );
}

/* ── Editorial tekst nede til venstre: kicker (tid/sted) · stor tittel (ord for ord bak maske) · én setning ── */
export function KinoTekst({ akter, id, ov, testid = 'v4-kino-tekst' }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  return (
    <div className="absolute z-[6]" style={{ left: kompakt ? 20 : MARG_X, right: kompakt ? 20 : 'auto', bottom: kompakt ? 'calc(clamp(22px, 3.6vh, 40px) + 64px)' : TEKST_BUNN, width: kompakt ? 'auto' : 'min(800px, 48vw)', pointerEvents: 'none', color: f.tekst }} data-testid={testid} data-akt={id}>
      <KinoBytte id={id} ov={ov}>
        {(vist) => {
          const a = akter.find((x) => x.id === vist) || akter[0];
          const ord = a.tittel.split(' ');
          return (
            <div>
              {a.kicker && (
                <p className={`flex items-center gap-2.5 font-medium ${kompakt ? 'text-[12px]' : 'text-[13px]'}`} style={{ color: f.svak, animation: ov ? 'none' : `v4-kino-inn 700ms ${UT} both` }} data-testid="v4-kino-kicker">
                  <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
                  <Tall>{a.kicker}</Tall>
                </p>
              )}
              <h3 className={kompakt ? 'mt-2.5 text-[clamp(30px,8.6vw,42px)]' : 'mt-4 text-[clamp(40px,4.9vw,92px)]'} style={{ ...display, lineHeight: 0.96, color: f.tekst, letterSpacing: '-0.03em', textWrap: 'balance' }} data-testid="v4-kino-tittel">
                {ord.map((w, i) => (
                  <span key={`${vist}-${i}`} className="inline-block overflow-hidden align-bottom" style={{ paddingBottom: '0.12em', marginBottom: '-0.12em', marginRight: i < ord.length - 1 ? '0.22em' : 0 }}>
                    <span className="inline-block" style={{ animation: ov ? 'none' : `v4-kino-ord 900ms ${UT} ${i * 50}ms both` }}>{w}</span>
                  </span>
                ))}
              </h3>
              {a.tekst && (
                <p className={`${kompakt ? 'mt-3 text-[15px]' : 'mt-5 text-[clamp(16px,1.05vw,19px)]'} max-w-[40ch] leading-[1.45]`} style={{ color: f.brod, animation: ov ? 'none' : `v4-kino-inn 800ms ${UT} ${260 + ord.length * 40}ms both` }}>{a.tekst}</p>
              )}
              {a.liste && (
                <ul className={kompakt ? 'mt-3 space-y-1.5' : 'mt-5 space-y-2.5'} data-testid="v4-kino-liste">
                  {a.liste.map((t, i) => (
                    <li key={t} className={`flex items-center gap-3 ${kompakt ? 'text-[14.5px]' : 'text-[16.5px]'}`} style={{ color: f.brod, animation: ov ? 'none' : `v4-kino-inn 700ms ${UT} ${520 + i * 620}ms both` }}>
                      <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: T.lilla, color: INK }}><Hake size={10} /></span>
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }}
      </KinoBytte>
    </div>
  );
}

/* ── Topp — stempelet øverst til venstre (kamerateller, husleieteller) ── */
export function Topp({ vis = true, ov, children, className = '', style, testid }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  return (
    <div className={`absolute z-[6] ${className}`} style={{ left: kompakt ? 20 : MARG_X, top: kompakt ? 92 : TOPP_Y, color: f.tekst, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(-6px)', transition: ov ? 'none' : `opacity ${vis ? 600 : 350}ms ${EASE}, transform 700ms ${UT}`, pointerEvents: 'none', ...style }} aria-hidden={!vis} data-testid={testid}>
      {children}
    </div>
  );
}

/* ── Produktsonen — høyre, midtstilt (desktop) · øverst (mobil). anker = punkt i fotoet sonen skal stå til venstre for. ── */
export function Sone({ children, bredde = 560, anker = null, className = '', style, testid }) {
  const { kompakt, w } = useKino();
  let pos;
  if (kompakt) pos = { left: 20, right: 20, top: TOPP_K };
  else if (anker && w) {
    const hoyre = Math.max(24, Math.min(w - anker.x + 56, w - 24 - bredde));
    pos = { right: hoyre, top: anker.y, transform: 'translateY(-50%)', width: `min(${bredde}px, 36vw)` };
  } else pos = { right: MARG_X, top: '46%', transform: 'translateY(-50%)', width: `min(${bredde}px, 36vw)` };
  return (
    <div className={`absolute z-[6] ${className}`} style={{ ...pos, ...style }} data-testid={testid}>
      {children}
    </div>
  );
}

/* ── Element som glir inn ── */
export function Flyt({ vis, delay = 0, y = 12, x = 0, ov, children, className = '', style, testid }) {
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translate(${x}px, ${y}px)`, transition: ov ? 'none' : `opacity 600ms ${UT} ${vis ? delay : 0}ms, transform 800ms ${UT} ${vis ? delay : 0}ms`, pointerEvents: vis ? 'auto' : 'none', ...style }} aria-hidden={!vis} data-testid={testid}>
      {children}
    </div>
  );
}

/* ── Fold — innhold som kan klappes sammen (grid-template-rows, ingen layout-hopp) ── */
export function Fold({ open = true, ov, children, className = '' }) {
  return (
    <div className={`grid ${className}`} style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: ov ? 'none' : `grid-template-rows 600ms ${EASE}` }} aria-hidden={!open}>
      <div className="min-h-0 overflow-hidden" style={{ opacity: open ? 1 : 0, transition: ov ? 'none' : `opacity 400ms ${EASE}` }}>{children}</div>
    </div>
  );
}

/* ── Rad med hårlinje (lister rett på fotoet) ── */
export function Rad({ vis, delay = 0, ov, venstre, hoyre, sist = false, dempet = false, testid }) {
  const { tema, kompakt } = useKino();
  const f = farger(tema);
  return (
    <div className={`flex items-center justify-between gap-4 ${kompakt ? 'py-2.5' : 'py-3.5'}`} style={{ borderBottom: sist ? '1px solid transparent' : `1px solid ${f.hair}`, opacity: vis ? (dempet ? 0.42 : 1) : 0, transform: vis ? 'none' : 'translate(-10px, 6px)', transition: ov ? 'none' : `opacity 600ms ${UT} ${vis ? delay : 0}ms, transform 800ms ${UT} ${vis ? delay : 0}ms` }} aria-hidden={!vis} data-testid={testid}>
      <div className="flex min-w-0 items-center gap-3">{venstre}</div>
      {hoyre != null && <div className="shrink-0 text-right">{hoyre}</div>}
    </div>
  );
}

/* ── Merke — liten status på fotoet ── */
export function Merke({ tekst, tone = 'noytral', testid }) {
  const { tema } = useKino();
  const f = farger(tema);
  const stil = tone === 'lilla'
    ? { background: T.lilla, color: INK }
    : tone === 'gronn'
      ? { background: f.gronnBg, color: f.gronn }
      : { background: f.ink ? 'rgba(21,19,15,0.07)' : 'rgba(244,241,234,0.13)', color: f.ink ? 'rgba(21,19,15,0.74)' : 'rgba(244,241,234,0.88)' };
  return (
    <span key={tekst} className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium animate-in fade-in-0 duration-300" style={stil} data-testid={testid}>
      {tone === 'gronn' ? <Hake size={11} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone === 'lilla' ? INK : 'currentColor', opacity: tone === 'lilla' ? 0.7 : 0.6 }} />}
      {tekst}
    </span>
  );
}

/* ── Dokumentasjon: BankID · Inntekt · Referanse ── */
export function KinoDok({ liste }) {
  const { tema } = useKino();
  const f = farger(tema);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {liste.map((d) => (
        <span key={d} className="inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11px] font-medium animate-in fade-in-0 duration-300" style={{ background: f.gronnBg, color: f.gronn }}><Hake size={9} />{d}</span>
      ))}
    </span>
  );
}

/* ── Etikett festet til et punkt i fotoet: punkt · tynn leder · pille ── */
export function Etikett({ vis, x, y, children, tone = 'lilla', plass = 'over', delay = 0, ov, punkt = true, puls = false, testid }) {
  const { tema } = useKino();
  const f = farger(tema);
  const dot = tone === 'gronn' ? T.gronn : tone === 'lilla' || tone === 'emma' ? T.lilla : f.ink ? 'rgba(21,19,15,0.55)' : 'rgba(244,241,234,0.85)';
  const t = vis ? delay : 0;
  const dy = vis ? 0 : 6;
  const L = 26; // lederens lengde
  const pos = plass === 'hoyre'
    ? { left: 18, top: 0, transform: `translate(0, calc(-50% + ${dy}px))` }
    : plass === 'venstre'
      ? { right: 18, top: 0, transform: `translate(0, calc(-50% + ${dy}px))` }
      : plass === 'under'
        ? { left: 0, top: L + 8, transform: `translate(-50%, ${dy}px)` }
        : { left: 0, bottom: L + 8, transform: `translate(-50%, ${dy}px)` };
  const vertikal = plass === 'over' || plass === 'under';
  return (
    <div className="pointer-events-none absolute z-[5]" style={{ left: x, top: y, opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 500 : 350}ms ${EASE} ${t}ms` }} aria-hidden={!vis} data-testid={testid}>
      {punkt && (
        <>
          <span className="absolute block rounded-full" style={{ left: -4.5, top: -4.5, width: 9, height: 9, background: dot, boxShadow: `0 0 0 3px ${f.halo}` }} />
          {vis && !ov && <span className="absolute block rounded-full" style={{ left: -4.5, top: -4.5, width: 9, height: 9, boxShadow: `inset 0 0 0 1.5px ${dot}`, animation: puls ? `v4-kino-puls 2200ms ${EASE} ${t + 150}ms infinite` : `v4-kino-ping 1100ms ${EASE} ${t + 150}ms both` }} />}
          {vertikal && (
            <span aria-hidden="true" className="absolute block w-px" style={{ left: -0.5, ...(plass === 'over' ? { bottom: 6 } : { top: 6 }), height: L, background: f.tekst, opacity: 0.55, transformOrigin: plass === 'over' ? 'bottom' : 'top', transform: vis ? 'scaleY(1)' : 'scaleY(0)', transition: ov ? 'none' : `transform 500ms ${UT} ${t}ms` }} />
          )}
        </>
      )}
      <span className="absolute inline-flex h-[30px] items-center gap-2 whitespace-nowrap rounded-full pl-2.5 pr-3 text-[13px] font-medium" style={{ ...pos, background: f.pille, color: f.tekst, boxShadow: f.pilleSkygge, transition: ov ? 'none' : `transform 650ms ${UT} ${t}ms` }}>
        {tone === 'emma' ? <Portrett src="/v4/annonse/leietaker-emma.webp" alt="" size={18} /> : tone === 'gronn' ? <span style={{ color: f.gronn }}><Hake size={12} /></span> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
        {children}
      </span>
    </div>
  );
}

/* ── Lys i et vindu — varm kjerne og myk glorie. Kun opacity/transform beveger seg. ── */
export function VinduLys({ p, g, paa, ov, testid }) {
  if (!p || !g) return null;
  const kw = Math.round(g.dw * 0.026); const kh = Math.round(g.dh * 0.085);
  const gw = Math.round(g.dw * 0.11); const gh = Math.round(g.dh * 0.26);
  const t = ov ? 'none' : `opacity 1000ms ${EASE}, transform 1500ms ${EASE}`;
  return (
    <>
      <div aria-hidden="true" className="absolute" style={{ left: p.x - gw / 2, top: p.y - gh / 2, width: gw, height: gh, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,186,105,0.52), rgba(255,186,105,0.16) 55%, rgba(255,186,105,0) 100%)', mixBlendMode: 'screen', opacity: paa ? 1 : 0, transform: paa ? 'scale(1)' : 'scale(0.6)', transition: t }} />
      <div aria-hidden="true" className="absolute" style={{ left: p.x - kw / 2, top: p.y - kh / 2, width: kw, height: kh, borderRadius: 6, background: 'rgba(255,214,160,0.46)', boxShadow: '0 0 26px 10px rgba(255,196,120,0.32)', filter: 'blur(5px)', mixBlendMode: 'screen', opacity: paa ? 1 : 0, transform: paa ? 'scale(1)' : 'scale(0.8)', transition: t }} data-testid={testid} data-paa={paa ? '1' : '0'} />
    </>
  );
}

/* ── Wipe — et annet foto avdekkes med én skillelinje over hele skjermen (ligger som `lag` under scrimmen) ── */
export function Wipe({ b, paa, ferdig, ov, dur = 2400, delay = 400, testid = 'v4-kino-wipe' }) {
  const { w, kompakt } = useKino();
  if (!w) return null;
  return (
    <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: paa ? '100%' : '0%', transition: ov ? 'none' : `width ${dur}ms ${MORF} ${delay}ms` }} data-testid={testid} data-paa={paa ? '1' : '0'}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.src} srcSet={b.srcSet} sizes="100vw" alt="" className="absolute inset-y-0 left-0 h-full object-cover" style={{ width: w, objectPosition: kompakt ? b.posLiten : b.pos }} draggable={false} />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 0 18px 2px rgba(255,255,255,0.4)', opacity: ferdig ? 0 : 1, transition: ov ? 'none' : `opacity 500ms ${EASE} ${ferdig ? 200 : 0}ms` }} />
    </div>
  );
}

/* ── Teller — tall som teller (rAF, ease-out). Teller videre fra der det står når `til` endres. ── */
export function Teller({ til, aktiv, dur = 1100, fra = 0, format = tall, ov, className, style, testid }) {
  const [v, setV] = useState(aktiv ? (ov ? til : fra) : fra);
  const naa = useRef(aktiv ? (ov ? til : fra) : fra);
  useEffect(() => {
    if (!aktiv) { naa.current = fra; setV(fra); return undefined; }
    if (ov) { naa.current = til; setV(til); return undefined; }
    const start = naa.current; const maal = til;
    if (start === maal) return undefined;
    let raf; const t0 = performance.now();
    const tikk = (t) => {
      const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3);
      const x = Math.round(start + (maal - start) * e);
      naa.current = x; setV(x);
      if (p < 1) raf = requestAnimationFrame(tikk);
    };
    raf = requestAnimationFrame(tikk);
    return () => cancelAnimationFrame(raf);
  }, [aktiv, til, fra, dur, ov]);
  return <Tall className={className} style={style} testid={testid}>{format(v)}</Tall>;
}

/* ── Tall — tabulære sifre uten brede mellomrom ── */
export function Tall({ children, className = '', style, testid }) {
  const deler = String(children).split(/[\s\u00a0\u202f\u2009]+/);
  return (
    <span className={className} style={style} data-testid={testid}>
      {deler.map((d, i) => <React.Fragment key={i}>{i > 0 ? ' ' : ''}<span style={{ fontVariantNumeric: 'tabular-nums' }}>{d}</span></React.Fragment>)}
    </span>
  );
}

/* ── Tid — klokke som teller fra ett tidspunkt til et annet (minutter), f.eks. 22:58 → 09:40 neste dag ── */
export function Tid({ fra, til, aktiv, dur = 1600, ov, className, style, testid }) {
  const [m, setM] = useState(fra);
  useEffect(() => {
    if (!aktiv) { setM(fra); return undefined; }
    if (ov) { setM(til); return undefined; }
    let raf; const t0 = performance.now();
    const tikk = (t) => {
      const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3);
      setM(Math.round(fra + (til - fra) * e));
      if (p < 1) raf = requestAnimationFrame(tikk);
    };
    raf = requestAnimationFrame(tikk);
    return () => cancelAnimationFrame(raf);
  }, [aktiv, fra, til, dur, ov]);
  const mm = ((m % 1440) + 1440) % 1440;
  const tt = `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
  return <Tall className={className} style={style} testid={testid}>{tt}</Tall>;
}

/* ── Skriver — tekst som skrives inn tegn for tegn ── */
export function Skriver({ tekst, aktiv, ms = 26, delay = 0, ov, markor = true, testid }) {
  const [n, setN] = useState(ov || !aktiv ? (aktiv ? tekst.length : 0) : 0);
  useEffect(() => {
    if (!aktiv) { setN(0); return undefined; }
    if (ov) { setN(tekst.length); return undefined; }
    let i = 0; let iv;
    const t = setTimeout(() => { iv = setInterval(() => { i += 1; setN(i); if (i >= tekst.length) clearInterval(iv); }, ms); }, delay);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [aktiv, tekst, ms, delay, ov]);
  const ferdig = n >= tekst.length;
  return (
    <span data-testid={testid} data-ferdig={ferdig ? '1' : '0'}>
      {tekst.slice(0, n)}
      {markor && aktiv && !ferdig && <span aria-hidden="true" className="ml-px inline-block h-[0.9em] w-[2px] translate-y-[0.12em] rounded-sm" style={{ background: T.lilla, animation: 'v4-kino-blink 900ms steps(1) infinite' }} />}
    </span>
  );
}

/* ── Ring — sirkel som fylles (BankID-signering), så hake ── */
export function Ring({ aktiv, ferdig, dur = 900, size = 24, ov }) {
  const { tema } = useKino();
  const f = farger(tema);
  const r = (size - 3) / 2; const omk = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} data-testid="v4-kino-ring" data-ferdig={ferdig ? '1' : '0'}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={f.hair} strokeWidth="1.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ferdig ? f.gronn : T.lilla} strokeWidth="1.5" strokeLinecap="round" strokeDasharray={omk} strokeDashoffset={ferdig || aktiv ? 0 : omk} style={{ transition: ov ? 'none' : `stroke-dashoffset ${dur}ms ${UT}, stroke 300ms ${EASE}` }} />
      </svg>
      <span style={{ color: f.gronn, opacity: ferdig ? 1 : 0, transform: ferdig ? 'scale(1)' : 'scale(0.6)', transition: ov ? 'none' : `opacity 300ms ${EASE}, transform 400ms ${UT}` }}><Hake size={Math.round(size * 0.5)} /></span>
    </span>
  );
}

/* ── Prikker — «skriver …» ── */
export function Prikker({ vis }) {
  const { tema } = useKino();
  const f = farger(tema);
  return (
    <span className="inline-flex items-center gap-1" aria-hidden={!vis} style={{ opacity: vis ? 1 : 0, transition: `opacity 200ms ${EASE}` }}>
      {[0, 1, 2].map((i) => <span key={i} className="block h-1.5 w-1.5 rounded-full" style={{ background: f.brod, animation: vis ? `v4-kino-prikk 1100ms ${EASE} ${i * 160}ms infinite` : 'none' }} />)}
    </span>
  );
}

/* ── Knapp som trykker seg selv — på fotoet ── */
export function KinoKnapp({ presser, trykket, children, etter, testid, stor = false }) {
  const bg = trykket ? 'rgba(212,150,255,0.55)' : presser ? T.lillaHover : T.lilla;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium ${stor ? 'h-12 rounded-[12px] px-6 text-[15px]' : 'h-10 rounded-[10px] px-4 text-[14px]'}`}
      style={{ background: bg, color: INK, transform: presser ? 'scale(0.95)' : 'none', transition: `transform 220ms ${EASE}, background-color 220ms ${EASE}`, boxShadow: trykket ? 'none' : '0 18px 40px -22px rgba(160,90,220,0.8)' }}
      data-testid={testid}
      data-trykket={trykket ? '1' : '0'}
    >
      {presser && <span aria-hidden="true" className="absolute inset-0 rounded-[inherit]" style={{ boxShadow: `inset 0 0 0 1.5px ${INK}`, animation: 'v4-ring 560ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards' }} />}
      {trykket ? <><Hake />{etter}</> : children}
    </span>
  );
}

/* ── SMS slik den ser ut hos mottakeren — på fotoet ── */
export function KinoSms({ vis, til, tid, tekst, ov, delay = 0, logo = null, testid, className = 'mt-3' }) {
  const { tema } = useKino();
  const f = farger(tema);
  return (
    <Flyt vis={vis} ov={ov} delay={delay} className={className} testid={testid}>
      <div className="rounded-[16px] px-4 py-3" style={{ background: f.flate, boxShadow: `inset 0 0 0 1px ${f.hair}` }}>
        <div className="flex items-center justify-between text-[11.5px]" style={{ color: f.svak }}>
          <span className="inline-flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2.5h8a1 1 0 011 1v4a1 1 0 01-1 1H5L2.5 10.5V8.5H2a1 1 0 01-1-1v-4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            SMS til {til}
          </span>
          <span>{tid}</span>
        </div>
        <p className="mt-1.5 text-[13.5px] leading-[1.45]" style={{ color: f.brod }}>{tekst}</p>
        {logo && (
          <div className="mt-2.5 inline-flex h-8 items-center gap-2 rounded-[8px] bg-white px-2.5 text-[12px] font-medium" style={{ color: INK, boxShadow: '0 6px 18px -10px rgba(0,0,0,0.4)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.src} alt={logo.alt} style={{ height: logo.h || 14, width: 'auto' }} draggable={false} />
            {logo.tekst}
          </div>
        )}
      </div>
    </Flyt>
  );
}

/* ── Miniatyr av et rom (protokoll) ── */
export function Mini({ src, w = 48, ratio = '3 / 2', rund = 8 }) {
  return (
    <span className="block shrink-0 overflow-hidden" style={{ width: w, aspectRatio: ratio, borderRadius: rund, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
    </span>
  );
}

/* ── Broen til neste kapittel — nede til høyre (desktop). Brukes av de eldre kino-kapitlene. ── */
export function KinoNeste({ vis, navn, dur, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  if (!navn || kompakt) return null;
  return (
    <div className="absolute z-[6] text-right" style={{ right: MARG_X, bottom: TEKST_BUNN, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 600ms ${EASE} ${vis ? 600 : 0}ms, transform 600ms ${EASE} ${vis ? 600 : 0}ms`, pointerEvents: 'none' }} data-testid="v4-kino-neste" aria-hidden={!vis}>
      <p className="text-[12px]" style={{ color: f.svak }}>Neste kapittel</p>
      <p className="mt-1 inline-flex items-center gap-2 text-[17px] font-medium" style={{ color: f.tekst }}>
        {navn}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </p>
      <span className="relative ml-auto mt-3 block h-[2px] w-[132px] overflow-hidden rounded-full" style={{ background: f.hair }}>
        <Fyll aktiv={vis && !ov} gjort={false} dur={dur} morkt={!f.ink} />
      </span>
    </div>
  );
}

/* ── Hode — liten overskrift i sonen ── */
export function Hode({ vis, ov, children, delay = 0, className = '' }) {
  const { tema } = useKino();
  const f = farger(tema);
  return <Flyt vis={vis} ov={ov} delay={delay} className={className}><p className="text-[13px] font-medium" style={{ color: f.svak }}>{children}</p></Flyt>;
}

/* ── Nøkkeltall — tre stille kolonner ── */
export function Nokkeltall({ vis, ov, delay = 700, rader, className = '' }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  return (
    <Flyt vis={vis} ov={ov} delay={delay} className={`${className} grid grid-cols-3 gap-4 border-t pt-4`} style={{ borderColor: f.hair }}>
      {rader.map(([k, v]) => (
        <div key={k}><p className="text-[11.5px]" style={{ color: f.svak }}>{k}</p><p className={`mt-0.5 font-medium tracking-[-0.005em] ${kompakt ? 'text-[14.5px]' : 'text-[16px]'}`} style={{ color: f.tekst }}><Tall>{v}</Tall></p></div>
      ))}
    </Flyt>
  );
}
