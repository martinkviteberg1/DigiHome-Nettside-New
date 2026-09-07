// Eksternt delt investordeck — konfidensielt, skal ALDRI indekseres.
export const metadata = {
  title: 'DigiHome — investordeck',
  robots: { index: false, follow: false, nocache: true },
};

export default function DeckLayout({ children }) {
  return children;
}
