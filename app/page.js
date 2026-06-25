import Header from '@/components/dh/Header';
import HeroSection from '@/components/dh/HeroSection';
import ServiceModelsSection from '@/components/dh/ServiceModelsSection';
import StatsSection from '@/components/dh/StatsSection';
import HowItWorksSection from '@/components/dh/HowItWorksSection';
import ImageBreak from '@/components/dh/ImageBreak';
import DynamicRentalSection from '@/components/dh/DynamicRentalSection';
import QualitySection from '@/components/dh/QualitySection';
import NetworkSection from '@/components/dh/NetworkSection';
import ShowcaseSection from '@/components/dh/ShowcaseSection';
import WhyChooseUsSection from '@/components/dh/WhyChooseUsSection';
import AboutCEOSection from '@/components/dh/AboutCEOSection';
import TestimonialsSection from '@/components/dh/TestimonialsSection';
import PartnersBar from '@/components/dh/PartnersBar';
import CTASection from '@/components/dh/CTASection';
import Footer from '@/components/dh/Footer';
import StructuredData from '@/components/dh/StructuredData';

export const metadata = {
  title: 'DigiHome — Smartere utleie. Høyere inntekt.',
  description: 'DigiHome kombinerer teknologi med personlig oppfølging for å maksimere leieinntekten din. Hybridløsning av korttids- og langtidsutleie.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div>
      <StructuredData />
      <Header />
      <HeroSection />
      <ServiceModelsSection />
      <StatsSection />
      <HowItWorksSection />
      <ImageBreak />
      <QualitySection />
      <ShowcaseSection />
      <DynamicRentalSection />
      <NetworkSection />
      <WhyChooseUsSection />
      <AboutCEOSection />
      <TestimonialsSection />
      <PartnersBar />
      <CTASection />
      <Footer />
    </div>
  );
}
