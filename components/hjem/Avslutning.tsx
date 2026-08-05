import React from 'react';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { site } from '@/lib/site';

// ---------------------------------------------------------------------------
// Avslutningen.
//
// Før var dette en fullbredde svart plate med et stramt rutenett — hard kant
// mot footeren, og siden endte i en murvegg. Nå ligger den mørke flaten som et
// avrundet panel på sand, med varm dybde i gradienten og én rolig glød. De tre
// veiene videre står som trykkflater til høyre, ikke som hårfine kolonner.
// ---------------------------------------------------------------------------

const snarveier = [
  { label: 'Full forvaltning', tittel: 'Bergen og omegn', href: '/forvaltning' },
  { label: 'Selvforvaltning', tittel: 'Hele Norge', href: '/selvforvaltning' },
  { label: 'Leter du etter bolig?', tittel: 'Se ledige boliger', href: '/ledige-boliger' },
];

export default function Avslutning() {
  return (
    <section className="e-tone-sand e-grain" data-testid="cta-section">
      <div className="e-shell py-14 sm:py-20 lg:py-24">
        <div className="e-panel-dark e-reveal px-6 py-12 sm:px-11 sm:py-16 lg:px-16 lg:py-20">
          {/* Én varm glød i hjrnet gir panelet dybde. Rutenettet er borte. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-[-8%] h-[560px] w-[560px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(160,98,222,0.20) 0%, transparent 62%)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 left-[-6%] h-[420px] w-[420px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,214,170,0.10) 0%, transparent 62%)' }}
          />

          <div className="relative grid items-end gap-x-12 gap-y-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-[7px] text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
                <span className="h-[5px] w-[5px] rounded-full bg-[#d298ff]" aria-hidden="true" />
                Kom i gang
              </span>

              <h2 className="e-display !text-white mt-6 max-w-[17ch] text-[33px] leading-[1.04] sm:text-[46px] lg:text-[56px]">
                Legg inn adressen. Vi tar det derfra.
              </h2>

              <p className="mt-5 max-w-[48ch] text-[16px] leading-[1.65] text-white/70 sm:text-[17.5px]">
                Du får en leievurdering og anbefalt utleiemodell innen 24 timer. Gratis,
                uforpliktende og uten at du binder deg til noe.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/bli-utleier/start" className="e-btn e-btn-light group" data-testid="cta-start-onboarding-button">
                  Registrer boligen
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a href={`tel:${site.phoneHref}`} className="e-btn e-btn-ghost !border-white/25 !text-white hover:!border-white/60 hover:!bg-white/[0.06]">
                  <Phone className="h-4 w-4" /> {site.phone}
                </a>
              </div>
            </div>

            {/* Veiene videre som trykkflater i et mykt glasskort. */}
            <div className="lg:col-span-5">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-2 backdrop-blur-sm">
                {snarveier.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group flex items-center justify-between gap-5 rounded-[16px] px-4 py-3.5 transition-colors duration-300 hover:bg-white/[0.07]"
                  >
                    <span className="min-w-0">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/45">{s.label}</span>
                      <span className="mt-1 block text-[15.5px] font-semibold text-white">{s.tittel}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
