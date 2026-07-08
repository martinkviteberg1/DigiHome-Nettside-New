'use client';

// ============================================================================
// FINN-studio v3 — komplett arbeidsflate for FINN.no som markedsføringskanal.
// • Bannerstudio: live preview (Board/Netboard/FINN-feed-kontekst), AI-tekst,
//   AI-bakgrunn, design-bibliotek, alle FINN-formater → ZIP for adops@finn.no
// • Planlegger: budsjett/CPL-kalkulator, ferdig booking-e-post, pilot-sjekkliste
// • Kampanjer & måling: manuell FINN-rapport + automatisk UTM-måling + benchmark
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2, Sparkles, Download, Plus, Trash2, Pencil, RefreshCw, AlertCircle,
  Image as ImageIcon, Copy, Check, Info, X, Coins, MousePointerClick,
  Users, Target, Eye, CheckCircle2, Link2, ArrowRight, Smartphone, Monitor,
  Palette, Type, Layers, LayoutGrid, Calculator, Mail, ClipboardCheck, Save,
  FolderOpen, ExternalLink, TrendingDown, TrendingUp, Search,
} from 'lucide-react';
import JSZip from 'jszip';

const nf = new Intl.NumberFormat('nb-NO');
const fmtNum = (n) => (n == null ? '–' : nf.format(Math.round(n)));
const fmtKr = (n) => (n == null ? '–' : `${nf.format(Math.round(n))} kr`);
const fmtKr2 = (n) => (n == null ? '–' : `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 }).format(n)} kr`);
const fmtPct = (n) => (n == null ? '–' : `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 }).format(n)} %`);

const FORMATS = [
  { key: 'board', label: 'Board', dim: '320×250', maxKb: 150, group: 'mobil' },
  { key: 'board_xl', label: 'Board XL', dim: '320×400', maxKb: 150, group: 'mobil' },
  { key: 'fullskjerm', label: 'Fullskjerm', dim: '1080×1920', maxKb: 360, group: 'mobil' },
  { key: 'netboard', label: 'Netboard', dim: '580×400', maxKb: 150, group: 'desktop' },
  { key: 'hestesko_topp', label: 'Hestesko topp', dim: '1010×150', maxKb: 150, group: 'desktop' },
  { key: 'hestesko_side', label: 'Hestesko side', dim: '180×700', maxKb: 150, group: 'desktop' },
  { key: 'wallpaper_bakgrunn', label: 'Wallpaper', dim: '1920×1300', maxKb: 150, group: 'desktop' },
];

