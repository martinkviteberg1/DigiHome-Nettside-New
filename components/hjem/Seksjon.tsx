import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Felles seksjonsskall for forsiden.
//
// Rytmen er fortsatt asymmetrisk — tittel i venstre spalte, ingress i høyre,
// som et oppslag — men kapittelnummeret og den fullbredde hårfine linjen er
// borte. De leste som et arkivsystem, ikke som et produkt. I stedet står
// labelen som et mykt glass-merke, samme språk som chipen i heroen.
//
// `tone` styrer flaten: papir → hvit → sand. Sand og mist får et nesten
// usynlig korn, slik at store flater kjennes trykte i stedet for tomme.
// ---------------------------------------------------------------------------

const toner: Record<string, string> = {
  paper: 'e-tone-paper',
  hvit: 'e-tone-white',
  mist: 'e-tone-mist e-grain',
  sand: 'e-tone-sand e-grain',
};

export function Seksjon({ id, children, className = '', hvit = false, tone, testId, tight = false }: any) {
  const flate = toner[tone || (hvit ? 'hvit' : 'paper')] || toner.paper;
  return (
    <section
      id={id}
      data-testid={testId}
      className={`${tight ? 'e-section-tight' : 'e-section'} ${flate} ${className}`}
    >
      <div className="e-shell relative">{children}</div>
    </section>
  );
}

export function SeksjonHode({ label, tittel, ingress, lenke, lenkeTekst, children }: any) {
  return (
    <div className="relative">
      {label ? (
        <span className="e-chip e-reveal">
          <span className="e-chip-dot" aria-hidden="true" />
          {label}
        </span>
      ) : null}
      <div className="e-reveal mt-6 grid items-start gap-x-10 gap-y-6 sm:mt-8 lg:grid-cols-12">
        <h2 className="e-h2 max-w-[22ch] lg:col-span-7">{tittel}</h2>
        {(ingress || children || lenke) ? (
          <div className="lg:col-span-5 lg:pt-2.5">
            {ingress ? <p className="e-lead max-w-[44ch]">{ingress}</p> : null}
            {children}
            {lenke ? (
              <Link href={lenke} className="group mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[#0a0a0a] transition-colors hover:text-[#7c3aed]">
                {lenkeTekst}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
