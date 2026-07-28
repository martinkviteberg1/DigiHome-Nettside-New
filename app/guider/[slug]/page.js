import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import FaqSection from '@/components/site/FaqSection';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { site } from '@/lib/site';
import { guides, getGuide, relatedGuides } from '@/lib/guides';
import { Clock, ArrowUpRight, ArrowLeft, Sparkles, CalendarDays } from 'lucide-react';

// Artikkelmal for guidene: AEO-boks med direkte svar øverst, H2-seksjoner,
// FAQPage-schema via FaqSection og Article-schema for rike resultater.

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }) {
  const g = getGuide(params.slug);
  if (!g) return { title: 'Ikke funnet' };
  return {
    title: g.metaTitle,
    description: g.description,
    alternates: { canonical: `/guider/${g.slug}` },
    openGraph: {
      title: `${g.metaTitle} | DigiHome`,
      description: g.description,
      url: `${site.url}/guider/${g.slug}`,
      type: 'article',
      locale: 'nb_NO',
      images: [{ url: site.url + g.image }],
    },
  };
}

function articleLd(g) {
  const author = g.author || { name: 'Sarah Sleeman', role: 'Daglig leder og eiendomsmegler', url: `${site.url}/om-oss` };
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.description,
    image: site.url + g.image,
    datePublished: g.published || g.updated,
    dateModified: g.updated,
    inLanguage: 'nb-NO',
    mainEntityOfPage: `${site.url}/guider/${g.slug}`,
    author: { '@type': 'Person', name: author.name, jobTitle: author.role, url: author.url?.startsWith('http') ? author.url : `${site.url}${author.url || '/om-oss'}`, '@id': `${site.url}/#sarah-sleeman` },
    publisher: { '@type': 'Organization', '@id': `${site.url}/#organization`, name: 'DigiHome', url: site.url, logo: { '@type': 'ImageObject', url: `${site.url}/brand/digihome-icon-purple.svg` } },
    citation: (g.sources || []).map((s) => s.url.startsWith('http') ? s.url : `${site.url}${s.url}`),
  };
  if (g.reviewer) {
    data.reviewedBy = {
      '@type': g.reviewer.type || 'Person',
      name: g.reviewer.name,
      url: g.reviewer.url?.startsWith('http') ? g.reviewer.url : `${site.url}${g.reviewer.url || '/metode'}`,
      ...(g.reviewer.type === 'Organization' ? { description: g.reviewer.role } : { jobTitle: g.reviewer.role }),
    };
  }
  return data;
}

