import React from 'react';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { site } from '@/lib/site';

// Avslutningen er den eneste mørke flaten på siden. Da bærer den vekt uten å
// bruke gradienter eller glød, og den siste handlingen er umulig å overse.
export default function Avslutning() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] text-white" data-testid="cta-section">
      <div aria-hidden="true" className="e-grid-dark pointer-events-none absolute inset-0 opacity-70" />
      <div className="e-shell e-section relative">
        <span className="e-label !text-white/55">Kom i gang</span>
        <h2 className="e-display !text-white mt-6 text-[36px] sm:text-[54px] lg:text-[66px] max-w-[17ch]">
          Legg inn adressen. Vi tar det derfra.
        </h2>
        <p className="mt-6 text-[16.5px] sm:text-[18px] text-white/70 leading-[1.62] max-w-[50ch]">
          Du får en leievurdering og anbefalt utleiemodell innen 24 timer. Gratis,
          uforpliktende og uten at du binder deg til noe.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/bli-utleier/start" className="e-btn e-btn-light" data-testid="cta-start-onboarding-button">
            Registrer boligen <ArrowRight className="w-4 h-4" />
          </Link>
          <a href={`tel:${site.phoneHref}`} className="e-btn e-btn-ghost !border-white/25 !text-white hover:!border-white">
            <Phone className="w-4 h-4" /> {site.phone}
          </a>
        </div>

        <div className="mt-14 pt-7 border-t border-white/12 grid sm:grid-cols-3 gap-y-6 gap-x-10">
          <div>
            <p className="e-label !text-white/45">Full forvaltning</p>
            <Link href="/forvaltning" className="mt-2 inline-block text-[15px] font-semibold text-white hover:text-[#d298ff] transition-colors">
              Bergen og omegn
            </Link>
          </div>
          <div>
            <p className="e-label !text-white/45">Selvforvaltning</p>
            <Link href="/selvforvaltning" className="mt-2 inline-block text-[15px] font-semibold text-white hover:text-[#d298ff] transition-colors">
              Hele Norge
            </Link>
          </div>
          <div>
            <p className="e-label !text-white/45">Leter du etter bolig?</p>
            <Link href="/ledige-boliger" className="mt-2 inline-block text-[15px] font-semibold text-white hover:text-[#d298ff] transition-colors">
              Se ledige boliger
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
