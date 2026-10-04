'use client';
/** Privat invitasjon til Martin og Øyvind – et personlig brev fra Erik, Sarah og Martin, ikke en landingsside. /samarbeid, ikke søkbar.
 *  Layouten er tatt fra AFA-repoets InvitationPage: redaksjonelt rutenett (12 kolonner), smal klebrig venstremarg med kapittelnummer og
 *  kicker – innholdet i de ni til høyre. De store utsagnene fyller kolonnen (målt), tilbudet står som et term sheet på mørk flate.
 *  Ni kapitler, ingen skjema – bare «ring oss». Innholdet bor i ./innhold.js. */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { AVSENDERE, BREV, INV, TEAM } from './innhold';
import { DASH_H, DASH_W, EierTelefon, KpiStripe, Oversikt, SakerListe, Skaler, VenterKort } from './produkt';

const EASE = [0.16, 1, 0.3, 1];
const PAPER = '#fafaf9';
const INK = '#0a0a0a';
const MUTED = '#77777d';
const ACCENT = '#7F3FBF';
const FILL = '#f4f4f2';
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
  <section id={id} className="relative py-28 lg:py-40 scroll-mt-4" style={{ background: dark ? INK : tint ? FILL : undefined }} data-testid={testid}>
    <Container><div className="relative">{children}</div></Container>
  </section>
);

