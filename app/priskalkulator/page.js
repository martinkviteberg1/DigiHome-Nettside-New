import PriceWizard from '@/components/dh/PriceWizard';

export const metadata = {
  title: 'Priskalkulator — se hva utleie koster | DigiHome',
  description: 'Bygg din egen forvaltningspakke og se prisen med en gang. Velg mellom Selvbetjent (5 %) og Fullforvaltning (10 %), legg til det du trenger — gratis og uforpliktende.',
  alternates: { canonical: '/priskalkulator' },
  openGraph: {
    title: 'Priskalkulator — se hva utleie koster | DigiHome',
    description: 'Bygg din egen forvaltningspakke og se prisen med en gang. Gratis og uforpliktende.',
  },
};

// Immersiv fullskjerm-opplevelse — egen minimal toppbar, ingen vanlig header/footer.
export default function PriskalkulatorPage() {
  return <PriceWizard />;
}
