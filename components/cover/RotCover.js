'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Coveret — digihome.no.
//
// Ett løfte, to dører. Heroen sier hva DigiHome er i én setning, valgarket
// (lys/mørk delt flate — samme DNA som tjenestevalget i onboardingen) lar
// besøkende velge verden: privat huseier eller bedrift. Kort side med vilje:
// beslutningen skjer over folden, substansen bor på /privat og /bedrift.
//
// Valget huskes i localStorage — tilbakevendende besøkende får sin dør
// stille fremhevet. Aldri auto-redirect; det er fiendtlig.
// ---------------------------------------------------------------------------

export default function RotCover() {
  const [husket, setHusket] = useState(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem('dh-verden');
      if (v === 'privat' || v === 'bedrift') setHusket(v);
    } catch (e) { /* private mode e.l. — coveret fungerer uansett */ }
  }, []);
  const velg = (v) => {
    try { localStorage.setItem('dh-verden', v); } catch (e) { /* ok */ }
    try { track('cover_valg', { verden: v }); } catch (e) { /* ok */ }
  };

  const huskChip = (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#9B5BD6]/10 px-2 py-[2px] text-[10px] font-semibold normal-case tracking-normal text-[#7c3aed]">
      Fortsett der du slapp
    </span>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB]" data-testid="rot-cover">
      {/* ── Ultraslank topp: logo + innlogging. Ingen meny — dørene er menyen. ── */}
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 pt-6 sm:px-10 lg:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        <a href={site.loginUrl} data-testid="cover-login"
          className="text-[13.5px] font-medium tracking-[-0.005em] text-[#1f1f1f]/70 transition-colors hover:text-[#0a0a0a]">
          Logg inn
        </a>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-6 sm:px-10 lg:px-16">
        {/* ── Løftet ── */}
        <section className="pt-12 text-center sm:pt-16 lg:pt-20">
          <h1 className="dh-cover-inn e-display mx-auto max-w-[14ch] text-[42px] sm:text-[62px] lg:text-[74px]">
            Utleie på autopilot<span className="text-[#9B5BD6]">.</span>
          </h1>
          <p className="dh-cover-inn mx-auto mt-5 max-w-[54ch] text-[15.5px] leading-[1.65] text-[#6F6A60] sm:text-[17.5px]" style={{ animationDelay: '.1s' }}>
            Ett system som tar boligutleie fra jobb til noe som bare skjer —
            fra annonse og BankID-signering til leie på konto.
          </p>
        </section>

        {/* ── Valgarket: to dører i ett ark ── */}
        <section className="dh-cover-inn mt-10 sm:mt-14" style={{ animationDelay: '.2s' }}>
          <div className="grid overflow-hidden rounded-[22px] shadow-[0_36px_90px_-36px_rgba(23,18,12,0.35)] ring-1 ring-black/[0.07] md:grid-cols-2 sm:rounded-[28px]">

            {/* Lys dør — privat huseier */}
            <Link href="/privat" onClick={() => velg('privat')} data-testid="cover-dor-privat"
              className={`group relative flex flex-col justify-between gap-9 border-b border-[#E6E1D9] bg-[#FDFCFB] p-7 transition-colors duration-300 hover:bg-[#FAF6F0] sm:p-10 md:border-b-0 md:border-r lg:p-12 ${husket === 'privat' ? 'bg-[#FBF8F3]' : ''}`}>
              <div>
                <p className="e-label flex items-center">Privat huseier{husket === 'privat' ? huskChip : null}</p>
                <h2 className="e-display mt-4 text-[28px] sm:text-[36px]">Jeg eier en bolig</h2>
                <p className="mt-3.5 max-w-[40ch] text-[14.5px] leading-[1.65] text-[#6F6A60] sm:text-[15px]">
                  Full forvaltning i Bergen — eller selvbetjent i panelet, i hele Norge.
                  Leien inn. Null stress.
                </p>
              </div>
              {/* Bevis i miniatyr: leien som bare kommer */}
              <div className="w-full max-w-[330px] rounded-[14px] bg-white p-4 shadow-[0_10px_30px_-14px_rgba(23,18,12,0.18)] ring-1 ring-black/[0.05]">
                {[['Husleie januar', 'Betalt'], ['Husleie februar', 'Betalt']].map(([l, s]) => (
                  <div key={l} className="flex items-center justify-between border-b border-[#F0EBE3] py-2 first:pt-0 text-[12.5px]">
                    <span className="text-[#3A3733]">{l}</span>
                    <span className="flex items-center gap-1 font-semibold text-[#1f7a45]"><Check className="h-3 w-3" strokeWidth={3} />{s}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-[12.5px]">
                  <span className="text-[#3A3733]">Husleie mars</span>
                  <span className="text-[#a49e93]">Forfall 1. mars</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#7c3aed]">
                Kom i gang
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>

            {/* Mørk dør — bedrift */}
            <Link href="/bedrift" onClick={() => velg('bedrift')} data-testid="cover-dor-bedrift"
              className={`group relative flex flex-col justify-between gap-9 bg-[#0B0A09] p-7 text-white transition-colors duration-300 hover:bg-[#161311] sm:p-10 lg:p-12 ${husket === 'bedrift' ? 'bg-[#131110]' : ''}`}>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 right-[-10%] h-[360px] w-[360px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.14) 0%, transparent 62%)' }}
              />
              <div className="relative">
                <p className="e-label flex items-center !text-white/50">Bedrift{husket === 'bedrift' ? huskChip : null}</p>
                <h2 className="e-display mt-4 text-[28px] !text-white sm:text-[36px]">Vi drifter en portefølje</h2>
                <p className="mt-3.5 max-w-[42ch] text-[14.5px] leading-[1.65] text-white/60 sm:text-[15px]">
                  Driftssystemet bak DigiHome — leieforhold, BankID-signering, saker og
                  økonomi i én flate. Fra 5 til 1000 enheter.
                </p>
              </div>
              {/* Bevis i miniatyr: porteføljen under kontroll */}
              <div className="relative w-full max-w-[330px] rounded-[14px] bg-white/[0.045] p-4 ring-1 ring-white/10">
                <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-2 text-[12.5px]">
                  <span className="font-semibold text-white/90">Porteføljen</span>
                  <span className="text-white/45">97 % utleid</span>
                </div>
                {[['Aktive leieforhold', '142'], ['Forfall denne uken', '3'], ['Venter på signering', '2']].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between border-b border-white/[0.06] py-2 text-[12.5px] last:border-b-0 last:pb-0">
                    <span className="text-white/55">{l}</span>
                    <span className="font-semibold text-white tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
              <span className="relative inline-flex items-center gap-2 text-[15px] font-semibold text-white">
                Se systemet
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </section>

        {/* ── Felles tillitsstripe ── */}
        <section className="dh-cover-inn mt-9 sm:mt-11" style={{ animationDelay: '.32s' }}>
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12.5px] text-[#6F6A60] sm:text-[13px]">
            {['Bergen-basert', 'Signering med BankID', 'Depositum etter husleieloven', 'Egen portefølje driftet på systemet'].map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-[#D6CFC4]" />}
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Ett system, tre måter å bruke det på — substans og veier videre ── */}
        <section className="mt-16 border-t border-[#E6E1D9] pb-16 pt-12 sm:mt-24 sm:pb-24 sm:pt-16">
          <p className="e-label text-center">Ett system</p>
          <h2 className="e-display mx-auto mt-3 max-w-[22ch] text-center text-[26px] sm:text-[34px]">Tre måter å bruke det på</h2>
          <div className="mx-auto mt-9 grid max-w-[1060px] gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-6">
            {[
              { href: '/forvaltning', tittel: 'Full forvaltning', omr: 'Bergen og omegn', tekst: 'Vi tar hele jobben — visning, kontrakt, innkreving og oppfølging av leietaker.' },
              { href: '/selvforvaltning', tittel: 'Selvforvaltning', omr: 'Hele Norge', tekst: 'Gjør det selv i panelet: annonse, BankID-kontrakt og full betalingsoversikt.' },
              { href: '/bedrift', tittel: 'For bedrifter', omr: '5–1000 enheter', tekst: 'Hele driften av porteføljen i én flate — bygget og brukt av forvaltere.' },
            ].map((k) => (
              <Link key={k.href} href={k.href} data-testid={`cover-vei-${k.tittel.toLowerCase().replace(/\s/g, '-')}`}
                className="group rounded-[18px] bg-white p-6 ring-1 ring-black/[0.05] shadow-[0_1px_3px_rgba(23,18,12,0.04)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_44px_-20px_rgba(23,18,12,0.22)] sm:p-7">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-[16.5px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>{k.tittel}</span>
                  <span className="shrink-0 text-[11.5px] text-[#a49e93]">{k.omr}</span>
                </p>
                <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[#6F6A60]">{k.tekst}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed]">
                  Les mer <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
