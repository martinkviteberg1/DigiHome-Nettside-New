'use client';
/**
 * SystemFilm — «Systemet», en filmatisk gjennomgang av DigiHome for forvaltere (B2B).
 * Veksler mellom KEYNOTE-kort (Apple-stil, forklarer painpoint) og PRODUKT-TUR (rekonstruert UI
 * med simulert markør + typewriter-narrasjon). Auto-spill med manuell kontroll (piltaster/klikk).
 *
 * Akt 1 — Anskaffelse: lead → salgspipeline → tilbud → BankID-signert avtale.
 * Stil-anker: components/deck/ContractDemo.tsx (samme app-chrome/tokens).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, SlidersHorizontal, Plus, TrendingUp, ArrowRight, Check, ShieldCheck, FileText,
  Building2, ChevronsUpDown, PanelLeftClose, LayoutDashboard, Gauge, MessageSquare, UserCheck,
  ClipboardList, CalendarDays, Radio, ClipboardCheck, Bot, Rocket, FileSignature, AlertCircle,
  Users, Sparkles, Play, Pause, ChevronLeft, ChevronRight, Mail, MousePointer2,
} from 'lucide-react';

/* ── tokens (matcher ContractDemo + deck) ── */
const BEIGE = '#f4f1ec';
const INK = '#1c1815';
const INK2 = '#36332E';
const MUTED = '#8a8378';
const CANVAS = '#fdfcfb';
const SOFT = '#F4F2EE';
const LINE = '#ECE7DF';
const ACCENT = '#7C3AED';
const LILAC = '#cf97fc';
const BADGE = '#af6ee8';
const GREEN = '#16a34a';
const SIDE_BG = '#1a1a1a';
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
const F = "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif";

const WIN_W = 1480;
const WIN_H = 832;
const SIDEBAR_W = 256;

const NAV: any[] = [
  { sec: 'Arbeid' },
  { label: 'Oversikt', Icon: LayoutDashboard },
  { label: 'Operasjonssentral', Icon: Gauge, badge: 'Ny' },
  { label: 'Innboks', Icon: MessageSquare },
  { label: 'Leads', Icon: UserCheck, badge: 'Pro', active: true },
  { label: 'Reservasjoner', Icon: ClipboardList },
  { label: 'Kalender', Icon: CalendarDays },
  { label: 'Kanaler', Icon: Radio },
  { label: 'Oppgaver', Icon: ClipboardCheck },
  { label: 'Driftsassistent', Icon: Bot },
  { sec: 'Drift' },
  { label: 'Eiendommer', Icon: Building2 },
  { label: 'Utleieprosesser', Icon: Rocket },
  { label: 'Leieforhold', Icon: FileText },
  { label: 'Dokumenter', Icon: FileSignature },
  { label: 'Saker', Icon: AlertCircle },
  { label: 'Personer', Icon: Users },
];

/* ── pipeline-data ── */
const STAGES = [
  { key: 'new', label: 'Ny', p: 10, dot: '#9aa0a6' },
  { key: 'contacted', label: 'Kontaktet', p: 25, dot: '#d99a2b' },
  { key: 'viewing', label: 'Visning', p: 50, dot: '#3b82f6' },
  { key: 'proposal', label: 'Tilbud sendt', p: 75, dot: '#8b5cf6' },
  { key: 'signed', label: 'Akseptert', p: 100, dot: '#16a34a' },
];
const SEED: Record<string, { n: string; a: string; v: number }[]> = {
  new: [{ n: 'Ola Nyland', a: 'Møllergata 4', v: 14200 }],
  contacted: [{ n: 'Mariam Sayed', a: 'Bjørnsons gate 9', v: 11800 }, { n: 'Petter Five', a: 'Strandkaien 2', v: 9600 }],
  viewing: [{ n: 'Linn Haug', a: 'Nygårdsgaten 31', v: 16500 }],
  proposal: [{ n: 'Eivind SØrli', a: 'Kong Oscars gate 18', v: 13400 }],
  signed: [{ n: 'Hanne Borge', a: 'Fjellveien 7', v: 12900 }],
};

