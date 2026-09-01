import RotCover from '@/components/cover/RotCover';
import Footer from '@/components/dh/Footer';

export const metadata = {
  title: 'DigiHome — Utleie på autopilot',
  description: 'Ett system for boligutleie: full forvaltning i Bergen, selvbetjent panel i hele Norge — og driftssystemet for bedrifter med eiendomsportefølje.',
  alternates: { canonical: '/' },
};

// ---------------------------------------------------------------------------
// Roten — DigiHome-coveret.
//
// Ett løfte («Utleie på autopilot»), to dører: privat huseier → /privat,
// bedrift → /bedrift. Forbrukerinnholdet som tidligere lå her bor nå
// uendret på /privat; bedriftsverdenen bor på /bedrift.
// ---------------------------------------------------------------------------
export default function CoverPage() {
  return (
    <div>
      <RotCover />
      <Footer />
    </div>
  );
}
