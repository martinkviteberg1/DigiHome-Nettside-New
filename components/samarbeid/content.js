/* ---------------------------------------------------------------------------
   Samarbeid-decket · innhold. Alt som er tekst og tall står her – komponentene
   er bare form. Endre tallene her, ikke i scenene.
--------------------------------------------------------------------------- */

export const DECK_VERSION = '2026-10-04';

/* Tilbudet. Verdsettelse er pre-money; emisjonen regnes ut slik at mottakerne eier ANDEL etter emisjonen. */
export const TILBUD = {
  verdsettelse: 10_000_000,
  andel: 0.10,
  selskap: 'DigiHome Tech AS',
  vesting: false,
};
export const emisjon = () => Math.round(TILBUD.verdsettelse * TILBUD.andel / (1 - TILBUD.andel));           // ≈ 1 111 111
export const postMoney = () => TILBUD.verdsettelse + emisjon();                                                // ≈ 11 111 111
export const mnok = (n, d = 1) => `${(n / 1_000_000).toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d })} MNOK`;

/* Mottakere og avsendere. */
export const MOTTAKERE = ['Martin Vikesland', 'Øyvind Storli Hoel'];
export const AVSENDERE = [
  { navn: 'Erik Hoffmann-Dahl', rolle: 'Styreleder', img: '/team-erik.webp', pos: '50% 22%' },
  { navn: 'Sarah Sleeman', rolle: 'Daglig leder', img: '/brand/sarah-sleeman-360.webp', pos: '50% 30%' },
  { navn: 'Martin C. Kviteberg', rolle: 'Produkt og teknologi', img: '/v4/martin-320.webp', pos: '50% 20%' },
];

export const COVER = {
  eyebrow: 'Tilbud · oktober 2026 · konfidensielt',
  til: `Til ${MOTTAKERE[0]} og ${MOTTAKERE[1]}`,
  lines: ['DigiHome Tech'],
  lead: 'En invitasjon til å bli medeiere i teknologiselskapet bak DigiHome – plattformen som skal gjøre oss til utfordreren til Utleiemegleren.',
  fra: 'Fra',
};

export const MALBILDE = {
  kicker: 'Takk for sist · slik leser vi målbildet',
  lines: ['Vi leser målbildet likt.'],
  lead: 'Lange kontrakter i Norge – vunnet med høyere effektivitet, bedre kundeopplevelse og et mer moderne merke enn Utleiemegleren. Først Bergen. Så Oslo og resten av landet. Plattformen internasjonalt som et parallelt spor.',
  steg: [
    { label: 'Bergen', at: 0, tone: 'ink', caption: 'Vinne hjemmemarkedet først – med forvaltning og tech tett sammen.' },
    { label: 'Oslo', at: 0.34, tone: 'soft', caption: 'De store byene – der volumet og korttidsmarkedet er.' },
    { label: 'Norge', at: 0.67, tone: 'soft', caption: 'Nasjonal utfordrer til Utleiemegleren.' },
    { label: 'Internasjonalt', at: 1, tone: 'muted', caption: 'Plattformen som eget spor – uavhengig av egen forvaltning.' },
  ],
  segmenter: [{ from: 0, to: 0.34, style: 'glow' }, { from: 0.34, to: 0.67, style: 'solid' }, { from: 0.67, to: 1, style: 'fade' }],
  to: [
    { navn: 'Forvaltning', tekst: 'Eget selskap, rigget for vekst i Norge. Egne folk, lokal drift og kompetansen fra Bergen Beds. Kunde av Tech – på pilotvilkår i starten.' },
    { navn: 'Tech', tekst: 'Eget selskap. Bygger og eier plattformen – og selger den til forvaltere og eiendomsselskaper utover vår egen drift.' },
  ],
  punch: 'Dette tilbudet gjelder Tech.',
};

export const VI_BYGGER = {
  kicker: 'Vi bygger',
  lines: ['Forvaltning', 'som programvare.'],
  lead: 'Alt en forvalter gjør manuelt i dag – leieforhold, innbetalinger, fakturering, saker, eierrapport – samlet i ett system som eieren, leietakeren og forvalteren deler.',
  left: 'Forvalteren · én arbeidsflate for hele porteføljen',
  right: 'Eieren · egen app, full innsikt, hjelp fra assistenten',
  punch: 'Én plattform. Ett datasett. Langt flere enheter per ansatt – og en kundeopplevelse bransjen ikke har i dag.',
  under: 'Leietakeren møter det samme systemet: kontrakt, betaling, saker og svar – i appen, ikke på telefon.',
};

export const TILBUDET = {
  kicker: `Tilbudet · ${TILBUD.selskap}`,
  lines: ['Vi inviterer dere inn', 'på ti prosent.'],
  big: `${Math.round(TILBUD.andel * 100)} %`,
  small: `${Math.round((1 - TILBUD.andel) * 100)} %`,
  left: ['Dere', `${Math.round(TILBUD.andel * 100)} % av aksjene i ${TILBUD.selskap} – nye aksjer i en rettet emisjon.`],
  right: ['Dagens eiere', 'Gründerne og holdingselskapet beholder resten.'],
  fakta: [
    { k: 'Verdsettelse', v: mnok(TILBUD.verdsettelse, 0), s: 'pre-money' },
    { k: 'Emisjon', v: `≈ ${mnok(emisjon(), 1)}`, s: `nye aksjer · ${mnok(postMoney(), 1)} etter emisjonen` },
    { k: 'Vilkår', v: 'Ordinære aksjer', s: TILBUD.vesting ? 'Opptjenes over tid.' : 'Ingen vesting. Samme aksjeklasse som gründerne.' },
  ],
  quiet: 'Kapitalen går inn i selskapet – til produkt og salg. Forvaltningsselskapet er pilotkunde på egne vilkår, ikke part i emisjonen.',
};
