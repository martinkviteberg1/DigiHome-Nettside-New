import Header from '@/components/dh/Header';
import Hero from '@/components/hjem/Hero';
import ProofBand from '@/components/hjem/ProofBand';
import ToVeier from '@/components/hjem/ToVeier';
import SlikFungerer from '@/components/hjem/SlikFungerer';
import Boligene from '@/components/hjem/Boligene';
import Stemmer from '@/components/hjem/Stemmer';
import Sporsmal from '@/components/hjem/Sporsmal';
import Avslutning from '@/components/hjem/Avslutning';
import ServiceModelsSection from '@/components/dh/ServiceModelsSection';
import DynamicRentalSection from '@/components/dh/DynamicRentalSection';
import ShowcaseSection from '@/components/dh/ShowcaseSection';
import AboutCEOSection from '@/components/dh/AboutCEOSection';
import Footer from '@/components/dh/Footer';
import MobileCTA from '@/components/dh/MobileCTA';
import StructuredData from '@/components/dh/StructuredData';

export const metadata = {
  title: 'Automatisert utleie i Bergen og hele Norge | DigiHome',
  description: 'DigiHome automatiserer utleien: annonsering, leiekontrakt med BankID, depositumskonto og husleieinnkreving. Velg full forvaltning i Bergen — eller gjør jobben selv i plattformen.',
  alternates: { canonical: '/' },
};

// ---------------------------------------------------------------------------
// Forsiden.
//
// Argumentrekken: hva du kan velge → hvordan det fungerer → se det → hva det
// kan gi → standarden → boligene → eierne → menneskene → spørsmålene → handling.
//
// Ryddet bort fordi det var duplisering, ikke innhold: seksjonsetikettene
// (småkapitler over hver tittel), tallstripen i heroen, og fagfolk-seksjonen —
// den sa det samme som partnerlinjen rett under heroen. Komponentfilene står
// igjen urørt fordi andre sider importerer flere av dem.
// ---------------------------------------------------------------------------
export default function HomePage() {
  return (
    <div>
      <StructuredData />
      <Header />
      <Hero />
      <ProofBand />
      <ToVeier />
      <SlikFungerer />
      <ServiceModelsSection />
      <DynamicRentalSection />
      <Boligene />
      <ShowcaseSection />
      <Stemmer />
      <AboutCEOSection />
      <Sporsmal />
      <Avslutning />
      <Footer />
      <MobileCTA />
    </div>
  );
}
