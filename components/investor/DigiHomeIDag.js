'use client';

/* ---------------------------------------------------------------------------
   DigiHomeIDag — «Ikke en plan på papir. Et system i drift i dag.»

   Rett etter Løsningen: ett rolig bevis-øyeblikk. En tro gjengivelse av det
   ekte systemet (leieforhold-skjerm på desktop + app på mobil) ved siden av
   LIVE nøkkeltall hentet fra driftsportalen via /api/admin/leieforhold.

   Tallene er ekte og aggregerte (antall, belegg, leieverdi, huseiere) — ingen
   leietakernavn eller adresser lekkes; radene i mock-skjermen er representative.
   Uten adminKey (delt lenke via token) faller vi tilbake til enheterIDag fra
   planen og viser mock-skjermene + konseptet, uten de live-detaljene.

   Motion arves fra .deck-side (deck-inn / deck-stolpe) og respekterer
   prefers-reduced-motion (håndteres globalt i DeckKonsept).
--------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Users, TrendingUp, Wallet, Home, LayoutGrid, Bell, ChevronRight } from 'lucide-react';
import { T, display, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';

const LILLA = '#8B5CF6';
const LILLA_M = '#7A3FA8';
const GRONN = '#1F9D55';
const GUL = '#B8860B';
const LYS_HAIR = 'rgba(21,19,15,0.08)';

const nb = (n, d = 0) => (Number(n) || 0).toLocaleString('nb-NO', { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/\u00A0/g, ' ');

/* Tall som teller opp når slaget blir aktivt (expo-out). */
function useTween(target, aktiv, ms = 1050) {
  const [v, setV] = useState(0);
  const fra = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    const maal = aktiv ? (Number(target) || 0) : 0;
    const start = performance.now();
    const startV = fra.current;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { fra.current = maal; setV(maal); return undefined; }
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(2, -10 * t);
      const cur = startV + (maal - startV) * (t >= 1 ? 1 : e);
      fra.current = cur; setV(cur);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, aktiv, ms]);
  return v;
}

/* Ett stort nøkkeltall i rail-en. */
function KPI({ i, ikon: Ikon, label, verdi, suffix, aktiv, farge = T.ink, klar = true }) {
  const v = useTween(verdi, aktiv && klar);
  return (
    <div className="deck-inn border-t pt-3.5" data-strek="1" style={{ '--i': i, '--strek': HAIR, borderColor: HAIR }}>
      <p className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: SVAK }}>
        {Ikon ? <Ikon className="h-3.5 w-3.5" style={{ color: LILLA_M }} strokeWidth={2} /> : null}{label}
      </p>
      <p className="mt-1.5 whitespace-nowrap tabular-nums text-[25px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: farge }}>
        {klar ? nb(v) : '—'}{suffix ? <span className="ml-1 text-[0.46em]" style={{ opacity: 0.55, letterSpacing: 0 }}>{suffix}</span> : null}
      </p>
    </div>
  );
}

const STATUS = {
  leased: { l: 'Utleid', f: GRONN },
  future: { l: 'Fremtidig', f: LILLA_M },
  signing: { l: 'Signering', f: GUL },
  vacant: { l: 'Ledig', f: 'rgba(21,19,15,0.4)' },
};

/* Desktop-mock: leieforhold-skjermen i en rolig nettleserramme. Representative
   rader (ingen ekte leietakere), men KPI-stripen bruker de LIVE tallene. */
