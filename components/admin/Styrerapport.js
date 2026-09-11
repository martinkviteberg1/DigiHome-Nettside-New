'use client';

// ─────────────────────────────────────────────────────────────────────────────
// STYRERAPPORT (admin) — MØTE-ARKIV + REDIGERING.
// To visninger i én kontroller:
//  · ARKIV: verdensklasse liste over alle styrerapporter (én per møte) — opprett,
//    dupliser forrige, publiser/avpubliser, sett «gjeldende», del, slett.
//  · RAPPORT: den moderne visningen (StyrerapportVisning) med redigering + deling.
// Datamodellen er nå multi-rapport; delingslenker knyttes til én bestemt rapport.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, Pencil, Check, Printer, Maximize2, X, Receipt, Share2,
  Plus, Copy, Link2, Eye, Ban, RotateCcw, Trash2, ExternalLink, ArrowLeft,
  Star, CopyPlus, Globe, EyeOff, CalendarDays, FileText, ChevronRight, MoreHorizontal,
  Wallet, TrendingUp,
} from 'lucide-react';
import StyrerapportVisning, { blokkTilRaw, rawTilBlokk, nyBlokkRaw, migrerBlokk } from '@/components/admin/StyrerapportVisning';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const C = { ink: '#15130F', ink2: '#3A3733', ink3: '#6F6A60', line: '#E4DFD6', line2: '#D6CFC4', canvas: '#F3F1EC', paper2: '#EFEBE3', accent: '#7C3AED', pos: '#1B7A46', amber: '#9a5b00' };
const H = { fontFamily: 'var(--font-heading), sans-serif' };

