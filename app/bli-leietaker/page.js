import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import BliLeietakerPage from '@/components/dh/BliLeietakerPage';
import FaqSection from '@/components/site/FaqSection';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, serviceLd } from '@/lib/seo';

export const metadata = {
  title: 'Leie bolig i Bergen — kvalitetssikrede utleieboliger',
  description: 'Finn din neste leiebolig i Bergen: kvalitetssikrede boliger, digitale kontrakter med BankID og profesjonell oppfølging — gratis for leietakere.',
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', url: '/bli-leietaker', images: [{ url: '/og/bli-leietaker.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/bli-leietaker.jpg'] },
  alternates: { canonical: '/bli-leietaker' },
};

// Synlig FAQ + FAQPage-schema — gir siden reelt, siterbart innhold (AEO)
// i tillegg til selve registreringsskjemaet (som er klient-rendret).
const FAQS = [
  { q: 'Hvordan finner jeg leiebolig gjennom DigiHome?', a: 'Registrer deg som boligsøker med ønsket område, budsjett og innflyttingsdato. Vi matcher deg mot ledige boliger i porteføljen vår i Bergen og tar kontakt når noe passer — ofte før boligen annonseres offentlig.' },
  { q: 'Koster det noe å være leietaker hos DigiHome?', a: 'Nei. Tjenesten er helt gratis for leietakere. Du betaler kun husleie og depositum i henhold til leiekontrakten.' },
  { q: 'Hva kreves for å leie bolig?', a: 'Vi gjennomfører en enkel screening med kredittsjekk og referanser, slik husleieloven tillater. Kontrakten signeres digitalt med BankID, og depositum settes på egen depositumskonto i tråd med husleieloven.' },
  { q: 'Hvordan fungerer depositum?', a: 'Depositumet settes på en egen, låst depositumskonto i ditt navn — aldri rett til utleier. Beløpet er normalt tre måneders husleie, og du får det tilbake med renter når leieforholdet avsluttes uten mangler.' },
  { q: 'Hvem hjelper meg underveis i leieforholdet?', a: 'DigiHome er din kontakt gjennom hele leieforholdet — innflytting, feilmelding, vedlikehold og utflytting håndteres digitalt med et lokalt team i Bergen i ryggen.' },
];

export default function Page() {
  return (
    <>
      <Header />
      <BliLeietakerPage />
      <FaqSection
        title="Ofte stilte spørsmål fra leietakere"
        intro="Det viktigste å vite før du leier gjennom DigiHome."
        faqs={FAQS}
      />
      <JsonLd data={breadcrumbLd([{ name: 'Bli leietaker', path: '/bli-leietaker' }])} />
      <JsonLd data={serviceLd({
        name: 'Boligformidling for leietakere',
        description: 'Gratis formidling av kvalitetssikrede utleieboliger i Bergen med digitale kontrakter og profesjonell oppfølging.',
        path: '/bli-leietaker',
        serviceType: 'Boligutleie',
      })} />
      <Footer />
    </>
  );
}
