'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AddressAutocomplete } from './AddressAutocomplete';
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
} from 'lucide-react';

const SELF_TERMS_VERSION = 'selvforvaltning-2025-06';

type Phase = 'address' | 'service' | 'contact';
type Service = 'selvforvaltning' | 'full_forvaltning' | '';

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
    points: ['Opprett konto med én gang', 'Digital kontrakt og samlet oversikt', '5 % per utleieforhold · ingen bindingstid'],
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

const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 8);

const isCompleteAddress = (address = '', postalCode = '', city = '') => {
  const street = String(address).split(',')[0].trim();
  return /[A-Za-zÆØÅæøå]/.test(street)
    && /\d+[A-Za-z]?\b/.test(street)
    && /^\d{4}$/.test(String(postalCode).trim())
    && /[A-Za-zÆØÅæøå]{2}/.test(String(city).trim());
};


function TopBar({ phase }: { phase: Phase }) {
  const current = PHASES.findIndex((item) => item.id === phase);
  const progress = ((current + 1) / PHASES.length) * 100;

  return (
    <header className="sticky top-0 z-40 bg-[#faf9f7]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[760px] items-center justify-between px-5 sm:px-8 lg:max-w-none lg:px-10">
        <a href="/" aria-label="DigiHome — til forsiden" data-testid="onboarding-logo-link" className="inline-flex min-w-0 items-center"><img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-5 w-auto" /></a>
        <nav className="hidden items-center gap-5 md:flex" aria-label="Fremdrift">
          {PHASES.map((item, index) => (
            <span key={item.id} className={`text-[10.5px] font-bold uppercase tracking-[0.11em] ${index === current ? 'text-[#292621]' : index < current ? 'text-[#77716a]' : 'text-[#bbb5ae]'}`}>{index + 1}. {item.label}</span>
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

function DesktopProof() {
  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#ddd6cf] lg:block" aria-label="DigiHome boliginteriør">
      <img src="/owner-onboarding-living-room.webp" alt="Lys og moderne stue i Bergen" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-[#7a6a5f]/5" />
    </aside>
  );
}

function StepHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#77716a]">{eyebrow}</p>
      <h1 className="mt-3 max-w-[14ch] text-[32px] font-bold leading-[1.02] tracking-[-0.04em] text-[#111] sm:text-[42px]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h1>
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
  });
  const [addressVerified, setAddressVerified] = useState(false);
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
        setPhase('service');
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
    setPhase('service');
  };

  const selectService = (service: Service) => {
    if (!service) return;
    setField('service', service);
    setTermsAccepted(false);
    try { track('tier_entry_choice', { form: 'utleier-start', tier: service, in_bergen: isBergenArea(form.postalCode, form.city) }); } catch { /* analyse må aldri blokkere skjemaet */ }
    setPhase('contact');
  };

  const contactErrors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Skriv inn navnet ditt.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Skriv inn en gyldig e-postadresse.';
    if (normalizePhone(form.phone).length !== 8) next.phone = 'Skriv inn et gyldig norsk telefonnummer.';
    if (form.service === 'selvforvaltning' && !termsAccepted) next.terms = 'Godta avtalen for å opprette konto.';
    return next;
  }, [form, termsAccepted]);

  const submit = async () => {
    if (loading) return;
    if (Object.keys(contactErrors).length) {
      setErrors(contactErrors);
      return;
    }

    setLoading(true);
    setSubmitError('');
    const cleanPhone = normalizePhone(form.phone);
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
      phone: `+47 ${cleanPhone}`,
      availability: '',
      lead_type: 'huseier',
      tier: form.service,
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
      try { trackLead({ formId: 'utleier', source: 'bli-utleier', leadId: data?.data?.id, email: form.email.trim(), phone: `+47 ${cleanPhone}` } as any); } catch { /* analyse må aldri blokkere suksess-skjermen */ }
    } catch {
      setSubmitError('Vi fikk ikke sendt inn akkurat nå. Prøv igjen — opplysningene dine er fortsatt her.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const isSelf = form.service === 'selvforvaltning';
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
        <TopBar phase="service" />

        <main className="relative mx-auto w-full max-w-[1240px] px-5 pb-14 pt-7 sm:px-8 sm:pb-20 sm:pt-9 lg:px-10 lg:pt-10" data-testid="onboarding-service-step">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <BackButton onClick={() => setPhase('address')} />
            <div className="flex min-w-0 items-center gap-2.5 rounded-full border border-[#e3ddd6] bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur" data-testid="selected-address-row">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2e5fb]"><MapPin className="h-3.5 w-3.5 text-[#7e22ce]" /></span>
              <span className="min-w-0 max-w-[360px] flex-1 truncate text-[12.5px] font-semibold text-[#3c3833]">{addressLabel}</span>
              <button type="button" onClick={() => setPhase('address')} className="shrink-0 text-[11.5px] font-bold text-[#7e22ce]">Endre</button>
            </div>
          </div>

          <div className="mx-auto mt-5 max-w-[760px] text-center sm:mt-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ebe8e3] px-3.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#5f5a54]">
              <Sparkles className="h-3.5 w-3.5" /> Steg 2 av 3
            </span>
            <h1 className="mt-4 text-[34px] font-bold leading-[1.02] tracking-[-0.045em] text-[#151310] sm:text-[48px] lg:text-[56px]" style={{ fontFamily: 'var(--font-heading)' }}>Velg hvordan du vil leie ut</h1>
            <p className="mx-auto mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-[#6d6760] sm:text-[16px]">To tydelige løsninger. Du kan endre mening senere, og ingen av valgene binder deg i dag.</p>
          </div>

          {finnUrl && finnLookupNote ? (
            <p className="mx-auto mt-4 flex max-w-[700px] items-start justify-center gap-2 text-center text-[11.5px] leading-relaxed text-[#625d57]" data-testid="finn-lookup-note"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7e22ce]" /> {finnLookupNote}</p>
          ) : null}

          <div className="mx-auto mt-9 grid max-w-[1120px] gap-0 overflow-hidden border-y border-[#dcd7d0] lg:grid-cols-2">
            <button type="button" onClick={() => selectService(self.id)} data-testid="service-selvforvaltning" className="group relative flex min-h-[460px] min-w-0 flex-col border-b border-[#dcd7d0] bg-white/45 p-6 text-left transition-colors hover:bg-white/80 lg:border-b-0 lg:border-r sm:p-8 lg:p-9">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ece9e4] text-[#403c37]"><KeyRound className="h-5 w-5" /></span>
                <span className="rounded-full bg-[#f5f2ee] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#77716a]">Hele Norge</span>
              </div>
              <p className="mt-7 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-[#77716a]">For deg som vil gjøre det selv</p>
              <h2 className="mt-2 text-[29px] font-bold tracking-[-0.035em] text-[#171513] sm:text-[34px]" style={{ fontFamily: 'var(--font-heading)' }}>{self.title}</h2>
              <p className="mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-[#6d6760]">{self.description}</p>

              <div className="mt-6 flex items-end gap-2 border-y border-[#eee9e3] py-5">
                <span className="text-[45px] font-bold leading-none tracking-[-0.05em] text-[#171513]">5 %</span>
                <span className="pb-1 text-[12px] font-semibold leading-snug text-[#77716a]">per utleieforhold<br />ingen bindingstid</span>
              </div>
              <div className="mt-5 space-y-3">
                {self.points.map((point) => <p key={point} className="flex items-start gap-2.5 text-[13px] leading-snug text-[#403c37]"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ece9e4]"><Check className="h-3 w-3 text-[#4e4944]" strokeWidth={3} /></span>{point}</p>)}
              </div>
              <span className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171513] px-5 text-[13.5px] font-bold text-white transition group-hover:bg-[#2b2824]">Velg selvforvaltning <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>

            <button type="button" onClick={() => selectService(full.id)} data-testid="service-full_forvaltning" className="group relative flex min-h-[460px] min-w-0 flex-col bg-[#1d1c1a] p-6 text-left transition-colors hover:bg-[#242220] sm:p-8 lg:p-9">
              <div className="relative flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/85"><ShieldCheck className="h-5 w-5" /></span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">Mest komplett</span>
              </div>
              <p className="relative mt-7 text-[10.5px] font-bold uppercase tracking-[0.13em] text-white/55">For deg som vil slippe hele jobben</p>
              <h2 className="relative mt-2 text-[29px] font-bold tracking-[-0.035em] text-white sm:text-[34px]" style={{ fontFamily: 'var(--font-heading)' }}>{full.title}</h2>
              <p className="relative mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-white/70">{fullUnavailable ? 'Tjenesten er ikke lansert i området ditt ennå. Du kan likevel registrere interesse.' : full.description}</p>

              <div className="relative mt-6 border-y border-white/10 py-5">
                <p className="text-[24px] font-bold tracking-[-0.025em] text-white">{fullUnavailable ? 'Registrer interesse' : 'Personlig tilbud'}</p>
                <p className="mt-1 text-[12px] font-semibold text-white/50">tilpasset boligen · svar innen 24 timer</p>
              </div>
              <div className="relative mt-5 space-y-3">
                {full.points.map((point) => <p key={point} className="flex items-start gap-2.5 text-[13px] leading-snug text-white/75"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d298ff]/15"><Check className="h-3 w-3 text-[#dca9ff]" strokeWidth={3} /></span>{point}</p>)}
              </div>
              <span className="relative mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-[13.5px] font-bold text-[#171513] transition group-hover:bg-[#f1eee9]">{fullUnavailable ? 'Registrer interesse' : 'Få personlig tilbud'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </button>
          </div>

          <p className="mt-6 text-center text-[11.5px] font-medium text-[#88817a]"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-[#8b5cf6]" /> Begge løsninger er trygge, uforpliktende å utforske og kan endres senere.</p>
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
            <TextField id="owner-name-input" label="Fullt navn" value={form.name} onChange={(event: any) => setField('name', event.target.value)} autoComplete="name" placeholder="Ola Nordmann" icon={User} error={errors.name} />
            <TextField id="owner-email-input" label="E-post" type="email" value={form.email} onChange={(event: any) => setField('email', event.target.value)} autoComplete="email" inputMode="email" placeholder="ola@eksempel.no" icon={Mail} error={errors.email} />
            <TextField id="owner-phone-input" label="Telefon" type="tel" value={form.phone} onChange={(event: any) => setField('phone', normalizePhone(event.target.value))} autoComplete="tel-national" inputMode="tel" placeholder="8 siffer" icon={Phone} error={errors.phone} />
          </div>

          {isSelf ? (
            <div className={`mt-5 rounded-2xl border bg-white p-4 ${errors.terms ? 'border-red-400' : 'border-[#dedad4]'}`}>
              <button type="button" onClick={() => { setTermsAccepted((value) => !value); setErrors((current) => ({ ...current, terms: '' })); }} data-testid="owner-terms-checkbox" className="flex w-full items-start gap-3 text-left">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${termsAccepted ? 'border-[#24211e] bg-[#24211e]' : 'border-[#cfc9c2] bg-white'}`}>{termsAccepted ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} /> : null}</span>
                <span className="text-[13px] leading-relaxed text-[#504b46]">Jeg godtar <a href="/vilkar" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="font-bold text-[#403c37] underline underline-offset-2">avtalen om selvforvaltning</a> (5 % per utleieforhold, ingen bindingstid).</span>
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

  return (
    <div className="grid min-h-[100dvh] overflow-x-hidden bg-[#faf9f7] lg:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.82fr)]" data-testid="owner-onboarding-2026">
      <main className="flex min-w-0 flex-col">
        <TopBar phase={phase} />
        <div className="flex flex-1 justify-center px-5 pb-10 pt-7 sm:px-8 sm:pb-14 sm:pt-10 lg:items-center lg:px-12 lg:py-10 xl:px-16">
          <div className="w-full max-w-[620px] min-w-0">
            {phase === 'address' ? (
              <section data-testid="onboarding-address-step">
                <StepHeading eyebrow="Steg 1 av 3" title="Hvor ligger boligen?" text="Skriv inn adressen eller lim inn en FINN-annonse. Det er alt vi trenger nå." />

                <div className="mt-8 min-w-0" data-no-enter-advance>
                  <label htmlFor="entry-address-input" className="mb-2 block text-[13px] font-semibold text-[#292621]">Adresse</label>
                  <div className={`relative min-w-0 rounded-[14px] border bg-white transition-all focus-within:border-[#292621] focus-within:shadow-[0_0_0_3px_rgba(32,29,26,0.06)] ${errors.address ? 'border-red-400' : addressVerified ? 'border-[#8e8680]' : 'border-[#dcd6cf]'}`}>
                    <span className={`pointer-events-none absolute left-4 top-7 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg ${addressVerified ? 'bg-[#f1e4fb]' : 'bg-[#f5f2ef]'}`}>
                      {addressVerified ? <Check className="h-3.5 w-3.5 text-[#7e22ce]" strokeWidth={3} /> : <MapPin className="h-4 w-4 text-[#7e22ce]" />}
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
                        const complete = isCompleteAddress(address, postalCode, city);
                        setForm((current) => ({ ...current, address, postalCode, city }));
                        setAddressVerified(complete);
                        setErrors(complete ? {} : { address: 'Adresseforslaget mangler husnummer, postnummer eller poststed.' });
                      }}
                      placeholder="Skriv gateadresse, FINN-lenke eller FINN-kode"
                      showIcon={false}
                      dataTestId="entry-address-input"
                      inputClassName="h-14 w-full min-w-0 rounded-2xl bg-transparent pl-12 pr-4 text-[16px] text-[#171513] outline-none placeholder:text-[#99938c]"
                      className="min-w-0"
                    />
                  </div>
                  {errors.address ? <p className="mt-1.5 text-[12px] font-medium text-red-600">{errors.address}</p> : null}
                  <div className="mt-2.5 min-h-[20px] text-[12px] leading-relaxed">
                    {finnLookupLoading ? (
                      <span className="inline-flex items-center gap-1.5 text-[#716b63]"><Loader2 className="h-3.5 w-3.5 animate-spin text-[#7e22ce]" /> Henter boligopplysninger fra FINN …</span>
                    ) : addressVerified ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#674179]"><CheckCircle2 className="h-3.5 w-3.5 text-[#8d35c7]" /> Adressen er bekreftet</span>
                    ) : (
                      <span className="text-[#77716a]">Skriv gate og husnummer, og velg hele adressen fra listen. FINN-lenke eller FINN-kode fungerer også.</span>
                    )}
                  </div>
                </div>

                <button type="button" onClick={continueFromAddress} disabled={finnLookupLoading || (!addressVerified && !detectFinnReference(form.address))} data-testid="address-continue" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#171513] px-7 text-[15px] font-bold text-white shadow-[0_16px_34px_-20px_rgba(0,0,0,.65)] transition-all hover:-translate-y-0.5 hover:bg-[#2a2723] hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#e7e3df] disabled:text-[#9a948d] disabled:shadow-none sm:w-auto sm:min-w-[190px]">
                  {finnLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {finnLookupLoading ? 'Henter FINN-annonsen' : 'Fortsett'} {!finnLookupLoading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
                <p className="mt-3 text-[11.5px] font-medium text-[#77716a]">Neste: Velg hvordan du vil forvalte boligen.</p>

                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5 border-t border-[#ebe6df] pt-4 text-[11.5px] font-medium text-[#77716a]"><span>Gratis og uforpliktende</span><span>·</span><span>Under 1 minutt</span><span>·</span><span>Svar innen 24 timer</span></div>
              </section>
            ) : null}

          </div>
        </div>
      </main>
      <DesktopProof />
    </div>
  );
}
