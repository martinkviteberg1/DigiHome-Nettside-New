import './globals.css';
import Script from 'next/script';
import { Providers } from './providers';
import { rightGrotesk, diatype, instrumentSerif } from './fonts';
import { site } from '@/lib/site';
import { ogUrl } from '@/lib/og-url';
import SiteAnalytics from '@/components/SiteAnalytics';
import CallTracking from '@/components/CallTracking';
import ConsentBanner from '@/components/ConsentBanner';
import MetaPixel from '@/components/MetaPixel';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';
const GADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';

export const metadata = {
  // Absolutte og:image/og:url må peke på hosten siden deles fra (preview ≠ prod). Faller tilbake til digihome.no.
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || site.url),
  title: {
    default: 'DigiHome | Automatisert utleie i Bergen',
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
    title: 'DigiHome | Automatisert utleie i Bergen',
    description: site.defaultDescription,
    /* Statisk og:image (1200×630 JPG) — lynrask og pålitelig for iMessage/Slack/LinkedIn (ingen kaldstart, ingen
       fallback til tilfeldige bilder på siden). Undersider med egen opengraph-image.js overstyrer.
       Absolutt URL (lib/og-url): Next løser relative sosiale bilder mot localhost i dev → previewen mistet bildet. */
    images: [{ url: ogUrl('/og/forside.jpg'), width: 1200, height: 630, alt: 'DigiHome — Utleie på autopilot. Én godkjenning, resten gjorde DigiHome.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DigiHome | Automatisert utleie i Bergen',
    description: site.defaultDescription,
    images: [ogUrl('/og/forside.jpg')],
  },
  icons: {
    icon: [{ url: '/digihome-favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/digihome-favicon.svg',
    apple: '/digihome-mark.svg',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#F3F1EC',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nb" className={`${rightGrotesk.variable} ${diatype.variable} ${instrumentSerif.variable}`}>
      <head>
        {/* LCP: mobil-hero forhåndslastes nå av next/image (priority) med korrekt
            resized srcset via /api/media — ingen manuell full-size preload trengs. */}
        {/* Forhåndskoble til bilde-CDN-ene som brukes på lokasjons-/rapportsider */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);' }} />
        {GA4_ID ? (
          <>
            {/* Consent Mode v2 — default = avslått (EØS/GDPR), settes FØR taggen leser samtykke */}
            <Script
              id="ga-consent-default"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});gtag('js',new Date());gtag('config','${GA4_ID}',{send_page_view:false,anonymize_ip:true});${GADS_ID ? `gtag('config','${GADS_ID}',{allow_enhanced_conversions:true});` : ''}`,
              }}
            />
            {/* gtag.js (176 KB) lastes ETTER første interaksjon eller etter 4s.
                Holder det utenfor LCP/TBT-vinduet uten å miste data: alle
                gtag()-kall køes i dataLayer av consent-shimen over og
                prosesseres når biblioteket lastes. */}
            <Script
              id="ga-deferred"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(){var l=false;function load(){if(l)return;l=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA4_ID}';document.head.appendChild(s);clean();}var ev=['scroll','mousemove','touchstart','keydown','pointerdown'];function clean(){ev.forEach(function(e){window.removeEventListener(e,load)})}ev.forEach(function(e){window.addEventListener(e,load,{passive:true,once:true})});setTimeout(load,4000);})();`,
              }}
            />
          </>
        ) : null}
      </head>
      <body className="font-body bg-canvas text-ink">
        <SiteAnalytics />
        <CallTracking />
        <Providers>{children}</Providers>
        <ConsentBanner />
        <MetaPixel />
      </body>
    </html>
  );
}
