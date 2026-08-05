
import React from 'react';
import Reveal from '@/components/dh/Reveal';
import { ArrowRight } from 'lucide-react';

// Redaksjonelt, minimalistisk prosess-grid — ingen kort, chips eller dekor.
// Hairline-linjer + små numeraler i ink. Lilla brukes ikke her (kun logo/CTA).
// VIKTIG: Dette er en EKTE kundereise (adresse → utbetaling) — ikke en
// funksjonsliste. Funksjonene dekkes av tjenestekortene og 10+2-seksjonen.
const steps = [
  {
    num: '01',
    title: 'Registrer boligen',
    desc: 'Skriv inn adressen — det tar under to minutter. Vi bekrefter adressen og bruker tilgjengelige bolig- og markedsdata i vurderingen.',
  },
  {
    num: '02',
    title: 'Få vurdering og pris',
    desc: 'Innen 24 timer får du en datadrevet leievurdering og anbefalt utleiemodell for akkurat din bolig.',
  },
  {
    num: '03',
    title: 'Vi finner leietakerne',
    desc: 'Profesjonell annonsering, visninger og grundig screening. Kontrakten signeres digitalt med BankID.',
  },
  {
    num: '04',
    title: 'Du får utbetalt',
    desc: 'Husleien kommer automatisk hver måned — med full oversikt i portalen. Vi håndterer alt underveis.',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ backgroundColor: '#fdfcfb' }} data-testid="how-it-works-section">
      {/* Varm tekstur — samme formspråk som veiviseren: prikk-grid + myk lavendel-glød */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)', backgroundSize: '26px 26px', opacity: 0.28,
        maskImage: 'radial-gradient(ellipse 60% 55% at 22% 30%, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 22% 30%, black 20%, transparent 70%)',
      }} />
      <div aria-hidden className="pointer-events-none absolute -top-32 right-[8%] w-[640px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.07) 0%, transparent 65%)' }} />
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 relative">

        {/* Header — venstrestilt, redaksjonelt */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-16 sm:mb-20">
          <div>
            <Reveal as="div"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-5"
            >
              <span className="inline-flex items-center gap-3">
                <span className="w-7 h-[2px] rounded-full bg-[#d298ff]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6f6a60]">Slik fungerer det</span>
              </span>
            </Reveal>
            <Reveal as="h2"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="text-[36px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Fra adresse<br className="hidden sm:block" /> til utbetaling
            </Reveal>
          </div>
          <Reveal as="p"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[15.5px] text-[#6b665f] max-w-[300px] leading-[1.75] sm:text-right sm:pb-1.5"
          >
            Fire steg. Null stress. Vi håndterer alt — du nyter inntekten.
          </Reveal>
        </div>

        {/* Steg — hairline-kolonner, stille hover */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
          {steps.map((step, i) => (
            <Reveal as="div"
              key={step.num}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group border-t border-[#e3dfd6] pt-7 transition-colors duration-500 hover:border-[#d298ff]"
              data-testid={`how-step-${step.num}`}
            >
              <span className="block text-[13px] font-semibold text-[#7c7568] tabular-nums transition-colors duration-500 group-hover:text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                {step.num}
              </span>
              <h3 className="text-[19px] font-bold text-[#0a0a0a] mt-5 mb-2.5 tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>
                {step.title}
              </h3>
              <p className="text-[14.5px] text-[#6b665f] leading-[1.75]">
                {step.desc}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Stille CTA — kobler prosessen direkte til adressefeltet i veiviseren */}
        <Reveal as="div"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-14 sm:mt-16"
        >
          <a href="/bli-utleier/start" className="group inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#0a0a0a]" data-testid="how-it-works-cta">
            <span className="underline underline-offset-4 decoration-[#d8d3c8] group-hover:decoration-[#d298ff] transition-colors">Start med adressen din</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </Reveal>

      </div>
    </section>
  );
}
