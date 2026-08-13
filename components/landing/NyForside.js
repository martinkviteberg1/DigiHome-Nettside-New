'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   NY FORSIDE v2 — «drømmende» verdensklasse-landingsside i DigiHome-lilla.
   Univers: lavendel/periwinkle-himmel, myk grønn eng, DigiHome-violet (#8b5cf6)
   som primærfarge — ala Unloopa-referansen. AI-generert hus-maskot med lilla
   tak (/public/landing/*-lilla*.png). Alle produkt-mockups er kodebygde.
   Motion via framer-motion (respekterer prefers-reduced-motion).
   ──────────────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ArrowDown, Check, Sparkles, Search, FileSignature, Banknote,
  ShieldCheck, Camera, Users, KeyRound, Wallet, MessageCircle, Phone, Loader2,
  BadgeCheck, CalendarCheck, Star, Wrench, Plus, Zap, Clock,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
const INK = '#1d1730';
const INKs = { color: INK };
const MUTED = '#7d7692';
const BRØD = '#57506e'; // brødtekst
const VIOLET = '#8b5cf6';
const VIOLET_DYP = '#6d28d9';
const GRØNN = '#2c7a44';

/* Scroll-reveal preset. */
const opp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
};

/* Hover-løft for kort. */
const løft = { whileHover: { y: -5, transition: { duration: 0.25, ease: 'easeOut' } } };

const Etikett = ({ barn }) => (
  <p className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.16em]" style={{ color: VIOLET }}>{barn}</p>
);

/* ── Kodebygde mini-mockups ────────────────────────────────────────────────── */

const KortRamme = ({ className = '', children }) => (
  <div className={`rounded-2xl bg-white p-4 shadow-[0_30px_70px_-28px_rgba(90,60,180,0.4)] ring-1 ring-[#8b5cf6]/[0.08] ${className}`}>
    {children}
  </div>
);

const MockLeietaker = () => (
  <KortRamme className="w-[228px]">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>Ny leietaker funnet</p>
    <div className="mt-2.5 flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efeafd] text-[12px] font-bold" style={{ color: VIOLET_DYP }}>MJ</span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold" style={INKs}>Marte J.</p>
        <p className="text-[11px]" style={{ color: MUTED }}>Fast inntekt · ref. sjekket</p>
      </div>
      <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#e9f3ea]"><Check className="h-3.5 w-3.5" style={{ color: GRØNN }} /></span>
    </div>
    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#f4f0fd] px-2.5 py-1.5">
      <BadgeCheck className="h-3.5 w-3.5" style={{ color: VIOLET }} />
      <span className="text-[11px] font-semibold" style={{ color: VIOLET_DYP }}>Verifisert med BankID</span>
    </div>
  </KortRamme>
);

const MockInntekt = () => (
  <KortRamme className="w-[248px]">
    <div className="flex items-baseline justify-between">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>Leieinntekt</p>
      <span className="rounded-full bg-[#e9f3ea] px-2 py-0.5 text-[10px] font-bold" style={{ color: GRØNN }}>+4,2 %</span>
    </div>
    <p className="mt-1 text-[24px] font-bold tracking-tight" style={{ ...heading, ...INKs }}>18 500 kr<span className="text-[13px] font-semibold" style={{ color: MUTED }}>/mnd</span></p>
    <div className="mt-3 flex h-[54px] items-end gap-1.5">
      {[38, 46, 42, 52, 58, 54, 66, 74].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === 7 ? VIOLET : '#e9e2fa' }} />
      ))}
    </div>
    <p className="mt-2.5 flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>
      <CalendarCheck className="h-3.5 w-3.5" style={{ color: VIOLET }} /> Utbetales 1. hver måned
    </p>
  </KortRamme>
);

const MockUtbetalt = () => (
  <KortRamme className="w-[212px]">
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f3ea]"><Banknote className="h-[18px] w-[18px]" style={{ color: GRØNN }} /></span>
      <div>
        <p className="text-[12.5px] font-semibold" style={INKs}>Leie utbetalt</p>
        <p className="text-[11px]" style={{ color: MUTED }}>18 500 kr · januar</p>
      </div>
    </div>
    <div className="mt-3 space-y-1.5">
      {['Desember', 'November'].map((m) => (
        <div key={m} className="flex items-center justify-between rounded-lg bg-[#f7f5fd] px-2.5 py-1.5">
          <span className="text-[11px]" style={{ color: MUTED }}>{m}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: GRØNN }}>18 500 kr <Check className="h-3 w-3" /></span>
        </div>
      ))}
    </div>
  </KortRamme>
);

/* Steg-mockups. */
const stegSkygge = 'rounded-xl bg-white p-3 shadow-[0_18px_44px_-20px_rgba(90,60,180,0.32)] ring-1 ring-[#8b5cf6]/[0.07]';

