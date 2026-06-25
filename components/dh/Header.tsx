'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowUpRight, X } from 'lucide-react';

/**
 * DigiHome navbar — V1-DNA, edge-to-edge, full bredde
 */

const NAV_NO = [
  { href: '/bli-utleier', label: 'For utleiere', testId: 'nav-utleier' },
  { href: '/bli-leietaker', label: 'For leietakere', testId: 'nav-leietaker' },
  { href: '/forvaltning', label: 'Forvaltning', testId: 'nav-forvaltning' },
  { href: '/nyheter', label: 'Nyheter', testId: 'nav-nyheter' },
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

  // Hjem ("/") regnes som "For utleiere"-konteksten på aktiv-pill-en
  const activeHref =
    pathname === '/'
      ? '/bli-utleier'
      : navLinks.find((l) => pathname.startsWith(l.href))?.href || '';

  const isHomePage = pathname === '/';
  const lightMode = isHomePage && !scrolled; // light tekst over mørk hero

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white border-b border-[#1f1f1f]/[0.08] shadow-[0_1px_0_rgba(31,31,31,0.04)]'
          : isHomePage
          ? 'bg-transparent border-b border-transparent'
          : 'bg-white/0 border-b border-[#1f1f1f]/[0.04]'
      }`}
      data-testid="header"
    >
      <div className="w-full px-6 lg:px-12">
        <div className="h-[72px] flex items-center justify-between gap-8">
          {/* ─── LOGO ─── */}
          <Link
            href="/"
            className="flex items-center shrink-0 group"
            data-testid="header-logo-link"
          >
            <img
              src="/logo.svg"
              alt="DigiHome"
              className="h-[26px] w-auto transition-all duration-300 group-hover:scale-[1.02]"
            />
          </Link>

          {/* ─── CENTER NAV ─── */}
          <nav className="hidden lg:flex items-center gap-1 relative">
            {navLinks.map((l) => {
              const isActive = activeHref === l.href;
              const inactiveColor = lightMode ? 'rgba(255,255,255,0.60)' : 'rgba(31,31,31,0.60)';
              const activeColor = lightMode ? '#ffffff' : '#1f1f1f';
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-testid={l.testId}
                  className="relative px-3.5 py-2 group"
                >
                  <span
                    className={`relative text-[13.5px] tracking-[-0.012em] transition-all duration-300 ${
                      isActive ? 'font-semibold' : 'font-medium'
                    }`}
                    style={{
                      color: isActive ? activeColor : inactiveColor,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = activeColor;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = inactiveColor;
                    }}
                  >
                    {l.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-underline"
                      className="absolute left-3.5 right-3.5 -bottom-px h-[2px] rounded-full"
                      style={{
                        background: lightMode ? '#ffffff' : '#1f1f1f',
                      }}
                      transition={{
                        type: 'spring',
                        bounce: 0.18,
                        duration: 0.55,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ─── RIGHT CLUSTER ─── */}
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <button
              className="group inline-flex items-center gap-1 text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors"
              style={{
                color: lightMode ? 'rgba(255,255,255,0.55)' : 'rgba(31,31,31,0.55)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = lightMode ? '#ffffff' : '#1f1f1f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = lightMode ? 'rgba(255,255,255,0.55)' : 'rgba(31,31,31,0.55)';
              }}
              aria-label="Velg språk"
              data-testid="header-locale-button"
            >
              <span>{locale === 'en' ? 'EN' : 'NO'}</span>
              <svg
                className="w-3 h-3 opacity-50 group-hover:opacity-90 transition-opacity"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <span
              className="h-4 w-px"
              style={{
                background: lightMode ? 'rgba(255,255,255,0.18)' : 'rgba(31,31,31,0.12)',
              }}
              aria-hidden
            />

            <Link
              href="/logg-inn"
              className="text-[13.5px] font-medium transition-colors tracking-[-0.005em]"
              style={{
                color: lightMode ? 'rgba(255,255,255,0.78)' : 'rgba(31,31,31,0.75)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = lightMode ? '#ffffff' : '#1f1f1f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = lightMode ? 'rgba(255,255,255,0.78)' : 'rgba(31,31,31,0.75)';
              }}
              data-testid="header-login-link"
            >
              {loginText}
            </Link>
            <button
              onClick={() => router.push('/bli-utleier')}
              data-testid="header-cta-start-onboarding-button"
              className="group relative inline-flex items-center gap-2 h-[42px] pl-5 pr-2 rounded-full text-[13px] font-semibold tracking-[-0.008em] overflow-hidden transition-all duration-300 active:scale-[0.97]"
              style={{
                background: lightMode ? '#d298ff' : '#1f1f1f',
                color: lightMode ? '#1f1f1f' : '#ffffff',
                boxShadow: lightMode
                  ? '0 10px 28px -8px rgba(210,152,255,0.55), 0 2px 6px -2px rgba(210,152,255,0.30)'
                  : '0 8px 24px -8px rgba(31,31,31,0.35), 0 2px 6px -2px rgba(31,31,31,0.18)',
              }}
            >
              <span className="relative z-10">{ctaText}</span>
              <span
                className="relative z-10 inline-flex items-center justify-center w-[30px] h-[30px] rounded-full transition-all duration-300"
                style={{
                  background: lightMode ? '#1f1f1f' : '#d298ff',
                  color: lightMode ? '#d298ff' : '#1f1f1f',
                }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.6} />
              </span>
            </button>
          </div>

          {/* ─── MOBILE ─── */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors"
                style={{
                  color: lightMode ? '#ffffff' : '#1f1f1f',
                }}
                data-testid="header-mobile-menu-button"
                aria-label="Meny"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:w-96 p-0 border-0 bg-[#fdfcfb]"
            >
              <div className="flex flex-col h-full">
                <div className="p-6 flex items-center justify-between">
                  <img src="/logo.svg" alt="DigiHome" className="h-7 w-auto" />
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
                      className={`flex items-center justify-between py-4 text-[18px] tracking-[-0.01em] font-semibold transition-colors border-b border-[#1f1f1f]/[0.06] ${
                        activeHref === l.href
                          ? 'text-[#a463e8]'
                          : 'text-[#1f1f1f] hover:text-[#a463e8]'
                      }`}
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
                </div>
                <div className="p-6 space-y-3 border-t border-[#1f1f1f]/[0.06]">
                  <Link
                    href="/logg-inn"
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
                    className="w-full rounded-full bg-[#1f1f1f] text-white h-12 text-[14px] font-medium hover:bg-[#a463e8] transition-colors"
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
