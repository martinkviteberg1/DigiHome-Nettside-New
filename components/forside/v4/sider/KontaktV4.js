'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import NavV4 from '../NavV4';
import FooterV4 from '../FooterV4';
import { site } from '@/lib/site';
import { track, getLeadAttribution } from '@/lib/analytics';
import { getClickIds } from '@/lib/gtag';
import { T, display } from '../motion';
import { StegKnapp, TekstFelt } from '../start/Felt';
import { Avsloring, DIM, HAIR, Innledning, Punkt, SVAK, TekstOmrade } from './deler';

/* ---------------------------------------------------------------------------
   KontaktV4 — /kontakt. Kontaktinfo på hårlinjer til venstre, skjema til høyre.
   Innsending → /api/leads (lead_type: kontakt) — samme som før.
--------------------------------------------------------------------------- */

const RADER = [
  ['Telefon', site.phone, `tel:${site.phoneHref}`],
  ['E-post', site.email, `mailto:${site.email}`],
  ['Adresse', 'Kokstadvegen 46, 5257 Kokstad', 'https://maps.google.com/?q=Kokstadvegen+46,+5257+Kokstad'],
  ['Åpningstider', 'Man–fre 09:00–16:00', null],
];

const FOR = [
  ['Hvor raskt svarer dere?', <>Innen én virkedag — ofte samme dag. Registrerer du boligen via <Link href="/bli-utleier/start" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]" style={{ color: '#15130F' }}>kom i gang</Link>, får du et konkret tilbud innen 24 timer.</>],
  ['Hvor holder dere til?', <>Bergen. Vi forvalter boliger i alle bydeler — se <Link href="/utleie" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]" style={{ color: '#15130F' }}>områdene vi dekker</Link>. Møter tar vi gjerne hjemme hos deg, i boligen eller digitalt.</>],
  ['Hva koster en prat?', <>Ingenting. Vurdering av leiepotensialet og samtalen er gratis og uforpliktende — prøv også <Link href="/priser" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]" style={{ color: '#15130F' }}>prisene</Link>.</>],
];

function Skjema() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [rort, setRort] = useState({});
  const sett = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const kontaktOk = form.email.trim() || form.phone.trim();
  const feilNavn = rort.name && !form.name.trim() ? 'Skriv inn navnet ditt.' : '';
  const feilKontakt = (rort.email || rort.phone) && !kontaktOk ? 'Legg inn e-post eller telefon.' : '';

  const submit = async (e) => {
    e.preventDefault();
    setRort({ name: true, email: true, phone: true });
    if (!form.name.trim() || !kontaktOk) { setStatus('error'); return; }
    setStatus('sending');
    try {
      let attribution = {};
      try { attribution = { ...getLeadAttribution(), ...getClickIds() }; } catch (err) { /* ok */ }
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), notes: form.message.trim(), lead_type: 'kontakt', source: 'kontakt', attribution }),
      });
      if (res.ok) {
        let data = {};
        try { data = await res.json(); } catch (err) { /* ok */ }
        try { track('contact_submit', { form: 'kontakt', leadId: data?.data?.id || null }); } catch (err) { /* ok */ }
        setStatus('done');
      } else setStatus('error');
    } catch (err) { setStatus('error'); }
  };

  if (status === 'done') {
    return (
      <div className="flex min-h-[380px] flex-col justify-center rounded-[20px] p-8 sm:p-10" style={{ background: T.flate }} data-testid="kontakt-sendt">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)', color: T.gronn }}><Check className="h-5 w-5" strokeWidth={2.2} /></span>
        <h2 className="mt-6 text-[36px] sm:text-[44px]" style={{ ...display, color: T.ink }}>Takk, {form.name.trim().split(' ')[0]}<Punkt /></h2>
        <p className="mt-4 max-w-[40ch] text-[17px] leading-[1.5]" style={{ color: DIM }}>Vi har fått meldingen og svarer innen én virkedag — ofte samme dag.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-[20px] p-6 sm:p-8" style={{ background: T.flate }} data-testid="kontakt-skjema">
      <TekstFelt id="kontakt-navn" label="Navn" value={form.name} onChange={sett('name')} onBlur={() => setRort((r) => ({ ...r, name: true }))} autoComplete="name" placeholder="Ola Nordmann" feil={feilNavn} ok={!!form.name.trim()} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TekstFelt id="kontakt-epost" label="E-post" type="email" value={form.email} onChange={sett('email')} onBlur={() => setRort((r) => ({ ...r, email: true }))} autoComplete="email" inputMode="email" placeholder="ola@epost.no" ok={/^\S+@\S+\.\S+$/.test(form.email)} />
        <TekstFelt id="kontakt-telefon" label="Telefon" type="tel" value={form.phone} onChange={sett('phone')} onBlur={() => setRort((r) => ({ ...r, phone: true }))} autoComplete="tel" inputMode="tel" placeholder="900 00 000" ok={form.phone.replace(/\D/g, '').length >= 8} />
      </div>
      {feilKontakt ? <p className="-mt-2 text-[13px]" style={{ color: '#B42318' }} data-testid="kontakt-feil">{feilKontakt}</p> : null}
      <TekstOmrade id="kontakt-melding" label="Melding" value={form.message} onChange={sett('message')} placeholder="Hva kan vi hjelpe med?" rows={4} />
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <StegKnapp type="submit" laster={status === 'sending'} testId="kontakt-send">{status === 'sending' ? 'Sender …' : 'Send melding'}</StegKnapp>
        <p className="text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>Vi deler aldri opplysningene dine.</p>
      </div>
      {status === 'error' && !feilNavn && !feilKontakt ? <p className="text-[13px]" style={{ color: '#B42318' }}>Noe gikk galt — prøv igjen, eller ring {site.phone}.</p> : null}
    </form>
  );
}