/** Ett portrett med navn og rolle under. Sort-hvitt i ro; farge når du nærmer deg. Uten bilde: initialer på dempet flate. */
const Person = ({ name, role, img, pos, sizes, testid, initials, bio, invited }) => (
  <figure className="m-0 group" data-testid={testid}>
    <div className="relative rounded-[24px] overflow-hidden" style={{ aspectRatio: '4 / 5', background: invited ? 'rgba(127,63,191,0.06)' : FILL, border: invited ? `1px dashed rgba(127,63,191,0.35)` : undefined }}>
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

/** Kolonner med hårlinje over: stort ord, kort forklaring. */
const Cells = ({ items, testid, size = T.cell }) => (
  <div className="grid sm:grid-cols-3 gap-x-8 gap-y-10" data-testid={testid}>
    {items.map(([t, d], i) => (
      <Rise key={t} delay={0.05 + i * 0.06}><div className="pt-5" style={{ borderTop: `1px solid ${INK}` }} data-testid={`${testid}-${i + 1}`}>
        <p className="font-medium tracking-[-0.025em] leading-[1.05]" style={{ margin: 0, color: INK, fontSize: size }}>{t}</p>
        <p className="text-[15px] leading-[1.6] max-w-[30ch]" style={{ margin: '12px 0 0', color: MUTED }}>{d}</p>
      </div></Rise>
    ))}
  </div>
);

/** Hårlinjerader: tittel + tekst, valgfritt nummerert. */
const Rows = ({ rows, testid, numbered = false, dark = false }) => {
  const c = tone(dark);
  return (
    <dl style={{ margin: 0, borderBottom: `1px solid ${c.hair}` }} data-testid={testid}>
      {rows.map((r, i) => (
        <Rise key={r[0]} delay={0.05 + i * 0.05}>
          <div className="group grid gap-x-10 gap-y-2 py-7 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]" style={{ borderTop: `1px solid ${c.hair}` }} data-testid={`${testid}-${i + 1}`}>
            <dt className="text-[18px] font-medium leading-snug flex items-baseline gap-3" style={{ color: c.ink }}>
              {numbered && <span className="text-[12px] font-semibold tabular-nums shrink-0 transition-transform duration-500 group-hover:translate-x-1" style={{ color: c.accent }}>{String(i + 1).padStart(2, '0')}</span>}{r[0]}
            </dt>
            <dd className="text-[16px] leading-[1.65] max-w-[58ch]" style={{ margin: 0, color: c.muted }}>{r[1]}</dd>
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

const Header = () => (
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

/** De tre som skriver – små, overlappende portretter. */
const Avatarer = ({ size = 36, testid }) => (
  <span className="inline-flex items-center shrink-0" data-testid={testid}>
    {AVSENDERE.map((p, i) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={p.key} src={p.img} alt={p.name} className="rounded-full object-cover" style={{ width: size, height: size, objectPosition: p.pos, marginLeft: i ? -size * 0.3 : 0, boxShadow: `0 0 0 2px ${PAPER}`, background: FILL }} />
    ))}
  </span>
);

/* ─── Heroen: brevhodet i full bredde – så produktet, slik det står i dag: forvalterens oversikt og eierens hjem i appen. ─── */
const Cover = () => {
  const toLetter = () => { const el = document.getElementById('brevet'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const fade = (delay) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1, delay, ease: EASE } });
  const { ref, size, wrap } = useFitLines(BREV.h1, 116, 44);
  return (
    <section className="relative" data-testid="letter-cover">
      <Container className="relative pt-[132px] lg:pt-[176px]">
        <motion.p {...fade(0)} className="text-[12.5px] font-semibold uppercase tracking-[0.14em]" style={{ margin: 0, color: ACCENT }} data-testid="letter-role">
          {INV.toLong} <span style={{ color: MUTED }}>· {INV.date}</span>
        </motion.p>
        <h1 ref={ref} className="font-medium tracking-[-0.04em] leading-[0.96]" style={{ margin: '26px 0 0', color: INK, fontSize: size, whiteSpace: wrap ? 'normal' : 'nowrap' }} data-testid="letter-title">
          {BREV.h1.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em] -mb-[0.06em]"><motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1.15, delay: 0.15 + i * 0.12, ease: EASE }}>{line}</motion.span></span>
          ))}
        </h1>
        <div className="mt-10 lg:mt-12 grid lg:grid-cols-12 gap-x-8 gap-y-8 items-end">
          <motion.p {...fade(0.5)} className="lg:col-span-7 text-[18px] lg:text-[21px] leading-[1.5] text-pretty max-w-[640px]" style={{ margin: 0, color: MUTED }} data-testid="letter-sub">{BREV.sub}</motion.p>
          <motion.div {...fade(0.7)} className="lg:col-span-5 lg:col-start-8 flex flex-wrap items-center gap-x-5 gap-y-4 lg:justify-end">
            <span className="inline-flex items-center gap-3 text-[15px]" style={{ color: MUTED }} data-testid="letter-to"><Avatarer size={38} testid="letter-founders" />{INV.from}</span>
            <button type="button" onClick={toLetter} className={`${PILL_DARK} h-12 pl-6 pr-5 text-[15px]`} data-testid="letter-cta-read">{BREV.cta}<ArrowDown className="w-4 h-4" strokeWidth={2.2} /></button>
          </motion.div>
        </div>
      </Container>

      {/* Scenen: forvalterens oversikt på en rolig flate, telefonen med eierens hjem foran. Ekte komponenter, ingen illustrasjon. */}
      <Container className="relative mt-14 lg:mt-20">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, delay: 0.5, ease: EASE }} className="relative" data-testid="letter-stage">
          <div className="rounded-[24px] lg:rounded-[32px] overflow-hidden pt-7 px-5 sm:pt-10 sm:px-10 lg:pt-14 lg:px-14" style={{ background: FILL }}>
            <div className="lg:mr-[220px] rounded-t-[12px] lg:rounded-t-[16px] overflow-hidden h-[260px] sm:h-[420px] lg:h-[600px]" style={{ border: `1px solid ${HAIR}`, borderBottom: 0, boxShadow: '0 40px 80px -48px rgba(10,10,10,0.35)' }} data-testid="letter-stage-desktop">
              <Skaler w={DASH_W} h={DASH_H}><Oversikt /></Skaler>
            </div>
          </div>
          <div className="hidden lg:block absolute right-6 -bottom-20 w-[280px]" data-testid="letter-stage-phone"><EierTelefon /></div>
          <div className="lg:hidden relative mx-auto -mt-14 sm:-mt-24 w-[220px] sm:w-[260px]" data-testid="letter-stage-phone-m"><EierTelefon /></div>
        </motion.div>
        <motion.div {...fade(1.1)} className="mt-8 lg:mt-28 flex flex-wrap gap-x-10 gap-y-2 text-[13px]" style={{ color: MUTED }} data-testid="letter-stage-captions">
          {BREV.stage.map((s, i) => <span key={s} className="inline-flex items-baseline gap-2.5"><span className="text-[11px] font-semibold tabular-nums" style={{ color: ACCENT }}>0{i + 1}</span>{s}</span>)}
        </motion.div>
      </Container>
    </section>
  );
};

/* ─── Brevet: marginalia til venstre, teksten i sju kolonner. Signert bare «Erik, Sarah og Martin». ─── */
const Letter = () => (
  <section id="brevet" className="pt-20 lg:pt-28 scroll-mt-4" data-testid="letter-body">
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
          <Rise delay={0.05}><p className="text-[19px] lg:text-[21px] font-medium inline-flex items-center gap-4" style={{ margin: '40px 0 0', color: INK }} data-testid="letter-signature"><Avatarer size={40} />{BREV.signature}</p></Rise>
        </div>
      </Grid>
    </Container>
  </section>
);

