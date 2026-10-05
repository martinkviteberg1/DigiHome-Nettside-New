'use client';
/** Privat invitasjon til Martin og Øyvind – et personlig brev fra Erik, Sarah og Martin, ikke en landingsside. /samarbeid, ikke søkbar.
 *  Layouten er tatt fra AFA-repoets InvitationPage: redaksjonelt rutenett (12 kolonner), smal klebrig venstremarg med kapittelnummer og
 *  kicker – innholdet i de ni til høyre. De store utsagnene fyller kolonnen (målt), tilbudet står som et term sheet på mørk flate.
 *  Rekkefølgen er investeringscasets: brevet rett under brevhodet → hvorfor dere → dette er bygget → målbildet → strategi (B2B/B2C) →
 *  Tech og forvaltning → hva som er gjort → roadmap → forretningsmodell → kapitalplan → laget og rollen → tilbudet → veien videre. (12 kapitler.)
 *  INNHOLDET KOMMER SOM PROPS fra server-komponenten (app/samarbeid/page.js) – teksten importeres ikke her, så den ligger ikke i JS-bundlen.
 *  Tallene (DEAL, KAPITAL, PRIS) kommer fra innhold.js – én kilde; ingen tall er skrevet inn her. Ingen telleanimasjoner, ingen grafer utover
 *  én rolig disponeringslinje. Forutsetningene bak gründerressursen ligger i en åpne/lukke-blokk (knapp, aria-expanded) som alltid er med i utskrift. */
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { DASH_H, DASH_W, EierTelefon, LeietakerTelefon, Oversikt, Skaler } from './produkt';

/* Innholdet (INV, AVSENDERE, TEAM, BREV, DEAL, PORTEFOLJE) deles via kontekst – satt én gang i <Brev>. */
const InnholdCtx = createContext(null);
const useInnhold = () => useContext(InnholdCtx);

const EASE = [0.16, 1, 0.3, 1];
const PAPER = '#fafaf9';
const INK = '#0a0a0a';
const MUTED = '#77777d';
const ACCENT = '#7F3FBF';
/* To flater i tillegg til papiret: FILL for små flater (plassholdere, bokser), TINT for hele seksjoner. Kapitlene VEKSLER papir ↔ tint hele veien
 * (01 tint · 02 papir · 03 tint · 04 papir · 05 tint · 06 papir · 07 tint · 08 papir · 09 tint · 10 papir · 11 mørk · 12 papir) – aldri to like etter hverandre. */
const FILL = '#f1f0ed';
const TINT = '#ebe8e1';
const HAIR = 'rgba(10,10,10,0.08)';
const D = { ink: '#ffffff', muted: 'rgba(255,255,255,0.6)', accent: '#D496FF', hair: 'rgba(255,255,255,0.12)', fill: 'rgba(255,255,255,0.04)' };
const L = { ink: INK, muted: MUTED, accent: ACCENT, hair: HAIR, fill: FILL };
const tone = (dark) => (dark ? D : L);

/* Typografisk skala – én for hele siden. Display-linjene (hero, utsagn) måles mot kolonnen i stedet. */
const T = { h2: 'clamp(32px, 3.2vw, 52px)', num: 'clamp(32px, 2.6vw, 48px)', cell: 'clamp(24px, 2vw, 30px)' };
const BODY = 'text-[18px] lg:text-[19px] leading-[1.65] max-w-[62ch] text-pretty';
const PILL_DARK = 'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,box-shadow,transform,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F3FBF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafaf9] active:scale-[0.985] bg-[#0a0a0a] text-white hover:bg-[#27272a] shadow-[0_12px_28px_-18px_rgba(10,10,10,0.3)] hover:shadow-[0_22px_44px_-20px_rgba(10,10,10,0.5)]';

const Container = ({ children, className = '' }) => <div className={`max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 ${className}`}>{children}</div>;

/** Stiger inn når den kommer i syne – én bevegelse for hele flaten. */
const Rise = ({ children, delay = 0, y = 14, className, style, testid, once = true }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} style={style} data-testid={testid} initial={{ opacity: 0, y: reduce ? 0 : y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once, margin: '-40px' }} transition={{ duration: 1.0, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
};

/* ─── Rutenett og kapittelmarg ─── */
const Grid = ({ children, className = '' }) => <div className={`grid lg:grid-cols-12 gap-x-8 ${className}`}>{children}</div>;

/** Venstremargen: kapittelnummer og kicker, klebrig på store skjermer. */
const Aside = ({ n, label, dark, testid }) => {
  const c = tone(dark);
  return (
    <div className="lg:col-span-3 mb-8 lg:mb-0">
      <Rise><div className="lg:sticky lg:top-28 flex items-baseline gap-3" data-testid={testid}>
        {n && <span className="text-[12px] font-semibold tabular-nums" style={{ color: c.accent }}>{n}</span>}
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: c.accent }}>{label}</span>
      </div></Rise>
    </div>
  );
};

const Main = ({ children, className = '' }) => <div className={`lg:col-span-9 lg:col-start-4 min-w-0 ${className}`}>{children}</div>;

/** Kapittelets tittel – i hovedkolonnen. */
const Title = ({ title, dark, testid }) => (
  <Rise><h2 className="font-medium tracking-[-0.03em] leading-[1.04] max-w-[24ch] text-balance whitespace-pre-line" style={{ margin: 0, color: tone(dark).ink, fontSize: T.h2 }} data-testid={testid}>{title}</h2></Rise>
);

/** Brødtekst-avsnitt: siste (eller `strong`-indeks) i sort, resten dempet. */
const Paragraphs = ({ items, testid, strong = -1, dark, first = 28 }) => {
  const c = tone(dark);
  return (
    <div data-testid={testid}>
      {items.map((p, i) => (
        <Rise key={i} delay={0.06 + i * 0.04}><p className={BODY} style={{ margin: i === 0 ? `${first}px 0 0` : '18px 0 0', color: i === strong ? c.ink : c.muted, fontWeight: i === strong ? 500 : 400 }} data-testid={`${testid}-${i + 1}`}>{p}</p></Rise>
      ))}
    </div>
  );
};

/** Display-typografi som fyller kolonnen: hver linje måles i canvas og størrelsen settes så den bredeste linjen akkurat fyller bredden – aldri knekk, aldri overflyt.
 *  Under `min` slipper vi nowrap og lar linjene brekke som vanlig tekst (mobil). */
const useFitLines = (lines, max, min) => {
  const ref = useRef(null);
  const [fit, setFit] = useState({ size: max, wrap: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ctx = document.createElement('canvas').getContext('2d');
    const measure = () => {
      if (!ctx) return;
      const cs = getComputedStyle(el);
      const em = parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize) || 0;
      ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width + em * 100 * (l.length - 1)));
      const size = Math.min(max, Math.floor((el.clientWidth / widest) * 100 * 10) / 10);
      setFit(size < min ? { size: min, wrap: true } : { size, wrap: false });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
    return () => ro.disconnect();
  }, [lines, max, min]);
  return { ref, ...fit };
};

/** Ett stort utsagn over to linjer – fyller hovedkolonnen. */
const Statement = ({ lines, testid, dark }) => {
  const { ref, size, wrap } = useFitLines(lines, 68, 34);
  return (
    <h2 ref={ref} className="font-medium tracking-[-0.035em] leading-[1.0]" style={{ margin: 0, color: tone(dark).ink, fontSize: size, whiteSpace: wrap ? 'normal' : 'nowrap' }} data-testid={testid}>
      {lines.map((l, i) => <Rise key={l} delay={i * 0.1} y={18}><span className="block">{l}</span></Rise>)}
    </h2>
  );
};

