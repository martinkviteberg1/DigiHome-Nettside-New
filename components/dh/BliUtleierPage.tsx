'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
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
import { AddressAutocomplete } from './AddressAutocomplete';
import {
  User, Mail, ArrowRight, ArrowLeft, CheckCircle2, Loader2,
  Home, Building2, Warehouse, LayoutGrid, BedDouble, TrendingUp, Shield, Key, Zap, Calendar as CalendarIcon,
  X, Plus,
} from 'lucide-react';

const BACKEND_URL = '';

const STEPS = [
  { id: 'welcome', title: 'Velkommen' },
  { id: 'personal', title: 'Om deg' },
  { id: 'property', title: 'Eiendommen' },
  { id: 'goals', title: 'Dine mål' },
  { id: 'confirm', title: 'Bekreft' },
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
  });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Forhåndsutfyll adresse fra ?address= (fra hero-søket)
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('address');
      if (p) {
        setFormData((prev: any) => ({ ...prev, address: p }));
        setStep(1);
      }
    } catch (e) { /* ignore */ }
  }, []);

  const updateField = useCallback((field: any, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev: any) => ({ ...prev, [field]: null }));
  }, [errors]);

  const [extraUnits, setExtraUnits] = useState<any[]>([]);
  const addExtra = () => setExtraUnits((prev) => [...prev, { address: '', postal_code: '', property_type: 'leilighet', sqm: '', bedrooms: '' }]);
  const updateExtra = (i: number, k: string, v: any) => setExtraUnits((prev) => prev.map((u, idx) => (idx === i ? { ...u, [k]: v } : u)));
  const removeExtra = (i: number) => setExtraUnits((prev) => prev.filter((_, idx) => idx !== i));

  const goNext = () => {
    const newErrors: Record<string, any> = {};
    if (step === 1) {
      if (!formData.address.trim()) newErrors.address = 'Vennligst oppgi adressen til eiendommen';
      if (!formData.name.trim()) newErrors.name = 'Vennligst oppgi navnet ditt';
      if (!formData.email.trim()) newErrors.email = 'Vennligst oppgi e-postadressen din';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Ugyldig e-postadresse';
      if (!formData.phone.trim() || formData.phone.replace(/\s/g, '').length < 8) newErrors.phone = 'Vennligst oppgi et gyldig telefonnummer (8 siffer)';
    }
    if (step === 2) {
      if (!formData.sqm.trim()) newErrors.sqm = 'Oppgi størrelse';
      if (!formData.property_type) newErrors.property_type = 'Velg boligtype';
      if (!formData.bedrooms) newErrors.bedrooms = 'Velg antall soverom';
    }
    if (step === 3) {
      if (!formData.rental_model) newErrors.rental_model = 'Velg utleiemodell';
      if (!formData.availability) newErrors.availability = 'Velg tilgjengelighetsdato';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setDir(1);
    setStep((prev: any) => Math.min(prev + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => { setDir(-1); setStep((prev: any) => Math.max(prev - 1, 0)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const validExtras = extraUnits.filter((u) => (u.address || '').trim());
      const mkUnit = (address: string, postal_code: string, property_type: string, sqm: any, bedrooms: any) => ({
        address: (address || '').trim(),
        postal_code: (postal_code || '').trim(),
        property_type: property_type || 'leilighet',
        sqm: sqm ? parseInt(sqm) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        rental_model: formData.rental_model || '',
      });
      const units = [
        mkUnit(formData.address, formData.postal_code, formData.property_type, formData.sqm, formData.bedrooms),
        ...validExtras.map((u) => mkUnit(u.address, u.postal_code, u.property_type, u.sqm, u.bedrooms)),
      ];
      const payload = {
        address: formData.address, postal_code: formData.postal_code,
        sqm: formData.sqm ? parseInt(formData.sqm) : 60,
        bedrooms: parseInt(formData.bedrooms) || 2, property_type: formData.property_type || 'leilighet',
        name: formData.name, email: formData.email, phone: '+47 ' + formData.phone,
        availability: formData.availability,
        lead_type: 'huseier',
        units,
        num_properties: units.length,
        notes: [formData.rental_model ? `Ønsket modell: ${formData.rental_model}` : '', formData.notes].filter(Boolean).join('. '),
      };
      const res = await axios.post(`${BACKEND_URL}/api/leads`, payload);
      if (res.data.success || res.data.ok) { setSubmitted(true); toast.success('Takk! Vi tar kontakt snart.'); }
    } catch { toast.error('Noe gikk galt. Prøv igjen.'); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-[#fdfcfb]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-[#f5edfc] flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-[#cf97fc]" />
          </motion.div>
          <h1 className="text-[36px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Tusen takk!</h1>
          <p className="text-[16px] text-[#666] mb-3 leading-relaxed">Vi har mottatt henvendelsen din og tar kontakt innen 24 timer for en personlig gjennomgang.</p>
          <Button onClick={() => window.location.href = '/'} data-testid="owner-success-home-button"
            className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform mt-6">
            Tilbake til forsiden <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#fdfcfb]" data-testid="owner-page">
        <div className="h-[56px] lg:h-[76px]" />
        <div className="max-w-[1100px] mx-auto px-5 sm:px-10 py-6 sm:py-12 lg:py-16" data-testid="owner-step-welcome">
          <div className="grid lg:grid-cols-2 gap-7 sm:gap-10 lg:gap-16 items-center lg:min-h-[calc(100vh-200px)]">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <div className="lg:hidden relative rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <img src="/interior-openplan.webp" alt="Premium leilighet i Bergen" loading="eager" className="w-full aspect-[16/10] sm:aspect-[16/9] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <p className="text-[9px] text-[#999] leading-tight uppercase tracking-[0.04em]">Snittinntekt Bergen</p>
                    <p className="text-[15px] font-bold text-[#0a0a0a] mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>25 000 kr<span className="text-[10px] font-normal text-[#999] ml-0.5">/mnd</span></p>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#f5edfc] flex items-center justify-center"><TrendingUp className="w-3 h-3 text-[#cf97fc]" strokeWidth={2.6} /></div>
                      <div>
                        <p className="text-[9px] text-[#999] leading-tight uppercase tracking-[0.04em]">Avkastning</p>
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
              <p className="text-[10.5px] sm:text-[11px] font-semibold text-[#cf97fc] uppercase tracking-[0.1em] mb-3 sm:mb-4">For eiendomseiere</p>
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
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col" data-testid="owner-page">
      <div className="h-[56px] lg:h-[76px]" />
      <div className="flex-1 flex flex-col">
        <div className="max-w-[560px] w-full mx-auto px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="w-8 h-8 rounded-full border border-[#e5e5e5] hover:bg-[#f5f5f5] flex items-center justify-center transition-colors" data-testid="owner-back-button">
                <ArrowLeft className="w-3.5 h-3.5 text-[#888]" />
              </button>
              <span className="text-[13px] text-[#737373] font-medium">{step} / {STEPS.length - 1}</span>
            </div>
            <span className="text-[13px] text-[#737373] font-medium">{STEPS[step].title}</span>
          </div>
          <div className="h-[2px] bg-[#f0f0f0] rounded-full mb-10 overflow-hidden">
            <motion.div className="h-full bg-[#cf97fc] rounded-full" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }} />
          </div>
        </div>

        <div className="flex-1 max-w-[560px] w-full mx-auto px-6 pb-24">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}>

              {step === 1 && (
                <div data-testid="owner-step-personal">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Fortell oss om deg</h2>
                  <p className="text-[15px] text-[#888] mb-8">Slik at vi kan ta kontakt med en personlig vurdering.</p>
                  <div className="space-y-5">
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Adresse til eiendommen <span className="text-[#cf97fc]">*</span></Label>
                      <AddressAutocomplete value={formData.address} onChange={(v: any) => updateField('address', v)}
                        onSelect={(data: any) => { if (data.address) updateField('address', data.address.replace(/,\s*(Norway|Norge)$/i, '')); if (data.postalCode) updateField('postal_code', data.postalCode); }}
                        placeholder="F.eks. Nordnesveien 8, Bergen"
                        inputClassName="w-full h-[52px] px-4 text-[15px] bg-white border border-[#e0e0e0] rounded-2xl outline-none focus:border-[#cf97fc] focus:shadow-[0_0_0_3px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#737373]"
                        className="w-full" showIcon={false} dataTestId="owner-address-input" />
                      {errors.address && <p className="text-[12px] text-red-500 mt-1.5">{errors.address}</p>}
                    </div>
                    <div className="pt-2 border-t border-[#f0f0f0]"><p className="text-[11px] font-semibold text-[#737373] uppercase tracking-[0.08em] mb-4">Kontaktinformasjon</p></div>
                    <TextInput label="Fullt navn" required error={errors.name} icon={User} value={formData.name} onChange={(v: any) => updateField('name', v)} placeholder="Ola Nordmann" autoComplete="name" testId="owner-name-input" />
                    <TextInput label="E-post" required error={errors.email} icon={Mail} value={formData.email} type="email" onChange={(v: any) => updateField('email', v)} placeholder="ola@eksempel.no" autoComplete="email" testId="owner-email-input" />
                    <PhoneInput value={formData.phone} onChange={(v: any) => updateField('phone', v)} error={errors.phone} testId="owner-phone-input" />
                  </div>
                  <p className="text-[11px] text-[#ccc] mt-6"><span className="text-[#cf97fc]">*</span> Påkrevde felt</p>
                </div>
              )}

              {step === 2 && (
                <div data-testid="owner-step-property">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Om eiendommen</h2>
                  <p className="text-[15px] text-[#888] mb-8">Fortell oss om boligen du vil leie ut.</p>
                  <div className="space-y-6">
                    <TextInput label="Størrelse (m²)" required error={errors.sqm} value={formData.sqm} onChange={(v: any) => updateField('sqm', v)} placeholder="F.eks. 65" type="number" testId="owner-sqm-input" />
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Boligtype <span className="text-[#cf97fc]">*</span></Label>
                      <IconCardSelector options={propertyTypes} selected={formData.property_type} onChange={(v: any) => updateField('property_type', v)} testIdPrefix="owner-type" />
                      {errors.property_type && <p className="text-[12px] text-red-500 mt-1.5">{errors.property_type}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Soverom <span className="text-[#cf97fc]">*</span></Label>
                      <NumberSelector options={['1', '2', '3', '4', '5+']} selected={formData.bedrooms} onChange={(v: any) => updateField('bedrooms', v)} testIdPrefix="owner-bedrooms" />
                      {errors.bedrooms && <p className="text-[12px] text-red-500 mt-1.5">{errors.bedrooms}</p>}
                    </div>
                    <div className="pt-6 border-t border-[#f0f0f0]" data-testid="owner-extra-units-section">
                      <div className="flex items-center justify-between mb-1"><p className="text-[13px] font-semibold text-[#333]">Har du flere eiendommer?</p><span className="text-[12px] text-[#999]">Valgfritt</span></div>
                      <p className="text-[13px] text-[#888] mb-4">Legg til flere boliger du vil leie ut — vi vurderer dem samlet.</p>
                      <AnimatePresence initial={false}>
                        {extraUnits.map((u: any, i: number) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-[#eee] bg-white p-4 mb-3" data-testid={`owner-extra-unit-${i}`}>
                            <div className="flex items-center justify-between mb-3"><p className="text-[11px] font-semibold text-[#737373] uppercase tracking-[0.06em]">Eiendom {i + 2}</p>
                              <button type="button" onClick={() => removeExtra(i)} data-testid={`owner-extra-remove-${i}`} className="w-7 h-7 rounded-full flex items-center justify-center text-[#bbb] hover:text-red-500 hover:bg-red-50 transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-2.5">
                              <AddressAutocomplete value={u.address} onChange={(v: any) => updateExtra(i, 'address', v)}
                                onSelect={(data: any) => { if (data.address) updateExtra(i, 'address', data.address.replace(/,\s*(Norway|Norge)$/i, '')); if (data.postalCode) updateExtra(i, 'postal_code', data.postalCode); }}
                                placeholder="Adresse til eiendommen" inputClassName="w-full h-[46px] px-3.5 text-[14px] bg-white border border-[#e0e0e0] rounded-xl outline-none focus:border-[#cf97fc] focus:shadow-[0_0_0_3px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#737373]" className="w-full" showIcon={false} dataTestId={`owner-extra-address-${i}`} />
                              <div className="grid grid-cols-3 gap-2">
                                <select value={u.property_type} onChange={(e: any) => updateExtra(i, 'property_type', e.target.value)} data-testid={`owner-extra-type-${i}`} className="h-[44px] px-2.5 text-[13px] bg-white border border-[#e0e0e0] rounded-xl outline-none focus:border-[#cf97fc] transition-colors text-[#333]">{propertyTypes.map((pt: any) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}</select>
                                <input value={u.sqm} onChange={(e: any) => updateExtra(i, 'sqm', e.target.value)} placeholder="m²" inputMode="numeric" data-testid={`owner-extra-sqm-${i}`} className="h-[44px] px-3 text-[13px] bg-white border border-[#e0e0e0] rounded-xl outline-none focus:border-[#cf97fc] transition-colors placeholder:text-[#999]" />
                                <select value={u.bedrooms} onChange={(e: any) => updateExtra(i, 'bedrooms', e.target.value)} data-testid={`owner-extra-bedrooms-${i}`} className="h-[44px] px-2.5 text-[13px] bg-white border border-[#e0e0e0] rounded-xl outline-none focus:border-[#cf97fc] transition-colors text-[#333]"><option value="">Sov.</option>{['1', '2', '3', '4', '5+'].map((b: string) => <option key={b} value={b}>{b} sov.</option>)}</select>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <button type="button" onClick={addExtra} data-testid="owner-add-unit-button" className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-[#e0d4f0] text-[#cf97fc] hover:border-[#cf97fc] hover:bg-[#faf5ff] text-[14px] font-semibold transition-all"><Plus className="w-4 h-4" /> Legg til {extraUnits.length > 0 ? 'enda en' : 'eiendom'}</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#ccc] mt-6"><span className="text-[#cf97fc]">*</span> Påkrevde felt</p>
                </div>
              )}

              {step === 3 && (
                <div data-testid="owner-step-goals">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Hva er viktigst for deg?</h2>
                  <p className="text-[15px] text-[#888] mb-8">Vi anbefaler den optimale strategien basert på dine preferanser.</p>
                  <div className="space-y-7">
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-3 block">Foretrukket utleiemodell <span className="text-[#cf97fc]">*</span></Label>
                      <div className="space-y-2.5">
                        {rentalModels.map((m: any) => {
                          const Icon = m.icon;
                          const selected = formData.rental_model === m.value;
                          return (
                            <button key={m.value} type="button" onClick={() => updateField('rental_model', selected ? '' : m.value)} data-testid={`owner-model-${m.value}`}
                              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 relative ${selected ? 'border-[#cf97fc] bg-[#faf5ff]' : 'border-[#eee] bg-white hover:border-[#ddd]'}`}>
                              {m.recommended && (<span className="absolute -top-2.5 right-4 text-[9px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full bg-gradient-to-r from-[#c084fc] to-[#AE68E4] text-white">Anbefalt</span>)}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-[#cf97fc]' : 'bg-[#f0f0f0]'}`}><Icon className="w-5 h-5" style={{ color: selected ? '#fff' : '#aaa' }} /></div>
                              <div><p className={`text-[14px] font-semibold ${selected ? 'text-[#0a0a0a]' : 'text-[#555]'}`}>{m.label}</p><p className="text-[12px] text-[#999] mt-0.5">{m.desc}</p></div>
                            </button>
                          );
                        })}
                      </div>
                      {errors.rental_model && <p className="text-[12px] text-red-500 mt-1.5">{errors.rental_model}</p>}
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-[#333] mb-2 block">Når er eiendommen tilgjengelig? <span className="text-[#cf97fc]">*</span></Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" data-testid="owner-availability-input" className={`w-full h-[52px] px-4 text-left text-[15px] bg-white border rounded-2xl outline-none transition-all flex items-center gap-3 ${formData.availability ? 'border-[#e0e0e0] text-[#333]' : 'border-[#e0e0e0] text-[#737373]'} hover:border-[#cf97fc] focus:border-[#cf97fc] focus:shadow-[0_0_0_3px_rgba(207,151,252,0.12)]`}>
                            <CalendarIcon className="w-4 h-4 text-[#999] shrink-0" />
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

              {step === 4 && (
                <div data-testid="owner-step-confirm">
                  <h2 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Ser dette riktig ut?</h2>
                  <p className="text-[15px] text-[#888] mb-8">Sjekk at alt stemmer før du sender.</p>
                  <div className="space-y-4">
                    <SummaryCard title="Om deg" onEdit={() => { setDir(-1); setStep(1); }} testId="owner-edit-personal">
                      <p className="text-[15px] text-[#333] font-medium">{formData.name}</p>
                      <p className="text-[14px] text-[#666]">{formData.email}</p>
                      <p className="text-[14px] text-[#666]">+47 {formData.phone}</p>
                    </SummaryCard>
                    <SummaryCard title={extraUnits.filter((u: any) => (u.address || '').trim()).length > 0 ? `Eiendommer (${1 + extraUnits.filter((u: any) => (u.address || '').trim()).length})` : 'Eiendommen'} onEdit={() => { setDir(-1); setStep(2); }} testId="owner-edit-property">
                      <p className="text-[14px] text-[#333] font-medium">{formData.address || '—'}</p>
                      <div className="flex gap-4 mt-1 text-[13px] text-[#888]">
                        {formData.postal_code && <span>{formData.postal_code}</span>}
                        {formData.sqm && <span>{formData.sqm} m²</span>}
                        {formData.property_type && <span className="capitalize">{formData.property_type}</span>}
                        <span>{formData.bedrooms} sov.</span>
                      </div>
                      {extraUnits.filter((u: any) => (u.address || '').trim()).map((u: any, i: number) => (
                        <div key={i} className="mt-3 pt-3 border-t border-[#f3f3f3]" data-testid={`owner-summary-extra-${i}`}>
                          <p className="text-[14px] text-[#333] font-medium">{u.address}</p>
                          <div className="flex gap-4 mt-1 text-[13px] text-[#888]">{u.postal_code && <span>{u.postal_code}</span>}{u.sqm && <span>{u.sqm} m²</span>}{u.property_type && <span className="capitalize">{u.property_type}</span>}{u.bedrooms && <span>{u.bedrooms} sov.</span>}</div>
                        </div>
                      ))}
                    </SummaryCard>
                    <SummaryCard title="Dine mål" onEdit={() => { setDir(-1); setStep(3); }} testId="owner-edit-goals">
                      {formData.rental_model && <p className="text-[14px] text-[#333]">Modell: <span className="font-medium capitalize">{formData.rental_model}</span></p>}
                      {formData.availability && <p className="text-[14px] text-[#666]">Tilgjengelig: {new Date(formData.availability + 'T12:00:00').toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                      {formData.notes && <p className="text-[13px] text-[#999] mt-1">{formData.notes}</p>}
                      {!formData.rental_model && !formData.availability && !formData.notes && <p className="text-[13px] text-[#737373]">Ingen preferanser valgt</p>}
                    </SummaryCard>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 z-30 mt-auto bg-white/90 backdrop-blur-xl border-t border-[#f0f0f0]">
          <div className="max-w-[560px] mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={goBack} className="text-[14px] font-semibold text-[#666] hover:text-[#333] underline underline-offset-4 transition-colors" data-testid="owner-back-link">Tilbake</button>
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext} data-testid="owner-next-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform">Neste <ArrowRight className="w-4 h-4" /></Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} data-testid="owner-submit-button" className="rounded-full bg-[#0a0a0a] text-white hover:bg-black h-12 px-8 text-[14px] font-semibold gap-2 active:scale-[0.97] transition-transform">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Send henvendelse</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
