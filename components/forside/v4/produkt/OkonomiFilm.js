'use client';

import React, { useEffect, useState } from 'react';
import { EASE, T, display, tall } from '../motion';
import { PAPIR, HVIT, HAIR, DIM, OFF, H, P, MORF, GLASS, Hake, Inn, Vokse, Tekstbytte, Akter, NesteBro, Sms, useBredde, useFilm, Ramme } from './filmdeler';

/* ---------------------------------------------------------------------------
   OkonomiFilm — kapittel 4. «Fra husleie til ferdig regnskap.»

   Bygården ER regnskapet. 1. november, tidlig morgen: fasaden i Nygårdsgaten 5
   står alene. Så lyser vinduene opp ett og ett — hver betaling som registreres
   tenner lyset i sin leilighet og får en liten etikett («Leilighet 3 · 7 400 kr»).
   Sju lyser. Ett står mørkt. Så løsner etikettene fra vinduene og legger seg
   som linjene i en stille liste på papir — vinduene ble regnskapet. Dag 3:
   Mikkel i Leilighet 5 får en vennlig SMS med Vipps, betaler, vinduet lyser.
   Månedsslutt: kvelden faller over bygården, rørleggerfakturaen fra Drift
   lander på Leilighet 2, måneden bokføres og går til PowerOffice.
   Ingen trykk fra eieren — det er poenget.

   Akter: Husleien kommer · Én mangler · Påminnelsen går av seg selv ·
   Fakturaen lander riktig · Måneden lukkes · Slutt: «Betalt. Bokført.»

   Teknikk: kun transform/opacity. Etikettene (Pille) har basis i listen og
   translateres ut til vinduet — «flyr hjem» med MORF. Lysene ligger i
   kameralaget (skalerer med bildet), etikettene i scenelaget (kameraet står
   stille når de er synlige).
--------------------------------------------------------------------------- */

const F = {
  START: 0,
  LYS1: 1, LYS2: 2, LYS3: 3, LYS4: 4, LYS5: 5, LYS6: 6, LYS7: 7,
  VENTER: 8, LISTE: 9,
  DAG3: 10, PURR: 11, BETALT: 12,
  MND: 13, FAKTURA: 14, BOKFORT: 15,
  SLUTT: 16,
};
const AUTO = {
  [F.START]: 1900,
  [F.LYS1]: 900, [F.LYS2]: 640, [F.LYS3]: 780, [F.LYS4]: 640, [F.LYS5]: 640, [F.LYS6]: 640, [F.LYS7]: 1000,
  [F.VENTER]: 2100, [F.LISTE]: 2700,
  [F.DAG3]: 1500, [F.PURR]: 2900, [F.BETALT]: 2300,
  [F.MND]: 1700, [F.FAKTURA]: 2500, [F.BOKFORT]: 2900,
  [F.SLUTT]: 4400,
};
const SISTE = F.SLUTT;

const AKTER = [
  { fra: F.START, tittel: 'Husleien kommer.', tekst: '1. november, tidlig. Betalingene registreres etter hvert som de kommer inn — leilighet for leilighet. Du trenger ikke sjekke kontoen.' },
  { fra: F.VENTER, tittel: 'Én mangler.', tekst: 'Sju av åtte har betalt. Leilighet 5 står åpen — DigiHome venter til den tredje, og sier fra slik du ville sagt det selv.' },
  { fra: F.DAG3, tittel: 'Påminnelsen går av seg selv.', tekst: 'Mikkel får en SMS med Vipps. Han betaler på under et minutt, beløpet registreres og listen er full — du hørte ikke om det.' },
  { fra: F.MND, tittel: 'Fakturaen lander riktig.', tekst: 'Rørleggerfakturaen fra forrige kapittel bokføres på Leilighet 2, med bilag. Ingen bunke på kjøkkenbordet, ingen leting i mars.' },
  { fra: F.BOKFORT, tittel: 'Måneden lukkes.', tekst: 'Inn, ut og bilag — ført og overført til regnskapet. PowerOffice eller regnskapsføreren din får det ferdig sortert.' },
];
const SLUTT = { tittel: 'Betalt. Bokført.', tekst: 'Husleien inn, én vennlig påminnelse, fakturaen på riktig leilighet. Neste måned skjer det igjen.' };
const aktIndeks = (f) => { let i = 0; AKTER.forEach((a, k) => { if (f >= a.fra) i = k; }); return i; };
const varighet = (i) => { const fra = AKTER[i].fra; const til = i + 1 < AKTER.length ? AKTER[i + 1].fra : SISTE + 1; let sum = 0; for (let f = fra; f < til; f += 1) sum += AUTO[f] || 0; return sum; };
const aktTekst = (fase) => (fase >= F.SLUTT ? { id: 'slutt', ...SLUTT } : { id: String(aktIndeks(fase)), ...AKTER[aktIndeks(fase)] });

