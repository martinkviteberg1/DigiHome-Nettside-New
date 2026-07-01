'use client';

// Google Ads-kampanjeside for utleiere — optimalisert for maksimal konvertering:
// skjema over folden (2 steg), tillitsrad, leiekalkulator, exit-intent og sticky CTA.

import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Phone, ShieldCheck, Sparkles, Clock, Star, Home } from 'lucide-react';
import { site, stats } from '@/lib/site';
import { COMMON_STEPS, COMMON_TESTIMONIALS, COMMON_CHANNELS } from '@/lib/landing';
import { Reveal, CountUp, AvatarStack, InitialsAvatar, TrustLogos, StickyMobileCta, ExitIntent } from '@/components/lp/lp-shared';
import LeadFormPro from '@/components/lp/LeadFormPro';
import RentCalculator from '@/components/lp/RentCalculator';

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

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-14 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-16 items-center">
          {/* venstre */}
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/70 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-quiet">
                <span className="h-1.5 w-1.5 rounded-full bg-lavender" /> {cfg.eyebrow}
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="font-heading font-bold tracking-[-0.04em] leading-[1.02] text-[35px] sm:text-[52px] lg:text-[58px] mt-4 max-w-[16ch]">
                {cfg.h1}
              </h1>
            </Reveal>
            <Reveal delay={110}>
              <p className="text-quiet text-[16px] sm:text-[18px] mt-4 max-w-[52ch] leading-relaxed">{cfg.sub}</p>
            </Reveal>

            {/* Skjemaet først — over folden, også på mobil */}
            <Reveal delay={170}>
              <div id="lp-form" className="mt-6 scroll-mt-24">
                <LeadFormPro cfg={cfg} />
              </div>
            </Reveal>

            {/* Tillitsrad: sosiale bevis + tillitslogoer */}
            <Reveal delay={230}>
              <div className="mt-5 flex items-center justify-between gap-x-6 gap-y-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <AvatarStack size={30} />
                  <div>
                    <div className="flex items-center gap-0.5 text-lavender">
                      {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <p className="text-[12.5px] text-quiet mt-0.5"><b className="text-ink">4,9/5</b> fra utleiere i Bergen</p>
                  </div>
                </div>
                <TrustLogos />
              </div>
            </Reveal>

            {/* Kompakte fordels-punkter */}
            <Reveal delay={280}>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
                {cfg.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-success-bg">
                      <Check className="h-2.5 w-2.5 text-success" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Etisk knapphet */}
            {cfg.urgency ? (
              <Reveal delay={330}>
                <p className="mt-4 inline-flex items-center gap-2 text-[13px] text-quiet">
                  <span className="h-1.5 w-1.5 rounded-full bg-lavender animate-pulse" /> {cfg.urgency}
                </p>
              </Reveal>
            ) : null}
          </div>

          {/* høyre: lagdelt bilde-komposisjon */}
          <div className="relative hidden lg:block">
            <Reveal delay={120}>
              <div className="relative rounded-[28px] overflow-hidden aspect-[4/5] shadow-[0_50px_120px_-50px_rgba(10,10,10,0.55)]">
                <img src={cfg.image} alt="Utleiebolig i Bergen" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" width={900} height={1125} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
              </div>
            </Reveal>
            {/* flytende inntekts-kort */}
            <div className="absolute -bottom-6 -left-6 rounded-[20px] bg-surface/95 backdrop-blur border border-hairline shadow-[0_30px_70px_-35px_rgba(10,10,10,0.5)] px-6 py-4">
              <div className="flex items-center gap-2 text-taupe">
                <Sparkles className="w-4 h-4 text-lavender" />
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
              <img key={i} src={c.src} alt={c.alt} style={{ height: c.h }} loading="lazy" className="w-auto object-contain opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
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

      {/* ----------------------- Inntekts-bevis + kalkulator ----------------------- */}
      <section className="bg-canvas-alt border-y border-hairline/70">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lavender">Hva boligen din kan tjene</p>
              <h2 className="font-heading font-bold text-[28px] sm:text-[38px] tracking-[-0.03em] leading-[1.08] mt-3">
                Samme bolig. Tydelig høyere inntekt.
              </h2>
              <p className="text-quiet text-[16px] mt-4 leading-relaxed max-w-[46ch]">{cfg.proofNote}</p>
              <ul className="mt-6 space-y-2.5">
                {['Dynamisk prising som følger markedet døgnet rundt', 'Hybrid korttid + langtid når det lønner seg', 'Full oversikt over inntekten i sanntid'].map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-ink-soft">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-bg">
                      <Check className="h-3 w-3 text-success" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <button onClick={scrollToForm} className="group mt-7 inline-flex items-center gap-2 h-12 rounded-full bg-ink text-canvas px-6 font-semibold text-[15px] hover:-translate-y-0.5 transition-transform">
                Se hva din kan tjene <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <RentCalculator onCta={scrollToForm} />
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

      {/* --------------------- Sticky mobil-CTA + exit-intent --------------------- */}
      <StickyMobileCta label={cfg.cta || 'Få gratis vurdering'} onClick={scrollToForm} />
      <ExitIntent onCta={scrollToForm} />
    </div>
  );
}
