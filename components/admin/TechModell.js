'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   TechModell — budsjettet for Digihome Tech AS (plattformselskapet).

   Én plattform, tre kundegrupper med hver sin pris (prislisten er Techs):
     · Huseiere · selvbetjent      organisk + annonse/CAC, churn, % av leie / fast
     · Plattformlisens · Digihome  enheter under forvaltning (fra koblet Digihome
                                   AS-budsjett = fakta) × kr per enhet
     · Bedrift · eiendomsselskap   nye selskaper/mnd × enheter per selskap
   Kostnadene skalerer med enheter og programvare — ikke med folk.
   Alt regnes live i nettleseren (lib/budsjett-modell.js → beregnTech).
   ───────────────────────────────────────────────────────────────────────────── */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, RefreshCw, Home, Building2, Link2, Cpu, CalendarClock, Info, Layers, SlidersHorizontal, Megaphone } from 'lucide-react';
import { beregnTech, rensTechDrivere } from '@/lib/budsjett-modell';
import ModellTopplinje, { PILL, PILL_AKTIV } from '@/components/admin/ModellTopplinje';
import PartnerKort from '@/components/admin/PartnerKort';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const MND_LANG = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => { const { y, m } = ymDeler(ym); const t = y * 12 + (m - 1) + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const mndKort = (ym) => { const { y, m } = ymDeler(ym); return `${MND[m - 1]}. ${String(y).slice(2)}`; };
const mndLang = (ym) => { const { y, m } = ymDeler(ym); return `${MND_LANG[m - 1]} ${y}`; };
const stor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00A0/g, ' ')} kr`;
const krS = (n) => `${(Number(n) || 0) < 0 ? '−' : ''}${Math.abs(Math.round(Number(n) || 0)).toLocaleString('nb-NO').replace(/\u00A0/g, ' ')} kr`;
const tall = (n, d = 0) => (Number(n) || 0).toLocaleString('nb-NO', { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/\u00A0/g, ' ');
// Kompakt beløp til trange flater (grafer, broer): 1 234 → «1 234», 15 400 → «15 k», 1 250 000 → «1,25 M»
const kompakt = (n) => { const a = Math.abs(Number(n) || 0); if (a >= 1e6) return `${(a / 1e6).toLocaleString('nb-NO', { maximumFractionDigits: 2 })} M`; if (a >= 1e4) return `${Math.round(a / 1000)} k`; return tall(a); };
const FARGE = { huseier: '#8b5cf6', forvaltning: '#1c1917', bedrift: '#0ea5a4', kost: '#B3261E' };

/* ── Rail-byggeklosser ── */
const Seksjon = ({ tittel, sammendrag, ikon: Ikon, open, onToggle, children, testid }) => (
  <div className={`-mx-2 rounded-[12px] px-2 transition-colors ${open ? 'bg-[#faf9f7]' : ''}`} data-testid={testid}>
    <button onClick={onToggle} className="group flex w-full items-center justify-between gap-2 py-2.5 text-left">
      <span className="flex min-w-0 items-center gap-2">
        {Ikon && <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] transition-colors ${open ? 'bg-[#f0ebfa] text-[#6d28d9]' : 'bg-[#f5f4f1] text-[#a6a19a] group-hover:text-[#57534e]'}`}><Ikon className="h-3.5 w-3.5" /></span>}
        <span className={`truncate text-[11px] font-bold uppercase tracking-[0.09em] transition-colors ${open ? 'text-[#1c1917]' : 'text-[#78716c] group-hover:text-[#1c1917]'}`}>{tittel}</span>
      </span>
      <span className="flex max-w-[48%] shrink-0 items-center gap-1.5">
        {!open && sammendrag && <span className="truncate rounded-full bg-[#f5f4f1] px-2 py-0.5 text-[11px] font-medium text-[#8f8a82]" title={sammendrag}>{sammendrag}</span>}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#c2beb8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </span>
    </button>
    {open && <div className="pb-2.5 pl-1">{children}</div>}
  </div>
);

const Felt = ({ label, verdi, onEndre, enhet, hint, slider, readOnly, testid }) => (
  <div className="py-[6px]">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] leading-tight text-[#57534e]">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {readOnly ? <span className="text-[13.5px] font-semibold text-[#1c1917]">{verdi}</span>
          : <input value={verdi ?? ''} inputMode="decimal" data-testid={testid} onChange={(e) => onEndre(e.target.value)} className="h-8 w-[100px] rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13.5px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent transition-all focus:bg-white focus:ring-[#6d28d9]/40" />}
        <span className="w-12 text-[11px] text-[#a6a19a]">{enhet}</span>
      </span>
    </div>
    {slider && !readOnly && (
      <input type="range" min={slider.min} max={slider.max} step={slider.step} value={Math.min(slider.max, Math.max(slider.min, Number(verdi) || 0))} onChange={(e) => onEndre(e.target.value)} aria-label={label}
        className="mt-1.5 h-[3px] w-full cursor-pointer appearance-none rounded-full bg-black/[0.07] accent-[#6d28d9]" />
    )}
    {hint && <p className="mt-1 text-[11px] leading-snug text-[#a6a19a]">{hint}</p>}
  </div>
);

