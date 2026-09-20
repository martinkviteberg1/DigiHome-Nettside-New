'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, useRedusert, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   AgentSeksjon — «En kollega som kjenner hver bolig.» (#assistent)

   DigiHome-assistenten vist slik et team ser den: som et medlem i teamlisten,
   ved siden av menneskene. Til høyre: den ekte chatten, tre samtaler etter
   hverandre. Meldingene kommer én og én, assistenten «skriver» før den
   svarer, under hvert svar står hvor det er hentet fra, og når noe koster
   penger vises løftet til et menneske som en hendelse midt i samtalen.

   Samtalene spiller av seg selv når vinduet er i bildet (tynn fremdrift i
   fanen) og går videre til neste; klikker man en fane, stopper automatikken.
   Alt kan overstyres med props, så meglersiden og bedriftssiden viser hver
   sitt team og sine samtaler. Ingen påstander utover det som allerede står
   på digihome.no.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';
const LYS = 'rgba(244,241,234,0.62)';
const LYS_SVAK = 'rgba(244,241,234,0.4)';

/* Standard = meglersiden */
const MEGLER = {
  firma: 'Vest Utleie AS',
  label: 'DigiHome-assistenten',
  tittel: 'En kollega som kjenner hver bolig',
  ingress: 'Assistenten står i teamlisten som alle andre. Den leser kontrakt, sak, annonse og oppgjør, og svarer leietakere, eiere og interessenter. Det som koster penger, går til et menneske.',
  team: [
    { navn: 'Jonas Haugland', rolle: 'Forvalter', foto: '/v4/jonas.webp', status: 'Fra 08:00' },
    { navn: 'Ida Berg', rolle: 'Oppgjør', foto: '/v4/ida.webp', status: 'Fra 08:00' },
    { navn: 'DigiHome', rolle: 'Assistent', logo: true, status: 'Svarer nå', aktiv: true },
  ],
  leser: ['Boligkort', 'Kontrakter', 'Saker', 'Oppgjør', 'Annonser', 'Visningskalender'],
  aldri: ['Godkjenner kostnader', 'Lover avslag på husleie', 'Velger leietaker'],
  regler: 'Assistenten svarer på det som står i kontrakt, annonse, sak og oppgjør. Den godkjenner ingen kostnader, lover ingen avslag og velger ingen leietaker. Det gjør menneskene i teamet.',
  samtaler: [
    {
      id: 'leietaker', fane: 'Leietaker', hvem: 'Emma Lie', ini: 'EL', om: 'Strandgaten 12 · leil. 3', kl: '08:30',
      m: [
        { fra: 'dem', t: 'Hei, varmtvannet er borte i hele leiligheten.' },
        { fra: 'oss', t: 'Hei Emma. Er det bare varmtvannet som er borte, eller kaldtvannet også? Og lyser det noe på berederen?', kilde: 'Boligkort · bereder 200 l, 2019' },
        { fra: 'dem', t: 'Bare varmt. Ingen lys på berederen.' },
        { fra: 'oss', t: 'Takk. Jeg har opprettet en sak og lagt den til Jonas, som velger rørlegger. Du får beskjed her så snart tidspunktet er klart, sannsynligvis i dag.', kilde: 'Sak 4812 opprettet · Strandgaten 12' },
        { fra: 'dem', t: 'Kan jeg få avslag på husleien for dette?' },
        { fra: 'oss', t: 'Det må Jonas ta stilling til. Jeg har sendt spørsmålet til ham, og han svarer deg her.', loft: 'Løftet til Jonas Haugland · han svarer i samtalen' },
      ],
    },
    {
      id: 'eier', fane: 'Eier', hvem: 'Kari Moen', foto: '/v4/kari.webp', om: 'Eier · Fjellveien 12', kl: '19:42',
      m: [
        { fra: 'dem', t: 'Hei, når kommer husleien for mai?' },
        { fra: 'oss', t: 'Hei Kari. Husleien for mai er mottatt, 17 500 kr. Oppgjøret utbetales 3. juni: 16 100 kr etter honorar. Oppgjørsrapporten ligger i portalen din.', kilde: 'Klientkonto · Oppgjør mai · Fjellveien 12' },
        { fra: 'dem', t: 'Må jeg gjøre noe med årsoppgaven?' },
        { fra: 'oss', t: 'Nei. Årsoppgaven lages i januar og legges i portalen. Tallene går rett inn i skattemeldingen.', kilde: 'Årsoppgave · leveres januar' },
      ],
    },
    {
      id: 'interessent', fane: 'Interessent fra annonsen', hvem: 'Amir Hussain', ini: 'AH', om: 'Fra annonsen · Fjellveien 12', kl: '21:05',
      m: [
        { fra: 'dem', t: 'Hei! Er leiligheten i Fjellveien 12 fortsatt ledig? Kan jeg se den torsdag?' },
        { fra: 'oss', t: 'Hei Amir, ja, den er ledig. Torsdag er det visning kl. 17:00 og 17:30. Du velger tidspunkt rett i annonsen, det tar et halvt minutt.', kilde: 'Annonse Fjellveien 12 · Visningskalender' },
        { fra: 'dem', t: 'Booket 17:00 nå. Er husdyr ok?' },
        { fra: 'oss', t: 'Fint, da ser vi deg torsdag 17:00. Husdyr avtales med eier, så skriv det i søknaden, så tar Jonas det opp med henne.', kilde: 'Visning torsdag 17:00 · Annonse: husdyr etter avtale', loft: 'Husdyr · avgjøres av eier' },
      ],
    },
  ],
};

