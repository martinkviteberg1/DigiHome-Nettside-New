'use client';

// ─────────────────────────────────────────────────────────────────────────────
// STYRERAPPORT (admin-kontroller) — henter data, holder redigeringstilstand og
// verktøylinje (Rediger · Del · Presentasjon · Skriv ut), og rendrer den moderne
// visningen (StyrerapportVisning). Delingslenker administreres i egen dialog.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, Pencil, Check, Printer, Maximize2, X, Receipt, Share2,
  Plus, Copy, Link2, Eye, Ban, RotateCcw, Trash2, ExternalLink,
} from 'lucide-react';
import StyrerapportVisning, { blokkTilRaw, rawTilBlokk, nyBlokkRaw, migrerBlokk } from '@/components/admin/StyrerapportVisning';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

export default function Styrerapport({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feil, setFeil] = useState(null);

  const [rediger, setRediger] = useState(false);
  const [presentasjon, setPresentasjon] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagretAt, setLagretAt] = useState(null);

  // Redigerbart innhold
  const [tittel, setTittel] = useState('Styrerapport');
  const [motedato, setMotedato] = useState('');
  const [periodeLabel, setPeriodeLabel] = useState('');
  const [sammendrag, setSammendrag] = useState('');
  const [askRaw, setAskRaw] = useState('');
  const [blokker, setBlokker] = useState([]);

  // Regnskap (PowerOffice, på forespørsel)
  const [regnAar, setRegnAar] = useState(new Date().getFullYear());
  const [regn, setRegn] = useState(null);
  const [regnLaster, setRegnLaster] = useState(false);
  const [regnFeil, setRegnFeil] = useState(null);

  // Delingslenker
  const [delAapen, setDelAapen] = useState(false);
  const [lenker, setLenker] = useState([]);
  const [lenkerLaster, setLenkerLaster] = useState(false);
  const [oppretter, setOppretter] = useState(false);
  const [kopiert, setKopiert] = useState(null);
  const [nyLabel, setNyLabel] = useState('Styremøte');
  const [nyUtloper, setNyUtloper] = useState(30);
  const [nyRegnskap, setNyRegnskap] = useState(true);
  const [nyRegnskapAar, setNyRegnskapAar] = useState(new Date().getFullYear());

  const q = `key=${encodeURIComponent(apiKey || '')}`;

  const settRedigerbart = useCallback((r) => {
    setTittel(r?.tittel || 'Styrerapport');
    setMotedato(r?.motedato || '');
    setPeriodeLabel(r?.periodeLabel || '');
    setSammendrag(r?.sammendrag || '');
    setAskRaw((r?.ask || []).join('\n'));
    // Behold alle felt (rik: doc/kicker/layout/etter) og løft gamle «tekst»-blokker til rike seksjoner.
    setBlokker((r?.blokker || []).map((b) => migrerBlokk({ ...b, tittel: b.tittel || '', raw: blokkTilRaw(b) })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setFeil(null);
    try {
      const r = await fetch(`/api/admin/styrerapport?${q}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setFeil(j.error || 'Kunne ikke laste'); setData(null); }
      else { setData(j); settRedigerbart(j.rapport); }
    } catch (e) { setFeil('Kunne ikke laste styrerapport'); }
    finally { setLoading(false); }
  }, [q, settRedigerbart]);

  useEffect(() => { if (apiKey) load(); }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const lagre = useCallback(async () => {
    setLagrer(true);
    try {
      const body = {
        tittel, motedato, periodeLabel, sammendrag,
        ask: askRaw.split('\n').map((s) => s.trim()).filter(Boolean),
        blokker: blokker.map(rawTilBlokk),
      };
      const r = await fetch(`/api/admin/styrerapport?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.ok) { setLagretAt(new Date()); setData((d) => (d ? { ...d, rapport: j.rapport } : d)); }
    } finally { setLagrer(false); }
  }, [q, tittel, motedato, periodeLabel, sammendrag, askRaw, blokker]);

  const ferdigRediger = useCallback(async () => { await lagre(); setRediger(false); }, [lagre]);

  const lastRegnskap = useCallback(async (aar) => {
    setRegnLaster(true); setRegnFeil(null);
    try {
      const r = await fetch(`/api/admin/regnskap/konsern?${q}&ar=${aar}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setRegnFeil(j.feil || 'Regnskap utilgjengelig'); setRegn(null); }
      else setRegn(j);
    } catch (e) { setRegnFeil('Regnskap utilgjengelig'); setRegn(null); }
    finally { setRegnLaster(false); }
  }, [q]);

  // Blokk-operasjoner
  const editApi = {
    setTittel, setMotedato, setPeriodeLabel, setSammendrag, setAskRaw,
    oppdaterBlokk: (id, patch) => setBlokker((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    flyttBlokk: (id, retning) => setBlokker((bs) => { const i = bs.findIndex((b) => b.id === id); if (i < 0) return bs; const j = i + retning; if (j < 0 || j >= bs.length) return bs; const k = [...bs]; const [x] = k.splice(i, 1); k.splice(j, 0, x); return k; }),
    slettBlokk: (id) => setBlokker((bs) => bs.filter((b) => b.id !== id)),
    leggTilBlokk: (type, extra) => {
      const ny = nyBlokkRaw(type, extra);
      setBlokker((bs) => [...bs, ny]);
      // Rike seksjoner blir egne kapitler — scroll dit så du kan begynne å skrive med én gang.
      if (type === 'rik') setTimeout(() => { const el = document.getElementById(`sr-rik-${ny.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 140);
    },
  };

  // Delingslenker
  const hentLenker = useCallback(async () => {
    setLenkerLaster(true);
    try { const r = await fetch(`/api/admin/styrerapport/lenker?${q}`, { cache: 'no-store' }); const j = await r.json(); if (j.ok) setLenker(j.lenker || []); }
    finally { setLenkerLaster(false); }
  }, [q]);

  const aapneDel = () => { setDelAapen(true); hentLenker(); };

  const opprettLenke = async () => {
    setOppretter(true);
    try {
      const r = await fetch(`/api/admin/styrerapport/lenker?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: nyLabel, utloperDager: Number(nyUtloper) || 0, inkluderRegnskap: nyRegnskap, regnskapAar: Number(nyRegnskapAar) }) });
      const j = await r.json();
      if (j.ok) { setLenker((ls) => [j.lenke, ...ls]); kopier(j.lenke.url, j.lenke.id); }
    } finally { setOppretter(false); }
  };

  const settAktiv = async (l, aktiv) => {
    const url = `/api/admin/styrerapport/lenker/${l.id}${aktiv ? '/aktiver' : ''}?${q}`;
    const r = await fetch(url, { method: aktiv ? 'POST' : 'DELETE' });
    const j = await r.json();
    if (j.ok) setLenker((ls) => ls.map((x) => (x.id === l.id ? j.lenke : x)));
  };

  const kopier = (url, id) => { try { navigator.clipboard.writeText(url); setKopiert(id); setTimeout(() => setKopiert(null), 1800); } catch (e) { /* ok */ } };

  const iAar = new Date().getFullYear();
  const aarValg = [iAar, iAar - 1, iAar - 2];

  const btnGhost = 'inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-[8px] border border-[#D6CFC4] bg-white text-[12.5px] font-semibold text-[#3A3733] hover:border-[#0A0A0A] transition-colors disabled:opacity-40';
  const btnDark = 'inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-[8px] bg-[#0A0A0A] text-white text-[12.5px] font-semibold hover:bg-[#232323] transition-colors disabled:opacity-40';

  // Handlinger vises til høyre i den fulle rapport-navbaren (StyrerapportVisning).
  const handlinger = (
    <>
      {lagretAt && <span className="mr-1 hidden items-center gap-1 text-[11.5px] font-medium text-[#16a34a] lg:inline-flex"><Check className="h-3.5 w-3.5" /> Lagret {lagretAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>}
      <button className={btnGhost} onClick={load} disabled={loading} title="Oppdater"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden md:inline">Oppdater</span></button>
      <button className={btnGhost} onClick={aapneDel} title="Del"><Share2 className="h-4 w-4" /> <span className="hidden md:inline">Del</span></button>
      {rediger
        ? <button className={btnDark} onClick={ferdigRediger} disabled={lagrer} title="Ferdig">{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} <span className="hidden sm:inline">Ferdig</span></button>
        : <button className={btnGhost} onClick={() => setRediger(true)} title="Rediger"><Pencil className="h-4 w-4" /> <span className="hidden md:inline">Rediger</span></button>}
      <button className={btnGhost} onClick={() => setPresentasjon((p) => !p)} title={presentasjon ? 'Lukk' : 'Presentasjon'}>{presentasjon ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} <span className="hidden lg:inline">{presentasjon ? 'Lukk' : 'Presentasjon'}</span></button>
      <button className={btnGhost} onClick={() => window.print()} title="Skriv ut / PDF"><Printer className="h-4 w-4" /> <span className="hidden lg:inline">Skriv ut</span></button>
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

  const delDialog = (
    <Dialog open={delAapen} onOpenChange={setDelAapen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}><Link2 className="h-5 w-5 text-[#8b5cf6]" /> Delingslenker</DialogTitle>
          <DialogDescription>Lag en ugjettbar lenke styremedlemmer kan åpne uten innlogging. Lenken viser dagens tall live. Du kan når som helst trekke den tilbake.</DialogDescription>
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
            return (
              <div key={l.id} className="rounded-xl border border-black/[0.07] bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${aktiv ? 'bg-[#16a34a]' : 'bg-[#c4c4c0]'}`} />
                  <span className="truncate text-[13.5px] font-semibold text-[#0a0a0a]">{l.label}</span>
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

  if (loading && !data) {
    return <div className="flex items-center justify-center gap-3 py-24 text-[14px] text-black/50"><Loader2 className="h-5 w-5 animate-spin" /> Laster styrerapport …</div>;
  }

  if (presentasjon) {
    return (
      <div className="dh-sr-overlay fixed inset-0 z-[60] overflow-auto bg-[#FDFCFB]">
        {visning}
        {delDialog}
      </div>
    );
  }

  return (
    <div>
      {feil && <div className="mb-4 rounded-2xl border border-[#f3c9c9] bg-[#fdf2f2] p-5 text-[14px] text-[#b3261e]">{feil}</div>}
      {visning}
      {delDialog}
    </div>
  );
}
