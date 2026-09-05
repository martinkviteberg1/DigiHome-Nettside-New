'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   BoligScene — «ett år med boligen på autopilot». Privatsidens hero-scene.

   Forsiden viser én dag. Her er tidsskalaen ett helt leieår — fordi det
   spørsmålet en privat huseier egentlig har er: «hvor mye jobb blir dette
   for meg over tid?» Svaret er scenen: tolv måneder tikker forbi, husleien
   kommer inn, og du gjorde tre ting.

   Lag 0  Papirflate. Ett objekt.
   Lag 1  Året som en rad av tolv måneder (grønn = husleie inn, lilla = deg)
          + en typografisk ledger med det som faktisk skjedde.
   Lag 2  Ett godkjenningskort i charcoal som bryter ut av høyre kant når
          året stopper i november: varmtvannet. Så fortsetter året.

   Tilstandsmaskin: inn → m1 (kontrakt, du signerte) → m2..m4 (varmtvann) →
   sak → lev → krev → KORT (venter) → godkjent → m5..m11 (Emma sier opp,
   ny leietaker — du valgte) → m12 → ferdig. Ubesøkt scene: eier godkjenner
   etter 5 s så historien alltid fullføres. Har du vært inne, venter den.

   `eiendom` (fra adressefeltet) bytter adresse og spiller fra frame 1.
--------------------------------------------------------------------------- */

const MND = ['aug', 'sep', 'okt', 'nov', 'des', 'jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul'];

const FASER = [
  { navn: 'inn', ms: 700 },
  { navn: 'm1', ms: 760 },     // aug — kontrakt signert (du)
  { navn: 'm2', ms: 340 },     // sep — første husleie
  { navn: 'm3', ms: 300 },     // okt
  { navn: 'm4', ms: 460 },     // nov — varmtvann
  { navn: 'sak', ms: 320 },
  { navn: 'lev', ms: 320 },
  { navn: 'krev', ms: 520 },
  { navn: 'kort', ms: null },  // HOLD — venter på deg
  { navn: 'godkjent', ms: 950 },
  { navn: 'm5', ms: 300 },     // des
  { navn: 'm6', ms: 300 },     // jan
  { navn: 'm7', ms: 520 },     // feb — spørsmål løst
  { navn: 'm8', ms: 300 },     // mar
  { navn: 'm9', ms: 300 },     // apr
  { navn: 'm10', ms: 640 },    // mai — Emma sier opp
  { navn: 'm11', ms: 760 },    // jun — ny leietaker (du valgte)
  { navn: 'm12', ms: 520 },    // jul
  { navn: 'ferdig', ms: 0 },
];

/* Måneder der DU gjorde noe. Alt annet gjorde DigiHome. */
const DEG = { m1: true, m4: true, m11: true };

const RADER = [
  { fase: 'm1', mnd: 'aug', t: 'Leiekontrakt signert', s: `Emma Sørensen · BankID · ${tall(14500)} kr/mnd`, deg: 'Du signerte' },
  { fase: 'm2', mnd: 'sep', t: 'Husleie registrert', s: `${tall(14500)} kr · på konto 1. hver måned`, skjulMobil: true },
  { fase: 'm4', mnd: 'nov', t: 'Varmtvann', s: 'Emma meldte 22:41', s2: 'Rørlegger AS bestilt · torsdag 09:00 · Emma varslet', s2Mobil: 'Rørlegger bestilt · torsdag 09:00', sak: true },
  { fase: 'm7', mnd: 'feb', t: 'Spørsmål fra Emma løst', s: 'Besvart fra leiekontrakten', skjulMobil: true },
  { fase: 'm10', mnd: 'mai', t: 'Emma sa opp', s: 'Ny annonse klar samme dag' },
  { fase: 'm11', mnd: 'jun', t: 'Ny leietaker', s: 'Sander Lie · kontrakt signert med BankID · fra 1. august', sMobil: 'Sander Lie · BankID · fra 1. aug', deg: 'Du valgte' },
];

/* Utførte systemhandlinger — ikke tankeprosess. Dette skjedde. */
const SPOR = [
  { fase: 'sak', t: 'Sak opprettet', d: 'Varmtvann · haster' },
  { fase: 'lev', t: 'Leverandør funnet', d: 'Rørlegger AS · ledig torsdag' },
  { fase: 'krev', t: 'Krever godkjenning', d: `${tall(3450)} kr` },
];

