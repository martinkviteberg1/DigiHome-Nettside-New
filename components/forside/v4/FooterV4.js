'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { site } from '@/lib/site';
import { EASE, T, display } from './motion';

/* ---------------------------------------------------------------------------
   FooterV4 — én footer for hele nettstedet.

   Varm charcoal (ikke svart), typografi lager hierarkiet: én stor linje,
   nyhetsbrev på en hårlinje, fire stille kolonner, så juridisk bunnlinje.
   Lenkene speiler V4-navigasjonen (Produkt / Boligeiere / Eiendomsselskaper /
   Forvaltning / Priser) + leietakere og ressurser. Gamle tjenestesider
   (dynamisk utleie, Airbnb) er bevisst ikke med — de lever for SEO, ikke i nav.

   `org` (valgfritt): overstyrer selskapsinfo (brukes på signeringssider).
--------------------------------------------------------------------------- */

const OFF = T.offwhite;
const DIM = 'rgba(244,241,234,0.62)';
const SVAK = 'rgba(244,241,234,0.42)';
const HAIR = 'rgba(244,241,234,0.12)';

const KOLONNER = [
  { t: 'Produkt', l: [['Annonse og leietaker', '/#produkt'], ['Kontrakt med BankID', '/#produkt'], ['Drift og saker', '/#produkt'], ['Økonomi og rapport', '/#produkt'], ['Priser', '/priser']] },
  { t: 'For deg', l: [['For boligeiere', '/boligeiere'], ['For eiendomsselskaper', '/bedrift'], ['Full forvaltning', '/forvaltning'], ['Priskalkulator', '/priskalkulator'], ['Kom i gang', '/kom-i-gang']] },
  { t: 'Leietakere', l: [['Ledige boliger', '/ledige-boliger'], ['Bli leietaker', '/bli-leietaker'], ['Support', '/support']] },
  { t: 'Ressurser', l: [['Guider for utleiere', '/guider'], ['Leiemarkedet', '/leiemarkedet'], ['Utleie i Bergen', '/utleie'], ['Nyheter', '/nyheter'], ['Om oss', '/om-oss'], ['Kontakt', '/kontakt']] },
];

function Nyhetsbrev() {
  const [epost, setEpost] = useState('');
  const [status, setStatus] = useState('idle');

  const send = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(epost)) { setStatus('error'); return; }
    setStatus('sending');
    try {
      const r = await fetch('/api/newsletter/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: epost, source: 'footer' }) });
      setStatus(r.ok ? 'done' : 'error');
      if (r.ok) setEpost('');
    } catch (err) { setStatus('error'); }
  };

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3" data-testid="footer-newsletter-done">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.2)', color: '#5FD39A' }}><Check className="h-4 w-4" strokeWidth={2.2} /></span>
        <div>
          <p className="text-[15px] font-medium" style={{ color: OFF }}>Takk — du er påmeldt.</p>
          <p className="text-[13px]" style={{ color: SVAK }}>Første innsikt lander i innboksen snart.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="w-full max-w-[460px]" data-testid="footer-newsletter">
      <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: status === 'error' ? 'rgba(255,140,140,0.6)' : 'rgba(244,241,234,0.28)', transition: `border-color 300ms ${EASE}` }}>
        <input
          type="email"
          value={epost}
          onChange={(e) => { setEpost(e.target.value); if (status === 'error') setStatus('idle'); }}
          placeholder="din@epost.no"
          aria-label="E-postadresse for nyhetsbrev"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-[#F4F1EA]/40"
          style={{ color: OFF }}
          data-testid="footer-newsletter-input"
        />
        <button type="submit" disabled={status === 'sending'} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[8px] px-3.5 text-[13.5px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.98] disabled:opacity-60" style={{ background: T.lilla, color: T.ink }} data-testid="footer-newsletter-submit">
          {status === 'sending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Meld meg på <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} /></>}
        </button>
      </div>
      <p className="mt-2.5 text-[12px] leading-[1.5]" style={{ color: status === 'error' ? 'rgba(255,160,160,0.9)' : SVAK }}>
        {status === 'error' ? 'Sjekk e-postadressen og prøv igjen.' : <>Maks én e-post i måneden. Meld deg av når som helst — se <Link href="/personvern" className="underline underline-offset-3 hover:text-white">personvern</Link>.</>}
      </p>
    </form>
  );
}

