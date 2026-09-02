'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, User, Users } from 'lucide-react';
import { FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift } from '@/components/forside/StegDemo';
import { heading, EASE, display, useMedia, useSynlig, Avsloer, Stakk, Etikett, Knapp } from './motion';

/* ---------------------------------------------------------------------------
   Reisen — «Fra annonse til innbetaling.»
   Scroll-drevne kapitler (01–05) med sticky produktpanel. Graden av autopilot
   (Selvbetjent · Forvaltning · Portefølje) er forankret i panelets topplinje —
   som en kontroll i appen — og endrer «hvem gjør det» på hvert steg + CTA.
--------------------------------------------------------------------------- */

export const NIVAAER = [
  { id: 'selv', label: 'Selvbetjent', ingress: 'Du tar to av fem steg. Resten går av seg selv.', cta: 'Kom i gang', href: '/bli-utleier/start' },
  { id: 'forvaltning', label: 'Forvaltning', ingress: 'DigiHome gjør alt. Du ser alt.', cta: 'Få vurdering', href: '/forvaltning' },
  { id: 'portefolje', label: 'Portefølje', ingress: 'Teamet ditt styrer. Systemet gjør jobben.', cta: 'Book en demo', href: '/book-mote' },
];

export const STEG = [
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

export function Hvem({ v }) {
  const auto = v === 'Automatisk';
  const dh = v === 'DigiHome';
  const team = v === 'Teamet ditt';
  const Ikon = auto ? Sparkles : dh ? ShieldCheck : team ? Users : User;
  const stil = auto
    ? 'bg-[#F1EAFB] text-[#6D4FB0]'
    : dh ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#0A0A0A] ring-1 ring-[#DDD9D1]';
  return (
    <span className={`inline-flex h-[28px] items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium ${stil}`}>
      <Ikon className="h-[12px] w-[12px]" strokeWidth={2} /> {v}
    </span>
  );
}

/* Segmentert kontroll — grå spor, hvit aktiv pille (som i appen) */
export function NivaaVelger({ nivaa, onChange, size = 'md', className = '' }) {
  const h = size === 'sm' ? 'h-[30px]' : 'h-[36px]';
  const tekst = size === 'sm' ? 'text-[13px]' : 'text-[13.5px]';
  const px = size === 'sm' ? 'px-3' : 'px-4';
  const onKey = (e) => {
    if (e.key === 'ArrowRight') onChange((nivaa + 1) % 3);
    if (e.key === 'ArrowLeft') onChange((nivaa + 2) % 3);
  };
  return (
    <div role="tablist" aria-label="Grad av autopilot" onKeyDown={onKey} className={`relative inline-grid grid-cols-3 rounded-[10px] bg-[#F1EFEA] p-[3px] ${className}`} data-testid="v3-nivaavelger">
      <span aria-hidden="true" className="absolute top-[3px] bottom-[3px] rounded-[8px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.05)]" style={{ left: `calc(3px + ${nivaa} * (100% - 6px) / 3)`, width: 'calc((100% - 6px) / 3)', transition: `left 360ms ${EASE}` }} />
      {NIVAAER.map((n, i) => (
        <button key={n.id} role="tab" type="button" aria-selected={nivaa === i} tabIndex={nivaa === i ? 0 : -1} onClick={() => onChange(i)} data-testid={`v3-nivaa-${n.id}`}
          className={`relative z-[1] ${h} rounded-[8px] ${px} ${tekst} font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${nivaa === i ? 'text-[#0A0A0A]' : 'text-[#52504B] hover:text-[#0A0A0A]'}`}>
          {n.label}
        </button>
      ))}
    </div>
  );
}

/* Produktpanel — topplinje med stegpiller + velger, som en app */
function Panel({ aktiv, kjorer, nivaa, setNivaa, onSteg }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#E3DFD8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-32px_rgba(0,0,0,0.14)]" data-testid="v3-reise-panel">
      <div className="flex h-[52px] items-center justify-between gap-4 border-b border-[#ECE9E3] px-3">
        <div className="flex items-center gap-1" role="tablist" aria-label="Steg">
          {STEG.map((s, i) => (
            <button key={s.nr} type="button" role="tab" aria-selected={aktiv === i} onClick={() => onSteg(i)} data-testid={`v3-steg-pille-${s.nr}`}
              className={`flex h-[30px] items-center gap-2 rounded-[8px] px-2.5 text-[13px] font-medium tabular-nums transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${aktiv === i ? 'bg-[#0A0A0A] text-white' : 'text-[#8A867F] hover:bg-[#F1EFEA] hover:text-[#0A0A0A]'}`}>
              {s.nr}
              {aktiv === i && <span className="hidden text-[13px] font-medium xl:inline">{s.t}</span>}
            </button>
          ))}
        </div>
        <NivaaVelger nivaa={nivaa} onChange={setNivaa} size="sm" />
      </div>
      <div className="relative min-h-[480px] bg-[#FCFBF9]">
        {FLATER.map((Flate, i) => (
          <div key={i} className={`flex flex-col justify-center ${i === 0 ? 'relative min-h-[480px]' : 'absolute inset-0'}`} style={{ opacity: aktiv === i ? 1 : 0, transform: aktiv === i ? 'none' : 'translateY(8px)', transition: `opacity 480ms ${EASE}, transform 480ms ${EASE}`, pointerEvents: aktiv === i ? 'auto' : 'none' }} aria-hidden={aktiv !== i}>
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
    <div ref={ref} className="mt-6 overflow-hidden rounded-[14px] border border-[#E3DFD8] bg-[#FCFBF9]">
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

  const gaaTil = (i) => { try { kapitler.current[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ok */ } };

  return (
    <section id="reisen" className="relative scroll-mt-16" data-testid="v3-reisen">
      <div className="mx-auto w-full max-w-[1280px] px-6 pt-20 sm:px-8 sm:pt-28 lg:pt-32">
        <Avsloer>
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <Etikett>Slik virker det</Etikett>
              <h2 className="mt-3 max-w-[14ch] text-[34px] sm:text-[44px] lg:text-[52px]" style={display}>Fra annonse til innbetaling<span className="text-[#cf97fc]">.</span></h2>
            </div>
            <p className="max-w-[44ch] text-[17px] leading-[1.55] text-[#52504B] lg:col-span-5 lg:self-end lg:pb-1">
              Fem steg. Hvem som gjør dem, bestemmer du — systemet gjør resten. Bytt grad av autopilot i panelet og se hva som endrer seg.
            </p>
          </div>
        </Avsloer>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            {STEG.map((s, i) => (
              <div
                key={s.nr}
                ref={(el) => { kapitler.current[i] = el; }}
                data-kap={i}
                data-testid={`v3-kapittel-${s.nr}`}
                className={`flex flex-col border-t border-[#E8E5DF] py-9 first:border-t-0 lg:border-t-0 lg:py-0 ${i === 0 ? 'lg:min-h-[52vh] lg:justify-start lg:pt-2' : 'lg:min-h-[58vh] lg:justify-center'} ${i === STEG.length - 1 ? 'lg:pb-[6vh]' : ''}`}
              >
                <div
                  onClick={() => desktop && gaaTil(i)}
                  className="transition-opacity duration-500 lg:cursor-pointer"
                  style={{ opacity: desktop ? (aktiv === i ? 1 : 0.34) : 1 }}
                >
                  <p className="text-[13px] font-medium tabular-nums text-[#8A867F]">{s.nr}</p>
                  <h3 className="mt-2 text-[24px] sm:text-[28px]" style={display}>{s.t}</h3>
                  <p className="mt-3 max-w-[38ch] text-[15.5px] leading-[1.6] text-[#52504B]">{s.b}</p>
                  <div className="mt-5 flex items-center gap-2.5">
                    <span className="text-[13px] text-[#8A867F]">Hvem gjør det</span>
                    <Stakk idx={nivaa} className="h-[28px]">
                      {s.hvem.map((v, k) => <span key={k} className="block"><Hvem v={v} /></span>)}
                    </Stakk>
                  </div>
                </div>
                {!desktop && <MobilPanel i={i} />}
              </div>
            ))}
          </div>

          {desktop && (
            <div className="hidden lg:col-span-8 lg:block">
              <div ref={panelRef} className="sticky top-[76px]">
                <Panel aktiv={aktiv} kjorer={panelSynlig} nivaa={nivaa} setNivaa={setNivaa} onSteg={gaaTil} />
              </div>
            </div>
          )}
        </div>

        {/* Nivå-CTA — følger velgeren */}
        <Avsloer className="mt-14 lg:mt-6">
          <div className="flex flex-col gap-4 border-t border-[#E8E5DF] pt-7 sm:flex-row sm:items-center sm:justify-between" data-testid="v3-reise-cta">
            <div>
              <Etikett>{n.label}</Etikett>
              <p className="mt-1 text-[19px] font-medium tracking-[-0.02em] text-[#0A0A0A]">{n.ingress}</p>
            </div>
            <Knapp href={n.href} data-testid="v3-reise-cta-knapp">{n.cta}</Knapp>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
