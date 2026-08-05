import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import ReadingProgress from '@/components/site/ReadingProgress';
import ArticleToc from '@/components/site/ArticleToc';
import ArticleShare from '@/components/site/ArticleShare';
import { getPostBySlug } from '@/lib/posts';
import { guides } from '@/lib/guides';
import { site } from '@/lib/site';
import { getAuthorForPost } from '@/lib/authors';
import { buildArticle, readingTime } from '@/lib/markdown';
import { ArrowUpRight, ArrowLeft, Clock, RefreshCw, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Velger de guidene som er mest relevante for artikkelen, basert på
// overlapp mellom artikkelens tags og guidens kategori/nøkkelord.
// Faller tilbake til de tre mest kommersielle guidene.
function relatedGuidesForPost(post) {
  const tags = (post?.tags || []).map((t) => String(t).toLowerCase());
  if (!tags.length) return guides.slice(0, 3);
  const scored = guides.map((g) => {
    const haystack = [g.category, ...(g.keywords || []), g.title].join(' ').toLowerCase();
    const score = tags.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
    return { g, score };
  });
  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.g);
  const rest = guides.filter((g) => !hits.includes(g));
  return [...hits, ...rest].slice(0, 3);
}

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
}

export async function generateMetadata({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: 'Ikke funnet', robots: { index: false } };
  // Strip evt. innbakt «| DigiHome» fra seoTitle i DB — layout-templaten
  // (`%s | DigiHome`) legger til merkenavnet, ellers blir det dobbelt/trippelt.
  const baseTitle = String(post.seoTitle || post.title).replace(/(\s*[|—-]\s*DigiHome)+\s*$/i, '').trim();
  const title = baseTitle; // template gir «… | DigiHome» i <title>
  const ogTitle = `${baseTitle} | DigiHome`; // og:title bruker ikke templaten
  const desc = (post.seoDescription || post.excerpt || '').slice(0, 160);
  return {
    title,
    description: desc,
    alternates: { canonical: `/nyheter/${post.slug}` },
    openGraph: {
      title: ogTitle, description: desc, url: `${site.url}/nyheter/${post.slug}`,
      type: 'article', locale: 'nb_NO',
      publishedTime: post.publishedAt, modifiedTime: post.updatedAt,
      images: post.coverImage ? [{ url: post.coverImage }] : [{ url: site.url + site.ogImage }],
    },
    twitter: { card: 'summary_large_image', title: ogTitle, description: desc, images: post.coverImage ? [post.coverImage] : undefined },
  };
}

// Brødtekststilene ligger i .dh-prose i globals.css. Markdown-output kan
// ikke stiles med Tailwind-klasser per element, og en lang [&>h2]-kjede ble
// uleselig og umulig å holde konsistent på tvers av breakpoints.

