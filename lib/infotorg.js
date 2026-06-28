/**
 * DigiHome — Infotorg Eiendomsregisteret (EDR) integrasjon (Node-port).
 *
 * SOAP/XML-klient mot Infotorg EDROnline. Adresse → matrikkel (via Kartverket),
 * deretter eiendom/seksjoner/hjemmelshaver/borettslag-andeler fra EDR.
 *
 * Portert fra plattformens backend/integrations/infotorg.py (Python/lxml) til
 * Node + fast-xml-parser. Brukes av markedssidens /bli-utleier-skjema slik at
 * en eier kan velge sin seksjon/andel.
 *
 * Credentials hentes KUN fra miljøvariabler (.env):
 *   INFOTORG_USERNAME, INFOTORG_PASSWORD, INFOTORG_ENV ("test" | "prod")
 */
import { XMLParser } from 'fast-xml-parser';

const ENDPOINTS = {
  test: 'https://ws-test.infotorg.no/ws/NE/EDROnline.pl',
  prod: 'https://ws.infotorg.no/ws/NE/EDROnline.pl',
};
const NS_EDR = 'http://ws.infotorg.no/xml/NE/EDROnline/2017-01-23/EDROnline.xsd';
const KARTVERKET_ADDR_API = 'https://ws.geonorge.no/adresser/v1';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true });

function cfg() {
  return {
    user: process.env.INFOTORG_USERNAME || '',
    pass: process.env.INFOTORG_PASSWORD || '',
    env: (process.env.INFOTORG_ENV || 'test').toLowerCase(),
  };
}

export function infotorgConfigured() {
  const c = cfg();
  return !!(c.user && c.pass);
}

function endpoint() {
  const c = cfg();
  return ENDPOINTS[c.env] || ENDPOINTS.test;
}

// Sesjons-id gjenbrukes mellom kall (langtlevende prosess). Tømmes ved stale-feil.
let _sessionId = '';

// ── XML-traversering (namespace-agnostisk etter removeNSPrefix) ───────────────
function collect(node, name, out = []) {
  if (node == null || typeof node !== 'object') return out;
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('@_') || k === '#text') continue;
    const arr = Array.isArray(v) ? v : [v];
    for (const item of arr) {
      if (k === name) out.push(item);
      if (item && typeof item === 'object') collect(item, name, out);
    }
  }
  return out;
}
const attr = (n, k) => (n && typeof n === 'object' ? n['@_' + k] : undefined);
const txt = (n) => (n == null ? null : typeof n === 'object' ? n['#text'] ?? null : n);
const firstByName = (node, name) => collect(node, name)[0];

// Alle objekt-noder (element-noder) i treet — for attributt-basert matching.
function allNodes(node, out = []) {
  if (node == null || typeof node !== 'object') return out;
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('@_') || k === '#text') continue;
    const arr = Array.isArray(v) ? v : [v];
    for (const item of arr) {
      if (item && typeof item === 'object') { out.push(item); allNodes(item, out); }
    }
  }
  return out;
}

