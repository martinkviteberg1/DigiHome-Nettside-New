'use client';
/**
 * SystemFilm — «Systemet»: filmatisk gjennomgang av DigiHome for forvaltere (B2B).
 *
 * Presentasjon: ÉN vedvarende scene-ramme. Narrasjonen («keynote»-tekst) skjer INNE i samme
 * ramme som produkt-mockupen — teksten ligger over en mykt sløret versjon av nettopp den skjermen
 * den introduserer, og forsvinner så for å avsløre den levende demoen. Ingen slide-bytter.
 *
 * DNA (kopiert fra ekte app): varm off-white #faf8f5, blekk #1a1612, taupe #6e6357, blekk-CTA,
 * lilla #cf97fc kun som liten aksent, varme pipeline-prikker, lyst/varmt tilbudsdokument.
 * Fonter: PP Right Grotesk (heading) + ABC Diatype (body) — allerede lastet i decket.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, SlidersHorizontal, LayoutDashboard, Gauge, MessageSquare, UserCheck, ClipboardList,
  CalendarDays, Radio, ClipboardCheck, Bot, Building2, Rocket, FileText, FileSignature, AlertCircle,
  Users, ChevronsUpDown, PanelLeftClose, Mail, Check, ArrowRight, ShieldCheck, Fingerprint, Unlock,
  Play, Pause, ChevronLeft, ChevronRight, MousePointer2, Sparkles,
  Camera, Upload, Wand2, Home, Ruler, BedDouble, Layers, MapPin, Star, Phone, CreditCard,
  KeyRound, Wallet, Receipt, Wrench, BarChart3, TrendingUp, CheckCircle2, Clock, Send, Banknote, Eye, Zap,
} from 'lucide-react';

/* ── DNA-tokens ── */
const CANVAS = '#faf8f5';
const SURF = '#ffffff';
const INK = '#1a1612';
const INK2 = '#3b342c';
const SUB = '#6e6357';
const FAINT = '#9a9183';
const WHISPER = '#c7bfb2';
const LINE = '#ece7dd';
const DIVIDER = '#e8e4df';
const ACTIVE = '#efe9e0';
const HOVER = '#f1ece5';
const LILAC = '#cf97fc';
const LILAC_TXT = '#6f54b4';
const LILAC_BG = 'rgba(207,151,252,0.12)';
const GOLD = '#b3a78f';
const SAND = '#d8c4a6';
const SUCCESS = '#3f7d52';
const SUCCESS_BG = 'rgba(63,125,82,0.09)';
const SIDE_BG = '#1a1a1a';
const BADGE = '#af6ee8';
const FH = "var(--font-heading), 'PP Right Grotesk', sans-serif";
const F = "var(--font-body), 'ABC Diatype', sans-serif";

const WIN_W = 1480;
const WIN_H = 832;
const SIDEBAR_W = 256;
const STAGE_DOT: Record<string, string> = { new: WHISPER, contacted: SAND, viewing: '#c9ad84', proposal: LILAC_TXT, signed: SUCCESS };

const NAV: any[] = [
  { sec: 'Arbeid' },
  { label: 'Oversikt', Icon: LayoutDashboard },
  { label: 'Operasjonssentral', Icon: Gauge, badge: 'Ny' },
  { label: 'Innboks', Icon: MessageSquare },
  { label: 'Leads', Icon: UserCheck, badge: 'Pro' },
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

const STAGES = [
  { key: 'new', label: 'Ny', p: 10 },
  { key: 'contacted', label: 'Kontaktet', p: 25 },
  { key: 'viewing', label: 'Visning', p: 50 },
  { key: 'proposal', label: 'Tilbud sendt', p: 75 },
  { key: 'signed', label: 'Akseptert', p: 100 },
];
const SEED: Record<string, { n: string; a: string; v: number }[]> = {
  new: [{ n: 'Ola Nyland', a: 'Møllergata 4', v: 14200 }],
  contacted: [{ n: 'Mariam Sayed', a: 'Bjørnsons gate 9', v: 11800 }, { n: 'Petter Five', a: 'Strandkaien 2', v: 9600 }],
  viewing: [{ n: 'Linn Haug', a: 'Nygårdsgaten 31', v: 16500 }],
  proposal: [{ n: 'Eivind Sørli', a: 'Kong Oscars gate 18', v: 13400 }],
  signed: [{ n: 'Hanne Borge', a: 'Fjellveien 7', v: 12900 }],
};

/* ── simulert markør ── */
function Cursor({ x, y, down }: { x: number; y: number; down: boolean }) {
  return (
    <div className="absolute z-50 pointer-events-none" style={{ left: x, top: y, transform: `translate(-3px,-2px) scale(${down ? 0.86 : 1})`, transition: 'left 0.85s cubic-bezier(0.5,0,0.2,1), top 0.85s cubic-bezier(0.5,0,0.2,1), transform 0.18s ease' }}>
      <MousePointer2 className="w-7 h-7" style={{ color: '#111', fill: '#fff', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35))' }} strokeWidth={1.5} />
      {down && <span className="absolute rounded-full" style={{ left: -11, top: -7, width: 28, height: 28, border: `2px solid ${INK}`, animation: 'sf-ripple 0.6s ease-out' }} />}
    </div>
  );
}

/* ── typewriter ── */
function Typewriter({ text, speed = 26, start = true }: { text: string; speed?: number; start?: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) { setN(0); return; }
    setN(0); let i = 0;
    const id = setInterval(() => { i++; setN(i); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [text, start, speed]);
  return <>{text.slice(0, n)}<span className="sf-caret" style={{ background: INK }} /></>;
}

/* ── ChatGPT-stil strømming (ord-for-ord m/ levende markør) ── */
function StreamText({ text, startDelay = 0, speed = 48, caret = true, caretColor = LILAC_TXT }: { text: string; startDelay?: number; speed?: number; caret?: boolean; caretColor?: string }) {
  const words = text.split(' ');
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0; let iv: any;
    const to = setTimeout(() => {
      iv = setInterval(() => { i++; setN(i); if (i >= words.length) clearInterval(iv); }, speed);
    }, startDelay);
    return () => { clearTimeout(to); if (iv) clearInterval(iv); };
  }, [text, startDelay, speed]); // eslint-disable-line
  const done = n >= words.length;
  return (
    <>
      {words.slice(0, n).join(' ')}{n > 0 && !done ? ' ' : ''}
      {caret && <i className="sf-cursor" style={{ background: caretColor, animation: done ? 'sf-blink 1.05s step-end infinite' : 'none', opacity: done ? undefined : 1 }} />}
    </>
  );
}

/* ── narrasjons-caption (ChatGPT-stil assistent som forklarer steget) ── */
function Caption({ step, text, k }: { step: string; text: string; k: number }) {
  return (
    <div key={k} className="absolute z-40" style={{ left: 44, bottom: 40, width: 560, animation: 'sf-capin 0.65s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div className="relative rounded-[20px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(24px) saturate(1.4)', boxShadow: '0 2px 8px rgba(26,22,18,0.04), 0 26px 70px -28px rgba(26,22,18,0.42)' }}>
        <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ background: 'linear-gradient(135deg,#e9c8ff,#b07cf0)', boxShadow: `0 0 12px ${LILAC}66` }}><Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.4} /></span>
          <span className="text-[12.5px] font-bold" style={{ color: INK, fontFamily: FH }}>DigiHome</span>
          <span className="w-1 h-1 rounded-full" style={{ background: WHISPER }} />
          <span className="text-[11px]" style={{ color: SUB, fontFamily: F }}>forklarer</span>
          <span className="ml-auto text-[9.5px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded-md" style={{ color: LILAC_TXT, background: LILAC_BG, fontFamily: F }}>{step}</span>
        </div>
        <p className="px-5 pt-3 pb-4 text-[17.5px] leading-[1.52]" style={{ color: INK, fontFamily: F, fontWeight: 450, letterSpacing: '-0.004em' }}><StreamText text={text} startDelay={180} speed={46} /></p>
      </div>
    </div>
  );
}

/* ── app-shell (mørk sidemeny + varm canvas) ── */
function AppShell({ children, active = 'Leads' }: { children: React.ReactNode; active?: string }) {
  return (
    <div className="absolute inset-0 flex" style={{ background: CANVAS }}>
      <div className="h-full flex flex-col shrink-0" style={{ width: SIDEBAR_W, background: SIDE_BG }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <span className="flex items-center gap-2 text-white font-bold text-[16px]" style={{ fontFamily: FH }}>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#1a1a1a]" style={{ background: 'linear-gradient(135deg,#e9c8ff,#b07cf0)' }}>H</span>digihome
          </span>
          <PanelLeftClose className="w-4 h-4" strokeWidth={1.6} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </div>
        <nav className="flex-1 px-2.5 overflow-hidden" style={{ paddingTop: 2 }}>
          {NAV.map((it, i) => {
            if (it.sec) return <p key={`s${i}`} className="text-[9.5px] font-semibold uppercase tracking-[0.16em] px-3 pt-[15px] pb-2" style={{ color: 'rgba(255,255,255,0.32)' }}>{it.sec}</p>;
            const A = it.label === active;
            return (
              <div key={it.label} className="relative flex items-center gap-3 rounded-xl px-3 py-[8px] text-[13px] font-medium mb-0.5" style={{ background: A ? 'linear-gradient(90deg, rgba(207,151,252,0.18), rgba(207,151,252,0.03))' : 'transparent', color: A ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {A && <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full" style={{ width: 4, height: 22, background: 'linear-gradient(180deg,#cf97fc,#7c5cff)', boxShadow: '0 0 12px rgba(207,151,252,0.6)' }} />}
                <it.Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={A ? 2.2 : 1.6} style={{ color: A ? LILAC : 'rgba(255,255,255,0.55)' }} />
                <span className="truncate">{it.label}</span>
                {it.badge && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: BADGE, background: 'rgba(175,110,232,0.12)' }}>{it.badge}</span>}
              </div>
            );
          })}
        </nav>
        <div className="shrink-0 p-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ border: '1px solid rgba(255,255,255,0.12)' }}><img src="/team/martin-kviteberg-face.jpg" alt="Martin" className="w-full h-full object-cover" /></span>
            <div className="min-w-0 flex-1"><p className="text-[12.5px] font-semibold leading-none truncate text-white">Martin Kviteberg</p><p className="text-[10.5px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.42)' }}>martin@kviteberg.no</p></div>
            <ChevronsUpDown className="w-4 h-4 shrink-0" strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function LeadCard({ n, a, v }: { n: string; a: string; v: number }) {
  return (
    <div className="rounded-xl px-3.5 py-3 mb-2.5" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(26,22,18,0.03)' }}>
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: ACTIVE, color: INK }}>{n.split(' ').map(s => s[0]).join('').slice(0, 2)}</span>
        <div className="min-w-0"><p className="text-[13px] font-semibold leading-none truncate" style={{ color: INK, fontFamily: FH }}>{n}</p><p className="text-[11px] mt-1 leading-none truncate" style={{ color: SUB, fontFamily: F }}>{a}</p></div>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11.5px] font-medium tabular-nums" style={{ color: INK2, fontFamily: F }}>{v.toLocaleString('nb-NO')} kr/mnd</span>
        <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: FAINT }}><Building2 className="w-3 h-3" strokeWidth={1.8} /> Leilighet</span>
      </div>
    </div>
  );
}

