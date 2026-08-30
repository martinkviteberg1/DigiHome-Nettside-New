'use client';

/* ═══════════ ADRESSEKART — onboarding-panelet ═══════════
   Portet 1:1 fra korttid-flytens AddressMap (referanseprosjektet), i DigiHome
   ink-utgave:
   · Dempet, varm kartflate (samme styles-palett som korttid): ivory flater,
     hvite veier, mykt vann — og ALLE POI-er/ikoner/kollektiv skjult.
     (Legacy styles krever raster-kart uten mapId — derfor OverlayView-nål.)
   · Nålen er stjernen: ink-sirkel m/ hvitt hus, doble pulsringer (forskjøvet),
     «stett» + skygge, og «Din bolig»-chip — som korttid, i vår merkevare.
   · Myk fly-inn beholdt: rAF-interpolert senter+zoom (fractional zoom aktivert).
   · Lastes LAZY — ingen Maps JS før første gyldige posisjon.
   · onKlar() når flisene er tegnet → forelderen kryssfader foto→kart. */

import React, { useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

type Pos = { lat: number; lng: number };

let loaderKonfigurert = false;

/* Korttid-flytens dempete palett — verbatim fra referanseprosjektet */
const KART_STIL = [
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

function gyldig(p: any): Pos | null {
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null;
}

/* Raster-trygg «flytur»: panTo animeres mykt av kartet selv, og zoom tas i
   HELE trinn (fraksjonell zoom gir manglende fliser på styled raster-kart).
   Hvert setZoom-trinn animeres av Google (~300 ms) → trappet, filmatisk innflyging. */
function flyTil(map: any, mål: Pos, målZoom = 16) {
  try { map.panTo(mål); } catch { map.setCenter(mål); }
  const fraZoom = Math.round(Number(map.getZoom() ?? 13));
  const trinn: number[] = [];
  for (let z = fraZoom + 1; z <= målZoom; z += 1) trinn.push(z);
  if (!trinn.length && fraZoom !== målZoom) trinn.push(målZoom);
  trinn.forEach((z, i) => setTimeout(() => { try { map.setZoom(z); } catch {} }, 420 + i * 450));
}

/* Korttid-nålen i DigiHome ink: sirkel m/ hus, doble pulsringer, stett og chip */
function nålHtml(): string {
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;animation:dhNålInn .55s cubic-bezier(0.22,1,0.36,1) both">
    <div style="position:relative">
      <div style="position:absolute;inset:-12px;border-radius:50%;background:rgba(10,10,10,0.10);animation:dhNålRing 2.5s ease-out infinite"></div>
      <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(10,10,10,0.06);animation:dhNålRing 2.5s ease-out 0.8s infinite"></div>
      <div style="width:52px;height:52px;border-radius:50%;background:#0a0a0a;border:4px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(10,10,10,0.28),0 2px 8px rgba(0,0,0,0.08)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
    </div>
    <div style="width:2px;height:10px;background:rgba(10,10,10,0.20);border-radius:1px"></div>
    <div style="width:8px;height:4px;border-radius:50%;background:rgba(10,10,10,0.10)"></div>
    <div style="margin-top:4px;background:#fff;padding:3px 10px;border-radius:20px;box-shadow:0 2px 12px rgba(0,0,0,0.10);white-space:nowrap">
      <span style="font-size:11px;font-weight:600;color:#1a1a1a;font-family:var(--font-body),-apple-system,sans-serif">Din bolig</span>
    </div>
  </div>`;
}

export default function AdresseKart({ pos, adresse, onKlar }: { pos: Pos | null; adresse?: string; onKlar?: () => void }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const klarMeldt = useRef(false);
  const p = gyldig(pos);

  // Init — kun ved første gyldige posisjon
  useEffect(() => {
    if (!p || mapRef.current || !nodeRef.current) return;
    let avbrutt = false;
    (async () => {
      try {
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
        if (!key) return; // ingen nøkkel → panelet beholder foto, stille
        if (!loaderKonfigurert) {
          setOptions({ key, v: 'weekly' });
          loaderKonfigurert = true;
        }
        const { Map, OverlayView } = (await importLibrary('maps')) as any;
        if (avbrutt || !nodeRef.current) return;

        const map = new Map(nodeRef.current, {
          center: p,
          zoom: 13, // starter over byen → trappes inn til 16
          styles: KART_STIL,          // legacy raster-styling (korttid-paletten)
          disableDefaultUI: true,
          zoomControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          clickableIcons: false,
          keyboardShortcuts: false,
          gestureHandling: 'greedy',
        });

        /* Nål via OverlayView (samme teknikk som korttid) — full HTML-frihet */
        class NålOverlay extends OverlayView {
          posisjon: any; div: HTMLDivElement | null = null;
          constructor(posisjon: any) { super(); this.posisjon = posisjon; this.setMap(map); }
          onAdd() {
            this.div = document.createElement('div');
            this.div.style.cssText = 'position:absolute;transform:translate(-50%,-100%);pointer-events:none';
            this.div.innerHTML = nålHtml();
            (this as any).getPanes().overlayMouseTarget.appendChild(this.div);
          }
          draw() {
            const pt = (this as any).getProjection()?.fromLatLngToDivPixel(this.posisjon);
            if (pt && this.div) { this.div.style.left = pt.x + 'px'; this.div.style.top = pt.y + 'px'; }
          }
          onRemove() { this.div?.parentNode?.removeChild(this.div); this.div = null; }
          flytt(ny: any) { this.posisjon = ny; this.draw(); }
        }
        overlayRef.current = new NålOverlay(p);
        mapRef.current = map;

        // Meld «klar» når flisene er tegnet → forelderen kryssfader foto→kart
        map.addListener('tilesloaded', () => {
          if (!klarMeldt.current) {
            klarMeldt.current = true;
            onKlar?.();
            setTimeout(() => flyTil(map, p!), 350); // liten pust før flyturen
          }
        });
      } catch (e) {
        console.error('AdresseKart:', e); // stille — panelet beholder foto
      }
    })();
    return () => { avbrutt = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.lat, p?.lng]);

  // Posisjonsendring (bruker valgte ny adresse) → flytt nål + fly dit
  useEffect(() => {
    if (!p || !mapRef.current || !overlayRef.current || !klarMeldt.current) return;
    overlayRef.current.flytt(p);
    flyTil(mapRef.current, p, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.lat, p?.lng]);

  return (
    <div className="absolute inset-0 h-full w-full" data-testid="onboarding-kart">
      <style>{`
        @keyframes dhNålRing { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes dhNålInn { 0% { opacity: 0; transform: translateY(-14px) scale(0.7); } 60% { transform: translateY(2px) scale(1.04); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div ref={nodeRef} className="h-full w-full" />
    </div>
  );
}
