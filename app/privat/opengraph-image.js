import { renderOgV4, OG_V4_SIZE } from '@/lib/og-v4';

export const alt = 'DigiHome for private huseiere — Boligen på autopilot.';
export const size = OG_V4_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return renderOgV4({ tittel: ['Boligen på', 'autopilot'], under: 'Lei ut selv — uten å gjøre alt selv. Kontrakt, husleie og oppfølging går av seg selv.' });
}
