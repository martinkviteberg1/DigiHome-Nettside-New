'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-lite';
import { MapPin, Pencil, Link2, Loader2, CheckCircle2, X, Sparkles, Ruler, BedDouble, Home, Banknote, Hash, ChevronDown, Check, Building2, LayoutGrid, Warehouse, Minus, Plus, ShieldCheck, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
          <MapPin className="w-[15px] h-[15px] text-[#7c3aed]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-[#1a1a1a] truncate ${compact ? 'text-[13.5px]' : 'text-[15px]'}`}>{value}</p>
          {postalCode && <p className="text-[12px] text-[#999] truncate">{postalCode}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid={`${testIdPrefix}-edit`}
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7c3aed] hover:text-[#8a45d6] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#faf5ff]"
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
export function FinnLookupField({ value, onChange, onResult, testId = 'finn', compact = false, hidePreview = false }: any) {
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
        const r = await fetch(`/api/finn-preview?url=${encodeURIComponent(u)}`);
        if (myId !== reqId.current) return;
        const d = (await r.json().catch(() => ({}))) || {};
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

      {!hidePreview && (
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
      )}
    </div>
  );
}


const FINN_TYPE_OPTS = [
  { value: 'leilighet', label: 'Leilighet' },
  { value: 'hus', label: 'Hus' },
  { value: 'rekkehus', label: 'Rekkehus' },
  { value: 'hybel', label: 'Hybel' },
  { value: 'annet', label: 'Annet' },
];

const FINN_TYPE_META = [
  { value: 'leilighet', label: 'Leilighet', icon: Building2 },
  { value: 'hus', label: 'Hus', icon: Home },
  { value: 'rekkehus', label: 'Rekkehus', icon: LayoutGrid },
  { value: 'hybel', label: 'Hybel', icon: BedDouble },
  { value: 'annet', label: 'Annet', icon: Warehouse },
];
const FINN_BED_OPTS = ['1', '2', '3', '4', '5+'];

/* ──────────────────────────────────────────────────────────────────────────
   FinnPropertyCard — verdensklasse eiendomskort med hero-bilde, adresse og
   REDIGERBARE stat-fliser (areal/soverom/boligtype). Brukes i Finn-flyten på
   steg 1 slik at brukeren slipper et eget eiendoms-steg. Inkluderer kilde-
   header (bytt annonse) + integrert eiendomsregister-verifisering i footer.
   ────────────────────────────────────────────────────────────────────────── */
export function FinnPropertyCard({
  data, sqm, bedrooms, propertyType, onSqm, onBedrooms, onType, errors = {},
  ownerName, ownerType, verifying = false, needsSelect = false, registryFailed = false,
  sourceUrl, onReset,
}: any) {
  const [bedOpen, setBedOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  if (!data || !data.ok) return null;
  const matrikkelStr = data.matrikkel && data.matrikkel.kommunenr
    ? `${data.matrikkel.kommunenr}-${data.matrikkel.gaardsnr}/${data.matrikkel.bruksnr}`
    : '';
  const typeMeta = FINN_TYPE_META.find((o) => o.value === propertyType);
  const TypeIcon = typeMeta?.icon || Home;
  let host = '';
  try { host = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : ''; } catch (e) { host = ''; }

  // Felles flis-skall — tydelig «kan redigeres»-affordans (border, pencil, fokus-glød).
  const tileShell = (editing: boolean, hasError: boolean) =>
    `group/tile relative rounded-2xl bg-white p-3.5 text-left border transition-all duration-200 ${
      hasError ? 'border-red-300' : editing ? 'border-[#cf97fc] shadow-[0_0_0_4px_rgba(207,151,252,0.16)]' : 'border-[#ece7f3] hover:border-[#cdbcf0] hover:shadow-[0_8px_24px_-18px_rgba(124,58,237,0.5)]'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[26px] bg-white overflow-hidden shadow-[0_18px_60px_-28px_rgba(0,0,0,0.45)]"
      data-testid="finn-property-card"
    >
      {/* Kilde-header — viser at dette er hentet fra Finn + bytt annonse */}
      {(host || onReset) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#f3f0f7]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-full bg-[#f4eefb] flex items-center justify-center shrink-0"><Link2 className="w-3.5 h-3.5 text-[#7c3aed]" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaa] leading-none">Hentet fra annonse</p>
              <p className="text-[12.5px] font-medium text-[#555] truncate leading-tight mt-0.5">{host || 'finn.no'}</p>
            </div>
          </div>
          {onReset && (
            <button type="button" onClick={onReset} data-testid="finn-card-reset"
              className="shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7c3aed] hover:text-[#8a45d6] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#faf5ff]">
              <Pencil className="w-[13px] h-[13px]" /> Bytt annonse
            </button>
          )}
        </div>
      )}

      {data.image ? (
        <div className="relative">
          <motion.img initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            src={data.image} alt={data.address || 'Eiendom'} className="w-full h-[210px] sm:h-[250px] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
          <div className="absolute top-3.5 left-3.5">
            {data.kind && <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-full bg-white/95 text-[#0a0a0a] shadow-sm">{data.kind === 'leie' ? 'Til leie' : 'Til salgs'}</span>}
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white text-[21px] sm:text-[25px] font-bold leading-tight tracking-[-0.01em] [text-shadow:0_2px_18px_rgba(0,0,0,0.4)]" style={{ fontFamily: 'var(--font-heading)' }}>{data.address || data.title}</p>
            {matrikkelStr && <span className="mt-2 inline-flex items-center gap-1.5 text-white/95 text-[12px] font-medium bg-white/15 backdrop-blur-md rounded-full px-2.5 py-1 ring-1 ring-white/20"><Hash className="w-3 h-3" /> Matrikkel {matrikkelStr}</span>}
          </div>
        </div>
      ) : (
        <div className="px-5 pt-5">
          <p className="text-[20px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{data.address || data.title}</p>
          {matrikkelStr && <p className="text-[12.5px] text-[#999] mt-1 inline-flex items-center gap-1"><Hash className="w-3 h-3" /> Matrikkel {matrikkelStr}</p>}
        </div>
      )}

      <div className="p-4 sm:p-5 bg-gradient-to-b from-white to-[#fcfaff]">
        {/* Tydelig redigerbar-hint */}
        <div className="flex items-center justify-between mb-3.5 gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#9a5fd0] bg-[#f5edfc] rounded-full px-2.5 py-1">
            <Sparkles className="w-3 h-3" /> Auto-utfylt
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#999]">
            <Pencil className="w-3 h-3" /> Trykk for å endre
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Areal — redigerbart tallfelt */}
          <label className={`${tileShell(false, !!errors.sqm)} block cursor-text focus-within:border-[#cf97fc] focus-within:shadow-[0_0_0_4px_rgba(207,151,252,0.16)]`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5"><Ruler className="w-4 h-4 text-[#b39ddb]" /><span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#a3a0ab]">Areal</span></div>
              <Pencil className="w-[13px] h-[13px] text-[#d2c6ea] transition-colors group-hover/tile:text-[#7c3aed]" />
            </div>
            <div className="flex items-baseline gap-1">
              <input type="number" inputMode="numeric" value={sqm || ''} onChange={(e: any) => onSqm(e.target.value)} placeholder="—"
                className="w-full min-w-0 bg-transparent outline-none text-[22px] font-bold text-[#0a0a0a] leading-none placeholder:text-[#d4cce2]" style={{ fontFamily: 'var(--font-heading)' }} data-testid="finn-card-sqm" />
              <span className="text-[13px] text-[#9b94a8] font-medium shrink-0">m²</span>
            </div>
          </label>

          {/* Soverom — custom popover-velger */}
          <Popover open={bedOpen} onOpenChange={setBedOpen}>
            <PopoverTrigger asChild>
              <button type="button" data-testid="finn-card-bedrooms" className={tileShell(bedOpen, !!errors.bedrooms)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-[#b39ddb]" /><span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#a3a0ab]">Soverom</span></div>
                  <ChevronDown className={`w-[15px] h-[15px] transition-all ${bedOpen ? 'rotate-180 text-[#7c3aed]' : 'text-[#d2c6ea] group-hover/tile:text-[#7c3aed]'}`} />
                </div>
                <span className="block text-[22px] font-bold leading-none text-left" style={{ fontFamily: 'var(--font-heading)' }}>{bedrooms ? <span className="text-[#0a0a0a]">{bedrooms}</span> : <span className="text-[#d4cce2]">—</span>}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="w-[208px] p-2 rounded-2xl border border-[#efe9f7] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)]">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#aaa] px-1.5 pb-2">Antall soverom</p>
              <div className="grid grid-cols-5 gap-1.5">
                {FINN_BED_OPTS.map((n) => {
                  const sel = String(bedrooms) === n;
                  return (
                    <button key={n} type="button" onClick={() => { onBedrooms(n); setBedOpen(false); }}
                      className={`h-10 rounded-xl text-[15px] font-bold transition-all active:scale-95 ${sel ? 'bg-[#cf97fc] text-white shadow-[0_4px_14px_-4px_rgba(207,151,252,0.8)]' : 'bg-[#f6f3fb] text-[#5b5570] hover:bg-[#efe7fb]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{n}</button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Boligtype — custom popover med ikoner */}
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <button type="button" data-testid="finn-card-type" className={`${tileShell(typeOpen, !!errors.property_type)} col-span-2 sm:col-span-1`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5"><Home className="w-4 h-4 text-[#b39ddb]" /><span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#a3a0ab]">Boligtype</span></div>
                  <ChevronDown className={`w-[15px] h-[15px] transition-all ${typeOpen ? 'rotate-180 text-[#7c3aed]' : 'text-[#d2c6ea] group-hover/tile:text-[#7c3aed]'}`} />
                </div>
                <span className="flex items-center gap-2 text-[19px] font-bold leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                  {typeMeta ? (<><TypeIcon className="w-[18px] h-[18px] text-[#7c3aed]" /><span className="text-[#0a0a0a]">{typeMeta.label}</span></>) : <span className="text-[#d4cce2]">Velg</span>}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="w-[244px] p-1.5 rounded-2xl border border-[#efe9f7] shadow-[0_18px_50px_-22px_rgba(0,0,0,0.35)]">
              {FINN_TYPE_META.map((o) => {
                const Icon = o.icon; const sel = propertyType === o.value;
                return (
                  <button key={o.value} type="button" onClick={() => { onType(o.value); setTypeOpen(false); }}
                    className={`w-full flex items-center gap-3 px-2.5 h-11 rounded-xl text-[14.5px] font-medium transition-colors ${sel ? 'bg-[#faf5ff] text-[#0a0a0a]' : 'text-[#555] hover:bg-[#f7f4fc]'}`}>
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${sel ? 'bg-[#cf97fc] text-white' : 'bg-[#f1ecf8] text-[#a78bda]'}`}><Icon className="w-4 h-4" /></span>
                    <span className="flex-1 text-left">{o.label}</span>
                    {sel && <Check className="w-4 h-4 text-[#7c3aed]" strokeWidth={3} />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Verifiserings-footer — eiendomsregister (Infotorg EDR) */}
      {(verifying || ownerName || needsSelect || registryFailed) && (
        <AnimatePresence mode="wait">
          {verifying ? (
            <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-5 py-3.5 bg-[#faf8fe] border-t border-[#f1ebfb]" data-testid="finn-card-verifying">
              <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin shrink-0" />
              <span className="text-[13.5px] text-[#5b6370]">Søker i Eiendomsregisteret …</span>
            </motion.div>
          ) : ownerName ? (
            <motion.div key="verified" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-5 py-3.5 bg-[#f7fcf9] border-t border-[#e7f3ec]" data-testid="finn-card-verified">
              <span className="w-6 h-6 rounded-full bg-[#e7f7ee] flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-[#16a34a]" /></span>
              <span className="text-[13.5px] text-[#0a0a0a] leading-snug">
                <span className="font-semibold">Verifisert i Eiendomsregisteret</span>
                <span className="text-[#5b6370]"> · {ownerName}{ownerType === 'org' ? '' : ' · hjemmelshaver'}</span>
              </span>
            </motion.div>
          ) : needsSelect ? (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-5 py-3.5 bg-[#faf8fe] border-t border-[#f1ebfb]" data-testid="finn-card-select">
              <span className="w-6 h-6 rounded-full bg-[#f4eefb] flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-[#7c3aed]" /></span>
              <span className="text-[13.5px] text-[#0a0a0a] leading-snug"><span className="font-semibold">Funnet i registeret</span><span className="text-[#5b6370]"> · velg din enhet nedenfor</span></span>
            </motion.div>
          ) : registryFailed ? (
            <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 px-5 py-3.5 bg-[#f8f8f7] border-t border-[#eee]" data-testid="finn-card-registry-failed">
              <Info className="w-4 h-4 text-[#5b6370] mt-0.5 shrink-0" />
              <span className="text-[13px] text-[#5b6370] leading-relaxed">Vi fant ikke eiendommen automatisk i registeret — det går helt fint, du kan fortsette.</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
