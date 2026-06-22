'use client';
/**
 * AIEiendom — investor-slide: «AI som forstår eiendom.»
 *
 * Tre praktiske AI-moats vist side om side, hver med samme bærende prinsipp:
 * AI gjør utkastet — mennesket godkjenner alltid.
 *   01 · Bildestyling     (AI-styling av annonsefoto, ekte før/etter)
 *   02 · Kontraktsgenerering (ferdig utfylt leieavtale fra eiendoms-/leietakerdata)
 *   03 · Leietaker-svar   (kontekstbevisst svarutkast, sendt etter din godkjenning)
 *
 * Mørkt, kinematisk, 1-skjerm (ingen scroll). Matcher deck-DNA (RG/Diatype, #d298ff).
 */
import React from 'react';
import {
  Sparkles, Check, FileSignature, MessageSquare, ImageIcon, PenLine,
  ShieldCheck, ArrowRight, Pencil, Wand2,
} from 'lucide-react';

const F = "var(--font-body), 'ABC Diatype', -apple-system, sans-serif";
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, sans-serif";
const P = '#d298ff';
const PDK = '#a368e0';
const GREEN = '#4ec98e';
const AMBER = '#e6b15e';

/* ── delt: kort-skall ── */
function Card({ idx, active, children }: any) {
  return (
    <div
      className="relative flex flex-col rounded-[20px] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.022))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 30px 70px -30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: active ? `aiCardIn 0.9s cubic-bezier(0.22,1,0.36,1) ${0.25 + idx * 0.16}s both` : undefined,
        opacity: active ? undefined : 1,
      }}
    >
      {/* topp-glanskant */}
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />
      {children}
    </div>
  );
}

function CardHead({ no, icon: Icon, label }: any) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(210,152,255,0.12)', border: `1px solid rgba(210,152,255,0.22)` }}>
        <Icon className="w-[15px] h-[15px]" style={{ color: P }} strokeWidth={2} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily: F, color: 'rgba(255,255,255,0.42)' }}>{no} · {label}</span>
    </div>
  );
}

function Approval({ tone, icon: Icon, text }: any) {
  const c = tone === 'green' ? GREEN : tone === 'amber' ? AMBER : P;
  const bg = tone === 'green' ? 'rgba(78,201,142,0.1)' : tone === 'amber' ? 'rgba(230,177,94,0.1)' : 'rgba(210,152,255,0.1)';
  return (
    <div className="mt-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: bg, border: `1px solid ${c}33` }}>
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: c }} strokeWidth={2.4} />
      <span className="text-[11.5px] font-semibold" style={{ fontFamily: F, color: c }}>{text}</span>
    </div>
  );
}

/* ═══ KORT 1 · Bildestyling ═══ */
function CardBilde({ active }: any) {
  return (
    <Card idx={0} active={active}>
      <div className="p-4 flex flex-col flex-1">
        <CardHead no="01" icon={ImageIcon} label="Annonsefoto" />
        {/* visuell: ekte før/etter */}
        <div className="relative rounded-[14px] overflow-hidden mb-3.5" style={{ height: 196, border: '1px solid rgba(255,255,255,0.1)' }}>
          <img src="/film/styling/styled_evening.webp" alt="AI-stylet rom" className="w-full h-full object-cover" />
          {/* lys-sveip (AI skanner/styler) */}
          <div className="absolute inset-y-0 pointer-events-none" style={{ width: '45%', left: '-45%', background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.22), transparent)', animation: 'aiSweep 4.4s ease-in-out infinite' }} />
          {/* før-innsett */}
          <div className="absolute bottom-2.5 left-2.5 rounded-md overflow-hidden" style={{ width: 76, height: 58, border: '1.5px solid rgba(255,255,255,0.55)', boxShadow: '0 6px 18px rgba(0,0,0,0.55)' }}>
            <img src="/film/styling/original.avif" alt="Før" className="w-full h-full object-cover" style={{ transform: 'scale(1.15)' }} />
            <span className="absolute top-0 left-0 text-[7px] font-bold px-1 py-[2px]" style={{ fontFamily: F, background: 'rgba(0,0,0,0.72)', color: 'rgba(255,255,255,0.92)', letterSpacing: '0.08em' }}>FØR</span>
          </div>
          {/* badge */}
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ fontFamily: F, background: 'rgba(12,9,18,0.66)', color: P, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `1px solid ${P}55` }}>
            <Wand2 className="w-3 h-3" strokeWidth={2.2} /> Stylet med AI
          </span>
        </div>
        <h3 className="text-[19px] leading-tight mb-1.5" style={{ fontFamily: FH, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>AI-styling av bilder</h3>
        <p className="text-[12.5px] font-light leading-snug mb-4" style={{ fontFamily: F, color: 'rgba(255,255,255,0.55)' }}>
          Slitne rom blir salgsklare. Møblert, lyssatt og redaksjonelt — på sekunder.
        </p>
        <Approval tone="green" icon={Check} text="Du godkjente forsidebildet" />
      </div>
    </Card>
  );
}

