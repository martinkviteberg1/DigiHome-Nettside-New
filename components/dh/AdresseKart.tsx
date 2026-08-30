'use client';

/* ═══════════ ADRESSEKART — onboarding-panelet ═══════════
   Fullt interaktivt Google-kart (som korttid-flyten): dra, zoom, gestikk.
   · Lastes LAZY — ingen Maps JS-nedlasting før første gyldige posisjon,
     så steg 1 forblir lynrask på førstelasting.
   · Filmatisk fly-inn: kamera starter over byen og glir ned på nålen
     (rAF-interpolert moveCamera — vektorkart gir myk fraksjonell zoom).
   · Egen DigiHome-nål (AdvancedMarkerElement m/ HTML-innhold).
   · onKlar() varsler forelderen når kartet faktisk er tegnet, slik at
     foto→kart-kryssfaden aldri viser et halvlastet kart. */

import React, { useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

type Pos = { lat: number; lng: number };

let loaderKonfigurert = false;

function gyldig(p: any): Pos | null {
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null;
}

/* Interpolerer senter + zoom i én bevegelse — den «filmatiske flyturen». */
function flyTil(map: any, mål: Pos, målZoom = 16.5, varighet = 1600) {
  const fraSenter = map.getCenter()?.toJSON() || mål;
  const fraZoom = Number(map.getZoom() ?? 11);
  const start = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function steg(nå: number) {
    const t = Math.min(1, (nå - start) / varighet);
    const e = ease(t);
    map.moveCamera({
      center: { lat: fraSenter.lat + (mål.lat - fraSenter.lat) * e, lng: fraSenter.lng + (mål.lng - fraSenter.lng) * e },
      zoom: fraZoom + (målZoom - fraZoom) * e,
    });
    if (t < 1) requestAnimationFrame(steg);
  }
  requestAnimationFrame(steg);
}

function lagNål(tittel: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-label', tittel || 'Valgt adresse');
  el.innerHTML = `
    <style>
      @keyframes dhNålInn { 0% { opacity: 0; transform: translateY(-14px) scale(0.6); } 60% { transform: translateY(2px) scale(1.05); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes dhPuls { 0% { transform: scale(0.6); opacity: 0.45; } 100% { transform: scale(1.9); opacity: 0; } }
    </style>
    <div style="position:relative;width:52px;height:52px;animation:dhNålInn .6s cubic-bezier(0.22,1,0.36,1) both">
      <div style="position:absolute;inset:0;border-radius:9999px;background:#0a0a0a;animation:dhPuls 2.4s ease-out infinite"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#0a0a0a;border:3px solid #fff;box-shadow:0 10px 26px -8px rgba(10,10,10,.55)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 11.2 12 4l9 7.2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5.5 9.8V19a1 1 0 0 0 1 1H10v-5.4h4V20h3.5a1 1 0 0 0 1-1V9.8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>`;
  return el;
}

export default function AdresseKart({ pos, adresse, onKlar }: { pos: Pos | null; adresse?: string; onKlar?: () => void }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
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
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          importLibrary('maps') as Promise<any>,
          importLibrary('marker') as Promise<any>,
        ]);
        if (avbrutt || !nodeRef.current) return;

        const map = new Map(nodeRef.current, {
          center: p,
          zoom: 11, // starter over byen → flyr inn
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
          gestureHandling: 'greedy',
          zoomControl: true,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          clickableIcons: false,
          keyboardShortcuts: false,
        });
        markerRef.current = new AdvancedMarkerElement({ map, position: p, title: adresse || 'Valgt adresse', content: lagNål(adresse || '') });
        mapRef.current = map;

        // Meld «klar» når flisene faktisk er tegnet → forelderen kryssfader foto→kart
        map.addListener('tilesloaded', () => {
          if (!klarMeldt.current) {
            klarMeldt.current = true;
            onKlar?.();
            setTimeout(() => flyTil(map, p!), 350); // liten pust før flyturen
          }
        });
      } catch (e) {
        // Stille feil: panelet beholder foto — kartet er forsterkning, ikke krav
        console.error('AdresseKart:', e);
      }
    })();
    return () => { avbrutt = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.lat, p?.lng]);

  // Posisjonsendring (bruker valgte ny adresse) → flytt nål + fly dit
  useEffect(() => {
    if (!p || !mapRef.current || !markerRef.current || !klarMeldt.current) return;
    markerRef.current.position = p;
    if (adresse) markerRef.current.title = adresse;
    flyTil(mapRef.current, p, 16.5, 1100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.lat, p?.lng]);

  return <div ref={nodeRef} className="absolute inset-0 h-full w-full" data-testid="onboarding-kart" />;
}
