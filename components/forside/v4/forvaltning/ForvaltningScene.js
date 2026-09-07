'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   ForvaltningScene — «måneden DigiHome forvaltet boligen din».

   Forskjellen fra forsiden og privatsiden: det er ikke systemet som gjør
   jobben og du som godkjenner — det er MENNESKER hos DigiHome som gjør den,
   med systemet som ryggrad. Hver rad har derfor en avsender med ansikt:
   Sarah (din forvalter), vaktmesteren, DigiHome (merket). Den ene tingen
   som er din, er ikke en rørlegger-regning — det er hvem som skal bo der.

   Lag 0  Papirflate på mørk scene (seksjonen rundt er charcoal).
   Lag 1  Boligen · måneden som tidslinje (markøren går fra dag til dag —
          travel uke, så stille til husleien) · teamet · ledger, datert.
   Lag 2  Ett kort i charcoal som bryter ut av høyre kant: «Venter på deg —
          Emma Sørensen, anbefalt av Sarah». Du godkjenner. Så fortsetter måneden.

   Tilstandsmaskin: inn → tid → team → rad1 (visning) → rad2 (søkere) → rad3
   (anbefalt) → sjekk → krev → KORT (venter) → godkjent → rad4 (kontrakt
   BankID) → rad5 (klargjort) → rad6 (husleie · rapport) → ferdig.
   Ubesøkt scene: eier godkjenner etter 5 s så historien alltid fullføres.
   Kun opacity/transform beveger seg.
--------------------------------------------------------------------------- */

const FASER = [
  { navn: 'inn', ms: 700 },
  { navn: 'tid', ms: 700 },
  { navn: 'team', ms: 900 },
  { navn: 'rad1', ms: 680 },
  { navn: 'rad2', ms: 640 },
  { navn: 'rad3', ms: 480 },
  { navn: 'sjekk', ms: 380 },
  { navn: 'krev', ms: 560 },
  { navn: 'kort', ms: null },      // HOLD — venter på deg
  { navn: 'godkjent', ms: 1000 },
  { navn: 'rad4', ms: 680 },
  { navn: 'rad5', ms: 760 },
  { navn: 'rad6', ms: 900 },
  { navn: 'ferdig', ms: 0 },
];

const SARAH = { src: '/brand/sarah-sleeman-360.webp', navn: 'Sarah' };
const VAKT = { src: '/v4/jonas.webp', navn: 'Vaktmester' };
const DH = { merke: true, navn: 'DigiHome' };
const EMMA = { src: '/v4/annonse/leietaker-emma.webp', navn: 'Emma Sørensen' };

/* Hver rad har en avsender — det er poenget med forvaltning. dag = dag i måneden (32 = 1. juni). */
const RADER = [
  { fase: 'rad1', dag: 12, dato: '12. mai', t: 'Visning holdt', s: '6 interesserte · to aktuelle', av: SARAH },
  { fase: 'rad2', dag: 13, dato: '13. mai', t: 'Søkere vurdert', s: 'Kredittsjekk og referanser', av: DH, skjulMobil: true },
  { fase: 'rad3', dag: 14, dato: '14. mai', t: 'Anbefalt leietaker', s: `Emma Sørensen · ${tall(14500)} kr/mnd · innflytting 1. juni`, sMobil: `Emma Sørensen · ${tall(14500)} kr/mnd`, s2: 'Kontrakt sendt til Emma · signeres med BankID', s2Mobil: 'Kontrakt sendt · BankID', sak: true, av: SARAH },
  { fase: 'rad4', dag: 15, dato: '15. mai', t: 'Leiekontrakt signert', s: 'Emma Sørensen · BankID · depositum opprettet', sMobil: 'Emma Sørensen · BankID', av: DH },
  { fase: 'rad5', dag: 31, dato: '31. mai', t: 'Klargjort for innflytting', s: 'Renhold · nøkler · gjennomgang', av: VAKT, skjulMobil: true },
  { fase: 'rad6', dag: 32, dato: '1. jun', t: 'Husleie mottatt', s: `${tall(14500)} kr · månedsrapport sendt til deg`, sMobil: `${tall(14500)} kr · rapport sendt`, av: DH },
];