/* Leilighetene — vinduene i fasadebildet (andel av bildet) og husleien. Summen er 64 500 kr (samme tall som i heroen).
   `lys` = fasen der betalingen registreres og vinduet lyser. Leilighet 5 (Mikkel) venter til BETALT. */
const LEIL = [
  { n: 1, x: 0.345, y: 0.62, leie: 8900, tid: '07:31', lys: F.LYS5 },
  { n: 2, x: 0.755, y: 0.57, leie: 12500, tid: '07:04', lys: F.LYS3, navn: 'Emma' },
  { n: 3, x: 0.60, y: 0.60, leie: 7400, tid: '06:52', lys: F.LYS1 },
  { n: 4, x: 0.962, y: 0.56, leie: 9200, tid: '08:12', lys: F.LYS7 },
  { n: 5, x: 0.36, y: 0.26, leie: 6800, tid: '3. nov', lys: null, navn: 'Mikkel' },
  { n: 6, x: 0.46, y: 0.23, leie: 7100, tid: '07:40', lys: F.LYS6 },
  { n: 7, x: 0.60, y: 0.22, leie: 6300, tid: '06:58', lys: F.LYS2 },
  { n: 8, x: 0.755, y: 0.19, leie: 6300, tid: '07:15', lys: F.LYS4 },
];
const SUM = LEIL.reduce((s, l) => s + l.leie, 0);
const SUM_UTEN5 = SUM - LEIL[4].leie;
const RORLEGGER = 3900;
const betaltAv = (fase) => LEIL.filter((l) => (l.lys != null ? fase >= l.lys : fase >= F.BETALT)).length;

/* Scenen: bygården morgen (Drift) og kveld (Annonse) — samme utsnitt. Bildet dekker rammen med object-position 56 % 46 %. */
const MORGEN = { src: '/v4/drift/fasade-morgen-1920.webp', liten: '/v4/drift/fasade-morgen-1200.webp' };
const KVELD = { src: '/v4/annonse/fasade-kveld-1920.webp', liten: '/v4/annonse/fasade-kveld-1200.webp' };
const BILDE = { w: 1920, h: 1097, posX: 0.56, posY: 0.46 };
const POS = `${BILDE.posX * 100}% ${BILDE.posY * 100}%`;
function geom(W, Hh) {
  const s = Math.max(W / BILDE.w, Hh / BILDE.h);
  const dw = BILDE.w * s; const dh = BILDE.h * s;
  return { dw, dh, ox: (W - dw) * BILDE.posX, oy: (Hh - dh) * BILDE.posY };
}
const punkt = (g, l) => ({ x: Math.round(g.ox + l.x * g.dw), y: Math.round(g.oy + l.y * g.dh) });

const erKveld = (fase) => fase >= F.MND;
const SCRIM_MORGEN = 'linear-gradient(90deg, rgba(251,250,248,0.95) 0%, rgba(251,250,248,0.88) 24%, rgba(251,250,248,0.42) 44%, rgba(251,250,248,0) 60%), linear-gradient(180deg, rgba(251,250,248,0) 70%, rgba(251,250,248,0.30) 100%)';
const SCRIM_KVELD = 'linear-gradient(90deg, rgba(21,19,15,0.90) 0%, rgba(21,19,15,0.78) 24%, rgba(21,19,15,0.34) 44%, rgba(21,19,15,0) 60%), linear-gradient(180deg, rgba(21,19,15,0) 62%, rgba(21,19,15,0.42) 100%)';

