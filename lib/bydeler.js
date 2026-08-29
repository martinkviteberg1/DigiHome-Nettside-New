/* ═══════════════════════════════════════════════════════════════════════════
   BYDELER — naturlige leiemarked-områder fra postnummer (Bergen + omegn).
   Ren klient-trygg funksjon (ingen server-avhengigheter) — brukes både i
   Salgsradar-UI (kolonne, filter, skuff) og kan gjenbrukes server-side.
   Heuristikk: postnummer-soner, ikke offisielle bydelsgrenser — poenget er
   at selgerne kan jobbe område for område.
   ═══════════════════════════════════════════════════════════════════════ */

// Eksplisitte sentrale postnummer der sonene er finmasket
const EKSPLISITT = {
  5003: 'Sentrum', 5004: 'Nordnes', 5005: 'Sentrum', 5006: 'Sentrum',
  5007: 'Sentrum', 5008: 'Sentrum', 5009: 'Kalfaret', 5010: 'Sentrum',
  5011: 'Nordnes', 5012: 'Sentrum', 5013: 'Sentrum', 5014: 'Sentrum',
  5015: 'Sentrum', 5016: 'Sentrum', 5017: 'Sentrum', 5018: 'Sentrum',
  5019: 'Kalfaret', 5020: 'Sentrum', 5021: 'Fløen', 5022: 'Fløen',
};

// Soner (fra–til, inklusiv). Rekkefølgen betyr noe — første treff vinner.
const SONER = [
  [5030, 5039, 'Sandviken'],
  [5040, 5049, 'Gyldenpris'],
  [5050, 5059, 'Danmarksplass'],
  [5060, 5079, 'Minde/Wergeland'],
  [5080, 5099, 'Landås'],
  [5100, 5139, 'Åsane'],
  [5140, 5149, 'Fyllingsdalen'],
  [5150, 5159, 'Bønes'],
  [5160, 5169, 'Laksevåg'],
  [5170, 5179, 'Loddefjord'],
  [5200, 5219, 'Os'],
  [5220, 5249, 'Fana/Nesttun'],
  [5250, 5259, 'Ytrebygda'],
  [5260, 5269, 'Arna'],
  [5300, 5329, 'Askøy'],
  [5330, 5399, 'Sotra/Øygarden'],
];

export function bydelFraPostnr(postnr) {
  const n = parseInt(String(postnr || '').trim(), 10);
  if (!Number.isFinite(n)) return '';
  if (EKSPLISITT[n]) return EKSPLISITT[n];
  for (const [fra, til, navn] of SONER) {
    if (n >= fra && n <= til) return navn;
  }
  return '';
}
