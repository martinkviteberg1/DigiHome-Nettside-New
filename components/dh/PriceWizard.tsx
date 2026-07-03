'use client';

// ---------------------------------------------------------------------------
// Priskalkulator v2 — «world class 2026» konfigurator.
// Nytt i v2: personaliserte priser på nivåkortene, 10+2-visualisering,
// ikoner + anbefalt-logikk på tillegg, mnd/år-veksler, «du beholder X %»
// split-bar, redigerbar oppsummering før innsending, sessionStorage-persistens,
// fremdriftslinje og ekspanderbar mobil-oppsummering.
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import {
  Check, Minus, ArrowRight, ArrowLeft, Sparkles, Loader2, MapPin, ShieldCheck,
  PartyPopper, Megaphone, Camera, Users, Scale, Home, Wallet, ChevronUp, Pencil, Lightbulb,
} from 'lucide-react';

const fmt = (n: number) => Math.round(n).toLocaleString('nb-NO');
const STEPS = ['Boligen', 'Servicenivå', 'Utleiemodell', 'Tillegg', 'Kontakt'];
const STORE_KEY = 'dh_wizard_v1';
const ADDON_ICONS: any = { markedspakke: Megaphone, foto: Camera, kredittsjekk: ShieldCheck, innflytting: Sparkles, visningshjelp: Users, juridisk: Scale };

