'use client';

/* ---------------------------------------------------------------------------
   CampaignLanding — Google Ads-kampanjeside for utleiere, i V4-drakt.

   Samme cfg-kontrakt som før (lib/landing.js + Annonsestudio): slug, eyebrow,
   h1, h1B (A/B), sub, bullets, cta, formTitle, image, accent, heroStat,
   proofNote, urgency, faq, comparison, source. Skjemaet (LeadFormPro) og all
   sporing (lead_start / lead_step / lead_submit / trackLead) er uendret.

   Formen: stor typografi, hårlinjer i stedet for kort, ekte bilder, rolige
   bevegelser (kun opacity/transform). Skjemaet står over folden — også på
   mobil — og resten av siden bygger tillit nedover.
--------------------------------------------------------------------------- */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Minus, Phone } from 'lucide-react';
import { site } from '@/lib/site';
import { COMMON_STEPS } from '@/lib/landing';
import { StickyMobileCta, ExitIntent } from '@/components/lp/lp-shared';
import LeadFormPro from '@/components/lp/LeadFormPro';
import RentCalculator from '@/components/lp/RentCalculator';
import { getVariant } from '@/lib/ab';
import { T, display } from '@/components/forside/v4/motion';
import TillitStripe from '@/components/forside/v4/TillitStripe';
import StegSeksjon from '@/components/forside/v4/StegSeksjon';
import FaqSeksjon from '@/components/forside/v4/FaqSeksjon';
import EierSitater from '@/components/forside/v4/forvaltning/EierSitater';
import { SARAH } from '@/components/forside/v4/forvaltning/ForvaltningDeler';
import { Avsloring, DIM, HAIR, Punkt, SVAK } from '@/components/forside/v4/sider/deler';

const STEG = COMMON_STEPS.map((s) => ({ nr: s.n, t: s.t, d: s.d }));

/* Topplinje: wordmark · telefon · én knapp til skjemaet. Ingen meny — annonsetrafikk skal ikke lekke. */
function Topplinje({ onCta, cta }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 12);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className={`sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled ? 'border-[#15130F]/[0.08]' : 'border-transparent'}`} style={{ background: 'rgba(243,241,236,0.9)', backdropFilter: 'saturate(1.2) blur(8px)' }} data-testid="lp-topp">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[18px] w-auto" />
        <div className="flex items-center gap-5">
          <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[13.5px] transition-colors hover:text-[#15130F]" style={{ color: 'rgba(21,19,15,0.65)' }}>
            <Phone className="h-4 w-4" strokeWidth={1.8} /> <span className="hidden sm:inline">{site.phone}</span>
          </a>
          <button type="button" onClick={onCta} className="hidden h-10 items-center gap-1.5 rounded-[10px] px-4 text-[13.5px] font-medium transition-transform active:scale-[0.97] sm:inline-flex" style={{ background: T.ink, color: T.offwhite }} data-testid="lp-topp-cta">
            {cta} <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* Sammenligningstabell — hårlinjer, ikke bokser. Verdier kan være tekst eller true/false. */
function Verdi({ v, oss }) {
  if (v === true) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: oss ? 'rgba(31,157,85,0.14)' : 'rgba(21,19,15,0.06)', color: oss ? T.gronn : 'rgba(21,19,15,0.55)' }}><Check className="h-3.5 w-3.5" strokeWidth={2.2} /></span>;
  if (v === false) return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(21,19,15,0.05)', color: 'rgba(21,19,15,0.35)' }}><Minus className="h-3.5 w-3.5" strokeWidth={2} /></span>;
  return <span className="text-[14.5px]" style={{ color: oss ? T.ink : DIM }}>{v}</span>;
}

