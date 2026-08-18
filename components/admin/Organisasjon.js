'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ORGANISASJON — interaktivt organisasjonskart (canvas med pan/zoom) for
// Digihome AS og Digihome Tech AS. Styre & ledelse synkes fra Brønnøysund
// (åpne API-er); alt kan berikes og suppleres manuelt. Investorer ser kartet
// read-only — all skriving håndheves server-side (admin).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Network, RefreshCw, Plus, X, Loader2, Pencil, Trash2, Eye, EyeOff, Landmark,
  Mail, Phone, Linkedin, AlertTriangle, Minus, Maximize2, Camera, Check, Users,
  Search, Globe,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const AVATAR_FARGER = ['#6d28d9', '#0e7490', '#b45309', '#be185d', '#15803d', '#4338ca', '#a21caf', '#0f766e'];
const avatarFarge = (navn) => {
  let h = 0;
  for (const c of String(navn || '')) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_FARGER[h % AVATAR_FARGER.length];
};
const initialer = (navn) => String(navn || '?').trim().split(/\s+/).slice(0, 2).map((d) => d[0]).join('').toUpperCase();
const fmtOrgnr = (o) => String(o || '').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
const fmtDato = (iso) => { try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };

// ── Layoutmotor: rene koordinater — ingen DOM-måling ─────────────────────────
const CW = 226; const CH = 112;   // personkort
const SW = 330; const SH = 100;   // selskapskort
const CHIP_W = 240; const CHIP_H = 56;
const GX = 26;                    // luft mellom kort i en rad
const RG = 74;                    // luft mellom rader (radetikett kommer i tillegg)
const TRE_GAP = 170;              // luft mellom de to selskapstrærne

function sorterRoller(a, b) {
  return (a.rekkefolge - b.rekkefolge) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
}

function byggTre(selskap, roller, x0) {
  const mine = roller.filter((r) => r.selskapId === selskap.id && !r.skjult);
  const styre = mine.filter((r) => r.gruppe === 'styre').sort(sorterRoller);
  const erDL = (r) => r.gruppe === 'ledelse' && ['DAGL', 'INNH'].includes(r.rolleKode);
  const dl = mine.filter(erDL).sort(sorterRoller);
  const ledelse = mine.filter((r) => r.gruppe === 'ledelse' && !erDL(r)).sort(sorterRoller);
  const annet = mine.filter((r) => r.gruppe === 'annet').sort(sorterRoller);

  const rader = [];
  rader.push({ type: 'selskap', bredde: SW, h: SH, elementer: [{ selskap }] });
  if (styre.length) rader.push({ type: 'kort', navn: 'styre', etikett: 'Styret', h: CH, bredde: styre.length * CW + (styre.length - 1) * GX, elementer: styre });
  if (dl.length) rader.push({ type: 'kort', navn: 'dl', etikett: 'Daglig leder', h: CH, bredde: dl.length * CW + (dl.length - 1) * GX, elementer: dl });
  if (ledelse.length) rader.push({ type: 'kort', navn: 'ledelse', etikett: 'Ledelsen', h: CH, bredde: ledelse.length * CW + (ledelse.length - 1) * GX, elementer: ledelse });
  if (annet.length) rader.push({ type: 'chip', navn: 'annet', etikett: 'Støttefunksjoner', h: CHIP_H, bredde: annet.length * CHIP_W + (annet.length - 1) * GX, elementer: annet });

  const treBredde = Math.max(...rader.map((r) => r.bredde));
  const noder = []; const kanter = []; const etiketter = [];
  let y = 0;
  const radInfo = [];
  for (const rad of rader) {
    const startX = x0 + (treBredde - rad.bredde) / 2;
    if (rad.etikett) {
      y += 26; // plass til radetiketten
      etiketter.push({ tekst: rad.etikett, x: startX + 2, y: y - 21, selskapId: selskap.id });
    }
    const plasserte = rad.elementer.map((el, i) => {
      const w = rad.type === 'selskap' ? SW : rad.type === 'chip' ? CHIP_W : CW;
      const node = { type: rad.type, navn: rad.navn, x: startX + i * (w + GX), y, w, h: rad.h, data: el, selskapId: selskap.id };
      noder.push(node);
      return node;
    });
    radInfo.push({ ...rad, y, plasserte, midtX: x0 + treBredde / 2 });
    y += rad.h + RG;
  }

  // Kanter: selskap → styret, styret (radmidte) → DL, DL (radmidte) → ledelse
  const finn = (navn) => radInfo.find((r) => r.navn === navn);
  const selskapRad = radInfo[0];
  const styreRad = finn('styre'); const dlRad = finn('dl'); const ledelseRad = finn('ledelse');
  if (styreRad) {
    const fraX = selskapRad.plasserte[0].x + SW / 2; const fraY = selskapRad.y + SH;
    for (const n of styreRad.plasserte) kanter.push({ x1: fraX, y1: fraY, x2: n.x + CW / 2, y2: n.y, tone: 'norm' });
  }
  if (dlRad) {
    const over = styreRad || selskapRad;
    const fraX = over.midtX; const fraY = over.y + (over.type === 'selskap' ? SH : CH);
    for (const n of dlRad.plasserte) kanter.push({ x1: fraX, y1: fraY, x2: n.x + CW / 2, y2: n.y, tone: 'aksent' });
  }
  if (ledelseRad) {
    const over = dlRad || styreRad || selskapRad;
    const fraX = over.midtX; const fraY = over.y + (over.type === 'selskap' ? SH : CH);
    for (const n of ledelseRad.plasserte) kanter.push({ x1: fraX, y1: fraY, x2: n.x + CW / 2, y2: n.y, tone: 'norm' });
  }
  return { noder, kanter, etiketter, bredde: treBredde, hoyde: y - RG };
}

function byggLayout(selskaper, roller, modus) {
  const valgte = modus === 'alle' ? selskaper : selskaper.filter((s) => s.id === modus);
  let x = 0; const noder = []; const kanter = []; const etiketter = []; const traer = [];
  let hoyde = 0;
  for (const s of valgte) {
    const tre = byggTre(s, roller, x);
    noder.push(...tre.noder); kanter.push(...tre.kanter); etiketter.push(...(tre.etiketter || []));
    traer.push({ x0: x, bredde: tre.bredde, hoyde: tre.hoyde });
    x += tre.bredde + TRE_GAP;
    hoyde = Math.max(hoyde, tre.hoyde);
  }
  return { noder, kanter, etiketter, traer, bredde: Math.max(x - TRE_GAP, 400), hoyde: Math.max(hoyde, 300) };
}

// ═════════════════════════════════════════════════════════════════════════════