const MockAdresse = () => (
  <div className={stegSkygge}>
    <div className="flex items-center gap-2 rounded-lg bg-[#f5f3fc] px-3 py-2.5">
      <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
      <span className="truncate text-[12.5px]" style={INKs}>Storgaten 12, Bergen</span>
      <span className="ml-auto rounded-md px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: VIOLET }}>Sjekk</span>
    </div>
    <div className="mt-2.5 flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-black/[0.05]">
      <span className="text-[11.5px]" style={{ color: MUTED }}>Estimert leie</span>
      <span className="text-[13px] font-bold" style={{ ...heading, ...INKs }}>17 500–19 000 kr</span>
    </div>
  </div>
);

const MockAnnonse = () => (
  <div className={stegSkygge}>
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#efeafd]"><Camera className="h-4 w-4" style={{ color: VIOLET }} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold" style={INKs}>Annonse publisert</p>
        <p className="text-[11px]" style={{ color: MUTED }}>FINN.no · proff-foto inkludert</p>
      </div>
    </div>
    <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-[#f5f3fc] px-3 py-2">
      <div className="flex -space-x-1.5">
        {['#cfc2ee', '#c9d6c0', '#e8c9be', '#b9c6e8'].map((f, i) => (
          <span key={i} className="h-6 w-6 rounded-full ring-2 ring-white" style={{ background: f }} />
        ))}
      </div>
      <span className="text-[11.5px] font-semibold" style={INKs}>12 interessenter</span>
      <span className="ml-auto text-[10.5px] font-bold uppercase tracking-wide" style={{ color: VIOLET }}>i dag</span>
    </div>
  </div>
);

const MockKontrakt = () => (
  <div className={stegSkygge}>
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#efeafd]"><FileSignature className="h-4 w-4" style={{ color: VIOLET }} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold" style={INKs}>Leiekontrakt.pdf</p>
        <p className="text-[11px]" style={{ color: MUTED }}>Kvalitetssikret av oss</p>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-[#e9f3ea] px-2 py-1 text-[10px] font-bold" style={{ color: GRØNN }}><Check className="h-3 w-3" /> Signert</span>
    </div>
    <div className="mt-2.5 space-y-1">
      <div className="h-1.5 w-4/5 rounded-full bg-[#ece7f8]" />
      <div className="h-1.5 w-3/5 rounded-full bg-[#ece7f8]" />
    </div>
    <p className="mt-2.5 text-[11px] font-semibold" style={{ color: MUTED }}>Signert digitalt med BankID av begge parter</p>
  </div>
);

const MockUtbetalinger = () => (
  <div className={stegSkygge}>
    {[['Januar', '18 500 kr'], ['Februar', '18 500 kr'], ['Mars', '18 500 kr']].map(([m, b], i) => (
      <div key={m} className={`flex items-center justify-between px-1.5 py-2 ${i < 2 ? 'border-b border-black/[0.05]' : ''}`}>
        <span className="flex items-center gap-2 text-[12px]" style={INKs}>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e9f3ea]"><Wallet className="h-3 w-3" style={{ color: GRØNN }} /></span>{m}
        </span>
        <span className="text-[12px] font-bold" style={{ color: GRØNN }}>{b} ✓</span>
      </div>
    ))}
  </div>
);

const MockChat = () => (
  <div className="space-y-2">
    <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-[#f0edf9] px-3.5 py-2.5">
      <p className="text-[12.5px]" style={INKs}>Hei! Vasken på badet lekker litt 🙈</p>
      <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>Leietaker · 09:14</p>
    </div>
    <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2.5" style={{ background: '#e9e0fb' }}>
      <p className="text-[12.5px]" style={INKs}>Takk for beskjed! Rørlegger kommer i morgen kl. 10 🔧</p>
      <p className="mt-0.5 text-right text-[10px]" style={{ color: MUTED }}>DigiHome · 09:21</p>
    </div>
    <div className="ml-auto flex max-w-[75%] items-center gap-1.5 rounded-full bg-[#e9f3ea] px-3 py-1.5">
      <Wrench className="h-3 w-3" style={{ color: GRØNN }} />
      <span className="text-[11px] font-semibold" style={{ color: GRØNN }}>Utbedret — uten at du løftet en finger</span>
    </div>
  </div>
);

const MockPortal = ({ stor = false }) => (
  <div className={stor ? '' : `${stegSkygge} p-3.5`}>
    {!stor && (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#d8cdf2]" /><span className="h-2 w-2 rounded-full bg-[#e6d8b4]" /><span className="h-2 w-2 rounded-full bg-[#c3d4bb]" />
        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Min portal</span>
      </div>
    )}
    <div className={`grid grid-cols-3 gap-2 ${stor ? '' : 'mt-3'}`}>
      {[['Utleid', '2 av 2', VIOLET_DYP], ['Denne mnd.', '37 000 kr', GRØNN], ['Hittil i år', '296 000 kr', INK]].map(([l, v, f]) => (
        <div key={l} className="rounded-lg bg-[#f5f3fc] px-2.5 py-2">
          <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{l}</p>
          <p className={`mt-0.5 font-bold ${stor ? 'text-[16px]' : 'text-[13px]'}`} style={{ ...heading, color: f }}>{v}</p>
        </div>
      ))}
    </div>
    <div className={`flex items-end gap-1 ${stor ? 'mt-3 h-[76px]' : 'mt-2 h-[44px]'}`}>
      {[30, 42, 38, 50, 44, 58, 52, 64, 60, 72, 68, 80].map((h, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 3 === 2 ? '#d9ccf6' : '#ece7f8' }} />
      ))}
    </div>
  </div>
);

