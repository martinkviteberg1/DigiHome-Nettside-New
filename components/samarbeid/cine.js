'use client';
/* ---------------------------------------------------------------------------
   Byggesteiner for seksjonene. Designet på en fast scene (1280×720) i absolutte
   px – Deck skalerer scenen som helhet, PDF tegner den 1:1, miniatyren krymper.
   Én visuell grammatikk: papir, blekk i PP Right Grotesk, og LINJEN – en hairline
   som tegnes fra venstre til høyre og lyser mot PUNKTET der noe skjer. Lilla er
   lys, ikke farge: den finnes bare i punktet og gløden rundt det.
--------------------------------------------------------------------------- */
import React, { createContext, useContext, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { DISPLAY, ease, FONT, FOOTER_H, nn, PAD_BOTTOM, PAD_TOP, PAD_X, PALETTES } from './theme';

/* Et lag i skjermens egne piksler bak scrolleren. Deck eier elementet; en seksjon kan portalere inn i det. */
export const DeckLayerContext = createContext(null);

const viewport = { once: true, amount: 0.5 };
const ToneCtx = createContext({ P: PALETTES.light, standalone: true });
export const usePalette = () => useContext(ToneCtx).P;
const useStandalone = () => useContext(ToneCtx).standalone;

export const vignette = (tone) => (tone === 'dark'
  ? 'radial-gradient(90% 60% at 50% 115%, rgba(255,255,255,0.045), rgba(255,255,255,0) 60%)'
  : 'radial-gradient(115% 85% at 50% 32%, rgba(247,245,241,1) 0%, rgba(243,241,236,1) 58%, rgba(236,233,227,1) 100%)');

/* Seksjonen: scene, innholdsramme og bunnlinje. `tone` velger palett for alt inni.
   `standalone=false` når Deck tegner scenen: da maler rot-laget bakgrunn, vignett og lys – seksjonen er gjennomsiktig. */
export const Section = ({ children, testid, index, total, animate, tone = 'light', standalone = true, footerInk, className }) => {
  const P = PALETTES[tone];
  return (
    <ToneCtx.Provider value={{ P, standalone }}>
      <section className={`deck-section antialiased ${className || ''}`} data-testid={`slide-${testid}`} data-tone={tone}
        style={{ position: 'relative', width: '100%', height: '100%', overflow: standalone ? 'hidden' : 'visible', background: standalone ? P.bg : 'transparent', color: P.ink, fontFamily: FONT, transition: 'background-color 900ms ease, color 900ms ease' }}>
        {standalone && <div aria-hidden className="deck-horizon" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: vignette(tone) }} />}
        {standalone && <div aria-hidden className="deck-dots" />}
        <div className="deck-frame" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px` }}>
          <div className="deck-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
          <Footer index={index} total={total} ink={footerInk} />
        </div>
      </section>
    </ToneCtx.Provider>
  );
};

/* Bunnen: kun telleren. Coveret (index 0) står utenfor nummereringen – innholdsseksjonene teller 01 / N. */
const Footer = ({ index, total, ink }) => {
  const P = usePalette();
  return (
    <footer className="deck-footer" data-testid="deck-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: FOOTER_H, color: ink || P.muted, fontSize: 12, letterSpacing: '-0.005em', fontVariantNumeric: 'tabular-nums', position: 'relative', zIndex: 1, pointerEvents: 'none', transition: 'color 900ms ease' }}>
      <span data-testid="deck-footer-confidential" style={{ opacity: index > 0 ? 1 : 0 }}>Konfidensielt · DigiHome Tech AS</span>
      {index > 0 && <span data-testid="deck-counter"><span style={{ color: ink || P.ink, transition: 'color 900ms ease' }}>{nn(index - 1)}</span> / {nn(total - 2)}</span>}
    </footer>
  );
};

/* Stiger 12 px og fader inn når den er i bildet. `animate=false` (PDF/miniatyr) tegner ferdig tilstand. */
export const Rise = ({ children, animate, delay = 0, style, className, testid, as: Tag = 'div' }) => {
  if (!animate) {
    const { x, ...rest } = style || {};
    return <Tag className={className} style={x !== undefined ? { ...rest, transform: `translateX(${typeof x === 'number' ? `${x}px` : x})` } : rest} data-testid={testid}>{children}</Tag>;
  }
  const M = motion[Tag] || motion.div;
  return <M className={className} style={style} data-testid={testid} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewport} transition={{ duration: 0.8, delay, ease }}>{children}</M>;
};

/* Tittel-reveal: ordene stiger opp gjennom en maske, ett etter ett. Kun for titler. Statisk (PDF): ren tekst. */
export const Reveal = ({ children, animate, delay = 0, inline = false }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const display = inline ? 'inline' : 'block';
  if (!animate) return <span className="deck-h-line" style={{ display }}>{children}</span>;
  const parts = React.Children.toArray(children);
  const words = parts.filter((p) => typeof p === 'string').join('').split(' ').filter(Boolean);
  const extra = parts.filter((p) => typeof p !== 'string');
  return (
    <span ref={ref} className="deck-h-line" style={{ display }}>
      {words.map((w, k) => (
        <React.Fragment key={k}>
          <span className="deck-word" style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.14em', marginBottom: '-0.14em' }}>
            <motion.span style={{ display: 'inline-block' }} initial={{ y: '112%', opacity: 0 }} animate={inView ? { y: 0, opacity: 1 } : { y: '112%', opacity: 0 }} transition={{ duration: 0.95, delay: delay + k * 0.055, ease }}>
              {w}{k === words.length - 1 && extra}
            </motion.span>
          </span>
          {k < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </span>
  );
};

/* Horisontal hairline som tegnes fra venstre. `color` kan være en gradient (lys mot punktet). */
export const HLine = ({ animate, delay = 0, duration = 0.9, style, color, easing = ease }) => {
  const P = usePalette();
  const base = { height: 1, width: '100%', background: color || P.hair, ...style };
  if (!animate) return <div style={base} aria-hidden />;
  return <motion.div aria-hidden style={{ ...base, transformOrigin: 'left' }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={viewport} transition={{ duration, delay, ease: easing }} />;
};

/* Punktet – den eneste lilla flaten, med et mykt lys rundt. Der noe skjer, eller der to ting møtes. */
export const Point = ({ animate, delay = 0, size = 8, style, testid = 'deck-point', glow = true, center = false }) => {
  const P = usePalette();
  const base = { display: 'inline-block', width: size, height: size, borderRadius: '50%', background: P.accent, flex: 'none', boxShadow: glow ? `0 0 0 ${size * 0.6}px rgba(${P.glow},${0.16 * P.dim}), 0 0 ${size * 3.5}px rgba(${P.glow},${0.6 * P.dim})` : undefined, ...style };
  if (!animate) return <span style={center ? { ...base, transform: 'translateX(-50%)' } : base} data-testid={testid} aria-hidden />;
  return <motion.span aria-hidden data-testid={testid} style={center ? { ...base, x: '-50%' } : base} initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={viewport} transition={{ duration: 0.5, delay, ease }} />;
};

/* Mykt lys i scenen – stort, svakt, kun én per seksjon, plassert der punktet er. */
export const glowBackground = (P, strength) => `radial-gradient(closest-side, rgba(${P.glow},${strength * P.dim}), rgba(${P.glow},${strength * P.dim * 0.35}) 38%, rgba(${P.glow},0) 72%)`;

export const Glow = ({ animate, delay = 0, x = '100%', y = '100%', size = 900, strength = 0.22, testid = 'deck-glow' }) => {
  const P = usePalette();
  const standalone = useStandalone();
  if (!standalone) return null;
  const base = { position: 'absolute', left: x, top: y, width: size, height: size, transform: 'translate(-50%, -50%)', borderRadius: '50%', pointerEvents: 'none', background: glowBackground(P, strength) };
  if (!animate) return <div aria-hidden data-testid={testid} style={base} />;
  return <motion.div aria-hidden data-testid={testid} style={base} initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={viewport} transition={{ duration: 1.6, delay, ease }} />;
};

/* Liten, rolig etikett over tittelen. Indeks i blekk, resten dempet. */
export const Kicker = ({ children, animate, testid, index }) => {
  const P = usePalette();
  return (
    <Rise as="p" animate={animate} testid={testid} className="deck-kicker" style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 14, color: P.muted, fontSize: 12.5, fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {typeof index === 'number' && <span style={{ color: P.ink, fontWeight: 500 }} data-testid="deck-kicker-index">{nn(index)}</span>}
      <span>{children}</span>
    </Rise>
  );
};

/* Logoens lilla prikk som punktum – kun der punktumet betyr handling. */
export const Dot = () => {
  const P = usePalette();
  return <span aria-hidden data-testid="deck-dot" style={{ display: 'inline-block', width: '0.16em', height: '0.16em', borderRadius: '50%', background: P.accent, marginLeft: '0.08em', verticalAlign: '0.02em', boxShadow: `0 0 0.35em rgba(${P.glow},${0.6 * P.dim})` }} />;
};

/* Tittel: PP Right Grotesk, stram sporing. Én tanke, to linjer. */
export const Headline = React.memo(function Headline({ lines, animate, dot = true, testid = 'slide-title', delay = 0.08, size = 'xl', align = 'left', style }) {
  const P = usePalette();
  return (
    <h2 data-testid={testid} className={`deck-h ${size === 'lg' ? 'deck-h-lg' : size === 'hero' ? 'deck-h-hero' : 'deck-h-xl'}`} style={{ margin: '26px 0 0', fontFamily: DISPLAY, fontWeight: 400, color: P.ink, textAlign: align, textWrap: 'balance', ...style }}>
      {lines.map((l, i) => (
        <React.Fragment key={l}>{i > 0 && ' '}<Reveal animate={animate} delay={delay + lines.slice(0, i).reduce((n, s) => n + s.split(' ').length, 0) * 0.055 + i * 0.04}>
          {l}{dot && i === lines.length - 1 && <Dot />}
        </Reveal></React.Fragment>
      ))}
    </h2>
  );
});

export const Lead = ({ children, animate, delay = 0.3, testid, style }) => {
  const P = usePalette();
  return <Rise as="p" animate={animate} delay={delay} testid={testid} className="deck-lead" style={{ margin: '30px 0 0', color: P.ink2, fontWeight: 400, maxWidth: 520, ...style }}>{children}</Rise>;
};

/* KONVERGENS: to myke buer fra hver side som møtes tangentielt i ett punkt. Etiketter over startene. */
export const Converge = ({ left, right, animate, delay = 0.4, testid = 'deck-converge' }) => {
  const P = usePalette();
  const Wd = 1120, Ht = 120, y0 = 22, y1 = 104, cx = Wd / 2;
  const dL = `M 0 ${y0} C ${cx * 0.55} ${y0}, ${cx * 0.72} ${y1}, ${cx} ${y1}`;
  const dR = `M ${Wd} ${y0} C ${Wd - cx * 0.55} ${y0}, ${Wd - cx * 0.72} ${y1}, ${cx} ${y1}`;
  const common = { stroke: P.rule, strokeWidth: 1, fill: 'none', vectorEffect: 'non-scaling-stroke', strokeLinecap: 'round' };
  const draw = (d) => (animate ? { initial: { pathLength: 0, opacity: 0 }, whileInView: { pathLength: 1, opacity: 1 }, viewport, transition: { duration: 1.4, delay: d, ease } } : {});
  return (
    <div className="deck-converge" data-testid={testid} style={{ position: 'relative', width: '100%', height: Ht }}>
      <Rise animate={animate} delay={delay} testid={`${testid}-left`} className="deck-path-label" style={{ position: 'absolute', top: 0, left: 0, color: P.ink, fontWeight: 500, fontSize: 13, lineHeight: 1, letterSpacing: '-0.008em' }}>{left}</Rise>
      <Rise animate={animate} delay={delay} testid={`${testid}-right`} className="deck-path-label" style={{ position: 'absolute', top: 0, right: 0, color: P.ink, fontWeight: 500, fontSize: 13, lineHeight: 1, letterSpacing: '-0.008em' }}>{right}</Rise>
      <svg aria-hidden viewBox={`0 0 ${Wd} ${Ht}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <motion.path d={dL} {...common} {...draw(delay + 0.2)} />
        <motion.path d={dR} {...common} {...draw(delay + 0.2)} />
      </svg>
      <Point animate={animate} delay={delay + 1.5} size={8} testid={`${testid}-point`} style={{ position: 'absolute', left: '50%', top: y1 - 4, marginLeft: -4 }} />
    </div>
  );
};

