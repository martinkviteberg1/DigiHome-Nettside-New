'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-lite';
import { Star, Heart, MapPin, Home, Sun } from 'lucide-react';

const LISTING_IMG = '/interior-kitchen-bar.webp';

/* Finn.no logo as styled text wordmark */
const FinnLogo = ({ className }: any) => (
  <span className={className} style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '-0.02em' }}>
    FINN.NO
  </span>
);

export default function DynamicRentalSection() {
  const [mode, setMode] = useState('long');
  const cycleRef = useRef<any>(null);

  const startCycle = () => {
    if (cycleRef.current) clearInterval(cycleRef.current);
    cycleRef.current = setInterval(() => {
      setMode((p: any) => p === 'long' ? 'short' : 'long');
    }, 6000);
  };

  useEffect(() => {
    startCycle();
    return () => { if (cycleRef.current) clearInterval(cycleRef.current); };
  }, []);

  const pick = (m: any) => { setMode(m); startCycle(); };

  const cardVariants = {
    enter: { opacity: 0, y: 12 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: '#fdfcfb' }} data-testid="dynamic-rental-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* ── Left: Text ── */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Dynamisk utleie
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-[15px] text-[#777] leading-[1.75] mt-5 max-w-[46ch]"
            >
              V&#229;r 10+2-modell kombinerer det beste fra to verdener &mdash;
              og gir deg opptil 40&nbsp;% h&#248;yere &#229;rsinntekt enn tradisjonell utleie.
            </motion.p>

            {/* Two modes */}
            <div className="mt-10 space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: 0.12 }}
                className={`flex gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  mode === 'long'
                    ? 'bg-[#f8f7f5] shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
                    : 'bg-transparent hover:bg-[#fafaf9]'
                }`}
                onClick={() => pick('long')}
                data-testid="mode-long-term"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  mode === 'long' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0f0]'
                }`}>
                  <Home className="w-4 h-4" style={{ color: mode === 'long' ? '#fff' : '#aaa' }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                    10 m&#229;neder langtidsleie
                  </h3>
                  <p className="text-[13px] text-[#999] leading-[1.6] mt-0.5">
                    Stabil inntekt hele &#229;ret. Annonseres p&#229; Finn.no og Hybel.no.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className={`flex gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                  mode === 'short'
                    ? 'bg-[#faf5ff] shadow-[0_1px_4px_rgba(207,151,252,0.08)]'
                    : 'bg-transparent hover:bg-[#fafaf9]'
                }`}
                onClick={() => pick('short')}
                data-testid="mode-short-term"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  mode === 'short' ? 'bg-[#cf97fc]' : 'bg-[#f0f0f0]'
                }`}>
                  <Sun className="w-4 h-4" style={{ color: mode === 'short' ? '#fff' : '#aaa' }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                    2 m&#229;neder korttidsutleie
                  </h3>
                  <p className="text-[13px] text-[#999] leading-[1.6] mt-0.5">
                    Premium-priser om sommeren. Annonseres p&#229; Airbnb og Booking.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Income stat */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="flex items-center gap-6 mt-10 pt-8 border-t border-[#f0f0f0]"
            >
              <div>
                <p className="text-[11px] text-[#737373] uppercase tracking-[0.05em] font-medium">Kun langtid</p>
                <p className="text-[18px] font-bold text-[#ccc] mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>180 000 kr</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <div>
                <p className="text-[11px] text-[#9b6cc4] uppercase tracking-[0.05em] font-medium">10+2 modellen</p>
                <p className="text-[18px] font-bold text-[#0a0a0a] mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>252 000 kr</p>
              </div>
              <div className="ml-auto">
                <p className="text-[28px] font-bold text-[#0a0a0a] leading-none tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>+30%</p>
                <p className="text-[11px] text-[#737373] mt-0.5">&#229;rlig merinntekt</p>
              </div>
            </motion.div>
          </div>

          {/* ── Right: Animated Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
            style={{ height: '620px' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-x-0 top-0"
              >
                {mode === 'long' ? <FinnCard /> : <AirbnbCard />}
              </motion.div>
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </section>
  );
}


/* ═══════════════════════════════════════════════
   FINN.NO CARD – Authentic listing style
   ═══════════════════════════════════════════════ */
function FinnCard() {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.03),0_16px_48px_rgba(0,0,0,0.08)] overflow-hidden border border-[#f0f0f0]" data-testid="finn-card">
      {/* Top bar */}
      <div className="bg-[#0063fb] px-5 py-2.5 flex items-center justify-between">
        <FinnLogo className="text-[16px] text-white" />
        <span className="text-white/60 text-[11px]">Eiendom &rsaquo; Bolig til leie</span>
      </div>

      {/* Image */}
      <div className="relative">
        <img src={LISTING_IMG} alt="Leilighet" loading="lazy" className="w-full h-[260px] object-cover" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-[#0063fb] text-white text-[10px] font-bold px-2.5 py-[5px] rounded-md uppercase tracking-wider">Ny annonse</span>
        </div>
        <div className="absolute bottom-2.5 right-2.5 bg-black/55 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-lg font-medium">
          1 / 14
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {/* Price row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[22px] font-bold text-[#1b1b1b] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>15 000 kr</span>
            <span className="text-[13px] text-[#767676] ml-1">/ m&#229;ned</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0063fb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><path d="M18 8v6"/><path d="M6 12h6"/><path d="M6 8h2"/><path d="M6 16h2"/></svg>
          </div>
        </div>

        {/* Title & location */}
        <h3 className="text-[17px] font-bold text-[#1b1b1b] leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
          Pen og lys 3-roms p&#229; Nordnes
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5">
          <MapPin className="w-3 h-3 text-[#0063fb]" />
          <span className="text-[13px] text-[#555]">Nordnesveien 8, 5005 Bergen</span>
        </div>

        {/* Details row */}
        <div className="flex items-center gap-3 mt-3.5 text-[12px] text-[#767676]">
          <span>68 m&#178;</span>
          <span className="text-[#737373]">&middot;</span>
          <span>3 rom</span>
          <span className="text-[#737373]">&middot;</span>
          <span>2 soverom</span>
          <span className="text-[#737373]">&middot;</span>
          <span>M&#248;blert</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {['Langtidsleie', 'Balkong', 'Heis', 'Inkl. internett'].map((t: any) => (
            <span key={t} className="bg-[#eef4ff] text-[#0063fb] text-[10px] font-semibold px-2.5 py-[4px] rounded-lg">{t}</span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#f0f0f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#0063fb] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">D</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#333]">SHD Forvaltning AS</p>
              <p className="text-[10px] text-[#999]">Profesjonell utleier</p>
            </div>
          </div>
          <button className="bg-[#0063fb] text-white text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0050d0] transition-colors duration-200">
            Send melding
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   AIRBNB CARD – Authentic listing style
   ═══════════════════════════════════════════════ */
function AirbnbCard() {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.03),0_16px_48px_rgba(0,0,0,0.08)] overflow-hidden border border-[#f0f0f0]" data-testid="airbnb-card">
      {/* Airbnb header bar */}
      <div className="px-5 py-2.5 flex items-center justify-between border-b border-[#f0f0f0]">
        <span className="text-[18px] font-bold text-[#FF385C] tracking-tight" style={{ fontFamily: "'Cereal', 'Figtree', sans-serif" }}>airbnb</span>
        <span className="text-[11px] text-[#717171]">Nordnes, Bergen</span>
      </div>

      {/* Image */}
      <div className="relative">
        <img src={LISTING_IMG} alt="Leilighet" loading="lazy" className="w-full h-[260px] object-cover" />

        {/* Top badges */}
        <div className="absolute top-3.5 left-3.5">
          <span className="bg-white text-[11px] font-bold text-[#222] px-3 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            Gjestfavoritt
          </span>
        </div>
        <button className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors duration-200">
          <Heart className="w-4 h-4 text-[#333]" strokeWidth={2} />
        </button>

        {/* Photo dots */}
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-[5px]">
          {[true, false, false, false, false].map((a: any, i: number) => (
            <div key={i} className={`w-[6px] h-[6px] rounded-full transition-opacity ${a ? 'bg-white' : 'bg-white/45'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-[17px] font-bold text-[#222] leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
            Pen og lys 3-roms på Nordnes, Bergen
          </h3>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <Star className="w-3.5 h-3.5 fill-[#222] text-[#222]" />
            <span className="text-[14px] font-bold text-[#222]">4.92</span>
            <span className="text-[12px] text-[#999]">(47)</span>
          </div>
        </div>

        <p className="text-[13px] text-[#717171]">Hele leiligheten &middot; 3 rom &middot; 4 gjester</p>
        <p className="text-[13px] text-[#717171] mt-0.5">28. juni &#8211; 3. juli &middot; 5 netter</p>

        {/* Price */}
        <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-bold text-[#222] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>2 450 kr</span>
            <span className="text-[13px] text-[#717171]">natt</span>
          </div>
          <p className="text-[12px] text-[#999] mt-1">Totalt 12 250 kr inkl. avgifter</p>
        </div>

        {/* Footer: Superhost + Reserve */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#f0f0f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">D</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#222]">DigiHome</p>
              <div className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#FF385C" stroke="none"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                <span className="text-[10px] text-[#717171]">Supervert</span>
              </div>
            </div>
          </div>
          <button className="text-white text-[12px] font-semibold px-5 py-2.5 rounded-lg transition-colors duration-200" style={{ background: 'linear-gradient(to right, #E31C5F, #FF385C)' }}>
            Reserver
          </button>
        </div>
      </div>
    </div>
  );
}
