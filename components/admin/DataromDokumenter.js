'use client';

/* ═══════════════ Datarom · Dokumenter — best practice DD-arkiv ═══════════════
   Nummerert mappestruktur (01–05 som i profesjonelle due diligence-datarom),
   fritekstsøk, filter (mappe + kun signerte) og PDF-/bildeforhåndsvisning i
   nettleseren — slik at investorer finner frem helt selv.

   To datakilder samles i én visning:
   - Dokumentarkivet (task_files m/ arkiv.aktiv — rollestyrt synlighet)
   - DD-hvelvet (Investor-rom-modulens dokumenter m/ versjoner)               */

import { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Download, Search, X, Loader2, Folder, FolderOpen, PenLine } from 'lucide-react';

/* Nummerert DD-indeks. Arkivkategorier mappes 1:1; hvelv-kategorier og
   filnavn matches med regex. Alt umatchet havner i 05 Annet. */
const MAPPER = [
  { nr: '01', navn: 'Selskap & styring', kat: ['Protokoller'], m: /(protokoll|vedtekt|styre|generalforsamling|stiftelse|aksjeeierbok|cap ?table)/i },
  { nr: '02', navn: 'Avtaler', kat: ['Avtaler'], m: /(avtale|kontrakt|term ?sheet|nda|leie)/i },
  { nr: '03', navn: 'Rapporter', kat: ['Rapporter'], m: /(rapport|presentasjon|deck|notat|analyse)/i },
  { nr: '04', navn: 'Økonomi', kat: ['Økonomi'], m: /(økonomi|regnskap|budsjett|finans|faktura|lån|investorpakke)/i },
  { nr: '05', navn: 'Annet', kat: ['Annet'], m: null },
];

