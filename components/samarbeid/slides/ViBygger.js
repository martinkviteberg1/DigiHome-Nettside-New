'use client';
/* 02 · Vi bygger. Tesen i to linjer, så konvergensen: forvalteren fra venstre, eieren fra høyre – møtes i punktet. Under punktet: hva det gir. */
import React, { useRef } from 'react';
import { Converge, Glow, GRID, Headline, Kicker, Lead, Section, usePalette } from '../cine';
import { Enter, useClock } from '../demo';
import { VI_BYGGER } from '../content';

const T = { punch: 3.4, under: 4.4 };
export const VI_BYGGER_END = 6.0;
export const VI_BYGGER_LIGHT = { x: 0.5, y: (96 + 470) / 720 };
export const VI_BYGGER_LIGHT_DELAY = 2.2;

export const ViBygger = ({ animate, index, total, standalone }) => {
  const c = VI_BYGGER;
  const P = usePalette();
  const ref = useRef(null);
  const t = useClock(animate, ref, VI_BYGGER_END);
  return (
    <Section testid="vi-bygger" index={index} total={total} animate={animate} tone="light" standalone={standalone}>
      <Glow animate={animate} delay={VI_BYGGER_LIGHT_DELAY} x={`${VI_BYGGER_LIGHT.x * 100}%`} y={`${VI_BYGGER_LIGHT.y * 100}%`} size={1000} strength={0.15} testid="vi-bygger-glow" />
      <div ref={ref} className="deck-content" data-testid="vi-bygger-content" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: GRID.kickerTop }}><Kicker animate={animate} testid="vi-bygger-kicker" index={index - 1}>{c.kicker}</Kicker></div>
        <Headline lines={c.lines} animate={animate} size="xl" />
        <Lead animate={animate} delay={0.6} style={{ maxWidth: 640, marginTop: 24 }}>{c.lead}</Lead>
        <div style={{ marginTop: 'auto' }}>
          <Converge left={c.left} right={c.right} animate={animate} delay={1.3} testid="vi-bygger-converge" />
          <div className="deck-meet" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 22, paddingBottom: 6 }}>
            <Enter show={!animate || t >= T.punch} animate={animate} y={8} duration={0.9} testid="vi-bygger-punch" style={{ maxWidth: 620 }}>
              <p className="deck-meet-1" style={{ margin: 0, fontWeight: 500, color: P.ink }}>{c.punch}</p>
            </Enter>
            <Enter show={!animate || t >= T.under} animate={animate} y={6} duration={0.9} testid="vi-bygger-under" style={{ maxWidth: 560, marginTop: 8 }}>
              <p className="deck-meet-2" style={{ margin: 0, color: P.muted }}>{c.under}</p>
            </Enter>
          </div>
        </div>
      </div>
    </Section>
  );
};
