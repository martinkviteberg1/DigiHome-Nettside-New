/* Registeret: rekkefølgen, navnene i skinnen, tonen og lyset per seksjon. Deck leser bare dette. */
import { Cover, COVER_END, COVER_LIGHT, COVER_LIGHT_DELAY, COVER_LIGHT_DURATION, COVER_LIGHT_FROM } from './slides/Cover';
import { Malbilde, MALBILDE_END, MALBILDE_LIGHT, MALBILDE_LIGHT_DELAY } from './slides/Malbilde';
import { ViBygger, VI_BYGGER_END, VI_BYGGER_LIGHT, VI_BYGGER_LIGHT_DELAY } from './slides/ViBygger';
import { Tilbudet, TILBUDET_END, TILBUDET_LIGHT, TILBUDET_LIGHT_DELAY } from './slides/Tilbudet';

export const SLIDES = [
  { id: 'cover', tone: 'dark', nav: 'Cover', Component: Cover, duration: COVER_END, light: { from: COVER_LIGHT_FROM, to: COVER_LIGHT, size: 1100, strength: 0.17, delay: COVER_LIGHT_DELAY, duration: COVER_LIGHT_DURATION } },
  { id: 'malbildet', tone: 'light', nav: 'Målbildet', Component: Malbilde, duration: MALBILDE_END, light: { to: MALBILDE_LIGHT, size: 900, strength: 0.16, delay: MALBILDE_LIGHT_DELAY, duration: 1.4 } },
  { id: 'vi-bygger', tone: 'light', nav: 'Vi bygger', Component: ViBygger, duration: VI_BYGGER_END, light: { to: VI_BYGGER_LIGHT, size: 1000, strength: 0.15, delay: VI_BYGGER_LIGHT_DELAY, duration: 1.4 } },
  { id: 'tilbudet', tone: 'light', nav: 'Tilbudet', Component: Tilbudet, duration: TILBUDET_END, light: { to: TILBUDET_LIGHT, size: 900, strength: 0.16, delay: TILBUDET_LIGHT_DELAY, duration: 1.2 } },
];

export const CONFIG = {
  id: 'samarbeid',
  slides: SLIDES,
  root: '/samarbeid',
  title: 'DigiHome Tech – tilbud',
  brandOnCover: false,
  coverClick: true,
  preload: ['/brand/tilbud-cover-bergen.jpg', '/team-erik.webp', '/brand/sarah-sleeman-360.webp', '/v4/martin-320.webp'],
};

/* URL-segment → indeks i registeret: id eller 1-basert tall. */
export const indexIn = (param) => {
  if (!param) return 0;
  const i = SLIDES.findIndex((s) => s.id === param);
  if (i >= 0) return i;
  const n = Number(param);
  return Number.isInteger(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0;
};
