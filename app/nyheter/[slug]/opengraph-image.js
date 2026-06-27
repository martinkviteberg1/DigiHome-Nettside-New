import { renderOg, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from '@/lib/og';
import { getPostBySlug } from '@/lib/posts';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

function trim(s, n) {
  if (!s) return '';
  const clean = String(s).replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n - 1).trimEnd() + '…' : clean;
}

export default async function Image({ params }) {
  let post = null;
  try {
    post = await getPostBySlug(params?.slug);
  } catch (e) {
    post = null;
  }
  const category = post?.category || post?.tag || 'Nyheter';
  const title = post?.title || 'DigiHome Nyheter';
  const subtitle = trim(post?.excerpt || post?.summary || post?.description || '', 130);
  return renderOg({
    eyebrow: category,
    title,
    subtitle: subtitle || 'Innsikt om utleie, eiendomsforvaltning og leiemarkedet i Bergen.',
    chips: null,
  });
}
