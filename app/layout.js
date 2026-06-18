import './globals.css';
import { Providers } from './providers';
import { rightGrotesk, diatype } from './fonts';
import { site } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'DigiHome | Smartere utleie i Bergen',
    template: '%s | DigiHome',
  },
  description: site.defaultDescription,
  applicationName: 'DigiHome',
  alternates: {
    canonical: '/',
    languages: { 'nb-NO': '/', en: '/en' },
  },
  keywords: [
    'eiendomsforvaltning Bergen',
    'utleie Bergen',
    'korttidsutleie Bergen',
    'langtidsutleie Bergen',
    'Airbnb forvaltning',
    'DigiHome',
  ],
  authors: [{ name: 'DigiHome' }],
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: site.url,
    siteName: 'DigiHome',
    title: 'DigiHome | Smartere utleie i Bergen',
    description: site.defaultDescription,
    images: [{ url: site.ogImage, width: 1200, height: 630, alt: 'DigiHome' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DigiHome | Smartere utleie i Bergen',
    description: site.defaultDescription,
    images: [site.ogImage],
  },
  icons: {
    icon: [{ url: '/digihome-favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/digihome-favicon.svg',
    apple: '/digihome-mark.svg',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#FDFCFB',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nb" className={`${rightGrotesk.variable} ${diatype.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);' }} />
      </head>
      <body className="font-body bg-canvas text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
