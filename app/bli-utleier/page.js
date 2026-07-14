import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import ServiceModelsSection from '@/components/dh/ServiceModelsSection';
import DynamicRentalSection from '@/components/dh/DynamicRentalSection';
import ShowcaseSection from '@/components/dh/ShowcaseSection';
import TestimonialsSection from '@/components/dh/TestimonialsSection';
import ScrollToForm from '@/components/dh/ScrollToForm';
import UtleierStickyCta from '@/components/dh/UtleierStickyCta';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, serviceLd } from '@/lib/seo';
import { UtleierHero, UtleierServices, UtleierPrisModell, UtleierFaq, UtleierCta } from '@/components/dh/UtleierInfo';

export const metadata = {
  title: 'Utleiemegler i Bergen — full utleieforvaltning',
  description: 'Vi tar oss av alt ved utleie av boligen din: annonsering, visninger, leietakersjekk, kontrakt, husleie og vedlikehold. 0 kr oppstart, ingen bindingstid. Få uforpliktende tilbud innen 24 timer.',
  alternates: { canonical: '/bli-utleier' },
};

// Informativ tjenesteside for direktetrafikk + skjemaet nederst (#skjema).
// Betalt trafikk / hero-søk med ?address= hopper rett til skjemaet (ScrollToForm)
// — konverteringsflyten for annonser er uendret.
export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Bli utleier', path: '/bli-utleier' }])} />
      <JsonLd data={serviceLd({
        name: 'Utleieforvaltning for boligeiere',
        description: 'Full utleieforvaltning i Bergen: annonsering, visninger, leietakersjekk, kontrakt, husleie og vedlikehold — eller selvforvaltning med digitale verktøy (5 % per utleieforhold).',
        path: '/bli-utleier',
        serviceType: 'Eiendomsforvaltning',
      })} />
      <Header />
      <ScrollToForm />
      <main>
        <UtleierHero />
        <UtleierServices />
        <ServiceModelsSection />
        <UtleierPrisModell />
        <DynamicRentalSection />
        <ShowcaseSection />
        <TestimonialsSection />
        <UtleierFaq />
        <UtleierCta />
      </main>
      <UtleierStickyCta />
      <Footer />
    </>
  );
}