// CSS-tvilling av temaene i lib/finn-banners.js
const THEMES = [
  { v: 'midnatt', l: 'Midnatt', bg: '#0a0a0a', fg: '#ffffff', sub: '#c9c9c9', accent: '#cf97fc', accent2: '#8b5cf6', ctaBg: '#ffffff', ctaFg: '#0a0a0a', chip: 'rgba(207,151,252,0.55)', chipFg: '#e7d9fb', serif: false },
  { v: 'nordlys', l: 'Nordlys', bg: '#0b1026', fg: '#ffffff', sub: '#c3cbe8', accent: '#7ee8d0', accent2: '#8b5cf6', ctaBg: '#7ee8d0', ctaFg: '#06251d', chip: 'rgba(126,232,208,0.5)', chipFg: '#d7f5ec', serif: false },
  { v: 'krem', l: 'Krem', bg: '#f5efe4', fg: '#171310', sub: '#6b6257', accent: '#7c4fd0', accent2: '#cf97fc', ctaBg: '#171310', ctaFg: '#f5efe4', chip: 'rgba(23,19,16,0.35)', chipFg: '#6b6257', serif: true },
  { v: 'plakat', l: 'Plakat', bg: '#cf97fc', fg: '#160b22', sub: '#43305c', accent: '#160b22', accent2: '#ffffff', ctaBg: '#160b22', ctaFg: '#f3eafc', chip: 'rgba(22,11,34,0.4)', chipFg: '#2c1c40', serif: false },
];

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[æå]/g, 'a').replace(/ø/g, 'o').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const inputCls = 'mt-1 w-full h-10 rounded-xl bg-[#faf9f7] px-3.5 text-[13px] text-[#0a0a0a] placeholder:text-[#b3b3b3] outline-none ring-1 ring-[#eee] focus:ring-[#dcd6ca] transition-all';
const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-[#999]';

// ============================ HOVEDKOMPONENT ============================
export default function FinnStudioTab({ apiKey }) {
  const [sub, setSub] = useState('studio');
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-[#0a0a0a] px-6 sm:px-8 py-6 mb-5">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.55) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-28 left-1/3 w-80 h-80 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)' }} />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#cf97fc] border border-[#cf97fc]/40 rounded-full px-2.5 py-1">FINN.no · Display</span>
            <h2 className="mt-2.5 text-[26px] font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>FINN-studio</h2>
            <p className="text-[13px] text-white/55 mt-0.5 max-w-lg">Fra idé til evaluert kampanje: design materiell, planlegg budsjett, book hos FINN og mål alt automatisk.</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[['01', 'Design'], ['02', 'Plan'], ['03', 'Booking'], ['04', 'Måling']].map(([n, l], i) => (
              <React.Fragment key={n}>
                {i > 0 && <span className="w-4 h-px bg-white/15" />}
                <span className="inline-flex items-center gap-1.5 text-[11px] text-white/65 bg-white/[0.06] rounded-full px-2.5 py-1.5"><b className="text-[#cf97fc]">{n}</b> {l}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1 w-fit mb-5 flex-wrap">
        {[['studio', 'Bannerstudio', Palette], ['plan', 'Planlegger', Calculator], ['kampanjer', 'Kampanjer & måling', Target]].map(([v, l, Icon]) => (
          <button key={v} onClick={() => setSub(v)} className={`px-4 h-9 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-all ${sub === v ? 'bg-white text-[#0a0a0a] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-[#888] hover:text-[#0a0a0a]'}`}><Icon className="w-3.5 h-3.5" /> {l}</button>
        ))}
      </div>

      {sub === 'studio' && <BannerStudio apiKey={apiKey} />}
      {sub === 'plan' && <Planner />}
      {sub === 'kampanjer' && <FinnCampaigns apiKey={apiKey} />}
    </div>
  );
}

// ============================ PREVIEW-TVILLINGER ============================
function splitAccent(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { pre: text, accent: '' };
  const accent = words.pop();
  return { pre: words.join(' ') + ' ', accent };
}

function useT(theme) { return THEMES.find((t) => t.v === theme) || THEMES[0]; }

function BoardPreview({ headline, subtext, cta, eyebrow, theme, photo, scale = 1 }) {
  const T = useT(theme);
  const { pre, accent } = splitAccent(headline || 'Din overskrift her');
  const hasPhoto = !!photo;
  const fg = hasPhoto ? '#fff' : T.fg;
  const subC = hasPhoto ? '#e2ddea' : T.sub;
  const accC = hasPhoto ? '#d9b3ff' : T.accent;
  const font = T.serif ? 'Georgia, "Times New Roman", serif' : 'inherit';
  return (
    <div className="relative overflow-hidden shrink-0 shadow-[0_10px_40px_rgba(0,0,0,0.18)]" style={{ width: 320 * scale, height: 250 * scale, background: T.bg, borderRadius: 2 }}>
      {hasPhoto && (<>
        <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(0.94)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,6,12,0.34), rgba(8,6,12,0.56) 52%, rgba(8,6,12,0.9))' }} />
      </>)}
      {!hasPhoto && (<>
        <div className="absolute rounded-full" style={{ width: 340 * scale, height: 340 * scale, right: -110 * scale, top: -160 * scale, background: `radial-gradient(circle, ${T.accent}${T.serif ? '33' : '6b'} 0%, transparent 65%)` }} />
        <div className="absolute rounded-full" style={{ width: 280 * scale, height: 280 * scale, left: -120 * scale, bottom: -140 * scale, background: `radial-gradient(circle, ${T.accent2}${T.serif ? '24' : '4d'} 0%, transparent 65%)` }} />
        <div className="absolute rounded-full border" style={{ width: 64 * scale, height: 64 * scale, right: 18 * scale, bottom: 28 * scale, borderColor: T.accent, opacity: T.serif ? 0.22 : 0.3 }} />
      </>)}
      <div className="absolute top-0 left-0 right-0" style={{ height: 3 * scale, background: `linear-gradient(90deg, transparent, ${T.accent} 45%, transparent)` }} />
      <div className="relative h-full flex flex-col" style={{ padding: 20 * scale }}>
        {eyebrow ? (
          <span className="self-start rounded-full font-bold uppercase" style={{ fontSize: 8.5 * scale, letterSpacing: '0.14em', color: hasPhoto ? '#efe4fc' : T.chipFg, border: `1px solid ${hasPhoto ? 'rgba(239,228,252,0.55)' : T.chip}`, padding: `${4 * scale}px ${9 * scale}px` }}>{eyebrow}</span>
        ) : <span style={{ height: 18 * scale }} />}
        <p className="font-bold" style={{ fontFamily: font, fontSize: 23 * scale, lineHeight: `${28 * scale}px`, color: fg, marginTop: 13 * scale, letterSpacing: T.serif ? 0 : '-0.02em' }}>
          {pre}<span style={{ color: accC, fontStyle: T.serif ? 'italic' : 'normal' }}>{accent}</span>
        </p>
        {subtext && <p style={{ fontSize: 12.5 * scale, color: subC, marginTop: 5 * scale }}>{subtext}</p>}
        <div className="mt-auto flex items-end justify-between">
          <span className="inline-flex items-center font-bold rounded-full" style={{ fontSize: 12.5 * scale, background: T.ctaBg, color: T.ctaFg, padding: `${8.5 * scale}px ${16 * scale}px`, gap: 6 * scale }}>{cta || 'Les mer'} <ArrowRight style={{ width: 12 * scale, height: 12 * scale }} /></span>
          <span style={{ fontSize: 9 * scale, color: subC }}>digihome.no · Gratis · 60 sek</span>
        </div>
      </div>
    </div>
  );
}

function NetboardPreview({ headline, subtext, cta, eyebrow, theme, photo, scale = 0.9 }) {
  const T = useT(theme);
  const { pre, accent } = splitAccent(headline || 'Din overskrift her');
  const hasPhoto = !!photo;
  const fg = hasPhoto ? '#fff' : T.fg;
  const subC = hasPhoto ? '#e2ddea' : T.sub;
  const accC = hasPhoto ? '#d9b3ff' : T.accent;
  const font = T.serif ? 'Georgia, "Times New Roman", serif' : 'inherit';
  return (
    <div className="relative overflow-hidden shrink-0 shadow-[0_10px_40px_rgba(0,0,0,0.18)]" style={{ width: 580 * scale, height: 400 * scale, background: T.bg, borderRadius: 2 }}>
      {hasPhoto && (<>
        <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(0.94)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,6,12,0.34), rgba(8,6,12,0.56) 52%, rgba(8,6,12,0.9))' }} />
      </>)}
      {!hasPhoto && (<>
        <div className="absolute rounded-full" style={{ width: 620 * scale, height: 620 * scale, right: -180 * scale, top: -300 * scale, background: `radial-gradient(circle, ${T.accent}${T.serif ? '33' : '6b'} 0%, transparent 65%)` }} />
        <div className="absolute rounded-full" style={{ width: 500 * scale, height: 500 * scale, left: -220 * scale, bottom: -260 * scale, background: `radial-gradient(circle, ${T.accent2}${T.serif ? '24' : '4d'} 0%, transparent 65%)` }} />
        <div className="absolute rounded-full border-2" style={{ width: 116 * scale, height: 116 * scale, right: 40 * scale, bottom: 46 * scale, borderColor: T.accent, opacity: T.serif ? 0.22 : 0.3 }} />
      </>)}
      <div className="absolute top-0 left-0 right-0" style={{ height: 3 * scale, background: `linear-gradient(90deg, transparent, ${T.accent} 45%, transparent)` }} />
      <div className="relative h-full flex flex-col" style={{ padding: 32 * scale }}>
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center font-bold" style={{ fontSize: 17 * scale, color: fg, gap: 7 * scale }}>
            <span className="rounded-full" style={{ width: 12 * scale, height: 12 * scale, background: accC }} /> DigiHome
          </span>
          {eyebrow && <span className="rounded-full font-bold uppercase" style={{ fontSize: 9 * scale, letterSpacing: '0.14em', color: hasPhoto ? '#efe4fc' : T.chipFg, border: `1px solid ${hasPhoto ? 'rgba(239,228,252,0.55)' : T.chip}`, padding: `${4 * scale}px ${10 * scale}px` }}>{eyebrow}</span>}
        </div>
        <p className="font-bold" style={{ fontFamily: font, fontSize: 38 * scale, lineHeight: `${46 * scale}px`, color: fg, marginTop: 34 * scale, letterSpacing: T.serif ? 0 : '-0.02em' }}>
          {pre}<span style={{ color: accC, fontStyle: T.serif ? 'italic' : 'normal' }}>{accent}</span>
        </p>
        {subtext && <p style={{ fontSize: 16.5 * scale, color: subC, marginTop: 8 * scale }}>{subtext}</p>}
        <div className="mt-auto flex items-end justify-between">
          <span className="inline-flex items-center font-bold rounded-full" style={{ fontSize: 15.5 * scale, background: T.ctaBg, color: T.ctaFg, padding: `${11 * scale}px ${20 * scale}px`, gap: 7 * scale }}>{cta || 'Les mer'} <ArrowRight style={{ width: 14 * scale, height: 14 * scale }} /></span>
          <span style={{ fontSize: 11 * scale, color: subC }}>digihome.no · Gratis · 60 sek</span>
        </div>
      </div>
    </div>
  );
}