/* ── SURFACE: salgspipeline ── */
function PipelineSurface({ mode }: { mode: 'still' | 'live' }) {
  const MAIN_W = WIN_W - SIDEBAR_W;
  const PAD = 28, GAP = 14;
  const COL_W = Math.floor((MAIN_W - PAD * 2 - GAP * 4) / 5);
  const colX = (i: number) => PAD + i * (COL_W + GAP);
  const live = mode === 'live';
  const [phase, setPhase] = useState(live ? 0 : 0);
  const [forecast, setForecast] = useState(742000);
  const [cursor, setCursor] = useState({ x: colX(0) + COL_W / 2, y: 120 });
  const [down, setDown] = useState(false);
  const focusCol = phase <= 1 ? 0 : phase >= 4 ? 3 : phase - 1;

  useEffect(() => {
    if (!live) { setPhase(0); return; }
    const T: any[] = [];
    T.push(setTimeout(() => setPhase(1), 900));
    T.push(setTimeout(() => setCursor({ x: colX(0) + COL_W / 2, y: 220 }), 1700));
    T.push(setTimeout(() => { setDown(true); setTimeout(() => setDown(false), 320); }, 2500));
    [2, 3, 4].forEach((p, k) => T.push(setTimeout(() => { setPhase(p); setCursor({ x: colX(p - 1) + COL_W / 2, y: 220 }); setForecast(f => f + 96000 + k * 8000); }, 3300 + k * 1500)));
    return () => T.forEach(clearTimeout);
  }, [live]); // eslint-disable-line

  const showFocus = live ? phase >= 1 : true; // i still: vis Anna i Ny

  return (
    <AppShell>
      {/* topbar */}
      <div className="px-7 pt-7 pb-4" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC }} /><span className="text-[10px] tracking-[0.22em] uppercase font-bold" style={{ color: GOLD }}>Salg · Huseiere</span></div>
            <h2 className="text-[25px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Pipeline</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: GOLD }}>Vektet prognose</p><p className="text-[21px] font-bold tracking-[-0.02em] tabular-nums" style={{ color: INK, fontFamily: FH }}>{Math.round(forecast).toLocaleString('nb-NO')} kr</p></div>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: HOVER, color: INK2 }}><Search className="w-[18px] h-[18px]" strokeWidth={1.8} /></span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: HOVER, color: INK2 }}><SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={1.8} /></span>
          </div>
        </div>
      </div>

      {/* kolonner */}
      <div className="absolute" style={{ top: 132, left: 0, right: 0, bottom: 0 }}>
        {STAGES.map((s, i) => (
          <div key={s.key} className="absolute top-0 bottom-0" style={{ left: colX(i), width: COL_W }}>
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: INK, fontFamily: FH }}><span className="w-2 h-2 rounded-full" style={{ background: STAGE_DOT[s.key] }} />{s.label}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums" style={{ color: SUB, background: ACTIVE }}>{s.p}%</span>
            </div>
            <div className="rounded-2xl p-2 h-[calc(100%-44px)]" style={{ background: 'rgba(26,22,18,0.025)' }}>
              <div style={{ height: 82 }} />
              {(SEED[s.key] || []).map((c, k) => <LeadCard key={k} {...c} />)}
            </div>
          </div>
        ))}

        {showFocus && (
          <div className="absolute z-20" style={{ left: colX(focusCol) + 8, top: 52, width: COL_W - 16, transition: 'left 0.95s cubic-bezier(0.5,0,0.2,1)' }}>
            <div className="rounded-xl px-3.5 py-3" style={{ background: SURF, border: `1.5px solid ${LILAC}`, boxShadow: '0 14px 30px -12px rgba(111,84,180,0.35)', animation: live && phase === 1 ? 'sf-pop 0.5s cubic-bezier(0.16,1,0.3,1)' : undefined }}>
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: LILAC_BG, color: LILAC_TXT }}>AB</span>
                <div className="min-w-0"><p className="text-[13px] font-semibold leading-none truncate" style={{ color: INK, fontFamily: FH }}>Anna Berg</p><p className="text-[11px] mt-1 leading-none truncate" style={{ color: SUB, fontFamily: F }}>Camilla Colletts gate 14A</p></div>
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[11.5px] font-medium tabular-nums" style={{ color: INK2 }}>16 800 kr/mnd</span>
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: LILAC_TXT, background: LILAC_BG }}><Sparkles className="w-2.5 h-2.5" /> NY</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {live && phase >= 1 && phase < 3 && (
        <div className="absolute z-30" style={{ top: 24, right: 28, animation: 'sf-slidein 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: INK, color: '#fff', boxShadow: '0 16px 40px -12px rgba(26,22,18,0.5)' }}><Mail className="w-4 h-4" style={{ color: LILAC }} strokeWidth={2} /><span className="text-[12.5px] font-medium" style={{ fontFamily: F }}>Nytt lead fra <b>digihome.no</b></span></div>
        </div>
      )}

      {live && <Cursor x={cursor.x} y={cursor.y} down={down} />}
    </AppShell>
  );
}

/* ── SURFACE: tilbud (varmt, lyst dokument) + BankID ── */
const TRUST: [any, string][] = [[ShieldCheck, 'Juridisk trygt'], [Fingerprint, 'BankID-signering'], [Unlock, 'Ingen bindingstid']];
function ProposalSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const [phase, setPhase] = useState(0); // 0 doc, 1 cursor→aksepter, 2 click, 3 bankid, 4 signed
  const [cursor, setCursor] = useState({ x: 1180, y: 250 });
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!live) { setPhase(0); return; }
    const T: any[] = [];
    T.push(setTimeout(() => { setPhase(1); setCursor({ x: 740, y: 690 }); }, 2200));
    T.push(setTimeout(() => { setDown(true); setPhase(2); setTimeout(() => setDown(false), 340); }, 3500));
    T.push(setTimeout(() => setPhase(3), 4100));
    T.push(setTimeout(() => setPhase(4), 6600));
    return () => T.forEach(clearTimeout);
  }, [live]);

  return (
    <div className="absolute inset-0" style={{ background: '#FEFBFA' }}>
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-4" style={{ height: 44, background: '#f3efe9', borderBottom: `1px solid ${LINE}` }}>
        <span className="flex gap-1.5">{['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</span>
        <div className="ml-3 flex-1 max-w-[480px] h-7 rounded-lg flex items-center gap-2 px-3" style={{ background: '#fff', border: `1px solid ${LINE}` }}><ShieldCheck className="w-3.5 h-3.5" style={{ color: SUCCESS }} /><span className="text-[12px]" style={{ color: SUB, fontFamily: F }}>digihome.no/tilbud/anna-berg</span></div>
      </div>

      <div className="px-20 pt-12 pb-10" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <p className="uppercase font-semibold text-center" style={{ fontFamily: FH, fontSize: 11, letterSpacing: '0.26em', color: GOLD }}>Forvaltningsavtale</p>
        <h1 className="font-semibold tracking-[-0.025em] mt-3 text-center leading-tight" style={{ fontFamily: FH, fontSize: 40, color: INK }}>Avtale om forvaltning av utleie</h1>
        <p className="mt-5 mx-auto text-center" style={{ fontSize: 16.5, lineHeight: 1.7, color: INK2, maxWidth: 600, fontFamily: F }}>
          Hei Anna — takk for at du vurderer DigiHome. Vi tar hånd om alt det praktiske med utleien av <b style={{ color: INK }}>Camilla Colletts gate 14A</b>, så du beholder oversikt og avkastning.
        </p>

        {/* honorar-kort */}
        <div className="mt-10 rounded-[24px] overflow-hidden grid grid-cols-5" style={{ border: `1px solid ${LINE}`, background: SURF }}>
          <div className="col-span-2 p-7" style={{ background: '#faf7f2', borderRight: `1px solid ${LINE}` }}>
            <p className="uppercase font-semibold" style={{ fontSize: 10.5, letterSpacing: '0.18em', color: GOLD, fontFamily: FH }}>Honorar</p>
            <p className="font-semibold tracking-[-0.03em] mt-2 tabular-nums" style={{ color: INK, fontFamily: FH, fontSize: 52 }}>8 %</p>
            <p className="text-[13.5px] mt-1" style={{ color: SUB, fontFamily: F }}>av leieinntekt · ingen bindingstid</p>
            <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between"><span className="text-[13px]" style={{ color: SUB, fontFamily: F }}>Leie est.</span><span className="text-[13.5px] font-semibold tabular-nums" style={{ color: INK2, fontFamily: FH }}>16 800 kr/mnd</span></div>
              <div className="flex items-center justify-between mt-2"><span className="text-[13px]" style={{ color: SUB, fontFamily: F }}>Netto til deg</span><span className="text-[14px] font-semibold tabular-nums" style={{ color: INK, fontFamily: FH }}>15 456 kr/mnd</span></div>
            </div>
          </div>
          <div className="col-span-3 p-7">
            <p className="uppercase font-semibold mb-3" style={{ fontSize: 10.5, letterSpacing: '0.18em', color: GOLD, fontFamily: FH }}>Inkludert</p>
            {[['Full utleie', 'Prising, annonse på FINN, visninger og screening'], ['Trygg forvaltning', 'Juridiske kontrakter og depositum etter husleieloven'], ['Økonomi & rapport', 'Månedlige utbetalinger og ferdige bilag']].map(([t, d]) => (
              <div key={t} className="flex items-start gap-3 py-2"><span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: SUCCESS_BG }}><Check className="w-3 h-3" style={{ color: SUCCESS }} strokeWidth={3} /></span><div><p className="text-[14.5px] font-semibold leading-none" style={{ color: INK, fontFamily: FH }}>{t}</p><p className="text-[12.5px] mt-1" style={{ color: SUB, fontFamily: F }}>{d}</p></div></div>
            ))}
          </div>
        </div>

        {/* trust + aksepter */}
        <div className="mt-9 flex items-center justify-center gap-7">
          {TRUST.map(([Ic, t]) => <span key={t} className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: SUB, fontFamily: F }}><Ic className="w-4 h-4" style={{ color: GOLD }} strokeWidth={1.8} />{t}</span>)}
        </div>
        <div className="mt-7 flex justify-center">
          <button className="inline-flex items-center gap-2.5 h-14 px-9 rounded-full font-semibold text-[16px]" style={{ background: phase >= 2 ? SUCCESS : INK, color: '#fff', fontFamily: FH, boxShadow: live && phase === 1 ? `0 0 0 6px ${LILAC_BG}` : '0 12px 30px -12px rgba(26,22,18,0.4)', transition: 'all 0.3s ease' }}>
            {phase >= 2 ? <><Check className="w-5 h-5" strokeWidth={3} /> Tilbudet er akseptert</> : <>Aksepter tilbud <ArrowRight className="w-5 h-5" strokeWidth={2.4} /></>}
          </button>
        </div>
      </div>

      {live && phase >= 3 && (
        <div className="absolute inset-0 flex items-center justify-center z-40" style={{ background: 'rgba(26,22,18,0.5)', backdropFilter: 'blur(4px)', animation: 'sf-fade 0.4s ease both' }}>
          <div className="rounded-3xl px-12 py-11 text-center" style={{ background: '#fff', width: 460, boxShadow: '0 40px 100px rgba(0,0,0,0.4)', animation: 'sf-pop 0.45s cubic-bezier(0.16,1,0.3,1)' }}>
            {phase < 4 ? (
              <><div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: '#0a0a0a' }}><span className="text-white font-bold text-[15px]" style={{ fontFamily: FH }}>BankID</span></div><h3 className="mt-6 text-[24px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Signerer med BankID …</h3><p className="mt-2 text-[14px]" style={{ color: SUB, fontFamily: F }}>Bekreft i BankID-appen på telefonen.</p><div className="mt-7 h-1.5 rounded-full overflow-hidden" style={{ background: ACTIVE }}><div className="h-full rounded-full" style={{ background: INK, animation: 'sf-load 2.4s linear forwards' }} /></div></>
            ) : (
              <><div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: SUCCESS_BG, animation: 'sf-pop 0.5s cubic-bezier(0.16,1,0.3,1)' }}><Check className="w-9 h-9" style={{ color: SUCCESS }} strokeWidth={3} /></div><h3 className="mt-6 text-[26px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Avtalen er signert</h3><p className="mt-2 text-[14px] leading-relaxed" style={{ color: SUB, fontFamily: F }}>Juridisk bindende og sendt på e-post. Kunden opprettes automatisk.</p></>
            )}
          </div>
        </div>
      )}

      {live && phase < 3 && <Cursor x={cursor.x} y={cursor.y} down={down} />}
    </div>
  );
}

/* ── delt: app-topbar ── */
function TopBar({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="px-7 pt-7 pb-4" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC }} /><span className="text-[10px] tracking-[0.22em] uppercase font-bold" style={{ color: GOLD }}>{eyebrow}</span></div>
          <h2 className="text-[25px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>{title}</h2>
        </div>
        {right}
      </div>
    </div>
  );
}

