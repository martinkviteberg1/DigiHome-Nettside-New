'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from '@/lib/motion-lite';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowUpRight, X, Phone, Mail } from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';

/**
 * DigiHome navbar — 2026 redaksjonell fullbredde-header.
 * Innholdet ligger i SAMME container som seksjonene under
 * (max-w-[1400px] + px-6/10/16) slik at logo og CTA flukter med innholdet.
 * Ved scroll: frostet glass + hairline-underlinje (ingen skygge — roligere).
 */

// Selvforvaltning ligger som nr. 2 med vilje: produktet selges i hele landet og
// er det eneste sporet vi kan tilby utenfor Bergen, men det hadde ingen inngang
// i menyen — det var en radioknapp inne i registreringsskjemaet.
const NAV_NO = [
  { href: '/bli-utleier', label: 'For utleiere', testId: 'nav-utleier' },
  { href: '/selvforvaltning', label: 'Selvforvaltning', testId: 'nav-selvforvaltning' },
  { href: '/bli-leietaker', label: 'For leietakere', testId: 'nav-leietaker' },
  { href: '/ledige-boliger', label: 'Ledige boliger', testId: 'nav-ledige-boliger' },
  { href: '/leiemarkedet', label: 'Leiemarkedet', testId: 'nav-leiemarkedet' },
  { href: '/nyheter', label: 'Nyheter', testId: 'nav-nyheter' },
  { href: '/om-oss', label: 'Om oss', testId: 'nav-om-oss' },
  { href: '/kontakt', label: 'Kontakt', testId: 'nav-kontakt' },
];

export default function Header() {
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
      {/* Scroll-fremdrift (ren CSS scroll-driven animation, kun der støttet) */}
      <div aria-hidden className="dh-scroll-progress" />
      <div
        className={`transition-all duration-500 border-b ${
          scrolled
            ? 'bg-[#fdfcfb]/88 backdrop-blur-2xl border-[#0a0a0a]/[0.06] shadow-[0_10px_30px_-24px_rgba(28,22,14,0.35)]'
            : 'bg-[#fdfcfb]/55 backdrop-blur-xl border-transparent'
        }`}
        style={{ transitionTimingFunction: ease }}
      >
        <div
          className={`max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 flex items-center justify-between gap-6 transition-all duration-500 ${
            scrolled ? 'h-[62px]' : 'h-[76px]'
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
                  className="relative rounded-full px-3.5 py-2 transition-colors duration-300 hover:bg-[#0a0a0a]/[0.045]"
                >
                  {/* Aktiv side markeres med en hårfin strek under ordet, ikke med
                      en grå pille. Streken tilhører samme linjespråk som resten
                      av nettstedet og støyer ikke i toppen av skjermen. */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute left-3 right-3 -bottom-[3px] h-[1.5px] bg-[#0a0a0a]"
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
            <Link
              href={site.loginUrl}
              className="text-[13.5px] font-medium tracking-[-0.005em] text-[#1f1f1f]/70 hover:text-[#0a0a0a] transition-colors"
              data-testid="header-login-link"
            >
              {loginText}
            </Link>
            <Link
              href="/bli-utleier/start"
              prefetch
              onClick={() => { try { track('cta_click', { cta: 'header' }); } catch (e) {} }}
              data-testid="header-cta-start-onboarding-button"
              className={`group inline-flex items-center gap-2 px-5 rounded-[8px] text-[13.5px] font-semibold tracking-[-0.008em] transition-all duration-300 active:scale-[0.98] bg-[#0a0a0a] text-white hover:bg-[#232323] ${scrolled ? 'h-[40px]' : 'h-[42px]'}`}
              style={{ transitionTimingFunction: ease }}
            >
              <span>{ctaText}</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
            </Link>
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
                        activeHref === l.href ? 'text-[#0a0a0a] underline underline-offset-8 decoration-[1.5px] decoration-[#0a0a0a]/30' : 'text-[#1f1f1f] hover:opacity-60'
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
                  <Link
                    href="/bli-utleier/start"
                    prefetch
                    onClick={() => {
                      try { track('cta_click', { cta: 'header_mobile_menu' }); } catch (e) {}
                      setMobileOpen(false);
                    }}
                    className="w-full rounded-full bg-[#0a0a0a] text-white h-12 text-[14px] font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
                  >
                    {ctaText}
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
