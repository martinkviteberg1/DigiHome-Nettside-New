import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles, ShieldCheck, CalendarRange, Wrench, Plug, Droplets, Scale, Umbrella,
  BadgeCheck, TrendingUp, Eye, Users, Check, ArrowRight, ArrowUpRight,
  MapPin, BedDouble, Maximize, Quote, Star, Clock,
  Repeat, LineChart, Settings2, Smartphone,
} from 'lucide-react';

import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Reveal } from '@/components/site/Reveal';
import { JsonLd } from '@/components/site/JsonLd';
import { CinematicVideo } from '@/components/site/CinematicVideo';
import { CountUp } from '@/components/site/CountUp';
import { PartnerMarquee } from '@/components/site/PartnerMarquee';
import { Bar } from '@/components/site/Bar';
import { HeroAutopilot } from '@/components/home/HeroAutopilot';
import { AutopilotChapters } from '@/components/home/AutopilotChapters';
import {
  site, statStrip, services, steps, qualities, qualityGallery,
  showcase, network, reasons, testimonials,
} from '@/lib/site';

const iconMap = {
  Sparkles, ShieldCheck, CalendarRange, Wrench, Plug, Droplets, Scale, Umbrella,
  BadgeCheck, TrendingUp, Eye, Users, Repeat, LineChart, Settings2, Smartphone,
};

export const metadata = {
  description:
    'Utleie på autopilot. DigiHome håndterer annonsering, prising, visninger og leietakere i Bergen — helt automatisk. Gratis verdivurdering.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'DigiHome | Utleie på autopilot',
    description:
      'DigiHome håndterer annonsering, prising, visninger og leietakere i Bergen — helt automatisk. Gratis verdivurdering.',
    url: site.url + '/',
    images: [{ url: site.ogImage, width: 1200, height: 630, alt: 'DigiHome — Bergen' }],
  },
};

const Eyebrow = ({ children, className = '' }) => (
  <p className={`flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-semibold text-taupe ${className}`}>
    <span className="inline-block h-px w-7 bg-current opacity-50" />
    {children}
  </p>
);

