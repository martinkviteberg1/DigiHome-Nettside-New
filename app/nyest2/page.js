import Footer from '@/components/dh/Footer';
import Nav2 from '@/components/nyest/Nav2';
import Hero2 from '@/components/nyest/Hero2';
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
// /nyest2 — split-screen-variant av /nyest. Bildet tar høyre halvdel helt
// til viewport-kanten, teksten sitter rolig venstre. Full-width navbar.
// Resten av siden er identisk med /nyest.
// ---------------------------------------------------------------------------

export const metadata = {
  title: 'Utleie på autopilot | DigiHome',
  description:
    'Skriv inn adressen din, så automatiserer DigiHome utleien — annonse, leiekontrakt med BankID, depositum og husleie. Administrer selv, eller få hjelp med forvaltning.',
  robots: { index: false, follow: false },
};

export default function Nyest2Page() {
  return (
    <div className="overflow-x-clip">
      <Nav2 />
      <Hero2 />
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
