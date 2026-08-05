import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Felles seksjonsskall for forsiden.
//
// Rytmen er den samme hele veien — indeks, label, hårfin linje, tittel — men
// den er BEVISST asymmetrisk: tittelen står i venstre spalte og ingressen i
// høyre, slik at siden leses som et oppslag i en trykksak. Den sentrerte
// «eyebrow → H2 → undertekst»-malen er nettopp det som får sider til å se
// maskingenerert ut, og den er derfor fjernet fra hele forsiden.
// ---------------------------------------------------------------------------

export function Seksjon({ id, children, className = '', hvit = false, testId, tight = false }: any) {
  return (
    <section
      id={id}
      data-testid={testId}
      className={`${tight ? 'e-section-tight' : 'e-section'} ${hvit ? 'bg-white' : 'bg-[#fdfcfb]'} ${className}`}
    >
      <div className="e-shell">{children}</div>
    </section>
  );
}

export function SeksjonHode({ indeks, label, tittel, ingress, lenke, lenkeTekst, children }: any) {
  return (
    <div className="relative">
      <div className="flex items-baseline gap-4">
        {/* Fra xl henger tallet ute i venstremargen — som et kapittelnummer i en
            trykksak. Under xl faller det inn på linje med labelen. */}
        {indeks ? <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">{indeks}</span> : null}
        <span className="e-label">{label}</span>
      </div>
      <div className="e-line e-line-in mt-4" />
      <div className="e-reveal pt-8 sm:pt-10 grid lg:grid-cols-12 gap-x-10 gap-y-6 items-end">
        <h2 className="e-h2 lg:col-span-7 max-w-[22ch]">{tittel}</h2>
        {(ingress || children || lenke) ? (
          <div className="lg:col-span-5 lg:pb-1.5">
            {ingress ? <p className="e-lead max-w-[44ch]">{ingress}</p> : null}
            {children}
            {lenke ? (
              <Link href={lenke} className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[#0a0a0a] hover:text-[#7c3aed] transition-colors">
                {lenkeTekst} <ArrowRight className="w-4 h-4" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
