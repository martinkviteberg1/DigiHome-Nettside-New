'use client';

import {
  seg, easeOutCubic, easeInOutCubic, easeOutExpo, easeOutBack,
  fadeInOut, rise, pop, typed, fmtNOK, clamp01, Orb, Caret,
} from './filmUtils';

/* =====================================================================
   AKT 1 — ÅPNING (0–6.5s)  «Utleie.» → mørk sirkelwipe → «På autopilot.»
===================================================================== */
export function SceneOpening({ t }) {
  const o = fadeInOut(t, 0, 6.5, 0, 0.5);
  const kickerIn = easeOutCubic(seg(t, 0.25, 1.0));
  const kickerOut = 1 - seg(t, 2.2, 2.8);
  const wipe = easeInOutCubic(seg(t, 2.6, 4.3));
  const lightOut = 1 - seg(t, 3.2, 4.0);
  const drift = seg(t, 4.3, 6.5);

  const word1 = 'Utleie.';
  const word2 = 'På autopilot.';

  return (
    <div className="absolute inset-0" style={{ opacity: o }}>
      {/* light canvas */}
      <div className="absolute inset-0" style={{ background: '#FDFCFB' }} />
      <div className="absolute inset-0 dot-grid" style={{ opacity: 0.35 }} />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ opacity: lightOut }}
      >
        <div
          className="font-body uppercase"
          style={{
            ...rise(Math.min(kickerIn, kickerOut), 1.5),
            fontSize: 'calc(var(--su) * 1.5)',
            letterSpacing: '0.42em',
            color: 'rgba(10,10,10,0.45)',
            marginBottom: 'calc(var(--su) * 3.2)',
          }}
        >
          DigiHome presenterer
        </div>
        <h1
          className="font-heading font-bold"
          style={{ fontSize: 'calc(var(--su) * 11)', color: '#0A0A0A', lineHeight: 1, display: 'flex' }}
        >
          {word1.split('').map((ch, i) => {
            const p = easeOutCubic(seg(t, 0.55 + i * 0.07, 1.45 + i * 0.07));
            return (
              <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(calc(var(--su) * ${((1 - p) * 4).toFixed(3)}))` }}>
                {ch}
              </span>
            );
          })}
        </h1>
      </div>
      {/* dark circular wipe */}
      <div
        className="absolute inset-0"
        style={{ background: '#0A0A0A', clipPath: `circle(${(wipe * 140).toFixed(2)}% at 84% 50%)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            className="font-heading font-bold"
            style={{
              fontSize: 'calc(var(--su) * 11)',
              color: '#FDFCFB',
              lineHeight: 1,
              display: 'flex',
              transform: `scale(${(1 + drift * 0.035).toFixed(4)})`,
            }}
          >
            {word2.split('').map((ch, i) => {
              const p = easeOutCubic(seg(t, 3.35 + i * 0.05, 4.15 + i * 0.05));
              return (
                <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: p, transform: `translateY(calc(var(--su) * ${((1 - p) * 4).toFixed(3)}))` }}>
                  {ch}
                </span>
              );
            })}
          </h1>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   AKT 2 — TOGGLE (6–12.5s)  Autopilot skrus PÅ — motoren våkner
===================================================================== */
export function SceneToggle({ t }) {
  const o = fadeInOut(t, 6, 12.5);
  const grpIn = easeOutCubic(seg(t, 6.8, 7.6));
  const flip = easeInOutCubic(seg(t, 8.2, 8.8));
  const ring = seg(t, 8.75, 10.1);
  const orbIn = easeOutCubic(seg(t, 8.8, 10.8));
  const cap = easeOutCubic(seg(t, 9.9, 10.9));

  return (
    <div className="absolute inset-0" style={{ opacity: o }}>
      {/* orb behind */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Orb
          size="calc(var(--su) * 52)"
          style={{ opacity: orbIn * 0.8, transform: `scale(${(0.65 + 0.35 * orbIn).toFixed(3)})`, transition: 'none' }}
        />
      </div>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(5,5,6,0) 30%, rgba(5,5,6,0.78) 72%)' }} />
      {/* toggle group */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={rise(grpIn, 3)}>
        <div
          className="font-body uppercase"
          style={{ fontSize: 'calc(var(--su) * 1.7)', letterSpacing: '0.5em', color: 'rgba(253,252,251,0.85)', marginBottom: 'calc(var(--su) * 2.6)', textIndent: '0.5em' }}
        >
          Autopilot
        </div>
        <div style={{ position: 'relative' }}>
          {/* pulse ring */}
          <div
            style={{
              position: 'absolute', inset: 'calc(var(--su) * -1)', borderRadius: '999px',
              border: '1.5px solid rgba(207,151,252,0.8)',
              opacity: ring > 0 ? (1 - ring) * 0.9 : 0,
              transform: `scale(${(1 + ring * 1.6).toFixed(3)})`,
            }}
          />
          {/* track */}
          <div
            style={{
              width: 'calc(var(--su) * 13.5)', height: 'calc(var(--su) * 7)', borderRadius: '999px',
              position: 'relative', overflow: 'hidden',
              background: '#222226', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: flip > 0.5 ? `0 0 calc(var(--su) * ${(flip * 4).toFixed(2)}) rgba(207,151,252,0.5)` : 'none',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #9B5BD6, #CF97FC)', opacity: flip }} />
            {/* knob */}
            <div
              style={{
                position: 'absolute', top: 'calc(var(--su) * 0.6)', left: 'calc(var(--su) * 0.6)',
                width: 'calc(var(--su) * 5.8)', height: 'calc(var(--su) * 5.8)', borderRadius: '50%',
                background: '#FDFCFB', boxShadow: '0 2px 14px rgba(0,0,0,0.45)',
                transform: `translateX(calc(var(--su) * ${(flip * 6.5).toFixed(3)}))`,
              }}
            />
          </div>
        </div>
        <div
          className="font-heading"
          style={{
            ...rise(cap, 2.5),
            fontSize: 'calc(var(--su) * 3.1)',
            color: 'rgba(253,252,251,0.92)',
            marginTop: 'calc(var(--su) * 4)',
            letterSpacing: '-0.02em',
          }}
        >
          Fra nå skjer alt av seg selv.
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   AKT 3 — ANNONSERING (12–24.5s)  Annonsen bygger seg selv → FINN
===================================================================== */
export function SceneAnnonse({ t }) {
  const o = fadeInOut(t, 12, 24.5);
  const h1 = easeOutCubic(seg(t, 12.6, 13.4));
  const h2 = easeOutCubic(seg(t, 13.2, 14.0));
  const cardIn = easeOutCubic(seg(t, 13.0, 13.9));
  const photoP = easeInOutCubic(seg(t, 13.7, 14.8));
  const titleP = seg(t, 14.9, 16.7);
  const aiTag = easeOutCubic(seg(t, 17.0, 17.6));
  const descP = seg(t, 17.4, 19.9);
  const priceIn = easeOutCubic(seg(t, 19.9, 20.5));
  const stampP = seg(t, 21.0, 21.7);
  const capIn = easeOutCubic(seg(t, 22.2, 23.0));

  const title = 'Lys 3-roms med utsikt — Møhlenpris';
  const desc = 'Velkommen til en gjennomgående lys 3-roms med stor balkong og panoramautsikt over Puddefjorden. Nyoppusset kjøkken, gangavstand til sentrum.';
  const chips = ['74 m²', '2 soverom', 'Balkong'];

  return (
    <div className="absolute inset-0" style={{ opacity: o }}>
      {/* left headline */}
      <div style={{ position: 'absolute', left: '7%', top: '50%', transform: 'translateY(-50%)', width: '34%' }}>
        <h2 className="font-heading font-bold" style={{ ...rise(h1), fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.02 }}>
          Annonsen?
        </h2>
        <p className="font-body" style={{ ...rise(h2), fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)', lineHeight: 1.4 }}>
          Skrives og publiseres automatisk.
        </p>
        <div className="font-body" style={{ ...rise(capIn, 2), marginTop: 'calc(var(--su) * 3)', display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)' }}>
          <span style={{ width: 'calc(var(--su) * 0.8)', height: 'calc(var(--su) * 0.8)', borderRadius: '50%', background: '#CF97FC', display: 'inline-block' }} />
          <span style={{ fontSize: 'calc(var(--su) * 1.6)', color: 'rgba(207,151,252,0.9)', letterSpacing: '0.08em' }}>
            Proffe bilder · AI-tekst · riktig pris
          </span>
        </div>
      </div>
      {/* listing card */}
      <div
        style={{
          position: 'absolute', right: '7%', top: '50%', width: '42%',
          transform: `translateY(-50%) translateY(calc(var(--su) * ${((1 - cardIn) * 4).toFixed(2)})) scale(${(0.96 + cardIn * 0.04).toFixed(3)})`,
          opacity: cardIn,
          background: '#131316', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 'calc(var(--su) * 1.8)', overflow: 'visible',
          boxShadow: '0 calc(var(--su)*2.4) calc(var(--su)*7) rgba(0,0,0,0.55)',
        }}
      >
        <div style={{ borderRadius: 'calc(var(--su) * 1.8)', overflow: 'hidden' }}>
          {/* photo */}
          <div style={{ height: 'calc(var(--su) * 18)', overflow: 'hidden', position: 'relative', background: '#1b1b1f' }}>
            <img
              src="/interior-living.webp"
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                clipPath: `inset(0 ${((1 - photoP) * 100).toFixed(2)}% 0 0)`,
                transform: `scale(${(1.08 - photoP * 0.08).toFixed(3)})`,
              }}
            />
            <div style={{ position: 'absolute', left: 'calc(var(--su)*1.2)', bottom: 'calc(var(--su)*1.2)', opacity: photoP, display: 'flex', gap: 'calc(var(--su)*0.6)' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 'calc(var(--su)*2.6)', height: 'calc(var(--su)*0.45)', borderRadius: 99, background: i === 0 ? '#FDFCFB' : 'rgba(253,252,251,0.35)' }} />
              ))}
            </div>
            <span
              className="font-body"
              style={{
                ...pop(aiTag),
                position: 'absolute', bottom: 'calc(var(--su) * 1.1)', right: 'calc(var(--su) * 1.1)',
                fontSize: 'calc(var(--su) * 1.2)', letterSpacing: '0.06em',
                color: '#0A0A0A', background: 'linear-gradient(120deg, #CF97FC, #b07ce0)',
                borderRadius: 999, padding: 'calc(var(--su) * 0.4) calc(var(--su) * 1.1)',
                fontWeight: 500,
              }}
            >
              ✦ Skrevet av DigiHome AI
            </span>
          </div>
          {/* body */}
          <div style={{ padding: 'calc(var(--su) * 2.2)' }}>
            <div className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 2.5)', color: '#FDFCFB', minHeight: 'calc(var(--su) * 3.2)', lineHeight: 1.15 }}>
              {typed(title, titleP)}
              {titleP > 0 && titleP < 1 ? <Caret /> : null}
            </div>
            <div style={{ display: 'flex', gap: 'calc(var(--su) * 1)', marginTop: 'calc(var(--su) * 1.3)' }}>
              {chips.map((c, i) => {
                const p = easeOutBack(seg(t, 16.8 + i * 0.3, 17.4 + i * 0.3));
                return (
                  <span
                    key={c}
                    className="font-body"
                    style={{
                      opacity: clamp01(p * 2), transform: `scale(${Math.max(0.6, p).toFixed(3)})`,
                      fontSize: 'calc(var(--su) * 1.45)', color: 'rgba(253,252,251,0.75)',
                      border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999,
                      padding: 'calc(var(--su) * 0.45) calc(var(--su) * 1.2)',
                    }}
                  >
                    {c}
                  </span>
                );
              })}
            </div>
            <div style={{ position: 'relative', marginTop: 'calc(var(--su) * 1.6)' }}>
              <p className="font-body" style={{ fontSize: 'calc(var(--su) * 1.55)', color: 'rgba(253,252,251,0.55)', lineHeight: 1.55, minHeight: 'calc(var(--su) * 7)' }}>
                {typed(desc, descP)}
                {descP > 0 && descP < 1 ? <Caret /> : null}
              </p>
            </div>
            <div style={{ ...rise(priceIn, 2), display: 'flex', alignItems: 'baseline', gap: 'calc(var(--su) * 0.8)', marginTop: 'calc(var(--su) * 1.4)' }}>
              <span className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 3)', color: '#FDFCFB' }}>24 800 kr</span>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.5)', color: 'rgba(253,252,251,0.5)' }}>/mnd</span>
            </div>
          </div>
        </div>
        {/* FINN stamp */}
        <div
          style={{
            position: 'absolute', top: 'calc(var(--su) * -2.4)', right: 'calc(var(--su) * -2.4)',
            opacity: clamp01(stampP * 2),
            transform: `rotate(-7deg) scale(${Math.max(0.4, easeOutBack(stampP)).toFixed(3)})`,
            background: '#FDFCFB', borderRadius: 999,
            padding: 'calc(var(--su) * 0.9) calc(var(--su) * 1.6)',
            display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)',
            boxShadow: '0 calc(var(--su)*1) calc(var(--su)*3.5) rgba(0,0,0,0.5)',
          }}
        >
          <img src="/finn-logo.png" alt="FINN" style={{ height: 'calc(var(--su) * 2.4)', width: 'auto', borderRadius: 'calc(var(--su)*0.4)' }} />
          <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.6)', fontWeight: 500, color: '#0A0A0A' }}>Publisert</span>
          <span style={{ color: '#16a34a', fontSize: 'calc(var(--su) * 1.8)', fontWeight: 700 }}>✓</span>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   AKT 4 — VISNING + SCREENING (24–36.5s)
===================================================================== */
const RADAR_LABELS = ['Kreditt', 'Inntekt', 'Referanser', 'Historikk', 'Stabilitet'];
const RADAR_VALUES = [0.92, 0.84, 0.95, 0.78, 0.88];

function radarPoint(cx, cy, r, i, n = 5) {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
}

export function SceneVisning({ t }) {
  const o = fadeInOut(t, 24, 36.5);
  const partA = Math.min(1, 1 - seg(t, 29.7, 30.3));
  const partB = seg(t, 30.3, 30.9);

  /* — Part A: visninger — */
  const hA1 = easeOutCubic(seg(t, 24.5, 25.3));
  const hA2 = easeOutCubic(seg(t, 25.0, 25.8));
  const calIn = easeOutCubic(seg(t, 25.2, 26.0));
  const bookings = [
    { d: 'Tir', tm: '17:00', n: 'Emma N.', at: 26.0 },
    { d: 'Ons', tm: '17:30', n: 'Jonas B.', at: 26.8 },
    { d: 'Tor', tm: '18:00', n: 'Sofie H.', at: 27.6 },
  ];
  const fullCap = easeOutCubic(seg(t, 28.5, 29.3));

  /* — Part B: radar — */
  const ringsIn = easeOutCubic(seg(t, 30.7, 31.5));
  const hB1 = easeOutCubic(seg(t, 30.4, 31.2));
  const hB2 = easeOutCubic(seg(t, 30.9, 31.7));
  const badge = seg(t, 34.3, 35.0);
  const cx = 100, cy = 102, R = 74;

  return (
    <div className="absolute inset-0" style={{ opacity: o }}>
      {/* ---------- PART A ---------- */}
      {partA > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: partA }}>
          <div style={{ position: 'absolute', left: '7%', top: '50%', transform: 'translateY(-50%)', width: '34%' }}>
            <h2 className="font-heading font-bold" style={{ ...rise(hA1), fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.02 }}>
              Visninger?
            </h2>
            <p className="font-body" style={{ ...rise(hA2), fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)' }}>
              Booker seg selv.
            </p>
          </div>
          <div
            style={{
              position: 'absolute', right: '8%', top: '50%', width: '40%',
              transform: `translateY(-50%) translateY(calc(var(--su) * ${((1 - calIn) * 4).toFixed(2)}))`,
              opacity: calIn,
              background: '#131316', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 'calc(var(--su) * 1.8)', padding: 'calc(var(--su) * 2.4)',
              boxShadow: '0 calc(var(--su)*2.4) calc(var(--su)*7) rgba(0,0,0,0.55)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'calc(var(--su) * 1.8)' }}>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.85)', fontWeight: 500 }}>
                Visningskalender · Uke 47
              </span>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.15)', letterSpacing: '0.18em', color: '#CF97FC', border: '1px solid rgba(207,151,252,0.45)', borderRadius: 999, padding: 'calc(var(--su)*0.35) calc(var(--su)*1)' }}>
                AUTO
              </span>
            </div>
            {bookings.map((b) => {
              const p = easeOutCubic(seg(t, b.at, b.at + 0.7));
              const chk = easeOutBack(seg(t, b.at + 0.45, b.at + 0.95));
              return (
                <div
                  key={b.n}
                  style={{
                    ...rise(p, 2),
                    display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1.4)',
                    background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 'calc(var(--su) * 1.1)',
                    padding: 'calc(var(--su) * 1.2) calc(var(--su) * 1.5)',
                    marginBottom: 'calc(var(--su) * 1)',
                  }}
                >
                  <div style={{ textAlign: 'center', minWidth: 'calc(var(--su) * 5)' }}>
                    <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.2)', color: 'rgba(253,252,251,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{b.d}</div>
                    <div className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 1.9)', color: '#FDFCFB' }}>{b.tm}</div>
                  </div>
                  <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                  <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.85)', flex: 1 }}>{b.n}</span>
                  <span
                    className="font-body"
                    style={{
                      opacity: clamp01(chk * 2), transform: `scale(${Math.max(0.4, chk).toFixed(3)})`,
                      fontSize: 'calc(var(--su) * 1.35)', color: '#7ee2a8',
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
                      borderRadius: 999, padding: 'calc(var(--su)*0.4) calc(var(--su)*1.1)',
                    }}
                  >
                    Bekreftet ✓
                  </span>
                </div>
              );
            })}
            <div className="font-body" style={{ ...rise(fullCap, 1.5), fontSize: 'calc(var(--su) * 1.5)', color: 'rgba(207,151,252,0.9)', marginTop: 'calc(var(--su) * 1.4)', textAlign: 'center' }}>
              Fullbooket — uten at du løftet en finger.
            </div>
          </div>
        </div>
      )}
      {/* ---------- PART B ---------- */}
      {partB > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: partB }}>
          <div style={{ position: 'absolute', left: '7%', top: '50%', transform: 'translateY(-50%)', width: '34%' }}>
            <h2 className="font-heading font-bold" style={{ ...rise(hB1), fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.02 }}>
              Leietakere?
            </h2>
            <p className="font-body" style={{ ...rise(hB2), fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)' }}>
              Screenes automatisk — kreditt, inntekt og referanser.
            </p>
          </div>
          <div style={{ position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)', width: '46%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 200 200" style={{ width: 'calc(var(--su) * 42)', height: 'calc(var(--su) * 42)', overflow: 'visible' }}>
              {/* rings */}
              {[0.33, 0.66, 1].map((s, ri) => (
                <polygon
                  key={ri}
                  points={RADAR_LABELS.map((_, i) => radarPoint(cx, cy, R * s, i).join(',')).join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.13)"
                  strokeWidth="0.7"
                  style={{ opacity: ringsIn }}
                />
              ))}
              {/* axes */}
              {RADAR_LABELS.map((_, i) => {
                const [x, y] = radarPoint(cx, cy, R, i);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" style={{ opacity: ringsIn }} />;
              })}
              {/* value polygon */}
              {(() => {
                const pts = RADAR_LABELS.map((_, i) => {
                  const v = RADAR_VALUES[i] * easeOutCubic(seg(t, 31.9 + i * 0.16, 33.3 + i * 0.16));
                  return radarPoint(cx, cy, R * v, i);
                });
                const ptsStr = pts.map((p) => p.join(',')).join(' ');
                return (
                  <g>
                    <polygon points={ptsStr} fill="rgba(207,151,252,0.16)" stroke="#CF97FC" strokeWidth="1.6" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(207,151,252,0.65))' }} />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill="#CF97FC" style={{ opacity: seg(t, 32.2 + i * 0.16, 32.8 + i * 0.16) }} />
                    ))}
                  </g>
                );
              })()}
              {/* labels */}
              {RADAR_LABELS.map((lb, i) => {
                const [x, y] = radarPoint(cx, cy, R + 16, i);
                const lit = seg(t, 33.4, 34.0);
                const op = easeOutCubic(seg(t, 31.3 + i * 0.18, 31.9 + i * 0.18));
                return (
                  <text
                    key={lb}
                    x={x}
                    y={y + 2.5}
                    textAnchor="middle"
                    style={{
                      fontSize: 7.5,
                      letterSpacing: '0.12em',
                      fontFamily: 'var(--font-body)',
                      fill: lit > 0.5 ? '#CF97FC' : 'rgba(253,252,251,0.6)',
                      opacity: op,
                      textTransform: 'uppercase',
                    }}
                  >
                    {lb.toUpperCase()}
                  </text>
                );
              })}
            </svg>
            <div
              className="font-body"
              style={{
                opacity: clamp01(badge * 2),
                transform: `scale(${Math.max(0.4, easeOutBack(badge)).toFixed(3)})`,
                marginTop: 'calc(var(--su) * 0.5)',
                fontSize: 'calc(var(--su) * 1.7)', letterSpacing: '0.22em', fontWeight: 500,
                color: '#0A0A0A', background: 'linear-gradient(120deg, #CF97FC, #a777e3)',
                borderRadius: 999, padding: 'calc(var(--su) * 1) calc(var(--su) * 2.6)',
                boxShadow: '0 0 calc(var(--su)*3.5) rgba(207,151,252,0.45)',
              }}
            >
              KANDIDAT GODKJENT ✓
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   AKT 5 — KONTRAKT + HUSLEIE (36–46.5s)
===================================================================== */
export function SceneKontrakt({ t }) {
  const o = fadeInOut(t, 36, 46.5);
  const partA = Math.min(1, 1 - seg(t, 40.9, 41.5));
  const partB = seg(t, 41.5, 42.1);

  const hA1 = easeOutCubic(seg(t, 36.5, 37.3));
  const hA2 = easeOutCubic(seg(t, 37.0, 37.8));
  const docIn = easeOutCubic(seg(t, 37.2, 38.0));
  const sigP = easeInOutCubic(seg(t, 38.3, 39.8));
  const bankP = seg(t, 39.9, 40.6);

  const hB1 = easeOutCubic(seg(t, 41.6, 42.4));
  const hB2 = easeOutCubic(seg(t, 42.0, 42.8));
  const countP = easeOutExpo(seg(t, 42.6, 45.0));
  const txnIn = easeOutCubic(seg(t, 44.9, 45.6));
  const amount = 24800 * countP;

  return (
    <div className="absolute inset-0" style={{ opacity: o }}>
      {/* ---------- PART A: kontrakt ---------- */}
      {partA > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: partA }}>
          <div style={{ position: 'absolute', left: '7%', top: '50%', transform: 'translateY(-50%)', width: '34%' }}>
            <h2 className="font-heading font-bold" style={{ ...rise(hA1), fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.02 }}>
              Kontrakten?
            </h2>
            <p className="font-body" style={{ ...rise(hA2), fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)' }}>
              Signeres digitalt — med BankID.
            </p>
          </div>
          {/* paper doc */}
          <div
            style={{
              position: 'absolute', right: '10%', top: '50%', width: '34%',
              transform: `translateY(-50%) translateY(calc(var(--su) * ${((1 - docIn) * 4).toFixed(2)})) rotate(${((1 - docIn) * 2).toFixed(2)}deg)`,
              opacity: docIn,
              background: '#FBFAF7', borderRadius: 'calc(var(--su) * 1.2)',
              padding: 'calc(var(--su) * 2.8)',
              boxShadow: '0 calc(var(--su)*2.4) calc(var(--su)*7) rgba(0,0,0,0.6)',
            }}
          >
            <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.3)', letterSpacing: '0.3em', color: 'rgba(10,10,10,0.55)', marginBottom: 'calc(var(--su) * 1.8)' }}>
              LEIEKONTRAKT
            </div>
            {[100, 92, 97, 84, 90].map((w, i) => {
              const p = easeOutCubic(seg(t, 37.4 + i * 0.18, 38.0 + i * 0.18));
              return (
                <div
                  key={i}
                  style={{
                    height: 'calc(var(--su) * 0.7)', borderRadius: 99,
                    background: 'rgba(10,10,10,0.12)',
                    width: `${w * p}%`,
                    marginBottom: 'calc(var(--su) * 1.1)',
                  }}
                />
              );
            })}
            {/* signature */}
            <div style={{ marginTop: 'calc(var(--su) * 2.4)', borderTop: '1px solid rgba(10,10,10,0.2)', paddingTop: 'calc(var(--su) * 1)', position: 'relative' }}>
              <svg viewBox="0 0 160 44" style={{ width: 'calc(var(--su) * 16)', height: 'calc(var(--su) * 4.6)', position: 'absolute', top: 'calc(var(--su) * -3.4)', left: 'calc(var(--su) * 1)' }}>
                <path
                  d="M6,32 C10,12 18,6 20,16 C22,26 16,34 24,30 C30,27 30,14 36,16 C42,18 38,32 46,28 C52,25 52,16 58,17 C64,18 62,30 70,27 C80,23 84,10 92,14 C98,17 94,30 104,27 C114,24 118,14 128,18 C136,21 138,28 152,24"
                  fill="none"
                  stroke="#2638c4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - sigP}
                />
              </svg>
              <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.2)', color: 'rgba(10,10,10,0.5)' }}>Leietaker — Emma Nordvik</div>
            </div>
            {/* BankID badge */}
            <div
              style={{
                position: 'absolute', bottom: 'calc(var(--su) * -2)', right: 'calc(var(--su) * -2.4)',
                opacity: clamp01(bankP * 2),
                transform: `rotate(-4deg) scale(${Math.max(0.4, easeOutBack(bankP)).toFixed(3)})`,
                background: '#FDFCFB', border: '1px solid rgba(10,10,10,0.08)', borderRadius: 999,
                padding: 'calc(var(--su) * 0.8) calc(var(--su) * 1.5)',
                display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
                boxShadow: '0 calc(var(--su)*1) calc(var(--su)*3.5) rgba(0,0,0,0.45)',
              }}
            >
              <img src="/bankid-logo.png" alt="BankID" style={{ height: 'calc(var(--su) * 2.2)', width: 'auto', borderRadius: 'calc(var(--su)*0.4)' }} />
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.5)', fontWeight: 500, color: '#0A0A0A' }}>Signert med BankID</span>
              <span style={{ color: '#16a34a', fontSize: 'calc(var(--su) * 1.7)', fontWeight: 700 }}>✓</span>
            </div>
          </div>
        </div>
      )}
      {/* ---------- PART B: husleie ---------- */}
      {partB > 0.01 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: partB }}>
          <h2 className="font-heading font-bold" style={{ ...rise(hB1), fontSize: 'calc(var(--su) * 5.4)', color: '#FDFCFB', lineHeight: 1.05 }}>
            Og husleien?
          </h2>
          <p className="font-body" style={{ ...rise(hB2), fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1)' }}>
            Den bare kommer.
          </p>
          <div style={{ marginTop: 'calc(var(--su) * 3.4)', textAlign: 'center' }}>
            <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.3)', letterSpacing: '0.35em', color: 'rgba(207,151,252,0.85)', marginBottom: 'calc(var(--su) * 1)' }}>
              HUSLEIE · NOVEMBER
            </div>
            <div className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 9.5)', color: '#FDFCFB', lineHeight: 1, fontVariantNumeric: 'tabular-nums', opacity: countP > 0 ? 1 : 0 }}>
              {fmtNOK(amount)} kr
            </div>
          </div>
          <div
            style={{
              ...rise(txnIn, 2),
              marginTop: 'calc(var(--su) * 3.2)',
              display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1.4)',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999, padding: 'calc(var(--su) * 1.1) calc(var(--su) * 2.4)',
            }}
          >
            <img src="/digihome-mark.svg" alt="" style={{ height: 'calc(var(--su) * 2.2)', width: 'auto' }} />
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.8)' }}>DigiHome → Din konto</span>
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.4)', color: '#7ee2a8', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 999, padding: 'calc(var(--su)*0.4) calc(var(--su)*1.1)' }}>
              Utbetalt ✓
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   AKT 6 — FINALE (46–60s)
===================================================================== */
const FINAL_CHIPS = ['Annonse publisert', 'Visninger booket', 'Leietaker screenet', 'Kontrakt signert', 'Husleie utbetalt'];