/* FAST GRID for innholdsseksjoner: kicker → tittel → figur → tekst → teller. Scenen står stille fra seksjon til seksjon. */
export const GRID = { kickerTop: 36, figureTop: 60, figureZone: 130 };
export const Content = ({ kicker, headline, figure, after, testid, figureZone = GRID.figureZone, figureTop = GRID.figureTop }) => (
  <div className="deck-content" data-testid={testid} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
    <div style={{ marginTop: GRID.kickerTop }}>{kicker}</div>
    {headline}
    <div className="deck-figure" style={{ marginTop: figureTop, height: figureZone }}>{figure}</div>
    <div className="deck-after">{after}</div>
  </div>
);

/* LINJEN: hairline som tegnes fra venstre til høyre og lyser mot punktet. Etiketter over, punktet på linjen der noe skjer. */
export const Path = ({ labels, point, animate, delay = 0.35, duration = 1.3, testid = 'deck-path' }) => {
  const P = usePalette();
  const x = (at) => (at === 'start' ? '0%' : at === 'center' ? '50%' : '100%');
  const shift = (at) => (at === 'start' ? '0%' : at === 'center' ? '-50%' : '-100%');
  const tone = (t) => (t === 'ink' ? P.ink : t === 'soft' ? P.ink2 : P.muted);
  const g = `rgba(${P.glow},0.9)`;
  const line = point === 'end' ? `linear-gradient(to right, ${P.hair}, ${P.rule} 55%, ${g})`
    : point === 'center' ? `linear-gradient(to right, ${P.hair}, ${g} 50%, ${P.hair})`
    : point === 'start' ? `linear-gradient(to right, ${g}, ${P.rule} 45%, ${P.hair})` : P.rule;
  return (
    <div className="deck-path" data-testid={testid} style={{ position: 'relative', width: '100%', height: 30 }}>
      {labels.map((l, i) => (
        <Rise key={l.text} animate={animate} delay={delay + 0.25 + i * 0.22} testid={`${testid}-label-${l.at}`} className="deck-path-label" style={{ position: 'absolute', top: 0, left: x(l.at), x: shift(l.at), color: tone(l.tone), fontWeight: l.tone === 'ink' ? 500 : 400, fontSize: 13, lineHeight: 1, letterSpacing: '-0.008em', whiteSpace: 'nowrap' }}>{l.text}</Rise>
      ))}
      <HLine animate={animate} delay={delay} duration={duration} color={line} easing="linear" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
      {point !== 'none' && (
        <Point animate={animate} delay={delay + duration - 0.15} size={8} testid={`${testid}-point`} style={{ position: 'absolute', bottom: -3.5, left: x(point), marginLeft: point === 'end' ? -8 : point === 'center' ? -4 : 0 }} />
      )}
    </div>
  );
};