/* Benchmark: SaaS-tommelfingerregler som kontekst — grønn/gul/rød prikk, aldri dom. */
const BENCH = {
  bruttoMargin: (v) => (v == null ? null : v >= 70 ? ['ok', '≥ 70 % er sunt for SaaS'] : v >= 50 ? ['mid', '50–70 %: se på COGS per enhet'] : ['lav', '< 50 %: for dyrt å levere']),
  burn: (v) => (v == null ? null : v <= 1 ? ['ok', '≤ 1× er utmerket'] : v <= 2 ? ['mid', '1–2× er godt'] : ['lav', '> 2×: dyr vekst']),
  payback: (v) => (v == null ? null : v <= 12 ? ['ok', '≤ 12 mnd er sterkt'] : v <= 24 ? ['mid', '12–24 mnd er akseptabelt'] : ['lav', '> 24 mnd: for dyre kunder']),
  ltvCac: (v) => (v == null ? null : v >= 3 ? ['ok', '≥ 3× er sunt'] : v >= 1.5 ? ['mid', '1,5–3×: tynt'] : ['lav', '< 1,5×: taper på kunden']),
  ruleOf40: (v) => (v == null ? null : v >= 40 ? ['ok', 'Rule of 40 nås'] : v >= 20 ? ['mid', 'Under 40 — vekst eller margin må opp'] : ['lav', 'Langt under 40']),
  grr: (v) => (v == null ? null : v >= 85 ? ['ok', '≥ 85 % brutto retensjon er godt'] : v >= 70 ? ['mid', '70–85 %: churn koster'] : ['lav', '< 70 %: lekker bøtte']),
};
const Prikk = ({ b }) => (b ? <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${b[0] === 'ok' ? 'bg-[#0a7d55]' : b[0] === 'mid' ? 'bg-[#d4a017]' : 'bg-[#b3261e]'}`} title={b[1]} /> : null);

const Kpi = ({ label, verdi, under, tone, testid, barn, bench, liten }) => (
  <div className="flex min-w-0 flex-col rounded-[16px] bg-white px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid={testid}>
    <p className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]" title={label}><Prikk b={bench} /> <span className="truncate">{label}</span></p>
    <p className={`mt-1.5 truncate font-bold tracking-[-0.02em] ${liten ? 'text-[length:clamp(15px,1.05vw,19px)]' : 'text-[length:clamp(17px,1.3vw,23px)]'} ${tone === 'pos' ? 'text-[#0a7d55]' : tone === 'neg' ? 'text-[#b3261e]' : tone === 'lilla' ? 'text-[#6d28d9]' : 'text-[#1c1917]'}`} style={heading} title={typeof verdi === 'string' ? verdi : undefined}>{verdi}</p>
    {under && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#a6a19a]" title={under}>{under}</p>}
    {bench && <p className="mt-auto pt-1 truncate text-[10.5px] text-[#b5b0a8]" title={bench[1]}>{bench[1]}</p>}
    {barn}
  </div>
);

/* ── MRR-bro: start → nye per kundegruppe → churn → pris → slutt.
      HTML-waterfall (ikke SVG) — tekst skalerer aldri ned til uleselig, etiketter
      kan brytes, og søylene følger kortets bredde. ── */
function MrrBro({ bro }) {
  const steg = [
    { k: 'start', l: 'MRR start', v: bro.start, type: 'nivaa' },
    { k: 'nyHuseier', l: 'Nye huseiere', v: bro.nyHuseier, type: 'delta', farge: FARGE.huseier },
    { k: 'nyBedrift', l: 'Nye bedrifter', v: bro.nyBedrift, type: 'delta', farge: FARGE.bedrift },
    { k: 'nyLisens', l: 'Lisens (flere enheter)', v: bro.nyLisens, type: 'delta', farge: FARGE.forvaltning },
    { k: 'churn', l: 'Churn', v: bro.churn, type: 'delta', farge: FARGE.kost },
    // Prisjustering vises kun når den betyr noe (≥ 0,5 % av slutt-MRR) — ellers støy
    ...(bro.pris && Math.abs(bro.pris) >= Math.max(1, bro.slutt * 0.005) ? [{ k: 'pris', l: 'Prisjustering', v: bro.pris, type: 'delta', farge: '#a6a19a' }] : []),
    { k: 'slutt', l: 'MRR slutt', v: bro.slutt, type: 'nivaa' },
  ];
  let niv = 0;
  const punkter = steg.map((st) => { if (st.type === 'nivaa') { niv = st.v; return { ...st, fra: 0, til: st.v }; } const fra = niv; niv += st.v; return { ...st, fra, til: niv }; });
  const maks = Math.max(1, ...punkter.map((p) => Math.max(p.fra, p.til)));
  const H = 150; // px — søyleområdet
  return (
    <div className="mt-3" data-testid="tech-mrr-bro">
      <div className="flex items-end gap-1.5" style={{ height: H + 18 }}>
        {punkter.map((p) => {
          const topp = (Math.max(p.fra, p.til) / maks) * H;
          const hoyde = Math.max(2, (Math.abs(p.til - p.fra) / maks) * H);
          const fill = p.type === 'nivaa' ? '#1c1917' : p.v >= 0 ? (p.farge || '#0a7d55') : FARGE.kost;
          const tekst = p.type === 'nivaa' ? kompakt(p.v) : `${p.v >= 0 ? '+' : '−'}${kompakt(p.v)}`;
          return (
            <div key={p.k} className="relative min-w-0 flex-1" style={{ height: H + 18 }} title={`${p.l}: ${p.type === 'nivaa' ? kr(p.v) : `${p.v >= 0 ? '+' : '−'}${kr(Math.abs(p.v))}`}`}>
              <span className="absolute inset-x-0 truncate text-center text-[10.5px] font-bold text-[#1c1917]" style={{ bottom: topp + 3 }}>{tekst}</span>
              <span className="absolute inset-x-[12%] rounded-[3px]" style={{ bottom: topp - hoyde, height: hoyde, background: fill, opacity: p.type === 'nivaa' ? 1 : 0.85 }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-black/[0.05] pt-1.5">
        {punkter.map((p) => <p key={p.k} className="min-w-0 flex-1 text-center text-[10px] leading-[1.25] text-[#8f8a82]">{p.l}</p>)}
      </div>
    </div>
  );
}

/* ── Stablet inntektsgraf per kundegruppe + kostnadslinje ── */
function TechGraf({ m, startYm }) {
  const N = m.N; const W = 920; const H = 300; const padL = 48; const padR = 12; const padT = 18; const padB = 30;
  const maks = Math.max(1, ...m.inntekt.total, ...m.kostSum) * 1.08;
  const x = (i) => padL + ((W - padL - padR) * (i + 0.5)) / N;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maks);
  const bw = ((W - padL - padR) / N) * 0.62;
  const be = m.sammendrag.breakEvenIdx;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Inntekt per kundegruppe og kostnader per måned" data-testid="tech-graf">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}><line x1={padL} x2={W - padR} y1={y(maks * f)} y2={y(maks * f)} stroke="rgba(0,0,0,0.06)" /><text x={padL - 6} y={y(maks * f) + 4} textAnchor="end" fontSize="10" fill="#b5b0a8">{maks * f >= 1e6 ? `${(maks * f / 1e6).toFixed(1)} M` : `${Math.round(maks * f / 1000)} k`}</text></g>
      ))}
      {Array.from({ length: N }, (_, i) => {
        const h = m.inntekt.huseier[i]; const f = m.inntekt.forvaltning[i]; const b = m.inntekt.bedrift[i];
        let top = 0; const deler = [['forvaltning', f], ['huseier', h], ['bedrift', b]];
        return (
          <g key={i}>
            {deler.map(([k, v]) => { const y0 = y(top + v); const hh = Math.max(0, y(top) - y0); top += v; return <rect key={k} x={x(i) - bw / 2} y={y0} width={bw} height={hh} fill={FARGE[k]} opacity={k === 'forvaltning' ? 0.85 : 0.8} />; })}
          </g>
        );
      })}
      <polyline fill="none" stroke={FARGE.kost} strokeWidth="1.8" strokeDasharray="4 3" strokeLinejoin="round" points={m.kostSum.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {be != null && <g><line x1={x(be)} x2={x(be)} y1={padT} y2={H - padB} stroke="#0a7d55" strokeWidth="1" strokeDasharray="3 3" /><text x={x(be)} y={padT - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0a7d55">Break-even</text></g>}
      {Array.from({ length: N }, (_, i) => i).filter((i) => i % (N > 24 ? 6 : N > 12 ? 3 : 2) === 0 || i === N - 1).map((i) => <text key={`t${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#b5b0a8">{mndKort(ymPluss(startYm, i))}</text>)}
    </svg>
  );
}

