import { notFound } from 'next/navigation';
import FaqSection from '@/components/site/FaqSection';
import { JsonLd } from '@/components/site/JsonLd';
import GuideToc from '@/components/site/GuideToc';
import GuideCluster from '@/components/site/GuideCluster';
import { renderRich } from '@/components/site/RichText';
import { breadcrumbLd, guideArticleLd, howToLd, anchorId, stripMarkup } from '@/lib/seo';
import { site } from '@/lib/site';
import { guides, getGuide, relatedGuides, guideCluster } from '@/lib/guides';
import { findAuthorByName, authors as authorRegistry } from '@/lib/authors';
import {
  ArtikkelRamme, Sti, Tittel, Byline, KortSvar, Fakta, Bilde, StegBlokk,
  H2, Avsnitt, Punktliste, Kilder, Ansvar, ArtikkelCta, Rader,
} from '@/components/forside/v4/artikkel/ArtikkelDeler';

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
    <ArtikkelRamme testid="guide-v4">
      <article className="mx-auto w-full max-w-[820px] px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <Sti href="/guider" tekst="Alle guider" tags={[g.category]} />

        <Tittel>{g.title}</Tittel>

        <Byline
          author={author}
          navn={g.author?.name}
          rolle={g.author?.role}
          meta={[
            { ikon: 'tid', tekst: `${g.readMinutes} min lesetid` },
            { ikon: 'oppdatert', tekst: `Oppdatert ${updatedLabel}`, dateTime: g.updated },
          ]}
          reviewer={g.reviewer}
        />

        {/* AEO: direkte, siterbart svar øverst — det AI-motorer (og lesere) vil ha.
            .dh-answer er pekt ut som speakable i Article-schemaet. */}
        <KortSvar>{g.answer}</KortSvar>

        {/* Nøkkeltall: korte, tallfestede punkter. Lettest mulig å sitere for
            AI-svarmotorer, og raskest mulig å skanne på mobil. */}
        <Fakta punkter={(g.keyFacts || []).map((f, i) => renderRich(f, `kf-${i}`))} />

        <Bilde src={g.image} alt={g.imageAlt} />

        <GuideToc sections={g.sections} />

        {/* HowTo: stegene MÅ være synlige på siden for at HowTo-schema skal
            være gyldig. Denne oppsummeringen er kilden schemaet peker til. */}
        {g.howTo?.steps?.length ? <StegBlokk navn={g.howTo.name} steg={g.howTo.steps} anchorId={anchorId} /> : null}

        <div className="mt-12 space-y-12">
          {g.sections.map((s) => (
            <section key={s.h2} id={anchorId(s.h2)} className="scroll-mt-28">
              <H2>{s.h2}</H2>
              {(s.paragraphs || []).map((p, i) => (
                <Avsnitt key={i}>{renderRich(p, `${anchorId(s.h2)}-p${i}`)}</Avsnitt>
              ))}
              {s.list ? <Punktliste punkter={s.list.map((li, i) => renderRich(li, `${anchorId(s.h2)}-l${i}`))} /> : null}
            </section>
          ))}
        </div>

        <Kilder kilder={g.sources || []} />

        {g.disclaimer ? (
          <Ansvar>Innholdet er generell veiledning per {new Date(g.updated).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })} og erstatter ikke individuell juridisk eller skattemessig rådgivning. Regler kan endres — bruk kildene ovenfor og kontroller alltid gjeldende informasjon hos den offisielle myndigheten.</Ansvar>
        ) : null}

        <ArtikkelCta href={g.cta?.href || '/kom-i-gang'} label={g.cta?.label || 'Kom i gang'} />
      </article>

      <GuideCluster cluster={cluster} currentSlug={g.slug} />

      <FaqSection
        title="Ofte stilte spørsmål"
        intro="Korte svar på det leserne lurer mest på."
        faqs={g.faqs}
        smal
      />

      <Rader
        label="Les også"
        tittel="Flere guider"
        alleHref="/guider"
        alleTekst={`Alle ${guides.length} guider`}
        testid="guide-relaterte"
        rader={related.map((r) => ({ href: `/guider/${r.slug}`, meta: r.category, tittel: r.title, tekst: stripMarkup(r.description) }))}
      />

      <JsonLd data={guideArticleLd(g)} />
      <JsonLd data={breadcrumbLd([{ name: 'Guider', path: '/guider' }, { name: g.title, path }])} />
      {g.howTo ? (
        <JsonLd data={howToLd({ name: g.howTo.name, steps: g.howTo.steps, path, totalTime: g.howTo.totalTime, image: g.image, description: g.answer })} />
      ) : null}
    </ArtikkelRamme>
  );
}
