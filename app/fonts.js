import localFont from 'next/font/local';

export const rightGrotesk = localFont({
  src: [
    { path: '../public/fonts/right-grotesk/PPRightGrotesk-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/right-grotesk/PPRightGrotesk-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-heading',
  display: 'swap',
});

export const diatype = localFont({
  src: [
    { path: '../public/fonts/diatype/ABCDiatype-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/diatype/ABCDiatype-Medium.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
});
