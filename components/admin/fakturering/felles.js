'use client';

/* ───────────────────────────────────────────────────────────────────────────
   Fakturering — felles byggeklosser (konstanter, formatering, små UI-atomer
   og hooken som driver faktura-panelet). Ingen forretningslogikk her: alle
   beløp kommer fra serveren (lib/pris.js) — UI regner aldri selv, bortsett
   fra eksempeltall i planeditoren.
─────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

export const LILLA = '#7a3fa8';
export const BLEKK = '#151310';
export const GRONN = '#059669';
export const AMBER = '#b45309';

export const fmt = (n) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
export const fmtV = (n) => { const x = Number(n) || 0; return Number.isInteger(x) ? fmt(x) : new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(x); };
export const kr = (n) => `${fmt(n)} kr`;
// «Johannes Bruns gate 6, 5008 Bergen, Norge» → uten landet (speiler lib/faktura.adresseKort)
export const adresseKort = (adr) => String(adr || '').replace(/,?\s*(Norge|Norway)\s*$/i, '').replace(/\s+/g, ' ').trim();
const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
export const mndLabel = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MND[(m || 1) - 1]} ${y}`; };
export const mndKort = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MND_KORT[(m || 1) - 1]} ${String(y).slice(2)}`; };
export const naaMnd = () => new Date().toISOString().slice(0, 7);
export const forrigeMnd = () => { const d = new Date(); const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
export const skiftMnd = (ym, delta) => { const [y, m] = String(ym).split('-').map(Number); const x = new Date(Date.UTC(y, m - 1 + delta, 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
export const maanedValg = (antall = 18) => { const out = []; const d = new Date(); for (let i = 1; i <= antall; i += 1) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); const ym = `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; out.push({ v: ym, l: mndLabel(ym) }); } return out; };

// ── Nettverk: les JSON trygt + vent på bakgrunnsjobb ────────────────────────
// Svar som ikke er JSON (f.eks. HTML-feilside fra kant/lastbalanserer ved tidsavbrudd)
// ga før den intetsigende «Kunne ikke kontakte PowerOffice». Nå får brukeren status.
export async function lesJson(r) {
  const txt = await r.text();
  try { return JSON.parse(txt); } catch (e) {
    const err = new Error(r.ok ? 'Uventet svar fra serveren (ikke JSON).' : `Serveren svarte ikke som forventet (HTTP ${r.status}).`);
    err.status = r.status; throw err;
  }
}
// Poller GET /api/admin/pris/poweroffice/jobb?id= til jobben er ferdig/feilet.
// onSteg(tekst) får framdriften underveis. Tåler enkeltstående nettverksglipp.
export async function ventPaaJobb(q, jobbId, onSteg, { intervallMs = 1200, maksMs = 8 * 60 * 1000 } = {}) {
  const start = Date.now();
  let glipp = 0;
  for (;;) {
    await new Promise((res) => setTimeout(res, intervallMs));
    let d;
    try { const r = await fetch(`/api/admin/pris/poweroffice/jobb?${q}&id=${encodeURIComponent(jobbId)}`, { cache: 'no-store' }); d = await lesJson(r); glipp = 0; }
    catch (e) { glipp += 1; if (glipp >= 5) throw new Error('Mistet kontakten med serveren mens jobben kjørte. Oppdater siden — jobben fortsetter i bakgrunnen.'); continue; }
    if (!d.ok || !d.jobb) throw new Error(d.feil || 'Fant ikke jobben');
    if (typeof onSteg === 'function' && d.jobb.steg) onSteg(d.jobb.steg);
    if (d.jobb.status !== 'kjorer') return d.jobb;
    if (Date.now() - start > maksMs) throw new Error('Jobben tar uvanlig lang tid. Den fortsetter i bakgrunnen — oppdater siden om litt.');
  }
}
export const jobbFeilTekst = (j, standard) => `${j?.feil || standard}${j?.hint ? `\n\n${j.hint}` : ''}`;

export const datoNb = (iso) => { const s = String(iso || '').slice(0, 10); const [y, m, d] = s.split('-'); return (y && m && d) ? `${d}.${m}.${y}` : s; };
export const perNb = (iso) => { const s = String(iso || '').slice(0, 10); const [y, m, d] = s.split('-'); return (y && m && d) ? `${d}.${m}.${y.slice(2)}` : ''; };
export const tidNb = (iso) => { if (!iso) return ''; const d = new Date(iso); if (Number.isNaN(d.getTime())) return datoNb(iso); return `${datoNb(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// ── Valg (speiler lib/pris.js) ──
export const GRUNNLAG = [
  { v: 'alle', l: 'Alle enheter under forvaltning', d: 'Også ledige — plattformen jobber for enheten uansett (annonse, visning, signering). Anbefalt.' },
  { v: 'utleid_mnd', l: 'Kun utleide enheter', d: 'Bare enheter med faktisk leieforhold i måneden. Tomgang faktureres ikke.' },
];
export const LEDIG_VALG = [
  { v: 100, l: 'Full pris (100 %)' }, { v: 75, l: '75 % av prisen' }, { v: 50, l: 'Halv pris (50 %)' }, { v: 25, l: '25 % av prisen' }, { v: 0, l: 'Faktureres ikke (0 %)' },
];
export const ROM_VALG = [
  { v: 'rom:100', l: 'Hvert rom = én enhet (100 %)', d: 'Én kontrakt, én leietaker, én innkreving per rom — samme arbeid som en hel enhet.' },
  { v: 'rom:75', l: 'Hvert rom = 75 % av en enhet', d: 'Rom prises lavere enn hele boliger.' },
  { v: 'rom:50', l: 'Hvert rom = halv enhet (50 %)', d: 'Et bofellesskap med 4 rom teller som 2 enheter.' },
  { v: 'rom:25', l: 'Hvert rom = 25 % av en enhet', d: 'Et bofellesskap med 4 rom teller som 1 enhet.' },
  { v: 'bolig', l: 'Hele boligen = én enhet', d: 'Uavhengig av antall rom. Utleid-andel = utleide rom / alle rom.' },
];
export const romValgVerdi = (p) => (p?.romModell === 'bolig' ? 'bolig' : `rom:${p?.romFaktor ?? 100}`);

// Selvbetjente enheter — «gratis å prøve, betal når det er ekte»
export const SELV_GRUNNLAG_VALG = [
  { v: 'leieforhold', t: 'Kun med leieforhold', d: 'Teller bare måneder enheten har leietaker, prorata per dag. Test-enheter uten leietaker koster 0 kr.' },
  { v: 'kunde', t: 'Følg kundens grunnlag', d: 'Samme regel som forvaltede enheter — registrerte enheter teller også når de står tomme.' },
];
export const PROVE_VALG = [
  { v: '0', l: 'Ingen prøveperiode' },
  { v: '30', l: '30 dager gratis fra første leietaker' },
  { v: '60', l: '60 dager gratis fra første leietaker' },
  { v: '90', l: '90 dager gratis fra første leietaker' },
];
export const DVALE_VALG = [
  { v: '0', l: 'Aldri' },
  { v: '60', l: 'Etter 60 dager uten leieforhold' },
  { v: '90', l: 'Etter 90 dager uten leieforhold' },
  { v: '180', l: 'Etter 180 dager uten leieforhold' },
];
export const romValgTilPlan = (v) => (v === 'bolig' ? { romModell: 'bolig' } : { romModell: 'rom', romFaktor: Number(String(v).split(':')[1]) || 100 });
export const STATUS = {
  aktiv: { l: 'Aktiv', c: '#1f9d55', bg: 'rgba(31,157,85,0.1)' },
  prove: { l: 'Prøve', c: '#b45309', bg: 'rgba(180,83,9,0.1)' },
  inaktiv: { l: 'Inaktiv', c: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};
// Speiler lib/pris.fordelPaaTrinn — kun til eksempeltall i planeditoren.
export const eksempelBelop = (trinn, n, modell) => {
  const s = [...(trinn || [])].map((t) => ({ fraEnheter: Number(t.fraEnheter) || 0, pris: Number(t.pris) || 0 })).sort((a, b) => a.fraEnheter - b.fraEnheter);
  if (!s.length || n <= 0) return 0;
  if (modell !== 'progressiv') { let pris = s[0].pris; for (const t of s) if (n >= t.fraEnheter) pris = t.pris; return n * pris; }
  let rest = n; let sum = 0;
  for (let i = 0; i < s.length && rest > 0; i += 1) { const fra = Math.max(1, s[i].fraEnheter); const neste = i + 1 < s.length ? s[i + 1].fraEnheter : Infinity; const kap = neste - fra; if (kap <= 0) continue; const ant = Math.min(rest, kap); sum += ant * s[i].pris; rest -= ant; }
  return sum;
};

// ── UI-atomer ──
export const inputCls = 'w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[14px] tabular-nums outline-none transition-colors focus:border-[#7a3fa8] disabled:bg-black/[0.03] disabled:text-black/40';
export const knappPrimær = 'flex h-9 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold text-white transition-all disabled:opacity-40';
export const knappSekundær = 'flex h-9 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-[13px] font-medium text-black/70 transition-colors hover:bg-black/[0.03] disabled:opacity-40';
export const knappLiten = 'flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-[12.5px] font-medium text-black/70 transition-colors hover:bg-black/[0.03] disabled:opacity-40';

export function Felt({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-black/55">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11.5px] leading-[1.45] text-black/40">{hint}</span> : null}
    </label>
  );
}
export function Nedtrekk({ verdi, valg, onChange, disabled, liten = false }) {
  return (
    <div className="relative">
      <select value={verdi} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${liten ? 'rounded-lg border border-black/[0.1] bg-white py-1.5 pl-3 pr-8 text-[12.5px] font-medium outline-none' : `${inputCls} pr-9`} appearance-none`}>
        {valg.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/35 ${liten ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
    </div>
  );
}
export function Kort({ children, className = '' }) {
  return <div className={`rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>{children}</div>;
}
export function Bryter({ på, onChange, label, hint }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span><span className="text-[13px] font-medium text-black/75">{label}</span>{hint ? <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-black/40">{hint}</span> : null}</span>
      <button type="button" onClick={() => onChange(!på)} className="relative h-6 w-11 shrink-0 rounded-full transition-colors" style={{ background: på ? LILLA : 'rgba(0,0,0,0.14)' }}>
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: på ? '22px' : '2px' }} />
      </button>
    </label>
  );
}
export function Pille({ children, farge = '#6b7280', bg = 'rgba(107,114,128,0.1)', title, className = '' }) {
  return <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${className}`} style={{ color: farge, background: bg }}>{children}</span>;
}
export function StatusPille({ status }) {
  const st = STATUS[status] || STATUS.aktiv;
  return <Pille farge={st.c} bg={st.bg}>{st.l}</Pille>;
}
export function MiljøPille({ env, konfigurert = true }) {
  if (!konfigurert) return <Pille farge="#6b7280" bg="rgba(107,114,128,0.1)">ikke konfigurert</Pille>;
  return env === 'production' ? <Pille farge="#065f46" bg="rgba(5,150,105,0.12)">PROD</Pille> : <Pille farge="#92400e" bg="rgba(217,119,6,0.14)">DEMO</Pille>;
}
export function Seksjon({ tittel, ikon: Ikon, beskrivelse, children, handling }) {
  return (
    <Kort className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-black/80">{Ikon ? <Ikon className="h-4 w-4" style={{ color: LILLA }} /> : null} {tittel}</h3>
          {beskrivelse ? <p className="mt-1 max-w-[62ch] text-[12px] leading-[1.5] text-black/45">{beskrivelse}</p> : null}
        </div>
        {handling || null}
      </div>
      <div className="mt-4">{children}</div>
    </Kort>
  );
}
export function Tomt({ ikon: Ikon, tittel, tekst, children }) {
  return (
    <Kort className="flex min-h-[260px] flex-col items-center justify-center gap-2 p-8 text-center">
      {Ikon ? <Ikon className="h-8 w-8 text-black/20" /> : null}
      <p className="text-[14px] font-medium text-black/60">{tittel}</p>
      {tekst ? <p className="max-w-[34ch] text-[12.5px] leading-[1.5] text-black/40">{tekst}</p> : null}
      {children}
    </Kort>
  );
}

// Tabell-primitiver: rolige, tette rader med tabulære tall
export const th = 'px-3 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-black/40';
export const thR = `${th} text-right`;
export const td = 'px-3 py-2.5 text-[13px] text-black/75';
export const tdR = `${td} text-right tabular-nums`;

// Volumtrinn-editor (planredigering)
export function TrinnEditor({ trinn, setTrinn }) {
  const settRad = (i, felt, val) => setTrinn(trinn.map((t, j) => (j === i ? { ...t, [felt]: val === '' ? '' : Number(val) } : t)));
  const leggTil = () => { const sist = trinn[trinn.length - 1]; setTrinn([...trinn, { fraEnheter: (sist?.fraEnheter || 0) + 50, pris: Math.max(0, (sist?.pris || 0) - 50) }]); };
  const fjern = (i) => setTrinn(trinn.length > 1 ? trinn.filter((_, j) => j !== i) : trinn);
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1 text-[11px] font-medium uppercase tracking-[0.06em] text-black/40"><span>Fra enheter</span><span>Pris / enhet / mnd</span><span /></div>
      {trinn.map((t, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
          <div className="relative">
            <input type="number" min={0} value={t.fraEnheter} disabled={i === 0} onChange={(e) => settRad(i, 'fraEnheter', e.target.value)} className={inputCls} />
            {i === 0 ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-black/35">standard</span> : null}
          </div>
          <div className="relative"><input type="number" min={0} value={t.pris} onChange={(e) => settRad(i, 'pris', e.target.value)} className={`${inputCls} pr-10`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/35">kr</span></div>
          <button onClick={() => fjern(i)} disabled={trinn.length <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg text-black/35 transition-colors hover:bg-black/[0.04] hover:text-red-600 disabled:opacity-25"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={leggTil} className="mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-black/[0.03]" style={{ color: LILLA }}><Plus className="h-4 w-4" /> Legg til trinn</button>
    </div>
  );
}

// ── Hook: driver faktura-panelet for én kunde + måned ────────────────────────
// `kunde` kan være u-lagret (live redigering) — serveren beregner live, men en
// frosset måned vinner alltid. Alle handlinger kaller onEndret() så listene
// rundt kan oppdatere seg.
export function useFaktura({ q, kunde, plan, maaned, onEndret }) {
  const [faktura, setFaktura] = useState(null);
  const [laster, setLaster] = useState(false);
  const [spesifiser, setSpesifiser] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfLaster, setPdfLaster] = useState(false);
  const [poUtkast, setPoUtkast] = useState(null);
  const [poLaster, setPoLaster] = useState(false);
  const [poSteg, setPoSteg] = useState('');
  const [laasLaster, setLaasLaster] = useState(false);
  const kjorRef = useRef(0);
  const kundeId = kunde?.id || null;

  const hentPo = useCallback(async () => {
    if (!kundeId) { setPoUtkast(null); return; }
    try { const r = await fetch(`/api/admin/pris/poweroffice/utkast?${q}&maaned=${maaned}`, { cache: 'no-store' }); const d = await r.json(); setPoUtkast((d.utkast || []).find((u) => u.kundeId === kundeId) || null); } catch (e) {}
  }, [q, maaned, kundeId]);

  const hent = useCallback(async () => {
    if (!kunde) { setFaktura(null); return; }
    const kjor = ++kjorRef.current; setLaster(true);
    try {
      const r = await fetch(`/api/admin/pris/faktura?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maaned, kunde, plan, spesifiser }) });
      const d = await r.json(); if (kjor === kjorRef.current && d.faktura) setFaktura(d.faktura);
    } catch (e) {}
    if (kjor === kjorRef.current) setLaster(false);
  }, [q, maaned, kunde, plan, spesifiser]);

  useEffect(() => { const t = setTimeout(hent, 220); return () => clearTimeout(t); }, [hent]);
  useEffect(() => { hentPo(); }, [hentPo]);

  const hentPdfBlob = useCallback(async () => {
    const r = await fetch(`/api/admin/pris/faktura/pdf?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maaned, kunde, plan, spesifiser }) });
    if (!r.ok) throw new Error('pdf');
    return r.blob();
  }, [q, maaned, kunde, plan, spesifiser]);
  const forhaandsvisPdf = useCallback(async () => { setPdfLaster(true); try { const b = await hentPdfBlob(); setPdfUrl(URL.createObjectURL(b)); } catch (e) { window.alert('Kunne ikke lage PDF akkurat nå.'); } setPdfLaster(false); }, [hentPdfBlob]);
  const lastNedPdf = useCallback(async () => {
    setPdfLaster(true);
    try { const b = await hentPdfBlob(); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = `proforma-${(kunde?.navn || 'kunde').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${maaned}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
    catch (e) { window.alert('Kunne ikke lage PDF akkurat nå.'); }
    setPdfLaster(false);
  }, [hentPdfBlob, kunde, maaned]);
  const lukkPdf = useCallback(() => setPdfUrl((u) => { if (u) setTimeout(() => URL.revokeObjectURL(u), 500); return ''; }), []);

  const etterEndring = useCallback(async () => { await hentPo(); await hent(); if (onEndret) onEndret(); }, [hentPo, hent, onEndret]);

  // Opprett/erstatt utkast: serveren starter en bakgrunnsjobb (202 + jobb) og vi poller
  // til den er ferdig — så tåler flyten at plattform + PowerOffice bruker lang tid, uten
  // at kant/lastbalanserer kutter forespørselen. Listen oppdateres ALLTID etterpå, også
  // ved feil, så et utkast som likevel ble laget blir synlig.
  const kjorUtkastJobb = useCallback(async ({ tvang = false } = {}) => {
    setPoLaster(true); setPoSteg('Starter …');
    try {
      const r = await fetch(`/api/admin/pris/poweroffice/utkast?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kundeId, maaned, tvang }) });
      const d = await lesJson(r);
      if (!d.ok) { window.alert(jobbFeilTekst(d, tvang ? 'Kunne ikke erstatte utkastet' : 'Kunne ikke opprette utkast')); return; }
      if (d.jobb) {
        const j = await ventPaaJobb(q, d.jobb.id, setPoSteg);
        if (j.status !== 'ferdig') window.alert(jobbFeilTekst(j, tvang ? 'Kunne ikke erstatte utkastet' : 'Kunne ikke opprette utkast'));
      } else if (d.ok === false) {
        window.alert(jobbFeilTekst(d, 'Kunne ikke opprette utkast'));
      }
    } catch (e) {
      window.alert(`Fikk ikke fullført mot PowerOffice akkurat nå.\n\n${e?.message || e}\n\nListen oppdateres — sjekk om utkastet likevel ble laget før du prøver igjen.`);
    } finally {
      try { await etterEndring(); } catch (e) { /* visning oppdateres ved neste last */ }
      setPoLaster(false); setPoSteg('');
    }
  }, [q, kundeId, maaned, etterEndring]);

  const opprettUtkast = useCallback(async () => {
    if (!kundeId) { window.alert('Lagre kunden først.'); return; }
    await kjorUtkastJobb({ tvang: false });
  }, [kundeId, kjorUtkastJobb]);
  const frys = useCallback(async () => {
    if (!kundeId) return;
    if (!window.confirm(`Fryse grunnlaget for ${kunde.navn} · ${mndLabel(maaned)}?\n\nEnhetslisten og prisen lagres slik de er nå. Senere endringer i plattformen, kunden eller planen påvirker ikke denne måneden.`)) return;
    setLaasLaster(true);
    try { const r = await fetch(`/api/admin/pris/grunnlag/laas?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kundeId, maaned }) }); const d = await r.json(); if (!d.ok) window.alert(d.feil || 'Kunne ikke fryse grunnlaget'); await etterEndring(); }
    catch (e) { window.alert('Kunne ikke fryse grunnlaget akkurat nå.'); }
    setLaasLaster(false);
  }, [q, kundeId, kunde, maaned, etterEndring]);
  const laasOpp = useCallback(async () => {
    if (!kundeId) return;
    if (!window.confirm(`Låse opp ${mndLabel(maaned)} for ${kunde.navn}? Grunnlaget beregnes på nytt fra dagens øyeblikksbilde.`)) return;
    setLaasLaster(true);
    try { const r = await fetch(`/api/admin/pris/grunnlag/laas?${q}&kundeId=${encodeURIComponent(kundeId)}&maaned=${maaned}`, { method: 'DELETE' }); const d = await r.json(); if (!d.ok) window.alert(d.feil || 'Kunne ikke låse opp'); await etterEndring(); }
    catch (e) { window.alert('Kunne ikke låse opp akkurat nå.'); }
    setLaasLaster(false);
  }, [q, kundeId, kunde, maaned, etterEndring]);

  // Utkastet i Go avviker fra dagens grunnlag (laget før frysing / med annen modell)
  const utkastAvvik = Boolean(poUtkast && faktura && poUtkast.sumEksMva != null && Math.abs(Number(poUtkast.sumEksMva) - Number(faktura.sumEksMva || 0)) > 0.5);

  const erstattUtkast = useCallback(async () => {
    if (!kundeId || !poUtkast) return;
    if (!window.confirm(`Erstatte PowerOffice-utkastet for ${kunde.navn} · ${mndLabel(maaned)}?\n\nDet gamle utkastet${poUtkast.poOrderNo ? ` (ordre ${poUtkast.poOrderNo})` : ''} slettes i Go og et nytt lages fra ${faktura?.grunnlagLaast ? 'det frosne' : 'dagens'} grunnlag. Er ordren allerede sendt, avbrytes alt.`)) return;
    await kjorUtkastJobb({ tvang: true });
  }, [kundeId, kunde, maaned, poUtkast, faktura, kjorUtkastJobb]);
  const slettUtkast = useCallback(async () => {
    if (!kundeId || !poUtkast) return;
    if (!window.confirm(`Slette PowerOffice-utkastet for ${kunde.navn} · ${mndLabel(maaned)}?\n\nUtkastet${poUtkast.poOrderNo ? ` (ordre ${poUtkast.poOrderNo})` : ''} slettes i Go. Er det allerede sendt, nektes slettingen og ingenting endres.`)) return;
    setPoLaster(true); setPoSteg('Sletter utkastet i Go …');
    try {
      const r = await fetch(`/api/admin/pris/poweroffice/utkast?${q}&kundeId=${encodeURIComponent(kundeId)}&maaned=${maaned}`, { method: 'DELETE' });
      const d = await lesJson(r);
      if (!d.ok) window.alert(jobbFeilTekst(d, 'Kunne ikke slette utkastet'));
    } catch (e) { window.alert(`Fikk ikke fullført mot PowerOffice akkurat nå.\n\n${e?.message || e}`); }
    finally { try { await etterEndring(); } catch (e) { /* neste last */ } setPoLaster(false); setPoSteg(''); }
  }, [q, kundeId, kunde, maaned, poUtkast, etterEndring]);

  return { faktura, laster, spesifiser, setSpesifiser, pdfUrl, pdfLaster, forhaandsvisPdf, lastNedPdf, lukkPdf, poUtkast, poLaster, poSteg, opprettUtkast, erstattUtkast, slettUtkast, utkastAvvik, laasLaster, frys, laasOpp, oppdater: etterEndring, maanedAvsluttet: maaned < naaMnd() };
}
