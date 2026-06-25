'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText, Check, ShieldCheck, Users, Send, Landmark, KeyRound, Lock,
  ScanLine, BadgeCheck, Play, Pause, Download, Maximize2,
} from 'lucide-react';
import { scheduleKeyholeMusic, renderKeyholeWav } from './keyholeAudio';

/* =====================================================================
   DigiHome × Keyhole — integrasjonsfilm
   Deterministisk: ALT animeres som ren funksjon av tid (t), aldri via
   CSS-transitions/animasjoner. Det gjør frame-for-frame MP4-render mulig
   (window.__setTime(t) → eksakt samme bilde hver gang).
===================================================================== */

const DURATION = 53.5;

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/* progress av t i [a,b], eased */
const seg = (t, a, b, ease = easeInOut) => ease(clamp01((t - a) / (b - a)));
/* deterministisk pseudo-tilfeldig (0..1) */
const rnd = (i) => { const x = Math.sin(i * 127.1 + 13.37) * 43758.5453; return x - Math.floor(x); };

const DH = '#a052e0';      // DigiHome lilla
const DH_GLOW = '#d298ff';
const KH = '#fe8d94';      // Keyhole rosa (brukerens merkefarge)
const INK = '#ffffff';
const MUT = 'rgba(255,255,255,0.52)';
const HAIR = 'rgba(255,255,255,0.10)';
const SURF = 'rgba(255,255,255,0.045)';
const FH = { fontFamily: 'var(--font-heading), var(--font-body), system-ui, sans-serif' };
const FB = { fontFamily: 'var(--font-body), system-ui, sans-serif' };

/* scener (overlapper 0.5s for kryssfade) */
const SCENES = [
  { start: 0,    end: 8.2,  sys: 'both' },  // 0 intro
  { start: 7.7,  end: 16.2, sys: 'dh'   },  // 1 annonse → FINN
  { start: 15.7, end: 23.2, sys: 'dh'   },  // 2 søkere
  { start: 22.7, end: 33.2, sys: 'kh'   },  // 3 screening (Keyhole)
  { start: 32.7, end: 41.2, sys: 'dh'   },  // 4 kontrakt
  { start: 40.7, end: 50.0, sys: 'kh'   },  // 5 depositum (Keyhole)
  { start: 49.5, end: 53.5, sys: 'both' },  // 6 outro
];

/* fremdriftsskinne (5 steg) */
const STEPS = [
  { label: 'Annonse',    sys: 'dh', at: 7.7 },
  { label: 'Søknader',   sys: 'dh', at: 15.7 },
  { label: 'Kredittsjekk', sys: 'kh', at: 22.7 },
  { label: 'Kontrakt',   sys: 'dh', at: 32.7 },
  { label: 'Depositum',  sys: 'kh', at: 40.7 },
];

const sysColor = (s) => (s === 'kh' ? KH : DH);

/* ---------- dekorative lag (deterministiske) ---------- */
const ORBS = [
  { x: 15, y: 24, r: 240, sp: 0.13, ph: 0.0, o: 0.11 },
  { x: 84, y: 20, r: 190, sp: 0.10, ph: 1.7, o: 0.09 },
  { x: 74, y: 76, r: 300, sp: 0.08, ph: 3.1, o: 0.10 },
  { x: 24, y: 80, r: 210, sp: 0.11, ph: 4.6, o: 0.08 },
  { x: 52, y: 48, r: 360, sp: 0.06, ph: 2.2, o: 0.05 },
];
function Backdrop({ t, accent }) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.9);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#08080b' }}>
      {/* dybde-orbs (mykt drivende) */}
      {ORBS.map((o, i) => {
        const dx = Math.sin(t * o.sp + o.ph) * 3.0;
        const dy = Math.cos(t * o.sp * 0.8 + o.ph) * 2.4;
        return (
          <div key={i} className="absolute" style={{
            left: `${o.x + dx}%`, top: `${o.y + dy}%`, width: o.r, height: o.r,
            marginLeft: -o.r / 2, marginTop: -o.r / 2, borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}, transparent 70%)`,
            opacity: o.o * (0.7 + pulse * 0.3), filter: 'blur(16px)',
          }} />
        );
      })}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(60% 65% at 50% 34%, ${accent}22, transparent 68%)`,
        opacity: 0.85 + pulse * 0.15,
      }} />
      <div className="absolute inset-0" style={{
        background: `radial-gradient(42% 52% at ${18 + pulse * 6}% 88%, ${accent}18, transparent 60%)`,
      }} />
      {/* fint punktrutenett */}
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(${accent}14 1.3px, transparent 1.3px)`,
        backgroundSize: '46px 46px',
        WebkitMaskImage: 'radial-gradient(75% 70% at 50% 42%, #000 12%, transparent 82%)',
        maskImage: 'radial-gradient(75% 70% at 50% 42%, #000 12%, transparent 82%)',
        opacity: 0.5,
      }} />
      {/* vignett */}
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 320px 80px rgba(0,0,0,0.7)' }} />
    </div>
  );
}

/* diagonal lys-sveip over et kort (én gang ved entré) */
function Sheen({ p, radius = 24 }) {
  if (p <= 0.02 || p >= 0.98) return null;
  const x = -40 + p * 180;
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -20, bottom: -20, width: '42%', left: `${x}%`, background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.12), transparent)', transform: 'skewX(-16deg)' }} />
    </div>
  );
}

/* sirkulær logo-brikke med farget ring */
function Mark({ src, color, size = 76, pad = 16 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'rgba(16,14,22,0.9)', border: `2px solid ${color}`, boxShadow: `0 0 30px -4px ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: pad }}>
      <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </div>
  );
}

