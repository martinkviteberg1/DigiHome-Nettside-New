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
    desc: 'Kombiner langtids- og korttidsutleie for maksimal avkastning. 10 måneder fast leietaker, 2 måneder sesongutleie.',
    highlight: 'Opptil 30% høyere inntekt',
    popular: true,
  },
  {
    icon: Home,
    title: 'Langtidsutleie',
    subtitle: 'Trygg og forutsigbar',
    desc: 'Full forvaltning av langtidsutleie. Vi håndterer alt fra annonsering til vedlikehold og leietakeroppfølging.',
    highlight: 'Fast månedlig inntekt',
  },
  {
    icon: Zap,
    title: 'Korttidsutleie',
    subtitle: 'Airbnb & Booking.com',
    desc: 'Profesjonell korttidsutleie med styling, fotografering, dynamisk prising og gjesteservice.',
    highlight: 'Høy avkastning i sesong',
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
    <section className="py-28 sm:py-32 bg-white" data-testid="service-models-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">

        {/* ─────── Intro: eyebrow + H2 + subtitle ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-[760px] mx-auto mb-12 sm:mb-14"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cf97fc] mb-3">Slik fungerer det</p>
          <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-extrabold tracking-[-0.034em] leading-[1.02] text-[#0a0a0a]">
            Slik jobber DigiHome for deg.
          </h2>
          <p className="mt-5 sm:mt-6 text-[15.5px] sm:text-[17px] text-[#5e5749] leading-[1.6] max-w-[560px] mx-auto">
            Se hvordan vi gjør langtidsutleie smartere — fra første visning til siste leiebetaling.
          </p>
        </motion.div>

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
          className={`group relative overflow-hidden rounded-[20px] sm:rounded-[28px] bg-[#0a0a0a] ${audioMode ? '' : 'cursor-pointer'}`}
          style={{ boxShadow: '0 32px 80px -28px rgba(20,20,30,0.28), 0 12px 32px -12px rgba(20,20,30,0.14)' }}
          data-testid="service-models-video"
        >
          {/* AMBIENT video — muted, loop; lastes/avspilles først når den nærmer seg visning */}
          <video
            ref={ambientRef}
            muted
            loop
            playsInline
            preload="none"
            poster="/langtid-hero-poster.jpg"
            aria-hidden={audioMode}
            className="w-full h-auto block aspect-video object-cover transition-opacity duration-500"
            style={{ opacity: audioMode ? 0 : 1 }}
          >
            {videoInView && <source src="/langtid-hero-720p.mp4" media="(max-width: 768px)" type="video/mp4" />}
            {videoInView && <source src="/langtid-hero.mp4" type="video/mp4" />}
            Nettleseren din støtter ikke video.
          </video>

          {/* AUDIO video — only loads & plays on click */}
          <video
            ref={audioRef}
            playsInline
            preload="none"
            poster="/langtid-hero-poster.jpg"
            onEnded={handleAudioEnded}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: audioMode ? 1 : 0, pointerEvents: audioMode ? 'auto' : 'none' }}
            data-testid="service-models-video-audio"
          >
            <source src="/langtid-hero-audio.mp4" type="video/mp4" />
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

        {/* ─────── Big break — separates "story" from "products" ─────── */}
        <div className="h-24 sm:h-28 lg:h-32" aria-hidden />

        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-3"
            style={{ color: '#AE68E4' }}
          >
            Våre tjenester
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-[36px] sm:text-[42px] font-bold text-[#0a0a0a] tracking-[-0.03em] leading-[1.1]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Tre modeller for utleie
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[16px] text-[#888] max-w-[480px] mx-auto leading-relaxed mt-4"
          >
            Velg modellen som passer din eiendom best, eller la oss anbefale den optimale løsningen.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {models.map((m: any, i: number) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
              >
                <Link
                  href="/tjenester"
                  data-testid={`service-model-card-${i}`}
                  className="group relative block rounded-[20px] p-8 sm:p-9 transition-all duration-500 hover:-translate-y-1.5 h-full"
                  style={{
                    backgroundColor: m.popular ? '#0a0a0a' : '#eeeeee',
                    boxShadow: m.popular
                      ? '0 8px 40px rgba(0,0,0,0.20)'
                      : '0 0 0 0 transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!m.popular) e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    if (!m.popular) e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
                  }}
                >
                  {/* Popular badge */}
                  {m.popular && (
                    <span
                      className="absolute -top-3 left-8 text-[10px] font-bold uppercase tracking-[0.12em] px-4 py-1.5 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #c084fc, #AE68E4)',
                        color: '#fff',
                      }}
                    >
                      Mest populær
                    </span>
                  )}

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-7 transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundColor: m.popular ? 'rgba(174,104,228,0.2)' : '#e2e2e2',
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: m.popular ? '#c9a0f0' : '#777' }}
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* Title block */}
                  <h3
                    className="text-[20px] sm:text-[22px] font-bold tracking-[-0.02em] leading-tight"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: m.popular ? '#ffffff' : '#0a0a0a',
                    }}
                  >
                    {m.title}
                  </h3>
                  <p
                    className="text-[12px] font-medium mt-1.5 tracking-wide uppercase"
                    style={{ color: m.popular ? 'rgba(255,255,255,0.4)' : '#aaa' }}
                  >
                    {m.subtitle}
                  </p>

                  {/* Description */}
                  <p
                    className="text-[14px] leading-[1.7] mt-5"
                    style={{ color: m.popular ? 'rgba(255,255,255,0.55)' : '#777' }}
                  >
                    {m.desc}
                  </p>

                  {/* Footer */}
                  <div
                    className="flex items-center justify-between mt-8 pt-6"
                    style={{
                      borderTop: m.popular
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid #e0e0e0',
                    }}
                  >
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: m.popular ? '#c9a0f0' : '#AE68E4' }}
                    >
                      {m.highlight}
                    </span>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5"
                      style={{
                        backgroundColor: m.popular ? 'rgba(255,255,255,0.08)' : '#e2e2e2',
                      }}
                    >
                      <ArrowRight
                        className="w-3.5 h-3.5 transition-colors duration-300"
                        style={{
                          color: m.popular ? '#c9a0f0' : '#999',
                        }}
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
