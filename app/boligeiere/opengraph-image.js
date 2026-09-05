import { renderOgV4, OG_V4_SIZE } from '@/lib/og-v4';

export const alt = 'DigiHome for boligeiere — Boligen på autopilot.';
export const size = OG_V4_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return renderOgV4({ tittel: ['Boligen på', 'autopilot'], under: 'Én bolig eller fem. Lei ut selv med DigiHome som motor — eller la oss ta alt.' });
}