/* Det som skjedde før valget landet hos deg. */
const SPOR = [
  { fase: 'sjekk', t: 'Kredittsjekk OK', d: 'Referanser bekreftet · fast inntekt' },
  { fase: 'krev', t: 'Krever eier', d: 'Siste ord er ditt' },
];

const AUTO_MS = 5000;
const SCENE_H = 'clamp(660px, 74vh, 760px)';
const SCENE_H_SMAL = 'clamp(580px, 74vh, 660px)';
const HAIR = 'rgba(21,19,15,0.08)';
const PAPIR = '#FBFAF8';
const SPRETT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/* Avsender-merke: foto (rund) eller DigiHome-ikonet (avrundet kvadrat) */
function Ansikt({ av, size = 22 }) {
  if (av.merke) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/brand/digihome-icon-purple.svg" alt="" width={size} height={size} className="shrink-0 select-none" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }} draggable={false} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={av.src} alt={av.navn} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} draggable={false} />
  );
}

/* Avsender: ansikt + navn (navnet bare fra sm) */
function Av({ av, size = 20 }) {
  if (!av) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#15130F]/55">
      <Ansikt av={av} size={size} />
      <span className="hidden whitespace-nowrap sm:inline">{av.navn}</span>
    </span>
  );
}

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

/* ── Måneden som linje: 1. mai → 1. juni. Ett merke per hendelse; markøren glir fra dag til dag.
   Den travle uka (12.–15.) ligger tett, så er det stille til husleien — det ER poenget. ── */
