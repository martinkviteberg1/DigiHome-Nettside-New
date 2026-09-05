import { renderOgV4, OG_V4_SIZE } from '@/lib/og-v4';

export const alt = 'DigiHome full forvaltning — Vi tar jobben. Du bestemmer.';
export const size = OG_V4_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return renderOgV4({ tittel: ['Vi tar jobben.', 'Du bestemmer'], under: 'Full forvaltning i Bergen. Vi finner leietaker, tar drift og oppfølging — du ser alt og har siste ord.', str: 92 });
}
