'use client';
/* Tilbudet. Ekstremt enkelt: ett stort tall. Den lilla delen av linjen fylles til 10 – punktet rir med og lander på delingen – mens tallet
   teller opp. Til venstre: dere. Til høyre: dagens eiere. Så, som eget lag: tre fakta. Nederst én rolig linje om hva kapitalen går til. */
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Glow, GRID, Headline, Kicker, Section, usePalette } from '../cine';
import { Enter, useClock } from '../demo';
import { TILBUD, TILBUDET } from '../content';
import { DISPLAY } from '../theme';

const SHARE = TILBUD.andel;
const CALM = [0.16, 1, 0.3, 1];
const T = { split: 1.5, fill: 1.6, labels: 3.3, fakta: 4.3, quiet: 5.8 };
export const TILBUDET_END = 8.0;
export const TILBUDET_LIGHT = { x: (80 + SHARE * 1120) / 1280, y: 0.6 };
export const TILBUDET_LIGHT_DELAY = T.split + 1.1;
const easeOut = (k) => 1 - Math.pow(1 - k, 4);

const Split = ({ t, animate }) => {
  const c = TILBUDET;
  const P = usePalette();
  const k = !animate ? 1 : Math.max(0, Math.min(1, (t - T.split) / T.fill));
  const n = Math.round(easeOut(k) * SHARE * 100);
  const landed = !animate || t >= T.split + T.fill;
  const on = !animate || t >= T.split;
  return (
    <div className="deck-split" data-testid="split" data-n={n} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', height: 122 }}>
        <Enter show={on} animate={animate} y={10} duration={0.8} testid="split-big" style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <span className="deck-split-big" style={{ fontFamily: DISPLAY, fontSize: 132, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.05em', color: P.ink, whiteSpace: 'nowrap' }}>{n}<span style={{ fontSize: 96, marginLeft: 6 }}>%</span></span>
        </Enter>
        <Enter show={landed} animate={animate} y={8} duration={0.7} testid="split-small" style={{ position: 'absolute', right: 0, bottom: 6 }}>
          <span className="deck-split-small" style={{ fontFamily: DISPLAY, fontSize: 40, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.04em', color: P.muted, whiteSpace: 'nowrap' }}>{c.small}</span>
        </Enter>
      </div>
      {/* Linjen: hårlinje hele veien, fylt i lys til delingen – punktet rir med. */}
      <div className="deck-split-line" style={{ position: 'relative', marginTop: 18, height: 2 }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: P.hair }} />
        <motion.div aria-hidden data-testid="split-fill" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: `linear-gradient(to right, ${P.accent}, rgba(${P.glow},0.95))`, transformOrigin: 'left', willChange: 'transform', width: `${SHARE * 100}%`, boxShadow: `0 0 18px rgba(${P.glow},0.45)` }} initial={animate ? { scaleX: 0 } : false} animate={{ scaleX: on ? 1 : 0 }} transition={{ duration: T.fill, ease: CALM }} />
        <motion.span aria-hidden data-testid="split-point" style={{ position: 'absolute', top: -4, width: 10, height: 10, marginLeft: -5, borderRadius: '50%', background: P.accent, boxShadow: `0 0 0 6px rgba(${P.glow},0.16), 0 0 30px rgba(${P.glow},0.6)`, willChange: 'transform, opacity' }}
          initial={animate ? { left: '0%', opacity: 0, scale: 0.4 } : { left: `${SHARE * 100}%`, opacity: 1, scale: 1 }} animate={{ left: on ? `${SHARE * 100}%` : '0%', opacity: on ? 1 : 0, scale: on ? 1 : 0.4 }} transition={{ left: { duration: T.fill, ease: CALM }, opacity: { duration: 0.4 }, scale: { duration: 0.5 } }} />
      </div>
      <div className="deck-split-labels" style={{ position: 'relative', marginTop: 16, minHeight: 44 }}>
        <Enter show={!animate || t >= T.labels} animate={animate} y={6} duration={0.7} testid="split-left" style={{ position: 'absolute', left: 0, top: 0, maxWidth: 520 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 500, color: P.ink, letterSpacing: '-0.014em', lineHeight: 1.2 }}>{c.left[0]}</span>
          <span style={{ display: 'block', marginTop: 4, fontSize: 13.5, color: P.ink2, letterSpacing: '-0.008em', lineHeight: 1.4 }}>{c.left[1]}</span>
        </Enter>
        <Enter show={!animate || t >= T.labels + 0.2} animate={animate} y={6} duration={0.7} testid="split-right" style={{ position: 'absolute', right: 0, top: 0, width: 320, textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 500, color: P.ink, letterSpacing: '-0.014em', lineHeight: 1.2 }}>{c.right[0]}</span>
          <span style={{ display: 'block', marginTop: 4, fontSize: 13.5, color: P.ink2, letterSpacing: '-0.008em', lineHeight: 1.4 }}>{c.right[1]}</span>
        </Enter>
      </div>
    </div>
  );
};

export const Tilbudet = ({ animate, index, total, standalone }) => {
  const c = TILBUDET;
  const P = usePalette();
  const ref = useRef(null);
  const t = useClock(animate, ref, TILBUDET_END);
  return (
    <Section testid="tilbudet" index={index} total={total} animate={animate} tone="light" standalone={standalone}>
      <Glow animate={animate} delay={TILBUDET_LIGHT_DELAY} x={`${TILBUDET_LIGHT.x * 100}%`} y={`${TILBUDET_LIGHT.y * 100}%`} size={900} strength={0.16} testid="tilbudet-glow" />
      <div ref={ref} className="deck-content deck-tilbudet" data-testid="tilbudet-content" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: GRID.kickerTop }}><Kicker animate={animate} testid="tilbudet-kicker" index={index - 1}>{c.kicker}</Kicker></div>
        <Headline lines={c.lines} animate={animate} size="lg" />
        <div style={{ marginTop: 30 }}><Split t={t} animate={animate} /></div>
        {/* Eget lag: tre fakta på én linje. */}
        <Enter show={!animate || t >= T.fakta} animate={animate} y={10} duration={0.9} testid="tilbudet-fakta" style={{ marginTop: 'auto' }}>
          <div className="deck-fakta" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: `1px solid ${P.hair}` }}>
            {c.fakta.map((f, i) => (
              <div key={f.k} data-testid={`tilbudet-fakta-${i}`} style={{ padding: '16px 0 2px', paddingLeft: i === 0 ? 0 : 28, borderLeft: i === 0 ? 'none' : `1px solid ${P.hair}` }}>
                <p style={{ margin: 0, fontSize: 11, color: P.muted, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>{f.k}</p>
                <p style={{ margin: '10px 0 0', fontFamily: DISPLAY, fontSize: 30, lineHeight: 1, color: P.ink, letterSpacing: '-0.03em' }}>{f.v}</p>
                <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.4, color: P.ink2, letterSpacing: '-0.008em' }}>{f.s}</p>
              </div>
            ))}
          </div>
        </Enter>
        <Enter show={!animate || t >= T.quiet} animate={animate} y={6} duration={0.9} testid="tilbudet-quiet" style={{ marginTop: 22, paddingBottom: 10 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: P.muted, letterSpacing: '-0.006em', maxWidth: 1040, whiteSpace: 'nowrap' }}>{c.quiet}</p>
        </Enter>
      </div>
    </Section>
  );
};
