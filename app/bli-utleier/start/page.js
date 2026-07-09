import BliUtleierPage from '@/components/dh/BliUtleierPage';

// Fullskjerm «Kom i gang»-flyt: steg 0 (velg spor) + veiviser uten site-chrome.
// Ingen Header/Footer — egen minimal topplinje med logo + «Avslutt».
export const metadata = {
  title: 'Kom i gang | DigiHome',
  description: 'Velg mellom full forvaltning og selvforvaltning, og kom i gang med utleie av boligen din.',
  robots: { index: false, follow: false }, // konverteringsflyt — ikke SEO-side
};

export default function Page() {
  return <BliUtleierPage fullscreen />;
}
