'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from '@/lib/motion-lite';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowUpRight, X, Phone, Mail } from 'lucide-react';
import { site } from '@/lib/site';

/**
 * DigiHome navbar — 2026 «floating glass pill»
 * Øverst: rolig, frostet fullbredde-linje. Ved scroll: løsner til en flytende
 * glass-pille med blur, hairline-border og myk skygge.
 */

const NAV_NO = [
  { href: '/bli-utleier', label: 'For utleiere', testId: 'nav-utleier' },
  { href: '/bli-leietaker', label: 'For leietakere', testId: 'nav-leietaker' },
  { href: '/leiemarkedet', label: 'Leiemarkedet', testId: 'nav-leiemarkedet' },
  { href: '/nyheter', label: 'Nyheter', testId: 'nav-nyheter' },
  { href: '/om-oss', label: 'Om oss', testId: 'nav-om-oss' },
  { href: '/kontakt', label: 'Kontakt', testId: 'nav-kontakt' },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = 'no';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navLinks = NAV_NO;
  const ctaText = 'Bli utleier';
  const loginText = 'Logg inn';

  // Forsiden ("/") er en nøytral landingsside — ingen nav-fane skal være aktiv der.
  const activeHref = navLinks.find((l) => pathname.startsWith(l.href))?.href || '';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <header className="fixed top-0 left-0 right-0 z-50" data-testid="header">
      <div
        className={`transition-all duration-500 ${scrolled ? 'px-3 sm:px-5 pt-3' : 'px-0 pt-0'}`}
        style={{ transitionTimingFunction: ease }}
      >
        <div
          className={`mx-auto flex items-center justify-between gap-6 transition-all duration-500 ${
            scrolled
              ? 'max-w-[1180px] h-[58px] rounded-full bg-white/85 backdrop-blur-2xl border border-[#0a0a0a]/[0.07] shadow-[0_16px_44px_-16px_rgba(20,10,40,0.22)] pl-5 pr-3 sm:pl-7 sm:pr-2.5'
              : 'max-w-full h-[72px] rounded-none bg-white/55 backdrop-blur-xl border border-transparent px-6 lg:px-12'
          }`}
          style={{ transitionTimingFunction: ease }}
        >
          {/* ─── LOGO ─── */}
          <Link
            href="/"
            className="flex items-center shrink-0 group"
            data-testid="header-logo-link"
          >
            <img
              src="/digihome-wordmark-ink.svg"
              alt="DigiHome"
              className={`w-auto transition-all duration-500 group-hover:scale-[1.02] ${scrolled ? 'h-[22px]' : 'h-[26px]'}`}
              style={{ transitionTimingFunction: ease }}
            />
          </Link>

          {/* ─── CENTER NAV ─── */}
          <nav className="hidden lg:flex items-center gap-0.5 relative">
            {navLinks.map((l) => {
              const isActive = activeHref === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-testid={l.testId}
                  className={`relative px-3.5 py-2 rounded-full transition-colors duration-300 ${
                    isActive ? '' : 'hover:bg-[#0a0a0a]/[0.045]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-[#0a0a0a]/[0.06]"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}
                    />
                  )}
                  <span
                    className={`relative z-10 text-[13.5px] tracking-[-0.012em] transition-colors duration-300 ${
                      isActive ? 'font-semibold text-[#0a0a0a]' : 'font-medium text-[#1f1f1f]/70 hover:text-[#0a0a0a]'
                    }`}
                  >
                    {l.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* ─── RIGHT CLUSTER ─── */}
          <div className="hidden sm:flex items-center gap-3.5 shrink-0">
            <button
              className="group inline-flex items-center gap-1 text-[12px] font-semibold tracking-[0.06em] uppercase text-[#1f1f1f]/60 hover:text-[#0a0a0a] transition-colors"
              aria-label={`Velg språk (${locale === 'en' ? 'EN' : 'NO'})`}
              data-testid="header-locale-button"
            >
              <span>{locale === 'en' ? 'EN' : 'NO'}</span>
              <svg className="w-3 h-3 opacity-50 group-hover:opacity-90 transition-opacity" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <span className="h-4 w-px bg-[#1f1f1f]/10" aria-hidden />

            <Link
              href={site.loginUrl}
              className="text-[13.5px] font-medium tracking-[-0.005em] text-[#1f1f1f]/70 hover:text-[#0a0a0a] transition-colors"
              data-testid="header-login-link"
            >
              {loginText}
            </Link>
            <button
              onClick={() => router.push('/bli-utleier')}
              data-testid="header-cta-start-onboarding-button"
              className={`group relative inline-flex items-center gap-2 pl-5 pr-1.5 rounded-full text-[13px] font-semibold tracking-[-0.008em] overflow-hidden transition-all duration-500 active:scale-[0.97] bg-[#0a0a0a] text-white hover:shadow-[0_12px_32px_-10px_rgba(167,101,224,0.5)] ${scrolled ? 'h-[42px]' : 'h-[44px]'}`}
              style={{ transitionTimingFunction: ease, boxShadow: '0 8px 24px -8px rgba(31,31,31,0.35)' }}
            >
              <span className="relative z-10">{ctaText}</span>
              <span className="relative z-10 inline-flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#d298ff] text-[#1f1f1f] transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.6} />
              </span>
            </button>
          </div>

          {/* ─── MOBILE ─── */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-[#1f1f1f] hover:bg-[#0a0a0a]/[0.05] transition-colors"
                data-testid="header-mobile-menu-button"
                aria-label="Meny"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-96 p-0 border-0 bg-[#fdfcfb]">
              <div className="flex flex-col h-full">
                <div className="p-6 flex items-center justify-between">
                  <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-7 w-auto" />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#1f1f1f]/[0.04] transition-colors"
                    aria-label="Lukk"
                  >
                    <X className="h-5 w-5 text-[#1f1f1f]" />
                  </button>
                </div>
                <div className="flex-1 px-6 py-4">
                  {navLinks.map((l, idx) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className={`dh-fade-up flex items-center justify-between py-4 text-[19px] tracking-[-0.015em] font-semibold transition-colors border-b border-[#1f1f1f]/[0.06] ${
                        activeHref === l.href ? 'text-[#a463e8]' : 'text-[#1f1f1f] hover:text-[#a463e8]'
                      }`}
                      style={{ animationDelay: `${0.05 + idx * 0.055}s`, fontFamily: 'var(--font-heading)' }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[#1f1f1f]/30 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {l.label}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-[#1f1f1f]/40" />
                    </Link>
                  ))}

                  <div className="dh-fade-up mt-8 space-y-2.5" style={{ animationDelay: '0.45s' }}>
                    <a href={`tel:${site.phoneHref}`} className="flex items-center gap-3 text-[13.5px] text-[#1f1f1f]/60 hover:text-[#0a0a0a] transition-colors">
                      <Phone className="w-3.5 h-3.5" /> {site.phone}
                    </a>
                    <a href={`mailto:${site.email}`} className="flex items-center gap-3 text-[13.5px] text-[#1f1f1f]/60 hover:text-[#0a0a0a] transition-colors">
                      <Mail className="w-3.5 h-3.5" /> {site.email}
                    </a>
                  </div>
                </div>
                <div className="p-6 space-y-3 border-t border-[#1f1f1f]/[0.06]">
                  <Link
                    href={site.loginUrl}
                    onClick={() => setMobileOpen(false)}
                    className="w-full rounded-full border border-[#1f1f1f]/15 text-[#1f1f1f] h-12 text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#1f1f1f]/[0.04] transition-colors"
                  >
                    {loginText}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      router.push('/bli-utleier');
                    }}
                    className="w-full rounded-full bg-[#0a0a0a] text-white h-12 text-[14px] font-semibold hover:bg-[#a463e8] transition-colors"
                  >
                    {ctaText}
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
