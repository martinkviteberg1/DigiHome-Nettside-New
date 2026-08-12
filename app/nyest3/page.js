import Footer from '@/components/dh/Footer';
import Nav3 from '@/components/nyest/Nav3';
import Hero3 from '@/components/nyest/Hero3';
import Partnere from '@/components/nyest/Partnere';
import Steg from '@/components/nyest/Steg';
import Plattform from '@/components/nyest/Plattform';
import Pause from '@/components/nyest/Pause';
import Fordeler from '@/components/nyest/Fordeler';
import Veier from '@/components/nyest/Veier';
import Mobil from '@/components/nyest/Mobil';
import Sitat from '@/components/nyest/Sitat';
import Film from '@/components/nyest/Film';
import Slutt from '@/components/nyest/Slutt';
import StickyCTA from '@/components/nyest/StickyCTA';

// ---------------------------------------------------------------------------
// /nyest3 — variant av /nyest2. Bildet strekker seg helt til topp med samme
// spacing som bunn og høyre. Knappene i navbar er skjult før scroll og glir
// inn samtidig når man begynner å scrolle.
// ---------------------------------------------------------------------------

export const metadata = {
  title: 'Utleie på autopilot | DigiHome',
  description:
    'Skriv inn adressen din, så automatiserer DigiHome utleien — annonse, leiekontrakt med BankID, depositum og husleie. Administrer selv, eller få hjelp med forvaltning.',
  robots: { index: false, follow: false },
};

export default function Nyest3Page() {
  return (
    <div className="overflow-x-clip">
      <Nav3 />
      <Hero3 />
      <Partnere />
      <Steg />
      <Plattform />
      <Pause />
      <Fordeler />
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
