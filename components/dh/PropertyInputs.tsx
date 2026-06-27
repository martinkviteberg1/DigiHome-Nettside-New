'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from '@/lib/motion-lite';
import { MapPin, Pencil, Link2, Loader2, CheckCircle2, X, Sparkles } from 'lucide-react';
import { AddressAutocomplete } from './AddressAutocomplete';

/** Mapper Finn-preview-data til skjemafelt (sqm / property_type / bedrooms). */
export function finnToFields(d: any) {
  const out: any = {};
  if (d?.sqm) out.sqm = String(d.sqm);
  if (d?.propertyType) out.property_type = d.propertyType;
  if (d?.bedrooms) {
    const b = parseInt(d.bedrooms, 10);
    if (b >= 1) out.bedrooms = b >= 5 ? '5+' : String(b);
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
   AddressField — bekreftet adresse-kort med «Endre», ellers autofullføring.
   ────────────────────────────────────────────────────────────────────────── */
export function AddressField({
  value,
  postalCode,
  onChange,
  onSelect,
  placeholder = 'Skriv inn adressen',
  testIdPrefix = 'address',
  autoConfirm = false,
  error,
  compact = false,
}: any) {
  const [editing, setEditing] = useState(!(autoConfirm && value));
  const inputWrapClass = compact
    ? 'w-full h-[46px] pl-10 pr-3.5 text-[14px] bg-white border border-[#e0e0e0] rounded-xl outline-none focus:border-[#cf97fc] focus:shadow-[0_0_0_3px_rgba(207,151,252,0.12)] transition-all placeholder:text-[#9a9a9a]'
    : 'w-full h-[52px] pl-11 pr-4 text-[15px] bg-white border border-[#e0e0e0] rounded-xl outline-none focus:border-[#cf97fc] focus:shadow-[0_0_0_3px_rgba(207,151,252,0.14)] transition-all placeholder:text-[#9a9a9a]';

  if (!editing && value) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`flex items-center gap-3 bg-white border border-[#e6dcf5] rounded-xl ${compact ? 'px-3.5 py-2.5' : 'px-4 py-3.5'}`}
        data-testid={`${testIdPrefix}-confirmed`}
      >
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f4eefb] flex items-center justify-center">
          <MapPin className="w-[15px] h-[15px] text-[#a463e8]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-[#1a1a1a] truncate ${compact ? 'text-[13.5px]' : 'text-[15px]'}`}>{value}</p>
          {postalCode && <p className="text-[12px] text-[#999] truncate">{postalCode}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid={`${testIdPrefix}-edit`}
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#a463e8] hover:text-[#8a45d6] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#faf5ff]"
        >
          <Pencil className="w-[13px] h-[13px]" /> Endre
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <AddressAutocomplete
        value={value}
        onChange={onChange}
        onSelect={(data: any) => {
          onSelect?.(data);
          setEditing(false);
        }}
        placeholder={placeholder}
        showIcon
        inputClassName={inputWrapClass}
        className="w-full"
        dataTestId={`${testIdPrefix}-input`}
      />
      {error && <p className="text-[12px] text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FinnLookupField — lim inn Finn-lenke → premium «scanning»-animasjon +
   forhåndsvisningskort. Kaller onResult(data) ved treff (parent auto-fyller).
   ────────────────────────────────────────────────────────────────────────── */
export function FinnLookupField({ value, onChange, onResult, testId = 'finn', compact = false }: any) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const reqId = useRef(0);

  useEffect(() => {
    const u = (value || '').trim();
    if (!u) { setPreview(null); setErr(''); setLoading(false); return; }
    if (!/^https?:\/\/(www\.)?finn\.no\//i.test(u)) {
      setPreview(null);
      setErr(u.length > 10 ? 'Lim inn en gyldig finn.no-lenke' : '');
      setLoading(false);
      return;
    }
    const myId = ++reqId.current;
    setLoading(true); setErr('');
    const t = setTimeout(async () => {
      try {
        const r = await axios.get(`/api/finn-preview`, { params: { url: u } });
        if (myId !== reqId.current) return;
        const d = r.data || {};
        if (!d.ok) { setPreview(null); setErr('Fant ikke annonsen. Sjekk at lenken er riktig.'); }
        else { setPreview(d); setErr(''); onResult?.(d); }
      } catch (e) {
        if (myId === reqId.current) { setPreview(null); setErr('Klarte ikke å hente annonsen akkurat nå.'); }
      } finally {
        if (myId === reqId.current) setLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div>
      <div className="relative">
        <Link2 className="w-[16px] h-[16px] text-[#aaa] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
        <input
          type="url"
          inputMode="url"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder="https://www.finn.no/realestate/..."
          data-testid={`${testId}-input`}
          className="w-full h-[48px] pl-10 pr-10 text-[14px] bg-white border border-[#e6dcf5] rounded-xl outline-none focus:border-[#cf97fc] focus:shadow-[0_0_0_3px_rgba(207,151,252,0.14)] transition-all placeholder:text-[#bbb] relative"
        />
        {/* Scanning-strek under feltet mens vi henter */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute left-2 right-2 -bottom-[3px] h-[2px] overflow-hidden rounded-full"
            >
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#cf97fc] to-transparent"
                animate={{ x: ['-120%', '320%'] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {loading && <Loader2 className="w-[16px] h-[16px] text-[#cf97fc] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />}
        {!loading && value && (
          <button type="button" onClick={() => onChange('')} aria-label="Fjern lenke" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#666] transition-colors"><X className="w-[15px] h-[15px]" /></button>
        )}
      </div>

      {err && <p className="text-[12px] text-[#d9534f] mt-2">{err}</p>}

      <AnimatePresence mode="wait">
        {loading && !preview && (
          /* Skeleton-kort med shimmer mens vi henter */
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mt-3 flex gap-3 rounded-xl bg-white border border-[#eee] p-3 overflow-hidden"
          >
            <div className="w-[92px] h-[68px] rounded-lg shimmer flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2 py-1">
              <div className="h-[10px] w-16 rounded shimmer" />
              <div className="h-[13px] w-4/5 rounded shimmer" />
              <div className="h-[11px] w-1/2 rounded shimmer" />
            </div>
          </motion.div>
        )}

        {!loading && preview && preview.ok && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 flex gap-3 rounded-xl bg-white border border-[#eee] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
            data-testid={`${testId}-preview`}
          >
            {preview.image && (
              <div className="relative w-[92px] h-[68px] rounded-lg overflow-hidden flex-shrink-0 bg-[#f3f3f3]">
                <motion.img
                  initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
                  src={preview.image} alt="" className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {preview.kind && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#f0e8fb] text-[#9a5fd0]">{preview.kind === 'leie' ? 'Til leie' : 'Til salgs'}</span>
                )}
                <motion.span
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                  className="text-[11px] text-[#22a06b] font-medium inline-flex items-center gap-1"
                ><CheckCircle2 className="w-[12px] h-[12px]" /> Fylte inn automatisk</motion.span>
              </div>
              <p className="text-[13px] font-semibold text-[#222] leading-snug line-clamp-2">{preview.title}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[12px] text-[#777]">
                {preview.sqm && <span>{preview.sqm} m²</span>}
                {preview.bedrooms && <span>{preview.bedrooms} soverom</span>}
                {preview.rent && <span>{Number(preview.rent).toLocaleString('nb-NO')} kr/mnd</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
