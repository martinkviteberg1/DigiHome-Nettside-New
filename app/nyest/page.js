import Footer from '@/components/dh/Footer';
import Nav from '@/components/nyest/Nav';
import Hero from '@/components/nyest/Hero';
import Partnere from '@/components/nyest/Partnere';
import Steg from '@/components/nyest/Steg';
import Plattform from '@/components/nyest/Plattform';
import Pause from '@/components/nyest/Pause';
import Veier from '@/components/nyest/Veier';
import Mobil from '@/components/nyest/Mobil';
import Sitat from '@/components/nyest/Sitat';
import Film from '@/components/nyest/Film';
import Slutt from '@/components/nyest/Slutt';
import StickyCTA from '@/components/nyest/StickyCTA';

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
    <div className="overflow-x-clip">
      <Nav />
      <Hero />
      <Partnere />
      <Steg />
      <Plattform />
      <Pause />
      <Veier />
      <Mobil />
      <Sitat />
      <Film />
      <Slutt />
      <Footer />
      <StickyCTA />
    </div>
  );
}