/* ── simulert markør ── */
function Cursor({ x, y, down, scale }: { x: number; y: number; down: boolean; scale: number }) {
  return (
    <div className="absolute z-50 pointer-events-none" style={{
      left: x, top: y, transform: `translate(-3px,-2px) scale(${down ? 0.86 : 1})`,
      transition: 'left 0.85s cubic-bezier(0.5,0,0.2,1), top 0.85s cubic-bezier(0.5,0,0.2,1), transform 0.18s ease',
    }}>
      <MousePointer2 className="w-6 h-6" style={{ color: '#111', fill: '#fff', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))' }} strokeWidth={1.6} />
      {down && <span className="absolute rounded-full" style={{ left: -10, top: -6, width: 26, height: 26, border: `2px solid ${ACCENT}`, animation: 'sf-ripple 0.6s ease-out' }} />}
    </div>
  );
}

/* ── typewriter ── */
function Typewriter({ text, speed = 24, start = true }: { text: string; speed?: number; start?: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) { setN(0); return; }
    setN(0); let i = 0;
    const id = setInterval(() => { i++; setN(i); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [text, start, speed]);
  return <>{text.slice(0, n)}<span className="sf-caret" style={{ background: ACCENT }} /></>;
}

/* ── narrasjons-caption ── */
function Caption({ step, text, k }: { step: string; text: string; k: number }) {
  return (
    <div key={k} className="absolute left-1/2 -translate-x-1/2 z-40" style={{ bottom: 34, width: 'min(820px, 86%)', animation: 'sf-rise 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div className="mx-auto rounded-2xl px-7 py-5 flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(14px)', border: '1px solid rgba(28,22,16,0.07)', boxShadow: '0 18px 50px -18px rgba(20,15,10,0.3)' }}>
        <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: '#f0e6fe' }}>
          <Sparkles className="w-4 h-4" style={{ color: ACCENT }} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-1.5" style={{ color: ACCENT, fontFamily: F }}>{step}</p>
          <p className="text-[18px] leading-snug" style={{ color: INK, fontFamily: FH, fontWeight: 500 }}><Typewriter text={text} /></p>
        </div>
      </div>
    </div>
  );
}

/* ── app-vindu chrome (sidebar + ramme) ── */
function AppWindow({ children, scale }: { children: React.ReactNode; scale: number }) {
  return (
    <div className="relative" style={{ width: WIN_W * scale, height: WIN_H * scale }}>
      <div style={{ width: WIN_W, height: WIN_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, borderRadius: 18, overflow: 'hidden', background: CANVAS, boxShadow: '0 4px 10px rgba(20,15,10,0.05), 0 50px 110px rgba(20,15,10,0.2)', border: '1px solid #e4dfd6' }}>
        <div className="absolute top-0 bottom-0 left-0 flex flex-col" style={{ width: SIDEBAR_W, background: SIDE_BG }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <span className="flex items-center gap-2 text-white font-bold text-[16px]" style={{ fontFamily: FH }}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#1a1a1a]" style={{ background: 'linear-gradient(135deg,#e9c8ff,#b07cf0)' }}>H</span>digihome
            </span>
            <PanelLeftClose className="w-4 h-4" strokeWidth={1.6} style={{ color: 'rgba(255,255,255,0.45)' }} />
          </div>
          <nav className="flex-1 px-2.5 overflow-hidden" style={{ paddingTop: 2 }}>
            {NAV.map((it, i) => {
              if (it.sec) return <p key={`s${i}`} className="text-[9.5px] font-semibold uppercase tracking-[0.16em] px-3 pt-[16px] pb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{it.sec}</p>;
              const A = it.active;
              return (
                <div key={it.label} className="relative flex items-center gap-3 rounded-xl px-3 py-[8px] text-[13px] font-medium mb-0.5"
                  style={{ background: A ? 'linear-gradient(90deg, rgba(207,151,252,0.20), rgba(207,151,252,0.04))' : 'transparent', color: A ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  {A && <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full" style={{ width: 4, height: 22, background: 'linear-gradient(180deg,#cf97fc,#7c5cff)', boxShadow: '0 0 12px rgba(207,151,252,0.65)' }} />}
                  <it.Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={A ? 2.2 : 1.6} style={{ color: A ? LILAC : 'rgba(255,255,255,0.55)' }} />
                  <span className="truncate">{it.label}</span>
                  {it.badge && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: BADGE, background: 'rgba(175,110,232,0.12)' }}>{it.badge}</span>}
                </div>
              );
            })}
          </nav>
          <div className="shrink-0 p-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                <img src="/team/martin-kviteberg-face.jpg" alt="Martin" className="w-full h-full object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold leading-none truncate" style={{ color: '#fff' }}>Martin Kviteberg</p>
                <p className="text-[10.5px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>martin@kviteberg.no</p>
              </div>
              <ChevronsUpDown className="w-4 h-4 shrink-0" strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>
        </div>
        <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: SIDEBAR_W, right: 0, background: CANVAS }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)', backgroundSize: '24px 24px', opacity: 0.14 }} />
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── kort i pipeline ── */
function LeadCard({ n, a, v, faded }: { n: string; a: string; v: number; faded?: boolean }) {
  return (
    <div className="rounded-xl px-3.5 py-3 mb-2.5" style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(20,15,10,0.04)', opacity: faded ? 0.55 : 1 }}>
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: '#f0e6fe', color: ACCENT }}>{n.split(' ').map(s => s[0]).join('').slice(0, 2)}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-none truncate" style={{ color: INK, fontFamily: FH }}>{n}</p>
          <p className="text-[11px] mt-1 leading-none truncate" style={{ color: MUTED, fontFamily: F }}>{a}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11px] font-medium" style={{ color: INK2, fontFamily: F }}>{v.toLocaleString('nb-NO')} kr/mnd</span>
        <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: MUTED }}><Building2 className="w-3 h-3" strokeWidth={1.8} /> Leilighet</span>
      </div>
    </div>
  );
}

