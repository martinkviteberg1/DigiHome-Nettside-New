import AutopilotFilm from '@/components/video/AutopilotFilm';

export const metadata = {
  title: 'Utleie på autopilot — Filmen',
  description:
    'Se hvordan DigiHome setter utleien din på autopilot: annonsering, visninger, leietakerscreening, kontrakt og husleie — helt automatisk. 60 sekunder.',
  alternates: { canonical: '/video' },
  openGraph: {
    title: 'Utleie på autopilot — Filmen | DigiHome',
    description: 'Annonsering, visninger, screening, kontrakt og husleie — helt automatisk. Se filmen på 60 sekunder.',
  },
};

export default function VideoPage() {
  return <AutopilotFilm />;
}
