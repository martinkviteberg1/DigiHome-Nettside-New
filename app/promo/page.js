'use client';

/* ---------------------------------------------------------------------------
   /promo — brandede tittelkort for film-rendring (LinkedIn).
   ?del=intro  → åpningskort («Nye digihome.no.»), toner ut til canvas.
   ?del=outro  → sluttkort på charcoal («digihome.no.» + puls).

   Arver appens fonter (--font-heading/--font-body), Warm-Ink-palett og logo,
   slik at kortene er 100 % konsistente med sidene som filmes. Alle bevegelser
   er CSS-keyframes (opacity/transform) med faste tidspunkter, så opptaket er
   deterministisk. Alle delays er skjøvet +B sek så de første rammene er rolige.
--------------------------------------------------------------------------- */

import React, { useEffect, useState } from 'react';

const C = { canvas: '#F3F1EC', ink: '#15130F', charcoal: '#221F1A', offwhite: '#F4F1EA', lilla: '#D496FF' };
const HEAD = { fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700 };
const BODY = { fontFamily: 'var(--font-body), -apple-system, sans-serif' };
const B = 0.45; // base-forsinkelse (sek) — trimmes bort i klippet
const d = (s) => `${(B + s).toFixed(2)}s`;
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

const KEYFRAMES = `
@keyframes pr-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes pr-hair { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pr-dot { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
@keyframes pr-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pr-bg { from { background: ${C.canvas}; } to { background: ${C.charcoal}; } }
@keyframes pr-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.7); opacity: 0.45; } }
@keyframes pr-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes pr-pop { from { opacity: 0; transform: scale(0.82); } to { opacity: 1; transform: none; } }
@keyframes pr-vline { from { transform: scaleY(0); } to { transform: scaleY(1); } }
`;

// Lilla punktum som en ekte rund prikk (display-fonten mangler et pent punktum-glyph).
const Prikk = () => (
  <span style={{ display: 'inline-block', width: '0.16em', height: '0.16em', borderRadius: 999, background: C.lilla, verticalAlign: 'baseline', marginLeft: '0.07em' }} />
);

function Intro() {
  const rise = (delay, dur = 0.85) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  const steg = ['Annonse', 'Leietaker', 'Kontrakt', 'Husleie', 'Drift'];
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.canvas, overflow: 'hidden', ...BODY }} data-testid="promo-intro">
      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '13%', height: 1, background: 'rgba(21,19,15,0.16)', transformOrigin: 'left', animation: `pr-hair 1.0s ${EASE} ${d(0.1)} both` }} />
      <div style={{ position: 'absolute', left: '8%', top: 'calc(13% - 3px)', width: 7, height: 7, borderRadius: 999, background: C.lilla, animation: `pr-dot 0.5s ${EASE} ${d(0.9)} both` }} />

      <div style={{ position: 'absolute', left: '8%', right: '8%', top: '23%' }}>
        <p style={{ fontSize: '1.75vmin', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, color: 'rgba(21,19,15,0.5)', ...rise(0.3, 0.7) }}>Utleie i Bergen</p>
        <h1 style={{ marginTop: '3vmin', fontSize: '10.5vmin', lineHeight: 1.0, letterSpacing: '-0.042em', ...HEAD }}>
          <span style={{ display: 'block', color: 'rgba(21,19,15,0.32)', ...rise(0.55, 0.9) }}>Alt som må gjøres</span>
          <span style={{ display: 'block', color: C.ink, ...rise(1.05, 0.9) }}>gjør vi automatisk<Prikk /></span>
        </h1>
        <div style={{ marginTop: '6vmin', display: 'flex', alignItems: 'center', gap: '1.3vmin', flexWrap: 'wrap' }}>
          {steg.map((s, i) => (
            <React.Fragment key={s}>
              <span style={{ fontSize: '2.05vmin', fontWeight: 500, color: C.ink, padding: '1.15vmin 2.1vmin', borderRadius: 999, background: 'rgba(21,19,15,0.055)', ...rise(1.7 + i * 0.16, 0.7) }}>{s}</span>
              {i < steg.length - 1 ? <span style={{ fontSize: '1.7vmin', color: C.lilla, ...rise(1.78 + i * 0.16, 0.6) }}>&rarr;</span> : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: '11%', display: 'flex', alignItems: 'center', gap: '2vmin', ...rise(2.7, 0.8) }}>
        <img src="/digihome-hero-logo.svg" alt="DigiHome" style={{ height: '5vmin', width: 'auto', display: 'block' }} />
        <span style={{ fontSize: '1.9vmin', color: 'rgba(21,19,15,0.5)' }}>Se de nye sidene på digihome.no</span>
      </div>
    </div>
  );
}