/* ── delt: toast ── */
function Toast({ Icon, children, accent = LILAC }: { Icon: any; children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: INK, color: '#fff', boxShadow: '0 16px 40px -12px rgba(26,22,18,0.5)' }}>
      <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={2} /><span className="text-[12.5px] font-medium" style={{ fontFamily: F }}>{children}</span>
    </div>
  );
}

function useStaged(live: boolean, marks: number[], rest: number) {
  const [phase, setPhase] = useState(live ? 0 : rest);
  useEffect(() => {
    if (!live) { setPhase(rest); return; }
    setPhase(0);
    const T = marks.map((ms, i) => setTimeout(() => setPhase(i + 1), ms));
    return () => T.forEach(clearTimeout);
  }, [live]); // eslint-disable-line
  return phase;
}

/* ════════ AKT 2 · KLARGJØRING ════════ */
const PHOTOS = [
  { label: 'Stue', src: '/film/photos/stue.jpg' },
  { label: 'Kjøkken', src: '/film/photos/kjokken.jpg' },
  { label: 'Soverom', src: '/film/photos/soverom.jpg' },
];
const GALLERY = ['/film/photos/stue.jpg', '/film/photos/kjokken.jpg', '/film/photos/soverom.jpg', '/film/photos/bad.jpg', '/film/photos/kjokken2.jpg', '/film/photos/soverom2.jpg'];
const EXT = ['/film/photos/ext1.jpg', '/film/photos/ext3.jpg', '/film/photos/ext5.jpg', '/film/photos/ext4.jpg', '/film/photos/ext2.jpg', '/film/photos/kjokken.jpg'];
function Photo({ src, style }: { src: string; style?: React.CSSProperties }) {
  return <img src={src} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={style} />;
}
const FIELDS: [any, string, string][] = [
  [Home, 'Boligtype', 'Leilighet'], [Ruler, 'Areal', '74 m²'], [BedDouble, 'Soverom', '3'],
  [Layers, 'Etasje', '4. etasje'], [CalendarDays, 'Byggeår', '1899'],
];
const FACILITIES = ['Balkong', 'Heis', 'Oppvaskmaskin', 'Peis', 'Kabel-TV', 'Bod'];
function RegistrerSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [700, 2400, 4200, 7000], 4); // 1 upload,2 scan,3 fields,4 styled
  return (
    <AppShell active="Utleieprosesser">
      <TopBar eyebrow="Ny utleie · Camilla Colletts gate 14A" title="Registrer boligen"
        right={<span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold" style={{ background: LILAC_BG, color: LILAC_TXT, fontFamily: FH }}><Wand2 className="w-4 h-4" strokeWidth={2} /> AI-registrering</span>} />
      <div className="absolute" style={{ top: 116, left: 28, right: 28, bottom: 28 }}>
        <div className="grid h-full" style={{ gridTemplateColumns: '1.05fr 1fr', gap: 22 }}>
          {/* venstre: bilder + scan */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: SURF, border: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2 mb-4"><Camera className="w-4 h-4" style={{ color: SUB }} strokeWidth={1.8} /><span className="text-[12.5px] font-semibold" style={{ color: INK, fontFamily: FH }}>Bilder lastet opp</span><span className="ml-auto text-[11px] tabular-nums" style={{ color: FAINT }}>{p >= 1 ? '3 / 3' : '0 / 3'}</span></div>
            <div className="grid grid-cols-3 gap-3 relative" style={{ zIndex: 1 }}>
              {PHOTOS.map((ph, i) => (
                <div key={ph.label} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', boxShadow: 'inset 0 0 0 1px rgba(26,22,18,0.05)', opacity: p >= 1 ? 1 : 0.25, transition: `opacity 0.5s ease ${i * 0.12}s`, filter: p >= 4 ? 'saturate(1.08) contrast(1.03)' : 'saturate(0.92) brightness(0.97)' }}>
                  <Photo src={ph.src} />
                  <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 flex items-center justify-between" style={{ background: 'linear-gradient(to top, rgba(20,16,12,0.7), transparent)' }}>
                    <span className="text-[10px] font-semibold text-white" style={{ fontFamily: FH }}>{ph.label}</span>
                    {p >= 1 && <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: SUCCESS }}><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></span>}
                  </div>
                  {p === 2 && <div className="absolute inset-x-0 h-10 z-10" style={{ background: `linear-gradient(to bottom, transparent, ${LILAC}66, transparent)`, animation: 'sf-scan 1.6s ease-in-out infinite' }} />}
                </div>
              ))}
            </div>
            {p >= 4 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: LILAC_BG, animation: 'sf-rise 0.5s ease both' }}>
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: LILAC_TXT }} strokeWidth={2} /><span className="text-[12px] font-medium" style={{ color: LILAC_TXT, fontFamily: F }}>Bildene er stylet for visning</span>
              </div>
            )}
            {p === 2 && <div className="absolute left-5 right-5 bottom-5 flex items-center gap-2 text-[12px] font-medium" style={{ color: LILAC_TXT, fontFamily: F }}><span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent inline-block" style={{ animation: 'sf-spin 0.8s linear infinite' }} />Gjenkjenner rom og fasiliteter …</div>}
          </div>
          {/* høyre: auto-utfylte data */}
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: SURF, border: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: SUCCESS }} /><span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: GOLD }}>Hentet automatisk</span></div>
            <h3 className="text-[19px] font-bold tracking-[-0.01em] mb-4" style={{ color: INK, fontFamily: FH }}>Boligdata</h3>
            <div className="space-y-px">
              {FIELDS.map(([Ic, k, v], i) => (
                <div key={k} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < FIELDS.length - 1 ? `1px solid ${LINE}` : 'none', opacity: p >= 3 ? 1 : 0, transform: p >= 3 ? 'none' : 'translateY(6px)', transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s` }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: ACTIVE }}><Ic className="w-4 h-4" style={{ color: INK2 }} strokeWidth={1.8} /></span>
                  <span className="text-[13px]" style={{ color: SUB, fontFamily: F }}>{k}</span>
                  <span className="ml-auto text-[14px] font-semibold tabular-nums" style={{ color: INK, fontFamily: FH }}>{v}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold mt-5 mb-2.5" style={{ color: GOLD }}>Fasiliteter</p>
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map((f, i) => (
                <span key={f} className="text-[12px] font-medium px-3 py-1.5 rounded-full" style={{ background: HOVER, color: INK2, fontFamily: F, opacity: p >= 3 ? 1 : 0, transform: p >= 3 ? 'none' : 'scale(0.9)', transition: `all 0.4s ease ${0.5 + i * 0.07}s` }}>{f}</span>
              ))}
            </div>
            <button className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full font-semibold text-[13.5px]" style={{ background: p >= 4 ? INK : ACTIVE, color: p >= 4 ? '#fff' : FAINT, fontFamily: FH, transition: 'all 0.4s ease' }}>Bekreft og fortsett <ArrowRight className="w-4 h-4" strokeWidth={2.4} /></button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── FINN-publisering (browser) ── */
function FinnSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [2600, 4200], 2); // 1 publiserer, 2 publisert
  return (
    <div className="absolute inset-0" style={{ background: '#f4f4f4' }}>
      <div className="flex items-center gap-2 px-4" style={{ height: 44, background: '#e9e9ea', borderBottom: '1px solid #dadada' }}>
        <span className="flex gap-1.5">{['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</span>
        <div className="ml-3 flex-1 max-w-[440px] h-7 rounded-lg flex items-center gap-2 px-3" style={{ background: '#fff', border: '1px solid #dadada' }}><ShieldCheck className="w-3.5 h-3.5" style={{ color: SUCCESS }} /><span className="text-[12px]" style={{ color: '#555', fontFamily: F }}>finn.no/realestate/lettings/...</span></div>
        <span className="ml-3 font-black text-[15px] tracking-tight" style={{ color: '#0063fb' }}>FINN</span>
      </div>
      <div className="px-12 pt-8 pb-8" style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* galleri */}
        <div className="grid gap-2.5 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: '2fr 1fr 1fr', height: 340 }}>
          <div className="row-span-2 relative overflow-hidden">
            <Photo src={GALLERY[0]} />
            <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.94)', color: INK, fontFamily: FH }}>Til leie</span>
          </div>
          <div className="relative overflow-hidden"><Photo src={GALLERY[1]} /></div>
          <div className="relative overflow-hidden"><Photo src={GALLERY[3]} /></div>
          <div className="relative overflow-hidden"><Photo src={GALLERY[2]} /></div>
          <div className="relative overflow-hidden"><Photo src={GALLERY[4]} /><span className="absolute bottom-2.5 right-2.5 text-[10.5px] font-semibold px-2 py-1 rounded-md flex items-center gap-1" style={{ background: 'rgba(20,16,12,0.66)', color: '#fff' }}><Camera className="w-3 h-3" /> 24 bilder</span></div>
        </div>
        {/* annonse-tekst */}
        <div className="flex items-start justify-between mt-7">
          <div className="max-w-[600px]">
            <h1 className="text-[30px] font-bold tracking-[-0.02em] leading-tight" style={{ color: '#1a1a1a', fontFamily: FH }}>Lys og nyoppusset 3-roms i Møhlenpris</h1>
            <p className="flex items-center gap-1.5 mt-2 text-[14px]" style={{ color: '#555', fontFamily: F }}><MapPin className="w-4 h-4" strokeWidth={1.8} /> Camilla Colletts gate 14A, 5006 Bergen</p>
            <div className="flex gap-6 mt-5">
              {[['Leie', '16 800 kr'], ['Areal', '74 m²'], ['Soverom', '3'], ['Type', 'Leilighet']].map(([k, v]) => (
                <div key={k}><p className="text-[11px] uppercase tracking-[0.1em]" style={{ color: '#888', fontFamily: F }}>{k}</p><p className="text-[16px] font-bold mt-0.5 tabular-nums" style={{ color: '#1a1a1a', fontFamily: FH }}>{v}</p></div>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2" style={{ background: LILAC_BG, color: LILAC_TXT }}><Wand2 className="w-3 h-3" /> Skrevet av DigiHome</span>
            <p className="text-[12px]" style={{ color: '#888', fontFamily: F }}>Annonsert av</p>
            <p className="text-[15px] font-bold" style={{ color: INK, fontFamily: FH }}>digihome</p>
          </div>
        </div>
      </div>
      {/* publiser-status */}
      {live && (
        <div className="absolute z-40" style={{ bottom: 110, left: '50%', transform: 'translateX(-50%)', width: 460 }}>
          <div className="rounded-2xl px-6 py-5" style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 28px 70px -20px rgba(26,22,18,0.32)', animation: 'sf-rise 0.5s ease both' }}>
            <p className="text-[12px] uppercase tracking-[0.16em] font-bold mb-3" style={{ color: GOLD }}>{p >= 2 ? 'Publisert · 2 kanaler' : 'Publiserer …'}</p>
            {[['FINN.no', '#0063fb'], ['din-utleieside.no', LILAC_TXT]].map(([t, c], i) => (
              <div key={t} className="flex items-center gap-3 py-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: p >= 2 ? SUCCESS_BG : ACTIVE }}>
                  {p >= 2 ? <Check className="w-3.5 h-3.5" style={{ color: SUCCESS }} strokeWidth={3} /> : <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent inline-block" style={{ color: FAINT, animation: 'sf-spin 0.8s linear infinite' }} />}
                </span>
                <span className="text-[14px] font-semibold" style={{ color: INK, fontFamily: FH }}>{t as string}</span>
                {p >= 2 && <span className="ml-auto text-[11px] font-medium" style={{ color: SUCCESS }}>Live</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════ AKT 3 · INTERESSE → LEIETAKER ════════ */
const SLOTS = [
  { t: 'I dag · 17:00', cap: 6 }, { t: 'I dag · 17:30', cap: 6 }, { t: 'I morgen · 18:00', cap: 6 },
];
function VisningerSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [800, 2200, 3600, 5200], 4);
  const interested = live ? (p >= 4 ? 48 : p >= 3 ? 42 : p >= 2 ? 37 : 31) : 48;
  const booked = [live ? (p >= 1 ? 5 : 3) : 6, live ? (p >= 2 ? 4 : 2) : 5, live ? (p >= 3 ? 3 : 1) : 4];
  return (
    <AppShell active="Reservasjoner">
      <TopBar eyebrow="Visninger · Camilla Colletts gate 14A" title="Booking & oppmøte"
        right={<div className="text-right"><p className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: GOLD }}>Interesserte</p><p className="text-[21px] font-bold tabular-nums" style={{ color: INK, fontFamily: FH, transition: 'all 0.3s' }}>{interested}</p></div>} />
      <div className="absolute" style={{ top: 116, left: 28, right: 28, bottom: 28 }}>
        <div className="grid grid-cols-3 gap-4">
          {SLOTS.map((s, i) => {
            const full = booked[i] >= s.cap;
            return (
              <div key={s.t} className="rounded-2xl p-5" style={{ background: SURF, border: `1px solid ${full ? LILAC : LINE}`, boxShadow: full ? '0 14px 30px -14px rgba(111,84,180,0.3)' : '0 1px 2px rgba(26,22,18,0.03)', transition: 'all 0.5s ease' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: INK, fontFamily: FH }}><CalendarDays className="w-4 h-4" style={{ color: SUB }} strokeWidth={1.8} />{s.t}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums" style={{ background: full ? LILAC_BG : ACTIVE, color: full ? LILAC_TXT : SUB }}>{booked[i]}/{s.cap}</span>
                </div>
                <div className="flex gap-1.5 mb-3">
                  {Array.from({ length: s.cap }).map((_, k) => <span key={k} className="flex-1 h-1.5 rounded-full" style={{ background: k < booked[i] ? LILAC : LINE, transition: `background 0.4s ease ${k * 0.05}s` }} />)}
                </div>
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(booked[i], 5) }).map((_, k) => <span key={k} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white" style={{ background: ACTIVE, color: INK2 }}>{String.fromCharCode(65 + ((i * 3 + k) % 26))}{String.fromCharCode(72 + ((i + k) % 12))}</span>)}
                  {full && <span className="ml-3 self-center text-[11px] font-semibold" style={{ color: LILAC_TXT }}>Fullbooket</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 rounded-2xl p-5" style={{ background: 'rgba(26,22,18,0.025)' }}>
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold mb-3" style={{ color: GOLD }}>Automatisk aktivitet</p>
          <div className="space-y-2.5">
            {[[CheckCircle2, 'Bekreftelse sendt til 13 påmeldte', SUCCESS, p >= 1], [Send, 'SMS-påminnelse planlagt 1 t før visning', LILAC_TXT, p >= 2], [UserCheck, 'Oppmøte registreres på visningsdagen', INK2, p >= 3]].map(([Ic, t, c, on]: any, i) => (
              <div key={i} className="flex items-center gap-3" style={{ opacity: on ? 1 : 0.3, transform: on ? 'none' : 'translateX(-6px)', transition: 'all 0.5s ease' }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: SURF, border: `1px solid ${LINE}` }}><Ic className="w-4 h-4" style={{ color: c }} strokeWidth={2} /></span>
                <span className="text-[13.5px]" style={{ color: INK2, fontFamily: F }}>{t}</span>
                {on && <Check className="ml-auto w-4 h-4" style={{ color: SUCCESS }} strokeWidth={2.6} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const CANDIDATES = [
  { n: 'Sofie Lind', score: 94, inc: '5,9× leie', credit: 'Godkjent', rec: true },
  { n: 'Jonas Eide', score: 88, inc: '4,7× leie', credit: 'Godkjent', rec: false },
  { n: 'Maria Holm', score: 81, inc: '4,1× leie', credit: 'Godkjent', rec: false },
  { n: 'Tobias Aas', score: 72, inc: '3,4× leie', credit: 'Merknad', rec: false },
];
function ScreeningSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [700, 1600, 2500, 3400, 5200], 5); // 1-4 score-fyll, 5 anbefaling
  return (
    <AppShell active="Personer">
      <TopBar eyebrow="Screening · 48 søkere" title="Kandidater & scoring"
        right={<span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold" style={{ background: HOVER, color: INK2, fontFamily: FH }}><ShieldCheck className="w-4 h-4" style={{ color: GOLD }} strokeWidth={1.8} /> Creditsafe</span>} />
      <div className="absolute" style={{ top: 116, left: 28, right: 28, bottom: 28 }}>
        <div className="space-y-3">
          {CANDIDATES.map((c, i) => {
            const reveal = live ? p >= i + 1 : true;
            const isRec = c.rec && (live ? p >= 5 : true);
            return (
              <div key={c.n} className="rounded-2xl px-5 py-4 flex items-center gap-5" style={{ background: SURF, border: `1px solid ${isRec ? LILAC : LINE}`, boxShadow: isRec ? '0 16px 36px -16px rgba(111,84,180,0.35)' : '0 1px 2px rgba(26,22,18,0.03)', transition: 'all 0.5s ease' }}>
                <span className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0" style={{ background: isRec ? LILAC_BG : ACTIVE, color: isRec ? LILAC_TXT : INK }}>{c.n.split(' ').map(s => s[0]).join('')}</span>
                <div className="w-[150px] shrink-0">
                  <p className="text-[15px] font-bold leading-none" style={{ color: INK, fontFamily: FH }}>{c.n}</p>
                  {isRec && <span className="inline-flex items-center gap-1 text-[10.5px] font-bold mt-1.5 px-2 py-0.5 rounded-full" style={{ background: LILAC_BG, color: LILAC_TXT, animation: 'sf-pop 0.4s ease both' }}><Star className="w-2.5 h-2.5" fill="currentColor" /> ANBEFALT</span>}
                </div>
                <div className="flex-1 flex items-center gap-6">
                  <div className="flex items-center gap-2 w-[150px]"><TrendingUp className="w-4 h-4 shrink-0" style={{ color: SUB }} strokeWidth={1.8} /><span className="text-[13px]" style={{ color: INK2, fontFamily: F }}>Inntekt <b style={{ fontFamily: FH }}>{c.inc}</b></span></div>
                  <div className="flex items-center gap-2 w-[150px]"><span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: c.credit === 'Godkjent' ? SUCCESS_BG : 'rgba(179,167,143,0.18)' }}>{c.credit === 'Godkjent' ? <Check className="w-2.5 h-2.5" style={{ color: SUCCESS }} strokeWidth={3} /> : <AlertCircle className="w-3 h-3" style={{ color: GOLD }} />}</span><span className="text-[13px]" style={{ color: INK2, fontFamily: F }}>Kreditt {c.credit}</span></div>
                </div>
                <div className="flex items-center gap-3 shrink-0 w-[190px]">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: ACTIVE }}><div className="h-full rounded-full" style={{ width: reveal ? `${c.score}%` : '0%', background: isRec ? `linear-gradient(90deg,${LILAC},${LILAC_TXT})` : INK2, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} /></div>
                  <span className="text-[20px] font-bold tabular-nums w-[46px] text-right" style={{ color: isRec ? LILAC_TXT : INK, fontFamily: FH, opacity: reveal ? 1 : 0, transition: 'opacity 0.5s ease 0.3s' }}>{reveal ? c.score : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

/* ════════ AKT 4 · INNGÅELSE ════════ */
function KontraktSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [2000, 4400, 6800], 3); // 1 signerer, 2 signert, 3 depositum
  return (
    <div className="absolute inset-0" style={{ background: '#FEFBFA' }}>
      <div className="flex items-center gap-2 px-4" style={{ height: 44, background: '#f3efe9', borderBottom: `1px solid ${LINE}` }}>
        <span className="flex gap-1.5">{['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</span>
        <div className="ml-3 flex-1 max-w-[480px] h-7 rounded-lg flex items-center gap-2 px-3" style={{ background: '#fff', border: `1px solid ${LINE}` }}><ShieldCheck className="w-3.5 h-3.5" style={{ color: SUCCESS }} /><span className="text-[12px]" style={{ color: SUB, fontFamily: F }}>digihome.no/kontrakt/sofie-lind</span></div>
      </div>
      <div className="px-20 pt-10 pb-8" style={{ maxWidth: 980, margin: '0 auto' }}>
        <p className="uppercase font-semibold text-center" style={{ fontFamily: FH, fontSize: 11, letterSpacing: '0.26em', color: GOLD }}>Leiekontrakt · husleieloven</p>
        <h1 className="font-semibold tracking-[-0.025em] mt-3 text-center leading-tight" style={{ fontFamily: FH, fontSize: 36, color: INK }}>Tidsbestemt leieavtale</h1>
        <div className="mt-8 rounded-[22px] overflow-hidden grid grid-cols-3" style={{ border: `1px solid ${LINE}`, background: SURF }}>
          {[['Leietaker', 'Sofie Lind'], ['Leie', '16 800 kr/mnd'], ['Varighet', '12 mnd'], ['Depositum', '50 400 kr'], ['Overtakelse', '01.07.2026'], ['Bolig', 'C. Colletts gate 14A']].map(([k, v], i) => (
            <div key={k} className="p-5" style={{ borderRight: i % 3 !== 2 ? `1px solid ${LINE}` : 'none', borderTop: i >= 3 ? `1px solid ${LINE}` : 'none' }}>
              <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: GOLD, fontFamily: FH }}>{k}</p>
              <p className="text-[16px] font-bold mt-1.5 tabular-nums" style={{ color: INK, fontFamily: FH }}>{v}</p>
            </div>
          ))}
        </div>
        {/* depositum-status */}
        <div className="mt-6 rounded-2xl px-6 py-4 flex items-center gap-4" style={{ background: p >= 3 ? SUCCESS_BG : '#faf7f2', border: `1px solid ${p >= 3 ? 'rgba(63,125,82,0.25)' : LINE}`, transition: 'all 0.5s ease' }}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: p >= 3 ? SUCCESS : ACTIVE }}>{p >= 3 ? <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} /> : <Banknote className="w-5 h-5" style={{ color: SUB }} strokeWidth={1.8} />}</span>
          <div className="flex-1"><p className="text-[14.5px] font-bold" style={{ color: INK, fontFamily: FH }}>{p >= 3 ? 'Depositumskonto opprettet' : 'Depositumskonto · klar til oppretting'}</p><p className="text-[12.5px] mt-0.5" style={{ color: SUB, fontFamily: F }}>Via bankintegrasjon — ingen kapital fryses manuelt.</p></div>
          {p >= 3 && <Check className="w-5 h-5" style={{ color: SUCCESS }} strokeWidth={3} />}
        </div>
        <div className="mt-7 flex justify-center">
          <button className="inline-flex items-center gap-2.5 h-14 px-9 rounded-full font-semibold text-[16px]" style={{ background: p >= 2 ? SUCCESS : INK, color: '#fff', fontFamily: FH, boxShadow: '0 12px 30px -12px rgba(26,22,18,0.4)', transition: 'all 0.3s ease' }}>
            {p >= 2 ? <><Check className="w-5 h-5" strokeWidth={3} /> Signert med BankID</> : <><Fingerprint className="w-5 h-5" strokeWidth={2} /> Signer med BankID</>}
          </button>
        </div>
      </div>
      {live && p === 1 && (
        <div className="absolute inset-0 flex items-center justify-center z-40" style={{ background: 'rgba(26,22,18,0.5)', backdropFilter: 'blur(4px)', animation: 'sf-fade 0.4s ease both' }}>
          <div className="rounded-3xl px-12 py-11 text-center" style={{ background: '#fff', width: 440, boxShadow: '0 40px 100px rgba(0,0,0,0.4)', animation: 'sf-pop 0.45s cubic-bezier(0.16,1,0.3,1)' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: '#0a0a0a' }}><span className="text-white font-bold text-[15px]" style={{ fontFamily: FH }}>BankID</span></div>
            <h3 className="mt-6 text-[23px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Begge parter signerer …</h3>
            <p className="mt-2 text-[14px]" style={{ color: SUB, fontFamily: F }}>Leietaker bekrefter i BankID-appen.</p>
            <div className="mt-7 h-1.5 rounded-full overflow-hidden" style={{ background: ACTIVE }}><div className="h-full rounded-full" style={{ background: INK, animation: 'sf-load 2.2s linear forwards' }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

const REPORT = [['Stue', 'God stand'], ['Kjøkken', 'God stand'], ['Bad', 'Normal slitasje'], ['Soverom', 'God stand']];
const PORTAL = [[FileText, 'Leiekontrakt'], [Wallet, 'Husleie & betaling'], [MessageSquare, 'Meldinger'], [Wrench, 'Meld en sak']];
function InnflyttingSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [800, 1800, 2800, 3800, 5400], 5); // rapport-haker + nøkkel + portal
  return (
    <AppShell active="Leieforhold">
      <TopBar eyebrow="Innflytting · Sofie Lind" title="Overtakelse"
        right={<span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold" style={{ background: live && p >= 4 ? SUCCESS_BG : HOVER, color: live && p >= 4 ? SUCCESS : INK2, fontFamily: FH, transition: 'all 0.4s' }}><KeyRound className="w-4 h-4" strokeWidth={1.8} /> {live && p >= 4 ? 'Nøkler overlevert' : 'Nøkkeloverlevering'}</span>} />
      <div className="absolute" style={{ top: 116, left: 28, right: 28, bottom: 28 }}>
        <div className="grid h-full" style={{ gridTemplateColumns: '1.1fr 1fr', gap: 22 }}>
          {/* tilstandsrapport */}
          <div className="rounded-2xl p-6" style={{ background: SURF, border: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2 mb-1"><ClipboardCheck className="w-4 h-4" style={{ color: SUB }} strokeWidth={1.8} /><span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: GOLD }}>Digital tilstandsrapport</span></div>
            <h3 className="text-[19px] font-bold tracking-[-0.01em] mb-4" style={{ color: INK, fontFamily: FH }}>Signert av begge parter</h3>
            <div className="space-y-2.5">
              {REPORT.map(([room, state], i) => {
                const on = live ? p >= i + 1 : true;
                return (
                  <div key={room} className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: HOVER, opacity: on ? 1 : 0.4, transition: `opacity 0.45s ease` }}>
                    <span className="w-9 h-9 rounded-lg shrink-0 relative overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px rgba(26,22,18,0.06)' }}><Photo src={PHOTOS[i % 3].src} /></span>
                    <div className="flex-1"><p className="text-[13.5px] font-semibold leading-none" style={{ color: INK, fontFamily: FH }}>{room}</p><p className="text-[11.5px] mt-1" style={{ color: SUB, fontFamily: F }}>{state} · 2 bilder</p></div>
                    {on && <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: SUCCESS_BG, animation: 'sf-pop 0.35s ease both' }}><Check className="w-3.5 h-3.5" style={{ color: SUCCESS }} strokeWidth={3} /></span>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* leietakerportal */}
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: live && p >= 5 ? INK : '#201d19', transition: 'background 0.5s' }}>
            <div className="flex items-center gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC }} /><span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Leietakerportal</span></div>
            <h3 className="text-[19px] font-bold tracking-[-0.01em] mb-1 text-white" style={{ fontFamily: FH }}>Sofie er onboardet</h3>
            <p className="text-[12.5px] mb-5" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: F }}>Egen innlogging med alt på ett sted.</p>
            <div className="grid grid-cols-2 gap-3">
              {PORTAL.map(([Ic, t]: any, i) => {
                const on = live ? p >= 5 : true;
                return (
                  <div key={t} className="rounded-xl px-4 py-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(8px)', transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s` }}>
                    <Ic className="w-5 h-5 mb-2.5" style={{ color: LILAC }} strokeWidth={1.8} />
                    <p className="text-[13px] font-semibold text-white" style={{ fontFamily: FH }}>{t}</p>
                  </div>
                );
              })}
            </div>
            {live && p >= 5 && <div className="mt-5 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(63,125,82,0.18)', animation: 'sf-rise 0.5s ease both' }}><CheckCircle2 className="w-4 h-4" style={{ color: '#6fcf8f' }} strokeWidth={2} /><span className="text-[12.5px] font-medium text-white" style={{ fontFamily: F }}>Velkomstpakke sendt på e-post</span></div>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ════════ AKT 5 · DRIFT ════════ */
function DriftSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [900, 2400, 4000, 6000], 4); // husleie, oppgjør, sak melde, sak løst
  const caseStep = live ? Math.min(p, 4) : 4;
  return (
    <AppShell active="Oversikt">
      <TopBar eyebrow="Drift · Camilla Colletts gate 14A" title="Økonomi & saker" />
      <div className="absolute" style={{ top: 116, left: 28, right: 28, bottom: 28 }}>
        {/* KPI-rad */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[['Husleie innkrevd', '16 800 kr', live ? p >= 1 : true, Banknote], ['Utbetalt til huseier', '15 456 kr', live ? p >= 2 : true, Wallet], ['Honorar (8 %)', '1 344 kr', live ? p >= 2 : true, Receipt]].map(([k, v, on, Ic]: any, i) => (
            <div key={k} className="rounded-2xl p-5" style={{ background: SURF, border: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between mb-3"><span className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: GOLD }}>{k}</span><Ic className="w-4 h-4" style={{ color: SUB }} strokeWidth={1.8} /></div>
              <p className="text-[26px] font-bold tracking-[-0.02em] tabular-nums" style={{ color: INK, fontFamily: FH }}>{v}</p>
              <p className="flex items-center gap-1.5 text-[11.5px] mt-1.5" style={{ color: on ? SUCCESS : FAINT, fontFamily: F, transition: 'color 0.4s' }}>{on ? <><Check className="w-3 h-3" strokeWidth={3} /> Automatisk</> : <><Clock className="w-3 h-3" /> Planlagt</>}</p>
            </div>
          ))}
        </div>
        {/* oppgjørsbanner */}
        <div className="rounded-2xl px-5 py-3.5 mb-4 flex items-center gap-3" style={{ background: live && p >= 2 ? LILAC_BG : 'rgba(26,22,18,0.025)', transition: 'background 0.5s' }}>
          <FileText className="w-4 h-4 shrink-0" style={{ color: LILAC_TXT }} strokeWidth={1.8} />
          <span className="text-[13px] font-medium" style={{ color: INK2, fontFamily: F }}>Månedlig oppgjør med ferdige bilag og rapport sendt til huseier</span>
          {live && p >= 2 && <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: SURF, color: LILAC_TXT }}>PDF klar</span>}
        </div>
        {/* sak-tidslinje */}
        <div className="rounded-2xl p-5" style={{ background: SURF, border: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-2 mb-4"><AlertCircle className="w-4 h-4" style={{ color: SUB }} strokeWidth={1.8} /><span className="text-[12.5px] font-semibold" style={{ color: INK, fontFamily: FH }}>Sak · Dryppende kran på bad</span><span className="ml-auto text-[11px]" style={{ color: FAINT }}>meldt av Sofie</span></div>
          <div className="flex items-center">
            {[[MessageSquare, 'Meldt'], [Bot, 'AI analyserer'], [Wrench, 'Rørlegger tildelt'], [CheckCircle2, 'Løst & dokumentert']].map(([Ic, t]: any, i) => {
              const done = caseStep > i + 1, act = caseStep === i + 1;
              return (
                <React.Fragment key={t}>
                  <div className="flex flex-col items-center" style={{ width: 120 }}>
                    <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: done ? SUCCESS_BG : act ? LILAC_BG : ACTIVE, transition: 'all 0.4s' }}>
                      {done ? <Check className="w-4 h-4" style={{ color: SUCCESS }} strokeWidth={3} /> : act && i === 1 ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent inline-block" style={{ color: LILAC_TXT, animation: 'sf-spin 0.8s linear infinite' }} /> : <Ic className="w-4 h-4" style={{ color: act ? LILAC_TXT : FAINT }} strokeWidth={2} />}
                    </span>
                    <span className="text-[11px] font-medium mt-2 text-center" style={{ color: done || act ? INK2 : FAINT, fontFamily: F }}>{t}</span>
                  </div>
                  {i < 3 && <div className="flex-1 h-0.5 rounded-full -mt-5" style={{ background: caseStep > i + 1 ? SUCCESS : LINE, transition: 'background 0.5s' }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ════════ FINALE · SKALA ════════ */
const PROPS = [
  { a: 'C. Colletts gate 14A', s: 'Utleid', c: SUCCESS }, { a: 'Nygårdsgaten 31', s: 'Visning', c: LILAC_TXT },
  { a: 'Strandkaien 2', s: 'Utleid', c: SUCCESS }, { a: 'Fjellveien 7', s: 'Utleid', c: SUCCESS },
  { a: 'Møllergata 4', s: 'Annonsert', c: GOLD }, { a: 'Kong Oscars gate 18', s: 'Utleid', c: SUCCESS },
];
const INTEG = ['BankID', 'FINN', 'Creditsafe', 'Vipps', 'DNB'];
function PortefoljeSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [700, 2200], 2);
  return (
    <AppShell active="Eiendommer">
      <TopBar eyebrow="Portefølje · hele teamet" title="Oversikt"
        right={<div className="flex -space-x-2">{['MK', 'AS', 'TL', 'EH'].map((t, i) => <span key={t} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white" style={{ background: ACTIVE, color: INK2 }}>{t}</span>)}<span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white" style={{ background: INK, color: '#fff' }}>+9</span></div>} />
      <div className="absolute" style={{ top: 116, left: 28, right: 28, bottom: 28 }}>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[['Eiendommer', '124'], ['Belegg', '97 %'], ['Månedlig inntekt', '2,1 M kr'], ['Aktive prosesser', '8']].map(([k, v], i) => (
            <div key={k} className="rounded-2xl p-5" style={{ background: SURF, border: `1px solid ${LINE}` }}>
              <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: GOLD }}>{k}</p>
              <p className="text-[28px] font-bold tracking-[-0.02em] tabular-nums" style={{ color: INK, fontFamily: FH }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3.5 mb-4">
          {PROPS.map((pr, i) => (
            <div key={pr.a} className="rounded-2xl overflow-hidden" style={{ background: SURF, border: `1px solid ${LINE}`, opacity: live ? (p >= 1 ? 1 : 0) : 1, transform: live && p < 1 ? 'translateY(10px)' : 'none', transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s` }}>
              <div className="h-20 relative overflow-hidden"><Photo src={EXT[i % EXT.length]} /><span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.94)', color: pr.c, fontFamily: FH }}>{pr.s}</span></div>
              <div className="px-3.5 py-3"><p className="text-[13px] font-semibold leading-none truncate" style={{ color: INK, fontFamily: FH }}>{pr.a}</p><p className="text-[11px] mt-1.5" style={{ color: SUB, fontFamily: F }}>Bergen · Leilighet</p></div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: 'rgba(26,22,18,0.025)' }}>
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold shrink-0" style={{ color: GOLD }}>Integrasjoner</span>
          <div className="flex items-center gap-2.5 flex-wrap">
            {INTEG.map((t, i) => <span key={t} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: SURF, border: `1px solid ${LINE}`, color: INK2, fontFamily: FH, opacity: live ? (p >= 2 ? 1 : 0.3) : 1, transition: `opacity 0.4s ease ${i * 0.07}s` }}><Zap className="w-3 h-3" style={{ color: LILAC_TXT }} />{t}</span>)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ════════ INTRO · oversiktskart over hele utleieflyten ════════ */
const FLOW: { n: string; Icon: any; t: string; mods: string[] }[] = [
  { n: '01', Icon: UserCheck, t: 'Anskaffelse', mods: ['Lead-pipeline', 'Tilbud', 'BankID'] },
  { n: '02', Icon: Sparkles, t: 'Klargjøring', mods: ['AI-boligdata', 'Bildestudio', 'FINN'] },
  { n: '03', Icon: CalendarDays, t: 'Interesse', mods: ['Visninger', 'Screening', 'Scoring'] },
  { n: '04', Icon: FileSignature, t: 'Inngåelse', mods: ['Kontrakt', 'Depositum', 'Innflytting'] },
  { n: '05', Icon: Wallet, t: 'Drift', mods: ['Husleie', 'Oppgjør', 'Saker'] },
  { n: '06', Icon: BarChart3, t: 'Skala', mods: ['Portefølje', 'Team', 'API'] },
];
function OversiktSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const p = useStaged(live, [300, 650, 1000, 1350, 1700, 2050, 2700], 7);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: CANVAS }}>
      <div className="absolute pointer-events-none" style={{ top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 1000, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${LILAC}14 0%, transparent 70%)`, filter: 'blur(40px)' }} />
      {/* header */}
      <div className="absolute flex items-center justify-between" style={{ left: 56, right: 56, top: 44 }}>
        <span className="flex items-center gap-2.5 font-bold text-[19px]" style={{ color: INK, fontFamily: FH }}><span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-[15px]" style={{ background: 'linear-gradient(135deg,#cf97fc,#7c5cff)' }}>H</span>digihome<span className="ml-1 text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: GOLD, fontFamily: F }}>· Operativsystem</span></span>
        <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12.5px] font-bold" style={{ background: LILAC_BG, color: LILAC_TXT, fontFamily: F }}><span className="w-2 h-2 rounded-full" style={{ background: LILAC_TXT, boxShadow: `0 0 8px ${LILAC_TXT}` }} />Autopilot aktiv</span>
      </div>
      {/* tittel */}
      <div className="absolute text-center" style={{ left: 0, right: 0, top: 138 }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: GOLD, fontFamily: F }}>Hele utleieflyten · ett system</p>
        <h2 className="text-[34px] font-bold tracking-[-0.025em]" style={{ color: INK, fontFamily: FH }}>Fra henvendelse til daglig drift</h2>
      </div>
      {/* flyt */}
      <div className="absolute flex items-start" style={{ left: 56, right: 56, top: 300 }}>
        {FLOW.map((f, i) => {
          const on = live ? p >= i + 1 : true;
          const lineOn = live ? p >= i + 2 : true;
          return (
            <React.Fragment key={f.t}>
              <div className="flex flex-col items-center" style={{ width: 168, opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(14px)', transition: 'all 0.55s cubic-bezier(0.16,1,0.3,1)' }}>
                <div className="relative w-[68px] h-[68px] rounded-2xl flex items-center justify-center" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 10px 26px -12px rgba(111,84,180,0.32)' }}>
                  <f.Icon className="w-7 h-7" style={{ color: LILAC_TXT }} strokeWidth={1.7} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: INK, color: '#fff', fontFamily: FH }}>{f.n}</span>
                </div>
                <p className="text-[16px] font-bold mt-3.5 tracking-[-0.01em]" style={{ color: INK, fontFamily: FH }}>{f.t}</p>
                <div className="flex flex-col items-center gap-1.5 mt-2.5">
                  {f.mods.map((m, k) => <span key={m} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: HOVER, color: SUB, fontFamily: F, opacity: on ? 1 : 0, transition: `opacity 0.4s ease ${0.25 + k * 0.08}s` }}>{m}</span>)}
                </div>
              </div>
              {i < FLOW.length - 1 && (
                <div className="relative flex-1" style={{ height: 2, marginTop: 33 }}>
                  <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(90deg, ${LILAC}, ${LILAC_TXT})`, transformOrigin: 'left', transform: lineOn ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
                  {live && lineOn && <span className="absolute w-1.5 h-1.5 rounded-full" style={{ top: -2, background: '#fff', boxShadow: `0 0 8px 2px ${LILAC}`, animation: `sf-flow 1.8s linear ${i * 0.2}s infinite` }} />}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* autopilot-rail */}
      <div className="absolute" style={{ left: 56, right: 56, bottom: 70, opacity: live ? (p >= 7 ? 1 : 0) : 1, transform: live && p < 7 ? 'translateY(10px)' : 'none', transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="rounded-2xl px-6 py-4 flex items-center gap-5" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 18px 44px -24px rgba(26,22,18,0.3)' }}>
          <span className="inline-flex items-center gap-2 text-[13px] font-bold shrink-0" style={{ color: INK, fontFamily: FH }}><Bot className="w-4 h-4" style={{ color: LILAC_TXT }} strokeWidth={1.9} />Automatisert ende-til-ende</span>
          <span className="w-px h-6" style={{ background: LINE }} />
          <span className="text-[11px] uppercase tracking-[0.16em] font-bold shrink-0" style={{ color: GOLD }}>Integrasjoner</span>
          <div className="flex items-center gap-2 flex-wrap">
            {['BankID', 'FINN', 'Creditsafe', 'Vipps', 'DNB', 'Fiken'].map(t => <span key={t} className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: '#faf8f5', border: `1px solid ${LINE}`, color: INK2, fontFamily: FH }}><Zap className="w-3 h-3" style={{ color: LILAC_TXT }} />{t}</span>)}
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-bold shrink-0" style={{ color: SUCCESS, fontFamily: F }}><span className="w-2 h-2 rounded-full" style={{ background: SUCCESS }} />Drift 24/7</span>
        </div>
      </div>
    </div>
  );
}

/* ════════ NETTSIDE · huseier fyller ut skjema på digihome.no ════════ */
function NettsideSurface({ mode }: { mode: 'still' | 'live' }) {
  const live = mode === 'live';
  const [phase, setPhase] = useState(live ? 0 : 0); // 0 idle,1 adresse,2 valgt,3 navn,4 tlf,5 hover CTA,6 sendt
  const [cursor, setCursor] = useState({ x: 1180, y: 540 });
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!live) { setPhase(0); return; }
    setPhase(0); setCursor({ x: 1180, y: 540 });
    const T: any[] = [];
    T.push(setTimeout(() => { setPhase(1); setCursor({ x: 1120, y: 293 }); }, 650));
    T.push(setTimeout(() => { setDown(true); setTimeout(() => setDown(false), 280); }, 2500)); // velg forslag
    T.push(setTimeout(() => setPhase(2), 2700));
    T.push(setTimeout(() => { setPhase(3); setCursor({ x: 1120, y: 377 }); }, 3300));
    T.push(setTimeout(() => { setPhase(4); setCursor({ x: 1120, y: 461 }); }, 4700));
    T.push(setTimeout(() => { setPhase(5); setCursor({ x: 1120, y: 540 }); }, 6000));
    T.push(setTimeout(() => { setDown(true); setPhase(6); setTimeout(() => setDown(false), 340); }, 6700));
    return () => T.forEach(clearTimeout);
  }, [live]);

  const field = (icon: any, y: number, label: string, active: boolean, filled: boolean, inner: React.ReactNode) => {
    const Ic = icon;
    return (
      <div className="absolute" style={{ left: 28, right: 28, top: y }}>
        <p className="text-[11px] font-semibold mb-1.5" style={{ color: SUB, fontFamily: F }}>{label}</p>
        <div className="flex items-center gap-2.5 h-[50px] px-3.5 rounded-xl" style={{ background: active ? '#fff' : '#faf8f5', border: `1.5px solid ${active ? LILAC : LINE}`, boxShadow: active ? `0 0 0 4px ${LILAC_BG}` : 'none', transition: 'all 0.3s ease' }}>
          <Ic className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} style={{ color: filled || active ? LILAC_TXT : FAINT }} />
          <span className="text-[14.5px] truncate" style={{ color: filled ? INK : FAINT, fontFamily: F }}>{inner}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0" style={{ background: CANVAS }}>
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-4" style={{ height: 44, background: '#efebe4', borderBottom: `1px solid ${LINE}` }}>
        <span className="flex gap-1.5">{['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</span>
        <div className="ml-3 flex-1 max-w-[420px] h-7 rounded-lg flex items-center gap-2 px-3" style={{ background: '#fff', border: `1px solid ${LINE}` }}><ShieldCheck className="w-3.5 h-3.5" style={{ color: SUCCESS }} /><span className="text-[12px]" style={{ color: SUB, fontFamily: F }}>digihome.no</span></div>
      </div>
      {/* site nav */}
      <div className="flex items-center justify-between px-12" style={{ height: 64, borderBottom: `1px solid ${LINE}` }}>
        <span className="flex items-center gap-2 font-bold text-[18px]" style={{ color: INK, fontFamily: FH }}><span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white text-[14px]" style={{ background: 'linear-gradient(135deg,#cf97fc,#7c5cff)' }}>H</span>digihome</span>
        <div className="flex items-center gap-7">
          {['Forvaltning', 'Utleie', 'Priser', 'Om oss'].map(l => <span key={l} className="text-[14px] font-medium" style={{ color: SUB, fontFamily: F }}>{l}</span>)}
          <span className="inline-flex items-center h-9 px-4 rounded-full text-[13.5px] font-semibold" style={{ background: INK, color: '#fff', fontFamily: FH }}>Logg inn</span>
        </div>
      </div>

      {/* hero venstre */}
      <div className="absolute" style={{ left: 96, top: 196, width: 560 }}>
        <div className="flex items-center gap-2 mb-5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC }} /><span className="text-[12px] font-bold uppercase tracking-[0.26em]" style={{ color: GOLD, fontFamily: F }}>Utleie på autopilot</span></div>
        <h1 className="font-bold tracking-[-0.04em] leading-[0.98]" style={{ color: INK, fontFamily: FH, fontSize: 62 }}>Lei ut boligen.<br />Vi gjør resten.</h1>
        <p className="mt-6 text-[18px] leading-[1.6]" style={{ color: SUB, fontFamily: F, maxWidth: 470 }}>Send oss adressen. Vi tar oss av prising, annonsering, visninger, kontrakt og drift — og du får utbetaling hver måned.</p>
        <div className="flex items-center gap-5 mt-7">
          {[[ShieldCheck, 'BankID-signering'], [Unlock, 'Ingen bindingstid'], [Wallet, 'Fast utbetaling']].map(([Ic, t]: any) => (
            <span key={t} className="inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: INK2, fontFamily: F }}><Ic className="w-4 h-4" style={{ color: GOLD }} strokeWidth={1.8} />{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-8">
          <span className="flex items-center gap-0.5">{[0, 1, 2, 3, 4].map(i => <Star key={i} className="w-4 h-4" style={{ color: SAND }} fill="currentColor" strokeWidth={0} />)}</span>
          <span className="text-[13px] font-semibold" style={{ color: INK2, fontFamily: F }}>4,9</span>
          <span className="text-[13px]" style={{ color: FAINT, fontFamily: F }}>· forvalter 124 boliger i Bergen</span>
        </div>
      </div>

      {/* form-kort høyre */}
      <div className="absolute" style={{ left: 880, top: 150, width: 480 }}>
        <div className="relative rounded-[26px]" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 2px 6px rgba(26,22,18,0.04), 0 40px 90px -34px rgba(26,22,18,0.4)', minHeight: 470 }}>
          <div className="px-7 pt-7 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: LILAC_TXT, fontFamily: F }}>Kom i gang</p>
            <h3 className="text-[24px] font-bold tracking-[-0.02em] mt-1.5" style={{ color: INK, fontFamily: FH }}>Få et uforpliktende tilbud</h3>
          </div>
          {phase < 6 ? (
            <>
              {field(MapPin, 118, 'Adresse', phase === 1, phase >= 1,
                phase >= 2 ? 'Camilla Colletts gate 14A, 5006 Bergen' : phase >= 1 ? <Typewriter text="Camilla Colletts gate 14A" /> : 'Søk etter adressen din')}
              {field(Users, 202, 'Fullt navn', phase === 3, phase >= 3, phase >= 3 ? <Typewriter text="Anna Berg" /> : 'Navnet ditt')}
              {field(Phone, 286, 'Telefon', phase === 4, phase >= 4, phase >= 4 ? <Typewriter text="934 11 802" /> : 'Telefonnummer')}
              <div className="absolute" style={{ left: 28, right: 28, top: 370 }}>
                <button className="w-full h-[54px] rounded-full inline-flex items-center justify-center gap-2 text-[16px] font-semibold" style={{ background: INK, color: '#fff', fontFamily: FH, boxShadow: phase === 5 ? `0 0 0 6px ${LILAC_BG}, 0 14px 30px -12px rgba(26,22,18,0.5)` : '0 10px 24px -12px rgba(26,22,18,0.4)', transform: down ? 'scale(0.98)' : 'none', transition: 'all 0.2s ease' }}>Send inn <ArrowRight className="w-5 h-5" strokeWidth={2.4} /></button>
                <p className="text-center text-[11.5px] mt-3" style={{ color: FAINT, fontFamily: F }}>Gratis og uforpliktende · svar innen 24 timer</p>
              </div>
              {/* autocomplete dropdown */}
              {phase === 1 && (
                <div className="absolute z-20" style={{ left: 28, right: 28, top: 200, animation: 'sf-rise 0.3s ease both' }}>
                  <div className="rounded-xl overflow-hidden" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 20px 44px -18px rgba(26,22,18,0.32)' }}>
                    {[['Camilla Colletts gate 14A', '5006 Bergen'], ['Camilla Colletts gate 14B', '5006 Bergen'], ['Camilla Colletts gate 9', '5006 Bergen']].map(([a, b], i) => (
                      <div key={a} className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ background: i === 0 ? HOVER : 'transparent', borderBottom: i < 2 ? `1px solid ${LINE}` : 'none' }}>
                        <MapPin className="w-4 h-4 shrink-0" style={{ color: i === 0 ? LILAC_TXT : FAINT }} strokeWidth={1.8} />
                        <span className="text-[13.5px] font-medium" style={{ color: INK, fontFamily: F }}>{a}</span>
                        <span className="text-[12px]" style={{ color: FAINT, fontFamily: F }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-8 py-10 text-center" style={{ animation: 'sf-fade 0.5s ease both' }}>
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: SUCCESS_BG, animation: 'sf-pop 0.5s cubic-bezier(0.16,1,0.3,1)' }}><Check className="w-9 h-9" style={{ color: SUCCESS }} strokeWidth={3} /></div>
              <h3 className="mt-6 text-[26px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Takk, Anna!</h3>
              <p className="mt-3 text-[15px] leading-relaxed mx-auto" style={{ color: SUB, fontFamily: F, maxWidth: 320 }}>Vi har mottatt henvendelsen for <b style={{ color: INK }}>Camilla Colletts gate 14A</b>. En rådgiver tar kontakt innen 24 timer.</p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: LILAC_BG }}><Sparkles className="w-4 h-4" style={{ color: LILAC_TXT }} strokeWidth={2} /><span className="text-[12.5px] font-semibold" style={{ color: LILAC_TXT, fontFamily: F }}>Sendt rett inn i systemet</span></div>
            </div>
          )}
        </div>
      </div>

      {live && phase >= 6 && (
        <div className="absolute z-30" style={{ top: 80, right: 32, animation: 'sf-slidein 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
          <Toast Icon={Mail}>Nytt lead lagt i <b>pipelinen</b></Toast>
        </div>
      )}
      {live && phase < 6 && <Cursor x={cursor.x} y={cursor.y} down={down} />}
    </div>
  );
}


/* ── surface-register ── */
const SURFACES: Record<string, (p: { mode: 'still' | 'live' }) => JSX.Element> = {
  oversikt: OversiktSurface, nettside: NettsideSurface, pipeline: PipelineSurface, proposal: ProposalSurface, registrer: RegistrerSurface, finn: FinnSurface,
  visninger: VisningerSurface, screening: ScreeningSurface, kontrakt: KontraktSurface,
  innflytting: InnflyttingSurface, drift: DriftSurface, portefolje: PortefoljeSurface,
};


/* ── sentrert forklaring (Apple keynote — midt i bildet, toner bort når produktet kommer i fokus) ── */
function CenterNarration({ step, text, gone }: { step: string; text: string; gone: boolean }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-24"
      style={{
        background: 'radial-gradient(125% 100% at 50% 48%, rgba(250,248,245,0.94) 0%, rgba(250,248,245,0.9) 40%, rgba(250,248,245,0.76) 72%, rgba(250,248,245,0.55) 100%)',
        backdropFilter: 'blur(3px)',
        opacity: gone ? 0 : 1,
        transform: gone ? 'translateY(-26px) scale(0.992)' : 'none',
        transition: 'opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: 'none',
      }}>
      <div className="absolute pointer-events-none" style={{ width: 700, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${LILAC}1c 0%, transparent 70%)`, filter: 'blur(30px)' }} />
      <div className="relative flex items-center gap-2.5 mb-6" style={{ animation: 'sf-rise 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC, boxShadow: `0 0 10px ${LILAC}` }} />
        <span className="text-[12px] font-bold uppercase tracking-[0.32em]" style={{ color: LILAC_TXT, fontFamily: F }}>{step}</span>
      </div>
      <p className="relative font-semibold tracking-[-0.022em]" style={{ color: INK, fontFamily: FH, fontSize: 38, lineHeight: 1.3, maxWidth: 940 }}>
        <StreamText text={text} startDelay={250} speed={40} />
      </p>
    </div>
  );
}

/* ── keynote-overlay (inne i rammen, over sløret surface — Apple keynote, levende skriving) ── */
function KeynoteOverlay({ eyebrow, lines, sub, hero = false }: { eyebrow: string; lines: string[]; sub?: string; hero?: boolean }) {
  let wi = -1;
  const totalWords = lines.join(' ').split(' ').length;
  const subDelay = Math.round(totalWords * 90 + (hero ? 800 : 600));
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-20"
      style={{ background: 'radial-gradient(120% 95% at 50% 46%, rgba(250,248,245,0.95) 0%, rgba(250,248,245,0.92) 36%, rgba(250,248,245,0.8) 68%, rgba(250,248,245,0.6) 100%)', backdropFilter: 'blur(3px)' }}>
      <div className="absolute pointer-events-none" style={{ width: hero ? 880 : 720, height: hero ? 440 : 360, borderRadius: '50%', background: `radial-gradient(circle, ${LILAC}${hero ? '26' : '1f'} 0%, transparent 70%)`, filter: 'blur(34px)', animation: 'sf-fade 1.4s ease both' }} />
      {hero ? (
        <div className="relative flex items-center gap-2.5 mb-9" style={{ animation: 'sf-rise 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white text-[17px] font-bold" style={{ background: 'linear-gradient(135deg,#cf97fc,#7c5cff)', fontFamily: FH, boxShadow: `0 8px 24px -6px ${LILAC}` }}>H</span>
          <span className="text-[20px] font-bold tracking-[-0.01em]" style={{ color: INK, fontFamily: FH }}>digihome</span>
        </div>
      ) : (
        <div className="relative flex items-center gap-2.5 mb-7" style={{ animation: 'sf-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC, boxShadow: `0 0 10px ${LILAC}` }} />
          <span className="text-[12.5px] font-bold uppercase tracking-[0.36em]" style={{ color: SUB, fontFamily: F }}>{eyebrow}</span>
        </div>
      )}
      <h2 className="relative font-bold tracking-[-0.045em]" style={{ color: INK, fontFamily: FH, fontSize: hero ? 94 : 76, lineHeight: 1.0 }}>
        {lines.map((l, li) => {
          const ws = l.split(' ');
          return (
            <span key={li} className="block">
              {ws.map((w, k) => { wi += 1; const d = 0.25 + wi * (hero ? 0.11 : 0.09); return <span key={k} style={{ display: 'inline-block', whiteSpace: 'pre', animation: `sf-wordblur ${hero ? 0.75 : 0.6}s cubic-bezier(0.16,1,0.3,1) ${d}s both` }}>{w}{k < ws.length - 1 ? ' ' : ''}</span>; })}
            </span>
          );
        })}
      </h2>
      {sub && <p className="relative mt-8" style={{ color: SUB, fontFamily: F, fontSize: hero ? 22 : 21, fontWeight: 400, maxWidth: hero ? 660 : 600, lineHeight: 1.6 }}><StreamText text={sub} startDelay={subDelay} speed={40} /></p>}
    </div>
  );
}

/* ── scene-manifest ── */
const SCENES = [
  // ── INTRO · OVERSIKT ──
  { act: 'Intro', surface: 'oversikt', kind: 'keynote', dur: 6000, key: { eyebrow: 'DigiHome', lines: ['Hele utleien.', 'På autopilot.'], sub: 'Operativsystemet som driver hele utleieflyten for forvaltere — fra første henvendelse til daglig drift.' } },
  { act: 'Intro', surface: 'oversikt', kind: 'tour', dur: 12500, cap: { step: 'Én plattform', text: 'Seks faser, ett sammenhengende system: anskaffelse, klargjøring, visninger, kontrakt, drift og skala. Hvert steg er automatisert og henger sammen — forvalteren styrer, systemet gjør jobben.' } },
  { act: 'Intro', surface: 'oversikt', kind: 'keynote', dur: 5400, key: { eyebrow: 'Slik fungerer det', lines: ['La oss følge', 'én bolig.'], sub: 'Fra en huseier tar kontakt — helt til boligen drifter seg selv.' } },

  // ── AKT 1 · ANSKAFFELSE ──
  { act: 'Akt 1 · Anskaffelse', surface: 'nettside', kind: 'keynote', dur: 5400, key: { eyebrow: 'Slik jobber en forvalter', lines: ['Det begynner med', 'en henvendelse.'], sub: 'En huseier vil leie ut boligen sin — og fyller inn adressen på digihome.no.' } },
  { act: 'Akt 1 · Anskaffelse', surface: 'nettside', kind: 'tour', dur: 11500, cap: { step: 'På digihome.no', text: 'Huseieren fyller inn adresse og kontaktinfo. Skjemaet sjekker adressen automatisk og sender henvendelsen rett inn i systemet — ingen e-post, ingen skjema på avveie.' } },
  { act: 'Akt 1 · Anskaffelse', surface: 'pipeline', kind: 'tour', dur: 11000, cap: { step: 'Salgspipeline', text: 'Henvendelsen lander øverst i pipelinen og flyttes gjennom løpet. Den vektede prognosen oppdateres for hvert steg — ingenting glipper.' } },
  { act: 'Akt 1 · Anskaffelse', surface: 'proposal', kind: 'keynote', dur: 5200, key: { eyebrow: 'Painpoint', lines: ['Tilbud på papir', 'tar dager.'], sub: 'Normalt skrives forvaltningstilbud manuelt og signeres på papir. DigiHome gjør det til minutter.' } },
  { act: 'Akt 1 · Anskaffelse', surface: 'proposal', kind: 'tour', dur: 12000, cap: { step: 'Tilbud & signering', text: 'Tilbudet genereres fra systemet med honorar og vilkår. Huseier åpner en lenke, ser et proft dokument og signerer med BankID.' } },
  { act: 'Akt 1 · Anskaffelse', surface: 'proposal', kind: 'keynote', dur: 5600, key: { eyebrow: 'Akt 1 fullført', lines: ['Fra henvendelse', 'til signert avtale.'], sub: 'Hele salgsløpet — uten papir, uten regneark. Og nå tar systemet over driften.' } },

  // ── AKT 2 · KLARGJØRING ──
  { act: 'Akt 2 · Klargjøring', surface: 'registrer', kind: 'keynote', dur: 5400, key: { eyebrow: 'Painpoint', lines: ['Å klargjøre en bolig', 'tar en hel dag.'], sub: 'Måle opp, skrive tekst, redigere bilder, legge ut. DigiHome gjør alt dette fra noen få bilder.' } },
  { act: 'Akt 2 · Klargjøring', surface: 'registrer', kind: 'tour', dur: 10500, cap: { step: 'Registrering med AI', text: 'Du laster opp bilder. Systemet gjenkjenner rom, areal og fasiliteter automatisk — og styler bildene for visning.' } },
  { act: 'Akt 2 · Klargjøring', surface: 'finn', kind: 'keynote', dur: 5000, key: { eyebrow: 'Painpoint', lines: ['En annonse', 'som faktisk selger.'], sub: 'Godt språk, riktig pris og gode bilder avgjør hvor mange som melder seg.' } },
  { act: 'Akt 2 · Klargjøring', surface: 'finn', kind: 'tour', dur: 9500, cap: { step: 'Publisering', text: 'Annonsen genereres og publiseres på FINN.no og en egen brandet utleieside — med ett klikk.' } },
  { act: 'Akt 2 · Klargjøring', surface: 'finn', kind: 'keynote', dur: 5400, key: { eyebrow: 'Akt 2 fullført', lines: ['Fra bilder', 'til live annonse.'], sub: 'Klargjøring og publisering på minutter — ikke en hel dag.' } },

  // ── AKT 3 · FRA INTERESSE TIL LEIETAKER ──
  { act: 'Akt 3 · Interesse', surface: 'visninger', kind: 'keynote', dur: 5400, key: { eyebrow: 'Painpoint', lines: ['48 interessenter.', 'Hvem velger du?'], sub: 'Visninger, e-poster og telefon. Manuelt blir det kaos — og magefølelsen avgjør.' } },
  { act: 'Akt 3 · Interesse', surface: 'visninger', kind: 'tour', dur: 10500, cap: { step: 'Visninger booker seg selv', text: 'Kvalifiserte interessenter booker visning selv etter kapasitet. Bekreftelser og SMS-påminnelser sendes automatisk.' } },
  { act: 'Akt 3 · Interesse', surface: 'screening', kind: 'tour', dur: 11000, cap: { step: 'Screening & scoring', text: 'Hver kandidat scores på inntekt og kredittsjekk via Creditsafe. Systemet anbefaler den tryggeste leietakeren.' } },
  { act: 'Akt 3 · Interesse', surface: 'screening', kind: 'keynote', dur: 5400, key: { eyebrow: 'Akt 3 fullført', lines: ['Fra mengde', 'til riktig leietaker.'], sub: 'Objektivt, dokumentert og uten gjetting.' } },

  // ── AKT 4 · INNGÅELSE ──
  { act: 'Akt 4 · Inngåelse', surface: 'kontrakt', kind: 'keynote', dur: 5200, key: { eyebrow: 'Painpoint', lines: ['Kontrakt, depositum,', 'innflytting.'], sub: 'Tre prosesser, tre systemer og mye papir. DigiHome samler alt digitalt.' } },
  { act: 'Akt 4 · Inngåelse', surface: 'kontrakt', kind: 'tour', dur: 10500, cap: { step: 'Kontrakt & depositum', text: 'Kontrakten genereres fra vilkårene og signeres med BankID. Depositumskonto opprettes via bank — ingen kapital fryses manuelt.' } },
  { act: 'Akt 4 · Inngåelse', surface: 'innflytting', kind: 'tour', dur: 10500, cap: { step: 'Digital innflytting', text: 'Tilstandsrapport med bilder, nøkkeloverlevering og velkomst. Leietakeren får en egen portal med kontrakt, husleie og meldinger.' } },
  { act: 'Akt 4 · Inngåelse', surface: 'innflytting', kind: 'keynote', dur: 5400, key: { eyebrow: 'Akt 4 fullført', lines: ['Leietakeren', 'er innflyttet.'], sub: 'Kontrakt signert, depositum sikret, portal aktivert — automatisk.' } },

  // ── AKT 5 · DRIFT PÅ AUTOPILOT ──
  { act: 'Akt 5 · Drift', surface: 'drift', kind: 'keynote', dur: 5400, key: { eyebrow: 'Det egentlige arbeidet', lines: ['Utleie slutter ikke', 'ved innflytting.'], sub: 'Husleie, oppgjør og vedlikehold — måned etter måned. Her ligger den virkelige jobben.' } },
  { act: 'Akt 5 · Drift', surface: 'drift', kind: 'tour', dur: 11500, cap: { step: 'Drift på autopilot', text: 'Husleie kreves inn og gjøres opp hver måned med utbetaling og rapport. Meldte saker analyseres, tildeles leverandør og dokumenteres.' } },
  { act: 'Akt 5 · Drift', surface: 'drift', kind: 'keynote', dur: 5400, key: { eyebrow: 'Akt 5 fullført', lines: ['Driften går', 'av seg selv.'], sub: 'Huseier ser inntekt, belegg og utbetaling i sanntid.' } },

  // ── FINALE · SKALA ──
  { act: 'Finale · Skala', surface: 'portefolje', kind: 'keynote', dur: 5200, key: { eyebrow: 'Skala', lines: ['Like enkelt for 10', 'som for 1000 boliger.'], sub: 'Samme motor, hele porteføljen. Team, roller og integrasjoner samlet ett sted.' } },
  { act: 'Finale · Skala', surface: 'portefolje', kind: 'tour', dur: 9500, cap: { step: 'Portefølje & team', text: 'Alle eiendommer, aktive utleieprosesser og visninger i sanntid. Rollebasert tilgang for hele teamet.' } },
  { act: 'Finale · Skala', surface: 'portefolje', kind: 'keynote', dur: 6800, key: { eyebrow: 'Systemet', lines: ['Fra første henvendelse', 'til daglig drift.'], sub: 'Ett system for hele utleien. Det er DigiHome.' } },
];

export default function SystemFilm() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.7);
  const [revealed, setRevealed] = useState(false);
  const last = SCENES.length - 1;

  useEffect(() => {
    const upd = () => {
      const availH = window.innerHeight - 150;
      const availW = window.innerWidth - 120;
      setScale(Math.max(0.4, Math.min(availH / WIN_H, availW / WIN_W, 0.96)));
    };
    upd(); window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    if (!playing || idx >= last) return;
    const t = setTimeout(() => setIdx(i => Math.min(i + 1, last)), SCENES[idx].dur);
    return () => clearTimeout(t);
  }, [idx, playing, last]);

  // sentrert forklaring → produktet kommer i fokus (Apple "si det, så vis det")
  useEffect(() => {
    setRevealed(false);
    const sc = SCENES[idx] as any;
    if (sc.kind !== 'tour') return;
    const words = (sc.cap?.text || '').split(' ').length;
    const delay = Math.min(Math.max(words * 72 + 1500, 2600), 4600);
    const t = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(t);
  }, [idx]);

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

  const s = SCENES[idx] as any;
  const isKeynote = s.kind === 'keynote';
  const mode: 'still' | 'live' = isKeynote ? 'still' : (revealed ? 'live' : 'still');
  const dimmed = isKeynote || !revealed;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: CANVAS, fontFamily: F }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 80% at 50% 28%, transparent 52%, rgba(26,22,18,0.06) 100%)' }} />

      {/* topp: chrome + akt-progress */}
      <div className="absolute top-0 left-0 right-0 z-50 px-9 pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.34em]" style={{ color: SUB }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC, boxShadow: `0 0 8px ${LILAC}` }} />Systemet</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] transition-colors" style={{ color: INK }}>{s.act}</span>
          <span className="text-[11px] font-bold tracking-[0.18em] tabular-nums" style={{ color: FAINT }}>{String(idx + 1).padStart(2, '0')} <span style={{ color: WHISPER }}>/ {String(SCENES.length).padStart(2, '0')}</span></span>
        </div>
        <div className="flex gap-1.5">
          {SCENES.map((sc: any, i) => {
            const gap = i > 0 && SCENES[i].act !== SCENES[i - 1].act;
            return (
              <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(26,22,18,0.09)', marginLeft: gap ? 12 : 0 }}>
                <div style={{ height: '100%', borderRadius: 99, background: i === idx ? `linear-gradient(90deg, ${LILAC}, ${LILAC_TXT})` : LILAC_TXT, boxShadow: i === idx ? `0 0 8px ${LILAC}99` : 'none', width: i < idx ? '100%' : '0%', animation: i === idx && playing ? `sf-fill ${sc.dur}ms linear forwards` : 'none' }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* THE STAGE — vedvarende ramme */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: WIN_W * scale, height: WIN_H * scale }}>
          {/* ambient glød bak rammen */}
          <div className="absolute pointer-events-none" style={{ inset: '-14% -10%', background: `radial-gradient(60% 55% at 50% 42%, ${LILAC}1c 0%, transparent 70%), radial-gradient(80% 70% at 50% 60%, rgba(179,167,143,0.14) 0%, transparent 72%)`, filter: 'blur(34px)' }} />
          {/* gulvskygge */}
          <div className="absolute pointer-events-none" style={{ left: '8%', right: '8%', bottom: '-5%', height: 60, borderRadius: '50%', background: 'rgba(26,22,18,0.22)', filter: 'blur(34px)' }} />
          <div style={{ width: WIN_W, height: WIN_H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, borderRadius: 22, overflow: 'hidden', background: SURF, boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 0 0 1px rgba(26,22,18,0.06), 0 8px 18px rgba(26,22,18,0.06), 0 60px 130px -24px rgba(26,22,18,0.32)' }}>
            {/* surface — sløret/zoomet mens forklaringen vises, kommer i fokus ved avsløring */}
            <div key={`${idx}-${mode}`} className="absolute inset-0"
              style={dimmed
                ? { filter: 'blur(9px) saturate(1.05) brightness(0.99)', animation: 'sf-dimin 9s cubic-bezier(0.16,1,0.3,1) both' }
                : { animation: 'sf-revealin 0.9s cubic-bezier(0.16,1,0.3,1) both' }}>
              {(() => { const Surf = SURFACES[s.surface] || PipelineSurface; return <Surf mode={mode} />; })()}
            </div>
            {/* fin topp-glanskant */}
            <div className="absolute inset-x-0 top-0 pointer-events-none z-20" style={{ height: 80, background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)' }} />
            {/* cinematisk vignette */}
            <div className="absolute inset-0 pointer-events-none z-20" style={{ boxShadow: 'inset 0 0 160px 30px rgba(26,22,18,0.10)', borderRadius: 22, opacity: dimmed ? 1 : 0.5, transition: 'opacity 0.8s ease' }} />
            {isKeynote && <KeynoteOverlay key={'k' + idx} hero={idx === 0} {...s.key} />}
            {!isKeynote && s.cap && <CenterNarration key={'c' + idx} step={s.cap.step} text={s.cap.text} gone={revealed} />}
          </div>
        </div>
      </div>

      {/* kontroller */}
      <div className="absolute bottom-7 right-9 z-50 flex items-center gap-2.5">
        <div className="flex items-center gap-1 rounded-full p-1" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 24px -10px rgba(26,22,18,0.28), 0 0 0 1px rgba(26,22,18,0.05)' }}>
          <button onClick={prev} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-black/5" style={{ color: INK }} aria-label="Forrige"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setPlaying(p => !p)} className="w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: INK, boxShadow: '0 6px 16px -6px rgba(26,22,18,0.5)' }} aria-label="Spill/pause">{playing ? <Pause className="w-[18px] h-[18px]" /> : <Play className="w-[18px] h-[18px]" style={{ marginLeft: 1 }} />}</button>
          <button onClick={next} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-black/5" style={{ color: INK }} aria-label="Neste"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <style>{`
        .sf-caret { display:inline-block; width:2px; height:1em; margin-left:2px; vertical-align:-2px; animation: sf-blink 1s step-end infinite; }
        .sf-cursor { display:inline-block; width:9px; height:1.05em; border-radius:2px; margin-left:3px; vertical-align:-3px; }
        .sf-done { width:100% !important; }
        @keyframes sf-blink { 50% { opacity:0; } }
        @keyframes sf-fill { from { width:0%; } to { width:100%; } }
        @keyframes sf-fade { from { opacity:0; } to { opacity:1; } }
        @keyframes sf-blurup { from { opacity:0; transform: translateY(0.4em); filter: blur(12px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes sf-rise { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        @keyframes sf-pop { from { opacity:0; transform: scale(0.9); } to { opacity:1; transform: scale(1); } }
        @keyframes sf-slidein { from { opacity:0; transform: translateX(24px); } to { opacity:1; transform: translateX(0); } }
        @keyframes sf-ripple { from { opacity:0.8; transform: scale(0.4); } to { opacity:0; transform: scale(1.5); } }
        @keyframes sf-load { from { width:0%; } to { width:100%; } }
        @keyframes sf-scan { 0% { top:-12%; } 100% { top:104%; } }
        @keyframes sf-spin { to { transform: rotate(360deg); } }
        @keyframes sf-wordin { from { opacity:0; transform: translateY(0.3em); filter: blur(5px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes sf-wordblur { from { opacity:0; transform: translateY(0.36em); filter: blur(9px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes sf-flow { 0% { left:0%; opacity:0; } 15% { opacity:1; } 85% { opacity:1; } 100% { left:100%; opacity:0; } }
        @keyframes sf-capin { from { opacity:0; transform: translateY(16px) scale(0.985); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes sf-dimin { 0% { opacity:0; transform: scale(1.055); } 12% { opacity:1; } 100% { opacity:1; transform: scale(1.085); } }
        @keyframes sf-revealin { 0% { opacity:0; filter: blur(11px); transform: scale(1.04); } 100% { opacity:1; filter: blur(0); transform: scale(1); } }
      `}</style>
    </div>
  );
}
