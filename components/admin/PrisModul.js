'use client';

/* ───────────────────────────────────────────────────────────────────────────
   PrisModul — DigiHome Tech AS sin B2B-prisliste + faktureringsregler.

   Tech er ren leverandør: fakturerer forvaltere/eiendomsselskaper per enhet
   (volumtrinn). DigiHome AS er første kunde. Sluttkundepriser (5 %, honorar)
   bor i appen og vises IKKE her.

   Til høyre: «Neste faktura» — et live faktureringsgrunnlag beregnet fra
   leieforholdene, som oppdateres mens du redigerer prislisten.
─────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Tags, Plus, Trash2, Building2, Percent, CalendarClock, ReceiptText, Save,
  Layers, SlidersHorizontal, CheckCircle2, Loader2, ChevronDown, Info, Sparkles,
} from 'lucide-react';

const LILLA = '#7a3fa8';
const kr = (n) => `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))} kr`;
const nb = (n) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const mndLabel = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MND[(m || 1) - 1]} ${y}`; };
const forrigeMnd = () => { const d = new Date(); const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };

const GRUNNLAG = [
  { v: 'utleid_mnd', l: 'Utleid i måneden', d: 'Teller enheter som var utleid (signert kontrakt) i løpet av måneden.' },
  { v: 'prorata', l: 'Prorata per dag', d: 'Teller utleide dager delt på dager i måneden — mest presist ved inn/utflytting.' },
  { v: 'alle', l: 'Alle under forvaltning', d: 'Teller alle enheter med aktiv forvaltning, også ledige.' },
];

function Seksjon({ ikon: Ikon, tittel, under, children, hoyre }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ background: 'rgba(122,63,168,0.09)', color: LILLA }}><Ikon className="h-4.5 w-4.5" strokeWidth={2} /></span>
          <div>
            <h3 className="text-[15px] font-semibold text-black/85">{tittel}</h3>
            {under ? <p className="mt-0.5 text-[12.5px] leading-[1.5] text-black/45">{under}</p> : null}
          </div>
        </div>
        {hoyre}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Felt({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-black/55">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11.5px] text-black/40">{hint}</span> : null}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[14px] tabular-nums outline-none transition-colors focus:border-[#7a3fa8]';

function Nedtrekk({ verdi, valg, onChange }) {
  return (
    <div className="relative">
      <select value={verdi} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none pr-9`}>
        {valg.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
    </div>
  );
}

export default function PrisModul({ apiKey = '' }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [cfg, setCfg] = useState(null);
  const [lagret, setLagret] = useState(null); // sist lagrede (for dirty-sjekk)
  const [maaned, setMaaned] = useState(forrigeMnd());
  const [grunnlag, setGrunnlag] = useState(null);
  const [laster, setLaster] = useState(true);
  const [lagrer, setLagrer] = useState(false);
  const [ok, setOk] = useState(false);
  const [visEnheter, setVisEnheter] = useState(false);
  const forhRef = useRef(0);

  const dirty = useMemo(() => cfg && lagret && JSON.stringify(cfg) !== JSON.stringify(lagret), [cfg, lagret]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/pris/config?${q}`, { cache: 'no-store' });
        const d = await r.json();
        if (d.config) { setCfg(d.config); setLagret(d.config); }
      } catch (e) { /* noop */ }
      setLaster(false);
    })();
  }, [q]);

  // Live forhåndsvisning av faktureringsgrunnlaget (bruker u-lagret prisliste).
  const forhaandsvis = useCallback(async (config, mnd) => {
    if (!config) return;
    const kjor = ++forhRef.current;
    try {
      const r = await fetch(`/api/admin/pris/grunnlag?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maaned: mnd, config }) });
      const d = await r.json();
      if (kjor === forhRef.current && d.grunnlag) setGrunnlag(d.grunnlag);
    } catch (e) { /* noop */ }
  }, [q]);

  useEffect(() => {
    if (!cfg) return undefined;
    const t = setTimeout(() => forhaandsvis(cfg, maaned), 260);
    return () => clearTimeout(t);
  }, [cfg, maaned, forhaandsvis]);

  const lagre = async () => {
    if (!cfg) return;
    setLagrer(true); setOk(false);
    try {
      const r = await fetch(`/api/admin/pris/config?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
      const d = await r.json();
      if (d.config) { setCfg(d.config); setLagret(d.config); setOk(true); setTimeout(() => setOk(false), 2200); }
    } catch (e) { /* noop */ }
    setLagrer(false);
  };

  const settTrinn = (i, felt, val) => setCfg((c) => ({ ...c, trinn: c.trinn.map((t, j) => (j === i ? { ...t, [felt]: val === '' ? '' : Number(val) } : t)) }));
  const leggTilTrinn = () => setCfg((c) => { const sist = c.trinn[c.trinn.length - 1]; return { ...c, trinn: [...c.trinn, { fraEnheter: (sist?.fraEnheter || 0) + 50, pris: Math.max(0, (sist?.pris || 0) - 50) }] }; });
  const fjernTrinn = (i) => setCfg((c) => ({ ...c, trinn: c.trinn.length > 1 ? c.trinn.filter((_, j) => j !== i) : c.trinn }));

  if (laster || !cfg) {
    return <div className="flex h-64 items-center justify-center text-black/40"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Laster prisliste …</div>;
  }

  const perType = cfg.prisModell === 'per_type';
  const maanedValg = (() => { const out = []; const d = new Date(); for (let i = 1; i <= 15; i += 1) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); const ym = `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; out.push({ v: ym, l: mndLabel(ym) }); } return out; })();

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-[24px] font-semibold tracking-[-0.02em] text-black/90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: LILLA, color: '#fff' }}><Tags className="h-5 w-5" strokeWidth={2} /></span>
            Pris
          </h1>
          <p className="mt-1.5 text-[13.5px] text-black/50">DigiHome Tech AS · plattformpriser for forvaltere og eiendomsselskaper (B2B). DigiHome AS er første kunde.</p>
        </div>
        <button onClick={lagre} disabled={!dirty || lagrer} className="flex h-10 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: dirty ? LILLA : '#151310' }}>
          {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {ok ? 'Lagret' : dirty ? 'Lagre endringer' : 'Lagret'}
        </button>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        {/* ── Venstre: prisliste + regler ── */}
        <div className="space-y-5">
          {/* Prismodell */}
          <Seksjon ikon={Layers} tittel="Prismodell" under="Hvordan enhetene prises på fakturaen til forvalterkunden.">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { v: 'blandet', t: 'Blandet (1a)', d: 'Én forvaltersats for alle enheter — én linje på fakturaen.' },
                { v: 'per_type', t: 'Per enhetstype (1b)', d: 'Egen sats for selvbetjente enheter — egne linjer.' },
              ].map((o) => {
                const aktiv = cfg.prisModell === o.v;
                return (
                  <button key={o.v} onClick={() => setCfg((c) => ({ ...c, prisModell: o.v }))} className="rounded-xl border p-4 text-left transition-all" style={{ borderColor: aktiv ? LILLA : 'rgba(0,0,0,0.1)', background: aktiv ? 'rgba(122,63,168,0.05)' : '#fff', boxShadow: aktiv ? `inset 0 0 0 1px ${LILLA}` : 'none' }}>
                    <p className="text-[14px] font-semibold" style={{ color: aktiv ? LILLA : '#151310' }}>{o.t}</p>
                    <p className="mt-1 text-[12px] leading-[1.45] text-black/50">{o.d}</p>
                  </button>
                );
              })}
            </div>
          </Seksjon>

          {/* Volumtrinn */}
          <Seksjon ikon={Building2} tittel="Volumtrinn" under="Pris per enhet per måned (eks. mva). Hele porteføljen prises etter trinnet antallet enheter faller innenfor.">
            <div className="space-y-2.5">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1 text-[11px] font-medium uppercase tracking-[0.06em] text-black/40">
                <span>Fra antall enheter</span><span>Pris per enhet / mnd</span><span />
              </div>
              {cfg.trinn.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                  <div className="relative">
                    <input type="number" min={0} value={t.fraEnheter} disabled={i === 0} onChange={(e) => settTrinn(i, 'fraEnheter', e.target.value)} className={`${inputCls} ${i === 0 ? 'bg-black/[0.03] text-black/45' : ''}`} />
                    {i === 0 ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-black/35">standard</span> : null}
                  </div>
                  <div className="relative">
                    <input type="number" min={0} value={t.pris} onChange={(e) => settTrinn(i, 'pris', e.target.value)} className={`${inputCls} pr-10`} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/35">kr</span>
                  </div>
                  <button onClick={() => fjernTrinn(i)} disabled={cfg.trinn.length <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg text-black/35 transition-colors hover:bg-black/[0.04] hover:text-red-600 disabled:opacity-25">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={leggTilTrinn} className="mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-black/[0.03]" style={{ color: LILLA }}>
                <Plus className="h-4 w-4" /> Legg til trinn
              </button>
            </div>

            {perType ? (
              <div className="mt-5 border-t border-black/[0.06] pt-5">
                <Felt label="Sats for selvbetjente enheter (kr/enhet/mnd, eks. mva)" hint="Brukes kun i modellen «Per enhetstype».">
                  <div className="relative max-w-[220px]">
                    <input type="number" min={0} value={cfg.selvbetjentPris} onChange={(e) => setCfg((c) => ({ ...c, selvbetjentPris: Number(e.target.value) }))} className={`${inputCls} pr-10`} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/35">kr</span>
                  </div>
                </Felt>
              </div>
            ) : null}
          </Seksjon>

          {/* Faktureringsgrunnlag */}
          <Seksjon ikon={SlidersHorizontal} tittel="Faktureringsgrunnlag" under="Hvilke enheter som telles hver måned.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Felt label={perType ? 'Forvaltede enheter' : 'Grunnlag'} hint={GRUNNLAG.find((g) => g.v === cfg.grunnlag)?.d}>
                <Nedtrekk verdi={cfg.grunnlag} valg={GRUNNLAG} onChange={(v) => setCfg((c) => ({ ...c, grunnlag: v }))} />
              </Felt>
              {perType ? (
                <Felt label="Selvbetjente enheter" hint={GRUNNLAG.find((g) => g.v === cfg.grunnlagSelvbetjent)?.d}>
                  <Nedtrekk verdi={cfg.grunnlagSelvbetjent} valg={GRUNNLAG} onChange={(v) => setCfg((c) => ({ ...c, grunnlagSelvbetjent: v }))} />
                </Felt>
              ) : null}
            </div>
          </Seksjon>

          {/* Fakturainnstillinger */}
          <Seksjon ikon={CalendarClock} tittel="Fakturainnstillinger" under="Gjelder den automatiske månedsfaktureringen.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Felt label="Produktnavn (fakturalinje)"><input value={cfg.produktnavn} onChange={(e) => setCfg((c) => ({ ...c, produktnavn: e.target.value }))} className={inputCls} /></Felt>
              <Felt label="Leveringsmåte" hint="EHF sendes automatisk til kundens org.nr.">
                <Nedtrekk verdi={cfg.levering} valg={[{ v: 'EHF', l: 'EHF (elektronisk)' }, { v: 'PdfByEmail', l: 'PDF på e-post' }]} onChange={(v) => setCfg((c) => ({ ...c, levering: v }))} />
              </Felt>
              <Felt label="Fakturadag i måneden"><input type="number" min={1} max={28} value={cfg.fakturadag} onChange={(e) => setCfg((c) => ({ ...c, fakturadag: Number(e.target.value) }))} className={inputCls} /></Felt>
              <Felt label="Betalingsfrist (dager)"><input type="number" min={0} max={90} value={cfg.betalingsfristDager} onChange={(e) => setCfg((c) => ({ ...c, betalingsfristDager: Number(e.target.value) }))} className={inputCls} /></Felt>
              <Felt label="Mva-sats (%)"><input type="number" min={0} max={100} value={cfg.mvaSats} onChange={(e) => setCfg((c) => ({ ...c, mvaSats: Number(e.target.value) }))} className={inputCls} /></Felt>
            </div>
          </Seksjon>
        </div>

        {/* ── Høyre: Neste faktura (live) ── */}
        <div className="space-y-5">
          <div className="sticky top-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.28)]">
            {/* Fakturahode */}
            <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: '#151310', color: '#F4F1EA' }}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(244,241,234,0.1)' }}><ReceiptText className="h-4 w-4" /></span>
                <div>
                  <p className="text-[14px] font-semibold">Neste faktura</p>
                  <p className="text-[11.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Tech → DigiHome AS · forhåndsvisning</p>
                </div>
              </div>
              <div className="relative">
                <select value={maaned} onChange={(e) => setMaaned(e.target.value)} className="appearance-none rounded-lg bg-white/10 py-1.5 pl-3 pr-8 text-[12.5px] font-medium text-white outline-none">
                  {maanedValg.map((o) => <option key={o.v} value={o.v} className="text-black">{o.l}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
              </div>
            </div>

            <div className="p-5">
              {/* Sum */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-black/40">Å fakturere</p>
                  <p className="mt-1 text-[38px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-black/90">{kr(grunnlag?.sumInkMva || 0)}</p>
                  <p className="mt-1.5 text-[12.5px] text-black/45">inkl. {cfg.mvaSats}% mva · {mndLabel(maaned)}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA }}>{nb(grunnlag?.antallEnheter || 0)} enheter</span>
              </div>

              {/* Linjer */}
              <div className="mt-5 space-y-2.5 border-t border-black/[0.06] pt-4">
                {(grunnlag?.linjer || []).map((l) => (
                  <div key={l.type} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-black/80">{l.beskrivelse}</p>
                      <p className="text-[12px] text-black/45">{l.vekt !== l.antall ? `${nb(l.vekt)} av ${nb(l.antall)} enheter (prorata)` : `${nb(l.antall)} enheter`} × {kr(l.pris)}</p>
                    </div>
                    <p className="shrink-0 text-[14px] font-semibold tabular-nums text-black/85">{kr(l.belop)}</p>
                  </div>
                ))}
                {!(grunnlag?.linjer || []).length ? <p className="text-[13px] text-black/40">Ingen enheter i grunnlaget for {mndLabel(maaned)}.</p> : null}
              </div>

              {/* Sumlinjer */}
              <div className="mt-4 space-y-1.5 border-t border-black/[0.06] pt-4 text-[13px]">
                <div className="flex justify-between text-black/55"><span>Sum eks. mva</span><span className="tabular-nums">{kr(grunnlag?.sumEksMva || 0)}</span></div>
                <div className="flex justify-between text-black/55"><span>Mva {cfg.mvaSats}%</span><span className="tabular-nums">{kr(grunnlag?.mva || 0)}</span></div>
                <div className="flex justify-between pt-1 text-[15px] font-semibold text-black/90"><span>Totalt</span><span className="tabular-nums">{kr(grunnlag?.sumInkMva || 0)}</span></div>
              </div>

              {/* Enhetsliste */}
              {(grunnlag?.linjer || []).some((l) => l.enheter?.length) ? (
                <div className="mt-4 border-t border-black/[0.06] pt-3">
                  <button onClick={() => setVisEnheter((v) => !v)} className="flex w-full items-center justify-between text-[12.5px] font-medium text-black/55">
                    <span>Enheter i grunnlaget</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${visEnheter ? 'rotate-180' : ''}`} />
                  </button>
                  {visEnheter ? (
                    <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                      {(grunnlag.linjer || []).flatMap((l) => l.enheter || []).map((e) => (
                        <div key={e.enhet_id} className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.02] px-3 py-2">
                          <span className="min-w-0 truncate text-[12.5px] text-black/70">{e.address}</span>
                          <span className="shrink-0 text-[11.5px] text-black/40">{e.vekt !== 1 ? `${e.vekt}×` : e.type === 'selvbetjent' ? 'selvbetjent' : ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Fot */}
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-black/[0.02] p-3 text-[11.5px] leading-[1.5] text-black/50">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-none" style={{ color: LILLA }} />
                Grunnlag: <b className="font-medium text-black/70">{GRUNNLAG.find((g) => g.v === cfg.grunnlag)?.l}</b>. Leveres som {cfg.levering === 'EHF' ? 'EHF' : 'PDF på e-post'} med {cfg.betalingsfristDager} dagers forfall. Automatisk kjøring den {cfg.fakturadag}. hver måned kommer i neste steg (Konsernfakturering).
              </div>
            </div>
          </div>

          {/* Armlengde-notat */}
          <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-black/80"><Sparkles className="h-4 w-4" style={{ color: LILLA }} /> Armlengdeprinsippet</p>
            <p className="mt-2 text-[12.5px] leading-[1.55] text-black/55">Dette er en offentlig listepris enhver forvalter kan kjøpe. DigiHome AS betaler nøyaktig samme pris — da er internfakturaen dokumentert markedspris (sktl. § 13-1), ikke en konstruert internpris.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
