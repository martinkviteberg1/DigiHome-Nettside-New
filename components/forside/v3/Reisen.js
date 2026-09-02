'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, User, Users } from 'lucide-react';
import { FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift } from '@/components/forside/StegDemo';
import { heading, EASE, useMedia, useSynlig, Avsloer, Stakk } from './motion';

/* ---------------------------------------------------------------------------
   Reisen — «Fra annonse til innbetaling.»
   Scroll-drevne kapitler (01–05) med sticky produktpanel. Én velger over
   reisen bestemmer graden av autopilot — Selvbetjent · Forvaltning · Portefølje —
   og endrer «hvem gjør det» på hvert steg + CTA. Én side, tre kjøpere.
--------------------------------------------------------------------------- */

export const NIVAAER = [
  { id: 'selv', label: 'Selvbetjent', ingress: 'Du tar to av fem steg. Resten går av seg selv.', cta: 'Kom i gang', href: '/bli-utleier/start' },
  { id: 'forvaltning', label: 'Forvaltning', ingress: 'DigiHome gjør alt. Du ser alt.', cta: 'Få vurdering', href: '/forvaltning' },
  { id: 'portefolje', label: 'Portefølje', ingress: 'Teamet ditt styrer. Systemet gjør jobben.', cta: 'Book en demo', href: '/book-mote' },
];

const STEG = [
  {
    nr: '01', t: 'Finn leietaker',
    b: 'Annonsen publiseres på FINN. Interessentene samles på ett sted, og DigiHome svarer på det som kan svares på — også klokken 23.',
    hvem: ['Automatisk', 'DigiHome', 'Automatisk'],
  },
  {
    nr: '02', t: 'Velg riktig',
    b: 'Kredittsjekk, referanser og vurdering samles i én kandidatliste med anbefaling. Du bestemmer — på et minutt, ikke en helg.',
    hvem: ['Du', 'DigiHome', 'Teamet ditt'],
  },
  {
    nr: '03', t: 'Signer med BankID',
    b: 'Kontrakten bygges fra malen, sendes og signeres digitalt via Posten Signering. Depositum settes opp i samme flyt.',
    hvem: ['Automatisk', 'DigiHome', 'Automatisk'],
  },
  {
    nr: '04', t: 'Få betalt',
    b: 'Husleie med KID, automatisk purring og oppgjør — hver måned, uten at noen løfter en finger.',
    hvem: ['Automatisk', 'Automatisk', 'Automatisk'],
  },
  {
    nr: '05', t: 'Drift som går av seg selv',
    b: 'Saker meldes i appen. Leverandør foreslås, bookes og følges opp. Du godkjenner med ett trykk — eller lar forvalteren gjøre det.',
    hvem: ['Du godkjenner', 'DigiHome', 'Teamet ditt'],
  },
];

const FLATER = [FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift];

function Hvem({ v }) {
  const auto = v === 'Automatisk';
  const dh = v === 'DigiHome';
  const team = v === 'Teamet ditt';
  const Ikon = auto ? Sparkles : dh ? ShieldCheck : team ? Users : User;
  const stil = auto
    ? 'bg-[#F1EAFB] text-[#6D4FB0]'
    : dh ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#0A0A0A] ring-1 ring-black/[0.1]';
  return (
    <span className={`inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold ${stil}`}>
      <Ikon className="h-[13px] w-[13px]" strokeWidth={2} /> {v}
    </span>
  );
}

/* Nivåvelger — segmentert pille med glidende indikator */
export function NivaaVelger({ nivaa, onChange, size = 'md', className = '' }) {
  const h = size === 'lg' ? 'h-[52px]' : 'h-[44px]';
  const tekst = size === 'lg' ? 'text-[15px]' : 'text-[13.5px]';
  return (
    <div role="tablist" aria-label="Grad av autopilot" className={`relative inline-grid grid-cols-3 rounded-full bg-white p-1 ring-1 ring-black/[0.08] shadow-[0_1px_2px_rgba(23,18,12,0.04)] ${className}`} data-testid="v3-nivaavelger">
      <span aria-hidden="true" className={`absolute top-1 bottom-1 rounded-full bg-[#0A0A0A] shadow-[0_8px_18px_-8px_rgba(17,17,17,0.5)]`} style={{ left: `calc(4px + ${nivaa} * (100% - 8px) / 3)`, width: 'calc((100% - 8px) / 3)', transition: `left 420ms ${EASE}` }} />
      {NIVAAER.map((n, i) => (
        <button key={n.id} role="tab" aria-selected={nivaa === i} onClick={() => onChange(i)} data-testid={`v3-nivaa-${n.id}`}
          className={`relative z-[1] ${h} rounded-full px-5 ${tekst} font-semibold transition-colors duration-300 sm:px-7 ${nivaa === i ? 'text-white' : 'text-[#57534e] hover:text-[#0A0A0A]'}`}>
          {n.label}
        </button>
      ))}
    </div>
  );
}

