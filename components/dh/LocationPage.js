// Server-komponent: verdensklasse, datadrevet lokasjonsside for /utleie/[by].
// Beriket med live SSB-leiepriser + DigiHome Etterspørselsindeks. Responsive
// bilder (srcset/sizes) og 100 % server-rendret (ingen klient-JS) for topp
// mobil-ytelse (Lighthouse). JSON-LD: BreadcrumbList + RealEstateAgent + FAQPage.
import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { site } from '@/lib/site';
import {
  MapPin, TrendingUp, Home, Sparkles, ArrowUpRight, Check,
  BarChart3, Database, Activity,
} from 'lucide-react';

const nf = (n) => (n == null ? '–' : Number(n).toLocaleString('nb-NO'));

// Bygg responsiv srcset fra en Unsplash/Pexels-URL (bytter w=NNNN).
function srcSet(url) {
  if (!url || !/w=\d+/.test(url)) return undefined;
  return [480, 768, 1024, 1400, 1920].map((w) => `${url.replace(/w=\d+/, 'w=' + w)} ${w}w`).join(', ');
}
function sized(url, w) {
  return url && /w=\d+/.test(url) ? url.replace(/w=\d+/, 'w=' + w) : url;
}

const levelTone = (level) => {
  if (level === 'Svært høy') return { bg: 'bg-[#e9d7fb]', text: 'text-[#6b21a8]', bar: '#a463e8' };
  if (level === 'Høy') return { bg: 'bg-[#dceafd]', text: 'text-[#1e40af]', bar: '#3b82f6' };
  if (level === 'Moderat til høy') return { bg: 'bg-[#e5f3e8]', text: 'text-[#166534]', bar: '#22c55e' };
  return { bg: 'bg-[#f1f0ee]', text: 'text-[#555]', bar: '#9ca3af' };
};

