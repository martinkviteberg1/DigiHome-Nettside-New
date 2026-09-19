// Intern rute brukt KUN til film-rendring (LinkedIn-video). Ikke indekser.
export const metadata = {
  title: 'DigiHome · promo',
  robots: { index: false, follow: false, nocache: true },
};

export default function PromoLayout({ children }) {
  return children;
}
