import localFont from 'next/font/local';
import { Instrument_Serif } from 'next/font/google';

/* «-sub»-filene er subsettet (scripts/subset-fonter.py): latin + latin-ext + typografisk tegnsetting, pil, €, med kern/tnum/
   pnum/liga/calt/case/frac — uten stilistiske alternativer (ss01–ss14) som aldri brukes. 31 % mindre i den kritiske stien.
   Originalene ligger ved siden av. */
export const rightGrotesk = localFont({
  src: [
    { path: '../public/fonts/right-grotesk/PPRightGrotesk-Regular-sub.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/right-grotesk/PPRightGrotesk-Bold-sub.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-heading',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

export const diatype = localFont({
  src: [
    { path: '../public/fonts/diatype/ABCDiatype-Regular-sub.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/diatype/ABCDiatype-Medium-sub.woff2', weight: '500', style: 'normal' },
    // Diatype leveres ikke i Semibold/Bold her — registrer Medium som ekte
    // 600/700-snitt. Uten dette SYNTETISERER nettleseren fetning for
    // font-semibold/font-bold, og Safaris syntetiske bold er tykk og smurt
    // («alle tekstene ser rare/bold ut»). Ekte glyfer = identisk i alle nettlesere.
    { path: '../public/fonts/diatype/ABCDiatype-Medium-sub.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/diatype/ABCDiatype-Medium-sub.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

/* Editorial serif til nettsidens display-stemme (ikke til produkt-UI).
   Brukes forelopig kun av forside V4. */
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
  /* Brukes bare i admin (nyhetsbrev-editor) og omvisningen — ikke preload på alle sider (4 filer / 44 KB i den
     kritiske stien på forsiden). Fonten hentes av nettleseren når en side faktisk bruker den. */
  preload: false,
});
