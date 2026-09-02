import ForsideV3 from '@/components/forside/v3/ForsideV3';
import Footer from '@/components/dh/Footer';

export const metadata = {
  title: 'DigiHome — Utleie på autopilot',
  description: 'Alt fra annonse til innbetaling går av seg selv. Du bestemmer hvor mye du vil være med — selvbetjent, full forvaltning eller hele porteføljen.',
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// /v3 — forhåndsvisning av ny forside (verdensklasse 2026). Byttes til / når
// designet er godkjent. Ikke indeksert.
// ---------------------------------------------------------------------------
export default function V3Page() {
  return (
    <div>
      <ForsideV3 />
      <Footer variant="v3" />
    </div>
  );
}
