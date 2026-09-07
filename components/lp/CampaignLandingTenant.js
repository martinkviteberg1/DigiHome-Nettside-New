'use client';

// Google Ads-kampanjeside for leietakere — samme konverteringsmønster som
// utleiersidene: 2-stegs skjema over folden, tillit, sticky CTA, exit-intent.
// UI i V4-drakt; skjema-logikk og sporing (/api/tenants, trackLead) er uendret.

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowRight, Check, Loader2, Phone, ShieldCheck, CalendarCheck, Lock } from 'lucide-react';
import { site, neighborhoods } from '@/lib/site';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { StickyMobileCta, ExitIntent } from '@/components/lp/lp-shared';
import { T, display } from '@/components/forside/v4/motion';
import StegSeksjon from '@/components/forside/v4/StegSeksjon';
import FaqSeksjon from '@/components/forside/v4/FaqSeksjon';
import { Avsloring, DIM, HAIR, Punkt, SVAK } from '@/components/forside/v4/sider/deler';

const FLATE = '#EDEAE3';
const feltCls = 'w-full h-14 px-5 rounded-[14px] border-0 bg-[#FBFAF8] outline-none text-[16px] text-[#15130F] placeholder:text-[#15130F]/40 transition-[box-shadow] duration-200 focus:outline-none focus:ring-0';
const feltOk = 'shadow-[0_0_0_1px_rgba(21,19,15,0.14)] focus:shadow-[0_0_0_2px_#15130F]';
const feltFeil = 'shadow-[0_0_0_2px_#B42318]';
const velgWrap = 'flex items-center rounded-[14px] bg-[#FBFAF8] pl-4 shadow-[0_0_0_1px_rgba(21,19,15,0.14)] transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_2px_#15130F]';
const velgCls = 'h-14 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent px-3 text-[16px] text-[#15130F] outline-none focus:outline-none focus:ring-0';
const knappCls = 'group flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#15130F] text-[15px] font-medium text-[#F4F1EA] transition-transform active:scale-[0.98] disabled:opacity-60';

const SOURCE = 'lp-leietaker';
const PHONE_RE = /^(?:\+47)?\s?(?:\d\s?){8}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const MOVE_IN = ['Så snart som mulig', 'Innen 1 måned', 'Innen 3 måneder', 'Fleksibel'];
const BUDGETS = ['Under 12 000 kr', '12–16 000 kr', '16–20 000 kr', 'Over 20 000 kr'];