// Lokal feilgrense: uansett hva som skulle gå galt i selve kartet, skal aldri
// hele admin-flaten erstattes av den globale feilsiden — vis en rolig
// gjenopprettingsboks med «Last kartet på nytt» i stedet.
class KartFeilgrense extends React.Component {
  constructor(props) { super(props); this.state = { feilet: false }; }
  static getDerivedStateFromError() { return { feilet: true }; }
  componentDidCatch(error) { try { console.error('[organisasjon] kartfeil fanget:', error && error.message); } catch (e) {} }
  render() {
    if (this.state.feilet) {
      return (
        <div className="flex h-[440px] flex-col items-center justify-center gap-3 rounded-[24px] bg-white" data-testid="org-kart-feilgrense">
          <AlertTriangle className="h-7 w-7 text-[#d97706]" />
          <p className="text-[13.5px] font-semibold text-[#57534e]">Kartet fikk et lite problem — dataene dine er trygge</p>
          <button
            onClick={() => this.setState({ feilet: false })}
            className="rounded-full bg-[#1c1917] px-4 py-2 text-[12.5px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
          >
            Last kartet på nytt
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Organisasjon({ apiKey, erAdmin }) {
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [modus, setModus] = useState('alle');
  const [synker, setSynker] = useState(false);
  const [synkMelding, setSynkMelding] = useState('');
  const [valgtPersonId, setValgtPersonId] = useState(null);
  const [hoverPersonId, setHoverPersonId] = useState(null);
  const [visNyRolle, setVisNyRolle] = useState(false);
  const [visStotte, setVisStotte] = useState(false);
  const [redigerPerson, setRedigerPerson] = useState(null);
  const autoSynket = useRef(false);

  const hent = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/selskap/organisasjon?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke hente organisasjonen');
      setData(j); setFeil('');
      return j;
    } catch (e) { setFeil(e.message); return null; }
    finally { setLaster(false); }
  }, [apiKey]);

  const synk = useCallback(async (stille = false) => {
    if (!erAdmin) return;
    setSynker(true); if (!stille) setSynkMelding('');
    try {
      const j = data || await hent();
      let nye = 0; let borte = 0;
      for (const s of (j?.selskaper || [])) {
        const r = await fetch(`/api/admin/selskap/synk?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selskapId: s.id }),
        });
        const jr = await r.json();
        if (jr.ok) { nye += jr.endringer.nyeRoller; borte += jr.endringer.borteRoller; }
        else if (!stille) setSynkMelding(jr.error || 'Synk feilet');
      }
      await hent();
      if (!stille) {
        setSynkMelding(nye || borte ? `Oppdatert fra Brønnøysund — ${nye} nye roller${borte ? `, ${borte} borte` : ''}` : 'Alt er allerede à jour med Brønnøysund');
        setTimeout(() => setSynkMelding(''), 5000);
      }
    } finally { setSynker(false); }
  }, [apiKey, erAdmin, data, hent]);

  useEffect(() => { hent(); }, [hent]);

  // På mobil: start med ett selskap (Begge blir for smått på liten skjerm)
  const mobilJustert = useRef(false);
  useEffect(() => {
    if (!data || mobilJustert.current) return;
    mobilJustert.current = true;
    if (typeof window !== 'undefined' && window.innerWidth < 640 && data.selskaper?.length) {
      setModus(data.selskaper[0].id);
    }
  }, [data]);

  // Første gang (tomt kart + admin): synk automatisk fra Brønnøysund
  useEffect(() => {
    if (!data || autoSynket.current || !erAdmin) return;
    if ((data.roller || []).length === 0) { autoSynket.current = true; synk(true); }
  }, [data, erAdmin, synk]);

  const layout = useMemo(() => (data ? byggLayout(data.selskaper, data.roller, modus) : null), [data, modus]);
  const personAv = useMemo(() => Object.fromEntries((data?.personer || []).map((p) => [p.id, p])), [data]);
  // Personer med roller i 2+ selskaper (for «2 selskaper»-badge)
  const flereSelskap = useMemo(() => {
    const per = {};
    for (const r of (data?.roller || [])) { (per[r.personId] = per[r.personId] || new Set()).add(r.selskapId); }
    return new Set(Object.keys(per).filter((pid) => per[pid].size > 1));
  }, [data]);

  const valgtPerson = valgtPersonId ? personAv[valgtPersonId] : null;

  if (laster) return <div className="flex items-center justify-center py-32 text-[#a6a19a]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (feil) return <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#d97706]" /><p className="text-[14px] text-[#57534e]">{feil}</p></div>;

  const sistSynket = (data?.selskaper || []).map((s) => s.sistSynket).filter(Boolean).sort().pop();

  return (
    <div className="mx-auto max-w-[1720px]">
      {/* Verktøylinje */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="max-w-full overflow-x-auto">
          <div className="flex w-max items-center gap-0.5 rounded-full p-[3px]" style={{ background: 'rgba(0,0,0,0.045)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
            {[...(data?.selskaper || []).map((s) => ({ id: s.id, navn: s.navn })), { id: 'alle', navn: 'Begge' }].map((v) => (
              <button key={v.id} onClick={() => setModus(v.id)} data-testid={`org-modus-${v.id}`}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${modus === v.id ? 'text-white' : 'text-[#8a857d] hover:text-[#57534e]'}`}
                style={modus === v.id ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.25)' } : {}}>
                {v.navn}
              </button>
            ))}
          </div>
        </div>
        <span className="flex-1" />
        {synkMelding && <span className="rounded-full bg-[#f0ebfa] px-3 py-1 text-[11px] font-bold text-[#6d28d9]" data-testid="org-synk-melding">{synkMelding}</span>}
        {sistSynket && !synkMelding && <span className="hidden text-[11px] text-[#b3ada3] lg:inline">Brønnøysund · sist synket {fmtDato(sistSynket)}</span>}
        {erAdmin && (
          <>
            <button onClick={() => synk(false)} disabled={synker} data-testid="org-synk-btn"
              className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#44403c] shadow-[0_1px_4px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-95">
              <RefreshCw className={`h-3.5 w-3.5 ${synker ? 'animate-spin' : ''}`} />
              Synk fra Brønnøysund
            </button>
            <button onClick={() => setVisStotte(true)} data-testid="org-stotte-btn"
              className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#44403c] shadow-[0_1px_4px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-95">
              <Landmark className="h-3.5 w-3.5" />
              Støtteselskap
            </button>
            <button onClick={() => setVisNyRolle(true)} data-testid="org-ny-rolle-btn"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-white transition-all hover:opacity-95 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.3)' }}>
              <Plus className="h-3.5 w-3.5" />
              Legg til rolle
            </button>
          </>
        )}
      </div>

      {/* Canvas */}
      {layout && (
        <div className="relative">
          <KartFeilgrense>
            <OrgCanvas
              layout={layout}
              personAv={personAv}
              flereSelskap={modus === 'alle' ? flereSelskap : new Set()}
              hoverPersonId={hoverPersonId}
              onHover={setHoverPersonId}
              onVelg={setValgtPersonId}
            />
          </KartFeilgrense>
          {(data?.roller || []).length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
              <div className="pointer-events-auto max-w-sm rounded-[22px] bg-white/95 p-8 text-center shadow-[0_18px_50px_rgba(20,16,40,0.16)] backdrop-blur">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: 'linear-gradient(135deg, #f0ebfa, #e5d9fb)' }}>
                  <Network className="h-6 w-6 text-[#6d28d9]" />
                </span>
                <p className="text-[16px] font-bold text-[#1c1917]" style={heading}>Kartet er tomt</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#a6a19a]">{erAdmin ? (synker ? 'Henter styre og ledelse fra Brønnøysund …' : 'Trykk «Synk fra Brønnøysund» for å hente styret og daglig leder automatisk.') : 'Administratoren har ikke publisert organisasjonskartet ennå.'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personskuff */}
      {valgtPerson && (
        <PersonSkuff
          person={valgtPerson}
          roller={(data?.roller || []).filter((r) => r.personId === valgtPerson.id)}
          selskaper={data?.selskaper || []}
          erAdmin={erAdmin}
          apiKey={apiKey}
          onLukk={() => setValgtPersonId(null)}
          onEndret={hent}
          onRediger={() => setRedigerPerson(valgtPerson)}
        />
      )}

      {/* Admin-modaler */}
      {visNyRolle && (
        <NyRolleModal
          apiKey={apiKey}
          selskaper={data?.selskaper || []}
          personer={data?.personer || []}
          onLukk={() => setVisNyRolle(false)}
          onLagret={() => { setVisNyRolle(false); hent(); }}
        />
      )}
      {visStotte && (
        <StotteModal
          apiKey={apiKey}
          selskaper={data?.selskaper || []}
          onLukk={() => setVisStotte(false)}
          onLagret={() => { setVisStotte(false); hent(); }}
        />
      )}
      {redigerPerson && (
        <PersonModal
          apiKey={apiKey}
          person={redigerPerson}
          onLukk={() => setRedigerPerson(null)}
          onLagret={() => { setRedigerPerson(null); hent(); }}
        />
      )}
    </div>
  );
}

// ── Canvas med pan/zoom ──────────────────────────────────────────────────────

function OrgCanvas({ layout, personAv, flereSelskap, hoverPersonId, onHover, onVelg }) {
  const ytreRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [myk, setMyk] = useState(false); // myk transisjon ved knappe-zoom/fit
  const viewRef = useRef(view); viewRef.current = view;
  const pekere = useRef(new Map());
  const drar = useRef(null);
  const PAD = 90; // luft rundt kartet i koordinatsystemet

  // Fyll hele layouten: mål avstanden fra canvas-toppen til viewport-bunnen
  // og bruk den som høyde — ingen hvit stripe nederst, uansett skjerm.
  const [hoydePx, setHoydePx] = useState(560);
  useEffect(() => {
    const beregn = () => {
      try {
        const el = ytreRef.current; if (!el) return;
        const r = el.getBoundingClientRect();
        setHoydePx(Math.max(440, Math.round(window.innerHeight - r.top - 20)));
      } catch (e) { /* aldri la måling velte kartet */ }
    };
    beregn();
    window.addEventListener('resize', beregn);
    return () => window.removeEventListener('resize', beregn);
  }, []);

  const tilpass = useCallback(() => {
    const el = ytreRef.current; if (!el) return;
    const cw = el.clientWidth; const ch = el.clientHeight;
    const bw = layout.bredde + PAD * 2; const bh = layout.hoyde + PAD * 2;
    const scale = Math.min((cw - 32) / bw, (ch - 32) / bh, 1.05);
    setMyk(true);
    setView({ x: (cw - bw * scale) / 2, y: (ch - bh * scale) / 2, scale });
  }, [layout]);

  useEffect(() => { tilpass(); }, [tilpass, hoydePx]);

  // Zoom mot pekeren — native listener (React gjør wheel passiv)
  useEffect(() => {
    const el = ytreRef.current; if (!el) return undefined;
    const paaHjul = (e) => {
      e.preventDefault();
      const v = viewRef.current;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      const faktor = Math.exp(-e.deltaY * 0.0016);
      const nyScale = Math.min(2.2, Math.max(0.25, v.scale * faktor));
      const k = nyScale / v.scale;
      setMyk(false);
      setView({ scale: nyScale, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k });
    };
    el.addEventListener('wheel', paaHjul, { passive: false });
    return () => el.removeEventListener('wheel', paaHjul);
  }, []);

  const paaPekerNed = (e) => {
    try {
      // Klikk på kort/knapper skal nå frem som vanlige klikk — kun bakgrunnen
      // starter panorering (pointer capture ville ellers kapret klikket).
      if (e.target && e.target.closest && e.target.closest('button')) return;
      setMyk(false);
      pekere.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pekere.current.size === 1) {
        const v = viewRef.current;
        drar.current = { startX: e.clientX, startY: e.clientY, viewX: v.x, viewY: v.y, flyttet: false };
        // setPointerCapture kan kaste hvis pekeren alt er borte — aldri la det velte UI-et
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ufarlig */ }
      }
    } catch (err) { drar.current = null; }
  };
  const paaPekerFlytt = (e) => {
    try {
      if (!pekere.current.has(e.pointerId)) return;
      const forrige = new Map(pekere.current);
      pekere.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pekere.current.size === 2) {
        // Pinch: skaler rundt midtpunktet
        const el = ytreRef.current; if (!el) return;
        const [a, b] = [...pekere.current.values()];
        const [fa, fb] = [...forrige.values()];
        const avstNy = Math.hypot(a.x - b.x, a.y - b.y);
        const avstGammel = Math.hypot(fa.x - fb.x, fa.y - fb.y) || avstNy;
        const rect = el.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - rect.left; const my = (a.y + b.y) / 2 - rect.top;
        const v = viewRef.current;
        const nyScale = Math.min(2.2, Math.max(0.25, v.scale * (avstNy / avstGammel)));
        const k = nyScale / v.scale;
        setView({ scale: nyScale, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k });
        drar.current = null;
        return;
      }
      // VIKTIG: les drag-tilstanden inn i en LOKAL variabel før setView.
      // «drar.current» kan bli nullstilt (pointerup/pinch) FØR React kjører
      // oppdatereren — å dereferere ref-en inne i oppdatereren ga tidligere
      // null-krasj («prøv igjen»-feilsiden) midt i panorering.
      const d = drar.current;
      if (d) {
        const dx = e.clientX - d.startX; const dy = e.clientY - d.startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.flyttet = true;
        setView((v) => ({ ...v, x: d.viewX + dx, y: d.viewY + dy }));
      }
    } catch (err) { drar.current = null; }
  };
  const paaPekerOpp = (e) => {
    try {
      pekere.current.delete(e.pointerId);
      if (pekere.current.size === 0) drar.current = null;
    } catch (err) { pekere.current = new Map(); drar.current = null; }
  };

  const zoomKnapp = (retning) => {
    const el = ytreRef.current; if (!el) return;
    const v = viewRef.current;
    const mx = el.clientWidth / 2; const my = el.clientHeight / 2;
    const nyScale = Math.min(2.2, Math.max(0.25, v.scale * (retning > 0 ? 1.25 : 0.8)));
    const k = nyScale / v.scale;
    setMyk(true);
    setView({ scale: nyScale, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k });
  };

  return (
    <div
      ref={ytreRef}
      data-testid="org-canvas"
      className="relative overflow-hidden rounded-[24px] shadow-[0_2px_20px_rgba(20,16,40,0.06),inset_0_0_0_1px_rgba(0,0,0,0.04)]"
      style={{ height: hoydePx, background: 'linear-gradient(180deg, #fbfaf8, #f5f3ef)', touchAction: 'none', userSelect: 'none', cursor: drar.current ? 'grabbing' : 'grab' }}
      onPointerDown={paaPekerNed}
      onPointerMove={paaPekerFlytt}
      onPointerUp={paaPekerOpp}
      onPointerCancel={paaPekerOpp}
      onDoubleClick={(e) => { if (!(e.target && e.target.closest && e.target.closest('button'))) tilpass(); }}
    >
      <style>{`
        @keyframes dhOrgKortInn { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes dhOrgKantInn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        style={{
          position: 'absolute', left: 0, top: 0,
          width: layout.bredde + PAD * 2, height: layout.hoyde + PAD * 2,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0',
          transition: myk ? 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          backgroundImage: 'radial-gradient(rgba(28,25,23,0.09) 1.1px, transparent 1.3px)', backgroundSize: '24px 24px',
        }}
      >
        {/* Myk glød bak hvert selskapstre — gir dybde uten støy */}
        {(layout.traer || []).map((t, i) => (
          <div key={`glow-${i}`} className="pointer-events-none absolute"
            style={{
              left: t.x0 + PAD - 60, top: PAD - 50, width: t.bredde + 120, height: t.hoyde + 110,
              background: 'radial-gradient(ellipse 60% 45% at 50% 26%, rgba(109,40,217,0.055), transparent 70%)',
            }} />
        ))}
        {/* Kanter — myke bezier-linjer m/ gradient på aksentlinjen */}
        <svg width={layout.bredde + PAD * 2} height={layout.hoyde + PAD * 2} className="absolute inset-0" style={{ overflow: 'visible', animation: 'dhOrgKantInn 600ms ease-out both' }}>
          <defs>
            <linearGradient id="dhOrgAksent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(28,25,23,0.22)" />
              <stop offset="100%" stopColor="rgba(109,40,217,0.42)" />
            </linearGradient>
          </defs>
          {layout.kanter.map((k, i) => {
            const x1 = k.x1 + PAD; const y1 = k.y1 + PAD; const x2 = k.x2 + PAD; const y2 = k.y2 + PAD;
            const midt = (y2 - y1) * 0.55;
            return (
              <path key={i} d={`M ${x1} ${y1} C ${x1} ${y1 + midt}, ${x2} ${y2 - midt}, ${x2} ${y2}`}
                fill="none" stroke={k.tone === 'aksent' ? 'url(#dhOrgAksent)' : 'rgba(28,25,23,0.15)'} strokeWidth={k.tone === 'aksent' ? 1.8 : 1.5} strokeLinecap="round" />
            );
          })}
        </svg>
        {/* Radetiketter — redaksjonelle små merkelapper over hvert nivå */}
        {(layout.etiketter || []).map((e, i) => (
          <p key={`et-${i}`} className="pointer-events-none absolute flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#b3ada3]"
            style={{ left: e.x + PAD, top: e.y + PAD, animation: 'dhOrgKantInn 500ms ease-out both' }}>
            <span className="h-[3px] w-[3px] rounded-full bg-[#c9a0f9]" />
            {e.tekst}
          </p>
        ))}
        {/* Noder */}
        {layout.noder.map((n, i) => {
          if (n.type === 'selskap') return <SelskapKort key={`s-${n.data.selskap.id}`} node={n} pad={PAD} stagger={i} />;
          const person = personAv[n.data.personId] || { navn: 'Ukjent' };
          if (n.type === 'chip') {
            return (
              <div key={n.data.id} className="absolute" style={{ left: n.x + PAD, top: n.y + PAD, width: n.w, animation: `dhOrgKortInn 420ms cubic-bezier(0.22,1,0.36,1) ${Math.min(i * 45, 500)}ms both` }}>
                <button onClick={() => onVelg(person.id)} data-testid={`org-chip-${n.data.id}`}
                  className="flex w-full items-center gap-2.5 rounded-[14px] bg-white/85 px-3 py-2.5 text-left shadow-[0_1px_5px_rgba(20,16,40,0.05),inset_0_0_0_1px_rgba(0,0,0,0.045)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(20,16,40,0.10)]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f4f1ec] text-[#8a857d]"><Landmark className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-bold text-[#44403c]">{person.navn}</span>
                    <span className="block truncate text-[9.5px] font-semibold uppercase tracking-wide text-[#b3ada3]">
                      {n.data.rolleNavn}{person.erEnhet && person.orgnr ? ` · ${fmtOrgnr(person.orgnr)}` : ''}
                    </span>
                  </span>
                </button>
              </div>
            );
          }
          return (
            <PersonKort key={n.data.id} node={n} person={person} pad={PAD} stagger={i}
              badgeFlere={flereSelskap.has(person.id)}
              hover={hoverPersonId === person.id}
              onHover={onHover} onVelg={onVelg} />
          );
        })}
      </div>

      {/* Zoomkontroller */}
      <div className="absolute bottom-4 right-4 flex items-center overflow-hidden rounded-[13px] bg-white/95 shadow-[0_6px_20px_rgba(20,16,40,0.13),inset_0_0_0_1px_rgba(0,0,0,0.05)] backdrop-blur">
        <button onClick={() => zoomKnapp(-1)} className="flex h-9 w-9 items-center justify-center text-[#8a857d] transition-colors hover:bg-[#faf9f7] hover:text-[#1c1917] active:scale-90" title="Zoom ut"><Minus className="h-3.5 w-3.5" /></button>
        <button onClick={tilpass} className="w-12 text-center text-[10.5px] font-bold tabular-nums text-[#57534e] transition-colors hover:text-[#6d28d9]" title="Tilpass visningen">{Math.round(view.scale * 100)}%</button>
        <button onClick={() => zoomKnapp(1)} className="flex h-9 w-9 items-center justify-center text-[#8a857d] transition-colors hover:bg-[#faf9f7] hover:text-[#1c1917] active:scale-90" title="Zoom inn"><Plus className="h-3.5 w-3.5" /></button>
        <button onClick={tilpass} className="flex h-9 w-9 items-center justify-center border-l border-black/[0.05] text-[#8a857d] transition-colors hover:bg-[#faf9f7] hover:text-[#6d28d9] active:scale-90" title="Tilpass visningen" data-testid="org-fit-btn"><Maximize2 className="h-3.5 w-3.5" /></button>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-4 hidden rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-medium text-[#a6a19a] backdrop-blur sm:block">Dra for å flytte · scroll for zoom · dobbelklikk for å tilpasse · klikk et kort for detaljer</p>
    </div>
  );
}

function SelskapKort({ node, pad, stagger = 0 }) {
  const s = node.data.selskap;
  // Monogram: «Digihome AS» → DH, «Digihome Tech AS» → DT
  const mono = /tech/i.test(s.navn || '') ? 'DT' : 'DH';
  return (
    <div className="absolute" style={{ left: node.x + pad, top: node.y + pad, width: node.w, animation: `dhOrgKortInn 420ms cubic-bezier(0.22,1,0.36,1) ${Math.min(stagger * 45, 500)}ms both` }}>
      <div className="relative overflow-hidden rounded-[18px] px-5 py-4 text-white shadow-[0_14px_36px_rgba(28,20,60,0.30)]"
        style={{ background: 'linear-gradient(135deg, #1c1917 15%, #3b2373 150%)', boxShadow: '0 14px 36px rgba(28,20,60,0.30), inset 0 1px 0 rgba(255,255,255,0.09)' }}>
        <span className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.22), transparent 70%)' }} />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-black tracking-tight"
            style={{ ...heading, background: 'rgba(255,255,255,0.10)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)' }}>
            {mono}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight" style={heading}>{s.navn}</p>
            <p className="text-[10.5px] font-medium text-white/55">Org.nr {fmtOrgnr(s.orgnr)}{s.registrert ? ` · reg. ${new Date(s.registrert).getFullYear()}` : ''}</p>
          </div>
        </div>
        {s.adresse && <p className="relative mt-2 truncate text-[10px] text-white/40">{s.adresse}</p>}
      </div>
    </div>
  );
}

function PersonKort({ node, person, pad, badgeFlere, hover, onHover, onVelg, stagger = 0 }) {
  const r = node.data;
  const erStyre = node.navn === 'styre';
  const erVara = ['VARA', 'OBS'].includes(r.rolleKode);
  return (
    <div className="absolute" style={{ left: node.x + pad, top: node.y + pad, width: node.w, animation: `dhOrgKortInn 420ms cubic-bezier(0.22,1,0.36,1) ${Math.min(stagger * 45, 500)}ms both` }}>
      <button
        onClick={() => onVelg(person.id)}
        onMouseEnter={() => onHover(person.id)}
        onMouseLeave={() => onHover(null)}
        data-testid={`org-kort-${r.id}`}
        className={`w-full rounded-[16px] bg-white px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-1 ${erVara ? 'opacity-75' : ''}`}
        style={{
          boxShadow: hover
            ? '0 14px 34px rgba(59,35,115,0.20), inset 0 0 0 1.5px rgba(109,40,217,0.45)'
            : '0 2px 10px rgba(20,16,40,0.06), inset 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        <div className="flex items-start gap-3">
          {person.bilde ? (
            <img src={person.bilde} alt="" className="h-11 w-11 shrink-0 rounded-[13px] object-cover" style={{ boxShadow: '0 3px 10px rgba(20,16,40,0.14)' }} />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[13px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${avatarFarge(person.navn)}, ${avatarFarge(person.navn)}bb)`, boxShadow: '0 3px 10px rgba(20,16,40,0.14), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
              {initialer(person.navn)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-snug text-[#1c1917]">{person.navn}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-[2px] text-[9px] font-bold uppercase tracking-wide ${erStyre ? 'bg-[#f0ebfa] text-[#6d28d9]' : 'text-white'}`}
              style={erStyre ? {} : { background: 'linear-gradient(135deg, #1c1917, #3d3733)' }}>
              {r.rolleNavn}
            </span>
            {person.tittel && r.rolleNavn !== person.tittel && <p className="mt-1 truncate text-[10px] text-[#a6a19a]">{person.tittel}</p>}
          </div>
        </div>
        {(badgeFlere || r.brregBorte) && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {badgeFlere && <span className="rounded-full bg-[#eef6f1] px-1.5 py-[1px] text-[8.5px] font-bold text-[#15803d]">2 selskaper</span>}
            {r.brregBorte && <span className="flex items-center gap-0.5 rounded-full bg-[#fdf3e7] px-1.5 py-[1px] text-[8.5px] font-bold text-[#b45309]"><AlertTriangle className="h-2.5 w-2.5" />Ikke lenger i BRreg</span>}
          </div>
        )}
      </button>
    </div>
  );
}

// ── Personskuff ──────────────────────────────────────────────────────────────

function PersonSkuff({ person, roller, selskaper, erAdmin, apiKey, onLukk, onEndret, onRediger }) {
  const [jobber, setJobber] = useState('');
  const selskapAv = Object.fromEntries(selskaper.map((s) => [s.id, s]));

  const rolleAksjon = async (rolle, aksjon) => {
    setJobber(rolle.id);
    try {
      if (aksjon === 'skjul') {
        await fetch(`/api/admin/selskap/rolle?key=${encodeURIComponent(apiKey)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rolle.id, skjult: !rolle.skjult }),
        });
      } else if (aksjon === 'slett') {
        if (!window.confirm(`Fjerne rollen «${rolle.rolleNavn}»?`)) { setJobber(''); return; }
        await fetch(`/api/admin/selskap/rolle?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(rolle.id)}`, { method: 'DELETE' });
      }
      await onEndret();
    } finally { setJobber(''); }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]" onClick={onLukk} />
      <div className="fixed bottom-0 right-0 top-0 z-[61] w-full max-w-[420px] overflow-y-auto bg-white shadow-2xl" data-testid="org-person-skuff" style={{ animation: 'dhOrgSkuffInn 240ms cubic-bezier(0.16,1,0.3,1) both' }}>
        <style>{`@keyframes dhOrgSkuffInn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <div className="relative px-6 pb-5 pt-6" style={{ background: 'linear-gradient(180deg, #faf8f5, #ffffff)' }}>
          <button onClick={onLukk} className="absolute right-4 top-4 rounded-full p-1.5 text-[#a6a19a] transition-colors hover:bg-black/[0.05] hover:text-[#1c1917]"><X className="h-4.5 w-4.5" /></button>
          <div className="flex items-center gap-4">
            {person.bilde ? (
              <img src={person.bilde} alt="" className="h-16 w-16 rounded-[18px] object-cover shadow-md" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-[18px] text-[20px] font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg, ${avatarFarge(person.navn)}, ${avatarFarge(person.navn)}bb)` }}>
                {person.erEnhet ? <Landmark className="h-7 w-7" /> : initialer(person.navn)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-bold leading-tight text-[#1c1917]" style={heading}>{person.navn}</p>
              {person.tittel && <p className="mt-0.5 text-[12.5px] text-[#8a857d]">{person.tittel}</p>}
              {person.erEnhet && person.orgnr && <p className="mt-0.5 text-[11px] text-[#b3ada3]">Org.nr {fmtOrgnr(person.orgnr)}</p>}
            </div>
          </div>
          {erAdmin && (
            <button onClick={onRediger} data-testid="org-rediger-person-btn"
              className="mt-4 flex items-center gap-1.5 rounded-full bg-[#1c1917] px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-all hover:opacity-90 active:scale-95">
              <Pencil className="h-3 w-3" /> {person.erEnhet ? 'Rediger informasjon' : 'Rediger profil'}
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {person.bio && <p className="mb-5 text-[13px] leading-relaxed text-[#57534e]">{person.bio}</p>}

          {(person.epost || person.telefon || person.linkedin) && (
            <div className="mb-5 space-y-2">
              {person.epost && <a href={`mailto:${person.epost}`} className="flex items-center gap-2.5 text-[12.5px] font-medium text-[#44403c] hover:text-[#6d28d9]"><Mail className="h-3.5 w-3.5 text-[#b3ada3]" />{person.epost}</a>}
              {person.telefon && <a href={`tel:${person.telefon}`} className="flex items-center gap-2.5 text-[12.5px] font-medium text-[#44403c] hover:text-[#6d28d9]"><Phone className="h-3.5 w-3.5 text-[#b3ada3]" />{person.telefon}</a>}
              {person.linkedin && (
                <a href={person.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[12.5px] font-medium text-[#44403c] hover:text-[#6d28d9]">
                  {person.erEnhet ? <Globe className="h-3.5 w-3.5 text-[#b3ada3]" /> : <Linkedin className="h-3.5 w-3.5 text-[#b3ada3]" />}
                  {person.erEnhet ? 'Nettside' : 'LinkedIn-profil'}
                </a>
              )}
            </div>
          )}

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b3ada3]">Roller</p>
          <div className="space-y-2">
            {roller.sort((a, b) => String(selskapAv[a.selskapId]?.navn || '').localeCompare(String(selskapAv[b.selskapId]?.navn || ''))).map((r) => (
              <div key={r.id} className={`flex items-center gap-2.5 rounded-[13px] px-3.5 py-2.5 ${r.skjult ? 'opacity-50' : ''}`} style={{ background: '#faf9f7', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-[#1c1917]">{r.rolleNavn}</p>
                  <p className="text-[10.5px] text-[#a6a19a]">{selskapAv[r.selskapId]?.navn || ''}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-[1px] text-[8.5px] font-bold uppercase ${r.kilde === 'brreg' ? 'bg-[#eef3fb] text-[#1d4ed8]' : 'bg-[#f1efe9] text-[#8a857d]'}`}>{r.kilde === 'brreg' ? 'Brønnøysund' : 'Manuell'}</span>
                    {r.brregBorte && <span className="rounded-full bg-[#fdf3e7] px-1.5 py-[1px] text-[8.5px] font-bold text-[#b45309]">Ikke lenger i BRreg</span>}
                    {r.skjult && <span className="rounded-full bg-[#f1efe9] px-1.5 py-[1px] text-[8.5px] font-bold text-[#8a857d]">Skjult</span>}
                  </div>
                </div>
                {erAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => rolleAksjon(r, 'skjul')} disabled={jobber === r.id} title={r.skjult ? 'Vis i kartet' : 'Skjul fra kartet'}
                      className="rounded-[8px] p-1.5 text-[#a6a19a] transition-colors hover:bg-white hover:text-[#1c1917]">
                      {r.skjult ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    {r.kilde === 'manuell' && (
                      <button onClick={() => rolleAksjon(r, 'slett')} disabled={jobber === r.id} title="Fjern rollen"
                        className="rounded-[8px] p-1.5 text-[#c2beb8] transition-colors hover:bg-white hover:text-[#c2413b]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Modal: legg til rolle (eksisterende eller ny person) ────────────────────

const ROLLE_FORSLAG = ['Daglig leder', 'CTO', 'COO', 'CFO', 'Produktsjef', 'Markedssjef', 'Salgssjef', 'Driftssjef', 'Styreleder', 'Styremedlem', 'Varamedlem', 'Rådgiver', 'Investor'];

function NyRolleModal({ apiKey, selskaper, personer, onLukk, onLagret }) {
  const [selskapId, setSelskapId] = useState(selskaper[0]?.id || '');
  const [personId, setPersonId] = useState('');
  const [nyttNavn, setNyttNavn] = useState('');
  const [rolleNavn, setRolleNavn] = useState('');
  const [gruppe, setGruppe] = useState('ledelse');
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  // Portalbrukere til hurtigvalg — ny person kan hentes rett fra brukerlisten
  const [brukere, setBrukere] = useState([]);
  const [valgtBruker, setValgtBruker] = useState(null); // {name,email,tittel,avatar}

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/admin/users?key=${encodeURIComponent(apiKey)}`);
        const j = await r.json();
        if (alive && j.ok) setBrukere(j.members || []);
      } catch (e) {}
    })();
    return () => { alive = false; };
  }, [apiKey]);

  // Brukere som ikke allerede finnes som person i kartet (match på navn)
  const brukerForslag = useMemo(() => {
    const navnSett = new Set(personer.map((p) => String(p.navn || '').toLowerCase().trim()));
    return brukere.filter((b) => b.name && !navnSett.has(String(b.name).toLowerCase().trim()));
  }, [brukere, personer]);

  const velgBruker = (b) => {
    if (valgtBruker && valgtBruker.email === b.email && valgtBruker.name === b.name) {
      setValgtBruker(null); setNyttNavn('');
      return;
    }
    setValgtBruker(b);
    setNyttNavn(b.name);
    if (!rolleNavn.trim() && b.tittel) setRolleNavn(b.tittel);
  };

  const lagre = async () => {
    setFeil('');
    if (!rolleNavn.trim()) { setFeil('Gi rollen en tittel'); return; }
    if (!personId && !nyttNavn.trim()) { setFeil('Velg en person eller skriv inn et nytt navn'); return; }
    setLagrer(true);
    try {
      let pid = personId;
      if (!pid) {
        // Ny person — beriket med e-post/tittel/bilde hvis hentet fra brukerlisten
        const erFraBruker = valgtBruker && valgtBruker.name === nyttNavn.trim();
        const personBody = { navn: nyttNavn.trim() };
        if (erFraBruker) {
          if (valgtBruker.email) personBody.epost = valgtBruker.email;
          if (valgtBruker.tittel) personBody.tittel = valgtBruker.tittel;
          if (valgtBruker.avatar) personBody.bilde = valgtBruker.avatar;
        }
        const rp = await fetch(`/api/admin/selskap/person?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(personBody),
        });
        const jp = await rp.json();
        if (!jp.ok) throw new Error(jp.error || 'Kunne ikke opprette personen');
        pid = jp.person.id;
      }
      const r = await fetch(`/api/admin/selskap/rolle?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selskapId, personId: pid, rolleNavn: rolleNavn.trim(), gruppe }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke lagre rollen');
      onLagret();
    } catch (e) { setFeil(e.message); }
    finally { setLagrer(false); }
  };

  const inp = 'w-full rounded-[12px] bg-[#faf9f7] px-3.5 py-2.5 text-[13px] text-[#1c1917] outline-none transition-all placeholder:text-[#c2beb8] focus:bg-white';
  const inpStil = { boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' };
  const lbl = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#b3ada3]';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[3px]" onClick={onLukk}>
      <div className="w-full max-w-md rounded-[22px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="org-ny-rolle-modal">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#1c1917]" style={heading}>Legg til rolle</h3>
          <button onClick={onLukk} className="rounded-full p-1.5 text-[#a6a19a] hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Selskap</label>
            <div className="flex gap-2">
              {selskaper.map((s) => (
                <button key={s.id} onClick={() => setSelskapId(s.id)}
                  className={`flex-1 rounded-[12px] px-3 py-2 text-[12px] font-bold transition-all ${selskapId === s.id ? 'bg-[#1c1917] text-white' : 'bg-[#faf9f7] text-[#8a857d] hover:text-[#44403c]'}`}
                  style={selskapId === s.id ? {} : inpStil}>
                  {s.navn}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Person</label>
            <select value={personId} onChange={(e) => { setPersonId(e.target.value); if (e.target.value) { setValgtBruker(null); setNyttNavn(''); } }} className={inp} style={inpStil} data-testid="org-rolle-person-velger">
              <option value="">Ny person …</option>
              {personer.filter((p) => !p.erEnhet).map((p) => <option key={p.id} value={p.id}>{p.navn}</option>)}
            </select>
            {!personId && (
              <>
                <input value={nyttNavn} onChange={(e) => { setNyttNavn(e.target.value); if (valgtBruker && e.target.value !== valgtBruker.name) setValgtBruker(null); }} placeholder="Fullt navn på den nye personen"
                  className={`${inp} mt-2`} style={inpStil} data-testid="org-rolle-nytt-navn" />
                {brukerForslag.length > 0 && (
                  <div className="mt-2" data-testid="org-rolle-brukervalg">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#c2beb8]">Eller hent fra brukerne</p>
                    <div className="flex flex-wrap gap-1.5">
                      {brukerForslag.slice(0, 8).map((b) => {
                        const aktiv = valgtBruker && valgtBruker.email === b.email && valgtBruker.name === b.name;
                        return (
                          <button key={b.id} type="button" onClick={() => velgBruker(b)}
                            data-testid={`org-rolle-bruker-${b.id}`}
                            className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11.5px] font-semibold transition-all active:scale-[0.97] ${aktiv ? 'bg-[#1c1917] text-white' : 'bg-[#faf9f7] text-[#57534e] hover:bg-[#f1efe9]'}`}
                            style={aktiv ? {} : inpStil}>
                            {b.avatar
                              ? <img src={b.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                              : <span className="flex h-5 w-5 items-center justify-center rounded-full text-[8.5px] font-bold text-white" style={{ background: avatarFarge(b.name) }}>{initialer(b.name)}</span>}
                            {b.name}
                          </button>
                        );
                      })}
                    </div>
                    {valgtBruker && <p className="mt-1.5 text-[10.5px] text-[#a6a19a]">E-post{valgtBruker.avatar ? ', bilde' : ''}{valgtBruker.tittel ? ' og verv' : ''} hentes automatisk fra brukerkontoen</p>}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label className={lbl}>Rolletittel</label>
            <input value={rolleNavn} onChange={(e) => setRolleNavn(e.target.value)} placeholder="F.eks. CTO, Markedssjef, Rådgiver" list="dh-rolle-forslag"
              className={inp} style={inpStil} data-testid="org-rolle-tittel" />
            <datalist id="dh-rolle-forslag">{ROLLE_FORSLAG.map((f) => <option key={f} value={f} />)}</datalist>
          </div>
          <div>
            <label className={lbl}>Plassering i kartet</label>
            <div className="flex gap-2">
              {[['styre', 'Styret'], ['ledelse', 'Ledelsen'], ['annet', 'Støtte']].map(([v, l]) => (
                <button key={v} onClick={() => setGruppe(v)}
                  className={`flex-1 rounded-[12px] px-3 py-2 text-[12px] font-bold transition-all ${gruppe === v ? 'bg-[#1c1917] text-white' : 'bg-[#faf9f7] text-[#8a857d] hover:text-[#44403c]'}`}
                  style={gruppe === v ? {} : inpStil}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {feil && <p className="text-[12px] font-medium text-[#c2413b]">{feil}</p>}
          <button onClick={lagre} disabled={lagrer} data-testid="org-rolle-lagre"
            className="flex w-full items-center justify-center gap-2 rounded-[13px] py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-95 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)' }}>
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Lagre rollen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: knytt støtteselskap (BRreg-søk eller manuelt) ────────────────────

const STOTTE_FORSLAG = ['Juridisk', 'Regnskapsfører', 'Revisor', 'Bank & finans', 'Forsikring', 'IT-drift', 'Markedsføring', 'HR & rekruttering', 'Rådgivning', 'Eiendomsmegler'];

function StotteModal({ apiKey, selskaper, onLukk, onLagret }) {
  const [selskapId, setSelskapId] = useState(selskaper[0]?.id || '');
  const [sok, setSok] = useState('');
  const [soker, setSoker] = useState(false);
  const [treff, setTreff] = useState(null); // null = ikke søkt ennå
  const [sokFeil, setSokFeil] = useState('');
  const [valgt, setValgt] = useState(null); // {navn, orgnr, adresse, ...} fra BRreg
  const [manuell, setManuell] = useState(false);
  const [manNavn, setManNavn] = useState('');
  const [manOrgnr, setManOrgnr] = useState('');
  const [rolleNavn, setRolleNavn] = useState('');
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');

  // Debounced søk mot Brønnøysund — navn eller organisasjonsnummer
  useEffect(() => {
    if (manuell) return undefined;
    const q = sok.trim();
    if (q.length < 2) { setTreff(null); setSokFeil(''); return undefined; }
    const timer = setTimeout(async () => {
      setSoker(true); setSokFeil('');
      try {
        const r = await fetch(`/api/admin/selskap/brreg-sok?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || 'Søket feilet');
        setTreff(j.treff || []);
      } catch (e) { setSokFeil(e.message); setTreff([]); }
      finally { setSoker(false); }
    }, 450);
    return () => clearTimeout(timer);
  }, [sok, manuell, apiKey]);

  const lagre = async () => {
    setFeil('');
    const navn = manuell ? manNavn.trim() : (valgt?.navn || '');
    const orgnr = manuell ? manOrgnr.trim() : (valgt?.orgnr || '');
    if (!navn) { setFeil(manuell ? 'Skriv inn navnet på selskapet' : 'Søk opp og velg et selskap — eller registrer manuelt'); return; }
    if (!rolleNavn.trim()) { setFeil('Angi funksjonen — f.eks. Juridisk eller Regnskapsfører'); return; }
    setLagrer(true);
    try {
      const r = await fetch(`/api/admin/selskap/stotte?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selskapId, navn, orgnr: orgnr || undefined, rolleNavn: rolleNavn.trim() }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke knytte selskapet');
      onLagret();
    } catch (e) { setFeil(e.message); }
    finally { setLagrer(false); }
  };

  const inp = 'w-full rounded-[12px] bg-[#faf9f7] px-3.5 py-2.5 text-[13px] text-[#1c1917] outline-none transition-all placeholder:text-[#c2beb8] focus:bg-white';
  const inpStil = { boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' };
  const lbl = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#b3ada3]';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[3px]" onClick={onLukk}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="org-stotte-modal">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#1c1917]" style={heading}>Knytt støtteselskap</h3>
          <button onClick={onLukk} className="rounded-full p-1.5 text-[#a6a19a] hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-5 text-[12px] leading-relaxed text-[#a6a19a]">Advokat, regnskapsfører, revisor, bank … Søk i Brønnøysundregistrene på navn eller org.nr — eller registrer manuelt.</p>
        <div className="space-y-4">
          <div>
            <label className={lbl}>Knyttes til</label>
            <div className="flex gap-2">
              {selskaper.map((s) => (
                <button key={s.id} onClick={() => setSelskapId(s.id)}
                  className={`flex-1 rounded-[12px] px-3 py-2 text-[12px] font-bold transition-all ${selskapId === s.id ? 'bg-[#1c1917] text-white' : 'bg-[#faf9f7] text-[#8a857d] hover:text-[#44403c]'}`}
                  style={selskapId === s.id ? {} : inpStil}>
                  {s.navn}
                </button>
              ))}
            </div>
          </div>

          {!manuell ? (
            <div>
              <label className={lbl}>Selskap — søk i Brønnøysund</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c2beb8]" />
                <input value={sok} onChange={(e) => { setSok(e.target.value); setValgt(null); }} placeholder="Navn eller organisasjonsnummer …"
                  className={`${inp} pl-9`} style={inpStil} data-testid="org-stotte-sok" autoFocus />
                {soker && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#a6a19a]" />}
              </div>
              {sokFeil && <p className="mt-1.5 text-[11.5px] font-medium text-[#c2413b]">{sokFeil}</p>}
              {valgt ? (
                <div className="mt-2 flex items-start gap-2.5 rounded-[13px] bg-[#f0ebfa] px-3.5 py-3" data-testid="org-stotte-valgt">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#6d28d9]"><Landmark className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold text-[#1c1917]">{valgt.navn}</p>
                    <p className="text-[10.5px] text-[#6d28d9]">Org.nr {fmtOrgnr(valgt.orgnr)}{valgt.orgform ? ` · ${valgt.orgform}` : ''}</p>
                    {valgt.adresse && <p className="mt-0.5 truncate text-[10.5px] text-[#8a857d]">{valgt.adresse}</p>}
                  </div>
                  <button onClick={() => setValgt(null)} className="rounded-full p-1 text-[#a6a19a] hover:bg-white hover:text-[#1c1917]" title="Fjern valget"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                treff !== null && !soker && (
                  treff.length ? (
                    <div className="mt-2 max-h-56 space-y-1 overflow-y-auto" data-testid="org-stotte-treff">
                      {treff.map((t) => (
                        <button key={t.orgnr} onClick={() => { setValgt(t); }} data-testid={`org-stotte-treff-${t.orgnr}`}
                          className="flex w-full items-center gap-2.5 rounded-[12px] bg-[#faf9f7] px-3 py-2.5 text-left transition-all hover:bg-[#f0ebfa] active:scale-[0.99]" style={inpStil}>
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#8a857d]"><Landmark className="h-3.5 w-3.5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-bold text-[#1c1917]">{t.navn}</span>
                            <span className="block truncate text-[10px] text-[#a6a19a]">{fmtOrgnr(t.orgnr)}{t.adresse ? ` · ${t.adresse}` : ''}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    !sokFeil && <p className="mt-2 text-[11.5px] text-[#a6a19a]">Ingen treff i Brønnøysund på «{sok.trim()}»</p>
                  )
                )
              )}
              <button onClick={() => { setManuell(true); setManNavn(sok.trim().length > 1 && !/^[\d\s]+$/.test(sok) ? sok.trim() : ''); }}
                className="mt-2 text-[11px] font-bold text-[#8a857d] underline-offset-2 hover:text-[#6d28d9] hover:underline" data-testid="org-stotte-manuell-btn">
                Fant du ikke selskapet? Registrer manuelt
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={lbl}>Selskapsnavn</label>
                <input value={manNavn} onChange={(e) => setManNavn(e.target.value)} placeholder="F.eks. Advokatfirmaet Hansen AS" className={inp} style={inpStil} data-testid="org-stotte-man-navn" autoFocus />
              </div>
              <div>
                <label className={lbl}>Org.nr (valgfritt)</label>
                <input value={manOrgnr} onChange={(e) => setManOrgnr(e.target.value)} placeholder="9 sifre" inputMode="numeric" className={inp} style={inpStil} data-testid="org-stotte-man-orgnr" />
              </div>
              <button onClick={() => setManuell(false)} className="text-[11px] font-bold text-[#8a857d] underline-offset-2 hover:text-[#6d28d9] hover:underline">
                ← Tilbake til Brønnøysund-søket
              </button>
            </div>
          )}

          <div>
            <label className={lbl}>Funksjon</label>
            <input value={rolleNavn} onChange={(e) => setRolleNavn(e.target.value)} placeholder="F.eks. Juridisk, Regnskapsfører, Bank" list="dh-stotte-forslag"
              className={inp} style={inpStil} data-testid="org-stotte-funksjon" />
            <datalist id="dh-stotte-forslag">{STOTTE_FORSLAG.map((f) => <option key={f} value={f} />)}</datalist>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STOTTE_FORSLAG.slice(0, 5).map((f) => (
                <button key={f} onClick={() => setRolleNavn(f)}
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-all active:scale-95 ${rolleNavn === f ? 'bg-[#1c1917] text-white' : 'bg-[#faf9f7] text-[#8a857d] hover:text-[#44403c]'}`}
                  style={rolleNavn === f ? {} : inpStil}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {feil && <p className="text-[12px] font-medium text-[#c2413b]">{feil}</p>}
          <button onClick={lagre} disabled={lagrer} data-testid="org-stotte-lagre"
            className="flex w-full items-center justify-center gap-2 rounded-[13px] py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-95 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)' }}>
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Knytt selskapet
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: rediger person (beriking + bilde) ────────────────────────────────

function PersonModal({ apiKey, person, onLukk, onLagret }) {
  const [form, setForm] = useState({
    navn: person.navn || '', tittel: person.tittel || '', epost: person.epost || '',
    telefon: person.telefon || '', linkedin: person.linkedin || '', bio: person.bio || '',
  });
  const [bilde, setBilde] = useState(person.bilde || null);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const filRef = useRef(null);

  const velgBilde = (e) => {
    const fil = e.target.files?.[0];
    if (!fil) return;
    const les = new FileReader();
    les.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Skaler ned til 256px kvadrat (senter-beskjæring) → liten dataURL
        const side = 256;
        const c = document.createElement('canvas');
        c.width = side; c.height = side;
        const ctx = c.getContext('2d');
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, side, side);
        setBilde(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = les.result;
    };
    les.readAsDataURL(fil);
    e.target.value = '';
  };

  const lagre = async () => {
    setFeil(''); setLagrer(true);
    try {
      const r = await fetch(`/api/admin/selskap/person?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: person.id, ...form, bilde }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke lagre');
      onLagret();
    } catch (e) { setFeil(e.message); }
    finally { setLagrer(false); }
  };

  const inp = 'w-full rounded-[12px] bg-[#faf9f7] px-3.5 py-2.5 text-[13px] text-[#1c1917] outline-none transition-all placeholder:text-[#c2beb8] focus:bg-white';
  const inpStil = { boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' };
  const lbl = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#b3ada3]';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[3px]" onClick={onLukk}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="org-person-modal">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#1c1917]" style={heading}>Rediger profil</h3>
          <button onClick={onLukk} className="rounded-full p-1.5 text-[#a6a19a] hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button onClick={() => filRef.current?.click()} className="group relative" title="Last opp bilde">
              {bilde ? (
                <img src={bilde} alt="" className="h-16 w-16 rounded-[18px] object-cover shadow" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-[18px] text-[18px] font-bold text-white shadow" style={{ background: `linear-gradient(135deg, ${avatarFarge(form.navn)}, ${avatarFarge(form.navn)}bb)` }}>{initialer(form.navn)}</span>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#1c1917] text-white shadow transition-transform group-hover:scale-110"><Camera className="h-3 w-3" /></span>
            </button>
            <div className="min-w-0 flex-1">
              <label className={lbl}>Navn</label>
              <input value={form.navn} onChange={(e) => setForm((f) => ({ ...f, navn: e.target.value }))} className={inp} style={inpStil} data-testid="org-person-navn" />
            </div>
            <input ref={filRef} type="file" accept="image/*" className="hidden" onChange={velgBilde} />
          </div>
          {bilde && <button onClick={() => setBilde(null)} className="text-[11px] font-medium text-[#a6a19a] hover:text-[#c2413b]">Fjern bildet</button>}
          <div>
            <label className={lbl}>Tittel</label>
            <input value={form.tittel} onChange={(e) => setForm((f) => ({ ...f, tittel: e.target.value }))} placeholder="F.eks. Daglig leder & medgründer" className={inp} style={inpStil} data-testid="org-person-tittel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>E-post</label>
              <input value={form.epost} onChange={(e) => setForm((f) => ({ ...f, epost: e.target.value }))} className={inp} style={inpStil} />
            </div>
            <div>
              <label className={lbl}>Telefon</label>
              <input value={form.telefon} onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))} className={inp} style={inpStil} />
            </div>
          </div>
          <div>
            <label className={lbl}>{person.erEnhet ? 'Nettside' : 'LinkedIn'}</label>
            <input value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} placeholder={person.erEnhet ? 'https://…' : 'https://linkedin.com/in/…'} className={inp} style={inpStil} />
          </div>
          <div>
            <label className={lbl}>Kort bio</label>
            <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Bakgrunn og ansvarsområde — vises til investorene" className={`${inp} resize-none`} style={inpStil} data-testid="org-person-bio" />
          </div>
          {feil && <p className="text-[12px] font-medium text-[#c2413b]">{feil}</p>}
          <button onClick={lagre} disabled={lagrer} data-testid="org-person-lagre"
            className="flex w-full items-center justify-center gap-2 rounded-[13px] py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-95 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)' }}>
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Lagre profilen
          </button>
        </div>
      </div>
    </div>
  );
}
