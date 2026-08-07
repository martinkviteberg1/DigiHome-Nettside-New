import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import Hero from '@/components/nyest/Hero';
import Partnere from '@/components/nyest/Partnere';
import Steg from '@/components/nyest/Steg';
import Veier from '@/components/nyest/Veier';
import Film from '@/components/nyest/Film';
import Slutt from '@/components/nyest/Slutt';

// ---------------------------------------------------------------------------
// /nyest — utkast til ny forside. Ett konsept: skriv inn adressen, så går
// utleien på autopilot. Hero → partnere → tre steg → to veier → filmen →
// adressefeltet igjen. Ikke noe mer.
//
// noindex til den eventuelt forfremmes til forside, så den ikke konkurrerer
// med / i søk.
// ---------------------------------------------------------------------------

export const metadata = {
  title: 'Utleie på autopilot | DigiHome',
  description:
    'Skriv inn adressen din, så automatiserer DigiHome utleien — annonse, leiekontrakt med BankID, depositum og husleie. Administrer selv, eller få hjelp med forvaltning.',
  robots: { index: false, follow: false },
};

export default function NyestPage() {
  return (
    <div>
      <Header />
      <Hero />
      <Partnere />
      <Steg />
      <Veier />
      <Film />
      <Slutt />
      <Footer />
    </div>
  );
}
