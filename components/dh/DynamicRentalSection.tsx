'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from '@/lib/motion-lite';
import { Heart, MapPin, Home, Sun } from 'lucide-react';

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
    <section className="e-section e-tone-sand e-grain" data-testid="dynamic-rental-section">
      <div className="e-shell">
        <span className="e-chip">
          <span className="e-chip-dot" aria-hidden="true" />
          10+2-modellen
        </span>

        <div className="mt-6 sm:mt-9 grid lg:grid-cols-12 gap-x-16 gap-y-14 items-start">

          {/* ── Venstre: argumentet ── */}
          <div className="lg:col-span-6">
            <h2 className="e-h2 max-w-[14ch]">Dynamisk utleie</h2>
            <p className="e-lead mt-6 max-w-[46ch]">
              Ti måneder med fast leietaker, to måneder med sesongutleie. For egnede boliger kan
              scenarioet vise opptil 30 % høyere årsinntekt enn ren langtidsutleie.
            </p>

            {/* Modusvelgeren: to hårfine rader der tallet ER ikonet. De tintede
                ikonfirkantene er borte — de sa ingenting «10» og «2» ikke sier. */}
            <div className="mt-10">
              {[
                { key: 'long', tall: '10', tittel: 'måneder langtidsleie', body: 'Stabil inntekt hele året. Annonseres på Finn.no og Hybel.no.', testId: 'mode-long-term' },
                { key: 'short', tall: '2', tittel: 'måneder korttidsutleie', body: 'Premium-priser om sommeren. Annonseres på Airbnb og Booking.', testId: 'mode-short-term' },
              ].map((m: any) => {
                const aktiv = mode === m.key;
                return (
                  <div
                    key={m.key}
                    onClick={() => pick(m.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(m.key); } }}
                    data-testid={m.testId}
                    className={`cursor-pointer pl-5 py-4 border-l-2 transition-colors duration-300 ${aktiv ? 'border-[#0a0a0a]' : 'border-[#e6e1d9] hover:border-[#c2bab0]'}`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className={`e-display e-num text-[27px] ${aktiv ? '' : '!text-[#c2bab0]'}`}>{m.tall}</span>
                      <h3 className={`text-[15.5px] font-semibold ${aktiv ? 'text-[#0a0a0a]' : 'text-[#6f6a60]'}`}>{m.tittel}</h3>
                    </div>
                    <p className="e-meta mt-1.5 max-w-[42ch]">{m.body}</p>
                  </div>
                );
              })}
            </div>

            {/* Regnestykket som tabell, med forbeholdet synlig. Gradienttekst på
                «+30 %» er fjernet: et tall som betyr noe trenger ikke farge. */}
            <div className="mt-12 e-rule pt-7">
              <div className="flex flex-wrap items-end gap-x-14 gap-y-6">
                <div>
                  <p className="e-label">Kun langtid</p>
                  <p className="e-display e-num text-[22px] mt-2 !text-[#6f6a60]">{'180 000 kr'}</p>
                </div>
                <div>
                  <p className="e-label">Med 10+2</p>
                  <p className="e-display e-num text-[22px] mt-2">{'234 000 kr'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="e-display text-[31px] leading-none">+30 %</p>
                  <p className="e-meta mt-2">årlig merinntekt</p>
                </div>
              </div>
              <p className="e-meta mt-6 max-w-[54ch]">
                Eksempelberegning for en egnet bolig — ikke en garanti.{' '}
                <Link href="/metode" className="e-link">Se metode og forbehold</Link>.
              </p>
            </div>
          </div>

          {/* ── Right: Animated Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative lg:col-span-6"
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
        <span className="text-white text-[11px]">Eiendom &rsaquo; Bolig til leie</span>
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
          <span className="text-[13px] text-[#555]">Nordnesveien 13, 5005 Bergen</span>
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
              <p className="text-[11px] font-semibold text-[#333]">Digihome AS</p>
              <p className="text-[10px] text-[#6b6b6b]">Profesjonell utleier</p>
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
        <button aria-label="Lagre i favoritter" className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors duration-200">
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
          <span className="shrink-0 rounded-full border border-[#ddd7d0] px-2.5 py-1 text-[10.5px] font-semibold text-[#5f5a54]">Eksempel</span>
        </div>

        <p className="text-[13px] text-[#717171]">Hele leiligheten &middot; 3 rom &middot; 4 gjester</p>
        <p className="text-[13px] text-[#717171] mt-0.5">28. juni &#8211; 3. juli &middot; 5 netter</p>

        {/* Price */}
        <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-bold text-[#222] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>2 450 kr</span>
            <span className="text-[13px] text-[#717171]">natt</span>
          </div>
          <p className="text-[12px] text-[#6b6b6b] mt-1">Totalt 12 250 kr inkl. avgifter</p>
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