/* Listen (kortet) — mål */
const KW = 324; const KPAD = 14; const HODE = 54; const RAD = 34; const PILL_W = 190; const PILL_H = 26;

/* ── Lyset i vinduet — en varm kjerne i vindusform og en myk glorie. Kun opacity/transform. ── */
function Lys({ l, g, fase, ov }) {
  const paa = l.lys != null ? fase >= l.lys : fase >= F.BETALT;
  const p = punkt(g, l);
  const kw = Math.round(g.dw * 0.028); const kh = Math.round(g.dh * 0.095);
  const gw = Math.round(g.dw * 0.11); const gh = Math.round(g.dh * 0.26);
  const t = ov ? 'none' : `opacity 900ms ${EASE}, transform 1400ms ${EASE}`;
  return (
    <>
      <div aria-hidden="true" className="absolute" style={{ left: p.x - gw / 2, top: p.y - gh / 2, width: gw, height: gh, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,186,105,0.55), rgba(255,186,105,0.18) 55%, rgba(255,186,105,0) 100%)', mixBlendMode: 'screen', opacity: paa ? 1 : 0, transform: paa ? 'scale(1)' : 'scale(0.6)', transition: t, willChange: 'transform, opacity' }} />
      {/* Kjernen: lys inne i vinduet — myk (statisk blur på et lite element), ikke et klistremerke */}
      <div aria-hidden="true" className="absolute" style={{ left: p.x - kw / 2, top: p.y - kh / 2, width: kw, height: kh, borderRadius: 4, background: 'rgba(255,214,160,0.42)', boxShadow: '0 0 22px 8px rgba(255,196,120,0.32)', filter: 'blur(4px)', mixBlendMode: 'screen', opacity: paa ? 1 : 0, transform: paa ? 'scale(1)' : 'scale(0.8)', transition: t, willChange: 'transform, opacity' }} data-testid={`v4-lys-${l.n}`} data-paa={paa ? '1' : '0'} />
    </>
  );
}

/* Statusmerket i etiketten: grønn hake (betalt) eller stille punkt (venter) — krysstones når Mikkel betaler */
function Status({ betalt, liten = false }) {
  const s = liten ? 14 : 16;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: s, height: s }}>
      <span className="absolute inset-0 inline-flex items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.16)', color: '#166B3C', opacity: betalt ? 1 : 0, transition: `opacity 400ms ${EASE}` }}><Hake size={liten ? 9 : 10} /></span>
      <span className="absolute inset-0 inline-flex items-center justify-center rounded-full" style={{ background: 'rgba(21,19,15,0.07)', opacity: betalt ? 0 : 1, transition: `opacity 400ms ${EASE}` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(21,19,15,0.35)' }} /></span>
    </span>
  );
}

