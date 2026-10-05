/** Tilgangen til /samarbeid (den private invitasjonen). Brukes av BÅDE server-komponenten (app/samarbeid) og API-ruten (/api/samarbeid/auth),
 *  slik at sjekken er identisk begge steder: cookien er en sha256 av et eget hemmelig passord (SAMARBEID_PASSWORD) – ingen fallback til DECK_PASSWORD.
 *  Innholdet i brevet rendres kun server-side når cookien er gyldig; teksten sendes aldri til nettlesere uten sesjon. */
import crypto from 'crypto';

export const SAMARBEID_COOKIE = 'dh_samarbeid';
/** 7 dager – kortere enn de 30 vi hadde. Mottakerne kan alltid skrive passordet på nytt. */
export const SAMARBEID_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const samarbeidPassord = () => (process.env.SAMARBEID_PASSWORD || '').toString();

/** Cookie-verdien for gjeldende passord. Bytter man passord, faller alle eksisterende sesjoner. */
export const samarbeidToken = () => {
  const pw = samarbeidPassord();
  return pw ? crypto.createHash('sha256').update(`dh-samarbeid::${pw}`).digest('hex') : '';
};

/** Konstant-tid sammenligning av cookie mot forventet token. */
export const samarbeidAutentisert = (cookieValue) => {
  const t = samarbeidToken();
  if (!t || !cookieValue) return false;
  const a = Buffer.from(String(cookieValue));
  const b = Buffer.from(t);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Passordsjekk i konstant tid. */
export const samarbeidPassordRiktig = (forsoek) => {
  const pw = samarbeidPassord();
  if (!pw || typeof forsoek !== 'string') return false;
  const a = Buffer.from(forsoek);
  const b = Buffer.from(pw);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const samarbeidCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: SAMARBEID_COOKIE_MAX_AGE,
  secure: process.env.NODE_ENV === 'production',
});
