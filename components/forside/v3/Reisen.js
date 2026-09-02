'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift, StatiskContext } from '@/components/forside/StegDemo';
import { EASE, display, useSynlig, useRedusert, Avsloer, Stakk, Etikett, Knapp, Lenke } from './motion';

/* ---------------------------------------------------------------------------
   Reisen — «Fra annonse til innbetaling.»  (lys)
   Tabbet produktpanel. Fem steg som faner, ett panel dimensjonert for flatene.
   Tekstkolonnen er en svakt lilla flate; produktet ligger på varm off-white
   så skjermbildene matcher det faktiske produktet. Flatene vises ALLTID
   ferdige (StatiskContext). Auto-fremdrift mens synlig, stopper ved klikk.
--------------------------------------------------------------------------- */

export const STEG = [
  { nr: '01', t: 'Finn leietaker', kort: 'Finn leietaker',
    b: 'Annonsen publiseres på FINN. Interessentene samles på ett sted, og DigiHome svarer på det som kan svares på — også klokken 23.' },
  { nr: '02', t: 'Velg riktig', kort: 'Velg',
    b: 'Kredittsjekk, referanser og vurdering samles i én kandidatliste med anbefaling. Du bestemmer — på et minutt, ikke en helg.' },
  { nr: '03', t: 'Signer med BankID', kort: 'Signer',
    b: 'Kontrakten bygges fra malen, sendes og signeres digitalt via Posten Signering. Depositum settes opp i samme flyt.' },
  { nr: '04', t: 'Få betalt', kort: 'Få betalt',
    b: 'Husleie med KID, automatisk purring og oppgjør — hver måned, uten at noen løfter en finger.' },
  { nr: '05', t: 'Drift som går av seg selv', kort: 'Drift',
    b: 'Saker meldes i appen. Leverandør foreslås, bookes og følges opp. Du godkjenner med ett trykk — eller lar forvalteren gjøre det.' },
];

const FLATER = [FlateFinn, FlateVelg, FlateSigner, FlateBetalt, FlateDrift];
const AUTO_MS = 8000;

export default function Reisen() {
  const [aktiv, setAktiv] = useState(0);
  const [manuell, setManuell] = useState(false);
  const rot = useRef(null);
  const synlig = useSynlig(rot, 0.35);
  const redusert = useRedusert();

  useEffect(() => {
    if (!synlig || manuell || redusert) return undefined;
    const t = window.setTimeout(() => setAktiv((a) => (a + 1) % STEG.length), AUTO_MS);
    return () => window.clearTimeout(t);
  }, [synlig, manuell, redusert, aktiv]);

  const velg = (i) => { setManuell(true); setAktiv(i); };

  /* Tastatur på fanelisten: ←/→ flytter, Home/End hopper. Fokus følger. */
  const fanerRef = useRef(null);
  const taster = (e) => {
    const n = STEG.length;
    let neste = null;
    if (e.key === 'ArrowRight') neste = (aktiv + 1) % n;
    else if (e.key === 'ArrowLeft') neste = (aktiv - 1 + n) % n;
    else if (e.key === 'Home') neste = 0;
    else if (e.key === 'End') neste = n - 1;
    if (neste === null) return;
    e.preventDefault();
    velg(neste);
    const knapp = fanerRef.current && fanerRef.current.querySelectorAll('[role=tab]')[neste];
    if (knapp) knapp.focus();
  };

  return (
    <section id="reisen" className="scroll-mt-16" data-testid="v3-reisen">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 sm:px-8 sm:py-12">
        <Avsloer>
          <Etikett>Slik virker det</Etikett>
          <h2 className="mt-3 max-w-[14ch] text-[34px] text-[#0F0E10] sm:text-[44px] lg:text-[52px]" style={display}>Fra annonse til innbetaling.</h2>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.55] text-[#0F0E10]/60">
            Fem steg. Hvem som gjør dem, bestemmer du — systemet gjør resten.
          </p>
        </Avsloer>

        {/* Faner */}
        <Avsloer delay={80} className="mt-10 sm:mt-12">
          <div ref={fanerRef} role="tablist" aria-label="Steg" onKeyDown={taster} className="-mx-6 flex gap-1 overflow-x-auto px-6 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="v3-steg-faner">
            {STEG.map((st, i) => (
              <button
                key={st.nr}
                type="button"
                role="tab"
                id={`v3-fane-${st.nr}`}
                aria-selected={aktiv === i}
                aria-controls="v3-reise-panel"
                tabIndex={aktiv === i ? 0 : -1}
                onClick={() => velg(i)}
                data-testid={`v3-steg-fane-${st.nr}`}
                className={`relative flex h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3.5 text-[14px] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D496FF]/70 ${aktiv === i ? 'bg-[#0F0E10] text-white' : 'text-[#0F0E10]/55 hover:bg-[#0F0E10]/[0.05] hover:text-[#0F0E10]'}`}
              >
                <span className={`text-[12.5px] tabular-nums ${aktiv === i ? 'text-white/50' : 'text-[#0F0E10]/35'}`}>{st.nr}</span>
                <span className="font-medium">{st.kort}</span>
                {aktiv === i && synlig && !manuell && !redusert && (
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-[6px] h-[2px] overflow-hidden rounded-full bg-white/15">
                    <span key={aktiv} className="block h-full rounded-full bg-white/70" style={{ animation: `v3fane ${AUTO_MS}ms linear forwards` }} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Avsloer>

        {/* Panel — dimensjonert for flatene */}
        <Avsloer delay={140} className="mt-4">
          <div ref={rot} id="v3-reise-panel" role="tabpanel" aria-labelledby={`v3-fane-${STEG[aktiv].nr}`} className="overflow-hidden rounded-[16px] border border-[#0F0E10]/[0.08] bg-white shadow-[0_40px_80px_-60px_rgba(30,20,40,0.35)]" data-testid="v3-reise-panel">
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
              {/* Tekst — svakt lilla flate */}
              <div className="flex min-w-0 flex-col bg-[#F6F3FB] p-7 sm:p-9 lg:justify-center lg:p-10">
                <Stakk idx={aktiv}>
                  {STEG.map((st) => (
                    <div key={st.nr}>
                      <h3 className="text-[26px] text-[#0F0E10] sm:text-[30px]" style={display}>{st.t}</h3>
                      <p className="mt-4 max-w-[38ch] text-[15.5px] leading-[1.6] text-[#0F0E10]/60">{st.b}</p>
                    </div>
                  ))}
                </Stakk>
                <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Knapp href="/bli-utleier/start" variant="lys" data-testid="v3-reise-cta-knapp">Kom i gang</Knapp>
                  <Lenke href="#produkt">Se alt som følger med</Lenke>
                </div>
              </div>
              {/* Produkt — alltid ferdig */}
              <div className="relative min-h-[440px] min-w-0 overflow-hidden border-t border-[#0F0E10]/[0.08] bg-[#FCFBF9] lg:border-l lg:border-t-0">
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
