'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   BudsjettEnkel — superenkelt periodebudsjett.
   · Velg navn + fra/til måned → honorar hentes ferdig utfylt fra leieforholdene
     (kontraktsfestet «sikret» serie — ingen vekstantakelser), redigér fritt.
   · Kun inntekter (honorar) i denne versjonen — kostnadssiden kan legges til senere.
   · Per budsjett: bryter «Synlig i investorrommet». Investorer/brukere ser kun
     delte budsjetter (håndheves også på serveren) og alltid kun lesing.
   · Erstatter den gamle årsbudsjett-modulen i UI — gamle data ligger urørt i DB.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, ArrowLeft, Trash2, RefreshCw, Loader2, Check, Eye, EyeOff, Wallet, TrendingUp, HelpCircle,
} from 'lucide-react';
import BudsjettModell from '@/components/admin/BudsjettModell';
import Omvisning from '@/components/admin/Omvisning';
import { STANDARD_DRIVERE } from '@/lib/budsjett-modell';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const KNAPP_PRIMAER = 'flex h-9 items-center gap-1.5 rounded-[9px] bg-[#141414] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/80 active:scale-[0.98] disabled:opacity-40';
const KNAPP_GHOST = 'flex h-9 items-center gap-1.5 rounded-[9px] border border-black/[0.08] bg-white px-3 text-[13px] font-medium text-[#57534e] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917] disabled:opacity-50';

