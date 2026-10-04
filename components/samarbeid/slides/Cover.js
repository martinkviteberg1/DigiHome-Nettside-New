'use client';
/* Cover. Bergen i skumring bak, lyset våkner over Vågen. Tittelen i offwhite, mottakerne øverst, avsenderne langs linjen nederst.
   Tidslinje (s): eyebrow 0,2 · til 0,6 · tittel 0,9 · lead 1,9 · linjen 2,5 · avsenderne 2,9–3,6 · klar 3,8. */
import React, { useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DeckLayerContext, Glow, Headline, HLine, Point, Rise, Section, usePalette } from '../cine';
import { PALETTES } from '../theme';
import { Enter, useClock } from '../demo';
import { AVSENDERE, COVER } from '../content';

const T = { eyebrow: 0.2, til: 0.6, title: 0.9, lead: 1.9, line: 2.5, people: 2.9, ready: 3.8 };
export const COVER_END = 5.2;
export const COVER_LIGHT = { x: 0.66, y: 0.42 };
export const COVER_LIGHT_FROM = { x: 0.9, y: 0.95 };
export const COVER_LIGHT_DELAY = 0.6;
export const COVER_LIGHT_DURATION = 2.4;

const Avsender = ({ p, show, animate, delay }) => {
  const P = usePalette();
  return (
    <Enter show={show} animate={animate} y={10} duration={0.8} delay={delay} testid={`cover-sender-${p.navn.split(' ')[0].toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flex: 'none', boxShadow: `0 0 0 1px ${P.rule}` }}>
        <img src={p.img} alt="" width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: p.pos || '50% 20%', display: 'block', filter: 'grayscale(1)' }} />
      </span>
      <span style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: P.ink, letterSpacing: '-0.012em', lineHeight: 1.15 }}>{p.navn}</span>
        <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: P.muted, letterSpacing: '-0.006em', lineHeight: 1.2 }}>{p.rolle}</span>
      </span>
    </Enter>
  );
};

export const Cover = ({ animate, index, total, standalone }) => {
  const ref = useRef(null);
  const t = useClock(animate, ref, COVER_END);
  const P = PALETTES.dark; // seksjonen er mørk – paletten må settes her, utenfor Section-konteksten
  const host = useContext(DeckLayerContext);
  useEffect(() => { if (t >= T.ready) window.dispatchEvent(new CustomEvent('deck:cover-ready')); }, [t]);
  /* Byen bak: i decket portaleres den til skjermlaget (full bredde, skjermens egne piksler); i PDF/miniatyr ligger den i scenen. */
  const vis = animate && t < Infinity ? Math.min(1, t / 1.6) : 1;
  const bakgrunn = (full) => (
    <div aria-hidden className="deck-cover-bg" style={full ? { position: 'absolute', inset: 0, overflow: 'hidden' } : { position: 'absolute', left: -80, top: -96, width: 1280, height: 720, pointerEvents: 'none', overflow: 'hidden' }}>
      <img src="/brand/tilbud-cover-bergen.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '62% 42%', display: 'block', opacity: vis, transition: 'opacity 600ms', filter: 'saturate(0.7) brightness(0.74)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(21,19,15,0.96) 0%, rgba(21,19,15,0.86) 34%, rgba(21,19,15,0.46) 66%, rgba(21,19,15,0.5) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(21,19,15,0.45) 0%, rgba(21,19,15,0.05) 28%, rgba(21,19,15,0.25) 68%, rgba(21,19,15,0.94) 100%)' }} />
    </div>
  );
  return (
    <Section testid="cover" index={index} total={total} animate={animate} tone="dark" standalone={standalone} className="deck-cover-section">
      {host && standalone === false ? createPortal(bakgrunn(true), host) : bakgrunn(false)}
      <Glow animate={animate} delay={COVER_LIGHT_DELAY} x={`${COVER_LIGHT.x * 100}%`} y={`${COVER_LIGHT.y * 100}%`} size={1100} strength={0.17} testid="cover-glow" />
      <div ref={ref} className="deck-content deck-cover" data-testid="cover-content" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Enter show={!animate || t >= T.eyebrow} animate={animate} y={6} duration={0.8} testid="cover-eyebrow">
          <p style={{ margin: 0, fontSize: 12.5, color: P.muted, letterSpacing: '-0.005em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{COVER.eyebrow}</p>
        </Enter>
        <Enter show={!animate || t >= T.til} animate={animate} y={6} duration={0.8} testid="cover-til" style={{ marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 15, color: P.ink2, letterSpacing: '-0.012em', lineHeight: 1.3, fontWeight: 500 }}>{COVER.til}</p>
        </Enter>
        <div style={{ marginTop: 'auto', paddingBottom: 26 }}>
          {(!animate || t >= T.title) && <Headline lines={COVER.lines} animate={animate} size="hero" delay={0} style={{ margin: 0, maxWidth: 820 }} />}
          <Enter show={!animate || t >= T.lead} animate={animate} y={8} duration={0.9} testid="cover-lead" style={{ marginTop: 22, maxWidth: 560 }}>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: P.ink2, letterSpacing: '-0.012em' }}>{COVER.lead}</p>
          </Enter>
        </div>
        {/* Avsenderne: linjen tegnes, punktet lander ved det første navnet, de tre kommer inn én og én. */}
        <div className="deck-cover-path" data-testid="cover-senders" style={{ position: 'relative', paddingTop: 22 }}>
          <HLine animate={animate} delay={T.line} duration={1.2} style={{ position: 'absolute', left: 0, right: 0, top: 0 }} color={`linear-gradient(to right, rgba(${P.glow},0.9), ${P.rule} 30%, ${P.hair})`} />
          <Point animate={animate} delay={T.line + 0.2} size={7} style={{ position: 'absolute', left: 0, top: -3 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
            <Rise animate={animate} delay={T.line + 0.3} as="p" style={{ margin: 0, fontSize: 11, color: P.muted, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1, width: 44 }}>{COVER.fra}</Rise>
            {AVSENDERE.map((p, k) => <Avsender key={p.navn} p={p} show={!animate || t >= T.people + k * 0.35} animate={animate} delay={0} />)}
          </div>
        </div>
      </div>
    </Section>
  );
};
