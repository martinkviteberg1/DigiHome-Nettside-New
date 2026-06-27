import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: 'For utleiere · Bergen',
    title: 'Få en gratis verdivurdering',
    subtitle: 'Se hva boligen din kan tjene med DigiHome — uten binding eller oppstartskostnader.',
  });
}
