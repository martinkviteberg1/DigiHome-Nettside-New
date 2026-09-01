import BedriftLanding from '@/components/bedrift/BedriftLanding';

export const metadata = {
  title: 'DigiHome for bedrifter — driftssystemet for eiendomsporteføljer',
  description: 'Leieforhold, BankID-signering, saker, dokumenter og økonomi i én flate. Bygget av forvaltere og brukt hver dag på vår egen portefølje. For selskaper med 5–1000 enheter.',
  alternates: { canonical: '/bedrift' },
};

export default function BedriftPage() {
  return <BedriftLanding />;
}
