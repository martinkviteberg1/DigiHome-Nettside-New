import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import FaqSection from '@/components/site/FaqSection';
import { JsonLd } from '@/components/site/JsonLd';
import GuideToc from '@/components/site/GuideToc';
import GuideCluster from '@/components/site/GuideCluster';
import { renderRich } from '@/components/site/RichText';
import { breadcrumbLd, guideArticleLd, howToLd, anchorId, stripMarkup } from '@/lib/seo';
import { site } from '@/lib/site';
import { guides, getGuide, relatedGuides, guideCluster } from '@/lib/guides';
import { Clock, ArrowUpRight, ArrowLeft, Sparkles, CalendarDays, CheckCircle2, ShieldCheck } from 'lucide-react';
import { findAuthorByName, authors as authorRegistry } from '@/lib/authors';

// ---------------------------------------------------------------------------
// Artikkelmal for guidene.
//
// Bygget for både SEO og AEO:
//   • «Kort svar» (.dh-answer) øverst — det siterbare svaret, også speakable
//   • «Nøkkeltall» — korte, tallfestede punkter AI-motorer kan hente ut
//   • id på hver H2 + innholdsfortegnelse → passasjelenker
//   • inline interne lenker i brødteksten (renderRich)
//   • klyngenavigasjon pilar ↔ spokes
//   • Article + BreadcrumbList + FAQPage (+ HowTo der stegene vises)
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }) {
  const g = getGuide(params.slug);
  if (!g) return { title: 'Ikke funnet', robots: { index: false } };
  const desc = stripMarkup(g.description);
  const ogTitle = `${g.metaTitle} | DigiHome`;
  return {
    title: g.metaTitle,
    description: desc,
    alternates: { canonical: `/guider/${g.slug}` },
    ...(g.keywords?.length ? { keywords: g.keywords } : {}),
    openGraph: {
      title: ogTitle,
      description: desc,
      url: `${site.url}/guider/${g.slug}`,
      type: 'article',
      locale: 'nb_NO',
      publishedTime: g.published || g.updated,
      modifiedTime: g.updated,
      images: [{ url: site.url + g.image }],
    },
    twitter: { card: 'summary_large_image', title: ogTitle, description: desc, images: [site.url + g.image] },
  };
}

