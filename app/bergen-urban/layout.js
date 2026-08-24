// Metadata + noindex for presentasjonen (klientside-deck kan ikke eksportere metadata selv)
export const metadata = {
  title: 'Vibe coding i praksis — DigiHome @ Bergen Urban',
  description: 'Presentasjon: Historien om hvordan DigiHome ble til.',
  robots: { index: false, follow: false },
};

export default function BergenUrbanLayout({ children }) {
  return children;
}
