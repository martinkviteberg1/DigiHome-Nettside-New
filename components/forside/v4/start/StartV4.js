'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import CompanyPicker from '@/components/dh/CompanyPicker';
import { detectFinnReference } from '@/components/dh/PropertyInputs';
import { track, getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { site } from '@/lib/site';
import { EASE, T, display } from '../motion';
import AdresseSok from './AdresseSok';
import BoligPanel from './BoligPanel';
import { Avkryssing, Segment, StegKnapp, TekstFelt, TelefonFelt } from './Felt';

/* ---------------------------------------------------------------------------
   StartV4 — «fortsettelsen av heroen». /bli-utleier/start.

   Tre korte steg, én setning per steg. Boligen din er scenen (BoligPanel) og
   fylles ut som en kvittering mens du svarer. Samme canvas, typografi og
   ink-knapp som forsiden — skjemaet føles som at siden fortsetter.

   All forretningslogikk fra forrige versjon er beholdt 1:1:
   · komplett adresse (gate+nr, 4-sifret postnr, poststed) eller FINN-lenke/-kode
   · ?address&postal&city / ?finn / ?tier fra URL (tier hopper over tjenestesteget)
   · full forvaltning kun i Bergen-området — utenfor: «Registrer interesse»
   · privatperson / bedrift (Enhetsregisteret, status-bekreftelse)
   · avtale for selvforvaltning (versjonert) · payload til /api/leads
   · konto-handoff (onboarding_url) for selvforvaltning · analytics
--------------------------------------------------------------------------- */

const SELF_TERMS_VERSION = 'selvforvaltning-2025-06';

const STEG = [
  { id: 'adresse', label: 'Adresse' },
  { id: 'tjeneste', label: 'Tjeneste' },
  { id: 'kontakt', label: 'Kontakt' },
];

const LAND = [
  { iso: 'NO', name: 'Norge', dial: '+47', min: 8, max: 8 },
  { iso: 'SE', name: 'Sverige', dial: '+46', min: 7, max: 10 },
  { iso: 'DK', name: 'Danmark', dial: '+45', min: 8, max: 8 },
  { iso: 'FI', name: 'Finland', dial: '+358', min: 6, max: 12 },
  { iso: 'IS', name: 'Island', dial: '+354', min: 7, max: 7 },
  { iso: 'GB', name: 'Storbritannia', dial: '+44', min: 9, max: 10 },
  { iso: 'US', name: 'USA', dial: '+1', min: 10, max: 10 },
  { iso: 'CA', name: 'Canada', dial: '+1', min: 10, max: 10 },
  { iso: 'DE', name: 'Tyskland', dial: '+49', min: 7, max: 12 },
  { iso: 'FR', name: 'Frankrike', dial: '+33', min: 9, max: 9 },
  { iso: 'ES', name: 'Spania', dial: '+34', min: 9, max: 9 },
  { iso: 'PL', name: 'Polen', dial: '+48', min: 9, max: 9 },
  { iso: 'NL', name: 'Nederland', dial: '+31', min: 9, max: 9 },
  { iso: 'BE', name: 'Belgia', dial: '+32', min: 8, max: 9 },
  { iso: 'CH', name: 'Sveits', dial: '+41', min: 9, max: 9 },
  { iso: 'AT', name: 'Østerrike', dial: '+43', min: 7, max: 13 },
  { iso: 'LT', name: 'Litauen', dial: '+370', min: 8, max: 8 },
  { iso: 'LV', name: 'Latvia', dial: '+371', min: 8, max: 8 },
  { iso: 'EE', name: 'Estland', dial: '+372', min: 7, max: 8 },
  { iso: 'UA', name: 'Ukraina', dial: '+380', min: 9, max: 9 },
  { iso: 'RO', name: 'Romania', dial: '+40', min: 9, max: 9 },
  { iso: 'TR', name: 'Tyrkia', dial: '+90', min: 10, max: 10 },
  { iso: 'IN', name: 'India', dial: '+91', min: 10, max: 10 },
  { iso: 'PK', name: 'Pakistan', dial: '+92', min: 10, max: 10 },
];
const landFor = (iso) => LAND.find((c) => c.iso === iso) || LAND[0];
const flagg = (iso) => String.fromCodePoint(...iso.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
const bareSiffer = (v, max = 15) => String(v || '').replace(/\D/g, '').slice(0, max);
const intSiffer = (v, iso) => { const d = bareSiffer(v); return iso !== 'NO' && d.startsWith('0') ? d.slice(1) : d; };
const telefonOk = (v, iso) => { const c = landFor(iso); const d = intSiffer(v, iso); return d.length >= c.min && d.length <= c.max; };
const e164 = (v, iso) => `${landFor(iso).dial}${intSiffer(v, iso)}`;

const erBergen = (postal = '', city = '') => {
  if (String(city).trim().toLowerCase() === 'bergen') return true;
  return /^5[0-2]\d\d$/.test(String(postal).trim());
};
const komplettAdresse = (address = '', postal = '', city = '') => {
  const gate = String(address).split(',')[0].trim();
  return /[A-Za-zÆØÅæøå]/.test(gate) && /\d+[A-Za-z]?\b/.test(gate) && /^\d{4}$/.test(String(postal).trim()) && /[A-Za-zÆØÅæøå]{2}/.test(String(city).trim());
};
const gateAv = (address = '', postal = '', city = '') => {
  let g = String(address || '').trim();
  for (const suffiks of [`, ${postal} ${city}`, `, ${city}`]) {
    if (city && g.toLowerCase().endsWith(suffiks.toLowerCase())) { g = g.slice(0, -suffiks.length); break; }
  }
  return g;
};

/* ── Topplinje: wordmark · steg · telefon · lukk ── */
function Topplinje({ steg, onTil }) {
  const i = STEG.findIndex((s) => s.id === steg);
  return (
    <header className="sticky top-0 z-40" style={{ background: 'rgba(243,241,236,0.92)', backdropFilter: 'saturate(1.2) blur(8px)' }}>
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="DigiHome — til forsiden" className="inline-flex items-center" data-testid="start-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[18px] w-auto" />
        </Link>
        <ol className="hidden items-center gap-6 md:flex" aria-label="Fremdrift">
          {STEG.map((s, n) => {
            const gjort = n < i; const naa = n === i;
            const inner = (
              <span className="inline-flex items-center gap-2 text-[13.5px]" style={{ color: naa ? T.ink : gjort ? 'rgba(21,19,15,0.6)' : 'rgba(21,19,15,0.35)', fontWeight: naa ? 500 : 400 }}>
                {gjort ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : <span className="tabular-nums">{n + 1}.</span>}
                {s.label}
              </span>
            );
            return (
              <li key={s.id}>
                {gjort && onTil ? <button type="button" onClick={() => onTil(s.id)} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" data-testid={`start-steg-${s.id}`}>{inner}</button> : inner}
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-5 text-[13.5px]">
          <a href={`tel:${site.phoneHref}`} className="hidden text-[#15130F]/60 transition-colors hover:text-[#15130F] lg:inline">{site.phone}</a>
          <Link href="/" className="text-[#15130F]/70 transition-colors hover:text-[#15130F]" data-testid="start-lukk">Lukk</Link>
        </div>
      </div>
      <div className="h-px" style={{ background: 'rgba(21,19,15,0.08)' }} aria-hidden="true">
        <div className="h-full" style={{ width: `${((i + 1) / STEG.length) * 100}%`, background: T.ink, transition: `width 600ms ${EASE}` }} />
      </div>
    </header>
  );
}

/* ── Stegtittel: én setning i display, én linje under ── */
function Tittel({ over, tittel, tekst, testId }) {
  return (
    <div>
      {over ? <p className="mb-3 text-[14px] font-medium text-[#15130F]/55">{over}</p> : null}
      <h1 className="text-[36px] sm:text-[46px] lg:text-[52px]" style={{ ...display, color: T.ink, maxWidth: '16ch' }} data-testid={testId}>{tittel}</h1>
      {tekst ? <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.5] text-[#15130F]/65 sm:text-[17px]">{tekst}</p> : null}
    </div>
  );
}

function Tilbake({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="mb-7 inline-flex items-center gap-2 text-[13.5px] text-[#15130F]/60 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" data-testid="start-tilbake">
      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> Tilbake
    </button>
  );
}

export default function StartV4() {
  const [steg, setSteg] = useState('adresse');
  const [form, setForm] = useState({ address: '', postalCode: '', city: '', propertyType: '', sqm: '', bedrooms: '', name: '', email: '', phone: '', service: '', ownerKind: 'private' });
  const [pos, setPos] = useState(null);
  const [bekreftet, setBekreftet] = useState(false);
  const [preService, setPreService] = useState('');
  const [finnUrl, setFinnUrl] = useState('');
  const [finnCode, setFinnCode] = useState('');
  const [finnLaster, setFinnLaster] = useState(false);
  const [finnNotat, setFinnNotat] = useState('');
  const [company, setCompany] = useState(null);
  const [companyAck, setCompanyAck] = useState(false);
  const [landIso, setLandIso] = useState('NO');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [laster, setLaster] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [accountUrl, setAccountUrl] = useState('');
  const [sendFeil, setSendFeil] = useState('');
  const [prefillFerdig, setPrefillFerdig] = useState(false);

  const stegIndex = STEG.findIndex((s) => s.id === steg);
  const gate = gateAv(form.address, form.postalCode, form.city);
  const utenforOmrade = form.service === 'full_forvaltning' && !!form.postalCode && !erBergen(form.postalCode, form.city);
  const fullUtilgjengelig = !!form.postalCode && !erBergen(form.postalCode, form.city);

  const setField = useCallback((felt, verdi) => {
    setForm((c) => ({ ...c, [felt]: verdi }));
    setErrors((c) => { if (!c[felt]) return c; const n = { ...c }; delete n[felt]; return n; });
  }, []);

  /* Geokoder tekstadresse via egen proxy (nøkkelen forblir server-side). Stille feil. */
  const geokod = useCallback(async (adresse) => {
    try {
      const q = String(adresse || '').trim();
      if (q.length < 4) return;
      const r = await fetch(`/api/address?q=${encodeURIComponent(q)}`);
      const j = await r.json().catch(() => ({}));
      const treff = (j?.suggestions || []).find((s) => s.place_id);
      if (!treff) return;
      const r2 = await fetch(`/api/address?place_id=${encodeURIComponent(treff.place_id)}`);
      const d = await r2.json().catch(() => ({}));
      if (d && typeof d.lat === 'number' && typeof d.lng === 'number') setPos({ lat: d.lat, lng: d.lng });
    } catch (e) { /* panelet er forsterkning, ikke krav */ }
  }, []);

  const velgTjeneste = useCallback((service) => {
    if (!service) return;
    setField('service', service);
    setTerms(false);
    try { track('tier_entry_choice', { form: 'utleier-start', tier: service, in_bergen: erBergen(form.postalCode, form.city) }); } catch (e) { /* ok */ }
    setSteg('kontakt');
  }, [form.postalCode, form.city, setField]);

  /* Etter adressen: hopp over tjenestesteget hvis valget alt er tatt (og lovlig). */
  const etterAdresse = useCallback((pre, postal, city) => {
    const lovlig = pre === 'selvforvaltning' || (pre === 'full_forvaltning' && erBergen(postal, city));
    if (pre && lovlig) {
      try { track('tier_prefilled', { form: 'utleier-start', tier: pre }); } catch (e) { /* ok */ }
      setField('service', pre);
      setTerms(false);
      setSteg('kontakt');
      return;
    }
    setSteg('tjeneste');
  }, [setField]);

  const losFinn = useCallback(async (input) => {
    const url = detectFinnReference(input);
    if (!url) return false;
    let code = '';
    try { const p = new URL(url); code = p.searchParams.get('finnkode') || (p.pathname.match(/\b(\d{8,10})\b/) || [])[1] || ''; } catch (e) { /* ok */ }
    setFinnUrl(url); setFinnCode(code); setBekreftet(true); setErrors({}); setFinnLaster(true);
    setFinnNotat('Henter boligopplysninger fra FINN …');
    setForm((c) => ({ ...c, address: '', postalCode: '', city: '', propertyType: '', sqm: '', bedrooms: '' }));
    try {
      const r = await fetch(`/api/finn-preview?url=${encodeURIComponent(url)}`);
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok) {
        const adr = String(d.address || '').trim(); const postal = String(d.postalCode || '').trim(); const city = String(d.city || '').trim();
        setForm((c) => ({ ...c, address: adr, postalCode: postal, city, propertyType: String(d.propertyType || ''), sqm: d.sqm ? String(d.sqm) : '', bedrooms: d.bedrooms ? String(d.bedrooms) : '' }));
        setFinnCode(String(d.finnCode || code));
        if (adr || postal || city) geokod([adr, postal, city].filter(Boolean).join(' '));
        setFinnNotat(adr ? 'Boligopplysningene er hentet fra FINN.' : `Gateadressen er skjult i FINN-annonsen${postal || city ? ` — vi har registrert ${[postal, city].filter(Boolean).join(' ')}` : ''}.`);
      } else {
        setFinnNotat('Vi lagrer FINN-annonsen, men boligdetaljene må avklares i oppfølgingen.');
      }
    } catch (e) {
      setFinnNotat('Vi lagrer FINN-annonsen, men boligdetaljene må avklares i oppfølgingen.');
    } finally {
      setFinnLaster(false);
      setSteg('tjeneste');
    }
    return true;
  }, [geokod]);

  /* URL-prefyll: ?tier, ?finn, ?address&postal&city (heroens felt sender hit). */
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const rawTier = (p.get('tier') || p.get('service') || '').trim();
      const pre = rawTier === 'selvforvaltning' || rawTier === 'full_forvaltning' ? rawTier : '';
      if (pre) setPreService(pre);
      const finn = p.get('finn');
      if (finn && detectFinnReference(finn)) { losFinn(finn); return; }
      const address = (p.get('address') || '').trim(); const postal = (p.get('postal') || '').trim(); const city = (p.get('city') || '').trim();
      if (address && detectFinnReference(address)) { losFinn(address); return; }
      if (komplettAdresse(address, postal, city)) {
        setForm((c) => ({ ...c, address, postalCode: postal, city }));
        setBekreftet(true);
        geokod([address, postal, city].filter(Boolean).join(' '));
        etterAdresse(pre, postal, city);
      } else if (address) {
        setForm((c) => ({ ...c, address, postalCode: postal, city }));
        setBekreftet(false);
      }
    } catch (e) { /* URL er en forbedring, ikke en forutsetning */ }
    finally { setPrefillFerdig(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { trackLeadStart('utleier'); } catch (e) { /* ok */ }
    try { track('form_start', { form: 'utleier', flow: 'utleier-v4' }); } catch (e) { /* ok */ }
  }, []);
  useEffect(() => {
    try { track('form_step', { form: 'utleier', flow: 'utleier-v4', step: stegIndex + 1, label: STEG[stegIndex]?.label }); } catch (e) { /* ok */ }
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* ok */ }
  }, [steg, stegIndex]);

  /* Konto-handoff for selvforvaltning. */
  useEffect(() => {
    if (!sendt || form.service !== 'selvforvaltning' || !accountUrl) return undefined;
    const t = window.setTimeout(() => {
      try { track('account_handoff_redirect', { form: 'utleier', flow: 'utleier-v4' }); } catch (e) { /* ok */ }
      window.location.replace(accountUrl);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [sendt, accountUrl, form.service]);

  const fortsettFraAdresse = async () => {
    const v = form.address.trim();
    if (detectFinnReference(v)) { await losFinn(v); return; }
    if (!bekreftet || !komplettAdresse(v, form.postalCode, form.city)) {
      setErrors({ address: 'Velg en fullstendig adresse fra listen — med husnummer, postnummer og poststed.' });
      return;
    }
    setFinnUrl(''); setFinnCode(''); setFinnNotat(''); setErrors({});
    etterAdresse(preService, form.postalCode, form.city);
  };

  const kontaktFeil = useMemo(() => {
    const n = {};
    if (!form.name.trim()) n.name = form.ownerKind === 'business' ? 'Skriv inn navnet på kontaktpersonen.' : 'Skriv inn navnet ditt.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) n.email = 'Skriv inn en gyldig e-postadresse.';
    if (!telefonOk(form.phone, landIso)) { const c = landFor(landIso); n.phone = c.min === c.max ? `Skriv inn et gyldig nummer for ${c.name} (${c.min} siffer).` : `Skriv inn et gyldig nummer for ${c.name}.`; }
    if (form.ownerKind === 'business') {
      if (!company || !company.orgNo) n.company = 'Søk opp selskapet, eller fyll det inn manuelt.';
      else if (company.status && company.status !== 'aktiv' && !companyAck) n.company = 'Bekreft at selskapet skal registreres selv om statusen er merket.';
    }
    if (form.service === 'selvforvaltning' && !terms) n.terms = 'Godta avtalen for å opprette konto.';
    return n;
  }, [form, landIso, terms, company, companyAck]);

  const send = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (laster) return;
    if (Object.keys(kontaktFeil).length) {
      setErrors(kontaktFeil);
      /* Fokuser første felt med feil — på mobil ligger det ofte over folden. */
      const rekkefolge = [['company', '[data-testid="start-selskap"] input'], ['name', '#owner-name-input'], ['email', '#owner-email-input'], ['phone', '#owner-phone-input'], ['terms', '[data-testid="owner-terms-checkbox"]']];
      const forste = rekkefolge.find(([k]) => kontaktFeil[k]);
      if (forste) { try { const el = document.querySelector(forste[1]); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus({ preventScroll: true }); } catch (e2) { /* ok */ } }
      return;
    }
    setLaster(true); setSendFeil('');
    const telefon = e164(bareSiffer(form.phone), landIso);
    const adresse = form.address.trim();
    const sqm = form.sqm ? Number(form.sqm) || null : null;
    const bedrooms = form.bedrooms ? Number(form.bedrooms) || null : null;
    const propertyType = form.propertyType || '';
    const bedrift = form.ownerKind === 'business';
    const payload = {
      address: adresse, postal_code: form.postalCode, city: form.city || undefined, outside_area: utenforOmrade || undefined,
      sqm, bedrooms, property_type: propertyType,
      name: form.name.trim(), email: form.email.trim(), phone: telefon, availability: '', lead_type: 'huseier', tier: form.service,
      owner_kind: form.ownerKind,
      org_no: bedrift ? (company?.orgNo || '') : undefined,
      company_name: bedrift ? (company?.name || '') : undefined,
      company_form: bedrift ? (company?.formLabel || '') : undefined,
      company_address: bedrift && company?.address ? [company.address.street, [company.address.postalCode, company.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : undefined,
      terms: form.service === 'selvforvaltning' && terms ? { version: SELF_TERMS_VERSION } : undefined,
      finn_url: finnUrl || undefined,
      units: [{ address: adresse, postal_code: form.postalCode, property_type: propertyType, sqm, bedrooms, finn_url: finnUrl || undefined }],
      num_properties: 1,
      attribution: { ...getLeadAttribution(), ...getClickIds() },
      notes: finnUrl ? `FINN${finnCode ? ` ${finnCode}` : ''}: ${finnNotat || 'Boligdetaljer avklares i oppfølgingen.'}` : 'Hurtigregistrering (v4) — boligdetaljer avklares senere.',
    };
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || (!d.success && !d.ok)) throw new Error('submit_failed');
      const url = d?.account?.onboarding_url || d?.data?.account?.onboarding_url;
      if (typeof url === 'string' && /^https:\/\//.test(url)) setAccountUrl(url);
      setSendt(true);
      try { track('lead_submit', { form: 'utleier', flow: 'utleier-v4', tier: form.service }); } catch (e2) { /* ok */ }
      try { trackLead({ formId: 'utleier', source: 'bli-utleier', leadId: d?.data?.id, email: form.email.trim(), phone: telefon }); } catch (e2) { /* ok */ }
    } catch (e2) {
      setSendFeil('Vi fikk ikke sendt inn akkurat nå. Prøv igjen — opplysningene dine er fortsatt her.');
    } finally {
      setLaster(false);
    }
  };

  const erSelv = form.service === 'selvforvaltning';
  const kontaktTekst = form.name.trim() ? [form.name.trim(), form.email.trim()].filter(Boolean).join(' · ') : '';
  const panel = <BoligPanel adresse={form.address} postal={form.postalCode} city={form.city} pos={pos} modell={form.service} kontakt={sendt ? kontaktTekst : ''} />;
  const panelKompakt = (form.address || pos) ? <BoligPanel adresse={form.address} postal={form.postalCode} city={form.city} pos={pos} modell={form.service} kompakt /> : null;

  /* ── Ferdig ── */
  if (sendt) {
    const fornavn = form.name.trim().split(' ')[0];
    return (
      <div className="min-h-[100svh] antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="start-ferdig">
        <Topplinje steg="kontakt" />
        <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-[680px] flex-col items-center justify-center px-5 py-14 text-center sm:px-8">
          <div className="dh-cover-inn w-full">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: erSelv && accountUrl ? T.ink : T.gronn }}>
              {erSelv && accountUrl ? <Loader2 className="h-5 w-5 animate-spin text-[#F4F1EA]" /> : <Check className="h-5 w-5 text-white" strokeWidth={2.4} />}
            </span>
            <h1 className="mt-7 text-[40px] sm:text-[56px]" style={{ ...display, color: T.ink }} data-testid="start-ferdig-tittel">
              {erSelv && accountUrl ? 'Kontoen er klar.' : `Takk, ${fornavn}.`}
            </h1>
            <p className="mx-auto mt-4 max-w-[44ch] text-[16px] leading-[1.5] text-[#15130F]/65 sm:text-[17px]">
              {erSelv
                ? accountUrl ? 'Vi åpner portalen og tar deg rett til boligen din.' : 'Vi setter opp kontoen din og sender tilgang til e-posten din.'
                : utenforOmrade ? `Vi har registrert interessen din. Du får beskjed når full forvaltning kommer til ${form.city || 'ditt område'}.` : 'En lokal rådgiver ser på boligen og tar kontakt innen 24 timer.'}
            </p>
            <p className="mt-5 text-[14px] text-[#15130F]/55">Bekreftelse er sendt til {form.email.trim()}.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {accountUrl ? (
                <button type="button" onClick={() => window.location.assign(accountUrl)} className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[12px] px-7 text-[15px] font-medium" style={{ background: T.ink, color: '#F4F1EA' }} data-testid="start-konto-knapp">Åpne portalen <ArrowRight className="h-4 w-4" strokeWidth={1.8} /></button>
              ) : null}
              <Link href="/" className="inline-flex h-[52px] items-center justify-center rounded-[12px] px-7 text-[15px] font-medium text-[#15130F]" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.14)' }}>Til forsiden</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="start-v4">
      <Topplinje steg={steg} onTil={(s) => setSteg(s)} />
      <div className="mx-auto grid w-full max-w-[1600px] lg:min-h-[calc(100svh-65px)] lg:grid-cols-[minmax(0,1fr)_minmax(400px,44%)]">
        {/* ── Venstre: stegene ── */}
        <main className="flex min-w-0 flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:justify-center lg:px-14 lg:py-14 xl:px-20">
          {/* Mobil: boligen som stripe over stegene */}
          {panelKompakt ? <div className="mb-8 lg:hidden">{panelKompakt}</div> : null}

          <div className="mx-auto w-full max-w-[560px] lg:mx-0" style={{ opacity: prefillFerdig ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>
            {steg === 'adresse' ? (
              <section key="adresse" className="dh-cover-inn" data-testid="start-steg-adresse">
                <Tittel tittel="Hvor ligger boligen?" tekst="Skriv inn adressen — eller lim inn FINN-annonsen." testId="start-h1" />
                <div className="mt-9">
                  <AdresseSok
                    verdi={form.address}
                    onEndre={(v) => {
                      const finn = detectFinnReference(v);
                      setBekreftet(false);
                      setForm((c) => ({ ...c, address: v, ...(finn ? {} : { postalCode: '', city: '', propertyType: '', sqm: '', bedrooms: '' }) }));
                      setErrors((c) => ({ ...c, address: '' }));
                      if (!finn) { setFinnUrl(''); setFinnCode(''); setFinnNotat(''); setPos(null); }
                    }}
                    onVelg={(v) => {
                      const address = String(v.address || '').replace(/,\s*(Norway|Norge)$/i, '');
                      const postal = String(v.postal || '').trim(); const city = String(v.city || '').trim();
                      if (typeof v.lat === 'number' && typeof v.lng === 'number') setPos({ lat: v.lat, lng: v.lng });
                      else if (!v.pending) geokod([address, postal, city].filter(Boolean).join(' '));
                      const komplett = komplettAdresse(address, postal, city);
                      setForm((c) => ({ ...c, address, postalCode: postal, city }));
                      setBekreftet(v.pending ? true : komplett);
                      setErrors(v.pending || komplett ? {} : { address: 'Adresseforslaget mangler husnummer, postnummer eller poststed.' });
                      try { track('address_search', { selected: true }); } catch (e) { /* ok */ }
                    }}
                    onFortsett={fortsettFraAdresse}
                    klar={finnLaster || bekreftet || !!detectFinnReference(form.address)}
                    laster={finnLaster}
                    bekreftet={bekreftet && !finnUrl}
                    feil={errors.address}
                    knapp={finnLaster ? 'Henter' : 'Fortsett'}
                    autoFokus={prefillFerdig}
                  />
                </div>
                {finnLaster ? <p className="mt-4 text-[13.5px] text-[#15130F]/55">Henter boligopplysninger fra FINN …</p> : null}
                <p className="mt-6 text-[13.5px] text-[#15130F]/45">Vi bruker adressen til å finne boligen og vise deg riktige valg. Ingenting sendes før du sier ja.</p>
              </section>
            ) : null}

            {steg === 'tjeneste' ? (
              <section key="tjeneste" className="dh-cover-inn" data-testid="start-steg-tjeneste">
                <Tilbake onClick={() => setSteg('adresse')} />
                <Tittel
                  tittel={gate && gate.length <= 30 ? <>Hvordan vil du leie ut {gate}?</> : 'Hvordan vil du leie ut?'}
                  tekst="Uforpliktende — og du kan endre mening senere."
                  testId="start-h1"
                />
                {finnUrl && finnNotat ? <p className="mt-4 text-[13.5px] text-[#15130F]/55" data-testid="start-finn-notat">{finnNotat}</p> : null}

                <ol className="mt-9 flex flex-col gap-3" data-testid="start-tjenester">
                  {/* Lei ut selv — systemet */}
                  <li>
                    <button type="button" onClick={() => velgTjeneste('selvforvaltning')} className="group flex w-full items-stretch gap-5 rounded-[18px] p-5 text-left transition-[background-color,box-shadow] duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 sm:p-6" style={{ background: '#FBFAF8', boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.10)' }} data-testid="service-selvforvaltning">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-4">
                          <span className="text-[24px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>Lei ut selv</span>
                          <span className="hidden shrink-0 text-[13px] text-[#15130F]/50 sm:inline">Hele Norge</span>
                        </span>
                        <span className="mt-2 block text-[14.5px] leading-[1.5] text-[#15130F]/65">Kontrakt med BankID, husleie med oppfølging og saker der du bare godkjenner. Du styrer — systemet gjør jobben.</span>
                        <span className="mt-4 flex items-center justify-between gap-4">
                          <span className="text-[13.5px] text-[#15130F]/60"><span className="font-medium text-[#15130F]">5 % av husleien</span> · ingen bindingstid · konto på ett minutt</span>
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5" style={{ background: T.ink, color: '#F4F1EA' }}><ArrowRight className="h-4 w-4" strokeWidth={1.8} /></span>
                        </span>
                      </span>
                    </button>
                  </li>
                  {/* Full forvaltning — menneskene */}
                  <li>
                    <button type="button" onClick={() => velgTjeneste('full_forvaltning')} className="group flex w-full items-stretch gap-5 rounded-[18px] p-5 text-left transition-[background-color,box-shadow] duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 sm:p-6" style={{ background: '#FBFAF8', boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.10)' }} data-testid="service-full_forvaltning">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-4">
                          <span className="text-[24px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>Full forvaltning</span>
                          <span className="hidden shrink-0 text-[13px] text-[#15130F]/50 sm:inline">{fullUtilgjengelig ? `Kommer til ${form.city || 'ditt område'}` : 'Bergen og omegn'}</span>
                        </span>
                        <span className="mt-2 block text-[14.5px] leading-[1.5] text-[#15130F]/65">Én fast forvalter tar visninger, leietakervalg, kontrakt og oppfølging. Du får rapporten — og siste ord.</span>
                        <span className="mt-4 flex items-center justify-between gap-4">
                          <span className="flex min-w-0 items-center gap-2.5 text-[13.5px] text-[#15130F]/60">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/brand/sarah-sleeman-360.webp" alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover" style={{ boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} />
                            <span className="sm:truncate">{fullUtilgjengelig ? 'Registrer interesse — vi sier fra når vi lanserer' : <><span className="font-medium text-[#15130F]">Personlig tilbud</span> · svar innen 24 timer · ingen bindingstid</>}</span>
                          </span>
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5" style={{ background: T.ink, color: '#F4F1EA' }}><ArrowRight className="h-4 w-4" strokeWidth={1.8} /></span>
                        </span>
                      </span>
                    </button>
                  </li>
                </ol>
              </section>
            ) : null}

            {steg === 'kontakt' ? (
              <section key="kontakt" className="dh-cover-inn" data-testid="start-steg-kontakt">
                <Tilbake onClick={() => setSteg('tjeneste')} />
                <Tittel
                  over={<>{erSelv ? 'Lei ut selv' : 'Full forvaltning'}{gate ? <> · {gate}</> : null} <button type="button" onClick={() => setSteg('tjeneste')} className="ml-1 underline decoration-[#15130F]/25 underline-offset-4 hover:text-[#15130F]" data-testid="start-endre">Endre</button></>}
                  tittel={erSelv ? 'Opprett kontoen din' : 'Hvor kan vi nå deg?'}
                  tekst={erSelv ? 'Kun kontaktinformasjon nå. Boligen legger du inn når kontoen er klar.' : utenforOmrade ? 'Vi trenger bare kontaktinformasjonen din for å gi beskjed når vi lanserer.' : 'Vi trenger bare kontaktinformasjonen din for å følge opp tilbudet.'}
                  testId="start-h1"
                />

                <form onSubmit={send} className="mt-9 flex flex-col gap-5" noValidate>
                  <Segment
                    label="Jeg registrerer som"
                    verdi={form.ownerKind}
                    onChange={(k) => {
                      setField('ownerKind', k);
                      setErrors((c) => ({ ...c, company: '' }));
                      if (k === 'private') { setCompany(null); setCompanyAck(false); }
                      try { track('owner_kind_choice', { form: 'utleier-start', kind: k }); } catch (e) { /* ok */ }
                    }}
                    valg={[['private', 'Privatperson'], ['business', 'Bedrift']]}
                    testId="owner-kind"
                  />
                  {form.ownerKind === 'business' ? (
                    <div data-testid="start-selskap">
                      <CompanyPicker
                        value={company}
                        onSelect={(n) => { setCompany(n); setCompanyAck(false); setErrors((c) => ({ ...c, company: '' })); }}
                        onClear={() => { setCompany(null); setCompanyAck(false); }}
                        error={errors.company}
                        statusAck={companyAck}
                        onStatusAckChange={(n) => { setCompanyAck(n); setErrors((c) => ({ ...c, company: '' })); }}
                      />
                    </div>
                  ) : null}
                  <TekstFelt id="owner-name-input" label={form.ownerKind === 'business' ? 'Kontaktperson' : 'Fullt navn'} value={form.name} onChange={(e) => setField('name', e.target.value)} autoComplete="name" placeholder="Ola Nordmann" feil={errors.name} autoFokus />
                  <TekstFelt id="owner-email-input" label="E-post" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} autoComplete="email" inputMode="email" placeholder="ola@eksempel.no" feil={errors.email} />
                  <TelefonFelt id="owner-phone-input" land={landIso} onLand={(iso) => { setLandIso(iso); setField('phone', bareSiffer(form.phone, landFor(iso).max + (iso === 'NO' ? 0 : 1))); }} landListe={LAND} flagg={flagg} value={form.phone} feil={errors.phone}
                    onChange={(e) => {
                      const raw = String(e.target.value || '').trim();
                      let iso = landIso; let lokal = raw;
                      if (raw.startsWith('+')) { const m = [...LAND].sort((a, b) => b.dial.length - a.dial.length).find((l) => raw.startsWith(l.dial)); if (m) { iso = m.iso; lokal = raw.slice(m.dial.length); setLandIso(m.iso); } }
                      setField('phone', bareSiffer(lokal, landFor(iso).max + (iso === 'NO' ? 0 : 1)));
                    }} />

                  {erSelv ? (
                    <Avkryssing id="owner-terms-checkbox" checked={terms} onChange={(v) => { setTerms(v); setErrors((c) => ({ ...c, terms: '' })); }} feil={errors.terms}>
                      Jeg godtar <a href="/vilkar" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-medium text-[#15130F] underline decoration-[#15130F]/30 underline-offset-4">avtalen om selvforvaltning</a> (5 % av husleien, ingen bindingstid)
                      {form.ownerKind === 'business' ? <> — på vegne av <strong className="font-medium text-[#15130F]">{company?.name || 'selskapet'}</strong>, som jeg har signaturrett for.</> : '.'}
                    </Avkryssing>
                  ) : (
                    <p className="text-[13.5px] leading-[1.5] text-[#15130F]/55">{utenforOmrade ? 'Uforpliktende. Vi kontakter deg kun om lansering i ditt område.' : 'Gratis og uforpliktende. En lokal rådgiver kontakter deg innen 24 timer.'}</p>
                  )}

                  {sendFeil ? <p role="alert" className="rounded-[12px] px-4 py-3 text-[13.5px]" style={{ background: 'rgba(180,60,40,0.08)', color: '#8E2E1F' }}>{sendFeil}</p> : null}

                  <div className="pt-2">
                    <StegKnapp type="submit" laster={laster} testId="owner-submit-button">
                      {laster ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {erSelv ? 'Opprett konto' : utenforOmrade ? 'Registrer interesse' : 'Be om tilbud'}
                      {!laster && <ArrowRight className="h-4 w-4" strokeWidth={1.8} />}
                    </StegKnapp>
                    <p className="mt-3 text-[12.5px] text-[#15130F]/45">Ved innsending godtar du at DigiHome kontakter deg om denne henvendelsen.</p>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        </main>

        {/* ── Høyre: boligen din ── */}
        <aside className="hidden lg:block lg:py-6 lg:pr-6" aria-label="Boligen din">
          <div className="sticky top-[88px] h-[calc(100svh-113px)]">{panel}</div>
        </aside>
      </div>
    </div>
  );
}
