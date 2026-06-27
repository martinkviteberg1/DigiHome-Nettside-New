
import React from 'react';
import Reveal from '@/components/dh/Reveal';

export default function AboutCEOSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-40 overflow-hidden" style={{ backgroundColor: '#fdfcfb' }} data-testid="about-ceo-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">

        <div className="grid lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-24 items-center">

          {/* Left: Quote + attribution */}
          <div className="order-2 lg:order-1">
            <Reveal as="p"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4 }}
              className="text-[11px] font-semibold text-[#cf97fc] uppercase tracking-[0.12em] mb-5"
            >
              Om DigiHome
            </Reveal>

            <Reveal as="h2"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold tracking-[-0.03em] leading-[1.06] text-[#0a0a0a]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Mennesker og teknologi, h&aring;nd i h&aring;nd
            </Reveal>

            <Reveal as="blockquote"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mt-8 sm:mt-10"
            >
              <p className="text-[16px] sm:text-[17px] text-[#555] leading-[1.85] italic">
                &laquo;Vi startet DigiHome i Bergen fordi vi s&aring; at utleie var modent for en ny tiln&aelig;rming. Teknologien gir oss dataene &mdash; hvilke m&aring;neder som gir best avkastning, n&aring;r prisene b&oslash;r justeres, hvordan vi optimaliserer belegg.&raquo;
              </p>
              <p className="text-[16px] sm:text-[17px] text-[#555] leading-[1.85] italic mt-5">
                &laquo;Men det er menneskene v&aring;re som gj&oslash;r forskjellen. Et dedikert team som kjenner Bergen og eiendommen din, f&oslash;lger opp leietakere, og behandler hjemmet ditt som sitt eget.&raquo;
              </p>
            </Reveal>

            {/* Author */}
            <Reveal as="div"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="mt-10"
            >
              <div className="flex items-center gap-4">
                <div className="w-[3px] h-12 rounded-full bg-[#cf97fc]" />
                <div>
                  <p className="text-[16px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Sarah Sleeman</p>
                  <p className="text-[13px] text-[#999] mt-0.5">Daglig leder &amp; eiendomsmegler, DigiHome</p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right: Portrait — native portrait ratio */}
          <Reveal as="div"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <div className="relative w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[460px]">
              {/* Subtle accent shape behind — hidden on mobile */}
              <div
                className="hidden sm:block absolute -top-5 -right-5 lg:-top-6 lg:-right-6 w-full h-full rounded-[32px]"
                style={{ background: 'linear-gradient(135deg, #f3ecff 0%, #faf8f5 100%)' }}
              />
              <div className="relative rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.08)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
                <img
                  src="/sarah.webp"
                  alt="Sarah Sleeman, Daglig leder i DigiHome"
                  className="w-full object-cover"
                  style={{ aspectRatio: '3 / 4' }}
                  loading="lazy"
                />
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
