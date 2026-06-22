'use client';
/**
 * AIEiendom — investor-slide: «AI som forstår eiendom.»
 *
 * Verdensklasse-redesign (anti-slop): asymmetrisk editorial bento.
 *   HELT  · stor kinematisk FØR/ETTER-split (AI-styling av annonsefoto)
 *   PANEL · kontraktsgenerering (flytende dokument, felt fylles inn)
 *   PANEL · leietaker-svar (raffinert meldingstråd, AI-utkast → du godkjenner)
 *
 * Lyst, premium, sømløst (ingen bokskanter — kun mykt lys/skygge). Gjennomgående
 * prinsipp: AI gjør utkastet, mennesket godkjenner alltid.
 */
import React from 'react';
import {
  Sparkles, Check, FileSignature, ArrowLeftRight, ShieldCheck,
  Pencil, Wand2, CornerDownRight, PenLine, Lock,
} from 'lucide-react';

const F = "var(--font-body), 'ABC Diatype', -apple-system, sans-serif";
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, sans-serif";
const AC = '#9a63e8';
const PDK = '#7c3aed';
const INK = '#0c0c0c';
const INK2 = '#1c1714';
const SUB = '#57514a';
const MUT = '#8a8278';
const GREEN = '#1f9d63';
const AMBER = '#b8821f';
const SOFT = '0 44px 96px -58px rgba(20,15,10,0.34), inset 0 1px 0 rgba(255,255,255,0.9)';
const HAIR = 'rgba(20,15,10,0.07)';

/* ── delt: liten nummer-etikett ── */
function Eyebrow({ no, label, light }: any) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="tabular-nums text-[11px] font-bold tracking-[0.06em]" style={{ fontFamily: FH, color: light ? 'rgba(255,255,255,0.92)' : AC }}>{no}</span>
      <span className="w-4 h-px" style={{ background: light ? 'rgba(255,255,255,0.5)' : 'rgba(20,15,10,0.18)' }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ fontFamily: F, color: light ? 'rgba(255,255,255,0.78)' : MUT }}>{label}</span>
    </div>
  );
}