function Outro() {
  const rise = (delay, dur = 0.9) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.charcoal, overflow: 'hidden', animation: `pr-bg 0.7s ease ${d(0)} both`, ...BODY }} data-testid="promo-outro">
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <img src="/digihome-hero-logo-white.svg" alt="DigiHome" style={{ height: '6.8vmin', width: 'auto', display: 'block', ...rise(0.9) }} />
        <h2 style={{ marginTop: '5.5vmin', fontSize: '9.5vmin', lineHeight: 1, letterSpacing: '-0.04em', color: C.offwhite, ...HEAD, ...rise(1.2, 1.0) }}>
          digihome.no<Prikk />
        </h2>
        <p style={{ marginTop: '2.6vmin', fontSize: '2.5vmin', color: 'rgba(244,241,234,0.62)', ...rise(1.7) }}>Se de nye sidene.</p>
        <div style={{ marginTop: '6vmin', ...rise(2.2, 0.6) }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: C.lilla, animation: `pr-pulse 1.6s ease-in-out ${d(2.6)} infinite` }} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------
   Generell markedsfilm — brandede, forklarende scener (ingen passiv scroll).
   ?del=hook | flyt | oversikt | leietaker | inntekt | cta
   Alt er vmin-basert (vmin = 1080 i alle format), så de samme scenene funker
   for 9:16, 1:1 og 16:9. Sentrert stage → adapterer til høyde/bredde.
------------------------------------------------------------------------ */

const Stage = ({ children, bg = C.canvas, testid }) => (
  <div data-testid={testid} style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', ...BODY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 7%', textAlign: 'center' }}>
    {children}
  </div>
);

const Eyebrow = ({ children, delay = 0.2, dark }) => (
  <p style={{ fontSize: '1.9vmin', letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600, margin: 0, color: dark ? 'rgba(244,241,234,0.5)' : 'rgba(21,19,15,0.42)', animation: `pr-rise 0.7s ${EASE} ${d(delay)} both` }}>{children}</p>
);

function Hook() {
  const rise = (delay, dur = 0.9) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  return (
    <Stage testid="promo-hook">
      <div style={{ position: 'absolute', left: '7%', right: '7%', top: '11%', height: 1, background: 'rgba(21,19,15,0.14)', transformOrigin: 'left', animation: `pr-hair 1.0s ${EASE} ${d(0.1)} both` }} />
      <div style={{ position: 'absolute', left: '7%', top: 'calc(11% - 3px)', width: 7, height: 7, borderRadius: 999, background: C.lilla, animation: `pr-dot 0.5s ${EASE} ${d(0.9)} both` }} />
      <Eyebrow delay={0.25}>Digihome · utleie</Eyebrow>
      <h1 style={{ marginTop: '5vmin', fontSize: '8.4vmin', lineHeight: 1.06, letterSpacing: '-0.04em', ...HEAD }}>
        <span style={{ display: 'block', color: 'rgba(21,19,15,0.34)', ...rise(0.55) }}>Å leie ut skal</span>
        <span style={{ display: 'block', color: 'rgba(21,19,15,0.34)', ...rise(0.8) }}>ikke være en jobb.</span>
        <span style={{ display: 'block', marginTop: '2.6vmin', color: C.ink, ...rise(1.75) }}>Nå går det av seg selv<Prikk /></span>
      </h1>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '9%', display: 'flex', justifyContent: 'center', ...rise(2.6, 0.8) }}>
        <img src="/digihome-hero-logo.svg" alt="DigiHome" style={{ height: '4.2vmin', width: 'auto', display: 'block' }} />
      </div>
    </Stage>
  );
}