export default function LocationPage({ loc, related = [], rent = null }) {
  const isBydel = loc.type === 'bydel';
  const ctaAddress = isBydel ? `${loc.name}, Bergen` : loc.name;
  const area = rent?.area || null; // bydel-spesifikk etterspørsel
  const demandIndex = area?.index ?? rent?.cityIndex ?? null;
  const demandLevel = area?.level ?? rent?.cityLevel ?? loc.market?.demand ?? null;

  const crumbs = [
    { name: 'Hjem', url: site.url + '/' },
    { name: 'Utleie', url: `${site.url}/utleie` },
    ...(isBydel ? [{ name: 'Bergen', url: `${site.url}/utleie/bergen` }] : []),
    { name: loc.name, url: `${site.url}/utleie/${loc.slug}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) },
      {
        '@type': 'RealEstateAgent',
        '@id': `${site.url}/utleie/${loc.slug}#business`,
        name: `DigiHome — Utleie i ${loc.name}`,
        url: `${site.url}/utleie/${loc.slug}`,
        image: loc.image, description: loc.intro,
        telephone: site.phone, email: site.email, priceRange: site.priceRange,
        areaServed: { '@type': 'Place', name: `${loc.name}${isBydel ? ', Bergen' : ''}` },
        parentOrganization: { '@type': 'Organization', name: site.name, url: site.url },
        geo: { '@type': 'GeoCoordinates', latitude: loc.geo.lat, longitude: loc.geo.lng },
      },
      { '@type': 'FAQPage', mainEntity: loc.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  };

  const maxRoom = rent ? Math.max(...rent.byRoom.map((b) => b.current || 0), 1) : 1;
  const two = rent?.byRoom?.find((b) => b.roomKey === '2');

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      {/* HERO */}
      <section className="relative min-h-[72vh] sm:h-[78vh] w-full overflow-hidden flex items-end">
        <img
          src={sized(loc.image, 1600)} srcSet={srcSet(loc.image)} sizes="100vw"
          alt={`Utleie i ${loc.name}`} className="absolute inset-0 w-full h-full object-cover"
          width={1600} height={1067} loading="eager" fetchPriority="high" decoding="async"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,8,12,0.42) 0%, rgba(8,8,12,0.28) 38%, rgba(8,8,12,0.9) 100%)' }} />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-12 sm:pb-16 pt-32">
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
          <h1 className="text-white font-bold tracking-[-0.025em] leading-[1.03] text-[40px] sm:text-[58px] lg:text-[68px] max-w-[16ch]" style={{ fontFamily: 'var(--font-heading)' }}>
            Utleie i {loc.name}
          </h1>
          <p className="text-white/80 text-[16px] sm:text-[19px] mt-4 max-w-[52ch] leading-relaxed">{loc.tagline}</p>

          {/* Stat-chips */}
          <div className="mt-7 flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/55 font-semibold">Typisk leie</p>
              <p className="text-white text-[17px] font-bold mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{loc.market.avgRent}</p>
            </div>
            {demandIndex != null && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-white/55 font-semibold">Etterspørsel</p>
                <p className="text-white text-[17px] font-bold mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{demandLevel} · {demandIndex}/100</p>
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/55 font-semibold">Mest etterspurt</p>
              <p className="text-white text-[15px] font-semibold mt-0.5">{loc.market.popularTypes.join(' · ')}</p>
            </div>
          </div>

          <div className="mt-7">
            <Link href={`/bli-utleier?address=${encodeURIComponent(ctaAddress)}`} className="group inline-flex items-center gap-2 h-[50px] pl-6 pr-2.5 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[14.5px] font-semibold active:scale-[0.98] transition-transform shadow-[0_12px_32px_-10px_rgba(210,152,255,0.6)]">
              Få gratis verdivurdering
              <span className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* INTRO + MARKED */}
      <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-16 items-start">
          <div>
            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] leading-tight mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              Smartere utleie i {loc.name}
            </h2>
            <p className="text-[16.5px] leading-relaxed text-[#444]">{loc.intro}</p>
            <div className="mt-6 pl-5 border-l-2 border-[#e9d7fb]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#a463e8] mb-1">Hvem leier her?</p>
              <p className="text-[15.5px] leading-relaxed text-[#555]">{loc.tenantProfile}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-7 shadow-[0_14px_50px_-22px_rgba(0,0,0,0.16)]">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#999] mb-5">Leiemarkedet i {loc.name}</h3>
            <div className="space-y-5">
              <Stat icon={TrendingUp} label="Typisk leiepris" value={loc.market.avgRent} />
              <Stat icon={Sparkles} label="Etterspørsel" value={demandLevel || loc.market.demand} />
              <Stat icon={Home} label="Mest etterspurt" value={loc.market.popularTypes.join(' · ')} small />
            </div>
            <p className="text-[13px] text-[#777] leading-relaxed mt-5 pt-5 border-t border-[#f0f0f0]">{loc.market.note}</p>
          </div>
        </div>
      </section>

      {/* LIVE LEIEMARKEDSDATA (SSB) */}
      {rent && two?.current && (
        <section className="bg-[#f6f4f1]">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-start">
              <div>
                <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-3"><BarChart3 className="w-3.5 h-3.5" /> Leiepriser · {rent.year}</div>
                <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] leading-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  Hva koster det å leie i {isBydel ? 'Bergen' : loc.name}?
                </h2>
                <p className="text-[15.5px] leading-relaxed text-[#555] mb-5">
                  En 2-roms leies i snitt for <b className="text-[#1f1f1f]">{nf(two.current)} kr/mnd</b>
                  {two.yoyPct != null && <> ({two.yoyPct >= 0 ? '+' : ''}{two.yoyPct} % fra {rent.prevYear})</>}.
                  {isBydel && ' Tallene gjelder Bergen kommune samlet.'}
                </p>
                <Link href="/leiemarkedet/bergen" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#a463e8] hover:gap-2.5 transition-all">
                  Se hele leiemarkedsrapporten <ArrowUpRight className="w-4 h-4" />
                </Link>
                <p className="text-[12px] text-[#aaa] mt-5 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Kilde: Statistisk sentralbyrå (SSB)</p>
              </div>
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_14px_50px_-22px_rgba(0,0,0,0.16)]">
                <div className="space-y-3.5">
                  {rent.byRoom.filter((b) => b.current).map((b) => (
                    <div key={b.roomKey} className="flex items-center gap-3 sm:gap-4">
                      <span className="w-[64px] sm:w-[80px] shrink-0 text-[13.5px] font-semibold text-[#1f1f1f]">{b.label}</span>
                      <div className="flex-1 h-9 sm:h-10 rounded-lg bg-[#f5f3f0] overflow-hidden">
                        <div className="h-full rounded-lg flex items-center justify-end pr-3" style={{ width: `${Math.max(22, (b.current / maxRoom) * 100)}%`, background: 'linear-gradient(90deg, #b681ee, #a463e8)' }}>
                          <span className="text-white font-bold text-[13.5px] sm:text-[15px]" style={{ fontFamily: 'var(--font-heading)' }}>{nf(b.current)}</span>
                        </div>
                      </div>
                      <span className="w-[52px] shrink-0 text-right text-[12px] font-semibold">
                        {b.yoyPct != null && <span className={b.yoyPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{b.yoyPct >= 0 ? '+' : ''}{b.yoyPct}%</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ETTERSPØRSELSINDEKS / KONTEKST */}
      {rent?.topAreas?.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-3"><Activity className="w-3.5 h-3.5" /> DigiHome Etterspørselsindeks</div>
          <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] leading-tight mb-3 max-w-[24ch]" style={{ fontFamily: 'var(--font-heading)' }}>
            {isBydel ? `Slik ligger ${loc.name} an mot resten av Bergen` : 'Hvor er etterspørselen størst i Bergen?'}
          </h2>
          <p className="text-[#666] text-[15px] max-w-[58ch] mb-10">Indeksen kombinerer prissoner, faktisk leietakerinteresse og DigiHomes forvaltningsdata.</p>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-3 max-w-[1000px]">
            {rent.topAreas.map((a) => {
              const at = levelTone(a.level);
              const isCurrent = a.slug === loc.slug;
              return (
                <Link key={a.slug} href={`/utleie/${a.slug}`} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${isCurrent ? 'bg-[#f4f0fb]' : 'hover:bg-[#f7f6f4]'}`}>
                  <span className={`w-[120px] shrink-0 text-[14px] font-semibold ${isCurrent ? 'text-[#a463e8]' : 'text-[#1f1f1f]'}`}>{a.area}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#eeecf0] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${a.index}%`, background: at.bar }} />
                  </div>
                  <span className="w-8 text-right text-[13px] font-bold text-[#666]">{a.index}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* HIGHLIGHTS */}
      <section className="bg-[#0a0a0a] text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24">
          <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] mb-10 max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>
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
      <section className="max-w-[900px] mx-auto px-6 sm:px-10 py-16 lg:py-24">
        <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] mb-8 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
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
              <Link key={r.slug} href={`/utleie/${r.slug}`} className="group relative h-44 rounded-2xl overflow-hidden">
                <img src={sized(r.image, 768)} srcSet={srcSet(r.image)} sizes="(max-width: 640px) 100vw, 33vw" alt={r.name} width={768} height={512} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
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
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24 text-center">
          <h2 className="text-[28px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4 max-w-[22ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>
            Eier du en bolig i {loc.name}?
          </h2>
          <p className="text-white/70 text-[16px] max-w-[48ch] mx-auto mb-8">Få en gratis, uforpliktende verdivurdering av utleiepotensialet. Ingen oppstartskostnader, ingen bindingstid.</p>
          <Link href={`/bli-utleier?address=${encodeURIComponent(ctaAddress)}`} className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">
            Kom i gang
            <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, label, value, small }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#f4f0fb] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#a463e8]" /></div>
      <div><p className="text-[12px] text-[#999] font-medium">{label}</p><p className={`${small ? 'text-[15px]' : 'text-[17px]'} font-bold text-[#1f1f1f]`}>{value}</p></div>
    </div>
  );
}