export default function TechModell({ plan, api, apiKey, readOnly = false, onTilbake, onEndret }) {
  const N = plan.antallMnd;
  const [navn, setNavn] = useState(plan.navn);
  const [tech, setTech] = useState(() => rensTechDrivere(plan.tech || {}));
  const [fakta, setFakta] = useState(plan.fakta || null);
  const [kobletPlanId, setKobletPlanId] = useState(plan.kobletPlanId || '');
  const [status, setStatus] = useState(plan.status || 'utkast');
  const [investorSynlig, setInvestorSynlig] = useState(Boolean(plan.investorSynlig));
  const [skittent, setSkittent] = useState(false);
  const [lagrer, setLagrer] = useState(false); const [lagret, setLagret] = useState(false);
  const [feil, setFeil] = useState('');
  const [dhPlaner, setDhPlaner] = useState([]);
  const [henterFakta, setHenterFakta] = useState(false);
  const [prisliste, setPrisliste] = useState(null);
  const [kontantTech, setKontantTech] = useState(null);
  const [open, setOpen] = useState({ huseier: true, forvaltning: true, bedrift: false, salg: false, kost: false, rd: false, justering: false });
  const [visMnd, setVisMnd] = useState(false);
  const [antallMnd, setAntallMnd] = useState(N);
  const [endrerHorisont, setEndrerHorisont] = useState(0);
  // Forutsetningene kan skjules (mer plass til tallene). Under xl er de et bunn-ark — start lukket.
  const [railAapen, setRailAapen] = useState(true);
  useEffect(() => { try { if (typeof window !== 'undefined' && window.innerWidth < 1280) setRailAapen(false); } catch (e) {} }, []);

  useEffect(() => { (async () => { try { const j = await api('planer?selskap=digihome'); setDhPlaner((j.planer || []).filter((p) => p.type === 'modell')); } catch (e) { /* stille */ } })(); }, [api]);
  useEffect(() => { if (!apiKey) return; (async () => { try { const r = await fetch(`/api/admin/finance/settings?key=${encodeURIComponent(apiKey)}`); const j = await r.json(); if (j.settings?.prisliste) setPrisliste(j.settings.prisliste); if (j.settings?.kontantTech?.saldo != null) setKontantTech(Number(j.settings.kontantTech.saldo)); } catch (e) { /* stille */ } })(); }, [apiKey]);

  const m = useMemo(() => beregnTech({ antallMnd, drivere: tech, fakta: fakta || {} }), [tech, fakta, antallMnd]);
  const sanert = m.drivere;
  const set = (gruppe, k, v) => { setTech((c) => ({ ...c, [gruppe]: { ...c[gruppe], [k]: v } })); setSkittent(true); };
  const setPartner = (p) => { setTech((c) => ({ ...c, partner: p })); setSkittent(true); };

  const hentFakta = useCallback(async (planId, mnd = antallMnd) => {
    setHenterFakta(true); setFeil('');
    try {
      const j = await api(`plan/tech-fakta?startYm=${plan.startYm}&antallMnd=${mnd}${planId ? `&kobletPlanId=${encodeURIComponent(planId)}` : ''}`);
      setFakta(j.fakta || null); setSkittent(true);
    } catch (e) { setFeil(e.message); }
    setHenterFakta(false);
  }, [api, plan.startYm, antallMnd]);

  const velgKobling = async (id) => { setKobletPlanId(id); setSkittent(true); await hentFakta(id); };
  const endreHorisont = async (n) => {
    if (n === antallMnd || endrerHorisont) return;
    setEndrerHorisont(n);
    try { setAntallMnd(n); setSkittent(true); if (sanert.forvaltning.kilde === 'plan') await hentFakta(kobletPlanId, n); } finally { setEndrerHorisont(0); }
  };

  const lagre = async (overstyr = {}) => {
    if (lagrer) return; setLagrer(true); setFeil('');
    try {
      await api('plan', { method: 'PUT', body: { id: plan.id, navn: navn.trim() || plan.navn, startYm: plan.startYm, antallMnd, status: overstyr.status ?? status, investorSynlig: overstyr.investorSynlig ?? investorSynlig, tech, fakta, kobletPlanId: kobletPlanId || null, notat: plan.notat || '' } });
      setSkittent(false); setLagret(true); setTimeout(() => setLagret(false), 1800); onEndret?.();
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  };
  const slett = async () => { try { await api(`plan?id=${encodeURIComponent(plan.id)}`, { method: 'DELETE' }); onTilbake?.(); } catch (e) { setFeil(e.message); } };

  const s = m.sammendrag; const u = m.unit; const saas = m.saas; const sa = saas.sammendrag; const kunder = saas.kunder;
  const beTekst = s.breakEvenIdx != null ? stor(mndLang(ymPluss(plan.startYm, s.breakEvenIdx))) : 'Utenfor perioden';
  const runwayTekst = kontantTech != null && s.kapitalbehov > 0 ? (kontantTech >= s.kapitalbehov ? ` · dekket av dagens saldo (${kr(kontantTech)})` : ` · saldo ${kr(kontantTech)} dekker ${Math.round((kontantTech / s.kapitalbehov) * 100)} %`) : '';
  const prisHint = prisliste?.forvaltning?.pris != null && Number(prisliste.forvaltning.pris) !== sanert.forvaltning.pris ? `Prislisten i Økonomi sier ${kr(prisliste.forvaltning.pris)} — planen bruker ${kr(sanert.forvaltning.pris)}` : null;
  const avvikHint = fakta?.kildeSystemPerEnhet != null && Number(fakta.kildeSystemPerEnhet) !== sanert.forvaltning.pris ? `Digihome AS-budsjettet regner ${kr(fakta.kildeSystemPerEnhet)} systemkost per enhet — ${Number(fakta.kildeSystemPerEnhet) > sanert.forvaltning.pris ? 'høyere' : 'lavere'} enn Techs pris` : null;
  const enhF = m.enheter.forvaltning;
  const koblet = dhPlaner.find((p) => p.id === kobletPlanId);

  return (
    <div className="w-full" data-testid="tech-modell">
      <ModellTopplinje
        selskap="tech" testPrefix="tech"
        navn={navn} onNavn={(v) => { setNavn(v); setSkittent(true); }} readOnly={readOnly} onTilbake={onTilbake}
        startYm={plan.startYm} antallMnd={antallMnd} onHorisont={endreHorisont} horisontBusy={endrerHorisont}
        horisontHint="Lisensvolumet (enheter under forvaltning) hentes på nytt for hele perioden når kilden er et Digihome AS-budsjett."
        status={status} onStatus={(v) => { setStatus(v); lagre({ status: v }); }}
        investorSynlig={investorSynlig} onInvestorSynlig={(v) => { setInvestorSynlig(v); lagre({ investorSynlig: v }); }}
        onSlett={slett}
        skittent={skittent} lagrer={lagrer} lagret={lagret} onLagre={() => lagre()}
        feil={feil}
      >
        <button onClick={() => setRailAapen((v) => !v)} data-testid={railAapen ? 'tech-rail-skjul' : 'tech-rail-vis'}
          title={railAapen ? 'Skjul forutsetninger — mer plass til tallene' : 'Vis forutsetninger'}
          className={railAapen ? PILL_AKTIV : PILL}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:block">Forutsetninger</span>
        </button>
      </ModellTopplinje>

      <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-start">
        {/* Rail — under xl som bunn-ark over innholdet */}
        {railAapen && (
        <>
        <div className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-[2px] xl:hidden" onClick={() => setRailAapen(false)} data-testid="tech-rail-overlay" />
        <aside
          className="fixed inset-x-0 bottom-0 z-[71] max-h-[84vh] w-full shrink-0 overflow-y-auto overscroll-contain rounded-t-[22px] bg-[#f7f6f3] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-18px_60px_rgba(20,16,40,0.28)] xl:sticky xl:inset-x-auto xl:bottom-auto xl:top-[64px] xl:z-auto xl:max-h-[calc(100vh-76px)] xl:w-[340px] xl:rounded-none xl:bg-transparent xl:p-0 xl:shadow-none"
          data-testid="tech-rail" style={{ scrollbarWidth: 'thin' }}
        >
          <div className="sticky top-0 z-10 -mx-3 mb-1.5 flex items-center justify-between rounded-t-[22px] bg-[#f7f6f3]/95 px-4 pb-1.5 pt-2.5 backdrop-blur xl:hidden">
            <span className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-black/15" />
            <p className="pt-1.5 text-[13.5px] font-bold text-[#1c1917]" style={heading}>Forutsetninger</p>
            <button onClick={() => setRailAapen(false)} data-testid="tech-rail-lukk-mobil" className="mt-0.5 rounded-full bg-[#141414] px-3.5 py-1.5 text-[12px] font-bold text-white transition-all active:scale-95">Ferdig</button>
          </div>
          <div className="rounded-[18px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
          <p className="mb-1 hidden text-[14px] font-bold text-[#1c1917] xl:block" style={heading}>Forutsetninger</p>
          <p className="mb-2 text-[11.5px] leading-snug text-[#a6a19a]">Prisene er Techs. Det Digihome AS betaler er én av dem.</p>

          <Seksjon tittel="Huseiere" ikon={Home} open={open.huseier} onToggle={() => setOpen((o) => ({ ...o, huseier: !o.huseier }))} sammendrag={`${tall(u.huseier.arpu)} kr/enh · ${tall(sanert.huseier.aarligChurnPct)} % churn`} testid="tech-sek-huseier">
            <Felt label="Enheter i dag" verdi={tech.huseier.startEnheter} onEndre={(v) => set('huseier', 'startEnheter', v)} enhet="enh." readOnly={readOnly} testid="tech-huseier-start" />
            <Felt label="Organisk vekst" verdi={tech.huseier.organiskPerMnd} onEndre={(v) => set('huseier', 'organiskPerMnd', v)} enhet="enh/mnd" readOnly={readOnly} slider={{ min: 0, max: 30, step: 0.5 }} />
            <Felt label="Annonsekjøp (media)" verdi={tech.huseier.annonsePerMnd} onEndre={(v) => set('huseier', 'annonsePerMnd', v)} enhet="kr/mnd" readOnly={readOnly} slider={{ min: 0, max: 200000, step: 5000 }} testid="tech-huseier-annonse" hint="betalt trafikk — partnerhonorar og fast markedsføring ligger under Markedsføring & salg" />
            <Felt label="CAC per aktivert enhet (media)" verdi={tech.huseier.cacPerEnhet} onEndre={(v) => set('huseier', 'cacPerEnhet', v)} enhet="kr" readOnly={readOnly} hint={`≈ ${tall(sanert.huseier.organiskPerMnd + sanert.huseier.annonsePerMnd / Math.max(1, sanert.huseier.cacPerEnhet), 1)} nye enheter/mnd i fase 1`} />
            <Felt label="Årlig churn" verdi={tech.huseier.aarligChurnPct} onEndre={(v) => set('huseier', 'aarligChurnPct', v)} enhet="%" readOnly={readOnly} slider={{ min: 0, max: 60, step: 1 }} />
            <div className="py-[6px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[#57534e]">Pris</span>
                <span className="flex items-center gap-1.5">
                  {!readOnly && (
                    <span className="flex h-8 items-center rounded-[8px] bg-[#f0efec] p-0.5">
                      {[['pct', '% av leie'], ['fast', 'kr/mnd']].map(([v, l]) => <button key={v} onClick={() => set('huseier', 'prisModell', v)} className={`h-7 rounded-[6px] px-2 text-[11.5px] font-bold ${sanert.huseier.prisModell === v ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82]'}`}>{l}</button>)}
                    </span>
                  )}
                  <input value={tech.huseier.pris ?? ''} inputMode="decimal" readOnly={readOnly} onChange={(e) => set('huseier', 'pris', e.target.value)} className="h-8 w-[72px] rounded-[8px] bg-[#f5f4f1] px-2 text-right text-[13.5px] font-semibold text-[#1c1917] outline-none ring-1 ring-transparent focus:bg-white focus:ring-[#6d28d9]/40" data-testid="tech-huseier-pris" />
                  <span className="w-12 text-[11px] text-[#a6a19a]">{sanert.huseier.prisModell === 'pct' ? '%' : 'kr'}</span>
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#a6a19a]">≈ {kr(u.huseier.arpu)} per enhet/mnd eks. mva{sanert.huseier.prisModell === 'pct' ? ` ved ${kr(sanert.huseier.snittleie)} leie` : ''}{prisliste?.huseier && (prisliste.huseier.modell !== sanert.huseier.prisModell || Number(prisliste.huseier.pris) !== sanert.huseier.pris) ? ` · prislisten: ${prisliste.huseier.pris}${prisliste.huseier.modell === 'pct' ? ' %' : ' kr'}` : ''}</p>
            </div>
            {sanert.huseier.prisModell === 'pct' && <Felt label="Snittleie" verdi={tech.huseier.snittleie} onEndre={(v) => set('huseier', 'snittleie', v)} enhet="kr/mnd" readOnly={readOnly} />}
          </Seksjon>

          <Seksjon tittel="Lisens · Digihome AS" ikon={Link2} open={open.forvaltning} onToggle={() => setOpen((o) => ({ ...o, forvaltning: !o.forvaltning }))} sammendrag={`${kr(sanert.forvaltning.pris)}/enh · ${tall(enhF[0])}→${tall(enhF[antallMnd - 1])} enh`} testid="tech-sek-forvaltning">
            <div className="py-[6px]">
              <span className="text-[13px] text-[#57534e]">Enheter under forvaltning</span>
              {!readOnly && (
                <span className="mt-1.5 flex h-8 items-center rounded-[8px] bg-[#f0efec] p-0.5">
                  {[['plan', 'Fra budsjett'], ['manuell', 'Manuelt']].map(([v, l]) => <button key={v} onClick={() => set('forvaltning', 'kilde', v)} data-testid={`tech-kilde-${v}`} title={v === 'plan' ? 'Enhetsserien følger et Digihome AS-budsjett (eller dagens portefølje)' : 'Sett enheter og vekst manuelt'} className={`h-7 flex-1 truncate rounded-[6px] px-2 text-[11.5px] font-bold ${sanert.forvaltning.kilde === v ? 'bg-white text-[#1c1917] shadow-sm' : 'text-[#8f8a82]'}`}>{l}</button>)}
                </span>
              )}
            </div>
            {sanert.forvaltning.kilde === 'plan' ? (
              <div className="py-[6px]">
                {!readOnly && (
                  <select value={kobletPlanId} onChange={(e) => velgKobling(e.target.value)} data-testid="tech-kobling" className="h-8 w-full rounded-[8px] bg-[#f5f4f1] px-2 text-[12.5px] font-medium text-[#1c1917] outline-none focus:bg-white focus:ring-1 focus:ring-[#6d28d9]/40">
                    <option value="">Dagens portefølje (uten vekst)</option>
                    {dhPlaner.map((p) => <option key={p.id} value={p.id}>{p.navn} · {p.antallMnd} mnd{p.status === 'vedtatt' ? ' · vedtatt' : ''}</option>)}
                  </select>
                )}
                <div className="mt-1.5 flex items-start justify-between gap-2">
                  <p className="text-[11px] leading-snug text-[#a6a19a]">
                    {fakta?.enheterForvaltning ? <>{tall(enhF[0])} → {tall(enhF[antallMnd - 1])} enheter over perioden · {fakta.kilde === 'plan' ? (koblet?.navn || fakta.kildePlanNavn || 'koblet budsjett') : 'dagens portefølje'}{fakta.oppdatertAt ? ` · hentet ${new Date(fakta.oppdatertAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}` : ''}</> : 'Ingen fakta hentet ennå — trapp brukes.'}
                  </p>
                  {!readOnly && <button onClick={() => hentFakta(kobletPlanId)} disabled={henterFakta} title="Hent enhetsserien på nytt" data-testid="tech-oppdater-fakta" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8f8a82] hover:bg-black/[0.05] hover:text-[#1c1917] disabled:opacity-50">{henterFakta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</button>}
                </div>
              </div>
            ) : (
              <>
                <Felt label="Enheter ved start" verdi={tech.forvaltning.startEnheter} onEndre={(v) => set('forvaltning', 'startEnheter', v)} enhet="enh." readOnly={readOnly} />
                <Felt label="Nye per måned" verdi={tech.forvaltning.nyePerMnd} onEndre={(v) => set('forvaltning', 'nyePerMnd', v)} enhet="enh/mnd" readOnly={readOnly} slider={{ min: 0, max: 15, step: 0.5 }} />
              </>
            )}
            <Felt label="Pris per enhet" verdi={tech.forvaltning.pris} onEndre={(v) => set('forvaltning', 'pris', v)} enhet="kr/mnd" readOnly={readOnly} slider={{ min: 0, max: 600, step: 10 }} testid="tech-forvaltning-pris" hint={prisHint || avvikHint || `Bidrag ${kr(u.forvaltning.bidrag)} per enhet etter variable kostnader · ${u.forvaltning.bruttoMarginPct} % margin`} />
            {prisHint && avvikHint && <p className="text-[11px] text-[#a6a19a]">{avvikHint}</p>}
          </Seksjon>

          <Seksjon tittel="Bedrift" ikon={Building2} open={open.bedrift} onToggle={() => setOpen((o) => ({ ...o, bedrift: !o.bedrift }))} sammendrag={sanert.bedrift.nyeSelskaperPerMnd > 0 ? `${tall(sanert.bedrift.nyeSelskaperPerMnd, 1)} selskap/mnd · ${kr(sanert.bedrift.pris)}/enh` : 'Ikke i planen'} testid="tech-sek-bedrift">
            <Felt label="Salgsstart" verdi={tech.bedrift.fraMnd} onEndre={(v) => set('bedrift', 'fraMnd', v)} enhet="mnd nr" readOnly={readOnly} hint={`Første salg ${mndKort(ymPluss(plan.startYm, Math.max(0, sanert.bedrift.fraMnd - 1)))}`} />
            <Felt label="Nye selskaper" verdi={tech.bedrift.nyeSelskaperPerMnd} onEndre={(v) => set('bedrift', 'nyeSelskaperPerMnd', v)} enhet="per mnd" readOnly={readOnly} slider={{ min: 0, max: 5, step: 0.25 }} testid="tech-bedrift-nye" />
            <Felt label="Enheter per selskap" verdi={tech.bedrift.enheterPerSelskap} onEndre={(v) => set('bedrift', 'enheterPerSelskap', v)} enhet="enh." readOnly={readOnly} />
            <Felt label="Pris per enhet" verdi={tech.bedrift.pris} onEndre={(v) => set('bedrift', 'pris', v)} enhet="kr/mnd" readOnly={readOnly} hint={`≈ ${kr(u.bedrift.arpuSelskap)} per selskap/mnd${prisliste?.bedrift && Number(prisliste.bedrift.pris) !== sanert.bedrift.pris ? ` · prislisten: ${kr(prisliste.bedrift.pris)}` : ''}`} />
            <Felt label="Årlig churn" verdi={tech.bedrift.aarligChurnPct} onEndre={(v) => set('bedrift', 'aarligChurnPct', v)} enhet="%" readOnly={readOnly} slider={{ min: 0, max: 30, step: 1 }} />
            <Felt label="Salgskost per selskap" verdi={tech.bedrift.salgskostPerSelskap} onEndre={(v) => set('bedrift', 'salgskostPerSelskap', v)} enhet="kr" readOnly={readOnly} hint={u.bedrift.paybackMnd ? `Payback ${tall(u.bedrift.paybackMnd, 1)} mnd · LTV/CAC ${tall(u.bedrift.ltvCac, 1)}× (full CAC)` : null} />
          </Seksjon>

          <Seksjon tittel="Markedsføring & salg" ikon={Megaphone} open={open.salg} onToggle={() => setOpen((o) => ({ ...o, salg: !o.salg }))}
            sammendrag={`${kr(sanert.kost.markedsforingFast)}/mnd${sanert.partner.paa ? ` · partner ${tall(sanert.partner.honorarPct, 0)} %` : ''}`} testid="tech-sek-salg">
            <p className="pb-1 pt-0.5 text-[11px] leading-snug text-[#a6a19a]">S&M = annonsekjøp (under Huseiere) + salgskost (under Bedrift) + fast markedsføring + performance-partner.</p>
            <Felt label="Fast markedsføring" verdi={tech.kost.markedsforingFast} onEndre={(v) => set('kost', 'markedsforingFast', v)} enhet="kr/mnd" readOnly={readOnly} testid="tech-kost-mf" hint="merkevare, innhold, verktøy — uavhengig av volum" />
            <PartnerKort
              verdi={sanert.partner} readOnly={readOnly} enhetsnavn="kunde" testid="tech-partner"
              onEndre={setPartner}
              grupper={[{ id: 'huseier', label: 'Huseiere' }, { id: 'bedrift', label: 'Bedrift' }, { id: 'forvaltning', label: 'Lisens · Digihome AS' }]}
              perKunde={sanert.partner.paa && sanert.partner.gjelder.huseier ? u.huseier.partner : null}
              iPerioden={sanert.partner.paa ? sa.sm.partner : null}
              andelPct={sanert.partner.paa && s.sumInntekt > 0 ? Math.round((sa.sm.partner / s.sumInntekt) * 100) : null}
            />
            <p className="mt-2 text-[11px] leading-snug text-[#a6a19a]">
              S&M i perioden: <b className="text-[#57534e]">{kr(sa.sumSm)}</b>{sa.sm.andelPct != null ? ` · ${sa.sm.andelPct} % av inntekten` : ''}
            </p>
          </Seksjon>

          <Seksjon tittel="COGS · per enhet" ikon={Layers} open={open.kost} onToggle={() => setOpen((o) => ({ ...o, kost: !o.kost }))} sammendrag={`${kr(u.variabelPerEnhet)}/enh · hosting ${kr(sanert.kost.hostingFast)}`} testid="tech-sek-kost">
            <Felt label="Variabel per enhet" verdi={tech.kost.variabelPerEnhet} onEndre={(v) => set('kost', 'variabelPerEnhet', v)} enhet="kr/mnd" readOnly={readOnly} hint="API/LLM, SMS, e-signering per aktiv enhet" />
            <Felt label="Support-timer per 100 enheter" verdi={tech.kost.supportTimerPer100} onEndre={(v) => set('kost', 'supportTimerPer100', v)} enhet="t/mnd" readOnly={readOnly} />
            <Felt label="Timekost support" verdi={tech.kost.timekost} onEndre={(v) => set('kost', 'timekost', v)} enhet="kr/t" readOnly={readOnly} />
            <Felt label="Hosting og infrastruktur" verdi={tech.kost.hostingFast} onEndre={(v) => set('kost', 'hostingFast', v)} enhet="kr/mnd" readOnly={readOnly} hint={`Bruttomargin ${sa.bruttoMarginPct ?? '—'} % i perioden`} />
          </Seksjon>

          <Seksjon tittel="R&D og G&A" ikon={Cpu} open={open.rd} onToggle={() => setOpen((o) => ({ ...o, rd: !o.rd }))} sammendrag={`${kr(sanert.kost.utviklingFast + sanert.kost.andreFaste)}/mnd`} testid="tech-sek-rd">
            <Felt label="Utvikling og drift (R&D)" verdi={tech.kost.utviklingFast} onEndre={(v) => set('kost', 'utviklingFast', v)} enhet="kr/mnd" readOnly={readOnly} slider={{ min: 0, max: 500000, step: 10000 }} testid="tech-kost-utvikling" hint="Utviklere, design, drift av plattformen" />
            <Felt label="Andre faste (G&A)" verdi={tech.kost.andreFaste} onEndre={(v) => set('kost', 'andreFaste', v)} enhet="kr/mnd" readOnly={readOnly} hint="Regnskap, forsikring, programvare, kontor" />
          </Seksjon>

          <Seksjon tittel="Pris og kost fra år 2" ikon={CalendarClock} open={open.justering} onToggle={() => setOpen((o) => ({ ...o, justering: !o.justering }))} sammendrag={`${tall(sanert.justering.prisIndeksPct, 1)} % pris · ${tall(sanert.justering.kostInflasjonPct, 1)} % kost`} testid="tech-sek-justering">
            <Felt label="Prisindeks (fra år 2)" verdi={tech.justering.prisIndeksPct} onEndre={(v) => set('justering', 'prisIndeksPct', v)} enhet="%/år" readOnly={readOnly} />
            <Felt label="Kostnadsvekst (fra år 2)" verdi={tech.justering.kostInflasjonPct} onEndre={(v) => set('justering', 'kostInflasjonPct', v)} enhet="%/år" readOnly={readOnly} />
          </Seksjon>
          </div>
        </aside>
        </>
        )}

        {/* Hoved */}
        <main className="min-w-0 flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 2xl:grid-cols-6" data-testid="tech-kpi">
            <Kpi label="ARR ved slutt" verdi={kr(sa.arrExit)} tone="lilla" testid="tech-kpi-arr" under={`fra ${kr(sa.arrStart)}${sa.cmgrPct != null ? ` · ${tall(sa.cmgrPct, 1)} % MRR-vekst/mnd` : ''}`} />
            <Kpi label="Bruttomargin" verdi={sa.bruttoMarginPct != null ? `${sa.bruttoMarginPct} %` : '—'} testid="tech-kpi-brutto" under={`COGS ${kr(sa.sumCogs)} i perioden`} bench={BENCH.bruttoMargin(sa.bruttoMarginPct)} />
            <Kpi label="Burn multiple" verdi={sa.burnMultiple != null ? `${tall(sa.burnMultiple, 1)}×` : '—'} testid="tech-kpi-burn" under={`brenn ${kr(sa.netBurn)} / ny ARR ${kr(sa.netNyArr)}`} bench={BENCH.burn(sa.burnMultiple)} />
            <Kpi label="CAC-payback" verdi={sa.cacPaybackBlended != null ? `${tall(sa.cacPaybackBlended, 1)} mnd` : '—'} testid="tech-kpi-payback" under={`blandet · S&M ${kr(sa.sumSm)} / ny MRR × margin`} bench={BENCH.payback(sa.cacPaybackBlended)} />
            <Kpi label="Break-even" verdi={s.breakEvenIdx != null ? beTekst : 'Nås ikke'} liten={s.breakEvenIdx != null} testid="tech-kpi-be" under={s.breakEvenIdx != null ? `ved ${tall(m.enheter.total[s.breakEvenIdx])} enheter · MRR ${kr(saas.mrr[s.breakEvenIdx])}` : `innen ${antallMnd} mnd · EBITDA ${krS(s.resultat)} i perioden`} tone={s.breakEvenIdx != null ? 'pos' : undefined} />
            <Kpi label="Kapitalbehov" verdi={kr(s.kapitalbehov)} testid="tech-kpi-kapital" under={s.kapitalbehovIdx != null ? `dypest ${mndKort(ymPluss(plan.startYm, s.kapitalbehovIdx))}${runwayTekst}` : 'aldri i minus'} />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <div className="min-w-0 rounded-[18px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                <p className="min-w-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">MRR per kundegruppe <span className="hidden font-medium normal-case tracking-normal 2xl:inline">· stablet per måned — kostnadslinjen krysses i break-even</span></p>
                <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-[#8f8a82]">
                  {[['forvaltning', 'Lisens · Digihome AS'], ['huseier', 'Huseiere'], ['bedrift', 'Bedrift']].map(([k, l]) => <span key={k} className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE[k] }} /> {l}</span>)}
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="inline-block h-[2px] w-4 border-t-2 border-dashed" style={{ borderColor: FARGE.kost }} /> Kostnader</span>
                </p>
              </div>
              <TechGraf m={m} startYm={plan.startYm} />
            </div>
            <div className="min-w-0 rounded-[18px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">MRR-bro <span className="font-medium normal-case tracking-normal">· {mndKort(plan.startYm)} → {mndKort(ymPluss(plan.startYm, antallMnd - 1))}</span></p>
              <MrrBro bro={sa.bro} />
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-black/[0.05] pt-3 text-[12px]">
                <div className="min-w-0"><p className="truncate text-[#a6a19a]">Netto ny MRR/mnd</p><p className="truncate font-semibold text-[#1c1917]" title={kr(sa.netNyMrrSnitt)}>{kr(sa.netNyMrrSnitt)}</p></div>
                <div className="min-w-0"><p className="flex items-center gap-1 truncate text-[#a6a19a]"><Prikk b={BENCH.grr(sa.grrPct)} /> Brutto retensjon</p><p className="truncate font-semibold text-[#1c1917]">{sa.grrPct} % / år</p></div>
                <div className="min-w-0" title={sa.ruleOf40 != null ? `ARR-vekst ${sa.vekst12Pct} % + EBITDA-margin ${sa.margin12Pct} %` : 'Rule of 40 gir mening først når MRR-basen er etablert (≈ 600 k ARR)'}>
                  <p className="flex items-center gap-1 truncate text-[#a6a19a]"><Prikk b={BENCH.ruleOf40(sa.ruleOf40)} /> Rule of 40</p>
                  {sa.ruleOf40 != null
                    ? <p className="truncate font-semibold text-[#1c1917]">{sa.ruleOf40}<span className="ml-1 text-[11px] font-normal text-[#a6a19a]">{sa.vekst12Pct} % + {sa.margin12Pct < 0 ? '−' : ''}{Math.abs(sa.margin12Pct)} %</span></p>
                    : <p className="truncate font-semibold text-[#a6a19a]">— <span className="text-[11px] font-normal">tidlig fase</span></p>}
                </div>
              </div>
            </div>
          </div>

          {/* Unit economics per kundegruppe — full CAC = media/salg + partnerhonorar */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="tech-unit-huseier">
              <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#1c1917]"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.huseier }} /> Huseiere</p>
              <dl className="mt-2 divide-y divide-black/[0.05] text-[12.5px]">
                {[['ARPU', kr(u.huseier.arpu)], ['Bidrag / mnd', `${kr(u.huseier.bidrag)} · ${u.huseier.bruttoMarginPct} %`], ['CAC · media', kr(u.huseier.cac)],
                  ...(u.huseier.partner ? [['+ Partnerhonorar', kr(u.huseier.partner)], ['= Full CAC', kr(u.huseier.fullCac)]] : []),
                  ['Payback', u.huseier.paybackMnd ? `${tall(u.huseier.paybackMnd, 1)} mnd` : '—'], ['LTV / CAC', u.huseier.ltvCac ? `${tall(u.huseier.ltvCac, 1)}×` : '—']].map(([l, v]) => <div key={l} className="flex justify-between gap-2 py-1.5"><dt className={`truncate ${l.startsWith('=') ? 'text-[#57534e]' : 'text-[#8f8a82]'}`}>{l}</dt><dd className="shrink-0 font-semibold text-[#1c1917]">{v}</dd></div>)}
              </dl>
            </div>
            <div className="rounded-[16px] bg-[#1c1917] p-4 text-white" data-testid="tech-unit-forvaltning">
              <p className="flex items-center gap-2 text-[12.5px] font-bold"><span className="h-2.5 w-2.5 rounded-[3px] bg-white/80" /> Lisens · Digihome AS <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide">Internt</span></p>
              <dl className="mt-2 divide-y divide-white/10 text-[12.5px]">
                {[['Pris per enhet', kr(u.forvaltning.prisPerEnhet)], ['Bidrag / enhet', `${kr(u.forvaltning.bidrag)} · ${u.forvaltning.bruttoMarginPct} %`],
                  ...(u.forvaltning.partner ? [['Partnerhonorar / ny enhet', kr(u.forvaltning.partner)]] : []),
                  ['Enheter ved slutt', tall(s.enheterVedSlutt.forvaltning)], ['Inntekt i perioden', kr(s.sumForvaltning)], ['Andel av Tech', `${s.andelForvaltningPct ?? 0} %`]].map(([l, v]) => <div key={l} className="flex justify-between gap-2 py-1.5"><dt className="truncate text-white/55">{l}</dt><dd className="shrink-0 font-semibold">{v}</dd></div>)}
              </dl>
              <p className="mt-2 text-[11px] leading-snug text-white/45">Følger porteføljen i Digihome AS-budsjettet. Elimineres i konsernet.</p>
            </div>
            <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="tech-unit-bedrift">
              <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#1c1917]"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARGE.bedrift }} /> Bedrift</p>
              <dl className="mt-2 divide-y divide-black/[0.05] text-[12.5px]">
                {[['Per selskap / mnd', kr(u.bedrift.arpuSelskap)], ['Bidrag / selskap', kr(u.bedrift.bidragSelskap)], ['CAC · salg', kr(u.bedrift.cacSelskap)],
                  ...(u.bedrift.partner ? [['+ Partnerhonorar', kr(u.bedrift.partner)], ['= Full CAC', kr(u.bedrift.fullCac)]] : []),
                  ['Payback', u.bedrift.paybackMnd ? `${tall(u.bedrift.paybackMnd, 1)} mnd` : '—'], ['LTV / CAC', u.bedrift.ltvCac ? `${tall(u.bedrift.ltvCac, 1)}×` : '—']].map(([l, v]) => <div key={l} className="flex justify-between gap-2 py-1.5"><dt className={`truncate ${l.startsWith('=') ? 'text-[#57534e]' : 'text-[#8f8a82]'}`}>{l}</dt><dd className="shrink-0 font-semibold text-[#1c1917]">{v}</dd></div>)}
              </dl>
            </div>
          </div>

          {/* SaaS-resultat per planår */}
          <div className="overflow-x-auto rounded-[18px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="tech-aar">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Resultat per planår <span className="font-medium normal-case tracking-normal">· SaaS-oppstilling</span></p>
              <p className="min-w-0 text-[11px] leading-snug text-[#a6a19a]">COGS = variable + support + hosting · S&M = annonsekjøp + partner + markedsføring + salg · R&D = utvikling · G&A = andre faste</p>
            </div>
            <table className="w-full text-[13px]">
              <thead><tr className="text-[10.5px] uppercase tracking-wide text-[#a6a19a]"><th className="pb-2 text-left font-bold">Linje</th>{m.aar.map((a) => <th key={a.nr} className="whitespace-nowrap pb-2 pl-3 text-right font-bold">År {a.nr}{a.antallMnd < 12 ? <span className="ml-1 font-medium normal-case">({a.antallMnd} mnd)</span> : ''}</th>)}<th className="whitespace-nowrap pb-2 pl-3 text-right font-bold">Perioden</th></tr></thead>
              <tbody>
                {[
                  ['Inntekt · huseiere', (a) => a.huseier, s.sumHuseier], ['Inntekt · lisens Digihome AS', (a) => a.forvaltning, s.sumForvaltning], ['Inntekt · bedrift', (a) => a.bedrift, s.sumBedrift],
                  ['Sum inntekt', (a) => a.inntekt, s.sumInntekt, 'fet'],
                  ['COGS', (a) => -a.cogs, -sa.sumCogs], ['Bruttoresultat', (a) => a.brutto, sa.sumBrutto, 'fet', (a) => a.bruttoPct, sa.bruttoMarginPct],
                  ['S&M', (a) => -a.sm, -sa.sumSm, 'fet'],
                  ['· annonsekjøp', (a) => -a.smAnnonser, -sa.sm.annonser, 'under'],
                  ...(sa.sm.partner ? [['· performance-partner', (a) => -a.smPartner, -sa.sm.partner, 'under']] : []),
                  ...(sa.sm.markedsforing ? [['· fast markedsføring', (a) => -a.smMarkedsforing, -sa.sm.markedsforing, 'under']] : []),
                  ...(sa.sm.salg ? [['· salg bedrift', (a) => -a.smSalg, -sa.sm.salg, 'under']] : []),
                  ['R&D · utvikling og drift', (a) => -a.rd, -sa.sumRd], ['G&A · andre faste', (a) => -a.ga, -sa.sumGa],
                  ['EBITDA', (a) => a.resultat, s.resultat, 'fet', (a) => a.marginPct, s.sumInntekt > 0 ? Math.round((s.resultat / s.sumInntekt) * 100) : null],
                  ['Netto ny MRR', (a) => a.netNyMrr, sa.bro.slutt - sa.bro.start], ['Kunder ved slutt', (a) => a.kunderSlutt, kunder.total[antallMnd - 1], null, null, null, true], ['ARR ved slutt', (a) => a.arrExit, sa.arrExit, null, null, null, true],
                ].map(([l, f, tot, stil, pct, totPct, erAntall]) => (
                  <tr key={l} className={`${stil === 'under' ? '' : 'border-t border-black/[0.05]'} ${stil === 'fet' ? 'font-semibold text-[#1c1917]' : stil === 'under' ? 'text-[12px] text-[#8f8a82]' : 'text-[#57534e]'}`}>
                    <td className={`whitespace-nowrap ${stil === 'under' ? 'py-1 pl-3' : 'py-2'}`}>{l}</td>
                    {m.aar.map((a) => { const v = f(a); return <td key={a.nr} className={`whitespace-nowrap pl-3 text-right ${stil === 'under' ? 'py-1' : 'py-2'} ${l === 'EBITDA' ? (v >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]') : ''}`}>{erAntall && l.startsWith('Kunder') ? tall(v) : krS(v)}{pct && pct(a) != null ? <span className="ml-1 text-[11px] font-medium text-[#a6a19a]">{pct(a)} %</span> : null}</td>; })}
                    <td className={`whitespace-nowrap pl-3 text-right ${stil === 'under' ? 'py-1 font-medium' : 'py-2 font-semibold'} ${l === 'EBITDA' ? (tot >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]') : ''}`}>{erAntall && l.startsWith('Kunder') ? tall(tot) : krS(tot)}{totPct != null ? <span className="ml-1 text-[11px] font-medium text-[#a6a19a]">{totPct} %</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Månedstabell */}
          <div className="rounded-[18px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <button onClick={() => setVisMnd((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left" data-testid="tech-mnd-toggle">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Resultatoppstilling per måned <span className="font-medium normal-case tracking-normal">· beløp i kr, beregnet fra driverne</span></span>
              <ChevronDown className={`h-4 w-4 text-[#c2beb8] transition-transform ${visMnd ? 'rotate-180' : ''}`} />
            </button>
            {visMnd && (
              <div className="overflow-x-auto px-5 pb-5">
                <table className="w-full text-[12px]">
                  <thead><tr className="text-[10.5px] uppercase tracking-wide text-[#a6a19a]"><th className="sticky left-0 bg-white pb-2 pr-3 text-left font-bold">Linje</th>{Array.from({ length: antallMnd }, (_, i) => <th key={i} className="pb-2 pl-3 text-right font-bold whitespace-nowrap">{mndKort(ymPluss(plan.startYm, i))}</th>)}<th className="pb-2 pl-3 text-right font-bold">Totalt</th></tr></thead>
                  <tbody>
                    {[
                      ['MRR · huseiere', m.inntekt.huseier], ['MRR · lisens Digihome AS', m.inntekt.forvaltning], ['MRR · bedrift', m.inntekt.bedrift], ['Sum MRR', saas.mrr, true],
                      ['Ny MRR', saas.nyMrr], ['Churnet MRR', saas.churnMrr], ['Netto ny MRR', saas.netNyMrr, true],
                      ['Kunder · huseiere', kunder.huseier, false, true], ['Kunder · bedrifter', kunder.bedrift, false, true], ['Enheter på plattformen', m.enheter.total, false, true],
                      ['COGS', saas.cogs], ['Bruttoresultat', saas.brutto, true], ['S&M', saas.sm, true], ['· annonsekjøp', m.kost.annonser], ...(sa.sm.partner ? [['· performance-partner', m.kost.partner]] : []), ...(sa.sm.markedsforing ? [['· fast markedsføring', m.kost.markedsforing]] : []), ...(sa.sm.salg ? [['· salg bedrift', m.kost.salg]] : []), ['R&D', saas.rd], ['G&A', saas.ga],
                      ['EBITDA', m.resultat, true], ['Akkumulert', m.akkumulert, true, false, true],
                    ].map(([l, serie, fet, erEnh, ingenSum]) => (
                      <tr key={l} className={`border-t border-black/[0.04] ${fet ? 'font-semibold text-[#1c1917]' : 'text-[#57534e]'}`}>
                        <td className="sticky left-0 bg-white py-1.5 pr-3 whitespace-nowrap">{l}</td>
                        {serie.map((v, i) => <td key={i} className={`py-1.5 pl-3 text-right whitespace-nowrap ${l === 'EBITDA' || l === 'Akkumulert' || l === 'Netto ny MRR' ? (v >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]') : ''}`}>{erEnh ? tall(v, l.includes('bedrifter') ? 1 : 0) : tall(v)}</td>)}
                        <td className="py-1.5 pl-3 text-right font-semibold">{ingenSum ? '' : erEnh ? tall(serie[serie.length - 1]) : tall(serie.reduce((a, b) => a + b, 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="flex items-start gap-1.5 px-1 text-[11.5px] text-[#a6a19a]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Alle beløp eks. mva. Lisensen fra Digihome AS er intern inntekt — den elimineres i konsernbildet. Endringer lagres først når du trykker Lagre.</p>
        </main>
      </div>
    </div>
  );
}
