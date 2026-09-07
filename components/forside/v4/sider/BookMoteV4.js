'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { site } from '@/lib/site';
import { track, getLeadAttribution } from '@/lib/analytics';
import { getClickIds } from '@/lib/gtag';
import { T, display } from '../motion';
import { Segment, StegKnapp, TekstFelt } from '../start/Felt';
import { DIM, HAIR, Punkt, SVAK, TekstOmrade } from './deler';
import { SARAH } from '../forvaltning/ForvaltningDeler';

/* ---------------------------------------------------------------------------
   BookMoteV4 — /book-mote. Én samtale, ett skjema.

   Målet for «Book en samtale» / «Book en demo» fra forvaltning, bedrift og
   priser — og QR-koden fra presentasjoner. Samme topplinje som onboardingen
   (flyt, ikke nettside). Innsending → /api/leads (lead_type: motebooking).
--------------------------------------------------------------------------- */

const EMNER = [
  ['forvaltning', 'Full forvaltning'],
  ['selv', 'Selvforvaltning'],
  ['bedrift', 'Eiendomsselskap'],
];
const EMNE_TEKST = { forvaltning: 'Full forvaltning', selv: 'Selvforvaltning', bedrift: 'Eiendomsselskap / portefølje' };

const PUNKTER = [
  ['01', 'Boligen — eller porteføljen', 'Hva du eier, hvordan du leier ut i dag, og hva som tar tid.'],
  ['02', 'Selv eller med oss', 'Hva som passer deg: systemet alene, eller en fast forvalter i Bergen.'],
  ['03', 'Neste steg — hvis du vil', 'Et konkret tilbud innen 24 timer, eller bare svar på det du lurte på.'],
];

function Topplinje() {
  return (
    <header className="sticky top-0 z-40" style={{ background: 'rgba(243,241,236,0.92)', backdropFilter: 'saturate(1.2) blur(8px)' }}>
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0">
        <Link href="/" aria-label="DigiHome — til forsiden" className="inline-flex items-center" data-testid="bm-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[18px] w-auto" />
        </Link>
        <div className="flex items-center gap-5 text-[13.5px]">
          <a href={`tel:${site.phoneHref}`} className="hidden text-[#15130F]/60 transition-colors hover:text-[#15130F] sm:inline">{site.phone}</a>
          <Link href="/" className="text-[#15130F]/70 transition-colors hover:text-[#15130F]" data-testid="bm-lukk">Lukk</Link>
        </div>
      </div>
      <div className="h-px" style={{ background: HAIR }} aria-hidden="true" />
    </header>
  );
}

