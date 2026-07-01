'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowRight, Check, Loader2, Phone, ShieldCheck, Sparkles, Clock, Star, TrendingUp, Wallet, Home } from 'lucide-react';
import { site, stats } from '@/lib/site';
import { getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { COMMON_STEPS, COMMON_TESTIMONIALS, COMMON_CHANNELS } from '@/lib/landing';

/* -------------------------- små hjelpe-komponenter -------------------------- */

// Avslører innhold med en myk fade-up når det kommer i viewport.
function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(22px)',
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

// Teller opp tallverdien når den vises (beholder suffiks som "kr", "%").
function CountUp({ value, className = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = String(value).match(/^[\d\s.,]+/);
    if (!m || typeof IntersectionObserver === 'undefined') { setDisplay(value); return; }
    const raw = m[0];
    const suffix = String(value).slice(raw.length);
    const clean = raw.replace(/\s/g, '').replace(',', '.');
    const target = parseFloat(clean);
    if (!isFinite(target)) { setDisplay(value); return; }
    const decimals = (clean.split('.')[1] || '').length;
    const fmt = (n) => n.toLocaleString('nb-NO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started) {
          started = true;
          const dur = 1400; const t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(fmt(target * eased) + suffix);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref} className={className}>{display}</span>;
}

/* ------------------------------ adresse-søk ------------------------------ */

function useAddressAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 6) : []);
        setOpen(true);
      } catch (e) { /* abort/feil = ignore */ }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);
  return { query, setQuery, suggestions, open, setOpen };
}

/* -------------------------------- skjema -------------------------------- */

function LeadForm({ cfg, compact = false }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState('idle');
  const [err, setErr] = useState('');
  const startedRef = useRef(false);
  const ac = useAddressAutocomplete();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { trackLeadStart(cfg.source); } catch (e) {}
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setErr('Fyll inn navn og enten telefon eller e-post.');
      setStatus('error');
      return;
    }
    setErr(''); setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
          address: ac.query.trim(), lead_type: 'huseier', source: cfg.source,
          notes: `Landingsside: ${cfg.h1}`,
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      if (!res.ok) throw new Error('api');
      let data = {};
      try { data = await res.json(); } catch (e) {}
      try { trackLead({ formId: cfg.source, source: cfg.source, leadId: data?.data?.id, email: form.email, phone: form.phone }); } catch (e) {}
      setStatus('done');
    } catch (e2) {
      setErr('Noe gikk galt. Prøv igjen — eller ring oss på ' + site.phone + '.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-[22px] border border-success/25 bg-success-bg px-6 py-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-success/30">
          <Check className="h-6 w-6 text-success" />
        </span>
        <p className="font-heading font-bold text-[21px] text-ink">Takk! Vurderingen er på vei.</p>
        <p className="text-quiet text-[15px] mt-2 leading-relaxed max-w-[42ch] mx-auto">
          Vi tar kontakt innen 24 timer med en gratis, uforpliktende vurdering{ac.query.trim() ? ` av ${ac.query.trim()}` : ''}.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      onFocus={handleStart}
      className="relative rounded-[24px] bg-surface/95 backdrop-blur-sm shadow-[0_40px_100px_-50px_rgba(10,10,10,0.5),0_2px_12px_rgba(10,10,10,0.05)] p-5 sm:p-7 space-y-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading font-bold text-[19px] text-ink leading-tight">Få en gratis verdivurdering</p>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-[11px] font-semibold px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Svar &lt; 24t
        </span>
      </div>
      <div className="relative">
        <div className="flex items-center rounded-[14px] border border-hairline bg-canvas px-3.5 focus-within:border-[#c9b8e4] focus-within:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] transition-all">
          <MapPin className="h-4 w-4 text-taupe shrink-0" />
          <input
            value={ac.query}
            onChange={(e) => ac.setQuery(e.target.value)}
            onFocus={() => { handleStart(); if (ac.suggestions.length) ac.setOpen(true); }}
            placeholder="Adressen til boligen din"
            autoComplete="off"
            className="flex-1 h-12 px-3 bg-transparent outline-none text-[15px] placeholder:text-taupe"
          />
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
      <input value={form.name} onChange={set('name')} placeholder="Navn" className="w-full h-12 px-4 rounded-[14px] border border-hairline bg-canvas outline-none focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] text-[15px] placeholder:text-taupe transition-all" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <input value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="Telefon" className="w-full h-12 px-4 rounded-[14px] border border-hairline bg-canvas outline-none focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] text-[15px] placeholder:text-taupe transition-all" />
        <input value={form.email} onChange={set('email')} type="email" inputMode="email" placeholder="E-post" className="w-full h-12 px-4 rounded-[14px] border border-hairline bg-canvas outline-none focus:border-[#c9b8e4] focus:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] text-[15px] placeholder:text-taupe transition-all" />
      </div>
      {err ? <p className="text-[13px] text-rose-500">{err}</p> : null}
      <button type="submit" disabled={status === 'sending'}
        className="group w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 transition-all hover:shadow-[0_18px_40px_-14px_rgba(10,10,10,0.6)] hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0">
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Få gratis vurdering <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
      </button>
      <div className="flex items-center justify-center gap-4 text-[12px] text-taupe pt-0.5">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Uforpliktende</span>
        <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-success" /> 0 kr oppstart</span>
      </div>
    </form>
  );
}

