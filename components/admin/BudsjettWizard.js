'use client';

/* ═══════════════ Budsjettveiviser — fra tomt til låst på 2 minutter ═══════════
   Fire steg, alt hentes automatisk, antakelser formuleres som setninger:

   1 · Periode    — velg kalenderår (årsbudsjett er styringsdokumentet;
                    «Neste 12 mnd» beregnes automatisk som visning uansett)
   2 · Inntekter  — sikret grunnmur fra signerte kontrakter (auto, låst) +
                    tilvekst/churn med presets (Konservativt/Basis/Ambisiøst)
                    og levende graf som tegner budsjettet mens du skriver
   3 · Kostnader  — dagens register fra Økonomi (auto, med datoer) +
                    «planlagte endringer» (f.eks. ansettelse fra august)
   4 · Oppsummer  — nøkkeltall, % kontraktsfestet, lås-og-opprett

   Revisjon: kjøres wizarden på et år som allerede har budsjett, vises en
   tydelig advarsel — notat, månedskommentarer, egne poster og «Annen
   inntekt» BEVARES, kun honorar-/oppstartsrader og kostnader erstattes.    ═══ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, ArrowLeft, ArrowRight, Sparkles, Loader2, Check, Lock, AlertTriangle,
  TrendingUp, Wallet, Flag, Plus, Trash2, CalendarClock,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const medTynnSkiller = (s) => String(s).replace(/[\s\u00A0]/g, '\u202F');
const kr = (v) => `${medTynnSkiller(Math.round(v || 0).toLocaleString('nb-NO'))}\u202Fkr`;
const sum = (arr) => (arr || []).reduce((s, x) => s + (Number(x) || 0), 0);

// Presets: setter kun vekst/churn/utfylling — sats/leie/oppstart beholdes
// (de kommer fra porteføljens egne snitt og er sjelden verdt å gjette på).
const PRESETS = [
  { id: 'konservativt', l: 'Konservativt', nye: '0.5', churn: '15', fyll: '0.5', hint: 'Lav tilvekst, høy churn' },
  { id: 'basis', l: 'Basis', nye: '1', churn: '10', fyll: '1', hint: 'Dagens takt videre' },
  { id: 'ambisiost', l: 'Ambisiøst', nye: '2', churn: '5', fyll: '2', hint: 'Full gass på salg' },
];

const STEG = ['Periode', 'Inntekter', 'Kostnader', 'Oppsummering'];

export default function BudsjettWizard({ apiKey, aapen, startAar, aarListe = [], onLukk, onFerdig }) {
  const iAar = new Date().getFullYear();
  const [steg, setSteg] = useState(0);
  const [yearW, setYearW] = useState(startAar || iAar);
  const [drivere, setDrivere] = useState({ nye: '1', churn: '10', fyll: '1', snittleie: '', honorarpct: '', oppstart: '' });
  const [preset, setPreset] = useState('basis');
  const [modell, setModell] = useState(null);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState('');
  const [endringer, setEndringer] = useState([]); // planlagte kostnadsendringer
  const [nyEndring, setNyEndring] = useState(null); // {kategori, belop, fraMnd, navn}
  const [laas, setLaas] = useState(true);
  const [oppretter, setOppretter] = useState(false);
  const debounceRef = useRef(null);

  const eksisterende = aarListe.find((a) => a.year === yearW) || null;

  // Nullstill når wizarden åpnes (friskt utgangspunkt hver gang).
  useEffect(() => {
    if (!aapen) return;
    setSteg(0); setFeil(''); setModell(null); setEndringer([]); setNyEndring(null);
    setLaas(true); setPreset('basis');
    setDrivere({ nye: '1', churn: '10', fyll: '1', snittleie: '', honorarpct: '', oppstart: '' });
    // Smart årsvalg: har inneværende år budsjett → foreslå neste år.
    const harIAar = aarListe.some((a) => a.year === (startAar || iAar));
    setYearW(startAar || (harIAar ? iAar + 1 : iAar));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aapen]);

  const hentModell = useCallback(async (aar, d) => {
    setLaster(true); setFeil('');
    try {
      const qs = new URLSearchParams({ key: apiKey, year: String(aar) });
      for (const [k, p] of [['nye', 'nye'], ['churn', 'churn'], ['fyll', 'fyll'], ['snittleie', 'snittleie'], ['honorarpct', 'honorarpct'], ['oppstart', 'oppstart']]) {
        if (d[p] !== '') qs.set(k, d[p]);
      }
      const r = await fetch(`/api/admin/budsjett/inntektsmodell?${qs}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke beregne modellen');
      setModell(j);
      // Fyll tomme felter med serverens porteføljesnitt (vises som konkrete tall).
      setDrivere((prev) => ({
        ...prev,
        snittleie: prev.snittleie === '' ? String(j.drivereBrukt.snittLeie) : prev.snittleie,
        honorarpct: prev.honorarpct === '' ? String(j.drivereBrukt.honorarPct) : prev.honorarpct,
        oppstart: prev.oppstart === '' ? String(j.drivereBrukt.oppstartPerEnhet) : prev.oppstart,
      }));
    } catch (e) { setFeil(e.message); }
    setLaster(false);
  }, [apiKey]);

  // Hent modellen når man går inn i steg 2 — og debounce ved driverendringer.
  useEffect(() => {
    if (!aapen || steg !== 1) return undefined;
    if (!modell) { hentModell(yearW, drivere); return undefined; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => hentModell(yearW, drivere), 550);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aapen, steg, drivere, yearW]);

  const settDriver = (felt, verdi) => { setPreset('egen'); setDrivere((p) => ({ ...p, [felt]: verdi })); };
  const brukPreset = (p) => { setPreset(p.id); setDrivere((prev) => ({ ...prev, nye: p.nye, churn: p.churn, fyll: p.fyll })); };

  // Kostnader med planlagte endringer lagt oppå (fra valgt måned og ut året).
  const kostMedEndringer = useMemo(() => {
    const base = modell?.kostnader || {};
    const ut = {};
    for (const [kat, arr] of Object.entries(base)) ut[kat] = [...(arr || Array(12).fill(0))];
    for (const e of endringer) {
      if (!ut[e.kategori]) ut[e.kategori] = Array(12).fill(0);
      for (let m = e.fraMnd; m < 12; m++) ut[e.kategori][m] = Math.round(ut[e.kategori][m] + e.belop);
    }
    return ut;
  }, [modell, endringer]);

  // Nøkkeltall for graf + oppsummering.
  const tallW = useMemo(() => {
    if (!modell) return null;
    const innMnd = modell.total.map((t, m) => t + (modell.oppstart[m] || 0));
    const innSum = sum(innMnd);
    const sikretSum = sum(modell.sikret);
    const kostMnd = Array.from({ length: 12 }, (_, m) => Object.values(kostMedEndringer).reduce((s, arr) => s + (Number(arr[m]) || 0), 0));
    const kostSum = sum(kostMnd);
    return {
      innMnd, innSum, sikretSum, kostMnd, kostSum,
      resultat: innSum - kostSum,
      kontraktsfestetPct: innSum > 0 ? Math.min(100, Math.round((sikretSum / innSum) * 100)) : null,
    };
  }, [modell, kostMedEndringer]);

  const opprett = async () => {
    if (!modell || oppretter) return;
    setOppretter(true); setFeil('');
    try {
      // Bevar det wizarden ikke eier: notat, kommentarer, egne poster, Annen inntekt.
      const rEks = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}&year=${yearW}`);
      const eks = await rEks.json();
      if (!rEks.ok || !eks.ok) throw new Error(eks.error || 'Kunne ikke lese eksisterende budsjett');
      const inntekter = {
        'Annen inntekt': eks.inntekter?.['Annen inntekt'] || Array(12).fill(0),
        // Uten lås skrives modelltallene som vanlige (redigerbare) rader.
        // Med lås beregner serveren dem selv fra antakelsene (samme motor).
        'Honorar (forvaltning)': modell.total,
        'Oppstartshonorar': modell.oppstart,
      };
      const r = await fetch(`/api/admin/budsjett?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: yearW,
          inntekter,
          kostnader: kostMedEndringer,
          egnePoster: eks.egnePoster || [],
          kommentarer: eks.kommentarer || {},
          notat: eks.notat || '',
          antakelser: {
            nyeEnheterPerMnd: drivere.nye, churnPctAar: drivere.churn, fyllLedigPerMnd: drivere.fyll,
            snittLeie: drivere.snittleie, honorarPct: drivere.honorarpct, oppstartPerEnhet: drivere.oppstart,
          },
          ...(laas ? { laasInntekt: true } : {}),
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke opprette budsjettet');
      onFerdig?.(yearW);
    } catch (e) { setFeil(e.message); }
    setOppretter(false);
  };

  if (!aapen) return null;

  /* ── Delkomponenter (rene render-hjelpere) ── */

  const stegIndikator = (
    <div className="flex items-center gap-1">
      {STEG.map((s, i) => (
        <React.Fragment key={s}>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] ${i === steg ? 'bg-[#f4f0fb] text-[#6d28d9]' : i < steg ? 'text-[#1f7a45]' : 'text-[#c2beb8]'}`}>
            {i < steg ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
            <span className="hidden sm:inline">{s}</span>
          </span>
          {i < STEG.length - 1 && <span className="h-px w-3 bg-black/[0.08]" />}
        </React.Fragment>
      ))}
    </div>
  );

  // Levende graf: sikret (mørk) + vekst/oppstart (lys) stablet per måned.
  const graf = modell && (
    <div className="rounded-xl bg-[#fafaf8] p-3" data-testid="wizard-graf">
      <div className="flex h-[96px] items-end gap-[3px]">
        {Array.from({ length: 12 }, (_, m) => {
          const s = modell.sikret[m] || 0;
          const v = (modell.vekst[m] || 0) + (modell.oppstart[m] || 0);
          const maks = Math.max(1, ...modell.total.map((t, i) => t + (modell.oppstart[i] || 0)));
          return (
            <div key={m} className="flex flex-1 flex-col items-center gap-1" title={`${MND[m]}: ${kr(s + v)} (${kr(s)} sikret)`}>
              <div className="flex w-full flex-col justify-end" style={{ height: 78 }}>
                <div className="w-full rounded-t-[3px] bg-[#c4b5e8] transition-all duration-300" style={{ height: `${Math.max(0, (v / maks) * 78)}px` }} />
                <div className={`w-full bg-[#6d28d9] transition-all duration-300 ${v <= 0 ? 'rounded-t-[3px]' : ''}`} style={{ height: `${Math.max(2, (s / maks) * 78)}px` }} />
              </div>
              <span className="text-[8.5px] font-bold uppercase text-[#c2beb8]">{MND[m][0]}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10.5px] text-[#999]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[3px] bg-[#6d28d9]" /> Sikret (signerte kontrakter)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[3px] bg-[#c4b5e8]" /> Antakelser</span>
        {laster && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[#8b5cf6]" />}
      </div>
    </div>
  );

  const driverFelt = (felt, etikett, suffix, bredde = 'w-[72px]') => (
    <span className="inline-flex items-baseline gap-1">
      <input
        value={drivere[felt]}
        onChange={(e) => settDriver(felt, e.target.value)}
        inputMode="decimal"
        data-testid={`wizard-driver-${felt}`}
        className={`${bredde} rounded-lg border border-black/[0.1] bg-white px-2 py-1 text-center text-[13px] font-bold tabular-nums text-[#6d28d9] outline-none transition-shadow focus:ring-2 focus:ring-[#8b5cf6]/30`}
        aria-label={etikett}
      />
      {suffix && <span className="text-[12px] text-[#999]">{suffix}</span>}
    </span>
  );

  const kategorier = Object.keys(kostMedEndringer);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6" data-testid="budsjett-wizard" role="dialog" aria-modal="true">
      <div className="flex max-h-[94vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_80px_rgba(20,17,14,0.3)] sm:rounded-2xl">
        {/* Topp */}
        <div className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f0fb]"><Sparkles className="h-4 w-4 text-[#8b5cf6]" /></span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight text-[#0a0a0a]" style={heading}>Nytt budsjett</p>
            <p className="text-[11px] text-[#999]">Fra tomt til ferdig på to minutter</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {stegIndikator}
            <button onClick={onLukk} data-testid="wizard-lukk" aria-label="Lukk" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Innhold */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {feil && <p className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700" data-testid="wizard-feil">{feil}</p>}

          {/* ── Steg 1 · Periode ── */}
          {steg === 0 && (
            <div>
              <p className="text-[13px] text-[#78716c]">Hvilket år lager vi budsjett for? Årsbudsjettet er styringsdokumentet — «Neste 12 mnd»-visningen beregnes automatisk uansett.</p>
              <div className="mt-3 space-y-1.5">
                {[iAar, iAar + 1, iAar + 2].map((y) => {
                  const eks = aarListe.find((a) => a.year === y);
                  return (
                    <button
                      key={y}
                      onClick={() => setYearW(y)}
                      data-testid={`wizard-aar-${y}`}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${yearW === y ? 'border-[#8b5cf6] bg-[#f4f0fb]/60 ring-1 ring-[#8b5cf6]/30' : 'border-black/[0.07] hover:bg-[#fafaf8]'}`}
                    >
                      <span className="text-[15px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{y}</span>
                      {eks ? (
                        <span className="flex items-center gap-1.5 text-[11.5px] text-[#999]">
                          {eks.laast && <Lock className="h-3 w-3 text-[#8b5cf6]" />}
                          Har budsjett · resultat {kr(eks.resultat)}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-[#b5b5b5]">Ikke opprettet ennå</span>
                      )}
                      {yearW === y && <Check className="ml-auto h-4 w-4 text-[#6d28d9]" />}
                    </button>
                  );
                })}
              </div>
              {eksisterende && (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-[#fdf3e0] px-3.5 py-3" data-testid="wizard-revisjon-varsel">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6b1c]" />
                  <p className="text-[12px] leading-relaxed text-[#7a5416]">
                    <strong>{yearW} har allerede et budsjett</strong>{eksisterende.laast ? ` (låst ${new Date(eksisterende.laastAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })})` : ''}.
                    Veiviseren erstatter honorar-, oppstarts- og kostnadstallene — notat, månedskommentarer, egne poster og «Annen inntekt» beholdes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Steg 2 · Inntekter ── */}
          {steg === 1 && (
            <div>
              {/* Sikret grunnmur — auto, ikke redigerbar */}
              <div className="flex items-center gap-3 rounded-xl bg-[#e8f6ee] px-3.5 py-3" data-testid="wizard-sikret">
                <Lock className="h-4 w-4 shrink-0 text-[#15803d]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-[#14532d]">Sikret grunnmur: {tallW ? kr(tallW.sikretSum) : '…'} i {yearW}</p>
                  <p className="text-[11px] text-[#3f6212]">Signerte kontrakter, faset inn og ut på faktiske datoer — hentet live. Kjente utflyttinger er allerede trukket fra.</p>
                </div>
              </div>

              {/* Presets */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => brukPreset(p)}
                    data-testid={`wizard-preset-${p.id}`}
                    title={p.hint}
                    className={`h-8 rounded-full px-3.5 text-[12px] font-semibold transition-all ${preset === p.id ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ee] text-[#57534e] hover:bg-[#ece9e3]'}`}
                  >
                    {p.l}
                  </button>
                ))}
                {preset === 'egen' && <span className="flex h-8 items-center rounded-full bg-[#f4f0fb] px-3.5 text-[12px] font-semibold text-[#6d28d9]">Egne tall</span>}
              </div>

              {/* Antakelser som setninger */}
              <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-[#44403c]">
                <p>Vi signerer ca. {driverFelt('nye', 'Nye enheter per måned', 'ny(e) enhet(er) per måned', 'w-[56px]')}</p>
                <p>Vi mister ca. {driverFelt('churn', 'Churn prosent per år', '% av porteføljen per år (ukjent frafall — kjente utflyttinger er allerede i sikret)', 'w-[56px]')}</p>
                <p>Ledige enheter fylles med ca. {driverFelt('fyll', 'Utfylling av ledige per måned', 'per måned', 'w-[56px]')}</p>
                <p className="text-[12px] text-[#78716c]">
                  Ny enhet: {driverFelt('snittleie', 'Snittleie', 'kr leie')} · {driverFelt('honorarpct', 'Honorarprosent', '% honorar', 'w-[52px]')} · {driverFelt('oppstart', 'Oppstartshonorar', 'kr oppstart')}
                </p>
              </div>

              <div className="mt-4">{graf}</div>
              {tallW && (
                <p className="mt-2 text-[12px] text-[#999]" data-testid="wizard-inntekt-sum">
                  Inntekter {yearW}: <strong className="tabular-nums text-[#0a0a0a]">{kr(tallW.innSum)}</strong>
                  {tallW.kontraktsfestetPct != null && <> · hvorav <strong className="text-[#15803d]">{tallW.kontraktsfestetPct} % kontraktsfestet</strong></>}
                </p>
              )}
            </div>
          )}

          {/* ── Steg 3 · Kostnader ── */}
          {steg === 2 && (
            <div>
              <div className="flex items-center gap-3 rounded-xl bg-[#e8eefc] px-3.5 py-3">
                <Wallet className="h-4 w-4 shrink-0 text-[#3757c4]" />
                <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[#1e3a8a]">
                  Hentet automatisk fra <strong>Økonomi-registeret</strong> — hver post med sin kategori, frekvens og start-/sluttdato. Oppdater registeret i Datarom → Oversikt hvis noe mangler.
                </p>
              </div>

              <div className="mt-3 space-y-0.5" data-testid="wizard-kostnader">
                {kategorier.map((kat) => {
                  const aarsSum = sum(kostMedEndringer[kat]);
                  if (aarsSum <= 0) return null;
                  const harEndring = endringer.some((e) => e.kategori === kat);
                  return (
                    <div key={kat} className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 hover:bg-[#fafaf8]">
                      <span className="text-[12.5px] font-medium text-[#44403c]">{kat}</span>
                      {harEndring && <span className="rounded-full bg-[#f4f0fb] px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#6d28d9]">endret</span>}
                      <span className="ml-auto text-[12.5px] font-semibold tabular-nums text-[#57534e]">{kr(aarsSum / 12)}/mnd</span>
                      <span className="w-[92px] text-right text-[11.5px] tabular-nums text-[#b5b5b5]">{kr(aarsSum)}/år</span>
                    </div>
                  );
                })}
                {kategorier.every((k) => sum(kostMedEndringer[k]) <= 0) && (
                  <p className="rounded-xl bg-[#fafaf8] px-3.5 py-3 text-[12px] text-[#999]">Ingen løpende kostnader registrert i Økonomi ennå — legg dem inn der, eller fortsett og fyll rutenettet manuelt etterpå.</p>
                )}
              </div>

              {/* Planlagte endringer */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Planlagte endringer i {yearW}</p>
                {endringer.map((e) => (
                  <div key={e.id} className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-[#f4f0fb]/60 px-3 py-2" data-testid={`wizard-endring-${e.id}`}>
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#6d28d9]" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#44403c]">
                      {e.navn || e.kategori}: <strong className="tabular-nums">+{kr(e.belop)}/mnd</strong> fra {MND[e.fraMnd].toLowerCase()} <span className="text-[#999]">({e.kategori})</span>
                    </span>
                    <button onClick={() => setEndringer((prev) => prev.filter((x) => x.id !== e.id))} aria-label="Fjern endring" className="text-[#b3ada3] hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {nyEndring ? (
                  <div className="mt-2 rounded-xl border border-black/[0.07] p-3" data-testid="wizard-ny-endring">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={nyEndring.navn}
                        onChange={(e) => setNyEndring((p) => ({ ...p, navn: e.target.value }))}
                        placeholder="F.eks. Ansettelse markedsfører"
                        data-testid="wizard-endring-navn"
                        className="h-9 min-w-[180px] flex-1 rounded-lg border border-black/[0.1] px-3 text-[13px] outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
                      />
                      <input
                        value={nyEndring.belop}
                        onChange={(e) => setNyEndring((p) => ({ ...p, belop: e.target.value }))}
                        placeholder="kr/mnd"
                        inputMode="numeric"
                        data-testid="wizard-endring-belop"
                        className="h-9 w-[110px] rounded-lg border border-black/[0.1] px-3 text-right text-[13px] tabular-nums outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select value={nyEndring.kategori} onChange={(e) => setNyEndring((p) => ({ ...p, kategori: e.target.value }))} data-testid="wizard-endring-kategori" className="h-9 rounded-lg border border-black/[0.1] bg-white px-2.5 text-[12.5px] outline-none">
                        {kategorier.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <select value={nyEndring.fraMnd} onChange={(e) => setNyEndring((p) => ({ ...p, fraMnd: Number(e.target.value) }))} data-testid="wizard-endring-fra" className="h-9 rounded-lg border border-black/[0.1] bg-white px-2.5 text-[12.5px] outline-none">
                        {MND.map((m, i) => <option key={m} value={i}>Fra {m.toLowerCase()}</option>)}
                      </select>
                      <div className="ml-auto flex gap-1.5">
                        <button onClick={() => setNyEndring(null)} className="h-9 rounded-lg px-3 text-[12.5px] font-medium text-[#999] hover:bg-[#f7f6f3]">Avbryt</button>
                        <button
                          onClick={() => {
                            const b = Math.round(Number(String(nyEndring.belop).replace(/[^\d.-]/g, '')) || 0);
                            if (b <= 0) return;
                            setEndringer((prev) => [...prev, { ...nyEndring, belop: b, id: `e${Date.now()}` }]);
                            setNyEndring(null);
                          }}
                          data-testid="wizard-endring-lagre"
                          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 text-[12.5px] font-semibold text-white hover:bg-black/85"
                        >
                          <Check className="h-3.5 w-3.5" /> Legg til
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNyEndring({ navn: '', belop: '', kategori: 'Lønn', fraMnd: new Date().getMonth() })}
                    data-testid="wizard-ny-endring-knapp"
                    className="mt-2 flex h-9 items-center gap-1.5 rounded-full bg-[#f4f2ee] px-3.5 text-[12.5px] font-semibold text-[#57534e] transition-all hover:bg-[#ece9e3]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Planlagt endring (f.eks. ansettelse fra august)
                  </button>
                )}
              </div>

              {tallW && (
                <p className="mt-3 text-[12px] text-[#999]" data-testid="wizard-kost-sum">
                  Kostnader {yearW}: <strong className="tabular-nums text-[#0a0a0a]">{kr(tallW.kostSum)}</strong>
                </p>
              )}
            </div>
          )}

          {/* ── Steg 4 · Oppsummering ── */}
          {steg === 3 && tallW && (
            <div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { l: `Inntekter ${yearW}`, v: tallW.innSum, icon: TrendingUp, farge: '#1f7a45', sub: tallW.kontraktsfestetPct != null ? `${tallW.kontraktsfestetPct} % kontraktsfestet` : '' },
                  { l: `Kostnader ${yearW}`, v: tallW.kostSum, icon: Wallet, farge: '#b45309', sub: endringer.length ? `${endringer.length} planlagt${endringer.length === 1 ? '' : 'e'} endring${endringer.length === 1 ? '' : 'er'}` : 'Fra Økonomi-registeret' },
                  { l: 'Resultat', v: tallW.resultat, icon: Flag, farge: tallW.resultat >= 0 ? '#3757c4' : '#be123c', sub: 'Inntekter − kostnader' },
                ].map((k) => (
                  <div key={k.l} className="rounded-xl bg-[#fafaf8] p-3.5" data-testid={`wizard-kpi-${k.l.split(' ')[0].toLowerCase()}`}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5]">{k.l}</p>
                    <p className="mt-1 text-[18px] font-bold tabular-nums tracking-[-0.02em]" style={{ ...heading, color: k.farge }}>{kr(k.v)}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-[#a8a29a]">{k.sub}</p>
                  </div>
                ))}
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.07] px-4 py-3 transition-colors hover:bg-[#fafaf8]">
                <input type="checkbox" checked={laas} onChange={(e) => setLaas(e.target.checked)} data-testid="wizard-laas" className="mt-0.5 h-4 w-4 rounded accent-[#8b5cf6]" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0a0a0a]"><Lock className="h-3.5 w-3.5 text-[#8b5cf6]" /> Lås inntektsbudsjettet</span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[#999]">Fryser sikret + antakelser som fasit for avviksanalyse. «Sikret nå» fortsetter å leve som referanse — og du kan låse opp når som helst.</span>
                </span>
              </label>

              {eksisterende && (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-[#fdf3e0] px-3.5 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9a6b1c]" />
                  <p className="text-[12px] leading-relaxed text-[#7a5416]">Dette erstatter tallene i {yearW}-budsjettet{eksisterende.laast ? ' (inkl. eksisterende lås)' : ''}. Notat, kommentarer og egne poster beholdes.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bunn: navigasjon */}
        <div className="flex items-center gap-2 border-t border-black/[0.05] px-5 py-3">
          {steg > 0 && (
            <button onClick={() => setSteg((s) => s - 1)} data-testid="wizard-tilbake" className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-[#78716c] transition-colors hover:bg-[#f7f6f3]">
              <ArrowLeft className="h-3.5 w-3.5" /> Tilbake
            </button>
          )}
          <div className="ml-auto">
            {steg < 3 ? (
              <button
                onClick={() => setSteg((s) => s + 1)}
                disabled={steg === 1 && !modell}
                data-testid="wizard-neste"
                className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
              >
                Neste <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={opprett}
                disabled={oppretter || !modell}
                data-testid="wizard-opprett"
                className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
              >
                {oppretter ? <Loader2 className="h-4 w-4 animate-spin" /> : laas ? <Lock className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {laas ? `Opprett og lås ${yearW}` : `Opprett ${yearW}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
