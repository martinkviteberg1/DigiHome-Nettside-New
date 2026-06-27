import { site } from '@/lib/site';

// Genererer /manifest.webmanifest (Next.js App Router). Next legger automatisk
// inn <link rel="manifest"> i <head>.
export default function manifest() {
  return {
    name: 'DigiHome — Smartere utleie i Bergen',
    short_name: 'DigiHome',
    description: site.defaultDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FDFCFB',
    theme_color: '#FDFCFB',
    lang: 'nb-NO',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/digihome-favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/digihome-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
