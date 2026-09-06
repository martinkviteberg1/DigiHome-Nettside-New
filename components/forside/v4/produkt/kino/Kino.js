'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display } from '../../motion';
import { Hake, Portrett, Tekstbytte, Fyll } from '../filmdeler';

/* ---------------------------------------------------------------------------
   Kino — full bleed-motoren for produktfilmene.

   Fotoet ER scenen. Hver scene kan ha sitt eget fullskjermsfoto; alt som
   fortelles (tekst, etiketter, lister, knapper) ligger rett på fotoet med en
   rolig scrim for lesbarhet. Ingen kort, ingen papirflate, ingen ramme.

   · KinoStage   — stagen: bakgrunnsbilder (dissolve + svak driv), scrim, barn.
   · KinoTekst   — editorial tekst nede til venstre: «01 · Annonsen», tittel
                   ord for ord, én setning (eller en liste som kommer én og én).
   · Etikett     — pille festet til et punkt i fotoet (kamera-følelse).
   · Fokus       — fire hjørner rundt et område i fotoet.
   · Sone        — produktsonen: høyre halvdel på desktop, øverst på mobil.
   · Rad/Flyt    — rader med hårlinje og elementer som glir inn. Kun opacity/transform.
   · dekk()      — cover-geometri: bildeandel → px på stagen (etiketter følger fotoet).
--------------------------------------------------------------------------- */

export const OFF = '#F4F1EA';
export const INK = '#15130F';
export const BUNN = '#0E0D0B';
export const MORF = 'cubic-bezier(0.65, 0, 0.18, 1)';

/* Et scene-foto. iw/ih = pikselmål (for å feste etiketter), pos = object-position (desktop), posLiten = på mobil. */
export const bilde = (id, src, liten, iw, ih, pos = '50% 50%', posLiten) => ({ id, src, liten, iw, ih, pos, posLiten: posLiten || pos });

const Ctx = createContext({ w: 0, h: 0, kompakt: false, tema: 'mork', ov: false });
export const useKino = () => useContext(Ctx);

