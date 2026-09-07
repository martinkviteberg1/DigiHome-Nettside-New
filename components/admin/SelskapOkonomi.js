'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   SelskapOkonomi — selskapsdimensjonen i Økonomi.

   · SelskapsVelger: én segmentert velger (Digihome AS · Digihome Tech AS ·
     Konsern) som huskes (localStorage + ?selskap=) — alt under følger valget.
   · SelskapResultat: resultatet for valgt selskap «nå» + 13 måneders tidslinje,
     inntektsstrømmer med opphav, kostnadsfordeling, plattformlisens synlig som
     inntekt (Tech) / kostnad (Digihome AS) / eliminert (Konsern).
   · PrislisteTab (Tech): prislisten — én sannhet for lisens og budsjett — og
     inntektsposter for abonnement som ikke hentes automatisk ennå.
   · SorterAssistent: engangs forslag om å flytte tekniske kostnader til Tech.
   ───────────────────────────────────────────────────────────────────────────── */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Loader2, Pencil, Plus, Trash2, X, Info, Sparkles } from 'lucide-react';
import { VISNINGER, SELSKAPER, selskapInfo, PRISLISTE_PRODUKTER, prisPerEnhet, rensPrisliste, AUTOKILDER } from '@/lib/selskap-okonomi';

const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const smal = (s) => String(s).replace(/[\u00A0\u0020]/g, '\u202F');
const kr = (n) => `${smal(nf0.format(Math.round(Number(n) || 0)))}\u202Fkr`;
const krS = (n) => `${(Number(n) || 0) < 0 ? '−' : ''}${smal(nf0.format(Math.abs(Math.round(Number(n) || 0))))}\u202Fkr`;
const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymKort = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MND[m - 1]} ${String(y).slice(2)}`; };
const ymLang = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MND[m - 1]} ${y}`; };
const heading = { fontFamily: 'var(--font-heading, inherit)' };

const inputCls = 'w-full h-10 px-3 rounded-lg border border-[#e5e5ea] bg-white text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#cf97fc]/50 focus:border-[#cf97fc]';
const labelCls = 'block text-[12px] font-semibold text-[#666] mb-1.5';
const btnDark = 'inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0a0a0a] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#e5e5ea] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f7f7f8] transition-colors disabled:opacity-50';

/* ── Valgt selskap: huskes i localStorage og speiles i URL (?selskap=) ── */
export function useSelskap() {
  const [selskap, setSelskapState] = useState('digihome');
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const fraUrl = u.searchParams.get('selskap');
      const fraLager = localStorage.getItem('dh_selskap');
      const v = ['digihome', 'tech', 'konsern'].includes(fraUrl) ? fraUrl : ['digihome', 'tech', 'konsern'].includes(fraLager) ? fraLager : 'digihome';
      setSelskapState(v);
    } catch (e) { /* ok */ }
  }, []);
  const setSelskap = (v) => {
    setSelskapState(v);
    try {
      localStorage.setItem('dh_selskap', v);
      const u = new URL(window.location.href); u.searchParams.set('selskap', v); window.history.replaceState({}, '', u.toString());
    } catch (e) { /* ok */ }
  };
  return [selskap, setSelskap];
}

/* ── Selskapsmerke (DH / DT / SHD) ── */
export function SelskapMerke({ id, storrelse = 24 }) {
  const s = selskapInfo(id);
  const morkt = id !== 'tech';
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-[7px] font-bold tracking-[-0.02em]" style={{ width: storrelse, height: storrelse, fontSize: Math.round(storrelse * 0.42), background: id === 'tech' ? '#f0e8fb' : id === 'konsern' ? '#eceae4' : '#15130F', color: id === 'tech' ? '#6d28d9' : morkt && id !== 'konsern' ? '#fff' : '#57534e', ...heading }} aria-hidden>
      {s.kort}
    </span>
  );
}