export default function GuidePage({ params }) {
  const g = getGuide(params.slug);
  if (!g) notFound();
  const related = relatedGuides(g);
  const cluster = guideCluster(g);
  const path = `/guider/${g.slug}`;
  // Byline-identitet hentes fra forfatterregisteret, slik at guider og
  // nyhetsartikler viser samme person med samme initialer og farge.
  const author = findAuthorByName(g.author?.name) || authorRegistry['sarah-sleeman'];
  const updatedLabel = new Date(g.updated).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-[#fdfcfb] text-[#1f1f1f] min-h-screen">
      <Header />

      <article className="max-w-[820px] mx-auto px-6 sm:px-10 pt-32 sm:pt-36 pb-16">
        <Link href="/guider" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed] hover:underline mb-6"><ArrowLeft className="w-3.5 h-3.5" /> Alle guider</Link>

        {/* ── HEADER ────────────────────────────────────────────────────────
            Rekkefølgen var tidligere kategori → lesetid → «Skrevet av» →
            «Faglig kontroll» → H1, og byline-blokken lå inne i en flex-rad
            den ikke hørte til. Leseren møtte altså fire linjer metadata før
            tittelen. Nå: kategori → tittel → byline → kort svar, som på
            nyhetsartiklene. */}
        <div>
          <span className="inline-flex px-3 py-1.5 rounded-full bg-[#f2ecfd] text-[#6d28d9] text-[11px] font-semibold uppercase tracking-[0.11em]">{g.category}</span>
        </div>

        <h1 className="mt-5 text-[32px] sm:text-[44px] font-bold tracking-[-0.025em] leading-[1.08] text-balance" style={{ fontFamily: 'var(--font-heading)' }}>{g.title}</h1>

        <div className="mt-7 pt-6 border-t border-black/[0.07] flex flex-wrap items-center gap-x-5 gap-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0"
              style={{ background: author.accent, fontFamily: 'var(--font-heading)' }}
            >
              {author.initials}
            </div>
            <div className="leading-tight">
              <p className="text-[14.5px] font-semibold text-[#1f1f1f]">{g.author?.name || author.name}</p>
              <p className="text-[12.5px] text-[#6b665f] mt-0.5">{g.author?.role || author.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[13px] text-[#6b665f]">
            <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {g.readMinutes} min lesetid</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Oppdatert {updatedLabel}</span>
          </div>
        </div>
        {g.reviewer ? (
          <p className="mt-3.5 flex items-start gap-1.5 text-[12.5px] text-[#6b665f] leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 text-[#18794E] mt-[2px] shrink-0" />
            <span><span className="font-semibold text-[#292621]">Faglig kontroll:</span> {g.reviewer.name} · {g.reviewer.role}</span>
          </p>
        ) : null}

        {/* AEO: direkte, siterbart svar øverst — det AI-motorer (og lesere) vil ha.
            .dh-answer er pekt ut som speakable i Article-schemaet. */}
        <div className="mt-7 bg-[#f4f0fb] rounded-2xl p-6 sm:p-7">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7c3aed] mb-2.5"><Sparkles className="w-3.5 h-3.5" /> Kort svar</div>
          <p className="dh-answer text-[15px] sm:text-[15.5px] leading-[1.75] text-[#3a3a3a]">{g.answer}</p>
        </div>

        {/* Nøkkeltall: korte, tallfestede punkter. Lettest mulig å sitere for
            AI-svarmotorer, og raskest mulig å skanne på mobil (56 % av trafikken). */}
        {g.keyFacts?.length ? (
          <div className="mt-4 rounded-2xl border border-black/[0.07] bg-white p-6 sm:p-7">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#716b63] mb-3.5">Nøkkeltall</p>
            <ul className="space-y-2.5">
              {g.keyFacts.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14.5px] leading-[1.7] text-[#4a4a4a]">
                  <CheckCircle2 className="w-4 h-4 text-[#7c3aed] mt-[3px] shrink-0" strokeWidth={2.2} />
                  <span>{renderRich(f, `kf-${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="relative aspect-[16/8] rounded-2xl overflow-hidden mt-8">
          <img src={g.image} alt={g.imageAlt} width={1200} height={600} fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
        </div>

        <GuideToc sections={g.sections} />

        {/* HowTo: stegene MÅ være synlige på siden for at HowTo-schema skal
            være gyldig. Denne oppsummeringen er kilden schemaet peker til. */}
        {g.howTo?.steps?.length ? (
          <section className="mt-8 rounded-3xl bg-[#0f0d16] px-6 py-7 sm:px-8">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#d298ff] mb-4">{g.howTo.name}</p>
            <ol className="space-y-4">
              {g.howTo.steps.map((s, i) => (
                <li key={s.name} id={anchorId(s.name)} className="flex gap-4 scroll-mt-28">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#d298ff] text-[#1f1f1f] text-[13px] font-bold flex items-center justify-center" style={{ fontFamily: 'var(--font-heading)' }}>{i + 1}</span>
                  <div>
                    <p className="text-white text-[15.5px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>{s.name}</p>
                    <p className="text-white/65 text-[14px] leading-[1.7] mt-1">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-10 space-y-10">
          {g.sections.map((s) => (
            <section key={s.h2} id={anchorId(s.h2)} className="scroll-mt-28">
              <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.015em] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{s.h2}</h2>
              {(s.paragraphs || []).map((p, i) => (
                <p key={i} className="text-[15.5px] leading-[1.85] text-[#4a4a4a] mb-4">{renderRich(p, `${anchorId(s.h2)}-p${i}`)}</p>
              ))}
              {s.list && (
                <ul className="space-y-2.5 mt-2">
                  {s.list.map((li, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#4a4a4a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-[10px] shrink-0" />
                      <span>{renderRich(li, `${anchorId(s.h2)}-l${i}`)}</span>
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

      <GuideCluster cluster={cluster} currentSlug={g.slug} />

      {related.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 sm:px-10 pt-10 pb-16 lg:pb-24">
          <h2 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Les også</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {related.map((r) => (
              <Link key={r.slug} href={`/guider/${r.slug}`} className="group bg-white rounded-2xl p-6 shadow-[0_8px_36px_-18px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_-20px_rgba(0,0,0,0.2)] transition-shadow">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-[#f4f0fb] text-[#7c3aed] text-[11.5px] font-semibold mb-3">{r.category}</span>
                <h3 className="text-[17px] font-bold leading-snug group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{r.title}</h3>
                <p className="text-[13.5px] text-[#666] mt-1.5 leading-relaxed">{stripMarkup(r.description)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <JsonLd data={guideArticleLd(g)} />
      <JsonLd data={breadcrumbLd([{ name: 'Guider', path: '/guider' }, { name: g.title, path }])} />
      {g.howTo ? (
        <JsonLd data={howToLd({ name: g.howTo.name, steps: g.howTo.steps, path, totalTime: g.howTo.totalTime, image: g.image, description: g.answer })} />
      ) : null}
      <Footer />
    </div>
  );
}