const strl = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} kB`);
const fmtDato = (d) => { try { return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
const SYN_ETIKETT = { styret: 'Styret', investorer: 'Investorer', alle: 'Alle' };

const erPdf = (navn, type) => /pdf/i.test(String(type || '')) || /\.pdf$/i.test(String(navn || ''));
const erBilde = (navn, type) => /^image\//i.test(String(type || '')) || /\.(png|jpe?g|gif|webp|avif)$/i.test(String(navn || ''));

function finnMappe({ kategori, tekst }) {
  if (kategori) {
    const hit = MAPPER.find((m) => m.kat.includes(kategori));
    if (hit) return hit.nr;
  }
  for (const m of MAPPER) {
    if (m.m && m.m.test(String(tekst || ''))) return m.nr;
  }
  return '05';
}

export default function DataromDokumenter({ api, apiKey, erAdmin }) {
  const [arkiv, setArkiv] = useState([]);
  const [hvelv, setHvelv] = useState({ documents: [], categories: [] });
  const [lastet, setLastet] = useState(false);
  const [sok, setSok] = useState('');
  const [mappe, setMappe] = useState(''); // '' = alle
  const [kunSignerte, setKunSignerte] = useState(false);
  const [viser, setViser] = useState(null); // dokument i forhåndsvisning

  useEffect(() => {
    (async () => {
      try {
        const [rA, rH] = await Promise.all([
          fetch(`/api/admin/dokumentarkiv?key=${encodeURIComponent(apiKey)}`).then((r) => r.json()).catch(() => ({})),
          api('dokumenter').catch(() => ({})),
        ]);
        setArkiv((rA && rA.filer) || []);
        setHvelv({ documents: (rH && rH.documents) || [], categories: (rH && rH.categories) || [] });
      } catch (e) { /* stille */ }
      setLastet(true);
    })();
  }, [api, apiKey]);

  /* Samle begge kilder i ett felles format */
  const alle = useMemo(() => {
    const ut = [];
    for (const f of arkiv) {
      ut.push({
        id: `a-${f.id}`,
        navn: f.name,
        undertekst: [f.sakTittel, strl(f.size), `v${f.versjon || 1}`, erAdmin && f.arkiv ? (SYN_ETIKETT[f.arkiv.synlighet] || 'Styret') : null].filter(Boolean).join(' · '),
        dato: (f.arkiv && f.arkiv.at) || f.at || '',
        signert: !!f.laast,
        type: f.type || '',
        mappe: finnMappe({ kategori: f.arkiv && f.arkiv.kategori, tekst: f.name }),
        sokTekst: `${f.name} ${f.sakTittel || ''} ${(f.arkiv && f.arkiv.kategori) || ''}`.toLowerCase(),
        nedlastUrl: `/api/admin/dokumentarkiv/${f.id}?key=${encodeURIComponent(apiKey)}`,
        inlineUrl: `/api/admin/dokumentarkiv/${f.id}?key=${encodeURIComponent(apiKey)}&inline=1`,
      });
    }
    const katLabel = Object.fromEntries((hvelv.categories || []).map((k) => [k.key, k.label]));
    for (const d of hvelv.documents || []) {
      const ver = (d.versions || []).find((v) => v.version === d.currentVersion) || (d.versions || [])[(d.versions || []).length - 1] || {};
      const label = katLabel[d.category] || '';
      ut.push({
        id: `h-${d.id}`,
        navn: d.title || ver.filename || 'Dokument',
        undertekst: [ver.filename !== (d.title || '') ? ver.filename : null, ver.size ? strl(ver.size) : null, `v${d.currentVersion || 1}`].filter(Boolean).join(' · '),
        dato: d.updatedAt || '',
        signert: false,
        type: ver.mime || '',
        filnavn: ver.filename || '',
        mappe: finnMappe({ kategori: null, tekst: `${label} ${d.title || ''} ${ver.filename || ''}` }),
        sokTekst: `${d.title || ''} ${ver.filename || ''} ${label}`.toLowerCase(),
        nedlastUrl: `/api/admin/datarom/fil?docId=${encodeURIComponent(d.id)}&key=${encodeURIComponent(apiKey)}`,
        inlineUrl: `/api/admin/datarom/fil?docId=${encodeURIComponent(d.id)}&key=${encodeURIComponent(apiKey)}&inline=1`,
      });
    }
    ut.sort((a, b) => String(b.dato || '').localeCompare(String(a.dato || '')));
    return ut;
  }, [arkiv, hvelv, apiKey, erAdmin]);

  const antallPerMappe = useMemo(() => {
    const n = {};
    for (const d of alle) n[d.mappe] = (n[d.mappe] || 0) + 1;
    return n;
  }, [alle]);

  const soker = sok.trim().length > 0;
  const synlige = useMemo(() => {
    const q = sok.trim().toLowerCase();
    return alle.filter((d) => (!q || d.sokTekst.includes(q)) && (!mappe || d.mappe === mappe) && (!kunSignerte || d.signert));
  }, [alle, sok, mappe, kunSignerte]);

  if (!lastet) {
    return <div className="h-[260px] animate-pulse rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" />;
  }

  if (!alle.length) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="datarom-dokumenter">
        <FileText className="mx-auto h-8 w-8 text-[#d5d0c8]" />
        <p className="mt-3 text-[14px] font-semibold text-[#555]">Ingen dokumenter delt ennå</p>
        <p className="mt-1 text-[12.5px] text-[#a3a3a3]">{erAdmin ? 'Arkiver dokumenter fra Saker/Dokumenter-modulen eller last opp i Investor-rom — de dukker opp her automatisk.' : 'DigiHome deler rapporter og avtaler her fortløpende.'}</p>
      </div>
    );
  }

  const Rad = ({ d, medMappe }) => {
    const kanVises = erPdf(d.filnavn || d.navn, d.type) || erBilde(d.filnavn || d.navn, d.type);
    const mp = MAPPER.find((m) => m.nr === d.mappe);
    return (
      <div className="group flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-[#fbfaf8]" data-testid={`ddok-${d.id}`}>
        <button
          onClick={() => (kanVises ? setViser(d) : window.open(d.nedlastUrl, '_self'))}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          title={kanVises ? 'Forhåndsvis' : 'Last ned'}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><FileText className="h-4 w-4 text-[#8b5cf6]" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-semibold text-[#0a0a0a]">{d.navn}</span>
              {d.signert && <span className="shrink-0 rounded-[4px] bg-emerald-50 px-1.5 py-px text-[9.5px] font-bold text-emerald-700">Signert</span>}
              {medMappe && mp && <span className="shrink-0 rounded-[4px] bg-[#f4f0fb] px-1.5 py-px text-[9.5px] font-bold text-[#7c3aed]">{mp.nr} {mp.navn}</span>}
            </span>
            <span className="block truncate text-[11.5px] text-[#999]">{d.undertekst}{d.dato ? ` · ${fmtDato(d.dato)}` : ''}</span>
          </span>
        </button>
        <a
          href={d.nedlastUrl}
          onClick={(e) => e.stopPropagation()}
          title="Last ned"
          data-testid={`ddok-nedlast-${d.id}`}
          className="shrink-0 rounded-lg p-2 text-[#d5d0c8] transition-colors hover:bg-[#f4f0fb] hover:text-[#8b5cf6]"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  };

  const mapperMedInnhold = MAPPER.filter((m) => antallPerMappe[m.nr]);

  return (
    <div className="space-y-4" data-testid="datarom-dokumenter">
      {/* Topplinje: tittel + søk + filtre */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#a3a3a3]">Dokumentarkiv</p>
            <p className="text-[12px] text-[#c5c0b8]">{alle.length} dokument{alle.length === 1 ? '' : 'er'} · {mapperMedInnhold.length} mapper</p>
          </div>
          <div className="relative ml-auto w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c5c0b8]" />
            <input
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              placeholder="Søk i dokumenter …"
              data-testid="ddok-sok"
              className="h-9 w-full rounded-full border border-black/[0.06] bg-[#fafaf8] pl-9 pr-8 text-[12.5px] outline-none transition-all placeholder:text-[#c5c0b8] focus:border-[#8b5cf6]/45 focus:bg-white"
            />
            {soker && (
              <button onClick={() => setSok('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c5c0b8] hover:text-[#777]" aria-label="Tøm søk"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
        {/* Nummererte mapper (DD-indeks) */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setMappe('')}
            data-testid="ddok-mappe-alle"
            className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${!mappe ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f4f2] text-[#78716c] hover:bg-[#ecece9]'}`}
          >
            Alle
          </button>
          {mapperMedInnhold.map((m) => (
            <button
              key={m.nr}
              onClick={() => setMappe(mappe === m.nr ? '' : m.nr)}
              data-testid={`ddok-mappe-${m.nr}`}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${mappe === m.nr ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f4f2] text-[#78716c] hover:bg-[#ecece9]'}`}
            >
              <span className={mappe === m.nr ? 'text-[#c4b5fd]' : 'text-[#8b5cf6]'}>{m.nr}</span> {m.navn}
              <span className={`tabular-nums ${mappe === m.nr ? 'text-white/50' : 'text-[#b5b0a8]'}`}>{antallPerMappe[m.nr]}</span>
            </button>
          ))}
          <button
            onClick={() => setKunSignerte(!kunSignerte)}
            data-testid="ddok-kun-signerte"
            className={`ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors ${kunSignerte ? 'bg-emerald-600 text-white' : 'bg-[#f4f4f2] text-[#78716c] hover:bg-[#ecece9]'}`}
          >
            <PenLine className="h-3 w-3" /> Kun signerte
          </button>
        </div>
      </div>

      {/* Innhold */}
      {!synlige.length ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <Search className="mx-auto h-7 w-7 text-[#d5d0c8]" />
          <p className="mt-3 text-[13.5px] font-semibold text-[#555]">Ingen treff</p>
          <p className="mt-1 text-[12.5px] text-[#a3a3a3]">Prøv et annet søkeord eller fjern filtrene.</p>
        </div>
      ) : soker || mappe ? (
        /* Flat treffliste (søk/valgt mappe) — mappe-badge på hver rad ved søk */
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {mappe && !soker && (
            <div className="flex items-center gap-2 border-b border-black/[0.04] bg-[#fbfaf8] px-5 py-2.5">
              <FolderOpen className="h-3.5 w-3.5 text-[#8b5cf6]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#a3a3a3]">
                <span className="text-[#8b5cf6]">{mappe}</span> {(MAPPER.find((m) => m.nr === mappe) || {}).navn} · {synlige.length}
              </p>
            </div>
          )}
          <div className="divide-y divide-black/[0.03]">
            {synlige.map((d) => <Rad key={d.id} d={d} medMappe={soker} />)}
          </div>
        </div>
      ) : (
        /* Standard: nummererte mappeseksjoner */
        <div className="space-y-4">
          {mapperMedInnhold.map((m) => {
            const docs = synlige.filter((d) => d.mappe === m.nr);
            if (!docs.length) return null;
            return (
              <div key={m.nr} className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid={`ddok-seksjon-${m.nr}`}>
                <div className="flex items-center gap-2.5 border-b border-black/[0.04] px-5 py-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f4f0fb]"><Folder className="h-3.5 w-3.5 text-[#8b5cf6]" /></span>
                  <p className="text-[12px] font-bold text-[#0a0a0a]"><span className="text-[#8b5cf6]">{m.nr}</span> {m.navn}</p>
                  <span className="text-[11px] text-[#c5c0b8] tabular-nums">{docs.length}</span>
                </div>
                <div className="divide-y divide-black/[0.03]">
                  {docs.map((d) => <Rad key={d.id} d={d} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {erAdmin && (
        <p className="text-[12px] text-[#999]">Arkivér saksdokumenter fra dokumentpanelet (synlighet: styret/investorer/alle), eller last opp i <span className="font-semibold text-[#555]">Investor-rom</span>-modulen — alt samles her automatisk i nummererte mapper.</p>
      )}

      {viser && <ForhandsvisningModal d={viser} onClose={() => setViser(null)} />}
    </div>
  );
}

/* ── Forhåndsvisning: PDF (pdf.js) og bilder — rett i nettleseren ──────────── */
function ForhandsvisningModal({ d, onClose }) {
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState(false);
  const [sider, setSider] = useState(0);
  const holderRef = useRef(null);
  const bilde = erBilde(d.filnavn || d.navn, d.type);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (bilde) { setLaster(false); return; }
    let avbrutt = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';
        const res = await fetch(d.inlineUrl);
        if (!res.ok) throw new Error('nedlasting feilet');
        const buf = await res.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        if (avbrutt) return;
        setSider(doc.numPages);
        const holder = holderRef.current;
        if (!holder) return;
        holder.innerHTML = '';
        const bredde = Math.min(880, Math.max(300, holder.clientWidth - 8));
        const maks = Math.min(doc.numPages, 40);
        for (let i = 1; i <= maks; i += 1) {
          if (avbrutt) return;
          const side = await doc.getPage(i);
          const vp0 = side.getViewport({ scale: 1 });
          const skala = bredde / vp0.width;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const vp = side.getViewport({ scale: skala * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = `${bredde}px`;
          canvas.style.height = `${(vp.height / dpr) | 0}px`;
          canvas.className = 'mx-auto mb-3 block rounded-lg bg-white shadow-[0_2px_14px_rgba(0,0,0,0.10)]';
          await side.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          holder.appendChild(canvas);
          if (i === 1) setLaster(false);
        }
      } catch (e) {
        if (!avbrutt) { setFeil(true); setLaster(false); }
      }
    })();
    return () => { avbrutt = true; };
  }, [d, bilde]);

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-[#111]/92 backdrop-blur-[3px]" onClick={onClose} data-testid="ddok-forhandsvisning">
      {/* Topplinje */}
      <div className="flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><FileText className="h-4 w-4 text-white/80" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{d.navn}</p>
          <p className="text-[11px] text-white/45">{d.signert ? 'Signert dokument · ' : ''}{sider ? `${sider} side${sider === 1 ? '' : 'r'}` : bilde ? 'Bilde' : ''}</p>
        </div>
        <a href={d.nedlastUrl} className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-white/20" data-testid="ddok-vis-nedlast">
          <Download className="h-3.5 w-3.5" /> Last ned
        </a>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="Lukk" data-testid="ddok-vis-lukk">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
      {/* Innhold */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 sm:px-6" onClick={(e) => e.stopPropagation()}>
        {laster && (
          <div className="flex h-40 items-center justify-center gap-2 text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> <span className="text-[12.5px]">Laster forhåndsvisning …</span>
          </div>
        )}
        {feil && (
          <div className="mx-auto mt-10 max-w-[420px] rounded-2xl bg-white/[0.07] p-8 text-center">
            <p className="text-[13.5px] font-semibold text-white">Forhåndsvisningen kunne ikke lastes</p>
            <a href={d.nedlastUrl} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[12.5px] font-bold text-[#111]">
              <Download className="h-3.5 w-3.5" /> Last ned dokumentet
            </a>
          </div>
        )}
        {bilde && !feil && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.inlineUrl} alt={d.navn} className="mx-auto max-h-full max-w-full rounded-lg shadow-[0_2px_14px_rgba(0,0,0,0.2)]" onError={() => setFeil(true)} />
        )}
        <div ref={holderRef} className="mx-auto max-w-[900px]" />
      </div>
    </div>
  );
}