/* ── Chip på kostnadsrader ── */
export function SelskapChip({ id, onClick, title }) {
  const s = selskapInfo(id);
  return (
    <button type="button" onClick={onClick} title={title || s.navn} className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold transition-colors ${id === 'tech' ? 'bg-[#f0e8fb] text-[#6d28d9] hover:bg-[#e6d9f7]' : 'bg-[#f1efe9] text-[#57534e] hover:bg-[#e8e5dd]'} ${onClick ? '' : 'cursor-default'}`} data-testid={`selskap-chip-${id}`}>
      {s.kort} <span className="hidden sm:inline">{id === 'tech' ? 'Tech' : 'Digihome AS'}</span>
    </button>
  );
}

/* ── Velgeren ── */
export function SelskapsVelger({ verdi, onChange, naa }) {
  const s = selskapInfo(verdi);
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" data-testid="selskapsvelger">
      <div>
        <div className="inline-flex h-11 items-center gap-0.5 rounded-[13px] bg-[#f0efec] p-1">
          {VISNINGER.map((v) => {
            const aktiv = verdi === v.id;
            return (
              <button key={v.id} type="button" onClick={() => onChange(v.id)} data-testid={`selskap-${v.id}`} aria-pressed={aktiv}
                className={`flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-[13.5px] font-semibold transition-all ${aktiv ? 'bg-white text-[#111] shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.05)]' : 'text-[#7a766f] hover:text-[#111]'}`}>
                <SelskapMerke id={v.id} storrelse={20} />
                <span className="hidden min-[520px]:inline">{v.navn}</span>
                <span className="min-[520px]:hidden">{v.kort}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-[#8f8a82]" data-testid="selskap-identitet">
          <span className="font-semibold text-[#57534e]">{s.navn}</span> · org.nr {String(s.orgnr).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')} · {s.rolle}
        </p>
      </div>
      {naa ? (
        <p className="text-[12px] text-[#a6a19a]">
          {naa.kilde?.portefolje === 'leieforhold' ? 'Portefølje fra plattformen' : 'Portefølje fra kontraktsregisteret'} · beregnet {new Date(naa.generatedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      ) : null}
    </div>
  );
}

/* ── Tidslinje: 13 måneder, inntekt (stolper) og kostnad (linje) ── */
function Tidslinje({ rader, hentInn, hentKost, farge = '#15130F' }) {
  const W = 760; const H = 200; const padL = 44; const padR = 8; const padT = 14; const padB = 26;
  const N = rader.length;
  const maks = Math.max(1, ...rader.map((r) => Math.max(hentInn(r), hentKost(r)))) * 1.1;
  const x = (i) => padL + ((W - padL - padR) * (i + 0.5)) / N;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maks);
  const bw = ((W - padL - padR) / N) * 0.56;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Inntekt og kostnad per måned" data-testid="selskap-tidslinje">
      {[0.5, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={W - padR} y1={y(maks * f)} y2={y(maks * f)} stroke="rgba(0,0,0,0.08)" />
          <text x={padL - 6} y={y(maks * f) + 4} textAnchor="end" fontSize="10" fill="#a6a19a">{maks * f >= 1e6 ? `${(maks * f / 1e6).toFixed(1)} M` : `${Math.round(maks * f / 1000)} k`}</text>
        </g>
      ))}
      {rader.map((r, i) => (
        <rect key={r.ym} x={x(i) - bw / 2} y={y(hentInn(r))} width={bw} height={Math.max(0, y(0) - y(hentInn(r)))} rx="2" fill={farge} opacity={i === N - 1 ? 1 : 0.55} />
      ))}
      <polyline fill="none" stroke="#B3261E" strokeWidth="1.8" strokeLinejoin="round" points={rader.map((r, i) => `${x(i)},${y(hentKost(r))}`).join(' ')} />
      {rader.map((r, i) => (i % 3 === 0 || i === N - 1) ? <text key={`t${r.ym}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#a6a19a">{ymKort(r.ym)}</text> : null)}
    </svg>
  );
}

function Stat({ label, verdi, under, tone, stor, testid }) {
  const farge = tone === 'pos' ? 'text-[#1a7f45]' : tone === 'neg' ? 'text-[#b3261e]' : 'text-[#111]';
  return (
    <div className="rounded-2xl border border-[#eee] bg-white p-5" data-testid={testid}>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#999]">{label}</p>
      <p className={`${stor ? 'text-[30px]' : 'text-[22px]'} mt-2 font-bold tracking-[-0.02em] ${farge}`} style={heading}>{verdi}</p>
      {under ? <p className="mt-1 text-[12px] text-[#aaa]">{under}</p> : null}
    </div>
  );
}

