'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Home, CreditCard, MessageCircle, Wrench, FileText, Sparkles, ArrowRight, Plus, Camera, Clock, BarChart3, Zap, Brain, Building2, AlertTriangle, TrendingUp, Settings, Layers, CalendarDays, PhoneCall, PenLine, Target, Rocket, Bot, MinusCircle, PlusCircle, LayoutDashboard, MessageSquare, ClipboardList, Radio, ClipboardCheck, AlertCircle, Users, BookOpen, PieChart, DollarSign, Shield, ChevronDown, Search, Filter, MoreHorizontal, Volume2, Droplets, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AnimatePresence, motion } from 'framer-motion';
import HeroProductAnimation from './HeroProductAnimation';
import ContractDemo from './ContractDemo';
import AutopilotArchitecture from './AutopilotArchitecture';
import ProductDuo from './ProductDuo';
import AIEiendom from './AIEiendom';
import LandingHeroAnimation from './LandingHeroAnimation';

const F = { fontFamily: "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif" };
const FH = { fontFamily: "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" };
const P = '#d298ff'; // accent (merkevare-lilla)

function Logo({ light, className = '', style }: any) {
  return <img src={light ? '/deck-logo-light.svg' : '/deck-logo-dark.svg'} alt="DigiHome" className={`h-6 ${className}`} style={style} />;
}

/* Subtle dot-grid background — matches landing page aesthetic */
function DotGrid({ maskCenter = '50% 35%', opacity = 0.45 }: { maskCenter?: string; opacity?: number }) {
  const mask = `radial-gradient(ellipse 80% 65% at ${maskCenter}, black 28%, transparent 78%)`;
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
      backgroundSize: '24px 24px',
      opacity,
      maskImage: mask,
      WebkitMaskImage: mask,
      zIndex: 0,
    }} />
  );
}

/* Tiny blurred LQIP (low-quality image placeholder) for Bergen aerial — shows instantly */
const BERGEN_LQIP = 'data:image/webp;base64,UklGRqwAAABXRUJQVlA4IKAAAAAwBgCdASooAB4APx16slGtKCSitVgIAaAjiWIAtvudAcsf5qYdI6g/JjyJE/Kcq9KnuOzttNM+LUcAAP5UZlm0+0bEnzBpjiIOcCUb4DCWhBzj6hgD9xp0SCq6OLdVTkhUHVGWsmkcXLeJm8Ve2QXlYYDQk8F/nQFWznJGfC6uEXPq/IFeguJ7iLUJdo9TgKAhojg8rVuzznWrH+PYGAAA';

function SlideFrame({ children, bg, img, overlay, slideNum, total, revealLight }: any) {
  const isImg = !!img;
  const isDark = bg === 'dark' || isImg;
  const isBergen = img === '/bergen-aerial.webp';
  const useReveal = revealLight !== undefined;
  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden no-scrollbar" style={{ background: bg === 'dark' ? '#0c0c0c' : bg === 'beige' ? '#f7f5f2' : '#fff' }}>
      {isImg && (
        <>
          {/* LQIP instant placeholder — blurred thumbnail shows before full image loads */}
          {isBergen && (
            <div aria-hidden="true" className="absolute inset-0"
                 style={{ backgroundImage: `url("${BERGEN_LQIP}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(8px)', transform: 'scale(1.04)' }} />
          )}
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover"
               loading={isBergen ? 'eager' : 'lazy'}
               {...(isBergen ? { fetchpriority: 'high' } : {})}
               decoding="async" />
          <div className="absolute inset-0" style={{ background: overlay || 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.75))' }} />
        </>
      )}
      {bg === 'dark' && !isImg && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(210,152,255,0.1),transparent_50%)]" style={useReveal ? { opacity: revealLight ? 0 : 1, transition: 'opacity 1.2s ease' } : undefined} />}
      {/* Lights-on warm reveal (optional, smoothly crossfades dark→warm light) */}
      {useReveal && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
          opacity: revealLight ? 1 : 0,
          transition: 'opacity 1.35s cubic-bezier(0.22,1,0.36,1)',
          background: '#f7f5f2',
        }} />
      )}
      <div className="absolute top-4 left-5 sm:top-7 sm:left-10 z-20">
        {useReveal ? (
          <div className="relative">
            <Logo light={true} className="h-5 sm:h-6" style={{ opacity: revealLight ? 0 : 1, transition: 'opacity 1.2s ease' }} />
            <Logo light={false} className="h-5 sm:h-6 absolute inset-0" style={{ opacity: revealLight ? 1 : 0, transition: 'opacity 1.2s ease' }} />
          </div>
        ) : (
          <Logo light={isDark} className="h-5 sm:h-6" />
        )}
      </div>
      <div className="absolute top-4 right-5 sm:top-7 sm:right-10 z-20 text-[10px] sm:text-[11px] font-medium tracking-wider" style={{ color: useReveal ? (revealLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.2)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'), transition: useReveal ? 'color 1.2s ease' : undefined }}>{slideNum}/{total}</div>
      <div className="relative z-10 min-h-full flex items-start pt-16 sm:pt-14 pb-10 sm:pb-10">{children}</div>
    </div>
  );
}


/* ═══ PHONE MOCKUPS — Tenant Portal + AI Chat ═══ */
function DeckTenantPhone() {
  return (
    <div className="w-[260px] rounded-[36px] bg-[#0a0a0a] p-[6px]" style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)' }}>
      <div className="w-[80px] h-[22px] bg-[#0a0a0a] rounded-b-[12px] mx-auto -mt-[6px] relative z-20" />
      <div className="rounded-[30px] overflow-hidden bg-[#111] relative -mt-[22px]" style={{ height: 520 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[260px] h-[200px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${P}08 0%, transparent 65%)` }} />
        <div className="flex items-center justify-between px-5 pt-3 pb-1 relative z-10">
          <span className="text-[8px] text-white/75 font-medium">09:41</span>
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-2 rounded-sm border border-white/20 relative"><div className="absolute inset-[1px] rounded-[1px] bg-[#059669]" style={{ width: '75%' }} /></div></div>
        </div>
        <div className="px-4 pt-4 pb-4 relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/[0.08]">
              <img src="https://customer-assets.emergentagent.com/job_9ac850f1-4c4e-4305-b194-8cd3509969c1/artifacts/93xk0b12_GWeZ391lh9hfONZ36JQzJ_ns7qFd8s.png?w=120&h=120&fit=crop&crop=face" alt="" className="w-full h-full object-cover" />
            </div>
            <div><p className="text-[8px] text-white/55 uppercase tracking-wider mb-0.5">Leietakerportal</p><p className="text-[19px] font-bold text-white tracking-[-0.03em]">Hei, Stine</p></div>
          </div>
          <div className="rounded-[16px] overflow-hidden mb-3" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="h-[75px] relative overflow-hidden"><img src="/tour-apartment.webp" alt="" className="w-full h-full object-cover" /><div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} /><div className="absolute bottom-2 left-2.5"><p className="text-[11px] font-bold text-white">Solveien 12B</p><p className="text-[7px] text-white/75">Bergen · 64 m²</p></div></div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[{ icon: CreditCard, label: 'Husleie', value: '12 300 kr', sub: 'Neste: 1. apr', color: '#059669' },{ icon: MessageCircle, label: 'Meldinger', value: '2 nye', sub: 'Fra forvalter', color: '#3b82f6' },{ icon: Wrench, label: 'Saker', value: '0 aktive', sub: 'Alt i orden', color: '#059669' },{ icon: FileText, label: 'Dokumenter', value: '4 filer', sub: 'Kontrakt m.m.', color: P }].map((item: any, i: number) => (
              <div key={i} className="rounded-[12px] bg-white/[0.04] border border-white/[0.05] p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5"><item.icon className="w-3 h-3" style={{ color: item.color }} strokeWidth={1.5} /><span className="text-[8px] text-white/60">{item.label}</span></div>
                <p className="text-[12px] font-bold text-white tracking-[-0.01em]">{item.value}</p><p className="text-[7px] text-white/55 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[12px] p-3" style={{ backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.1)' }}>
            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#059669]/20 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={2.5} /></div><div><p className="text-[10px] font-semibold text-[#059669]">Husleie betalt</p><p className="text-[7px] text-[#059669]/50">Mars 2026 · 12 300 kr</p></div></div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center justify-around">
            {[{ icon: Home, label: 'Hjem', active: true },{ icon: CreditCard, label: 'Husleie' },{ icon: Wrench, label: 'Saker' },{ icon: FileText, label: 'Profil' }].map((item: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-0.5 py-1"><item.icon className={`w-3.5 h-3.5 ${item.active ? 'text-white/70' : 'text-white/15'}`} strokeWidth={1.3} /><span className={`text-[6px] ${item.active ? 'text-white/75' : 'text-white/15'}`}>{item.label}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeckAIChatPhone({ active }: { active: boolean }) {
  const chatRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => { if (chatRef.current && step > 0) { const t = setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), step >= 10 ? 700 : 50); return () => clearTimeout(t); } }, [step]);
  useEffect(() => {
    if (!active) { setStep(0); return; }
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    const run = () => { timeouts.forEach(clearTimeout); timeouts = []; setStep(0);
      [[0,0],[700,1],[2400,2],[4000,3],[5600,4],[7200,5],[8800,6],[10400,7],[12000,8],[13600,9],[15000,10]].forEach(([d,v]) => timeouts.push(setTimeout(() => setStep(v), d)));
      timeouts.push(setTimeout(run, 22000));
    };
    run();
    return () => timeouts.forEach(clearTimeout);
  }, [active]);

  const Av = () => <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${P}10` }}><Sparkles className="w-3 h-3" style={{ color: P }} strokeWidth={1.3} /></div>;
  const JA = () => <img src="https://customer-assets.emergentagent.com/job_9ac850f1-4c4e-4305-b194-8cd3509969c1/artifacts/93xk0b12_GWeZ391lh9hfONZ36JQzJ_ns7qFd8s.png?w=80&h=80&fit=crop&crop=face" alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />;
  const UMsg = ({ text, show }: any) => <div style={{ maxHeight: show ? 80 : 0, opacity: show ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease', marginBottom: show ? 10 : 0 }}><div className="flex items-end justify-end gap-1.5"><div className="max-w-[190px] rounded-[18px] rounded-br-[5px] px-3 py-2" style={{ backgroundColor: `${P}18`, border: `1px solid ${P}25` }}><p className="text-[10px] text-white/90 leading-[1.6]">{text}</p></div><JA /></div></div>;
  const AMsg = ({ text, show }: any) => <div style={{ maxHeight: show ? 100 : 0, opacity: show ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease', marginBottom: show ? 10 : 0 }}><div className="flex items-start gap-1.5"><Av /><div className="max-w-[200px] rounded-[18px] rounded-tl-[5px] px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}><p className="text-[10px] text-white/70 leading-[1.6]">{text}</p></div></div></div>;
  const Typing = ({ show }: any) => <div style={{ maxHeight: show ? 40 : 0, opacity: show ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.4s, opacity 0.3s', marginBottom: show ? 10 : 0 }}><div className="flex items-start gap-1.5"><Av /><div className="rounded-[18px] rounded-tl-[5px] px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}><div className="flex items-center gap-[4px]">{[0,1,2].map(i => <div key={i} className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: P, opacity: 0.5, animation: `deck-typing 1.2s ease-in-out ${i*0.15}s infinite` }} />)}</div></div></div></div>;

  return (
    <div className="w-[270px] rounded-[36px] bg-[#0a0a0a] p-[6px]" style={{ boxShadow: '0 50px 100px rgba(0,0,0,0.3), 0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.08)' }}>
      <style>{`@keyframes deck-typing { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-3px) } }`}</style>
      <div className="w-[80px] h-[22px] bg-[#0a0a0a] rounded-b-[12px] mx-auto -mt-[6px] relative z-20" />
      <div className="rounded-[30px] overflow-hidden -mt-[22px] flex flex-col" style={{ height: 520 }}>
        <div className="px-4 pt-4 pb-3" style={{ backgroundColor: '#141414', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3"><img src="/digihome-logo-dark.svg" alt="" className="h-[12px] w-auto opacity-80" /><div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(5,150,105,0.15)' }}><div className="w-[4px] h-[4px] rounded-full bg-[#059669]" /><span className="text-[7px] font-semibold text-[#059669]">Online</span></div></div>
          <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${P}20` }}><Sparkles className="w-4 h-4" style={{ color: P }} strokeWidth={1.2} /></div><div><p className="text-[7px] text-white/70">Driftsassistent</p><p className="text-[14px] font-bold text-white tracking-[-0.01em]">DigiHome AI</p></div></div>
        </div>
        <div ref={chatRef} className="px-3.5 pt-3 pb-2 flex-1 overflow-y-auto" style={{ backgroundColor: '#141414', scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-2.5 mb-3"><div className="flex-1 h-[1px] bg-white/[0.1]" /><span className="text-[7px] font-semibold text-white/55 uppercase tracking-wider">I dag</span><div className="flex-1 h-[1px] bg-white/[0.1]" /></div>
          <UMsg text="Hei, stekeovnen har sluttet å virke. Ingen av platene blir varme." show={step >= 1} />
          <Typing show={step === 2} />
          <AMsg text="Hei Stine! Beklager det. Jeg oppretter en sak og finner en elektriker." show={step >= 3} />
          <UMsg text="Tusen takk! Hvor lang tid tar det?" show={step >= 4} />
          <Typing show={step === 5} />
          <AMsg text="Bergen Elektro kan komme fredag 10-12. Skal jeg bekrefte?" show={step >= 6} />
          <UMsg text="Ja, perfekt!" show={step >= 7} />
          <Typing show={step === 8} />
          <AMsg text="Bekreftet! Du får påminnelse torsdag kveld." show={step >= 9} />
          <div className="ml-8 mb-2" style={{ maxHeight: step >= 10 ? 100 : 0, opacity: step >= 10 ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease' }}>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="px-3 py-2 flex items-center gap-1.5" style={{ backgroundColor: `${P}08`, borderBottom: `1px solid ${P}12` }}><Sparkles className="w-2.5 h-2.5" style={{ color: P }} strokeWidth={1.5} /><span className="text-[8px] font-bold" style={{ color: P }}>AI opprettet automatisk</span></div>
              <div className="px-3 py-2.5 flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}><Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={2} /></div><div><p className="text-[10px] font-bold text-white/80">Sak #1042</p><p className="text-[8px] text-white/75 mt-0.5">Bergen Elektro · Fre 10:00</p></div></div>
            </div>
          </div>
        </div>
        <div className="px-3.5 pb-3 pt-1.5" style={{ backgroundColor: '#141414' }}>
          <div className="h-[38px] rounded-xl px-3 flex items-center gap-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}><Plus className="w-3.5 h-3.5 text-white/55" strokeWidth={1.8} /><span className="text-[10px] text-white/55 flex-1">Skriv en melding...</span><div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${P}20` }}><ArrowRight className="w-2.5 h-2.5" style={{ color: P }} strokeWidth={2} /></div></div>
        </div>
      </div>
    </div>
  );
}

function DeckPhoneDuo({ active }: { active: boolean }) {
  return (
    <div className="relative flex justify-center lg:block lg:w-[480px]" style={{ minHeight: 580 }}>
      <div className="absolute hidden lg:block" style={{ left: 0, top: 0, zIndex: 1 }}><DeckTenantPhone /></div>
      <div className="relative lg:absolute lg:left-[185px] lg:top-[35px]" style={{ zIndex: 2 }}><DeckAIChatPhone active={active} /></div>
    </div>
  );
}

/* ═══ SLIDES ═══ */

const S1 = (p: any) => {
  const isPdf = !!p.pdfMode;
  const showFinal = p.isActive || isPdf;
  return (
  <SlideFrame img="/bergen-aerial.webp" overlay="transparent" {...p}>
    <style>{`
      @keyframes s1EyebrowIn { from { opacity: 0; transform: translateY(-8px); letter-spacing: 0.4em; } to { opacity: 1; transform: translateY(0); letter-spacing: 0.32em; } }
      @keyframes s1TitleIn { from { opacity: 0; transform: translateY(26px); filter: blur(10px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes s1SubIn { from { opacity: 0; transform: translateY(14px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes s1CornerInL { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes s1CornerInR { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes s1Tick { 0%,100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
      @keyframes s1Line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    {/* ═══ ATMOSPHERIC OVERLAY — refined premium (less purple, more editorial dark) ═══ */}
    {/* Layer 1: Duotone multiply (cinematic depth, keeps city visible) */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ backgroundColor: '#0a0a0a', opacity: 0.42, mixBlendMode: 'multiply' }} />
    {/* Layer 2: Editorial gradient — minimal purple (only top hint), richer dark bottom */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(91,63,168,0.12) 0%, rgba(10,10,10,0.32) 30%, rgba(10,10,10,0.72) 75%, rgba(10,10,10,0.95) 100%)' }} />
    {/* Layer 3: Radial vignette — tighter for focal drama */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 62% 46% at 50% 50%, rgba(10,10,10,0.42) 0%, transparent 72%)' }} />

    {/* ═══ CENTRAL HERO — wordmark + tagline ═══ */}
    <div className="w-full text-center px-6 sm:px-12 relative z-10 my-auto">
      <h1 className="font-bold leading-[0.92] tracking-[-0.045em] mb-6 sm:mb-8"
          style={{
            ...FH,
            fontSize: 'clamp(76px, min(13vw, 20vh), 184px)',
            color: '#ffffff',
            textShadow: '0 2px 30px rgba(10,10,10,0.55), 0 0 90px rgba(210,152,255,0.22)',
            animation: (p.isActive && !isPdf) ? 's1TitleIn 1.1s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined,
            opacity: showFinal ? 1 : 0,
          }}>
        <span>Digi</span><span style={{ color: '#c39ce0' }}>Home</span>
      </h1>
      <p className="mx-auto font-light"
         style={{
           ...F,
           fontSize: 'clamp(18px, min(1.75vw, 2.6vh), 28px)',
           color: 'rgba(255,255,255,0.95)',
           letterSpacing: '-0.012em',
           lineHeight: 1.25,
           maxWidth: 'clamp(320px, 56vw, 720px)',
           textShadow: '0 1px 18px rgba(10,10,10,0.7)',
           animation: (p.isActive && !isPdf) ? 's1SubIn 1s cubic-bezier(0.22,1,0.36,1) 0.85s both' : undefined,
           opacity: showFinal ? 1 : 0,
         }}>
        Utleie på autopilot.
      </p>
    </div>

    {/* ═══ LEFT CORNER — UTGIVER ═══ */}
    <div className="absolute z-20 pointer-events-none"
         style={{ left: 'clamp(24px, 3.2vw, 56px)', bottom: 'clamp(24px, 4vh, 56px)',
                  animation: (p.isActive && !isPdf) ? 's1CornerInL 1s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined,
                  opacity: showFinal ? 1 : 0 }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px bg-white/35" style={{ width: 'clamp(18px, 2vw, 28px)' }} />
        <p className="text-white/65 uppercase font-semibold" style={{ fontSize: 'clamp(9px, 0.72vw, 10.5px)', letterSpacing: '0.28em' }}>Utgiver</p>
      </div>
      <p className="text-white font-semibold" style={{ ...F, fontSize: 'clamp(13px, 1vw, 15px)', letterSpacing: '-0.008em' }}>DigiHome Tech AS</p>
      <p className="text-white/55 font-light mt-0.5" style={{ fontSize: 'clamp(10.5px, 0.8vw, 12px)' }}>Bergen, Norge</p>
    </div>

    {/* ═══ RIGHT CORNER — STATUS ═══ */}
    <div className="absolute z-20 pointer-events-none text-right"
         style={{ right: 'clamp(24px, 3.2vw, 56px)', bottom: 'clamp(24px, 4vh, 56px)',
                  animation: (p.isActive && !isPdf) ? 's1CornerInR 1s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined,
                  opacity: showFinal ? 1 : 0 }}>
      <div className="flex items-center gap-2 mb-2 justify-end">
        <p className="text-white/65 uppercase font-semibold" style={{ fontSize: 'clamp(9px, 0.72vw, 10.5px)', letterSpacing: '0.28em' }}>Status</p>
        <div className="h-px bg-white/35" style={{ width: 'clamp(18px, 2vw, 28px)' }} />
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#c39ce0', boxShadow: '0 0 8px rgba(195,156,224,0.65)', animation: 's1Tick 2.4s ease-in-out infinite' }} />
        <p className="text-white font-semibold" style={{ ...F, fontSize: 'clamp(13px, 1vw, 15px)', letterSpacing: '-0.008em' }}>Konfidensielt</p>
      </div>
      <p className="text-white/55 font-light mt-0.5" style={{ fontSize: 'clamp(10.5px, 0.8vw, 12px)' }}>Kvalifiserte investorer</p>
    </div>
  </SlideFrame>
  );
};

/* ═══ PROBLEM SLIDE — Structural-shift narrative · venture-framing ═══ */
const SProblem = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  const AC = '#a052e0';      // lesbar merkevare-lilla på lys bakgrunn
  const INK = '#0c0c0c';
  const INK2 = '#1c1714';
  const SUB = '#57514a';
  const MUT = '#8a8278';
  const HAIR = 'rgba(20,15,10,0.09)';

  const shifts = [
    {
      num: '01',
      title: 'Mange løse tråder',
      body: 'Annonser, visninger, henvendelser, betalinger og leverandører må følges opp samtidig — på tvers av flere boliger. Én glipp koster både inntekt og omdømme.',
    },
    {
      num: '02',
      title: 'Mer ansvar',
      body: 'Kontrakt, skatt, depositum, dokumentasjon og stadig strengere regelverk ligger på utleier. Feil blir dyrere — og oppdages ofte først når det er for sent.',
    },
    {
      num: '03',
      title: 'Høyere forventninger',
      body: 'Leietakere forventer raske svar, digital oppfølging og ryddig dokumentasjon. Det som før var god service, er nå et minimumskrav.',
    },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes prbFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes prbHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes prbGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes prbRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 12%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 22%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1180px] mx-auto px-6 sm:px-12 my-auto">

      {/* ═══ HEADER — editorial ═══ */}
      <div className="max-w-[880px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]"
              data-testid="problem-kicker"
              style={{ ...F, color: AC, animation: anim ? 'prbFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
          Problemet
        </span>
        <h2 className="tracking-[-0.035em] leading-[1.02] mt-6"
            data-testid="problem-headline"
            style={{ ...FH, fontWeight: 700, fontSize: 'clamp(32px, 4.4vw, 60px)', color: INK,
                     animation: anim ? 'prbHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Utleie har gått fra passiv inntekt<br className="hidden md:block" /> til <span style={{ color: AC }}>aktiv drift.</span>
        </h2>
        <span className="block mt-7 h-px rounded-full"
              style={{ width: 64, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left',
                       animation: anim ? 'prbGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: show ? undefined : 0 }} />
        <p className="text-[15px] sm:text-[16.5px] font-normal leading-[1.6] mt-7 max-w-[640px]"
           style={{ ...F, color: SUB, animation: anim ? 'prbFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.65s both' : undefined, opacity: show ? undefined : 0 }}>
          Flere kanaler, strengere krav og høyere forventninger gjør at vanlige utleiere plutselig må opptre som profesjonelle operatører.
        </p>
      </div>

      {/* ═══ 3 problempunkter — hårlinje-separerte kolonner, INGEN bokser ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 mt-11 sm:mt-14">
        {shifts.map((s, i) => (
          <div key={s.num} className="relative md:px-9 first:md:pl-0 last:md:pr-0 py-7 md:py-0"
               data-testid={`problem-shift-${i + 1}`}
               style={{ animation: anim ? `prbFade 0.8s cubic-bezier(0.22,1,0.36,1) ${0.8 + i * 0.13}s both` : undefined, opacity: show ? undefined : 0 }}>
            {/* vertikal hårlinje mellom kolonner (desktop) */}
            {i > 0 && <span aria-hidden="true" className="hidden md:block absolute left-0 top-1 bottom-1 w-px" style={{ background: HAIR, transformOrigin: 'top',
                        animation: anim ? `prbRise 0.7s cubic-bezier(0.22,1,0.36,1) ${0.85 + i * 0.13}s both` : undefined }} />}
            {/* horisontal hårlinje (mobil) */}
            {i > 0 && <span aria-hidden="true" className="md:hidden absolute left-0 right-0 top-0 h-px" style={{ background: HAIR }} />}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[11px] font-bold tabular-nums tracking-[0.2em]" style={{ ...F, color: AC }}>{s.num}</span>
              <span className="h-px flex-1" style={{ background: HAIR }} />
            </div>
            <h3 className="text-[21px] sm:text-[23px] tracking-[-0.02em] leading-[1.12] mb-3.5" style={{ ...FH, fontWeight: 700, color: INK }}>{s.title}</h3>
            <p className="text-[13px] sm:text-[14px] font-normal leading-[1.62] max-w-[330px]" style={{ ...F, color: SUB }}>{s.body}</p>
          </div>
        ))}
      </div>

      {/* ═══ KONSEKVENSEN — kantløs redaksjonell koda (ingen mørk boks) ═══ */}
      <div className="mt-11 sm:mt-14 pt-9 grid grid-cols-1 md:grid-cols-[1fr_auto_1.05fr] gap-8 md:gap-12 items-stretch"
           data-testid="problem-insight-block"
           style={{ borderTop: `1px solid ${HAIR}`, animation: anim ? 'prbFade 0.9s cubic-bezier(0.22,1,0.36,1) 1.2s both' : undefined, opacity: show ? undefined : 0 }}>
        {/* venstre — de to dårlige valgene */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ ...F, color: MUT }}>Konsekvensen</span>
          <p className="text-[18px] sm:text-[21px] tracking-[-0.02em] leading-[1.3] mt-3" style={{ ...FH, fontWeight: 600, color: INK }}>
            Utleiere står igjen med <span style={{ color: AC }}>to dårlige valg.</span>
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-baseline gap-3" data-testid="problem-alt-a">
              <span className="text-[10px] font-bold tabular-nums tracking-[0.2em] w-3" style={{ ...F, color: MUT }}>A</span>
              <span className="text-[13px] sm:text-[13.5px] font-normal leading-[1.5]" style={{ ...F, color: SUB }}>Gjøre alt selv i fragmenterte verktøy.</span>
            </div>
            <div className="flex items-baseline gap-3" data-testid="problem-alt-b">
              <span className="text-[10px] font-bold tabular-nums tracking-[0.2em] w-3" style={{ ...F, color: MUT }}>B</span>
              <span className="text-[13px] sm:text-[13.5px] font-normal leading-[1.5]" style={{ ...F, color: SUB }}>Gi bort marginen til manuell forvaltning.</span>
            </div>
          </div>
        </div>

        {/* vertikal hårlinje */}
        <span aria-hidden="true" className="hidden md:block w-px self-stretch" style={{ background: HAIR }} />

        {/* høyre — DigiHomes svar */}
        <div data-testid="problem-closing" className="flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ ...F, color: AC }}>DigiHome</span>
          <p className="text-[18px] sm:text-[21px] tracking-[-0.02em] leading-[1.32] mt-3" style={{ ...FH, fontWeight: 600, color: INK }}>
            Vi <span style={{ color: AC }}>automatiserer driften</span> som før krevde mennesker — og bygger nettverket som forvalter den i skala.
          </p>
        </div>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SOLUTION SLIDE — 1:1 mapping to problem ═══ */
const SSolution = (p: any) => {
  const active = p.isActive;
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes deckFillFull { from { width: 0%; } to { width: 100%; } }
      @keyframes deckBarUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      @keyframes deckSolIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <div className="max-w-[1120px] mx-auto px-6 sm:px-12 w-full relative z-10">
      <div className="text-center mb-8 sm:mb-11">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4 sm:mb-5" style={{ color: P }}>L&oslash;sningen</p>
        <h2 className="text-[32px] sm:text-[44px] lg:text-[54px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.05] mb-5 sm:mb-6" style={F}>DigiHome l&oslash;ser alle tre.<br/>Automatisk.</h2>
        <p className="text-[14px] sm:text-[16px] text-[#999] leading-[1.75] max-w-[560px] mx-auto">Fra f&oslash;rste mobilbilde til fullt driftet utleie &mdash; uten manuelt arbeid.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 01: 5 min onboarding → maps to Tungvint oppstart */}
        <div className="rounded-[20px] bg-white p-6 sm:p-7 flex flex-col"
          style={{ border: '1px solid #eae7e2', boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 6px 24px rgba(0,0,0,0.025)',
            animation: active ? 'deckSolIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both' : undefined, opacity: active ? undefined : 0 }}>
          <p className="text-[10px] font-bold tracking-[0.15em] mb-5" style={{ color: P }}>01</p>
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#faf8f5' }}>
            <div className="flex items-baseline gap-2">
              <p className="text-[40px] sm:text-[48px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-none" style={F}>5 min</p>
              <p className="text-[13px] text-[#b5aa98] font-semibold">&rarr; live</p>
            </div>
            <div className="w-full h-[5px] rounded-full bg-[#ece9e4] mt-3">
              <div className="h-full rounded-full" style={{ width: active ? '100%' : '0%', background: P, animation: active ? 'deckFillFull 1s cubic-bezier(0.16,1,0.3,1) 0.5s both' : 'none' }} />
            </div>
          </div>
          <h3 className="text-[20px] sm:text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] mb-2" style={F}>Onboarding p&aring; minutter</h3>
          <p className="text-[12px] text-[#888] leading-[1.8] flex-1">Last opp mobilbilder. AI styler, skriver tekst, setter pris og publiserer &mdash; p&aring; Airbnb, Booking.com og FINN.</p>
          <div className="pt-4 mt-4 border-t border-[#f0ede8]">
            <span className="text-[11px] font-semibold" style={{ color: P }}>Erstatter 2&ndash;4 uker og 15 000 kr</span>
          </div>
        </div>

        {/* 02: Dynamisk utleie → maps to Tapt inntekt */}
        <div className="rounded-[20px] bg-white p-6 sm:p-7 flex flex-col"
          style={{ border: '1px solid #eae7e2', boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 6px 24px rgba(0,0,0,0.025)',
            animation: active ? 'deckSolIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both' : undefined, opacity: active ? undefined : 0 }}>
          <p className="text-[10px] font-bold tracking-[0.15em] mb-5" style={{ color: P }}>02</p>
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#faf8f5' }}>
            <p className="text-[40px] sm:text-[48px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-none mb-1.5" style={F}>365</p>
            <div className="flex items-end gap-[3px] h-[24px]">
              {[85, 90, 95, 100, 95, 90, 88, 92, 95, 90, 88, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm origin-bottom" style={{
                  height: `${h * 0.22}px`, background: `${P}30`,
                  animation: active ? `deckBarUp 0.5s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.04}s both` : 'none',
                  transform: active ? undefined : 'scaleY(0)',
                }} />
              ))}
            </div>
          </div>
          <h3 className="text-[20px] sm:text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] mb-2" style={F}>Dynamisk utleie</h3>
          <p className="text-[12px] text-[#888] leading-[1.8] flex-1">Automatisk veksling mellom Airbnb og FINN. Optimaliserer belegg og pris gjennom hele &aring;ret &mdash; basert p&aring; sesong og regelverk.</p>
          <div className="pt-4 mt-4 border-t border-[#f0ede8]">
            <span className="text-[11px] font-semibold" style={{ color: P }}>Maksimerer inntekt alle 365 dager</span>
          </div>
        </div>

        {/* 03: Automatisert drift → maps to Fragmentert drift */}
        <div className="rounded-[20px] bg-white p-6 sm:p-7 flex flex-col"
          style={{ border: '1px solid #eae7e2', boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 6px 24px rgba(0,0,0,0.025)',
            animation: active ? 'deckSolIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <p className="text-[10px] font-bold tracking-[0.15em] mb-5" style={{ color: P }}>03</p>
          <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#faf8f5' }}>
            <div className="flex items-baseline gap-2">
              <p className="text-[40px] sm:text-[48px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-none" style={F}>0</p>
              <p className="text-[13px] text-[#b5aa98] font-semibold">ekstra ansatte</p>
            </div>
            <p className="text-[10px] text-[#b5aa98] mt-1.5">AI h&aring;ndterer alt &mdash; d&oslash;gnet rundt</p>
          </div>
          <h3 className="text-[20px] sm:text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] mb-2" style={F}>Automatisert drift</h3>
          <p className="text-[12px] text-[#888] leading-[1.8] flex-1">AI svarer gjester, koordinerer leverand&oslash;rer, oppretter saker og varsler eier. &Eacute;n plattform erstatter 5+ systemer.</p>
          <div className="pt-4 mt-4 border-t border-[#f0ede8]">
            <span className="text-[11px] font-semibold" style={{ color: P }}>Erstatter manuell drift og koordinering</span>
          </div>
        </div>
      </div>

      <div className="mt-7 sm:mt-9 flex items-center justify-center gap-4">
        <div className="w-12 h-px bg-[#e0ddd8]" />
        <p className="text-[12px] sm:text-[13px] text-[#b5aa98]">Live p&aring; Airbnb f&oslash;r lunsj. Optimalt hele &aring;ret. Driftet automatisk.</p>
        <div className="w-12 h-px bg-[#e0ddd8]" />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ TEAM SLIDE — premium minimalist editorial (hairline rows, no cards) ═══ */
const STeam = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0';      // lesbar merkevare-lilla på lys bakgrunn
  const INK = '#0c0c0c';
  const INK2 = '#1c1714';
  const SUB = '#57514a';
  const MUT = '#8a8278';
  const HAIR = 'rgba(20,15,10,0.09)';
  const team = [
    {
      name: 'Sarah Sleeman',
      role: 'Daglig leder · CEO',
      field: 'Eiendom',
      img: '/team-sarah.webp',
      lead: 'Eiendomsmegler med seks års erfaring fra rådgivende roller i DNB.',
      meta: 'Leder kundeakkvisisjon og forvaltning · Bachelor i eiendomsmegling, BI · DN Aspiring Women',
    },
    {
      name: 'Martin C. Kviteberg',
      role: 'Produktsjef · CPO',
      field: 'Teknologi',
      img: '/team/martin-kviteberg-face.jpg',
      imgStyle: { objectPosition: 'center' },
      lead: 'Gründer av Bnbspesialisten — en av Norges første profesjonelle utleieforvaltere. Sentral i familieselskapet Adonis AS frem mot exit.',
      meta: 'Produkt, automatisering og drift · 10 år som direktør for forretningsutvikling i Adonis AS · BI',
    },
    {
      name: 'Erik Hoffmann-Dahl',
      role: 'Styrets leder · Rådgiver',
      field: 'Jus',
      img: '/team-erik.webp',
      lead: 'Advokat og partner i Hoffmann Thinn. Tegnet selskapsstrukturen som skal bære vekst og emisjon.',
      meta: 'Struktur, kontrakt og compliance · Spesialist på M&A og eiendomstransaksjoner · Investorklarhet',
    },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes teamFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes teamHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes teamGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 14%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 24%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1240px] mx-auto px-6 sm:px-12 my-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-y-12 lg:gap-x-20 items-center">

        {/* ── VENSTRE — editorial intro ── */}
        <div style={{ animation: anim ? 'teamFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
          <span className="text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC }}>Teamet</span>
          <h2 className="tracking-[-0.035em] leading-[1.02] mt-6" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(34px, 4.2vw, 60px)', color: INK }}>
            Bygget av utleiere,<br /><span style={{ color: AC }}>for utleiere.</span>
          </h2>
          <span className="block mt-8 mb-7 h-px rounded-full" style={{ width: 64, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left', animation: anim ? 'teamGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined }} />
          <p className="text-[15px] sm:text-[16.5px] font-normal leading-[1.62] max-w-[400px]" style={{ ...F, color: SUB }}>
            Tre fagfelt — eiendom, teknologi og jus — kjent fra innsiden, før første eksterne kapitalrunde.
          </p>
          <div className="mt-8 flex items-center gap-2.5 text-[12.5px] font-semibold tracking-[-0.005em]" style={{ ...F, color: INK2 }}>
            <span>Eiendom</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: AC }} />
            <span>Teknologi</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: AC }} />
            <span>Jus</span>
          </div>
        </div>

        {/* ── HØYRE — tre medlemmer, hårlinje-separert, ingen bokser ── */}
        <div>
          {team.map((m, i) => (
            <div key={m.name} className="relative flex items-center gap-5 sm:gap-7 py-6 sm:py-[26px]"
                 style={{
                   borderTop: i === 0 ? 'none' : `1px solid ${HAIR}`,
                   animation: anim ? `teamFade 0.8s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.13}s both` : undefined,
                   opacity: show ? undefined : 0,
                 }}>
              {/* portrett — rent, mykt, ingen tung ramme */}
              <div className="shrink-0 w-[86px] h-[86px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden"
                   style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.6), 0 10px 30px -14px rgba(20,15,10,0.35)' }}>
                <img src={m.img} alt={m.name} className="w-full h-full object-cover" style={{ objectPosition: 'top', ...(m.imgStyle || {}) }} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-[20px] sm:text-[23px] tracking-[-0.02em] leading-tight" style={{ ...FH, fontWeight: 700, color: INK }}>{m.name}</h3>
                  <span className="text-[9.5px] font-bold tabular-nums tracking-[0.2em]" style={{ ...F, color: MUT }}>0{i + 1}</span>
                </div>
                <p className="text-[12px] font-semibold mt-1.5 uppercase tracking-[0.06em]" style={{ ...F, color: AC }}>{m.role}</p>
                <p className="text-[13.5px] sm:text-[14px] font-medium leading-[1.55] mt-3 max-w-[440px]" style={{ ...F, color: INK2 }}>{m.lead}</p>
                <p className="text-[12px] sm:text-[12.5px] font-normal leading-[1.6] mt-2 max-w-[440px]" style={{ ...F, color: MUT }}>{m.meta}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  </SlideFrame>
  );
};

const S2 = (p: any) => (
  <SlideFrame img="/bergen-aerial.webp" overlay="linear-gradient(160deg, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 70%)" {...p}>
    <div className="max-w-[950px] mx-auto px-6 sm:px-16 w-full">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4 sm:mb-6" style={{ color: P }}>Problemet</p>
      <h2 className="text-[32px] sm:text-[44px] lg:text-[56px] font-bold text-white tracking-[-0.04em] leading-[1.04] max-w-[600px] mb-8 sm:mb-16">Eiendomsforvaltning er manuelt og fragmentert</h2>
      <div className="rounded-2xl p-6 sm:p-10" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-14">
          {[
            { n: '64%', t: 'av eiendomsforvaltere bruker fortsatt Excel som en sentral del av driften', c: '#ef4444', src: 'Atlas Global Advisors' },
            { n: '3–6', t: 'systemer brukes typisk for å administrere én eiendomsportefølje', c: '#f59e0b', src: 'Bransjeestimat' },
            { n: '30–40%', t: 'av arbeidstiden går til manuell datahåndtering, rapportering og oppfølging', c: P, src: 'MatrixTribe' },
          ].map((d: any, i: number) => (
            <div key={i}>
              <div className="h-[3px] rounded-full mb-5 sm:mb-6" style={{ background: d.c, width: 40 }} />
              <p className="text-[36px] sm:text-[48px] font-bold text-white tracking-[-0.03em] leading-none tabular-nums mb-3">{d.n}</p>
              <p className="text-[13px] sm:text-[14px] text-white/75 leading-[1.7] mb-2">{d.t}</p>
              <p className="text-[10px] text-white/55">{d.src}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/[0.1]">
          <p className="text-[14px] sm:text-[15px] text-white/70 leading-[1.7] max-w-[600px]">En forvalter som bruker 30–40% av tiden på administrasjon mister opptil <span className="text-white/70 font-semibold">1,5 arbeidsdag per uke</span> på oppgaver som kan automatiseres.</p>
        </div>
      </div>
    </div>
  </SlideFrame>
);

const S3 = (p: any) => (
  <SlideFrame bg="white" {...p}>
    <div className="max-w-[1040px] mx-auto px-6 sm:px-16 w-full">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4 sm:mb-6" style={{ color: P }}>Løsningen</p>
      <h2 className="text-[30px] sm:text-[42px] lg:text-[30px] sm:text-[42px] lg:text-[52px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.04] mb-3 sm:mb-4">Én plattform for alt</h2>
      <p className="text-[15px] sm:text-[18px] text-[#999] max-w-[480px] mb-8 sm:mb-16 leading-relaxed">Automatisert eiendomsforvaltning som samler salg, drift, økonomi og kommunikasjon i ett system.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { t: 'Admin Portal', d: 'Salg, saker, økonomi, kontrakter, AI-operasjonssentral', bg: '#0c0c0c', tc: '#fff', dc: 'rgba(255,255,255,0.35)' },
          { t: 'Huseierportal', d: 'Porteføljeinnsikt, oppgjørsrapporter, forvalter-kontakt', bg: '#f4f2ef', tc: '#0c0c0c', dc: '#999' },
          { t: 'Leietakerportal', d: 'Intelligent chat, feilmelding, husleie og dokumenter', bg: '#f4f2ef', tc: '#0c0c0c', dc: '#999' },
          { t: 'AI Core', d: 'Automatisk f\u00f8rstelinje, SOP-styrt, handlingsbasert', bg: P, tc: '#fff', dc: 'rgba(255,255,255,0.55)' },
        ].map((m: any, i: number) => (
          <div key={i} className="rounded-[16px] sm:rounded-[20px] p-5 sm:p-7 flex flex-col justify-between" style={{ background: m.bg, minHeight: 180 }}>
            <div>
              <p className="text-[15px] sm:text-[19px] font-bold mb-2 sm:mb-3" style={{ color: m.tc }}>{m.t}</p>
              <p className="text-[12px] sm:text-[13px] leading-[1.7]" style={{ color: m.dc }}>{m.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </SlideFrame>
);

/* ═══ AI DEMO — Premium animated chat ═══ */
const AI_STEPS = [
  { type: 'user', text: 'Hei, stekeovnen min har sluttet å virke. Ingen av platene blir varme.', delay: 1000 },
  { type: 'typing', delay: 2200 },
  { type: 'ai', text: 'Hei Jonas! Beklager det. Jeg oppretter en sak umiddelbart og finner en ledig elektriker for deg.', delay: 0 },
  { type: 'action', icon: 'case', text: 'Sak #1042 opprettet', sub: 'Stekeovn defekt — Parkveien 12, 1A', color: '#b56eed', delay: 1400 },
  { type: 'action', icon: 'vendor', text: 'Vestland Elektriker kontaktet', sub: 'Venter på bekreftelse...', color: '#3b82f6', delay: 2000 },
  { type: 'card', delay: 2400 },
  { type: 'typing', delay: 1400 },
  { type: 'ai', text: 'Vestland Elektriker kan komme torsdag mellom 10 og 12. Skal jeg bekrefte?', delay: 0 },
  { type: 'user', text: 'Ja, bekreft!', delay: 1800 },
  { type: 'action', icon: 'check', text: 'Avtale bekreftet', sub: 'Leietaker, leverandør og eier varslet', color: '#22c55e', delay: 1200 },
  { type: 'typing', delay: 1000 },
  { type: 'ai', text: 'Alt ordnet! Du får en påminnelse onsdag kveld. Noe annet jeg kan hjelpe med?', delay: 0 },
];

function AIChatDemo({ active }: any) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scrollRef = React.useRef<any>(null);
  const timeoutRef = React.useRef<any>(null);
  const idxRef = React.useRef(0);

  const stop = React.useCallback(() => { clearTimeout(timeoutRef.current); setPlaying(false); setShowTyping(false); }, []);

  const runSequence = React.useCallback(() => {
    stop();
    setVisibleCount(0);
    setPlaying(true);
    idxRef.current = 0;

    const next = () => {
      if (idxRef.current >= AI_STEPS.length) { setPlaying(false); return; }
      const s = AI_STEPS[idxRef.current];
      if (s.type === 'typing') {
        setShowTyping(true);
        idxRef.current++;
        timeoutRef.current = setTimeout(() => { setShowTyping(false); next(); }, s.delay);
      } else {
        setVisibleCount((prev: any) => prev + 1);
        idxRef.current++;
        const nextDelay = AI_STEPS[idxRef.current - 1].delay || 400;
        if (idxRef.current < AI_STEPS.length) {
          timeoutRef.current = setTimeout(next, nextDelay);
        } else {
          setPlaying(false);
        }
      }
    };
    timeoutRef.current = setTimeout(next, 1200);
  }, [stop]);

  React.useEffect(() => {
    if (active) runSequence();
    else { stop(); setVisibleCount(0); }
    return () => clearTimeout(timeoutRef.current);
  }, [active, runSequence, stop]);
  React.useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [visibleCount, showTyping]);

  const renderItems = AI_STEPS.filter((s: any) => s.type !== 'typing');
  let shown = 0;

  /* AI avatar */
  const aiIco = () => <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${P}, #9333ea)` }}><svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 12 18.469c-.84 0-1.632.334-2.197.928l-.331.331"/></svg></div>;
  const userIco = () => <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden ring-2 ring-white" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}><img src="/chat-user.webp" alt="" className="w-full h-full object-cover" /></div>;

  return (
    <div className="relative">
      <style>{`
        @keyframes msgIn { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes actionIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes dotBounce { 0%,80%,100% { transform:scale(0.5); opacity:0.3; } 40% { transform:scale(1); opacity:0.8; } }
        @keyframes pulseGlow { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
      `}</style>

      {/* Chat container */}
      <div className="rounded-[20px] overflow-hidden bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 24px 68px rgba(0,0,0,0.07)' }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-white" style={{ borderBottom: '1px solid #f0ede8' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${P}, #9333ea)` }}>
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 12 18.469c-.84 0-1.632.334-2.197.928l-.331.331"/></svg>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-[2.5px] border-white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#0c0c0c]">DigiHome AI</p>
              <p className="text-[11px] text-[#737373]">Driftsassistent</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#f0fdf4]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" style={{ animation: 'glow 2s ease-in-out infinite' }} />
            <span className="text-[10px] font-semibold text-[#15803d]">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="px-5 py-6 h-[440px] overflow-y-auto" style={{ scrollbarWidth: 'none', background: '#faf9f7' }}>
          <div className="flex flex-col gap-6">
          {renderItems.map((s: any, i: number) => {
            shown++;
            if (shown > visibleCount) return null;

            /* ── Action pills ── */
            if (s.type === 'action') {
              return (
                <div key={i} className="flex justify-center py-0.5" style={{ animation: 'cardPop 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full" style={{ background: `${s.color}06`, border: `1px solid ${s.color}15` }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.color}14` }}>
                      {s.icon === 'case' && <svg className="w-2.5 h-2.5" style={{color:s.color}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                      {s.icon === 'vendor' && <svg className="w-2.5 h-2.5" style={{color:s.color}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/></svg>}
                      {s.icon === 'check' && <svg className="w-2.5 h-2.5" style={{color:s.color}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold" style={{ color: s.color }}>{s.text}</p>
                      <p className="text-[10px]" style={{ color: `${s.color}66` }}>{s.sub}</p>
                    </div>
                  </div>
                </div>
              );
            }

            /* ── Vendor card ── */
            if (s.type === 'card') {
              return (
                <div key={i} className="flex items-start gap-2.5" style={{ animation: 'cardPop 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
                  {aiIco()}
                  <div className="w-[270px] rounded-2xl rounded-tl-md bg-white overflow-hidden" style={{ border: '1px solid #eae7e2', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-[#15803d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0c0c0c]">Vestland Elektriker</p>
                        <div className="flex items-center gap-1 mt-0.5"><span className="text-[10px] text-[#b45309]">&#9733;</span><span className="text-[10px] text-[#888]">4.9 · 127 oppdrag</span></div>
                      </div>
                    </div>
                    <div className="mx-3 border-t border-[#f5f2ed]" />
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-[11px] text-[#999]">Ledig</span>
                      <span className="text-[12px] font-semibold text-[#0c0c0c]">Torsdag 10:00</span>
                    </div>
                    <div className="mx-3 border-t border-[#f5f2ed]" />
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-[11px] text-[#999]">Estimert pris</span>
                      <span className="text-[12px] font-semibold text-[#15803d]">890 kr</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* ── Chat messages ── */
            const isAI = s.type === 'ai';
            return (
              <div key={i} className={`flex items-start gap-2.5 ${isAI ? '' : 'flex-row-reverse'}`} style={{ animation: 'msgSlide 0.55s cubic-bezier(0.16,1,0.3,1)' }}>
                {isAI ? aiIco() : userIco()}
                <div className={`max-w-[260px] px-4 py-2.5 text-[13px] leading-[1.7] ${isAI ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tr-md'}`}
                  style={isAI
                    ? { background: '#fff', border: '1px solid #eae7e2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', color: '#333' }
                    : { background: '#0c0c0c', color: '#fff' }}>
                  {s.text}
                </div>
              </div>
            );
          })}

          {/* Typing */}
          {showTyping && (
            <div className="flex items-start gap-2.5" style={{ animation: 'msgSlide 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
              {aiIco()}
              <div className="px-5 py-3 rounded-2xl rounded-tl-md flex items-center gap-2 bg-white" style={{ border: '1px solid #eae7e2', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                {[0,1,2].map((d: any) => <div key={d} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: P, animation: `dotPulse 1.4s ease-in-out ${d*0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 flex items-center gap-2.5 bg-white" style={{ borderTop: '1px solid #f0ede8' }}>
          <div className="flex-1 h-10 px-4 rounded-full bg-[#f5f3f0] flex items-center">
            <span className="text-[13px] text-[#ccc]">Skriv en melding...</span>
          </div>
          {playing ? (
            <button onClick={stop} className="w-10 h-10 rounded-full bg-[#f5f3f0] hover:bg-[#eae7e2] flex items-center justify-center transition-colors shrink-0">
              <svg className="w-4 h-4 text-[#999]" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </button>
          ) : (
            <button onClick={runSequence} className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 shrink-0" style={{ background: `linear-gradient(135deg, ${P}, #9333ea)` }}>
              <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const SAI = (p: any) => (
  <SlideFrame bg="white" {...p}>
    <div className="max-w-[1100px] mx-auto px-6 sm:px-16 w-full relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_430px] gap-10 lg:gap-16 items-center">
        {/* Left */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4 sm:mb-6" style={{ color: P }}>Automatisert forvaltning</p>
          <h2 className="text-[30px] sm:text-[40px] lg:text-[30px] sm:text-[40px] lg:text-[48px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.06] mb-4 sm:mb-6">Din digitale<br/>driftsassistent</h2>
          <p className="text-[15px] sm:text-[17px] text-[#999] leading-relaxed mb-8 lg:mb-14 max-w-[380px]">Leietaker melder feil — AI dokumenterer, koordinerer leverandør og varsler eier. Hele prosessen, automagisk.</p>

          <div className="space-y-5 hidden lg:block">
            {[
              { n: '< 30s', t: 'Responstid', d: 'AI svarer umiddelbart, hele døgnet' },
              { n: '85%', t: 'Automatisk løst', d: 'De fleste henvendelser håndteres uten forvalter' },
              { n: '100%', t: 'Dokumentert', d: 'Hver interaksjon logges og spores' },
            ].map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-5">
                <div className="w-[72px] shrink-0"><p className="text-[26px] font-bold text-[#0c0c0c] tabular-nums tracking-tight">{s.n}</p></div>
                <div className="h-8 w-px bg-[#e8e5e0]" />
                <div><p className="text-[14px] font-medium text-[#555]">{s.t}</p><p className="text-[12px] text-[#737373]">{s.d}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — phone duo mockup */}
        <DeckPhoneDuo active={p.isActive} />
      </div>
    </div>
  </SlideFrame>
);

/* ═══ PRODUCT GLANCE — layered UI collage teaser ═══ */

const SProductGlance = (p: any) => {
  const active = p.isActive;
  const [viewIdx, setViewIdx] = React.useState(0);
  const sidebarMap = ['Oversikt', 'Kalender', 'Eiendommer', 'Operasjonssentral', 'Økonomi'];
  React.useEffect(() => {
    if (!active) { setViewIdx(0); return; }
    const id = setInterval(() => setViewIdx(v => (v + 1) % 5), 5000);
    return () => clearInterval(id);
  }, [active]);


  // ═══ FULL sidebar matching actual admin portal 1:1 ═══
  const SidebarFull = ({ activeItem }: { activeItem: string }) => {
    const sections: Array<{ section?: string; label?: string; Icon?: any; badge?: string; beta?: boolean; divider?: boolean }> = [
      { section: 'ARBEID' },
      { label: 'Oversikt', Icon: LayoutDashboard },
      { label: 'Innboks', Icon: MessageSquare, badge: '38' },
      { label: 'Reservasjoner', Icon: ClipboardList },
      { label: 'Kalender', Icon: CalendarDays },
      { label: 'Kanaler', Icon: Radio },
      { label: 'Oppgaver', Icon: ClipboardCheck },
      { label: 'Operasjonssentral', Icon: Sparkles, beta: true },
      { section: 'DRIFT' },
      { label: 'Eiendommer', Icon: Building2 },
      { label: 'Leie', Icon: FileText },
      { label: 'Saker', Icon: AlertCircle },
      { label: 'Personer', Icon: Users },
      { label: 'Leverandører', Icon: Wrench },
      { label: 'Driftshåndbok', Icon: BookOpen },
      { section: 'ADMINISTRASJON' },
      { label: 'Analyse', Icon: PieChart },
      { label: 'Salg', Icon: TrendingUp },
      { label: 'Økonomi', Icon: DollarSign },
      { label: 'Organisasjon', Icon: Building2 },
      { label: 'Superadmin', Icon: Shield },
    ];
    return (
      <div className="bg-[#1a1a1a] text-white flex flex-col shrink-0" style={{ width: '196px', fontFamily: "var(--font-body), 'ABC Diatype', sans-serif" }}>
        {/* Logo header — exact match to real portal */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <img src="/logo-light.svg" alt="Digihome" className="h-[20px] w-auto opacity-90" />
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-white/50">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-2 space-y-[2px] overflow-hidden">
          {sections.map((it: any, i) => {
            if (it.section) {
              return <p key={i} className="text-[9px] font-semibold text-white/55 uppercase tracking-[0.12em] px-3 pt-4 pb-1">{it.section}</p>;
            }
            const isActive = it.label === activeItem;
            const IconComp = it.Icon;
            return (
              <div key={i} className={`group flex items-center gap-2.5 px-3 py-[5px] rounded-lg text-[11px] font-medium relative ${isActive ? 'bg-white/[0.08] text-white' : 'text-white/55'}`}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-r-full bg-white/60" />}
                <IconComp className="w-[13px] h-[13px] shrink-0" strokeWidth={1.5} />
                <span>{it.label}</span>
                {it.badge && <span className="ml-auto min-w-[16px] h-[14px] px-1 rounded-full bg-white/15 text-white text-[8.5px] font-bold flex items-center justify-center tabular-nums">{it.badge}</span>}
                {it.beta && <span className="ml-auto text-[7.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ color: '#af6ee8', background: 'rgba(175,110,232,0.1)' }}>Beta</span>}
              </div>
            );
          })}
        </nav>
        {/* User profile footer */}
        <div className="px-2 py-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <img src="/team-martin.webp" alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-white/55 truncate">Martin Kviteberg</p>
              <p className="text-[8px] text-white/55 truncate">martin@kviteberg.no</p>
            </div>
            <ChevronDown className="w-2.5 h-2.5 text-white/55" strokeWidth={2} />
          </div>
        </div>
      </div>
    );
  };

  // ═══ COLLAPSED sidebar for secondary mockups ═══
  const SidebarMini = ({ activeItem }: { activeItem: string }) => {
    const items = [
      { label: 'Oversikt', Icon: LayoutDashboard },
      { label: 'Innboks', Icon: MessageSquare, badge: true },
      { label: 'Reservasjoner', Icon: ClipboardList },
      { label: 'Kalender', Icon: CalendarDays },
      { label: 'Kanaler', Icon: Radio },
      { label: 'Oppgaver', Icon: ClipboardCheck },
      { divider: true } as any,
      { label: 'Eiendommer', Icon: Building2 },
      { label: 'Leie', Icon: FileText },
      { label: 'Saker', Icon: AlertCircle },
      { label: 'Personer', Icon: Users },
      { label: 'Analyse', Icon: PieChart },
    ];
    return (
      <div className="bg-[#1a1a1a] flex flex-col items-center shrink-0 py-3.5" style={{ width: '46px' }}>
        <div className="flex items-center justify-center mb-3">
          <img src="/digihome-favicon-purple.svg" alt="" className="w-5 h-5 opacity-90" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5 w-full px-1.5">
          {items.map((it: any, i) => {
            if (it.divider) return <div key={i} className="h-px w-5 bg-white/[0.08] my-1.5" />;
            const isActive = it.label === activeItem;
            const IconComp = it.Icon;
            return (
              <div key={i} className={`relative w-full h-[28px] rounded-md flex items-center justify-center ${isActive ? 'bg-white/[0.08]' : ''}`}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-r-full bg-white/60" />}
                <IconComp className={`w-[14px] h-[14px] ${isActive ? 'text-white' : 'text-white/55'}`} strokeWidth={1.5} />
                {it.badge && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: '#af6ee8' }} />}
              </div>
            );
          })}
        </div>
        <div className="w-7 h-7 rounded-full overflow-hidden mt-2">
          <img src="/team-martin.webp" alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    );
  };

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes pgIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pgFade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pgFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      @keyframes pgPulse { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
      @keyframes pgHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes pgDashboardIn { 0% { opacity: 0; transform: translateX(80px) scale(0.92); filter: blur(8px); } 60% { filter: blur(0); } 100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); } }
      @keyframes pgCalendarIn { 0% { opacity: 0; transform: translateY(80px) scale(0.92); filter: blur(6px); } 60% { filter: blur(0); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
      @keyframes pgMobileIn { 0% { opacity: 0; transform: translateY(-60px) translateX(40px) scale(0.88); filter: blur(6px); } 55% { filter: blur(0); } 100% { opacity: 1; transform: translateY(0) translateX(0) scale(1); filter: blur(0); } }
      @keyframes pgOppgjorIn { 0% { opacity: 0; transform: translateX(60px) scale(0.88); filter: blur(6px); } 60% { filter: blur(0); } 100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); } }
      @keyframes pgChipIn { from { opacity: 0; transform: translateY(6px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes pgBarIn { 0% { opacity: 0; transform: scaleX(0.3) translateX(-4px); transform-origin: left center; } 60% { opacity: 1; } 100% { opacity: 1; transform: scaleX(1) translateX(0); transform-origin: left center; } }
      @keyframes pgMsgIn { from { opacity: 0; transform: translateY(10px); filter: blur(3px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes pgKpiIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pgCountUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>

    <div className="w-full max-w-[1320px] mx-auto px-6 sm:px-12 flex flex-col" style={{ minHeight: 'calc(100vh - 112px)' }}>

      {/* ═══ TOP — Editorial header ═══ */}
      <div className="pt-4 sm:pt-7 pb-5 sm:pb-7">
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <h2 className="text-[30px] sm:text-[42px] lg:text-[50px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.04] max-w-[860px]"
              style={{ ...F, animation: active ? 'pgHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined, opacity: active ? undefined : 0 }}
              data-testid="product-headline">
            Produktet er bygget. <span className="md:block">Nå skal <span style={{ color: P }}>markedet vinnes.</span></span>
          </h2>
          <p className="text-[12.5px] sm:text-[14px] text-[#5a564d] leading-[1.55] font-light tracking-[-0.003em] max-w-[420px] mb-1"
             style={{ ...F, animation: active ? 'pgFade 0.7s ease-out 0.4s both' : undefined, opacity: active ? undefined : 0 }}>
            Ett system for hele utleien — fra annonse og kontrakt til drift, betaling og oppfølging.
          </p>
        </div>
      </div>

      {/* ═══ MIDDLE — Auto-switching dashboard hero ═══ */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 mb-6 sm:mb-10">
        {/* Soft purple glow */}
        <div aria-hidden="true" className="absolute pointer-events-none" style={{
          top: '4%', left: '6%', right: '6%', bottom: '4%',
          background: `radial-gradient(ellipse at 70% 40%, ${P}1c 0%, ${P}08 35%, transparent 70%)`,
          filter: 'blur(50px)',
          animation: active ? 'pgFade 1.3s ease-out 0.6s both' : undefined,
          opacity: active ? undefined : 0,
        }} />

        {/* Dashboard plate — single frame, sidebar persistent, content cross-fades */}
        <div className="relative rounded-[16px] bg-white overflow-hidden flex w-full max-w-[1220px]"
             data-testid="product-dashboard"
             style={{
               height: '620px',
               border: '1px solid #e4dfd6',
               boxShadow: '0 4px 8px rgba(20,15,10,0.05), 0 50px 110px rgba(20,15,10,0.22)',
               animation: active ? 'pgDashboardIn 1.05s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined,
               opacity: active ? undefined : 0,
             }}>
          <SidebarFull activeItem={sidebarMap[viewIdx]} />

          <div className="flex-1 relative overflow-hidden bg-[#fdfbf7]">
            {/* ─── VIEW 0: OVERSIKT — mirrors real /admin dashboard ─── */}
            <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ opacity: viewIdx === 0 ? 1 : 0, transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: viewIdx === 0 ? 'auto' : 'none' }}>
              {/* Greeting row */}
              <div className="flex items-center justify-between px-7 pt-5 pb-4 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src="/team-martin.webp" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] leading-tight" style={F}>God dag, Martin</h3>
                    <p className="text-[11px] text-[#8a8478] mt-0.5">Monday, April 27, 2026</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-white border border-[#e4dfd6]">
                    <span className="text-[11px] font-medium text-[#0c0c0c]">Saker</span>
                    <span className="text-[9.5px] font-bold text-white px-1.5 py-0.5 rounded-full tabular-nums" style={{ background: P }}>4</span>
                  </div>
                  <span className="text-[11px] font-semibold text-white px-3 py-1.5 rounded-full bg-[#0c0c0c]">Eiendommer</span>
                </div>
              </div>

              {/* 3 notification CTA cards */}
              <div className="grid grid-cols-3 gap-2.5 px-7 mb-3 shrink-0">
                {[
                  { n: '3', label: '3 nye leads venter svar', bg: `${P}12`, c: P },
                  { n: '7', label: '7 uleste meldinger', bg: `${P}0a`, c: '#9333ea' },
                  { n: '4', label: '4 åpne saker', bg: '#fef2e2', c: '#d97706' },
                ].map((s, i) => (
                  <button key={i} className="rounded-[12px] px-4 py-3 flex items-center justify-between text-left" style={{ background: s.bg, border: `1px solid ${s.c}25` }}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[13px] font-bold tabular-nums px-2 py-0.5 rounded-md" style={{ color: s.c, background: 'rgba(255,255,255,0.7)' }}>{s.n}</span>
                      <span className="text-[11.5px] font-semibold text-[#0c0c0c]">{s.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: s.c }} strokeWidth={2.25} />
                  </button>
                ))}
              </div>

              {/* 4 KPI cards — finance row */}
              <div className="grid grid-cols-4 gap-2.5 px-7 mb-3 shrink-0">
                {[
                  { label: 'Månedlig inntekt', val: '1 024 800', u: 'kr',     chart: 'M 0 22 L 15 18 L 30 20 L 45 15 L 60 12 L 75 8 L 90 5 L 100 3', color: '#10b981' },
                  { label: 'Årsestimat',       val: '12.3',      u: 'M kr',  chart: 'M 0 20 L 20 16 L 40 17 L 60 12 L 80 8 L 100 4',                  color: '#c39ce0' },
                  { label: 'NOI (est.)',       val: '6.4',       u: 'M kr',  chart: 'M 0 15 L 25 14 L 50 15 L 75 14 L 100 13',                        color: '#10b981' },
                  { label: 'Belegg', val: '56.2', u: '%', pct: 56, showBar: true, sub: '23/40' },
                ].map((k: any, i) => (
                  <div key={i} className="rounded-[12px] p-3.5 bg-white border border-[#eae7e2]">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[9.5px] font-medium text-[#8a8478]">{k.label}</p>
                      {k.sub && <p className="text-[9.5px] text-[#b5aa98] tabular-nums">{k.sub}</p>}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1.5">
                      <span className="text-[22px] font-semibold text-[#0c0c0c] tracking-[-0.03em] tabular-nums leading-none" style={F}>{k.val}</span>
                      <span className="text-[10.5px] text-[#b5aa98] font-normal">{k.u}</span>
                    </div>
                    {k.showBar ? (
                      <>
                        <div className="h-1.5 rounded-full bg-[#f0ede8] overflow-hidden">
                          <div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${P}, #9333ea)`, width: `${k.pct}%` }} />
                        </div>
                        <p className="text-[8.5px] text-[#b5aa98] mt-1.5">23 boliger utleid</p>
                      </>
                    ) : (
                      <svg viewBox="0 0 100 24" className="w-full h-4">
                        <path d={k.chart} stroke={k.color} strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {/* 4 portfolio stat cards — operational row */}
              <div className="grid grid-cols-4 gap-2.5 px-7 mb-3 shrink-0">
                {[
                  { Icon: Building2,  big: '40', label: 'Eiendommer', live: true,  chart: 'M 0 14 L 25 10 L 50 9 L 75 5 L 100 3',  col: '#10b981', tone: 'good' },
                  { Icon: Home,        big: '23', label: 'Utleid',     sub: '17 ledige',          chart: 'M 0 13 L 25 12 L 50 10 L 75 8 L 100 6',  col: '#93c5fd' },
                  { Icon: Users,       big: '24', label: 'Leietakere',                                  chart: 'M 0 12 L 25 11 L 50 10 L 75 9 L 100 7',  col: '#c4b9a8' },
                  { Icon: AlertCircle, big: '4',  label: 'Åpne saker',  sub: 'Trenger oppfølging', chart: 'M 0 9 L 20 5 L 40 12 L 60 6 L 80 13 L 100 9', col: '#fca5a5', tone: 'warn' },
                ].map((s: any, i) => (
                  <div key={i} className="rounded-[12px] p-3.5 bg-white border border-[#eae7e2]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: s.tone==='warn' ? '#fee2e2' : '#f0f0ec' }}>
                        <s.Icon className="w-3.5 h-3.5 text-[#6e6a62]" strokeWidth={1.6} />
                      </div>
                      {s.live && <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-[#10b981]"><span className="w-1 h-1 rounded-full bg-[#10b981]" /> Live</span>}
                      {s.sub && !s.live && <p className="text-[8.5px] text-[#b5aa98] truncate ml-2 text-right">{s.sub}</p>}
                    </div>
                    <p className="text-[24px] font-bold text-[#0c0c0c] tracking-[-0.04em] tabular-nums leading-none mt-2" style={F}>{s.big}</p>
                    <p className="text-[10px] text-[#6e6a62] mt-1">{s.label}</p>
                    <svg viewBox="0 0 100 16" className="w-full h-3 mt-1.5"><path d={s.chart} stroke={s.col} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                ))}
              </div>

              {/* Hero strip */}
              <div className="mx-7 mb-3 rounded-[14px] px-5 py-3 relative flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(120deg, #0c0c0c 40%, #1a0f1e 70%, #2a1138)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: `${P}28`, border: `1px solid ${P}50` }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: P }} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white tracking-[-0.01em]">Porteføljen presterer over gjennomsnittet</p>
                    <p className="text-[9.5px] text-white/55 mt-0.5">23 av 40 boliger utleid. 56 % belegg.</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#0c0c0c] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shrink-0" style={{ background: `${P}d0` }}>
                  Se detaljer <ArrowRight className="w-3 h-3" strokeWidth={2.25} />
                </span>
              </div>

              {/* Bottom: 2-column row — Aktive saker + Portefølje */}
              <div className="mx-7 mb-7 flex-1 min-h-0 grid grid-cols-2 gap-3">
                {/* Aktive saker */}
                <div className="rounded-[12px] bg-white border border-[#eae7e2] p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12.5px] font-bold text-[#0c0c0c] tracking-[-0.01em]" style={F}>Aktive saker</p>
                    <span className="text-[9.5px] text-[#b5aa98] font-medium">Se alle</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {[
                      { Icon: Wrench,   t: 'Ødelagt komfyr',     s: 'Vedlikehold · 11d', tag: 'Pågår', tCol: '#d97706', tBg: '#fef2e2' },
                      { Icon: Volume2,  t: 'Støy fra nabo',       s: 'Klage · 11d',         tag: 'Åpen',   tCol: '#6e6a62', tBg: '#f5f1ea' },
                      { Icon: Droplets, t: 'Vannlekkasje på bad', s: 'Skade · 11d',         tag: 'Åpen',   tCol: '#6e6a62', tBg: '#f5f1ea' },
                    ].map((c: any, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-[#fafaf8]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-[#f5f1ea] flex items-center justify-center shrink-0">
                            <c.Icon className="w-3.5 h-3.5 text-[#6e6a62]" strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10.5px] font-semibold text-[#0c0c0c] truncate" style={F}>{c.t}</p>
                            <p className="text-[8.5px] text-[#b5aa98]">{c.s}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[8.5px] font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ color: c.tCol, background: c.tBg }}>
                            <Clock className="w-2 h-2" strokeWidth={2} /> {c.tag}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-[#d4cec0]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Portefølje */}
                <div className="rounded-[12px] bg-white border border-[#eae7e2] p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12.5px] font-bold text-[#0c0c0c] tracking-[-0.01em]" style={F}>Portefølje</p>
                    <span className="text-[9.5px] text-[#b5aa98] font-medium">Se alle</span>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {[
                      { color: '#10b981', label: 'Aktive boliger',   val: '40' },
                      { color: '#3b82f6', label: 'Aktive kontrakter', val: '24' },
                      { color: '#8a8478', label: 'Leverandører',     val: '5' },
                      { color: '#f59e0b', label: 'Leads',            val: '18' },
                      { color: P,         label: 'Onboarding',       val: '0' },
                    ].map((p: any, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-1 py-0.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                          <span className="text-[10.5px] text-[#3a3530]" style={F}>{p.label}</span>
                        </div>
                        <span className="text-[11px] font-bold tabular-nums text-[#0c0c0c]" style={F}>{p.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── VIEW 1: KALENDER ─── */}
            <div className="absolute inset-0 flex flex-col" style={{ opacity: viewIdx === 1 ? 1 : 0, transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: viewIdx === 1 ? 'auto' : 'none' }}>
              <div className="flex items-center justify-between px-7 py-5 shrink-0">
                <div>
                  <h3 className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] leading-tight" style={F}>Kalender</h3>
                  <p className="text-[11px] text-[#8a8478] mt-0.5">April 2026 · 40 boliger</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#e4dfd6]">
                    <div className="w-2 h-2 rounded-sm" style={{ background: P }} />
                    <span className="text-[10px] text-[#0c0c0c]">Alle eiendommer</span>
                    <ChevronDown className="w-2.5 h-2.5 text-[#8a8478]" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] text-[#0c0c0c] px-2.5 py-1 rounded-md border border-[#e4dfd6] bg-white">I dag</span>
                </div>
              </div>

              <div className="flex items-stretch border-t border-b border-[#f0ede8] bg-[#fdfbf7] mx-7 rounded-t-[10px]">
                <div className="w-[210px] shrink-0 px-3 py-2 border-r border-[#f0ede8]">
                  <p className="text-[10px] font-bold text-[#0c0c0c]" style={F}>April <span className="font-normal text-[#b5aa98]">2026</span></p>
                </div>
                <div className="flex-1 grid grid-cols-11 text-center">
                  {[{d:'To',n:23},{d:'Fr',n:24,a:true},{d:'Lø',n:25},{d:'Sø',n:26},{d:'Ma',n:27},{d:'Ti',n:28},{d:'On',n:29},{d:'To',n:30},{d:'Fr',n:1},{d:'Lø',n:2},{d:'Sø',n:3}].map((c:any,i)=>(
                    <div key={i} className={`py-2 ${c.a?'bg-white':''}`}>
                      <p className="text-[8.5px] text-[#b5aa98]">{c.d}</p>
                      <p className={`text-[12px] font-bold ${c.a?'text-white inline-flex items-center justify-center w-5 h-5 rounded-full':'text-[#0c0c0c]'}`} style={c.a?{background:P}:{}}>{c.n}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 mx-7 mb-7 border-l border-r border-b border-[#f0ede8] rounded-b-[10px] overflow-hidden bg-white">
                {[
                  { img:'/interior-living.webp',    name:'Innbydende 3-roms', addr:'Camilla Colletts gt 14A', tag:'KT', tagBg:'#fce7f3', tagC:'#be185d', bar:'Martin · 3n', barCol:P, barStart:18, barWidth:38 },
                  { img:'/interior-kitchen.webp',   name:'Nyoppusset 3-roms', addr:'Møhlenpris 8',             tag:'KT', tagBg:'#fce7f3', tagC:'#be185d', bar:'Booking · 5n', barCol:'#0c0c0c', barC:'#fff', barStart:5, barWidth:42 },
                  { img:'/interior-bedroom.webp',   name:'Sjarmerende Hybel', addr:'Camilla Colletts gt 14A',  tag:'',   tagBg:'',         tagC:'',         bar:'Ledig', barCol:'#fef3c7', barC:'#92400e', barStart:30, barWidth:25 },
                  { img:'/interior-openplan.webp',  name:'Lys 2-roms',         addr:'Strandkaien 6',            tag:'',   tagBg:'',         tagC:'',         bar:'Airbnb · Anna', barCol:'#fce7f3', barC:'#be185d', barStart:48, barWidth:32 },
                  { img:'/interior-dining.webp',    name:'Oppgradert 4-roms',  addr:'Bryggen 12',                tag:'KT', tagBg:'#fce7f3', tagC:'#be185d', bar:'Olsen · 30 dager', barCol:P, barC:'#fff', barStart:0, barWidth:75 },
                  { img:'/interior-kitchen2.webp',  name:'Sjarmerende 2-roms', addr:'St. Jørgens gt 4',          tag:'',   tagBg:'',         tagC:'',         bar:'Booking · 4n', barCol:'#0c0c0c', barC:'#fff', barStart:8, barWidth:30 },
                  { img:'/interior-bedroom2.webp', name:'Moderne 3-roms',     addr:'Kong Oscars gt 12',         tag:'',   tagBg:'',         tagC:'',         bar:'Erik · 12 mnd',   barCol:P, barC:'#fff', barStart:0, barWidth:100 },
                  { img:'/interior-hallway.webp',   name:'Bryggen Loft',       addr:'Bryggen 24',                 tag:'KT', tagBg:'#fce7f3', tagC:'#be185d', bar:'Tom · 2n', barCol:'#0c0c0c', barC:'#fff', barStart:55, barWidth:18 },
                  { img:'/interior-kitchen3.webp', name:'Penthouse 4-roms',   addr:'Torgallmenningen 3',         tag:'',   tagBg:'',         tagC:'',         bar:'Anders · 6 mnd', barCol:P, barC:'#fff', barStart:0, barWidth:100 },
                  { img:'/interior-living.webp',    name:'Lite studio',         addr:'Marken 24',                  tag:'',   tagBg:'',         tagC:'',         bar:'Ledig', barCol:'#fef3c7', barC:'#92400e', barStart:42, barWidth:35 },
                ].map((r: any, i) => (
                  <div key={i} className="flex items-center border-b border-[#f0ede8] last:border-b-0 h-[44px] hover:bg-[#fdfbf7]">
                    <div className="w-[210px] shrink-0 px-3 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-[#eae7e2]">
                        <img src={r.img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] font-semibold text-[#0c0c0c] truncate" style={F}>{r.name}</p>
                        <p className="text-[8.5px] text-[#b5aa98] truncate">{r.addr}</p>
                      </div>
                      {r.tag && <span className="text-[7.5px] font-bold px-1 py-px rounded shrink-0" style={{ background:r.tagBg, color:r.tagC }}>{r.tag}</span>}
                    </div>
                    <div className="flex-1 relative h-[44px] border-l border-[#f0ede8]">
                      {r.bar && (
                        <div className="absolute top-1/2 -translate-y-1/2 h-[26px] rounded-md flex items-center px-2.5" style={{ background:r.barCol, left:`${r.barStart}%`, width:`${r.barWidth}%` }}>
                          <span className="text-[9.5px] font-semibold truncate" style={{ color: r.barC || '#fff' }}>{r.bar}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── VIEW 2: EIENDOMMER ─── */}
            <div className="absolute inset-0 flex flex-col" style={{ opacity: viewIdx === 2 ? 1 : 0, transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: viewIdx === 2 ? 'auto' : 'none' }}>
              <div className="flex items-center justify-between px-7 py-5 shrink-0">
                <div>
                  <h3 className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] leading-tight" style={F}>Eiendommer</h3>
                  <p className="text-[11px] text-[#8a8478] mt-0.5">40 boliger · 23 utleid · 17 ledige</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#e4dfd6]">
                    <span className="text-[10px] text-[#0c0c0c]">Bergen</span>
                    <ChevronDown className="w-2.5 h-2.5 text-[#8a8478]" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold text-white px-2.5 py-1 rounded-md" style={{ background: P }}>+ Ny bolig</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 px-7 pb-7">
                {[
                  { name:'Innbydende 3-roms',  addr:'Camilla Colletts gt 14A · Bergen', rent:'24 800 kr/mnd', status:'Utleid',  sCol:'#10b981', img:'/interior-living.webp' },
                  { name:'Moderne 3-roms',     addr:'Kong Oscars gt 12 · Bergen',        rent:'21 500 kr/mnd', status:'Utleid',  sCol:'#10b981', img:'/interior-bedroom.webp' },
                  { name:'Lys 2-roms',          addr:'Strandkaien 6 · Bergen',            rent:'15 200 kr/mnd', status:'Ledig',   sCol:'#f59e0b', img:'/interior-openplan.webp' },
                  { name:'Penthouse 4-roms',   addr:'Torgallmenningen 3 · Bergen',       rent:'42 000 kr/mnd', status:'Utleid',  sCol:'#10b981', img:'/interior-kitchen.webp' },
                  { name:'Sjarmerende Hybel',  addr:'Camilla Colletts gt 14A · Bergen',  rent:'8 900 kr/mnd',  status:'Ledig 12.12', sCol:'#f59e0b', img:'/interior-bedroom2.webp' },
                  { name:'Oppgradert 4-roms',  addr:'Bryggen 12 · Bergen',                rent:'28 400 kr/mnd', status:'Utleid',  sCol:'#10b981', img:'/interior-dining.webp' },
                ].map((b, i) => (
                  <div key={i} className="rounded-[14px] bg-white border border-[#eae7e2] overflow-hidden flex flex-col">
                    <div className="relative h-[148px] overflow-hidden">
                      <img src={b.img} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.92)' }}>
                        <div className="w-1 h-1 rounded-full" style={{ background: b.sCol }} />
                        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: b.sCol }}>{b.status}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[12px] font-bold text-[#0c0c0c] truncate" style={F}>{b.name}</p>
                      <p className="text-[9.5px] text-[#b5aa98] truncate mt-0.5">{b.addr}</p>
                      <p className="text-[11px] font-semibold text-[#0c0c0c] mt-2 tabular-nums">{b.rent}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── VIEW 3: AI-ASSISTENT ─── */}
            <div className="absolute inset-0 flex flex-col" style={{ opacity: viewIdx === 3 ? 1 : 0, transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: viewIdx === 3 ? 'auto' : 'none' }}>
              <div className="flex items-center justify-between px-7 py-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `radial-gradient(circle at 30% 30%, ${P}40 0%, ${P}22 60%, ${P}12 100%)`, boxShadow: `inset 0 0 0 1px ${P}38, 0 0 14px ${P}25` }}>
                    <Sparkles className="w-4 h-4" style={{ color: P }} strokeWidth={1.4} />
                  </div>
                  <div>
                    <h3 className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] leading-tight" style={F}>Operasjonssentral</h3>
                    <p className="text-[11px] text-[#8a8478] mt-0.5">DigiHome AI · driftsassistent</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(5,150,105,0.10)', border: '1px solid rgba(5,150,105,0.18)' }}>
                  <div className="w-[5px] h-[5px] rounded-full bg-[#10b981]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#10b981]">Online</span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3 px-7 pb-7 min-h-0">
                <div className="rounded-[14px] bg-white border border-[#eae7e2] p-5 flex flex-col">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: P }}>Innkommende — sak #1042</p>
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-end justify-end gap-1.5">
                      <div className="max-w-[70%] rounded-[14px] rounded-br-[5px] px-3 py-2" style={{ background: `${P}1c`, border: `1px solid ${P}30` }}>
                        <p className="text-[11px] text-[#0c0c0c] leading-[1.5]">Stekeovnen virker ikke, ingen plater blir varme.</p>
                      </div>
                      <img src="/team-martin.webp" alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${P}20` }}>
                        <Sparkles className="w-2.5 h-2.5" style={{ color: P }} strokeWidth={1.4} />
                      </div>
                      <div className="max-w-[75%] rounded-[14px] rounded-tl-[5px] px-3 py-2" style={{ background: '#f5f1ea' }}>
                        <p className="text-[11px] text-[#0c0c0c] leading-[1.5]">Hei Stine! Oppretter sak og finner elektriker.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${P}20` }}>
                        <Sparkles className="w-2.5 h-2.5" style={{ color: P }} strokeWidth={1.4} />
                      </div>
                      <div className="max-w-[75%] rounded-[14px] rounded-tl-[5px] px-3 py-2" style={{ background: '#f5f1ea' }}>
                        <p className="text-[11px] text-[#0c0c0c] leading-[1.5]">Bergen Elektro kommer fredag 10–12. Bekreftet!</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[14px] bg-[#0c0c0c] p-5 flex flex-col" style={{ background: 'linear-gradient(165deg, #14141a 0%, #0a0a0d 100%)' }}>
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: '#c39ce0' }}>AI handlinger · siste time</p>
                  <div className="space-y-2.5 flex-1">
                    {[
                      { Icon: Check, t: 'Sak #1042 opprettet', s: 'Bergen Elektro tildelt · fredag 10:00', col: '#10b981' },
                      { Icon: MessageSquare, t: 'Svart leietaker', s: '24 saker svart automatisk i dag', col: P },
                      { Icon: TrendingUp, t: 'Pris justert', s: 'Møhlenpris 8: 14 200 → 15 200 kr', col: '#10b981' },
                      { Icon: ClipboardList, t: 'Annonse publisert', s: 'Lys 2-roms · FINN + Airbnb + Booking', col: P },
                    ].map((a: any, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${a.col}25` }}>
                          <a.Icon className="w-3 h-3" style={{ color: a.col }} strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10.5px] font-semibold text-white truncate" style={F}>{a.t}</p>
                          <p className="text-[9px] text-white/55 truncate mt-0.5">{a.s}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── VIEW 4: OPPGJØR ─── */}
            <div className="absolute inset-0 flex flex-col" style={{ opacity: viewIdx === 4 ? 1 : 0, transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: viewIdx === 4 ? 'auto' : 'none' }}>
              <div className="flex items-center justify-between px-7 py-5 shrink-0">
                <div>
                  <h3 className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] leading-tight" style={F}>Oppgjør · november</h3>
                  <p className="text-[11px] text-[#8a8478] mt-0.5">Synket med regnskap · 5 huseiere</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#0c0c0c] px-2.5 py-1 rounded-md border border-[#e4dfd6] bg-white">Eksporter</span>
                  <span className="text-[10px] font-semibold text-white px-2.5 py-1 rounded-md" style={{ background: P }}>Send oppgjør</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 px-7 mb-3 shrink-0">
                {[
                  { label: 'Total bruttoinntekt', val: '1 024 800', u: 'kr', col: '#10b981' },
                  { label: 'Til utbetaling', val: '796 420', u: 'kr', col: P },
                  { label: 'PowerOffice synkronisert', val: '5/5', u: 'huseiere', col: '#10b981' },
                ].map((k, i) => (
                  <div key={i} className="rounded-[12px] p-3.5 bg-white border border-[#eae7e2]">
                    <p className="text-[9.5px] font-medium text-[#8a8478]">{k.label}</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-[20px] font-semibold text-[#0c0c0c] tracking-[-0.02em] tabular-nums leading-none" style={F}>{k.val}</span>
                      <span className="text-[10px] text-[#b5aa98]">{k.u}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-1 mx-7 mb-7 rounded-[12px] bg-white border border-[#eae7e2] overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_120px_100px_90px] gap-2 px-4 py-2 border-b border-[#f0ede8] bg-[#fafaf8]">
                  {['Huseier', 'Bruttoinntekt', 'Etter avgifter', 'Status', ''].map((h, i) => (
                    <span key={i} className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">{h}</span>
                  ))}
                </div>
                {[
                  { name: 'Bryggen Invest AS',  units: '12 eiendommer', gross: '241 200', net: '184 250', status: 'Utbetalt',  sCol: '#10b981', initials: 'BI', avBg: '#dcfce7', avC: '#166534' },
                  { name: 'Vest Linje AS',      units: '8 eiendommer',  gross: '186 400', net: '142 880', status: 'Utbetalt',  sCol: '#10b981', initials: 'VL', avBg: '#dbeafe', avC: '#1e40af' },
                  { name: 'Møhlenpris Eiendom', units: '6 eiendommer',  gross: '142 850', net: '108 920', status: 'Klar',      sCol: '#b56eed',         initials: 'ME', avBg: '#f3e8ff', avC: '#7c3aed' },
                  { name: 'Kviteberg AS',        units: '8 eiendommer',  gross: '198 600', net: '152 110', status: 'Klar',      sCol: P,         initials: 'KV', avBg: '#fef3c7', avC: '#92400e' },
                  { name: 'Torgallmenningen 3',  units: '6 eiendommer',  gross: '255 750', net: '208 260', status: 'Behandles', sCol: '#f59e0b', initials: 'TO', avBg: '#fee2e2', avC: '#991b1b' },
                ].map((r: any, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_120px_100px_90px] gap-2 px-4 py-3 border-b border-[#f0ede8] last:border-b-0 items-center hover:bg-[#fdfbf7]">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: r.avBg }}>
                        <span className="text-[9.5px] font-bold tabular-nums" style={{ ...F, color: r.avC }}>{r.initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#0c0c0c] truncate" style={F}>{r.name}</p>
                        <p className="text-[9px] text-[#b5aa98] truncate">{r.units}</p>
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-[#0c0c0c] tabular-nums">{r.gross} kr</p>
                    <p className="text-[11px] text-[#0c0c0c] tabular-nums">{r.net} kr</p>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${r.sCol}15`, color: r.sCol }}>
                      <div className="w-1 h-1 rounded-full" style={{ background: r.sCol }} />
                      {r.status}
                    </span>
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-4 h-4 rounded flex items-center justify-center bg-[#0c0c0c]"><span className="text-[6.5px] font-bold text-white">PO</span></div>
                      <ArrowRight className="w-3 h-3 text-[#b5aa98]" strokeWidth={2} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </SlideFrame>
  );
};





/* ═══ PRODUCT SHOWCASE SLIDE ═══ */
/* ═══ PRODUCT MASTER — Premium journey-tabs ═══ */
const SProduct = (p: any) => {
  const active = p.isActive;

  const phases = [
    {
      num: '01',
      stat: '5',
      unit: 'min',
      sub: 'fra bilder til publisert',
      title: 'Publiser',
      desc: 'AI genererer annonse, tittel og beskrivelse. Publiseres samtidig p\u00e5 FINN, Airbnb og Booking.com.',
    },
    {
      num: '02',
      stat: '24',
      unit: 't',
      sub: 'fra interesse til signert',
      title: 'Leie ut',
      desc: 'BankID-kontrakter, automatisk depositumskonto og kredittsjekk. Norsk compliance innebygget.',
    },
    {
      num: '03',
      stat: '30',
      unit: 'min/uke',
      sub: 'per bolig',
      title: 'Drift',
      desc: 'AI-assistent svarer gjester, koordinerer leverand\u00f8rer og h\u00e5ndterer avvik. D\u00f8gnet rundt.',
    },
    {
      num: '04',
      stat: '+30',
      unit: '%',
      sub: 'avkastning vs manuelt',
      title: 'Optimaliser',
      desc: 'Dynamisk prising og kanalstyring i sanntid. Auto-bytte mellom korttid og langtid.',
    },
    {
      num: '05',
      stat: '50+',
      unit: '',
      sub: 'enheter per forvalter',
      title: 'Skalere',
      desc: 'Separate portaler for eiere og leietakere. Full regnskapssync, API og white-label.',
    },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes deckProdIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes deckProdFade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes deckProdLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <div className="max-w-[1200px] mx-auto px-6 sm:px-12 w-full relative z-10">

      {/* ═══ HEADER — matches Slide 2/3 ═══ */}
      <div className="text-center mb-7 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4 sm:mb-5" style={{ color: P }}>Produktet</p>
        <h2 className="text-[32px] sm:text-[44px] lg:text-[54px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.05] mb-5 sm:mb-6" style={F}>Hele utleie-stacken i ett system</h2>
        <p className="text-[14px] sm:text-[16px] text-[#999] leading-[1.75] max-w-[560px] mx-auto">Fem faser, bygget som &eacute;tt sammenhengende produkt &mdash; fra f&oslash;rste bilde til l&oslash;pende drift.</p>
      </div>

      {/* ═══ PHASE CONNECTOR LINE (subtle hairline above cards) ═══ */}
      <div className="relative mb-6 hidden sm:block"
        style={{ animation: active ? 'deckProdFade 0.6s ease-out 0.2s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px origin-left"
          style={{
            background: `linear-gradient(90deg, transparent, ${P}35, ${P}55, ${P}35, transparent)`,
            transform: active ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s',
          }} />
      </div>

      {/* ═══ 5-COLUMN PHASE GRID ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {phases.map((c, i) => (
          <div key={i} className="relative rounded-[16px] bg-white p-5 sm:p-5 flex flex-col"
            style={{
              border: '1px solid #eae7e2',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 6px 24px rgba(0,0,0,0.025)',
              animation: active ? `deckProdIn 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.08}s both` : undefined,
              opacity: active ? undefined : 0,
            }}>

            {/* Dot marker connecting to line above */}
            <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{
              backgroundColor: P,
              boxShadow: `0 0 0 3px #fdfbf7, 0 0 12px ${P}50`,
            }} />

            {/* Number label */}
            <p className="text-[10px] font-bold tracking-[0.15em] mb-5" style={{ color: P }}>{c.num}</p>

            {/* Stat */}
            <div className="flex items-baseline gap-1 mb-1">
              <p className="text-[32px] sm:text-[36px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-none tabular-nums" style={F}>{c.stat}</p>
              {c.unit && <p className="text-[13px] font-medium text-[#8a8478]">{c.unit}</p>}
            </div>
            <p className="text-[10px] text-[#7c7466] font-medium mb-5">{c.sub}</p>

            {/* Title */}
            <h3 className="text-[17px] font-bold text-[#0c0c0c] tracking-[-0.015em] mb-2" style={F}>{c.title}</h3>

            {/* Description */}
            <p className="text-[12px] text-[#888] leading-[1.65] flex-1">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* ═══ INTEGRATION STRIP — minimalist ═══ */}
      <div className="mt-10 sm:mt-12 pt-6 border-t border-[#eae7e2]"
        style={{ animation: active ? 'deckProdFade 0.6s ease-out 0.9s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: P }}>Integrasjoner</span>
            <span className="text-[13px] text-[#888] font-light">ett API &mdash; ni norske tjenester i produksjon</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap text-[11px] font-medium text-[#666]">
            {['FINN', 'Airbnb', 'Booking.com', 'BankID', 'Regnskap', 'Channex', 'Lea Bank', 'Creditsafe', 'Vipps'].map((n, k) => (
              <React.Fragment key={k}>
                {k > 0 && <span className="text-[#d4cec0]">&middot;</span>}
                <span className="tracking-tight">{n}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  </SlideFrame>
  );
};



const S5 = (p: any) => (
  <SlideFrame bg="white" {...p}>
    <div className="max-w-[1040px] mx-auto px-6 sm:px-16 w-full relative z-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-6" style={{ color: P }}>DigiHome Tech AS</p>
      <h2 className="text-[52px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.04] mb-16">Plattformen som skalerer</h2>
      <div className="grid grid-cols-3 gap-5">
        {[
          { tier: 'Standard', sub: 'Forvaltere', items: ['Alle segmenter', 'AI Chat & SOP', 'Kontrakter & e-signering', 'Leverand\u00f8rh\u00e5ndtering', 'Eier- og leietakerportal', '\u00d8konomi & oppgj\u00f8r'], hl: false },
          { tier: 'Enterprise', sub: 'Eiere & investorer', items: ['NOI, Yield, WALT', 'Porteføljeoversikt', 'N\u00e6ringskontrakter', 'Finansmodul med l\u00e5n', 'Sensitivitetsanalyse', 'ESG-rapportering'], hl: true },
          { tier: 'Platform', sub: '\u00d8kosystem', items: ['REST API-tilgang', 'Bank & e-signering', 'Leverand\u00f8rportal', 'Investorportal', 'Mobilapp (iOS/Android)', 'White-label'], hl: false },
        ].map((t: any, i: number) => (
          <div key={i} className={`rounded-[20px] p-8 ${t.hl ? 'bg-gradient-to-b from-[#b56eed]/[0.06] to-[#b56eed]/[0.02] border-[1.5px] border-[#b56eed]/15' : 'bg-[#faf8f5] border border-[#eae7e2]'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${t.hl ? 'text-[#b56eed]' : 'text-[#ccc]'}`}>{t.sub}</p>
            <p className="text-[26px] font-bold text-[#0c0c0c] mb-8 tracking-tight">{t.tier}</p>
            {t.items.map((it: any, j: number) => <p key={j} className={`text-[13px] py-2.5 border-t ${t.hl ? 'border-[#b56eed]/[0.08] text-[#666]' : 'border-[#eee] text-[#999]'}`}>{it}</p>)}
          </div>
        ))}
      </div>
    </div>
  </SlideFrame>
);

const S6 = (p: any) => (
  <SlideFrame bg="white" {...p}>
    <div className="max-w-[1000px] mx-auto px-6 sm:px-16 w-full">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-5" style={{ color: P }}>Differensiator</p>
      <h2 className="text-[30px] sm:text-[40px] lg:text-[48px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.06] mb-14">AI som forstår eiendom</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-8 lg:gap-14">
        <div className="space-y-7">
          {[
            { t: 'Automatisk førstelinje', d: 'Leietaker sender melding → AI svarer umiddelbart og dokumenterer' },
            { t: 'SOP-styrt', d: 'Følger bedriftens driftshåndbok. Riktig prosess, riktig SLA.' },
            { t: 'Handlingsbasert', d: 'Oppretter saker, kontakter leverandører, ber eier om godkjenning.' },
            { t: '36 sikkerhetskontroller', d: 'Tenant-isolasjon, prompt injection-beskyttelse, pen-testet.' },
          ].map((f: any, i: number) => (
            <div key={i} className="flex gap-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${P}10` }}><span className="text-[14px] font-bold" style={{ color: P }}>{i + 1}</span></div>
              <div><p className="text-[15px] font-bold text-[#0c0c0c]">{f.t}</p><p className="text-[13px] text-[#999] mt-1 leading-relaxed">{f.d}</p></div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl overflow-hidden relative">
          <img src="/interior-openplan.webp" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="absolute bottom-0 left-0 right-0 p-7">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.15em] mb-5">Vedlikeholdsflyt</p>
            {['Leietaker melder feil', 'AI dokumenterer og oppretter sak', 'Leverandør kontaktes', 'Eier godkjenner', 'Tid avtales med leietaker'].map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i < 3 ? 'bg-[#b56eed]' : 'bg-white/10'}`}><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>
                <p className={`text-[13px] ${i < 3 ? 'text-white/80' : 'text-white/60'}`}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </SlideFrame>
);

/* ═══ DIFFERENTIATOR — DigiHome vs Competition + Automagisk annonse ═══ */
/* ═══ SLIDE 7 — SDiff (Konkurransefortrinn · COMBINED with market map) ═══ */
const SDiff = (p: any) => {
  const active = p.isActive;
  const pillars = [
    {
      num: '01',
      title: 'Nordisk fra første dag',
      lead: 'DigiHome er bygget rundt infrastrukturen som faktisk må fungere i Norden: BankID, MitID, Freja, FINN, regnskapssystemer, betaling, kontrakter og dokumentasjon.',
      tag: 'Internasjonale aktører kan oversette produktet. De må fortsatt bygge det lokale laget.',
    },
    {
      num: '02',
      title: 'Automatisering i selve flyten',
      lead: 'DigiHome er ikke et gammelt forvaltningssystem med AI lagt på toppen. Plattformen er bygget for at rutinearbeid skal løses automatisk — fra annonse og prising til henvendelser, saker, oppfølging og regnskap.',
      tag: 'AI er ikke en feature. Det er måten systemet er konstruert på.',
    },
    {
      num: '03',
      title: 'Et nettverk, ikke bare programvare',
      lead: 'DigiHome er ikke et verktøy vi selger til konkurrenter. Vi drifter selv og skalerer gjennom franchise — lokale operatører på vår plattform, under én nasjonal merkevare.',
      tag: 'AI-effektivitet (3–4× flere enheter per årsverk) + franchise-nettverkseffekt er vanskelig å kopiere.',
    },
  ];

  const competitors = [
    { name: 'FINN',                 x: 15, y: 60, size: 28 },
    { name: 'Hybel',                x: 25, y: 45, size: 30 },
    { name: 'Husleie.no',           x: 37, y: 56, size: 30 },
    { name: 'Lokal utleiemegler',   x: 52, y: 84, size: 32 },
    { name: 'Tradisjonell forvalter', x: 68, y: 72, size: 34 },
    { name: 'DigiHome',             x: 84, y: 15, size: 58, us: true },
  ];

  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes diffFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes diffHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes diffCardIn { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes diffDot { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
    `}</style>

    <DotGrid maskCenter="50% 26%" opacity={0.4} />

    <div className="max-w-[1320px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-6 sm:mb-8 max-w-[1120px]">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-4"
           style={{ color: P, animation: active ? 'diffFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Konkurransefortrinn
        </p>
        <h2 className="font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.04]"
            style={{ ...F, fontSize: 'clamp(24px, 3.0vw, 40px)', animation: active ? 'diffHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block">Forvaltning har vært <span style={{ color: P }}>manuelt og fragmentert</span>.</span>{' '}
          <span className="md:block text-[#3a3530] font-light tracking-[-0.03em]">DigiHome gjør det autonomt — og skalerer det som ett nettverk.</span>
        </h2>
        <p className="text-[#3a3530] leading-[1.55] font-light tracking-[-0.003em] mt-4 max-w-[1000px]"
           style={{ ...F, fontSize: 'clamp(12.5px, 1.0vw, 14px)', animation: active ? 'diffFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: active ? undefined : 0 }}>
          Tradisjonelle utleiemeglere og forvaltere tar hele driften — men manuelt, lokalt og dyrt. Verktøy som Hybel, Husleie.no og FINN er digitale, men løser bare deler av flyten. <span className="font-semibold text-[#0c0c0c]">DigiHome står alene</span> i krysningspunktet: full forvaltning, AI-native og et skalerbart nasjonalt nettverk.
        </p>
      </div>

      {/* 2-col layout: Market map + 3 moat pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 lg:gap-6">
        {/* LEFT — Market map matrix */}
        <article className="rounded-[20px] p-6 sm:p-7 relative overflow-hidden flex flex-col"
                 style={{
                   background: 'linear-gradient(165deg, #fafaf7 0%, #f2efe9 100%)',
                   border: '1px solid #ece8e1',
                   boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 14px 40px rgba(20,15,10,0.06)',
                   animation: active ? 'diffCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#b5aa98]" style={F}>MARKEDSKART · DYBDE × BREDDE</p>
          </div>

          {/* Matrix */}
          <div className="relative flex-1 rounded-[14px] bg-white overflow-hidden"
               style={{ border: '1px solid #e2ded5', minHeight: 320 }}>
            {/* Axis labels */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98]" style={F}>AI-NATIVE</div>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98]" style={F}>MANUELL</div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98] origin-center whitespace-nowrap" style={F}>SMAL</div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98] origin-center whitespace-nowrap" style={F}>BRED</div>

            {/* Grid lines */}
            <div className="absolute left-1/2 top-7 bottom-7 w-px" style={{ backgroundColor: '#eae6dd' }} />
            <div className="absolute top-1/2 left-7 right-7 h-px" style={{ backgroundColor: '#eae6dd' }} />

            {/* Krysningspunkt label */}
            <div className="absolute top-[8%] right-[7%] text-[8.5px] font-bold tracking-[0.18em]" style={{ ...F, color: `${P}80` }}>KRYSNINGSPUNKT</div>

            {/* Competitors */}
            {competitors.map((c, i) => (
              <div key={i} className="absolute flex flex-col items-center"
                   style={{
                     left: `${c.x}%`,
                     top: `${c.y}%`,
                     transform: 'translate(-50%, -50%)',
                     animation: active ? `diffDot 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.75 + i * 0.07}s both` : undefined,
                     opacity: active ? undefined : 0,
                   }}>
                <div className="rounded-full flex items-center justify-center"
                     style={{
                       width: `${c.size}px`,
                       height: `${c.size}px`,
                       backgroundColor: c.us ? P : '#e6e2d9',
                       border: c.us ? `2px solid ${P}` : '1.5px solid #c4b9a8',
                       boxShadow: c.us ? `0 0 0 6px ${P}1f, 0 10px 36px ${P}50` : 'none',
                     }}>
                  {c.us && <span className="text-[9.5px] font-bold text-white" style={F}>DH</span>}
                </div>
                <p className={`text-[9.5px] mt-1.5 whitespace-nowrap ${c.us ? 'font-bold' : 'font-medium'}`} style={{ color: c.us ? P : '#6e6a62' }}>{c.name}</p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex items-center gap-4 text-[10px] text-[#8a8478] font-light">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P }} />
              <span className="font-semibold" style={{ color: '#0c0c0c' }}>DigiHome</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e6e2d9]" style={{ border: '1px solid #c4b9a8' }} />
              <span>Konkurrenter</span>
            </div>
          </div>
        </article>

        {/* RIGHT — 3 moat pillars stacked */}
        <div className="flex flex-col gap-4">
          {pillars.map((m, i) => (
            <article key={i} className="rounded-[18px] p-5 sm:p-6 flex flex-col"
                     style={{
                       background: '#ffffff',
                       border: '1px solid #ece8e1',
                       boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 10px 28px rgba(20,15,10,0.05)',
                       animation: active ? `diffCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.65 + i * 0.1}s both` : undefined,
                       opacity: active ? undefined : 0,
                     }}>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[10px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: P }}>{m.num}</p>
              </div>
              <h3 className="text-[16px] sm:text-[17px] font-bold text-[#0c0c0c] tracking-[-0.018em] leading-tight mb-2.5" style={F}>{m.title}</h3>
              <p className="text-[11.5px] sm:text-[12px] text-[#2a2a2a] font-light leading-[1.55] tracking-[-0.003em] mb-3" style={F}>
                {m.lead}
              </p>
              <p className="text-[10.5px] sm:text-[11px] font-semibold tracking-[-0.003em] leading-[1.5]" style={{ ...F, color: P }}>
                {m.tag}
              </p>
            </article>
          ))}
        </div>
      </div>

      {/* Footer note: why it's hard to copy */}
      <div className="mt-6 sm:mt-8"
           style={{ animation: active ? 'diffFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.05s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="flex items-start gap-4 max-w-[1100px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] pt-1 shrink-0" style={{ ...F, color: P }}>Forsvar</p>
          <p className="text-[12px] sm:text-[13px] text-[#3a3530] font-light leading-[1.55] tracking-[-0.003em]" style={F}>
            <span className="font-semibold text-[#0c0c0c]">Hvorfor det blir vanskelig å kopiere.</span> Én konkurrent kan kopiere én funksjon. Det vanskelige er kombinasjonen: AI-drevet drift (3–4× flere enheter per årsverk), et skalerbart franchise-nettverk og en nasjonal merkevare bygget på lokal infrastruktur.
          </p>
        </div>
      </div>
    </div>
  </SlideFrame>
  );
};


const S7 = (p: any) => (
  <SlideFrame bg="beige" {...p}>
    <div className="max-w-[1100px] mx-auto px-6 sm:px-16 w-full relative z-10">
      <div className="text-center mb-7 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: P }}>Integrert &oslash;kosystem</p>
        <h2 className="text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.06] mb-4">Alt koblet sammen</h2>
        <p className="text-[15px] sm:text-[17px] text-[#999] max-w-[480px] mx-auto leading-relaxed">Bank, signering, screening, kanaler og regnskap &mdash; s&oslash;ml&oslash;st integrert i &eacute;n plattform.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Depositum */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 sm:p-6 flex flex-col" style={{ border: '1px solid #eae7e2', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#16a34a10' }}>
            <svg className="w-5 h-5 text-[#15803d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          </div>
          <p className="text-[15px] font-bold text-[#0c0c0c] mb-1">Depositum</p>
          <p className="text-[11px] text-[#999] leading-relaxed mb-3">Automatisk opprettelse</p>
          <div className="mt-auto pt-3 border-t border-[#f0ede8]">
            <p className="text-[10px] font-semibold text-[#15803d]">Lea Bank</p>
          </div>
        </div>

        {/* E-signering */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 sm:p-6 flex flex-col" style={{ border: '1px solid #eae7e2', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#3b82f610' }}>
            <svg className="w-5 h-5 text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <p className="text-[15px] font-bold text-[#0c0c0c] mb-1">E-signering</p>
          <p className="text-[11px] text-[#999] leading-relaxed mb-3">Kontrakter via BankID</p>
          <div className="mt-auto pt-3 border-t border-[#f0ede8]">
            <p className="text-[10px] font-semibold text-[#3b82f6]">Posten Signering</p>
          </div>
        </div>

        {/* Screening */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 sm:p-6 flex flex-col" style={{ border: '1px solid #eae7e2', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#e67e2210' }}>
            <svg className="w-5 h-5 text-[#e67e22]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <p className="text-[15px] font-bold text-[#0c0c0c] mb-1">Screening</p>
          <p className="text-[11px] text-[#999] leading-relaxed mb-3">Kredittsjekk og scoring</p>
          <div className="mt-auto pt-3 border-t border-[#f0ede8]">
            <p className="text-[10px] font-semibold text-[#e67e22]">Creditsafe</p>
          </div>
        </div>

        {/* Kanaler */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 sm:p-6 flex flex-col" style={{ border: '1px solid #eae7e2', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#0063ff10' }}>
            <svg className="w-5 h-5 text-[#0063ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          </div>
          <p className="text-[15px] font-bold text-[#0c0c0c] mb-1">Kanaler</p>
          <p className="text-[11px] text-[#999] leading-relaxed mb-3">Publisering og synkronisering</p>
          <div className="mt-auto pt-3 border-t border-[#f0ede8] space-y-1">
            <div className="flex items-center gap-1.5"><img src="/finn-logo.png" alt="" className="w-3.5 h-3.5 object-contain" /><span className="text-[10px] font-semibold text-[#0063ff]">FINN.no</span><span className="text-[8px] text-[#737373] ml-auto">L + K</span></div>
            <p className="text-[10px] text-[#888]">Airbnb <span className="text-[8px] text-[#737373]">K</span></p>
            <p className="text-[10px] text-[#888]">Booking.com <span className="text-[8px] text-[#737373]">K</span></p>
          </div>
        </div>

        {/* Regnskap */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-5 sm:p-6 flex flex-col" style={{ border: '1px solid #eae7e2', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#7c3aed10' }}>
            <svg className="w-5 h-5 text-[#7c3aed]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          </div>
          <p className="text-[15px] font-bold text-[#0c0c0c] mb-1">Regnskap</p>
          <p className="text-[11px] text-[#999] leading-relaxed mb-3">Automatisk bokf&oslash;ring</p>
          <div className="mt-auto pt-3 border-t border-[#f0ede8]">
            <p className="text-[10px] font-semibold text-[#7c3aed]">Fiken, Tripletex ++</p>
          </div>
        </div>
      </div>

      {/* Bottom row — dark cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {[
          { icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', name: 'REST API', desc: 'Full API-tilgang' },
          { icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', name: 'Mobilapp', desc: 'iOS & Android' },
          { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0', name: 'Leverand\u00f8rportal', desc: 'Egen portal' },
          { icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', name: 'White-label', desc: 'Eget merke' },
        ].map((item: any, i: number) => (
          <div key={i} className="rounded-xl bg-[#0c0c0c] p-5">
            <svg className="w-5 h-5 text-white/75 mb-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            <p className="text-[13px] font-semibold text-white mb-0.5">{item.name}</p>
            <p className="text-[10px] text-white/60">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideFrame>
);


const SFinn = (p: any) => (
  <SlideFrame bg="white" {...p}>
    <div className="max-w-[1200px] mx-auto px-6 sm:px-12 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-center">
        {/* Left — text + flow */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: '#0063ff' }}>Partnerskap</p>
          <h2 className="text-[30px] sm:text-[38px] lg:text-[44px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.06] mb-3">DigiHome + FINN.no</h2>
          <p className="text-[14px] sm:text-[15px] text-[#999] mb-8 max-w-[380px] leading-relaxed">Hele utleieprosessen &mdash; fra registrering til innflytting &mdash; automatisert i &eacute;n plattform.</p>

          {/* Process flow — matching /produkter/utleie */}
          <div className="relative pl-6 mb-7">
            <div className="absolute left-[7px] top-2.5 bottom-2.5 w-px bg-[#e8e5e0]" />
            {[
              { t: 'Registrer bolig', d: 'AI analyserer bilder og genererer annonse automagisk', c: P },
              { t: 'Publiser p\u00e5 FINN', d: 'Ett klikk \u2014 direkte via API', c: '#0063ff' },
              { t: 'Motta interessenter', d: 'Interessentskjema rett i DigiHome', c: '#3b82f6' },
              { t: 'Visninger og screening', d: 'Automatisk booking, scoring og kvalifisering', c: '#f59e0b' },
              { t: 'Kontrakt og signering', d: 'Digital kontrakt med e-signering', c: '#22c55e' },
              { t: 'Innflytting', d: 'Onboarding av leietaker, annonse deaktiveres', c: '#059669' },
            ].map((s: any, i: number) => (
              <div key={i} className="flex items-start gap-3.5 mb-4 last:mb-0 relative">
                <div className="w-[13px] h-[13px] rounded-full flex items-center justify-center shrink-0 -ml-6 bg-white" style={{ border: `2px solid ${s.c}` }}>
                  <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: s.c }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0c0c0c] leading-tight">{s.t}</p>
                  <p className="text-[11px] text-[#999] mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Value cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl p-3.5" style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
              <p className="text-[8px] font-bold text-[#0063ff] uppercase tracking-wider mb-2">Verdi for FINN</p>
              {['H\u00f8yere annonsekvalitet', 'Flere annonser via forvaltere', 'Automatisk volum'].map((v: any, i: number) => (
                <p key={i} className="text-[10px] text-[#555] py-0.5 flex items-center gap-1.5"><svg className="w-2.5 h-2.5 text-[#0063ff] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>{v}</p>
              ))}
            </div>
            <div className="rounded-xl p-3.5" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <p className="text-[8px] font-bold uppercase tracking-wider mb-2" style={{ color: P }}>Verdi for DigiHome</p>
              {['S\u00f8ml\u00f8s publisering', 'FINN som eksklusiv kanal', 'Innsikt i dashboardet'].map((v: any, i: number) => (
                <p key={i} className="text-[10px] text-[#555] py-0.5 flex items-center gap-1.5"><svg className="w-2.5 h-2.5 shrink-0" style={{ color: P }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>{v}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Realistic FINN ad mockup */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 16px 50px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' }}>
          {/* FINN nav bar */}
          <div className="px-4 py-3 flex items-center gap-5" style={{ borderBottom: '1px solid #e8e8e8' }}>
            <img src="/finn-logo.png" alt="FINN" className="w-8 h-8 object-contain" />
            <div className="flex items-center gap-4 text-[10px] text-[#555]">
              <span>For bedrifter</span><span>Varslinger</span><span>Ny annonse</span><span>Meldinger</span><span>Min FINN</span>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="px-5 pt-3 pb-2">
            <p className="text-[10px] text-[#0063ff]">Eiendom / Bolig til leie / Vestland / Bergen / Bergen Sentrum</p>
          </div>

          {/* Hero image */}
          <div className="px-5 mb-4">
            <div className="rounded-lg overflow-hidden relative">
              <img src="/deck-img-1.webp" alt="" className="w-full h-[160px] object-cover" />
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-medium px-2 py-0.5 rounded">1/12</div>
              <div className="absolute top-1/2 left-2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"><ChevronLeft className="w-3 h-3 text-[#555]" /></div>
              <div className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"><ChevronRight className="w-3 h-3 text-[#555]" /></div>
            </div>
          </div>

          {/* Content: two columns like real FINN */}
          <div className="px-5 pb-5 grid grid-cols-[1fr_160px] gap-4">
            {/* Left content */}
            <div>
              <p className="text-[16px] font-bold text-[#0c0c0c] leading-tight mb-1">Innbydende 3-roms med balkong i Bergen sentrum</p>
              <p className="text-[10px] text-[#0063ff] mb-3">Olaf Ryes Vei 11C, 5007 Bergen</p>

              <div className="mb-3">
                <p className="text-[9px] text-[#888]">M&aring;nedsleie</p>
                <p className="text-[18px] font-bold text-[#0c0c0c]">12 300 kr</p>
              </div>
              <p className="text-[9px] text-[#888] mb-3">Inkluderer: Internett, vaktmestertjenester</p>

              <div className="border-t border-[#eee] pt-3 mb-3">
                <p className="text-[12px] font-bold text-[#0c0c0c] mb-2">N&oslash;kkelinfo</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-[9px]">
                  <div><p className="text-[#888]">Prim&aelig;rrom</p><p className="font-semibold text-[#0c0c0c]">64 m&sup2;</p></div>
                  <div><p className="text-[#888]">Boligtype</p><p className="font-semibold text-[#0c0c0c]">Leilighet</p></div>
                  <div><p className="text-[#888]">Soverom</p><p className="font-semibold text-[#0c0c0c]">2</p></div>
                  <div><p className="text-[#888]">Etasje</p><p className="font-semibold text-[#0c0c0c]">3.</p></div>
                  <div><p className="text-[#888]">Leieperiode</p><p className="font-semibold text-[#0c0c0c]">01.05.2026</p></div>
                </div>
              </div>

              <div className="border-t border-[#eee] pt-3">
                <p className="text-[12px] font-bold text-[#0c0c0c] mb-1.5">Fasiliteter</p>
                <div className="flex flex-wrap gap-1">
                  {['Balkong', 'Parkett', 'Moderne', 'Rolig', 'Sentralt', 'Heis'].map((f, i) => (
                    <span key={i} className="text-[8px] text-[#555]">{f}{i < 5 ? ' \u00b7' : ''}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar — annons&oslash;r card */}
            <div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e8e8e8' }}>
                {/* Logo banner */}
                <div className="py-3 px-3 flex items-center justify-center" style={{ backgroundColor: '#faf8f5' }}>
                  <img src="/digihome-icon.svg" alt="" className="w-6 h-6 rounded-md mr-2" />
                  <span className="text-[11px] font-bold text-[#0c0c0c]">DigiHome</span>
                </div>
                <div className="px-3 py-3 space-y-2">
                  <p className="text-[9px] text-[#888]">DigiHome Bergen</p>
                  <div className="border-t border-[#f0f0f0] pt-2">
                    <p className="text-[10px] font-bold text-[#0c0c0c]">Sarah Sleeman</p>
                    <p className="text-[8px] text-[#888]">Daglig leder</p>
                  </div>
                  <p className="text-[9px] text-[#0063ff]">909 58 313</p>
                  <div className="border-t border-[#f0f0f0] pt-2 space-y-1">
                    <p className="text-[8px] text-[#0063ff]">Hjemmeside</p>
                    <p className="text-[8px] text-[#0063ff]">Flere annonser fra annons&oslash;r</p>
                  </div>
                  {/* Interessentskjema button */}
                  <button className="w-full h-8 rounded-lg text-[9px] font-bold text-white flex items-center justify-center mt-2" style={{ backgroundColor: P }}>
                    Interessentskjema
                  </button>
                </div>
              </div>

              {/* Visning card */}
              <div className="rounded-xl mt-2 px-3 py-2.5" style={{ border: '1px solid #e8e8e8' }}>
                <p className="text-[10px] font-bold text-[#0c0c0c]">Visning</p>
                <p className="text-[8px] text-[#888] mt-0.5">Ta kontakt for &aring; avtale visning.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SlideFrame>
);


/* ═══ MARKET 1: Norsk leiemarked — ekte SSB-tall ═══ */
const SMarket1 = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  const AC = '#a052e0', INK = '#0c0c0c', INK2 = '#1c1714', SUB = '#57514a', MUT = '#8a8278';
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const tiers = [
    { year: '2026',  region: 'Norge',                size: '86',     unit: 'mrd NOK', note: 'Første bevismarked. 600 000 utleieboliger, høy digital modenhet og ingen dominerende SaaS-standard.',  width: 14,  highlight: true  },
    { year: '2027',  region: 'Norden',               size: '320',    unit: 'mrd NOK', note: 'Naturlig skalering. Lignende betalings- og identitetsinfrastruktur, med BankID, MitID og Freja som lokale tillitslag.', width: 32 },
    { year: '2028',  region: 'UK + DACH + Benelux',  size: '850',    unit: 'mrd NOK', note: 'Større markeder med samme grunnproblem: fragmentert drift, mer regulering og behov for moderne utleieteknologi.',  width: 56 },
    { year: '2029+', region: 'Globalt',              size: '2 200',  unit: 'mrd NOK', note: 'Langsiktig kategoriopsjon. Hostaway, Guesty og Lodgify viser at rental SaaS kan vokse på tvers av markeder.',    width: 100 },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes m1FadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes m1HeadlineIn { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes m1RowIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes m1Grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 24%" opacity={0.4} />

    <div className="max-w-[1180px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* header */}
      <div className="mb-8 sm:mb-11 max-w-[980px]">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.32em]" style={{ ...F, color: AC, animation: anim ? 'm1FadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: show ? undefined : 0 }}>Marked · geografisk kaskade</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.8vw, 50px)', color: INK, animation: anim ? 'm1HeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: show ? undefined : 0 }}>
          <span style={{ color: AC }}>Norge</span> først. <span style={{ color: '#9b938a', fontWeight: 400 }}>Norden neste. Globalt på sikt.</span>
        </h2>
        <span className="block mt-7 h-px rounded-full" style={{ width: 64, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left', animation: anim ? 'm1Grow 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }} />
        <p className="text-[14px] sm:text-[15.5px] font-normal leading-[1.6] mt-6 max-w-[720px]" style={{ ...F, color: SUB, animation: anim ? 'm1FadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s both' : undefined, opacity: show ? undefined : 0 }}>
          DigiHome bygges som én kjerneplattform, med lokale lag for språk, regelverk, betaling og identitet.
        </p>
      </div>

      {/* editorial ladder */}
      <div>
        {tiers.map((t, i) => (
          <div key={i} className="relative grid grid-cols-12 gap-4 sm:gap-6 items-center"
               style={{
                 paddingTop: 'clamp(15px, 1.9vh, 24px)', paddingBottom: 'clamp(15px, 1.9vh, 24px)',
                 borderTop: i === 0 ? 'none' : '1px solid rgba(20,15,10,0.09)',
                 animation: anim ? `m1RowIn 0.7s cubic-bezier(0.22,1,0.36,1) ${0.6 + i * 0.1}s both` : undefined,
                 opacity: show ? undefined : 0,
               }}>
            <div className="col-span-12 sm:col-span-4 flex items-baseline gap-4 sm:gap-5">
              <span className="tabular-nums tracking-[0.06em] shrink-0" style={{ ...FH, fontWeight: 600, fontSize: 13, color: t.highlight ? AC : MUT }}>{t.year}</span>
              <div className="min-w-0">
                <p className="tracking-[-0.02em] leading-none" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(17px, 1.8vw, 21px)', color: INK }}>{t.region}</p>
                <p className="font-normal mt-2 leading-[1.45]" style={{ ...F, fontSize: 'clamp(11px, 0.85vw, 12.5px)', color: SUB }}>{t.note}</p>
              </div>
            </div>
            <div className="col-span-12 sm:col-span-5 hidden sm:block">
              <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(20,15,10,0.07)' }}>
                <div className="h-full rounded-full origin-left"
                     style={{ background: t.highlight ? `linear-gradient(90deg, ${AC}, #c79bf0)` : '#23201c', width: `${t.width}%`, transform: show ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1.2s cubic-bezier(0.22,1,0.36,1) ${1 + i * 0.1}s` }} />
              </div>
            </div>
            <div className="col-span-12 sm:col-span-3 flex items-baseline gap-2 sm:justify-end">
              <span className="tracking-[-0.04em] leading-none tabular-nums" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(38px, 4.4vw, 58px)', color: t.highlight ? AC : INK }}>{t.size}</span>
              <div className="flex flex-col gap-[2px] pb-1">
                <span className="text-[11.5px] font-semibold" style={{ ...F, color: INK2 }}>{t.unit}</span>
                <span className="text-[10px] font-normal" style={{ ...F, color: MUT }}>årlig leievolum</span>
              </div>
            </div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(20,15,10,0.09)' }} />
      </div>

      {/* footer */}
      <div className="mt-7 sm:mt-9 flex items-baseline justify-between flex-wrap gap-4"
           style={{ animation: anim ? 'm1FadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: show ? undefined : 0 }}>
        <p className="text-[11px] sm:text-[12px] font-normal leading-[1.55] max-w-[760px]" style={{ ...F, color: MUT }}>
          Tallene viser samlet <span className="font-semibold" style={{ color: INK2 }}>leievolum</span>. DigiHome tjener på forvaltningshonorar (10 % av leien), recurring per enhet fra franchise og utleiemegling — alt skalerer med leienivå og antall enheter.
        </p>
        <p className="text-[10.5px] font-normal" style={{ ...F, color: '#a39a8e' }}>Kilder: Eurostat · SSB · Statista PropTech</p>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE 10 — SMarket2 (Korttid 2,7× mer) · Proptonomy-style ═══ */
const SMarket2 = (p: any) => {
  const active = p.isActive;
  const channels = [
    { label: 'Langtid (månedlig)', price: '12 000', unit: 'kr/mnd', per: '400 kr/natt', pct: 37, color: '#a8a094' },
    { label: 'Korttid (Airbnb, Booking)', price: '32 400', unit: 'kr/mnd', per: '1 080 kr/natt', pct: 100, color: P, bold: true },
  ];
  const drivers = [
    { num: '01', big: '+129', unit: '%', title: 'Airbnb-vekst i Norge', lead: 'Korttidsmarkedet har mer enn doblet seg fra 2021 til 2023.', note: 'AirDNA · 2024' },
    { num: '02', big: '14', unit: 'M', title: 'Airbnb-overnattinger 2025', lead: 'Norge passerer 14 millioner Airbnb-netter — opp fra 6,1M i 2021.', note: 'Airbtics · prognose 2025' },
    { num: '03', big: '70', unit: '%', title: 'Eiere vil mikse', lead: 'Syv av ti utleiere vurderer å kombinere korttid og langtid i samme bolig.', note: 'DigiHome-undersøkelse · 2024' },
  ];

  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes m2FadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes m2HeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes m2CardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes m2Rule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes m2BigNum { from { opacity: 0; transform: translateY(14px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
    `}</style>

    <DotGrid maskCenter="50% 30%" opacity={0.45} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-5"
           style={{ color: P, animation: active ? 'm2FadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Dynamikk · Korttid vs. Langtid
        </p>
        <h2 className="text-[26px] sm:text-[34px] lg:text-[42px] font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.06] max-w-[1100px]"
            style={{ ...F, animation: active ? 'm2HeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block">Korttid betaler <span style={{ color: P }}>2,7× mer</span> enn langtid.</span>{' '}
          <span className="md:block">Samme bolig. Dobbelt inntekt.</span>
        </h2>
      </div>

      {/* Comparison hero + 3 drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5 lg:gap-7">
        {/* LEFT — Editorial comparison card */}
        <article className="rounded-[22px] p-7 sm:p-9 relative overflow-hidden flex flex-col"
                 style={{
                   background: 'linear-gradient(165deg, #fafaf7 0%, #f2efe9 100%)',
                   border: '1px solid #ece8e1',
                   boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 20px 60px rgba(20,15,10,0.08)',
                   animation: active ? 'm2CardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#b5aa98] mb-1.5" style={F}>SAMME BOLIG · ULIK KANAL</p>

          <div className="flex items-baseline gap-3 mb-6" style={{ animation: active ? 'm2BigNum 0.9s cubic-bezier(0.22,1,0.36,1) 0.8s both' : undefined, opacity: active ? undefined : 0 }}>
            <p className="text-[112px] sm:text-[144px] font-bold text-[#0c0c0c] tracking-[-0.055em] leading-[0.9] tabular-nums" style={F}>2,7<span style={{ color: P }}>×</span></p>
            <p className="text-[16px] sm:text-[18px] font-medium text-[#6e6a62] leading-tight" style={F}>høyere inntekt<br/>på korttid</p>
          </div>

          <div className="space-y-5 pt-6 border-t border-[#e2ded5]">
            {channels.map((c, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <p className={`text-[13px] ${c.bold ? 'font-bold text-[#0c0c0c]' : 'font-semibold text-[#2a2a2a]'}`} style={F}>{c.label}</p>
                    <p className="text-[10.5px] text-[#8a8478] mt-0.5">{c.per}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[22px] font-bold tabular-nums ${c.bold ? '' : 'text-[#8a8478]'}`} style={{ ...F, color: c.bold ? P : undefined }}>{c.price}</p>
                    <p className="text-[10px] text-[#8a8478] mt-0.5">{c.unit}</p>
                  </div>
                </div>
                <div className="h-[5px] rounded-full overflow-hidden" style={{ backgroundColor: '#e2ded5' }}>
                  <div className="h-full rounded-full origin-left" style={{
                    background: c.color,
                    transform: active ? 'scaleX(1)' : 'scaleX(0)',
                    width: `${c.pct}%`,
                    transition: `transform 1.1s cubic-bezier(0.22,1,0.36,1) ${1.0 + i * 0.18}s`,
                  }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10.5px] text-[#8a8478] font-light mt-6 tracking-[-0.002em]">Kilde: Airbtics · AirDNA · SSB · DigiHome-analyse · typisk 2-roms i Bergen sentrum</p>
        </article>

        {/* RIGHT — 3 driver cards */}
        <div className="flex flex-col gap-4">
          {drivers.map((d, i) => (
            <article key={i} className="bg-white rounded-[18px] p-5 flex items-start gap-4 flex-1"
                     style={{
                       border: '1px solid #ece8e1',
                       boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 10px 28px rgba(20,15,10,0.05)',
                       animation: active ? `m2CardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.7 + i * 0.1}s both` : undefined,
                       opacity: active ? undefined : 0,
                     }}>
              <div className="flex-1">
                <p className="text-[8.5px] font-bold tabular-nums tracking-[0.22em] text-[#b5aa98] mb-2" style={F}>{d.num}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[30px] sm:text-[34px] font-bold text-[#0c0c0c] tracking-[-0.035em] leading-none tabular-nums" style={F}>{d.big}</span>
                  <span className="text-[14px] font-medium text-[#8a8478]">{d.unit}</span>
                </div>
                <p className="text-[12px] font-semibold text-[#0c0c0c] mt-2.5 tracking-[-0.003em]" style={F}>{d.title}</p>
                <p className="text-[10.5px] text-[#6e6a62] mt-1 leading-[1.5] font-light">{d.lead}</p>
                <p className="text-[9.5px] text-[#b5aa98] mt-2 tracking-[-0.002em]">{d.note}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Bottom ribbon */}
      <div className="mt-7 sm:mt-10 flex items-center justify-center gap-3"
           style={{ animation: active ? 'm2FadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px bg-[#e0ddd8] origin-right" style={{ width: '54px', animation: active ? 'm2Rule 0.9s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em]">
          Én bolig, én plattform, <span className="font-semibold" style={{ color: P }}>to inntektsstrømmer</span> — automatisk bytte basert på sesong og etterspørsel.
        </p>
        <div className="h-px bg-[#e0ddd8] origin-left" style={{ width: '54px', animation: active ? 'm2Rule 0.9s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};


/* ═══ MARKET 3: Vei til 150 MNOK ARR — konkret SOM + comparables ═══ */
/* ═══ SLIDE 11 — SMarket3 (Vei til 150 MNOK ARR) · Proptonomy-style ═══ */
const SMarket3 = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  const AC = '#a052e0', INK = '#0c0c0c', INK2 = '#1c1714', SUB = '#57514a', MUT = '#8a8278';
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const splits = [
    { region: 'Norge',  pct: '60', customers: '~18 000', window: '2026 – 2028', note: 'Bevismarked · 600k boliger', highlight: true },
    { region: 'Norden', pct: '30', customers: '~9 000', window: '2027 – 2029', note: 'Samme KYC-stack' },
    { region: 'Europa', pct: '10', customers: '~3 000', window: '2028 – 2030', note: 'UK + DACH først' },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes m3FadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes m3HeadlineIn { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes m3HeroIn { from { opacity: 0; transform: translateY(28px) scale(0.97); filter: blur(10px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
      @keyframes m3ColIn { from { opacity: 0; transform: translateY(20px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes m3Grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 24%" opacity={0.4} />

    <div className="max-w-[1180px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* header */}
      <div className="mb-8 sm:mb-10 max-w-[920px]">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.32em]" style={{ ...F, color: AC, animation: anim ? 'm3FadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: show ? undefined : 0 }}>Mål 2030 · Nordic leader</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.8vw, 50px)', color: INK, animation: anim ? 'm3HeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: show ? undefined : 0 }}>
          ~30 000 enheter. <span style={{ color: '#9b938a', fontWeight: 400 }}>Tre markeder. Ett nettverk.</span>
        </h2>
        <span className="block mt-7 h-px rounded-full" style={{ width: 64, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left', animation: anim ? 'm3Grow 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }} />
      </div>

      {/* hero number */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-5 sm:gap-10 pb-7 sm:pb-9"
           style={{ borderBottom: '1px solid rgba(20,15,10,0.10)', animation: anim ? 'm3HeroIn 1.1s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: show ? undefined : 0 }}>
        <div className="flex items-baseline gap-3 sm:gap-5">
          <span className="tabular-nums" style={{ ...FH, fontWeight: 700, color: AC, fontSize: 'clamp(82px, 10vw, 138px)', letterSpacing: '-0.05em', lineHeight: 0.82 }}>150</span>
          <div className="flex flex-col gap-1.5">
            <span className="tracking-[-0.02em]" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(15px, 1.4vw, 20px)', color: INK }}>MNOK ARR</span>
            <span className="text-[12px] sm:text-[13px] font-normal" style={{ ...F, color: MUT }}>innen 2030</span>
          </div>
        </div>
        <div className="max-w-[360px] sm:text-right">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.24em] mb-2.5" style={{ ...F, color: MUT }}>Struktur</p>
          <p className="text-[13px] sm:text-[14.5px] font-normal leading-[1.55]" style={{ ...F, color: SUB }}>
            Egen drift (10 % av leien) + franchise per enhet ⇒ blandet <span className="font-semibold tabular-nums" style={{ color: INK2 }}>≈ 400 kr/enhet/mnd</span> til DigiHome. Inntekten følger nettverkets enheter.
          </p>
        </div>
      </div>

      {/* 3 premium markedskort */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8 sm:mt-9">
        {splits.map((s, i) => (
          <div key={i} className="relative rounded-[20px] p-6 sm:p-7 flex flex-col"
               style={{
                 background: s.highlight ? 'linear-gradient(180deg, rgba(160,82,224,0.09), rgba(160,82,224,0.025))' : '#ffffff',
                 border: s.highlight ? '1.5px solid rgba(160,82,224,0.42)' : '1px solid rgba(20,15,10,0.08)',
                 boxShadow: s.highlight ? '0 32px 76px -36px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.7)' : '0 24px 56px -34px rgba(20,15,10,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
                 animation: anim ? `m3ColIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.95 + i * 0.12}s both` : undefined,
                 opacity: show ? undefined : 0,
               }}>
            {s.highlight && (
              <span className="absolute top-5 right-5 text-[9.5px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full" style={{ ...F, background: AC, color: '#fff' }}>Beachhead</span>
            )}
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ ...F, color: s.highlight ? AC : MUT }}>{s.region}</p>
            <div className="flex items-baseline gap-1.5 mt-4">
              <span className="tracking-[-0.04em] leading-none tabular-nums" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(42px, 4.6vw, 60px)', color: s.highlight ? AC : INK }}>{s.pct}</span>
              <span className="text-[15px] sm:text-[17px] font-medium pb-1.5" style={{ ...F, color: MUT }}>%</span>
            </div>
            <p className="text-[13.5px] sm:text-[14.5px] font-semibold tracking-[-0.005em] tabular-nums mt-4" style={{ ...FH, color: INK }}>
              {s.customers} <span className="font-normal" style={{ ...F, color: MUT }}>enheter</span>
            </p>
            <p className="text-[11.5px] sm:text-[12px] font-normal mt-1.5 tracking-[-0.003em] tabular-nums" style={{ ...F, color: MUT }}>{s.window}</p>
            <p className="text-[11.5px] sm:text-[12.5px] font-normal mt-3 leading-[1.5]" style={{ ...F, color: SUB }}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="mt-7 sm:mt-9 pt-5 sm:pt-6 flex items-baseline justify-between flex-wrap gap-4"
           style={{ borderTop: '1px solid rgba(20,15,10,0.09)', animation: anim ? 'm3FadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.35s both' : undefined, opacity: show ? undefined : 0 }}>
        <p className="text-[11px] sm:text-[12px] font-normal leading-[1.55] max-w-[680px]" style={{ ...F, color: MUT }}>
          Sammenlignbare exits: <span className="font-semibold" style={{ color: INK2 }}>Hostaway $925M</span> · <span className="font-semibold" style={{ color: INK2 }}>Guesty ~$1 mrd</span> · <span className="font-semibold" style={{ color: INK2 }}>AppFolio $5,8 mrd</span>. Relevante verdsettelsesankre — samme operasjonelle smerte, angrepet nordisk og AI-native.
        </p>
        <p className="text-[10.5px] font-normal" style={{ ...F, color: '#a39a8e' }}>20–30× ARR-multippel · 3–5 mrd NOK exit-range</p>
      </div>
    </div>
  </SlideFrame>
  );
};


/* ═══ SLIDE 19 — S9 (Closing) · Editorial premium ═══ */
const S9 = (p: any) => (
  <SlideFrame bg="dark" {...p}>
    <style>{`
      @keyframes s9FadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes s9HeadlineIn { from { opacity: 0; transform: translateY(28px); filter: blur(10px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes s9Line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>
    {/* Background image + atmospheric overlays */}
    <div className="absolute inset-0">
      <img src="/bergen-harbor.webp" alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: '#0a0a0a', opacity: 0.38, mixBlendMode: 'multiply' }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(91,63,168,0.14) 30%, rgba(10,10,10,0.78) 75%, rgba(10,10,10,0.96) 100%)' }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(10,10,10,0.35) 0%, transparent 72%)' }} />
    </div>

    <div className="w-full text-center max-w-[860px] mx-auto px-8 relative z-10 my-auto">
      {/* Editorial eyebrow */}
      <div className="flex items-center justify-center gap-4 mb-7 sm:mb-10"
           style={{ animation: p.isActive ? 's9FadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: p.isActive ? undefined : 0 }}>
        <div className="h-px bg-white/45 origin-right" style={{ width: 'clamp(22px, 3.5vw, 48px)', animation: p.isActive ? 's9Line 1s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined }} />
        <span className="text-white/85 font-semibold uppercase" style={{ fontSize: 'clamp(9.5px, 0.85vw, 11px)', letterSpacing: '0.3em' }}>Takk for tiden</span>
        <div className="h-px bg-white/45 origin-left" style={{ width: 'clamp(22px, 3.5vw, 48px)', animation: p.isActive ? 's9Line 1s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined }} />
      </div>

      {/* Massive headline — natural wrap, no forced line breaks */}
      <h2 className="font-bold tracking-[-0.035em] leading-[1.04] mb-8 max-w-[1100px] mx-auto"
          style={{
            ...F,
            fontSize: 'clamp(36px, min(5.4vw, 7.5vh), 78px)',
            color: '#ffffff',
            textShadow: '0 2px 30px rgba(10,10,10,0.55), 0 0 80px rgba(210,152,255,0.22)',
            animation: p.isActive ? 's9HeadlineIn 1.1s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined,
            opacity: p.isActive ? undefined : 0,
          }}>
        Verden trenger bedre utleie. <span style={{ color: '#c39ce0' }}>Vi bygger infrastrukturen.</span>
      </h2>

      {/* Lead */}
      <p className="mx-auto font-light max-w-[720px] mb-5 sm:mb-6 px-4"
         style={{
           ...F,
           fontSize: 'clamp(13px, 1.1vw, 17px)',
           color: 'rgba(255,255,255,0.8)',
           lineHeight: 1.65,
           letterSpacing: '-0.005em',
           textShadow: '0 1px 14px rgba(10,10,10,0.65)',
           animation: p.isActive ? 's9FadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.9s both' : undefined,
           opacity: p.isActive ? undefined : 0,
         }}>
        Vi starter i Norge — 600 000 utleieboliger, flere kanaler, mer regulering og høyere forventninger. Behovet for en samlet AI-drevet plattform finnes overalt der bolig leies ut.
      </p>
      <p className="mx-auto font-medium max-w-[640px] mb-7 sm:mb-10 px-4"
         style={{
           ...F,
           fontSize: 'clamp(12.5px, 1vw, 15px)',
           color: 'rgba(255,255,255,0.92)',
           lineHeight: 1.6,
           letterSpacing: '-0.003em',
           textShadow: '0 1px 14px rgba(10,10,10,0.65)',
           animation: p.isActive ? 's9FadeUp 1s cubic-bezier(0.22,1,0.36,1) 1.05s both' : undefined,
           opacity: p.isActive ? undefined : 0,
         }}>
        DigiHome har produktet, teamet og timingen. Nå henter vi kapital for å bevise markedet — og bygge plattformen verden trenger.
      </p>

      {/* Contact row */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 mb-10"
           style={{ animation: p.isActive ? 's9FadeUp 1s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: p.isActive ? undefined : 0 }}>
        <a href="mailto:sarah@digihome.no" className="text-[13px] sm:text-[14px] text-white/90 hover:text-white transition-colors font-medium tracking-[-0.003em]">sarah@digihome.no</a>
        <span className="hidden sm:block w-1 h-1 rounded-full bg-white/25" />
        <a href="mailto:martin@kviteberg.no" className="text-[13px] sm:text-[14px] text-white/90 hover:text-white transition-colors font-medium tracking-[-0.003em]">martin@kviteberg.no</a>
        <span className="hidden sm:block w-1 h-1 rounded-full bg-white/25" />
        <a href="tel:+4740400758" className="text-[13px] sm:text-[14px] text-white/90 hover:text-white transition-colors font-medium tabular-nums">+47 404 00 758</a>
        <span className="hidden sm:block w-1 h-1 rounded-full bg-white/25" />
        <a href="https://digihome.no" className="text-[13px] sm:text-[14px] text-white/90 hover:text-white transition-colors font-medium">digihome.no</a>
      </div>

      {/* Bottom signature bar */}
      <div className="flex items-center justify-center gap-3 pt-6 border-t border-white/[0.08] max-w-[320px] mx-auto"
           style={{ animation: p.isActive ? 's9FadeUp 1s cubic-bezier(0.22,1,0.36,1) 1.35s both' : undefined, opacity: p.isActive ? undefined : 0 }}>
        <img src="/deck-logo-light.svg" alt="DigiHome" className="h-4 opacity-70" />
        <span className="w-1 h-1 rounded-full bg-white/25" />
        <span className="text-[10px] text-white/55 font-light tracking-[0.15em] uppercase">Bergen · i drift nå</span>
      </div>
    </div>
  </SlideFrame>
);

/* ═══ PRODUCT SHOWCASE — Headline + HeroProductAnimation (from /digihome-tech) ═══ */
const SLiveDemo = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const [mountKey, setMountKey] = useState(0);
  const [scale, setScale] = useState(isPdf ? 0.92 : 0.78);
  const [started, setStarted] = useState(isPdf); // Auto-started in PDF mode (no play overlay)

  useEffect(() => {
    if (p.isActive && !isPdf) {
      setMountKey(k => k + 1);
      setStarted(false); // reset play button on re-enter
    }
  }, [p.isActive, isPdf]);

  useEffect(() => {
    if (isPdf) {
      // Fixed high-quality scale for PDF — no window-size dependency
      setScale(0.92);
      return;
    }
    const update = () => {
      const available = window.innerHeight - 220;
      const byHeight = available / 715;
      const byWidth = Math.min(1, (window.innerWidth - 140) / 1180);
      const s = Math.max(0.55, Math.min(byHeight, byWidth, 0.92));
      setScale(s);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isPdf]);

  // When play is clicked — trigger scroll listener inside HeroProductAnimation
  const handlePlay = () => {
    setStarted(true);
    // Fire scroll events so HeroProductAnimation's internal listener picks up the "in-view" condition
    setTimeout(() => window.dispatchEvent(new Event('scroll')), 50);
    setTimeout(() => window.dispatchEvent(new Event('scroll')), 300);
    setTimeout(() => window.dispatchEvent(new Event('scroll')), 600);
  };

  const scaledHeight = 715 * scale;
  const scaledWidth = 1180 * scale;

  return (
    <SlideFrame bg="beige" {...p}>
      <style>{`
        @keyframes ldFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ldHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes ldAnimIn { 0% { opacity: 0; transform: translateY(30px); filter: blur(6px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes ldPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(210,152,255,0.5); } 50% { box-shadow: 0 0 0 16px rgba(210,152,255,0); } }
        @keyframes ldPlayIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      `}</style>

      <div className="mx-auto px-6 sm:px-12 w-full relative z-10" style={{ maxWidth: Math.max(scaledWidth + 96, 800) }}>

        {/* ═══ Editorial header — left-aligned with animation container below ═══ */}
        <div className="mb-5 sm:mb-8">
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <h2 className="font-bold text-[#0c0c0c] tracking-[-0.04em] leading-[1.04] max-w-[700px]"
                style={{ ...F, fontSize: 'clamp(26px, 3.6vw, 46px)', animation: active ? 'ldHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined, opacity: active ? undefined : 0 }}
                data-testid="product-headline">
              Produktet er bygget. <span className="md:block">Nå skal <span style={{ color: P }}>markedet vinnes.</span></span>
            </h2>
            <p className="text-[#5a564d] leading-[1.55] font-light tracking-[-0.003em] max-w-[360px] mb-1"
               style={{ ...F, fontSize: 'clamp(11.5px, 1vw, 14px)', animation: active ? 'ldFade 0.7s ease-out 0.4s both' : undefined, opacity: active ? undefined : 0 }}>
              Ett system for hele utleien — fra annonse og kontrakt til drift, betaling og oppfølging.
            </p>
          </div>
        </div>

        {/* ═══ HeroProductAnimation — scaled to fit, same left edge as headline ═══ */}
        <div className="relative w-full"
             style={{
               height: `${scaledHeight}px`,
               animation: active && !isPdf ? 'ldAnimIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both' : undefined,
               opacity: (active || isPdf) ? 1 : 0,
             }}>
          <div style={{
              width: scaledWidth,
              height: scaledHeight,
              position: 'relative',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 4px 8px rgba(20,15,10,0.05), 0 30px 80px rgba(20,15,10,0.16)',
              border: '1px solid #e4dfd6',
              background: '#ffffff',
            }}>
            {isPdf ? (
              // PDF-mode: vis statisk høyoppløselig produktbilde (animasjon kan ikke captures)
              <img
                src="/deck-desktop.webp"
                alt="DigiHome dashboard"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  display: 'block',
                }}
                draggable={false}
              />
            ) : (
              <>
                <div key={mountKey}
                  style={{
                    width: 1180,
                    height: 715,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}>
                  <HeroProductAnimation key={mountKey} />
                </div>

                {/* Play button overlay — absolutely centered on the video frame */}
                {!started && (
                  <button
                    onClick={handlePlay}
                    data-testid="play-demo-btn"
                    className="absolute inset-0 w-full h-full group cursor-pointer"
                    style={{
                      background: 'linear-gradient(165deg, rgba(247,245,242,0.72) 0%, rgba(247,245,242,0.92) 100%)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      border: 0,
                      zIndex: 5,
                      padding: 0,
                    }}>
                    <div className="rounded-full transition-all duration-300 group-hover:scale-105 flex items-center justify-center"
                         style={{
                           width: 88,
                           height: 88,
                           background: `linear-gradient(135deg, ${P} 0%, #9333ea 100%)`,
                           boxShadow: '0 12px 40px rgba(210,152,255,0.38), 0 2px 4px rgba(20,15,10,0.08)',
                           animation: 'ldPulse 2.4s ease-in-out infinite, ldPlayIn 0.7s cubic-bezier(0.22,1,0.36,1) both',
                           position: 'absolute',
                           top: '50%',
                           left: '50%',
                           transform: 'translate(-50%, -50%)',
                         }}>
                      <svg width="30" height="32" viewBox="0 0 28 30" fill="none" style={{ marginLeft: 3 }}>
                        <path d="M4 2L24 15L4 28V2Z" fill="#ffffff" />
                      </svg>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
};

/* ═══ PRODUCT TIERS — Premium DigiHome ═══ */
/* ═══ SLIDE 14 — SProductTiers (Priser) · Proptonomy-style ═══ */
const SProductTiers = (p: any) => {
  const active = p.isActive;
  const tiers = [
    {
      num: '00',
      name: 'Free',
      audience: 'For utleiere som vil komme i gang',
      price: '0',
      unit: 'kr',
      cycle: 'alltid',
      lead: 'Alt du trenger for å publisere første leieforhold.',
      features: ['Annonse laget med AI fra mobilbilder', 'Digital leiekontrakt med BankID', 'Oversikt over interessenter og søkere', 'Depositumskonto ved behov'],
      style: 'ghost',
    },
    {
      num: '01',
      name: 'Essential',
      audience: 'For vanlig langtidsutleie',
      price: '99',
      unit: 'kr',
      cycle: 'per leieforhold / mnd',
      lead: 'Alt som trengs for å håndtere et leieforhold trygt og ryddig.',
      features: ['Husleie, depositum og KID-betaling', 'Digital kontrakt, varsler og oppfølging', 'Regnskapssync mot Fiken, Tripletex m.fl.', 'Erstatter regneark, manuelle purringer og løse dokumenter'],
      style: 'neutral',
    },
    {
      num: '02',
      name: 'Smart Hybrid',
      audience: 'For boliger som kan leies ut både kort og langt',
      price: '249',
      unit: 'kr',
      cycle: 'per bolig / mnd',
      lead: 'DigiHome hjelper utleier å velge riktig kanal til riktig tid.',
      features: ['Publisering på FINN, Airbnb og Booking', 'Dynamisk prising og kanalstyring', 'AI-assistent for gjestehenvendelser', 'Automatisk tilpasning etter sesong og etterspørsel'],
      style: 'neutral',
    },
    {
      num: '03',
      name: 'Pro',
      audience: 'For forvaltere og eiendomsselskaper',
      price: 'fra 1 990',
      unit: 'kr',
      cycle: 'per måned',
      lead: 'Flere boliger kan driftes uten flere ansatte.',
      features: ['AI-driftsassistent hele døgnet', 'Portaler for eiere, leietakere og leverandører', 'Klientkonto, oppgjør og avansert rapportering', 'Volumpris for større porteføljer'],
      style: 'featured',
    },
    {
      num: '04',
      name: 'Enterprise',
      audience: 'For store porteføljer og strategiske partnere',
      price: 'fra 9 900',
      unit: 'kr',
      cycle: 'per måned',
      lead: 'Full plattform, dypere integrasjoner og tett oppfølging.',
      features: ['White-label og API-tilgang', 'Dedikert onboarding og support', 'Porteføljeanalyse og ESG-rapportering', 'SLA og fast kontaktperson'],
      style: 'dark',
    },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes ptFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes ptHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes ptCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes ptRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 26%" opacity={0.4} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-6 sm:mb-8 max-w-[1080px]">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-5"
           style={{ color: P, animation: active ? 'ptFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Priser
        </p>
        <h2 className="font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.04]"
            style={{ ...F, fontSize: 'clamp(26px, 3.4vw, 46px)', animation: active ? 'ptHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block"><span style={{ color: P }}>Gratis</span> å prøve.</span>{' '}
          <span className="md:block text-[#3a3530] font-light tracking-[-0.03em]">Riktig pris når verdien øker.</span>
        </h2>
        <p className="text-[#3a3530] leading-[1.55] font-light tracking-[-0.003em] mt-5 max-w-[820px]"
           style={{ ...F, fontSize: 'clamp(13px, 1.1vw, 15px)', animation: active ? 'ptFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: active ? undefined : 0 }}>
          DigiHome følger kunden fra første leieforhold til full portefølje — uten å tvinge små utleiere inn i store pakker.
        </p>
      </div>

      {/* 5 tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-4 mb-6">
        {tiers.map((t, i) => {
          const isFeatured = t.style === 'featured';
          const isDark = t.style === 'dark';
          const isGhost = t.style === 'ghost';
          return (
            <article key={i} className="rounded-[20px] flex flex-col overflow-hidden"
                     style={{
                       background: isDark ? '#0c0c0c' : isGhost ? 'transparent' : '#ffffff',
                       border: isFeatured ? `1.5px solid ${P}40` : isGhost ? '1.5px dashed #ddd8d0' : '1px solid #ece8e1',
                       boxShadow: isFeatured ? `0 2px 4px rgba(20,15,10,0.03), 0 20px 60px ${P}18` : isGhost ? 'none' : '0 1px 2px rgba(20,15,10,0.03), 0 10px 32px rgba(20,15,10,0.05)',
                       animation: active ? `ptCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.1}s both` : undefined,
                       opacity: active ? undefined : 0,
                     }}>
              <div className="p-5 flex flex-col flex-1">
                {/* Top row: index + recommended pill */}
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[8.5px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: isFeatured ? P : isDark ? 'rgba(255,255,255,0.5)' : '#b5aa98' }}>{t.num}</p>
                  {isFeatured && (
                    <span className="text-[8px] font-bold uppercase tracking-[0.12em] px-2 py-[2px] rounded-full text-white" style={{ background: P, boxShadow: `0 0 16px ${P}40` }}>Anbefalt</span>
                  )}
                </div>

                {/* Name + audience */}
                <h3 className={`text-[19px] font-bold tracking-[-0.02em] mb-1 ${isDark ? 'text-white' : 'text-[#0c0c0c]'}`} style={F}>{t.name}</h3>
                <p className={`text-[9.5px] font-semibold mb-3 tracking-[-0.002em] ${isFeatured ? '' : isDark ? 'text-white/70' : 'text-[#b5aa98]'}`} style={isFeatured ? { color: P } : undefined}>{t.audience}</p>

                {/* Lead */}
                <p className={`text-[11px] leading-[1.55] font-light mb-4 ${isDark ? 'text-white/60' : 'text-[#6e6a62]'}`}>{t.lead}</p>

                {/* Features */}
                <ul className="space-y-2 mb-4 flex-1">
                  {t.features.map((f, j) => (
                    <li key={j} className={`text-[10.5px] leading-[1.5] font-light flex items-start gap-2 ${isDark ? 'text-white/70' : 'text-[#6e6a62]'}`}>
                      <Check className="mt-[3px] w-2.5 h-2.5 shrink-0" style={{ color: isFeatured ? P : isDark ? 'rgba(195,156,224,0.8)' : '#c4b9a8' }} strokeWidth={3} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Volume pricing (Pro only) */}
                {t.volume && (
                  <div className="rounded-[10px] p-3 mb-5" style={{ background: `${P}08`, border: `1px solid ${P}20` }}>
                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: P }}>VOLUMRABATT</p>
                    {t.volume.map((v: any, k: number) => (
                      <div key={k} className="flex items-center justify-between py-0.5">
                        <span className="text-[10px] text-[#6e6a62] font-light">{v.r}</span>
                        <span className="text-[10px] font-bold text-[#0c0c0c] tabular-nums" style={F}>{v.p} kr</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Price footer */}
                <div className={`pt-4 mt-auto border-t ${isDark ? 'border-white/10' : isFeatured ? '' : 'border-[#f0ede8]'}`} style={isFeatured ? { borderTop: `1px solid ${P}15` } : undefined}>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <p className={`font-bold tracking-[-0.03em] leading-none ${isFeatured ? 'text-[22px]' : 'text-[26px]'} ${isDark ? 'text-white' : 'text-[#0c0c0c]'}`} style={F}>{t.price}</p>
                    {t.unit && <span className={`text-[12px] ${isDark ? 'text-white/55' : 'text-[#b5aa98]'}`}>{t.unit}</span>}
                  </div>
                  <p className={`text-[9.5px] mt-1.5 ${isFeatured ? '' : isDark ? 'text-white/55' : 'text-[#b5aa98]'}`} style={isFeatured ? { color: `${P}90` } : undefined}>{t.cycle}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Add-ons editorial strip */}
      <div className="rounded-[18px] bg-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
           style={{
             border: '1px solid #ece8e1',
             boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 10px 28px rgba(20,15,10,0.04)',
             animation: active ? 'ptCardIn 0.8s cubic-bezier(0.22,1,0.36,1) 1.0s both' : undefined,
             opacity: active ? undefined : 0,
           }}>
        <div className="shrink-0">
          <p className="text-[9px] font-bold tracking-[0.22em] text-[#b5aa98] mb-1" style={F}>TILLEGG</p>
          <p className="text-[12.5px] font-bold text-[#0c0c0c] tracking-[-0.008em]" style={F}>Add-ons</p>
        </div>
        <div className="h-px sm:h-10 sm:w-px bg-[#e6e2d9] shrink-0 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 flex-1">
          {[
            { label: 'Depositumskonto', price: '299 kr' },
            { label: 'Kredittsjekk', price: '39 kr' },
            { label: 'Utleieforsikring', price: '29 kr/mnd' },
            { label: 'Publisering alle kanaler', price: '799 kr' },
          ].map((a, k) => (
            <div key={k}>
              <p className="text-[9.5px] text-[#b5aa98] uppercase tracking-[0.15em] mb-1">{a.label}</p>
              <p className="text-[15px] font-bold text-[#0c0c0c] tabular-nums tracking-[-0.005em]" style={F}>{a.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom ribbon */}
      <div className="mt-8 flex items-center justify-center gap-3"
           style={{ animation: active ? 'ptFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px bg-[#d8d2c5] origin-right" style={{ width: '54px', animation: active ? 'ptRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em]">
          Free → Essential → Smart Hybrid → Pro → Enterprise — <span className="font-semibold" style={{ color: P }}>en prismodell som vokser med kunden</span>, fra første leieforhold til profesjonell drift.
        </p>
        <div className="h-px bg-[#d8d2c5] origin-left" style={{ width: '54px', animation: active ? 'ptRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ WHY DIGIHOME — Premium 3 pillars ═══ */
const SWhyDH = (p: any) => {
  const active = p.isActive;
  const solutions = [
    {
      num: '01',
      title: 'Rask oppstart',
      lead: 'Last opp mobilbilder. DigiHome lager annonse, foreslår pris, klargjør kontrakt og publiserer på riktige kanaler.',
      tag: 'Fra idé til utleie på minutter — ikke uker.',
    },
    {
      num: '02',
      title: 'Bedre utnyttelse',
      lead: 'Systemet anbefaler riktig kanal til riktig tid: langtid for stabilitet, korttid når etterspørselen og prisen er høy.',
      tag: 'Samme bolig kan jobbe smartere gjennom året.',
    },
    {
      num: '03',
      title: 'Automatisert drift',
      lead: 'AI-assistenten håndterer henvendelser, oppretter saker, følger opp leietakere og kobler på riktig leverandør når noe skjer.',
      tag: 'Mindre manuelt arbeid. Raskere svar. Bedre kontroll.',
    },
  ];

  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes solFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes solHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes solCardIn { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes solRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 30%" opacity={0.45} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* ═══ Editorial header ═══ */}
      <div className="mb-7 sm:mb-10 max-w-[1120px]">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-5"
           style={{ color: P, animation: active ? 'solFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Løsningen
        </p>
        <h2 className="font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.06]"
            style={{ ...F, fontSize: 'clamp(26px, 3.4vw, 46px)', animation: active ? 'solHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block">Ett system som <span style={{ color: P }}>gjør jobben</span></span>{' '}
          <span className="md:block text-[#3a3530] font-light tracking-[-0.03em]">— ikke bare organiserer den.</span>
        </h2>
        <p className="text-[#3a3530] leading-[1.55] font-light tracking-[-0.003em] mt-5 max-w-[780px]"
           style={{ ...F, fontSize: 'clamp(13px, 1.1vw, 15px)', animation: active ? 'solFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: active ? undefined : 0 }}>
          DigiHome samler hele utleieflyten i én plattform: fra første bilde til signert kontrakt, betalt husleie, løpende drift og ferdig regnskap.
        </p>
      </div>

      {/* ═══ 3 premium solution cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7">
        {solutions.map((s, i) => (
          <article key={i} className="rounded-[20px] flex flex-col p-7 sm:p-8"
                   style={{
                     background: '#fafaf7',
                     border: '1px solid #ece8e1',
                     boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 14px 40px rgba(20,15,10,0.06)',
                     animation: active ? `solCardIn 0.85s cubic-bezier(0.22,1,0.36,1) ${0.55 + i * 0.12}s both` : undefined,
                     opacity: active ? undefined : 0,
                   }}>
            {/* Index */}
            <p className="text-[10px] font-bold tabular-nums tracking-[0.22em] mb-5" style={{ ...F, color: P }}>{s.num}</p>

            {/* Title */}
            <h3 className="text-[20px] sm:text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] leading-tight mb-4" style={F}>{s.title}</h3>

            {/* Lead */}
            <p className="text-[13px] sm:text-[14px] text-[#2a2a2a] font-light leading-[1.55] tracking-[-0.003em] mb-5 flex-1" style={F}>
              {s.lead}
            </p>

            {/* Hairline divider */}
            <div className="h-px bg-gradient-to-r from-[#e6e2d9] to-transparent mb-4" />

            {/* Tag line */}
            <p className="text-[12px] sm:text-[12.5px] font-semibold tracking-[-0.003em] leading-[1.5]" style={{ ...F, color: P }}>
              {s.tag}
            </p>
          </article>
        ))}
      </div>

      {/* ═══ Resultat-footer ═══ */}
      <div className="mt-7 sm:mt-10"
           style={{ animation: active ? 'solFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.05s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="flex items-start gap-4 max-w-[920px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] pt-1 shrink-0" style={{ ...F, color: P }}>Resultatet</p>
          <p className="text-[12.5px] sm:text-[13.5px] text-[#3a3530] font-light leading-[1.55] tracking-[-0.003em]" style={F}>
            Utleier får én samlet flyt for annonse, kontrakt, betaling, drift og regnskap — bygget for norske regler og nordisk skalering.
          </p>
        </div>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE 15 — SRevenue (Inntektsmodell) · Proptonomy-style ═══ */
const SRevenue = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0', INK = '#0c0c0c', INK2 = '#1c1714', SUB = '#57514a', MUT = '#8a8278';
  const HAIR = 'rgba(20,15,10,0.10)';
  const engines = [
    { num: '01', title: 'Egen forvaltning', badge: 'Flaggskip', metric: '10', unit: '% av leien', lead: 'Bergen-flaggskipet vi drifter selv. Full forvaltningsmargin — beviset og cash-en.', bullets: ['≈ 2 000 kr/enhet/mnd (modell) — Bergen i dag ~3 000', 'Dagens 40 huseiere ligger her', 'Referansene franchise hviler på'] },
    { num: '02', title: 'Franchise · plattform', badge: 'Recurring', metric: 'fra 199', unit: 'kr/enhet/mnd', lead: 'Lokale operatører driver på DigiHome-plattformen. Skalerbar, recurring kjerne-ARR.', bullets: ['+ liten royalty på toppen', '≈ 0,7 MNOK/år per moden franchise', '300+ enheter per franchise'] },
    { num: '03', title: 'Franchise · etablering', badge: 'Engangs', metric: '~200', unit: 'k per franchise', lead: 'Etableringsavgift når en ny operatør går inn i nettverket. Finansierer onboarding.', bullets: ['Opplæring, oppsett og merkevare', 'Kapital-lett — operatør tar driften', 'Skalerer med antall nye franchises'] },
    { num: '04', title: 'Utleiemegling & transaksjoner', badge: 'Alle segmenter', metric: '+30–80', unit: 'kr ARPU', lead: 'Utleiemegling per leieforhold + depositum, kredittsjekk og forsikring. Høy margin.', bullets: ['Engangsgebyr ved nytt leieforhold', 'Depositum · kredittsjekk · forsikring', 'Trakt inn til full forvaltning'] },
  ];
  const phases = [
    { phase: 'Fase 1', period: '2026',     customers: '~3 franchises',   arr: '5 MNOK',   bar: 3,   desc: 'Bergen egen + piloter' },
    { phase: 'Fase 2', period: '2027–28', customers: '~25 franchises',  arr: '40 MNOK',  bar: 27,  desc: 'Norge · nettverket bygges' },
    { phase: 'Fase 3', period: '2029–30', customers: '~100 franchises', arr: '150 MNOK', bar: 100, desc: 'Norden · ~30 000 enheter' },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes reFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes reHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes reCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes reRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes reBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 26%" opacity={0.4} />

    <div className="max-w-[1240px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-9 sm:mb-11 max-w-[960px]">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.4em] mb-5"
           style={{ ...F, color: AC, animation: anim ? 'reFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: show ? undefined : 0 }}>
          Inntektsmodell
        </span>
        <h2 className="tracking-[-0.04em] leading-[1.0]"
            style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 50px)', color: INK, animation: anim ? 'reHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: show ? undefined : 0 }}>
          Prisen følger <span style={{ color: AC }}>leien</span>.<br className="hidden sm:block" /> Inntekten følger nettverket.
        </h2>
        <span className="block mt-6 h-px rounded-full" style={{ width: 60, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left', animation: anim ? 'reRule 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }} />
        <p className="text-[13px] sm:text-[14.5px] leading-[1.6] font-normal max-w-[760px] mt-6"
           style={{ ...F, color: SUB, animation: anim ? 'reFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s both' : undefined, opacity: show ? undefined : 0 }}>
          DigiHome tar 10 % av leien på egen drift, recurring per enhet fra franchise og utleiemegling per leieforhold — alt skalerer med nettverkets enheter.
        </p>
      </div>

      {/* 4 motorer — editorial kolonner, hårlinje-topp, ingen kort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-7 lg:gap-x-9 gap-y-9 mb-9 sm:mb-11">
        {engines.map((e, i) => (
          <div key={i} className="relative pt-6 flex flex-col"
               style={{ animation: anim ? `reCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.1}s both` : undefined, opacity: show ? undefined : 0 }}>
            <span className="absolute top-0 left-0 right-0 h-px" style={{ background: HAIR }} />
            <span className="absolute top-0 left-0 h-[2px] w-8 rounded-full" style={{ background: AC }} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[8.5px] font-bold tabular-nums tracking-[0.24em]" style={{ ...F, color: MUT }}>MOTOR {e.num}</span>
              <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] px-2 py-[2.5px] rounded-full" style={{ ...F, background: `${AC}16`, color: AC }}>{e.badge}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className="tabular-nums tracking-[-0.04em] leading-none" style={{ ...FH, fontWeight: 700, color: INK, fontSize: e.metric.length > 3 ? 'clamp(24px,2.5vw,32px)' : 'clamp(34px,3.4vw,46px)' }}>{e.metric}</span>
              <span className="text-[12px] font-medium" style={{ ...F, color: MUT }}>{e.unit}</span>
            </div>
            <h3 className="text-[16px] tracking-[-0.018em] mb-3" style={{ ...FH, fontWeight: 700, color: INK }}>{e.title}</h3>
            <p className="text-[11.5px] font-medium leading-[1.55] mb-3.5" style={{ ...F, color: INK2 }}>{e.lead}</p>
            <ul className="space-y-2 flex-1">
              {e.bullets.map((b, j) => (
                <li key={j} className="text-[10.5px] leading-[1.5] font-normal flex items-start gap-2" style={{ ...F, color: MUT }}>
                  <span className="mt-[6px] w-[3px] h-[3px] rounded-full shrink-0" style={{ backgroundColor: AC }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Scaling scenarios — editorial dark hero */}
      <article className="rounded-[26px] p-7 sm:p-9 relative overflow-hidden"
               style={{
                 background: 'linear-gradient(165deg, #16141d 0%, #0a090d 100%)',
                 boxShadow: '0 50px 100px -55px rgba(20,15,10,0.55)',
                 animation: anim ? 'reCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.95s both' : undefined,
                 opacity: show ? undefined : 0,
               }}>
        <div aria-hidden="true" className="absolute -top-20 -right-20 w-[380px] h-[380px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(195,156,224,0.16) 0%, transparent 65%)' }} />

        <div className="relative">
          <p className="text-[9.5px] font-bold tracking-[0.22em] text-white/50 mb-5" style={F}>SKALERINGSSCENARIO · 5 ÅR</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8">
            {phases.map((ph, i) => (
              <div key={i} className="relative">
                {i < phases.length - 1 && <div className="hidden sm:block absolute -right-4 top-1 bottom-1 w-px bg-white/[0.08]" />}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: P }}>{ph.phase}</span>
                  <span className="text-[9.5px] text-white/55 tabular-nums font-medium">{ph.period}</span>
                </div>
                <p className="text-[38px] sm:text-[44px] text-white tracking-[-0.04em] leading-none mb-1.5 tabular-nums" style={{ ...FH, fontWeight: 700 }}>{ph.arr}</p>
                <p className="text-[11.5px] text-white/60 font-light mb-4"><span className="font-semibold text-white/90">{ph.customers}</span> · {ph.desc}</p>
                <div className="h-[5px] rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full rounded-full origin-left" style={{
                    background: `linear-gradient(90deg, ${P}, #9333ea)`,
                    width: `${ph.bar}%`,
                    transform: show ? 'scaleX(1)' : 'scaleX(0)',
                    transition: `transform 1s cubic-bezier(0.22,1,0.36,1) ${1.2 + i * 0.15}s`,
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 pt-5 border-t border-white/[0.08]">
            <p className="text-[11.5px] text-white/60 font-light leading-[1.55]">150 MNOK ARR ≈ <span className="font-semibold text-white/90">~30 000 enheter under forvaltning</span> på tvers av nettverket — egen drift + franchise. En brøkdel av det norske utleiemarkedet.</p>
          </div>
        </div>
      </article>

      {/* Bottom ribbon */}
      <div className="mt-8 flex items-center justify-center gap-3"
           style={{ animation: anim ? 'reFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined, opacity: show ? undefined : 0 }}>
        <div className="h-px bg-[#d8d2c5] origin-right" style={{ width: '54px', animation: anim ? 'reRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.45s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em]">
          <span className="font-semibold" style={{ color: AC }}>Kjernen:</span> egen forvaltning (10 % take-rate) + recurring per enhet fra franchise + utleiemegling gir tre inntektsstrømmer som vokser med nettverkets enheter.
        </p>
        <div className="h-px bg-[#d8d2c5] origin-left" style={{ width: '54px', animation: anim ? 'reRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.45s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE 16 — SUnitEconomics · Proptonomy-style ═══ */
const SUnitEconomics = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0', INK = '#0c0c0c', INK2 = '#1c1714', SUB = '#57514a', MUT = '#8a8278';
  const HAIR = 'rgba(20,15,10,0.10)';
  // ── Bottom-up modell · EGEN FORVALTNING (per enhet, langtid · by-snitt) ──
  const N = {
    honorar: '2\u2009000', megling: '300', brutto: '2\u2009300', drift: '300', db: '2\u2009000',
    cac: '4\u2009500', marked: '2\u2009100', onboard: '2\u2009400', placement: '9\u2009000',
  };
  const revRows = [
    { label: 'Forvaltningshonorar', sub: '10 % av ~20 000 kr leie', value: N.honorar },
    { label: 'Utleiemegling', sub: 'amortisert per leieforhold', value: N.megling },
  ];
  const onboard = ['Ringe kunde · 0,3 t', 'Befaring · 2 t', 'Lag annonse · 0,3 t', '1 visning · 1,5 t', 'Kontrakt · 0,1 t', 'Overtagelse · 1,5 t'];
  const stats = [
    { v: '~2\u2009000', u: 'kr/mnd', k: 'Dekningsbidrag', note: '~87 % margin per enhet' },
    { v: '~2', u: 'mnd', k: 'Tilbakebetaling', note: 'CAC ÷ dekningsbidrag' },
    { v: '~15', u: ':1', k: 'LTV / CAC', note: '~33 mnd botid · <3 % churn' },
    { v: '~87', u: '%', k: 'Bruttomargin', note: 'lav marginalkostnad per enhet' },
  ];

  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes ueFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes ueHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes ueCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes ueRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 24%" opacity={0.4} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header — matches other slides */}
      <div className="mb-6 sm:mb-8 max-w-[1000px]">
        <div className="flex items-center gap-3 mb-5 flex-wrap"
             style={{ animation: anim ? 'ueFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: show ? undefined : 0 }}>
          <span className="text-[11px] font-bold uppercase tracking-[0.4em]" style={{ color: AC, ...F }}>Unit economics</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: '#f59e0b10' }}>
            <div className="w-1 h-1 rounded-full bg-[#f59e0b]" />
            <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#b47500]" style={F}>Modellert før ekstern lansering</span>
          </span>
        </div>
        <h2 className="tracking-[-0.04em] leading-[1.0]"
            style={{ ...FH, fontWeight: 700, color: INK, fontSize: 'clamp(26px, 3.2vw, 46px)', animation: anim ? 'ueHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: show ? undefined : 0 }}>
          Økonomien i <span style={{ color: AC }}>forvaltningen</span>.
        </h2>
        <span className="block mt-6 h-px rounded-full" style={{ width: 60, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left', animation: anim ? 'ueRule 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }} />
        <p className="text-[13px] sm:text-[14.5px] leading-[1.6] mt-6 max-w-[780px] font-normal"
           style={{ ...F, color: SUB, animation: anim ? 'ueFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.6s both' : undefined, opacity: show ? undefined : 0 }}>
          Bygget nedenfra på Bergen-porteføljens 40 enheter: hva én forvaltet enhet tjener, koster å betjene og koster å anskaffe — og hva det gir. Franchise skalerer den samme økonomien kapital-lett.
        </p>
      </div>

      {/* MAIN — bottom-up enhetsøkonomi (venstre) + avledet resultat (høyre) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 lg:gap-7 items-stretch">

        {/* ── VENSTRE: per forvaltet enhet (lys, detaljert ledger) ── */}
        <div className="relative rounded-[28px] p-7 sm:p-9 flex flex-col overflow-hidden"
             style={{ background: '#fff', boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 30px 70px -30px rgba(20,15,10,0.22)',
                      animation: anim ? 'ueCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: show ? undefined : 0 }}>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${AC}40, transparent)` }} />
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ ...F, color: AC }}>Per forvaltet enhet</span>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full" style={{ ...F, color: SUB, background: 'rgba(20,15,10,0.04)' }}>Egen drift · langtid</span>
          </div>
          <h3 className="text-[18px] sm:text-[21px] tracking-[-0.02em] mb-6" style={{ ...FH, fontWeight: 700, color: INK }}>Slik tjener én enhet penger</h3>

          {/* MÅNEDLIG: inntekt → dekningsbidrag */}
          <div className="space-y-3">
            {revRows.map((r, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <span className="text-[13px]" style={{ ...F, color: INK2 }}>{r.label} <span className="text-[11px]" style={{ color: MUT }}>· {r.sub}</span></span>
                <span className="text-[13.5px] font-semibold tabular-nums shrink-0" style={{ ...F, color: INK }}>+{r.value} kr</span>
              </div>
            ))}
            {/* brutto-bar */}
            <div className="pt-1">
              <div className="h-3 w-full rounded-full overflow-hidden flex" style={{ background: 'rgba(20,15,10,0.05)' }}>
                <div style={{ width: '87%', background: AC }} />
                <div style={{ width: '13%', background: `${AC}5e` }} />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ ...F, color: MUT }}>Brutto inntekt</span>
                <span className="text-[13.5px] font-bold tabular-nums" style={{ ...F, color: INK }}>{N.brutto} kr/mnd</span>
              </div>
            </div>
            {/* kostnad */}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <span className="text-[13px]" style={{ ...F, color: INK2 }}>− Kostnad å betjene <span className="text-[11px]" style={{ color: MUT }}>· tilsyn ~0,5 t + systemdrift</span></span>
              <span className="text-[13.5px] font-semibold tabular-nums shrink-0" style={{ ...F, color: SUB }}>−{N.drift} kr</span>
            </div>
          </div>

          {/* DEKNINGSBIDRAG — uthevet kulminasjon */}
          <div className="mt-5 rounded-2xl px-5 py-4 relative overflow-hidden" style={{ background: `${AC}0d` }}>
            <div aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1" style={{ background: AC }} />
            <div className="h-2 w-full rounded-full overflow-hidden mb-3" style={{ background: 'rgba(20,15,10,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: '87%', background: `linear-gradient(90deg, ${AC}, ${AC}cc)`, boxShadow: `0 0 18px ${AC}66` }} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-bold tracking-[-0.01em]" style={{ ...FH, color: INK }}>Dekningsbidrag</span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-bold tabular-nums tracking-[-0.02em]" style={{ ...FH, color: AC }}>{N.db}</span>
                <span className="text-[12px] font-semibold" style={{ ...F, color: SUB }}>kr/mnd · ~87 %</span>
              </span>
            </div>
          </div>

          <div className="my-6 h-px" style={{ background: HAIR }} />

          {/* ANSKAFFELSE (CAC) */}
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ ...F, color: AC }}>Anskaffelse · engangs</span>
              <span className="text-[13.5px] font-bold tabular-nums" style={{ ...F, color: INK }}>CAC ~{N.cac} kr</span>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden flex" style={{ background: 'rgba(20,15,10,0.05)' }}>
              <div style={{ width: '46.7%', background: '#c9a3e8' }} />
              <div style={{ width: '53.3%', background: AC }} />
            </div>
            <div className="flex items-center justify-between mt-2.5 text-[11.5px]" style={{ ...F, color: SUB }}>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#c9a3e8' }} />Marked (SoMe) <span className="font-bold tabular-nums" style={{ color: INK }}>{N.marked}</span></span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: AC }} />Onboarding ~6 t <span className="font-bold tabular-nums" style={{ color: INK }}>{N.onboard}</span></span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3.5">
              {onboard.map((o) => (
                <span key={o} className="text-[10.5px] font-medium rounded-full px-2.5 py-1" style={{ ...F, color: SUB, background: 'rgba(20,15,10,0.04)' }}>{o}</span>
              ))}
            </div>
            <p className="flex items-start gap-2 text-[12px] leading-[1.45] mt-4" style={{ ...F, color: SUB }}>
              <Check className="w-[15px] h-[15px] mt-px shrink-0" style={{ color: AC }} strokeWidth={2.6} />
              <span>Første utleiemegling-gebyr <span className="tabular-nums">(~{N.placement} kr)</span> dekker hele onboarding-arbeidet — <span className="font-semibold" style={{ color: INK }}>kontant-positiv ved signering.</span></span>
            </p>
          </div>
        </div>

        {/* ── HØYRE: resultatet (mørkt anker) ── */}
        <article className="relative rounded-[28px] p-7 sm:p-9 overflow-hidden flex flex-col"
                 style={{ background: 'linear-gradient(165deg, #15151b 0%, #0a0a0d 100%)', border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow: '0 2px 4px rgba(20,15,10,0.06), 0 30px 70px -30px rgba(20,15,10,0.45)',
                          animation: anim ? 'ueCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.7s both' : undefined, opacity: show ? undefined : 0 }}>
          <div aria-hidden="true" className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(195,156,224,0.18) 0%, transparent 65%)' }} />
          <div className="relative flex flex-col h-full">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ ...F, color: P }}>Resultatet</span>
            <h3 className="text-[18px] sm:text-[20px] text-white tracking-[-0.02em] mt-1.5 mb-3" style={{ ...FH, fontWeight: 700 }}>Bygget nedenfra — ikke påstått</h3>

            {/* 2×2 med kryss-hårlinjer */}
            <div className="grid grid-cols-2 flex-1">
              {stats.map((s, i) => (
                <div key={s.k}
                     className={`flex flex-col justify-center ${i % 2 === 0 ? 'pr-6' : 'pl-6'} ${i < 2 ? 'pb-6' : 'pt-6'}`}
                     style={{ borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <div className="flex items-baseline gap-1">
                    <span className="tabular-nums leading-none" style={{ ...FH, fontWeight: 700, color: '#fff', fontSize: 'clamp(28px, 2.9vw, 38px)' }}>{s.v}</span>
                    <span className="text-[13px] font-medium" style={{ ...F, color: 'rgba(255,255,255,0.5)' }}>{s.u}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-white mt-1.5" style={F}>{s.k}</p>
                  <p className="text-[10.5px] leading-[1.4] mt-0.5" style={{ ...F, color: 'rgba(255,255,255,0.42)' }}>{s.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2.5" style={{ background: 'rgba(195,156,224,0.12)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: P }} />
                <span className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ ...F, color: P }}>Per moden franchise · kapital-lett</span>
              </span>
              <p className="text-[12px] leading-[1.55]" style={{ ...F, color: 'rgba(255,255,255,0.7)' }}>
                ~300 enheter · <span className="font-bold text-white">~0,7 MNOK recurring ARR/år</span> · etablering ~200k · <span className="text-white">operatøren tar driften</span>.
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* Bottom ribbon */}
      <div className="mt-5 sm:mt-6 flex items-center justify-center gap-3 flex-wrap"
           style={{ animation: active ? 'ueFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.2s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px bg-[#e0ddd8] origin-right" style={{ width: '54px', animation: active ? 'ueRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.35s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em] text-center max-w-[840px]">
          <span className="font-semibold" style={{ color: P }}>Merk:</span> tallene er modellerte estimater før ekstern lansering, basert på nordiske SaaS-benchmarks, egen driftserfaring og 40 boliger i DigiHome AS-porteføljen.
        </p>
        <div className="h-px bg-[#e0ddd8] origin-left" style={{ width: '54px', animation: active ? 'ueRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.35s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE 17 — SBudgetRunway · Proptonomy-style ═══ */
const SBudgetRunway = (p: any) => {
  const active = p.isActive;
  const kpis = [
    { num: '01', big: '3', unit: 'MNOK', title: 'Kapitalbehov', lead: 'Pre-seed emisjon for å systematisere Bergen-prototypen, rekruttere de første franchisetakerne og validere franchise-modellen.', note: '22 MNOK pre-money / 25 MNOK post-money' },
    { num: '02', big: '16', unit: 'mnd', title: 'Runway', lead: 'Gir tid til kommersiell lansering, salg, kundelæring og forberedelse til seed-runde uten å måtte hente kapital midt i prosessen.', note: 'Q4 2026 → Q1 2028' },
    { num: '03', big: '~180', unit: 'k/mnd', title: 'Månedlig burn', lead: 'Dekker to fulltidsgründere, markedsføring, infrastruktur, juridisk arbeid og nødvendig buffer.', note: 'Inkl. sosiale kostnader' },
  ];
  const budget = [
    { label: 'Fulltidseksekvering · team', sub: 'Sarah og Martin på heltid i 16 mnd — gjør Bergen-prototypen franchise-klar.', amount: '2 050 000', pct: 68, founders: true },
    { label: 'Markedsføring og franchise-rekruttering',  sub: 'Merkevarebygging, content, partnerarbeid og rekruttering av de første franchisetakerne.', amount: '450 000', pct: 15 },
    { label: 'Produkt og infrastruktur', sub: 'OpenAI, Channex, regnskapssystemer, hosting og nødvendige integrasjoner.', amount: '240 000', pct: 8 },
    { label: 'Juridisk og regnskap',  sub: 'GDPR, vilkår, selskapsstruktur, kundeavtaler og løpende regnskap.', amount: '120 000', pct: 4 },
    { label: 'Buffer',                sub: 'Uforutsette kostnader og investorvennlig margin.', amount: '140 000', pct: 5 },
  ];
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes brFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes brHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes brCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes brRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 24%" opacity={0.4} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-5 sm:mb-6 max-w-[1100px]">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-4"
           style={{ color: P, animation: active ? 'brFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Budsjett & runway
        </p>
        <h2 className="font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.06]"
            style={{ ...F, fontSize: 'clamp(24px, 2.9vw, 40px)', animation: active ? 'brHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block">3 MNOK gir 16 måneder.</span>{' '}
          <span className="md:block">Kapitalen går til <span style={{ color: P }}>kommersiell validering</span>.</span>
        </h2>
        <p className="text-[12.5px] sm:text-[13px] text-[#3a3530] leading-[1.6] mt-3 max-w-[880px] font-light"
           style={{ ...F, animation: active ? 'brFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: active ? undefined : 0 }}>
          Produktet er allerede bygget. Denne runden finansierer fulltid på gründerteamet, systematisering av driften og rekruttering av de første franchisetakerne — med nok runway til neste investorpakke.
        </p>
      </div>

      {/* Top row — 3 KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 sm:mb-5">
        {kpis.map((k, i) => (
          <article key={i} className="bg-white rounded-[18px] p-5 flex flex-col"
                   style={{
                     border: '1px solid #ece8e1',
                     boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 10px 32px rgba(20,15,10,0.05)',
                     animation: active ? `brCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.1}s both` : undefined,
                     opacity: active ? undefined : 0,
                   }}>
            <p className="text-[8.5px] font-bold tabular-nums tracking-[0.22em] text-[#b5aa98] mb-3" style={F}>{k.num}</p>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="font-bold text-[#0c0c0c] tracking-[-0.04em] leading-none tabular-nums" style={{ ...F, fontSize: 'clamp(36px, 3.6vw, 50px)' }}>{k.big}</span>
              <span className="text-[14px] sm:text-[16px] font-medium text-[#8a8478]">{k.unit}</span>
            </div>
            <p className="text-[13px] font-bold text-[#0c0c0c] tracking-[-0.005em] mb-2" style={F}>{k.title}</p>
            <p className="text-[10.5px] text-[#6e6a62] leading-[1.55] font-light flex-1">{k.lead}</p>
            <p className="text-[9.5px] text-[#b5aa98] mt-3 tracking-[-0.002em]">{k.note}</p>
          </article>
        ))}
      </div>

      {/* Budget breakdown — full-width matched to KPI grid */}
      <article className="rounded-[18px] bg-white p-7 sm:p-8 w-full"
               style={{
                 border: '1px solid #ece8e1',
                 boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 14px 40px rgba(20,15,10,0.06)',
                 animation: active ? 'brCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.85s both' : undefined,
                 opacity: active ? undefined : 0,
               }}>
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-[9.5px] font-bold tracking-[0.22em] mb-1.5" style={{ ...F, color: P }}>FORDELING AV 3 MNOK</p>
            <h3 className="text-[16px] font-bold text-[#0c0c0c] tracking-[-0.018em]" style={F}>Hvor pengene går</h3>
          </div>
          <p className="text-[10.5px] text-[#8a8478] font-light">Produktet er ferdig bygget — kapitalen finansierer markedet.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3.5">
          {budget.map((b, k) => (
            <div key={k} className={b.founders ? 'md:col-span-2' : ''}>
              <div className="flex items-start justify-between mb-1.5 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-[#0c0c0c] tracking-[-0.003em]" style={F}>{b.label}</p>
                  <p className="text-[10.5px] text-[#8a8478] mt-0.5 font-light">{b.sub}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-[#0c0c0c] tabular-nums" style={F}>{b.amount} kr</p>
                  <p className="text-[10px] text-[#b5aa98] tabular-nums">{b.pct} %</p>
                </div>
              </div>
              <div className="h-[4px] rounded-full overflow-hidden" style={{ backgroundColor: '#f0ede8' }}>
                <div className="h-full rounded-full origin-left" style={{
                  background: k === 0 ? `linear-gradient(90deg, ${P}, #9333ea)` : '#a8a094',
                  width: `${b.pct}%`,
                  transform: active ? 'scaleX(1)' : 'scaleX(0)',
                  transition: `transform 1s cubic-bezier(0.22,1,0.36,1) ${1.0 + k * 0.08}s`,
                }} />
              </div>
              {b.founders && (
                <ul className="mt-2.5 space-y-1.5">
                  <li className="flex items-center gap-2 text-[11.5px] text-[#3a3530] font-light">
                    <span className="w-[3px] h-[3px] rounded-full shrink-0" style={{ backgroundColor: P }} />
                    <span>Sarah Sleeman, CEO — <span className="font-semibold text-[#0c0c0c] tabular-nums">600 000 kr/år</span></span>
                  </li>
                  <li className="flex items-center gap-2 text-[11.5px] text-[#3a3530] font-light">
                    <span className="w-[3px] h-[3px] rounded-full shrink-0" style={{ backgroundColor: P }} />
                    <span>Martin Kviteberg, Produktsjef — <span className="font-semibold text-[#0c0c0c] tabular-nums">600 000 kr/år</span></span>
                  </li>
                </ul>
              )}
            </div>
          ))}
        </div>
      </article>

      {/* Bottom ribbon */}
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap"
           style={{ animation: active ? 'brFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.25s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px bg-[#d8d2c5] origin-right" style={{ width: '54px', animation: active ? 'brRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.4s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em] text-center">
          <span className="font-semibold" style={{ color: P }}>Kjernen:</span> kapitalen brukes ikke til å finne ut om produktet kan bygges — den brukes til å bevise at franchise-modellen skalerer.
        </p>
        <div className="h-px bg-[#d8d2c5] origin-left" style={{ width: '54px', animation: active ? 'brRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.4s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ TRACTION — Bergen traction, pipeline, DigiSale ecosystem ═══ */
/* ═══ SLIDE 12 — STraction · Proptonomy-style ═══ */
const STraction = (p: any) => {
  const active = p.isActive;
  const kpis = [
    { num: '01', big: '40', unit: 'boliger', title: 'Intern drift (product-proof)', lead: 'DigiHome AS forvalter 40 egne boliger på plattformen — 24/7 bruksscenario og feedback-loop.', note: '2026 · under egen forvaltning', tag: 'INTERN' },
    { num: '02', big: '98', unit: '%', title: 'Interne brukere fornøyde', lead: 'Tilfredshet blant eiere i intern portefølje — målt hver uke i portalen.', note: 'Intern måling · 2025–26', tag: 'INTERN' },
    { num: '03', big: '0', unit: 'ekst.', title: 'Eksterne betalende kunder', lead: 'Ingen eksterne SaaS-kunder p.t. Ærlig status — lansering planlagt Q3 2026 med 130+ i pipeline.', note: 'Bridge-kapital kjøper market-proof', tag: 'EKSTERN' },
    { num: '04', big: 'Q3', unit: '2026', title: 'Ekstern SaaS-lansering', lead: 'Første 10 betalende kunder (blanding av Pro fra 1 990 kr og Enterprise fra 9 900 kr/mnd) · target ~500k ARR innen Q4 2026.', note: 'Bridge-milepæl #1', tag: 'PLAN' },
  ];
  const milestones = [
    { date: 'Okt 2024', title: 'DigiHome Tech AS etablert',     desc: 'Sarah + Martin + Erik etablerer selskapsstruktur og bridge-ramme.' },
    { date: 'Des 2024', title: 'DigiHome AS · 5 boliger',         desc: 'Eiendomsselskapet starter med 5 boliger — utvikling av Tech-systemet pågår parallelt.' },
    { date: 'Apr 2025', title: 'Tech-produkt MVP',               desc: 'Første interne bruker — 100 % in-house bygget med AI-first stack.' },
    { date: 'Des 2025', title: '40 boliger · DN Aspiring',       desc: 'Sarah kåret blant DN Aspirings · DigiHome AS-portefølje vokst til 40 · 130+ leads i pipeline.' },
    { date: 'Jun 2026', title: 'Intern produktlansering',        desc: 'Hele DigiHome AS-driften flyttes til Tech-plattformen — produkt-bevis.', future: true },
    { date: 'Q3 2026',  title: 'Ekstern SaaS-lansering',         desc: 'Første eksterne betalende kunder · market-proof starter.', future: true },
    { date: 'Q1 2027',  title: 'Nordisk ekspansjon',             desc: 'Pilotlansering Sverige/Danmark · samme KYC-stack.', future: true },
  ];

  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes trFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes trHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes trCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes trRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes trDot { from { transform: scale(0); } to { transform: scale(1); } }
    `}</style>

    <DotGrid maskCenter="50% 26%" opacity={0.45} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-4"
           style={{ color: P, ...F, animation: active ? 'trFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Traksjon · Intern bevis → Ekstern lansering
        </p>
        <h2 className="text-[26px] sm:text-[34px] lg:text-[42px] font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.08] max-w-[1100px]"
            style={{ ...F, animation: active ? 'trHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block">Product-proof internt.</span>{' '}
          <span className="md:block"><span style={{ color: P }}>Market-proof</span> kjøpes med bridge-kapitalen.</span>
        </h2>
        <p className="text-[12.5px] sm:text-[14px] text-[#3a3530] leading-[1.55] font-light tracking-[-0.003em] max-w-[860px] mt-4"
           style={{ ...F, animation: active ? 'trFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="font-semibold text-[#0c0c0c]">0 eksterne betalende kunder p.t.</span> 40 boliger driftet i 18 måneder — produktet er ferdig. Bridge-kapitalen kjøper de første eksterne referansekundene før seed-runden (~Q1 2028).
        </p>
      </div>

      {/* 4 KPI cards — intern vs. ekstern */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-5 sm:mb-6">
        {kpis.map((k, i) => (
          <article key={i} className="bg-white rounded-[18px] p-5 sm:p-6 flex flex-col"
                   style={{
                     border: '1px solid #ece8e1',
                     boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 10px 32px rgba(20,15,10,0.05)',
                     animation: active ? `trCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.1}s both` : undefined,
                     opacity: active ? undefined : 0,
                   }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[8.5px] font-bold tabular-nums tracking-[0.22em] text-[#b5aa98]" style={F}>{k.num}</p>
              {k.tag && (
                <span className="text-[8px] font-bold uppercase tracking-[0.18em] px-2 py-[2px] rounded-full"
                      style={{
                        color: k.tag === 'INTERN' ? '#6e6a62' : k.tag === 'EKSTERN' ? P : '#8a8478',
                        backgroundColor: k.tag === 'INTERN' ? '#eeebe3' : k.tag === 'EKSTERN' ? `${P}12` : '#f4f1ea',
                        border: k.tag === 'INTERN' ? '1px solid #e2ded5' : k.tag === 'EKSTERN' ? `1px solid ${P}30` : '1px solid #e2ded5',
                      }}>{k.tag}</span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-2.5">
              <span className="text-[36px] sm:text-[42px] font-bold text-[#0c0c0c] tracking-[-0.04em] leading-none tabular-nums" style={F}>{k.big}</span>
              <span className="text-[15px] sm:text-[17px] font-medium text-[#8a8478]" style={F}>{k.unit}</span>
            </div>
            <p className="text-[12.5px] font-semibold text-[#0c0c0c] tracking-[-0.003em]" style={F}>{k.title}</p>
            <p className="text-[10.5px] text-[#6e6a62] mt-1.5 leading-[1.5] font-light flex-1" style={F}>{k.lead}</p>
            <p className="text-[9.5px] text-[#b5aa98] mt-3 tracking-[-0.002em]" style={F}>{k.note}</p>
          </article>
        ))}
      </div>

      {/* Flagship + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 lg:gap-7">
        {/* LEFT — Flagship story + pipeline */}
        <article className="rounded-[22px] p-7 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8"
                 style={{
                   background: 'linear-gradient(165deg, #fafaf7 0%, #f2efe9 100%)',
                   border: '1px solid #ece8e1',
                   boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 20px 60px rgba(20,15,10,0.08)',
                   animation: active ? 'trCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.9s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          {/* Flagship */}
          <div className="flex-1">
            <p className="text-[9.5px] font-bold tracking-[0.22em] mb-1.5" style={{ ...F, color: P }}>FLAGGSKIPKUNDE (INTERN)</p>
            <h3 className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.02em] mb-2" style={F}>DigiHome AS</h3>
            <p className="text-[11.5px] text-[#6e6a62] leading-[1.55] font-light mb-4" style={F}>Vårt eget forvaltningsselskap — første og eneste bruker av plattformen p.t. Tester produktet ende-til-ende 24/7. "Eating our own dog food" — Airbnb/Stripe-playbook.</p>
            <div className="space-y-2.5">
              {[
                { label: 'Eiendommer i drift',         val: '40' },
                { label: 'Månedlig forvaltet leie',    val: '~480k kr' },
                { label: 'Automatiseringsgrad',        val: '87%' },
                { label: 'Intern SaaS-kontrakt (juli 2026)', val: '~10k MRR' },
              ].map((s, k) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-[#e2ded5] last:border-0">
                  <span className="text-[11.5px] text-[#6e6a62] font-light" style={F}>{s.label}</span>
                  <span className="text-[13px] font-bold text-[#0c0c0c] tabular-nums" style={F}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div className="lg:w-[240px] lg:shrink-0 lg:pl-8 lg:border-l border-[#e2ded5]">
            <p className="text-[9.5px] font-bold tracking-[0.22em] mb-1.5" style={{ ...F, color: P }}>EKSTERN PIPELINE</p>
            <h3 className="text-[17px] font-bold text-[#0c0c0c] tracking-[-0.018em] mb-3" style={F}>Ventet Q3 2026</h3>
            <div className="space-y-2.5 mb-4">
              {[
                { seg: 'Private utleiere',    n: '120+' },
                { seg: 'Forvaltere',          n: '8' },
                { seg: 'Eiendomsselskaper',   n: '3' },
                { seg: 'Megler-partnere',     n: '5' },
              ].map((p, k) => (
                <div key={k} className="flex items-center justify-between">
                  <p className="text-[11.5px] text-[#6e6a62] font-light" style={F}>{p.seg}</p>
                  <span className="text-[16px] font-bold tabular-nums" style={{ ...F, color: P }}>{p.n}</span>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-[#8a8478] font-light leading-[1.5] pt-3 border-t border-[#e2ded5]" style={F}>130+ eiendommer i varm pipeline — ikke signerte, men verifiserte interessenter. Mål: 10 betalende Q3 2026.</p>
          </div>
        </article>

        {/* RIGHT — Milestones timeline (editorial light) */}
        <article className="rounded-[22px] p-7 sm:p-8 bg-white"
                 style={{
                   border: '1px solid #ece8e1',
                   boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 14px 40px rgba(20,15,10,0.06)',
                   animation: active ? 'trCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 1.0s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          <p className="text-[9.5px] font-bold tracking-[0.22em] mb-1.5" style={{ ...F, color: P }}>REISE + ROADMAP</p>
          <h3 className="text-[17px] font-bold text-[#0c0c0c] tracking-[-0.018em] mb-5" style={F}>Fra intern bevis til Nordic SaaS</h3>

          <div className="relative">
            <div className="absolute left-[5px] top-1 bottom-1 w-[2px] bg-[#e6e2d9]" />
            {milestones.map((m, i) => (
              <div key={i} className="relative flex gap-3.5 mb-3.5 last:mb-0">
                <div className="w-3 h-3 rounded-full shrink-0 mt-0.5 relative z-10"
                     style={{
                       backgroundColor: m.future ? '#fafaf7' : P,
                       border: m.future ? `1.5px dashed ${P}` : 'none',
                       boxShadow: m.future ? 'none' : `0 0 0 3px ${P}18`,
                       animation: active ? `trDot 0.4s cubic-bezier(0.22,1,0.36,1) ${1.15 + i * 0.1}s both` : undefined,
                       transform: active ? undefined : 'scale(0)',
                     }} />
                <div className="flex-1 pb-1">
                  <p className="text-[9px] font-bold tracking-[0.12em] text-[#b5aa98] uppercase tabular-nums">{m.date}</p>
                  <p className="text-[12.5px] font-bold text-[#0c0c0c] tracking-[-0.008em] mt-0.5" style={F}>{m.title}</p>
                  <p className="text-[10.5px] text-[#6e6a62] mt-1 leading-[1.5] font-light">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Bottom ribbon */}
      <div className="mt-8 sm:mt-10 flex items-center justify-center gap-3 flex-wrap"
           style={{ animation: active ? 'trFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.4s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px bg-[#e0ddd8] origin-right" style={{ width: '40px', animation: active ? 'trRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.55s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em]">
          Anerkjennelse: DN Aspiring Women · Guestyval 2025 Mexico · Make Data Smart 2025 · Building Innovation Bergen
        </p>
        <div className="h-px bg-[#e0ddd8] origin-left" style={{ width: '40px', animation: active ? 'trRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.55s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ COMPETITION — Why we win (2x2 matrix + moat) ═══ */
/* ═══ SLIDE 13 — SCompetition · Proptonomy-style ═══ */
const SCompetition = (p: any) => {
  const active = p.isActive;
  const moats = [
    {
      num: '01',
      stat: '6+',
      unit: 'år',
      kicker: 'forsprang på nordisk stack',
      title: 'Nordic-native fra dag én',
      lead: 'BankID/MitID/Freja, FINN.no, norske regnskaps-API-er, husleielov, KID-betaling — ferdig integrert. Internasjonale spillere (Guesty, AppFolio, Hostaway) må bygge Norden fra 0.',
      bullets: [
        'BankID + Lea Bank depositum · MitID/DK og Freja/SE klart i arkitekturen.',
        'Direkte FINN-API · Kartverket boligdata · Blocket (SE) som neste kanal.',
        'Husleieloven + NOU 2024:19 innebygget · lokalisering til nordisk = måneder, ikke år.',
      ],
    },
    {
      num: '02',
      stat: '100',
      unit: '%',
      kicker: 'av flyten er AI-drevet',
      title: 'AI-native arkitektur',
      lead: 'Ikke en gammel PMS med "AI-feature" på toppen. Hele driftsflyten er AI-agenter. Vanskelig å retrofitte for Guesty/AppFolio uten dyp ombygging.',
      bullets: [
        'AI-annonsering, AI-drift, AI-scoring, AI-rapporter — fra dag én.',
        'Konkurrenter har bolt-on AI · vi har bygget kjernen rundt LLM.',
        'Treningsdata fra egen portefølje på 40 boliger · 18 mnd i drift.',
      ],
    },
    {
      num: '03',
      stat: '2-i-1',
      unit: '',
      kicker: 'korttid + langtid i samme SaaS',
      title: 'Alene i krysningspunktet',
      lead: 'Guesty/Hostaway = korttid. AppFolio/Hemlane = langtid. Vi gjør begge. Dynamisk veksling basert på sesong, regulering og pris — så vidt vi kjenner til, få aktører som kombinerer dette i én SaaS.',
      bullets: [
        'Samme bolig, to inntektsstrømmer — ett dashboard.',
        'Dynamisk pris-motor optimaliserer per uke.',
        'Unik verdi: 2,7× høyere inntekt med korttid, sikkerhet med langtid.',
      ],
    },
  ];

  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes compFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes compHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes compCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes compRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes compDot { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
    `}</style>

    <DotGrid maskCenter="50% 26%" opacity={0.45} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-5"
           style={{ color: P, ...F, animation: active ? 'compFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Konkurranse & Moat
        </p>
        <h2 className="text-[26px] sm:text-[34px] lg:text-[42px] font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.06] max-w-[1100px]"
            style={{ ...F, animation: active ? 'compHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block">Guesty gjør korttid. AppFolio gjør langtid.</span>{' '}
          <span className="md:block">Vi er <span style={{ color: P }}>alene i krysningspunktet</span>.</span>
        </h2>
      </div>

      {/* 2-col layout: Matrix + moat pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-5 lg:gap-7">
        {/* LEFT — Editorial competitive matrix */}
        <article className="rounded-[22px] p-7 sm:p-8 relative overflow-hidden flex flex-col"
                 style={{
                   background: 'linear-gradient(165deg, #fafaf7 0%, #f2efe9 100%)',
                   border: '1px solid #ece8e1',
                   boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 20px 60px rgba(20,15,10,0.08)',
                   animation: active ? 'compCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          <div className="flex items-baseline justify-between mb-5">
            <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#b5aa98]" style={F}>MARKEDSKART · DYBDE × BREDDE</p>
          </div>

          {/* Matrix */}
          <div className="relative flex-1 rounded-[16px] bg-white overflow-hidden min-h-[340px]"
               style={{ border: '1px solid #e2ded5' }}>
            {/* Axis labels */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98]" style={F}>AI-NATIVE</div>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98]" style={F}>MANUELL</div>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98] origin-center whitespace-nowrap" style={F}>SMAL</div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b5aa98] origin-center whitespace-nowrap" style={F}>BRED</div>

            {/* Grid lines */}
            <div className="absolute left-1/2 top-7 bottom-7 w-px" style={{ backgroundColor: '#eae6dd' }} />
            <div className="absolute top-1/2 left-7 right-7 h-px" style={{ backgroundColor: '#eae6dd' }} />

            {/* Winner zone indicator */}
            <div className="absolute top-[8%] right-[7%] text-[8.5px] font-bold tracking-[0.18em]" style={{ ...F, color: `${P}60` }}>VINNER-SONE</div>

            {/* Competitors */}
            {[
              { name: 'Hybel',      x: 18, y: 72, size: 32 },
              { name: 'Husleie',    x: 28, y: 78, size: 32 },
              { name: 'FINN',       x: 12, y: 60, size: 28 },
              { name: 'Hemlane',    x: 34, y: 52, size: 28 },
              { name: 'AppFolio',   x: 48, y: 42, size: 38 },
              { name: 'Lodgify',    x: 56, y: 32, size: 32 },
              { name: 'Hostaway',   x: 62, y: 26, size: 36 },
              { name: 'Guesty',     x: 70, y: 22, size: 40 },
              { name: 'Vacasa',     x: 52, y: 38, size: 30 },
              { name: 'DigiHome',   x: 82, y: 14, size: 58, us: true },
            ].map((c, i) => (
              <div key={i} className="absolute flex flex-col items-center"
                   style={{
                     left: `${c.x}%`,
                     top: `${c.y}%`,
                     transform: 'translate(-50%, -50%)',
                     animation: active ? `compDot 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.75 + i * 0.07}s both` : undefined,
                     opacity: active ? undefined : 0,
                   }}>
                <div className="rounded-full flex items-center justify-center"
                     style={{
                       width: `${c.size}px`,
                       height: `${c.size}px`,
                       backgroundColor: c.us ? P : '#e6e2d9',
                       border: c.us ? `2px solid ${P}` : '1.5px solid #c4b9a8',
                       boxShadow: c.us ? `0 0 0 6px ${P}1f, 0 10px 36px ${P}50` : 'none',
                     }}>
                  {c.us && <span className="text-[9.5px] font-bold text-white" style={F}>DH</span>}
                </div>
                <p className={`text-[9.5px] mt-1.5 whitespace-nowrap ${c.us ? 'font-bold' : 'font-medium'}`} style={{ color: c.us ? P : '#6e6a62' }}>{c.name}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4 text-[10px] text-[#8a8478] font-light">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P }} />
              <span className="font-semibold" style={{ color: '#0c0c0c' }}>DigiHome</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e6e2d9]" style={{ border: '1px solid #c4b9a8' }} />
              <span>Eksisterende konkurrenter</span>
            </div>
          </div>
        </article>

        {/* RIGHT — 3 moat pillars (stacked compact) */}
        <div className="flex flex-col gap-4">
          {moats.map((m, i) => (
            <article key={i} className="bg-white rounded-[18px] p-5 flex flex-col flex-1"
                     style={{
                       border: '1px solid #ece8e1',
                       boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 10px 28px rgba(20,15,10,0.05)',
                       animation: active ? `compCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.65 + i * 0.1}s both` : undefined,
                       opacity: active ? undefined : 0,
                     }}>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[8.5px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: P }}>MOAT {m.num}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.035em] leading-none tabular-nums" style={F}>{m.stat}</span>
                  {m.unit && <span className="text-[12px] font-medium text-[#8a8478]">{m.unit}</span>}
                </div>
              </div>
              <p className="text-[9.5px] text-[#7c7466] font-medium mb-2.5 tracking-[-0.002em]">{m.kicker}</p>
              <h3 className="text-[14.5px] font-bold text-[#0c0c0c] tracking-[-0.015em] mb-1.5" style={F}>{m.title}</h3>
              <p className="text-[11px] text-[#6e6a62] leading-[1.55] font-light">{m.lead}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Bottom ribbon */}
      <div className="mt-8 sm:mt-10 flex items-center justify-center gap-3 flex-wrap"
           style={{ animation: active ? 'compFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px bg-[#e0ddd8] origin-right" style={{ width: '54px', animation: active ? 'compRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em]">
          Tre lag av moat — <span className="font-semibold" style={{ color: P }}>compounds over tid</span>. Ingen enkelt-spiller kan ta igjen alt på samme tid.
        </p>
        <div className="h-px bg-[#e0ddd8] origin-left" style={{ width: '54px', animation: active ? 'compRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ THE ASK — 3 MNOK, 12%, milestones ═══ */
const SAsk = (p: any) => {
  const active = p.isActive;
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', ticket_size: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submitInterest = async (e: any) => {
    e.preventDefault();
    if (!formData.name || !formData.email) { setError('Navn og e-post er p\u00e5krevd'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${''}/api/investor/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Kunne ikke sende');
      }
      setSubmitted(true);
      setTimeout(() => { setShowForm(false); setSubmitted(false); setFormData({ name: '', email: '', phone: '', company: '', ticket_size: '', message: '' }); }, 2500);
    } catch (err: any) {
      setError(err.message || 'Noe gikk galt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes askFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes askHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes askCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes askPulse { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
    `}</style>

    <DotGrid maskCenter="50% 26%" opacity={0.4} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-5 sm:mb-6 max-w-[1100px]">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em] mb-4"
           style={{ color: P, ...F, animation: active ? 'askFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
          Emisjon · Pre-seed
        </p>
        <h2 className="font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.06]"
            style={{ ...F, fontSize: 'clamp(24px, 2.9vw, 40px)', animation: active ? 'askHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <span className="md:block">3 MNOK for <span style={{ color: P }}>12 % av DigiHome Tech AS</span>.</span>{' '}
          <span className="md:block">16 måneder til seed-runde.</span>
        </h2>
        <p className="text-[12.5px] sm:text-[13px] text-[#3a3530] leading-[1.6] mt-3 max-w-[880px] font-light"
           style={{ ...F, animation: active ? 'askFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: active ? undefined : 0 }}>
          DigiHome Tech AS henter 3 MNOK i ny egenkapital for å ta selskapet fra bevist Bergen-drift til et skalerbart franchise-nettverk.
        </p>
      </div>

      {/* 4 Terms cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { num: '01', val: '3',  unit: 'MNOK', label: 'Kapital',    sub: 'ny egenkapital' },
          { num: '02', val: '22', unit: 'MNOK', label: 'Pre-money',  sub: 'før emisjon' },
          { num: '03', val: '25', unit: 'MNOK', label: 'Post-money', sub: 'etter emisjon' },
          { num: '04', val: '12', unit: '%',    label: 'Eierandel',  sub: 'nye aksjer til investorer' },
        ].map((t, i) => (
          <article key={i} className="bg-white rounded-[16px] px-5 py-4 sm:px-5 sm:py-5 flex flex-col"
                   style={{
                     border: '1px solid #ece8e1',
                     boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 8px 28px rgba(20,15,10,0.04)',
                     animation: active ? `askCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.55 + i * 0.08}s both` : undefined,
                     opacity: active ? undefined : 0,
                   }}>
            <p className="text-[8.5px] font-bold tabular-nums tracking-[0.22em] text-[#b5aa98] mb-2" style={F}>{t.num}</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="font-bold text-[#0c0c0c] tracking-[-0.04em] leading-none tabular-nums" style={{ ...F, fontSize: 'clamp(32px, 3.2vw, 42px)' }}>{t.val}</span>
              <span className="text-[13px] sm:text-[15px] font-medium text-[#8a8478]">{t.unit}</span>
            </div>
            <p className="text-[11.5px] font-bold tracking-[-0.005em]" style={{ color: P }}>{t.label}</p>
            <p className="text-[10px] text-[#8a8478] mt-0.5 font-light">{t.sub}</p>
          </article>
        ))}
      </div>

      {/* Milestones + Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 lg:gap-6">
        {/* Milestones */}
        <article className="rounded-[20px] bg-white p-6 sm:p-7"
                 style={{
                   border: '1px solid #ece8e1',
                   boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 12px 36px rgba(20,15,10,0.05)',
                   animation: active ? 'askCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.9s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          <p className="text-[9.5px] font-bold tracking-[0.22em] mb-1.5" style={{ ...F, color: P }}>5 MILEPÆLER · 16 MÅNEDER</p>
          <h3 className="text-[16px] font-bold text-[#0c0c0c] tracking-[-0.018em] mb-4" style={F}>Hva emisjonen finansierer før seed</h3>
          <div className="space-y-0">
            {[
              { when: 'Mnd 1–6',   what: 'Bergen-prototypen systematisert',                                       desc: 'Driften pakket som en repeterbar franchise-oppskrift.' },
              { when: 'Mnd 4–10',  what: 'Første 2–3 franchisetakere signert',                                    desc: 'Lokale operatører i drift på DigiHome-plattformen.' },
              { when: 'Mnd 6–12',  what: 'Franchise-økonomi bevist',                                              desc: 'CAC payback < 6 mnd · bruttomargin 75 %+.' },
              { when: 'Mnd 8–14',  what: 'Skalerbar onboarding + nasjonal merkevare',                            desc: 'Opplæring, kvalitetsrekkverk og rekrutteringsmotor klar.' },
              { when: 'Mnd 12–16', what: 'Seed-klar prosess',                                                     desc: 'Mål om 50–80 MNOK pre-money.' },
            ].map((m, k) => (
              <div key={k} className="flex gap-4 py-2.5 border-b border-[#f0ede8] last:border-0">
                <div className="shrink-0 w-[78px]">
                  <p className="text-[9.5px] font-bold tabular-nums uppercase tracking-[0.12em]" style={{ ...F, color: P }}>{m.when}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-[#0c0c0c] tracking-[-0.003em] leading-[1.4]" style={F}>{m.what}</p>
                  <p className="text-[10.5px] text-[#6e6a62] mt-0.5 font-light leading-[1.45]">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Potential returns — purple-tinted light card */}
        <article className="rounded-[20px] p-6 sm:p-7 relative overflow-hidden"
                 style={{
                   background: `linear-gradient(165deg, ${P}10 0%, ${P}03 100%)`,
                   border: `1px solid ${P}30`,
                   boxShadow: `0 12px 36px ${P}10`,
                   animation: active ? 'askCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 1.0s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          <p className="text-[9.5px] font-bold tracking-[0.22em] mb-1.5" style={{ ...F, color: P }}>POTENSIELL OPPSIDE</p>
          <h3 className="text-[16px] font-bold text-[#0c0c0c] tracking-[-0.018em] mb-4" style={F}>Realistisk avkastning</h3>
          <div className="space-y-3.5">
            <div className="pb-3 border-b border-[#e2ded5]">
              <p className="text-[9.5px] text-[#6e6a62] mb-1 uppercase tracking-[0.12em] font-semibold">Ved seed-runde</p>
              <p className="text-[32px] font-bold text-[#0c0c0c] tracking-[-0.03em] leading-none tabular-nums" style={F}>2–3×</p>
              <p className="text-[10px] text-[#8a8478] mt-1 font-light">Basert på ny seed-runde på 50–80 MNOK pre-money.</p>
            </div>
            <div>
              <p className="text-[9.5px] text-[#6e6a62] mb-1 uppercase tracking-[0.12em] font-semibold">Ved exit / senere vekstrunde</p>
              <p className="text-[32px] font-bold text-[#0c0c0c] tracking-[-0.03em] leading-none tabular-nums" style={F}>5–15×</p>
              <p className="text-[10px] text-[#8a8478] mt-1 font-light">Basert på realistisk exit-range på 500 MNOK – 3 mrd.</p>
            </div>
          </div>
        </article>
      </div>

      {/* Bottom CTA */}
      <div className="mt-6 flex items-center justify-between flex-wrap gap-4 pt-5 border-t border-[#e2ded5]"
           style={{ animation: active ? 'askFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 1.2s both' : undefined, opacity: active ? undefined : 0 }}>
        <div>
          <p className="text-[9.5px] text-[#8a8478] uppercase tracking-[0.22em] mb-1.5 font-semibold">Kontakt</p>
          <div className="flex items-center gap-3 flex-wrap">
            <a href="mailto:sarah@digihome.no" className="text-[13px] text-[#0c0c0c] hover:opacity-70 transition-opacity font-medium">sarah@digihome.no</a>
            <span className="w-1 h-1 rounded-full bg-[#c4b9a8]" />
            <a href="mailto:martin@kviteberg.no" className="text-[13px] text-[#0c0c0c] hover:opacity-70 transition-opacity font-medium">martin@kviteberg.no</a>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full" style={{ backgroundColor: `${P}14`, border: `1px solid ${P}35` }}>
            <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: P, animation: 'askPulse 2s ease-in-out infinite' }} />
            <span className="text-[10.5px] font-semibold text-[#0c0c0c]">Runde åpen · target close Q3 2026</span>
          </div>
          <button
            data-testid="register-interest-btn"
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-full text-[12.5px] font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${P}, #9333ea)`, boxShadow: `0 4px 20px ${P}40` }}>
            Registrer interesse →
          </button>
        </div>
      </div>
    </div>

    {/* Interest form modal */}
    {showForm && (
      <div
        data-testid="investor-interest-modal"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={(e: any) => { if (e.target === e.currentTarget && !submitting) setShowForm(false); }}>
        <div className="w-full max-w-[520px] rounded-[24px] overflow-hidden"
          style={{ backgroundColor: '#0c0c0c', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 120px rgba(0,0,0,0.5)' }}>
          {submitted ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: `${P}20` }}>
                <svg className="w-7 h-7" style={{ color: P }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 className="text-[22px] font-bold text-white tracking-[-0.02em] mb-2" style={F}>Takk!</h3>
              <p className="text-[14px] text-white/60 leading-[1.7]">Vi tar kontakt innen 48 timer.</p>
            </div>
          ) : (
            <form onSubmit={submitInterest} className="p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] mb-1" style={{ color: P }}>REGISTRER INTERESSE</p>
                  <h3 className="text-[22px] font-bold text-white tracking-[-0.02em]" style={F}>Bli med tidlig</h3>
                </div>
                <button type="button" onClick={() => setShowForm(false)} disabled={submitting}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    data-testid="interest-name" required value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Navn *"
                    className="h-11 px-4 rounded-xl text-[13px] text-white placeholder:text-white/75 outline-none focus:border-white/25 transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <input
                    data-testid="interest-email" required type="email" value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="E-post *"
                    className="h-11 px-4 rounded-xl text-[13px] text-white placeholder:text-white/75 outline-none focus:border-white/25 transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    data-testid="interest-phone" value={formData.phone}
                    onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Telefon"
                    className="h-11 px-4 rounded-xl text-[13px] text-white placeholder:text-white/75 outline-none focus:border-white/25 transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <input
                    data-testid="interest-company" value={formData.company}
                    onChange={(e: any) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Selskap / fond"
                    className="h-11 px-4 rounded-xl text-[13px] text-white placeholder:text-white/75 outline-none focus:border-white/25 transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <select
                  data-testid="interest-ticket" value={formData.ticket_size}
                  onChange={(e: any) => setFormData({ ...formData, ticket_size: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl text-[13px] text-white outline-none focus:border-white/25 transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="" style={{ color: '#888' }}>Indikativ investering (valgfritt)</option>
                  <option value="100-250k">100–250 000 kr</option>
                  <option value="250-500k">250–500 000 kr</option>
                  <option value="500k-1m">500 000 – 1 MNOK</option>
                  <option value="1-3m">1–3 MNOK</option>
                  <option value="3m+">Mer enn 3 MNOK</option>
                  <option value="talk">Ønsker å diskutere</option>
                </select>
                <textarea
                  data-testid="interest-message" value={formData.message}
                  onChange={(e: any) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Kommentar (valgfritt)" rows={3}
                  className="w-full px-4 py-3 rounded-xl text-[13px] text-white placeholder:text-white/75 outline-none focus:border-white/25 transition-colors resize-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              {error && <p className="text-[12px] text-red-400 mt-3">{error}</p>}

              <button
                data-testid="submit-interest-btn"
                type="submit" disabled={submitting}
                className="w-full h-12 mt-5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${P}, #9333ea)` }}>
                {submitting ? 'Sender...' : 'Send interesse'}
              </button>
              <p className="text-[10px] text-white/60 text-center mt-3">Vi tar kontakt innen 48 timer. Info deles kun med Sarah og Martin.</p>
            </form>
          )}
        </div>
      </div>
    )}
  </SlideFrame>
  );
};

/* ═══ WHY NOW? — Market timing bridge ═══ */
/* ═══ SLIDE 8 — SWhyNow (Hvorfor akkurat nå?) · Proptonomy-style ═══ */
const SWhyNow = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  const AC = '#a052e0';      // lesbar merkevare-lilla på lys bakgrunn
  const INK = '#0c0c0c';
  const SUB = '#57514a';
  const MUT = '#8a8278';
  const HAIR = 'rgba(20,15,10,0.09)';

  const forces = [
    {
      num: '01',
      tag: 'Teknologi',
      title: 'AI er blitt praktisk nyttig',
      body: 'Språkmodeller kan nå håndtere henvendelser, dokumenter, oppfølging og avvik med høy nok kvalitet til å brukes i daglig drift — ikke bare som en ekstra funksjon.',
    },
    {
      num: '02',
      tag: 'Regulering',
      title: 'Reglene blir mer krevende',
      body: 'Utleie, skatt, depositum og kontrakter krever bedre dokumentasjon og mer presis oppfølging. Det gjør lokale, regeltilpassede systemer mer verdifulle.',
    },
    {
      num: '03',
      tag: 'Marked',
      title: 'Utleie profesjonaliseres',
      body: 'Stadig flere private huseiere vil sette bort driften til profesjonelle. Samtidig er forvaltningsbransjen fragmentert og umoden — et stort rom for én moderne, nasjonal aktør.',
    },
    {
      num: '04',
      tag: 'Generasjonsskifte',
      title: 'Nye eiere forventer mer',
      body: 'Yngre boligeiere arver, kjøper og forvalter eiendom digitalt. De forventer samme enkelhet i utleie som i bank, regnskap og netthandel.',
    },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes wnFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes wnHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes wnGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes wnRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 12%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 22%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 sm:px-12 my-auto">

      {/* ═══ HEADER — editorial ═══ */}
      <div className="max-w-[940px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]"
              style={{ ...F, color: AC, animation: anim ? 'wnFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
          Hvorfor nå
        </span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-6"
            style={{ ...FH, fontWeight: 700, fontSize: 'clamp(30px, 3.9vw, 52px)', color: INK,
                     animation: anim ? 'wnHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Utleiemarkedet endrer seg raskere<br className="hidden md:block" /> enn verktøyene <span style={{ color: AC }}>som skal håndtere det.</span>
        </h2>
        <span className="block mt-7 h-px rounded-full"
              style={{ width: 64, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left',
                       animation: anim ? 'wnGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: show ? undefined : 0 }} />
        <p className="text-[15px] sm:text-[16.5px] font-normal leading-[1.6] mt-7 max-w-[680px]"
           style={{ ...F, color: SUB, animation: anim ? 'wnFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.65s both' : undefined, opacity: show ? undefined : 0 }}>
          AI, regulering og nye leievaner treffer markedet samtidig. Det skaper et kort vindu for en ny standard.
        </p>
      </div>

      {/* ═══ 4 drivkrefter — hårlinje-separerte kolonner, INGEN bokser ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-10 sm:mt-12">
        {forces.map((f, i) => (
          <div key={f.num} className="relative lg:px-7 first:lg:pl-0 last:lg:pr-0 py-6 lg:py-0"
               style={{ animation: anim ? `wnFade 0.8s cubic-bezier(0.22,1,0.36,1) ${0.75 + i * 0.11}s both` : undefined, opacity: show ? undefined : 0 }}>
            {/* vertikal hårlinje mellom kolonner (desktop) */}
            {i > 0 && <span aria-hidden="true" className="hidden lg:block absolute left-0 top-1 bottom-1 w-px" style={{ background: HAIR, transformOrigin: 'top',
                        animation: anim ? `wnRise 0.7s cubic-bezier(0.22,1,0.36,1) ${0.8 + i * 0.11}s both` : undefined }} />}
            {/* horisontal hårlinje (mobil/tablet) */}
            {i > 0 && <span aria-hidden="true" className="lg:hidden absolute left-0 right-0 top-0 h-px" style={{ background: HAIR }} />}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-[11px] font-bold tabular-nums tracking-[0.2em]" style={{ ...F, color: AC }}>{f.num}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ ...F, color: MUT }}>{f.tag}</span>
              <span className="h-px flex-1" style={{ background: HAIR }} />
            </div>
            <h3 className="text-[18.5px] sm:text-[20px] tracking-[-0.02em] leading-[1.16] mb-3" style={{ ...FH, fontWeight: 700, color: INK }}>{f.title}</h3>
            <p className="text-[12.5px] sm:text-[13px] font-normal leading-[1.6] max-w-[260px]" style={{ ...F, color: SUB }}>{f.body}</p>
          </div>
        ))}
      </div>

      {/* ═══ TIMING — kantløs redaksjonell koda (ingen ramme) ═══ */}
      <div className="mt-10 sm:mt-12 pt-9 flex flex-col items-center text-center gap-4"
           style={{ borderTop: `1px solid ${HAIR}`, animation: anim ? 'wnFade 0.9s cubic-bezier(0.22,1,0.36,1) 1.2s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC }}>Timing</span>
        <p className="tracking-[-0.018em] leading-[1.3] max-w-[860px]" style={{ ...FH, fontWeight: 600, fontSize: 'clamp(19px, 2.1vw, 27px)', color: INK }}>
          Markedet trenger ikke enda et skjema eller en portal. Det trenger <span style={{ color: AC }}>et system som tar arbeidet.</span>
        </p>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE 20 — SAppendix (Selskapsstruktur) · Proptonomy-style ═══ */
const SAppendix = (p: any) => {
  const active = p.isActive;
  const facts = [
    { num: '01', tag: 'FOKUS', title: 'Investor får Tech AS', desc: 'Emisjonen gjelder 100% DigiHome Tech AS. Ingen andre selskaper i cap-tablen — full klarhet for investor.' },
    { num: '02', tag: 'IP-EIERSKAP', title: 'All IP i Tech AS', desc: 'Kildekode, AI-modeller og produktspesifikke rettigheter eies direkte av DigiHome Tech AS.' },
    { num: '03', tag: 'AVTALE', title: 'DigiHome AS = ekte kunde', desc: 'DigiHome AS betaler markedspris til Tech AS for SaaS-tilgang — formalisering med advokat underveis.' },
  ];

  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes apFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes apHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes apCardIn { from { opacity: 0; transform: translateY(22px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes apRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <DotGrid maskCenter="50% 24%" opacity={0.4} />

    <div className="max-w-[1280px] mx-auto px-6 sm:px-12 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-6 sm:mb-8 flex items-start gap-5 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-5"
               style={{ animation: active ? 'apFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
            <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: P }}>Appendiks · Selskapsstruktur</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: '#f0ede8', border: '1px solid #e2ded5' }}>
              <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#6e6a62]">For investorer</span>
            </span>
          </div>
          <h2 className="text-[26px] sm:text-[34px] lg:text-[42px] font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.06] max-w-[1080px]"
              style={{ ...F, animation: active ? 'apHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}>
            <span className="md:block">Ren cap-table.</span>{' '}
            <span className="md:block">Du investerer i <span style={{ color: P }}>DigiHome Tech AS</span>.</span>
          </h2>
        </div>
      </div>

      {/* Diagram + Facts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5 lg:gap-7">
        {/* Diagram */}
        <article className="rounded-[22px] p-7 sm:p-8 relative"
                 style={{
                   background: 'linear-gradient(165deg, #fafaf7 0%, #f2efe9 100%)',
                   border: '1px solid #ece8e1',
                   boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 14px 40px rgba(20,15,10,0.06)',
                   animation: active ? 'apCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined,
                   opacity: active ? undefined : 0,
                 }}>
          <p className="text-[9.5px] font-bold tracking-[0.22em] mb-5" style={{ ...F, color: P }}>KONSERN-DIAGRAM</p>

          <div className="relative" style={{ height: '340px' }}>
            {/* Parent: DigiSale — dark editorial */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-[14px] px-6 py-4 text-center"
                 style={{
                   background: 'linear-gradient(165deg, #14141a 0%, #0a0a0d 100%)',
                   minWidth: '230px',
                   boxShadow: '0 10px 32px rgba(20,15,10,0.18), 0 0 0 1px rgba(255,255,255,0.06)',
                 }}>
              <p className="text-[9px] font-bold tracking-[0.22em] text-white/55" style={F}>KONSERN</p>
              <p className="text-[16px] font-bold text-white tracking-[-0.015em] mt-1" style={F}>DigiSale AS</p>
              <p className="text-[10.5px] text-white/55 mt-0.5 font-light">Teknologikonsern</p>
            </div>

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
              <line x1="50%" y1="70" x2="18%" y2="170" stroke="#c4b9a8" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="50%" y1="70" x2="50%" y2="150" stroke={P} strokeWidth="2.5" />
              <line x1="50%" y1="70" x2="82%" y2="170" stroke="#c4b9a8" strokeWidth="1.5" strokeDasharray="4 4" />
            </svg>

            {/* Left sister: DigiHome AS */}
            <div className="absolute top-[170px] left-0 rounded-[12px] px-4 py-3 text-center bg-white"
                 style={{
                   border: '1.5px solid #d8d2c5',
                   width: '31%',
                 }}>
              <p className="text-[8.5px] font-bold tracking-[0.22em] text-[#b5aa98]" style={F}>SØSTER</p>
              <p className="text-[13.5px] font-bold text-[#0c0c0c] tracking-[-0.012em] mt-0.5" style={F}>DigiHome AS</p>
              <p className="text-[9.5px] text-[#8a8478] mt-0.5 font-light">Operasjonelt forvaltningsselskap</p>
              <div className="mt-2.5 pt-2 border-t border-[#eae7e2]">
                <p className="text-[9px] text-[#b5aa98] font-light leading-[1.4]">Flaggskipkunde av Tech-produktet</p>
              </div>
            </div>

            {/* Center featured: DigiHome Tech AS */}
            <div className="absolute top-[140px] left-1/2 -translate-x-1/2 rounded-[14px] px-5 py-4 text-center"
                 style={{
                   background: `linear-gradient(135deg, ${P}, #9333ea)`,
                   minWidth: '220px',
                   boxShadow: `0 16px 42px ${P}45, 0 0 0 3px ${P}18`,
                 }}>
              <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full bg-white/25 backdrop-blur-sm mb-2">
                <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-white">Denne runden</span>
              </span>
              <p className="text-[16px] font-bold text-white tracking-[-0.015em]" style={F}>DigiHome Tech AS</p>
              <p className="text-[10.5px] text-white/85 mt-0.5 font-light">SaaS-selskapet · eier all IP</p>
              <div className="mt-2.5 pt-2 border-t border-white/25">
                <p className="text-[10.5px] text-white font-semibold">3 MNOK · 12% dilusjon</p>
              </div>
            </div>

            {/* Right sister: DigiCar */}
            <div className="absolute top-[170px] right-0 rounded-[12px] px-4 py-3 text-center bg-white"
                 style={{
                   border: '1.5px solid #d8d2c5',
                   width: '31%',
                 }}>
              <p className="text-[8.5px] font-bold tracking-[0.22em] text-[#b5aa98]" style={F}>SØSTER</p>
              <p className="text-[13.5px] font-bold text-[#0c0c0c] tracking-[-0.012em] mt-0.5" style={F}>DigiCar AS</p>
              <p className="text-[9.5px] text-[#8a8478] mt-0.5 font-light">Kommisjonssalg bil</p>
              <div className="mt-2.5 pt-2 border-t border-[#eae7e2]">
                <p className="text-[9px] text-[#b5aa98] font-light leading-[1.4]">Annen vertikal · ingen konflikter</p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-[#e6e2d9]">
            <p className="text-[10.5px] text-[#8a8478] text-center leading-[1.55] font-light">Delt teknologi-backbone (design, infrastruktur, DevOps) — <span className="font-semibold text-[#0c0c0c]">kapitaleffektivitet for alle tre selskap</span>.</p>
          </div>
        </article>

        {/* Key facts */}
        <div className="flex flex-col gap-4">
          {facts.map((f, i) => (
            <article key={i} className="bg-white rounded-[18px] p-5 flex-1 flex flex-col"
                     style={{
                       border: '1px solid #ece8e1',
                       boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 10px 28px rgba(20,15,10,0.05)',
                       animation: active ? `apCardIn 0.8s cubic-bezier(0.22,1,0.36,1) ${0.65 + i * 0.1}s both` : undefined,
                       opacity: active ? undefined : 0,
                     }}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-[8.5px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: P }}>{f.num} · {f.tag}</p>
              </div>
              <h3 className="text-[14.5px] font-bold text-[#0c0c0c] tracking-[-0.015em] mb-2" style={F}>{f.title}</h3>
              <p className="text-[11px] text-[#6e6a62] leading-[1.55] font-light flex-1">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Bottom ribbon */}
      <div className="mt-8 flex items-center justify-center gap-3 flex-wrap"
           style={{ animation: active ? 'apFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.0s both' : undefined, opacity: active ? undefined : 0 }}>
        <div className="h-px bg-[#e0ddd8] origin-right" style={{ width: '40px', animation: active ? 'apRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined }} />
        <p className="text-[11px] sm:text-[12px] text-[#7a6f5e] font-medium tracking-[-0.005em]">
          Full juridisk due diligence-pakke tilgjengelig på forespørsel · Advokat: <span className="font-semibold" style={{ color: P }}>Erik Hoffmann-Dahl</span>, Hoffmann Thinn
        </p>
        <div className="h-px bg-[#e0ddd8] origin-left" style={{ width: '40px', animation: active ? 'apRule 0.9s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined }} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE 2 — SExec (Executive Summary) · World-Class Editorial Brief ·
   3 horizontal pillars → ASK banner → timeline. Clean vertical rhythm,
   massive numerals as visual anchors, premium alignment, no dead space. ═══ */
const SExec = (p: any) => {
  const active = p.isActive;

  const pillars = [
    {
      num: '01',
      title: 'Produktet er klart',
      body: <>9 måneders intensiv utvikling. Hele utleieflyten samlet i ett system — fra <strong className="font-semibold text-[#0c0c0c]">annonse og kontrakt</strong> til drift, betaling og regnskap.</>,
    },
    {
      num: '02',
      title: 'Teamet dekker risikoen',
      body: <>Eiendom, teknologi og jus i samme gründerteam. <strong className="font-semibold text-[#0c0c0c]">Bygget av folk som kjenner utleie</strong> fra innsiden.</>,
    },
    {
      num: '03',
      title: 'Markedet er åpent',
      body: <>Norge er første bevismarked: <strong className="font-semibold text-[#0c0c0c]">86 mrd NOK</strong> i årlig leievolum, uten én dominerende SaaS-standard. Norden er neste steg.</>,
    },
  ];

  const timeline = [
    { flag: '🇳🇴',       region: 'Norge',      year: '2026',  tag: 'Bevismarked · 86 mrd NOK leievolum',           active: true },
    { flag: '🇸🇪🇩🇰🇫🇮', region: 'Norden',     year: '2027',  tag: 'Skalering · lokalt regelverk, samme kjerneplattform' },
    { flag: '🇬🇧🇩🇪',    region: 'UK + DACH',  year: '2028',  tag: 'Ekspansjon · større markeder, samme operasjonelle problem' },
    { flag: '🌍',         region: 'Globalt',    year: '2029+', tag: 'Opsjon · kategoriambisjon over tid' },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes exFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes exPillar { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes exAsk { from { opacity: 0; transform: translateY(20px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes exTl { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
    `}</style>

    <div className="max-w-[1260px] mx-auto px-6 sm:px-12 w-full relative z-10">

      {/* ═══ TOP BAND ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5"
           style={{ animation: active ? 'exFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: active ? undefined : 0 }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.34em]" style={{ color: P, ...F }}>
          Sammendrag&nbsp;·&nbsp;N°&nbsp;03
        </p>
        <p className="text-[10.5px] font-medium uppercase tracking-[0.26em] text-[#8a7c6a]" style={F}>
          Februar 2026 · Konfidensielt
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <div className="pb-6 mb-7 sm:mb-9 border-b border-[#d8d2c5]"
           style={{ animation: active ? 'exFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: active ? undefined : 0 }}
           data-testid="exec-hero">
        <h2 className="text-[34px] sm:text-[42px] lg:text-[48px] font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.04] max-w-[960px]" style={F}>
          Operativsystemet for <span style={{ color: P }}>boligutleie.</span>
        </h2>
        <p className="text-[14.5px] sm:text-[16.5px] text-[#5a564d] font-light tracking-[-0.003em] mt-3.5 leading-[1.45]" style={F}>
          Bygget i Bergen. Klart for Norden.
        </p>
      </div>

      {/* ═══ 3 PILLARS (horizontal) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7 lg:gap-12 mb-7 sm:mb-9">
        {pillars.map((pl, i) => (
          <article key={i}
                   data-testid={`exec-pillar-${i + 1}`}
                   style={{ animation: active ? `exPillar 0.8s cubic-bezier(0.22,1,0.36,1) ${0.55 + i * 0.12}s both` : undefined, opacity: active ? undefined : 0 }}>
            {/* BIG numeral + thin rule */}
            <div className="flex items-end gap-3 mb-4">
              <span className="text-[36px] sm:text-[42px] font-bold tabular-nums leading-[0.9]" style={{ ...F, color: P }}>
                {pl.num}
              </span>
              <div className="flex-1 h-[1.5px] bg-[#d8d2c5] mb-[7px]" />
            </div>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.28em] text-[#0c0c0c] mb-3" style={F}>
              {pl.title}
            </p>
            <p className="text-[14px] sm:text-[15px] text-[#2a2520] leading-[1.6] tracking-[-0.003em] font-light" style={F}>
              {pl.body}
            </p>
          </article>
        ))}
      </div>

      {/* ═══ ASK BANNER — full width hero ═══ */}
      <div className="relative rounded-[18px] overflow-hidden mb-7 sm:mb-9"
           data-testid="exec-ask-banner"
           style={{
             background: 'linear-gradient(165deg, #14141a 0%, #0a0a0d 100%)',
             boxShadow: '0 2px 4px rgba(20,15,10,0.06), 0 24px 60px rgba(20,15,10,0.14)',
             animation: active ? 'exAsk 0.95s cubic-bezier(0.22,1,0.36,1) 0.95s both' : undefined,
             opacity: active ? undefined : 0,
           }}>
        {/* purple glow right */}
        <div aria-hidden="true" className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${P}22 0%, transparent 65%)` }} />

        <div className="relative p-6 sm:p-7">
          {/* Header row: label + ASK + 3 terms */}
          <div className="flex items-center justify-between gap-8 flex-wrap">
            {/* LEFT — ASK headline */}
            <div className="flex items-baseline gap-5 sm:gap-7 flex-wrap">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.32em]" style={{ ...F, color: '#c39ce0' }}>
                Bridge-asken
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[42px] sm:text-[52px] font-bold text-white tracking-[-0.04em] leading-none tabular-nums" style={F}>3</span>
                <span className="text-[18px] sm:text-[22px] font-bold text-white tracking-[-0.02em] leading-none tabular-nums" style={F}>MNOK</span>
                <span className="text-[12.5px] sm:text-[13.5px] text-white/55 font-medium ml-2 tracking-[-0.003em]" style={F}>konvertibelt lån</span>
              </div>
            </div>

            {/* RIGHT — 3 terms grid */}
            <dl className="flex items-baseline gap-6 sm:gap-8 lg:gap-10">
              {[
                { k: 'Cap',      v: '25 MNOK' },
                { k: 'Rabatt',   v: '20 %' },
                { k: 'Maks dilusjon', v: 'ca. 12 %' },
              ].map((t, i) => (
                <div key={i}>
                  <dt className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white/55 mb-1.5" style={F}>{t.k}</dt>
                  <dd className="text-[16px] sm:text-[18px] font-bold text-white tabular-nums tracking-[-0.01em]" style={F}>{t.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Closing narrative */}
          <div className="mt-5 pt-5 border-t border-white/[0.09]">
            <p className="text-[13px] sm:text-[13.5px] text-white/75 leading-[1.55] tracking-[-0.003em] font-light" style={F}>
              Finansierer <strong className="font-semibold text-white">16 måneder</strong> frem til seed-runde — og tar DigiHome fra intern produktvalidering til <strong className="font-semibold text-white">eksterne betalende kunder, dokumentert unit economics og nordisk lanseringsklarhet</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ TIMELINE FOOTER ═══ */}
      <div>
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3"
             style={{ animation: active ? 'exFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined, opacity: active ? undefined : 0 }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: P, ...F }}>Ekspansjon</p>
          <p className="text-[11px] font-medium text-[#8a7c6a] tracking-[-0.002em] italic" style={F}>Norge først. Norden neste. Global opsjon.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 relative">
          {/* connecting dotted line */}
          <div aria-hidden="true" className="absolute hidden md:block left-[11%] right-[11%] top-[10px] h-px" style={{
            background: `repeating-linear-gradient(to right, ${P}44 0, ${P}44 3px, transparent 3px, transparent 9px)`,
          }} />
          {timeline.map((t, i) => (
            <div key={i} className="relative"
                 style={{ animation: active ? `exTl 0.7s cubic-bezier(0.22,1,0.36,1) ${1.45 + i * 0.12}s both` : undefined, opacity: active ? undefined : 0 }}>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 relative z-10" style={{
                  backgroundColor: '#f7f5f2',
                  border: t.active ? `2px solid ${P}` : `1.5px solid #b5aa98`,
                  boxShadow: t.active ? `0 0 0 4px #f7f5f2, 0 0 0 5px ${P}30` : undefined,
                }}>
                  {t.active && <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: P }} />}
                </div>
                <span className="text-[17px] leading-none" style={{ filter: 'saturate(1.1)' }}>{t.flag}</span>
              </div>
              <p className="text-[15px] sm:text-[16px] font-bold text-[#0c0c0c] tracking-[-0.018em] leading-tight" style={F}>{t.region}</p>
              <p className="text-[12px] font-semibold tabular-nums mt-1 tracking-[-0.002em]" style={{ ...F, color: t.active ? P : '#8a7c6a' }}>{t.year}</p>
              <p className="text-[11px] text-[#6e6a62] mt-1.5 font-light leading-[1.4] tracking-[-0.002em]" style={F}>{t.tag}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE 3 — SDualUSP · Tre helt unike aspekter (Auto-listing + Dynamic + AI ops) ═══ */
const SDualUSP = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const showFinal = active || isPdf; // I PDF-mode hopp rett til final state, ingen animasjoner
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (active && !isPdf) setAnimKey(k => k + 1);
  }, [active, isPdf]);

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes uspFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes uspHeadlineIn { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes uspCardIn { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes uspBarGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes uspPhoneFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    `}</style>

    <DotGrid maskCenter="50% 22%" opacity={0.32} />

    <div className="max-w-[1500px] mx-auto px-6 sm:px-10 w-full relative z-10">
      {/* Editorial header */}
      <div className="mb-6 sm:mb-9 max-w-[1080px]">
        <p className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.32em] mb-4"
           style={{ color: P, ...F, animation: (active && !isPdf) ? 'uspFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: showFinal ? 1 : 0 }}>
          Tre unike aspekter
        </p>
        <h2 className="font-bold text-[#0c0c0c] tracking-[-0.035em] leading-[1.04] lg:whitespace-nowrap"
            style={{ ...F, fontSize: 'clamp(20px, 2.3vw, 32px)', animation: (active && !isPdf) ? 'uspHeadlineIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.3s both' : undefined, opacity: showFinal ? 1 : 0 }}>
          Annonsen lager seg selv. <span className="text-[#3a3530] font-light tracking-[-0.03em]">Boligen jobber smartere.</span> <span style={{ color: P }}>Driften går av seg selv.</span>
        </h2>
      </div>

      {/* 3-column USP grid — wider columns, taller cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">

        {/* ═══ 01 — Automagisk annonsegenerator ═══ */}
        <article className="rounded-[20px] flex flex-col overflow-hidden bg-white"
                 style={{
                   border: '1px solid #ece8e1',
                   boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 18px 50px rgba(20,15,10,0.07)',
                   animation: (active && !isPdf) ? 'uspCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined,
                   opacity: showFinal ? 1 : 0,
                 }}>
          {/* Visual: LandingHeroAnimation — full width edge-to-edge, no inner padding */}
          <div className="relative overflow-hidden" style={{ height: 360 }}>
            {isPdf ? (
              // PDF-mode: vis statisk interior-foto i stedet for animasjon
              <img
                src="/interior-living.webp"
                alt="Annonsegenerator"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                draggable={false}
              />
            ) : (
              <div key={`l-${animKey}`} className="absolute inset-0">
                <LandingHeroAnimation key={`l-${animKey}`} />
              </div>
            )}
          </div>

          {/* Hairline divider */}
          <div className="h-px bg-[#ece8e1]" />

          {/* Text */}
          <div className="p-7 flex-1 flex flex-col">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: P }}>01</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8478]" style={F}>Automagisk</p>
            </div>
            <h3 className="text-[22px] font-bold text-[#0c0c0c] tracking-[-0.025em] leading-tight mb-3" style={F}>
              Annonsegenerator
            </h3>
            <p className="text-[12.5px] text-[#2a2a2a] font-light leading-[1.55] tracking-[-0.003em] mb-4 flex-1" style={F}>
              Last opp bilder. DigiHome lager komplett annonse — tittel, beskrivelse, fasiliteter og prisforslag — på minutter.
            </p>
            <div className="h-px bg-gradient-to-r from-[#e6e2d9] to-transparent mb-3" />
            <p className="text-[11.5px] font-semibold tracking-[-0.003em] leading-[1.45]" style={{ ...F, color: P }}>
              Klar for FINN og de største utleieportalene.
            </p>
          </div>
        </article>

        {/* ═══ 02 — Dynamisk utleie · Calendar mockup ═══ */}
        <article className="rounded-[20px] flex flex-col overflow-hidden bg-white"
                 style={{
                   border: '1px solid #ece8e1',
                   boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 18px 50px rgba(20,15,10,0.07)',
                   animation: (active && !isPdf) ? 'uspCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.62s both' : undefined,
                   opacity: showFinal ? 1 : 0,
                 }}>
          {/* Visual: Calendar mockup */}
          <div className="relative overflow-hidden flex flex-col"
               style={{ height: 360 }}>

            {/* Calendar header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
              <div>
                <p className="text-[14px] font-bold text-[#0c0c0c] tracking-[-0.015em]" style={F}>Kalender</p>
                <p className="text-[10px] text-[#8a8478] mt-0.5" style={F}>April 2026 · Bergen</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fafaf7] border border-[#e4dfd6]">
                <div className="w-2 h-2 rounded-sm" style={{ background: P }} />
                <span className="text-[10px] text-[#0c0c0c] font-medium" style={F}>Alle</span>
                <ChevronDown className="w-2.5 h-2.5 text-[#8a8478]" strokeWidth={2} />
              </div>
            </div>

            {/* Date strip */}
            <div className="flex items-stretch border-t border-b border-[#f0ede8] mx-6 rounded-t-md bg-[#fdfbf7] shrink-0">
              <div className="w-[130px] shrink-0 px-2.5 py-2 border-r border-[#f0ede8]">
                <p className="text-[9.5px] font-bold text-[#0c0c0c]" style={F}>April <span className="font-normal text-[#b5aa98]">2026</span></p>
              </div>
              <div className="flex-1 grid grid-cols-7 text-center">
                {[{d:'Ma',n:21},{d:'Ti',n:22},{d:'On',n:23},{d:'To',n:24,a:true},{d:'Fr',n:25},{d:'Lø',n:26},{d:'Sø',n:27}].map((c:any,i)=>(
                  <div key={i} className={`py-1.5 ${c.a?'bg-white':''}`}>
                    <p className="text-[8px] text-[#b5aa98]" style={F}>{c.d}</p>
                    <p className={`text-[10.5px] font-bold ${c.a?'text-white inline-flex items-center justify-center w-4 h-4 rounded-full':'text-[#0c0c0c]'}`} style={c.a?{background:P}:F}>{c.n}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Property rows */}
            <div className="flex-1 mx-6 mb-6 border-l border-r border-b border-[#f0ede8] rounded-b-md overflow-hidden bg-white">
              {[
                { img:'/interior-living.webp',    name:'Innbydende 3-roms', tag:'KT', tagBg:'#fce7f3', tagC:'#be185d', bar:'Booking · 3n', barCol:'#0c0c0c', barC:'#fff', barStart:18, barWidth:38, delay:0.95 },
                { img:'/interior-bedroom2.webp',  name:'Moderne 3-roms',     tag:'LT', tagBg:'#ede9fe', tagC:'#6d28d9', bar:'Erik · 12 mnd', barCol:P, barC:'#fff', barStart:0, barWidth:100, delay:1.05 },
                { img:'/interior-openplan.webp',  name:'Lys 2-roms',          tag:'KT', tagBg:'#fce7f3', tagC:'#be185d', bar:'Airbnb · 5n', barCol:'#fce7f3', barC:'#be185d', barStart:38, barWidth:42, delay:1.15 },
                { img:'/interior-kitchen3.webp',  name:'Penthouse 4-roms',   tag:'LT', tagBg:'#ede9fe', tagC:'#6d28d9', bar:'Anders · 6 mnd', barCol:P, barC:'#fff', barStart:0, barWidth:100, delay:1.25 },
                { img:'/interior-dining.webp',    name:'Oppgradert 4-roms',  tag:'KT', tagBg:'#fce7f3', tagC:'#be185d', bar:'Olsen · 30 dgr', barCol:P, barC:'#fff', barStart:5, barWidth:65, delay:1.35 },
                { img:'/interior-living.webp',    name:'Sjarmerende Hybel',  tag:'',   tagBg:'',         tagC:'',         bar:'Ledig 12.12',  barCol:'#fef3c7', barC:'#92400e', barStart:48, barWidth:32, delay:1.45 },
              ].map((r: any, i) => (
                <div key={i} className="flex items-center border-b border-[#f0ede8] last:border-b-0 h-[34px] hover:bg-[#fdfbf7]">
                  <div className="w-[130px] shrink-0 px-2.5 flex items-center gap-2">
                    <div className="w-[22px] h-[22px] rounded-sm overflow-hidden shrink-0 bg-[#eae7e2]">
                      <img src={r.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] font-semibold text-[#0c0c0c] truncate leading-tight" style={F}>{r.name}</p>
                    </div>
                    {r.tag && <span className="text-[7px] font-bold px-1 py-px rounded shrink-0" style={{ ...F, background:r.tagBg, color:r.tagC }}>{r.tag}</span>}
                  </div>
                  <div className="flex-1 relative h-[34px] border-l border-[#f0ede8]">
                    {r.bar && (
                      <div className="absolute top-1/2 -translate-y-1/2 h-[18px] rounded-[3px] flex items-center px-2 origin-left"
                           style={{
                             background:r.barCol,
                             left:`${r.barStart}%`,
                             width:`${r.barWidth}%`,
                             animation: (active && !isPdf) ? `uspBarGrow 0.7s cubic-bezier(0.22,1,0.36,1) ${r.delay}s both` : undefined,
                             transform: showFinal ? undefined : 'scaleX(0)',
                           }}>
                        <span className="text-[8.5px] font-semibold truncate" style={{ ...F, color: r.barC || '#fff' }}>{r.bar}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hairline divider */}
          <div className="h-px bg-[#ece8e1]" />

          {/* Text */}
          <div className="p-7 flex-1 flex flex-col">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: P }}>02</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8478]" style={F}>Dynamisk</p>
            </div>
            <h3 className="text-[24px] font-bold text-[#0c0c0c] tracking-[-0.025em] leading-tight mb-3" style={F}>
              Utleie
            </h3>
            <p className="text-[13px] text-[#2a2a2a] font-light leading-[1.55] tracking-[-0.003em] mb-4 flex-1" style={F}>
              Markedsdrevet prissetting og minimal tomgang — DigiHome finner riktig leie, fyller ledige enheter raskt og fornyer kontrakter automatisk.
            </p>
            <div className="h-px bg-gradient-to-r from-[#e6e2d9] to-transparent mb-3" />
            <p className="text-[12px] font-semibold tracking-[-0.003em] leading-[1.45]" style={{ ...F, color: P }}>
              Riktig pris, fullt belegg — automatisk.
            </p>
          </div>
        </article>

        {/* ═══ 03 — Automatisert drift · AI Chat phone mockup ═══ */}
        <article className="rounded-[20px] flex flex-col overflow-hidden"
                 style={{
                   background: 'linear-gradient(165deg, #fafaf7 0%, #f4f1ea 100%)',
                   border: '1px solid #ece8e1',
                   boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 18px 50px rgba(20,15,10,0.07)',
                   animation: (active && !isPdf) ? 'uspCardIn 0.85s cubic-bezier(0.22,1,0.36,1) 0.74s both' : undefined,
                   opacity: showFinal ? 1 : 0,
                 }}>
          {/* Visual: phone mockup floating, scale=0.66 to fit compact card */}
          <div className="relative overflow-hidden flex items-start justify-center pt-3"
               style={{ height: 360 }}>
            <div style={{
                   transform: 'scale(0.66)',
                   transformOrigin: 'top center',
                   animation: (active && !isPdf) ? 'uspPhoneFloat 4.5s ease-in-out 1.2s infinite' : undefined,
                 }}>
              <DeckAIChatPhone active={active || isPdf} />
            </div>
          </div>

          {/* Hairline divider */}
          <div className="h-px bg-[#ece8e1]" />

          {/* Text */}
          <div className="p-7 flex-1 flex flex-col bg-white">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: P }}>03</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a8478]" style={F}>Automatisert</p>
            </div>
            <h3 className="text-[24px] font-bold text-[#0c0c0c] tracking-[-0.025em] leading-tight mb-3" style={F}>
              Drift
            </h3>
            <p className="text-[13px] text-[#2a2a2a] font-light leading-[1.55] tracking-[-0.003em] mb-4 flex-1" style={F}>
              DigiHome er bygget fra grunnen av for å la AI håndtere drift — ikke en feature lagt på toppen, men selve fundamentet.
            </p>
            <div className="h-px bg-gradient-to-r from-[#e6e2d9] to-transparent mb-3" />
            <p className="text-[12px] font-semibold tracking-[-0.003em] leading-[1.45]" style={{ ...F, color: P }}>
              Plattformen jobber. Du får oversikten.
            </p>
          </div>
        </article>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ MINDSET SLIDE — «En ny måte å tenke programvare på» (langtid · autopilot + manuell godkjenning) ═══ */
const LANGTID_TASKS = [
  { cat: 'Kontrakt',    title: 'Reguler husleien etter KPI',    context: 'Solveien 12B · årlig justering forfaller 1. juni', handling: 'Varsel klart: husleie økes 3,8 % iht. konsumprisindeks, med én måneds frist.', resolve: 'auto' },
  { cat: 'Husleie',     title: 'Påminnelse om forfalt husleie', context: 'Møhlenpris 14 · forfalt for 2 dager siden',          handling: 'Vennlig påminnelse sendt på SMS og e-post, med betalingslenke vedlagt.',     resolve: 'auto' },
  { cat: 'Vedlikehold', title: 'Lekkasje meldt av leietaker',    context: 'Strandgaten 8 · kjøkkenkran drypper',                handling: 'Rørlegger foreslått tirsdag kl. 10–12. Leietaker varslet om tidspunkt.',     resolve: 'you'  },
  { cat: 'Utleie',      title: 'Ny leietaker kredittsjekket',    context: 'Nygårdsgaten 22 · 9 søkere screenet',                handling: 'Anbefalt søker, score 4,8/5. Leiekontrakt klar til e-signering.',           resolve: 'you'  },
];

const SAutopilotChecklist = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const AC = '#d298ff';      // autopilot (merkevare-lilla)
  const AMBER = '#f4b066';   // krever godkjenning
  const GREEN = '#34d399';   // godkjent

  const [activeRow, setActiveRow] = useState(isPdf ? 5 : -1);
  const [rowPhase, setRowPhase] = useState<'work' | 'review' | 'done'>('work');

  const AUTOPILOT_TASKS = [
    { cat: 'Kontrakt',    title: 'Reguler husleien etter KPI',        mode: 'auto', detail: 'Husleie justeres 3,8 % etter konsumprisindeks. Varsel sendt med én måneds frist.' },
    { cat: 'Husleie',     title: 'Forfalt husleie — send påminnelse',  mode: 'auto', detail: 'Påminnelse sendt automatisk med ny betalingsfrist og KID.' },
    { cat: 'Leietaker',   title: 'Leietaker spør om maling av stua',    mode: 'you',  kind: 'message',
      from: 'Anna Berg', role: 'Leietaker', initials: 'AB', time: '21:47',
      incoming: 'Hei! Er det greit om jeg maler stua i en lysere farge?',
      draft: 'Hei Anna! Det går helt fint — velg gjerne en nøytral farge og mal tilbake til hvitt ved utflytting. Si fra om du lurer på noe mer. Mvh Martin',
      detail: '' },
    { cat: 'Utleie',      title: 'Kredittsjekk ny leietaker',          mode: 'you',  detail: 'Søker godkjent. Kontrakt klargjort for signering med BankID.' },
    { cat: 'Annonse',     title: 'Forny annonsen på FINN',             mode: 'auto', detail: 'Annonsen republisert med oppdatert pris og bilder.' },
  ];

  // start sjekkliste-gjennomgangen ved aktivering
  useEffect(() => {
    if (isPdf) { setActiveRow(5); return; }
    if (!active) { setActiveRow(-1); setRowPhase('work'); return; }
    setActiveRow(-1);
    const t = setTimeout(() => setActiveRow(0), 900);
    return () => clearTimeout(t);
  }, [active, isPdf]);

  // prosesser aktiv rad → hak av → neste rad
  useEffect(() => {
    if (!active || isPdf || activeRow < 0 || activeRow > 4) return;
    const isManual = AUTOPILOT_TASKS[activeRow].mode === 'you';
    const isMsg = (AUTOPILOT_TASKS[activeRow] as any).kind === 'message';
    setRowPhase('work');
    const timers: any[] = [];
    if (isManual) {
      if (isMsg) {
        timers.push(setTimeout(() => setRowPhase('review'), 1600));
        timers.push(setTimeout(() => setRowPhase('done'), 5200));
        timers.push(setTimeout(() => setActiveRow((r) => r + 1), 6000));
      } else {
        timers.push(setTimeout(() => setRowPhase('review'), 1700));
        timers.push(setTimeout(() => setRowPhase('done'), 3500));
        timers.push(setTimeout(() => setActiveRow((r) => r + 1), 4400));
      }
    } else {
      timers.push(setTimeout(() => setRowPhase('done'), 2400));
      timers.push(setTimeout(() => setActiveRow((r) => r + 1), 3200));
    }
    return () => timers.forEach(clearTimeout);
  }, [activeRow, active, isPdf]);

  // signaliser til decket at hele keynote-sekvensen er ferdig (låser opp navigasjon)
  useEffect(() => {
    if (!active || isPdf) return;
    if (activeRow >= 5) {
      const t = setTimeout(() => { if (p.onAnimationComplete) p.onAnimationComplete(); }, 1500);
      return () => clearTimeout(t);
    }
  }, [activeRow, active, isPdf]);

  const C = 119.38; // 2πr, r=19
  const doneCount = Math.min(Math.max(activeRow, 0), 5);

  const Cursor = () => (
    <svg width="19" height="22" viewBox="0 0 19 22" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
      <path d="M2 1.5L2 16.5L6 12.8L8.8 19.5L11.2 18.5L8.5 12L13.5 12L2 1.5Z" fill="white" stroke="#0c0c0c" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );

  return (
  <SlideFrame bg="dark" {...p}>
    <style>{`
      @keyframes mUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes mUpSm { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes mHead { from { opacity: 0; transform: translateY(20px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes mReveal { from { opacity: 0; transform: translateY(26px); filter: blur(14px); } 55% { filter: blur(0.5px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes mPanel { from { opacity: 0; transform: translateY(20px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes mRing { from { stroke-dashoffset: ${C}; } to { stroke-dashoffset: 0; } }
      @keyframes mPop { 0% { opacity: 0; transform: scale(0.7); } 60% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
      @keyframes mRingPulse { 0% { transform: scale(0.7); opacity: 0.5; } 100% { transform: scale(2); opacity: 0; } }
      @keyframes mDotPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      @keyframes mDot { 0%,100% { opacity: 0.25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
      @keyframes curTap { 0% { opacity: 0; transform: translate(40px, 34px) scale(1); } 30% { opacity: 1; transform: translate(0,0) scale(1); } 46% { transform: translate(0,0) scale(0.78); } 62% { transform: translate(0,0) scale(1); } 100% { opacity: 1; transform: translate(0,0) scale(1); } }
      @keyframes btnPress { 0%,40% { transform: scale(1); } 50% { transform: scale(0.94); } 64%,100% { transform: scale(1); } }
      @keyframes btnRipple { 0%,40% { opacity: 0; transform: scale(0.6); } 52% { opacity: 0.7; } 100% { opacity: 0; transform: scale(1.9); } }
      @keyframes mKenBurns { 0% { transform: scale(1.0) translateY(12px); } 100% { transform: scale(1.05) translateY(-12px); } }
      @keyframes mKenBurnsSoft { 0% { transform: scale(1.0) translateY(8px); } 100% { transform: scale(1.028) translateY(-6px); } }
      @keyframes mGlowBreath { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.16); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute left-1/2 top-1/2 w-[58%] h-[60%] rounded-full"
           style={{ background: `radial-gradient(ellipse, ${AC}22 0%, transparent 70%)`, filter: 'blur(48px)',
                    transform: 'translate(-50%,-50%)',
                    opacity: 0.55,
                    animation: !isPdf ? 'mGlowBreath 14s ease-in-out infinite' : undefined }} />
    </div>
    <DotGrid maskCenter="50% 45%" opacity={0.06} />
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 44%, transparent 50%, rgba(0,0,0,0.5) 100%)' }} />

    {/* ═══ SJEKKLISTE-SCENE — autopiloten i arbeid ═══ */}
    <div className="absolute inset-0 z-10">

      {/* ── SJEKKLISTEN hakes av, én etter én ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        {/* kicker */}
        <div className="mb-6" style={{ animation: (active && !isPdf) ? 'mUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ ...F, color: 'rgba(255,255,255,0.42)' }}>Autopiloten i arbeid</span>
        </div>
        <div className="relative w-full max-w-[720px] rounded-[30px] px-7 sm:px-10 py-8 text-left"
             style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.07)',
                      boxShadow: '0 40px 120px -55px rgba(0,0,0,0.95)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}>

          {/* header */}
          <div className="flex items-center justify-between pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3">
              <span className="relative flex items-center justify-center w-2.5 h-2.5">
                <span className="absolute w-2.5 h-2.5 rounded-full" style={{ background: AC, animation: (active && activeRow >= 0 && activeRow < 5) ? 'mRingPulse 2.6s ease-out infinite' : undefined }} />
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: AC, boxShadow: `0 0 10px ${AC}` }} />
              </span>
              <span className="text-[12px] font-medium uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.5)', ...F }}>DigiHome autopilot</span>
            </div>
            <span className="text-[12.5px] font-medium tabular-nums tracking-[-0.005em]" style={{ color: doneCount === 5 ? AC : 'rgba(255,255,255,0.45)', ...F, transition: 'color 0.4s' }}>
              {doneCount} av 5 fullført
            </span>
          </div>

          {/* rader */}
          <div className="flex flex-col mt-3">
            {AUTOPILOT_TASKS.map((t, i) => {
              const isAutoRow = t.mode === 'auto';
              const rowDone = isPdf || activeRow > i || activeRow === 5;
              const current = !rowDone && activeRow === i;
              const upcoming = !rowDone && !current;
              const ph = current ? rowPhase : (rowDone ? 'done' : 'idle');
              const checkCol = isAutoRow ? AC : GREEN;
              const modeCol = isAutoRow ? AC : AMBER;
              return (
                <div key={i} className="flex items-start gap-4 rounded-[20px] px-4"
                     style={{ paddingTop: current ? 18 : 14, paddingBottom: current ? 18 : 14,
                              background: current ? 'rgba(255,255,255,0.045)' : 'transparent',
                              opacity: upcoming ? 0.34 : 1,
                              transition: 'background 0.45s ease, opacity 0.55s ease, padding 0.4s ease' }}>
                  {/* indikator */}
                  <div className="relative w-[30px] h-[30px] shrink-0 mt-[2px]">
                    {(rowDone || ph === 'done') ? (
                      <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                           style={{ background: `${checkCol}22`, border: `1.5px solid ${checkCol}` }}>
                        <Check className="w-4 h-4" style={{ color: checkCol, animation: current ? 'mPop 0.45s cubic-bezier(0.22,1,0.36,1) both' : undefined }} strokeWidth={3} />
                      </div>
                    ) : current && ph === 'work' ? (
                      <svg className="w-[30px] h-[30px] -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                        <circle cx="22" cy="22" r="19" fill="none" stroke={AC} strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={C} style={{ animation: `mRing ${isAutoRow ? '2.2' : '1.5'}s cubic-bezier(0.4,0,0.2,1) forwards` }} />
                      </svg>
                    ) : current && ph === 'review' ? (
                      <span className="relative flex items-center justify-center w-[30px] h-[30px]">
                        <span className="absolute w-[26px] h-[26px] rounded-full" style={{ background: AMBER, opacity: 0.2, animation: 'mRingPulse 1.8s ease-out infinite' }} />
                        <span className="w-[11px] h-[11px] rounded-full" style={{ background: AMBER, boxShadow: `0 0 10px ${AMBER}` }} />
                      </span>
                    ) : (
                      <div className="w-[30px] h-[30px] rounded-full" style={{ border: '1.5px solid rgba(255,255,255,0.18)' }} />
                    )}
                  </div>

                  {/* tekst */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <span className="block text-[17px] sm:text-[18.5px] font-medium tracking-[-0.015em] truncate"
                          style={{ ...F, color: current ? '#fff' : rowDone ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.85)', transition: 'color 0.4s' }}>{t.title}</span>

                    {current && (
                      <div style={{ animation: 'mUpSm 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
                        {(t as any).kind === 'message' ? (
                          <div className="mt-3 max-w-[450px]">
                            {/* innkommende melding fra leietaker */}
                            <div className="flex items-start gap-2.5">
                              <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold"
                                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.78)', ...F }}>{(t as any).initials}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12.5px] font-semibold text-white" style={{ ...F }}>{(t as any).from}</span>
                                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)', ...F }}>{(t as any).role} · {(t as any).time}</span>
                                </div>
                                <div className="inline-block mt-1.5 px-3.5 py-2.5 text-[13.5px] leading-[1.5]"
                                     style={{ background: 'rgba(255,255,255,0.055)', borderRadius: '4px 15px 15px 15px', color: 'rgba(255,255,255,0.82)', ...F }}>{(t as any).incoming}</div>
                              </div>
                            </div>

                            {ph === 'work' ? (
                              <div className="flex items-center gap-1.5 mt-3 ml-[38px]">
                                {[0, 1, 2].map((d) => (
                                  <span key={d} className="w-[5px] h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,0.45)', animation: `mDot 1.2s ease-in-out ${d * 0.16}s infinite` }} />
                                ))}
                                <span className="text-[12px] ml-1.5" style={{ color: 'rgba(255,255,255,0.42)', ...F }}>skriver svar …</span>
                              </div>
                            ) : (
                              <div style={{ animation: 'mUpSm 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
                                <div className="flex items-center gap-2.5 mt-4 mb-2.5 ml-[38px]">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: AC, ...F }}>Utkast · klar for godkjenning</span>
                                  <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                </div>
                                <div className="ml-[38px] px-3.5 py-3 text-[13.5px] leading-[1.55]"
                                     style={{ background: `${AC}14`, border: `1px solid ${AC}33`, borderRadius: '15px 4px 15px 15px', color: 'rgba(255,255,255,0.92)', boxShadow: `0 16px 44px -24px ${AC}`, ...F }}>{(t as any).draft}</div>
                                <div className="flex items-center gap-3 mt-4 ml-[38px]">
                                  <div className="relative">
                                    <button className="inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[13.5px] font-semibold text-[#0a1a14]"
                                            style={{ background: GREEN, boxShadow: `0 10px 26px -8px ${GREEN}`, ...F, animation: 'btnPress 2.6s cubic-bezier(0.4,0,0.2,1) 1.45s both' }}>
                                      <Check className="w-4 h-4" strokeWidth={2.8} /> Godkjenn og send
                                    </button>
                                    <span aria-hidden="true" className="absolute inset-0 rounded-[11px] pointer-events-none" style={{ border: `2px solid ${GREEN}`, animation: 'btnRipple 2.6s ease-out 1.45s both' }} />
                                    <span aria-hidden="true" className="absolute pointer-events-none z-10" style={{ left: '60%', top: '58%', animation: 'curTap 2.6s cubic-bezier(0.4,0,0.2,1) 1.45s both' }}><Cursor /></span>
                                  </div>
                                  <button className="rounded-[11px] px-4 py-2.5 text-[13.5px] font-medium" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', ...F }}>Rediger</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-[13.5px] sm:text-[14px] font-normal leading-[1.55] mt-2" style={{ color: 'rgba(255,255,255,0.5)', ...F }}>{t.detail}</p>
                            {ph === 'review' && (
                              <div className="flex items-center gap-3 mt-4">
                                <div className="relative">
                                  <button className="inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[13.5px] font-semibold text-[#0a1a14]"
                                          style={{ background: GREEN, boxShadow: `0 10px 26px -8px ${GREEN}`, ...F, animation: 'btnPress 1.8s cubic-bezier(0.4,0,0.2,1) 0.6s both' }}>
                                    <Check className="w-4 h-4" strokeWidth={2.8} /> Godkjenn
                                  </button>
                                  <span aria-hidden="true" className="absolute inset-0 rounded-[11px] pointer-events-none" style={{ border: `2px solid ${GREEN}`, animation: 'btnRipple 1.8s ease-out 0.6s both' }} />
                                  <span aria-hidden="true" className="absolute pointer-events-none z-10" style={{ left: '60%', top: '58%', animation: 'curTap 1.8s cubic-bezier(0.4,0,0.2,1) 0.6s both' }}><Cursor /></span>
                                </div>
                                <button className="rounded-[11px] px-4 py-2.5 text-[13.5px] font-medium" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', ...F }}>Rediger</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* status */}
                  <div className="shrink-0 pl-3 text-right pt-0.5" style={{ minWidth: 104 }}>
                    <span className="text-[11.5px] font-semibold tracking-[-0.005em]"
                          style={{ ...F, color: (rowDone || ph === 'done') ? checkCol : ph === 'review' ? AMBER : ph === 'work' ? 'rgba(255,255,255,0.5)' : modeCol, transition: 'color 0.4s' }}>
                      {(rowDone || ph === 'done') ? (isAutoRow ? 'Automatisk' : 'Godkjent') : ph === 'work' ? 'Forbereder …' : ph === 'review' ? 'Venter på deg' : (isAutoRow ? 'Autopilot' : 'Manuell')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
          {/* sluttlinje — står når alt er fullført */}
          <p className="text-center text-[17px] sm:text-[21px] font-semibold tracking-[-0.015em] mt-8 px-6 max-w-[640px]"
             style={{ ...FH, color: 'rgba(255,255,255,0.92)',
                      opacity: (activeRow === 5 || isPdf) ? 1 : 0,
                      transform: (activeRow === 5 || isPdf) ? 'translateY(0)' : 'translateY(14px)',
                      filter: (activeRow === 5 || isPdf) ? 'blur(0)' : 'blur(6px)',
                      transition: 'opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s, filter 0.9s ease 0.2s' }}>
            Ikke et system du bruker. <span style={{ color: AC }}>Et system som jobber for deg.</span>
          </p>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ PROCESS SLIDE — «Hele utleieprosessen. Ett system.» (prosess-pipeline · ende-til-ende) ═══ */
const PROCESS_STAGES = [
  { icon: Target,        title: 'Lead inn',      sub: 'Boligeier melder seg' },
  { icon: FileText,      title: 'Tilbud',        sub: 'Verdivurdering + tilbud' },
  { icon: Shield,        title: 'Signering',     sub: 'Forvaltningsavtale · BankID' },
  { icon: Building2,     title: 'Eiendomsdata',  sub: 'Hentes fra Matrikkelen' },
  { icon: Sparkles,      title: 'Klargjøring',   sub: 'AI-styling + annonsetekst' },
  { icon: Rocket,        title: 'Publisering',   sub: 'Ut i markedet · FINN' },
  { icon: ClipboardCheck, title: 'Leietaker',    sub: 'Kredittsjekk + leiekontrakt' },
];

/* ═══ 03 · SAMMENLIGNING — tradisjonell software vs DigiHome (forklarende) ═══ */
const SComparison = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const AC = '#d298ff';
  return (
  <SlideFrame bg="dark" {...p}>
    <style>{`
      @keyframes cmpUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute left-[72%] top-1/2 w-[44%] h-[62%] rounded-full"
           style={{ background: `radial-gradient(ellipse, ${AC}18 0%, transparent 70%)`, filter: 'blur(62px)', transform: 'translate(-50%,-50%)' }} />
    </div>
    <DotGrid maskCenter="50% 45%" opacity={0.05} />
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 46%, transparent 54%, rgba(0,0,0,0.5) 100%)' }} />

    <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
      <div className="w-full max-w-[1020px]">
        {/* eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-12 sm:mb-14"
             style={{ opacity: show ? undefined : 0, animation: active ? 'cmpUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined }}>
          <span className="h-px w-7" style={{ background: `${AC}55` }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em]" style={{ ...F, color: AC }}>Forskjellen fra tradisjonell software</span>
          <span className="h-px w-7" style={{ background: `${AC}55` }} />
        </div>

        {/* to kolonner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-0">
          {/* venstre — tradisjonell software */}
          <div className="md:pr-16"
               style={{ opacity: show ? undefined : 0, animation: active ? 'cmpUp 0.85s cubic-bezier(0.22,1,0.36,1) 0.6s both' : undefined }}>
            <h3 className="text-[19px] sm:text-[24px] font-bold tracking-[-0.02em] mb-5" style={{ ...FH, color: 'rgba(255,255,255,0.55)' }}>Tradisjonell software</h3>
            <p className="text-[17px] sm:text-[20px] font-normal leading-[1.62]" style={{ ...F, color: 'rgba(255,255,255,0.46)' }}>
              Bygget som en samling moduler og funksjoner. Du må selv vite hva som skal gjøres, finne riktig sted i systemet, og utføre hver oppgave manuelt.
            </p>
          </div>

          {/* høyre — DigiHome */}
          <div className="md:pl-16 relative"
               style={{ opacity: show ? undefined : 0, animation: active ? 'cmpUp 0.85s cubic-bezier(0.22,1,0.36,1) 1.1s both' : undefined }}>
            <div aria-hidden="true" className="hidden md:block absolute left-0 top-0 bottom-0 w-px"
                 style={{ background: `linear-gradient(to bottom, transparent, ${AC}55, transparent)` }} />
            <h3 className="text-[19px] sm:text-[24px] font-bold tracking-[-0.02em] mb-5" style={{ ...FH, color: '#fff' }}>DigiHome</h3>
            <p className="text-[17px] sm:text-[20px] font-normal leading-[1.62]" style={{ ...F, color: 'rgba(255,255,255,0.82)' }}>
              Bygget motsatt vei. Systemet vet til enhver tid hva som er neste steg, og gir deg en løpende liste over kommende oppgaver — <span style={{ color: AC }}>som du kan se gjennom, godkjenne, eller la systemet utføre automatisk.</span>
            </p>
          </div>
        </div>

        {/* konklusjon */}
        <div className="mt-12 sm:mt-14 pt-8 text-center"
             style={{ borderTop: '1px solid rgba(255,255,255,0.08)', opacity: show ? undefined : 0, animation: active ? 'cmpUp 0.9s cubic-bezier(0.22,1,0.36,1) 1.7s both' : undefined }}>
          <p className="text-[18px] sm:text-[24px] font-medium tracking-[-0.02em] leading-[1.5] max-w-[800px] mx-auto" style={{ ...FH, color: 'rgba(255,255,255,0.92)', textWrap: 'balance' as any }}>
            Forskjellen er ikke antall funksjoner, men at systemet selv vet hva som er neste steg — og fører deg gjennom arbeidet.
          </p>
        </div>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ 03 · KATEGORI — software-evolusjonen: Record → Workflow → Autonomous ═══ */
const SCategoryEvolution = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const AC = '#d298ff';
  const GENS = [
    { v: 'V1', verb: 'Lagrer informasjon.',   ex: 'CRM · ERP · Forvaltning' },
    { v: 'V2', verb: 'Organiserer arbeidet.',  ex: 'Asana · Monday · HubSpot' },
    { v: 'V3', verb: 'Driver operasjonen.',    ex: 'DigiHome', hot: true },
  ];
  return (
  <SlideFrame bg="dark" {...p}>
    <style>{`
      @keyframes cevUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes cevReveal { from { opacity: 0; transform: translateY(26px); filter: blur(12px); } 55% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute left-1/2 top-[58%] w-[55%] h-[42%] rounded-full"
           style={{ background: `radial-gradient(ellipse, ${AC}1c 0%, transparent 70%)`, filter: 'blur(50px)', transform: 'translate(-50%,-50%)' }} />
    </div>
    <DotGrid maskCenter="50% 45%" opacity={0.05} />
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,0.5) 100%)' }} />

    <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
      <div className="w-full max-w-[820px]">
        {/* eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-11"
             style={{ opacity: show ? undefined : 0, animation: active ? 'cevUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined }}>
          <span className="h-px w-7" style={{ background: `${AC}55` }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em]" style={{ ...F, color: AC }}>Tre generasjoner software</span>
          <span className="h-px w-7" style={{ background: `${AC}55` }} />
        </div>

        {/* generasjonene */}
        <div>
          {GENS.map((g: any, i: number) => (
            <div key={g.v}
                 className="relative flex items-center justify-between gap-5 py-6 sm:py-7"
                 style={{ borderTop: `1px solid ${g.hot ? AC + '3a' : 'rgba(255,255,255,0.08)'}`,
                          opacity: show ? undefined : 0,
                          animation: active ? `cevUp 0.85s cubic-bezier(0.22,1,0.36,1) ${0.7 + i * 0.78}s both` : undefined }}>
              {g.hot && <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                             style={{ background: `radial-gradient(ellipse at 28% 50%, ${AC}24 0%, transparent 62%)`, filter: 'blur(18px)' }} />}
              <div className="relative flex items-baseline gap-4 sm:gap-6 text-left">
                <span className="text-[12px] sm:text-[13px] font-bold tracking-[0.08em]"
                      style={{ ...F, color: g.hot ? AC : 'rgba(255,255,255,0.26)', minWidth: 26 }}>{g.v}</span>
                <span className="text-[23px] sm:text-[36px] font-bold tracking-[-0.03em] leading-[1.05]"
                      style={{ ...FH, color: g.hot ? '#fff' : 'rgba(255,255,255,0.42)', textShadow: g.hot ? `0 0 60px ${AC}44` : undefined }}>{g.verb}</span>
              </div>
              <span className="relative text-[12px] sm:text-[15px] font-semibold tracking-[-0.01em] text-right whitespace-nowrap"
                    style={{ ...F, color: g.hot ? AC : 'rgba(255,255,255,0.3)', textShadow: g.hot ? `0 0 40px ${AC}55` : undefined }}>{g.ex}</span>
            </div>
          ))}
        </div>

        {/* tesen */}
        <div className="text-center mt-12 sm:mt-14"
             style={{ opacity: show ? undefined : 0, animation: active ? 'cevReveal 1.1s cubic-bezier(0.22,1,0.36,1) 3.4s both' : undefined }}>
          <p className="text-[26px] sm:text-[40px] font-bold tracking-[-0.035em] leading-[1.08]"
             style={{ ...FH, color: '#fff', textWrap: 'balance' as any }}>
            DigiHome er <span style={{ color: AC, textShadow: `0 0 70px ${AC}55` }}>tredje generasjon.</span>
          </p>
          <p className="text-[15px] sm:text-[19px] font-normal mt-4 max-w-[520px] mx-auto"
             style={{ ...F, color: 'rgba(255,255,255,0.5)', textWrap: 'balance' as any }}>
            Ikke et bedre verktøy — en ny kategori software.
          </p>
        </div>
      </div>
    </div>
  </SlideFrame>
  );
};

const PROCESS_LOGOS = [
  { src: '/bankid-logo.png', alt: 'BankID' },
  { src: '/finn-logo.png', alt: 'FINN' },
  { text: 'Matrikkelen' },
  { src: '/creditsafe-logo.png', alt: 'Creditsafe' },
  { src: '/vipps-logo.png', alt: 'Vipps' },
  { src: '/fiken-logo.png', alt: 'Fiken' },
  { src: '/tripletex-logo.png', alt: 'Tripletex' },
];

const SProcessPipeline = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const AC = '#d298ff';
  const anim = active && !isPdf;
  const circleLit = { borderColor: 'rgba(210,152,255,0.55)', background: 'rgba(210,152,255,0.13)', boxShadow: '0 0 18px -5px rgba(210,152,255,0.7)' };

  return (
  <SlideFrame bg="dark" {...p}>
    <style>{`
      @keyframes pUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pHead { from { opacity: 0; transform: translateY(20px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes pCirc { from { opacity: 0.3; transform: scale(0.85); border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); box-shadow: 0 0 0 0 rgba(210,152,255,0); } to { opacity: 1; transform: scale(1); border-color: rgba(210,152,255,0.55); background: rgba(210,152,255,0.13); box-shadow: 0 0 18px -5px rgba(210,152,255,0.7); } }
      @keyframes pLbl { from { opacity: 0.2; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pConn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes pDrift { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      @keyframes pSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[34%] left-1/2 -translate-x-1/2 w-[70%] h-[40%] rounded-full"
           style={{ background: `radial-gradient(ellipse, ${AC}16 0%, transparent 70%)`, filter: 'blur(40px)' }} />
    </div>
    <DotGrid maskCenter="50% 40%" opacity={0.07} />

    <div className="max-w-[1240px] mx-auto px-6 sm:px-12 w-full relative z-10 my-auto">

      {/* ── header ── */}
      <div className="text-center max-w-[820px] mx-auto">
        <div className="inline-flex items-center gap-2.5 mb-6"
             style={{ animation: active ? 'pUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' : undefined, opacity: show ? undefined : 0 }}>
          <span className="h-px w-6" style={{ background: AC }} />
          <span className="text-[10.5px] font-medium uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.55)', ...F }}>Kartlagt av utleiere — automatisert fra ende til ende</span>
          <span className="h-px w-6" style={{ background: AC }} />
        </div>
        <h2 className="tracking-[-0.035em] leading-[1.0]"
            style={{ ...FH, fontWeight: 700, fontSize: 'clamp(34px, 4.2vw, 60px)', animation: active ? 'pHead 0.9s cubic-bezier(0.22,1,0.36,1) 0.28s both' : undefined, opacity: show ? undefined : 0 }}>
          <span className="text-white">Hele utleieprosessen. </span>
          <span style={{ color: AC }}>Ett system.</span>
        </h2>
        <p className="text-[14.5px] sm:text-[16px] leading-[1.55] font-normal mt-5 max-w-[680px] mx-auto"
           style={{ ...F, color: 'rgba(255,255,255,0.58)', animation: active ? 'pUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
          Utleie følger en standardisert prosess. Vi er utleiere selv — har kartlagt hvert manuelle steg
          og automatisert hele kjeden, fra lead til løpende forvaltning.
        </p>
      </div>

      {/* ── pipeline ── */}
      <div className="mt-14 sm:mt-16 flex items-start justify-center">
        {PROCESS_STAGES.map((s, i) => {
          const Icon = s.icon;
          const d = 0.7 + i * 0.4;
          return (
            <React.Fragment key={s.title}>
              <div className="flex flex-col items-center text-center" style={{ width: '124px' }}>
                <span className="text-[9px] font-bold tabular-nums tracking-[0.1em] mb-2.5" style={{ color: 'rgba(255,255,255,0.3)', ...F }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="w-[52px] h-[52px] rounded-[15px] flex items-center justify-center border"
                      style={{ ...circleLit, animation: anim ? `pCirc 0.55s cubic-bezier(0.22,1,0.36,1) ${d}s both` : undefined }}>
                  <Icon className="w-[22px] h-[22px]" style={{ color: '#e9d6ff' }} strokeWidth={1.7} />
                </span>
                <p className="text-[13px] font-semibold text-white tracking-[-0.01em] mt-3.5"
                   style={{ ...F, animation: anim ? `pLbl 0.5s ease ${d + 0.1}s both` : undefined, opacity: show ? undefined : 0 }}>{s.title}</p>
                <p className="text-[11px] font-normal leading-[1.35] mt-1 px-1"
                   style={{ color: 'rgba(255,255,255,0.46)', ...F, animation: anim ? `pLbl 0.5s ease ${d + 0.15}s both` : undefined, opacity: show ? undefined : 0 }}>{s.sub}</p>
              </div>

              {i < PROCESS_STAGES.length - 1 && (
                <div className="flex-1 mt-[33px] h-[2px] mx-0.5 relative max-w-[60px]" style={{ background: 'rgba(255,255,255,0.09)' }}>
                  <div className="absolute inset-y-0 left-0 w-full rounded-full" style={{ transformOrigin: 'left', background: `linear-gradient(90deg, ${AC}, #ecd9ff)`, animation: anim ? `pConn 0.42s ease ${d + 0.22}s both` : undefined }} />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* arrow + drift endpoint */}
        <div className="flex items-center mt-[26px]" style={{ animation: anim ? 'pDrift 0.6s cubic-bezier(0.22,1,0.36,1) 3.6s both' : undefined, opacity: show ? undefined : 0 }}>
          <ArrowRight className="w-4 h-4 mx-1.5" style={{ color: 'rgba(255,255,255,0.35)' }} strokeWidth={2} />
          <div className="flex flex-col items-center text-center" style={{ width: '120px' }}>
            <span className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: `${AC}1f`, border: `1px solid ${AC}66`, boxShadow: `0 0 22px -6px ${AC}` }}>
              <Loader2 className="w-[22px] h-[22px]" style={{ color: AC, animation: anim ? 'pSpin 4s linear infinite' : undefined }} strokeWidth={2} />
            </span>
            <p className="text-[13px] font-semibold mt-3.5" style={{ color: '#e9d6ff', ...F }}>Drift</p>
            <p className="text-[11px] font-normal leading-[1.35] mt-1" style={{ color: 'rgba(255,255,255,0.46)', ...F }}>Autopilot, kontinuerlig</p>
          </div>
        </div>
      </div>

      {/* ── integrasjoner ── */}
      <div className="mt-14 flex items-center justify-center gap-2.5 flex-wrap"
           style={{ animation: active ? 'pUp 0.7s cubic-bezier(0.22,1,0.36,1) 1.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] mr-1.5" style={{ color: 'rgba(255,255,255,0.4)', ...F }}>Integrert med</span>
        {PROCESS_LOGOS.map((l, i) => (
          l.text ? (
            <span key={i} className="inline-flex items-center h-[30px] px-3 rounded-lg text-[11.5px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', ...F }}>{l.text}</span>
          ) : (
            <span key={i} className="inline-flex items-center h-[30px] px-3 rounded-lg bg-white" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              <img src={l.src} alt={l.alt} className="h-[15px] w-auto object-contain" />
            </span>
          )
        ))}
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ MANIFEST — boligforvaltning er en standardisert, repeterbar prosess ═══ */
const PM_STAGES = ['Annonse', 'Visning', 'Kontrakt', 'Innflytting', 'Husleie', 'Vedlikehold', 'Fornyelse'];

const SVisionIntro = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const AC = '#d298ff';
  const ACL = '#d298ff';   // merkevare-lilla — brukes også på lys bakgrunn
  const INK = '#1c1815';   // varm mørk «ink» til visjon-teksten

  const [phase, setPhase] = useState<'hook' | 'vision'>(isPdf ? 'vision' : 'hook');
  useEffect(() => {
    if (isPdf) { setPhase('vision'); return; }
    if (!active) { setPhase('hook'); return; }
    setPhase('hook');
    const t = setTimeout(() => setPhase('vision'), 4400);
    return () => clearTimeout(t);
  }, [active, isPdf]);

  const onVision = phase === 'vision';

  // meld fra til deck-chrome når lyset er slått på (lys bakgrunn)
  useEffect(() => {
    p.onLight?.(active && onVision && !isPdf);
  }, [active, onVision, isPdf]);

  const beat = (target: 'hook' | 'vision') => ({
    opacity: phase === target ? 1 : 0,
    transform: phase === target ? 'translateY(0) scale(1)' : (target === 'hook' ? 'translateY(-40px) scale(0.97)' : 'translateY(40px) scale(0.97)'),
    filter: phase === target ? 'blur(0)' : 'blur(14px)',
    transition: 'opacity 1.1s cubic-bezier(0.22,1,0.36,1), transform 1.2s cubic-bezier(0.22,1,0.36,1), filter 1.05s ease',
    pointerEvents: (phase === target ? 'auto' : 'none') as any,
  });

  return (
  <SlideFrame bg="dark" {...p} revealLight={onVision}>
    <style>{`
      @keyframes viReveal { from { opacity: 0; transform: translateY(24px); filter: blur(14px); } 55% { filter: blur(0.5px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes viKen { 0% { transform: scale(1) translateY(8px); } 100% { transform: scale(1.04) translateY(-8px); } }
      @keyframes viRail { from { opacity: 0; transform: scaleY(0); } to { opacity: 1; transform: scaleY(1); } }
    `}</style>

    {/* ── MØRK AMBIENT (krok) — fader ut når lyset slås på ── */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: onVision ? 0 : 1, transition: 'opacity 1.1s ease' }}>
      <div className="absolute left-1/2 top-1/2 w-[60%] h-[62%] rounded-full"
           style={{ background: `radial-gradient(ellipse, ${AC}1f 0%, transparent 70%)`, filter: 'blur(54px)', transform: 'translate(-50%,-50%)' }} />
    </div>
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ opacity: onVision ? 0 : 1, transition: 'opacity 1.1s ease' }}>
      <DotGrid maskCenter="50% 45%" opacity={0.05} />
    </div>
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,0.5) 100%)', opacity: onVision ? 0 : 1, transition: 'opacity 1.1s ease' }} />

    {/* ── LYS DOT-GRID (visjon) — samme rene bakgrunn som øvrige lyse slides ── */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ opacity: onVision ? 1 : 0, transition: 'opacity 1.5s ease 0.15s' }}>
      <DotGrid maskCenter="50% 42%" opacity={0.4} />
    </div>

    <div className="absolute inset-0 z-10">

      {/* ── KROK (mørk, kinematisk) ── */}
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center" style={beat('hook')}>
        <h2 className="tracking-[-0.04em] leading-[0.95]" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(48px, 6.6vw, 92px)',
              animation: (active && phase === 'hook') ? 'viKen 10s cubic-bezier(0.33,0,0.2,1) both' : undefined }}>
          <span className="block text-white"
                style={{ animation: (active && phase === 'hook') ? 'viReveal 1.4s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>Ikke et system.</span>
          <span className="block"
                style={{ color: AC, textShadow: `0 0 70px ${AC}55`,
                         animation: (active && phase === 'hook') ? 'viReveal 1.4s cubic-bezier(0.22,1,0.36,1) 1.45s both' : undefined, opacity: show ? undefined : 0 }}>En autopilot.</span>
        </h2>
      </div>

      {/* ── MANIFEST · DIGIHOME FORKLART (ren, flytende tekst) ── */}
      <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-10 py-10 overflow-y-auto no-scrollbar" style={beat('vision')}>
        <div className="w-full max-w-[680px] mx-auto">
          {(() => {
            const line = (i: number) => ({
              animation: (active && onVision) ? `viReveal 1.0s cubic-bezier(0.22,1,0.36,1) ${0.28 + i * 0.12}s both` : undefined,
              opacity: show ? undefined : 0,
            });
            return (
              <>
                {/* kicker */}
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.36em]" style={{ ...F, color: ACL, ...line(0) }}>Hvorfor vi bygde DigiHome</span>

                {/* manifest — ren, flytende prosa */}
                <div className="mt-8 space-y-7" style={{ ...F, fontSize: 'clamp(17px, 1.55vw, 21px)', lineHeight: 1.72, color: INK }}>
                  <p style={line(1)}>
                    Som erfarne utleiere kjente vi problemet på kroppen: for mye av marginen forsvinner i manuelt arbeid. Boligforvaltning ser komplisert ut — men er egentlig den samme prosessen om og om igjen: annonse, visning, kontrakt, depositum, innflytting, husleie og vedlikehold, for hver eneste bolig.
                  </p>
                  <p style={line(2)}>
                    Tradisjonell proptech har bare digitalisert verktøyene: flere moduler, flere steder å klikke. Men vi ønsket oss ikke flere verktøy — vi ville at arbeidet skulle bli gjort.
                  </p>
                  <p style={line(3)}>
                    Så vi bygde DigiHome som en <span style={{ color: ACL }}>motor</span> for boligforvaltning. Systemet holder oversikt, foreslår neste steg, forbereder arbeidet og utfører det som kan automatiseres.
                  </p>
                </div>

                {/* payoff */}
                <p className="mt-9 tracking-[-0.022em] leading-[1.12]" style={{ ...FH, fontWeight: 600, fontSize: 'clamp(23px, 2.5vw, 33px)', color: INK, ...line(4) }}>
                  Mennesket har kontroll. <span style={{ color: ACL }}>Systemet gjør jobben.</span>
                </p>

                {/* signatur */}
                <div className="flex items-center gap-4 mt-12" style={line(5)}>
                  <div className="w-[72px] h-[72px] rounded-full overflow-hidden shrink-0" style={{ boxShadow: '0 10px 28px rgba(20,15,10,0.18)', border: '1px solid rgba(20,15,10,0.06)' }}>
                    <img src="/team/martin-kviteberg-face.jpg" alt="Martin C. Kviteberg" className="w-full h-full object-cover" style={{ objectPosition: 'center' }} />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[15px] font-semibold tracking-[-0.01em]" style={{ ...F, color: INK }}>Martin C. Kviteberg</p>
                    <p className="text-[12.5px] mt-0.5" style={{ ...F, color: 'rgba(28,22,16,0.5)' }}>Produktsjef &amp; Medgründer</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ PROBLEMET OG LØSNINGEN — fra verktøy (tradisjonell proptech) til motor (DigiHome) ═══ */
const SFraVerktoyTilMotor = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const INK = '#1c1815';
  const PAIRS = [
    { left: 'Et verktøy du betjener', right: 'En motor som jobber' },
    { left: 'Lagrer og viser informasjon', right: 'Forstår, forbereder og utfører' },
    { left: 'Flere moduler — mer å klikke', right: 'Ett system, én flyt' },
    { left: 'Du gjør jobben', right: 'Systemet gjør jobben', accent: true },
  ];
  const rise = (i: number) => ({
    animation: show ? `fvIn 0.85s cubic-bezier(0.22,1,0.36,1) ${0.15 + i * 0.1}s both` : undefined,
    opacity: show ? undefined : 0,
  });

  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes fvIn { from { opacity: 0; transform: translateY(20px); filter: blur(8px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes fvRail { from { opacity: 0; transform: scaleY(0); } to { opacity: 1; transform: scaleY(1); } }
    `}</style>
    <DotGrid maskCenter="50% 44%" opacity={0.4} />

    <div className="absolute inset-0 z-10 flex items-center justify-center px-6 sm:px-12 py-12 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-[1080px] mx-auto">

        {/* header */}
        <div className="text-center mb-14 sm:mb-20">
          <span className="block text-[10px] font-bold uppercase tracking-[0.46em]" style={{ ...F, color: INK, ...rise(0) }}>Løsningen</span>
          <h2 className="mt-6 tracking-[-0.045em] leading-[0.98]" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(40px, 5.4vw, 74px)', color: INK, ...rise(1) }}>
            Fra verktøy til motor.
          </h2>
        </div>

        {/* sammenligning */}
        <div className="relative">
          {/* senter-skinne */}
          <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2"
               style={{ background: 'linear-gradient(180deg, transparent, rgba(28,22,16,0.16) 12%, rgba(28,22,16,0.16) 88%, transparent)', transformOrigin: 'top',
                        animation: show ? 'fvRail 0.9s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }} />

          {/* spalte-overskrifter */}
          <div className="grid grid-cols-2 gap-x-10 sm:gap-x-20 lg:gap-x-28 mb-9 sm:mb-12">
            <div className="text-right" style={rise(2)}>
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.24em]" style={{ ...F, color: INK }}>Tradisjonell proptech</span>
            </div>
            <div className="text-left" style={rise(2)}>
              <span className="inline-flex items-center gap-2.5 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.24em]" style={{ ...F, color: INK }}>
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: P }} />DigiHome
              </span>
            </div>
          </div>

          {/* rader */}
          <div className="grid grid-cols-2 gap-x-10 sm:gap-x-20 lg:gap-x-28 gap-y-8 sm:gap-y-11 items-baseline">
            {PAIRS.map((pair, i) => (
              <React.Fragment key={i}>
                <div className="text-right pr-1 sm:pr-3" style={rise(3 + i)}>
                  <p className="leading-[1.18]" style={{ ...F, fontWeight: 400, fontSize: 'clamp(18px, 1.9vw, 26px)', color: INK }}>{pair.left}</p>
                </div>
                <div className="text-left pl-1 sm:pl-3" style={rise(3 + i)}>
                  <p className="leading-[1.18]" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(20px, 2.15vw, 30px)', color: pair.accent ? P : INK }}>{pair.right}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* innsikt — kjernebudskap (slått sammen fra «Forskjellen fra tradisjonell software») */}
        <div className="text-center mt-16 sm:mt-24 max-w-[820px] mx-auto" style={rise(7)}>
          <p className="leading-[1.5]" style={{ ...F, fontSize: 'clamp(16px, 1.55vw, 22px)', color: INK }}>
            Forskjellen er ikke antall funksjoner — men at systemet selv vet hva som er <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>neste steg</span>, og fører deg gjennom arbeidet.
          </p>
        </div>

      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ DRIFTSGEARINGEN — kjerne-tesen: samme forvalter, mange flere boliger ═══ */
const SDriftsgearing = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  const AC = '#a052e0';
  const INK = '#0c0c0c';
  const SUB = '#57514a';
  const MUT = '#8a8278';
  const HAIR = 'rgba(20,15,10,0.09)';

  const sides = [
    { label: 'Tradisjonell forvaltning', sublabel: 'Manuell drift · bransjeestimat', value: '≈50', fill: 25, accent: false },
    { label: 'DigiHome', sublabel: 'AI-drevet drift', value: '≈200', fill: 100, accent: true },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes dgFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes dgHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes dgFill { from { width: 0%; } }
      @keyframes dgPop { from { opacity: 0; transform: scale(0.82); } to { opacity: 1; transform: scale(1); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 12%, rgba(160,82,224,0.06) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 22%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1080px] mx-auto px-6 sm:px-12 my-auto">

      {/* ═══ HEADER ═══ */}
      <div className="text-center max-w-[880px] mx-auto">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]"
              style={{ ...F, color: AC, animation: anim ? 'dgFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
          Driftsgearingen
        </span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-6"
            style={{ ...FH, fontWeight: 700, fontSize: 'clamp(32px, 4.2vw, 58px)', color: INK,
                     animation: anim ? 'dgHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Samme forvalter. <span style={{ color: AC }}>4× porteføljen.</span>
        </h2>
        <p className="text-[15px] sm:text-[16.5px] font-normal leading-[1.6] mt-6 max-w-[680px] mx-auto"
           style={{ ...F, color: SUB, animation: anim ? 'dgFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: show ? undefined : 0 }}>
          Når systemet gjør grovarbeidet, blir det ikke flyttet — det forsvinner. Det endrer enhetsøkonomien i forvaltning.
        </p>
      </div>

      {/* ═══ SAMMENLIGNING ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-9 md:gap-12 items-center mt-12 sm:mt-16">
        {sides.map((s, i) => (
          <React.Fragment key={s.label}>
            {i === 1 && (
              <div className="flex md:flex-col items-center justify-center gap-x-3 gap-y-1 shrink-0"
                   style={{ animation: anim ? 'dgPop 0.7s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: show ? undefined : 0 }}>
                <span className="tracking-[-0.03em] leading-none" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(30px, 3.1vw, 46px)', color: AC }}>≈4×</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ ...F, color: MUT }}>gearing</span>
              </div>
            )}
            <div style={{ animation: anim ? `dgFade 0.8s cubic-bezier(0.22,1,0.36,1) ${0.7 + i * 0.18}s both` : undefined, opacity: show ? undefined : 0 }}>
              <div className="flex items-end justify-between gap-3 mb-3.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ ...F, color: s.accent ? AC : INK }}>{s.label}</p>
                  <p className="text-[11px] font-normal mt-1.5" style={{ ...F, color: MUT }}>{s.sublabel}</p>
                </div>
                <p className="tracking-[-0.04em] leading-none tabular-nums shrink-0" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(42px, 4.8vw, 66px)', color: s.accent ? AC : INK }}>{s.value}</p>
              </div>
              {/* kapasitets-skinne */}
              <div className="h-[10px] rounded-full overflow-hidden" style={{ background: 'rgba(20,15,10,0.07)' }}>
                <div className="h-full rounded-full" style={{
                  width: show ? `${s.fill}%` : '0%',
                  background: s.accent ? `linear-gradient(90deg, ${AC}, #c39ce0)` : 'rgba(20,15,10,0.30)',
                  boxShadow: s.accent ? `0 0 18px ${AC}55` : 'none',
                  animation: anim ? `dgFill 1.1s cubic-bezier(0.22,1,0.36,1) ${0.95 + i * 0.18}s both` : undefined,
                }} />
              </div>
              <p className="text-[12px] font-medium mt-2.5" style={{ ...F, color: SUB }}>boliger per årsverk</p>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ═══ PAYOFF-KODA ═══ */}
      <div className="mt-12 sm:mt-16 pt-9 text-center"
           style={{ borderTop: `1px solid ${HAIR}`, animation: anim ? 'dgFade 0.9s cubic-bezier(0.22,1,0.36,1) 1.35s both' : undefined, opacity: show ? undefined : 0 }}>
        <p className="tracking-[-0.018em] leading-[1.4] max-w-[900px] mx-auto" style={{ ...FH, fontWeight: 600, fontSize: 'clamp(18px, 2vw, 26px)', color: INK }}>
          Marginalkostnaden per ny bolig faller mot null → <span style={{ color: AC }}>~82 % bruttomargin</span>. Hver franchise kopierer nøyaktig samme gearing.
        </p>
      </div>
    </div>
  </SlideFrame>
  );
};




/* ═══ FORRETNINGSMODELLER — Egen forvaltning (bevis) + Franchise (skalering) · én plattform ═══ */
const BIZ_MODELS = [
  {
    idx: '01', tag: 'EGEN DRIFT', market: 'Flaggskip', label: 'DigiHome forvaltning',
    who: 'Egendrevet — Bergen først',
    desc: 'Vi drifter selv som profesjonell utleiemegler og forvalter. Beviser enhetsøkonomien, bygger merkevaren og leverer referansene franchisemodellen hviler på.',
    traits: 'Full forvaltning · Take-rate · FINN-trygt',
    model: 'Forvaltningshonorar', modelSub: '~10 % av leien',
  },
  {
    idx: '02', tag: 'FRANCHISE', market: 'Skalering', label: 'Lokale DigiHome-operatører',
    who: 'Franchisetakere over hele landet',
    desc: 'Lokale operatører driver forvaltning under DigiHome-merket, på vår plattform. Kapital-lett skalering — de tar med lokal kapital, relasjoner og drift.',
    traits: 'Plattform · Nasjonal merkevare · Per enhet',
    model: 'Plattform per enhet', modelSub: '+ etablering & royalty',
  },
];

const SBusinessModels = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0';      // lesbar merkevare-lilla på lys bakgrunn
  const INK = '#0c0c0c';
  const INK2 = '#1c1714';
  const SUB = '#57514a';
  const MUT = '#8a8278';
  const FAINT = '#a8a097';
  const HAIR = 'rgba(20,15,10,0.10)';
  const anim = active && !isPdf;
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes bmFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes bmGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    {/* ambient — flatt og rolig */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 28%, rgba(160,82,224,0.05) 0%, transparent 55%)' }} />
    <DotGrid maskCenter="50% 30%" opacity={0.36} />

    <div className="relative z-10 w-full max-w-[1060px] mx-auto px-6 sm:px-12 my-auto">
      {/* eyebrow + tittel — venstrejustert */}
      <div style={{ animation: anim ? 'bmFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ ...F, color: AC }}>Forretningsmodell</span>
        <h2 className="tracking-[-0.03em] leading-[1.05] mt-5"
            style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.4vw, 46px)', color: INK }}>
          To spor. Én plattform.
        </h2>
        <p className="text-[14.5px] sm:text-[16px] font-normal leading-[1.6] mt-4 max-w-[600px]" style={{ ...F, color: SUB }}>
          DigiHome vokser i to spor — egen drift som bevis, franchise som motor — på samme plattform.
        </p>
      </div>

      {/* hårlinje */}
      <div className="h-px w-full mt-10 origin-left" style={{ background: HAIR, animation: anim ? 'bmGrow 0.9s cubic-bezier(0.4,0,0.1,1) 0.35s both' : undefined, opacity: show ? undefined : 0 }} />

      {/* to spalter — nøytralt skille, ingen pynt */}
      <div className="grid grid-cols-1 md:grid-cols-2 mt-12 sm:mt-14">
        {BIZ_MODELS.map((m: any, i: number) => (
          <div key={m.tag}
               className={`relative ${i === 0 ? 'md:pr-16' : 'md:pl-16 md:border-l border-t md:border-t-0 mt-12 pt-12 md:mt-0 md:pt-0'}`}
               style={{ borderColor: HAIR,
                        animation: anim ? `bmFade 0.8s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.12}s both` : undefined,
                        opacity: show ? undefined : 0 }}>

            {/* index + marked + tag */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-3.5">
                <span className="text-[14px] font-bold tabular-nums tracking-[-0.01em]" style={{ ...F, color: AC }}>{m.idx}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ ...F, color: MUT }}>{m.market}</span>
              </div>
              <span className="text-[11px] font-medium tracking-[0.16em]" style={{ ...F, color: FAINT }}>{m.tag}</span>
            </div>

            {/* tittel + hvem */}
            <h3 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.028em] leading-[1.05] mt-7" style={{ ...FH, color: INK }}>{m.label}</h3>
            <p className="text-[13.5px] font-medium mt-2.5" style={{ ...F, color: MUT }}>{m.who}</p>

            {/* verdi */}
            <p className="text-[14px] sm:text-[15px] font-normal leading-[1.65] mt-6 max-w-[400px]" style={{ ...F, color: SUB }}>{m.desc}</p>

            {/* egenskaper */}
            <p className="text-[12.5px] font-normal tracking-[0.005em] leading-[1.5] mt-7" style={{ ...F, color: MUT }}>{m.traits}</p>

            {/* inntektsmodell */}
            <div className="inline-flex items-baseline gap-2.5 mt-9 flex-wrap rounded-xl px-4 py-3"
                 style={{ background: 'rgba(160,82,224,0.05)', border: `1px solid ${HAIR}` }}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ ...F, color: AC }}>Inntekt</span>
              <span className="text-[17px] sm:text-[19px] font-semibold tracking-[-0.015em]" style={{ ...FH, color: INK2 }}>{m.model}</span>
              <span className="text-[13px] font-normal" style={{ ...F, color: MUT }}>· {m.modelSub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* hårlinje */}
      <div className="h-px w-full mt-12 sm:mt-14 origin-left" style={{ background: HAIR, animation: anim ? 'bmGrow 0.9s cubic-bezier(0.4,0,0.1,1) 0.9s both' : undefined, opacity: show ? undefined : 0 }} />

      {/* payoff — rolig, uten fargeord */}
      <p className="text-[14.5px] sm:text-[16px] font-normal leading-[1.6] mt-7 max-w-[680px]"
         style={{ ...F, color: SUB, animation: anim ? 'bmFade 0.9s cubic-bezier(0.22,1,0.36,1) 1.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <span style={{ color: INK2, fontWeight: 600 }}>Egen drift beviser modellen — franchise skalerer den.</span> Vi tjener recurring per enhet på tvers av nettverket, mens lokale operatører tar med kapital og drift. Kapital-lett vekst på samme infrastruktur.
      </p>
    </div>
  </SlideFrame>
  );
};


/* ═══ S05b · Betalingsmodell — B2C (% av leie) + B2B (SaaS per enhet) ═══ */
const SBetalingsmodell = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  const AC = '#a052e0';      // lesbar merkevare-lilla på lys bakgrunn
  const INK = '#0c0c0c';
  const INK2 = '#1c1714';
  const SUB = '#57514a';
  const MUT = '#8a8278';
  const FAINT = '#a8a097';
  const HAIR = 'rgba(20,15,10,0.10)';
  const TIERS = [
    {
      seg: 'Huseier · Forvaltning', name: 'Full forvaltning', pre: '', big: '10%', unit: 'av leien',
      desc: 'Vi tar hele driften — som en profesjonell utleiemegler. Langtid.',
      feats: ['Annonsering, visning og kontrakt', 'All leietaker-kommunikasjon — automatisert', 'Drift, vedlikehold og oppgjør', 'Huseier løfter aldri en finger'],
      hl: false, badge: '',
    },
    {
      seg: 'Franchise', name: 'Plattform per enhet', pre: 'fra', big: '199 kr', unit: 'per enhet / mnd',
      desc: 'Lokale operatører driver på DigiHome-plattformen. Recurring og skalerbart.',
      feats: ['Plattform + nasjonal merkevare', 'Etableringsavgift ved oppstart', 'Liten royalty-andel på toppen', '3–4× flere enheter per årsverk'],
      hl: true, badge: 'Vekstmotoren',
    },
    {
      seg: 'Transaksjon · Engangs', name: 'Finn leietaker', pre: '', big: 'Engangs', unit: 'utleiemegling per leieforhold',
      desc: 'Frittstående utleiemegling — og trakt inn til full forvaltning.',
      feats: ['Engangsgebyr ved nytt leieforhold', 'Depositum, kredittsjekk, e-sign', 'Kanalpublisering inkludert', 'Oppselg til løpende forvaltning'],
      hl: false, badge: '',
    },
  ];
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes payFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes payCard { from { opacity: 0; transform: translateY(22px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 28%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1180px] mx-auto px-6 sm:px-12 my-auto">
      {/* header */}
      <div className="mb-9 sm:mb-11" style={{ animation: anim ? 'payFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ ...F, color: AC }}>Betalingsmodell</span>
        <h2 className="tracking-[-0.03em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.4vw, 46px)', color: INK }}>
          Prising som følger verdien.
        </h2>
        <p className="text-[14.5px] sm:text-[16px] font-normal leading-[1.6] mt-4 max-w-[660px]" style={{ ...F, color: SUB }}>
          Tre inntektskilder: forvaltningshonorar fra huseier, recurring plattformavgift fra franchise, og utleiemegling per leieforhold.
        </p>
      </div>

      {/* tre nivåer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((t, i) => (
          <div key={t.name}
               className="relative rounded-[22px] p-7 flex flex-col"
               style={{
                 background: t.hl ? 'linear-gradient(180deg, rgba(160,82,224,0.08), rgba(160,82,224,0.022))' : '#ffffff',
                 border: t.hl ? `1.5px solid rgba(160,82,224,0.40)` : '1px solid rgba(20,15,10,0.08)',
                 boxShadow: t.hl ? '0 34px 80px -34px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.7)' : '0 26px 60px -34px rgba(20,15,10,0.20), inset 0 1px 0 rgba(255,255,255,0.7)',
                 animation: anim ? `payCard 0.8s cubic-bezier(0.22,1,0.36,1) ${0.45 + i * 0.12}s both` : undefined,
                 opacity: show ? undefined : 0,
               }}>
            {t.badge && (
              <span className="absolute top-5 right-5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full"
                    style={{ ...F, background: AC, color: '#fff' }}>
                <Sparkles className="w-3 h-3" strokeWidth={2.4} /> {t.badge}
              </span>
            )}

            <span className="text-[10.5px] font-bold uppercase tracking-[0.2em]" style={{ ...F, color: MUT }}>{t.seg}</span>
            <h3 className="text-[23px] font-bold tracking-[-0.02em] leading-tight mt-2.5" style={{ ...FH, color: INK }}>{t.name}</h3>

            {/* pris */}
            <div className="flex items-end gap-2 mt-6">
              {t.pre && <span className="text-[14px] font-medium mb-2.5" style={{ ...F, color: MUT }}>{t.pre}</span>}
              <span className="font-bold tracking-[-0.04em] leading-[0.9]" style={{ ...FH, color: t.hl ? AC : INK, fontSize: 'clamp(40px, 4.6vw, 56px)' }}>{t.big}</span>
            </div>
            <span className="text-[13px] font-normal mt-1.5" style={{ ...F, color: MUT }}>{t.unit}</span>

            <p className="text-[13.5px] font-normal leading-[1.55] mt-4" style={{ ...F, color: SUB }}>{t.desc}</p>

            <div className="h-px w-full my-6" style={{ background: HAIR }} />

            <ul className="flex flex-col gap-3 mt-auto">
              {t.feats.map((f, fi) => (
                <li key={fi} className="flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full shrink-0 mt-0.5" style={{ background: t.hl ? AC : 'rgba(160,82,224,0.14)' }}>
                    <Check className="w-[11px] h-[11px]" strokeWidth={3} style={{ color: t.hl ? '#fff' : AC }} />
                  </span>
                  <span className="text-[12.5px] font-normal leading-snug" style={{ ...F, color: fi === 0 && t.hl ? INK2 : SUB, fontWeight: fi === 0 && t.hl ? 600 : 400 }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* payoff */}
      <p className="text-[14px] sm:text-[15px] font-normal leading-[1.6] mt-9 text-center mx-auto max-w-[720px]"
         style={{ ...F, color: SUB, animation: anim ? 'payFade 0.9s cubic-bezier(0.22,1,0.36,1) 0.95s both' : undefined, opacity: show ? undefined : 0 }}>
        <span style={{ color: INK2, fontWeight: 600 }}>Prisen følger verdien vi skaper.</span> Recurring per enhet på tvers av nettverket — og vi tjener først når utleier får leid ut. Ingen bindingstid, ingen skjulte gebyrer.
      </p>
    </div>
  </SlideFrame>
  );
};

/* ═══ S05c · Allerede i drift — DigiHome genererer inntekter i dag (traksjon) ═══ */
const SAlleredeInntekter = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  const AC = '#a052e0';      // lesbar merkevare-lilla på lys bakgrunn
  const INK = '#0c0c0c';
  const INK2 = '#1c1714';
  const SUB = '#57514a';
  const MUT = '#8a8278';
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  const STATS = [
    { big: '40', unit: '', label: 'Huseiere på fullforvaltning', sub: 'betalende kunder i dag', hl: false },
    { big: '3 000', unit: 'kr', label: 'Snitt inntekt per bolig / mnd', sub: 'faktisk snitt Bergen · 10 % av leien', hl: false },
    { big: '120 000', unit: 'kr', label: 'Månedlig inntekt · MRR', sub: 'tilbakevendende, hver måned', hl: false },
    { big: '1,44', unit: 'MNOK', label: 'Årlig inntektsbasis · ARR', sub: 'løpende — før skalert salg', hl: true },
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes traFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes traCard { from { opacity: 0; transform: translateY(22px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes traPulse { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 26%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1180px] mx-auto px-6 sm:px-12 my-auto">
      {/* header */}
      <div className="mb-10 sm:mb-12" style={{ animation: anim ? 'traFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ ...F, color: AC }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#22a06b', animation: anim ? 'traPulse 2s ease-in-out infinite' : undefined }} />
          Traksjon · allerede i drift
        </span>
        <h2 className="tracking-[-0.03em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 48px)', color: INK }}>
          Vi genererer allerede <span style={{ color: AC }}>inntekter.</span>
        </h2>
        <p className="text-[14.5px] sm:text-[16px] font-normal leading-[1.6] mt-4 max-w-[700px]" style={{ ...F, color: SUB }}>
          DigiHome er ikke et konsept. Vi har <span style={{ color: INK2, fontWeight: 600 }}>40 betalende huseiere</span> på fullforvaltning i Bergen i dag — den beviste prototypen hver franchise skal replikere.
        </p>
      </div>

      {/* fire nøkkeltall */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {STATS.map((s, i) => (
          <div key={s.label}
               className="relative rounded-[22px] p-7 flex flex-col"
               style={{
                 background: s.hl ? 'linear-gradient(180deg, rgba(160,82,224,0.09), rgba(160,82,224,0.025))' : '#ffffff',
                 border: s.hl ? '1.5px solid rgba(160,82,224,0.42)' : '1px solid rgba(20,15,10,0.08)',
                 boxShadow: s.hl ? '0 34px 80px -34px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.7)' : '0 26px 60px -34px rgba(20,15,10,0.20), inset 0 1px 0 rgba(255,255,255,0.7)',
                 animation: anim ? `traCard 0.8s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.12}s both` : undefined,
                 opacity: show ? undefined : 0,
               }}>
            {s.hl && (
              <span className="absolute top-5 right-5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ ...F, background: AC, color: '#fff' }}>
                <TrendingUp className="w-3 h-3" strokeWidth={2.6} /> Vokser
              </span>
            )}
            <div className="flex items-end gap-1.5">
              <span className="font-bold tracking-[-0.04em] leading-[0.9]" style={{ ...FH, color: s.hl ? AC : INK, fontSize: 'clamp(32px, 4vw, 52px)' }}>{s.big}</span>
              {s.unit && <span className="text-[16px] font-semibold mb-2" style={{ ...F, color: s.hl ? AC : MUT }}>{s.unit}</span>}
            </div>
            <span className="text-[13.5px] font-semibold mt-4 tracking-[-0.01em]" style={{ ...FH, color: INK2 }}>{s.label}</span>
            <span className="text-[12.5px] font-normal leading-snug mt-1.5" style={{ ...F, color: MUT }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* payoff */}
      <p className="text-[14px] sm:text-[15px] font-normal leading-[1.6] mt-9 text-center mx-auto max-w-[760px]"
         style={{ ...F, color: SUB, animation: anim ? 'traFade 0.9s cubic-bezier(0.22,1,0.36,1) 0.95s both' : undefined, opacity: show ? undefined : 0 }}>
        <span style={{ color: INK2, fontWeight: 600 }}>40 boliger × 3 000 kr/mnd = 120 000 kr i månedlig inntekt.</span> Dette er prototypen — bevist i Bergen. Franchise gjør den nasjonal. <span style={{ color: MUT }}>(Unit economics regner forsiktig med ~2 000 kr/enhet — Bergen ligger over.)</span>
      </p>
    </div>
  </SlideFrame>
  );
};



/* ═══ S04d · Filosofien bak DigiHome — fire grunnpilarer (manifest, dark) ═══ */
const SFilosofi = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0';      // lesbar merkevare-lilla på lys bakgrunn
  const INK = '#0c0c0c';
  const SUB = '#57514a';
  const PILLARS = [
    { no: '01', Icon: Settings, t: 'Best practice som standard.', d: 'Boligforvaltning er de samme prosessene, om og om igjen. Alt som kan automatiseres, blir automatisert. Det som gjenstår er det menneskelige — relasjon og salg.' },
    { no: '02', Icon: Zap, t: 'Hypermoderne grensesnitt. Null friksjon.', d: 'Aldri som en tung enterprise-ERP — ikke ett unødvendig klikk. Finnes en smartere vei, bygger vi den inn.' },
    { no: '03', Icon: Shield, t: 'AI der det skaper verdi — innenfor faste rammer.', d: 'Systemet er et rammeverk med hele prosessen fra A til Å. AI jobber på toppen av driftsprosedyrene — kraftfullt, men alltid innenfor definerte rammer.' },
    { no: '04', Icon: TrendingUp, t: 'Bygget for skala. Data som forsterker seg selv.', d: 'Hver prosess gir strukturert data som gjør automatiseringen og AI-en stadig bedre — mens marginalkostnaden faller mot null når vi vokser.' },
  ];
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes filFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes filGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    `}</style>

    <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 16%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 24%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 sm:px-12 my-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-y-12 lg:gap-x-20 items-center">

        {/* ── VENSTRE — rolig editorial intro ── */}
        <div style={{ animation: anim ? 'filFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
          <span className="text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC }}>Fundamentet</span>
          <h2 className="tracking-[-0.035em] leading-[1.02] mt-6" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(34px, 4.2vw, 60px)', color: INK }}>
            Filosofien<br />bak DigiHome.
          </h2>
          <span className="block mt-8 mb-7 h-px rounded-full" style={{ width: 64, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left', animation: anim ? 'filGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined }} />
          <p className="text-[15px] sm:text-[16.5px] font-normal leading-[1.62] max-w-[400px]" style={{ ...F, color: SUB }}>
            Fire grunnpilarer styrer hver eneste beslutning vi tar i produktet.
          </p>
        </div>

        {/* ── HØYRE — fire pilarer, hårlinje-separert, ingen bokser ── */}
        <div>
          {PILLARS.map((p2, i) => (
            <div key={p2.no} className="relative flex gap-6 sm:gap-8 py-6 sm:py-[26px]"
                 style={{
                   borderTop: i === 0 ? 'none' : '1px solid rgba(20,15,10,0.09)',
                   animation: anim ? `filFade 0.8s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.13}s both` : undefined,
                   opacity: show ? undefined : 0,
                 }}>
              <span className="shrink-0 tabular-nums leading-none pt-1" style={{ ...FH, fontWeight: 600, fontSize: 17, color: AC, letterSpacing: '0.04em' }}>
                {p2.no}
              </span>
              <div className="min-w-0">
                <h3 className="text-[19px] sm:text-[21px] font-bold tracking-[-0.02em] leading-[1.22]" style={{ ...FH, color: INK }}>{p2.t}</h3>
                <p className="text-[13.5px] sm:text-[14.5px] font-normal leading-[1.6] mt-2.5" style={{ ...F, color: SUB }}>{p2.d}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  </SlideFrame>
  );
};


/* ═══ SLIDE ORDER ═══ */
/* ═══ S04a · Arkitekturen — alt flyter inn i Autopiloten (animert systemskisse) ═══ */
const SArkitektur = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const DINK = '#1c1815';
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes arkIn { from { opacity: 0; transform: translateY(20px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes arkFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <DotGrid maskCenter="50% 30%" opacity={0.4} />
    <div className="mx-auto self-stretch px-6 sm:px-12 w-full relative z-10 flex flex-col justify-center" style={{ maxWidth: 1340 }}>
      <div className="mb-7 sm:mb-11">
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-[0.42em] mb-3" style={{ ...F, color: DINK, animation: active ? 'arkFade 0.7s ease 0.1s both' : undefined, opacity: active ? undefined : 0 }}>Arkitekturen</span>
            <h2 className="font-bold tracking-[-0.042em] leading-[1.0]" style={{ ...FH, fontWeight: 700, color: DINK, fontSize: 'clamp(28px, 3.8vw, 50px)', animation: active ? 'arkIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined, opacity: active ? undefined : 0 }}>
              Alt flyter inn i Autopiloten.
            </h2>
          </div>
          <p className="font-light leading-[1.55] max-w-[360px] mb-1" style={{ ...F, color: '#5a564d', fontSize: 'clamp(11.5px, 1vw, 13.5px)', animation: active ? 'arkFade 0.7s ease 0.4s both' : undefined, opacity: active ? undefined : 0 }}>
            Et komplett forvaltningssystem i bunn — men der andre lagrer data, lar DigiHome den jobbe.
          </p>
        </div>
      </div>
      <AutopilotArchitecture active={active} pdfMode={isPdf} />
    </div>
  </SlideFrame>
  );
};

/* ═══ S04b · Produktet — Én motor. To produkter. (B2B desktop + B2C mobil) ═══ */
const SProdukt = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const DINK = '#1c1815';
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  return (
  <SlideFrame bg="white" {...p}>
    <style>{`
      @keyframes prodHIn { from { opacity: 0; transform: translateY(20px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes prodHFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <div className="mx-auto self-stretch px-6 sm:px-10 w-full relative z-10 flex flex-col justify-center" style={{ maxWidth: 1440 }}>
      <ProductDuo active={active} pdfMode={!!p.pdfMode} />
    </div>
  </SlideFrame>
  );
};

/* ═══ S04c · AI som forstår eiendom — 3 praktiske AI-moats m/ menneske-godkjenning ═══ */
const SAIEiendom = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  return (
  <SlideFrame bg="beige" {...p}>
    <DotGrid maskCenter="50% 28%" opacity={0.4} />
    <AIEiendom active={active} pdfMode={isPdf} />
  </SlideFrame>
  );
};

/* ═══ S04 · Systemet i arbeid — scriptet kontrakt-demo (ekte produkt-UI) ═══ */
const SSystemIArbeid = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const DINK = '#1c1815';
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes siaIn { from { opacity: 0; transform: translateY(22px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes siaFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <div className="mx-auto px-6 sm:px-12 w-full relative z-10" style={{ maxWidth: 1320 }}>
      {/* editorial header */}
      <div className="mb-5 sm:mb-7">
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-[0.42em] mb-3" style={{ ...F, color: DINK, animation: active ? 'siaFade 0.7s ease 0.1s both' : undefined, opacity: active ? undefined : 0 }}>Systemet i arbeid</span>
            <h2 className="font-bold tracking-[-0.042em] leading-[1.02]" style={{ ...FH, fontWeight: 700, color: DINK, fontSize: 'clamp(28px, 3.8vw, 50px)', animation: active ? 'siaIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined, opacity: active ? undefined : 0 }}>
              Én kommando. Systemet gjør resten.
            </h2>
          </div>
          <p className="font-light leading-[1.55] max-w-[330px] mb-1" style={{ ...F, color: '#5a564d', fontSize: 'clamp(11.5px, 1vw, 13.5px)', animation: active ? 'siaFade 0.7s ease 0.4s both' : undefined, opacity: active ? undefined : 0 }}>
            Fra «lag leiekontrakt» til ferdig utkast — leietaker, leie, datoer og depositum fylt ut automatisk.
          </p>
        </div>
      </div>

      {/* ramme — ekte produkt-UI, scriptet */}
      <div style={{ animation: active && !isPdf ? 'siaIn 1.1s cubic-bezier(0.16,1,0.3,1) 0.45s both' : undefined, opacity: (active || isPdf) ? 1 : 0 }}>
        <ContractDemo active={active} pdfMode={isPdf} />
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIK JOBBER VI — verdikjeden (utleiemegling + forvaltning) ═══ */
const SSlikViJobber = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  const AC = '#a052e0'; const INK = '#0c0c0c'; const SUB = '#57514a'; const MUT = '#8a8278'; const HAIR = 'rgba(20,15,10,0.09)';

  const phases = [
    { tag: 'Fase 1', name: 'Anskaffelse', steps: [
      { n: '01', label: 'Markedsføring', note: 'sosiale medier' },
      { n: '02', label: 'Leads inn', note: 'via digihome.no' },
      { n: '03', label: 'Kontakt huseier', note: '' },
      { n: '04', label: 'Befaring', note: 'hjemme hos huseier' },
      { n: '05', label: 'Forvaltningsavtale', note: 'signeres' },
    ]},
    { tag: 'Fase 2', name: 'Utleie', steps: [
      { n: '06', label: 'Annonsering', note: 'Finn.no + DigiHome' },
      { n: '07', label: 'Visning', note: 'med leietakere' },
      { n: '08', label: 'Husleiekontrakt', note: 'signeres' },
      { n: '09', label: 'Overtagelse', note: 'med leietaker' },
    ]},
    { tag: 'Fase 3', name: 'Forvaltning', steps: [
      { n: '10', label: 'Løpende drift', note: 'av leieforholdet' },
      { n: '11', label: 'Utflytting', note: '→ klar for ny runde' },
    ]},
  ];

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes sjFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes sjHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes sjGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes sjRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    `}</style>
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 12%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 22%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 sm:px-12 my-auto">
      {/* HEADER */}
      <div className="max-w-[900px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC, animation: anim ? 'sjFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>Slik jobber vi</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-6" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(30px, 3.9vw, 52px)', color: INK, animation: anim ? 'sjHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Hele verdikjeden — <span style={{ color: AC }}>fra lead til leieforhold.</span>
        </h2>
        <span className="block mt-7 h-px rounded-full" style={{ width: 64, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left', animation: anim ? 'sjGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: show ? undefined : 0 }} />
        <p className="text-[15px] sm:text-[16.5px] font-normal leading-[1.6] mt-7 max-w-[680px]" style={{ ...F, color: SUB, animation: anim ? 'sjFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.65s both' : undefined, opacity: show ? undefined : 0 }}>
          Vi er utleiemegler og forvalter i ett. Hver bolig følger den samme, repeterbare syklusen.
        </p>
      </div>

      {/* 3 FASER — hårlinje-separerte kolonner */}
      <div className="grid grid-cols-1 md:grid-cols-3 mt-10 sm:mt-12">
        {phases.map((ph, pi) => (
          <div key={ph.tag} className="relative md:px-9 first:md:pl-0 last:md:pr-0 py-7 md:py-0"
               style={{ animation: anim ? `sjFade 0.8s cubic-bezier(0.22,1,0.36,1) ${0.8 + pi * 0.14}s both` : undefined, opacity: show ? undefined : 0 }}>
            {pi > 0 && <span aria-hidden="true" className="hidden md:block absolute left-0 top-1 bottom-1 w-px" style={{ background: HAIR, transformOrigin: 'top', animation: anim ? `sjRise 0.7s cubic-bezier(0.22,1,0.36,1) ${0.85 + pi * 0.14}s both` : undefined }} />}
            {pi > 0 && <span aria-hidden="true" className="md:hidden absolute left-0 right-0 top-0 h-px" style={{ background: HAIR }} />}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ ...F, color: AC }}>{ph.tag}</span>
              <span className="text-[14px] tracking-[-0.01em]" style={{ ...FH, fontWeight: 700, color: INK }}>{ph.name}</span>
              <span className="h-px flex-1" style={{ background: HAIR }} />
            </div>
            <div className="space-y-3.5">
              {ph.steps.map((s) => (
                <div key={s.n} className="flex items-baseline gap-3">
                  <span className="text-[11px] font-bold tabular-nums tracking-[0.08em] w-5 shrink-0" style={{ ...F, color: AC }}>{s.n}</span>
                  <span className="leading-[1.3]">
                    <span className="text-[15px] sm:text-[16px] font-medium" style={{ ...F, color: INK }}>{s.label}</span>
                    {s.note && <span className="text-[13px] font-normal ml-1.5" style={{ ...F, color: MUT }}>{s.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CODA — repeterbar */}
      <div className="mt-10 sm:mt-12 pt-8 flex items-center gap-3"
           style={{ borderTop: `1px solid ${HAIR}`, animation: anim ? 'sjFade 0.9s cubic-bezier(0.22,1,0.36,1) 1.25s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="text-[17px] font-bold leading-none" style={{ color: AC }}>↻</span>
        <p className="text-[13.5px] sm:text-[15px] font-normal leading-[1.5]" style={{ ...F, color: SUB }}>
          <span style={{ color: INK, fontWeight: 600 }}>Repeterbar prosess.</span> Samme syklus skalerer fra én bolig til et nasjonalt nettverk.
        </p>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIK AUTOMATISERER SYSTEMET — faktabasert, faner + teknologi ═══ */
const SSlikSystemetAutomatiserer = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  const [tab, setTab] = useState(0);
  const [manual, setManual] = useState(false);
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  useEffect(() => { if (active) { setTab(0); setManual(false); } }, [active]);

  const AC = '#a052e0'; const INK = '#0c0c0c'; const SUB = '#57514a'; const MUT = '#8a8278'; const HAIR = 'rgba(20,15,10,0.09)';

  const TABS = [
    {
      n: '01', name: 'Leadfangst', Icon: Search, sub: 'Hjemmeside-skjema med register-oppslag',
      desc: 'Huseiere registrerer interesse på digihome.no — skriver inn boligadresse og noen enkle detaljer.',
      points: [
        'Systemet slår automatisk opp i eiendomsregisteret og henter eier, matrikkelnummer, areal, byggeår og bruksenhet.',
        'Leadet opprettes ferdig beriket — ingen manuell punching av data.',
        'Kvalifiseres og rutes til riktig oppfølging i det sekundet det kommer inn.',
      ],
      tech: ['Eiendomsregister-API', 'Matrikkel-oppslag', 'Auto-berikelse'],
    },
    {
      n: '02', name: 'Salgspipeline', Icon: LayoutDashboard, sub: 'CRM med full oppfølging og booking',
      desc: 'Hvert lead følger en strukturert pipeline med automatisk logging av all aktivitet.',
      points: [
        'Automatiske oppgaver, påminnelser og statusflyt gjennom hele salgsløpet.',
        'Huseier booker befaring selv i et integrert Calendly-lignende system.',
        'All kommunikasjon og historikk samlet på ett sted — ingenting faller mellom to stoler.',
      ],
      tech: ['Pipeline / CRM', 'Booking-motor', 'Aktivitetslogg'],
    },
    {
      n: '03', name: 'Tilbud & signering', Icon: PenLine, sub: 'Interaktivt tilbud + BankID',
      desc: 'Tilbudsgeneratoren lager et nydelig brandet, interaktivt tilbud på sekunder.',
      points: [
        'Sendes digitalt — huseier ser vilkår, pris og tjenester interaktivt.',
        'Kunden aksepterer og signerer forvaltningsavtalen direkte med BankID.',
        'Signert avtale arkiveres og utløser neste steg i flyten automatisk.',
      ],
      tech: ['Tilbudsgenerator', 'BankID-signering', 'Auto-arkivering'],
    },
    {
      n: '04', name: 'Annonse & utleie', Icon: Camera, sub: 'AI-annonse, visning og kontrakt',
      desc: 'Boligen klargjøres og publiseres med AI — så håndteres utleien fram til innflytting.',
      points: [
        'AI-styling av foto, auto-generert annonsetekst og datadrevet prisforslag.',
        'Multikanal-publisering til Finn.no og DigiHome internt med ett klikk.',
        'Visningsbooking, søker-scoring, husleiekontrakt med BankID og digital overtagelsesprotokoll.',
      ],
      tech: ['AI-foto & tekst', 'Multikanal-publisering', 'BankID-kontrakt'],
    },
    {
      n: '05', name: 'Løpende forvaltning', Icon: Bot, sub: 'AI-drift gjennom leieforholdet',
      desc: 'Driftsassistenten håndterer det daglige — du kobles bare på når noe krever en beslutning.',
      points: [
        'AI svarer leietakere, oppretter saker og kobler på riktig leverandør automatisk.',
        'Automatisk husleie-innkreving, regnskap og løpende eierrapportering.',
        'Avvik og forfall fanges opp før de blir problemer — proaktiv drift, ikke brannslukking.',
      ],
      tech: ['AI-driftsassistent', 'Auto-betaling & regnskap', 'Eierrapportering'],
    },
    {
      n: '06', name: 'Utflytting', Icon: ClipboardCheck, sub: 'Oppgjør, depositum & klargjøring',
      desc: 'Når leieforholdet avsluttes kjører systemet hele utflyttingen til ende — boligen er klar for neste runde.',
      points: [
        'Digital utflyttingsbefaring med tilstandsrapport og bildedokumentasjon.',
        'Automatisk sluttoppgjør og depositum-retur — trygt og sporbart for begge parter.',
        'Boligen klargjøres og rutes rett tilbake i utleieflyten — null nedetid mellom leietakere.',
      ],
      tech: ['Digital befaring', 'Depositum-oppgjør', 'Auto-reaktivering'],
    },
  ];

  useEffect(() => {
    if (!active || isPdf || manual) return;
    const id = setInterval(() => setTab((v) => (v + 1) % TABS.length), 5000);
    return () => clearInterval(id);
  }, [active, isPdf, manual]);

  const t = TABS[tab];
  const Icon = t.Icon;
  const pick = (i: number) => { setManual(true); setTab(i); };

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes saFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes saHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes saPanel { from { opacity: 0; transform: translateY(12px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes saRowIn { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes saGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(160,82,224,0.34), 0 8px 22px rgba(160,82,224,0.22); } 50% { box-shadow: 0 0 0 7px rgba(160,82,224,0.09), 0 10px 28px rgba(160,82,224,0.30); } }
    `}</style>
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 10%, rgba(160,82,224,0.05) 0%, transparent 56%)' }} />
    <DotGrid maskCenter="50% 18%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1180px] mx-auto px-6 sm:px-12 my-auto">
      {/* HEADER */}
      <div className="max-w-[900px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC, animation: anim ? 'saFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>Slik automatiserer systemet</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 48px)', color: INK, animation: anim ? 'saHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Teknologien bak — <span style={{ color: AC }}>steg for steg.</span>
        </h2>
        <p className="text-[14px] sm:text-[15.5px] font-normal leading-[1.55] mt-5 max-w-[680px]" style={{ ...F, color: SUB, animation: anim ? 'saFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
          Hele verdikjeden kjører på ett system — fra første henvendelse til boligen er klar for neste leietaker.
        </p>
      </div>

      {/* MAIN — ikon-drevet steg-rail + kantløst redaksjonelt detaljfelt */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(270px,0.82fr)_1.5fr] gap-8 lg:gap-14 mt-9 sm:mt-11 items-start relative z-50"
           style={{ animation: anim ? 'saFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.55s both' : undefined, opacity: show ? undefined : 0 }}>

        {/* ── VENSTRE: ikon-stepper ── */}
        <div className="relative">
          {/* fremdriftstråd (bakgrunn) */}
          <div aria-hidden="true" className="absolute pointer-events-none" style={{ left: 19, top: 32, bottom: 32, width: 1.5, background: HAIR, borderRadius: 2 }} />
          {/* fremdriftstråd (fyll) */}
          <div aria-hidden="true" className="absolute pointer-events-none" style={{ left: 19, top: 32, width: 1.5, height: `calc((100% - 64px) * ${tab / (TABS.length - 1)})`, background: `linear-gradient(180deg, ${AC}, ${AC}99)`, borderRadius: 2, transition: 'height 0.55s cubic-bezier(0.4,0,0.2,1)' }} />

          <div className="relative space-y-0.5">
            {TABS.map((tb, i) => {
              const on = i === tab; const done = i < tab; const RIcon = tb.Icon;
              return (
                <button key={tb.n} onClick={() => pick(i)} type="button"
                  className="group w-full flex items-center gap-4 rounded-xl pr-3 py-3 text-left transition-colors duration-300 hover:bg-[rgba(20,15,10,0.025)]"
                  style={{ animation: anim ? `saRowIn 0.5s cubic-bezier(0.22,1,0.36,1) ${0.6 + i * 0.07}s both` : undefined, opacity: show ? undefined : 0 }}>
                  {/* ikon-node */}
                  <span className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-all duration-300"
                        style={{ background: (on || done) ? AC : '#f3efe9', border: (on || done) ? 'none' : `1px solid ${HAIR}`,
                                 animation: (on && anim) ? 'saGlow 2.8s ease-in-out infinite' : undefined }}>
                    <RIcon className="w-[18px] h-[18px] transition-colors duration-300" style={{ color: (on || done) ? '#fff' : MUT }} strokeWidth={2} />
                  </span>
                  {/* etikett */}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold leading-tight truncate transition-colors duration-300" style={{ ...F, color: on ? INK : (done ? SUB : MUT) }}>{tb.name}</span>
                    <span className="block text-[11.5px] leading-tight mt-0.5 truncate transition-colors duration-300" style={{ ...F, color: on ? AC : MUT }}>{tb.sub}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 transition-all duration-300" style={{ color: AC, opacity: on ? 1 : 0, transform: on ? 'translateX(0)' : 'translateX(-6px)' }} strokeWidth={2.4} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── HØYRE: kantløst redaksjonelt detaljfelt ── */}
        <div key={tab} className="relative lg:pl-14 lg:border-l" style={{ borderColor: HAIR, animation: anim ? 'saPanel 0.55s cubic-bezier(0.22,1,0.36,1) both' : undefined }}>
          {/* topp: premium ikon-tile + nummerløs fremdriftsindikator */}
          <div className="flex items-center justify-between">
            <span className="flex items-center justify-center w-[54px] h-[54px] rounded-2xl shrink-0" style={{ background: `${AC}0f` }}>
              <Icon className="w-6 h-6" style={{ color: AC }} strokeWidth={1.9} />
            </span>
            <div className="flex items-center gap-1.5">
              {TABS.map((_, i) => (
                <span key={i} className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: i === tab ? 26 : 14, background: i === tab ? AC : (i < tab ? `${AC}5e` : 'rgba(20,15,10,0.10)') }} />
              ))}
            </div>
          </div>

          <h3 className="text-[29px] sm:text-[38px] tracking-[-0.025em] leading-[1.02] mt-6" style={{ ...FH, fontWeight: 700, color: INK }}>{t.name}</h3>
          <p className="text-[11.5px] uppercase tracking-[0.18em] font-semibold mt-3" style={{ ...F, color: MUT }}>{t.sub}</p>

          <p className="text-[14.5px] sm:text-[15.5px] font-normal leading-[1.6] mt-6 max-w-[600px]" style={{ ...F, color: SUB }}>{t.desc}</p>

          {/* sjekkliste — hårlinje-separert */}
          <div className="mt-7">
            {t.points.map((pt, i) => (
              <div key={i} className="flex items-start gap-3.5 py-3.5" style={{ borderTop: i === 0 ? 'none' : `1px solid ${HAIR}` }}>
                <Check className="w-[17px] h-[17px] mt-px shrink-0" style={{ color: AC }} strokeWidth={2.4} />
                <span className="text-[13.5px] sm:text-[14px] font-normal leading-[1.5]" style={{ ...F, color: '#2a2520' }}>{pt}</span>
              </div>
            ))}
          </div>

          {/* teknologi-rad */}
          <div className="mt-7 pt-6 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ borderTop: `1px solid ${HAIR}` }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ ...F, color: MUT }}>Teknologi</span>
            {t.tech.map((tc) => (
              <span key={tc} className="inline-flex items-center gap-2 text-[12.5px] font-semibold" style={{ ...F, color: INK }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: AC }} />{tc}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ml-auto" style={{ background: `${AC}10` }}>
              <Zap className="w-3.5 h-3.5" style={{ color: AC }} strokeWidth={2.4} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ ...F, color: AC }}>Automatisert</span>
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER coda */}
      <div className="mt-9 sm:mt-11 pt-7"
           style={{ borderTop: `1px solid ${HAIR}`, animation: anim ? 'saFade 0.9s cubic-bezier(0.22,1,0.36,1) 0.75s both' : undefined, opacity: show ? undefined : 0 }}>
        <p className="text-[13.5px] sm:text-[15px] font-normal leading-[1.5]" style={{ ...F, color: SUB }}>
          <span style={{ color: INK, fontWeight: 600 }}>Systemet gjør grovarbeidet i hvert steg.</span> Forvalteren kobles bare på der det krever en beslutning eller et fysisk møte.
        </p>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SELSKAPSSTRUKTUR — to søsterselskaper under DigiHome-paraplyen ═══ */
const SSelskapsstruktur = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  const AC = '#a052e0'; const INK = '#0c0c0c'; const SUB = '#57514a'; const MUT = '#8a8278'; const HAIR = 'rgba(20,15,10,0.09)';

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes stFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes stHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes stPop { from { opacity: 0; transform: translateY(-10px) scale(0.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes stRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      @keyframes stCard { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 16%, rgba(160,82,224,0.06) 0%, transparent 58%)' }} />
    <DotGrid maskCenter="50% 20%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1120px] mx-auto px-6 sm:px-12 my-auto">
      {/* HEADER */}
      <div className="text-center max-w-[840px] mx-auto">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC, animation: anim ? 'stFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>Selskapsstruktur</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(30px, 3.9vw, 54px)', color: INK, animation: anim ? 'stHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Én merkevare. <span style={{ color: AC }}>To selskaper.</span>
        </h2>
        <p className="text-[14px] sm:text-[15.5px] font-normal leading-[1.55] mt-5 max-w-[660px] mx-auto" style={{ ...F, color: SUB, animation: anim ? 'stFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
          To søsterselskaper under én paraply — slik holdes den skalerbare teknologien adskilt fra den operasjonelle driften.
        </p>
      </div>

      {/* DIAGRAM */}
      <div className="flex flex-col items-center mt-10 sm:mt-12">
        {/* Holding-paraply */}
        <div className="inline-flex items-center gap-3 rounded-full pl-2 pr-5 py-2"
             style={{ background: INK, animation: anim ? 'stPop 0.7s cubic-bezier(0.22,1,0.36,1) 0.65s both' : undefined, opacity: show ? undefined : 0 }}>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: `linear-gradient(135deg, ${AC}, #7c3aed)` }}>
            <Layers className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />
          </span>
          <span className="text-[15px] tracking-[-0.01em]" style={{ ...FH, fontWeight: 700, color: '#fff' }}>DigiHome</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ ...F, color: 'rgba(255,255,255,0.5)' }}>Holding · paraply</span>
        </div>
        {/* vertikal kobling */}
        <span aria-hidden="true" className="block w-px h-9" style={{ background: HAIR, transformOrigin: 'top', animation: anim ? 'stRise 0.6s cubic-bezier(0.22,1,0.36,1) 0.85s both' : undefined }} />

        {/* to søsterselskaper */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 md:gap-4 items-stretch w-full">
          {/* DigiHome Tech AS — investeringsmål */}
          <div className="relative rounded-3xl px-7 py-7"
               style={{ background: '#fff', border: `1.5px solid ${AC}45`, boxShadow: `0 20px 54px -26px ${AC}66`, animation: anim ? 'stCard 0.8s cubic-bezier(0.22,1,0.36,1) 0.95s both' : undefined, opacity: show ? undefined : 0 }}>
            <span className="absolute -top-3 left-7 inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: `linear-gradient(135deg, ${AC}, #7c3aed)`, boxShadow: `0 8px 20px -8px ${AC}99` }}>
              <Sparkles className="w-3 h-3 text-white" strokeWidth={2.4} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">Her investerer du</span>
            </span>
            <div className="flex items-center gap-3 mb-4 mt-1">
              <span className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0" style={{ background: `${AC}14` }}>
                <Brain className="w-5 h-5" style={{ color: AC }} strokeWidth={2} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ ...F, color: MUT }}>Teknologiselskap</p>
                <h3 className="text-[21px] sm:text-[23px] tracking-[-0.02em] leading-none mt-1" style={{ ...FH, fontWeight: 700, color: INK }}>DigiHome Tech AS</h3>
              </div>
            </div>
            <p className="text-[13.5px] font-normal leading-[1.5] mb-4" style={{ ...F, color: SUB }}>Plattform og IP — selve motoren bak hele nettverket.</p>
            <div className="flex flex-wrap gap-2">
              {['Recurring platform-ARR', 'Franchise-royalty', 'Høy margin · skalerbar'].map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ ...F, color: INK, background: `${AC}0f`, border: `1px solid ${AC}24` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: AC }} />{c}
                </span>
              ))}
            </div>
          </div>

          {/* lisens-kobling */}
          <div className="flex md:flex-col items-center justify-center gap-2 px-1" style={{ animation: anim ? 'stFade 0.7s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: show ? undefined : 0 }}>
            <ArrowRight className="w-6 h-6 md:rotate-0 rotate-90" style={{ color: AC }} strokeWidth={2} />
            <span className="text-center text-[10px] font-bold uppercase tracking-[0.16em] leading-tight" style={{ ...F, color: MUT }}>Plattform-<br className="hidden md:block" />lisens<br className="hidden md:block" /><span style={{ color: AC }}>markedspris</span></span>
          </div>

          {/* DigiHome AS — drift */}
          <div className="relative rounded-3xl px-7 py-7"
               style={{ background: '#fff', border: `1px solid ${HAIR}`, boxShadow: '0 12px 36px -22px rgba(20,15,10,0.4)', animation: anim ? 'stCard 0.8s cubic-bezier(0.22,1,0.36,1) 1.1s both' : undefined, opacity: show ? undefined : 0 }}>
            <div className="flex items-center gap-3 mb-4 mt-1">
              <span className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0" style={{ background: 'rgba(20,15,10,0.05)' }}>
                <Building2 className="w-5 h-5" style={{ color: INK }} strokeWidth={2} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ ...F, color: MUT }}>Forvaltningsselskap</p>
                <h3 className="text-[21px] sm:text-[23px] tracking-[-0.02em] leading-none mt-1" style={{ ...FH, fontWeight: 700, color: INK }}>DigiHome AS</h3>
              </div>
            </div>
            <p className="text-[13.5px] font-normal leading-[1.5] mb-4" style={{ ...F, color: SUB }}>Forvaltning og drift — flaggskipet som beviser modellen i markedet.</p>
            <div className="flex flex-wrap gap-2">
              {['Bergen-flaggskip', 'Egen drift · take-rate', 'Referanser & proof'].map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ ...F, color: SUB, background: 'rgba(20,15,10,0.035)', border: `1px solid ${HAIR}` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: MUT }} />{c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* franchise-note */}
        <div className="mt-6 inline-flex items-center gap-2.5 rounded-full px-4 py-2"
             style={{ background: 'rgba(20,15,10,0.035)', border: `1px solid ${HAIR}`, animation: anim ? 'stFade 0.8s cubic-bezier(0.22,1,0.36,1) 1.3s both' : undefined, opacity: show ? undefined : 0 }}>
          <Users className="w-4 h-4" style={{ color: AC }} strokeWidth={2.2} />
          <span className="text-[12.5px] font-medium" style={{ ...F, color: SUB }}>Samme plattform lisensieres til <span style={{ color: INK, fontWeight: 600 }}>alle franchise-partnere</span> i nettverket.</span>
        </div>
      </div>

      {/* CODA */}
      <div className="mt-10 sm:mt-12 pt-7 text-center" style={{ borderTop: `1px solid ${HAIR}`, animation: anim ? 'stFade 0.9s cubic-bezier(0.22,1,0.36,1) 1.45s both' : undefined, opacity: show ? undefined : 0 }}>
        <p className="tracking-[-0.018em] leading-[1.4] max-w-[820px] mx-auto" style={{ ...FH, fontWeight: 600, fontSize: 'clamp(17px, 1.9vw, 25px)', color: INK }}>
          Tech-selskapet <span style={{ color: AC }}>eier verdien som skalerer.</span> Driftsselskapet beviser den i markedet.
        </p>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ SLIDE ORDER — 2026 · Product-first investor flow ═══ */
/* ═══ SLIDES — deklarativ rekkefølge (Narrativ B: problem-først) ═══
   light:    true  → lys bakgrunn  (mørk nav-chrome / piler)
             false → mørk bakgrunn (lys nav-chrome / piler)
   animated: true  → slide med tekst-animasjon (kobles til onAnimationComplete + s2-lås)
   Lys/mørk følger nå hvert slide-objekt — ingen hardkodede indeks-arrays.            */
/* ═══ Økosystem — integrasjoner (DigiHome-plattformen koblet til bransjen) ═══ */
const SOkosystem = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);

  const AC = '#a052e0'; const INK = '#0c0c0c'; const SUB = '#57514a'; const MUT = '#8a8278'; const HAIR = 'rgba(20,15,10,0.09)';

  const GROUPS = [
    {
      label: 'Identitet & data', Icon: Shield, desc: 'Verifisering og automatiske registeroppslag.',
      items: [
        { name: 'BankID', logo: '/bankid-logo.png', h: 22 },
        { name: 'Kartverket', logo: '/kartverket-logo.png', h: 28 },
        { name: 'Creditsafe', logo: '/creditsafe-logo.png', h: 22 },
      ],
    },
    {
      label: 'Annonsekanaler', Icon: Radio, desc: 'Publisering og distribusjon i alle relevante kanaler.',
      items: [
        { name: 'FINN.no', logo: '/finn-logo.png', h: 30 },
        { name: 'Airbnb', logo: '/airbnb-logo.png', h: 26 },
        { name: 'Booking.com', logo: '/booking-logo.png', h: 19 },
      ],
    },
    {
      label: 'Betaling & økonomi', Icon: CreditCard, desc: 'Innkreving, oppgjør og regnskap — automatisk.',
      items: [
        { name: 'Vipps', logo: '/vipps-logo.png', h: 26 },
        { name: 'Tripletex', logo: '/tripletex-logo.png', h: 21 },
        { name: 'Fiken', logo: '/fiken-logo.png', h: 26 },
      ],
    },
  ];

  let d = 0; // stagger-teller

  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`
      @keyframes okoFade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes okoHead { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes okoTile { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `}</style>
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 8%, rgba(160,82,224,0.05) 0%, transparent 55%)' }} />
    <DotGrid maskCenter="50% 14%" opacity={0.4} />

    <div className="relative z-10 w-full max-w-[1240px] mx-auto px-6 sm:px-12 my-auto">
      {/* HEADER */}
      <div className="max-w-[880px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC, animation: anim ? 'okoFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>Økosystem</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 48px)', color: INK, animation: anim ? 'okoHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Ett system — <span style={{ color: AC }}>koblet til hele bransjen.</span>
        </h2>
        <p className="text-[14px] sm:text-[15.5px] font-normal leading-[1.55] mt-5 max-w-[700px]" style={{ ...F, color: SUB, animation: anim ? 'okoFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
          DigiHome-plattformen står i sentrum og snakker med verktøyene utleiere allerede stoler på — identitet, kanaler, betaling og regnskap flyter sømløst inn og ut.
        </p>
      </div>

      {/* DIGIHOME — sentral hub */}
      <div className="relative flex justify-center mt-8 sm:mt-9"
           style={{ animation: anim ? 'okoFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 w-[340px] h-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse, ${AC}30, transparent 70%)` }} />
        <div className="relative inline-flex items-center gap-3 rounded-2xl px-6 py-3.5" style={{ background: 'linear-gradient(165deg, #16161c 0%, #0a0a0d 100%)', boxShadow: `0 22px 48px -20px ${AC}66`, border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: AC }}>
            <span className="text-white text-[17px] leading-none" style={{ ...FH, fontWeight: 700 }}>H</span>
          </span>
          <span>
            <span className="block text-white text-[15.5px] tracking-[-0.01em]" style={{ ...FH, fontWeight: 700 }}>DigiHome</span>
            <span className="block text-[9.5px] uppercase tracking-[0.18em] mt-0.5" style={{ ...F, color: P }}>Kjernen alt kobles til</span>
          </span>
        </div>
      </div>

      {/* tre-kobling fra hub til kategorier */}
      <div className="relative h-7 hidden md:block" style={{ animation: anim ? 'okoFade 0.6s ease 0.7s both' : undefined, opacity: show ? undefined : 0 }}>
        <div className="absolute" style={{ left: '50%', top: 0, width: 1.5, height: 13, background: HAIR, transform: 'translateX(-50%)' }} />
        <div className="absolute" style={{ left: '16.666%', right: '16.666%', top: 13, height: 1.5, background: HAIR }} />
        {[16.666, 50, 83.334].map((l) => (
          <React.Fragment key={l}>
            <div className="absolute" style={{ left: `${l}%`, top: 13, width: 1.5, height: 14, background: HAIR, transform: 'translateX(-50%)' }} />
            <div className="absolute rounded-full" style={{ left: `${l}%`, top: 27, width: 7, height: 7, background: AC, transform: 'translate(-50%,-50%)' }} />
          </React.Fragment>
        ))}
      </div>

      {/* KATEGORIER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-9 mt-2 md:mt-3">
        {GROUPS.map((g, gi) => {
          const GIcon = g.Icon;
          return (
            <div key={g.label} className="relative" style={{ animation: anim ? `okoFade 0.7s cubic-bezier(0.22,1,0.36,1) ${0.8 + gi * 0.1}s both` : undefined, opacity: show ? undefined : 0 }}>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: `${AC}10` }}>
                  <GIcon className="w-4 h-4" style={{ color: AC }} strokeWidth={2} />
                </span>
                <span className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ ...F, color: INK }}>{g.label}</span>
                <span className="ml-auto text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full" style={{ ...F, color: MUT, background: 'rgba(20,15,10,0.04)' }}>{g.items.length}</span>
              </div>
              <p className="text-[12px] leading-[1.45] mb-4 ml-[42px]" style={{ ...F, color: MUT }}>{g.desc}</p>
              <div className="space-y-2.5">
                {g.items.map((it: any) => {
                  const di = d++;
                  return (
                    <div key={it.name}
                         className="relative flex items-center justify-center h-[72px] rounded-2xl overflow-hidden px-6"
                         style={{ background: '#ffffff', border: `1px solid ${HAIR}`, boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 20px 38px -26px rgba(20,15,10,0.30)',
                                  animation: anim ? `okoTile 0.6s cubic-bezier(0.22,1,0.36,1) ${0.85 + di * 0.05}s both` : undefined, opacity: show ? undefined : 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.logo} alt={it.name} className="w-auto object-contain select-none" draggable={false} style={{ height: it.h, maxWidth: '78%' }} />
                      <Check className="absolute top-3 right-3 w-[13px] h-[13px] shrink-0" style={{ color: AC, opacity: 0.38 }} strokeWidth={2.6} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER — åpen arkitektur */}
      <div className="mt-7 sm:mt-9 pt-6 flex items-center gap-3 flex-wrap"
           style={{ borderTop: `1px solid ${HAIR}`, animation: anim ? 'okoFade 0.9s cubic-bezier(0.22,1,0.36,1) 1.15s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0" style={{ background: `${AC}10` }}>
          <Layers className="w-4 h-4" style={{ color: AC }} strokeWidth={2} />
        </span>
        <p className="text-[13px] sm:text-[14px] leading-[1.5] flex-1 min-w-[260px]" style={{ ...F, color: SUB }}>
          <span style={{ color: INK, fontWeight: 600 }}>Åpen API-arkitektur.</span> Nye integrasjoner kobles på uten å bygge om kjernen — økosystemet vokser med DigiHome.
        </p>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1.5 rounded-full" style={{ ...F, color: AC, background: `${AC}0d` }}>10+ integrasjoner</span>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ Autopilot-status — hva som faktisk kjører i dag vs. veikart ═══ */
const SAutopilotStatus = (p: any) => {
  const active = p.isActive; const isPdf = !!p.pdfMode; const show = active || isPdf; const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0'; const INK = '#0c0c0c'; const INK2 = '#1c1714'; const SUB = '#57514a'; const MUT = '#8a8278'; const HAIR = 'rgba(20,15,10,0.09)';
  const LIVE = '#1f9d57'; const PILOT = '#c2891f';
  const ST: any = { live: { c: LIVE, t: 'Live' }, pilot: { c: PILOT, t: 'Pilot' }, road: { c: MUT, t: 'Veikart' } };
  const ROWS = [
    { pr: 'Leadberikelse', tr: 'Manuell punching', dh: 'Automatisk registeroppslag', hu: 'Godkjenner', s: 'live' },
    { pr: 'Annonseutkast', tr: 'Manuell tekst', dh: 'AI-generert utkast', hu: 'Godkjenner', s: 'live' },
    { pr: 'Kontrakt & depositum', tr: 'Manuell oppfølging', dh: 'Klargjort + automatiske påminnelser', hu: 'Signerer', s: 'live' },
    { pr: 'Husleie & regnskap', tr: 'Manuell fakturering', dh: 'Auto-innkreving + bokføring', hu: 'Fører tilsyn', s: 'live' },
    { pr: 'Leietakerhenvendelser', tr: 'Manuelle svar', dh: 'Foreslåtte / automatiske svar', hu: 'Policy-styrt', s: 'pilot' },
    { pr: 'Vedlikehold & avvik', tr: 'Telefon / e-post', dh: 'Sak opprettes, leverandør foreslås', hu: 'Godkjenner', s: 'pilot' },
    { pr: 'Prising & kanalvalg', tr: 'Erfaring / manuelt', dh: 'Datadrevet anbefaling', hu: 'Beslutter', s: 'road' },
  ];
  const COLS = 'grid grid-cols-[1.05fr_1.05fr_1.55fr_0.95fr_84px] gap-4';
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`@keyframes apFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes apHead{from{opacity:0;transform:translateY(22px);filter:blur(8px)}60%{filter:blur(0)}to{opacity:1;transform:translateY(0);filter:blur(0)}}`}</style>
    <DotGrid maskCenter="50% 12%" opacity={0.4} />
    <div className="relative z-10 w-full max-w-[1240px] mx-auto px-6 sm:px-12 my-auto">
      <div className="max-w-[900px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC, animation: anim ? 'apFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>Åpenhet</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(27px, 3.4vw, 44px)', color: INK, animation: anim ? 'apHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Hva autopiloten <span style={{ color: AC }}>faktisk gjør — i dag.</span>
        </h2>
        <p className="text-[13.5px] sm:text-[15px] font-normal leading-[1.55] mt-4 max-w-[760px]" style={{ ...F, color: SUB, animation: anim ? 'apFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
          Vi skiller tydelig mellom det som kjører i produksjon nå, det som er i pilot, og det som står på veikartet. Mennesket er i loopen der det krever skjønn.
        </p>
      </div>

      {/* legend */}
      <div className="flex items-center gap-5 mt-6" style={{ animation: anim ? 'apFade 0.7s ease 0.6s both' : undefined, opacity: show ? undefined : 0 }}>
        {[['Live', LIVE], ['Pilot', PILOT], ['Veikart', MUT]].map(([t, c]) => (
          <span key={t as string} className="inline-flex items-center gap-2 text-[11.5px] font-semibold" style={{ ...F, color: SUB }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c as string }} />{t}
          </span>
        ))}
      </div>

      {/* matrix */}
      <div className="mt-4 rounded-[22px] overflow-hidden" style={{ background: '#fff', border: `1px solid ${HAIR}`, boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 28px 64px -30px rgba(20,15,10,0.22)', animation: anim ? 'apFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.7s both' : undefined, opacity: show ? undefined : 0 }}>
        <div className={`${COLS} px-6 py-3`} style={{ background: 'rgba(20,15,10,0.025)' }}>
          {['Prosess', 'Tradisjonelt', 'DigiHome i dag', 'Menneske', 'Status'].map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ ...F, color: MUT }}>{h}</span>
          ))}
        </div>
        {ROWS.map((r, i) => (
          <div key={r.pr} className={`${COLS} px-6 py-[13px] items-center`} style={{ borderTop: `1px solid ${HAIR}` }}>
            <span className="text-[13px] font-semibold" style={{ ...F, color: INK }}>{r.pr}</span>
            <span className="text-[12.5px]" style={{ ...F, color: MUT }}>{r.tr}</span>
            <span className="text-[12.5px] font-medium" style={{ ...F, color: INK2 }}>{r.dh}</span>
            <span className="text-[12px]" style={{ ...F, color: SUB }}>{r.hu}</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full justify-self-start" style={{ background: `${ST[r.s].c}14` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ST[r.s].c }} />
              <span className="text-[10.5px] font-bold" style={{ ...F, color: ST[r.s].c }}>{ST[r.s].t}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="text-[12.5px] sm:text-[13.5px] leading-[1.5] mt-6 max-w-[820px]" style={{ ...F, color: SUB, animation: anim ? 'apFade 0.9s ease 1.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <span style={{ color: INK, fontWeight: 600 }}>Systemet utfører grovarbeidet</span> — mennesket godkjenner, signerer og beslutter der det teller. Det er det som gjør driften skalerbar uten å miste kontroll.
      </p>
    </div>
  </SlideFrame>
  );
};

/* ═══ Den ideelle operatøren — franchise-ICP ═══ */
const SOperator = (p: any) => {
  const active = p.isActive; const isPdf = !!p.pdfMode; const show = active || isPdf; const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0'; const INK = '#0c0c0c'; const INK2 = '#1c1714'; const SUB = '#57514a'; const MUT = '#8a8278'; const HAIR = 'rgba(20,15,10,0.09)';
  const FACTS = [
    { Icon: Target, k: 'Mål', v: '300 enheter innen 24 mnd' },
    { Icon: TrendingUp, k: 'Kapasitet', v: '3–4× flere enheter / årsverk' },
    { Icon: Building2, k: 'Merke & drift', v: 'DigiHome-plattformen + DigiHome-merket' },
  ];
  const KJOP = ['Etablert merkevare og tillit fra dag én', 'Plattformen som gjør grovarbeidet', 'Ferdig playbook for drift og vekst', 'Lead-motor som fyller pipelinen'];
  const BLIR = ['Langt høyere kapasitet per årsverk', 'Lavere feilrate og mindre brannslukking', 'Egen, lokal forretning som vokser recurring'];
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`@keyframes opFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes opHead{from{opacity:0;transform:translateY(22px);filter:blur(8px)}60%{filter:blur(0)}to{opacity:1;transform:translateY(0);filter:blur(0)}}`}</style>
    <DotGrid maskCenter="50% 12%" opacity={0.4} />
    <div className="relative z-10 w-full max-w-[1240px] mx-auto px-6 sm:px-12 my-auto">
      <div className="max-w-[900px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC, animation: anim ? 'opFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>Franchise</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(27px, 3.4vw, 44px)', color: INK, animation: anim ? 'opHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Den ideelle <span style={{ color: AC }}>DigiHome-operatøren.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.35fr] gap-6 lg:gap-9 mt-8 items-stretch">
        {/* persona */}
        <div className="relative rounded-[24px] p-7 sm:p-8 flex flex-col" style={{ background: 'linear-gradient(165deg, #16161c 0%, #0a0a0d 100%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 4px rgba(20,15,10,0.06), 0 30px 70px -30px rgba(20,15,10,0.45)', animation: anim ? 'opFade 0.85s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
          <div aria-hidden="true" className="absolute -top-24 -right-24 w-[340px] h-[340px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(195,156,224,0.16) 0%, transparent 65%)' }} />
          <div className="relative">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: AC }}><Users className="w-6 h-6 text-white" strokeWidth={2} /></span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] mt-5" style={{ ...F, color: P }}>Profil</span>
            <p className="text-[17px] sm:text-[19px] text-white leading-[1.4] mt-2" style={{ ...FH, fontWeight: 700 }}>Lokal eiendomsmegler, forvalter eller gründer med eiendomsnettverk.</p>
            <div className="mt-6 space-y-px">
              {FACTS.map((f) => (
                <div key={f.k} className="flex items-center gap-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <f.Icon className="w-[18px] h-[18px] shrink-0" style={{ color: P }} strokeWidth={2} />
                  <span className="text-[11px] uppercase tracking-[0.1em] w-[110px] shrink-0" style={{ ...F, color: 'rgba(255,255,255,0.5)' }}>{f.k}</span>
                  <span className="text-[13.5px] font-semibold text-white" style={F}>{f.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* hvorfor kjøper / blir */}
        <div className="flex flex-col gap-6">
          <div className="rounded-[24px] p-7 sm:p-8 flex-1" style={{ background: '#fff', border: `1px solid ${HAIR}`, boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 24px 56px -30px rgba(20,15,10,0.2)', animation: anim ? 'opFade 0.85s cubic-bezier(0.22,1,0.36,1) 0.65s both' : undefined, opacity: show ? undefined : 0 }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ ...F, color: AC }}>Hvorfor de kjøper</span>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-4">
              {KJOP.map((t) => (
                <div key={t} className="flex items-start gap-2.5">
                  <Check className="w-[16px] h-[16px] mt-px shrink-0" style={{ color: AC }} strokeWidth={2.6} />
                  <span className="text-[13.5px] leading-[1.45]" style={{ ...F, color: INK2 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] p-7 sm:p-8 flex-1" style={{ background: '#fff', border: `1px solid ${HAIR}`, boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 24px 56px -30px rgba(20,15,10,0.2)', animation: anim ? 'opFade 0.85s cubic-bezier(0.22,1,0.36,1) 0.8s both' : undefined, opacity: show ? undefined : 0 }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ ...F, color: AC }}>Hvorfor de blir</span>
            <div className="grid sm:grid-cols-3 gap-x-6 gap-y-3 mt-4">
              {BLIR.map((t) => (
                <div key={t} className="flex items-start gap-2.5">
                  <Check className="w-[16px] h-[16px] mt-px shrink-0" style={{ color: AC }} strokeWidth={2.6} />
                  <span className="text-[13px] leading-[1.45]" style={{ ...F, color: INK2 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2.5 flex-wrap" style={{ animation: anim ? 'opFade 0.9s ease 1.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ ...F, color: MUT }}>DigiHome Tech tjener på</span>
        {['Plattformavgift', 'Royalty', 'Etableringsavgift'].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1.5" style={{ ...F, color: AC, background: `${AC}0d` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: AC }} />{t}
          </span>
        ))}
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ Hvor verdien havner — Tech AS vs operatør ═══ */
const SVerdiflyt = (p: any) => {
  const active = p.isActive; const isPdf = !!p.pdfMode; const show = active || isPdf; const anim = active && !isPdf;
  useEffect(() => { p.onLight?.(active && !isPdf); }, [active, isPdf]);
  const AC = '#a052e0'; const INK = '#0c0c0c'; const INK2 = '#1c1714'; const SUB = '#57514a'; const MUT = '#8a8278'; const HAIR = 'rgba(20,15,10,0.09)';
  const TECH = '#a052e0';
  const ROWS = [
    { inc: 'Forvaltning (10 %)', who: 'Huseier', to: 'Operatør / DigiHome AS', type: 'Operasjonell', tech: false },
    { inc: 'Plattformavgift', who: 'Franchise-operatør', to: 'DigiHome Tech AS', type: 'Software-aktig', tech: true },
    { inc: 'Royalty', who: 'Franchise-operatør', to: 'DigiHome Tech AS', type: 'Nettverksinntekt', tech: true },
    { inc: 'Etableringsavgift', who: 'Franchise-operatør', to: 'DigiHome Tech AS', type: 'Onboarding', tech: true },
    { inc: 'Transaksjoner', who: 'Huseier / leietaker / partner', to: 'DigiHome Tech / operatør', type: 'Volumbasert', tech: true },
  ];
  const COLS = 'grid grid-cols-[1.1fr_1.2fr_1.2fr_1fr] gap-4';
  return (
  <SlideFrame bg="beige" {...p}>
    <style>{`@keyframes vfFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes vfHead{from{opacity:0;transform:translateY(22px);filter:blur(8px)}60%{filter:blur(0)}to{opacity:1;transform:translateY(0);filter:blur(0)}}`}</style>
    <DotGrid maskCenter="50% 12%" opacity={0.4} />
    <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 sm:px-12 my-auto">
      <div className="max-w-[900px]">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em]" style={{ ...F, color: AC, animation: anim ? 'vfFade 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>Verdistrøm</span>
        <h2 className="tracking-[-0.035em] leading-[1.04] mt-5" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(27px, 3.4vw, 44px)', color: INK, animation: anim ? 'vfHead 0.95s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
          Hvor verdien <span style={{ color: AC }}>havner.</span>
        </h2>
        <p className="text-[13.5px] sm:text-[15px] font-normal leading-[1.55] mt-4 max-w-[760px]" style={{ ...F, color: SUB, animation: anim ? 'vfFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' : undefined, opacity: show ? undefined : 0 }}>
          Operatøren tjener på driften lokalt. <span style={{ color: INK, fontWeight: 600 }}>DigiHome Tech AS tjener på hver enhet i nettverket — uavhengig av hvem som drifter den.</span>
        </p>
      </div>

      <div className="mt-6 rounded-[22px] overflow-hidden" style={{ background: '#fff', border: `1px solid ${HAIR}`, boxShadow: '0 2px 4px rgba(20,15,10,0.04), 0 28px 64px -30px rgba(20,15,10,0.22)', animation: anim ? 'vfFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.7s both' : undefined, opacity: show ? undefined : 0 }}>
        <div className={`${COLS} px-6 py-3`} style={{ background: 'rgba(20,15,10,0.025)' }}>
          {['Inntekt', 'Hvem betaler', 'Til', 'Type'].map((h) => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ ...F, color: MUT }}>{h}</span>
          ))}
        </div>
        {ROWS.map((r) => (
          <div key={r.inc} className={`${COLS} px-6 py-[14px] items-center`} style={{ borderTop: `1px solid ${HAIR}`, background: r.tech ? `${TECH}07` : 'transparent' }}>
            <span className="text-[13.5px] font-semibold" style={{ ...F, color: INK }}>{r.inc}</span>
            <span className="text-[12.5px]" style={{ ...F, color: SUB }}>{r.who}</span>
            <span className="text-[12.5px] font-medium inline-flex items-center gap-1.5" style={{ ...F, color: r.tech ? TECH : INK2 }}>
              {r.tech && <span className="w-1.5 h-1.5 rounded-full" style={{ background: TECH }} />}{r.to}
            </span>
            <span className="text-[12px]" style={{ ...F, color: MUT }}>{r.type}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl px-5 py-4" style={{ background: `${AC}0d`, animation: anim ? 'vfFade 0.9s ease 1.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <Sparkles className="w-5 h-5 mt-px shrink-0" style={{ color: AC }} strokeWidth={2} />
        <p className="text-[13px] sm:text-[14px] leading-[1.5]" style={{ ...F, color: INK2 }}>
          <span style={{ color: INK, fontWeight: 700 }}>Investeringen skjer i DigiHome Tech AS.</span> Det er selskapet som eier plattformen, merkevaren og dataflyten — og som tjener recurring per enhet i hele nettverket. Derfor prises det som tech, ikke som forvaltning.
        </p>
      </div>
    </div>
  </SlideFrame>
  );
};

/* ═══ Merkevarefilm — kinematisk brand-film (~28s) ═══ */
const SBrandFilm = (p: any) => {
  const active = p.isActive;
  const isPdf = !!p.pdfMode;
  const show = active || isPdf;
  const anim = active && !isPdf;
  const AC = '#d298ff';
  const vidRef = React.useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(true);

  React.useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    if (active && !isPdf) {
      v.muted = muted;
      const pr: any = v.play();
      if (pr && pr.catch) pr.catch(() => {});
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
    }
  }, [active, isPdf, muted]);

  // reset to muted whenever the slide goes inactive
  React.useEffect(() => { if (!active) setMuted(true); }, [active]);

  return (
  <SlideFrame bg="dark" {...p}>
    <style>{`
      @keyframes bfFade { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes bfFrame { from { opacity: 0; transform: translateY(26px) scale(0.985); filter: blur(8px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    `}</style>

    {/* ambient glow */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 46%, rgba(210,152,255,0.15) 0%, transparent 70%)' }} />

    <div className="relative z-10 w-full max-w-[1120px] mx-auto px-6 sm:px-10 my-auto flex flex-col items-center">
      {/* kicker */}
      <div className="flex items-center justify-center gap-4 mb-6" style={{ animation: anim ? 'bfFade 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both' : undefined, opacity: show ? undefined : 0 }}>
        <div className="h-px w-9" style={{ background: 'rgba(255,255,255,0.28)' }} />
        <span className="text-[11px] font-bold uppercase tracking-[0.34em]" style={{ ...F, color: AC }}>Merkevarefilm</span>
        <div className="h-px w-9" style={{ background: 'rgba(255,255,255,0.28)' }} />
      </div>

      {/* headline */}
      <h2 className="text-center tracking-[-0.035em] leading-[1.05] mb-7 max-w-[820px]" style={{ ...FH, fontWeight: 700, fontSize: 'clamp(26px, 3.1vw, 44px)', color: '#fff', textShadow: '0 0 60px rgba(210,152,255,0.18)', animation: anim ? 'bfFade 0.9s cubic-bezier(0.22,1,0.36,1) 0.25s both' : undefined, opacity: show ? undefined : 0 }}>
        Utleie, slik det burde være.
      </h2>

      {/* video frame */}
      <div className="relative w-full rounded-[20px] overflow-hidden"
           style={{ aspectRatio: '16 / 9', boxShadow: '0 44px 110px -34px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)', animation: anim ? 'bfFrame 1s cubic-bezier(0.22,1,0.36,1) 0.4s both' : undefined, opacity: show ? undefined : 0 }}>
        {isPdf ? (
          <img src="/brandfilm-poster.jpg" alt="DigiHome merkevarefilm" className="w-full h-full object-cover" />
        ) : (
          <>
            <video ref={vidRef} className="w-full h-full object-cover" src="/brandfilm-web.mp4" poster="/brandfilm-poster.jpg" muted={muted} loop playsInline preload="auto" />
            {/* mute toggle */}
            <button type="button" onClick={() => setMuted(m => !m)}
                    className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full px-3.5 py-2 transition-all hover:scale-[1.04]"
                    style={{ background: 'rgba(10,8,14,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)' }}>
              <Volume2 className="w-4 h-4 text-white" strokeWidth={2} style={{ opacity: muted ? 0.45 : 1 }} />
              <span className="text-[11px] font-semibold text-white" style={F}>{muted ? 'Slå på lyd' : 'Lyd på'}</span>
            </button>
          </>
        )}
      </div>

      {/* caption */}
      <p className="text-center mt-6 max-w-[580px] text-[13px] sm:text-[14.5px] leading-[1.6]"
         style={{ ...F, color: 'rgba(255,255,255,0.6)', animation: anim ? 'bfFade 0.9s cubic-bezier(0.22,1,0.36,1) 0.7s both' : undefined, opacity: show ? undefined : 0 }}>
        Én plattform tar hele jobben — fra annonse til daglig drift. Huseier løfter aldri en finger.
      </p>
    </div>
  </SlideFrame>
  );
};


const SLIDES: { C: any; light: boolean; animated?: boolean }[] = [
  { C: S1, light: false },                          // 01 · Cover (mørk — Bergen cityscape)
  { C: SBrandFilm, light: false },                  // 02 · Merkevarefilm (mørk — kinematisk brand-film)
  { C: SVisionIntro, light: true, animated: true }, // 03 · Visjon — krok (mørk→lys reveal)
  { C: SProblem, light: true },                     // 03 · Problemet — status quo (beige, flyttet frem)
  { C: SWhyNow, light: true },                      // 04 · Hvorfor nå — timing-vinduet (beige, flyttet frem)
  // { C: SWhyDH, light: true },                    // SKJULT etter ønske — «Løsningen» (Ett system som gjør jobben) overlappet «Fra verktøy til motor» + hadde utdatert korttid-innhold. Koden beholdt.
  { C: SFraVerktoyTilMotor, light: true },          // 05 · Løsningen / Konseptet — fra verktøy (proptech) til motor
  { C: SSlikViJobber, light: true },                // 06 · Slik jobber vi — verdikjeden (utleiemegling + forvaltning)
  { C: SSlikSystemetAutomatiserer, light: true },   // 07 · Slik automatiserer systemet — faktabasert, faner + teknologi
  { C: SAutopilotStatus, light: true },             // · Autopilot-status — hva som faktisk kjører i dag vs. veikart
  { C: SDriftsgearing, light: true },               // 08 · Driftsgearingen — payoff (samme forvalter, ~4×)
  { C: SAlleredeInntekter, light: true },           // 09 · Traksjon — allerede i drift (flyttet tidlig, rett etter payoff)
  { C: SProdukt, light: true },                     // 07 · Produktet — én motor, to produkter
  { C: SAIEiendom, light: true },                   // 08 · AI som forstår eiendom — 3 AI-moats
  { C: SArkitektur, light: true },                  // 09 · Arkitekturen — moat (animert, skjøvet bakover)
  { C: SOkosystem, light: true },                   // · Økosystem — integrasjoner (BankID, FINN, Vipps, regnskap m.m.)
  { C: SFilosofi, light: true },                    // 10 · Filosofien bak DigiHome (rett etter arkitektur)
  // { C: SDualUSP, light: true },                  // SKJULT etter ønske — «Tre unike aspekter». Koden beholdt.
  { C: SSelskapsstruktur, light: true },            // · Selskapsstruktur — DigiHome Tech AS + DigiHome AS under paraply
  { C: SVerdiflyt, light: true },                   // · Hvor verdien havner — Tech AS vs operatør (svarer «tech eller tjeneste?»)
  { C: SBusinessModels, light: true },              // 12 · Forretningsmodeller
  { C: SOperator, light: true },                    // · Den ideelle operatøren — franchise-ICP
  { C: SBetalingsmodell, light: true },             // 13 · Betalingsmodell
  { C: SMarket1, light: true },                     // 15 · Marked (NOK leievolum)
  { C: SMarket3, light: true },                     // 16 · Vei til 150 MNOK ARR (Norden)
  { C: SDiff, light: true },                        // 17 · Konkurransefortrinn (white)
  { C: SRevenue, light: true },                     // 18 · Inntektsmodell
  { C: SUnitEconomics, light: true },               // 19 · Unit economics
  { C: SBudgetRunway, light: true },                // 20 · Budsjett & runway (beige)
  { C: STeam, light: true },                        // 21 · Teamet (founder-market fit, mot slutten)
  { C: SAsk, light: true },                         // 22 · Pre-seed emisjon (beige)
  { C: S9, light: false },                          // 23 · Closing (mørk — Bergen harbor)
];
const ANIMATED_IDX = SLIDES.findIndex(s => s.animated);

export default function Presentasjon() {
  const [c, setC] = useState(0);
  const [navLocked, setNavLocked] = useState(false);
  const [s2Locked, setS2Locked] = useState(false);
  const [chromeLight, setChromeLight] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<'idle' | 'preparing' | 'capturing' | 'building' | 'uploading' | 'done'>('idle');
  const [cachedPdf, setCachedPdf] = useState<{ exists: boolean; size?: number; updated_at?: string } | null>(null);
  const next = useCallback(() => setC((v: any) => {
    if (v === ANIMATED_IDX && s2Locked) return v; // Animert slide: lås fremover til animasjonen er ferdig
    return Math.min(v + 1, SLIDES.length - 1);
  }), [s2Locked]);
  const prev = useCallback(() => setC((v: any) => Math.max(v - 1, 0)), []);

  // Lyse slides toner til lys bakgrunn — la chrome (piler) tilpasse seg.
  // Mørke slides tvinger chrome tilbake til lyst (slide-objektet bestemmer lys/mørk).
  useEffect(() => { if (!SLIDES[c]?.light) setChromeLight(false); }, [c]);

  // Slide 2: lås fremover-navigasjon til hele tekst-animasjonen er spilt ferdig
  // MIDLERTIDIG DEAKTIVERT — låsen er slått av etter ønske. Sett ENABLE_S2_LOCK = true for å reaktivere.
  const ENABLE_S2_LOCK = false;
  useEffect(() => {
    if (ENABLE_S2_LOCK && c === ANIMATED_IDX) {
      setS2Locked(true);
      const t = setTimeout(() => setS2Locked(false), 6400);
      return () => clearTimeout(t);
    }
    setS2Locked(false);
  }, [c]);

  const handleS2Complete = useCallback(() => setS2Locked(false), []);

  // Ved load: sjekk om cached PDF finnes på serveren
  useEffect(() => {
    fetch('/api/investor-deck/pdf/info')
      .then(r => r.ok ? r.json() : { exists: false })
      .then(setCachedPdf)
      .catch(() => setCachedPdf({ exists: false }));
  }, []);

  // ── PDF EKSPORT — Nydelig 16:9 deck (1920×1080), cached server-side ──
  const generateAndUpload = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);
    setExportStage('preparing');

    // Vent på off-screen render og animasjons-stabilisering
    await new Promise(r => setTimeout(r, 2800));
    setExportStage('capturing');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080],
      compress: true,
    });
    pdf.setProperties({
      title: 'DigiHome — Investor Deck',
      subject: 'AI-native PMS for dynamic rental',
      author: 'DigiHome AS',
      creator: 'DigiHome',
      keywords: 'PMS, dynamic rental, proptech, AI, FINN, Channex, BankID',
    });

    for (let i = 0; i < SLIDES.length; i++) {
      const el = document.getElementById(`pdf-slide-${i}`);
      if (!el) continue;
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0c0c0c',
          windowWidth: 1920,
          windowHeight: 1080,
          logging: false,
          imageTimeout: 8000,
        });
        if (i > 0) pdf.addPage([1920, 1080], 'landscape');
        const imgData = canvas.toDataURL('image/jpeg', 0.94);
        pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080, undefined, 'FAST');
      } catch (e) {
        console.error('[PDF] Slide', i, 'failed:', e);
      }
      setExportProgress(Math.round(((i + 1) / SLIDES.length) * 100));
    }

    setExportStage('building');
    await new Promise(r => setTimeout(r, 200));

    const pdfBlob = pdf.output('blob');
    const today = new Date().toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '-');

    // Last opp til server for fremtidige instant-downloads
    setExportStage('uploading');
    try {
      const formData = new FormData();
      formData.append('file', pdfBlob, 'DigiHome-Investor-Deck.pdf');
      formData.append('slide_count', String(SLIDES.length));
      await fetch('/api/investor-deck/pdf', { method: 'POST', body: formData });
      setCachedPdf({ exists: true, size: pdfBlob.size, updated_at: new Date().toISOString() });
    } catch (e) {
      console.error('[PDF] Upload to server failed:', e);
    }

    // Last ned lokalt for brukeren
    pdf.save(`DigiHome-Investor-Deck-${today}.pdf`);

    setExportStage('done');
    setTimeout(() => {
      setExporting(false);
      setExportProgress(0);
      setExportStage('idle');
    }, 800);
  }, [exporting]);

  // Hovedhandler — instant download hvis cached, ellers generer
  const handleDownload = useCallback(() => {
    if (cachedPdf?.exists) {
      // Instant direct download fra server
      const a = document.createElement('a');
      a.href = '/api/investor-deck/pdf';
      a.download = 'DigiHome-Investor-Deck.pdf';
      a.click();
    } else {
      // Første gang — generer og last opp
      generateAndUpload();
    }
  }, [cachedPdf, generateAndUpload]);

  // Touch swipe
  const touchRef = React.useRef<any>(null);
  const handleTouchStart = (e: any) => { touchRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: any) => {
    if (!touchRef.current) return;
    const diff = touchRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
    touchRef.current = null;
  };

  useEffect(() => {
    const h = (e: any) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

  return (
    <div className="dh-deck w-screen h-screen overflow-hidden relative bg-[#0c0c0c]" style={F}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {SLIDES.map((slide, i: number) => {
        const Slide: any = slide.C;
        return (
          <div key={i} className={`absolute inset-0 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${i === c ? 'opacity-100 scale-100' : i < c ? 'opacity-0 scale-[0.96]' : 'opacity-0 scale-[1.04]'}`} style={{ pointerEvents: i === c ? 'auto' : 'none', visibility: Math.abs(i - c) <= 1 ? 'visible' : 'hidden' }}>
            <Slide slideNum={i + 1} total={SLIDES.length} isActive={i === c} onLight={slide.light ? setChromeLight : undefined} onAnimationComplete={slide.animated ? handleS2Complete : undefined} />
          </div>
        );
      })}

      {/* ═══ Invisible click zones — left / right thirds ═══ */}
      <button
        onClick={prev}
        disabled={c === 0}
        aria-label="Forrige slide"
        className="group fixed left-0 top-0 bottom-0 w-[10%] z-40 cursor-w-resize disabled:cursor-not-allowed disabled:opacity-0 transition-opacity focus:outline-none focus-visible:outline-none"
        style={{ background: 'transparent' }}>
        <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ChevronLeft className="w-4 h-4 text-white/80" />
        </div>
      </button>
      <button
        onClick={next}
        disabled={c === SLIDES.length - 1 || (c === ANIMATED_IDX && s2Locked)}
        aria-label="Neste slide"
        className="group fixed right-0 top-0 bottom-0 w-[10%] z-40 cursor-e-resize disabled:cursor-not-allowed disabled:opacity-0 transition-opacity focus:outline-none focus-visible:outline-none"
        style={{ background: 'transparent' }}>
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ChevronRight className="w-4 h-4 text-white/80" />
        </div>
      </button>

      {/* ═══ Ultra-thin progress bar — bottom full width ═══ */}
      <div className="fixed bottom-0 left-0 right-0 h-[2px] z-40 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
        <div
          className="h-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: `${((c + 1) / SLIDES.length) * 100}%`,
            background: `linear-gradient(90deg, ${P}, #9333ea)`,
          }}
        />
      </div>

      {/* ═══ PDF Download — subtil glass-pille øverst til høyre ═══ */}
      {/* MIDLERTIDIG SKJULT: fjern `hidden ` under for å vise «Last ned PDF» igjen */}
      <div className="hidden fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex items-center gap-2">
        {/* Hovedknapp — Last ned PDF */}
        <button
          onClick={handleDownload}
          disabled={exporting}
          aria-label="Last ned investor-deck som PDF"
          data-testid="download-pdf-btn"
          className="h-9 px-3.5 rounded-full flex items-center gap-2 text-[11.5px] font-semibold tracking-wide transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:cursor-wait"
          style={{
            background: exporting ? 'rgba(210,152,255,0.92)' : (chromeLight ? 'rgba(28,22,16,0.05)' : 'rgba(255,255,255,0.08)'),
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${exporting ? 'rgba(210,152,255,0.45)' : (chromeLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)')}`,
            color: exporting ? 'rgba(255,255,255,0.92)' : (chromeLight ? 'rgba(28,22,16,0.9)' : 'rgba(255,255,255,0.92)'),
            boxShadow: exporting
              ? '0 8px 28px -8px rgba(210,152,255,0.5)'
              : (chromeLight ? '0 8px 24px -10px rgba(0,0,0,0.22)' : '0 8px 24px -10px rgba(0,0,0,0.4)'),
          }}>
          {exporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.4} />
              <span className="tabular-nums">
                {exportStage === 'preparing' && 'Klargjør…'}
                {exportStage === 'capturing' && `${exportProgress}%`}
                {exportStage === 'building' && 'Bygger PDF…'}
                {exportStage === 'uploading' && 'Lagrer…'}
                {exportStage === 'done' && 'Ferdig'}
              </span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Last ned PDF</span>
            </>
          )}
        </button>

        {/* Regenerer-knapp — kun synlig hvis cached PDF eksisterer */}
        {cachedPdf?.exists && !exporting && (
          <button
            onClick={generateAndUpload}
            aria-label="Regenerer PDF (oppdater cached versjon)"
            data-testid="regenerate-pdf-btn"
            title={`Cached PDF — oppdatert ${cachedPdf.updated_at ? new Date(cachedPdf.updated_at).toLocaleString('no-NO') : 'tidligere'}. Klikk for å oppdatere.`}
            className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-[1.06] active:scale-[0.95]"
            style={{
              background: chromeLight ? 'rgba(28,22,16,0.05)' : 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${chromeLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}`,
              color: chromeLight ? 'rgba(28,22,16,0.75)' : 'rgba(255,255,255,0.7)',
              boxShadow: chromeLight ? '0 8px 24px -10px rgba(0,0,0,0.22)' : '0 8px 24px -10px rgba(0,0,0,0.4)',
            }}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        )}
      </div>

      {/* ═══ Off-screen render container for PDF capture ═══ */}
      {exporting && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: '-99999px',
            width: 1920,
            pointerEvents: 'none',
            zIndex: -1,
          }}>
          {SLIDES.map((slide, i: number) => {
            const Slide: any = slide.C;
            return (
              <div
                key={`pdf-${i}`}
                id={`pdf-slide-${i}`}
                style={{
                  width: 1920,
                  height: 1080,
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#0c0c0c',
                }}>
                <Slide slideNum={i + 1} total={SLIDES.length} isActive={true} pdfMode={true} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
