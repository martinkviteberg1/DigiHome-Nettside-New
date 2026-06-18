'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Camera, Wand2, Globe, CheckCircle2,
  ArrowRight, Star, Eye, Check,
  Plus, Image, FileText, MapPin,
} from 'lucide-react';

const F = "var(--font-heading), 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

/* ─── Premium Google Map for hero animation ─── */
const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#f8f7f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#d4e6f1' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e8e5e0' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#f0eeeb' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#f0f0f0' }] },
  { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#eef2e8' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#bbbbbb' }] },
];

function HeroMap({ active, address, settled, zoomIn }: { active: boolean; address: string; settled: boolean; zoomIn?: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const overlayRef = useRef<any>(null);

  useEffect(() => {
    if (!active || !mapRef.current || !window.google?.maps) return;
    if (mapInstance.current) return;

    // Geocode first, then create map already centered + zoomed
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status !== 'OK' || !results?.[0] || !mapRef.current) return;
      const loc = results[0].geometry.location;

      // Create map already at the right position — no zoom animation
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: loc, zoom: 16,
        disableDefaultUI: true, zoomControl: false, mapTypeControl: false,
        streetViewControl: false, fullscreenControl: false, gestureHandling: 'none',
        styles: MAP_STYLES,
      });

      // Drop pin after a short delay
      setTimeout(() => {
        if (!mapInstance.current || overlayRef.current) return;
        class PinOverlay extends window.google.maps.OverlayView {
          pos: any; div: any;
          constructor(pos: any, map: any) { super(); this.pos = pos; this.setMap(map); }
          onAdd() {
            this.div = document.createElement('div');
            this.div.style.cssText = 'position:absolute;transform:translate(-50%,-100%)';
            this.div.innerHTML = `<div style="position:relative;display:flex;flex-direction:column;align-items:center;animation:haPinPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both"><div style="position:relative"><div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(10,10,10,0.08);animation:haRipple 2.5s ease-out infinite"></div><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1a1a1a,#333);border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,0.25)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div></div><div style="width:2px;height:8px;background:rgba(10,10,10,0.15);border-radius:1px"></div><div style="width:6px;height:3px;border-radius:50%;background:rgba(0,0,0,0.1)"></div></div>`;
            this.getPanes()!.overlayMouseTarget.appendChild(this.div);
          }
          draw() { const p = this.getProjection().fromLatLngToDivPixel(this.pos); if (p && this.div) { this.div.style.left = p.x + 'px'; this.div.style.top = p.y + 'px'; } }
          onRemove() { this.div?.parentNode?.removeChild(this.div); }
        }
        overlayRef.current = new PinOverlay(loc, mapInstance.current);
      }, 400);
    });

    return () => {
      if (overlayRef.current) { overlayRef.current.setMap(null); overlayRef.current = null; }
      mapInstance.current = null;
    };
  }, [active, address]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ boxShadow: 'inset 0 0 20px 4px rgba(248,247,245,0.3)' }} />
    </div>
  );
}

/* ── Images ── */
const I1 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/4lwdlnwm_old_1.webp';
const I2 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/7o4qu1qw_old_2.webp';
const I3 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/u6pglojf_old_3.webp';
const I4 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/txskgnjv_old_4.webp';
const I5 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/olgh870f_old_5.webp';
const I6 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/86c0fvpk_new_1.webp';
const I7 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/qqhshbbz_new_2.webp';
const I8 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/1i478pq4_new_3.webp';
const I9 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/fdx1jyhs_new_4.webp';
const I10 = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/vldrqaqz_new_5.webp';
const BEFORE_IMG = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/f7yslb10_d8c5c8be-9419-4826-9bc1-5553f4a4c71c.jpeg';
const AFTER_IMG = 'https://customer-assets.emergentagent.com/job_f0c3ab92-433c-48b5-85fb-1c424103bee8/artifacts/9csm31pz_19a4605a-1b46-4f28-9b4d-cca78c14cfdf.jpeg';

/* ── Steps ── */
const ADDR = 'Strandveien 42, 5007 Bergen';
const ST = [
  { id: 'address', label: 'Skriv inn adresse', dur: 13500 },
  { id: 'photos', label: 'Last opp bilder', dur: 5500 },
  { id: 'analyze', label: 'Analyserer', dur: 8000 },
  { id: 'photos_ai', label: 'Bildemagi', dur: 10000 },
  { id: 'content', label: 'Lager annonse', dur: 10000 },
  { id: 'publish', label: 'Publiser', dur: 8000 },
];
const SI = [MapPin, Camera, Sparkles, Wand2, FileText, Globe];

