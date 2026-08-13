'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   NY FORSIDE — «drømmende» premium-landingsside for DigiHome.
   Univers: varm krem/fersken-himmel, salviegrønn eng, terracotta-CTA og en
   AI-generert hus-maskot (/public/landing/*.png). Alle produkt-mockups er
   kodebygde for maksimal skarphet. Motion via framer-motion (respekterer
   prefers-reduced-motion automatisk).
   ──────────────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ArrowDown, Check, Sparkles, Home, Search, FileSignature, Banknote,
  ShieldCheck, Camera, Users, KeyRound, Wallet, MessageCircle, Phone, Loader2,
  BadgeCheck, CalendarCheck, Star, Wrench,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
const INK = '#221b14';
const MUTED = '#8a7f72';
const TERRA = '#c4633c';
const SAGE = '#6f8b62';

/* Scroll-reveal preset. */
const opp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
};

/* Liten caps-etikett over seksjonstitler. */
const Etikett = ({ barn }) => (
  <p className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.16em]" style={{ color: TERRA }}>{barn}</p>
);

/* ── Kodebygde mini-mockups (skarpe, alltid on-brand) ──────────────────────── */

const KortRamme = ({ className = '', children, style }) => (
  <div className={`rounded-2xl bg-white p-4 shadow-[0_30px_70px_-28px_rgba(120,70,30,0.35)] ring-1 ring-black/[0.04] ${className}`} style={style}>
    {children}
  </div>
);

const MockLeietaker = () => (
  <KortRamme className="w-[228px]">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>Ny leietaker funnet</p>
    <div className="mt-2.5 flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef2ea] text-[12px] font-bold" style={{ color: SAGE }}>MJ</span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold" style={INKs}>Marte J.</p>
        <p className="text-[11px]" style={{ color: MUTED }}>Fast inntekt · ref. sjekket</p>
      </div>
      <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#e9f3ea]"><Check className="h-3.5 w-3.5 text-[#2c7a44]" /></span>
    </div>
    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#fdf4ee] px-2.5 py-1.5">
      <BadgeCheck className="h-3.5 w-3.5" style={{ color: TERRA }} />
      <span className="text-[11px] font-semibold" style={{ color: TERRA }}>Verifisert med BankID</span>
    </div>
  </KortRamme>
);

const MockInntekt = () => (
  <KortRamme className="w-[248px]">
    <div className="flex items-baseline justify-between">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>Leieinntekt</p>
      <span className="rounded-full bg-[#e9f3ea] px-2 py-0.5 text-[10px] font-bold text-[#2c7a44]">+4,2 %</span>
    </div>
    <p className="mt-1 text-[24px] font-bold tracking-tight" style={{ ...heading, ...INKs }}>18 500 kr<span className="text-[13px] font-semibold" style={{ color: MUTED }}>/mnd</span></p>
    <div className="mt-3 flex h-[54px] items-end gap-1.5">
      {[38, 46, 42, 52, 58, 54, 66, 74].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === 7 ? TERRA : '#f3e3d3' }} />
      ))}
    </div>
    <p className="mt-2.5 flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>
      <CalendarCheck className="h-3.5 w-3.5" style={{ color: SAGE }} /> Utbetales 1. hver måned
    </p>
  </KortRamme>
);

const MockUtbetalt = () => (
  <KortRamme className="w-[212px]">
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f3ea]"><Banknote className="h-4.5 w-4.5 h-[18px] w-[18px] text-[#2c7a44]" /></span>
      <div>
        <p className="text-[12.5px] font-semibold" style={INKs}>Leie utbetalt</p>
        <p className="text-[11px]" style={{ color: MUTED }}>18 500 kr · januar</p>
      </div>
    </div>
    <div className="mt-3 space-y-1.5">
      {['Desember', 'November'].map((m) => (
        <div key={m} className="flex items-center justify-between rounded-lg bg-[#faf6ef] px-2.5 py-1.5">
          <span className="text-[11px]" style={{ color: MUTED }}>{m}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#2c7a44]">18 500 kr <Check className="h-3 w-3" /></span>
        </div>
      ))}
    </div>
  </KortRamme>
);

const INKs = { color: INK };