const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO')} kr`;
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => {
  const { y, m } = ymDeler(ym);
  const t = y * 12 + (m - 1) + i;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const ymDiff = (fra, til) => {
  const a = ymDeler(fra); const b = ymDeler(til);
  return (b.y * 12 + b.m) - (a.y * 12 + a.m) + 1;
};
const mndLabel = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND[m - 1]} ${y}` : ym; };
const mndKort = (ym) => { const { y, m } = ymDeler(ym); return m >= 1 && m <= 12 ? `${MND_KORT[m - 1]}. ${y}` : ym; };
const stor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const periodeLabel = (startYm, antallMnd) => {
  const slutt = ymPluss(startYm, (antallMnd || 1) - 1);
  return `${stor(mndKort(startYm))} – ${mndKort(slutt)} · ${antallMnd} mnd`;
};
const naaYm = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

// Honorar-serie per måned = summen på tvers av inntektskategoriene (én rad i UI)
const honFraPlan = (plan) => {
  const N = plan.antallMnd || 0;
  const serier = Object.values(plan.inntekter || {});
  return Array.from({ length: N }, (_, i) => serier.reduce((s, arr) => s + (Number(arr?.[i]) || 0), 0));
};

export default function BudsjettEnkel({ apiKey, readOnly = false, autoTour = false }) {
  const api = useCallback(async (path, opts = {}) => {
    const url = `/api/admin/budsjett/${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || `Feil (${r.status})`);
    return j;
  }, [apiKey]);

  const [planer, setPlaner] = useState(null); // null = laster
  const [feil, setFeil] = useState('');
  const [visNy, setVisNy] = useState(false);
  const [valgtId, setValgtId] = useState(null);

  /* ── Omvisning (budsjettoversikten): auto-start ved første besøk for alle
        brukere; «?» åpner den igjen når som helst. Nøktern, presis tone. ── */
  const [tourAktiv, setTourAktiv] = useState(false);
  const tourStartetRef = useRef(false);
  const tourSteg = [
    {
      id: 'liste',
      tittel: 'Budsjettoversikten',
      tekst: 'Alle budsjetter samlet. Klikk et budsjett for å åpne det — «I investorrommet» betyr at det er delt (skrivebeskyttet) med investorene.',
      maal: () => document.querySelector('[data-testid="budsjett-liste"]'),
    },
    {
      id: 'ny',
      tittel: 'Nytt budsjett',
      tekst: 'Ett budsjett = én driverstyrt modell: porteføljefakta hentes fra leieforholdene, og vekst, kostnader, bemanning, break-even og kapitalbehov modelleres med synlige forutsetninger.',
      maal: () => document.querySelector('[data-testid="budsjett-ny"]'),
    },
  ];
  const tourFerdig = useCallback(() => {
    setTourAktiv(false);
    try { localStorage.setItem('dh-omvisning-budsjett', '1'); } catch (e) {}
    fetch(`/api/admin/auth/profile?key=${encodeURIComponent(apiKey)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourSett: 'budsjett' }),
    }).catch(() => {});
  }, [apiKey]);
  useEffect(() => {
    if (!autoTour || tourStartetRef.current || valgtId || planer === null) return undefined;
    if (typeof window === 'undefined' || window.innerWidth < 1024) return undefined;
    try { if (localStorage.getItem('dh-omvisning-budsjett')) return undefined; } catch (e) {}
    // Ref settes først når timeren FYRER — ellers dreper StrictMode/re-render
    // timeren i cleanup og guarden blokkerer re-arming.
    const t = setTimeout(() => { tourStartetRef.current = true; setTourAktiv(true); }, 800);
    return () => clearTimeout(t);
  }, [autoTour, valgtId, planer]);

  // Opprettelse — alle nye budsjetter er driverstyrte modeller (type 'modell')
  const [nyNavn, setNyNavn] = useState('');
  const [nyFra, setNyFra] = useState(naaYm());
  const [nyTil, setNyTil] = useState(ymPluss(naaYm(), 11));
  const [oppretter, setOppretter] = useState(false);
  const [nyFeil, setNyFeil] = useState('');

  // Editor
  const [plan, setPlan] = useState(null); // {id, navn, startYm, antallMnd, hon[], investorSynlig, kostnader, status}
  const [planLaster, setPlanLaster] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagret, setLagret] = useState(false);
  const [skittent, setSkittent] = useState(false);
  const [henterHon, setHenterHon] = useState(false);
  const [sletteBekreft, setSletteBekreft] = useState(false);
  const [edFeil, setEdFeil] = useState('');

  const hentPlaner = useCallback(async () => {
    try { const j = await api('planer'); setPlaner(j.planer || []); setFeil(''); }
    catch (e) { setFeil(e.message); setPlaner([]); }
  }, [api]);
  useEffect(() => { hentPlaner(); }, [hentPlaner]);

  const aapne = async (id) => {
    setValgtId(id); setPlanLaster(true); setEdFeil(''); setSletteBekreft(false); setSkittent(false); setLagret(false);
    try {
      const j = await api(`plan?id=${encodeURIComponent(id)}`);
      setPlan({ ...j.plan, hon: honFraPlan(j.plan) });
    } catch (e) { setEdFeil(e.message); setPlan(null); }
    setPlanLaster(false);
  };
  const tilListe = () => { setValgtId(null); setPlan(null); setVisNy(false); };

  const opprett = async () => {
    const navn = nyNavn.trim();
    if (!navn) { setNyFeil('Gi budsjettet et navn'); return; }
    const n = ymDiff(nyFra, nyTil);
    if (!(n >= 1 && n <= 36)) { setNyFeil('Perioden må være 1–36 måneder (til-måned kan ikke være før fra-måned)'); return; }
    setOppretter(true); setNyFeil('');
    try {
      // Porteføljefakta hentes fra leieforholdene — kontraktsfestet, ingen antakelser
      let forslag = null;
      let hentetOk = true;
      try { forslag = await api(`plan/forslag?startYm=${nyFra}&antallMnd=${n}`); } catch (e) { hentetOk = false; }
      const serie = (arr) => { const a = (arr || []).slice(0, n).map((v) => Math.max(0, Math.round(Number(v) || 0))); while (a.length < n) a.push(0); return a; };
      const body = {
        navn, startYm: nyFra, antallMnd: n, type: 'modell', investorSynlig: false,
        fakta: { eksisterende: serie(forslag?.sikret), enheter: serie(forslag?.enheterSerie), bortfall: serie(forslag?.bortfall), oppdatertAt: new Date().toISOString() },
        drivere: {
          ...STANDARD_DRIVERE,
          ...(forslag?.drivereBrukt?.snittLeie ? { snittleieNye: Math.round(forslag.drivereBrukt.snittLeie) } : {}),
          ...(forslag?.drivereBrukt?.honorarPct ? { honorarPctNye: forslag.drivereBrukt.honorarPct } : {}),
        },
      };
      const r = await api('plan', { method: 'PUT', body });
      setNyNavn(''); setVisNy(false);
      await hentPlaner();
      await aapne(r.id);
      if (!hentetOk) setEdFeil('Fikk ikke hentet honorar fra leieforholdene akkurat nå — radene starter på 0. Prøv «Hent fra leieforholdene».');
    } catch (e) { setNyFeil(e.message); }
    setOppretter(false);
  };

  const lagre = async (overstyr = {}) => {
    if (!plan || lagrer) return;
    setLagrer(true); setEdFeil('');
    const p = { ...plan, ...overstyr };
    try {
      await api('plan', {
        method: 'PUT',
        body: {
          id: p.id,
          navn: p.navn,
          startYm: p.startYm,
          antallMnd: p.antallMnd,
          status: p.status,
          notat: p.notat || '',
          inntekter: { 'Honorar (forvaltning)': p.hon },
          kostnader: p.kostnader || {},
          investorSynlig: Boolean(p.investorSynlig),
        },
      });
      setSkittent(false); setLagret(true); setTimeout(() => setLagret(false), 1800);
      hentPlaner();
    } catch (e) { setEdFeil(e.message); }
    setLagrer(false);
  };

  const hentHonorar = async () => {
    if (!plan || henterHon) return;
    setHenterHon(true); setEdFeil('');
    try {
      const f = await api(`plan/forslag?startYm=${plan.startYm}&antallMnd=${plan.antallMnd}`);
      const hon = (f.sikret || []).slice(0, plan.antallMnd).map((v) => Math.max(0, Math.round(Number(v) || 0)));
      while (hon.length < plan.antallMnd) hon.push(0);
      setPlan((prev) => ({ ...prev, hon }));
      setSkittent(true);
    } catch (e) { setEdFeil(e.message); }
    setHenterHon(false);
  };

  const slett = async () => {
    if (!plan) return;
    try { await api(`plan?id=${encodeURIComponent(plan.id)}`, { method: 'DELETE' }); tilListe(); hentPlaner(); }
    catch (e) { setEdFeil(e.message); }
  };

  const settHon = (i, v) => {
    const n = Math.max(0, Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0));
    setPlan((prev) => {
      const hon = [...prev.hon]; hon[i] = n; return { ...prev, hon };
    });
    setSkittent(true);
  };

  const sum = useMemo(() => (plan ? plan.hon.reduce((s, x) => s + x, 0) : 0), [plan]);

  /* ────────────────────────── Editor ────────────────────────── */
  if (valgtId && !planLaster && plan && plan.type === 'modell') {
    return (
      <BudsjettModell
        key={plan.id}
        plan={plan}
        api={api}
        apiKey={apiKey}
        readOnly={readOnly}
        onTilbake={() => { tilListe(); hentPlaner(); }}
        onEndret={hentPlaner}
      />
    );
  }
  if (valgtId) {
    return (
      <div className="mx-auto w-full max-w-[760px]" data-testid="budsjett-editor">
        <button onClick={tilListe} data-testid="budsjett-tilbake" className="flex items-center gap-1.5 text-[13px] font-medium text-[#8f8a82] transition-colors hover:text-[#1c1917]">
          <ArrowLeft className="h-3.5 w-3.5" /> Alle budsjetter
        </button>

        {planLaster ? (
          <div className="mt-10 flex items-center gap-2.5 text-[13.5px] text-[#8f8a82]"><Loader2 className="h-4 w-4 animate-spin" /> Henter budsjettet…</div>
        ) : !plan ? (
          <p className="mt-10 text-[13.5px] text-[#b3261e]">{edFeil || 'Fant ikke budsjettet.'}</p>
        ) : (
          <>
            {/* Hode: navn + periode + investor-bryter */}
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {readOnly ? (
                  <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{plan.navn}</h2>
                ) : (
                  <input value={plan.navn} maxLength={80} data-testid="budsjett-navn"
                    onChange={(e) => { setPlan((p) => ({ ...p, navn: e.target.value })); setSkittent(true); }}
                    className="-ml-1 w-full min-w-[240px] rounded-[8px] border border-transparent bg-transparent px-1 text-[22px] font-bold tracking-[-0.01em] text-[#1c1917] outline-none transition-colors hover:border-black/[0.07] focus:border-black/[0.15]" style={heading} />
                )}
                <p className="mt-1 text-[13.5px] text-[#8f8a82]">{periodeLabel(plan.startYm, plan.antallMnd)}</p>
              </div>
              {!readOnly && (
                <button onClick={() => { const ny = !plan.investorSynlig; setPlan((p) => ({ ...p, investorSynlig: ny })); lagre({ investorSynlig: ny }); }}
                  data-testid="budsjett-investor-bryter" title={plan.investorSynlig ? 'Delt med investorrommet — trykk for å skjule' : 'Ikke delt — trykk for å dele med investorrommet'}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium transition-all ${plan.investorSynlig ? 'bg-[#f0ebfa] text-[#6d28d9]' : 'bg-white text-[#8f8a82] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] hover:text-[#57534e]'}`}>
                  {plan.investorSynlig ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {plan.investorSynlig ? 'Synlig i investorrommet' : 'Ikke synlig i investorrommet'}
                </button>
              )}
            </div>

            {/* Sum — hovedtallet */}
            <div className="mt-6 rounded-[14px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              <p className="text-[12.5px] font-medium text-[#8f8a82]">Budsjettert honorar i perioden</p>
              <p className="mt-1 text-[30px] font-bold tracking-[-0.02em] text-[#1c1917]" style={heading} data-testid="budsjett-sum">{kr(sum)}</p>
              <p className="mt-0.5 text-[12.5px] text-[#a6a19a]">{kr(plan.antallMnd ? sum / plan.antallMnd : 0)} i snitt per måned</p>
            </div>

            {/* Månedsrader */}
            <div className="mt-5 rounded-[14px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between px-5 pb-1 pt-4">
                <p className="text-[12.5px] font-medium text-[#8f8a82]">Honorar per måned</p>
                {!readOnly && (
                  <button onClick={hentHonorar} disabled={henterHon} data-testid="budsjett-hent-honorar" title="Fyller radene med kontraktsfestet honorar fra leieforholdene — overskriver det som står"
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6d28d9] transition-colors hover:text-[#4c1d95] disabled:opacity-50">
                    {henterHon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Hent fra leieforholdene
                  </button>
                )}
              </div>
              <div className="px-2 pb-2">
                {plan.hon.map((v, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-black/[0.04] px-3 py-1 last:border-0">
                    <span className="text-[13.5px] text-[#57534e]">{stor(mndLabel(ymPluss(plan.startYm, i)))}</span>
                    {readOnly ? (
                      <span className="text-[13.5px] font-semibold text-[#1c1917]">{kr(v)}</span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <input value={v === 0 ? '' : v.toLocaleString('nb-NO')} inputMode="numeric" placeholder="0" data-testid={`budsjett-mnd-${i}`}
                          onChange={(e) => settHon(i, e.target.value)}
                          className="h-8 w-[130px] rounded-[8px] border border-transparent bg-transparent px-2 text-right text-[13.5px] font-semibold text-[#1c1917] outline-none transition-colors hover:border-black/[0.07] focus:border-black/[0.15] focus:bg-white" />
                        <span className="w-5 text-[12.5px] text-[#a6a19a]">kr</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {edFeil && <p className="mt-3 text-[13px] text-[#b3261e]" data-testid="budsjett-editor-feil">{edFeil}</p>}

            {/* Handlingslinje */}
            {!readOnly && (
              <div className="mt-5 flex items-center gap-2">
                <button onClick={() => lagre()} disabled={lagrer || !skittent} data-testid="budsjett-lagre" className={KNAPP_PRIMAER}>
                  {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : lagret ? <Check className="h-3.5 w-3.5" /> : null}
                  {lagret ? 'Lagret' : 'Lagre'}
                </button>
                {skittent && !lagrer && <span className="text-[12.5px] text-[#a6a19a]">Ulagrede endringer</span>}
                <span className="ml-auto">
                  {!sletteBekreft ? (
                    <button onClick={() => setSletteBekreft(true)} data-testid="budsjett-slett" className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#c2beb8] transition-colors hover:bg-[#fdf0ef] hover:text-[#c2413b]">
                      <Trash2 className="h-3.5 w-3.5" /> Slett budsjett
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <button onClick={slett} data-testid="budsjett-slett-bekreft" className="rounded-[7px] bg-[#fdf0ef] px-3 py-1.5 text-[12.5px] font-bold text-[#c2413b]">Ja, slett</button>
                      <button onClick={() => setSletteBekreft(false)} className="rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#a8a29a]">Avbryt</button>
                    </span>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ────────────────────────── Liste ────────────────────────── */
  return (
    <div className="mx-auto w-full max-w-[760px] pt-2" data-testid="budsjett-liste">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold tracking-[-0.015em] text-[#1c1917]" style={heading}>Budsjetter</h1>
          <p className="mt-1 text-[13.5px] text-[#8f8a82]">
            {readOnly ? 'Budsjetter delt med investorrommet.' : 'Driverstyrte budsjetter — porteføljefakta fra leieforholdene, resten modellerer du med synlige forutsetninger.'}
          </p>
        </div>
        <div className="mt-1 flex shrink-0 items-center gap-2">
          <button onClick={() => setTourAktiv(true)} data-testid="budsjett-tour-knapp" title="Omvisning — se hvordan budsjettmodulen henger sammen"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-black/[0.08] bg-white text-[#a6a19a] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917]">
            <HelpCircle className="h-4 w-4" />
          </button>
          {!readOnly && (
            <button onClick={() => { setVisNy((v) => !v); setNyFeil(''); }} data-testid="budsjett-ny" className={`${KNAPP_PRIMAER} shrink-0`}>
              <Plus className="h-3.5 w-3.5" /> Nytt budsjett
            </button>
          )}
        </div>
      </div>

      <Omvisning steg={tourSteg} aktiv={tourAktiv} onFerdig={tourFerdig} />

      {/* Opprettelse — ett lite panel, tre felter, ferdig */}
      {visNy && !readOnly && (
        <div className="mt-4 rounded-[14px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="budsjett-ny-panel">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
            <label className="block">
              <span className="text-[12px] font-medium text-[#8f8a82]">Navn</span>
              <input value={nyNavn} onChange={(e) => setNyNavn(e.target.value)} maxLength={80} autoFocus data-testid="budsjett-ny-navn"
                placeholder="F.eks. «Budsjett 2027»"
                onKeyDown={(e) => { if (e.key === 'Enter') opprett(); }}
                className="mt-1 h-9 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 text-[13.5px] outline-none transition-colors placeholder:text-[#c2beb8] focus:border-[#1c1917]/25" />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-[#8f8a82]">Fra måned</span>
              <input type="month" value={nyFra} data-testid="budsjett-ny-fra"
                onChange={(e) => { const v = e.target.value; setNyFra(v); if (v && ymDiff(v, nyTil) < 1) setNyTil(v); }}
                className="mt-1 h-9 w-full rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none focus:border-[#1c1917]/25" />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-[#8f8a82]">Til måned</span>
              <input type="month" value={nyTil} min={nyFra} data-testid="budsjett-ny-til"
                onChange={(e) => setNyTil(e.target.value)}
                className="mt-1 h-9 w-full rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none focus:border-[#1c1917]/25" />
            </label>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <button onClick={opprett} disabled={oppretter} data-testid="budsjett-opprett" className={KNAPP_PRIMAER}>
              {oppretter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
              {oppretter ? 'Henter porteføljefakta…' : 'Opprett budsjett'}
            </button>
            {/* Hurtigvalg av horisont — 3-årsplanen er investorstandarden */}
            <span className="flex items-center gap-1" data-testid="budsjett-ny-horisont">
              {[[12, '1 år'], [24, '2 år'], [36, '3 år']].map(([n, l]) => (
                <button key={n} type="button" onClick={() => setNyTil(ymPluss(nyFra, n - 1))} data-testid={`budsjett-ny-horisont-${n}`}
                  className={`h-7 rounded-full px-2.5 text-[11.5px] font-bold transition-all ${ymDiff(nyFra, nyTil) === n ? 'bg-[#1c1917] text-white' : 'bg-[#f0efec] text-[#8f8a82] hover:text-[#1c1917]'}`}>
                  {l}
                </button>
              ))}
            </span>
            {nyFra && nyTil && ymDiff(nyFra, nyTil) >= 1 && (
              <span className="text-[12.5px] text-[#a6a19a]">{periodeLabel(nyFra, ymDiff(nyFra, nyTil))}</span>
            )}
          </div>
          {nyFeil && <p className="mt-2.5 text-[13px] text-[#b3261e]" data-testid="budsjett-ny-feil">{nyFeil}</p>}
          <p className="mt-2.5 text-[12px] leading-relaxed text-[#a6a19a]">
            Porteføljefakta (kontraktsfestet honorar og enheter) hentes automatisk fra leieforholdene — vekst, churn, bemanning og kostnader modellerer du med synlige forutsetninger etterpå.
          </p>
        </div>
      )}

      {feil && <p className="mt-4 text-[13px] text-[#b3261e]" data-testid="budsjett-feil">{feil}</p>}

      {/* Budsjettliste */}
      {planer === null ? (
        <div className="mt-8 flex items-center gap-2.5 text-[13.5px] text-[#8f8a82]"><Loader2 className="h-4 w-4 animate-spin" /> Henter budsjetter…</div>
      ) : planer.length === 0 ? (
        <div className="mt-8 rounded-[14px] bg-white px-6 py-10 text-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="budsjett-tom">
          <Wallet className="mx-auto h-7 w-7 text-[#d6d1c9]" />
          <p className="mt-3 text-[14.5px] font-semibold text-[#1c1917]" style={heading}>{readOnly ? 'Ingen budsjetter er delt ennå' : 'Ingen budsjetter ennå'}</p>
          <p className="mx-auto mt-1 max-w-[380px] text-[13px] leading-relaxed text-[#8f8a82]">
            {readOnly ? 'Når et budsjett deles med investorrommet, dukker det opp her.' : 'Lag ditt første budsjett — velg periode, så henter vi porteføljefakta fra leieforholdene for deg.'}
          </p>
          {!readOnly && !visNy && (
            <button onClick={() => setVisNy(true)} className={`${KNAPP_PRIMAER} mx-auto mt-5`}><Plus className="h-3.5 w-3.5" /> Nytt budsjett</button>
          )}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-[16px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
          {planer.map((p) => (
            <button key={p.id} onClick={() => aapne(p.id)} data-testid={`budsjett-rad-${p.id}`}
              className="group flex w-full items-center gap-4 border-b border-black/[0.05] px-5 py-4 text-left transition-colors last:border-0 hover:bg-[#faf9f7]">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-colors ${p.type === 'modell' ? 'bg-[#1c1917] text-white' : 'bg-[#f0efec] text-[#78716c] group-hover:bg-[#e9e7e3]'}`}>
                {p.type === 'modell' ? <TrendingUp className="h-[18px] w-[18px]" /> : <Wallet className="h-[18px] w-[18px]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[15.5px] font-semibold text-[#1c1917]" style={heading}>{p.navn}</span>
                  {!readOnly && p.investorSynlig && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#f0ebfa] px-2 py-0.5 text-[10.5px] font-bold text-[#6d28d9]" title="Synlig i investorrommet"><Eye className="h-3 w-3" /> Investorrom</span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13px] text-[#8f8a82]">{p.type === 'modell' ? '' : 'Enkelt budsjett (eldre) · '}{periodeLabel(p.startYm, p.antallMnd)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[16px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{kr(p.inntekter)}</span>
                {p.type === 'modell' ? (
                  <span className={`block text-[12px] font-semibold ${(p.resultat || 0) >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>resultat {kr(p.resultat)}</span>
                ) : (
                  <span className="block text-[12px] text-[#a6a19a]">honorar i perioden</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
