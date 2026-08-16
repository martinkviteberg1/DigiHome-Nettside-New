'use client';

/* ═══════════════ DokumentModal — dokumenthandlinger for saksvedlegg ═══════════════
   Ett samlet panel per dokument: BankID-signering via Posten signering (flere
   signatarer, valgfri rekkefølge, status i sanntid), dokumentarkiv med synlighet
   (styret/investorer/alle), tidsbegrensede delingslenker for eksterne, lettvekts
   versjonskontroll (v1/v2/v3 + gjenoppretting) og hendelseslogg. Signerte
   dokumenter låses automatisk. */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, PenLine, Archive, Link2, History, Clock, Loader2, Check, Copy,
  Download, Plus, Trash2, ChevronUp, ChevronDown, ShieldCheck, Lock,
  RotateCcw, Upload, AlertCircle, RefreshCw, Ban, Send,
} from 'lucide-react';
import { filIkonInfo } from './FilViser';

const fmtStr = (b) => {
  const n = Number(b) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};
const fmtDato = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })} kl. ${d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`;
};

const SIGNATAR_ETIKETT = {
  VENTER: { l: 'Venter', cls: 'bg-[#f4f4f2] text-[#888]' },
  SIGNERT: { l: 'Signert', cls: 'bg-emerald-50 text-emerald-700' },
  AVVIST: { l: 'Avvist', cls: 'bg-rose-50 text-rose-600' },
  UTLOPT: { l: 'Utløpt', cls: 'bg-amber-50 text-amber-700' },
  BLOKKERT: { l: 'Blokkert', cls: 'bg-rose-50 text-rose-600' },
  FEILET: { l: 'Feilet', cls: 'bg-rose-50 text-rose-600' },
};
const JOBB_ETIKETT = {
  I_GANG: { l: 'Signering pågår', cls: 'text-[#8b5cf6]' },
  FULLFORT: { l: 'Fullført — alle har signert', cls: 'text-emerald-600' },
  FEILET: { l: 'Stoppet (avvist eller utløpt)', cls: 'text-rose-600' },
  KANSELLERT: { l: 'Kansellert', cls: 'text-[#999]' },
};

const SEK_TITTEL = 'flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#999]';
const INPUT = 'h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15';
const KNAPP = 'flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-50';
const KNAPP_LYS = 'flex h-8 items-center gap-1.5 rounded-full bg-[#f4f0fb] px-3 text-[12px] font-semibold text-[#8b5cf6] transition-colors hover:bg-[#ece4fa] disabled:opacity-50';

export default function DokumentModal({ fil, taskId, apiKey, api, actor, onClose, onReload, visToast }) {
  const [det, setDet] = useState(null);
  const [laster, setLaster] = useState(true);
  const [erAdmin, setErAdmin] = useState(false);
  const [oppsett, setOppsett] = useState(null);
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState('');

  const hentAlt = useCallback(async () => {
    try {
      const r = await api(`task-files/${fil.id}/detaljer`);
      const j = await r.json();
      if (j.ok) setDet(j.detaljer);
    } catch (e) { /* stille */ }
    setLaster(false);
  }, [api, fil.id]);

  useEffect(() => {
    hentAlt();
    // Admin-sjekk + signeringsoppsett (401 → ikke admin)
    (async () => {
      try {
        const r = await api('signering/oppsett');
        if (r.status === 401) { setErAdmin(false); return; }
        const j = await r.json();
        setErAdmin(true);
        setOppsett(j.oppsett || { konfigurert: false });
      } catch (e) { /* stille */ }
    })();
    (async () => {
      try {
        const r = await api('users');
        const j = await r.json();
        setMembers((j.users || j || []).filter((u) => u.email));
      } catch (e) { /* stille */ }
    })();
  }, [fil.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll detaljer hvert 15. sek mens signering pågår
  const aktivJobb = det && (det.signering || []).find((j) => j.status === 'I_GANG');
  useEffect(() => {
    if (!aktivJobb) return undefined;
    const t = setInterval(hentAlt, 15000);
    return () => clearInterval(t);
  }, [!!aktivJobb, hentAlt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose]);

  const { Ikon, farge } = filIkonInfo(fil.type, fil.name);
  const oppdater = async () => { await hentAlt(); if (onReload) onReload(); };

  return (
    <div className="dh-fade fixed inset-0 z-[150] flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-label={`Dokument: ${fil.name}`} data-testid="dokument-modal">
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Hode */}
        <div className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${farge}14` }}>
            <Ikon className="h-5 w-5" style={{ color: farge }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-semibold text-[#0a0a0a]">{det?.name || fil.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#999]">
              <span>{fmtStr(det?.size ?? fil.size)}</span>
              <span className="rounded-[4px] bg-[#f4f4f2] px-1.5 py-px font-semibold text-[#777]">v{det?.versjon || 1}</span>
              {det?.laast && <span className="flex items-center gap-1 rounded-[4px] bg-emerald-50 px-1.5 py-px font-semibold text-emerald-700"><Lock className="h-2.5 w-2.5" /> Signert · låst</span>}
              {det?.arkiv?.aktiv && <span className="flex items-center gap-1 rounded-[4px] bg-[#f4f0fb] px-1.5 py-px font-semibold text-[#8b5cf6]"><Archive className="h-2.5 w-2.5" /> I arkivet</span>}
            </div>
          </div>
          <button onClick={onClose} data-testid="dokument-modal-lukk" className="flex h-9 w-9 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-[#f4f4f2] hover:text-[#333]">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Innhold */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {laster && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#bbb]" /></div>}
          {!laster && det && (
            <div className="space-y-6">
              <SigneringSeksjon det={det} api={api} actor={actor} erAdmin={erAdmin} oppsett={oppsett} setOppsett={setOppsett} members={members} visToast={visToast} onOppdatert={oppdater} busy={busy} setBusy={setBusy} />
              <ArkivSeksjon det={det} api={api} actor={actor} visToast={visToast} onOppdatert={oppdater} busy={busy} setBusy={setBusy} />
              <DelingSeksjon det={det} api={api} actor={actor} visToast={visToast} onOppdatert={oppdater} busy={busy} setBusy={setBusy} />
              <VersjonSeksjon det={det} api={api} apiKey={apiKey} actor={actor} taskId={taskId} visToast={visToast} onOppdatert={oppdater} busy={busy} setBusy={setBusy} />
              <HistorikkSeksjon det={det} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── BankID-signering (Posten signering) ────────────────────────────────────── */
function SigneringSeksjon({ det, api, actor, erAdmin, oppsett, setOppsett, members, visToast, onOppdatert, busy, setBusy }) {
  const [visSkjema, setVisSkjema] = useState(false);
  const [tittel, setTittel] = useState(String(det.name || '').replace(/\.pdf$/i, '').slice(0, 80));
  const [melding, setMelding] = useState('');
  const [rekkefolge, setRekkefolge] = useState(false);
  const [frist, setFrist] = useState(10);
  const [signatarer, setSignatarer] = useState([]);
  const [nyNavn, setNyNavn] = useState('');
  const [nyEpost, setNyEpost] = useState('');

  const erPdf = /pdf$/i.test(String(det.type || '')) || /\.pdf$/i.test(String(det.name || ''));
  const jobber = det.signering || [];
  const aktiv = jobber.find((j) => j.status === 'I_GANG');
  const siste = jobber[0];

  const leggTil = (s) => {
    if (!s.epost && !s.mobil) return;
    if (signatarer.some((x) => x.epost && x.epost === s.epost)) return;
    if (signatarer.length >= 10) { visToast('Maks 10 signatarer', 'feil'); return; }
    setSignatarer((prev) => [...prev, s]);
  };
  const flytt = (i, retn) => setSignatarer((prev) => {
    const n = [...prev]; const j = i + retn;
    if (j < 0 || j >= n.length) return prev;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const send = async () => {
    if (!signatarer.length) { visToast('Legg til minst én signatar', 'feil'); return; }
    setBusy('send');
    try {
      const r = await api(`task-files/${det.id}/signering`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tittel, melding, dagerFrist: frist, actor,
          signatarer: signatarer.map((s, i) => ({ ...s, rekkefolge: rekkefolge ? i + 1 : undefined })),
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke sende til signering');
      visToast('Sendt til BankID-signering — signatarene varsles av Posten');
      setVisSkjema(false); setSignatarer([]);
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
  };

  const kanseller = async () => {
    if (!aktiv || !window.confirm('Kansellere signeringsrunden? Signatarer som ikke har signert mister tilgangen.')) return;
    setBusy('kanseller');
    try {
      const r = await api(`signering/${aktiv.id}/kanseller`, { method: 'POST' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kansellering feilet');
      visToast('Signeringsrunden er kansellert');
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
  };

  const pollNaa = async () => {
    setBusy('poll');
    try { await api('signering/poll', { method: 'POST' }); await onOppdatert(); } catch (e) { /* stille */ }
    setBusy('');
  };

  const purr = async () => {
    if (!aktiv) return;
    setBusy('purr');
    try {
      const r = await api(`signering/${aktiv.id}/purring`, { method: 'POST' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Purring feilet');
      visToast(`Påminnelse sendt til ${j.sendt} signatar${j.sendt === 1 ? '' : 'er'}`);
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
  };

  return (
    <section data-testid="dok-signering">
      <p className={SEK_TITTEL}><PenLine className="h-3.5 w-3.5" /> BankID-signering</p>

      {/* Status for siste/aktiv runde */}
      {siste && (
        <div className="mt-2 rounded-xl border border-black/[0.06] bg-[#fbfaf9] p-3.5" data-testid="dok-signering-status">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className={`h-4 w-4 ${(JOBB_ETIKETT[siste.status] || {}).cls || 'text-[#999]'}`} />
            <p className={`text-[13px] font-semibold ${(JOBB_ETIKETT[siste.status] || {}).cls || 'text-[#666]'}`}>{(JOBB_ETIKETT[siste.status] || {}).l || siste.status}</p>
            <span className="text-[11px] text-[#aaa]">· {fmtDato(siste.opprettet)}</span>
            <span className="ml-auto flex items-center gap-1.5">
              {aktiv && erAdmin && (
                <>
                  <button onClick={purr} disabled={!!busy} title="Send påminnelse på e-post til dem som ikke har signert" className="flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-[#999] hover:bg-white hover:text-[#8b5cf6]" data-testid="dok-signering-purr">
                    <Send className="h-3 w-3" /> {busy === 'purr' ? 'Sender…' : 'Purr'}
                  </button>
                  <button onClick={pollNaa} disabled={!!busy} title="Hent status fra Posten nå" className="flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-[#999] hover:bg-white hover:text-[#8b5cf6]">
                    <RefreshCw className={`h-3 w-3 ${busy === 'poll' ? 'animate-spin' : ''}`} /> Oppdater
                  </button>
                  <button onClick={kanseller} disabled={!!busy} data-testid="dok-signering-kanseller" className="flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-[#999] hover:bg-rose-50 hover:text-rose-600">
                    <Ban className="h-3 w-3" /> Kanseller
                  </button>
                </>
              )}
            </span>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {(siste.signatarer || []).map((s, i) => {
              const st = SIGNATAR_ETIKETT[s.status] || SIGNATAR_ETIKETT.VENTER;
              return (
                <div key={i} className="flex items-center gap-2.5 text-[12.5px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#999] shadow-sm">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[#444]">{s.navn || s.epost || s.mobil}{s.navn && s.epost ? <span className="text-[#b5b5b5]"> · {s.epost}</span> : ''}</span>
                  {s.signertAt && <span className="text-[10.5px] text-[#b5b5b5]">{fmtDato(s.signertAt)}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${st.cls}`}>{st.l}</span>
                </div>
              );
            })}
          </div>
          {siste.status === 'I_GANG' && <p className="mt-2 text-[11px] text-[#b0aca6]">Signatarene har fått e-post fra DigiHome med personlig signeringslenke. Når alle har signert med BankID, lagres den signerte PDF-en automatisk som ny, låst versjon her.</p>}
        </div>
      )}

      {/* Send til signering */}
      {!aktiv && erAdmin && oppsett?.konfigurert && erPdf && !det.laast && (
        !visSkjema ? (
          <button onClick={() => setVisSkjema(true)} data-testid="dok-signering-start" className={`${KNAPP} mt-2.5`}>
            <PenLine className="h-3.5 w-3.5" /> Send til BankID-signering
          </button>
        ) : (
          <div className="mt-2.5 space-y-3 rounded-xl border border-black/[0.06] p-3.5" data-testid="dok-signering-skjema">
            <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
              <input value={tittel} onChange={(e) => setTittel(e.target.value)} maxLength={80} placeholder="Tittel signatarene ser" className={INPUT} data-testid="sign-tittel" />
              <select value={frist} onChange={(e) => setFrist(Number(e.target.value))} className={INPUT}>
                {[3, 7, 10, 14, 30].map((d) => <option key={d} value={d}>{d} dagers frist</option>)}
              </select>
            </div>
            <input value={melding} onChange={(e) => setMelding(e.target.value)} maxLength={220} placeholder="Melding til signatarene (valgfritt)" className={INPUT} />

            {/* Signatarer */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-semibold text-[#777]">Signatarer{signatarer.length ? ` (${signatarer.length})` : ''}</p>
                <button onClick={() => setRekkefolge(!rekkefolge)} data-testid="sign-rekkefolge" className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${rekkefolge ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f4f2] text-[#777] hover:bg-[#ecece9]'}`}>
                  {rekkefolge ? 'Signerer i rekkefølge' : 'Alle signerer samtidig'}
                </button>
              </div>
              <div className="mt-1.5 space-y-1">
                {signatarer.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-[#fafaf8] px-2.5 py-1.5 text-[12.5px]" data-testid={`sign-rad-${i}`}>
                    {rekkefolge && (
                      <span className="flex flex-col">
                        <button onClick={() => flytt(i, -1)} className="text-[#ccc] hover:text-[#8b5cf6]" aria-label="Flytt opp"><ChevronUp className="h-3 w-3" /></button>
                        <button onClick={() => flytt(i, 1)} className="text-[#ccc] hover:text-[#8b5cf6]" aria-label="Flytt ned"><ChevronDown className="h-3 w-3" /></button>
                      </span>
                    )}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#999] shadow-sm">{rekkefolge ? i + 1 : '•'}</span>
                    <span className="min-w-0 flex-1 truncate text-[#444]">{s.navn || s.epost}{s.navn ? <span className="text-[#b5b5b5]"> · {s.epost}{s.mobil ? ` · ${s.mobil}` : ''}</span> : (s.mobil ? <span className="text-[#b5b5b5]"> · {s.mobil}</span> : '')}</span>
                    <button onClick={() => setSignatarer((p) => p.filter((_, xi) => xi !== i))} className="text-[#ccc] hover:text-rose-500" aria-label="Fjern"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
              {members.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const m = members.find((x) => x.id === e.target.value);
                    if (m) leggTil({ navn: m.name, epost: (m.email || '').toLowerCase(), mobil: '' });
                  }}
                  data-testid="sign-velg-person"
                  className={`${INPUT} mt-1.5`}
                >
                  <option value="">+ Velg fra personer …</option>
                  {members.filter((m) => !signatarer.some((s) => s.epost === (m.email || '').toLowerCase())).map((m) => <option key={m.id} value={m.id}>{m.name} · {m.email}</option>)}
                </select>
              )}
              <div className="mt-1.5 grid grid-cols-[1fr_1.4fr_auto] gap-1.5">
                <input value={nyNavn} onChange={(e) => setNyNavn(e.target.value)} placeholder="Navn" className={INPUT} data-testid="sign-ny-navn" />
                <input value={nyEpost} onChange={(e) => setNyEpost(e.target.value)} placeholder="E-post" type="email" className={INPUT} data-testid="sign-ny-epost" />
                <button
                  onClick={() => { if (nyEpost.trim()) { leggTil({ navn: nyNavn.trim(), epost: nyEpost.trim().toLowerCase(), mobil: '' }); setNyNavn(''); setNyEpost(''); } }}
                  data-testid="sign-legg-til"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f0fb] text-[#8b5cf6] hover:bg-[#ece4fa]"
                  aria-label="Legg til signatar"
                ><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button onClick={send} disabled={busy === 'send' || !signatarer.length} data-testid="sign-send" className={KNAPP}>
                {busy === 'send' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />} Send til signering
              </button>
              <button onClick={() => setVisSkjema(false)} className="text-[12.5px] font-medium text-[#999] hover:text-[#333]">Avbryt</button>
            </div>
            <p className="text-[11px] leading-relaxed text-[#b0aca6]">Hver signatar får en e-post fra DigiHome med personlig signeringsknapp og signerer med BankID hos Posten signering. Ved rekkefølge varsles nestemann automatisk når forrige har signert. Dokumentet blir juridisk bindende signert (PAdES) og lagres her som låst versjon.</p>
          </div>
        )
      )}
      {!aktiv && !erPdf && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#b0aca6]"><AlertCircle className="h-3.5 w-3.5" /> Kun PDF kan sendes til BankID-signering — konverter dokumentet til PDF først.</p>}
      {!aktiv && erPdf && det.laast && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-700"><Lock className="h-3.5 w-3.5" /> Dokumentet er signert og låst. Last opp en ny versjon for å starte en ny runde.</p>}
      {!aktiv && erAdmin && oppsett && !oppsett.konfigurert && erPdf && !det.laast && (
        <SigneringOppsett api={api} setOppsett={setOppsett} visToast={visToast} />
      )}
      {!aktiv && !erAdmin && !siste && <p className="mt-2 text-[12px] text-[#b0aca6]">Kun administratorer kan sende dokumenter til signering.</p>}
    </section>
  );
}

/* Førstegangsoppsett: last opp virksomhetssertifikat (.p12) + passord */
function SigneringOppsett({ api, setOppsett, visToast }) {
  const [passord, setPassord] = useState('');
  const [filB64, setFilB64] = useState('');
  const [filNavn, setFilNavn] = useState('');
  const [lagrer, setLagrer] = useState(false);
  const ref = useRef(null);

  const velgFil = (f) => {
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => { setFilB64(String(fr.result).split(',')[1] || ''); setFilNavn(f.name); };
    fr.readAsDataURL(f);
  };
  const lagre = async () => {
    if (!filB64) { visToast('Velg .p12-filen først', 'feil'); return; }
    setLagrer(true);
    try {
      const r = await api('signering/oppsett', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p12Base64: filB64, passord }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke lagre sertifikatet');
      visToast(`Sertifikat lagret: ${j.subject}`);
      setOppsett({ konfigurert: true, subject: j.subject, utloper: j.utloper });
    } catch (e) { visToast(e.message, 'feil'); }
    setLagrer(false);
  };

  return (
    <div className="mt-2.5 rounded-xl border border-dashed border-[#d9d3ea] bg-[#fbfaff] p-3.5" data-testid="signering-oppsett">
      <p className="text-[12.5px] font-semibold text-[#555]">Engangsoppsett: virksomhetssertifikat</p>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#999]">Last opp Commfides <strong>Auth</strong>-sertifikatet (.p12) og passordet. Lagres kryptert — brukes kun mot Posten signering.</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input ref={ref} type="file" accept=".p12,.pfx" className="hidden" onChange={(e) => velgFil(e.target.files && e.target.files[0])} data-testid="oppsett-p12" />
        <button onClick={() => ref.current && ref.current.click()} className={KNAPP_LYS}>
          <Upload className="h-3.5 w-3.5" /> {filNavn || 'Velg .p12-fil'}
        </button>
        <input value={passord} onChange={(e) => setPassord(e.target.value)} type="password" placeholder="Sertifikatpassord" className={`${INPUT} max-w-[200px]`} data-testid="oppsett-passord" />
        <button onClick={lagre} disabled={lagrer || !filB64} className={KNAPP} data-testid="oppsett-lagre">
          {lagrer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Lagre
        </button>
      </div>
    </div>
  );
}

/* ── Dokumentarkiv ───────────────────────────────────────────────────────────── */
const SYNLIGHETER = [
  { k: 'styret', l: 'Styret', d: 'Kun eier og administratorer' },
  { k: 'investorer', l: 'Investorer', d: 'Også investorer (eier-rollen)' },
  { k: 'alle', l: 'Alle innloggede', d: 'Alle med tilgang til portalen' },
];
const KATEGORIER = ['Protokoller', 'Avtaler', 'Rapporter', 'Økonomi', 'Annet'];

function ArkivSeksjon({ det, api, actor, visToast, onOppdatert, busy, setBusy }) {
  const a = det.arkiv || { aktiv: false };
  const lagre = async (endring) => {
    setBusy('arkiv');
    try {
      const r = await api(`task-files/${det.id}/arkiv`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktiv: a.aktiv, synlighet: a.synlighet || 'styret', kategori: a.kategori || 'Annet', ...endring, actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke oppdatere arkivet');
      visToast(endring.aktiv === false ? 'Fjernet fra dokumentarkivet' : 'Dokumentarkivet er oppdatert');
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
  };

  return (
    <section data-testid="dok-arkiv">
      <p className={SEK_TITTEL}><Archive className="h-3.5 w-3.5" /> Dokumentarkiv</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => lagre({ aktiv: !a.aktiv })}
          disabled={busy === 'arkiv'}
          data-testid="arkiv-toggle"
          className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-colors ${a.aktiv ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f4f2] text-[#777] hover:bg-[#ecece9]'}`}
        >
          {busy === 'arkiv' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />}
          {a.aktiv ? 'I dokumentarkivet' : 'Legg i dokumentarkivet'}
        </button>
        {a.aktiv && (
          <>
            <select value={a.synlighet || 'styret'} onChange={(e) => lagre({ synlighet: e.target.value })} data-testid="arkiv-synlighet" className="h-8 rounded-lg border border-black/[0.08] bg-white px-2 text-[12px] outline-none">
              {SYNLIGHETER.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
            </select>
            <select value={a.kategori || 'Annet'} onChange={(e) => lagre({ kategori: e.target.value })} data-testid="arkiv-kategori" className="h-8 rounded-lg border border-black/[0.08] bg-white px-2 text-[12px] outline-none">
              {KATEGORIER.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-[#b0aca6]">
        {a.aktiv
          ? `Synlig i Datarom → Dokumenter for: ${(SYNLIGHETER.find((s) => s.k === a.synlighet) || SYNLIGHETER[0]).d.toLowerCase()}.`
          : 'Gjør dokumentet tilgjengelig i Datarom → Dokumenter — med styrt synlighet (styret, investorer eller alle innloggede).'}
      </p>
    </section>
  );
}

/* ── Delingslenker for eksterne ──────────────────────────────────────────────── */
function DelingSeksjon({ det, api, actor, visToast, onOppdatert, busy, setBusy }) {
  const [dager, setDager] = useState(7);
  const [kopiert, setKopiert] = useState('');
  const aktive = (det.delinger || []).filter((d) => !d.trukket && new Date(d.utloper) > new Date());

  const opprett = async () => {
    setBusy('deling');
    try {
      const r = await api(`task-files/${det.id}/deling`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dager, actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke opprette lenke');
      visToast('Delingslenke opprettet');
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
  };
  const kopier = (token, id) => {
    navigator.clipboard.writeText(`${window.location.origin}/api/delt/${token}`).then(() => {
      setKopiert(id); setTimeout(() => setKopiert(''), 1800);
    });
  };
  const trekk = async (id) => {
    setBusy(`trekk-${id}`);
    try {
      const r = await api(`task-files/${det.id}/deling/${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke trekke tilbake');
      visToast('Lenken er trukket tilbake');
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
  };

  return (
    <section data-testid="dok-deling">
      <p className={SEK_TITTEL}><Link2 className="h-3.5 w-3.5" /> Deling med eksterne</p>
      <div className="mt-2 flex items-center gap-2">
        <select value={dager} onChange={(e) => setDager(Number(e.target.value))} className="h-8 rounded-lg border border-black/[0.08] bg-white px-2 text-[12px] outline-none">
          {[7, 14, 30, 90].map((d) => <option key={d} value={d}>Gyldig {d} dager</option>)}
        </select>
        <button onClick={opprett} disabled={busy === 'deling'} data-testid="deling-opprett" className={KNAPP_LYS}>
          {busy === 'deling' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Ny lenke
        </button>
      </div>
      {aktive.length > 0 && (
        <div className="mt-2 space-y-1">
          {aktive.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg bg-[#fafaf8] px-2.5 py-1.5 text-[12px]" data-testid={`deling-${d.id}`}>
              <Link2 className="h-3.5 w-3.5 shrink-0 text-[#b5b5b5]" />
              <span className="min-w-0 flex-1 truncate text-[#666]">Utløper {fmtDato(d.utloper).split(' kl.')[0]} · {d.apninger || 0} åpning{(d.apninger || 0) === 1 ? '' : 'er'}</span>
              <button onClick={() => kopier(d.token, d.id)} data-testid={`deling-kopier-${d.id}`} className="flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold text-[#8b5cf6] hover:bg-[#f4f0fb]">
                {kopiert === d.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {kopiert === d.id ? 'Kopiert' : 'Kopier'}
              </button>
              <button onClick={() => trekk(d.id)} disabled={!!busy} title="Trekk tilbake" className="rounded-full p-1.5 text-[#ccc] hover:bg-rose-50 hover:text-rose-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-[#b0aca6]">Alle med lenken kan se dokumentet til den utløper eller trekkes tilbake — for revisor, advokat og andre eksterne.</p>
    </section>
  );
}

/* ── Versjoner ───────────────────────────────────────────────────────────────── */
function VersjonSeksjon({ det, api, apiKey, actor, taskId, visToast, onOppdatert, busy, setBusy }) {
  const ref = useRef(null);
  const [prosent, setProsent] = useState(0);

  const lastOppVersjon = async (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { visToast('Filen er for stor (maks 8 MB)', 'feil'); return; }
    setBusy('versjon'); setProsent(0);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
        fr.onerror = () => reject(new Error('Kunne ikke lese filen'));
        fr.readAsDataURL(file);
      });
      const CHUNK = 900000;
      const total = Math.max(1, Math.ceil(base64.length / CHUNK));
      const uploadId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `v-${Date.now()}`;
      for (let i = 0; i < total; i++) {
        const r = await api('task-files/chunk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId, taskId, index: i, total, versjonAv: det.id,
            data: base64.slice(i * CHUNK, (i + 1) * CHUNK),
            name: file.name, type: file.type || 'application/octet-stream', actor,
          }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Opplasting feilet');
        setProsent(Math.round(((i + 1) / total) * 100));
      }
      visToast('Ny versjon lastet opp');
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
    if (ref.current) ref.current.value = '';
  };

  const gjenopprett = async (v) => {
    if (!window.confirm(`Gjenopprette v${v.versjon} som ny gjeldende versjon?`)) return;
    setBusy('gjenopprett');
    try {
      const r = await api(`task-files/${det.id}/gjenopprett`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versjonId: v.id, actor }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Gjenoppretting feilet');
      visToast(`v${v.versjon} gjenopprettet`);
      await onOppdatert();
    } catch (e) { visToast(e.message, 'feil'); }
    setBusy('');
  };

  return (
    <section data-testid="dok-versjoner">
      <p className={SEK_TITTEL}><History className="h-3.5 w-3.5" /> Versjoner</p>
      <div className="mt-2 flex items-center gap-2.5">
        <input ref={ref} type="file" className="hidden" onChange={(e) => lastOppVersjon(e.target.files && e.target.files[0])} data-testid="versjon-fil" />
        <button onClick={() => ref.current && ref.current.click()} disabled={busy === 'versjon'} data-testid="versjon-lastopp" className={KNAPP_LYS}>
          {busy === 'versjon' ? <><Loader2 className="h-3 w-3 animate-spin" /> {prosent}%</> : <><Upload className="h-3 w-3" /> Last opp ny versjon</>}
        </button>
        <span className="text-[11px] text-[#b0aca6]">Gjeldende: v{det.versjon || 1}{det.laast ? ' (låst)' : ''}</span>
      </div>
      {(det.versjoner || []).length > 0 && (
        <div className="mt-2 space-y-1">
          {det.versjoner.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded-lg bg-[#fafaf8] px-2.5 py-1.5 text-[12px]" data-testid={`versjon-${v.versjon}`}>
              <span className="rounded-[4px] bg-white px-1.5 py-px text-[10.5px] font-bold text-[#888] shadow-sm">v{v.versjon}</span>
              <span className="min-w-0 flex-1 truncate text-[#666]">{v.name} <span className="text-[#b5b5b5]">· {fmtStr(v.size)} · {fmtDato(v.arkivertAt || v.at).split(' kl.')[0]}</span></span>
              <a href={`/api/admin/task-files/${det.id}/versjon/${v.id}?key=${encodeURIComponent(apiKey)}`} download title="Last ned denne versjonen" className="rounded-full p-1.5 text-[#bbb] hover:bg-white hover:text-[#8b5cf6]">
                <Download className="h-3.5 w-3.5" />
              </a>
              {!det.laast && (
                <button onClick={() => gjenopprett(v)} disabled={!!busy} title="Gjenopprett som ny versjon" className="rounded-full p-1.5 text-[#bbb] hover:bg-white hover:text-[#8b5cf6]">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Historikk ───────────────────────────────────────────────────────────────── */
function HistorikkSeksjon({ det }) {
  const logg = det.logg || [];
  if (!logg.length) return null;
  return (
    <section data-testid="dok-historikk">
      <p className={SEK_TITTEL}><Clock className="h-3.5 w-3.5" /> Historikk</p>
      <div className="mt-2 space-y-1">
        {logg.slice(0, 12).map((l, i) => (
          <div key={i} className="flex items-baseline gap-2 text-[12px]">
            <span className="shrink-0 tabular-nums text-[10.5px] text-[#c2beb8]">{fmtDato(l.at)}</span>
            <span className="min-w-0 flex-1 text-[#666]">{l.tekst}{l.av ? <span className="text-[#b5b5b5]"> — {l.av}</span> : ''}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
