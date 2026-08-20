'use client';

/* ═══════════════ Batch-signering — send FLERE dokumenter i ett oppsett ═══════
   Velg dokumenter i listen (Dokumenter-modulen eller saksskuffen), sett opp
   signatarer/rekkefølge/frist ÉN gang → én BankID-runde per dokument (hvert
   dokument får egen signert PAdES-PDF), men signatarene får ÉN samle-e-post
   med alle lenkene og føres automatisk videre til neste dokument etter hvert
   som de signerer. Word-filer konverteres automatisk til PDF først. */

import { useState, useEffect } from 'react';
import { X, Plus, ChevronUp, ChevronDown, PenLine, Loader2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const INPUT = 'h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12.5px] outline-none transition-colors placeholder:text-[#c2beb8] focus:border-[#7c3aed]/50';
const KNAPP = 'inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-black/85 disabled:opacity-50';

export default function SigneringBatchModal({ filer, apiKey, actor, onClose, onDone, visToast }) {
  const [signatarer, setSignatarer] = useState([]);
  const [members, setMembers] = useState([]);
  const [rekkefolge, setRekkefolge] = useState(false);
  const [frist, setFrist] = useState(10);
  const [melding, setMelding] = useState('');
  const [nyNavn, setNyNavn] = useState('');
  const [nyEpost, setNyEpost] = useState('');
  const [sender, setSender] = useState(false);
  const [resultat, setResultat] = useState(null); // {opprettet, feilet, epostSendt}

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/users?key=${encodeURIComponent(apiKey)}`);
        const j = await r.json();
        if (j.ok) setMembers((j.members || []).filter((m) => m.email));
      } catch (e) { /* stille */ }
    })();
  }, [apiKey]);

  const leggTil = (s) => {
    if (!s.epost) return;
    if (signatarer.some((x) => x.epost === s.epost)) return;
    if (signatarer.length >= 10) { visToast('Maks 10 signatarer', 'feil'); return; }
    setSignatarer((prev) => [...prev, s]);
  };
  const flytt = (i, retn) => setSignatarer((prev) => {
    const n = [...prev]; const j = i + retn;
    if (j < 0 || j >= n.length) return prev;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const erDocx = (f) => /wordprocessingml/i.test(String(f.type || '')) || /\.docx$/i.test(String(f.name || ''));

  const send = async () => {
    if (!signatarer.length) { visToast('Legg til minst én signatar', 'feil'); return; }
    setSender(true);
    try {
      const r = await fetch(`/api/admin/task-files/signering-batch?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filIds: filer.map((f) => f.id),
          signatarer: signatarer.map((s, i) => ({ ...s, rekkefolge: rekkefolge ? i + 1 : undefined })),
          dagerFrist: frist,
          melding,
          actor,
        }),
      });
      const j = await r.json();
      if (!j.ok && !(j.opprettet || []).length) throw new Error((j.feilet && j.feilet[0] && j.feilet[0].error) || j.error || 'Utsendelsen feilet');
      setResultat(j);
      if (!(j.feilet || []).length) {
        visToast(`${j.opprettet.length} dokumenter sendt til BankID-signering — signatarene har fått én samle-e-post`);
        onDone();
        onClose();
      }
    } catch (e) { visToast(e.message, 'feil'); }
    setSender(false);
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose} data-testid="batch-signering-modal">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-[560px] sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16.5px] font-bold tracking-tight text-[#0a0a0a]">Send {filer.length} dokumenter til signering</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#a8a29a]">Ett oppsett — én BankID-runde per dokument. Signatarene får én samle-e-post med alle dokumentene og føres automatisk videre til neste etter hvert som de signerer.</p>
          </div>
          <button onClick={onClose} className="mt-0.5 shrink-0 text-[#c2beb8] hover:text-[#57534e]" aria-label="Lukk"><X className="h-5 w-5" /></button>
        </div>

        {/* Valgte dokumenter */}
        <div className="mt-4 overflow-hidden rounded-xl border border-black/[0.06]">
          {filer.map((f, i) => (
            <div key={f.id} className={`flex items-center gap-2.5 px-3 py-2 ${i ? 'border-t border-black/[0.04]' : ''}`} data-testid={`batch-fil-${f.id}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f4f0fb] text-[10px] font-bold text-[#7c3aed]">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#1c1917]">{f.name}</span>
              {erDocx(f) && <span className="shrink-0 rounded-[4px] bg-[#fdf3e0] px-1.5 py-px text-[9.5px] font-bold text-[#b45309]">Word → PDF automatisk</span>}
            </div>
          ))}
        </div>

        {/* Resultat ved delvis feil */}
        {resultat && (resultat.feilet || []).length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3" data-testid="batch-resultat">
            {(resultat.opprettet || []).length > 0 && (
              <p className="flex items-start gap-1.5 text-[12px] font-medium text-emerald-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {resultat.opprettet.length} dokument{resultat.opprettet.length === 1 ? '' : 'er'} sendt til signering.</p>
            )}
            {resultat.feilet.map((f, i) => (
              <p key={i} className="flex items-start gap-1.5 text-[12px] text-amber-800"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span><strong className="font-semibold">{f.name}</strong>: {f.error}</span></p>
            ))}
          </div>
        )}

        {/* Oppsett */}
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px]">
          <input value={melding} onChange={(e) => setMelding(e.target.value)} maxLength={220} placeholder="Melding til signatarene (valgfritt)" className={INPUT} data-testid="batch-melding" />
          <select value={frist} onChange={(e) => setFrist(Number(e.target.value))} className={INPUT} data-testid="batch-frist">
            {[3, 7, 10, 14, 30].map((d) => <option key={d} value={d}>{d} dagers frist</option>)}
          </select>
        </div>

        {/* Signatarer */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-semibold text-[#777]">Signatarer{signatarer.length ? ` (${signatarer.length})` : ''} — gjelder alle dokumentene</p>
            <button onClick={() => setRekkefolge(!rekkefolge)} data-testid="batch-rekkefolge" className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${rekkefolge ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f4f2] text-[#777] hover:bg-[#ecece9]'}`}>
              {rekkefolge ? 'Signerer i rekkefølge' : 'Alle signerer samtidig'}
            </button>
          </div>
          <div className="mt-1.5 space-y-1">
            {signatarer.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[#fafaf8] px-2.5 py-1.5 text-[12.5px]" data-testid={`batch-signatar-${i}`}>
                {rekkefolge && (
                  <span className="flex flex-col">
                    <button onClick={() => flytt(i, -1)} className="text-[#ccc] hover:text-[#8b5cf6]" aria-label="Flytt opp"><ChevronUp className="h-3 w-3" /></button>
                    <button onClick={() => flytt(i, 1)} className="text-[#ccc] hover:text-[#8b5cf6]" aria-label="Flytt ned"><ChevronDown className="h-3 w-3" /></button>
                  </span>
                )}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#999] shadow-sm">{rekkefolge ? i + 1 : '•'}</span>
                <span className="min-w-0 flex-1 truncate text-[#444]">{s.navn || s.epost}{s.navn ? <span className="text-[#b5b5b5]"> · {s.epost}</span> : ''}</span>
                <button onClick={() => setSignatarer((p) => p.filter((_, xi) => xi !== i))} className="text-[#ccc] hover:text-rose-500" aria-label="Fjern"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          {members.filter((m) => !signatarer.some((s) => s.epost === (m.email || '').toLowerCase())).length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#b5b5b5]">Fra systemet:</span>
              {members.filter((m) => !signatarer.some((s) => s.epost === (m.email || '').toLowerCase())).map((m) => (
                <button
                  key={m.id}
                  onClick={() => leggTil({ navn: m.name || '', epost: (m.email || '').toLowerCase(), mobil: '' })}
                  data-testid={`batch-velg-${m.id}`}
                  className="group flex items-center gap-1.5 rounded-full bg-[#f4f4f2] py-1 pl-1 pr-2.5 text-[11.5px] font-semibold text-[#555] transition-all hover:bg-[#ece4fa] hover:text-[#6d28d9] active:scale-95"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: m.color || '#8b5cf6' }}>
                    {String(m.name || m.email || '?').trim().slice(0, 1).toUpperCase()}
                  </span>
                  {m.name || m.email}
                  <Plus className="h-3 w-3 text-[#c5c1ba] transition-colors group-hover:text-[#8b5cf6]" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-1.5 grid grid-cols-[1fr_1.4fr_auto] gap-1.5">
            <input value={nyNavn} onChange={(e) => setNyNavn(e.target.value)} placeholder="Navn" className={INPUT} data-testid="batch-ny-navn" />
            <input value={nyEpost} onChange={(e) => setNyEpost(e.target.value)} placeholder="E-post" type="email" className={INPUT} data-testid="batch-ny-epost" />
            <button
              onClick={() => { if (nyEpost.trim()) { leggTil({ navn: nyNavn.trim(), epost: nyEpost.trim().toLowerCase(), mobil: '' }); setNyNavn(''); setNyEpost(''); } }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f0fb] text-[#8b5cf6] hover:bg-[#ece4fa]"
              aria-label="Legg til signatar"
              data-testid="batch-legg-til"
            ><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <button onClick={send} disabled={sender || !signatarer.length} data-testid="batch-send" className={KNAPP}>
            {sender ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />} Send {filer.length} dokumenter til signering
          </button>
          <button onClick={onClose} className="text-[12.5px] font-medium text-[#999] hover:text-[#333]">Avbryt</button>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#b0aca6]">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Hvert dokument signeres for seg og får sin egen juridisk bindende signerte PDF (PAdES) som lagres som låst versjon og arkiveres automatisk. Word-filer konverteres til PDF før utsendelse — kontroller gjerne PDF-ene visuelt etterpå.</span>
        </p>
      </div>
    </div>
  );
}
