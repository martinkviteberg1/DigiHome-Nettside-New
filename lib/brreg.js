// ── ENHETSREGISTERET (BRØNNØYSUND) ──────────────────────────────────────────
// Slår opp selskap på NAVN eller ORGANISASJONSNUMMER. Åpne data (NLOD), ingen
// API-nøkkel. Vi går via server for tre grunner: vi slipper CORS, vi kan cache,
// og vi kan validere kontrollsifferet FØR vi belaster et offentlig register.
//
// Hvorfor dette betyr noe i skjemaet: et selskapsnavn tastet fritt er en
// gjetning. Et org.nr fra registeret er en identitet — det er den som skal stå
// på leiekontrakten, honoraravtalen og fakturaen. Vi henter derfor navn,
// organisasjonsform og adresse fra kilden, og advarer hvis selskapet er
// konkurs, under avvikling eller slettet.
//
// API-detaljer (verifisert mot data.brreg.no/enhetsregisteret/api/dokumentasjon):
//   navnesøk  GET /enheter?navn=<q>&navnMetodeForSoek=FORTLOEPENDE&size=8
//   oppslag   GET /enheter/{orgnr}   → 404 ukjent · 410 fjernet · 200 m/slettedato
//   Accept    application/vnd.brreg.enhetsregisteret.enhet.v2+json

const BASE = 'https://data.brreg.no/enhetsregisteret/api';
const HEADERS = {
  Accept: 'application/vnd.brreg.enhetsregisteret.enhet.v2+json',
  'User-Agent': 'digihome-no/1.0 (+https://digihome.no; hei@digihome.no)',
};

export const normalizeOrgNr = (value) => String(value ?? '').replace(/[^\d]/g, '');

// Mod-11 med vektene 3,2,7,6,5,4,3,2. Kontrollsiffer 10 finnes ikke → ugyldig.
export function isValidOrgNr(value) {
  const orgnr = normalizeOrgNr(value);
  if (!/^\d{9}$/.test(orgnr)) return false;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, w, i) => total + Number(orgnr[i]) * w, 0);
  const check = 11 - (sum % 11);
  if (check === 10) return false;
  return (check === 11 ? 0 : check) === Number(orgnr[8]);
}

export const formatOrgNr = (value) => {
  const n = normalizeOrgNr(value);
  return n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : n;
};

const addressOf = (a) => {
  if (!a || typeof a !== 'object') return null;
  // «adresse» er en ARRAY av linjer i registeret — ikke en streng.
  const street = Array.isArray(a.adresse) ? a.adresse.filter(Boolean).join(', ') : String(a.adresse || '');
  if (!street && !a.postnummer && !a.poststed) return null;
  return {
    street: street || '',
    postalCode: a.postnummer || '',
    city: a.poststed || '',
    municipality: a.kommune || '',
    country: a.land || 'Norge',
  };
};

// Én linje et menneske kan lese, til kvittering og varsel-e-post.
export const companyLine = (c) => {
  if (!c) return '';
  const addr = c.address ? [c.address.street, [c.address.postalCode, c.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';
  return [c.name, c.orgNo ? `org.nr ${formatOrgNr(c.orgNo)}` : '', c.formLabel, addr].filter(Boolean).join(' · ');
};

export function mapEnhet(e) {
  if (!e || typeof e !== 'object') return null;
  const bankrupt = e.konkurs === true;
  const underLiquidation = e.underAvvikling === true;
  const underForcedLiquidation = e.underTvangsavviklingEllerTvangsopplosning === true;
  const deletedAt = e.slettedato || null;
  // Rekkefølgen er bevisst: slettet er en sterkere sannhet enn konkurs.
  const status = deletedAt ? 'slettet'
    : underForcedLiquidation ? 'tvangsavvikling'
      : bankrupt ? 'konkurs'
        : underLiquidation ? 'under avvikling'
          : 'aktiv';
  const warning = {
    slettet: 'Selskapet er slettet i Enhetsregisteret.',
    tvangsavvikling: 'Selskapet er under tvangsavvikling eller tvangsoppløsning.',
    konkurs: 'Selskapet er registrert konkurs.',
    'under avvikling': 'Selskapet er under avvikling.',
  }[status] || null;

  return {
    orgNo: e.organisasjonsnummer ? String(e.organisasjonsnummer) : '',
    name: e.navn || '',
    formCode: e.organisasjonsform?.kode || '',
    formLabel: e.organisasjonsform?.beskrivelse || '',
    address: addressOf(e.forretningsadresse) || addressOf(e.postadresse),
    mva: e.registrertIMvaregisteret === true,
    registeredAt: e.registreringsdatoEnhetsregisteret || null,
    bankrupt,
    underLiquidation,
    underForcedLiquidation,
    deletedAt,
    employees: Number.isFinite(e.antallAnsatte) ? e.antallAnsatte : null,
    industry: e.naeringskode1 ? { code: e.naeringskode1.kode || '', label: e.naeringskode1.beskrivelse || '' } : null,
    status,
    warning,
  };
}

// Liten TTL-cache i minnet. Et offentlig skjema skal ikke hamre på et
// fellesgode-register, og navnesøk er identisk for mange brukere.
const cache = new Map();
const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.exp <= Date.now()) { cache.delete(key); return null; }
  return hit.value;
};
const cacheSet = (key, value, seconds) => {
  if (cache.size > 500) for (const k of [...cache.keys()].slice(0, 200)) cache.delete(k);
  cache.set(key, { value, exp: Date.now() + seconds * 1000 });
};