// Simulert FINN eiendom-feed (mobil) med banneret plassert i konteksten
function FinnFeedMock(props) {
  const Listing = ({ title, price, area }) => (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="h-[104px] bg-gradient-to-br from-[#dfe6ee] to-[#c8d2dd] relative">
        <span className="absolute bottom-1.5 left-2 text-[9px] font-semibold text-white bg-black/35 rounded px-1.5 py-0.5">{area}</span>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-semibold text-[#1c2b3a] leading-tight">{title}</p>
        <p className="text-[10.5px] font-bold text-[#1c2b3a] mt-0.5">{price}</p>
      </div>
    </div>
  );
  return (
    <div className="w-[360px] rounded-[22px] overflow-hidden ring-8 ring-[#1b1b1f] bg-[#f2f5f8] shadow-[0_18px_60px_rgba(0,0,0,0.4)]">
      {/* FINN toppbar */}
      <div className="bg-[#0063fb] px-4 pt-3.5 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-black text-[17px] tracking-tight italic">FINN</span>
          <span className="w-5 h-5 rounded-full bg-white/20" />
        </div>
        <div className="mt-2.5 h-8 rounded-lg bg-white flex items-center gap-2 px-2.5">
          <Search className="w-3.5 h-3.5 text-[#8ba0b5]" />
          <span className="text-[11px] text-[#8ba0b5]">Bolig til leie, Bergen</span>
        </div>
      </div>
      <div className="px-3 py-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Listing title="Lys 2-roms med balkong" price="14 500 kr/mnd" area="Møhlenpris" />
          <Listing title="Moderne 3-roms" price="18 900 kr/mnd" area="Sandviken" />
        </div>
        {/* Annonsen i konteksten */}
        <div>
          <p className="text-[8.5px] uppercase tracking-[0.12em] text-[#9ab0c4] mb-1 pl-0.5">Annonse</p>
          <div className="flex justify-center">
            <BoardPreview {...props} scale={1.045} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Listing title="Rekkehus med hage" price="24 000 kr/mnd" area="Fana" />
          <Listing title="Hybel nær UiB" price="9 800 kr/mnd" area="Nygårdshøyden" />
        </div>
      </div>
    </div>
  );
}

// ============================ BANNERSTUDIO ============================
function Panel({ step, icon: Icon, title, children, right }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-[#0a0a0a] text-white text-[11px] font-bold flex items-center justify-center">{step}</span>
          <h3 className="text-[13.5px] font-bold text-[#0a0a0a] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}><Icon className="w-4 h-4 text-[#8b5cf6]" /> {title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function BannerStudio({ apiKey }) {
  const [eyebrow, setEyebrow] = useState('Utleie i Bergen');
  const [headline, setHeadline] = useState('Ikke selg boligen – lei den ut');
  const [subtext, setSubtext] = useState('Gratis leievurdering på 60 sekunder');
  const [cta, setCta] = useState('Se hva du får');
  const [theme, setTheme] = useState('midnatt');
  const [selected, setSelected] = useState(new Set(FORMATS.map((f) => f.key)));
  const [photo, setPhoto] = useState(null);
  const [brief, setBrief] = useState('');
  const [variants, setVariants] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgPrompt, setBgPrompt] = useState('');
  const [rendering, setRendering] = useState(false);
  const [banners, setBanners] = useState([]);
  const [err, setErr] = useState('');
  const [landing, setLanding] = useState('https://digihome.no/bli-utleier');
  const [utmCampaign, setUtmCampaign] = useState('finn-pilot');
  const [copiedKey, setCopiedKey] = useState('');
  const [zipping, setZipping] = useState(false);
  const [previewMode, setPreviewMode] = useState('feed'); // 'board' | 'netboard' | 'feed'
  // Design-bibliotek
  const [designs, setDesigns] = useState([]);
  const [designName, setDesignName] = useState('');
  const [savingDesign, setSavingDesign] = useState(false);
  const [designBusy, setDesignBusy] = useState('');
  const fileRef = useRef(null);

  const toggleFormat = (key) => setSelected((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const utmUrl = useCallback((fmtKey) => {
    const base = landing.trim() || 'https://digihome.no/bli-utleier';
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}utm_source=finn&utm_medium=display&utm_campaign=${slugify(utmCampaign) || 'finn'}&utm_content=${fmtKey}`;
  }, [landing, utmCampaign]);

  const loadDesigns = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/finnstudio/designs?key=${encodeURIComponent(apiKey)}`);
      const j = await res.json();
      if (j.ok) setDesigns(j.designs || []);
    } catch (e) {}
  }, [apiKey]);
  useEffect(() => { loadDesigns(); }, [loadDesigns]);

  const saveDesign = async () => {
    const name = designName.trim() || headline.slice(0, 40);
    setSavingDesign(true); setErr('');
    try {
      const res = await fetch(`/api/admin/finnstudio/designs?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, eyebrow, headline, subtext, cta, theme, landing, utmCampaign, photo: photo || undefined }),
      });
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'Lagring feilet'); return; }
      setDesignName('');
      await loadDesigns();
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setSavingDesign(false); }
  };

  const openDesign = async (id) => {
    setDesignBusy(id);
    try {
      const res = await fetch(`/api/admin/finnstudio/designs?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(id)}`);
      const j = await res.json();
      if (!j.ok) return;
      const d = j.design;
      setEyebrow(d.eyebrow || ''); setHeadline(d.headline || ''); setSubtext(d.subtext || '');
      setCta(d.cta || 'Les mer'); setTheme(d.theme || 'midnatt');
      if (d.landing) setLanding(d.landing);
      if (d.utmCampaign) setUtmCampaign(d.utmCampaign);
      setPhoto(d.photo || null);
      setBanners([]);
    } catch (e) {}
    finally { setDesignBusy(''); }
  };

  const deleteDesign = async (id) => {
    setDesignBusy(id);
    try {
      await fetch(`/api/admin/finnstudio/designs?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadDesigns();
    } catch (e) {}
    finally { setDesignBusy(''); }
  };

  const suggest = async () => {
    if (!brief.trim()) { setErr('Skriv en kort brief først — f.eks. «nå boligeiere i Bergen som vurderer å selge»'); return; }
    setAiBusy(true); setErr('');
    try {
      const res = await fetch(`/api/admin/finnstudio/copy?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, landing }),
      });
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'AI-forslag feilet'); return; }
      setVariants(j.variants || []);
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setAiBusy(false); }
  };

  const genBg = async () => {
    setBgBusy(true); setErr('');
    try {
      const res = await fetch(`/api/admin/finnstudio/genbg?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: bgPrompt.trim() || undefined }),
      });
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'AI-bakgrunn feilet'); return; }
      setPhoto(j.dataUrl);
    } catch (e) { setErr('Nettverksfeil under bildegenerering'); }
    finally { setBgBusy(false); }
  };

  const onPhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) { setErr('Bildet er for stort (maks 6 MB)'); return; }
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(f);
  };

  const render = async () => {
    if (!headline.trim()) { setErr('Overskrift mangler'); return; }
    if (selected.size === 0) { setErr('Velg minst ett format'); return; }
    setRendering(true); setErr('');
    try {
      const res = await fetch(`/api/admin/finnstudio/render?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, subtext, cta, eyebrow, theme, imageB64: photo || undefined, formats: [...selected] }),
      });
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'Rendering feilet'); return; }
      setBanners(j.banners || []);
    } catch (e) { setErr('Nettverksfeil under rendering'); }
    finally { setRendering(false); }
  };

  const copyUrl = (key) => {
    try { navigator.clipboard.writeText(utmUrl(key)); setCopiedKey(key); setTimeout(() => setCopiedKey(''), 1600); } catch (e) {}
  };

  const downloadOne = (b) => {
    const a = document.createElement('a');
    a.href = b.dataUrl;
    a.download = `finn-${b.key}-${b.w}x${b.h}.${b.type === 'jpeg' ? 'jpg' : b.type}`;
    a.click();
  };

  const downloadZip = async () => {
    if (!banners.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const lines = [
        'DigiHome — display-materiell for FINN.no',
        `Generert: ${new Date().toLocaleString('nb-NO')}`,
        '',
        'SLIK LEVERES MATERIELLET:',
        'Send filene i denne pakken til adops@finn.no senest 3 virkedager før',
        'kampanjestart (innen kl. 12.00). Inkluder bookingnummer og startdato',
        'i emnefeltet. Sett FINN-kontaktpersonen deres på kopi.',
        '',
        'KLIKK-URL PER FORMAT (oppgis til FINN sammen med filene):',
      ];
      for (const b of banners) {
        const ext = b.type === 'jpeg' ? 'jpg' : b.type;
        zip.file(`finn-${b.key}-${b.w}x${b.h}.${ext}`, b.dataUrl.split(',')[1], { base64: true });
        const f = FORMATS.find((x) => x.key === b.key);
        lines.push(`- ${f ? f.label : b.key} (${b.w}×${b.h}, ${Math.round(b.bytes / 1024)} kB av maks ${b.maxKb} kB):`);
        lines.push(`  ${utmUrl(b.key)}`);
      }
      lines.push('', 'MERK:', '- «Hestesko side» brukes to ganger (venstre + høyre).',
        '- «Wallpaper» kombineres med hestesko-formatene.',
        '- Alle filer ligger innenfor FINNs vektgrenser.', '',
        'Avbestillingsregler hos FINN: flytting >10 dager før er gratis;',
        'avbestilling <10 dager før koster 25 %, <3 dager før koster 100 %.');
      zip.file('LEVERING-TIL-FINN.txt', lines.join('\n'));
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `digihome-finn-bannere-${slugify(utmCampaign) || 'kampanje'}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) { setErr('Kunne ikke lage ZIP: ' + (e.message || '')); }
    finally { setZipping(false); }
  };

  const groups = useMemo(() => ([
    { id: 'mobil', label: 'Mobil', icon: Smartphone, items: banners.filter((b) => (b.group || FORMATS.find((f) => f.key === b.key)?.group) === 'mobil') },
    { id: 'desktop', label: 'Desktop', icon: Monitor, items: banners.filter((b) => (b.group || FORMATS.find((f) => f.key === b.key)?.group) === 'desktop') },
  ]), [banners]);

  const previewProps = { headline, subtext, cta, eyebrow, theme, photo };

  return (
    <div className="grid xl:grid-cols-[400px_1fr] gap-5 items-start">
      {/* ---------- VENSTRE ---------- */}
      <div className="space-y-4">
        <Panel step="1" icon={Type} title="Budskap">
          <div className="rounded-xl bg-gradient-to-br from-[#f5f1fb] to-[#faf9f7] p-3 ring-1 ring-[#ece5f7]">
            <textarea
              value={brief} onChange={(e) => setBrief(e.target.value)} rows={2}
              placeholder="AI-brief — f.eks. «nå boligeiere i Bergen som vurderer å selge, vinkle mot utleie i stedet»"
              className="w-full rounded-lg bg-white/70 px-3 py-2 text-[12.5px] text-[#0a0a0a] placeholder:text-[#a99cc4] outline-none ring-1 ring-transparent focus:ring-[#dcd6ca] resize-none transition-all"
              data-testid="finn-brief-input"
            />
            <button onClick={suggest} disabled={aiBusy} data-testid="finn-ai-btn" className="mt-1.5 h-9 px-3.5 rounded-full bg-[#8b5cf6] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#7c4fd0] active:scale-[0.97] transition-all disabled:opacity-50">
              {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Foreslå 4 vinkler
            </button>
            {variants.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {variants.map((v, i) => (
                  <button key={i} onClick={() => { setHeadline(v.headline); setSubtext(v.subtext); setCta(v.cta || 'Les mer'); }} className="w-full text-left rounded-lg px-3 py-2 bg-white ring-1 ring-transparent hover:ring-[#8b5cf6]/40 transition-all">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8b5cf6]">{v.angle}</p>
                    <p className="text-[12.5px] font-bold text-[#0a0a0a]">{v.headline}</p>
                    <p className="text-[11px] text-[#888]">{v.subtext} · <span className="font-semibold">{v.cta}</span></p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className={labelCls}>Eyebrow-chip <span className="normal-case font-normal">({eyebrow.length}/24)</span></label>
              <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value.slice(0, 24))} className={inputCls} placeholder="Utleie i Bergen" />
            </div>
            <div>
              <label className={labelCls}>Overskrift <span className="normal-case font-normal">({headline.length}/34)</span></label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, 34))} data-testid="finn-headline-input" className={inputCls + ' font-semibold'} />
              <p className="mt-1 text-[10.5px] text-[#b3a1cf]">Tips: siste ord får aksentfarge automatisk</p>
            </div>
            <div>
              <label className={labelCls}>Undertekst <span className="normal-case font-normal">({subtext.length}/50)</span></label>
              <input value={subtext} onChange={(e) => setSubtext(e.target.value.slice(0, 50))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>CTA-knapp <span className="normal-case font-normal">({cta.length}/16)</span></label>
              <input value={cta} onChange={(e) => setCta(e.target.value.slice(0, 16))} className={inputCls + ' font-semibold'} />
            </div>
          </div>
        </Panel>

        <Panel step="2" icon={Palette} title="Stil">
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map((t) => (
              <button key={t.v} onClick={() => setTheme(t.v)} className={`rounded-xl overflow-hidden ring-2 transition-all ${theme === t.v ? 'ring-[#0a0a0a] scale-[1.02]' : 'ring-transparent hover:ring-[#ddd]'}`}>
                <div className="h-12 relative" style={{ background: t.bg }}>
                  <div className="absolute rounded-full" style={{ width: 46, height: 46, right: -14, top: -18, background: `radial-gradient(circle, ${t.accent}66 0%, transparent 65%)` }} />
                  <span className="absolute left-1.5 bottom-1 font-bold" style={{ color: t.fg, fontSize: 10, fontFamily: t.serif ? 'Georgia, serif' : 'inherit', fontStyle: t.serif ? 'italic' : 'normal' }}>Aa</span>
                  <span className="absolute right-1.5 bottom-1.5 w-2 h-2 rounded-full" style={{ background: t.accent }} />
                </div>
                <p className={`text-[10.5px] font-semibold py-1 ${theme === t.v ? 'bg-[#0a0a0a] text-white' : 'bg-[#faf9f7] text-[#666]'}`}>{t.l}</p>
              </button>
            ))}
          </div>
          <div className="mt-3.5">
            <label className={labelCls}>Bakgrunnsfoto <span className="normal-case font-normal">(Board, XL, Netboard, Fullskjerm)</span></label>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <button onClick={() => fileRef.current && fileRef.current.click()} className="h-9 px-3.5 rounded-full bg-white text-[12px] font-semibold text-[#444] ring-1 ring-[#e5e5e5] hover:ring-[#ccc] inline-flex items-center gap-1.5 transition-all"><ImageIcon className="w-3.5 h-3.5" /> Last opp</button>
              <button onClick={genBg} disabled={bgBusy} data-testid="finn-genbg-btn" className="h-9 px-3.5 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#cf97fc] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.97] transition-all disabled:opacity-60">
                {bgBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI-bakgrunn
              </button>
              {photo && (
                <span className="inline-flex items-center gap-1.5">
                  <img src={photo} alt="" className="h-9 w-14 object-cover rounded-lg ring-1 ring-[#eee]" />
                  <button onClick={() => setPhoto(null)} className="text-[#999] hover:text-rose-500 transition-colors" title="Fjern foto"><X className="w-4 h-4" /></button>
                </span>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} className="hidden" />
            </div>
            <input value={bgPrompt} onChange={(e) => setBgPrompt(e.target.value.slice(0, 200))} placeholder="Valgfritt AI-prompt — ellers: elegant Bergen-interiør i kveldslys" className={inputCls + ' mt-2 text-[12px]'} />
            {bgBusy && <p className="mt-1.5 text-[11px] text-[#8b5cf6] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Genererer foto — tar 15–60 sekunder …</p>}
          </div>
        </Panel>

        <Panel step="3" icon={LayoutGrid} title={`Formater (${selected.size}/${FORMATS.length})`} right={<button onClick={() => setSelected(new Set(FORMATS.map((f) => f.key)))} className="text-[11px] font-semibold text-[#8b5cf6] hover:underline">Velg alle</button>}>
          {['mobil', 'desktop'].map((g) => (
            <div key={g} className={g === 'desktop' ? 'mt-2.5' : ''}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#bbb] flex items-center gap-1 mb-1.5">{g === 'mobil' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />} {g}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMATS.filter((f) => f.group === g).map((f) => (
                  <button key={f.key} onClick={() => toggleFormat(f.key)} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left ring-1 transition-all ${selected.has(f.key) ? 'bg-[#faf9f7] ring-[#dcd6ca]' : 'bg-white ring-[#f0f0f0] opacity-45 hover:opacity-80'}`}>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${selected.has(f.key) ? 'bg-[#0a0a0a]' : 'bg-[#e5e5e5]'}`}>{selected.has(f.key) && <Check className="w-3 h-3 text-white" />}</span>
                    <span className="min-w-0">
                      <span className="block text-[11.5px] font-semibold text-[#0a0a0a] truncate">{f.label}</span>
                      <span className="block text-[10px] text-[#aaa]">{f.dim}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Panel>

        <Panel step="4" icon={Link2} title="Klikk-URL (UTM)">
          <div className="space-y-2.5">
            <div>
              <label className={labelCls}>Landingsside</label>
              <input value={landing} onChange={(e) => setLanding(e.target.value)} className={inputCls + ' text-[12px]'} />
            </div>
            <div>
              <label className={labelCls}>Kampanjenavn (utm_campaign)</label>
              <input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} data-testid="finn-utm-input" className={inputCls + ' text-[12px]'} />
            </div>
            <p className="text-[11px] text-[#999] leading-relaxed">Bruk samme navn under «Kampanjer & måling» — da kobles klikk → leads → kunder automatisk.</p>
          </div>
        </Panel>

        {/* Design-bibliotek */}
        <Panel step="5" icon={FolderOpen} title="Mine design">
          <div className="flex items-center gap-2">
            <input value={designName} onChange={(e) => setDesignName(e.target.value.slice(0, 60))} placeholder={`Navn (ellers: «${headline.slice(0, 24)}…»)`} className={inputCls + ' !mt-0 flex-1 text-[12px]'} />
            <button onClick={saveDesign} disabled={savingDesign} data-testid="finn-save-design-btn" className="h-10 px-3.5 rounded-xl bg-[#0a0a0a] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.97] transition-all disabled:opacity-50 shrink-0">
              {savingDesign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Lagre
            </button>
          </div>
          {designs.length > 0 && (
            <div className="mt-2.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {designs.map((d) => {
                const t = THEMES.find((x) => x.v === d.theme) || THEMES[0];
                return (
                  <div key={d.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-[#faf9f7] ring-1 ring-[#f0ece4]">
                    <span className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10" style={{ background: t.bg }} />
                    <button onClick={() => openDesign(d.id)} className="flex-1 min-w-0 text-left group">
                      <p className="text-[12px] font-semibold text-[#0a0a0a] truncate group-hover:text-[#8b5cf6] transition-colors">{d.name}</p>
                      <p className="text-[10px] text-[#aaa] truncate">{t.l}{d.hasPhoto ? ' · foto' : ''} · {String(d.updatedAt || '').slice(0, 10)}</p>
                    </button>
                    {designBusy === d.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#999]" />
                      : <button onClick={() => deleteDesign(d.id)} className="text-[#bbb] hover:text-rose-500 transition-colors shrink-0" title="Slett"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                );
              })}
            </div>
          )}
          {designs.length === 0 && <p className="mt-2 text-[11px] text-[#aaa]">Lagre designet for å gjenbruke det senere — inkludert foto og UTM-oppsett.</p>}
        </Panel>

        <button onClick={render} disabled={rendering} data-testid="finn-render-btn" className="w-full py-4 rounded-2xl bg-[#0a0a0a] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(10,10,10,0.25)] hover:shadow-[0_10px_36px_rgba(139,92,246,0.35)] active:scale-[0.99] transition-all disabled:opacity-50">
          {rendering ? <><Loader2 className="w-4 h-4 animate-spin" /> Genererer {selected.size} formater …</> : <><Sparkles className="w-4 h-4 text-[#cf97fc]" /> Generer bannere ({selected.size} formater)</>}
        </button>
        {err && <div className="bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {err}</div>}
      </div>

      {/* ---------- HØYRE ---------- */}
      <div className="space-y-4 xl:sticky xl:top-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#151318] to-[#232028] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Live forhåndsvisning</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-white/[0.07] rounded-full p-0.5">
                {[['feed', 'I FINN-feeden'], ['board', 'Board'], ['netboard', 'Netboard']].map(([v, l]) => (
                  <button key={v} onClick={() => setPreviewMode(v)} className={`px-3 h-7 rounded-full text-[11px] font-semibold transition-all ${previewMode === v ? 'bg-white text-[#0a0a0a]' : 'text-white/55 hover:text-white'}`}>{l}</button>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] text-emerald-300/90 bg-emerald-400/10 rounded-full px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live</span>
            </div>
          </div>
          <div className="flex justify-center">
            {previewMode === 'feed' && <FinnFeedMock {...previewProps} />}
            {previewMode === 'board' && <BoardPreview {...previewProps} scale={1.15} />}
            {previewMode === 'netboard' && <NetboardPreview {...previewProps} scale={0.95} />}
          </div>
          <p className="mt-4 text-center text-[11px] text-white/35">
            {previewMode === 'feed' ? 'Slik møter annonsen boligsøkere og utleiere i FINN eiendom-feeden (Bergen)' : 'Oppdateres direkte mens du skriver — alle formatene genereres fra samme design'}
          </p>
        </div>

        {banners.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <Layers className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#666]">Klar for full produksjon</p>
            <p className="text-[12.5px] text-[#999] mt-1">Trykk «Generer bannere» — alle {FORMATS.length} FINN-formatene lages på sekunder,<br />ferdig pakket med klikk-URL-er og leveringsinstruks for adops@finn.no.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <p className="text-[13px] text-[#666]"><b className="text-[#0a0a0a]">{banners.length} bannere</b> · alle innenfor FINNs vektgrenser</p>
              <button onClick={downloadZip} disabled={zipping} data-testid="finn-zip-btn" className="h-10 px-5 rounded-full bg-emerald-600 text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-50">
                {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Last ned FINN-pakke (ZIP)
              </button>
            </div>
            {groups.filter((g) => g.items.length).map((g) => (
              <div key={g.id} className="mb-4 last:mb-0">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#bbb] flex items-center gap-1.5 mb-2"><g.icon className="w-3.5 h-3.5" /> {g.label}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {g.items.map((b) => {
                    const f = FORMATS.find((x) => x.key === b.key);
                    const over = b.bytes > b.maxKb * 1024;
                    return (
                      <div key={b.key} className="rounded-xl ring-1 ring-[#eee] overflow-hidden">
                        <div className="bg-[repeating-conic-gradient(#f4f2ee_0%_25%,#fbfaf8_0%_50%)] bg-[length:16px_16px] flex items-center justify-center p-3 min-h-[120px]">
                          <img src={b.dataUrl} alt={b.label} className="max-w-full h-auto shadow-[0_4px_18px_rgba(0,0,0,0.12)]" style={{ maxHeight: 210 }} />
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white">
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-[#0a0a0a] truncate">{f ? f.label : b.key} <span className="text-[#aaa] font-normal">{b.w}×{b.h}</span></p>
                            <p className={`text-[10px] ${over ? 'text-rose-500 font-semibold' : 'text-[#999]'}`}>{Math.round(b.bytes / 1024)} kB / {b.maxKb} kB {over ? '— for tung!' : '✓'}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => copyUrl(b.key)} title="Kopier klikk-URL" className="h-8 w-8 rounded-full bg-[#faf9f7] text-[#666] hover:text-[#0a0a0a] ring-1 ring-[#eee] flex items-center justify-center transition-all">
                              {copiedKey === b.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => downloadOne(b)} title="Last ned" className="h-8 w-8 rounded-full bg-[#faf9f7] text-[#666] hover:text-[#0a0a0a] ring-1 ring-[#eee] flex items-center justify-center transition-all"><Download className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="mt-1 text-[11px] text-[#999] flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> ZIP-en inneholder alle filene + «LEVERING-TIL-FINN.txt» med klikk-URL-er og leveringsinstruks (adops@finn.no, 3 virkedager før start, kl. 12).</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ PLANLEGGER ============================
const CHECKLIST = [
  ['design', 'Design og budskap klart (Bannerstudio)'],
  ['zip', 'FINN-pakke (ZIP) lastet ned'],
  ['forespørsel', 'Forespørsel sendt til FINN (skjema eller e-post)'],
  ['skreddersøm', 'Spurt FINN om skreddersydd utleier-segment'],
  ['booking', 'Booking bekreftet med bookingnummer'],
  ['materiell', 'Materiell sendt adops@finn.no (min. 3 virkedager før)'],
  ['kampanje', 'Kampanjen registrert under «Kampanjer & måling»'],
  ['utm', 'UTM-lenke testet (klikk gir økt i Betalt trakt)'],
  ['rapport', 'FINN-rapport mottatt og tall oppdatert'],
  ['evaluering', 'Evaluert mot suksesskriteriet (CPL / lead-kvalitet)'],
];

function Planner() {
  const [budget, setBudget] = useState(12000);
  const [cpm, setCpm] = useState(155);
  const [ctr, setCtr] = useState(0.15);
  const [cvr, setCvr] = useState(5);
  const [weeks, setWeeks] = useState(3);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    try { const s = localStorage.getItem('finn_pilot_checklist'); if (s) setChecked(JSON.parse(s)); } catch (e) {}
  }, []);
  const toggleCheck = (k) => setChecked((c) => {
    const n = { ...c, [k]: !c[k] };
    try { localStorage.setItem('finn_pilot_checklist', JSON.stringify(n)); } catch (e) {}
    return n;
  });

  const imps = cpm > 0 ? (budget / cpm) * 1000 : 0;
  const clicks = imps * (ctr / 100);
  const cpc = clicks > 0 ? budget / clicks : null;
  const leads = clicks * (cvr / 100);
  const cpl = leads > 0 ? budget / leads : null;
  const doneCount = CHECKLIST.filter(([k]) => checked[k]).length;

  const scenarios = [
    ['Pessimistisk', 0.08, 3],
    ['Realistisk', 0.15, 5],
    ['Optimistisk', 0.3, 8],
  ];

  const email = `Emne: Forespørsel — display-kampanje på FINN eiendom (Bergen)

Hei,

Vi ønsker å booke en display-kampanje på FINN eiendom og ber om et tilbud.

Om oss: DigiHome (digihome.no) — profesjonell utleieforvaltning i Bergen.
Mål: leads fra boligeiere i Bergen (gratis leievurdering på 60 sekunder).

Ønsket oppsett:
- Plassering: FINN eiendom, søkeresultatsider (bolig til salgs + bolig til leie)
- Geografi: Bergen / Vestland (lokasjonsmålretting)
- Formater: Board 320x250, Board XL 320x400, Netboard 580x400 (+ evt. Fullskjerm)
- Periode: ca. ${weeks} uker
- Budsjett: ca. ${nf.format(budget)} kr (brutto)

Spørsmål:
1) Kan dere bygge et skreddersydd segment av brukere som nylig har brukt utleieskjemaet («legg ut bolig til leie») eller aktivt browser leieobjekter i Bergen? (jf. skreddersøm-målretting)
2) Hva er minste bookingbeløp og estimert visningsvolum for oppsettet over?
3) Har dere benchmark-CTR for Board/Netboard på FINN eiendom?

Materiell leveres ferdig produsert (PNG/JPG innenfor spesifikasjonene) senest 3 virkedager før start.

Vennlig hilsen
DigiHome — digihome.no`;

  const copyEmail = () => {
    try { navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) {}
  };

  const numInput = (v, set, step = 1) => (
    <input type="number" value={v} step={step} onChange={(e) => set(Number(e.target.value) || 0)} className={inputCls + ' tabular-nums'} />
  );

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      {/* Kalkulator */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <h3 className="text-[14px] font-bold text-[#0a0a0a] flex items-center gap-1.5 mb-1" style={{ fontFamily: 'var(--font-heading)' }}><Calculator className="w-4 h-4 text-[#8b5cf6]" /> Budsjett- og CPL-kalkulator</h3>
        <p className="text-[11.5px] text-[#999] mb-3.5">Basert på FINNs 2026-priser (Board/Netboard på FINN eiendom + Bergen ≈ 155 kr CPM). Juster forutsetningene selv.</p>
        <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
          {scenarios.map(([l, sctr, scvr]) => (
            <button key={l} onClick={() => { setCtr(sctr); setCvr(scvr); }} className={`h-8 px-3 rounded-full text-[11.5px] font-semibold ring-1 transition-all ${ctr === sctr && cvr === scvr ? 'bg-[#0a0a0a] text-white ring-[#0a0a0a]' : 'bg-white text-[#666] ring-[#e5e5e5] hover:ring-[#ccc]'}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><label className={labelCls}>Budsjett (kr)</label>{numInput(budget, setBudget, 1000)}</div>
          <div><label className={labelCls}>CPM (kr)</label>{numInput(cpm, setCpm, 5)}</div>
          <div><label className={labelCls}>Uker</label>{numInput(weeks, setWeeks)}</div>
          <div><label className={labelCls}>CTR (%)</label>{numInput(ctr, setCtr, 0.01)}</div>
          <div><label className={labelCls}>Konv.rate (%)</label>{numInput(cvr, setCvr, 0.5)}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            ['Visninger', fmtNum(imps)],
            ['Klikk', fmtNum(clicks)],
            ['Reell CPC', cpc != null ? fmtKr2(cpc) : '–'],
            ['Leads', leads >= 10 ? fmtNum(leads) : (Math.round(leads * 10) / 10).toLocaleString('nb-NO')],
            ['Estimert CPL', cpl != null ? fmtKr(cpl) : '–'],
          ].map(([l, v], i) => (
            <div key={l} className={`rounded-xl px-3 py-3 ${i === 4 ? 'bg-[#0a0a0a] text-white' : 'bg-[#faf9f7]'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${i === 4 ? 'text-[#cf97fc]' : 'text-[#999]'}`}>{l}</p>
              <p className={`text-[16px] font-bold tabular-nums mt-0.5 ${i === 4 ? 'text-white' : 'text-[#0a0a0a]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#999] leading-relaxed flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Display-CTR på FINN ligger typisk på 0,08–0,3 %. Sett suksesskriteriet FØR start — f.eks. «CPL under 1 500 kr eller minst 2× høyere lead-til-avtale-rate enn Meta» — og avslutt piloten hvis det ikke nås.</p>
      </div>

      <div className="space-y-4">
        {/* Booking-e-post */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <h3 className="text-[14px] font-bold text-[#0a0a0a] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}><Mail className="w-4 h-4 text-[#8b5cf6]" /> Booking-forespørsel til FINN</h3>
            <div className="flex items-center gap-1.5">
              <a href="https://www.finn.no/bedriftskunde/annonseprodukter/foresporsel" target="_blank" rel="noreferrer" className="h-8 px-3 rounded-full bg-white text-[11.5px] font-semibold text-[#444] ring-1 ring-[#e5e5e5] hover:ring-[#ccc] inline-flex items-center gap-1.5 transition-all">FINN-skjema <ExternalLink className="w-3 h-3" /></a>
              <button onClick={copyEmail} data-testid="finn-copy-email-btn" className="h-8 px-3 rounded-full bg-[#0a0a0a] text-white text-[11.5px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.97] transition-all">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Kopier e-post
              </button>
            </div>
          </div>
          <p className="text-[11.5px] text-[#999] mb-2.5">Ferdig utfylt med oppsett, budsjett fra kalkulatoren og skreddersøm-spørsmålet om utleier-segmentet.</p>
          <pre className="rounded-xl bg-[#faf9f7] ring-1 ring-[#f0ece4] p-3.5 text-[11px] leading-relaxed text-[#444] whitespace-pre-wrap max-h-72 overflow-y-auto font-mono">{email}</pre>
        </div>

        {/* Sjekkliste */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[14px] font-bold text-[#0a0a0a] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}><ClipboardCheck className="w-4 h-4 text-[#8b5cf6]" /> Pilot-sjekkliste</h3>
            <span className="text-[11.5px] font-semibold text-[#999] tabular-nums">{doneCount}/{CHECKLIST.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#f1efeb] overflow-hidden mb-3">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#cf97fc] transition-all" style={{ width: `${(doneCount / CHECKLIST.length) * 100}%` }} />
          </div>
          <div className="space-y-1">
            {CHECKLIST.map(([k, l]) => (
              <button key={k} onClick={() => toggleCheck(k)} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-[#faf9f7] transition-colors">
                <span className={`w-4.5 h-4.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${checked[k] ? 'bg-emerald-500' : 'bg-[#eee]'}`}>{checked[k] && <Check className="w-3.5 h-3.5 text-white" />}</span>
                <span className={`text-[12.5px] ${checked[k] ? 'text-[#aaa] line-through' : 'text-[#333]'}`}>{l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================ KAMPANJER & MÅLING ============================
const EMPTY_FORM = { name: '', utmCampaign: '', startDate: '', endDate: '', budgetNok: '', spendNok: '', impressions: '', clicks: '', status: 'planlagt', note: '' };

function FinnCampaigns({ apiKey }) {
  const [data, setData] = useState(null);
  const [bench, setBench] = useState(null); // {finnSessions, finnLeads, metaCpl, googleCpl}
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [res, aRes] = await Promise.all([
        fetch(`/api/admin/finnstudio/campaigns?key=${encodeURIComponent(apiKey)}`),
        fetch(`/api/admin/analytics?key=${encodeURIComponent(apiKey)}&days=30`).catch(() => null),
      ]);
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'Kunne ikke laste kampanjer'); return; }
      setData(j);
      try {
        const a = aRes ? await aRes.json() : null;
        const chs = a?.paid?.channels || [];
        const finn = chs.find((c) => c.key === 'finn');
        const meta = chs.find((c) => c.key === 'meta');
        const google = chs.find((c) => c.key === 'google');
        setBench({ finnSessions: finn?.sessions ?? 0, finnLeads: finn?.leads ?? finn?.submit ?? 0, metaCpl: meta?.cpl ?? null, googleCpl: google?.cpl ?? null });
      } catch (e) {}
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name || '', utmCampaign: c.utmCampaign || '', startDate: c.startDate || '', endDate: c.endDate || '',
      budgetNok: c.budgetNok ?? '', spendNok: c.spendNok ?? '', impressions: c.impressions ?? '', clicks: c.clicks ?? '',
      status: c.status || 'planlagt', note: c.note || '',
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setErr('Kampanjenavn mangler'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(`/api/admin/finnstudio/campaigns?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId || undefined }),
      });
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'Lagring feilet'); return; }
      setForm(EMPTY_FORM); setEditingId(null); setFormOpen(false);
      await load();
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Slette denne kampanjen? Kun registreringen slettes — leads beholdes.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/finnstudio/campaigns?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await load();
    } catch (e) {}
    finally { setBusyId(null); }
  };

  const statusPill = (s) => {
    const map = { aktiv: 'bg-emerald-50 text-emerald-700', planlagt: 'bg-sky-50 text-sky-700', avsluttet: 'bg-[#f1efeb] text-[#888]' };
    return <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full capitalize ${map[s] || map.planlagt}`}>{s}</span>;
  };

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>;

  const campaigns = (data && data.campaigns) || [];
  const t = (data && data.totals) || {};

  return (
    <div>
      <div className="mb-4 bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] border-l-4 border-[#cf97fc]">
        <p className="text-[12.5px] text-[#555] leading-relaxed">
          <b className="text-[#0a0a0a]">Slik måles FINN:</b> FINN har ikke annonse-API — <b>visninger, klikk og forbruk</b> registrerer du manuelt fra FINNs kampanjerapport her.
          <b> Økter, leads og vunnede kunder</b> måles automatisk via UTM-lenkene fra Bannerstudio (utm_source=finn). Med samme utm_campaign-navn kobles alt — og FINN vises som egen kanal i Betalt trakt.
        </p>
      </div>

      {/* Live FINN-trafikk + benchmark */}
      {bench && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#0a0a0a] text-white text-[11.5px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> FINN-trafikk siste 30 d: {fmtNum(bench.finnSessions)} økter · {fmtNum(bench.finnLeads)} leads
          </span>
          {bench.metaCpl != null && <span className="inline-flex items-center h-8 px-3 rounded-full bg-white ring-1 ring-[#eee] text-[11.5px] font-semibold text-[#555]">Benchmark Meta CPL: {fmtKr(bench.metaCpl)}</span>}
          {bench.googleCpl != null && <span className="inline-flex items-center h-8 px-3 rounded-full bg-white ring-1 ring-[#eee] text-[11.5px] font-semibold text-[#555]">Google CPL: {fmtKr(bench.googleCpl)}</span>}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-4">
        {[
          [Coins, 'Forbruk', fmtKr(t.spend)],
          [Eye, 'Visninger', fmtNum(t.impressions)],
          [MousePointerClick, 'Klikk (FINN)', fmtNum(t.clicks)],
          [Users, 'Økter (målt)', fmtNum(t.sessions)],
          [Target, 'Leads (målt)', fmtNum(t.leads)],
          [CheckCircle2, 'CPL', t.cpl != null ? fmtKr2(t.cpl) : '–'],
        ].map(([Icon, l, v]) => (
          <div key={l} className="bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#999] flex items-center gap-1"><Icon className="w-3 h-3" /> {l}</p>
            <p className="text-[19px] font-bold text-[#0a0a0a] mt-0.5 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        {!formOpen ? (
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setFormOpen(true); }} data-testid="finn-new-campaign-btn" className="h-10 px-4 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.97] transition-all">
            <Plus className="w-4 h-4" /> Registrer kampanje
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{editingId ? 'Rediger kampanje' : 'Ny FINN-kampanje'}</h3>
              <button onClick={() => { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); }} className="text-[#999] hover:text-[#0a0a0a]"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ['name', 'Kampanjenavn *', 'text', 'F.eks. FINN eiendom Bergen — pilot'],
                ['utmCampaign', 'utm_campaign (kobler leads)', 'text', 'finn-pilot'],
                ['startDate', 'Startdato', 'date', ''],
                ['endDate', 'Sluttdato', 'date', ''],
                ['budgetNok', 'Budsjett (kr)', 'number', '12000'],
                ['spendNok', 'Forbruk så langt (kr)', 'number', '0'],
                ['impressions', 'Visninger (fra FINN-rapport)', 'number', '0'],
                ['clicks', 'Klikk (fra FINN-rapport)', 'number', '0'],
              ].map(([k, l, type, ph]) => (
                <div key={k}>
                  <label className={labelCls}>{l}</label>
                  <input type={type} value={form[k]} onChange={set(k)} placeholder={ph} data-testid={`finn-form-${k}`} className={inputCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={set('status')} className={inputCls + ' cursor-pointer'}>
                  {['planlagt', 'aktiv', 'avsluttet'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Notat</label>
                <input value={form.note} onChange={set('note')} placeholder="F.eks. Board + Native, eiendom + Bergen-målretting, bookingnr. 12345" className={inputCls} />
              </div>
            </div>
            <button onClick={save} disabled={saving} data-testid="finn-save-campaign-btn" className="mt-4 h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.97] transition-all disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editingId ? 'Lagre endringer' : 'Opprett kampanje'}
            </button>
          </div>
        )}
      </div>

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <Target className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#666]">Ingen FINN-kampanjer registrert ennå</p>
          <p className="text-[12.5px] text-[#999] mt-1">Når dere booker hos FINN: registrer kampanjen her med samme utm_campaign som i Bannerstudio — så måles alt automatisk. Bruk «Planlegger»-fanen for budsjett og booking-e-post.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const m = c.measured || {};
            const budget = Number(c.budgetNok) || 0;
            const spend = Number(c.spendNok) || 0;
            const pct = budget ? Math.min(100, Math.round((spend / budget) * 100)) : null;
            const metaCpl = bench?.metaCpl;
            const cplDelta = m.cpl != null && metaCpl ? m.cpl / metaCpl : null;
            return (
              <div key={c.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[14.5px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{c.name}</h4>
                      {statusPill(c.status)}
                      {c.utmCampaign && <span className="text-[10.5px] font-mono text-[#8b5cf6] bg-[#8b5cf6]/8 px-2 py-0.5 rounded-full">utm: {c.utmCampaign}</span>}
                      {cplDelta != null && (
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${cplDelta <= 1.2 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {cplDelta <= 1.2 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />} {new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(cplDelta)}× Meta-CPL
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-[#999] mt-0.5">
                      {c.startDate || '?'} → {c.endDate || 'løpende'}{c.note ? ` · ${c.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEdit(c)} title="Rediger / oppdater tall" className="h-9 w-9 rounded-full bg-[#faf9f7] text-[#666] hover:text-[#0a0a0a] ring-1 ring-[#eee] flex items-center justify-center transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(c.id)} disabled={busyId === c.id} title="Slett" className="h-9 w-9 rounded-full bg-[#faf9f7] text-[#999] hover:text-rose-500 ring-1 ring-[#eee] flex items-center justify-center transition-all disabled:opacity-40">
                      {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {pct != null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10.5px] text-[#999] mb-1">
                      <span>Budsjettforbruk</span>
                      <span className="tabular-nums"><b className="text-[#0a0a0a]">{fmtKr(spend)}</b> av {fmtKr(budget)} ({pct} %)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#f1efeb] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 95 ? 'bg-rose-400' : pct >= 75 ? 'bg-amber-400' : 'bg-gradient-to-r from-[#8b5cf6] to-[#cf97fc]'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-3.5 grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#faf9f7] p-3.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#999] mb-2">Fra FINN-rapport (manuelt)</p>
                    <div className="grid grid-cols-3 gap-y-2">
                      {[['Forbruk', fmtKr(c.spendNok)], ['Visninger', fmtNum(c.impressions)], ['Klikk', fmtNum(c.clicks)], ['CTR', fmtPct(m.ctr)], ['CPC', m.cpc != null ? fmtKr2(m.cpc) : '–'], ['CPM', m.cpm != null ? fmtKr2(m.cpm) : '–']].map(([l, v]) => (
                        <div key={l}><p className="text-[10px] text-[#aaa]">{l}</p><p className="text-[13px] font-bold text-[#0a0a0a] tabular-nums">{v}</p></div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#f5f1fb] p-3.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8b5cf6] mb-2">Målt hos oss (UTM — automatisk)</p>
                    <div className="grid grid-cols-3 gap-y-2">
                      {[['Økter', fmtNum(m.sessions)], ['Leads', fmtNum(m.leads)], ['CPL', m.cpl != null ? fmtKr2(m.cpl) : '–'], ['Vunnet', fmtNum(m.won)], ['Verdi', fmtKr(m.wonValue)], ['ROAS', m.roas != null ? `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(m.roas)}×` : '–']].map(([l, v]) => (
                        <div key={l}><p className="text-[10px] text-[#8b5cf6]/60">{l}</p><p className="text-[13px] font-bold text-[#0a0a0a] tabular-nums">{v}</p></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button onClick={load} className="h-9 px-3.5 rounded-full bg-white text-[12px] font-semibold text-[#666] ring-1 ring-[#eee] hover:ring-[#dcdcdc] inline-flex items-center gap-1.5 transition-all"><RefreshCw className="w-3.5 h-3.5" /> Oppdater</button>
      </div>
    </div>
  );
}
