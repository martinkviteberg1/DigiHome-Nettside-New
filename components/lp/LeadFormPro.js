'use client';

// To-stegs lead-skjema for utleier-landingssidene (Google Ads).
// Steg 1: kun adresse (mikroforpliktelse) → Steg 2: kontaktinfo.
// Beviselig best practice: lav terskel først, detaljer etterpå.
// UI i V4-drakt (canvas/ink/lilla, hårlinjer) — logikken (adresseverifisering,
// sporing, innsending) er uendret.

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Wallet, Phone, Lock, Sparkles } from 'lucide-react';
import { site } from '@/lib/site';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { useAddressAutocomplete } from '@/components/lp/lp-shared';

const PHONE_RE = /^(?:\+47)?\s?(?:\d\s?){8}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// 16 px på mobil er ikke en smakssak: iOS Safari zoomer inn på et felt med
// mindre fontstørrelse ved fokus, og da hopper hele landingssiden i skjemaet.
const inputBase = 'w-full h-14 px-5 rounded-[14px] border-0 bg-[#FBFAF8] outline-none text-[16px] text-[#15130F] placeholder:text-[#15130F]/40 transition-[box-shadow] duration-200 focus:outline-none focus:ring-0';
const inputOk = 'shadow-[0_0_0_1px_rgba(21,19,15,0.14)] focus:shadow-[0_0_0_2px_#15130F]';
const inputErr = 'shadow-[0_0_0_2px_#B42318]';
const INK = '#15130F';
const LILLA = '#D496FF';
const GRONN = '#1F9D55';
const FLATE = '#EDEAE3';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.48)';
const HAIR = 'rgba(21,19,15,0.12)';
const display = { fontFamily: 'var(--font-heading), sans-serif', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.04 };

