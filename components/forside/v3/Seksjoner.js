'use client';

import React from 'react';
import { Scale, Banknote, HeartHandshake, Layers, Check, FileSignature, CalendarDays, Building2, Wrench, Eye } from 'lucide-react';
import { display, heading, Avsloer, Etikett, Knapp, Lenke, tall, T } from './motion';

/* ---------------------------------------------------------------------------
   Seksjoner — Statement (lys) · Bilde (mørkt bånd) · For hvem (lys) ·
   Trygghet (lys) · Slutt-CTA (mørk)
--------------------------------------------------------------------------- */

const INK = '#0F0E10';

/* ── Statement — produktintro. Puster. Første lyse flate etter heroen. ── */
export function Statement() {
  return (
    <section className="relative" data-testid="v3-statement">
      <div className="mx-auto w-full max-w-[1280px] px-6 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
          <Avsloer>
            <h2 className="max-w-[17ch] text-[36px] text-[#0F0E10] sm:text-[52px] lg:text-[64px]" style={display}>Utleie skal ikke være en deltidsjobb.</h2>
          </Avsloer>
          <Avsloer delay={140} className="lg:pt-3">
            <p className="text-[18px] leading-[1.55] text-[#0F0E10]/65 sm:text-[20px]">
              De fleste som leier ut har én bolig og en full jobb. De som forvalter
              mange har for få timer. DigiHome er bygget for begge: systemet gjør
              det repetitive, du tar avgjørelsene — eller lar oss ta dem.
            </p>
          </Avsloer>
        </div>
      </div>
    </section>
  );
}

/* ── Bilde — det ene fotoet. Mørkt bånd i full bredde. Sant, lokalt, varmt. ── */
export function Bilde() {
  return (
    <section className="relative overflow-hidden bg-[#0D0B0F] text-white" data-testid="v3-bilde">
      <div className="relative h-[520px] sm:h-[620px] lg:h-[720px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bergen-aerial.webp" alt="Bergen sett fra Fløyen — byen der DigiHome forvalter sin egen portefølje" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 58%' }} />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,11,15,0.08) 0%, rgba(13,11,15,0.28) 45%, rgba(13,11,15,0.94) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-6 pb-12 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-16">
            <Avsloer>
              <Etikett mork>Bergen</Etikett>
              <p className="mt-2 text-[30px] text-white sm:text-[40px]" style={display}>Vi er selv forvaltere.</p>
              <p className="mt-3 max-w-[48ch] text-[15.5px] leading-[1.6] text-white/70 sm:text-[17px]">DigiHome Forvaltning driver hele sin portefølje i Bergen på dette systemet — hver dag. Det du ser på denne siden, bruker vi selv.</p>
            </Avsloer>
            <Avsloer delay={120}><Lenke mork href="/om-oss" className="shrink-0">Om oss</Lenke></Avsloer>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── For hvem — tre editorial kolonner, ett stille produkt-widget hver.
      Segmentene lever på egne sider; her bare et glimt av hva hver får. ── */

function Kort({ children }) {
  return (
    <div className="relative h-[232px] overflow-hidden rounded-[14px] border border-[#0F0E10]/[0.08] bg-white p-4 shadow-[0_32px_64px_-48px_rgba(30,20,40,0.4)]" aria-hidden="true">
      {children}
    </div>
  );
}

function Rad({ Ikon, tone = 'ok', t, s }) {
  const c = tone === 'ok'
    ? { bg: '#effaf0', ic: '#15803d' }
    : tone === 'varsel' ? { bg: '#fffbeb', ic: '#b45309' } : { bg: '#F1EAFB', ic: '#6D4FB0' };
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: c.bg }}><Ikon className="h-3.5 w-3.5" style={{ color: c.ic }} strokeWidth={2.4} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold text-[#111827]">{t}</span>
        <span className="block truncate text-[11px] text-[#8A867F]">{s}</span>
      </span>
    </div>
  );
}

function WidgetPrivat() {
  return (
    <Kort>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/interior-kitchen.webp" alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-[10px] object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-bold text-[#111827]" style={heading}>Marken 8</span>
          <span className="block truncate text-[11.5px] text-[#6B7280]">3-roms · Utleid til Jonas Berg</span>
        </span>
        <span className="shrink-0 text-[14.5px] font-bold text-[#111827]" style={heading}>{tall(18500)} kr</span>
      </div>
      <div className="mt-4 space-y-2.5 border-t border-[#F3F4F6] pt-3.5">
        <Rad Ikon={Check} t="Husleie mottatt" s="1. mars · KID · automatisk" />
        <Rad Ikon={FileSignature} t="Kontrakt signert" s="BankID · begge parter · 12. januar" />
        <Rad Ikon={CalendarDays} tone="lilla" t="KPI-justering foreslås i januar" s="Du godkjenner med ett trykk" />
      </div>
    </Kort>
  );
}

