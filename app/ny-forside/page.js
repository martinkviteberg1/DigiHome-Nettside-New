import NyForside from '@/components/landing/NyForside';

export const metadata = {
  title: 'DigiHome — Lei ut boligen din. Uten stress.',
  description:
    'DigiHome tar hele jobben med utleie: annonsering, visninger, kontrakt og utbetaling. Du får leien rett på konto — helt uten stress.',
  robots: { index: false, follow: false }, // Skjult til siden er godkjent og promotert til forside.
};

export default function Side() {
  return <NyForside />;
}