/* Steg-mockups. */
const MockAdresse = () => (
  <div className="rounded-xl bg-white p-3 shadow-[0_18px_44px_-20px_rgba(120,70,30,0.28)] ring-1 ring-black/[0.04]">
    <div className="flex items-center gap-2 rounded-lg bg-[#faf6ef] px-3 py-2.5">
      <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
      <span className="truncate text-[12.5px]" style={INKs}>Storgaten 12, Bergen</span>
      <span className="ml-auto rounded-md px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: TERRA }}>Sjekk</span>
    </div>
    <div className="mt-2.5 flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-black/[0.05]">
      <span className="text-[11.5px]" style={{ color: MUTED }}>Estimert leie</span>
      <span className="text-[13px] font-bold" style={{ ...heading, ...INKs }}>17 500–19 000 kr</span>
    </div>
  </div>
);

const MockAnnonse = () => (
  <div className="rounded-xl bg-white p-3 shadow-[0_18px_44px_-20px_rgba(120,70,30,0.28)] ring-1 ring-black/[0.04]">
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2ea]"><Camera className="h-4 w-4" style={{ color: SAGE }} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold" style={INKs}>Annonse publisert</p>
        <p className="text-[11px]" style={{ color: MUTED }}>FINN.no · proff-foto inkludert</p>
      </div>
    </div>
    <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-[#faf6ef] px-3 py-2">
      <div className="flex -space-x-1.5">
        {['#dfc9b2', '#c9d6c0', '#e8c9be', '#d6cfe4'].map((f, i) => (
          <span key={i} className="h-6 w-6 rounded-full ring-2 ring-white" style={{ background: f }} />
        ))}
      </div>
      <span className="text-[11.5px] font-semibold" style={INKs}>12 interessenter</span>
      <span className="ml-auto text-[10.5px] font-bold uppercase tracking-wide" style={{ color: SAGE }}>i dag</span>
    </div>
  </div>
);

const MockKontrakt = () => (
  <div className="rounded-xl bg-white p-3 shadow-[0_18px_44px_-20px_rgba(120,70,30,0.28)] ring-1 ring-black/[0.04]">
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fdf4ee]"><FileSignature className="h-4 w-4" style={{ color: TERRA }} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold" style={INKs}>Leiekontrakt.pdf</p>
        <p className="text-[11px]" style={{ color: MUTED }}>Kvalitetssikret av oss</p>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-[#e9f3ea] px-2 py-1 text-[10px] font-bold text-[#2c7a44]"><Check className="h-3 w-3" /> Signert</span>
    </div>
    <div className="mt-2.5 space-y-1">
      <div className="h-1.5 w-4/5 rounded-full bg-[#f1e9dd]" />
      <div className="h-1.5 w-3/5 rounded-full bg-[#f1e9dd]" />
    </div>
    <p className="mt-2.5 text-[11px] font-semibold" style={{ color: MUTED }}>Signert digitalt med BankID av begge parter</p>
  </div>
);

const MockUtbetalinger = () => (
  <div className="rounded-xl bg-white p-3 shadow-[0_18px_44px_-20px_rgba(120,70,30,0.28)] ring-1 ring-black/[0.04]">
    {[['Januar', '18 500 kr'], ['Februar', '18 500 kr'], ['Mars', '18 500 kr']].map(([m, b], i) => (
      <div key={m} className={`flex items-center justify-between px-1.5 py-2 ${i < 2 ? 'border-b border-black/[0.05]' : ''}`}>
        <span className="flex items-center gap-2 text-[12px]" style={INKs}>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e9f3ea]"><Wallet className="h-3 w-3 text-[#2c7a44]" /></span>{m}
        </span>
        <span className="text-[12px] font-bold text-[#2c7a44]">{b} ✓</span>
      </div>
    ))}
  </div>
);

