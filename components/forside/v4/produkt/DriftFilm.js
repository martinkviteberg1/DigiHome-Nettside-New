'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall } from '../motion';
import { PAPIR, HVIT, HAIR, DIM, OFF, H, P, MORF, Hake, Portrett, Inn, Vokse, Chip, AutoKnapp, Peker, usePeker, Tekstbytte, Akter, NesteBro, BOLIG, EMMA, KARI, useBredde, useFilm, Ramme } from './filmdeler';

/* ---------------------------------------------------------------------------
   DriftFilm — kapittel 3. «Fra melding til løst. Du trykker én gang.»

   Scenen er bygården i Nygårdsgaten 5 om natten — samme fasade som Annonse
   åpner med, nå med ett vindu tent: Leilighet 2, der Emma bor. Alt som skjer,
   skjer rundt det vinduet. Nålen på vinduet er den samme som i åpningen
   («Leilighet 2 · Ledig fra 1. november») — her leser den «Leilighet 2 · Emma»
   og til slutt «Løst · torsdag 09:58».

   Ett kort vokser ut fra vinduet: først Emmas melding (med bilde), så blir
   samme kort saken slik Kari ser den — forløpet fylles rad for rad. Kari gjør
   én ting: trykker Godkjenn. Så blir det morgen: bildet tones fra natt til
   dag, teksten fra offwhite til blekk, og et kort, lyst kort kvitterer:
   utført, bekreftet, fakturert.

   Akter: Emma melder fra · Meldingen blir en sak · Rørleggeren får saken ·
   Du godkjenner. Én gang. · Emma får beskjed · Torsdag: utført og dokumentert ·
   Slutt: «Løst. Du ringte ingen.»
--------------------------------------------------------------------------- */

