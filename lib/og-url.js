import { site } from '@/lib/site';

/* ---------------------------------------------------------------------------
   Absolutt URL til og:image / twitter:image.

   Hvorfor: Next løser *relative* sosiale bilder mot http://localhost:PORT i
   dev-modus – uavhengig av metadataBase (getSocialImageFallbackMetadataBase).
   Preview-verten kjører dev, så iMessage/Slack fikk «http://localhost:3000/og/…»,
   klarte ikke laste det, og falt tilbake til et tilfeldig bilde på siden
   (varmtvannsberederen fra Drift-kapittelet). Absolutte URL-er røres ikke.
--------------------------------------------------------------------------- */
export const OG_BASE = (process.env.NEXT_PUBLIC_BASE_URL || site.url).replace(/\/+$/, '');

export function ogUrl(sti) {
  return `${OG_BASE}${sti.startsWith('/') ? sti : `/${sti}`}`;
}
