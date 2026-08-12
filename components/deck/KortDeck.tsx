'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight, Check, Sparkles,
  FileText, KeyRound, Wallet, Megaphone, Shield, Database, Cpu, TrendingUp,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   KortDeck — DigiHome «send-deck»: 10 slides, én idé per slide.
   Selvstendig komponent (deler kun designspråk med det store dekket i
   Presentasjon.tsx — bevisst IKKE importert derfra). Jobben: få møtet booket.
   Dypdykket bor i /pitch-deck, produktbeviset i /tour (lenket fra slide 3+10).
   Navigasjon: piltaster / klikk / sveip — 10 klikkbare segmenter øverst.
   ═══════════════════════════════════════════════════════════════════════════ */

const F = { fontFamily: "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif" };
const FH = { fontFamily: "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" };
const AC = '#a052e0'; // merkevare-lilla på lys bakgrunn
const P = '#d298ff'; //  merkevare-lilla på mørk bakgrunn
const INK = '#0c0c0c';
const INK2 = '#1c1714';
const SUB = '#57514a';
const MUT = '#8a8278';
const HAIR = 'rgba(20,15,10,0.09)';

/* ── Animasjonsvarianter — stagger per slide, snappy og rolig ── */
const wrap = {
  enter: (d: number) => ({ opacity: 0, y: d >= 0 ? 26 : -26 }),
  center: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.07, delayChildren: 0.05 },
  },
  exit: (d: number) => ({ opacity: 0, y: d >= 0 ? -18 : 18, transition: { duration: 0.2, ease: 'easeIn' } }),
};
const item = {
  enter: { opacity: 0, y: 20 },
  center: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function Label({ children, dark = false }: any) {
  return (
    <motion.p variants={item} className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.34em]" style={{ ...F, color: dark ? P : AC }}>
      {children}
    </motion.p>
  );
}

function H({ children, dark = false, size = 'clamp(30px, 4.6vw, 58px)', className = '' }: any) {
  return (
    <motion.h2
      variants={item}
      className={`mt-5 tracking-[-0.035em] leading-[1.04] ${className}`}
      style={{ ...FH, fontWeight: 700, fontSize: size, color: dark ? '#fff' : INK }}
    >
      {children}
    </motion.h2>
  );
}

function Lead({ children, dark = false, className = '' }: any) {
  return (
    <motion.p
      variants={item}
      className={`mt-5 text-[14px] sm:text-[16px] font-normal leading-[1.65] ${className}`}
      style={{ ...F, color: dark ? 'rgba(255,255,255,0.72)' : SUB }}
    >
      {children}
    </motion.p>
  );
}

const kortStil = {
  background: '#fff',
  border: `1px solid ${HAIR}`,
  boxShadow: '0 1px 2px rgba(20,15,10,0.03), 0 22px 54px -30px rgba(20,15,10,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
};
const kortHl = {
  background: 'linear-gradient(180deg, rgba(160,82,224,0.09), rgba(160,82,224,0.02))',
  border: '1.5px solid rgba(160,82,224,0.42)',
  boxShadow: '0 34px 80px -34px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.7)',
};

/* ─────────────────────────── 01 · COVER (mørk) ─────────────────────────── */
function SCover() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-24 text-center">
      <img src="/bergen-aerial.webp" alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" decoding="async" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,4,8,0.62), rgba(5,4,8,0.82))' }} />
      <div className="relative z-10 max-w-[900px]">
        <Label dark>Investorpresentasjon · Pre-seed</Label>
        <H dark size="clamp(38px, 6.2vw, 84px)">
          AI-drevet boligforvaltning<span style={{ color: P }}>.</span>
        </H>
        <motion.p variants={item} className="mx-auto mt-5 max-w-[34ch] text-[17px] leading-[1.5] sm:text-[21px]" style={{ ...F, color: 'rgba(255,255,255,0.78)' }}>
          Hele leieforholdet — automatisk. Fra annonse til husleie på konto.
        </motion.p>
        <motion.div variants={item} className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] sm:text-[13px]" style={{ ...F, color: 'rgba(255,255,255,0.5)' }}>
          <span>Bergen, Norge</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>3 MNOK · pre-seed</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>Konfidensielt</span>
        </motion.div>
      </div>
      <motion.p variants={item} className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 text-[11.5px] tracking-wide sm:bottom-12" style={{ ...F, color: 'rgba(255,255,255,0.4)' }}>
        Bla med piltastene <span className="ml-1">→</span>
      </motion.p>
    </div>
  );
}