/* ── delt: status / godkjenning (monokrom + liten farget prikk) ── */
function Status({ tone, text, light }: any) {
  const c = tone === 'green' ? GREEN : tone === 'amber' ? AMBER : AC;
  return (
    <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold" style={{ fontFamily: F, color: light ? 'rgba(255,255,255,0.9)' : INK2 }}>
      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 0 3px ${c}1f` }} />
      {text}
    </span>
  );
}

/* ── delt: mørk caption-bar (samme filmatiske språk som hero) ── */
function CaptionBar({ title, desc, status }: any) {
  return (
    <div className="px-5 py-2.5 flex items-end justify-between gap-4" style={{ background: 'linear-gradient(180deg, #100c16, #0a080d)' }}>
      <div className="min-w-0">
        <h3 className="text-[18px] leading-[1.04]" style={{ fontFamily: FH, fontWeight: 700, color: '#fff', letterSpacing: '-0.022em' }}>{title}</h3>
        <p className="text-[11.5px] font-normal leading-snug mt-1 truncate" style={{ fontFamily: F, color: 'rgba(255,255,255,0.58)' }}>{desc}</p>
      </div>
      <div className="shrink-0">{status}</div>
    </div>
  );
}

/* ── delt: liten frostet nummer-etikett på en visuell flate ── */
function FrostNum({ no, label }: any) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 6px 18px -12px rgba(20,15,10,0.4)' }}>
      <span className="tabular-nums text-[10px] font-bold tracking-[0.06em]" style={{ fontFamily: FH, color: PDK }}>{no}</span>
      <span className="w-3 h-px" style={{ background: 'rgba(20,15,10,0.2)' }} />
      <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ fontFamily: F, color: SUB }}>{label}</span>
    </span>
  );
}
function HeroStyling({ on }: any) {
  return (
    <div
      className="relative h-full rounded-[26px] overflow-hidden flex flex-col"
      style={{ background: '#0c0c0c', boxShadow: SOFT, animation: on ? 'aiUp 0.95s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined }}
    >
      {/* bilde-flate */}
      <div className="relative flex-1 overflow-hidden">
        {/* ETTER (base, full) */}
        <img src="/film/styling/styled_evening.webp" alt="Stylet med AI" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center' }} />
        {/* FØR (venstre halvdel, klippet) */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(0 50% 0 0)' }}>
          <img src="/film/styling/room-evening.jpg" alt="Før styling" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center' }} />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,6,10,0.28), rgba(8,6,10,0.05))' }} />
        </div>

        {/* AI-skann-sveip over ETTER-halvdelen */}
        <div className="absolute inset-y-0 right-0 pointer-events-none overflow-hidden" style={{ width: '50%' }}>
          <span className="absolute inset-y-0" style={{ width: '60%', left: '-60%', background: 'linear-gradient(105deg, transparent, rgba(170,120,255,0.16), transparent)', animation: 'aiSweep 5.2s ease-in-out 0.9s infinite' }} />
        </div>

        {/* skillelinje + håndtak */}
        <div className="absolute inset-y-0 pointer-events-none" style={{ left: '50%', transform: 'translateX(-50%)', width: 2, background: 'linear-gradient(180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.9) 18%, rgba(255,255,255,0.9) 82%, rgba(255,255,255,0.0))', boxShadow: '0 0 14px rgba(255,255,255,0.45)' }} />
        <div className="absolute pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <span className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.94)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
            <ArrowLeftRight className="w-4 h-4" style={{ color: '#1c1714' }} strokeWidth={2.4} />
          </span>
        </div>

        {/* FØR / ETTER-merker */}
        <span className="absolute top-4 left-4 text-[9.5px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full" style={{ fontFamily: F, color: 'rgba(255,255,255,0.92)', background: 'rgba(8,6,10,0.45)', backdropFilter: 'blur(8px)', letterSpacing: '0.14em' }}>Før</span>
        <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ fontFamily: F, color: '#fff', background: 'linear-gradient(135deg, rgba(154,99,232,0.92), rgba(124,58,237,0.92))', backdropFilter: 'blur(8px)', boxShadow: '0 8px 22px -8px rgba(124,58,237,0.6)' }}>
          <Wand2 className="w-3 h-3" strokeWidth={2.4} /> Stylet med AI
        </span>

        {/* topp-etikett */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-flex"><Eyebrow no="01" label="Annonsefoto" light /></div>
        </div>
      </div>

      {/* caption-bar (frostet mørk for kontinuitet) */}
      <div className="px-6 py-5 flex items-end justify-between gap-6" style={{ background: 'linear-gradient(180deg, #0e0b12, #0a080d)' }}>
        <div>
          <h3 className="text-[24px] leading-[1.04]" style={{ fontFamily: FH, fontWeight: 700, color: '#fff', letterSpacing: '-0.022em' }}>AI-styling av annonsefoto</h3>
          <p className="text-[13px] font-normal leading-snug mt-1.5 max-w-[420px]" style={{ fontFamily: F, color: 'rgba(255,255,255,0.62)' }}>
            Slitne rom blir salgsklare — møblert, lyssatt og redaksjonelt på sekunder.
          </p>
        </div>
        <Status tone="green" text="Du godkjente forsidebildet" light />
      </div>
    </div>
  );
}

/* ═══════════════ PANEL · Kontraktsgenerering ═══════════════ */
function ContractPanel({ on }: any) {
  const rows = [
    { k: 'Leietaker', v: 'Anna Berg' },
    { k: 'Eiendom', v: 'Olaf Ryes vei 11C' },
    { k: 'Husleie', v: '16 800 kr / mnd' },
    { k: 'Depositum', v: '50 400 kr' },
  ];
  return (
    <div className="relative h-full rounded-[22px] overflow-hidden flex flex-col bg-white"
         style={{ boxShadow: SOFT, animation: on ? 'aiUp 0.95s cubic-bezier(0.22,1,0.36,1) 0.34s both' : undefined }}>
      {/* visuell flate — dokument på varmt «skrivebord» */}
      <div className="relative flex-1 overflow-hidden flex flex-col px-4 pt-3.5 pb-3.5" style={{ background: 'linear-gradient(155deg, #efe9df 0%, #e6dece 100%)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <FrostNum no="02" label="Avtaleverk" />
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full" style={{ fontFamily: F, background: 'rgba(124,58,237,0.12)', color: PDK }}>
            <Sparkles className="w-2.5 h-2.5" strokeWidth={2.6} /> AI-utkast
          </span>
        </div>

        {/* papir-dokument, flytende */}
        <div className="relative flex-1 rounded-[11px] bg-white px-4 pt-2.5 pb-2 flex flex-col" style={{ boxShadow: '0 26px 56px -28px rgba(20,15,10,0.55), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
          {/* brevhode */}
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${HAIR}` }}>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-[6px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #9a63e8, #7c3aed)' }}>
                <FileSignature className="w-3 h-3 text-white" strokeWidth={2.2} />
              </span>
              <span className="text-[13px] font-bold tracking-[-0.015em]" style={{ fontFamily: FH, color: INK2 }}>Leieavtale</span>
            </div>
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em]" style={{ fontFamily: F, color: MUT }}>§ Husleieloven</span>
          </div>
          {/* felter — fylles inn */}
          <div className="flex-1 flex flex-col justify-center py-0.5">
            {rows.map((r, i) => (
              <div key={r.k} className="flex items-center justify-between py-[4.5px]" style={{ borderBottom: i < rows.length - 1 ? `1px solid rgba(20,15,10,0.05)` : 'none', animation: on ? `aiRow 0.55s ease ${0.7 + i * 0.13}s both` : undefined }}>
                <span className="text-[11px]" style={{ fontFamily: F, color: MUT }}>{r.k}</span>
                <span className="text-[11.5px] font-semibold px-1.5 py-[1px] rounded" style={{ fontFamily: F, color: INK2, background: 'rgba(124,58,237,0.09)' }}>{r.v}</span>
              </div>
            ))}
          </div>
          {/* signaturlinje */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px dashed rgba(20,15,10,0.14)' }}>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ fontFamily: F, color: SUB }}>
              <PenLine className="w-3 h-3" style={{ color: PDK }} strokeWidth={2.2} /> Signeres med BankID
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-[2px] rounded" style={{ fontFamily: F, color: AMBER, background: 'rgba(184,130,31,0.12)' }}>Klar</span>
          </div>
        </div>
      </div>

      {/* mørk caption-bar */}
      <CaptionBar
        title="Kontraktsgenerering"
        desc="Ferdig utfylt fra eiendoms- og leietakerdata."
        status={<Status tone="amber" text="Venter på din signering" light />}
      />
    </div>
  );
}

