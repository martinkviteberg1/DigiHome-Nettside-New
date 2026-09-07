import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReadingProgress from '@/components/site/ReadingProgress';
import ArticleToc from '@/components/site/ArticleToc';
import ArticleShare from '@/components/site/ArticleShare';
import { getPostBySlug } from '@/lib/posts';
import { guides } from '@/lib/guides';
import { site } from '@/lib/site';
import { getAuthorForPost } from '@/lib/authors';
import { buildArticle, readingTime } from '@/lib/markdown';
import { T, SVAK, HAIR } from '@/components/forside/v4/tokens';
import { ArtikkelRamme, Sti, Tittel, Byline, Bilde, ArtikkelCta, Rader, LINK } from '@/components/forside/v4/artikkel/ArtikkelDeler';

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
    <ArtikkelRamme testid="nyhet-v4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingProgress />
      <main>
        <article>
          {/* ── HERO ──────────────────────────────────────────────────────
              Tekst først, bilde etter: leseren møter tittel, ingress og
              byline umiddelbart. .dh-answer er speakable-målet i schemaet. */}
          <header className="mx-auto w-full max-w-[1080px] px-5 pt-10 sm:px-8 sm:pt-14">
            <Sti
              href="/nyheter"
              tekst="Alle artikler"
              tags={(post.tags || []).map((t) => ({ label: t, href: `/nyheter?tag=${encodeURIComponent(t)}` }))}
            />
            <div className="max-w-[820px]">
              <Tittel>{post.title}</Tittel>
              {post.excerpt ? (
                <p className="dh-answer faq-answer mt-7 max-w-[60ch] text-[18px] leading-[1.55] sm:text-[20px]" style={{ color: 'rgba(21,19,15,0.7)' }}>
                  {post.excerpt}
                </p>
              ) : null}
            </div>

            <Byline
              author={author}
              meta={[
                { tekst: fmtDate(post.publishedAt), dateTime: post.publishedAt },
                { ikon: 'tid', tekst: `${minutes} min` },
                ...(updated ? [{ ikon: 'oppdatert', tekst: `Oppdatert ${fmtDate(updated)}`, dateTime: updated }] : []),
              ]}
              hoyre={<ArticleShare title={post.title} />}
            />
          </header>

          {/* ── COVER ─────────────────────────────────────────────────────
              4/3 på mobil, 21/9 fra sm — bildet skal aldri skyve teksten ut. */}
          {post.coverImage ? (
            <div className="mx-auto w-full max-w-[1080px] px-5 sm:px-8">
              <Bilde src={post.coverImage} alt={post.title} className="mt-10 lg:mt-12" aspekt="aspect-[4/3] sm:aspect-[21/9] sm:max-h-[440px]" />
            </div>
          ) : null}

          {/* ── BRØDTEKST ─────────────────────────────────────────────────
              xl: to kolonner der sidestolpen holder innholdsfortegnelsen
              sticky. Under xl kollapser den til <details> over teksten.
              Lesebredden er låst til 68ch. */}
          <div className="mx-auto w-full max-w-[1080px] px-5 pb-4 pt-12 sm:px-8 lg:pt-14">
            <div className="xl:grid xl:grid-cols-[minmax(0,680px)_1fr] xl:gap-16">
              <div className="min-w-0">
                <ArticleToc headings={headings} variant="inline" />
                <div className="dh-prose max-w-[68ch] xl:max-w-none" dangerouslySetInnerHTML={{ __html: html }} />

                {/* Bunnlinje: tags + deling, der leseren faktisk er ferdig */}
                <div className="mt-12 flex max-w-[68ch] flex-wrap items-center justify-between gap-4 border-t pt-6 xl:max-w-none" style={{ borderColor: HAIR }}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
                    {(post.tags || []).map((t) => (
                      <Link key={t} href={`/nyheter?tag=${encodeURIComponent(t)}`} className="font-medium transition-colors hover:text-[#15130F]/60" style={{ color: T.ink }}>#{t}</Link>
                    ))}
                  </div>
                  <ArticleShare title={post.title} compact />
                </div>

                {/* Forfatter — E-E-A-T: navngitt person med rolle og bio. Rad på hårlinje, ikke kort. */}
                <div className="mt-8 flex max-w-[68ch] gap-5 border-t pt-7 xl:max-w-none" style={{ borderColor: HAIR }}>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[17px] font-medium" style={{ background: author.accent, color: author.fg || '#fff', fontFamily: 'var(--font-heading)' }}>{author.initials}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: SVAK }}>Skrevet av</p>
                    <p className="mt-1 text-[17px] font-medium" style={{ color: T.ink }}>{author.name}</p>
                    <p className="text-[13.5px]" style={{ color: SVAK }}>{author.role}</p>
                    {author.bio ? <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.65]" style={{ color: 'rgba(21,19,15,0.72)' }}>{author.bio}</p> : null}
                    <Link href="/om-oss" className={`mt-3 inline-block text-[14px] font-medium ${LINK}`} style={{ color: T.ink }}>Om teamet</Link>
                  </div>
                </div>

                <ArtikkelCta
                  tittel="Vil du tjene mer på utleie"
                  tekst="Registrer adressen og få en vurdering innen 24 timer. 0 kr oppstart, ingen bindingstid."
                  href="/bli-utleier"
                  label="Kom i gang"
                />
              </div>

              <aside className="hidden max-w-[240px] xl:block">
                <ArticleToc headings={headings} variant="rail" />
              </aside>
            </div>
          </div>
        </article>

        {/* Interne lenker fra artikkel → guider. Guidene er de sidene som
            faktisk rangerer, så artiklene skal sende både lesere og lenkekraft dit. */}
        <Rader
          label="Les videre"
          tittel="Grundige guider om dette"
          alleHref="/guider"
          alleTekst={`Alle ${guides.length} guider`}
          testid="nyhet-guider"
          rader={guideSuggestions.map((g) => ({ href: `/guider/${g.slug}`, meta: `${g.category} · ${g.readMinutes} min`, tittel: g.title }))}
        />
      </main>
    </ArtikkelRamme>
  );
}
