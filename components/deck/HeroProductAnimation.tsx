'use client';

/**
 * HeroProductAnimation — 4-scene cinematic product mockup.
 *
 * Scene 1: Address input → map with pin
 * Scene 2: Image upload + AI analysis
 * Scene 3: AI generates ad text (no images)
 * Scene 4: Finished unit detail page
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  Building2, Home, Users, Sparkles, ArrowRight,
  BarChart3, MessageCircle, ClipboardList, Eye,
  MapPin, Check, BedDouble, Layers, Bath, Maximize2,
  Camera, Key, TrendingUp, Bell, Search, AlertCircle,
  ChevronRight, ChevronDown, Wifi, Sun, Sofa, FileText, Plus, ShieldCheck,
} from 'lucide-react';

const A  = '#cf97fc';
const G  = '#059669';
const BG = '#faf8f5';
const BD = '#e8e4df';

const IMGS = [
  '/tour-apartment.webp',
  '/deck-img-1.webp',
  '/deck-img-2.webp',
  '/deck-img-3.webp',
  '/deck-img-4.webp',
];
const AVATAR = 'https://images.unsplash.com/photo-1733231291506-34503f83f503?w=80&h=80&fit=crop&crop=face';

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */
function Sidebar() {
  const sections = [
    { title: 'Arbeid', items: [
      { k: 'oversikt', l: 'Oversikt', icon: BarChart3 },
      { k: 'innboks', l: 'Innboks', icon: MessageCircle },
      { k: 'oppgaver', l: 'Oppgaver', icon: ClipboardList },
      { k: 'kalender', l: 'Kalender', icon: Eye },
      { k: 'ops', l: 'Operasjonssentral', icon: Sparkles },
    ]},
    { title: 'Drift', items: [
      { k: 'eiendommer', l: 'Eiendommer', icon: Building2, active: true },
      { k: 'leie', l: 'Leie', icon: Key },
      { k: 'saker', l: 'Saker', icon: AlertCircle },
      { k: 'personer', l: 'Personer', icon: Users },
    ]},
    { title: 'Administrasjon', items: [
      { k: 'analyse', l: 'Analyse', icon: BarChart3 },
      { k: 'okonomi', l: 'Økonomi', icon: TrendingUp },
    ]},
  ];
  return (
    <div className="bg-[#1a1a1a] py-5" style={{ height: '100%', width: 200, minWidth: 200 }}>
      <div className="px-5 mb-5"><img src="/digihome-logo-dark.svg" alt="DigiHome" className="h-[22px] w-auto" /></div>
      <div className="px-2.5 space-y-0.5">
        {sections.map(sec => (
          <React.Fragment key={sec.title}>
            <p className="text-[10px] font-semibold text-white/55 uppercase tracking-[0.12em] px-3 pt-4 pb-1.5">{sec.title}</p>
            {sec.items.map(it => {
              const on = 'active' in it && it.active;
              const Icon = it.icon;
              return (
                <div key={it.k} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium relative"
                  style={{ backgroundColor: on ? 'rgba(255,255,255,0.08)' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                  {on && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full" style={{ backgroundColor: A }} />}
                  <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.5} /><span>{it.l}</span>
                  {'badge' in it && (it as any).badge && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: A, backgroundColor: `${A}15` }}>{(it as any).badge}</span>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ═══ SCENE 1: ADDRESS + MAP ══════════════════════════════════════════════ */
const GMAP_KEY = 'AIzaSyBGsIfmz8kC7HhJxZrKlHUMBK-23rbwUeE';
const MAP_STYLES = 'style=feature:all|element:labels.text.fill|color:0x9a9a9a&style=feature:all|element:labels.text.stroke|color:0xffffff|weight:3&style=feature:poi|visibility:off&style=feature:poi.park|visibility:on|element:geometry.fill|color:0xdce8d6&style=feature:transit|visibility:off&style=feature:road|element:geometry.fill|color:0xffffff&style=feature:road|element:geometry.stroke|color:0xe8e4df&style=feature:road.highway|element:geometry.fill|color:0xf5f2ed&style=feature:water|element:geometry.fill|color:0xbfd4e2&style=feature:landscape|element:geometry.fill|color:0xf0ede8&style=feature:administrative|element:labels|visibility:off&style=feature:road|element:labels|visibility:off';
const MAP_IMG = `https://maps.googleapis.com/maps/api/staticmap?center=60.3843,5.3265&zoom=15&size=800x500&scale=2&maptype=roadmap&${MAP_STYLES}&key=${GMAP_KEY}`;

function AddressScene({ t }: { t: number }) {
  const partial = 'Olaf Ryes Vei 11C';
  const full = 'Olaf Ryes Vei 11C, 5007 Bergen';

  // Smooth typewriter
  const [typedChars, setTypedChars] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval>;
    const delay = setTimeout(() => {
      if (cancelled) return;
      let i = 0;
      iv = setInterval(() => {
        if (cancelled) { clearInterval(iv); return; }
        i++;
        setTypedChars(i);
        if (i >= partial.length) clearInterval(iv);
      }, 70);
    }, 600);
    return () => { cancelled = true; clearTimeout(delay); if (iv) clearInterval(iv); };
  }, []);

  const showDropdown = t >= 11 && typedChars >= 8;
  const highlightIdx = t >= 12 ? 0 : -1;
  const selected = t >= 13;
  const showMap = t >= 14;
  const showPin = t >= 15;
  const showPoi = t >= 16;

  const displayText = selected ? full : partial.slice(0, typedChars);
  const addrDone = selected;
  const showCursor = !selected && typedChars < partial.length;

  const suggestions = [
    { main: 'Olaf Ryes Vei 11C', sub: '5007 Bergen' },
    { main: 'Olaf Ryes Vei 11A', sub: '5007 Bergen' },
    { main: 'Olaf Ryes Vei 11B', sub: '5007 Bergen' },
  ];

  return (
    <div className="flex flex-col items-center" style={{ minHeight: 715 }}>

      {/* Top spacer — centers content group vertically */}
      <div className="shrink-0 transition-all duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ height: showMap ? 80 : 260 }} />

      {/* Heading */}
      <div className="text-center mb-4 transition-all duration-[700ms]"
        style={{ opacity: t >= 0 ? 1 : 0, transform: t >= 0 ? 'translateY(0)' : 'translateY(8px)' }}>
        <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all duration-[700ms]"
          style={{ backgroundColor: addrDone ? '#fee2e2' : '#f5f3f0', transform: showMap ? 'scale(0.85)' : 'scale(1)' }}>
          <MapPin className="w-5 h-5 transition-colors duration-500" style={{ color: addrDone ? '#e74c3c' : '#6e6357' }} strokeWidth={1.5} />
        </div>
        <h3 className="font-bold text-[#222] tracking-[-0.03em] mb-1 transition-all duration-[700ms]"
          style={{ fontSize: showMap ? 15 : 20 }}>Hvor ligger eiendommen?</h3>
        <p className="text-[#6e6357] transition-all duration-[700ms]"
          style={{ fontSize: showMap ? 10 : 12 }}>Skriv inn adressen for å komme i gang</p>
      </div>

      {/* Address input */}
      <div className="w-full px-6 transition-all duration-[800ms] ease-out relative" style={{ maxWidth: showMap ? 560 : 480, zIndex: 10 }}>
        <div className="rounded-2xl bg-white px-5 flex items-center gap-3 transition-all duration-[700ms]"
          style={{
            height: showMap ? 40 : 50,
            border: `2px solid ${addrDone ? (showMap ? BD : '#222') : typedChars > 0 ? '#222' : BD}`,
            boxShadow: !showMap && addrDone ? '0 8px 40px rgba(0,0,0,0.12)' : typedChars > 0 && !showMap ? '0 4px 24px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
            borderRadius: showDropdown && !selected ? '16px 16px 0 0' : '16px',
          }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
            style={{ backgroundColor: typedChars > 0 ? '#fee2e2' : '#f5f3f0' }}>
            <MapPin className="w-3 h-3 transition-colors duration-300" style={{ color: typedChars > 0 ? '#e74c3c' : '#bbb' }} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            {typedChars === 0 && !selected
              ? <span className="text-[14px] text-[#737373]">Skriv inn adresse...</span>
              : <span className="text-[14px] font-medium text-[#222]">
                  {displayText}
                  {showCursor && <span className="inline-block w-[2px] h-[15px] ml-0.5 align-middle rounded-full" style={{ backgroundColor: '#222', animation: 'hpa-cursor 0.5s steps(1) infinite' }} />}
                </span>}
          </div>
          {addrDone && <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: G, animation: 'hpa-fade 0.3s ease-out' }}><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
        </div>

        {/* Google-style dropdown */}
        {showDropdown && !selected && (
          <div className="absolute left-6 right-6 bg-white rounded-b-2xl overflow-hidden" style={{ border: '2px solid #222', borderTop: '1px solid #f0eeeb', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', animation: 'hpa-fade 0.3s ease-out' }}>
            {suggestions.map((s, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3 transition-all duration-300"
                style={{ backgroundColor: highlightIdx === i ? '#f5f3f0' : 'transparent' }}>
                <MapPin className="w-3.5 h-3.5 text-[#737373] shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#222]">{s.main}</p>
                  <p className="text-[10px] text-[#999]">{s.sub}</p>
                </div>
                {highlightIdx === i && <ChevronRight className="w-3 h-3 text-[#737373] shrink-0" strokeWidth={1.5} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map — centered, rounded, no Google logo */}
      <div className="w-full px-6 mx-auto transition-all duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
        style={{ maxWidth: 580, maxHeight: showMap ? 420 : 0, opacity: showMap ? 1 : 0, marginTop: showMap ? 16 : 0 }}>
        <div className="rounded-2xl overflow-hidden relative" style={{ height: 380 }}>
          <div className="absolute" style={{ top: 0, left: 0, right: 0, bottom: -30 }}>
            <img src={MAP_IMG} alt="" className="w-full h-full object-cover" loading="eager" />
          </div>

          {/* Pin only — no label card */}
          {showPin && (
            <div className="absolute z-10" style={{ top: '44%', left: '50%', transform: 'translate(-50%, -100%)', animation: 'hpa-pin-drop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
              <div className="relative">
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-2.5 rounded-full bg-black/12 blur-[3px]" />
                <div className="absolute bottom-0 left-1/2 w-5 h-5 rounded-full" style={{ transform: 'translateX(-50%)', backgroundColor: `${A}20`, animation: 'hpa-ping 2s ease-out infinite' }} />
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#222', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                  <Home className="w-4 h-4 text-white" strokeWidth={1.8} />
                </div>
                <div className="w-3 h-3 rotate-45 mx-auto -mt-1.5" style={{ backgroundColor: '#222' }} />
              </div>
            </div>
          )}

          {/* POI labels */}
          {showPoi && <>
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-3.5 py-2 shadow-md" style={{ animation: 'hpa-fade 0.3s ease-out', border: '1px solid rgba(0,0,0,0.04)' }}>
              <p className="text-[9px] font-semibold text-[#555]">Bergen sentrum 800m</p>
            </div>
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-3.5 py-2 shadow-md" style={{ animation: 'hpa-fade 0.3s ease-out 0.15s both', border: '1px solid rgba(0,0,0,0.04)' }}>
              <p className="text-[9px] font-semibold text-[#555]">Bybanen 300m</p>
            </div>
            <div className="absolute top-[25%] left-4 bg-white/95 backdrop-blur-sm rounded-xl px-3.5 py-2 shadow-md" style={{ animation: 'hpa-fade 0.3s ease-out 0.3s both', border: '1px solid rgba(0,0,0,0.04)' }}>
              <p className="text-[9px] font-semibold" style={{ color: G }}>Nygårdsparken</p>
            </div>
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-3.5 py-2 shadow-md" style={{ animation: 'hpa-fade 0.3s ease-out 0.2s both', border: '1px solid rgba(0,0,0,0.04)' }}>
              <p className="text-[9px] font-semibold text-[#555]">UiB 400m</p>
            </div>
          </>}
        </div>
      </div>

      {/* Bottom spacer — matches top for centering */}
      <div className="shrink-0 transition-all duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ height: showMap ? 40 : 260 }} />
    </div>
  );
}

/* ═══ SCENE 2: BUILDING + SECTION SELECT ═══════════════════════════════════ */
const SECTIONS = [
  { id: 'H0101', floor: '1. etg', owner: 'Erik Solberg' },
  { id: 'H0102', floor: '1. etg', owner: 'Camilla Haugen', selected: true },
  { id: 'H0103', floor: '1. etg', owner: 'Thomas Berg' },
  { id: 'H0201', floor: '2. etg', owner: 'Ingrid Myhre' },
  { id: 'H0202', floor: '2. etg', owner: 'Silje Bakken' },
];

function BuildingScene({ t }: { t: number }) {
  // Step 1: Select building (ticks 30-33)
  const showBuildings = t >= 31;
  const buildingCount = t >= 32 ? 2 : t >= 31 ? 1 : 0;
  const buildingSelected = t >= 33;
  // Step 2: Select section (ticks 34-37)
  const showSections = t >= 34;
  const sectionCount = t >= 37 ? 5 : t >= 36 ? 4 : t >= 35 ? 3 : t >= 34 ? 1 : 0;
  const sectionSelected = t >= 38;

  return (
    <div style={{ minHeight: 715, display: "flex", flexDirection: "column", alignItems: "center", animation: 'hpa-fade 0.4s ease-out' }}>
      {/* Top spacer — centered in step 1, slides up in step 2 */}
      <div className="shrink-0 transition-all duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ height: buildingSelected ? 50 : 220 }} />

      {/* Heading */}
      <div className="text-center mb-5 px-8 w-full mx-auto transition-all duration-[700ms]"
        style={{ maxWidth: 540, transform: buildingSelected ? 'scale(0.92)' : 'scale(1)' }}>
        <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all duration-500"
          style={{ backgroundColor: buildingSelected ? `${A}10` : '#f0ece6' }}>
          {buildingSelected
            ? <Home className="w-5 h-5" style={{ color: A }} strokeWidth={1.5} />
            : <Building2 className="w-5 h-5 text-[#6e6357]" strokeWidth={1.5} />}
        </div>
        <h3 className="text-[20px] font-bold text-[#222] tracking-[-0.03em] mb-1">
          {buildingSelected ? 'Velg seksjon' : 'Velg bygning'}
        </h3>
        <p className="text-[12px] text-[#6e6357]">
          {buildingSelected ? 'Hvilken seksjon tilhører boligen?' : 'Vi fant disse bygningene på adressen'}
        </p>
      </div>

      <div className="px-8" style={{ width: "100%", maxWidth: 500 }}>

        {/* Building cards — step 1 */}
        {!buildingSelected && (
          <div className="space-y-3">
            {[
              { name: 'Sameiet Nygårdshøyden', addr: 'Olaf Ryes Vei 11', units: 10 },
            ].map((b, i) => (
              <div key={i} className="rounded-2xl bg-white transition-all duration-500"
                style={{
                  border: `1px solid ${BD}`,
                  opacity: buildingCount > i ? 1 : 0,
                  transform: buildingCount > i ? 'translateY(0)' : 'translateY(8px)',
                }}>
                <div className="px-5 py-4 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#f5f3f0' }}>
                    <Building2 className="w-5 h-5 text-[#666]" strokeWidth={1.3} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#222]">{b.name}</p>
                    <p className="text-[10px] text-[#999] mt-0.5">{b.addr} · {b.units} seksjoner</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected building summary — step 2 header */}
        {buildingSelected && (
          <div className="rounded-2xl bg-white mb-4 transition-all duration-500" style={{ border: `1px solid ${BD}`, animation: 'hpa-fade 0.4s ease-out' }}>
            <div className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#f5f3f0' }}>
                <Building2 className="w-4 h-4 text-[#666]" strokeWidth={1.3} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#222]">Sameiet Nygårdshøyden</p>
                <p className="text-[9px] text-[#999]">Olaf Ryes Vei 11 · 10 seksjoner</p>
              </div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: G }}>
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            </div>
          </div>
        )}

        {/* Section list — step 2 */}
        {showSections && (
          <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${BD}`, animation: 'hpa-fade 0.4s ease-out' }}>
            {SECTIONS.map((s, i) => {
              const visible = sectionCount > i;
              const isSelected = sectionSelected && s.selected;
              const last = i === SECTIONS.length - 1;
              return (
                <div key={s.id}
                  className={`px-5 py-3.5 flex items-center gap-3.5 transition-all duration-500 ${!last ? 'border-b' : ''}`}
                  style={{
                    borderColor: '#f5f2ee',
                    opacity: visible ? 1 : 0.06,
                    backgroundColor: isSelected ? `${A}04` : 'transparent',
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{
                      backgroundColor: isSelected ? `${A}12` : '#f5f3f0',
                      color: isSelected ? A : '#999',
                    }}>
                    {s.id.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#222]">{s.id}</p>
                    <p className="text-[9px] text-[#999] mt-0.5">{s.floor} · {s.owner}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: A, animation: 'hpa-fade 0.3s ease-out' }}>
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="shrink-0 transition-all duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ height: buildingSelected ? 0 : 220 }} />
    </div>
  );
}

/* ═══ SCENE 3: IMAGE UPLOAD + ANALYSIS ════════════════════════════════════ */
function ImageScene({ t }: { t: number }) {
  const uploaded = t >= 45 ? 5 : t >= 44 ? 4 : t >= 43 ? 3 : t >= 42 ? 2 : t >= 41 ? 1 : 0;
  // Button states: 45=visible, 46=clicked (green pulse), 47+=analyzing
  const showButton = t >= 45 && t < 47;
  const buttonClicked = t >= 46 && t < 47;
  const analyzing = t >= 47;
  const scanStep = t >= 51 ? 4 : t >= 50 ? 3 : t >= 49 ? 2 : t >= 48 ? 1 : 0;

  return (
    <div style={{ minHeight: 715, display: "flex", flexDirection: "column", animation: 'hpa-fade 0.4s ease-out' }}>

      {/* Hero image — takes up the top half, AI scans this */}
      <div className="relative overflow-hidden w-full" style={{ height: analyzing ? 380 : 340, transition: 'height 0.7s ease-out' }}>
        {/* Main image */}
        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: uploaded >= 1 ? 1 : 0.05 }}>
          <img src={IMGS[0]} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.4) 100%)' }} />

        {/* Shimmer scan effect */}
        {analyzing && scanStep < 3 && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent 20%, ${A}12 50%, transparent 80%)`, animation: 'hpa-shimmer 2s ease-in-out infinite' }} />
          </div>
        )}

        {/* AI detection labels appearing ON the image */}
        {scanStep >= 1 && (
          <div className="absolute top-[18%] left-[8%] flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'hpa-fade 0.4s ease-out' }}>
            <Sofa className="w-3 h-3" strokeWidth={2} /> Stue
          </div>
        )}
        {scanStep >= 1 && (
          <div className="absolute top-[22%] right-[12%] flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'hpa-fade 0.4s ease-out 0.15s both' }}>
            <BedDouble className="w-3 h-3" strokeWidth={2} /> Soverom
          </div>
        )}
        {scanStep >= 2 && (
          <div className="absolute bottom-[35%] left-[15%] flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'hpa-fade 0.4s ease-out' }}>
            <Sun className="w-3 h-3" strokeWidth={2} /> Balkong
          </div>
        )}
        {scanStep >= 2 && (
          <div className="absolute top-[50%] right-[8%] flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'hpa-fade 0.4s ease-out 0.1s both' }}>
            <Wifi className="w-3 h-3" strokeWidth={2} /> Wifi inkl.
          </div>
        )}
        {scanStep >= 3 && (
          <div className="absolute bottom-[32%] right-[30%] flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'hpa-fade 0.4s ease-out' }}>
            <Eye className="w-3 h-3" strokeWidth={2} /> Naturlig lys
          </div>
        )}

        {/* Thumbnail strip at the bottom of the image */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          {IMGS.slice(1).map((img, i) => (
            <div key={i} className="w-[64px] h-[44px] rounded-lg overflow-hidden relative transition-all duration-500 shadow-md"
              style={{ opacity: uploaded >= i + 2 ? 1 : 0, transform: uploaded >= i + 2 ? 'translateY(0)' : 'translateY(8px)', border: '2px solid rgba(255,255,255,0.3)' }}>
              <img src={img} alt="" className="w-full h-full object-cover" />
              {analyzing && scanStep > i + 1 && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center" style={{ animation: 'hpa-fade 0.2s ease-out' }}>
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          ))}
          <div className="flex-1" />
          {uploaded >= 5 && !analyzing && (
            <div className="h-[44px] px-4 rounded-lg text-[11px] font-bold flex items-center gap-2 text-white shadow-md"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'hpa-fade 0.3s ease-out' }}>
              <Camera className="w-3.5 h-3.5" /> 5 bilder
            </div>
          )}
        </div>

        {/* AI badge top-right */}
        {analyzing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded-full shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', animation: 'hpa-fade 0.3s ease-out' }}>
            <Sparkles className="w-3.5 h-3.5 text-white" style={{ animation: 'hpa-pulse 1.5s ease-in-out infinite' }} strokeWidth={1.5} />
            <span className="text-[10px] font-semibold text-white">AI analyserer</span>
          </div>
        )}
      </div>

      {/* Bottom section — analysis progress or upload state */}
      <div className="flex-1 px-6 flex flex-col justify-center" style={{ paddingTop: 20, paddingBottom: 20 }}>
        {analyzing ? (
          <div style={{ animation: 'hpa-fade 0.4s ease-out', maxWidth: 560, width: '100%', margin: '0 auto' }}>
            {/* Horizontal progress steps — wider */}
            <div className="flex items-start" style={{ gap: 0, marginBottom: 20 }}>
              {[
                { l: 'Rom', d: '3 rom · 64 m²' },
                { l: 'Fasiliteter', d: '10 funnet' },
                { l: 'Vurdering', d: 'Sørvendt' },
                { l: 'Annonse', d: 'FINN-klar' },
              ].map((item, i) => {
                const done = scanStep > i, active = scanStep === i, isLast = i === 3;
                return (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center" style={{ flex: '0 0 auto', minWidth: 64 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: done ? G : active ? '#222' : '#f0eeeb',
                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}>
                        {done
                          ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          : active
                          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30" style={{ borderTopColor: '#fff', animation: 'hpa-spin 0.7s linear infinite' }} />
                          : <span style={{ fontSize: 11, fontWeight: 700, color: '#bbb' }}>{i + 1}</span>}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, marginTop: 8, color: done ? G : active ? '#222' : '#ccc', transition: 'color 0.4s ease' }}>{item.l}</p>
                      <p style={{ fontSize: 9, color: done ? '#999' : 'transparent', marginTop: 2, transition: 'color 0.4s ease', height: 14 }}>{item.d}</p>
                    </div>
                    {!isLast && (
                      <div style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: '#ebe8e3', position: 'relative', overflow: 'hidden', marginTop: 17, minWidth: 32 }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: done ? G : 'transparent', width: done ? '100%' : active ? '50%' : '0%', transition: 'width 1s ease' }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Current step detail */}
            <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)' }}>
              <div className="px-5 py-4 flex items-center gap-3">
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: A }} strokeWidth={1.5} />
                <div className="flex-1">
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>
                    {scanStep >= 4 ? 'Analyse fullført' : scanStep >= 3 ? 'Genererer annonsetekst...' : scanStep >= 2 ? 'Vurderer lysforhold...' : 'Identifiserer rom...'}
                  </p>
                  <p style={{ fontSize: 10, color: '#b5afa4' }}>
                    {scanStep >= 4 ? 'Boligen er klar for publisering' : 'AI analyserer bildene dine'}
                  </p>
                </div>
                {scanStep < 4
                  ? <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: '#e8e4df', borderTopColor: '#222', animation: 'hpa-spin 0.7s linear infinite' }} />
                  : <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: G }}><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
              </div>
              <div style={{ height: 3, backgroundColor: '#f0eeeb' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min(scanStep / 4 * 100, 100)}%`,
                  backgroundColor: scanStep >= 4 ? G : '#222',
                  transition: 'width 1s ease-out',
                }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 280 }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#f0ece6]">
              <Camera className="w-6 h-6 text-[#6e6357]" strokeWidth={1.2} />
            </div>
            <h3 className="text-[20px] font-bold text-[#222] tracking-[-0.02em] mb-1">Legg til bilder</h3>
            <p className="text-[12px] text-[#6e6357] mb-5">Last opp bilder av boligen</p>
            <p className="text-[12px] text-[#6e6357]">{uploaded} av 5 bilder lastet opp</p>
            {showButton && (
              <div className="relative mt-5">
                {/* Click ripple ring */}
                {buttonClicked && (
                  <div className="absolute inset-0 rounded-full" style={{
                    border: `2px solid ${G}`,
                    animation: 'hpa-ring-burst 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }} />
                )}
                <div className="h-11 px-7 rounded-full text-[13px] font-bold flex items-center gap-2.5 transition-all"
                  style={{
                    backgroundColor: buttonClicked ? G : '#222',
                    color: '#fff',
                    transform: buttonClicked ? 'scale(0.92)' : 'scale(1)',
                    boxShadow: buttonClicked ? `0 4px 20px ${G}40` : '0 4px 16px rgba(0,0,0,0.15)',
                    transitionDuration: '0.3s',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}>
                  {buttonClicked
                    ? <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Starter analyse...</>
                    : <><Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} /> Analyser med AI</>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ SCENE 3: GENERATE AD TEXT ═══════════════════════════════════════════ */
function TextScene({ t }: { t: number }) {
  const title = 'Innbydende 3-roms med balkong i Bergen sentrum';
  const desc = 'Lys og romslig leilighet med gjennomgående planløsning og sørvendt balkong. Nyoppusset kjøkken med integrerte hvitevarer. Kort vei til sentrum og kollektivtransport.';

  // Fast character streaming like ChatGPT
  const fullText = title + '\n' + desc;
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let iv: ReturnType<typeof setInterval>;
    const delay = setTimeout(() => {
      if (cancelled) return;
      let i = 0;
      iv = setInterval(() => {
        if (cancelled) { clearInterval(iv); return; }
        // Stream 2-3 chars at a time like ChatGPT tokens
        i += Math.random() > 0.5 ? 3 : 2;
        if (i >= fullText.length) i = fullText.length;
        setCharCount(i);
        if (i >= fullText.length) clearInterval(iv);
      }, 30);
    }, 400);
    return () => { cancelled = true; clearTimeout(delay); if (iv) clearInterval(iv); };
  }, [fullText.length]);

  const titleChars = Math.min(charCount, title.length);
  const descChars = charCount > title.length + 1 ? Math.min(charCount - title.length - 1, desc.length) : 0;
  const allDone = charCount >= fullText.length;

  return (
    <div style={{ minHeight: 715, display: "flex", flexDirection: "column", alignItems: "center", animation: 'hpa-fade 0.5s ease-out' }}>
      <div style={{ height: 160 }} />
      <div className="px-10 max-w-[580px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: A + '10', animation: !allDone ? 'hpa-glow 2s ease-in-out infinite' : 'none' }}>
            <Sparkles className="w-5 h-5" style={{ color: A, animation: !allDone ? 'hpa-pulse 1.5s ease-in-out infinite' : 'none' }} strokeWidth={1.2} />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#222] tracking-[-0.02em]">{allDone ? 'Annonsetekst klar' : 'Genererer annonsetekst'}</h3>
            <p className="text-[11px] text-[#6e6357]">Basert på bildeanalyse og markedsdata</p>
          </div>
        </div>
        <div className="mb-5 min-h-[64px]">
          <h2 className="text-[28px] font-bold text-[#222] tracking-[-0.035em] leading-[1.2]">
            {title.slice(0, titleChars)}
          </h2>
        </div>
        <div className="mb-8 min-h-[64px]">
          <p className="text-[14px] text-[#717171] leading-[1.85]">
            {desc.slice(0, descChars)}
          </p>
        </div>
        <div className="transition-all duration-[1000ms] ease-out" style={{ opacity: allDone ? 1 : 0, transform: allDone ? 'translateY(0)' : 'translateY(10px)' }}>
          <div className="h-[1px] mb-5" style={{ backgroundColor: BD }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {[
                { icon: Maximize2, l: '64 m²' },
                { icon: BedDouble, l: '2 soverom' },
                { icon: Bath, l: '1 bad' },
                { icon: Layers, l: '3. etg' },
              ].map(d => (
                <div key={d.l} className="flex items-center gap-1.5 text-[12px] text-[#555]">
                  <d.icon className="w-3.5 h-3.5 text-[#aaa]" strokeWidth={1.5} /> {d.l}
                </div>
              ))}
            </div>
            <p className="text-[20px] font-bold text-[#222] tracking-[-0.02em]">12 300 <span className="text-[11px] font-normal text-[#6e6357]">kr/mnd</span></p>
          </div>
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}

/* ═══ SCENE 4: UNIT DETAIL PAGE ═══════════════════════════════════════════ */
function UnitDetail({ t }: { t: number }) {
  const s1 = t >= 80;
  const s2 = t >= 81;
  const s3 = t >= 82;
  const s4 = t >= 83;
  const s5 = t >= 84;
  const utleieActive = t >= 92;
  const utleieClicked = t >= 94; // click effect before transition

  return (
    <div className="px-8 pt-5 pb-8" style={{ backgroundColor: BG }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#6e6357] mb-4 transition-all duration-[1100ms] ease-out"
        style={{ opacity: s1 ? 1 : 0, transform: s1 ? 'translateY(0)' : 'translateY(8px)' }}>
        <span>Eiendommer</span><ChevronRight className="w-2.5 h-2.5" /><span>Olaf Ryes Vei 11</span><ChevronRight className="w-2.5 h-2.5" /><span className="text-[#1a1a1a] font-medium">Innbydende 3-roms</span>
      </div>

      {/* Gallery */}
      <div className="rounded-2xl overflow-hidden mb-5 relative group cursor-pointer transition-all duration-[1200ms] ease-out"
        style={{ opacity: s2 ? 1 : 0, transform: s2 ? 'translateY(0)' : 'translateY(12px)' }}>
        <div className="grid grid-cols-4 grid-rows-2 gap-[5px] h-[220px]">
          <div className="col-span-2 row-span-2 overflow-hidden rounded-l-2xl"><img src={IMGS[0]} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" /></div>
          {[1,2,3,4].map(i => (
            <div key={i} className={`overflow-hidden ${i === 2 ? 'rounded-tr-2xl' : ''} ${i === 4 ? 'rounded-br-2xl' : ''}`}><img src={IMGS[i]} alt="" className="w-full h-full object-cover" /></div>
          ))}
        </div>
        <div className="absolute bottom-3 right-3 h-7 px-3 rounded-lg bg-white text-[10px] font-semibold text-[#222] shadow-sm flex items-center gap-1.5"><Camera className="w-3 h-3" strokeWidth={1.5} />Vis alle 5 bilder</div>
      </div>

      {/* Title + details */}
      <div className="mb-4 transition-all duration-[1100ms] ease-out" style={{ opacity: s3 ? 1 : 0, transform: s3 ? 'translateY(0)' : 'translateY(10px)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-[#222] mb-1.5">Innbydende 3-roms i Bergen</h1>
            <div className="flex items-center gap-2 text-[11px] text-[#484848]">
              <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5 text-[#717171]" strokeWidth={1.5} />64 m²</span>
              <span className="text-[#737373]">·</span>
              <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-[#717171]" strokeWidth={1.5} />2 soverom</span>
              <span className="text-[#737373]">·</span>
              <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-[#717171]" strokeWidth={1.5} />1 bad</span>
              <span className="text-[#737373]">·</span>
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-[#717171]" strokeWidth={1.5} />Etg. 3</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <div className="w-7 h-7 rounded-lg bg-[#fef0f0] flex items-center justify-center shrink-0"><MapPin className="w-3.5 h-3.5 text-[#e74c3c]" strokeWidth={2} /></div>
            <div className="text-right"><p className="text-[11px] font-medium text-[#222]">Olaf Ryes Vei 11C</p><p className="text-[9px] text-[#6e6357]">Bergen, Norge</p></div>
          </div>
        </div>
      </div>

      {/* Badges + price + tabs */}
      <div className="transition-all duration-[1100ms] ease-out" style={{ opacity: s4 ? 1 : 0, transform: s4 ? 'translateY(0)' : 'translateY(8px)' }}>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[10px] font-semibold px-3 py-1 rounded-full" style={{ color: G, backgroundColor: '#f0fdf4' }}>Ledig</span>
          <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-[#f3f0ff] text-[#6d28d9]">Langtid</span>
          <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-[#f5f1ec] text-[#6b6050]">Leilighet</span>
          <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-[#f5f1ec] text-[#6b6050]">Møblert</span>
          <span className="text-[14px] font-bold text-[#222] ml-auto">12 300 kr/mnd</span>
        </div>
        <div className="flex items-center gap-1 mb-5">
          {['Oversikt', 'Utleie', 'Økonomi', 'Dokumenter'].map((tab, i) => {
            const isActive = utleieActive ? i === 1 : i === 0;
            const isClicking = utleieClicked && i === 1;
            return (
              <div key={tab} className="relative">
                {/* Click pulse ring */}
                {isClicking && (
                  <div className="absolute inset-0 rounded-full" style={{ animation: 'hpa-click-ring 0.6s ease-out forwards', border: `2px solid ${A}` }} />
                )}
                <div className={`h-[32px] px-4 rounded-full text-[11px] font-semibold flex items-center transition-all duration-500 ${isActive ? 'bg-[#1a1a1a] text-white' : 'bg-white border text-[#6b6050]'}`}
                  style={{
                    ...(!isActive ? { borderColor: BD } : {}),
                    transform: isClicking ? 'scale(0.93)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                  }}>{tab}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards — explicit margin between each */}
      <div className="transition-all duration-[1100ms] ease-out" style={{ opacity: s5 ? 1 : 0, transform: s5 ? 'translateY(0)' : 'translateY(8px)' }}>
        <div className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: BD }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Boligdetaljer</p>
              <p className="text-[10px] text-[#6e6357] mt-1.5">64 m² · 2 soverom · 1 bad · Møblert</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#ccc] shrink-0 ml-4" strokeWidth={1.5} />
          </div>
        </div>
        <div className="h-4" />
        <div className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: BD }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Beskrivelse</p>
              <p className="text-[10px] text-[#6e6357] mt-1.5 truncate">Lys og romslig 3-roms med gjennomgående planløsning. Nyoppusset kjøkken...</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#ccc] shrink-0 ml-4" strokeWidth={1.5} />
          </div>
        </div>
        <div className="h-4" />
        <div className="rounded-2xl bg-white border overflow-hidden" style={{ borderColor: BD }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a]">Fasiliteter</p>
              <div className="flex items-center gap-3 mt-2">
                {[{ icon: Wifi, l: 'Wifi' },{ icon: Sun, l: 'Balkong' },{ icon: Sofa, l: 'Møblert' },{ icon: Home, l: 'Oppvaskmaskin' }].map(f => (
                  <span key={f.l} className="flex items-center gap-1 text-[9px] text-[#717171]"><f.icon className="w-3 h-3 text-[#6e6357]" strokeWidth={1.3} />{f.l}</span>
                ))}
                <span className="text-[9px] text-[#6e6357]">+6 mer</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#ccc] shrink-0 ml-4" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ SCENE 6: RENTAL — Start utleie + velg modell ═════════════════════════ */
function RentalScene({ t }: { t: number }) {
  const showCards = t >= 102;
  const cardCount = t >= 103 ? 2 : t >= 102 ? 1 : 0;
  const selected = t >= 105;

  // Scene 7: FINN preview (ticks 110+)
  const finnScene = t >= 110;
  const finnGenerating = t >= 110 && t < 113;
  const finnPreview = t >= 113;
  const finnPublish = t >= 115;
  const finnLive = t >= 116;

  // Scene 8: Visninger (ticks 120+)
  const viewingScene = t >= 120;
  const applicantCount = t >= 124 ? 4 : t >= 123 ? 3 : t >= 122 ? 2 : t >= 121 ? 1 : 0;
  const showSlots = t >= 125;
  const booked = t >= 127;

  const applicants = [
    { name: 'Anna Larsen', score: 92, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
    { name: 'Erik Solberg', score: 87, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face' },
    { name: 'Maria Johansen', score: 81, img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face' },
    { name: 'Jonas Dahl', score: 78, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face' },
  ];

  // Scene 9: Screening (ticks 130+)
  const screeningScene = t >= 130;

  // Scene 10: Kontrakt & Signering (ticks 140+)
  const contractScene = t >= 140;
  const showContract = t >= 141;
  const signing1 = t >= 142;
  const signing2 = t >= 143;
  const bothSigned = t >= 144;

  // Scene 11: Depositum (ticks 150+)
  const depositScene = t >= 150;
  const showDeposit = t >= 151;
  const depositProcessing = t >= 152 && t < 154;
  const depositDone = t >= 154;

  if (depositScene) {
    const steps = [
      { l: 'Kontrakt signert', sub: 'Begge parter via BankID', icon: <FileText className="w-3 h-3" strokeWidth={2} />, done: true },
      { l: 'Depositumskonto opprettet', sub: 'Lea Bank · 36 900 kr', icon: <Layers className="w-3 h-3" strokeWidth={2} />, done: depositDone, active: depositProcessing },
      { l: 'Innbetaling fra leietaker', sub: 'Venter på overføring', icon: <TrendingUp className="w-3 h-3" strokeWidth={2} />, done: false },
    ];
    return (
      <div style={{ minHeight: 715, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: 'hpa-fade 0.5s ease-out' }}>
        <div className="px-10" style={{ width: "100%", maxWidth: 600 }}>

          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#f0ece6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Layers className="w-[18px] h-[18px] text-[#666]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-[#222] tracking-[-0.02em]">Depositum</h3>
                {depositDone && <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: G, backgroundColor: `${G}12` }}>Fullført</span>}
                {depositProcessing && <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: '#d97706', backgroundColor: '#fef3c7' }}>Behandler</span>}
              </div>
              <p className="text-[10px] text-[#6e6357] mt-0.5">Depositumskonto opprettes automatisk via Lea Bank</p>
            </div>
          </div>

          {/* ── Deposit amount card ── */}
          <div className="rounded-[18px] bg-white overflow-hidden mb-4 transition-all duration-600"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)', opacity: showDeposit ? 1 : 0, transform: showDeposit ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)' }}>
            <div className="px-5 py-4">
              {/* Amount hero */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-[#999] uppercase tracking-wider font-medium mb-1">Depositumsbeløp</p>
                  <p className="text-[22px] font-extrabold text-[#111] tracking-[-0.03em]">36 900 <span className="text-[12px] font-semibold text-[#888]">kr</span></p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#f8f6f3', border: '1px solid #eee' }}>
                  <span className="text-[10px] font-medium text-[#666]">3x månedsleie</span>
                </div>
              </div>
              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { l: 'Leietaker', v: 'Anna Larsen' },
                  { l: 'Bank', v: 'Lea Bank' },
                  { l: 'Månedlig leie', v: '12 300 kr' },
                  { l: 'Innflytting', v: '01.08.2026' },
                ].map((r, i) => (
                  <div key={i} className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#faf8f5', border: '1px solid #f0eeeb' }}>
                    <p className="text-[8px] text-[#aaa] uppercase tracking-wider font-medium mb-0.5">{r.l}</p>
                    <p className="text-[11px] font-bold text-[#222]">{r.v}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress bar */}
            <div className="px-5 pb-4 pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-[#999]">Fremgang</span>
                <span className="text-[9px] font-bold" style={{ color: depositDone ? G : '#999' }}>{depositDone ? '100%' : depositProcessing ? '60%' : '0%'}</span>
              </div>
              <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: '#f0eeeb' }}>
                <div className="h-full rounded-full transition-all duration-[2000ms] ease-out" style={{ width: depositDone ? '100%' : depositProcessing ? '60%' : '0%', background: depositDone ? G : `linear-gradient(90deg, ${A}, ${G})` }} />
              </div>
            </div>
          </div>

          {/* ── Status timeline ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((step, i) => (
              <div key={i} className="rounded-[14px] transition-all duration-500"
                style={{
                  border: `1px solid ${step.done ? G + '30' : step.active ? A + '30' : BD}`,
                  backgroundColor: step.done ? `${G}04` : '#fff',
                  boxShadow: step.done ? `0 2px 10px ${G}08` : '0 2px 8px rgba(0,0,0,0.03)',
                }}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                    backgroundColor: step.done ? `${G}12` : step.active ? `${A}12` : '#f5f3f0',
                  }}>
                    {step.done
                      ? <Check className="w-3.5 h-3.5" style={{ color: G }} strokeWidth={2.5} />
                      : step.active
                      ? <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: '#e8e4df', borderTopColor: A, animation: 'hpa-spin 0.7s linear infinite' }} />
                      : <span style={{ color: '#bbb' }}>{step.icon}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold ${step.done || step.active ? 'text-[#222]' : 'text-[#737373]'}`}>{step.l}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: step.done ? '#999' : '#ccc' }}>{step.sub}</p>
                  </div>
                  {step.done && <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ color: G, backgroundColor: `${G}10` }}>Ferdig</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Completion banner ── */}
          {depositDone && (
            <div className="mt-4 rounded-[16px] p-4 overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)', animation: 'hpa-fade 0.5s ease-out' }}>
              <div className="absolute top-[-30%] right-[-10%] w-[140px] h-[140px] rounded-full pointer-events-none" style={{ opacity: 0.06, backgroundColor: G }} />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${G}18` }}>
                  <Check className="w-5 h-5" style={{ color: G }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white">Utleieprosessen fullført</p>
                  <p className="text-[10px] text-white/55 mt-0.5">Alt klart for innflytting 01.08.2026</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { v: '4 min', l: 'Total tid' },
                  { v: '100%', l: 'Digitalt' },
                  { v: '0 kr', l: 'Papirarbeid' },
                ].map((s, i) => (
                  <div key={i} className="text-center flex-1">
                    <p className="text-[13px] font-extrabold" style={{ color: i === 0 ? A : i === 1 ? G : '#fff' }}>{s.v}</p>
                    <p className="text-[8px] text-white/50 font-medium">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (contractScene) {
    const signers = [
      { name: 'Camilla Haugen', role: 'Utleier', done: signing1, img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face' },
      { name: 'Anna Larsen', role: 'Leietaker', done: signing2, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face' },
    ];
    return (
      <div style={{ minHeight: 715, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: 'hpa-fade 0.5s ease-out' }}>
        <div className="px-10" style={{ width: "100%", maxWidth: 580 }}>

          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#f0ece6' }}>
              <FileText className="w-4 h-4 text-[#666]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-[#222] tracking-[-0.02em]">Kontrakt og signering</h3>
              <p className="text-[10px] text-[#b5afa4] mt-0.5">Automatisk leiekontrakt med digital BankID-signering</p>
            </div>
          </div>

          {/* ── Contract card — details + signing in one card ── */}
          <div className="rounded-2xl bg-white overflow-hidden mb-4 transition-all duration-600"
            style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)', opacity: showContract ? 1 : 0, transform: showContract ? 'translateY(0)' : 'translateY(12px)' }}>

            {/* Contract details */}
            {[
              { l: 'Bolig', v: 'Olaf Ryes Vei 11C, H0102' },
              { l: 'Husleie', v: '12 300 kr/mnd' },
              { l: 'Depositum', v: '36 900 kr (3 mnd)' },
              { l: 'Leietaker', v: 'Anna Larsen' },
              { l: 'Innflytting', v: '01.08.2026' },
            ].map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0eeeb' }}>
                <span className="text-[10px] text-[#b5afa4]">{r.l}</span>
                <span className="text-[11px] font-bold text-[#222]">{r.v}</span>
              </div>
            ))}
          </div>

          {/* ── Signing card ── */}
          <div className="rounded-2xl bg-white overflow-hidden mb-4" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid #f0eeeb' }}>
              <p className="text-[11px] font-bold text-[#222]">Digital signering</p>
            </div>
            {signers.map((p, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: i === 0 ? '1px solid #f0eeeb' : 'none' }}>
                <img src={p.img} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: '2px solid #f0eeeb' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[#222]">{p.name}</p>
                  <p className="text-[9px] text-[#b5afa4] mt-0.5">{p.role} · {p.done ? 'Signert med BankID' : 'Venter på signering...'}</p>
                </div>
                {p.done ? (
                  <Check className="w-4 h-4 shrink-0" style={{ color: G }} strokeWidth={2.5} />
                ) : (
                  <div className="w-4 h-4 rounded-full border-[1.5px] shrink-0" style={{ borderColor: '#e8e4df', borderTopColor: A, animation: 'hpa-spin 0.7s linear infinite' }} />
                )}
              </div>
            ))}
          </div>

          {/* ── Both signed banner ── */}
          {bothSigned && (
            <div className="rounded-2xl px-5 py-3.5 flex items-center gap-3"
              style={{ backgroundColor: '#111', animation: 'hpa-fade 0.5s ease-out' }}>
              <Check className="w-4 h-4 shrink-0" style={{ color: G }} strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white">Kontrakt signert av begge parter</p>
                <p className="text-[9px] text-white/55 mt-0.5">Juridisk bindende · Arkivert digitalt</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Scene 9: Screening
  const showProfile = t >= 131;
  const creditRunning = t >= 132 && t < 134;
  const creditDone = t >= 134;
  const showBreakdown = t >= 135;
  const showRecommend = t >= 136;

  if (screeningScene) {
    return (
      <div style={{ minHeight: 715, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: 'hpa-fade 0.5s ease-out' }}>
        <div className="px-10" style={{ width: "100%", maxWidth: 580 }}>

          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${A}10` }}>
              <Sparkles className="w-4 h-4" style={{ color: A }} strokeWidth={1.3} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-[#222] tracking-[-0.02em]">Screening</h3>
              <p className="text-[10px] text-[#b5afa4] mt-0.5">Grundig bakgrunnssjekk og kredittanalyse</p>
            </div>
          </div>

          {/* ── Candidate profile ── */}
          <div className="rounded-2xl bg-white overflow-hidden mb-4 transition-all duration-600"
            style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)', opacity: showProfile ? 1 : 0, transform: showProfile ? 'translateY(0)' : 'translateY(12px)' }}>
            <div className="px-5 py-4 flex items-center gap-3.5">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" alt="" className="w-10 h-10 rounded-full object-cover shrink-0" style={{ border: '2px solid #f0eeeb' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#222]">Anna Larsen</p>
                <p className="text-[9px] text-[#b5afa4] mt-0.5">28 år · Sykepleier · Bergen</p>
              </div>
              <span className="text-[18px] font-extrabold tracking-tight shrink-0" style={{ color: G }}>92</span>
            </div>

            {/* Credit check row */}
            <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: '1px solid #f0eeeb' }}>
              {creditRunning
                ? <div className="w-4 h-4 rounded-full border-[1.5px] shrink-0" style={{ borderColor: '#e8e4df', borderTopColor: A, animation: 'hpa-spin 0.7s linear infinite' }} />
                : creditDone
                ? <Check className="w-4 h-4 shrink-0" style={{ color: G }} strokeWidth={2.5} />
                : <AlertCircle className="w-4 h-4 text-[#ccc] shrink-0" strokeWidth={1.5} />}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[#222]">
                  {creditDone ? 'Kredittsjekk godkjent' : creditRunning ? 'Kjører kredittsjekk...' : 'Kredittsjekk'}
                </p>
                <p className="text-[9px] text-[#b5afa4] mt-0.5">
                  {creditDone ? 'Creditsafe · Ingen anmerkninger' : 'Creditsafe · Automatisk verifisering'}
                </p>
              </div>
              {creditDone && <span className="text-[11px] font-extrabold shrink-0" style={{ color: G }}>A</span>}
            </div>
          </div>

          {/* ── AI score breakdown ── */}
          {showBreakdown && (
            <div className="rounded-2xl bg-white overflow-hidden mb-4" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)', animation: 'hpa-fade 0.5s ease-out' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid #f0eeeb' }}>
                <p className="text-[11px] font-bold text-[#222]">Vurdering</p>
              </div>
              {[
                { l: 'Inntekt vs. husleie', score: 95, detail: '3.2x dekning' },
                { l: 'Kreditthistorikk', score: 90, detail: 'Ingen anmerkninger' },
                { l: 'Referanser', score: 88, detail: '2 verifiserte' },
                { l: 'Stabilitet', score: 94, detail: '4 år nåværende jobb' },
              ].map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: i < 3 ? '1px solid #f0eeeb' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[#444]">{item.l}</p>
                    <p className="text-[9px] text-[#b5afa4] mt-0.5">{item.detail}</p>
                  </div>
                  <span className="text-[13px] font-extrabold tabular-nums shrink-0" style={{ color: G }}>{item.score}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── AI recommendation ── */}
          {showRecommend && (
            <div className="rounded-2xl px-5 py-3.5 flex items-center gap-3"
              style={{ backgroundColor: '#111', animation: 'hpa-fade 0.5s ease-out' }}>
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: A }} strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white">AI anbefaler Anna Larsen</p>
                <p className="text-[9px] text-white/55 mt-0.5">Beste kandidat basert på screening og kreditt</p>
              </div>
              <div className="h-7 px-3.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shrink-0" style={{ backgroundColor: A, color: '#111' }}>
                Velg <ArrowRight className="w-3 h-3" strokeWidth={2} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewingScene) {
    return (
      <div style={{ minHeight: 715, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: 'hpa-fade 0.5s ease-out' }}>
        <div className="px-10" style={{ width: "100%", maxWidth: 580 }}>

          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#f0ece6' }}>
              <Users className="w-4 h-4 text-[#666]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-[#222] tracking-[-0.02em]">{booked ? 'Visninger planlagt' : 'Interessenter'}</h3>
              <p className="text-[10px] text-[#b5afa4] mt-0.5">{booked ? '3 fellesvisninger satt opp automatisk' : `${applicantCount} nye søkere fra FINN.no`}</p>
            </div>
          </div>

          {/* ── Applicant list — single clean card ── */}
          <div className="rounded-2xl bg-white overflow-hidden mb-5" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}>
            {applicants.map((a, i) => {
              const visible = applicantCount > i;
              const last = i === applicants.length - 1;
              return (
                <div key={i} className={`px-5 py-3.5 flex items-center gap-3.5 transition-all duration-500`}
                  style={{ borderBottom: !last ? '1px solid #f0eeeb' : 'none', opacity: visible ? 1 : 0.04, transform: visible ? 'translateY(0)' : 'translateY(4px)' }}>
                  <img src={a.img} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" style={{ border: '2px solid #f0eeeb' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#222]">{a.name}</p>
                    <p className="text-[9px] text-[#b5afa4] mt-0.5">Via FINN.no · Kvalifisert</p>
                  </div>
                  <span className="text-[13px] font-extrabold tabular-nums shrink-0" style={{ color: a.score >= 85 ? G : a.score >= 75 ? '#3b82f6' : '#f59e0b' }}>{a.score}</span>
                </div>
              );
            })}
          </div>

          {/* ── Viewing slots ── */}
          {showSlots && (
            <div style={{ animation: 'hpa-fade 0.5s ease-out' }}>
              <p className="text-[10px] font-bold text-[#b5afa4] uppercase tracking-[0.12em] mb-3">Fellesvisninger</p>
              <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                {[
                  { day: 'Ons 19. mars', time: '17:00', guests: 3 },
                  { day: 'Tor 20. mars', time: '12:00', guests: 2 },
                  { day: 'Lør 22. mars', time: '11:00', guests: 4 },
                ].map((v, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-3.5 transition-all duration-500"
                    style={{ borderBottom: i < 2 ? '1px solid #f0eeeb' : 'none' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#222]">{v.day}</p>
                      <p className="text-[9px] text-[#b5afa4] mt-0.5">kl. {v.time} · {v.guests} påmeldt</p>
                    </div>
                    {booked ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: G }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-[#ccc]">Venter</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (finnScene) {
    return (
      <div style={{ minHeight: 715, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: 'hpa-fade 0.5s ease-out' }}>
        <div className="px-10" style={{ width: "100%", maxWidth: 580 }}>

          {/* ── Subtle header ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white" style={{ border: '1px solid #eee' }}>
              <img src="/finn-logo.png" alt="FINN" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-[#222] tracking-[-0.02em]">{finnPreview ? 'FINN-annonse klar' : 'Genererer FINN-annonse...'}</h3>
              <p className="text-[10px] text-[#b5afa4] mt-0.5">{finnPreview ? 'Forhåndsvisning av annonsen' : 'Basert på boligdata og bilder'}</p>
            </div>
            {finnGenerating && <div className="w-4 h-4 rounded-full border-[1.5px] shrink-0" style={{ borderColor: '#e8e4df', borderTopColor: '#0063fb', animation: 'hpa-spin 0.7s linear infinite' }} />}
          </div>

          {/* ── FINN Preview Card ── */}
          <div className="rounded-2xl overflow-hidden transition-all duration-700" style={{ backgroundColor: '#fff', boxShadow: finnPreview ? '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' : '0 2px 8px rgba(0,0,0,0.04)', opacity: finnPreview ? 1 : 0.2, filter: finnPreview ? 'blur(0)' : 'blur(8px)', transform: finnPreview ? 'translateY(0)' : 'translateY(16px)' }}>

            {/* Hero image — single large */}
            <div className="relative" style={{ height: 240 }}>
              <img src={IMGS[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Subtle gradient overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.15))' }} />
              {/* FINN badge */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(0,99,251,0.9)', backdropFilter: 'blur(12px)' }}>
                <img src="/finn-logo.png" alt="" className="w-3 h-3 object-contain" style={{ filter: 'brightness(10)' }} />
                <span className="text-[8px] font-bold text-white tracking-wide">FINN.no</span>
              </div>
              {/* Thumbnail strip */}
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                {IMGS.slice(1, 4).map((img, i) => (
                  <div key={i} className="w-[48px] h-[36px] rounded-lg overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="w-[48px] h-[36px] rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.3)' }}>
                  <span className="text-[9px] font-bold text-white">+2</span>
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="px-5 pt-4 pb-5">
              {/* Title + price */}
              <p className="text-[15px] font-bold text-[#111] leading-snug mb-1">Innbydende 3-roms med balkong og kveldssol</p>
              <div className="flex items-center gap-1 mb-3">
                <MapPin className="w-3 h-3 text-[#ccc]" strokeWidth={1.5} />
                <p className="text-[11px] text-[#999]">Olaf Ryes Vei 11C, Bergen</p>
              </div>

              {/* Price */}
              <p className="text-[20px] font-extrabold text-[#111] tracking-[-0.03em] mb-3.5">12 300 <span className="text-[13px] font-semibold text-[#999]">kr/mnd</span></p>

              {/* Property details — clean inline */}
              <div className="flex items-center gap-3 text-[10px] text-[#777]">
                <span className="font-medium">64 m²</span>
                <span className="text-[#737373]">·</span>
                <span className="font-medium">2 soverom</span>
                <span className="text-[#737373]">·</span>
                <span className="font-medium">1 bad</span>
                <span className="text-[#737373]">·</span>
                <span className="font-medium">3. etasje</span>
              </div>
            </div>
          </div>

          {/* ── Publish CTA ── */}
          <div className="mt-4 transition-all duration-700" style={{ opacity: finnPublish ? 1 : 0, transform: finnPublish ? 'translateY(0)' : 'translateY(8px)' }}>
            <div className="h-[46px] rounded-2xl flex items-center justify-center gap-2.5 text-[13px] font-bold text-white transition-all duration-700 cursor-pointer"
              style={{
                background: finnLive ? G : '#0063fb',
                boxShadow: finnLive ? `0 4px 20px ${G}40` : '0 4px 16px rgba(0,99,251,0.2)',
              }}>
              {finnLive ? (
                <><Check className="w-4 h-4" strokeWidth={2.5} /> Publisert på FINN.no</>
              ) : (
                <><img src="/finn-logo.png" alt="" className="w-4 h-4 object-contain" style={{ filter: 'brightness(10)' }} /> Publiser på FINN.no</>
              )}
            </div>
          </div>

          {/* ── Live stats — only after publish ── */}
          {finnLive && (
            <div className="mt-3 flex items-center justify-center gap-8 py-2" style={{ animation: 'hpa-fade 0.6s ease-out 0.2s both' }}>
              {[
                { v: '127', l: 'Visninger' },
                { v: '14', l: 'Lagret' },
                { v: '6', l: 'Meldinger' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-[15px] font-extrabold text-[#222] tracking-tight">{s.v}</p>
                  <p className="text-[9px] text-[#aaa] font-medium">{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 715, animation: 'hpa-fade 0.5s ease-out', position: 'relative', overflow: 'hidden' }}>
      {/* Centered heading — absolute position */}
      {!showCards && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%', maxWidth: 560, padding: '0 32px' }}>
          <div className="w-11 h-11 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${A}10`, boxShadow: `0 2px 12px ${A}08` }}>
            <Key className="w-5 h-5" style={{ color: A }} strokeWidth={1.5} />
          </div>
          <h3 className="text-[20px] font-bold text-[#222] tracking-[-0.03em] mb-1.5">Velg utleiemodell</h3>
          <p className="text-[12px] text-[#6e6357]">Hvordan ønsker du å leie ut boligen?</p>
        </div>
      )}

      {/* Cards view — flex column when cards are visible */}
      {showCards && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {/* Heading in cards view */}
          <div className="text-center mb-7 px-8" style={{ width: '100%', maxWidth: 560 }}>
            <div className="w-11 h-11 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${A}10`, boxShadow: `0 2px 12px ${A}08` }}>
              <Key className="w-5 h-5" style={{ color: A }} strokeWidth={1.5} />
            </div>
            <h3 className="text-[20px] font-bold text-[#222] tracking-[-0.03em] mb-1.5">
              {selected ? 'Langtidsutleie' : 'Velg utleiemodell'}
            </h3>
            <p className="text-[12px] text-[#6e6357]">
              {selected ? 'Annonsen publiseres på FINN.no' : 'Hvordan ønsker du å leie ut boligen?'}
            </p>
          </div>

          {/* Cards container */}
          <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Langtid card */}
            <div className="rounded-[16px] bg-white transition-all duration-500 cursor-pointer"
              style={{
                border: `1px solid ${BD}`,
                opacity: cardCount >= 1 ? 1 : 0,
                transform: cardCount >= 1 ? 'translateY(0)' : 'translateY(12px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
              }}>
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-white" style={{ border: '1px solid #eee' }}>
                  <img src="/finn-logo.png" alt="FINN.no" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#222] mb-0.5">Langtidsutleie</p>
                  <p className="text-[10px] text-[#999]">Publiser på FINN.no · Fast leiekontrakt</p>
                </div>
                {selected ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: G, animation: 'hpa-fade 0.3s ease-out' }}>
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                ) : cardCount >= 1 && (
                  <ChevronRight className="w-4 h-4 text-[#ccc] shrink-0" strokeWidth={1.5} />
                )}
              </div>
            </div>

            {/* Korttid card */}
            <div className="rounded-[16px] bg-white transition-all duration-500 cursor-pointer"
              style={{
                border: `1px solid ${BD}`,
                opacity: cardCount >= 2 ? (selected ? 0.3 : 1) : 0,
                transform: cardCount >= 2 ? 'translateY(0)' : 'translateY(12px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
              }}>
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-white" style={{ border: '1px solid #eee' }}>
                  <img src="/airbnb-logo.png" alt="Airbnb" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#222] mb-0.5">Korttidsutleie</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#999]">Airbnb</span>
                    <span className="text-[10px] text-[#737373]">·</span>
                    <img src="/booking-logo.png" alt="Booking.com" className="h-[11px] w-auto" style={{ opacity: 0.5 }} />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#ccc] shrink-0" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  // end of main RentalScene return
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HeroProductAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [phase, setPhase] = useState<'unit' | 'transition' | 'text1' | 'text1-out' | 'intro' | 'intro-out' | 'address' | 'address-out' | 'images' | 'images-out' | 'success' | 'success-zoom' | 'portfolio' | 'portfolio-out' | 'text2' | 'text2-out' | 'automation' | 'automation-out' | 'cta'>('unit');
  const [charCount, setCharCount] = useState(0);
  const [textPhase, setTextPhase] = useState<'pain' | 'punch' | 'familiar' | 'clearing' | 'solution'>('pain');

  const painItems = [
    'Fotografere leiligheten',
    'Redigere 20 bilder',
    'Skrive annonsetekster',
    'Publisere på FINN',
    'Svare 47 interessenter',
    'Koordinere visninger',
    'Velge leietaker',
    'Sende kontrakt',
    'Vente på signatur',
    'Opprette depositumskonto',
    'Purre depositum',
  ];
  const [painVisible, setPainVisible] = useState(0); // how many items visible
  const punchText = 'Én bolig. Alt manuelt.';
  const familiarText = 'Høres det kjent ut?';
  const solutionText = 'DigiHome automatiserer hele prosessen.';

  // Integration showcase — typewriter then smooth morph to logos
  const [intChar, setIntChar] = useState(0);
  const [intPhase, setIntPhase] = useState<'typing' | 'lifting' | 'logos'>('typing');
  const intText = 'Integrert med systemene du trenger.';
  useEffect(() => {
    if (phase !== 'text2') return;
    setIntChar(0);
    setIntPhase('typing');
    let cancelled = false;
    let i = 0;
    const iv = setInterval(() => {
      if (cancelled) { clearInterval(iv); return; }
      i++;
      setIntChar(i);
      if (i >= intText.length) {
        clearInterval(iv);
        // After typewriter done → lift text up, then show logos
        setTimeout(() => { if (!cancelled) setIntPhase('lifting'); }, 800);
        setTimeout(() => { if (!cancelled) setIntPhase('logos'); }, 1400);
      }
    }, 35);
    return () => { cancelled = true; clearInterval(iv); };
  }, [phase]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      if (started.current) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.35) {
        started.current = true;
        // Hold the first unit/property image visible a bit longer before transitioning
        setTimeout(() => setPhase('transition'), 2200);
        setTimeout(() => setPhase('text1'), 3200);
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Multi-phase: pain (typewriter list) → punch → familiar → clear → solution
  useEffect(() => {
    if (phase !== 'text1') return;

    if (textPhase === 'pain') {
      const currentItem = painItems[painVisible];
      if (!currentItem) {
        // All items typed — move to punch
        const timer = setTimeout(() => { setTextPhase('punch'); setCharCount(0); }, 1200);
        return () => clearTimeout(timer);
      }
      if (charCount >= currentItem.length) {
        // Current item done — brief pause then next item
        const timer = setTimeout(() => { setPainVisible(v => v + 1); setCharCount(0); }, 180);
        return () => clearTimeout(timer);
      }
      // Type next character — natural rhythm with slight variation
      const ch = currentItem[charCount];
      const base = 28;
      const pause = ch === '.' || ch === ',' ? 120 : ch === ' ' ? 15 : base;
      const timer = setTimeout(() => setCharCount(c => c + 1), pause);
      return () => clearTimeout(timer);
    }
    if (textPhase === 'punch') {
      if (charCount >= punchText.length) {
        const timer = setTimeout(() => { setTextPhase('clearing'); setCharCount(0); }, 2000);
        return () => clearTimeout(timer);
      }
      const timer = setTimeout(() => setCharCount(c => c + 1), 55);
      return () => clearTimeout(timer);
    }
    if (textPhase === 'clearing') {
      const timer = setTimeout(() => { setTextPhase('solution'); setCharCount(0); }, 700);
      return () => clearTimeout(timer);
    }
    if (textPhase === 'solution') {
      if (charCount >= solutionText.length) {
        const timer = setTimeout(() => {
          setPhase('text1-out');
          setCharCount(0);
          setPainVisible(0);
          setTextPhase('pain');
        }, 1500);
        return () => clearTimeout(timer);
      }
      const timer = setTimeout(() => setCharCount(c => c + 1), 35);
      return () => clearTimeout(timer);
    }
  }, [phase, charCount, textPhase, painVisible]);

  // Fade-out transitions
  useEffect(() => {
    if (phase === 'text1-out') {
      const timer = setTimeout(() => setPhase('intro'), 800);
      return () => clearTimeout(timer);
    }
    if (phase === 'intro-out') {
      const timer = setTimeout(() => setPhase('address'), 800);
      return () => clearTimeout(timer);
    }
    if (phase === 'address-out') {
      const timer = setTimeout(() => setPhase('images'), 800);
      return () => clearTimeout(timer);
    }
    if (phase === 'images-out') {
      const timer = setTimeout(() => setPhase('success'), 800);
      return () => clearTimeout(timer);
    }
    if (phase === 'portfolio-out') {
      const timer = setTimeout(() => setPhase('text2'), 800);
      return () => clearTimeout(timer);
    }
    if (phase === 'text2-out') {
      const timer = setTimeout(() => setPhase('automation'), 800);
      return () => clearTimeout(timer);
    }
    if (phase === 'automation-out') {
      const timer = setTimeout(() => setPhase('cta'), 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // text2 → text2-out (integration showcase duration)
  useEffect(() => {
    if (phase !== 'text2') return;
    const timer = setTimeout(() => setPhase('text2-out'), 6000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Intro scene — chaos → freeze → pull → impact → reveal → out
  const [introPhase, setIntroPhase] = useState<'chaos' | 'freeze' | 'pull' | 'impact' | 'reveal'>('chaos');
  useEffect(() => {
    if (phase !== 'intro') return;
    setIntroPhase('chaos');
    const timers = [
      setTimeout(() => setIntroPhase('freeze'), 3200),
      setTimeout(() => setIntroPhase('pull'), 3500),
      setTimeout(() => setIntroPhase('impact'), 4600),
      setTimeout(() => setIntroPhase('reveal'), 5200),
      setTimeout(() => setPhase('intro-out'), 9000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);
  const showIntro = phase === 'intro' || phase === 'intro-out';

  // Address scene tick
  const [addrT, setAddrT] = useState(0);
  useEffect(() => {
    if (phase !== 'address') return;
    const schedule: [number, number][] = [
      [0, 0],
      [1800, 11], [3000, 12], [3800, 13], [4400, 14], [5000, 15], [5500, 16],
    ];
    const timers = schedule.map(([d, v]) => setTimeout(() => setAddrT(v), d));
    const endTimer = setTimeout(() => setPhase('address-out'), 7500);
    return () => { timers.forEach(clearTimeout); clearTimeout(endTimer); };
  }, [phase]);

  // Image scene tick
  const [imgT, setImgT] = useState(0);
  useEffect(() => {
    if (phase !== 'images') return;
    const schedule: [number, number][] = [
      [0, 40],
      [400, 41], [800, 42], [1200, 43], [1600, 44], [2000, 45],
      [3200, 46],
      [4500, 47], [5800, 48], [7100, 49], [8400, 50], [9200, 51],
    ];
    const timers = schedule.map(([d, v]) => setTimeout(() => setImgT(v), d));
    const endTimer = setTimeout(() => setPhase('images-out'), 11000);
    return () => { timers.forEach(clearTimeout); clearTimeout(endTimer); };
  }, [phase]);

  // Success — single timer chain, no separate state
  const successRef = useRef(0);
  const [successTick, setSuccessTick] = useState(0);
  useEffect(() => {
    if (phase !== 'success' && phase !== 'success-zoom' && phase !== 'portfolio' && phase !== 'portfolio-out') {
      successRef.current = 0;
      setSuccessTick(0);
      return;
    }
    if (phase !== 'success') return;
    const t1 = setTimeout(() => { successRef.current = 1; setSuccessTick(1); }, 350);
    const t2 = setTimeout(() => { successRef.current = 2; setSuccessTick(2); }, 1100);
    const t3 = setTimeout(() => { successRef.current = 3; setSuccessTick(3); }, 2000);
    const t4 = setTimeout(() => { successRef.current = 4; setSuccessTick(4); }, 2900);
    const t5 = setTimeout(() => setPhase('success-zoom'), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'success-zoom') return;
    const timer = setTimeout(() => setPhase('portfolio'), 2200);
    return () => clearTimeout(timer);
  }, [phase]);

  // portfolio → portfolio-out → text2
  useEffect(() => {
    if (phase !== 'portfolio') return;
    const timer = setTimeout(() => setPhase('portfolio-out'), 3000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Automation scene — 6 steps + sub-step for preview animations
  const [autoStep, setAutoStep] = useState(0);
  const [autoSub, setAutoSub] = useState(0); // 0=enter, 1=mid, 2=done
  const [autoFading, setAutoFading] = useState(false); // exit transition between cards
  useEffect(() => {
    if (phase !== 'automation') return;
    setAutoStep(0); setAutoSub(0); setAutoFading(false);
    // Generous timing: ~4.5s per step, smooth breathing room
    const timers = [
      // Step 1: FINN — annonse
      setTimeout(() => { setAutoStep(1); setAutoSub(0); }, 1000),
      setTimeout(() => setAutoSub(1), 2400),
      setTimeout(() => setAutoSub(2), 4000),
      // Fade out step 1, fade in step 2
      setTimeout(() => setAutoFading(true), 5800),
      setTimeout(() => { setAutoStep(2); setAutoSub(0); setAutoFading(false); }, 6400),
      setTimeout(() => setAutoSub(1), 7800),
      setTimeout(() => setAutoSub(2), 9400),
      // Fade out step 2, fade in step 3
      setTimeout(() => setAutoFading(true), 11200),
      setTimeout(() => { setAutoStep(3); setAutoSub(0); setAutoFading(false); }, 11800),
      setTimeout(() => setAutoSub(1), 13200),
      setTimeout(() => setAutoSub(2), 14800),
      // Fade out step 3, fade in step 4
      setTimeout(() => setAutoFading(true), 16600),
      setTimeout(() => { setAutoStep(4); setAutoSub(0); setAutoFading(false); }, 17200),
      setTimeout(() => setAutoSub(1), 18600),
      setTimeout(() => setAutoSub(2), 20200),
      // Fade out step 4, fade in step 5
      setTimeout(() => setAutoFading(true), 22000),
      setTimeout(() => { setAutoStep(5); setAutoSub(0); setAutoFading(false); }, 22600),
      setTimeout(() => setAutoSub(1), 24000),
      setTimeout(() => setAutoSub(2), 25400),
      // Fade out step 5, fade in step 6
      setTimeout(() => setAutoFading(true), 27200),
      setTimeout(() => { setAutoStep(6); setAutoSub(0); setAutoFading(false); }, 27800),
      setTimeout(() => setAutoSub(1), 29200),
      setTimeout(() => setAutoSub(2), 30800),
      // Exit to CTA
      setTimeout(() => setPhase('automation-out'), 33000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // CTA scene — typewriter + staggered reveal
  const [ctaStep, setCtaStep] = useState(0);
  const [ctaCharCount, setCtaCharCount] = useState(0);
  const ctaHeadline = 'Klar til å automatisere utleien din?';
  useEffect(() => {
    if (phase !== 'cta') return;
    setCtaStep(0);
    setCtaCharCount(0);
    const t1 = setTimeout(() => setCtaStep(1), 300);
    return () => clearTimeout(t1);
  }, [phase]);
  // Typewriter for CTA headline
  useEffect(() => {
    if (phase !== 'cta' || ctaStep !== 1 || ctaCharCount >= ctaHeadline.length) return;
    const timer = setTimeout(() => setCtaCharCount(c => c + 1), 40);
    return () => clearTimeout(timer);
  }, [phase, ctaStep, ctaCharCount]);
  // After typewriter done, reveal subtitle then buttons
  const ctaDone = phase === 'cta' && ctaStep === 1 && ctaCharCount >= ctaHeadline.length;
  useEffect(() => {
    if (!ctaDone) return;
    const t = setTimeout(() => setCtaStep(2), 600);
    return () => clearTimeout(t);
  }, [ctaDone]);
  useEffect(() => {
    if (phase !== 'cta' || ctaStep !== 2) return;
    const t = setTimeout(() => setCtaStep(3), 800);
    return () => clearTimeout(t);
  }, [phase, ctaStep]);

  const sidebarFading = phase !== 'unit';
  const showText1 = phase === 'text1' || phase === 'text1-out';
  const showIntShowcase = phase === 'text2' || phase === 'text2-out';
  const showAutomation = phase === 'automation' || phase === 'automation-out';

  return (
    <div ref={ref} className="flex flex-col" data-testid="hero-product-animation" style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* ── DEBUG NAV BUTTONS (hidden, enable by setting display to flex) ── */}
      <div className="flex-wrap items-center gap-1.5 mb-3 px-1" data-testid="debug-nav" style={{ display: 'none' }}>
        {(['unit','text1','intro','address','images','success','portfolio','text2','automation','cta'] as const).map(p => (
          <button key={p} onClick={() => { started.current = true; setPhase(p as any); setCharCount(0); }}
            className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all"
            style={{
              backgroundColor: phase === p ? '#222' : '#f0eeeb',
              color: phase === p ? '#fff' : '#888',
              border: phase === p ? 'none' : '1px solid #e5e2dd',
            }}
            data-testid={`debug-${p}`}>
            {p}
          </button>
        ))}
      </div>

      {/* ── Mockup frame ── */}
      <div className="rounded-[20px] overflow-hidden relative" style={{ minHeight: 715, boxShadow: '0 20px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)', zIndex: 1, backgroundColor: BG }}>
        <style>{`
          @keyframes hpa-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
          @keyframes hpa-cursor-blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
          @keyframes hpa-pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.6; transform:scale(1.08) } }
          @keyframes hpa-spin { to { transform:rotate(360deg) } }
          @keyframes hpa-shimmer { 0% { transform:translateX(-100%) } 100% { transform:translateX(100%) } }
          @keyframes hpa-glow { 0%,100% { box-shadow:0 0 12px rgba(207,151,252,0.2) } 50% { box-shadow:0 0 28px rgba(207,151,252,0.4) } }
          @keyframes hpa-pin-drop { 0% { transform:translateY(-40px); opacity:0 } 100% { transform:translateY(0); opacity:1 } }
          @keyframes hpa-float-logo { 0%,100% { transform:translateY(0) } 50% { transform:translateY(var(--float-y, -6px)) } }
          @keyframes hpa-logo-appear { 0% { opacity:0; transform:scale(0.3); filter:blur(8px) } 100% { opacity:1; transform:scale(1); filter:blur(0) } }
          @keyframes hpa-logo-in { 0% { opacity:0; transform:translateY(16px) } 100% { opacity:1; transform:translateY(0) } }
          @keyframes hpa-logo-breathe { 0%,100% { opacity:0.8; transform:scale(1) } 50% { opacity:0.6; transform:scale(0.97) } }
          @keyframes hpa-line-appear { 0% { opacity:0 } 100% { opacity:0.12 } }
          @keyframes hpa-ping { 0% { transform:translateX(-50%) scale(1); opacity:0.4 } 100% { transform:translateX(-50%) scale(3); opacity:0 } }
          @keyframes hpa-success-check {
            0% { transform: scale(0) rotate(-45deg); opacity: 0; }
            60% { transform: scale(1.2) rotate(8deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes hpa-success-ring {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes hpa-ring-burst {
            0% { transform: scale(0.5); opacity: 0.6; border-width: 3px; }
            100% { transform: scale(2.8); opacity: 0; border-width: 0.5px; }
          }
          @keyframes hpa-orbit-spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
          @keyframes hpa-orbit-spin-r {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(-360deg); }
          }
          @keyframes hpa-core-pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
          }
          @keyframes hpa-ai-title-in {
            0% { opacity: 0; transform: translateY(20px) scale(0.88); filter: blur(12px); }
            60% { opacity: 1; filter: blur(0); }
            80% { transform: translateY(-3px) scale(1.01); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes hpa-orbit-dot {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.5); }
          }
          @keyframes hpa-ring-burst-2 {
            0% { transform: scale(0.6); opacity: 0.4; border-width: 2px; }
            100% { transform: scale(3.5); opacity: 0; border-width: 0.3px; }
          }
          @keyframes hpa-success-glow {
            0% { transform: scale(0); opacity: 0; }
            50% { opacity: 0.12; }
            100% { transform: scale(1); opacity: 0.06; }
          }
          @keyframes hpa-sparkle {
            0% { transform: scale(0) rotate(0deg); opacity: 0; }
            50% { transform: scale(1) rotate(180deg); opacity: 1; }
            100% { transform: scale(0) rotate(360deg); opacity: 0; }
          }
          @keyframes hpa-card-reveal {
            0% { transform: translateY(40px) scale(0.92); opacity: 0; filter: blur(8px); }
            60% { transform: translateY(-4px) scale(1.01); opacity: 1; filter: blur(0); }
            100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
          }
          @keyframes hpa-success-text {
            0% { transform: translateY(12px); opacity: 0; filter: blur(6px); }
            100% { transform: translateY(0); opacity: 1; filter: blur(0); }
          }
          @keyframes hpa-float-particle {
            0% { transform: translateY(0) translateX(0); opacity: 0.6; }
            100% { transform: translateY(-60px) translateX(var(--dx)); opacity: 0; }
          }
          @keyframes hpa-auto-fade-up {
            0% { opacity: 0; transform: translateY(24px); filter: blur(4px); }
            100% { opacity: 1; transform: translateY(0); filter: blur(0); }
          }
          @keyframes hpa-node-activate {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(207,151,252,0); }
            50% { transform: scale(1.12); box-shadow: 0 0 28px 8px rgba(207,151,252,0.3); }
            100% { transform: scale(1); box-shadow: 0 0 16px 3px rgba(207,151,252,0.12); }
          }
          @keyframes hpa-node-done {
            0% { transform: scale(1.15); }
            50% { transform: scale(0.95); }
            100% { transform: scale(1); }
          }
          @keyframes hpa-card-cinema {
            0% { opacity: 0; transform: translateY(36px) scale(0.92); filter: blur(10px); }
            55% { opacity: 1; filter: blur(1px); }
            75% { transform: translateY(-4px) scale(1.008); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes hpa-card-morph {
            0% { opacity: 0; transform: translateY(24px) scale(0.95); filter: blur(8px); }
            40% { opacity: 0.8; filter: blur(2px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes hpa-card-exit {
            0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            100% { opacity: 0; transform: translateY(-12px) scale(0.97); filter: blur(6px); }
          }
          @keyframes hpa-glow-pulse {
            0%, 100% { box-shadow: 0 0 0 6px rgba(207,151,252,0.08), 0 4px 16px rgba(207,151,252,0.12); }
            50% { box-shadow: 0 0 0 8px rgba(207,151,252,0.14), 0 4px 24px rgba(207,151,252,0.2); }
          }
          @keyframes hpa-line-fill {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes hpa-check-pop {
            0% { transform: scale(0) rotate(-20deg); opacity: 0; }
            60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) rotate(0); opacity: 1; }
          }
          @keyframes hpa-logo-cloud-in {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); filter: blur(12px); }
            60% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); filter: blur(0); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
          }
          @keyframes hpa-logo-float {
            0% { transform: translate(-50%, calc(-50% + 0px)); }
            100% { transform: translate(-50%, calc(-50% - 8px)); }
          }
          @keyframes hpa-logo-grid-in {
            0% { opacity: 0; transform: translateY(18px) scale(0.85); filter: blur(6px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes hpa-logo-breathe-soft {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.85; }
            50% { transform: translateY(var(--float-y, -5px)) scale(1.03); opacity: 1; }
          }
          @keyframes hpa-intro-drift {
            0% { transform: translate(var(--dx1), var(--dy1)) rotate(var(--r1)); }
            25% { transform: translate(var(--dx2), var(--dy2)) rotate(var(--r2)); }
            50% { transform: translate(var(--dx3), var(--dy3)) rotate(var(--r1)); }
            75% { transform: translate(var(--dx1), var(--dy3)) rotate(var(--r2)); }
            100% { transform: translate(var(--dx1), var(--dy1)) rotate(var(--r1)); }
          }
          @keyframes hpa-intro-implode {
            0% { opacity: 1; transform: scale(1); filter: blur(0); }
            100% { opacity: 0; transform: scale(0); filter: blur(12px); }
          }
          @keyframes hpa-intro-ring {
            0% { transform: scale(0); opacity: 0.6; border-width: 3px; }
            100% { transform: scale(8); opacity: 0; border-width: 0.5px; }
          }
          @keyframes hpa-intro-flash {
            0% { opacity: 0; transform: scale(0.2); }
            20% { opacity: 0.3; }
            100% { opacity: 0; transform: scale(2); }
          }
          @keyframes hpa-intro-screen-flash {
            0% { opacity: 0.5; }
            100% { opacity: 0; }
          }
          @keyframes hpa-intro-heartbeat {
            0%, 100% { opacity: 0.96; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.002); }
          }
          @keyframes hpa-intro-reveal-text {
            0% { opacity: 0; transform: translateY(24px) scale(0.94); filter: blur(10px); }
            50% { filter: blur(2px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @keyframes hpa-intro-reveal-sub {
            0% { opacity: 0; transform: translateY(16px); filter: blur(4px); }
            100% { opacity: 1; transform: translateY(0); filter: blur(0); }
          }
          @keyframes hpa-intro-particle {
            0% { opacity: 0.8; transform: translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(var(--ptx), var(--pty)) scale(0); }
          }
          @keyframes hpa-intro-line {
            0% { width: 0; opacity: 0; }
            100% { width: 56px; opacity: 1; }
          }
          @keyframes hpa-card-fly {
            0% {
              left: 50%; top: 50%;
              width: 440px; height: 260px;
              transform: translate(-50%, -50%);
              border-radius: 16px;
              box-shadow: 0 24px 64px rgba(0,0,0,0.15);
            }
            100% {
              left: 218px; top: 58px;
              width: calc((100% - 236px - 16px) / 3);
              height: calc((100% - 100px) / 3);
              transform: translate(0, 0);
              border-radius: 12px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.06);
            }
          }
        `}</style>

        {/* Unit detail — initial (fades out on scroll) */}
        <div style={{
          display: 'flex',
          minHeight: 715,
          transition: 'opacity 1s ease-in, filter 1s ease-in',
          opacity: sidebarFading ? 0 : 1,
          filter: sidebarFading ? 'blur(8px)' : 'blur(0px)',
        }}>
          <div className="shrink-0 self-stretch" style={{ width: 200 }}>
            <Sidebar />
          </div>
          <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: BG }}>
            <UnitDetail t={99} />
          </div>
        </div>

        {/* Text1 overlay — storytelling: pain → punch → familiar → solution */}
        {showText1 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.8s ease',
            opacity: phase === 'text1-out' ? 0 : 1,
            background: textPhase === 'solution'
              ? `radial-gradient(ellipse at 50% 50%, ${A}08, transparent 70%), ${BG}`
              : BG,
          }}>
            <style>{`
              @keyframes hpa-punch-in {
                0% { opacity: 0; transform: scale(0.7); filter: blur(12px); }
                60% { opacity: 1; transform: scale(1.04); filter: blur(0); }
                100% { opacity: 1; transform: scale(1); filter: blur(0); }
              }
              @keyframes hpa-familiar-in {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              @keyframes hpa-solution-in {
                0% { opacity: 0; transform: scale(0.95) translateY(12px); filter: blur(4px); }
                100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
              }
              @keyframes hpa-item-in {
                0% { opacity: 0; transform: translateX(-12px); filter: blur(4px); }
                100% { opacity: 1; transform: translateX(0); filter: blur(0); }
              }
            `}</style>
            <div style={{ maxWidth: 520 }}>
              {/* Pain list — ChatGPT-style typewriter */}
              {(textPhase === 'pain') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {painItems.map((item, i) => {
                    if (i > painVisible) return null;
                    const isTyping = i === painVisible;
                    const visibleText = isTyping ? item.slice(0, charCount) : item;
                    const isLast = i >= painItems.length - 2;
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        opacity: 1,
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isLast ? '#d4a07a' : '#bbb', flexShrink: 0, marginTop: 8 }} />
                        <span style={{ fontSize: 17, fontWeight: 500, color: isLast ? '#888' : '#aaa', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                          {visibleText}
                          {isTyping && (
                            <span style={{ display: 'inline-block', width: 2, height: '1.05em', backgroundColor: A, marginLeft: 1, verticalAlign: 'text-bottom', animation: charCount >= item.length ? 'hpa-cursor-blink 1s ease infinite' : 'none' }} />
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Punch — massive centered text */}
              {(textPhase === 'punch') && (
                <div className="text-center" style={{ animation: 'hpa-punch-in 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  <p style={{ fontSize: 52, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                    <span>{punchText.slice(0, charCount)}</span>
                    <span style={{ display: 'inline-block', width: 3, height: '1em', backgroundColor: A, marginLeft: 2, verticalAlign: 'text-bottom', animation: charCount >= punchText.length ? 'hpa-cursor-blink 1s ease infinite' : 'none' }} />
                  </p>
                </div>
              )}
              {/* Solution — bold, confident */}
              {(textPhase === 'solution' || textPhase === 'clearing') && (
                <div className="text-center" style={{
                  transition: 'opacity 0.6s ease, transform 0.6s ease',
                  opacity: textPhase === 'solution' ? 1 : 0,
                  transform: textPhase === 'solution' ? 'translateY(0)' : 'translateY(16px)',
                  animation: textPhase === 'solution' ? 'hpa-solution-in 0.8s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                }}>
                  <p style={{ fontSize: 30, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.03em', lineHeight: 1.3 }}>
                    <span>{solutionText.slice(0, textPhase === 'solution' ? charCount : 0)}</span>
                    {textPhase === 'solution' && phase === 'text1' && charCount < solutionText.length && (
                      <span style={{ display: 'inline-block', width: 2, height: '1.1em', backgroundColor: A, marginLeft: 1, verticalAlign: 'text-bottom' }} />
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── INTRO: Chaos → Order transformation ── */}
        {showIntro && (() => {
          // Background layer — large, blurred, slow
          const bgWords = [
            { text: 'Kontrakter', left: '5%', top: '12%', size: 38, op: 0.07, speed: 14 },
            { text: 'Fakturering', left: '68%', top: '8%', size: 42, op: 0.06, speed: 16 },
            { text: 'Screening', left: '15%', top: '72%', size: 36, op: 0.08, speed: 13 },
            { text: 'Depositum', left: '72%', top: '65%', size: 40, op: 0.05, speed: 15 },
            { text: 'Vedlikehold', left: '3%', top: '42%', size: 34, op: 0.06, speed: 14 },
            { text: 'Annonsering', left: '42%', top: '85%', size: 36, op: 0.07, speed: 12 },
            { text: 'Purringer', left: '78%', top: '35%', size: 32, op: 0.06, speed: 15 },
          ];
          // Mid layer — main words, spread across full frame
          const midWords = [
            { text: 'Kontrakter', left: '12%', top: '28%', size: 20, weight: 700, op: 0.45, speed: 7, dist: 0.42 },
            { text: 'Fakturering', left: '62%', top: '25%', size: 19, weight: 700, op: 0.40, speed: 8, dist: 0.28 },
            { text: 'Screening', left: '28%', top: '55%', size: 21, weight: 700, op: 0.50, speed: 6.5, dist: 0.22 },
            { text: 'Annonsering', left: '70%', top: '58%', size: 15, weight: 600, op: 0.32, speed: 9, dist: 0.22 },
            { text: 'Depositum', left: '18%', top: '42%', size: 17, weight: 600, op: 0.38, speed: 7.5, dist: 0.33 },
            { text: 'Purringer', left: '52%', top: '15%', size: 14, weight: 600, op: 0.28, speed: 8.5, dist: 0.35 },
            { text: 'Nøkkeloverlevering', left: '35%', top: '70%', size: 12, weight: 500, op: 0.22, speed: 10, dist: 0.25 },
            { text: 'Visninger', left: '78%', top: '40%', size: 15, weight: 600, op: 0.32, speed: 7, dist: 0.30 },
            { text: 'Indeksregulering', left: '5%', top: '18%', size: 11, weight: 500, op: 0.20, speed: 11, dist: 0.55 },
            { text: 'Vedlikehold', left: '45%', top: '45%', size: 16, weight: 600, op: 0.35, speed: 6, dist: 0.07 },
            { text: 'Husordensregler', left: '22%', top: '75%', size: 11, weight: 500, op: 0.22, speed: 9.5, dist: 0.38 },
            { text: 'Forsikring', left: '65%', top: '72%', size: 13, weight: 500, op: 0.25, speed: 8, dist: 0.27 },
            { text: 'Strømmåling', left: '38%', top: '10%', size: 11, weight: 500, op: 0.18, speed: 10, dist: 0.42 },
            { text: 'Oppsigelser', left: '82%', top: '52%', size: 12, weight: 500, op: 0.22, speed: 8, dist: 0.32 },
            { text: 'Regnskapsføring', left: '48%', top: '38%', size: 14, weight: 600, op: 0.30, speed: 7, dist: 0.10 },
            { text: 'Leietakere', left: '55%', top: '62%', size: 13, weight: 500, op: 0.25, speed: 9, dist: 0.15 },
          ];
          // Foreground layer — large, subtle drift
          const fgWords = [
            { text: 'Kontrakter', left: '75%', top: '18%', size: 26, weight: 700, op: 0.16, speed: 5.5 },
            { text: 'Fakturering', left: '8%', top: '65%', size: 24, weight: 700, op: 0.14, speed: 6 },
            { text: 'Screening', left: '60%', top: '78%', size: 28, weight: 700, op: 0.13, speed: 5 },
            { text: 'Purringer', left: '3%', top: '8%', size: 22, weight: 600, op: 0.11, speed: 6.5 },
            { text: 'Depositum', left: '80%', top: '68%', size: 24, weight: 600, op: 0.12, speed: 5.5 },
          ];
          const isFrozen = introPhase === 'freeze';
          const isPull = introPhase === 'pull' || introPhase === 'impact' || introPhase === 'reveal';
          const isImpact = introPhase === 'impact' || introPhase === 'reveal';
          const isReveal = introPhase === 'reveal';
          const particles = Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 20) * 360;
            const rad = (angle * Math.PI) / 180;
            const dist = 60 + Math.random() * 160;
            return { tx: Math.cos(rad) * dist, ty: Math.sin(rad) * dist, size: 2 + Math.random() * 4, delay: Math.random() * 0.25, dur: 0.5 + Math.random() * 0.5, color: i % 4 === 0 ? A : i % 4 === 1 ? G : i % 4 === 2 ? '#ddd8d0' : A + '80' };
          });
          return (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: BG,
              animation: phase === 'intro' ? 'hpa-fade 0.8s ease-out' : undefined,
              transition: 'opacity 0.8s ease, filter 0.8s ease',
              opacity: phase === 'intro-out' ? 0 : 1,
              filter: phase === 'intro-out' ? 'blur(6px)' : 'blur(0px)',
              overflow: 'hidden',
            }}>
              {/* Stress heartbeat pulse */}
              <div style={{
                position: 'absolute', inset: 0,
                animation: !isReveal && !isPull ? 'hpa-intro-heartbeat 2.5s ease-in-out infinite' : undefined,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Container scale pulse on impact */}
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: isImpact && !isReveal ? 'scale(1.02)' : 'scale(1)',
                  transition: isImpact ? 'transform 0.15s ease-out' : 'transform 0.6s ease',
                }}>

                  {/* ── BACKGROUND LAYER — large, blurred, slow ── */}
                  {!isReveal && bgWords.map((w, i) => {
                    const vars: any = {
                      '--dx1': `${-8 + i * 2}px`, '--dy1': `${6 - i * 1.5}px`,
                      '--dx2': `${7 - i * 2}px`, '--dy2': `${-8 + i * 2}px`,
                      '--dx3': `${-5 + i}px`, '--dy3': `${9 - i * 2}px`,
                      '--r1': `${-2 + i * 0.5}deg`, '--r2': `${2 - i * 0.5}deg`,
                    };
                    return (
                      <div key={`bg-${i}`} style={{
                        position: 'absolute',
                        left: isPull ? '50%' : w.left,
                        top: isPull ? '50%' : w.top,
                        fontSize: w.size, fontWeight: 700,
                        color: `rgba(180, 168, 150, ${isFrozen ? w.op * 2.5 : w.op})`,
                        filter: isPull ? 'blur(12px)' : 'blur(3px)',
                        opacity: isPull ? 0 : 1,
                        transform: isPull ? 'scale(0)' : undefined,
                        whiteSpace: 'nowrap', letterSpacing: '-0.02em',
                        ...vars,
                        transition: isPull
                          ? `left 1.5s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 + i * 0.06}s, top 1.5s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 + i * 0.06}s, transform 1.5s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 + i * 0.06}s, opacity 1.3s ease ${0.15 + i * 0.06}s, filter 1.5s ease ${0.15 + i * 0.06}s`
                          : 'color 0.5s ease, opacity 0.8s ease',
                        animation: `hpa-intro-drift ${w.speed}s ease-in-out infinite`,
                        animationPlayState: isFrozen || isPull ? 'paused' : 'running',
                        transformOrigin: 'center center',
                      } as any}>
                        {w.text}
                      </div>
                    );
                  })}

                  {/* ── MID LAYER — main words ── */}
                  {!isReveal && midWords.map((w, i) => {
                    const dxVals = ['-10px','8px','-6px','12px','-5px'];
                    const dyVals = ['8px','-10px','7px','-8px','6px'];
                    const vars: any = {
                      '--dx1': dxVals[i % 5], '--dy1': dyVals[i % 5],
                      '--dx2': dxVals[(i + 2) % 5], '--dy2': dyVals[(i + 3) % 5],
                      '--dx3': dxVals[(i + 4) % 5], '--dy3': dyVals[(i + 1) % 5],
                      '--r1': `${-2 + (i % 4) * 1}deg`, '--r2': `${2 - (i % 3) * 1}deg`,
                    };
                    return (
                      <div key={`mid-${i}`} style={{
                        position: 'absolute',
                        left: isPull ? '50%' : w.left,
                        top: isPull ? '50%' : w.top,
                        fontSize: w.size, fontWeight: w.weight,
                        color: isFrozen ? `rgba(60, 45, 30, ${w.op + 0.30})` : `rgba(140, 128, 110, ${w.op})`,
                        whiteSpace: 'nowrap', letterSpacing: '-0.01em',
                        textShadow: isFrozen ? `0 0 24px rgba(207,151,252,0.25)` : 'none',
                        opacity: isPull ? 0 : 1,
                        transform: isPull ? 'scale(0)' : undefined,
                        filter: isPull ? 'blur(10px)' : undefined,
                        transition: isPull
                          ? `left 1.4s cubic-bezier(0.4, 0, 0.2, 1) ${w.dist * 0.7}s, top 1.4s cubic-bezier(0.4, 0, 0.2, 1) ${w.dist * 0.7}s, transform 1.4s cubic-bezier(0.4, 0, 0.2, 1) ${w.dist * 0.7}s, opacity 1.2s ease ${w.dist * 0.7}s, filter 1.4s ease ${w.dist * 0.7}s`
                          : 'color 0.5s ease, text-shadow 0.5s ease, opacity 0.6s ease',
                        ...vars,
                        animation: `hpa-intro-drift ${w.speed}s ease-in-out infinite`,
                        animationPlayState: isFrozen || isPull ? 'paused' : 'running',
                        transformOrigin: 'center center',
                      } as any}>
                        {w.text}
                      </div>
                    );
                  })}

                  {/* ── FOREGROUND LAYER — large, fast, semi-transparent ── */}
                  {!isReveal && fgWords.map((w, i) => {
                    const vars: any = {
                      '--dx1': `${12 - i * 4}px`, '--dy1': `${-10 + i * 3}px`,
                      '--dx2': `${-9 + i * 2}px`, '--dy2': `${12 - i * 4}px`,
                      '--dx3': `${7 - i * 2}px`, '--dy3': `${-8 + i * 2}px`,
                      '--r1': `${-2 + i}deg`, '--r2': `${3 - i}deg`,
                    };
                    return (
                      <div key={`fg-${i}`} style={{
                        position: 'absolute',
                        left: isPull ? '50%' : w.left,
                        top: isPull ? '50%' : w.top,
                        fontSize: w.size, fontWeight: w.weight,
                        color: isFrozen ? `rgba(80, 60, 40, ${w.op + 0.15})` : `rgba(160, 148, 130, ${w.op})`,
                        whiteSpace: 'nowrap', letterSpacing: '-0.02em',
                        textShadow: isFrozen ? `0 0 16px rgba(207,151,252,0.15)` : 'none',
                        opacity: isPull ? 0 : 1,
                        transform: isPull ? 'scale(0)' : undefined,
                        filter: isPull ? 'blur(8px)' : undefined,
                        transition: isPull
                          ? `left 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.04}s, top 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.04}s, transform 1.2s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.04}s, opacity 1.0s ease ${i * 0.04}s, filter 1.2s ease ${i * 0.04}s`
                          : 'color 0.5s ease, text-shadow 0.5s ease, opacity 0.6s ease',
                        ...vars,
                        animation: `hpa-intro-drift ${w.speed}s ease-in-out infinite`,
                        animationPlayState: isFrozen || isPull ? 'paused' : 'running',
                        transformOrigin: 'center center',
                      } as any}>
                        {w.text}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Impact: screen flash + glow + rings + particles */}
              {isImpact && !isReveal && <>
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(255,255,255,0.45)',
                  animation: 'hpa-intro-screen-flash 0.5s ease-out both',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                  background: `radial-gradient(circle, ${A}20 0%, ${A}08 35%, transparent 60%)`,
                  animation: 'hpa-intro-flash 1.4s ease-out both',
                }} />
                <div style={{ position: 'absolute', width: 24, height: 24, borderRadius: '50%', border: `3px solid ${A}50`, animation: 'hpa-intro-ring 1s cubic-bezier(0.16, 1, 0.3, 1) both' }} />
                <div style={{ position: 'absolute', width: 24, height: 24, borderRadius: '50%', border: `2px solid ${G}35`, animation: 'hpa-intro-ring 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }} />
                <div style={{ position: 'absolute', width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${A}18`, animation: 'hpa-intro-ring 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }} />
                {particles.map((p, i) => (
                  <div key={`p-${i}`} style={{
                    position: 'absolute', width: p.size, height: p.size, borderRadius: '50%',
                    backgroundColor: p.color, opacity: 0,
                    '--ptx': `${p.tx}px`, '--pty': `${p.ty}px`,
                    animation: `hpa-intro-particle ${p.dur}s cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}s both`,
                  } as any} />
                ))}
              </>}

              {/* Reveal: staggered text + accent line + ambient particles */}
              {isReveal && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                    <span style={{
                      fontSize: 50, fontWeight: 800, color: '#111', letterSpacing: '-0.045em', lineHeight: 1.1,
                      animation: 'hpa-intro-reveal-text 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
                    }}>Alt.</span>
                    <span style={{
                      fontSize: 50, fontWeight: 800, color: '#111', letterSpacing: '-0.045em', lineHeight: 1.1,
                      animation: 'hpa-intro-reveal-text 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both',
                    }}>Automatisert<span style={{ color: A }}>.</span></span>
                  </div>
                  <div style={{
                    width: 0, height: 2.5, borderRadius: 2, background: `linear-gradient(90deg, ${A}, ${G})`, marginTop: 22,
                    animation: 'hpa-intro-line 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both',
                  }} />
                  <p style={{
                    fontSize: 17, color: '#6e6357', marginTop: 22, fontWeight: 500,
                    animation: 'hpa-intro-reveal-sub 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.3s both',
                    textAlign: 'center', letterSpacing: '-0.01em',
                  }}>
                    Enten du leier ut 1 bolig eller 200
                  </p>
                  {[...Array(10)].map((_, i) => (
                    <div key={`amb-${i}`} style={{
                      position: 'absolute',
                      left: `calc(50% + ${-180 + i * 40}px)`, top: `calc(50% + ${-100 + (i % 4) * 55}px)`,
                      width: 3, height: 3, borderRadius: '50%',
                      backgroundColor: i % 3 === 0 ? `${A}20` : i % 3 === 1 ? `${G}15` : 'rgba(200,190,175,0.12)',
                      animation: `hpa-logo-breathe-soft ${3.5 + i * 0.4}s ease-in-out ${1.5 + i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Integration showcase (replaces text2) */}
        {showIntShowcase && (() => {
          return (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.8s ease, filter 0.8s ease',
              opacity: phase === 'text2-out' ? 0 : 1,
              filter: phase === 'text2-out' ? 'blur(6px)' : 'blur(0px)',
            }}>
              {/* Typewriter text — centered, transitions to top when logos appear */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                marginBottom: intPhase === 'logos' ? 36 : 0,
                transition: 'margin-bottom 1s cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 2,
              }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.025em', lineHeight: 1.4, textAlign: 'center' }}>
                  {intPhase === 'typing' ? intText.slice(0, intChar) : intText}
                  {intPhase === 'typing' && (
                    <span style={{ display: 'inline-block', width: 2, height: '1.1em', backgroundColor: A, marginLeft: 1, verticalAlign: 'text-bottom', animation: intChar >= intText.length ? 'hpa-cursor-blink 1s ease infinite' : 'none' }} />
                  )}
                </p>
                <p style={{
                  fontSize: 13, color: '#b5afa4', marginTop: 10, fontWeight: 500,
                  opacity: intPhase !== 'typing' ? 1 : 0,
                  transform: intPhase !== 'typing' ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                }}>Sømløs kobling til hele økosystemet</p>
              </div>

              {/* Logo grid — organized rows with subtle living animations */}
              {intPhase === 'logos' && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44,
                  marginTop: 8,
                }}>
                  {[
                    [
                      { src: '/finn-logo-full.png', w: 100, h: 40, d: 0, floatY: -5, floatDur: 3.4 },
                      { src: '/airbnb-logo.png', w: 72, h: 72, d: 0.08, floatY: -6, floatDur: 4.0 },
                      { src: '/bankid-logo.png', w: 110, h: 44, d: 0.16, floatY: -4, floatDur: 3.7 },
                      { src: '/vipps-logo.png', w: 88, h: 60, d: 0.24, floatY: -5, floatDur: 4.3 },
                    ],
                    [
                      { src: '/creditsafe-logo.png', w: 100, h: 40, d: 0.32, floatY: -6, floatDur: 3.9 },
                      { src: '/booking-logo.png', w: 72, h: 72, d: 0.40, floatY: -4, floatDur: 3.5 },
                      { src: '/leabank-logo.webp', w: 64, h: 64, d: 0.48, floatY: -5, floatDur: 4.1 },
                    ],
                    [
                      { src: '/fiken-logo.png', w: 96, h: 42, d: 0.56, floatY: -5, floatDur: 3.6 },
                      { src: '/tripletex-logo.png', w: 94, h: 38, d: 0.64, floatY: -4, floatDur: 4.2 },
                      { src: '/poweroffice-logo.png', w: 100, h: 44, d: 0.72, floatY: -6, floatDur: 3.8 },
                    ],
                  ].map((row, ri) => (
                    <div key={ri} className="flex items-center justify-center" style={{ gap: 56 }}>
                      {row.map((l, li) => (
                        <div key={li} style={{
                          animation: `hpa-logo-grid-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${l.d}s both`,
                        }}>
                          <img src={l.src} alt="" style={{
                            width: l.w, height: l.h, objectFit: 'contain',
                            animation: `hpa-logo-breathe-soft ${l.floatDur}s ease-in-out ${l.d + 0.7}s infinite`,
                          }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Address scene */}
        {(phase === 'address' || phase === 'address-out') && (
          <div style={{
            position: 'absolute', inset: 0,
            animation: phase === 'address' ? 'hpa-fade 0.6s ease-out' : undefined,
            transition: 'opacity 0.7s ease, filter 0.7s ease',
            opacity: phase === 'address-out' ? 0 : 1,
            filter: phase === 'address-out' ? 'blur(8px)' : 'blur(0px)',
          }}>
            <AddressScene t={addrT} />
          </div>
        )}

        {/* Image scene */}
        {(phase === 'images' || phase === 'images-out') && (
          <div style={{
            position: 'absolute', inset: 0,
            animation: phase === 'images' ? 'hpa-fade 0.6s ease-out' : undefined,
            transition: 'opacity 0.7s ease, filter 0.7s ease',
            opacity: phase === 'images-out' ? 0 : 1,
            filter: phase === 'images-out' ? 'blur(8px)' : 'blur(0px)',
          }}>
            <ImageScene t={imgT} />
          </div>
        )}


        {/* ════ Success → Portfolio ════ */}
        {(phase === 'success' || phase === 'success-zoom' || phase === 'portfolio' || phase === 'portfolio-out') && (() => {
          const morphed = phase === 'success-zoom' || phase === 'portfolio' || phase === 'portfolio-out';
          const landed = phase === 'portfolio' || phase === 'portfolio-out';
          const ss = successTick;
          const props = [
            { img: IMGS[0], title: 'Olaf Ryes Vei 11C', loc: 'Bergen', units: 3, status: 'Ny', color: G },
            { img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=260&fit=crop', title: 'Strandgaten 42', loc: 'Bergen', units: 2, status: 'Aktiv', color: '#3b82f6' },
            { img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=260&fit=crop', title: 'Fjordveien 8', loc: 'Stavanger', units: 3, status: 'Aktiv', color: '#3b82f6' },
            { img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop', title: 'Nordnesgaten 15', loc: 'Bergen', units: 4, status: 'Aktiv', color: '#3b82f6' },
            { img: 'https://images.unsplash.com/photo-1551029612-9760a92ad772?w=400&h=260&fit=crop', title: 'Damsgårdsveien 71', loc: 'Bergen', units: 1, status: 'Aktiv', color: '#3b82f6' },
            { img: 'https://images.unsplash.com/photo-1649070608089-de12f3514129?w=400&h=260&fit=crop', title: 'Solheimsgaten 3', loc: 'Bergen', units: 2, status: 'Aktiv', color: '#3b82f6' },
            { img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=260&fit=crop', title: 'Møllendalsveien 22', loc: 'Bergen', units: 5, status: 'Aktiv', color: '#3b82f6' },
            { img: 'https://images.unsplash.com/photo-1571164860029-856acbc24b4a?w=400&h=260&fit=crop', title: 'Vestre Torggate 9', loc: 'Bergen', units: 1, status: 'Ledig', color: '#f59e0b' },
            { img: 'https://images.unsplash.com/photo-1666585607891-bf873fd96bdb?w=400&h=260&fit=crop', title: 'Haugeveien 14', loc: 'Os', units: 2, status: 'Aktiv', color: '#3b82f6' },
          ];
          return (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: BG, transition: 'opacity 0.7s ease, filter 0.7s ease', opacity: phase === 'portfolio-out' ? 0 : 1, filter: phase === 'portfolio-out' ? 'blur(8px)' : 'blur(0)' }}>
              {/* Sidebar */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 200, zIndex: 1, transform: morphed ? 'translateX(0)' : 'translateX(-200px)', transition: 'transform 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s' }}><Sidebar /></div>
              {/* Header */}
              <div style={{ position: 'absolute', left: 228, top: 20, right: 28, zIndex: 1, opacity: morphed ? 1 : 0, transform: morphed ? 'translateY(0)' : 'translateY(-6px)', transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s' }}>
                <div className="flex items-center gap-1.5 text-[10px] text-[#6e6357] mb-2"><Home className="w-3 h-3" strokeWidth={1.5} /><span>Mine eiendommer</span></div>
                <div className="flex items-center justify-between">
                  <div><h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>Mine eiendommer</h2><p style={{ fontSize: 11, color: '#6e6357', marginTop: 3 }}>9 eiendommer · 24 enheter</p></div>
                  <div style={{ height: 30, padding: '0 14px', borderRadius: 8, backgroundColor: '#111', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Plus className="w-3 h-3" strokeWidth={2} /> Ny eiendom</div>
                </div>
              </div>
              {/* Grid cards — Premium property cards */}
              <div style={{ position: 'absolute', left: 228, top: 96, right: 28, bottom: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: 14 }}>
                {props.map((p, i) => (
                  <div key={i} className="relative overflow-hidden" style={{
                    borderRadius: 12,
                    backgroundColor: '#fff',
                    opacity: i === 0 ? 0 : (landed ? 1 : 0),
                    transform: landed ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
                    transition: `opacity 0.8s ease ${0.1 + i * 0.08}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.08}s`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column' as const,
                  }}>
                    {i > 0 && <>
                      <div className="relative" style={{ flex: '1 1 0%', minHeight: 0 }}>
                        <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.15) 100%)' }} />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: p.color, fontSize: 7, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{p.status}</div>
                      </div>
                      <div style={{ padding: '7px 9px 6px', borderTop: '1px solid #f5f3f0' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#222', marginBottom: 1, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5"><MapPin className="w-2 h-2" style={{ color: '#c4bfb5' }} strokeWidth={1.5} /><span style={{ fontSize: 7.5, color: '#6e6357' }}>{p.loc}</span></div>
                          <span style={{ fontSize: 7.5, color: '#6e6357' }}>{p.units} enh.</span>
                        </div>
                      </div>
                    </>}
                  </div>
                ))}
              </div>
              {/* ═══ THE CARD — morphs from success to grid[0] ═══ */}
              <div style={{
                position: 'absolute', zIndex: 3, overflow: 'hidden', pointerEvents: 'none',
                left: morphed ? 228 : '50%', top: morphed ? 96 : '50%',
                width: morphed ? 'calc((100% - 200px - 56px - 24px) / 3)' : 'min(420px, 38%)',
                height: morphed ? 'calc((100% - 120px - 24px) / 3)' : 'auto',
                transform: morphed ? 'none' : 'translate(-50%, -50%)',
                borderRadius: morphed ? 14 : 16,
                boxShadow: morphed
                  ? '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)'
                  : ss >= 3
                    ? '0 20px 60px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)'
                    : '0 4px 12px rgba(0,0,0,0.04)',
                transition: `left 1.6s cubic-bezier(0.22,1,0.36,1), top 1.6s cubic-bezier(0.22,1,0.36,1), width 1.6s cubic-bezier(0.22,1,0.36,1), height 1.6s cubic-bezier(0.22,1,0.36,1), transform ${morphed ? '1.6s cubic-bezier(0.22,1,0.36,1)' : '0.9s cubic-bezier(0.16,1,0.3,1)'}, border-radius 1.2s ease, box-shadow 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.9s cubic-bezier(0.16,1,0.3,1)`,
                opacity: ss >= 3 ? 1 : 0,
                backgroundColor: '#fff',
              }}>
                {/* ── Background: Full-bleed image (hidden during success, visible during morph) ── */}
                <img src={IMGS[0]} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', zIndex: 0,
                  opacity: morphed ? 1 : 0,
                  transition: 'opacity 0.15s ease',
                }} />
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 1,
                  background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.12) 100%)',
                  opacity: morphed ? 1 : 0,
                  transition: 'opacity 0.15s ease',
                }} />

                {/* Grid mode overlay text — fades in during morph */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded" style={{
                  backgroundColor: G, fontSize: 7, fontWeight: 700, color: '#fff', zIndex: 2, letterSpacing: '0.02em',
                  opacity: morphed ? 1 : 0,
                  transition: 'opacity 0.5s ease 0.6s',
                }}>Ny</div>
                {/* Grid mode bottom info bar */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
                  padding: '7px 9px 6px',
                  backgroundColor: '#fff',
                  borderTop: '1px solid #f5f3f0',
                  opacity: morphed ? 1 : 0,
                  transition: 'opacity 0.5s ease 0.6s',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#222', marginBottom: 1, letterSpacing: '-0.01em' }}>Olaf Ryes Vei 11C</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5"><MapPin className="w-2 h-2" style={{ color: '#c4bfb5' }} strokeWidth={1.5} /><span style={{ fontSize: 7.5, color: '#6e6357' }}>Bergen</span></div>
                    <span style={{ fontSize: 7.5, color: '#6e6357' }}>3 enh.</span>
                  </div>
                </div>

                {/* ── Success card content — overlays on top, cinematic entrance + fade-out on morph ── */}
                <div style={{
                  position: 'relative', zIndex: 3,
                  backgroundColor: '#fff',
                  borderRadius: 'inherit',
                  overflow: 'hidden',
                  opacity: morphed ? 0 : 1,
                  transform: morphed ? 'scale(0.97)' : 'none',
                  filter: morphed ? 'blur(4px)' : 'none',
                  transition: 'opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease',
                  animation: ss >= 3 && !morphed ? 'hpa-card-cinema 1.1s cubic-bezier(0.16,1,0.3,1) both' : 'none',
                }}>
                  <div className="relative" style={{ height: 170 }}>
                    <img src={IMGS[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, transparent 30%, rgba(0,0,0,0.25) 100%)' }} />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md flex items-center gap-1" style={{ backgroundColor: 'rgba(5,150,105,0.92)', backdropFilter: 'blur(8px)' }}>
                      <Check className="w-2 h-2 text-white" strokeWidth={3} />
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>Opprettet</span>
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px 14px' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.01em', marginBottom: 5 }}>Innbydende 3-roms med balkong</p>
                    <div className="flex items-center gap-1" style={{ marginBottom: 10 }}>
                      <MapPin style={{ width: 11, height: 11, color: '#c4bfb5', flexShrink: 0 }} strokeWidth={1.5} />
                      <span style={{ fontSize: 10.5, color: '#6e6357' }}>Olaf Ryes Vei 11C, Bergen</span>
                    </div>
                    <div style={{ height: 1, background: '#f0eeeb', marginBottom: 10 }} />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2" style={{ fontSize: 10, color: '#999' }}>
                        <span>64 m²</span><span style={{ color: '#e5e2dd' }}>·</span>
                        <span>2 sov</span><span style={{ color: '#e5e2dd' }}>·</span>
                        <span>1 bad</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>12 300 <span style={{ fontSize: 9, fontWeight: 600, color: '#6e6357' }}>kr/mnd</span></span>
                    </div>
                  </div>
                </div>
              </div>
              {/* ── Success overlay ── */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 4,
                pointerEvents: 'none',
                opacity: morphed ? 0 : 1,
                transform: morphed ? 'scale(0.97)' : 'none',
                filter: morphed ? 'blur(8px)' : 'none',
                transition: 'opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease',
              }}>
                {/* Ambient radial glow behind card area */}
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: 480, height: 480,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle, ${G}08 0%, ${G}03 45%, transparent 70%)`,
                  opacity: ss >= 1 ? 1 : 0,
                  transition: 'opacity 1.8s ease',
                }} />

                {/* Celebration particles */}
                {ss >= 1 && Array.from({length: 10}).map((_, i) => {
                  const angle = (i / 10) * Math.PI * 2;
                  const dist = 18 + (i % 3) * 14;
                  const colors = [G, '#34d399', '#6ee7b7', '#a7f3d0'];
                  return (
                    <div key={`sp-${i}`} style={{
                      position: 'absolute',
                      left: `calc(50% + ${Math.cos(angle) * dist}px)`,
                      top: `calc(50% - 248px + ${Math.sin(angle) * dist * 0.4}px)`,
                      width: i % 3 === 0 ? 4 : 3,
                      height: i % 3 === 0 ? 4 : 3,
                      borderRadius: '50%',
                      backgroundColor: colors[i % 4],
                      opacity: 0,
                      animation: `hpa-float-particle ${2.2 + (i % 3) * 0.4}s ease-out ${0.1 + i * 0.07}s both`,
                      '--dx': `${Math.cos(angle) * (25 + i * 6)}px`,
                    } as any} />
                  );
                })}

                {/* ── Checkmark group ── */}
                <div style={{
                  position: 'absolute', left: '50%', top: 'calc(50% - 248px)',
                  transform: 'translate(-50%, -50%)',
                }}>
                  {/* Soft glow */}
                  <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    width: 100, height: 100,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${G}15 0%, transparent 60%)`,
                    opacity: ss >= 1 ? 1 : 0,
                    transition: 'opacity 1s ease',
                  }} />
                  {/* Ring burst 1 */}
                  {ss >= 1 && <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    width: 48, height: 48,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: `2px solid ${G}45`,
                    animation: 'hpa-ring-burst 1s ease-out both',
                  }} />}
                  {/* Ring burst 2 */}
                  {ss >= 1 && <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    width: 48, height: 48,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: `1.5px solid ${G}28`,
                    animation: 'hpa-ring-burst-2 1.3s ease-out 0.1s both',
                  }} />}
                  {/* Check circle */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    backgroundColor: G,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 8px 28px ${G}38, 0 0 0 3px ${G}10`,
                    opacity: ss >= 1 ? 1 : 0,
                    transform: ss >= 1 ? 'scale(1)' : 'scale(0)',
                    transition: 'all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}>
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                </div>

                {/* ── Title ── */}
                <h3 style={{
                  position: 'absolute', left: '50%', top: 'calc(50% - 200px)',
                  transform: `translateX(-50%) ${ss >= 2 ? 'translateY(0)' : 'translateY(14px)'}`,
                  fontSize: 24, fontWeight: 800, color: '#1a1a1a',
                  letterSpacing: '-0.04em', whiteSpace: 'nowrap',
                  opacity: ss >= 2 ? 1 : 0,
                  filter: ss >= 2 ? 'blur(0px)' : 'blur(4px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>Bolig opprettet</h3>

                {/* ── Subtitle ── */}
                <p style={{
                  position: 'absolute', left: '50%', top: 'calc(50% + 162px)',
                  transform: `translateX(-50%) ${ss >= 4 ? 'translateY(0)' : 'translateY(8px)'}`,
                  fontSize: 13, color: '#6e6357', fontWeight: 500,
                  whiteSpace: 'nowrap', letterSpacing: '-0.01em',
                  opacity: ss >= 4 ? 1 : 0,
                  transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>Klar for utleie</p>
              </div>
            </div>
          );
        })()}


        {/* ── Automation flow — Cinematic Pipeline ── */}
        {showAutomation && (() => {
          const steps = [
            { action: 'Publiser annonse', provider: 'FINN.no', logo: '/finn-logo-full.png', logoW: 48, logoH: 20 },
            { action: 'Kredittsjekk', provider: 'Creditsafe', logo: '/creditsafe-logo.png', logoW: 44, logoH: 18 },
            { action: 'Signering', provider: 'BankID', logo: '/bankid-logo.png', logoW: 44, logoH: 18 },
            { action: 'Depositum', provider: 'Lea Bank', logo: '/leabank-logo.webp', logoW: 36, logoH: 36 },
            { action: 'Portal', provider: 'Vipps', logo: '/vipps-logo.png', logoW: 40, logoH: 28 },
            { action: 'Fakturering', provider: 'Fiken', logo: '/fiken-logo.png', logoW: 44, logoH: 20 },
          ];
          return (
            <div data-testid="automation-scene" style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: BG,
              animation: phase === 'automation' ? 'hpa-auto-fade-up 1s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
              transition: 'opacity 0.8s ease, filter 0.8s ease',
              opacity: phase === 'automation-out' ? 0 : 1,
              filter: phase === 'automation-out' ? 'blur(6px)' : 'blur(0px)',
              overflow: 'hidden',
            }}>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 2 }}>
                <h2 style={{
                  fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: 8,
                  animation: phase === 'automation' ? 'hpa-auto-fade-up 0.6s ease-out' : undefined,
                }}>
                  Hele prosessen, automatisert<span style={{ color: A }}>.</span>
                </h2>
                <p style={{
                  fontSize: 13, color: '#b5afa4', fontWeight: 500,
                  animation: phase === 'automation' ? 'hpa-auto-fade-up 0.6s ease-out 0.15s both' : undefined,
                }}>Fra annonse til innflytting — uten manuelt arbeid</p>
              </div>

              {/* ── Pipeline Bar ── */}
              <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, width: '100%', padding: '0 20px', marginBottom: 0 }}>
                {/* Connection line (background) */}
                <div style={{
                  position: 'absolute', top: 24, left: 68, right: 68, height: 3,
                  backgroundColor: '#eae7e2', borderRadius: 2,
                }} />
                {/* Connection line (fill — progress) */}
                <div style={{
                  position: 'absolute', top: 24, left: 68, right: 68, height: 3, borderRadius: 2,
                  transformOrigin: 'left center',
                  transform: `scaleX(${Math.min(Math.max((autoStep - 1) / 5, 0), 1)})`,
                  background: `linear-gradient(90deg, ${G}, ${G})`,
                  transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />

                {/* Nodes */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {steps.map((step, i) => {
                    const done = autoStep > i + 1 || (autoStep === i + 1 && autoSub >= 2);
                    const active = autoStep === i + 1 && autoSub < 2;
                    const reached = autoStep >= i + 1;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 72 }}>
                        {/* Node circle */}
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: done ? G : active ? '#fff' : '#fff',
                          border: done ? `2.5px solid ${G}` : active ? `2.5px solid ${A}` : '2.5px solid #e4e0db',
                          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: active
                            ? `0 0 0 6px ${A}12, 0 4px 16px ${A}20, 0 8px 32px rgba(0,0,0,0.06)`
                            : done
                            ? `0 0 0 4px ${G}10, 0 4px 12px ${G}15`
                            : '0 2px 8px rgba(0,0,0,0.04)',
                          position: 'relative',
                          animation: active ? 'hpa-glow-pulse 2.5s ease-in-out infinite' : undefined,
                        }}>
                          {done ? (
                            <Check className="w-5 h-5 text-white" strokeWidth={2.5} style={{ animation: 'hpa-check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                          ) : (
                            <img src={step.logo} alt="" style={{
                              width: step.logoW * 0.5, height: step.logoH * 0.5, objectFit: 'contain',
                              opacity: reached ? 0.9 : 0.3,
                              transition: 'opacity 0.4s ease',
                            }} />
                          )}
                          {/* Active pulse ring */}
                          {active && <>
                            <div style={{
                              position: 'absolute', inset: -8, borderRadius: '50%',
                              border: `2px solid ${A}25`,
                              animation: 'hpa-ring-burst 2.5s ease-out infinite',
                            }} />
                          </>}
                        </div>
                        {/* Label */}
                        <p style={{
                          fontSize: 10, fontWeight: 700, marginTop: 10, textAlign: 'center',
                          color: done ? G : active ? '#222' : '#c5bfb6',
                          transition: 'color 0.7s cubic-bezier(0.16, 1, 0.3, 1)', lineHeight: 1.2,
                          letterSpacing: '-0.01em',
                        }}>{step.action}</p>
                        <p style={{
                          fontSize: 8, marginTop: 2, textAlign: 'center',
                          color: done ? `${G}90` : active ? '#999' : '#ddd8d0',
                          transition: 'color 0.7s cubic-bezier(0.16, 1, 0.3, 1)', letterSpacing: '0.02em',
                          textTransform: 'uppercase', fontWeight: 600,
                        }}>{step.provider}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Preview Card Area ── */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                padding: '28px 48px 0', position: 'relative', zIndex: 2,
                width: '100%',
                opacity: autoFading ? 0 : 1,
                transform: autoFading ? 'translateY(-10px) scale(0.98)' : 'translateY(0) scale(1)',
                filter: autoFading ? 'blur(6px)' : 'blur(0)',
                transition: 'opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease',
              }}>
                {/* Step 1: FINN — annonse */}
                {autoStep === 1 && (
                  <div style={{ width: '100%', maxWidth: 460, animation: 'hpa-card-morph 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                      <div className="relative" style={{ height: 190 }}>
                        <img src={IMGS[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(0,99,251,0.9)' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>FINN.no</span>
                        </div>
                        <div className="absolute bottom-3 left-4 right-4">
                          <p style={{
                            fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2, textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            opacity: autoSub >= 1 ? 1 : 0, transform: autoSub >= 1 ? 'translateY(0)' : 'translateY(8px)',
                            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}>Innbydende 3-roms med balkong</p>
                          <div className="flex items-center gap-1" style={{ opacity: autoSub >= 1 ? 1 : 0, transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s' }}>
                            <MapPin className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.5} />
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Olaf Ryes Vei 11C, Bergen</span>
                          </div>
                        </div>
                        <div className="absolute bottom-3 right-3 flex gap-1.5">
                          {IMGS.slice(1, 4).map((img, j) => (
                            <div key={j} style={{
                              width: 36, height: 26, borderRadius: 5, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.4)',
                              opacity: autoSub >= 1 ? 1 : 0, transform: autoSub >= 1 ? 'translateY(0)' : 'translateY(6px)',
                              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + j * 0.1}s`,
                            }}>
                              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: '12px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ opacity: autoSub >= 1 ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s' }}>
                          <span style={{ fontSize: 11, color: '#999' }}>64 m² · 2 sov · 1 bad</span>
                        </div>
                        <span style={{
                          fontSize: 16, fontWeight: 800, color: '#111',
                          opacity: autoSub >= 1 ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
                        }}>12 300 <span style={{ fontSize: 10, fontWeight: 600, color: '#bbb' }}>kr/mnd</span></span>
                      </div>
                      {/* Published confirmation */}
                      <div style={{
                        padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
                        backgroundColor: `${G}06`, borderTop: `1px solid ${G}10`,
                        opacity: autoSub >= 2 ? 1 : 0, transform: autoSub >= 2 ? 'translateY(0)' : 'translateY(6px)',
                        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}>
                        <Check className="w-3.5 h-3.5" style={{ color: G }} strokeWidth={2.5} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: G }}>Publisert på FINN.no</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Creditsafe — screening */}
                {autoStep === 2 && (
                  <div style={{ width: '100%', maxWidth: 460, animation: 'hpa-card-morph 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                      <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid #f0eeeb' }}>
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face" alt="" className="w-13 h-13 rounded-xl object-cover" style={{ width: 52, height: 52, border: '2px solid #f0eeeb' }} />
                        <div className="flex-1">
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Anna Larsen</p>
                          <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>28 år · Sykepleier · Bergen</p>
                        </div>
                        <div style={{
                          width: 52, height: 52, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: `${G}08`, border: `2.5px solid ${G}20`,
                          opacity: autoSub >= 1 ? 1 : 0, transform: autoSub >= 1 ? 'scale(1)' : 'scale(0.5)',
                          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: G, lineHeight: 1 }}>92</span>
                        </div>
                      </div>
                      {/* Score details */}
                      <div className="px-5 py-3" style={{ borderBottom: '1px solid #f0eeeb' }}>
                        {[
                          { label: 'Betalingshistorikk', value: 'Utmerket' },
                          { label: 'Anmerkninger', value: 'Ingen' },
                          { label: 'Gjeldsgrad', value: 'Lav' },
                        ].map((row, ri) => (
                          <div key={ri} className="flex items-center justify-between" style={{
                            padding: '5px 0',
                            opacity: autoSub >= 1 ? 1 : 0,
                            transform: autoSub >= 1 ? 'translateX(0)' : 'translateX(-12px)',
                            transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + ri * 0.12}s`,
                          }}>
                            <span style={{ fontSize: 11, color: '#bbb' }}>{row.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: G }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-5 py-3 flex items-center gap-2.5">
                        {autoSub >= 2
                          ? <Check className="w-4 h-4" style={{ color: G }} strokeWidth={2.5} />
                          : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#e8e4df', borderTopColor: '#222', animation: 'hpa-spin 0.7s linear infinite' }} />}
                        <p style={{ fontSize: 12, fontWeight: 700, color: autoSub >= 2 ? G : '#555' }}>
                          {autoSub >= 2 ? 'Kredittsjekk godkjent' : 'Kjører kredittsjekk...'}
                        </p>
                        {autoSub >= 2 && <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: G, backgroundColor: `${G}08`, padding: '3px 10px', borderRadius: 6 }}>A</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: BankID — kontrakt signering */}
                {autoStep === 3 && (
                  <div style={{ width: '100%', maxWidth: 460, animation: 'hpa-card-morph 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0eeeb' }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Leiekontrakt</p>
                          <p style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>Olaf Ryes Vei 11C — Leilighet 3B</p>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: '#999', backgroundColor: '#f5f3f0', padding: '3px 10px', borderRadius: 6 }}>Husleieloven</span>
                      </div>
                      {[
                        { name: 'Camilla Haugen', role: 'Utleier', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face', doneAt: 1 },
                        { name: 'Anna Larsen', role: 'Leietaker', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', doneAt: 2 },
                      ].map((p, pi) => (
                        <div key={pi} className="px-5 py-3.5 flex items-center gap-3.5" style={{ borderBottom: pi === 0 ? '1px solid #f0eeeb' : 'none' }}>
                          <img src={p.img} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" style={{ border: '2px solid #f0eeeb' }} />
                          <div className="flex-1">
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{p.name}</p>
                            <p style={{ fontSize: 10, color: '#ccc' }}>{p.role}</p>
                          </div>
                          {autoSub >= p.doneAt
                            ? <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${G}08`, border: `1px solid ${G}15` }}>
                                <Check className="w-3 h-3" style={{ color: G }} strokeWidth={3} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: G }}>Signert med BankID</span>
                              </div>
                            : <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#f8f6f3', border: '1px solid #ebe8e3' }}>
                                <div className="w-3 h-3 rounded-full border-[1.5px]" style={{ borderColor: '#ddd', borderTopColor: '#888', animation: 'hpa-spin 0.7s linear infinite' }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#aaa' }}>Signerer...</span>
                              </div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Lea Bank — depositum */}
                {autoStep === 4 && (
                  <div style={{ width: '100%', maxWidth: 460, animation: 'hpa-card-morph 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                      <div className="px-5 py-5" style={{ borderBottom: '1px solid #f0eeeb' }}>
                        <p style={{ fontSize: 10, color: '#b5afa4', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>Depositumskonto</p>
                        <div className="flex items-baseline justify-between">
                          <p style={{ fontSize: 30, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
                            36 900 <span style={{ fontSize: 14, fontWeight: 600, color: '#ccc' }}>kr</span>
                          </p>
                          <span style={{ fontSize: 11, color: '#bbb' }}>3 × husleie</span>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <span style={{ fontSize: 11, color: '#aaa' }}>{autoSub >= 2 ? 'Konto opprettet' : 'Oppretter konto hos Lea Bank...'}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: autoSub >= 2 ? G : '#888' }}>{autoSub >= 2 ? '100%' : autoSub >= 1 ? '60%' : '0%'}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, backgroundColor: '#f0eeeb', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            backgroundColor: autoSub >= 2 ? G : '#222',
                            width: autoSub >= 2 ? '100%' : autoSub >= 1 ? '60%' : '0%',
                            transition: 'width 1.6s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.5s ease',
                          }} />
                        </div>
                        {autoSub >= 2 && (
                          <div className="flex items-center gap-2 mt-4" style={{ animation: 'hpa-auto-fade-up 0.4s ease-out' }}>
                            <Check className="w-4 h-4" style={{ color: G }} strokeWidth={2.5} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: G }}>Depositumet er sikret</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Vipps — portal */}
                {autoStep === 5 && (
                  <div style={{ width: '100%', maxWidth: 460, animation: 'hpa-card-morph 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #f0eeeb' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f8f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f0eeeb' }}>
                          <img src="/vipps-logo.png" alt="" style={{ width: 28, height: 20, objectFit: 'contain' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Portal-tilgang</p>
                          <p style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>Innlogging via Vipps</p>
                        </div>
                      </div>
                      {[
                        { name: 'Camilla Haugen', role: 'Eierportal', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face', showAt: 1 },
                        { name: 'Anna Larsen', role: 'Leietakerportal', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', showAt: 2 },
                      ].map((person, pi) => (
                        <div key={pi} className="px-5 py-3 flex items-center gap-3" style={{
                          borderBottom: pi === 0 ? '1px solid #f0eeeb' : 'none',
                          opacity: autoSub >= person.showAt ? 1 : 0.35,
                          transform: autoSub >= person.showAt ? 'translateX(0)' : 'translateX(-8px)',
                          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}>
                          <img src={person.img} alt="" className="w-9 h-9 rounded-lg object-cover" style={{ border: '1.5px solid #f0eeeb' }} />
                          <div className="flex-1">
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>{person.name}</p>
                            <p style={{ fontSize: 9, color: '#ccc' }}>{person.role}</p>
                          </div>
                          {autoSub >= person.showAt && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${G}08`, border: `1px solid ${G}15` }}>
                              <Check className="w-2.5 h-2.5" style={{ color: G }} strokeWidth={3} />
                              <span style={{ fontSize: 9, fontWeight: 700, color: G }}>Aktivert</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 6: Fiken — fakturering */}
                {autoStep >= 6 && (
                  <div style={{ width: '100%', maxWidth: 460, animation: 'hpa-card-morph 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                      <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0eeeb' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Husleie fakturert</p>
                        <p style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>Automatisk via Fiken</p>
                      </div>
                      {[
                        { l: 'Beløp', v: '12 300 kr' },
                        { l: 'Leietaker', v: 'Anna Larsen' },
                        { l: 'Forfall', v: '1. sep 2026' },
                        { l: 'KID-nummer', v: '00041270012300' },
                      ].map((r, ri) => (
                        <div key={ri} className="px-5 py-2.5 flex items-center justify-between" style={{
                          borderBottom: ri < 3 ? '1px solid #f5f3f0' : 'none',
                          opacity: autoSub >= 1 ? 1 : 0,
                          transform: autoSub >= 1 ? 'translateX(0)' : 'translateX(-10px)',
                          transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + ri * 0.1}s`,
                        }}>
                          <span style={{ fontSize: 11, color: '#bbb' }}>{r.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#222' }}>{r.v}</span>
                        </div>
                      ))}
                      <div style={{
                        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
                        backgroundColor: `${G}06`, borderTop: `1px solid ${G}08`,
                        opacity: autoSub >= 2 ? 1 : 0,
                        transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                      }}>
                        <Check className="w-3.5 h-3.5" style={{ color: G }} strokeWidth={2.5} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: G }}>Sendt via Fiken</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state before first step */}
                {autoStep === 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: 40, animation: 'hpa-auto-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}>
                    <div className="w-8 h-8 rounded-full border-2" style={{ borderColor: '#e8e4df', borderTopColor: A, animation: 'hpa-spin 1.2s linear infinite' }} />
                    <p style={{ fontSize: 11, color: '#c5bfb6', marginTop: 14, fontWeight: 500 }}>Starter automatisering...</p>
                  </div>
                )}
              </div>

              {/* Bottom status — appears after all steps */}
              {autoStep >= 6 && autoSub >= 2 && (
                <div style={{
                  position: 'absolute', bottom: 24, left: 0, right: 0,
                  display: 'flex', justifyContent: 'center', zIndex: 3,
                  animation: 'hpa-auto-fade-up 1s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                  <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full" style={{
                    backgroundColor: `${G}08`, border: `1px solid ${G}12`,
                  }}>
                    <Check className="w-4 h-4" style={{ color: G }} strokeWidth={2.5} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: G }}>Hele utleieprosessen fullført</span>
                    <span style={{ fontSize: 10, color: '#c5bfb6', marginLeft: 4 }}>30,8 sek</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ════ CTA — Final Scene ════ */}
        {phase === 'cta' && (
          <div style={{
            position: 'absolute', inset: 0, backgroundColor: BG,
            animation: 'hpa-fade 0.8s ease-out',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {/* Headline — typewriter, centered then shifts up */}
            <p className="text-center" style={{
              maxWidth: 600, fontSize: 28, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.03em', lineHeight: 1.3,
              transform: ctaStep >= 2 ? 'translateY(-16px)' : 'translateY(0)',
              transition: 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <span>{ctaHeadline.slice(0, ctaCharCount)}</span>
              {ctaStep >= 1 && (
                <span style={{ display: 'inline-block', width: 2, height: '1.1em', backgroundColor: A, marginLeft: 1, verticalAlign: 'text-bottom', animation: ctaCharCount >= ctaHeadline.length ? 'hpa-cursor-blink 1s ease infinite' : 'none' }} />
              )}
            </p>

            {/* Subtitle */}
            <p style={{
              fontSize: 14, color: '#6e6357', fontWeight: 500, textAlign: 'center',
              marginTop: 14, letterSpacing: '-0.01em',
              opacity: ctaStep >= 2 ? 1 : 0,
              transform: ctaStep >= 2 ? 'translateY(-16px)' : 'translateY(8px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              Kom i gang på minutter. Ingen kredittkort nødvendig.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3" style={{
              marginTop: 32,
              opacity: ctaStep >= 3 ? 1 : 0,
              transform: ctaStep >= 3 ? 'translateY(-16px)' : 'translateY(8px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <div style={{
                height: 44, padding: '0 28px', borderRadius: 12,
                backgroundColor: '#1a1a1a', color: '#fff',
                fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
              }}>
                Book demo
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </div>
              <div style={{
                height: 44, padding: '0 28px', borderRadius: 12,
                backgroundColor: 'transparent',
                border: '1.5px solid #ddd8d0', color: '#555',
                fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center',
                cursor: 'pointer',
              }}>
                Prøv gratis
              </div>
            </div>

            {/* Trust line */}
            <p style={{
              marginTop: 24, fontSize: 11, color: '#c4bfb5', fontWeight: 500,
              letterSpacing: '0.01em',
              opacity: ctaStep >= 3 ? 1 : 0,
              transform: ctaStep >= 3 ? 'translateY(-16px)' : 'translateY(0)',
              transition: 'opacity 0.8s ease 0.2s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
            }}>
              Brukt av 2 400+ utleiere i Norge
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════ */
/* BACKUP: Original full animation with tabs — used in backup section        */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function HeroProductAnimationBackup() {
  const [t, setT] = useState(-1);
  const [activeTab, setActiveTab] = useState<'onboarding' | 'rental'>('onboarding');
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const allTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    allTimeouts.current.forEach(clearTimeout);
    allTimeouts.current = [];
  };

  const runSchedule = (schedule: [number, number][], onTick?: (v: number) => void) => {
    clearAll();
    schedule.forEach(([d, v]) => {
      allTimeouts.current.push(setTimeout(() => {
        setT(v);
        onTick?.(v);
      }, d));
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const runLoop = () => {
      setActiveTab('onboarding');
      const schedule: [number, number][] = [
        [0, 0],
        [2000, 11], [3200, 12], [4200, 13], [5800, 14], [6800, 15], [7800, 16],
        [9000, 30], [9600, 31], [10200, 32], [11200, 33],
        [12200, 34], [12700, 35], [13200, 36], [13700, 37], [14700, 38],
        [17500, 40], [17900, 41], [18300, 42], [18700, 43], [19100, 44], [19500, 45],
        [20200, 46], [20800, 47], [21400, 48], [22000, 49],
        [24000, 60],
        [30000, 80], [30700, 81], [31300, 82], [31900, 83], [32500, 84],
        [34500, 90], [37000, 92], [38200, 94],
        [39500, 100], [39800, 101], [40800, 102], [41400, 103], [42800, 104], [43800, 105],
        [45500, 110], [46500, 111], [47500, 112], [48500, 113], [50000, 114], [51000, 115], [52500, 116],
        [55000, 120], [55800, 121], [56400, 122], [57000, 123], [57600, 124],
        [59000, 125], [61000, 126], [62000, 127],
        [64000, 130], [64800, 131], [66000, 132], [67500, 133], [68500, 134],
        [70000, 135], [72000, 136],
        [74000, 140], [74800, 141], [76000, 142], [77500, 143], [79000, 144],
        [81000, 150], [81800, 151], [83000, 152], [84000, 153], [85500, 154],
      ];
      runSchedule(schedule, (v) => {
        if (v === 100) setActiveTab('rental');
      });
      allTimeouts.current.push(setTimeout(runLoop, 90000));
    };

    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) { started.current = true; runLoop(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => { obs.disconnect(); clearAll(); };
  }, []); // eslint-disable-line

  const scene = t < 0 ? 1 : t < 30 ? 1 : t < 40 ? 2 : t < 60 ? 3 : t < 80 ? 4 : t < 100 ? 5 : 6;
  const showSidebar = t >= 90;

  const handleTabClick = (tab: 'onboarding' | 'rental') => {
    setActiveTab(tab);
    if (tab === 'onboarding') {
      runSchedule([
        [0, 0], [2000, 11], [3200, 12], [4200, 13], [5800, 14], [6800, 15], [7800, 16],
        [9000, 30], [9600, 31], [10200, 32], [11200, 33],
        [12200, 34], [12700, 35], [13200, 36], [13700, 37], [14700, 38],
        [17500, 40], [17900, 41], [18300, 42], [18700, 43], [19100, 44], [19500, 45],
        [20200, 46], [20800, 47], [21400, 48], [22000, 49],
        [24000, 60],
        [30000, 80], [30700, 81], [31300, 82], [31900, 83], [32500, 84],
        [34500, 90], [37000, 92], [38200, 94],
      ]);
    }
    if (tab === 'rental') {
      runSchedule([
        [0, 100], [300, 101], [1300, 102], [1900, 103], [3300, 104], [4300, 105],
        [6000, 110], [7000, 111], [8000, 112], [9000, 113], [10500, 114], [11500, 115], [13000, 116],
        [15500, 120], [16300, 121], [16900, 122], [17500, 123], [18100, 124],
        [19500, 125], [21500, 126], [22500, 127],
        [24500, 130], [25300, 131], [26500, 132], [28000, 133], [29000, 134],
        [30500, 135], [32500, 136],
        [34500, 140], [35300, 141], [36500, 142], [38000, 143], [39500, 144],
        [41500, 150], [42300, 151], [43500, 152], [44500, 153], [46000, 154],
      ]);
    }
  };

  const tabs = [
    { key: 'onboarding' as const, label: 'Kom i gang' },
    { key: 'rental' as const, label: 'Utleie' },
  ];

  return (
    <div ref={ref} className="flex flex-col" data-testid="hero-product-animation-backup" style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      <div className="flex items-center justify-center">
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => handleTabClick(tab.key)}
              className="relative px-6 py-2.5 text-[13px] font-semibold transition-all duration-300"
              style={{
                color: active ? '#222' : '#aaa',
                backgroundColor: active ? BG : 'transparent',
                borderRadius: '12px 12px 0 0',
                marginBottom: -1,
                zIndex: active ? 2 : 1,
              }}>
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex rounded-[20px] overflow-hidden relative" style={{ minHeight: 715, boxShadow: '0 20px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)', zIndex: 1 }}>
        <style>{`
          @keyframes hpa-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
          @keyframes hpa-pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.6; transform:scale(1.08) } }
          @keyframes hpa-spin { to { transform:rotate(360deg) } }
          @keyframes hpa-shimmer { 0% { transform:translateX(-100%) } 100% { transform:translateX(100%) } }
          @keyframes hpa-cursor { 0%,100% { opacity:1 } 50% { opacity:0 } }
          @keyframes hpa-pin-drop { 0% { transform:translateY(-40px); opacity:0 } 100% { transform:translateY(0); opacity:1 } }
          @keyframes hpa-ping { 0% { transform:translateX(-50%) scale(1); opacity:0.4 } 100% { transform:translateX(-50%) scale(3); opacity:0 } }
          @keyframes hpa-click-ring { 0% { transform:scale(1); opacity:0.6 } 100% { transform:scale(1.5); opacity:0 } }
        `}</style>
        <div className="shrink-0 overflow-hidden self-stretch transition-all duration-[3000ms] ease-[cubic-bezier(0.12,0.8,0.24,1)]"
          style={{ width: showSidebar ? 200 : 0 }}>
          <Sidebar />
        </div>
        <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: BG }}>
          <div style={{ minHeight: 715 }}>
            {activeTab === 'onboarding' && <>
              {scene === 1 && <AddressScene t={t < 0 ? 0 : t} />}
              {scene === 2 && <BuildingScene t={t} />}
              {scene === 3 && <ImageScene t={t} />}
              {scene === 4 && <TextScene t={t} />}
              {scene === 5 && <UnitDetail t={t} />}
            </>}
            {activeTab === 'rental' && <RentalScene t={t} />}
          </div>
        </div>
      </div>
    </div>
  );
}