/* ═══════════════ PANEL · Leietaker-svar ═══════════════ */
function ChatPanel({ on }: any) {
  return (
    <div className="relative h-full rounded-[22px] overflow-hidden flex flex-col bg-white"
         style={{ boxShadow: SOFT, animation: on ? 'aiUp 0.95s cubic-bezier(0.22,1,0.36,1) 0.46s both' : undefined }}>
      {/* visuell flate — ekte meldings-app */}
      <div className="relative flex-1 overflow-hidden flex flex-col" style={{ background: 'linear-gradient(180deg, #f7f5f2, #eeeae3)' }}>
        {/* app-header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5" style={{ borderBottom: `1px solid ${HAIR}`, background: 'rgba(255,255,255,0.66)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #c8a4f0, #8a5fd6)' }}>
              <span className="text-[11px] font-bold text-white" style={{ fontFamily: F }}>AB</span>
              <span className="absolute -bottom-0 -right-0 w-2.5 h-2.5 rounded-full" style={{ background: GREEN, border: '2px solid #fff' }} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-bold leading-tight truncate" style={{ fontFamily: F, color: INK2 }}>Anna Berg</p>
              <p className="text-[9px] font-medium leading-tight truncate" style={{ fontFamily: F, color: MUT }}>Leietaker · Olaf Ryes vei 11C</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] shrink-0" style={{ fontFamily: F, color: MUT }}>
            <Lock className="w-2.5 h-2.5" strokeWidth={2.4} /> Kryptert
          </span>
        </div>

        {/* tråd */}
        <div className="flex-1 px-3.5 py-3 flex flex-col gap-2 justify-center">
          <div className="self-start max-w-[82%]">
            <div className="rounded-[15px] rounded-tl-[5px] px-3 py-2" style={{ background: '#ffffff', boxShadow: '0 6px 16px -12px rgba(20,15,10,0.3)' }}>
              <p className="text-[11.5px] leading-snug" style={{ fontFamily: F, color: INK2 }}>Hei! Vaskemaskinen lekker — hva gjør jeg?</p>
            </div>
            <span className="block text-[8px] mt-1 ml-1" style={{ fontFamily: F, color: MUT }}>09:14</span>
          </div>
          <div className="self-end max-w-[90%]" style={{ animation: on ? 'aiRow 0.6s ease 0.9s both' : undefined }}>
            <div className="rounded-[15px] rounded-tr-[5px] px-3 py-2" style={{ background: 'linear-gradient(135deg, rgba(154,99,232,0.15), rgba(124,58,237,0.11))' }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] mb-1 inline-flex items-center gap-1" style={{ fontFamily: F, color: PDK }}><Sparkles className="w-2.5 h-2.5" strokeWidth={2.6} /> AI-forslag · fra kontrakt + eiendom</p>
              <p className="text-[11.5px] leading-snug" style={{ fontFamily: F, color: INK2 }}>Hei Anna! Jeg har opprettet en sak og varslet rørlegger — de tar kontakt innen 24t. Steng vannkrana bak maskinen så lenge.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5" style={{ animation: on ? 'aiRow 0.6s ease 1.3s both' : undefined }}>
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 h-[30px] rounded-[9px] text-[11px] font-bold" style={{ fontFamily: F, background: GREEN, color: '#fff', boxShadow: '0 8px 20px -10px rgba(31,157,99,0.7)' }}><Check className="w-3 h-3" strokeWidth={3} /> Godkjenn & send</span>
            <span className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[9px] text-[11px] font-semibold" style={{ fontFamily: F, background: '#f1efea', color: SUB }}><Pencil className="w-3 h-3" strokeWidth={2.2} /> Rediger</span>
          </div>
        </div>
      </div>

      {/* mørk caption-bar */}
      <CaptionBar
        title="Leietaker-svar"
        desc="Kontekstbevisste svar — du godkjenner tonen."
        status={<Status tone="green" text="Sendt etter din godkjenning" light />}
      />
    </div>
  );
}

