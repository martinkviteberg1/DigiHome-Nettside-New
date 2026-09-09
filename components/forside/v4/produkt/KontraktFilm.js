'use client';

import React, { useRef } from 'react';
import { EASE, T, display, tall } from '../motion';
import { PAPIR, HVIT, STEIN, HAIR, DIM, H, P, MORF, LYSKANT, GLASS, Hake, Portrett, Inn, Vokse, Chip, Dok, AutoKnapp, Peker, usePeker, Tekstbytte, Akter, NesteBro, Sms, ValgtKort, BOLIG, EMMA, KARI, BankIdMerke, useBredde, useFilm, Ramme } from './filmdeler';

/* ---------------------------------------------------------------------------
   KontraktFilm — kapittel 2. «Fra valgt til innflyttet.»

   Åpner der Annonse sluttet: Emma-kortet, og én knapp — «Lag kontrakt».
   Ett papir reiser gjennom filmen: først leiekontrakten som fyller seg selv
   ut fra annonsen, så signaturfeltet (BankID, begge), så blir samme papir
   overtakelsesprotokollen 1. november. Ved siden: SMS-ene Emma får, og
   depositumskortet (Keyhole). Tre trykk fra utleier: Lag kontrakt · Signer
   med BankID · Signer protokoll.
--------------------------------------------------------------------------- */