const Section = ({ children, testid, tint = false, dark = false, id }) => (
  <section id={id} className="relative py-28 lg:py-40 scroll-mt-4" style={{ background: dark ? INK : tint ? TINT : undefined, borderTop: dark ? undefined : `1px solid ${HAIR}` }} data-testid={testid}>
    <Container><div className="relative">{children}</div></Container>
  </section>
);

/** Ett portrett med navn og rolle under. Sort-hvitt i ro; farge når du nærmer deg. De som inviteres inn får en lilla ramme og rollen i lilla. Uten bilde: initialer. */
const Person = ({ name, role, img, pos, sizes, testid, initials, bio, invited }) => (
  <figure className="m-0 group" data-testid={testid}>
    <div className="relative rounded-[24px] overflow-hidden" style={{ aspectRatio: '4 / 5', background: invited ? 'rgba(127,63,191,0.06)' : FILL, boxShadow: invited ? `0 0 0 1.5px ${ACCENT}` : undefined }}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} sizes={sizes} alt={name} loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.03] transition-[filter,transform] duration-700 ease-out" style={{ objectPosition: pos }} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-medium tracking-[-0.04em] leading-none" style={{ color: ACCENT, fontSize: 'clamp(40px, 4vw, 64px)' }}>{initials}</span>
        </div>
      )}
    </div>
    <figcaption style={{ marginTop: 14 }}>
      <span className="block text-[15.5px] font-medium leading-tight" style={{ color: INK }}>{name}</span>
      <span className="block text-[13px] leading-snug" style={{ margin: '4px 0 0', color: invited ? ACCENT : MUTED }} data-testid={`${testid}-role`}>{role}</span>
      {bio && <span className="block text-[13px] leading-[1.5]" style={{ margin: '8px 0 0', color: MUTED }}>{bio}</span>}
    </figcaption>
  </figure>
);

/** Hårlinjerader: tittel + tekst, valgfritt nummerert. `stacked` legger teksten under tittelen (smale kolonner). */
const Rows = ({ rows, testid, numbered = false, dark = false, stacked = false }) => {
  const c = tone(dark);
  return (
    <dl style={{ margin: 0, borderBottom: `1px solid ${c.hair}` }} data-testid={testid}>
      {rows.map((r, i) => (
        <Rise key={r[0]} delay={0.05 + i * 0.05}>
          <div className={`group py-7 ${stacked ? '' : 'grid gap-x-10 gap-y-2 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]'}`} style={{ borderTop: `1px solid ${c.hair}` }} data-testid={`${testid}-${i + 1}`}>
            <dt className="text-[18px] font-medium leading-snug flex items-baseline gap-3" style={{ color: c.ink }}>
              {numbered && <span className="text-[12px] font-semibold tabular-nums shrink-0 transition-transform duration-500 group-hover:translate-x-1" style={{ color: c.accent }}>{String(i + 1).padStart(2, '0')}</span>}{r[0]}
            </dt>
            <dd className="text-[16px] leading-[1.65] max-w-[58ch]" style={{ margin: stacked ? '10px 0 0' : 0, color: c.muted }}>{r[1]}</dd>
          </div>
        </Rise>
      ))}
    </dl>
  );
};

/* ─── Toppen: fremdrift som en hårlinje, og brevhodet ─── */
const Progress = () => {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  return <motion.div aria-hidden className="fixed top-0 left-0 right-0 h-[2px] origin-left z-40 brev-print-hide" style={{ scaleX: x, background: ACCENT }} data-testid="letter-progressbar" />;
};

const Header = () => {
  const { BREV } = useInnhold();
  return (
    <header className="absolute inset-x-0 top-0 z-20 brev-print-hide" data-testid="letter-header">
      <Container className="h-[84px] lg:h-[96px] flex items-center justify-between">
        <span className="inline-flex items-center" style={{ color: INK }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt={BREV.brand} className="h-[26px] lg:h-[32px] w-auto" data-testid="letter-logo" />
        </span>
        <span className="inline-flex items-center gap-2.5 h-9 pl-3.5 pr-4 rounded-full text-[12.5px] font-medium whitespace-nowrap" style={{ color: INK, border: `1px solid ${HAIR}`, background: 'rgba(255,255,255,0.55)' }} data-testid="letter-private">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ACCENT }} />{BREV.eyebrow}<span className="hidden sm:inline" style={{ color: MUTED }}>· {BREV.confidential}</span>
        </span>
      </Container>
    </header>
  );
};