/* «sikker overføring»-overlegg mellom systemene (forteller integrasjonen) */
function HandoffBeam({ t, start, end, toKH, label }) {
  const op = clamp01(Math.min((t - start) / 0.35, (end - t) / 0.45));
  if (op <= 0) return null;
  const p = clamp01((t - start) / (end - start));
  const travel = easeInOut(p);
  const src = toKH ? DH : KH;
  const dst = toKH ? KH : DH;
  const leftSrc = toKH ? '/digihome-mark.svg' : '/keyhole-mark.png';
  const rightSrc = toKH ? '/keyhole-mark.png' : '/digihome-mark.svg';
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: op, zIndex: 30, pointerEvents: 'none' }}>
      {/* scrim som maskerer scenene under, så overgangen blir et rent beat */}
      <div className="absolute inset-0" style={{ background: 'rgba(6,5,9,0.95)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        <span style={{ ...FB, color: dst, fontSize: 16, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', width: 620 }}>
          <Mark src={leftSrc} color={src} />
          <div style={{ position: 'relative', flex: 1, height: 2, margin: '0 20px', background: `linear-gradient(90deg, ${src}, ${dst})`, opacity: 0.55 }}>
            <span style={{ position: 'absolute', top: '50%', left: `${travel * 100}%`, width: 14, height: 14, marginTop: -7, marginLeft: -7, borderRadius: '50%', background: dst, boxShadow: `0 0 18px 4px ${dst}` }} />
          </div>
          <Mark src={rightSrc} color={dst} />
        </div>
      </div>
    </div>
  );
}

function Grain({ t }) {
  // subtil filmkorn-bevegelse (deterministisk via translate)
  const x = (Math.sin(t * 37.1) * 50) | 0;
  const y = (Math.cos(t * 29.7) * 50) | 0;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      opacity: 0.05, mixBlendMode: 'overlay', transform: `translate(${x}px,${y}px)`,
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    }} />
  );
}