export default function GuidePage({ params }) {
  const g = getGuide(params.slug);
  if (!g) notFound();
  const related = relatedGuides(g);

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      <article className="max-w-[820px] mx-auto px-6 sm:px-10 pt-32 sm:pt-36 pb-16">
        <Link href="/guider" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed] hover:underline mb-6"><ArrowLeft className="w-3.5 h-3.5" /> Alle guider</Link>

        <div className="flex flex-wrap items-center gap-3 mb-4 text-[12.5px] text-[#716b63]">
          <span className="inline-flex px-2.5 py-1 rounded-full bg-[#f4f0fb] text-[#7c3aed] font-semibold">{g.category}</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {g.readMinutes} min lesetid</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Oppdatert {new Date(g.updated).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#625d57]">
          <span><strong className="text-[#292621]">Skrevet av:</strong> {g.author?.name || 'Sarah Sleeman'} · {g.author?.role || 'Daglig leder og eiendomsmegler'}</span>
          {g.reviewer ? <span><strong className="text-[#292621]">Faglig kontroll:</strong> {g.reviewer.name} · {g.reviewer.role}</span> : null}
        </div>

        </div>

        <h1 className="text-[32px] sm:text-[44px] font-bold tracking-[-0.025em] leading-[1.08]" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h1>

        {/* AEO: direkte, siterbart svar øverst — det AI-motorer (og lesere) vil ha */}
        <div className="mt-7 bg-[#f4f0fb] rounded-2xl p-6 sm:p-7">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7c3aed] mb-2.5"><Sparkles className="w-3.5 h-3.5" /> Kort svar</div>
          <p className="text-[15px] sm:text-[15.5px] leading-[1.75] text-[#3a3a3a]">{g.answer}</p>
        </div>

        <div className="relative aspect-[16/8] rounded-2xl overflow-hidden mt-8">
          <img src={g.image} alt={g.imageAlt} width={1200} height={600} fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
        </div>

        <div className="mt-10 space-y-10">
          {g.sections.map((s) => (
            <section key={s.h2}>
              <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.015em] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{s.h2}</h2>
              {(s.paragraphs || []).map((p, i) => (
                <p key={i} className="text-[15.5px] leading-[1.85] text-[#4a4a4a] mb-4">{p}</p>
              ))}
              {s.list && (
                <ul className="space-y-2.5 mt-2">
                  {s.list.map((li, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#4a4a4a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-[10px] shrink-0" />{li}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {g.sources?.length ? (
          <section className="mt-10 border-t border-black/[0.06] pt-6">
            <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Offisielle kilder og videre lesning</h2>
            <ul className="mt-3 space-y-2">
              {g.sources.map((source) => (
                <li key={source.url}><a href={source.url} target={source.url.startsWith('http') ? '_blank' : undefined} rel={source.url.startsWith('http') ? 'noopener noreferrer' : undefined} className="text-[13.5px] text-[#4e4944] underline decoration-[#c8c1b8] underline-offset-4 hover:text-[#7c3aed]">{source.label}</a></li>
              ))}
            </ul>
          </section>
        ) : null}


        {g.disclaimer && (
          <p className="mt-10 text-[12.5px] text-[#716b63] leading-relaxed border-t border-black/[0.06] pt-5">Innholdet er generell veiledning per {new Date(g.updated).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })} og erstatter ikke individuell juridisk eller skattemessig rådgivning. Regler kan endres — bruk kildene ovenfor og kontroller alltid gjeldende informasjon hos den offisielle myndigheten.</p>
        )}

        {/* CTA */}
        <div className="mt-10 bg-[#0a0a0a] rounded-3xl px-7 py-8 sm:px-9 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <p className="text-white text-[19px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Slipp å kunne alt dette selv</p>
            <p className="text-white/60 text-[14px] mt-1">DigiHome håndterer pris, kontrakt, depositum og rapportering — riktig, hver gang.</p>
          </div>
          <Link href={g.cta.href} className="group inline-flex items-center gap-2 h-[48px] pl-5 pr-2.5 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[14px] font-semibold shrink-0 active:scale-[0.98] transition-transform">{g.cta.label}<span className="inline-flex items-center justify-center w-[32px] h-[32px] rounded-full bg-[#1f1f1f] text-[#d298ff]"><ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.6} /></span></Link>
        </div>
      </article>

      <FaqSection
        title="Ofte stilte spørsmål"
        intro="Korte svar på det leserne lurer mest på."
        faqs={g.faqs}
      />

      {related.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 sm:px-10 pb-16 lg:pb-24">
          <h2 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Les også</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {related.map((r) => (
              <Link key={r.slug} href={`/guider/${r.slug}`} className="group bg-white rounded-2xl p-6 shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_-20px_rgba(0,0,0,0.2)] transition-shadow">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-[#f4f0fb] text-[#7c3aed] text-[11.5px] font-semibold mb-3">{r.category}</span>
                <h3 className="text-[17px] font-bold leading-snug group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{r.title}</h3>
                <p className="text-[13.5px] text-[#666] mt-1.5 leading-relaxed">{r.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <JsonLd data={articleLd(g)} />
      <JsonLd data={breadcrumbLd([{ name: 'Guider', path: '/guider' }, { name: g.title, path: `/guider/${g.slug}` }])} />
      <Footer />
    </div>
  );
}
