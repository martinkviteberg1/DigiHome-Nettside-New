'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   SALGSSKUFF — den minimalistiske lead-skuffen i verdensklasse-utgave.
   Tre soner: NESTE STEG (én stor knapp) · VÅRE ARGUMENTER (sjekkliste med
   bevis bak pilen) · UTFALL (fast bunnlinje). Alt avansert bor i den
   utvidede visningen. Designspråk: varm minimalisme — hvite kort på
   #faf9f7, hairline-delere, myke skygger, ingen glow.
   ═══════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Maximize2, Phone, Copy, Check, Sparkles, Loader2, Trophy, ExternalLink,
  ChevronRight, ChevronDown, CalendarClock, Hand, RotateCcw, Wand2, Eye,
  FileText, Image as ImageIcon, Banknote, ClipboardList, UserRound, Plus, Users,
} from 'lucide-react';
import { AnnonsorBadge } from './SalgPipeline';
import { bydelFraPostnr } from '@/lib/bydeler';

const heading = { fontFamily: 'var(--font-heading, inherit)', letterSpacing: '-0.012em' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0));
const kr = (v) => `${tall(v)} kr`;
const pent = (x) => String(x || '').toLowerCase().replace(/(^|[\s\-\/])([a-zæøå])/g, (m, f, b) => f + b.toUpperCase());
const fmtTlf = (t) => {
  const n = String(t || '').replace(/\s/g, '').replace(/^\+47/, '');
  return /^\d{8}$/.test(n) ? `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5)}` : String(t || '');
};
const initialer = (navn) => String(navn || '?').trim().split(/\s+/).map((d) => d[0]).slice(0, 2).join('').toUpperCase();
const AVATAR_FARGER = ['#6d28d9', '#0e7490', '#1f7a45', '#b45309', '#be185d', '#4338ca', '#0f766e'];
const avatarFarge = (id) => AVATAR_FARGER[[...String(id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_FARGER.length];

const TERMINALE = ['vunnet', 'tapt', 'ikke_relevant'];
const MEGLER_TYPER = ['megler', 'utleiemegleren'];
const LOP = ['ny', 'analysert', 'kontaktet', 'dialog', 'tilbud'];

const isoOmDager = (d) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(9, 0, 0, 0); return t.toISOString(); };
const nesteFredag = () => { const t = new Date(); const diff = (5 - t.getDay() + 7) % 7 || 7; return isoOmDager(diff); };

const STOR_KNAPP = 'group flex h-12 w-full items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold transition-all duration-150 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.995] disabled:opacity-50 disabled:hover:translate-y-0';
const STILLE = 'rounded-[7px] px-2 py-1 text-[12.5px] font-medium text-[#8a857c] transition-colors hover:bg-black/[0.04] hover:text-[#1c1917]';

/* ── Selger-avatar: profilbilde hvis det finnes, ellers initialer på gradient ── */
export function SelgerAvatar({ selger, storrelse = 32 }) {
  if (!selger) {
    return (
      <span className="flex items-center justify-center rounded-full border-[1.5px] border-dashed border-[#d6d2cb] bg-white text-[#b3aea6]"
        style={{ width: storrelse, height: storrelse }}>
        <Users style={{ width: storrelse * 0.44, height: storrelse * 0.44 }} />
      </span>
    );
  }
  if (selger.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={selger.avatar} alt={selger.navn || ''} className="rounded-full object-cover ring-1 ring-black/[0.06]" style={{ width: storrelse, height: storrelse }} />;
  }
  const f = avatarFarge(selger.id);
  return (
    <span className="flex items-center justify-center rounded-full font-bold text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.12)]"
      style={{ width: storrelse, height: storrelse, fontSize: Math.max(10, storrelse * 0.36), background: `linear-gradient(135deg, ${f}, ${f}c9)` }}>
      {initialer(selger.navn)}
    </span>
  );
}

/* ── Kompakt overlay-skall for bevisene ── */
function Overlay({ tittel, onLukk, children, bred = false }) {
  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-[#171412]/40 p-4 backdrop-blur-[3px]" onClick={onLukk}>
      <div className={`dh-scale-in flex max-h-[88vh] w-full ${bred ? 'max-w-[880px]' : 'max-w-[560px]'} flex-col rounded-[16px] bg-white shadow-[0_32px_80px_rgba(23,20,18,0.35)]`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h3 className="text-[15px] font-bold text-[#1c1917]" style={heading}>{tittel}</h3>
          <button onClick={onLukk} className="rounded-md p-1 text-[#a8a29a] transition-colors hover:bg-[#f4f2ee] hover:text-[#1c1917]" aria-label="Lukk"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Argumentrad: ikon-squircle + tittel + tilstand ── */
function ArgRad({ aktiv, Ikon, tone, tekst, sub, onClick, spinner = false, testid, hoyre = null }) {
  const Inner = (
    <>
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: aktiv ? tone.bg : '#f4f2ee', color: aktiv ? tone.c : '#b3aea6' }}>
        {spinner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ikon className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13.5px] leading-snug ${aktiv ? 'font-semibold text-[#1c1917]' : 'font-medium text-[#b3aea6]'}`}>{tekst}</span>
        {sub && <span className={`mt-0.5 block truncate text-[12px] leading-snug ${aktiv ? 'text-[#8a857c]' : 'text-[#c9c5be]'}`}>{sub}</span>}
      </span>
      {hoyre}
      {onClick ? <ChevronRight className={`h-4 w-4 shrink-0 ${aktiv ? 'text-[#b3aea6]' : 'text-[#ddd8d0]'}`} />
        : aktiv ? <Check className="h-4 w-4 shrink-0 text-[#1f7a45]" strokeWidth={2.5} /> : null}
    </>
  );
  if (!onClick) return <div className="flex items-center gap-3 px-3.5 py-3" data-testid={testid}>{Inner}</div>;
  return (
    <button onClick={onClick} data-testid={testid} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#faf9f7]">
      {Inner}
    </button>
  );
}

export default function SalgsSkuffEnkel({
  lead, aktor, selgere, statuser, media,
  analyserer, styStarter, styBusy, kopiert, meldingKopiert,
  onLukk, onUtvid, onUtvidTilbud, onAnalyser,
  onKopierMelding, onKopierLenke,
  onsketStatus, sendSalgsstatus, onTildel, onOppfolging, onOppdaterFelt,
  onStyle, onReview,
  onAapneFane = null, // satt i arbeidsrommet: ruter «bevis»-klikk til lerret-faner i stedet for overlays
}) {
  const [overlay, setOverlay] = useState(null); // 'bilder' | 'pris' | 'tekst' | 'data' | 'tilbud'
  const [utsettMeny, setUtsettMeny] = useState(false);
  const [selgerMeny, setSelgerMeny] = useState(false);
  const [vakt, setVakt] = useState(null); // {tekst, kanStyle, fortsett}
  const [redigerNavn, setRedigerNavn] = useState(false);
  const [navnUtkast, setNavnUtkast] = useState('');
  const navnRef = useRef(null);
  useEffect(() => { setOverlay(null); setUtsettMeny(false); setSelgerMeny(false); setVakt(null); setRedigerNavn(false); }, [lead?.id]);
  useEffect(() => { if (redigerNavn) navnRef.current?.focus(); }, [redigerNavn]);
  if (!lead) return null;

  // I arbeidsrommet (venstre rail) åpnes bilder/tilbud på lerretet — ikke som overlay
  const iRom = Boolean(onAapneFane);
  const aapneBilder = () => (iRom ? onAapneFane('bilder') : setOverlay('bilder'));
  const aapneTilbud = () => (iRom ? onAapneFane('tilbud') : setOverlay('tilbud'));

  const st = statuser.find((s) => s.k === lead.status) || statuser[0];
  const salg = lead.salg || {};
  const eier = salg.tildeltTil || null;
  const eierMedAvatar = eier ? { ...eier, avatar: selgere.find((s) => s.id === eier.id)?.avatar || '' } : null;
  const terminal = TERMINALE.includes(lead.status);
  const erMegler = MEGLER_TYPER.includes(lead.annonsor?.type);
  const autoAktiv = Boolean(lead.auto && ['analyserer', 'styler'].includes(lead.auto.status));
  const tlf = lead.kontaktTlf || '';
  const aapn = lead.aapninger || 0;
  const lopIdx = LOP.indexOf(lead.status);

  const kandidater = media.filter((m) => m.kandidat);
  const kjorer = media.filter((m) => m.kjorer);
  const klare = (lead.stylet || []).length;
  const ustylet = media.filter((m) => m.kildeOk && !m.ai && !m.kandidat && !m.kjorer).slice(0, 5).map((m) => m.kilde);

  // Argumentgrunnlag fra AI-analysen (deterministisk — ingen nye AI-kall)
  const d = lead.ai?.deler || null;
  const snitt = (nokler) => {
    if (!d) return null;
    const v = nokler.map((k) => d[k]).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const bilderScore = snitt(['visuell', 'opplosning', 'antall', 'orientering']);
  const anbefalt = Number(lead.analyse?.anbefaltLeie) || 0;
  const honorarPct = Number(lead.analyse?.honorarPct) || 8;
  const honorar = Math.round((anbefalt * honorarPct) / 100);
  const prisDiff = anbefalt && lead.pris ? anbefalt - lead.pris : 0;
  const argBilder = bilderScore != null ? bilderScore < 6 : klare > 0 || kandidater.length > 0;
  const argPris = Boolean(anbefalt && lead.pris && Math.abs(prisDiff) / lead.pris > 0.03);
  const argTekst = d?.tekst != null && d.tekst < 6 && Boolean(lead.ai?.annonseUtkast?.beskrivelse);
  const argData = d?.hygiene != null && d.hygiene < 6;
  const manglerData = [
    !lead.depositum && 'depositum', !lead.m2 && 'areal', !lead.soverom && 'soverom',
    !lead.etasje && 'etasje', !lead.mobler && 'møblering',
  ].filter(Boolean);

  const kutt = (() => {
    const h = [...(lead.prisHistorikk || [])].reverse().find((x) => Number(x.til) < Number(x.fra));
    if (!h || !h.at) return null;
    const dager = (Date.now() - new Date(h.at).getTime()) / 86400000;
    return dager <= 14 ? { pct: Math.round(((h.fra - h.til) / h.fra) * 100) } : null;
  })();

  const medVakt = (fortsett) => {
    if (kandidater.length) {
      setVakt({ tekst: `${kandidater.length} AI-bilde${kandidater.length === 1 ? '' : 'r'} venter på godkjenning — tilbudet blir sterkere med dem.`, kanStyle: false, fortsett });
      return;
    }
    if (!klare && !kjorer.length && ustylet.length) {
      setVakt({ tekst: 'Bildene er ikke løftet ennå — tilbudet blir sterkere med før/etter.', kanStyle: true, fortsett });
      return;
    }
    fortsett();
  };

  const sendTilbud = () => { onKopierLenke(); if (lead.status !== 'tilbud') onsketStatus(lead, 'tilbud'); };
  const lagreNavn = () => {
    const n = navnUtkast.trim();
    setRedigerNavn(false);
    if (n && n !== (lead.kontaktNavn || '')) onOppdaterFelt({ kontaktNavn: n });
  };

  /* ── NESTE STEG-motoren ── */
  const steg = (() => {
    if (autoAktiv || terminal) return null;
    if (erMegler) {
      return {
        tittel: 'Megler kjører annonsen',
        sub: `${lead.annonsor?.orgNavn || 'En profesjonell aktør'} har oppdraget — huseier nås ikke via FINN-annonsen.`,
        knapp: {
          label: 'Ikke relevant — feil segment', ikon: X, stil: 'border border-[#c2413b]/25 bg-white text-[#c2413b] shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:bg-[#fdf0ef]',
          gjor: () => sendSalgsstatus(lead.id, 'ikke_relevant', { arsak: { valg: 'Feil segment', tekst: `${lead.annonsor?.orgNavn || 'Megler'} kjører annonsen` } }),
        },
        stille: [{ label: meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding likevel', gjor: () => medVakt(onKopierMelding) }],
      };
    }
    if (!eier && aktor && aktor.id !== 'admin') {
      return {
        tittel: 'Ledig i poolen',
        sub: 'Ta leaden, så er den din — ingen andre selgere ser den etterpå.',
        knapp: { label: 'Ta lead', ikon: Hand, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black', gjor: () => onTildel(lead.id, aktor.id) },
        stille: [],
      };
    }
    if (lead.status === 'ny') {
      return {
        tittel: 'Ny annonse',
        sub: 'Kjør AI-analysen for score, argumenter og tilbudstekst.',
        knapp: { label: 'Kjør AI-analyse', ikon: Sparkles, spinner: analyserer, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black', gjor: onAnalyser },
        stille: [],
      };
    }
    if (lead.status === 'analysert') {
      return {
        tittel: kutt ? `Priskutt −${kutt.pct} % — motivert utleier` : 'Klar til kontakt',
        sub: kutt ? 'Utleier sliter med å få leid ut — perfekt timing for å ringe.' : (tlf ? `Ring ${lead.kontaktNavn || 'huseier'} — argumentene dine står under.` : 'Send FINN-meldingen — tilbudslenken ligger klar i teksten.'),
        knapp: tlf
          ? { label: `Ring ${fmtTlf(tlf)}`, ikon: Phone, href: `tel:${tlf}`, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black' }
          : { label: meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding', ikon: meldingKopiert ? Check : Copy, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black', gjor: () => medVakt(onKopierMelding) },
        stille: [
          ...(tlf ? [{ label: meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding', gjor: () => medVakt(onKopierMelding) }] : []),
          { label: 'Merk som kontaktet', gjor: () => onsketStatus(lead, 'kontaktet') },
        ],
      };
    }
    if (lead.status === 'kontaktet') {
      return {
        tittel: aapn > 0 ? `Tilbudet er åpnet ${aapn}× — følg opp` : 'Huseier er kontaktet',
        sub: 'Send tilbudslenken — den kopieres og leaden flyttes til «Tilbud sendt».',
        knapp: { label: kopiert ? 'Lenke kopiert!' : 'Send tilbud', ikon: kopiert ? Check : Copy, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black', gjor: () => medVakt(sendTilbud) },
        stille: [{ label: 'Huseier svarte', gjor: () => onsketStatus(lead, 'dialog') }],
      };
    }
    if (lead.status === 'dialog') {
      return {
        tittel: 'I dialog med huseier',
        sub: 'Få tilbudet ut mens interessen er varm.',
        knapp: { label: kopiert ? 'Lenke kopiert!' : 'Send tilbud', ikon: kopiert ? Check : Copy, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black', gjor: () => medVakt(sendTilbud) },
        stille: [...(tlf ? [{ label: `Ring ${fmtTlf(tlf)}`, href: `tel:${tlf}` }] : [])],
      };
    }
    return {
      tittel: aapn > 0 ? `Tilbudet er åpnet ${aapn}× — slå til nå` : 'Tilbud sendt — følg opp',
      sub: aapn > 0 ? 'Huseiere som nettopp har lest tilbudet er mest mottakelige.' : 'Gi det en dag eller to, og følg opp med en telefon.',
      knapp: tlf
        ? { label: `Ring ${fmtTlf(tlf)}`, ikon: Phone, href: `tel:${tlf}`, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black' }
        : { label: kopiert ? 'Lenke kopiert!' : 'Kopier tilbudslenke', ikon: kopiert ? Check : Copy, stil: 'bg-[#141414] text-white shadow-[0_10px_24px_-10px_rgba(20,20,20,0.6)] hover:bg-black', gjor: onKopierLenke },
      stille: [{ label: 'Huseier svarte', gjor: () => onsketStatus(lead, 'dialog') }],
    };
  })();

  const oppfolging = salg.oppfolging ? new Date(salg.oppfolging) : null;

  const bildeRad = (() => {
    if (kjorer.length) return { tekst: `Bedre bilder · styler ${Math.min(klare + kandidater.length + 1, klare + kandidater.length + kjorer.length)} av ${klare + kandidater.length + kjorer.length}…`, spinner: true, aktiv: true, onClick: aapneBilder };
    if (kandidater.length) return { tekst: 'Bedre bilder', sub: 'Godkjenn før/etter — kun godkjente brukes i tilbudet', aktiv: true, onClick: aapneBilder, hoyre: <span className="shrink-0 rounded-full bg-[#6d28d9] px-2 py-[2px] text-[10.5px] font-bold text-white">{kandidater.length} venter</span> };
    if (klare) return { tekst: `Bedre bilder · ${klare === 1 ? '1 klart' : `${klare} klare`}`, sub: 'Se før/etter — vis dem til huseier', aktiv: true, onClick: aapneBilder };
    if (argBilder && ustylet.length) return { tekst: 'Bedre bilder · ikke stylet ennå', sub: 'Ett trykk styler de 5 beste med AI', aktiv: true, onClick: aapneBilder };
    return { tekst: 'Bildene står sterkt', aktiv: false };
  })();

  const hero = (lead.bilder || [])[0] || null;

  // «Se over tilbudet» hører hjemme sammen med primærknappen — vises i
  // Neste steg-kortet så snart analysen (og dermed tilbudet) er klar.
  const seTilbudISteg = Boolean(steg && !erMegler && lead.ai);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#faf9f7]" data-testid="salgs-skuff-enkel">
      {/* ══ Hode: boligens «visittkort» ══ */}
      <div className="bg-white px-5 pb-3.5 pt-4 shadow-[0_1px_0_rgba(28,25,23,0.06)] sm:px-6">
        <div className="mx-auto w-full max-w-[600px]">
          <div className="flex items-start gap-3.5">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero} alt="" className="h-[60px] w-[60px] shrink-0 rounded-[14px] object-cover ring-1 ring-black/[0.07]" />
            ) : (
              <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[14px] bg-[#f4f2ee] text-[#c9c5be]"><ImageIcon className="h-5 w-5" /></span>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="truncate text-[19px] font-bold leading-tight" style={heading}>{pent(lead.adresse || lead.tittel)}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#8a857c]">
                <span className="font-semibold text-[#1c1917]" style={heading}>{kr(lead.pris)}<span className="font-medium text-[#a8a29a]">/mnd</span></span>
                {lead.m2 ? <span>{lead.m2} m²</span> : null}
                {lead.soverom ? <span>{lead.soverom} sov</span> : null}
                {(() => { const byd = bydelFraPostnr(lead.postnr); return byd ? <span className="rounded-full bg-[#f4f2ee] px-2 py-[2px] text-[11px] font-semibold text-[#57534e]" data-testid="skuff-bydel">{byd}</span> : null; })()}
                <AnnonsorBadge annonsor={lead.annonsor} liten />
                <a href={lead.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 font-semibold text-[#6d28d9] hover:underline">FINN <ExternalLink className="h-3 w-3" /></a>
                <span className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: st.farge }} data-testid="skuff-status">
                  <span className="h-[5px] w-[5px] rounded-full" style={{ background: st.farge }} />{st.l}
                </span>
              </p>
              {/* Utleier-linje: navn (eller legg til) + telefon.
                  Megler-annonser: kontakten er forvalteren, ikke huseier — skjules. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
                {erMegler ? (
                  <span className="text-[11.5px] text-[#a8a29a]" data-testid="skuff-megler-note">Annonsen kjøres av megler — huseiers kontaktinfo er ikke offentlig</span>
                ) : redigerNavn ? (
                  <span className="flex items-center gap-1.5">
                    <input ref={navnRef} value={navnUtkast} onChange={(e) => setNavnUtkast(e.target.value)} maxLength={60}
                      onKeyDown={(e) => { if (e.key === 'Enter') lagreNavn(); if (e.key === 'Escape') setRedigerNavn(false); }}
                      onBlur={lagreNavn} placeholder="Navn fra FINN-profilen …" data-testid="skuff-navn-input"
                      className="h-[26px] w-[190px] rounded-[7px] border border-[#6d28d9]/40 bg-white px-2 text-[12.5px] outline-none ring-2 ring-[#6d28d9]/10" />
                  </span>
                ) : lead.kontaktNavn ? (
                  <button onClick={() => { setNavnUtkast(lead.kontaktNavn); setRedigerNavn(true); }} title="Rediger navn" data-testid="skuff-navn"
                    className="flex items-center gap-1.5 rounded-full py-[2px] pl-[2px] pr-2 transition-colors hover:bg-[#f4f2ee]">
                    <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#e9e6e0] text-[9px] font-bold text-[#57534e]">{initialer(lead.kontaktNavn)}</span>
                    <span className="font-medium text-[#44403c]">{lead.kontaktNavn}{lead.kontaktTittel ? <span className="text-[#a8a29a]"> · {lead.kontaktTittel}</span> : null}</span>
                  </button>
                ) : (
                  <button onClick={() => { setNavnUtkast(''); setRedigerNavn(true); }} data-testid="skuff-navn-legg-til"
                    title="FINN viser utleiers navn kun for innloggede — lim det inn her"
                    className="flex items-center gap-1 rounded-full border border-dashed border-[#d6d2cb] px-2 py-[2px] text-[11.5px] font-medium text-[#a8a29a] transition-colors hover:border-[#6d28d9]/40 hover:text-[#6d28d9]">
                    <Plus className="h-3 w-3" /> Navn
                  </button>
                )}
                {!erMegler && tlf && <a href={`tel:${tlf}`} className="font-medium text-[#57534e] tabular-nums hover:text-[#1c1917] hover:underline">{fmtTlf(tlf)}</a>}
                {!erMegler && lead.kontaktEpost && <a href={`mailto:${lead.kontaktEpost}`} className="truncate font-medium text-[#57534e] hover:underline">{lead.kontaktEpost}</a>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {!iRom && (
                <button onClick={onUtvid} data-testid="skuff-utvid" title="Se alt om boligen"
                  className="rounded-lg p-2 text-[#a8a29a] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9]">
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
              {!iRom && (
                <button onClick={onLukk} data-testid="skuff-lukk" aria-label="Lukk"
                  className="rounded-lg p-2 text-[#a8a29a] transition-colors hover:bg-[#f4f2ee] hover:text-[#1c1917]">
                  <X className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          </div>
          {/* Segmentert fremdrift fjernet — status vises som chip i hodet,
              og «Neste steg» forteller uansett hvor du er i løpet. */}
        </div>
      </div>

      {/* ══ Innhold ══ */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[600px] px-5 pb-6 pt-4 sm:px-6">

          {lead.annonseAktiv === false && !terminal && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-black/[0.05] bg-white px-3.5 py-2.5" data-testid="skuff-deaktivert">
              <p className="min-w-0 flex-1 text-[12.5px] font-medium text-[#57534e]">Annonsen er tatt av FINN — trolig utleid eller trukket.</p>
              <button onClick={() => onsketStatus(lead, 'tapt')} className="shrink-0 text-[12.5px] font-semibold text-[#c2413b] hover:underline">Merk som tapt</button>
            </div>
          )}

          {/* NESTE STEG / auto / utfall */}
          {autoAktiv ? (
            <div className="rounded-[16px] border border-black/[0.05] bg-white px-5 py-7 text-center shadow-[0_1px_3px_rgba(28,25,23,0.05)]" data-testid="skuff-auto">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#8b5cf6]" />
              <p className="mt-2.5 text-[14px] font-bold text-[#1c1917]" style={heading}>AI-en analyserer annonsen</p>
              <p className="mt-1 text-[12px] text-[#8a857c]">Tar 15–40 sekunder — du kan trygt lukke og komme tilbake.</p>
            </div>
          ) : terminal ? (
            <div className={`rounded-[16px] border px-5 py-5 shadow-[0_1px_3px_rgba(28,25,23,0.05)] ${lead.status === 'vunnet' ? 'border-[#1f7a45]/15 bg-[#f2f9f4]' : 'border-black/[0.05] bg-white'}`} data-testid="skuff-utfall">
              {lead.status === 'vunnet' && salg.vunnet ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1f7a45] text-white shadow-[0_6px_16px_-6px_rgba(31,122,69,0.6)]"><Trophy className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#1f7a45]" style={heading}>Vunnet av {salg.vunnet.selger?.navn || 'selger'}</p>
                    <p className="mt-0.5 text-[12.5px] text-[#57534e]">Provisjon <b className="text-[#1f7a45]">{kr(salg.vunnet.provisjon)}</b> · grunnlag {kr(salg.vunnet.grunnlag)} · {new Date(salg.vunnet.at).toLocaleDateString('nb-NO')}</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[15px] font-bold text-[#57534e]" style={heading}>{st.l}</p>
                  {salg.arsak?.valg && <p className="mt-1 text-[12.5px] text-[#8a857c]">{salg.arsak.valg}{salg.arsak.tekst ? ` — ${salg.arsak.tekst}` : ''}</p>}
                </>
              )}
              {aktor?.erLeder && (
                <button onClick={() => onsketStatus(lead, 'dialog')} data-testid="skuff-gjenaapne"
                  className="mt-3 flex h-[28px] items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[12px] font-medium text-[#57534e] transition-colors hover:border-black/20">
                  <RotateCcw className="h-3 w-3" /> Gjenåpne
                </button>
              )}
            </div>
          ) : steg ? (
            <div className="rounded-[16px] border border-black/[0.05] bg-white px-4 py-4 shadow-[0_1px_3px_rgba(28,25,23,0.05)] sm:px-5" data-testid="skuff-steg">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#a8a29a]">
                <span className="relative flex h-[6px] w-[6px]">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6d28d9]/40" />
                  <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-[#6d28d9]" />
                </span>
                Neste steg
              </p>
              <p className="mt-2 text-[17px] font-bold leading-snug text-[#1c1917]" style={heading}>{steg.tittel}</p>
              {steg.sub && <p className="mt-1 text-[12.5px] leading-relaxed text-[#8a857c]">{steg.sub}</p>}
              <div className="mt-4 space-y-2">
                {seTilbudISteg && (
                  <button onClick={aapneTilbud} data-testid="skuff-se-tilbud"
                    className="flex h-12 w-full items-center gap-2.5 rounded-[12px] border border-black/[0.08] bg-white px-3 text-left shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-all hover:border-black/[0.18] hover:bg-[#faf9f7]">
                    <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-[#f4f2ee] text-[#57534e]"><FileText className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#1c1917]">Se over tilbudet</span>
                      <span className="block truncate text-[10.5px] text-[#a8a29a]">Slik huseier ser det</span>
                    </span>
                    {aapn > 0 && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#e6f3f6] px-2 py-[3px] text-[11px] font-bold text-[#0e7490]"><Eye className="h-3 w-3" />{aapn}</span>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#b3aea6]" />
                  </button>
                )}
                {steg.knapp.href ? (
                  <a href={steg.knapp.href} data-testid="skuff-stor-knapp" className={`${STOR_KNAPP} ${steg.knapp.stil}`}>
                    <steg.knapp.ikon className="h-4 w-4" /> {steg.knapp.label}
                  </a>
                ) : (
                  <button onClick={steg.knapp.gjor} disabled={steg.knapp.spinner} data-testid="skuff-stor-knapp" className={`${STOR_KNAPP} ${steg.knapp.stil}`}>
                    {steg.knapp.spinner ? <Loader2 className="h-4 w-4 animate-spin" /> : <steg.knapp.ikon className="h-4 w-4" />} {steg.knapp.label}
                  </button>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1">
                {steg.stille.map((s) => (s.href ? (
                  <a key={s.label} href={s.href} className={STILLE}>{s.label}</a>
                ) : (
                  <button key={s.label} onClick={s.gjor} className={STILLE}>{s.label}</button>
                )))}
                <span className="relative ml-auto">
                  <button onClick={() => setUtsettMeny((v) => !v)} data-testid="skuff-utsett"
                    className={`flex items-center gap-1 ${STILLE} ${oppfolging ? 'text-[#0e7490]' : ''}`}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    {oppfolging ? `Utsatt til ${oppfolging.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}` : 'Utsett'}
                  </button>
                  {utsettMeny && (
                    <>
                      <div className="fixed inset-0 z-[150]" onClick={() => setUtsettMeny(false)} />
                      <div className="dh-scale-in absolute right-0 z-[151] mt-1 w-[172px] rounded-[12px] border border-black/[0.07] bg-white py-1 shadow-[0_14px_40px_rgba(23,20,18,0.14)]">
                        {[['I morgen', isoOmDager(1)], ['På fredag', nesteFredag()], ['Neste uke', isoOmDager(7)]].map(([l, iso]) => (
                          <button key={l} onClick={() => { onOppfolging(lead.id, iso); setUtsettMeny(false); }}
                            className="block w-full px-3 py-1.5 text-left text-[12.5px] text-[#57534e] transition-colors hover:bg-[#f7f6f3]">{l}</button>
                        ))}
                        {oppfolging && (
                          <button onClick={() => { onOppfolging(lead.id, null); setUtsettMeny(false); }}
                            className="block w-full border-t border-black/[0.05] px-3 py-1.5 text-left text-[12.5px] text-[#c2413b] transition-colors hover:bg-[#fdf0ef]">Fjern utsettelse</button>
                        )}
                      </div>
                    </>
                  )}
                </span>
              </div>
            </div>
          ) : null}

          {/* ══ SELGER — én rolig linje; leder kan trykke for å tildele ══ */}
          <div className="relative mt-3 px-1">
            <button
              onClick={() => aktor?.erLeder && setSelgerMeny((v) => !v)}
              disabled={!aktor?.erLeder}
              data-testid="skuff-selger"
              className={`flex max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-medium transition-colors ${aktor?.erLeder ? 'hover:bg-[#f4f2ee]' : 'cursor-default'} ${eier ? 'text-[#57534e]' : 'text-[#a8a29a]'}`}>
              <SelgerAvatar selger={eierMedAvatar} storrelse={20} />
              <span className="truncate">{eier ? eier.navn : 'I poolen — ingen selger'}</span>
              {aktor?.erLeder && <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#c9c4bd] transition-transform ${selgerMeny ? 'rotate-180' : ''}`} />}
            </button>
            {selgerMeny && (
              <>
                <div className="fixed inset-0 z-[150]" onClick={() => setSelgerMeny(false)} />
                <div className="dh-scale-in absolute left-0 z-[151] mt-1.5 w-[280px] overflow-hidden rounded-[14px] border border-black/[0.07] bg-white py-1.5 shadow-[0_18px_50px_rgba(23,20,18,0.16)]" data-testid="skuff-selger-meny">
                  <p className="px-3.5 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#b3aea6]">Tildel selger</p>
                  {selgere.map((s) => (
                    <button key={s.id} onClick={() => { onTildel(lead.id, s.id); setSelgerMeny(false); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-[#f7f6f3]">
                      <SelgerAvatar selger={s} storrelse={26} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#1c1917]">{s.navn}</span>
                        {s.provisjonssats > 0 && <span className="block text-[10.5px] text-[#a8a29a]">{s.provisjonssats} % provisjon</span>}
                      </span>
                      {eier?.id === s.id && <Check className="h-4 w-4 shrink-0 text-[#1f7a45]" />}
                    </button>
                  ))}
                  {!selgere.length && <p className="px-3.5 py-2 text-[12px] text-[#a8a29a]">Ingen selgere har Salgsradar-tilgang ennå.</p>}
                  {eier && (
                    <button onClick={() => { onTildel(lead.id, null); setSelgerMeny(false); }}
                      className="mt-1 flex w-full items-center gap-2.5 border-t border-black/[0.05] px-3.5 py-2 text-left text-[12.5px] font-medium text-[#8a857c] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917]">
                      <SelgerAvatar selger={null} storrelse={26} /> Legg tilbake i poolen
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ══ VÅRE ARGUMENTER — kun det som faktisk krever handling ══ */}
          {(() => {
            const rader = [];
            if (bildeRad.aktiv) rader.push(
              <ArgRad key="bilder" aktiv Ikon={ImageIcon} tone={{ bg: '#f3eefc', c: '#6d28d9' }}
                tekst={bildeRad.tekst} sub={bildeRad.sub} spinner={bildeRad.spinner} onClick={bildeRad.onClick} hoyre={bildeRad.hoyre || null} testid="arg-bilder" />
            );
            if (argPris) rader.push(
              <ArgRad key="pris" aktiv Ikon={Banknote} tone={{ bg: '#eef6f0', c: '#1f7a45' }}
                tekst={`Riktigere pris · ${kr(anbefalt)}/mnd`}
                sub={prisDiff > 0 ? `${kr(prisDiff)} mer enn i dag — huseier taper penger nå` : `${kr(Math.abs(prisDiff))} under dagens — derfor står den tom`}
                onClick={anbefalt ? () => setOverlay('pris') : undefined} testid="arg-pris" />
            );
            if (argTekst) rader.push(
              <ArgRad key="tekst" aktiv Ikon={FileText} tone={{ bg: '#fdf3e0', c: '#9a6b1c' }}
                tekst="Ny annonsetekst" sub="Profesjonelt utkast ligger klart — vis huseier"
                onClick={lead.ai?.annonseUtkast?.beskrivelse ? () => setOverlay('tekst') : undefined} testid="arg-tekst" />
            );
            if (argData) rader.push(
              <ArgRad key="data" aktiv Ikon={ClipboardList} tone={{ bg: '#eef4f6', c: '#0e7490' }}
                tekst={`Annonsedata mangler${manglerData.length ? ` · ${manglerData.slice(0, 2).join(', ')}${manglerData.length > 2 ? ' m.m.' : ''}` : ''}`}
                onClick={manglerData.length ? () => setOverlay('data') : undefined} testid="arg-data" />
            );
            return (
              <div className="mt-5" data-testid="skuff-argumenter">
                <p className="px-1 pb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#a8a29a]">Våre argumenter</p>
                {!lead.ai ? (
                  <div className="rounded-[14px] border border-dashed border-[#ddd8d0] px-4 py-4 text-center">
                    <p className="text-[12.5px] text-[#a8a29a]">Kjør AI-analysen for å få argumentene for denne boligen.</p>
                  </div>
                ) : rader.length ? (
                  <div className="divide-y divide-black/[0.04] overflow-hidden rounded-[14px] border border-black/[0.05] bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04)]">{rader}</div>
                ) : (
                  <p className="flex items-center gap-2 rounded-[14px] border border-black/[0.05] bg-white px-4 py-3.5 text-[12.5px] text-[#8a857c] shadow-[0_1px_3px_rgba(28,25,23,0.04)]" data-testid="skuff-arg-alt-ok">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#1f7a45]" /> Annonsen står sterkt — bilder, pris, tekst og data ser riktige ut.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Se over tilbudet — nederst kun når det ikke allerede står i Neste steg-kortet */}
          {!seTilbudISteg && (
            <button onClick={aapneTilbud} data-testid="skuff-se-tilbud-bunn"
              className="mt-3 flex w-full items-center gap-3 rounded-[14px] border border-black/[0.05] bg-white px-3.5 py-3 text-left shadow-[0_1px_3px_rgba(28,25,23,0.04)] transition-all hover:border-black/[0.12] hover:shadow-[0_2px_8px_rgba(28,25,23,0.07)]">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#141414] text-white"><FileText className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-[#1c1917]">Se over tilbudet</span>
                <span className="block text-[11px] text-[#a8a29a]">Slik huseier ser det — bygget av argumentene over</span>
              </span>
              {aapn > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#e6f3f6] px-2 py-[3px] text-[11px] font-bold text-[#0e7490]"><Eye className="h-3 w-3" />{aapn}</span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-[#b3aea6]" />
            </button>
          )}
        </div>
      </div>

      {/* ══ Bunnlinje: utfall + rømningsvei ══ */}
      <div className="border-t border-black/[0.06] bg-white/85 px-5 py-2.5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-[600px] items-center gap-1.5">
          {!terminal && (
            <>
              <button onClick={() => onsketStatus(lead, 'vunnet')} data-testid="skuff-vunnet"
                className="flex h-[32px] items-center gap-1.5 rounded-full bg-[#1f7a45] px-3.5 text-[12.5px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(31,122,69,0.55)] transition-all hover:bg-[#196a3b] active:scale-[0.98]">
                <Trophy className="h-3.5 w-3.5" /> Vunnet
              </button>
              <button onClick={() => onsketStatus(lead, 'tapt')} data-testid="skuff-tapt"
                className="h-[32px] rounded-full px-2.5 text-[12.5px] font-medium text-[#c2413b] transition-colors hover:bg-[#fdf0ef]">Tapt</button>
              <button onClick={() => onsketStatus(lead, 'ikke_relevant')} data-testid="skuff-ikke-relevant"
                className="h-[32px] rounded-full px-2.5 text-[12.5px] font-medium text-[#8a857c] transition-colors hover:bg-[#f4f2ee]">Ikke relevant</button>
            </>
          )}
          {!iRom && (
            <button onClick={onUtvid} data-testid="skuff-se-alt" className="ml-auto flex items-center gap-1 text-[12.5px] font-medium text-[#8a857c] transition-colors hover:text-[#1c1917]">
              Se alt om boligen <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ══ Vaktbikkja ══ */}
      {vakt && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#171412]/40 p-4 backdrop-blur-[3px]" onClick={() => setVakt(null)}>
          <div className="dh-scale-in w-full max-w-[420px] rounded-[16px] bg-white p-5 shadow-[0_28px_70px_rgba(23,20,18,0.32)]" onClick={(e) => e.stopPropagation()} data-testid="skuff-vakt">
            <p className="text-[14.5px] font-bold text-[#1c1917]" style={heading}>Vent litt —</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#57534e]">{vakt.tekst}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={() => { const f = vakt.fortsett; setVakt(null); f(); }} data-testid="vakt-send-likevel"
                className="h-[32px] rounded-[9px] px-3 text-[12.5px] font-medium text-[#78716c] transition-colors hover:bg-[#f4f2ee]">Send likevel</button>
              {vakt.kanStyle ? (
                <button onClick={() => { onStyle(lead.id, ustylet); setVakt(null); }} disabled={styStarter} data-testid="vakt-style"
                  className="flex h-[32px] items-center gap-1.5 rounded-[9px] bg-[#141414] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black disabled:opacity-50">
                  {styStarter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Style nå
                </button>
              ) : (
                <button onClick={() => { setVakt(null); aapneBilder(); }} data-testid="vakt-godkjenn"
                  className="flex h-[32px] items-center gap-1.5 rounded-[9px] bg-[#141414] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black">
                  <Check className="h-3.5 w-3.5" /> Godkjenn nå
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Bevis-overlays ══ */}
      {overlay === 'bilder' && (
        <Overlay tittel="Bildene — før og etter" onLukk={() => setOverlay(null)} bred>
          {ustylet.length > 0 && !kandidater.length && !kjorer.length && !klare ? (
            <div className="rounded-[12px] bg-[#f7f6f3] px-4 py-5 text-center">
              <p className="text-[13px] text-[#57534e]">Ingen bilder er stylet ennå.</p>
              <button onClick={() => onStyle(lead.id, ustylet)} disabled={styStarter} data-testid="bilder-style-btn"
                className="mx-auto mt-3 flex h-10 items-center gap-2 rounded-[10px] bg-[#141414] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(20,20,20,0.5)] transition-all hover:-translate-y-[1px] hover:bg-black disabled:opacity-50">
                {styStarter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Style de {ustylet.length} beste
              </button>
              <p className="mt-2 text-[11px] text-[#a8a29a]">Kjører i bakgrunnen — du godkjenner før noe brukes i tilbudet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ustylet.length > 0 && (kandidater.length > 0 || klare > 0) && (
                <button onClick={() => onStyle(lead.id, ustylet)} disabled={styStarter}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-3 text-[12px] font-medium text-[#57534e] transition-colors hover:border-black/20 disabled:opacity-50">
                  {styStarter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Style {ustylet.length} til
                </button>
              )}
              {media.filter((m) => m.kandidat || m.ai || m.kjorer).map((m) => (
                <div key={m.kilde} className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Original</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.kilde} alt="" className="h-[170px] w-full rounded-[12px] object-cover" />
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#1f7a45]">
                      {m.kjorer ? 'Styler …' : m.kandidat ? 'AI-forslag' : 'Godkjent'}
                    </p>
                    {m.kjorer ? (
                      <div className="flex h-[170px] w-full items-center justify-center rounded-[12px] bg-[#f4f2ee]"><Loader2 className="h-5 w-5 animate-spin text-[#8b5cf6]" /></div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.kandidat?.url || m.ai?.url} alt="" className="h-[170px] w-full rounded-[12px] object-cover" />
                    )}
                    {m.kandidat && (
                      <div className="mt-1.5 flex gap-1.5">
                        <button onClick={() => onReview(lead.id, m.kandidat.jobb.id, 'godkjenn')} disabled={Boolean(styBusy)} data-testid={`godkjenn-${m.kandidat.jobb.id}`}
                          className="flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#1f7a45] text-[12.5px] font-semibold text-white transition-colors hover:bg-[#196a3b] disabled:opacity-50">
                          {styBusy === m.kandidat.jobb.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Godkjenn
                        </button>
                        <button onClick={() => onReview(lead.id, m.kandidat.jobb.id, 'forkast')} disabled={Boolean(styBusy)}
                          className="h-[30px] rounded-[8px] border border-black/[0.08] bg-white px-3 text-[12.5px] font-medium text-[#78716c] transition-colors hover:border-black/20 disabled:opacity-50">
                          Forkast
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-[11px] text-[#a8a29a]">Flere stiler og finjustering finner du i <button onClick={() => { setOverlay(null); onUtvid(); }} className="font-semibold text-[#6d28d9] hover:underline">full visning</button>.</p>
        </Overlay>
      )}

      {overlay === 'pris' && (
        <Overlay tittel="Prisargumentet" onLukk={() => setOverlay(null)}>
          <p className="text-[26px] font-bold text-[#1c1917]" style={heading}>{kr(anbefalt - honorar)}<span className="ml-1 text-[13px] font-medium text-[#a8a29a]">/mnd til huseier</span></p>
          <dl className="mt-4 space-y-2.5 border-t border-black/[0.06] pt-3.5">
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">Dagens annonserte leie</dt><dd className="font-semibold text-[#1c1917] tabular-nums">{kr(lead.pris)}/mnd</dd></div>
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">Vår anbefalte leie</dt><dd className="font-semibold text-[#1c1917] tabular-nums">{kr(anbefalt)}/mnd</dd></div>
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">DigiHome-honorar ({honorarPct} % eks. mva)</dt><dd className="text-[#78716c] tabular-nums">−{kr(honorar)}</dd></div>
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">Differanse mot i dag</dt>
              <dd className={`font-semibold tabular-nums ${anbefalt - honorar - lead.pris >= 0 ? 'text-[#1f7a45]' : 'text-[#c2413b]'}`}>{anbefalt - honorar - lead.pris >= 0 ? '+' : '−'}{kr(Math.abs(anbefalt - honorar - lead.pris))}/mnd</dd></div>
          </dl>
          <p className="mt-4 rounded-[12px] bg-[#f7f6f3] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#57534e]">
            💬 «Vi mener boligen kan gi <b>{kr(anbefalt)}</b> i måneden. Etter honoraret sitter du igjen med <b>{kr(anbefalt - honorar)}</b> — uten jobb, uten risiko, med garanti.»
          </p>
        </Overlay>
      )}

      {overlay === 'tekst' && lead.ai?.annonseUtkast && (
        <Overlay tittel="Ny annonsetekst — vårt utkast" onLukk={() => setOverlay(null)}>
          <p className="text-[15px] font-bold text-[#1c1917]" style={heading}>{lead.ai.annonseUtkast.tittel}</p>
          <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#44403c]">{lead.ai.annonseUtkast.beskrivelse}</p>
          {Array.isArray(lead.ai.annonseUtkast.hoydepunkter) && lead.ai.annonseUtkast.hoydepunkter.length > 0 && (
            <ul className="mt-3 space-y-1">
              {lead.ai.annonseUtkast.hoydepunkter.map((h) => (
                <li key={h} className="flex items-start gap-2 text-[12.5px] text-[#57534e]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1f7a45]" />{h}</li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-[#a8a29a]">Rediger utkastet i <button onClick={() => { setOverlay(null); if (iRom) onAapneFane('tilbud'); else onUtvid(); }} className="font-semibold text-[#6d28d9] hover:underline">full visning</button>.</p>
        </Overlay>
      )}

      {overlay === 'data' && (
        <Overlay tittel="Mangelfull annonsedata" onLukk={() => setOverlay(null)}>
          <p className="text-[13px] leading-relaxed text-[#57534e]">Annonsen mangler opplysninger leietakere ser etter — et enkelt argument for at proff forvaltning gir bedre annonser:</p>
          <ul className="mt-3 space-y-1.5">
            {manglerData.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[13px] font-medium text-[#1c1917]"><span className="h-[6px] w-[6px] rounded-full bg-[#c2413b]" />Mangler {f}</li>
            ))}
            {!manglerData.length && <li className="text-[12.5px] text-[#a8a29a]">AI-en vurderte datakvaliteten som svak (uspesifisert).</li>}
          </ul>
        </Overlay>
      )}

      {overlay === 'tilbud' && (
        <Overlay tittel="Slik ser huseier tilbudet" onLukk={() => setOverlay(null)} bred>
          <div className="overflow-hidden rounded-[12px] border border-black/[0.08] bg-[#f4f2ee]">
            <iframe src={`/tilbud/${lead.tilbudSlug}?preview=1`} title="Forhåndsvisning av tilbudet" className="w-full" style={{ height: 'min(64vh, 640px)' }} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-[#a8a29a]">Forhåndsvisningen teller ikke som åpning hos huseier.</p>
            <span className="flex items-center gap-3">
              <a href={`/tilbud/${lead.tilbudSlug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12.5px] font-semibold text-[#6d28d9] hover:underline">Åpne <ExternalLink className="h-3 w-3" /></a>
              <button onClick={() => { setOverlay(null); onUtvidTilbud(); }} data-testid="tilbud-rediger" className="text-[12.5px] font-semibold text-[#6d28d9] hover:underline">Rediger tilbudet</button>
            </span>
          </div>
        </Overlay>
      )}
    </div>
  );
}
