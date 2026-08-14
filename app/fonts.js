import localFont from 'next/font/local';

export const rightGrotesk = localFont({
  src: [
    { path: '../public/fonts/right-grotesk/PPRightGrotesk-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/right-grotesk/PPRightGrotesk-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-heading',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

export const diatype = localFont({
  src: [
    { path: '../public/fonts/diatype/ABCDiatype-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/diatype/ABCDiatype-Medium.woff2', weight: '500', style: 'normal' },
    // Diatype leveres ikke i Semibold/Bold her — registrer Medium som ekte
    // 600/700-snitt. Uten dette SYNTETISERER nettleseren fetning for
    // font-semibold/font-bold, og Safaris syntetiske bold er tykk og smurt
    // («alle tekstene ser rare/bold ut»). Ekte glyfer = identisk i alle nettlesere.
    { path: '../public/fonts/diatype/ABCDiatype-Medium.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/diatype/ABCDiatype-Medium.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
});
