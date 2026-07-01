'use client';

// To-stegs lead-skjema for utleier-landingssidene (Google Ads).
// Steg 1: kun adresse (mikroforpliktelse) → Steg 2: kontaktinfo.
// Beviselig best practice: lav terskel først, detaljer etterpå.

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Wallet, Phone, Lock, Sparkles } from 'lucide-react';
import { site } from '@/lib/site';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { useAddressAutocomplete } from '@/components/lp/lp-shared';

const PHONE_RE = /^(?:\+47)?\s?(?:\d\s?){8}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

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
    try { trackLeadStart(cfg.source); } catch (e) {}
    try { track('lead_step', { step: 'start', form: cfg.source }); } catch (e) {}
  };

  const goStep2 = () => {
    handleStart();
    setStep(2);
    setErr('');
    try { track('lead_step', { step: 'step2', form: cfg.source }); } catch (e) {}
    // Fokus på navn-feltet for flyt (etter render)
    setTimeout(() => { try { nameRef.current?.focus({ preventScroll: true }); } catch (e) {} }, 60);
  };

  const validate = () => {
    const fe = {};
    if (!form.name.trim()) fe.name = 'Hva heter du?';
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!phone && !email) {
      fe.phone = 'Oppgi telefon eller e-post, så når vi deg.';
    } else {
      if (phone && !PHONE_RE.test(phone)) fe.phone = 'Sjekk telefonnummeret (8 siffer).';
      if (email && !EMAIL_RE.test(email)) fe.email = 'Sjekk e-postadressen.';
    }
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
          address: ac.query.trim(), lead_type: 'huseier', source: cfg.source,
          notes,
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      if (!res.ok) throw new Error('api');
      let data = {};
      try { data = await res.json(); } catch (e2) {}
      try { trackLead({ formId: cfg.source, source: cfg.source, leadId: data?.data?.id, email: form.email, phone: form.phone }); } catch (e2) {}
      try { track('lead_step', { step: 'submit', form: cfg.source }); } catch (e2) {}
      try { window.dispatchEvent(new CustomEvent('lp:done')); } catch (e2) {}
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
      <div className="rounded-[24px] border border-success/25 bg-success-bg px-6 py-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white border border-success/30">
            <Check className="h-5 w-5 text-success" />
          </span>
          <p className="font-heading font-bold text-[20px] text-ink leading-tight">Takk{firstName ? `, ${firstName}` : ''}! Vurderingen er i gang.</p>
        </div>
        <ol className="mt-5 space-y-3">
          {[
            'Vi analyserer boligen og leiemarkedet i området ditt',
            'Du får en konkret vurdering innen 24 timer',
            'Du bestemmer — helt uforpliktende',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-[14.5px] text-ink-soft">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-success/25 text-success text-[12px] font-bold">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <a href={`tel:${site.phoneHref}`} className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-ink hover:text-lavender transition-colors">
          <Phone className="w-4 h-4" /> Haster det? Ring {site.phone}
        </a>
      </div>
    );
  }

  /* -------------------------------- Steg 1 -------------------------------- */
  if (step === 1) {
    return (
      <div
        onFocus={handleStart}
        className="relative rounded-[24px] bg-surface/95 backdrop-blur-sm shadow-[0_40px_100px_-50px_rgba(10,10,10,0.5),0_2px_12px_rgba(10,10,10,0.05)] p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading font-bold text-[19px] text-ink leading-tight">{cfg.formTitle || 'Se hva boligen din kan tjene'}</p>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-[11px] font-semibold px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Svar &lt; 24t
          </span>
        </div>
        <p className="text-[13.5px] text-quiet mt-1">Gratis og uforpliktende — det tar under ett minutt.</p>

        <div className="relative mt-4">
          <div className="flex items-center rounded-[16px] border border-hairline bg-canvas pl-4 pr-1.5 py-1.5 focus-within:border-[#c9b8e4] focus-within:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] transition-all">
            <MapPin className="h-4 w-4 text-taupe shrink-0" />
            <input
              value={ac.query}
              onChange={(e) => ac.setQuery(e.target.value)}
              onFocus={() => { handleStart(); if (ac.suggestions.length) ac.setOpen(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ac.setOpen(false); goStep2(); } }}
              placeholder="Adressen til boligen din"
              autoComplete="off"
              enterKeyHint="go"
              className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-[15px] placeholder:text-taupe"
            />
            <button
              type="button"
              onClick={() => { ac.setOpen(false); goStep2(); }}
              className="group hidden sm:inline-flex shrink-0 h-11 items-center gap-1.5 rounded-full bg-ink text-canvas px-5 text-[14px] font-semibold hover:shadow-[0_14px_30px_-12px_rgba(10,10,10,0.55)] transition-all"
            >
              {cfg.cta || 'Start gratis vurdering'} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          {ac.open && ac.suggestions.length > 0 && (
            <ul className="absolute z-30 mt-1.5 w-full rounded-[14px] border border-hairline bg-surface shadow-xl overflow-hidden">
              {ac.suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button" onClick={() => { ac.setQuery(s.text || s.label || ''); ac.setOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-fill transition-colors">
                    <span className="text-ink">{s.text || s.label}</span>
                    {s.sub ? <span className="text-taupe"> · {s.sub}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => { ac.setOpen(false); goStep2(); }}
          className="group sm:hidden mt-3 w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_14px_30px_-12px_rgba(10,10,10,0.5)]"
        >
          {cfg.cta || 'Start gratis vurdering'} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="mt-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 text-[12px] text-taupe">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Uforpliktende</span>
            <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-success" /> 0 kr oppstart</span>
          </div>
          <button type="button" onClick={goStep2} className="text-[12.5px] text-quiet underline underline-offset-2 hover:text-ink transition-colors">
            Har ikke adressen klar? Hopp over
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------- Steg 2 -------------------------------- */
  return (
    <form
      onSubmit={submit}
      onFocus={handleStart}
      className="relative rounded-[24px] bg-surface/95 backdrop-blur-sm shadow-[0_40px_100px_-50px_rgba(10,10,10,0.5),0_2px_12px_rgba(10,10,10,0.05)] p-5 sm:p-6 space-y-3.5"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading font-bold text-[19px] text-ink leading-tight">Nesten ferdig — hvor når vi deg?</p>
          <span className="shrink-0 text-[11px] font-semibold text-quiet">Steg 2 av 2</span>
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-fill overflow-hidden">
          <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-lavender to-lavender-soft transition-all" />
        </div>
      </div>

      {ac.query.trim() ? (
        <button type="button" onClick={() => setStep(1)}
          className="inline-flex max-w-full items-center gap-2 rounded-full bg-fill px-3.5 py-1.5 text-[13px] text-ink-soft hover:bg-hairline transition-colors">
          <MapPin className="w-3.5 h-3.5 text-lavender shrink-0" />
          <span className="truncate">{ac.query.trim()}</span>
          <span className="text-quiet underline underline-offset-2 shrink-0">endre</span>
        </button>
      ) : (
        <button type="button" onClick={() => setStep(1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-quiet hover:text-ink transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Legg til adresse (valgfritt)
        </button>
      )}

      <div>
        <input ref={nameRef} value={form.name} onChange={set('name')} placeholder="Navn" autoComplete="name" enterKeyHint="next"
          className={`w-full h-12 px-4 rounded-[14px] border bg-canvas outline-none text-[15px] placeholder:text-taupe transition-all ${fieldErr.name ? 'border-rose-300 shadow-[0_0_0_4px_rgba(244,63,94,0.07)]' : 'border-hairline focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)]'}`} />
        {fieldErr.name ? <p className="text-[12.5px] text-rose-500 mt-1.5 ml-1">{fieldErr.name}</p> : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="Telefon" autoComplete="tel" enterKeyHint="next"
            className={`w-full h-12 px-4 rounded-[14px] border bg-canvas outline-none text-[15px] placeholder:text-taupe transition-all ${fieldErr.phone ? 'border-rose-300 shadow-[0_0_0_4px_rgba(244,63,94,0.07)]' : 'border-hairline focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)]'}`} />
          {fieldErr.phone ? <p className="text-[12.5px] text-rose-500 mt-1.5 ml-1">{fieldErr.phone}</p> : null}
        </div>
        <div>
          <input value={form.email} onChange={set('email')} type="email" inputMode="email" placeholder="E-post" autoComplete="email" enterKeyHint="done"
            className={`w-full h-12 px-4 rounded-[14px] border bg-canvas outline-none text-[15px] placeholder:text-taupe transition-all ${fieldErr.email ? 'border-rose-300 shadow-[0_0_0_4px_rgba(244,63,94,0.07)]' : 'border-hairline focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)]'}`} />
          {fieldErr.email ? <p className="text-[12.5px] text-rose-500 mt-1.5 ml-1">{fieldErr.email}</p> : null}
        </div>
      </div>
      {err ? <p className="text-[13px] text-rose-500">{err}</p> : null}
      <button type="submit" disabled={status === 'sending'}
        className="group w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 transition-all hover:shadow-[0_18px_40px_-14px_rgba(10,10,10,0.6)] hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0">
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Få gratis vurdering <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
      </button>
      <div className="flex items-center justify-center gap-4 text-[12px] text-taupe pt-0.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-success" /> Vi deler aldri opplysningene dine</span>
        <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-success" /> Svar innen 24 timer</span>
      </div>
    </form>
  );
}
