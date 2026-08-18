'use client';

/* ═══════════════ Dokumenter — samlet dokumenthub med Signering som undermodul ═══
   Fane 1 «Dokumenter»: frittstående dokumenter (opplasting) + dokumentarkivet
   (arkiverte saksdokumenter med synlighet). Fane 2 «Signering»: alle BankID-
   signeringsrunder med status, purring og «send nytt dokument til signering».
   Alle handlinger (signering/arkiv/deling/versjoner) skjer i DokumentModal —
   frittstående dokumenter lever under sentinel-taskId 'DOKUMENTER'. */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  PenLine, Upload, Loader2, FileText, ShieldCheck, Clock, CheckCircle2,
  XCircle, Ban, ChevronRight, Send, RefreshCw, Search, Archive, FolderOpen,
} from 'lucide-react';
import DokumentModal from './DokumentModal';

const fmtDato = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
};
const fmtStr = (b) => {
  const n = Number(b) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
};

const STATUS_CHIP = {
  I_GANG: { l: 'Pågår', cls: 'bg-[#f4f0fb] text-[#7c3aed]', Ikon: Clock },
  FULLFORT: { l: 'Fullført', cls: 'bg-emerald-50 text-emerald-700', Ikon: CheckCircle2 },
  FEILET: { l: 'Stoppet', cls: 'bg-rose-50 text-rose-600', Ikon: XCircle },
  KANSELLERT: { l: 'Kansellert', cls: 'bg-[#f4f4f2] text-[#a8a29a]', Ikon: Ban },
};
const PRIKK = { SIGNERT: 'bg-emerald-500', VENTER: 'bg-[#d6d3cd]', AVVIST: 'bg-rose-500', UTLOPT: 'bg-amber-500' };
const SYN_ETIKETT = { styret: 'Styret', investorer: 'Investorer', alle: 'Alle innloggede' };

