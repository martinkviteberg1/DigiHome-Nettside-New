import React from 'react';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { site } from '@/lib/site';

// ---------------------------------------------------------------------------
// Avslutningen — sidens eneste mørke flate.
//
// Ikke et avrundet panel som ligger på en tonet seksjon (da blir det en boks i
// en boks), men én rolig fullbredde flate med stor typografi og luft. Rutenett,
// glasskort og glorier er fjernet; kontrasten mot papiret over er effekten.
// Footeren fortsetter i samme tone, slik at siden lander i étt stykke.
// ---------------------------------------------------------------------------

const snarveier = [
  { label: 'Full forvaltning', tittel: 'Bergen og omegn', href: '/forvaltning' },
  { label: 'Selvforvaltning', tittel: 'Hele Norge', href: '/selvforvaltning' },
  { label: 'Leter du etter bolig?', tittel: 'Se ledige boliger', href: '/ledige-boliger' },
];

export default function Avslutning() {
  return (
    <section className="relative overflow-hidden bg-[#0B0A09] text-white" data-testid="cta-section">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-8%] h-[620px] w-[620px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.15) 0%, transparent 62%)' }}
      />

      <div className="e-shell relative py-20 sm:py-28 lg:py-32">
        <p className="e-eyebrow e-eyebrow-dark e-reveal">Kom i gang</p>

        <h2 className="e-display e-reveal !text-white mt-8 max-w-[17ch] text-[38px] leading-[1.02] sm:text-[56px] lg:text-[68px]">
          Legg inn adressen. Vi tar det derfra.
        </h2>

        <p className="e-reveal mt-7 max-w-[46ch] text-[16.5px] leading-[1.65] text-white/65 sm:text-[18px]">
          Du får leievurdering og anbefalt utleiemodell innen 24 timer. Gratis, uforpliktende
          og uten at du binder deg til noe.
        </p>

        <div className="e-reveal mt-10 flex flex-wrap items-center gap-3">
          <Link href="/bli-utleier/start" className="e-btn e-btn-light group" data-testid="cta-start-onboarding-button">
            Registrer boligen
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <a href={`tel:${site.phoneHref}`} className="e-btn e-btn-ghost !border-white/25 !text-white hover:!border-white/60 hover:!bg-white/[0.06]">
            <Phone className="h-4 w-4" /> {site.phone}
          </a>
        </div>

        {/* Veiene videre som ren tekst over en hårfin linje. */}
        <div className="e-reveal mt-16 grid gap-x-12 border-t border-white/10 pt-9 sm:mt-20 sm:grid-cols-3">
          {snarveier.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center justify-between gap-5 border-b border-white/[0.08] py-4 sm:border-b-0 sm:py-0"
            >
              <span className="min-w-0">
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/40">{s.label}</span>
                <span className="mt-1.5 block text-[16px] font-semibold text-white">{s.tittel}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-white/35 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
