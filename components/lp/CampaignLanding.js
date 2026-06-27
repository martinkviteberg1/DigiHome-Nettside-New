'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowRight, Check, Loader2, Phone, ShieldCheck, Star, Clock } from 'lucide-react';
import { site, stats } from '@/lib/site';
import { getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';

function useAddressAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 6) : []);
        setOpen(true);
      } catch (e) { /* abort/feil = ignore */ }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  return { query, setQuery, suggestions, open, setOpen };
}

export default function CampaignLanding({ cfg }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');
  const startedRef = useRef(false);
  const ac = useAddressAutocomplete();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { trackLeadStart(cfg.source); } catch (e) {}
  };

  const scrollToForm = () => {
    const el = document.getElementById('lp-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim())) {
      setErr('Fyll inn navn og enten telefon eller e-post.');
      setStatus('error');
      return;
    }
    setErr('');
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: ac.query.trim(),
          lead_type: 'huseier',
          source: cfg.source,
          notes: `Landingsside: ${cfg.h1}`,
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      if (!res.ok) throw new Error('api');
      let data = {};
      try { data = await res.json(); } catch (e) {}
      try { trackLead({ formId: cfg.source, source: cfg.source, leadId: data?.data?.id }); } catch (e) {}
      setStatus('done');
    } catch (e2) {
      setErr('Noe gikk galt. Prøv igjen — eller ring oss på ' + site.phone + '.');
      setStatus('error');
    }
  };

  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col">
      {/* Enkel topp — message-match, ingen distraherende nav */}
      <header className="border-b border-hairline/70">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-6 w-auto" width={130} height={24} />
          <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2 text-[14px] font-medium text-ink hover:text-lavender transition-colors">
            <Phone className="w-4 h-4" /> <span className="hidden sm:inline">{site.phone}</span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-24 h-[480px] w-[480px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.22) 0%, rgba(207,151,252,0) 70%)' }} />
        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-12 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Venstre: budskap + skjema */}
          <div>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-taupe mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-lavender" /> {cfg.eyebrow}
            </div>
            <h1 className="font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[36px] sm:text-[48px] lg:text-[54px] max-w-[15ch]">
              {cfg.h1}
            </h1>
            <p className="text-quiet text-[17px] sm:text-[19px] mt-5 max-w-[52ch] leading-relaxed">{cfg.sub}</p>

            <ul className="mt-7 space-y-2.5">
              {cfg.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-bg">
                    <Check className="h-3 w-3 text-success" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            {/* Skjema */}
            <div id="lp-form" className="mt-8 scroll-mt-24">
              {status === 'done' ? (
                <div className="rounded-[20px] border border-success/25 bg-success-bg px-6 py-7">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-white border border-success/30 flex items-center justify-center">
                      <Check className="h-5 w-5 text-success" />
                    </span>
                    <p className="font-heading font-bold text-[19px] text-ink">Takk! Vurderingen er på vei.</p>
                  </div>
                  <p className="text-quiet text-[15px] mt-3 leading-relaxed">
                    Vi tar kontakt innen 24 timer med en gratis, uforpliktende vurdering{ac.query.trim() ? ` av ${ac.query.trim()}` : ''}.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} onFocus={handleStart} className="rounded-[20px] bg-surface border border-hairline shadow-[0_20px_60px_-30px_rgba(10,10,10,0.3)] p-5 sm:p-6 space-y-3.5">
                  <p className="font-heading font-bold text-[18px] text-ink">Få en gratis verdivurdering</p>
                  {/* Adresse m/ autofullføring */}
                  <div className="relative">
                    <div className="flex items-center rounded-[12px] border border-hairline bg-canvas px-3.5 focus-within:border-lavender transition-colors">
                      <MapPin className="h-4 w-4 text-taupe shrink-0" />
                      <input
                        value={ac.query}
                        onChange={(e) => ac.setQuery(e.target.value)}
                        onFocus={() => { handleStart(); if (ac.suggestions.length) ac.setOpen(true); }}
                        placeholder="Adressen til boligen din"
                        autoComplete="off"
                        className="flex-1 h-12 px-3 bg-transparent outline-none text-[15px] placeholder:text-taupe"
                      />
                    </div>
                    {ac.open && ac.suggestions.length > 0 && (
                      <ul className="absolute z-20 mt-1.5 w-full rounded-[12px] border border-hairline bg-surface shadow-lg overflow-hidden">
                        {ac.suggestions.map((s, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => { ac.setQuery(s.text || s.label || ''); ac.setOpen(false); }}
                              className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-fill transition-colors"
                            >
                              <span className="text-ink">{s.text || s.label}</span>
                              {s.sub ? <span className="text-taupe"> · {s.sub}</span> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <input value={form.name} onChange={set('name')} placeholder="Navn" className="w-full h-12 px-4 rounded-[12px] border border-hairline bg-canvas outline-none focus:border-lavender text-[15px] placeholder:text-taupe transition-colors" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <input value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="Telefon" className="w-full h-12 px-4 rounded-[12px] border border-hairline bg-canvas outline-none focus:border-lavender text-[15px] placeholder:text-taupe transition-colors" />
                    <input value={form.email} onChange={set('email')} type="email" inputMode="email" placeholder="E-post" className="w-full h-12 px-4 rounded-[12px] border border-hairline bg-canvas outline-none focus:border-lavender text-[15px] placeholder:text-taupe transition-colors" />
                  </div>
                  {err ? <p className="text-[13px] text-rose-500">{err}</p> : null}
                  <button type="submit" disabled={status === 'sending'} className="w-full h-12 rounded-full bg-ink text-canvas font-medium text-[15px] flex items-center justify-center gap-2 transition-colors hover:bg-[#333] disabled:opacity-60">
                    {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Få gratis vurdering <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <p className="text-[12px] text-taupe text-center">Gratis og uforpliktende · Svar innen 24 timer</p>
                </form>
              )}
            </div>
          </div>

          {/* Høyre: bilde + stat */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-panel overflow-hidden aspect-[4/5] shadow-[0_30px_80px_-40px_rgba(10,10,10,0.5)]">
              <img src={cfg.image} alt="Utleiebolig i Bergen" className="absolute inset-0 w-full h-full object-cover" width={800} height={1000} />
            </div>
            <div className="absolute -bottom-5 -left-5 rounded-card bg-surface border border-hairline shadow-[0_20px_50px_-25px_rgba(10,10,10,0.4)] px-6 py-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">Snittinntekt Bergen</p>
              <p className="font-heading font-bold text-[26px] text-ink mt-0.5">{site.avgIncome}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust-stripe */}
      <section className="border-y border-hairline/70 bg-canvas-alt">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-7 grid grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-heading font-bold text-[26px] sm:text-[34px] text-ink tracking-[-0.02em]">{s.value}</div>
              <div className="text-quiet text-[13px] sm:text-[14px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tre fordeler */}
      <section className="max-w-[1200px] mx-auto px-5 sm:px-8 py-12 sm:py-16 grid sm:grid-cols-3 gap-4">
        {[
          { icon: ShieldCheck, t: 'Ingen risiko', b: 'Ingen oppstartskostnader og ingen bindingstid. Du betaler kun når boligen tjener.' },
          { icon: Star, t: 'Profesjonelt', b: 'Styling, foto, annonsering og leietakeroppfølging — håndtert av et erfarent team.' },
          { icon: Clock, t: 'Du sparer tid', b: 'Vi tar oss av alt det praktiske. Du følger inntekten i sanntid.' },
        ].map((c, i) => (
          <div key={i} className="rounded-card bg-surface border border-hairline p-6">
            <c.icon className="w-5 h-5 text-lavender" />
            <h3 className="font-heading font-bold text-[17px] mt-4">{c.t}</h3>
            <p className="text-quiet text-[14px] mt-1.5 leading-relaxed">{c.b}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="max-w-[760px] mx-auto px-5 sm:px-8 pb-16 sm:pb-24 w-full">
        <h2 className="font-heading font-bold text-[26px] sm:text-[32px] tracking-[-0.02em] text-center mb-8">Ofte stilte spørsmål</h2>
        <div className="space-y-2.5">
          {cfg.faq.map((f, i) => (
            <div key={i} className="rounded-card bg-surface border border-hairline overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
              >
                <span className="font-medium text-[15.5px] text-ink">{f.q}</span>
                <span className={`text-taupe transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openFaq === i && (
                <p className="px-5 pb-5 -mt-1 text-quiet text-[14.5px] leading-relaxed">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-hairline/70">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-taupe">
          <span>© {new Date().getFullYear()} {site.legalName} · Org.nr {site.orgNr}</span>
          <a href={`tel:${site.phoneHref}`} className="text-ink hover:text-lavender transition-colors">{site.phone}</a>
        </div>
      </footer>

      {/* Mobil sticky CTA */}
      {status !== 'done' && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-[90] p-3 bg-gradient-to-t from-canvas via-canvas/95 to-transparent">
          <button onClick={scrollToForm} className="w-full h-12 rounded-full bg-ink text-canvas font-medium text-[15px] flex items-center justify-center gap-2 shadow-[0_12px_30px_-8px_rgba(10,10,10,0.5)]">
            Få gratis vurdering <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
