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
  Plus, ArrowLeft, ArrowRight, Trash2, RefreshCw, Loader2, Check, Eye, EyeOff, Wallet, TrendingUp, HelpCircle,
  Copy,
} from 'lucide-react';
import BudsjettModell from '@/components/admin/BudsjettModell';
import TechModell from '@/components/admin/TechModell';
import KonsernSammenstilling from '@/components/admin/KonsernSammenstilling';
import Omvisning from '@/components/admin/Omvisning';
import { useSelskap, SelskapsVelger, SelskapMerke } from '@/components/admin/SelskapOkonomi';
import { STANDARD_DRIVERE, STANDARD_TECH } from '@/lib/budsjett-modell';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const KNAPP_PRIMAER = 'flex h-9 items-center gap-1.5 rounded-[9px] bg-[#141414] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/80 active:scale-[0.98] disabled:opacity-40';
const KNAPP_GHOST = 'flex h-9 items-center gap-1.5 rounded-[9px] border border-black/[0.08] bg-white px-3 text-[13px] font-medium text-[#57534e] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917] disabled:opacity-50';

const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
// Smalt no-break space (U+202F) som tusenskiller — NBSP fra nb-NO rendres bredt
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00A0/g, ' ')} kr`;
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
  // Selskapsdimensjon — samme valg som i Økonomi (husket i localStorage + URL)
  const [selskap, setSelskap] = useSelskap();
  const [nySelskap, setNySelskap] = useState('digihome');
  const [nyKobling, setNyKobling] = useState('');
  useEffect(() => { if (selskap === 'digihome' || selskap === 'tech') setNySelskap(selskap); }, [selskap]);
  // Puls: faktisk denne måneden fra Økonomi (per selskap) — møter planens tall for samme måned
  const [okonomi, setOkonomi] = useState(null);
  useEffect(() => {
    if (readOnly || !apiKey) return;
    let avbrutt = false;
    (async () => { try { const r = await fetch(`/api/admin/finance/selskap?key=${encodeURIComponent(apiKey)}`); const j = await r.json(); if (!avbrutt && j?.ok) setOkonomi(j); } catch (e) { /* stille */ } })();
    return () => { avbrutt = true; };
  }, [apiKey, readOnly]);
  const [dupliserer, setDupliserer] = useState('');
  const dupliser = async (e, id) => {
    e.stopPropagation(); if (dupliserer) return; setDupliserer(id);
    try { const r = await api('plan/dupliser', { method: 'POST', body: { id } }); await hentPlaner(); if (r?.id) await aapne(r.id); } catch (err) { setFeil(err.message); }
    setDupliserer('');
  };
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
    if (nySelskap === 'tech') {
      // Tech-budsjett: prisliste fra Økonomi er utgangspunktet; enheter under forvaltning fra koblet Digihome AS-budsjett.
      try {
        let prisliste = null;
        try { const r = await fetch(`/api/admin/finance/settings?key=${encodeURIComponent(apiKey)}`); const j = await r.json(); prisliste = j.settings?.prisliste || null; } catch (e) { prisliste = null; }
        const tech = {
          ...STANDARD_TECH,
          huseier: { ...STANDARD_TECH.huseier, ...(prisliste?.huseier ? { prisModell: prisliste.huseier.modell, pris: prisliste.huseier.pris } : {}) },
          forvaltning: { ...STANDARD_TECH.forvaltning, kilde: 'plan', ...(prisliste?.forvaltning ? { pris: prisliste.forvaltning.pris } : {}) },
          bedrift: { ...STANDARD_TECH.bedrift, ...(prisliste?.bedrift ? { pris: prisliste.bedrift.pris } : {}) },
        };
        let fakta = null;
        try { const f = await api(`plan/tech-fakta?startYm=${nyFra}&antallMnd=${n}${nyKobling ? `&kobletPlanId=${encodeURIComponent(nyKobling)}` : ''}`); fakta = f.fakta || null; } catch (e) { fakta = null; }
        const r = await api('plan', { method: 'PUT', body: { navn, selskap: 'tech', startYm: nyFra, antallMnd: n, investorSynlig: false, tech, fakta, kobletPlanId: nyKobling || null } });
        setNyNavn(''); setVisNy(false);
        await hentPlaner();
        await aapne(r.id);
      } catch (e) { setNyFeil(e.message); }
      setOppretter(false);
      return;
    }
    try {
      // Porteføljefakta hentes fra leieforholdene — kontraktsfestet, ingen antakelser
      let forslag = null;
      let hentetOk = true;
      try { forslag = await api(`plan/forslag?startYm=${nyFra}&antallMnd=${n}`); } catch (e) { hentetOk = false; }
      const serie = (arr) => { const a = (arr || []).slice(0, n).map((v) => Math.max(0, Math.round(Number(v) || 0))); while (a.length < n) a.push(0); return a; };
      const body = {
        navn, selskap: 'digihome', startYm: nyFra, antallMnd: n, type: 'modell', investorSynlig: false,
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
  if (valgtId && !planLaster && plan && plan.selskap === 'tech') {
    return (
      <TechModell
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
  const horisontLabel = (n) => (n === 12 ? '1 år' : n === 24 ? '2 år' : n === 36 ? '3 år' : `${n} mnd`);
  const datoKort = (iso) => { try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  const planerVist = (planer || [])
    .filter((p) => (selskap === 'tech' ? p.selskap === 'tech' : p.selskap !== 'tech'))
    .sort((a, b) => (a.status === 'vedtatt' ? -1 : 0) - (b.status === 'vedtatt' ? -1 : 0) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  // Planen som «gjelder» nå: vedtatt som dekker denne måneden, ellers nyeste som dekker den
  const gjeldende = planerVist.find((p) => p.status === 'vedtatt' && p.naa) || planerVist.find((p) => p.naa) || null;
  const faktiskNaa = okonomi?.naa?.[selskap === 'tech' ? 'tech' : 'digihome'] || null;
  const dhModeller = (planer || []).filter((p) => p.selskap !== 'tech' && p.type === 'modell');
  const undertekst = selskap === 'tech'
    ? 'Plattformselskapets budsjett — prislisten × tre kundegrupper. Lisensen fra Digihome AS følger forvaltningsbudsjettet automatisk.'
    : selskap === 'konsern'
      ? 'Konsernet er en sammenstilling av ett Digihome AS- og ett Tech-budsjett, med plattformlisensen eliminert.'
      : 'Forvaltningsselskapets budsjett — porteføljefakta fra leieforholdene, resten modellerer du med synlige forutsetninger.';
  return (
    <div className="mx-auto w-full max-w-[1060px] pt-2" data-testid="budsjett-liste">
      {!readOnly && <SelskapsVelger verdi={selskap} onChange={(v) => { setSelskap(v); setVisNy(false); }} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[25px] font-bold tracking-[-0.015em] text-[#1c1917]" style={heading}>Budsjetter</h1>
          <p className="mt-1 text-[13.5px] text-[#8f8a82]">
            {readOnly ? 'Budsjetter delt med investorrommet.' : undertekst}
          </p>
        </div>
        <div className="mt-1 flex shrink-0 items-center gap-2">
          <button onClick={() => setTourAktiv(true)} data-testid="budsjett-tour-knapp" title="Omvisning — se hvordan budsjettmodulen henger sammen"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#a6a19a] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917]">
            <HelpCircle className="h-4 w-4" />
          </button>
          {!readOnly && selskap !== 'konsern' && (
            <button onClick={() => { setVisNy((v) => !v); setNyFeil(''); }} data-testid="budsjett-ny" className={`${KNAPP_PRIMAER} shrink-0`}>
              <Plus className="h-3.5 w-3.5" /> Nytt budsjett
            </button>
          )}
        </div>
      </div>

      <Omvisning steg={tourSteg} aktiv={tourAktiv} onFerdig={tourFerdig} />

      {/* Opprettelse — horisont først (1/2/3 år er hovedvalget), datoene følger */}
      {visNy && !readOnly && (
        <div className="relative mt-4 overflow-hidden rounded-[18px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="budsjett-ny-panel">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#8b5cf6] via-[#a78bfa] to-transparent" />
          <p className="text-[14px] font-bold text-[#1c1917]" style={heading}>Nytt budsjett</p>
          {/* Selskap først — motoren følger selskapet */}
          <div className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="budsjett-ny-selskap">
            {[
              ['digihome', 'Digihome AS', 'Forvaltningsmotoren — porteføljefakta fra leieforholdene, vekst, churn og bemanningstrapp.'],
              ['tech', 'Digihome Tech AS', 'Plattformmotoren — prislisten × huseiere, lisens fra Digihome AS og bedriftskunder.'],
            ].map(([id, navnS, tekst]) => (
              <button key={id} type="button" onClick={() => setNySelskap(id)} data-testid={`budsjett-ny-selskap-${id}`} aria-pressed={nySelskap === id}
                className={`flex items-start gap-3 rounded-[14px] p-3.5 text-left transition-all ${nySelskap === id ? 'bg-[#1c1917] text-white shadow-sm' : 'bg-[#f7f6f3] text-[#1c1917] hover:bg-[#f0efec]'}`}>
                <SelskapMerke id={id} storrelse={28} />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold" style={heading}>{navnS}</span>
                  <span className={`mt-0.5 block text-[12px] leading-snug ${nySelskap === id ? 'text-white/65' : 'text-[#8f8a82]'}`}>{tekst}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_150px_150px]">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Navn</span>
              <input value={nyNavn} onChange={(e) => setNyNavn(e.target.value)} maxLength={80} autoFocus data-testid="budsjett-ny-navn"
                placeholder="F.eks. «Vekstplan 2027–2029»"
                onKeyDown={(e) => { if (e.key === 'Enter') opprett(); }}
                className="mt-1 h-9 w-full rounded-[9px] border border-black/[0.08] bg-white px-3 text-[13.5px] outline-none transition-colors placeholder:text-[#c2beb8] focus:border-[#1c1917]/25" />
            </label>
            <div className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Horisont</span>
              <span className="mt-1 flex h-9 items-center gap-0.5 rounded-[9px] bg-[#f0efec] p-0.5" data-testid="budsjett-ny-horisont">
                {[[12, '1 år'], [24, '2 år'], [36, '3 år']].map(([n, l]) => (
                  <button key={n} type="button" onClick={() => setNyTil(ymPluss(nyFra, n - 1))} data-testid={`budsjett-ny-horisont-${n}`}
                    className={`h-full rounded-[7px] px-3 text-[12.5px] font-bold transition-all ${ymDiff(nyFra, nyTil) === n ? 'bg-[#1c1917] text-white shadow-sm' : 'text-[#8f8a82] hover:text-[#1c1917]'}`}>
                    {l}
                  </button>
                ))}
              </span>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Fra måned</span>
              <input type="month" value={nyFra} data-testid="budsjett-ny-fra"
                onChange={(e) => { const v = e.target.value; setNyFra(v); if (v && ymDiff(v, nyTil) < 1) setNyTil(v); }}
                className="mt-1 h-9 w-full rounded-[9px] border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none focus:border-[#1c1917]/25" />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Til måned</span>
              <input type="month" value={nyTil} min={nyFra} data-testid="budsjett-ny-til"
                onChange={(e) => setNyTil(e.target.value)}
                className="mt-1 h-9 w-full rounded-[9px] border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none focus:border-[#1c1917]/25" />
            </label>
          </div>
          {nySelskap === 'tech' && (
            <label className="mt-3 block max-w-[520px]" data-testid="budsjett-ny-kobling-felt">
              <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]">Enheter under forvaltning hentes fra</span>
              <select value={nyKobling} onChange={(e) => setNyKobling(e.target.value)} data-testid="budsjett-ny-kobling"
                className="mt-1 h-9 w-full rounded-[9px] border border-black/[0.08] bg-white px-2.5 text-[13.5px] outline-none focus:border-[#1c1917]/25">
                <option value="">Dagens portefølje (kontraktsfestet, uten vekst)</option>
                {dhModeller.map((p) => <option key={p.id} value={p.id}>{p.navn} · {periodeLabel(p.startYm, p.antallMnd)}{p.status === 'vedtatt' ? ' · vedtatt' : ''}</option>)}
              </select>
              <span className="mt-1 block text-[11.5px] text-[#a6a19a]">Gir lisensinntekten (enheter × pris) uten å taste noe. Kan endres i budsjettet.</span>
            </label>
          )}
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <button onClick={opprett} disabled={oppretter} data-testid="budsjett-opprett" className={KNAPP_PRIMAER}>
              {oppretter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
              {oppretter ? (nySelskap === 'tech' ? 'Henter enheter…' : 'Henter porteføljefakta…') : `Opprett ${nySelskap === 'tech' ? 'Tech-budsjett' : 'budsjett'}`}
            </button>
            {nyFra && nyTil && ymDiff(nyFra, nyTil) >= 1 && (
              <span className="text-[12.5px] text-[#a6a19a]">{periodeLabel(nyFra, ymDiff(nyFra, nyTil))}</span>
            )}
          </div>
          {nyFeil && <p className="mt-2.5 text-[13px] text-[#b3261e]" data-testid="budsjett-ny-feil">{nyFeil}</p>}
          <p className="mt-2.5 text-[12px] leading-relaxed text-[#a6a19a]">
            {nySelskap === 'tech'
              ? 'Prisene starter fra prislisten i Økonomi → Tech. Vekst, churn, annonser og utviklingskost modellerer du med synlige forutsetninger etterpå.'
              : 'Porteføljefakta (kontraktsfestet honorar, enheter og re-utleie) hentes automatisk fra leieforholdene — vekst, churn, bemanning og kostnader modellerer du med synlige forutsetninger etterpå.'}
          </p>
        </div>
      )}

      {feil && <p className="mt-4 text-[13px] text-[#b3261e]" data-testid="budsjett-feil">{feil}</p>}

      {/* Puls: budsjett møter faktisk — samme måned, samme selskap */}
      {!readOnly && selskap !== 'konsern' && planer !== null && planerVist.length > 0 && (
        <div className="mt-5 grid gap-3 rounded-[18px] bg-[#1c1917] p-5 text-white sm:grid-cols-[1.2fr_1fr_1fr_1fr]" data-testid="budsjett-puls">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-white/45">Denne måneden · {faktiskNaa ? stor(mndLabel(faktiskNaa.ym || okonomi?.naa?.ym)) : stor(mndLabel(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`))}</p>
            {gjeldende ? (
              <p className="mt-1.5 text-[13.5px] leading-snug text-white/85">Måles mot <button onClick={() => aapne(gjeldende.id)} className="font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-white" data-testid="budsjett-puls-plan">{gjeldende.navn}</button>{gjeldende.status === 'vedtatt' ? ' (vedtatt)' : ' (nyeste utkast)'} · måned {gjeldende.naa.idx + 1} av {gjeldende.antallMnd}</p>
            ) : (
              <p className="mt-1.5 text-[13.5px] leading-snug text-white/70">Ingen budsjett dekker denne måneden. Lag et som starter nå for å følge plan mot faktisk.</p>
            )}
          </div>
          {[
            ['Inntekt', faktiskNaa?.inntekt, gjeldende?.naa?.inntekt],
            ['Kostnader', faktiskNaa?.kost, gjeldende?.naa?.kost, true],
            ['Resultat', faktiskNaa?.resultat, gjeldende?.naa?.resultat],
          ].map(([l, f, pl, kostnad]) => {
            const avvik = f != null && pl != null ? f - pl : null;
            const bra = avvik == null ? null : kostnad ? avvik <= 0 : avvik >= 0;
            return (
              <div key={l} className="min-w-0 border-l border-white/10 pl-4">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-white/45">{l}</p>
                {f == null && !okonomi ? <span className="mt-2 block h-5 w-24 animate-pulse rounded bg-white/15" /> : <p className="mt-1 text-[19px] font-bold tracking-[-0.02em] whitespace-nowrap" style={heading}>{f == null ? '—' : kr(f)}</p>}
                <p className="mt-0.5 text-[11.5px] text-white/55 whitespace-nowrap">{pl != null ? <>plan {kr(pl)}{avvik != null && Math.abs(avvik) >= 1 ? <span className={`ml-1.5 font-semibold ${bra ? 'text-[#7CFFB2]' : 'text-[#FF9B9B]'}`}>{avvik > 0 ? '+' : '−'}{kr(Math.abs(avvik))}</span> : null}</> : 'ingen plan'}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Konsern = sammenstilling, ikke egne budsjetter */}
      {!readOnly && selskap === 'konsern' && planer !== null ? (
        <KonsernSammenstilling planer={planer} api={api} onAapne={(id, sel) => { if (!id) return; setSelskap(sel); aapne(id); }} />
      ) : null}

      {/* Budsjettkort — rikt grid med status, horisont, nøkkeltall og margin */}
      {selskap === 'konsern' && !readOnly ? null : planer === null ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-[168px] animate-pulse rounded-[18px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" />)}
        </div>
      ) : planerVist.length === 0 ? (
        <div className="mt-8 rounded-[18px] bg-white px-6 py-12 text-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="budsjett-tom">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f0fb]"><Wallet className="h-6 w-6 text-[#8b5cf6]" /></span>
          <p className="mt-4 text-[15px] font-bold text-[#1c1917]" style={heading}>{readOnly ? 'Ingen budsjetter er delt ennå' : selskap === 'tech' ? 'Ingen Tech-budsjetter ennå' : 'Ingen budsjetter ennå'}</p>
          <p className="mx-auto mt-1 max-w-[380px] text-[13px] leading-relaxed text-[#8f8a82]">
            {readOnly ? 'Når et budsjett deles med investorrommet, dukker det opp her.' : selskap === 'tech' ? 'Lag plattformbudsjettet — prisene hentes fra prislisten, lisensvolumet fra et Digihome AS-budsjett.' : 'Lag ditt første budsjett — velg periode, så henter vi porteføljefakta fra leieforholdene for deg.'}
          </p>
          {!readOnly && !visNy && (
            <button onClick={() => setVisNy(true)} className={`${KNAPP_PRIMAER} mx-auto mt-5`}><Plus className="h-3.5 w-3.5" /> Nytt budsjett</button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {planerVist.map((p) => {
            const marginPct = p.inntekter > 0 ? Math.round(((p.resultat || 0) / p.inntekter) * 100) : null;
            return (
              <button key={p.id} onClick={() => aapne(p.id)} data-testid={`budsjett-rad-${p.id}`}
                className="group relative overflow-hidden rounded-[18px] bg-white p-5 text-left shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(28,25,23,0.10),inset_0_0_0_1px_rgba(0,0,0,0.07)] active:scale-[0.995]">
                <div className="flex items-center gap-2">
                  {p.selskap === 'tech' ? <SelskapMerke id="tech" storrelse={36} /> : (
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] ${p.type === 'modell' ? 'bg-[#1c1917] text-white' : 'bg-[#f0efec] text-[#78716c]'}`}>
                      {p.type === 'modell' ? <TrendingUp className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                    </span>
                  )}
                  <span className="rounded-full bg-[#f0efec] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#78716c]">{horisontLabel(p.antallMnd)}</span>
                  {p.status === 'vedtatt' && (
                    <span className="rounded-full bg-[#e7f4ee] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#0a7d55]">Vedtatt</span>
                  )}
                  {!readOnly && p.investorSynlig && (
                    <span className="flex items-center gap-1 rounded-full bg-[#f0ebfa] px-2 py-[3px] text-[10.5px] font-bold text-[#6d28d9]" title="Synlig i investorrommet"><Eye className="h-3 w-3" /> Investorrom</span>
                  )}
                  {p.naa && (
                    <span className="rounded-full bg-[#fff4d6] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#8a6a00]" title="Perioden dekker inneværende måned">Løpende</span>
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    {!readOnly && (
                      <span role="button" tabIndex={0} onClick={(e) => dupliser(e, p.id)} onKeyDown={(e) => { if (e.key === 'Enter') dupliser(e, p.id); }} title="Dupliser som nytt utkast" data-testid={`budsjett-dupliser-${p.id}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#d6d1c9] opacity-0 transition-all hover:bg-black/[0.05] hover:text-[#1c1917] group-hover:opacity-100 focus:opacity-100">
                        {dupliserer === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#d6d1c9] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#8f8a82]" />
                  </span>
                </div>
                <p className="mt-3 truncate text-[16.5px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{p.navn}</p>
                <p className="mt-0.5 text-[12.5px] text-[#a6a19a]">{p.selskap === 'tech' ? 'Digihome Tech AS · ' : p.type === 'modell' ? '' : 'Enkelt budsjett (eldre) · '}{periodeLabel(p.startYm, p.antallMnd)}{p.selskap === 'tech' && p.tech?.andelForvaltningPct != null ? ` · ${p.tech.andelForvaltningPct} % fra Digihome AS` : ''}</p>
                <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-black/[0.05] pt-3">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#b5b0a8]">Inntekter</p>
                    <p className="mt-0.5 truncate text-[15.5px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{kr(p.inntekter)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#b5b0a8]">{p.selskap === 'tech' ? 'ARR ved slutt' : p.type === 'modell' ? 'Resultat' : 'Honorar'}</p>
                    {p.selskap === 'tech' && p.tech ? (
                      <p className="mt-0.5 truncate text-[15.5px] font-bold tracking-[-0.01em] text-[#6d28d9]" style={heading}>{kr(p.tech.arrExit)}<span className={`ml-1.5 text-[11px] font-semibold ${(p.resultat || 0) >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{(p.resultat || 0) >= 0 ? '+' : '−'}{kr(Math.abs(p.resultat || 0)).replace(' kr', '')}</span></p>
                    ) : null}
                    {p.selskap === 'tech' && p.tech ? null : p.type === 'modell' ? (
                      <p className={`mt-0.5 truncate text-[15.5px] font-bold tracking-[-0.01em] ${(p.resultat || 0) >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`} style={heading}>
                        {kr(p.resultat)}
                        {marginPct !== null && <span className="ml-1.5 text-[11px] font-semibold text-[#a6a19a]">{marginPct} %</span>}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[12.5px] text-[#a6a19a]">i perioden</p>
                    )}
                  </div>
                </div>
                {p.updatedAt && (
                  <p className="mt-2.5 text-[11px] text-[#c2beb8]">Sist endret {datoKort(p.updatedAt)}{p.updatedBy ? ` · ${p.updatedBy}` : ''}</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
