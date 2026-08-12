import React from 'react';

// ---------------------------------------------------------------------------
// Produktbeviset — verdensklasse-utgave. Desktop-dashbordet i nettleserramme
// som base, en kodet iPhone-mockup av mobilappen som overlapper nederst til
// høyre, og to flytende hendelseskort («Husleie mottatt», «Kontrakt signert»)
// som viser plattformen leve. Ambient glød bak, kapabilitets-chips over.
// Alt statisk/kodet — merket som illustrasjon.
// ---------------------------------------------------------------------------

const KAPABILITETER = [
  { navn: 'Betalinger', farge: '#0f9d6e' },
  { navn: 'Kontrakter', farge: '#9B5BD6' },
  { navn: 'Saker', farge: '#e08a00' },
  { navn: 'Meldinger', farge: '#0f87d1' },
];

function Sjekk({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Kodet mobilapp-mockup — hjemskjermen i DigiHome-appen. */
function Telefon() {
  return (
    <div className="w-full rounded-[38px] bg-[#0a0a0a] p-[8px] shadow-[0_50px_100px_-40px_rgba(28,22,14,0.55)] sm:rounded-[44px]">
      <div className="relative overflow-hidden rounded-[30px] bg-[#faf8f5] sm:rounded-[36px]">
        {/* Dynamic island */}
        <span aria-hidden="true" className="absolute left-1/2 top-2.5 h-[19px] w-[72px] -translate-x-1/2 rounded-full bg-[#0a0a0a]" />

        <div className="px-4 pb-4 pt-10 sm:px-5">
          <p className="text-[10.5px] text-[#8d877d]">Tirsdag 3. mars</p>
          <p className="mt-0.5 text-[16px] font-bold tracking-[-0.02em] text-[#0a0a0a]">God morgen, Martin</p>

          {/* Inntektskort */}
          <div className="mt-3 rounded-[18px] bg-[#0a0a0a] p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Leieinntekter · mars</p>
            <p className="mt-1 text-[21px] font-bold tracking-[-0.02em] text-white">16 500 kr</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-[3px] text-[10px] font-semibold text-[#7fe0b2]">
              <span className="h-[5px] w-[5px] rounded-full bg-[#7fe0b2]" /> Betalt 1. mars
            </span>
          </div>

          {/* Hendelser */}
          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center gap-2.5 rounded-[14px] border border-[#eee9e0] bg-white px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3ecfb] text-[#9B5BD6]"><Sjekk className="h-3 w-3" /></span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#0a0a0a]">Kontrakt signert</span>
                <span className="block truncate text-[10.5px] text-[#8d877d]">Thea N. · BankID</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-[14px] border border-[#eee9e0] bg-white px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e9f4fb] text-[11px] font-bold text-[#0f87d1]">S</span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#0a0a0a]">Ny melding</span>
                <span className="block truncate text-[10.5px] text-[#8d877d]">Sara svarte om visningen</span>
              </span>
            </div>
          </div>

          {/* Tab-linje */}
          <div className="mt-3.5 flex items-center justify-between border-t border-[#eee9e0] px-1.5 pt-3">
            {['Hjem', 'Meldinger', 'Økonomi', 'Meny'].map((t, i) => (
              <span key={t} className={`text-[9.5px] font-semibold ${i === 0 ? 'text-[#0a0a0a]' : 'text-[#b3aa9e]'}`}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Plattform() {
  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-plattform">
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-24 sm:px-10 sm:pb-32 lg:px-16">
        <h2 className="e-reveal e-h2 max-w-[20ch]">Én plattform for hele utleien<span className="text-[#9B5BD6]">.</span></h2>
        <p className="e-reveal e-lead mt-5 max-w-[54ch]">
          Betalinger, kontrakter, saker og meldinger — samlet i ett rolig dashbord. Og alt følger med i lomma.
        </p>

        {/* Kapabilitets-chips */}
        <div className="e-reveal mt-7 flex flex-wrap gap-2">
          {KAPABILITETER.map((k) => (
            <span key={k.navn} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#e5dfd4] bg-white px-3.5 text-[13px] font-medium text-[#3d382f]">
              <span className="h-[6px] w-[6px] rounded-full" style={{ background: k.farge }} />
              {k.navn}
            </span>
          ))}
        </div>

        <div className="e-reveal relative mt-12 sm:mt-14">
          {/* Ambient glød bak flatene */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[75%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9B5BD6] opacity-[0.07] blur-[110px]"
          />

          {/* Desktop — nettleserramme */}
          <div className="relative z-[1] overflow-hidden rounded-[16px] border border-[#e5dfd4] bg-white shadow-[0_40px_90px_-50px_rgba(28,22,14,0.35)]">
            <div className="relative flex items-center border-b border-[#eee9e0] bg-[#faf8f5] px-4 py-2.5">
              <span className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-[9px] w-[9px] rounded-full bg-[#e5dfd4]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#e5dfd4]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#e5dfd4]" />
              </span>
              <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[11.5px] text-[#8d877d]">
                app.digihome.no
              </span>
            </div>
            <img
              src="/deck-desktop.webp"
              alt="Utleiedashbordet i DigiHome-plattformen"
              loading="lazy"
              className="w-full"
            />
          </div>

          {/* Flytende hendelseskort — venstre */}
          <div className="animate-floaty absolute -left-4 top-14 z-[2] hidden items-center gap-3 rounded-[18px] border border-[#eee9e0] bg-white px-4 py-3 shadow-[0_28px_60px_-28px_rgba(28,22,14,0.4)] lg:flex xl:-left-8">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ef] text-[#0f9d6e]"><Sjekk className="h-4 w-4" /></span>
            <span>
              <span className="block text-[13px] font-semibold text-[#0a0a0a]">Husleie mottatt</span>
              <span className="block text-[11.5px] text-[#8d877d]">16 500 kr · Parkveien 12B</span>
            </span>
          </div>
          <div
            className="animate-floaty absolute -left-2 bottom-32 z-[2] hidden items-center gap-3 rounded-[18px] border border-[#eee9e0] bg-white px-4 py-3 shadow-[0_28px_60px_-28px_rgba(28,22,14,0.4)] lg:flex xl:-left-6"
            style={{ animationDelay: '1.8s' }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3ecfb] text-[#9B5BD6]"><Sjekk className="h-4 w-4" /></span>
            <span>
              <span className="block text-[13px] font-semibold text-[#0a0a0a]">Kontrakt signert</span>
              <span className="block text-[11.5px] text-[#8d877d]">BankID · for 2 min siden</span>
            </span>
          </div>

          {/* Mobilappen — overlapper nederst til høyre */}
          <div className="absolute -bottom-10 right-3 z-[2] w-[160px] sm:-bottom-14 sm:right-8 sm:w-[210px] lg:-bottom-16 lg:w-[248px]">
            <Telefon />
          </div>
        </div>

        <p className="e-meta mt-20 sm:mt-24">Illustrasjon av utleiedashbordet — samme oversikt på desktop og i mobilappen.</p>
      </div>
    </section>
  );
}