const MockChat = () => (
  <div className="space-y-2">
    <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-[#f1e9dd] px-3.5 py-2.5">
      <p className="text-[12.5px]" style={INKs}>Hei! Vasken på badet lekker litt 🙈</p>
      <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>Leietaker · 09:14</p>
    </div>
    <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2.5" style={{ background: '#efe4f2' }}>
      <p className="text-[12.5px]" style={INKs}>Takk for beskjed! Rørlegger kommer i morgen kl. 10 🔧</p>
      <p className="mt-0.5 text-right text-[10px]" style={{ color: MUTED }}>DigiHome · 09:21</p>
    </div>
    <div className="ml-auto flex max-w-[75%] items-center gap-1.5 rounded-full bg-[#e9f3ea] px-3 py-1.5">
      <Wrench className="h-3 w-3 text-[#2c7a44]" />
      <span className="text-[11px] font-semibold text-[#2c7a44]">Utbedret — uten at du løftet en finger</span>
    </div>
  </div>
);

const MockPortal = () => (
  <div className="rounded-xl bg-white p-3.5 shadow-[0_18px_44px_-20px_rgba(120,70,30,0.28)] ring-1 ring-black/[0.04]">
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-[#e6c9b4]" /><span className="h-2 w-2 rounded-full bg-[#e6d8b4]" /><span className="h-2 w-2 rounded-full bg-[#c3d4bb]" />
      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Min portal</span>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2">
      {[['Utleid', '2 av 2', SAGE], ['Denne mnd.', '37 000 kr', TERRA], ['Hittil i år', '296 000 kr', INK]].map(([l, v, f]) => (
        <div key={l} className="rounded-lg bg-[#faf6ef] px-2.5 py-2">
          <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{l}</p>
          <p className="mt-0.5 text-[13px] font-bold" style={{ ...heading, color: f }}>{v}</p>
        </div>
      ))}
    </div>
    <div className="mt-2 flex h-[44px] items-end gap-1">
      {[30, 42, 38, 50, 44, 58, 52, 64, 60, 72, 68, 80].map((h, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 3 === 2 ? '#dfe8d8' : '#f3e3d3' }} />
      ))}
    </div>
  </div>
);

/* ── Selve siden ───────────────────────────────────────────────────────────── */

