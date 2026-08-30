'use client';

/* ═══════════ ADRESSEKART — nøyaktig port av korttid-flyten ═══════════
   Portet 1:1 fra referanseprosjektets PublicListingWizard (AddressMap + tomtilstand):
   · Kartet er ALLTID montert. Uten adresse: uskarpt Bergen-kart
     (blur 8px + saturate 0.6 + scale 1.1) med flytende lilla husnål,
     pulserende ringer og «Plasser boligen på kartet».
   · Ved adressevalg: setCenter + 1500 ms blur→skarp/scale-avsløring
     (samme cubic-bezier), og korttid-nålen (48px mørk sirkel m/ hus,
     pulsring, stett og skygge) slippes på adressen.
   · Samme dempete kartpalett som korttid: varm ivory, grønne parker,
     mykt vann, oransje hovedveier, POI-støy av.
   · gestureHandling 'cooperative' — interaktiv, men stjeler ikke scroll. */

import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Home } from 'lucide-react';

type Pos = { lat: number; lng: number };

const BERGEN: Pos = { lat: 60.3913, lng: 5.3221 };

let loaderKonfigurert = false;

/* Korttid-palett — verbatim fra referanseprosjektet */
const KART_STIL = [
  { elementType: 'geometry', stylers: [{ color: '#f5f3f0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#d6e8c8' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c4dff0' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#8aafcc' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffd080' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#f0c060' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#e0ddd8' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#eeebe6' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#edeae5' }] },
  { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#e8eee2' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#999999' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#888' }] },
];

/* Korttid-nålen — verbatim HTML fra referansens PinOverlay */
const NÅL_HTML = `<div style="position:relative;display:flex;flex-direction:column;align-items:center"><div style="position:relative"><div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(0,0,0,0.06);animation:plw-pin-ring 3s ease-out infinite"></div><div style="width:48px;height:48px;border-radius:50%;background:#222;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.20),0 2px 6px rgba(0,0,0,0.10)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div></div><div style="width:2px;height:8px;background:rgba(0,0,0,0.12);border-radius:1px"></div><div style="width:6px;height:3px;border-radius:50%;background:rgba(0,0,0,0.08)"></div></div>`;

function gyldig(p: any): Pos | null {
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null;
}

export default function AdresseKart({ pos, tekst, adresse }: { pos: Pos | null; tekst?: string; adresse?: string }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const libRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const [klar, setKlar] = useState(false);
  const p = gyldig(pos);
  const harPos = Boolean(p);
  // Kartet våkner (blur→skarpt) idet brukeren begynner å skrive — som korttid
  const aktiv = harPos || Boolean((tekst || '').trim());

  /* Slipp/flytt korttid-nålen på et punkt */
  const settNål = (posisjon: any) => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    if (overlayRef.current) { overlayRef.current.setMap(null); overlayRef.current = null; }
    const { OverlayView } = lib;
    class NålOverlay extends OverlayView {
      posisjon: any; div: HTMLDivElement | null = null;
      constructor(pt: any) { super(); this.posisjon = pt; this.setMap(map); }
      onAdd() {
        this.div = document.createElement('div');
        this.div.style.cssText = 'position:absolute;transform:translate(-50%,-100%);pointer-events:none';
        this.div.innerHTML = NÅL_HTML;
        (this as any).getPanes().overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        const pt = (this as any).getProjection()?.fromLatLngToDivPixel(this.posisjon);
        if (pt && this.div) { this.div.style.left = pt.x + 'px'; this.div.style.top = pt.y + 'px'; }
      }
      onRemove() { this.div?.parentNode?.removeChild(this.div); this.div = null; }
    }
    overlayRef.current = new NålOverlay(posisjon);
  };

  // Kartet monteres UMIDDELBART — det uskarpe Bergen-kartet ER tomtilstanden
  useEffect(() => {
    if (mapRef.current || !nodeRef.current) return;
    let avbrutt = false;
    (async () => {
      try {
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
        if (!key) return;
        if (!loaderKonfigurert) {
          setOptions({ key, v: 'weekly' });
          loaderKonfigurert = true;
        }
        const lib = (await importLibrary('maps')) as any;
        const geo = (await importLibrary('geocoding')) as any;
        if (avbrutt || !nodeRef.current) return;
        libRef.current = lib;
        geocoderRef.current = new geo.Geocoder();
        mapRef.current = new lib.Map(nodeRef.current, {
          center: p || BERGEN,
          zoom: 15,
          styles: KART_STIL,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        });
        setKlar(true);
      } catch (e) {
        console.error('AdresseKart:', e);
      }
    })();
    return () => { avbrutt = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adressevalg → sentrer + slipp nålen (avsløringen skjer via blur→skarp-transitionen)
  useEffect(() => {
    if (!p || !klar || !mapRef.current) return;
    mapRef.current.setCenter(p);
    settNål(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.lat, p?.lng, klar]);

  /* Geokoding MENS man skriver (som korttid): kartet panorerer levende etter
     teksten og nålen følger med — valgt posisjon (p) har alltid forrang. */
  useEffect(() => {
    if (!klar || p) return;
    const t = (tekst || '').trim();
    if (t.length < 3 || !geocoderRef.current) return;
    const id = setTimeout(() => {
      try {
        geocoderRef.current.geocode({ address: `${t}, Norge` }, (results: any, status: any) => {
          if (status !== 'OK' || !results?.[0] || !mapRef.current) return;
          const loc = results[0].geometry.location;
          mapRef.current.setCenter(loc); // panTo hakker ved raske tastetrykk — setCenter under pågående blur er roligere
          settNål(loc);
        });
      } catch { /* stille */ }
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tekst, klar, p?.lat, p?.lng]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f5f3f0]" data-testid="onboarding-kart">
      {/* Kartlaget — uskarpt i ro, våkner (skarpt) idet man skriver — korttids eksakte transition */}
      <div
        className="absolute inset-0 transition-all duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          filter: aktiv ? 'blur(0px)' : 'blur(8px) saturate(0.6) brightness(1.05)',
          transform: aktiv ? 'scale(1)' : 'scale(1.1)',
        }}
      >
        <div ref={nodeRef} className="h-full w-full" />
      </div>

      {/* Premium-overlegg i tomtilstand — verbatim fra korttid */}
      {!aktiv && (
        <div className="pointer-events-none absolute inset-0 z-10" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(253,252,251,0.15) 0%, rgba(245,243,240,0.5) 100%)' }} data-testid="kart-tomtilstand">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 -m-12 rounded-full border border-[#0a0a0a]/[0.04]" style={{ animation: 'plwRing 4s ease-out infinite' }} />
              <div className="absolute inset-0 -m-6 rounded-full border border-[#0a0a0a]/[0.06]" style={{ animation: 'plwRing 4s ease-out 1s infinite' }} />
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white shadow-[0_8px_32px_rgba(124,58,237,0.20)]" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', animation: 'plwFloat 6s ease-in-out infinite' }}>
                <Home className="h-6 w-6 text-white" strokeWidth={1.8} />
              </div>
            </div>
            <p className="mb-1.5 text-[15px] font-semibold text-[#555]">Plasser boligen på kartet</p>
            <p className="rounded-full bg-white/60 px-4 py-1.5 text-[13px] text-[#999] backdrop-blur-sm">Skriv inn adresse til venstre</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes plwRing { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes plwFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes plw-pin-ring { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.5); opacity: 0; } }
      `}</style>
    </div>
  );
}
