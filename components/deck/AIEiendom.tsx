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
import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles, Check, FileSignature, ArrowLeftRight, ShieldCheck,
  Pencil, Wand2, CornerDownRight, PenLine, Lock, Plus, ArrowRight,
} from 'lucide-react';

const F = "var(--font-body), 'ABC Diatype', -apple-system, sans-serif";
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, sans-serif";
const AC = '#a052e0';
const P = '#d298ff';      // merkevare-lilla (samme som mobilmockup ellers i decken)
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
function HeroStyling({ on, pdf }: any) {
  const wipe = on && !pdf;
  return (
    <div
      className="relative h-full rounded-[26px] overflow-hidden flex flex-col"
      style={{ background: '#0c0c0c', boxShadow: SOFT, animation: on ? 'aiUp 0.95s cubic-bezier(0.22,1,0.36,1) 0.2s both' : undefined }}
    >
      {/* bilde-flate — animert FØR/ETTER-slider */}
      <div className="relative flex-1 overflow-hidden">
        {/* ETTER (base, full) */}
        <img src="/film/styling/styled_evening.webp" alt="Stylet med AI" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center' }} />
        {/* FØR (venstre del, klippet — glir) */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(0 50% 0 0)', animation: wipe ? 'aiWipeClip 7s cubic-bezier(0.65,0,0.35,1) 0.8s infinite' : undefined, willChange: 'clip-path' }}>
          <img src="/film/styling/room-evening.jpg" alt="Før styling" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center' }} />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,6,10,0.30), rgba(8,6,10,0.04))' }} />
        </div>

        {/* skillelinje + håndtak (glir synket med clip) */}
        <div className="absolute inset-y-0 z-10 pointer-events-none" style={{ left: '50%', animation: wipe ? 'aiWipeLine 7s cubic-bezier(0.65,0,0.35,1) 0.8s infinite' : undefined, willChange: 'left' }}>
          <div className="absolute inset-y-0" style={{ left: 0, transform: 'translateX(-50%)', width: 2, background: 'linear-gradient(180deg, rgba(255,255,255,0.0), rgba(255,255,255,0.92) 16%, rgba(255,255,255,0.92) 84%, rgba(255,255,255,0.0))', boxShadow: '0 0 16px rgba(255,255,255,0.5)' }} />
          <span className="absolute top-1/2 left-0 flex items-center justify-center w-10 h-10 rounded-full" style={{ transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,0.96)', boxShadow: '0 10px 28px rgba(0,0,0,0.45), 0 0 0 6px rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)' }}>
            <ArrowLeftRight className="w-4 h-4" style={{ color: '#1c1714' }} strokeWidth={2.4} />
          </span>
        </div>

        {/* FØR / ETTER-merker */}
        <span className="absolute top-4 left-4 z-20 text-[9.5px] font-bold uppercase px-2.5 py-1 rounded-full" style={{ fontFamily: F, color: 'rgba(255,255,255,0.92)', background: 'rgba(8,6,10,0.5)', backdropFilter: 'blur(8px)', letterSpacing: '0.16em' }}>Før</span>
        <span className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ fontFamily: F, color: '#fff', background: 'linear-gradient(135deg, rgba(160,82,224,0.94), rgba(124,58,237,0.94))', backdropFilter: 'blur(8px)', boxShadow: '0 8px 22px -8px rgba(124,58,237,0.6)' }}>
          <Wand2 className="w-3 h-3" strokeWidth={2.4} /> Stylet med AI
        </span>

        {/* topp-etikett */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
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
              <span className="w-5 h-5 rounded-[6px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a052e0, #7c3aed)' }}>
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
            <div className="rounded-[15px] rounded-tr-[5px] px-3 py-2" style={{ background: 'linear-gradient(135deg, rgba(160,82,224,0.15), rgba(124,58,237,0.11))' }}>
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

/* ═══════════════ DigiHome AI — mobilmockup (samme som ellers i decken) ═══════════════ */
function DeckAIChatPhone({ active }: { active: boolean }) {
  const chatRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => { if (chatRef.current && step > 0) { const t = setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), step >= 10 ? 700 : 50); return () => clearTimeout(t); } }, [step]);
  useEffect(() => {
    if (!active) { setStep(0); return; }
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    const run = () => { timeouts.forEach(clearTimeout); timeouts = []; setStep(0);
      [[0,0],[700,1],[2400,2],[4000,3],[5600,4],[7200,5],[8800,6],[10400,7],[12000,8],[13600,9],[15000,10]].forEach(([d,v]) => timeouts.push(setTimeout(() => setStep(v), d)));
      timeouts.push(setTimeout(run, 22000));
    };
    run();
    return () => timeouts.forEach(clearTimeout);
  }, [active]);

  const Av = () => <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${P}10` }}><Sparkles className="w-3 h-3" style={{ color: P }} strokeWidth={1.3} /></div>;
  const JA = () => <img src="https://customer-assets.emergentagent.com/job_9ac850f1-4c4e-4305-b194-8cd3509969c1/artifacts/93xk0b12_GWeZ391lh9hfONZ36JQzJ_ns7qFd8s.png?w=80&h=80&fit=crop&crop=face" alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />;
  const UMsg = ({ text, show }: any) => <div style={{ maxHeight: show ? 80 : 0, opacity: show ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease', marginBottom: show ? 10 : 0 }}><div className="flex items-end justify-end gap-1.5"><div className="max-w-[190px] rounded-[18px] rounded-br-[5px] px-3 py-2" style={{ backgroundColor: `${P}18`, border: `1px solid ${P}25` }}><p className="text-[10px] text-white/90 leading-[1.6]">{text}</p></div><JA /></div></div>;
  const AMsg = ({ text, show }: any) => <div style={{ maxHeight: show ? 100 : 0, opacity: show ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease', marginBottom: show ? 10 : 0 }}><div className="flex items-start gap-1.5"><Av /><div className="max-w-[200px] rounded-[18px] rounded-tl-[5px] px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}><p className="text-[10px] text-white/70 leading-[1.6]">{text}</p></div></div></div>;
  const Typing = ({ show }: any) => <div style={{ maxHeight: show ? 40 : 0, opacity: show ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.4s, opacity 0.3s', marginBottom: show ? 10 : 0 }}><div className="flex items-start gap-1.5"><Av /><div className="rounded-[18px] rounded-tl-[5px] px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}><div className="flex items-center gap-[4px]">{[0,1,2].map(i => <div key={i} className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: P, opacity: 0.5, animation: `aiPhoneTyping 1.2s ease-in-out ${i*0.15}s infinite` }} />)}</div></div></div></div>;

  return (
    <div className="w-[270px] rounded-[36px] bg-[#0a0a0a] p-[6px]" style={{ boxShadow: '0 50px 100px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08)' }}>
      <style>{`@keyframes aiPhoneTyping { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-3px) } }`}</style>
      <div className="w-[80px] h-[22px] bg-[#0a0a0a] rounded-b-[12px] mx-auto -mt-[6px] relative z-20" />
      <div className="rounded-[30px] overflow-hidden -mt-[22px] flex flex-col" style={{ height: 520 }}>
        <div className="px-4 pt-4 pb-3" style={{ backgroundColor: '#141414', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3"><img src="/digihome-logo-dark.svg" alt="" className="h-[12px] w-auto opacity-80" /><div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(5,150,105,0.15)' }}><div className="w-[4px] h-[4px] rounded-full bg-[#059669]" /><span className="text-[7px] font-semibold text-[#059669]">Online</span></div></div>
          <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${P}20` }}><Sparkles className="w-4 h-4" style={{ color: P }} strokeWidth={1.2} /></div><div><p className="text-[7px] text-white/70">Driftsassistent</p><p className="text-[14px] font-bold text-white tracking-[-0.01em]">DigiHome AI</p></div></div>
        </div>
        <div ref={chatRef} className="px-3.5 pt-3 pb-2 flex-1 overflow-y-auto" style={{ backgroundColor: '#141414', scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-2.5 mb-3"><div className="flex-1 h-[1px] bg-white/[0.1]" /><span className="text-[7px] font-semibold text-white/55 uppercase tracking-wider">I dag</span><div className="flex-1 h-[1px] bg-white/[0.1]" /></div>
          <UMsg text="Hei, stekeovnen har sluttet å virke. Ingen av platene blir varme." show={step >= 1} />
          <Typing show={step === 2} />
          <AMsg text="Hei Stine! Beklager det. Jeg oppretter en sak og finner en elektriker." show={step >= 3} />
          <UMsg text="Tusen takk! Hvor lang tid tar det?" show={step >= 4} />
          <Typing show={step === 5} />
          <AMsg text="Bergen Elektro kan komme fredag 10-12. Skal jeg bekrefte?" show={step >= 6} />
          <UMsg text="Ja, perfekt!" show={step >= 7} />
          <Typing show={step === 8} />
          <AMsg text="Bekreftet! Du får påminnelse torsdag kveld." show={step >= 9} />
          <div className="ml-8 mb-2" style={{ maxHeight: step >= 10 ? 100 : 0, opacity: step >= 10 ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease' }}>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="px-3 py-2 flex items-center gap-1.5" style={{ backgroundColor: `${P}08`, borderBottom: `1px solid ${P}12` }}><Sparkles className="w-2.5 h-2.5" style={{ color: P }} strokeWidth={1.5} /><span className="text-[8px] font-bold" style={{ color: P }}>AI opprettet automatisk</span></div>
              <div className="px-3 py-2.5 flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}><Check className="w-3.5 h-3.5 text-[#059669]" strokeWidth={2} /></div><div><p className="text-[10px] font-bold text-white/80">Sak #1042</p><p className="text-[8px] text-white/75 mt-0.5">Bergen Elektro · Fre 10:00</p></div></div>
            </div>
          </div>
        </div>
        <div className="px-3.5 pb-3 pt-1.5" style={{ backgroundColor: '#141414' }}>
          <div className="h-[38px] rounded-xl px-3 flex items-center gap-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}><Plus className="w-3.5 h-3.5 text-white/55" strokeWidth={1.8} /><span className="text-[10px] text-white/55 flex-1">Skriv en melding...</span><div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${P}20` }}><ArrowRight className="w-2.5 h-2.5" style={{ color: P }} strokeWidth={2} /></div></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ PANEL · DigiHome AI (mobilmockup — stor, rammefri, ingen tekst) ═══════════════ */
function AIPhonePanel({ on }: any) {
  return (
    <div className="relative h-full flex items-center justify-center" style={{ animation: on ? 'aiUp 0.95s cubic-bezier(0.22,1,0.36,1) 0.34s both' : undefined }}>
      {/* myk lilla glød bak telefonen — gir dybde uten boks */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div style={{ width: '90%', height: '78%', borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(160,82,224,0.20) 0%, rgba(210,152,255,0.09) 42%, transparent 72%)', filter: 'blur(12px)' }} />
      </div>

      {/* telefon — stor, fritt svevende (balanserer venstre kort) */}
      <div style={{ transform: 'scale(1.12)', transformOrigin: 'center', animation: on ? 'aiPhoneFloat 5.5s ease-in-out 1.3s infinite' : undefined }}>
        <DeckAIChatPhone active={on} />
      </div>
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
        @keyframes aiWipeClip { 0%,10% { clip-path: inset(0 78% 0 0); } 50% { clip-path: inset(0 22% 0 0); } 90%,100% { clip-path: inset(0 78% 0 0); } }
        @keyframes aiWipeLine { 0%,10% { left: 22%; } 50% { left: 78%; } 90%,100% { left: 22%; } }
        @keyframes aiPhoneFloat { 0%,100% { transform: scale(1.12) translateY(0); } 50% { transform: scale(1.12) translateY(-8px); } }
      `}</style>

      {/* ── header ── */}
      <div className="mb-5 sm:mb-7 flex items-end justify-between gap-10 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.42em] mb-4" style={{ fontFamily: F, color: AC, animation: on ? 'aiFade 0.7s ease 0.1s both' : undefined, opacity: on ? undefined : 0 }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: AC, boxShadow: `0 0 10px rgba(160,82,224,0.6)` }} /> Det intelligente laget
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[620px] shrink-0">
        <div className="lg:col-span-7 min-h-[340px] lg:min-h-0"><HeroStyling on={on} pdf={pdfMode} /></div>
        <div className="lg:col-span-5 min-h-[640px] lg:min-h-0"><AIPhonePanel on={on} /></div>
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