export default function NyForside() {
  const rolig = useReducedMotion();
  const [skjema, setSkjema] = useState({ name: '', phone: '', email: '', address: '' });
  const [sender, setSender] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [feil, setFeil] = useState('');

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

  /* Svevende kort: ulik takt gir liv uten uro. */
  const svev = (delay = 0, amp = 8, dur = 6) =>
    rolig ? {} : { animate: { y: [0, -amp, 0] }, transition: { duration: dur, delay, repeat: Infinity, ease: 'easeInOut' } };

  const tilKontakt = () => document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="min-h-screen bg-[#fdf9f3] antialiased" style={{ ...INKs, fontFamily: 'var(--font-body)' }} data-testid="ny-forside">

      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.04] bg-[#fdf9f3]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-8 px-5">
          <a href="/ny-forside" className="flex items-center gap-2" aria-label="DigiHome">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: TERRA }}><Home className="h-4 w-4" /></span>
            <span className="text-[19px] font-bold tracking-tight" style={heading}>digihome</span>
          </a>
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium md:flex" style={{ color: MUTED }}>
            <a href="#slik" className="transition-colors hover:text-[#221b14]">Slik fungerer det</a>
            <a href="#alt" className="transition-colors hover:text-[#221b14]">Det vi tar oss av</a>
            <a href="#trygghet" className="transition-colors hover:text-[#221b14]">Trygghet</a>
          </nav>
          <button
            onClick={tilKontakt}
            data-testid="nav-cta"
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-4.5 px-5 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background: INK }}
          >
            Få gratis leievurdering <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16">
        {/* Scenen ligger bak alt: himmel øverst, eng nederst. */}
        <img
          src="/landing/hero-scene.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-[#fdf9f3] via-[#fdf9f3]/55 to-transparent" />

        <div className="relative mx-auto max-w-[1180px] px-5 pb-14 pt-14 sm:pt-20">
          <motion.div {...opp} className="mx-auto max-w-[760px] text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1.5 text-[12px] font-semibold shadow-[0_2px_14px_rgba(120,70,30,0.10)] ring-1 ring-black/[0.04]" style={{ color: TERRA }}>
              <Sparkles className="h-3.5 w-3.5" /> Utleie på autopilot — fra annonse til utbetaling
            </span>
            <h1 className="mt-5 text-[42px] font-bold leading-[1.04] tracking-tight sm:text-[64px] lg:text-[72px]" style={heading}>
              Lei ut boligen din.
              <br />
              <span style={{ color: TERRA }}>Uten stress.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-relaxed sm:text-[17.5px]" style={{ color: '#6d6156' }}>
              DigiHome tar hele jobben — annonsering, visninger, leietaker, kontrakt og oppfølging.
              Du får leien rett på konto. Hver måned.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={tilKontakt}
                data-testid="hero-cta"
                className="flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white shadow-[0_14px_34px_-10px_rgba(196,99,60,0.55)] transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background: TERRA }}
              >
                Få gratis leievurdering <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#slik"
                className="flex h-12 items-center gap-2 rounded-full bg-white/90 px-6 text-[15px] font-semibold shadow-[0_2px_14px_rgba(120,70,30,0.10)] ring-1 ring-black/[0.05] transition-all hover:bg-white active:scale-[0.97]"
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
              src="/landing/maskot-vink-fri.png"
              alt="DigiHome-maskoten vinker"
              className="pointer-events-none -mb-3 hidden w-[150px] select-none drop-shadow-[0_24px_28px_rgba(120,70,30,0.25)] lg:block"
              {...opp}
              transition={{ ...opp.transition, delay: 0.35 }}
            />
          </div>
        </div>
      </section>

      {/* ── Tillitsstripe ── */}
      <section className="border-y border-black/[0.04] bg-[#fbf5ec]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-8 gap-y-2.5 px-5 py-4">
          {[
            [Camera, 'Annonsering på FINN.no'],
            [BadgeCheck, 'Digital signering med BankID'],
            [ShieldCheck, 'Depositum på sikret konto'],
            [Wallet, 'Utbetaling 1. hver måned'],
          ].map(([Ikon, t]) => (
            <span key={t} className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: '#77685a' }}>
              <Ikon className="h-4 w-4" style={{ color: SAGE }} /> {t}
            </span>
          ))}
        </div>
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
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {[
            { n: '1', t: 'Fortell oss om boligen', b: 'Adresse og noen få detaljer — så får du en gratis og uforpliktende leievurdering samme dag.', M: MockAdresse },
            { n: '2', t: 'Vi finner leietakeren', b: 'Proff-foto, annonse på FINN og visninger. Vi screener alle søkere med referanse- og kredittsjekk.', M: MockAnnonse },
            { n: '3', t: 'Trygg kontrakt og innflytting', b: 'Kvalitetssikret leiekontrakt signeres digitalt med BankID. Depositum settes på sikret konto.', M: MockKontrakt },
            { n: '4', t: 'Leien rett på konto', b: 'Vi krever inn leien og følger opp betalinger. Du får utbetaling og rapport 1. hver måned.', M: MockUtbetalinger },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              {...opp}
              transition={{ ...opp.transition, delay: i * 0.06 }}
              className="rounded-3xl bg-[#fbf5ec] p-6 ring-1 ring-black/[0.03] sm:p-7"
            >
              <s.M />
              <div className="mt-5 flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold text-white" style={{ background: TERRA, ...heading }}>{s.n}</span>
                <div>
                  <h3 className="text-[17px] font-bold tracking-tight" style={heading}>{s.t}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: '#6d6156' }}>{s.b}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bento: alt vi tar oss av ── */}
      <section id="alt" className="scroll-mt-20 bg-[#fbf5ec] py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <motion.div {...opp} className="mx-auto max-w-[560px] text-center">
            <Etikett barn="Det vi tar oss av" />
            <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[40px]" style={heading}>
              Alt du trenger for trygg utleie
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {/* Stor 1: portal */}
            <motion.div {...opp} className="relative overflow-hidden rounded-3xl bg-white p-7 shadow-[0_24px_60px_-30px_rgba(120,70,30,0.25)] ring-1 ring-black/[0.03]">
              <h3 className="text-[19px] font-bold tracking-tight" style={heading}>Full oversikt i din egen portal</h3>
              <p className="mt-1.5 max-w-[380px] text-[13.5px] leading-relaxed" style={{ color: '#6d6156' }}>
                Inntekter, kontrakter og dokumenter — samlet på ett sted. Alltid oppdatert, alltid tilgjengelig.
              </p>
              <div className="mt-5 max-w-[420px]"><MockPortal /></div>
              <img
                src="/landing/maskot-titter-fri.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute -bottom-7 -right-6 w-[150px] select-none opacity-95 sm:w-[175px]"
              />
            </motion.div>

            {/* Stor 2: leietakeroppfølging */}
            <motion.div {...opp} transition={{ ...opp.transition, delay: 0.08 }} className="rounded-3xl bg-white p-7 shadow-[0_24px_60px_-30px_rgba(120,70,30,0.25)] ring-1 ring-black/[0.03]">
              <h3 className="text-[19px] font-bold tracking-tight" style={heading}>Vi tar oss av leietakeren</h3>
              <p className="mt-1.5 max-w-[380px] text-[13.5px] leading-relaxed" style={{ color: '#6d6156' }}>
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
                transition={{ ...opp.transition, delay: i * 0.05 }}
                className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(120,70,30,0.2)] ring-1 ring-black/[0.03]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf4ee]"><Ikon className="h-5 w-5" style={{ color: TERRA }} /></span>
                <h3 className="mt-4 text-[15.5px] font-bold tracking-tight" style={heading}>{t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: '#6d6156' }}>{b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trygghet ── */}
      <section id="trygghet" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-20 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div {...opp} className="order-2 mx-auto w-full max-w-[420px] lg:order-1">
            <div className="relative">
              <img src="/landing/maskot-hjerte-fri.png" alt="DigiHome-maskoten holder et hjerte" className="mx-auto w-[78%] select-none drop-shadow-[0_36px_44px_rgba(120,70,30,0.22)]" />
              <motion.div
                {...svev(0.3, 6, 5.5)}
                className="absolute -right-3 top-8 rounded-2xl bg-white px-4 py-3 shadow-[0_20px_44px_-16px_rgba(120,70,30,0.35)] ring-1 ring-black/[0.04]"
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
            <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed" style={{ color: '#6d6156' }}>
              Utleie handler om tillit. Derfor gjør vi jobben grundig — fra første visning til siste utbetaling.
            </p>
            <ul className="mt-7 space-y-4">
              {[
                ['Grundig screening av leietaker', 'Referanser, inntekt og historikk sjekkes før kontrakt.'],
                ['Husleiegaranti tilgjengelig', 'Vil du ha ekstra sikkerhet, tilbyr vi garanti for leien.'],
                ['Én fast kontaktperson', 'Du snakker alltid med et menneske som kjenner boligen din.'],
              ].map(([t, b]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9f3ea]"><Check className="h-3.5 w-3.5 text-[#2c7a44]" /></span>
                  <div>
                    <p className="text-[15px] font-bold tracking-tight" style={heading}>{t}</p>
                    <p className="mt-0.5 text-[13.5px]" style={{ color: '#6d6156' }}>{b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── CTA + lead-skjema ── */}
      <section id="kontakt" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 pb-20 sm:pb-24">
        <motion.div
          {...opp}
          className="relative overflow-hidden rounded-[32px] px-6 py-12 text-center sm:px-12 sm:py-16"
          style={{ background: 'linear-gradient(135deg, #c4633c 0%, #d98a5b 55%, #e8b487 100%)' }}
        >
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-white/10 blur-2xl" />

          {sendt ? (
            <div className="relative mx-auto max-w-[440px]" data-testid="lead-takk">
              <img src="/landing/maskot-nokkel-fri.png" alt="" aria-hidden className="mx-auto w-[130px] select-none drop-shadow-[0_20px_30px_rgba(80,30,0,0.3)]" />
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
                    className="h-12 rounded-xl bg-white/95 px-4 text-[14px] outline-none ring-1 ring-white/40 transition-all placeholder:text-[#a89a8c] focus:bg-white focus:ring-2 focus:ring-white"
                    style={INKs}
                  />
                ))}
                <button
                  type="submit"
                  disabled={sender}
                  data-testid="lead-send"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#221b14] text-[15px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98] sm:col-span-2"
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

      {/* ── Footer-scene med stor wordmark ── */}
      <footer className="relative">
        <div className="relative h-[400px] overflow-hidden sm:h-[560px]">
          <img src="/landing/footer-scene.png" alt="" aria-hidden className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: 'center 68%' }} />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#fdf9f3] to-transparent" />
          <div className="relative flex h-full flex-col items-center justify-start pt-12 sm:pt-16">
            <motion.p
              {...opp}
              className="select-none text-[17vw] font-bold leading-none tracking-tight text-white drop-shadow-[0_14px_44px_rgba(140,80,30,0.5)] sm:text-[10rem]"
              style={heading}
            >
              digihome
            </motion.p>
            <p className="mt-3 rounded-full bg-white/75 px-4 py-1.5 text-[12.5px] font-semibold text-[#6d5b48] backdrop-blur-sm sm:text-[13.5px]">
              Utleie uten stress — fra annonse til utbetaling.
            </p>
          </div>
        </div>
        <div className="bg-[#221b14] text-[#b7aa9a]">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-5 text-[12.5px]">
            <span>© 2026 DigiHome AS</span>
            <a href="/personvern" className="transition-colors hover:text-white">Personvern</a>
            <a href="/vilkar" className="transition-colors hover:text-white">Vilkår</a>
            <a href="/kontakt" className="transition-colors hover:text-white">Kontakt</a>
            <span className="ml-auto flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Laget i Bergen</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