export default function CampaignLanding({ cfg }) {
  const [h1, setH1] = useState(cfg.h1);
  const heroStat = cfg.heroStat || { value: site.avgIncome, label: 'Snittinntekt Bergen' };

  // A/B-test av hero-overskrift (sticky per besøkende; variant festes på events + lead-attribusjon).
  useEffect(() => {
    if (!cfg.h1B) return;
    try { if (getVariant(`lp-h1-${cfg.slug}`) === 'B') setH1(cfg.h1B); } catch (e) { /* A/B-fallback bruker standardoverskriften */ }
  }, [cfg.slug, cfg.h1B]);

  const scrollToForm = () => {
    const el = document.getElementById('lp-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const cta = cfg.cta || 'Få gratis vurdering';

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="lp-v4">
      <Topplinje onCta={scrollToForm} cta={cta} />

      <main className="flex-1">
        {/* ── Hero: budskap + skjema over folden ── */}
        <section className="relative" data-testid="lp-hero">
          <div className="mx-auto w-full max-w-[1400px] px-5 pb-14 pt-8 sm:px-8 sm:pt-12 lg:w-[calc(100%-64px)] lg:px-0 lg:pb-20 lg:pt-14">
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
              {/* Tekst */}
              <div className="lg:col-span-6 lg:row-start-1">
                <p className="dh-cover-inn text-[14px] font-medium" style={{ color: SVAK }} data-testid="lp-eyebrow">{cfg.eyebrow}</p>
                <h1 className="dh-cover-inn mt-4 max-w-[16ch] text-[42px] sm:text-[58px] lg:text-[clamp(52px,4.6vw,76px)]" style={{ ...display, color: T.ink, animationDelay: '.04s' }} data-testid="lp-h1">
                  {h1}
                </h1>
                <p className="dh-cover-inn mt-5 max-w-[46ch] text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: 'rgba(21,19,15,0.72)', animationDelay: '.08s' }} data-testid="lp-sub">{cfg.sub}</p>
              </div>

              {/* Skjemaet — over folden, også på mobil */}
              <div id="lp-form" className="dh-cover-inn scroll-mt-24 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1" style={{ animationDelay: '.12s' }}>
                <LeadFormPro cfg={cfg} />
              </div>

              {/* Tillitssone: fordelene + avsender */}
              <div className="dh-cover-inn lg:col-span-6 lg:row-start-2" style={{ animationDelay: '.18s' }}>
                <ul className="border-t" style={{ borderColor: HAIR }} data-testid="lp-bullets">
                  {(cfg.bullets || []).map((b, i) => (
                    <li key={i} className="flex items-start gap-3 border-b py-3 text-[15px] leading-[1.45]" style={{ borderColor: HAIR, color: 'rgba(21,19,15,0.8)' }}>
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SARAH.liten} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" style={{ boxShadow: '0 0 0 1px rgba(21,19,15,0.1)' }} />
                    <p className="text-[13.5px] leading-[1.45]" style={{ color: DIM }}><span style={{ color: T.ink }}>Lokalt team i Bergen.</span> Svar innen 24 timer — fra en forvalter, ikke en selger.</p>
                  </div>
                  {cfg.urgency ? (
                    <p className="inline-flex items-center gap-2 text-[13px]" style={{ color: DIM }} data-testid="lp-urgency">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />{cfg.urgency}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bildet: ekte bolig, ett tall på bildet ── */}
        {cfg.image ? (
          <section className="mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0" data-testid="lp-bilde">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] sm:aspect-[16/7] lg:aspect-[21/8]" style={{ background: T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cfg.image} alt="Utleiebolig i Bergen" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full select-none object-cover" draggable={false} />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[60%]" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.62) 100%)' }} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
                <div>
                  <p className="text-[34px] sm:text-[44px]" style={{ ...display, color: T.offwhite }} data-testid="lp-herostat">{heroStat.value}</p>
                  <p className="mt-1 text-[13.5px]" style={{ color: 'rgba(244,241,234,0.75)' }}>{heroStat.label}</p>
                </div>
                <p className="hidden text-[13.5px] sm:block" style={{ color: 'rgba(244,241,234,0.75)' }}>Bergen · lokalt team</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Nøkkelpunkter ── */}
        <Avsloring testid="lp-nokkel">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1400px] px-5 pb-6 pt-14 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:pt-20">
              <dl className="grid grid-cols-3 gap-6 border-y py-8 sm:gap-8" style={{ borderColor: HAIR }}>
                {[['0 kr', 'oppstart'], ['24 t', 'svartid'], ['Bergen', 'lokalt team']].map(([v, l], i) => (
                  <div key={l} style={inn(i)}>
                    <dt className="text-[30px] sm:text-[44px] lg:text-[52px]" style={{ ...display, color: T.ink }}>{v}</dt>
                    <dd className="mt-1.5 text-[13px] sm:text-[14px]" style={{ color: SVAK }}>{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Avsloring>

        <TillitStripe />

        {/* ── Sammenligning (kun med cfg.comparison) ── */}
        {cfg.comparison ? (
          <Avsloring testid="lp-sammenligning">
            {(inn) => (
              <div className="mx-auto w-full max-w-[1100px] px-5 py-20 sm:px-8 lg:px-0 lg:py-28">
                <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>{cfg.comparison.eyebrow || 'Se forskjellen'}</p>
                <h2 className="mt-4 max-w-[18ch] text-[clamp(34px,3.8vw,60px)]" style={{ ...display, color: T.ink, ...inn(1) }}>{cfg.comparison.title}<Punkt /></h2>
                {cfg.comparison.intro ? <p className="mt-5 max-w-[56ch] text-[16.5px] leading-[1.5]" style={{ color: DIM, ...inn(2) }}>{cfg.comparison.intro}</p> : null}
                <div className="mt-12 border-t" style={{ borderColor: HAIR, ...inn(3) }}>
                  <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-x-4 border-b py-3 text-[13px] sm:grid-cols-[1.5fr_1fr_1fr]" style={{ borderColor: HAIR, color: SVAK }}>
                    <span />
                    <span className="font-medium" style={{ color: T.ink }}>{cfg.comparison.us}</span>
                    <span>{cfg.comparison.them}</span>
                  </div>
                  {cfg.comparison.rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1.2fr_1fr_1fr] items-center gap-x-4 border-b py-4 sm:grid-cols-[1.5fr_1fr_1fr]" style={{ borderColor: HAIR }}>
                      <span className="text-[14.5px] leading-[1.4]" style={{ color: T.ink }}>{r.label}</span>
                      <Verdi v={r.us} oss />
                      <Verdi v={r.them} />
                    </div>
                  ))}
                </div>
                {cfg.comparison.footnote ? <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: SVAK }}>{cfg.comparison.footnote} Se alltid leverandørens gjeldende vilkår.</p> : null}
                <button type="button" onClick={scrollToForm} className="group mt-8 inline-flex h-12 items-center gap-2 rounded-[12px] px-6 text-[15px] font-medium transition-transform active:scale-[0.97]" style={{ background: T.ink, color: T.offwhite }}>
                  {cfg.cta || 'Se hva du sparer'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
                </button>
              </div>
            )}
          </Avsloring>
        ) : null}

        {/* ── Inntekt + kalkulator ── */}
        <Avsloring style={{ background: T.flate }} testid="lp-inntekt">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:py-28">
              <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-12">
                <div className="lg:col-span-6">
                  <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Hva boligen din kan tjene</p>
                  <h2 className="mt-4 max-w-[16ch] text-[clamp(36px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }}>Samme bolig. Riktig pris — hele året<Punkt /></h2>
                  {cfg.proofNote ? <p className="mt-6 max-w-[48ch] text-[17px] leading-[1.5]" style={{ color: DIM, ...inn(2) }} data-testid="lp-proof">{cfg.proofNote}</p> : null}
                  <ul className="mt-8 border-t" style={{ borderColor: HAIR, ...inn(3) }}>
                    {['Prising som følger markedet — ikke magefølelsen', 'Riktig leietaker, kvalitetssjekket og signert med BankID', 'Full oversikt over inntekten, når du vil'].map((t) => (
                      <li key={t} className="flex items-start gap-3 border-b py-3.5 text-[15.5px] leading-[1.45]" style={{ borderColor: HAIR, color: 'rgba(21,19,15,0.8)' }}>
                        <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />{t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-5 lg:col-start-8" style={inn(2, 24)}>
                  <RentCalculator onCta={scrollToForm} />
                </div>
              </div>
            </div>
          )}
        </Avsloring>

        {/* ── Slik fungerer det ── */}
        <StegSeksjon tittel={['Slik fungerer', 'det.']} under="Tre steg fra første kontakt til første husleie." steg={STEG} person={null} testid="lp" />

        {/* ── Eierne ── */}
        <EierSitater />

        {/* ── Spørsmål og svar ── */}
        {Array.isArray(cfg.faq) && cfg.faq.length ? <FaqSeksjon sporsmal={cfg.faq} /> : null}

        {/* ── Avslutning: tilbake til skjemaet ── */}
        <section className="relative" style={{ background: T.charcoal, color: T.offwhite }} data-testid="lp-avslutning">
          <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <p className="text-[14px] font-medium" style={{ color: 'rgba(244,241,234,0.55)' }}>Uforpliktende · 0 kr oppstart · svar innen 24 t</p>
                <h2 className="mt-4 max-w-[14ch] text-[clamp(40px,5vw,84px)]" style={{ ...display, color: T.offwhite }}>Se hva boligen din kan tjene<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span></h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4 lg:col-span-4 lg:justify-end">
                <button type="button" onClick={scrollToForm} className="group inline-flex h-12 items-center gap-2 rounded-[12px] px-6 text-[15px] font-medium transition-transform active:scale-[0.97]" style={{ background: T.lilla, color: T.ink }} data-testid="lp-bunn-cta">
                  {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
                </button>
                <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[15px] font-medium transition-colors hover:text-white" style={{ color: 'rgba(244,241,234,0.85)' }}>
                  <Phone className="h-4 w-4" strokeWidth={1.8} /> {site.phone}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Kompakt footer — kampanjeside, ingen meny ── */}
      <footer className="border-t" style={{ background: T.charcoal, borderColor: 'rgba(244,241,234,0.12)', color: 'rgba(244,241,234,0.5)' }} data-testid="lp-footer">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-5 py-6 text-[12.5px] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:w-[calc(100%-64px)] lg:px-0">
          <p>Digihome AS · Org.nr 835 595 242 · Bergen · <a href={`tel:${site.phoneHref}`} className="transition-colors hover:text-white">{site.phone}</a></p>
          <p className="flex gap-4">
            <Link href="/personvern" className="transition-colors hover:text-white">Personvern</Link>
            <Link href="/vilkar" className="transition-colors hover:text-white">Vilkår</Link>
            <Link href="/" className="transition-colors hover:text-white">digihome.no</Link>
          </p>
        </div>
      </footer>

      <StickyMobileCta label={cta} onClick={scrollToForm} />
      <ExitIntent onCta={scrollToForm} />
    </div>
  );
}
