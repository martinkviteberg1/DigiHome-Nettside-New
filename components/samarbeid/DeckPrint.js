'use client';
/* PDF rett fra sidene: hver 1280×720-side rasteres i nettleseren (samme rendering som på skjermen – fonter, masker, gradienter) og legges
   som én side i en liggende PDF. Ingen utskriftsdialog. `auto=1` starter nedlastingen straks. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Printer } from 'lucide-react';
import { DECK_VERSION } from './content';
import { H, W } from './theme';

const SCALE = 2;
const QUALITY = 0.9;

export const exportPagesPdf = async (pages, filename, onProgress) => {
  const [{ domToCanvas }, { jsPDF }] = await Promise.all([import('modern-screenshot'), import('jspdf')]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], hotfixes: ['px_scaling'], compress: true });
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i, pages.length);
    const canvas = await domToCanvas(pages[i], { scale: SCALE, width: W, height: H, backgroundColor: '#F3F1EC', font: { preferredFormat: 'woff2' }, features: { copyScrollbar: false, restoreScrollPosition: false } });
    if (i > 0) pdf.addPage([W, H], 'landscape');
    pdf.addImage(canvas.toDataURL('image/jpeg', QUALITY), 'JPEG', 0, 0, W, H, undefined, 'FAST');
    await new Promise((r) => { setTimeout(r, 0); });
  }
  onProgress?.(pages.length, pages.length);
  pdf.save(filename);
};

export default function DeckPrint({ auto, config }) {
  const router = useRouter();
  const SLIDES = config.slides;
  const [prog, setProg] = useState(null);
  const busy = useRef(false);
  const filename = `${config.title.replace(/\s+/g, '-').replace(/[–—]/g, '-')}-${DECK_VERSION}.pdf`;
  const download = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const imgs = Array.from(document.images).filter((im) => !im.complete);
    await Promise.all(imgs.map((im) => new Promise((r) => { im.addEventListener('load', () => r(), { once: true }); im.addEventListener('error', () => r(), { once: true }); })));
    await document.fonts?.ready;
    const pages = Array.from(document.querySelectorAll('.deck-print-page'));
    try { await exportPagesPdf(pages, filename, (done, total) => setProg({ done, total })); }
    finally { busy.current = false; setTimeout(() => setProg(null), 900); }
  }, [filename]);
  useEffect(() => { if (auto) { const id = window.setTimeout(download, 600); return () => clearTimeout(id); } return undefined; }, [auto, download]);
  const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;
  return (
    <div className="deck-print min-h-screen" data-testid="deck-print" style={{ background: '#1d1a16' }}>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 px-5 h-14 border-b border-white/10 text-white" style={{ background: '#15130F' }}>
        <div className="flex items-center gap-3 text-[13px] text-white/70"><img src="/brand/digihome-icon-purple.svg" alt="" width={16} height={16} /><span>{config.title} · versjon {DECK_VERSION}</span><span className="hidden sm:inline text-white/40">· én side per seksjon, 16:9</span></div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="hidden sm:inline-flex h-9 px-3 rounded-full text-[13px] text-white/60 hover:text-white hover:bg-white/10 items-center gap-2" data-testid="deck-print-now"><Printer className="w-4 h-4" />Skriv ut</button>
          <button onClick={download} disabled={!!prog} aria-busy={!!prog} className="relative overflow-hidden inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white text-[#15130F] text-[13px] font-semibold hover:bg-white/90 disabled:opacity-90 tabular-nums" data-testid="deck-pdf-download">
            {prog && <span aria-hidden className="absolute left-0 top-0 bottom-0" style={{ width: `${pct}%`, transition: 'width 250ms ease', background: 'rgba(212,150,255,0.55)' }} />}
            <span className="relative inline-flex items-center gap-2">
              {prog ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-[#15130F]/25 border-t-[#15130F] animate-spin" />Lager PDF · {Math.min(prog.done + 1, prog.total)}/{prog.total}</> : <><Download className="w-4 h-4" />Last ned PDF</>}
            </span>
          </button>
          <button onClick={() => router.push(config.root)} className="h-9 px-3 rounded-full text-[13px] text-white/70 hover:text-white hover:bg-white/10" data-testid="deck-print-close">Lukk</button>
        </div>
      </div>
      <div className="py-6 print:py-0 flex flex-col items-center gap-6">
        {SLIDES.map((s, i) => <div key={s.id} className="deck-print-page" style={{ width: W, height: H, overflow: 'hidden', position: 'relative', flex: 'none' }}><s.Component animate={false} index={i} total={SLIDES.length} /></div>)}
      </div>
    </div>
  );
}
