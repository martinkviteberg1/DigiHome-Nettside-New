import { renderOgV4, OG_V4_SIZE, OG_V4_ALT } from '@/lib/og-v4';

export const alt = OG_V4_ALT;
export const size = OG_V4_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return renderOgV4({});
}
