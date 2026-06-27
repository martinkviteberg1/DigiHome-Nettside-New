import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: 'Tjenester',
    title: 'Langtid, korttid og dynamisk hybrid',
    subtitle: 'Tre utleiemodeller tilpasset boligen din — for maksimal og trygg avkastning.',
  });
}