/* ─── Heroen: brevhodet i full bredde – og de tre som skriver, store. Brevet kommer rett under. ─── */
const Cover = () => {
  const { BREV, INV, AVSENDERE } = useInnhold();
  const toLetter = () => { const el = document.getElementById('brevet'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const fade = (delay) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1, delay, ease: EASE } });
  const { ref, size, wrap } = useFitLines(BREV.h1, 124, 44);
  return (
    <section className="relative" data-testid="letter-cover">
      <Container className="relative pt-[124px] lg:pt-[168px]">
        <motion.p {...fade(0)} className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: ACCENT }} data-testid="letter-role">
          {INV.toLong} <span style={{ color: MUTED }}>· {INV.date}</span>
        </motion.p>
        <h1 ref={ref} className="font-medium tracking-[-0.04em] leading-[0.95]" style={{ margin: '26px 0 0', color: INK, fontSize: size, whiteSpace: wrap ? 'normal' : 'nowrap' }} data-testid="letter-title">
          {BREV.h1.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em] -mb-[0.06em]"><motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1.15, delay: 0.15 + i * 0.12, ease: EASE }}>{line}</motion.span></span>
          ))}
        </h1>
        <div className="mt-10 lg:mt-14 grid lg:grid-cols-12 gap-x-8 gap-y-8 items-end">
          <motion.p {...fade(0.5)} className="lg:col-span-7 text-[18px] lg:text-[21px] leading-[1.5] text-pretty max-w-[640px]" style={{ margin: 0, color: MUTED }} data-testid="letter-sub">{BREV.sub}</motion.p>
          <motion.div {...fade(0.7)} className="lg:col-span-5 lg:col-start-8 flex flex-wrap items-center gap-x-6 gap-y-4 lg:justify-end">
            <span className="text-[15px]" style={{ color: MUTED }} data-testid="letter-to">{INV.from}</span>
            <button type="button" onClick={toLetter} className={`${PILL_DARK} h-12 pl-6 pr-5 text-[15px]`} data-testid="letter-cta-read">{BREV.cta}<ArrowDown className="w-4 h-4" strokeWidth={2.2} /></button>
          </motion.div>
        </div>

        {/* De tre som skriver – i full bredde. På mobil en rad å dra i. */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, delay: 0.55, ease: EASE }} className="brev-strip mt-14 lg:mt-20 flex sm:grid sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-5 px-5 sm:mx-0 sm:px-0" data-testid="letter-founders">
          {AVSENDERE.map((p) => (
            <div key={p.key} className="w-[72vw] sm:w-auto shrink-0 snap-start">
              <Person name={p.name} role={p.role} img={p.img} pos={p.pos} sizes="(max-width: 640px) 72vw, 400px" testid={`letter-founder-${p.key}`} />
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
};

/* ─── Brevet: rett under brevhodet. Marginalia til venstre, teksten i sju kolonner. Signert bare «Erik, Sarah og Martin» – ingen miniatyrbilder. ─── */
const Letter = () => {
  const { BREV, INV } = useInnhold();
  return (
    <section id="brevet" className="pt-20 lg:pt-28 pb-28 lg:pb-40 scroll-mt-4" data-testid="letter-body">
      <Container>
        <div style={{ borderTop: `1px solid ${HAIR}` }} />
        <Grid className="pt-16 lg:pt-24">
          <div className="lg:col-span-3 mb-8 lg:mb-0">
            <Rise><div className="lg:sticky lg:top-28 text-[12.5px] leading-[1.6] uppercase tracking-[0.12em]" style={{ color: MUTED }} data-testid="letter-marginalia">
              <span className="block">{INV.date}</span>
              <span className="block mt-2" style={{ color: ACCENT }}>{BREV.role}</span>
              <span className="block mt-2">{BREV.confidential}</span>
            </div></Rise>
          </div>
          <div className="lg:col-span-7 lg:col-start-4 min-w-0">
            <Rise><p className="font-medium tracking-[-0.02em]" style={{ margin: 0, color: INK, fontSize: 'clamp(28px, 2.6vw, 38px)' }} data-testid="letter-hi">{BREV.hi}</p></Rise>
            {BREV.letter.map((p, i) => {
              const strong = i === BREV.letterStrong;
              return <Rise key={i} delay={0.04}><p className="text-[19px] lg:text-[21px] leading-[1.6] text-pretty" style={{ margin: i === 0 ? '32px 0 0' : '22px 0 0', color: i === BREV.letter.length - 1 ? MUTED : INK, fontWeight: strong ? 500 : 400 }} data-testid={`letter-p-${i + 1}`}>{p}</p></Rise>;
            })}
            <Rise delay={0.05}><p className="text-[19px] lg:text-[21px] font-medium" style={{ margin: '40px 0 0', color: INK }} data-testid="letter-signature">{BREV.signature}</p></Rise>
          </div>
        </Grid>
      </Container>
    </section>
  );
};

/* ─── 02 Dette er bygget – produktbeviset, kort: én desktopflate i full bredde, så seks punkter og integrasjonsstatus ved siden av de to appene. ─── */
const Built = () => {
  const { BREV } = useInnhold();
  const c = BREV.built;
  return (
    <section id="produktet" className="relative pt-28 lg:pt-40 pb-28 lg:pb-40 scroll-mt-4" style={{ borderTop: `1px solid ${HAIR}` }} data-testid="letter-product">
      <Container>
        <Grid>
          <Aside n="02" label={c.eyebrow} testid="letter-product-aside" />
          <Main>
            <Statement lines={c.title} testid="letter-product-title" />
            <Paragraphs items={c.paragraphs} testid="letter-product-p" strong={0} first={32} />
          </Main>
        </Grid>
      </Container>

      {/* Scene A: oversikten, kant til kant på en mørkere flate, vinduet klippes av flaten. */}
      <div className="mt-16 lg:mt-24 pt-10 sm:pt-14 lg:pt-20" style={{ background: TINT }} data-testid="letter-product-stage">
        <Container>
          <Rise y={28} className="rounded-t-[14px] lg:rounded-t-[18px] overflow-hidden h-[300px] sm:h-[480px] lg:h-[760px]" style={{ border: `1px solid ${HAIR}`, borderBottom: 0, boxShadow: '0 48px 96px -56px rgba(10,10,10,0.4)' }} testid="letter-stage-desktop">
            {/* På mobil: zoomet inn på arbeidsflaten (railen skjult), så teksten er lesbar. */}
            <div className="sm:hidden"><Skaler w={640} h={DASH_H}><div style={{ marginLeft: -236 }}><Oversikt /></div></Skaler></div>
            <div className="hidden sm:block"><Skaler w={DASH_W} h={DASH_H}><Oversikt /></Skaler></div>
          </Rise>
        </Container>
      </div>
      <Container>

        {/* Scene B: seks punkter og integrasjonsstatus til venstre, eierens og leietakerens app til høyre. */}
        <div className="mt-24 lg:mt-32 grid lg:grid-cols-12 gap-x-8 gap-y-14 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <Rise><p className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: ACCENT }} data-testid="letter-product-list-h">{c.listH}</p></Rise>
            <div className="mt-5"><Liste items={c.list} testid="letter-product-list" cols="grid-cols-1" /></div>
            <Rise><p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] mt-12" style={{ margin: '48px 0 0', color: ACCENT }} data-testid="letter-product-integrasjoner-h">{c.integrasjonerH}</p></Rise>
            <dl className="m-0 mt-5" style={{ borderBottom: `1px solid ${HAIR}` }} data-testid="letter-product-integrasjoner">
              {c.integrasjoner.map(([status, hvem], i) => (
                <Rise key={status} delay={0.04 + i * 0.04}><div className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-6 py-3.5" style={{ borderTop: `1px solid ${HAIR}` }} data-testid={`letter-product-integrasjoner-${i + 1}`}>
                  <dt className="text-[13px] font-medium" style={{ color: i === 0 ? INK : MUTED }}>{status}</dt>
                  <dd className="m-0 text-[15px]" style={{ color: INK }}>{hvem}</dd>
                </div></Rise>
              ))}
            </dl>
          </div>
          <div className="lg:col-span-7 lg:col-start-6 grid sm:grid-cols-2 gap-x-8 gap-y-12 justify-items-center" data-testid="letter-stage-phones">
            {[EierTelefon, LeietakerTelefon].map((Tlf, i) => (
              <Rise key={c.phoneCaptions[i]} delay={0.1 + i * 0.12} y={24} className="w-full max-w-[340px]">
                <figure className="m-0">
                  <Tlf testid={`letter-phone-${i + 1}`} />
                  <figcaption className="mt-5 flex items-baseline justify-center gap-3 text-[13.5px]" style={{ color: MUTED }}><span className="text-[11px] font-semibold tabular-nums" style={{ color: ACCENT }}>0{i + 1}</span><span className="font-medium" style={{ color: INK }}>{c.phoneCaptions[i]}</span></figcaption>
                </figure>
              </Rise>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

/* ─── 01 Hvorfor dere ─── */
const Why = () => {
  const { BREV } = useInnhold();
  const c = BREV.why;
  return (
    <Section id="hvorfor" testid="letter-why" tint>
      <Grid>
        <Aside n="01" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-why-head" />
          <Paragraphs items={c.paragraphs} testid="letter-why-p" strong={c.paragraphs.length - 1} />
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── Byggeklosser for investeringscaset: tabell med hårlinjer, store tall, punktliste ─── */

/** Kort punktliste i kolonner – nummerert, hårlinje over hvert punkt. */
const Liste = ({ items, testid, cols = 'sm:grid-cols-2 lg:grid-cols-3' }) => (
  <ul className={`list-none p-0 m-0 grid ${cols} gap-x-8`} data-testid={testid}>
    {items.map((t, i) => (
      <Rise key={t} delay={0.03 + i * 0.03}><li className="flex items-baseline gap-3 py-3.5 text-[15.5px] leading-[1.45]" style={{ borderTop: `1px solid ${HAIR}`, color: INK }} data-testid={`${testid}-${i + 1}`}>
        <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: ACCENT }}>{String(i + 1).padStart(2, '0')}</span>{t}
      </li></Rise>
    ))}
  </ul>
);

/** Mellomtittel i et kapittel. Avstanden ligger på wrapperen – `.brev p` nullstiller margin på avsnitt. */
const Sub = ({ children, testid, mt = 'mt-20 lg:mt-24' }) => (
  <Rise className={mt}><p className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: ACCENT }} data-testid={testid}>{children}</p></Rise>
);

/* ─── 03 Målbildet: én setning om hva vi bygger, og prinsippet som bærer resten. ─── */
const Target = () => {
  const { BREV } = useInnhold();
  const c = BREV.target;
  return (
    <Section id="maalbildet" testid="letter-target" tint>
      <Grid>
        <Aside n="03" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-target-title" />
          <Paragraphs items={c.paragraphs} testid="letter-target-p" />
          <Rise delay={0.1}><p className="font-medium leading-[1.3] tracking-[-0.02em] max-w-[40ch] pt-8 text-balance" style={{ margin: '44px 0 0', color: INK, borderTop: `1px solid ${INK}`, fontSize: 'clamp(22px, 2vw, 30px)' }} data-testid="letter-target-principle">{c.principle}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 04 Strategi: B2B, B2C eller begge – tre alternativer side om side (vår foreløpige prioritet markert i lilla), og en tydelig
 *     merkelapp om at dette er et diskusjonsgrunnlag, ikke en besluttet roadmap. Ingen tall. ─── */
const Strategi = () => {
  const { BREV } = useInnhold();
  const c = BREV.strategi;
  const dot = (valgt) => (valgt ? { background: ACCENT, boxShadow: '0 0 0 4px rgba(127,63,191,0.18)' } : { background: PAPER, border: `1.5px solid ${INK}` });
  return (
    <Section id="strategi" testid="letter-strategy">
      <Grid>
        <Aside n="04" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-strategy-title" />
          <Paragraphs items={c.paragraphs} testid="letter-strategy-p" strong={c.paragraphs.length - 1} />

          {/* B2B · B2C · Kombinasjon – samme form som fasene i kapittel 06. Prikken og lilla linje viser hva vi foreløpig holder en knapp på. */}
          <div className="mt-16 lg:mt-20 grid sm:grid-cols-3 gap-x-8 gap-y-12" data-testid="letter-strategy-alternativer">
            {c.alternativer.map(([h, label, text], i) => {
              const valgt = i === 0;
              return (
                <Rise key={h} delay={0.05 + i * 0.08}><div className="relative pt-7" style={{ borderTop: `1px solid ${valgt ? ACCENT : INK}` }} data-testid={`letter-strategy-alt-${i + 1}`}>
                  <span aria-hidden className="absolute left-0 -top-[5px] w-[9px] h-[9px] rounded-full" style={dot(valgt)} />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: valgt ? ACCENT : MUTED }}>{label}</p>
                  <p className="font-medium tracking-[-0.03em] leading-none" style={{ margin: '14px 0 0', color: INK, fontSize: T.num }}>{h}</p>
                  <p className="text-[15px] leading-[1.6] max-w-[32ch]" style={{ margin: '14px 0 0', color: MUTED }}>{text}</p>
                </div></Rise>
              );
            })}
          </div>

          {/* Diskusjonsgrunnlag – ikke besluttet. Samme form som prinsippet i kapittel 03. */}
          <Rise delay={0.1}><div className="mt-16 lg:mt-20 pt-8" style={{ borderTop: `1px solid ${INK}` }} data-testid="letter-strategy-note">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: ACCENT }} data-testid="letter-strategy-note-h">{c.noteH}</p>
            <p className="font-medium leading-[1.3] tracking-[-0.02em] max-w-[40ch] text-balance" style={{ margin: '16px 0 0', color: INK, fontSize: 'clamp(22px, 2vw, 30px)' }} data-testid="letter-strategy-note-text">{c.note}</p>
          </div></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 06 Hva som er gjort frem til nå: det som er brukt og bygget, bygget → nå → skalere, og hvor risikoen står (fire spørsmål). ─── */
const Naa = () => {
  const { BREV } = useInnhold();
  const c = BREV.naa;
  const dot = (i) => (i === 0 ? { background: INK } : i === 1 ? { background: ACCENT, boxShadow: '0 0 0 4px rgba(127,63,191,0.18)' } : { background: PAPER, border: `1.5px solid ${INK}` });
  return (
    <Section id="hvorfor-naa" testid="letter-naa">
      <Grid>
        <Aside n="06" label={c.eyebrow} />
        <Main>
          <Statement lines={c.title} testid="letter-naa-title" />
          <Paragraphs items={c.paragraphs} testid="letter-naa-p" strong={c.paragraphs.length - 1} first={32} />

          {/* Bygget → nå → neste runde: tre kolonner på én linje, prikken viser hvor vi står. */}
          <div className="mt-16 lg:mt-20 grid sm:grid-cols-3 gap-x-8 gap-y-12" data-testid="letter-naa-steg">
            {c.steg.map(([h, label, text], i) => (
              <Rise key={h} delay={0.05 + i * 0.08}><div className="relative pt-7" style={{ borderTop: `1px solid ${i === 1 ? ACCENT : INK}` }} data-testid={`letter-naa-steg-${i + 1}`}>
                <span aria-hidden className="absolute left-0 -top-[5px] w-[9px] h-[9px] rounded-full" style={dot(i)} />
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: i === 1 ? ACCENT : MUTED }}>{label}</p>
                <p className="font-medium tracking-[-0.03em] leading-none" style={{ margin: '14px 0 0', color: INK, fontSize: T.num }}>{h}</p>
                <p className="text-[15px] leading-[1.6] max-w-[32ch]" style={{ margin: '14px 0 0', color: MUTED }}>{text}</p>
              </div></Rise>
            ))}
          </div>

          {/* Fire typer risiko – de to første er tatt ned, de to siste er det kapitalen skal løse. */}
          <Sub testid="letter-naa-risiko-h">{c.risikoH}</Sub>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10" data-testid="letter-naa-risiko">
            {c.risiko.map(([type, status, text], i) => {
              const aapen = i >= 2;
              return (
                <Rise key={type} delay={0.05 + i * 0.06}><div className="pt-5" style={{ borderTop: `1px solid ${aapen ? ACCENT : INK}` }} data-testid={`letter-naa-risiko-${i + 1}`}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: MUTED }}>{type}</p>
                  <p className="font-medium tracking-[-0.025em] leading-[1.1]" style={{ margin: '14px 0 0', color: aapen ? ACCENT : INK, fontSize: 'clamp(20px, 1.5vw, 24px)' }}>{status}</p>
                  <p className="text-[14.5px] leading-[1.6]" style={{ margin: '12px 0 0', color: MUTED }}>{text}</p>
                </div></Rise>
              );
            })}
          </div>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── Felles for tallene: kilde-merke (bekreftet / estimat / avsatt) og beløpscelle med etikett på mobil ─── */
const KILDE = {
  bekreftet: { dot: { background: INK }, color: INK, label: 'Bekreftet' },
  estimat: { dot: { background: 'transparent', border: `1.5px solid ${MUTED}` }, color: MUTED, label: 'Estimat' },
  avsatt: { dot: { background: ACCENT }, color: ACCENT, label: 'Avsatt' },
};
const Kilde = ({ type, map = KILDE, testid }) => {
  const k = map[type];
  if (!k) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap" style={{ color: k.color }} data-testid={testid}>
      <span aria-hidden className="w-[7px] h-[7px] rounded-full shrink-0" style={k.dot} />{k.label}
    </span>
  );
};

/** Beløp med periode-etikett. Etiketten vises på mobil (kolonneoverskriften er skjult der); på sm+ står den i overskriftsraden. */
const Belop = ({ v, label, strong = false, color, testid }) => (
  <span className="block sm:text-right" data-testid={testid}>
    <span className="block sm:hidden text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: MUTED }}>{label}</span>
    <span className={`block tabular-nums whitespace-nowrap ${strong ? 'text-[17px] font-medium' : 'text-[16px]'}`} style={{ margin: '4px 0 0', color: color || (strong ? INK : MUTED) }}>{v}</span>
  </span>
);

const ROADMAP_COLS = 'sm:[grid-template-columns:150px_minmax(0,1fr)_minmax(0,1.1fr)]';
const STATUS = {
  emisjon: { dot: { background: INK }, color: INK, label: 'Finansiert av denne emisjonen' },
  beslutning: { dot: { background: ACCENT, boxShadow: '0 0 0 3px rgba(127,63,191,0.18)' }, color: ACCENT, label: 'Beslutningspunkt' },
  betinget: { dot: { background: 'transparent', border: `1.5px solid ${MUTED}` }, color: MUTED, label: 'Betinget av finansiering' },
};

/* ─── 07 Roadmap: det denne emisjonen finansierer (måned 1–3), beslutningspunktet ved slutten av måned 2, og det som er betinget ─── */
const Roadmap = () => {
  const { BREV } = useInnhold();
  const c = BREV.roadmap;
  return (
    <Section id="roadmap" testid="letter-roadmap" tint>
      <Grid>
        <Aside n="07" label={c.eyebrow} />
        <Main>
          <Statement lines={c.title} testid="letter-roadmap-title" />
          <Paragraphs items={c.paragraphs} testid="letter-roadmap-p" strong={0} first={32} />

          <div className="mt-14 lg:mt-16" style={{ borderBottom: `1px solid ${HAIR}` }} data-testid="letter-roadmap-faser">
            <div className={`hidden sm:grid gap-x-8 pb-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${ROADMAP_COLS}`} style={{ color: MUTED }}>
              {c.head.map((h) => <span key={h}>{h}</span>)}
            </div>
            {c.faser.map(([periode, fokus, hva, maal, status], i) => {
              const s = STATUS[status] || STATUS.betinget;
              const besl = status === 'beslutning';
              return (
                <Rise key={periode} delay={0.04 + i * 0.04}>
                  <div className={`grid gap-x-8 gap-y-3 py-6 sm:py-7 ${ROADMAP_COLS}`} style={{ borderTop: `1px solid ${besl ? ACCENT : HAIR}` }} data-testid={`letter-roadmap-fase-${i + 1}`}>
                    <div>
                      <span className="block text-[13px] font-semibold tabular-nums whitespace-nowrap" style={{ color: besl ? ACCENT : INK }}>{periode}</span>
                      <span className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: s.color }} data-testid={`letter-roadmap-fase-${i + 1}-status`}>
                        <span aria-hidden className="w-[7px] h-[7px] rounded-full shrink-0" style={s.dot} />{s.label}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[17px] font-medium leading-snug" style={{ color: INK }}>{fokus}</span>
                      <span className="block text-[14px] leading-[1.55] max-w-[36ch]" style={{ margin: '8px 0 0', color: MUTED }}>{hva}</span>
                    </div>
                    <div>
                      <span className="sm:hidden block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: MUTED }}>{c.head[2]}</span>
                      <span className="block text-[15.5px] leading-[1.6] max-w-[46ch]" style={{ margin: '4px 0 0', color: INK }}>{maal}</span>
                    </div>
                  </div>
                </Rise>
              );
            })}
          </div>

          <div className="mt-20 lg:mt-24 grid sm:grid-cols-2 gap-x-8 gap-y-12" data-testid="letter-roadmap-maal">
            {c.maal.map(([h, t], i) => (
              <Rise key={h} delay={0.05 + i * 0.08}><div className="pt-5" style={{ borderTop: `1px solid ${i === 0 ? INK : HAIR}` }} data-testid={`letter-roadmap-maal-${i + 1}`}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: i === 0 ? ACCENT : MUTED }}>{h}</p>
                <p className="font-medium tracking-[-0.025em] leading-[1.25]" style={{ margin: '16px 0 0', color: INK, fontSize: 'clamp(21px, 1.8vw, 27px)' }}>{t}</p>
              </div></Rise>
            ))}
          </div>
          <Rise delay={0.1}><p className="text-[18px] lg:text-[19px] font-medium leading-[1.5] tracking-[-0.01em] max-w-[52ch]" style={{ margin: '32px 0 0', color: MUTED }} data-testid="letter-roadmap-maal-note">{c.maalNote}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 09 Kapitalplan: tre måneder – post · grunnlag · per måned · 3 måneder, engangsposter, totalt avsatt og ikke disponert, disponeringen
 *     som én rolig linje, forutsetningene bak gründerressursen (åpne/lukke, tastatur, alltid med i utskrift), og beslutningspunktet. ─── */
