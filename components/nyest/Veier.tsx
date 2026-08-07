import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// De to veiene — likestilt, i ren tekst. Ingen kort, ingen priser.
// ---------------------------------------------------------------------------

const VEIER = [
  {
    tittel: 'Selvforvaltning',
    tekst: 'Du styrer utleien selv i plattformen — annonser, kontrakter, depositum og husleie. Tilgjengelig i hele Norge.',
    href: '/selvforvaltning',
    lenke: 'Se selvforvaltning',
  },
  {
    tittel: 'Forvaltning',
    tekst: 'Vi tar jobben for deg — visninger, valg av leietaker og oppfølging gjennom hele leieforholdet.',
    href: '/forvaltning',
    lenke: 'Se forvaltning',
  },
];

export default function Veier() {
  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-veier">
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-24 sm:px-10 sm:pb-32 lg:px-16">
        <h2 className="e-reveal e-h2 max-w-[18ch]">Gjør det selv, eller få hjelp<span className="text-[#9B5BD6]">.</span></h2>

        <div className="mt-14 grid gap-12 sm:mt-16 sm:grid-cols-2 sm:gap-10 lg:gap-14">
          {VEIER.map((v) => (
            <div key={v.tittel} className="e-reveal">
              <span aria-hidden="true" className="e-line-in block h-px w-full bg-[#e5dfd4]" />
              <h3 className="mt-7 text-[22px] font-semibold tracking-[-0.015em] text-[#0a0a0a]">{v.tittel}</h3>
              <p className="e-body mt-3 max-w-[44ch]">{v.tekst}</p>
              <Link
                href={v.href}
                className="group mt-5 inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#0a0a0a] transition-colors hover:text-[#7c3aed]"
              >
                {v.lenke}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
