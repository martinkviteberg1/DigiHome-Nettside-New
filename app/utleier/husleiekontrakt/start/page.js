import HusleiekontraktWizard from '@/components/leiekontrakt/HusleiekontraktWizard';

export const metadata = {
  title: 'Lag husleiekontrakt',
  description: 'Fyll inn bolig, leietaker og vilkår – se kontrakten ta form og signer med BankID.',
  alternates: { canonical: '/utleier/husleiekontrakt/start' },
  // Funnel-steg, ikke SEO-innhold: la landingssiden rangere, ikke wizarden.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <HusleiekontraktWizard />;
}
