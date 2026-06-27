import './globals.css';
import Script from 'next/script';
import { Providers } from './providers';
import { rightGrotesk, diatype } from './fonts';
import { site } from '@/lib/site';
import SiteAnalytics from '@/components/SiteAnalytics';
import ConsentBanner from '@/components/ConsentBanner';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';
const GADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';

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
    // og:image leveres av app/opengraph-image.js (dynamisk, per side).
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DigiHome | Smartere utleie i Bergen',
    description: site.defaultDescription,
    // twitter:image leveres av app/twitter-image.js.
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
        {/* Raskere LCP: forhåndskoble til bilde-CDN-ene som brukes på lokasjons-/rapportsider */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);' }} />
        {GA4_ID ? (
          <>
            {/* Consent Mode v2 — default = avslått (EØS/GDPR), settes FØR taggen leser samtykke */}
            <Script
              id="ga-consent-default"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});gtag('js',new Date());gtag('config','${GA4_ID}',{send_page_view:false,anonymize_ip:true});${GADS_ID ? `gtag('config','${GADS_ID}');` : ''}`,
              }}
            />
            <Script
              id="ga-base"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
          </>
        ) : null}
      </head>
      <body className="font-body bg-canvas text-ink">
        <SiteAnalytics />
        <Providers>{children}</Providers>
        <ConsentBanner />
      </body>
    </html>
  );
}