function WidgetForvaltning() {
  return (
    <Kort>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[#0F0E10] text-[12px] font-bold text-white" style={heading}>DF</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-bold text-[#111827]" style={heading}>DigiHome Forvaltning</span>
          <span className="block truncate text-[11.5px] text-[#6B7280]">Håndterer Marken 8 for deg</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#effaf0] px-2.5 py-1 text-[11px] font-semibold text-[#15803d]"><Check className="h-3 w-3" strokeWidth={3} /> 0 oppgaver til deg</span>
      </div>
      <div className="mt-4 space-y-2.5 border-t border-[#F3F4F6] pt-3.5">
        <Rad Ikon={Eye} t="Visning gjennomført" s="4 interessenter · onsdag kl. 17:00" />
        <Rad Ikon={FileSignature} t="Kontrakt signert" s="BankID · begge parter" />
        <Rad Ikon={Banknote} t="Husleie innkrevd" s={`${tall(18500)} kr · 1. mars · utbetalt til deg`} />
      </div>
    </Kort>
  );
}

function WidgetBedrift() {
  return (
    <Kort>
      <div className="grid grid-cols-3 gap-3">
        {[[48, 'Enheter'], ['97 %', 'Utleid'], [3, 'Åpne saker']].map(([v, l]) => (
          <div key={l}>
            <p className="text-[24px] font-bold leading-none tracking-[-0.03em] text-[#111827]" style={heading}>{v}</p>
            <p className="mt-1 text-[11px] text-[#8A867F]">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2.5 border-t border-[#F3F4F6] pt-3.5">
        <Rad Ikon={Building2} t="Marken 8" s={`Utleid · ${tall(18500)} kr/mnd`} />
        <Rad Ikon={Eye} tone="lilla" t="Olaf Ryes vei 11C" s="Visning fredag · 4 kandidater" />
        <Rad Ikon={Wrench} tone="varsel" t="Strandgaten 4" s="Sak: varmtvann · rørlegger booket torsdag" />
      </div>
    </Kort>
  );
}

const HVEM = [
  { Widget: WidgetPrivat, t: 'Privat huseier', b: 'Én eller noen få boliger. Full kontroll — uten regneark, purringer og papir.', href: '/privat', lenke: 'For privat huseier', testid: 'privat' },
  { Widget: WidgetForvaltning, t: 'Full forvaltning', b: 'Vi tar visning, kontrakt, innkreving og oppfølging. Du følger med i samme portal.', href: '/forvaltning', lenke: 'Om full forvaltning', testid: 'forvaltning' },
  { Widget: WidgetBedrift, t: 'Bedrift og portefølje', b: 'Team, roller, saker, leverandører og økonomi — ett system som skalerer.', href: '/bedrift', lenke: 'For bedrift og portefølje', testid: 'bedrift' },
];

export function ForHvem() {
  return (
    <section id="for-hvem" className="scroll-mt-16" data-testid="v3-for-hvem">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-8 sm:py-32">
        <Avsloer>
          <Etikett>For hvem</Etikett>
          <h2 className="mt-3 max-w-[16ch] text-[34px] text-[#0F0E10] sm:text-[44px] lg:text-[52px]" style={display}>Samme system. Din måte.</h2>
        </Avsloer>
        <div className="mt-12 grid gap-x-8 gap-y-14 sm:mt-14 lg:grid-cols-3">
          {HVEM.map((h, i) => (
            <Avsloer key={h.t} delay={i * 80} className="h-full">
              <div className="flex h-full flex-col border-t border-[#0F0E10]/[0.12] pt-8" data-testid={`v3-hvem-${h.testid}`}>
                <h.Widget />
                <h3 className="mt-7 text-[24px] text-[#0F0E10] sm:text-[26px]" style={display}>{h.t}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.6] text-[#0F0E10]/60">{h.b}</p>
                <Lenke href={h.href} className="mt-5" data-testid={`v3-hvem-lenke-${h.testid}`}>{h.lenke}</Lenke>
              </div>
            </Avsloer>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Trygghet — fire pilarer. Kun det vi kan dokumentere. ── */
const PILARER = [
  { Ikon: Scale, t: 'Juridisk trygt', b: 'Kontrakter etter husleieloven, signert med BankID gjennom Posten Signering. Depositum på egen konto.' },
  { Ikon: Banknote, t: 'Pengene stemmer', b: 'Husleie med KID, automatisk purring og oppgjør du kan stole på — og eksport til regnskapet.' },
  { Ikon: HeartHandshake, t: 'Mennesker når du vil', b: 'Forvalter, kundeservice og leverandører er ett trykk unna når du trenger dem. Ellers er de stille.' },
  { Ikon: Layers, t: 'Bygget for skala', b: 'Samme system for én bolig og tusen. Team, roller og rapportering vokser med deg.' },
];

const INTEGRASJONER = ['FINN', 'BankID', 'Posten Signering', 'Keyhole', 'Lea Bank', 'PowerOffice', 'Fiken', 'Airbnb', 'Booking.com'];

export function Trygghet() {
  return (
    <section className="border-t border-[#0F0E10]/[0.08]" data-testid="v3-trygghet">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-8 sm:py-32">
        <Avsloer>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Etikett>Trygghet</Etikett>
              <h2 className="mt-3 max-w-[12ch] text-[34px] text-[#0F0E10] sm:text-[44px] lg:text-[52px]" style={display}>Trygt. Norsk. Etter boka.</h2>
            </div>
            <p className="max-w-[46ch] text-[16px] leading-[1.55] text-[#0F0E10]/60 sm:text-[17px] lg:pb-2">
              Autopilot betyr ikke at ingen har kontroll. Det betyr at kontrollen
              er bygget inn — i kontraktene, i pengeflyten og i menneskene bak.
            </p>
          </div>
        </Avsloer>
        <Avsloer delay={120}>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PILARER.map((p) => (
              <div key={p.t} className="border-t border-[#0F0E10]/[0.12] pt-5">
                <p.Ikon className="h-[22px] w-[22px] text-[#0F0E10]" strokeWidth={1.6} />
                <p className="mt-5 text-[18px] font-medium tracking-[-0.015em] text-[#0F0E10]">{p.t}</p>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-[#0F0E10]/60">{p.b}</p>
              </div>
            ))}
          </div>
        </Avsloer>
        <Avsloer delay={200}>
          <div className="mt-16 flex flex-col gap-5 border-t border-[#0F0E10]/[0.08] pt-7 lg:flex-row lg:items-center lg:justify-between">
            <Etikett>Snakker med det du allerede bruker</Etikett>
            {/* Kun tekst-ordmerker: konsistent, ingen PNG-logoer som blir bokser. */}
            <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {INTEGRASJONER.map((n) => (
                <li key={n} className="flex items-center">
                  <span className="text-[15px] font-medium tracking-[-0.01em] text-[#0F0E10]/45">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}

/* ── Slutt-CTA — mørk, går rett over i footer ── */
export function SluttCTA({ onKlikk }) {
  return (
    <section className="relative overflow-hidden bg-[#0D0B0F] text-white" data-testid="v3-cta">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[520px]" style={{ background: 'radial-gradient(55% 60% at 50% 110%, rgba(212,150,255,0.14) 0%, rgba(212,150,255,0.04) 50%, transparent 78%)' }} />
      <div className="relative mx-auto w-full max-w-[1280px] px-6 py-28 text-center sm:px-8 sm:py-40">
        <Avsloer>
          <h2 className="mx-auto max-w-[14ch] text-[36px] text-white sm:text-[52px] lg:text-[64px]" style={display}>Klar for utleie på autopilot<span style={{ color: T.lilla }}>?</span></h2>
          <p className="mx-auto mt-5 max-w-[40ch] text-[16px] leading-[1.55] text-white/55 sm:text-[18px]">Kom i gang på minuttet — eller book en prat, så finner vi ut hva som passer deg.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Knapp href="/bli-utleier/start" onClick={() => onKlikk && onKlikk('bunn')} data-testid="v3-bunn-cta">Kom i gang</Knapp>
            <Knapp href="/book-mote" variant="sekundar" data-testid="v3-bunn-book">Book en prat</Knapp>
          </div>
        </Avsloer>
      </div>
    </section>
  );
}
