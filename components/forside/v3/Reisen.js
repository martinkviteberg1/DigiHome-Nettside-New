'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ShieldCheck, User, Users } from 'lucide-react';
import { FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift, StatiskContext } from '@/components/forside/StegDemo';
import { EASE, display, useSynlig, useRedusert, Avsloer, Stakk, Etikett, Knapp } from './motion';

/* ---------------------------------------------------------------------------
   Reisen — «Fra annonse til innbetaling.»
   Tabbet produktpanel. Fem steg som faner, ett panel dimensjonert for flatene.
   Flatene vises ALLTID ferdige (StatiskContext) — aldri halvbygde. Auto-
   fremdrift mens panelet er synlig, stopper ved første klikk. Graden av
   autopilot endrer «hvem gjør det» på hvert steg + CTA.
--------------------------------------------------------------------------- */

export const NIVAAER = [
  { id: 'selv', label: 'Selvbetjent', ingress: 'Du tar to av fem steg. Resten går av seg selv.', cta: 'Kom i gang', href: '/bli-utleier/start' },
  { id: 'forvaltning', label: 'Forvaltning', ingress: 'DigiHome gjør alt. Du ser alt.', cta: 'Få vurdering', href: '/forvaltning' },
  { id: 'portefolje', label: 'Portefølje', ingress: 'Teamet ditt styrer. Systemet gjør jobben.', cta: 'Book en demo', href: '/book-mote' },
];

export const STEG = [
  { nr: '01', t: 'Finn leietaker', kort: 'Finn leietaker',
    b: 'Annonsen publiseres på FINN. Interessentene samles på ett sted, og DigiHome svarer på det som kan svares på — også klokken 23.',
    hvem: ['Automatisk', 'DigiHome', 'Automatisk'] },
  { nr: '02', t: 'Velg riktig', kort: 'Velg',
    b: 'Kredittsjekk, referanser og vurdering samles i én kandidatliste med anbefaling. Du bestemmer — på et minutt, ikke en helg.',
    hvem: ['Du', 'DigiHome', 'Teamet ditt'] },
  { nr: '03', t: 'Signer med BankID', kort: 'Signer',
    b: 'Kontrakten bygges fra malen, sendes og signeres digitalt via Posten Signering. Depositum settes opp i samme flyt.',
    hvem: ['Automatisk', 'DigiHome', 'Automatisk'] },
  { nr: '04', t: 'Få betalt', kort: 'Få betalt',
    b: 'Husleie med KID, automatisk purring og oppgjør — hver måned, uten at noen løfter en finger.',
    hvem: ['Automatisk', 'Automatisk', 'Automatisk'] },
  { nr: '05', t: 'Drift som går av seg selv', kort: 'Drift',
    b: 'Saker meldes i appen. Leverandør foreslås, bookes og følges opp. Du godkjenner med ett trykk — eller lar forvalteren gjøre det.',
    hvem: ['Du godkjenner', 'DigiHome', 'Teamet ditt'] },
];

const FLATER = [FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift];
const AUTO_MS = 8000;

export function Hvem({ v, mork = true }) {
  const auto = v === 'Automatisk';
  const dh = v === 'DigiHome';
  const team = v === 'Teamet ditt';
  const Ikon = auto ? Sparkles : dh ? ShieldCheck : team ? Users : User;
  const stil = mork
    ? (auto ? 'bg-[#CF97FC]/15 text-[#D9B4FF]' : dh ? 'bg-white text-[#0A0A0B]' : 'bg-white/[0.06] text-white ring-1 ring-white/15')
    : (auto ? 'bg-[#F1EAFB] text-[#6D4FB0]' : dh ? 'bg-[#0A0A0A] text-white' : 'bg-white text-[#0A0A0A] ring-1 ring-[#DDD9D1]');
  return (
    <span className={`inline-flex h-[28px] items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium ${stil}`}>
      <Ikon className="h-[12px] w-[12px]" strokeWidth={2} /> {v}
    </span>
  );
}

/* Segmentert kontroll — mørkt spor, lys aktiv pille */
export function NivaaVelger({ nivaa, onChange, size = 'md', className = '', mork = true }) {
  const h = size === 'sm' ? 'h-[30px]' : 'h-[36px]';
  const tekst = size === 'sm' ? 'text-[13px]' : 'text-[13.5px]';
  const px = size === 'sm' ? 'px-3' : 'px-4';
  const onKey = (e) => {
    if (e.key === 'ArrowRight') onChange((nivaa + 1) % 3);
    if (e.key === 'ArrowLeft') onChange((nivaa + 2) % 3);
  };
  return (
    <div role="tablist" aria-label="Grad av autopilot" onKeyDown={onKey} className={`relative inline-grid grid-cols-3 rounded-[10px] p-[3px] ${mork ? 'bg-white/[0.06] ring-1 ring-white/[0.06]' : 'bg-[#F1EFEA]'} ${className}`} data-testid="v3-nivaavelger">
      <span aria-hidden="true" className={`absolute top-[3px] bottom-[3px] rounded-[8px] ${mork ? 'bg-white/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.05)]'}`} style={{ left: `calc(3px + ${nivaa} * (100% - 6px) / 3)`, width: 'calc((100% - 6px) / 3)', transition: `left 360ms ${EASE}` }} />
      {NIVAAER.map((n, i) => (
        <button key={n.id} role="tab" type="button" aria-selected={nivaa === i} tabIndex={nivaa === i ? 0 : -1} onClick={() => onChange(i)} data-testid={`v3-nivaa-${n.id}`}
          className={`relative z-[1] ${h} rounded-[8px] ${px} ${tekst} font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${mork ? (nivaa === i ? 'text-white' : 'text-white/55 hover:text-white') : (nivaa === i ? 'text-[#0A0A0A]' : 'text-[#52504B] hover:text-[#0A0A0A]')}`}>
          {n.label}
        </button>
      ))}
    </div>
  );
}

