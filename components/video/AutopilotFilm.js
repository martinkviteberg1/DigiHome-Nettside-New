'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { seg, clamp01, Orb, Starfield } from './filmUtils';
import {
  SceneOpening, SceneToggle, SceneAnnonse, SceneVisning, SceneKontrakt, SceneFinale,
} from './FilmScenes';

const DURATION = 60;

const SCENES = [
  { start: 0, end: 6.5, C: SceneOpening },
  { start: 6, end: 12.5, C: SceneToggle },
  { start: 12, end: 24.5, C: SceneAnnonse },
  { start: 24, end: 36.5, C: SceneVisning },
  { start: 36, end: 46.5, C: SceneKontrakt },
  { start: 46, end: 60, C: SceneFinale },
];

/* ============ master clock ============ */
function useFilmClock(duration) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const tRef = useRef(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  // NB: når voiceover-lyd legges til, byttes klokka til audio.currentTime som master.

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

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { time, playing, started, ended, play, pause, seekTo };
}

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

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

/* ============ hovedkomponent ============ */
export default function AutopilotFilm() {
  const { time, playing, started, ended, play, pause, seekTo } = useFilmClock(DURATION);
  const wrapperRef = useRef(null);
  const stageRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimer = useRef(null);
  const [chrome, setChrome] = useState(true);
  const [isFs, setIsFs] = useState(false);

  /* stage unit: --su = 1% av scenebredden */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      el.style.setProperty('--su', `${w / 100}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* auto-skjul kontroller */
  const wake = useCallback(() => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 2400);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const chromeVisible = chrome || !playing || !started || ended;

  /* fullskjerm */
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else wrapperRef.current?.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  /* tastatur */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        if (!started || ended) play();
        else if (playing) pause();
        else play();
      } else if (e.key === 'ArrowRight') {
        seekTo(time + 5);
      } else if (e.key === 'ArrowLeft') {
        seekTo(time - 5);
      } else if (e.key === 'f') {
        toggleFs();
      } else if (e.key === 'r') {
        seekTo(0);
        play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, ended, playing, time, play, pause, seekTo, toggleFs]);

  /* klikk på progresjonslinje */
  const onSeekClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = clamp01((e.clientX - rect.left) / rect.width);
    seekTo(ratio * DURATION);
    if (!playing && started && !ended) {
      /* beholder pause-state ved scrubbing */
    }
  };

  const pct = (time / DURATION) * 100;
  const watermark = Math.min(seg(time, 7, 8.2), 1 - seg(time, 54, 55.2)) * 0.45;
  const engineOrb = Math.min(seg(time, 12.6, 13.6), 1 - seg(time, 45.4, 46.4)) * 0.85;
  const starsOn = started && time > 5.5;

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-[100] flex items-center justify-center select-none"
      style={{ background: '#030304', cursor: chromeVisible ? 'default' : 'none' }}
      onMouseMove={wake}
      onClick={() => { if (started && !ended) (playing ? pause() : play()); }}
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
        {/* nebula-bakgrunn */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: seg(time, 5.5, 7.5),
            background:
              'radial-gradient(ellipse 60% 50% at 72% 18%, rgba(207,151,252,0.09), transparent 60%), radial-gradient(ellipse 50% 45% at 20% 85%, rgba(125,227,210,0.05), transparent 60%)',
          }}
        />
        <Starfield playing={playing} opacity={starsOn ? 0.5 : 0} />

        {/* scener */}
        {started && SCENES.map(({ start, end, C }, i) =>
          time >= start - 0.1 && time <= end + 0.1 ? <C key={i} t={time} /> : null
        )}

        {/* vannmerke */}
        {watermark > 0.01 && (
          <img
            src="/digihome-wordmark-white.svg"
            alt=""
            className="absolute pointer-events-none"
            style={{ top: 'calc(var(--su) * 3)', left: 'calc(var(--su) * 3.5)', height: 'calc(var(--su) * 2)', width: 'auto', opacity: watermark }}
          />
        )}
        {/* motor-orb (alltid på jobb) */}
        {engineOrb > 0.01 && (
          <div className="absolute pointer-events-none" style={{ top: 'calc(var(--su) * 2.6)', right: 'calc(var(--su) * 3.2)', opacity: engineOrb }}>
            <Orb size="calc(var(--su) * 5.5)" speed={8} />
          </div>
        )}

        {/* startoverlegg */}
        {!started && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ background: '#0A0A0A' }}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.32 }}>
              <Orb size="calc(var(--su) * 50)" speed={18} />
            </div>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(5,5,6,0) 24%, rgba(5,5,6,0.85) 68%)' }} />
            <div className="relative flex flex-col items-center">
              <img src="/digihome-mark.svg" alt="DigiHome" style={{ height: 'calc(var(--su) * 5)', width: 'auto', marginBottom: 'calc(var(--su) * 3)' }} />
              <h1 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.4)', color: '#FDFCFB', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Utleie på autopilot
              </h1>
              <p className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.55)', marginTop: 'calc(var(--su) * 1.6)' }}>
                En 60-sekunders film fra DigiHome
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); play(); }}
                aria-label="Spill av"
                className="group"
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
                Mellomrom = pause · ← → = spol · F = fullskjerm
              </p>
            </div>
          </div>
        )}

        {/* sluttoverlegg */}
        {ended && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ background: 'rgba(3,3,4,0.45)', backdropFilter: 'blur(6px)' }}>
            <div style={{ display: 'flex', gap: 'calc(var(--su) * 1.6)' }}>
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
        {started && (
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
              <button
                onClick={() => (ended ? play() : playing ? pause() : play())}
                aria-label={playing ? 'Pause' : 'Spill av'}
                style={{ color: '#FDFCFB', display: 'flex' }}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button onClick={() => { seekTo(0); play(); }} aria-label="Start på nytt" style={{ color: 'rgba(253,252,251,0.7)', display: 'flex' }}>
                <ReplayIcon />
              </button>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.35)', color: 'rgba(253,252,251,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 'calc(var(--su) * 8.5)' }}>
                {fmtTime(time)} / {fmtTime(DURATION)}
              </span>
              <div
                ref={progressRef}
                onClick={onSeekClick}
                className="flex-1 cursor-pointer"
                style={{ padding: 'calc(var(--su) * 0.8) 0' }}
              >
                <div style={{ height: 'calc(var(--su) * 0.45)', borderRadius: 99, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)' }} />
                </div>
              </div>
              <button onClick={toggleFs} aria-label="Fullskjerm" style={{ color: 'rgba(253,252,251,0.7)', display: 'flex' }}>
                <FullscreenIcon />
              </button>
            </div>
          </div>
        )}

        {/* tynn alltid-synlig progresjonslinje */}
        {started && !chromeVisible && (
          <div className="absolute bottom-0 left-0 right-0 z-10" style={{ height: 'calc(var(--su) * 0.35)', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)' }} />
          </div>
        )}
      </div>
    </div>
  );
}