const BUDSJETT_COLS = 'sm:[grid-template-columns:minmax(0,1fr)_120px_140px_150px]';

const Forutsetninger = ({ h, toggle, steg, notes, testid }) => {
  const [open, setOpen] = useState(false);
  const id = `${testid}-panel`;
  return (
    <div className="mt-10 rounded-[20px] overflow-hidden" style={{ border: `1px solid ${HAIR}`, background: '#fbfaf8' }} data-testid={testid}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F3FBF] focus-visible:ring-inset"
        data-testid={`${testid}-toggle`}
      >
        <span className="min-w-0">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>{h}</span>
          <span className="block text-[15px]" style={{ margin: '6px 0 0', color: MUTED }}>{open ? toggle[1] : toggle[0]}</span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} style={{ color: INK }} strokeWidth={2} aria-hidden />
      </button>
      <div id={id} hidden={!open} className="brev-print-show px-6 pb-6" role="region" aria-label={h} data-testid={id}>
        <dl className="m-0" style={{ borderBottom: `1px solid ${HAIR}` }}>
          {steg.map(([label, v, note], i) => {
            const last = i === steg.length - 1;
            const sum = label.startsWith('≈');
            return (
              <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] gap-x-6 gap-y-1 py-3" style={{ borderTop: `1px solid ${sum || last ? INK : HAIR}` }} data-testid={`${testid}-steg-${i + 1}`}>
                <dt className="text-[15px] leading-snug" style={{ color: last || sum ? INK : MUTED, fontWeight: last ? 500 : 400 }}>{label}</dt>
                <dd className="m-0 text-[15px] tabular-nums whitespace-nowrap sm:text-right" style={{ color: last ? ACCENT : INK, fontWeight: last || sum ? 500 : 400 }}>{v}</dd>
                <dd className="m-0 col-span-2 sm:col-span-1 text-[13px] leading-snug" style={{ color: MUTED }}>{note}</dd>
              </div>
            );
          })}
        </dl>
        {notes.map((n, i) => <p key={i} className="text-[14.5px] leading-[1.6] max-w-[66ch]" style={{ margin: i === 0 ? '18px 0 0' : '10px 0 0', color: i === 0 ? INK : MUTED }}>{n}</p>)}
      </div>
    </div>
  );
};

