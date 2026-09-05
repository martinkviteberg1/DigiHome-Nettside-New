'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   ForvaltningScene — «måneden DigiHome forvaltet boligen din».

   Forskjellen fra forsiden og privatsiden: det er ikke systemet som gjør
   jobben og du som godkjenner — det er MENNESKER hos DigiHome som gjør den,
   med systemet som ryggrad. Hver rad har derfor en avsender: Nora (din
   forvalter), vaktmester, DigiHome. Den ene tingen som er din, er ikke en
   rørlegger-regning — det er hvem som skal bo i boligen din.

   Lag 0  Papirflate. Ett objekt.
   Lag 1  Boligen · teamet ditt · en ledger over måneden, datert.
   Lag 2  Ett kort i charcoal som bryter ut av høyre kant: «Anbefalt
          leietaker — venter på deg». Så fortsetter måneden.

   Tilstandsmaskin: inn → team → rad1 (visning) → rad2 (søkere) → rad3
   (anbefalt) → sjekk → krev → KORT (venter) → godkjent → rad4 (kontrakt
   BankID) → rad5 (klargjort) → rad6 (husleie · rapport) → ferdig.
   Ubesøkt scene: eier godkjenner etter 5 s så historien alltid fullføres.
--------------------------------------------------------------------------- */

const FASER = [
  { navn: 'inn', ms: 700 },
  { navn: 'team', ms: 900 },
  { navn: 'rad1', ms: 560 },
  { navn: 'rad2', ms: 560 },
  { navn: 'rad3', ms: 420 },
  { navn: 'sjekk', ms: 340 },
  { navn: 'krev', ms: 520 },
  { navn: 'kort', ms: null },      // HOLD — venter på deg
  { navn: 'godkjent', ms: 950 },
  { navn: 'rad4', ms: 560 },
  { navn: 'rad5', ms: 560 },
  { navn: 'rad6', ms: 700 },
  { navn: 'ferdig', ms: 0 },
];

const NORA = { src: '/v4/kari.webp', alt: 'Nora' };

/* Hver rad har en avsender — det er poenget med forvaltning. */
const RADER = [
  { fase: 'rad1', dato: '12. mai', t: 'Visning holdt', s: '6 interesserte · to aktuelle', av: { avatar: NORA, navn: 'Nora' } },
  { fase: 'rad2', dato: '13. mai', t: 'Søkere vurdert', s: 'Kredittsjekk og referanser', av: { initial: 'DH', navn: 'DigiHome' }, skjulMobil: true },
  { fase: 'rad3', dato: '14. mai', t: 'Anbefalt leietaker', s: `Emma Sørensen · ${tall(14500)} kr/mnd · innflytting 1. juni`, sMobil: `Emma Sørensen · ${tall(14500)} kr/mnd`, s2: 'Kontrakt sendt til Emma · signeres med BankID', s2Mobil: 'Kontrakt sendt · BankID', sak: true, av: { avatar: NORA, navn: 'Nora' } },
  { fase: 'rad4', dato: '15. mai', t: 'Leiekontrakt signert', s: 'Emma Sørensen · BankID · depositum opprettet', sMobil: 'Emma Sørensen · BankID', av: { initial: 'DH', navn: 'DigiHome' } },
  { fase: 'rad5', dato: '31. mai', t: 'Klargjort for innflytting', s: 'Renhold · nøkler · gjennomgang', av: { initial: 'V', navn: 'Vaktmester' }, skjulMobil: true },
  { fase: 'rad6', dato: '1. jun', t: 'Husleie mottatt', s: `${tall(14500)} kr · månedsrapport sendt til deg`, sMobil: `${tall(14500)} kr · rapport sendt`, av: { initial: 'DH', navn: 'DigiHome' } },
];

/* Det som skjedde før valget landet hos deg. */
const SPOR = [
  { fase: 'sjekk', t: 'Kredittsjekk OK', d: 'Referanser bekreftet · fast inntekt' },
  { fase: 'krev', t: 'Krever eier', d: 'Siste ord er ditt' },
];

const AUTO_MS = 5000;
const SCENE_H = 'clamp(620px, 70vh, 700px)';
const SCENE_H_SMAL = 'clamp(560px, 72vh, 640px)';
const HAIR = 'rgba(21,19,15,0.08)';
const PAPIR = '#FBFAF8';

function Avatar({ src, alt, size = 22 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} />
  );
}