/* Farger for alt som ligger på fotoet — to temaer: mørk scrim/offwhite tekst (standard) og lys scrim/blekk. */
export function farger(tema) {
  const ink = tema === 'lys';
  return {
    ink,
    tekst: ink ? INK : OFF,
    svak: ink ? 'rgba(21,19,15,0.52)' : 'rgba(244,241,234,0.56)',
    brod: ink ? 'rgba(21,19,15,0.78)' : 'rgba(244,241,234,0.84)',
    dempet: ink ? 'rgba(21,19,15,0.40)' : 'rgba(244,241,234,0.42)',
    hair: ink ? 'rgba(21,19,15,0.12)' : 'rgba(244,241,234,0.16)',
    pille: ink ? 'rgba(251,250,248,0.94)' : 'rgba(12,11,10,0.64)',
    pilleSkygge: ink ? '0 10px 30px -12px rgba(0,0,0,0.30)' : 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 10px 30px -12px rgba(0,0,0,0.55)',
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

/* Marger — samme på tekst, sone og neste-bro */
export const MARG_X = 'clamp(24px, 5vw, 88px)';
export const MARG_Y = 'clamp(28px, 6vh, 72px)';
export const margPx = (w, h) => ({ x: Math.min(88, Math.max(24, w * 0.05)), y: Math.min(72, Math.max(28, h * 0.06)) });

export const SCRIM = {
  mork: 'linear-gradient(180deg, rgba(10,9,8,0.36) 0%, rgba(10,9,8,0.08) 18%, rgba(10,9,8,0) 42%, rgba(10,9,8,0.40) 66%, rgba(10,9,8,0.86) 100%), radial-gradient(ellipse 58% 64% at 14% 96%, rgba(10,9,8,0.80) 0%, rgba(10,9,8,0.48) 42%, rgba(10,9,8,0) 100%), linear-gradient(90deg, rgba(10,9,8,0.30) 0%, rgba(10,9,8,0.10) 30%, rgba(10,9,8,0) 55%)',
  lys: 'linear-gradient(180deg, rgba(251,250,248,0.10) 0%, rgba(251,250,248,0) 16%, rgba(251,250,248,0) 48%, rgba(251,250,248,0.22) 68%, rgba(251,250,248,0.74) 100%), radial-gradient(ellipse 54% 60% at 14% 96%, rgba(251,250,248,0.74) 0%, rgba(251,250,248,0.34) 42%, rgba(251,250,248,0) 100%), linear-gradient(90deg, rgba(251,250,248,0.12) 0%, rgba(251,250,248,0.02) 30%, rgba(251,250,248,0) 55%)',
};
/* Ekstra scrim bak produktsonen (høyre på desktop, øverst på mobil) */
const SONE = {
  mork: 'linear-gradient(270deg, rgba(10,9,8,0.66) 0%, rgba(10,9,8,0.42) 30%, rgba(10,9,8,0) 60%)',
  lys: 'linear-gradient(270deg, rgba(251,250,248,0.56) 0%, rgba(251,250,248,0.30) 30%, rgba(251,250,248,0) 60%)',
};
const SONE_TOPP = {
  mork: 'linear-gradient(180deg, rgba(10,9,8,0.70) 0%, rgba(10,9,8,0.52) 42%, rgba(10,9,8,0) 72%)',
  lys: 'linear-gradient(180deg, rgba(251,250,248,0.80) 0%, rgba(251,250,248,0.55) 42%, rgba(251,250,248,0) 72%)',
};

export function KinoStil() {
  return (
    <style>{`
@keyframes v4-kino-driv { from { transform: scale(1) } to { transform: scale(1.045) } }
@keyframes v4-kino-ord { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes v4-kino-inn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
@keyframes v4-kino-blits { 0% { opacity: 0 } 10% { opacity: 0.6 } 100% { opacity: 0 } }
@keyframes v4-kino-utloser { 0% { transform: scale(1) } 40% { transform: scale(0.78) } 100% { transform: scale(1) } }
@keyframes v4-kino-fokus { 0% { opacity: 0; transform: scale(1.16) } 28% { opacity: 1; transform: scale(1) } 74% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(1) } }
@keyframes v4-kino-ping { from { transform: scale(0.6); opacity: 0.5 } to { transform: scale(2.6); opacity: 0 } }
@keyframes v4-ring { from { transform: scale(0.45); opacity: 0.6 } to { transform: scale(1.7); opacity: 0 } }
`}</style>
  );
}

/* ── Stagen ── */
export function KinoStage({ bilder, aktiv, tema = 'mork', sone = false, driv = true, ov = false, synlig = true, morkt = false, fase, testid = 'v4-kino', lag = null, children }) {
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

  /* Dissolve: det nye bildet monteres på nytt UNDER det gamle (nøkkel = aktiveringsteller), det gamle tones ut over det.
     Slik starter også driv-animasjonen fra null hver gang et bilde blir aktivt. */
  const sist = useRef(null);
  const forrige = useRef(null);
  const teller = useRef({});
  if (sist.current !== aktiv) {
    forrige.current = sist.current;
    sist.current = aktiv;
    teller.current[aktiv] = (teller.current[aktiv] || 0) + 1;
  }

  return (
    <Ctx.Provider value={ctx}>
      <div ref={ref} className="absolute inset-0 overflow-hidden" style={{ background: BUNN, color: ink ? INK : OFF, opacity: synlig ? 1 : 0, transition: ov ? 'none' : `opacity 900ms ${EASE}` }} data-testid={testid} data-fase={fase} data-bilde={aktiv} data-tema={tema}>
        <KinoStil />
        {bilder.map((b) => {
          const paa = b.id === aktiv; const var_ = b.id === forrige.current;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${b.id}-${teller.current[b.id] || 0}`}
              src={b.src}
              srcSet={b.liten ? `${b.liten} 1200w, ${b.src} ${b.iw}w` : undefined}
              sizes="100vw"
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover"
              style={{ objectPosition: kompakt ? b.posLiten : b.pos, zIndex: var_ ? 2 : paa ? 1 : 0, opacity: paa ? 1 : 0, transition: ov || paa ? 'none' : `opacity 1100ms ${EASE}`, animation: paa && driv && !ov ? 'v4-kino-driv 18s linear both' : 'none', willChange: paa || var_ ? 'transform, opacity' : 'auto' }}
              data-testid={`v4-kino-bilde-${b.id}`}
              data-paa={paa ? '1' : '0'}
            />
          );
        })}
        {/* Lag som hører til fotoet (under scrimmen): f.eks. et bilde som avdekkes */}
        {lag && <div className="absolute inset-0 z-[2]">{lag}</div>}
        {/* Scrim — begge temaer montert, krysstoner */}
        <div aria-hidden="true" className="absolute inset-0 z-[3]" style={{ background: SCRIM.mork, opacity: ink ? 0 : 1, transition: ov ? 'none' : `opacity 900ms ${EASE}` }} />
        <div aria-hidden="true" className="absolute inset-0 z-[3]" style={{ background: SCRIM.lys, opacity: ink ? 1 : 0, transition: ov ? 'none' : `opacity 900ms ${EASE}` }} />
        <div aria-hidden="true" className="absolute inset-0 z-[3]" style={{ background: kompakt ? SONE_TOPP[tema] : SONE[tema], opacity: sone ? 1 : 0, transition: ov ? 'none' : `opacity 700ms ${EASE}` }} data-testid="v4-kino-sone-scrim" data-paa={sone ? '1' : '0'} />
        <div className="absolute inset-0 z-[4]" style={{ opacity: morkt ? 0 : 1, transition: ov ? 'none' : `opacity 450ms ${EASE}` }}>{children}</div>
      </div>
    </Ctx.Provider>
  );
}

/* ── Editorial tekst nede til venstre ── */
export function KinoTekst({ nr, kapittel, akter, id, ov, testid = 'v4-kino-tekst' }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  return (
    <div className="absolute z-[6]" style={{ left: kompakt ? 20 : MARG_X, right: kompakt ? 20 : 'auto', bottom: kompakt ? 22 : MARG_Y, width: kompakt ? 'auto' : 'min(560px, 40vw)', pointerEvents: 'none', color: f.tekst }} data-testid={testid} data-akt={id}>
      <p className="text-[12.5px] font-medium tabular-nums" style={{ color: f.svak }}>{nr} · {kapittel}</p>
      <Tekstbytte id={id} ov={ov}>
        {(vist) => {
          const a = akter.find((x) => x.id === vist) || akter[0];
          const ord = a.tittel.split(' ');
          return (
            <div>
              <h3 className={kompakt ? 'mt-2.5 text-[clamp(30px,8vw,42px)]' : 'mt-3 text-[clamp(36px,3.5vw,60px)]'} style={{ ...display, lineHeight: 1.0, color: f.tekst }} data-testid="v4-kino-tittel">
                {ord.map((w, i) => (
                  <span key={`${vist}-${i}`} className="inline-block" style={{ animation: ov ? 'none' : `v4-kino-ord 800ms ${EASE} ${i * 70}ms both`, marginRight: i < ord.length - 1 ? '0.24em' : 0 }}>{w}</span>
                ))}
              </h3>
              {a.tekst && (
                <p className={`${kompakt ? 'mt-3 text-[15px]' : 'mt-4 text-[16.5px]'} max-w-[44ch] leading-[1.45]`} style={{ color: f.brod, animation: ov ? 'none' : `v4-kino-inn 700ms ${EASE} 380ms both` }}>{a.tekst}</p>
              )}
              {a.liste && (
                <ul className={kompakt ? 'mt-3 space-y-1.5' : 'mt-4 space-y-2'} data-testid="v4-kino-liste">
                  {a.liste.map((t, i) => (
                    <li key={t} className={`flex items-center gap-2.5 ${kompakt ? 'text-[14.5px]' : 'text-[15.5px]'}`} style={{ color: f.brod, animation: ov ? 'none' : `v4-kino-inn 600ms ${EASE} ${500 + i * 560}ms both` }}>
                      <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: T.lilla, color: INK }}><Hake size={10} /></span>
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }}
      </Tekstbytte>
    </div>
  );
}

/* ── Produktsonen ── */
export function Sone({ children, bredde = 440, anker = null, className = '', style, testid }) {
  const { kompakt, w } = useKino();
  let pos;
  if (kompakt) pos = { left: 20, right: 20, top: 148 };
  else if (anker && w) {
    /* Forankret: sonen står til venstre for et punkt i fotoet (f.eks. vinduet), midtstilt på det */
    const hoyre = Math.max(24, Math.min(w - anker.x + 44, w - 24 - bredde));
    pos = { right: hoyre, top: anker.y, transform: 'translateY(-50%)', width: `min(${bredde}px, 36vw)` };
  } else pos = { right: MARG_X, top: '50%', transform: 'translateY(-50%)', width: `min(${bredde}px, 36vw)` };
  return (
    <div className={`absolute z-[6] ${className}`} style={{ ...pos, ...style }} data-testid={testid}>
      {children}
    </div>
  );
}

/* ── Element som glir inn ── */
export function Flyt({ vis, delay = 0, y = 12, ov, children, className = '', style, testid }) {
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: ov ? 'none' : `opacity 550ms ${EASE} ${vis ? delay : 0}ms, transform 650ms ${EASE} ${vis ? delay : 0}ms`, pointerEvents: vis ? 'auto' : 'none', ...style }} aria-hidden={!vis} data-testid={testid}>
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
export function Rad({ vis, delay = 0, ov, venstre, hoyre, sist = false, testid }) {
  const { tema, kompakt } = useKino();
  const f = farger(tema);
  return (
    <div className={`flex items-center justify-between gap-4 ${kompakt ? 'py-2.5' : 'py-3'}`} style={{ borderBottom: sist ? '1px solid transparent' : `1px solid ${f.hair}`, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? delay : 0}ms, transform 600ms ${EASE} ${vis ? delay : 0}ms` }} aria-hidden={!vis} data-testid={testid}>
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
      : { background: f.ink ? 'rgba(21,19,15,0.06)' : 'rgba(244,241,234,0.12)', color: f.ink ? 'rgba(21,19,15,0.72)' : 'rgba(244,241,234,0.86)' };
  return (
    <span key={tekst} className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium animate-in fade-in-0 duration-300" style={stil} data-testid={testid}>
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
        <span key={d} className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10.5px] font-medium animate-in fade-in-0 duration-300" style={{ background: f.gronnBg, color: f.gronn }}><Hake size={9} />{d}</span>
      ))}
    </span>
  );
}

