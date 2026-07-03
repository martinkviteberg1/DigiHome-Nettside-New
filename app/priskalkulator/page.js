import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
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

export default function PriskalkulatorPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fdfcfb' }}>
      <Header />
      <main className="pt-28 sm:pt-32 pb-28 lg:pb-24">
        <PriceWizard />
      </main>
      <Footer />
    </div>
  );
}
