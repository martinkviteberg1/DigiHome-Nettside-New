// Offentlig delingslenke for styrerapporten. noindex — dette er en privat,
// token-basert lenke som aldri skal i søkemotorer.
import DeltRapport from './DeltRapport';

export const metadata = {
  title: 'Styrerapport · DigiHome',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function StyrerapportDeltSide({ params }) {
  return <DeltRapport token={String(params?.token || '')} />;
}