// Grovt Bergen-estimat for «usikker på leien?»-hintet
function rentEstimate(ptype: string, bedrooms: number) {
  if (ptype === 'Hybel') return 12500;
  const base: any = { 1: 15000, 2: 18500, 3: 23000, 4: 28000 };
  let est = base[Math.min(bedrooms, 4)] || 18500;
  if (ptype === 'Hus' || ptype === 'Rekkehus') est = Math.round(est * 1.1 / 500) * 500;
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

const Chip = ({ active, onClick, children, testId }: any) => (
  <button type="button" onClick={onClick} data-testid={testId}
    className={`px-4 h-[42px] rounded-full text-[13.5px] font-medium border transition-all duration-300 ${
      active ? 'bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-[0_6px_18px_-6px_rgba(10,10,10,0.4)]' : 'bg-white text-[#444] border-[#e5e0d8] hover:border-[#c9bfe0] hover:-translate-y-px'
    }`}>
    {children}
  </button>
);

const StepTitle = ({ children, sub }: any) => (
  <div className="mb-9">
    <h2 className="text-[28px] sm:text-[38px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{children}</h2>
    {sub && <p className="text-[15px] text-[#777] leading-relaxed max-w-[54ch]">{sub}</p>}
  </div>
);

// 12-måneders visualisering av 10+2-modellen
function HybridViz({ active }: any) {
  return (
    <div className="mt-5">
      <div className="flex gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`flex-1 h-8 rounded-[5px] transition-all duration-500 ${
            i >= 10 ? (active ? 'bg-[#a765e0]' : 'bg-[#d9c9ef]') : (active ? 'bg-[#eee0fb]' : 'bg-[#f0ece6]')
          }`} style={{ transitionDelay: `${i * 30}ms` }} />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[11px] text-[#999]">10 mnd langtidsleie</span>
        <span className={`text-[11px] font-semibold ${active ? 'text-[#8b5fc0]' : 'text-[#999]'}`}>2 mnd korttid (høysesong)</span>
      </div>
    </div>
  );
}

export default function PriceWizard() {
  const [catalog, setCatalog] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
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

  // Katalog + gjenopprett valg (folk kommer tilbake — ikke mist fremdriften)
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

  // Persist valg
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
  const stepIndexForProgress = skipModel && step >= 3 ? step - 1 : step;
  const progressPct = Math.round((stepIndexForProgress / (totalSteps - 1)) * 100);

  const goTo = (s: number) => {
    let target = Math.max(0, Math.min(4, s));
    if (skipModel && target === 2) target = s > step ? 3 : 1;
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
    try { track('wizard_step', { step: target, name: STEPS[target] }); } catch (e) {}
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
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

  if (!catalog) {
    return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#a765e0]" /></div>;
  }

  // ── Suksess ──
  if (done) {
    return (
      <div className="max-w-[640px] mx-auto text-center py-14 px-6 dh-fade-up" data-testid="wizard-success">
        <div className="w-16 h-16 rounded-full bg-[#f5edfc] border border-[#e9d9fa] flex items-center justify-center mx-auto mb-7">
          <PartyPopper className="w-7 h-7 text-[#a765e0]" strokeWidth={1.6} />
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Takk, {form.name.split(' ')[0]}!</h1>
        <p className="text-[16px] text-[#666] leading-[1.75] mb-8">Pakken din er mottatt. En av oss kontakter deg <strong className="text-[#0a0a0a]">innen 24 timer</strong> med en konkret vurdering.</p>
        <div className="rounded-[20px] bg-[#0a0a0a] text-white p-6 mb-8 flex items-center justify-between gap-4 text-left">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#cf97fc] font-semibold">{level?.name} · {modelKey === 'hybrid' ? 'Dynamisk 10+2' : 'Langtid'}</p>
            <p className="text-[26px] font-bold mt-1" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(payout)} <span className="text-[13px] font-medium text-white/45">kr/mnd til deg</span></p>
          </div>
          {onceTotal > 0 && <div className="text-right"><p className="text-[11px] text-white/45">Engangs</p><p className="text-[16px] font-semibold tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(onceTotal)} kr</p></div>}
        </div>
        <div className="text-left bg-white rounded-[20px] border border-[#eeeae3] p-7 mb-10">
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
    );
  }

  const summaryRows = [
    { label: 'Boligen', value: `${ptype} · ${bedrooms} sov · ${fmt(rent)} kr/mnd${address ? ` · ${address}` : ''}`, jump: 0 },
    { label: 'Servicenivå', value: `${level?.name} (${level?.pct} %)`, jump: 1 },
    ...(!skipModel ? [{ label: 'Utleiemodell', value: model?.name || '', jump: 2 }] : []),
    { label: 'Tillegg', value: addons.length ? visibleAddons.filter((a: any) => addons.includes(a.key)).map((a: any) => a.name).join(', ') : 'Ingen', jump: 3 },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">

      {/* Stepper + fremdrift */}
      <div className="mb-10">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-3" data-testid="wizard-stepper">
          {STEPS.map((s, i) => {
            if (skipModel && i === 2) return null;
            const isDone = i < step, isActive = i === step;
            return (
              <React.Fragment key={s}>
                {i > 0 && !(skipModel && i === 3 && step < 3) && <span className={`hidden sm:block w-6 h-px shrink-0 ${i <= step ? 'bg-[#c9a8ec]' : 'bg-[#e8e4dd]'}`} />}
                <button type="button" onClick={() => i <= maxStep && goTo(i)}
                  className={`flex items-center gap-2 px-3.5 h-[36px] rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-300 shrink-0 ${
                    isActive ? 'bg-[#0a0a0a] text-white shadow-[0_6px_16px_-6px_rgba(10,10,10,0.45)]' : isDone ? 'bg-[#f5edfc] text-[#8b5fc0] hover:bg-[#efe2fb]' : 'bg-white border border-[#eee] text-[#bbb]'
                  }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <span className="tabular-nums">{i + 1}</span>}
                  <span className="hidden sm:inline">{s}</span>
                </button>
              </React.Fragment>
            );
          })}
          <span className="ml-auto hidden sm:block text-[12px] text-[#bbb] tabular-nums shrink-0 pl-4">{progressPct} %</span>
        </div>
        <div className="h-[3px] rounded-full bg-[#f0ece6] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#cf97fc] to-[#9b6cc4] transition-all duration-700" style={{ width: `${Math.max(progressPct, 4)}%`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-16 items-start">
        {/* ── VENSTRE ── */}
        <div key={step} className="dh-fade-up min-w-0">

          {step === 0 && (
            <div>
              <StepTitle sub="Tar under 2 minutter — du ser prisen live underveis.">Fortell oss om boligen</StepTitle>

              <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Adresse <span className="font-normal text-[#aaa]">(valgfritt)</span></label>
              <div className="flex items-center rounded-full bg-white border border-[#e5e0d8] focus-within:border-[#cf97fc]/60 focus-within:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all mb-9 max-w-[500px] relative z-30">
                <div className="pl-5"><MapPin className="w-[17px] h-[17px] text-[#999]" /></div>
                <AddressAutocomplete value={address} onChange={setAddress}
                  onSelect={(s: any) => { setAddress(s.address); setPostal(s.postalCode || ''); }}
                  placeholder="Gateadresse, sted" showIcon={false} dataTestId="wizard-address-input"
                  inputClassName="flex-1 h-[54px] px-3.5 text-[15px] bg-transparent border-0 outline-none focus:outline-none w-full placeholder:text-[#999]" className="flex-1" />
              </div>

              <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Forventet månedsleie</label>
              <p className="text-[38px] sm:text-[44px] font-bold text-[#0a0a0a] tracking-[-0.02em] mb-4 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                <AnimatedNumber value={rent} /> <span className="text-[16px] font-medium text-[#999]">kr/mnd</span>
              </p>
              <input type="range" min={8000} max={45000} step={500} value={rent} onChange={(e) => setRent(Number(e.target.value))}
                className="dh-range w-full max-w-[500px] cursor-pointer"
                style={{ background: `linear-gradient(to right, #a765e0 ${((rent - 8000) / 37000) * 100}%, #ece8e1 ${((rent - 8000) / 37000) * 100}%)` }}
                data-testid="wizard-rent-slider" />
              <div className="flex justify-between max-w-[500px] text-[11px] text-[#bbb] mt-2"><span>8 000 kr</span><span>45 000 kr</span></div>
              {Math.abs(rent - est) > 1500 && (
                <button type="button" onClick={() => setRent(est)}
                  className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f5edfc] border border-[#e9d9fa] text-[12px] font-medium text-[#8b5fc0] hover:bg-[#efe2fb] transition-colors" data-testid="wizard-rent-hint">
                  <Lightbulb className="w-3.5 h-3.5" /> Usikker? Typisk for {bedrooms === 4 ? '4+' : bedrooms}-sov {ptype.toLowerCase()} i Bergen: ~{fmt(est)} kr
                </button>
              )}

              <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5 mt-9" style={{ fontFamily: 'var(--font-heading)' }}>Boligtype</label>
              <div className="flex flex-wrap gap-2.5 mb-8">
                {['Leilighet', 'Hus', 'Rekkehus', 'Hybel'].map((t) => <Chip key={t} active={ptype === t} onClick={() => setPtype(t)} testId={`wizard-type-${t}`}>{t}</Chip>)}
              </div>
              <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Soverom</label>
              <div className="flex flex-wrap gap-2.5">
                {[1, 2, 3, 4].map((b) => <Chip key={b} active={bedrooms === b} onClick={() => setBedrooms(b)} testId={`wizard-bed-${b}`}>{b === 4 ? '4+' : b}</Chip>)}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <StepTitle sub="Velg servicenivået som passer deg — du kan bytte senere.">Hvor mye vil du gjøre selv?</StepTitle>
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
                      {l.badge && <span className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.1em] ${active ? 'bg-[#0a0a0a] text-[#cf97fc]' : 'bg-[#f5edfc] text-[#8b5fc0] border border-[#e9d9fa]'}`}>{l.badge}</span>}
                      <div className="flex items-start justify-between gap-3 mt-1 mb-1">
                        <h3 className="text-[21px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{l.name}</h3>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${active ? 'bg-[#0a0a0a] border-[#0a0a0a]' : 'border-[#ddd]'}`}>{active && <Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={3} />}</span>
                      </div>
                      <p className="text-[13px] text-[#888] mb-4">{l.tagline}</p>
                      {/* Personalisert pris for DERES bolig */}
                      <div className={`rounded-2xl px-4 py-3.5 mb-5 transition-colors ${active ? 'bg-[#0a0a0a]' : 'bg-[#faf8f5] border border-[#f0ece6]'}`}>
                        <p className={`text-[11px] uppercase tracking-[0.1em] font-semibold ${active ? 'text-[#cf97fc]' : 'text-[#9b6cc4]'}`}>{l.pct} % av leien — for din bolig:</p>
                        <p className={`text-[24px] font-bold leading-tight tabular-nums ${active ? 'text-white' : 'text-[#0a0a0a]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{fmt(lFee)} <span className={`text-[12px] font-medium ${active ? 'text-white/45' : 'text-[#aaa]'}`}>kr/mnd</span></p>
                      </div>
                      <div className="space-y-2 flex-1">
                        {(l.included || []).map((f: string) => (
                          <div key={f} className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[#a765e0] mt-0.5 shrink-0" strokeWidth={2.4} /><span className="text-[13px] text-[#333] leading-snug">{f}</span></div>
                        ))}
                        {(l.notIncluded || []).map((f: string) => (
                          <div key={f} className="flex items-start gap-2.5 opacity-45"><Minus className="w-4 h-4 text-[#bbb] mt-0.5 shrink-0" /><span className="text-[13px] text-[#888] leading-snug line-through decoration-[#ccc]">{f}</span></div>
                        ))}
                      </div>
                      {l.minMonthly ? <p className="text-[11px] text-[#aaa] mt-4">Minstepris {fmt(l.minMonthly)} kr/mnd</p> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && !skipModel && (
            <div>
              <StepTitle sub="Med Fullforvaltning kan vi kombinere langtid og korttid for høyere inntekt.">Velg utleiemodell</StepTitle>
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
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#0a0a0a] border-[#0a0a0a]' : 'border-[#ddd]'}`}>{active && <Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={3} />}</span>
                      </div>
                      <p className="text-[13.5px] text-[#777] leading-relaxed">{m.desc}</p>
                      {m.key === 'hybrid' ? (
                        <>
                          <HybridViz active={active} />
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f5edfc] border border-[#e9d9fa]">
                            <Sparkles className="w-3.5 h-3.5 text-[#a765e0]" />
                            <span className="text-[12px] font-semibold text-[#8b5fc0]">Estimert +{fmt(extra)} kr/mnd for din bolig</span>
                          </div>
                        </>
                      ) : (
                        <div className="mt-5">
                          <div className="flex gap-1">{Array.from({ length: 12 }).map((_, i) => <div key={i} className={`flex-1 h-8 rounded-[5px] ${active ? 'bg-[#eee0fb]' : 'bg-[#f0ece6]'}`} />)}</div>
                          <p className="text-[11px] text-[#999] mt-2">12 mnd stabil langtidsleie</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepTitle sub="Engangsprodukter som får boligen raskere ut — og leid ut til bedre pris. Helt valgfritt.">Vil du ha en flying start?</StepTitle>
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
                          <Icon className={`w-[18px] h-[18px] transition-colors ${active ? 'text-[#cf97fc]' : 'text-[#a765e0]'}`} strokeWidth={1.8} />
                        </div>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#0a0a0a] border-[#0a0a0a]' : 'border-[#ddd]'}`}>{active && <Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={3} />}</span>
                      </div>
                      <h3 className="text-[15.5px] font-bold text-[#0a0a0a] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{a.name}</h3>
                      <p className="text-[12.5px] text-[#888] leading-relaxed mb-3">{a.desc}</p>
                      <p className="text-[15px] font-bold text-[#0a0a0a] tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(a.price)} kr <span className="text-[11px] font-normal text-[#aaa]">engangs</span></p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <StepTitle sub="Du får en uforpliktende vurdering innen 24 timer. Ingen binding.">Siste steg — hvem skal vi kontakte?</StepTitle>

              {/* Oppsummering med rediger-lenker */}
              <div className="rounded-[20px] bg-white border border-[#eeeae3] divide-y divide-[#f3f0ea] mb-8 overflow-hidden" data-testid="wizard-summary">
                {summaryRows.map((r: any) => (
                  <div key={r.label} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-[12px] font-semibold text-[#999] w-[92px] shrink-0 uppercase tracking-[0.04em]">{r.label}</span>
                    <span className="text-[13.5px] text-[#333] flex-1 min-w-0 truncate">{r.value}</span>
                    <button type="button" onClick={() => goTo(r.jump)} data-testid={`wizard-edit-${r.jump}`}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#9b6cc4] hover:text-[#7a4bb0] transition-colors shrink-0"><Pencil className="w-3 h-3" /> Endre</button>
                  </div>
                ))}
              </div>

              <form onSubmit={submit} className="max-w-[500px] space-y-4">
                <input type="text" required placeholder="Fullt navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="wizard-name-input"
                  className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e5e0d8] text-[15px] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#999]" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <input type="email" placeholder="E-post" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="wizard-email-input"
                    className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e5e0d8] text-[15px] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#999]" />
                  <input type="tel" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="wizard-phone-input"
                    className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e5e0d8] text-[15px] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#999]" />
                </div>
                {error && <p className="text-[13px] text-rose-500 px-2">{error}</p>}
                <Button type="submit" disabled={sending} data-testid="wizard-submit-button"
                  className="w-full h-[58px] rounded-full bg-[#0a0a0a] text-white text-[15px] font-semibold hover:shadow-[0_14px_40px_-8px_rgba(167,101,224,0.55)] transition-all duration-300 active:scale-[0.98] gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send inn pakken min <ArrowRight className="w-4 h-4" /></>}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-[12px] text-[#999] pt-1"><ShieldCheck className="w-3.5 h-3.5 text-[#a765e0]" /> Gratis og uforpliktende · Svar innen 24 timer · Ingen binding</p>
              </form>
            </div>
          )}

          {step < 4 && (
            <div className="flex items-center gap-4 mt-12">
              {step > 0 && (
                <button type="button" onClick={() => goTo(step - 1)} className="inline-flex items-center gap-2 text-[14px] font-medium text-[#888] hover:text-[#0a0a0a] transition-colors" data-testid="wizard-back-button">
                  <ArrowLeft className="w-4 h-4" /> Tilbake
                </button>
              )}
              <Button onClick={() => goTo(step + 1)} data-testid="wizard-next-button"
                className="rounded-full bg-[#0a0a0a] text-white h-[54px] px-9 text-[14px] font-semibold hover:shadow-[0_14px_40px_-8px_rgba(167,101,224,0.55)] transition-all duration-300 active:scale-[0.98] gap-2 ml-auto sm:ml-0">
                Neste steg <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* ── HØYRE: Live prispanel v2 ── */}
        <aside className="lg:sticky lg:top-28 hidden lg:block" data-testid="wizard-price-panel">
          <div className="rounded-[26px] bg-[#0a0a0a] text-white p-8 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.18) 0%, transparent 65%)' }} />
            <div className="absolute -bottom-32 -left-24 w-[260px] h-[260px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(155,108,196,0.1) 0%, transparent 62%)' }} />

            <div className="relative flex items-center justify-between mb-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cf97fc]">Din pakke</p>
              <div className="flex rounded-full bg-white/[0.07] border border-white/[0.1] p-0.5">
                {(['mnd', 'aar'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPeriod(p)} data-testid={`wizard-period-${p}`}
                    className={`px-3 h-[26px] rounded-full text-[11px] font-semibold transition-all ${period === p ? 'bg-white text-[#0a0a0a]' : 'text-white/50 hover:text-white/80'}`}>
                    {p === 'mnd' ? 'Per mnd' : 'Per år'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-[13px] text-white/55"><Home className="w-3.5 h-3.5 text-white/30" /> Leieinntekt{uplift > 0 ? ' (m/dynamisk)' : ''}</span>
                <span className="text-[14px] font-semibold tabular-nums"><AnimatedNumber value={effRent * mult} /> kr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-[13px] text-white/55"><Wallet className="w-3.5 h-3.5 text-white/30" /> {level?.name} ({level?.pct} %)</span>
                <span className="text-[14px] font-semibold text-white/85 tabular-nums">−<AnimatedNumber value={fee * mult} /> kr</span>
              </div>
              {visibleAddons.filter((a: any) => addons.includes(a.key)).map((a: any) => (
                <div key={a.key} className="flex items-center justify-between">
                  <span className="text-[12.5px] text-white/45 truncate pr-3 pl-6">{a.name}</span>
                  <span className="text-[12.5px] text-white/70 tabular-nums whitespace-nowrap">{fmt(a.price)} kr <span className="text-white/35">engangs</span></span>
                </div>
              ))}

              <div className="border-t border-white/[0.1] pt-5 mt-2">
                <div className="flex items-end justify-between mb-1.5">
                  <p className="text-[12px] text-white/45">Estimert utbetaling til deg</p>
                  <span className="text-[11px] font-semibold text-[#cf97fc] tabular-nums">Du beholder {keptPct.toFixed(0)} %</span>
                </div>
                <p className="text-[38px] font-bold leading-none tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>
                  <AnimatedNumber value={payout * mult} /> <span className="text-[14px] font-medium text-white/45">kr/{period === 'aar' ? 'år' : 'mnd'}</span>
                </p>
                {/* Split-bar: din andel vs honorar */}
                <div className="mt-4 h-[7px] rounded-full bg-white/[0.09] overflow-hidden flex">
                  <div className="h-full bg-gradient-to-r from-[#cf97fc] to-[#9b6cc4] rounded-full transition-all duration-700" style={{ width: `${keptPct}%`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10.5px] text-white/40">Din andel</span>
                  <span className="text-[10.5px] text-white/40">DigiHome {level?.pct} %</span>
                </div>
                {onceTotal > 0 && <p className="text-[12.5px] text-white/45 mt-4">+ engangskostnader: <span className="text-white/85 font-semibold tabular-nums">{fmt(onceTotal)} kr</span></p>}
              </div>
            </div>
          </div>
          <p className="text-[11.5px] text-[#aaa] leading-relaxed mt-4 px-2">Estimat basert på dine valg. Endelig pris bekreftes i den uforpliktende vurderingen.</p>
        </aside>
      </div>

      {/* Mobil: ekspanderbar sticky oppsummering */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {mobileOpen && (
          <div className="bg-[#0a0a0a]/97 backdrop-blur-xl border-t border-white/[0.08] px-6 pt-5 pb-3 dh-fade-up">
            <div className="space-y-2.5">
              <div className="flex justify-between"><span className="text-[12.5px] text-white/50">Leieinntekt{uplift > 0 ? ' (m/dynamisk)' : ''}</span><span className="text-[12.5px] text-white/85 tabular-nums">{fmt(effRent)} kr/mnd</span></div>
              <div className="flex justify-between"><span className="text-[12.5px] text-white/50">{level?.name} ({level?.pct} %)</span><span className="text-[12.5px] text-white/85 tabular-nums">−{fmt(fee)} kr/mnd</span></div>
              {visibleAddons.filter((a: any) => addons.includes(a.key)).map((a: any) => (
                <div key={a.key} className="flex justify-between"><span className="text-[12px] text-white/40 truncate pr-3">{a.name}</span><span className="text-[12px] text-white/70 tabular-nums">{fmt(a.price)} kr</span></div>
              ))}
              <div className="h-[6px] rounded-full bg-white/[0.09] overflow-hidden flex mt-1"><div className="h-full bg-gradient-to-r from-[#cf97fc] to-[#9b6cc4] rounded-full" style={{ width: `${keptPct}%` }} /></div>
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
              <p className="text-[13px] font-semibold text-[#cf97fc] tabular-nums">{fmt(fee)} kr/mnd{onceTotal > 0 ? ` · ${fmt(onceTotal)} kr` : ''}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-white/40 transition-transform duration-300 ${mobileOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>
    </div>
  );
}
