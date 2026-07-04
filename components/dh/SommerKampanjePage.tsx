'use client';

/*
 * /sommer — Sommerkampanje 2026 landingsside.
 * 10 % forvaltningshonorar + 0 kr oppstart · frist 10. juli.
 * Mål: konvertere klikk fra nyhetsbrevet (og annonser) til leads.
 * Nyhetsbrev-attribusjon: ?c=<campaignId>&r=<rid> registreres på leaden.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { track, getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart } from '@/lib/gtag';

const AC = '#d298ff';
const DEADLINE = new Date('2026-07-10T23:59:59+02:00');

const INCLUDED = [
  { t: 'Annonsering og visninger', d: 'Profesjonelle bilder, FINN-annonse og utvelgelse av riktig leietaker.' },
  { t: 'Kontrakt med BankID', d: 'Trygg leiekontrakt, e-signering og depositumskonto — alt digitalt.' },
  { t: 'All kommunikasjon', d: 'Vi håndterer leietaker gjennom hele leieforholdet. Du kobles kun på ved behov.' },
  { t: 'Husleie rett på konto', d: 'Automatisk innkreving — vi følger opp og purrer om det trengs.' },
];

export default function SommerKampanjePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [postal, setPostal] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const startedRef = useRef(false);
  const nlRef = useRef({ c: '', r: '' });

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      nlRef.current = { c: sp.get('c') || '', r: sp.get('r') || '' };
    } catch (e) {}
    track('page_view_campaign', { campaign: 'sommer2026' });
  }, []);

  const daysLeft = useMemo(() => {
    const ms = DEADLINE.getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }, []);
  const expired = daysLeft <= 0;

  const markStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { track('form_start', { form: 'sommer' }); trackLeadStart('sommer'); } catch (e) {}
  };

  const valid = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 8 && /\S+@\S+\.\S+/.test(email);

  const submit = async (e: any) => {
    e.preventDefault();
    if (!valid || sending) return;
    setSending(true);
    setErr('');
    try {
      const nl = nlRef.current;
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: '+47 ' + phone.replace(/\D/g, ''),
          email: email.trim(),
          address: address.trim(),
          postal_code: postal,
          lead_type: 'huseier',
          rental_model: 'langtid',
          source: 'sommerkampanje-2026',
          notes: `Sommerkampanje 2026: 10 % forvaltningshonorar + 0 kr oppstart (frist 10. juli)${nl.c ? ` · Fra nyhetsbrev (kampanje ${nl.c})` : ''}`,
          nl_campaign: nl.c || undefined,
          nl_rid: nl.r || undefined,
          attribution: getLeadAttribution(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data.success || data.ok)) throw new Error('Innsending feilet');
      try {
        track('lead_submit', { form: 'sommer', campaign: 'sommer2026' });
        trackLead({ formId: 'sommer', source: 'sommerkampanje-2026', leadId: data?.data?.id, email, phone: '+47 ' + phone });
      } catch (e2) {}
      setDone(true);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e3) {}
    } catch {
      try { track('form_error', { form: 'sommer', kind: 'submit' }); } catch (e4) {}
      setErr('Noe gikk galt. Prøv igjen — eller ring oss på telefon.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Minimal header */}
      <header className="border-b border-[#f0ede8]">
        <div className="max-w-[1080px] mx-auto px-5 h-[64px] flex items-center justify-between">
          <Link href="/" aria-label="DigiHome forside">
            <img src="/deck-logo-dark.svg" alt="DigiHome" className="h-[26px] w-auto" />
          </Link>
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#999]">Sommerkampanje 2026</span>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-5 pb-24">
        {done ? (
          /* ---------- Kvittering ---------- */
          <div className="max-w-[560px] mx-auto text-center pt-20" data-testid="sommer-success">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(210,152,255,0.16)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a052e0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h1 className="text-[30px] sm:text-[36px] font-bold tracking-[-0.03em] leading-[1.1] mt-7">Takk! Kampanjeprisen er reservert for deg.</h1>
            <p className="text-[15.5px] text-[#666] leading-[1.65] mt-4">Vi har registrert henvendelsen din med sommerkampanjen — <strong className="text-[#0a0a0a]">10 % forvaltningshonorar og 0 kr i oppstart</strong>.</p>
            <div className="inline-flex items-center gap-3.5 mt-9 rounded-2xl border border-[#f0ede8] bg-[#fafaf8] px-5 py-4 text-left">
              <img src="/sarah-sleeman.jpg" alt="Sarah Sleeman" className="w-[52px] h-[52px] rounded-full object-cover" />
              <div>
                <p className="text-[14px] font-bold">Sarah Sleeman tar kontakt innen 24 timer</p>
                <p className="text-[12.5px] text-[#999] mt-0.5">Daglig leder, DigiHome</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 pt-12 sm:pt-16">
            {/* ---------- Venstre: tilbudet ---------- */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5" style={{ background: 'rgba(210,152,255,0.14)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a052e0' }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b3fb0]">
                  {expired ? 'Kampanjen er avsluttet' : `Gjelder til 10. juli · ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dager'} igjen`}
                </span>
              </div>
              <h1 className="text-[38px] sm:text-[52px] font-bold tracking-[-0.035em] leading-[1.04] mt-6">
                10 % forvaltnings­honorar.
                <br />
                <span style={{ color: '#a052e0' }}>0 kr i oppstart.</span>
              </h1>
              <p className="text-[16px] sm:text-[17px] text-[#666] leading-[1.65] mt-5 max-w-[520px]">
                Sommeren er høysesong for utleie i Bergen. Registrer deg innen 10. juli, så får du full forvaltning til kampanjepris — vi tar oss av alt, du får leien rett på konto.
              </p>

              <div className="mt-10 space-y-0 divide-y divide-[#f0ede8] border-y border-[#f0ede8]">
                {INCLUDED.map((x, i) => (
                  <div key={i} className="flex gap-4 py-5">
                    <span className="text-[13px] font-bold tabular-nums mt-0.5" style={{ color: '#a052e0' }}>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-[15px] font-semibold">{x.t}</p>
                      <p className="text-[13.5px] text-[#888] leading-[1.6] mt-1">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-[#aaa] leading-[1.6] mt-6 max-w-[480px]">
                Kampanjen gjelder nye avtaler om full forvaltning inngått innen 10. juli 2026. Ingen bindingstid, ingen skjulte gebyrer. Uforpliktende registrering — vi tar kontakt for en kort prat først.
              </p>
            </div>

            {/* ---------- Høyre: skjema ---------- */}
            <div>
              <form onSubmit={submit} className="rounded-3xl border border-[#eee7f5] bg-[#fdfcfe] p-6 sm:p-7 lg:sticky lg:top-8" style={{ boxShadow: '0 20px 60px -30px rgba(160,82,224,0.18)' }} data-testid="sommer-form">
                <p className="text-[17px] font-bold tracking-[-0.01em]">Sikre deg kampanjeprisen</p>
                <p className="text-[13px] text-[#999] mt-1">Tar under ett minutt — helt uforpliktende.</p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Navn *</label>
                    <input value={name} onChange={(e) => { markStart(); setName(e.target.value); }} placeholder="Fornavn Etternavn" data-testid="sommer-name"
                      className="w-full h-[46px] rounded-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Telefon *</label>
                    <div className="flex">
                      <span className="h-[46px] px-3 rounded-l-xl border border-r-0 border-[#e8e2ef] bg-[#f7f4fa] text-[13.5px] text-[#888] flex items-center">+47</span>
                      <input value={phone} onChange={(e) => { markStart(); setPhone(e.target.value.replace(/[^\d\s]/g, '')); }} placeholder="900 00 000" inputMode="tel" data-testid="sommer-phone"
                        className="w-full h-[46px] rounded-r-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">E-post *</label>
                    <input value={email} onChange={(e) => { markStart(); setEmail(e.target.value); }} placeholder="din@epost.no" inputMode="email" data-testid="sommer-email"
                      className="w-full h-[46px] rounded-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Adresse på utleieboligen <span className="font-normal text-[#aaa]">(valgfritt)</span></label>
                    <AddressAutocomplete
                      value={address}
                      onChange={(v: string) => { markStart(); setAddress(v); }}
                      onSelect={(s: any) => { setAddress(s.address); setPostal(s.postalCode || ''); }}
                      placeholder="F.eks. Nordnesveien 13, Bergen"
                      dataTestId="sommer-address"
                      inputClassName="w-full h-[46px] rounded-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]"
                    />
                  </div>
                </div>

                {err ? <p className="text-[13px] text-red-600 mt-4" data-testid="sommer-error">{err}</p> : null}

                <button type="submit" disabled={!valid || sending || expired} data-testid="sommer-submit"
                  className="w-full h-[52px] rounded-full mt-6 text-[15px] font-bold transition-all disabled:opacity-40"
                  style={{ background: '#0a0a0a', color: '#fff' }}>
                  {sending ? 'Sender…' : expired ? 'Kampanjen er avsluttet' : 'Få kampanjeprisen →'}
                </button>

                <div className="flex items-center gap-2.5 mt-5">
                  <img src="/sarah-sleeman.jpg" alt="Sarah Sleeman" className="w-[34px] h-[34px] rounded-full object-cover" />
                  <p className="text-[11.5px] text-[#999] leading-[1.5]">Sarah Sleeman (daglig leder) tar personlig kontakt innen 24 timer.</p>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#f0ede8]">
        <div className="max-w-[1080px] mx-auto px-5 h-[58px] flex items-center justify-between">
          <span className="text-[12px] text-[#bbb]">DigiHome · Bergen</span>
          <Link href="/" className="text-[12px] text-[#999] hover:text-[#0a0a0a]">digihome.no</Link>
        </div>
      </footer>
    </div>
  );
}
