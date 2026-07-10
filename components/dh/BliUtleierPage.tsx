'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-lite';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  TextInput, PhoneInput, IconCardSelector, NumberSelector,
} from './FormFields';
import PropertyRegistryPicker from './PropertyRegistryPicker';
import { FinnLookupField, AddressField, finnToFields, FinnPropertyCard } from './PropertyInputs';
import { AddressAutocomplete } from './AddressAutocomplete';
import { track, getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { getVariant } from '@/lib/ab';
import {
  User, Mail, ArrowRight, ArrowLeft, CheckCircle2, Check, Loader2,
  Home, Building2, Warehouse, LayoutGrid, BedDouble, TrendingUp, Shield, Key, Zap, Calendar as CalendarIcon,
  X, Plus, Sparkles, MapPin, Link2,
} from 'lucide-react';

const BACKEND_URL = '';

// NY 3-STEGS FLYT (CRO-optimalisert juli 2026): Velkommen-steget fjernet
// (kostet ~47 % frafall), eiendomsdetaljer flettet inn i steg 1, forvaltning
// flettet inn i «Dine mål», og kontaktinfo SIST med kompakt oppsummering.
// Indeksene beholdes for stabilitet — flyten styres av flowSteps [1, 5, 3].
const STEPS = [
  { id: 'welcome', title: 'Velkommen' },    // 0 — UTGÅTT (fjernet fra flyt)
  { id: 'property', title: 'Eiendommen' },  // 1 — adresse/Finn + detaljer + estimat
  { id: 'details', title: 'Eiendommen' },   // 2 — UTGÅTT (flettet inn i steg 1)
  { id: 'contact', title: 'Om deg' },       // 3 — SISTE: kontakt + oppsummering + send
  { id: 'tier', title: 'Dine mål' },        // 4 — UTGÅTT (flettet inn i steg 5)
  { id: 'goals', title: 'Dine mål' },       // 5 — mål + forvaltningsnivå
  { id: 'confirm', title: 'Bekreft' },      // 6 — UTGÅTT (oppsummering på steg 3)
];

// Avtaleversjon for klikk-aksept av selvforvaltning (lagres server-side m/tidsstempel).
const SELF_TERMS_VERSION = 'selvforvaltning-2025-06';

// To-nivå-modellen. VIKTIG: Full forvaltning viser ALDRI pris — kun «Få tilbud».
// Full forvaltning tilbys P.T. KUN i Bergen (badge + geo-sjekk i skjemaet).
const TIERS = [
  {
    value: 'selvforvaltning',
    label: 'Selvforvaltning',
    price: '5 %',
    priceNote: 'per utleie',
    icon: Key,
    badge: { text: 'Kom i gang i dag', tone: 'green' },
    area: 'Tilgjengelig i hele landet',
    desc: 'Gjør det selv med våre profesjonelle verktøy. Alt er heldigitalt — du kan starte umiddelbart.',
    bullets: ['Kom i gang umiddelbart — helt selvbetjent', 'Annonsering på Finn.no', 'Digitale kontrakter, husleie og oppgjør'],
  },
  {
    value: 'full_forvaltning',
    label: 'Full forvaltning',
    price: null, // ingen pris — kun tilbud
    priceNote: 'Få tilbud',
    icon: Shield,
    badge: { text: 'Kun i Bergen', tone: 'dark' },
    area: 'Bergen og omegn (foreløpig)',
    desc: 'Vi tar oss av alt — annonsering, visninger, leietakere og oppfølging. Du mottar bare inntekten.',
    bullets: ['Alt håndtert av lokalt team i Bergen', 'Opptil 30 % høyere inntekt', 'Skreddersydd tilbud — uforpliktende'],
  },
];

// Geo-sjekk: Full forvaltning krever bolig i Bergensområdet. Bruker poststed
// fra adressevalget når vi har det, ellers postnummer-område 50xx–52xx.
const isBergenArea = (postal?: string, city?: string) => {
  if ((city || '').trim().toLowerCase() === 'bergen') return true;
  const p = (postal || '').trim();
  return /^5[0-2]\d\d$/.test(p);
};

const propertyTypes = [
  { value: 'leilighet', label: 'Leilighet', icon: Building2 },
  { value: 'hus', label: 'Hus', icon: Home },
  { value: 'rekkehus', label: 'Rekkehus', icon: LayoutGrid },
  { value: 'hybel', label: 'Hybel', icon: BedDouble },
  { value: 'annet', label: 'Annet', icon: Warehouse },
];

const rentalModels = [
  { value: 'dynamisk', label: 'Dynamisk (10+2)', desc: 'Kombinert kort- og langtidsutleie', icon: Zap, recommended: true },
  { value: 'langtid', label: 'Langtidsutleie', desc: 'Stabil, forutsigbar inntekt', icon: Home },
  { value: 'korttid', label: 'Korttidsutleie', desc: 'Maksimer inntekt i høysesong', icon: TrendingUp },
  { value: 'usikker', label: 'Usikker', desc: 'Anbefal den beste løsningen for meg', icon: Key },
];

const stepVariants = {
  enter: (dir: any) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: any) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

// Verdi-teaser: estimert leieinntekt basert på SSB-leiepriser (via /api/rent-estimate).
// Vises så snart soverom er valgt — trekker brukeren gjennom skjemaet.
function RentEstimateCard({ bedrooms }: any) {
  const [est, setEst] = useState<any>(null);
  const [loadingEst, setLoadingEst] = useState(false);
  useEffect(() => {
    const n = parseInt(String(bedrooms), 10) || (String(bedrooms).includes('5') ? 5 : 0);
    if (!n) { setEst(null); return; }
    let alive = true;
    setLoadingEst(true);
    fetch(`/api/rent-estimate?bedrooms=${n}`)
      .then((r) => r.json())
      .then((j) => { if (!alive) return; setEst(j.ok ? j : null); setLoadingEst(false); })
      .catch(() => { if (alive) { setEst(null); setLoadingEst(false); } });
    return () => { alive = false; };
  }, [bedrooms]);
  if (!est && !loadingEst) return null;
  const fmt = (x: number) => (x || 0).toLocaleString('nb-NO');
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="rounded-2xl bg-gradient-to-br from-[#f7f0fe] to-[#f0e6fb] border border-[#e6d6f8] p-5" data-testid="owner-rent-estimate">
      {loadingEst && !est ? (
        <div className="flex items-center gap-2 text-[13px] text-[#8b6db0]"><Loader2 className="w-4 h-4 animate-spin" /> Beregner leieestimat…</div>
      ) : est ? (
        <>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(124,58,237,0.12)]"><TrendingUp className="w-3.5 h-3.5 text-[#7c3aed]" strokeWidth={2.5} /></div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#8b6db0]">Estimert leieinntekt</p>
          </div>
          <p className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-[#0a0a0a] mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
            {fmt(est.low)} – {fmt(est.high)} kr<span className="text-[14px] font-medium text-[#8b6db0] ml-1">/mnd</span>
          </p>
          <p className="text-[11.5px] text-[#9a86b5] mt-1.5 leading-relaxed">
            Basert på SSB-leiepriser for {est.label} i {est.city} ({est.year}) og DigiHomes dynamiske prismodell. Uforpliktende estimat — du får en presis vurdering av en rådgiver.
          </p>
        </>
      ) : null}
    </motion.div>
  );
}

export default function BliUtleierPage({ fullscreen = false }: any) {
  const [step, setStep] = useState(1); // starter rett på Eiendommen (ingen velkomst)
  // Fullskjerm «Kom i gang»-flyt (adresse-først, 2026): fase 'address' = adressesøk,
  // fase 'tier' = geo-tilpasset tjenestevalg (Bergen: begge — ellers kun selvforvaltning),
  // fase 'done' = selve skjemaet.
  const [entryPhase, setEntryPhase] = useState<'address' | 'tier' | 'done'>(fullscreen ? 'address' : 'done');
  // Tjeneste valgt på inngangssteget → vises som kompakt kort på «Dine mål» (ingen dobbel-spørring).
  const [tierLocked, setTierLocked] = useState(false);
  // Adresse valgt fra forslagslisten på inngangssteget (tvungen listevalg → komplette leads).
  const [entryVerified, setEntryVerified] = useState(false);
  const [dir, setDir] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    address: '', postal_code: '', city: '', property_type: '', bedrooms: '', sqm: '',
    rental_model: '', availability: '', notes: '',
    tier: '', // 'selvforvaltning' | 'full_forvaltning' — velges ETTER kontaktinfo
    // Eiendomsregisteret (Infotorg EDR) — fylles av PropertyRegistryPicker
    matrikkel_number: '', seksjonsnr: '', andelsnr: '', bygningstype: '',
    registry_owner_name: '', registry_owner_type: '', registry_orgnr: '',
  });
  // Adressen som skal slås opp i Eiendomsregisteret (settes ved adressevalg)
  const [registryQuery, setRegistryQuery] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Selvbetjent løp: settes når plattformen returnerer en engangs onboarding-
  // lenke (magic link) ved synkron kontoprovisjonering — se bro-spec 10/7.
  const [accountUrl, setAccountUrl] = useState<string | null>(null);
  const [ctaVariant, setCtaVariant] = useState<string>('A');
  // Klikk-aksept av selvforvaltningsavtalen — «avtalen som et steg i flyten».
  const [termsAccepted, setTermsAccepted] = useState(false);
  // CRO: hurtigvalg for tilgjengelighet (chips i stedet for tvungen kalender)
  const [availChoice, setAvailChoice] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Finn-annonse (valgfritt). FinnLookupField håndterer oppslag/forhåndsvisning selv.
  const [finnUrl, setFinnUrl] = useState('');
  // Steg 1: velg mellom adresse eller Finn-annonse som inngang.
  const [inputMode, setInputMode] = useState<'address' | 'finn'>('address');
  const [finnMatrikkel, setFinnMatrikkel] = useState<any>(null);
  const [finnData, setFinnData] = useState<any>(null);
  // Tilstand fra Eiendomsregisteret (for Finn-kortets verifiserings-footer).
  const [registryState, setRegistryState] = useState<string>('idle');

  // Nullstill Finn-flyten (bytt annonse) — tøm hentede felt.
  const resetFinn = useCallback(() => {
    setFinnUrl('');
    setFinnData(null);
    setFinnMatrikkel(null);
    setRegistryState('idle');
    setFormData((prev: any) => ({
      ...prev,
      address: '', postal_code: '', property_type: '', bedrooms: '', sqm: '',
      matrikkel_number: '', seksjonsnr: '', andelsnr: '', bygningstype: '',
      registry_owner_name: '', registry_owner_type: '', registry_orgnr: '',
    }));
    setRegistryQuery('');
    setErrors((prev: any) => ({ ...prev, address: null, sqm: null, property_type: null, bedrooms: null }));
  }, []);

  // Bytt inngangsvei (adresse ↔ Finn) + spor hvilken vei brukeren velger (CRO-funnel).
  const switchToFinn = useCallback(() => {
    setInputMode('finn');
    try { track('form_input_mode', { form: 'utleier', mode: 'finn' }); } catch (e) {}
  }, []);
  const switchToAddress = useCallback(() => {
    setInputMode('address');
    try { track('form_input_mode', { form: 'utleier', mode: 'adresse' }); } catch (e) {}
  }, []);

  // Forhåndsutfyll adresse fra ?address= (fra hero-søket) → hopp RETT til det
  // geo-tilpassede tjenestevalget (adressesteget er allerede besvart på forsiden).
  // VIKTIG: kun ekte gateadresser (med husnummer) pre-fylles og slås opp i
  // Eiendomsregisteret. Bynavn o.l. (f.eks. ?address=Bergen fra gamle
  // landingsside-lenker) skal IKKE fylles inn eller trigge hjemmelshaver-oppslag.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const p = sp.get('address');
      if (p) {
        const looksLikeStreetAddress = /\d/.test(p); // norske gateadresser har husnummer
        if (looksLikeStreetAddress) {
          // Geo-data: helst fra egne URL-parametre (hero sender postal/city ved
          // listevalg) — ellers heuristikk fra selve adressestrengen.
          const qsPostal = (sp.get('postal') || '').trim();
          const qsCity = (sp.get('city') || '').trim();
          const m = p.match(/(\d{4})\s+([A-Za-zÆØÅæøåÉé .-]+?)\s*$/);
          const lastSeg = (p.split(',').pop() || '').trim();
          const postal = qsPostal || (m ? m[1] : '');
          const city = qsCity || (m ? m[2].trim() : (p.includes(',') && !/\d/.test(lastSeg) ? lastSeg : ''));
          setFormData((prev: any) => ({
            ...prev,
            address: p,
            ...(postal ? { postal_code: postal } : {}),
            ...(city ? { city } : {}),
          }));
          setRegistryQuery(p);
          setEntryVerified(true);
          setEntryPhase((cur) => (cur === 'address' ? 'tier' : cur)); // hopp over adressesteget
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Analyse: marker at skjemaet ble startet (én gang) + spor hvert steg (drop-off).
  // A/B-tildeling (onboard_cta) FØR form_start → varianten følger med på events.
  useEffect(() => { try { setCtaVariant(getVariant('onboard_cta', ['A', 'B'])); } catch (e) {} }, []);
  useEffect(() => { track('form_start', { form: 'utleier' }); try { trackLeadStart('utleier'); } catch (e) {} }, []);
  useEffect(() => {
    // Spor flyt-posisjon (1–3) — ikke interne indekser — så trakten i admin
    // viser rene steg: 1 Eiendommen → 2 Dine mål → 3 Om deg.
    const pos = Math.max(0, flowSteps.indexOf(step));
    track('form_step', { form: 'utleier', step: pos + 1, label: STEPS[step]?.title || `Steg ${pos + 1}` });
  }, [step]); // eslint-disable-line

  const updateField = useCallback((field: any, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev: any) => ({ ...prev, [field]: null }));
  }, [errors]);

  const [extraUnits, setExtraUnits] = useState<any[]>([]);
  const addExtra = () => setExtraUnits((prev) => [...prev, { address: '', postal_code: '', property_type: 'leilighet', sqm: '', bedrooms: '', finn_url: '' }]);
  const updateExtra = (i: number, k: string, v: any) => setExtraUnits((prev) => prev.map((u, idx) => (idx === i ? { ...u, [k]: v } : u)));
  const removeExtra = (i: number) => setExtraUnits((prev) => prev.filter((_, idx) => idx !== i));
  const updateExtraMany = (i: number, obj: any) =>
    setExtraUnits((prev) => prev.map((u, idx) => (idx === i ? { ...u, ...obj } : u)));

  // NY FLYT: 3 steg — Eiendommen (1) → Dine mål (5) → Om deg + send (3).
  // Eiendomsdetaljene redigeres på steg 1 i BEGGE moduser (adresse og Finn).
  const flowSteps = [1, 5, 3];

  // Ved stegbytte: scroll til toppen av SKJEMAET (#skjema) — ikke toppen av
  // hele siden (skjemaet ligger under hero-innholdet på /bli-utleier).
  // Scroller kun når skjematoppen er utenfor synsfeltet, ellers står vi i ro.
  const scrollToFormTop = () => {
    try {
      const el = document.getElementById('skjema');
      if (!el) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const top = el.getBoundingClientRect().top;
      if (top < -8 || top > 120) {
        window.scrollTo({ top: top + window.scrollY - 84, behavior: 'smooth' }); // 84px ≈ sticky navbar
      }
    } catch (e) { /* ignore */ }
  };

  const goNext = () => {
    const newErrors: Record<string, any> = {};
    if (step === 1) {
      // Steg 1 samler nå adresse + eiendomsdetaljer (begge moduser).
      if (!formData.address.trim() && !finnMatrikkel) {
        newErrors.address = inputMode === 'finn'
          ? 'Lim inn en gyldig Finn-lenke til boligen'
          : 'Vennligst oppgi adressen til eiendommen';
      } else if (inputMode !== 'finn' && formData.address.trim() && (!formData.postal_code || !/\d/.test(formData.address))) {
        // Tvungen listevalg: adresse skrevet uten å velge fra forslagslisten
        // mangler postnummer/husnummer → ufullstendige leads i CRM-et.
        newErrors.address = 'Velg adressen fra forslagslisten — da får vi med postnummer og husnummer';
      } else {
        if (!String(formData.sqm || '').trim()) newErrors.sqm = 'Oppgi størrelse';
        if (!formData.property_type) newErrors.property_type = 'Velg boligtype';
        if (!formData.bedrooms) newErrors.bedrooms = 'Velg antall soverom';
      }
    }
    if (step === 5) {
      // Steg 2 i flyten: mål + forvaltningsnivå (flettet).
      // CRO-fix (48 % frafall her): utleiemodell er VALGFRI (usikre brukere
      // skal ikke stoppes), og tilgjengelighet velges via hurtigvalg-chips
      // i stedet for tvungen kalenderdato.
      if (!formData.availability) newErrors.availability = 'Velg når boligen er ledig';
      if (!formData.tier) newErrors.tier = 'Velg hvordan du vil leie ut';
      else if (formData.tier === 'selvforvaltning' && !termsAccepted) newErrors.terms = 'Godta avtalen for å fortsette med selvforvaltning';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setDir(1);
    const pos = flowSteps.indexOf(step);
    setStep(pos >= 0 && pos < flowSteps.length - 1 ? flowSteps[pos + 1] : step);
    scrollToFormTop();
  };

  const goBack = () => {
    setDir(-1);
    const pos = flowSteps.indexOf(step);
    if (pos > 0) setStep(flowSteps[pos - 1]);
    scrollToFormTop();
  };

  // Kontaktvalidering — kjøres ved innsending (kontaktinfo ligger på siste steg).
  const validateContact = () => {
    const newErrors: Record<string, any> = {};
    if (!formData.name.trim()) newErrors.name = 'Vennligst oppgi navnet ditt';
    if (!formData.email.trim()) newErrors.email = 'Vennligst oppgi e-postadressen din';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Ugyldig e-postadresse';
    if (!formData.phone.trim() || formData.phone.replace(/\s/g, '').length < 8) newErrors.phone = 'Vennligst oppgi et gyldig telefonnummer (8 siffer)';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return false; }
    return true;
  };

  // Delvis lead: fanger kontaktinfo i det den er gyldig (blur på siste steg) —
  // gir salgsteamet mulighet til å følge opp de som faller av før innsending.
  const partialSentRef = useRef('');
  const sendPartialLead = () => {
    try {
      if (submitted || loading) return;
      const email = (formData.email || '').trim();
      const phone = (formData.phone || '').trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const phoneOk = phone.replace(/\D/g, '').length >= 8;
      if (!emailOk && !phoneOk) return;
      const sig = `${email}|${phone}`;
      if (partialSentRef.current === sig) return;
      partialSentRef.current = sig;
      fetch('/api/lead/partial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          form: 'utleier',
          name: formData.name, email, phone: phone ? `+47 ${phone}` : '',
          address: formData.address, postal_code: formData.postal_code,
          sqm: formData.sqm, bedrooms: formData.bedrooms, property_type: formData.property_type,
          rental_model: formData.rental_model, tier: formData.tier,
        }),
      }).catch(() => {});
    } catch (e) { /* ignore */ }
  };

  // Felles: berik skjemaet med matrikkel/eier fra Eiendomsregisteret.
  const applyRegistry = (d: any) => setFormData((prev: any) => ({
    ...prev,
    matrikkel_number: d.matrikkel_number || '',
    seksjonsnr: d.seksjonsnr || '',
    andelsnr: d.andelsnr || '',
    bygningstype: d.bygningstype || '',
    registry_owner_name: d.registry_owner_name || '',
    registry_owner_type: d.registry_owner_type || '',
    registry_orgnr: d.registry_orgnr || '',
  }));

  // 2026-UX: Enter går videre (unntatt textarea + adresse/Finn-felt som bruker Enter selv).
  const onKeyDownAdvance = (e: any) => {
    if (e.key !== 'Enter' || e.shiftKey || loading) return;
    const t = e.target;
    const tag = (t && t.tagName ? t.tagName : '').toUpperCase();
    if (tag === 'TEXTAREA') return;
    if (t && t.closest && t.closest('[data-no-enter-advance]')) return;
    e.preventDefault();
    const isLast = flowSteps.indexOf(step) === flowSteps.length - 1;
    if (!isLast) goNext(); else handleSubmit();
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!validateContact()) return;
    setLoading(true);
    try {
      const validExtras = extraUnits.filter((u) => (u.address || '').trim());
      const mkUnit = (address: string, postal_code: string, property_type: string, sqm: any, bedrooms: any, finn_url?: string) => ({
        address: (address || '').trim(),
        postal_code: (postal_code || '').trim(),
        property_type: property_type || 'leilighet',
        sqm: sqm ? parseInt(sqm) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        rental_model: formData.rental_model || '',
        finn_url: (finn_url || '').trim() || undefined,
      });
      const units = [
        {
          ...mkUnit(formData.address, formData.postal_code, formData.property_type, formData.sqm, formData.bedrooms, finnUrl),
          matrikkel_number: formData.matrikkel_number || undefined,
          seksjonsnr: formData.seksjonsnr || undefined,
          andelsnr: formData.andelsnr || undefined,
          bygningstype: formData.bygningstype || undefined,
          registry_owner_name: formData.registry_owner_name || undefined,
          registry_owner_type: formData.registry_owner_type || undefined,
          registry_orgnr: formData.registry_orgnr || undefined,
        },
        ...validExtras.map((u) => mkUnit(u.address, u.postal_code, u.property_type, u.sqm, u.bedrooms, u.finn_url)),
      ];
      const registrySummary = formData.matrikkel_number
        ? [
            `Matrikkel: ${formData.matrikkel_number}`,
            formData.bygningstype ? `Type: ${formData.bygningstype}` : '',
            formData.registry_owner_name ? `Hjemmelshaver: ${formData.registry_owner_name}` : '',
          ].filter(Boolean).join(', ')
        : '';
      const extrasSummary = validExtras.map((u, idx) => {
        const parts = [`Eiendom ${idx + 2}: ${(u.address || '').trim()}`];
        if (u.sqm) parts.push(`${u.sqm} m²`);
        if (u.bedrooms) parts.push(`${u.bedrooms} sov`);
        if ((u.finn_url || '').trim()) parts.push(`Finn: ${u.finn_url.trim()}`);
        return parts.join(', ');
      });
      const payload = {
        address: formData.address, postal_code: formData.postal_code,
        city: formData.city || undefined,
        // Ekspansjonssignal: Full forvaltning valgt utenfor Bergensområdet
        outside_area: (formData.tier === 'full_forvaltning' && formData.postal_code && !isBergenArea(formData.postal_code, formData.city)) ? true : undefined,
        sqm: formData.sqm ? parseInt(formData.sqm) : 60,
        bedrooms: parseInt(formData.bedrooms) || 2, property_type: formData.property_type || 'leilighet',
        name: formData.name, email: formData.email, phone: '+47 ' + formData.phone,
        availability: formData.availability,
        lead_type: 'huseier',
        units,
        num_properties: units.length,
        finn_url: finnUrl || undefined,
        matrikkel_number: formData.matrikkel_number || undefined,
        seksjonsnr: formData.seksjonsnr || undefined,
        andelsnr: formData.andelsnr || undefined,
        bygningstype: formData.bygningstype || undefined,
        registry_owner_name: formData.registry_owner_name || undefined,
        registry_owner_type: formData.registry_owner_type || undefined,
        registry_orgnr: formData.registry_orgnr || undefined,
        // To-nivå-modellen: valgt spor + klikk-aksept av selvforvaltningsavtalen.
        tier: formData.tier || undefined,
        terms: formData.tier === 'selvforvaltning' && termsAccepted ? { version: SELF_TERMS_VERSION } : undefined,
        attribution: { ...getLeadAttribution(), ...getClickIds() },
        notes: [
          formData.rental_model ? `Ønsket modell: ${formData.rental_model}` : '',
          registrySummary,
          formData.notes,
          ...extrasSummary,
        ].filter(Boolean).join('. '),
      };
      const res = await fetch(`${BACKEND_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.ok)) {
        // Synkron kontoprovisjonering (selvforvaltning): plattformen kan
        // returnere account.onboarding_url → vis «Gå til kontoen din»-knapp.
        const acct = data.account || data?.data?.account;
        if (acct && typeof acct.onboarding_url === 'string' && /^https:\/\//.test(acct.onboarding_url)) {
          setAccountUrl(acct.onboarding_url);
        }
        setSubmitted(true);
        track('lead_submit', { form: 'utleier', leadType: 'huseier', properties: units.length, tier: formData.tier || 'ukjent' });
        try { trackLead({ formId: 'utleier', source: 'bli-utleier', leadId: data?.data?.id, email: formData.email, phone: '+47 ' + formData.phone }); } catch (e) {}
        toast.success('Takk! Vi tar kontakt snart.');
      } else {
        throw new Error('lead failed');
      }
    } catch {
      try { track('form_error', { form: 'utleier', kind: 'submit' }); } catch (e) {}
      toast.error('Noe gikk galt. Prøv igjen.');
    }
    finally { setLoading(false); }
  };

  // Tier-tilpasset suksess-innhold (selvforvaltning = konto-oppsett, full = tilbud).
  const successSub = formData.tier === 'selvforvaltning'
    ? (accountUrl
        ? 'Avtalen din er registrert og kontoen din er klar — du kan gå rett inn og legge inn boligen din.'
        : 'Avtalen din om selvforvaltning er registrert. Vi setter opp kontoen din og sender deg tilgang på e-post.')
    : formData.tier === 'full_forvaltning'
      ? 'Vi har mottatt henvendelsen din. En lokal rådgiver kontakter deg med et skreddersydd, uforpliktende tilbud.'
      : 'Vi har mottatt henvendelsen din. En rådgiver tar kontakt for en personlig, uforpliktende gjennomgang.';
  const successSteps = formData.tier === 'selvforvaltning'
    ? [
        { t: 'Avtale registrert', s: '5 % per utleieforhold — ingen faste kostnader', done: true },
        accountUrl
          ? { t: 'Kontoen din er klar', s: 'Gå rett inn — du får også en lenke på e-post', done: true }
          : { t: 'Vi setter opp kontoen din', s: 'Du får e-post med tilgang til plattformen' },
        { t: 'Publiser boligen og lei ut', s: 'Annonsering, kontrakter og betaling — alt digitalt' },
      ]
    : formData.tier === 'full_forvaltning'
      ? [
          { t: 'Vi vurderer eiendommen', s: 'Inntektspotensial og beste utleiemodell', done: true },
          { t: 'Rådgiver ringer innen 24 timer', s: 'Personlig gjennomgang — helt uforpliktende' },
          { t: 'Du får et skreddersydd tilbud', s: 'Konkret plan for inntekt og neste steg' },
        ]
      : [
          { t: 'Vi vurderer eiendommen', s: 'Inntektspotensial og beste utleiemodell', done: true },
          { t: 'Vi ringer deg innen 24 timer', s: 'Personlig gjennomgang — helt uforpliktende' },
          { t: 'Du får en skreddersydd plan', s: 'Klar oversikt over inntekt og neste steg' },
        ];

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-16 bg-[#fdfcfb] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[680px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.16) 0%, rgba(207,151,252,0) 70%)' }} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative text-center max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }}
            className="w-20 h-20 rounded-[22px] bg-[#0a0a0a] flex items-center justify-center mx-auto mb-7 shadow-[0_14px_44px_-12px_rgba(0,0,0,0.45)]">
            <CheckCircle2 className="w-10 h-10 text-[#cf97fc]" />
          </motion.div>
          <h2 className="text-[33px] sm:text-[38px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Tusen takk{formData.name ? `, ${formData.name.split(' ')[0]}` : ''}!</h2>
          <p className="text-[16px] text-[#666] leading-relaxed max-w-[42ch] mx-auto">{successSub}</p>

          <div className="mt-8 text-left bg-white rounded-[22px] p-6 shadow-[0_8px_40px_-24px_rgba(0,0,0,0.35)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa] mb-4">Hva skjer nå</p>
            <div>
              {successSteps.map((it: any, i: number, arr: any[]) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.12, duration: 0.35 }} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${it.done ? 'bg-[#cf97fc] text-white' : 'bg-[#f1ecf8] text-[#b39ddb]'}`}>{it.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <span className="text-[12px] font-bold">{i + 1}</span>}</div>
                    {i < arr.length - 1 && <div className="w-[2px] flex-1 min-h-[24px] bg-[#efe9f7] my-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-[14.5px] font-semibold text-[#0a0a0a] leading-tight">{it.t}</p>
                    <p className="text-[13px] text-[#888] mt-0.5">{it.s}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Estimat-avsløringen: gulroten leveres ETTER konvertering — som
              intervall, tydelig merket foreløpig (rådgiveren eier sluttallet). */}
          {formData.bedrooms ? (
            <div className="mt-5 text-left" data-testid="owner-success-estimate">
              <RentEstimateCard bedrooms={formData.bedrooms} />
            </div>
          ) : null}

          {accountUrl ? (
            <>
              <Button onClick={() => { window.location.href = accountUrl; }} data-testid="owner-success-account-button"
                className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform mt-7">
                Gå til kontoen din <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="mt-3">
                <a href="/" data-testid="owner-success-home-link" className="text-[13px] text-[#999] underline underline-offset-2 hover:text-[#555]">Tilbake til forsiden</a>
              </p>
            </>
          ) : (
            <Button onClick={() => window.location.href = '/'} data-testid="owner-success-home-button"
              className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform mt-7">
              Tilbake til forsiden <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // Velkomststeget er fjernet (juli 2026): trakten viste ~47 % frafall der.
  // Brukeren går nå rett inn i skjemaet med adressen fra hero-søket forhåndsutfylt.

  // ---------- Fullskjerm-chrome: egen minimal topplinje (logo + Avslutt) ----------
  const fsTopbar = fullscreen ? (
    <div className="sticky top-0 z-40 bg-[#fdfcfb]/90 backdrop-blur-md border-b border-[#f0ede8]">
      <div className="max-w-[680px] mx-auto px-6 h-[58px] flex items-center justify-between">
        <a href="/" className="text-[18px] font-bold tracking-[-0.02em] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>digihome<span style={{ color: '#cf97fc' }}>.</span></a>
        <a href="/bli-utleier" data-testid="start-exit" className="text-[13px] font-medium text-[#999] hover:text-[#0a0a0a] transition-colors">Avslutt</a>
      </div>
    </div>
  ) : null;

  // ---------- Adresse-først-inngangen (fullskjerm): geo-evaluering ----------
  const hasGeo = !!((formData.postal_code || '').trim() || (formData.city || '').trim());
  const inBergen = isBergenArea(formData.postal_code, formData.city);

  // Tjenestevalg på inngangssteget → lås valget (vises kompakt på «Dine mål»).
  const chooseEntryTier = (value: string) => {
    updateField('tier', value);
    setTierLocked(true);
    setTermsAccepted(false);
    setErrors((prev: any) => ({ ...prev, tier: null, terms: null }));
    setDir(1);
    setStep(1);
    setEntryPhase('done');
    try { track('tier_entry_choice', { tier: value, form: 'utleier-start', in_bergen: inBergen, has_geo: hasGeo }); } catch (e) {}
  };

  // Steg 0 — adresse valgt fra forslagslisten (tvungen): lagre postnr/poststed
  // for geo-rutingen og gå automatisk videre til tjenestevalget.
  const onEntryAddressSelect = (data: any) => {
    const addr = data.address ? data.address.replace(/,\s*(Norway|Norge)$/i, '') : '';
    setFormData((prev: any) => ({
      ...prev,
      ...(addr ? { address: addr } : {}),
      postal_code: data.postalCode || '',
      city: data.city || '',
    }));
    if (addr) setRegistryQuery(addr);
    setEntryVerified(true);
    try { track('entry_address_selected', { form: 'utleier-start', postal: data.postalCode || '', city: data.city || '' }); } catch (e) {}
    setTimeout(() => { setDir(1); setEntryPhase('tier'); }, 220); // kort pust → føles flytende, ikke brått
  };

  // ---------- Fullskjerm steg 0: «Hvor ligger boligen?» (adresse-først) ----------
  if (fullscreen && entryPhase === 'address') {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex flex-col relative overflow-hidden" data-testid="start-entry-address">
        {fsTopbar}
        {/* Myk lavendel-glød + prikk-grid — samme formspråk som forsiden */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)', backgroundSize: '24px 24px', opacity: 0.35,
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 40%, black 25%, transparent 72%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 40%, black 25%, transparent 72%)',
        }} />
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[560px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.10) 0%, transparent 65%)' }} />
        <div className="flex-1 flex items-center justify-center px-5 py-12 relative">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[640px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b18ae0] text-center">Kom i gang — tar under 2 minutter</p>
            <h1 className="text-[32px] sm:text-[42px] font-bold tracking-[-0.03em] text-[#0a0a0a] text-center mt-3 leading-[1.08]" style={{ fontFamily: 'var(--font-heading)' }}>
              Hvor ligger boligen<br className="hidden sm:block" /> du vil leie ut?
            </h1>
            <p className="text-[15px] text-[#888] text-center mt-3.5 max-w-[46ch] mx-auto leading-relaxed">
              Start med adressen — vi finner tjenestene som er tilgjengelige i ditt område og estimerer leiepotensialet.
            </p>

            <div className="mt-9" data-no-enter-advance>
              <div className="flex items-center rounded-full bg-white border-2 border-[#e8e5e0] shadow-[0_2px_14px_rgba(0,0,0,0.05)] transition-all duration-300 focus-within:border-[#0a0a0a]/35 focus-within:shadow-[0_0_0_4px_rgba(10,10,10,0.05),0_16px_44px_rgba(20,10,40,0.10)] hover:shadow-[0_8px_28px_rgba(20,10,40,0.09)]">
                <div className="pl-5 sm:pl-6"><MapPin className="w-[18px] h-[18px] text-[#7c3aed]" /></div>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(v: any) => {
                    updateField('address', v);
                    setEntryVerified(false);
                    if (formData.postal_code || formData.city) setFormData((prev: any) => ({ ...prev, address: v, postal_code: '', city: '' }));
                  }}
                  onSelect={onEntryAddressSelect}
                  placeholder="F.eks. Nordnesveien 13, Bergen"
                  showIcon={false}
                  dataTestId="entry-address-input"
                  inputClassName="flex-1 h-[62px] px-3.5 text-[15.5px] bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-[#999] w-full"
                  className="flex-1"
                />
                <div className="pr-2">
                  <button
                    type="button"
                    onClick={() => { setDir(1); setEntryPhase('tier'); }}
                    disabled={!entryVerified}
                    data-testid="entry-address-continue"
                    aria-label="Fortsett"
                    className={`w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all duration-300 ${entryVerified ? 'bg-[#0a0a0a] text-white hover:shadow-[0_6px_20px_rgba(167,101,224,0.35)] active:scale-95' : 'bg-[#f0eee9] text-[#c2beb6] cursor-not-allowed'}`}
                  >
                    <ArrowRight className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-[#999] text-center mt-3.5">Velg adressen fra forslagslisten — da finner vi riktig område automatisk.</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-9">
              {['Gratis og uforpliktende', 'Svar innen 24 timer', '150+ boliger forvaltet'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[12px] text-[#999]"><Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={3} /> {t}</span>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-8 pt-6 border-t border-[#f0ede8]">
              <button type="button" data-testid="entry-mode-finn"
                onClick={() => { setInputMode('finn'); setDir(1); setEntryPhase('tier'); try { track('form_input_mode', { form: 'utleier-start', mode: 'finn' }); } catch (e) {} }}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed] hover:text-[#8a45d6] transition-colors">
                <Zap className="w-3.5 h-3.5" /> Har du en Finn-annonse? Bruk den i stedet
              </button>
              <span className="hidden sm:block h-3.5 w-px bg-[#e5e0d8]" aria-hidden />
              <button type="button" data-testid="entry-skip-address" onClick={() => { setDir(1); setEntryPhase('tier'); }} className="text-[13px] font-medium text-[#999] hover:text-[#555] transition-colors">
                Hopp over
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ---------- Fullskjerm steg 0.5: geo-tilpasset tjenestevalg ----------
  if (fullscreen && entryPhase === 'tier') {
    const selfTier: any = TIERS.find((t: any) => t.value === 'selvforvaltning');
    const fullTier: any = TIERS.find((t: any) => t.value === 'full_forvaltning');
    const showBoth = !hasGeo || inBergen; // ukjent geo → vis begge (Full har «Kun i Bergen»-badge)
    const placeLabel = (formData.city || '').trim() || ((formData.postal_code || '').trim() ? `postnummer ${formData.postal_code}` : '');
    const renderTierCard = (t: any, featured = false) => {
      const I = t.icon;
      return (
        <button key={t.value} type="button" data-testid={`entry-tier-${t.value}`}
          onClick={() => chooseEntryTier(t.value)}
          className={`relative text-left rounded-[22px] border-2 bg-white p-6 transition-all duration-200 active:scale-[0.985] group ${featured ? 'border-[#cf97fc] shadow-[0_16px_50px_-24px_rgba(124,58,237,0.4)]' : 'border-[#eceae6] hover:border-[#cf97fc] hover:shadow-[0_16px_50px_-24px_rgba(124,58,237,0.35)]'}`}>
          {t.badge && (
            <span className={`absolute -top-2.5 right-5 text-[9px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full ${featured || t.badge.tone === 'green' ? 'bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white' : 'bg-[#0a0a0a] text-white'}`}>{featured ? 'Tilgjengelig på din adresse' : t.badge.text}</span>
          )}
          <div className="w-11 h-11 rounded-2xl bg-[#f7f0fe] flex items-center justify-center">
            <I className="w-5 h-5 text-[#7c3aed]" strokeWidth={2.2} />
          </div>
          <p className="text-[19px] font-bold tracking-[-0.01em] text-[#0a0a0a] mt-4" style={{ fontFamily: 'var(--font-heading)' }}>{t.label}</p>
          <p className="text-[13px] text-[#888] mt-1.5 leading-relaxed sm:min-h-[58px]">{t.desc}</p>
          <p className={`inline-flex items-center gap-1.5 mt-2 text-[11.5px] font-semibold ${t.value === 'selvforvaltning' ? 'text-[#15803d]' : 'text-[#777]'}`}><MapPin className="w-3 h-3" /> {t.area}</p>
          <div className="mt-3 space-y-1.5">
            {t.bullets.map((b: string) => (
              <div key={b} className="flex items-start gap-2 text-[12.5px] text-[#666]">
                <Check className="w-3.5 h-3.5 text-[#cf97fc] shrink-0 mt-0.5" strokeWidth={3} /> {b}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#f2f0ec] flex items-center justify-between">
            <span className="text-[15px] font-bold text-[#0a0a0a]">{t.price ? `${t.price} ` : ''}<span className="text-[12px] font-medium text-[#999]">{t.priceNote}</span></span>
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#7c3aed] group-hover:gap-2 transition-all">{t.value === 'selvforvaltning' ? 'Kom i gang nå' : 'Få tilbud'} <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </button>
      );
    };
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex flex-col relative overflow-hidden" data-testid="start-entry">
        {fsTopbar}
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[560px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.10) 0%, transparent 65%)' }} />
        <div className="flex-1 flex items-center justify-center px-5 py-12 relative">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[680px]">

            {/* Valgt adresse — chip med «Endre» tilbake til adressesteget */}
            {formData.address ? (
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2.5 rounded-full bg-white border border-[#e8e2f2] pl-3.5 pr-1.5 py-1.5 shadow-[0_2px_12px_rgba(20,10,40,0.06)] max-w-full" data-testid="entry-address-chip">
                  <MapPin className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" />
                  <span className="text-[13px] font-semibold text-[#0a0a0a] truncate max-w-[200px] sm:max-w-[340px]">{formData.address}</span>
                  {formData.postal_code && !(formData.address || '').includes(formData.postal_code) ? <span className="text-[12px] text-[#999] hidden sm:inline shrink-0">{formData.postal_code} {formData.city}</span> : null}
                  <button type="button" data-testid="entry-address-edit" onClick={() => { setDir(-1); setEntryPhase('address'); }}
                    className="text-[11.5px] font-semibold text-[#7c3aed] hover:bg-[#faf5ff] rounded-full px-2.5 py-1.5 transition-colors shrink-0">Endre</button>
                </div>
              </div>
            ) : null}

            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b18ae0] text-center">
              {hasGeo ? (inBergen ? 'Gode nyheter' : 'Tilgjengelig i ditt område') : 'Kom i gang'}
            </p>
            <h1 className="text-[30px] sm:text-[38px] font-bold tracking-[-0.03em] text-[#0a0a0a] text-center mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {hasGeo && inBergen ? 'Vi er i ditt område!' : hasGeo ? 'Slik leier du ut med DigiHome' : 'Hvordan vil du leie ut?'}
            </h1>
            <p className="text-[14.5px] text-[#888] text-center mt-2.5 max-w-[54ch] mx-auto leading-relaxed">
              {hasGeo && inBergen
                ? 'DigiHome tilbyr alle tjenester i Bergen. Velg sporet som passer deg best — du kan ombestemme deg senere.'
                : hasGeo
                  ? `Selvforvaltning er tilgjengelig i hele landet — også ${placeLabel ? `i ${placeLabel}` : 'hos deg'}. Full forvaltning tilbys foreløpig kun i Bergen.`
                  : 'Velg sporet som passer deg best — du kan ombestemme deg senere i skjemaet.'}
            </p>

            {showBoth ? (
              <div className="grid sm:grid-cols-2 gap-4 mt-9">
                {renderTierCard(selfTier)}
                {renderTierCard(fullTier)}
              </div>
            ) : (
              <div className="mt-9">
                {renderTierCard(selfTier, true)}
                {/* Full forvaltning — utilgjengelig utenfor Bergensområdet (ekspansjonssignal via «Meld interesse») */}
                <div className="mt-4 rounded-[22px] border-2 border-dashed border-[#e8e4de] bg-[#faf9f7] p-5 sm:p-6" data-testid="entry-tier-full-unavailable">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f0eee9] flex items-center justify-center shrink-0">
                      <Shield className="w-[18px] h-[18px] text-[#b5b0a8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-bold text-[#8a857d]" style={{ fontFamily: 'var(--font-heading)' }}>Full forvaltning</p>
                        <span className="text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-[#ece9e3] text-[#8a857d]">Kun i Bergen</span>
                      </div>
                      <p className="text-[12.5px] text-[#9a958c] mt-1 leading-relaxed">
                        Ikke tilgjengelig {placeLabel ? `i ${placeLabel}` : 'på din adresse'} ennå — vi utvider stadig til nye områder.
                      </p>
                      <button type="button" data-testid="entry-tier-full-interest" onClick={() => chooseEntryTier('full_forvaltning')}
                        className="mt-2.5 text-[12.5px] font-semibold text-[#7c3aed] hover:underline underline-offset-2 text-left">
                        Meld interesse likevel — vi kontakter deg når vi kommer til ditt område →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[12px] text-[#aaa] text-center mt-6">Uforpliktende — ingen betaling før boligen din er leid ut.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Flyt-bevisst progresjon (Finn hopper over steg 2).
  const curPos = Math.max(0, flowSteps.indexOf(step));
  const finnCardShown = step === 1 && inputMode === 'finn' && !!finnData;
  const stepTitle = (step === 1 && inputMode === 'finn') ? 'Eiendommen' : STEPS[step].title;
  const nextStepIdx = curPos < flowSteps.length - 1 ? flowSteps[curPos + 1] : null;
  const nextStepTitle = nextStepIdx != null ? STEPS[nextStepIdx].title : '';

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col" data-testid="owner-page">
      {fullscreen ? fsTopbar : <div className="h-[56px] lg:h-[76px]" />}
      <div className="flex-1 flex flex-col">
        <div className="max-w-[600px] w-full mx-auto px-6 pt-6">
          <div className="flex items-center justify-between mb-5">
            {curPos > 0 ? (
              <button onClick={goBack} className="w-9 h-9 rounded-full border border-[#e8e5e0] hover:bg-[#f5f5f5] flex items-center justify-center transition-colors active:scale-95" data-testid="owner-back-button" aria-label="Tilbake">
                <ArrowLeft className="w-4 h-4 text-[#888]" />
              </button>
            ) : fullscreen ? (
              <button onClick={() => { setDir(-1); setEntryPhase(formData.tier ? 'tier' : 'address'); }} className="w-9 h-9 rounded-full border border-[#e8e5e0] hover:bg-[#f5f5f5] flex items-center justify-center transition-colors active:scale-95" data-testid="owner-back-to-entry" aria-label="Tilbake til tjenestevalget">
                <ArrowLeft className="w-4 h-4 text-[#888]" />
              </button>
            ) : (
              <div className="w-9 h-9" aria-hidden="true" />
            )}
            <div className="text-right">
              <p className="text-[10.5px] font-semibold text-[#7c3aed] uppercase tracking-[0.1em] leading-none">Steg {curPos + 1} av {flowSteps.length}</p>
              <p className="text-[13.5px] text-[#0a0a0a] font-semibold mt-1 leading-none">{stepTitle}</p>
            </div>
          </div>
          {/* Premium stepper — sirkler + animerte koblinger (flyt-bevisst) */}
          <div className="flex items-center mb-9">
            {flowSteps.map((idx: number, pos: number) => {
              const done = curPos > pos;
              const active = step === idx;
              return (
                <React.Fragment key={idx}>
                  <motion.div
                    initial={false}
                    animate={{ scale: active ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    title={STEPS[idx].title}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors duration-300 ${done ? 'bg-[#cf97fc] border-[#cf97fc] text-white' : active ? 'bg-white border-[#cf97fc] text-[#7c3aed] shadow-[0_0_0_4px_rgba(207,151,252,0.18)]' : 'bg-white border-[#e6e3df] text-[#c4c0bb]'}`}
                  >
                    {done ? <Check className="w-4 h-4" strokeWidth={3} /> : pos + 1}
                  </motion.div>
                  {pos < flowSteps.length - 1 && (
                    <div className="flex-1 h-[2px] mx-2 rounded-full bg-[#ece9e4] overflow-hidden">
                      <motion.div className="h-full bg-[#cf97fc] rounded-full" initial={false} animate={{ width: curPos > pos ? '100%' : '0%' }} transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-[600px] w-full mx-auto px-6 pb-[calc(6rem+var(--dh-consent-h,0px))]" onKeyDown={onKeyDownAdvance}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}>

              {/* STEG 1 — ADRESSE eller FINN-ANNONSE → eiendomsregister-søk */}
              {step === 1 && (
                <div data-testid="owner-step-address" data-no-enter-advance>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7c3aed] uppercase tracking-[0.1em] mb-3">
                    <MapPin className="w-3.5 h-3.5" /> Eiendommen
                  </div>
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {finnCardShown ? 'Bekreft eiendommen' : inputMode === 'finn' ? 'Lim inn Finn-annonsen' : 'Hvor ligger eiendommen?'}
                  </h2>
                  <p className="text-[15px] text-[#888] mb-7 max-w-[46ch]">
                    {finnCardShown
                      ? 'Vi hentet alt fra annonsen og verifiserte mot Eiendomsregisteret. Sjekk at detaljene stemmer — du kan justere direkte.'
                      : inputMode === 'finn'
                        ? 'Lim inn lenken til boligen på finn.no, så fyller vi inn adresse, areal, matrikkel og eierforslag automatisk.'
                        : 'Skriv inn adressen — vi henter matrikkel og eierforslag automatisk fra Eiendomsregisteret.'}
                  </p>

                  {inputMode === 'address' ? (
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Adresse <span className="text-[#7c3aed]">*</span></Label>
                      <AddressField
                        value={formData.address}
                        postalCode={formData.postal_code}
                        autoConfirm
                        error={errors.address}
                        placeholder="F.eks. Nordnesveien 13, Bergen"
                        testIdPrefix="owner-address"
                        onChange={(v: any) => { updateField('address', v); if (formData.postal_code) updateField('postal_code', ''); }}
                        onSelect={(data: any) => {
                          const addr = data.address ? data.address.replace(/,\s*(Norway|Norge)$/i, '') : '';
                          if (addr) { updateField('address', addr); setRegistryQuery(addr); }
                          if (data.postalCode) updateField('postal_code', data.postalCode);
                          if (data.city) updateField('city', data.city); // for Bergen-sjekk på tier-steget
                        }}
                      />

                      {/* Premium Finn-snarvei — vises før adresse er valgt (ikke alle har en annonse) */}
                      <AnimatePresence initial={false}>
                        {!registryQuery && (
                          <motion.button
                            key="finn-shortcut"
                            type="button"
                            onClick={switchToFinn}
                            data-testid="owner-mode-finn"
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="group mt-4 w-full flex items-center gap-3.5 rounded-2xl border border-[#ece7f5] bg-gradient-to-r from-[#faf7ff] to-[#f5eefc] px-4 py-3.5 text-left transition-all hover:border-[#d9c7f3] hover:shadow-[0_10px_30px_-18px_rgba(124,58,237,0.55)] active:scale-[0.99]"
                          >
                            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(124,58,237,0.12)]">
                              <Zap className="w-4 h-4 text-[#7c3aed]" fill="#7c3aed" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13.5px] font-semibold text-[#0a0a0a] leading-tight">Har du allerede en Finn-annonse?</p>
                              <p className="text-[12.5px] text-[#888] mt-0.5 leading-snug">Lim inn lenken — så fyller vi inn alt automatisk.</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#bbb] shrink-0 transition-all group-hover:text-[#7c3aed] group-hover:translate-x-0.5" />
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <PropertyRegistryPicker
                        query={registryQuery}
                        addressLabel={[formData.address, formData.postal_code].filter(Boolean).join(', ')}
                        onResolved={applyRegistry}
                      />
                    </div>
                  ) : (
                    <div>
                      {/* Tilbake til adresse-veien (kun før Finn-treff) */}
                      {!finnData && (
                        <button
                          type="button"
                          onClick={switchToAddress}
                          data-testid="owner-mode-address"
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed] hover:text-[#8a45d6] mb-5 transition-colors"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Bruk adresse i stedet
                        </button>
                      )}
                      {/* Før treff: lenkefelt. Etter treff: hele steget blir ett stort eiendomskort. */}
                      <AnimatePresence mode="wait" initial={false}>
                        {!finnData ? (
                          <motion.div key="finn-input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                            <Label className="text-[13px] font-semibold text-[#333] mb-1.5 block">Lenke til Finn-annonse <span className="text-[#7c3aed]">*</span></Label>
                            <p className="text-[13px] text-[#888] mb-3">Lim inn lenken til boligen på finn.no — vi henter adresse, areal, matrikkel og eierforslag automatisk.</p>
                            <FinnLookupField
                              value={finnUrl}
                              onChange={setFinnUrl}
                              testId="owner-step1-finn"
                              hidePreview
                              onResult={(d: any) => {
                                const mk = d?.matrikkel && d.matrikkel.kommunenr && d.matrikkel.gaardsnr && d.matrikkel.bruksnr
                                  ? { kommunenr: d.matrikkel.kommunenr, gaardsnr: d.matrikkel.gaardsnr, bruksnr: d.matrikkel.bruksnr } : null;
                                setFinnMatrikkel(mk);
                                setFinnData(d);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  ...finnToFields(d),
                                  ...(d?.address ? { address: d.address } : {}),
                                  ...(d?.postalCode ? { postal_code: d.postalCode } : {}),
                                }));
                                if (!mk && d?.address) setRegistryQuery(d.address);
                                setErrors((prev: any) => ({ ...prev, address: null }));
                              }}
                            />
                            {errors.address && <p className="text-[12px] text-red-500 mt-2">{errors.address}</p>}
                          </motion.div>
                        ) : (
                          <motion.div key="finn-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                            <FinnPropertyCard
                              data={finnData}
                              sourceUrl={finnUrl}
                              onReset={resetFinn}
                              sqm={formData.sqm}
                              bedrooms={formData.bedrooms}
                              propertyType={formData.property_type}
                              onSqm={(v: any) => updateField('sqm', v)}
                              onBedrooms={(v: any) => updateField('bedrooms', v)}
                              onType={(v: any) => updateField('property_type', v)}
                              errors={errors}
                              verifying={registryState === 'loading'}
                              ownerName={formData.registry_owner_name}
                              ownerType={formData.registry_owner_type}
                              needsSelect={(registryState === 'sameie' || registryState === 'borettslag') && !formData.seksjonsnr && !formData.andelsnr}
                              registryFailed={registryState === 'notfound' || registryState === 'error'}
                            />
                            {/* Seksjons-/andelsvelger (kun for sameie/borettslag) — auto-velger fra Finn-seksjonsnr */}
                            <PropertyRegistryPicker
                              matrikkel={finnMatrikkel}
                              query={finnMatrikkel ? '' : registryQuery}
                              addressLabel={formData.address}
                              onResolved={applyRegistry}
                              onState={setRegistryState}
                              renderSingle={false}
                              preselectSeksjonsnr={finnData?.matrikkel?.seksjonsnr || ''}
                              preselectAndelsnr={finnData?.matrikkel?.andelsnr || ''}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Eiendomsdetaljer — samme steg (adresse-modus). I Finn-modus redigeres de i Finn-kortet. */}
                  {inputMode === 'address' && (formData.address.trim() || registryQuery) ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-8 pt-7 border-t border-[#f0ece6] space-y-6" data-testid="owner-property-details">
                      <TextInput label="Størrelse (m²)" required error={errors.sqm} value={formData.sqm} onChange={(v: any) => updateField('sqm', v)} placeholder="F.eks. 65" type="number" testId="owner-sqm-input" />
                      <div>
                        <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Boligtype <span className="text-[#7c3aed]">*</span></Label>
                        <IconCardSelector options={propertyTypes} selected={formData.property_type} onChange={(v: any) => updateField('property_type', v)} testIdPrefix="owner-type" />
                        {errors.property_type && <p className="text-[12px] text-red-500 mt-1.5">{errors.property_type}</p>}
                      </div>
                      <div>
                        <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Soverom <span className="text-[#7c3aed]">*</span></Label>
                        <NumberSelector options={['1', '2', '3', '4', '5+']} selected={formData.bedrooms} onChange={(v: any) => updateField('bedrooms', v)} testIdPrefix="owner-bedrooms" />
                        {errors.bedrooms && <p className="text-[12px] text-red-500 mt-1.5">{errors.bedrooms}</p>}
                      </div>
                    </motion.div>
                  ) : null}

                  {/* Estimat-teaser: selve tallet vises FØRST etter innsending
                      (nysgjerrighetsgap → høyere fullføring, og rådgiveren
                      eier det endelige tallet i samtalen). */}
                  {formData.bedrooms && (inputMode === 'address' ? (formData.address.trim() || registryQuery) : !!finnData) ? (
                    <div className="mt-6 rounded-2xl border border-[#e6d6f8] bg-gradient-to-br from-[#f7f0fe] to-[#f0e6fb] p-4 flex items-center gap-3" data-testid="owner-estimate-teaser">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(124,58,237,0.12)] shrink-0">
                        <TrendingUp className="w-4 h-4 text-[#7c3aed]" strokeWidth={2.5} />
                      </div>
                      <p className="text-[12.5px] text-[#6d5691] leading-relaxed">
                        <strong className="text-[#0a0a0a]">Leieestimatet ditt er klart.</strong> Vi viser intervallet straks du har sendt inn — uforpliktende, basert på SSB-leiepriser.
                      </p>
                    </div>
                  ) : null}

                  {/* Flere eiendommer (valgfritt) — flettet inn fra gamle «Om eiendommen»-steget */}
                  {(inputMode === 'address' ? (formData.address.trim() || registryQuery) : !!finnData) ? (
                    <div className="mt-8 pt-6 border-t border-[#f0f0f0]" data-testid="owner-extra-units-section">
                      <div className="flex items-center justify-between mb-1"><p className="text-[13px] font-semibold text-[#333]">Har du flere eiendommer?</p><span className="text-[12px] text-[#5b6370]">Valgfritt</span></div>
                      <p className="text-[13px] text-[#888] mb-4">Legg til flere boliger du vil leie ut — vi vurderer dem samlet.</p>
                      <AnimatePresence initial={false}>
                        {extraUnits.map((u: any, i: number) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-[#eee] bg-white p-5 mb-3" data-testid={`owner-extra-unit-${i}`}>
                            <div className="flex items-center justify-between mb-4"><p className="text-[11px] font-semibold text-[#737373] uppercase tracking-[0.06em]">Eiendom {i + 2}</p>
                              <button type="button" onClick={() => removeExtra(i)} data-testid={`owner-extra-remove-${i}`} className="w-7 h-7 rounded-full flex items-center justify-center text-[#bbb] hover:text-red-500 hover:bg-red-50 transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-5">
                              <div>
                                <Label className="text-[12.5px] font-semibold text-[#555] mb-2 block">Adresse</Label>
                                <AddressField
                                  compact
                                  value={u.address}
                                  postalCode={u.postal_code}
                                  placeholder="Adresse til eiendommen"
                                  testIdPrefix={`owner-extra-address-${i}`}
                                  onChange={(v: any) => updateExtra(i, 'address', v)}
                                  onSelect={(data: any) => {
                                    if (data.address) updateExtra(i, 'address', data.address.replace(/,\s*(Norway|Norge)$/i, ''));
                                    if (data.postalCode) updateExtra(i, 'postal_code', data.postalCode);
                                  }}
                                />
                              </div>

                              <div className="rounded-xl bg-[#faf7fe] border border-[#efe6fb] p-3.5">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Sparkles className="w-[13px] h-[13px] text-[#cf97fc]" />
                                  <span className="text-[12px] font-semibold text-[#555]">Finn-annonse <span className="text-[#5b6370] font-normal">(valgfritt)</span></span>
                                </div>
                                <FinnLookupField
                                  value={u.finn_url || ''}
                                  onChange={(v: any) => updateExtra(i, 'finn_url', v)}
                                  testId={`owner-extra-finn-${i}`}
                                  onResult={(d: any) => updateExtraMany(i, finnToFields(d))}
                                />
                              </div>

                              <TextInput label="Størrelse (m²)" value={u.sqm} onChange={(v: any) => updateExtra(i, 'sqm', v)} placeholder="F.eks. 65" type="number" testId={`owner-extra-sqm-${i}`} />
                              <div>
                                <Label className="text-[12.5px] font-semibold text-[#555] mb-3 block">Boligtype</Label>
                                <IconCardSelector options={propertyTypes} selected={u.property_type} onChange={(v: any) => updateExtra(i, 'property_type', v)} testIdPrefix={`owner-extra-type-${i}`} />
                              </div>
                              <div>
                                <Label className="text-[12.5px] font-semibold text-[#555] mb-3 block">Soverom</Label>
                                <NumberSelector options={['1', '2', '3', '4', '5+']} selected={u.bedrooms} onChange={(v: any) => updateExtra(i, 'bedrooms', v)} testIdPrefix={`owner-extra-bedrooms-${i}`} />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <button type="button" onClick={addExtra} data-testid="owner-add-unit-button" className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-[#e0d4f0] text-[#cf97fc] hover:border-[#cf97fc] hover:bg-[#faf5ff] text-[14px] font-semibold transition-all"><Plus className="w-4 h-4" /> Legg til {extraUnits.length > 0 ? 'enda en' : 'eiendom'}</button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* STEG 3 — OM DEG (kontaktinformasjon) */}
              {step === 3 && (
                <div data-testid="owner-step-personal" onBlurCapture={sendPartialLead}>
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Nesten i mål!</h2>
                  <p className="text-[15px] text-[#888] mb-8">Hvem skal vi sende vurderingen til?</p>
                  <div className="space-y-5">
                    <TextInput label="Fullt navn" required error={errors.name} icon={User} value={formData.name} onChange={(v: any) => updateField('name', v)} placeholder="Ola Nordmann" autoComplete="name" autoFocus testId="owner-name-input" />
                    <TextInput label="E-post" required error={errors.email} icon={Mail} value={formData.email} type="email" onChange={(v: any) => updateField('email', v)} placeholder="ola@eksempel.no" autoComplete="email" testId="owner-email-input" />
                    <PhoneInput value={formData.phone} onChange={(v: any) => updateField('phone', v)} error={errors.phone} testId="owner-phone-input" />
                  </div>
                  <p className="text-[11px] text-[#5b6370] mt-5"><span className="text-[#7c3aed]">*</span> Påkrevde felt</p>

                  {/* Kompakt oppsummering — erstatter det gamle Bekreft-steget */}
                  <div className="mt-8 rounded-2xl border border-[#eee9e2] bg-[#faf9f7] p-5" data-testid="owner-final-summary">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#999] mb-3">Oppsummering</p>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-[#333] truncate">{formData.address || 'Adresse ikke oppgitt'}</p>
                          <p className="text-[12px] text-[#888] mt-0.5">
                            {[formData.sqm ? `${formData.sqm} m²` : null, formData.property_type || null, formData.bedrooms ? `${formData.bedrooms} sov.` : null].filter(Boolean).join(' · ') || '—'}
                            {extraUnits.filter((u: any) => (u.address || '').trim()).length > 0 ? ` · +${extraUnits.filter((u: any) => (u.address || '').trim()).length} eiendom(mer)` : ''}
                          </p>
                          {(formData.registry_owner_name || formData.seksjonsnr || formData.andelsnr) && (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#e7f7ee] text-[#16a34a] px-2 py-0.5 text-[11px] font-semibold"><CheckCircle2 className="w-3 h-3" /> Verifisert i registeret</span>
                          )}
                        </div>
                        <button type="button" onClick={() => { setDir(-1); setStep(1); }} data-testid="owner-edit-property" className="text-[12px] font-semibold text-[#7c3aed] hover:underline shrink-0">Endre</button>
                      </div>
                      <div className="flex items-start justify-between gap-3 pt-3 border-t border-[#f0ece6]">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-[#333]">
                            {formData.tier === 'selvforvaltning' ? 'Selvforvaltning — 5 % per utleie' : formData.tier === 'full_forvaltning' ? 'Full forvaltning — skreddersydd tilbud' : 'Forvaltning ikke valgt'}
                          </p>
                          <p className="text-[12px] text-[#888] mt-0.5">
                            {[formData.rental_model ? `Modell: ${formData.rental_model}` : null, formData.availability ? `Ledig ${new Date(formData.availability + 'T12:00:00').toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        <button type="button" onClick={() => { setDir(-1); setStep(5); }} data-testid="owner-edit-goals" className="text-[12px] font-semibold text-[#7c3aed] hover:underline shrink-0">Endre</button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#999] mt-4 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#cf97fc]" /> Gratis og uforpliktende — svar innen 24 timer.</p>
                </div>
              )}

              {/* STEG 5a — FORVALTNINGSNIVÅ (flettet inn i «Dine mål»-steget) */}
              {step === 5 && (
                <div data-testid="owner-step-tier">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7c3aed] uppercase tracking-[0.1em] mb-3">
                    <Shield className="w-3.5 h-3.5" /> Dine mål
                  </div>
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{tierLocked && formData.tier ? 'Ditt valg' : 'Hvordan vil du leie ut?'}</h2>
                  <p className="text-[15px] text-[#888] mb-7 max-w-[46ch]">{tierLocked && formData.tier ? 'Basert på valget ditt i starten — du kan endre det når som helst.' : 'Velg nivået som passer deg best — du kan bytte når som helst.'}</p>
                  {tierLocked && formData.tier ? (() => {
                    const t: any = TIERS.find((x: any) => x.value === formData.tier);
                    const LockedIcon = t.icon;
                    return (
                      <div className="w-full rounded-2xl border-2 border-[#cf97fc] bg-[#faf5ff] p-5 flex items-center gap-4 shadow-[0_10px_30px_-18px_rgba(124,58,237,0.45)]" data-testid="owner-tier-locked">
                        <div className="w-11 h-11 rounded-xl bg-[#cf97fc] flex items-center justify-center shrink-0"><LockedIcon className="w-5 h-5 text-white" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15.5px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{t.label}</p>
                          <p className="text-[12.5px] text-[#888] mt-0.5">{t.price ? `${t.price} ${t.priceNote} — ingen faste kostnader` : 'Skreddersydd tilbud — helt uforpliktende'}</p>
                        </div>
                        <button type="button" onClick={() => setTierLocked(false)} data-testid="owner-tier-change" className="text-[12.5px] font-semibold text-[#7c3aed] hover:underline underline-offset-2 shrink-0">Endre</button>
                      </div>
                    );
                  })() : (
                  <div className="space-y-3.5">
                    {TIERS.map((t: any) => {
                      const Icon = t.icon;
                      const selected = formData.tier === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          data-testid={`owner-tier-${t.value}`}
                          onClick={() => {
                            const next = selected ? '' : t.value;
                            updateField('tier', next);
                            setTermsAccepted(false);
                            setErrors((prev: any) => ({ ...prev, tier: null, terms: null }));
                            if (next) { try { track('tier_select', { form: 'utleier', tier: next }); } catch (e) {} }
                          }}
                          className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 relative ${selected ? 'border-[#cf97fc] bg-[#faf5ff] shadow-[0_10px_30px_-18px_rgba(124,58,237,0.45)]' : 'border-[#eee] bg-white hover:border-[#ddd]'}`}
                        >
                          {t.badge && (
                            <span className={`absolute -top-2.5 right-4 text-[9px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full ${t.badge.tone === 'green' ? 'bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white' : 'bg-[#0a0a0a] text-white'}`}>{t.badge.text}</span>
                          )}
                          <div className="flex items-start gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-[#cf97fc]' : 'bg-[#f0f0f0]'}`}>
                              <Icon className="w-5 h-5" style={{ color: selected ? '#fff' : '#aaa' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className={`text-[15.5px] font-bold ${selected ? 'text-[#0a0a0a]' : 'text-[#333]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{t.label}</p>
                                {t.price ? (
                                  <span className="inline-flex items-baseline gap-1 rounded-full bg-[#f1e8fd] text-[#7A3EC8] px-3 py-1">
                                    <span className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{t.price}</span>
                                    <span className="text-[10.5px] font-medium">{t.priceNote}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-[#0a0a0a] text-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em]">{t.priceNote}</span>
                                )}
                              </div>
                              <p className="text-[13px] text-[#888] mt-1.5 leading-relaxed">{t.desc}</p>
                              {t.area && (
                                <p className={`inline-flex items-center gap-1.5 mt-2 text-[11.5px] font-semibold ${t.value === 'selvforvaltning' ? 'text-[#15803d]' : 'text-[#777]'}`}>
                                  <MapPin className="w-3 h-3" /> {t.area}
                                </p>
                              )}
                              <div className="mt-3 space-y-1.5">
                                {t.bullets.map((b: string) => (
                                  <div key={b} className="flex items-center gap-2 text-[12.5px] text-[#666]">
                                    <Check className="w-3.5 h-3.5 text-[#cf97fc] shrink-0" strokeWidth={3} /> {b}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  )}
                  {errors.tier && <p className="text-[12px] text-red-500 mt-2" data-testid="owner-tier-error">{errors.tier}</p>}

                  {/* Geo-varsel: Full forvaltning valgt, men boligen ligger utenfor Bergensområdet */}
                  <AnimatePresence initial={false}>
                    {formData.tier === 'full_forvaltning' && formData.postal_code && !isBergenArea(formData.postal_code, formData.city) && (
                      <motion.div key="outside-area" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                        className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5" data-testid="owner-outside-area">
                        <p className="text-[13.5px] font-bold text-amber-900" style={{ fontFamily: 'var(--font-heading)' }}>Boligen ser ut til å ligge utenfor Bergen</p>
                        <p className="text-[12.5px] text-amber-800 mt-1.5 leading-relaxed">
                          Full forvaltning tilbys foreløpig kun i Bergensområdet. Du kan velge <strong>Selvforvaltning</strong> (tilgjengelig i hele landet, kom i gang i dag) — eller sende inn likevel, så kontakter vi deg når vi utvider til ditt område.
                        </p>
                        <button type="button" data-testid="owner-switch-to-self"
                          onClick={() => { updateField('tier', 'selvforvaltning'); setTermsAccepted(false); setErrors((prev: any) => ({ ...prev, tier: null, terms: null })); try { track('tier_switch_outside_area', { form: 'utleier' }); } catch (e) {} }}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0a0a0a] text-white px-4 py-2 text-[12.5px] font-semibold hover:bg-black active:scale-[0.97] transition-transform">
                          Bytt til selvforvaltning <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait" initial={false}>
                    {formData.tier === 'selvforvaltning' && (
                      <motion.div key="self-terms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                        className="mt-5 rounded-2xl border border-[#e8dcf7] bg-gradient-to-br from-[#faf7ff] to-[#f5eefc] p-5" data-testid="owner-tier-terms">
                        <p className="text-[13.5px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Avtale om selvforvaltning</p>
                        <div className="mt-2.5 space-y-1.5">
                          {['5 % per utleieforhold — ingen faste kostnader', 'Ingen bindingstid — avslutt når du vil', 'Du godkjenner leietakere og priser selv'].map((b) => (
                            <div key={b} className="flex items-center gap-2 text-[12.5px] text-[#666]">
                              <Check className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" strokeWidth={3} /> {b}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setTermsAccepted((v) => !v); setErrors((prev: any) => ({ ...prev, terms: null })); }}
                          data-testid="owner-terms-checkbox"
                          className="mt-4 w-full flex items-start gap-3 text-left group"
                        >
                          <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${termsAccepted ? 'bg-[#cf97fc] border-[#cf97fc]' : 'bg-white border-[#d9cfe9] group-hover:border-[#cf97fc]'}`}>
                            {termsAccepted && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                          </span>
                          <span className="text-[13px] text-[#555] leading-relaxed">
                            Jeg godtar <a href="/vilkar" target="_blank" rel="noopener noreferrer" onClick={(e: any) => e.stopPropagation()} className="text-[#7c3aed] font-semibold underline underline-offset-2">avtalen om selvforvaltning</a> (5 % per utleieforhold). Avtalen bekreftes digitalt — ingen papirer.
                          </span>
                        </button>
                        {errors.terms && <p className="text-[12px] text-red-500 mt-2" data-testid="owner-terms-error">{errors.terms}</p>}
                      </motion.div>
                    )}
                    {formData.tier === 'full_forvaltning' && (
                      <motion.div key="full-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                        className="mt-5 rounded-2xl bg-[#f7f4ef] border border-[#ece7de] p-5 flex items-start gap-3.5" data-testid="owner-tier-full-info">
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                          <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                        </div>
                        <div>
                          <p className="text-[13.5px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Skreddersydd tilbud — helt uforpliktende</p>
                          <p className="text-[13px] text-[#666] mt-1 leading-relaxed">En lokal rådgiver kontakter deg med et konkret tilbud for boligen din — som regel samme dag.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* STEG 5b — MÅL OG PREFERANSER (samme steg som forvaltningsvalget) */}
              {step === 5 && (
                <div data-testid="owner-step-goals" className="mt-10 pt-8 border-t border-[#f0ece6]">
                  <h3 className="text-[19px] sm:text-[22px] font-bold tracking-[-0.02em] text-[#0a0a0a] mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>Hva er viktigst for deg?</h3>
                  <p className="text-[14px] text-[#888] mb-6">Vi anbefaler den optimale strategien basert på dine preferanser.</p>
                  <div className="space-y-7">
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-1 block">Foretrukket utleiemodell <span className="text-[#737373] font-normal">(valgfritt)</span></Label>
                      <p className="text-[12px] text-[#999] mb-3">Usikker? Hopp over — vi anbefaler den beste modellen for boligen din.</p>
                      <div className="space-y-2.5">
                        {rentalModels.map((m: any) => {
                          const Icon = m.icon;
                          const selected = formData.rental_model === m.value;
                          return (
                            <button key={m.value} type="button" onClick={() => updateField('rental_model', selected ? '' : m.value)} data-testid={`owner-model-${m.value}`}
                              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 relative ${selected ? 'border-[#cf97fc] bg-[#faf5ff]' : 'border-[#eee] bg-white hover:border-[#ddd]'}`}>
                              {m.recommended && (<span className="absolute -top-2.5 right-4 text-[9px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full bg-gradient-to-r from-[#c084fc] to-[#AE68E4] text-white">Anbefalt</span>)}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-[#cf97fc]' : 'bg-[#f0f0f0]'}`}><Icon className="w-5 h-5" style={{ color: selected ? '#fff' : '#aaa' }} /></div>
                              <div><p className={`text-[14px] font-semibold ${selected ? 'text-[#0a0a0a]' : 'text-[#555]'}`}>{m.label}</p><p className="text-[12px] text-[#5b6370] mt-0.5">{m.desc}</p></div>
                            </button>
                          );
                        })}
                      </div>
                      {errors.rental_model && <p className="text-[12px] text-red-500 mt-1.5">{errors.rental_model}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Når er boligen ledig for utleie? <span className="text-[#7c3aed]">*</span></Label>
                      {/* CRO: hurtigvalg — ingen tvungen kalender. Eksakt dato er valgfritt. */}
                      <div className="flex flex-wrap gap-2" data-testid="owner-availability-chips">
                        {[
                          ['asap', 'Så snart som mulig', 0],
                          ['1m', 'Innen 1 måned', 30],
                          ['3m', 'Innen 3 måneder', 90],
                          ['later', 'Senere / usikker', 180],
                        ].map(([val, label, days]: any) => {
                          const selected = availChoice === val;
                          return (
                            <button key={val} type="button" data-testid={`owner-availability-${val}`}
                              onClick={() => {
                                setAvailChoice(val);
                                const d = new Date(Date.now() + days * 86400000);
                                updateField('availability', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                                setErrors((prev: any) => ({ ...prev, availability: null }));
                              }}
                              className={`h-11 px-4 rounded-full border-2 text-[13.5px] font-semibold transition-all ${selected ? 'border-[#cf97fc] bg-[#faf5ff] text-[#0a0a0a]' : 'border-[#eee] bg-white text-[#666] hover:border-[#ddd]'}`}>
                              {label}
                            </button>
                          );
                        })}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" data-testid="owner-availability-input" className={`h-11 px-4 rounded-full border-2 text-[13.5px] font-semibold transition-all inline-flex items-center gap-2 ${availChoice === 'custom' ? 'border-[#cf97fc] bg-[#faf5ff] text-[#0a0a0a]' : 'border-[#eee] bg-white text-[#666] hover:border-[#ddd]'}`}>
                              <CalendarIcon className="w-4 h-4 shrink-0" />
                              {availChoice === 'custom' && formData.availability ? format(new Date(formData.availability + 'T12:00:00'), 'd. MMM yyyy', { locale: nb }) : 'Velg dato'}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-0" align="start">
                            <Calendar mode="single" locale={nb} selected={availChoice === 'custom' && formData.availability ? new Date(formData.availability + 'T12:00:00') : undefined}
                              onSelect={(d: any) => { if (d) { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); setAvailChoice('custom'); updateField('availability', `${y}-${m}-${day}`); setErrors((prev: any) => ({ ...prev, availability: null })); } }}
                              disabled={(date: any) => date < new Date()} className="rounded-2xl" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {errors.availability && <p className="text-[12px] text-red-500 mt-1.5">{errors.availability}</p>}
                    </div>
                    <div>
                      {(showNotes || formData.notes) ? (
                        <>
                          <Label className="text-[13px] font-semibold text-[#333]">Kommentarer <span className="text-[#737373] font-normal">(valgfritt)</span></Label>
                          <textarea value={formData.notes} onChange={(e: any) => updateField('notes', e.target.value)} placeholder="Er det noe spesielt vi bør vite?" rows={3} autoFocus={showNotes && !formData.notes} className="w-full mt-2 px-4 py-3.5 text-[15px] rounded-2xl border border-[#e0e0e0] bg-white focus:outline-none focus:ring-2 focus:ring-[#cf97fc] resize-none placeholder:text-[#737373]" data-testid="owner-notes-textarea" />
                        </>
                      ) : (
                        <button type="button" onClick={() => setShowNotes(true)} data-testid="owner-notes-toggle" className="text-[13px] font-semibold text-[#7c3aed] hover:underline underline-offset-2">+ Legg til en kommentar (valgfritt)</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bekreft-steget er fjernet — kompakt oppsummering ligger nå på siste steg (Om deg). */}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sticky z-30 mt-auto bg-white/90 backdrop-blur-xl border-t border-[#f0f0f0]" style={{ bottom: 'var(--dh-consent-h, 0px)' }}>
          <div className="max-w-[600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
            {curPos > 0 ? (
              <button onClick={goBack} className="text-[14px] font-semibold text-[#666] hover:text-[#333] underline underline-offset-4 transition-colors" data-testid="owner-back-link">Tilbake</button>
            ) : (
              <span className="text-[12px] text-[#aaa] inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={3} /> Gratis og uforpliktende</span>
            )}
            {nextStepIdx != null ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-[12px] text-[#aaa]">Neste: <span className="text-[#666] font-medium">{nextStepTitle}</span></span>
                <Button onClick={goNext} data-testid="owner-next-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]">Neste <ArrowRight className="w-4 h-4" /></Button>
              </div>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} data-testid="owner-submit-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {formData.tier === 'full_forvaltning' ? 'Få tilbud' : formData.tier === 'selvforvaltning' ? 'Fullfør registrering' : (ctaVariant === 'B' ? 'Fullfør – helt gratis' : 'Send henvendelse')}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