function Flyt() {
  const rise = (delay, dur = 0.8) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  const steg = [
    { t: 'Annonse', b: 'Vi finner boligen og lager annonsen' },
    { t: 'Kontrakt', b: 'Leietaker signerer med BankID' },
    { t: 'Husleie', b: 'Betales og bokføres automatisk' },
    { t: 'Drift', b: 'Saker og vedlikehold håndteres' },
  ];
  return (
    <Stage testid="promo-flyt">
      <Eyebrow delay={0.2}>Slik fungerer det</Eyebrow>
      <h2 style={{ marginTop: '3vmin', marginBottom: '6vmin', fontSize: '7.4vmin', lineHeight: 1.02, letterSpacing: '-0.035em', color: C.ink, ...HEAD, ...rise(0.5, 0.9) }}>Fire steg. Null styr<Prikk /></h2>
      <div style={{ position: 'relative', width: '100%', maxWidth: '80vmin', textAlign: 'left' }}>
        <div style={{ position: 'absolute', left: '3.5vmin', top: '4vmin', bottom: '4vmin', width: 2, background: 'rgba(21,19,15,0.12)', transformOrigin: 'top', animation: `pr-vline 1.7s ${EASE} ${d(1.0)} both` }} />
        {steg.map((s, i) => (
          <div key={s.t} style={{ display: 'flex', alignItems: 'flex-start', gap: '3.2vmin', padding: '2vmin 0', ...rise(1.15 + i * 0.35, 0.7) }}>
            <span style={{ position: 'relative', zIndex: 1, flex: 'none', width: '7vmin', height: '7vmin', borderRadius: 999, background: C.canvas, boxShadow: '0 0 0 2px rgba(21,19,15,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: '3vmin', color: C.ink }}>{i + 1}</span>
            <div style={{ paddingTop: '0.5vmin' }}>
              <div style={{ fontSize: '3.6vmin', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-heading), sans-serif', letterSpacing: '-0.02em' }}>{s.t}</div>
              <div style={{ fontSize: '2.35vmin', color: 'rgba(21,19,15,0.55)', marginTop: '0.5vmin' }}>{s.b}</div>
            </div>
          </div>
        ))}
      </div>
    </Stage>
  );
}

function Oversikt() {
  const rise = (delay, dur = 0.8) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  const kpis = [
    { l: 'Leieinntekt', v: '37 600 kr', s: '3 av 3 betalt' },
    { l: 'Åpne saker', v: '1', s: 'Venter på deg' },
    { l: 'Utleiegrad', v: '100 %', s: '3 av 3 enheter' },
    { l: 'Neste forfall', v: '1. des', s: 'Husleie 37 600 kr' },
  ];
  const bars = [40, 52, 47, 60, 55, 68, 63, 75, 70, 82, 78, 96];
  return (
    <Stage testid="promo-oversikt">
      <Eyebrow delay={0.2}>Økonomi og oversikt</Eyebrow>
      <div style={{ marginTop: '4vmin', width: '100%', maxWidth: '84vmin', background: '#FBFAF7', borderRadius: '3.2vmin', boxShadow: '0 3vmin 8vmin rgba(21,19,15,0.10), 0 0 0 1px rgba(21,19,15,0.05)', padding: '4.6vmin', textAlign: 'left', ...rise(0.5, 0.9) }}>
        <div style={{ fontSize: '3.7vmin', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-heading), sans-serif', letterSpacing: '-0.02em', ...rise(0.7) }}>God morgen, Kari<Prikk /></div>
        <div style={{ fontSize: '2vmin', color: 'rgba(21,19,15,0.5)', marginTop: '0.6vmin', ...rise(0.8) }}>Torsdag 6. november · Nygårdsgaten 5</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.4vmin 3vmin', marginTop: '3.6vmin' }}>
          {kpis.map((k, i) => (
            <div key={k.l} style={{ ...rise(1.0 + i * 0.14) }}>
              <div style={{ fontSize: '1.7vmin', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(21,19,15,0.45)', fontWeight: 600 }}>{k.l}</div>
              <div style={{ fontSize: '4.4vmin', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-heading), sans-serif', letterSpacing: '-0.02em', marginTop: '0.5vmin' }}>{k.v}</div>
              <div style={{ fontSize: '1.7vmin', color: 'rgba(21,19,15,0.45)', marginTop: '0.3vmin' }}>{k.s}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.3vmin', height: '15vmin', marginTop: '3.8vmin' }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '1vmin 1vmin 0 0', background: i === bars.length - 1 ? C.lilla : 'rgba(21,19,15,0.10)', transformOrigin: 'bottom', animation: `pr-grow 0.7s ${EASE} ${d(1.5 + i * 0.05)} both` }} />
          ))}
        </div>
      </div>
      <p style={{ fontSize: '2.5vmin', color: 'rgba(21,19,15,0.6)', marginTop: '3.6vmin', maxWidth: '80vmin', ...rise(2.3) }}>Leieinntekt, saker og kontrakter — samlet på ett sted.</p>
    </Stage>
  );
}

function Leietaker() {
  const rise = (delay, dur = 0.8) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  const rows = [['Leiekontrakt', 'Signert med BankID · 3 år'], ['Depositum', 'Garanti · 37 500 kr'], ['Sak', 'Ingen varmtvann · sendt']];
  return (
    <Stage testid="promo-leietaker">
      <Eyebrow delay={0.2}>For leietakeren</Eyebrow>
      <div style={{ marginTop: '4vmin', width: '100%', maxWidth: '60vmin', background: '#FBFAF7', borderRadius: '4vmin', boxShadow: '0 3vmin 8vmin rgba(21,19,15,0.12), 0 0 0 1px rgba(21,19,15,0.05)', padding: '4.4vmin', textAlign: 'left', ...rise(0.5, 0.9) }}>
        <div style={{ fontSize: '3.7vmin', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-heading), sans-serif', letterSpacing: '-0.02em', ...rise(0.7) }}>Hei, Emma<Prikk /></div>
        <div style={{ fontSize: '2vmin', color: 'rgba(21,19,15,0.5)', marginTop: '0.5vmin', ...rise(0.8) }}>Nygårdsgaten 5 · Leilighet 2</div>
        <div style={{ marginTop: '3.2vmin', padding: '3vmin', borderRadius: '2.4vmin', background: C.canvas, display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...rise(1.1) }}>
          <div>
            <div style={{ fontSize: '1.9vmin', color: 'rgba(21,19,15,0.5)' }}>Husleie · desember</div>
            <div style={{ fontSize: '4.6vmin', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-heading), sans-serif', letterSpacing: '-0.02em' }}>12 500 kr</div>
          </div>
          <span style={{ fontSize: '2.3vmin', fontWeight: 600, color: C.ink, background: C.lilla, padding: '1.5vmin 3.2vmin', borderRadius: 999 }}>Betal</span>
        </div>
        {rows.map((r, i) => (
          <div key={r[0]} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2.1vmin 0', borderTop: '1px solid rgba(21,19,15,0.08)', ...rise(1.45 + i * 0.18) }}>
            <span style={{ fontSize: '2.4vmin', fontWeight: 600, color: C.ink }}>{r[0]}</span>
            <span style={{ fontSize: '2.05vmin', color: 'rgba(21,19,15,0.5)' }}>{r[1]}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '2.5vmin', color: 'rgba(21,19,15,0.6)', marginTop: '3.6vmin', maxWidth: '72vmin', ...rise(2.4) }}>Leietakeren betaler og melder fra — rett i appen.</p>
    </Stage>
  );
}

function Inntekt() {
  const rise = (delay, dur = 0.85) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now(); const begin = (B + 0.95) * 1000; const dur = 1400;
    const tick = (now) => {
      const el = now - start - begin;
      if (el <= 0) { raf = requestAnimationFrame(tick); return; }
      const p = Math.min(1, el / dur); const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(e * 30));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const bars = [{ h: '11vmin', l: 'Før', a: false, dl: 2.2 }, { h: '19vmin', l: 'Med DigiHome', a: true, dl: 2.45 }];
  return (
    <Stage testid="promo-inntekt">
      <Eyebrow delay={0.2}>Resultatet</Eyebrow>
      <div style={{ marginTop: '2vmin', ...rise(0.5) }}>
        <div style={{ fontSize: '2.5vmin', color: 'rgba(21,19,15,0.5)', fontWeight: 600 }}>Opptil</div>
        <div style={{ fontSize: '22vmin', lineHeight: 1, fontWeight: 700, color: C.ink, fontFamily: 'var(--font-heading), sans-serif', letterSpacing: '-0.05em' }}>{n} %</div>
      </div>
      <p style={{ fontSize: '4.2vmin', lineHeight: 1.1, color: C.ink, fontFamily: 'var(--font-heading), sans-serif', letterSpacing: '-0.03em', marginTop: '1.5vmin', maxWidth: '82vmin', ...rise(1.9) }}>høyere leieinntekt — på samme bolig<Prikk /></p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5vmin', marginTop: '5vmin' }}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '15vmin', height: b.h, borderRadius: '1.6vmin 1.6vmin 0 0', background: b.a ? C.lilla : 'rgba(21,19,15,0.14)', transformOrigin: 'bottom', animation: `pr-grow 0.9s ${EASE} ${d(b.dl)} both` }} />
            <div style={{ fontSize: '1.95vmin', color: 'rgba(21,19,15,0.5)', fontWeight: 600, marginTop: '1.5vmin' }}>{b.l}</div>
          </div>
        ))}
      </div>
    </Stage>
  );
}

function Cta() {
  const rise = (delay, dur = 0.9) => ({ animation: `pr-rise ${dur}s ${EASE} ${d(delay)} both` });
  return (
    <Stage bg={C.charcoal} testid="promo-cta">
      <img src="/digihome-hero-logo-white.svg" alt="DigiHome" style={{ height: '5.4vmin', width: 'auto', display: 'block', ...rise(0.6) }} />
      <h2 style={{ marginTop: '5vmin', fontSize: '8.6vmin', lineHeight: 1.03, letterSpacing: '-0.04em', color: C.offwhite, ...HEAD, ...rise(0.95) }}>
        <span style={{ display: 'block' }}>Start med</span>
        <span style={{ display: 'block' }}>adressen din<Prikk /></span>
      </h2>
      <p style={{ marginTop: '3.6vmin', fontSize: '3vmin', color: 'rgba(244,241,234,0.62)', ...rise(1.5) }}>digihome.no</p>
      <div style={{ marginTop: '4.6vmin', display: 'inline-flex', alignItems: 'center', gap: '1.6vmin', padding: '1.9vmin 3.6vmin', borderRadius: 999, background: 'rgba(244,241,234,0.07)', boxShadow: '0 0 0 1px rgba(244,241,234,0.14)', ...rise(1.95) }}>
        <span style={{ width: '1.4vmin', height: '1.4vmin', borderRadius: 999, background: C.lilla, animation: `pr-pulse 1.6s ease-in-out ${d(2.5)} infinite` }} />
        <span style={{ fontSize: '2.3vmin', color: C.offwhite, fontWeight: 600 }}>Gratis vurdering innen 24 timer</span>
      </div>
    </Stage>
  );
}

const SCENES = { intro: Intro, outro: Outro, hook: Hook, flyt: Flyt, oversikt: Oversikt, leietaker: Leietaker, inntekt: Inntekt, cta: Cta };

export default function PromoPage() {
  const [del, setDel] = useState(null);
  useEffect(() => {
    try { setDel(new URLSearchParams(window.location.search).get('del') || 'intro'); } catch (e) { setDel('intro'); }
  }, []);
  const Scene = del ? SCENES[del] : null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {Scene ? <Scene /> : <div style={{ position: 'fixed', inset: 0, background: C.canvas }} />}
    </>
  );
}
