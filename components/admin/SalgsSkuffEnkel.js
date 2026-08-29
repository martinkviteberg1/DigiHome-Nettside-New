'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   SALGSSKUFF — den minimalistiske lead-skuffen. Tre soner:
   1) NESTE STEG: én stor knapp, statusdrevet — handlingene setter status
   2) VÅRE ARGUMENTER: sjekkliste bygget av AI-analysen (bevis bak pilen)
   3) UTFALL: Vunnet / Tapt / Ikke relevant — alltid nederst
   Alt avansert (faner, bildestyling-valg, tilbudsredigering) bor i den
   utvidede visningen («Se alt om boligen» / ⤢). Skuffen selger, fullskjermen
   redigerer.
   ═══════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import {
  X, Maximize2, Phone, Copy, Check, Sparkles, Loader2, Trophy, ExternalLink,
  ChevronRight, CalendarClock, Hand, RotateCcw, Wand2, Eye, FileText,
} from 'lucide-react';
import { AnnonsorBadge } from './SalgPipeline';

const heading = { fontFamily: 'var(--font-heading, inherit)', letterSpacing: '-0.012em' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0));
const kr = (v) => `${tall(v)} kr`;
const pent = (x) => String(x || '').toLowerCase().replace(/(^|[\s\-\/])([a-zæøå])/g, (m, f, b) => f + b.toUpperCase());
const fmtTlf = (t) => {
  const n = String(t || '').replace(/\s/g, '').replace(/^\+47/, '');
  return /^\d{8}$/.test(n) ? `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5)}` : String(t || '');
};
const TERMINALE = ['vunnet', 'tapt', 'ikke_relevant'];
const MEGLER_TYPER = ['megler', 'utleiemegleren'];

// Utsett-datoer: alltid kl. 09 lokal tid
const isoOmDager = (d) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(9, 0, 0, 0); return t.toISOString(); };
const nesteFredag = () => { const t = new Date(); const diff = (5 - t.getDay() + 7) % 7 || 7; return isoOmDager(diff); };

const STOR_KNAPP = 'flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-4 text-[14px] font-semibold transition-all active:scale-[0.99] disabled:opacity-50';
const STILLE = 'rounded-[7px] px-2 py-1 text-[12.5px] font-medium text-[#8a857c] transition-colors hover:bg-[#f4f2ee] hover:text-[#1c1917]';

