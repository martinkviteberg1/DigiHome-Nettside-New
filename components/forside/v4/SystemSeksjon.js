'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Building2, Users, FileText, Wallet, Wrench, FolderOpen, Settings, Search, Bell, Home, MessageSquare, User, ChevronDown, ArrowUpRight } from 'lucide-react';
import { EASE, T, display, tall, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   SystemSeksjon — systemet i ro, rett under logoene. Ingen overskrift, ingen
   ingress: mockupene ER utsagnet.

   Én tonal scene (varm stein, stor radius). I den: portalen som ett rent
   hairline-kort — ingen vindusramme, ingen «browser chrome» — som blør ut
   under scenens kant, så flaten oppleves større enn den er. Appen står til
   høyre som en outline-ramme (én tynn strek, ingen mørk bezel) og legger seg
   så vidt over portalens kant.

   Systemet skal fram: sidepanelet viser alle modulene, hovedflaten bytter
   rolig mellom fem av dem (Oversikt · Eiendommer · Leietakere · Økonomi ·
   Saker) — av seg selv mens seksjonen er i bildet, eller når du trykker.
   Samme historie som filmene: Nygårdsgaten 5, Kari eier, Emma bor i
   leilighet 2.

   UI-språket: luft, hårlinjer på 6–8 %, tall i display, én aksent. Ingen
   tabeller med tunge hoder, ingen bokser i bokser.

   Portalen tegnes i én fast designbredde (DW) og skaleres til plassen.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.07)';
const HAIR2 = 'rgba(21,19,15,0.10)';
const DIM = 'rgba(21,19,15,0.52)';
const GRONN = '#166B3C';

const DW = 1128; const DH = 760;   // portalens designmål (bredde = beholderen minus appen)
const SIDE = 216;                  // sidepanelets bredde

const MODULER = [
  { id: 'oversikt', navn: 'Oversikt', Ikon: LayoutGrid, vis: true },
  { id: 'eiendommer', navn: 'Eiendommer', Ikon: Building2, vis: true },
  { id: 'leietakere', navn: 'Leietakere', Ikon: Users, vis: true },
  { id: 'kontrakter', navn: 'Kontrakter', Ikon: FileText },
  { id: 'okonomi', navn: 'Økonomi', Ikon: Wallet, vis: true },
  { id: 'saker', navn: 'Saker', Ikon: Wrench, vis: true, tall: 1 },
  { id: 'dokumenter', navn: 'Dokumenter', Ikon: FolderOpen },
  { id: 'innstillinger', navn: 'Innstillinger', Ikon: Settings },
];
const VISNINGER = MODULER.filter((m) => m.vis).map((m) => m.id);
const AUTO_MS = 4800;

const EMMA = { navn: 'Emma Sørensen', bilde: '/v4/annonse/leietaker-emma.webp' };
const KARI = { navn: 'Kari Nilsen', bilde: '/v4/kari.webp' };
const ENHETER = [
  { enhet: 'Leilighet 1', navn: 'Henrik Dahl', init: 'HD', leie: 11900, kontrakt: 'Til 30. juni 2026', status: 'Betalt', tone: 'gronn', dep: 'Sperret konto' },
  { enhet: 'Leilighet 2', navn: EMMA.navn, bilde: EMMA.bilde, leie: 12500, kontrakt: '3 år · fra 1. nov', status: 'Innflyttet', tone: 'lilla', dep: 'Garanti · Keyhole' },
  { enhet: 'Leilighet 3', navn: 'Nora Lie', init: 'NL', leie: 13200, kontrakt: 'Til 31. des 2025', status: 'Betalt', tone: 'gronn', dep: 'Sperret konto' },
];
const SUM = ENHETER.reduce((s, e) => s + e.leie, 0);
const STOLPER = [31, 31, 33, 33, 33, 34, 34, 34, 36, 36, 36, 37.6];   // leieinntekt siste 12 mnd (tusen)

