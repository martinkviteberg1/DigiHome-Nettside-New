import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import NavV4 from '../NavV4';
import FooterV4 from '../FooterV4';
import { T, display } from '../tokens';

/* ---------------------------------------------------------------------------
   ArtikkelDeler — editorielt oppsett for guider og nyheter (server-trygt:
   ingen hooks). Stor tittel, byline på hårlinje, «kort svar» som speakable,
   rolig lesebredde, relaterte artikler som rader — ikke kort.
--------------------------------------------------------------------------- */

export const DIM = 'rgba(21,19,15,0.64)';
export const SVAK = 'rgba(21,19,15,0.5)';
export const HAIR = 'rgba(21,19,15,0.12)';
export const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 transition-colors hover:decoration-[#15130F]';

export function ArtikkelRamme({ children, testid = 'artikkel-v4' }) {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid={testid}>
      <NavV4 />
      {children}
      <FooterV4 />
    </div>
  );
}

/* Tilbake-lenke + kategori/tags */
export function Sti({ href, tekst, tags }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
      <Link href={href} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#15130F]" style={{ color: SVAK }}>
        <ArrowRight className="h-3.5 w-3.5 rotate-180" strokeWidth={1.8} /> {tekst}
      </Link>
      {tags?.length ? (
        <span className="flex flex-wrap items-center gap-x-3" style={{ color: SVAK }}>
          <span aria-hidden="true">·</span>
          {tags.map((t) => (typeof t === 'string'
            ? <span key={t} className="font-medium" style={{ color: T.ink }}>{t}</span>
            : <Link key={t.label} href={t.href} className="font-medium transition-colors hover:text-[#15130F]/60" style={{ color: T.ink }}>{t.label}</Link>))}
        </span>
      ) : null}
    </div>
  );
}

export function Tittel({ children, className = '' }) {
  return (
    <h1 className={`mt-6 text-[38px] sm:text-[52px] lg:text-[clamp(48px,4.4vw,72px)] ${className}`} style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.0, color: T.ink, textWrap: 'balance' }}>
      {children}
    </h1>
  );
}

/* Byline på hårlinje: initialer i forfatterens farge (samme identitet på tvers), navn/rolle, meta */
export function Byline({ author, navn, rolle, meta = [], hoyre = null, reviewer = null }) {
  return (
    <div className="mt-8 border-t pt-6" style={{ borderColor: HAIR }}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-medium" style={{ background: author?.accent || T.flate, color: author?.fg || '#fff', fontFamily: 'var(--font-heading)' }}>{author?.initials}</span>
          <span className="leading-tight">
            <span className="block text-[14.5px] font-medium" style={{ color: T.ink }}>{navn || author?.name}</span>
            <span className="mt-0.5 block text-[12.5px]" style={{ color: SVAK }}>{rolle || author?.role}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]" style={{ color: SVAK }}>
          {meta.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              {m.ikon === 'tid' ? <Clock className="h-3.5 w-3.5" strokeWidth={1.8} /> : m.ikon === 'oppdatert' ? <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} /> : null}
              {m.dateTime ? <time dateTime={m.dateTime}>{m.tekst}</time> : m.tekst}
            </span>
          ))}
        </div>
        {hoyre ? <div className="sm:ml-auto">{hoyre}</div> : null}
      </div>
      {reviewer ? (
        <p className="mt-3.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed" style={{ color: SVAK }}>
          <ShieldCheck className="mt-[2px] h-3.5 w-3.5 shrink-0" style={{ color: T.gronn }} strokeWidth={1.8} />
          <span><span className="font-medium" style={{ color: T.ink }}>Faglig kontroll:</span> {reviewer.name} · {reviewer.role}</span>
        </p>
      ) : null}
    </div>
  );
}

/* AEO: det siterbare svaret. .dh-answer er speakable-målet i schemaet. */
export function KortSvar({ children, label = 'Kort svar' }) {
  return (
    <div className="mt-8 rounded-[18px] p-6 sm:p-7" style={{ background: T.flate }}>
      <p className="mb-2.5 text-[13px] font-medium" style={{ color: SVAK }}>{label}</p>
      <p className="dh-answer text-[16.5px] leading-[1.65] sm:text-[17.5px]" style={{ color: 'rgba(21,19,15,0.85)' }}>{children}</p>
    </div>
  );
}