export default function DokumenterModul({ apiKey, user }) {
  const [tab, setTab] = useState('dokumenter'); // 'dokumenter' | 'signering'
  const [jobber, setJobber] = useState([]);
  const [mine, setMine] = useState([]); // runder som venter på DIN signatur
  const [pollInfo, setPollInfo] = useState(null); // {sist, neste} — Posten-polling
  const [dokumenter, setDokumenter] = useState([]);
  const [arkiv, setArkiv] = useState([]);
  const [oppsett, setOppsett] = useState(null);
  const [lastet, setLastet] = useState(false);
  const [sok, setSok] = useState('');
  const [filter, setFilter] = useState('alle');
  const [dokFil, setDokFil] = useState(null); // {id,name,type,size,taskId} → DokumentModal
  const [lasterOpp, setLasterOpp] = useState(false);
  const [prosent, setProsent] = useState(0);
  const [drar, setDrar] = useState(false);
  const [toast, setToast] = useState(null);
  const filRef = useRef(null);
  const actor = (user && (user.name || user.email)) || 'Admin';

  const api = useCallback((path, opts = {}) => {
    const sep = path.includes('?') ? '&' : '?';
    return fetch(`/api/admin/${path}${sep}key=${encodeURIComponent(apiKey)}`, opts);
  }, [apiKey]);

  const visToast = useCallback((tekst, type = 'ok') => {
    setToast({ tekst, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const hentAlt = useCallback(async () => {
    try {
      const [rj, rd, ra, ro, rm] = await Promise.all([
        api('signering/jobber'), api('dokumenter'), api('dokumentarkiv'), api('signering/oppsett'), api('signering/mine'),
      ]);
      const [jj, jd, ja, jo, jm] = await Promise.all([rj.json(), rd.json(), ra.json(), ro.json(), rm.json()]);
      if (jj.ok) { setJobber(jj.jobber || []); setPollInfo(jj.poll || null); }
      if (jd.ok) setDokumenter(jd.filer || []);
      if (ja.ok) setArkiv(ja.filer || []);
      if (jo.ok) setOppsett(jo.oppsett || null);
      if (jm.ok) setMine(jm.ventende || []);
    } catch (e) { /* stille */ }
    setLastet(true);
  }, [api]);

  useEffect(() => { hentAlt(); }, [hentAlt]);
  const harAktive = useMemo(() => jobber.some((j) => j.status === 'I_GANG'), [jobber]);
  useEffect(() => {
    if (!harAktive) return undefined;
    const t = setInterval(hentAlt, 20000);
    return () => clearInterval(t);
  }, [harAktive, hentAlt]);

  /* ── Opplasting av frittstående dokument (chunk → sentinel-taskId) ────────── */
  const lastOpp = async (file) => {
    if (!file || lasterOpp) return;
    if (file.size > 8 * 1024 * 1024) { visToast('Filen er for stor (maks 8 MB)', 'feil'); return; }
    setLasterOpp(true); setProsent(0);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
        fr.onerror = () => reject(new Error('Kunne ikke lese filen'));
        fr.readAsDataURL(file);
      });
      const CHUNK = 900000;
      const total = Math.max(1, Math.ceil(base64.length / CHUNK));
      const uploadId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `dok-${Date.now()}`;
      let siste = null;
      for (let i = 0; i < total; i++) {
        const r = await api('task-files/chunk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId, taskId: 'DOKUMENTER', index: i, total,
            data: base64.slice(i * CHUNK, (i + 1) * CHUNK),
            name: file.name, type: file.type || 'application/octet-stream', actor,
          }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Opplasting feilet');
        siste = j;
        setProsent(Math.round(((i + 1) / total) * 100));
      }
      await hentAlt();
      visToast('Dokumentet er lastet opp');
      // Åpne dokumentpanelet direkte så signering/arkivering kan gjøres med én gang
      if (siste && siste.attachment) setDokFil({ ...siste.attachment });
    } catch (e) { visToast(e.message, 'feil'); }
    setLasterOpp(false);
    if (filRef.current) filRef.current.value = '';
  };

  /* ── Filtrering (Signering-fanen) ─────────────────────────────────────────── */
  const filtrerte = useMemo(() => {
    let liste = jobber;
    if (filter !== 'alle') liste = liste.filter((j) => j.status === filter);
    const q = sok.trim().toLowerCase();
    if (q) {
      liste = liste.filter((j) =>
        (j.tittel || '').toLowerCase().includes(q)
        || (j.filNavn || '').toLowerCase().includes(q)
        || (j.sakTittel || '').toLowerCase().includes(q)
        || (j.signatarer || []).some((s) => (s.navn || '').toLowerCase().includes(q) || (s.epost || '').toLowerCase().includes(q)));
    }
    return liste;
  }, [jobber, filter, sok]);

  const antall = useMemo(() => ({
    alle: jobber.length,
    I_GANG: jobber.filter((j) => j.status === 'I_GANG').length,
    FULLFORT: jobber.filter((j) => j.status === 'FULLFORT').length,
  }), [jobber]);

  const aapneJobb = (j) => {
    if (j.fil) setDokFil({ id: j.fil.id, name: j.fil.name, type: j.fil.type, size: j.fil.size, taskId: j.taskId });
    else visToast('Dokumentet finnes ikke lenger', 'feil');
  };

  /* ── Delt dropzone (litt ulik tekst per fane) ─────────────────────────────── */
  const Dropzone = ({ tittel, under, knapp, Ikon }) => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrar(true); }}
      onDragLeave={() => setDrar(false)}
      onDrop={(e) => { e.preventDefault(); setDrar(false); lastOpp(e.dataTransfer.files && e.dataTransfer.files[0]); }}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${drar ? 'border-[#7c3aed]/60 bg-[#f8f5ff]' : 'border-black/[0.09] bg-white hover:border-black/[0.16]'}`}
      data-testid="dokumenter-dropzone"
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f0fb]">
        <Ikon className="h-5 w-5 text-[#7c3aed]" />
      </div>
      <p className="mt-3 text-[14.5px] font-semibold text-[#0a0a0a]">{tittel}</p>
      <p className="mx-auto mt-1 max-w-[440px] text-[12.5px] leading-relaxed text-[#a8a29a]">{under}</p>
      <button
        onClick={() => filRef.current && filRef.current.click()}
        disabled={lasterOpp}
        data-testid="dokumenter-lastopp"
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-[#0a0a0a] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-black/85 disabled:opacity-60"
      >
        {lasterOpp ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Laster opp … {prosent}%</> : <><Upload className="h-3.5 w-3.5" /> {knapp}</>}
      </button>
    </div>
  );

  /* ── Dokumentrad (gjenbrukes for frittstående + arkiv) ────────────────────── */
  const DokRad = ({ f, taskId, sakTittel, forste }) => (
    <button
      onClick={() => setDokFil({ id: f.id, name: f.name, type: f.type, size: f.size, taskId })}
      data-testid={`dokumenter-fil-${f.id}`}
      className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fbfaf9] ${forste ? '' : 'border-t border-black/[0.04]'}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f4f1]"><FileText className="h-4 w-4 text-[#a8a29a]" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-medium text-[#1c1917]">{f.name}</span>
          {(f.versjon || 1) > 1 && <span className="rounded-[4px] bg-[#f4f4f2] px-1 py-px text-[9.5px] font-bold text-[#888]">v{f.versjon}</span>}
          {f.laast && <span className="rounded-[4px] bg-emerald-50 px-1 py-px text-[9.5px] font-bold text-emerald-700">Signert</span>}
          {!f.laast && f.signering?.status === 'I_GANG' && <span className="rounded-[4px] bg-[#f4f0fb] px-1 py-px text-[9.5px] font-bold text-[#7c3aed]">Til signering</span>}
          {f.arkiv?.aktiv && f.arkiv?.synlighet && <span className="rounded-[4px] bg-[#f4f4f2] px-1 py-px text-[9.5px] font-bold text-[#888]">{SYN_ETIKETT[f.arkiv.synlighet] || f.arkiv.synlighet}</span>}
        </span>
        <span className="block truncate text-[11px] text-[#b0aca6]">
          {fmtStr(f.size)}{sakTittel ? <> · fra saken «{sakTittel}»</> : <> · lastet opp {fmtDato(f.at)}{f.uploadedBy ? ` av ${f.uploadedBy}` : ''}</>}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#d6d3cd] transition-colors group-hover:text-[#7c3aed]" />
    </button>
  );

  if (!lastet) {
    return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-[#c2beb8]" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1100px]" data-testid="dokumenter-modul">
      <input ref={filRef} type="file" accept=".pdf,application/pdf,.docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xlsx,.pptx,image/*" className="hidden" onChange={(e) => lastOpp(e.target.files && e.target.files[0])} data-testid="dokumenter-filinput" />

      {/* Fanevelger: Dokumenter · Signering */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-[9px] border border-black/[0.07] bg-[#f7f6f3] p-0.5">
          {[
            ['dokumenter', 'Dokumenter', null, false],
            ['signering', 'Signering', mine.length || antall.I_GANG || null, mine.length > 0],
          ].map(([k, l, badge, deg]) => (
            <button key={k} onClick={() => setTab(k)} data-testid={`dokumenter-tab-${k}`}
              className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold transition-all ${tab === k ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#a8a29a] hover:text-[#57534e]'}`}>
              {l}
              {badge ? <span className={`rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${deg ? 'bg-amber-100 text-amber-700' : 'bg-[#f4f0fb] text-[#7c3aed]'}`}>{badge}</span> : null}
            </button>
          ))}
        </div>
        <button onClick={hentAlt} className="ml-auto flex items-center gap-1 text-[11.5px] font-medium text-[#a8a29a] transition-colors hover:text-[#57534e]">
          <RefreshCw className="h-3 w-3" /> Oppdater
        </button>
      </div>

      {/* ═══ FANE: DOKUMENTER — bibliotek + arkiv ═══ */}
      {tab === 'dokumenter' && (
        <div className="mt-4">
          <Dropzone
            Ikon={FolderOpen}
            tittel="Last opp et dokument"
            under="Slipp en fil her, eller velg fil — deretter kan du arkivere, dele eller sende den til BankID-signering fra dokumentpanelet"
            knapp="Velg fil"
          />

          {/* Frittstående dokumenter */}
          <div className="mt-6">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a8a29a]">Frittstående dokumenter{dokumenter.length ? ` · ${dokumenter.length}` : ''}</p>
            {dokumenter.length === 0 ? (
              <div className="mt-2 rounded-2xl border border-black/[0.06] bg-white px-6 py-10 text-center">
                <FileText className="mx-auto h-5 w-5 text-[#d6d3cd]" />
                <p className="mt-2.5 text-[13px] text-[#a8a29a]">Ingen frittstående dokumenter ennå — last opp over.</p>
              </div>
            ) : (
              <div className="mt-2 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                {dokumenter.map((f, i) => <DokRad key={f.id} f={f} taskId="DOKUMENTER" forste={i === 0} />)}
              </div>
            )}
          </div>

          {/* Dokumentarkiv (arkiverte saksdokumenter) */}
          <div className="mt-7">
            <p className={'flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a8a29a]'}>
              <Archive className="h-3 w-3" /> Dokumentarkiv{arkiv.length ? ` · ${arkiv.length}` : ''}
            </p>
            {arkiv.length === 0 ? (
              <div className="mt-2 rounded-2xl border border-black/[0.06] bg-white px-6 py-10 text-center">
                <Archive className="mx-auto h-5 w-5 text-[#d6d3cd]" />
                <p className="mx-auto mt-2.5 max-w-[460px] text-[13px] leading-relaxed text-[#a8a29a]">Ingen arkiverte dokumenter ennå. Åpne et saksvedlegg og velg «Legg i dokumentarkivet» — da blir det synlig her og i Datarom → Dokumenter, med styrt synlighet.</p>
              </div>
            ) : (
              <div className="mt-2 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                {arkiv.map((f, i) => <DokRad key={f.id} f={f} taskId={f.taskId} sakTittel={f.taskId === 'DOKUMENTER' ? '' : f.sakTittel} forste={i === 0} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ FANE: SIGNERING — undermodul ═══ */}
      {tab === 'signering' && (
        <div className="mt-4" data-testid="signering-modul">
          {/* Sertifikat-/statuslinje */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-[#a8a29a]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className={`h-3.5 w-3.5 ${oppsett?.konfigurert ? 'text-emerald-500' : 'text-rose-500'}`} />
              {oppsett?.konfigurert
                ? <>Posten signering aktiv · sertifikat gyldig til <span className="font-semibold tabular-nums text-[#78716c]">{fmtDato(oppsett.utloper)}</span></>
                : 'Virksomhetssertifikat mangler — signering er ikke tilgjengelig'}
            </span>
            {antall.I_GANG > 0 && <span className="flex items-center gap-1.5 font-medium text-[#7c3aed]"><Clock className="h-3 w-3" /> {antall.I_GANG} runde{antall.I_GANG === 1 ? '' : 'r'} pågår</span>}
            {pollInfo?.sist && (
              <span className="flex items-center gap-1.5" title={pollInfo.neste ? `Neste sjekk tidligst ${new Date(pollInfo.neste).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}` : ''} data-testid="signering-pollinfo">
                <RefreshCw className="h-3 w-3" /> Statussjekk mot Posten {new Date(pollInfo.sist).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* ── Venter på DIN signatur ──────────────────────────────────────── */}
          {mine.length > 0 && (
            <div className="mt-4" data-testid="signering-mine">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber-600">
                <PenLine className="h-3 w-3" /> Venter på din signatur · {mine.length}
              </p>
              <div className="mt-2 space-y-2">
                {mine.map((m) => (
                  <div key={m.jobbId} data-testid={`signering-min-${m.jobbId}`}
                    className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/80">
                      <PenLine className="text-amber-700" style={{ height: 18, width: 18 }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-[#0a0a0a]">{m.tittel}</span>
                      <span className="mt-0.5 block text-[11.5px] text-[#a8a29a]">
                        {m.av ? <>Sendt av {m.av} · </> : ''}frist <span className="font-semibold text-[#78716c]">{fmtDato(m.frist)}</span> · {m.signert}/{m.antall} har signert
                      </span>
                      {!m.paaTur && (
                        <span className="mt-1 block text-[11.5px] font-medium text-amber-700">Signeres i rekkefølge — du får e-post når det er din tur</span>
                      )}
                    </span>
                    {m.paaTur && m.lenke ? (
                      <a href={m.lenke} target="_blank" rel="noopener noreferrer" data-testid={`signering-signernaa-${m.jobbId}`}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0a0a0a] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-black/85">
                        Signer med BankID <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    ) : m.paaTur ? (
                      <span className="shrink-0 text-[11.5px] font-medium text-[#a8a29a]">Bruk lenken i e-posten din</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nytt dokument til signering */}
          <div className="mt-4">
            <Dropzone
              Ikon={PenLine}
              tittel="Send et dokument til BankID-signering"
              under="Slipp en PDF her, eller velg fil — så velger du signatarer, rekkefølge og frist i neste steg"
              knapp="Velg dokument"
            />
          </div>

          {/* Alle signeringsrunder */}
          <div className="mt-7">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-auto text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a8a29a]">Signeringsrunder{jobber.length ? ` · ${jobber.length}` : ''}</p>
              <div className="flex rounded-[8px] border border-black/[0.07] bg-[#f7f6f3] p-0.5">
                {[['alle', `Alle${antall.alle ? ` ${antall.alle}` : ''}`], ['I_GANG', `Pågår${antall.I_GANG ? ` ${antall.I_GANG}` : ''}`], ['FULLFORT', `Fullført${antall.FULLFORT ? ` ${antall.FULLFORT}` : ''}`]].map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)} data-testid={`signering-filter-${k}`}
                    className={`rounded-[6.5px] px-2.5 py-1 text-[11.5px] font-medium transition-all ${filter === k ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#a8a29a] hover:text-[#57534e]'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c2beb8]" />
                <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk …" data-testid="signering-sok"
                  className="h-8 w-[150px] rounded-[8px] border border-black/[0.07] bg-white pl-8 pr-2 text-[12px] outline-none transition-all placeholder:text-[#c2beb8] focus:w-[190px] focus:border-[#7c3aed]/40" />
              </div>
            </div>

            {filtrerte.length === 0 ? (
              <div className="mt-2 rounded-2xl border border-black/[0.06] bg-white px-6 py-12 text-center">
                <Send className="mx-auto h-5 w-5 text-[#d6d3cd]" />
                <p className="mt-2.5 text-[13px] text-[#a8a29a]">{jobber.length === 0 ? 'Ingen signeringsrunder ennå — last opp et dokument over, eller send fra et saksvedlegg.' : 'Ingen treff med gjeldende filter.'}</p>
              </div>
            ) : (
              <div className="mt-2 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                {filtrerte.map((j, i) => {
                  const chip = STATUS_CHIP[j.status] || STATUS_CHIP.I_GANG;
                  const signert = (j.signatarer || []).filter((s) => s.status === 'SIGNERT').length;
                  return (
                    <button
                      key={j.id}
                      onClick={() => aapneJobb(j)}
                      data-testid={`signering-jobb-${j.id}`}
                      className={`group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-[#fbfaf9] sm:gap-4 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}
                    >
                      <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${j.status === 'FULLFORT' ? 'bg-emerald-50' : 'bg-[#f5f4f1]'}`}>
                        <chip.Ikon className={`h-4 w-4 ${j.status === 'FULLFORT' ? 'text-emerald-600' : j.status === 'I_GANG' ? 'text-[#7c3aed]' : 'text-[#a8a29a]'}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="truncate text-[13.5px] font-semibold text-[#0a0a0a]">{j.tittel}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}>{chip.l}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-[#a8a29a]">
                          {j.filNavn}{j.sakTittel ? <> · fra saken «{j.sakTittel}»</> : ''} · sendt {fmtDato(j.opprettet)}{j.av ? ` av ${j.av}` : ''}
                        </span>
                      </span>
                      {/* Signatar-fremdrift */}
                      <span className="hidden shrink-0 items-center gap-2 md:flex">
                        <span className="flex items-center gap-1">
                          {(j.signatarer || []).slice(0, 6).map((s, si) => (
                            <span key={si} title={`${s.navn || s.epost}: ${s.status}`} className={`h-[7px] w-[7px] rounded-full ${PRIKK[s.status] || PRIKK.VENTER}`} />
                          ))}
                        </span>
                        <span className="text-[11.5px] tabular-nums text-[#a8a29a]">{signert}/{(j.signatarer || []).length}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#d6d3cd] transition-colors group-hover:text-[#7c3aed]" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DokumentModal — samme panel som i Saker (signering/arkiv/deling/versjoner) */}
      {dokFil && (
        <DokumentModal
          fil={dokFil}
          taskId={dokFil.taskId || 'DOKUMENTER'}
          apiKey={apiKey}
          api={api}
          actor={actor}
          onClose={() => setDokFil(null)}
          onReload={hentAlt}
          visToast={visToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 z-[200] -translate-x-1/2 rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg ${toast.type === 'feil' ? 'bg-rose-600' : 'bg-[#0a0a0a]'}`}>
          {toast.tekst}
        </div>
      )}
    </div>
  );
}