function DesktopMock({ t, aktiv }) {
  const rader = [
    { s: 'leased', adr: 'Nygårdsgaten 5', type: 'Leilighet · 62 m²', leie: '14 500' },
    { s: 'leased', adr: 'Olav Kyrres gate 22', type: 'Hybel · 28 m²', leie: '9 200' },
    { s: 'future', adr: 'Fjøsangerveien 3', type: 'Leilighet · 74 m²', leie: '17 000' },
    { s: 'signing', adr: 'Kong Oscars gate 9', type: 'Leilighet · 55 m²', leie: '13 000' },
    { s: 'vacant', adr: 'Møllendalsveien 17', type: 'Rom i bofellesskap', leie: '—' },
  ];
  const count = t?.count || 36;
  const belegg = t?.occupancy_pct != null ? t.occupancy_pct : 50;
  const leieverdi = t?.actual_rent || 385800;
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: '#fff', boxShadow: '0 40px 80px -40px rgba(21,19,15,0.45), 0 2px 8px -2px rgba(21,19,15,0.12), inset 0 0 0 1px rgba(21,19,15,0.06)' }}>
      {/* nettleser-chrome */}
      <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ background: '#F3F1EC', borderBottom: `1px solid ${LYS_HAIR}` }}>
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#E06C5E' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#E3B341' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#5BB973' }} />
        </span>
        <span className="ml-2 flex-1 truncate rounded-md px-3 py-1 text-[11px]" style={{ background: '#fff', color: SVAK, boxShadow: `inset 0 0 0 1px ${LYS_HAIR}` }}>portal.digihome.no/leieforhold</span>
      </div>
      {/* skjerm */}
      <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr]">
        {/* sidebar */}
        <div className="hidden flex-col gap-0.5 p-3 sm:flex" style={{ borderRight: `1px solid ${LYS_HAIR}`, background: '#FBFAF7' }}>
          <div className="mb-2 flex items-center gap-1.5 px-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-[6px]" style={{ background: T.ink }}><Home className="h-3 w-3" style={{ color: '#fff' }} strokeWidth={2.4} /></span>
            <span className="text-[12px] font-semibold" style={{ color: T.ink }}>DigiHome</span>
          </div>
          {[['Oversikt', false], ['Leieforhold', true], ['Økonomi', false], ['Huseiere', false], ['Kontrakter', false]].map(([l, on]) => (
            <span key={l} className="rounded-[7px] px-2 py-1.5 text-[11.5px] font-medium" style={on ? { background: 'rgba(122,63,168,0.1)', color: LILLA_M } : { color: SVAK }}>{l}</span>
          ))}
        </div>
        {/* innhold */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-semibold" style={{ color: T.ink }}>Leieforhold <span style={{ color: SVAK }}>· {count} enheter</span></p>
            <span className="rounded-full px-2.5 py-1 text-[10.5px] font-medium" style={{ background: 'rgba(31,157,85,0.1)', color: GRONN }}>● Live</span>
          </div>
          {/* KPI-stripe (live) */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[['Belegg', `${belegg} %`], ['Leieverdi/mnd', `${nb(leieverdi)} kr`], ['Enheter', String(count)]].map(([l, v]) => (
              <div key={l} className="rounded-[9px] px-2.5 py-2" style={{ background: '#FBFAF7', boxShadow: `inset 0 0 0 1px ${LYS_HAIR}` }}>
                <p className="truncate text-[9.5px]" style={{ color: SVAK }}>{l}</p>
                <p className="mt-0.5 whitespace-nowrap tabular-nums text-[12.5px] font-semibold" style={{ color: T.ink }}>{v}</p>
              </div>
            ))}
          </div>
          {/* tabell */}
          <div className="mt-3 overflow-hidden rounded-[9px]" style={{ boxShadow: `inset 0 0 0 1px ${LYS_HAIR}` }}>
            {rader.map((r, i) => {
              const st = STATUS[r.s];
              return (
                <div key={r.adr} className="deck-rad flex items-center gap-3 px-3 py-2" style={{ '--i': 0.6 + i * 0.28, borderTop: i ? `1px solid ${LYS_HAIR}` : 'none' }}>
                  <span className="w-[74px] shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${st.f}18`, color: st.f }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: st.f }} />{st.l}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium" style={{ color: T.ink }}>{r.adr}</span>
                    <span className="block truncate text-[10px]" style={{ color: SVAK }}>{r.type}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[11.5px] font-semibold" style={{ color: r.leie === '—' ? SVAK : T.ink }}>{r.leie === '—' ? '—' : `${r.leie} kr`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Mobil-mock: huseier-appen. Rolig, ett kort + liste + tab-bar. */
function MobileMock({ leieverdi, aktiv }) {
  const netto = Math.round((leieverdi || 385800) * 0.9);
  return (
    <div className="relative" style={{ width: 190 }}>
      <div className="overflow-hidden rounded-[30px] p-[7px]" style={{ background: '#15130F', boxShadow: '0 40px 70px -34px rgba(21,19,15,0.6), inset 0 0 0 1px rgba(244,241,234,0.08)' }}>
        <div className="relative overflow-hidden rounded-[24px]" style={{ background: '#F3F1EC' }}>
          {/* notch */}
          <span className="absolute left-1/2 top-1.5 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full" style={{ background: 'rgba(21,19,15,0.85)' }} />
          <div className="px-3.5 pb-3 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px]" style={{ color: SVAK }}>God morgen</p>
                <p className="text-[12.5px] font-semibold" style={{ color: T.ink }}>Din portefølje</p>
              </div>
              <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: '#fff', boxShadow: `inset 0 0 0 1px ${LYS_HAIR}` }}><Bell className="h-3 w-3" style={{ color: LILLA_M }} strokeWidth={2} /></span>
            </div>
            {/* utbetalingskort */}
            <div className="mt-3 rounded-[14px] p-3" style={{ background: T.ink, color: '#fff' }}>
              <p className="text-[9px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Til utbetaling denne måneden</p>
              <p className="mt-1 tabular-nums text-[19px] font-semibold" style={{ ...display, letterSpacing: '-0.02em' }}>{nb(netto)} kr</p>
              <div className="mt-2 flex items-end gap-[3px]" style={{ height: 26 }}>
                {[42, 55, 48, 63, 58, 72, 68, 80].map((h, i) => (
                  <span key={i} className="deck-stolpe flex-1 rounded-t-[2px]" style={{ '--i': 0.4 + i * 0.12, height: `${h}%`, background: i === 7 ? LILLA : 'rgba(244,241,234,0.28)' }} />
                ))}
              </div>
            </div>
            {/* liste */}
            <div className="mt-3 space-y-1.5">
              {[['Nygårdsgaten 5', 'Utleid', GRONN], ['Fjøsangerveien 3', 'Fremtidig', LILLA_M], ['Kong Oscars gate 9', 'Signering', GUL]].map(([adr, st, f], i) => (
                <div key={adr} className="deck-rad flex items-center gap-2 rounded-[10px] px-2.5 py-2" style={{ '--i': 0.8 + i * 0.25, background: '#fff', boxShadow: `inset 0 0 0 1px ${LYS_HAIR}` }}>
                  <span className="grid h-6 w-6 place-items-center rounded-[7px]" style={{ background: 'rgba(122,63,168,0.1)' }}><Building2 className="h-3 w-3" style={{ color: LILLA_M }} strokeWidth={2} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-medium" style={{ color: T.ink }}>{adr}</span>
                    <span className="block text-[8.5px]" style={{ color: f }}>{st}</span>
                  </span>
                  <ChevronRight className="h-3 w-3" style={{ color: SVAK }} />
                </div>
              ))}
            </div>
          </div>
          {/* tab-bar */}
          <div className="flex items-center justify-around px-3 py-2.5" style={{ background: '#fff', borderTop: `1px solid ${LYS_HAIR}` }}>
            {[[Home, true], [LayoutGrid, false], [Wallet, false], [Users, false]].map(([Ikon, on], i) => (
              <Ikon key={i} className="h-4 w-4" style={{ color: on ? LILLA_M : 'rgba(21,19,15,0.3)' }} strokeWidth={on ? 2.4 : 2} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DigiHomeIDag({ adminKey = '', aktiv = false, enheterIDag = 0 }) {
  const [t, setT] = useState(null);
  const [split, setSplit] = useState({ forvaltning: 0, selvbetjening: 0, huseiere: 0, adresser: 0 });
  const [klar, setKlar] = useState(false);

  const hent = useCallback(async () => {
    if (!adminKey) return;
    try {
      const d = await fetch(`/api/admin/leieforhold?key=${encodeURIComponent(adminKey)}`, { cache: 'no-store' }).then((r) => r.json());
      if (d && d.ok) {
        setT(d.totals || null);
        const rows = d.rows || [];
        setSplit({
          forvaltning: rows.filter((r) => r.service_level === 'Full forvaltning').length,
          selvbetjening: rows.filter((r) => r.service_level === 'Selvbetjening').length,
          huseiere: new Set(rows.map((r) => (r.owner_name || '').trim().toLowerCase()).filter(Boolean)).size,
          adresser: new Set(rows.map((r) => (r.address || '').trim().toLowerCase()).filter(Boolean)).size,
        });
        setKlar(true);
      }
    } catch (e) { /* stille fallback */ }
  }, [adminKey]);

  useEffect(() => { if (adminKey) hent(); }, [adminKey, hent]);

  const boliger = t?.count || split.forvaltning || enheterIDag || 0;
  const forvaltning = split.forvaltning || boliger;
  const selvbetjening = split.selvbetjening || 0;
  const totForv = Math.max(1, forvaltning + selvbetjening);
  const forvPct = Math.round((forvaltning / totForv) * 100);

  return (
    <div className="mt-6 grid gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-center">
      {/* Venstre: enhetskomposisjon (desktop + mobil) */}
      <div className="lg:col-span-7">
        <div className="relative deck-inn" style={{ '--i': 1 }}>
          <DesktopMock t={t} aktiv={aktiv} />
          {/* mobil overlapper nede til høyre på store skjermer */}
          <div className="mt-6 flex justify-center lg:mt-0 lg:absolute lg:-bottom-8 lg:-right-2 lg:block">
            <MobileMock leieverdi={t?.actual_rent} aktiv={aktiv} />
          </div>
        </div>
      </div>

      {/* Høyre: live nøkkeltall */}
      <div className="lg:col-span-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <KPI i={1.4} ikon={Building2} label="Boliger i forvaltning" verdi={boliger} aktiv={aktiv} klar={klar || boliger > 0} />
          <KPI i={1.6} ikon={Users} label="Huseiere" verdi={split.huseiere} aktiv={aktiv} klar={klar} />
          <KPI i={1.8} ikon={TrendingUp} label="Belegg" verdi={t?.occupancy_pct || 0} suffix="%" aktiv={aktiv} klar={klar} farge={LILLA_M} />
          <KPI i={2.0} ikon={Wallet} label="Leieverdi / mnd" verdi={t?.actual_rent || 0} suffix="kr" aktiv={aktiv} klar={klar} />
        </div>

        {/* To spor: full forvaltning vs selvbetjening — data-drevet */}
        <div className="deck-inn mt-8 border-t pt-5" data-strek="1" style={{ '--i': 2.3, '--strek': HAIR, borderColor: HAIR }}>
          <p className="text-[12px] font-medium" style={{ color: SVAK }}>To spor, samme plattform</p>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: LYS_HAIR }}>
            <span className="deck-stolpe block h-full origin-left" style={{ '--i': 2.5, width: `${forvPct}%`, background: `linear-gradient(90deg, ${LILLA}, ${LILLA_M})`, transformOrigin: 'left center' }} />
            <span className="deck-stolpe block h-full origin-left" style={{ '--i': 2.7, width: `${100 - forvPct}%`, background: T.charcoal, transformOrigin: 'left center' }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5" style={{ color: DIM }}><span className="h-2 w-2 rounded-[2px]" style={{ background: LILLA_M }} /> Full forvaltning <b className="tabular-nums" style={{ color: T.ink }}>{forvaltning}</b></span>
            <span className="flex items-center gap-1.5" style={{ color: DIM }}><span className="h-2 w-2 rounded-[2px]" style={{ background: T.charcoal }} /> Selvbetjening {selvbetjening > 0 ? <b className="tabular-nums" style={{ color: T.ink }}>{selvbetjening}</b> : <span style={{ color: SVAK }}>ruller ut</span>}</span>
          </div>
        </div>

        <div className="deck-inn mt-6 flex items-center gap-2 text-[11.5px]" style={{ '--i': 2.9, color: SVAK }}>
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: LILLA_M }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: LILLA_M }} /></span>
          {klar ? 'Live fra driftsportalen · oppdateres når decket åpnes' : 'Live tall vises i presentasjonsmodus'}
        </div>
      </div>
    </div>
  );
}
