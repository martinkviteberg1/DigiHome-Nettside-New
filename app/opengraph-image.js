import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: 'Eiendomsforvaltning · Bergen',
    title: 'Utleie som går av seg selv.',
    subtitle: 'Automatisert utleie i Bergen og hele Norge — med eller uten forvalter.',
  });
}
