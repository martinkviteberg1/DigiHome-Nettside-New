'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-lite';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  TextInput, PhoneInput, IconCardSelector, NumberSelector, SummaryCard,
} from './FormFields';
import PropertyRegistryPicker from './PropertyRegistryPicker';
import { FinnLookupField, AddressField, finnToFields, FinnPropertyCard } from './PropertyInputs';
import { track, getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import {
  User, Mail, ArrowRight, ArrowLeft, CheckCircle2, Check, Loader2,
  Home, Building2, Warehouse, LayoutGrid, BedDouble, TrendingUp, Shield, Key, Zap, Calendar as CalendarIcon,
  X, Plus, Sparkles, MapPin, Link2,
} from 'lucide-react';

const BACKEND_URL = '';

const STEPS = [
  { id: 'welcome', title: 'Velkommen' },   // 0
  { id: 'address', title: 'Adresse' },      // 1
  { id: 'property', title: 'Eiendommen' },  // 2
  { id: 'personal', title: 'Om deg' },      // 3
  { id: 'goals', title: 'Dine mål' },       // 4
  { id: 'confirm', title: 'Bekreft' },      // 5
];

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

export default function BliUtleierPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    address: '', postal_code: '', property_type: '', bedrooms: '', sqm: '',
    rental_model: '', availability: '', notes: '',
    // Eiendomsregisteret (Infotorg EDR) — fylles av PropertyRegistryPicker
    matrikkel_number: '', seksjonsnr: '', andelsnr: '', bygningstype: '',
    registry_owner_name: '', registry_owner_type: '', registry_orgnr: '',
  });
  // Adressen som skal slås opp i Eiendomsregisteret (settes ved adressevalg)
  const [registryQuery, setRegistryQuery] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  // Forhåndsutfyll adresse fra ?address= (fra hero-søket) → rett til adresse-steget
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('address');
      if (p) {
        setFormData((prev: any) => ({ ...prev, address: p }));
        setRegistryQuery(p);
        setStep(1);
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Analyse: marker at skjemaet ble startet (én gang) + spor hvert steg (drop-off).
  useEffect(() => { track('form_start', { form: 'utleier' }); try { trackLeadStart('utleier'); } catch (e) {} }, []);
  useEffect(() => {
    track('form_step', { form: 'utleier', step: step + 1, label: STEPS[step]?.title || `Steg ${step}` });
  }, [step]);

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

  // Finn-flyten hopper over «Om eiendommen» (steg 2) — alt redigeres på steg 1.
  const flowSteps = inputMode === 'finn' ? [1, 3, 4, 5] : [1, 2, 3, 4, 5];

  const goNext = () => {
    const newErrors: Record<string, any> = {};
    if (step === 1) {
      if (!formData.address.trim() && !finnMatrikkel) {
        newErrors.address = inputMode === 'finn'
          ? 'Lim inn en gyldig Finn-lenke til boligen'
          : 'Vennligst oppgi adressen til eiendommen';
      }
      // I Finn-flyten valideres eiendomsdetaljene her (det finnes ikke noe steg 2).
      if (inputMode === 'finn') {
        if (!String(formData.sqm || '').trim()) newErrors.sqm = 'Oppgi størrelse';
        if (!formData.property_type) newErrors.property_type = 'Velg boligtype';
        if (!formData.bedrooms) newErrors.bedrooms = 'Velg antall soverom';
      }
    }
    if (step === 2) {
      if (!String(formData.sqm || '').trim()) newErrors.sqm = 'Oppgi størrelse';
      if (!formData.property_type) newErrors.property_type = 'Velg boligtype';
      if (!formData.bedrooms) newErrors.bedrooms = 'Velg antall soverom';
    }
    if (step === 3) {
      if (!formData.name.trim()) newErrors.name = 'Vennligst oppgi navnet ditt';
      if (!formData.email.trim()) newErrors.email = 'Vennligst oppgi e-postadressen din';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Ugyldig e-postadresse';
      if (!formData.phone.trim() || formData.phone.replace(/\s/g, '').length < 8) newErrors.phone = 'Vennligst oppgi et gyldig telefonnummer (8 siffer)';
    }
    if (step === 4) {
      if (!formData.rental_model) newErrors.rental_model = 'Velg utleiemodell';
      if (!formData.availability) newErrors.availability = 'Velg tilgjengelighetsdato';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setDir(1);
    if (step === 0) { setStep(1); }
    else {
      const pos = flowSteps.indexOf(step);
      setStep(pos >= 0 && pos < flowSteps.length - 1 ? flowSteps[pos + 1] : step);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setDir(-1);
    if (step <= 1) { setStep(0); }
    else {
      const pos = flowSteps.indexOf(step);
      setStep(pos > 0 ? flowSteps[pos - 1] : 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (step < STEPS.length - 1) goNext(); else handleSubmit();
  };

  const handleSubmit = async () => {
    if (loading) return;
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
        setSubmitted(true);
        track('lead_submit', { form: 'utleier', leadType: 'huseier', properties: units.length });
        try { trackLead({ formId: 'utleier', source: 'bli-utleier', leadId: data?.data?.id, email: formData.email, phone: '+47 ' + formData.phone }); } catch (e) {}
        toast.success('Takk! Vi tar kontakt snart.');
      } else {
        throw new Error('lead failed');
      }
    } catch { toast.error('Noe gikk galt. Prøv igjen.'); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-16 bg-[#fdfcfb] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[680px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.16) 0%, rgba(207,151,252,0) 70%)' }} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative text-center max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }}
            className="w-20 h-20 rounded-[22px] bg-[#0a0a0a] flex items-center justify-center mx-auto mb-7 shadow-[0_14px_44px_-12px_rgba(0,0,0,0.45)]">
            <CheckCircle2 className="w-10 h-10 text-[#cf97fc]" />
          </motion.div>
          <h1 className="text-[33px] sm:text-[38px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Tusen takk{formData.name ? `, ${formData.name.split(' ')[0]}` : ''}!</h1>
          <p className="text-[16px] text-[#666] leading-relaxed max-w-[42ch] mx-auto">Vi har mottatt henvendelsen din. En rådgiver tar kontakt for en personlig, uforpliktende gjennomgang.</p>

          <div className="mt-8 text-left bg-white rounded-[22px] p-6 shadow-[0_8px_40px_-24px_rgba(0,0,0,0.35)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#aaa] mb-4">Hva skjer nå</p>
            <div>
              {[
                { t: 'Vi vurderer eiendommen', s: 'Inntektspotensial og beste utleiemodell', done: true },
                { t: 'Vi ringer deg innen 24 timer', s: 'Personlig gjennomgang — helt uforpliktende' },
                { t: 'Du får en skreddersydd plan', s: 'Klar oversikt over inntekt og neste steg' },
              ].map((it: any, i: number, arr: any[]) => (
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

          <Button onClick={() => window.location.href = '/'} data-testid="owner-success-home-button"
            className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform mt-7">
            Tilbake til forsiden <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#fdfcfb]" data-testid="owner-page" style={{ paddingBottom: 'var(--dh-consent-h, 0px)' }}>
        <div className="h-[56px] lg:h-[76px]" />
        <div className="max-w-[1100px] mx-auto px-5 sm:px-10 py-6 sm:py-12 lg:py-16" data-testid="owner-step-welcome">
          <div className="grid lg:grid-cols-2 gap-7 sm:gap-10 lg:gap-16 items-center lg:min-h-[calc(100vh-200px)]">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <div className="lg:hidden relative rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <img src="/interior-openplan.webp" alt="Premium leilighet i Bergen" loading="eager" className="w-full aspect-[16/10] sm:aspect-[16/9] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <p className="text-[9px] text-[#5b6370] leading-tight uppercase tracking-[0.04em]">Snittinntekt Bergen</p>
                    <p className="text-[15px] font-bold text-[#0a0a0a] mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>25 000 kr<span className="text-[10px] font-normal text-[#5b6370] ml-0.5">/mnd</span></p>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#f5edfc] flex items-center justify-center"><TrendingUp className="w-3 h-3 text-[#cf97fc]" strokeWidth={2.6} /></div>
                      <div>
                        <p className="text-[9px] text-[#5b6370] leading-tight uppercase tracking-[0.04em]">Avkastning</p>
                        <p className="text-[13px] font-bold text-[#0a0a0a] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>+40%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block rounded-[24px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
                <img src="/bergen-rooftops.webp" alt="Bergen fra høyden" loading="eager" className="w-full aspect-[3/4] object-cover" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <p className="text-[10.5px] sm:text-[11px] font-semibold text-[#7c3aed] uppercase tracking-[0.1em] mb-3 sm:mb-4">For eiendomseiere</p>
              <h1 className="text-[30px] sm:text-[40px] lg:text-[46px] font-bold tracking-[-0.03em] leading-[1.05] sm:leading-[1.08] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>La eiendommen jobbe for deg</h1>
              <p className="text-[15px] sm:text-[16px] text-[#666] leading-[1.65] sm:leading-[1.75] mt-4 sm:mt-5 max-w-[42ch]">DigiHome forvalter eiendommen din profesjonelt — du lener deg tilbake og nyter inntekten.</p>
              <div className="mt-6 sm:mt-8 space-y-2.5 sm:space-y-3">
                {[{ icon: TrendingUp, text: 'Opptil 40% høyere inntekt' }, { icon: Shield, text: 'Full forvaltning uten stress' }, { icon: Key, text: 'Ingen oppstartskostnader' }].map((item: any, i: number) => {
                  const Icon = item.icon;
                  return (<motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.08, duration: 0.3 }} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f5edfc] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#cf97fc]" /></div>
                    <span className="text-[14px] text-[#555]">{item.text}</span>
                  </motion.div>);
                })}
              </div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.3 }} className="mt-7 sm:mt-10">
                <Button onClick={goNext} data-testid="owner-next-button" className="w-full sm:w-auto rounded-full bg-[#0a0a0a] text-white hover:bg-black px-8 sm:px-10 text-[15px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.12)]" style={{ height: '52px' }}>
                  Kom i gang <ArrowRight className="w-4 h-4" />
                </Button>
                <p className="text-[12px] text-[#737373] mt-3 sm:mt-4">Gratis og uforpliktende</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {['Tar 2 minutter', 'Registerverifisert', 'Svar innen 24t'].map((tx) => (
                    <span key={tx} className="inline-flex items-center gap-1.5 text-[12px] text-[#737373]"><Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={3} /> {tx}</span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
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
      <div className="h-[56px] lg:h-[76px]" />
      <div className="flex-1 flex flex-col">
        <div className="max-w-[600px] w-full mx-auto px-6 pt-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={goBack} className="w-9 h-9 rounded-full border border-[#e8e5e0] hover:bg-[#f5f5f5] flex items-center justify-center transition-colors active:scale-95" data-testid="owner-back-button" aria-label="Tilbake">
              <ArrowLeft className="w-4 h-4 text-[#888]" />
            </button>
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
                        placeholder="F.eks. Nordnesveien 8, Bergen"
                        testIdPrefix="owner-address"
                        onChange={(v: any) => updateField('address', v)}
                        onSelect={(data: any) => {
                          const addr = data.address ? data.address.replace(/,\s*(Norway|Norge)$/i, '') : '';
                          if (addr) { updateField('address', addr); setRegistryQuery(addr); }
                          if (data.postalCode) updateField('postal_code', data.postalCode);
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
                </div>
              )}

              {/* STEG 2 — EIENDOMMEN (detaljer) */}
              {step === 2 && (
                <div data-testid="owner-step-property">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Om eiendommen</h2>
                  <p className="text-[15px] text-[#888] mb-8">Fortell oss om boligen du vil leie ut.</p>
                  <div className="space-y-6">
                    {/* Finn-snarvei: lim inn lenke → forhåndsvisning + auto-utfylling */}
                    <div className="rounded-2xl bg-gradient-to-br from-[#faf5ff] to-[#f4eefb] border border-[#efe6fb] p-5" data-testid="owner-finn-block">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-[15px] h-[15px] text-[#cf97fc]" />
                        <Label className="text-[13px] font-semibold text-[#333]">Har du allerede en Finn-annonse? <span className="text-[#5b6370] font-normal">(valgfritt)</span></Label>
                      </div>
                      <p className="text-[12.5px] text-[#888] mb-3 leading-relaxed">Lim inn lenken til salgs- eller leieannonsen, så fyller vi inn detaljene for deg.</p>
                      <FinnLookupField
                        value={finnUrl}
                        onChange={setFinnUrl}
                        testId="owner-finn"
                        onResult={(d: any) => {
                          setFormData((prev: any) => ({ ...prev, ...finnToFields(d) }));
                          setErrors((prev: any) => ({ ...prev, sqm: null, property_type: null, bedrooms: null }));
                        }}
                      />
                    </div>

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
                    <div className="pt-6 border-t border-[#f0f0f0]" data-testid="owner-extra-units-section">
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
                  </div>
                  <p className="text-[11px] text-[#5b6370] mt-6"><span className="text-[#7c3aed]">*</span> Påkrevde felt</p>
                </div>
              )}

              {/* STEG 3 — OM DEG (kontaktinformasjon) */}
              {step === 3 && (
                <div data-testid="owner-step-personal">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Fortell oss om deg</h2>
                  <p className="text-[15px] text-[#888] mb-8">Slik at vi kan ta kontakt med en personlig vurdering.</p>
                  <div className="space-y-5">
                    <TextInput label="Fullt navn" required error={errors.name} icon={User} value={formData.name} onChange={(v: any) => updateField('name', v)} placeholder="Ola Nordmann" autoComplete="name" autoFocus testId="owner-name-input" />
                    <TextInput label="E-post" required error={errors.email} icon={Mail} value={formData.email} type="email" onChange={(v: any) => updateField('email', v)} placeholder="ola@eksempel.no" autoComplete="email" testId="owner-email-input" />
                    <PhoneInput value={formData.phone} onChange={(v: any) => updateField('phone', v)} error={errors.phone} testId="owner-phone-input" />
                  </div>
                  <p className="text-[11px] text-[#5b6370] mt-6"><span className="text-[#7c3aed]">*</span> Påkrevde felt</p>
                </div>
              )}

              {/* STEG 4 — DINE MÅL */}
              {step === 4 && (
                <div data-testid="owner-step-goals">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Hva er viktigst for deg?</h2>
                  <p className="text-[15px] text-[#888] mb-8">Vi anbefaler den optimale strategien basert på dine preferanser.</p>
                  <div className="space-y-7">
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Foretrukket utleiemodell <span className="text-[#7c3aed]">*</span></Label>
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
                      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Når er eiendommen tilgjengelig? <span className="text-[#7c3aed]">*</span></Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" data-testid="owner-availability-input" className={`w-full h-[52px] px-4 text-left text-[15px] bg-white border rounded-2xl outline-none transition-all flex items-center gap-3 ${formData.availability ? 'border-[#e0e0e0] text-[#333]' : 'border-[#e0e0e0] text-[#737373]'} hover:border-[#cf97fc] focus:border-[#cf97fc] focus:shadow-[0_0_0_3px_rgba(207,151,252,0.12)]`}>
                            <CalendarIcon className="w-4 h-4 text-[#5b6370] shrink-0" />
                            {formData.availability ? format(new Date(formData.availability + 'T12:00:00'), 'd. MMMM yyyy', { locale: nb }) : 'Velg dato...'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-0" align="start">
                          <Calendar mode="single" locale={nb} selected={formData.availability ? new Date(formData.availability + 'T12:00:00') : undefined}
                            onSelect={(d: any) => { if (d) { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); updateField('availability', `${y}-${m}-${day}`); } }}
                            disabled={(date: any) => date < new Date()} className="rounded-2xl" />
                        </PopoverContent>
                      </Popover>
                      {errors.availability && <p className="text-[12px] text-red-500 mt-1.5">{errors.availability}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333]">Kommentarer <span className="text-[#737373] font-normal">(valgfritt)</span></Label>
                      <textarea value={formData.notes} onChange={(e: any) => updateField('notes', e.target.value)} placeholder="Er det noe spesielt vi bør vite?" rows={3} className="w-full mt-2 px-4 py-3.5 text-[15px] rounded-2xl border border-[#e0e0e0] bg-white focus:outline-none focus:ring-2 focus:ring-[#cf97fc] resize-none placeholder:text-[#737373]" data-testid="owner-notes-textarea" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEG 5 — BEKREFT */}
              {step === 5 && (
                <div data-testid="owner-step-confirm">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Ser dette riktig ut?</h2>
                  <p className="text-[15px] text-[#888] mb-8">Sjekk at alt stemmer før du sender.</p>
                  <div className="space-y-4">
                    <SummaryCard title="Om deg" onEdit={() => { setDir(-1); setStep(3); }} testId="owner-edit-personal">
                      <p className="text-[15px] text-[#333] font-medium">{formData.name}</p>
                      <p className="text-[14px] text-[#666]">{formData.email}</p>
                      <p className="text-[14px] text-[#666]">+47 {formData.phone}</p>
                    </SummaryCard>
                    <SummaryCard title={extraUnits.filter((u: any) => (u.address || '').trim()).length > 0 ? `Eiendommer (${1 + extraUnits.filter((u: any) => (u.address || '').trim()).length})` : 'Eiendommen'} onEdit={() => { setDir(-1); setStep(1); }} testId="owner-edit-property">
                      <p className="text-[14px] text-[#333] font-medium">{formData.address || '—'}</p>
                      <div className="flex gap-4 mt-1 text-[13px] text-[#888]">
                        {formData.postal_code && <span>{formData.postal_code}</span>}
                        {formData.sqm && <span>{formData.sqm} m²</span>}
                        {formData.property_type && <span className="capitalize">{formData.property_type}</span>}
                        {formData.bedrooms && <span>{formData.bedrooms} sov.</span>}
                      </div>
                      {(formData.registry_owner_name || formData.seksjonsnr || formData.andelsnr) && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ee] text-[#16a34a] px-2 py-0.5 font-semibold"><CheckCircle2 className="w-3 h-3" /> Verifisert i registeret</span>
                          {formData.seksjonsnr && <span className="text-[#888]">Seksjon {formData.seksjonsnr}</span>}
                          {formData.andelsnr && <span className="text-[#888]">Andel {formData.andelsnr}</span>}
                          {formData.registry_owner_name && <span className="text-[#888]">· {formData.registry_owner_name}</span>}
                        </div>
                      )}
                      {extraUnits.filter((u: any) => (u.address || '').trim()).map((u: any, i: number) => (
                        <div key={i} className="mt-3 pt-3 border-t border-[#f3f3f3]" data-testid={`owner-summary-extra-${i}`}>
                          <p className="text-[14px] text-[#333] font-medium">{u.address}</p>
                          <div className="flex gap-4 mt-1 text-[13px] text-[#888]">{u.postal_code && <span>{u.postal_code}</span>}{u.sqm && <span>{u.sqm} m²</span>}{u.property_type && <span className="capitalize">{u.property_type}</span>}{u.bedrooms && <span>{u.bedrooms} sov.</span>}</div>
                        </div>
                      ))}
                    </SummaryCard>
                    <SummaryCard title="Dine mål" onEdit={() => { setDir(-1); setStep(4); }} testId="owner-edit-goals">
                      {formData.rental_model && <p className="text-[14px] text-[#333]">Modell: <span className="font-medium capitalize">{formData.rental_model}</span></p>}
                      {formData.availability && <p className="text-[14px] text-[#666]">Tilgjengelig: {new Date(formData.availability + 'T12:00:00').toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                      {formData.notes && <p className="text-[13px] text-[#5b6370] mt-1">{formData.notes}</p>}
                      {!formData.rental_model && !formData.availability && !formData.notes && <p className="text-[13px] text-[#737373]">Ingen preferanser valgt</p>}
                    </SummaryCard>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sticky z-30 mt-auto bg-white/90 backdrop-blur-xl border-t border-[#f0f0f0]" style={{ bottom: 'var(--dh-consent-h, 0px)' }}>
          <div className="max-w-[600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <button onClick={goBack} className="text-[14px] font-semibold text-[#666] hover:text-[#333] underline underline-offset-4 transition-colors" data-testid="owner-back-link">Tilbake</button>
            {nextStepIdx != null ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-[12px] text-[#aaa]">Neste: <span className="text-[#666] font-medium">{nextStepTitle}</span></span>
                <Button onClick={goNext} data-testid="owner-next-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]">Neste <ArrowRight className="w-4 h-4" /></Button>
              </div>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} data-testid="owner-submit-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Send henvendelse</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