/* ---------- gjenbrukbare bygg ---------- */
function Caption({ step, title, sub, accent, p }) {
  // p = 0..1 entrance
  const rise = (1 - easeOut(p)) * 26;
  return (
    <div className="text-center" style={{ opacity: clamp01(p * 1.4) }}>
      {step != null && (
        <div className="inline-flex items-center gap-2.5 mb-5" style={{ transform: `translateY(${rise * 0.6}px)` }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: accent, boxShadow: `0 0 14px ${accent}` }} />
          <span className="uppercase" style={{ ...FB, color: accent, fontWeight: 700, fontSize: 15, letterSpacing: '0.32em' }}>{step}</span>
        </div>
      )}
      <h2 style={{ ...FH, color: INK, fontWeight: 700, fontSize: 60, lineHeight: 1.04, letterSpacing: '-0.025em', transform: `translateY(${rise}px)` }}>
        {title}
      </h2>
      {sub && (
        <p style={{ ...FB, color: MUT, fontWeight: 400, fontSize: 23, lineHeight: 1.45, marginTop: 18, transform: `translateY(${rise * 1.2}px)`, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Panel({ children, style, accent, sheenP }) {
  const radius = (style && style.borderRadius) || 24;
  return (
    <div style={{
      position: 'relative',
      background: 'rgba(20,18,26,0.66)',
      border: `1px solid ${HAIR}`,
      borderRadius: 24,
      boxShadow: `0 40px 120px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.05)`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      ...style,
    }}>
      {children}
      {sheenP != null && <Sheen p={sheenP} radius={radius} />}
    </div>
  );
}

/* ================= SCENE 0 — INTRO (rolig, profesjonell keynote) ================= */
/* Få, store, ekstremt subtile lyspartikler som driver sakte — dybde og ro,
   ikke sci-fi. Ingen konvergering/eksplosjon. */
function IntroMotes({ lt }) {
  const motes = [
    { x: -380, y: -160, s: 4,   ph: 0.0, c: DH_GLOW },
    { x: 400,  y: -130, s: 3,   ph: 1.4, c: KH },
    { x: -320, y: 180,  s: 3,   ph: 2.6, c: KH },
    { x: 350,  y: 200,  s: 4,   ph: 3.7, c: DH_GLOW },
    { x: -150, y: -230, s: 2.5, ph: 4.8, c: DH_GLOW },
    { x: 180,  y: 230,  s: 2.5, ph: 5.6, c: KH },
  ];
  const appear = clamp01((lt - 0.3) / 1.6);
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: 0, height: 0 }}>
        {motes.map((m, i) => {
          const dx = Math.sin(lt * 0.30 + m.ph) * 14;
          const dy = Math.cos(lt * 0.24 + m.ph) * 11;
          const tw = 0.55 + 0.45 * Math.sin(lt * 0.7 + m.ph);
          return (
            <span key={i} style={{
              position: 'absolute', left: m.x + dx, top: m.y + dy,
              width: m.s, height: m.s, marginLeft: -m.s / 2, marginTop: -m.s / 2,
              borderRadius: '50%', background: m.c,
              opacity: appear * 0.42 * tw, boxShadow: `0 0 12px ${m.c}`,
            }} />
          );
        })}
      </div>
    </div>
  );
}

function SceneIntro({ lt, dur }) {
  const glow    = seg(lt, 0.0, 1.4);                          // mykt sentralt lys puster frem
  const logosIn = seg(lt, 0.6, 2.0);                          // logoer toner rolig inn
  const meet    = clamp01(1 - Math.abs(lt - 2.2) / 0.9);      // mykt «møte»-aksent (glød)
  const sweep   = seg(lt, 2.0, 3.3);                          // ett elegant lyssveip over lockup
  const xP      = seg(lt, 2.2, 2.9);                          // × kobles rolig inn
  const underline = seg(lt, 4.6, 5.8);
  const subP    = seg(lt, 5.0, 6.2);
  const out     = seg(lt, dur - 1.0, dur);

  const rise = (1 - easeOut(logosIn)) * 16;                   // logoer stiger mykt på plass
  const logoBlur = (1 - logosIn) * 6;

  const line1 = ['Utleie', 'og', 'trygghet,'];
  const line2 = ['i', 'ett', 'system.'];
  const wordStyle = (idx) => {
    const p = seg(lt, 3.45 + idx * 0.12, 4.2 + idx * 0.12);
    return { display: 'inline-block', opacity: p, filter: `blur(${(1 - p) * 8}px)`, transform: `translateY(${(1 - easeOut(p)) * 24}px)` };
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 1 - out }}>
      {/* mykt sentralt lys (dybde, ikke eksplosjon) */}
      <div style={{ position: 'absolute', width: 1100, height: 1100, borderRadius: '50%', background: `radial-gradient(circle, ${DH}1f, transparent 62%)`, opacity: glow * (0.85 + meet * 0.45), transform: `scale(${0.9 + glow * 0.1 + meet * 0.04})`, filter: 'blur(8px)', pointerEvents: 'none' }} />

      <IntroMotes lt={lt} />

      <div className="flex flex-col items-center" style={{ position: 'relative' }}>
        {/* lockup: DigiHome × Keyhole — rent, ingen linje */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 92, marginBottom: 56, width: 720 }}>
          {/* DigiHome (venstre) */}
          <div style={{ position: 'absolute', right: '50%', marginRight: 62, display: 'flex', alignItems: 'center', opacity: logosIn, transform: `translateY(${rise}px) scale(${0.94 + logosIn * 0.06})`, filter: `blur(${logoBlur}px)`, transformOrigin: 'right center' }}>
            <img src="/deck-logo-light.svg" alt="DigiHome" style={{ height: 58 }} />
          </div>

          {/* × kobling */}
          <span style={{ ...FH, position: 'relative', color: 'rgba(255,255,255,0.42)', fontSize: 32, fontWeight: 300, opacity: xP, transform: `scale(${0.75 + xP * 0.25})`, zIndex: 2 }}>×</span>

          {/* Keyhole (høyre) */}
          <div style={{ position: 'absolute', left: '50%', marginLeft: 62, display: 'flex', alignItems: 'center', opacity: logosIn, transform: `translateY(${rise}px) scale(${0.94 + logosIn * 0.06})`, filter: `blur(${logoBlur}px)`, transformOrigin: 'left center' }}>
            <img src="/keyhole-logo.png" alt="Keyhole" style={{ height: 52 }} />
          </div>

          {/* ett elegant lyssveip over lockup */}
          <Sheen p={sweep} radius={12} />
        </div>

        {/* overskrift — ord for ord, mykt opp */}
        <h1 className="text-center" style={{ ...FH, color: INK, fontWeight: 700, fontSize: 64, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          <span style={{ display: 'block' }}>{line1.map((w, i) => <span key={i} style={wordStyle(i)}>{w}&nbsp;</span>)}</span>
          <span style={{ display: 'block' }}>{line2.map((w, i) => <span key={i} style={wordStyle(i + 3)}>{w}&nbsp;</span>)}</span>
        </h1>

        {/* fin aksentlinje under overskrift */}
        <div style={{ marginTop: 26, height: 2, width: 200 * underline, background: `linear-gradient(90deg, ${DH_GLOW}, ${KH})`, borderRadius: 99, opacity: underline * 0.9 }} />

        <p className="text-center" style={{ ...FB, color: MUT, fontSize: 22, marginTop: 24, maxWidth: 700, lineHeight: 1.5, opacity: subP, transform: `translateY(${(1 - easeOut(subP)) * 14}px)` }}>
          DigiHome driver hele utleien. Keyhole leverer kredittsjekk og depositum — sømløst koblet sammen.
        </p>
      </div>
    </div>
  );
}

/* ================= SCENE 1 — ANNONSE → FINN ================= */
function SceneAnnonse({ lt, dur }) {
  const cap = seg(lt, 0.2, 1.2);
  const card = seg(lt, 0.9, 1.9);
  const line1 = seg(lt, 1.6, 2.4);
  const line2 = seg(lt, 2.1, 2.9);
  const imgP = seg(lt, 2.5, 3.4);
  const priceP = seg(lt, 3.2, 4.0);
  const publish = seg(lt, 4.6, 5.6);       // FINN-merket stemples
  const out = seg(lt, dur - 0.8, dur);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: 1 - out }}>
      <div style={{ marginBottom: 44 }}>
        <Caption step="Steg 1 · Annonse" title="DigiHome lager annonsen automatisk" accent={DH} p={cap} />
      </div>
      <div style={{ position: 'relative', transform: `scale(${0.95 + card * 0.05})`, opacity: card }}>
        <Panel style={{ width: 560, padding: 26 }} accent={DH} sheenP={seg(lt, 1.0, 2.5)}>
          {/* bilde */}
          <div style={{ height: 200, borderRadius: 14, overflow: 'hidden', position: 'relative', background: '#15131c' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg,#2a2440,#3a2e57)', opacity: imgP }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/bergen-harbor.webp)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: imgP * 0.9 }} />
            <div style={{ position: 'absolute', left: 14, top: 14, padding: '5px 11px', borderRadius: 8, background: 'rgba(10,8,14,0.7)', ...FB, color: '#fff', fontSize: 12.5, fontWeight: 600, opacity: imgP }}>3-roms · 72 m²</div>
          </div>
          {/* tekstlinjer */}
          <div style={{ marginTop: 20 }}>
            <div style={{ height: 17, width: `${line1 * 78}%`, background: 'rgba(255,255,255,0.82)', borderRadius: 6 }} />
            <div style={{ height: 11, width: `${line2 * 95}%`, background: 'rgba(255,255,255,0.28)', borderRadius: 5, marginTop: 12 }} />
            <div style={{ height: 11, width: `${line2 * 70}%`, background: 'rgba(255,255,255,0.22)', borderRadius: 5, marginTop: 9 }} />
          </div>
          {/* pris */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 22, opacity: priceP, transform: `translateY(${(1 - priceP) * 8}px)` }}>
            <span style={{ ...FH, color: '#fff', fontSize: 30, fontWeight: 700 }}>18 500</span>
            <span style={{ ...FB, color: MUT, fontSize: 16 }}>kr / mnd</span>
          </div>
        </Panel>
        {/* FINN publisert-badge */}
        <div style={{
          position: 'absolute', right: -28, bottom: -24,
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '13px 20px', borderRadius: 16,
          background: '#fff', boxShadow: '0 24px 60px -18px rgba(0,0,0,0.6)',
          opacity: publish, transform: `translateY(${(1 - easeOut(publish)) * 26}px) scale(${0.9 + publish * 0.1})`,
        }}>
          <img src="/finn-logo.png" alt="FINN" style={{ height: 26 }} />
          <span style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.12)' }} />
          <span style={{ ...FB, color: '#0a0a0a', fontWeight: 700, fontSize: 16 }}>Publisert</span>
          <Check size={20} color="#16a34a" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