export default function FooterV4({ org } = {}) {
  const fmtOrg = (n) => String(n || '').replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  const navn = org?.company_name || 'Digihome AS';
  const orgNr = org?.org_number ? fmtOrg(org.org_number) : '835 595 242';
  const epost = org?.company_email || site.email;
  const telefon = org?.company_phone || site.phone;
  const adresse = org?.company_address || 'Kokstadvegen 46, 5257 Kokstad';
  const lenke = 'inline-block py-1 text-[14px] transition-colors hover:text-white';

  return (
    <footer className="relative" style={{ background: T.charcoal, color: OFF }} data-testid="footer-v4">
      <div className="mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0">
        {/* Én stor linje + nyhetsbrev */}
        <div className="grid gap-10 border-b pb-14 pt-16 lg:grid-cols-12 lg:items-end lg:gap-12 lg:pb-16 lg:pt-20" style={{ borderColor: HAIR }}>
          <div className="lg:col-span-7">
            <p className="text-[13.5px] font-medium" style={{ color: SVAK }}>DigiHome · Bergen</p>
            <p className="mt-3 max-w-[14ch] text-[clamp(38px,4.6vw,72px)]" style={{ ...display, color: OFF }} data-testid="footer-linje">
              Utleie på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </p>
            <p className="mt-5 max-w-[46ch] text-[15.5px] leading-[1.5]" style={{ color: DIM }}>
              Annonse, leietaker, kontrakt med BankID, husleie og saker — i ett system. Lei ut selv, eller la forvalteren vår ta jobben.
            </p>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[13.5px] font-medium" style={{ color: SVAK }}>Innsikt om leiemarkedet</p>
            <p className="mb-5 mt-1.5 max-w-[40ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>Markedsdata, skattetips og guider for boligeiere i Bergen — kort og konkret.</p>
            <Nyhetsbrev />
          </div>
        </div>

        {/* Kolonner */}
        <nav className="grid grid-cols-2 gap-x-6 gap-y-10 border-b py-12 sm:grid-cols-4 lg:py-14" style={{ borderColor: HAIR }} aria-label="Bunnmeny">
          {KOLONNER.map((k) => (
            <div key={k.t}>
              <p className="mb-4 text-[13px] font-medium" style={{ color: SVAK }}>{k.t}</p>
              <ul className="flex flex-col gap-1.5">
                {k.l.map(([l, h]) => (
                  <li key={l}>
                    {h.startsWith('/#')
                      ? <a href={h} className={lenke} style={{ color: DIM }}>{l}</a>
                      : <Link href={h} className={lenke} style={{ color: DIM }}>{l}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bunnlinje */}
        <div className="flex flex-col gap-8 py-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src="/brand/digihome-lockup-white.svg" alt="DigiHome" className="h-[22px] w-auto self-start opacity-90" />
            <div className="text-[13px] leading-[1.6]" style={{ color: SVAK }}>
              <p style={{ color: DIM }}>{navn} · Org.nr {orgNr}</p>
              <p>{adresse}</p>
              <p className="mt-1">
                <a href={`tel:${String(telefon).replace(/\s/g, '')}`} className="transition-colors hover:text-white">{telefon}</a>
                <span className="mx-2" aria-hidden="true">·</span>
                <a href={`mailto:${epost}`} className="transition-colors hover:text-white">{epost}</a>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]" style={{ color: SVAK }}>
            <Link href="/personvern" className="transition-colors hover:text-white">Personvern</Link>
            <Link href="/vilkar" className="transition-colors hover:text-white">Vilkår</Link>
            <Link href="/slett-konto" className="transition-colors hover:text-white">Slett konto</Link>
            <a href={site.social?.instagram || 'https://instagram.com/digihome'} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">Instagram</a>
            <a href={site.social?.linkedin || 'https://linkedin.com/company/digihome'} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">LinkedIn</a>
            <span>&copy; {new Date().getFullYear()} {navn}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
