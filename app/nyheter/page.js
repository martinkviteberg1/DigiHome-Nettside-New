import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { getPublishedPosts } from '@/lib/posts';
import { site } from '@/lib/site';
import { ArrowUpRight, Newspaper } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Nyheter & guider om utleie | DigiHome',
  description:
    'Artikler, guider og råd om utleie, eiendomsforvaltning, skatt og leiemarkedet i Bergen og Norge — fra DigiHome.',
  alternates: { canonical: '/nyheter' },
  openGraph: {
    title: 'Nyheter & guider om utleie | DigiHome',
    description: 'Artikler, guider og råd om utleie og eiendomsforvaltning fra DigiHome.',
    url: `${site.url}/nyheter`, type: 'website', locale: 'nb_NO',
    images: [{ url: site.url + site.ogImage }],
  },
};

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
}

export default async function NyheterIndex() {
  const posts = await getPublishedPosts(60);
  const [featured, ...rest] = posts;

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />
      <main className="pt-[72px]">
        <section className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-16 lg:pt-20 pb-10">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a463e8] mb-4"><Newspaper className="w-3.5 h-3.5" /> Nyheter & guider</div>
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
              <p className="text-[16px] text-[#999]">Ingen artikler er publisert ennå. Kom snart tilbake.</p>
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
                        {(p.tags || []).slice(0, 1).map((t) => <span key={t} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a463e8]">{t}</span>)}
                        <span className="text-[12px] text-[#aaa]">{fmtDate(p.publishedAt)}</span>
                      </div>
                      <h3 className="text-[18px] font-bold text-[#1f1f1f] tracking-[-0.01em] leading-snug group-hover:text-[#a463e8] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{p.title}</h3>
                      <p className="text-[14px] text-[#666] mt-2 leading-relaxed line-clamp-3">{p.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