export default async function ArticlePage({ params }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  // Brødteksten får H2-ankere, tabell-wrapper og trygge eksterne lenker.
  const { html, headings } = buildArticle(post.content);
  const { minutes, words } = readingTime(post.content);
  const author = getAuthorForPost(post);
  const guideSuggestions = relatedGuidesForPost(post);
  const updated = post.updatedAt && post.publishedAt
    && new Date(post.updatedAt).toDateString() !== new Date(post.publishedAt).toDateString()
    ? post.updatedAt : null;

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
        '@id': `${site.url}/nyheter/${post.slug}#article`,
        headline: post.title,
        description: post.excerpt,
        abstract: post.excerpt,
        image: post.coverImage || site.url + site.ogImage,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        url: `${site.url}/nyheter/${post.slug}`,
        // AEO: peker AI-motorer og talesøk mot tittel + «Kort fortalt»-boksen.
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.dh-answer'] },
        wordCount: String(post.content || '').split(/\s+/).filter(Boolean).length,
        ...(post.tags?.length ? { articleSection: post.tags[0] } : {}),
        isPartOf: { '@type': 'Blog', '@id': `${site.url}/nyheter`, name: 'DigiHome nyheter' },
        author: {
          '@type': 'Person',
          name: author.name,
          jobTitle: author.role,
          url: author.url,
          worksFor: { '@type': 'Organization', name: site.name, url: site.url },
          sameAs: author.sameAs,
        },
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
      <ReadingProgress />
      <Header />
      <main className="pt-[72px]">
        <article>
          {/* ── HERO ──────────────────────────────────────────────────────
              Tekst først, bilde etter. Tidligere lå coverbildet rett under
              tittelen i 460px høyde, slik at ingen brødtekst var synlig over
              folden på en vanlig laptop. Nå møter leseren tittel, ingress og
              byline umiddelbart. */}
          <header className="max-w-[1080px] mx-auto px-6 sm:px-8 lg:px-10 pt-9 lg:pt-12">
            <Link href="/nyheter" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b665f] hover:text-[#1f1f1f] transition-colors mb-6 min-h-[44px] sm:min-h-0 -my-2 sm:my-0 py-2 sm:py-0">
              <ArrowLeft className="w-4 h-4" /> Alle artikler
            </Link>

            <div className="max-w-[760px]">
              {(post.tags || []).length > 0 && (
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  {post.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/nyheter?tag=${encodeURIComponent(t)}`}
                      className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#6d28d9] bg-[#f2ecfd] px-3 py-1.5 rounded-full hover:bg-[#e7dcfb] transition-colors"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              )}

              <h1
                className="font-bold text-[#141414] tracking-[-0.03em] leading-[1.06] text-[clamp(2.05rem,1.15rem+3.1vw,3.3rem)] text-balance"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {post.title}
              </h1>

              {/* Ingress som redaksjonell løpetekst, ikke som boks.
                  .dh-answer er speakable-målet i BlogPosting-schemaet. */}
              {post.excerpt && (
                <p className="dh-answer faq-answer mt-6 text-[18px] sm:text-[19.5px] leading-[1.62] text-[#55504a]">
                  {post.excerpt}
                </p>
              )}
            </div>

            {/* Byline + metadata + deling */}
            <div className="mt-8 pt-6 border-t border-black/[0.07] flex flex-wrap items-center gap-x-5 gap-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
                  style={{ background: author.accent, fontFamily: 'var(--font-heading)' }}
                >
                  {author.initials}
                </div>
                <div className="leading-tight">
                  <p className="text-[14.5px] font-semibold text-[#1f1f1f]">{author.name}</p>
                  <p className="text-[12.5px] text-[#6b665f] mt-0.5">{author.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[13px] text-[#6b665f]">
                <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{minutes} min</span>
                {updated && (
                  <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Oppdatert {fmtDate(updated)}</span>
                )}
              </div>

              <div className="sm:ml-auto">
                <ArticleShare title={post.title} />
              </div>
            </div>
          </header>

          {/* ── COVER ─────────────────────────────────────────────────────
              4/3 på mobil (høyt bilde stjeler mindre plass når skjermen er
              smal), 21/9 fra sm og opp med hard maks-høyde slik at bildet
              aldri skyver brødteksten ut av synsfeltet. */}
          {post.coverImage && (
            <figure className="max-w-[1080px] mx-auto px-6 sm:px-8 lg:px-10 mt-9 lg:mt-11">
              <div className="rounded-[20px] overflow-hidden bg-[#f1efec] aspect-[4/3] sm:aspect-[21/9] sm:max-h-[400px]">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </figure>
          )}

          {/* ── BRØDTEKST ─────────────────────────────────────────────────
              xl: to kolonner der sidestolpen holder innholdsfortegnelsen
              sticky. Under xl kollapser den til <details> over teksten.
              Lesebredden er låst til 68ch (~68 tegn per linje) — den gamle
              malen ga rundt 100 tegn, godt over det som er behagelig. */}
          <div className="max-w-[1080px] mx-auto px-6 sm:px-8 lg:px-10 pt-11 lg:pt-14 pb-4">
            <div className="xl:grid xl:grid-cols-[minmax(0,660px)_1fr] xl:gap-14">
              <div className="min-w-0">
                <ArticleToc headings={headings} variant="inline" />
                <div className="dh-prose max-w-[68ch] xl:max-w-none" dangerouslySetInnerHTML={{ __html: html }} />

                {/* Bunnlinje: tags + deling, der leseren faktisk er ferdig */}
                <div className="max-w-[68ch] xl:max-w-none mt-12 pt-7 border-t border-black/[0.07] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(post.tags || []).map((t) => (
                      <Link
                        key={t}
                        href={`/nyheter?tag=${encodeURIComponent(t)}`}
                        className="text-[12.5px] font-medium text-[#6d28d9] bg-[#f2ecfd] px-3 py-1.5 rounded-full hover:bg-[#e7dcfb] transition-colors"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                  <ArticleShare title={post.title} compact />
                </div>

                {/* Forfatterkort — E-E-A-T: navngitt person med rolle og bio */}
                <div className="max-w-[68ch] xl:max-w-none mt-9 rounded-2xl bg-white border border-black/[0.06] p-6 flex gap-5">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[17px] font-bold shrink-0"
                    style={{ background: author.accent, fontFamily: 'var(--font-heading)' }}
                  >
                    {author.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6f6a64] mb-1.5">Skrevet av</p>
                    <p className="text-[16px] font-bold text-[#1f1f1f]" style={{ fontFamily: 'var(--font-heading)' }}>{author.name}</p>
                    <p className="text-[13px] text-[#6b665f] mt-0.5">{author.role}</p>
                    {author.bio && <p className="text-[14px] leading-[1.7] text-[#55504a] mt-3">{author.bio}</p>}
                    <Link href="/om-oss" className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#7c3aed] mt-3 hover:underline">
                      Om teamet <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              <aside className="hidden xl:block max-w-[240px]">
                <ArticleToc headings={headings} variant="rail" />
              </aside>
            </div>
          </div>
        </article>

        {/* Interne lenker fra artikkel → guider. Guidene er de sidene som
            faktisk rangerer (73 % av visningene), så artiklene skal sende
            både lesere og lenkekraft dit. */}
        {guideSuggestions.length > 0 && (
          <section className="max-w-[1080px] mx-auto px-6 sm:px-8 lg:px-10 pt-14 pb-16">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c3aed] mb-2">
                  <BookOpen className="w-3.5 h-3.5" /> Les videre
                </p>
                <h2 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Grundige guider om dette</h2>
              </div>
              <Link href="/guider" className="hidden sm:inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7c3aed] hover:underline shrink-0">
                Alle {guides.length} guider <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
              {guideSuggestions.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guider/${g.slug}`}
                  className="group flex flex-col bg-white rounded-2xl p-6 border border-black/[0.06] hover:border-[#d9c9f5] hover:shadow-[0_14px_40px_-22px_rgba(0,0,0,0.22)] transition-all duration-200"
                >
                  <span className="inline-flex self-start px-2.5 py-1 rounded-full bg-[#f2ecfd] text-[#6d28d9] text-[11px] font-semibold mb-4">{g.category}</span>
                  <p className="text-[16px] font-bold leading-snug text-[#1f1f1f] group-hover:text-[#7c3aed] transition-colors flex-1" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</p>
                  <p className="text-[12.5px] text-[#6b665f] mt-3 inline-flex items-center gap-1.5"><Clock className="w-3 h-3" />{g.readMinutes} min lesetid</p>
                </Link>
              ))}
            </div>
            <Link href="/guider" className="sm:hidden inline-flex items-center gap-1.5 py-1.5 text-[14px] font-semibold text-[#7c3aed] mt-6">
              Alle {guides.length} guider <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>
        )}

        {/* CTA */}
        <section className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 py-16 sm:py-20 text-center">
            <h2 className="text-[27px] sm:text-[36px] font-bold tracking-[-0.025em] mb-4 max-w-[24ch] mx-auto leading-[1.12] text-balance" style={{ fontFamily: 'var(--font-heading)' }}>Vil du tjene mer på utleie?</h2>
            <p className="text-white/65 text-[16px] sm:text-[17px] max-w-[48ch] mx-auto mb-9 leading-relaxed">Få en gratis verdivurdering av utleiepotensialet ditt. Ingen oppstartskostnader, ingen bindingstid.</p>
            <Link href="/bli-utleier" className="group inline-flex items-center gap-2 h-[54px] pl-7 pr-3 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[15.5px] font-semibold hover:bg-[#dcaeff] active:scale-[0.98] transition-all">
              Kom i gang
              <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#1f1f1f] text-[#d298ff] group-hover:rotate-45 transition-transform duration-300"><ArrowUpRight className="w-4 h-4" strokeWidth={2.6} /></span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