const F = {
  START: 0, MELD: 1, SPM: 2, SVAR: 3,
  SAK: 4, DETALJ: 5,
  LEV0: 6, LEV1: 7,
  KLAR: 8, TRYKK: 9, GODKJENT: 10,
  SMS: 11, NATT: 12,
  TID: 13, UTFORT: 14, TAKK: 15, FAKTURA: 16,
  SLUTT: 17,
};
const AUTO = {
  [F.START]: 1700, [F.MELD]: 2300, [F.SPM]: 1500, [F.SVAR]: 1300,
  [F.SAK]: 1600, [F.DETALJ]: 1400,
  [F.LEV0]: 1500, [F.LEV1]: 2300,
  [F.KLAR]: 1700, [F.TRYKK]: 380, [F.GODKJENT]: 2100,
  [F.SMS]: 2200, [F.NATT]: 1000,
  [F.TID]: 2200, [F.UTFORT]: 2100, [F.TAKK]: 1800, [F.FAKTURA]: 2100,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;
const PEKER_MAAL = { [F.KLAR]: 'godkjenn', [F.TRYKK]: 'godkjenn' };
const PRESSER = new Set([F.TRYKK]);

const AKTER = [
  { fra: F.START, tittel: 'Emma melder fra.', tekst: '22:41. Leietakeren skriver i DigiHome og legger ved et bilde. Ett oppfølgingsspørsmål avgrenser feilen — før noen rekker å ringe deg.' },
  { fra: F.SAK, tittel: 'Meldingen blir en sak.', tekst: 'Bolig, leietaker, kategori og hastegrad settes fra samtalen. Du får en ferdig sortert sak — ikke en melding du må tolke.' },
  { fra: F.LEV0, tittel: 'Rørleggeren får saken.', tekst: 'Rørleggeren du bruker får bildet og beskrivelsen direkte — og svarer med tidsvindu og pris, rett i saken.' },
  { fra: F.KLAR, tittel: 'Du godkjenner. Én gang.', tekst: 'Hvem, når og hva det koster står på ett sted. Ett trykk — så går resten av seg selv.' },
  { fra: F.SMS, tittel: 'Emma får beskjed.', tekst: 'Tidspunktet går til Emma automatisk. Hun bekrefter, og rørleggeren vet at han slipper inn torsdag morgen.' },
  { fra: F.TID, tittel: 'Torsdag: utført og dokumentert.', tekst: 'Rørleggeren kvitterer med bilde. Emma bekrefter at vannet er varmt. Fakturaen legger seg i saken — og i regnskapet.' },
];
const SLUTT = { tittel: 'Løst. Du ringte ingen.', tekst: 'Én melding, ett trykk. Saken ligger i historikken med bilder, pris og faktura — klar for regnskapet.' };
const aktIndeks = (f) => { let i = 0; AKTER.forEach((a, k) => { if (f >= a.fra) i = k; }); return i; };
const varighet = (i) => { const fra = AKTER[i].fra; const til = i + 1 < AKTER.length ? AKTER[i + 1].fra : SISTE + 1; let sum = 0; for (let f = fra; f < til; f += 1) sum += AUTO[f] || 0; return sum; };
const aktTekst = (fase) => (fase >= F.SLUTT ? { id: 'slutt', ...SLUTT } : { id: String(aktIndeks(fase)), ...AKTER[aktIndeks(fase)] });

const JONAS = { navn: 'Jonas', rolle: 'rørlegger', bilde: '/v4/jonas.webp' };
const PRIS = 3900;
const BEREDER = '/v4/bereder-3x4.webp';

/* Scenen: bygården natt og morgen (laget fra Annonse-filmens fasade med scripts/generer-variant.py natt|morgen).
   Vinduet til Leilighet 2 ligger på 75,5 % / 57 % av bildet; bildet dekker rammen med object-position 56 % 46 %. */
const NATT = { src: '/v4/drift/fasade-natt-1920.webp', liten: '/v4/drift/fasade-natt-1200.webp' };
const MORGEN = { src: '/v4/drift/fasade-morgen-1920.webp', liten: '/v4/drift/fasade-morgen-1200.webp' };
const BILDE = { w: 1920, h: 1097, vx: 0.755, vy: 0.57, posX: 0.56, posY: 0.46 };
const POS = `${BILDE.posX * 100}% ${BILDE.posY * 100}%`;
/* Hvor vinduet havner (px) når bildet dekker en flate på W×H */
function vindu(W, Hh) {
  const s = Math.max(W / BILDE.w, Hh / BILDE.h);
  const dw = BILDE.w * s; const dh = BILDE.h * s;
  const ox = (W - dw) * BILDE.posX; const oy = (Hh - dh) * BILDE.posY;
  return { x: Math.round(ox + BILDE.vx * dw), y: Math.round(oy + BILDE.vy * dh) };
}

const erMorgen = (fase) => fase >= F.TID;

/* Nålens tekst gjennom filmen — vinduet «snakker» når Emma svarer */
function naalTekst(fase) {
  if (fase >= F.SLUTT) return { t: 'Løst · torsdag 09:58', tone: 'gronn' };
  if (fase >= F.TAKK) return { t: 'Emma: «Varmt vann igjen. Takk!»', tone: 'emma' };
  if (fase >= F.TID) return { t: 'Leilighet 2', tone: 'lilla' };
  if (fase >= F.SMS) return { t: 'Emma: «Passer fint.»', tone: 'emma' };
  return { t: 'Leilighet 2 · Emma', tone: 'lilla' };
}

/* Natt-scrim: mørk, varm tone fra venstre der teksten står, og en rolig bunn. Morgen-scrim: lys fra venstre. */
const SCRIM_NATT = 'linear-gradient(90deg, rgba(21,19,15,0.90) 0%, rgba(21,19,15,0.78) 24%, rgba(21,19,15,0.34) 44%, rgba(21,19,15,0) 60%), linear-gradient(180deg, rgba(21,19,15,0) 62%, rgba(21,19,15,0.42) 100%)';
const SCRIM_MORGEN = 'linear-gradient(90deg, rgba(251,250,248,0.95) 0%, rgba(251,250,248,0.88) 24%, rgba(251,250,248,0.42) 44%, rgba(251,250,248,0) 60%), linear-gradient(180deg, rgba(251,250,248,0) 70%, rgba(251,250,248,0.30) 100%)';

/* ── Nålen på vinduet ── */
function Naal({ fase, ov, vis, liten = false }) {
  const { t, tone } = naalTekst(fase);
  const inn = vis;
  const [ring, setRing] = useState(0);
  /* Ringen puster når meldingen går fra eller til vinduet */
  useEffect(() => { if (fase === F.MELD || fase === F.SMS || fase === F.TAKK || fase === F.SLUTT) setRing((r) => r + 1); }, [fase]);
  const d = fase === F.START ? 800 : 0;
  const dot = tone === 'gronn' ? T.gronn : T.lilla;
  return (
    <div className="pointer-events-none absolute" style={{ left: 0, top: 0 }} data-testid="v4-naal" data-tekst={t}>
      {/* Etiketten — over punktet, midtstilt */}
      <span className={`absolute whitespace-nowrap rounded-full font-medium ${liten ? 'px-2.5 py-1 text-[11.5px]' : 'px-3 py-1.5 text-[12.5px]'}`} style={{ left: 0, bottom: 14, transform: `translate(-50%, ${inn ? 0 : 8}px)`, opacity: inn ? 1 : 0, background: 'rgba(251,250,248,0.94)', color: T.ink, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), 0 10px 30px -12px rgba(0,0,0,0.6)', transition: ov ? 'none' : `opacity 700ms ${EASE} ${inn ? d + 320 : 0}ms, transform 900ms ${EASE} ${inn ? d + 320 : 0}ms`, willChange: 'transform, opacity' }}>
        <span key={t} className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-500">
          {tone === 'emma' ? <Portrett src={EMMA.bilde} alt="" size={16} /> : tone === 'gronn' ? <span style={{ color: '#166B3C' }}><Hake size={12} /></span> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />}
          {t}
        </span>
      </span>
      {/* Punktet */}
      <span key={inn ? 'inn' : 'ut'} className="absolute block h-3 w-3 rounded-full" style={{ left: -6, top: -6, background: dot, boxShadow: '0 0 0 2.5px rgba(251,250,248,0.96), 0 2px 10px rgba(0,0,0,0.45)', opacity: inn ? 1 : 0, transform: inn ? 'scale(1)' : 'scale(0.3)', transition: ov ? 'none' : `opacity 300ms ${EASE} ${inn ? d : 0}ms, transform 760ms cubic-bezier(0.16, 1, 0.3, 1) ${inn ? d : 0}ms, background-color 600ms ${EASE}` }}>
        {ring > 0 && !ov && inn && <span key={ring} aria-hidden="true" className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 1.5px rgba(251,250,248,0.9)', animation: 'v4-ping 1400ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards', opacity: 0 }} />}
      </span>
    </div>
  );
}

/* ── Rader i forløpet ── */
function Rad({ h, fase, ov, delay = 0 }) {
  const vis = fase >= h.p;
  const klar = h.vp == null || fase >= h.vp;   // «Venter på deg» → godkjent
  return (
    <Vokse vis={vis} ov={ov} delay={fase === h.p ? 220 + delay : 100}>
      <div className="flex items-center gap-3 border-t py-2" style={{ borderColor: HAIR }} data-testid={`v4-rad-${h.id}`} data-klar={h.vp != null ? (klar ? '1' : '0') : undefined}>
        {h.portrett && <Portrett src={h.portrett} alt="" size={28} />}
        {h.hake && <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.14)', color: '#166B3C' }}><Hake size={13} /></span>}
        {h.merke && <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.22)' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /></span>}
        <span className="min-w-0 flex-1">
          <span className="grid">
            <span className="col-start-1 row-start-1 flex items-center gap-1.5 truncate text-[13.5px] font-medium" style={{ opacity: klar ? 1 : 0, transition: ov ? 'none' : `opacity 320ms ${EASE} 220ms` }}>{h.vp != null && <span style={{ color: '#166B3C' }}><Hake size={12} /></span>}{h.t}</span>
            {h.vp != null && (
              <span className="col-start-1 row-start-1 flex items-center gap-2 text-[13.5px] font-medium" style={{ opacity: klar ? 0 : 1, transition: ov ? 'none' : `opacity 200ms ${EASE}` }} aria-hidden={klar}>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }}>{!ov && <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 1px ${T.lilla}`, animation: 'v4-ping 1300ms cubic-bezier(0.2, 0.6, 0.2, 1) infinite', opacity: 0 }} />}</span>
                {h.venter}
              </span>
            )}
          </span>
          <span className="grid">
            <span className="col-start-1 row-start-1 block truncate text-[12px]" style={{ color: DIM, opacity: klar ? 1 : 0, transition: ov ? 'none' : `opacity 320ms ${EASE} 260ms` }}>{h.u}</span>
            {h.vp != null && <span className="col-start-1 row-start-1 block truncate text-[12px]" style={{ color: DIM, opacity: klar ? 0 : 1, transition: ov ? 'none' : `opacity 200ms ${EASE}` }} aria-hidden={klar}>{h.venterU}</span>}
          </span>
        </span>
        {h.bilde && (
          <span className="relative shrink-0 overflow-hidden rounded-[7px]" style={{ width: 30, height: 40, boxShadow: `0 0 0 1px ${HAIR}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.bilde} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          </span>
        )}
        <span className="shrink-0 text-[12px] tabular-nums" style={{ color: DIM, opacity: klar ? 1 : 0.45, transition: ov ? 'none' : `opacity 300ms ${EASE}` }}>{klar ? h.tid : 'nå'}</span>
      </div>
    </Vokse>
  );
}

const FORLOP = [
  { id: 'meldt', p: F.SAK, tid: '22:41', t: 'Emma meldte fra', u: '«Varmtvannet er helt borte. Har prøvd å slå berederen av og på.»', portrett: EMMA.bilde, bilde: BEREDER },
  { id: 'avklart', p: F.SAK, tid: '22:42', t: 'Avklart: bare varmtvannet', u: 'Radiatorene virker — feilen ligger i berederen', merke: true },
  { id: 'sendt', p: F.LEV0, tid: '22:43', t: 'Forespørsel sendt til rørlegger', u: 'Med bilde og beskrivelse fra chatten', portrett: JONAS.bilde },
  { id: 'svar', p: F.LEV1, tid: '22:49', t: `${JONAS.navn} svarte: torsdag 08–10`, u: `ca. ${tall(PRIS)} kr inkl. mva`, portrett: JONAS.bilde },
  { id: 'godkjent', p: F.LEV1, tid: '22:52', t: 'Godkjent av Kari', u: 'Rørlegger bestilt · Emma får beskjed', venter: 'Venter på deg', venterU: `Torsdag 08–10 · ca. ${tall(PRIS)} kr`, vp: F.GODKJENT, portrett: KARI.bilde },
  { id: 'bekreftet', p: F.SMS, tid: '22:54', t: 'Emma bekreftet tidspunktet', u: 'Rørleggeren slipper inn torsdag 08–10', portrett: EMMA.bilde },
];
const MORGEN_RADER = [
  { id: 'utfort', p: F.UTFORT, tid: '09:40', t: 'Bereder byttet', u: `${JONAS.navn} kvitterte med bilde`, bilde: BEREDER, portrett: JONAS.bilde },
  { id: 'takk', p: F.TAKK, tid: '09:58', t: '«Varmt vann igjen. Takk!»', u: 'Emma bekreftet', portrett: EMMA.bilde },
  { id: 'faktura', p: F.FAKTURA, tid: '10:12', t: `Faktura ${tall(PRIS)} kr`, u: 'Lagt i saken — og i Økonomi', hake: true },
];
const DETALJER = [
  { id: 'emma', t: EMMA.navn, p: F.SAK, portrett: EMMA.bilde },
  { id: 'enhet', t: `${BOLIG.enhet} · 2. etasje`, p: F.SAK },
  { id: 'kategori', t: 'VVS · varmtvannsbereder', p: F.DETALJ },
  { id: 'haster', t: 'Haster', p: F.DETALJ, tone: 'lilla' },
];

function statusFor(fase) {
  if (fase >= F.GODKJENT) return ['Bestilt · torsdag 08–10', 'lilla'];
  if (fase >= F.LEV1) return ['Tilbud mottatt', 'lilla'];
  if (fase >= F.LEV0) return ['Venter på rørlegger', 'noytral'];
  if (fase >= F.DETALJ) return ['Åpen · haster', 'lilla'];
  return null;
}

/* Kortstilen — lyst kort som står på det mørke bildet */
const KORT = { background: 'rgba(251,250,248,0.97)', boxShadow: '0 0 0 1px rgba(255,255,255,0.45), 0 50px 100px -40px rgba(0,0,0,0.75), 0 18px 40px -24px rgba(0,0,0,0.5)' };

/* ── Nattkortet: Emmas melding → saken ── */
function SakKort({ fase, ov, kompakt = false }) {
  const sak = fase >= F.SAK;
  const st = statusFor(fase);
  return (
    <div className={`overflow-hidden rounded-[18px] ${kompakt ? 'p-4' : 'p-5'}`} style={KORT} data-testid="v4-sakkort" data-modus={sak ? 'sak' : 'melding'} data-status={st ? st[0] : ''}>
      {/* Meldingen */}
      <Vokse vis={!sak} ov={ov} delay={200}>
        <div data-testid="v4-melding">
          <div className="flex items-center gap-2.5">
            <Portrett src={EMMA.bilde} alt={EMMA.navn} size={30} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{EMMA.navn}</span><span className="block text-[11.5px]" style={{ color: DIM }}>{BOLIG.enhet} · til DigiHome</span></span>
            <span className="text-[12px] tabular-nums" style={{ color: DIM }}>22:41</span>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <p className="min-w-0 flex-1 text-[14px] leading-[1.45]">«Varmtvannet er helt borte. Har prøvd å slå berederen av og på.»</p>
            <span className="relative shrink-0 overflow-hidden rounded-[10px]" style={{ width: kompakt ? 64 : 76, height: kompakt ? 84 : 100, boxShadow: `0 0 0 1px ${HAIR}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BEREDER} alt="Varmtvannsberederen" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            </span>
          </div>
          {/* Ett avgrensende spørsmål — og svaret */}
          <Vokse vis={fase >= F.SPM} ov={ov} delay={200}>
            <div className="mt-3 flex items-start gap-2.5 border-t pt-3 text-[13px]" style={{ borderColor: HAIR }} data-testid="v4-spm">
              <span className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.22)' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /></span>
              <span className="min-w-0 flex-1"><span className="text-[11.5px]" style={{ color: DIM }}>DigiHome · 22:41</span><span className="block">Er radiatorene også kalde — eller er det bare vannet?</span></span>
            </div>
          </Vokse>
          <Vokse vis={fase >= F.SVAR} ov={ov} delay={200}>
            <div className="mt-2.5 flex items-start gap-2.5 text-[13px]" data-testid="v4-svar">
              <Portrett src={EMMA.bilde} alt="" size={16} className="mt-[3px]" />
              <span className="min-w-0 flex-1"><span className="text-[11.5px]" style={{ color: DIM }}>Emma · 22:42</span><span className="block font-medium">Bare vannet.</span></span>
            </div>
          </Vokse>
        </div>
      </Vokse>

      {/* Saken */}
      <Vokse vis={sak} ov={ov} delay={260}>
        <div data-testid="v4-sak">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12px]" style={{ color: DIM }}>Sak · {BOLIG.adresse}, {BOLIG.enhet.toLowerCase()} · fra chatten 22:41</p>
              <h4 className={`${kompakt ? 'mt-1 text-[23px]' : 'mt-1 text-[26px]'}`} style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Ingen varmtvann</h4>
            </div>
            <span className="mt-0.5 shrink-0" style={{ opacity: st ? 1 : 0, transform: st ? 'none' : 'translateY(4px)', transition: ov ? 'none' : `opacity 400ms ${EASE}, transform 400ms ${EASE}` }} aria-hidden={!st}>
              {st && <Chip tekst={st[0]} tone={st[1]} liten />}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" data-testid="v4-detaljer">
            {DETALJER.map((d) => {
              const vis = fase >= d.p; const nr = DETALJER.filter((x) => x.p === d.p).indexOf(d); const lilla = d.tone === 'lilla';
              return (
                <span key={d.id} className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-[12.5px] font-medium" style={{ background: lilla ? 'rgba(212,150,255,0.22)' : 'rgba(21,19,15,0.06)', color: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: ov ? 'none' : `opacity 420ms ${EASE} ${vis ? 300 + nr * 160 : 0}ms, transform 420ms ${EASE} ${vis ? 300 + nr * 160 : 0}ms` }} aria-hidden={!vis}>
                  {d.portrett ? <Portrett src={d.portrett} alt="" size={18} /> : <span className="ml-0.5 h-1.5 w-1.5 rounded-full" style={{ background: lilla ? T.lilla : 'rgba(21,19,15,0.35)' }} />}
                  {d.t}
                </span>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] font-medium text-[#15130F]/60">Forløp</p>
          <div className="mt-1">
            {FORLOP.map((h, i) => <Rad key={h.id} h={h} fase={fase} ov={ov} delay={h.p === F.SAK ? 200 + i * 140 : 0} />)}
          </div>
        </div>
      </Vokse>
    </div>
  );
}

/* ── Morgenkortet: utført, bekreftet, fakturert ── */
function MorgenKort({ fase, ov, kompakt = false }) {
  const lost = fase >= F.FAKTURA;
  return (
    <div className={`overflow-hidden rounded-[18px] ${kompakt ? 'p-4' : 'p-5'}`} style={KORT} data-testid="v4-morgenkort" data-lost={lost ? '1' : '0'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px]" style={{ color: DIM }}>Torsdag · {BOLIG.adresse}, {BOLIG.enhet.toLowerCase()}</p>
          <h4 className={`${kompakt ? 'mt-1 text-[23px]' : 'mt-1 text-[26px]'}`} style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Ingen varmtvann</h4>
        </div>
        <span className="mt-0.5 shrink-0"><Chip key={lost ? 'l' : 'u'} tekst={lost ? 'Løst' : 'Utført'} tone="gronn" liten /></span>
      </div>
      <div className="mt-3">
        {MORGEN_RADER.map((h) => <Rad key={h.id} h={h} fase={fase} ov={ov} />)}
      </div>
    </div>
  );
}

/* ── Tekstspalten ── */
function Handling({ fase, ov, knapper, neste, morkt }) {
  const ref = (navn) => (el) => { if (knapper) knapper.current[navn] = el; };
  const godkjenn = fase >= F.KLAR && fase < F.SMS;
  return (
    <div className="grid">
      <Inn vis={godkjenn} ov={ov} delay={200} className="col-start-1 row-start-1">
        <AutoKnapp presser={fase === F.TRYKK} hover={(fase === F.KLAR || fase === F.TRYKK) && !!knapper} trykket={fase >= F.GODKJENT} etter="Godkjent · rørlegger bestilt" stor morkt={morkt} testid="v4-godkjenn" knappRef={ref('godkjenn')}>Godkjenn · {tall(PRIS)} kr</AutoKnapp>
      </Inn>
      <Inn vis={fase >= F.SLUTT && !!neste} ov={ov} delay={350} className="col-start-1 row-start-1"><NesteBro aktiv={fase >= F.SLUTT} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></Inn>
    </div>
  );
}

function Tekst({ fase, ov, kompakt = false, farge, dempet }) {
  const akt = aktTekst(fase);
  return (
    <Tekstbytte id={akt.id} ov={ov}>
      {(id) => {
        const a = id === 'slutt' ? SLUTT : AKTER[Number(id)];
        return (
          <>
            <h3 className={kompakt ? 'text-[27px]' : 'text-[clamp(28px,2.4vw,40px)]'} style={{ ...display, letterSpacing: '-0.03em', lineHeight: kompakt ? 1.04 : 1.02, color: farge, transition: ov ? 'none' : `color 1200ms ${EASE}` }} data-testid="v4-akt-tittel">{a.tittel}</h3>
            <p className={kompakt ? 'mt-3 text-[14.5px] leading-[1.5]' : 'mt-4 max-w-[34ch] text-[15.5px] leading-[1.5]'} style={{ color: dempet, transition: ov ? 'none' : `color 1200ms ${EASE}` }}>{a.tekst}</p>
          </>
        );
      }}
    </Tekstbytte>
  );
}

/* ── Desktop ── */
function layout(W) {
  const TW = Math.round(Math.min(380, Math.max(300, W * 0.3)));
  const v = vindu(W, H);
  const venstre = P + TW + 36;                          // der kortet tidligst kan begynne
  const hoyre = v.x - 26;                               // kortets høyre kant — rett ved nålen
  const kw = Math.max(280, Math.min(400, hoyre - venstre));
  return { tekst: { x: P, y: P + 96, w: TW }, v, kort: { x: hoyre - kw, y: 56, w: kw }, omr: { x: venstre, y: P, w: W - venstre - P, h: H - 2 * P } };
}

function Desktop({ fase, ov, onAkt, neste, startet }) {
  const [ref, W] = useBredde();
  const L = W ? layout(W) : null;
  const morgen = erMorgen(fase);
  const slutt = fase >= F.SLUTT;
  const nattKort = fase >= F.MELD && fase < F.TID;
  const morgenKort = fase >= F.UTFORT && fase < F.SLUTT;
  const tid = fase === F.TID;
  const knapper = useRef({});
  const peker = usePeker(fase, ref, knapper, PEKER_MAAL, PRESSER);
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);

  /* Kameraet: står litt inne på vinduet og slipper rolig ut mens Emma skriver; skyver svakt inn igjen når det blir morgen.
     Transform-origin er vinduet, så nålen står stille. Før filmen spiller: hviler. */
  const [inne, setInne] = useState(false);
  useEffect(() => {
    if (fase !== F.START) return undefined;
    setInne(false);
    if (!startet) return undefined;
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setInne(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [fase, startet]);
  const k = ov ? 1 : morgen ? 1.03 : inne ? 1 : 1.06;
  const kamT = ov ? 'none' : morgen ? `transform 6000ms ${MORF}` : `transform 7000ms cubic-bezier(0.25, 0.6, 0.3, 1)`;

  const farge = morgen ? T.ink : OFF;
  const dempet = morgen ? DIM : 'rgba(244,241,234,0.70)';

  return (
    <div ref={ref} className="relative overflow-hidden" style={{ height: H, background: '#15130F' }} data-testid="v4-drift-desktop" data-morgen={morgen ? '1' : '0'}>
      {L && (
        <>
          {/* Scenen: bygården — natt, så morgen. Nålen ligger i kameraet på vinduet og motskaleres. */}
          <div className="absolute inset-0" style={{ transform: `scale(${k})`, transformOrigin: `${L.v.x}px ${L.v.y}px`, transition: kamT, willChange: 'transform' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NATT.src} alt="Nygårdsgaten 5 om natten — ett vindu er tent" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS }} draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MORGEN.src} alt="Nygårdsgaten 5 om morgenen" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS, opacity: morgen ? 1 : 0, transition: ov ? 'none' : `opacity 1800ms ${EASE}` }} draggable={false} data-testid="v4-morgenbilde" />
            <div className="absolute" style={{ left: L.v.x, top: L.v.y, transform: `scale(${1 / k})`, transformOrigin: '0 0', transition: kamT }}>
              <Naal fase={fase} ov={ov} vis={fase !== F.START || inne} />
            </div>
          </div>

          {/* Scrim — natt og morgen */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: SCRIM_NATT, opacity: morgen ? 0 : 1, transition: ov ? 'none' : `opacity 1400ms ${EASE}` }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: SCRIM_MORGEN, opacity: morgen ? 1 : 0, transition: ov ? 'none' : `opacity 1400ms ${EASE} 300ms` }} />

          {/* Tekstspalten */}
          <div className="absolute z-[5]" style={{ left: L.tekst.x, top: L.tekst.y, width: L.tekst.w, bottom: P, color: farge }} data-testid="v4-tekstspalte">
            <Tekst fase={fase} ov={ov} farge={farge} dempet={dempet} />
            <div className="mt-7"><Handling fase={fase} ov={ov} knapper={knapper} neste={neste} morkt={!morgen} /></div>
            <div className="absolute bottom-0 left-0"><Akter antall={AKTER.length} aktiv={aktIndeks(fase)} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} morkt={!morgen} /></div>
          </div>

          {/* Kortet — vokser ut fra vinduet (origo mot nålen). Natt: melding → sak. Morgen: kvitteringen. */}
          <div className="absolute z-[4]" style={{ left: L.kort.x, top: L.kort.y, width: L.kort.w, transformOrigin: '100% 30%', opacity: nattKort ? 1 : 0, transform: nattKort ? 'translateX(0px) scale(1)' : fase < F.MELD ? 'translateX(14px) scale(0.94)' : 'translateY(-10px) scale(0.985)', transition: ov ? 'none' : nattKort ? `opacity 600ms ${EASE} 120ms, transform 900ms ${MORF} 120ms` : `opacity 450ms ${EASE}, transform 450ms ${EASE}`, pointerEvents: nattKort ? 'auto' : 'none', willChange: 'transform, opacity' }} aria-hidden={!nattKort}>
            <SakKort fase={fase} ov={ov} />
          </div>
          <div className="absolute z-[4]" style={{ left: L.kort.x, top: L.kort.y, width: L.kort.w, transformOrigin: '100% 30%', opacity: morgenKort ? 1 : 0, transform: morgenKort ? 'translateX(0px) scale(1)' : slutt ? 'translateY(-10px) scale(0.985)' : 'translateX(14px) scale(0.94)', transition: ov ? 'none' : morgenKort ? `opacity 600ms ${EASE} 150ms, transform 900ms ${MORF} 150ms` : `opacity 500ms ${EASE}, transform 500ms ${EASE}`, pointerEvents: morgenKort ? 'auto' : 'none', willChange: 'transform, opacity' }} aria-hidden={!morgenKort}>
            <MorgenKort fase={fase} ov={ov} />
          </div>

          {/* Tidsspranget — én linje i scenen mens natten blir morgen */}
          <div className="pointer-events-none absolute z-[4] flex items-center justify-center" style={{ left: L.omr.x, top: L.omr.y, width: L.omr.w, height: L.omr.h, opacity: tid ? 1 : 0, transform: tid ? 'none' : 'translateY(8px)', transition: `opacity ${bt(tid ? 700 : 350, tid ? 500 : 0)}, transform ${bt(900, tid ? 500 : 0)}`, color: T.ink }} aria-hidden={!tid} data-testid="v4-tidssprang">
            <div className="text-center">
              <p className="text-[13px]" style={{ color: DIM }}>To dager senere</p>
              <p className="mt-2 text-[clamp(30px,2.6vw,44px)]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>Torsdag, kl. 09:40.</p>
            </div>
          </div>
        </>
      )}
      {!ov && <Peker pos={peker} vis={peker.vis} presser={peker.presser} hopp={peker.hopp} ring={peker.ring} />}
    </div>
  );
}

/* ── Under lg: stablet. Bildet med nålen øverst, kortet under. ── */
function BildeKompakt({ fase, ov }) {
  const [ref, W] = useBredde();
  const morgen = erMorgen(fase);
  const Hh = W ? Math.round(W * 0.64) : 0;
  const v = W ? vindu(W, Hh) : { x: 0, y: 0 };
  return (
    <div ref={ref} className="relative overflow-hidden rounded-[14px]" style={{ aspectRatio: '100 / 64', background: '#15130F' }} data-testid="v4-bilde-kompakt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={NATT.liten} alt="Nygårdsgaten 5 om natten" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS }} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MORGEN.liten} alt="Nygårdsgaten 5 om morgenen" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS, opacity: morgen ? 1 : 0, transition: ov ? 'none' : `opacity 1800ms ${EASE}` }} draggable={false} />
      {W > 0 && <div className="absolute" style={{ left: v.x, top: v.y }}><Naal fase={fase} ov={ov} vis liten /></div>}
    </div>
  );
}

function Kompakt({ fase, ov, onAkt, neste }) {
  const slutt = fase >= F.SLUTT;
  const nattKort = fase >= F.MELD && fase < F.TID;
  const morgenKort = fase >= F.UTFORT && fase < F.SLUTT;
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-drift-kompakt">
      <div className="px-5 pt-6">
        <Tekst fase={fase} ov={ov} kompakt farge={T.ink} dempet={DIM} />
        <Vokse vis={fase >= F.KLAR && fase < F.SMS} ov={ov}><div className="pt-5"><AutoKnapp presser={fase === F.TRYKK} trykket={fase >= F.GODKJENT} etter="Godkjent · rørlegger bestilt" stor testid="v4-godkjenn">Godkjenn · {tall(PRIS)} kr</AutoKnapp></div></Vokse>
        <Vokse vis={slutt && !!neste} ov={ov}><div className="pt-5"><NesteBro aktiv={slutt} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></div></Vokse>
      </div>
      <div className="px-5 pt-6">
        <BildeKompakt fase={fase} ov={ov} />
        <Vokse vis={nattKort} ov={ov}><div className="pt-3"><SakKort fase={fase} ov={ov} kompakt /></div></Vokse>
        <Vokse vis={fase === F.TID} ov={ov}>
          <div className="pt-6 text-center">
            <p className="text-[13px]" style={{ color: DIM }}>To dager senere</p>
            <p className="mt-1.5 text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>Torsdag, kl. 09:40.</p>
          </div>
        </Vokse>
        <Vokse vis={morgenKort} ov={ov}><div className="pt-3"><MorgenKort fase={fase} ov={ov} kompakt /></div></Vokse>
      </div>
      <div className="px-5 pb-4 pt-4"><Akter antall={AKTER.length} aktiv={aktIndeks(fase)} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} /></div>
    </div>
  );
}

export default function DriftFilm({ synlig, spiller = synlig, tema = 'mork', onFerdig, onFremdrift, neste = null }) {
  const { fase, ov, morkt, bred, hopp } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.GODKJENT, onFerdig, onFremdrift });
  const [startet, setStartet] = useState(false);
  useEffect(() => { if (spiller && !startet) setStartet(true); }, [spiller, startet]);
  const tilAkt = (i) => { setStartet(true); hopp(AKTER[i].fra); };
  const felles = { fase, ov, onAkt: tilAkt, neste };
  return (
    <Ramme synlig={synlig} tema={tema} ov={ov} morkt={morkt} bred={bred} fase={fase} testid="v4-drift-scene" desktop={<Desktop {...felles} startet={startet} />} kompakt={<Kompakt {...felles} />} />
  );
}
