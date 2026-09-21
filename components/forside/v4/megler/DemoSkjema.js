'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EASE, T, display, useSynlig, Knapp } from '../motion';
import { useSpamGuard } from '../SpamGuard';

/* ---------------------------------------------------------------------------
   DemoSkjema — «Se morgenen deres i systemet.» (#demo)

   Inline demo-booking med færrest mulig klikk: navn, selskap, e-post (+
   telefon og antall leieforhold, valgfritt) rett på siden. Sender til det
   eksisterende /api/leads (spamvern, rate-limit, CRM, videresending) med
   lead_type 'megler' og owner_kind 'business'. Kalkulatoren og partner-
   seksjonen forhåndsfyller via event/sessionStorage (se sendTilDemo).
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';
const EPOST = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const HVA = [
  ['Deres egne tall', 'Vi setter opp demoen med deres eiere og boliger.'],
  ['Pris innen en uke', 'Regnet per leieforhold under forvaltning.'],
  ['Ingen forpliktelser', 'Dere bestemmer etterpå.'],
];

const INPUT = 'mt-1.5 h-11 w-full bg-transparent text-[16px] outline-none placeholder:text-[#15130F]/30';

function Felt({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[12.5px] font-medium" style={{ color: SVAK }}>{label}</span>
      {children}
    </label>
  );
}

export default function DemoSkjema() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.15);
  const { honeypot, getSpamFields } = useSpamGuard();
  const [f, setF] = useState({ navn: '', epost: '', telefon: '', selskap: '', leieforhold: '', partner: false });
  const [st, setSt] = useState('idle');
  const [feil, setFeil] = useState('');

  useEffect(() => {
    try {
      const n = window.sessionStorage.getItem('dh_megler_leieforhold');
      const p = window.sessionStorage.getItem('dh_megler_partner') === '1';
      if (n || p) setF((x) => ({ ...x, leieforhold: n || x.leieforhold, partner: p || x.partner }));
    } catch (e) { /* stille */ }
    const on = (e) => {
      const d = (e && e.detail) || {};
      setF((x) => ({ ...x, ...(d.leieforhold ? { leieforhold: String(d.leieforhold) } : {}), ...(d.partner ? { partner: true } : {}) }));
    };
    window.addEventListener('dh-megler-demo', on);
    return () => window.removeEventListener('dh-megler-demo', on);
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    if (st !== 'idle') { setSt('idle'); setFeil(''); }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!f.navn.trim() || !f.selskap.trim()) { setSt('ugyldig'); setFeil('Skriv inn navn og selskap.'); return; }
    if (!EPOST.test(f.epost.trim())) { setSt('ugyldig'); setFeil('Skriv inn en gyldig e-postadresse.'); return; }
    setSt('sender');
    const n = Number(String(f.leieforhold).replace(/\D/g, '')) || null;
    try {
      const r = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.navn.trim(), email: f.epost.trim(), phone: f.telefon.trim(),
          company_name: f.selskap.trim(), owner_kind: 'business', lead_type: 'megler',
          num_properties: n || undefined,
          notes: `Demo-forespørsel fra /utleiemeglere${n ? ` · ${n} leieforhold` : ''}${f.partner ? ' · Ønsker vurdering for partnerprogrammet 2025' : ''}`,
          source: 'utleiemeglere-demo',
          ...getSpamFields(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && (j.success || j.ok)) {
        setSt('ok');
        try { window.sessionStorage.removeItem('dh_megler_leieforhold'); window.sessionStorage.removeItem('dh_megler_partner'); } catch (er) { /* stille */ }
      } else { setSt('feil'); setFeil(j.error || 'Noe gikk galt. Prøv igjen, eller send oss en e-post.'); }
    } catch (err) { setSt('feil'); setFeil('Fikk ikke kontakt. Prøv igjen om et øyeblikk.'); }
  };

  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  const kant = (rod) => ({ borderBottom: `1px solid ${rod ? '#B4462F' : 'rgba(21,19,15,0.3)'}`, color: T.ink });
  const ugyldig = st === 'ugyldig';
  const fornavn = f.navn.trim().split(/\s+/)[0] || '';

  return (
    <section id="demo" ref={ref} className="relative scroll-mt-[72px] lg:scroll-mt-[64px]" style={{ background: T.flate, color: T.ink }} data-testid="v4m-demo">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Demo</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-demo-tittel">
              Book en demo<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
              Fyll ut skjemaet, så tar vi kontakt innen én virkedag. Demoen tar 30 minutter.
            </p>
            <ol className="mt-8 grid gap-5">
              {HVA.map(([t, d], i) => (
                <li key={t} className="border-t pt-4" style={{ borderColor: HAIR, ...inn(3 + i, 10) }}>
                  <p className="text-[15.5px] font-medium" style={{ color: T.ink }}>{t}</p>
                  <p className="mt-1 max-w-[40ch] text-[14px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-7" style={inn(4, 20)}>
            <div className="rounded-[22px] px-6 py-7 sm:px-8 sm:py-9" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 48px 100px -56px rgba(21,19,15,0.35)' }}>
              {st === 'ok' ? (
                <div data-testid="v4m-demo-ok">
                  <p className="inline-flex items-center gap-2.5 text-[14px] font-medium" style={{ color: '#166B3C' }}><span className="h-2 w-2 rounded-full" style={{ background: T.gronn }} />Mottatt</p>
                  <p className="mt-4 text-[clamp(28px,3vw,40px)]" style={{ ...display, color: T.ink }}>Takk{fornavn ? `, ${fornavn}` : ''}<span style={{ color: T.lilla }}>.</span></p>
                  <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.5]" style={{ color: DIM }}>
                    Vi tar kontakt innen én virkedag og foreslår et tidspunkt. Demoen setter vi opp med tallene til {f.selskap.trim()}{f.partner ? ', og vi ser på søknaden om partnerplass samtidig' : ''}.
                  </p>
                </div>
              ) : (
                <form onSubmit={send} noValidate data-testid="v4m-demo-skjema">
                  {honeypot}
                  <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    <Felt label="Navn"><input value={f.navn} onChange={set('navn')} autoComplete="name" placeholder="Fornavn Etternavn" className={INPUT} style={kant(ugyldig && !f.navn.trim())} data-testid="v4m-demo-navn" /></Felt>
                    <Felt label="Selskap"><input value={f.selskap} onChange={set('selskap')} autoComplete="organization" placeholder="Byrået AS" className={INPUT} style={kant(ugyldig && !f.selskap.trim())} data-testid="v4m-demo-selskap" /></Felt>
                    <Felt label="E-post"><input type="email" value={f.epost} onChange={set('epost')} autoComplete="email" placeholder="navn@byraet.no" className={INPUT} style={kant(ugyldig && !EPOST.test(f.epost.trim()))} data-testid="v4m-demo-epost" /></Felt>
                    <Felt label="Telefon (valgfritt)"><input type="tel" value={f.telefon} onChange={set('telefon')} autoComplete="tel" placeholder="+47" className={INPUT} style={kant(false)} data-testid="v4m-demo-telefon" /></Felt>
                    <Felt label="Leieforhold under forvaltning (ca.)"><input inputMode="numeric" value={f.leieforhold} onChange={set('leieforhold')} placeholder="120" className={INPUT} style={kant(false)} data-testid="v4m-demo-leieforhold" /></Felt>
                    <label className="flex items-start gap-3 pt-6 text-[14px] leading-[1.45]" style={{ color: DIM }}>
                      <input type="checkbox" checked={f.partner} onChange={set('partner')} className="mt-[3px] h-4 w-4 shrink-0 accent-[#15130F]" data-testid="v4m-demo-partner" />
                      <span>Vi vil gjerne bli vurdert for <span style={{ color: T.ink }}>partnerprogrammet</span> (fem plasser i 2025)</span>
                    </label>
                  </div>
                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                    <Knapp type="submit" disabled={st === 'sender'} className="disabled:opacity-60" data-testid="v4m-demo-send">{st === 'sender' ? 'Sender …' : 'Book en demo'}</Knapp>
                    <Link href="/bli-utleier/start?kind=business" className="text-[14.5px] underline decoration-[#15130F]/25 underline-offset-4 hover:decoration-[#15130F]" style={{ color: T.ink }} data-testid="v4m-demo-registrer">Eller registrer selskapet direkte</Link>
                  </div>
                  {feil ? <p className="mt-4 text-[14px]" style={{ color: '#B4462F' }} role="alert" data-testid="v4m-demo-feil">{feil}</p> : null}
                  <p className="mt-5 text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>Vi bruker opplysningene bare til å ta kontakt om demoen, ikke til nyhetsbrev.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