/* ═══ KORT 2 · Kontraktsgenerering ═══ */
function CardKontrakt({ active }: any) {
  const rows = [
    { k: 'Leietaker', v: 'Anna Berg' },
    { k: 'Eiendom', v: 'Olaf Ryes vei 11C' },
    { k: 'Husleie', v: '16 800 kr / mnd' },
    { k: 'Depositum', v: '50 400 kr' },
    { k: 'Leieperiode', v: '12 mnd · oppsigelig' },
  ];
  return (
    <Card idx={1} active={active}>
      <div className="p-4 flex flex-col flex-1">
        <CardHead no="02" icon={FileSignature} label="Avtaleverk" />
        {/* visuell: kontrakt-dokument */}
        <div className="relative rounded-[14px] overflow-hidden mb-3.5" style={{ height: 196, background: '#faf8f4', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '1px solid #ece6dd' }}>
            <div className="flex items-center gap-2">
              <FileSignature className="w-3.5 h-3.5" style={{ color: '#1c1815' }} strokeWidth={2} />
              <span className="text-[11.5px] font-bold" style={{ fontFamily: FH, color: '#1c1815' }}>Leieavtale</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wide px-2 py-1 rounded-full" style={{ fontFamily: F, background: 'rgba(210,152,255,0.16)', color: PDK }}>
              <Sparkles className="w-2.5 h-2.5" strokeWidth={2.4} /> AI-utkast
            </span>
          </div>
          <div className="px-3.5 py-2">
            {rows.map((r, i) => (
              <div key={r.k} className="flex items-center justify-between py-[6px]" style={{ borderBottom: i < rows.length - 1 ? '1px solid #f0ebe2' : 'none', animation: active ? `aiRowIn 0.5s ease ${0.7 + i * 0.12}s both` : undefined }}>
                <span className="text-[10.5px]" style={{ fontFamily: F, color: '#9a9388' }}>{r.k}</span>
                <span className="text-[11px] font-semibold px-1.5 rounded" style={{ fontFamily: F, color: '#2a2620', background: 'rgba(210,152,255,0.14)' }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
        <h3 className="text-[19px] leading-tight mb-1.5" style={{ fontFamily: FH, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Kontraktsgenerering</h3>
        <p className="text-[12.5px] font-light leading-snug mb-4" style={{ fontFamily: F, color: 'rgba(255,255,255,0.55)' }}>
          Riktig leieavtale, ferdig utfylt fra eiendoms- og leietakerdata.
        </p>
        <Approval tone="amber" icon={PenLine} text="Venter på din signering" />
      </div>
    </Card>
  );
}

/* ═══ KORT 3 · Leietaker-svar ═══ */
function CardChat({ active }: any) {
  return (
    <Card idx={2} active={active}>
      <div className="p-4 flex flex-col flex-1">
        <CardHead no="03" icon={MessageSquare} label="Kommunikasjon" />
        {/* visuell: chat */}
        <div className="rounded-[14px] overflow-hidden mb-3.5 flex flex-col p-3 gap-2.5" style={{ height: 196, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.09)' }}>
          {/* leietaker */}
          <div className="self-start max-w-[82%] rounded-[14px] rounded-tl-[4px] px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <p className="text-[8px] font-bold uppercase tracking-wide mb-1" style={{ fontFamily: F, color: 'rgba(255,255,255,0.35)' }}>Anna · leietaker</p>
            <p className="text-[11px] leading-snug" style={{ fontFamily: F, color: 'rgba(255,255,255,0.82)' }}>Hei! Vaskemaskinen lekker — hva gjør jeg?</p>
          </div>
          {/* ai-utkast */}
          <div className="self-end max-w-[88%] rounded-[14px] rounded-tr-[4px] px-3 py-2" style={{ background: 'rgba(210,152,255,0.13)', border: `1px solid ${P}33`, animation: active ? 'aiRowIn 0.6s ease 0.9s both' : undefined }}>
            <p className="text-[8px] font-bold uppercase tracking-wide mb-1 inline-flex items-center gap-1" style={{ fontFamily: F, color: P }}><Sparkles className="w-2.5 h-2.5" strokeWidth={2.4} /> AI-forslag</p>
            <p className="text-[11px] leading-snug" style={{ fontFamily: F, color: 'rgba(255,255,255,0.9)' }}>Hei Anna! Jeg har opprettet en sak og varslet rørlegger — de tar kontakt innen 24t. Steng vannkrana bak maskinen så lenge.</p>
          </div>
          {/* godkjenn-rad */}
          <div className="mt-auto flex items-center gap-2" style={{ animation: active ? 'aiRowIn 0.6s ease 1.35s both' : undefined }}>
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10.5px] font-bold" style={{ fontFamily: F, background: GREEN, color: '#08130d' }}><Check className="w-3 h-3" strokeWidth={3} /> Godkjenn</span>
            <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10.5px] font-semibold" style={{ fontFamily: F, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}><Pencil className="w-3 h-3" strokeWidth={2.2} /> Rediger</span>
          </div>
        </div>
        <h3 className="text-[19px] leading-tight mb-1.5" style={{ fontFamily: FH, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Leietaker-svar</h3>
        <p className="text-[12.5px] font-light leading-snug mb-4" style={{ fontFamily: F, color: 'rgba(255,255,255,0.55)' }}>
          Kontekstbevisste svar fra kontrakt og eiendom. Du godkjenner tonen.
        </p>
        <Approval tone="green" icon={Check} text="Sendt etter din godkjenning" />
      </div>
    </Card>
  );
}

/* ═══════════════════ SLIDE-INNHOLD ═══════════════════ */
export default function AIEiendom({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const on = active || pdfMode;
  return (
    <div className="mx-auto self-stretch px-6 sm:px-12 w-full relative z-10 flex flex-col justify-center" style={{ maxWidth: 1380 }}>
      <style>{`
        @keyframes aiCardIn { from { opacity:0; transform: translateY(26px); filter: blur(7px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes aiRowIn { from { opacity:0; transform: translateY(7px); } to { opacity:1; transform: translateY(0); } }
        @keyframes aiHeadIn { from { opacity:0; transform: translateY(16px); filter: blur(6px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes aiFade { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes aiSweep { 0% { left:-45%; } 55% { left:120%; } 100% { left:120%; } }
      `}</style>

      {/* header */}
      <div className="mb-7 sm:mb-9">
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] mb-4" style={{ fontFamily: F, color: 'rgba(255,255,255,0.5)', animation: on ? 'aiFade 0.7s ease 0.1s both' : undefined, opacity: on ? undefined : 0 }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: P, boxShadow: `0 0 10px ${P}` }} /> Det intelligente laget
            </span>
            <h2 className="font-bold tracking-[-0.042em] leading-[1.0]" style={{ fontFamily: FH, fontWeight: 700, color: '#fff', fontSize: 'clamp(28px, 3.8vw, 52px)', animation: on ? 'aiHeadIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined, opacity: on ? undefined : 0 }}>
              AI som forstår eiendom.
            </h2>
          </div>
          <p className="font-light leading-[1.55] max-w-[400px] mb-1" style={{ fontFamily: F, color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(12px, 1vw, 14px)', animation: on ? 'aiFade 0.7s ease 0.4s both' : undefined, opacity: on ? undefined : 0 }}>
            Ikke en chatbot. AI trent på utleie — den gjør utkastet, <span style={{ color: '#fff' }}>du godkjenner alltid</span>.
          </p>
        </div>
      </div>

      {/* 3 kort */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <CardBilde active={active} />
        <CardKontrakt active={active} />
        <CardChat active={active} />
      </div>

      {/* prinsipp-footer */}
      <div className="mt-7 flex items-center justify-center gap-3 flex-wrap" style={{ animation: on ? 'aiFade 0.8s ease 0.95s both' : undefined, opacity: on ? undefined : 0 }}>
        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium px-4 py-2 rounded-full" style={{ fontFamily: F, color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <ShieldCheck className="w-4 h-4" style={{ color: P }} strokeWidth={2} />
          AI gjør grovarbeidet — <span style={{ color: '#fff', fontWeight: 600 }}>du har alltid siste ord</span>.
        </span>
        <span className="hidden sm:inline-flex items-center gap-2 text-[11px] font-medium" style={{ fontFamily: F, color: 'rgba(255,255,255,0.4)' }}>
          Forklarlig <ArrowRight className="w-3 h-3" /> Reverserbar <ArrowRight className="w-3 h-3" /> Under din kontroll
        </span>
      </div>
    </div>
  );
}