/* ────────────────────────── 02 · PROBLEMET (lys) ───────────────────────── */
function SProblemet() {
  const PUNKTER = [
    { t: 'Huseieren', s: 'Annonser, visninger, kontrakter og purringer — timer med manuelt arbeid, og risikoen for feil leietaker bæres alene.' },
    { t: 'Forvalteren', s: 'Lønnsomheten skalerer ikke: flere boliger krever flere folk. Marginene spises av rutinearbeid som aldri tar slutt.' },
    { t: 'Verktøyene', s: 'FINN her, bank der, regneark og e-post imellom. Ingen eier hele leieforholdet — alle eier en bit av kaoset.' },
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1100px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Problemet</Label>
      <H>Utleie er fortsatt manuelt arbeid<span style={{ color: AC }}>.</span></H>
      <Lead className="max-w-[62ch]">
        Boligutleie er en av de siste store forbrukerkategoriene uten et system som faktisk gjør jobben.
      </Lead>
      <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
        {PUNKTER.map((p, i) => (
          <motion.div key={p.t} variants={item} className="rounded-[20px] p-6 sm:p-7" style={kortStil}>
            <p className="text-[10px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: MUT }}>0{i + 1}</p>
            <p className="mt-3 text-[17px] font-bold tracking-[-0.01em]" style={{ ...FH, color: INK }}>{p.t}</p>
            <p className="mt-2.5 text-[13.5px] leading-[1.6]" style={{ ...F, color: SUB }}>{p.s}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── 03 · PRODUKTET (lys) ───────────────────────── */
function SProduktet() {
  const STEG = [
    { ikon: Megaphone, t: 'Annonse', s: 'AI skriver og publiserer på FINN' },
    { ikon: Check, t: 'Leietaker', s: 'Screening og visning — beste kandidat' },
    { ikon: FileText, t: 'Kontrakt', s: 'Generert og signert med BankID' },
    { ikon: Wallet, t: 'Husleie', s: 'Kreves inn automatisk, purring uten deg' },
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1100px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Produktet</Label>
      <H>Hele leieforholdet — på autopilot<span style={{ color: AC }}>.</span></H>
      <Lead className="max-w-[60ch]">
        Én plattform eier hele kjeden. Huseieren legger inn adressen — systemet gjør resten.
      </Lead>
      <div className="mt-9 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-4">
        {STEG.map((s, i) => {
          const Ikon = s.ikon;
          return (
            <motion.div key={s.t} variants={item} className="relative rounded-[20px] p-5 sm:p-6" style={kortStil}>
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(160,82,224,0.09)' }}>
                <Ikon className="h-[18px] w-[18px]" style={{ color: AC }} strokeWidth={1.9} />
              </span>
              <p className="mt-4 text-[16px] font-bold tracking-[-0.01em]" style={{ ...FH, color: INK }}>{s.t}</p>
              <p className="mt-1.5 text-[12.5px] leading-[1.55]" style={{ ...F, color: SUB }}>{s.s}</p>
              {i < 3 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 lg:block" style={{ color: MUT, zIndex: 2 }} strokeWidth={2} />
              )}
            </motion.div>
          );
        })}
      </div>
      <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-4 sm:mt-10">
        <a
          href="/tour"
          target="_blank"
          rel="noopener"
          data-testid="deck-tour-link"
          className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14.5px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{ ...F, background: INK, boxShadow: '0 20px 44px -18px rgba(12,12,12,0.5)' }}
        >
          Utforsk produktet selv
          <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
        </a>
        <span className="text-[12.5px]" style={{ ...F, color: MUT }}>Interaktiv omvisning — åpnes i ny fane · 2 min</span>
      </motion.div>
    </div>
  );
}

/* ─────────────────────── 04 · DRIFTSGEARING (lys) ──────────────────────── */
function SGearing() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1000px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Hvorfor det skalerer</Label>
      <H>Én forvalter. <span style={{ color: AC }}>3–4× porteføljen.</span></H>
      <Lead className="max-w-[62ch]">
        Programvaren tar rutinene — menneskene tar unntakene. Samme lønnskostnad drifter en flerdobbel portefølje.
      </Lead>
      <div className="mt-10 space-y-6 sm:mt-14">
        {[
          { t: 'Tradisjonell forvaltning', v: '1×', w: '26%', dus: true, s: 'Manuelle rutiner — hver ny bolig koster ny tid' },
          { t: 'Med DigiHome', v: '3–4×', w: '100%', dus: false, s: 'Autopilot på annonse, kontrakt, innkreving og dialog' },
        ].map((r) => (
          <motion.div key={r.t} variants={item}>
            <div className="mb-2.5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ ...F, color: r.dus ? MUT : AC }}>{r.t}</p>
                <p className="mt-1 text-[12.5px]" style={{ ...F, color: MUT }}>{r.s}</p>
              </div>
              <span className="text-[34px] font-bold tabular-nums tracking-[-0.04em] leading-none sm:text-[44px]" style={{ ...FH, color: r.dus ? MUT : INK }}>{r.v}</span>
            </div>
            <div className="h-[12px] overflow-hidden rounded-full" style={{ background: 'rgba(20,15,10,0.05)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: r.w }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                className="h-full rounded-full"
                style={{ background: r.dus ? 'rgba(20,15,10,0.22)' : `linear-gradient(90deg, ${AC}, ${P})` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={item} className="mt-10 text-[13.5px]" style={{ ...F, color: SUB }}>
        Det er denne gearingen som gjør forvaltning til et <span style={{ color: INK2, fontWeight: 600 }}>software-marginspill</span> — og hver franchise til en kopi av regnestykket.
      </motion.p>
    </div>
  );
}

/* ───────────────────────── 05 · TRAKSJON (lys) ─────────────────────────── */
function STraksjon() {
  const STATS = [
    { v: '40', u: '', l: 'Boliger under forvaltning', s: 'aktive kunder på begge nivåer', hl: false },
    { v: '3 000', u: 'kr', l: 'Snitt inntekt per bolig / mnd', s: 'fullservice-portefølje i Bergen', hl: false },
    { v: '120 000', u: 'kr', l: 'Månedlig inntekt · MRR', s: 'tilbakevendende, hver måned', hl: false },
    { v: '1,44', u: 'MNOK', l: 'Årlig inntektsbasis · ARR', s: 'før skalert salg', hl: true },
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1100px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Traksjon · allerede i drift</Label>
      <H>Vi genererer allerede inntekter<span style={{ color: AC }}>.</span></H>
      <Lead className="max-w-[64ch]">
        Ikke et konsept: 40 boliger driftes i Bergen i dag, med betalende kunder på både selvbetjent (5 %) og full
        forvaltning (10–15 %). Dette er blåkopien hver franchise skal replikere.
      </Lead>
      <div className="mt-9 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-5 lg:grid-cols-4">
        {STATS.map((s) => (
          <motion.div key={s.l} variants={item} className="relative rounded-[20px] p-5 sm:p-6" style={s.hl ? kortHl : kortStil}>
            {s.hl && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ ...F, color: AC }}>
                <TrendingUp className="h-3 w-3" strokeWidth={2.6} /> Vokser
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold tabular-nums tracking-[-0.04em] leading-none sm:text-[38px]" style={{ ...FH, color: INK }}>{s.v}</span>
              {s.u && <span className="text-[13px] font-medium sm:text-[15px]" style={{ ...F, color: MUT }}>{s.u}</span>}
            </div>
            <p className="mt-3 text-[12.5px] font-bold tracking-[-0.005em]" style={{ ...F, color: s.hl ? AC : INK2 }}>{s.l}</p>
            <p className="mt-1 text-[11px]" style={{ ...F, color: MUT }}>{s.s}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── 06 · MARKED (lys) ──────────────────────────── */
function SMarked() {
  const FASER = [
    { n: '01', t: 'Bergen', s: 'Blåkopien — enhetsøkonomien bevises i egen drift', nå: true },
    { n: '02', t: 'Norge', s: 'Franchise-utrulling: lokale operatører på DigiHome-plattformen', nå: false },
    { n: '03', t: 'Norden', s: 'Mål 2030: 150 MNOK ARR — nordisk kategorileder', nå: false },
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1050px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Marked · geografisk kaskade</Label>
      <H>Norge først. <span style={{ color: AC }}>Norden neste.</span></H>
      <Lead className="max-w-[60ch]">
        Selvbetjent (5 %) er ren programvare og skalerer uten geografi. Forvaltning og franchise ruller ut marked for marked.
      </Lead>
      <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
        {FASER.map((f) => (
          <motion.div key={f.n} variants={item} className="rounded-[20px] p-6 sm:p-7" style={f.nå ? kortHl : kortStil}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tabular-nums tracking-[0.22em]" style={{ ...F, color: f.nå ? AC : MUT }}>{f.n}</p>
              {f.nå && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ ...F, color: AC, background: 'rgba(160,82,224,0.1)' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: AC }} /> I dag
                </span>
              )}
            </div>
            <p className="mt-3 text-[22px] font-bold tracking-[-0.02em]" style={{ ...FH, color: INK }}>{f.t}</p>
            <p className="mt-2 text-[13px] leading-[1.6]" style={{ ...F, color: SUB }}>{f.s}</p>
          </motion.div>
        ))}
      </div>
      <motion.p variants={item} className="mt-8 text-[13px]" style={{ ...F, color: MUT }}>
        Markedsbevis: <span style={{ color: INK2, fontWeight: 600 }}>11 500+ aktive leieannonser på FINN</span> — målt live i plattformen. Kilder: Eurostat · SSB · Statista PropTech.
      </motion.p>
    </div>
  );
}

/* ─────────────────── 07 · FORRETNINGSMODELL (lys) ──────────────────────── */
function SModell() {
  const STROMMER = [
    { t: 'Selvbetjent', v: '5 %', u: 'av leien', s: 'Trakten inn — ren programvare, null marginale kostnader. Skalerer globalt.', badge: 'Land & expand' },
    { t: 'Full forvaltning', v: '10–15 %', u: 'av leien', s: 'Flaggskipet — ≈ 2–3 000 kr per enhet/mnd. Dagens 40 boliger drives her.', badge: 'Flaggskip', hl: true },
    { t: 'Franchise', v: 'fra 199', u: 'kr/enhet/mnd', s: '+ ~10 % royalty av operatørens honorar. ≈ 1,4 MNOK/år per moden franchise.', badge: 'Recurring' },
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1100px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Forretningsmodell</Label>
      <H>Tre inntektsstrømmer. <span style={{ color: AC }}>Én motor.</span></H>
      <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
        {STROMMER.map((m) => (
          <motion.div key={m.t} variants={item} className="flex flex-col rounded-[20px] p-6 sm:p-7" style={m.hl ? kortHl : kortStil}>
            <span className="self-start rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ ...F, color: m.hl ? AC : MUT, background: m.hl ? 'rgba(160,82,224,0.1)' : 'rgba(20,15,10,0.05)' }}>
              {m.badge}
            </span>
            <p className="mt-4 text-[17px] font-bold tracking-[-0.01em]" style={{ ...FH, color: INK }}>{m.t}</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[32px] font-bold tabular-nums tracking-[-0.04em] leading-none sm:text-[38px]" style={{ ...FH, color: m.hl ? AC : INK }}>{m.v}</span>
              <span className="text-[12.5px] font-medium" style={{ ...F, color: MUT }}>{m.u}</span>
            </div>
            <p className="mt-3.5 text-[13px] leading-[1.6]" style={{ ...F, color: SUB }}>{m.s}</p>
          </motion.div>
        ))}
      </div>
      <motion.p variants={item} className="mt-8 text-[13.5px]" style={{ ...F, color: SUB }}>
        Trakten henger sammen: <span style={{ color: INK2, fontWeight: 600 }}>hver 5 %-kunde er en varm lead til full forvaltning</span> — og hver franchise replikerer Bergen-regnestykket.
      </motion.p>
    </div>
  );
}

/* ─────────────────────────── 08 · MOAT (lys) ───────────────────────────── */
function SMoat() {
  const MOATS = [
    { ikon: Cpu, t: 'Disiplinert AI', s: 'Regelmotoren styrer pengestrømmer og frister — AI-laget forstår tekst, bilder og dialog. Aldri gjetting der det koster.' },
    { ikon: Shield, t: 'Bygget for autopilot', s: 'Arkitekturen er designet for automasjon fra dag én — ikke et forvaltningssystem med AI skrudd på i etterkant.' },
    { ikon: Database, t: 'Data-flywheel', s: 'Egen drift i Bergen gir treningsdata på ekte leieforhold — priser, henvendelser, avvik — som konkurrentene mangler.' },
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1050px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Konkurransefortrinn</Label>
      <H>AI som forstår eiendom<span style={{ color: AC }}>.</span></H>
      <Lead className="max-w-[60ch]">
        Generisk proptech digitaliserer skjemaer. DigiHome automatiserer beslutningene rundt dem.
      </Lead>
      <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
        {MOATS.map((m) => {
          const Ikon = m.ikon;
          return (
            <motion.div key={m.t} variants={item} className="rounded-[20px] p-6 sm:p-7" style={kortStil}>
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(160,82,224,0.09)' }}>
                <Ikon className="h-[18px] w-[18px]" style={{ color: AC }} strokeWidth={1.9} />
              </span>
              <p className="mt-4 text-[16.5px] font-bold tracking-[-0.01em]" style={{ ...FH, color: INK }}>{m.t}</p>
              <p className="mt-2.5 text-[13px] leading-[1.6]" style={{ ...F, color: SUB }}>{m.s}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── 09 · TEAM (lys) ───────────────────────────── */
function STeamet() {
  const TEAM = [
    { n: 'Sarah Sleeman', r: 'Daglig leder · CEO', img: '/team-sarah.webp', s: 'Eiendomsmegler, seks år i rådgivende roller i DNB. Leder kundeakkvisisjon og forvaltning.' },
    { n: 'Martin C. Kviteberg', r: 'Produktsjef · CPO', img: '/team/martin-kviteberg-face.jpg', s: 'Gründer av BnbSpesialisten — en av Norges første profesjonelle utleieforvaltere. 10 år i Adonis AS frem mot exit.' },
    { n: 'Erik Hoffmann-Dahl', r: 'Styrets leder · Jus', img: '/team-erik.webp', s: 'Advokat og partner i Hoffmann Thinn. Tegnet selskapsstrukturen som skal bære vekst og emisjon.' },
    { n: 'Kevin Ha', r: 'AI-rådgiver', img: '/team/kevin-ai.jpg', imgPos: '50% 16%', s: 'Analytiker i DNB, siviløkonom NHH. Bygger og automatiserer plattformen med AI-drevet utvikling.' },
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1050px] flex-col justify-center px-6 py-24 sm:px-12">
      <Label>Teamet</Label>
      <H>Bygget av utleiere, <span style={{ color: AC }}>for utleiere.</span></H>
      <Lead className="max-w-[56ch]">Fire fagfelt — eiendom, teknologi, jus og AI — kjent fra innsiden.</Lead>
      <div className="mt-9 grid gap-x-10 gap-y-6 sm:mt-12 sm:grid-cols-2 sm:gap-y-8">
        {TEAM.map((m) => (
          <motion.div key={m.n} variants={item} className="flex items-start gap-4 sm:gap-5">
            <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden rounded-[18px] sm:h-[84px] sm:w-[84px]"
                 style={{ boxShadow: '0 18px 36px -16px rgba(20,15,10,0.45)', outline: '1px solid rgba(255,255,255,0.6)', outlineOffset: '-1px' }}>
              <img src={m.img} alt={m.n} className="h-full w-full object-cover" style={{ objectPosition: m.imgPos || 'top' }} loading="lazy" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[17px] font-bold tracking-[-0.02em] leading-tight sm:text-[19px]" style={{ ...FH, color: INK }}>{m.n}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.13em]" style={{ ...F, color: AC }}>{m.r}</p>
              <p className="mt-2 text-[12.5px] leading-[1.55] sm:text-[13px]" style={{ ...F, color: SUB }}>{m.s}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── 10 · ASK (mørk) ───────────────────────────── */
function SAsken() {
  const TERMS = [
    { v: '3', u: 'MNOK', l: 'Kapital', s: 'ny egenkapital' },
    { v: '22', u: 'MNOK', l: 'Pre-money', s: 'før emisjon' },
    { v: '25', u: 'MNOK', l: 'Post-money', s: 'etter emisjon' },
    { v: '12', u: '%', l: 'Eierandel', s: 'nye aksjer' },
  ];
  return (
    <div className="relative flex min-h-[100dvh] flex-col justify-center px-6 py-24 sm:px-12">
      <img src="/bergen-harbor.webp" alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,4,8,0.72), rgba(5,4,8,0.86))' }} />
      <div className="relative z-10 mx-auto w-full max-w-[1050px]">
        <Label dark>Emisjon · Pre-seed</Label>
        <H dark size="clamp(32px, 5vw, 62px)">
          3 MNOK for <span style={{ color: P }}>12 %</span>.
        </H>
        <Lead dark className="max-w-[62ch]">
          Kapitalen beviser enhetsøkonomien i Bergen som blåkopi — 16 måneder til seed-runden som ruller ut nordisk franchise.
        </Lead>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4">
          {TERMS.map((t) => (
            <motion.div key={t.l} variants={item} className="rounded-[18px] p-5"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(6px)' }}>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[30px] font-bold tabular-nums tracking-[-0.04em] leading-none text-white sm:text-[38px]" style={FH}>{t.v}</span>
                <span className="text-[13px] font-medium" style={{ ...F, color: 'rgba(255,255,255,0.55)' }}>{t.u}</span>
              </div>
              <p className="mt-2.5 text-[12px] font-bold" style={{ ...F, color: P }}>{t.l}</p>
              <p className="mt-0.5 text-[10.5px]" style={{ ...F, color: 'rgba(255,255,255,0.45)' }}>{t.s}</p>
            </motion.div>
          ))}
        </div>
        <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3 sm:mt-11">
          <a
            href="/pitch-deck"
            target="_blank"
            rel="noopener"
            data-testid="deck-full-link"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[14px] font-semibold transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ ...F, color: INK }}
          >
            Se hele presentasjonen
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.2} />
          </a>
          <a
            href="/tour"
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold text-white transition-colors duration-200"
            style={{ ...F, border: '1px solid rgba(255,255,255,0.25)' }}
          >
            Utforsk produktet
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
          </a>
          <span className="ml-auto hidden text-[11.5px] sm:block" style={{ ...F, color: 'rgba(255,255,255,0.4)' }}>
            DigiHome Tech AS · Bergen · Konfidensielt
          </span>
        </motion.div>
      </div>
    </div>
  );
}

/* ═════════════════════════════ SLIDE-MOTOR ══════════════════════════════ */

const SLIDES: { C: any; dark: boolean; navn: string }[] = [
  { C: SCover, dark: true, navn: 'DigiHome' },
  { C: SProblemet, dark: false, navn: 'Problemet' },
  { C: SProduktet, dark: false, navn: 'Produktet' },
  { C: SGearing, dark: false, navn: 'Skalering' },
  { C: STraksjon, dark: false, navn: 'Traksjon' },
  { C: SMarked, dark: false, navn: 'Marked' },
  { C: SModell, dark: false, navn: 'Forretningsmodell' },
  { C: SMoat, dark: false, navn: 'Moat' },
  { C: STeamet, dark: false, navn: 'Teamet' },
  { C: SAsken, dark: true, navn: 'Emisjonen' },
];

export default function KortDeck() {
  const [[idx, dir], setNav] = useState<[number, number]>([0, 0]);
  const touchX = useRef(0);
  const dark = SLIDES[idx].dark;

  const gaa = useCallback((neste: number) => {
    setNav(([i]) => {
      const m = Math.max(0, Math.min(SLIDES.length - 1, neste));
      return m === i ? [i, 0] : [m, m > i ? 1 : -1];
    });
  }, []);

  useEffect(() => {
    const paaTast = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        if ((e.key === ' ' || e.key === 'Enter') && t && ['BUTTON', 'A'].includes(t.tagName)) return;
        e.preventDefault();
        setNav(([i]) => (i >= SLIDES.length - 1 ? [i, 0] : [i + 1, 1]));
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        setNav(([i]) => (i <= 0 ? [i, 0] : [i - 1, -1]));
      } else if (e.key === 'Home') { e.preventDefault(); setNav(() => [0, -1]); }
      else if (e.key === 'End') { e.preventDefault(); setNav(() => [SLIDES.length - 1, 1]); }
    };
    window.addEventListener('keydown', paaTast);
    return () => window.removeEventListener('keydown', paaTast);
  }, []);

  // Forhåndslast tunge bakgrunnsbilder så mørke slides lander uten hikk.
  useEffect(() => {
    ['/bergen-aerial.webp', '/bergen-harbor.webp'].forEach((src) => { const i = new Image(); i.src = src; });
  }, []);

  const Slide = SLIDES[idx].C;

  return (
    <motion.div
      className="fixed inset-0 select-none overflow-hidden"
      animate={{ backgroundColor: dark ? '#0c0c0c' : '#f7f5f2' }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 60) gaa(idx + (dx < 0 ? 1 : -1));
      }}
      data-testid="kortdeck"
    >
      {/* Dotgrid på lyse slides */}
      {!dark && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px', opacity: 0.35,
          maskImage: 'radial-gradient(ellipse 80% 65% at 50% 35%, black 28%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 65% at 50% 35%, black 28%, transparent 78%)',
        }} />
      )}

      {/* Slide */}
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={idx}
          custom={dir}
          variants={wrap}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 overflow-y-auto"
          data-testid={`kortdeck-slide-${idx}`}
        >
          <Slide />
        </motion.div>
      </AnimatePresence>

      {/* ── Chrome ── */}
      {/* Fremdrift: 10 klikkbare segmenter */}
      <div className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-1.5 sm:top-7" data-testid="kortdeck-progress">
        {SLIDES.map((s, i) => (
          <button
            key={s.navn}
            onClick={() => gaa(i)}
            title={s.navn}
            aria-label={`Gå til ${s.navn}`}
            className="group flex h-4 items-center"
          >
            <span
              className="h-[3px] rounded-full transition-all duration-300 group-hover:opacity-100"
              style={{
                width: i === idx ? 26 : 14,
                background: i === idx ? (dark ? P : AC) : i < idx ? (dark ? 'rgba(255,255,255,0.45)' : 'rgba(20,15,10,0.35)') : (dark ? 'rgba(255,255,255,0.16)' : 'rgba(20,15,10,0.12)'),
              }}
            />
          </button>
        ))}
      </div>

      {/* Logo */}
      <div className="absolute left-5 top-4 z-30 sm:left-8 sm:top-6">
        <img src={dark ? '/deck-logo-light.svg' : '/deck-logo-dark.svg'} alt="DigiHome" className="h-5 sm:h-6" />
      </div>

      {/* Teller */}
      <p className="absolute right-5 top-5 z-30 text-[11px] font-medium tabular-nums tracking-[0.14em] sm:right-8 sm:top-7"
         style={{ ...F, color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(20,15,10,0.3)' }}>
        {String(idx + 1).padStart(2, '0')} / {SLIDES.length}
      </p>

      {/* Pil-knapper */}
      <div className="absolute bottom-5 right-5 z-30 flex items-center gap-2 sm:bottom-7 sm:right-8">
        <button
          onClick={() => gaa(idx - 1)}
          disabled={idx === 0}
          aria-label="Forrige slide"
          data-testid="kortdeck-prev"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30"
          style={{ border: dark ? '1px solid rgba(255,255,255,0.22)' : `1px solid ${HAIR}`, color: dark ? '#fff' : INK, background: dark ? 'rgba(255,255,255,0.05)' : '#fff' }}
        >
          <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button
          onClick={() => gaa(idx + 1)}
          disabled={idx === SLIDES.length - 1}
          aria-label="Neste slide"
          data-testid="kortdeck-next"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30"
          style={{ border: dark ? '1px solid rgba(255,255,255,0.22)' : `1px solid ${HAIR}`, color: dark ? '#fff' : INK, background: dark ? 'rgba(255,255,255,0.05)' : '#fff' }}
        >
          <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>

      {/* Konfidensielt */}
      <p className="absolute bottom-6 left-5 z-30 hidden text-[10px] uppercase tracking-[0.2em] sm:left-8 sm:block"
         style={{ ...F, color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(20,15,10,0.25)' }}>
        Konfidensielt
      </p>
    </motion.div>
  );
}