/* -------------------------------- skjema -------------------------------- */
function TenantForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '', area: '', move_in: '', budget: '' });
  const [status, setStatus] = useState('idle');
  const [fieldErr, setFieldErr] = useState({});
  const [err, setErr] = useState('');
  const startedRef = useRef(false);
  const nameRef = useRef(null);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setFieldErr((fe) => ({ ...fe, [k]: '' })); };

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { trackLeadStart(SOURCE); } catch (e) {}
    try { track('lead_step', { step: 'start', form: SOURCE }); } catch (e) {}
  };

  const goStep2 = () => {
    handleStart();
    setStep(2);
    setErr('');
    try { track('lead_step', { step: 'step2', form: SOURCE }); } catch (e) {}
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
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
          preferred_area: form.area.trim(), move_in_date: form.move_in.trim(),
          ...(form.budget ? { budget: form.budget } : {}),
          source: SOURCE,
          notes: 'Kampanjeside: Finn ditt neste hjem i Bergen' + (form.budget ? ` | Budsjett: ${form.budget}` : ''),
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      if (!res.ok) throw new Error('api');
      let data = {};
      try { data = await res.json(); } catch (e2) {}
      try { trackLead({ formId: SOURCE, source: SOURCE, leadId: data?.data?.id, email: form.email, phone: form.phone }); } catch (e2) {}
      try { track('lead_step', { step: 'submit', form: SOURCE }); } catch (e2) {}
      try { window.dispatchEvent(new CustomEvent('lp:done')); } catch (e2) {}
      setStatus('done');
    } catch (e2) {
      setErr('Noe gikk galt. Prøv igjen — eller ring oss på ' + site.phone + '.');
      setStatus('error');
    }
  };

  /* -------------------------------- Ferdig-state -------------------------------- */
  if (status === 'done') {
    const firstName = form.name.trim().split(/\s+/)[0];
    return (
      <div className="rounded-[20px] p-6 sm:p-8" style={{ background: FLATE }} data-testid="lt-form-done">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)', color: T.gronn }}><Check className="h-5 w-5" strokeWidth={2.2} /></span>
          <p className="text-[26px] sm:text-[30px]" style={{ ...display, color: T.ink }}>Takk{firstName ? `, ${firstName}` : ''}<Punkt /></p>
        </div>
        <p className="mt-3 text-[15.5px] leading-[1.5]" style={{ color: DIM }}>Du er på lista. Slik går det videre:</p>
        <ol className="mt-5 border-t" style={{ borderColor: HAIR }}>
          {[
            `Vi matcher ønskene dine${form.area.trim() ? ` (${form.area.trim()})` : ''} mot boligene våre`,
            'Du får varsel så snart noe relevant blir ledig — ofte før offentlig annonsering',
            'Visning, kontrakt og signering skjer digitalt med BankID',
          ].map((t, i) => (
            <li key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 border-b py-3 text-[15px]" style={{ borderColor: HAIR, color: 'rgba(21,19,15,0.8)' }}>
              <span className="pt-[3px] text-[12.5px] tabular-nums" style={{ color: SVAK }}>0{i + 1}</span>{t}
            </li>
          ))}
        </ol>
        <a href={`tel:${site.phoneHref}`} className="mt-5 inline-flex items-center gap-2 text-[14.5px] font-medium transition-colors hover:text-[#15130F]/70" style={{ color: T.ink }}>
          <Phone className="h-4 w-4" strokeWidth={1.8} /> Spørsmål? Ring {site.phone}
        </a>
      </div>
    );
  }

  /* -------------------------------- Steg 1 -------------------------------- */
  if (step === 1) {
    return (
      <div onFocus={handleStart} className="relative rounded-[20px] p-5 sm:p-7" style={{ background: FLATE }} data-testid="lt-form-step1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <p className="text-[24px] sm:text-[28px]" style={{ ...display, color: T.ink }}>Bli varslet om nye boliger</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium" style={{ color: T.gronn }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} /> Gratis</span>
        </div>
        <p className="mt-1.5 text-[14px]" style={{ color: DIM }}>Ofte før boligene annonseres offentlig — det tar under ett minutt.</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={velgWrap}>
            <MapPin className="h-[18px] w-[18px] shrink-0" style={{ color: SVAK }} strokeWidth={1.8} />
            <select value={form.area} onChange={set('area')} aria-label="Ønsket område" className={velgCls} data-testid="lt-area">
              <option value="">Ønsket område</option>
              {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className={velgWrap}>
            <CalendarCheck className="h-[18px] w-[18px] shrink-0" style={{ color: SVAK }} strokeWidth={1.8} />
            <select value={form.move_in} onChange={set('move_in')} aria-label="Når vil du flytte" className={velgCls} data-testid="lt-movein">
              <option value="">Når vil du flytte?</option>
              {MOVE_IN.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <button type="button" onClick={goStep2} className={`${knappCls} mt-3`} data-testid="lt-step1-next">
          Varsle meg om boliger <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
        </button>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]" style={{ color: SVAK }}>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" style={{ color: T.gronn }} strokeWidth={1.8} /> Ingen budrunder</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" style={{ color: T.gronn }} strokeWidth={1.8} /> 100 % gratis</span>
        </div>
      </div>
    );
  }

  /* -------------------------------- Steg 2 -------------------------------- */
  return (
    <form onSubmit={submit} onFocus={handleStart} className="relative space-y-4 rounded-[20px] p-5 sm:p-7" style={{ background: FLATE }} data-testid="lt-form-step2">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[24px] sm:text-[28px]" style={{ ...display, color: T.ink }}>Nesten ferdig — hvor når vi deg<span style={{ color: T.lilla }}>?</span></p>
          <span className="shrink-0 text-[12px] tabular-nums" style={{ color: SVAK }}>Steg 2 av 2</span>
        </div>
        <div className="mt-3 h-px w-full overflow-hidden" style={{ background: 'rgba(21,19,15,0.12)' }}><div className="h-full w-[85%]" style={{ background: T.lilla }} /></div>
      </div>
      <button type="button" onClick={() => setStep(1)} className="inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] transition-colors hover:bg-[#15130F]/[0.08]" style={{ background: 'rgba(21,19,15,0.05)', color: 'rgba(21,19,15,0.75)' }}>
        <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: T.ink }} strokeWidth={1.8} />
        <span className="truncate">{form.area || 'Hele Bergen'}{form.move_in ? ` · ${form.move_in}` : ''}</span>
        <span className="shrink-0 underline underline-offset-2" style={{ color: SVAK }}>endre</span>
      </button>
      <div>
        <label htmlFor="lt-name" className="mb-2 block text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}>Navn</label>
        <input id="lt-name" ref={nameRef} value={form.name} onChange={set('name')} placeholder="Ola Nordmann" autoComplete="name" enterKeyHint="next" className={`${feltCls} ${fieldErr.name ? feltFeil : feltOk}`} data-testid="lt-name" />
        {fieldErr.name ? <p className="mt-1.5 text-[12.5px]" style={{ color: '#B42318' }}>{fieldErr.name}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lt-phone" className="mb-2 block text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}>Telefon</label>
          <input id="lt-phone" value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="8 siffer" autoComplete="tel" enterKeyHint="next" className={`${feltCls} ${fieldErr.phone ? feltFeil : feltOk}`} data-testid="lt-phone" />
          {fieldErr.phone ? <p className="mt-1.5 text-[12.5px]" style={{ color: '#B42318' }}>{fieldErr.phone}</p> : null}
        </div>
        <div>
          <label htmlFor="lt-email" className="mb-2 block text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}>E-post</label>
          <input id="lt-email" value={form.email} onChange={set('email')} type="email" inputMode="email" placeholder="ola@epost.no" autoComplete="email" enterKeyHint="done" className={`${feltCls} ${fieldErr.email ? feltFeil : feltOk}`} data-testid="lt-email" />
          {fieldErr.email ? <p className="mt-1.5 text-[12.5px]" style={{ color: '#B42318' }}>{fieldErr.email}</p> : null}
        </div>
      </div>
      <div>
        <label htmlFor="lt-budget" className="mb-2 block text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}>Månedsbudsjett (valgfritt)</label>
        <div className={velgWrap} style={{ paddingLeft: 8 }}>
          <select id="lt-budget" value={form.budget} onChange={set('budget')} className={velgCls}>
            <option value="">Velg</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      {err ? <p className="text-[13px]" style={{ color: '#B42318' }}>{err}</p> : null}
      <button type="submit" disabled={status === 'sending'} className={knappCls} data-testid="lt-submit">
        {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Varsle meg om boliger <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} /></>}
      </button>
      <p className="text-center text-[12.5px]" style={{ color: SVAK }}>Vi deler aldri opplysningene dine. Helt gratis.</p>
    </form>
  );
}