/* ── Små deler ── */
function Avatar({ p, size = 24 }) {
  if (p.bilde) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.bilde} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: `0 0 0 1px ${HAIR}` }} draggable={false} />;
  }
  return <span className="inline-flex shrink-0 items-center justify-center rounded-full font-medium" style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: 'rgba(21,19,15,0.06)', color: 'rgba(21,19,15,0.66)' }}>{p.init}</span>;
}
function Prikk({ tone }) {
  return <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone === 'gronn' ? T.gronn : tone === 'lilla' ? T.lilla : 'rgba(21,19,15,0.30)' }} />;
}
function Status({ t, tone = 'noytral' }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium" style={{ color: tone === 'gronn' ? GRONN : tone === 'lilla' ? T.ink : 'rgba(21,19,15,0.6)' }}><Prikk tone={tone} />{t}</span>;
}
function Panel({ children, className = '', style }) {
  return <div className={`rounded-[14px] ${className}`} style={{ background: '#FFFFFF', boxShadow: `0 0 0 1px ${HAIR}`, ...style }}>{children}</div>;
}
function Overskrift({ children, sub }) {
  return (
    <div>
      <h3 className="text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{children}</h3>
      {sub && <p className="mt-2 text-[12.5px]" style={{ color: DIM }}>{sub}</p>}
    </div>
  );
}
function Tall({ k, v, u, tone }) {
  return (
    <div>
      <p className="text-[12px]" style={{ color: DIM }}>{k}</p>
      <p className="mt-2 text-[34px] tabular-nums" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1 }}>{v}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-[12px]" style={{ color: tone === 'lilla' ? T.ink : DIM }}>{tone === 'lilla' && <Prikk tone="lilla" />}{u}</p>
    </div>
  );
}
function Hake({ size = 11 }) {
  return <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: 22, height: 22, background: 'rgba(31,157,85,0.12)', color: GRONN }}><svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
}
function Rad({ p, hake, t, u, h, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {p ? <Avatar p={p} size={24} /> : hake ? <Hake /> : null}
      <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{t}</span>{u && <span className="block truncate text-[12px]" style={{ color: DIM }}>{u}</span>}</span>
      {h && <span className="shrink-0 text-[12px] tabular-nums" style={{ color: DIM }}>{h}</span>}
    </div>
  );
}