/* ── Kompakt overlay-skall for bevisene (bilder/pris/tekst/tilbud) ── */
function Overlay({ tittel, onLukk, children, bred = false }) {
  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" onClick={onLukk}>
      <div className={`flex max-h-[88vh] w-full ${bred ? 'max-w-[880px]' : 'max-w-[560px]'} flex-col rounded-[14px] bg-white shadow-[0_28px_70px_rgba(28,25,23,0.3)]`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h3 className="text-[15px] font-bold text-[#1c1917]" style={heading}>{tittel}</h3>
          <button onClick={onLukk} className="rounded-md p-1 text-[#a8a29a] transition-colors hover:bg-[#f4f2ee] hover:text-[#1c1917]" aria-label="Lukk"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Én argumentrad: hake/ring + tekst + pil ── */
function ArgRad({ aktiv, tekst, sub, onClick, spinner = false, testid }) {
  const Inner = (
    <>
      {spinner ? (
        <Loader2 className="mt-[3px] h-4 w-4 shrink-0 animate-spin text-[#8b5cf6]" />
      ) : aktiv ? (
        <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1f7a45] text-white"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
      ) : (
        <span className="mt-[3px] h-4 w-4 shrink-0 rounded-full border-[1.5px] border-[#ddd8d0]" />
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-[13.5px] leading-snug ${aktiv ? 'font-semibold text-[#1c1917]' : 'font-medium text-[#b3aea6]'}`}>{tekst}</span>
        {sub && <span className={`mt-0.5 block text-[12px] leading-snug ${aktiv ? 'text-[#8a857c]' : 'text-[#c2beb8]'}`}>{sub}</span>}
      </span>
      {onClick && <ChevronRight className={`mt-1 h-4 w-4 shrink-0 ${aktiv ? 'text-[#a8a29a]' : 'text-[#ddd8d0]'}`} />}
    </>
  );
  if (!onClick) return <div className="flex items-start gap-2.5 px-1 py-2" data-testid={testid}>{Inner}</div>;
  return (
    <button onClick={onClick} data-testid={testid}
      className="flex w-full items-start gap-2.5 rounded-[9px] px-1 py-2 text-left transition-colors hover:bg-[#f7f6f3]">
      {Inner}
    </button>
  );
}

export default function SalgsSkuffEnkel({
  lead, aktor, selgere, statuser, media,
  analyserer, styStarter, styBusy, kopiert, meldingKopiert,
  onLukk, onUtvid, onUtvidTilbud, onAnalyser,
  onKopierMelding, onKopierLenke,
  onsketStatus, sendSalgsstatus, onTildel, onOppfolging,
  onStyle, onReview,
}) {
  const [overlay, setOverlay] = useState(null); // 'bilder' | 'pris' | 'tekst' | 'data' | 'tilbud'
  const [utsettMeny, setUtsettMeny] = useState(false);
  const [vakt, setVakt] = useState(null); // {tekst, kanStyle, fortsett}
  useEffect(() => { setOverlay(null); setUtsettMeny(false); setVakt(null); }, [lead?.id]);
  if (!lead) return null;

  const st = statuser.find((s) => s.k === lead.status) || statuser[0];
  const salg = lead.salg || {};
  const eier = salg.tildeltTil || null;
  const terminal = TERMINALE.includes(lead.status);
  const erMegler = MEGLER_TYPER.includes(lead.annonsor?.type);
  const autoAktiv = Boolean(lead.auto && ['analyserer', 'styler'].includes(lead.auto.status));
  const tlf = lead.kontaktTlf || '';
  const aapn = lead.aapninger || 0;

  // Bildestatus fra media (beregnet i forelderen)
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

  // Ferskt priskutt (<14 d) = motivert utleier — intern selgerinnsikt
  const kutt = (() => {
    const h = [...(lead.prisHistorikk || [])].reverse().find((x) => Number(x.til) < Number(x.fra));
    if (!h || !h.at) return null;
    const dager = (Date.now() - new Date(h.at).getTime()) / 86400000;
    return dager <= 14 ? { pct: Math.round(((h.fra - h.til) / h.fra) * 100) } : null;
  })();

  /* ── Vaktbikkja: stopp utsendelse når bildene ikke er klare ── */
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

  /* ── NESTE STEG-motoren ── */
  const steg = (() => {
    if (autoAktiv || terminal) return null;
    // Megler har oppdraget → ærlig beskjed, «Ikke relevant» som hovedvalg
    if (erMegler) {
      return {
        tittel: 'Megler kjører annonsen',
        sub: `${lead.annonsor?.orgNavn || 'En profesjonell aktør'} har oppdraget — huseier nås ikke via FINN-annonsen.`,
        knapp: {
          label: 'Ikke relevant — feil segment', ikon: X, stil: 'border border-[#c2413b]/30 bg-white text-[#c2413b] hover:bg-[#fdf0ef]',
          gjor: () => sendSalgsstatus(lead.id, 'ikke_relevant', { arsak: { valg: 'Feil segment', tekst: `${lead.annonsor?.orgNavn || 'Megler'} kjører annonsen` } }),
        },
        stille: [{ label: meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding likevel', gjor: () => medVakt(onKopierMelding) }],
      };
    }
    // Ledig i poolen → «Ta lead» ER neste steg (for alle med egen konto)
    if (!eier && aktor && aktor.id !== 'admin') {
      return {
        tittel: 'Ledig i poolen',
        sub: 'Ta leaden, så er den din — ingen andre selgere ser den etterpå.',
        knapp: { label: 'Ta lead', ikon: Hand, stil: 'bg-[#141414] text-white hover:bg-black/80', gjor: () => onTildel(lead.id, aktor.id) },
        stille: [],
      };
    }
    if (lead.status === 'ny') {
      return {
        tittel: 'Ny annonse',
        sub: 'Kjør AI-analysen for score, argumenter og tilbudstekst.',
        knapp: { label: 'Kjør AI-analyse', ikon: Sparkles, spinner: analyserer, stil: 'bg-[#141414] text-white hover:bg-black/80', gjor: onAnalyser },
        stille: [],
      };
    }
    if (lead.status === 'analysert') {
      return {
        tittel: kutt ? `Priskutt −${kutt.pct} % — motivert utleier` : 'Klar til kontakt',
        sub: kutt ? 'Utleier sliter med å få leid ut — perfekt timing for å ringe.' : (tlf ? 'Ring huseier — argumentene dine står under.' : 'Send FINN-meldingen — tilbudslenken ligger klar i teksten.'),
        knapp: tlf
          ? { label: `Ring ${fmtTlf(tlf)}`, ikon: Phone, href: `tel:${tlf}`, stil: 'bg-[#141414] text-white hover:bg-black/80' }
          : { label: meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding', ikon: meldingKopiert ? Check : Copy, stil: 'bg-[#141414] text-white hover:bg-black/80', gjor: () => medVakt(onKopierMelding) },
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
        knapp: { label: kopiert ? 'Lenke kopiert!' : 'Send tilbud', ikon: kopiert ? Check : Copy, stil: 'bg-[#141414] text-white hover:bg-black/80', gjor: () => medVakt(sendTilbud) },
        stille: [{ label: 'Huseier svarte', gjor: () => onsketStatus(lead, 'dialog') }],
      };
    }
    if (lead.status === 'dialog') {
      return {
        tittel: 'I dialog med huseier',
        sub: 'Få tilbudet ut mens interessen er varm.',
        knapp: { label: kopiert ? 'Lenke kopiert!' : 'Send tilbud', ikon: kopiert ? Check : Copy, stil: 'bg-[#141414] text-white hover:bg-black/80', gjor: () => medVakt(sendTilbud) },
        stille: [...(tlf ? [{ label: `Ring ${fmtTlf(tlf)}`, href: `tel:${tlf}` }] : [])],
      };
    }
    // tilbud sendt
    return {
      tittel: aapn > 0 ? `Tilbudet er åpnet ${aapn}× — slå til nå` : 'Tilbud sendt — følg opp',
      sub: aapn > 0 ? 'Huseiere som nettopp har lest tilbudet er mest mottakelige.' : 'Gi det en dag eller to, og følg opp med en telefon.',
      knapp: tlf
        ? { label: `Ring ${fmtTlf(tlf)}`, ikon: Phone, href: `tel:${tlf}`, stil: 'bg-[#141414] text-white hover:bg-black/80' }
        : { label: kopiert ? 'Lenke kopiert!' : 'Kopier tilbudslenke', ikon: kopiert ? Check : Copy, stil: 'bg-[#141414] text-white hover:bg-black/80', gjor: onKopierLenke },
      stille: [{ label: 'Huseier svarte', gjor: () => onsketStatus(lead, 'dialog') }],
    };
  })();

  const oppfolging = salg.oppfolging ? new Date(salg.oppfolging) : null;

  /* ── Bilderad i argumentlisten: liten tilstandsmaskin ── */
  const bildeRad = (() => {
    if (kjorer.length) return { tekst: `Bedre bilder · styler ${klare + kandidater.length + 1} av ${klare + kandidater.length + kjorer.length}…`, spinner: true, aktiv: true, onClick: () => setOverlay('bilder') };
    if (kandidater.length) return { tekst: `Bedre bilder · ${kandidater.length} forslag venter`, sub: 'Godkjenn før/etter — kun godkjente bilder brukes i tilbudet', aktiv: true, onClick: () => setOverlay('bilder') };
    if (klare) return { tekst: `Bedre bilder · ${klare === 1 ? '1 klart' : `${klare} klare`}`, sub: 'Se før/etter — vis dem til huseier', aktiv: true, onClick: () => setOverlay('bilder') };
    if (argBilder && ustylet.length) return { tekst: 'Bedre bilder · ikke stylet ennå', sub: 'Ett trykk styler de 5 beste med AI', aktiv: true, onClick: () => setOverlay('bilder') };
    return { tekst: 'Bildene står sterkt', aktiv: false };
  })();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="salgs-skuff-enkel">
      {/* ── Hode ── */}
      <div className="px-5 pb-3 pt-4 sm:px-6">
        <div className="flex items-start gap-2">
          <button onClick={onLukk} data-testid="skuff-lukk" aria-label="Lukk"
            className="mt-0.5 shrink-0 rounded-lg p-1.5 text-[#a8a29a] transition-colors hover:bg-[#f4f2ee] hover:text-[#1c1917]">
            <X className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[19px] font-bold leading-tight" style={heading}>{pent(lead.adresse || lead.tittel)}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[#8a857c]">
              <span className="font-semibold text-[#1c1917]">{kr(lead.pris)}/mnd</span>
              {lead.m2 ? <span>{lead.m2} m²</span> : null}
              {lead.soverom ? <span>{lead.soverom} sov</span> : null}
              <AnnonsorBadge annonsor={lead.annonsor} liten />
              <span className="flex items-center gap-1.5">
                <span className="h-[5px] w-[5px] rounded-full" style={{ background: st.farge }} />{st.l}
              </span>
              {eier && <span title={`Selger: ${eier.navn}`} className="text-[#a8a29a]">· {eier.navn}</span>}
              <a href={lead.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 font-semibold text-[#6d28d9] hover:underline">FINN <ExternalLink className="h-3 w-3" /></a>
            </p>
          </div>
          <button onClick={onUtvid} data-testid="skuff-utvid" title="Se alt om boligen"
            className="shrink-0 rounded-lg p-2 text-[#a8a29a] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9]">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Innhold ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[600px] px-5 pb-6 sm:px-6">

          {/* Tatt av FINN */}
          {lead.annonseAktiv === false && !terminal && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] bg-[#f4f2ee] px-3.5 py-2.5" data-testid="skuff-deaktivert">
              <p className="min-w-0 flex-1 text-[12.5px] font-medium text-[#57534e]">Annonsen er tatt av FINN — trolig utleid eller trukket.</p>
              <button onClick={() => onsketStatus(lead, 'tapt')} className="shrink-0 text-[12.5px] font-semibold text-[#c2413b] hover:underline">Merk som tapt</button>
            </div>
          )}

          {/* NESTE STEG / auto / utfall */}
          {autoAktiv ? (
            <div className="rounded-[12px] bg-[#f7f6f3] px-5 py-6 text-center" data-testid="skuff-auto">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#8b5cf6]" />
              <p className="mt-2.5 text-[14px] font-bold text-[#1c1917]" style={heading}>AI-en analyserer annonsen</p>
              <p className="mt-1 text-[12px] text-[#8a857c]">Tar 15–40 sekunder — du kan trygt lukke og komme tilbake.</p>
            </div>
          ) : terminal ? (
            <div className={`rounded-[12px] px-4 py-4 ${lead.status === 'vunnet' ? 'bg-[#eef6f0]' : 'bg-[#f4f2ee]'}`} data-testid="skuff-utfall">
              {lead.status === 'vunnet' && salg.vunnet ? (
                <>
                  <p className="flex items-center gap-2 text-[15px] font-bold text-[#1f7a45]" style={heading}><Trophy className="h-4 w-4" /> Vunnet av {salg.vunnet.selger?.navn || 'selger'}</p>
                  <p className="mt-1 text-[12.5px] text-[#57534e]">Provisjon <b className="text-[#1f7a45]">{kr(salg.vunnet.provisjon)}</b> · grunnlag {kr(salg.vunnet.grunnlag)} · {new Date(salg.vunnet.at).toLocaleDateString('nb-NO')}</p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-bold text-[#57534e]" style={heading}>{st.l}</p>
                  {salg.arsak?.valg && <p className="mt-1 text-[12.5px] text-[#8a857c]">{salg.arsak.valg}{salg.arsak.tekst ? ` — ${salg.arsak.tekst}` : ''}</p>}
                </>
              )}
              {aktor?.erLeder && (
                <button onClick={() => onsketStatus(lead, 'dialog')} data-testid="skuff-gjenaapne"
                  className="mt-2.5 flex h-[28px] items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[12px] font-medium text-[#57534e] transition-colors hover:border-black/20">
                  <RotateCcw className="h-3 w-3" /> Gjenåpne
                </button>
              )}
            </div>
          ) : steg ? (
            <div className="rounded-[12px] bg-[#f7f6f3] px-4 py-4 sm:px-5" data-testid="skuff-steg">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">Neste steg</p>
              <p className="mt-1.5 text-[16px] font-bold leading-snug text-[#1c1917]" style={heading}>{steg.tittel}</p>
              {steg.sub && <p className="mt-1 text-[12.5px] leading-relaxed text-[#8a857c]">{steg.sub}</p>}
              <div className="mt-3.5">
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
              <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
                {steg.stille.map((s) => (s.href ? (
                  <a key={s.label} href={s.href} className={STILLE}>{s.label}</a>
                ) : (
                  <button key={s.label} onClick={s.gjor} className={STILLE}>{s.label}</button>
                )))}
                {/* Utsett — leaden hviler til datoen kommer */}
                <span className="relative ml-auto">
                  <button onClick={() => setUtsettMeny((v) => !v)} data-testid="skuff-utsett"
                    className={`flex items-center gap-1 ${STILLE} ${oppfolging ? 'text-[#0e7490]' : ''}`}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    {oppfolging ? `Utsatt til ${oppfolging.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}` : 'Utsett'}
                  </button>
                  {utsettMeny && (
                    <>
                      <div className="fixed inset-0 z-[150]" onClick={() => setUtsettMeny(false)} />
                      <div className="absolute right-0 z-[151] mt-1 w-[168px] rounded-[10px] border border-black/[0.08] bg-white py-1 shadow-[0_10px_32px_rgba(0,0,0,0.12)]">
                        {[
                          ['I morgen', isoOmDager(1)], ['På fredag', nesteFredag()], ['Neste uke', isoOmDager(7)],
                        ].map(([l, iso]) => (
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

          {/* Leder: tildeling — én stille rad */}
          {aktor?.erLeder && !terminal && (
            <div className="mt-2 flex items-center gap-2 px-1">
              <span className="text-[11.5px] text-[#a8a29a]">Selger</span>
              <select value={eier?.id || ''} onChange={(e) => onTildel(lead.id, e.target.value || null)} data-testid="skuff-tildel"
                className="h-[26px] max-w-[180px] rounded-[7px] border border-black/[0.07] bg-white px-1.5 text-[12px] font-medium text-[#57534e] outline-none">
                <option value="">— Pool —</option>
                {selgere.map((s) => <option key={s.id} value={s.id}>{s.navn}</option>)}
              </select>
            </div>
          )}

          {/* VÅRE ARGUMENTER */}
          <div className="mt-5" data-testid="skuff-argumenter">
            <p className="px-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">Våre argumenter</p>
            {!lead.ai ? (
              <p className="mt-2 px-1 text-[12.5px] text-[#a8a29a]">Kjør AI-analysen for å få argumentene for denne boligen.</p>
            ) : (
              <div className="mt-1.5">
                <ArgRad aktiv={bildeRad.aktiv} tekst={bildeRad.tekst} sub={bildeRad.sub} spinner={bildeRad.spinner} onClick={bildeRad.onClick} testid="arg-bilder" />
                <ArgRad aktiv={argPris}
                  tekst={argPris ? `Riktigere pris · ${kr(anbefalt)}/mnd` : 'Prisen ligger riktig'}
                  sub={argPris ? (prisDiff > 0 ? `${kr(prisDiff)} mer enn i dag — huseier taper penger nå` : `${kr(Math.abs(prisDiff))} under dagens — derfor står den tom`) : undefined}
                  onClick={anbefalt ? () => setOverlay('pris') : undefined} testid="arg-pris" />
                <ArgRad aktiv={argTekst}
                  tekst={argTekst ? 'Ny annonsetekst' : 'Teksten fungerer'}
                  sub={argTekst ? 'Profesjonelt utkast ligger klart — vis huseier' : undefined}
                  onClick={lead.ai?.annonseUtkast?.beskrivelse ? () => setOverlay('tekst') : undefined} testid="arg-tekst" />
                <ArgRad aktiv={argData}
                  tekst={argData ? `Annonsedata mangler${manglerData.length ? ` · ${manglerData.slice(0, 2).join(', ')}${manglerData.length > 2 ? ' m.m.' : ''}` : ''}` : 'Annonsedata er komplett'}
                  onClick={argData && manglerData.length ? () => setOverlay('data') : undefined} testid="arg-data" />
              </div>
            )}
          </div>

          {/* Se over tilbudet */}
          <button onClick={() => setOverlay('tilbud')} data-testid="skuff-se-tilbud"
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-black/[0.08] bg-white text-[13px] font-semibold text-[#44403c] shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:border-black/20 hover:text-[#1c1917]">
            <FileText className="h-4 w-4" /> Se over tilbudet
            {aapn > 0 && <span className="flex items-center gap-1 text-[11.5px] font-medium text-[#0e7490]"><Eye className="h-3.5 w-3.5" />{aapn}</span>}
          </button>
        </div>
      </div>

      {/* ── Bunnlinje: utfall + rømningsvei ── */}
      <div className="border-t border-black/[0.06] bg-white px-5 py-2.5 sm:px-6">
        <div className="mx-auto flex w-full max-w-[600px] items-center gap-1.5">
          {!terminal && (
            <>
              <button onClick={() => onsketStatus(lead, 'vunnet')} data-testid="skuff-vunnet"
                className="flex h-[30px] items-center gap-1.5 rounded-[8px] bg-[#1f7a45] px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#196a3b]">
                <Trophy className="h-3.5 w-3.5" /> Vunnet
              </button>
              <button onClick={() => onsketStatus(lead, 'tapt')} data-testid="skuff-tapt"
                className="h-[30px] rounded-[8px] px-2.5 text-[12.5px] font-medium text-[#c2413b] transition-colors hover:bg-[#fdf0ef]">Tapt</button>
              <button onClick={() => onsketStatus(lead, 'ikke_relevant')} data-testid="skuff-ikke-relevant"
                className="h-[30px] rounded-[8px] px-2.5 text-[12.5px] font-medium text-[#8a857c] transition-colors hover:bg-[#f4f2ee]">Ikke relevant</button>
            </>
          )}
          <button onClick={onUtvid} data-testid="skuff-se-alt" className="ml-auto flex items-center gap-1 text-[12.5px] font-medium text-[#8a857c] transition-colors hover:text-[#1c1917]">
            Se alt om boligen <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Vaktbikkja ── */}
      {vakt && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" onClick={() => setVakt(null)}>
          <div className="w-full max-w-[420px] rounded-[14px] bg-white p-5 shadow-[0_24px_60px_rgba(28,25,23,0.28)]" onClick={(e) => e.stopPropagation()} data-testid="skuff-vakt">
            <p className="text-[14.5px] font-bold text-[#1c1917]" style={heading}>Vent litt —</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#57534e]">{vakt.tekst}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={() => { const f = vakt.fortsett; setVakt(null); f(); }} data-testid="vakt-send-likevel"
                className="h-[32px] rounded-[8px] px-3 text-[12.5px] font-medium text-[#78716c] transition-colors hover:bg-[#f4f2ee]">Send likevel</button>
              {vakt.kanStyle ? (
                <button onClick={() => { onStyle(lead.id, ustylet); setVakt(null); }} disabled={styStarter} data-testid="vakt-style"
                  className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#141414] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black/80 disabled:opacity-50">
                  {styStarter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Style nå
                </button>
              ) : (
                <button onClick={() => { setVakt(null); setOverlay('bilder'); }} data-testid="vakt-godkjenn"
                  className="flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#141414] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black/80">
                  <Check className="h-3.5 w-3.5" /> Godkjenn nå
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bevis-overlays ── */}
      {overlay === 'bilder' && (
        <Overlay tittel="Bildene — før og etter" onLukk={() => setOverlay(null)} bred>
          {ustylet.length > 0 && !kandidater.length && !kjorer.length && !klare ? (
            <div className="rounded-[10px] bg-[#f7f6f3] px-4 py-4 text-center">
              <p className="text-[13px] text-[#57534e]">Ingen bilder er stylet ennå.</p>
              <button onClick={() => onStyle(lead.id, ustylet)} disabled={styStarter} data-testid="bilder-style-btn"
                className="mx-auto mt-3 flex h-9 items-center gap-2 rounded-[9px] bg-[#141414] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-black/80 disabled:opacity-50">
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
                    <img src={m.kilde} alt="" className="h-[170px] w-full rounded-[10px] object-cover" />
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#1f7a45]">
                      {m.kjorer ? 'Styler …' : m.kandidat ? 'AI-forslag' : 'Godkjent'}
                    </p>
                    {m.kjorer ? (
                      <div className="flex h-[170px] w-full items-center justify-center rounded-[10px] bg-[#f4f2ee]"><Loader2 className="h-5 w-5 animate-spin text-[#8b5cf6]" /></div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.kandidat?.url || m.ai?.url} alt="" className="h-[170px] w-full rounded-[10px] object-cover" />
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
          <p className="text-[24px] font-bold text-[#1c1917]" style={heading}>{kr(anbefalt - honorar)}<span className="ml-1 text-[13px] font-medium text-[#a8a29a]">/mnd til huseier</span></p>
          <dl className="mt-4 space-y-2.5 border-t border-black/[0.06] pt-3.5">
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">Dagens annonserte leie</dt><dd className="font-semibold text-[#1c1917]">{kr(lead.pris)}/mnd</dd></div>
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">Vår anbefalte leie</dt><dd className="font-semibold text-[#1c1917]">{kr(anbefalt)}/mnd</dd></div>
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">DigiHome-honorar ({honorarPct} % eks. mva)</dt><dd className="text-[#78716c]">−{kr(honorar)}</dd></div>
            <div className="flex justify-between text-[13px]"><dt className="text-[#78716c]">Differanse mot i dag</dt>
              <dd className={`font-semibold ${anbefalt - honorar - lead.pris >= 0 ? 'text-[#1f7a45]' : 'text-[#c2413b]'}`}>{anbefalt - honorar - lead.pris >= 0 ? '+' : '−'}{kr(Math.abs(anbefalt - honorar - lead.pris))}/mnd</dd></div>
          </dl>
          <p className="mt-4 rounded-[10px] bg-[#f7f6f3] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#57534e]">
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
          <p className="mt-4 text-[11px] text-[#a8a29a]">Rediger utkastet i <button onClick={() => { setOverlay(null); onUtvid(); }} className="font-semibold text-[#6d28d9] hover:underline">full visning</button>.</p>
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
          <div className="overflow-hidden rounded-[10px] border border-black/[0.08] bg-[#f4f2ee]">
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