export default function LeadFormPro({ cfg }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState('idle');
  const [fieldErr, setFieldErr] = useState({});
  const [err, setErr] = useState('');
  const startedRef = useRef(false);
  const calcRef = useRef(null); // valgt kalkulator-estimat (om brukt)
  const nameRef = useRef(null);
  const ac = useAddressAutocomplete();
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setFieldErr((fe) => ({ ...fe, [k]: '' })); };

  // Lytt på leiekalkulatoren — beriker leadet med estimatet brukeren så.
  useEffect(() => {
    const onCalc = (e) => { calcRef.current = e.detail || null; };
    window.addEventListener('lp:calc', onCalc);
    return () => window.removeEventListener('lp:calc', onCalc);
  }, []);

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { trackLeadStart(cfg.source); } catch (e) { /* best-effort: aldri blokker skjemaet */ }
    try { track('lead_step', { step: 'start', form: cfg.source }); } catch (e) { /* best-effort: aldri blokker skjemaet */ }
  };

  const goStep2 = () => {
    handleStart();
    setStep(2);
    setErr('');
    try { track('lead_step', { step: 'step2', form: cfg.source }); } catch (e) { /* best-effort: aldri blokker skjemaet */ }
    // Fokus på navn-feltet for flyt (etter render)
    setTimeout(() => { try { nameRef.current?.focus({ preventScroll: true }); } catch (e) { /* best-effort: aldri blokker skjemaet */ } }, 60);
  };

  // Adressen MÅ velges fra listen (postnr + husnummer) — eller hoppes helt over.
  // Stopper ufullstendige adresser («Snikvegen 65A» uten postnr) i CRM-et.
  const [addrSel, setAddrSel] = useState(null); // { postalCode } når full adresse er verifisert
  const [addrHint, setAddrHint] = useState('');
  const [addressResolving, setAddressResolving] = useState(false);

  const chooseSuggestion = async (s) => {
    const txt = (s.text || s.label || '').trim();
    if (!/\d/.test(txt)) {
      ac.setQuery(txt + ' ');
      setAddrSel(null);
      setAddrHint('Legg til husnummer (f.eks. 12) og velg adressen fra listen.');
      ac.setOpen(false);
      return false;
    }
    setAddressResolving(true);
    ac.skipRef.current = true;
    ac.setQuery(txt);
    ac.setOpen(false);
    setAddrHint('Bekrefter adressen …');
    let postal = '';
    let city = '';
    try {
      if (s.place_id) {
        const r = await fetch(`/api/address?place_id=${encodeURIComponent(s.place_id)}`);
        const d = await r.json();
        if (d && d.ok) {
          postal = String(d.postalCode || '').trim();
          city = String(d.city || '').trim();
          if (d.label || d.address) { ac.skipRef.current = true; ac.setQuery(d.label || d.address); }
        }
      } else {
        const raw = `${s.text || s.label || ''} ${s.sub || ''}`;
        const m = raw.match(/\b(\d{4})\b/);
        postal = m ? m[1] : '';
        city = String(s.city || '').trim();
      }
      if (!/^\d{4}$/.test(postal)) {
        setAddrSel(null);
        setAddrHint('Forslaget mangler postnummer. Skriv gate og husnummer, og velg en fullstendig adresse.');
        return false;
      }
      setAddrSel({ postalCode: postal, city });
      setAddrHint('Adressen er bekreftet.');
      return true;
    } catch (e) {
      setAddrSel(null);
      setAddrHint('Vi klarte ikke å bekrefte adressen. Prøv å velge forslaget på nytt.');
      return false;
    } finally {
      setAddressResolving(false);
    }
  };

  const tryGoStep2 = async () => {
    if (addressResolving) return;
    const q = ac.query.trim();
    if (!q || !addrSel || !/^\d{4}$/.test(addrSel.postalCode || '')) {
      const hit = ac.suggestions.find((s) => (s.text || s.label || '').trim().toLowerCase() === q.toLowerCase());
      if (hit && /\d/.test(hit.text || hit.label || '')) {
        const ok = await chooseSuggestion(hit);
        if (ok) goStep2();
        return;
      }
      setAddrHint(q ? 'Velg en fullstendig adresse fra forslagslisten.' : 'Skriv gate og husnummer, og velg adressen fra listen.');
      if (ac.suggestions.length) ac.setOpen(true);
      try { track('lead_step', { step: 'address_unverified', form: cfg.source }); } catch (e) { /* best-effort: aldri blokker skjemaet */ }
      return;
    }
    goStep2();
  };



  const validate = () => {
    const fe = {};
    if (!form.name.trim()) fe.name = 'Hva heter du?';
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!PHONE_RE.test(phone)) fe.phone = 'Skriv inn et gyldig norsk telefonnummer (8 siffer).';
    if (!EMAIL_RE.test(email)) fe.email = 'Skriv inn en gyldig e-postadresse.';
    setFieldErr(fe);
    return Object.keys(fe).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) { setStatus('error'); return; }
    setErr(''); setStatus('sending');
    const calc = calcRef.current;
    const notes = `Landingsside: ${cfg.h1}` + (calc ? ` | Kalkulator: ${calc.area}, ${calc.bedrooms} sov, estimat ${calc.low.toLocaleString('nb-NO')}–${calc.high.toLocaleString('nb-NO')} kr/mnd` : '');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
          address: ac.query.trim(), postal_code: (addrSel && addrSel.postalCode) || undefined,
          lead_type: 'huseier', source: cfg.source,
          notes,
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      if (!res.ok) throw new Error('api');
      let data = {};
      try { data = await res.json(); } catch (e2) { /* best-effort: tracking/JSON må aldri blokkere leadet */ }
      try { track('lead_submit', { form: cfg.source, leadId: data?.data?.id || null }); } catch (e2) { /* best-effort: tracking/JSON må aldri blokkere leadet */ }
      try { track('lead_step', { step: 'submit', form: cfg.source }); } catch (e2) { /* best-effort: tracking/JSON må aldri blokkere leadet */ }
      try { await Promise.race([
        trackLead({ formId: cfg.source, source: cfg.source, leadId: data?.data?.id, email: form.email, phone: form.phone }),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]); } catch (e2) { /* best-effort: tracking/JSON må aldri blokkere leadet */ }
      try { window.dispatchEvent(new CustomEvent('lp:done')); } catch (e2) { /* best-effort: tracking/JSON må aldri blokkere leadet */ }
      setStatus('done');
    } catch (e2) {
      setErr('Noe gikk galt. Prøv igjen — eller ring oss på ' + site.phone + '.');
      setStatus('error');
    }
  };

  /* ------------------------------ Ferdig-state ------------------------------ */
  if (status === 'done') {
    const firstName = form.name.trim().split(/\s+/)[0];
    return (
      <div className="rounded-[20px] p-6 sm:p-8" style={{ background: FLATE }} data-testid="lp-form-done">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)', color: GRONN }}>
            <Check className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <p className="text-[26px] sm:text-[30px]" style={{ ...display, color: INK }}>Takk{firstName ? `, ${firstName}` : ''}<span style={{ color: LILLA }}>.</span></p>
        </div>
        <p className="mt-3 text-[15.5px] leading-[1.5]" style={{ color: DIM }}>Vurderingen er i gang. Slik går det videre:</p>
        <ol className="mt-5 border-t" style={{ borderColor: HAIR }}>
          {[
            'Vi ser på boligen og leiemarkedet i området ditt',
            'Du hører fra oss innen 24 timer med en konkret vurdering',
            'Du bestemmer — helt uforpliktende',
          ].map((t, i) => (
            <li key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 border-b py-3 text-[15px]" style={{ borderColor: HAIR, color: 'rgba(21,19,15,0.8)' }}>
              <span className="pt-[3px] text-[12.5px] tabular-nums" style={{ color: SVAK }}>0{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <a href={`tel:${site.phoneHref}`} className="mt-5 inline-flex items-center gap-2 text-[14.5px] font-medium transition-colors hover:text-[#15130F]/70" style={{ color: INK }}>
          <Phone className="h-4 w-4" strokeWidth={1.8} /> Haster det? Ring {site.phone}
        </a>
      </div>
    );
  }

  /* -------------------------------- Steg 1 -------------------------------- */
  if (step === 1) {
    return (
      <div onFocus={handleStart} className="relative rounded-[20px] p-5 sm:p-7" style={{ background: FLATE }} data-testid="lp-form-step1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <p className="basis-full text-[24px] sm:basis-auto sm:text-[28px]" style={{ ...display, color: INK }}>{cfg.formTitle || 'Se hva boligen din kan tjene'}</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium" style={{ color: GRONN }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: GRONN }} /> Svar innen 24 t
          </span>
        </div>
        <p className="mt-1.5 text-[14px]" style={{ color: DIM }}>Gratis og uforpliktende — det tar under ett minutt.</p>

        <div className="relative mt-5">
          <div className="flex items-center rounded-[14px] pl-4 pr-1.5 transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_2px_#15130F]" style={{ background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.14)' }}>
            <MapPin className="h-[18px] w-[18px] shrink-0" style={{ color: SVAK }} strokeWidth={1.8} />
            <input
              value={ac.query}
              onChange={(e) => { ac.setQuery(e.target.value); if (addrSel) setAddrSel(null); if (addrHint) setAddrHint(''); }}
              onFocus={() => { handleStart(); if (ac.suggestions.length) ac.setOpen(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (ac.open && ac.suggestions.length) chooseSuggestion(ac.suggestions[0]).then((ok) => { if (ok) goStep2(); });
                  else tryGoStep2();
                }
              }}
              placeholder="Adressen til boligen din"
              autoComplete="off"
              enterKeyHint="go"
              className="h-14 min-w-0 flex-1 bg-transparent px-3 text-[16px] outline-none placeholder:text-[#15130F]/40 focus:outline-none focus:ring-0"
              style={{ color: INK }}
              data-testid="lp-address"
            />
            <button
              type="button"
              onClick={tryGoStep2}
              disabled={addressResolving}
              className="group hidden h-[46px] shrink-0 items-center gap-1.5 rounded-[11px] px-5 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 sm:inline-flex"
              style={{ background: INK, color: '#F4F1EA' }}
              data-testid="lp-step1-next"
            >
              {addressResolving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Bekrefter</> : <>{cfg.cta || 'Få gratis vurdering'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} /></>}
            </button>
          </div>
          {addrHint && <p role="status" aria-live="polite" className="mt-2 text-[12.5px]" style={{ color: addrSel ? GRONN : '#8A5A00' }} data-testid="lp-address-hint">{addrHint}</p>}
          {ac.open && ac.suggestions.length > 0 && (
            <ul className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-[14px]" style={{ background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.10), 0 24px 48px -16px rgba(21,19,15,0.25)' }}>
              {ac.suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button" onClick={() => chooseSuggestion(s)} className="w-full px-4 py-3 text-left text-[14.5px] transition-colors hover:bg-[#15130F]/[0.04]">
                    <span style={{ color: INK }}>{s.text || s.label}</span>
                    {s.sub ? <span style={{ color: SVAK }}> · {s.sub}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={tryGoStep2}
          disabled={addressResolving}
          className="group mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:hidden"
          style={{ background: INK, color: '#F4F1EA' }}
        >
          {addressResolving ? <><Loader2 className="h-4 w-4 animate-spin" /> Bekrefter adressen</> : <>{cfg.cta || 'Få gratis vurdering'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} /></>}
        </button>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]" style={{ color: SVAK }}>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" style={{ color: GRONN }} strokeWidth={1.8} /> Gratis og uforpliktende</span>
          <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" style={{ color: GRONN }} strokeWidth={1.8} /> 0 kr oppstart</span>
        </div>
      </div>
    );
  }

  /* -------------------------------- Steg 2 -------------------------------- */
  return (
    <form onSubmit={submit} onFocus={handleStart} className="relative space-y-4 rounded-[20px] p-5 sm:p-7" style={{ background: FLATE }} data-testid="lp-form-step2">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[24px] sm:text-[28px]" style={{ ...display, color: INK }}>Nesten ferdig — hvor når vi deg<span style={{ color: LILLA }}>?</span></p>
          <span className="shrink-0 text-[12px] tabular-nums" style={{ color: SVAK }}>Steg 2 av 2</span>
        </div>
        <div className="mt-3 h-px w-full overflow-hidden" style={{ background: 'rgba(21,19,15,0.12)' }}>
          <div className="h-full w-[85%] origin-left" style={{ background: LILLA }} />
        </div>
      </div>

      {ac.query.trim() ? (
        <button type="button" onClick={() => setStep(1)} className="inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] transition-colors hover:bg-[#15130F]/[0.08]" style={{ background: 'rgba(21,19,15,0.05)', color: 'rgba(21,19,15,0.75)' }}>
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: INK }} strokeWidth={1.8} />
          <span className="truncate">{ac.query.trim()}</span>
          <span className="shrink-0 underline underline-offset-2" style={{ color: SVAK }}>endre</span>
        </button>
      ) : (
        <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-[13px] transition-colors hover:text-[#15130F]" style={{ color: SVAK }}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} /> Legg til adresse (valgfritt)
        </button>
      )}

      <div>
        <label htmlFor="lp-lead-name" className="mb-2 block text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}>Fullt navn</label>
        <input id="lp-lead-name" ref={nameRef} value={form.name} onChange={set('name')} placeholder="Ola Nordmann" autoComplete="name" enterKeyHint="next" required aria-invalid={!!fieldErr.name}
          className={`${inputBase} ${fieldErr.name ? inputErr : inputOk}`} data-testid="lp-lead-name" />
        {fieldErr.name ? <p className="mt-1.5 text-[12.5px]" style={{ color: '#B42318' }}>{fieldErr.name}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lp-lead-phone" className="mb-2 block text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}>Telefon</label>
          <input id="lp-lead-phone" value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="8 siffer" autoComplete="tel" enterKeyHint="next" required aria-invalid={!!fieldErr.phone}
            className={`${inputBase} ${fieldErr.phone ? inputErr : inputOk}`} data-testid="lp-lead-phone" />
          {fieldErr.phone ? <p className="mt-1.5 text-[12.5px]" style={{ color: '#B42318' }}>{fieldErr.phone}</p> : null}
        </div>
        <div>
          <label htmlFor="lp-lead-email" className="mb-2 block text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}>E-post</label>
          <input id="lp-lead-email" value={form.email} onChange={set('email')} type="email" inputMode="email" placeholder="ola@eksempel.no" autoComplete="email" enterKeyHint="done" required aria-invalid={!!fieldErr.email}
            className={`${inputBase} ${fieldErr.email ? inputErr : inputOk}`} data-testid="lp-lead-email" />
          {fieldErr.email ? <p className="mt-1.5 text-[12.5px]" style={{ color: '#B42318' }}>{fieldErr.email}</p> : null}
        </div>
      </div>
      {err ? <p className="text-[13px]" style={{ color: '#B42318' }}>{err}</p> : null}
      <button type="submit" disabled={status === 'sending'} className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium transition-transform active:scale-[0.98] disabled:opacity-60" style={{ background: INK, color: '#F4F1EA' }} data-testid="lp-submit">
        {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Få gratis vurdering <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} /></>}
      </button>
      <div className="flex flex-wrap items-center justify-center gap-4 pt-0.5 text-[12.5px]" style={{ color: SVAK }}>
        <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" style={{ color: GRONN }} strokeWidth={1.8} /> Vi deler aldri opplysningene dine</span>
        <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" style={{ color: GRONN }} strokeWidth={1.8} /> Svar innen 24 t</span>
      </div>
      {/* Samtykketekst — annonseplattformene krever et synlig personvernpunkt
          på skjemaer som samler inn kontaktopplysninger. Lenken åpnes i ny fane
          så brukeren ikke mister det hen har skrevet. */}
      <p className="text-center text-[11.5px] leading-relaxed" style={{ color: SVAK }}>
        Ved å sende inn samtykker du til at vi kontakter deg om utleie av boligen din. Les{' '}
        <a href="/personvern" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-[#15130F]" style={{ textDecorationColor: 'rgba(21,19,15,0.3)' }}>personvernerklæringen</a>.
      </p>
    </form>
  );
}