/* ── SCENE: salgspipeline ── */
function ScenePipeline({ scale }: { scale: number }) {
  const MAIN_W = WIN_W - SIDEBAR_W;
  const PAD = 28, GAP = 14;
  const COL_W = Math.floor((MAIN_W - PAD * 2 - GAP * 4) / 5);
  const colX = (i: number) => PAD + i * (COL_W + GAP);
  const CARD_TOP = 178;

  const [phase, setPhase] = useState(0);     // 0 base → 1 lead lander → 2..5 flytter til Tilbud
  const [forecast, setForecast] = useState(742000);
  const [cursor, setCursor] = useState({ x: colX(0) + COL_W / 2, y: 120 });
  const [down, setDown] = useState(false);
  const focusCol = phase <= 1 ? 0 : phase >= 4 ? 3 : phase - 1; // 0(ny)→3(tilbud)

  useEffect(() => {
    const T: any[] = [];
    T.push(setTimeout(() => setPhase(1), 900));                 // lead lander i Ny
    T.push(setTimeout(() => setCursor({ x: colX(0) + COL_W / 2, y: 220 }), 1700));
    T.push(setTimeout(() => { setDown(true); setTimeout(() => setDown(false), 320); }, 2500));
    [2, 3, 4].forEach((p, k) => {
      T.push(setTimeout(() => {
        setPhase(p);
        setCursor({ x: colX(p - 1) + COL_W / 2, y: 220 });
        setForecast(f => f + 96000 + k * 8000);
      }, 3300 + k * 1500));
    });
    return () => T.forEach(clearTimeout);
  }, []); // eslint-disable-line

  const caption = phase <= 1
    ? { step: 'Lead inn', text: 'En huseier sender en forespørsel fra digihome.no. Den lander automatisk øverst i salgspipelinen — ingenting glipper i innboksen.' }
    : phase < 4
      ? { step: 'Salgspipeline', text: 'Forvalteren flytter leadet gjennom løpet — kontaktet, visning, tilbud. Den vektede prognosen oppdateres for hvert steg.' }
      : { step: 'Tilbud sendt', text: 'Leadet er nå klart for tilbud. Hele salgsløpet ligger i ett system — med treffsikker prognose.' };

  return (
    <>
      <AppWindow scale={scale}>
        {/* topbar */}
        <div className="px-7 pt-7 pb-4" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                <span className="text-[10px] tracking-[0.2em] uppercase font-bold" style={{ color: MUTED }}>Salg · Huseiere</span>
              </div>
              <h2 className="text-[24px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Pipeline</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: MUTED }}>Vektet prognose</p>
                <p className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: GREEN, fontFamily: FH }}>{Math.round(forecast).toLocaleString('nb-NO')} kr</p>
              </div>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: SOFT, color: INK2 }}><Search className="w-[18px] h-[18px]" strokeWidth={1.8} /></span>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: SOFT, color: INK2 }}><SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={1.8} /></span>
            </div>
          </div>
        </div>

        {/* kolonner */}
        <div className="absolute" style={{ top: 132, left: 0, right: 0, bottom: 0 }}>
          {STAGES.map((s, i) => (
            <div key={s.key} className="absolute top-0 bottom-0" style={{ left: colX(i), width: COL_W }}>
              <div className="flex items-center justify-between px-1 mb-3">
                <span className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: INK, fontFamily: FH }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />{s.label}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: MUTED, background: SOFT }}>{s.p}%</span>
              </div>
              <div className="rounded-2xl p-2 h-[calc(100%-44px)]" style={{ background: 'rgba(28,22,16,0.025)' }}>
                <div style={{ height: 82 }} />
                {(SEED[s.key] || []).map((c, k) => <LeadCard key={k} {...c} />)}
              </div>
            </div>
          ))}

          {/* fokus-kort (Anna) som beveger seg */}
          {phase >= 1 && (
            <div className="absolute z-20" style={{ left: colX(focusCol) + 8, top: 52, width: COL_W - 16, transition: 'left 0.95s cubic-bezier(0.5,0,0.2,1)' }}>
              <div className="rounded-xl px-3.5 py-3" style={{ background: '#fff', border: `1.5px solid ${ACCENT}`, boxShadow: '0 14px 30px -10px rgba(124,58,237,0.4)', animation: phase === 1 ? 'sf-pop 0.5s cubic-bezier(0.16,1,0.3,1)' : undefined }}>
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: '#f0e6fe', color: ACCENT }}>AB</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-none truncate" style={{ color: INK, fontFamily: FH }}>Anna Berg</p>
                    <p className="text-[11px] mt-1 leading-none truncate" style={{ color: MUTED, fontFamily: F }}>Camilla Colletts gate 14A</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[11px] font-medium" style={{ color: INK2 }}>16 800 kr/mnd</span>
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: ACCENT, background: '#f0e6fe' }}><Sparkles className="w-2.5 h-2.5" /> NY</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* «nytt lead» toast */}
        {phase >= 1 && phase < 3 && (
          <div className="absolute z-30" style={{ top: 24, right: 28, animation: 'sf-slidein 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: INK, color: '#fff', boxShadow: '0 16px 40px -12px rgba(20,15,10,0.5)' }}>
              <Mail className="w-4 h-4" style={{ color: LILAC }} strokeWidth={2} />
              <span className="text-[12.5px] font-medium" style={{ fontFamily: F }}>Nytt lead fra <b>digihome.no</b></span>
            </div>
          </div>
        )}

        <Cursor x={cursor.x} y={cursor.y} down={down} scale={scale} />
      </AppWindow>
      <Caption k={phase < 2 ? 0 : phase < 4 ? 1 : 2} step={caption.step} text={caption.text} />
    </>
  );
}