export default function HomePage() {
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DigiHome',
    legalName: site.legalName,
    url: site.url,
    logo: `${site.url}/digihome-mark.svg`,
    email: site.email,
    telephone: site.phone,
    sameAs: [site.social.instagram, site.social.facebook, site.social.linkedin],
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      postalCode: site.address.postal,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
  };

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${site.url}/#localbusiness`,
    name: 'DigiHome',
    image: `${site.url}${site.ogImage}`,
    url: site.url,
    telephone: site.phone,
    email: site.email,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      postalCode: site.address.postal,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    areaServed: { '@type': 'City', name: 'Bergen' },
    founder: { '@type': 'Person', name: site.ceo },
  };

  return (
    <>
      <JsonLd data={orgJsonLd} />
      <JsonLd data={localBusinessJsonLd} />
      <Header dark />

      <main>
        {/* ============ 1. HERO — UTLEIE. PÅ AUTOPILOT. ============ */}
        <HeroAutopilot />

        {/* ============ 2. AUTOPILOTEN I PRAKSIS (kapitler på autopilot) ============ */}
        <AutopilotChapters />

        {/* ============ 3. SLIK JOBBER DIGIHOME (kinematisk film) ============ */}
        <section className="relative overflow-hidden bg-ink text-white py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 75% 0%, rgba(207,151,252,0.14), transparent 55%)' }} />
          <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="max-w-2xl">
              <Reveal><Eyebrow className="text-lavender-soft">Se filmen</Eyebrow></Reveal>
              <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[52px] font-bold leading-[1.06]">
                Slik jobber DigiHome for deg.
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-5 text-lg text-white/65 leading-relaxed max-w-xl">
                  Fra du slår på autopiloten til leien tikker inn på konto — se hele
                  flyten på 60 sekunder. Teknologi i kulissene, mennesker i front.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.12} className="mt-12">
              <CinematicVideo poster="/bergen-aerial.webp" src="/film/digihome-utleie-pa-autopilot-60s-16x9.mp4" />
            </Reveal>
          </div>
        </section>

        {/* ============ 3. TRE TJENESTEMODELLER ============ */}
        <section className="py-20 sm:py-28">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="max-w-2xl">
              <Reveal><Eyebrow className="text-lavender">Våre tjenester</Eyebrow></Reveal>
              <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                Tre modeller for utleie
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-5 text-lg text-quiet leading-relaxed">
                  Velg modellen som passer din eiendom best, eller la oss anbefale den optimale løsningen.
                </p>
              </Reveal>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {services.map((s, i) => {
                const Icon = iconMap[s.icon];
                return (
                  <Reveal key={s.name} delay={i * 0.07}>
                    <div className={`h-full rounded-card p-8 border transition duration-300 hover:-translate-y-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_28px_60px_rgba(0,0,0,0.13)] ${s.featured ? 'bg-ink text-white border-ink' : 'bg-surface border-hairline'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`h-12 w-12 rounded-full inline-flex items-center justify-center ${s.featured ? 'bg-white/10' : 'bg-fill'}`}>
                          <Icon className={`h-5 w-5 ${s.featured ? 'text-lavender-soft' : 'text-lavender'}`} />
                        </span>
                        {s.badge && (
                          <span className="rounded-full bg-lavender-soft/20 text-lavender px-3 py-1 text-xs font-semibold">
                            {s.badge}
                          </span>
                        )}
                      </div>
                      <h3 className={`mt-6 text-2xl font-bold ${s.featured ? 'text-white' : 'text-ink'}`}>{s.name}</h3>
                      <p className={`mt-1 text-sm font-medium ${s.featured ? 'text-white/60' : 'text-taupe'}`}>{s.tag}</p>
                      <p className={`mt-4 text-[15px] leading-relaxed ${s.featured ? 'text-white/75' : 'text-quiet'}`}>{s.description}</p>
                      <div className={`mt-6 pt-5 border-t flex items-center gap-2 ${s.featured ? 'border-white/15' : 'border-hairline'}`}>
                        <Check className={`h-4 w-4 ${s.featured ? 'text-success-bg' : 'text-success'}`} />
                        <span className={`text-sm font-semibold ${s.featured ? 'text-white' : 'text-ink'}`}>{s.highlight}</span>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ 4. STATISTIKK-STRIPE ============ */}
        <section className="bg-ink text-white">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-16">
            <div className="grid sm:grid-cols-3 gap-10 sm:gap-6">
              {statStrip.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.08} className="text-center sm:text-left">
                  <p className="text-5xl sm:text-6xl font-bold tracking-[-0.04em]"><CountUp value={s.value} /></p>
                  <p className="mt-3 text-lg font-semibold">{s.label}</p>
                  <p className="mt-1 text-sm text-white/55">{s.sub}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 5. FRA HENVENDELSE TIL UTBETALING ============ */}
        <section className="py-20 sm:py-28">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="max-w-2xl">
              <Reveal><Eyebrow className="text-lavender">Slik fungerer det</Eyebrow></Reveal>
              <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                Fra henvendelse til utbetaling
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-5 text-lg text-quiet leading-relaxed">
                  Fire steg. Null stress. Vi håndterer alt — du nyter inntekten.
                </p>
              </Reveal>
            </div>

            <div className="mt-16 relative">
              <div className="hidden lg:block absolute top-[42px] left-[10%] right-[10%] h-px bg-gradient-to-r from-hairline via-lavender/40 to-hairline" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 relative">
                {steps.map((s, i) => {
                  const Icon = iconMap[s.icon];
                  return (
                    <Reveal key={s.no} delay={i * 0.08}>
                      <div className="group">
                        <div className="relative z-10 h-[84px] w-[84px] rounded-2xl bg-surface border border-hairline shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center justify-center mx-auto lg:mx-0 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                          <Icon className="h-7 w-7 text-ink" />
                          <span className="absolute -top-2.5 -right-2.5 h-7 w-7 rounded-full bg-lavender text-white text-xs font-bold flex items-center justify-center shadow-[0_4px_12px_rgba(155,91,214,0.4)]">
                            {s.no}
                          </span>
                        </div>
                        <h3 className="mt-6 text-xl font-bold text-ink text-center lg:text-left">{s.title}</h3>
                        <p className="mt-2.5 text-[15px] leading-relaxed text-quiet text-center lg:text-left">{s.body}</p>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ============ 6. FULLBREDDE BERGEN-BREAK ============ */}
        <section className="relative">
          <div className="relative h-[460px] sm:h-[560px] overflow-hidden">
            <div className="absolute inset-0 animate-kenburns">
              <Image src="/bergen-harbor.webp" alt="Bergen havn" fill className="object-cover" sizes="100vw" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 80% 10%, rgba(207,151,252,0.18), transparent 55%)' }} />
            <div className="absolute inset-0 flex items-end">
              <div className="max-w-shell mx-auto w-full px-6 sm:px-10 lg:px-16 pb-14 sm:pb-20">
                <Reveal>
                  <p className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-semibold text-white/70">
                    <span className="inline-block h-px w-7 bg-white/50" />
                    Bergen, Norge
                  </p>
                </Reveal>
                <Reveal as="h2" delay={0.05} className="mt-4 max-w-2xl text-white text-[32px] sm:text-[48px] font-bold leading-[1.08]">
                  Mer enn forvaltning.<br />En partner for eiendommen din.
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 7. KUN HØYKVALITETSBOLIGER ============ */}
        <section className="py-20 sm:py-28">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <Reveal><Eyebrow className="text-lavender">Vår standard</Eyebrow></Reveal>
                <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                  Kun høykvalitetsboliger
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-5 text-lg text-quiet leading-relaxed max-w-lg">
                    Vi er selektive. Hver eiendom i DigiHome-porteføljen møter våre strenge krav til
                    standard, innredning og beliggenhet. Det sikrer premium leietakere og høyere
                    avkastning.
                  </p>
                </Reveal>
                <ul className="mt-8 space-y-4">
                  {qualities.map((q, i) => (
                    <Reveal key={q} delay={0.12 + i * 0.06} as="li">
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-success-bg inline-flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-success" />
                        </span>
                        <span className="text-[15px] font-medium text-ink">{q}</span>
                      </span>
                    </Reveal>
                  ))}
                </ul>
              </div>

              <Reveal delay={0.1}>
                <div className="grid grid-cols-2 gap-4">
                  {qualityGallery.map((src, i) => (
                    <div key={src} className={`group relative rounded-card overflow-hidden border border-hairline ${i % 3 === 0 ? 'aspect-[4/5]' : 'aspect-[4/4]'}`}>
                      <Image src={src} alt="DigiHome interiør" fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(max-width:1024px) 50vw, 25vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ============ 8. SHOWCASE ============ */}
        <section className="py-20 sm:py-28 bg-fill/50 border-y border-hairline">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <Reveal><Eyebrow className="text-lavender">Porteføljen</Eyebrow></Reveal>
                <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                  Noen av våre eiendommer
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <Link href="/bli-utleier" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:gap-3 transition-all">
                  Få vurdert din eiendom <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {showcase.map((p, i) => (
                <Reveal key={p.area} delay={i * 0.07}>
                  <article className="group rounded-card overflow-hidden bg-surface border border-hairline shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image src={p.image} alt={`Eiendom i ${p.area}`} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width:768px) 100vw, 33vw" />
                      <span className="absolute top-4 left-4 rounded-full bg-white/95 backdrop-blur px-3 py-1 text-xs font-semibold text-ink">{p.type}</span>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-1.5 text-taupe">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">{p.area}</span>
                      </div>
                      <div className="mt-4 flex items-center gap-5 text-sm text-quiet">
                        <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4" />{p.beds}</span>
                        <span className="inline-flex items-center gap-1.5"><Maximize className="h-4 w-4" />{p.size}</span>
                      </div>
                      <p className="mt-5 text-2xl font-bold text-ink">{p.price}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 9. DYNAMISK UTLEIE (10+2) ============ */}
        <section className="py-20 sm:py-28">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <Reveal><Eyebrow className="text-lavender">10+2-modellen</Eyebrow></Reveal>
                <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                  Dynamisk utleie
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-5 text-lg text-quiet leading-relaxed max-w-lg">
                    Vår 10+2-modell kombinerer det beste fra to verdener — og gir deg opptil 40 %
                    høyere årsinntekt enn tradisjonell utleie.
                  </p>
                </Reveal>

                <div className="mt-8 space-y-5">
                  <Reveal delay={0.12}>
                    <div className="rounded-card border border-hairline bg-surface p-6 flex gap-4">
                      <span className="h-11 w-11 shrink-0 rounded-full bg-fill inline-flex items-center justify-center">
                        <Clock className="h-5 w-5 text-ink" />
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-ink">10 måneder langtidsleie</h3>
                        <p className="mt-1 text-[15px] text-quiet leading-relaxed">Stabil inntekt hele året. Annonseres på Finn.no og Hybel.no.</p>
                      </div>
                    </div>
                  </Reveal>
                  <Reveal delay={0.18}>
                    <div className="rounded-card border border-hairline bg-surface p-6 flex gap-4">
                      <span className="h-11 w-11 shrink-0 rounded-full bg-lavender-soft/20 inline-flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-lavender" />
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-ink">2 måneder korttidsutleie</h3>
                        <p className="mt-1 text-[15px] text-quiet leading-relaxed">Premium-priser om sommeren. Annonseres på Airbnb og Booking.</p>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </div>

              {/* Inntektssammenligning */}
              <Reveal delay={0.1}>
                <div className="rounded-panel bg-ink text-white p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold text-white/50">Inntektssammenligning</p>

                  <div className="mt-8 space-y-7">
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-white/70">Kun langtid</span>
                        <span className="text-lg font-semibold">180 000 kr</span>
                      </div>
                      <Bar className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden" barClassName="h-full rounded-full bg-white/40" width="71%" />
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-white">10+2-modellen</span>
                        <span className="text-lg font-bold">252 000 kr</span>
                      </div>
                      <Bar className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden" barClassName="h-full rounded-full bg-lavender-soft" width="100%" delay={0.25} />
                    </div>
                  </div>

                  <div className="mt-9 pt-7 border-t border-white/15 flex items-center justify-between">
                    <span className="text-sm text-white/70">Årlig merinntekt</span>
                    <span className="inline-flex items-center gap-2 text-2xl font-bold text-success-bg">
                      <TrendingUp className="h-6 w-6" />+72 000 kr
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ============ 10. KOMPLETT FORVALTNING MED LOKALE PARTNERE ============ */}
        <section className="py-20 sm:py-28 bg-fill/50 border-y border-hairline">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="max-w-2xl">
              <Reveal><Eyebrow className="text-lavender">Vårt nettverk</Eyebrow></Reveal>
              <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                Komplett forvaltning med lokale partnere
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-5 text-lg text-quiet leading-relaxed">
                  Vi har bygget et nettverk av kvalitetsleverandører i Bergen som sikrer rask respons
                  og profesjonell håndtering av alle behov knyttet til din eiendom.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-success-bg text-success px-4 py-2 text-sm font-semibold">
                  <BadgeCheck className="h-4 w-4" />
                  Én kontaktperson — vi koordinerer alt
                </div>
              </Reveal>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {network.map((n, i) => {
                const Icon = iconMap[n.icon];
                return (
                  <Reveal key={n.name} delay={i * 0.05}>
                    <div className="h-full rounded-card bg-surface border border-hairline p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
                      <span className="h-12 w-12 rounded-full bg-fill inline-flex items-center justify-center">
                        <Icon className="h-5 w-5 text-ink" />
                      </span>
                      <h3 className="mt-5 text-lg font-bold text-ink">{n.name}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-quiet">{n.body}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ 11. HVORFOR EIERE VELGER DIGIHOME ============ */}
        <section className="py-20 sm:py-28">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <Reveal className="order-2 lg:order-1">
                <div className="relative aspect-[4/5] sm:aspect-[3/4] rounded-panel overflow-hidden border border-hairline">
                  <Image src="/bryggen-alley.webp" alt="Bryggen i Bergen" fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
                </div>
              </Reveal>

              <div className="order-1 lg:order-2">
                <Reveal as="h2" className="text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                  Hvorfor eiere velger DigiHome
                </Reveal>
                <div className="mt-9 space-y-7">
                  {reasons.map((r, i) => {
                    const Icon = iconMap[r.icon];
                    return (
                      <Reveal key={r.title} delay={i * 0.06}>
                        <div className="flex gap-4">
                          <span className="mt-0.5 h-11 w-11 shrink-0 rounded-full bg-fill inline-flex items-center justify-center">
                            <Icon className="h-5 w-5 text-lavender" />
                          </span>
                          <div>
                            <h3 className="text-lg font-bold text-ink">{r.title}</h3>
                            <p className="mt-1.5 text-[15px] leading-relaxed text-quiet">{r.body}</p>
                          </div>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 12. OM DIGIHOME (CEO) ============ */}
        <section className="py-20 sm:py-28 bg-ink text-white">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-16 items-center">
              {/* Portrett-plassholder (sarah.webp leveres senere) */}
              <Reveal>
                <div className="relative aspect-[3/4] rounded-panel overflow-hidden border border-white/10 bg-gradient-to-br from-[#2a2540] via-[#1a1828] to-ink">
                  <div className="absolute inset-0 dot-grid opacity-[0.15]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="h-28 w-28 rounded-full border border-white/20 bg-white/5 inline-flex items-center justify-center">
                      <span className="font-heading text-4xl font-bold text-lavender-soft">SS</span>
                    </span>
                    <p className="mt-6 text-lg font-bold text-white">{site.ceo}</p>
                    <p className="mt-1 text-sm text-white/55">{site.ceoTitle}</p>
                  </div>
                  <span className="absolute bottom-4 left-0 right-0 text-center text-[11px] uppercase tracking-[0.2em] text-white/30">Portrett</span>
                </div>
              </Reveal>

              <div>
                <Reveal><Eyebrow className="text-lavender-soft">Om DigiHome</Eyebrow></Reveal>
                <Reveal as="h2" delay={0.05} className="mt-4 text-[32px] sm:text-[44px] font-bold leading-[1.1]">
                  Mennesker og teknologi, hånd i hånd
                </Reveal>

                <Reveal delay={0.1}>
                  <blockquote className="mt-8 text-xl sm:text-2xl font-medium leading-[1.5] text-white/90">
                    <Quote className="h-8 w-8 text-lavender-soft/40 mb-3" />
                    «Vi startet DigiHome i Bergen fordi vi så at utleie var modent for en ny
                    tilnærming. Teknologien gir oss dataene — hvilke måneder som gir best avkastning,
                    når prisene bør justeres, hvordan vi optimaliserer belegg.»
                  </blockquote>
                </Reveal>

                <Reveal delay={0.15}>
                  <p className="mt-6 text-lg leading-[1.6] text-white/70">
                    «Men det er menneskene våre som gjør forskjellen. Et dedikert team som kjenner
                    Bergen og eiendommen din, følger opp leietakere, og behandler hjemmet ditt som
                    sitt eget.»
                  </p>
                </Reveal>

                <Reveal delay={0.2}>
                  <div className="mt-8 pt-6 border-t border-white/15">
                    <p className="font-heading text-2xl text-white" style={{ fontStyle: 'italic' }}>Sarah Sleeman</p>
                    <p className="mt-1 text-sm text-white/55">Daglig leder & eiendomsmegler, DigiHome</p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 13. TESTIMONIALS ============ */}
        <section className="py-20 sm:py-28">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="max-w-2xl">
              <Reveal><Eyebrow className="text-lavender">Tilbakemeldinger</Eyebrow></Reveal>
              <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
                Hva våre eiere sier
              </Reveal>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 0.07}>
                  <figure className="relative h-full rounded-card bg-surface border border-hairline p-8 shadow-[0_8px_30px_rgba(0,0,0,0.05)] flex flex-col transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                    <Quote className="absolute top-7 right-7 h-10 w-10 text-fill" fill="currentColor" strokeWidth={0} />
                    <div className="flex gap-0.5 text-lavender">
                      {[0, 1, 2, 3, 4].map((s) => (
                        <Star key={s} className="h-4 w-4" fill="currentColor" />
                      ))}
                    </div>
                    <blockquote className="mt-5 text-[15px] leading-relaxed text-ink flex-1 relative">“{t.quote}”</blockquote>
                    <figcaption className="mt-6 pt-5 border-t border-hairline flex items-center gap-3">
                      <span className="h-11 w-11 rounded-full bg-fill text-ink font-bold flex items-center justify-center text-sm">
                        {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-bold text-ink">{t.name}</p>
                        <p className="mt-0.5 text-sm text-taupe">{t.role}</p>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============ 14. SAMARBEIDSPARTNERE ============ */}
        <section className="py-16 border-y border-hairline bg-canvas">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <Reveal>
              <p className="text-center text-xs uppercase tracking-[0.2em] font-semibold text-taupe">
                Samarbeidspartnere
              </p>
            </Reveal>
            <Reveal delay={0.05} className="mt-8">
              <PartnerMarquee />
            </Reveal>
          </div>
        </section>

        {/* ============ 15. AVSLUTTENDE CTA ============ */}
        <section className="py-24 sm:py-32">
          <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
            <div className="relative overflow-hidden rounded-panel bg-ink text-white px-8 py-16 sm:px-16 sm:py-24 text-center shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(207,151,252,0.22), transparent 60%)' }} />
              <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.10]" />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-lavender-soft/15 blur-3xl animate-blob" />
              <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-lavender/10 blur-3xl animate-blob" style={{ animationDelay: '5s' }} />

              <div className="relative">
                <Reveal>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-semibold text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Gratis &amp; uforpliktende · Svar innen 24 timer
                  </span>
                </Reveal>
                <Reveal as="h2" delay={0.05} className="mt-6 text-[32px] sm:text-[56px] font-bold leading-[1.06] max-w-3xl mx-auto text-balance">
                  Klar for å la eiendommen jobbe for deg?
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-6 text-lg text-white/65 max-w-xl mx-auto leading-relaxed">
                    Få en gratis vurdering og se nøyaktig hva eiendommen din kan tjene. Ingen
                    forpliktelser.
                  </p>
                </Reveal>
                <Reveal delay={0.16}>
                  <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/bli-utleier" className="rounded-full bg-white text-ink h-[54px] px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition">
                      Få gratis vurdering <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link href="/kontakt" className="rounded-full bg-transparent text-white h-[54px] px-8 inline-flex items-center justify-center text-sm font-semibold border border-white/25 hover:bg-white/10 transition">
                      Kontakt oss
                    </Link>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
