/* ---------------------------------------------------------------------------
   Samarbeid-deck · designtokens.
   Alt tegnes på en fast scene (1280×720) som skaleres som helhet – typografi i
   absolutte px, aldri etter skjermbredden. Papir (stein), blekk, og ÉN kilde til
   lys: DigiHome-lilla – kun der noe skjer. Mørk palett for seksjoner som trenger det.
--------------------------------------------------------------------------- */

export const W = 1280;
export const H = 720;
/* Scenen skaleres aldri over dette. 1,4 fyller en 1920/2000-skjerm uten at scenen blir en frimerkeflate. */
export const MAX_SCALE = 1.4;
/* Under denne bredden rendres seksjonene som én flytende side (mobil). */
export const FLOW_BELOW = 640;

export const FONT = "var(--font-body), 'ABC Diatype', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const DISPLAY = "var(--font-heading), 'PP Right Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const ease = [0.22, 1, 0.36, 1];

export const PALETTES = {
  light: {
    bg: '#F3F1EC', ink: '#15130F', ink2: 'rgba(21,19,15,0.66)', muted: 'rgba(21,19,15,0.46)',
    hair: 'rgba(21,19,15,0.09)', rule: 'rgba(21,19,15,0.17)',
    accent: '#B977EC', glow: '212,150,255', dim: 0.75, logo: 'dark', card: '#FFFFFF',
  },
  dark: {
    bg: '#15130F', ink: '#F4F1EA', ink2: 'rgba(244,241,234,0.66)', muted: 'rgba(244,241,234,0.42)',
    hair: 'rgba(244,241,234,0.10)', rule: 'rgba(244,241,234,0.17)',
    accent: '#D496FF', glow: '212,150,255', dim: 1, logo: 'light', card: 'rgba(244,241,234,0.05)',
  },
};

/* Scenens marger. Logo og meny ligger i skjermens hjørner (utenfor scenen). */
export const PAD_X = 80;
export const PAD_TOP = 96;
export const FOOTER_H = 44;
export const PAD_BOTTOM = 28;

export const nn = (i) => String(i + 1).padStart(2, '0');
