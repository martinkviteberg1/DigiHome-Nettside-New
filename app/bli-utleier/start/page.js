import StartV4 from '@/components/forside/v4/start/StartV4';

// Konverteringsflyt: adresse → tjeneste → kontakt. «Fortsettelsen av heroen» —
// samme canvas, typografi og ink-knapp som forsiden. Boligen din er scenen.
// Ingen global Header/Footer. Forrige versjon: /bli-utleier/start-v1.
export const metadata = {
  title: 'Kom i gang',
  description: 'Velg mellom full forvaltning og selvforvaltning, og kom i gang med utleie av boligen din.',
  robots: { index: false, follow: false }, // konverteringsflyt — ikke SEO-side
};

export default function Page() {
  return <StartV4 />;
}