/* Tempo */
const LES = 1300;
const SKRIVER = 1100;
const PAUSE_SLUTT = 3800;
const START = 500;
const varighet = (s) => START + Math.max(0, s.m.length - 1) * LES + s.m.filter((m) => m.fra === 'oss').length * SKRIVER + PAUSE_SLUTT;

function Avatar({ p, size = 32 }) {
  if (p.logo) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: T.lilla }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/digihome-icon-purple.svg" alt="" style={{ width: size * 0.56, height: size * 0.56 }} />
      </span>
    );
  }
  if (p.foto) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={p.foto} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: `0 0 0 1px ${HAIR}` }} />;
  }
  return <span className="flex shrink-0 items-center justify-center rounded-full font-semibold" style={{ width: size, height: size, fontSize: Math.round(size * 0.34), background: 'rgba(21,19,15,0.06)', color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{p.ini}</span>;
}

function Skriver() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[16px] rounded-tr-[6px] px-3.5 py-3" style={{ background: T.ink }} aria-label="Assistenten skriver">
      {[0, 1, 2].map((i) => <span key={i} className="block h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(244,241,234,0.7)', animation: `v4-prikk 1s ${EASE} ${i * 160}ms infinite` }} />)}
    </span>
  );
}

function Chat({ start, samtaler }) {
  const [aktiv, setAktiv] = useState(0);
  const [vist, setVist] = useState(0);
  const [skriver, setSkriver] = useState(false);
  const [auto, setAuto] = useState(true);
  const redusert = useRedusert();
  const timers = useRef([]);
  const s = samtaler[aktiv];
  const ferdig = vist >= s.m.length;
  const igang = start && !redusert;

  useEffect(() => {
    if (!start) return undefined;
    if (redusert) { setVist(s.m.length); setSkriver(false); return undefined; }
    if (ferdig) {
      if (!auto) return undefined;
      const t = window.setTimeout(() => { setAktiv((a) => (a + 1) % samtaler.length); setVist(0); }, PAUSE_SLUTT);
      return () => window.clearTimeout(t);
    }
    const neste = s.m[vist];
    const fraOss = neste.fra === 'oss';
    const t1 = window.setTimeout(() => {
      if (fraOss) setSkriver(true);
      const t2 = window.setTimeout(() => { setSkriver(false); setVist((v) => v + 1); }, fraOss ? SKRIVER : 0);
      timers.current.push(t2);
    }, vist === 0 ? START : LES);
    timers.current.push(t1);
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  }, [start, aktiv, vist, ferdig, auto, redusert, s, samtaler.length]);

  const velg = (i) => { setAuto(false); setAktiv(i); setVist(0); setSkriver(false); };
  const assistent = { logo: true };

  return (
    <div className="overflow-hidden rounded-[22px]" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -60px rgba(0,0,0,0.6)' }} data-testid="v4m-agent-chat" data-samtale={s.id} data-vist={vist}>
      {/* Fanene, med tynn fremdrift når samtalene spiller av seg selv */}
      <div className="flex gap-1 overflow-x-auto px-3 pt-3 sm:px-4 sm:pt-4" role="tablist" aria-label="Samtaler">
        {samtaler.map((x, i) => {
          const er = i === aktiv;
          return (
            <button key={x.id} type="button" role="tab" aria-selected={er} onClick={() => velg(i)} className="relative shrink-0 overflow-hidden rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors" style={{ background: er ? T.ink : 'transparent', color: er ? '#F4F1EA' : DIM }} data-testid={`v4m-agent-fane-${x.id}`}>
              <span className="relative z-[1]">{x.fane}<span className="ml-1.5 font-normal" style={{ color: er ? 'rgba(244,241,234,0.6)' : SVAK }}>· {x.hvem.split(' ')[0]}</span></span>
              {er && auto ? <span key={`${x.id}-${aktiv}`} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: T.lilla, transformOrigin: '0 50%', transform: igang && vist > 0 ? 'scaleX(1)' : 'scaleX(0)', transition: igang && vist > 0 ? `transform ${varighet(x) - START}ms linear` : 'none' }} /> : null}
            </button>
          );
        })}
      </div>
      {/* Hodet */}
      <div className="mt-3 flex items-center gap-3 px-5 py-3.5 sm:px-6" style={{ boxShadow: `inset 0 1px 0 ${HAIR}, inset 0 -1px 0 ${HAIR}` }}>
        <Avatar p={s} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium leading-[1.2]" style={{ color: T.ink }}>{s.hvem}</p>
          <p className="truncate text-[12px]" style={{ color: SVAK }}>{s.om}</p>
        </div>
        <span className="hidden items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-medium sm:inline-flex" style={{ background: 'rgba(212,150,255,0.22)', color: T.ink }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Svarer: DigiHome · Assistent
        </span>
      </div>
      {/* Meldingene */}
      <div className="flex min-h-[460px] flex-col gap-3 px-4 py-5 sm:min-h-[480px] sm:px-6" aria-live="polite">
        <p className="text-center text-[11.5px]" style={{ color: SVAK }}>I dag · {s.kl}</p>
        {s.m.slice(0, vist).map((m, i) => {
          const oss = m.fra === 'oss';
          return (
            <React.Fragment key={i}>
              <div className={`flex ${oss ? 'justify-end' : 'justify-start'} items-end gap-2.5`} style={{ animation: `v4-chat-inn 420ms ${EASE} both`, transformOrigin: oss ? '100% 100%' : '0 100%' }} data-testid={`v4m-agent-melding-${i}`}>
                {!oss ? <Avatar p={s} size={26} /> : null}
                <div className={`flex max-w-[86%] flex-col sm:max-w-[76%] ${oss ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-[16px] px-4 py-3 text-[14.5px] leading-[1.45] ${oss ? 'rounded-tr-[6px]' : 'rounded-tl-[6px]'}`} style={oss ? { background: T.ink, color: '#F4F1EA' } : { background: '#FFFFFF', color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
                    {m.t}
                  </div>
                  {oss && m.kilde ? <p className="mt-1.5 text-right text-[11.5px]" style={{ color: SVAK }}>Hentet fra: <span style={{ color: DIM }}>{m.kilde}</span></p> : null}
                </div>
                {oss ? <Avatar p={assistent} size={26} /> : null}
              </div>
              {m.loft ? (
                <div className="flex items-center gap-3 py-1" style={{ animation: `v4-chat-inn 420ms ${EASE} 200ms both` }} data-testid={`v4m-agent-loft-${i}`}>
                  <span className="h-px flex-1" style={{ background: HAIR }} />
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-medium" style={{ color: T.ink, boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.3)' }}>
                    <span className="h-[7px] w-[7px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.ink}` }} />{m.loft}
                  </span>
                  <span className="h-px flex-1" style={{ background: HAIR }} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
        {skriver ? <div className="flex items-end justify-end gap-2.5" style={{ animation: `v4-chat-inn 300ms ${EASE} both` }} data-testid="v4m-agent-skriver"><Skriver /><Avatar p={assistent} size={26} /></div> : null}
      </div>
    </div>
  );
}

export default function AgentSeksjon(props) {
  const c = { ...MEGLER, ...props };
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.15);
  const chatRef = useRef(null);
  const chatSynlig = useSynlig(chatRef, 0.3);
  const inn = (i, y = 16) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  return (
    <section id="assistent" ref={ref} className="relative scroll-mt-[72px] lg:scroll-mt-[64px]" style={{ background: T.charcoal, color: T.offwhite }} data-testid="v4m-agent">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-[14px] font-medium" style={{ color: LYS, ...inn(0) }}>{c.label}</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.offwhite, ...inn(1) }} data-testid="v4m-agent-tittel">
              {c.tittel}<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
          </div>
          <p className="max-w-[46ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-5 lg:pb-2" style={{ color: LYS, ...inn(2) }} data-testid="v4m-agent-ingress">{c.ingress}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-12 lg:gap-8">
          {/* Teamet */}
          <div className="lg:col-span-4" style={inn(3, 20)}>
            <div className="rounded-[22px] p-5 sm:p-6" style={{ background: 'rgba(244,241,234,0.06)', boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.12)' }} data-testid="v4m-agent-team">
              <p className="text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Teamet · {c.firma}</p>
              <ul className="mt-4 grid gap-1">
                {c.team.map((p) => (
                  <li key={p.navn} className="flex items-center gap-3 rounded-[14px] px-3 py-2.5" style={{ background: p.aktiv ? 'rgba(212,150,255,0.14)' : 'transparent', boxShadow: p.aktiv ? 'inset 0 0 0 1px rgba(212,150,255,0.35)' : 'none' }}>
                    <Avatar p={p} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium leading-[1.2]" style={{ color: T.offwhite }}>{p.navn}</p>
                      <p className="truncate text-[12px]" style={{ color: LYS_SVAK }}>{p.rolle}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px]" style={{ color: p.aktiv ? T.offwhite : LYS_SVAK }}>
                      {p.aktiv ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} /> : null}{p.status}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t pt-5" style={{ borderColor: 'rgba(244,241,234,0.12)' }}>
                <p className="text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Assistenten leser</p>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {c.leser.map((l) => <li key={l} className="rounded-full px-2.5 py-1 text-[12.5px]" style={{ color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.18)' }}>{l}</li>)}
                </ul>
              </div>
              <div className="mt-6 border-t pt-5" style={{ borderColor: 'rgba(244,241,234,0.12)' }}>
                <p className="text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Gjør aldri</p>
                <ul className="mt-2.5 grid gap-2">
                  {c.aldri.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 text-[14px]" style={{ color: LYS }}>
                      <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.offwhite}` }} />{a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {/* Chatten */}
          <div ref={chatRef} className="lg:col-span-8" style={inn(4, 24)}>
            <Chat start={chatSynlig} samtaler={c.samtaler} />
          </div>
        </div>

        <p className="mt-10 max-w-[66ch] border-t pt-6 text-[15px] leading-[1.55] lg:mt-12" style={{ borderColor: 'rgba(244,241,234,0.12)', color: LYS }} data-testid="v4m-agent-regler">{c.regler}</p>
      </div>
    </section>
  );
}
