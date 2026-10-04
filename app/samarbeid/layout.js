import '../../components/samarbeid/forslag/forslag.css';

export const metadata = {
  title: 'Privat forslag – DigiHome Tech',
  description: 'Konfidensielt. Delt med navngitte mottakere.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function SamarbeidLayout({ children }) {
  return children;
}
