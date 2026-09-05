import { renderOgV4, OG_V4_SIZE } from '@/lib/og-v4';

export const alt = 'DigiHome for eiendomsselskap — Porteføljen på autopilot.';
export const size = OG_V4_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return renderOgV4({ tittel: ['Porteføljen', 'på autopilot'], under: 'Saker, husleie og leietakere på tvers av alle bygg. Systemet drifter — teamet godkjenner.', str: 96 });
}