const Kapital = () => {
  const { BREV, KAPITAL } = useInnhold();
  const c = BREV.kapital;
  const k = KAPITAL;
  const engangLabel = 'Engang';
  const swatch = (i) => [{ background: INK }, { background: '#b4b4ba' }, { background: ACCENT }, { background: 'transparent', boxShadow: `inset 0 0 0 1.5px ${INK}` }][i];
  return (
    <Section id="kapital" testid="letter-kapital" tint>
      <Grid>
        <Aside n="09" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-kapital-head" />
          <Paragraphs items={c.paragraphs} testid="letter-kapital-p" strong={0} />

          {/* Tegnforklaring – bekreftet vs. estimat, før tallene */}
          <Rise delay={0.08}><div className="mt-14 lg:mt-16 flex flex-wrap gap-x-7 gap-y-2" data-testid="letter-budsjett-legend">
            {['bekreftet', 'estimat', 'avsatt'].map((t) => (
              <span key={t} className="inline-flex items-center gap-2 text-[13px]" style={{ color: MUTED }}><Kilde type={t} />{c.legend[t]}</span>
            ))}
          </div></Rise>

          {/* Budsjettet: post · grunnlag · per måned · 3 måneder */}
          <div className="mt-6" style={{ borderBottom: `1px solid ${HAIR}` }} data-testid="letter-budsjett">
            <div className={`hidden sm:grid gap-x-6 pb-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${BUDSJETT_COLS}`} style={{ color: MUTED }}>
              {c.head.map((h, i) => <span key={h} className={i >= 2 ? 'text-right' : ''}>{h}</span>)}
            </div>
            {k.poster.map((p, i) => (
              <Rise key={p.key} delay={0.03 + i * 0.03}>
                <div className={`grid grid-cols-2 gap-x-6 gap-y-3 py-5 sm:items-start ${BUDSJETT_COLS}`} style={{ borderTop: `1px solid ${HAIR}` }} data-testid={`letter-budsjett-${p.key}`}>
                  <div className="col-span-2 sm:col-span-1 min-w-0">
                    <span className="block text-[17px] font-medium leading-snug" style={{ color: INK }}>{p.post}</span>
                    <span className="block text-[13.5px] leading-[1.5] max-w-[46ch]" style={{ margin: '5px 0 0', color: MUTED }}>{p.sub}</span>
                    <span className="sm:hidden block" style={{ margin: '8px 0 0' }}><Kilde type={p.kilde} /></span>
                  </div>
                  <div className="hidden sm:block pt-[3px]"><Kilde type={p.kilde} testid={`letter-budsjett-${p.key}-kilde`} /></div>
                  <Belop v={p.f.mnd} label={c.head[2]} color={INK} testid={`letter-budsjett-${p.key}-mnd`} />
                  <Belop v={p.f.tre} label={c.head[3]} testid={`letter-budsjett-${p.key}-tre`} />
                </div>
              </Rise>
            ))}
            <Rise delay={0.2}>
              <div className={`grid grid-cols-2 gap-x-6 gap-y-3 py-5 sm:items-baseline ${BUDSJETT_COLS}`} style={{ borderTop: `1px solid ${INK}` }} data-testid="letter-budsjett-sum">
                <span className="col-span-2 sm:col-span-1 text-[17px] font-medium" style={{ color: INK }}>{c.sumLabel}</span>
                <span className="hidden sm:block" />
                <Belop v={k.sum.f.mnd} label={c.head[2]} strong testid="letter-budsjett-sum-mnd" />
                <Belop v={k.sum.f.tre} label={c.head[3]} strong testid="letter-budsjett-sum-tre" />
              </div>
            </Rise>
          </div>

          {/* Engangsposter – emisjon/juridisk og buffer */}
          <Sub testid="letter-budsjett-engang-h" mt="mt-12">{c.engangH}</Sub>
          <div className="mt-4" style={{ borderBottom: `1px solid ${HAIR}` }} data-testid="letter-budsjett-engang">
            {k.engang.map((e, i) => (
              <Rise key={e.key} delay={0.03 + i * 0.03}>
                <div className={`grid grid-cols-2 gap-x-6 gap-y-3 py-5 sm:items-start ${BUDSJETT_COLS}`} style={{ borderTop: `1px solid ${HAIR}` }} data-testid={`letter-budsjett-${e.key}`}>
                  <div className="col-span-2 sm:col-span-1 min-w-0">
                    <span className="block text-[17px] font-medium leading-snug" style={{ color: INK }}>{e.post}</span>
                    <span className="block text-[13.5px] leading-[1.5] max-w-[46ch]" style={{ margin: '5px 0 0', color: MUTED }}>{e.sub}</span>
                    <span className="sm:hidden block" style={{ margin: '8px 0 0' }}><Kilde type={e.kilde} /></span>
                  </div>
                  <div className="hidden sm:block pt-[3px]"><Kilde type={e.kilde} /></div>
                  <span className="hidden sm:block" />
                  <Belop v={e.f} label={engangLabel} color={INK} testid={`letter-budsjett-${e.key}-belop`} />
                </div>
              </Rise>
            ))}
          </div>

          {/* Emisjonen · totalt avsatt · ikke disponert – tre tall, så disponeringen som én linje */}
          <div className="mt-14 lg:mt-16 grid sm:grid-cols-3 gap-x-8 gap-y-10" data-testid="letter-kapital-sum">
            {[
              ['Emisjonen', k.emisjon.f, 'ny kapital', INK],
              [c.avsattLabel, k.avsatt.f, `${k.sum.f.tre} løpende plan + ${k.engang[0].f} emisjon og juridisk + ${k.engang[1].f} buffer`, INK],
              [c.ikkeDisponertLabel, k.ikkeDisponert.f, c.ikkeDisponertNote, ACCENT],
            ].map(([label, v, text, color], i) => (
              <Rise key={label} delay={0.05 + i * 0.06}><div className="pt-5" style={{ borderTop: `1px solid ${INK}` }} data-testid={`letter-kapital-sum-${i + 1}`}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: MUTED }}>{label}</p>
                <p className="font-medium tracking-[-0.035em] leading-none whitespace-nowrap" style={{ margin: '16px 0 0', color, fontSize: 'clamp(28px, 2.4vw, 40px)' }}>{v}</p>
                <p className="text-[14px] leading-[1.55] max-w-[34ch]" style={{ margin: '12px 0 0', color: MUTED }}>{text}</p>
              </div></Rise>
            ))}
          </div>

          <Rise delay={0.1}><div className="mt-12" data-testid="letter-kapital-disponering">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: MUTED }}>{c.disponeringH} · {k.emisjon.f}</p>
            <div className="mt-4 flex h-[10px] rounded-full overflow-hidden gap-[2px]" role="img" aria-label={k.disponering.map(([l, , f]) => `${l}: ${f}`).join(', ')}>
              {k.disponering.map(([l, n], i) => <span key={l} className="block h-full" style={{ width: `${(n / k.emisjon.belop) * 100}%`, ...swatch(i), borderRadius: 2 }} />)}
            </div>
            <ul className="list-none p-0 m-0 mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
              {k.disponering.map(([l, n, f], i) => (
                <li key={l} className="min-w-0" data-testid={`letter-kapital-disponering-${i + 1}`}>
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: MUTED }}><span aria-hidden className="w-[9px] h-[9px] rounded-[2px] shrink-0" style={swatch(i)} />{l}</span>
                  <span className="block text-[16px] font-medium tabular-nums" style={{ margin: '6px 0 0', color: i === 3 ? ACCENT : INK }}>{f}</span>
                  <span className="block text-[12.5px]" style={{ margin: '2px 0 0', color: MUTED }}>{Math.round((n / k.emisjon.belop) * 100)}&nbsp;% av emisjonen</span>
                </li>
              ))}
            </ul>
          </div></Rise>

          {/* Forutsetningene bak gründerressursen – kan åpnes med tastatur; alltid med i utskrift */}
          <Forutsetninger h={c.lonnH} toggle={c.lonnToggle} steg={k.lonn.steg} notes={c.lonnNote} testid="letter-kapital-forutsetninger" />
          <Rise delay={0.08}><p className="text-[14px] leading-[1.6] max-w-[70ch]" style={{ margin: '18px 0 0', color: MUTED }} data-testid="letter-kapital-forbehold">{c.forbehold}</p></Rise>

          {/* Hva emisjonen finansierer – og ikke */}
          <Rise delay={0.1}><div className="mt-16 lg:mt-20 rounded-[20px] px-6 py-7 lg:px-8 lg:py-8" style={{ background: INK, color: '#fff' }} data-testid="letter-kapital-brudd">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: D.accent }}>{c.bruddH}</p>
            {c.brudd.map((p, i) => <p key={i} className="text-[17px] lg:text-[18px] leading-[1.6] max-w-[66ch]" style={{ margin: i === 0 ? '16px 0 0' : '12px 0 0', color: i === 0 ? '#fff' : D.muted, fontWeight: i === 0 ? 500 : 400 }}>{p}</p>)}
          </div></Rise>

          {/* Beslutningspunktet ved slutten av måned 2 – kostnader, pilotfremdrift, finansiering */}
          <Rise delay={0.1}><div className="mt-14 lg:mt-16 pt-7 relative" style={{ borderTop: `1px solid ${ACCENT}` }} data-testid="letter-kapital-beslutning">
            <span aria-hidden className="absolute left-0 -top-[5px] w-[9px] h-[9px] rounded-full" style={{ background: ACCENT, boxShadow: '0 0 0 4px rgba(127,63,191,0.18)' }} />
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: ACCENT }}>{c.beslutningH}</p>
            <p className="text-[17px] lg:text-[18px] font-medium leading-[1.5] max-w-[56ch]" style={{ margin: '14px 0 0', color: INK }}>{c.beslutningLead}</p>
            <div className="mt-8 grid sm:grid-cols-3 gap-x-8 gap-y-8">
              {c.beslutning.map(([h, t], i) => (
                <div key={h} className="pt-4" style={{ borderTop: `1px solid ${HAIR}` }} data-testid={`letter-kapital-beslutning-${i + 1}`}>
                  <p className="text-[16px] font-medium" style={{ margin: 0, color: INK }}>{h}</p>
                  <p className="text-[14.5px] leading-[1.6] max-w-[32ch]" style={{ margin: '8px 0 0', color: MUTED }}>{t}</p>
                </div>
              ))}
            </div>
          </div></Rise>
          <Rise delay={0.1}><p className="text-[15.5px] leading-[1.65] max-w-[62ch]" style={{ margin: '32px 0 0', color: MUTED }} data-testid="letter-kapital-runde-note">{c.rundeNote}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 08 Forretningsmodell: prisen er ikke validert – rekkefølgen (pilot → nytte og betalingsvilje → utrulling), hva en aktiv enhet er,
 *     ett tydelig merket hypotetisk oppsideeksempel, og ARR (årsrate) mot fakturert år 1. Ingen base case, ingen «fem kunder». ─── */
