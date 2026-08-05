'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from '@/lib/motion-lite';
import { TrendingUp, Home, Zap, ArrowRight, Volume2, VolumeX, Play } from 'lucide-react';

const models = [
  {
    icon: TrendingUp,
    title: 'Dynamisk utleie',
    subtitle: '10+2-modellen',
    desc: 'Ti måneder med fast leietaker, to måneder med sesongutleie. Samme bolig, to markeder.',
    highlight: 'Opptil 30 % høyere årsinntekt',
    popular: true,
  },
  {
    icon: Home,
    title: 'Langtidsutleie',
    subtitle: 'Trygg og forutsigbar',
    desc: 'Én leietaker, fast inntekt. Annonse, kontrakt, depositum og husleie går i plattformen.',
    highlight: 'Fast månedlig inntekt',
  },
  {
    icon: Zap,
    title: 'Korttidsutleie',
    subtitle: 'Airbnb og Booking.com',
    desc: 'Styling, foto, dynamisk prising og gjesteservice. Vi tar dialogen med gjestene.',
    highlight: 'Høyest inntekt i sesong',
  },
];

export default function ServiceModelsSection() {
  // Audio playback state — ambient muted loop is default; click "Spill av med lyd" → restart with audio
  const ambientRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLVideoElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const [audioMode, setAudioMode] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [videoInView, setVideoInView] = useState(false);

  // Utsett videolasting til den nærmer seg visning (sparer 4–6 MB ved sidelast,
  // spesielt viktig på mobil). Ambient-videoen starter da automatisk.
  useEffect(() => {
    const el = videoWrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVideoInView(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setVideoInView(true); io.disconnect(); } });
    }, { rootMargin: '250px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (videoInView && !audioMode) {
      const amb = ambientRef.current;
      if (amb) { try { amb.load(); } catch (e) {} amb.play().catch(() => {}); }
    }
  }, [videoInView, audioMode]);

  const handlePlayWithSound = async () => {
    const a = audioRef.current;
    if (!a) return;
    setAudioLoading(true);
    setAudioMode(true);
    try {
      a.currentTime = 0;
      a.muted = false;
      a.volume = 1;
      await a.play();
      ambientRef.current?.pause();
    } catch (e) {
      // Autoplay blocked or fetch error → revert
      setAudioMode(false);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleAudioEnded = () => {
    setAudioMode(false);
    const amb = ambientRef.current;
    if (amb) { amb.currentTime = 0; amb.play().catch(() => {}); }
  };

  const handleStopAudio = () => {
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    handleAudioEnded();
  };

  // Keyboard shortcut: Esc exits audio mode
  useEffect(() => {
    if (!audioMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleStopAudio(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [audioMode]);

  return (
    <section className="e-section e-tone-paper" data-testid="service-models-section">
      <div className="e-shell">

        {/* Redaksjonelt seksjonshode: indeks, label, hårfin linje. Den sentrerte
            malen med lilla strek over tittelen er fjernet — den er selve
            signaturen på en generisk side. */}
        <div className="mb-10 sm:mb-14 grid lg:grid-cols-12 gap-x-10 gap-y-6 items-end">
          <h2 className="e-h2 lg:col-span-7 max-w-[20ch]">Se hvordan utleien faktisk drives.</h2>
          <p className="e-lead lg:col-span-5 lg:pb-1.5 max-w-[44ch]">
            To minutter fra første visning til siste leiebetaling.
            Trykk hvor som helst i bildet for lyd.
          </p>
        </div>

        {/* ─────── Hero video — ambient + click-anywhere-to-sound ─────── */}
        <motion.div
          ref={videoWrapRef}
          initial={{ opacity: 0, scale: 0.985 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => { if (!audioMode && !audioLoading) handlePlayWithSound(); }}
          role={audioMode ? undefined : 'button'}
          tabIndex={audioMode ? -1 : 0}
          onKeyDown={(e) => { if (!audioMode && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handlePlayWithSound(); } }}
          aria-label={audioMode ? undefined : 'Spill av video med lyd'}
          className={`group relative overflow-hidden rounded-[18px] bg-[#0a0a0a] ${audioMode ? '' : 'cursor-pointer'}`}
          style={{ boxShadow: '0 28px 70px -36px rgba(20,20,30,0.28)' }}
          data-testid="service-models-video"
        >
          {/* AMBIENT video — muted, loop; lastes/avspilles først når den nærmer seg visning */}
          <video
            ref={ambientRef}
            muted
            loop
            playsInline
            preload="none"
            poster={videoInView ? '/brandfilm-poster.jpg' : undefined}
            aria-hidden={audioMode}
            className="w-full h-auto block aspect-video object-cover transition-opacity duration-500"
            style={{ opacity: audioMode ? 0 : 1 }}
          >
            {videoInView && <source src="/brandfilm-web.mp4" type="video/mp4" />}
            Nettleseren din støtter ikke video.
          </video>

          {/* AUDIO video — only loads & plays on click */}
          <video
            ref={audioRef}
            playsInline
            preload="none"
            poster={videoInView ? '/brandfilm-poster.jpg' : undefined}
            onEnded={handleAudioEnded}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: audioMode ? 1 : 0, pointerEvents: audioMode ? 'auto' : 'none' }}
            data-testid="service-models-video-audio"
          >
            <source src="/brandfilm-web.mp4" type="video/mp4" />
          </video>

          {/* Subtle bottom gradient — only on ambient state */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent transition-opacity duration-300"
            style={{ opacity: audioMode ? 0 : 1 }}
          />

          {/* Centered play indicator — Apple/YouTube-stil. Hele videoen er klikkbar. */}
          {!audioMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              data-testid="play-with-sound-overlay"
            >
              <div
                className="relative flex items-center justify-center w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-full bg-white/95 transition-all duration-300 group-hover:scale-110 group-hover:bg-white"
                style={{
                  backdropFilter: 'blur(18px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(180%)',
                  boxShadow: '0 18px 48px -12px rgba(0,0,0,0.55), 0 6px 16px -4px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.8)',
                }}
              >
                {/* Pulse-ring som dempes på hover */}
                <span aria-hidden className="absolute inset-0 rounded-full bg-white/40 animate-ping opacity-50 group-hover:opacity-0 transition-opacity duration-300" style={{ animationDuration: '2.4s' }} />
                {audioLoading ? (
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-[3px] border-[#0a0a0a]/20 border-t-[#0a0a0a] animate-spin" />
                ) : (
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 text-[#0a0a0a] ml-1" strokeWidth={2.2} fill="currentColor" />
                )}
              </div>
              <p className="mt-4 text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] text-white/95 inline-flex items-center gap-1.5"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                <Volume2 className="w-3 h-3" strokeWidth={2.4} />
                {audioLoading ? 'Laster...' : 'Spill av med lyd'}
              </p>
            </motion.div>
          )}

          {/* Stop / mute toggle — top-right when audio mode (stopper klikk-propagering så hele containeren ikke trigger) */}
          {audioMode && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => { e.stopPropagation(); handleStopAudio(); }}
              data-testid="stop-audio"
              aria-label="Demp og gå tilbake"
              className="absolute top-3 right-3 sm:top-5 sm:right-5 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-black/55 hover:bg-black/75 text-white text-[12px] font-semibold transition-all z-10"
              style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
            >
              <VolumeX className="w-3.5 h-3.5" strokeWidth={2} />
              Demp
            </motion.button>
          )}
        </motion.div>

        {/* ─────── Modellene som en hårfin indeks ───────
            Tre kort der ett er svart med badgen «Mest populær» er den mest
            gjenkjennelige AI-malen som finnes. Innholdet er det samme, men her
            leses det som en prisliste i en trykksak: navn, undertittel, én
            setning og hva modellen gir. Lenkene og testId-ene er uendret. */}
        <div className="h-16 sm:h-20 lg:h-24" aria-hidden />

        <div className="e-rule e-hair">
          {models.map((m: any, i: number) => (
            <Link
              key={i}
              href="/tjenester"
              data-testid={`service-model-card-${i}`}
              className="group grid lg:grid-cols-12 gap-x-10 gap-y-2 py-6 sm:py-8 items-baseline"
            >
              <div className="lg:col-span-4">
                <h3 className="e-h3 text-[20px] sm:text-[24px] transition-colors duration-300 group-hover:text-[#7c3aed]">{m.title}</h3>
                <p className="e-meta mt-2">{m.subtitle}</p>
              </div>
              <p className="e-body lg:col-span-6 max-w-[54ch]">{m.desc}</p>
              <div className="lg:col-span-2 flex items-center lg:justify-end">
                <ArrowRight className="w-4 h-4 shrink-0 text-[#8d877d] transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
