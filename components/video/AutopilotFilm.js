'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { seg, clamp01, Orb, FilmGrain, LightSweep, Aurora, Bokeh, impactShake, easeInOutCubic } from './filmUtils';
import { scheduleMusic, renderMusicWav, FILM_DURATION } from './filmAudio';
import {
  SceneOpening, SceneToggle, SceneAnnonse, SceneVisning, SceneKontrakt, SceneChat, SceneFinale,
} from './FilmScenes';

const DURATION = FILM_DURATION; /* 72s */
const MP4_URL = '/film/digihome-utleie-pa-autopilot-16x9.mp4';
const SCENE_BOUNDARIES = [8, 14, 26, 38, 48.5, 59];

const SCENES = [
  { start: 0, end: 8.5, C: SceneOpening },
  { start: 8, end: 14.5, C: SceneToggle },
  { start: 14, end: 26.5, C: SceneAnnonse },
  { start: 26, end: 38.5, C: SceneVisning },
  { start: 38, end: 49, C: SceneKontrakt },
  { start: 48.5, end: 59.5, C: SceneChat },
  { start: 59, end: 72, C: SceneFinale },
];

/* kapitler (for spiller-UI) */
const CHAPTERS = [
  { t: 0, label: 'Åpning' },
  { t: 8, label: 'Autopilot på' },
  { t: 14, label: 'Annonse' },
  { t: 26, label: 'Visninger & screening' },
  { t: 38, label: 'Kontrakt & husleie' },
  { t: 48.5, label: 'Svar 24/7' },
  { t: 59, label: 'Finale' },
];

/* impact-kameraristing: [tidspunkt, styrke] */
const SHAKES = [
  [10.65, 0.5],   /* toggle-flip */
  [23.78, 0.55],  /* FINN-stempel */
  [36.45, 0.3],   /* kandidat godkjent */
  [64.12, 0.7],   /* finale-brist */
];

/* Den reisende orben — filmens røde tråd. Født av toggelen (10.9), utfører
   hver oppgave i hver akt, og ofrer seg inn i finale-bristen (64.12).
   Keyframes: [tid, x%, y%, skala, opasitet] */
const ORB_PATH = [
  [10.9, 51, 48, 0.0, 0],      /* fødes fra toggle-knappen */
  [11.7, 50, 24, 1.0, 0.95],   /* stiger opp */
  [13.6, 56, 22, 1.0, 0.95],
  [15.2, 72, 11, 0.9, 0.9],    /* ankommer annonsekortet */
  [17.5, 56, 13, 0.85, 0.9],   /* skanner foto: venstre... */
  [19.1, 88, 13, 0.85, 0.9],   /* ...til høyre (styling-sveip) */
  [20.6, 90, 8, 0.7, 0.85],
  [26.2, 80, 10, 0.7, 0.85],   /* glir over aktskiftet */
  [27.9, 54, 40, 0.75, 0.9],   /* booker rad 1 */
  [28.7, 54, 50.5, 0.75, 0.9], /* rad 2 */
  [29.5, 54, 61, 0.75, 0.9],   /* rad 3 */
  [31.2, 62, 18, 0.7, 0.85],
  [33.0, 71, 44, 0.5, 0.9],    /* setter seg i radarsenteret (driver skanningen) */
  [35.25, 71, 44, 0.45, 0.9],
  [35.7, 86, 16, 0.65, 0.85],  /* forlater før scoren lander */
  [39.6, 57, 56, 0.6, 0.9],    /* inntar signaturlinjen */
  [40.3, 57, 56, 0.6, 0.9],
  [41.8, 73, 56, 0.6, 0.9],    /* følger pennen langs signaturen */
  [42.4, 88, 72, 0.6, 0.9],    /* stempler BankID-merket */
  [43.5, 76, 22, 0.7, 0.85],
  [44.9, 50, 8, 0.8, 0.9],     /* venter over husleie-overskriften */
  [46.5, 50, 8, 0.8, 0.9],
  [46.95, 50, 58, 0.25, 0.85], /* stuper inn i beløpet (flare!) */
  [47.05, 50, 60, 0.08, 0],
  [49.7, 90, 6, 0.0, 0],       /* gjenfødes i chat-akten */
  [50.4, 52, 24, 0.75, 0.9],
  [51.4, 52, 32, 0.75, 0.9],   /* pulserer mens svaret skrives */
  [52.6, 58, 33, 0.75, 0.9],   /* dytter svaret inn i telefonen */
  [53.3, 52, 30, 0.75, 0.9],
  [56.5, 56, 12, 0.7, 0.85],
  [59.8, 50, 26, 0.85, 0.9],   /* samler troppene i finalen */
  [63.3, 50, 28, 0.85, 0.9],
  [64.05, 50, 50, 0.15, 0.7],  /* spiraler inn i kjernen... */
  [64.15, 50, 50, 0.1, 0],     /* ...og blir til bristen */
];