export default function Reisen({ nivaa, setNivaa }) {
  const [aktiv, setAktiv] = useState(0);
  const [manuell, setManuell] = useState(false);
  const rot = useRef(null);
  const synlig = useSynlig(rot, 0.35);
  const redusert = useRedusert();
  const n = NIVAAER[nivaa];

  useEffect(() => {
    if (!synlig || manuell || redusert) return undefined;
    const t = window.setTimeout(() => setAktiv((a) => (a + 1) % STEG.length), AUTO_MS);
    return () => window.clearTimeout(t);
  }, [synlig, manuell, redusert, aktiv]);

  const velg = (i) => { setManuell(true); setAktiv(i); };

  return (
    <section id="reisen" className="scroll-mt-16" data-testid="v3-reisen">
      <div className="mx-auto w-full max-w-[1280px] px-6 pt-28 sm:px-8 sm:pt-36">
        <Avsloer>
          <Etikett>Slik virker det</Etikett>
          <h2 className="mt-3 max-w-[14ch] text-[34px] text-white sm:text-[44px] lg:text-[52px]" style={display}>Fra annonse til innbetaling<span className="text-[#CF97FC]">.</span></h2>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.55] text-white/55">
            Fem steg. Hvem som gjør dem, bestemmer du — systemet gjør resten.
          </p>
        </Avsloer>

        {/* Faner */}
        <Avsloer delay={80} className="mt-10 sm:mt-12">
          <div role="tablist" aria-label="Steg" className="-mx-6 flex gap-1 overflow-x-auto px-6 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="v3-steg-faner">
            {STEG.map((st, i) => (
              <button
                key={st.nr}
                type="button"
                role="tab"
                aria-selected={aktiv === i}
                onClick={() => velg(i)}
                data-testid={`v3-steg-fane-${st.nr}`}
                className={`relative flex h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3.5 text-[14px] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${aktiv === i ? 'bg-white text-[#0A0A0B]' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`}
              >
                <span className={`text-[12.5px] tabular-nums ${aktiv === i ? 'text-[#0A0A0B]/50' : 'text-white/35'}`}>{st.nr}</span>
                <span className="font-medium">{st.kort}</span>
                {aktiv === i && synlig && !manuell && !redusert && (
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-[6px] h-[2px] overflow-hidden rounded-full bg-black/10">
                    <span key={aktiv} className="block h-full rounded-full bg-black/50" style={{ animation: `v3fane ${AUTO_MS}ms linear forwards` }} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Avsloer>

        {/* Panel — dimensjonert for flatene */}
        <Avsloer delay={140} className="mt-4">
          <div ref={rot} className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#111113]" data-testid="v3-reise-panel">
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              {/* Tekst */}
              <div className="flex min-w-0 flex-col p-7 sm:p-9 lg:p-11">
                <Stakk idx={aktiv}>
                  {STEG.map((st) => (
                    <div key={st.nr}>
                      <p className="text-[13px] tabular-nums text-white/40">Steg {Number(st.nr)} av 5</p>
                      <h3 className="mt-2 text-[26px] text-white sm:text-[30px]" style={display}>{st.t}</h3>
                      <p className="mt-4 max-w-[40ch] text-[15.5px] leading-[1.6] text-white/55">{st.b}</p>
                    </div>
                  ))}
                </Stakk>
                <div className="mt-7 border-t border-white/[0.08] pt-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-[13px] text-white/40">Hvem gjør det</span>
                    <Stakk idx={nivaa * STEG.length + aktiv} className="h-[28px]">
                      {NIVAAER.flatMap((nv, ni) => STEG.map((st, si) => <span key={`${ni}-${si}`} className="block"><Hvem v={st.hvem[ni]} /></span>))}
                    </Stakk>
                  </div>
                  <div className="mt-4"><NivaaVelger nivaa={nivaa} onChange={setNivaa} size="sm" /></div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-8">
                  <Knapp href={n.href} data-testid="v3-reise-cta-knapp">{n.cta}</Knapp>
                  <span className="text-[13.5px] text-white/40">{n.ingress}</span>
                </div>
              </div>
              {/* Produkt — alltid ferdig */}
              <div className="relative min-h-[440px] min-w-0 overflow-hidden border-t border-white/[0.08] bg-[#FCFBF9] lg:border-l lg:border-t-0">
                <StatiskContext.Provider value>
                  {FLATER.map((Flate, i) => (
                    <div key={i} className={i === 0 ? 'relative' : 'absolute inset-0'} style={{ opacity: aktiv === i ? 1 : 0, transform: aktiv === i ? 'none' : 'translateY(6px)', transition: aktiv === i ? `opacity 360ms ${EASE} 160ms, transform 360ms ${EASE} 160ms` : `opacity 160ms ${EASE}`, pointerEvents: aktiv === i ? 'auto' : 'none' }} aria-hidden={aktiv !== i}>
                      <Flate kjorer />
                    </div>
                  ))}
                </StatiskContext.Provider>
              </div>
            </div>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
