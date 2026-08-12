import React from 'react';

// ---------------------------------------------------------------------------
// Fordeler — «Alt du trenger som utleier». Inspirert av husleie.no sitt
// funksjonsgrid, men i DigiHomes rolige designspråk: seks kort med tynne
// linjeikoner i fiolett tone, hairline-rammer og subtilt løft på hover.
// ---------------------------------------------------------------------------

const FORDELER = [
  {
    tittel: 'Leiekontrakt med BankID',
    tekst: 'Juridisk trygg kontrakt genereres automatisk og signeres digitalt av begge parter — på minutter, ikke uker.',
    ikon: ['M7 3h7l4 4v14H7V3z', 'M14 3v4h4', 'M9.5 13.5h5', 'M9.5 17h3'],
  },
  {
    tittel: 'Depositum uten bankkø',
    tekst: 'Depositumskontoen opprettes digitalt, og pengene står sikret på egen konto til leieforholdet avsluttes.',
    ikon: ['M3 10l9-6 9 6', 'M5.5 10v8', 'M12 10v8', 'M18.5 10v8', 'M3 20.5h18'],
  },
  {
    tittel: 'Husleie på autopilot',
    tekst: 'Leien kreves inn automatisk hver måned. Blir den forsinket, går purringen ut av seg selv — uten at du løfter en finger.',
    ikon: ['M20 12a8 8 0 1 1-2.3-5.6', 'M20 3.5V8h-4.5'],
  },
  {
    tittel: 'Riktig leietaker',
    tekst: 'Annonse på FINN.no, visninger og screening av interessentene — du velger trygt blant de beste kandidatene.',
    ikon: ['M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M3 20c.9-3.2 3.2-5 6-5s5.1 1.8 6 5', 'M15 10l2 2 4-4'],
  },
  {
    tittel: 'Hjelp når noe skjer',
    tekst: 'Leietaker melder saker rett i appen. Du følger med fra sofaen — eller lar forvaltning ta hele jobben.',
    ikon: ['M12 3l7 3v5c0 4.6-3 8-7 9.2C8 19 5 15.6 5 11V6l7-3z', 'M9.3 11.8l1.9 1.9 3.5-3.5'],
  },
  {
    tittel: 'Full kontroll og oversikt',
    tekst: 'Betalinger, dokumenter, meldinger og nøkkeltall — samlet på ett sted, alltid oppdatert. Ingen regneark.',
    ikon: ['M4 4h16v16H4V4z', 'M4 9.5h16', 'M10 9.5V20'],
  },
];

export default function Fordeler() {
  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-fordeler">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-24 sm:px-10 sm:py-32 lg:px-16">
        <h2 className="e-reveal e-h2 max-w-[18ch]">Alt du trenger som utleier<span className="text-[#9B5BD6]">.</span></h2>
        <p className="e-reveal e-lead mt-5 max-w-[52ch]">
          DigiHome samler hele leieforholdet — fra annonsen legges ut til husleien står på konto.
        </p>

        <div className="mt-12 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {FORDELER.map((f) => (
            <div
              key={f.tittel}
              className="e-reveal group rounded-[22px] border border-[#eee9e0] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#e0d8ca] hover:shadow-[0_28px_60px_-32px_rgba(28,22,14,0.25)] sm:p-8"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#f6f1fb] transition-colors duration-300 group-hover:bg-[#efe7fa]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                  {f.ikon.map((d) => (
                    <path key={d} d={d} stroke="#9B5BD6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                </svg>
              </span>
              <h3 className="mt-6 text-[19px] font-semibold tracking-[-0.015em] text-[#0a0a0a]">{f.tittel}</h3>
              <p className="mt-2.5 max-w-[36ch] text-[14.5px] leading-[1.65] text-[#5b554b]">{f.tekst}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
