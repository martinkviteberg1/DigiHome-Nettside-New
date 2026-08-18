// ─────────────────────────────────────────────────────────────────────────────
// SELSKAP — organisasjonskart (styre & ledelse) + aksjeeierbok for begge
// DigiHome-selskapene. Ren datalogikk (ingen HTTP-detaljer) slik at alt kan
// testes uten å gå via API-laget.
//
//   selskaper:          {id, orgnr, navn, orgform, registrert, adresse,
//                        antallAnsatte, palydende (NOK per aksje ved stiftelse),
//                        sistSynket, rekkefolge}
//   org_personer:       {id, navn, navnNorm, erEnhet (true = selskap, f.eks.
//                        regnskapsfører), orgnr?, fodselsdato?, tittel?, bio?,
//                        epost?, telefon?, linkedin?, bilde? (dataURL, liten),
//                        kilde ('brreg'|'manuell'), createdAt, updatedAt}
//   org_roller:         {id, selskapId, personId, rolleKode (BRreg-kode eller
//                        'MANUELL'), rolleNavn, gruppe ('styre'|'ledelse'|'annet'),
//                        kilde ('brreg'|'manuell'), brregBorte (rollen fantes i
//                        BRreg men er borte nå — flagges, slettes aldri av synk),
//                        skjult (admin kan skjule uten å slette), rekkefolge}
//   aksje_eiere:        {id, navn, navnNorm, type ('person'|'selskap'),
//                        orgnr?, fodselsdato?, epost?, adresse?, createdAt}
//   aksje_klasser:      {id, selskapId, navn, stemmerPerAksje, beskrivelse}
//   aksje_transaksjoner:{id, selskapId, type, dato (YYYY-MM-DD), notat,
//                        poster / fraEierId / tilEierId / intervaller / faktor /
//                        vederlag …, registrertAv, createdAt}
//
// AKSJEEIERBOKEN ER TRANSAKSJONSBASERT (event-sourced): cap table beregnes
// alltid ved å spille av transaksjonene i kronologisk rekkefølge. Hver aksje
// har et nummer, og eierskap representeres som intervaller {fra, til, eierId,
// klasseId}. Det gjør splitt/spleis, delsalg og tidsreise («vis eierboken per
// dato X») eksakte — og enhver ugyldig transaksjon avvises med klar forklaring.
//
// Brønnøysund: åpne API-er (ingen nøkkel) — enhetsregisteret + roller. Synk
// oppdaterer KUN rader med kilde 'brreg'; manuelle personer/roller og all
// manuell beriking (tittel, bilde, bio, kontakt) røres aldri.
// ─────────────────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';

export const SELSKAP_COLL = 'selskaper';
export const PERSON_COLL = 'org_personer';
export const ROLLE_COLL = 'org_roller';
export const EIER_COLL = 'aksje_eiere';
export const KLASSE_COLL = 'aksje_klasser';
export const TRANS_COLL = 'aksje_transaksjoner';

const BRREG_BASE = 'https://data.brreg.no/enhetsregisteret/api';

// De to selskapene portalen gjelder — seedes idempotent ved første kall.
const SEED_SELSKAPER = [
  { orgnr: '835595242', navn: 'Digihome AS', rekkefolge: 0 },
  { orgnr: '835674622', navn: 'Digihome Tech AS', rekkefolge: 1 },
];

// BRreg-rollekoder → visning og gruppering i kartet. Rekkefølgen styrer
// sorteringen innad i styret (leder først, vara sist).
const ROLLE_MAP = {
  LEDE: { navn: 'Styreleder', gruppe: 'styre', orden: 0 },
  NEST: { navn: 'Nestleder', gruppe: 'styre', orden: 1 },
  MEDL: { navn: 'Styremedlem', gruppe: 'styre', orden: 2 },
  OBS: { navn: 'Observatør', gruppe: 'styre', orden: 3 },
  VARA: { navn: 'Varamedlem', gruppe: 'styre', orden: 4 },
  DAGL: { navn: 'Daglig leder', gruppe: 'ledelse', orden: 0 },
  INNH: { navn: 'Innehaver', gruppe: 'ledelse', orden: 1 },
  KONT: { navn: 'Kontaktperson', gruppe: 'annet', orden: 2 },
  REGN: { navn: 'Regnskapsfører', gruppe: 'annet', orden: 0 },
  REVI: { navn: 'Revisor', gruppe: 'annet', orden: 1 },
};

const normNavn = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// ── Selskaper ────────────────────────────────────────────────────────────────

export async function seedSelskaper(db) {
  for (const s of SEED_SELSKAPER) {
    const finnes = await db.collection(SELSKAP_COLL).findOne({ orgnr: s.orgnr }, { projection: { _id: 1 } });
    if (!finnes) {
      await db.collection(SELSKAP_COLL).insertOne({
        id: uuidv4(), orgnr: s.orgnr, navn: s.navn, orgform: 'AS', registrert: null,
        adresse: null, antallAnsatte: null, palydende: 1, sistSynket: null,
        rekkefolge: s.rekkefolge, createdAt: new Date().toISOString(),
      });
    }
  }
}

export async function hentSelskaper(db) {
  await seedSelskaper(db);
  return db.collection(SELSKAP_COLL).find({}, { projection: { _id: 0 } }).sort({ rekkefolge: 1 }).toArray();
}