const Modell = () => {
  const { BREV } = useInnhold();
  const c = BREV.modell;
  return (
    <Section id="modell" testid="letter-modell">
      <Grid>
        <Aside n="08" label={c.eyebrow} />
        <Main>
          <Statement lines={c.title} testid="letter-modell-title" />
          <Paragraphs items={c.paragraphs} testid="letter-modell-p" strong={0} first={32} />
          <Rise delay={0.08}><p className="text-[15.5px] leading-[1.65] max-w-[62ch] pt-5" style={{ margin: '28px 0 0', color: INK, borderTop: `1px solid ${HAIR}` }} data-testid="letter-modell-enhet">{c.enhet}</p></Rise>

          {/* Rekkefølgen – tre steg */}
          <Sub testid="letter-modell-steg-h" mt="mt-16 lg:mt-20">{c.stegH}</Sub>
          <div className="mt-6 grid sm:grid-cols-3 gap-x-8 gap-y-8" data-testid="letter-modell-steg">
            {c.steg.map(([h, t], i) => (
              <Rise key={h} delay={0.05 + i * 0.06}><div className="pt-5" style={{ borderTop: `1px solid ${INK}` }} data-testid={`letter-modell-steg-${i + 1}`}>
                <p className="text-[12px] font-semibold tabular-nums" style={{ margin: 0, color: ACCENT }}>{String(i + 1).padStart(2, '0')}</p>
                <p className="font-medium tracking-[-0.02em] leading-[1.2]" style={{ margin: '12px 0 0', color: INK, fontSize: 'clamp(19px, 1.5vw, 23px)' }}>{h}</p>
                <p className="text-[14.5px] leading-[1.6] max-w-[30ch]" style={{ margin: '10px 0 0', color: MUTED }}>{t}</p>
              </div></Rise>
            ))}
          </div>

          {/* Hypotetisk oppsideeksempel – tydelig merket, ett regnestykke */}
          <Rise delay={0.1}><div className="mt-16 lg:mt-20 rounded-[20px] px-6 py-6 lg:px-8 lg:py-7" style={{ background: FILL, border: `1px solid ${HAIR}` }} data-testid="letter-modell-eksempel">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: ACCENT }} data-testid="letter-modell-eksempel-h">{c.eksempelH}</p>
              <p className="text-[13px] leading-snug max-w-[60ch]" style={{ margin: 0, color: MUTED }} data-testid="letter-modell-eksempel-sub">{c.eksempelSub}</p>
            </div>
            <dl className="m-0 mt-5" style={{ borderBottom: `1px solid ${INK}` }}>
              {c.eksempelRader.map(([label, v, unit], i) => {
                const last = i === c.eksempelRader.length - 1;
                const sum = i === c.eksempelRader.length - 2;
                return (
                  <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_150px] gap-x-6 gap-y-0.5 py-3.5 items-baseline" style={{ borderTop: `1px solid ${sum ? INK : HAIR}` }} data-testid={`letter-modell-eksempel-${i + 1}`}>
                    <dt className="text-[15.5px] leading-snug" style={{ color: last || sum ? INK : MUTED, fontWeight: last || sum ? 500 : 400 }}>{label}</dt>
                    <dd className="m-0 text-[16px] whitespace-nowrap text-right" style={{ color: last ? ACCENT : INK, fontWeight: last || sum ? 500 : 400 }}>{v}</dd>
                    <dd className="m-0 col-span-2 sm:col-span-1 text-[12.5px] sm:text-right" style={{ color: MUTED }}>{unit}</dd>
                  </div>
                );
              })}
            </dl>
          </div></Rise>

          {/* ARR er en årsrate – mot det som faktisk faktureres år 1 */}
          <Sub testid="letter-modell-arr-h">{c.arrH}</Sub>
          <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-10" data-testid="letter-modell-arr">
            {c.arr.map(([n, label, text], i) => (
              <Rise key={label} delay={0.05 + i * 0.06}><div className="pt-5" style={{ borderTop: `1px solid ${INK}` }} data-testid={`letter-modell-arr-${i + 1}`}>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: MUTED }}>{label}</p>
                <p className="font-medium tracking-[-0.035em] leading-none whitespace-nowrap" style={{ margin: '16px 0 0', color: INK, fontSize: 'clamp(28px, 2.4vw, 40px)' }}>{n}</p>
                <p className="text-[14.5px] leading-[1.6] max-w-[38ch]" style={{ margin: '12px 0 0', color: MUTED }}>{text}</p>
              </div></Rise>
            ))}
          </div>
          <Rise delay={0.1}><p className="text-[14.5px] leading-[1.6] max-w-[66ch]" style={{ margin: '24px 0 0', color: MUTED }} data-testid="letter-modell-arr-note">{c.arrNote}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 05 Tech og forvaltning ─── */
