'use client';

// ---------------------------------------------------------------------------
// Priskalkulator v3 — immersiv fullskjerm-konfigurator (Tesla/Linear-klasse).
// Egen minimal toppbar (ingen nettside-header), delt skjerm: venstre = steg,
// høyre = levende mørkt dashboard i full høyde med animert 12-mnd inntektsgraf.
// Retningsbaserte steg-overganger, sessionStorage-persistens, full GA4-trakt.
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { site } from '@/lib/site';
import {
  Check, Minus, ArrowRight, ArrowLeft, Sparkles, Loader2, MapPin, ShieldCheck,
  PartyPopper, Megaphone, Camera, Users, Scale, Home, Wallet, ChevronUp, Pencil,
  Lightbulb, Building2, DoorOpen, Warehouse, Phone, X, Clock,
} from 'lucide-react';

const fmt = (n: number) => Math.round(n).toLocaleString('nb-NO');
const STEPS = ['Boligen', 'Servicenivå', 'Utleiemodell', 'Tillegg', 'Kontakt'];
const STORE_KEY = 'dh_wizard_v1';
const ADDON_ICONS: any = { markedspakke: Megaphone, foto: Camera, kredittsjekk: ShieldCheck, innflytting: Sparkles, visningshjelp: Users, juridisk: Scale };
const TYPE_ICONS: any = { Leilighet: Building2, Hus: Home, Rekkehus: Warehouse, Hybel: DoorOpen };
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function rentEstimate(ptype: string, bedrooms: number) {
  if (ptype === 'Hybel') return 12500;
  const base: any = { 1: 15000, 2: 18500, 3: 23000, 4: 28000 };
  let est = base[Math.min(bedrooms, 4)] || 18500;
  if (ptype === 'Hus' || ptype === 'Rekkehus') est = Math.round((est * 1.1) / 500) * 500;
  return est;
}