function Maanedslinje({ vis, dag, aktiv, godkjent }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const maal = () => setW(el.clientWidth);
    maal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maal) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const x = (d) => ((d - 1) / 31) * w;
  const naa = RADER.find((r) => r.dag === dag);
  return (
    <div ref={ref} className="relative mt-6 h-[40px] sm:mt-7" style={{ opacity: vis ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden="true" data-testid="v4f-tidslinje">
      {/* linjen tegnes fra venstre */}
      <span className="absolute left-0 right-0 top-[9px] h-px" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'left', transform: vis ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 900ms ${EASE} 100ms` }} />
      {/* hendelsene som merker — fylles etter hvert */}
      {w > 0 && RADER.map((r) => {
        const passert = dag >= r.dag;
        return <span key={r.fase} className="absolute top-[6px] h-[7px] w-[7px] rounded-full" style={{ left: 0, transform: `translateX(${x(r.dag) - 3.5}px)`, background: passert ? (r.sak && !godkjent && aktiv ? T.lilla : T.ink) : 'transparent', boxShadow: passert ? 'none' : 'inset 0 0 0 1px rgba(21,19,15,0.3)', transition: `background 400ms ${EASE} 300ms, box-shadow 400ms ${EASE} 300ms` }} />;
      })}
      {/* markøren — dagens dato */}
      {w > 0 && (
        <span className="absolute left-0 top-0" style={{ transform: `translateX(${x(dag)}px)`, opacity: dag >= 12 ? 1 : 0, transition: `transform 700ms ${EASE}, opacity 400ms ${EASE}` }} data-testid="v4f-markor" data-dag={dag}>
          <span className="absolute left-0 top-[3px] block h-[13px] w-[13px] -translate-x-1/2 rounded-full" style={{ background: T.lilla, boxShadow: '0 0 0 3px rgba(212,150,255,0.25)' }} />
          <span className="absolute top-[18px] whitespace-nowrap text-[11.5px] font-medium tabular-nums text-[#15130F]/70" style={{ left: 0, transform: dag > 26 ? 'translateX(calc(-100% + 6px))' : 'translateX(-6px)' }}>
            <span key={dag} className="inline-block animate-in fade-in-0 slide-in-from-bottom-1 duration-300">{naa ? naa.dato : ''}</span>
          </span>
        </span>
      )}
    </div>
  );
}

export default function ForvaltningScene() {
  const ref = useRef(null);
  const figRef = useRef(null);
  const radRef = useRef(null);
  const smal = useSmal();
  const synlig = useSynlig(ref, smal ? 0.5 : 0.35);
  const { fase, er, ferdig, replay, videre, holder } = useSekvens(FASER, synlig);
  const sceneH = smal ? SCENE_H_SMAL : SCENE_H;

  const inne = er('inn');
  const tid = er('tid');
  const team = er('team');
  const godkjent = er('godkjent');
  const aktiv = er('rad3') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';
  const visSpor = er('sjekk') && !godkjent;
  const dag = RADER.reduce((d, r) => (er(r.fase) ? r.dag : d), 11);

  const [hvem, setHvem] = useState(null);
  const [trykket, setTrykket] = useState(false);
  const harRort = useRef(false);
  const godkjenn = useCallback((av) => {
    if (trykket || !venter) return;
    setHvem(av);
    setTrykket(true);
    window.setTimeout(() => { videre(); }, 380);
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

  const kortRef = useRef(null);
  const [kortTop, setKortTop] = useState(null);
  useEffect(() => {
    if (!er('kort')) return undefined;
    const mal = () => {
      if (!radRef.current || !figRef.current || !kortRef.current || !ref.current) return;
      const fig = figRef.current.getBoundingClientRect();
      const rad = radRef.current.getBoundingClientRect();
      const kortH = kortRef.current.offsetHeight;
      const midt = rad.top - fig.top - 6;
      const maks = ref.current.offsetHeight - kortH - 20;
      setKortTop(Math.round(Math.max(24, Math.min(midt, maks))));
    };
    mal();
    window.addEventListener('resize', mal);
    return () => window.removeEventListener('resize', mal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const knappTekst = trykket ? 'Godkjent' : 'Godkjenn leietaker';
  const godkjentAv = hvem === 'deg' ? 'Godkjent av deg · nå' : 'Godkjent av deg · 16:12';

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4f-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[22px]"
        style={{ height: sceneH, background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 60px 120px -60px rgba(0,0,0,0.6)' }}
        role="img"
        aria-label="Animert eksempel: en måned med full forvaltning i Nygårdsgaten 5A — DigiHome holder visning, vurderer søkere og anbefaler en leietaker. Du godkjenner hvem som skal bo der. Kontrakten signeres med BankID, boligen klargjøres, husleien kommer inn og du får månedsrapporten."
        data-testid="v4f-scene"
      >
        <div className="flex h-full flex-col px-6 pb-5 pt-6 sm:px-8 sm:pt-7">
          {/* ── Header: boligen · status ── */}
          <div className="flex items-start justify-between gap-4" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}` }}>
            <div className="flex min-w-0 items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/v4/privat/bolig-thumb.webp" alt="" width={46} height={46} className="h-[46px] w-[46px] shrink-0 rounded-[12px] object-cover" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.08)' }} />
              <div className="min-w-0">
                <p className="truncate text-[23px] sm:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }} data-testid="v4f-adresse">Nygårdsgaten 5A</p>
                <p className="mt-0.5 truncate text-[13px] text-[#15130F]/55 sm:text-[13.5px]">Full forvaltning · Bergen · mai</p>
              </div>
            </div>
            <p className="flex shrink-0 items-center gap-2 pt-1 text-[13px] text-[#15130F]/60">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms' }} />
              <span className="inline-grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt håndtert</span>
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>{smal ? 'Ett valg venter' : 'Ett valg venter på deg'}</span>
              </span>
            </p>
          </div>

          {/* ── Måneden som linje ── */}
          <Maanedslinje vis={tid} dag={dag} aktiv={aktiv} godkjent={godkjent} />

          {/* ── Teamet ditt — menneskene som gjør jobben — på én hårlinje, ingen boks ── */}
          <div className="mt-4 flex items-center justify-between gap-4 border-b pb-4 sm:mt-5" style={{ borderColor: HAIR, opacity: team ? 1 : 0, transform: team ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}` }} data-testid="v4f-team">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex -space-x-2">
                <Ansikt av={SARAH} size={30} />
                <Ansikt av={VAKT} size={30} />
                <Ansikt av={DH} size={30} />
              </span>
              <span className="min-w-0 text-[13.5px]">
                <span className="block truncate font-medium text-[#15130F]">Sarah er din forvalter</span>
                <span className="block text-[#15130F]/55 sm:truncate">Med vaktmester, renhold og DigiHome i ryggen</span>
              </span>
            </div>
            <span className="hidden shrink-0 text-[13px] text-[#15130F]/50 md:inline">Svarer innen 24 timer</span>
          </div>

          {/* ── Måneden — ledger med dato i margen og avsender til høyre ── */}
          <ul className="relative mt-2 sm:mt-3" style={{ opacity: team ? 1 : 0, transition: `opacity 500ms ${EASE} 300ms` }} aria-hidden={!team}>
            <span aria-hidden="true" className="absolute bottom-0 top-0 left-[67px] hidden w-px sm:block" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'top', transform: team ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 700ms ${EASE} 450ms` }} />
            {RADER.map((r) => {
              const vis = er(r.fase);
              const erAktiv = r.sak && aktiv;
              const dempet = !r.sak;
              const tilstand = r.sak ? (godkjent ? 'godkjent' : 'aktiv') : 'ferdig';
              return (
                <li key={r.fase} ref={r.sak ? radRef : undefined} className={`relative ${r.skjulMobil ? 'hidden sm:block' : ''}`} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(12px)', transition: `opacity 560ms ${EASE}, transform 640ms ${SPRETT}` }}>
                  <span aria-hidden="true" className="absolute -inset-x-3 inset-y-0.5 rounded-[12px]" style={{ background: 'rgba(212,150,255,0.10)', opacity: erAktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
                  <div className="relative grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 sm:grid-cols-[60px_16px_minmax(0,1fr)_auto] sm:py-3">
                    <span className="hidden whitespace-nowrap pt-[3px] text-[13px] tabular-nums text-[#15130F]/45 sm:block">{r.dato}</span>
                    <span className="flex justify-center pt-[7px]"><Prikk tilstand={tilstand} /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[15px] font-medium sm:text-[15.5px]" style={{ color: dempet ? 'rgba(21,19,15,0.66)' : godkjent && r.sak ? 'rgba(21,19,15,0.85)' : T.ink, transition: 'color 400ms' }}>
                        {r.t}
                        <span className="text-[12.5px] font-normal text-[#15130F]/45 sm:hidden">{r.dato}</span>
                      </span>
                      <span className="mt-0.5 block text-[13.5px] sm:truncate" style={{ color: dempet ? 'rgba(21,19,15,0.45)' : 'rgba(21,19,15,0.62)' }}>{smal && r.sMobil ? r.sMobil : r.s}</span>

                      {r.sak && (
                        <span className="grid" style={{ gridTemplateRows: visSpor ? '1fr' : '0fr', transition: `grid-template-rows 450ms ${EASE}` }}>
                          <span className="block min-h-0 overflow-hidden">
                            <span className="mt-2 block" data-testid="v4f-spor">
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
                    {/* Høyre marg: avsender — eller din godkjenning på saksraden */}
                    {r.sak ? (
                      <span className="hidden items-center gap-2 pt-[2px] text-[12.5px] text-[#15130F]/60 sm:inline-flex" style={{ opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE} 200ms, transform 400ms ${EASE} 200ms` }} data-testid="v4f-godkjent">
                        <HakeIkon className="text-[#1F9D55]" />
                        <span className="whitespace-nowrap">{godkjentAv}</span>
                      </span>
                    ) : (
                      <span className="pt-[2px]"><Av av={r.av} /></span>
                    )}
                  </div>
                  <span aria-hidden="true" className="block h-px" style={{ background: HAIR }} />
                </li>
              );
            })}
          </ul>

          <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-[13.5px] text-[#15130F]/50" style={{ opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
            <span data-testid="v4f-scene-tekst">Én måned. Ett valg var ditt. Resten gjorde DigiHome.</span>
            <button type="button" onClick={replay} className="shrink-0 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} tabIndex={ferdig ? 0 : -1} data-testid="v4f-replay">Spill igjen</button>
          </div>
        </div>
      </div>

      {/* ── Lag 2: kortet — ikke en regning, men et menneske. Hvem som bor hos deg, bestemmer du. ── */}
      <div
        ref={kortRef}
        aria-hidden={!visKort}
        className="absolute z-10 rounded-[20px] text-[#F4F1EA]"
        style={{
          background: T.charcoal,
          boxShadow: '0 40px 80px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(21,19,15,0.18)',
          ...(smal ? { left: 16, right: 16, bottom: 16 } : { right: -28, width: 324, top: kortTop == null ? '46%' : kortTop }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transform: visKort ? 'none' : godkjent ? 'translate(-16px, -8px) scale(0.96)' : 'translateX(40px) scale(0.98)',
          transition: visKort ? `opacity 560ms ${EASE}, transform 640ms ${SPRETT}` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4f-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-3.5 pl-4">
            <div className="flex min-w-0 items-center gap-3">
              <Ansikt av={EMMA} size={38} />
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[12px] text-white/60"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</p>
                <p className="mt-0.5 truncate text-[14px] font-medium">Emma Sørensen</p>
                <p className="text-[13px] text-white/60">{tall(14500)} kr/mnd · fra 1. juni</p>
              </div>
            </div>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label="Godkjenn Emma Sørensen som leietaker" className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4f-godkjenn">
              {trykket && <HakeIkon />}{trykket ? 'Godkjent' : 'Godkjenn'}
            </button>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between text-[12.5px] text-white/60">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
              <span className="tabular-nums">14. mai</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Ansikt av={EMMA} size={44} />
              <span className="min-w-0">
                <span className="block text-[15.5px] font-medium">Emma Sørensen</span>
                <span className="block text-[13px] text-white/60">Anbefalt av Sarah</span>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['BankID', 'Fast inntekt', 'Referanser'].map((d) => (
                <span key={d} className="inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11px] font-medium" style={{ background: 'rgba(31,157,85,0.22)', color: '#9BE7B8' }}><HakeIkon className="h-[9px] w-[9px]" />{d}</span>
              ))}
            </div>
            <p className="mt-4 text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(14500)} kr<span className="text-[15px] text-white/55">/mnd</span></p>
            <p className="mt-1 text-[13px] text-white/60">Innflytting 1. juni · 3 års kontrakt</p>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label="Godkjenn Emma Sørensen som leietaker" className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[11px] text-[14.5px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4f-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            {/* Kjeden — hva Sarah gjorde før det landet hos deg */}
            <ol className="mt-4 flex flex-col gap-1 border-t pt-3 text-[11.5px] text-white/50" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />Visning · Sarah · 12. mai</li>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />Kredittsjekk og referanser · OK</li>
              <li className="flex items-center gap-2" style={{ color: 'rgba(244,241,234,0.85)' }}><span className="h-1 w-1 rounded-full" style={{ background: T.lilla }} />Hvem som flytter inn — deg</li>
            </ol>
          </div>
        )}
      </div>
    </figure>
  );
}