/* ── Etiketten — først på vinduet (glass), så linjen i listen (samme element, translate hjem). ── */
function Pille({ l, i, g, L, fase, ov }) {
  const registrert = l.lys != null ? fase >= l.lys : fase >= F.VENTER;
  const betalt = l.lys != null ? fase >= l.lys : fase >= F.BETALT;
  const iListe = fase >= F.LISTE;
  const p = punkt(g, l);
  const base = { x: L.kort.x + KPAD, y: L.kort.y + HODE + i * RAD + (RAD - PILL_H) / 2 };
  const dx = p.x - PILL_W / 2 - base.x; const dy = p.y - PILL_H / 2 - base.y;
  const transform = iListe ? 'translate(0px, 0px) scale(1)' : registrert ? `translate(${dx}px, ${dy}px) scale(1)` : `translate(${dx}px, ${dy + 10}px) scale(0.94)`;
  const transition = ov ? 'none'
    : iListe ? `transform 820ms ${MORF} ${i * 45}ms, background-color 500ms ${EASE} ${500 + i * 45}ms, box-shadow 500ms ${EASE} ${500 + i * 45}ms`
      : registrert ? `opacity 520ms ${EASE}, transform 760ms ${EASE}` : 'none';
  return (
    <div className="absolute z-[6] flex items-center gap-2 rounded-full pl-2 pr-2.5 text-[12px] font-medium tabular-nums" style={{ left: base.x, top: base.y, width: PILL_W, height: PILL_H, color: T.ink, opacity: registrert ? 1 : 0, transform, transformOrigin: '50% 50%', transition, willChange: 'transform, opacity', pointerEvents: 'none', ...(iListe ? { background: 'transparent', boxShadow: 'none' } : GLASS) }} aria-hidden={!registrert} data-testid={`v4-pille-${l.n}`} data-betalt={betalt ? '1' : '0'}>
      <Status betalt={betalt} />
      <span className="truncate">Leilighet {l.n}<span style={{ color: DIM }}> · </span>{tall(l.leie)} kr</span>
    </div>
  );
}