function AnimatedNumber({ value, suffix = '' }: any) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<any>(null);
  useEffect(() => {
    const from = display, to = value, start = performance.now(), dur = 380;
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className="tabular-nums">{fmt(display)}{suffix}</span>;
}

// Levende 12-mnd inntektsgraf — hjertet i dashbordet.
// Hybrid: 10 mnd langtidsleie + 2 høysesong-mnd (korttid) som spiker.
function IncomeChart({ rent, hybrid }: any) {
  const spike = rent * 2.5; // illustrativ korttidstopp
  const values = MONTHS.map((_, i) => (hybrid && (i === 6 || i === 7) ? spike : rent));
  const maxV = hybrid ? spike : rent * 1.6;
  return (
    <div>
      <div className="flex items-end gap-[5px] h-[96px]">
        {values.map((v, i) => {
          const isSpike = hybrid && (i === 6 || i === 7);
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <div
                className={`w-full rounded-[4px] transition-all duration-700 ${isSpike ? 'bg-gradient-to-t from-[#9b6cc4] to-[#d298ff]' : 'bg-white/[0.13]'}`}
                style={{ height: `${Math.max((v / maxV) * 100, 8)}%`, transitionDelay: `${i * 28}ms`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[5px] mt-1.5">
        {MONTHS.map((m, i) => (
          <span key={i} className={`flex-1 text-center text-[9px] ${hybrid && (i === 6 || i === 7) ? 'text-[#d298ff] font-bold' : 'text-white/55'}`}>{m}</span>
        ))}
      </div>
    </div>
  );
}

const Chip = ({ active, onClick, children, testId }: any) => (
  <button type="button" onClick={onClick} data-testid={testId}
    className={`inline-flex items-center gap-2 px-4 h-[46px] rounded-2xl text-[13.5px] font-medium border transition-all duration-300 ${
      active ? 'bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-[0_8px_20px_-8px_rgba(10,10,10,0.5)]' : 'bg-white text-[#444] border-[#e8e3da] hover:border-[#c9bfe0] hover:-translate-y-px'
    }`}>
    {children}
  </button>
);

export default function PriceWizard() {
  const [catalog, setCatalog] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [dir, setDir] = useState<'r' | 'l'>('r');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'mnd' | 'aar'>('mnd');
  const [mobileOpen, setMobileOpen] = useState(false);

  const [address, setAddress] = useState('');
  const [postal, setPostal] = useState('');
  const [rent, setRent] = useState(18000);
  const [ptype, setPtype] = useState('Leilighet');
  const [bedrooms, setBedrooms] = useState(2);
  const [levelKey, setLevelKey] = useState('fullforvaltning');
  const [modelKey, setModelKey] = useState('langtid');
  const [addons, setAddons] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const restored = useRef(false);
  const leftPane = useRef<any>(null);

  useEffect(() => {
    fetch('/api/wizard/catalog').then((r) => r.json()).then((d) => setCatalog(d.catalog)).catch(() => {});
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.rent) setRent(s.rent);
        if (s.ptype) setPtype(s.ptype);
        if (s.bedrooms) setBedrooms(s.bedrooms);
        if (s.levelKey) setLevelKey(s.levelKey);
        if (s.modelKey) setModelKey(s.modelKey);
        if (Array.isArray(s.addons)) setAddons(s.addons);
        if (s.address) setAddress(s.address);
      }
    } catch (e) {}
    restored.current = true;
    try { track('wizard_step', { step: 0, name: STEPS[0] }); } catch (e) {}
    try { trackLeadStart('priskalkulator'); } catch (e) {}
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ rent, ptype, bedrooms, levelKey, modelKey, addons, address })); } catch (e) {}
  }, [rent, ptype, bedrooms, levelKey, modelKey, addons, address]);

  const level = useMemo(() => catalog?.serviceLevels?.find((l: any) => l.key === levelKey), [catalog, levelKey]);
  const model = useMemo(() => catalog?.models?.find((m: any) => m.key === modelKey), [catalog, modelKey]);
  const availableModels = useMemo(() => (catalog?.models || []).filter((m: any) => (level?.models || []).includes(m.key)), [catalog, level]);
  const visibleAddons = useMemo(() => (catalog?.addons || []).filter((a: any) => !a.for || a.for === levelKey), [catalog, levelKey]);

  const uplift = modelKey === 'hybrid' ? (model?.upliftPct || 25) / 100 : 0;
  const effRent = rent * (1 + uplift);
  const fee = level ? Math.max((effRent * level.pct) / 100, level.minMonthly || 0) : 0;
  const payout = effRent - fee;
  const keptPct = effRent > 0 ? (payout / effRent) * 100 : 0;
  const onceTotal = visibleAddons.filter((a: any) => addons.includes(a.key)).reduce((s: number, a: any) => s + (a.price || 0), 0);
  const mult = period === 'aar' ? 12 : 1;
  const est = rentEstimate(ptype, bedrooms);

  const skipModel = (level?.models || []).length <= 1;
  const totalSteps = skipModel ? 4 : 5;
  const stepIdx = skipModel && step >= 3 ? step - 1 : step;
  const progressPct = Math.round((stepIdx / (totalSteps - 1)) * 100);

  const goTo = (s: number) => {
    let target = Math.max(0, Math.min(4, s));
    if (skipModel && target === 2) target = s > step ? 3 : 1;
    setDir(target >= step ? 'r' : 'l');
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
    try { track('wizard_step', { step: target, name: STEPS[target] }); } catch (e) {}
    try { if (leftPane.current) leftPane.current.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  };

  const buildNotes = () => {
    const parts = [
      `PRISKALKULATOR — ${level?.name} (${level?.pct} %)${modelKey === 'hybrid' ? ' · Dynamisk (10+2)' : ' · Langtid'}`,
      `Forventet leie: ${fmt(rent)} kr/mnd${uplift ? ` (est. ${fmt(effRent)} med dynamisk)` : ''} → honorar ca ${fmt(fee)} kr/mnd`,
      `Bolig: ${ptype}, ${bedrooms} soverom${address ? `, ${address}` : ''}`,
    ];
    const chosen = visibleAddons.filter((a: any) => addons.includes(a.key));
    if (chosen.length) parts.push(`Tillegg: ${chosen.map((a: any) => `${a.name} (${fmt(a.price)} kr)`).join(', ')} — engangs totalt ${fmt(onceTotal)} kr`);
    return parts.join('. ');
  };

  const submit = async (e: any) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) { setError('Fyll inn navn og e-post eller telefon.'); return; }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          address, postal_code: postal, property_type: ptype, bedrooms,
          rental_model: `${levelKey}:${modelKey}`, lead_type: 'huseier', source: 'priskalkulator',
          notes: buildNotes(),
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      const data = await res.json();
      if (!res.ok || (!data.success && !data.ok)) throw new Error(data.error || 'Noe gikk galt');
      try { trackLead({ formId: 'priskalkulator', source: 'priskalkulator', leadId: data?.id || data?.lead?.id, email: form.email, phone: form.phone }); } catch (e2) {}
      try { track('wizard_complete', { level: levelKey, model: modelKey, addons: addons.length, fee: Math.round(fee), once: onceTotal }); } catch (e2) {}
      try { sessionStorage.removeItem(STORE_KEY); } catch (e2) {}
      setDone(true);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e2) {}
    } catch (err: any) {
      setError('Kunne ikke sende inn — prøv igjen, eller ring oss.');
    } finally { setSending(false); }
  };

  // ── Minimal toppbar (immersivt: ingen nettside-header) ──
  const TopBar = (
    <header className="shrink-0 h-[64px] border-b border-[#eee9e1] bg-[#fdfcfb]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="h-full max-w-[1800px] mx-auto px-5 sm:px-8 flex items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="Til forsiden">
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[20px] w-auto" />
        </Link>
        {!done && (
          <div className="hidden md:flex items-center gap-2" data-testid="wizard-stepper">
            {STEPS.map((s, i) => {
              if (skipModel && i === 2) return null;
              const isDone = i < step, isActive = i === step;
              return (
                <button key={s} type="button" onClick={() => i <= maxStep && goTo(i)}
                  className={`flex items-center gap-1.5 px-3 h-[32px] rounded-full text-[11.5px] font-semibold transition-all duration-300 ${
                    isActive ? 'bg-[#0a0a0a] text-white' : isDone ? 'text-[#8b5fc0] hover:bg-[#f5edfc]' : 'text-[#c4beb2]'
                  }`}>
                  {isDone ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="tabular-nums">{i + 1}</span>}
                  {s}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-4 shrink-0">
          <a href={`tel:${site.phoneHref}`} className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
            <Phone className="w-3.5 h-3.5" /> {site.phone}
          </a>
          <Link href="/" aria-label="Lukk kalkulatoren"
            className="w-9 h-9 rounded-full border border-[#e8e3da] hover:bg-white hover:border-[#c9bfe0] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-[#666]" />
          </Link>
        </div>
      </div>
      {!done && (
        <div className="h-[2.5px] bg-[#f0ece6]">
          <div className="h-full bg-gradient-to-r from-[#d298ff] to-[#9b6cc4] transition-all duration-700" style={{ width: `${Math.max(progressPct, 4)}%`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      )}
    </header>
  );

  if (!catalog) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fdfcfb' }}>
        {TopBar}
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#a765e0]" /></div>
      </div>
    );
  }

  // ── Suksess: fullskjerm-takeover ──
  if (done) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fdfcfb' }}>
        {TopBar}
        <div className="flex-1 flex items-center justify-center px-6 py-14">
          <div className="max-w-[600px] w-full text-center dh-fade-up" data-testid="wizard-success">
            <div className="w-[72px] h-[72px] rounded-full bg-[#f5edfc] border border-[#e9d9fa] flex items-center justify-center mx-auto mb-7">
              <PartyPopper className="w-8 h-8 text-[#a765e0]" strokeWidth={1.5} />
            </div>
            <h1 className="text-[34px] sm:text-[44px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Takk, {form.name.split(' ')[0]}!</h1>
            <p className="text-[16px] text-[#666] leading-[1.75] mb-8">Pakken din er mottatt. En av oss kontakter deg <strong className="text-[#0a0a0a]">innen 24 timer</strong> med en konkret vurdering.</p>
            <div className="rounded-[22px] bg-[#0a0a0a] text-white p-6 mb-8 flex items-center justify-between gap-4 text-left relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-[220px] h-[220px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(210,152,255,0.18) 0%, transparent 65%)' }} />
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#d298ff] font-semibold">{level?.name} · {modelKey === 'hybrid' ? 'Dynamisk 10+2' : 'Langtid'}</p>
                <p className="text-[28px] font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(payout)} <span className="text-[13px] font-medium text-white/45">kr/mnd til deg</span></p>
              </div>
              {onceTotal > 0 && <div className="relative text-right"><p className="text-[11px] text-white/45">Engangs</p><p className="text-[16px] font-semibold tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(onceTotal)} kr</p></div>}
            </div>
            <div className="text-left bg-white rounded-[20px] border border-[#eeeae3] p-7 mb-9">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9b6cc4] mb-4">Hva skjer nå?</p>
              {['Vi ser på boligen din og markedet i området', 'Du får en uforpliktende prisvurdering og gjennomgang av pakken', 'Er du fornøyd, signerer du digitalt — og vi setter i gang'].map((t, i) => (
                <div key={i} className="flex items-start gap-3.5 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#f5edfc] text-[#8b5fc0] text-[12px] font-bold flex items-center justify-center shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>{i + 1}</span>
                  <p className="text-[14.5px] text-[#444] leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
            <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-medium text-[#666] hover:text-[#0a0a0a] transition-colors"><ArrowLeft className="w-4 h-4" /> Tilbake til forsiden</Link>
          </div>
        </div>
      </div>
    );
  }

  const summaryRows = [
    { label: 'Boligen', value: `${ptype} · ${bedrooms} sov · ${fmt(rent)} kr/mnd${address ? ` · ${address}` : ''}`, jump: 0 },
    { label: 'Servicenivå', value: `${level?.name} (${level?.pct} %)`, jump: 1 },
    ...(!skipModel ? [{ label: 'Utleiemodell', value: model?.name || '', jump: 2 }] : []),
    { label: 'Tillegg', value: addons.length ? visibleAddons.filter((a: any) => addons.includes(a.key)).map((a: any) => a.name).join(', ') : 'Ingen', jump: 3 },
  ];

  const ghostNum = String(stepIdx + 1).padStart(2, '0');

  return (
    <div className="min-h-screen lg:h-screen flex flex-col" style={{ backgroundColor: '#fdfcfb' }}>
      {TopBar}

      <div className="flex-1 lg:overflow-hidden grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px]">
        {/* ── VENSTRE: scrollbart steg-innhold ── */}
        <div ref={leftPane} className="lg:overflow-y-auto relative">
          <div className="max-w-[760px] mx-auto px-6 sm:px-10 pt-10 sm:pt-14 pb-8">
            <div key={step} className={dir === 'r' ? 'dh-slide-r' : 'dh-slide-l'}>

              {/* Ghost-nummer + steg-tittel */}
              <div className="relative mb-9">
                <span aria-hidden className="absolute -top-7 -left-2 text-[110px] font-bold leading-none select-none pointer-events-none text-[#f2ebfa]" style={{ fontFamily: 'var(--font-heading)' }}>{ghostNum}</span>
                <div className="relative pt-6">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#9b6cc4] mb-3">Steg {stepIdx + 1} av {totalSteps}</p>
                  <h1 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.06] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    {step === 0 && 'Fortell oss om boligen'}
                    {step === 1 && 'Hvor mye vil du gjøre selv?'}
                    {step === 2 && 'Velg utleiemodell'}
                    {step === 3 && 'Vil du ha en flying start?'}
                    {step === 4 && 'Hvem skal vi kontakte?'}
                  </h1>
                  <p className="text-[15px] text-[#666] leading-relaxed max-w-[54ch]">
                    {step === 0 && 'Tar under 2 minutter — du ser prisen live til høyre.'}
                    {step === 1 && 'Velg servicenivået som passer deg — du kan bytte senere.'}
                    {step === 2 && 'Med Fullforvaltning kan vi kombinere langtid og korttid for høyere inntekt.'}
                    {step === 3 && 'Engangsprodukter som får boligen raskere ut — helt valgfritt.'}
                    {step === 4 && 'Du får en uforpliktende vurdering innen 24 timer. Ingen binding.'}
                  </p>
                </div>
              </div>

              {step === 0 && (
                <div>
                  <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Adresse <span className="font-normal text-[#78726a]">(valgfritt)</span></label>
                  <div className="flex items-center rounded-full bg-white border border-[#e8e3da] focus-within:border-[#d298ff]/60 focus-within:shadow-[0_0_0_4px_rgba(210,152,255,0.12)] transition-all mb-9 max-w-[520px] relative z-30">
                    <div className="pl-5"><MapPin className="w-[17px] h-[17px] text-[#716b63]" /></div>
                    <AddressAutocomplete value={address} onChange={(v: string) => { setAddress(v); setPostal(''); }}
                      onSelect={(s: any) => { setAddress(s.address); setPostal(s.postalCode || ''); }}
                      requireSelection
                      placeholder="Gateadresse, sted" showIcon={false} dataTestId="wizard-address-input"
                      inputClassName="flex-1 h-[54px] px-3.5 text-[15px] bg-transparent border-0 outline-none focus:outline-none w-full placeholder:text-[#716b63]" className="flex-1" />
                  </div>

                  <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Forventet månedsleie</label>
                  <p className="text-[40px] sm:text-[48px] font-bold text-[#0a0a0a] tracking-[-0.02em] mb-4 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                    <AnimatedNumber value={rent} /> <span className="text-[16px] font-medium text-[#716b63]">kr/mnd</span>
                  </p>
                  <input type="range" min={8000} max={45000} step={500} value={rent} onChange={(e) => setRent(Number(e.target.value))}
                    className="dh-range w-full max-w-[520px] cursor-pointer"
                    style={{ background: `linear-gradient(to right, #a765e0 ${((rent - 8000) / 37000) * 100}%, #ece8e1 ${((rent - 8000) / 37000) * 100}%)` }}
                    data-testid="wizard-rent-slider" />
                  <div className="flex justify-between max-w-[520px] text-[11px] text-[#bbb] mt-2"><span>8 000 kr</span><span>45 000 kr</span></div>
                  {Math.abs(rent - est) > 1500 && (
                    <button type="button" onClick={() => setRent(est)} data-testid="wizard-rent-hint"
                      className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f5edfc] border border-[#e9d9fa] text-[12px] font-medium text-[#8b5fc0] hover:bg-[#efe2fb] transition-colors">
                      <Lightbulb className="w-3.5 h-3.5" /> Usikker? Typisk for {bedrooms === 4 ? '4+' : bedrooms}-sov {ptype.toLowerCase()} i Bergen: ~{fmt(est)} kr
                    </button>
                  )}

                  <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5 mt-10" style={{ fontFamily: 'var(--font-heading)' }}>Boligtype</label>
                  <div className="flex flex-wrap gap-2.5 mb-9">
                    {['Leilighet', 'Hus', 'Rekkehus', 'Hybel'].map((t) => {
                      const Icon = TYPE_ICONS[t];
                      return <Chip key={t} active={ptype === t} onClick={() => setPtype(t)} testId={`wizard-type-${t}`}><Icon className="w-4 h-4" strokeWidth={1.8} /> {t}</Chip>;
                    })}
                  </div>
                  <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Soverom</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[1, 2, 3, 4].map((b) => <Chip key={b} active={bedrooms === b} onClick={() => setBedrooms(b)} testId={`wizard-bed-${b}`}>{b === 4 ? '4+' : b}</Chip>)}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid sm:grid-cols-2 gap-5">
                  {catalog.serviceLevels.map((l: any) => {
                    const active = levelKey === l.key;
                    const lFee = Math.max((rent * l.pct) / 100, l.minMonthly || 0);
                    return (
                      <button key={l.key} type="button" data-testid={`wizard-level-${l.key}`}
                        onClick={() => { setLevelKey(l.key); if (!(l.models || []).includes(modelKey)) setModelKey((l.models || ['langtid'])[0]); }}
                        className={`relative text-left rounded-[24px] p-7 border-2 transition-all duration-400 flex flex-col ${
                          active ? 'border-[#0a0a0a] bg-white shadow-[0_28px_56px_-26px_rgba(20,10,40,0.3)]' : 'border-[#eeeae3] bg-white hover:border-[#d9c9ef] hover:-translate-y-1'
                        }`}>
                        {l.badge && <span className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.1em] ${active ? 'bg-[#0a0a0a] text-[#d298ff]' : 'bg-[#f5edfc] text-[#8b5fc0] border border-[#e9d9fa]'}`}>{l.badge}</span>}
                        <div className="flex items-start justify-between gap-3 mt-1 mb-1">
                          <h3 className="text-[21px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{l.name}</h3>
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${active ? 'bg-[#0a0a0a] border-[#0a0a0a]' : 'border-[#ddd]'}`}>{active && <Check className="w-3.5 h-3.5 text-[#d298ff]" strokeWidth={3} />}</span>
                        </div>
                        <p className="text-[13px] text-[#6b6b6b] mb-4">{l.tagline}</p>
                        <div className={`rounded-2xl px-4 py-3.5 mb-5 transition-colors ${active ? 'bg-[#0a0a0a]' : 'bg-[#faf8f5] border border-[#f0ece6]'}`}>
                          <p className={`text-[11px] uppercase tracking-[0.1em] font-semibold ${active ? 'text-[#d298ff]' : 'text-[#9b6cc4]'}`}>{l.pct} % av leien — for din bolig:</p>
                          <p className={`text-[24px] font-bold leading-tight tabular-nums ${active ? 'text-white' : 'text-[#0a0a0a]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{fmt(lFee)} <span className={`text-[12px] font-medium ${active ? 'text-white/45' : 'text-[#78726a]'}`}>kr/mnd</span></p>
                        </div>
                        <div className="space-y-2 flex-1">
                          {(l.included || []).map((f: string) => (
                            <div key={f} className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[#a765e0] mt-0.5 shrink-0" strokeWidth={2.4} /><span className="text-[13px] text-[#333] leading-snug">{f}</span></div>
                          ))}
                          {(l.notIncluded || []).map((f: string) => (
                            <div key={f} className="flex items-start gap-2.5 opacity-45"><Minus className="w-4 h-4 text-[#bbb] mt-0.5 shrink-0" /><span className="text-[13px] text-[#6b6b6b] leading-snug line-through decoration-[#ccc]">{f}</span></div>
                          ))}
                        </div>
                        {l.minMonthly ? <p className="text-[11px] text-[#78726a] mt-4">Minstepris {fmt(l.minMonthly)} kr/mnd</p> : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && !skipModel && (
                <div className="grid sm:grid-cols-2 gap-5">
                  {availableModels.map((m: any) => {
                    const active = modelKey === m.key;
                    const extra = m.upliftPct ? rent * (m.upliftPct / 100) : 0;
                    return (
                      <button key={m.key} type="button" data-testid={`wizard-model-${m.key}`} onClick={() => setModelKey(m.key)}
                        className={`relative text-left rounded-[24px] p-7 border-2 transition-all duration-400 ${
                          active ? 'border-[#0a0a0a] bg-white shadow-[0_28px_56px_-26px_rgba(20,10,40,0.3)]' : 'border-[#eeeae3] bg-white hover:border-[#d9c9ef] hover:-translate-y-1'
                        }`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-[19px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{m.name}</h3>
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#0a0a0a] border-[#0a0a0a]' : 'border-[#ddd]'}`}>{active && <Check className="w-3.5 h-3.5 text-[#d298ff]" strokeWidth={3} />}</span>
                        </div>
                        <p className="text-[13.5px] text-[#666] leading-relaxed">{m.desc}</p>
                        {m.key === 'hybrid' ? (
                          <>
                            <div className="mt-5">
                              <div className="flex gap-1">
                                {Array.from({ length: 12 }).map((_, i) => (
                                  <div key={i} className={`flex-1 rounded-[5px] transition-all duration-500 ${i >= 10 ? (active ? 'bg-[#a765e0] h-11' : 'bg-[#d9c9ef] h-11') : (active ? 'bg-[#eee0fb] h-8' : 'bg-[#f0ece6] h-8')}`} style={{ transitionDelay: `${i * 30}ms`, alignSelf: 'flex-end' }} />
                                ))}
                              </div>
                              <div className="flex justify-between mt-2">
                                <span className="text-[11px] text-[#716b63]">10 mnd langtidsleie</span>
                                <span className={`text-[11px] font-semibold ${active ? 'text-[#8b5fc0]' : 'text-[#716b63]'}`}>2 mnd korttid</span>
                              </div>
                            </div>
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f5edfc] border border-[#e9d9fa]">
                              <Sparkles className="w-3.5 h-3.5 text-[#a765e0]" />
                              <span className="text-[12px] font-semibold text-[#8b5fc0]">Estimert +{fmt(extra)} kr/mnd for din bolig</span>
                            </div>
                          </>
                        ) : (
                          <div className="mt-5">
                            <div className="flex gap-1 items-end">{Array.from({ length: 12 }).map((_, i) => <div key={i} className={`flex-1 h-8 rounded-[5px] ${active ? 'bg-[#eee0fb]' : 'bg-[#f0ece6]'}`} />)}</div>
                            <p className="text-[11px] text-[#716b63] mt-2">12 mnd stabil langtidsleie</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 3 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {visibleAddons.map((a: any) => {
                    const active = addons.includes(a.key);
                    const Icon = ADDON_ICONS[a.key] || Sparkles;
                    const recommended = levelKey === 'selvbetjent' && a.key === 'visningshjelp';
                    return (
                      <button key={a.key} type="button" data-testid={`wizard-addon-${a.key}`}
                        onClick={() => setAddons((prev) => active ? prev.filter((k) => k !== a.key) : [...prev, a.key])}
                        className={`relative text-left rounded-[20px] p-6 border-2 transition-all duration-300 ${
                          active ? 'border-[#0a0a0a] bg-white shadow-[0_20px_44px_-22px_rgba(20,10,40,0.25)]' : 'border-[#eeeae3] bg-white hover:border-[#d9c9ef] hover:-translate-y-0.5'
                        }`}>
                        {(a.popular || recommended) && <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] bg-[#f5edfc] text-[#8b5fc0] border border-[#e9d9fa]">{recommended ? 'Anbefalt for deg' : 'Populær'}</span>}
                        <div className="flex items-start justify-between gap-3 mb-3 mt-0.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-[#0a0a0a]' : 'bg-[#f5edfc]'}`}>
                            <Icon className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[#d298ff]' : 'text-[#a765e0]'}`} strokeWidth={1.8} />
                          </div>
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#0a0a0a] border-[#0a0a0a]' : 'border-[#ddd]'}`}>{active && <Check className="w-3.5 h-3.5 text-[#d298ff]" strokeWidth={3} />}</span>
                        </div>
                        <h3 className="text-[15.5px] font-bold text-[#0a0a0a] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{a.name}</h3>
                        <p className="text-[12.5px] text-[#6b6b6b] leading-relaxed mb-3">{a.desc}</p>
                        <p className="text-[15px] font-bold text-[#0a0a0a] tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(a.price)} kr <span className="text-[11px] font-normal text-[#78726a]">engangs</span></p>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="rounded-[20px] bg-white border border-[#eeeae3] divide-y divide-[#f3f0ea] mb-8 overflow-hidden" data-testid="wizard-summary">
                    {summaryRows.map((r: any) => (
                      <div key={r.label} className="flex items-center gap-4 px-5 py-3.5">
                        <span className="text-[12px] font-semibold text-[#716b63] w-[92px] shrink-0 uppercase tracking-[0.04em]">{r.label}</span>
                        <span className="text-[13.5px] text-[#333] flex-1 min-w-0 truncate">{r.value}</span>
                        <button type="button" onClick={() => goTo(r.jump)} data-testid={`wizard-edit-${r.jump}`}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#9b6cc4] hover:text-[#7a4bb0] transition-colors shrink-0"><Pencil className="w-3 h-3" /> Endre</button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={submit} className="max-w-[520px] space-y-4">
                    <input type="text" required placeholder="Fullt navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="wizard-name-input"
                      className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e8e3da] text-[15px] outline-none focus:border-[#d298ff]/60 focus:shadow-[0_0_0_4px_rgba(210,152,255,0.12)] transition-all placeholder:text-[#716b63]" />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input type="email" placeholder="E-post" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="wizard-email-input"
                        className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e8e3da] text-[15px] outline-none focus:border-[#d298ff]/60 focus:shadow-[0_0_0_4px_rgba(210,152,255,0.12)] transition-all placeholder:text-[#716b63]" />
                      <input type="tel" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="wizard-phone-input"
                        className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e8e3da] text-[15px] outline-none focus:border-[#d298ff]/60 focus:shadow-[0_0_0_4px_rgba(210,152,255,0.12)] transition-all placeholder:text-[#716b63]" />
                    </div>
                    {error && <p className="text-[13px] text-rose-500 px-2">{error}</p>}
                    <Button type="submit" disabled={sending} data-testid="wizard-submit-button"
                      className="w-full h-[58px] rounded-full bg-[#0a0a0a] text-white text-[15px] font-semibold hover:shadow-[0_14px_40px_-8px_rgba(167,101,224,0.55)] transition-all duration-300 active:scale-[0.98] gap-2">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send inn pakken min <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                    <p className="flex items-center justify-center gap-1.5 text-[12px] text-[#716b63] pt-1"><ShieldCheck className="w-3.5 h-3.5 text-[#a765e0]" /> Gratis og uforpliktende · Svar innen 24 timer · Ingen binding</p>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Sticky navigasjon i venstre pane */}
          {step < 4 && (
            <div className="sticky bottom-0 bg-gradient-to-t from-[#fdfcfb] via-[#fdfcfb]/95 to-transparent pt-8 pb-6 lg:pb-8 px-6 sm:px-10">
              <div className="max-w-[760px] mx-auto flex items-center gap-4">
                {step > 0 && (
                  <button type="button" onClick={() => goTo(step - 1)} data-testid="wizard-back-button"
                    className="inline-flex items-center gap-2 text-[14px] font-medium text-[#6b6b6b] hover:text-[#0a0a0a] transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Tilbake
                  </button>
                )}
                <Button onClick={() => goTo(step + 1)} data-testid="wizard-next-button"
                  className="rounded-full bg-[#0a0a0a] text-white h-[54px] px-9 text-[14px] font-semibold hover:shadow-[0_14px_40px_-8px_rgba(167,101,224,0.55)] transition-all duration-300 active:scale-[0.98] gap-2 ml-auto">
                  Neste steg <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          <div className="h-24 lg:h-0" />
        </div>

        {/* ── HØYRE: levende dashboard i full høyde ── */}
        <aside className="hidden lg:flex flex-col bg-[#0a0a0a] text-white relative overflow-y-auto" data-testid="wizard-price-panel">
          <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(210,152,255,0.16) 0%, transparent 62%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-[340px] h-[340px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(155,108,196,0.1) 0%, transparent 60%)', transform: 'translate(-30%, 30%)' }} />

          <div className="relative flex-1 flex flex-col justify-center px-10 xl:px-12 py-10 min-h-0">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d298ff]">Din pakke — live</p>
              <div className="flex rounded-full bg-white/[0.07] border border-white/[0.1] p-0.5">
                {(['mnd', 'aar'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPeriod(p)} data-testid={`wizard-period-${p}`}
                    className={`px-3 h-[26px] rounded-full text-[11px] font-semibold transition-all ${period === p ? 'bg-white text-[#0a0a0a]' : 'text-white/50 hover:text-white/80'}`}>
                    {p === 'mnd' ? 'Per mnd' : 'Per år'}
                  </button>
                ))}
              </div>
            </div>

            {/* Hovedtall */}
            <p className="text-[13px] text-white/45 mb-2">Estimert utbetaling til deg</p>
            <p className="text-[52px] xl:text-[60px] font-bold leading-none tracking-[-0.03em] mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              <AnimatedNumber value={payout * mult} /> <span className="text-[15px] font-medium text-white/60">kr/{period === 'aar' ? 'år' : 'mnd'}</span>
            </p>

            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-white/60">Din andel</span>
              <span className="text-[11px] font-semibold text-[#d298ff] tabular-nums">Du beholder {keptPct.toFixed(0)} %</span>
            </div>
            <div className="h-[7px] rounded-full bg-white/[0.09] overflow-hidden flex mb-8">
              <div className="h-full bg-gradient-to-r from-[#d298ff] to-[#9b6cc4] rounded-full transition-all duration-700" style={{ width: `${keptPct}%`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
            </div>

            {/* Linjer */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-[13px] text-white/55"><Home className="w-3.5 h-3.5 text-white/55" /> Leieinntekt{uplift > 0 ? ' (m/dynamisk)' : ''}</span>
                <span className="text-[14px] font-semibold tabular-nums"><AnimatedNumber value={effRent * mult} /> kr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-[13px] text-white/55"><Wallet className="w-3.5 h-3.5 text-white/55" /> {level?.name} ({level?.pct} %)</span>
                <span className="text-[14px] font-semibold text-white/85 tabular-nums">−<AnimatedNumber value={fee * mult} /> kr</span>
              </div>
              {visibleAddons.filter((a: any) => addons.includes(a.key)).map((a: any) => (
                <div key={a.key} className="flex items-center justify-between">
                  <span className="text-[12.5px] text-white/45 truncate pr-3 pl-6">{a.name}</span>
                  <span className="text-[12.5px] text-white/70 tabular-nums whitespace-nowrap">{fmt(a.price)} kr <span className="text-white/55">engangs</span></span>
                </div>
              ))}
              {onceTotal > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.07]">
                  <span className="text-[12.5px] text-white/45 pl-6">Engangs totalt</span>
                  <span className="text-[13px] font-semibold text-white/85 tabular-nums">{fmt(onceTotal)} kr</span>
                </div>
              )}
            </div>

            {/* Levende årsgraf */}
            <div className="rounded-2xl bg-white/[0.045] border border-white/[0.08] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Inntekt gjennom året</p>
                {uplift > 0 && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#d298ff]"><Sparkles className="w-3 h-3" /> +{Math.round(uplift * 100)} % med 10+2</span>}
              </div>
              <IncomeChart rent={rent} hybrid={uplift > 0} />
              <p className="text-[10.5px] text-white/55 mt-3">Illustrasjon — estimert brutto årsinntekt {fmt(effRent * 12)} kr</p>
            </div>
          </div>

          <div className="relative shrink-0 px-10 xl:px-12 py-5 border-t border-white/[0.07] flex items-center gap-x-5 gap-y-1 flex-wrap">
            {[{ i: ShieldCheck, t: 'Gratis vurdering' }, { i: Clock, t: 'Svar innen 24 timer' }, { i: Check, t: 'Ingen binding' }].map(({ i: I, t }) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-[11.5px] text-white/60"><I className="w-3 h-3 text-[#d298ff]/70" /> {t}</span>
            ))}
          </div>
        </aside>
      </div>

      {/* Mobil: ekspanderbar sticky oppsummering */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {mobileOpen && (
          <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.08] px-6 pt-5 pb-3 dh-fade-up">
            <div className="space-y-2.5">
              <div className="flex justify-between"><span className="text-[12.5px] text-white/50">Leieinntekt{uplift > 0 ? ' (m/dynamisk)' : ''}</span><span className="text-[12.5px] text-white/85 tabular-nums">{fmt(effRent)} kr/mnd</span></div>
              <div className="flex justify-between"><span className="text-[12.5px] text-white/50">{level?.name} ({level?.pct} %)</span><span className="text-[12.5px] text-white/85 tabular-nums">−{fmt(fee)} kr/mnd</span></div>
              {visibleAddons.filter((a: any) => addons.includes(a.key)).map((a: any) => (
                <div key={a.key} className="flex justify-between"><span className="text-[12px] text-white/60 truncate pr-3">{a.name}</span><span className="text-[12px] text-white/70 tabular-nums">{fmt(a.price)} kr</span></div>
              ))}
              <div className="h-[6px] rounded-full bg-white/[0.09] overflow-hidden flex mt-1"><div className="h-full bg-gradient-to-r from-[#d298ff] to-[#9b6cc4] rounded-full" style={{ width: `${keptPct}%` }} /></div>
            </div>
          </div>
        )}
        <button type="button" onClick={() => setMobileOpen((o) => !o)} data-testid="wizard-mobile-bar"
          className="w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.08] px-5 py-3.5 flex items-center justify-between"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
          <div className="text-left">
            <p className="text-[10.5px] text-white/45 uppercase tracking-[0.1em]">Utbetaling til deg</p>
            <p className="text-[18px] font-bold text-white leading-tight tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(payout)} kr/mnd</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10.5px] text-white/45 uppercase tracking-[0.1em]">Honorar{onceTotal > 0 ? ' + engangs' : ''}</p>
              <p className="text-[13px] font-semibold text-[#d298ff] tabular-nums">{fmt(fee)} kr/mnd{onceTotal > 0 ? ` · ${fmt(onceTotal)} kr` : ''}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-white/60 transition-transform duration-300 ${mobileOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>
    </div>
  );
}