export function SceneFinale({ t }) {
  const o = fadeInOut(t, 46, 60, 0.5, 0);
  const chipsOut = seg(t, 50.7, 51.5);
  const txt = Math.min(easeOutCubic(seg(t, 51.5, 52.3)), 1 - seg(t, 54.5, 55.3));
  const logoIn = easeOutCubic(seg(t, 55.5, 56.5));
  const tagIn = easeOutCubic(seg(t, 56.1, 57.1));
  const urlIn = easeOutCubic(seg(t, 56.9, 57.7));

  return (
    <div className="absolute inset-0" style={{ opacity: o }}>
      {/* chips */}
      {chipsOut < 1 && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 1 - chipsOut, transform: `translateY(calc(var(--su) * ${(-chipsOut * 3).toFixed(2)}))` }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'calc(var(--su) * 1.6)', maxWidth: '64%' }}>
            {FINAL_CHIPS.map((c, i) => {
              const p = seg(t, 46.7 + i * 0.5, 47.4 + i * 0.5);
              return (
                <span
                  key={c}
                  className="font-body"
                  style={{
                    opacity: clamp01(p * 2),
                    transform: `scale(${Math.max(0.5, easeOutBack(p)).toFixed(3)}) translateY(calc(var(--su) * ${((1 - easeOutCubic(p)) * 2).toFixed(2)}))`,
                    fontSize: 'calc(var(--su) * 2)', color: 'rgba(253,252,251,0.9)',
                    border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)',
                    borderRadius: 999, padding: 'calc(var(--su) * 1.1) calc(var(--su) * 2.2)',
                    display: 'inline-flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
                  }}
                >
                  <span style={{ color: '#CF97FC', fontWeight: 700 }}>✓</span> {c}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {/* trygt. automatisk. */}
      {txt > 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={rise(txt, 2)}>
          <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 8)', color: '#FDFCFB', letterSpacing: '-0.03em' }}>
            Trygt. Automatisk.
          </h2>
        </div>
      )}
      {/* logo finale */}
      {logoIn > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: logoIn * 0.4 }}>
            <Orb size="calc(var(--su) * 46)" speed={18} />
          </div>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(5,5,6,0) 26%, rgba(5,5,6,0.82) 70%)' }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src="/digihome-wordmark-white.svg"
              alt="DigiHome"
              style={{ width: 'calc(var(--su) * 30)', height: 'auto', ...rise(logoIn, 2.5), opacity: logoIn }}
            />
            <div className="font-heading" style={{ ...rise(tagIn, 2), fontSize: 'calc(var(--su) * 2.7)', color: 'rgba(253,252,251,0.85)', marginTop: 'calc(var(--su) * 2.6)' }}>
              Utleie på autopilot.
            </div>
            <div className="font-body" style={{ ...rise(urlIn, 1.5), fontSize: 'calc(var(--su) * 1.5)', letterSpacing: '0.4em', color: 'rgba(253,252,251,0.4)', marginTop: 'calc(var(--su) * 2)', textIndent: '0.4em' }}>
              DIGIHOME.NO
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
