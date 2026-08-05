// Forfatter-register (Person-entiteter) for E-E-A-T + AEO.
// Navngitte forfattere gir langt sterkere tillit hos både Google og AI-motorer
// (ChatGPT, Perplexity, AI Overviews) enn en anonym «Organization»-forfatter.
import { site } from '@/lib/site';

export const authors = {
  'sarah-sleeman': {
    id: 'sarah-sleeman',
    name: 'Sarah Sleeman',
    role: 'Daglig leder & eiendomsmegler',
    bio: 'Sarah Sleeman er daglig leder og ansvarlig eiendomsmegler i DigiHome. Hun leder selskapets forvaltning av 30+ eiendommer i Bergen og har ansvar for utleiestrategi, prising og leietakeroppfølging.',
    url: `${site.url}/om-oss`,
    sameAs: [site.social.linkedin],
    initials: 'SS',
    accent: '#cf97fc',
    // Hvit tekst på denne lyse lavendelen gir 2,2:1 — derfor mørk skrift.
    fg: '#3d1d63',
  },
  'martin-kviteberg': {
    id: 'martin-kviteberg',
    name: 'Martin Kviteberg',
    role: 'Partner & forretningsutvikling',
    bio: 'Martin Kviteberg er partner i DigiHome med ansvar for forretningsutvikling, teknologi og vekst. Han jobber med å skalere DigiHomes AI-drevne forvaltningsmodell til nye byer.',
    url: `${site.url}/om-oss`,
    sameAs: [site.social.linkedin],
    initials: 'MK',
    accent: '#7c3aed',
    fg: '#ffffff',
  },
};

export const authorList = Object.values(authors);

export function findAuthorByName(name) {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  return authorList.find((a) => a.name.toLowerCase() === n) || null;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Stabil, deterministisk «tilfeldig» tildeling per artikkel:
//  - Hvis artikkelen allerede har en kjent forfatter → bruk den.
//  - Ellers velges en fast forfatter basert på hash av slug (samme artikkel
//    får alltid samme forfatter, men fordelingen sprer seg jevnt).
export function getAuthorForPost(post) {
  const byName = findAuthorByName(post && post.author);
  if (byName) return byName;
  const key = (post && (post.slug || post.id || post.title)) || '';
  const idx = hashStr(String(key)) % authorList.length;
  return authorList[idx];
}