/* ── SCENE: tilbud + BankID ── */
function SceneProposal({ scale }: { scale: number }) {
  const [phase, setPhase] = useState(0); // 0 doc, 1 cursor→aksepter, 2 click, 3 bankid, 4 signed
  const [cursor, setCursor] = useState({ x: 980, y: 250 });
  const [down, setDown] = useState(false);

  useEffect(() => {
    const T: any[] = [];
    T.push(setTimeout(() => { setPhase(1); setCursor({ x: 740, y: 690 }); }, 2200));
    T.push(setTimeout(() => { setDown(true); setPhase(2); setTimeout(() => setDown(false), 340); }, 3500));
    T.push(setTimeout(() => setPhase(3), 4100));
    T.push(setTimeout(() => setPhase(4), 6600));
    return () => T.forEach(clearTimeout);
  }, []);

  const caption = phase < 3
    ? { step: 'Tilbud', text: 'Tilbudet genereres fra systemet — honorar, vilkår og bilag ferdig utfylt. Huseier åpner en lenke og ser et proft dokument.' }
    : phase < 4
      ? { step: 'Signering', text: 'I stedet for papir signerer huseier med BankID — juridisk bindende på sekunder.' }
      : { step: 'Avtale i havn', text: 'Avtalen er signert og lagret. Kunden og eiendommen opprettes automatisk — klar for utleie.' };

  return (
    <>
      <div className="relative" style={{ width: WIN_W * scale, height: WIN_H * scale }}>
        <div style={{ width: WIN_W, height: WIN_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 4px 10px rgba(20,15,10,0.05), 0 50px 110px rgba(20,15,10,0.2)', border: '1px solid #e4dfd6' }}>
          {/* browser chrome */}
          <div className="flex items-center gap-2 px-4" style={{ height: 44, background: '#f3efe9', borderBottom: `1px solid ${LINE}` }}>
            <span className="flex gap-1.5">{['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</span>
            <div className="ml-3 flex-1 max-w-[460px] h-7 rounded-lg flex items-center gap-2 px-3" style={{ background: '#fff', border: `1px solid ${LINE}` }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: GREEN }} />
              <span className="text-[12px]" style={{ color: MUTED, fontFamily: F }}>digihome.no/tilbud/anna-berg</span>
            </div>
          </div>

          {/* hero */}
          <div className="relative px-16 pt-12 pb-10" style={{ background: 'linear-gradient(135deg,#211c2b,#15121c)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] mb-4" style={{ color: LILAC, fontFamily: F }}>Forvaltningsavtale</p>
            <h1 className="font-light tracking-[-0.03em] leading-[0.98] text-white" style={{ fontFamily: FH, fontSize: 56 }}>Hei Anna,</h1>
            <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)', fontFamily: F }}>
              Takk for at du vurderer DigiHome. Vi tar hånd om alt det praktiske med utleien av <b style={{ color: '#fff' }}>Camilla Colletts gate 14A</b> — så beholder du full oversikt og avkastning.
            </p>
            <span className="inline-block mt-6 text-[11px] font-medium rounded-full px-3 py-1" style={{ color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.22)' }}>Gyldig til 5. juli 2026</span>
          </div>

          {/* honorar + tjeneste */}
          <div className="px-16 py-10 grid grid-cols-3 gap-5">
            <div className="rounded-2xl p-6 col-span-1" style={{ background: SOFT, border: `1px solid ${LINE}` }}>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: MUTED }}>Honorar</p>
              <p className="font-bold tracking-[-0.03em]" style={{ color: INK, fontFamily: FH, fontSize: 44 }}>8 %</p>
              <p className="text-[13px] mt-1" style={{ color: MUTED, fontFamily: F }}>av leieinntekt · ingen bindingstid</p>
            </div>
            <div className="rounded-2xl p-6 col-span-2" style={{ background: '#fff', border: `1px solid ${LINE}` }}>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: MUTED }}>Inkludert</p>
              {[['Trygg forvaltning', 'Juridisk trygge kontrakter, depositum etter husleieloven'], ['Full utleie', 'Prising, annonse, leietakere, visninger og screening'], ['Økonomi & rapport', 'Månedlige utbetalinger og ferdige bilag']].map(([t, d]) => (
                <div key={t} className="flex items-start gap-3 py-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#e7f7ee' }}><Check className="w-3 h-3" style={{ color: GREEN }} strokeWidth={3} /></span>
                  <div><p className="text-[14px] font-semibold leading-none" style={{ color: INK, fontFamily: FH }}>{t}</p><p className="text-[12.5px] mt-1" style={{ color: MUTED, fontFamily: F }}>{d}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* aksepter */}
          <div className="px-16 pb-12 flex justify-center">
            <button className="inline-flex items-center gap-2.5 h-14 px-9 rounded-full text-white font-semibold text-[16px]" style={{ background: phase >= 2 ? GREEN : INK, fontFamily: FH, boxShadow: phase === 1 ? `0 0 0 6px rgba(124,58,237,0.16)` : 'none', transition: 'all 0.3s ease' }}>
              {phase >= 2 ? <><Check className="w-5 h-5" strokeWidth={3} /> Tilbudet er akseptert</> : <>Aksepter tilbud <ArrowRight className="w-5 h-5" strokeWidth={2.4} /></>}
            </button>
          </div>

          {/* BankID overlay */}
          {phase >= 3 && (
            <div className="absolute inset-0 flex items-center justify-center z-40" style={{ background: 'rgba(15,12,20,0.55)', backdropFilter: 'blur(4px)', animation: 'sf-fade 0.4s ease both' }}>
              <div className="rounded-3xl px-12 py-11 text-center" style={{ background: '#fff', width: 460, boxShadow: '0 40px 100px rgba(0,0,0,0.4)', animation: 'sf-pop 0.45s cubic-bezier(0.16,1,0.3,1)' }}>
                {phase < 4 ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: '#0a0a0a' }}>
                      <span className="text-white font-bold text-[15px]" style={{ fontFamily: FH }}>BankID</span>
                    </div>
                    <h3 className="mt-6 text-[24px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Signerer med BankID …</h3>
                    <p className="mt-2 text-[14px]" style={{ color: MUTED, fontFamily: F }}>Bekreft i BankID-appen på telefonen.</p>
                    <div className="mt-7 h-1.5 rounded-full overflow-hidden" style={{ background: SOFT }}><div className="h-full rounded-full" style={{ background: ACCENT, animation: 'sf-load 2.4s linear forwards' }} /></div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: '#e7f7ee', animation: 'sf-pop 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
                      <Check className="w-9 h-9" style={{ color: GREEN }} strokeWidth={3} />
                    </div>
                    <h3 className="mt-6 text-[26px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Avtalen er signert</h3>
                    <p className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTED, fontFamily: F }}>Forvaltningsavtalen er juridisk bindende og sendt på e-post.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {phase < 3 && <Cursor x={cursor.x} y={cursor.y} down={down} scale={scale} />}
        </div>
      </div>
      <Caption k={phase < 3 ? 0 : phase < 4 ? 1 : 2} step={caption.step} text={caption.text} />
    </>
  );
}

/* ── SCENE: keynote ── */
function Keynote({ eyebrow, lines, sub }: { eyebrow: string; lines: string[]; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8" style={{ maxWidth: 1100 }}>
      <p className="text-[12px] font-bold uppercase tracking-[0.42em] mb-7" style={{ color: ACCENT, fontFamily: F, animation: 'sf-rise 0.7s ease 0.1s both' }}>{eyebrow}</p>
      <h2 className="font-bold tracking-[-0.04em] leading-[1.04]" style={{ color: INK, fontFamily: FH, fontSize: 'clamp(34px, 5vw, 66px)' }}>
        {lines.map((l, i) => (
          <span key={i} className="block" style={{ animation: `sf-blurup 0.85s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.16}s both` }}>{l}</span>
        ))}
      </h2>
      {sub && <p className="mt-8 text-[19px] leading-relaxed font-light" style={{ color: INK2, fontFamily: F, maxWidth: 720, animation: `sf-rise 0.8s ease ${0.3 + lines.length * 0.16}s both` }}>{sub}</p>}
    </div>
  );
}

/* ── scene-manifest (Akt 1) ── */
const SCENES = [
  { act: 'Akt 1 · Anskaffelse', type: 'keynote', dur: 5200, props: { eyebrow: 'Slik jobber en forvalter', lines: ['Det begynner med', 'en henvendelse.'], sub: 'En huseier vil leie ut boligen sin. Tradisjonelt drukner slike forespørsler i e-post og regneark — og de beste glipper.' } },
  { act: 'Akt 1 · Anskaffelse', type: 'pipeline', dur: 11500 },
  { act: 'Akt 1 · Anskaffelse', type: 'keynote', dur: 5200, props: { eyebrow: 'Painpoint', lines: ['Tilbud på papir', 'tar dager.'], sub: 'Normalt skrives forvaltningstilbud manuelt i Word og signeres på papir. DigiHome gjør det til minutter.' } },
  { act: 'Akt 1 · Anskaffelse', type: 'proposal', dur: 12000 },
  { act: 'Akt 1 · Anskaffelse', type: 'keynote', dur: 6000, props: { eyebrow: 'Akt 1 fullført', lines: ['Fra henvendelse', 'til signert avtale.'], sub: 'Hele salgsløpet — uten papir, uten regneark. Og nå tar systemet over driften.' } },
];

export default function SystemFilm() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.7);
  const last = SCENES.length - 1;

  useEffect(() => {
    const upd = () => {
      const availH = window.innerHeight - 250;
      const availW = window.innerWidth - 130;
      setScale(Math.max(0.4, Math.min(availH / WIN_H, availW / WIN_W, 0.92)));
    };
    upd(); window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    if (!playing || idx >= last) return;
    const t = setTimeout(() => setIdx(i => Math.min(i + 1, last)), SCENES[idx].dur);
    return () => clearTimeout(t);
  }, [idx, playing, last]);

  const next = useCallback(() => setIdx(i => Math.min(i + 1, last)), [last]);
  const prev = useCallback(() => setIdx(i => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const s = SCENES[idx];

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: BEIGE, fontFamily: F }}>
      {/* vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 80% at 50% 35%, transparent 55%, rgba(28,22,16,0.05) 100%)' }} />

      {/* topp: progress + act */}
      <div className="absolute top-0 left-0 right-0 z-50 px-8 pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.32em]" style={{ color: MUTED }}>Systemet</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.32em]" style={{ color: ACCENT }}>{s.act}</span>
        </div>
        <div className="flex gap-2">
          {SCENES.map((sc, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(28,22,16,0.10)' }}>
              <div style={{ height: '100%', background: ACCENT, width: i < idx ? '100%' : i === idx ? '0%' : '0%', animation: i === idx && playing ? `sf-fill ${sc.dur}ms linear forwards` : 'none', transform: i < idx ? 'none' : undefined }} className={i < idx ? 'sf-done' : ''} />
            </div>
          ))}
        </div>
      </div>

      {/* scene */}
      <div key={idx} className="absolute inset-0 flex items-center justify-center" style={{ animation: 'sf-scenein 0.6s ease both' }}>
        {s.type === 'keynote' && <Keynote {...(s.props as any)} />}
        {s.type === 'pipeline' && <ScenePipeline scale={scale} />}
        {s.type === 'proposal' && <SceneProposal scale={scale} />}
      </div>

      {/* kontroller */}
      <div className="absolute bottom-6 right-8 z-50 flex items-center gap-2">
        <button onClick={prev} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#fff', border: `1px solid ${LINE}`, color: INK }} aria-label="Forrige"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => setPlaying(p => !p)} className="w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: ACCENT }} aria-label="Spill/pause">{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
        <button onClick={next} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#fff', border: `1px solid ${LINE}`, color: INK }} aria-label="Neste"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <style>{`
        .sf-caret { display:inline-block; width:2px; height:1em; margin-left:2px; vertical-align:-2px; animation: sf-blink 1s step-end infinite; }
        .sf-done { width:100% !important; }
        @keyframes sf-blink { 50% { opacity:0; } }
        @keyframes sf-fill { from { width:0%; } to { width:100%; } }
        @keyframes sf-scenein { from { opacity:0; } to { opacity:1; } }
        @keyframes sf-blurup { from { opacity:0; transform: translateY(0.4em); filter: blur(12px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes sf-rise { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        @keyframes sf-pop { from { opacity:0; transform: scale(0.9); } to { opacity:1; transform: scale(1); } }
        @keyframes sf-slidein { from { opacity:0; transform: translateX(24px); } to { opacity:1; transform: translateX(0); } }
        @keyframes sf-fade { from { opacity:0; } to { opacity:1; } }
        @keyframes sf-ripple { from { opacity:0.8; transform: scale(0.4); } to { opacity:0; transform: scale(1.5); } }
        @keyframes sf-load { from { width:0%; } to { width:100%; } }
      `}</style>
    </div>
  );
}