/* ── Etikett festet til et punkt i fotoet ── */
export function Etikett({ vis, x, y, children, tone = 'lilla', plass = 'over', delay = 0, ov, punkt = true, testid }) {
  const { tema } = useKino();
  const f = farger(tema);
  const dot = tone === 'gronn' ? T.gronn : tone === 'lilla' ? T.lilla : f.ink ? 'rgba(21,19,15,0.45)' : 'rgba(244,241,234,0.7)';
  const t = vis ? delay : 0;
  const dy = vis ? 0 : 6;
  const pos = plass === 'hoyre'
    ? { left: 16, top: 0, transform: `translate(0, calc(-50% + ${dy}px))` }
    : plass === 'venstre'
      ? { right: 16, top: 0, transform: `translate(0, calc(-50% + ${dy}px))` }
      : plass === 'under'
        ? { left: 0, top: 14, transform: `translate(-50%, ${dy}px)` }
        : { left: 0, bottom: 14, transform: `translate(-50%, ${dy}px)` };
  return (
    <div className="pointer-events-none absolute z-[5]" style={{ left: x, top: y, opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity ${vis ? 500 : 350}ms ${EASE} ${t}ms` }} aria-hidden={!vis} data-testid={testid}>
      {punkt && (
        <>
          <span className="absolute block rounded-full" style={{ left: -5, top: -5, width: 10, height: 10, background: dot, boxShadow: '0 0 0 3px rgba(255,255,255,0.28)' }} />
          {vis && !ov && <span className="absolute block rounded-full" style={{ left: -5, top: -5, width: 10, height: 10, boxShadow: `inset 0 0 0 1.5px ${dot}`, animation: `v4-kino-ping 1100ms ${EASE} ${t + 150}ms both` }} />}
        </>
      )}
      <span className="absolute inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium" style={{ ...pos, background: f.pille, color: f.tekst, boxShadow: f.pilleSkygge, transition: ov ? 'none' : `transform 650ms ${EASE} ${t}ms` }}>
        {tone === 'emma' ? <Portrett src="/v4/annonse/leietaker-emma.webp" alt="" size={16} /> : tone === 'gronn' ? <span style={{ color: f.gronn }}><Hake size={12} /></span> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
        {children}
      </span>
    </div>
  );
}

/* ── Fire hjørner rundt et område ── */
export function Hjorne({ style, rot = 0, farge = 'rgba(250,248,244,0.9)', size = 16 }) {
  return <span aria-hidden="true" className="absolute block" style={{ ...style, width: size, height: size, transform: `rotate(${rot}deg)`, borderTop: `1.5px solid ${farge}`, borderLeft: `1.5px solid ${farge}`, borderTopLeftRadius: 3 }} />;
}

export function Fokus({ r, vis, ov, farge, testid }) {
  const { tema } = useKino();
  const c = farge || (tema === 'lys' ? 'rgba(21,19,15,0.75)' : 'rgba(250,248,244,0.9)');
  if (!r) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute z-[4]" style={{ left: r.x, top: r.y, width: r.w, height: r.h, opacity: vis ? 1 : 0, transform: vis ? 'scale(1)' : 'scale(1.1)', transition: ov ? 'none' : `opacity 500ms ${EASE}, transform 900ms ${EASE}` }} data-testid={testid}>
      <Hjorne style={{ left: -2, top: -2 }} rot={0} farge={c} />
      <Hjorne style={{ right: -2, top: -2 }} rot={90} farge={c} />
      <Hjorne style={{ right: -2, bottom: -2 }} rot={180} farge={c} />
      <Hjorne style={{ left: -2, bottom: -2 }} rot={270} farge={c} />
    </div>
  );
}

/* Autofokus — rammen lander, holder og slipper (keyframes; nøkkel restarter) */
export function Autofokus({ r, nokkel, dur = 1200, delay = 120, ov }) {
  if (!r || ov) return null;
  return (
    <div key={nokkel} aria-hidden="true" className="pointer-events-none absolute z-[4]" style={{ left: r.x, top: r.y, width: r.w, height: r.h, animation: `v4-kino-fokus ${dur}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms both`, transformOrigin: '50% 50%', willChange: 'transform, opacity' }} data-testid="v4-kino-autofokus">
      <Hjorne style={{ left: -2, top: -2 }} rot={0} />
      <Hjorne style={{ right: -2, top: -2 }} rot={90} />
      <Hjorne style={{ right: -2, bottom: -2 }} rot={180} />
      <Hjorne style={{ left: -2, bottom: -2 }} rot={270} />
    </div>
  );
}

/* ── Broen til neste kapittel — nede til høyre (desktop) ── */
export function KinoNeste({ vis, navn, dur, ov }) {
  const { kompakt, tema } = useKino();
  const f = farger(tema);
  if (!navn || kompakt) return null;
  return (
    <div className="absolute z-[6] text-right" style={{ right: MARG_X, bottom: MARG_Y, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 600ms ${EASE} ${vis ? 600 : 0}ms, transform 600ms ${EASE} ${vis ? 600 : 0}ms`, pointerEvents: 'none' }} data-testid="v4-kino-neste" aria-hidden={!vis}>
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
export function KinoSms({ vis, til, tid, tekst, ov, delay = 0, testid, className = 'mt-3' }) {
  const { tema } = useKino();
  const f = farger(tema);
  return (
    <Flyt vis={vis} ov={ov} delay={delay} className={className} testid={testid}>
      <div className="rounded-[16px] px-3.5 py-3" style={{ background: f.ink ? 'rgba(21,19,15,0.05)' : 'rgba(244,241,234,0.10)', boxShadow: `inset 0 0 0 1px ${f.hair}` }}>
        <div className="flex items-center justify-between text-[11.5px]" style={{ color: f.svak }}>
          <span className="inline-flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2.5h8a1 1 0 011 1v4a1 1 0 01-1 1H5L2.5 10.5V8.5H2a1 1 0 01-1-1v-4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            SMS til {til}
          </span>
          <span>{tid}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.45]" style={{ color: f.brod }}>{tekst}</p>
      </div>
    </Flyt>
  );
}
