import HusleiekontraktLanding from '@/components/leiekontrakt/HusleiekontraktLanding';

const TITTEL = 'Gratis husleiekontrakt med BankID-signering';
const BESKRIVELSE = 'Lag en juridisk gyldig husleiekontrakt gratis på noen minutter. Bygget på husleieloven, signeres med BankID, depositumskonto integrert. Ingen binding.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/utleier/husleiekontrakt' },
  keywords: ['husleiekontrakt', 'leiekontrakt', 'husleiekontrakt mal', 'leieavtale', 'standard leiekontrakt', 'husleiekontrakt gratis', 'leiekontrakt BankID'],
  openGraph: {
    type: 'website', locale: 'nb_NO', siteName: 'DigiHome', url: '/utleier/husleiekontrakt',
    title: `${TITTEL} | DigiHome`, description: BESKRIVELSE,
    images: [{ url: '/og/forside.jpg', width: 1200, height: 630, alt: TITTEL }],
  },
  twitter: { card: 'summary_large_image', title: TITTEL, description: BESKRIVELSE, images: ['/og/forside.jpg'] },
  robots: { index: true, follow: true },
};

const FAQ_LD = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: [
    ['Er det virkelig gratis å lage kontrakt?', 'Ja. Du fyller ut, signerer med BankID og laster ned uten kostnad. Vi tjener først penger hvis du vil ha mer – depositumskonto, husleieinnkreving eller selvforvaltning til 5 % av leien – og det er alltid valgfritt.'],
    ['Er kontrakten juridisk gyldig?', 'Ja. Den bygger på husleieloven av 26. mars 1999 nr. 17 og inneholder paragrafene Husleietvistutvalget anbefaler. Signert med BankID har den samme verdi som en håndskrevet underskrift.'],
    ['Hvor lang tid tar det?', 'De fleste er ferdige på 3–5 minutter. Du fyller inn bolig, leietaker og vilkår – så tar kontrakten form av seg selv.'],
    ['Må leietakeren registrere seg?', 'Nei. Leietakeren får en lenke på e-post og signerer med sin egen BankID – uten app og uten å opprette konto.'],
    ['Hva skjer etter at kontrakten er signert?', 'Begge parter får en PDF på e-post, og kontrakten arkiveres trygt. Derfra kan du legge til depositumskonto, innkreving og KPI-regulering hvis du vil.'],
  ].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <HusleiekontraktLanding />
    </>
  );
}
