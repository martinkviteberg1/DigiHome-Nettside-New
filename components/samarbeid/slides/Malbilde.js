'use client';
/* 01 · Målbildet. Linjen som geografi: Bergen (punktet) → Oslo → Norge → internasjonalt (løper ut). Under: to selskaper, og setningen som gjør resten av decket tydelig. */
import React, { useRef } from 'react';
import { Glow, GRID, Headline, Kicker, Lead, Point, Section, Timeline, usePalette } from '../cine';
import { Enter, useClock } from '../demo';
import { MALBILDE } from '../content';

const T = { cols: 3.2, punch: 4.6 };
export const MALBILDE_END = 6.4;
export const MALBILDE_LIGHT = { x: 80 / 1280, y: 0.56 };
export const MALBILDE_LIGHT_DELAY = 0.9;

export const Malbilde = ({ animate, index, total, standalone }) => {
  const c = MALBILDE;
  const P = usePalette();
  const ref = useRef(null);
  const t = useClock(animate, ref, MALBILDE_END);
  return (
    <Section testid="malbilde" index={index} total={total} animate={animate} tone="light" standalone={standalone}>
      <Glow animate={animate} delay={MALBILDE_LIGHT_DELAY} x={`${MALBILDE_LIGHT.x * 100}%`} y={`${MALBILDE_LIGHT.y * 100}%`} size={900} strength={0.16} testid="malbilde-glow" />
      <div ref={ref} className="deck-content" data-testid="malbilde-content" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: GRID.kickerTop }}><Kicker animate={animate} testid="malbilde-kicker" index={index - 1}>{c.kicker}</Kicker></div>
        <Headline lines={c.lines} animate={animate} size="lg" />
        <Lead animate={animate} delay={0.5} style={{ maxWidth: 760, marginTop: 22 }}>{c.lead}</Lead>
        <div style={{ marginTop: 44 }}>
          <Timeline steps={c.steg} segments={c.segmenter} point={0} animate={animate} delay={0.9} testid="malbilde-timeline" />
        </div>
        {/* To selskaper – og setningen. */}
        <div className="deck-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, marginTop: 'auto', paddingBottom: 6 }}>
          {c.to.map((k, i) => (
            <Enter key={k.navn} show={!animate || t >= T.cols + i * 0.3} animate={animate} y={10} duration={0.9} testid={`malbilde-col-${i}`}>
              <p style={{ margin: 0, fontSize: 11, color: P.muted, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>{k.navn}</p>
              <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: P.ink2, letterSpacing: '-0.012em' }}>{k.tekst}</p>
            </Enter>
          ))}
        </div>
        <Enter show={!animate || t >= T.punch} animate={animate} y={8} duration={0.9} testid="malbilde-punch" style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Point animate={false} size={7} />
          <p className="deck-punch" style={{ margin: 0, fontWeight: 500, color: P.ink }}>{c.punch}</p>
        </Enter>
      </div>
    </Section>
  );
};
