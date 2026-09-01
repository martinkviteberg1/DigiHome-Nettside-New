import Forside2026 from '@/components/forside/Forside2026';
import Footer from '@/components/dh/Footer';

export const metadata = {
  title: 'DigiHome — Utleie på autopilot',
  description: 'Hele utleieprosessen i ett system — fra annonse og BankID-signering til husleie, saker og oppfølging. For private huseiere og profesjonelle forvaltere.',
  alternates: { canonical: '/' },
};

// ---------------------------------------------------------------------------
// Roten — produktledet landingsside.
//
// Selger DigiHome som produkt først, forretningsmodellene etterpå:
// hero → produktdemo → integrasjoner → prosessen → privat/pro →
// funksjoner → ROI → «Hvordan vil du bruke DigiHome?» → CTA.
// Forbrukerdybden bor på /privat, bedriftsdybden på /bedrift.
// ---------------------------------------------------------------------------
export default function CoverPage() {
  return (
    <div>
      <Forside2026 />
      <Footer />
    </div>
  );
}