/* Stor dashboard-utstilling i nettleserramme. */
const MockDashboard = () => (
  <div className="overflow-hidden rounded-2xl bg-white shadow-[0_50px_110px_-40px_rgba(90,60,180,0.5)] ring-1 ring-[#8b5cf6]/[0.1]">
    <div className="flex items-center gap-2 border-b border-black/[0.05] bg-[#faf9fe] px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#e8b4b4]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e6d8b4]" /><span className="h-2.5 w-2.5 rounded-full bg-[#c3d4bb]" />
      <span className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-4 py-1 text-[11px] ring-1 ring-black/[0.05]" style={{ color: MUTED }}>
        <KeyRound className="h-3 w-3" /> portal.digihome.no
      </span>
    </div>
    <div className="grid gap-5 p-5 sm:grid-cols-[1.25fr_1fr] sm:p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>Oversikt · 2026</p>
        <MockPortal stor />
      </div>
      <div className="space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>Siste hendelser</p>
        {[
          [Banknote, 'Leie utbetalt — 18 500 kr', 'i dag', GRØNN, '#e9f3ea'],
          [FileSignature, 'Kontrakt fornyet · Storgaten 12', 'i går', VIOLET, '#efeafd'],
          [Users, 'Visning gjennomført · 4 oppmøtte', 'man.', VIOLET, '#efeafd'],
          [Wrench, 'Vedlikehold utbedret · bad', 'forrige uke', GRØNN, '#e9f3ea'],
        ].map(([Ikon, t, tid, f, bg]) => (
          <div key={t} className="flex items-center gap-2.5 rounded-xl bg-[#faf9fe] px-3 py-2.5 ring-1 ring-black/[0.03]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: bg }}><Ikon className="h-4 w-4" style={{ color: f }} /></span>
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium" style={INKs}>{t}</p>
            <span className="shrink-0 text-[10.5px]" style={{ color: MUTED }}>{tid}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Selve siden ───────────────────────────────────────────────────────────── */

const MARQUEE = [
  [Camera, 'Annonsering på FINN.no'],
  [BadgeCheck, 'Digital signering med BankID'],
  [ShieldCheck, 'Depositum på sikret konto'],
  [Wallet, 'Utbetaling 1. hver måned'],
  [Users, 'Screening av alle søkere'],
  [MessageCircle, 'Én fast kontaktperson'],
  [Wrench, 'Vedlikehold ordnet for deg'],
];

const FAQ = [
  ['Hva koster det?', 'Du betaler en fast, forutsigbar andel av leien — ingen skjulte gebyrer, og ingenting før boligen faktisk er leid ut. Be om leievurdering, så får du et konkret tilbud for din bolig.'],
  ['Hvor raskt finner dere leietaker?', 'De fleste boliger er leid ut i løpet av få uker. Proff-foto, riktig prising og annonsering på FINN.no gjør at vi treffer de riktige søkerne raskt.'],
  ['Hva om leietakeren ikke betaler?', 'Vi følger opp alle betalinger og håndterer purringer for deg. Ønsker du ekstra sikkerhet, tilbyr vi husleiegaranti — da er leien trygg uansett.'],
  ['Må jeg binde meg over lang tid?', 'Nei. Vi tror på å levere så godt at du blir — ikke på lange bindingstider. Vilkårene får du svart på hvitt før du signerer.'],
  ['Hvem tar seg av vedlikehold og henvendelser?', 'Vi gjør det. Leietaker kontakter oss direkte, vi koordinerer håndverkere og holder deg oppdatert i portalen. Du involveres bare når det faktisk trengs.'],
];

export default function NyForside() {
  const rolig = useReducedMotion();
  const [skjema, setSkjema] = useState({ name: '', phone: '', email: '', address: '' });
  const [sender, setSender] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [feil, setFeil] = useState('');
  const [åpenFaq, setÅpenFaq] = useState(0);
  const [skrolt, setSkrolt] = useState(false);

  /* Nav: transparent over heroen, glass først ved scroll. Myk ankerscroll. */
  React.useEffect(() => {
    const h = () => setSkrolt(window.scrollY > 24);
    h();
    window.addEventListener('scroll', h, { passive: true });
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      window.removeEventListener('scroll', h);
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!skjema.name.trim() || (!skjema.phone.trim() && !skjema.email.trim())) {
      setFeil('Skriv inn navn og telefon eller e-post.');
      return;
    }
    setSender(true); setFeil('');
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...skjema, lead_type: 'huseier', source: 'ny-forside', attribution: { landing: 'ny-forside' } }),
      });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.error || 'Noe gikk galt — prøv igjen');
      setSendt(true);
    } catch (err) { setFeil(err.message); }
    setSender(false);
  };

  const svev = (delay = 0, amp = 8, dur = 6) =>
    rolig ? {} : { animate: { y: [0, -amp, 0] }, transition: { duration: dur, delay, repeat: Infinity, ease: 'easeInOut' } };

  const tilKontakt = () => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="min-h-screen bg-[#faf9fe] antialiased" style={{ ...INKs, fontFamily: 'var(--font-body)' }} data-testid="ny-forside">

      {/* ── Nav: usynlig over heroen, glass ved scroll ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          skrolt
            ? 'border-b border-[#8b5cf6]/[0.07] bg-[#faf9fe]/85 shadow-[0_10px_34px_-20px_rgba(90,60,180,0.35)] backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
        data-testid="nav"
      >
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-8 px-5">
          <a href="/ny-forside" aria-label="DigiHome" className="flex items-center">
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
          </a>
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium md:flex" style={{ color: MUTED }}>
            <a href="#slik" className="transition-colors hover:text-[#1d1730]">Slik fungerer det</a>
            <a href="#alt" className="transition-colors hover:text-[#1d1730]">Det vi tar oss av</a>
            <a href="#portal" className="transition-colors hover:text-[#1d1730]">Portalen</a>
            <a href="#faq" className="transition-colors hover:text-[#1d1730]">Spørsmål</a>
          </nav>
          <button
            onClick={tilKontakt}
            data-testid="nav-cta"
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background: INK }}
          >
            Få gratis leievurdering <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16">
        <img
          src="/landing/hero-scene-lilla.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-[#faf9fe] via-[#faf9fe]/55 to-transparent" />

        <div className="relative mx-auto max-w-[1180px] px-5 pb-14 pt-14 sm:pt-20">
          <motion.div {...opp} className="mx-auto max-w-[760px] text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-[12px] font-semibold shadow-[0_2px_14px_rgba(90,60,180,0.14)] ring-1 ring-[#8b5cf6]/[0.12]" style={{ color: VIOLET_DYP }}>
              <Sparkles className="h-3.5 w-3.5" /> Utleie på autopilot — fra annonse til utbetaling
            </span>
            <h1 className="mt-5 text-[42px] font-bold leading-[1.04] tracking-tight sm:text-[64px] lg:text-[72px]" style={heading}>
              Lei ut boligen din.
              <br />
              <span className="bg-gradient-to-r from-[#6d28d9] via-[#8b5cf6] to-[#a78bfa] bg-clip-text text-transparent">Uten stress.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-relaxed sm:text-[17.5px]" style={{ color: BRØD }}>
              DigiHome tar hele jobben — annonsering, visninger, leietaker, kontrakt og oppfølging.
              Du får leien rett på konto. Hver måned.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={tilKontakt}
                data-testid="hero-cta"
                className="flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white shadow-[0_16px_38px_-10px_rgba(109,40,217,0.6)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg, ${VIOLET_DYP}, ${VIOLET})` }}
              >
                Få gratis leievurdering <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#slik"
                className="flex h-12 items-center gap-2 rounded-full bg-white/90 px-6 text-[15px] font-semibold shadow-[0_2px_14px_rgba(90,60,180,0.12)] ring-1 ring-[#8b5cf6]/[0.1] transition-all hover:-translate-y-0.5 hover:bg-white active:scale-[0.97]"
                style={INKs}
              >
                Slik fungerer det <ArrowDown className="h-4 w-4" style={{ color: MUTED }} />
              </a>
            </div>
          </motion.div>

          {/* Svevende produktkort + maskot over engen. */}
          <div className="relative mx-auto mt-14 flex max-w-[900px] items-end justify-center gap-4 sm:gap-6">
            <motion.div {...opp} transition={{ ...opp.transition, delay: 0.15 }} className="hidden -rotate-[5deg] sm:block">
              <motion.div {...svev(0.4, 7, 6.4)}><MockLeietaker /></motion.div>
            </motion.div>
            <motion.div {...opp} transition={{ ...opp.transition, delay: 0.05 }} className="z-10 -mb-2">
              <motion.div {...svev(0, 9, 7)}><MockInntekt /></motion.div>
            </motion.div>
            <motion.div {...opp} transition={{ ...opp.transition, delay: 0.25 }} className="hidden rotate-[4deg] md:block">
              <motion.div {...svev(0.8, 7, 6.8)}><MockUtbetalt /></motion.div>
            </motion.div>
            <motion.img
              src="/landing/maskot-vink-lilla-fri.png"
              alt="DigiHome-maskoten vinker"
              className="pointer-events-none -mb-3 hidden w-[150px] select-none drop-shadow-[0_24px_28px_rgba(90,60,180,0.3)] lg:block"
              {...opp}
              transition={{ ...opp.transition, delay: 0.35 }}
            />
          </div>
        </div>
      </section>

      {/* ── Marquee-tillitsstripe ── */}
      <section className="border-y border-[#8b5cf6]/[0.07] bg-[#f4f1fb]">
        <div className="relative overflow-hidden py-4">
          {rolig ? (
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5">
              {MARQUEE.map(([Ikon, t]) => (
                <span key={t} className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: '#6a5f8a' }}>
                  <Ikon className="h-4 w-4" style={{ color: VIOLET }} /> {t}
                </span>
              ))}
            </div>
          ) : (
            <motion.div
              className="flex w-max items-center gap-10 pr-10"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
            >
              {[...MARQUEE, ...MARQUEE].map(([Ikon, t], i) => (
                <span key={`${t}-${i}`} className="flex shrink-0 items-center gap-2 text-[12.5px] font-semibold" style={{ color: '#6a5f8a' }}>
                  <Ikon className="h-4 w-4" style={{ color: VIOLET }} /> {t}
                </span>
              ))}
            </motion.div>
          )}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#f4f1fb] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#f4f1fb] to-transparent" />
        </div>
      </section>

      {/* ── Partnerlogoer — kjent og trygt ── */}
      <section className="mx-auto max-w-[1180px] px-5 pt-14">
        <motion.div {...opp} className="flex flex-col items-center gap-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: MUTED }}>I godt selskap</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5" data-testid="partnerlogoer">
            {[
              ['finn-logo-full.png', 'FINN.no', 'h-5'],
              ['bankid-logo.png', 'BankID', 'h-6'],
              ['airbnb-logo.png', 'Airbnb', 'h-6'],
              ['booking-logo.png', 'Booking.com', 'h-5'],
              ['creditsafe-logo.png', 'Creditsafe', 'h-5'],
            ].map(([fil, alt, h]) => (
              <img key={fil} src={`/${fil}`} alt={alt} title={alt} className={`${h} w-auto opacity-40 grayscale transition-all duration-300 hover:opacity-90 hover:grayscale-0`} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Slik fungerer det ── */}
      <section id="slik" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-20 sm:py-24">
        <motion.div {...opp} className="mx-auto max-w-[560px] text-center">
          <Etikett barn="Slik fungerer det" />
          <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[40px]" style={heading}>
            Fortell oss om boligen.
            <br />Vi gjør resten.
          </h2>
        </motion.div>
        <div className="mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2">
          {[
            { n: '1', t: 'Fortell oss om boligen', b: 'Adresse og noen få detaljer — så får du en gratis og uforpliktende leievurdering samme dag.', M: MockAdresse, maskot: '/landing/maskot-lupe-lilla-fri.png' },
            { n: '2', t: 'Vi finner leietakeren', b: 'Proff-foto, annonse på FINN og visninger. Vi screener alle søkere med referanse- og kredittsjekk.', M: MockAnnonse, maskot: '/landing/maskot-foto-lilla-fri.png' },
            { n: '3', t: 'Trygg kontrakt og innflytting', b: 'Kvalitetssikret leiekontrakt signeres digitalt med BankID. Depositum settes på sikret konto.', M: MockKontrakt, maskot: '/landing/maskot-kontrakt-lilla-fri.png' },
            { n: '4', t: 'Leien rett på konto', b: 'Vi krever inn leien og følger opp betalinger. Du får utbetaling og rapport 1. hver måned.', M: MockUtbetalinger, maskot: '/landing/maskot-mynt-lilla-fri.png' },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              {...opp}
              {...løft}
              transition={{ ...opp.transition, delay: i * 0.06 }}
              className="relative rounded-3xl bg-[#f4f1fb] p-6 ring-1 ring-[#8b5cf6]/[0.05] sm:p-7"
            >
              <img
                src={s.maskot}
                alt=""
                aria-hidden
                className="pointer-events-none absolute -top-8 right-3 w-[84px] rotate-6 select-none drop-shadow-[0_16px_20px_rgba(90,60,180,0.3)] sm:w-[92px]"
              />
              <div className="pr-16"><s.M /></div>
              <div className="mt-5 flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold text-white" style={{ background: VIOLET, ...heading }}>{s.n}</span>
                <div>
                  <h3 className="text-[17px] font-bold tracking-tight" style={heading}>{s.t}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: BRØD }}>{s.b}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Stats-bånd ── */}
      <section className="mx-auto max-w-[1180px] px-5 pb-20 sm:pb-24">
        <motion.div {...opp} className="grid gap-4 rounded-3xl bg-white p-8 shadow-[0_24px_60px_-30px_rgba(90,60,180,0.3)] ring-1 ring-[#8b5cf6]/[0.06] sm:grid-cols-3 sm:p-10">
          {[
            [Clock, '2 min', 'å be om leievurdering — resten tar vi'],
            [CalendarCheck, '1. hver mnd.', 'utbetaling og rapport, alltid til tiden'],
            [Zap, '100 % digital', 'signering, dokumenter og oversikt i portalen'],
          ].map(([Ikon, tall, tekst]) => (
            <div key={tall} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efeafd]"><Ikon className="h-5 w-5" style={{ color: VIOLET }} /></span>
              <div>
                <p className="text-[26px] font-bold tracking-tight" style={{ ...heading, color: VIOLET_DYP }}>{tall}</p>
                <p className="mt-0.5 text-[13px] leading-snug" style={{ color: BRØD }}>{tekst}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Bento: alt vi tar oss av ── */}
      <section id="alt" className="scroll-mt-20 bg-[#f4f1fb] py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <motion.div {...opp} className="mx-auto max-w-[560px] text-center">
            <Etikett barn="Det vi tar oss av" />
            <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[40px]" style={heading}>
              Alt du trenger for trygg utleie
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <motion.div {...opp} {...løft} className="relative overflow-hidden rounded-3xl bg-white p-7 shadow-[0_24px_60px_-30px_rgba(90,60,180,0.3)] ring-1 ring-[#8b5cf6]/[0.05]">
              <h3 className="text-[19px] font-bold tracking-tight" style={heading}>Full oversikt i din egen portal</h3>
              <p className="mt-1.5 max-w-[380px] text-[13.5px] leading-relaxed" style={{ color: BRØD }}>
                Inntekter, kontrakter og dokumenter — samlet på ett sted. Alltid oppdatert, alltid tilgjengelig.
              </p>
              <div className="mt-5 max-w-[420px]"><MockPortal /></div>
              <img
                src="/landing/maskot-titter-lilla-fri.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute -bottom-7 -right-6 w-[150px] select-none opacity-95 sm:w-[175px]"
              />
            </motion.div>

            <motion.div {...opp} {...løft} transition={{ ...opp.transition, delay: 0.08 }} className="rounded-3xl bg-white p-7 shadow-[0_24px_60px_-30px_rgba(90,60,180,0.3)] ring-1 ring-[#8b5cf6]/[0.05]">
              <h3 className="text-[19px] font-bold tracking-tight" style={heading}>Vi tar oss av leietakeren</h3>
              <p className="mt-1.5 max-w-[380px] text-[13.5px] leading-relaxed" style={{ color: BRØD }}>
                Spørsmål, småfiks og oppfølging går til oss — ikke til deg. Du hører fra oss når det faktisk betyr noe.
              </p>
              <div className="mt-5 max-w-[400px]"><MockChat /></div>
            </motion.div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Camera, 'Annonse og proff-foto', 'Boligen presenteres fra sin beste side — vi skriver, fotograferer og publiserer.'],
              [Users, 'Visninger og screening', 'Vi møter interessentene og sjekker referanser og betalingsevne før du sier ja.'],
              [ShieldCheck, 'Depositum og kontrakt', 'Sikret depositumskonto og kvalitetssikret kontrakt — signert med BankID.'],
              [MessageCircle, 'Oppfølging hele veien', 'Innflytting, vedlikehold og utflytting — én fast kontaktperson hos oss.'],
            ].map(([Ikon, t, b], i) => (
              <motion.div
                key={t}
                {...opp}
                {...løft}
                transition={{ ...opp.transition, delay: i * 0.05 }}
                className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(90,60,180,0.25)] ring-1 ring-[#8b5cf6]/[0.05]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efeafd]"><Ikon className="h-5 w-5" style={{ color: VIOLET }} /></span>
                <h3 className="mt-4 text-[15.5px] font-bold tracking-tight" style={heading}>{t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: BRØD }}>{b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pust ut — full-bleed drømmescene ── */}
      <section className="relative overflow-hidden" data-testid="pust-ut">
        <img
          src="/landing/maskot-sover-scene-lilla.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full select-none object-cover"
          style={{ objectPosition: 'center 42%' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/60 via-white/15 to-transparent" />
        <div className="relative mx-auto flex min-h-[340px] max-w-[1180px] items-center px-5 py-16 sm:min-h-[460px]">
          <motion.div {...opp} className="max-w-[460px]">
            <h2 className="text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[52px]" style={{ ...heading, color: '#37295f' }}>
              Du kan faktisk
              <br />slappe av.
            </h2>
            <p className="mt-4 max-w-[380px] text-[15px] leading-relaxed sm:text-[16px]" style={{ color: '#55477e' }}>
              Mens vi håndterer leietaker, betalinger og alt det praktiske — sover du godt.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Portal-utstilling ── */}
      <section id="portal" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-20 sm:py-24">
        <motion.div {...opp} className="mx-auto max-w-[560px] text-center">
          <Etikett barn="Portalen" />
          <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[40px]" style={heading}>
            Full kontroll. Null jobb.
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-[15px] leading-relaxed" style={{ color: BRØD }}>
            Følg inntekter, kontrakter og hendelser i sanntid — fra sofaen, hytta eller stranda.
          </p>
        </motion.div>
        <motion.div
          {...opp}
          transition={{ ...opp.transition, delay: 0.1 }}
          className="relative mx-auto mt-12 max-w-[900px]"
        >
          <div className="pointer-events-none absolute inset-x-0 -bottom-10 top-14 rounded-[40px] bg-gradient-to-b from-[#efeafd] to-[#e3d9fb] opacity-70 sm:-inset-x-8" aria-hidden />
          <div className="relative">
            <MockDashboard />
          </div>
        </motion.div>
      </section>

      {/* ── Trygghet ── */}
      <section id="trygghet" className="scroll-mt-20 bg-[#f4f1fb] py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 lg:grid-cols-2">
          <motion.div {...opp} className="order-2 mx-auto w-full max-w-[420px] lg:order-1">
            <div className="relative">
              <img src="/landing/maskot-hjerte-lilla-fri.png" alt="DigiHome-maskoten holder et hjerte" className="mx-auto w-[78%] select-none drop-shadow-[0_36px_44px_rgba(90,60,180,0.25)]" />
              <motion.div
                {...svev(0.3, 6, 5.5)}
                className="absolute -right-3 top-8 rounded-2xl bg-white px-4 py-3 shadow-[0_20px_44px_-16px_rgba(90,60,180,0.4)] ring-1 ring-[#8b5cf6]/[0.08]"
              >
                <p className="flex items-center gap-1.5 text-[12.5px] font-bold" style={INKs}>
                  <Star className="h-3.5 w-3.5 fill-[#e2a33c] text-[#e2a33c]" /> «Endelig helt stressfritt»
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>Utleier i Bergen</p>
              </motion.div>
            </div>
          </motion.div>
          <motion.div {...opp} className="order-1 lg:order-2">
            <Etikett barn="Trygghet" />
            <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[40px]" style={heading}>
              Tryggere enn å leie ut selv
            </h2>
            <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed" style={{ color: BRØD }}>
              Utleie handler om tillit. Derfor gjør vi jobben grundig — fra første visning til siste utbetaling.
            </p>
            <ul className="mt-7 space-y-4">
              {[
                ['Grundig screening av leietaker', 'Referanser, inntekt og historikk sjekkes før kontrakt.'],
                ['Husleiegaranti tilgjengelig', 'Vil du ha ekstra sikkerhet, tilbyr vi garanti for leien.'],
                ['Én fast kontaktperson', 'Du snakker alltid med et menneske som kjenner boligen din.'],
              ].map(([t, b]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9f3ea]"><Check className="h-3.5 w-3.5" style={{ color: GRØNN }} /></span>
                  <div>
                    <p className="text-[15px] font-bold tracking-tight" style={heading}>{t}</p>
                    <p className="mt-0.5 text-[13.5px]" style={{ color: BRØD }}>{b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="mx-auto max-w-[760px] scroll-mt-20 px-5 py-20 sm:py-24">
        <motion.div {...opp} className="text-center">
          <Etikett barn="Spørsmål og svar" />
          <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[40px]" style={heading}>
            Lurer du på noe?
          </h2>
        </motion.div>
        <motion.div {...opp} className="mt-10 space-y-3">
          {FAQ.map(([sp, sv], i) => {
            const åpen = åpenFaq === i;
            return (
              <div key={sp} className={`overflow-hidden rounded-2xl bg-white ring-1 transition-all ${åpen ? 'ring-[#8b5cf6]/[0.18] shadow-[0_20px_50px_-24px_rgba(90,60,180,0.35)]' : 'ring-[#8b5cf6]/[0.06] shadow-[0_10px_30px_-20px_rgba(90,60,180,0.2)] hover:ring-[#8b5cf6]/[0.14]'}`}>
                <button
                  onClick={() => setÅpenFaq(åpen ? -1 : i)}
                  data-testid={`faq-${i}`}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                >
                  <span className="flex-1 text-[15px] font-bold tracking-tight" style={heading}>{sp}</span>
                  <motion.span animate={{ rotate: åpen ? 45 : 0 }} transition={{ duration: 0.25 }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#efeafd]">
                    <Plus className="h-4 w-4" style={{ color: VIOLET }} />
                  </motion.span>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: åpen ? 'auto' : 0, opacity: åpen ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[13.5px] leading-relaxed" style={{ color: BRØD }}>{sv}</p>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* ── CTA + lead-skjema ── */}
      <section id="kontakt" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 pb-20 sm:pb-24">
        <motion.div
          {...opp}
          className="relative overflow-hidden rounded-[32px] px-6 py-12 text-center ring-1 ring-white/[0.16] sm:px-12 sm:py-16"
          style={{ background: `linear-gradient(135deg, #5b21b6 0%, ${VIOLET_DYP} 40%, ${VIOLET} 75%, #a78bfa 100%)` }}
        >
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
          <img
            src="/landing/maskot-duo-lilla-fri.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -bottom-5 right-8 hidden w-[160px] select-none drop-shadow-[0_18px_26px_rgba(15,5,50,0.45)] lg:block"
          />

          {sendt ? (
            <div className="relative mx-auto max-w-[440px]" data-testid="lead-takk">
              <img src="/landing/maskot-nokkel-lilla-fri.png" alt="" aria-hidden className="mx-auto w-[130px] select-none drop-shadow-[0_20px_30px_rgba(30,10,70,0.4)]" />
              <h2 className="mt-4 text-[30px] font-bold tracking-tight text-white sm:text-[36px]" style={heading}>Takk! Vi tar kontakt 🤝</h2>
              <p className="mt-2 text-[15px] text-white/85">Du hører fra oss innen én virkedag med en gratis leievurdering av boligen din.</p>
            </div>
          ) : (
            <div className="relative">
              <h2 className="text-[32px] font-bold leading-tight tracking-tight text-white sm:text-[44px]" style={heading}>
                Klar for stressfri utleie?
              </h2>
              <p className="mx-auto mt-3 max-w-[440px] text-[15px] leading-relaxed text-white/85">
                Få en gratis og uforpliktende leievurdering — vi svarer innen én virkedag.
              </p>
              <form onSubmit={send} className="mx-auto mt-8 grid max-w-[680px] gap-3 sm:grid-cols-2" data-testid="lead-skjema">
                {[
                  ['name', 'Navn', 'text'],
                  ['phone', 'Telefon', 'tel'],
                  ['email', 'E-post', 'email'],
                  ['address', 'Boligens adresse (valgfritt)', 'text'],
                ].map(([felt, ph, type]) => (
                  <input
                    key={felt}
                    type={type}
                    value={skjema[felt]}
                    onChange={(e) => setSkjema((s) => ({ ...s, [felt]: e.target.value }))}
                    placeholder={ph}
                    data-testid={`lead-${felt}`}
                    className="h-12 rounded-xl bg-white/95 px-4 text-[14px] outline-none ring-1 ring-white/40 transition-all placeholder:text-[#9d94b8] focus:bg-white focus:ring-2 focus:ring-white"
                    style={INKs}
                  />
                ))}
                <button
                  type="submit"
                  disabled={sender}
                  data-testid="lead-send"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1d1730] text-[15px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] sm:col-span-2"
                >
                  {sender ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Få gratis leievurdering
                </button>
              </form>
              {feil && <p className="mt-3 text-[13px] font-semibold text-white" data-testid="lead-feil">{feil}</p>}
              <p className="mt-4 text-[11.5px] text-white/70">Helt uforpliktende. Vi deler aldri opplysningene dine.</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Footer: kinoscene som smelter inn i mørk, strukturert footer ── */}
      <footer className="relative" data-testid="footer">
        {/* Drømmescenen — ren, uten tekst, glir sømløst over i footermørket */}
        <div className="relative h-[300px] overflow-hidden sm:h-[440px]">
          <img
            src="/landing/footer-scene-lilla.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ objectPosition: 'center 62%' }}
          />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#faf9fe] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#141022] via-[#141022]/55 to-transparent" />
        </div>

        {/* Mørk footer */}
        <div className="relative bg-[#141022] text-[#a99fc4]">
          <div className="mx-auto max-w-[1180px] px-5">
            {/* Topp: logo + lenkekolonner */}
            <div className="grid gap-10 pb-12 pt-4 sm:pt-8 lg:grid-cols-[1.3fr_2fr]">
              <div>
                <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-7 w-auto" />
                <p className="mt-4 max-w-[280px] text-[13.5px] leading-relaxed text-[#8f86ad]">
                  Utleie uten stress — vi tar hele jobben fra annonse til utbetaling, så du kan slappe av.
                </p>
                <button
                  onClick={tilKontakt}
                  data-testid="footer-cta"
                  className="mt-6 flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-[#1d1730] transition-all hover:bg-[#ece7fb] active:scale-[0.97]"
                >
                  Få gratis leievurdering <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                {[
                  ['Utforsk', [['#slik', 'Slik fungerer det'], ['#alt', 'Det vi tar oss av'], ['#portal', 'Portalen'], ['#faq', 'Spørsmål og svar']]],
                  ['Selskap', [['/kontakt', 'Kontakt oss'], ['/utleie', 'Utleie'], ['/utleiemegler-bergen', 'Utleiemegler i Bergen']]],
                  ['Juridisk', [['/personvern', 'Personvern'], ['/vilkar', 'Vilkår']]],
                ].map(([tittel, lenker]) => (
                  <div key={tittel}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6e6590]">{tittel}</p>
                    <ul className="mt-4 space-y-2.5">
                      {lenker.map(([href, tekst]) => (
                        <li key={tekst}>
                          <a href={href} className="text-[13.5px] text-[#a99fc4] transition-colors hover:text-white">{tekst}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Bunnlinje */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.07] py-5 text-[12px] text-[#6e6590]">
              <span>© 2026 DigiHome AS</span>
              <span className="hidden items-center gap-1.5 sm:flex"><KeyRound className="h-3.5 w-3.5" /> Laget i Bergen</span>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="ml-auto flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[#8f86ad] transition-colors hover:bg-white/[0.06] hover:text-white"
                data-testid="til-toppen"
              >
                Til toppen <ArrowDown className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>
          </div>

          {/* Gigant-typografi klippet i bunnkanten — signaturavslutning */}
          <div className="pointer-events-none select-none overflow-hidden" aria-hidden>
            <p
              className="-mb-[0.24em] bg-gradient-to-b from-white/[0.1] to-white/[0.01] bg-clip-text text-center text-[24vw] font-bold leading-none tracking-tight text-transparent sm:text-[15rem]"
              style={heading}
            >
              digihome
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
