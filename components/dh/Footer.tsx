'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Check, ArrowRight, Loader2 } from 'lucide-react';

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: any) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setStatus('error'); return; }
    setStatus('sending');
    try {
      const r = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      });
      setStatus(r.ok ? 'done' : 'error');
      if (r.ok) setEmail('');
    } catch (err) { setStatus('error'); }
  };

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3.5 lg:justify-self-end" data-testid="footer-newsletter-done">
        <div className="w-10 h-10 rounded-full bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center shrink-0">
          <Check className="w-4.5 h-4.5 w-[18px] h-[18px] text-emerald-400" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>Takk — du er påmeldt!</p>
          <p className="text-[13px] text-white/45 mt-0.5">Første innsikt lander i innboksen din snart.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[460px] lg:justify-self-end">
      <div className="flex items-center rounded-full bg-white/[0.06] border border-white/[0.12] focus-within:border-white/35 focus-within:bg-white/[0.08] focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.06)] transition-all duration-300 p-1.5 pl-5">
        <Mail className="w-4 h-4 text-white/55 shrink-0" />
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
          placeholder="din@epost.no"
          className="flex-1 min-w-0 bg-transparent h-[44px] px-3 text-[14px] text-white placeholder:text-white/55 outline-none focus:outline-none"
          data-testid="footer-newsletter-input"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="h-[42px] px-6 rounded-full bg-white text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#d298ff] transition-colors disabled:opacity-60 inline-flex items-center gap-1.5 shrink-0"
          data-testid="footer-newsletter-submit"
        >
          {status === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Meld meg på <ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
      {status === 'error' && <p className="text-[12px] text-rose-300/90 mt-2 ml-5">Sjekk e-postadressen og prøv igjen.</p>}
      <p className="text-[11px] text-white/50 mt-2.5 ml-5 leading-relaxed">Maks én e-post i måneden. Meld deg av når som helst — se <a href="/personvern" className="underline hover:text-white/60 transition-colors">personvern</a>.</p>
    </form>
  );
}

const cols = [
  { title: 'Tjenester', links: [{ l: 'Dynamisk utleie', h: '/tjenester' }, { l: 'Utleiemegler i Bergen', h: '/utleiemegler-bergen' }, { l: 'Airbnb-forvaltning', h: '/airbnb-forvaltning-bergen' }, { l: 'Langtidsutleie', h: '/tjenester' }, { l: 'Rådgivning', h: '/radgivning' }] },
  { title: 'Områder', links: [{ l: 'Utleie i Bergen', h: '/utleie/bergen' }, { l: 'Sentrum', h: '/utleie/sentrum' }, { l: 'Nordnes', h: '/utleie/nordnes' }, { l: 'Leiemarkedet i Bergen', h: '/leiemarkedet/bergen' }, { l: 'Alle områder', h: '/utleie' }] },
  { title: 'Selskap', links: [{ l: 'Bli utleier', h: '/bli-utleier' }, { l: 'Priskalkulator', h: '/priskalkulator' }, { l: 'Bli leietaker', h: '/bli-leietaker' }, { l: 'Ledige boliger', h: '/ledige-boliger' }, { l: 'Nyheter', h: '/nyheter' }, { l: 'Kontakt', h: '/kontakt' }] },
  { title: 'Ressurser', links: [{ l: 'Guider for utleiere', h: '/guider' }, { l: 'Leiemarkedsrapport', h: '/leiemarkedet' }, { l: 'Om oss', h: '/om-oss' }, { l: 'Kontakt', h: '/kontakt' }, { l: 'Personvern', h: '/personvern' }] },
];

export default function Footer({ org }: { org?: { company_name?: string; org_number?: string; company_address?: string; company_email?: string; company_phone?: string } | null }) {
  const fmtOrg = (n?: string) => (n || '').replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  const name = org?.company_name || 'Digihome AS';
  const orgNr = org?.org_number ? fmtOrg(org.org_number) : '835 595 242';
  const email = org?.company_email || 'sarah@digihome.no';
  const phone = org?.company_phone || '+47 909 58 313';
  const addr = org?.company_address || 'Kokstadvegen 46, 5257 Kokstad';
  return (
    <footer className="bg-[#0B0A09] text-white">
      <div className="relative border-t border-white/[0.08]">
        <div className="relative mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <div className="py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <img src="/logo-light.svg" alt="DigiHome" className="h-[26px] w-auto" />
            <p className="text-[14px] text-white/60 leading-relaxed mt-4 max-w-[30ch]">Vi automatiserer utleien — annonse, leiekontrakt, depositum og husleie. Med eller uten forvalter.</p>
            <div className="mt-6 space-y-2">
              <a href={`mailto:${email}`} className="block py-0.5 text-[13px] text-white/50 hover:text-white/60 transition-colors">{email}</a>
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="block py-0.5 text-[13px] text-white/50 hover:text-white/60 transition-colors">{phone}</a>
              <p className="text-[12px] text-white/55 mt-3">{name} · Org.nr {orgNr}</p>
              <p className="text-[12px] text-white/55">{addr}</p>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <a href="https://instagram.com/digihome" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://facebook.com/digihome" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors" aria-label="Facebook">
                <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://linkedin.com/company/digihome" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors" aria-label="LinkedIn">
                <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
          {cols.map((c: any) => (
            <div key={c.title}>
              <h2 className="text-[13.5px] font-semibold text-white mb-5">{c.title}</h2>
              <ul className="space-y-3">{c.links.map((l: any) => (<li key={l.l}><Link href={l.h} className="inline-block py-1 -my-1 text-[14px] text-white/60 hover:text-white transition-colors duration-200">{l.l}</Link></li>))}</ul>
            </div>
          ))}
        </div>
        {/* Nyhetsbrev */}
        <div className="border-t border-white/[0.06] py-12 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] text-white" style={{ fontFamily: 'var(--font-heading)' }}>Innsikt om leiemarkedet, rett i innboksen</h2>
            <p className="text-[14px] text-white/50 mt-2 max-w-[52ch] leading-relaxed">Markedsdata, skattetips og guider for boligeiere i Bergen — kort og konkret.</p>
          </div>
          <NewsletterSignup />
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.08] py-7 sm:flex-row">
          <p className="text-[12px] text-white/55">&copy; {new Date().getFullYear()} {name} · Org.nr {orgNr} · {addr}</p>
          <div className="flex items-center gap-6">
            <a href="/personvern" className="text-[12px] text-white/55 transition-colors hover:text-white">Personvern</a>
            <a href="/personvern#vilkar" className="text-[12px] text-white/55 transition-colors hover:text-white">Vilkår</a>
          </div>
        </div>
        </div>
      </div>
    </footer>
  );
}
