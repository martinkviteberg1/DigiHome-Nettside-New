import React from 'react';

// ---------------------------------------------------------------------------
// Produktbeviset — desktop-dashbordet (litt nedskalert) + en stor, slank og
// premium iPhone-mockup av mobilappen som overlapper til høyre. Titanramme
// med sideknapper, statuslinje, dynamic island, inntektskort med sparkline,
// nøkkeltall, hendelser og tab-linje med ikoner. Flytende hendelseskort og
// ambient glød. Alt statisk/kodet — merket som illustrasjon.
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

const TABS = [
  { navn: 'Hjem', d: 'M3 10.5L12 3l9 7.5M5.5 9.5V20h13V9.5' },
  { navn: 'Meldinger', d: 'M4 5h16v11H9l-5 4V5z' },
  { navn: 'Økonomi', d: 'M5 20v-8M12 20V6M19 20v-11' },
  { navn: 'Meny', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
];

/* Stor, slank iPhone-mockup — hjemskjermen i DigiHome-appen. */
function Telefon() {
  return (
    <div className="relative">
      {/* Sideknapper */}
      <span aria-hidden="true" className="absolute -left-[2px] top-[104px] h-6 w-[3px] rounded-full bg-[#3f3f42]" />
      <span aria-hidden="true" className="absolute -left-[2px] top-[142px] h-10 w-[3px] rounded-full bg-[#3f3f42]" />
      <span aria-hidden="true" className="absolute -left-[2px] top-[188px] h-10 w-[3px] rounded-full bg-[#3f3f42]" />
      <span aria-hidden="true" className="absolute -right-[2px] top-[152px] h-14 w-[3px] rounded-full bg-[#3f3f42]" />

      {/* Titanramme */}
      <div className="rounded-[52px] bg-gradient-to-b from-[#4a4a4d] via-[#2c2c2f] to-[#1b1b1e] p-[2.5px] shadow-[0_70px_140px_-50px_rgba(28,22,14,0.6)]">
        <div className="rounded-[50px] bg-[#0a0a0a] p-[7px]">
          <div className="relative aspect-[9/19.2] overflow-hidden rounded-[43px] bg-[#faf8f5]">
            {/* Dynamic island */}
            <span aria-hidden="true" className="absolute left-1/2 top-[11px] z-[2] h-[25px] w-[88px] -translate-x-1/2 rounded-full bg-[#0a0a0a]" />

            <div className="flex h-full flex-col">
              {/* Statuslinje */}
              <div className="flex items-center justify-between px-7 pt-[15px]">
                <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#0a0a0a]">09:41</span>
                <span className="flex items-center gap-[5px]" aria-hidden="true">
                  <span className="flex items-end gap-[1.5px]">
                    <span className="h-[4px] w-[3px] rounded-[1px] bg-[#0a0a0a]" />
                    <span className="h-[6px] w-[3px] rounded-[1px] bg-[#0a0a0a]" />
                    <span className="h-[8px] w-[3px] rounded-[1px] bg-[#0a0a0a]" />
                    <span className="h-[10px] w-[3px] rounded-[1px] bg-[#0a0a0a]" />
                  </span>
                  <svg viewBox="0 0 16 12" className="h-[11px] w-[15px]" fill="none" aria-hidden="true">
                    <path d="M1.5 4.5a9.5 9.5 0 0113 0M4 7.2a6 6 0 018 0M6.5 9.8a2.6 2.6 0 013 0" stroke="#0a0a0a" strokeWidth="1.7" strokeLinecap="round" />
                    <circle cx="8" cy="11" r="1" fill="#0a0a0a" />
                  </svg>
                  <span className="relative ml-[1px] h-[11px] w-[21px] rounded-[3.5px] border border-[#0a0a0a]/40">
                    <span className="absolute bottom-[1.5px] left-[1.5px] top-[1.5px] w-[13px] rounded-[2px] bg-[#0a0a0a]" />
                    <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r-full bg-[#0a0a0a]/40" />
                  </span>
                </span>
              </div>

              {/* Innhold */}
              <div className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-5">
                <div className="flex shrink-0 items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#8d877d]">Tirsdag 3. mars</p>
                    <p className="mt-0.5 text-[19px] font-bold tracking-[-0.02em] text-[#0a0a0a]">God morgen, Martin</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efe7fa] text-[13px] font-bold text-[#7c3fbf]">M</span>
                </div>

                {/* Inntektskort med sparkline */}
                <div className="relative mt-3.5 shrink-0 overflow-hidden rounded-[22px] bg-[#0a0a0a] p-4">
                  <div
                    aria-hidden="true"
                    className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#9B5BD6] opacity-25 blur-2xl"
                  />
                  <div className="relative flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Leieinntekter</p>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-[4px] text-[10px] font-semibold text-[#7fe0b2]">
                      <span className="h-[5px] w-[5px] rounded-full bg-[#7fe0b2]" /> Betalt 1. mars
                    </span>
                  </div>
                  <div className="relative mt-1.5 flex items-end justify-between gap-3">
                    <p className="text-[25px] font-bold tracking-[-0.02em] text-white">16 500 kr</p>
                    <svg viewBox="0 0 92 30" className="mb-1 h-[26px] w-[80px]" fill="none" aria-hidden="true">
                      <path d="M2 24C12 22 16 25 24 20s12-9 20-8 12 7 20 3 14-9 24-11" stroke="#7fe0b2" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="88" cy="8" r="2.6" fill="#7fe0b2" />
                    </svg>
                  </div>
                </div>

                {/* Nøkkeltall */}
                <div className="mt-2.5 grid shrink-0 grid-cols-2 gap-2.5">
                  <div className="rounded-[16px] border border-[#eee9e0] bg-white px-3.5 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#b3aa9e]">Belegg</p>
                    <p className="mt-0.5 text-[16px] font-bold text-[#0a0a0a]">100 %</p>
                  </div>
                  <div className="rounded-[16px] border border-[#eee9e0] bg-white px-3.5 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#b3aa9e]">Åpne saker</p>
                    <p className="mt-0.5 text-[16px] font-bold text-[#0a0a0a]">0</p>
                  </div>
                </div>

                {/* Hendelser */}
                <p className="mt-3.5 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#b3aa9e]">I dag</p>
                <div className="mt-2 shrink-0 space-y-2">
                  <div className="flex items-center gap-3 rounded-[16px] border border-[#eee9e0] bg-white px-3.5 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3ecfb] text-[#9B5BD6]"><Sjekk className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[#0a0a0a]">Kontrakt signert</span>
                      <span className="block truncate text-[11px] text-[#8d877d]">Thea N. · BankID</span>
                    </span>
                    <span className="ml-auto shrink-0 text-[10.5px] text-[#b3aa9e]">Nå</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-[16px] border border-[#eee9e0] bg-white px-3.5 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9f4fb] text-[12px] font-bold text-[#0f87d1]">S</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[#0a0a0a]">Ny melding</span>
                      <span className="block truncate text-[11px] text-[#8d877d]">Sara svarte om visningen</span>
                    </span>
                    <span className="ml-auto shrink-0 text-[10.5px] text-[#b3aa9e]">08:12</span>
                  </div>
                </div>

                {/* Eiendommen */}
                <p className="mt-3.5 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#b3aa9e]">Din bolig</p>
                <div className="mt-2 flex shrink-0 items-center gap-3 rounded-[16px] border border-[#eee9e0] bg-white p-2 pr-3.5">
                  <img
                    src="/nyest-interior-2.webp"
                    alt=""
                    loading="lazy"
                    className="h-11 w-14 shrink-0 rounded-[10px] object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-[#0a0a0a]">Parkveien 12B</span>
                    <span className="block truncate text-[11px] text-[#8d877d]">Utleid til Thea N. · 12 mnd</span>
                  </span>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8f6ef] px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#0f9d6e]">
                    <span className="h-[4px] w-[4px] rounded-full bg-[#0f9d6e]" /> Utleid
                  </span>
                </div>

                {/* Tab-linje */}
                <div className="mt-auto shrink-0 border-t border-[#eee9e0] pt-2.5">
                  <div className="flex items-start justify-between px-2">
                    {TABS.map((t, i) => (
                      <span key={t.navn} className={`flex flex-col items-center gap-1 ${i === 0 ? 'text-[#0a0a0a]' : 'text-[#c2bab0]'}`}>
                        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" aria-hidden="true">
                          <path d={t.d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[9px] font-semibold">{t.navn}</span>
                      </span>
                    ))}
                  </div>
                  {/* Home-indikator */}
                  <span aria-hidden="true" className="mx-auto mb-1.5 mt-2 block h-[4px] w-[110px] rounded-full bg-[#0a0a0a]/85" />
                </div>
              </div>
            </div>
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

        <div className="e-reveal relative mt-12 sm:mt-14 lg:mt-16">
          {/* Ambient glød bak flatene */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[80%] w-[95%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9B5BD6] opacity-[0.07] blur-[110px]"
          />

          {/* Desktop — nettleserramme (litt nedskalert for å gi mobilen plass) */}
          <div className="relative z-[1] overflow-hidden rounded-[16px] border border-[#e5dfd4] bg-white shadow-[0_40px_90px_-50px_rgba(28,22,14,0.35)] lg:w-[76%]">
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
          <div className="animate-floaty absolute -left-4 top-16 z-[2] hidden items-center gap-3 rounded-[18px] border border-[#eee9e0] bg-white px-4 py-3 shadow-[0_28px_60px_-28px_rgba(28,22,14,0.4)] lg:flex xl:-left-8">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ef] text-[#0f9d6e]"><Sjekk className="h-4 w-4" /></span>
            <span>
              <span className="block text-[13px] font-semibold text-[#0a0a0a]">Husleie mottatt</span>
              <span className="block text-[11.5px] text-[#8d877d]">16 500 kr · Parkveien 12B</span>
            </span>
          </div>
          <div
            className="animate-floaty absolute -left-2 bottom-24 z-[2] hidden items-center gap-3 rounded-[18px] border border-[#eee9e0] bg-white px-4 py-3 shadow-[0_28px_60px_-28px_rgba(28,22,14,0.4)] lg:flex xl:-left-6"
            style={{ animationDelay: '1.8s' }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3ecfb] text-[#9B5BD6]"><Sjekk className="h-4 w-4" /></span>
            <span>
              <span className="block text-[13px] font-semibold text-[#0a0a0a]">Kontrakt signert</span>
              <span className="block text-[11.5px] text-[#8d877d]">BankID · for 2 min siden</span>
            </span>
          </div>

          {/* Mobilappen — stor og slank, overlapper til høyre på desktop,
              stables sentrert med overlapp på mindre skjermer */}
          <div className="relative z-[2] mx-auto -mt-14 w-[280px] sm:-mt-24 sm:w-[300px] lg:absolute lg:-bottom-10 lg:right-0 lg:mx-0 lg:mt-0 lg:w-[300px] xl:right-4 xl:w-[318px]">
            <Telefon />
          </div>
        </div>

        <p className="e-meta mt-10 lg:mt-20">Illustrasjon av utleiedashbordet — samme oversikt på desktop og i mobilappen.</p>
      </div>
    </section>
  );
}
