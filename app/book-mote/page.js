'use client';

/* ═══════════════ DigiHome — Book et møte (QR-landingsside) ═══════════════
   Publikum skanner QR-koden fra Bergen Urban-decket og lander her —
   primært på mobil. Mørk, premium og rett på sak: ett skjema, ett løfte.
   Innsendinger går til /api/leads (source: bergen-urban) og lander rett
   i DigiHome-portalens leads-oversikt. */

import { useState } from 'react';

export default function BookMoteSide() {
  const [navn, setNavn] = useState('');
  const [epost, setEpost] = useState('');
  const [telefon, setTelefon] = useState('');
  const [melding, setMelding] = useState('');
  const [status, setStatus] = useState('klar'); // klar | sender | sendt | feil

  const send = async (e) => {
    e.preventDefault();
    if (status === 'sender' || status === 'sendt') return;
    if (!navn.trim() || (!epost.trim() && !telefon.trim())) { setStatus('feil'); return; }
    setStatus('sender');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: navn.trim(),
          email: epost.trim(),
          phone: telefon.trim(),
          notes: melding.trim() ? `Ønsker møte — ${melding.trim()}` : 'Ønsker møte (QR fra presentasjon)',
          source: 'bergen-urban',
          lead_type: 'motebooking',
        }),
      });
      const data = await res.json().catch(() => ({}));
      setStatus(res.ok && data.success !== false ? 'sendt' : 'feil');
    } catch (err) {
      setStatus('feil');
    }
  };

  const felt = 'w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3.5 text-[16px] text-white placeholder:text-white/[0.28] outline-none transition-colors focus:border-[#B57BFF]/60 focus:bg-white/[0.07]';

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[#050505] font-body text-white">
      {/* Rolig luminans — samme scenelys som decket */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(90% 55% at 50% 0%, rgba(124,58,237,0.13) 0%, transparent 70%)' }} />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-6 pb-12 pt-10 md:pt-16">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-[26px] w-auto self-start" />

        {status !== 'sendt' ? (
          <>
            <div className="mt-12 md:mt-16">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.3em] text-white/[0.4]">DigiHome</p>
              <h1 className="mt-4 font-heading text-[clamp(34px,9vw,52px)] font-bold leading-[1.04] tracking-[-0.035em]">
                Book et møte<span className="text-[#B57BFF]">.</span>
              </h1>
              <p className="mt-4 max-w-[42ch] text-[15.5px] leading-relaxed text-white/[0.55]">
                Legg igjen kontaktinformasjonen din, så tar vi kontakt og finner
                et tidspunkt som passer.
              </p>
            </div>

            <form onSubmit={send} className="mt-9 flex flex-col gap-3.5" data-testid="mote-skjema">
              <input
                className={felt}
                placeholder="Navn"
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                autoComplete="name"
                data-testid="mote-navn"
              />
              <input
                className={felt}
                placeholder="E-post"
                type="email"
                value={epost}
                onChange={(e) => setEpost(e.target.value)}
                autoComplete="email"
                data-testid="mote-epost"
              />
              <input
                className={felt}
                placeholder="Telefon"
                type="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                autoComplete="tel"
                data-testid="mote-telefon"
              />
              <textarea
                className={`${felt} min-h-[96px] resize-none`}
                placeholder="Hva vil du snakke om? (valgfritt)"
                value={melding}
                onChange={(e) => setMelding(e.target.value)}
                data-testid="mote-melding"
              />

              {status === 'feil' && (
                <p className="text-[13px] text-[#e5928a]" data-testid="mote-feil">
                  Fyll inn navn og e-post eller telefon — eller prøv igjen om et øyeblikk.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sender'}
                className="mt-2 flex h-[52px] items-center justify-center rounded-xl bg-white text-[15.5px] font-semibold tracking-[-0.01em] text-[#0f0f0f] transition-[transform,opacity] active:scale-[0.985] disabled:opacity-60"
                data-testid="mote-send"
              >
                {status === 'sender' ? 'Sender …' : 'Send og book møte'}
              </button>
              <p className="mt-1 text-center text-[11.5px] text-white/[0.28]">
                Vi svarer normalt samme dag.
              </p>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center" data-testid="mote-sendt">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4ade80]/[0.12] ring-1 ring-[#4ade80]/30">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#4ade80]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <h2 className="mt-7 font-heading text-[clamp(28px,7vw,40px)] font-bold tracking-[-0.03em]">Takk, {navn.split(' ')[0]}<span className="text-[#B57BFF]">.</span></h2>
            <p className="mt-3 max-w-[38ch] text-[15.5px] leading-relaxed text-white/[0.55]">
              Vi har mottatt henvendelsen og tar kontakt for å avtale et møte.
            </p>
            <p className="mt-10 text-[12px] tracking-[0.18em] text-white/[0.25]">DIGIHOME.NO</p>
          </div>
        )}

        <footer className="mt-auto pt-12 text-center">
          <p className="text-[11px] tracking-tight text-white/[0.22]">Martin Kviteberg · Produktsjef · DigiHome</p>
        </footer>
      </div>
    </main>
  );
}