function orbAt(t) {
  if (t <= ORB_PATH[0][0] || t >= ORB_PATH[ORB_PATH.length - 1][0]) return null;
  let i = 0;
  while (i < ORB_PATH.length - 2 && t > ORB_PATH[i + 1][0]) i++;
  const a = ORB_PATH[i];
  const b = ORB_PATH[i + 1];
  const p = easeInOutCubic(clamp01((t - a[0]) / (b[0] - a[0])));
  const lerp = (u, v) => u + (v - u) * p;
  return { x: lerp(a[1], b[1]), y: lerp(a[2], b[2]), s: lerp(a[3], b[3]), o: lerp(a[4], b[4]) };
}

/* ============ hovedklokke ============ */
function useFilmClock(duration) {
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
    tRef.current = Math.min(tRef.current + dt, duration);
    setTime(tRef.current);
    if (tRef.current >= duration) {
      setPlaying(false);
      setEnded(true);
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [duration]);

  const play = useCallback(() => {
    if (tRef.current >= duration) {
      tRef.current = 0;
      setTime(0);
    }
    setEnded(false);
    setStarted(true);
    setPlaying(true);
    lastRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, duration]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  }, []);

  const seekTo = useCallback((t) => {
    const v = Math.max(0, Math.min(t, duration));
    tRef.current = v;
    setTime(v);
    if (v < duration) setEnded(false);
  }, [duration]);

  const beginPaused = useCallback(() => {
    setStarted(true);
    setPlaying(false);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { time, playing, started, ended, play, pause, seekTo, beginPaused, tRef };
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ============ ikoner ============ */
const PlayIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.9-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14z" /></svg>
);
const PauseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
);
const ReplayIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
);
const FullscreenIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
);
const SoundOnIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);
const SoundOffIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
);
const DownloadIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);

