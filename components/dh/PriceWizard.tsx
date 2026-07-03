'use client';

// ---------------------------------------------------------------------------
// Priskalkulator-wizard — «state of the art 2026» konfigurator.
// Katalogen hentes fra /api/wizard/catalog (redigerbar i settings-collection,
// byttes til plattformens katalog-API i v2). Innsending gjenbruker hele
// lead-pipelinen (attribusjon, CRM-videresending, e-postvarsler).
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { getLeadAttribution, track } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';
import { Check, Minus, ArrowRight, ArrowLeft, Sparkles, Loader2, MapPin, ShieldCheck, PartyPopper } from 'lucide-react';

const fmt = (n: number) => Math.round(n).toLocaleString('nb-NO');

const STEPS = ['Boligen', 'Servicenivå', 'Utleiemodell', 'Tillegg', 'Kontakt'];

// Animert tall — myk lerp ved endring (Tesla-følelse)
function AnimatedNumber({ value, suffix = '' }: any) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<any>(null);
  useEffect(() => {
    const from = display, to = value, start = performance.now(), dur = 350;
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

export default function PriceWizard() {
  const [catalog, setCatalog] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Valg
  const [address, setAddress] = useState('');
  const [postal, setPostal] = useState('');
  const [rent, setRent] = useState(18000);
  const [ptype, setPtype] = useState('Leilighet');
  const [bedrooms, setBedrooms] = useState(2);
  const [levelKey, setLevelKey] = useState('fullforvaltning');
  const [modelKey, setModelKey] = useState('langtid');
  const [addons, setAddons] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    fetch('/api/wizard/catalog').then((r) => r.json()).then((d) => setCatalog(d.catalog)).catch(() => {});
    try { track('wizard_step', { step: 0, name: STEPS[0] }); } catch (e) {}
    try { trackLeadStart('priskalkulator'); } catch (e) {}
  }, []);

  const level = useMemo(() => catalog?.serviceLevels?.find((l: any) => l.key === levelKey), [catalog, levelKey]);
  const model = useMemo(() => catalog?.models?.find((m: any) => m.key === modelKey), [catalog, modelKey]);
  const availableModels = useMemo(() => (catalog?.models || []).filter((m: any) => (level?.models || []).includes(m.key)), [catalog, level]);
  const visibleAddons = useMemo(() => (catalog?.addons || []).filter((a: any) => !a.for || a.for === levelKey), [catalog, levelKey]);

  // Prislogikk
  const uplift = modelKey === 'hybrid' ? (model?.upliftPct || 25) / 100 : 0;
  const effRent = rent * (1 + uplift);
  const fee = level ? Math.max((effRent * level.pct) / 100, level.minMonthly || 0) : 0;
  const payout = effRent - fee;
  const onceTotal = visibleAddons.filter((a: any) => addons.includes(a.key)).reduce((s: number, a: any) => s + (a.price || 0), 0);

  // Hopp over modell-steget for Selvbetjent (kun langtid)
  const skipModel = (level?.models || []).length <= 1;

  const goTo = (s: number) => {
    let target = s;
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
          address, postal_code: postal,
          property_type: ptype, bedrooms,
          rental_model: `${levelKey}:${modelKey}`,
          lead_type: 'huseier', source: 'priskalkulator',
          notes: buildNotes(),
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      const data = await res.json();
      if (!res.ok || (!data.success && !data.ok)) throw new Error(data.error || 'Noe gikk galt');
      try { trackLead({ formId: 'priskalkulator', source: 'priskalkulator', leadId: data?.id || data?.lead?.id, email: form.email, phone: form.phone }); } catch (e2) {}
      try { track('wizard_complete', { level: levelKey, model: modelKey, addons: addons.length, fee: Math.round(fee), once: onceTotal }); } catch (e2) {}
      setDone(true);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e2) {}
    } catch (err: any) {
      setError('Kunne ikke sende inn — prøv igjen, eller ring oss.');
    } finally { setSending(false); }
  };

  if (!catalog) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#a765e0]" />
      </div>
    );
  }

  // ── Suksess-skjerm ──
  if (done) {
    return (
      <div className="max-w-[620px] mx-auto text-center py-16 px-6 dh-fade-up" data-testid="wizard-success">
        <div className="w-16 h-16 rounded-full bg-[#f5edfc] border border-[#e9d9fa] flex items-center justify-center mx-auto mb-7">
          <PartyPopper className="w-7 h-7 text-[#a765e0]" strokeWidth={1.6} />
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.03em] text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Takk, {form.name.split(' ')[0]}!
        </h1>
        <p className="text-[16px] text-[#666] leading-[1.75] mb-10">
          Pakken din er mottatt. En av oss kontakter deg <strong className="text-[#0a0a0a]">innen 24 timer</strong> med en konkret vurdering av boligen din.
        </p>
        <div className="text-left bg-white rounded-[20px] border border-[#eeeae3] p-7 mb-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9b6cc4] mb-4">Hva skjer nå?</p>
          {[
            'Vi ser på boligen din og markedet i området',
            'Du får en uforpliktende prisvurdering og gjennomgang av pakken',
            'Er du fornøyd, signerer du digitalt — og vi setter i gang',
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3.5 py-2.5">
              <span className="w-6 h-6 rounded-full bg-[#f5edfc] text-[#8b5fc0] text-[12px] font-bold flex items-center justify-center shrink-0" style={{ fontFamily: 'var(--font-heading)' }}>{i + 1}</span>
              <p className="text-[14.5px] text-[#444] leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-medium text-[#666] hover:text-[#0a0a0a] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Tilbake til forsiden
        </Link>
      </div>
    );
  }

  const stepLabelIdx = skipModel && step >= 3 ? step : step; // visning følger STEPS

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
      {/* Stepper */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-10 overflow-x-auto pb-1" data-testid="wizard-stepper">
        {STEPS.map((s, i) => {
          if (skipModel && i === 2) return null;
          const isDone = i < step, isActive = i === step;
          return (
            <button key={s} type="button" onClick={() => i <= maxStep && goTo(i)}
              className={`flex items-center gap-2 px-3.5 h-[36px] rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-300 ${
                isActive ? 'bg-[#0a0a0a] text-white' : isDone ? 'bg-[#f5edfc] text-[#8b5fc0] hover:bg-[#efe2fb]' : 'bg-white border border-[#eee] text-[#bbb]'
              }`}>
              {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <span className="tabular-nums">{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-start">
        {/* ── VENSTRE: Steg-innhold ── */}
        <div key={step} className="dh-fade-up min-w-0">

          {step === 0 && (
            <div>
              <h1 className="text-[30px] sm:text-[40px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Fortell oss om boligen</h1>
              <p className="text-[15px] text-[#777] leading-relaxed mb-9">Tar under 2 minutter — du ser prisen underveis.</p>

              <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Adresse <span className="font-normal text-[#aaa]">(valgfritt)</span></label>
              <div className="flex items-center rounded-full bg-white border border-[#e5e0d8] focus-within:border-[#cf97fc]/60 focus-within:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all mb-8 max-w-[480px]">
                <div className="pl-5"><MapPin className="w-[17px] h-[17px] text-[#999]" /></div>
                <AddressAutocomplete
                  value={address} onChange={setAddress}
                  onSelect={(s: any) => { setAddress(s.address); setPostal(s.postalCode || ''); }}
                  placeholder="Gateadresse, sted" showIcon={false} dataTestId="wizard-address-input"
                  inputClassName="flex-1 h-[54px] px-3.5 text-[15px] bg-transparent border-0 outline-none focus:outline-none w-full placeholder:text-[#999]"
                  className="flex-1"
                />
              </div>

              <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Forventet månedsleie</label>
              <p className="text-[34px] font-bold text-[#0a0a0a] tracking-tight mb-3" style={{ fontFamily: 'var(--font-heading)' }}><AnimatedNumber value={rent} /> <span className="text-[16px] font-medium text-[#999]">kr/mnd</span></p>
              <input type="range" min={8000} max={45000} step={500} value={rent} onChange={(e) => setRent(Number(e.target.value))}
                className="w-full max-w-[480px] accent-[#a765e0] h-1.5 cursor-pointer" data-testid="wizard-rent-slider" />
              <div className="flex justify-between max-w-[480px] text-[11px] text-[#bbb] mt-1.5 mb-9"><span>8 000 kr</span><span>45 000 kr</span></div>

              <label className="block text-[13px] font-semibold text-[#0a0a0a] mb-2.5" style={{ fontFamily: 'var(--font-heading)' }}>Boligtype</label>
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
              <h1 className="text-[30px] sm:text-[40px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Hvor mye vil du gjøre selv?</h1>
              <p className="text-[15px] text-[#777] leading-relaxed mb-9 max-w-[52ch]">Velg servicenivået som passer deg — du kan bytte senere.</p>
              <div className="grid sm:grid-cols-2 gap-5">
                {catalog.serviceLevels.map((l: any) => {
                  const active = levelKey === l.key;
                  return (
                    <button key={l.key} type="button" data-testid={`wizard-level-${l.key}`}
                      onClick={() => { setLevelKey(l.key); if (!(l.models || []).includes(modelKey)) setModelKey((l.models || ['langtid'])[0]); }}
                      className={`relative text-left rounded-[22px] p-7 border-2 transition-all duration-400 ${
                        active ? 'border-[#0a0a0a] bg-white shadow-[0_24px_50px_-24px_rgba(20,10,40,0.25)]' : 'border-[#eeeae3] bg-white hover:border-[#d9c9ef] hover:-translate-y-0.5'
                      }`}>
                      {l.badge && <span className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.1em] ${active ? 'bg-[#0a0a0a] text-[#cf97fc]' : 'bg-[#f5edfc] text-[#8b5fc0] border border-[#e9d9fa]'}`}>{l.badge}</span>}
                      <div className="flex items-baseline justify-between mb-1 mt-1">
                        <h3 className="text-[20px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{l.name}</h3>
                        <p className="text-[26px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{l.pct}<span className="text-[14px] text-[#999] font-medium"> %</span></p>
                      </div>
                      <p className="text-[13px] text-[#888] mb-5">{l.tagline}</p>
                      <div className="space-y-2">
                        {(l.included || []).map((f: string) => (
                          <div key={f} className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[#a765e0] mt-0.5 shrink-0" strokeWidth={2.4} /><span className="text-[13px] text-[#333] leading-snug">{f}</span></div>
                        ))}
                        {(l.notIncluded || []).map((f: string) => (
                          <div key={f} className="flex items-start gap-2.5 opacity-50"><Minus className="w-4 h-4 text-[#bbb] mt-0.5 shrink-0" /><span className="text-[13px] text-[#888] leading-snug line-through decoration-[#ccc]">{f}</span></div>
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
              <h1 className="text-[30px] sm:text-[40px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Velg utleiemodell</h1>
              <p className="text-[15px] text-[#777] leading-relaxed mb-9 max-w-[52ch]">Med Fullforvaltning kan vi kombinere langtid og korttid for høyere inntekt.</p>
              <div className="grid sm:grid-cols-2 gap-5">
                {availableModels.map((m: any) => {
                  const active = modelKey === m.key;
                  const extra = m.upliftPct ? rent * (m.upliftPct / 100) : 0;
                  return (
                    <button key={m.key} type="button" data-testid={`wizard-model-${m.key}`} onClick={() => setModelKey(m.key)}
                      className={`relative text-left rounded-[22px] p-7 border-2 transition-all duration-400 ${
                        active ? 'border-[#0a0a0a] bg-white shadow-[0_24px_50px_-24px_rgba(20,10,40,0.25)]' : 'border-[#eeeae3] bg-white hover:border-[#d9c9ef] hover:-translate-y-0.5'
                      }`}>
                      <h3 className="text-[19px] font-bold text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{m.name}</h3>
                      <p className="text-[13.5px] text-[#777] leading-relaxed">{m.desc}</p>
                      {m.upliftPct ? (
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f5edfc] border border-[#e9d9fa]">
                          <Sparkles className="w-3.5 h-3.5 text-[#a765e0]" />
                          <span className="text-[12px] font-semibold text-[#8b5fc0]">Estimert +{fmt(extra)} kr/mnd for din bolig</span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-[30px] sm:text-[40px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Vil du ha en flying start?</h1>
              <p className="text-[15px] text-[#777] leading-relaxed mb-9 max-w-[52ch]">Engangsprodukter som får boligen raskere ut — og leid ut til bedre pris. Helt valgfritt.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {visibleAddons.map((a: any) => {
                  const active = addons.includes(a.key);
                  return (
                    <button key={a.key} type="button" data-testid={`wizard-addon-${a.key}`}
                      onClick={() => setAddons((prev) => active ? prev.filter((k) => k !== a.key) : [...prev, a.key])}
                      className={`relative text-left rounded-[20px] p-6 border-2 transition-all duration-300 ${
                        active ? 'border-[#0a0a0a] bg-white shadow-[0_18px_40px_-20px_rgba(20,10,40,0.22)]' : 'border-[#eeeae3] bg-white hover:border-[#d9c9ef]'
                      }`}>
                      {a.popular && <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] bg-[#f5edfc] text-[#8b5fc0] border border-[#e9d9fa]">Populær</span>}
                      <div className="flex items-start justify-between gap-3 mb-1.5 mt-0.5">
                        <h3 className="text-[15.5px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{a.name}</h3>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#0a0a0a] border-[#0a0a0a]' : 'border-[#ddd]'}`}>
                          {active && <Check className="w-3.5 h-3.5 text-[#cf97fc]" strokeWidth={3} />}
                        </span>
                      </div>
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
              <h1 className="text-[30px] sm:text-[40px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Siste steg — hvem skal vi kontakte?</h1>
              <p className="text-[15px] text-[#777] leading-relaxed mb-9 max-w-[52ch]">Du får en uforpliktende vurdering innen 24 timer. Ingen binding.</p>
              <form onSubmit={submit} className="max-w-[480px] space-y-4">
                <input type="text" required placeholder="Fullt navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="wizard-name-input"
                  className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e5e0d8] text-[15px] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#999]" />
                <input type="email" placeholder="E-post" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  data-testid="wizard-email-input"
                  className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e5e0d8] text-[15px] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#999]" />
                <input type="tel" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="wizard-phone-input"
                  className="w-full h-[54px] px-5 rounded-full bg-white border border-[#e5e0d8] text-[15px] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_4px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#999]" />
                {error && <p className="text-[13px] text-rose-500 px-2">{error}</p>}
                <Button type="submit" disabled={sending} data-testid="wizard-submit-button"
                  className="w-full h-[56px] rounded-full bg-[#0a0a0a] text-white text-[15px] font-semibold hover:shadow-[0_12px_36px_-8px_rgba(167,101,224,0.5)] transition-all duration-300 active:scale-[0.98] gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send inn pakken min <ArrowRight className="w-4 h-4" /></>}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-[12px] text-[#999] pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#a765e0]" /> Gratis og uforpliktende · Svar innen 24 timer
                </p>
              </form>
            </div>
          )}

          {/* Navigasjon */}
          {step < 4 && (
            <div className="flex items-center gap-4 mt-12">
              {step > 0 && (
                <button type="button" onClick={() => goTo(step - 1)} className="inline-flex items-center gap-2 text-[14px] font-medium text-[#888] hover:text-[#0a0a0a] transition-colors" data-testid="wizard-back-button">
                  <ArrowLeft className="w-4 h-4" /> Tilbake
                </button>
              )}
              <Button onClick={() => goTo(step + 1)} data-testid="wizard-next-button"
                className="rounded-full bg-[#0a0a0a] text-white h-[52px] px-8 text-[14px] font-semibold hover:shadow-[0_12px_36px_-8px_rgba(167,101,224,0.5)] transition-all duration-300 active:scale-[0.98] gap-2 ml-auto sm:ml-0">
                Neste steg <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* ── HØYRE: Live prispanel ── */}
        <aside className="lg:sticky lg:top-28" data-testid="wizard-price-panel">
          <div className="rounded-[24px] bg-[#0a0a0a] text-white p-7 sm:p-8 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.16) 0%, transparent 65%)' }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cf97fc] mb-6 relative">Din pakke</p>

            <div className="relative space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-white/55">{level?.name} ({level?.pct} %)</span>
                <span className="text-[15px] font-semibold tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}><AnimatedNumber value={fee} /> kr/mnd</span>
              </div>
              {uplift > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-white/55">Dynamisk inntektsløft</span>
                  <span className="text-[13px] font-semibold text-[#cf97fc] tabular-nums">+<AnimatedNumber value={rent * uplift} /> kr/mnd</span>
                </div>
              )}
              {visibleAddons.filter((a: any) => addons.includes(a.key)).map((a: any) => (
                <div key={a.key} className="flex items-baseline justify-between">
                  <span className="text-[13px] text-white/55 truncate pr-3">{a.name}</span>
                  <span className="text-[13px] text-white/80 tabular-nums whitespace-nowrap">{fmt(a.price)} kr</span>
                </div>
              ))}

              <div className="border-t border-white/[0.1] pt-5 mt-5">
                <p className="text-[12px] text-white/45 mb-1">Estimert utbetaling til deg</p>
                <p className="text-[34px] font-bold leading-none tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>
                  <AnimatedNumber value={payout} /> <span className="text-[14px] font-medium text-white/45">kr/mnd</span>
                </p>
                {onceTotal > 0 && (
                  <p className="text-[12.5px] text-white/45 mt-3">+ engangskostnader: <span className="text-white/80 font-semibold tabular-nums">{fmt(onceTotal)} kr</span></p>
                )}
              </div>
            </div>
          </div>
          <p className="text-[11.5px] text-[#aaa] leading-relaxed mt-4 px-2">Estimat basert på dine valg. Endelig pris bekreftes i den uforpliktende vurderingen.</p>
        </aside>
      </div>

      {/* Mobil: sticky oppsummering */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.08] px-5 py-3.5 flex items-center justify-between" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
        <div>
          <p className="text-[10.5px] text-white/45 uppercase tracking-[0.1em]">Utbetaling til deg</p>
          <p className="text-[18px] font-bold text-white leading-tight tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(payout)} kr/mnd</p>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] text-white/45 uppercase tracking-[0.1em]">Honorar {onceTotal > 0 ? '+ engangs' : ''}</p>
          <p className="text-[13px] font-semibold text-[#cf97fc] tabular-nums">{fmt(fee)} kr/mnd{onceTotal > 0 ? ` · ${fmt(onceTotal)} kr` : ''}</p>
        </div>
      </div>
    </div>
  );
}
