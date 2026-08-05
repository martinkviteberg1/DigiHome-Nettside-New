import Header from '@/components/dh/Header';
import Hero from '@/components/hjem/Hero';
import ProofBand from '@/components/hjem/ProofBand';
import ToVeier from '@/components/hjem/ToVeier';
import SlikFungerer from '@/components/hjem/SlikFungerer';
import Boligene from '@/components/hjem/Boligene';
import Stemmer from '@/components/hjem/Stemmer';
import Nettverk from '@/components/hjem/Nettverk';
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
// Forsiden, satt som en trykksak.
//
// Seksjonene er nummererte 01–10 og bygger én argumentrekke: hva du kan velge →
// hvordan det fungerer → se det → hva det kan gi → standarden → boligene →
// eierne → fagfolkene → menneskene → spørsmålene. Fire seksjoner er beholdt fra
// før fordi de har noe ekte i seg: filmen, FINN/Airbnb-kortene, de faktiske
// annonsene fra API-et og portrettet av daglig leder.
//
// Fjernet: StatsSection (tallene ligger i heroen), PartnersBar-marqueen
// (erstattet av ProofBand), ImageBreak og QualitySection (slått sammen til
// Boligene), TestimonialsSection, NetworkSection, FaqSection og CTASection
// (erstattet av redaksjonelle utgaver). Komponentfilene står igjen urørt fordi
// andre sider importerer flere av dem.
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
      <Nettverk />
      <AboutCEOSection />
      <Sporsmal />
      <Avslutning />
      <Footer />
      <MobileCTA />
    </div>
  );
}