/* ── Visningene ── */
function Oversikt() {
  const hendelser = [
    { t: 'Emma Sørensen flyttet inn', u: 'Overtakelsesprotokoll signert av begge', h: '1. nov', p: EMMA },
    { t: 'Husleie mottatt · Leilighet 1', u: `${tall(11900)} kr · matchet mot KID`, h: '1. nov', hake: true },
    { t: 'Ny sak: Ingen varmtvann', u: 'Leilighet 2 · fra chatten · haster', h: 'tir. 22:41', p: EMMA },
    { t: 'Godkjent: rørlegger · 3 900 kr', u: 'Torsdag 08–10 · Emma varslet', h: 'tir. 22:52', p: KARI },
    { t: 'Faktura bokført · rørlegger', u: '3 900 kr · lagt i regnskapet', h: 'tor. 10:12', hake: true },
  ];
  return (
    <div>
      <Overskrift sub="Torsdag 6. november · Nygårdsgaten 5">God morgen, Kari.</Overskrift>
      <div className="mt-7 grid grid-cols-4 gap-6 border-b pb-7" style={{ borderColor: HAIR }}>
        <Tall k="Leieinntekt · november" v={`${tall(SUM)} kr`} u="3 av 3 betalt" />
        <Tall k="Åpne saker" v="1" u="Venter på deg · 3 900 kr" tone="lilla" />
        <Tall k="Utleiegrad" v="100 %" u="3 av 3 enheter" />
        <Tall k="Neste forfall" v="1. des" u={`Husleie · ${tall(SUM)} kr`} />
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,6fr)_minmax(0,6fr)] gap-8">
        <div>
          <div className="flex items-baseline justify-between"><p className="text-[13px] font-medium">Leieinntekt · siste 12 måneder</p><p className="text-[12px]" style={{ color: DIM }}>tusen kr</p></div>
          <div className="mt-5 flex h-[132px] items-end gap-[7px]">
            {STOLPER.map((h, i) => (
              <div key={i} className="flex-1 rounded-[4px]" style={{ height: `${Math.round((h / 40) * 100)}%`, background: i === STOLPER.length - 1 ? T.lilla : 'rgba(21,19,15,0.08)' }} />
            ))}
          </div>
          <div className="mt-2.5 flex justify-between text-[10.5px] tabular-nums" style={{ color: DIM }}><span>des</span><span>mar</span><span>jun</span><span>sep</span><span>nov</span></div>
        </div>
        <div>
          <p className="text-[13px] font-medium">Siste hendelser</p>
          <ol className="mt-2">
            {hendelser.map((h, i) => <li key={h.t} className="border-t py-[9px]" style={{ borderColor: i === 0 ? 'transparent' : HAIR }}><Rad {...h} /></li>)}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Eiendommer() {
  return (
    <div>
      <Overskrift sub="1 eiendom · 3 enheter · alle utleid">Eiendommer</Overskrift>
      <div className="mt-7 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/v4/bygg/nygardsgaten.webp" alt="" className="h-16 w-16 shrink-0 rounded-[12px] object-cover" draggable={false} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-medium tracking-[-0.01em]">Nygårdsgaten 5</p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: DIM }}>Bergen · bygård fra 1898 · 3 leiligheter · felles bereder og strømmåler</p>
        </div>
        <div className="grid grid-cols-3 gap-8 text-right">
          {[['Leie / mnd', `${tall(SUM)} kr`], ['Utleid', '3 av 3'], ['Åpne saker', '1']].map(([k, v]) => (
            <div key={k}><p className="text-[11.5px]" style={{ color: DIM }}>{k}</p><p className="mt-1 text-[16px] font-medium tabular-nums tracking-[-0.01em]">{v}</p></div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-[1.1fr_1.6fr_1fr_1.3fr_1fr] gap-4 text-[11.5px]" style={{ color: DIM }}><span>Enhet</span><span>Leietaker</span><span>Leie</span><span>Kontrakt</span><span className="text-right">Status</span></div>
      <ol className="mt-1">
        {ENHETER.map((e) => (
          <li key={e.enhet} className="grid grid-cols-[1.1fr_1.6fr_1fr_1.3fr_1fr] items-center gap-4 border-t py-3 text-[13px]" style={{ borderColor: HAIR }}>
            <span className="font-medium">{e.enhet}</span>
            <span className="inline-flex items-center gap-2 truncate"><Avatar p={e} size={22} />{e.navn}</span>
            <span className="tabular-nums">{tall(e.leie)} kr</span>
            <span style={{ color: DIM }}>{e.kontrakt}</span>
            <span className="text-right"><Status t={e.status} tone={e.tone} /></span>
          </li>
        ))}
      </ol>
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[['Annonse', 'Ingen ledige enheter', 'Neste ledig: ukjent'], ['Dokumenter', '14 filer', 'Kontrakter, protokoller, garantier'], ['Målere', 'Strøm · avlest 1. nov', '48 213 kWh']].map(([k, v, u]) => (
          <Panel key={k} className="p-4"><p className="text-[12px]" style={{ color: DIM }}>{k}</p><p className="mt-1.5 text-[13.5px] font-medium">{v}</p><p className="mt-0.5 text-[12px]" style={{ color: DIM }}>{u}</p></Panel>
        ))}
      </div>
    </div>
  );
}

function Leietakere() {
  return (
    <div>
      <Overskrift sub="3 leietakere · 2 spørsmål besvart automatisk denne uken">Leietakere</Overskrift>
      <div className="mt-7 grid grid-cols-3 gap-4">
        {ENHETER.map((e) => (
          <Panel key={e.enhet} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar p={e} size={38} />
              <div className="min-w-0"><p className="truncate text-[14px] font-medium">{e.navn}</p><p className="text-[12px]" style={{ color: DIM }}>{e.enhet}</p></div>
            </div>
            <dl className="mt-4 text-[12.5px]">
              {[['Leie', `${tall(e.leie)} kr / mnd`], ['Kontrakt', e.kontrakt], ['Depositum', e.dep]].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-t py-2" style={{ borderColor: HAIR }}><dt style={{ color: DIM }}>{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-2"><Status t={e.status} tone={e.tone} /></div>
          </Panel>
        ))}
      </div>
      <p className="mt-7 text-[13px] font-medium">Siste meldinger</p>
      <ol className="mt-2">
        <li className="py-[9px]"><Rad p={EMMA} t="Kan jeg male soverommet?" u="Svart fra kontrakten · «Ja, i lyse farger — meld fra først.»" h="i går" /></li>
        <li className="border-t py-[9px]" style={{ borderColor: HAIR }}><Rad p={{ init: 'NL' }} t="Når leses strømmåleren?" u="Svart automatisk · «1. i hver måned — du får kvittering i appen.»" h="man." /></li>
      </ol>
    </div>
  );
}

function Okonomi() {
  const rader = [
    ['1. nov', 'Husleie · Leilighet 1', `${tall(11900)} kr`, 'Matchet · KID', 'gronn'],
    ['1. nov', 'Husleie · Leilighet 3', `${tall(13200)} kr`, 'Matchet · KID', 'gronn'],
    ['1. nov', 'Depositumsgaranti · Leilighet 2', '—', 'Utstedt', 'noytral'],
    ['tor. 6. nov', 'Rørlegger · bereder byttet · Leilighet 2', `−${tall(3900)} kr`, 'Bokført', 'gronn'],
    ['1. des', 'Husleie · Leilighet 2', `${tall(12500)} kr`, 'Forfaller', 'lilla'],
  ];
  return (
    <div>
      <Overskrift sub="November · avstemt mot kontoen">Økonomi</Overskrift>
      <div className="mt-7 grid grid-cols-3 gap-6 border-b pb-7" style={{ borderColor: HAIR }}>
        <Tall k="Inn denne måneden" v={`${tall(25100)} kr`} u="2 av 3 husleier · 1 forfaller 1. des" />
        <Tall k="Ut denne måneden" v={`${tall(3900)} kr`} u="1 faktura · rørlegger" />
        <Tall k="Regnskap" v="Synkront" u="Sist 10:12 i dag" />
      </div>
      <div className="mt-5 grid grid-cols-[110px_minmax(0,1fr)_120px_150px] gap-4 text-[11.5px]" style={{ color: DIM }}><span>Dato</span><span>Beskrivelse</span><span className="text-right">Beløp</span><span className="text-right">Status</span></div>
      <ol className="mt-1">
        {rader.map(([d, b, s, st, tone]) => (
          <li key={b} className="grid grid-cols-[110px_minmax(0,1fr)_120px_150px] items-center gap-4 border-t py-3 text-[13px]" style={{ borderColor: HAIR }}>
            <span className="tabular-nums" style={{ color: DIM }}>{d}</span>
            <span className="truncate font-medium">{b}</span>
            <span className="text-right tabular-nums">{s}</span>
            <span className="text-right"><Status t={st} tone={tone} /></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Saker() {
  const saker = [
    { t: 'Ingen varmtvann', u: 'Leilighet 2 · Emma · rørlegger · 3 900 kr', st: 'Løst · torsdag', tone: 'gronn', p: EMMA },
    { t: 'Dryppende kran på badet', u: 'Leilighet 3 · Nora · ikke haster', st: 'Hos leverandør', tone: 'noytral', p: { init: 'NL' } },
    { t: 'Ekstra nøkkel', u: 'Leilighet 1 · Henrik · låsesmed · 890 kr', st: 'Venter på deg', tone: 'lilla', p: { init: 'HD' } },
  ];
  return (
    <div>
      <Overskrift sub="1 venter på deg · 1 hos leverandør · 1 løst denne uken">Saker</Overskrift>
      <div className="mt-7 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-8">
        <ol>
          {saker.map((s, i) => (
            <li key={s.t} className="flex items-center gap-3 border-t py-3" style={{ borderColor: i === 0 ? 'transparent' : HAIR }}>
              <Avatar p={s.p} size={28} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{s.t}</span><span className="block truncate text-[12px]" style={{ color: DIM }}>{s.u}</span></span>
              <Status t={s.st} tone={s.tone} />
            </li>
          ))}
        </ol>
        {/* Godkjenningen — det ene du gjør */}
        <div className="self-start rounded-[16px] p-5" style={{ background: T.charcoal, color: T.offwhite }}>
          <div className="flex items-center justify-between text-[12px]" style={{ color: 'rgba(244,241,234,0.6)' }}><span className="inline-flex items-center gap-2"><Prikk tone="lilla" />Venter på deg</span><span className="tabular-nums">09:14</span></div>
          <p className="mt-3.5 text-[15px] font-medium">Ekstra nøkkel · Leilighet 1</p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Låsesmed · fredag 12–14 · Henrik har bekreftet</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-[26px] tabular-nums" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(890)} kr</span>
            <span className="inline-flex h-9 items-center rounded-[10px] px-4 text-[13px] font-medium" style={{ background: T.lilla, color: T.ink }}>Godkjenn</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const VISNING = { oversikt: Oversikt, eiendommer: Eiendommer, leietakere: Leietakere, okonomi: Okonomi, saker: Saker };

/* ── Portalen — ett hairline-kort, ingen vindusramme ── */
function Portal({ aktiv, onVelg }) {
  const refs = useRef({});
  const [mark, setMark] = useState(null);
  useEffect(() => {
    const el = refs.current[aktiv]; if (!el) return;
    setMark({ y: el.offsetTop, h: el.offsetHeight });
  }, [aktiv]);
  const [vist, setVist] = useState(aktiv);
  const [ut, setUt] = useState(false);
  useEffect(() => {
    if (aktiv === vist) return undefined;
    setUt(true);
    const t = window.setTimeout(() => { setVist(aktiv); setUt(false); }, 220);
    return () => window.clearTimeout(t);
  }, [aktiv, vist]);
  const Vis = VISNING[vist] || Oversikt;
  return (
    <div className="grid overflow-hidden rounded-[18px] text-[#15130F]" style={{ width: DW, height: DH, gridTemplateColumns: `${SIDE}px minmax(0,1fr)`, background: PAPIR, boxShadow: `0 0 0 1px ${HAIR2}, 0 40px 90px -40px rgba(21,19,15,0.28), 0 2px 6px -2px rgba(21,19,15,0.06)` }} data-testid="v4-system-portal" data-visning={vist}>
      {/* Sidepanelet — alle modulene */}
      <aside className="relative flex flex-col border-r px-3 pb-4 pt-5" style={{ borderColor: HAIR }}>
        <div className="px-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-[15px] w-auto" draggable={false} />
        </div>
        <button type="button" tabIndex={-1} className="mt-6 flex items-center justify-between rounded-[10px] px-2.5 py-2 text-[13px]" style={{ background: 'rgba(21,19,15,0.04)' }}>
          <span className="font-medium">Nygårdsgaten 5</span><ChevronDown size={14} style={{ color: DIM }} />
        </button>
        <nav className="relative mt-5 flex flex-col gap-px" aria-label="Moduler">
          {mark && <span aria-hidden="true" className="absolute left-0 right-0 rounded-[9px]" style={{ top: 0, height: mark.h, transform: `translateY(${mark.y}px)`, background: 'rgba(21,19,15,0.055)', transition: `transform 520ms ${EASE}, height 300ms ${EASE}` }} />}
          {MODULER.map((m) => {
            const er = m.id === aktiv;
            return (
              <button key={m.id} type="button" ref={(el) => { refs.current[m.id] = el; }} onClick={() => m.vis && onVelg(m.id)} tabIndex={m.vis ? 0 : -1} aria-current={er ? 'page' : undefined} className={`relative flex h-[34px] items-center justify-between rounded-[9px] px-2.5 text-[13px] ${m.vis ? 'cursor-pointer' : 'cursor-default'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/20`} style={{ color: er ? T.ink : m.vis ? 'rgba(21,19,15,0.62)' : 'rgba(21,19,15,0.40)', fontWeight: er ? 500 : 400, transition: `color 300ms ${EASE}` }} data-testid={`v4-modul-${m.id}`}>
                <span className="inline-flex items-center gap-2.5"><m.Ikon size={15} strokeWidth={1.75} style={{ opacity: er ? 1 : 0.7 }} />{m.navn}</span>
                {m.tall && <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-medium" style={{ background: T.lilla, color: T.ink }}>{m.tall}</span>}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-4 text-[13px]">
          <Avatar p={KARI} size={26} />
          <span className="min-w-0"><span className="block truncate font-medium">{KARI.navn}</span><span className="block text-[11.5px]" style={{ color: DIM }}>Eier · 1 eiendom</span></span>
        </div>
      </aside>

      {/* Hovedflaten */}
      <div className="flex min-w-0 flex-col">
        <div className="flex h-[52px] items-center justify-between px-7 text-[12.5px]" style={{ color: DIM }}>
          <span className="inline-flex items-center gap-2"><Search size={14} />Søk i alt</span>
          <span className="inline-flex items-center gap-4"><span className="tabular-nums">Torsdag 6. november</span><span className="relative inline-flex"><Bell size={15} /><span className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full" style={{ background: T.lilla, boxShadow: `0 0 0 2px ${PAPIR}` }} /></span></span>
        </div>
        <div className="min-h-0 flex-1 pb-8 pl-7 pr-16 pt-4" style={{ opacity: ut ? 0 : 1, transform: ut ? 'translateY(-6px)' : 'none', transition: ut ? `opacity 220ms ${EASE}, transform 220ms ${EASE}` : `opacity 520ms ${EASE} 40ms, transform 520ms ${EASE} 40ms` }}>
          <Vis />
        </div>
      </div>
    </div>
  );
}

/* ── Appen — leietakerens flate i en outline-ramme: én tynn strek, ingen bezel. Samme språk som portalen:
   luft, hårlinjer, tall i display, én aksent. ── */
const APP_W = 272; const APP_H = 620;
function App({ synlig }) {
  const [ny, setNy] = useState(false);
  useEffect(() => { if (!synlig) return undefined; const t = window.setTimeout(() => setNy(true), 2400); return () => window.clearTimeout(t); }, [synlig]);
  const rader = [
    { t: 'Sak · Ingen varmtvann', u: 'Løst · torsdag 09:58', hake: true },
    { t: 'Leiekontrakt', u: 'Signert med BankID · 3 år', p: { init: 'K' } },
    { t: 'Depositum', u: 'Garanti · 37 500 kr', p: { init: 'D' } },
  ];
  return (
    <div className="relative" style={{ width: APP_W, height: APP_H, borderRadius: 46, padding: 5, boxShadow: `0 0 0 1px rgba(21,19,15,0.18), 0 40px 90px -36px rgba(21,19,15,0.35), 0 2px 6px -2px rgba(21,19,15,0.08)` }} data-testid="v4-system-app">
      <div className="relative flex h-full flex-col overflow-hidden text-[#15130F]" style={{ borderRadius: 41, background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR2}` }}>
        <div className="px-5 pt-7">
          <div className="flex items-center justify-between">
            <Avatar p={EMMA} size={30} />
            <span className="relative inline-flex"><Bell size={16} style={{ color: DIM }} /><span className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full" style={{ background: T.lilla, boxShadow: `0 0 0 2px ${PAPIR}` }} /></span>
          </div>
          <p className="mt-6 text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>Hei, Emma.</p>
          <p className="mt-1.5 text-[12px]" style={{ color: DIM }}>Nygårdsgaten 5 · Leilighet 2</p>
          {/* Husleien — som et tall i portalen, ikke en boks */}
          <div className="mt-6 border-t pt-4" style={{ borderColor: HAIR }}>
            <p className="text-[11.5px]" style={{ color: DIM }}>Husleie · desember</p>
            <div className="mt-1.5 flex items-end justify-between gap-3">
              <span className="text-[30px] tabular-nums" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1 }}>{tall(12500)} kr</span>
              <span className="inline-flex h-8 items-center rounded-full px-3.5 text-[12.5px] font-medium" style={{ background: T.ink, color: T.offwhite }}>Betal</span>
            </div>
            <p className="mt-2 text-[11.5px]" style={{ color: DIM }}>Forfaller 1. desember</p>
          </div>
        </div>
        <div className="mt-4 flex-1 px-5">
          <p className="text-[11.5px] font-medium" style={{ color: DIM }}>I dag</p>
          {/* Melding som kommer inn — vokser fram, skyver listen under seg */}
          <div className="grid" style={{ gridTemplateRows: ny ? '1fr' : '0fr', transition: `grid-template-rows 650ms ${EASE}` }} aria-hidden={!ny} data-testid="v4-app-melding">
            <div className="min-h-0 overflow-hidden">
              <div className="flex items-center gap-2.5 py-2.5" style={{ opacity: ny ? 1 : 0, transform: ny ? 'none' : 'translateY(6px)', transition: `opacity 500ms ${EASE} 200ms, transform 650ms ${EASE} 200ms` }}>
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.24)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/digihome-icon-purple.svg" alt="" width={11} height={11} className="h-[11px] w-[11px]" draggable={false} />
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">Berederen er byttet</span><span className="block truncate text-[11.5px]" style={{ color: DIM }}>Si fra om noe ikke stemmer</span></span>
                <span className="shrink-0 text-[11px]" style={{ color: DIM }}>nå</span>
              </div>
            </div>
          </div>
          {rader.map((r, i) => (
            <div key={r.t} className="flex items-center gap-2.5 border-t py-2.5" style={{ borderColor: HAIR }}>
              {r.hake ? <Hake size={11} /> : <Avatar p={r.p} size={22} />}
              <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">{r.t}</span><span className="block truncate text-[11.5px]" style={{ color: r.hake ? GRONN : DIM }}>{r.u}</span></span>
              <ArrowUpRight size={13} style={{ color: 'rgba(21,19,15,0.3)' }} />
            </div>
          ))}
        </div>
        <div className="px-4 pb-2"><span className="inline-flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium" style={{ background: T.lilla, color: T.ink }}>Meld fra om noe</span></div>
        <div className="flex items-center justify-around px-4 pb-4 pt-2 text-[10px]" style={{ color: DIM }}>
          {[['Hjem', Home, true], ['Meldinger', MessageSquare], ['Dokumenter', FileText], ['Profil', User]].map(([n, Ikon, er]) => (
            <span key={n} className="inline-flex flex-col items-center gap-1" style={{ color: er ? T.ink : DIM }}><Ikon size={16} strokeWidth={1.75} />{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Skalerer portalen (designbredde DW) til bredden den får */
function PortalSkalert({ aktiv, onVelg, bredde }) {
  const s = Math.min(1, bredde / DW);
  return (
    <div style={{ width: Math.round(DW * s), height: Math.round(DH * s) }}>
      <div style={{ width: DW, height: DH, transform: `scale(${s})`, transformOrigin: '0 0' }}>
        <Portal aktiv={aktiv} onVelg={onVelg} />
      </div>
    </div>
  );
}

function useBredde() {
  const ref = useRef(null);
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const maal = () => setW(el.offsetWidth);
    maal();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maal) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  return [ref, W];
}

/* ── Løse detaljkort — det som «stikker ut» av portalen, i sonen der den tones bort ── */
function GodkjennKort() {
  return (
    <div className="rounded-[18px] p-4" style={{ width: 288, background: T.charcoal, color: T.offwhite, boxShadow: '0 40px 80px -30px rgba(21,19,15,0.55), 0 2px 8px -2px rgba(21,19,15,0.2)' }} data-testid="v4-system-godkjenn">
      <div className="flex items-center justify-between text-[11.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}><span className="inline-flex items-center gap-2"><Prikk tone="lilla" />Venter på deg</span><span className="tabular-nums">22:49</span></div>
      <p className="mt-3 text-[14.5px] font-medium">Ingen varmtvann · Leilighet 2</p>
      <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Rørlegger · torsdag 08–10 · Emma varsles</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[24px] tabular-nums" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3900)} kr</span>
        <span className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium" style={{ background: T.lilla, color: T.ink }}>Godkjenn</span>
      </div>
    </div>
  );
}
/* Rolig parallakse: 0 → 1 mens seksjonen går gjennom skjermen */
function useFremdrift(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    let raf = 0;
    const f = () => {
      raf = 0;
      const r = el.getBoundingClientRect(); const vh = window.innerHeight || 1;
      setP(Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))));
    };
    const on = () => { if (!raf) raf = window.requestAnimationFrame(f); };
    f();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) window.cancelAnimationFrame(raf); };
  }, [ref]);
  return p;
}

export default function SystemSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.16);
  const [sceneRef, W] = useBredde();
  const frem = useFremdrift(ref);
  const [aktiv, setAktiv] = useState('oversikt');
  const pause = useRef(0);
  /* Modulene bytter av seg selv mens seksjonen er i bildet; et trykk holder valget i 15 s */
  useEffect(() => {
    if (!synlig) return undefined;
    const t = window.setInterval(() => {
      if (Date.now() < pause.current) return;
      setAktiv((a) => VISNINGER[(VISNINGER.indexOf(a) + 1) % VISNINGER.length]);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [synlig]);
  const velg = (id) => { pause.current = Date.now() + 15000; setAktiv(id); };
  /* Entré (opacity + løft) og parallakse (lagene glir i ulik fart) i samme transform */
  const lag = (d, dy, fart) => ({ opacity: synlig ? 1 : 0, transform: synlig ? `translateY(${Math.round((0.5 - frem) * fart)}px)` : `translateY(${dy}px)`, transition: `opacity 900ms ${EASE} ${d}ms, transform ${synlig ? 500 : 1000}ms ${synlig ? 'cubic-bezier(0.2, 0.6, 0.2, 1)' : EASE} ${synlig ? 0 : d}ms`, willChange: 'transform, opacity' });

  /* Ingen scene, ingen boks: portalen ligger rett på flaten, venstrejustert, og tones ut mot bunnen (mask) —
     appen står foran til høyre, så vidt over portalens kant; to løse detaljkort står i sonen der portalen tones bort.
     Under 980 px stables de. */
  const bred = W >= 980;
  /* Smalt: portalen vises som et lesbart utsnitt (skalert 0,62, kuttet i bredden, tonet ut i bunnen) — appen er hovedsaken. */
  const portalB = bred ? Math.min(DW, W - (APP_W - 48)) : Math.max(W, Math.round(DW * 0.62));
  const s = Math.min(1, portalB / DW);
  const pw = Math.round(DW * s); const ph = Math.round(DH * s);
  const synligH = Math.round(ph * 0.82);
  const maske = bred ? 'linear-gradient(180deg, #000 0%, #000 56%, rgba(0,0,0,0.5) 74%, rgba(0,0,0,0) 100%)' : 'linear-gradient(180deg, #000 0%, #000 40%, rgba(0,0,0,0) 100%)';
  const utsnittH = bred ? ph : Math.round(ph * 0.5);
  const appTop = bred ? Math.max(72, synligH - APP_H + 40) : utsnittH - 56;
  const hoyde = bred ? Math.max(ph, appTop + APP_H) : appTop + APP_H;

  return (
    <section id="system" ref={ref} className="relative overflow-x-clip" style={{ background: T.canvas, color: T.ink }} data-testid="v4-system">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-6 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-10">
        <div ref={sceneRef} className="relative" style={{ height: W ? hoyde : undefined, minHeight: W ? undefined : 480 }} data-testid="v4-system-scene">
          {W > 0 && (
            <>
              {/* Et stille lys bak — så flatene svever uten boks */}
              <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: -120, right: -120, top: -80, height: Math.round(ph * 0.9), background: 'radial-gradient(60% 70% at 45% 35%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 100%)', opacity: synlig ? 1 : 0, transition: `opacity 1400ms ${EASE}` }} />
              <div className="absolute top-0" style={{ left: bred ? 0 : Math.round((W - pw) / 2), width: pw, height: ph, maskImage: maske, WebkitMaskImage: maske, ...lag(0, 24, 10) }}>
                <PortalSkalert aktiv={aktiv} onVelg={velg} bredde={portalB} />
              </div>
              {bred && (
                <>
                  <div className="absolute z-[2]" style={{ left: Math.round(pw * 0.22), top: Math.round(ph * 0.60), ...lag(260, 32, 46) }}>
                    <GodkjennKort />
                  </div>
                </>
              )}
              <div className="absolute z-[3]" style={{ left: bred ? undefined : Math.round((W - APP_W) / 2), right: bred ? 0 : undefined, top: appTop, ...lag(220, 40, bred ? 64 : 0) }}>
                <App synlig={synlig} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