/* ═══════════════════ SLIDE-INNHOLD ═══════════════════ */
export default function AIEiendom({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const on = active || pdfMode;
  return (
    <div className="mx-auto self-stretch px-6 sm:px-12 w-full relative z-10 flex flex-col justify-center" style={{ maxWidth: 1440 }}>
      <style>{`
        @keyframes aiUp { from { opacity:0; transform: translateY(30px); filter: blur(8px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes aiRow { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes aiHead { from { opacity:0; transform: translateY(16px); filter: blur(6px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }
        @keyframes aiFade { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes aiGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes aiSweep { 0% { left:-60%; } 55% { left:120%; } 100% { left:120%; } }
      `}</style>

      {/* ── header ── */}
      <div className="mb-5 sm:mb-7 flex items-end justify-between gap-10 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.42em] mb-4" style={{ fontFamily: F, color: AC, animation: on ? 'aiFade 0.7s ease 0.1s both' : undefined, opacity: on ? undefined : 0 }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: AC, boxShadow: `0 0 10px rgba(154,99,232,0.6)` }} /> Det intelligente laget
          </span>
          <h2 className="tracking-[-0.042em] leading-[0.98]" style={{ fontFamily: FH, fontWeight: 700, color: INK, fontSize: 'clamp(30px, 4vw, 56px)', animation: on ? 'aiHead 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined, opacity: on ? undefined : 0 }}>
            AI som forstår <span style={{ color: AC }}>eiendom.</span>
          </h2>
        </div>
        <div className="max-w-[400px] mb-1.5" style={{ animation: on ? 'aiFade 0.7s ease 0.4s both' : undefined, opacity: on ? undefined : 0 }}>
          <span className="block h-px mb-4" style={{ width: 56, background: `linear-gradient(90deg, ${AC}, transparent)`, transformOrigin: 'left' }} />
          <p className="font-normal leading-[1.58]" style={{ fontFamily: F, color: SUB, fontSize: 'clamp(13px, 1vw, 14.5px)' }}>
            Ikke en chatbot. AI trent på utleie — den gjør utkastet, <span style={{ color: INK2, fontWeight: 600 }}>du godkjenner alltid</span>.
          </p>
        </div>
      </div>

      {/* ── bento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[620px] lg:[grid-template-rows:1fr_1fr] shrink-0">
        <div className="lg:col-span-7 lg:row-span-2 min-h-[320px] lg:min-h-0"><HeroStyling on={on} /></div>
        <div className="lg:col-span-5 min-h-[250px] lg:min-h-0"><ContractPanel on={on} /></div>
        <div className="lg:col-span-5 min-h-[250px] lg:min-h-0"><ChatPanel on={on} /></div>
      </div>

      {/* ── prinsipp-footer ── */}
      <div className="mt-5 sm:mt-6 flex items-center justify-center gap-5 flex-wrap" style={{ animation: on ? 'aiFade 0.8s ease 1s both' : undefined, opacity: on ? undefined : 0 }}>
        <span className="inline-flex items-center gap-2.5 text-[13px] font-medium" style={{ fontFamily: F, color: INK2 }}>
          <ShieldCheck className="w-4 h-4" style={{ color: AC }} strokeWidth={2} />
          AI gjør grovarbeidet — <span style={{ color: INK, fontWeight: 700 }}>du har alltid siste ord</span>.
        </span>
        <span className="hidden sm:inline-flex items-center gap-2.5 text-[11px] font-medium" style={{ fontFamily: F, color: MUT }}>
          Forklarlig <CornerDownRight className="w-3 h-3" /> Reverserbar <CornerDownRight className="w-3 h-3" /> Under din kontroll
        </span>
      </div>
    </div>
  );
}
