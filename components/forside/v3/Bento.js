'use client';

import React, { useRef } from 'react';
import {
  Check, ChevronRight, MessageSquare, Wrench, Home, Building2, Wallet, FileText,
  ShieldCheck, Sparkles, Star, CalendarDays, Send, Download,
} from 'lucide-react';
import { heading, EASE, display, Avsloer, useSynlig, Inn, Etikett } from './motion';

/* ---------------------------------------------------------------------------
   Bento — «Alt på ett sted.» Fem celler med EKTE produktutsnitt i stor skala.
   Ingen ikon+tekst-celler. Hver celle: ett utsnitt, én tittel, én linje.
--------------------------------------------------------------------------- */

function Celle({ t, b, className = '', children, testid }) {
  const ref = useRef(null);
  const inne = useSynlig(ref, 0.35);
  return (
    <div ref={ref} className={`group relative flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#111113] ${className}`} data-testid={testid}>
      <div className="px-6 pt-6">
        <p className="text-[19px] font-medium tracking-[-0.02em] text-white">{t}</p>
        <p className="mt-1.5 text-[14.5px] leading-[1.55] text-white/55">{b}</p>
      </div>
      <div className="relative mt-6 flex-1 overflow-hidden" aria-hidden="true">
        {typeof children === 'function' ? children(inne) : children}
      </div>
    </div>
  );
}

/* Utsnitt-ramme: lys produktflate som kuttes av cellekanten */
function Flate({ className = '', children }) {
  return (
    <div className={`mx-5 rounded-t-[12px] border border-b-0 border-white/[0.06] bg-[#F7F5F1] p-5 ${className}`}>{children}</div>
  );
}

