'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddressAutocomplete } from './AddressAutocomplete';
import AdresseKart from './AdresseKart';
import CompanyPicker, { type Company } from './CompanyPicker';
import { detectFinnReference } from './PropertyInputs';
import { track, getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { site } from '@/lib/site';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Home,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  ChevronDown,
  Search,
} from 'lucide-react';

const SELF_TERMS_VERSION = 'selvforvaltning-2025-06';

type Phase = 'address' | 'service' | 'contact';
type Service = 'selvforvaltning' | 'full_forvaltning' | '';
// Eier som privatperson eller selskap. Dette avgjør hvem som blir avtalepart —
// og dermed hvem som står på leiekontrakten, honoraravtalen og fakturaen.
type OwnerKind = 'private' | 'business';

type FormState = {
  address: string;
  postalCode: string;
  city: string;
  propertyType: string;
  sqm: string;
  bedrooms: string;
  name: string;
  email: string;
  phone: string;
  service: Service;
  ownerKind: OwnerKind;
};

const PHASES: { id: Phase; label: string }[] = [
  { id: 'address', label: 'Adresse' },
  { id: 'service', label: 'Tjeneste' },
  { id: 'contact', label: 'Kontakt' },
];

const SERVICES = [
  {
    id: 'selvforvaltning' as const,
    icon: KeyRound,
    title: 'Selvforvaltning',
    eyebrow: 'Tilgjengelig i hele Norge',
    description: 'For deg som vil gjøre jobben selv — med profesjonelle verktøy i ryggen.',
    points: ['Opprett konto med én gang', 'Digital kontrakt og samlet oversikt', '5 % av husleien · ingen bindingstid'],
    action: 'Opprett konto',
  },
  {
    id: 'full_forvaltning' as const,
    icon: ShieldCheck,
    title: 'Full forvaltning',
    eyebrow: 'Bergen og omegn',
    description: 'For deg som vil slippe hele jobben — fra annonsering til løpende oppfølging.',
    points: ['Personlig tilbud innen 24 timer', 'Annonsering, visninger og leietakervalg', 'Kontrakt, depositum og løpende oppfølging'],
    action: 'Få et tilbud',
  },
];

const isBergenArea = (postalCode = '', city = '') => {
  if (city.trim().toLowerCase() === 'bergen') return true;
  return /^5[0-2]\d\d$/.test(postalCode.trim());
};

const PHONE_COUNTRIES = [
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
const phoneCountry = (iso: string) => PHONE_COUNTRIES.find((c) => c.iso === iso) || PHONE_COUNTRIES[0];
const countryFlag = (iso: string) => String.fromCodePoint(...iso.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0)));
const normalizePhone = (value: string, max = 15) => value.replace(/\D/g, '').slice(0, max);
const internationalDigits = (value: string, iso: string) => {
  const digits = normalizePhone(value);
  return iso !== 'NO' && digits.startsWith('0') ? digits.slice(1) : digits;
};
const phoneIsValid = (value: string, iso: string) => {
  const country = phoneCountry(iso);
  const digits = internationalDigits(value, iso);
  return digits.length >= country.min && digits.length <= country.max;
};
const phoneE164 = (value: string, iso: string) => `${phoneCountry(iso).dial}${internationalDigits(value, iso)}`;

const isCompleteAddress = (address = '', postalCode = '', city = '') => {
  const street = String(address).split(',')[0].trim();
  return /[A-Za-zÆØÅæøå]/.test(street)
    && /\d+[A-Za-z]?\b/.test(street)
    && /^\d{4}$/.test(String(postalCode).trim())
    && /[A-Za-zÆØÅæøå]{2}/.test(String(city).trim());
};