/* ── Resultat for valgt selskap ── */
export function SelskapResultat({ data, selskap, onGaaTil }) {
  if (!data || !data.ok) return <div className="rounded-2xl border border-dashed border-[#e5e5ea] bg-[#fafafa] p-10 text-center text-[13px] text-[#999]">Kunne ikke laste selskapsøkonomien.</div>;
  const n = data.naa[selskap];
  const info = selskapInfo(selskap);
  const t = data.tidslinje;
  const hentInn = (r) => r[selskap].inntekt; const hentKost = (r) => r[selskap].kost;
  const maksKost = Math.max(1, ...(n.costBreakdown || []).map((c) => c.amount));
  const pl = data.prisliste || {};
  const lisensPris = prisPerEnhet(rensPrisliste(pl).forvaltning);

  // Inntektsstrømmer med opphav — alltid synlig hvor tallet kommer fra.
  const strommer = selskap === 'digihome' ? [
    { navn: 'Honorar fra signerte leiekontrakter', belop: n.inntekt, kilde: `${n.enheter} enheter under forvaltning · ${data.kilde?.portefolje === 'leieforhold' ? 'plattformen' : 'kontraktsregisteret'}` },
    ...(n.forventetTillegg ? [{ navn: 'Forventet (forvaltningsavtaler uten leiekontrakt)', belop: n.forventetTillegg, kilde: 'telles ikke i resultatet før leiekontrakt er signert', svak: true }] : []),
  ] : selskap === 'tech' ? [
    { navn: 'Plattformlisens fra Digihome AS', belop: n.lisens, kilde: `${data.naa.digihome.enheter} enheter × ${kr(lisensPris)} · regnes automatisk`, intern: true },
    { navn: 'Huseiere · selvbetjent', belop: n.poster.huseier, kilde: n.poster.huseier ? 'inntektsposter' : 'ingen betalende ennå — legg inn under Prisliste & inntekter' },
    { navn: 'Bedrift · eiendomsselskap', belop: n.poster.bedrift, kilde: n.poster.bedrift ? 'inntektsposter' : 'ingen kunder ennå' },
    ...(n.poster.annet ? [{ navn: 'Annet', belop: n.poster.annet, kilde: 'inntektsposter' }] : []),
  ] : [
    { navn: 'Digihome AS · honorar', belop: data.naa.digihome.inntekt, kilde: `${data.naa.digihome.enheter} enheter` },
    { navn: 'Digihome Tech AS · inntekt', belop: data.naa.tech.inntekt, kilde: `lisens ${kr(data.naa.tech.lisens)} + eksterne kunder ${kr(data.naa.tech.inntekt - data.naa.tech.lisens)}` },
    { navn: 'Eliminering: plattformlisens Digihome AS → Tech', belop: -n.eliminert, kilde: 'intern strøm — telles ikke i konsernet', intern: true },
  ];

  return (
    <div className="space-y-6" data-testid={`selskap-resultat-${selskap}`}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label={`Resultat / mnd · ${ymLang(n.ym || data.naa.ym)}`} verdi={krS(n.resultat)} tone={n.resultat >= 0 ? 'pos' : 'neg'} stor testid="selskap-resultat"
          under={selskap === 'digihome' && n.forventetTillegg ? `Med forventet: ${krS(n.resultatForventet)}` : n.runwayMnd != null ? `Runway ${n.runwayMnd} mnd` : n.kontant == null ? 'Sett kontantsaldo under Innstillinger for runway' : 'Positivt resultat — ingen brenn'} />
        <Stat label="Inntekt / mnd" verdi={kr(n.inntekt)} testid="selskap-inntekt"
          under={selskap === 'tech' ? `${Math.round((n.lisens / Math.max(1, n.inntekt)) * 100)} % fra Digihome AS` : selskap === 'konsern' ? `${kr(n.eliminert)} internt eliminert` : `${n.enheter} enheter under forvaltning`} />
        <Stat label="Kostnader / mnd" verdi={kr(n.kost)} testid="selskap-kost"
          under={selskap === 'digihome' && n.lisens ? `inkl. plattformlisens ${kr(n.lisens)} til Tech` : n.auto?.sum ? `inkl. ${kr(n.auto.sum)} automatisk målt` : `${(n.costBreakdown || []).length} kategorier`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[#eee] bg-white p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-bold text-[#111]">Siste 13 måneder</h3>
            <p className="text-[12px] text-[#aaa]"><span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: info.farge || '#15130F' }} /> Inntekt</span><span className="inline-flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 bg-[#B3261E]" /> Kostnad</span></p>
          </div>
          <Tidslinje rader={t} hentInn={hentInn} hentKost={hentKost} farge={info.farge || '#15130F'} />
          <p className="mt-3 text-[11.5px] text-[#aaa]">Historikk bygger på dagens kontrakter (fra innflytting) og kostnadenes datoer — måneder før dagens kontrakter startet vises lavt. Automatisk målte kostnader (annonser, LLM, API) finnes bare for inneværende måned.</p>
        </div>

        <div className="rounded-2xl border border-[#eee] bg-white p-6">
          <h3 className="mb-4 text-[15px] font-bold text-[#111]">Inntektsstrømmer</h3>
          <ul className="divide-y divide-[#f2f2f2]">
            {strommer.map((s) => (
              <li key={s.navn} className={`flex items-start justify-between gap-4 py-3 ${s.svak ? 'opacity-70' : ''}`}>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-[#222]">{s.navn}{s.intern ? <span className="ml-2 rounded-full bg-[#f0e8fb] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6d28d9]">Internt</span> : null}</p>
                  <p className="text-[11.5px] text-[#a6a19a]">{s.kilde}</p>
                </div>
                <p className={`shrink-0 text-[14px] font-semibold ${s.belop < 0 ? 'text-[#a6a19a]' : 'text-[#111]'}`}>{krS(s.belop)}</p>
              </li>
            ))}
          </ul>
          {selskap === 'tech' && !n.poster.antall ? (
            <button type="button" onClick={() => onGaaTil?.('prisliste')} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6d28d9] hover:underline" data-testid="tech-til-prisliste">Prisliste & inntekter <ArrowRight className="h-3.5 w-3.5" /></button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#eee] bg-white p-6">
          <h3 className="mb-4 text-[15px] font-bold text-[#111]">Kostnader / mnd</h3>
          {(n.costBreakdown || []).length === 0 ? (
            <p className="text-[13px] text-[#999]">Ingen kostnader tilhører {info.navn} ennå. {selskap === 'tech' ? 'Flytt utviklings- og API-kostnader hit under «Kostnader».' : ''}</p>
          ) : (
            <div className="space-y-3">
              {n.costBreakdown.map((c) => (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-medium text-[#333]">{c.category}{c.category === 'Plattformlisens (Tech)' ? <span className="ml-2 rounded-full bg-[#f0e8fb] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6d28d9]">Internt</span> : null}</span>
                    <span className="text-[#666]">{kr(c.amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f2f2f4]"><div className="h-full rounded-full" style={{ width: `${(c.amount / maksKost) * 100}%`, background: c.category === 'Plattformlisens (Tech)' ? '#c4a7ef' : '#15130F' }} /></div>
                </div>
              ))}
            </div>
          )}
          {n.auto?.poster?.length ? (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[#f0f0f0] pt-4 text-[12px] text-[#888]">
              {n.auto.poster.map((p) => <span key={p.id}>{p.navn.split(' (')[0]}: <strong className="text-[#555]">{kr(p.belop)}</strong></span>)}
              <span className="text-[#bbb]">— automatisk målt, regel i Innstillinger</span>
            </div>
          ) : null}
        </div>

        {selskap === 'konsern' ? (
          <div className="rounded-2xl bg-[#0a0a0a] p-6 text-white">
            <p className="mb-4 text-[12px] uppercase tracking-[0.12em] text-white/50">Per selskap · denne måneden</p>
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-[11px] uppercase tracking-wide text-white/40"><th className="pb-2 text-left font-semibold">Selskap</th><th className="pb-2 text-right font-semibold">Inntekt</th><th className="pb-2 text-right font-semibold">Kostnad</th><th className="pb-2 text-right font-semibold">Resultat</th></tr></thead>
              <tbody>
                {SELSKAPER.map((s) => { const d = data.naa[s.id]; return (
                  <tr key={s.id} className="border-t border-white/10"><td className="py-2.5 font-medium">{s.navn}</td><td className="py-2.5 text-right">{kr(d.inntekt)}</td><td className="py-2.5 text-right">{kr(d.kost)}</td><td className={`py-2.5 text-right font-semibold ${d.resultat >= 0 ? 'text-[#7CFFB2]' : 'text-[#FF9B9B]'}`}>{krS(d.resultat)}</td></tr>
                ); })}
                <tr className="border-t border-white/10 text-white/60"><td className="py-2.5">Eliminering · plattformlisens</td><td className="py-2.5 text-right">−{kr(n.eliminert)}</td><td className="py-2.5 text-right">−{kr(n.eliminert)}</td><td className="py-2.5 text-right">0</td></tr>
                <tr className="border-t border-white/20 font-bold"><td className="py-2.5">Konsern</td><td className="py-2.5 text-right">{kr(n.inntekt)}</td><td className="py-2.5 text-right">{kr(n.kost)}</td><td className={`py-2.5 text-right ${n.resultat >= 0 ? 'text-[#7CFFB2]' : 'text-[#FF9B9B]'}`}>{krS(n.resultat)}</td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0a0a0a] p-6 text-white">
            <p className="mb-4 text-[12px] uppercase tracking-[0.12em] text-white/50">Årlig takt (run-rate)</p>
            <div className="grid grid-cols-3 gap-5">
              <div><p className="text-[12px] text-white/60">Inntekt</p><p className="mt-1 text-[22px] font-bold" style={heading}>{kr(n.inntekt * 12)}</p></div>
              <div><p className="text-[12px] text-white/60">Kostnader</p><p className="mt-1 text-[22px] font-bold" style={heading}>{kr(n.kost * 12)}</p></div>
              <div><p className="text-[12px] text-white/60">Resultat</p><p className={`mt-1 text-[22px] font-bold ${n.resultat >= 0 ? 'text-[#7CFFB2]' : 'text-[#FF9B9B]'}`} style={heading}>{krS(n.resultat * 12)}</p></div>
            </div>
            {selskap === 'tech' ? <p className="mt-5 text-[12px] leading-relaxed text-white/50">Lisensen fra Digihome AS følger porteføljen automatisk: flere enheter under forvaltning → høyere grunninntekt i Tech. Prisen settes én gang i prislisten.</p> : null}
            {selskap === 'digihome' ? <p className="mt-5 text-[12px] leading-relaxed text-white/50">Plattformlisensen til Tech ({kr(lisensPris)} per enhet) er en reell kostnad for Digihome AS — og forsvinner i konsernbildet.</p> : null}
          </div>
        )}
      </div>
      <p className="text-[11px] text-[#aaa]">Alle beløp i NOK eks. mva. Resultatet bygger på signerte kontrakter — forventede inntekter vises separat og telles ikke.</p>
    </div>
  );
}

/* ── Sorterings-assistent: tekniske kostnader som ligger i Digihome AS ── */
export function SorterAssistent({ forslag = [], onFlytt, onBehold, busy }) {
  if (!forslag.length) return null;
  const sum = forslag.reduce((s, f) => s + (f.amount || 0), 0);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#e6d9f7] bg-[#faf7ff] p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="sorter-assistent">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#f0e8fb] text-[#6d28d9]"><Sparkles className="h-4 w-4" /></span>
        <div>
          <p className="text-[14px] font-semibold text-[#111]">{forslag.length} {forslag.length === 1 ? 'kostnad' : 'kostnader'} ser ut til å tilhøre Digihome Tech AS</p>
          <p className="mt-0.5 text-[12.5px] text-[#7a766f]">{forslag.map((f) => f.name).slice(0, 4).join(', ')}{forslag.length > 4 ? ` +${forslag.length - 4}` : ''} · {kr(sum)}/mnd · API/LLM og programvare er plattformkostnader</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onBehold} disabled={busy} className={btnGhost} data-testid="sorter-behold">Behold i Digihome AS</button>
        <button type="button" onClick={onFlytt} disabled={busy} className={btnDark} data-testid="sorter-flytt">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Flytt til Tech</button>
      </div>
    </div>
  );
}

/* ── Prisliste & inntekter (Tech) ── */
export function PrislisteTab({ data, api, onEndret }) {
  const [pris, setPris] = useState(() => rensPrisliste(data?.prisliste));
  const [lagrer, setLagrer] = useState(false); const [lagret, setLagret] = useState(false);
  const [poster, setPoster] = useState(null);
  const [modal, setModal] = useState(null); // null | {} (ny) | post
  useEffect(() => { setPris(rensPrisliste(data?.prisliste)); }, [data?.prisliste]);
  useEffect(() => { (async () => { const r = await api('/inntektsposter'); setPoster(r.poster || []); })(); }, [api]);

  const enheter = data?.naa?.digihome?.enheter || 0;
  const endret = useMemo(() => JSON.stringify(pris) !== JSON.stringify(rensPrisliste(data?.prisliste)), [pris, data?.prisliste]);
  const lagre = async () => {
    setLagrer(true);
    try { await api('/settings', { method: 'POST', body: JSON.stringify({ prisliste: pris }) }); setLagret(true); setTimeout(() => setLagret(false), 2000); onEndret?.(); } finally { setLagrer(false); }
  };
  const lagrePost = async (p) => {
    const r = await api('/inntektsposter', { method: 'POST', body: JSON.stringify(p) });
    if (!r.ok) return r.error || 'Kunne ikke lagre';
    const l = await api('/inntektsposter'); setPoster(l.poster || []); setModal(null); onEndret?.(); return null;
  };
  const slettPost = async (id) => { await api('/inntektsposter', { method: 'DELETE', body: JSON.stringify({ id }) }); const l = await api('/inntektsposter'); setPoster(l.poster || []); onEndret?.(); };
  const KUNDE = { huseier: 'Huseier · selvbetjent', bedrift: 'Bedrift', annet: 'Annet' };

  return (
    <div className="space-y-8" data-testid="prisliste-tab">
      <section className="rounded-2xl border border-[#eee] bg-white p-6">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-bold text-[#111]">Prisliste</h3>
          <p className="text-[12px] text-[#aaa]">Én sannhet — brukes av resultat, lisens og budsjett</p>
        </div>
        <p className="mb-5 text-[13px] text-[#7a766f]">Digihome Tech AS selger én plattform til tre kundegrupper. Det Digihome AS betaler er bare én av prisene.</p>
        <div className="divide-y divide-[#f2f2f2]">
          {PRISLISTE_PRODUKTER.map((prod) => {
            const p = pris[prod.id];
            const perEnhet = prisPerEnhet(p);
            return (
              <div key={prod.id} className="grid gap-3 py-4 sm:grid-cols-[1.4fr_120px_150px_1fr] sm:items-center" data-testid={`pris-${prod.id}`}>
                <div>
                  <p className="text-[14px] font-semibold text-[#111]">{prod.navn}{prod.id === 'forvaltning' ? <span className="ml-2 rounded-full bg-[#f0e8fb] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6d28d9]">Internt</span> : null}</p>
                  <p className="text-[12px] text-[#a6a19a]">{prod.kunde}</p>
                </div>
                <select value={p.modell} disabled={prod.modeller.length === 1} onChange={(e) => setPris((c) => ({ ...c, [prod.id]: { ...c[prod.id], modell: e.target.value } }))} className={`${inputCls} disabled:bg-[#fafafa] disabled:text-[#999]`}>
                  <option value="pct">% av leie</option><option value="fast">kr / enhet</option>
                </select>
                <div className="relative">
                  <input type="number" step={p.modell === 'pct' ? 0.5 : 1} min={0} value={p.pris} onChange={(e) => setPris((c) => ({ ...c, [prod.id]: { ...c[prod.id], pris: e.target.value } }))} className={`${inputCls} pr-14`} data-testid={`pris-${prod.id}-input`} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#a6a19a]">{p.modell === 'pct' ? '% inkl. mva' : 'kr/mnd'}</span>
                </div>
                <p className="text-[12.5px] text-[#7a766f]">
                  ≈ <strong className="text-[#111]">{kr(perEnhet)}</strong> per enhet/mnd eks. mva
                  {prod.id === 'forvaltning' && enheter ? <span className="block text-[#6d28d9]">{enheter} enheter nå → {kr(perEnhet * enheter)}/mnd</span> : null}
                  {prod.id === 'huseier' && p.modell === 'pct' ? <span className="block">ved 15 000 kr leie</span> : null}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={lagre} disabled={!endret || lagrer} className={btnDark} data-testid="pris-lagre">{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lagre prisliste</button>
          {lagret ? <span className="text-[13px] font-medium text-[#1a7f45]">Lagret — lisens og resultat er oppdatert</span> : endret ? <span className="text-[12.5px] text-[#a6a19a]">Ulagrede endringer</span> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#eee] bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-[#111]">Inntektsposter</h3>
            <p className="text-[12.5px] text-[#7a766f]">Betalende kunder som ikke hentes automatisk ennå — abonnement per måned eks. mva. Lisensen fra Digihome AS regnes automatisk og skal ikke føres her.</p>
          </div>
          <button type="button" onClick={() => setModal({})} className={btnDark} data-testid="inntekt-ny"><Plus className="h-4 w-4" /> Ny inntektspost</button>
        </div>
        {poster === null ? <p className="flex items-center gap-2 py-6 text-[13px] text-[#999]"><Loader2 className="h-4 w-4 animate-spin" /> Laster…</p>
          : poster.length === 0 ? <div className="rounded-xl border border-dashed border-[#e5e5ea] bg-[#fafafa] p-8 text-center text-[13px] text-[#999]">Ingen inntektsposter ennå. Legg inn den første betalende huseieren eller bedriftskunden.</div>
            : (
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-[#999]"><tr><th className="py-2 text-left font-semibold">Kunde / produkt</th><th className="py-2 text-left font-semibold">Type</th><th className="py-2 text-right font-semibold">Enheter</th><th className="py-2 text-right font-semibold">kr / mnd</th><th className="py-2 text-left font-semibold pl-4">Periode</th><th /></tr></thead>
                <tbody>
                  {poster.map((p) => (
                    <tr key={p.id} className={`border-t border-[#f2f2f2] ${p.paused ? 'opacity-50' : ''}`} data-testid={`inntekt-rad-${p.id}`}>
                      <td className="py-3 font-medium text-[#222]">{p.navn}{p.paused ? <span className="ml-2 rounded bg-[#f1ece4] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8a8278]">Pauset</span> : null}</td>
                      <td className="py-3 text-[#666]">{KUNDE[p.kundetype] || p.kundetype}</td>
                      <td className="py-3 text-right text-[#666]">{p.enheter || '—'}</td>
                      <td className="py-3 text-right font-semibold text-[#111]">{kr(p.belop)}</td>
                      <td className="py-3 pl-4 text-[#999]">{p.startDate || '…'} → {p.endDate || 'løpende'}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button type="button" onClick={() => setModal(p)} className="p-1.5 text-[#999] hover:text-[#333]"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => slettPost(p.id)} className="p-1.5 text-[#999] hover:text-[#e5484d]"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
      </section>
      {modal ? <InntektModal post={modal.id ? modal : null} onClose={() => setModal(null)} onSave={lagrePost} /> : null}
    </div>
  );
}

function InntektModal({ post, onClose, onSave }) {
  const [f, setF] = useState({ id: post?.id || null, navn: post?.navn || '', kundetype: post?.kundetype || 'huseier', enheter: post?.enheter ?? '', belop: post?.belop ?? '', startDate: post?.startDate || '', endDate: post?.endDate || '', note: post?.note || '', paused: post?.paused === true });
  const [feil, setFeil] = useState(''); const [lagrer, setLagrer] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const lagre = async () => { setLagrer(true); setFeil(''); const e = await onSave(f); if (e) setFeil(e); setLagrer(false); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="inntekt-modal">
        <div className="flex items-center justify-between border-b border-[#eee] px-6 py-4"><h3 className="text-[16px] font-bold text-[#111]">{post ? 'Rediger inntektspost' : 'Ny inntektspost'}</h3><button type="button" onClick={onClose} className="p-1.5 text-[#999] hover:text-[#333]"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-6">
          <div><label className={labelCls}>Kunde / produkt</label><input value={f.navn} onChange={(e) => set('navn', e.target.value)} className={inputCls} placeholder="f.eks. Ola Nordmann · 2 enheter" data-testid="inntekt-navn" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Kundetype</label><select value={f.kundetype} onChange={(e) => set('kundetype', e.target.value)} className={inputCls}><option value="huseier">Huseier · selvbetjent</option><option value="bedrift">Bedrift · eiendomsselskap</option><option value="annet">Annet</option></select></div>
            <div><label className={labelCls}>Enheter (valgfritt)</label><input type="number" min={0} value={f.enheter} onChange={(e) => set('enheter', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Beløp per måned (kr eks. mva)</label><input type="number" min={0} value={f.belop} onChange={(e) => set('belop', e.target.value)} className={inputCls} data-testid="inntekt-belop" /></div>
            <div><label className={labelCls}>Fra dato</label><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Til dato (valgfritt)</label><input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Notat</label><input value={f.note} onChange={(e) => set('note', e.target.value)} className={inputCls} /></div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 select-none"><input type="checkbox" checked={f.paused} onChange={(e) => set('paused', e.target.checked)} className="h-3.5 w-3.5 accent-[#111]" /><span className="text-[12.5px] text-[#666]">Pauset — teller ikke i resultatet</span></label>
          {feil ? <p className="text-[13px] text-[#b3261e]">{feil}</p> : null}
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className={btnGhost}>Avbryt</button><button type="button" onClick={lagre} disabled={lagrer} className={btnDark} data-testid="inntekt-lagre">{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lagre</button></div>
        </div>
      </div>
    </div>
  );
}

/* ── Innstillinger: regler for automatiske kostnader + Techs kontantsaldo ── */
export function SelskapInnstillinger({ settings, onSave, saving }) {
  const [regler, setRegler] = useState(settings?.autoregler || {});
  const [saldo, setSaldo] = useState(settings?.kontantTech?.saldo ?? ''); const [dato, setDato] = useState(settings?.kontantTech?.dato || '');
  const [ok, setOk] = useState(false);
  useEffect(() => { setRegler(settings?.autoregler || {}); setSaldo(settings?.kontantTech?.saldo ?? ''); setDato(settings?.kontantTech?.dato || ''); }, [settings]);
  const save = async () => { await onSave({ autoregler: regler, kontantTech: { saldo: saldo === '' ? null : saldo, dato } }); setOk(true); setTimeout(() => setOk(false), 2000); };
  return (
    <div className="space-y-6" data-testid="selskap-innstillinger">
      <div className="space-y-4 rounded-2xl border border-[#eee] bg-white p-6">
        <div><h3 className="text-[15px] font-bold text-[#111]">Automatiske kostnader → selskap</h3><p className="mt-1 text-[12.5px] text-[#7a766f]">Målt forbruk fordeles etter regel, ikke per post. Annonser hører til den som får kundene; alt teknisk hører til plattformen.</p></div>
        <div className="divide-y divide-[#f2f2f2]">
          {AUTOKILDER.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-4 py-3">
              <span className="text-[13.5px] text-[#333]">{k.navn}</span>
              <div className="inline-flex h-9 items-center rounded-[10px] bg-[#f0efec] p-0.5">
                {SELSKAPER.map((s) => (
                  <button key={s.id} type="button" onClick={() => setRegler((r) => ({ ...r, [k.id]: s.id }))} data-testid={`regel-${k.id}-${s.id}`}
                    className={`h-8 rounded-[8px] px-3 text-[12.5px] font-semibold transition-all ${regler[k.id] === s.id ? 'bg-white text-[#111] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-[#8f8a82] hover:text-[#111]'}`}>{s.id === 'tech' ? 'Tech' : 'Digihome AS'}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border border-[#eee] bg-white p-6">
        <h3 className="text-[15px] font-bold text-[#111]">Kontantsaldo · Digihome Tech AS</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Saldo (bank)</label><input type="number" value={saldo} onChange={(e) => setSaldo(e.target.value)} className={inputCls} placeholder="f.eks. 250000" data-testid="tech-saldo" /></div>
          <div><label className={labelCls}>Per dato</label><input type="date" value={dato} onChange={(e) => setDato(e.target.value)} className={inputCls} /></div>
        </div>
        <p className="text-[12px] text-[#999]">Digihome AS sin saldo settes under Digihome AS → Innstillinger. Med begge på plass får hvert selskap egen runway.</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className={btnDark} data-testid="selskap-innstillinger-lagre">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lagre</button>
        {ok ? <span className="text-[13px] font-medium text-[#1a7f45]">Lagret</span> : null}
      </div>
    </div>
  );
}

export function InfoLinje({ children }) {
  return <p className="flex items-start gap-2 text-[12.5px] text-[#8f8a82]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{children}</span></p>;
}
