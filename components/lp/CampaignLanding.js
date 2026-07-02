'use client';

// Google Ads-kampanjeside for utleiere — optimalisert for maksimal konvertering:
// skjema over folden (2 steg), tillitsrad, leiekalkulator, exit-intent og sticky CTA.
// Designet speiler root-siden (/) 1:1 — samme palett, typografi og komponentspråk.

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, Check, Phone, ShieldCheck, Sparkles, Clock, Star, Home, X, Minus, ClipboardCheck, Camera, Wallet, Quote, ChevronDown } from 'lucide-react';
import { site, statStrip } from '@/lib/site';
import { COMMON_STEPS, COMMON_TESTIMONIALS, COMMON_CHANNELS } from '@/lib/landing';
import { Reveal, CountUp, AvatarStack, InitialsAvatar, TrustLogos, StickyMobileCta, ExitIntent } from '@/components/lp/lp-shared';
import LeadFormPro from '@/components/lp/LeadFormPro';
import RentCalculator from '@/components/lp/RentCalculator';
import { getVariant } from '@/lib/ab';

const STEP_ICONS = [ClipboardCheck, Camera, Wallet];

export default function CampaignLanding({ cfg }) {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [h1, setH1] = useState(cfg.h1);
  const heroStat = cfg.heroStat || { value: site.avgIncome, label: 'Snittinntekt Bergen' };

  // A/B-test av hero-overskrift (sticky per besøkende; variant festes automatisk
  // på events + lead-attribusjon → nedbrytbar i admin-trakten).
  useEffect(() => {
    if (!cfg.h1B) return;
    try { if (getVariant(`lp-h1-${cfg.slug}`) === 'B') setH1(cfg.h1B); } catch (e) {}
  }, [cfg.slug, cfg.h1B]);

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
    <div className="bg-[#fdfcfb] text-[#0a0a0a] min-h-screen flex flex-col antialiased selection:bg-[#d298ff]/25">
      {/* ---------------------------- Header (root-DNA) ---------------------------- */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white border-b border-[#1f1f1f]/[0.08] shadow-[0_1px_0_rgba(31,31,31,0.04)]' : 'bg-transparent border-b border-transparent'}`}>
        <div className="w-full px-6 lg:px-12">
          <div className="h-[72px] flex items-center justify-between gap-8">
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[26px] w-auto" width={130} height={26} />
            <div className="flex items-center gap-5">
              <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-[#1f1f1f]/75 hover:text-[#1f1f1f] transition-colors">
                <Phone className="w-4 h-4" /> <span className="hidden sm:inline">{site.phone}</span>
              </a>
              <button
                onClick={scrollToForm}
                className="group relative hidden sm:inline-flex items-center gap-2 h-[42px] pl-5 pr-2 rounded-full text-[13px] font-semibold tracking-[-0.008em] overflow-hidden transition-all duration-300 active:scale-[0.97]"
                style={{ background: '#1f1f1f', color: '#ffffff', boxShadow: '0 8px 24px -8px rgba(31,31,31,0.35), 0 2px 6px -2px rgba(31,31,31,0.18)' }}
              >
                <span className="relative z-10">Gratis vurdering</span>
                <span className="relative z-10 inline-flex items-center justify-center w-[30px] h-[30px] rounded-full transition-all duration-300" style={{ background: '#d298ff', color: '#1f1f1f' }}>
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.6} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ----------------------------- Hero (root-DNA) ----------------------------- */}
      <section className="pt-[72px] relative overflow-hidden" style={{ background: '#fdfcfb' }}>
        {/* Subtilt prikkerutenett — som på forsiden */}
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
          opacity: 0.45,
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 75%)',
        }} />
        {/* Myk lavendel-glød */}
        <div aria-hidden className="absolute -top-40 right-0 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.07) 0%, transparent 65%)' }} />

        <div className="relative max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-8 sm:pt-12 lg:pt-14 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-20 items-center">
            {/* venstre */}
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#9333EA' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d298ff]" /> {cfg.eyebrow}
                </p>
              </Reveal>
              <Reveal delay={60}>
                <h1 className="font-heading font-bold tracking-[-0.035em] leading-[1.06] text-[36px] sm:text-[46px] lg:text-[54px] text-[#0a0a0a] mt-4 max-w-[17ch]">
                  {h1}
                </h1>
              </Reveal>
              <Reveal delay={110}>
                <p className="text-[16px] sm:text-[17px] text-[#555] leading-[1.75] mt-5 max-w-[46ch]">{cfg.sub}</p>
              </Reveal>

              {/* Skjemaet først — over folden, også på mobil */}
              <Reveal delay={170}>
                <div id="lp-form" className="mt-7 scroll-mt-28">
                  <LeadFormPro cfg={cfg} />
                </div>
              </Reveal>

              {/* Tillitsrad: sosiale bevis + tillitslogoer */}
              <Reveal delay={230}>
                <div className="mt-6 flex items-center justify-between gap-x-6 gap-y-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <AvatarStack size={30} />
                    <div>
                      <div className="flex items-center gap-0.5 text-[#d298ff]">
                        {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                      </div>
                      <p className="text-[12.5px] text-[#888] mt-0.5"><b className="text-[#0a0a0a] font-semibold">4,9/5</b> fra utleiere i Bergen</p>
                    </div>
                  </div>
                  <TrustLogos />
                </div>
              </Reveal>

              {/* Kompakte fordels-punkter */}
              <Reveal delay={280}>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
                  {cfg.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13.5px] text-[#555]">
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#E8F4EE]">
                        <Check className="h-2.5 w-2.5 text-[#18794E]" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </Reveal>

              {/* Etisk knapphet */}
              {cfg.urgency ? (
                <Reveal delay={330}>
                  <p className="mt-4 inline-flex items-center gap-2 text-[13px] text-[#888]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d298ff] animate-pulse" /> {cfg.urgency}
                  </p>
                </Reveal>
              ) : null}

              {/* Mobil hero-bilde — samme uttrykk som forsiden */}
              <Reveal delay={360}>
                <div className="lg:hidden mt-8">
                  <div className="relative h-[210px] sm:h-[260px] rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                    <img src={cfg.image} alt="Utleiebolig i Bergen" className="absolute inset-0 w-full h-full object-cover" width={800} height={500} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                      <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                        <p className="text-[9px] text-[#999] leading-tight">{heroStat.label}</p>
                        <p className="text-[15px] font-heading font-bold text-[#0a0a0a] mt-0.5">{heroStat.value}</p>
                      </div>
                      <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5edfc] flex items-center justify-center">
                            <svg className="w-3 h-3 text-[#cf97fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                          </div>
                          <span className="text-[11px] font-semibold text-[#0a0a0a]">+30%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* høyre: bento-komposisjon (kun desktop) — som forsiden */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-5 gap-3 h-[540px] xl:h-[580px]">
                <Reveal delay={120} className="col-span-3">
                  <div className="relative h-full rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] group">
                    <img src={cfg.image} alt="Utleiebolig i Bergen" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1000ms] ease-out" width={900} height={1125} />
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl px-5 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#999] leading-tight">{heroStat.label}</p>
                          <p className="text-[17px] font-heading font-bold text-[#0a0a0a] mt-1 whitespace-nowrap">{heroStat.value}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-[#f5edfc] flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-[#cf97fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
                <div className="col-span-2 flex flex-col gap-3">
                  <Reveal delay={200} className="flex-1">
                    <div className="relative h-full rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] group">
                      <img src={cfg.accent} alt="Bergen" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1000ms] ease-out" width={600} height={500} />
                    </div>
                  </Reveal>
                  <Reveal delay={280} className="flex-1">
                    <div className="h-full rounded-[20px] bg-[#0a0a0a] text-white p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                        <ShieldCheck className="w-[18px] h-[18px] text-[#d298ff]" />
                      </span>
                      <div>
                        <p className="text-[15px] font-heading font-bold leading-tight">Lokalt team i Bergen</p>
                        <p className="text-[12.5px] text-white/50 mt-1 leading-relaxed">Vi kjenner nabolagene, leietakerne og prisene.</p>
                        <div className="mt-3 flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5 text-[#d298ff]">
                            {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                          </span>
                          <span className="text-[11.5px] text-white/60">4,9/5 fra utleiere</span>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------ Kanal-stripe ------------------------ */}
      <section className="bg-white border-y border-[#eee]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-7 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#aaa]">Vi annonserer der leietakerne leter</p>
          <div className="flex items-center gap-8 sm:gap-10">
            {COMMON_CHANNELS.map((c, i) => (
              <img key={i} src={c.src} alt={c.alt} style={{ height: c.h }} loading="lazy" className="w-auto object-contain opacity-55 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------- Sammenligningstabell (kun m/ cfg.comparison) ------------------- */}
      {cfg.comparison ? (
        <section className="py-20 sm:py-28" style={{ background: '#fdfcfb' }}>
          <div className="max-w-[1000px] mx-auto px-6 sm:px-10 w-full">
            <Reveal className="text-center max-w-[640px] mx-auto">
              <p className="text-[13px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#9333EA' }}>{cfg.comparison.eyebrow || 'Se forskjellen'}</p>
              <h2 className="font-heading font-bold text-[30px] sm:text-[42px] tracking-[-0.03em] leading-[1.1] text-[#0a0a0a] mt-3">{cfg.comparison.title}</h2>
              <p className="text-[16px] text-[#888] mt-4 leading-[1.75]">{cfg.comparison.intro}</p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-10 overflow-hidden rounded-2xl border border-[#eee] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                {/* Kolonneoverskrifter */}
                <div className="grid grid-cols-[1.15fr_1fr_1fr] sm:grid-cols-[1.4fr_1fr_1fr] border-b border-[#eee]">
                  <div className="px-4 sm:px-6 py-4" />
                  <div className="px-3 sm:px-6 py-4 text-center bg-[#0a0a0a] text-white">
                    <p className="font-heading font-bold text-[15px] sm:text-[17px] leading-tight">{cfg.comparison.us}</p>
                    <p className="text-[10.5px] sm:text-[11px] text-[#d298ff] mt-0.5 uppercase tracking-[0.12em] font-semibold">Anbefalt</p>
                  </div>
                  <div className="px-3 sm:px-6 py-4 text-center">
                    <p className="font-heading font-semibold text-[14px] sm:text-[16px] text-[#888] leading-tight">{cfg.comparison.them}</p>
                  </div>
                </div>
                {/* Rader */}
                {cfg.comparison.rows.map((r, i) => {
                  const cell = (v, us) => {
                    if (v === true) return (
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${us ? 'bg-[#E8F4EE]' : 'bg-[#f5f3f0]'}`}>
                        <Check className={`h-3.5 w-3.5 ${us ? 'text-[#18794E]' : 'text-[#999]'}`} />
                      </span>
                    );
                    if (v === false) return (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f5f3f0]">
                        <X className="h-3.5 w-3.5 text-[#bbb]" />
                      </span>
                    );
                    if (v === 'Varierer') return (
                      <span className="inline-flex items-center gap-1 text-[13px] text-[#999]"><Minus className="h-3.5 w-3.5" /> Varierer</span>
                    );
                    return <span className={`text-[13px] sm:text-[14.5px] leading-snug ${us ? 'font-bold text-[#0a0a0a]' : 'text-[#888]'}`}>{v}</span>;
                  };
                  return (
                    <div key={i} className={`grid grid-cols-[1.15fr_1fr_1fr] sm:grid-cols-[1.4fr_1fr_1fr] items-center ${i % 2 ? 'bg-[#fafafa]' : ''} ${i < cfg.comparison.rows.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}>
                      <div className="px-4 sm:px-6 py-3.5 text-[13px] sm:text-[14.5px] font-medium text-[#555] leading-snug">{r.label}</div>
                      <div className="px-3 sm:px-6 py-3.5 text-center bg-[#faf7ff]">{cell(r.us, true)}</div>
                      <div className="px-3 sm:px-6 py-3.5 text-center">{cell(r.them, false)}</div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
            {cfg.comparison.footnote ? (
              <Reveal delay={180}>
                <p className="mt-4 text-[12px] text-[#aaa] text-center max-w-[70ch] mx-auto leading-relaxed">{cfg.comparison.footnote}</p>
              </Reveal>
            ) : null}
            <Reveal delay={220} className="text-center">
              <button onClick={scrollToForm} className="group mt-8 inline-flex items-center gap-2 h-[50px] rounded-full bg-[#0a0a0a] text-white px-8 font-semibold text-[14px] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] active:scale-[0.97]">
                {cfg.cta || 'Se hva du sparer'} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <p className="mt-3.5 text-[12.5px] text-[#999] inline-flex items-center gap-1.5 justify-center w-full">
                <ShieldCheck className="w-3.5 h-3.5 text-[#18794E]" /> Uforpliktende · 0 kr oppstart · Svar umiddelbart
              </p>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* --------------------------- Statband (root-DNA) --------------------------- */}
      <section className="bg-white py-20 sm:py-24">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
          <div className="grid sm:grid-cols-3 gap-10 lg:gap-6 text-center">
            {statStrip.map((s, i) => (
              <Reveal key={i} delay={i * 100} className={i < statStrip.length - 1 ? 'sm:border-r sm:border-[#eee]' : ''}>
                <p className="font-heading font-bold text-[44px] sm:text-[56px] text-[#0a0a0a] leading-none tracking-[-0.04em]">
                  <CountUp value={s.value} />
                </p>
                <p className="font-heading text-[15px] font-semibold text-[#0a0a0a] mt-3">{s.label}</p>
                <p className="text-[13px] text-[#aaa] mt-1 leading-relaxed">{s.sub}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------- Inntekts-bevis + kalkulator ----------------------- */}
      <section className="py-24 sm:py-32" style={{ background: '#fdfcfb' }}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#9333EA' }}>Hva boligen din kan tjene</p>
              <h2 className="font-heading font-bold text-[30px] sm:text-[42px] tracking-[-0.03em] leading-[1.1] text-[#0a0a0a] mt-3">
                Samme bolig. Tydelig høyere inntekt.
              </h2>
              <p className="text-[16px] text-[#555] mt-5 leading-[1.75] max-w-[46ch]">{cfg.proofNote}</p>
              <ul className="mt-7 space-y-3">
                {['Dynamisk prising som følger markedet døgnet rundt', 'Hybrid korttid + langtid når det lønner seg', 'Full oversikt over inntekten i sanntid'].map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-[#555]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F4EE]">
                      <Check className="h-3 w-3 text-[#18794E]" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <button onClick={scrollToForm} className="group mt-8 inline-flex items-center gap-2 h-[50px] rounded-full bg-[#0a0a0a] text-white px-8 font-semibold text-[14px] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] active:scale-[0.97]">
                Se hva din kan tjene <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <RentCalculator onCta={scrollToForm} />
          </Reveal>
        </div>
      </section>

      {/* --------------------------- Slik fungerer det (root-DNA) --------------------------- */}
      <section className="bg-white py-24 sm:py-32">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
          <Reveal className="text-center max-w-[640px] mx-auto mb-14">
            <p className="text-[13px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#9333EA' }}>Slik fungerer det</p>
            <h2 className="font-heading font-bold text-[30px] sm:text-[42px] tracking-[-0.03em] leading-[1.1] text-[#0a0a0a] mt-3">Fra adresse til inntekt — i tre steg</h2>
            <p className="text-[16px] text-[#888] mt-4 leading-relaxed max-w-[440px] mx-auto">Tre steg. Null stress. Vi håndterer alt — du nyter inntekten.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {COMMON_STEPS.map((s, i) => {
              const Icon = STEP_ICONS[i] || ClipboardCheck;
              return (
                <Reveal key={i} delay={i * 100}>
                  <div className="group h-full p-7 rounded-2xl transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]" style={{ backgroundColor: '#F2F1F0' }}>
                    <span className="font-heading text-[11px] font-bold tracking-[0.15em]" style={{ color: '#D298FF' }}>STEG {s.n}</span>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mt-4 mb-5" style={{ backgroundColor: '#f3ebff' }}>
                      <Icon className="w-5 h-5" style={{ color: '#AE68E4' }} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-heading font-bold text-[17px] text-[#222] mb-2">{s.t}</h3>
                    <p className="text-[14px] text-[#888] leading-[1.65]">{s.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------- Fordeler ----------------------------- */}
      <section className="py-20 sm:py-28" style={{ background: '#fdfcfb' }}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 grid sm:grid-cols-3 gap-5">
          {benefits.map((c, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="h-full rounded-2xl bg-white border border-[#eee] p-7 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: '#f3ebff' }}>
                  <c.icon className="w-5 h-5" style={{ color: '#AE68E4' }} strokeWidth={1.5} />
                </span>
                <h3 className="font-heading font-bold text-[17px] text-[#222] mt-5 mb-2">{c.t}</h3>
                <p className="text-[14px] text-[#888] leading-[1.65]">{c.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* --------------------------- Kundehistorier (root-DNA) --------------------------- */}
      <section className="bg-white py-24 sm:py-32">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
          <Reveal>
            <h2 className="font-heading font-bold text-[30px] sm:text-[42px] tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-14">Hva utleiere i Bergen sier</h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
            {COMMON_TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <figure className="h-full bg-[#fafafa] rounded-2xl p-7 sm:p-8 hover:bg-[#f5f3f0] transition-colors duration-500 flex flex-col">
                  <Quote className="w-8 h-8 text-[#e8dff0] mb-5" strokeWidth={1.5} />
                  <blockquote className="text-[16px] text-[#333] leading-[1.7] flex-1">{t.quote}</blockquote>
                  <figcaption className="flex items-center gap-3 mt-7 pt-6 border-t border-[#eee]">
                    <InitialsAvatar name={t.name} index={i} size={40} />
                    <div>
                      <p className="text-[14px] font-semibold text-[#0a0a0a]">{t.name}</p>
                      <p className="text-[12px] text-[#aaa]">Eiendomseier, {t.area}, Bergen</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- Avsluttende CTA (root-DNA) ----------------------------- */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
          <Reveal>
            <div className="py-24 sm:py-32 grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="font-heading font-bold text-[32px] sm:text-[44px] lg:text-[50px] tracking-[-0.03em] leading-[1.08] text-white">
                  Se hva boligen din kan tjene — gratis
                </h2>
              </div>
              <div className="lg:text-right">
                <p className="text-[16px] text-white/55 mb-8 max-w-[38ch] lg:ml-auto leading-[1.75]">
                  En konkret, uforpliktende vurdering — svar umiddelbart. Ingen oppstartskostnader, ingen binding.
                </p>
                <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                  <button onClick={scrollToForm} className="group inline-flex items-center gap-2 rounded-full bg-white text-[#0a0a0a] hover:bg-white/90 h-[50px] px-8 text-[14px] font-semibold transition-all duration-200 hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:scale-[0.97]">
                    Få gratis vurdering <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 rounded-full text-white/55 hover:text-white/80 hover:bg-white/5 h-[50px] px-8 text-[14px] transition-colors">
                    <Phone className="w-4 h-4" /> Ring oss
                  </a>
                </div>
                <div className="mt-8 flex items-center gap-5 text-[12.5px] text-white/40 flex-wrap lg:justify-end">
                  <span className="inline-flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Lokalt team i Bergen</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Trygt og uforpliktende</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Svar umiddelbart</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------- FAQ (root-DNA) --------------------------------- */}
      <section className="bg-white py-24 sm:py-32">
        <div className="max-w-[820px] mx-auto px-6 sm:px-10 w-full">
          <Reveal className="text-center mb-12">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9b6cc4]">Ofte stilte spørsmål</p>
            <h2 className="font-heading font-bold text-[30px] sm:text-[42px] tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mt-4">Spørsmål og svar</h2>
          </Reveal>
          <div className="border-t border-[#eee]">
            {cfg.faq.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={i} delay={i * 50} className="border-b border-[#eee]">
                  <button onClick={() => setOpenFaq(open ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left py-5">
                    <h3 className="font-heading text-[16px] sm:text-[18px] font-semibold text-[#0a0a0a] leading-snug">{f.q}</h3>
                    <span className={`w-8 h-8 rounded-full bg-[#f5f0fb] flex items-center justify-center shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-4 h-4 text-[#9b6cc4]" strokeWidth={2.4} />
                    </span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <p className="text-[15px] text-[#555] leading-[1.8] pb-6 pr-10">{f.a}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <p className="text-[14px] text-[#888]">Har du flere spørsmål?</p>
            <button onClick={scrollToForm} className="inline-flex items-center gap-2 mt-3 h-11 px-6 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold active:scale-[0.98] transition-transform">
              Få gratis vurdering
            </button>
          </div>
        </div>
      </section>

      {/* -------------------------------- Footer -------------------------------- */}
      <footer className="mt-auto bg-white border-t border-[#eee]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[#aaa]">
          <span>© {new Date().getFullYear()} {site.legalName} · Org.nr {site.orgNr}</span>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#18794E]" /> Identitet sikret med BankID</span>
            <a href={`tel:${site.phoneHref}`} className="text-[#1f1f1f] hover:text-[#a463e8] transition-colors font-medium">{site.phone}</a>
          </div>
        </div>
      </footer>

      {/* --------------------- Sticky mobil-CTA + exit-intent --------------------- */}
      <StickyMobileCta label={cfg.cta || 'Få gratis vurdering'} onClick={scrollToForm} />
      <ExitIntent onCta={scrollToForm} />
    </div>
  );
}
