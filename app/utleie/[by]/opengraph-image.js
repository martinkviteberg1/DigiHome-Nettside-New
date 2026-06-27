import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';
import { getLocation } from '@/lib/locations';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }) {
  const loc = getLocation(params?.by);
  const name = loc?.name || 'Bergen';
  return renderOg({
    eyebrow: 'Utleie · Bergen',
    title: `Utleie i ${name}`,
    subtitle: 'Profesjonell eiendomsforvaltning og smartere utleie i nabolaget ditt.',
  });
}