/* Nøkkeltall / fakta — rader, lilla prikk */
export function Fakta({ tittel = 'Nøkkeltall', punkter = [] }) {
  if (!punkter.length) return null;
  return (
    <div className="mt-6 border-t" style={{ borderColor: HAIR }}>
      <p className="pt-4 text-[13px] font-medium" style={{ color: SVAK }}>{tittel}</p>
      <ul className="mt-2">
        {punkter.map((p, i) => (
          <li key={i} className="flex items-start gap-3 border-b py-3 text-[15px] leading-[1.6]" style={{ borderColor: HAIR, color: 'rgba(21,19,15,0.8)' }}>
            <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Bilde({ src, alt, className = 'mt-10', aspekt = 'aspect-[16/9] sm:aspect-[21/9]' }) {
  if (!src) return null;
  return (
    <figure className={className}>
      <div className={`relative overflow-hidden rounded-[20px] ${aspekt}`} style={{ background: T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || ''} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    </figure>
  );
}

/* HowTo — stegene må være synlige for at schemaet skal være gyldig */
export function StegBlokk({ navn, steg = [], anchorId }) {
  if (!steg.length) return null;
  return (
    <section className="mt-10 rounded-[20px] px-6 py-7 sm:px-8 sm:py-8" style={{ background: T.charcoal, color: T.offwhite }}>
      <p className="text-[13px] font-medium" style={{ color: 'rgba(244,241,234,0.55)' }}>{navn}</p>
      <ol className="mt-5 border-t" style={{ borderColor: 'rgba(244,241,234,0.12)' }}>
        {steg.map((s, i) => (
          <li key={s.name} id={anchorId ? anchorId(s.name) : undefined} className="grid scroll-mt-28 grid-cols-[40px_minmax(0,1fr)] gap-x-3 border-b py-4" style={{ borderColor: 'rgba(244,241,234,0.12)' }}>
            <span className="pt-[3px] text-[12.5px] tabular-nums" style={{ color: T.lilla }}>{String(i + 1).padStart(2, '0')}</span>
            <span>
              <span className="block text-[16.5px] font-medium leading-snug" style={{ color: T.offwhite }}>{s.name}</span>
              <span className="mt-1 block text-[14.5px] leading-[1.65]" style={{ color: 'rgba(244,241,234,0.62)' }}>{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function H2({ id, children }) {
  return <h2 id={id} className="scroll-mt-28 text-[26px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.1, color: T.ink }}>{children}</h2>;
}
export function Avsnitt({ children }) {
  return <p className="mt-4 text-[16.5px] leading-[1.75] sm:text-[17px]" style={{ color: 'rgba(21,19,15,0.8)' }}>{children}</p>;
}
export function Punktliste({ punkter = [] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {punkter.map((li, i) => (
        <li key={i} className="flex items-start gap-3 text-[15.5px] leading-[1.65]" style={{ color: 'rgba(21,19,15,0.8)' }}>
          <span aria-hidden="true" className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />
          <span>{li}</span>
        </li>
      ))}
    </ul>
  );
}

export function Kilder({ kilder = [] }) {
  if (!kilder.length) return null;
  return (
    <section className="mt-12 border-t pt-6" style={{ borderColor: HAIR }}>
      <p className="text-[13px] font-medium" style={{ color: SVAK }}>Offisielle kilder og videre lesning</p>
      <ul className="mt-3 space-y-2">
        {kilder.map((k) => (
          <li key={k.url}><a href={k.url} target={k.url.startsWith('http') ? '_blank' : undefined} rel={k.url.startsWith('http') ? 'noopener noreferrer' : undefined} className={`text-[14px] ${LINK}`} style={{ color: 'rgba(21,19,15,0.75)' }}>{k.label}</a></li>
        ))}
      </ul>
    </section>
  );
}

export function Ansvar({ children }) {
  return <p className="mt-10 border-t pt-5 text-[12.5px] leading-relaxed" style={{ borderColor: HAIR, color: SVAK }}>{children}</p>;
}

/* CTA i artikkelen — én mørk flate, én knapp */
export function ArtikkelCta({ tittel = 'Slipp å kunne alt dette selv', tekst = 'DigiHome tar kontrakt, depositum, husleie og rapport — riktig, hver gang.', href = '/kom-i-gang', label = 'Kom i gang' }) {
  return (
    <div className="mt-12 flex flex-col gap-6 rounded-[20px] px-7 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-9" style={{ background: T.charcoal, color: T.offwhite }}>
      <div className="min-w-0">
        <p className="text-[24px] sm:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.offwhite }}>{tittel}<span style={{ color: T.lilla }}>.</span></p>
        <p className="mt-2 max-w-[44ch] text-[14.5px] leading-[1.5]" style={{ color: 'rgba(244,241,234,0.62)' }}>{tekst}</p>
      </div>
      <Link href={href} className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-[12px] px-6 text-[15px] font-medium transition-transform active:scale-[0.97]" style={{ background: T.lilla, color: T.ink }}>
        {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
      </Link>
    </div>
  );
}

/* Relaterte artikler som rader på hårlinjer */
export function Rader({ label, tittel, rader = [], alleHref, alleTekst, testid }) {
  if (!rader.length) return null;
  return (
    <section className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-6 sm:px-8 lg:pb-28" data-testid={testid}>
      <div className="flex items-end justify-between gap-4">
        <div>
          {label ? <p className="text-[13.5px] font-medium" style={{ color: SVAK }}>{label}</p> : null}
          <h2 className="mt-3 text-[clamp(30px,3.2vw,48px)]" style={{ ...display, color: T.ink }}>{tittel}<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span></h2>
        </div>
        {alleHref ? <Link href={alleHref} className="hidden shrink-0 items-center gap-1.5 text-[14.5px] font-medium transition-colors hover:text-[#15130F]/60 sm:inline-flex" style={{ color: T.ink }}>{alleTekst} <ArrowRight className="h-4 w-4" strokeWidth={1.8} /></Link> : null}
      </div>
      <ol className="mt-8 border-t" style={{ borderColor: HAIR }}>
        {rader.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-b py-5 sm:grid-cols-[140px_minmax(0,1fr)_auto]" style={{ borderColor: HAIR }}>
              <span className="hidden text-[13px] sm:block" style={{ color: SVAK }}>{r.meta}</span>
              <span className="min-w-0">
                <span className="block text-[18px] leading-snug transition-colors group-hover:text-[#15130F]/70 sm:text-[20px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.ink }}>{r.tittel}</span>
                {r.tekst ? <span className="mt-1.5 block max-w-[64ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{r.tekst}</span> : null}
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-[#15130F] group-hover:text-white" style={{ boxShadow: `inset 0 0 0 1px ${HAIR}`, color: T.ink }} aria-hidden="true">
                <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
