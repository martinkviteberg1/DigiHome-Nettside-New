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
  TextInput, PhoneInput, BudgetInput,
  PillSelector, NumberSelector, IconCardSelector, ToggleChips, SummaryCard,
} from './FormFields';
import WizardShowcase from './WizardShowcase';
import {
  User, Mail, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Check, MapPin, Sliders,
  Home, Building2, Warehouse, LayoutGrid, BedDouble, Heart, Shield, Calendar as CalendarIcon,
  Clock3, Sparkles, ShieldCheck,
} from 'lucide-react';
import { track, getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { getVariant, getAssignments } from '@/lib/ab';

const BACKEND_URL = '';

const STEPS = [
  { id: 'welcome', title: 'Velkommen' },
  { id: 'personal', title: 'Om deg' },
  { id: 'preferences', title: 'Boligønsker' },
  { id: 'details', title: 'Detaljer' },
  { id: 'confirm', title: 'Bekreft' },
];

const areaOptions = [
  'Sentrum', 'Nordnes', 'Sandviken', 'Møhlenpris', 'Nygårdshøyden',
  'Kronstad', 'Laksevåg', 'Fyllingsdalen', 'Åsane', 'Fana', 'Annet',
];

const boligTypes = [
  { value: 'leilighet', label: 'Leilighet', icon: Building2 },
  { value: 'hus', label: 'Hus', icon: Home },
  { value: 'rekkehus', label: 'Rekkehus', icon: LayoutGrid },
  { value: 'hybel', label: 'Hybel', icon: BedDouble },
  { value: 'annet', label: 'Annet', icon: Warehouse },
];

// Fase-innhold for den mørke showcase-panelen (leietaker-reisen, premium 2026).
// Ingen kundesitater her — sitatene i lib/site er fra utleiere, ikke leietakere.
const TENANT_PHASES = [
  {
    kicker: 'Steg 1 — Om deg',
    title: 'Ditt neste hjem i Bergen',
    sub: 'Fortell oss hvem du er, så matcher vi deg med kvalitetsboliger — ofte før de annonseres offentlig.',
    image: '/bergen-street.webp',
    imageAlt: 'Gate i Bergen med utleieboliger',
    chips: [
      { icon: Clock3, value: '48 t', label: 'svar fra lokal rådgiver' },
      { icon: Heart, value: '0 kr', label: 'helt gratis for leietakere' },
    ],
  },
  {
    kicker: 'Steg 2 — Boligønsker',
    title: 'Boliger som faktisk passer deg',
    sub: 'Velg områder og boligtype — vi varsler deg når noe dukker opp som matcher profilen din.',
    image: '/interior-openplan.webp',
    imageAlt: 'Lys og åpen stue i utleiebolig',
    chips: [
      { icon: Home, value: '150+', label: 'boliger i porteføljen' },
      { icon: MapPin, value: '10+', label: 'områder i Bergen' },
    ],
  },
  {
    kicker: 'Steg 3 — Detaljene',
    title: 'Jo mer vi vet, desto bedre match',
    sub: 'Budsjett, innflytting og fasiliteter — så treffer vi presist på første forsøk.',
    image: '/interior-kitchen.webp',
    imageAlt: 'Moderne kjøkken i utleiebolig',
    chips: [
      { icon: Sparkles, value: 'BankID', label: 'digital leiekontrakt' },
      { icon: ShieldCheck, value: '3 mnd', label: 'depositum på egen låst konto' },
    ],
  },
  {
    kicker: 'Steg 4 — Bekreft',
    title: 'Nesten i mål',
    sub: 'Sjekk at alt stemmer — så starter matchingen med en gang.',
    image: '/interior-bedroom2.webp',
    imageAlt: 'Soverom i utleiebolig',
    chips: [
      { icon: Clock3, value: '< 48 t', label: 'første oppfølging' },
      { icon: Heart, value: '0 kr', label: 'gratis — alltid' },
    ],
  },
];

const stepVariants = {
  enter: (dir: any) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: any) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

export default function BliLeietakerPage() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [formData, setFormData] = useState<any>({
    name: '', email: '', phone: '',
    preferred_areas: [], property_type: '', bedrooms: '',
    budget_min: '', budget_max: '', move_in_date: '',
    housing_pref: '',
    pets: false, parking: false, balcony: false, elevator: false, furnished: false, washing: false,
    notes: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // A/B: CTA-tekst på siste steg (onboard_cta). Tildelingen festes på alle analytics-events.
  const [ctaVariant, setCtaVariant] = useState<string>('A');

  const updateField = useCallback((field: any, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev: any) => ({ ...prev, [field]: null }));
  }, [errors]);

  // A/B-tildeling FØR form_start, slik at varianten følger med på første event.
  useEffect(() => { try { setCtaVariant(getVariant('onboard_cta', ['A', 'B'])); } catch (e) {} }, []);
  // Analyse: skjema startet + steg-sporing (drop-off). trackLeadStart → Meta InitiateCheckout.
  useEffect(() => { track('form_start', { form: 'leietaker' }); try { trackLeadStart('leietaker'); } catch (e) {} }, []);
  useEffect(() => {
    track('form_step', { form: 'leietaker', step: step + 1, label: STEPS[step]?.title || `Steg ${step}` });
  }, [step]);

  const toggleArea = useCallback((area: any) => {
    setFormData((prev: any) => ({
      ...prev,
      preferred_areas: prev.preferred_areas.includes(area)
        ? prev.preferred_areas.filter((a: any) => a !== area)
        : [...prev.preferred_areas, area],
    }));
  }, []);

  const goNext = () => {
    const newErrors: Record<string, any> = {};
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Vennligst oppgi navnet ditt';
      if (!formData.email.trim()) newErrors.email = 'Vennligst oppgi e-postadressen din';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Ugyldig e-postadresse';
      if (!formData.phone.trim() || formData.phone.replace(/\s/g, '').length < 8) newErrors.phone = 'Vennligst oppgi et gyldig telefonnummer';
    }
    if (step === 2) {
      if (!formData.property_type) newErrors.property_type = 'Velg boligtype';
      if (formData.preferred_areas.length === 0) newErrors.preferred_areas = 'Velg minst ett område';
      if (!formData.housing_pref) newErrors.housing_pref = 'Velg boform';
    }
    if (step === 3) {
      if (!formData.bedrooms) newErrors.bedrooms = 'Velg antall soverom';
      if (!formData.budget_min && !formData.budget_max) newErrors.budget = 'Oppgi budsjett';
      if (!formData.move_in_date) newErrors.move_in_date = 'Velg ønsket innflyttingsdato';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setDir(1);
    setStep((prev: any) => Math.min(prev + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => { setDir(-1); setStep((prev: any) => Math.max(prev - 1, 0)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name, email: formData.email, phone: '+47 ' + formData.phone,
        preferred_area: formData.preferred_areas.join(', '),
        budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
        bedrooms: parseInt(formData.bedrooms) || 1,
        move_in_date: formData.move_in_date,
        notes: [
          formData.property_type ? `Boligtype: ${formData.property_type}` : '',
          formData.housing_pref ? `Boform: ${formData.housing_pref}` : '',
          formData.pets ? 'Har kjæledyr' : '', formData.parking ? 'Ønsker parkering' : '',
          formData.balcony ? 'Ønsker balkong' : '', formData.elevator ? 'Ønsker heis' : '',
          formData.furnished ? 'Ønsker møblert' : '', formData.washing ? 'Ønsker vaskemaskin' : '',
          formData.notes,
        ].filter(Boolean).join('. '),
        attribution: { ...getLeadAttribution(), ...getClickIds() },
      };
      const res = await fetch(`${BACKEND_URL}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.ok)) {
        setSubmitted(true);
        track('lead_submit', { form: 'leietaker', leadType: 'leietaker' });
        try { trackLead({ formId: 'leietaker', source: 'bli-leietaker', leadId: data?.tenant?.id, email: formData.email, phone: '+47 ' + formData.phone }); } catch (e) {}
        toast.success('Registreringen er mottatt!');
      } else {
        throw new Error('tenant failed');
      }
    } catch {
      try { track('form_error', { form: 'leietaker', kind: 'submit' }); } catch (e) {}
      toast.error('Noe gikk galt. Prøv igjen.');
    }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-16 bg-[#fdfcfb] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[680px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(210,152,255,0.16) 0%, rgba(210,152,255,0) 70%)' }} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative text-center max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }}
            className="w-20 h-20 rounded-[22px] bg-[#0a0a0a] flex items-center justify-center mx-auto mb-7 shadow-[0_14px_44px_-12px_rgba(0,0,0,0.45)]">
            <CheckCircle2 className="w-10 h-10 text-[#d298ff]" />
          </motion.div>
          <h1 className="text-[33px] sm:text-[38px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Velkommen til DigiHome{formData.name ? `, ${formData.name.split(' ')[0]}` : ''}!</h1>
          <p className="text-[16px] text-[#666] leading-relaxed max-w-[42ch] mx-auto">Vi har mottatt registreringen din og matcher deg nå med boliger som passer ønskene dine.</p>

          <div className="mt-8 text-left bg-white rounded-[22px] p-6 shadow-[0_8px_40px_-24px_rgba(0,0,0,0.35)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#78726a] mb-4">Hva skjer nå</p>
            <div>
              {[
                { t: 'Vi matcher profilen din', s: 'Mot ledige kvalitetsboliger i ønsket område', done: true },
                { t: 'Du hører fra oss innen 48 timer', s: 'Personlig oppfølging fra en rådgiver' },
                { t: 'Du får aktuelle boliger tilsendt', s: 'Skreddersydd etter budsjett og ønsker' },
              ].map((it: any, i: number, arr: any[]) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.12, duration: 0.35 }} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${it.done ? 'bg-[#d298ff] text-white' : 'bg-[#f1ecf8] text-[#b39ddb]'}`}>{it.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <span className="text-[12px] font-bold">{i + 1}</span>}</div>
                    {i < arr.length - 1 && <div className="w-[2px] flex-1 min-h-[24px] bg-[#efe9f7] my-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-[14.5px] font-semibold text-[#0a0a0a] leading-tight">{it.t}</p>
                    <p className="text-[13px] text-[#6b6b6b] mt-0.5">{it.s}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <Button onClick={() => window.location.href = '/'} data-testid="tenant-success-home-button"
            className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform mt-7">
            Tilbake til forsiden <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#fdfcfb]" data-testid="tenant-page">
        <div className="h-[56px] lg:h-[76px]" />
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10 sm:py-16" data-testid="tenant-step-welcome">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-200px)]">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              {/* Mobil: bildekort med stat-overlegg */}
              <div className="lg:hidden relative rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <img src="/parkveien-bergen.webp" alt="Bolig i Bergen" loading="eager" className="w-full aspect-[16/10] sm:aspect-[16/9] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <p className="text-[9px] text-[#5b6370] leading-tight uppercase tracking-[0.04em]">Ledige boliger</p>
                    <p className="text-[15px] font-bold text-[#0a0a0a] mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>Nye hver uke</p>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#f5edfc] flex items-center justify-center"><Heart className="w-3 h-3 text-[#d298ff]" strokeWidth={2.6} /></div>
                      <div>
                        <p className="text-[9px] text-[#5b6370] leading-tight uppercase tracking-[0.04em]">Svar</p>
                        <p className="text-[13px] font-bold text-[#0a0a0a] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>48 timer</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop: stort bilde */}
              <div className="hidden lg:block rounded-[24px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
                <img src="/parkveien-bergen.webp" alt="Bolig i Bergen" loading="eager" className="w-full aspect-[3/4] object-cover" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <p className="text-[10.5px] sm:text-[11px] font-semibold text-[#7e22ce] uppercase tracking-[0.1em] mb-3 sm:mb-4">For leietakere</p>
              <h1 className="text-[30px] sm:text-[40px] lg:text-[46px] font-bold tracking-[-0.03em] leading-[1.05] sm:leading-[1.08] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Finn ditt neste hjem i Bergen</h1>
              <p className="text-[15px] sm:text-[16px] text-[#666] leading-[1.65] sm:leading-[1.75] mt-4 sm:mt-5 max-w-[40ch]">Vi matcher deg med kvalitetsboliger som passer dine ønsker — helt gratis. Det tar kun 2 minutter.</p>
              <div className="mt-6 sm:mt-8 space-y-2.5 sm:space-y-3">
                {[{ icon: Home, text: 'Kvalitetsboliger med høy standard' }, { icon: Heart, text: 'Personlig oppfølging fra dag én' }, { icon: Shield, text: 'Trygge og transparente leieforhold' }].map((item: any, i: number) => {
                  const Icon = item.icon;
                  return (<motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.08, duration: 0.3 }} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f5edfc] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#d298ff]" /></div>
                    <span className="text-[14px] text-[#555]">{item.text}</span>
                  </motion.div>);
                })}
              </div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.3 }} className="mt-7 sm:mt-10">
                <Button onClick={goNext} data-testid="tenant-next-button" className="w-full sm:w-auto rounded-full bg-[#0a0a0a] text-white hover:bg-black px-8 sm:px-10 text-[15px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.12)]" style={{ height: '52px' }}>Kom i gang <ArrowRight className="w-4 h-4" /></Button>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {['Helt gratis', 'Tar 2 minutter', 'Svar innen 48t'].map((tx) => (
                    <span key={tx} className="inline-flex items-center gap-1.5 text-[12px] text-[#737373]"><Check className="w-3.5 h-3.5 text-[#d298ff]" strokeWidth={3} /> {tx}</span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const flowSteps = [1, 2, 3, 4];
  const curPos = Math.max(0, flowSteps.indexOf(step));

  return (
    <div className="min-h-screen bg-[#ebebeb] lg:grid lg:grid-cols-[1.1fr_0.9fr]" data-testid="tenant-page" onKeyDown={(e: any) => { if (e.key === 'Enter' && !e.shiftKey && step < STEPS.length - 1 && step > 0) { e.preventDefault(); goNext(); } }}>
      <WizardShowcase phase={curPos} phases={TENANT_PHASES} embedded />
      <div className="flex flex-col min-h-screen min-w-0 relative">
      <div className="h-[56px] lg:h-[76px]" />
      <div className="flex-1 flex flex-col">
        <div className="max-w-[560px] w-full mx-auto px-6 pt-7 relative">
          <div className="flex items-center justify-between mb-5">
            <button onClick={goBack} className="w-9 h-9 rounded-full border border-[#e8e5e0] hover:bg-[#f5f5f5] flex items-center justify-center transition-colors active:scale-95" data-testid="tenant-back-button" aria-label="Tilbake">
              <ArrowLeft className="w-4 h-4 text-[#6b6b6b]" />
            </button>
            <div className="text-right">
              <p className="text-[10.5px] font-semibold text-[#7e22ce] uppercase tracking-[0.1em] leading-none">Steg {curPos + 1} av {flowSteps.length}</p>
              <p className="text-[13.5px] text-[#0a0a0a] font-semibold mt-1 leading-none">{STEPS[step].title}</p>
            </div>
          </div>
          {/* Premium stepper — sirkler + animerte koblinger */}
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
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors duration-300 ${done ? 'bg-[#d298ff] border-[#d298ff] text-white' : active ? 'bg-white border-[#d298ff] text-[#7e22ce] shadow-[0_0_0_4px_rgba(210,152,255,0.18)]' : 'bg-white border-[#e6e3df] text-[#c4c0bb]'}`}
                  >
                    {done ? <Check className="w-4 h-4" strokeWidth={3} /> : pos + 1}
                  </motion.div>
                  {pos < flowSteps.length - 1 && (
                    <div className="flex-1 h-[2px] mx-2 rounded-full bg-[#ece9e4] overflow-hidden">
                      <motion.div className="h-full bg-[#d298ff] rounded-full" initial={false} animate={{ width: curPos > pos ? '100%' : '0%' }} transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-[560px] w-full mx-auto px-6 pb-24">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}>

              {step === 1 && (
                <div data-testid="tenant-step-personal">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7e22ce] uppercase tracking-[0.1em] mb-3"><User className="w-3.5 h-3.5" /> Om deg</div>
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Fortell oss litt om deg</h2>
                  <p className="text-[15px] text-[#6b6b6b] mb-8">Slik at vi kan kontakte deg med aktuelle boliger.</p>
                  <div className="space-y-5">
                    <TextInput label="Fullt navn" required error={errors.name} icon={User} value={formData.name} onChange={(v: any) => updateField('name', v)} placeholder="Ola Nordmann" autoFocus autoComplete="name" testId="tenant-name-input" />
                    <TextInput label="E-post" required error={errors.email} icon={Mail} value={formData.email} type="email" onChange={(v: any) => updateField('email', v)} placeholder="ola@eksempel.no" autoComplete="email" testId="tenant-email-input" />
                    <PhoneInput value={formData.phone} onChange={(v: any) => updateField('phone', v)} error={errors.phone} testId="tenant-phone-input" />
                  </div>
                  <p className="text-[11px] text-[#5b6370] mt-6"><span className="text-[#7e22ce]">*</span> Påkrevde felt</p>
                </div>
              )}

              {step === 2 && (
                <div data-testid="tenant-step-preferences">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7e22ce] uppercase tracking-[0.1em] mb-3"><Home className="w-3.5 h-3.5" /> Boligønsker</div>
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Hva slags bolig ser du etter?</h2>
                  <p className="text-[15px] text-[#6b6b6b] mb-8">Velg det som passer deg best.</p>
                  <div className="space-y-8">
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Boligtype <span className="text-[#7e22ce]">*</span></Label>
                      <IconCardSelector options={boligTypes} selected={formData.property_type} onChange={(v: any) => updateField('property_type', v)} testIdPrefix="tenant-type" />
                      {errors.property_type && <p className="text-[12px] text-red-500 mt-1.5">{errors.property_type}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Boform <span className="text-[#7e22ce]">*</span></Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ value: 'hele', label: 'Hele for meg selv' }, { value: 'bofellesskap', label: 'Bofellesskap' }, { value: 'fleksibel', label: 'Fleksibel' }].map((opt: any) => (
                          <button key={opt.value} type="button" onClick={() => updateField('housing_pref', formData.housing_pref === opt.value ? '' : opt.value)} className={`py-3 px-3 rounded-2xl border-2 text-[13px] font-medium text-center transition-all ${formData.housing_pref === opt.value ? 'border-[#d298ff] bg-[#faf5ff] text-[#0a0a0a]' : 'border-[#eee] bg-white text-[#666] hover:border-[#ddd]'}`}>{opt.label}</button>
                        ))}
                      </div>
                      {errors.housing_pref && <p className="text-[12px] text-red-500 mt-1.5">{errors.housing_pref}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Ønsket område i Bergen <span className="text-[#7e22ce]">*</span></Label>
                      <p className="text-[12px] text-[#78726a] mb-3">Velg ett eller flere områder</p>
                      <PillSelector options={areaOptions} selected={formData.preferred_areas} onToggle={toggleArea} multi testIdPrefix="tenant-area" />
                      {errors.preferred_areas && <p className="text-[12px] text-red-500 mt-1.5">{errors.preferred_areas}</p>}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#5b6370] mt-6"><span className="text-[#7e22ce]">*</span> Påkrevde felt</p>
                </div>
              )}

              {step === 3 && (
                <div data-testid="tenant-step-details">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7e22ce] uppercase tracking-[0.1em] mb-3"><Sliders className="w-3.5 h-3.5" /> Detaljer</div>
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Noen siste detaljer</h2>
                  <p className="text-[15px] text-[#6b6b6b] mb-8">Jo mer vi vet, desto bedre match finner vi.</p>
                  <div className="space-y-7">
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Antall soverom <span className="text-[#7e22ce]">*</span></Label>
                      <NumberSelector options={['1', '2', '3', '4', '5+']} selected={formData.bedrooms} onChange={(v: any) => updateField('bedrooms', v)} testIdPrefix="tenant-bedrooms" />
                      {errors.bedrooms && <p className="text-[12px] text-red-500 mt-1.5">{errors.bedrooms}</p>}
                    </div>
                    <div>
                      <BudgetInput minValue={formData.budget_min} maxValue={formData.budget_max} onMinChange={(v: any) => updateField('budget_min', v)} onMaxChange={(v: any) => updateField('budget_max', v)} minTestId="tenant-budget-min-input" maxTestId="tenant-budget-max-input" />
                      {errors.budget && <p className="text-[12px] text-red-500 mt-1.5">{errors.budget}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Ønsket innflytting <span className="text-[#7e22ce]">*</span></Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" data-testid="tenant-move-date-input" className={`w-full h-[52px] px-4 text-left text-[15px] bg-white border rounded-2xl outline-none transition-all flex items-center gap-3 ${formData.move_in_date ? 'border-[#e0e0e0] text-[#333]' : 'border-[#e0e0e0] text-[#737373]'} hover:border-[#d298ff] focus:border-[#d298ff] focus:shadow-[0_0_0_3px_rgba(210,152,255,0.12)]`}>
                            <CalendarIcon className="w-4 h-4 text-[#716b63] shrink-0" />
                            {formData.move_in_date ? format(new Date(formData.move_in_date), 'd. MMMM yyyy', { locale: nb }) : 'Velg dato...'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-0" align="start">
                          <Calendar mode="single" locale={nb} selected={formData.move_in_date ? new Date(formData.move_in_date) : undefined} onSelect={(d: any) => { if (d) updateField('move_in_date', d.toISOString().split('T')[0]); }} disabled={(date: any) => date < new Date()} className="rounded-2xl" />
                        </PopoverContent>
                      </Popover>
                      {errors.move_in_date && <p className="text-[12px] text-red-500 mt-1.5">{errors.move_in_date}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Fasiliteter</Label>
                      <ToggleChips options={[{ key: 'pets', label: 'Kjæledyr', emoji: '🐾' }, { key: 'parking', label: 'Parkering', emoji: '🚗' }, { key: 'balcony', label: 'Balkong', emoji: '🌿' }, { key: 'elevator', label: 'Heis', emoji: '🛗' }, { key: 'furnished', label: 'Møblert', emoji: '🛋️' }, { key: 'washing', label: 'Vaskemaskin', emoji: '🧺' }]} values={formData} onChange={(k: any, v: any) => updateField(k, v)} />
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333]">Noe annet vi bør vite? <span className="text-[#737373] font-normal">(valgfritt)</span></Label>
                      <textarea value={formData.notes} onChange={(e: any) => updateField('notes', e.target.value)} placeholder="Spesielle ønsker, allergier, tilgjengelighet..." rows={3} className="w-full mt-2 px-4 py-3.5 text-[15px] rounded-2xl border border-[#e0e0e0] bg-white focus:outline-none focus:ring-2 focus:ring-[#d298ff] resize-none placeholder:text-[#737373]" data-testid="tenant-notes-textarea" />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#5b6370] mt-6"><span className="text-[#7e22ce]">*</span> Påkrevde felt</p>
                </div>
              )}

              {step === 4 && (
                <div data-testid="tenant-step-confirm">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#7e22ce] uppercase tracking-[0.1em] mb-3"><CheckCircle2 className="w-3.5 h-3.5" /> Oppsummering</div>
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Ser dette riktig ut?</h2>
                  <p className="text-[15px] text-[#6b6b6b] mb-8">Sjekk at alt stemmer før du sender.</p>
                  <div className="space-y-4">
                    <SummaryCard title="Om deg" onEdit={() => { setDir(-1); setStep(1); }} testId="tenant-edit-personal">
                      <p className="text-[15px] text-[#333] font-medium">{formData.name}</p>
                      <p className="text-[14px] text-[#666]">{formData.email}</p>
                      <p className="text-[14px] text-[#666]">+47 {formData.phone}</p>
                    </SummaryCard>
                    <SummaryCard title="Boligønsker" onEdit={() => { setDir(-1); setStep(2); }} testId="tenant-edit-preferences">
                      {formData.property_type && <p className="text-[14px] text-[#333]">Type: <span className="font-medium capitalize">{formData.property_type}</span></p>}
                      {formData.housing_pref && <p className="text-[14px] text-[#333]">Boform: <span className="font-medium">{formData.housing_pref === 'hele' ? 'Hele for meg selv' : formData.housing_pref === 'bofellesskap' ? 'Bofellesskap' : 'Fleksibel'}</span></p>}
                      {formData.preferred_areas.length > 0 && (<div className="flex flex-wrap gap-1.5 mt-1">{formData.preferred_areas.map((a: any) => (<span key={a} className="bg-[#f5edfc] text-[#8b5fc0] text-[11px] font-semibold px-2.5 py-1 rounded-lg">{a}</span>))}</div>)}
                    </SummaryCard>
                    <SummaryCard title="Detaljer" onEdit={() => { setDir(-1); setStep(3); }} testId="tenant-edit-details">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div><p className="text-[11px] text-[#78726a]">Soverom</p><p className="text-[14px] text-[#333] font-medium">{formData.bedrooms}</p></div>
                        <div><p className="text-[11px] text-[#78726a]">Budsjett</p><p className="text-[14px] text-[#333] font-medium">{formData.budget_min || formData.budget_max ? `${parseInt(String(formData.budget_min || 0)).toLocaleString('nb-NO')} – ${parseInt(String(formData.budget_max || 0)).toLocaleString('nb-NO')} kr` : 'Ikke oppgitt'}</p></div>
                        {formData.move_in_date && <div><p className="text-[11px] text-[#78726a]">Innflytting</p><p className="text-[14px] text-[#333] font-medium">{new Date(formData.move_in_date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
                        {(formData.pets || formData.parking || formData.balcony || formData.elevator || formData.furnished || formData.washing) && <div className="col-span-2"><p className="text-[11px] text-[#78726a]">Fasiliteter</p><p className="text-[14px] text-[#333] font-medium">{[formData.pets && 'Kjæledyr', formData.parking && 'Parkering', formData.balcony && 'Balkong', formData.elevator && 'Heis', formData.furnished && 'Møblert', formData.washing && 'Vaskemaskin'].filter(Boolean).join(', ')}</p></div>}
                      </div>
                      {formData.notes && <div className="mt-3 pt-3 border-t border-[#f0f0f0]"><p className="text-[11px] text-[#78726a] mb-1">Kommentar</p><p className="text-[13px] text-[#666]">{formData.notes}</p></div>}
                    </SummaryCard>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 z-30 mt-auto bg-white/90 backdrop-blur-xl border-t border-[#f0f0f0]">
          <div className="max-w-[560px] mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={goBack} className="text-[14px] font-semibold text-[#666] hover:text-[#333] underline underline-offset-4 transition-colors" data-testid="tenant-back-link">Tilbake</button>
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext} data-testid="tenant-next-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]">Neste <ArrowRight className="w-4 h-4" /></Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} data-testid="tenant-submit-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {ctaVariant === 'B' ? 'Fullfør – helt gratis' : 'Send registrering'}</Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