/* ── Listen — papiret. Radene er tomme til venstre (etikettene lander der); tidspunkt til høyre. ── */
function Vipps({ h = 14 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/v4/logo/vipps.svg" alt="Vipps" className="inline-block align-middle" style={{ height: h, width: 'auto' }} draggable={false} />;
}
function PowerOffice({ h = 14 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/v4/logo/poweroffice.svg" alt="PowerOffice" className="inline-block align-middle" style={{ height: h, width: 'auto' }} draggable={false} />;
}

function datoFor(fase) {
  if (fase >= F.MND) return '30. nov';
  if (fase >= F.DAG3) return '3. nov';
  return '1. nov';
}

function Liste({ fase, ov, inline = false }) {
  const n = betaltAv(fase);
  const full = fase >= F.BETALT;
  const faktura = fase >= F.FAKTURA;
  const bokfort = fase >= F.BOKFORT;
  const dato = datoFor(fase);
  return (
    <div className="overflow-hidden rounded-[16px]" style={{ background: HVIT, boxShadow: `0 0 0 1px ${HAIR}, 0 40px 90px -50px rgba(21,19,15,0.45)` }} data-testid="v4-liste" data-betalt={n}>
      <div className="flex items-center justify-between" style={{ height: HODE, padding: `0 ${KPAD + 4}px` }}>
        <p className="text-[13px] font-medium" style={{ color: T.ink }}>Husleie <span style={{ color: DIM }}>· november</span></p>
        <p className="text-[12px] tabular-nums" style={{ color: DIM }}><span key={dato} className="inline-block animate-in fade-in-0 duration-500">{dato}</span></p>
      </div>
      <div style={{ padding: `0 ${KPAD}px` }}>
        {LEIL.map((l, i) => {
          const betalt = l.lys != null ? fase >= l.lys : fase >= F.BETALT;
          const vis = fase >= F.LISTE;
          return (
            <div key={l.n} className="flex items-center justify-between" style={{ height: RAD, borderTop: i === 0 ? '1px solid transparent' : `1px solid ${HAIR}` }} data-testid={`v4-rad-${l.n}`}>
              {inline ? (
                <span className="flex items-center gap-2 text-[12.5px] font-medium tabular-nums" style={{ color: T.ink, opacity: betalt || fase >= F.VENTER ? 1 : 0.35, transition: `opacity 400ms ${EASE}` }}>
                  <Status betalt={betalt} liten />
                  Leilighet {l.n}<span style={{ color: DIM }}> · </span>{tall(l.leie)} kr
                </span>
              ) : <span style={{ width: PILL_W }} />}
              <span className="text-[12px] tabular-nums" style={{ color: betalt ? DIM : 'rgba(21,19,15,0.35)', opacity: vis ? 1 : 0, transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? 700 + i * 45 : 0}ms, color 400ms ${EASE}` }}>
                <span key={betalt ? 'b' : 'v'} className="inline-block animate-in fade-in-0 duration-500">{betalt ? l.tid : 'venter'}</span>
              </span>
            </div>
          );
        })}
        {/* Kostnaden — rørleggerfakturaen fra Drift, på Leilighet 2 */}
        <Vokse vis={faktura} ov={ov} delay={200}>
          <div className="flex items-center justify-between" style={{ height: RAD + 6, borderTop: `1px solid ${HAIR}` }} data-testid="v4-rad-faktura">
            <span className="flex min-w-0 items-center gap-2 text-[12.5px]" style={{ color: T.ink }}>
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.24)' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} /></span>
              <span className="truncate"><span className="font-medium">Rørlegger AS</span><span style={{ color: DIM }}> · varmtvann · Leilighet 2</span></span>
            </span>
            <span className="shrink-0 text-[12.5px] font-medium tabular-nums" style={{ color: T.ink }}>−{tall(RORLEGGER)} kr</span>
          </div>
        </Vokse>
      </div>
      {/* Summen */}
      <div className="flex items-center justify-between" style={{ height: 46, margin: `0 ${KPAD}px`, borderTop: `1px solid rgba(21,19,15,0.14)` }} data-testid="v4-sum">
        <span className="text-[12.5px]" style={{ color: DIM }}>
          <span key={faktura ? 'f' : full ? '8' : 'n'} className="inline-block animate-in fade-in-0 duration-500">{faktura ? 'Inn · ut' : `${n} av 8 betalt`}</span>
        </span>
        <span className="text-[13.5px] font-medium tabular-nums" style={{ color: T.ink }}>
          <span key={faktura ? 'f' : full ? '8' : 'n'} className="inline-block animate-in fade-in-0 duration-500">
            {faktura ? <>{tall(SUM)} kr<span style={{ color: DIM }}> · </span>−{tall(RORLEGGER)} kr</> : `${tall(full ? SUM : SUM_UTEN5)} kr`}
          </span>
        </span>
      </div>
      {/* Bokført → PowerOffice */}
      <Vokse vis={bokfort} ov={ov} delay={250}>
        <div className="flex items-center justify-between" style={{ height: 44, margin: `0 ${KPAD}px`, borderTop: `1px solid ${HAIR}` }} data-testid="v4-bokfort">
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium" style={{ color: '#166B3C' }}><span className="inline-flex h-4 w-4 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.16)' }}><Hake size={10} /></span>Bokført</span>
          <span className="inline-flex items-center gap-2 text-[12px]" style={{ color: DIM }}>Overført til <PowerOffice h={13} /></span>
        </div>
      </Vokse>
    </div>
  );
}

/* ── Tekstspalten ── */
function Tekst({ fase, ov, kompakt = false, farge, dempet }) {
  const akt = aktTekst(fase);
  return (
    <Tekstbytte id={akt.id} ov={ov}>
      {(id) => {
        const a = id === 'slutt' ? SLUTT : AKTER[Number(id)];
        return (
          <>
            <h3 className={kompakt ? 'text-[27px]' : 'text-[clamp(28px,2.4vw,40px)]'} style={{ ...display, letterSpacing: '-0.03em', lineHeight: kompakt ? 1.04 : 1.02, color: farge, transition: ov ? 'none' : `color 1200ms ${EASE}` }} data-testid="v4-akt-tittel">{a.tittel}</h3>
            <p className={kompakt ? 'mt-3 text-[14.5px] leading-[1.5]' : 'mt-4 max-w-[34ch] text-[15.5px] leading-[1.5]'} style={{ color: dempet, transition: ov ? 'none' : `color 1200ms ${EASE}` }}>{a.tekst}</p>
          </>
        );
      }}
    </Tekstbytte>
  );
}

/* SMS-en til Mikkel + Vipps-kvitteringen — i tekstspalten */
function Paaminnelse({ fase, ov, morkt = false }) {
  const sms = fase >= F.PURR && fase < F.MND;
  const betalt = fase >= F.BETALT && fase < F.MND;
  return (
    <div style={{ color: T.ink }}>
      <div className="rounded-[16px]" style={{ background: morkt ? 'rgba(251,250,248,0.96)' : 'transparent', boxShadow: morkt ? 'none' : 'none' }}>
        <Sms vis={sms} til="Mikkel" tid="3. nov · 09:00" ov={ov} delay={300} testid="v4-sms-mikkel" className="mt-0" tekst={<>Hei Mikkel! Husleien for november ({tall(LEIL[4].leie)} kr) er ikke registrert ennå. Du kan betale her: <span className="ml-0.5 inline-flex h-6 items-center gap-1.5 rounded-full px-2 align-middle text-[11.5px] font-medium" style={{ background: 'rgba(255,91,36,0.10)', color: T.ink }}>Betal med <Vipps h={11} /></span></>} />
      </div>
      <Vokse vis={betalt} ov={ov} delay={300}>
        <p className="mt-2.5 inline-flex items-center gap-2 rounded-full pl-2 pr-3 text-[12.5px] font-medium" style={{ height: 30, background: 'rgba(31,157,85,0.14)', color: '#166B3C' }} data-testid="v4-vipps-betalt"><Hake size={12} />Betalt med Vipps · 09:14</p>
      </Vokse>
    </div>
  );
}

/* Tidsspranget — én linje i scenen, mellom teksten og listen */
function Tidssprang({ vis, over, under, farge, dempet, ov }) {
  return (
    <div className="pointer-events-none text-center" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(8px)', transition: ov ? 'none' : `opacity ${vis ? 700 : 350}ms ${EASE} ${vis ? 400 : 0}ms, transform 900ms ${EASE} ${vis ? 400 : 0}ms` }} aria-hidden={!vis} data-testid="v4-tidssprang">
      <p className="text-[13px]" style={{ color: dempet }}>{over}</p>
      <p className="mt-2 text-[clamp(26px,2.3vw,40px)]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: farge }}>{under}</p>
    </div>
  );
}

/* ── Desktop ── */
function layout(W) {
  const TW = Math.round(Math.min(380, Math.max(300, W * 0.3)));
  const kx = W - P - KW - 8;
  const kh = HODE + 8 * RAD + 46 + 44 + RAD + 6;   // full høyde (m/ faktura og bokført)
  const ky = Math.max(28, Math.round((H - kh) / 2) + 4);
  const venstre = P + TW + 36;
  return { tekst: { x: P, y: P + 96, w: TW }, kort: { x: kx, y: ky, w: KW }, mellom: { x: venstre, w: kx - venstre } };
}

function Desktop({ fase, ov, onAkt, neste, startet }) {
  const [ref, W] = useBredde();
  const L = W ? layout(W) : null;
  const g = W ? geom(W, H) : null;
  const kveld = erKveld(fase);
  const liste = fase >= F.LISTE;
  const bt = (ms, d = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${d}ms`);

  /* Kameraet: står litt inne på fasaden og slipper rolig ut i åpningen — ferdig før første vindu lyser, så etikettene
     (i scenelaget) treffer vinduene. Skyver svakt inn igjen når det blir kveld (etikettene er da i listen). */
  const [inne, setInne] = useState(false);
  useEffect(() => {
    if (fase !== F.START) return undefined;
    setInne(false);
    if (!startet) return undefined;
    let id2 = 0;
    const id = window.requestAnimationFrame(() => { id2 = window.requestAnimationFrame(() => setInne(true)); });
    return () => { window.cancelAnimationFrame(id); window.cancelAnimationFrame(id2); };
  }, [fase, startet]);
  const k = ov ? 1 : kveld ? 1.03 : inne || fase > F.START ? 1 : 1.045;
  const kamT = ov ? 'none' : kveld ? `transform 6000ms ${MORF}` : `transform ${AUTO[F.START] - 100}ms cubic-bezier(0.25, 0.6, 0.3, 1)`;
  const farge = kveld ? OFF : T.ink;
  const dempet = kveld ? 'rgba(244,241,234,0.70)' : DIM;
  const dag3 = fase === F.DAG3; const mnd = fase === F.MND;

  return (
    <div ref={ref} className="relative overflow-hidden" style={{ height: H, background: '#15130F' }} data-testid="v4-okonomi-desktop" data-kveld={kveld ? '1' : '0'}>
      {L && g && (
        <>
          {/* Scenen: bygården — morgen, så kveld. Lysene ligger i kameraet. */}
          <div className="absolute inset-0" style={{ transform: `scale(${k})`, transformOrigin: '50% 45%', transition: kamT, willChange: 'transform' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MORGEN.src} alt="Nygårdsgaten 5 om morgenen" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS }} draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KVELD.src} alt="Nygårdsgaten 5 om kvelden" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS, opacity: kveld ? 1 : 0, transition: ov ? 'none' : `opacity 2000ms ${EASE}` }} draggable={false} data-testid="v4-kveldbilde" />
            {LEIL.map((l) => <Lys key={l.n} l={l} g={g} fase={fase} ov={ov} />)}
          </div>

          {/* Scrim — morgen og kveld */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: SCRIM_MORGEN, opacity: kveld ? 0 : 1, transition: ov ? 'none' : `opacity 1400ms ${EASE}` }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: SCRIM_KVELD, opacity: kveld ? 1 : 0, transition: ov ? 'none' : `opacity 1400ms ${EASE} 300ms` }} />

          {/* Tekstspalten */}
          <div className="absolute z-[5]" style={{ left: L.tekst.x, top: L.tekst.y, width: L.tekst.w, bottom: P, color: farge }} data-testid="v4-tekstspalte">
            <Tekst fase={fase} ov={ov} farge={farge} dempet={dempet} />
            <div className="mt-6"><Paaminnelse fase={fase} ov={ov} /></div>
            <div className="mt-6"><Inn vis={fase >= F.SLUTT && !!neste} ov={ov} delay={350}><NesteBro aktiv={fase >= F.SLUTT} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></Inn></div>
            <div className="absolute bottom-0 left-0"><Akter antall={AKTER.length} aktiv={aktIndeks(fase)} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} morkt={kveld} /></div>
          </div>

          {/* Listen — papiret etikettene lander på */}
          <div className="absolute z-[3]" style={{ left: L.kort.x, top: L.kort.y, width: L.kort.w, opacity: liste ? 1 : 0, transform: liste ? 'translateX(0px) scale(1)' : 'translateX(18px) scale(0.98)', transition: ov ? 'none' : liste ? `opacity 600ms ${EASE} 80ms, transform 900ms ${MORF} 80ms` : 'none', pointerEvents: liste ? 'auto' : 'none', willChange: 'transform, opacity' }} aria-hidden={!liste}>
            <Liste fase={fase} ov={ov} />
          </div>
          {LEIL.map((l, i) => <Pille key={l.n} l={l} i={i} g={g} L={L} fase={fase} ov={ov} />)}

          {/* Tidssprangene — mellom teksten og listen */}
          <div className="pointer-events-none absolute z-[4] flex flex-col items-center justify-center" style={{ left: L.mellom.x, width: L.mellom.w, top: P, height: H - 2 * P }}>
            <div className="grid">
              <div className="col-start-1 row-start-1"><Tidssprang vis={dag3} over="To dager senere" under="3. november, 09:00." farge={farge} dempet={dempet} ov={ov} /></div>
              <div className="col-start-1 row-start-1"><Tidssprang vis={mnd} over="Månedsslutt" under="30. november, 23:59." farge={farge} dempet={dempet} ov={ov} /></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Under lg: stablet. Bildet med lysene øverst, listen under (etikettene inline). ── */
function BildeKompakt({ fase, ov }) {
  const [ref, W] = useBredde();
  const kveld = erKveld(fase);
  const Hh = W ? Math.round(W * 0.64) : 0;
  const g = W ? geom(W, Hh) : null;
  return (
    <div ref={ref} className="relative overflow-hidden rounded-[14px]" style={{ aspectRatio: '100 / 64', background: '#15130F' }} data-testid="v4-bilde-kompakt">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MORGEN.liten} alt="Nygårdsgaten 5 om morgenen" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS }} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KVELD.liten} alt="Nygårdsgaten 5 om kvelden" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: POS, opacity: kveld ? 1 : 0, transition: ov ? 'none' : `opacity 2000ms ${EASE}` }} draggable={false} />
      {g && LEIL.map((l) => <Lys key={l.n} l={l} g={g} fase={fase} ov={ov} />)}
      {g && LEIL.map((l) => {
        const paa = l.lys != null ? fase >= l.lys : fase >= F.BETALT;
        const venter = l.lys == null && fase >= F.VENTER && !paa;
        const p = punkt(g, l);
        return <span key={l.n} aria-hidden="true" className="absolute block h-2.5 w-2.5 rounded-full" style={{ left: p.x - 5, top: p.y - 5, background: paa ? T.gronn : 'rgba(251,250,248,0.9)', boxShadow: '0 0 0 2px rgba(251,250,248,0.95), 0 2px 8px rgba(0,0,0,0.4)', opacity: paa || venter ? 1 : 0, transform: paa || venter ? 'scale(1)' : 'scale(0.3)', transition: ov ? 'none' : `opacity 300ms ${EASE}, transform 700ms cubic-bezier(0.16, 1, 0.3, 1), background-color 500ms ${EASE}` }} />;
      })}
    </div>
  );
}