/* ------------------------------ hovedside ------------------------------ */

export default function CampaignLanding({ cfg }) {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const heroStat = cfg.heroStat || { value: site.avgIncome, label: 'snittinntekt i Bergen' };

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

  const benefits = [
    { icon: ShieldCheck, t: 'Null risiko', b: 'Ingen oppstartskostnader og ingen bindingstid. Du betaler kun en andel når boligen faktisk tjener.' },
    { icon: Sparkles, t: 'Proff i hver detalj', b: 'Styling, foto, annonsering og leietakeroppfølging — håndtert av et erfarent, lokalt team i Bergen.' },
    { icon: Clock, t: 'Du sparer tid', b: 'Vi tar oss av alt det praktiske, døgnet rundt. Du følger inntekten i sanntid i appen.' },
  ];

  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col antialiased selection:bg-lavender/20">
      {/* ---------------------------- Header ---------------------------- */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-canvas/85 backdrop-blur-md border-b border-hairline/70' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-6 w-auto" width={130} height={24} />
          <div className="flex items-center gap-3">
            <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[14px] font-medium text-ink hover:text-lavender transition-colors">
              <Phone className="w-4 h-4" /> <span className="hidden sm:inline">{site.phone}</span>
            </a>
            <button onClick={scrollToForm} className="hidden sm:inline-flex h-9 items-center rounded-full bg-ink text-canvas px-4 text-[13px] font-semibold hover:-translate-y-0.5 transition-transform">
              Gratis vurdering
            </button>
          </div>
        </div>
      </header>

      {/* ----------------------------- Hero ----------------------------- */}
      <section className="relative overflow-hidden">
        {/* bakgrunns-glød */}
        <div aria-hidden className="pointer-events-none absolute -top-48 -right-32 h-[560px] w-[560px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.30) 0%, rgba(207,151,252,0) 70%)' }} />
        <div aria-hidden className="pointer-events-none absolute top-32 -left-40 h-[420px] w-[420px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(155,91,214,0.12) 0%, rgba(155,91,214,0) 70%)' }} />

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-14 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
          {/* venstre */}
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-quiet">
                <span className="h-1.5 w-1.5 rounded-full bg-lavender" /> {cfg.eyebrow}
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="font-heading font-bold tracking-[-0.04em] leading-[1.02] text-[38px] sm:text-[52px] lg:text-[58px] mt-5 max-w-[16ch]">
                {cfg.h1}
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-quiet text-[17px] sm:text-[19px] mt-5 max-w-[52ch] leading-relaxed">{cfg.sub}</p>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-2">
                    {[0, 1, 2, 3].map((i) => (
                      <img key={i} src="/chat-user.webp" alt="" className="h-8 w-8 rounded-full border-2 border-canvas object-cover" />
                    ))}
                  </div>
                  <div className="ml-1">
                    <div className="flex items-center gap-0.5 text-lavender">
                      {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <p className="text-[12.5px] text-quiet mt-0.5"><b className="text-ink">4,9/5</b> fra utleiere i Bergen</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={230}>
              <ul className="mt-7 space-y-2.5">
                {cfg.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-ink-soft">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-bg">
                      <Check className="h-3 w-3 text-success" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={300}>
              <div id="lp-form" className="mt-8 scroll-mt-24">
                <LeadForm cfg={cfg} />
              </div>
            </Reveal>
          </div>

          {/* høyre: lagdelt bilde-komposisjon */}
          <div className="relative hidden lg:block">
            <Reveal delay={120}>
              <div className="relative rounded-[28px] overflow-hidden aspect-[4/5] shadow-[0_50px_120px_-50px_rgba(10,10,10,0.55)]">
                <img src={cfg.image} alt="Utleiebolig i Bergen" className="absolute inset-0 w-full h-full object-cover" width={900} height={1125} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
              </div>
            </Reveal>
            {/* flytende inntekts-kort */}
            <div className="absolute -bottom-6 -left-6 rounded-[20px] bg-surface/95 backdrop-blur border border-hairline shadow-[0_30px_70px_-35px_rgba(10,10,10,0.5)] px-6 py-4">
              <div className="flex items-center gap-2 text-taupe">
                <TrendingUp className="w-4 h-4 text-lavender" />
                <p className="text-[11px] uppercase tracking-[0.12em]">{heroStat.label}</p>
              </div>
              <p className="font-heading font-bold text-[28px] text-ink mt-0.5 leading-none">{heroStat.value}</p>
            </div>
            {/* flytende verifisert-badge */}
            <div className="absolute top-5 -right-4 rounded-2xl bg-ink text-canvas shadow-[0_24px_50px_-24px_rgba(10,10,10,0.7)] px-4 py-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><ShieldCheck className="w-4 h-4" /></span>
              <div>
                <p className="text-[12px] font-semibold leading-tight">Lokalt team</p>
                <p className="text-[11px] text-canvas/60 leading-tight">midt i Bergen</p>
              </div>
            </div>
            {/* lite Bergen-bilde */}
            <div className="absolute -top-7 left-8 h-20 w-28 rounded-2xl overflow-hidden border-4 border-canvas shadow-[0_20px_40px_-20px_rgba(10,10,10,0.5)] rotate-[-4deg]">
              <img src={cfg.accent} alt="Bergen" className="h-full w-full object-cover" width={160} height={120} />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------ Kanal-stripe ------------------------ */}
      <section className="border-y border-hairline/70 bg-canvas-alt">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-taupe">Vi annonserer der leietakerne leter</p>
          <div className="flex items-center gap-8 sm:gap-10">
            {COMMON_CHANNELS.map((c, i) => (
              <img key={i} src={c.src} alt={c.alt} style={{ height: c.h }} className="w-auto object-contain opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- Statband --------------------------- */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-12 sm:py-16 w-full">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 90} className="text-center">
              <div className="font-heading font-bold text-[30px] sm:text-[42px] text-ink tracking-[-0.03em]">
                <CountUp value={s.value} />
              </div>
              <div className="text-quiet text-[13px] sm:text-[14px] mt-1">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------------- Inntekts-bevis ----------------------- */}
      <section className="bg-canvas-alt border-y border-hairline/70">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lavender">Hva boligen din kan tjene</p>
              <h2 className="font-heading font-bold text-[28px] sm:text-[38px] tracking-[-0.03em] leading-[1.08] mt-3">
                Samme bolig. Tydelig høyere inntekt.
              </h2>
              <p className="text-quiet text-[16px] mt-4 leading-relaxed max-w-[46ch]">{cfg.proofNote}</p>
              <button onClick={scrollToForm} className="group mt-7 inline-flex items-center gap-2 h-12 rounded-full bg-ink text-canvas px-6 font-semibold text-[15px] hover:-translate-y-0.5 transition-transform">
                Se hva din kan tjene <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-[24px] bg-surface shadow-[0_30px_80px_-42px_rgba(10,10,10,0.42),0_2px_10px_rgba(10,10,10,0.04)] p-6 sm:p-8">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-[13px] text-quiet mb-1.5">
                    <span>Vanlig utleie</span><span className="font-semibold text-ink">≈ 19 000 kr</span>
                  </div>
                  <div className="h-3 rounded-full bg-fill overflow-hidden"><div className="h-full rounded-full bg-taupe/40" style={{ width: '70%' }} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[13px] text-quiet mb-1.5">
                    <span className="font-semibold text-ink">Med DigiHome</span><span className="font-semibold text-ink">≈ 25 000 kr</span>
                  </div>
                  <div className="h-3 rounded-full bg-fill overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-lavender to-lavender-soft" style={{ width: '100%' }} /></div>
                </div>
              </div>
              <div className="mt-6 pt-5 border-t border-hairline flex items-end justify-between">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-taupe">Potensial</p>
                  <p className="font-heading font-bold text-[34px] text-ink leading-none mt-1">+30 %</p>
                </div>
                <p className="text-[12px] text-taupe max-w-[18ch] text-right">Eksempeltall for Bergen — du får en konkret vurdering av nettopp din bolig.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------- Slik fungerer det --------------------------- */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 sm:py-24 w-full">
        <Reveal className="text-center max-w-[640px] mx-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lavender">Slik fungerer det</p>
          <h2 className="font-heading font-bold text-[28px] sm:text-[38px] tracking-[-0.03em] mt-3">Fra adresse til inntekt — i tre steg</h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5 relative">
          {COMMON_STEPS.map((s, i) => (
            <Reveal key={i} delay={i * 110}>
              <div className="relative h-full rounded-[22px] bg-surface p-7 shadow-[0_2px_18px_rgba(10,10,10,0.045)] hover:shadow-[0_34px_70px_-42px_rgba(10,10,10,0.42)] hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-ink text-canvas font-heading font-bold text-[17px]">{s.n}</div>
                <h3 className="font-heading font-bold text-[19px] mt-5">{s.t}</h3>
                <p className="text-quiet text-[14.5px] mt-2 leading-relaxed">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------------------- Fordeler ----------------------------- */}
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

      {/* --------------------------- Kundehistorier --------------------------- */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 sm:py-24 w-full">
        <Reveal className="text-center max-w-[640px] mx-auto">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lavender">Utleiere i Bergen</p>
          <h2 className="font-heading font-bold text-[28px] sm:text-[38px] tracking-[-0.03em] mt-3">De sover bedre om natten</h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {COMMON_TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 110}>
              <figure className="h-full rounded-[22px] bg-surface p-7 shadow-[0_2px_18px_rgba(10,10,10,0.045)] flex flex-col">
                <div className="flex items-center gap-0.5 text-lavender mb-4">
                  {[0, 1, 2, 3, 4].map((j) => <Star key={j} className="w-4 h-4 fill-current" />)}
                </div>
                <blockquote className="text-ink-soft text-[15.5px] leading-relaxed flex-1">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <img src={t.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
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

      {/* ----------------------------- Avsluttende CTA ----------------------------- */}
      <section className="px-5 sm:px-8 pb-16 sm:pb-24">
        <Reveal className="max-w-[1100px] mx-auto">
          <div className="relative overflow-hidden rounded-[32px] bg-ink text-canvas px-7 sm:px-14 py-14 sm:py-20 text-center">
            <div aria-hidden className="pointer-events-none absolute -top-24 right-0 h-[360px] w-[360px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.4) 0%, rgba(207,151,252,0) 70%)' }} />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-[320px] w-[320px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(155,91,214,0.3) 0%, rgba(155,91,214,0) 70%)' }} />
            <div className="relative">
              <h2 className="font-heading font-bold text-[30px] sm:text-[44px] tracking-[-0.03em] leading-[1.06] max-w-[20ch] mx-auto">
                Se hva boligen din kan tjene — gratis
              </h2>
              <p className="text-canvas/70 text-[16px] sm:text-[18px] mt-4 max-w-[48ch] mx-auto leading-relaxed">
                En konkret, uforpliktende vurdering innen 24 timer. Ingen oppstartskostnader, ingen binding.
              </p>
              <button onClick={scrollToForm} className="group mt-8 inline-flex items-center gap-2 h-14 rounded-full bg-canvas text-ink px-8 font-semibold text-[16px] hover:-translate-y-0.5 transition-transform shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)]">
                Få gratis vurdering <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              <div className="mt-7 flex items-center justify-center gap-5 text-[12.5px] text-canvas/55 flex-wrap">
                <span className="inline-flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Lokalt team i Bergen</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Trygt og uforpliktende</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Svar innen 24 timer</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* --------------------------------- FAQ --------------------------------- */}
      <section className="max-w-[760px] mx-auto px-5 sm:px-8 pb-16 sm:pb-24 w-full">
        <Reveal>
          <h2 className="font-heading font-bold text-[26px] sm:text-[34px] tracking-[-0.03em] text-center mb-9">Ofte stilte spørsmål</h2>
        </Reveal>
        <div className="space-y-3">
          {cfg.faq.map((f, i) => {
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

      {/* -------------------------------- Footer -------------------------------- */}
      <footer className="mt-auto border-t border-hairline/70">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-taupe">
          <span>© {new Date().getFullYear()} {site.legalName} · Org.nr {site.orgNr}</span>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Identitet sikret med BankID</span>
            <a href={`tel:${site.phoneHref}`} className="text-ink hover:text-lavender transition-colors">{site.phone}</a>
          </div>
        </div>
      </footer>

      {/* ----------------------------- Mobil sticky CTA ----------------------------- */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-[90] p-3 bg-gradient-to-t from-canvas via-canvas/95 to-transparent">
        <button onClick={scrollToForm} className="w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_16px_36px_-10px_rgba(10,10,10,0.6)]">
          Få gratis vurdering <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