export async function oppdaterSelskap(db, { id, palydende } = {}) {
  const sett = {};
  if (palydende !== undefined) {
    const p = Number(palydende);
    if (!Number.isFinite(p) || p <= 0) return { ok: false, error: 'Pålydende må være et positivt beløp' };
    sett.palydende = Math.round(p * 10000) / 10000;
  }
  if (!Object.keys(sett).length) return { ok: false, error: 'Ingenting å oppdatere' };
  const res = await db.collection(SELSKAP_COLL).updateOne({ id: String(id) }, { $set: sett });
  return res.matchedCount ? { ok: true } : { ok: false, error: 'Selskapet finnes ikke' };
}

// ── Brønnøysund-synk ─────────────────────────────────────────────────────────

async function brregHent(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Brønnøysund svarte ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

// Synker ETT selskap fra Brønnøysund: selskapsfakta + roller. Manuelle data
// røres aldri. BRreg-roller som er borte flagges (brregBorte) — ikke slettet.
export async function synkFraBrreg(db, { selskapId } = {}) {
  const selskap = await db.collection(SELSKAP_COLL).findOne({ id: String(selskapId) }, { projection: { _id: 0 } });
  if (!selskap) return { ok: false, error: 'Selskapet finnes ikke' };

  let enhet; let rollerData;
  try {
    enhet = await brregHent(`${BRREG_BASE}/enheter/${selskap.orgnr}`);
    rollerData = await brregHent(`${BRREG_BASE}/enheter/${selskap.orgnr}/roller`);
  } catch (e) {
    return { ok: false, error: `Fikk ikke kontakt med Brønnøysund: ${e.message}` };
  }

  // 1) Selskapsfakta
  const adr = enhet.forretningsadresse || {};
  const adresse = [
    (adr.adresse || []).join(', '),
    [adr.postnummer, adr.poststed].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ') || null;
  await db.collection(SELSKAP_COLL).updateOne({ id: selskap.id }, {
    $set: {
      navn: enhet.navn || selskap.navn,
      orgform: enhet.organisasjonsform?.kode || selskap.orgform,
      registrert: enhet.registreringsdatoEnhetsregisteret || enhet.stiftelsesdato || selskap.registrert,
      adresse,
      antallAnsatte: Number.isFinite(enhet.antallAnsatte) ? enhet.antallAnsatte : selskap.antallAnsatte,
      sistSynket: new Date().toISOString(),
    },
  });

  // 2) Roller — flat liste av aktive roller fra alle rollegrupper
  const naa = new Date().toISOString();
  const brregRoller = [];
  for (const gruppe of rollerData.rollegrupper || []) {
    for (const r of gruppe.roller || []) {
      if (r.fratraadt) continue;
      const kode = r.type?.kode || '';
      const map = ROLLE_MAP[kode];
      if (!map) continue; // signatur/prokura o.l. hører ikke hjemme i kartet
      if (r.person) {
        const n = r.person.navn || {};
        const navn = [n.fornavn, n.mellomnavn, n.etternavn].filter(Boolean).join(' ').trim();
        if (!navn) continue;
        brregRoller.push({ kode, navn, erEnhet: false, orgnr: null, fodselsdato: r.person.fodselsdato || null, gruppe: map.gruppe, orden: map.orden });
      } else if (r.enhet && !r.enhet.slettet) {
        const navnE = Array.isArray(r.enhet.navn) ? r.enhet.navn.join(' ').trim() : String(r.enhet.navn || '').trim();
        if (!navnE) continue;
        brregRoller.push({ kode, navn: navnE, erEnhet: true, orgnr: r.enhet.organisasjonsnummer || null, fodselsdato: null, gruppe: map.gruppe, orden: map.orden });
      }
    }
  }

  // 3) Personer: match på normalisert navn (gjenbrukes på tvers av selskapene)
  let nyePersoner = 0;
  const personIdFor = {};
  for (const r of brregRoller) {
    const noekkel = `${normNavn(r.navn)}|${r.erEnhet ? 'e' : 'p'}`;
    if (personIdFor[noekkel]) continue;
    let p = await db.collection(PERSON_COLL).findOne({ navnNorm: normNavn(r.navn), erEnhet: r.erEnhet }, { projection: { _id: 0, id: 1, fodselsdato: 1, orgnr: 1 } });
    if (!p) {
      p = {
        id: uuidv4(), navn: r.navn, navnNorm: normNavn(r.navn), erEnhet: r.erEnhet,
        orgnr: r.orgnr, fodselsdato: r.fodselsdato, tittel: null, bio: null, epost: null,
        telefon: null, linkedin: null, bilde: null, kilde: 'brreg', createdAt: naa, updatedAt: naa,
      };
      await db.collection(PERSON_COLL).insertOne({ ...p });
      nyePersoner += 1;
    } else {
      // Berik kun tomme registerfelter — aldri manuell beriking
      const sett = {};
      if (!p.fodselsdato && r.fodselsdato) sett.fodselsdato = r.fodselsdato;
      if (!p.orgnr && r.orgnr) sett.orgnr = r.orgnr;
      if (Object.keys(sett).length) await db.collection(PERSON_COLL).updateOne({ id: p.id }, { $set: sett });
    }
    personIdFor[noekkel] = p.id;
  }

  // 4) Roller: upsert per (selskap, person, kode) for kilde 'brreg'
  let nyeRoller = 0;
  const settIder = new Set();
  for (const r of brregRoller) {
    const personId = personIdFor[`${normNavn(r.navn)}|${r.erEnhet ? 'e' : 'p'}`];
    const eksisterende = await db.collection(ROLLE_COLL).findOne(
      { selskapId: selskap.id, personId, rolleKode: r.kode, kilde: 'brreg' },
      { projection: { _id: 0, id: 1 } },
    );
    if (eksisterende) {
      // Rollen finnes fra før — bare nullstill borte-flagget
      await db.collection(ROLLE_COLL).updateOne({ id: eksisterende.id }, { $set: { brregBorte: false } });
      settIder.add(eksisterende.id);
    } else {
      const id = uuidv4();
      await db.collection(ROLLE_COLL).insertOne({
        id, selskapId: selskap.id, personId, rolleKode: r.kode, rolleNavn: ROLLE_MAP[r.kode].navn,
        gruppe: r.gruppe, kilde: 'brreg', brregBorte: false, skjult: false, rekkefolge: r.orden, createdAt: naa,
      });
      settIder.add(id);
      nyeRoller += 1;
    }
  }

  // 5) BRreg-roller som IKKE lenger finnes → flagg (aldri slett)
  const alleBrreg = await db.collection(ROLLE_COLL).find({ selskapId: selskap.id, kilde: 'brreg' }, { projection: { _id: 0, id: 1 } }).toArray();
  let borteRoller = 0;
  for (const rolle of alleBrreg) {
    if (!settIder.has(rolle.id)) {
      await db.collection(ROLLE_COLL).updateOne({ id: rolle.id, brregBorte: { $ne: true } }, { $set: { brregBorte: true } });
      borteRoller += 1;
    }
  }

  const oppdatert = await db.collection(SELSKAP_COLL).findOne({ id: selskap.id }, { projection: { _id: 0 } });
  return { ok: true, selskap: oppdatert, endringer: { nyePersoner, nyeRoller, borteRoller } };
}

// ── Organisasjon (lesing + manuell CRUD) ────────────────────────────────────

export async function hentOrganisasjon(db) {
  const selskaper = await hentSelskaper(db);
  const roller = await db.collection(ROLLE_COLL).find({}, { projection: { _id: 0 } }).sort({ rekkefolge: 1, createdAt: 1 }).toArray();
  const personIder = [...new Set(roller.map((r) => r.personId))];
  const personer = await db.collection(PERSON_COLL)
    .find({ id: { $in: personIder } }, { projection: { _id: 0, navnNorm: 0 } }).toArray();
  return { selskaper, roller, personer };
}

export async function lagrePerson(db, { id, navn, tittel, epost, telefon, linkedin, bio, bilde, fodselsdato } = {}) {
  const naa = new Date().toISOString();
  if (id) {
    const sett = { updatedAt: naa };
    if (navn !== undefined) {
      const n = String(navn || '').trim().slice(0, 120);
      if (!n) return { ok: false, error: 'Navn kan ikke være tomt' };
      sett.navn = n; sett.navnNorm = normNavn(n);
    }
    if (tittel !== undefined) sett.tittel = String(tittel || '').trim().slice(0, 120) || null;
    if (epost !== undefined) sett.epost = String(epost || '').trim().slice(0, 160) || null;
    if (telefon !== undefined) sett.telefon = String(telefon || '').trim().slice(0, 40) || null;
    if (linkedin !== undefined) sett.linkedin = String(linkedin || '').trim().slice(0, 300) || null;
    if (bio !== undefined) sett.bio = String(bio || '').trim().slice(0, 2000) || null;
    if (fodselsdato !== undefined) sett.fodselsdato = String(fodselsdato || '').trim().slice(0, 10) || null;
    if (bilde !== undefined) {
      // Liten avatar som dataURL — maks ~120 kB, kun bilde-typer
      const b = String(bilde || '');
      if (b && (!/^data:image\/(png|jpe?g|webp);base64,/.test(b) || b.length > 160000)) {
        return { ok: false, error: 'Bildet må være PNG/JPEG/WebP under 120 kB (skaleres ned i nettleseren)' };
      }
      sett.bilde = b || null;
    }
    const res = await db.collection(PERSON_COLL).updateOne({ id: String(id) }, { $set: sett });
    if (!res.matchedCount) return { ok: false, error: 'Personen finnes ikke' };
    const p = await db.collection(PERSON_COLL).findOne({ id: String(id) }, { projection: { _id: 0, navnNorm: 0 } });
    return { ok: true, person: p };
  }
  const n = String(navn || '').trim().slice(0, 120);
  if (!n) return { ok: false, error: 'Navn er påkrevd' };
  // Valgfritt bilde også ved opprettelse (samme validering som ved oppdatering)
  let nyBilde = null;
  if (bilde !== undefined && bilde) {
    const b = String(bilde);
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(b) || b.length > 160000) {
      return { ok: false, error: 'Bildet må være PNG/JPEG/WebP under 120 kB (skaleres ned i nettleseren)' };
    }
    nyBilde = b;
  }
  const person = {
    id: uuidv4(), navn: n, navnNorm: normNavn(n), erEnhet: false, orgnr: null,
    fodselsdato: String(fodselsdato || '').trim().slice(0, 10) || null,
    tittel: String(tittel || '').trim().slice(0, 120) || null,
    bio: String(bio || '').trim().slice(0, 2000) || null,
    epost: String(epost || '').trim().slice(0, 160) || null,
    telefon: String(telefon || '').trim().slice(0, 40) || null,
    linkedin: String(linkedin || '').trim().slice(0, 300) || null,
    bilde: nyBilde, kilde: 'manuell', createdAt: naa, updatedAt: naa,
  };
  await db.collection(PERSON_COLL).insertOne({ ...person });
  delete person.navnNorm;
  return { ok: true, person };
}

export async function slettPerson(db, { id } = {}) {
  const harBrreg = await db.collection(ROLLE_COLL).countDocuments({ personId: String(id), kilde: 'brreg' });
  if (harBrreg) return { ok: false, error: 'Personen har roller fra Brønnøysund — skjul rollene i stedet for å slette' };
  await db.collection(ROLLE_COLL).deleteMany({ personId: String(id), kilde: 'manuell' });
  const res = await db.collection(PERSON_COLL).deleteOne({ id: String(id) });
  return res.deletedCount ? { ok: true } : { ok: false, error: 'Personen finnes ikke' };
}

export async function nyRolle(db, { selskapId, personId, rolleNavn, gruppe, rekkefolge } = {}) {
  const selskap = await db.collection(SELSKAP_COLL).findOne({ id: String(selskapId) }, { projection: { _id: 1 } });
  if (!selskap) return { ok: false, error: 'Selskapet finnes ikke' };
  const person = await db.collection(PERSON_COLL).findOne({ id: String(personId) }, { projection: { _id: 1 } });
  if (!person) return { ok: false, error: 'Personen finnes ikke' };
  const rn = String(rolleNavn || '').trim().slice(0, 80);
  if (!rn) return { ok: false, error: 'Rolletittel er påkrevd' };
  const g = ['styre', 'ledelse', 'annet'].includes(gruppe) ? gruppe : 'ledelse';
  const rolle = {
    id: uuidv4(), selskapId: String(selskapId), personId: String(personId), rolleKode: 'MANUELL',
    rolleNavn: rn, gruppe: g, kilde: 'manuell', brregBorte: false, skjult: false,
    rekkefolge: Number.isFinite(Number(rekkefolge)) ? Number(rekkefolge) : 10,
    createdAt: new Date().toISOString(),
  };
  await db.collection(ROLLE_COLL).insertOne({ ...rolle });
  return { ok: true, rolle };
}

export async function oppdaterRolle(db, { id, rolleNavn, gruppe, rekkefolge, skjult } = {}) {
  const rolle = await db.collection(ROLLE_COLL).findOne({ id: String(id) }, { projection: { _id: 0, kilde: 1 } });
  if (!rolle) return { ok: false, error: 'Rollen finnes ikke' };
  const sett = {};
  if (skjult !== undefined) sett.skjult = !!skjult;
  if (rekkefolge !== undefined && Number.isFinite(Number(rekkefolge))) sett.rekkefolge = Number(rekkefolge);
  // Tittel/gruppe kan bare endres på manuelle roller — BRreg-roller er register-fakta
  if (rolleNavn !== undefined || gruppe !== undefined) {
    if (rolle.kilde !== 'manuell') return { ok: false, error: 'Tittel og gruppe på Brønnøysund-roller kan ikke endres — skjul rollen og legg til en manuell i stedet' };
    if (rolleNavn !== undefined) {
      const rn = String(rolleNavn || '').trim().slice(0, 80);
      if (!rn) return { ok: false, error: 'Rolletittel kan ikke være tom' };
      sett.rolleNavn = rn;
    }
    if (gruppe !== undefined) {
      if (!['styre', 'ledelse', 'annet'].includes(gruppe)) return { ok: false, error: 'Ugyldig gruppe' };
      sett.gruppe = gruppe;
    }
  }
  if (!Object.keys(sett).length) return { ok: false, error: 'Ingenting å oppdatere' };
  await db.collection(ROLLE_COLL).updateOne({ id: String(id) }, { $set: sett });
  return { ok: true };
}

export async function slettRolle(db, { id } = {}) {
  const rolle = await db.collection(ROLLE_COLL).findOne({ id: String(id) }, { projection: { _id: 0, kilde: 1 } });
  if (!rolle) return { ok: false, error: 'Rollen finnes ikke' };
  if (rolle.kilde !== 'manuell') return { ok: false, error: 'Brønnøysund-roller slettes ikke — bruk «skjul» (synken gjenoppretter ellers rollen)' };
  await db.collection(ROLLE_COLL).deleteOne({ id: String(id) });
  return { ok: true };
}

// ═══ AKSJEEIERBOK ════════════════════════════════════════════════════════════

export const TRANSAKSJONSTYPER = ['stiftelse', 'emisjon', 'overdragelse', 'splitt', 'spleis', 'sletting'];

// ── Eiere (globale — kan eie i begge selskapene) ────────────────────────────

export async function hentEiere(db) {
  return db.collection(EIER_COLL).find({}, { projection: { _id: 0, navnNorm: 0 } }).sort({ navn: 1 }).toArray();
}

export async function lagreEier(db, { id, navn, type, orgnr, fodselsdato, epost, adresse } = {}) {
  const naa = new Date().toISOString();
  const felter = {};
  if (navn !== undefined) {
    const n = String(navn || '').trim().slice(0, 160);
    if (!n) return { ok: false, error: 'Navn er påkrevd' };
    felter.navn = n; felter.navnNorm = normNavn(n);
  }
  if (type !== undefined) felter.type = type === 'selskap' ? 'selskap' : 'person';
  if (orgnr !== undefined) felter.orgnr = String(orgnr || '').replace(/\s/g, '').slice(0, 20) || null;
  if (fodselsdato !== undefined) felter.fodselsdato = String(fodselsdato || '').trim().slice(0, 10) || null;
  if (epost !== undefined) felter.epost = String(epost || '').trim().slice(0, 160) || null;
  if (adresse !== undefined) felter.adresse = String(adresse || '').trim().slice(0, 300) || null;
  if (id) {
    if (!Object.keys(felter).length) return { ok: false, error: 'Ingenting å oppdatere' };
    const res = await db.collection(EIER_COLL).updateOne({ id: String(id) }, { $set: felter });
    if (!res.matchedCount) return { ok: false, error: 'Aksjonæren finnes ikke' };
    const e = await db.collection(EIER_COLL).findOne({ id: String(id) }, { projection: { _id: 0, navnNorm: 0 } });
    return { ok: true, eier: e };
  }
  if (!felter.navn) return { ok: false, error: 'Navn er påkrevd' };
  const eier = { id: uuidv4(), type: 'person', orgnr: null, fodselsdato: null, epost: null, adresse: null, ...felter, createdAt: naa };
  await db.collection(EIER_COLL).insertOne({ ...eier });
  delete eier.navnNorm;
  return { ok: true, eier };
}

export async function slettEier(db, { id } = {}) {
  const brukt = await db.collection(TRANS_COLL).countDocuments({
    $or: [{ 'poster.eierId': String(id) }, { fraEierId: String(id) }, { tilEierId: String(id) }],
  });
  if (brukt) return { ok: false, error: 'Aksjonæren er brukt i transaksjoner og kan ikke slettes' };
  const res = await db.collection(EIER_COLL).deleteOne({ id: String(id) });
  return res.deletedCount ? { ok: true } : { ok: false, error: 'Aksjonæren finnes ikke' };
}

// ── Aksjeklasser ─────────────────────────────────────────────────────────────

// Sørger for at selskapet har minst én klasse («Ordinære») — returnerer alle.
export async function hentKlasser(db, selskapId) {
  const finnes = await db.collection(KLASSE_COLL).find({ selskapId: String(selskapId) }, { projection: { _id: 0 } }).sort({ navn: 1 }).toArray();
  if (finnes.length) return finnes;
  const std = { id: uuidv4(), selskapId: String(selskapId), navn: 'Ordinære', stemmerPerAksje: 1, beskrivelse: null, createdAt: new Date().toISOString() };
  await db.collection(KLASSE_COLL).insertOne({ ...std });
  return [std];
}

export async function lagreKlasse(db, { id, selskapId, navn, stemmerPerAksje, beskrivelse } = {}) {
  const felter = {};
  if (navn !== undefined) {
    const n = String(navn || '').trim().slice(0, 60);
    if (!n) return { ok: false, error: 'Klassenavn er påkrevd' };
    felter.navn = n;
  }
  if (stemmerPerAksje !== undefined) {
    const s = Number(stemmerPerAksje);
    if (!Number.isFinite(s) || s < 0) return { ok: false, error: 'Stemmer per aksje må være 0 eller mer' };
    felter.stemmerPerAksje = s;
  }
  if (beskrivelse !== undefined) felter.beskrivelse = String(beskrivelse || '').trim().slice(0, 300) || null;
  if (id) {
    const res = await db.collection(KLASSE_COLL).updateOne({ id: String(id) }, { $set: felter });
    return res.matchedCount ? { ok: true } : { ok: false, error: 'Klassen finnes ikke' };
  }
  const selskap = await db.collection(SELSKAP_COLL).findOne({ id: String(selskapId) }, { projection: { _id: 1 } });
  if (!selskap) return { ok: false, error: 'Selskapet finnes ikke' };
  if (!felter.navn) return { ok: false, error: 'Klassenavn er påkrevd' };
  const klasse = { id: uuidv4(), selskapId: String(selskapId), stemmerPerAksje: 1, beskrivelse: null, ...felter, createdAt: new Date().toISOString() };
  await db.collection(KLASSE_COLL).insertOne({ ...klasse });
  return { ok: true, klasse };
}

export async function slettKlasse(db, { id } = {}) {
  const brukt = await db.collection(TRANS_COLL).countDocuments({ 'poster.klasseId': String(id) });
  if (brukt) return { ok: false, error: 'Klassen er brukt i transaksjoner og kan ikke slettes' };
  const res = await db.collection(KLASSE_COLL).deleteOne({ id: String(id) });
  return res.deletedCount ? { ok: true } : { ok: false, error: 'Klassen finnes ikke' };
}

// ── Replay-motoren ───────────────────────────────────────────────────────────

const heltall = (v) => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

// Slår sammen tilstøtende intervaller med samme eier+klasse (ren visning).
function slaaSammen(intervaller) {
  const sortert = [...intervaller].sort((a, b) => a.fra - b.fra);
  const ut = [];
  for (const i of sortert) {
    const siste = ut[ut.length - 1];
    if (siste && siste.til + 1 === i.fra && siste.eierId === i.eierId && siste.klasseId === i.klasseId) siste.til = i.til;
    else ut.push({ ...i });
  }
  return ut;
}

// Spiller av transaksjonene kronologisk og returnerer tilstanden — eller
// {feil} med forklaring og hvilken transaksjon som feilet.
export function spillAv(transaksjoner, { palydendeStart = 1 } = {}) {
  const state = { intervaller: [], palydende: palydendeStart, harStiftelse: false };
  const sortert = [...transaksjoner].sort((a, b) =>
    (a.dato === b.dato ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : String(a.dato).localeCompare(String(b.dato))));

  const feilI = (t, melding) => ({ feil: { transaksjonId: t.id, dato: t.dato, type: t.type, melding } });

  for (const t of sortert) {
    if (t.type === 'stiftelse' || t.type === 'emisjon') {
      if (t.type === 'stiftelse' && state.harStiftelse) return feilI(t, 'Selskapet har allerede en stiftelse');
      if (t.type === 'emisjon' && !state.harStiftelse) return feilI(t, 'Emisjon krever at stiftelsen er registrert først');
      for (const p of t.poster || []) {
        const fra = heltall(p.fraNr); const til = heltall(p.tilNr);
        if (!fra || !til || til < fra) return feilI(t, `Ugyldig aksjenummer-intervall (${p.fraNr}–${p.tilNr})`);
        if (til - fra + 1 !== Number(p.antall)) return feilI(t, `Antall (${p.antall}) stemmer ikke med intervallet ${fra}–${til} (${til - fra + 1} aksjer)`);
        for (const e of state.intervaller) {
          if (fra <= e.til && til >= e.fra) return feilI(t, `Aksjenummer ${Math.max(fra, e.fra)}–${Math.min(til, e.til)} er allerede utstedt`);
        }
        state.intervaller.push({ fra, til, eierId: p.eierId, klasseId: p.klasseId });
      }
      if (t.type === 'stiftelse') {
        state.harStiftelse = true;
        if (Number(t.palydende) > 0) state.palydende = Number(t.palydende);
      }
    } else if (t.type === 'overdragelse') {
      for (const iv of t.intervaller || []) {
        const fra = heltall(iv.fra); const til = heltall(iv.til);
        if (!fra || !til || til < fra) return feilI(t, `Ugyldig intervall (${iv.fra}–${iv.til})`);
        // Alle numrene må eies av selger — splitt opp state-intervaller ved behov
        let mangler = [[fra, til]];
        const nyeState = [];
        for (const e of state.intervaller) {
          if (e.til < fra || e.fra > til || e.eierId !== t.fraEierId) { nyeState.push(e); continue; }
          const kuttFra = Math.max(e.fra, fra); const kuttTil = Math.min(e.til, til);
          if (e.fra < kuttFra) nyeState.push({ ...e, til: kuttFra - 1 });
          if (e.til > kuttTil) nyeState.push({ ...e, fra: kuttTil + 1 });
          nyeState.push({ fra: kuttFra, til: kuttTil, eierId: t.tilEierId, klasseId: e.klasseId });
          // Marker dekket område
          mangler = mangler.flatMap(([mf, mt]) => {
            if (kuttTil < mf || kuttFra > mt) return [[mf, mt]];
            const rest = [];
            if (mf < kuttFra) rest.push([mf, kuttFra - 1]);
            if (mt > kuttTil) rest.push([kuttTil + 1, mt]);
            return rest;
          });
        }
        if (mangler.length) {
          const [mf, mt] = mangler[0];
          return feilI(t, `Selgeren eier ikke aksjenummer ${mf}${mt > mf ? `–${mt}` : ''} på dette tidspunktet`);
        }
        state.intervaller = nyeState;
      }
    } else if (t.type === 'splitt') {
      const f = heltall(t.faktor);
      if (!f || f < 2) return feilI(t, 'Splitt krever en faktor på minst 2');
      state.intervaller = state.intervaller.map((e) => ({ ...e, fra: (e.fra - 1) * f + 1, til: e.til * f }));
      state.palydende = state.palydende / f;
    } else if (t.type === 'spleis') {
      const f = heltall(t.faktor);
      if (!f || f < 2) return feilI(t, 'Spleis krever en faktor på minst 2');
      const sammensl = slaaSammen(state.intervaller);
      for (const e of sammensl) {
        if ((e.fra - 1) % f !== 0 || e.til % f !== 0) {
          return feilI(t, `Spleis 1:${f} går ikke opp — aksjenummer ${e.fra}–${e.til} er ikke delelig i hele poster. Juster eierskapet først.`);
        }
      }
      state.intervaller = sammensl.map((e) => ({ ...e, fra: (e.fra - 1) / f + 1, til: e.til / f }));
      state.palydende = state.palydende * f;
    } else if (t.type === 'sletting') {
      for (const iv of t.intervaller || []) {
        const fra = heltall(iv.fra); const til = heltall(iv.til);
        if (!fra || !til || til < fra) return feilI(t, `Ugyldig intervall (${iv.fra}–${iv.til})`);
        let mangler = [[fra, til]];
        const nyeState = [];
        for (const e of state.intervaller) {
          if (e.til < fra || e.fra > til) { nyeState.push(e); continue; }
          const kuttFra = Math.max(e.fra, fra); const kuttTil = Math.min(e.til, til);
          if (e.fra < kuttFra) nyeState.push({ ...e, til: kuttFra - 1 });
          if (e.til > kuttTil) nyeState.push({ ...e, fra: kuttTil + 1 });
          mangler = mangler.flatMap(([mf, mt]) => {
            if (kuttTil < mf || kuttFra > mt) return [[mf, mt]];
            const rest = [];
            if (mf < kuttFra) rest.push([mf, kuttFra - 1]);
            if (mt > kuttTil) rest.push([kuttTil + 1, mt]);
            return rest;
          });
        }
        if (mangler.length) {
          const [mf] = mangler[0];
          return feilI(t, `Aksjenummer ${mf} er ikke utstedt og kan ikke slettes`);
        }
        state.intervaller = nyeState;
      }
    } else {
      return feilI(t, `Ukjent transaksjonstype «${t.type}»`);
    }
  }
  state.intervaller = slaaSammen(state.intervaller);
  return { state };
}

// ── Eierbok: lesing (cap table + tidsreise) ─────────────────────────────────

export async function hentEierbok(db, { selskapId, dato } = {}) {
  const selskaper = await hentSelskaper(db);
  const selskap = selskapId
    ? await db.collection(SELSKAP_COLL).findOne({ id: String(selskapId) }, { projection: { _id: 0 } })
    : selskaper[0];
  if (!selskap) return { ok: false, error: 'Selskapet finnes ikke' };
  const klasser = await hentKlasser(db, selskap.id);
  const alle = await db.collection(TRANS_COLL).find({ selskapId: selskap.id }, { projection: { _id: 0 } })
    .sort({ dato: 1, createdAt: 1 }).toArray();
  const cut = dato ? String(dato).slice(0, 10) : null;
  const aktive = cut ? alle.filter((t) => String(t.dato) <= cut) : alle;
  const res = spillAv(aktive, { palydendeStart: selskap.palydende || 1 });
  if (res.feil) return { ok: true, selskaper, selskap, klasser, eiere: await hentEiere(db), transaksjoner: alle, feil: res.feil, capTable: null };

  const { state } = res;
  const klasseAv = Object.fromEntries(klasser.map((k) => [k.id, k]));
  const perEier = {};
  let totalAksjer = 0; let totalStemmer = 0;
  for (const iv of state.intervaller) {
    const antall = iv.til - iv.fra + 1;
    totalAksjer += antall;
    const stemmer = antall * (klasseAv[iv.klasseId]?.stemmerPerAksje ?? 1);
    totalStemmer += stemmer;
    if (!perEier[iv.eierId]) perEier[iv.eierId] = { eierId: iv.eierId, antall: 0, stemmer: 0, intervaller: [], klasser: {} };
    perEier[iv.eierId].antall += antall;
    perEier[iv.eierId].stemmer += stemmer;
    perEier[iv.eierId].intervaller.push({ fra: iv.fra, til: iv.til, klasseId: iv.klasseId });
    const kNavn = klasseAv[iv.klasseId]?.navn || 'Ordinære';
    perEier[iv.eierId].klasser[kNavn] = (perEier[iv.eierId].klasser[kNavn] || 0) + antall;
  }
  const eiere = await hentEiere(db);
  const eierAv = Object.fromEntries(eiere.map((e) => [e.id, e]));
  const rader = Object.values(perEier).map((r) => ({
    ...r,
    navn: eierAv[r.eierId]?.navn || 'Ukjent',
    type: eierAv[r.eierId]?.type || 'person',
    orgnr: eierAv[r.eierId]?.orgnr || null,
    andel: totalAksjer ? r.antall / totalAksjer : 0,
    stemmeAndel: totalStemmer ? r.stemmer / totalStemmer : 0,
  })).sort((a, b) => b.antall - a.antall);

  const nesteNr = state.intervaller.reduce((m, iv) => Math.max(m, iv.til), 0) + 1;
  return {
    ok: true, selskaper, selskap, klasser, eiere, transaksjoner: alle,
    capTable: {
      rader, totalAksjer, totalStemmer,
      palydende: state.palydende,
      aksjekapital: Math.round(totalAksjer * state.palydende * 100) / 100,
      nesteNr, perDato: cut,
    },
  };
}

// ── Eierbok: transaksjoner (validert mot hele kjeden) ───────────────────────

export async function nyTransaksjon(db, { selskapId, type, dato, notat, poster, fraEierId, tilEierId, intervaller, faktor, vederlag, palydende, registrertAv } = {}) {
  const selskap = await db.collection(SELSKAP_COLL).findOne({ id: String(selskapId) }, { projection: { _id: 0, id: 1, palydende: 1 } });
  if (!selskap) return { ok: false, error: 'Selskapet finnes ikke' };
  if (!TRANSAKSJONSTYPER.includes(type)) return { ok: false, error: 'Ugyldig transaksjonstype' };
  const d = String(dato || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, error: 'Dato må være på formen ÅÅÅÅ-MM-DD' };

  const klasser = await hentKlasser(db, selskap.id);
  const stdKlasse = klasser[0].id;
  const t = {
    id: uuidv4(), selskapId: selskap.id, type, dato: d,
    notat: String(notat || '').trim().slice(0, 500) || null,
    registrertAv: String(registrertAv || '').slice(0, 120) || null,
    createdAt: new Date().toISOString(),
  };

  if (type === 'stiftelse' || type === 'emisjon') {
    if (!Array.isArray(poster) || !poster.length) return { ok: false, error: 'Minst én post (aksjonær + antall) er påkrevd' };
    if (poster.length > 200) return { ok: false, error: 'Maks 200 poster per transaksjon' };
    t.poster = [];
    for (const p of poster) {
      const eier = await db.collection(EIER_COLL).findOne({ id: String(p.eierId || '') }, { projection: { _id: 1 } });
      if (!eier) return { ok: false, error: 'En av postene mangler gyldig aksjonær' };
      const klasseId = p.klasseId && klasser.some((k) => k.id === p.klasseId) ? p.klasseId : stdKlasse;
      const antall = heltall(p.antall);
      if (!antall) return { ok: false, error: 'Antall aksjer må være et positivt heltall' };
      const fraNr = heltall(p.fraNr); const tilNr = heltall(p.tilNr);
      if (!fraNr || !tilNr) return { ok: false, error: 'Aksjenummer fra/til er påkrevd (heltall)' };
      const kurs = p.kurs !== undefined && p.kurs !== null && p.kurs !== '' ? Number(p.kurs) : null;
      if (kurs !== null && (!Number.isFinite(kurs) || kurs < 0)) return { ok: false, error: 'Tegningskurs må være et beløp' };
      t.poster.push({ eierId: String(p.eierId), klasseId, antall, fraNr, tilNr, kurs });
    }
    if (type === 'stiftelse' && Number(palydende) > 0) t.palydende = Number(palydende);
  } else if (type === 'overdragelse') {
    const fra = await db.collection(EIER_COLL).findOne({ id: String(fraEierId || '') }, { projection: { _id: 1 } });
    const til = await db.collection(EIER_COLL).findOne({ id: String(tilEierId || '') }, { projection: { _id: 1 } });
    if (!fra || !til) return { ok: false, error: 'Både selger og kjøper må velges' };
    if (String(fraEierId) === String(tilEierId)) return { ok: false, error: 'Selger og kjøper kan ikke være samme aksjonær' };
    if (!Array.isArray(intervaller) || !intervaller.length) return { ok: false, error: 'Angi hvilke aksjenumre som overdras' };
    t.fraEierId = String(fraEierId); t.tilEierId = String(tilEierId);
    t.intervaller = intervaller.map((iv) => ({ fra: heltall(iv.fra), til: heltall(iv.til) }));
    if (t.intervaller.some((iv) => !iv.fra || !iv.til || iv.til < iv.fra)) return { ok: false, error: 'Ugyldig aksjenummer-intervall' };
    const v = vederlag !== undefined && vederlag !== null && vederlag !== '' ? Number(vederlag) : null;
    if (v !== null && (!Number.isFinite(v) || v < 0)) return { ok: false, error: 'Vederlag må være et beløp' };
    t.vederlag = v;
  } else if (type === 'splitt' || type === 'spleis') {
    const f = heltall(faktor);
    if (!f || f < 2) return { ok: false, error: 'Faktor må være et heltall på minst 2' };
    t.faktor = f;
  } else if (type === 'sletting') {
    if (!Array.isArray(intervaller) || !intervaller.length) return { ok: false, error: 'Angi hvilke aksjenumre som slettes' };
    t.intervaller = intervaller.map((iv) => ({ fra: heltall(iv.fra), til: heltall(iv.til) }));
    if (t.intervaller.some((iv) => !iv.fra || !iv.til || iv.til < iv.fra)) return { ok: false, error: 'Ugyldig aksjenummer-intervall' };
  }

  // Valider HELE kjeden inkludert den nye — avvis med presis forklaring
  const eksisterende = await db.collection(TRANS_COLL).find({ selskapId: selskap.id }, { projection: { _id: 0 } }).toArray();
  const res = spillAv([...eksisterende, t], { palydendeStart: selskap.palydende || 1 });
  if (res.feil) {
    const egen = res.feil.transaksjonId === t.id;
    return { ok: false, error: egen ? res.feil.melding : `Historikken er allerede ugyldig (${res.feil.dato}: ${res.feil.melding}) — rett den først` };
  }
  await db.collection(TRANS_COLL).insertOne({ ...t });
  return { ok: true, transaksjon: t };
}

export async function slettTransaksjon(db, { id } = {}) {
  const t = await db.collection(TRANS_COLL).findOne({ id: String(id) }, { projection: { _id: 0 } });
  if (!t) return { ok: false, error: 'Transaksjonen finnes ikke' };
  const selskap = await db.collection(SELSKAP_COLL).findOne({ id: t.selskapId }, { projection: { _id: 0, palydende: 1 } });
  const rest = await db.collection(TRANS_COLL).find({ selskapId: t.selskapId, id: { $ne: t.id } }, { projection: { _id: 0 } }).toArray();
  const res = spillAv(rest, { palydendeStart: selskap?.palydende || 1 });
  if (res.feil) {
    return { ok: false, error: `Kan ikke slettes: en senere transaksjon (${res.feil.dato}) blir ugyldig — ${res.feil.melding}` };
  }
  await db.collection(TRANS_COLL).deleteOne({ id: t.id });
  return { ok: true };
}
