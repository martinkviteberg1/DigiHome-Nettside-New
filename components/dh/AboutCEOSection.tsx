
import React from 'react';
import Reveal from '@/components/dh/Reveal';

export default function AboutCEOSection() {
  return (
    <section className="e-section" style={{ backgroundColor: '#fdfcfb' }} data-testid="about-ceo-section">
      <div className="e-shell">
        <div className="relative flex items-baseline gap-4">
          <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">09</span>
          <span className="e-label">Om DigiHome</span>
        </div>

        <div className="e-rule mt-4 pt-10 sm:pt-14 grid lg:grid-cols-12 gap-x-16 gap-y-10 items-start">

          {/* Sitatet satt i display-snittet, uten kursiv. Lang kursiv brødtekst
              leser som en sjablong; store anførselstegn og luft leser som en
              person som faktisk har sagt noe. */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <h2 className="e-h2 max-w-[20ch]">Teknologien gir dataene. Menneskene gjør jobben.</h2>

            <blockquote className="mt-9 sm:mt-11">
              <p className="e-quote text-[20px] sm:text-[26px] max-w-[38ch]">
                «Vi startet DigiHome i Bergen fordi vi så at utleie var modent for en ny
                tilnærming. Teknologien gir oss dataene — hvilke måneder som gir best
                avkastning, når prisene bør justeres, hvordan vi optimaliserer belegg.»
              </p>
              <p className="e-body mt-7 max-w-[54ch]">
                «Men det er menneskene våre som gjør forskjellen. Et dedikert team som kjenner
                Bergen og eiendommen din, følger opp leietakere, og behandler hjemmet ditt som
                sitt eget.»
              </p>
            </blockquote>

            <div className="e-rule mt-10 pt-5">
              <p className="text-[15.5px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Sarah Sleeman</p>
              <p className="e-meta mt-1.5">Daglig leder og eiendomsmegler, DigiHome</p>
            </div>
          </div>

          {/* Portrettet uten gradientform bak og uten 32 px runding: ett bilde,
              beskåret som et portrett, med bildetekst. */}
          <Reveal as="div"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 order-1 lg:order-2"
          >
            <div className="e-frame max-w-[420px]">
              <img
                src="/sarah.webp"
                alt="Sarah Sleeman, daglig leder i DigiHome"
                className="w-full object-cover"
                style={{ aspectRatio: '3 / 4' }}
                loading="lazy"
              />
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
