import { notFound } from 'next/navigation';
import Link from 'next/link';
import { marked } from 'marked';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { getPostBySlug } from '@/lib/posts';
import { site } from '@/lib/site';
import { ArrowUpRight, ArrowLeft, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
}

export async function generateMetadata({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: 'Ikke funnet | DigiHome', robots: { index: false } };
  const title = (post.seoTitle || post.title) + ' | DigiHome';
  const desc = (post.seoDescription || post.excerpt || '').slice(0, 160);
  return {
    title,
    description: desc,
    alternates: { canonical: `/nyheter/${post.slug}` },
    openGraph: {
      title, description: desc, url: `${site.url}/nyheter/${post.slug}`,
      type: 'article', locale: 'nb_NO',
      publishedTime: post.publishedAt, modifiedTime: post.updatedAt,
      images: post.coverImage ? [{ url: post.coverImage }] : [{ url: site.url + site.ogImage }],
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: post.coverImage ? [post.coverImage] : undefined },
  };
}

const ARTICLE_CLS = [
  '[&>h2]:[font-family:var(--font-heading)] [&>h2]:text-[24px] sm:[&>h2]:text-[28px] [&>h2]:font-bold [&>h2]:tracking-[-0.015em] [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:text-[#1f1f1f]',
  '[&>h3]:[font-family:var(--font-heading)] [&>h3]:text-[19px] sm:[&>h3]:text-[21px] [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:text-[#1f1f1f]',
  '[&>p]:text-[17px] [&>p]:leading-[1.78] [&>p]:text-[#3a3a3a] [&>p]:mb-6',
  '[&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-6 [&>ul]:text-[#3a3a3a] [&>ul]:text-[16.5px] [&>ul>li]:mb-2 [&>ul>li]:leading-relaxed',
  '[&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-6 [&>ol]:text-[#3a3a3a] [&>ol]:text-[16.5px] [&>ol>li]:mb-2',
  '[&_a]:text-[#a463e8] [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-[#1f1f1f]',
  '[&>blockquote]:border-l-2 [&>blockquote]:border-[#d298ff] [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-[#555] [&>blockquote]:my-6',
].join(' ');

export default async function ArticlePage({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const html = marked.parse(post.content || '', { breaks: true, mangle: false, headerIds: false });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Hjem', item: site.url + '/' },
          { '@type': 'ListItem', position: 2, name: 'Nyheter', item: site.url + '/nyheter' },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${site.url}/nyheter/${post.slug}` },
        ],
      },
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: post.coverImage || site.url + site.ogImage,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        author: { '@type': 'Organization', name: post.author || site.name, url: site.url },
        publisher: { '@type': 'Organization', name: site.name, url: site.url, logo: { '@type': 'ImageObject', url: `${site.url}/digihome-mark.svg` } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${site.url}/nyheter/${post.slug}` },
        keywords: (post.tags || []).join(', '),
        inLanguage: 'nb-NO',
      },
    ],
  };

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="pt-[72px]">
        {/* HERO */}
        <article>
          <header className="max-w-[820px] mx-auto px-6 sm:px-8 pt-14 lg:pt-16">
            <Link href="/nyheter" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#888] hover:text-[#1f1f1f] transition-colors mb-7"><ArrowLeft className="w-4 h-4" /> Alle artikler</Link>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              {(post.tags || []).map((t) => (
                <Link key={t} href={`/nyheter?tag=${encodeURIComponent(t)}`} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a463e8] bg-[#f4f0fb] px-2.5 py-1 rounded-full hover:bg-[#ece3fb] transition-colors">{t}</Link>
              ))}
              <span className="inline-flex items-center gap-1.5 text-[13px] text-[#999]"><Calendar className="w-3.5 h-3.5" /> {fmtDate(post.publishedAt)}</span>
            </div>
            <h1 className="text-[34px] sm:text-[46px] font-bold tracking-[-0.025em] leading-[1.08] text-[#1f1f1f]" style={{ fontFamily: 'var(--font-heading)' }}>{post.title}</h1>
            {post.excerpt && <p className="text-[18px] sm:text-[20px] text-[#555] mt-5 leading-relaxed">{post.excerpt}</p>}
            <p className="text-[13px] text-[#aaa] mt-6">Av {post.author || 'DigiHome'}</p>
          </header>

          {post.coverImage && (
            <div className="max-w-[1100px] mx-auto px-6 mt-10">
              <div className="rounded-3xl overflow-hidden h-[300px] sm:h-[460px]">
                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
              </div>
            </div>
          )}

          <div className={`max-w-[820px] mx-auto px-6 sm:px-8 py-12 lg:py-16 ${ARTICLE_CLS}`} dangerouslySetInnerHTML={{ __html: html }} />
        </article>

        {/* CTA */}
        <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 text-center">
            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.02em] mb-4 max-w-[24ch] mx-auto" style={{ fontFamily: 'var(--font-heading)' }}>Vil du tjene mer på utleie?</h2>
            <p className="text-white/70 text-[16px] max-w-[46ch] mx-auto mb-8">Få en gratis verdivurdering av utleiepotensialet ditt. Ingen oppstartskostnader, ingen bindingstid.</p>
            <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[52px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15px] font-semibold active:scale-[0.98] transition-transform">
              Kom i gang
              <span className="inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