/* ------------------------------ hovedside ------------------------------ */
const STEG = [
  { nr: '01', t: 'Fortell oss hva du leter etter', d: 'Område, budsjett og innflytting. Det tar under ett minutt — og det er helt gratis.' },
  { nr: '02', t: 'Vi matcher deg med riktige boliger', d: 'Du får beskjed så snart en bolig som passer blir ledig i Bergen — ofte før den annonseres.' },
  { nr: '03', t: 'Signér digitalt og flytt inn', d: 'Trygg kontrakt med BankID, klar overtakelse og support hele veien.' },
];

const FORDELER = [
  ['01', 'Trygt og kvalitetssikret', 'Alle boliger og kontrakter er kvalitetssikret. Du vet alltid hvem du leier av — ingen overraskelser.'],
  ['02', 'Alt digitalt', 'Visning, kontrakt og signering med BankID samlet i appen. Enkelt, raskt og papirløst.'],
  ['03', 'Et team som svarer', 'Et lokalt team i Bergen følger deg opp — og er tilgjengelig når du trenger hjelp.'],
];

const FAQ = [
  { q: 'Hva skjer etter at jeg har registrert meg?', a: 'Vi matcher ønskene dine mot boligene våre, og varsler deg så snart noe relevant blir ledig — ofte før boligen annonseres offentlig. Deretter avtaler vi visning digitalt.' },
  { q: 'Hva koster det å registrere seg?', a: 'Ingenting. Det er helt gratis og uforpliktende å bli varslet om ledige boliger som matcher ønskene dine.' },
  { q: 'Hvor finner jeg boligene?', a: 'Vi forvalter kvalitetssikrede utleieboliger i hele Bergen — inkludert Nordnes, Sandviken, Møhlenpris, Sentrum, Åsane, Fana og Laksevåg.' },
  { q: 'Må jeg delta i budrunder?', a: 'Nei. Vi matcher deg direkte med boliger som passer, så du slipper budrunder og kø. Du får beskjed når noe relevant blir ledig.' },
  { q: 'Hvordan signerer jeg kontrakt?', a: 'Alt skjer digitalt. Du signerer leiekontrakten trygt med BankID, og får full oversikt over leieforholdet i appen.' },
  { q: 'Hvor raskt kan jeg flytte inn?', a: 'Det varierer med tilbudet, men mange finner bolig i løpet av få uker. Jo mer fleksibel du er på område og innflytting, desto raskere går det.' },
];

