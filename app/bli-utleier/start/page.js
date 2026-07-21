import OwnerOnboarding2026 from '@/components/dh/OwnerOnboarding2026';

// Mobil-først konverteringsflyt: adresse → tjeneste → kontakt.
// Ingen global Header/Footer — egen kompakt topplinje uten sticky CTA over tastaturet.
export const metadata = {
  title: 'Kom i gang | DigiHome',
  description: 'Velg mellom full forvaltning og selvforvaltning, og kom i gang med utleie av boligen din.',
  robots: { index: false, follow: false }, // konverteringsflyt — ikke SEO-side
};

export default function Page() {
  return <OwnerOnboarding2026 />;
}
