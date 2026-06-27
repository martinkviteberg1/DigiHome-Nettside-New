import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: 'Eiendomsforvaltning · Bergen',
    title: 'Smartere utleie. Høyere inntekt.',
    subtitle: 'AI-drevet eiendomsforvaltning i Bergen — trygt, enkelt og lønnsomt.',
  });
}
