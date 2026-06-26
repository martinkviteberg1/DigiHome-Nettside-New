// Server-komponent: premium lokasjonsside for /utleie/[by].
// Inkluderer BreadcrumbList + RealEstateAgent + FAQPage JSON-LD per lokasjon.
import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site } from '@/lib/site';
import { MapPin, TrendingUp, Home, Sparkles, ShieldCheck, ArrowUpRight, Check } from 'lucide-react';

export default function LocationPage({ loc, related = [] }) {
  const isBydel = loc.type === 'bydel';
  const ctaAddress = isBydel ? `${loc.name}, Bergen` : loc.name;

  const crumbs = [
    { name: 'Hjem', url: site.url + '/' },
    { name: 'Utleie', url: `${site.url}/utleie` },
    ...(isBydel ? [{ name: 'Bergen', url: `${site.url}/utleie/bergen` }] : []),
    { name: loc.name, url: `${site.url}/utleie/${loc.slug}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
      },
      {
        '@type': 'RealEstateAgent',
        '@id': `${site.url}/utleie/${loc.slug}#business`,
        name: `DigiHome — Utleie i ${loc.name}`,
        url: `${site.url}/utleie/${loc.slug}`,
        image: loc.image,
        description: loc.intro,
        telephone: site.phone,
        email: site.email,
        priceRange: site.priceRange,
        areaServed: { '@type': 'Place', name: `${loc.name}${isBydel ? ', Bergen' : ''}` },
        parentOrganization: { '@type': 'Organization', name: site.name, url: site.url },
        geo: { '@type': 'GeoCoordinates', latitude: loc.geo.lat, longitude: loc.geo.lng },
      },
      {
        '@type': 'FAQPage',
        mainEntity: loc.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      {/* HERO */}
      <section className="relative h-[64vh] min-h-[460px] w-full overflow-hidden">
        <img src={loc.image} alt={`Utleie i ${loc.name}`} className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.25) 40%, rgba(10,10,10,0.78) 100%)' }} />
        <div className="relative h-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-end pb-14">
          <nav className="text-[12.5px] text-white/70 mb-4 flex items-center gap-2 flex-wrap">
            {crumbs.map((c, i) => (
              <span key={c.url} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/40">/</span>}
                {i < crumbs.length - 1 ? <Link href={c.url.replace(site.url, '') || '/'} className="hover:text-white transition-colors">{c.name}</Link> : <span className="text-white/90">{c.name}</span>}
              </span>
            ))}
          </nav>
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#d298ff] mb-3">
            <MapPin className="w-3.5 h-3.5" /> {isBydel ? 'Bydel i Bergen' : 'By'}
          </div>
          <h1 className="text-white font-bold tracking-[-0.02em] leading-[1.05] text-[40px] sm:text-[56px] lg:text-[64px] max-w-[16ch]" style={{ fontFamily: 'var(--font-heading)' }}>
            Utleie i {loc.name}
          </h1>
          <p className="text-white/80 text-[17px] sm:text-[19px] mt-4 max-w-[52ch] leading-relaxed">{loc.tagline}</p>
          <div className="mt-7">
            <Link href={`/bli-utleier?address=${encodeURIComponent(ctaAddress)}`} className="group inline-flex items-center gap-2 h-[50px] pl-6 pr-2.5 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[14.5px] font-semibold active:scale-[0.98] transition-transform shadow-[0_12px_32px_-10px_rgba(210,152,255,0.6)]">
              Få gratis verdivurdering
              <span className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* INTRO + MARKED */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] leading-tight mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              Smartere utleie i {loc.name}
            </h2>
            <p className="text-[16.5px] leading-relaxed text-[#444]">{loc.intro}</p>
            <p className="text-[15px] leading-relaxed text-[#666] mt-4"><span className="font-semibold text-[#1f1f1f]">Hvem leier her?</span> {loc.tenantProfile}</p>
          </div>
          <div className="bg-white rounded-3xl p-7 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.10)]">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#999] mb-5">Leiemarkedet i {loc.name}</h3>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f4f0fb] flex items-center justify-center shrink-0"><TrendingUp className="w-4.5 h-4.5 text-[#a463e8]" /></div>
                <div><p className="text-[12px] text-[#999] font-medium">Typisk leiepris</p><p className="text-[17px] font-bold text-[#1f1f1f]">{loc.market.avgRent}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f4f0fb] flex items-center justify-center shrink-0"><Sparkles className="w-4.5 h-4.5 text-[#a463e8]" /></div>
                <div><p className="text-[12px] text-[#999] font-medium">Etterspørsel</p><p className="text-[17px] font-bold text-[#1f1f1f]">{loc.market.demand}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f4f0fb] flex items-center justify-center shrink-0"><Home className="w-4.5 h-4.5 text-[#a463e8]" /></div>
                <div><p className="text-[12px] text-[#999] font-medium">Mest etterspurt</p><p className="text-[15px] font-semibold text-[#1f1f1f]">{loc.market.popularTypes.join(' · ')}</p></div>
              </div>
            </div>
            <p className="text-[13px] text-[#777] leading-relaxed mt-5 pt-5 border-t border-[#f0f0f0]">{loc.market.note}</p>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
          <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] mb-10 max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>
            Hvorfor DigiHome i {loc.name}?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {loc.highlights.map((h) => (
              <div key={h.title} className="bg-white/[0.04] rounded-2xl p-7">
                <div className="w-10 h-10 rounded-full bg-[#d298ff]/15 flex items-center justify-center mb-4"><Check className="w-5 h-5 text-[#d298ff]" /></div>
                <h3 className="text-[17px] font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{h.title}</h3>
                <p className="text-[14.5px] text-white/60 leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[900px] mx-auto px-6 sm:px-10 py-16 lg:py-20">
        <h2 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] mb-8 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
          Vanlige spørsmål om utleie i {loc.name}
        </h2>
        <div className="space-y-4">
          {loc.faq.map((f) => (
            <div key={f.q} className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)]">
              <h3 className="text-[16px] font-semibold text-[#1f1f1f] mb-2">{f.q}</h3>
              <p className="text-[14.5px] text-[#555] leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-16">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Andre områder i Bergen</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/utleie/${r.slug}`} className="group relative h-40 rounded-2xl overflow-hidden">
                <img src={r.image} alt={r.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(10,10,10,0.75) 100%)' }} />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="text-white font-semibold text-[16px]">{r.name}</span>
                  <ArrowUpRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20 text-center">
          <h2 className="text-[28px] sm:text-[38px] font-bold tracking-[-0.02em] mb-4 max-w-[22ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>
            Eier du en bolig i {loc.name}?
          </h2>
          <p className="text-white/70 text-[16px] max-w-[48ch] mx-auto mb-8">Få en gratis, uforpliktende verdivurdering av utleiepotensialet. Ingen oppstartskostnader, ingen bindingstid.</p>
          <Link href={`/bli-utleier?address=${encodeURIComponent(ctaAddress)}`} className="group inline-flex items-center gap-2 h-[52px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">
            Kom i gang
            <span className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
