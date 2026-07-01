'use client';

// Google Ads-kampanjeside for leietakere — samme konverteringsmønster som
// utleiersidene: 2-stegs skjema over folden, tillitsrad, sticky CTA, exit-intent.

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, ArrowRight, ArrowLeft, Check, Loader2, Phone, ShieldCheck,
  Clock, Star, Home, KeyRound, Search, BadgeCheck, FileSignature, CalendarCheck, Lock, Sparkles,
} from 'lucide-react';
import { site, neighborhoods } from '@/lib/site';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { Reveal, InitialsAvatar, AvatarStack, StickyMobileCta, ExitIntent } from '@/components/lp/lp-shared';

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

  /* ------------------------------ Ferdig-state ------------------------------ */
  if (status === 'done') {
    const firstName = form.name.trim().split(/\s+/)[0];
    return (
      <div className="rounded-[24px] border border-success/25 bg-success-bg px-6 py-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white border border-success/30">
            <Check className="h-5 w-5 text-success" />
          </span>
          <p className="font-heading font-bold text-[20px] text-ink leading-tight">Takk{firstName ? `, ${firstName}` : ''}! Du er på lista.</p>
        </div>
        <ol className="mt-5 space-y-3">
          {[
            `Vi matcher ønskene dine${form.area.trim() ? ` (${form.area.trim()})` : ''} mot boligene våre`,
            'Du får varsel så snart noe relevant blir ledig — ofte før offentlig annonsering',
            'Visning, kontrakt og signering skjer digitalt med BankID',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-[14.5px] text-ink-soft">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-success/25 text-success text-[12px] font-bold">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <a href={`tel:${site.phoneHref}`} className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-ink hover:text-lavender transition-colors">
          <Phone className="w-4 h-4" /> Spørsmål? Ring {site.phone}
        </a>
      </div>
    );
  }

  const selectCls = 'w-full h-12 px-3 rounded-[14px] border border-hairline bg-canvas outline-none focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] text-[15px] text-ink appearance-none cursor-pointer transition-all';

  /* -------------------------------- Steg 1 -------------------------------- */
  if (step === 1) {
    return (
      <div onFocus={handleStart}
        className="relative rounded-[24px] bg-surface/95 backdrop-blur-sm shadow-[0_40px_100px_-50px_rgba(10,10,10,0.5),0_2px_12px_rgba(10,10,10,0.05)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading font-bold text-[19px] text-ink leading-tight">Bli varslet om nye boliger</p>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-[11px] font-semibold px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Gratis
          </span>
        </div>
        <p className="text-[13.5px] text-quiet mt-1">Ofte før boligene annonseres offentlig — det tar under ett minutt.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center rounded-[14px] border border-hairline bg-canvas pl-3.5 focus-within:border-[#c9b8e4] focus-within:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] transition-all">
            <MapPin className="h-4 w-4 text-taupe shrink-0" />
            <select value={form.area} onChange={set('area')} className="flex-1 h-12 px-2.5 bg-transparent outline-none text-[15px] text-ink appearance-none cursor-pointer">
              <option value="">Ønsket område</option>
              {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center rounded-[14px] border border-hairline bg-canvas pl-3.5 focus-within:border-[#c9b8e4] focus-within:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] transition-all">
            <CalendarCheck className="h-4 w-4 text-taupe shrink-0" />
            <select value={form.move_in} onChange={set('move_in')} className="flex-1 h-12 px-2.5 bg-transparent outline-none text-[15px] text-ink appearance-none cursor-pointer">
              <option value="">Når vil du flytte?</option>
              {MOVE_IN.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <button type="button" onClick={goStep2}
          className="group mt-3.5 w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_14px_30px_-12px_rgba(10,10,10,0.5)] hover:-translate-y-0.5 transition-all">
          Varsle meg om boliger <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="mt-3.5 flex items-center justify-center gap-4 text-[12px] text-taupe flex-wrap">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Ingen budrunder</span>
          <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-success" /> Kvalitetssikret</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-success" /> 100 % gratis</span>
        </div>
      </div>
    );
  }

  /* -------------------------------- Steg 2 -------------------------------- */
  return (
    <form onSubmit={submit} onFocus={handleStart}
      className="relative rounded-[24px] bg-surface/95 backdrop-blur-sm shadow-[0_40px_100px_-50px_rgba(10,10,10,0.5),0_2px_12px_rgba(10,10,10,0.05)] p-5 sm:p-6 space-y-3.5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading font-bold text-[19px] text-ink leading-tight">Nesten ferdig — hvor når vi deg?</p>
          <span className="shrink-0 text-[11px] font-semibold text-quiet">Steg 2 av 2</span>
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-fill overflow-hidden">
          <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-lavender to-lavender-soft transition-all" />
        </div>
      </div>

      <button type="button" onClick={() => setStep(1)}
        className="inline-flex max-w-full items-center gap-2 rounded-full bg-fill px-3.5 py-1.5 text-[13px] text-ink-soft hover:bg-hairline transition-colors">
        <MapPin className="w-3.5 h-3.5 text-lavender shrink-0" />
        <span className="truncate">{form.area || 'Hele Bergen'}{form.move_in ? ` · ${form.move_in}` : ''}</span>
        <span className="text-quiet underline underline-offset-2 shrink-0">endre</span>
      </button>

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
      <select value={form.budget} onChange={set('budget')} className={selectCls}>
        <option value="">Månedsbudsjett (valgfritt)</option>
        {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      {err ? <p className="text-[13px] text-rose-500">{err}</p> : null}
      <button type="submit" disabled={status === 'sending'}
        className="group w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 transition-all hover:shadow-[0_18px_40px_-14px_rgba(10,10,10,0.6)] hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0">
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Varsle meg om boliger <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
      </button>
      <div className="flex items-center justify-center gap-4 text-[12px] text-taupe pt-0.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-success" /> Vi deler aldri opplysningene dine</span>
        <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-success" /> Helt gratis</span>
      </div>
    </form>
  );
}

/* ------------------------------ hovedside ------------------------------ */
export default function CampaignLandingTenant() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

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

  const bullets = [
    'Møblert og innflyttingsklart',
    'Ingen budrunder — vi matcher deg direkte',
    'Digital kontrakt med BankID',
  ];

  const steps = [
    { n: '01', icon: Search, t: 'Fortell oss hva du leter etter', d: 'Område, budsjett og innflytting. Det tar under ett minutt — og det er helt gratis.' },
    { n: '02', icon: BadgeCheck, t: 'Vi matcher deg med riktige boliger', d: 'Du får beskjed så snart en bolig som passer dine ønsker blir ledig i Bergen — ofte før den annonseres.' },
    { n: '03', icon: KeyRound, t: 'Signér digitalt og flytt inn', d: 'Trygg kontrakt med BankID, klar overtakelse og support hele veien.' },
  ];

  const benefits = [
    { icon: BadgeCheck, t: 'Trygt og kvalitetssikret', b: 'Alle boliger og kontrakter er kvalitetssikret. Du vet alltid hvem du leier av — ingen overraskelser.' },
    { icon: FileSignature, t: 'Alt digitalt', b: 'Visning, kontrakt og signering med BankID samlet i appen. Enkelt, raskt og papirløst.' },
    { icon: Clock, t: 'Rask respons', b: 'Et lokalt team i Bergen følger deg opp — og er tilgjengelig når du trenger hjelp, hele døgnet.' },
  ];

  const testimonials = [
    { quote: 'Jeg slapp hele budrunde-stresset. DigiHome fant en leilighet på Møhlenpris som passet perfekt, og alt gikk digitalt.', name: 'Sofie R.', area: 'Møhlenpris' },
    { quote: 'Fikk varsel om en bolig i Sandviken samme uke jeg registrerte meg. Signerte med BankID og flyttet inn uten styr.', name: 'Henrik B.', area: 'Sandviken' },
    { quote: 'Endelig en seriøs utleier som faktisk svarer. Trygt, ryddig og raskt fra start til nøkler i hånda.', name: 'Amalie T.', area: 'Sentrum' },
  ];

  const faq = [
    { q: 'Hva skjer etter at jeg har registrert meg?', a: 'Vi matcher ønskene dine mot boligene våre, og varsler deg så snart noe relevant blir ledig — ofte før boligen annonseres offentlig. Deretter avtaler vi visning digitalt.' },
    { q: 'Hva koster det å registrere seg?', a: 'Ingenting. Det er helt gratis og uforpliktende å bli varslet om ledige boliger som matcher ønskene dine.' },
    { q: 'Hvor finner jeg boligene?', a: 'Vi forvalter kvalitetssikrede utleieboliger i hele Bergen — inkludert Nordnes, Sandviken, Møhlenpris, Sentrum, Åsane, Fana og Laksevåg.' },
    { q: 'Må jeg delta i budrunder?', a: 'Nei. Vi matcher deg direkte med boliger som passer, så du slipper budrunder og kø. Du får beskjed når noe relevant blir ledig.' },
    { q: 'Hvordan signerer jeg kontrakt?', a: 'Alt skjer digitalt. Du signerer leiekontrakten trygt med BankID, og får full oversikt over leieforholdet i appen.' },
    { q: 'Hvor raskt kan jeg flytte inn?', a: 'Det varierer med tilbudet, men mange finner bolig i løpet av få uker. Jo mer fleksibel du er på område og innflytting, desto raskere går det.' },
  ];

  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col antialiased selection:bg-lavender/20">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-canvas/85 backdrop-blur-md border-b border-hairline/70' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-6 w-auto" width={130} height={24} />
          <div className="flex items-center gap-3">
            <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[14px] font-medium text-ink hover:text-lavender transition-colors">
              <Phone className="w-4 h-4" /> <span className="hidden sm:inline">{site.phone}</span>
            </a>
            <button onClick={scrollToForm} className="hidden sm:inline-flex h-9 items-center rounded-full bg-ink text-canvas px-4 text-[13px] font-semibold hover:-translate-y-0.5 transition-transform">
              Finn bolig
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-48 -right-32 h-[560px] w-[560px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.30) 0%, rgba(207,151,252,0) 70%)' }} />
        <div aria-hidden className="pointer-events-none absolute top-32 -left-40 h-[420px] w-[420px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(155,91,214,0.12) 0%, rgba(155,91,214,0) 70%)' }} />

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-14 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-quiet">
                <span className="h-1.5 w-1.5 rounded-full bg-lavender" /> Leie bolig i Bergen
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="font-heading font-bold tracking-[-0.04em] leading-[1.02] text-[35px] sm:text-[52px] lg:text-[58px] mt-4 max-w-[16ch]">
                Finn ditt neste hjem i Bergen
              </h1>
            </Reveal>
            <Reveal delay={110}>
              <p className="text-quiet text-[16px] sm:text-[18px] mt-4 max-w-[52ch] leading-relaxed">
                Kvalitetssikrede utleieboliger — uten budrunder, kø og stress. Registrer ønskene dine, så varsler vi deg når den rette boligen blir ledig.
              </p>
            </Reveal>

            {/* Skjemaet først — over folden, også på mobil */}
            <Reveal delay={170}>
              <div id="lp-form" className="mt-6 scroll-mt-24">
                <TenantForm />
              </div>
            </Reveal>

            {/* Tillitsrad */}
            <Reveal delay={230}>
              <div className="mt-5 flex items-center justify-between gap-x-6 gap-y-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <AvatarStack size={30} names={['Sofie R.', 'Henrik B.', 'Amalie T.', 'Jonas F.']} />
                  <div>
                    <div className="flex items-center gap-0.5 text-lavender">
                      {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <p className="text-[12.5px] text-quiet mt-0.5"><b className="text-ink">4,9/5</b> fra leietakere i Bergen</p>
                  </div>
                </div>
                <img src="/bankid-logo.png" alt="BankID" style={{ height: 18 }} loading="lazy" className="w-auto object-contain opacity-50 grayscale" />
              </div>
            </Reveal>

            {/* Kompakte fordels-punkter */}
            <Reveal delay={280}>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-success-bg">
                      <Check className="h-2.5 w-2.5 text-success" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* høyre: lagdelt bilde-komposisjon */}
          <div className="relative hidden lg:block">
            <Reveal delay={120}>
              <div className="relative rounded-[28px] overflow-hidden aspect-[4/5] shadow-[0_50px_120px_-50px_rgba(10,10,10,0.55)]">
                <img src="/interior-living.webp" alt="Innflyttingsklar utleiebolig i Bergen" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" width={900} height={1125} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
              </div>
            </Reveal>
            <div className="absolute -bottom-6 -left-6 rounded-[20px] bg-surface/95 backdrop-blur border border-hairline shadow-[0_30px_70px_-35px_rgba(10,10,10,0.5)] px-6 py-4">
              <div className="flex items-center gap-2 text-taupe">
                <CalendarCheck className="w-4 h-4 text-lavender" />
                <p className="text-[11px] uppercase tracking-[0.12em]">Innflyttingsklar</p>
              </div>
              <p className="font-heading font-bold text-[24px] text-ink mt-0.5 leading-none">Møblert &amp; klar</p>
            </div>
            <div className="absolute top-5 -right-4 rounded-2xl bg-ink text-canvas shadow-[0_24px_50px_-24px_rgba(10,10,10,0.7)] px-4 py-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><ShieldCheck className="w-4 h-4" /></span>
              <div>
                <p className="text-[12px] font-semibold leading-tight">Trygg signering</p>
                <p className="text-[11px] text-canvas/60 leading-tight">med BankID</p>
              </div>
            </div>
            <div className="absolute -top-7 left-8 h-20 w-28 rounded-2xl overflow-hidden border-4 border-canvas shadow-[0_20px_40px_-20px_rgba(10,10,10,0.5)] rotate-[-4deg]">
              <img src="/bergen-rooftops.webp" alt="Bergen" className="h-full w-full object-cover" width={160} height={120} />
            </div>
          </div>
        </div>
      </section>

      {/* Trygghets-stripe */}
      <section className="border-y border-hairline/70 bg-canvas-alt">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-taupe">Trygg utleie, hele veien</p>
          <div className="flex items-center gap-7 sm:gap-10 text-[13px] text-ink-soft">
            <span className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-lavender" /> Kvalitetssikret</span>
            <span className="inline-flex items-center gap-2"><FileSignature className="w-4 h-4 text-lavender" /> Digital kontrakt</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-lavender" /> BankID</span>
          </div>
        </div>
      </section>

      {/* Slik fungerer det */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 sm:py-24 w-full">
        <Reveal className="text-center max-w-[640px] mx-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lavender">Slik fungerer det</p>
          <h2 className="font-heading font-bold text-[28px] sm:text-[38px] tracking-[-0.03em] mt-3">Fra ønske til nøkler — i tre steg</h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5 relative">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 110}>
              <div className="relative h-full rounded-[22px] bg-surface p-7 shadow-[0_2px_18px_rgba(10,10,10,0.045)] hover:shadow-[0_34px_70px_-42px_rgba(10,10,10,0.42)] hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-ink text-canvas"><s.icon className="w-5 h-5" /></div>
                <h3 className="font-heading font-bold text-[19px] mt-5">{s.t}</h3>
                <p className="text-quiet text-[14.5px] mt-2 leading-relaxed">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Fordeler */}
      <section className="bg-canvas-alt border-y border-hairline/70">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 sm:py-20 grid sm:grid-cols-3 gap-5">
          {benefits.map((c, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="h-full rounded-[22px] bg-surface p-7 shadow-[0_2px_18px_rgba(10,10,10,0.045)] hover:shadow-[0_28px_60px_-42px_rgba(10,10,10,0.4)] transition-shadow duration-300">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender/10"><c.icon className="w-5 h-5 text-lavender" /></span>
                <h3 className="font-heading font-bold text-[18px] mt-5">{c.t}</h3>
                <p className="text-quiet text-[14.5px] mt-2 leading-relaxed">{c.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Kundehistorier */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 sm:py-24 w-full">
        <Reveal className="text-center max-w-[640px] mx-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lavender">Leietakere i Bergen</p>
          <h2 className="font-heading font-bold text-[28px] sm:text-[38px] tracking-[-0.03em] mt-3">De fant hjem uten stress</h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 110}>
              <figure className="h-full rounded-[22px] bg-surface p-7 shadow-[0_2px_18px_rgba(10,10,10,0.045)] flex flex-col">
                <div className="flex items-center gap-0.5 text-lavender mb-4">
                  {[0, 1, 2, 3, 4].map((j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                </div>
                <blockquote className="text-ink-soft text-[15.5px] leading-relaxed flex-1">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <InitialsAvatar name={t.name} index={i} size={40} />
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{t.name}</p>
                    <p className="text-[12.5px] text-taupe">{t.area}, Bergen</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Avsluttende CTA */}
      <section className="px-5 sm:px-8 pb-16 sm:pb-24">
        <Reveal className="max-w-[1100px] mx-auto">
          <div className="relative overflow-hidden rounded-[32px] bg-ink text-canvas px-7 sm:px-14 py-14 sm:py-20 text-center">
            <div aria-hidden className="pointer-events-none absolute -top-24 right-0 h-[360px] w-[360px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.4) 0%, rgba(207,151,252,0) 70%)' }} />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-[320px] w-[320px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(155,91,214,0.3) 0%, rgba(155,91,214,0) 70%)' }} />
            <div className="relative">
              <h2 className="font-heading font-bold text-[30px] sm:text-[44px] tracking-[-0.03em] leading-[1.06] max-w-[20ch] mx-auto">
                Klar for et nytt hjem i Bergen?
              </h2>
              <p className="text-canvas/70 text-[16px] sm:text-[18px] mt-4 max-w-[48ch] mx-auto leading-relaxed">
                Registrer ønskene dine gratis, så tar vi kontakt så snart vi har en bolig som passer. Ingen budrunder, ingen forpliktelser.
              </p>
              <button onClick={scrollToForm} className="group mt-8 inline-flex items-center gap-2 h-14 rounded-full bg-canvas text-ink px-8 font-semibold text-[16px] hover:-translate-y-0.5 transition-transform shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)]">
                Varsle meg om boliger <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              <div className="mt-7 flex items-center justify-center gap-5 text-[12.5px] text-canvas/55 flex-wrap">
                <span className="inline-flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Boliger i hele Bergen</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Trygt og kvalitetssikret</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Rask oppfølging</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="max-w-[760px] mx-auto px-5 sm:px-8 pb-16 sm:pb-24 w-full">
        <Reveal>
          <h2 className="font-heading font-bold text-[26px] sm:text-[34px] tracking-[-0.03em] text-center mb-9">Ofte stilte spørsmål</h2>
        </Reveal>
        <div className="space-y-3">
          {faq.map((f, i) => {
            const open = openFaq === i;
            return (
              <Reveal key={i} delay={i * 60}>
                <div className={`rounded-[18px] bg-surface transition-shadow duration-300 ${open ? 'shadow-[0_14px_44px_-18px_rgba(10,10,10,0.24)]' : 'shadow-[0_2px_12px_rgba(10,10,10,0.035)]'}`}>
                  <button onClick={() => setOpenFaq(open ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4">
                    <span className="font-semibold text-[15.5px] text-ink py-0.5">{f.q}</span>
                    <span className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-fill text-ink text-[18px] leading-none transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <p className="px-5 sm:px-6 pb-5 text-quiet text-[14.5px] leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-hairline/70">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-taupe">
          <span>© {new Date().getFullYear()} {site.legalName} · Org.nr {site.orgNr}</span>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Identitet sikret med BankID</span>
            <a href={`tel:${site.phoneHref}`} className="text-ink hover:text-lavender transition-colors">{site.phone}</a>
          </div>
        </div>
      </footer>

      {/* Sticky mobil-CTA + exit-intent */}
      <StickyMobileCta label="Varsle meg om boliger" onClick={scrollToForm} />
      <ExitIntent
        headline="Vent — vil du få varsel når drømmeboligen blir ledig?"
        body="Det er gratis og tar under ett minutt. Vi varsler deg ofte før boligene annonseres offentlig."
        cta="Bli varslet gratis"
        onCta={scrollToForm}
      />
    </div>
  );
}