async function brregFetch(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { headers: HEADERS, signal: ctrl.signal, cache: 'no-store' });
    const text = await r.text().catch(() => '');
    let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
    return { status: r.status, ok: r.ok, json, retryAfter: r.headers.get('retry-after') };
  } catch (e) {
    return { status: 0, ok: false, json: null, error: e?.name === 'AbortError' ? 'tidsavbrudd' : String(e?.message || e) };
  } finally { clearTimeout(timer); }
}

// Direkte oppslag. Brukes både av skjemaet og av serveren når et lead lagres —
// vi stoler ikke på at navnet klienten sendte hører til org.nr-et klienten sendte.
export async function lookupOrgNo(value) {
  const orgnr = normalizeOrgNr(value);
  if (orgnr.length !== 9) return { ok: false, mode: 'orgnr', items: [], message: 'Organisasjonsnummer må ha ni siffer' };
  if (!isValidOrgNr(orgnr)) return { ok: false, mode: 'orgnr', items: [], invalid: true, message: 'Ugyldig organisasjonsnummer — kontrollsifferet stemmer ikke' };

  const key = `orgnr:${orgnr}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, source: 'cache' };

  const res = await brregFetch(`${BASE}/enheter/${orgnr}`);
  if (res.status === 404) {
    const out = { ok: true, mode: 'orgnr', items: [], notFound: true, message: 'Fant ikke selskapet i Enhetsregisteret' };
    cacheSet(key, out, 300);
    return out;
  }
  // 410 = fjernet av juridiske grunner. Vi vet at nummeret fantes, men kan ikke bruke det.
  if (res.status === 410) {
    const out = { ok: true, mode: 'orgnr', items: [], notFound: true, removed: true, message: 'Selskapet er fjernet fra Enhetsregisteret' };
    cacheSet(key, out, 300);
    return out;
  }
  if (!res.ok || !res.json) {
    return { ok: false, mode: 'orgnr', items: [], unavailable: true, message: 'Enhetsregisteret svarer ikke akkurat nå', retryAfter: res.retryAfter || null };
  }
  const item = mapEnhet(res.json);
  const out = { ok: true, mode: 'orgnr', items: item ? [item] : [] };
  // Kort TTL: konkurs-/slettestatus skal ikke se ferskere ut enn den er.
  cacheSet(key, out, 600);
  return out;
}

// Registeret sorterer alfabetisk. Da havner «ANSATTE DNB LARVIK
// INTERESSEKLUBB» over «DNB BANK ASA» når noen skriver «DNB» — ubrukelig i et
// skjema. Vi henter derfor flere treff og rangerer dem etter hvor godt navnet
// faktisk matcher, med konkurs/slettede nederst.
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rankByName(items, query) {
  const q = String(query || '').trim().toLowerCase();
  const wordStart = new RegExp(`(^|[^a-zà-ÿ0-9])${escapeRe(q)}`, 'i');
  const score = (it) => {
    const n = String(it.name || '').toLowerCase();
    let s = n === q ? 0 : n.startsWith(q) ? 1 : wordStart.test(n) ? 2 : 3;
    if (it.status !== 'aktiv') s += 4;
    return s;
  };
  return [...items].sort((a, b) => score(a) - score(b)
    || String(a.name).length - String(b.name).length
    || String(a.name).localeCompare(String(b.name), 'nb'));
}

export async function searchByName(name) {
  const q = String(name || '').trim().slice(0, 180);
  if (q.length < 2) return { ok: true, mode: 'navn', items: [] };
  const key = `navn:${q.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, source: 'cache' };

  const params = new URLSearchParams({ navn: q, navnMetodeForSoek: 'FORTLOEPENDE', size: '25', page: '0', sort: 'navn,ASC' });
  const res = await brregFetch(`${BASE}/enheter?${params}`);
  if (!res.ok || !res.json) {
    return { ok: false, mode: 'navn', items: [], unavailable: true, message: 'Enhetsregisteret svarer ikke akkurat nå', retryAfter: res.retryAfter || null };
  }
  const all = (res.json?._embedded?.enheter || []).map(mapEnhet).filter(Boolean);
  const out = { ok: true, mode: 'navn', items: rankByName(all, q).slice(0, 8), total: res.json?.page?.totalElements ?? all.length };
  cacheSet(key, out, 90);
  return out;
}

// Ett inngangspunkt for skjemaet: brukeren skal ikke måtte velge søkemodus.
// Bare siffer = org.nr, alt annet = navn. Vi sender ikke halve numre til registeret.
export async function searchBrreg(query) {
  const raw = String(query || '').trim();
  if (raw.length < 2) return { ok: true, mode: 'tom', items: [] };
  const digits = normalizeOrgNr(raw);
  const numericOnly = /^[\d\s.-]+$/.test(raw) && digits.length > 0;
  if (numericOnly) {
    if (digits.length < 9) return { ok: true, mode: 'orgnr', items: [], incomplete: true, message: 'Organisasjonsnummer har ni siffer' };
    return lookupOrgNo(digits);
  }
  return searchByName(raw);
}