const Structure = () => {
  const { BREV } = useInnhold();
  const c = BREV.structure;
  return (
    <Section id="struktur" testid="letter-structure" tint>
      <Grid>
        <Aside n="05" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-structure-head" />
          <Paragraphs items={c.paragraphs} testid="letter-structure-p" strong={c.paragraphs.length - 1} />
          <div className="mt-14 lg:mt-16"><Rows rows={c.rows} testid="letter-structure-rows" /></div>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 10 Laget – og rollen vi ser for oss: tre rader med portretter, så hva det innebærer i praksis (radene vises bare om de finnes) ─── */
const Team = () => {
  const { BREV, TEAM } = useInnhold();
  const t = BREV.team;
  return (
    <Section id="teamet" testid="letter-team-section">
      <Grid>
        <Aside n="10" label={t.eyebrow} />
        <Main>
          <Title title={t.title} testid="letter-team-head" />
          <Paragraphs items={t.paragraphs} testid="letter-team-p" strong={t.paragraphs.length - 1} />
        </Main>
      </Grid>
      {/* Hele laget i ett rutenett – ingen grupper eller etiketter. De to vi inviterer inn er markert med lilla ring (invited). */}
      <div className="mt-16 lg:mt-20 pt-10" style={{ borderTop: `1px solid ${INK}` }} data-testid="letter-team">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12 lg:gap-x-8">
          {TEAM.map((p, i) => (
            <Rise key={p.key} delay={0.06 + i * 0.05} y={22}><Person name={p.name} role={p.role} img={p.img} pos={p.pos} initials={p.initials} bio={p.bio} invited={!!p.invited} sizes="(max-width: 1024px) 42vw, 280px" testid={`letter-team-${p.key}`} /></Rise>
          ))}
        </div>
      </div>
      <Grid className="mt-24 lg:mt-28">
        <Aside label={t.rolleH} testid="letter-owners-aside" />
        <Main>
          <Rise><p className={BODY} style={{ margin: 0, color: INK }} data-testid="letter-owners-lead">{t.rolleLead}</p></Rise>
          {t.rolle?.length > 0 && <div className="mt-12"><Rows rows={t.rolle} testid="letter-owners-rows" /></div>}
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 11 Tilbudet: term sheet på mørk flate (ny kapital · eierandel samlet · pre · post), regnestykket og fordelingen (ikke bestemt), én linje om aksjene, så gjennomføringen ─── */
const Offer = () => {
  const { BREV } = useInnhold();
  const c = BREV.offer;
  return (
    <Section id="tilbudet" testid="letter-offer" dark>
      <Grid>
        <Aside n="11" label={c.eyebrow} dark />
        <Main>
          <Title title={c.title} testid="letter-offer-head" dark />
          <Paragraphs items={c.paragraphs} testid="letter-offer-p" strong={0} dark />
        </Main>
      </Grid>
      <Rise delay={0.1} y={22}>
        <div className="mt-14 lg:mt-20 grid sm:grid-cols-2 lg:grid-cols-4 rounded-[28px] overflow-hidden" style={{ border: `1px solid ${D.hair}`, background: D.fill }} data-testid="letter-offer-terms">
          {c.terms.map(([n, label, l], i) => (
            <div key={label} className={`p-7 lg:p-9 border-white/[0.12] ${['', 'max-sm:border-t sm:border-l', 'max-sm:border-t sm:border-t lg:border-t-0 lg:border-l', 'max-sm:border-t sm:border-l sm:border-t lg:border-t-0'][i]}`} data-testid={`letter-offer-term-${i + 1}`}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: D.muted }}>{label}</p>
              <p className="font-medium tracking-[-0.035em] leading-none whitespace-nowrap" style={{ margin: '22px 0 0', color: i === 0 ? D.accent : D.ink, fontSize: 'clamp(28px, 2.1vw, 38px)' }}>{n}</p>
              <p className="text-[14.5px] leading-snug" style={{ margin: '14px 0 0', color: D.muted }}>{l}</p>
            </div>
          ))}
        </div>
      </Rise>
      <Grid className="mt-10">
        <Main>
          {/* Regnestykket og fordelingen – to korte blokker, så ingen leter etter hvordan 10 % henger sammen, eller tror fordelingen er bestemt. */}
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-8" data-testid="letter-offer-regnestykke">
            <Rise delay={0.08}><div className="pt-5" style={{ borderTop: `1px solid ${D.hair}` }}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: D.muted }}>{c.regnestykkeH}</p>
              <p className="text-[15.5px] leading-[1.6]" style={{ margin: '12px 0 0', color: D.ink }} data-testid="letter-offer-regnestykke-text">{c.regnestykke}</p>
            </div></Rise>
            <Rise delay={0.12}><div className="pt-5" style={{ borderTop: `1px solid ${D.hair}` }}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: D.muted }}>{c.fordelingH}</p>
              <p className="text-[15.5px] leading-[1.6]" style={{ margin: '12px 0 0', color: D.ink }} data-testid="letter-offer-fordeling">{c.fordeling}</p>
            </div></Rise>
          </div>
          <Rise delay={0.1}><p className="text-[15.5px] leading-[1.65] max-w-[70ch]" style={{ margin: '32px 0 0', color: D.muted }} data-testid="letter-offer-aksjer">{c.aksjer}</p></Rise>
        </Main>
      </Grid>

      <Grid className="mt-24 lg:mt-28">
        <Aside label={c.formal.h} dark />
        <Main>
          <Rise><p className={BODY} style={{ margin: 0, color: D.ink }} data-testid="letter-formal-text">{c.formal.text}</p></Rise>
          <Rise delay={0.06}><p className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ margin: '40px 0 0', color: D.accent }}>{c.formal.listH}</p></Rise>
          <ul className="list-none p-0 m-0 mt-5 grid sm:grid-cols-2 gap-x-8" style={{ borderBottom: `1px solid ${D.hair}` }} data-testid="letter-formal-list">
            {c.formal.list.map((e, i) => (
              <Rise key={e} delay={0.06 + i * 0.03}><li className="py-3.5 text-[15.5px] leading-[1.5] flex items-start gap-3" style={{ color: D.ink, borderTop: `1px solid ${D.hair}` }} data-testid={`letter-formal-item-${i + 1}`}>
                <span className="mt-[9px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: D.accent }} />{e}
              </li></Rise>
            ))}
          </ul>
          <Rise delay={0.1}><p className="text-[15.5px] leading-[1.65] max-w-[62ch]" style={{ margin: '24px 0 0', color: D.muted }} data-testid="letter-formal-closing">{c.formal.closing}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 12 Veien videre. Personlig avslutning. Ingen skjema. ─── */