function Kompakt({ fase, ov, onAkt, neste }) {
  const slutt = fase >= F.SLUTT;
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-okonomi-kompakt">
      <div className="px-5 pt-6">
        <Tekst fase={fase} ov={ov} kompakt farge={T.ink} dempet={DIM} />
        <div className="pt-4"><Paaminnelse fase={fase} ov={ov} /></div>
        <Vokse vis={slutt && !!neste} ov={ov}><div className="pt-5"><NesteBro aktiv={slutt} dur={AUTO[F.SLUTT] - 200} navn={neste} ov={ov} /></div></Vokse>
      </div>
      <div className="px-5 pt-6">
        <BildeKompakt fase={fase} ov={ov} />
        <Vokse vis={fase === F.DAG3 || fase === F.MND} ov={ov}>
          <div className="pt-6 text-center">
            <p className="text-[13px]" style={{ color: DIM }}>{fase === F.MND ? 'Månedsslutt' : 'To dager senere'}</p>
            <p className="mt-1.5 text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{fase === F.MND ? '30. november, 23:59.' : '3. november, 09:00.'}</p>
          </div>
        </Vokse>
        <Vokse vis={fase >= F.LISTE} ov={ov}><div className="pt-3"><Liste fase={fase} ov={ov} inline /></div></Vokse>
      </div>
      <div className="px-5 pb-4 pt-4"><Akter antall={AKTER.length} aktiv={aktIndeks(fase)} varighet={varighet} onVelg={onAkt} navn={(i) => AKTER[i].tittel} /></div>
    </div>
  );
}

export default function OkonomiFilm({ synlig, spiller = synlig, tema = 'mork', onFerdig, onFremdrift, neste = null, full = false }) {
  const { fase, ov, morkt, bred, hopp } = useFilm({ synlig, spiller, AUTO, SISTE, START: F.START, HVILE: F.BOKFORT, onFerdig, onFremdrift });
  const [startet, setStartet] = useState(false);
  useEffect(() => { if (spiller && !startet) setStartet(true); }, [spiller, startet]);
  const tilAkt = (i) => { setStartet(true); hopp(AKTER[i].fra); };
  const felles = { fase, ov, onAkt: tilAkt, neste };
  return (
    <Ramme synlig={synlig} tema={tema} ov={ov} morkt={morkt} bred={bred} fase={fase} testid="v4-okonomi-scene" full={full} desktop={<Desktop {...felles} startet={startet} />} kompakt={<Kompakt {...felles} />} />
  );
}