export default function CampaignLandingTenant() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToForm = () => {
    const el = document.getElementById('lp-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="lt-v4">
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled ? 'border-[#15130F]/[0.08]' : 'border-transparent'}`} style={{ background: 'rgba(243,241,236,0.9)', backdropFilter: 'saturate(1.2) blur(8px)' }}>
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[18px] w-auto" />
          <div className="flex items-center gap-5">
            <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[13.5px] transition-colors hover:text-[#15130F]" style={{ color: 'rgba(21,19,15,0.65)' }}>
              <Phone className="h-4 w-4" strokeWidth={1.8} /> <span className="hidden sm:inline">{site.phone}</span>
            </a>
            <button type="button" onClick={scrollToForm} className="hidden h-10 items-center gap-1.5 rounded-[10px] px-4 text-[13.5px] font-medium transition-transform active:scale-[0.97] sm:inline-flex" style={{ background: T.ink, color: T.offwhite }}>Finn bolig <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: budskap + skjema over folden */}
        <section className="mx-auto w-full max-w-[1400px] px-5 pb-14 pt-8 sm:px-8 sm:pt-12 lg:w-[calc(100%-64px)] lg:px-0 lg:pb-20 lg:pt-14" data-testid="lt-hero">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="lg:col-span-6 lg:row-start-1">
              <p className="dh-cover-inn text-[14px] font-medium" style={{ color: SVAK }}>Leie bolig i Bergen</p>
              <h1 className="dh-cover-inn mt-4 max-w-[15ch] text-[42px] sm:text-[58px] lg:text-[clamp(52px,4.6vw,76px)]" style={{ ...display, color: T.ink, animationDelay: '.04s' }} data-testid="lt-h1">Finn et hjem uten budrunder<Punkt /></h1>
              <p className="dh-cover-inn mt-5 max-w-[46ch] text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: 'rgba(21,19,15,0.72)', animationDelay: '.08s' }}>Kvalitetssikrede utleieboliger i Bergen — møblerte og innflyttingsklare. Registrer ønskene dine, så varsler vi deg før boligene annonseres.</p>
            </div>
            <div id="lp-form" className="dh-cover-inn scroll-mt-24 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1" style={{ animationDelay: '.12s' }}>
              <TenantForm />
            </div>
            <div className="dh-cover-inn lg:col-span-6 lg:row-start-2" style={{ animationDelay: '.18s' }}>
              <ul className="border-t" style={{ borderColor: HAIR }}>
                {['Møblert og innflyttingsklart', 'Ingen budrunder — vi matcher deg direkte', 'Digital kontrakt med BankID'].map((b) => (
                  <li key={b} className="flex items-start gap-3 border-b py-3 text-[15px] leading-[1.45]" style={{ borderColor: HAIR, color: 'rgba(21,19,15,0.8)' }}>
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />{b}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-4 text-[13px]" style={{ color: SVAK }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bankid-logo.png" alt="BankID" style={{ height: 16 }} loading="lazy" className="w-auto object-contain opacity-70 grayscale" />
                <span>Signering med BankID · Lokalt team i Bergen</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bildet */}
        <section className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] sm:aspect-[16/7] lg:aspect-[21/8]" style={{ background: T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/interior-living.webp" alt="Innflyttingsklar utleiebolig i Bergen" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full select-none object-cover" draggable={false} />
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[60%]" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.6) 100%)' }} />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
              <div>
                <p className="text-[28px] sm:text-[36px]" style={{ ...display, color: T.offwhite }}>Innflyttingsklart</p>
                <p className="mt-1 text-[13.5px]" style={{ color: 'rgba(244,241,234,0.75)' }}>Møblert · rent · nøkler klare</p>
              </div>
              <p className="hidden text-[13.5px] sm:block" style={{ color: 'rgba(244,241,234,0.75)' }}>Bergen</p>
            </div>
          </div>
        </section>

        {/* Fordeler */}
        <Avsloring testid="lt-fordeler">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:py-28">
              <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Derfor DigiHome</p>
              <h2 className="mt-4 max-w-[16ch] text-[clamp(36px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }}>Trygt, digitalt — og noen som svarer<Punkt /></h2>
              <ol className="mt-12 grid gap-10 border-t pt-10 md:grid-cols-3 md:gap-8" style={{ borderColor: HAIR }}>
                {FORDELER.map(([nr, t, d], i) => (
                  <li key={nr} style={inn(2 + i, 16)}>
                    <span className="text-[13px] tabular-nums" style={{ color: i === 0 ? T.lilla : SVAK }}>{nr}</span>
                    <p className="mt-3 text-[24px] sm:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>{t}</p>
                    <p className="mt-3 max-w-[36ch] text-[15.5px] leading-[1.55]" style={{ color: DIM }}>{d}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Avsloring>

        <StegSeksjon tittel={['Fra ønske', 'til nøkler.']} under="Tre steg — det første tar under ett minutt." steg={STEG} person={null} testid="lt" />
        <FaqSeksjon sporsmal={FAQ} />

        <section className="relative" style={{ background: T.charcoal, color: T.offwhite }}>
          <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p className="text-[14px] font-medium" style={{ color: 'rgba(244,241,234,0.55)' }}>Gratis · ingen budrunder · BankID</p>
                <h2 className="mt-4 max-w-[14ch] text-[clamp(40px,5vw,84px)]" style={{ ...display, color: T.offwhite }}>Bli varslet før boligen annonseres<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span></h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4 lg:col-span-4 lg:justify-end">
                <button type="button" onClick={scrollToForm} className="group inline-flex h-12 items-center gap-2 rounded-[12px] px-6 text-[15px] font-medium transition-transform active:scale-[0.97]" style={{ background: T.lilla, color: T.ink }}>Varsle meg om boliger <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} /></button>
                <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[15px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(244,241,234,0.85)' }}><Phone className="h-4 w-4" strokeWidth={1.8} /> {site.phone}</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ background: T.charcoal, borderColor: 'rgba(244,241,234,0.12)', color: 'rgba(244,241,234,0.5)' }}>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-5 py-6 text-[12.5px] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:w-[calc(100%-64px)] lg:px-0">
          <p>Digihome AS · Org.nr 835 595 242 · Bergen · <a href={`tel:${site.phoneHref}`} className="transition-colors hover:text-white">{site.phone}</a></p>
          <p className="flex gap-4"><a href="/personvern" className="transition-colors hover:text-white">Personvern</a><a href="/vilkar" className="transition-colors hover:text-white">Vilkår</a><a href="/ledige-boliger" className="transition-colors hover:text-white">Ledige boliger</a></p>
        </div>
      </footer>

      <StickyMobileCta label="Varsle meg om boliger" onClick={scrollToForm} />
      <ExitIntent headline="Vent — vil du bli varslet om nye boliger?" body="Det tar under ett minutt. Gratis — og du får beskjed før boligene annonseres." cta="Varsle meg om boliger" onCta={scrollToForm} />
    </div>
  );
}