/* ── Økonomi ── */
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
function Okonomi({ inne }) {
  return (
    <Flate className="h-[250px]">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a49e93]">Utbetalt i år</p>
          <p className="mt-1.5 text-[34px] font-bold leading-none tracking-[-0.035em] text-[#111827] tabular-nums" style={heading}>55 500 <span className="text-[14px] font-normal text-[#a49e93]">kr</span></p>
          <Inn vis={inne} delay={700} dy={6}><p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#effaf0] px-2.5 py-1 text-[11.5px] font-semibold text-[#157347]"><Check className="h-3 w-3" strokeWidth={3} /> 3 av 3 måneder betalt i tide</p></Inn>
        </div>
        <div className="flex h-[92px] flex-1 items-end gap-[6px] pt-1">
          {MND.map((m, i) => {
            const betalt = i < 3;
            const h = betalt ? 100 : 100;
            return (
              <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="w-full origin-bottom rounded-[4px]" style={{ height: `${h * 0.72}px`, background: betalt ? '#111827' : '#E9E4DB', transform: betalt && !inne ? 'scaleY(0.06)' : 'none', transition: `transform 900ms ${EASE} ${i * 140}ms` }} />
                <span className="text-[8.5px] font-semibold text-[#a49e93]">{m}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-[14px] bg-white border border-[#E8E5DF]">
        {[
          ['Mars', 'Betalt 1. mars · KID', '18 500 kr'],
          ['Februar', 'Betalt 1. februar · KID', '18 500 kr'],
          ['Januar', 'Betalt 2. januar · KID', '18 500 kr'],
        ].map(([m, s, v], i) => (
          <div key={m} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#effaf0]"><Check className="h-3 w-3 text-[#157347]" strokeWidth={3} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-semibold text-[#111827]">{m}</span><span className="block text-[10.5px] text-[#8d877d]">{s}</span></span>
            <span className="text-[12.5px] font-bold text-[#111827] tabular-nums" style={heading}>{v}</span>
          </div>
        ))}
      </div>
    </Flate>
  );
}

/* ── Meldinger ── */
function Meldinger({ inne }) {
  return (
    <Flate className="h-[250px]">
      <div className="flex items-center gap-2.5 border-b border-black/[0.05] pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1EAFB] text-[11px] font-bold text-[#6D4FB0]" style={heading}>JB</span>
        <span><span className="block text-[13px] font-bold text-[#111827]" style={heading}>Jonas Berg</span><span className="block text-[10.5px] text-[#8d877d]">Leietaker · Marken 8</span></span>
      </div>
      <div className="mt-3 space-y-2">
        <Inn vis={inne} delay={100} dy={8}><div className="max-w-[86%] rounded-[14px] rounded-bl-[5px] bg-white px-3.5 py-2.5 text-[12.5px] leading-[1.45] text-[#111827] border border-[#E8E5DF]">Hei! Varmtvannet er borte 😬</div></Inn>
        <Inn vis={inne} delay={700} dy={8}><div className="ml-auto max-w-[90%] rounded-[14px] rounded-br-[5px] bg-[#111827] px-3.5 py-2.5 text-[12.5px] leading-[1.45] text-white">Takk for beskjed — sak er opprettet. Rørlegger kommer torsdag kl. 09:00.</div></Inn>
        <Inn vis={inne} delay={1400} dy={8}><div className="max-w-[60%] rounded-[14px] rounded-bl-[5px] bg-white px-3.5 py-2.5 text-[12.5px] text-[#111827] border border-[#E8E5DF]">Perfekt, takk! 🙏</div></Inn>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 border border-[#E8E5DF]">
        <span className="flex-1 text-[12px] text-[#a49e93]">Skriv en melding…</span>
        <Send className="h-3.5 w-3.5 text-[#6D4FB0]" />
      </div>
    </Flate>
  );
}

/* ── Dokumenter ── */
function Dokumenter({ inne }) {
  return (
    <Flate className="h-[250px]">
      <div className="overflow-hidden rounded-[14px] bg-white border border-[#E8E5DF]">
        {[
          ['Leiekontrakt — Marken 8', 'Signert med BankID · 12. jan 2025', true],
          ['Depositumsavtale', 'Signert med BankID · 12. jan 2025', true],
          ['Innflyttingsprotokoll', '14 bilder · signert av begge', true],
          ['Husleiekvittering — mars', 'Generert automatisk', false],
        ].map(([t, s, sign], i) => (
          <div key={t} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F7F5F1]"><FileText className="h-4 w-4 text-[#57534e]" strokeWidth={1.7} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-semibold text-[#111827]">{t}</span><span className="block truncate text-[10.5px] text-[#8d877d]">{s}</span></span>
            {sign
              ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#effaf0] px-2 py-[3px] text-[10px] font-bold text-[#157347]" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'scale(0.7)', transition: `opacity 500ms ${EASE} ${300 + i * 220}ms, transform 500ms ${EASE} ${300 + i * 220}ms` }}><ShieldCheck className="h-3 w-3" strokeWidth={2.2} /> BankID</span>
              : <Download className="h-4 w-4 shrink-0 text-[#a49e93]" strokeWidth={1.7} />}
          </div>
        ))}
      </div>
    </Flate>
  );
}

/* ── Saker & leverandører ── */
function Saker({ inne }) {
  return (
    <Flate className="h-[250px]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#111827]" style={heading}>Varmtvannsbereder lekker</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#effaf0] px-2 py-[3px] text-[10px] font-bold text-[#157347]" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'scale(0.7)', transition: `opacity 500ms ${EASE} 1500ms, transform 500ms ${EASE} 1500ms` }}><Check className="h-3 w-3" strokeWidth={3} /> Håndtert</span>
      </div>
      <p className="mt-0.5 text-[11px] text-[#8d877d]">Meldt av leietaker · tirsdag 21:14 · Bad</p>
      <div className="mt-3 rounded-[14px] bg-white p-3.5 border border-[#E8E5DF]">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6D4FB0]"><Sparkles className="h-3 w-3" /> Foreslått av DigiHome</p>
        <div className="mt-2.5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#F7F5F1]"><Wrench className="h-[17px] w-[17px] text-[#57534e]" strokeWidth={1.7} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-[#111827]" style={heading}>Rørlegger AS</span>
            <span className="flex items-center gap-1 text-[10.5px] text-[#8d877d]"><Star className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" /> 4,8 · 27 oppdrag · 3 450 kr</span>
          </span>
          <span className="inline-grid"><span className="col-start-1 row-start-1 rounded-full px-3 py-[6px] text-[11px] font-semibold text-[#0A0A0A] ring-1 ring-black/[0.12]" style={{ opacity: inne ? 0 : 1, transition: `opacity 400ms ${EASE} 700ms` }}>Godkjenn</span><span className="col-start-1 row-start-1 rounded-full bg-[#111827] px-3 py-[6px] text-center text-[11px] font-semibold text-white" style={{ opacity: inne ? 1 : 0, transition: `opacity 400ms ${EASE} 700ms` }}>Godkjent</span></span>
        </div>
        <Inn vis={inne} delay={1100} dy={6}><div className="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3 text-[11.5px] text-[#57534e]">
          <CalendarDays className="h-3.5 w-3.5 text-[#6D4FB0]" /> Booket torsdag 09:00 · leietaker varslet
        </div></Inn>
      </div>
    </Flate>
  );
}

/* ── Leietaker-appen ── */
function Telefon({ inne = true }) {
  return (
    <div className="mx-auto w-[236px] rounded-[34px] bg-[#0a0a0a] p-[6px] shadow-[0_44px_96px_-32px_rgba(23,18,12,0.42),0_0_0_1px_rgba(0,0,0,0.1)]" style={{ transform: 'translateY(6px)' }}>
      <div className="relative overflow-hidden rounded-[28px] bg-[#F7F5F1]">
        <div className="absolute left-1/2 top-[8px] z-[2] h-[15px] w-[62px] -translate-x-1/2 rounded-full bg-black" />
        <div className="flex items-center justify-between px-5 pt-2.5">
          <span className="text-[9.5px] font-bold text-[#0a0a0a] tabular-nums">9:41</span>
          <span className="flex items-center gap-[2px]">{[3, 4.5, 6].map((h) => <span key={h} className="w-[2.5px] rounded-full bg-[#0a0a0a]" style={{ height: h }} />)}<span className="ml-[3px] h-[7px] w-[13px] rounded-[3px] border border-[#0a0a0a]/50"><span className="block h-full w-[70%] rounded-[1.5px] bg-[#0a0a0a]" /></span></span>
        </div>
        <div className="px-3.5 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <div><p className="text-[13px] font-bold text-[#0a0a0a]" style={heading}>God dag, Jonas 👋</p><p className="mt-[1px] text-[8.5px] text-[#8d877d]">Leietaker · Marken 8</p></div>
            <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#F1E9FB] text-[9px] font-bold text-[#7c3aed]">JB</span>
          </div>
          <div className="relative mt-3 overflow-hidden rounded-[16px] bg-[#0f0d0b] p-3">
            <div className="pointer-events-none absolute -right-5 -top-8 h-20 w-20 rounded-full" style={{ background: 'radial-gradient(circle,rgba(207,151,252,0.38),transparent 70%)' }} />
            <div className="flex items-center justify-between">
              <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#D9B4FF]/85">Neste husleie</p>
              <span className="flex items-center gap-[3px] rounded-full bg-white/[0.1] px-1.5 py-[2px] text-[7px] font-semibold text-[#7fe0b2]" style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : 'scale(0.7)', transition: `opacity 500ms ${EASE} 900ms, transform 500ms ${EASE} 900ms` }}><Check className="h-[7px] w-[7px]" strokeWidth={3} /> Mars betalt</span>
            </div>
            <p className="mt-1.5 text-[20px] font-bold leading-none tracking-[-0.02em] text-white tabular-nums" style={heading}>18 500 <span className="text-[9px] font-medium text-white/40">kr</span></p>
            <p className="mt-1.5 text-[7.5px] text-white/55">Trekkes automatisk 1. april · KID</p>
          </div>
          <p className="mt-3 text-[8px] font-bold uppercase tracking-[0.14em] text-[#b3aa9e]">Min bolig</p>
          <div className="mt-1.5 overflow-hidden rounded-[14px] border border-[#eee9e0] bg-white">
            <div className="relative h-[84px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/interior-kitchen.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-[3px] text-[7px] font-bold text-[#0f9d6e]"><span className="h-[4px] w-[4px] rounded-full bg-[#0f9d6e]" /> Aktiv leieavtale</span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <div><p className="text-[10px] font-bold text-[#0a0a0a]" style={heading}>Marken 8</p><p className="text-[7.5px] text-[#8d877d]">5017 Bergen · 3-roms · 74 m²</p></div>
              <ChevronRight className="h-[10px] w-[10px] text-[#c8c3ba]" />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {[[Wrench, 'Meld inn sak'], [MessageSquare, 'Meldinger']].map(([I, l]) => (
              <div key={l} className="flex items-center gap-1.5 rounded-[12px] border border-[#eee9e0] bg-white px-2 py-[8px]">
                <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[7px] bg-[#F1E9FB]"><I className="h-[10px] w-[10px] text-[#7c3aed]" /></span>
                <span className="text-[8.5px] font-semibold text-[#0a0a0a]">{l}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-around rounded-full border border-[#eee9e0] bg-white px-2 py-[7px]">
            {[[Home, 'Hjem', true], [Building2, 'Min bolig', false], [Wallet, 'Betaling', false], [MessageSquare, 'Meldinger', false]].map(([I, l, a]) => (
              <span key={l} className="flex flex-col items-center gap-[2px]"><I className={`h-[11px] w-[11px] ${a ? 'text-[#7c3aed]' : 'text-[#c8c3ba]'}`} /><span className={`text-[5.5px] font-bold ${a ? 'text-[#7c3aed]' : 'text-[#c8c3ba]'}`}>{l}</span></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Bento() {
  return (
    <section id="produkt" className="scroll-mt-20" data-testid="v3-bento">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-8 sm:py-32">
        <Avsloer>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Etikett>Alt på ett sted</Etikett>
              <h2 className="mt-3 max-w-[12ch] text-[34px] text-white sm:text-[44px] lg:text-[52px]" style={display}>Ikke fem verktøy. Ett<span className="text-[#CF97FC]">.</span></h2>
            </div>
            <p className="max-w-[46ch] text-[16px] leading-[1.55] text-white/55 sm:text-[17px] lg:pb-2">
              Meldinger, dokumenter, økonomi og saker bor i samme system — for deg,
              leietakeren og forvalteren. Alle ser det samme. Ingen leter i innboksen.
            </p>
          </div>
        </Avsloer>

        <div className="mt-10 grid gap-3 sm:mt-12 lg:grid-cols-3">
          <Avsloer className="lg:col-span-2"><Celle t="Økonomi som stemmer" b="Husleie, KID og oppgjør — betalt i tide, hver måned. Eksporter til regnskapet med ett klikk." className="h-full" testid="v3-celle-okonomi">{(inne) => <Okonomi inne={inne} />}</Celle></Avsloer>
          <Avsloer delay={90}><Celle t="Én samtale" b="Leietaker, eier og forvalter i samme tråd. Saker opprettes rett fra meldingen." className="h-full" testid="v3-celle-meldinger">{(inne) => <Meldinger inne={inne} />}</Celle></Avsloer>
          <Avsloer><Celle t="Dokumenter med bevis" b="Kontrakt, depositum og protokoll — signert med BankID og lagret der de hører hjemme." className="h-full" testid="v3-celle-dokumenter">{(inne) => <Dokumenter inne={inne} />}</Celle></Avsloer>
          <Avsloer delay={90}><Celle t="Saker som løser seg" b="Leverandør foreslås, godkjennes og bookes. Du blir varslet — ikke belastet." className="h-full" testid="v3-celle-saker">{(inne) => <Saker inne={inne} />}</Celle></Avsloer>
          <Avsloer delay={180}><Celle t="Leietakeren har sin egen app" b="Husleie, meldinger og saker i lomma. Fornøyde leietakere blir lenger." className="h-full" testid="v3-celle-app">{(inne) => <div className="h-[250px] overflow-hidden px-5"><Telefon inne={inne} /></div>}</Celle></Avsloer>
        </div>
      </div>
    </section>
  );
}
