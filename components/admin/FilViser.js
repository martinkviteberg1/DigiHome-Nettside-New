'use client';

/* ═══════════════ FilViser — moderne vedleggsviser ═══════════════
   Fullskjerms-lightbox for saksvedlegg: PDF (nettleserens innebygde viser),
   bilder, video, lyd og ren tekst. Andre filtyper får et elegant nedlastings-
   kort. Piltaster blar mellom vedlegg, Esc lukker (uten å lukke saksskuffen).
   Filene serveres auth-beskyttet via /api/admin/task-files/<id>?inline=1. */

import { useState, useEffect } from 'react';
import {
  X, Download, ChevronLeft, ChevronRight, FileText, File as FilIkon,
  FileSpreadsheet, FileImage, FileVideo, FileAudio, Loader2, Presentation,
} from 'lucide-react';

const fmtStorrelse = (b) => {
  const n = Number(b) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};

const ext = (navn) => String(navn || '').split('.').pop().toLowerCase();

// Hva kan vises direkte i nettleseren? (matcher backendens inline-allowlist)
export function filSlag(type, navn) {
  const t = String(type || '').toLowerCase();
  const e = ext(navn);
  if (t === 'application/pdf' || e === 'pdf') return 'pdf';
  if (/^image\/(png|jpe?g|gif|webp|avif|heic|heif)$/.test(t) || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(e)) return 'bilde';
  if (/^video\//.test(t) || ['mp4', 'webm', 'mov'].includes(e)) return 'video';
  if (/^audio\//.test(t) || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(e)) return 'lyd';
  if (t === 'text/plain' || e === 'txt') return 'tekst';
  return null;
}

// Ikon + aksentfarge per filtype (for rader og fallback-kortet).
export function filIkonInfo(type, navn) {
  const slag = filSlag(type, navn);
  const e = ext(navn);
  if (slag === 'pdf') return { Ikon: FileText, farge: '#e11d48' };
  if (slag === 'bilde') return { Ikon: FileImage, farge: '#0ea5e9' };
  if (slag === 'video') return { Ikon: FileVideo, farge: '#8b5cf6' };
  if (slag === 'lyd') return { Ikon: FileAudio, farge: '#10b981' };
  if (['doc', 'docx', 'odt', 'rtf'].includes(e)) return { Ikon: FileText, farge: '#2563eb' };
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return { Ikon: FileSpreadsheet, farge: '#059669' };
  if (['ppt', 'pptx', 'key'].includes(e)) return { Ikon: Presentation, farge: '#d97706' };
  return { Ikon: FilIkon, farge: '#8b8b8b' };
}

export default function FilViser({ filer = [], index = 0, apiKey, onClose, onIndex }) {
  const [laster, setLaster] = useState(true);
  const fil = filer[index];

  useEffect(() => { setLaster(true); }, [index]);

  // Tastatur: Esc lukker (capture + stopPropagation så skuffen bak ikke lukkes),
  // piltaster blar mellom vedlegg.
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight' && index < filer.length - 1) { e.stopPropagation(); onIndex(index + 1); }
      else if (e.key === 'ArrowLeft' && index > 0) { e.stopPropagation(); onIndex(index - 1); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [index, filer.length, onClose, onIndex]);

  if (!fil) return null;

  const url = `/api/admin/task-files/${fil.id}?key=${encodeURIComponent(apiKey || '')}`;
  const inlineUrl = `${url}&inline=1`;
  const slag = filSlag(fil.type, fil.name);
  const { Ikon, farge } = filIkonInfo(fil.type, fil.name);
  const ferdig = () => setLaster(false);

  return (
    <div
      className="dh-fade fixed inset-0 z-[140] flex flex-col bg-black/85 backdrop-blur-sm"
      data-testid="file-viewer"
      onClick={onClose}
      role="dialog"
      aria-label={`Forhåndsvisning: ${fil.name}`}
    >
      {/* Toppbar */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 sm:px-5 sm:py-3" onClick={(e) => e.stopPropagation()}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Ikon className="h-4 w-4" style={{ color: farge }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-white">{fil.name}</p>
          <p className="text-[11px] text-white/50">{fmtStorrelse(fil.size)}{filer.length > 1 ? ` · ${index + 1} av ${filer.length}` : ''}</p>
        </div>
        <a
          href={url}
          download={fil.name}
          data-testid="viewer-download"
          title="Last ned"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Download className="h-[17px] w-[17px]" />
        </a>
        <button
          onClick={onClose}
          data-testid="viewer-close"
          title="Lukk (Esc)"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-[19px] w-[19px]" />
        </button>
      </div>

      {/* Innhold */}
      <div className="relative min-h-0 flex-1 px-3 pb-3 sm:px-14 sm:pb-5">
        {laster && slag && slag !== 'lyd' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/60" />
          </div>
        )}
        {slag === 'pdf' && (
          <iframe
            src={inlineUrl}
            title={fil.name}
            onLoad={ferdig}
            data-testid="viewer-pdf"
            className="h-full w-full rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {slag === 'bilde' && (
          <div className="flex h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={inlineUrl}
              alt={fil.name}
              onLoad={ferdig}
              data-testid="viewer-image"
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>
        )}
        {slag === 'video' && (
          <div className="flex h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={inlineUrl} controls autoPlay onLoadedData={ferdig} data-testid="viewer-video" className="max-h-full max-w-full rounded-xl shadow-2xl" />
          </div>
        )}
        {slag === 'lyd' && (
          <div className="flex h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-[min(480px,90vw)] rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${farge}14` }}>
                  <Ikon className="h-5 w-5" style={{ color: farge }} />
                </span>
                <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#0a0a0a]">{fil.name}</p>
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={inlineUrl} controls autoPlay className="mt-4 w-full" data-testid="viewer-audio" />
            </div>
          </div>
        )}
        {slag === 'tekst' && (
          <iframe
            src={inlineUrl}
            title={fil.name}
            onLoad={ferdig}
            data-testid="viewer-text"
            className="h-full w-full rounded-xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {!slag && (
          <div className="flex h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-[min(420px,90vw)] rounded-2xl bg-white p-8 text-center shadow-2xl" data-testid="viewer-fallback">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: `${farge}14` }}>
                <Ikon className="h-8 w-8" style={{ color: farge }} />
              </span>
              <p className="mt-4 break-words text-[14.5px] font-semibold text-[#0a0a0a]">{fil.name}</p>
              <p className="mt-1 text-[12.5px] text-[#999]">
                {fmtStorrelse(fil.size)} · Forhåndsvisning støttes ikke for .{ext(fil.name)}-filer
              </p>
              <a
                href={url}
                download={fil.name}
                data-testid="viewer-fallback-download"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0a0a0a] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:bg-black/85"
              >
                <Download className="h-4 w-4" /> Last ned filen
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bla-piler */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }}
          data-testid="viewer-prev"
          aria-label="Forrige vedlegg"
          className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {index < filer.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }}
          data-testid="viewer-next"
          aria-label="Neste vedlegg"
          className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
