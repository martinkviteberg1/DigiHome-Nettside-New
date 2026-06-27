import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: 'Forvaltning',
    title: 'Full forvaltning av utleieboligen din',
    subtitle: 'Annonsering, prising, kontrakter, husleie og vedlikehold — vi håndterer alt.',
  });
}
