// Investor-rommet er token-gatet og konfidensielt — skal ALDRI indekseres.
// (Siden er 'use client' og kan ikke eksportere metadata selv.)
export const metadata = {
  title: 'Investor',
  robots: { index: false, follow: false },
};

export default function InvestorLayout({ children }) {
  return children;
}