function buildEnvelope(bodyXml, ref) {
  const c = cfg();
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:brukersesjon="http://ws.infotorg.no/xml/Admin/Brukersesjon/2006-07-07/Brukersesjon.xsd"
  xmlns:transaksjon="http://ws.infotorg.no/xml/Admin/Transaksjon/2006-07-07/Transaksjon.xsd"
  xmlns:edr="${NS_EDR}">
  <soap:Header>
    <brukersesjon:Brukersesjon>
      <distribusjonskanal>PTP</distribusjonskanal>
      <systemnavn>DigiHome</systemnavn>
      <brukernavn>${c.user}</brukernavn>
      <passord>${c.pass}</passord>
      ${_sessionId ? `<sesjonsid>${_sessionId}</sesjonsid>` : ''}
    </brukersesjon:Brukersesjon>
    <transaksjon:Transaksjon><referanse>${ref}</referanse></transaksjon:Transaksjon>
  </soap:Header>
  <soap:Body>${bodyXml}</soap:Body>
</soap:Envelope>`;
}

class InfotorgFault extends Error {
  constructor(feilkode, feilmelding) {
    super(`Infotorg EDR feil: ${feilkode} - ${feilmelding}`);
    this.feilkode = feilkode || '';
    this.feilmelding = feilmelding || '';
  }
}

async function doRequest(bodyXml, ref) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let raw;
  try {
    const resp = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body: buildEnvelope(bodyXml, ref),
      signal: ctrl.signal,
    });
    raw = await resp.text();
  } finally {
    clearTimeout(timer);
  }
  const tree = parser.parse(raw);

  // Oppdater sesjons-id for gjenbruk
  const sid = txt(firstByName(tree, 'sesjonsid'));
  if (sid) _sessionId = String(sid);

  // SOAP Fault?
  const fault = firstByName(tree, 'Fault');
  if (fault) {
    throw new InfotorgFault(txt(firstByName(fault, 'feilkode')), txt(firstByName(fault, 'feilmelding')) || 'Ukjent feil');
  }
  return tree;
}

/**
 * Robust SOAP-kall: håndterer (1) utløpt sesjon (tøm + ny innlogging) og
 * (2) forbigående back-office-feil (kommunikasjon / ORA-xxxx) med backoff.
 */
async function callEdr(bodyXml, ref = 'digihome', maxAttempts = 4) {
  let lastExc = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await doRequest(bodyXml, ref);
    } catch (e) {
      lastExc = e;
      if (!(e instanceof InfotorgFault)) {
        // nettverk/timeout → kort backoff og prøv igjen
        if (attempt >= maxAttempts - 1) throw e;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      const fk = (e.feilkode || '').toLowerCase();
      const fm = e.feilmelding || '';
      const transient = fk.includes('kommunikasjon') || fm.toUpperCase().includes('ORA-') || fm.toLowerCase().includes('back office');
      if (attempt >= maxAttempts - 1) throw e;
      if (_sessionId) { _sessionId = ''; continue; } // stale-sesjon → ny login
      if (transient) { await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); continue; }
      throw e;
    }
  }
  throw lastExc;
}

// ── Kartverket: adresse → matrikkel (gratis, med retry mot 500/HTML) ──────────
export async function addressToMatrikkel(address) {
  let clean = (address || '').trim();
  for (const s of [', Norway', ', Norge', ',Norway', ',Norge']) {
    if (clean.toLowerCase().endsWith(s.toLowerCase())) clean = clean.slice(0, -s.length).trim();
  }
  if (!clean) return null;
  const url = `${KARTVERKET_ADDR_API}/sok?sok=${encodeURIComponent(clean)}&treffPerSide=5&utkoordsys=4326`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) { await new Promise((x) => setTimeout(x, 400)); continue; }
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) { await new Promise((x) => setTimeout(x, 400)); continue; }
      const data = await r.json();
      const hits = data.adresser || [];
      if (!hits.length) return null;
      const best = hits[0];
      return {
        kommunenr: String(best.kommunenummer ?? '').padStart(4, '0'),
        gaardsnr: String(best.gardsnummer ?? best.gaardsnummer ?? ''),
        bruksnr: String(best.bruksnummer ?? ''),
        festenr: String(best.festenummer ?? '0'),
        seksjonsnr: '0',
        adressetekst: best.adressetekst || '',
        postnummer: best.postnummer || '',
        poststed: best.poststed || best.poststedsnavn || '',
        kommunenavn: best.kommunenavn || '',
        bruksenhetsnummer: best.bruksenhetsnummer || [],
      };
    } catch (e) {
      if (attempt >= 2) return null;
      await new Promise((x) => setTimeout(x, 500));
    }
  }
  return null;
}

// ── EDR-operasjoner ───────────────────────────────────────────────────────────
export async function checkMatrikkelExists(knr, gnr, bnr) {
  const tree = await callEdr(
    `<edr:hentFinnesMatrikkelen><kommunenr>${knr}</kommunenr><gaardsnr>${gnr}</gaardsnr><bruksnr>${bnr}</bruksnr><festenr>0</festenr><seksjonsnr>0</seksjonsnr></edr:hentFinnesMatrikkelen>`,
    `exists-${knr}-${gnr}-${bnr}`,
  );
  const el = firstByName(tree, 'FinnesMatrikkelen');
  if (!el) return false;
  // Element ed21113011 bærer attributtet finnesmatrikkel; ellers let bredt.
  const direct = collect(el, 'ed21113011');
  for (const d of direct) if (attr(d, 'finnesmatrikkel') === 'true') return true;
  for (const child of collect(el, '*')) if (attr(child, 'finnesmatrikkel') === 'true') return true;
  // fallback: noen svar legger attributtet direkte på et barn
  const any = JSON.stringify(el).includes('"@_finnesmatrikkel":"true"');
  return any;
}

export async function getPropertyData(knr, gnr, bnr) {
  const result = {
    matrikkel: { kommunenr: knr, gaardsnr: gnr, bruksnr: bnr },
    eiendomstype: null,
    areal: null,
    seksjonert: false,
    bygningstype: null,
    bygningstype_kode: null,
    seksjoner: [],
    adresser: [],
  };

  // 1. hentEiendom_v2
  try {
    const tree = await callEdr(
      `<edr:hentEiendom_v2><kommunenr>${knr}</kommunenr><gaardsnr>${gnr}</gaardsnr><bruksnr>${bnr}</bruksnr><festenr>0</festenr><seksjonsnr>0</seksjonsnr></edr:hentEiendom_v2>`,
      `eiendom-${knr}-${gnr}-${bnr}`,
    );
    const ei = firstByName(tree, 'Eiendom_v2');
    if (ei) {
      const etype = firstByName(ei, 'eiendomstype');
      if (etype) result.eiendomstype = { kode: attr(etype, 'kode'), beskrivelse: attr(etype, 'beskrivelse') };
      const arealEl = firstByName(ei, 'areal');
      if (arealEl) result.areal = attr(arealEl, 'areal');
      const einfo = firstByName(ei, 'eiendomsinformasjon');
      if (einfo) result.seksjonert = attr(einfo, 'seksjonert') === 'true';
      const bygtype = firstByName(ei, 'bygningstype');
      if (bygtype) { result.bygningstype = attr(bygtype, 'beskrivelse'); result.bygningstype_kode = attr(bygtype, 'kode'); }
      for (const a of collect(ei, 'gateadresse')) {
        result.adresser.push({ gatenavn: attr(a, 'gatenavn'), nr: attr(a, 'nr'), kommune: attr(a, 'kommune') });
      }
    }
  } catch (e) { /* logges av kaller */ }

  // 2. hentGrunndata (seksjoner)
  try {
    const tree = await callEdr(
      `<edr:hentGrunndata><kommunenr>${knr}</kommunenr><gaardsnr>${gnr}</gaardsnr><bruksnr>${bnr}</bruksnr><festenr>0</festenr><seksjonsnr>0</seksjonsnr></edr:hentGrunndata>`,
      `grunndata-${knr}-${gnr}-${bnr}`,
    );
    const gd = firstByName(tree, 'Grunndata');
    if (gd) {
      for (const s of collect(gd, 'seksjon')) {
        const formaal = firstByName(s, 'formaal');
        const broek = firstByName(s, 'sameiebroek');
        result.seksjoner.push({
          snr: attr(s, 'snr'),
          knr: attr(s, 'knr'),
          gnr: attr(s, 'gnr'),
          bnr: attr(s, 'bnr'),
          formaal: txt(formaal),
          formaal_kode: attr(formaal, 'kode'),
          sameiebroek_teller: broek ? attr(broek, 'teller') : null,
          sameiebroek_nevner: broek ? attr(broek, 'nevner') : null,
        });
      }
      const info = firstByName(gd, 'info');
      if (info && (attr(info, 'tekst') || '').toLowerCase().includes('seksjonert')) result.seksjonert = true;
    }
  } catch (e) { /* logges av kaller */ }

  return result;
}

export async function getOwnerInfo(knr, gnr, bnr, snr) {
  try {
    const tree = await callEdr(
      `<edr:hentHjemmel><kommunenr>${knr}</kommunenr><gaardsnr>${gnr}</gaardsnr><bruksnr>${bnr}</bruksnr><festenr>0</festenr><seksjonsnr>${snr}</seksjonsnr></edr:hentHjemmel>`,
      `hjemmel-${knr}-${gnr}-${bnr}-${snr}`,
    );
    const hj = firstByName(tree, 'Hjemmel');
    if (!hj) return null;
    const names = [];
    let otype = 'person';
    let orgnr = '';
    for (const h of collect(hj, 'hjemmelsovergang')) {
      if (attr(h, 'aktiv') !== 'true') continue;
      for (const person of collect(h, 'person')) {
        const navn = attr(person, 'navn');
        if (!navn) continue;
        const isPerson = attr(person, 'type') === 'F';
        if (!names.includes(navn)) {
          names.push(navn);
          if (!isPerson) { otype = 'organisasjon'; orgnr = attr(person, 'id') || ''; }
        }
      }
    }
    if (!names.length) return null;
    return { navn: names.join(' / '), type: otype, orgnr };
  } catch (e) {
    return null;
  }
}

export async function getBorettslagAndeler(orgnr) {
  try {
    const tree = await callEdr(
      `<edr:hentBorettslagetsAndeler><orgnr>${orgnr}</orgnr></edr:hentBorettslagetsAndeler>`,
      `brl-andeler-${orgnr}`,
    );
    const andeler = [];
    for (const a of collect(tree, 'borettsandel')) {
      const andelsnr = attr(a, 'andelsnr');
      if (!andelsnr) continue;
      const entry = { andelsnr, aktiv: attr(a, 'aktiv') === 'true', gatenavn: '', husnr: '', bokstav: '', bolignr: '', adressetekst: '' };
      const ga = firstByName(a, 'gateadresse');
      if (ga) {
        const gn = attr(ga, 'gatenavn') || '';
        const hn = attr(ga, 'husnr') || '';
        const bk = attr(ga, 'bokstav') || '';
        const bn = attr(ga, 'bolignr') || '';
        Object.assign(entry, { gatenavn: gn, husnr: hn, bokstav: bk, bolignr: bn, adressetekst: `${gn} ${hn}${bk}`.trim() });
      }
      andeler.push(entry);
    }
    return andeler
      .filter((a) => a.aktiv)
      .sort((a, b) => (parseInt(a.andelsnr, 10) || 9999) - (parseInt(b.andelsnr, 10) || 9999));
  } catch (e) {
    return [];
  }
}

export async function getAndelOwner(orgnr, andelsnr) {
  try {
    const tree = await callEdr(
      `<edr:hentHjemmelBorett><andelsnr>${andelsnr}</andelsnr><orgnr>${orgnr}</orgnr></edr:hentHjemmelBorett>`,
      `hjemmelborett-${orgnr}-${andelsnr}`,
    );
    const names = [];
    let otype = 'person';
    for (const dok of allNodes(tree)) {
      // Aktivt rettsstiftelses-dokument (f.eks. <eierskifte ... rettsstiftelsetype="BH" aktiv="true">)
      if (attr(dok, 'aktiv') !== 'true' || attr(dok, 'rettsstiftelsetype') == null) continue;
      for (const pa of collect(dok, 'personandel_med_borettsandel')) {
        const person = firstByName(pa, 'person');
        const niva = firstByName(pa, 'borettsandelsnivaa');
        const isHjemmel = niva && (attr(niva, 'kode') === 'E' || (txt(niva) || '').toLowerCase().includes('hjemmel'));
        const navn = person && attr(person, 'navn');
        if (navn && isHjemmel && !names.includes(navn)) {
          names.push(navn);
          if (person && attr(person, 'type') !== 'F') otype = 'organisasjon';
        }
      }
    }
    if (names.length) return { navn: names.join(' / '), type: otype, orgnr: '' };
    return null;
  } catch (e) {
    return null;
  }
}

export function classifyBuildingType(edr) {
  const seksjonert = !!edr.seksjonert;
  if (seksjonert) return 'sameie';
  const kode = parseInt(edr.bygningstype_kode || '', 10);
  if (kode >= 111 && kode <= 113) return 'enebolig';
  if (kode >= 121 && kode <= 124) return 'tomannsbolig';
  if (kode >= 131 && kode <= 136) return 'rekkehus';
  if (kode >= 141 && kode <= 199) return 'sameie';
  if ((edr.seksjoner || []).length) return 'sameie';
  return 'enebolig';
}

/** Bygg matrikkel-streng «knr-gnr/bnr[/snr]». */
export function matrikkelString(m, snr) {
  if (!m) return '';
  const base = `${m.kommunenr}-${m.gaardsnr}/${m.bruksnr}`;
  return snr && String(snr) !== '0' ? `${base}/${snr}` : base;
}