const F = {
  START: 0, PEKER: 1, HOVER: 2, TRYKK1: 3,
  DOK: 4, FYLL1: 5, FYLL2: 6, FYLL3: 7,
  KLAR2: 8, TRYKK2: 9, SIGN1: 10, SMS1: 11, LEST: 12, SIGN2: 13,
  DEP1: 14, DEP2: 15, DEP3: 16,
  BOOK0: 17, BOOK1: 18, BOOK2: 19,
  OVER0: 20, OVER1: 21, OVER2: 22, OVER3: 23, KLAR3: 24, TRYKK3: 25, SIGNERT: 26,
  SLUTT: 27,
};
const AUTO = {
  [F.START]: 1300, [F.PEKER]: 1350, [F.HOVER]: 420, [F.TRYKK1]: 380,
  [F.DOK]: 1300, [F.FYLL1]: 900, [F.FYLL2]: 900, [F.FYLL3]: 1100,
  [F.KLAR2]: 1700, [F.TRYKK2]: 380, [F.SIGN1]: 1500, [F.SMS1]: 1700, [F.LEST]: 1300, [F.SIGN2]: 2000,
  [F.DEP1]: 2000, [F.DEP2]: 1500, [F.DEP3]: 2300,
  [F.BOOK0]: 1700, [F.BOOK1]: 1400, [F.BOOK2]: 2300,
  [F.OVER0]: 1700, [F.OVER1]: 1500, [F.OVER2]: 1300, [F.OVER3]: 1300, [F.KLAR3]: 1700, [F.TRYKK3]: 380, [F.SIGNERT]: 2600,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;
const PEKER_MAAL = {
  [F.PEKER]: 'lag', [F.HOVER]: 'lag', [F.TRYKK1]: 'lag',
  [F.KLAR2]: 'signer', [F.TRYKK2]: 'signer',
  [F.KLAR3]: 'protokoll', [F.TRYKK3]: 'protokoll',
};
const PRESSER = new Set([F.TRYKK1, F.TRYKK2, F.TRYKK3]);

const AKTER = [
  { fra: F.START, tittel: 'Emma er valgt.', tekst: 'Kontrakten er allerede fylt ut — med det som stod i annonsen, og det Emma oppga i søknaden.' },
  { fra: F.DOK, tittel: 'Kontrakten er ferdig utfylt.', tekst: 'Standard husleiekontrakt. Stiplet tekst er hentet fra annonsen og søknaden. Les gjennom, endre om du vil — og signer.' },
  { fra: F.SIGN1, tittel: 'Begge signerer med BankID.', tekst: 'Du signerer først. Emma får en SMS med lenke og signerer på mobilen. Ingen utskrift, ingen skanning.' },
  { fra: F.DEP1, tittel: 'Depositumet velger Emma selv.', tekst: 'Sperret depositumskonto — eller garanti fra Keyhole, så hun beholder pengene. Du er sikret uansett, og ingenting går via din konto.' },
  { fra: F.BOOK0, tittel: 'Overtakelsen booker Emma selv.', tekst: 'Du legger ut tidspunktene som passer deg. Emma velger på mobilen, får bekreftelsen på SMS — og kalenderen din oppdateres.' },
  { fra: F.OVER0, tittel: 'Overtakelsen tas i døra.', tekst: 'Bilder av hvert rom, målerstand og nøkler i én protokoll. Begge signerer på mobilen før dere går fra hverandre.' },
];
const SLUTT = { tittel: 'Emma har flyttet inn.', tekst: 'Første husleie forfaller 1. desember og følges opp automatisk. Fra nå handler det om driften.' };
const aktIndeks = (f) => { let i = 0; AKTER.forEach((a, k) => { if (f >= a.fra) i = k; }); return i; };
const varighet = (i) => { const fra = AKTER[i].fra; const til = i + 1 < AKTER.length ? AKTER[i + 1].fra : SISTE + 1; let sum = 0; for (let f = fra; f < til; f += 1) sum += AUTO[f] || 0; return sum; };
const aktTekst = (fase) => (fase >= F.SLUTT ? { id: 'slutt', ...SLUTT } : { id: String(aktIndeks(fase)), ...AKTER[aktIndeks(fase)] });

const DEPOSITUM = BOLIG.leie * BOLIG.depositumMnd;

/* Kontraktens felt — fylles inn i tre puljer. `fra` = hvor verdien kommer fra (stiplet = hentet, ikke skrevet). */
const FELT = [
  { k: 'Utleier', v: KARI.navn, p: F.FYLL1 },
  { k: 'Leietaker', v: EMMA.navn, p: F.FYLL1, kilde: 'søknad' },
  { k: 'Bolig', v: `${BOLIG.adresse}, ${BOLIG.enhet.toLowerCase()}`, p: F.FYLL1, kilde: 'annonse' },
  { k: 'Areal', v: `${BOLIG.prom} · 2. etasje`, p: F.FYLL1, kilde: 'annonse' },
  { k: 'Leie', v: `${tall(BOLIG.leie)} kr per måned`, p: F.FYLL2, kilde: 'annonse' },
  { k: 'Depositum', v: `${tall(DEPOSITUM)} kr · ${BOLIG.depositumMnd} måneder`, p: F.FYLL2, kilde: 'annonse' },
  { k: 'Innflytting', v: BOLIG.innflytting, p: F.FYLL2, kilde: 'annonse' },
  { k: 'Varighet', v: `${BOLIG.varighet} · tidsbestemt`, p: F.FYLL3, kilde: 'søknad' },
  { k: 'Oppsigelsestid', v: '3 måneder', p: F.FYLL3 },
  { k: 'Husdyr', v: 'Etter avtale', p: F.FYLL3 },
];

const SMS = [
  { id: 'k1', til: 'Emma', fra: F.SMS1, tilOg: F.DEP1, tid: 'i dag 14:03', tekst: 'Hei Emma! Leiekontrakten for Nygårdsgaten 5 er klar. Les og signer med BankID: digihome.no/s/7ka2 – DigiHome' },
  { id: 'k2', til: 'Emma', fra: F.DEP1, tilOg: F.BOOK0, tid: 'i dag 14:41', tekst: 'Hei Emma! Depositumet på 37 500 kr kan settes på sperret konto eller sikres med garanti fra Keyhole. Velg i DigiHome: digihome.no/d/7ka2 – DigiHome' },
  { id: 'k2b', til: 'Emma', fra: F.BOOK2, tilOg: F.OVER0, tid: 'i dag 15:02', tekst: 'Overtakelsen er bekreftet: lørdag 1. november kl. 12:00 i Nygårdsgaten 5. Ta med legitimasjon. – DigiHome' },
  { id: 'k3', til: 'Emma', fra: F.SIGNERT, tilOg: F.SLUTT, tid: '1. nov 12:14', tekst: 'Velkommen hjem, Emma! Overtakelsesprotokollen er signert av begge og ligger i DigiHome. – DigiHome' },
];

/* Protokollen — rom med bilder (fra annonsen), målerstand, nøkler */
const ROM = [
  { navn: 'Stue', src: '/v4/annonse/stue-tom-700.webp' },
  { navn: 'Kjøkken', src: '/v4/annonse/kjokken-600.webp' },
  { navn: 'Soverom', src: '/v4/annonse/soverom-700.webp' },
  { navn: 'Bad', src: '/v4/annonse/spisestue-600.webp' },
];

/* ── Små deler ── */

function Stiplet({ children }) {
  return <span style={{ textDecoration: 'underline dotted', textDecorationColor: 'rgba(160,90,220,0.7)', textUnderlineOffset: 4, textDecorationThickness: 1.5 }}>{children}</span>;
}

function Keyhole({ h = 14 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/v4/logo/keyhole.svg" alt="Keyhole" height={h} style={{ height: h, width: 'auto', display: 'inline-block', verticalAlign: 'middle' }} draggable={false} />
  );
}

function Nokkel({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.8 8.2L13.5 2.5M11 5l2 2M9.5 6.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* Signaturrad — én part. */
function Signatur({ p, rolle, signert, tid, ov, vent }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2.5">
        <Portrett src={p.bilde} alt={p.navn} size={30} />
        <span className="min-w-0"><span className="block truncate text-[13.5px] font-medium">{p.navn}</span><span className="block text-[12px]" style={{ color: DIM }}>{rolle}</span></span>
      </span>
      <span className="grid shrink-0 justify-items-end">
        <span className="col-start-1 row-start-1 text-[12.5px]" style={{ color: DIM, opacity: signert ? 0 : 1, transition: ov ? 'none' : `opacity 300ms ${EASE}` }}>{vent}</span>
        <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium" style={{ color: '#166B3C', opacity: signert ? 1 : 0, transform: signert ? 'none' : 'translateY(4px)', transition: ov ? 'none' : `opacity 400ms ${EASE} 150ms, transform 400ms ${EASE} 150ms` }} aria-hidden={!signert}>
          <Hake size={12} />Signert {tid} · <BankIdMerke h={12} />
        </span>
      </span>
    </div>
  );
}

/* ── Papiret: leiekontrakt → protokoll ── */
function Kontrakt({ fase, ov, kompakt = false }) {
  const signertBegge = fase >= F.SIGN2;
  return (
    <div className="flex h-full flex-col" data-testid="v4-kontrakt-dok">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px]" style={{ color: DIM }}>Husleiekontrakt · standard · <Stiplet>stiplet</Stiplet> = hentet fra annonsen og søknaden</p>
          <h4 className={`${kompakt ? 'mt-1.5 text-[24px]' : 'mt-2 text-[30px]'}`} style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Leiekontrakt</h4>
        </div>
        <span className="mt-1 shrink-0" style={{ opacity: fase >= F.SIGN1 ? 1 : 0, transform: fase >= F.SIGN1 ? 'none' : 'translateY(4px)', transition: ov ? 'none' : `opacity 400ms ${EASE}, transform 400ms ${EASE}` }} aria-hidden={fase < F.SIGN1}>
          <Chip tekst={signertBegge ? 'Signert av begge' : 'Til signering'} tone={signertBegge ? 'gronn' : 'lilla'} liten />
        </span>
      </div>
      <dl className={`mt-4 grid gap-x-6 ${kompakt ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}`}>
        {FELT.map((f, i) => {
          const vis = fase >= f.p;
          const nr = FELT.filter((x) => x.p === f.p).indexOf(f);
          return (
            <div key={f.k} className="flex items-baseline justify-between gap-3 border-b py-2 text-[13px]" style={{ borderColor: HAIR, opacity: vis ? 1 : 0.35, transition: ov ? 'none' : `opacity 400ms ${EASE} ${vis ? nr * 180 : 0}ms` }}>
              <dt style={{ color: DIM }}>{f.k}</dt>
              <dd className="text-right font-medium" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(4px)', filter: vis ? 'blur(0px)' : 'blur(4px)', transition: ov ? 'none' : `opacity 420ms ${EASE} ${vis ? nr * 180 + 80 : 0}ms, transform 420ms ${EASE} ${vis ? nr * 180 + 80 : 0}ms, filter 420ms ${EASE} ${vis ? nr * 180 + 80 : 0}ms` }} aria-hidden={!vis}>
                {f.kilde ? <Stiplet>{f.v}</Stiplet> : f.v}
              </dd>
            </div>
          );
        })}
      </dl>
      {/* Vedlegg — følger kontrakten automatisk */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5" style={{ opacity: fase >= F.FYLL3 ? 1 : 0, transform: fase >= F.FYLL3 ? 'none' : 'translateY(6px)', transition: ov ? 'none' : `opacity 450ms ${EASE} 600ms, transform 450ms ${EASE} 600ms` }} aria-hidden={fase < F.FYLL3}>
        <span className="mr-1 text-[12px]" style={{ color: DIM }}>Vedlegg</span>
        {['Husordensregler', 'Sjekkliste ved innflytting', 'Depositumsavtale'].map((v) => <Chip key={v} tekst={v} liten />)}
      </div>
      <div className={`mt-auto ${kompakt ? 'pt-4' : 'pt-5'}`} style={{ opacity: fase >= F.KLAR2 ? 1 : 0, transform: fase >= F.KLAR2 ? 'none' : 'translateY(8px)', transition: ov ? 'none' : `opacity 500ms ${EASE} 200ms, transform 500ms ${EASE} 200ms` }} aria-hidden={fase < F.KLAR2}>
        <p className="text-[12px] font-medium text-[#15130F]/60">Signaturer</p>
        <div className="mt-1 divide-y" style={{ borderColor: HAIR }}>
          <Signatur p={KARI} rolle="Utleier" signert={fase >= F.SIGN1} tid="14:02" ov={ov} vent="Signerer nå" />
          <Signatur p={EMMA} rolle="Leietaker" signert={fase >= F.SIGN2} tid="14:37" ov={ov} vent={fase >= F.LEST ? 'Åpnet kontrakten · 14:31' : fase >= F.SMS1 ? 'Har fått SMS · 14:03' : 'Venter'} />
        </div>
      </div>
    </div>
  );
}

function Protokoll({ fase, ov, kompakt = false }) {
  const begge = fase >= F.SIGNERT;
  return (
    <div className="flex h-full flex-col" data-testid="v4-protokoll">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px]" style={{ color: DIM }}>{BOLIG.adresse}, {BOLIG.enhet.toLowerCase()} · 1. november · 12:00</p>
          <h4 className={`${kompakt ? 'mt-1.5 text-[24px]' : 'mt-2 text-[30px]'}`} style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Overtakelsesprotokoll</h4>
        </div>
        <span className="mt-1 shrink-0" style={{ opacity: fase >= F.OVER3 ? 1 : 0, transition: ov ? 'none' : `opacity 400ms ${EASE}` }} aria-hidden={fase < F.OVER3}>
          <Chip tekst={begge ? 'Signert av begge' : 'Fylles ut i døra'} tone={begge ? 'gronn' : 'noytral'} liten />
        </span>
      </div>

      {/* Rom — bilder tas i døra, hvert rom kvitteres */}
      <div className={`mt-5 grid gap-2.5 ${kompakt ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {ROM.map((r, i) => {
          const vis = fase >= F.OVER2;
          return (
            <div key={r.navn} className="relative overflow-hidden rounded-[10px]" style={{ aspectRatio: kompakt ? '4 / 3' : '3 / 4', background: 'rgba(21,19,15,0.05)', boxShadow: `0 0 0 1px ${HAIR}, ${LYSKANT}`, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(-10px)', filter: vis ? 'blur(0px)' : 'blur(6px)', transition: ov ? 'none' : `opacity 450ms ${EASE} ${vis ? i * 140 : 0}ms, transform 600ms ${EASE} ${vis ? i * 140 : 0}ms, filter 500ms ${EASE} ${vis ? i * 140 : 0}ms` }} aria-hidden={!vis}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.src} alt={r.navn} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
              <span className="absolute left-1.5 top-1.5 inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-medium" style={{ ...GLASS, color: T.ink }}>{r.navn}</span>
              <span className="absolute bottom-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.92)', color: '#fff', opacity: fase >= F.OVER3 ? 1 : 0, transform: fase >= F.OVER3 ? 'none' : 'scale(0.6)', transition: ov ? 'none' : `opacity 300ms ${EASE} ${i * 120}ms, transform 300ms ${EASE} ${i * 120}ms` }}><Hake size={11} /></span>
            </div>
          );
        })}
      </div>

      <dl className={`mt-4 grid gap-x-6 ${kompakt ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {[
          ['Tilstand', 'Ingen merknader · 4 rom fotografert', F.OVER3],
          ['Strømmåler', '48 213 kWh · fotografert', F.OVER3],
          ['Nøkler', '3 stk overlevert', F.OVER3],
          ['Rengjøring', 'Godkjent', F.OVER3],
        ].map(([k, v, p], i) => {
          const vis = fase >= p;
          return (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b py-2 text-[13px]" style={{ borderColor: HAIR, opacity: vis ? 1 : 0.35, transition: ov ? 'none' : `opacity 400ms ${EASE} ${vis ? 500 + i * 140 : 0}ms` }}>
              <dt className="inline-flex items-center gap-1.5" style={{ color: DIM }}>{k === 'Nøkler' && <Nokkel size={13} />}{k}</dt>
              <dd className="text-right font-medium" style={{ opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity 400ms ${EASE} ${vis ? 560 + i * 140 : 0}ms` }} aria-hidden={!vis}>{v}</dd>
            </div>
          );
        })}
      </dl>

      <div className={`mt-auto ${kompakt ? 'pt-4' : 'pt-5'}`} style={{ opacity: fase >= F.KLAR3 ? 1 : 0, transform: fase >= F.KLAR3 ? 'none' : 'translateY(8px)', transition: ov ? 'none' : `opacity 500ms ${EASE} 200ms, transform 500ms ${EASE} 200ms` }} aria-hidden={fase < F.KLAR3}>
        <p className="text-[12px] font-medium text-[#15130F]/60">Signaturer · på mobilen, i døra</p>
        <div className="mt-1 divide-y" style={{ borderColor: HAIR }}>
          <Signatur p={KARI} rolle="Utleier" signert={fase >= F.SIGNERT} tid="12:11" ov={ov} vent="Signerer nå" />
          <Signatur p={EMMA} rolle="Leietaker" signert={fase >= F.SIGNERT} tid="12:12" ov={ov} vent="Klar" />
        </div>
      </div>
    </div>
  );
}

/* Papiret — ett element. Kontrakt → protokoll skjer som et stille bytte inne i samme ark. */
function Papir({ fase, ov, kompakt = false, className = '', style }) {
  const protokoll = fase >= F.OVER1;
  return (
    <div className={`overflow-hidden rounded-[18px] ${className}`} style={{ background: HVIT, boxShadow: `0 0 0 1px ${HAIR}, 0 30px 80px -50px rgba(21,19,15,0.35)`, ...style }} data-testid="v4-papir" data-protokoll={protokoll ? '1' : '0'}>
      <div className={`grid h-full ${kompakt ? 'p-5' : 'p-7'}`}>
        <div className="col-start-1 row-start-1 h-full" style={{ opacity: protokoll ? 0 : 1, transform: protokoll ? 'translateY(-8px)' : 'none', transition: ov ? 'none' : `opacity 320ms ${EASE}, transform 320ms ${EASE}`, pointerEvents: protokoll ? 'none' : 'auto' }} aria-hidden={protokoll}>
          <Kontrakt fase={fase} ov={ov} kompakt={kompakt} />
        </div>
        <div className="col-start-1 row-start-1 h-full" style={{ opacity: protokoll ? 1 : 0, transform: protokoll ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 500ms ${EASE} 360ms, transform 500ms ${EASE} 360ms`, pointerEvents: protokoll ? 'auto' : 'none' }} aria-hidden={!protokoll}>
          <Protokoll fase={fase} ov={ov} kompakt={kompakt} />
        </div>
      </div>
    </div>
  );
}

/* ── Depositum: Emma velger på mobilen — sperret konto eller garanti fra Keyhole ── */
const VALG = [
  { id: 'konto', t: 'Sperret depositumskonto', u: 'Pengene låses på en konto i ditt navn til leieforholdet er over.' },
  { id: 'garanti', t: 'Depositumsgaranti', u: 'Behold pengene. Keyhole garanterer for depositumet overfor utleier.', keyhole: true },
];
function DepositumValg({ fase, ov, kompakt = false }) {
  const valgt = fase >= F.DEP2;
  const utstedt = fase >= F.DEP3;
  return (
    <div className={`mx-auto w-full rounded-[20px] ${kompakt ? 'max-w-[360px] p-4' : 'max-w-[400px] p-5'}`} style={{ background: HVIT, boxShadow: `0 0 0 1px ${HAIR}, 0 40px 90px -50px rgba(21,19,15,0.45)` }} data-testid="v4-depositum" data-valgt={valgt ? '1' : '0'} data-utstedt={utstedt ? '1' : '0'}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: DIM }}><Portrett src={EMMA.bilde} alt={EMMA.navn} size={22} />Emma velger · på mobilen</span>
        <span className="text-[12.5px] font-medium">Depositum · {tall(DEPOSITUM)} kr</span>
      </div>

      <div className="mt-4 grid">
        {/* Valget */}
        <div className="col-start-1 row-start-1" style={{ opacity: utstedt ? 0 : 1, transform: utstedt ? 'translateY(-8px)' : 'none', transition: ov ? 'none' : `opacity 320ms ${EASE}, transform 320ms ${EASE}`, pointerEvents: utstedt ? 'none' : 'auto' }} aria-hidden={utstedt}>
          <div className="grid gap-2">
            {VALG.map((v, i) => {
              const aktiv = v.id === 'garanti' && valgt;
              return (
                <div key={v.id} className="relative flex items-start gap-3 rounded-[14px] p-3.5" style={{ boxShadow: aktiv ? `inset 0 0 0 1.5px ${T.lilla}` : `inset 0 0 0 1px ${HAIR}`, background: aktiv ? 'rgba(212,150,255,0.10)' : 'transparent', transition: ov ? 'none' : `box-shadow 300ms ${EASE}, background-color 300ms ${EASE}`, opacity: fase >= F.DEP1 ? 1 : 0, transitionDelay: `${i * 120}ms` }} data-testid={`v4-valg-${v.id}`}>
                  <span className="relative mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full" style={{ width: 18, height: 18, boxShadow: aktiv ? `inset 0 0 0 5px ${T.lilla}` : 'inset 0 0 0 1.5px rgba(21,19,15,0.3)', background: HVIT, transition: ov ? 'none' : `box-shadow 260ms ${EASE}` }}>
                    {aktiv && !ov && <span key="ring" aria-hidden="true" className="absolute -inset-[7px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.lilla}`, animation: 'v4-ring 600ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards' }} />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[14px] font-medium">{v.t}{v.keyhole && <Keyhole h={12} />}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.45]" style={{ color: DIM }}>{v.u}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resultatet */}
        <div className="col-start-1 row-start-1" style={{ opacity: utstedt ? 1 : 0, transform: utstedt ? 'none' : 'translateY(10px)', filter: utstedt ? 'blur(0px)' : 'blur(6px)', transition: ov ? 'none' : `opacity 500ms ${EASE} 320ms, transform 500ms ${EASE} 320ms, filter 500ms ${EASE} 320ms`, pointerEvents: utstedt ? 'auto' : 'none' }} aria-hidden={!utstedt} data-testid="v4-depositum-utstedt">
          <div className="rounded-[14px] p-4" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
            <div className="flex items-center justify-between gap-3">
              <Keyhole h={16} />
              <Chip tekst="Sikret" tone="gronn" liten />
            </div>
            <p className="mt-3 text-[17px] font-medium tracking-[-0.01em]">Depositumsgaranti utstedt</p>
            <p className="mt-1 text-[13px] leading-[1.45]" style={{ color: DIM }}>Dekker {tall(DEPOSITUM)} kr for {BOLIG.adresse}, {BOLIG.enhet.toLowerCase()}. Gjelder fra {BOLIG.innflytting}.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-[12.5px]" style={{ borderColor: HAIR }}>
              <div><p style={{ color: DIM }}>Leietaker</p><p className="mt-0.5 font-medium">{EMMA.navn}</p></div>
              <div><p style={{ color: DIM }}>Utleier</p><p className="mt-0.5 font-medium">Varslet · dokument i saken</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Overtakelse: Emma booker tidspunkt — Kari har lagt ut når hun kan ── */
const TIDER = ['10:00', '12:00', '14:00'];
function OvertakelseBooking({ fase, ov, kompakt = false }) {
  const valgt = fase >= F.BOOK1;
  const bekreftet = fase >= F.BOOK2;
  return (
    <div className={`mx-auto w-full rounded-[20px] ${kompakt ? 'max-w-[360px] p-4' : 'max-w-[400px] p-5'}`} style={{ background: HVIT, boxShadow: `0 0 0 1px ${HAIR}, 0 40px 90px -50px rgba(21,19,15,0.45)` }} data-testid="v4-booking" data-valgt={valgt ? '1' : '0'} data-bekreftet={bekreftet ? '1' : '0'}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: DIM }}><Portrett src={EMMA.bilde} alt={EMMA.navn} size={22} />Emma velger · på mobilen</span>
        <span className="text-[12.5px] font-medium">Overtakelse</span>
      </div>

      <div className="mt-4 grid">
        <div className="col-start-1 row-start-1" style={{ opacity: bekreftet ? 0 : 1, transform: bekreftet ? 'translateY(-8px)' : 'none', transition: ov ? 'none' : `opacity 320ms ${EASE}, transform 320ms ${EASE}`, pointerEvents: bekreftet ? 'none' : 'auto' }} aria-hidden={bekreftet}>
          {/* Dagen: innflyttingsdatoen fra kontrakten */}
          <div className="flex items-center justify-between rounded-[14px] px-3.5 py-3" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
            <span>
              <span className="block text-[11.5px]" style={{ color: DIM }}>Innflytting · fra kontrakten</span>
              <span className="mt-0.5 block text-[15px] font-medium tracking-[-0.01em]">Lørdag 1. november</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: DIM }}><Portrett src={KARI.bilde} alt={KARI.navn} size={20} />Kari kan</span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {TIDER.map((t, i) => {
              const aktiv = t === '12:00' && valgt;
              return (
                <div key={t} className="relative flex h-12 items-center justify-center rounded-[12px] text-[14px] font-medium" style={{ boxShadow: aktiv ? `inset 0 0 0 1.5px ${T.lilla}` : `inset 0 0 0 1px ${HAIR}`, background: aktiv ? 'rgba(212,150,255,0.14)' : 'transparent', transition: ov ? 'none' : `box-shadow 300ms ${EASE}, background-color 300ms ${EASE}`, opacity: fase >= F.BOOK0 ? 1 : 0, transitionDelay: `${i * 90}ms` }} data-testid={`v4-tid-${t}`}>
                  {t}
                  {aktiv && !ov && <span key="ring" aria-hidden="true" className="absolute inset-0 rounded-[12px]" style={{ boxShadow: `inset 0 0 0 1.5px ${T.lilla}`, animation: 'v4-ring 600ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards' }} />}
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-[12px]" style={{ color: DIM }}>Ledige tidspunkt er hentet fra Karis kalender.</p>
        </div>

        <div className="col-start-1 row-start-1" style={{ opacity: bekreftet ? 1 : 0, transform: bekreftet ? 'none' : 'translateY(10px)', filter: bekreftet ? 'blur(0px)' : 'blur(6px)', transition: ov ? 'none' : `opacity 500ms ${EASE} 320ms, transform 500ms ${EASE} 320ms, filter 500ms ${EASE} 320ms`, pointerEvents: bekreftet ? 'auto' : 'none' }} aria-hidden={!bekreftet} data-testid="v4-booking-bekreftet">
          <div className="rounded-[14px] p-4" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium" style={{ color: DIM }}>Overtakelse</span>
              <Chip tekst="Bekreftet" tone="gronn" liten />
            </div>
            <p className="mt-3 text-[17px] font-medium tracking-[-0.01em]">Lørdag 1. november, kl. 12:00</p>
            <p className="mt-1 text-[13px] leading-[1.45]" style={{ color: DIM }}>{BOLIG.adresse}, {BOLIG.enhet.toLowerCase()} · Emma og Kari</p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-[12.5px]" style={{ borderColor: HAIR }}>
              <div><p style={{ color: DIM }}>Emma</p><p className="mt-0.5 font-medium">Bekreftelse på SMS</p></div>
              <div><p style={{ color: DIM }}>Kari</p><p className="mt-0.5 font-medium">Lagt i kalenderen</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Side({ fase, ov, kompakt = false }) {
  return (
    <div data-testid="v4-side">
      {SMS.map((s) => <Sms key={s.id} vis={fase >= s.fra && fase <= s.tilOg} til={s.til} tid={s.tid} tekst={s.tekst} ov={ov} delay={fase === s.fra ? 450 : 150} testid={`v4-sms-${s.id}`} className={kompakt ? 'mt-3' : 'mt-3'} />)}
    </div>
  );
}

/* Sluttbildet: Emma har nøklene */
function InnflyttetKort({ kompakt = false }) {
  return (
    <div className={`mx-auto w-full rounded-[20px] text-center ${kompakt ? 'max-w-[340px] p-5' : 'max-w-[380px] p-7'}`} style={{ background: T.charcoal, color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.08), 0 40px 90px -50px rgba(0,0,0,0.6)' }} data-testid="v4-innflyttet">
      <Portrett src={EMMA.bilde} alt={EMMA.navn} size={kompakt ? 64 : 76} className="mx-auto" />
      <p className={`${kompakt ? 'mt-3.5 text-[19px]' : 'mt-4 text-[22px]'} font-medium tracking-[-0.012em]`}>{EMMA.navn}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-[13px]" style={{ color: 'rgba(244,241,234,0.62)' }}><Nokkel size={13} />Innflyttet 1. november · {BOLIG.adresse}</p>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-left" style={{ borderColor: 'rgba(244,241,234,0.12)' }}>
        {[['Kontrakt', 'Signert · BankID'], ['Depositum', 'Garanti · Keyhole'], ['Første leie', '1. des']].map(([k, v]) => (
          <div key={k}><p className="text-[11.5px]" style={{ color: 'rgba(244,241,234,0.55)' }}>{k}</p><p className="mt-0.5 text-[13.5px] font-medium tracking-[-0.005em]">{v}</p></div>
        ))}
      </div>
    </div>
  );
}

/* ── Tekstspalten ── */
function Handling({ fase, ov, knapper, neste }) {
  const ref = (navn) => (el) => { if (knapper) knapper.current[navn] = el; };
  const lag = fase <= F.TRYKK1;
  const signer = fase >= F.KLAR2 && fase < F.DEP1;
  const prot = fase >= F.KLAR3 && fase < F.SLUTT;
  return (
    <div className="grid">
      <Inn vis={lag} ov={ov} delay={250} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.TRYKK1} hover={(fase === F.HOVER || fase === F.TRYKK1) && !!knapper} stor testid="v4-lag-kontrakt" knappRef={ref('lag')}>Lag kontrakt</AutoKnapp>
      </Inn>
      <Inn vis={signer} ov={ov} delay={200} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.TRYKK2} hover={(fase === F.KLAR2 || fase === F.TRYKK2) && !!knapper} trykket={fase >= F.SIGN1} etter="Signert med BankID" stor testid="v4-signer" knappRef={ref('signer')}>Signer med <BankIdMerke h={14} /></AutoKnapp>
      </Inn>
      <Inn vis={prot} ov={ov} delay={200} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.TRYKK3} hover={(fase === F.KLAR3 || fase === F.TRYKK3) && !!knapper} trykket={fase >= F.SIGNERT} etter="Protokoll signert" stor testid="v4-signer-protokoll" knappRef={ref('protokoll')}>Signer protokoll</AutoKnapp>
      </Inn>
      <Inn vis={fase >= F.SLUTT} ov={ov} delay={350} className="col-start-1 row-start-1"><NesteBro aktiv={fase >= F.SLUTT} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></Inn>
    </div>
  );
}

function Tekst({ fase, ov, kompakt = false }) {
  const akt = aktTekst(fase);
  return (
    <Tekstbytte id={akt.id} ov={ov}>
      {(id) => {
        const a = id === 'slutt' ? SLUTT : AKTER[Number(id)];
        return (
          <>
            <h3 className={kompakt ? 'text-[27px]' : 'text-[clamp(28px,2.4vw,40px)]'} style={{ ...display, letterSpacing: '-0.03em', lineHeight: kompakt ? 1.04 : 1.02, color: T.ink }} data-testid="v4-akt-tittel">{a.tittel}</h3>
            <p className={kompakt ? 'mt-3 text-[14.5px] leading-[1.5]' : 'mt-4 max-w-[34ch] text-[15.5px] leading-[1.5]'} style={{ color: DIM }}>{a.tekst}</p>
          </>
        );
      }}
    </Tekstbytte>
  );
}

/* ── Desktop ── */
function layout(W) {
  const TW = Math.round(Math.min(380, Math.max(300, W * 0.3)));
  const vx = P + TW + 48; const vy = P; const VW = W - vx - P; const VH = H - 2 * P;
  const smal = VW < 720;
  const SW = 300; const gap = 32;
  const dokW = smal ? VW : Math.min(580, VW - SW - gap);
  const dok = { x: vx + (smal ? 0 : Math.round((VW - dokW - SW - gap) / 2)), y: vy, w: dokW, h: VH };
  const side = smal ? { x: vx + VW - 280, w: 280, flytende: true } : { x: dok.x + dokW + gap, y: vy, w: SW, flytende: false };
  return { tekst: { x: P, y: P + 96, w: TW }, omr: { x: vx, y: vy, w: VW, h: VH }, dok, side, smal };
}

function Desktop({ fase, ov, onAkt, neste }) {
  const [ref, W] = useBredde();
  const L = W ? layout(W) : null;
  const start = fase <= F.TRYKK1;
  const papir = fase >= F.DOK && fase < F.SLUTT;
  const dempet = fase >= F.DEP1 && fase <= F.OVER0;  // depositumet (og så datoskiftet) er i fokus — papiret trer et halvt skritt tilbake
  const datoskift = fase === F.OVER0;                // «1. november» — tidsspranget før overtakelsen
  const dep = fase >= F.DEP1 && fase <= F.DEP3;      // Emmas depositumsvalg står midt i scenen
  const book = fase >= F.BOOK0 && fase <= F.BOOK2;   // … så bookingen av overtakelsen
  const slutt = fase >= F.SLUTT;
  const knapper = useRef({});
  const peker = usePeker(fase, ref, knapper, PEKER_MAAL, PRESSER);
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);

  return (
    <div ref={ref} className="relative overflow-hidden text-[#15130F]" style={{ height: H, background: PAPIR }} data-testid="v4-kontrakt-desktop">
      {L && (
        <>
          {/* Tekstspalten */}
          <div className="absolute" style={{ left: L.tekst.x, top: L.tekst.y, width: L.tekst.w, bottom: P }} data-testid="v4-tekstspalte">
            <Tekst fase={fase} ov={ov} />
            <div className="mt-7"><Handling fase={fase} ov={ov} knapper={knapper} neste={neste} /></div>
            <div className="absolute bottom-0 left-0"><Akter antall={AKTER.length} aktiv={aktIndeks(fase)} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} /></div>
          </div>

          {/* Åpningen: Emma-kortet midt i scenen — nøyaktig der Annonse slapp det */}
          <div className="absolute flex items-center justify-center" style={{ left: L.omr.x, top: L.omr.y, width: L.omr.w, height: L.omr.h, opacity: start ? 1 : 0, transform: start ? 'none' : 'translateY(-14px) scale(0.985)', transition: `opacity ${bt(start ? 600 : 320)}, transform ${bt(start ? 700 : 320)}`, pointerEvents: start ? 'auto' : 'none' }} aria-hidden={!start}>
            <ValgtKort />
          </div>

          {/* Papiret */}
          <div className="absolute" style={{ left: L.dok.x, top: L.dok.y, width: L.dok.w, height: L.dok.h, opacity: !papir ? 0 : datoskift ? 0.18 : dempet ? 0.35 : 1, transform: papir ? (dempet ? 'scale(0.985)' : 'none') : slutt ? 'translateY(-12px)' : 'translateY(18px)', transition: `opacity ${bt(papir ? 600 : 350, papir ? 250 : 0)}, transform ${bt(papir ? 800 : 350, papir ? 250 : 0)}`, pointerEvents: papir ? 'auto' : 'none' }} aria-hidden={!papir}>
            <Papir fase={fase} ov={ov} className="h-full" />
          </div>

          {/* Depositum: Emmas valg — midt i scenen, over det dempede papiret */}
          <div className="absolute z-[4] flex items-center justify-center" style={{ left: L.omr.x, top: L.omr.y, width: L.omr.w, height: L.omr.h, opacity: dep ? 1 : 0, transform: dep ? 'none' : 'translateY(14px) scale(0.985)', transition: `opacity ${bt(dep ? 600 : 300, dep ? 300 : 0)}, transform ${bt(700, dep ? 300 : 0)}`, pointerEvents: dep ? 'auto' : 'none' }} aria-hidden={!dep}>
            <DepositumValg fase={fase} ov={ov} />
          </div>
          {/* Overtakelse: Emma booker tidspunkt — samme plass, etter depositumet */}
          <div className="absolute z-[4] flex items-center justify-center" style={{ left: L.omr.x, top: L.omr.y, width: L.omr.w, height: L.omr.h, opacity: book ? 1 : 0, transform: book ? 'none' : 'translateY(14px) scale(0.985)', transition: `opacity ${bt(book ? 600 : 300, book ? 300 : 0)}, transform ${bt(700, book ? 300 : 0)}`, pointerEvents: book ? 'auto' : 'none' }} aria-hidden={!book}>
            <OvertakelseBooking fase={fase} ov={ov} />
          </div>

          {/* Tidsspranget: én stille linje midt i scenen før protokollen */}
          <div className="pointer-events-none absolute z-[4] flex items-center justify-center" style={{ left: L.omr.x, top: L.omr.y, width: L.omr.w, height: L.omr.h, opacity: datoskift ? 1 : 0, transform: datoskift ? 'none' : 'translateY(8px)', filter: datoskift ? 'blur(0px)' : 'blur(6px)', transition: `opacity ${bt(datoskift ? 600 : 300, datoskift ? 250 : 0)}, transform ${bt(700, datoskift ? 250 : 0)}, filter ${bt(600, datoskift ? 250 : 0)}` }} aria-hidden={!datoskift} data-testid="v4-datoskift">
            <div className="text-center">
              <p className="text-[13px]" style={{ color: DIM }}>To uker senere</p>
              <p className="mt-2 text-[clamp(30px,2.6vw,44px)]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>1. november, kl. 12.</p>
              <p className="mt-2 text-[14px]" style={{ color: DIM }}>Emma og Kari møtes i {BOLIG.adresse}.</p>
            </div>
          </div>

          {/* Sidespalten: depositum + SMS */}
          <div className="absolute" style={L.side.flytende ? { left: L.side.x, bottom: P, width: L.side.w, zIndex: 3 } : { left: L.side.x, top: L.side.y, width: L.side.w }}>
            <div style={{ opacity: !papir ? 0 : datoskift ? 0.2 : 1, transition: `opacity ${bt(400)}` }}><Side fase={fase} ov={ov} /></div>
          </div>

          {/* Sluttbildet */}
          <div className="absolute flex items-center justify-center" style={{ left: L.omr.x, top: L.omr.y, width: L.omr.w, height: L.omr.h, opacity: slutt ? 1 : 0, transform: slutt ? 'none' : 'translateY(16px) scale(0.985)', transition: `opacity ${bt(650, slutt ? 380 : 0)}, transform ${bt(800, slutt ? 380 : 0)}`, pointerEvents: slutt ? 'auto' : 'none' }} aria-hidden={!slutt}>
            <InnflyttetKort />
          </div>
        </>
      )}
      {!ov && <Peker pos={peker} vis={peker.vis} presser={peker.presser} hopp={peker.hopp} ring={peker.ring} />}
    </div>
  );
}

/* ── Under lg: stablet ── */
function Kompakt({ fase, ov, onAkt, neste }) {
  const start = fase <= F.TRYKK1;
  const papir = fase >= F.DOK && fase < F.SLUTT;
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-kontrakt-kompakt">
      <div className="px-5 pt-6">
        <Tekst fase={fase} ov={ov} kompakt />
        <Vokse vis={start} ov={ov}><div className="pt-5"><AutoKnapp presser={fase === F.TRYKK1} stor testid="v4-lag-kontrakt">Lag kontrakt</AutoKnapp></div></Vokse>
        <Vokse vis={fase >= F.KLAR2 && fase < F.DEP1} ov={ov}><div className="pt-5"><AutoKnapp presser={fase === F.TRYKK2} trykket={fase >= F.SIGN1} etter="Signert med BankID" stor testid="v4-signer">Signer med <BankIdMerke h={14} /></AutoKnapp></div></Vokse>
        <Vokse vis={fase >= F.KLAR3 && fase < F.SLUTT} ov={ov}><div className="pt-5"><AutoKnapp presser={fase === F.TRYKK3} trykket={fase >= F.SIGNERT} etter="Protokoll signert" stor testid="v4-signer-protokoll">Signer protokoll</AutoKnapp></div></Vokse>
        <Vokse vis={fase >= F.SLUTT && !!neste} ov={ov}><div className="pt-5"><NesteBro aktiv={fase >= F.SLUTT} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></div></Vokse>
      </div>
      <div className="px-5 pt-6">
        <Vokse vis={start} ov={ov}><ValgtKort kompakt /></Vokse>
        <Vokse vis={papir && !(fase >= F.DEP1 && fase <= F.BOOK2)} ov={ov}><Papir fase={fase} ov={ov} kompakt /></Vokse>
        <Vokse vis={fase >= F.DEP1 && fase <= F.DEP3} ov={ov}><DepositumValg fase={fase} ov={ov} kompakt /></Vokse>
        <Vokse vis={fase >= F.BOOK0 && fase <= F.BOOK2} ov={ov}><OvertakelseBooking fase={fase} ov={ov} kompakt /></Vokse>
        <Vokse vis={papir} ov={ov}><Side fase={fase} ov={ov} kompakt /></Vokse>
        <Vokse vis={fase >= F.SLUTT} ov={ov}><div className="py-2"><InnflyttetKort kompakt /></div></Vokse>
      </div>
      <div className="px-5 pb-4 pt-4"><Akter antall={AKTER.length} aktiv={aktIndeks(fase)} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} /></div>
    </div>
  );
}

export default function KontraktFilm({ synlig, spiller = synlig, tema = 'mork', onFerdig, onFremdrift, neste = null, full = false, staaende = false, naken = false }) {
  const { fase, ov, morkt, bred, hopp } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.SIGN2, onFerdig, onFremdrift });
  const tilAkt = (i) => hopp(AKTER[i].fra);
  const felles = { fase, ov, onAkt: tilAkt, neste };
  return (
    <Ramme synlig={synlig} tema={tema} ov={ov} morkt={morkt} bred={staaende ? false : bred} naken={naken} fase={fase} testid="v4-kontrakt-scene" full={full} desktop={<Desktop {...felles} />} kompakt={<Kompakt {...felles} />} />
  );
}