/* ─── 01 Hvorfor dere ─── */
const Why = () => {
  const c = BREV.why;
  return (
    <Section id="hvorfor" testid="letter-why">
      <Grid>
        <Aside n="01" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-why-head" />
          <Paragraphs items={c.paragraphs} testid="letter-why-p" strong={c.paragraphs.length - 1} />
          <div className="mt-16"><Cells items={c.points} testid="letter-why-points" size="clamp(20px, 1.6vw, 26px)" /></div>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 02 Målbildet: utsagnet, så Bergen · Oslo · Utleiemegleren · internasjonalt ─── */
const Target = () => {
  const c = BREV.target;
  return (
    <Section id="malbildet" testid="letter-target" tint>
      <Grid>
        <Aside n="02" label={c.eyebrow} />
        <Main>
          <Statement lines={c.title} testid="letter-target-title" />
          <Paragraphs items={c.paragraphs} testid="letter-target-p" first={32} />
          <Rise delay={0.15}><p className="text-[20px] lg:text-[23px] font-medium leading-[1.4] tracking-[-0.015em] max-w-[44ch]" style={{ margin: '28px 0 0', color: INK }} data-testid="letter-target-principle">{c.principle}</p></Rise>
          <div className="mt-16 lg:mt-20"><Rows rows={c.rows} testid="letter-target-rows" /></div>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 03 Hva vi bygger: utsagnet, fire steg ved siden av produktet ─── */
const Build = () => {
  const c = BREV.build;
  return (
    <Section id="bygger" testid="letter-build">
      <Grid>
        <Aside n="03" label={c.eyebrow} />
        <Main>
          <Statement lines={c.title} testid="letter-build-title" />
          <Paragraphs items={c.paragraphs} testid="letter-build-p" first={32} />
          <Rise delay={0.15}><p className="text-[20px] lg:text-[23px] font-medium leading-[1.4] tracking-[-0.015em] max-w-[44ch]" style={{ margin: '28px 0 0', color: INK }} data-testid="letter-build-principle">{c.principle}</p></Rise>
          <div className="mt-14 lg:mt-16 grid lg:grid-cols-[minmax(0,1fr)_264px] gap-x-16 gap-y-14 items-start">
            <div className="min-w-0">
              <ol className="list-none p-0 m-0" style={{ borderBottom: `1px solid ${HAIR}` }} data-testid="letter-flow">
                {c.flow.map(([t, d], i) => (
                  <Rise key={t} delay={0.05 + i * 0.07}><li className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-4 py-5" style={{ borderTop: `1px solid ${HAIR}` }} data-testid={`letter-flow-${i + 1}`}>
                    <span className="text-[12px] font-semibold tabular-nums pt-[6px]" style={{ color: ACCENT }}>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-[18px] font-medium tracking-[-0.015em] leading-[1.3]" style={{ margin: 0, color: INK }}>{t}</p>
                      <p className="text-[15.5px] leading-[1.6] max-w-[52ch]" style={{ margin: '6px 0 0', color: MUTED }}>{d}</p>
                    </div>
                  </li></Rise>
                ))}
              </ol>
              <Rise delay={0.1}><p className="text-[18px] lg:text-[19px] font-medium leading-[1.5] tracking-[-0.01em] max-w-[52ch]" style={{ margin: '32px 0 0', color: INK }} data-testid="letter-build-guarantee">{c.guarantee}</p></Rise>
            </div>
            <Rise delay={0.2} className="justify-self-center lg:justify-self-end lg:sticky lg:top-28 w-[264px]">
              <figure className="m-0" data-testid="letter-phone">
                <EierTelefon />
                <figcaption className="text-[13px] leading-snug text-center" style={{ margin: '18px 0 0', color: MUTED }}>{c.phoneCaption}</figcaption>
              </figure>
            </Rise>
          </div>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 04 Tech og forvaltning ─── */
const Structure = () => {
  const c = BREV.structure;
  return (
    <Section id="struktur" testid="letter-structure">
      <Grid>
        <Aside n="04" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-structure-head" />
          <Paragraphs items={c.paragraphs} testid="letter-structure-p" strong={c.paragraphs.length - 1} />
          <div className="mt-14 lg:mt-16"><Rows rows={c.rows} testid="letter-structure-rows" /></div>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 05 Teamet – laget fremover: de som bygger, styret, og de to vi inviterer inn ─── */
const Team = () => {
  const t = BREV.team;
  return (
    <Section id="teamet" testid="letter-team-section" tint>
      <Grid>
        <Aside n="05" label={t.eyebrow} />
        <Main>
          <Title title={t.title} testid="letter-team-head" />
          <Paragraphs items={t.paragraphs} testid="letter-team-p" strong={t.paragraphs.length - 1} />
        </Main>
      </Grid>
      <div className="mt-16 lg:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12 lg:gap-x-8" data-testid="letter-team">
        {TEAM.map((p, i) => <Rise key={p.key} delay={0.06 + i * 0.05} y={22}><Person name={p.name} role={p.role} img={p.img} pos={p.pos} initials={p.initials} bio={p.bio} invited={!p.img} sizes="(max-width: 1024px) 42vw, 280px" testid={`letter-team-${p.key}`} /></Rise>)}
      </div>
    </Section>
  );
};

/* ─── 06 Hvor vi står: dette starter ikke fra null ─── */
const Built = () => {
  const c = BREV.built;
  return (
    <Section id="status" testid="letter-built">
      <Grid>
        <Aside n="06" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-built-head" />
          <Paragraphs items={c.paragraphs} testid="letter-built-p" strong={c.paragraphs.length - 1} />
          <div className="mt-16 grid sm:grid-cols-2 gap-x-8 gap-y-12" data-testid="letter-built-points">
            {c.points.map(([h, d], i) => (
              <Rise key={h} delay={0.05 + i * 0.06}><div className="pt-5" style={{ borderTop: `1px solid ${INK}` }} data-testid={`letter-built-point-${i + 1}`}>
                <p className="text-[12px] font-semibold tabular-nums" style={{ margin: 0, color: ACCENT }}>{String(i + 1).padStart(2, '0')}</p>
                <p className="text-[21px] font-medium tracking-[-0.02em] leading-[1.2]" style={{ margin: '10px 0 0', color: INK }}>{h}</p>
                <p className="text-[15.5px] leading-[1.6] max-w-[40ch]" style={{ margin: '10px 0 0', color: MUTED }}>{d}</p>
              </div></Rise>
            ))}
          </div>

          {/* Komponentene slik de står i appen – i naturlig størrelse, ikke skalert. */}
          <div className="mt-20 lg:mt-24 space-y-14" data-testid="letter-built-figures">
            <Rise delay={0.1} y={20}>
              <figure className="m-0">
                <div className="rounded-[20px] p-6 lg:p-8" style={{ background: '#fbfaf8', border: `1px solid ${HAIR}` }} data-testid="letter-figure-kpi"><KpiStripe /></div>
                <figcaption className="mt-4 flex items-baseline gap-3 text-[13.5px] leading-snug" style={{ color: MUTED }}><span className="text-[11px] font-semibold tabular-nums" style={{ color: ACCENT }}>01</span><span><span className="font-medium" style={{ color: INK }}>{c.figures[0][0]}</span> · {c.figures[0][1]}</span></figcaption>
              </figure>
            </Rise>
            <Rise delay={0.1} y={20}>
              <figure className="m-0">
                <div className="rounded-[20px] p-6 lg:p-8 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-x-10 gap-y-10" style={{ background: '#fbfaf8', border: `1px solid ${HAIR}` }} data-testid="letter-figure-saker"><SakerListe /><VenterKort /></div>
                <figcaption className="mt-4 flex items-baseline gap-3 text-[13.5px] leading-snug" style={{ color: MUTED }}><span className="text-[11px] font-semibold tabular-nums" style={{ color: ACCENT }}>02</span><span><span className="font-medium" style={{ color: INK }}>{c.figures[1][0]}</span> · {c.figures[1][1]}</span></figcaption>
              </figure>
            </Rise>
          </div>
          <Rise delay={0.1}><p className="text-[15.5px] leading-[1.65] max-w-[62ch]" style={{ margin: '40px 0 0', color: MUTED }} data-testid="letter-built-note">{c.note}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 07 Tilbudet: term sheet på mørk flate – så hvorfor ingen vesting, og den formelle gjennomføringen ─── */
const Offer = () => {
  const c = BREV.offer;
  const v = c.noVesting;
  return (
    <Section id="tilbudet" testid="letter-offer" dark>
      <Grid>
        <Aside n="07" label={c.eyebrow} dark />
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
              <p className="font-medium tracking-[-0.035em] leading-none whitespace-nowrap" style={{ margin: '22px 0 0', color: i === 0 ? D.accent : D.ink, fontSize: 'clamp(30px, 2.3vw, 42px)' }}>{n}</p>
              <p className="text-[14.5px] leading-snug" style={{ margin: '14px 0 0', color: D.muted }}>{l}</p>
            </div>
          ))}
        </div>
      </Rise>

      <Grid className="mt-24 lg:mt-28">
        <Aside label={v.h} dark />
        <Main><Paragraphs items={v.paragraphs} testid="letter-novesting-p" strong={0} dark first={0} /></Main>
      </Grid>

      <Grid className="mt-24 lg:mt-28">
        <Aside label={c.formal.h} dark />
        <Main>
          <Rise><p className={BODY} style={{ margin: 0, color: D.muted }} data-testid="letter-formal-text">{c.formal.text}</p></Rise>
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

/* ─── 08 Som medeiere ─── */
const Owners = () => {
  const c = BREV.owners;
  return (
    <Section id="medeiere" testid="letter-owners">
      <Grid>
        <Aside n="08" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-owners-head" />
          <Paragraphs items={c.paragraphs} testid="letter-owners-p" strong={0} />
          <div className="mt-14 lg:mt-16"><Rows rows={c.rows} testid="letter-owners-rows" /></div>
        </Main>
      </Grid>
    </Section>
  );
};

/* ─── 09 Hva skjer herfra? Personlig avslutning. Ingen skjema. ─── */
const Next = () => {
  const c = BREV.next;
  return (
    <Section id="videre" testid="letter-next" tint>
      <Grid>
        <Aside n="09" label={c.eyebrow} />
        <Main>
          <Title title={c.title} testid="letter-next-head" />
          <Paragraphs items={c.paragraphs} testid="letter-next-p" strong={1} />
          <Rise delay={0.1}><p className="text-[19px] lg:text-[21px] font-medium" style={{ margin: '36px 0 0', color: INK }} data-testid="letter-closing">{BREV.signature}</p></Rise>
        </Main>
      </Grid>
    </Section>
  );
};

export default function Brev({ start }) {
  /* /samarbeid/<id> hopper til kapittelet. */
  useEffect(() => {
    if (!start) return undefined;
    const el = document.getElementById(start);
    if (!el) return undefined;
    const t = window.setTimeout(() => el.scrollIntoView({ block: 'start' }), 80);
    return () => window.clearTimeout(t);
  }, [start]);

  return (
    <div className="brev min-h-screen" style={{ background: PAPER, color: INK }} data-testid="invitation-page">
      <Progress />
      <Header />
      <Cover />
      <Letter />
      <Why />
      <Target />
      <Build />
      <Structure />
      <Team />
      <Built />
      <Offer />
      <Owners />
      <Next />
      <footer className="pt-16 pb-10 lg:pt-20 lg:pb-12" style={{ borderTop: `1px solid ${HAIR}` }} data-testid="letter-footer">
        <Container>
          <div className="grid lg:grid-cols-12 gap-x-8 gap-y-10 items-end">
            <div className="lg:col-span-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/digihome-wordmark-ink.svg" alt={BREV.brand} className="h-[30px] lg:h-[36px] w-auto" data-testid="letter-footer-logo" />
              <p className="text-[15px] leading-[1.6] max-w-[44ch]" style={{ margin: '22px 0 0', color: MUTED }} data-testid="letter-noindex">{BREV.footer}</p>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 flex flex-col lg:items-end gap-4">
              <span className="inline-flex items-center gap-3 text-[15px]" style={{ color: INK }}><Avatarer size={34} />{INV.from}</span>
              <span className="text-[13px]" style={{ color: MUTED }}>{INV.toLong} · {INV.date}</span>
            </div>
          </div>
          <div className="mt-12 pt-6 flex items-center justify-between text-[12.5px] brev-print-hide" style={{ borderTop: `1px solid ${HAIR}`, color: MUTED }}>
            <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />{BREV.eyebrow} · {BREV.confidential}</span>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-[#0a0a0a]" style={{ color: MUTED }} data-testid="letter-footer-top">{BREV.footerTop}<ArrowUp className="w-3.5 h-3.5" strokeWidth={2} /></button>
          </div>
        </Container>
      </footer>
    </div>
  );
}