/* ================= SCENE 2 — SØKERE ================= */
const APPLICANTS = [
  { n: 'Anna Berg', i: 'AB', m: 'Søker · 2 voksne' },
  { n: 'Jonas Lie', i: 'JL', m: 'Søker · fast jobb' },
  { n: 'Mia Sund', i: 'MS', m: 'Søker · student' },
  { n: 'Erik Holm', i: 'EH', m: 'Søker · familie' },
];
function SceneSokere({ lt, dur }) {
  const cap = seg(lt, 0.2, 1.2);
  const panel = seg(lt, 0.9, 1.8);
  const out = seg(lt, dur - 0.8, dur);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: 1 - out }}>
      <div style={{ marginBottom: 40 }}>
        <Caption step="Steg 2 · Søknader" title="Søkerne strømmer inn i DigiHome" accent={DH} p={cap} />
      </div>
      <div style={{ transform: `scale(${0.95 + panel * 0.05})`, opacity: panel }}>
        <Panel style={{ width: 560, padding: 24 }} accent={DH} sheenP={seg(lt, 1.0, 2.5)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={18} color={DH_GLOW} />
              <span style={{ ...FB, color: '#fff', fontWeight: 600, fontSize: 17 }}>Nye søknader</span>
            </div>
            <span style={{ ...FB, color: DH_GLOW, fontWeight: 700, fontSize: 15, background: `${DH}22`, padding: '4px 11px', borderRadius: 99 }}>
              {Math.round(seg(lt, 1.4, 4.2) * 12)} nye
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {APPLICANTS.map((a, idx) => {
              const ap = seg(lt, 1.6 + idx * 0.5, 2.4 + idx * 0.5);
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 15px',
                  borderRadius: 14, background: SURF, border: `1px solid ${HAIR}`,
                  opacity: ap, transform: `translateX(${(1 - easeOut(ap)) * 40}px)`,
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${DH}, #6d28d9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...FH, color: '#fff', fontWeight: 700, fontSize: 16 }}>{a.i}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...FB, color: '#fff', fontWeight: 600, fontSize: 16 }}>{a.n}</div>
                    <div style={{ ...FB, color: MUT, fontSize: 13.5, marginTop: 2 }}>{a.m}</div>
                  </div>
                  <span style={{ ...FB, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>nå</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================= SCENE 3 — SCREENING (KEYHOLE) ================= */
function SceneScreening({ lt, dur }) {
  const cap = seg(lt, 0.2, 1.2);
  const panel = seg(lt, 0.9, 1.8);
  const consent = seg(lt, 1.8, 2.6);       // samtykke-haken
  const fnr = seg(lt, 2.7, 3.7);           // FNR fylles
  const scanStart = 4.2, scanEnd = 6.6;
  const scanning = lt >= scanStart && lt < scanEnd;
  const scanP = seg(lt, scanStart, scanEnd, (x) => x);
  const result = seg(lt, 6.8, 7.9);        // godkjent-badge
  const score = Math.round(result * 742);
  const out = seg(lt, dur - 0.8, dur);
  const fnrText = '14 09 92 ' + (fnr > 0.5 ? '••• ••' : '');
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: 1 - out }}>
      <div style={{ marginBottom: 38 }}>
        <Caption step="Steg 3 · Kredittsjekk" title="Screening via Keyhole" accent={KH} p={cap} />
      </div>
      <div style={{ transform: `scale(${0.95 + panel * 0.05})`, opacity: panel, position: 'relative' }}>
        <Panel style={{ width: 580, padding: 28 }} accent={KH} sheenP={seg(lt, 1.0, 2.5)}>
          {/* Keyhole-header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${HAIR}` }}>
            <img src="/keyhole-mark.png" alt="" style={{ height: 30 }} />
            <span style={{ ...FB, color: '#fff', fontWeight: 600, fontSize: 17 }}>Keyhole kredittsjekk</span>
            <span style={{ marginLeft: 'auto', ...FB, color: KH, fontSize: 13, fontWeight: 600, background: `${KH}1f`, padding: '4px 10px', borderRadius: 99 }}>sikker</span>
          </div>

          {/* samtykke */}
          <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 2, border: `2px solid ${consent > 0.5 ? KH : 'rgba(255,255,255,0.25)'}`, background: consent > 0.5 ? KH : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {consent > 0.5 && <Check size={16} color="#1a0a0c" strokeWidth={3.4} style={{ opacity: seg(lt, 2.0, 2.5) }} />}
            </div>
            <p style={{ ...FB, color: 'rgba(255,255,255,0.74)', fontSize: 15, lineHeight: 1.5 }}>
              «Jeg samtykker til at utleier kan kjøre kredittsjekk på meg via Keyhole.»
            </p>
          </div>

          {/* FNR-felt */}
          <div style={{ marginTop: 20, opacity: seg(lt, 2.5, 3.1) }}>
            <div style={{ ...FB, color: MUT, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 8 }}>FØDSELSNUMMER (11 SIFFER)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: SURF, border: `1px solid ${fnr > 0.3 ? KH + '55' : HAIR}` }}>
              <Lock size={17} color={MUT} />
              <span style={{ ...FB, color: '#fff', fontSize: 19, letterSpacing: '0.12em', fontWeight: 500 }}>{fnrText}</span>
            </div>
          </div>

          {/* skann-overlegg */}
          {scanning && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', background: 'rgba(8,6,10,0.62)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
              <div style={{ position: 'relative', width: 84, height: 84 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 99, border: `3px solid ${KH}30` }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: 99, border: `3px solid transparent`, borderTopColor: KH, transform: `rotate(${scanP * 1080}deg)` }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScanLine size={32} color={KH} />
                </div>
              </div>
              <span style={{ ...FB, color: '#fff', fontSize: 16, fontWeight: 600 }}>Kjører kredittsjekk …</span>
              <div style={{ width: 220, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${scanP * 100}%`, background: KH }} />
              </div>
            </div>
          )}
        </Panel>

        {/* resultat-badge */}
        {result > 0 && (
          <div style={{
            position: 'absolute', left: '50%', bottom: -30,
            transform: `translate(-50%, ${(1 - easeOut(result)) * 24}px) scale(${0.9 + result * 0.1})`,
            display: 'flex', alignItems: 'center', gap: 13, padding: '14px 24px', borderRadius: 16,
            background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 22px 60px -16px rgba(22,163,74,0.6)',
            opacity: result,
          }}>
            <BadgeCheck size={24} color="#fff" strokeWidth={2.4} />
            <span style={{ ...FH, color: '#fff', fontWeight: 700, fontSize: 19 }}>Godkjent</span>
            <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.35)' }} />
            <span style={{ ...FB, color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 600 }}>Score {score}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SCENE 4 — KONTRAKT ================= */
const CLAUSES = ['§1 Partene og leieobjektet', '§2 Leietid og oppsigelse', '§3 Husleie og regulering', '§4 Depositum', '§5 Vedlikehold'];
function SceneKontrakt({ lt, dur }) {
  const cap = seg(lt, 0.2, 1.2);
  const doc = seg(lt, 0.9, 1.9);
  const bankid = seg(lt, 4.0, 5.0);        // BankID-signering
  const signed = seg(lt, 5.4, 6.4);        // Signert-stempel
  const out = seg(lt, dur - 0.8, dur);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: 1 - out }}>
      <div style={{ marginBottom: 38 }}>
        <Caption step="Steg 4 · Kontrakt" title="Husleiekontrakt genereres i DigiHome" accent={DH} p={cap} />
      </div>
      <div style={{ transform: `scale(${0.95 + doc * 0.05})`, opacity: doc, position: 'relative' }}>
        <Panel style={{ width: 520, padding: 30 }} accent={DH} sheenP={seg(lt, 1.0, 2.5)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
            <FileText size={20} color={DH_GLOW} />
            <span style={{ ...FB, color: '#fff', fontWeight: 600, fontSize: 17 }}>Leiekontrakt</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {CLAUSES.map((c, idx) => {
              const cp = seg(lt, 1.7 + idx * 0.35, 2.3 + idx * 0.35);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: cp, transform: `translateY(${(1 - cp) * 8}px)` }}>
                  <Check size={16} color={DH_GLOW} strokeWidth={3} />
                  <span style={{ ...FB, color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>{c}</span>
                </div>
              );
            })}
          </div>
          {/* BankID-rad */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${HAIR}`, display: 'flex', alignItems: 'center', gap: 12, opacity: bankid }}>
            <img src="/bankid-logo.png" alt="BankID" style={{ height: 30 }} />
            <span style={{ ...FB, color: MUT, fontSize: 15 }}>Signeres med BankID</span>
          </div>
        </Panel>
        {/* Signert-stempel */}
        {signed > 0 && (
          <div style={{
            position: 'absolute', right: -26, top: -22,
            display: 'flex', alignItems: 'center', gap: 9, padding: '12px 18px', borderRadius: 14,
            background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 20px 50px -16px rgba(22,163,74,0.6)',
            opacity: signed, transform: `rotate(-5deg) scale(${0.85 + signed * 0.15})`,
          }}>
            <Check size={20} color="#fff" strokeWidth={3.2} />
            <span style={{ ...FH, color: '#fff', fontWeight: 700, fontSize: 17 }}>Signert</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SCENE 5 — DEPOSITUM (KEYHOLE) ================= */
const DEP_STEPS = [
  { label: 'Kontrakt signert', icon: Check },
  { label: 'Leietaker invitert', icon: Send },
  { label: 'Betaling', icon: Landmark },
  { label: 'Depositum mottatt', icon: ShieldCheck },
];
function SceneDepositum({ lt, dur }) {
  const cap = seg(lt, 0.2, 1.2);
  const cards = seg(lt, 0.9, 1.8);
  const choose = seg(lt, 2.2, 3.0);        // velger depositumskonto
  const secured = seg(lt, 7.4, 8.4);       // sikret-badge
  const out = seg(lt, dur - 0.7, dur);
  const choices = [
    { key: 'konto', icon: Landmark, label: 'Depositumskonto', sub: 'Sperret konto i bank' },
    { key: 'garanti', icon: ShieldCheck, label: 'Depositumsgaranti', sub: 'Ingen binding av kapital' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: 1 - out }}>
      <div style={{ marginBottom: 36 }}>
        <Caption step="Steg 5 · Depositum" title="Leietaker velger depositum i Keyhole" accent={KH} p={cap} />
      </div>
      <div style={{ display: 'flex', gap: 26, alignItems: 'stretch', opacity: cards, transform: `scale(${0.96 + cards * 0.04})` }}>
        {/* valg-kort */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 300 }}>
          {choices.map((c, idx) => {
            const isSel = idx === 0;
            const selOn = isSel ? choose : 0;
            const Icon = c.icon;
            return (
              <div key={c.key} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px', borderRadius: 18,
                background: isSel ? `${KH}1c` : SURF,
                border: `2px solid ${isSel ? KH : HAIR}`,
                boxShadow: isSel ? `0 0 0 ${selOn * 4}px ${KH}22` : 'none',
                opacity: isSel ? 1 : 1 - choose * 0.45,
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: isSel ? KH : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color={isSel ? '#1a0a0c' : '#fff'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...FB, color: '#fff', fontWeight: 600, fontSize: 16.5 }}>{c.label}</div>
                  <div style={{ ...FB, color: MUT, fontSize: 13, marginTop: 2 }}>{c.sub}</div>
                </div>
                {isSel && <Check size={20} color={KH} strokeWidth={3} style={{ opacity: choose }} />}
              </div>
            );
          })}
        </div>

        {/* tidslinje */}
        <Panel style={{ width: 340, padding: 24, position: 'relative' }} accent={KH} sheenP={seg(lt, 1.2, 2.7)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <img src="/keyhole-mark.png" alt="" style={{ height: 24 }} />
            <span style={{ ...FB, color: '#fff', fontWeight: 600, fontSize: 16 }}>Depositum</span>
          </div>
          <div style={{ position: 'relative' }}>
            {/* vertikal linje */}
            <div style={{ position: 'absolute', left: 17, top: 12, bottom: 12, width: 2, background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', left: 17, top: 12, width: 2, background: KH, height: `${clamp01(seg(lt, 3.2, 7.0)) * 84}%` }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {DEP_STEPS.map((s, idx) => {
                const sp = seg(lt, 3.3 + idx * 0.9, 4.0 + idx * 0.9);
                const done = sp > 0.5;
                const Icon = s.icon;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 99, flexShrink: 0, background: done ? KH : '#15131c', border: `2px solid ${done ? KH : 'rgba(255,255,255,0.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.8 + sp * 0.2})` }}>
                      <Icon size={17} color={done ? '#1a0a0c' : 'rgba(255,255,255,0.4)'} strokeWidth={2.6} />
                    </div>
                    <span style={{ ...FB, color: done ? '#fff' : MUT, fontWeight: done ? 600 : 400, fontSize: 15.5 }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* sikret-badge */}
      {secured > 0 && (
        <div style={{
          marginTop: 30, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 26px', borderRadius: 16,
          background: `linear-gradient(135deg, ${KH}, #f4707a)`, boxShadow: `0 22px 60px -16px ${KH}99`,
          opacity: secured, transform: `translateY(${(1 - easeOut(secured)) * 22}px)`,
        }}>
          <Lock size={20} color="#1a0a0c" strokeWidth={2.6} />
          <span style={{ ...FH, color: '#1a0a0c', fontWeight: 700, fontSize: 19 }}>Depositum sikret</span>
        </div>
      )}
    </div>
  );
}

/* ================= SCENE 6 — OUTRO ================= */
function SceneOutro({ lt, dur }) {
  const inP = seg(lt, 0.2, 1.4);
  const line = seg(lt, 0.9, 2.0);
  const url = seg(lt, 1.8, 2.8);
  const shimmer = clamp01((lt - 1.3) / 1.9);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: inP }}>
      {/* svakt keyhole-motiv bak */}
      <img src="/keyhole-mark.png" alt="" style={{ position: 'absolute', width: 520, opacity: 0.06 * inP, filter: `drop-shadow(0 0 80px ${KH})`, transform: `scale(${0.9 + inP * 0.1})`, pointerEvents: 'none' }} />
      <div className="flex items-center justify-center gap-10 mb-10" style={{ transform: `translateY(${(1 - easeOut(inP)) * 16}px)`, position: 'relative' }}>
        <img src="/deck-logo-light.svg" alt="DigiHome" style={{ height: 50 }} />
        <span style={{ ...FH, color: 'rgba(255,255,255,0.4)', fontSize: 36, fontWeight: 300 }}>×</span>
        <img src="/keyhole-logo.png" alt="Keyhole" style={{ height: 46 }} />
      </div>
      <div style={{ position: 'relative', opacity: line, transform: `translateY(${(1 - easeOut(line)) * 18}px)` }}>
        <h2 className="text-center" style={{ ...FH, color: INK, fontWeight: 700, fontSize: 52, letterSpacing: '-0.03em', lineHeight: 1.06 }}>
          Fra annonse til sikret depositum.
        </h2>
        <Sheen p={shimmer} radius={8} />
      </div>
      <p style={{ ...FB, color: KH, fontSize: 22, marginTop: 18, fontWeight: 500, opacity: url }}>digihome.no</p>
    </div>
  );
}

const SCENE_COMPS = [SceneIntro, SceneAnnonse, SceneSokere, SceneScreening, SceneKontrakt, SceneDepositum, SceneOutro];

/* ---------- fremdriftsskinne ---------- */
function ProgressRail({ t }) {
  const vis = t > 7.2 && t < 49.6;
  const op = clamp01(seg(t, 7.0, 8.0) - seg(t, 49.2, 49.8));
  return (
    <div style={{ position: 'absolute', top: 54, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: vis ? op : 0, pointerEvents: 'none', zIndex: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '12px 22px', borderRadius: 99, background: 'rgba(16,14,22,0.6)', border: `1px solid ${HAIR}`, backdropFilter: 'blur(8px)' }}>
        {STEPS.map((s, idx) => {
          const active = t >= s.at - 0.2;
          const c = sysColor(s.sys);
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <div style={{ width: 30, height: 2, background: active ? c : 'rgba(255,255,255,0.14)', margin: '0 10px' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: active ? c : 'rgba(255,255,255,0.2)', boxShadow: active ? `0 0 12px ${c}` : 'none' }} />
                <span style={{ ...FB, fontSize: 13.5, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}>{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- klokke ---------- */
function useFilmClock() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const tRef = useRef(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  const tick = useCallback(function loop(now) {
    const dt = Math.min((now - lastRef.current) / 1000, 0.1);
    lastRef.current = now;
    tRef.current = Math.min(tRef.current + dt, DURATION);
    setTime(tRef.current);
    if (tRef.current >= DURATION) { setPlaying(false); setEnded(true); return; }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const play = useCallback(() => {
    if (tRef.current >= DURATION) { tRef.current = 0; setTime(0); setEnded(false); }
    setStarted(true); setPlaying(true);
    lastRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => { setPlaying(false); cancelAnimationFrame(rafRef.current); }, []);

  const seekTo = useCallback((t) => {
    const v = Math.max(0, Math.min(t, DURATION));
    tRef.current = v; setTime(v); setStarted(true);
    setEnded(v >= DURATION);
  }, []);

  const beginPaused = useCallback(() => { setStarted(true); setPlaying(false); tRef.current = 0; setTime(0); }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
  return { time, playing, started, ended, play, pause, seekTo, beginPaused, tRef };
}

/* ============ HOVEDKOMPONENT ============ */
export default function KeyholeFilm() {
  const { time, playing, started, ended, play, pause, seekTo, beginPaused, tRef } = useFilmClock();
  const [recordMode, setRecordMode] = useState(false);
  const recordRef = useRef(false);
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [chrome, setChrome] = useState(true);
  const hideTimer = useRef(null);
  const [dlReady, setDlReady] = useState(false);

  /* --- musikk (WebAudio, live) --- */
  const audioCtxRef = useRef(null);
  const musicRef = useRef(null);
  const stopMusic = useCallback(() => {
    if (musicRef.current) { try { musicRef.current.stop(); } catch (e) { /* ok */ } musicRef.current = null; }
  }, []);
  const startMusic = useCallback((fromT) => {
    if (recordRef.current) return; // ingen live-lyd i record-modus (WAV rendres separat)
    stopMusic();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    musicRef.current = scheduleKeyholeMusic(ctx, ctx.destination, fromT);
  }, [stopMusic]);

  const handlePlay = useCallback(() => { play(); startMusic(tRef.current); }, [play, startMusic, tRef]);
  const handlePause = useCallback(() => { pause(); stopMusic(); }, [pause, stopMusic]);
  const handleSeek = useCallback((v) => { seekTo(v); if (playing) startMusic(v); else stopMusic(); }, [seekTo, startMusic, stopMusic, playing]);

  useEffect(() => { if (ended) stopMusic(); }, [ended, stopMusic]);
  useEffect(() => () => { stopMusic(); try { audioCtxRef.current && audioCtxRef.current.close(); } catch (e) { /* ok */ } }, [stopMusic]);

  const MP4_URL = '/film/digihome-keyhole-16x9.mp4?v=3';

  /* record-modus */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('record') === '1') {
      recordRef.current = true;
      setRecordMode(true);
      beginPaused();
      window.__setTime = (t) => { seekTo(t); };
      window.__renderMusicWav = (d) => renderKeyholeWav(d == null ? DURATION : d);
      window.__filmReady = true;
    }
  }, [beginPaused, seekTo]);

  /* skalering til container */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width, h = e.contentRect.height;
      setScale(Math.min(w / 1920, h / 1080));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* finnes MP4? */
  useEffect(() => {
    fetch(MP4_URL, { method: 'HEAD' }).then((r) => { if (r.ok) setDlReady(true); }).catch(() => {});
  }, [MP4_URL]);

  const wake = useCallback(() => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 2400);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  /* aktiv akzent-farge (kryssfade mellom lilla og rosa) */
  let accent = DH;
  for (const s of SCENES) {
    if (time >= s.start && time <= s.end) { accent = s.sys === 'kh' ? KH : s.sys === 'dh' ? DH : DH; }
  }
  // glatt overgang nær Keyhole-scener
  if ((time > 22.2 && time < 33.4) || (time > 40.2 && time < 50.2)) accent = KH;

  const displayT = started ? time : 0.0;
  const chromeVisible = !recordMode && (chrome || !playing || !started || ended);

  const triggerDownload = () => {
    const a = document.createElement('a');
    a.href = MP4_URL; a.download = 'digihome-keyhole.mp4';
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#030304', cursor: recordMode ? 'none' : chromeVisible ? 'default' : 'none', overflow: 'hidden' }}
      onMouseMove={recordMode ? undefined : wake}
      onClick={recordMode ? undefined : () => { if (!started) handlePlay(); else if (!ended) (playing ? handlePause() : handlePlay()); }}
    >
      {/* STAGE 1920×1080 */}
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'center center', position: 'relative', flexShrink: 0 }}>
        <Backdrop t={displayT} accent={accent} />

        {/* scener (kryssfade + kinematisk push-in) */}
        {SCENES.map((s, idx) => {
          const fIn = 0.6, fOut = 0.6;
          const op = clamp01(Math.min(
            (displayT - s.start) / fIn,
            (s.end - displayT) / fOut,
          ));
          if (op <= 0) return null;
          const C = SCENE_COMPS[idx];
          const lt = displayT - s.start;
          const dur = s.end - s.start;
          const prog = easeInOut(clamp01(lt / dur));
          const camScale = 1 + 0.024 * prog;       // langsom innzoom
          const camY = -10 * prog;                  // mild drift oppover
          return (
            <div key={idx} className="absolute inset-0" style={{ opacity: op, transform: `scale(${camScale}) translateY(${camY}px)`, transformOrigin: 'center 47%' }}>
              <C lt={lt} dur={dur} t={displayT} />
            </div>
          );
        })}

        {/* sikre overføringer mellom systemene (forteller integrasjonen) */}
        <HandoffBeam t={displayT} start={21.9} end={23.35} toKH label="Sikker overføring · Keyhole" />
        <HandoffBeam t={displayT} start={31.9} end={33.35} toKH={false} label="Tilbake til DigiHome" />
        <HandoffBeam t={displayT} start={39.9} end={41.35} toKH label="Overfører til Keyhole" />

        <ProgressRail t={displayT} />
        <Grain t={displayT} />

        {/* logo-vannmerke (skjult i intro/outro) */}
        {displayT > 8.4 && displayT < 49.4 && (
          <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'center', opacity: 0.5 }}>
            <img src="/deck-logo-light.svg" alt="" style={{ height: 22 }} />
            <span style={{ ...FH, color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</span>
            <img src="/keyhole-logo.png" alt="" style={{ height: 20 }} />
          </div>
        )}
      </div>

      {/* ---- vedvarende nedlastingsknapp (øverst til høyre) ---- */}
      {!recordMode && dlReady && (
        <button
          onClick={(e) => { e.stopPropagation(); triggerDownload(); }}
          className="absolute flex items-center gap-2.5"
          style={{
            top: 26, right: 26, zIndex: 50,
            padding: '12px 20px', borderRadius: 999,
            background: `linear-gradient(135deg, ${KH}, #f4707a)`,
            color: '#1a0a0c', ...FB, fontWeight: 700, fontSize: 15,
            boxShadow: `0 16px 40px -12px ${KH}cc`,
            opacity: chromeVisible ? 1 : 0.55, transition: 'opacity 0.3s',
          }}
        >
          <Download size={18} strokeWidth={2.6} /> Last ned MP4
        </button>
      )}

      {/* ---- plakat/start ---- */}
      {!started && !recordMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(3,3,4,0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="flex items-center gap-7 mb-9" style={{ opacity: 0.95 }}>
            <img src="/deck-logo-light.svg" alt="DigiHome" style={{ height: 34 }} />
            <span style={{ ...FH, color: 'rgba(255,255,255,0.4)', fontSize: 26, fontWeight: 300 }}>×</span>
            <img src="/keyhole-logo.png" alt="Keyhole" style={{ height: 30 }} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handlePlay(); }}
            className="flex items-center justify-center rounded-full"
            style={{ width: 88, height: 88, background: `linear-gradient(135deg, ${KH}, #f4707a)`, boxShadow: `0 20px 60px -14px ${KH}` }}
          >
            <Play size={36} color="#1a0a0c" fill="#1a0a0c" style={{ marginLeft: 5 }} />
          </button>
          <p style={{ ...FB, color: 'rgba(255,255,255,0.72)', marginTop: 24, fontSize: 16 }}>Spill av integrasjonsfilmen · 53 sek</p>
        </div>
      )}

      {/* ---- sluttskjerm (replay + last ned) ---- */}
      {ended && !recordMode && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(3,3,4,0.62)', backdropFilter: 'blur(3px)' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-7 mb-8">
            <img src="/deck-logo-light.svg" alt="DigiHome" style={{ height: 32 }} />
            <span style={{ ...FH, color: 'rgba(255,255,255,0.4)', fontSize: 24, fontWeight: 300 }}>×</span>
            <img src="/keyhole-logo.png" alt="Keyhole" style={{ height: 28 }} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { seekTo(0); handlePlay(); }} className="flex items-center gap-2.5 rounded-full" style={{ padding: '13px 24px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', ...FB, fontWeight: 600, fontSize: 15 }}>
              <Play size={18} fill="#fff" /> Spill igjen
            </button>
            {dlReady && (
              <button onClick={triggerDownload} className="flex items-center gap-2.5 rounded-full" style={{ padding: '13px 26px', background: `linear-gradient(135deg, ${KH}, #f4707a)`, color: '#1a0a0c', ...FB, fontWeight: 700, fontSize: 15, boxShadow: `0 16px 40px -12px ${KH}cc` }}>
                <Download size={18} strokeWidth={2.6} /> Last ned MP4
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---- kontroller ---- */}
      {started && !recordMode && (
        <div
          className="absolute left-0 right-0 bottom-0 px-8 pb-6 pt-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', opacity: chromeVisible ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: chromeVisible ? 'auto' : 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* scrub */}
          <input
            type="range" min={0} max={DURATION} step={0.05} value={time}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: KH, cursor: 'pointer' }}
          />
          <div className="flex items-center gap-4 mt-3">
            <button onClick={() => (playing ? handlePause() : handlePlay())} className="text-white">
              {playing ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" />}
            </button>
            <span style={{ ...FB, color: 'rgba(255,255,255,0.85)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
              {time.toFixed(1)}s / {DURATION}s
            </span>
            <div className="ml-auto flex items-center gap-3">
              {dlReady && (
                <button onClick={triggerDownload} className="flex items-center gap-2 px-3.5 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.5, ...FB, fontWeight: 600 }}>
                  <Download size={16} /> Last ned MP4
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