export default function BookMoteV4({ emneStart = 'forvaltning' }) {
  const [emne, setEmne] = useState(EMNER.some(([id]) => id === emneStart) ? emneStart : 'forvaltning');
  const [form, setForm] = useState({ navn: '', epost: '', telefon: '', melding: '' });
  const [status, setStatus] = useState('klar'); // klar | sender | sendt | feil
  const [rort, setRort] = useState({});
  const sett = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const feilNavn = rort.navn && !form.navn.trim() ? 'Skriv inn navnet ditt.' : '';
  const kontaktOk = form.epost.trim() || form.telefon.trim();
  const feilKontakt = (rort.epost || rort.telefon) && !kontaktOk ? 'Legg inn e-post eller telefon, så vi får tak i deg.' : '';

  const send = async (e) => {
    e.preventDefault();
    if (status === 'sender' || status === 'sendt') return;
    setRort({ navn: true, epost: true, telefon: true });
    if (!form.navn.trim() || !kontaktOk) { setStatus('feil'); return; }
    setStatus('sender');
    try {
      let attribution = {};
      try { attribution = { ...getLeadAttribution(), ...getClickIds() }; } catch (err) { /* ok */ }
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.navn.trim(), email: form.epost.trim(), phone: form.telefon.trim(),
          notes: `Ønsker samtale · ${EMNE_TEKST[emne]}${form.melding.trim() ? ` — ${form.melding.trim()}` : ''}`,
          source: 'book-mote', lead_type: 'motebooking', attribution,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && data.success !== false;
      setStatus(ok ? 'sendt' : 'feil');
      if (ok) { try { track('contact_submit', { form: 'book-mote', emne, leadId: data?.data?.id || null }); } catch (err) { /* ok */ } }
    } catch (err) { setStatus('feil'); }
  };

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="book-mote-v4">
      <Topplinje />
      <main className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Venstre: hva samtalen er */}
          <div className="lg:col-span-5">
            <p className="dh-cover-inn text-[14.5px] font-medium" style={{ color: SVAK }}>Book en samtale</p>
            <h1 className="dh-cover-inn mt-4 text-[44px] sm:text-[56px] lg:text-[clamp(52px,4.4vw,72px)]" style={{ ...display, color: T.ink, animationDelay: '.04s' }} data-testid="bm-h1">
              Tjue minutter. Ingen forpliktelse<Punkt />
            </h1>
            <p className="dh-cover-inn mt-6 max-w-[42ch] text-[17.5px] leading-[1.5] sm:text-[19px]" style={{ color: 'rgba(21,19,15,0.72)', animationDelay: '.08s' }}>
              Fortell oss kort om boligen eller porteføljen, så ringer vi deg og finner et tidspunkt som passer. Digitalt, hos deg — eller i boligen.
            </p>
            <ol className="dh-cover-inn mt-10 border-t" style={{ borderColor: HAIR, animationDelay: '.14s' }}>
              {PUNKTER.map(([nr, t, d]) => (
                <li key={nr} className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3 border-b py-4" style={{ borderColor: HAIR }}>
                  <span className="pt-[4px] text-[12.5px] tabular-nums" style={{ color: SVAK }}>{nr}</span>
                  <span>
                    <span className="block text-[16.5px] font-medium" style={{ color: T.ink }}>{t}</span>
                    <span className="mt-1 block max-w-[40ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="dh-cover-inn mt-8 flex items-center gap-3" style={{ animationDelay: '.2s' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SARAH.liten} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" style={{ boxShadow: '0 0 0 1px rgba(21,19,15,0.1)' }} />
              <p className="text-[14px] leading-[1.45]" style={{ color: DIM }}>Du snakker med en forvalter — ikke en selger. <span style={{ color: T.ink }}>Vi svarer normalt samme dag.</span></p>
            </div>
          </div>

          {/* Høyre: skjemaet */}
          <div className="dh-cover-inn lg:col-span-6 lg:col-start-7" style={{ animationDelay: '.12s' }}>
            {status === 'sendt' ? (
              <div className="flex min-h-[420px] flex-col justify-center rounded-[20px] p-8 sm:p-10" style={{ background: T.flate }} data-testid="bm-sendt">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)', color: T.gronn }}><Check className="h-5 w-5" strokeWidth={2.2} /></span>
                <h2 className="mt-6 text-[36px] sm:text-[44px]" style={{ ...display, color: T.ink }}>Takk, {form.navn.trim().split(' ')[0]}<Punkt /></h2>
                <p className="mt-4 max-w-[40ch] text-[17px] leading-[1.5]" style={{ color: DIM }}>Vi har fått henvendelsen og ringer deg for å avtale tid. Normalt samme dag.</p>
                <div className="mt-8"><Link href="/" className="text-[15px] font-medium underline decoration-[#15130F]/25 underline-offset-4 hover:decoration-[#15130F]" style={{ color: T.ink }}>Til forsiden</Link></div>
              </div>
            ) : (
              <form onSubmit={send} className="flex flex-col gap-5 rounded-[20px] p-6 sm:p-8" style={{ background: T.flate }} noValidate data-testid="mote-skjema">
                <Segment label="Hva gjelder det?" verdi={emne} onChange={setEmne} valg={EMNER} testId="bm-emne" />
                <TekstFelt id="mote-navn" label="Navn" value={form.navn} onChange={sett('navn')} onBlur={() => setRort((r) => ({ ...r, navn: true }))} autoComplete="name" placeholder="Ola Nordmann" feil={feilNavn} ok={!!form.navn.trim()} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TekstFelt id="mote-epost" label="E-post" type="email" value={form.epost} onChange={sett('epost')} onBlur={() => setRort((r) => ({ ...r, epost: true }))} autoComplete="email" inputMode="email" placeholder="ola@epost.no" ok={/^\S+@\S+\.\S+$/.test(form.epost)} />
                  <TekstFelt id="mote-telefon" label="Telefon" type="tel" value={form.telefon} onChange={sett('telefon')} onBlur={() => setRort((r) => ({ ...r, telefon: true }))} autoComplete="tel" inputMode="tel" placeholder="900 00 000" ok={form.telefon.replace(/\D/g, '').length >= 8} />
                </div>
                {feilKontakt ? <p className="-mt-2 text-[13px]" style={{ color: '#B42318' }} data-testid="mote-feil">{feilKontakt}</p> : null}
                <TekstOmrade id="mote-melding" label="Hva vil du snakke om? (valgfritt)" value={form.melding} onChange={sett('melding')} placeholder="F.eks. adresse, antall enheter, eller hva som tar mest tid i dag" rows={3} />
                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <StegKnapp type="submit" laster={status === 'sender'} testId="mote-send">{status === 'sender' ? 'Sender …' : 'Send — vi ringer deg'}</StegKnapp>
                  <p className="text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>Ingen forpliktelse. Vi deler aldri opplysningene dine.</p>
                </div>
                {status === 'feil' && !feilNavn && !feilKontakt ? <p className="text-[13px]" style={{ color: '#B42318' }} data-testid="mote-feil-server">Noe gikk galt — prøv igjen om et øyeblikk, eller ring {site.phone}.</p> : null}
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
