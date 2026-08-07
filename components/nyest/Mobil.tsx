import React from 'react';

// ---------------------------------------------------------------------------
// Mobilopplevelsen — kodet iPhone-ramme, ikke skjermbilde. Skjermen viser en
// sann DigiHome-flyt: eieren godkjenner annonsen før den publiseres til FINN.
// Merket som illustrasjon.
// ---------------------------------------------------------------------------

export default function Mobil() {
  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-mobil">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-14 px-6 pb-24 sm:px-10 sm:pb-32 lg:grid-cols-2 lg:gap-20 lg:px-16">
        <div>
          <h2 className="e-reveal e-h2 max-w-[14ch]">Utleien i lomma<span className="text-[#9B5BD6]">.</span></h2>
          <p className="e-reveal e-lead mt-5 max-w-[46ch]">
            Ingenting publiseres før du har sagt ja — og alt som skjer etterpå, ser du samme sted.
          </p>
          <div className="mt-10 max-w-[440px]">
            {[
              'Godkjenn annonsen før den publiseres',
              'Se husleien komme inn — purringen går ut automatisk',
              'Svar leietakeren i samme tråd som alt annet',
            ].map((p) => (
              <p key={p} className="e-reveal border-t border-[#e5dfd4] py-4 text-[15px] leading-[1.6] text-[#3d382f]">{p}</p>
            ))}
          </div>
          <p className="e-reveal e-meta mt-6">Illustrasjon av mobilopplevelsen.</p>
        </div>

        <div className="e-reveal flex justify-center lg:justify-end lg:pr-10">
          <div className="w-[300px] rounded-[48px] bg-[#0a0a0a] p-[10px] shadow-[0_60px_120px_-50px_rgba(28,22,14,0.45)] sm:w-[330px]">
            <div className="relative overflow-hidden rounded-[38px] bg-white">
              {/* Statuslinje + dynamic island */}
              <span aria-hidden="true" className="absolute left-1/2 top-3 h-[24px] w-[92px] -translate-x-1/2 rounded-full bg-[#0a0a0a]" />
              <div className="px-7 pt-4">
                <span className="text-[13px] font-semibold text-[#0a0a0a]">09:41</span>
              </div>

              <div className="px-5 pb-6 pt-8">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#8d877d]">‹ Parkveien 12B</span>
                  <span className="text-[12px] text-[#8d877d]">Steg 3 av 4</span>
                </div>

                <h3 className="mt-3 text-[22px] font-bold tracking-[-0.02em] text-[#0a0a0a]">Godkjenn annonsen</h3>

                <div className="relative mt-4 overflow-hidden rounded-[16px]">
                  <img
                    src="/interior-living.webp"
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">1 / 24</span>
                </div>

                <p className="mt-4 text-[15.5px] font-semibold text-[#0a0a0a]">Lys 2-roms med balkong — Møhlenpris</p>
                <p className="mt-1 text-[13px] text-[#8d877d]">2 soverom · 58 m² · 3. etasje</p>

                <div className="mt-4 flex items-end justify-between border-t border-[#f0ece4] pt-4">
                  <div>
                    <p className="text-[11.5px] text-[#8d877d]">Anbefalt månedsleie</p>
                    <p className="text-[19px] font-bold text-[#0a0a0a]">16 500 kr</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] text-[#8d877d]">Publiseres til</p>
                    <p className="text-[14px] font-bold text-[#0063ff]">FINN.no</p>
                  </div>
                </div>

                <span className="mt-5 flex h-[48px] items-center justify-center rounded-full bg-[#0a0a0a] text-[14.5px] font-semibold text-white">
                  Godkjenn og publiser
                </span>
                <span className="mt-2.5 flex h-[44px] items-center justify-center rounded-full border border-[#e5dfd4] text-[14px] font-medium text-[#0a0a0a]">
                  Be om endringer
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