export default function LandingHeroAnimation() {
  const [step, setStep] = useState(0);
  const [addr, setAddr] = useState('');
  const [photos, setPhotos] = useState(0);
  const [items, setItems] = useState(0);
  const [tick, setTick] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapSettled, setMapSettled] = useState(false);
  const [mapExiting, setMapExiting] = useState(false);
  const [introPhase, setIntroPhase] = useState(0);
  const [addrSelected, setAddrSelected] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [addrPhase, setAddrPhase] = useState(0);
  const [titleChars, setTitleChars] = useState(0);
  const [descWords, setDescWords] = useState(0);
  const [amenityCount, setAmenityCount] = useState(0);
  const [contentPhase, setContentPhase] = useState(0);
  const [analyzePhase, setAnalyzePhase] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(0);
  const [photoPhase, setPhotoPhase] = useState(0);
  const [stylePrompt, setStylePrompt] = useState('');
  const [resCount, setResCount] = useState(720);
  const [qualityPct, setQualityPct] = useState(32);
  const [publishPhase, setPublishPhase] = useState(0);
  const [pushProgress, setPushProgress] = useState(0);
  const sid = ST[step]?.id || 'address';
  const Icon = SI[step] || Sparkles;

  useEffect(() => { const t = setInterval(() => setTick(v => v + 1), 100); return () => clearInterval(t); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (step < ST.length - 1) setStep(p => p + 1);
      else setTimeout(() => { setStep(0); setAddr(''); setPhotos(0); setItems(0); setTick(0); setMapReady(false); setMapSettled(false); setMapExiting(false); setAddrSelected(false); setInputVisible(false); setAddrPhase(0); setIntroPhase(0); setTitleChars(0); setDescWords(0); setAmenityCount(0); setPhotoPhase(0); setStylePrompt(''); setResCount(720); setQualityPct(32); setPublishPhase(0); setPushProgress(0); }, 2500);
    }, ST[step]?.dur || 3000);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (sid === 'address') {
      setMapReady(false); setAddrSelected(false); setInputVisible(false); setAddrPhase(0); setMapSettled(false); setMapExiting(false); setIntroPhase(0);
      const t0 = setTimeout(() => setIntroPhase(1), 300);
      const t1 = setTimeout(() => setIntroPhase(2), 2800);
      const t2 = setTimeout(() => setIntroPhase(3), 3500);
      const t3 = setTimeout(() => setIntroPhase(4), 4400);
      // Phase 5: Button pressed → turns green
      const t4 = setTimeout(() => setIntroPhase(5), 4900);
      // Phase 6: Search morphs in
      const t5 = setTimeout(() => { setIntroPhase(6); setInputVisible(true); }, 5400);
      // Typing starts
      const typingDelay = setTimeout(() => {
        setAddrPhase(1);
        const SPEEDS: number[] = [];
        for (let c = 0; c < ADDR.length; c++) {
          const ch = ADDR[c];
          if (c < 3) SPEEDS.push(78);
          else if (ch === ',') SPEEDS.push(160);
          else if (ch === ' ') SPEEDS.push(95);
          else if (c > ADDR.length - 4) SPEEDS.push(58);
          else SPEEDS.push(38 + Math.random() * 16);
        }
        let charIdx = 0;
        const typeChar = () => {
          if (charIdx >= ADDR.length) {
            // Dropdown narrows to exact matches
            setTimeout(() => setAddrPhase(3), 250);
            // First result highlighted
            setTimeout(() => setAddrPhase(4), 700);
            // Selected → map zooms in
            setTimeout(() => { setAddrPhase(5); setAddrSelected(true); setMapReady(true); }, 1100);
            setTimeout(() => { setMapSettled(true); }, 2200);
            setTimeout(() => { setMapExiting(true); }, 4200);
            return;
          }
          charIdx++;
          setAddr(ADDR.slice(0, charIdx));
          // Dropdown appears after 3 chars
          if (charIdx === 3) setAddrPhase(2);
          setTimeout(typeChar, SPEEDS[charIdx] || 42);
        };
        typeChar();
      }, 5800);
      return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(typingDelay); };
    }
    if (sid === 'photos') {
      setPhotos(0); setUploadPhase(0);
      const hint = setTimeout(() => setUploadPhase(1), 800);
      const startUpload = setTimeout(() => {
        setUploadPhase(2);
        let i = 0;
        const t = setInterval(() => { i++; setPhotos(i); if(i>=10) clearInterval(t); }, 280);
      }, 1500);
      return () => { clearTimeout(hint); clearTimeout(startUpload); };
    }
    if (sid === 'analyze') {
      setItems(0); setAnalyzePhase(0);
      const startScan = setTimeout(() => {
        setAnalyzePhase(1);
        setItems(1);
        let i = 1;
        const t = setInterval(() => { i++; setItems(i); if(i>=7) clearInterval(t); }, 800);
      }, 1300);
      return () => clearTimeout(startScan);
    }
    if (sid === 'content') {
      setTitleChars(0); setDescWords(0); setAmenityCount(0); setContentPhase(0);
      const TITLE = 'Lys og moderne 3-roms med panoramisk byutsikt';
      const DESC_WORDS = 'Innbydende leilighet med åpen planløsning, oppusset kjøkken med Siemens iQ500-apparater, gulvvarme på badet, og en solrik balkong med fantastisk panoramautsikt over byen.'.split(' ');
      const t1 = setTimeout(() => {
        setContentPhase(1);
        let tc = 0;
        const titleTimer = setInterval(() => { tc++; setTitleChars(tc); if (tc >= TITLE.length) clearInterval(titleTimer); }, 35);
      }, 1300);
      const t2 = setTimeout(() => setContentPhase(2), 3500);
      const t3 = setTimeout(() => setContentPhase(3), 4300);
      const t4 = setTimeout(() => {
        setContentPhase(4);
        let wc = 0;
        const descTimer = setInterval(() => { wc++; setDescWords(wc); if (wc >= DESC_WORDS.length) clearInterval(descTimer); }, 55);
      }, 5600);
      const t5 = setTimeout(() => {
        setContentPhase(5);
        let ac = 0;
        const amenTimer = setInterval(() => { ac++; setAmenityCount(ac); if (ac >= 8) clearInterval(amenTimer); }, 80);
      }, 8000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
    }
    if (sid === 'photos_ai') {
      setPhotoPhase(0); setStylePrompt(''); setResCount(720); setQualityPct(32);
      const PROMPT = 'Hotellseng, fyll garderobe, legg til teppe';
      setTimeout(() => setPhotoPhase(1), 1400);
      const upscaleTimer = setTimeout(() => {
        setPhotoPhase(2);
        let res = 720;
        const resTimer = setInterval(() => { res += Math.floor(Math.random() * 55 + 35); if (res >= 2048) { res = 2048; clearInterval(resTimer); } setResCount(res); }, 40);
        let q = 32;
        const qTimer = setInterval(() => { q += Math.floor(Math.random() * 4 + 2); if (q >= 96) { q = 96; clearInterval(qTimer); } setQualityPct(q); }, 35);
      }, 2600);
      const promptDelay = setTimeout(() => {
        setPhotoPhase(3);
        let i = 0;
        const t = setInterval(() => { i++; setStylePrompt(PROMPT.slice(0, i)); if (i >= PROMPT.length) { clearInterval(t); setTimeout(() => setPhotoPhase(4), 600); } }, 30);
      }, 4500);
      return () => { clearTimeout(upscaleTimer); clearTimeout(promptDelay); };
    }
    if (sid === 'publish') {
      setPublishPhase(0); setPushProgress(0);
      const t1 = setTimeout(() => setPublishPhase(1), 1100);
      const t2 = setTimeout(() => { setPublishPhase(2); let p = 0; const timer = setInterval(() => { p++; setPushProgress(p); if (p >= 4) clearInterval(timer); }, 400); }, 3200);
      const t3 = setTimeout(() => setPublishPhase(3), 5800);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [sid]);

  const done = sid === 'publish' && publishPhase >= 3;
  const showChrome = sid !== 'address' || addrPhase >= 5;

  return (
    <div className="relative" data-testid="hero-animation" style={{ animation: 'haGlassEntry 1.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
      <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/10 via-purple-500/[0.08] to-fuchsia-500/5 rounded-[32px] blur-2xl" style={{ animation: 'haGlassGlow 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }} />
      <div className="relative rounded-[24px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]">
        <div className="p-4 sm:p-5 h-[500px] flex flex-col" style={{ fontFamily: F }}>

          {/* Step bar */}
          <div className={`flex items-center gap-[3px] transition-all ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${showChrome ? 'mb-3 opacity-100 max-h-8 duration-[800ms]' : 'mb-0 opacity-0 max-h-0 duration-[500ms]'}`}>
            {ST.map((_, i) => (
              <div key={i} className={`h-[4px] flex-1 rounded-full transition-all duration-[800ms] ease-out ${i < step ? 'bg-violet-500' : i === step ? 'bg-violet-400' : 'bg-black/[0.04]'}`} style={i === step ? { animation: 'haProgressPulse 1.5s ease-in-out infinite' } : undefined} />
            ))}
          </div>

          {/* Step header */}
          <div className={`flex items-center justify-between transition-all ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${showChrome ? 'mb-3 opacity-100 max-h-14 duration-[800ms]' : 'mb-0 opacity-0 max-h-0 duration-[500ms]'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${done ? 'bg-emerald-500 shadow-md shadow-emerald-500/25' : 'bg-violet-100'}`}>
                {done ? <Check className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-violet-600" />}
              </div>
              <div>
                <span className="text-[14px] font-bold text-slate-900 block leading-tight">{ST[step]?.label}</span>
                <span className="text-[11px] text-slate-400 font-medium">Steg {step + 1} av {ST.length}</span>
              </div>
            </div>
            <div className={`h-7 px-3 rounded-full flex items-center gap-1.5 text-[11px] font-bold ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {done ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[10px]">{step + 1}/{ST.length}</span>}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative rounded-2xl">
            <div className="absolute inset-0">

            {/* === STEP 1: ADDRESS === */}
            <div className={`absolute inset-0 ${sid === 'address' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`} style={{ transform: sid === 'address' ? 'scale(1)' : 'scale(1.1)', filter: sid === 'address' ? 'blur(0px)' : 'blur(12px)', transition: 'opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 1200ms cubic-bezier(0.16,1,0.3,1), filter 900ms cubic-bezier(0.16,1,0.3,1)' }}>
              <div className="h-full relative">
                {/* Layer 0: Listing Showcase — the dream result */}
                <div className="absolute inset-0 z-30" style={{
                  opacity: introPhase >= 2 ? 0 : introPhase >= 1 ? 1 : 0,
                  transform: introPhase >= 2 ? 'scale(0.92) translateY(-8px)' : introPhase >= 1 ? 'scale(1)' : 'scale(0.97)',
                  filter: introPhase >= 2 ? 'blur(16px)' : 'blur(0px)',
                  transition: introPhase >= 2
                    ? 'opacity 900ms cubic-bezier(0.22,1,0.36,1), transform 1100ms cubic-bezier(0.22,1,0.36,1), filter 900ms cubic-bezier(0.22,1,0.36,1)'
                    : 'opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 900ms cubic-bezier(0.22,1,0.36,1)',
                  pointerEvents: 'none',
                }}>
                  <div className="h-full flex flex-col">
                    {/* Hero image */}
                    <div className="relative flex-[1.6] min-h-0 rounded-xl overflow-hidden">
                      <img src={I6} alt="" className="w-full h-full object-cover" style={{
                        transform: introPhase >= 1 ? 'scale(1.06)' : 'scale(1)',
                        transition: 'transform 5s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                      {/* Shimmer overlay */}
                      {introPhase >= 1 && introPhase < 2 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" style={{ animation: 'haShimmer 2s ease-out 0.8s forwards' }} />
                      )}
                      {/* New badge */}
                      <div className="absolute top-3 left-3" style={{
                        opacity: introPhase >= 1 ? 1 : 0,
                        transform: introPhase >= 1 ? 'translateY(0)' : 'translateY(6px)',
                        transition: 'opacity 500ms ease 400ms, transform 500ms cubic-bezier(0.22,1,0.36,1) 400ms',
                      }}>
                        <div className="h-[24px] px-2.5 rounded-lg bg-white shadow-sm flex items-center gap-1">
                          <Star className="w-3 h-3 text-slate-900" fill="currentColor" />
                          <span className="text-[10px] font-bold text-slate-900">Ny</span>
                        </div>
                      </div>
                      {/* Heart */}
                      <div className="absolute top-3 right-3" style={{
                        opacity: introPhase >= 1 ? 1 : 0,
                        transition: 'opacity 500ms ease 500ms',
                      }}>
                        <div className="w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </div>
                      </div>
                      {/* Bottom info overlay */}
                      <div className="absolute bottom-0 inset-x-0 px-3.5 py-3" style={{
                        opacity: introPhase >= 1 ? 1 : 0,
                        transform: introPhase >= 1 ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'opacity 600ms ease 550ms, transform 600ms cubic-bezier(0.22,1,0.36,1) 550ms',
                      }}>
                        <div className="flex items-center gap-1.5">
                          {['WiFi', '3 soverom', 'Balkong', 'Parkering'].map((tag, i) => (
                            <span key={i} className="h-[20px] px-2 rounded-md bg-white/20 backdrop-blur-md text-[8px] font-semibold text-white border border-white/10 flex items-center" style={{
                              opacity: introPhase >= 1 ? 1 : 0,
                              transition: `opacity 400ms ease ${650 + i * 80}ms`,
                            }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Listing details */}
                    <div className="pt-3 pb-1 flex-shrink-0" style={{
                      opacity: introPhase >= 1 ? 1 : 0,
                      transform: introPhase >= 1 ? 'translateY(0)' : 'translateY(8px)',
                      transition: 'opacity 600ms ease 300ms, transform 600ms cubic-bezier(0.22,1,0.36,1) 300ms',
                    }}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-bold text-slate-900 tracking-[-0.01em] leading-tight">Strandveien 42, Bergen</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Hel leilighet &middot; 3 soverom &middot; 5 senger &middot; 75 m&sup2;</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-3" style={{
                          opacity: introPhase >= 1 ? 1 : 0,
                          transition: 'opacity 400ms ease 700ms',
                        }}>
                          <Star className="w-3 h-3 text-slate-900" fill="currentColor" />
                          <span className="text-[11px] font-bold text-slate-900">4.92</span>
                          <span className="text-[10px] text-slate-400 ml-0.5">(28)</span>
                        </div>
                      </div>
                      <div className="h-px bg-slate-100 my-2" />
                      <div className="flex items-center justify-between">
                        <div style={{
                          opacity: introPhase >= 1 ? 1 : 0,
                          transition: 'opacity 500ms ease 600ms',
                        }}>
                          <span className="text-[16px] font-extrabold text-slate-900 tracking-tight">kr 1 850</span>
                          <span className="text-[11px] text-slate-400 font-medium ml-0.5">/natt</span>
                        </div>
                        <div className="flex items-center gap-2" style={{
                          opacity: introPhase >= 1 ? 1 : 0,
                          transform: introPhase >= 1 ? 'translateX(0)' : 'translateX(8px)',
                          transition: 'opacity 500ms ease 700ms, transform 500ms cubic-bezier(0.22,1,0.36,1) 700ms',
                        }}>
                          <div className="h-8 px-5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[11px] font-bold flex items-center shadow-lg shadow-rose-500/20">
                            Reserver
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layer 0.5: CTA Screen */}
                <div className="absolute inset-0 z-25 flex flex-col items-center justify-center" style={{
                  opacity: introPhase >= 3 && introPhase < 6 ? 1 : 0,
                  transform: introPhase >= 6 ? 'scale(0.88) translateY(-12px)' : introPhase >= 3 ? 'scale(1)' : 'scale(1.04)',
                  filter: introPhase >= 6 ? 'blur(16px)' : introPhase < 3 ? 'blur(10px)' : 'blur(0px)',
                  transition: introPhase >= 6
                    ? 'opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 900ms cubic-bezier(0.22,1,0.36,1), filter 700ms cubic-bezier(0.22,1,0.36,1)'
                    : 'opacity 800ms cubic-bezier(0.22,1,0.36,1), transform 1000ms cubic-bezier(0.22,1,0.36,1), filter 800ms cubic-bezier(0.22,1,0.36,1)',
                  pointerEvents: 'none',
                }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(139,92,246,0.05) 0%, transparent 55%)', opacity: introPhase >= 3 && introPhase < 6 ? 1 : 0, transition: 'opacity 1.2s ease' }} />
                  <div className="relative flex flex-col items-center">
                    <div className="mb-5 relative" style={{ opacity: introPhase >= 3 ? 1 : 0, transform: introPhase >= 3 ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.7)', transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 800ms cubic-bezier(0.22,1,0.36,1)' }}>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-2xl shadow-slate-900/25 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.07] to-white/0" style={{ animation: introPhase >= 3 && introPhase < 6 ? 'haSheen 4s ease-in-out infinite' : 'none' }} />
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      </div>
                      <div className="absolute inset-[-8px] rounded-2xl" style={{ animation: introPhase >= 3 && introPhase < 6 ? 'haSpinSlow 7s linear infinite' : 'none' }}><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-400/50" /></div>
                      <div className="absolute inset-[-16px] rounded-3xl border border-slate-200/30" style={{ animation: introPhase >= 3 && introPhase < 6 ? 'haBreathe 3.5s ease-in-out infinite' : 'none' }} />
                    </div>
                    <p className="text-[20px] font-extrabold text-slate-900 tracking-[-0.03em] mb-2" style={{ opacity: introPhase >= 3 ? 1 : 0, transform: introPhase >= 3 ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 600ms cubic-bezier(0.22,1,0.36,1) 180ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 180ms' }}>Klar for Airbnb?</p>
                    <p className="text-[12px] text-slate-400 font-medium mb-7" style={{ opacity: introPhase >= 3 ? 1 : 0, transform: introPhase >= 3 ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 600ms cubic-bezier(0.22,1,0.36,1) 300ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 300ms' }}>Fra adresse til ferdig annonse p&aring; 60 sekunder</p>
                    <div className="relative" style={{ opacity: introPhase >= 3 ? 1 : 0, transform: introPhase >= 3 ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 600ms cubic-bezier(0.22,1,0.36,1) 420ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 420ms' }}>
                      <div className="absolute -inset-[6px] rounded-2xl transition-all duration-[600ms]" style={{ boxShadow: introPhase >= 4 && introPhase < 5 ? '0 0 28px rgba(10,10,10,0.15), 0 0 8px rgba(139,92,246,0.1)' : 'none', animation: introPhase >= 3 && introPhase < 4 ? 'haCTAPulse 2.2s cubic-bezier(0.22,1,0.36,1) infinite' : 'none' }} />
                      <button className="relative flex items-center gap-2.5 h-[50px] px-9 rounded-2xl font-bold text-[14px] tracking-[-0.01em] overflow-hidden" style={{ background: introPhase === 5 ? '#10b981' : introPhase >= 4 ? '#111' : '#0a0a0a', color: 'white', boxShadow: introPhase === 5 ? '0 4px 20px rgba(16,185,129,0.35), 0 0 0 1px rgba(16,185,129,0.2)' : introPhase >= 4 ? '0 12px 40px rgba(10,10,10,0.3), 0 0 0 1px rgba(255,255,255,0.06)' : '0 8px 32px rgba(10,10,10,0.18), 0 0 0 1px rgba(255,255,255,0.05)', transform: introPhase === 5 ? 'scale(0.93)' : introPhase >= 4 ? 'scale(1.03)' : 'scale(1)', transition: introPhase === 5 ? 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)' : 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.07) 50%, transparent 62%)', backgroundSize: '200% 100%', animation: introPhase >= 3 && introPhase < 4 ? 'haBtnShimmer 3s ease-in-out infinite' : 'none', opacity: introPhase >= 4 ? 0 : 1, transition: 'opacity 300ms ease' }} />
                        {introPhase === 5 ? (<><Check className="w-4.5 h-4.5 relative" /><span className="relative">Annonsen er publisert</span></>) : (<><span className="relative">Start utleie</span><ArrowRight className="w-4 h-4 relative" style={{ transform: introPhase >= 4 && introPhase < 5 ? 'translateX(2px)' : 'translateX(0)', transition: 'transform 400ms cubic-bezier(0.22,1,0.36,1)' }} /></>)}
                      </button>
                      {introPhase === 5 && (<div className="absolute inset-0 pointer-events-none"><div className="absolute rounded-2xl" style={{ inset: '-5px', background: 'rgba(16,185,129,0.1)', animation: 'haTouchRippleBtn 0.8s cubic-bezier(0.22,1,0.36,1) forwards' }} /></div>)}
                    </div>
                  </div>
                </div>

                {/* Search + map — wizard-identical, world-class polish */}
                <div className="absolute inset-0 z-20 flex flex-col" style={{
                  opacity: introPhase >= 6 ? (mapExiting ? 0 : 1) : 0,
                  transform: introPhase >= 6 ? (mapExiting ? 'scale(0.96)' : 'scale(1)') : 'scale(1.02)',
                  filter: introPhase >= 6 ? (mapExiting ? 'blur(12px)' : 'blur(0px)') : 'blur(8px)',
                  transition: 'all 1000ms cubic-bezier(0.22,1,0.36,1)',
                  pointerEvents: introPhase >= 6 ? 'auto' : 'none',
                }}>

                  {/* Address input — confirmed card after selection */}
                  <div className="flex-shrink-0 px-4 pt-3 relative z-10">
                    {/* Typing state */}
                    <div style={{
                      opacity: inputVisible && !addrSelected ? 1 : 0,
                      maxHeight: !addrSelected ? '60px' : '0px',
                      transform: !addrSelected ? 'translateY(0)' : 'translateY(-8px)',
                      transition: 'all 500ms cubic-bezier(0.22,1,0.36,1)',
                      overflow: 'hidden',
                    }}>
                      <div className="relative flex items-center h-[48px] px-4 gap-3 bg-white rounded-2xl" style={{
                        boxShadow: addrPhase >= 1 ? '0 4px 24px rgba(0,0,0,0.06), 0 0 0 2px rgba(207,151,252,0.18)' : '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06)',
                        transition: 'box-shadow 600ms cubic-bezier(0.22,1,0.36,1)',
                      }}>
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {addr ? (
                            <span className="font-medium text-[14px] text-slate-900 block truncate">
                              {addr}
                              <span className="inline-block w-[2px] h-[15px] bg-slate-900 ml-0.5 animate-[haBlink_0.8s_steps(2)_infinite] align-middle" />
                            </span>
                          ) : (
                            <span className="text-[14px] text-slate-300 font-normal block" style={{ opacity: inputVisible ? 1 : 0, transition: 'opacity 500ms ease 300ms' }}>
                              Skriv inn adressen...
                              {inputVisible && addrPhase < 1 && <span className="inline-block w-[2px] h-[15px] bg-slate-300 ml-0.5 animate-[haBlink_1s_steps(2)_infinite] align-middle" />}
                            </span>
                          )}
                        </div>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                      </div>
                    </div>

                    {/* Confirmed state — address card */}
                    <div style={{
                      opacity: addrSelected ? 1 : 0,
                      maxHeight: addrSelected ? '56px' : '0px',
                      transform: addrSelected ? 'translateY(0)' : 'translateY(8px)',
                      transition: 'all 600ms cubic-bezier(0.22,1,0.36,1)',
                      overflow: 'hidden',
                    }}>
                      <div className="flex items-center h-[48px] px-4 gap-3 bg-white rounded-2xl" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06)' }}>
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">{ADDR.split(',')[0]}</p>
                          <p className="text-[10px] text-slate-400 truncate">{ADDR.split(',').slice(1).join(',').trim()}, Norge</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" style={{ animation: 'haFadeScale 0.4s cubic-bezier(0.22,1,0.36,1)' }} />
                      </div>
                    </div>

                    {/* Autocomplete dropdown */}
                    <div style={{
                      maxHeight: addrPhase >= 2 && addrPhase < 5 ? '170px' : '0px',
                      opacity: addrPhase >= 2 && addrPhase < 5 ? 1 : 0,
                      marginTop: addrPhase >= 2 && addrPhase < 5 ? '4px' : '0px',
                      overflow: 'hidden',
                      transition: 'all 400ms cubic-bezier(0.22,1,0.36,1)',
                    }}>
                      <div className="bg-white rounded-xl overflow-hidden py-0.5" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                        {(addrPhase < 3
                          ? [
                              { main: 'Strandveien', sub: 'Bergen, Norway' },
                              { main: 'Strandgaten', sub: 'Bergen, Norway' },
                              { main: 'Strandkaien', sub: 'Bergen, Norway' },
                            ]
                          : [
                              { main: 'Strandveien 42', sub: '5007 Bergen, Vestland', primary: true },
                              { main: 'Strandveien 42B', sub: '5007 Bergen, Vestland' },
                              { main: 'Strandveien 4', sub: '5054 Bergen, Vestland' },
                            ]
                        ).map((r: any, i: number) => (
                          <div key={`${addrPhase < 3 ? 'a' : 'b'}-${i}`} className="flex items-center gap-2.5 px-3.5 py-2" style={{
                            background: r.primary && addrPhase === 4 ? 'rgba(207,151,252,0.05)' : 'transparent',
                            transition: 'background 400ms ease',
                          }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                              background: r.primary && addrPhase === 4 ? '#0a0a0a' : '#f4f3f1',
                              transition: 'background 400ms ease',
                            }}>
                              <MapPin className="w-3 h-3" style={{ color: r.primary && addrPhase === 4 ? 'white' : '#a0a0a0', transition: 'color 400ms ease' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-slate-900 leading-tight font-semibold">{r.main}</div>
                              <div className="text-[10px] text-slate-400">{r.sub}</div>
                            </div>
                            {r.primary && addrPhase === 4 && (<Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" style={{ animation: 'haFadeScale 0.3s ease-out' }} />)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Map area */}
                  <div className="flex-1 min-h-0 px-3 pb-2 mt-2">
                    <div className="w-full h-full rounded-2xl overflow-hidden relative" style={{ boxShadow: addrPhase >= 5 ? '0 4px 20px rgba(0,0,0,0.06)' : 'none', transition: 'box-shadow 800ms ease' }}>
                      {/* Placeholder */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{
                        background: '#faf9f7',
                        opacity: addrPhase >= 5 ? 0 : 1,
                        transform: addrPhase >= 5 ? 'scale(0.98)' : 'scale(1)',
                        transition: 'all 700ms cubic-bezier(0.22,1,0.36,1)',
                        pointerEvents: addrPhase >= 5 ? 'none' : 'auto',
                      }}>
                        <div className="w-10 h-10 rounded-xl bg-[#f0eeeb] flex items-center justify-center mb-2.5">
                          <MapPin className="w-4 h-4 text-[#c8c4bd]" strokeWidth={1.5} />
                        </div>
                        <p className="text-[10px] text-[#c8c4bd] font-medium">Kartet vises når adresse er valgt</p>
                      </div>

                      {/* Real map — mounts and fades in on selection */}
                      <div className="absolute inset-0" style={{
                        opacity: addrPhase >= 5 ? 1 : 0,
                        transform: addrPhase >= 5 ? 'scale(1)' : 'scale(1.02)',
                        transition: 'all 900ms cubic-bezier(0.22,1,0.36,1) 150ms',
                      }}>
                        {addrPhase >= 5 && <HeroMap active={true} address={ADDR + ', Norge'} settled={mapSettled} zoomIn={true} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* === STEP 2: PHOTOS === */}
            <div className={`absolute inset-0 ${sid === 'photos' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`} style={{ transform: sid === 'photos' ? 'scale(1)' : (step > 1 ? 'scale(1.08)' : 'scale(0.93)'), filter: sid === 'photos' ? 'blur(0px)' : 'blur(8px)', transition: 'opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 1100ms cubic-bezier(0.16,1,0.3,1), filter 900ms cubic-bezier(0.16,1,0.3,1)' }}>
              <div className="h-full flex flex-col">
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: uploadPhase >= 2 ? 0 : 1, transform: uploadPhase >= 2 ? 'scale(0.8)' : 'scale(1)', filter: uploadPhase >= 2 ? 'blur(12px)' : 'blur(0px)', transition: 'opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1), filter 700ms cubic-bezier(0.16,1,0.3,1)', pointerEvents: uploadPhase >= 2 ? 'none' : 'auto' }}>
                  <div className={`w-full max-w-[280px] py-10 flex flex-col items-center rounded-2xl border-2 border-dashed transition-all duration-[500ms] ${uploadPhase >= 1 ? 'border-violet-300 bg-violet-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-[500ms] ${uploadPhase >= 1 ? 'bg-violet-100 border border-violet-200 shadow-md shadow-violet-200/30' : 'bg-white border border-slate-100 shadow-sm'}`}>
                      {uploadPhase >= 1 ? (<div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />) : (<Camera className="w-5 h-5 text-slate-400" strokeWidth={1.5} />)}
                    </div>
                    <p className={`text-[14px] font-semibold mb-1 transition-colors duration-[400ms] ${uploadPhase >= 1 ? 'text-violet-700' : 'text-slate-900'}`}>{uploadPhase >= 1 ? 'Laster opp 10 bilder...' : 'Dra og slipp bildene dine'}</p>
                    <p className={`text-[11px] mb-4 transition-colors duration-[400ms] ${uploadPhase >= 1 ? 'text-violet-400' : 'text-slate-400'}`}>{uploadPhase >= 1 ? 'Behandler bildene dine' : 'eller klikk for å velge filer'}</p>
                    <div className={`h-8 px-5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-[400ms] ${uploadPhase >= 1 ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20' : 'bg-slate-900 text-white shadow-sm'}`}>
                      {uploadPhase >= 1 ? (<><div className="w-3 h-3 border-[1.5px] border-white/40 border-t-white rounded-full animate-spin" /> Laster opp...</>) : (<><Plus className="w-3 h-3" /> Velg bilder</>)}
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-white/40 rounded-2xl pointer-events-none" style={{ opacity: uploadPhase === 2 && photos === 0 ? 0.4 : 0, transition: 'opacity 300ms ease' }} />
                <div className="flex-1 flex flex-col gap-1.5 min-h-0" style={{ opacity: uploadPhase >= 2 ? 1 : 0, transform: uploadPhase >= 2 ? 'scale(1)' : 'scale(1.06)', filter: uploadPhase >= 2 ? 'blur(0px)' : 'blur(4px)', transition: 'opacity 900ms cubic-bezier(0.16,1,0.3,1) 200ms, transform 900ms cubic-bezier(0.16,1,0.3,1) 200ms, filter 900ms cubic-bezier(0.16,1,0.3,1) 200ms' }}>
                  <div className={`relative flex-[2] min-h-0 rounded-xl overflow-hidden transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${photos >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={I6} alt="" className="w-full h-full object-cover" style={{ transform: photos >= 1 ? 'scale(1)' : 'scale(1.12)', transition: 'transform 1800ms cubic-bezier(0.16,1,0.3,1)' }} />
                    {photos >= 1 && photos < 4 && (<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ animation: 'haShimmer 1.5s ease-out forwards' }} />)}
                    <div className={`absolute top-2.5 left-2.5 transition-all duration-500 ${photos >= 1 ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '400ms' }}><div className="h-[22px] px-2 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-1"><Star className="w-2.5 h-2.5 text-amber-400" fill="currentColor" /><span className="text-[9px] font-bold text-white">Hero photo</span></div></div>
                    <div className={`absolute top-2.5 right-2.5 transition-all duration-500 ${photos >= 1 ? 'opacity-100' : 'opacity-0'}`}><div className="h-[22px] px-2 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-1"><Camera className="w-2.5 h-2.5 text-white" /><span className="text-[9px] font-bold text-white">{Math.min(photos, 10)}/10</span></div></div>
                  </div>
                  <div className="flex gap-1 h-[52px] flex-shrink-0">
                    {[I7, I8, I9, I10, I3].map((src, i) => { const visible = photos >= i + 2; return (<div key={i} className="flex-1 relative rounded-lg overflow-hidden" style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(6px)', transition: `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms` }}><img src={src} alt="" className="w-full h-full object-cover" loading="eager" /><div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded bg-white/90 flex items-center justify-center shadow-sm" style={{ opacity: visible ? 1 : 0, transition: `opacity 300ms ease ${150 + i * 50}ms` }}><span className="text-[6px] font-bold text-slate-600">{i + 2}</span></div></div>); })}
                  </div>
                  <div className="flex gap-1 h-[52px] flex-shrink-0">
                    {[I4, I5, I1, I2].map((src, i) => { const visible = photos >= i + 7; return (<div key={i} className="flex-1 relative rounded-lg overflow-hidden" style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(6px)', transition: `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms` }}><img src={src} alt="" className="w-full h-full object-cover" loading="eager" /><div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded bg-white/90 flex items-center justify-center shadow-sm" style={{ opacity: visible ? 1 : 0, transition: `opacity 300ms ease ${150 + i * 50}ms` }}><span className="text-[6px] font-bold text-slate-600">{i + 7}</span></div></div>); })}
                  </div>
                </div>
              </div>
            </div>

            {/* === STEP 3: ANALYZE === */}
            <div className={`absolute inset-0 ${sid === 'analyze' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`} style={{ transform: sid === 'analyze' ? 'scale(1)' : (step > 2 ? 'scale(1.06)' : 'scale(0.94)'), filter: sid === 'analyze' ? 'blur(0px)' : 'blur(6px)', transition: 'opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 1100ms cubic-bezier(0.16,1,0.3,1), filter 900ms cubic-bezier(0.16,1,0.3,1)' }}>
              <div className="h-full flex flex-col">
                {/* Intro — DigiHome branded */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${analyzePhase === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.96] pointer-events-none'}`}>
                  <div className="relative mb-6">
                    <div className="absolute inset-[-10px] rounded-2xl" style={{ animation: 'haSpinSlow 5s linear infinite' }}><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400/60 shadow-sm" /></div>
                    <div className="absolute inset-[-20px] rounded-3xl border border-slate-200/30" style={{ animation: 'haBreathe 3.5s ease-in-out infinite' }} />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-2xl shadow-slate-900/25 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.06] to-white/0" style={{ animation: 'haSheen 4s ease-in-out infinite' }} />
                      <Eye className="w-6 h-6 text-white relative z-10" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-[17px] font-extrabold text-slate-900 tracking-[-0.02em] mb-1.5">Analyserer bilder</p>
                  <p className="text-[11px] text-slate-400 font-medium">Skanner 10 bilder for eiendomsdetaljer</p>
                </div>

                {/* Scanning phase */}
                <div className={`flex-1 flex flex-col transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${analyzePhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {/* Scanning photo — immersive with DigiHome-tinted scan */}
                  <div className="relative rounded-2xl overflow-hidden flex-[1.15] min-h-0 mb-2.5 ring-1 ring-black/[0.04]">
                    {[I1, I3, I2, I4, I5].map((src, i) => { const currentPhoto = Math.min(items, 5) - 1; const isActive = i === Math.max(currentPhoto, 0); const isPast = i < currentPhoto; return (<img key={i} src={src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'scale(1)' : isPast ? 'scale(1.04)' : 'scale(0.96)', transition: 'opacity 1800ms cubic-bezier(0.16,1,0.3,1), transform 2200ms cubic-bezier(0.16,1,0.3,1)' }} />); })}
                    {/* Lavender-tinted scan line */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: items <= 5 ? 1 : 0, transition: 'opacity 800ms ease' }}>
                      <div className="absolute inset-x-0 h-[2px]" style={{ background: 'linear-gradient(to right, transparent, rgba(207,151,252,0.5), rgba(255,255,255,0.6), rgba(207,151,252,0.5), transparent)', animation: 'haScanLine2 2.8s ease-in-out infinite', boxShadow: '0 0 24px 8px rgba(207,151,252,0.08)' }} />
                    </div>
                    {/* Status badge — premium dark glass */}
                    <div className="absolute top-3 left-3"><div className="h-[26px] px-3 rounded-xl bg-slate-900/70 backdrop-blur-xl flex items-center gap-2 border border-white/[0.06]">{items <= 5 ? (<><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">Skanner</span></>) : (<><Check className="w-3 h-3 text-emerald-400" /><span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Ferdig</span></>)}</div></div>
                    {/* Room label + progress */}
                    <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-white tracking-[-0.01em]">{['Stue','Soverom','Kjøkken','Bad','Oversikt'][Math.min(Math.min(items, 5) - 1, 4)] || 'Stue'}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">{[0,1,2,3,4].map(i => (<div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${i < Math.min(items, 5) ? 'bg-white' : 'bg-white/20'}`} />))}</div>
                          <span className="text-[9px] font-bold text-white/50 tabular-nums">{Math.min(items, 10)}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats row — premium dark pills */}
                  <div className="flex items-center gap-2 mb-2">
                    {[{ v: '~75', u: 'm\u00B2', t: 1 }, { v: '3', u: 'rom', t: 2 }, { v: '1', u: 'bad', t: 3 }, { v: '5', u: 'senger', t: 4 }].map((s, i) => (
                      <div key={i} className="flex-1 text-center py-2 rounded-xl transition-all duration-[600ms]" style={{
                        opacity: items >= s.t ? 1 : 0,
                        transform: items >= s.t ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.9)',
                        transition: `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                        background: items >= s.t ? '#0a0a0a' : '#f8fafc',
                      }}>
                        <span className={`text-[16px] font-extrabold tracking-tight ${items >= s.t ? 'text-white' : 'text-slate-300'}`}>{s.v}</span>
                        <span className={`text-[8px] font-semibold ml-0.5 ${items >= s.t ? 'text-white/50' : 'text-slate-300'}`}>{s.u}</span>
                      </div>
                    ))}
                  </div>

                  {/* Discovery items — DigiHome premium cards */}
                  <div className="flex flex-col gap-1.5">
                    {[{ icon: Star, t: 'God tilstand \u00B7 Møblert', s: 'Moderne interiør, parkett', threshold: 5 }, { icon: Eye, t: '14 fasiliteter oppdaget', s: 'WiFi, TV, oppvaskmaskin, gulvvarme, balkong...', threshold: 6 }, { icon: Sparkles, t: 'Siemens iQ500 identifisert', s: 'Kjøkken \u2014 komfyr, ovn, ventilator', threshold: 7 }].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-[700ms]" style={{
                        opacity: items >= item.threshold ? 1 : 0,
                        transform: items >= item.threshold ? 'translateX(0)' : 'translateX(-8px)',
                        borderColor: items >= item.threshold ? 'rgba(207,151,252,0.15)' : 'rgb(241 245 249)',
                        background: items >= item.threshold ? 'rgba(207,151,252,0.04)' : 'white',
                        transition: `all 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
                      }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-[500ms]" style={{
                          background: items >= item.threshold ? '#0a0a0a' : '#f8fafc',
                        }}>
                          <item.icon className={`w-3 h-3 ${items >= item.threshold ? 'text-white' : 'text-slate-300'}`} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-slate-900 leading-tight">{item.t}</div>
                          <div className="text-[9px] text-slate-400 truncate">{item.s}</div>
                        </div>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-[500ms]" style={{
                          background: items >= item.threshold ? '#0a0a0a' : 'transparent',
                          transform: items >= item.threshold ? 'scale(1)' : 'scale(0)',
                          transition: `all 500ms cubic-bezier(0.34,1.56,0.64,1) ${400 + i * 100}ms`,
                        }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* === STEP 4: PHOTOS AI === */}
            <div className={`absolute inset-0 ${sid === 'photos_ai' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`} style={{ transform: sid === 'photos_ai' ? 'scale(1)' : (step > 3 ? 'scale(1.08)' : 'scale(0.93)'), filter: sid === 'photos_ai' ? 'blur(0px)' : 'blur(8px)', transition: 'opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 1100ms cubic-bezier(0.16,1,0.3,1), filter 900ms cubic-bezier(0.16,1,0.3,1)' }}>
              <div className="h-full flex flex-col">
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${photoPhase === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97] pointer-events-none'}`}>
                  <div className="relative mb-5"><div className="absolute inset-[-12px] rounded-full border border-violet-200/40" style={{ animation: 'haSpinSlow 5s linear infinite' }}><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 shadow-lg shadow-violet-400/50" /><div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-300/60" /></div><div className="absolute inset-[-22px] rounded-full border border-violet-100/20" style={{ animation: 'haBreathe 3s ease-in-out infinite' }} /><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-500/25 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0" style={{ animation: 'haSheen 3s ease-in-out infinite' }} /><Wand2 className="w-6 h-6 text-white relative z-10" strokeWidth={1.5} /></div></div>
                  <p className="text-[16px] font-extrabold text-slate-900 tracking-[-0.02em] mb-1">Fotostudio</p><p className="text-[11px] text-slate-400 font-medium mb-5">3-stegs forbedringspipeline</p>
                  <div className="flex items-center gap-1.5">{[{Ic: Image, label: 'Oppskal\u00E9r'}, {Ic: Sparkles, label: 'Forbedre'}, {Ic: Wand2, label: 'Stiling'}].map((s, i) => (<React.Fragment key={i}>{i > 0 && <div className="w-3 h-px bg-slate-200" />}<div className="flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-slate-50 border border-slate-100" style={{ animation: `haCascadeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.12}s both` }}><s.Ic className="w-2.5 h-2.5 text-slate-400" /><span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span></div></React.Fragment>))}</div>
                </div>
                <div className={`flex-1 flex flex-col min-h-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${photoPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                  <div className="flex items-center gap-0.5 mb-2 px-0.5">{[{ label: 'Oppskalér', active: photoPhase >= 1, done: photoPhase >= 3 }, { label: 'Forbedre', active: photoPhase >= 2, done: photoPhase >= 3 }, { label: 'Stiling', active: photoPhase >= 3, done: photoPhase >= 4 }].map((s, i) => (<div key={i} className="flex-1"><div className={`h-[3px] rounded-full transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${s.done ? 'bg-emerald-400' : s.active ? 'bg-violet-100' : 'bg-slate-100'}`}>{s.active && !s.done && (<div className="h-full bg-violet-500 rounded-full" style={{ animation: 'haPipelineFill 2s ease-out forwards' }} />)}</div><span className={`text-[7px] font-bold uppercase tracking-widest mt-0.5 block text-center transition-colors duration-500 ${s.done ? 'text-emerald-500' : s.active ? 'text-violet-500' : 'text-slate-300'}`}>{s.label}</span></div>))}</div>
                  <div className="relative rounded-2xl overflow-hidden flex-1 min-h-0 ring-1 ring-black/[0.04]">
                    <img src={BEFORE_IMG} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ filter: photoPhase >= 2 ? 'blur(0px) brightness(1.06) saturate(1.2) contrast(1.04)' : 'blur(5px) brightness(0.72) saturate(0.4) contrast(0.85)', transition: 'filter 2500ms cubic-bezier(0.16,1,0.3,1)' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ opacity: photoPhase >= 1 && photoPhase < 2 ? 0.12 : 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '6px 6px', transition: 'opacity 2000ms ease' }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(255,200,120,0.06) 0%, transparent 70%)', opacity: photoPhase >= 2 && photoPhase < 4 ? 1 : 0, transition: 'opacity 2000ms ease' }} />
                    <img src={AFTER_IMG} alt="After" className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: photoPhase >= 4 ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)', transition: 'clip-path 2800ms cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    <div className="absolute inset-y-0 z-20" style={{ left: photoPhase >= 4 ? '100%' : '0%', transition: 'left 2800ms cubic-bezier(0.4, 0, 0.2, 1)', opacity: photoPhase >= 4 ? 1 : 0 }}><div className="absolute inset-y-0 -translate-x-1/2 w-[2px] bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.5)]" /><div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white" style={{ opacity: photoPhase >= 4 ? 1 : 0, transition: 'opacity 500ms ease 400ms' }}><div className="flex items-center gap-0.5"><ArrowRight className="w-2.5 h-2.5 text-slate-400 rotate-180" /><div className="w-px h-3 bg-slate-200" /><ArrowRight className="w-2.5 h-2.5 text-slate-400" /></div></div></div>
                    <div className="absolute inset-0 pointer-events-none" style={{ opacity: photoPhase >= 1 && photoPhase < 3 ? 1 : 0, transition: 'opacity 800ms ease' }}><div className="absolute inset-y-0 w-[3px]" style={{ background: 'linear-gradient(to bottom, transparent 5%, rgba(139,92,246,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(139,92,246,0.4) 75%, transparent 95%)', boxShadow: '0 0 20px 6px rgba(139,92,246,0.12)', animation: 'haScanBeam 2.2s ease-in-out infinite' }} /></div>
                    {photoPhase >= 2 && photoPhase < 4 && (<div className="absolute inset-0 pointer-events-none overflow-hidden">{[{ x: '18%', y: '28%', d: '0ms' }, { x: '72%', y: '22%', d: '120ms' }, { x: '38%', y: '62%', d: '200ms' }, { x: '82%', y: '52%', d: '80ms' }, { x: '12%', y: '68%', d: '280ms' }, { x: '58%', y: '14%', d: '160ms' }].map((sp, i) => (<div key={i} className="absolute w-1 h-1 rounded-full bg-white" style={{ left: sp.x, top: sp.y, boxShadow: '0 0 4px rgba(255,255,255,0.9), 0 0 8px rgba(139,92,246,0.4)', animation: `haSparkle 1.8s ease-out ${sp.d} both` }} />))}</div>)}
                    <div className="absolute top-2.5 left-2.5 z-10" style={{ opacity: photoPhase >= 1 && photoPhase < 4 ? 1 : 0, transition: 'opacity 500ms ease' }}><div className="h-[24px] px-2.5 rounded-lg bg-black/50 backdrop-blur-xl flex items-center gap-1.5 border border-white/10">{photoPhase < 2 ? (<><div className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animation: 'haDotPulse 1s ease-in-out infinite' }} /><span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">Oppskalerer</span></>) : (<><Check className="w-3 h-3 text-emerald-400" /><span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Oppskalert</span></>)}</div></div>
                    <div className="absolute top-2.5 right-2.5 z-10" style={{ opacity: photoPhase >= 1 && photoPhase < 4 ? 1 : 0, transition: 'opacity 500ms ease' }}><div className="h-[24px] px-2.5 rounded-lg bg-black/50 backdrop-blur-xl flex items-center gap-1.5 border border-white/10"><span className="text-[8px] font-medium text-white/50 uppercase tracking-wider">Kvalitet</span><span className={`text-[10px] font-bold font-mono tabular-nums transition-colors duration-500 ${qualityPct >= 80 ? 'text-emerald-400' : qualityPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{qualityPct}%</span></div></div>
                    <div className="absolute bottom-2.5 left-2.5 z-10" style={{ opacity: photoPhase >= 1 && photoPhase < 4 ? 1 : 0, transition: 'opacity 500ms ease' }}><div className="px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-xl border border-white/10 flex items-center gap-2"><Image className="w-3 h-3 text-white/55" /><span className={`text-[11px] font-mono font-bold tabular-nums transition-all duration-300 ${resCount >= 2048 ? 'text-emerald-400' : 'text-white'}`}>{resCount}p</span>{resCount >= 2048 && (<span className="text-[7px] font-bold text-emerald-400/80 uppercase tracking-wider" style={{ animation: 'haFadeScale 0.4s ease-out' }}>4x</span>)}</div></div>
                    <div className="absolute top-2.5 left-2.5 z-20" style={{ opacity: photoPhase >= 4 ? 1 : 0, transition: 'opacity 600ms ease 800ms' }}><div className="h-6 px-2.5 rounded-md bg-black/60 backdrop-blur-md flex items-center border border-white/10"><span className="text-[8px] font-bold text-white/80 uppercase tracking-wider">Før</span></div></div>
                    <div className="absolute top-2.5 right-2.5 z-20" style={{ opacity: photoPhase >= 4 ? 1 : 0, transition: 'opacity 600ms ease 1200ms' }}><div className="h-6 px-2.5 rounded-md bg-white/90 backdrop-blur-md flex items-center gap-1 shadow-sm"><Sparkles className="w-2.5 h-2.5 text-violet-600" /><span className="text-[8px] font-bold text-slate-900 uppercase tracking-wider">Stilet</span></div></div>
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex gap-1.5 z-20">{['Garderobe fylt','Hotellseng','Teppe lagt til'].map((t, i) => (<span key={i} className="h-[22px] px-2 rounded-md bg-black/40 backdrop-blur-md text-[8px] font-semibold text-white flex items-center gap-1 border border-white/10" style={{ opacity: photoPhase >= 4 ? 1 : 0, transform: photoPhase >= 4 ? 'translateY(0)' : 'translateY(4px)', transition: `opacity 500ms ease ${2000 + i * 300}ms, transform 500ms ease ${2000 + i * 300}ms` }}><Check className="w-2.5 h-2.5 text-emerald-400" />{t}</span>))}</div>
                  </div>
                  <div style={{ maxHeight: photoPhase >= 3 ? '56px' : '0px', opacity: photoPhase >= 3 ? 1 : 0, overflow: 'hidden', marginTop: photoPhase >= 3 ? '8px' : '0px', transition: 'max-height 600ms cubic-bezier(0.16,1,0.3,1), opacity 400ms ease, margin-top 600ms ease' }}>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-500/15"><Wand2 className="w-3 h-3 text-white" /></div>
                      <div className="flex-1 min-w-0"><div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Instruksjon</div><div className="text-[11px] text-slate-700 leading-snug font-medium">{stylePrompt}{photoPhase === 3 && <span className="inline-block w-[2px] h-[12px] bg-violet-500 ml-0.5 animate-[haBlink_0.8s_steps(2)_infinite] align-middle" />}</div></div>
                      {photoPhase >= 4 && (<div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/25" style={{ animation: 'haFadeScale 0.3s ease-out' }}><Check className="w-3 h-3 text-white" /></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* === STEP 5: CONTENT === */}
            <div className={`absolute inset-0 ${sid === 'content' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`} style={{ transform: sid === 'content' ? 'scale(1)' : (step > 4 ? 'scale(1.06)' : 'scale(0.94)'), filter: sid === 'content' ? 'blur(0px)' : 'blur(6px)', transition: 'opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 1100ms cubic-bezier(0.16,1,0.3,1), filter 900ms cubic-bezier(0.16,1,0.3,1)' }}>
              {(() => {
                const TITLE = 'Lys og moderne 3-roms med panoramisk byutsikt';
                const DESC_WORDS = 'Innbydende leilighet med åpen planløsning, oppusset kjøkken med Siemens iQ500-apparater, gulvvarme på badet, og en solrik balkong med fantastisk panoramautsikt over byen.'.split(' ');
                const titleDone = titleChars >= TITLE.length;
                const descStarted = descWords > 0;
                const descDone = descWords >= DESC_WORDS.length;
                return (
                  <div className="h-full flex flex-col">
                    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${contentPhase === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97] pointer-events-none'}`}>
                      <div className="relative mb-5"><div className="absolute inset-[-12px] rounded-full border border-violet-200/40" style={{ animation: 'haSpinSlow 5s linear infinite reverse' }}><div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-400 shadow-lg shadow-purple-400/50" /><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-300/60" /></div><div className="absolute inset-[-22px] rounded-full border border-violet-100/20" style={{ animation: 'haBreathe 3s ease-in-out infinite 0.5s' }} /><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-500/25 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0" style={{ animation: 'haSheen 3s ease-in-out infinite' }} /><FileText className="w-6 h-6 text-white relative z-10" strokeWidth={1.5} /></div></div>
                      <p className="text-[16px] font-extrabold text-slate-900 tracking-[-0.02em] mb-1">Lager annonsen din</p><p className="text-[11px] text-slate-400 font-medium">Skriver annonsen din</p>
                    </div>
                    <div className={`flex-1 flex flex-col min-h-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${contentPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                      <div style={{ maxHeight: contentPhase >= 3 ? '175px' : '0px', opacity: contentPhase >= 3 ? 1 : 0, overflow: 'hidden', marginBottom: contentPhase >= 3 ? '8px' : '0px', transition: 'max-height 900ms cubic-bezier(0.16,1,0.3,1), opacity 700ms ease, margin-bottom 700ms ease' }}>
                        <div className="grid grid-cols-4 grid-rows-2 gap-[2px] h-[170px] rounded-xl overflow-hidden">
                          <div className="col-span-2 row-span-2 relative overflow-hidden" style={{ opacity: contentPhase >= 3 ? 1 : 0, transform: contentPhase >= 3 ? 'scale(1)' : 'scale(0.96)', transition: 'opacity 600ms ease 80ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 80ms' }}><img src={I1} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" /><div className="absolute top-2.5 left-2.5" style={{ opacity: contentPhase >= 3 ? 1 : 0, transition: 'opacity 400ms ease 500ms' }}><div className="h-[22px] px-2.5 rounded-md bg-white shadow-sm flex items-center gap-1"><Star className="w-3 h-3 text-slate-900" fill="currentColor" /><span className="text-[9px] font-bold text-slate-900 tracking-tight">Ny</span></div></div></div>
                          {[I3, I2, I4, I5].map((src, i) => (<div key={i} className="relative overflow-hidden" style={{ opacity: contentPhase >= 3 ? 1 : 0, transform: contentPhase >= 3 ? 'scale(1)' : 'scale(0.92)', transition: `opacity 500ms ease ${150 + i * 100}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${150 + i * 100}ms` }}><img src={src} alt="" className="w-full h-full object-cover" />{i === 3 && (<div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-0.5" style={{ opacity: contentPhase >= 3 ? 1 : 0, transition: 'opacity 400ms ease 700ms' }}><span className="text-[8px] font-bold text-white">Vis alle</span></div>)}</div>))}
                        </div>
                      </div>
                      <div style={{ paddingTop: contentPhase >= 2 ? '0px' : '28%', transition: 'padding-top 800ms cubic-bezier(0.16,1,0.3,1)' }}>
                        <div className={`font-extrabold text-slate-900 tracking-[-0.025em] transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${contentPhase >= 2 ? 'text-[14px] leading-[1.3]' : 'text-[20px] leading-[1.15] text-center'}`}>{TITLE.slice(0, titleChars)}{!titleDone && titleChars > 0 && <span className="inline-block w-[2px] bg-violet-500 ml-0.5 animate-[haBlink_0.8s_steps(2)_infinite] align-middle" style={{ height: contentPhase >= 2 ? '14px' : '20px', transition: 'height 800ms ease' }} />}</div>
                        <div style={{ maxHeight: contentPhase >= 2 ? '20px' : '0px', opacity: contentPhase >= 2 ? 1 : 0, overflow: 'hidden', marginTop: contentPhase >= 2 ? '3px' : '0px', transition: 'max-height 600ms cubic-bezier(0.16,1,0.3,1) 200ms, opacity 500ms ease 200ms, margin-top 600ms ease 200ms' }}><div className="flex items-center gap-1.5 text-[10px] text-slate-400"><div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-slate-900" fill="currentColor" /><span className="font-bold text-slate-900">Ny</span></div><span className="text-slate-200">&middot;</span><span>Bergen, Norge</span><span className="text-slate-200">&middot;</span><span>3 rom</span><span className="text-slate-200">&middot;</span><span>~75 m&sup2;</span></div></div>
                      </div>
                      <div style={{ maxHeight: contentPhase >= 4 ? '120px' : '0px', opacity: contentPhase >= 4 ? 1 : 0, overflow: 'hidden', transition: 'max-height 800ms cubic-bezier(0.16,1,0.3,1), opacity 600ms ease' }}><div className="h-px bg-slate-100 mt-2 mb-2" /><div className="text-[10px] text-slate-500 leading-[1.8]">{DESC_WORDS.slice(0, descWords).join(' ')}{!descDone && descStarted && <span className="inline-block w-[2px] h-[11px] bg-violet-500 ml-0.5 animate-[haBlink_0.8s_steps(2)_infinite] align-middle" />}</div>{descDone && (<span className="text-[10px] font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 mt-1 inline-block" style={{ animation: 'haFadeUp 0.3s ease-out' }}>Vis mer</span>)}</div>
                      <div style={{ maxHeight: contentPhase >= 5 ? '120px' : '0px', opacity: contentPhase >= 5 ? 1 : 0, overflow: 'hidden', transition: 'max-height 700ms cubic-bezier(0.16,1,0.3,1), opacity 500ms ease', flexShrink: 0 }}>
                        <div className="h-px bg-slate-100 mt-2 mb-2" /><p className="text-[10px] font-bold text-slate-900 mb-2">Hva dette stedet tilbyr</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">{[{ l: 'Raskt WiFi', d: 'M3.5 10a9 9 0 0 1 13 0M6.5 13a5 5 0 0 1 7 0', dot: true }, { l: 'Smart-TV', d: 'M2 4.5A1.5 1.5 0 0 1 3.5 3h13A1.5 1.5 0 0 1 18 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 13.5v-9zM7 18h6M10 15v3' }, { l: 'Fullt kjøkken', d: 'M3 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2M6 2v16M17 2a4 4 0 0 0-4 4v4a2 2 0 0 0 2 2h2m0 0v6m0-16V2' }, { l: 'Gulvvarme', d: 'M4 18c1.5-2 2-3.5 1-5.5S4 9 5.5 7M10 18c1.5-2 2-3.5 1-5.5S10 9 11.5 7M16 18c1.5-2 2-3.5 1-5.5S16 9 17.5 7' }, { l: 'Solrik balkong', d: 'M10 2v1.5m0 13v1.5m-8-8h1.5m13 0h1.5m-13-5.5 1-1m9 0 1 1m-11 9 1-1m9 0 1 1M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z' }, { l: 'Vaskemaskin', d: 'M3 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3zM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 2v2M13.5 2v2' }].map((a, i) => (<div key={i} className="flex items-center gap-2" style={{ opacity: i < amenityCount ? 1 : 0, transform: i < amenityCount ? 'translateX(0)' : 'translateX(-4px)', transition: `opacity 300ms ease ${i * 70}ms, transform 300ms cubic-bezier(0.16,1,0.3,1) ${i * 70}ms` }}><div className="w-5 h-5 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0"><svg viewBox="0 0 20 20" className="w-[12px] h-[12px] text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={a.d} />{a.dot && <circle cx="10" cy="16.5" r="1" fill="currentColor" stroke="none" />}</svg></div><span className="text-[9px] font-medium text-slate-600">{a.l}</span></div>))}</div>
                      </div>
                      <div className="mt-auto flex-shrink-0" style={{ opacity: amenityCount >= 6 ? 1 : 0, transform: amenityCount >= 6 ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 500ms ease 200ms, transform 500ms cubic-bezier(0.16,1,0.3,1) 200ms' }}><div className="h-px bg-slate-100 mb-2.5" /><div className="flex items-center justify-between"><div><span className="text-[15px] font-extrabold text-slate-900 tracking-tight">kr 1,850</span><span className="text-[10px] text-slate-400 font-medium ml-0.5">/natt</span></div><div className="flex items-center gap-2"><div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-slate-900" fill="currentColor" /><span className="text-[9px] font-bold text-slate-900">Ny</span><span className="text-[9px] text-slate-300 mx-0.5">&middot;</span><span className="text-[9px] text-slate-400 font-medium">5 senger</span></div><div className="h-7 px-4 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-bold flex items-center shadow-md shadow-rose-500/20">Reserver</div></div></div></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* === STEP 6: PUBLISH === */}
            <div className={`absolute inset-0 transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${sid === 'publish' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <div className="h-full flex flex-col">
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${publishPhase === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97] pointer-events-none'}`}>
                  <div className="relative mb-5"><div className="absolute inset-[-12px] rounded-full border border-emerald-200/40" style={{ animation: 'haSpinSlow 5s linear infinite' }}><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-lg shadow-emerald-400/50" /></div><div className="absolute inset-[-22px] rounded-full border border-emerald-100/20" style={{ animation: 'haBreathe 3s ease-in-out infinite' }} /><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center shadow-xl shadow-emerald-500/25 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0" style={{ animation: 'haSheen 3s ease-in-out infinite' }} /><Globe className="w-6 h-6 text-white relative z-10" strokeWidth={1.5} /></div></div>
                  <p className="text-[16px] font-extrabold text-slate-900 tracking-[-0.02em] mb-1">Publiserer annonse</p><p className="text-[11px] text-slate-400 font-medium">Kobler til din PMS</p>
                </div>
                <div className={`flex-1 flex flex-col min-h-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${publishPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                  {/* Phase 1: PMS grid */}
                  <div className={`flex-1 flex flex-col transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${publishPhase === 1 ? 'opacity-100' : publishPhase > 1 ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-0'}`}>
                    <div className="relative rounded-xl overflow-hidden mb-3" style={{ opacity: publishPhase >= 1 ? 1 : 0, transition: 'opacity 700ms ease 200ms' }}>
                      <div className="flex gap-[2px] h-[72px]"><div className="flex-[2] relative overflow-hidden rounded-l-lg"><img src={I1} alt="" className="w-full h-full object-cover" /></div>{[I3, I2, I4].map((s, i) => (<div key={i} className={`flex-1 overflow-hidden ${i === 2 ? 'rounded-r-lg' : ''}`}><img src={s} alt="" className="w-full h-full object-cover" /></div>))}</div>
                      <div className="flex items-center gap-2.5 px-3 py-2 bg-white border-x border-b border-slate-100 rounded-b-xl"><div className="flex-1 min-w-0"><div className="text-[10px] font-bold text-slate-900 truncate">Lys og moderne 3-roms med panoramisk byutsikt</div><div className="text-[8px] text-slate-400 mt-0.5 flex items-center gap-1"><Star className="w-2.5 h-2.5 text-slate-900" fill="currentColor" /><span className="font-semibold text-slate-900">Ny</span><span className="text-slate-200 mx-0.5">&middot;</span>Bergen, Norge<span className="text-slate-200 mx-0.5">&middot;</span>5 senger</div></div><div className="h-6 px-2.5 rounded-md bg-emerald-500 text-white text-[8px] font-bold flex items-center gap-1 shadow-sm shadow-emerald-500/20"><Check className="w-2.5 h-2.5" /> Klar</div></div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Publiser til din PMS</p>
                    <div className="grid grid-cols-3 gap-1.5 flex-1">{[{ name: 'Guesty', c1: '#0052CC', c2: '#2684FF', svg: 'M10 3L4 7v6l6 4 6-4V7l-6-4zM10 13V7M4 7l6 6M16 7l-6 6' }, { name: 'Hostaway', c1: '#E65100', c2: '#FF8A50', svg: 'M10 3v14M10 3l5 5M10 3L5 8M4 11h12M6 14h8' }, { name: 'Lodgify', c1: '#00875A', c2: '#36B37E', svg: 'M4 17l6-6 6 6M4 17V9l6-6 6 6v8M8 17v-4h4v4' }, { name: 'Beds24', c1: '#5243AA', c2: '#8777D9', svg: 'M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z' }, { name: 'Hospitable', c1: '#0082C9', c2: '#4FC3F7', svg: 'M12 7a5 5 0 0 0-5 5M8 7a5 5 0 0 1 5 5M10 17a7 7 0 0 1-7-7M10 17a7 7 0 0 0 7-7' }, { name: 'Smoobu', c1: '#C62828', c2: '#EF5350', svg: 'M3 10c3-4 5 2 7-2s4 4 7 0M3 14c3-4 5 2 7-2s4 4 7 0M3 6c3-4 5 2 7-2s4 4 7 0' }].map((pms, i) => (<div key={i} className="relative flex flex-col items-center justify-center py-2.5 rounded-xl border border-slate-100 bg-white overflow-hidden" style={{ opacity: publishPhase >= 1 ? 1 : 0, transform: publishPhase >= 1 ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.93)', transition: `opacity 500ms ease ${300 + i * 90}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${300 + i * 90}ms` }}><div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 shadow-lg" style={{ background: `linear-gradient(135deg, ${pms.c1}, ${pms.c2})` }}><svg viewBox="0 0 20 20" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={pms.svg} /></svg></div><span className="text-[9px] font-bold text-slate-800">{pms.name}</span></div>))}</div>
                    <div className="mt-2 flex-shrink-0" style={{ opacity: publishPhase >= 1 ? 1 : 0, transition: 'opacity 600ms ease 900ms' }}><div className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 border border-slate-100"><Globe className="w-3 h-3 text-slate-400" /><span className="text-[8px] font-semibold text-slate-400">Støtter 6+ eiendomsforvaltningssystemer</span></div></div>
                  </div>
                  {/* Phase 2: Pushing */}
                  <div className={`flex-1 flex flex-col transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${publishPhase === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm mb-3"><div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm ring-2 ring-violet-200"><img src={I1} alt="" className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><div className="text-[10px] font-bold text-slate-900 truncate">Lys og moderne 3-roms...</div><div className="text-[8px] text-slate-400">Synkroniserer til PMS</div></div><div className="flex flex-col items-end gap-0.5"><span className="text-[12px] font-extrabold text-violet-600 font-mono tabular-nums">{Math.min(pushProgress * 25, 100)}%</span><div className="w-14 h-[3px] rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-[500ms] ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${Math.min(pushProgress * 25, 100)}%` }} /></div></div></div>
                    <div className="space-y-2 flex-1">{[{ label: 'Tittel og beskrivelse', detail: '2 felt synkronisert', icon: 'M4 5h12M4 9h8M4 13h5' }, { label: '5 bilder lastet opp', detail: '2048p forbedret', icon: 'M4 4h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM7 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3 13l3-3 2.5 2.5 4-4L17 13' }, { label: '14 fasiliteter kartlagt', detail: 'PMS-format', icon: 'M9 5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M7 9h6M7 12h4' }, { label: 'Rom og senger konfigurert', detail: '3 rom, 5 senger', icon: 'M3 8h14M3 8v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M5 8V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2' }].map((item, i) => (<div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-[500ms]" style={{ opacity: pushProgress > i ? 1 : 0.3, borderColor: pushProgress > i ? 'rgb(209 250 229)' : 'rgb(241 245 249)', background: pushProgress > i ? 'rgb(240 253 244)' : 'white', transform: pushProgress > i ? 'translateX(0)' : 'translateX(-6px)', transition: `all 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms` }}><div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-[500ms] ${pushProgress > i ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-slate-50 border border-slate-100'}`}>{pushProgress > i ? (<Check className="w-3.5 h-3.5 text-white" />) : (<svg viewBox="0 0 20 20" className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>)}</div><div className="flex-1 min-w-0"><div className="flex items-center justify-between"><span className={`text-[10px] font-semibold transition-colors duration-300 ${pushProgress > i ? 'text-emerald-900' : 'text-slate-400'}`}>{item.label}</span><span className={`text-[8px] font-medium transition-colors duration-300 ${pushProgress > i ? 'text-emerald-500' : 'text-slate-300'}`}>{item.detail}</span></div></div></div>))}</div>
                    <div className="mt-auto pt-2 flex-shrink-0"><div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 text-white"><div className="flex items-center gap-2">{pushProgress < 4 ? (<div className="w-2 h-2 rounded-full bg-amber-400" style={{ animation: 'haDotPulse 1s ease-in-out infinite' }} />) : (<Check className="w-3 h-3 text-emerald-400" />)}<span className="text-[9px] font-semibold">{pushProgress < 4 ? 'Synkroniserer...' : 'Alle data synkronisert'}</span></div><span className="text-[9px] font-semibold text-white/50">Synkroniserer</span></div></div>
                  </div>
                  {/* Phase 3: Success */}
                  <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${publishPhase >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.95] pointer-events-none'}`}>
                    {publishPhase >= 3 && (<div className="absolute inset-0 pointer-events-none overflow-hidden">{[{ x: '15%', y: '20%', c: '#10b981', d: '0s' }, { x: '80%', y: '15%', c: '#8b5cf6', d: '0.1s' }, { x: '25%', y: '75%', c: '#f59e0b', d: '0.2s' }, { x: '70%', y: '70%', c: '#ec4899', d: '0.15s' }, { x: '45%', y: '10%', c: '#06b6d4', d: '0.25s' }, { x: '90%', y: '45%', c: '#10b981', d: '0.3s' }].map((p, i) => (<div key={i} className="absolute w-1.5 h-1.5 rounded-full" style={{ left: p.x, top: p.y, background: p.c, animation: `haConfetti 2s ease-out ${p.d} both` }} />))}</div>)}
                    <div className="relative mb-3" style={{ animation: publishPhase >= 3 ? 'haFadeScale 0.6s ease-out' : 'none' }}><div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"><Check className="w-7 h-7 text-white" strokeWidth={2.5} /></div><div className="absolute inset-[-8px] rounded-full border-2 border-emerald-200/30" style={{ animation: publishPhase >= 3 ? 'haBreathe 2s ease-in-out infinite' : 'none' }} /></div>
                    <div className="text-[17px] font-extrabold text-slate-900 tracking-[-0.02em] mb-0.5" style={{ animation: publishPhase >= 3 ? 'haFadeUp 0.4s ease-out 0.15s both' : 'none' }}>Annonse publisert!</div>
                    <div className="text-[10px] text-slate-400 mb-3" style={{ animation: publishPhase >= 3 ? 'haFadeUp 0.4s ease-out 0.2s both' : 'none' }}>Annonsen din er nå live</div>
                    <div className="w-full rounded-xl overflow-hidden border border-slate-100 shadow-sm mb-3" style={{ animation: publishPhase >= 3 ? 'haFadeUp 0.5s ease-out 0.3s both' : 'none' }}>
                      <div className="flex gap-[1px] h-[52px]"><div className="flex-[2] overflow-hidden"><img src={I1} alt="" className="w-full h-full object-cover" /></div><div className="flex-1 overflow-hidden"><img src={I3} alt="" className="w-full h-full object-cover" /></div><div className="flex-1 overflow-hidden"><img src={I2} alt="" className="w-full h-full object-cover" /></div></div>
                      <div className="px-3 py-2 bg-white flex items-center justify-between"><div className="min-w-0"><div className="text-[9px] font-bold text-slate-900 truncate">Lys og moderne 3-roms</div><div className="text-[7px] text-slate-400 flex items-center gap-1 mt-0.5"><Star className="w-2 h-2 text-slate-800" fill="currentColor" /><span className="font-semibold text-slate-800">Ny</span><span className="text-slate-200">&middot;</span>Bergen</div></div><div className="flex items-center gap-1.5">{[{ v: '5', l: 'bilde' }, { v: '14', l: 'fas.' }, { v: '3', l: 'rom' }].map((s, i) => (<div key={i} className="text-center px-1.5 py-1 rounded-md bg-slate-50"><div className="text-[10px] font-extrabold text-slate-900 leading-none">{s.v}</div><div className="text-[6px] font-medium text-slate-400 uppercase">{s.l}</div></div>))}</div></div>
                    </div>
                    <div className="flex items-center gap-2 w-full" style={{ animation: publishPhase >= 3 ? 'haFadeUp 0.4s ease-out 0.45s both' : 'none' }}>
                      <div className="flex-1 h-9 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/15"><Globe className="w-3.5 h-3.5" /> Se annonse</div>
                      <div className="flex-1 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm"><Plus className="w-3.5 h-3.5" /> Ny annonse</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes haGlassEntry { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes haGlassGlow { from{opacity:0} to{opacity:1} }
        @keyframes haProgressPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes haBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes haFadeScale { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        @keyframes haFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes haCascadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes haShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes haBtnShimmer { 0%,100%{background-position:-200% 0} 50%{background-position:200% 0} }
        @keyframes haTouchRippleBtn { from{opacity:0.3;transform:scale(0.95)} to{opacity:0;transform:scale(1.15)} }
        @keyframes haMarkerPop { from{opacity:0;transform:scale(0.3) translateY(4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes haMarkerFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes haPinPop { from{opacity:0;transform:scale(0) translate(-50%,-50%)} to{opacity:1;transform:scale(1) translate(-50%,-50%)} }
        @keyframes haPinHover { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        @keyframes haPinGlow { 0%,100%{transform:scale(1);opacity:0.25} 50%{transform:scale(1.4);opacity:0.08} }
        @keyframes haRipple { from{transform:translate(-50%,-50%) scale(1);opacity:0.6} to{transform:translate(-50%,-50%) scale(3);opacity:0} }
        @keyframes haAddressCardIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes haWaterShimmer { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes haSpinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes haBreathe { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.12);opacity:0.15} }
        @keyframes haScanLine2 { 0%{top:-2px} 50%{top:100%} 100%{top:-2px} }
        @keyframes haScanBeam { 0%{left:0%} 50%{left:95%} 100%{left:0%} }
        @keyframes haSheen { 0%,100%{transform:translateX(-150%) rotate(25deg)} 50%{transform:translateX(150%) rotate(25deg)} }
        @keyframes haPipelineFill { from{width:0%} to{width:100%} }
        @keyframes haSparkle { 0%{opacity:0;transform:scale(0)} 15%{opacity:1;transform:scale(1.8)} 40%{opacity:0.6;transform:scale(1)} 100%{opacity:0;transform:scale(0.5) translateY(-12px)} }
        @keyframes haDotPulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
        @keyframes haConfetti { 0%{opacity:0;transform:scale(0) translateY(0)} 15%{opacity:1;transform:scale(1.5) translateY(-8px)} 40%{opacity:0.8;transform:scale(1) translateY(-20px)} 100%{opacity:0;transform:scale(0.5) translateY(-40px) rotate(180deg)} }
        @keyframes haCTAPulse { 0%{box-shadow:0 0 0 0 rgba(10,10,10,0.12)} 70%{box-shadow:0 0 0 10px rgba(10,10,10,0)} 100%{box-shadow:0 0 0 0 rgba(10,10,10,0)} }
        @keyframes haTouchRippleBtn { from{opacity:0.3;transform:scale(0.95)} to{opacity:0;transform:scale(1.15)} }
      `}</style>
    </div>
  );
}