function Initial({ b, size = 22, mork = false }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-medium" style={{ width: size, height: size, fontSize: size <= 22 ? 10 : 11.5, background: mork ? T.ink : 'rgba(21,19,15,0.08)', color: mork ? '#F4F1EA' : 'rgba(21,19,15,0.75)', boxShadow: mork ? 'none' : '0 0 0 1px rgba(21,19,15,0.06)' }}>{b}</span>
  );
}

/* Avsender: avatar eller initial + navn. */
function Av({ av, size = 20 }) {
  if (!av) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#15130F]/55">
      {av.avatar ? <Avatar src={av.avatar.src} alt="" size={size} /> : <Initial b={av.initial} size={size} mork={av.initial === 'DH'} />}
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

export default function ForvaltningScene() {
  const ref = useRef(null);
  const figRef = useRef(null);
  const radRef = useRef(null);
  const smal = useSmal();
  const synlig = useSynlig(ref, smal ? 0.6 : 0.35);
  const { fase, er, ferdig, replay, videre, holder } = useSekvens(FASER, synlig);
  const sceneH = smal ? SCENE_H_SMAL : SCENE_H;

  const inne = er('inn');
  const team = er('team');
  const godkjent = er('godkjent');
  const aktiv = er('rad3') && !godkjent;
  const visKort = er('kort') && !godkjent;
  const venter = holder && fase === 'kort';
  const visSpor = er('sjekk') && !godkjent;

  const [dato, setDato] = useState('');
  useEffect(() => {
    try { setDato(new Date().toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })); } catch (e) { /* ok */ }
  }, []);

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
        className="relative overflow-hidden rounded-[20px]"
        style={{ height: sceneH, background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 40px 90px -50px rgba(21,19,15,0.35)' }}
        role="img"
        aria-label="Animert eksempel: en måned med full forvaltning i Nygårdsgaten 5A — DigiHome holder visning, vurderer søkere og anbefaler en leietaker. Du godkjenner hvem som skal bo der. Kontrakten signeres med BankID, boligen klargjøres, husleien kommer inn og du får månedsrapporten."
        data-testid="v4f-scene"
      >
        <div className="flex h-full flex-col px-6 pb-5 pt-5 sm:px-7 sm:pt-6">
          {/* ── Header: boligen · status ── */}
          <div className="flex items-start justify-between gap-4" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}` }}>
            <div className="flex min-w-0 items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/v4/privat/bolig-thumb.webp" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-[11px] object-cover" style={{ boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.08)' }} />
              <div className="min-w-0">
                <p className="truncate text-[22px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }} data-testid="v4f-adresse">Nygårdsgaten 5A</p>
                <p className="mt-0.5 truncate text-[13px] text-[#15130F]/55 sm:text-[13.5px]">Full forvaltning · Bergen{dato && <span className="hidden sm:inline"> · {dato}</span>}</p>
              </div>
            </div>
            <p className="hidden shrink-0 items-center gap-2 pt-1 text-[13px] text-[#15130F]/60 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms' }} />
              <span className="inline-grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt håndtert</span>
                <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>{smal ? 'Ett valg venter' : 'Ett valg venter på deg'}</span>
              </span>
            </p>
          </div>

          {/* ── Teamet ditt — menneskene som gjør jobben ── */}
          <div className="mt-6 flex items-center justify-between gap-4 rounded-[14px] px-4 py-3 sm:mt-7" style={{ background: T.flate, opacity: team ? 1 : 0, transform: team ? 'none' : 'translateY(8px)', transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}` }} data-testid="v4f-team">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex -space-x-1.5">
                <Avatar src={NORA.src} alt="Nora" size={28} />
                <Initial b="V" size={28} />
                <Initial b="DH" size={28} mork />
              </span>
              <span className="min-w-0 text-[13.5px]">
                <span className="block truncate font-medium text-[#15130F]">Nora er din forvalter</span>
                <span className="block text-[#15130F]/55 sm:truncate">Med vaktmester, renhold og DigiHome i ryggen</span>
              </span>
            </div>
            <span className="hidden shrink-0 text-[13px] text-[#15130F]/50 md:inline">Svarer innen 24 timer</span>
          </div>

          {/* ── Måneden — ledger med dato i margen og avsender til høyre ── */}
          <ul className="relative mt-5 sm:mt-6" style={{ opacity: team ? 1 : 0, transition: `opacity 500ms ${EASE} 300ms` }} aria-hidden={!team}>
            <span aria-hidden="true" className="absolute bottom-0 top-0 left-[67px] hidden w-px sm:block" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'top', transform: team ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 700ms ${EASE} 450ms` }} />
            {RADER.map((r) => {
              const vis = er(r.fase);
              const erAktiv = r.sak && aktiv;
              const dempet = !r.sak;
              const tilstand = r.sak ? (godkjent ? 'godkjent' : 'aktiv') : 'ferdig';
              return (
                <li key={r.fase} ref={r.sak ? radRef : undefined} className={`relative ${r.skjulMobil ? 'hidden sm:block' : ''}`} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: `opacity 520ms ${EASE}, transform 520ms ${EASE}` }}>
                  <span aria-hidden="true" className="absolute -inset-x-3 inset-y-0.5 rounded-[12px]" style={{ background: 'rgba(21,19,15,0.045)', opacity: erAktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
                  <div className="relative grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 sm:grid-cols-[60px_16px_minmax(0,1fr)_auto] sm:py-3">
                    <span className="hidden whitespace-nowrap pt-[3px] text-[13px] text-[#15130F]/45 sm:block">{r.dato}</span>
                    <span className="flex justify-center pt-[7px]"><Prikk tilstand={tilstand} /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[15px] font-medium" style={{ color: dempet ? 'rgba(21,19,15,0.62)' : godkjent && r.sak ? 'rgba(21,19,15,0.85)' : T.ink, transition: 'color 400ms' }}>
                        {r.t}
                        <span className="text-[12.5px] font-normal text-[#15130F]/45 sm:hidden">{r.dato}</span>
                      </span>
                      <span className="mt-0.5 block text-[13.5px] sm:truncate" style={{ color: dempet ? 'rgba(21,19,15,0.42)' : 'rgba(21,19,15,0.62)' }}>{smal && r.sMobil ? r.sMobil : r.s}</span>

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
        className="absolute z-10 rounded-[18px] text-[#F4F1EA]"
        style={{
          background: T.charcoal,
          boxShadow: '0 30px 60px -28px rgba(21,19,15,0.55), 0 1px 2px rgba(21,19,15,0.18)',
          ...(smal ? { left: 16, right: 16, bottom: 16 } : { right: -24, width: 300, top: kortTop == null ? '48%' : kortTop }),
          opacity: visKort ? 1 : 0,
          pointerEvents: visKort ? 'auto' : 'none',
          transform: visKort ? 'none' : godkjent ? 'translate(-14px, -6px) scale(0.96)' : 'translateX(28px)',
          transition: visKort ? `opacity 520ms ${EASE}, transform 520ms ${EASE}` : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4f-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-3.5 pl-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] text-white/60"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</p>
              <p className="mt-1 truncate text-[14px] font-medium">Emma Sørensen</p>
              <p className="text-[13px] text-white/60">{tall(14500)} kr/mnd · fra 1. juni</p>
            </div>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label="Godkjenn Emma Sørensen som leietaker" className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-4 text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4f-godkjenn">
              {trykket && <HakeIkon />}{trykket ? 'Godkjent' : 'Godkjenn'}
            </button>
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="flex items-center justify-between text-[12.5px] text-white/60">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
              <span className="tabular-nums">14. mai</span>
            </div>
            <div className="mt-3.5 flex items-center gap-3">
              <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-medium" style={{ background: 'rgba(244,241,234,0.12)', color: '#F4F1EA' }}>ES</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">Emma Sørensen</span>
                <span className="block text-[13px] text-white/60">Anbefalt av Nora · fast inntekt</span>
              </span>
            </div>
            <p className="mt-3 text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(14500)} kr<span className="text-[15px] text-white/55">/mnd</span></p>
            <p className="mt-1 text-[13px] text-white/60">Innflytting 1. juni · 3 års kontrakt</p>
            <button type="button" onClick={() => godkjenn('deg')} tabIndex={visKort ? 0 : -1} aria-label="Godkjenn Emma Sørensen som leietaker" className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${venter && !trykket ? 'v4-puls' : ''}`} style={{ background: trykket ? T.gronn : T.lilla, color: trykket ? '#fff' : T.ink }} data-testid="v4f-godkjenn">
              {trykket && <HakeIkon />}{knappTekst}
            </button>
            {/* Kjeden — hva Nora gjorde før det landet hos deg */}
            <ol className="mt-3.5 flex flex-col gap-1 border-t pt-3 text-[11.5px] text-white/50" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />Visning · Nora · 12. mai</li>
              <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/35" />Kredittsjekk og referanser · OK</li>
              <li className="flex items-center gap-2" style={{ color: 'rgba(244,241,234,0.85)' }}><span className="h-1 w-1 rounded-full" style={{ background: T.lilla }} />Hvem som flytter inn — deg</li>
            </ol>
          </div>
        )}
      </div>
    </figure>
  );
}