/* ============ hovedkomponent ============ */
export default function AutopilotFilm() {
  const { time, playing, started, ended, play, pause, seekTo, beginPaused, tRef } = useFilmClock(DURATION);
  const wrapperRef = useRef(null);
  const stageRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimer = useRef(null);
  const [chrome, setChrome] = useState(true);
  const [recordMode, setRecordMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dlReady, setDlReady] = useState(false);
  const [idleT, setIdleT] = useState(0);

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  /* ---- musikk ---- */
  const audioCtxRef = useRef(null);
  const musicRef = useRef(null);
  const recordRef = useRef(false);

  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
    }
  }, []);

  const startMusic = useCallback(() => {
    if (recordRef.current) return;
    stopMusic();
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      musicRef.current = scheduleMusic(ctx, ctx.destination, tRef.current);
    } catch (e) { /* lyd ikke tilgjengelig */ }
  }, [stopMusic, tRef]);

  useEffect(() => {
    if (playing && !muted) startMusic();
    else stopMusic();
  }, [playing, muted, startMusic, stopMusic]);

  useEffect(() => () => { stopMusic(); audioCtxRef.current?.close?.().catch?.(() => {}); }, [stopMusic]);

  /* resynk musikk etter spoling */
  const resyncMusic = useCallback(() => {
    if (playingRef.current && !mutedRef.current) startMusic();
  }, [startMusic]);

  /* ---- record-modus (frame-for-frame MP4-rendring) ---- */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('record') === '1') {
      recordRef.current = true;
      setRecordMode(true);
      beginPaused();
      window.__setTime = (t) => { seekTo(t); };
      window.__renderMusicWav = renderMusicWav;
      window.__filmReady = true;
    }
  }, [beginPaused, seekTo]);

  /* ---- sjekk om MP4 finnes (for nedlasting) ---- */
  useEffect(() => {
    fetch(MP4_URL, { method: 'HEAD' })
      .then((r) => { if (r.ok) setDlReady(true); })
      .catch(() => {});
  }, []);

  const triggerDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = MP4_URL;
    a.download = 'digihome-utleie-pa-autopilot.mp4';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  /* ---- idle-klokke for plakat-orb ---- */
  useEffect(() => {
    if (started) return;
    let raf;
    const t0 = performance.now();
    const loop = (now) => {
      setIdleT((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  /* ---- stage-enhet: --su = 1% av scenebredde ---- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      el.style.setProperty('--su', `${entry.contentRect.width / 100}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- auto-skjul kontroller ---- */
  const wake = useCallback(() => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 2400);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const chromeVisible = !recordMode && (chrome || !playing || !started || ended);

  /* ---- fullskjerm ---- */
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else wrapperRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  /* ---- tastatur ---- */
  useEffect(() => {
    if (recordMode) return;
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        if (!started || ended) play();
        else if (playing) pause();
        else play();
      } else if (e.key === 'ArrowRight') {
        seekTo(tRef.current + 5);
        resyncMusic();
      } else if (e.key === 'ArrowLeft') {
        seekTo(tRef.current - 5);
        resyncMusic();
      } else if (e.key === 'f') {
        toggleFs();
      } else if (e.key === 'm') {
        setMuted((m) => !m);
      } else if (e.key === 'r') {
        seekTo(0);
        play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recordMode, started, ended, playing, play, pause, seekTo, toggleFs, resyncMusic, tRef]);

  /* ---- klikk på progresjonslinje ---- */
  const onSeekClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = clamp01((e.clientX - rect.left) / rect.width);
    seekTo(ratio * DURATION);
    resyncMusic();
  };

  const pct = (time / DURATION) * 100;
  const watermark = Math.min(seg(time, 8.5, 9.7), 1 - seg(time, 66, 67.2)) * 0.45;

  /* impact-kameraristing (summert, deterministisk) */
  let shakeX = 0, shakeY = 0;
  for (const [at, mag] of SHAKES) {
    const s = impactShake(time, at, mag);
    shakeX += s.x;
    shakeY += s.y;
  }
  const shakeAmt = Math.abs(shakeX) + Math.abs(shakeY);

  /* vignett som «puster» i takt med musikkpulsen (kick hver 1,2s fra 10,8–58,8) */
  const kickGlow = started && time >= 10.8 && time <= 58.8
    ? Math.exp(-(((time - 10.8) % 1.2) / 1.2) * 5.5)
    : 0;

  /* aktivt kapittel */
  let chapterLabel = CHAPTERS[0].label;
  for (const c of CHAPTERS) if (time >= c.t) chapterLabel = c.label;

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-[100] flex items-center justify-center select-none"
      style={{ background: '#030304', cursor: recordMode ? 'none' : chromeVisible ? 'default' : 'none' }}
      onMouseMove={recordMode ? undefined : wake}
      onClick={recordMode ? undefined : () => { if (started && !ended) (playing ? pause() : play()); }}
      onContextMenu={(e) => {
        if (recordMode) return;
        e.preventDefault();
        if (dlReady) triggerDownload();
      }}
    >
      {/* 16:9-scene, letterboxet */}
      <div
        ref={stageRef}
        className="relative overflow-hidden"
        style={{
          width: 'min(100vw, calc(100vh * 1.77778))',
          height: 'min(100vh, calc(100vw * 0.5625))',
          background: '#060607',
          '--su': '12px',
        }}
      >
        {/* riste-wrapper — impact-kamerarist + alle visuelle lag */}
        <div
          className="absolute inset-0"
          style={{
            transform: shakeAmt > 0.001
              ? `translate(calc(var(--su) * ${shakeX.toFixed(3)}), calc(var(--su) * ${shakeY.toFixed(3)})) scale(${(1 + shakeAmt * 0.02).toFixed(4)})`
              : 'none',
          }}
        >
        {/* moderne aurora-mesh-bakgrunn + bokeh-dybde + vignett */}
        <Aurora t={time} opacity={0.14 * seg(time, 7.2, 9.5)} />
        {started && <Bokeh t={time} opacity={seg(time, 7.6, 9.8)} />}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: seg(time, 7.2, 9.5),
            background: 'radial-gradient(ellipse at 50% 42%, transparent 52%, rgba(0,0,0,0.5) 100%)',
          }}
        />

        {/* scener */}
        {started && SCENES.map(({ start, end, C }, i) =>
          time >= start - 0.1 && time <= end + 0.1 ? <C key={i} t={time} /> : null
        )}

        {/* lys-sveip ved aktskifter */}
        {started && <LightSweep t={time} boundaries={SCENE_BOUNDARIES} />}

        {/* puls-glød i takt med musikken */}
        {kickGlow > 0.03 && (
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background: 'radial-gradient(ellipse 75% 65% at 50% 46%, rgba(207,151,252,0.065), transparent 70%)',
              opacity: kickGlow.toFixed(3),
            }}
          />
        )}

        {/* vannmerke */}
        {started && watermark > 0.01 && (
          <img
            src="/brand/digihome-lockup-white.svg"
            alt=""
            className="absolute pointer-events-none"
            style={{ top: 'calc(var(--su) * 3)', left: 'calc(var(--su) * 3.5)', height: 'calc(var(--su) * 2.2)', width: 'auto', opacity: watermark }}
          />
        )}
        {/* den reisende orben — filmens røde tråd (med lysspor) */}
        {started && (() => {
          const o = orbAt(time);
          if (!o || o.o <= 0.02) return null;
          const bobX = Math.sin(time * 1.7) * 0.22;
          const bobY = Math.sin(time * 2.3) * 0.28;
          return (
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              {/* lysspor — tre falmende ekko bak orben */}
              {[0.26, 0.17, 0.09].map((d, gi) => {
                const g = orbAt(time - d);
                if (!g || g.o <= 0.02) return null;
                const sz = (3.6 * g.s * (0.55 + gi * 0.15)).toFixed(2);
                return (
                  <span
                    key={gi}
                    style={{
                      position: 'absolute', left: `${g.x.toFixed(2)}%`, top: `${g.y.toFixed(2)}%`,
                      width: `calc(var(--su) * ${sz})`, height: `calc(var(--su) * ${sz})`,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(207,151,252,0.55), transparent 68%)',
                      opacity: (g.o * (0.1 + gi * 0.09)).toFixed(3),
                      filter: 'blur(calc(var(--su) * 0.3))',
                    }}
                  />
                );
              })}
              <div
                style={{
                  position: 'absolute',
                  left: `${(o.x + bobX).toFixed(2)}%`, top: `${(o.y + bobY).toFixed(2)}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: o.o.toFixed(3),
                }}
              >
                {/* ytre aura */}
                <div
                  style={{
                    position: 'absolute', left: '50%', top: '50%',
                    width: `calc(var(--su) * ${(o.s * 9).toFixed(2)})`, height: `calc(var(--su) * ${(o.s * 9).toFixed(2)})`,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(155,91,214,0.32), transparent 65%)',
                    filter: 'blur(calc(var(--su) * 0.6))',
                  }}
                />
                <Orb t={time} size={`calc(var(--su) * ${(o.s * 3.4).toFixed(2)})`} speed={7} />
                {/* krisp lysende kjerne — leselig mot både lyse og mørke flater */}
                <div
                  style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `calc(var(--su) * ${(o.s * 1.0).toFixed(2)})`, height: `calc(var(--su) * ${(o.s * 1.0).toFixed(2)})`,
                    borderRadius: '50%',
                    background: '#FDFCFB',
                    boxShadow: '0 0 calc(var(--su) * 1.5) rgba(207,151,252,0.95), 0 0 calc(var(--su) * 3) rgba(155,91,214,0.55)',
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* filmkorn */}
        {started && <FilmGrain t={time} opacity={0.05} />}
        </div>

        {/* startoverlegg */}
        {!started && !recordMode && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ background: '#0A0A0A' }}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.32 }}>
              <Orb t={idleT} size="calc(var(--su) * 50)" speed={18} />
            </div>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(5,5,6,0) 24%, rgba(5,5,6,0.85) 68%)' }} />
            <div className="relative flex flex-col items-center">
              <img
                src="/brand/digihome-icon-purple.svg"
                alt="DigiHome"
                style={{ height: 'calc(var(--su) * 6.5)', width: 'calc(var(--su) * 6.5)', borderRadius: 'calc(var(--su) * 1)', marginBottom: 'calc(var(--su) * 3)', boxShadow: '0 0 calc(var(--su)*4) rgba(207,151,252,0.35)' }}
              />
              <h1 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.4)', color: '#FDFCFB', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Utleie på autopilot
              </h1>
              <p className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.55)', marginTop: 'calc(var(--su) * 1.6)' }}>
                En film fra DigiHome · 72 sekunder · med lyd
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); play(); }}
                aria-label="Spill av"
                style={{
                  marginTop: 'calc(var(--su) * 4)',
                  width: 'calc(var(--su) * 8.5)', height: 'calc(var(--su) * 8.5)', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #CF97FC, #9B5BD6)',
                  color: '#0A0A0A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 calc(var(--su) * 5) rgba(207,151,252,0.45)',
                  transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <svg style={{ width: 'calc(var(--su) * 3.2)', height: 'calc(var(--su) * 3.2)', marginLeft: 'calc(var(--su) * 0.4)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.9-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14z" /></svg>
              </button>
              <p className="font-body" style={{ fontSize: 'calc(var(--su) * 1.25)', color: 'rgba(253,252,251,0.35)', marginTop: 'calc(var(--su) * 3.2)', letterSpacing: '0.06em' }}>
                Mellomrom = pause · M = lyd av/på · F = fullskjerm{dlReady ? ' · høyreklikk = last ned' : ''}
              </p>
            </div>
          </div>
        )}

        {/* sluttoverlegg */}
        {ended && !recordMode && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ background: 'rgba(3,3,4,0.45)', backdropFilter: 'blur(6px)' }}>
            <div style={{ display: 'flex', gap: 'calc(var(--su) * 1.6)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); seekTo(0); play(); }}
                className="font-body"
                style={{
                  display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
                  background: 'linear-gradient(135deg, #CF97FC, #9B5BD6)', color: '#0A0A0A',
                  borderRadius: 999, padding: 'calc(var(--su) * 1.2) calc(var(--su) * 2.8)',
                  fontSize: 'calc(var(--su) * 1.8)', fontWeight: 500,
                }}
              >
                <ReplayIcon /> Se igjen
              </button>
              {dlReady && (
                <button
                  onClick={(e) => { e.stopPropagation(); triggerDownload(); }}
                  className="font-body"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
                    border: '1px solid rgba(207,151,252,0.6)', color: '#CF97FC',
                    borderRadius: 999, padding: 'calc(var(--su) * 1.2) calc(var(--su) * 2.8)',
                    fontSize: 'calc(var(--su) * 1.8)',
                  }}
                >
                  <DownloadIcon /> Last ned MP4
                </button>
              )}
              <a
                href="/"
                onClick={(e) => e.stopPropagation()}
                className="font-body"
                style={{
                  display: 'flex', alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(253,252,251,0.9)',
                  borderRadius: 999, padding: 'calc(var(--su) * 1.2) calc(var(--su) * 2.8)',
                  fontSize: 'calc(var(--su) * 1.8)',
                }}
              >
                Til forsiden →
              </a>
            </div>
          </div>
        )}

        {/* kontroller */}
        {started && !recordMode && (
          <div
            className="absolute bottom-0 left-0 right-0 z-20"
            onClick={(e) => e.stopPropagation()}
            style={{
              opacity: chromeVisible ? 1 : 0,
              pointerEvents: chromeVisible ? 'auto' : 'none',
              transition: 'opacity 0.4s ease',
              background: 'linear-gradient(to top, rgba(3,3,4,0.85), rgba(3,3,4,0))',
              padding: 'calc(var(--su) * 3) calc(var(--su) * 3) calc(var(--su) * 1.6)',
            }}
          >
            <div className="flex items-center" style={{ gap: 'calc(var(--su) * 1.6)' }}>
              <button onClick={() => (ended ? play() : playing ? pause() : play())} aria-label={playing ? 'Pause' : 'Spill av'} style={{ color: '#FDFCFB', display: 'flex' }}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button onClick={() => { seekTo(0); play(); }} aria-label="Start på nytt" style={{ color: 'rgba(253,252,251,0.7)', display: 'flex' }}>
                <ReplayIcon />
              </button>
              <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Lyd på' : 'Lyd av'} style={{ color: muted ? 'rgba(253,252,251,0.45)' : 'rgba(253,252,251,0.85)', display: 'flex' }}>
                {muted ? <SoundOffIcon /> : <SoundOnIcon />}
              </button>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.35)', color: 'rgba(253,252,251,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 'calc(var(--su) * 8.5)' }}>
                {fmtTime(time)} / {fmtTime(DURATION)}
              </span>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.2)', color: 'rgba(207,151,252,0.85)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {chapterLabel}
              </span>
              <div ref={progressRef} onClick={onSeekClick} className="flex-1 cursor-pointer" style={{ padding: 'calc(var(--su) * 0.8) 0' }}>
                <div style={{ position: 'relative', height: 'calc(var(--su) * 0.45)', borderRadius: 99, background: 'rgba(255,255,255,0.16)' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)' }} />
                  {/* kapittelmerker */}
                  {CHAPTERS.slice(1).map((c) => (
                    <span
                      key={c.t}
                      aria-hidden="true"
                      style={{
                        position: 'absolute', left: `${((c.t / DURATION) * 100).toFixed(2)}%`, top: '-18%', bottom: '-18%',
                        width: 'calc(var(--su) * 0.18)',
                        borderRadius: 99,
                        background: time >= c.t ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.45)',
                      }}
                    />
                  ))}
                  {/* spillehode */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute', left: `${pct}%`, top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 'calc(var(--su) * 1.05)', height: 'calc(var(--su) * 1.05)',
                      borderRadius: '50%', background: '#FDFCFB',
                      boxShadow: '0 0 calc(var(--su) * 1.1) rgba(207,151,252,0.9)',
                    }}
                  />
                </div>
              </div>
              {dlReady && (
                <button onClick={triggerDownload} aria-label="Last ned MP4" title="Last ned MP4" style={{ color: 'rgba(253,252,251,0.7)', display: 'flex' }}>
                  <DownloadIcon />
                </button>
              )}
              <button onClick={toggleFs} aria-label="Fullskjerm" style={{ color: 'rgba(253,252,251,0.7)', display: 'flex' }}>
                <FullscreenIcon />
              </button>
            </div>
          </div>
        )}

        {/* tynn alltid-synlig progresjonslinje */}
        {started && !recordMode && !chromeVisible && (
          <div className="absolute bottom-0 left-0 right-0 z-10" style={{ height: 'calc(var(--su) * 0.35)', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)' }} />
          </div>
        )}
      </div>
    </div>
  );
}
