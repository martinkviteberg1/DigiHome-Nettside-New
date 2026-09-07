import { bilde } from './Kino';

/* ---------------------------------------------------------------------------
   Scenefotoene i kino-modus — høyoppløste kilder (Real-ESRGAN, se scripts/oppskaler.py).
   srcSet velger 1200 → 1920 → 2400/3200/3840 etter skjerm (sizes=100vw), så retina får skarpe bilder.
   iw/ih = proporsjoner (til å feste etiketter), pos = utsnitt desktop, posLiten = utsnitt mobil,
   tema = hva teksten skal være på dette fotoet: 'mork' (offwhite på kveld/natt) eller 'lys' (blekk på lyse rom).
   NB: bare filer som finnes i /public skal stå her — en manglende kandidat gir svart bilde.
   Faller likevel tilbake til den minste kilden om en kandidat ikke kan lastes (onError i KinoStage).
--------------------------------------------------------------------------- */

const A = '/v4/annonse';
const D = '/v4/drift';

export const FOTO = {
  fasadeKveld: bilde('fasade', [[1200, `${A}/fasade-kveld-1200.webp`], [1920, `${A}/fasade-kveld-1920.webp`], [3840, `${A}/fasade-kveld-3840.webp`]], 1920, 1097, '56% 46%', '70% 50%', 'mork'),
  fasadeNatt: bilde('natt', [[1200, `${D}/fasade-natt-1200.webp`], [1920, `${D}/fasade-natt-1920.webp`], [3840, `${D}/fasade-natt-3840.webp`]], 1920, 1097, '56% 46%', '70% 50%', 'mork'),
  fasadeMorgen: bilde('morgen', [[1200, `${D}/fasade-morgen-1200.webp`], [1920, `${D}/fasade-morgen-1920.webp`], [3840, `${D}/fasade-morgen-3840.webp`]], 1920, 1097, '56% 46%', '70% 50%', 'lys'),
  kjokken: bilde('kjokken', [[1280, `${A}/kjokken-1280.webp`], [1920, `${A}/kjokken-1920.webp`], [3200, `${A}/kjokken-3200.webp`]], 1280, 853, '50% 50%', '42% 50%', 'lys'),
  soveromUseng: bilde('soverom-useng', [[1000, `${A}/soverom-useng-1000.webp`], [1920, `${A}/soverom-useng-1920.webp`], [3200, `${A}/soverom-useng-3200.webp`]], 1000, 667, '50% 50%', '46% 50%', 'lys'),
  soverom: bilde('soverom', [[1000, `${A}/soverom-1000.webp`], [1920, `${A}/soverom-1920.webp`], [3200, `${A}/soverom-3200.webp`]], 1000, 667, '50% 50%', '46% 50%', 'lys'),
  spisestue: bilde('spisestue', [[1280, `${A}/spisestue-1280.webp`], [1920, `${A}/spisestue-1920.webp`], [2560, `${A}/spisestue-2560.webp`]], 1280, 853, '50% 50%', '56% 50%', 'lys'),
  stue: bilde('stue', [[1200, `${A}/stue-tom-1200.webp`], [1920, `${A}/stue-tom-1920.webp`], [2400, `${A}/stue-tom-2400.webp`]], 1200, 800, '50% 50%', '42% 50%', 'lys'),
  moblert: bilde('moblert', [[1200, `${A}/stue-moblert-1200.webp`], [1920, `${A}/stue-moblert-1920.webp`], [2400, `${A}/stue-moblert-2400.webp`]], 1200, 800, '50% 50%', '45% 50%', 'lys'),
};

/* Små versjoner til miniatyrer */
export const MINI = {
  stue: `${A}/stue-tom-700.webp`,
  kjokken: `${A}/kjokken-600.webp`,
  soverom: `${A}/soverom-700.webp`,
  spisestue: `${A}/spisestue-600.webp`,
  fasade: `${A}/fasade-kveld-1200.webp`,
};

/* Vinduene i fasaden (andel av bildet) — samme utsnitt i kveld, natt og morgen. Leilighet 2 = Emma. */
export const VINDU = {
  1: { x: 0.345, y: 0.62 },
  2: { x: 0.755, y: 0.57 },
  3: { x: 0.60, y: 0.60 },
  4: { x: 0.962, y: 0.56 },
  5: { x: 0.36, y: 0.26 },
  6: { x: 0.46, y: 0.23 },
  7: { x: 0.60, y: 0.22 },
  8: { x: 0.755, y: 0.19 },
};
