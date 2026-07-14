import PriceWizard from '@/components/dh/PriceWizard';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Priskalkulator — se hva utleie koster',
  description: 'Bygg din egen forvaltningspakke og se prisen med en gang. Velg mellom Selvbetjent (5 %) og Fullforvaltning (10 %), legg til det du trenger — gratis og uforpliktende.',
  alternates: { canonical: '/priskalkulator' },
  openGraph: {
    title: 'Priskalkulator — se hva utleie koster | DigiHome',
    description: 'Bygg din egen forvaltningspakke og se prisen med en gang. Gratis og uforpliktende.',
    images: [{ url: site.url + site.ogImage }],
  },
};

// Immersiv fullskjerm-opplevelse — egen minimal toppbar, ingen vanlig header/footer.
export default function PriskalkulatorPage() {
  return (
    <>
      {/* Semantisk H1 for SEO/skjermlesere — kalkulatoren er klient-rendret. */}
      <h1 className="sr-only">Priskalkulator — se hva utleieforvaltning koster hos DigiHome</h1>
      <JsonLd data={breadcrumbLd([{ name: 'Priskalkulator', path: '/priskalkulator' }])} />
      <JsonLd data={webPageLd({
        name: 'DigiHome priskalkulator',
        description: 'Bygg din egen forvaltningspakke og se prisen med en gang — selvbetjent (5 %) eller fullforvaltning.',
        path: '/priskalkulator',
        type: 'WebApplication',
      })} />
      <PriceWizard />
    </>
  );
}