/* LINJEN SOM TID. Steg over linjen, små captions under. Segmenter: helt, stiplet (venting), løper ut (uklart) eller lyser mot punktet.
   steps: [{ label, at(0..1), tone, caption }], segments: [{ from, to, style }]. På mobil (flow) rendres samme innhold som vertikal liste. */
export const Timeline = ({ steps, segments, point, animate, delay = 0.5, testid = 'deck-timeline' }) => {
  const P = usePalette();
  const hasCaptions = steps.some((st) => st.caption);
  const g = `rgba(${P.glow},0.9)`;
  const pct = (v) => `${v * 100}%`;
  const anchor = (at) => (at <= 0 ? { left: 0, textAlign: 'left' } : at >= 1 ? { right: 0, textAlign: 'right' } : { left: pct(at), x: '-50%', textAlign: 'center' });
  const tone = (t) => (t === 'ink' ? P.ink : t === 'soft' ? P.ink2 : P.muted);
  const bg = (sg) => sg.style === 'dashed' ? `repeating-linear-gradient(to right, ${P.rule} 0 4px, transparent 4px 9px)`
    : sg.style === 'fade' ? `linear-gradient(to right, ${P.rule}, rgba(0,0,0,0))`
    : sg.style === 'glow' && typeof point === 'number' ? `linear-gradient(to right, ${P.hair} 0%, ${P.rule} ${Math.max(0, point * 100 - 30)}%, ${g} ${point * 100}%, ${P.rule} ${Math.min(100, point * 100 + 18)}%, ${P.hair} 100%)`
    : P.rule;
  const DRAW = 1.5;
  return (
    <div className={`deck-timeline ${hasCaptions ? 'deck-timeline-captions' : ''}`} data-testid={testid}>
      <div className="deck-timeline-h" style={{ position: 'relative', width: '100%', height: hasCaptions ? 92 : 34 }}>
        {steps.map((st, i) => (
          <Rise key={st.label} animate={animate} delay={delay + st.at * DRAW + 0.15} testid={`${testid}-step-${i}`} className="deck-tl-label" style={{ position: 'absolute', top: 0, color: tone(st.tone), fontWeight: st.tone === 'ink' ? 500 : 400, fontSize: 13, lineHeight: 1, letterSpacing: '-0.008em', whiteSpace: 'nowrap', ...anchor(st.at) }}>{st.label}</Rise>
        ))}
        {segments.map((sg, i) => {
          const base = { position: 'absolute', top: 30, height: 1, left: pct(sg.from), width: pct(sg.to - sg.from), background: bg(sg) };
          return animate
            ? <motion.div key={i} aria-hidden data-testid={`${testid}-seg-${i}`} style={{ ...base, transformOrigin: 'left' }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={viewport} transition={{ duration: (sg.to - sg.from) * DRAW, delay: delay + sg.from * DRAW, ease: 'linear' }} />
            : <div key={i} aria-hidden data-testid={`${testid}-seg-${i}`} style={base} />;
        })}
        {typeof point === 'number' && (
          <Point animate={animate} delay={delay + point * DRAW + 0.1} size={8} testid={`${testid}-point`} style={{ position: 'absolute', top: 27, left: pct(point), marginLeft: -4 }} />
        )}
        {hasCaptions && steps.map((st, i) => st.caption && (
          <Rise key={`${st.label}-c`} animate={animate} delay={delay + st.at * DRAW + 0.45} testid={`${testid}-caption-${i}`} className="deck-tl-caption" style={{ position: 'absolute', top: 44, color: P.ink2, fontSize: 12.5, lineHeight: 1.45, letterSpacing: '-0.006em', width: st.at <= 0 || st.at >= 1 ? 200 : 170, ...anchor(st.at) }}>{st.caption}</Rise>
        ))}
      </div>
      <ol className="deck-timeline-v" style={{ display: 'none', listStyle: 'none', margin: 0, padding: 0 }}>
        {steps.map((st, i) => (
          <li key={st.label} className="deck-tl-item" style={{ position: 'relative', paddingLeft: 22, paddingBottom: i === steps.length - 1 ? 0 : 18 }}>
            <span aria-hidden style={{ position: 'absolute', left: 3, top: 7, width: 5, height: 5, borderRadius: '50%', background: typeof point === 'number' && Math.abs(st.at - point) < 0.01 ? P.accent : P.rule }} />
            {i < steps.length - 1 && <span aria-hidden style={{ position: 'absolute', left: 5, top: 16, bottom: -2, width: 1, background: P.hair }} />}
            <div style={{ color: tone(st.tone), fontWeight: st.tone === 'ink' ? 500 : 400, fontSize: 15, lineHeight: 1.3 }}>{st.label}</div>
            {st.caption && <div style={{ color: P.ink2, fontSize: 13.5, lineHeight: 1.45, marginTop: 3 }}>{st.caption}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
};