function TopBar({ phase, onTilSteg }: { phase: Phase; onTilSteg?: (p: Phase) => void }) {
  const current = PHASES.findIndex((item) => item.id === phase);
  const progress = ((current + 1) / PHASES.length) * 100;

  return (
    <header className="sticky top-0 z-40 bg-[#faf9f7]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[760px] items-center justify-between px-5 sm:px-8 lg:max-w-none lg:px-10">
        <a href="/" aria-label="DigiHome — til forsiden" data-testid="onboarding-logo-link" className="inline-flex min-w-0 items-center"><img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-5 w-auto" /></a>
        <nav className="hidden items-center gap-5 md:flex" aria-label="Fremdrift">
          {PHASES.map((item, index) => (
            index < current && onTilSteg ? (
              /* Fullførte steg er klikkbare — navigasjonen bor i stepperen, ikke i ekstra knapper */
              <button key={item.id} type="button" onClick={() => onTilSteg(item.id as Phase)} data-testid={`stepper-${item.id}`}
                className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#77716a] transition-colors hover:text-[#292621]">{index + 1}. {item.label}</button>
            ) : (
              <span key={item.id} className={`text-[10.5px] font-bold uppercase tracking-[0.11em] ${index === current ? 'text-[#292621]' : index < current ? 'text-[#77716a]' : 'text-[#bbb5ae]'}`}>{index + 1}. {item.label}</span>
            )
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <a href={`tel:${site.phoneHref}`} className="hidden items-center gap-1.5 text-[13px] font-medium text-[#5f5a54] hover:text-black lg:inline-flex"><Phone className="h-3.5 w-3.5" /> {site.phone}</a>
          <a href="/bli-utleier" data-testid="onboarding-exit" className="text-[13px] font-semibold text-[#5f5a54] hover:text-black">Lukk</a>
        </div>
      </div>
      <div className="h-px bg-[#e8e4de]" aria-label={`Steg ${current + 1} av ${PHASES.length}`}><div className="h-full bg-[#a56bc7] transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
    </header>
  );
}

function DesktopProof({ pos, adresse }: { pos: { lat: number; lng: number } | null; adresse?: string }) {
  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#f5f3f0] lg:block" aria-label="Kart over boligens beliggenhet">
      {/* Kart-først, nøyaktig som korttid: uskarpt Bergen-kart til adressen velges */}
      <AdresseKart pos={pos} adresse={adresse} />
    </aside>
  );
}

function StepHeading({ eyebrow, title, text }: { eyebrow?: string; title: string; text: string }) {
  return (
    <div>
      {eyebrow ? <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#77716a]">{eyebrow}</p> : null}
      <h1 className="max-w-[14ch] text-[32px] font-bold leading-[1.02] tracking-[-0.04em] text-[#111] sm:text-[42px]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h1>
      <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[#6d6760] sm:text-[16px]">{text}</p>
    </div>
  );
}

function BackButton({ onClick, label = 'Tilbake' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-[13px] font-semibold text-[#5f5a54] hover:text-black" data-testid="onboarding-back">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dedad4] bg-white"><ArrowLeft className="h-4 w-4" /></span>
      {label}
    </button>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  icon: Icon,
  error,
  inputMode,
}: any) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-[#292621]">{label}</label>
      <div className={`relative rounded-[14px] border bg-white transition-shadow focus-within:border-[#292621] focus-within:shadow-[0_0_0_3px_rgba(32,29,26,0.06)] ${error ? 'border-red-400' : 'border-[#d9d4cd]'}`}>
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8580]" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          data-testid={id}
          className="h-14 w-full min-w-0 rounded-2xl bg-transparent pl-11 pr-4 text-[16px] text-[#171513] outline-none placeholder:text-[#99938c]"
        />
      </div>
      {error ? <p id={`${id}-error`} className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

function PhoneField({ country, onCountryChange, value, onChange, error }: any) {
  const selected = phoneCountry(country);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const filtered = PHONE_COUNTRIES.filter((item) => `${item.iso} ${item.name} ${item.dial}`.toLocaleLowerCase('nb-NO').includes(search.trim().toLocaleLowerCase('nb-NO')));

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open]);

  const toggle = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 330 && rect.top > 330);
      setSearch('');
    }
    setOpen((value) => !value);
  };

  const choose = (iso: string) => {
    onCountryChange(iso);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor="owner-phone-input" className="mb-2 block text-[13px] font-semibold text-[#292621]">Telefon</label>
      <div className={`flex overflow-hidden rounded-[14px] border bg-white transition-shadow focus-within:border-[#292621] focus-within:shadow-[0_0_0_3px_rgba(32,29,26,0.06)] ${error ? 'border-red-400' : 'border-[#d9d4cd]'}`}>
        <button type="button" onClick={toggle} aria-haspopup="listbox" aria-expanded={open} aria-label={`Landskode ${selected.name} ${selected.dial}`} data-testid="owner-phone-country"
          className="group flex h-[52px] w-[116px] shrink-0 items-center gap-2 border-r border-[#e4dfd9] bg-[#faf9f7] px-3 text-left outline-none transition hover:bg-[#f4f1ed]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ddd7d0] bg-white text-[17px] leading-none" aria-hidden>{countryFlag(selected.iso)}</span>
          <span className="text-[13px] font-semibold text-[#292621]">{selected.dial}</span>
          <ChevronDown className={`ml-auto h-3.5 w-3.5 text-[#8b8580] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <div className="relative min-w-0 flex-1">
          <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8580]" />
          <input id="owner-phone-input" type="tel" value={value} onChange={onChange} autoComplete="tel" inputMode="tel"
            placeholder={selected.iso === 'NO' ? '8 siffer' : 'Telefonnummer'} aria-invalid={!!error} aria-describedby={error ? 'owner-phone-input-error' : undefined}
            data-testid="owner-phone-input" className="h-[52px] w-full min-w-0 bg-transparent pl-10 pr-4 text-[16px] text-[#171513] outline-none placeholder:text-[#99938c]" />
        </div>
      </div>

      {open ? (
        <div className={`absolute left-0 z-[80] w-[320px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-[#ded9d2] bg-white shadow-[0_24px_70px_-28px_rgba(20,16,12,.42)] ${dropUp ? 'bottom-[60px]' : 'top-[82px]'}`} data-testid="owner-phone-country-menu">
          <div className="border-b border-[#eee9e3] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#99928a]" />
              <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Søk land eller kode" aria-label="Søk landskode"
                className="h-10 w-full rounded-xl border border-[#e3ded7] bg-[#faf9f7] pl-9 pr-3 text-[13px] outline-none focus:border-[#aaa29a]" />
            </div>
          </div>
          <div role="listbox" aria-label="Velg landskode" className="max-h-[250px] overflow-y-auto p-1.5">
            {filtered.length ? filtered.map((item) => {
              const active = item.iso === selected.iso;
              return (
                <button key={item.iso} type="button" role="option" aria-selected={active} onClick={() => choose(item.iso)} data-testid={`owner-phone-country-${item.iso}`}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-[#f0ede8]' : 'hover:bg-[#faf8f5]'}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ddd7d0] bg-white text-[19px] leading-none" aria-hidden>{countryFlag(item.iso)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[#292621]">{item.name}</span><span className="block text-[11.5px] text-[#8b8580]">{item.dial}</span></span>
                  {active ? <Check className="h-4 w-4 text-[#292621]" strokeWidth={2.5} /> : null}
                </button>
              );
            }) : <p className="px-3 py-6 text-center text-[12.5px] text-[#8b8580]">Ingen land funnet</p>}
          </div>
        </div>
      ) : null}
      {error ? <p id="owner-phone-input-error" className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p> : null}
    </div>
  );
}


export default function OwnerOnboarding2026() {
  const [phase, setPhase] = useState<Phase>('address');
  const [form, setForm] = useState<FormState>({
    address: '',
    postalCode: '',
    city: '',
    propertyType: '',
    sqm: '',
    bedrooms: '',
    name: '',
    email: '',
    phone: '',
    service: '',
    ownerKind: 'private',
  });
  // Valgt selskap fra Enhetsregisteret (eller manuelt utfylt hvis registeret er nede).
  const [company, setCompany] = useState<Company | null>(null);
  const [companyStatusAck, setCompanyStatusAck] = useState(false);
  const [phoneCountryIso, setPhoneCountryIso] = useState('NO');
  const [addressVerified, setAddressVerified] = useState(false);
  // Kartposisjon i høyrepanelet (kart-først, som korttid)
  const [kartPos, setKartPos] = useState<{ lat: number; lng: number } | null>(null);
  /* Geokoder en tekstadresse via vår egen /api/address-proxy (Google-nøkkelen
     forblir server-side for søket). Brukes for FINN-/prefill-adresser som
     ikke kommer med koordinater. Stille feil — kartet er forsterkning, ikke krav. */
  const geokodTilKart = useCallback(async (adresse: string) => {
    try {
      const q = String(adresse || '').trim();
      if (q.length < 4) return;
      const r = await fetch(`/api/address?q=${encodeURIComponent(q)}`);
      const j = await r.json().catch(() => ({} as any));
      const treff = (j?.suggestions || []).find((s: any) => s.place_id);
      if (!treff) return;
      const r2 = await fetch(`/api/address?place_id=${encodeURIComponent(treff.place_id)}`);
      const d = await r2.json().catch(() => ({} as any));
      if (d && typeof d.lat === 'number' && typeof d.lng === 'number') setKartPos({ lat: d.lat, lng: d.lng });
    } catch { /* behold foto */ }
  }, []);
  // Tjeneste forhåndsvalgt i URL-en (?tier=selvforvaltning). Produktsiden
  // /selvforvaltning lar brukeren velge FØR hen kommer hit, og da skal vi ikke
  // stille samme spørsmål på nytt. Full forvaltning honoreres bare når
  // adressen ligger i Bergen — vi kan ikke levere den andre steder.
  const [preService, setPreService] = useState<Service>('');
  const [finnUrl, setFinnUrl] = useState('');
  const [finnCode, setFinnCode] = useState('');
  const [finnLookupLoading, setFinnLookupLoading] = useState(false);
  const [finnLookupNote, setFinnLookupNote] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accountUrl, setAccountUrl] = useState('');
  const [submitError, setSubmitError] = useState('');

  const phaseIndex = PHASES.findIndex((item) => item.id === phase);
  const selectedService = SERVICES.find((item) => item.id === form.service);
  const finnLocation = [form.postalCode, form.city].filter(Boolean).join(' ').trim();
  const addressLabel = finnUrl
    ? (form.address || [finnCode ? `FINN ${finnCode}` : 'FINN-annonse', finnLocation].filter(Boolean).join(' · '))
    : form.address;
  const outsideArea = form.service === 'full_forvaltning' && !!form.postalCode && !isBergenArea(form.postalCode, form.city);

  const setField = useCallback((field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const handlePhoneInput = useCallback((raw: string) => {
    const trimmed = String(raw || '').trim();
    let iso = phoneCountryIso;
    let local = trimmed;
    if (trimmed.startsWith('+')) {
      const match = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((item) => trimmed.startsWith(item.dial));
      if (match) { iso = match.iso; local = trimmed.slice(match.dial.length); setPhoneCountryIso(match.iso); }
    }
    setField('phone', normalizePhone(local, phoneCountry(iso).max + (iso === 'NO' ? 0 : 1)));
  }, [phoneCountryIso, setField]);

  const changePhoneCountry = useCallback((iso: string) => {
    setPhoneCountryIso(iso);
    setField('phone', normalizePhone(form.phone, phoneCountry(iso).max + (iso === 'NO' ? 0 : 1)));
  }, [form.phone, setField]);


  const resolveFinnReference = useCallback(async (input: string) => {
    const url = detectFinnReference(input);
    if (!url) return false;

    let code = '';
    try {
      const parsed = new URL(url);
      code = parsed.searchParams.get('finnkode') || (parsed.pathname.match(/\b(\d{8,10})\b/) || [])[1] || '';
    } catch { /* detectFinnReference returnerer alltid en gyldig URL */ }

    setFinnUrl(url);
    setFinnCode(code);
    setAddressVerified(true);
    setErrors({});
    setFinnLookupLoading(true);
    setFinnLookupNote('Henter boligopplysninger fra FINN …');
    // En FINN-kode er aldri en gateadresse. Nullstill gamle/falske boligdata før oppslag.
    setForm((current) => ({
      ...current,
      address: '', postalCode: '', city: '', propertyType: '', sqm: '', bedrooms: '',
    }));

    try {
      const response = await fetch(`/api/finn-preview?url=${encodeURIComponent(url)}`);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.ok) {
        const resolvedAddress = String(data.address || '').trim();
        const postalCode = String(data.postalCode || '').trim();
        const city = String(data.city || '').trim();
        setForm((current) => ({
          ...current,
          address: resolvedAddress,
          postalCode,
          city,
          propertyType: String(data.propertyType || ''),
          sqm: data.sqm ? String(data.sqm) : '',
          bedrooms: data.bedrooms ? String(data.bedrooms) : '',
        }));
        setFinnCode(String(data.finnCode || code));
        // Kartet: FINN-adressen kommer uten koordinater → geokod det vi har
        if (resolvedAddress || postalCode || city) {
          geokodTilKart([resolvedAddress, postalCode, city].filter(Boolean).join(' '));
        }
        setFinnLookupNote(resolvedAddress
          ? 'Boligopplysningene er hentet fra FINN.'
          : `Gateadressen er skjult i FINN-annonsen${postalCode || city ? ` — vi har registrert ${[postalCode, city].filter(Boolean).join(' ')}` : ''}.`);
      } else {
        setFinnLookupNote('Vi lagrer FINN-annonsen, men boligdetaljene må avklares i oppfølgingen.');
      }
    } catch {
      setFinnLookupNote('Vi lagrer FINN-annonsen, men boligdetaljene må avklares i oppfølgingen.');
    } finally {
      setFinnLookupLoading(false);
      setPhase('service');
    }
    return true;
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Tjenestevalg fra URL leses først, slik at prefill-grenene under kan
      // hoppe rett til kontaktsteget.
      const rawTier = (params.get('tier') || params.get('service') || '').trim();
      const pre: Service = rawTier === 'selvforvaltning' || rawTier === 'full_forvaltning' ? rawTier : '';
      if (pre) setPreService(pre);

      const incomingFinn = params.get('finn');
      if (incomingFinn && detectFinnReference(incomingFinn)) {
        resolveFinnReference(incomingFinn);
        return;
      }

      const address = (params.get('address') || '').trim();
      const postal = (params.get('postal') || '').trim();
      const city = (params.get('city') || '').trim();
      if (address && detectFinnReference(address)) {
        resolveFinnReference(address);
        return;
      }
      // Prefyll må følge samme kvalitetskrav som manuell input — ingen snarvei
      // til neste steg uten gate/husnummer + postnummer + poststed.
      if (isCompleteAddress(address, postal, city)) {
        setForm((current) => ({ ...current, address, postalCode: postal, city }));
        setAddressVerified(true);
        geokodTilKart([address, postal, city].filter(Boolean).join(' '));
        goAfterAddress(pre, postal, city);
      } else if (address) {
        setForm((current) => ({ ...current, address, postalCode: postal, city }));
        setAddressVerified(false);
      }
    } catch {
      // URL-parametere er en forbedring, ikke en forutsetning for flyten.
    }
  }, [resolveFinnReference]);

  useEffect(() => {
    try { trackLeadStart('utleier'); } catch { /* analyse må aldri blokkere skjemaet */ }
    try { track('form_start', { form: 'utleier', flow: 'utleier-2026' }); } catch { /* analyse må aldri blokkere skjemaet */ }
  }, []);

  useEffect(() => {
    try { track('form_step', { form: 'utleier', flow: 'utleier-2026', step: phaseIndex + 1, label: PHASES[phaseIndex]?.label }); } catch { /* analyse må aldri blokkere skjemaet */ }
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* eldre nettlesere kan mangle smooth scroll */ }
  }, [phase, phaseIndex]);


  useEffect(() => {
    if (!submitted || form.service !== 'selvforvaltning' || !accountUrl) return undefined;
    const timer = window.setTimeout(() => {
      try { track('account_handoff_redirect', { form: 'utleier', flow: 'utleier-2026' }); } catch { /* analyse må aldri blokkere handoff */ }
      window.location.replace(accountUrl);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [submitted, accountUrl, form.service]);

  const continueFromAddress = async () => {
    const value = form.address.trim();
    if (detectFinnReference(value)) {
      await resolveFinnReference(value);
      return;
    }
    if (!addressVerified || !isCompleteAddress(value, form.postalCode, form.city)) {
      setErrors({ address: 'Velg en fullstendig adresse fra listen — med husnummer, postnummer og poststed.' });
      return;
    }
    setFinnUrl('');
    setFinnCode('');
    setFinnLookupNote('');
    setErrors({});
    goAfterAddress(preService, form.postalCode, form.city);
  };

  const selectService = (service: Service) => {
    if (!service) return;
    setField('service', service);
    setTermsAccepted(false);
    try { track('tier_entry_choice', { form: 'utleier-start', tier: service, in_bergen: isBergenArea(form.postalCode, form.city) }); } catch { /* analyse må aldri blokkere skjemaet */ }
    setPhase('contact');
  };

  // Etter at adressen er bekreftet: hopp over tjenestesteget hvis brukeren
  // allerede har valgt på produktsiden. Ett steg mindre i et selvbetjent løp er
  // ikke kosmetikk — hvert ekstra valg koster registreringer.
  const goAfterAddress = (pre: Service, postalCode: string, city: string) => {
    const allowed = pre === 'selvforvaltning' || (pre === 'full_forvaltning' && isBergenArea(postalCode, city));
    if (pre && allowed) {
      try { track('tier_prefilled', { form: 'utleier-start', tier: pre }); } catch { /* analyse må aldri blokkere skjemaet */ }
      selectService(pre);
      return;
    }
    setPhase('service');
  };

  const contactErrors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = form.ownerKind === 'business' ? 'Skriv inn navnet på kontaktpersonen.' : 'Skriv inn navnet ditt.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Skriv inn en gyldig e-postadresse.';
    if (!phoneIsValid(form.phone, phoneCountryIso)) {
      const country = phoneCountry(phoneCountryIso);
      next.phone = country.min === country.max
        ? `Skriv inn et gyldig nummer for ${country.name} (${country.min} siffer).`
        : `Skriv inn et gyldig nummer for ${country.name}.`;
    }
    // Bedrift uten selskap er ikke en bedrift. Og et selskap som er konkurs
    // eller under avvikling krever en bevisst bekreftelse — ikke et uhell.
    if (form.ownerKind === 'business') {
      if (!company || !company.orgNo) next.company = 'Søk opp selskapet, eller fyll det inn manuelt.';
      else if (company.status && company.status !== 'aktiv' && !companyStatusAck) next.company = 'Bekreft at selskapet skal registreres selv om statusen er merket.';
    }
    if (form.service === 'selvforvaltning' && !termsAccepted) next.terms = 'Godta avtalen for å opprette konto.';
    return next;
  }, [form, phoneCountryIso, termsAccepted, company, companyStatusAck]);

  const submit = async () => {
    if (loading) return;
    if (Object.keys(contactErrors).length) {
      setErrors(contactErrors);
      return;
    }

    setLoading(true);
    setSubmitError('');
    const cleanPhone = normalizePhone(form.phone);
    const fullPhone = phoneE164(cleanPhone, phoneCountryIso);
    const leadAddress = form.address.trim();
    const sqm = form.sqm ? Number(form.sqm) || null : null;
    const bedrooms = form.bedrooms ? Number(form.bedrooms) || null : null;
    const propertyType = form.propertyType || '';

    const payload = {
      address: leadAddress,
      postal_code: form.postalCode,
      city: form.city || undefined,
      outside_area: outsideArea || undefined,
      sqm,
      bedrooms,
      property_type: propertyType,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: fullPhone,
      availability: '',
      lead_type: 'huseier',
      tier: form.service,
      // Bedrift eller privatperson. Serveren validerer org.nr på nytt og henter
      // navn/form fra Enhetsregisteret — klienten er ikke sannhetskilden her.
      owner_kind: form.ownerKind,
      org_no: form.ownerKind === 'business' ? (company?.orgNo || '') : undefined,
      company_name: form.ownerKind === 'business' ? (company?.name || '') : undefined,
      company_form: form.ownerKind === 'business' ? (company?.formLabel || '') : undefined,
      company_address: form.ownerKind === 'business' && company?.address
        ? [company.address.street, [company.address.postalCode, company.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
        : undefined,
      terms: form.service === 'selvforvaltning' && termsAccepted ? { version: SELF_TERMS_VERSION } : undefined,
      finn_url: finnUrl || undefined,
      units: [{
        address: leadAddress,
        postal_code: form.postalCode,
        property_type: propertyType,
        sqm,
        bedrooms,
        finn_url: finnUrl || undefined,
      }],
      num_properties: 1,
      attribution: { ...getLeadAttribution(), ...getClickIds() },
      notes: finnUrl
        ? `FINN${finnCode ? ` ${finnCode}` : ''}: ${finnLookupNote || 'Boligdetaljer avklares i oppfølgingen.'}`
        : 'Mobiloptimalisert hurtigregistrering — boligdetaljer avklares senere.',
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || (!data.success && !data.ok)) throw new Error('submit_failed');

      const onboardingUrl = data?.account?.onboarding_url || data?.data?.account?.onboarding_url;
      if (typeof onboardingUrl === 'string' && /^https:\/\//.test(onboardingUrl)) setAccountUrl(onboardingUrl);
      setSubmitted(true);
      try { track('lead_submit', { form: 'utleier', flow: 'utleier-2026', tier: form.service }); } catch { /* analyse må aldri blokkere suksess-skjermen */ }
      try { trackLead({ formId: 'utleier', source: 'bli-utleier', leadId: data?.data?.id, email: form.email.trim(), phone: fullPhone } as any); } catch { /* analyse må aldri blokkere suksess-skjermen */ }
    } catch {
      setSubmitError('Vi fikk ikke sendt inn akkurat nå. Prøv igjen — opplysningene dine er fortsatt her.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const isSelf = form.service === 'selvforvaltning';
    if (isSelf && accountUrl) {
      return (
        <div className="min-h-[100dvh] overflow-x-hidden bg-[#f7f6f3]" data-testid="onboarding-success">
          <TopBar phase="contact" />
          <main className="mx-auto flex min-h-[calc(100dvh-65px)] w-full max-w-[620px] items-center justify-center px-5 py-12 text-center sm:px-8">
            <div>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#171513]"><Loader2 className="h-6 w-6 animate-spin text-white" /></span>
              <p className="mt-6 text-[10.5px] font-bold uppercase tracking-[0.15em] text-[#77716a]">Kontoen er opprettet</p>
              <h1 className="mt-3 text-[36px] font-bold leading-[1.03] tracking-[-0.045em] text-[#151310] sm:text-[50px]" style={{ fontFamily: 'var(--font-heading)' }}>Åpner portalen …</h1>
              <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-[#625d57]">Du logges inn automatisk og sendes direkte til neste steg for boligen.</p>
              <button type="button" onClick={() => window.location.replace(accountUrl)} className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#171513] px-6 text-[13.5px] font-bold text-white hover:bg-[#2b2824]" data-testid="onboarding-account-button">Åpne portalen nå <ArrowRight className="h-4 w-4" /></button>
              <p className="mt-3 text-[11.5px] text-[#8b8580]">Hvis redirect blokkeres, bruker du knappen over. Bekreftelse er også sendt til {form.email}.</p>
            </div>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] overflow-x-hidden bg-[#f7f6f3]" data-testid="onboarding-success">
        <TopBar phase="contact" />
        <main className="mx-auto flex min-h-[calc(100dvh-67px)] w-full max-w-[680px] items-center px-5 py-12 sm:px-8 sm:py-16">
          <div className="w-full text-center">


            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#171513]"><CheckCircle2 className="h-6 w-6 text-white" /></span>
            <p className="mt-6 text-[10.5px] font-bold uppercase tracking-[0.15em] text-[#77716a]">Alt er registrert</p>
            <h1 className="mt-3 text-[38px] font-bold leading-[1.02] tracking-[-0.045em] text-[#151310] sm:text-[52px]" style={{ fontFamily: 'var(--font-heading)' }}>Takk, {form.name.trim().split(' ')[0]}.</h1>
            <p className="mx-auto mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-[#625d57]">
              {isSelf
                ? accountUrl ? 'Kontoen din er klar. Du kan gå direkte videre og legge inn boligen.' : 'Vi setter opp kontoen din og sender tilgang til e-posten din.'
                : 'En lokal rådgiver vurderer henvendelsen og tar kontakt innen 24 timer.'}
            </p>

            <div className="mx-auto mt-7 max-w-[520px] rounded-2xl border border-[#e3dfd9] bg-white p-5 text-left">
              <div className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4e4944]" /><div><p className="text-[14px] font-bold text-[#171513]">Bekreftelse sendt til {form.email}</p><p className="mt-1 text-[13px] leading-relaxed text-[#6d6760]">{isSelf ? 'Der finner du neste steg for kontoen din.' : 'Du trenger ikke gjøre noe mer nå.'}</p></div></div>
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              {accountUrl ? (
                <button type="button" onClick={() => window.location.assign(accountUrl)} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#171513] px-7 text-[14px] font-bold text-white hover:bg-[#2b2824]" data-testid="onboarding-account-button">Gå til kontoen <ArrowRight className="h-4 w-4" /></button>
              ) : null}
              <a href="/" className="inline-flex h-14 items-center justify-center rounded-full border border-[#d9d5cf] bg-white px-7 text-[14px] font-semibold text-[#292621] hover:border-[#aaa39b]">Til forsiden</a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'service') {
    const self = SERVICES[0];
    const full = SERVICES[1];
    const fullUnavailable = !!form.postalCode && !isBergenArea(form.postalCode, form.city);

    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#f7f6f3]" data-testid="owner-onboarding-2026">
        <TopBar phase="service" onTilSteg={(p) => setPhase(p)} />

        <main className="relative mx-auto w-full max-w-[1140px] px-5 pb-16 pt-10 sm:px-8 sm:pb-20 lg:px-10 lg:pt-14" data-testid="onboarding-service-step">
          <div className="mx-auto max-w-[760px] text-center">
            <h1 className="text-[34px] font-bold leading-[1.02] tracking-[-0.045em] text-[#151310] sm:text-[48px] lg:text-[54px]" style={{ fontFamily: 'var(--font-heading)' }}>Velg hvordan du vil leie ut</h1>
            <p className="mx-auto mt-3.5 max-w-[46ch] text-[14.5px] leading-relaxed text-[#77716a] sm:text-[15.5px]">Uforpliktende — og du kan endre mening senere.</p>
          </div>

          {finnUrl && finnLookupNote ? (
            <p className="mx-auto mt-4 flex max-w-[700px] items-start justify-center gap-2 text-center text-[11.5px] leading-relaxed text-[#625d57]" data-testid="finn-lookup-note"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7e22ce]" /> {finnLookupNote}</p>
          ) : null}

          {/* ── To fremtider: systemet (lys) vs relasjonen (mørk). Statement-overskrifter,
               ett strukturert inset-panel per kort — ingen svevende objekter, ingen dødluft. ── */}
          <style>{`
            @keyframes dhGraf { to { stroke-dashoffset: 0; } }
            @keyframes dhReise { to { transform: scaleX(1); } }
            .dh-graf { stroke-dasharray: 320; stroke-dashoffset: 320; animation: dhGraf 1.5s cubic-bezier(0.4,0,0.2,1) 0.4s forwards; }
            .dh-reise { transform: scaleX(0); transform-origin: left; animation: dhReise 1.2s cubic-bezier(0.4,0,0.2,1) 0.6s forwards; }
          `}</style>
          <div className="mx-auto mt-10 grid max-w-[1060px] gap-5 lg:grid-cols-2 lg:gap-6">

            {/* SELVFORVALTNING — systemet */}
            <button type="button" onClick={() => selectService(self.id)} data-testid="service-selvforvaltning"
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-[#e9e4dd] bg-white p-7 text-left shadow-[0_34px_90px_-52px_rgba(23,21,19,0.55)] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_48px_100px_-48px_rgba(23,21,19,0.6)] sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#9a938b]">Selvforvaltning</p>
                <span className="rounded-full border border-[#e9e4dd] px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#9a938b]">Hele Norge</span>
              </div>
              <h2 className="mt-5 text-[26px] font-bold leading-[1.08] tracking-[-0.03em] text-[#171513] sm:text-[30px]" style={{ fontFamily: 'var(--font-heading)' }}>Alle verktøyene.<br />Full kontroll.</h2>
              <p className="mt-3 max-w-[38ch] text-[13.5px] leading-relaxed text-[#77716a]">Annonsering, kontrakt og husleie i ett rolig system — du styrer.</p>

              {/* Produktpanelet — stram app-følelse, akse-justert */}
              <div className="mt-7 flex-1 rounded-[20px] border border-[#ece8e1] bg-[#f6f4f0] p-4 sm:p-5" aria-hidden="true">
                <div className="rounded-[14px] border border-[#e9e4dd] bg-white p-4 shadow-[0_10px_28px_-20px_rgba(23,21,19,0.45)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9a938b]">Husleie · februar</p>
                    <span className="rounded-full bg-[#e8f3ea] px-2.5 py-[3px] text-[10px] font-bold text-[#2f7d3f]">Betalt</span>
                  </div>
                  <div className="mt-1.5 flex items-end justify-between gap-4">
                    <p className="text-[24px] font-bold tracking-[-0.03em] text-[#171513]">17 500 kr</p>
                    <svg viewBox="0 0 150 40" className="mb-1 h-9 w-[45%]">
                      <path d="M2 35 C22 33 34 29 50 26 S82 20 98 15 S128 8 148 4" fill="none" stroke="#57a468" strokeWidth="2.5" strokeLinecap="round" className="dh-graf" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-[#e9e4dd] bg-white p-3.5 shadow-[0_10px_28px_-22px_rgba(23,21,19,0.4)]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2e5fb]"><Check className="h-3.5 w-3.5 text-[#7e22ce]" strokeWidth={3} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold leading-tight text-[#171513]">Kontrakt signert</p>
                    <p className="text-[10.5px] leading-tight text-[#9a938b]">Leietaker · BankID</p>
                  </div>
                  <span className="text-[10.5px] font-medium text-[#b3ada5]">nå</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-[12.5px] font-semibold text-[#77716a]">5 % av husleien<span className="text-[#b3ada5]"> · ingen bindingstid</span></p>
              </div>
              <span className="mt-3.5 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#171513] px-5 text-[14px] font-bold text-white transition group-hover:bg-[#2b2824]">Velg selvforvaltning <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>

            {/* FULL FORVALTNING — relasjonen. Utenfor Bergen: verdig venteliste */}
            <button type="button" onClick={() => selectService(full.id)} data-testid="service-full_forvaltning"
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/[0.06] p-7 text-left shadow-[0_34px_90px_-46px_rgba(23,21,19,0.85)] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_48px_100px_-42px_rgba(23,21,19,0.9)] sm:p-9"
              style={{ background: 'radial-gradient(120% 90% at 88% -8%, rgba(210,152,255,0.13), transparent 52%), #161410' }}>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-white/40">Full forvaltning</p>
                {fullUnavailable ? (
                  <span className="rounded-full border border-[#d298ff]/25 bg-[#d298ff]/10 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#dca9ff]" data-testid="forvaltning-kommer-snart">Kommer snart{form.city ? ` til ${form.city}` : ''}</span>
                ) : (
                  <span className="rounded-full border border-white/12 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/55">Mest komplett</span>
                )}
              </div>
              <h2 className="mt-5 text-[26px] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[30px]" style={{ fontFamily: 'var(--font-heading)' }}>Lever nøkkelen.<br /><span className="text-[#dca9ff]">Vi tar oss av resten.</span></h2>
              <p className="mt-3 max-w-[40ch] text-[13.5px] leading-relaxed text-white/55">Annonsering, visninger, kontrakt og oppfølging — du får bare rapportene.</p>

              {/* Relasjonspanelet — forvalter + reisen, samlet i ett rolig panel */}
              <div className={`mt-7 flex flex-1 flex-col justify-between rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-4 sm:p-5 ${fullUnavailable ? 'opacity-85' : ''}`}>
                <div className="flex items-center gap-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/sarah-sleeman-360.webp" alt="Sarah Sleeman, forvalter i DigiHome" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/15" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-tight text-white">Sarah Sleeman</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-white/50">Din faste forvalter — gjennom hele leieforholdet</p>
                  </div>
                </div>
                <div className="mt-5 border-t border-white/[0.08] pt-5" aria-hidden="true">
                  <div className="relative">
                    <div className="absolute left-[5px] right-[5px] top-[4.5px] h-px bg-white/12" />
                    <div className="dh-reise absolute left-[5px] right-[5px] top-[4.5px] h-px bg-[#d298ff]/70" />
                    <div className="relative flex justify-between gap-3">
                      {['Annonsering', 'Innflytting', 'Oppfølging'].map((steg, i) => (
                        <div key={steg} className={`flex flex-col gap-2 ${i === 1 ? 'items-center' : i === 2 ? 'items-end' : ''}`}>
                          <span className="h-[10px] w-[10px] rounded-full border-2 border-[#dca9ff] bg-[#161410]" />
                          <p className="text-[11px] font-semibold text-white/55">{steg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-[12.5px] font-semibold text-white/55">{fullUnavailable ? 'Vi lanserer i flere byer fortløpende' : <>Personlig tilbud<span className="text-white/30"> · svar innen 24 timer</span></>}</p>
              </div>
              <span className="mt-3.5 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#d298ff] px-5 text-[14px] font-bold text-[#171513] transition group-hover:bg-[#dfb3ff]">{fullUnavailable ? 'Få beskjed når vi lanserer' : 'Få personlig forvaltning'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'contact') {
    const isSelf = form.service === 'selvforvaltning';
    return (
      <div className="min-h-[100dvh] overflow-x-hidden bg-[#f7f6f3]" data-testid="owner-onboarding-2026">
        <TopBar phase="contact" />
        <main className="mx-auto w-full max-w-[760px] px-5 pb-14 pt-7 sm:px-8 sm:pb-20 sm:pt-10" data-testid="onboarding-contact-step">
          <BackButton onClick={() => setPhase('service')} />

          <div className="text-center">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-[#77716a]">Siste steg</p>
            <h1 className="mt-3 text-[34px] font-bold leading-[1.03] tracking-[-0.045em] text-[#151310] sm:text-[48px]" style={{ fontFamily: 'var(--font-heading)' }}>{isSelf ? 'Opprett kontoen din' : 'Hvor kan vi nå deg?'}</h1>
            <p className="mx-auto mt-3 max-w-[50ch] text-[14.5px] leading-relaxed text-[#6d6760] sm:text-[15.5px]">{isSelf ? 'Kun kontaktinformasjon. Boligen legger du enkelt inn når kontoen er klar.' : 'Vi trenger bare kontaktinformasjonen din for å følge opp tilbudet.'}</p>
          </div>

          <div className="mt-6 flex items-center justify-between border-b border-[#d9d4cd] pb-3" data-testid="contact-context">
            <p className="min-w-0 truncate text-[12px] text-[#5f5a54]"><strong className="text-[#292621]">{selectedService?.title}</strong> · {addressLabel}</p>
            <button type="button" onClick={() => setPhase('service')} className="ml-4 shrink-0 text-[11.5px] font-semibold text-[#5f5a54] underline decoration-[#bbb3aa] underline-offset-4">Endre</button>
          </div>

          <div className="mt-7 space-y-4">
            {/* Privatperson eller bedrift? Spørsmålet står FØR navnefeltet, fordi
                svaret endrer hva navnet betyr: deg selv, eller kontaktpersonen
                for selskapet som eier boligen. */}
            <div>
              <span className="mb-2 block text-[13px] font-semibold text-[#292621]">Jeg registrerer som</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Registrerer som" data-testid="owner-kind-toggle">
                {([['private', 'Privatperson'], ['business', 'Bedrift']] as [OwnerKind, string][]).map(([kind, label]) => (
                  <button key={kind} type="button" role="radio" aria-checked={form.ownerKind === kind}
                    data-testid={`owner-kind-${kind}`}
                    onClick={() => {
                      setField('ownerKind', kind);
                      setErrors((current) => ({ ...current, company: '' }));
                      if (kind === 'private') { setCompany(null); setCompanyStatusAck(false); }
                      try { track('owner_kind_choice', { form: 'utleier-start', kind }); } catch { /* analyse må aldri blokkere skjemaet */ }
                    }}
                    className={`h-12 rounded-[14px] border text-[14px] font-semibold transition ${form.ownerKind === kind ? 'border-[#292621] bg-[#292621] text-white' : 'border-[#dcd6cf] bg-white text-[#504b46] hover:border-[#b9b1a9]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.ownerKind === 'business' ? (
              <CompanyPicker
                value={company}
                onSelect={(next) => { setCompany(next); setCompanyStatusAck(false); setErrors((current) => ({ ...current, company: '' })); }}
                onClear={() => { setCompany(null); setCompanyStatusAck(false); }}
                error={errors.company}
                statusAck={companyStatusAck}
                onStatusAckChange={(next) => { setCompanyStatusAck(next); setErrors((current) => ({ ...current, company: '' })); }}
              />
            ) : null}

            <TextField id="owner-name-input" label={form.ownerKind === 'business' ? 'Kontaktperson' : 'Fullt navn'} value={form.name} onChange={(event: any) => setField('name', event.target.value)} autoComplete="name" placeholder="Ola Nordmann" icon={User} error={errors.name} />
            <TextField id="owner-email-input" label="E-post" type="email" value={form.email} onChange={(event: any) => setField('email', event.target.value)} autoComplete="email" inputMode="email" placeholder="ola@eksempel.no" icon={Mail} error={errors.email} />
            <PhoneField country={phoneCountryIso} onCountryChange={changePhoneCountry} value={form.phone} onChange={(event: any) => handlePhoneInput(event.target.value)} error={errors.phone} />
          </div>

          {isSelf ? (
            <div className={`mt-5 rounded-2xl border bg-white p-4 ${errors.terms ? 'border-red-400' : 'border-[#dedad4]'}`}>
              <button type="button" onClick={() => { setTermsAccepted((value) => !value); setErrors((current) => ({ ...current, terms: '' })); }} data-testid="owner-terms-checkbox" className="flex w-full items-start gap-3 text-left">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${termsAccepted ? 'border-[#24211e] bg-[#24211e]' : 'border-[#cfc9c2] bg-white'}`}>{termsAccepted ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} /> : null}</span>
                <span className="text-[13px] leading-relaxed text-[#504b46]">
                  Jeg godtar <a href="/vilkar" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="font-bold text-[#403c37] underline underline-offset-2">avtalen om selvforvaltning</a> (5 % av husleien, ingen bindingstid)
                  {/* Ved bedrift er det selskapet som blir avtalepart. Da må det
                      stå eksplisitt at personen signerer på selskapets vegne. */}
                  {form.ownerKind === 'business'
                    ? <> — og jeg aksepterer <strong className="font-bold text-[#403c37]">på vegne av {company?.name || 'selskapet'}</strong>, som jeg har signaturrett for.</>
                    : '.'}
                </span>
              </button>
              {errors.terms ? <p className="mt-2 text-[12px] font-medium text-red-600">{errors.terms}</p> : null}
            </div>
          ) : (
            <p className="mt-5 flex items-start justify-center gap-2 text-center text-[12px] leading-relaxed text-[#625d57]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#77716a]" /> Gratis og uforpliktende. En lokal rådgiver kontakter deg innen 24 timer.</p>
          )}

          {submitError ? <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] leading-relaxed text-red-700">{submitError}</div> : null}

          <button type="button" onClick={submit} disabled={loading} data-testid="owner-submit-button" className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#171513] px-7 text-[15px] font-bold text-white shadow-[0_16px_34px_-22px_rgba(0,0,0,.65)] transition hover:bg-[#2b2824] disabled:cursor-wait disabled:opacity-60 sm:mx-auto sm:flex sm:max-w-[310px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {isSelf ? 'Opprett konto' : outsideArea ? 'Registrer interesse' : 'Be om tilbud'}
          </button>
          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-[#88817a]">Ved innsending godtar du at DigiHome kontakter deg om denne henvendelsen.</p>
        </main>
      </div>
    );
  }

  /* Pustende layout: kartet får mer plass på adressesteget (der det bærer
     opplevelsen), og glir tilbake når steg 2/3 trenger bredden til innhold.
     grid-template-columns er animerbar i moderne nettlesere; ellers snapper den. */
  const kartBredt = phase === 'address' && Boolean(kartPos);
  return (
    <div
      className={`grid min-h-[100dvh] overflow-x-hidden bg-[#faf9f7] transition-[grid-template-columns] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${kartBredt ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]' : 'lg:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.82fr)]'}`}
      data-testid="owner-onboarding-2026"
    >
      <main className="flex min-w-0 flex-col">
        <TopBar phase={phase} />
        <div className="flex flex-1 justify-center px-5 pb-10 pt-7 sm:px-8 sm:pb-14 sm:pt-10 lg:items-center lg:px-12 lg:py-10 xl:px-16">
          <div className="w-full max-w-[620px] min-w-0">
            {phase === 'address' ? (
              <section data-testid="onboarding-address-step">
                <StepHeading title="Hvor ligger boligen?" text="Skriv inn adressen — eller lim inn FINN-annonsen." />

                <div className="mt-8 min-w-0" data-no-enter-advance>
                  <style>{`@keyframes dhCardIn{from{opacity:0;transform:translateY(6px) scale(0.99)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
                  {addressVerified ? (
                    /* Bekreftet adresse som kort — tilstanden VISES i stedet for å fortelles */
                    <div className="flex items-center gap-4 rounded-[16px] border border-[#e5e0d9] bg-white py-4 pl-5 pr-3 shadow-[0_14px_34px_-22px_rgba(23,21,19,0.35)]"
                      style={{ animation: 'dhCardIn 0.35s cubic-bezier(0.22,1,0.36,1) both' }} data-testid="address-card">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f1e4fb]">
                        <MapPin className="h-5 w-5 text-[#7e22ce]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-bold tracking-[-0.01em] text-[#171513]">
                          {(() => {
                            // Vis kun gateadressen i tittelen — postnr/sted bor i underteksten
                            let gate = String(form.address || '');
                            for (const suffiks of [`, ${form.postalCode} ${form.city}`, `, ${form.city}`]) {
                              if (form.city && gate.toLowerCase().endsWith(suffiks.toLowerCase())) { gate = gate.slice(0, -suffiks.length); break; }
                            }
                            return gate;
                          })()}
                        </p>
                        {(form.postalCode || form.city) ? (
                          <p className="mt-0.5 text-[13px] text-[#77716a]">{[form.postalCode, form.city].filter(Boolean).join(' ')}</p>
                        ) : null}
                      </div>
                      <button type="button" data-testid="address-edit"
                        onClick={() => {
                          setAddressVerified(false);
                          setTimeout(() => { try { (document.querySelector('[data-testid="entry-address-input"]') as HTMLInputElement | null)?.focus(); } catch (e) {} }, 80);
                        }}
                        className="shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold text-[#77716a] transition-colors hover:bg-[#f5f2ef] hover:text-[#171513]">
                        Endre
                      </button>
                    </div>
                  ) : (
                    <div className={`relative min-w-0 rounded-[14px] border bg-white transition-all focus-within:border-[#292621] focus-within:shadow-[0_0_0_3px_rgba(32,29,26,0.06)] ${errors.address ? 'border-red-400' : 'border-[#dcd6cf]'}`}>
                      <span className="pointer-events-none absolute left-4 top-7 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-[#f5f2ef]">
                        <MapPin className="h-4 w-4 text-[#7e22ce]" />
                      </span>
                      <AddressAutocomplete
                      value={form.address}
                      onChange={(value: string) => {
                        const detectedFinn = detectFinnReference(value);
                        setAddressVerified(false);
                        setForm((current) => ({
                          ...current,
                          address: value,
                          ...(detectedFinn ? {} : { postalCode: '', city: '', propertyType: '', sqm: '', bedrooms: '' }),
                        }));
                        setErrors((current) => ({ ...current, address: '' }));
                        if (!detectedFinn) {
                          setFinnUrl('');
                          setFinnCode('');
                          setFinnLookupNote('');
                        }
                      }}
                      onSelect={(data: any) => {
                        const address = String(data?.address || '').replace(/,\s*(Norway|Norge)$/i, '');
                        const postalCode = String(data?.postalCode || '').trim();
                        const city = String(data?.city || '').trim();
                        const pending = Boolean(data?.pending); // optimistisk valg — berikelse underveis
                        // Kartet: bruk koordinatene fra Place Details direkte; ellers geokod teksten.
                        // Ved pending kommer koordinatene i berikelsen — ikke fyr ekstra geokoding.
                        if (typeof data?.lat === 'number' && typeof data?.lng === 'number') {
                          setKartPos({ lat: data.lat, lng: data.lng });
                        } else if (!pending) {
                          geokodTilKart([address, postalCode, city].filter(Boolean).join(' '));
                        }
                        const complete = isCompleteAddress(address, postalCode, city);
                        setForm((current) => ({ ...current, address, postalCode, city }));
                        // Kortet vises umiddelbart ved valg fra listen; postnr fylles på et
                        // øyeblikk senere. Feilmelding kun for endelige (ikke-pending) svar.
                        setAddressVerified(pending ? true : complete);
                        setErrors(pending || complete ? {} : { address: 'Adresseforslaget mangler husnummer, postnummer eller poststed.' });
                      }}
                      placeholder="Skriv gateadresse, FINN-lenke eller FINN-kode"
                      showIcon={false}
                      dataTestId="entry-address-input"
                      inputClassName="h-14 w-full min-w-0 rounded-2xl bg-transparent pl-12 pr-4 text-[16px] text-[#171513] outline-none placeholder:text-[#99938c]"
                      className="min-w-0"
                    />
                    </div>
                  )}
                  {errors.address ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.address}</p> : null}
                  {finnLookupLoading ? (
                    <p className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] leading-relaxed text-[#716b63]"><Loader2 className="h-3.5 w-3.5 animate-spin text-[#7e22ce]" /> Henter boligopplysninger fra FINN …</p>
                  ) : null}
                </div>

                <button type="button" onClick={continueFromAddress} disabled={finnLookupLoading || (!addressVerified && !detectFinnReference(form.address))} data-testid="address-continue" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#171513] px-7 text-[15px] font-bold text-white shadow-[0_16px_34px_-20px_rgba(0,0,0,.65)] transition-all hover:-translate-y-0.5 hover:bg-[#2a2723] hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#e7e3df] disabled:text-[#9a948d] disabled:shadow-none sm:w-auto sm:min-w-[190px]">
                  {finnLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {finnLookupLoading ? 'Henter FINN-annonsen' : 'Fortsett'} {!finnLookupLoading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>

                {/* Mobil: kartet under innholdet når adressen er valgt (som korttid) */}
                {kartPos ? (
                  <div className="mt-7 h-[220px] overflow-hidden rounded-2xl border border-[#e5e0d9] lg:hidden" style={{ animation: 'dhCardIn 0.5s cubic-bezier(0.22,1,0.36,1) both' }} data-testid="mobil-kart">
                    <AdresseKart pos={kartPos} adresse={form.address} />
                  </div>
                ) : null}
              </section>
            ) : null}

          </div>
        </div>
      </main>
      <DesktopProof pos={kartPos} adresse={form.address} />
    </div>
  );
}