export default function KontaktV4() {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="kontakt-v4">
      <NavV4 />
      <main>
        <Avsloring threshold={0.05} testid="v4k-hero">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-20">
              <Innledning label="Kontakt" tittel={<>La oss ta en prat<Punkt /></>} ingress="Lurer du på hva boligen kan leies ut for, eller hvordan vi jobber? Ring, skriv — eller send en melding, så svarer vi innen én virkedag." maks="12ch" testid="v4k" />
              <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-5">
                  <dl className="border-t" style={{ borderColor: HAIR }} data-testid="v4k-info">
                    {RADER.map(([t, v, h], i) => (
                      <div key={t} className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 border-b py-5" style={{ borderColor: HAIR, ...inn(1 + i, 14) }}>
                        <dt className="pt-[3px] text-[13.5px]" style={{ color: SVAK }}>{t}</dt>
                        <dd className="min-w-0">
                          {h
                            ? <a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel={h.startsWith('http') ? 'noopener noreferrer' : undefined} className={`${i === 0 ? 'text-[26px] sm:text-[30px]' : 'text-[17px]'} block break-words transition-colors hover:text-[#15130F]/60`} style={i === 0 ? { ...display, letterSpacing: '-0.03em', color: T.ink } : { color: T.ink }}>{v}</a>
                            : <span className="block text-[17px]" style={{ color: T.ink }}>{v}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-12" style={inn(5)}>
                    <p className="text-[14px] font-medium" style={{ color: SVAK }}>Før du tar kontakt</p>
                    <ul className="mt-4 flex flex-col gap-5">
                      {FOR.map(([q, a]) => (
                        <li key={q}>
                          <p className="text-[16px] font-medium" style={{ color: T.ink }}>{q}</p>
                          <p className="mt-1 max-w-[46ch] text-[15px] leading-[1.5]" style={{ color: DIM }}>{a}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="lg:col-span-6 lg:col-start-7" style={inn(2, 24)}>
                  <Skjema />
                </div>
              </div>
            </div>
          )}
        </Avsloring>
      </main>
      <FooterV4 />
    </div>
  );
}
