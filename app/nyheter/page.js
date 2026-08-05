import Link from 'next/link';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import { getPublishedPosts } from '@/lib/posts';
import { guides, REDIRECTED_POST_SLUGS } from '@/lib/guides';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, itemListLd, stripMarkup } from '@/lib/seo';
import { site } from '@/lib/site';
import { ArrowUpRight, Newspaper, Clock, BookOpen, Sparkles } from 'lucide-react';

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

export default async function NyheterIndex({ searchParams }) {
  const all = await getPublishedPosts(60);
  // Artikler som er konsolidert (301) inn i en guide vises ikke i oversikten —
  // ellers lenker vi internt til en URL som redirigerer.
  const live = all.filter((p) => !REDIRECTED_POST_SLUGS[p.slug]);

  // Emneknagger genereres fra faktisk innhold, ikke fra en hardkodet liste.
  const tagCounts = new Map();
  live.forEach((p) => (p.tags || []).forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nb'));

  // Artikkelmalen lenker til /nyheter?tag=… — filteret måtte faktisk virke,
  // ellers var de lenkene blindveier.
  const activeTag = typeof searchParams?.tag === 'string' ? searchParams.tag : '';
  const filtering = Boolean(activeTag) && tagCounts.has(activeTag);
  const posts = filtering ? live.filter((p) => (p.tags || []).includes(activeTag)) : live;

  // Ved filtrering vises alt som liste — et «utvalgt»-kort gir ingen mening
  // når leseren allerede har uttrykt hva de vil se.
  const featured = filtering ? null : posts[0];
  const rest = filtering ? posts : posts.slice(1);

  // CollectionPage + ItemList: gjør artikkeloversikten maskinlesbar for
  // Google (rich results) og AI-crawlere (AEO).
  const collectionLd = itemListLd({
    name: 'Nyheter og innsikt om utleie i Bergen',
    description: 'Artikler og analyser om utleie, skatt, kontrakter og leiemarkedet i Bergen og Norge.',
    path: '/nyheter',
    items: live.map((p) => ({ name: p.title, path: `/nyheter/${p.slug}` })),
  });

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <JsonLd data={collectionLd} />
      <JsonLd data={breadcrumbLd([{ name: 'Nyheter', path: '/nyheter' }])} />
      <Header />
      <main className="pt-[72px]">
        {/* ── HERO ─────────────────────────────────────────────────────────
            Kompakt: hele poenget med en oversiktsside er å komme til
            innholdet. Tidligere tok heroen nesten en full skjermhøyde. */}
        <section className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-12 pt-12 lg:pt-16 pb-8">
          <div className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#7c3aed] mb-4">
            <Newspaper className="w-3.5 h-3.5" /> Innsikt
          </div>
          <h1
            className="font-bold tracking-[-0.03em] leading-[1.04] max-w-[19ch] text-balance text-[clamp(2.25rem,1.3rem+3.4vw,3.6rem)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Nyheter og innsikt om utleie
          </h1>
          <p className="text-[16.5px] sm:text-[18.5px] text-[#55504a] mt-5 max-w-[54ch] leading-[1.62] text-pretty">
            Analyser og praktiske råd om utleie, leiemarkedet og eiendomsforvaltning i Bergen — skrevet for boligeiere.
          </p>

          {/* Emnefilter */}
          {tags.length > 0 && (
            <nav aria-label="Filtrer på emne" className="flex items-center gap-2 flex-wrap mt-8">
              <Link
                href="/nyheter"
                className={`inline-flex items-center h-9 px-4 rounded-full text-[13.5px] font-medium transition-colors ${
                  filtering
                    ? 'bg-white border border-black/[0.09] text-[#55504a] hover:border-[#d9c9f5] hover:text-[#7c3aed]'
                    : 'bg-[#1f1f1f] text-white'
                }`}
              >
                Alle
              </Link>
              {tags.map(([t, n]) => {
                const on = activeTag === t;
                return (
                  <Link
                    key={t}
                    href={`/nyheter?tag=${encodeURIComponent(t)}`}
                    aria-current={on ? 'true' : undefined}
                    className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13.5px] font-medium transition-colors ${
                      on
                        ? 'bg-[#1f1f1f] text-white'
                        : 'bg-white border border-black/[0.09] text-[#55504a] hover:border-[#d9c9f5] hover:text-[#7c3aed]'
                    }`}
                  >
                    {t}
                    <span className={on ? 'text-white/50 tabular-nums' : 'text-[#7c7568] tabular-nums'}>{n}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </section>

        {posts.length === 0 ? (
          <section className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-12 pb-20">
            <div className="rounded-3xl border border-dashed border-black/[0.12] bg-white/60 px-8 py-16 text-center">
              <p className="text-[16px] text-[#55504a]">
                {filtering ? `Ingen artikler med emnet «${activeTag}» ennå.` : 'Ingen artikler er publisert ennå.'}
              </p>
              <Link href="/guider" className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[#7c3aed] mt-4 hover:underline">
                Se de {guides.length} guidene våre <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        ) : (
          <section className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-12 pb-16 lg:pb-20">
            {/* ── UTVALGT ────────────────────────────────────────────────
                Delt kort (bilde + innhold side om side) i stedet for tekst
                oppå bilde. Den gamle varianten la lilla emneknagger og grå
                dato rett på et lyst foto — praktisk uleselig. Nå står all
                tekst på hvit flate med full kontrast. */}
            {featured && (
              <Link
                href={`/nyheter/${featured.slug}`}
                className="group grid lg:grid-cols-2 rounded-3xl overflow-hidden bg-white border border-black/[0.06] hover:border-[#d9c9f5] hover:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.28)] transition-all duration-300 mb-12 lg:mb-14"
              >
                <div className="relative overflow-hidden bg-[#f1efec] aspect-[16/10] lg:aspect-auto lg:min-h-[340px]">
                  {featured.coverImage ? (
                    <img
                      src={featured.coverImage}
                      alt={featured.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                      fetchPriority="high"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1430] to-[#0a0a0a]" />
                  )}
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#1f1f1f]/85 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-[0.11em]">
                    <Sparkles className="w-3 h-3 text-[#d298ff]" /> Utvalgt
                  </span>
                </div>

                <div className="p-7 sm:p-9 lg:p-11 flex flex-col justify-center">
                  <div className="flex items-center gap-2.5 flex-wrap mb-4">
                    {(featured.tags || []).slice(0, 2).map((t) => (
                      <span key={t} className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#6d28d9] bg-[#f2ecfd] px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                  <h2
                    className="font-bold tracking-[-0.025em] leading-[1.12] text-[clamp(1.5rem,1.1rem+1.5vw,2.15rem)] text-balance group-hover:text-[#7c3aed] transition-colors"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {featured.title}
                  </h2>
                  <p className="text-[15.5px] text-[#55504a] mt-4 leading-[1.68] line-clamp-3">{featured.excerpt}</p>
                  <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mt-6 text-[13px] text-[#6b665f]">
                    <time dateTime={featured.publishedAt}>{fmtDate(featured.publishedAt)}</time>
                    {featured.readMinutes ? (
                      <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{featured.readMinutes} min</span>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[#7c3aed] mt-6 group-hover:gap-2.5 transition-all">
                    Les artikkelen <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            )}

            {/* ── LISTE ──────────────────────────────────────────────────
                Radbasert liste, ikke 3-kolonners rutenett. Etter
                SEO-konsolideringen er det få artikler igjen, og et rutenett
                med én artikkel etterlot to tomme celler. En liste ser riktig
                ut med 1, 2 eller 20 artikler. */}
            {rest.length > 0 && (
              <>
                <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#6f6a64] mb-1">
                  {filtering ? (
                    <>{posts.length} {posts.length === 1 ? 'artikkel' : 'artikler'} om {activeTag}</>
                  ) : 'Flere artikler'}
                </p>
                <div className="divide-y divide-black/[0.07]">
                  {rest.map((p) => (
                    <Link key={p.id} href={`/nyheter/${p.slug}`} className="group flex gap-5 sm:gap-7 py-6 sm:py-7 items-start">
                      <div className="relative shrink-0 w-[92px] h-[70px] sm:w-[176px] sm:h-[118px] rounded-xl sm:rounded-2xl overflow-hidden bg-[#f1efec]">
                        {p.coverImage ? (
                          <img
                            src={p.coverImage}
                            alt={p.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1430] to-[#0a0a0a]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap mb-2">
                          {(p.tags || []).slice(0, 2).map((t) => (
                            <span key={t} className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#6d28d9]">{t}</span>
                          ))}
                        </div>
                        <h2
                          className="text-[17px] sm:text-[21px] font-bold tracking-[-0.015em] leading-[1.22] text-balance group-hover:text-[#7c3aed] transition-colors"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {p.title}
                        </h2>
                        <p className="hidden sm:block text-[14.5px] text-[#55504a] mt-2 leading-[1.65] line-clamp-2 max-w-[62ch]">{p.excerpt}</p>
                        <div className="flex items-center gap-x-3.5 gap-y-1 flex-wrap mt-2.5 sm:mt-3 text-[12.5px] text-[#6b665f]">
                          <time dateTime={p.publishedAt}>{fmtDate(p.publishedAt)}</time>
                          {p.readMinutes ? (
                            <span className="inline-flex items-center gap-1.5"><Clock className="w-3 h-3" />{p.readMinutes} min</span>
                          ) : null}
                        </div>
                      </div>
                      <ArrowUpRight className="hidden sm:block w-5 h-5 text-[#8a837a] group-hover:text-[#7c3aed] shrink-0 mt-1 transition-colors" />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ── GUIDER ───────────────────────────────────────────────────────
            Guidene bærer 73 % av den organiske trafikken, og etter
            konsolideringen er de også hovedvekten av innholdet vårt. De
            fortjener mer enn en fotnote nederst. */}
        <section className="border-t border-black/[0.07] bg-white/50">
          <div className="max-w-[1240px] mx-auto px-6 sm:px-10 lg:px-12 py-14 lg:py-20">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#7c3aed] mb-3">
                  <BookOpen className="w-3.5 h-3.5" /> Kunnskapsbase
                </p>
                <h2 className="font-bold tracking-[-0.025em] leading-[1.1] text-[clamp(1.6rem,1.15rem+1.6vw,2.3rem)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Guider for utleiere
                </h2>
                <p className="text-[15px] text-[#55504a] mt-2.5 max-w-[58ch] leading-relaxed">
                  {guides.length} grundige guider om provisjon, depositum, skatt og regelverk — oppdatert med kilder.
                </p>
              </div>
              <Link href="/guider" className="hidden sm:inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7c3aed] hover:underline shrink-0 pb-1">
                Alle guider <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {guides.slice(0, 6).map((g) => (
                <Link
                  key={g.slug}
                  href={`/guider/${g.slug}`}
                  className="group flex flex-col bg-white rounded-2xl p-6 border border-black/[0.06] hover:border-[#d9c9f5] hover:shadow-[0_16px_44px_-26px_rgba(0,0,0,0.24)] transition-all duration-200"
                >
                  <span className="inline-flex self-start px-2.5 py-1 rounded-full bg-[#f2ecfd] text-[#6d28d9] text-[11px] font-semibold mb-4">{g.category}</span>
                  <h3 className="text-[16px] font-bold leading-snug text-balance group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h3>
                  <p className="text-[13.5px] text-[#55504a] mt-2.5 leading-[1.6] line-clamp-2 flex-1">{stripMarkup(g.description)}</p>
                  <p className="text-[12.5px] text-[#6b665f] mt-4 inline-flex items-center gap-1.5"><Clock className="w-3 h-3" />{g.readMinutes} min lesetid</p>
                </Link>
              ))}
            </div>
            <Link href="/guider" className="sm:hidden inline-flex items-center gap-1.5 py-1.5 text-[14px] font-semibold text-[#7c3aed] mt-7">
              Alle {guides.length} guider <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
