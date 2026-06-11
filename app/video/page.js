import AutopilotFilm from '@/components/video/AutopilotFilm';

export const metadata = {
  title: 'Utleie på autopilot — Filmen',
  description:
    'Se hvordan DigiHome setter utleien din på autopilot: annonsering, visninger, leietakerscreening, kontrakt, husleie og leietakeroppfølging — helt automatisk. 72 sekunder.',
  alternates: { canonical: '/video' },
  openGraph: {
    title: 'Utleie på autopilot — Filmen | DigiHome',
    description: 'Annonsering, visninger, screening, kontrakt, husleie og leietakeroppfølging — helt automatisk. Se filmen.',
  },
};

export default function VideoPage() {
  return <AutopilotFilm />;
}