const AUTO_MS = 5000;
const SCENE_H = 'clamp(620px, 70vh, 700px)';
const SCENE_H_SMAL = 'clamp(580px, 74vh, 660px)';
const HAIR = 'rgba(21,19,15,0.08)';
const PAPIR = '#FBFAF8';

function Prikk({ tilstand }) {
  const fylt = tilstand !== 'ferdig';
  return (
    <span aria-hidden="true" className="block h-[7px] w-[7px] rounded-full" style={{ background: tilstand === 'aktiv' ? T.lilla : tilstand === 'godkjent' ? T.gronn : T.flate, boxShadow: fylt ? 'none' : 'inset 0 0 0 1px rgba(21,19,15,0.35)', transition: 'background 400ms, box-shadow 400ms' }} />
  );
}

function HakeIkon({ className = '' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* «Du gjorde»-chippen på en rad: liten, lilla prikk + tekst. */
function DegChip({ vis, tekst, className = '' }) {
  return (
    <span className={`items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium ${className}`} style={{ color: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE} 260ms, transform 400ms ${EASE} 260ms` }}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />
      {tekst}
    </span>
  );
}

export default function BoligScene({ eiendom }) {
  const ref = useRef(null);
  const figRef = useRef(null);
  const radRef = useRef(null);
  const smal = useSmal();
  const synlig = useSynlig(ref, smal ? 0.6 : 0.35);
  const { fase, er, ferdig, replay, videre, holder } = useSekvens(FASER, synlig);
  const sceneH = smal ? SCENE_H_SMAL : SCENE_H;

  /* Din adresse → din bolig. Byttes sekvensielt: fade ut → bytt → spill fra frame 1. */
  const [vist, setVist] = useState(null);
  const [skifter, setSkifter] = useState(false);
  const sisteNokkel = useRef(null);
  useEffect(() => {
    if (!eiendom || !eiendom.adresse) return undefined;
    const nokkel = `${eiendom.adresse}|${eiendom.by || ''}`;
    if (nokkel === sisteNokkel.current) return undefined;
    sisteNokkel.current = nokkel;
    setSkifter(true);
    const t = window.setTimeout(() => { setVist({ adresse: eiendom.adresse, by: eiendom.by || '' }); replay(); setSkifter(false); }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eiendom]);
  const egen = !!vist;
  const adresse = egen ? vist.adresse : 'Nygårdsgaten 5A';
  const under = egen ? `Din bolig${vist.by ? ` · ${vist.by}` : ''}` : 'Leilighet · 2 sov · Bergen';

  const inne = er('inn');
  const godkjent = er('godkjent');
  const aktiv = er('m4') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';
  const visSpor = er('sak') && !godkjent;

  /* Hvor mange måneder har gått? (m1..m12) */
  let passert = 0;
  for (let i = 1; i <= 12; i += 1) { if (er(`m${i}`)) passert = i; }
  const husleie = Math.max(0, passert - 1);                     // husleie fra september
  const gjort = (er('m1') ? 1 : 0) + (godkjent ? 1 : 0) + (er('m11') ? 1 : 0);

  const [dato, setDato] = useState('');
  useEffect(() => {
    try { setDato(new Date().toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })); } catch (e) { /* ok */ }
  }, []);

  /* Hvem godkjente? 'deg' når du trykket, 'eier' når historien løste seg selv. */
  const [hvem, setHvem] = useState(null);
  const [trykket, setTrykket] = useState(false);
  const harRort = useRef(false);
  const godkjenn = useCallback((av) => {
    if (trykket || !venter) return;
    setHvem(av);
    setTrykket(true);
    window.setTimeout(() => { videre(); }, 340);
  }, [trykket, venter, videre]);
  useEffect(() => { if (fase === 'inn') { setTrykket(false); setHvem(null); } }, [fase]);

  useEffect(() => {
    const el = figRef.current;
    if (!el) return undefined;
    const f = () => { harRort.current = true; };
    el.addEventListener('pointerenter', f);
    el.addEventListener('pointermove', f, { passive: true });
    el.addEventListener('pointerdown', f);
    el.addEventListener('touchstart', f, { passive: true });
    el.addEventListener('focusin', f);
    return () => {
      el.removeEventListener('pointerenter', f);
      el.removeEventListener('pointermove', f);
      el.removeEventListener('pointerdown', f);
      el.removeEventListener('touchstart', f);
      el.removeEventListener('focusin', f);
    };
  }, []);

  useEffect(() => {
    if (!venter || trykket) return undefined;
    const el = figRef.current;
    try { if (el && el.matches(':hover')) harRort.current = true; } catch (e) { /* ok */ }
    if (harRort.current) return undefined;
    let t = window.setTimeout(() => { if (!harRort.current) godkjenn('eier'); }, AUTO_MS);
    const avbryt = () => { harRort.current = true; if (t) { window.clearTimeout(t); t = null; } };
    el?.addEventListener('pointerenter', avbryt);
    el?.addEventListener('pointermove', avbryt, { passive: true });
    el?.addEventListener('touchstart', avbryt, { passive: true });
    return () => { if (t) window.clearTimeout(t); el?.removeEventListener('pointerenter', avbryt); el?.removeEventListener('pointermove', avbryt); el?.removeEventListener('touchstart', avbryt); };
  }, [venter, trykket, godkjenn]);

  /* Kortets topp følger saksraden. */
  const kortRef = useRef(null);
  const [kortTop, setKortTop] = useState(null);
  useEffect(() => {
    if (!er('kort')) return undefined;
    const mal = () => {
      if (!radRef.current || !figRef.current || !kortRef.current || !ref.current) return;
      const fig = figRef.current.getBoundingClientRect();
      const rad = radRef.current.getBoundingClientRect();
      const kortH = kortRef.current.offsetHeight;
      const midt = rad.top - fig.top + rad.height / 2 - kortH / 2;
      const maks = ref.current.offsetHeight - kortH - 20;
      setKortTop(Math.round(Math.max(24, Math.min(midt, maks))));
    };
    mal();
    window.addEventListener('resize', mal);
    return () => window.removeEventListener('resize', mal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn';
  const godkjentAv = hvem === 'deg' ? 'Godkjent av deg · nå' : 'Godkjent av deg · 08:02';

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4p-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[20px]"
        style={{ height: sceneH, background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 40px 90px -50px rgba(21,19,15,0.35)', opacity: skifter ? 0 : 1, transition: `opacity 300ms ${EASE}` }}
        role="img"
        aria-label={`Animert eksempel: ett leieår i ${adresse} med DigiHome — kontrakt signert med BankID, husleie hver måned, et varmtvannsproblem løst med én godkjenning, et spørsmål besvart fra kontrakten, og ny leietaker da den forrige sa opp. Tre ting gjorde du selv.`}
        data-testid="v4p-scene"
      >
        <div className="flex h-full flex-col px-6 pb-5 pt-5 sm:px-7 sm:pt-6">
          {/* ── Header: boligen · det du gjorde ── */}
          <div className="flex items-start justify-between gap-4" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}` }}>
            <div className="flex min-w-0 items-center gap-3.5">
              {egen ? (
                <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-[15px] font-medium" style={{ background: T.flate, color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>{adresse.trim().charAt(0).toUpperCase()}</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/v4/privat/bolig-thumb.webp" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[11px] object-cover" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.08)' }} />
              )}
              <div className="min-w-0">
                <p className="truncate text-[22px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }} data-testid="v4p-adresse">{adresse}</p>
                <p className="mt-0.5 truncate text-[13px] text-[#15130F]/55 sm:text-[13.5px]">{under}{dato && <span className="hidden sm:inline"> · {dato}</span>}</p>
              </div>
            </div>
            {/* Tallet en privat huseier bryr seg om: hvor mye måtte jeg gjøre? */}
            <div className="flex shrink-0 items-center gap-5 sm:gap-6">
              <div className="text-right">
                <p className="text-[12px] text-[#15130F]/50">Du gjorde</p>
                <p className="mt-0.5 flex items-baseline justify-end gap-1.5">
                  <span className="inline-grid text-[22px] leading-none" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }} data-testid="v4p-gjort">
                    {[0, 1, 2, 3].map((n) => (
                      <span key={n} className="col-start-1 row-start-1" style={{ opacity: gjort === n ? 1 : 0, transition: `opacity 300ms ${EASE} ${gjort === n ? 160 : 0}ms` }}>{n}</span>
                    ))}
                  </span>
                  <span className="text-[12.5px] text-[#15130F]/45">ting i år</span>
                </p>
              </div>
              <div className="hidden h-8 w-px sm:block" style={{ background: HAIR }} />
              <p className="hidden items-center gap-2 text-[13px] text-[#15130F]/60 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms' }} />
                <span className="inline-grid">
                  <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                  <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Én ting venter på deg</span>
                </span>
              </p>
            </div>
          </div>

          {/* ── Året: tolv måneder på én linje. Grønn = husleie inn. Lilla = deg. ── */}
          <div className="mt-6 sm:mt-7" style={{ opacity: inne ? 1 : 0, transition: `opacity 600ms ${EASE} 250ms` }} data-testid="v4p-aar">
            <div className="flex items-center justify-between gap-4 text-[13px]">
              <p className="text-[#15130F]/45">Leieåret</p>
              <p className="flex items-center gap-4 text-[#15130F]/55">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Husleie inn <span className="tabular-nums text-[#15130F]/85" data-testid="v4p-husleie">{husleie}</span> av 11</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Deg</span>
              </p>
            </div>
            <div className="relative mt-3">
              {/* Linjen tegnes etter hvert som året går */}
              <span aria-hidden="true" className="absolute left-0 right-0 top-[21px] h-px" style={{ background: 'rgba(21,19,15,0.10)' }} />
              <span aria-hidden="true" className="absolute left-0 top-[21px] h-px" style={{ background: 'rgba(21,19,15,0.30)', width: `${(Math.max(0, passert - 0.5) / 12) * 100}%`, transition: `width 420ms ${EASE}` }} />
              <ol className="relative grid grid-cols-12">
                {MND.map((m, i) => {
                  const k = `m${i + 1}`;
                  const ok = er(k);
                  const deg = !!DEG[k];
                  const venterHer = k === 'm4' && aktiv;
                  const farge = !ok ? PAPIR : deg ? T.lilla : T.gronn;
                  return (
                    <li key={m} className="flex flex-col items-center gap-2">
                      <span className="text-[11px] tabular-nums sm:text-[12px]" style={{ color: ok ? 'rgba(21,19,15,0.75)' : 'rgba(21,19,15,0.35)', fontWeight: ok && deg ? 500 : 400, transition: 'color 400ms' }}>{m}</span>
                      <span aria-hidden="true" className={`block h-[9px] w-[9px] rounded-full ${venterHer && venter ? 'v4-puls' : ''}`} style={{ background: farge, boxShadow: ok ? 'none' : 'inset 0 0 0 1px rgba(21,19,15,0.28)', transform: ok ? 'scale(1)' : 'scale(0.85)', transition: `background 400ms ${EASE}, box-shadow 400ms, transform 400ms ${EASE}` }} />
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* ── Det som skjedde — ledger med måned i margen ── */}
          <ul className="relative mt-5 sm:mt-6" style={{ opacity: inne ? 1 : 0, transition: `opacity 500ms ${EASE} 350ms` }} aria-hidden={!inne}>
            <span aria-hidden="true" className="absolute bottom-0 top-0 left-[51px] hidden w-px sm:block" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'top', transform: er('m1') ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 700ms ${EASE} 200ms` }} />
            {RADER.map((r0) => {
              const r = egen && r0.fase === 'm1' ? { ...r0, s: `Emma Sørensen · BankID · ${adresse}` } : r0;
              const vis = er(r.fase);
              const erAktiv = r.sak && aktiv;
              const dempet = !r.sak && !r.deg;
              const tilstand = r.sak ? (godkjent ? 'godkjent' : 'aktiv') : 'ferdig';
              return (
                <li key={r.fase} ref={r.sak ? radRef : undefined} className={`relative ${r.skjulMobil ? 'hidden sm:block' : ''}`} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: `opacity 520ms ${EASE}, transform 520ms ${EASE}` }}>
                  <span aria-hidden="true" className="absolute -inset-x-3 inset-y-0.5 rounded-[12px]" style={{ background: 'rgba(21,19,15,0.045)', opacity: erAktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
                  <div className="relative grid grid-cols-[30px_16px_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 sm:grid-cols-[44px_16px_minmax(0,1fr)_auto] sm:py-3">
                    <span className="pt-[3px] text-[12.5px] text-[#15130F]/45 sm:text-[13px]">{r.mnd}</span>
                    <span className="flex justify-center pt-[7px]"><Prikk tilstand={tilstand} /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[15px] font-medium" style={{ color: dempet ? 'rgba(21,19,15,0.62)' : godkjent && r.sak ? 'rgba(21,19,15,0.85)' : T.ink, transition: 'color 400ms' }}>
                        {r.t}
                      </span>
                      <span className="mt-0.5 block text-[13.5px] sm:truncate" style={{ color: dempet ? 'rgba(21,19,15,0.42)' : 'rgba(21,19,15,0.62)' }}>{smal && r.sMobil ? r.sMobil : r.s}</span>
                      {/* Mobil: chippen under teksten, ikke i margen */}
                      {r.deg && <DegChip vis={vis} tekst={r.deg} className="mt-1.5 inline-flex sm:hidden" />}

                      {r.sak && (
                        <span className="grid" style={{ gridTemplateRows: visSpor ? '1fr' : '0fr', transition: `grid-template-rows 450ms ${EASE}` }}>
                          <span className="block min-h-0 overflow-hidden">
                            <span className="mt-2 block" data-testid="v4p-spor">
                              {SPOR.map((sp) => {
                                const v = er(sp.fase) && !godkjent;
                                return (
                                  <span key={sp.fase} className="flex items-baseline gap-2 py-[3px] text-[13px]" style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(4px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}` }}>
                                    <span className="shrink-0 font-medium text-[#15130F]/85">{sp.t}</span>
                                    <span className="min-w-0 truncate text-[#15130F]/50">{sp.d}</span>
                                  </span>
                                );
                              })}
                            </span>
                          </span>
                        </span>
                      )}

                      {r.sak && (
                        <span className="grid" style={{ gridTemplateRows: godkjent ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }}>
                          <span className="block min-h-0 overflow-hidden">
                            <span className="mt-1 block text-[13.5px] text-[#15130F] sm:truncate" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 250ms` }}>{smal && r.s2Mobil ? r.s2Mobil : r.s2}</span>
                            <span className="mt-2 inline-flex items-center gap-2 text-[12.5px] text-[#15130F]/60 sm:hidden" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 300ms` }}>
                              <HakeIkon className="text-[#1F9D55]" />
                              <span>{godkjentAv}</span>
                            </span>
                          </span>
                        </span>
                      )}
                    </span>
                    {/* Høyre marg: det du gjorde */}
                    {r.deg && <span className="hidden pt-[2px] sm:block"><DegChip vis={vis} tekst={r.deg} className="inline-flex" /></span>}
                    {r.sak && (
                      <span className="hidden items-center gap-2 pt-[2px] text-[12.5px] text-[#15130F]/60 sm:inline-flex" style={{ opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE} 200ms, transform 400ms ${EASE} 200ms` }} data-testid="v4p-godkjent">
                        <HakeIkon className="text-[#1F9D55]" />
                        <span className="whitespace-nowrap">{godkjentAv}</span>
                      </span>
                    )}
                  </div>
                  <span aria-hidden="true" className="block h-px" style={{ background: HAIR }} />
                </li>
              );
            })}
          </ul>

          <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-[13.5px] text-[#15130F]/50" style={{ opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
            <span data-testid="v4p-scene-tekst">Tolv måneder. Tre ting du gjorde. Resten gjorde DigiHome.</span>
            <button type="button" onClick={replay} className="shrink-0 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} tabIndex={ferdig ? 0 : -1} data-testid="v4p-replay">Spill igjen</button>
          </div>
        </div>
      </div>

      {/* ── Lag 2: godkjenningskortet. Året stopper her — til du har svart. ── */}
      <div
        ref={kortRef}
        aria-hidden={!visKort}
        className="absolute z-10 rounded-[18px] text-[#F4F1EA]"
        style={{
          background: T.charcoal,
          boxShadow: '0 30px 60px -28px rgba(21,19,15,0.55), 0 1px 2px rgba(21,19,15,0.18)',
          ...(smal ? { left: 16, right: 16, bottom: 16 } : { right: -24, width: 288, top: kortTop == null ? '52%' : kortTop }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transform: visKort ? 'none' : godkjent ? 'translate(-14px, -6px) scale(0.96)' : 'translateX(28px)',
          transition: visKort ? `opacity 520ms ${EASE}, transform 520ms ${EASE}` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4p-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-3.5 pl-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] text-white/60"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</p>
              <p className="mt-1 truncate text-[14px] font-medium">Rørlegger AS</p>
              <p className="text-[13px] text-white/60">Torsdag 09:00 · {tall(3450)} kr</p>
            </div>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`} className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4p-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="flex items-center justify-between text-[12.5px] text-white/60">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
              <span className="tabular-nums">nov · 22:41</span>
            </div>
            <p className="mt-3.5 text-[15px] font-medium">Rørlegger AS</p>
            <p className="text-[13.5px] text-white/60">Torsdag 09:00 · varmtvann</p>
            <p className="mt-3 text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</p>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label={`Godkjenn rørlegger, ${tall(3450)} kroner`} className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4p-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            <p className="mt-2.5 text-[11.5px] text-white/45">Sak opprettet automatisk · sendt til deg</p>
          </div>
        )}
      </div>
    </figure>
  );
}
