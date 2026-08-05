import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { getPublishedPosts } from '@/lib/posts';
import { guides, REDIRECTED_POST_SLUGS } from '@/lib/guides';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, itemListLd, stripMarkup } from '@/lib/seo';
import { site } from '@/lib/site';
import { ArrowUpRight, Newspaper } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Nyheter og innsikt om utleie i Bergen',
  description:
    'Artikler og analyser om utleie, eiendomsforvaltning og leiemarkedet i Bergen — skrevet for boligeiere. Grundige guider ligger samlet under Guider.',
  alternates: { canonical: '/nyheter' },
  openGraph: {
    title: 'Nyheter og innsikt om utleie i Bergen | DigiHome',
    description: 'Artikler og analyser om utleie og eiendomsforvaltning fra DigiHome.',
    url: `${site.url}/nyheter`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nyheter og innsikt om utleie i Bergen | DigiHome',
    description: 'Artikler og analyser om utleie og eiendomsforvaltning fra DigiHome.',
    images: [site.url + site.ogImage],
  },
};

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
}

export default async function NyheterIndex() {
  const all = await getPublishedPosts(60);
  // Artikler som er konsolidert (301) inn i en guide vises ikke i oversikten —
  // ellers lenker vi internt til en URL som redirigerer.
  const posts = all.filter((p) => !REDIRECTED_POST_SLUGS[p.slug]);
  const [featured, ...rest] = posts;

  // CollectionPage + ItemList: gjør artikkeloversikten maskinlesbar for
  // Google (rich results) og AI-crawlere (AEO).
  const collectionLd = itemListLd({
    name: 'Nyheter og innsikt om utleie i Bergen',
    description: 'Artikler og analyser om utleie, skatt, kontrakter og leiemarkedet i Bergen og Norge.',
    path: '/nyheter',
    items: posts.map((p) => ({ name: p.title, path: `/nyheter/${p.slug}` })),
  });

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <JsonLd data={collectionLd} />
      <JsonLd data={breadcrumbLd([{ name: 'Nyheter', path: '/nyheter' }])} />
      <Header />
      <main className="pt-[72px]">
        <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-16 lg:pt-20 pb-10">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9b6cc4] mb-4"><Newspaper className="w-3.5 h-3.5" /> Nyheter & guider</div>
          <h1 className="text-[40px] sm:text-[54px] lg:text-[60px] font-bold tracking-[-0.025em] leading-[1.04] max-w-[20ch]" style={{ fontFamily: 'var(--font-heading)' }}>
            Innsikt om utleie og eiendom
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[#555] mt-5 max-w-[58ch] leading-relaxed">
            Praktiske guider og råd om utleie, skatt, kontrakter og leiemarkedet — skrevet for boligeiere og leietakere i Bergen og Norge.
          </p>
        </section>

        {posts.length === 0 ? (
          <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-24">
            <div className="bg-white rounded-3xl p-16 text-center shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
              <p className="text-[16px] text-[#716b63]">Ingen artikler er publisert ennå. Kom snart tilbake.</p>
            </div>
          </section>
        ) : (
          <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-24">
            {featured && (
              <Link href={`/nyheter/${featured.slug}`} className="group block relative rounded-3xl overflow-hidden mb-8 h-[380px] sm:h-[440px]">
                {featured.coverImage
                  ? <img src={featured.coverImage} alt={featured.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[800ms]" />
                  : <div className="absolute inset-0 bg-gradient-to-br from-[#1a1430] to-[#0a0a0a]" />}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0.10) 0%, rgba(10,10,10,0.30) 45%, rgba(10,10,10,0.85) 100%)' }} />
                <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end max-w-[800px]">
                  <div className="flex items-center gap-2 mb-3">
                    {(featured.tags || []).slice(0, 2).map((t) => <span key={t} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#d298ff] bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">{t}</span>)}
                    <span className="text-[12px] text-white/60">{fmtDate(featured.publishedAt)}</span>
                  </div>
                  <h2 className="text-white font-bold text-[28px] sm:text-[38px] tracking-[-0.02em] leading-[1.1]" style={{ fontFamily: 'var(--font-heading)' }}>{featured.title}</h2>
                  <p className="text-white/75 text-[15px] sm:text-[16px] mt-3 max-w-[56ch] leading-relaxed">{featured.excerpt}</p>
                  <span className="inline-flex items-center gap-1.5 text-white text-[14px] font-semibold mt-5 group-hover:gap-2.5 transition-all">Les artikkelen <ArrowUpRight className="w-4 h-4" /></span>
                </div>
              </Link>
            )}
            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((p) => (
                  <Link key={p.id} href={`/nyheter/${p.slug}`} className="group bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_-14px_rgba(0,0,0,0.10)] hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.16)] transition-shadow">
                    <div className="relative h-[180px] overflow-hidden bg-[#f2eefb]">
                      {p.coverImage
                        ? <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-[700ms]" loading="lazy" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#1a1430] to-[#0a0a0a]" />}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        {(p.tags || []).slice(0, 1).map((t) => <span key={t} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9b6cc4]">{t}</span>)}
                        <span className="text-[12px] text-[#78726a]">{fmtDate(p.publishedAt)}</span>
                      </div>
                      <h3 className="text-[18px] font-bold text-[#1f1f1f] tracking-[-0.01em] leading-snug group-hover:text-[#9b6cc4] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{p.title}</h3>
                      <p className="text-[14px] text-[#666] mt-2 leading-relaxed line-clamp-3">{p.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Evergreen guider — interne lenker + innholdsdybde på oversikten.
            Manglet tidligere container/padding, så seksjonen lå kant i kant. */}
        <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-20 lg:pb-28">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Guider for utleiere</h2>
              <p className="text-[14.5px] text-[#666] mt-1">Grundige, tidløse guider om provisjon, depositum, skatt og regelverk — {guides.length} i alt.</p>
            </div>
            <Link href="/guider" className="hidden sm:inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7c3aed] hover:underline shrink-0">Alle guider <ArrowUpRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {guides.slice(0, 6).map((g) => (
              <Link key={g.slug} href={`/guider/${g.slug}`} className="group bg-white rounded-2xl p-5 shadow-[0_4px_24px_-14px_rgba(0,0,0,0.10)] hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.16)] transition-shadow">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-[#f4f0fb] text-[#7c3aed] text-[11px] font-semibold mb-3">{g.category}</span>
                <h3 className="text-[15.5px] font-bold leading-snug group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h3>
                <p className="text-[13px] text-[#666] mt-2 leading-relaxed line-clamp-2">{stripMarkup(g.description)}</p>
                <p className="text-[12.5px] text-[#716b63] mt-2.5">{g.readMinutes} min lesetid</p>
              </Link>
            ))}
          </div>
          <Link href="/guider" className="sm:hidden inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7c3aed] mt-6">Alle guider <ArrowUpRight className="w-4 h-4" /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
