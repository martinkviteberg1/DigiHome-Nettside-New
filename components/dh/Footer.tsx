'use client';

import React from 'react';
import Link from 'next/link';

const cols = [
  { title: 'Tjenester', links: [{ l: 'Dynamisk utleie', h: '/tjenester' }, { l: 'Langtidsutleie', h: '/tjenester' }, { l: 'Korttidsutleie', h: '/tjenester' }, { l: 'Rådgivning', h: '/radgivning' }] },
  { title: 'Områder', links: [{ l: 'Utleie i Bergen', h: '/utleie/bergen' }, { l: 'Sentrum', h: '/utleie/sentrum' }, { l: 'Nordnes', h: '/utleie/nordnes' }, { l: 'Sandviken', h: '/utleie/sandviken' }, { l: 'Alle områder', h: '/utleie' }] },
  { title: 'Selskap', links: [{ l: 'Bli utleier', h: '/bli-utleier' }, { l: 'Bli leietaker', h: '/bli-leietaker' }, { l: 'Nyheter', h: '/nyheter' }, { l: 'Kontakt', h: '/kontakt' }] },
  { title: 'Ressurser', links: [{ l: 'Om oss', h: '/om-oss' }, { l: 'Kontakt', h: '/kontakt' }, { l: 'Personvern', h: '#' }, { l: 'Vilkår', h: '#' }] },
];

export default function Footer({ org }: { org?: { company_name?: string; org_number?: string; company_address?: string; company_email?: string; company_phone?: string } | null }) {
  const fmtOrg = (n?: string) => (n || '').replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  const name = org?.company_name || 'SHD Forvaltning AS';
  const orgNr = org?.org_number ? fmtOrg(org.org_number) : '835 595 242';
  const email = org?.company_email || 'sarah@digihome.no';
  const phone = org?.company_phone || '+47 909 58 313';
  const addr = org?.company_address || 'Kokstadvegen 46, 5257 Kokstad';
  return (
    <footer className="bg-[#0a0a0a] text-white border-t border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <img src="/logo-light.svg" alt="DigiHome" className="h-[26px] w-auto" />
            <p className="text-[14px] text-white/55 leading-relaxed mt-4 max-w-[28ch]">Smartere utleieadministrasjon med en hybridløsning av korttids- og langtidsutleie.</p>
            <div className="mt-6 space-y-2">
              <a href={`mailto:${email}`} className="block text-[13px] text-white/50 hover:text-white/60 transition-colors">{email}</a>
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="block text-[13px] text-white/50 hover:text-white/60 transition-colors">{phone}</a>
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
              <h4 className="text-[12px] font-semibold text-white/60 uppercase tracking-[0.15em] mb-5">{c.title}</h4>
              <ul className="space-y-3">{c.links.map((l: any) => (<li key={l.l}><Link href={l.h} className="text-[14px] text-white/50 hover:text-white/70 transition-colors duration-200">{l.l}</Link></li>))}</ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06] py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/50">&copy; {new Date().getFullYear()} {name} · Org.nr {orgNr} · {addr}</p>
          <div className="flex items-center gap-6"><a href="#" className="text-[12px] text-white/50 hover:text-white/50 transition-colors">Personvern</a><a href="#" className="text-[12px] text-white/50 hover:text-white/50 transition-colors">Vilkår</a></div>
        </div>
      </div>
    </footer>
  );
}
