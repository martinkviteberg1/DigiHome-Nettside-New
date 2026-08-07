import React from 'react';

// ---------------------------------------------------------------------------
// Slik fungerer det — svaret på adressefeltet. Tre steg i ren tekst.
// ---------------------------------------------------------------------------

const STEG = [
  {
    nr: '01',
    tittel: 'Start med adressen',
    tekst: 'Skriv inn adressen, så setter vi opp utleien: annonse på Finn.no, visninger og screening av leietakere.',
  },
  {
    nr: '02',
    tittel: 'Alt det formelle går digitalt',
    tekst: 'Leiekontrakten signeres med BankID, depositumskonto opprettes og husleien kreves inn automatisk hver måned.',
  },
  {
    nr: '03',
    tittel: 'Resten går av seg selv',
    tekst: 'Betalinger, meldinger og dokumenter samles i plattformen. Du har full oversikt — uten regneark og løse tråder.',
  },
];

export default function Steg() {
  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-steg">
      <div className="e-shell py-24 sm:py-32">
        <h2 className="e-reveal e-h2 max-w-[16ch]">Slik fungerer det<span className="text-[#9B5BD6]">.</span></h2>

        <div className="mt-14 grid gap-12 sm:mt-16 sm:grid-cols-3 sm:gap-10 lg:gap-14">
          {STEG.map((s) => (
            <div key={s.nr} className="e-reveal">
              <span aria-hidden="true" className="e-line-in block h-px w-full bg-[#e5dfd4]" />
              <span className="mt-7 block text-[13.5px] font-semibold tracking-[0.08em] text-[#9B5BD6]">{s.nr}</span>
              <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.01em] text-[#0a0a0a]">{s.tittel}</h3>
              <p className="e-body mt-3 max-w-[38ch]">{s.tekst}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
