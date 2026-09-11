import HusleiekontraktLanding from '@/components/leiekontrakt/HusleiekontraktLanding';
import { JsonLd } from '@/components/site/JsonLd';
import { site } from '@/lib/site';
import { breadcrumbLd, webPageLd, howToLd, faqLd } from '@/lib/seo';

const TITTEL = 'Gratis husleiekontrakt med BankID-signering';
const BESKRIVELSE = 'Lag en juridisk gyldig husleiekontrakt gratis på noen minutter. Bygget på husleieloven, signeres med BankID, depositumskonto integrert. Ingen binding.';
const PATH = '/utleier/husleiekontrakt';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: PATH },
  keywords: ['husleiekontrakt', 'leiekontrakt', 'husleiekontrakt mal', 'leieavtale', 'standard leiekontrakt', 'husleiekontrakt gratis', 'leiekontrakt BankID', 'lage husleiekontrakt'],
  // Ingen images her → Next bruker den dynamiske opengraph-image.js i denne mappa.
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', url: PATH, title: `${TITTEL} | DigiHome`, description: BESKRIVELSE },
  twitter: { card: 'summary_large_image', title: TITTEL, description: BESKRIVELSE },
  robots: { index: true, follow: true },
};

// AEO: korte, siterbare Q&A. Stegene under matcher «Slik fungerer det» på siden
// (HowTo-schema krever at stegene faktisk vises).
const FAQ = [
  { q: 'Er det virkelig gratis å lage husleiekontrakt?', a: 'Ja. Du fyller ut, signerer med BankID og laster ned uten kostnad. Vi tjener først penger hvis du vil ha mer – depositumskonto, husleieinnkreving eller selvforvaltning til 5 % av leien – og det er alltid valgfritt.' },
  { q: 'Er kontrakten juridisk gyldig?', a: 'Ja. Den bygger på husleieloven av 26. mars 1999 nr. 17 og inneholder bestemmelsene Husleietvistutvalget anbefaler. Signert med BankID har den samme rettslige verdi som en håndskrevet underskrift.' },
  { q: 'Hvor lang tid tar det å lage en husleiekontrakt?', a: 'De fleste er ferdige på 3–5 minutter. Du fyller inn bolig, leietaker og vilkår – så tar kontrakten form av seg selv mens du skriver.' },
  { q: 'Må leietakeren registrere seg eller laste ned en app?', a: 'Nei. Leietakeren får en lenke på e-post og signerer med sin egen BankID – uten app og uten å opprette konto.' },
  { q: 'Hva skjer etter at kontrakten er signert?', a: 'Begge parter får en PDF på e-post, og kontrakten arkiveres trygt. Derfra kan du legge til depositumskonto, husleieinnkreving og KPI-regulering hvis du vil.' },
  { q: 'Kan jeg slå opp adressen automatisk?', a: 'Ja. Søk opp boligen, så henter vi matrikkel og seksjon fra Eiendomsregisteret. For eierseksjonssameier velger du riktig seksjon, så fylles detaljene inn automatisk.' },
];

const HOWTO = howToLd({
  name: 'Slik lager du en husleiekontrakt',
  path: PATH,
  totalTime: 'PT5M',
  description: BESKRIVELSE,
  steps: [
    { name: 'Fyll inn bolig, leietaker og vilkår', text: 'Søk opp adressen – matrikkel og seksjon hentes fra Eiendomsregisteret. Legg til leietaker og leievilkår. De fleste er ferdige på 3–5 minutter.' },
    { name: 'Se kontrakten og opprett konto', text: 'Kontrakten fyller seg selv ut mens du skriver. Opprett konto når du er klar til å signere.' },
    { name: 'Signer med BankID', text: 'Du signerer med BankID, leietaker får en lenke på e-post og signerer med sin. Begge får PDF-en.' },
  ],
});

// Service med gratis Offer — signaliserer til Google/AI at verktøyet er gratis.
const SERVICE_LD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Husleiekontrakt med BankID-signering',
  serviceType: 'Husleiekontrakt / leieavtale',
  description: BESKRIVELSE,
  url: `${site.url}${PATH}`,
  provider: { '@id': `${site.url}/#organization` },
  areaServed: { '@type': 'Country', name: 'Norge' },
  availableLanguage: ['Norwegian'],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'NOK', availability: 'https://schema.org/InStock', description: 'Lag og signer husleiekontrakt gratis' },
};

export default function Page() {
  return (
    <>
      <JsonLd data={webPageLd({ name: TITTEL, description: BESKRIVELSE, path: PATH })} />
      <JsonLd data={breadcrumbLd([{ name: 'Husleiekontrakt', path: PATH }])} />
      <JsonLd data={SERVICE_LD} />
      <JsonLd data={HOWTO} />
      <JsonLd data={faqLd(FAQ)} />
      <HusleiekontraktLanding />
    </>
  );
}
