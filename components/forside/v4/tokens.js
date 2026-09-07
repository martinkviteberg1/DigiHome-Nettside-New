/* ---------------------------------------------------------------------------
   V4 — designtokens uten 'use client'. Kan importeres fra server-komponenter
   (artikkelmaler, SEO-sider) og fra klientkomponenter. motion.js re-eksporterer
   disse, så eksisterende importer fra '../motion' fungerer som før.
--------------------------------------------------------------------------- */

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // expo-out

export const T = {
  canvas: '#F3F1EC',   // stein, ikke krem — nøytral nok til å ikke lese «editorial AI»
  flate: '#EDEAE3',    // tonal flate bak høyre panel — ett hakk mørkere enn canvas
  tint: '#EAE7E0',     // svak tone for én aktiv rad
  ink: '#15130F',
  charcoal: '#221F1A', // varm, dyp charcoal — for det ene objektet som får være mørkt
  plomme: '#241C27',   // dyp, varm plomme — produktseksjonens egen verden
  offwhite: '#F4F1EA',
  lilla: '#D496FF',    // DigiHome-lilla: primærhandling, ikke bare punktumet
  lillaHover: '#C98BF7',
  gronn: '#1F9D55',
};

/* Appens fonter. PP Right Grotesk = display/overskrifter. ABC Diatype = alt UI (arver fra body). */
export const heading = { fontFamily: 'var(--font-heading), sans-serif' };

/* Nettsidens display-stemme: stor, arkitektonisk grotesk med tight sporing. */
export const display = { fontFamily: 'var(--font-heading), sans-serif', fontWeight: 400, letterSpacing: '-0.035em', lineHeight: 0.94, textWrap: 'balance' };
/* Bakoverkompatibel — V4 er nå låst til grotesk. */
export const displayFor = () => display;

/* Tusenskille med ubrytelig mellomrom (U+00A0 — finnes i alle fontene). */
export const tall = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

/* Delte farger for tekstnivåer */
export const DIM = 'rgba(21,19,15,0.64)';
export const SVAK = 'rgba(21,19,15,0.5)';
export const HAIR = 'rgba(21,19,15,0.12)';
