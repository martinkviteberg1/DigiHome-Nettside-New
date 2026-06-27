import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';
import { RENT_CITIES } from '@/lib/rentmarket';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }) {
  const city = RENT_CITIES?.[params?.by]?.label || 'Bergen';
  return renderOg({
    eyebrow: 'Leiemarkedsrapport',
    title: `Leiemarkedet i ${city}`,
    subtitle: 'Live leiepriser, etterspørsel og prognoser — basert på offisiell statistikk.',
  });
}
