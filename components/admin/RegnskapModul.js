'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, RefreshCw, TrendingUp, TrendingDown, Wallet, Building2,
  AlertCircle, CheckCircle2, Loader2, Scale, BarChart3, Plus, Trash2, KeyRound, Settings2, X,
} from 'lucide-react';

const kr = (n) => `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))} kr`;
const MND = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const naaAar = new Date().getFullYear();

function Kort({ ikon: Ikon, etikett, verdi, farge = '#151310', under }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-black/45">
        <Ikon className="h-3.5 w-3.5" strokeWidth={2} /> {etikett}
      </div>
      <div className="mt-2 text-[26px] font-semibold tabular-nums tracking-[-0.02em]" style={{ color: farge }}>{verdi}</div>
      {under ? <div className="mt-1 text-[12.5px] text-black/45">{under}</div> : null}
    </div>
  );
}

function KontoListe({ tittel, ikon: Ikon, rader = [], tom }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold"><Ikon className="h-4 w-4 text-black/40" /> {tittel}</h3>
      {rader.length === 0 ? (
        <p className="mt-4 text-[13px] text-black/40">{tom}</p>
      ) : (
        <div className="mt-3 divide-y divide-black/[0.05]">
          {rader.map((r) => (
            <div key={r.kontonr} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] text-black/75">{r.navn}</div>
                <div className="text-[11px] text-black/35">Konto {r.kontonr}</div>
              </div>
              <div className="shrink-0 text-[13.5px] font-medium tabular-nums text-black/80">{kr(r.belop)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegnskapModul({ apiKey, presentasjon = false }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [selskaper, setSelskaper] = useState([]);
  const [konfigurert, setKonfigurert] = useState(true);
  const [miljo, setMiljo] = useState('demo');
  const [valgtId, setValgtId] = useState('');
  const [lasterSelskaper, setLasterSelskaper] = useState(true);
  const [visInnstillinger, setVisInnstillinger] = useState(false);

  const [status, setStatus] = useState(null);
  const [statusLaster, setStatusLaster] = useState(false);
  const [fane, setFane] = useState('resultat');
  const [ar, setAar] = useState(naaAar);
  const [res, setRes] = useState(null);
  const [resLaster, setResLaster] = useState(false);
  const [resFeil, setResFeil] = useState('');
  const [balDato, setBalDato] = useState(`${naaAar}-12-31`);
  const [bal, setBal] = useState(null);
  const [balLaster, setBalLaster] = useState(false);
  const [balFeil, setBalFeil] = useState('');

  // Skjema for nytt selskap
  const [nyttNavn, setNyttNavn] = useState('');
  const [nyKey, setNyKey] = useState('');
  const [nyEnv, setNyEnv] = useState('demo');
  const [lagrer, setLagrer] = useState(false);
  // Redigering av eksisterende selskap
  const [redigerId, setRedigerId] = useState('');
  const [redNavn, setRedNavn] = useState('');
  const [redKey, setRedKey] = useState('');
  const [redEnv, setRedEnv] = useState('demo');
  const [redFeil, setRedFeil] = useState('');
  const [redLagrer, setRedLagrer] = useState(false);
  const [skjemaFeil, setSkjemaFeil] = useState('');

  const hentSelskaper = useCallback(async () => {
    setLasterSelskaper(true);
    try {
      const r = await fetch(`/api/admin/regnskap/selskaper?${q}`, { cache: 'no-store' });
      const d = await r.json();
      setKonfigurert(d.konfigurert !== false);
      setMiljo(d.env || 'demo');
      const liste = d.selskaper || [];
      setSelskaper(liste);
      setValgtId((prev) => (prev && liste.some((s) => s.id === prev) ? prev : (liste[0]?.id || '')));
    } catch (e) { setSelskaper([]); }
    setLasterSelskaper(false);
  }, [q]);

  const hentStatus = useCallback(async (id) => {
    if (!id) { setStatus(null); return; }
    setStatusLaster(true);
    try {
      const r = await fetch(`/api/admin/regnskap/status?${q}&selskap=${id}`, { cache: 'no-store' });
      setStatus(await r.json());
    } catch (e) { setStatus({ ok: false, feil: 'Tilkobling feilet' }); }
    setStatusLaster(false);
  }, [q]);

  const hentResultat = useCallback(async (id, aar) => {
    if (!id) return;
    setResLaster(true); setResFeil('');
    try {
      const r = await fetch(`/api/admin/regnskap/resultat?${q}&selskap=${id}&ar=${aar}`, { cache: 'no-store' });
      const d = await r.json();
      if (!d.ok) { setResFeil(d.feil || 'Kunne ikke hente resultat'); setRes(null); } else setRes(d);
    } catch (e) { setResFeil('Kunne ikke hente resultat'); setRes(null); }
    setResLaster(false);
  }, [q]);

  const hentBalanse = useCallback(async (id, dato) => {
    if (!id) return;
    setBalLaster(true); setBalFeil('');
    try {
      const r = await fetch(`/api/admin/regnskap/saldobalanse?${q}&selskap=${id}&dato=${dato}`, { cache: 'no-store' });
      const d = await r.json();
      if (!d.ok) { setBalFeil(d.feil || 'Kunne ikke hente balanse'); setBal(null); } else setBal(d);
    } catch (e) { setBalFeil('Kunne ikke hente balanse'); setBal(null); }
    setBalLaster(false);
  }, [q]);

  useEffect(() => { hentSelskaper(); }, [hentSelskaper]);
  useEffect(() => { if (valgtId) { hentStatus(valgtId); setRes(null); setBal(null); } }, [valgtId, hentStatus]);
  useEffect(() => { if (valgtId && status?.ok) hentResultat(valgtId, ar); }, [valgtId, status, ar, hentResultat]);
  useEffect(() => { if (valgtId && status?.ok && fane === 'balanse' && !bal) hentBalanse(valgtId, balDato); }, [valgtId, status, fane]); // eslint-disable-line

  const leggTilSelskap = async () => {
    if (!nyttNavn.trim() || !nyKey.trim()) { setSkjemaFeil('Fyll inn navn og klientnøkkel'); return; }
    setLagrer(true); setSkjemaFeil('');
    try {
      const r = await fetch(`/api/admin/regnskap/selskaper?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navn: nyttNavn.trim(), clientKey: nyKey.trim(), env: nyEnv }),
      });
      const d = await r.json();
      if (!d.ok) { setSkjemaFeil(d.feil || 'Kunne ikke legge til'); }
      else { setNyttNavn(''); setNyKey(''); await hentSelskaper(); setValgtId(d.selskap.id); }
    } catch (e) { setSkjemaFeil('Kunne ikke legge til'); }
    setLagrer(false);
  };

  const slettSelskap = async (id, navn) => {
    if (!window.confirm(`Fjerne tilkoblingen til «${navn}»? Regnskapstallene hentes ikke lenger for dette selskapet.`)) return;
    await fetch(`/api/admin/regnskap/selskaper?${q}&id=${id}`, { method: 'DELETE' });
    await hentSelskaper();
  };

  const startRediger = (s) => { setRedigerId(s.id); setRedNavn(s.navn); setRedKey(''); setRedEnv(s.env || 'demo'); setRedFeil(''); };
  const lagreRediger = async () => {
    setRedLagrer(true); setRedFeil('');
    try {
      const body = { id: redigerId, navn: redNavn.trim(), env: redEnv };
      if (redKey.trim()) body.clientKey = redKey.trim();
      const r = await fetch(`/api/admin/regnskap/selskaper?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!d.ok) { setRedFeil(d.feil || 'Kunne ikke lagre'); }
      else { setRedigerId(''); await hentSelskaper(); if (redigerId === valgtId) hentStatus(valgtId); }
    } catch (e) { setRedFeil('Kunne ikke lagre'); }
    setRedLagrer(false);
  };

  const maksMnd = res ? Math.max(1, ...res.maaneder.map((m) => Math.max(m.inntekt, m.kostnad))) : 1;
  const valgt = selskaper.find((s) => s.id === valgtId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#151310] text-white"><Receipt className="h-[18px] w-[18px]" /></div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Regnskap</h1>
            <p className="text-[13px] text-black/50">Faktiske tall fra PowerOffice Go — ett regnskap per selskap</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">{miljo === 'demo' ? 'Demo' : 'Produksjon'}</span>
          {!presentasjon && (
            <button onClick={() => setVisInnstillinger((v) => !v)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium ${visInnstillinger ? 'border-black/20 bg-black/[0.04] text-black' : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.03]'}`}>
              <Settings2 className="h-3.5 w-3.5" /> Tilkoblinger
            </button>
          )}
        </div>
      </div>

      {/* Selskapsbytter */}
      {lasterSelskaper ? (
        <div className="flex items-center gap-2 text-[13px] text-black/50"><Loader2 className="h-4 w-4 animate-spin" /> Laster selskaper …</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {selskaper.map((s) => (
            <button key={s.id} onClick={() => setValgtId(s.id)} className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[13.5px] font-medium transition ${valgtId === s.id ? 'border-[#151310] bg-[#151310] text-white' : 'border-black/10 bg-white text-black/70 hover:border-black/20'}`}>
              <Building2 className="h-3.5 w-3.5" /> {s.navn}
            </button>
          ))}
          <button onClick={() => setVisInnstillinger(true)} className="flex items-center gap-1.5 rounded-xl border border-dashed border-black/20 px-4 py-2 text-[13.5px] font-medium text-black/55 hover:border-black/35 hover:text-black/75" style={{ display: presentasjon ? 'none' : undefined }}>
            <Plus className="h-3.5 w-3.5" /> Legg til selskap
          </button>
        </div>
      )}

      {/* Innstillinger: legg til / behandle tilkoblinger */}
      {!presentasjon && visInnstillinger && (
        <div className="rounded-2xl border border-black/[0.08] bg-[#faf9f7] p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold"><KeyRound className="h-4 w-4 text-black/45" /> PowerOffice-tilkoblinger</h3>
            <button onClick={() => setVisInnstillinger(false)} className="rounded-lg p-1 text-black/40 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-[12.5px] text-black/50">App- og abonnementsnøkkel er delt for integrasjonen. Hvert selskap aktiverer utvidelsen i sin PowerOffice-klient og får sin egen <b>klientnøkkel</b>.</p>

          {!konfigurert && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800"><AlertCircle className="h-4 w-4" /> App-/abonnementsnøkkel mangler i miljøet — kontakt utvikler.</div>
          )}

          {/* Eksisterende selskaper */}
          <div className="mt-4 space-y-2">
            {selskaper.map((s) => (
              <div key={s.id} className="rounded-xl border border-black/[0.06] bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium">{s.navn}</div>
                    <div className="text-[12px] text-black/45">Klientnøkkel {s.klientNokkelMaske} · {s.env}{s.klientNavn ? ` · ${s.klientNavn}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => (redigerId === s.id ? setRedigerId('') : startRediger(s))} className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-black/70 hover:bg-black/[0.03]"><Settings2 className="h-3.5 w-3.5" /> Endre</button>
                    <button onClick={() => slettSelskap(s.id, s.navn)} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Fjern</button>
                  </div>
                </div>
                {redigerId === s.id && (
                  <div className="mt-3 border-t border-black/[0.06] pt-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
                      <input value={redNavn} onChange={(e) => setRedNavn(e.target.value)} placeholder="Navn" className="rounded-lg border border-black/10 px-3 py-2 text-[13.5px]" />
                      <input value={redKey} onChange={(e) => setRedKey(e.target.value)} placeholder="Ny klientnøkkel (la stå tom for å beholde)" className="rounded-lg border border-black/10 px-3 py-2 text-[13.5px] font-mono" />
                      <select value={redEnv} onChange={(e) => setRedEnv(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-[13.5px]">
                        <option value="demo">Demo</option>
                        <option value="production">Produksjon</option>
                      </select>
                    </div>
                    {redFeil ? <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-red-600"><AlertCircle className="h-3.5 w-3.5" /> {redFeil}</div> : null}
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={lagreRediger} disabled={redLagrer} className="flex items-center gap-1.5 rounded-lg bg-[#151310] px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50">{redLagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Test & lagre</button>
                      <button onClick={() => setRedigerId('')} className="rounded-lg border border-black/10 px-3.5 py-1.5 text-[12.5px] font-medium text-black/60 hover:bg-black/[0.03]">Avbryt</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {selskaper.length === 0 && <p className="text-[13px] text-black/40">Ingen selskaper lagt inn ennå.</p>}
          </div>

          {/* Nytt selskap */}
          <div className="mt-4 rounded-xl border border-black/[0.08] bg-white p-4">
            <div className="text-[13.5px] font-semibold">Legg til selskap</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
              <input value={nyttNavn} onChange={(e) => setNyttNavn(e.target.value)} placeholder="Navn, f.eks. DigiHome Tech AS" className="rounded-lg border border-black/10 px-3 py-2 text-[13.5px]" />
              <input value={nyKey} onChange={(e) => setNyKey(e.target.value)} placeholder="Klientnøkkel (fra PowerOffice-utvidelsen)" className="rounded-lg border border-black/10 px-3 py-2 text-[13.5px] font-mono" />
              <select value={nyEnv} onChange={(e) => setNyEnv(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-[13.5px]">
                <option value="demo">Demo</option>
                <option value="production">Produksjon</option>
              </select>
            </div>
            {skjemaFeil ? <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-red-600"><AlertCircle className="h-3.5 w-3.5" /> {skjemaFeil}</div> : null}
            <button onClick={leggTilSelskap} disabled={lagrer} className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#151310] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
              {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Test tilkobling & legg til
            </button>
          </div>
        </div>
      )}

      {selskaper.length === 0 && !lasterSelskaper && !visInnstillinger ? (
        <div className="mx-auto max-w-2xl rounded-2xl border border-black/[0.06] bg-white p-8 text-center">
          <Receipt className="mx-auto h-8 w-8 text-black/30" />
          <h2 className="mt-3 text-[19px] font-semibold">Ingen selskaper koblet til ennå</h2>
          <p className="mt-2 text-[14px] text-black/55">{presentasjon ? 'Regnskapet vises her når selskapene er koblet til i driftsportalen.' : 'Legg til DigiHome AS og DigiHome Tech AS med hver sin klientnøkkel, så henter vi regnskapet automatisk.'}</p>
          {!presentasjon && (
            <button onClick={() => setVisInnstillinger(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#151310] px-4 py-2 text-[13.5px] font-medium text-white"><Plus className="h-4 w-4" /> Legg til selskap</button>
          )}
        </div>
      ) : null}

      {/* Tilkoblingsstatus for valgt selskap */}
      {valgt && (
        <div className="rounded-2xl border border-black/[0.06] bg-white px-5 py-3.5">
          {statusLaster ? (
            <div className="flex items-center gap-2 text-[13px] text-black/50"><Loader2 className="h-4 w-4 animate-spin" /> Kobler til {valgt.navn} …</div>
          ) : status?.ok ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Tilkoblet</span>
              <span className="text-black/60"><span className="text-black/40">PowerOffice-klient:</span> {status.klient?.klientNavn}</span>
              <span className="text-black/60"><span className="text-black/40">Tilganger:</span> {status.klient?.gyldigePrivilegier} · lesetilgang hovedbok {status.klient?.lesetilgangHovedbok ? 'ja' : 'nei'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[13px] text-red-600"><AlertCircle className="h-4 w-4" /> {status?.feil || 'Tilkobling feilet'}</div>
          )}
        </div>
      )}

      {/* Faner + data (kun når selskap valgt og tilkoblet) */}
      {valgt && status?.ok && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl border border-black/[0.06] bg-black/[0.02] p-1 w-fit">
              {[{ k: 'resultat', l: 'Resultat', icon: BarChart3 }, { k: 'balanse', l: 'Balanse', icon: Scale }].map((f) => (
                <button key={f.k} onClick={() => setFane(f.k)} className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13.5px] font-medium transition ${fane === f.k ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black/70'}`}>
                  <f.icon className="h-3.5 w-3.5" /> {f.l}
                </button>
              ))}
            </div>
            <button onClick={() => { hentStatus(valgtId); hentResultat(valgtId, ar); if (fane === 'balanse') hentBalanse(valgtId, balDato); }} className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[13px] font-medium text-black/70 hover:bg-black/[0.03]">
              <RefreshCw className={`h-3.5 w-3.5 ${resLaster || balLaster ? 'animate-spin' : ''}`} /> Oppdater
            </button>
          </div>

          {/* RESULTAT */}
          {fane === 'resultat' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-black/45">Regnskapsår</span>
                <select value={ar} onChange={(e) => setAar(Number(e.target.value))} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[13.5px] font-medium">
                  {[naaAar + 1, naaAar, naaAar - 1, naaAar - 2, naaAar - 3].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                {res ? <span className="text-[12.5px] text-black/40">{res.antallTransaksjoner} posteringer · {valgt.navn}</span> : null}
              </div>

              {resLaster ? (
                <div className="flex items-center gap-2 py-10 text-[14px] text-black/50"><Loader2 className="h-5 w-5 animate-spin" /> Henter resultat …</div>
              ) : resFeil ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700"><AlertCircle className="h-4 w-4" /> {resFeil}</div>
              ) : res ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Kort ikon={TrendingUp} etikett="Inntekter" verdi={kr(res.sum.inntekt)} under={`${ar}`} />
                    <Kort ikon={TrendingDown} etikett="Kostnader" verdi={kr(res.sum.kostnad)} under={`${ar}`} />
                    <Kort ikon={Wallet} etikett="Resultat" verdi={kr(res.sum.resultat)} farge={res.sum.resultat >= 0 ? '#047857' : '#b3261e'} under={res.sum.resultat >= 0 ? 'Overskudd' : 'Underskudd'} />
                  </div>

                  <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold">Måned for måned</h3>
                      <div className="flex items-center gap-4 text-[12px] text-black/50">
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[#7a3fa8]" /> Inntekt</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-black/25" /> Kostnad</span>
                      </div>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-1.5" style={{ height: 150 }}>
                      {res.maaneder.map((m) => (
                        <div key={m.mnd} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex w-full items-end justify-center gap-[3px]" style={{ height: 120 }}>
                            <span className="w-1/2 max-w-[10px] rounded-t bg-[#7a3fa8]" style={{ height: `${(m.inntekt / maksMnd) * 100}%` }} title={`Inntekt ${kr(m.inntekt)}`} />
                            <span className="w-1/2 max-w-[10px] rounded-t bg-black/25" style={{ height: `${(m.kostnad / maksMnd) * 100}%` }} title={`Kostnad ${kr(m.kostnad)}`} />
                          </div>
                          <span className="text-[10px] text-black/40">{MND[m.mnd - 1]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[520px] text-[13px]">
                        <thead>
                          <tr className="border-b border-black/[0.08] text-left text-[11px] uppercase tracking-[0.05em] text-black/40">
                            <th className="py-2 pr-3 font-semibold">Måned</th>
                            <th className="py-2 px-3 text-right font-semibold">Inntekt</th>
                            <th className="py-2 px-3 text-right font-semibold">Kostnad</th>
                            <th className="py-2 pl-3 text-right font-semibold">Resultat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {res.maaneder.filter((m) => m.inntekt || m.kostnad).map((m) => (
                            <tr key={m.mnd} className="border-b border-black/[0.04]">
                              <td className="py-2 pr-3 text-black/70">{MND[m.mnd - 1]} {ar}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{kr(m.inntekt)}</td>
                              <td className="py-2 px-3 text-right tabular-nums text-black/60">{kr(m.kostnad)}</td>
                              <td className={`py-2 pl-3 text-right font-medium tabular-nums ${m.resultat >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{kr(m.resultat)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-black/10 font-semibold">
                            <td className="py-2.5 pr-3">Sum {ar}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums">{kr(res.sum.inntekt)}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums text-black/70">{kr(res.sum.kostnad)}</td>
                            <td className={`py-2.5 pl-3 text-right tabular-nums ${res.sum.resultat >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{kr(res.sum.resultat)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <KontoListe tittel="Inntekter — konto for konto" ikon={TrendingUp} rader={res.inntektKontoer} tom="Ingen inntektsposteringer i perioden" />
                    <KontoListe tittel="Kostnader — konto for konto" ikon={TrendingDown} rader={res.kostnadKontoer} tom="Ingen kostnadsposteringer i perioden" />
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* BALANSE */}
          {fane === 'balanse' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-black/45">Dato</span>
                <input type="date" value={balDato} onChange={(e) => setBalDato(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[13.5px]" />
                <button onClick={() => hentBalanse(valgtId, balDato)} className="rounded-lg bg-[#151310] px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90">Hent</button>
              </div>
              {balLaster ? (
                <div className="flex items-center gap-2 py-10 text-[14px] text-black/50"><Loader2 className="h-5 w-5 animate-spin" /> Henter saldobalanse …</div>
              ) : balFeil ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700"><AlertCircle className="h-4 w-4" /> {balFeil}</div>
              ) : bal ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Kort ikon={Building2} etikett="Eiendeler" verdi={kr(bal.grupper.eiendeler.sum)} />
                    <Kort ikon={Scale} etikett="Egenkapital" verdi={kr(bal.grupper.egenkapital.sum)} />
                    <Kort ikon={Wallet} etikett="Gjeld" verdi={kr(bal.grupper.gjeld.sum)} />
                  </div>
                  <div className="grid gap-5 lg:grid-cols-3">
                    <KontoListe tittel="Eiendeler" ikon={Building2} rader={bal.grupper.eiendeler.kontoer.map((k) => ({ ...k, belop: k.saldo }))} tom="—" />
                    <KontoListe tittel="Egenkapital" ikon={Scale} rader={bal.grupper.egenkapital.kontoer.map((k) => ({ ...k, belop: k.saldo }))} tom="—" />
                    <KontoListe tittel="Gjeld" ikon={Wallet} rader={bal.grupper.gjeld.kontoer.map((k) => ({ ...k, belop: k.saldo }))} tom="—" />
                  </div>
                  <p className="text-[12px] text-black/40">Saldobalanse per {bal.dato} · {valgt.navn}. Egenkapital og gjeld vises som positive tall.</p>
                </>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
