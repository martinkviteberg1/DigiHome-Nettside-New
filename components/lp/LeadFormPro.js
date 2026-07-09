'use client';

// To-stegs lead-skjema for utleier-landingssidene (Google Ads).
// Steg 1: kun adresse (mikroforpliktelse) → Steg 2: kontaktinfo.
// Beviselig best practice: lav terskel først, detaljer etterpå.
// Stylet 1:1 mot adressefeltet i root-heroen (/).

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Wallet, Phone, Lock, Sparkles } from 'lucide-react';
import { site } from '@/lib/site';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { useAddressAutocomplete } from '@/components/lp/lp-shared';

const PHONE_RE = /^(?:\+47)?\s?(?:\d\s?){8}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const inputBase = 'w-full h-12 px-4 rounded-xl border bg-white outline-none text-[15px] placeholder:text-[#737373] transition-all duration-300';
const inputOk = 'border-[#e5e5e5] focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_3px_rgba(207,151,252,0.16)]';
const inputErr = 'border-rose-300 shadow-[0_0_0_3px_rgba(244,63,94,0.07)]';

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

  // Adressen MÅ velges fra listen (postnr + husnummer) — eller hoppes helt over.
  // Stopper ufullstendige adresser («Snikvegen 65A» uten postnr) i CRM-et.
  const [addrSel, setAddrSel] = useState(null); // { postalCode } når valgt fra listen
  const [addrHint, setAddrHint] = useState('');

  const chooseSuggestion = async (s) => {
    const txt = (s.text || s.label || '').trim();
    if (!/\d/.test(txt)) {
      // Gate uten husnummer → be om nummer (nytt søk gir nummer-forslag)
      ac.setQuery(txt + ' ');
      setAddrSel(null);
      setAddrHint('Legg til husnummer (f.eks. 12) og velg adressen fra listen.');
      ac.setOpen(false);
      return;
    }
    ac.skipRef.current = true;
    ac.setQuery(txt);
    ac.setOpen(false);
    setAddrHint('');
    let postal = '';
    if (s.place_id) {
      try {
        const r = await fetch(`/api/address?place_id=${encodeURIComponent(s.place_id)}`);
        const d = await r.json();
        if (d && d.ok) {
          postal = d.postalCode || '';
          if (d.label || d.address) { ac.skipRef.current = true; ac.setQuery(d.label || d.address); }
        }
      } catch (e) { /* beholder forslags-teksten */ }
    } else {
      const m = (s.sub || '').match(/(\d{4})/);
      postal = m ? m[1] : '';
    }
    setAddrSel({ postalCode: postal });
  };

  const tryGoStep2 = () => {
    const q = ac.query.trim();
    if (q && !addrSel) {
      // Eksakt tekstmatch mot et forslag → auto-velg (null ekstra friksjon)
      const hit = ac.suggestions.find((s) => (s.text || s.label || '').trim().toLowerCase() === q.toLowerCase());
      if (hit && /\d/.test(hit.text || hit.label || '')) { chooseSuggestion(hit).then(goStep2); return; }
      setAddrHint('Velg adressen fra forslagslisten — eller trykk «Hopp over» under.');
      if (ac.suggestions.length) ac.setOpen(true);
      try { track('lead_step', { step: 'address_unverified', form: cfg.source }); } catch (e) {}
      return;
    }
    goStep2();
  };

  const skipAddress = () => {
    // «Har ikke adressen klar» = bevisst hopp: tomt adressefelt (ingen halvferdig
    // fritekst i CRM) — Sarah henter adressen i førstesamtalen.
    ac.skipRef.current = true;
    ac.setQuery('');
    setAddrSel(null);
    setAddrHint('');
    ac.setOpen(false);
    goStep2();
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
          address: ac.query.trim(), postal_code: (addrSel && addrSel.postalCode) || undefined,
          lead_type: 'huseier', source: cfg.source,
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
      <div className="rounded-2xl border border-[#18794E]/20 bg-[#E8F4EE] px-6 py-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white border border-[#18794E]/25">
            <Check className="h-5 w-5 text-[#18794E]" />
          </span>
          <p className="font-heading font-bold text-[20px] text-[#0a0a0a] leading-tight">Takk{firstName ? `, ${firstName}` : ''}! Vurderingen er i gang.</p>
        </div>
        <ol className="mt-5 space-y-3">
          {[
            'Vi analyserer boligen og leiemarkedet i området ditt',
            'Du hører fra oss umiddelbart med en konkret vurdering',
            'Du bestemmer — helt uforpliktende',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-[14.5px] text-[#333]">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-[#18794E]/25 text-[#18794E] text-[12px] font-bold">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <a href={`tel:${site.phoneHref}`} className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-[#0a0a0a] hover:text-[#a463e8] transition-colors">
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
        className="relative rounded-2xl bg-white border border-[#eee] shadow-[0_12px_40px_rgba(0,0,0,0.07)] p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading font-bold text-[19px] text-[#0a0a0a] leading-tight">{cfg.formTitle || 'Se hva boligen din kan tjene'}</p>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#E8F4EE] text-[#18794E] text-[11px] font-semibold px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#18794E] animate-pulse" /> Svar umiddelbart
          </span>
        </div>
        <p className="text-[13.5px] text-[#888] mt-1">Gratis og uforpliktende — det tar under ett minutt.</p>

        <div className="relative mt-4">
          <div className="flex items-center rounded-2xl bg-white border pl-4 pr-1.5 py-1.5 transition-all duration-300 border-[#e5e5e5] shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:border-[#cf97fc]/60 focus-within:shadow-[0_0_0_3px_rgba(207,151,252,0.16),0_12px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)]">
            <MapPin className="h-[18px] w-[18px] text-[#737373] shrink-0" />
            <input
              value={ac.query}
              onChange={(e) => { ac.setQuery(e.target.value); if (addrSel) setAddrSel(null); if (addrHint) setAddrHint(''); }}
              onFocus={() => { handleStart(); if (ac.suggestions.length) ac.setOpen(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Enter med åpne forslag = velg det første (standard UX)
                  if (ac.open && ac.suggestions.length) chooseSuggestion(ac.suggestions[0]);
                  else tryGoStep2();
                }
              }}
              placeholder="Adressen til boligen din"
              autoComplete="off"
              enterKeyHint="go"
              className="flex-1 min-w-0 h-12 px-3 bg-transparent outline-none text-[15px] placeholder:text-[#737373]"
            />
            <button
              type="button"
              onClick={tryGoStep2}
              className="group hidden sm:inline-flex shrink-0 h-[44px] items-center gap-1.5 rounded-xl bg-[#0a0a0a] text-white hover:bg-black px-6 text-[13px] font-semibold transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:scale-[0.97]"
            >
              {cfg.cta || 'Start gratis vurdering'} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          {addrHint && <p className="text-[12px] text-amber-700 mt-1.5" data-testid="lp-address-hint">{addrHint}</p>}
          {ac.open && ac.suggestions.length > 0 && (
            <ul className="absolute z-30 mt-1.5 w-full rounded-xl border border-[#eee] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.10)] overflow-hidden">
              {ac.suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button" onClick={() => chooseSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-[#fafafa] transition-colors">
                    <span className="text-[#0a0a0a]">{s.text || s.label}</span>
                    {s.sub ? <span className="text-[#999]"> · {s.sub}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={tryGoStep2}
          className="group sm:hidden mt-3 w-full h-[52px] rounded-full bg-[#0a0a0a] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(31,31,31,0.35)] active:scale-[0.98] transition-transform"
        >
          {cfg.cta || 'Start gratis vurdering'} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="mt-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 text-[12px] text-[#999]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#18794E]" /> Uforpliktende</span>
            <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-[#18794E]" /> 0 kr oppstart</span>
          </div>
          <button type="button" onClick={skipAddress} className="text-[12.5px] text-[#888] underline underline-offset-2 hover:text-[#0a0a0a] transition-colors">
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
      className="relative rounded-2xl bg-white border border-[#eee] shadow-[0_12px_40px_rgba(0,0,0,0.07)] p-5 sm:p-6 space-y-3.5"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading font-bold text-[19px] text-[#0a0a0a] leading-tight">Nesten ferdig — hvor når vi deg?</p>
          <span className="shrink-0 text-[11px] font-semibold text-[#888]">Steg 2 av 2</span>
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-[#f0f0f0] overflow-hidden">
          <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-[#AE68E4] to-[#d298ff] transition-all" />
        </div>
      </div>

      {ac.query.trim() ? (
        <button type="button" onClick={() => setStep(1)}
          className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#f5f3f0] px-3.5 py-1.5 text-[13px] text-[#555] hover:bg-[#edeae6] transition-colors">
          <MapPin className="w-3.5 h-3.5 text-[#AE68E4] shrink-0" />
          <span className="truncate">{ac.query.trim()}</span>
          <span className="text-[#888] underline underline-offset-2 shrink-0">endre</span>
        </button>
      ) : (
        <button type="button" onClick={() => setStep(1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#888] hover:text-[#0a0a0a] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Legg til adresse (valgfritt)
        </button>
      )}

      <div>
        <input ref={nameRef} value={form.name} onChange={set('name')} placeholder="Navn" autoComplete="name" enterKeyHint="next"
          className={`${inputBase} ${fieldErr.name ? inputErr : inputOk}`} />
        {fieldErr.name ? <p className="text-[12.5px] text-rose-500 mt-1.5 ml-1">{fieldErr.name}</p> : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="Telefon" autoComplete="tel" enterKeyHint="next"
            className={`${inputBase} ${fieldErr.phone ? inputErr : inputOk}`} />
          {fieldErr.phone ? <p className="text-[12.5px] text-rose-500 mt-1.5 ml-1">{fieldErr.phone}</p> : null}
        </div>
        <div>
          <input value={form.email} onChange={set('email')} type="email" inputMode="email" placeholder="E-post" autoComplete="email" enterKeyHint="done"
            className={`${inputBase} ${fieldErr.email ? inputErr : inputOk}`} />
          {fieldErr.email ? <p className="text-[12.5px] text-rose-500 mt-1.5 ml-1">{fieldErr.email}</p> : null}
        </div>
      </div>
      {err ? <p className="text-[13px] text-rose-500">{err}</p> : null}
      <button type="submit" disabled={status === 'sending'}
        className="group w-full h-[52px] rounded-full bg-[#0a0a0a] text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] active:scale-[0.98] disabled:opacity-60">
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Få gratis vurdering <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
      </button>
      <div className="flex items-center justify-center gap-4 text-[12px] text-[#999] pt-0.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#18794E]" /> Vi deler aldri opplysningene dine</span>
        <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#18794E]" /> Svar umiddelbart</span>
      </div>
    </form>
  );
}
