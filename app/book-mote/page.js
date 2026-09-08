import BookMoteV4 from '@/components/forside/v4/sider/BookMoteV4';

const TITTEL = 'Book en samtale';
const BESKRIVELSE = 'Tjue minutter om boligen eller porteføljen din — uforpliktende. Vi ringer deg og finner et tidspunkt som passer. Digitalt, hos deg eller i boligen.';

// Konverteringsflyt (mål for «Book en samtale» / «Book en demo» + QR fra presentasjoner).
export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/book-mote' },
  robots: { index: false, follow: true },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/book-mote', images: [{ url: '/og/book-mote.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/book-mote.jpg'] },
};

const EMNER = new Set(['forvaltning', 'selv', 'bedrift']);

export default function BookMotePage({ searchParams }) {
  const emne = String(searchParams?.emne || '');
  return <BookMoteV4 emneStart={EMNER.has(emne) ? emne : 'forvaltning'} />;
}