const MNDK = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymKort = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return (m >= 1 && m <= 12) ? `${MNDK[m - 1]}. ${String(y).slice(2)}` : (ym || ''); };
const ymPlussN = (ym, i) => { const [y, m] = String(ym || '').split('-').map(Number); if (!y || !m) return ym; const t = y * 12 + (m - 1) + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const budsjettPeriode = (startYm, antallMnd) => { if (!startYm) return `${antallMnd || 0} mnd`; const slutt = ymPlussN(startYm, (antallMnd || 1) - 1); return `${ymKort(startYm)}–${ymKort(slutt)} · ${antallMnd} mnd`; };
const krKort0 = (n) => { const v = Number(n) || 0; const a = Math.abs(v); if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')} mill kr`; if (a >= 1e4) return `${Math.round(v / 1000)}k kr`; return `${Math.round(v)} kr`; };

export default function Styrerapport({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey || '')}`;

  // ── Arkiv ──
  const [rapporter, setRapporter] = useState([]);
  const [gjeldendeId, setGjeldendeId] = useState(null);
  const [listLaster, setListLaster] = useState(true);
  const [listFeil, setListFeil] = useState(null);

  // ── Valgt rapport (redigering/visning) ──
  const [valgtId, setValgtId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feil, setFeil] = useState(null);

  const [rediger, setRediger] = useState(false);
  const [presentasjon, setPresentasjon] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagretAt, setLagretAt] = useState(null);
  const [metaJobb, setMetaJobb] = useState(false);

  const [tittel, setTittel] = useState('Styrerapport');
  const [motedato, setMotedato] = useState('');
  const [periodeLabel, setPeriodeLabel] = useState('');
  const [sammendrag, setSammendrag] = useState('');
  const [askRaw, setAskRaw] = useState('');
  const [blokker, setBlokker] = useState([]);
  const [status, setStatus] = useState('utkast');
  const [erGjeldende, setErGjeldende] = useState(false);

  // Regnskap (PowerOffice, på forespørsel)
  const [regnAar, setRegnAar] = useState(new Date().getFullYear());
  const [regn, setRegn] = useState(null);
  const [regnLaster, setRegnLaster] = useState(false);
  const [regnFeil, setRegnFeil] = useState(null);

  // Delingslenker + Ny rapport-dialog
  const [delAapen, setDelAapen] = useState(false);
  const [lenker, setLenker] = useState([]);
  const [lenkerLaster, setLenkerLaster] = useState(false);
  const [oppretter, setOppretter] = useState(false);
  const [kopiert, setKopiert] = useState(null);
  const [nyLabel, setNyLabel] = useState('Styremøte');
  const [nyUtloper, setNyUtloper] = useState(30);
  const [nyRegnskap, setNyRegnskap] = useState(true);
  const [nyRegnskapAar, setNyRegnskapAar] = useState(new Date().getFullYear());

  const [nyAapen, setNyAapen] = useState(false);
  const [nyTittel, setNyTittel] = useState('');
  const [nyMotedato, setNyMotedato] = useState('');
  const [nyPeriode, setNyPeriode] = useState('');
  const [nyFraId, setNyFraId] = useState('');
  const [nyJobb, setNyJobb] = useState(false);

  // Budsjett-velger: knytt et budsjett fra budsjettmodulen til rapporten (fryst øyeblikksbilde)
  const [budsjettAapen, setBudsjettAapen] = useState(false);
  const [budsjettAnker, setBudsjettAnker] = useState('slutt');
  const [planListe, setPlanListe] = useState(null);
  const [planListeLaster, setPlanListeLaster] = useState(false);
  const [budsjettJobb, setBudsjettJobb] = useState('');

  const iAar = new Date().getFullYear();
  const aarValg = [iAar, iAar - 1, iAar - 2];

  // ── Datahenting ──
  const hentListe = useCallback(async () => {
    setListLaster(true); setListFeil(null);
    try {
      const r = await fetch(`/api/admin/styrerapport/rapporter?${q}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) setListFeil(j.error || 'Kunne ikke laste');
      else { setRapporter(j.rapporter || []); setGjeldendeId(j.gjeldendeId || null); }
    } catch (e) { setListFeil('Kunne ikke laste styrerapporter'); }
    finally { setListLaster(false); }
  }, [q]);

  useEffect(() => { if (apiKey) hentListe(); }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const settRedigerbart = useCallback((r) => {
    setTittel(r?.tittel || 'Styrerapport');
    setMotedato(r?.motedato || '');
    setPeriodeLabel(r?.periodeLabel || '');
    setSammendrag(r?.sammendrag || '');
    setAskRaw((r?.ask || []).join('\n'));
    setStatus(r?.status || 'utkast');
    setErGjeldende(!!r?.gjeldende);
    setBlokker((r?.blokker || []).map((b) => migrerBlokk({ ...b, tittel: b.tittel || '', raw: blokkTilRaw(b) })));
  }, []);

  const load = useCallback(async (id) => {
    setLoading(true); setFeil(null); setRegn(null); setRegnFeil(null);
    try {
      const r = await fetch(`/api/admin/styrerapport?${q}&id=${encodeURIComponent(id || '')}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setFeil(j.error || 'Kunne ikke laste'); setData(null); }
      else { setData(j); settRedigerbart(j.rapport); if (j.rapport?.id) setValgtId(j.rapport.id); }
    } catch (e) { setFeil('Kunne ikke laste rapporten'); }
    finally { setLoading(false); }
  }, [q, settRedigerbart]);

  const apneRapport = (id) => { setRediger(false); setLagretAt(null); setValgtId(id); load(id); };
  const tilArkiv = () => { setPresentasjon(false); setRediger(false); setValgtId(null); setData(null); hentListe(); };

  const lagre = useCallback(async () => {
    if (!valgtId) return;
    setLagrer(true);
    try {
      const body = {
        tittel, motedato, periodeLabel, sammendrag,
        ask: askRaw.split('\n').map((s) => s.trim()).filter(Boolean),
        blokker: blokker.map(rawTilBlokk),
      };
      const r = await fetch(`/api/admin/styrerapport?${q}&id=${encodeURIComponent(valgtId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.ok) { setLagretAt(new Date()); setData((d) => (d ? { ...d, rapport: j.rapport } : d)); }
    } finally { setLagrer(false); }
  }, [q, valgtId, tittel, motedato, periodeLabel, sammendrag, askRaw, blokker]);

  const ferdigRediger = useCallback(async () => { await lagre(); setRediger(false); hentListe(); }, [lagre, hentListe]);

  const oppdaterMeta = useCallback(async (id, patch) => {
    setMetaJobb(true);
    try {
      const r = await fetch(`/api/admin/styrerapport/rapporter/${id}?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const j = await r.json();
      if (j.ok && j.rapport) {
        if (id === valgtId) { setStatus(j.rapport.status); setErGjeldende(!!j.rapport.gjeldende); }
        await hentListe();
      }
      return j;
    } finally { setMetaJobb(false); }
  }, [q, valgtId, hentListe]);

  const slettRapport = useCallback(async (id) => {
    if (!window.confirm('Slette denne styrerapporten? Dette kan ikke angres.')) return;
    const r = await fetch(`/api/admin/styrerapport/rapporter/${id}?${q}`, { method: 'DELETE' });
    const j = await r.json();
    if (j.ok) { if (id === valgtId) tilArkiv(); else hentListe(); }
  }, [q, valgtId]); // eslint-disable-line react-hooks/exhaustive-deps

  const opprettRapport = useCallback(async () => {
    setNyJobb(true);
    try {
      const r = await fetch(`/api/admin/styrerapport/rapporter?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tittel: nyTittel, motedato: nyMotedato, periodeLabel: nyPeriode, fraId: nyFraId || undefined }) });
      const j = await r.json();
      if (j.ok && j.rapport) { setNyAapen(false); setNyTittel(''); setNyMotedato(''); setNyPeriode(''); setNyFraId(''); await hentListe(); apneRapport(j.rapport.id); }
    } finally { setNyJobb(false); }
  }, [q, nyTittel, nyMotedato, nyPeriode, nyFraId, hentListe]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastRegnskap = useCallback(async (aar) => {
    setRegnLaster(true); setRegnFeil(null);
    try {
      const r = await fetch(`/api/admin/regnskap/konsern?${q}&ar=${aar}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setRegnFeil(j.feil || 'Regnskap utilgjengelig'); setRegn(null); } else setRegn(j);
    } catch (e) { setRegnFeil('Regnskap utilgjengelig'); setRegn(null); }
    finally { setRegnLaster(false); }
  }, [q]);

  // ── Budsjett fra budsjettmodulen → fryst øyeblikksbilde i rapporten ──
  const hentPlanListe = useCallback(async () => {
    setPlanListeLaster(true);
    try { const r = await fetch(`/api/admin/budsjett/planer?${q}`, { cache: 'no-store' }); const j = await r.json(); setPlanListe(Array.isArray(j.planer) ? j.planer : []); }
    catch (e) { setPlanListe([]); }
    finally { setPlanListeLaster(false); }
  }, [q]);
  const snapshotFelter = (plan) => ({
    planId: plan.id || '', planNavn: plan.navn || '',
    selskap: plan.selskap === 'tech' ? 'tech' : 'digihome',
    planType: plan.type === 'tech' ? 'tech' : 'modell',
    startYm: plan.startYm || '', antallMnd: plan.antallMnd || 12,
    fakta: plan.fakta || {}, drivere: plan.drivere || {}, tech: plan.tech || null,
  });
  const velgBudsjett = useCallback(async (planId) => {
    setBudsjettJobb(planId);
    try {
      const r = await fetch(`/api/admin/budsjett/plan?${q}&id=${encodeURIComponent(planId)}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.ok && j.plan) {
        const ny = {
          id: `b_${Math.random().toString(36).slice(2, 10)}`, type: 'budsjett', raw: '',
          tittel: j.plan.navn || 'Budsjett', kicker: j.plan.selskap === 'tech' ? 'Plattformbudsjett' : 'Vekstbudsjett',
          etter: budsjettAnker || 'slutt', vis: { graf: true, aar: true, unit: true },
          oppdatertAt: new Date().toISOString(), ...snapshotFelter(j.plan),
        };
        setBlokker((bs) => [...bs, ny]);
        setBudsjettAapen(false); setRediger(true);
        setTimeout(() => { const el = document.getElementById(`sr-budsjett-${ny.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 180);
      }
    } finally { setBudsjettJobb(''); }
  }, [q, budsjettAnker]);

  const editApi = {
    apiKey,
    setTittel, setMotedato, setPeriodeLabel, setSammendrag, setAskRaw,
    oppdaterBlokk: (id, patch) => setBlokker((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    flyttBlokk: (id, retning) => setBlokker((bs) => { const i = bs.findIndex((b) => b.id === id); if (i < 0) return bs; const j = i + retning; if (j < 0 || j >= bs.length) return bs; const k = [...bs]; const [x] = k.splice(i, 1); k.splice(j, 0, x); return k; }),
    slettBlokk: (id) => setBlokker((bs) => bs.filter((b) => b.id !== id)),
    leggTilBlokk: (type, extra) => {
      const ny = nyBlokkRaw(type, extra);
      setBlokker((bs) => [...bs, ny]);
      if (type === 'rik') setTimeout(() => { const el = document.getElementById(`sr-rik-${ny.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 140);
    },
    leggTilBudsjett: (anker) => { setBudsjettAnker(anker || 'slutt'); setBudsjettAapen(true); hentPlanListe(); },
    oppdaterBudsjett: async (blokkId) => {
      const b = blokker.find((x) => x.id === blokkId);
      if (!b || !b.planId) return;
      try {
        const r = await fetch(`/api/admin/budsjett/plan?${q}&id=${encodeURIComponent(b.planId)}`, { cache: 'no-store' });
        const j = await r.json();
        if (j.ok && j.plan) setBlokker((bs) => bs.map((x) => (x.id === blokkId ? { ...x, ...snapshotFelter(j.plan), oppdatertAt: new Date().toISOString() } : x)));
      } catch (e) { /* stille */ }
    },
  };

  // Delingslenker (for valgt rapport)
  const hentLenker = useCallback(async () => {
    setLenkerLaster(true);
    try { const r = await fetch(`/api/admin/styrerapport/lenker?${q}`, { cache: 'no-store' }); const j = await r.json(); if (j.ok) setLenker(j.lenker || []); }
    finally { setLenkerLaster(false); }
  }, [q]);
  const aapneDel = () => { setNyLabel(motedato || tittel || 'Styremøte'); setDelAapen(true); hentLenker(); };
  const opprettLenke = async () => {
    setOppretter(true);
    try {
      const r = await fetch(`/api/admin/styrerapport/lenker?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: nyLabel, utloperDager: Number(nyUtloper) || 0, inkluderRegnskap: nyRegnskap, regnskapAar: Number(nyRegnskapAar), rapportId: valgtId }) });
      const j = await r.json();
      if (j.ok) { setLenker((ls) => [j.lenke, ...ls]); kopier(j.lenke.url, j.lenke.id); }
    } finally { setOppretter(false); }
  };
  const settAktiv = async (l, aktiv) => {
    const url = `/api/admin/styrerapport/lenker/${l.id}${aktiv ? '/aktiver' : ''}?${q}`;
    const r = await fetch(url, { method: aktiv ? 'POST' : 'DELETE' });
    const j = await r.json();
    if (j.ok) setLenker((ls) => ls.map((x) => (x.id === l.id ? { ...x, ...j.lenke } : x)));
  };
  const kopier = (url, id) => { try { navigator.clipboard.writeText(url); setKopiert(id); setTimeout(() => setKopiert(null), 1800); } catch (e) { /* ok */ } };

  const btnGhost = 'inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-[8px] border border-[#D6CFC4] bg-white text-[12.5px] font-semibold text-[#3A3733] hover:border-[#0A0A0A] transition-colors disabled:opacity-40';
  const btnDark = 'inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-[8px] bg-[#0A0A0A] text-white text-[12.5px] font-semibold hover:bg-[#232323] transition-colors disabled:opacity-40';

  // ── Handlinger i rapport-navbaren ──
  const handlinger = (
    <>
      <button className={btnGhost} onClick={tilArkiv} title="Til arkivet"><ArrowLeft className="h-4 w-4" /> <span className="hidden md:inline">Arkiv</span></button>
      {status === 'publisert'
        ? <button className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12.5px] font-semibold transition-colors sm:px-3" style={{ borderColor: 'rgba(27,122,70,0.35)', background: 'rgba(27,122,70,0.08)', color: C.pos }} onClick={() => oppdaterMeta(valgtId, { status: 'utkast' })} disabled={metaJobb} title="Publisert — klikk for å avpublisere"><Globe className="h-4 w-4" /> <span className="hidden lg:inline">Publisert</span></button>
        : <button className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border px-2.5 text-[12.5px] font-semibold transition-colors sm:px-3" style={{ borderColor: 'rgba(154,91,0,0.35)', background: 'rgba(154,91,0,0.08)', color: C.amber }} onClick={() => oppdaterMeta(valgtId, { status: 'publisert' })} disabled={metaJobb} title="Utkast — klikk for å publisere"><EyeOff className="h-4 w-4" /> <span className="hidden lg:inline">Utkast</span></button>}
      {lagretAt && <span className="mx-0.5 hidden items-center gap-1 text-[11.5px] font-medium text-[#16a34a] xl:inline-flex"><Check className="h-3.5 w-3.5" /> Lagret</span>}
      <button className={btnGhost} onClick={() => load(valgtId)} disabled={loading} title="Oppdater tall"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      <button className={btnGhost} onClick={aapneDel} title="Del"><Share2 className="h-4 w-4" /> <span className="hidden md:inline">Del</span></button>
      {rediger
        ? <button className={btnDark} onClick={ferdigRediger} disabled={lagrer} title="Ferdig">{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} <span className="hidden sm:inline">Ferdig</span></button>
        : <button className={btnGhost} onClick={() => setRediger(true)} title="Rediger"><Pencil className="h-4 w-4" /> <span className="hidden md:inline">Rediger</span></button>}
      <button className={btnGhost} onClick={() => setPresentasjon((p) => !p)} title={presentasjon ? 'Lukk' : 'Presentasjon'}>{presentasjon ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
      <button className={btnGhost} onClick={() => window.print()} title="Skriv ut / PDF"><Printer className="h-4 w-4" /></button>
    </>
  );

  const regnskapKontroller = (
    <div className="flex items-center gap-2">
      <select className="h-10 rounded-[8px] border border-[#D6CFC4] bg-white px-3 text-[13px] font-semibold" value={regnAar} onChange={(e) => setRegnAar(Number(e.target.value))}>
        {aarValg.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <button className={btnDark} onClick={() => lastRegnskap(regnAar)} disabled={regnLaster}>{regnLaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Hent</button>
    </div>
  );

  const visning = (
    <StyrerapportVisning
      innhold={{ tittel, motedato, periodeLabel, sammendrag, askRaw, blokker }}
      edit={rediger ? editApi : null}
      data={data}
      regnskap={regn}
      regnskapKontroller={regnskapKontroller}
      regnskapStatus={{ laster: regnLaster, feil: regnFeil }}
      visRegnskap
      visning="admin"
      handlinger={handlinger}
    />
  );

  // ── DIALOG: Ny rapport ──
  const nyDialog = (
    <Dialog open={nyAapen} onOpenChange={setNyAapen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={H}><FileText className="h-5 w-5 text-[#7C3AED]" /> Ny styrerapport</DialogTitle>
          <DialogDescription>Én rapport per møte. Tallene er alltid live — du fyller inn tekst, seksjoner og beslutninger.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-[12.5px] font-semibold text-[#3a3a38]">Tittel
            <input className="mt-1 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-[#cf97fc]" value={nyTittel} onChange={(e) => setNyTittel(e.target.value)} placeholder={`Styrerapport ${iAar}`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12.5px] font-semibold text-[#3a3a38]">Møtedato
              <input className="mt-1 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-[#cf97fc]" value={nyMotedato} onChange={(e) => setNyMotedato(e.target.value)} placeholder="26. juni 2025" />
            </label>
            <label className="block text-[12.5px] font-semibold text-[#3a3a38]">Periode
              <input className="mt-1 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-[#cf97fc]" value={nyPeriode} onChange={(e) => setNyPeriode(e.target.value)} placeholder="Q2 2025" />
            </label>
          </div>
          <label className="block text-[12.5px] font-semibold text-[#3a3a38]">Utgangspunkt
            <select className="mt-1 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-[#cf97fc]" value={nyFraId} onChange={(e) => setNyFraId(e.target.value)}>
              <option value="">Tom rapport</option>
              {rapporter.map((r) => <option key={r.id} value={r.id}>Dupliser: {r.tittel}{r.motedato ? ` (${r.motedato})` : ''}</option>)}
            </select>
          </label>
          <p className="text-[12px] leading-relaxed text-[#8a857c]">Dupliserer du en tidligere rapport, arves sammendrag, egne seksjoner og beslutningspunkter som utgangspunkt.</p>
          <button className={`${btnDark} mt-1 h-11 w-full justify-center`} onClick={opprettRapport} disabled={nyJobb}>{nyJobb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Opprett rapport</button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ── DIALOG: Delingslenker ──
  const delDialog = (
    <Dialog open={delAapen} onOpenChange={setDelAapen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={H}><Link2 className="h-5 w-5 text-[#8b5cf6]" /> Delingslenker</DialogTitle>
          <DialogDescription>Lenker for «{tittel}». Styremedlemmer åpner uten innlogging og ser dagens tall live. {status !== 'publisert' && <span className="font-semibold text-[#9a5b00]">Rapporten er et utkast — publiser den for at lenken skal vises.</span>}</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-black/[0.07] bg-[#faf9f7] p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-[12.5px] font-semibold text-[#3a3a38]">Navn (kun for din oversikt)
              <input className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-[13.5px] font-normal outline-none focus:border-[#cf97fc]" value={nyLabel} onChange={(e) => setNyLabel(e.target.value)} placeholder="Styremøte juni" />
            </label>
            <label className="text-[12.5px] font-semibold text-[#3a3a38]">Utløper om (dager)
              <input type="number" min="0" className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-[13.5px] font-normal outline-none focus:border-[#cf97fc]" value={nyUtloper} onChange={(e) => setNyUtloper(e.target.value)} placeholder="0 = aldri" />
            </label>
            <label className="text-[12.5px] font-semibold text-[#3a3a38]">Regnskapsår
              <select className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-[13.5px] font-normal" value={nyRegnskapAar} onChange={(e) => setNyRegnskapAar(Number(e.target.value))}>{aarValg.map((a) => <option key={a} value={a}>{a}</option>)}</select>
            </label>
            <label className="col-span-2 flex items-center gap-2 text-[13px] font-medium text-[#3a3a38]">
              <input type="checkbox" className="h-4 w-4 accent-[#8b5cf6]" checked={nyRegnskap} onChange={(e) => setNyRegnskap(e.target.checked)} /> Inkluder bokførte regnskapstall (PowerOffice)
            </label>
          </div>
          <button className={`${btnDark} mt-3 w-full justify-center`} onClick={opprettLenke} disabled={oppretter}>{oppretter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lag delingslenke</button>
        </div>

        <div className="mt-1 max-h-[280px] space-y-2 overflow-auto pr-1">
          {lenkerLaster && <p className="py-3 text-center text-[13px] text-[#9b9b97]"><Loader2 className="inline h-4 w-4 animate-spin" /> Laster …</p>}
          {!lenkerLaster && lenker.length === 0 && <p className="py-3 text-center text-[13px] text-[#a9a9a5]">Ingen delingslenker ennå.</p>}
          {lenker.map((l) => {
            const utlopt = l.utloper && new Date(l.utloper).getTime() < Date.now();
            const aktiv = l.aktiv && !utlopt;
            const forDenne = l.rapportId === valgtId;
            return (
              <div key={l.id} className="rounded-xl border border-black/[0.07] bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${aktiv ? 'bg-[#16a34a]' : 'bg-[#c4c4c0]'}`} />
                  <span className="truncate text-[13.5px] font-semibold text-[#0a0a0a]">{l.label}</span>
                  {!forDenne && l.rapport && <span className="truncate rounded-[5px] bg-[#f0ecff] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#7C3AED]">{l.rapport.tittel}</span>}
                  <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[#9b9b97]"><Eye className="h-3.5 w-3.5" /> {l.visninger}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#7a7a76]">
                  {utlopt ? <span className="text-[#b76e00]">Utløpt</span> : !l.aktiv ? <span className="text-[#b3261e]">Trukket tilbake</span> : l.utloper ? <span>Utløper {new Date(l.utloper).toLocaleDateString('nb-NO')}</span> : <span>Uten utløp</span>}
                  {l.sistApnet && <span>· sist åpnet {new Date(l.sistApnet).toLocaleDateString('nb-NO')}</span>}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <input readOnly value={l.url} className="h-8 min-w-0 flex-1 rounded-lg border border-black/10 bg-[#faf9f7] px-2.5 text-[12px] text-[#5b5b57] outline-none" onFocus={(e) => e.target.select()} />
                  <button className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 text-[12px] font-semibold hover:bg-black/[0.03]" onClick={() => kopier(l.url, l.id)}>{kopiert === l.id ? <><Check className="h-3.5 w-3.5 text-[#16a34a]" /> Kopiert</> : <><Copy className="h-3.5 w-3.5" /> Kopier</>}</button>
                  <a className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2 hover:bg-black/[0.03]" href={l.url} target="_blank" rel="noreferrer" title="Åpne"><ExternalLink className="h-3.5 w-3.5" /></a>
                  {l.aktiv
                    ? <button className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#f3c9c9] bg-white px-2 text-[12px] font-semibold text-[#b3261e] hover:bg-[#fdeaea]" onClick={() => settAktiv(l, false)} title="Trekk tilbake"><Ban className="h-3.5 w-3.5" /></button>
                    : <button className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/10 bg-white px-2 text-[12px] font-semibold hover:bg-black/[0.03]" onClick={() => settAktiv(l, true)} title="Reaktiver"><RotateCcw className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );

  // ── DIALOG: Legg til budsjett (velg fra budsjettmodulen) ──
  const budsjettDialog = (
    <Dialog open={budsjettAapen} onOpenChange={setBudsjettAapen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={H}><Wallet className="h-5 w-5 text-[#7C3AED]" /> Legg til budsjett</DialogTitle>
          <DialogDescription>Velg et budsjett fra budsjettmodulen. Tallene fryses som et øyeblikksbilde i denne rapporten — alle forutsetningene (unit economics, vekst, bemanning …) kan justeres under «Innstillinger» etterpå, kun for denne rapporten.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[440px] space-y-2 overflow-auto pr-1">
          {planListeLaster && <p className="py-6 text-center text-[13px] text-[#9b9b97]"><Loader2 className="inline h-4 w-4 animate-spin" /> Laster budsjetter …</p>}
          {!planListeLaster && planListe && planListe.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#D6CFC4] p-6 text-center">
              <p className="text-[14px] font-semibold text-[#15130F]" style={H}>Ingen budsjetter ennå</p>
              <p className="mx-auto mt-1 max-w-[340px] text-[13px] text-[#6F6A60]">Lag et budsjett i Budsjett-modulen først, så kan du knytte det til styrerapporten her.</p>
            </div>
          )}
          {!planListeLaster && (planListe || []).map((p) => (
            <button key={p.id} disabled={!!budsjettJobb} onClick={() => velgBudsjett(p.id)} className="flex w-full items-center gap-3 rounded-xl border border-black/[0.07] bg-white p-3.5 text-left transition-colors hover:border-[#7C3AED]/50 disabled:opacity-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: p.selskap === 'tech' ? 'rgba(124,58,237,0.12)' : '#0A0A0A', color: p.selskap === 'tech' ? '#7C3AED' : '#fff' }}><TrendingUp className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-bold text-[#15130F]" style={H}>{p.navn}</span>
                  {p.status === 'vedtatt' && <span className="rounded-full bg-[#e7f4ee] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0a7d55]">Vedtatt</span>}
                  {p.investorSynlig && <span className="rounded-full bg-[#f0ecff] px-2 py-0.5 text-[10px] font-bold uppercase text-[#7C3AED]">Investor</span>}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-[#6F6A60]">{p.selskap === 'tech' ? 'DigiHome Tech AS · ' : ''}{budsjettPeriode(p.startYm, p.antallMnd)}{p.inntekter ? ` · inntekt ${krKort0(p.inntekter)}` : ''}</span>
              </span>
              {budsjettJobb === p.id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#7C3AED]" /> : <Plus className="h-4 w-4 shrink-0 text-[#c4c4c0]" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  // ══════════════════ RAPPORT-VISNING (valgt) ══════════════════
  if (valgtId) {
    if (loading && !data) {
      return <div className="flex items-center justify-center gap-3 py-24 text-[14px] text-black/50"><Loader2 className="h-5 w-5 animate-spin" /> Laster rapport …</div>;
    }
    if (presentasjon) {
      return (<div className="dh-sr-overlay fixed inset-0 z-[60] overflow-auto bg-[#FDFCFB]">{visning}{delDialog}{budsjettDialog}</div>);
    }
    return (
      <div>
        {feil && <div className="mb-4 rounded-2xl border border-[#f3c9c9] bg-[#fdf2f2] p-5 text-[14px] text-[#b3261e]">{feil}</div>}
        {visning}
        {delDialog}
        {budsjettDialog}
      </div>
    );
  }

  // ══════════════════ ARKIV ══════════════════
  const StatusMerke = ({ s }) => (
    s === 'publisert'
      ? <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'rgba(27,122,70,0.10)', color: C.pos }}><Globe className="h-3 w-3" /> Publisert</span>
      : <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: 'rgba(154,91,0,0.10)', color: C.amber }}><EyeOff className="h-3 w-3" /> Utkast</span>
  );
  const naar = (iso) => { try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return '—'; } };

  return (
    <div className="min-h-[70vh]" style={{ background: C.canvas }}>
      {nyDialog}
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-24 pt-10 sm:px-8 lg:pt-14">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-[640px]">
            <div className="mb-3.5 flex items-center gap-3">
              <span className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ ...H, color: C.accent }}>Investor · Styre</span>
              <span className="h-px w-9" style={{ background: C.line2 }} />
            </div>
            <h1 className="font-bold" style={{ ...H, fontSize: 'clamp(38px,6vw,66px)', lineHeight: 0.98, letterSpacing: '-0.045em', color: C.ink }}>Styrerapporter</h1>
            <p className="mt-4 max-w-[520px] text-[15.5px] leading-[1.6]" style={{ color: C.ink3 }}>Én rapport per møte. Tallene hentes live fra plattformen og økonomimotoren — du komponerer tekst, egne seksjoner og beslutninger.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={btnGhost} onClick={hentListe} disabled={listLaster} title="Oppdater"><RefreshCw className={`h-4 w-4 ${listLaster ? 'animate-spin' : ''}`} /></button>
            <button className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#0A0A0A] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#232323]" onClick={() => { setNyTittel(''); setNyMotedato(''); setNyPeriode(''); setNyFraId(''); setNyAapen(true); }}><Plus className="h-4.5 w-4.5" /> Ny rapport</button>
          </div>
        </div>

        <div className="my-9 h-px" style={{ background: C.line }} />

        {listFeil && <div className="mb-4 rounded-2xl border border-[#f3c9c9] bg-[#fdf2f2] p-5 text-[14px] text-[#b3261e]">{listFeil}</div>}

        {/* Liste */}
        {listLaster && rapporter.length === 0 ? (
          <div className="flex items-center justify-center gap-3 py-20 text-[14px]" style={{ color: C.ink3 }}><Loader2 className="h-5 w-5 animate-spin" /> Laster arkivet …</div>
        ) : rapporter.length === 0 ? (
          <div className="rounded-[20px] border border-dashed bg-white/60 px-8 py-16 text-center" style={{ borderColor: C.line2 }}>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: C.paper2 }}><CalendarDays className="h-6 w-6" style={{ color: C.accent }} /></div>
            <p className="text-[19px] font-bold" style={{ ...H, color: C.ink }}>Ingen styrerapporter ennå</p>
            <p className="mx-auto mt-2 max-w-[360px] text-[14.5px]" style={{ color: C.ink3 }}>Lag din første rapport for neste styremøte — det tar under ett minutt.</p>
            <button className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#0A0A0A] px-5 text-[14px] font-semibold text-white hover:bg-[#232323]" onClick={() => setNyAapen(true)}><Plus className="h-4.5 w-4.5" /> Ny rapport</button>
          </div>
        ) : (
          <div className="space-y-3">
            {rapporter.map((r) => (
              <div key={r.id} className="group relative overflow-hidden rounded-[18px] border bg-white transition-all hover:shadow-[0_18px_50px_-28px_rgba(21,19,15,0.45)]" style={{ borderColor: r.id === gjeldendeId ? 'rgba(124,58,237,0.4)' : C.line, boxShadow: r.id === gjeldendeId ? `inset 0 0 0 1px rgba(124,58,237,0.28)` : 'none' }}>
                <button className="flex w-full items-center gap-5 p-5 text-left sm:p-6" onClick={() => apneRapport(r.id)}>
                  {/* Dato-blokk */}
                  <div className="hidden shrink-0 flex-col items-center justify-center rounded-[12px] px-4 py-3 sm:flex" style={{ background: C.paper2, minWidth: 92 }}>
                    <CalendarDays className="h-4 w-4" style={{ color: C.accent }} />
                    <span className="mt-1.5 text-center text-[12.5px] font-semibold leading-tight" style={{ color: C.ink2 }}>{r.motedato || 'Uten dato'}</span>
                  </div>
                  {/* Tekst */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[18px] font-bold" style={{ ...H, color: C.ink, letterSpacing: '-0.02em' }}>{r.tittel}</span>
                      {r.id === gjeldendeId && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ background: 'rgba(124,58,237,0.12)', color: C.accent }}><Star className="h-3 w-3 fill-current" /> Gjeldende</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" style={{ color: C.ink3 }}>
                      {r.periodeLabel && <span className="font-semibold" style={{ color: C.ink2 }}>{r.periodeLabel}</span>}
                      {r.periodeLabel && <span style={{ color: C.line2 }}>·</span>}
                      <span>{r.antallSeksjoner} seksjon{r.antallSeksjoner === 1 ? '' : 'er'}{r.antallRike ? ` (${r.antallRike} rik${r.antallRike === 1 ? '' : 'e'})` : ''}</span>
                      <span style={{ color: C.line2 }}>·</span>
                      <span>Oppdatert {naar(r.oppdatert)}</span>
                    </div>
                  </div>
                  <div className="hidden shrink-0 sm:block"><StatusMerke s={r.status} /></div>
                  <ChevronRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: C.line2 }} />
                </button>
                {/* Handlingsrad */}
                <div className="flex flex-wrap items-center gap-1.5 border-t px-5 py-2.5 sm:px-6" style={{ borderColor: C.line, background: '#fcfbf9' }}>
                  <span className="sm:hidden"><StatusMerke s={r.status} /></span>
                  <button className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors hover:bg-black/[0.05]" style={{ color: C.ink2 }} onClick={() => apneRapport(r.id)}><Pencil className="h-3.5 w-3.5" /> Åpne</button>
                  <button className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors hover:bg-black/[0.05]" style={{ color: C.ink2 }} onClick={() => { setNyTittel(`Kopi av ${r.tittel}`); setNyMotedato(''); setNyPeriode(r.periodeLabel || ''); setNyFraId(r.id); setNyAapen(true); }}><CopyPlus className="h-3.5 w-3.5" /> Dupliser</button>
                  {r.status === 'publisert'
                    ? <button className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors hover:bg-black/[0.05]" style={{ color: C.ink2 }} onClick={() => oppdaterMeta(r.id, { status: 'utkast' })} disabled={metaJobb}><EyeOff className="h-3.5 w-3.5" /> Avpubliser</button>
                    : <button className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors hover:bg-black/[0.05]" style={{ color: C.pos }} onClick={() => oppdaterMeta(r.id, { status: 'publisert' })} disabled={metaJobb}><Globe className="h-3.5 w-3.5" /> Publiser</button>}
                  {r.id !== gjeldendeId && <button className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors hover:bg-black/[0.05]" style={{ color: C.ink2 }} onClick={() => oppdaterMeta(r.id, { gjeldende: true })} disabled={metaJobb}><Star className="h-3.5 w-3.5" /> Sett gjeldende</button>}
                  <button className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold transition-colors hover:bg-[#fdeaea]" style={{ color: '#b3261e' }} onClick={() => slettRapport(r.id)}><Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Slett</span></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
