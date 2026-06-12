'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { seg, clamp01, Orb, FilmGrain, LightSweep, Aurora, Bokeh } from './filmUtils';
import { scheduleMusic, renderMusicWav, FILM_DURATION } from './filmAudio';
import {
  SceneOpening, SceneToggle, SceneAdresse, SceneBilder, SceneStyling, SceneAnnonse, SceneVisning, SceneKontrakt, SceneDynamisk, SceneChat, SceneFinale,
} from './FilmScenes';

const DURATION = FILM_DURATION; /* 108s */
const MP4_URL = '/film/digihome-utleie-pa-autopilot-16x9.mp4';
const SCENE_BOUNDARIES = [8, 14, 20, 26, 38, 50, 62, 72.5, 81.5, 92];

/* «shift» lar en scene beholde sine interne tidskonstanter
   selv om den er flyttet senere i filmen (t - shift sendes inn) */
const SCENES = [
  { start: 0, end: 8.5, C: SceneOpening },
  { start: 8, end: 14.5, C: SceneToggle },
  { start: 14, end: 20.5, C: SceneAdresse },
  { start: 20, end: 26.5, C: SceneBilder },
  { start: 26, end: 38.5, C: SceneStyling, shift: 12 },
  { start: 38, end: 50.5, C: SceneAnnonse, shift: 24 },
  { start: 50, end: 62.5, C: SceneVisning, shift: 24 },
  { start: 62, end: 73, C: SceneKontrakt, shift: 24 },
  { start: 72.5, end: 82, C: SceneDynamisk, shift: 24 },
  { start: 81.5, end: 92.5, C: SceneChat, shift: 24 },
  { start: 92, end: 108, C: SceneFinale, shift: 24 },
];

/* kapitler (for spiller-UI) */
const CHAPTERS = [
  { t: 0, label: 'Åpning' },
  { t: 8, label: 'Autopilot på' },
  { t: 14, label: 'Adresse' },
  { t: 20, label: 'Bilder' },
  { t: 26, label: 'AI-styling' },
  { t: 38, label: 'Annonse' },
  { t: 50, label: 'Visninger & screening' },
  { t: 62, label: 'Kontrakt & husleie' },
  { t: 72.5, label: 'Dynamisk utleie' },
  { t: 81.5, label: 'Svar 24/7' },
  { t: 92, label: 'Finale' },
];

/* impact-kamerarist fjernet etter tilbakemelding — filmen skal være supersmooth */

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
  /* før start: vis filmens åpningsbilde som plakat */
  const displayT = started ? time : 5.2;

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
  const watermark = Math.min(seg(time, 8.5, 9.7), 1 - seg(time, 75, 76.2)) * 0.45;
  const engineOrb = Math.min(seg(time, 14.6, 15.6), 1 - seg(time, 56.5, 57.5)) * 0.85;

  /* vignett som «puster» i takt med musikkpulsen (kick hver 1,2s fra 10,8–67,8) */
  const kickGlow = started && time >= 10.8 && time <= 67.8
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
      onClick={recordMode ? undefined : () => { if (!started) { play(); } else if (!ended) { playing ? pause() : play(); } }}
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
        {/* visuelle lag — supersmooth, ingen kamerarist */}
        <div className="absolute inset-0">
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

        {/* scener (med ev. tidsshift) — før start vises filmens plakatbilde */}
        {SCENES.map(({ start, end, C, shift = 0 }, i) =>
          displayT >= start - 0.1 && displayT <= end + 0.1 ? <C key={i} t={displayT - shift} /> : null
        )}

        {/* forhåndslast styling-bildene (unngå hikk ved 14s) */}
        <div aria-hidden="true" style={{ display: 'none' }}>
          <img src="/film/styling/room-before.jpg" alt="" />
          <img src="/film/styling/room-day.jpg" alt="" />
          <img src="/film/styling/room-evening.jpg" alt="" />
        </div>

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
        {/* den reisende orben — fjernet etter tilbakemelding (forstyrrende).
            Gjeninnsatt: diskret, statisk motor-orb i hjørnet. */}
        {started && engineOrb > 0.01 && (
          <div className="absolute pointer-events-none" style={{ top: 'calc(var(--su) * 2.3)', right: 'calc(var(--su) * 2.1)', opacity: engineOrb * 0.85 }}>
            <Orb t={time} size="calc(var(--su) * 4.2)" speed={8} />
          </div>
        )}

        {/* filmkorn — pulserer ved treffpunkter */}
        {started && <FilmGrain t={time} opacity={0.05} />}
        </div>

        {/* startoverlegg — kun playknapp over filmens plakatbilde */}
        {!started && !recordMode && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(3,3,4,0.26), rgba(3,3,4,0.52) 100%)' }} />
            <button
              onClick={(e) => { e.stopPropagation(); play(); }}
              aria-label="Spill av"
              className="relative"
              style={{
                width: 'calc(var(--su) * 9)', height: 'calc(var(--su) * 9)', borderRadius: '50%',
                background: 'linear-gradient(135deg, #CF97FC, #9B5BD6)',
                color: '#0A0A0A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 calc(var(--su) * 5) rgba(207,151,252,0.45), 0 calc(var(--su)*0.8) calc(var(--su)*3) rgba(0,0,0,0.5)',
                transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <svg style={{ width: 'calc(var(--su) * 3.4)', height: 'calc(var(--su) * 3.4)', marginLeft: 'calc(var(--su) * 0.4)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.9-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14z" /></svg>
            </button>
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
