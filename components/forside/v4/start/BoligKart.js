'use client';

import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { EASE, T, useRedusert } from '../motion';

/* ---------------------------------------------------------------------------
   BoligKart — kartet i onboardingens høyrepanel. «Kartet våkner.»

   · Montert fra sekund én: Bergen i V4-palett, langsom drift (kun transform).
   · Toner inn når flisene er tegnet — aldri et halvtegnet kart.
   · Én markør — lilla punkt med offwhite ring — som GLIR til neste posisjon.
     Kameraet flyr i samme rAF-loop (moveCamera, fraksjonell zoom): Mercator-
     interpolert senter, zoomkurve som dipper på vei og lander mykt. Ingen
     pan/zoom-trinn fra Googles egen animasjon — de hakker.
   · `onLandet` fyres når dykket er ferdig — panelet bruker det til å time
     morphen til Street View.
   · Ikke-interaktivt. Kartet er en scene, ikke et verktøy.
   · prefers-reduced-motion → rett på plass, ingen drift.
--------------------------------------------------------------------------- */

const BERGEN = { lat: 60.3925, lng: 5.3245 };
const START_ZOOM = 14;
let konfigurert = false;

const STIL = [
  { elementType: 'geometry', stylers: [{ color: '#ECE9E1' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7C776E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F3F1EC' }, { weight: 3 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ visibility: 'on' }, { color: '#DCE2D1' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#CBD5DA' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#8C989E' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#F9F7F2' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E1DDD3' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8B867D' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#F2ECDE' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#E1D9C7' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#E7E3DA' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#DDD8CD' }] },
  { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#E6E6DB' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#D8D3C8' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#8B867D' }] },
];

/* Markøren: myk puls (transform/opacity) + lilla punkt med offwhite ring. */
const MARKOR_HTML = `
<div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center">
  <div style="position:absolute;inset:0;border-radius:50%;background:rgba(21,19,15,0.10);animation:dhKartPuls 2.6s ${EASE} infinite"></div>
  <div style="position:absolute;inset:12px;border-radius:50%;background:rgba(212,150,255,0.28)"></div>
  <div style="width:18px;height:18px;border-radius:50%;background:${T.lilla};border:3px solid ${T.offwhite};box-shadow:0 6px 16px -6px rgba(21,19,15,0.55)"></div>
</div>`;

const gyldig = (p) => {
  const lat = Number(p?.lat); const lng = Number(p?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

const utExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const innUt = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const unmerc = (y) => (Math.atan(Math.exp(y)) * 360) / Math.PI - 90;
const klem = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function BoligKart({ mal, zoom = 15, onKlar, onLandet }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const coreRef = useRef(null);
  const markorRef = useRef(null);
  const klasseRef = useRef(null);
  const timerRef = useRef([]);
  const rafRef = useRef(0);
  const [klar, setKlar] = useState(false);
  const redusert = useRedusert();
  const p = gyldig(mal);

  const nullstillTimere = () => { timerRef.current.forEach((t) => window.clearTimeout(t)); timerRef.current = []; };

  /* Init — én gang. Bergen, START_ZOOM. */
  useEffect(() => {
    if (mapRef.current || !nodeRef.current) return undefined;
    let avbrutt = false;
    (async () => {
      try {
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
        if (!key) return;
        if (!konfigurert) { setOptions({ key, v: 'weekly' }); konfigurert = true; }
        const [lib, core] = await Promise.all([importLibrary('maps'), importLibrary('core')]);
        if (avbrutt || !nodeRef.current) return;
        coreRef.current = core;
        const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '';
        const map = new lib.Map(nodeRef.current, {
          center: BERGEN,
          zoom: START_ZOOM,
          /* Med Map ID (vektorkart, stil satt i Cloud Console) blir zoom/labels helt silkemyke.
             Uten: raster + vår JSON-stil — samme palett, men fliser lastes underveis. */
          ...(mapId ? { mapId } : { styles: STIL }),
          disableDefaultUI: true,
          clickableIcons: false,
          keyboardShortcuts: false,
          gestureHandling: 'none',
          isFractionalZoomEnabled: true,   // kontinuerlig kamera (moveCamera per frame) krever halve nivåer
          backgroundColor: '#ECE9E1',
        });
        mapRef.current = map;

        /* Markør som overlay — posisjonen kan animeres uavhengig av kartets kamera. */
        class Markor extends lib.OverlayView {
          constructor(pos) { super(); this.pos = pos; this.div = null; this.setMap(map); }
          onAdd() {
            this.div = document.createElement('div');
            this.div.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:none;will-change:left,top';
            this.div.innerHTML = MARKOR_HTML;
            this.getPanes().overlayMouseTarget.appendChild(this.div);
          }
          draw() {
            const proj = this.getProjection(); if (!proj || !this.div) return;
            const pt = proj.fromLatLngToDivPixel(new core.LatLng(this.pos.lat, this.pos.lng));
            if (pt) { this.div.style.left = `${pt.x}px`; this.div.style.top = `${pt.y}px`; }
          }
          onRemove() { if (this.div?.parentNode) this.div.parentNode.removeChild(this.div); this.div = null; }
          settPos(pos) { this.pos = pos; this.draw(); }
        }
        klasseRef.current = Markor;
        const ferdig = () => { if (!avbrutt) { setKlar(true); if (onKlar) onKlar(); } };
        core.event.addListenerOnce(map, 'tilesloaded', ferdig);
        core.event.addListenerOnce(map, 'idle', ferdig);
      } catch (e) { /* kartet er forsterkning, ikke krav */ }
    })();
    return () => { avbrutt = true; nullstillTimere(); if (rafRef.current) window.cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Nytt mål → én kontinuerlig flytur (rAF, moveCamera per frame). Senter interpoleres i Mercator,
     zoomen følger en kurve som dipper på vei (lengre tur → dypere dipp), nålen glir i samme loop.
     Avbrytes et nytt mål midt i, fortsetter vi sømløst fra der kameraet er. Venter på klart kart. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !p || !klar) return undefined;
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    nullstillTimere();
    try {
      const Markor = klasseRef.current;
      const landet = () => { if (onLandet) onLandet(); };
      if (!markorRef.current && Markor) markorRef.current = new Markor(p);   // første nål: lander der den skal
      if (redusert) { markorRef.current?.settPos(p); map.moveCamera({ center: p, zoom }); landet(); return undefined; }

      const c = map.getCenter();
      const fra = c ? { lat: c.lat(), lng: c.lng() } : BERGEN;
      const z0 = typeof map.getZoom() === 'number' ? map.getZoom() : START_ZOOM;
      const z1 = zoom;
      const W = nodeRef.current?.clientWidth || 600;
      /* Avstand i skjermpiksler ved z0 → hvor mye må vi ut for at begge punkter får plass (~55 % av bredden). */
      const skala = (256 * Math.pow(2, z0)) / (2 * Math.PI);
      const dx = (((p.lng - fra.lng) * Math.PI) / 180) * skala;
      const dy = (merc(p.lat) - merc(fra.lat)) * skala;
      const dPx = Math.hypot(dx, dy);
      const zFit = dPx > W * 0.55 ? z0 - Math.log2(dPx / (W * 0.55)) : Math.min(z0, z1);
      const dipp = Math.max(0, Math.min(z0, z1) - Math.max(3, zFit));
      const varighet = klem(1000 + (dPx / W) * 220 + dipp * 240 + Math.abs(z1 - z0) * 120, 1000, 2800);
      const mFra = { x: fra.lng, y: merc(fra.lat) }; const mTil = { x: p.lng, y: merc(p.lat) };
      const nFra = markorRef.current?.pos ? { ...markorRef.current.pos } : { ...p };
      const start = performance.now();
      const steg = (now) => {
        const t = Math.min(1, (now - start) / varighet);
        const e = innUt(t);
        const senter = { lat: unmerc(mFra.y + (mTil.y - mFra.y) * e), lng: mFra.x + (mTil.x - mFra.x) * e };
        const z = z0 + (z1 - z0) * e - dipp * Math.sin(Math.PI * t);
        const tn = utExpo(Math.min(1, t * 1.25)); // nålen er fremme litt før kameraet roer seg
        try {
          markorRef.current?.settPos({ lat: nFra.lat + (p.lat - nFra.lat) * tn, lng: nFra.lng + (p.lng - nFra.lng) * tn });
          map.moveCamera({ center: senter, zoom: z });
        } catch (e2) { /* ok */ }
        if (t < 1) rafRef.current = window.requestAnimationFrame(steg);
        else { rafRef.current = 0; landet(); }
      };
      rafRef.current = window.requestAnimationFrame(steg);
    } catch (e) { /* kartet skal aldri velte flyten */ }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.lat, p?.lng, zoom, klar]);

  /* Drift i tom-tilstand: én langsom transform (60 s) — ingen fliser lastes, ingen reflow. */
  const drift = klar && !p && !redusert;

  return (
    <div className="pointer-events-none relative h-full w-full overflow-hidden" style={{ background: '#ECE9E1' }} data-testid="start-boligkart">
      <div
        className="h-full w-full will-change-transform"
        style={{
          opacity: klar ? 1 : 0,
          transform: drift ? 'scale(1.09) translate(-1.6%, 1.1%)' : 'scale(1) translate(0, 0)',
          transformOrigin: '50% 50%',
          transition: `opacity 1100ms ${EASE}, transform ${drift ? '60s linear' : `1400ms ${EASE}`}`,
        }}
      >
        <div ref={nodeRef} className="h-full w-full" />
      </div>
      <style>{`@keyframes dhKartPuls { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(1.35); opacity: 0; } }`}</style>
    </div>
  );
}