/* Produktpanel med fremdrift */
function Panel({ aktiv, kjorer, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-[24px] bg-[#FCFBF9] shadow-[0_40px_100px_-48px_rgba(84,50,160,0.24),0_0_0_1px_rgba(0,0,0,0.05)] ${className}`} data-testid="v3-reise-panel">
      <div className="flex items-center gap-1.5 px-5 pt-4" aria-hidden="true">
        {STEG.map((s, i) => (
          <span key={s.nr} className="h-[3px] flex-1 overflow-hidden rounded-full bg-black/[0.06]">
            <span className="block h-full rounded-full bg-[#0A0A0A]" style={{ width: i < aktiv ? '100%' : i === aktiv ? '100%' : '0%', opacity: i === aktiv ? 1 : i < aktiv ? 0.35 : 0, transition: `opacity 500ms ${EASE}` }} />
          </span>
        ))}
      </div>
      <div className="relative min-h-[470px]">
        {FLATER.map((Flate, i) => (
          <div key={i} className={`flex flex-col justify-center ${i === 0 ? 'relative min-h-[470px]' : 'absolute inset-0'}`} style={{ opacity: aktiv === i ? 1 : 0, transform: aktiv === i ? 'none' : 'translateY(10px)', transition: `opacity 560ms ${EASE}, transform 560ms ${EASE}`, pointerEvents: aktiv === i ? 'auto' : 'none' }} aria-hidden={aktiv !== i}>
            <Flate kjorer={kjorer && aktiv === i} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Mobil: hvert kapittel får sitt eget panel */
function MobilPanel({ i }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.3);
  const Flate = FLATER[i];
  return (
    <div ref={ref} className="mt-6 overflow-hidden rounded-[22px] bg-[#FCFBF9] shadow-[0_30px_70px_-40px_rgba(84,50,160,0.22),0_0_0_1px_rgba(0,0,0,0.05)]">
      <Flate kjorer={synlig} />
    </div>
  );
}

export default function Reisen({ nivaa, setNivaa }) {
  const [aktiv, setAktiv] = useState(0);
  const desktop = useMedia('(min-width: 1024px)');
  const kapitler = useRef([]);
  const panelRef = useRef(null);
  const panelSynlig = useSynlig(panelRef, 0.2);
  const n = NIVAAER[nivaa];

  /* Kapittel i midtbåndet av viewporten er aktivt */
  useEffect(() => {
    if (!desktop || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const i = Number(e.target.getAttribute('data-kap'));
          if (!Number.isNaN(i)) setAktiv(i);
        }
      });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    kapitler.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [desktop]);

  return (
    <section id="reisen" className="relative scroll-mt-20" data-testid="v3-reisen">
      <div className="mx-auto w-full max-w-[1320px] px-6 pt-24 sm:px-10 sm:pt-32 lg:pt-40">
        {/* Tittel + velger */}
        <Avsloer>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="e-label !text-[#7c7466]">Slik virker det</p>
              <h2 className="e-display mt-4 max-w-[13ch] text-[38px] sm:text-[52px] lg:text-[64px]">Fra annonse til innbetaling<span className="text-[#cf97fc]">.</span></h2>
            </div>
            <div className="lg:pb-2">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Hvor mye vil du gjøre selv?</p>
              <NivaaVelger nivaa={nivaa} onChange={setNivaa} />
              <div className="mt-3 h-[22px] text-[14.5px] text-[#6F6A60]" aria-live="polite">
                <Stakk idx={nivaa}>
                  {NIVAAER.map((x) => <span key={x.id} className="block">{x.ingress}</span>)}
                </Stakk>
              </div>
            </div>
          </div>
        </Avsloer>

        {/* Kapitler + sticky panel */}
        <div className="mt-14 grid grid-cols-1 gap-10 lg:mt-20 lg:grid-cols-[0.36fr_0.64fr] lg:gap-16">
          <div className="relative lg:-my-[10vh] lg:pl-9">
            {/* Fremdriftsskinne (desktop) */}
            <div aria-hidden="true" className="absolute bottom-[10vh] left-[7px] top-[10vh] hidden w-px bg-[#E6E1D9] lg:block" />
            {STEG.map((s, i) => (
              <div
                key={s.nr}
                ref={(el) => { kapitler.current[i] = el; }}
                data-kap={i}
                data-testid={`v3-kapittel-${s.nr}`}
                className={`relative flex flex-col justify-center border-t border-[#ECE8E0] py-10 first:border-t-0 lg:min-h-[68vh] lg:border-t-0 lg:py-0 ${i === 0 ? 'lg:pt-[10vh]' : ''} ${i === STEG.length - 1 ? 'lg:pb-[10vh]' : ''}`}
              >
                {/* Punkt på skinnen */}
                <button
                  type="button"
                  aria-label={`Gå til steg ${Number(s.nr)}: ${s.t}`}
                  onClick={() => { try { kapitler.current[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ok */ } }}
                  className="absolute -left-9 top-1/2 hidden h-[15px] w-[15px] -translate-y-1/2 items-center justify-center rounded-full bg-[#FBFAF7] lg:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                  style={{ marginTop: i === 0 ? '5vh' : i === STEG.length - 1 ? '-5vh' : 0 }}
                >
                  <span className="block rounded-full transition-[width,height,background-color] duration-500" style={{ width: aktiv === i ? 11 : 7, height: aktiv === i ? 11 : 7, background: aktiv === i ? '#0A0A0A' : i < aktiv ? '#8d877d' : '#D6CFC4' }} />
                </button>
                <div
                  role="button"
                  tabIndex={-1}
                  onClick={() => { if (desktop) { try { kapitler.current[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ok */ } } }}
                  className="relative transition-opacity duration-500 lg:cursor-pointer"
                  style={{ opacity: desktop ? (aktiv === i ? 1 : 0.3) : 1 }}
                >
                  {/* Stort, svakt siffer bak tittelen — editorial rytme */}
                  <span aria-hidden="true" className="pointer-events-none absolute -left-3 -top-12 select-none text-[132px] font-bold leading-none tracking-[-0.06em] text-[#0A0A0A]/[0.045]" style={heading}>{s.nr}</span>
                  <p className="relative flex items-center gap-3 text-[13px] font-bold tabular-nums text-[#a49e93]" style={heading}>
                    <span>{s.nr}</span>
                    <span className="h-px w-8 bg-[#D6CFC4]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Steg {Number(s.nr)} av 5</span>
                  </p>
                  <h3 className="e-display relative mt-4 text-[30px] sm:text-[38px]">{s.t}</h3>
                  <p className="relative mt-4 max-w-[38ch] text-[16px] leading-[1.65] text-[#6F6A60]">{s.b}</p>
                  <div className="relative mt-6 flex items-center gap-3">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#a49e93]">Hvem gjør det</span>
                    <Stakk idx={nivaa} className="h-[30px]">
                      {s.hvem.map((v, k) => <span key={k} className="block"><Hvem v={v} /></span>)}
                    </Stakk>
                  </div>
                </div>
                {!desktop && <MobilPanel i={i} />}
              </div>
            ))}
          </div>

          {desktop && (
            <div className="hidden lg:block">
              <div ref={panelRef} className="sticky top-[88px]">
                <Panel aktiv={aktiv} kjorer={panelSynlig} />
              </div>
            </div>
          )}
        </div>

        {/* Nivå-CTA — følger velgeren */}
        <Avsloer className="mt-16 lg:mt-8">
          <div className="flex flex-col gap-5 rounded-[24px] bg-white p-6 ring-1 ring-black/[0.06] sm:flex-row sm:items-center sm:justify-between sm:p-8" data-testid="v3-reise-cta">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">{n.label}</p>
              <p className="mt-1 text-[19px] font-bold tracking-[-0.02em] text-[#0A0A0A]" style={heading}>{n.ingress}</p>
            </div>
            <Link href={n.href} prefetch className="e-btn e-btn-dark group !rounded-full shadow-[0_14px_30px_-14px_rgba(17,17,17,0.32)]" data-testid="v3-reise-cta-knapp">
              {n.cta} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