const Next = () => {
  const { BREV } = useInnhold();
  const c = BREV.next;
  return (
    <Section id="videre" testid="letter-next">
      <Grid>
        <Aside n="12" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-next-head" />
          <Paragraphs items={c.paragraphs} testid="letter-next-p" strong={c.paragraphs.length - 1} />
          <Rise delay={0.1}><p className="text-[19px] lg:text-[21px] font-medium" style={{ margin: '36px 0 0', color: INK }} data-testid="letter-closing">{BREV.signature}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

const Footer = () => {
  const { BREV, INV } = useInnhold();
  return (
    <footer className="pt-16 pb-10 lg:pt-20 lg:pb-12" style={{ borderTop: `1px solid ${HAIR}` }} data-testid="letter-footer">
      <Container>
        <div className="grid lg:grid-cols-12 gap-x-8 gap-y-10 items-end">
          <div className="lg:col-span-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt={BREV.brand} className="h-[30px] lg:h-[36px] w-auto" data-testid="letter-footer-logo" />
            <p className="text-[15px] leading-[1.6] max-w-[44ch]" style={{ margin: '22px 0 0', color: MUTED }} data-testid="letter-noindex">{BREV.footer}</p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 flex flex-col lg:items-end gap-4">
            <span className="text-[15px]" style={{ color: INK }}>{BREV.footerFrom}</span>
            <span className="text-[13px]" style={{ color: MUTED }}>{INV.toLong} · {INV.date}</span>
          </div>
        </div>
        <div className="mt-12 pt-6 flex items-center justify-between text-[12.5px] brev-print-hide" style={{ borderTop: `1px solid ${HAIR}`, color: MUTED }}>
          <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />{BREV.eyebrow} · {BREV.confidential}</span>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-[#0a0a0a]" style={{ color: MUTED }} data-testid="letter-footer-top">{BREV.footerTop}<ArrowUp className="w-3.5 h-3.5" strokeWidth={2} /></button>
        </div>
      </Container>
    </footer>
  );
};

/** Invitasjonen. `innhold` kommer fra server-komponenten (app/samarbeid/page.js) – kun når sesjonen er gyldig. */
export default function Brev({ start, innhold }) {
  /* /samarbeid/<id> hopper til kapittelet. */
  useEffect(() => {
    if (!start) return undefined;
    const el = document.getElementById(start);
    if (!el) return undefined;
    const t = window.setTimeout(() => el.scrollIntoView({ block: 'start' }), 80);
    return () => window.clearTimeout(t);
  }, [start]);

  if (!innhold) return null;
  return (
    <InnholdCtx.Provider value={innhold}>
      <div className="brev min-h-screen" style={{ background: PAPER, color: INK }} data-testid="invitation-page">
        <Progress />
        <Header />
        <Cover />
        <Letter />
        <Why />
        <Built />
        <Target />
        <Strategi />
        <Structure />
        <Naa />
        <Roadmap />
        <Modell />
        <Kapital />
        <Team />
        <Offer />
        <Next />
        <Footer />
      </div>
    </InnholdCtx.Provider>
  );
}
