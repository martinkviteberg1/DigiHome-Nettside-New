'use client';
/**
 * ContractDemo — scriptet, selvstendig rekonstruksjon av DigiHome-flyten:
 * Operasjonssentral → Autopilot-kommando → «Kontraktsutkast» som fylles live → sendt.
 *
 * Pixel-tro mot produktet (OperasjonssentralPage / Copilot / LeaseCanvas), men uten
 * data/nett/auth/router — ren tidslinje. Brukes inne i en deck-slide (SSystemIArbeid).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PenLine, Wallet, ScrollText, ChevronRight, Clock, Check, Zap, RefreshCw,
  SlidersHorizontal, ListFilter, Sparkles, X, FileSignature, User, Mail, Phone,
  CalendarDays, ArrowUpRight, ArrowUp, Mic, AudioLines, Maximize2, RotateCcw, Volume2,
} from 'lucide-react';

/* ── DigiHome merkelag (fra design_guidelines.json) ── */
const INK = '#0A0A0A';
const INK2 = '#36332E';
const MUTED = '#808080';
const MUTED2 = '#8A8680';
const LINE = '#ECEAE6';
const HAIRLINE = '#ECE7DF';
const CANVAS = '#fdfcfb';
const SOFT = '#F4F2EE';
const SUBTLE = '#F9F9F9';
const ACCENT = '#7C3AED';   // lilla — handling
const BRAND = '#d298ff';    // merkelilla — primær-CTA
const GREEN = '#16a34a';
const ORANGE = '#ea580c';
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
const F = "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif";

const CAT: Record<string, { bg: string; fg: string; Icon: any }> = {
  Signering: { bg: '#EFE6FC', fg: '#7C3AED', Icon: PenLine },
  Depositum: { bg: '#E2F5EC', fg: '#089B6A', Icon: Wallet },
  Kontrakt: { bg: '#E6E6FC', fg: '#4F46E5', Icon: ScrollText },
};

const TASKS = [
  { id: 't1', cat: 'Signering', unit: 'Olaf Ryes vei 11C · Enhet 10', title: 'Signering venter på huseier', sub: 'Huseier signerer som siste part', dot: ORANGE, cta: 'Send påminnelse' },
  { id: 't2', cat: 'Depositum', unit: 'Olaf Ryes vei 11C · Enhet 18', title: 'Depositum venter på betaling', sub: '52 500 kr', dot: '#b8b2a8' },
  { id: 't3', cat: 'Kontrakt', unit: 'Olaf Ryes vei 11C · Enhet 18', title: 'Fullfør kontraktsutkast', sub: 'Påbegynt for Kari Nordmann', dot: '#b8b2a8' },
];

const COMMAND = 'Lag leiekontrakt for Olaf Ryes vei 11C';
const SUGGESTIONS = ['Hvilke kontrakter utløper snart?', COMMAND, 'Hvor mange ledige boliger har vi?'];
const REPLY = 'Jeg oppretter et leiekontrakt-utkast for **Olaf Ryes vei 11C**. Manglende detaljer som leietaker, leie, datoer og depositum fylles inn i kontraktsbyggeren. Hvem skal leie boligen?';
const REPLY2 = 'Alt er fylt ut. Se over kontrakten og send når du er klar.';

const FILL: { k: string; v: string }[] = [
  { k: 'tenant_name', v: 'Kari Nordmann' },
  { k: 'tenant_email', v: 'kari.nordmann@gmail.com' },
  { k: 'tenant_phone', v: '412 90 145' },
  { k: 'start_date', v: '01.07.2026' },
  { k: 'monthly_rent', v: '14 500' },
  { k: 'deposit', v: '43 500' },
];
const ESSENTIALS = ['tenant_name', 'start_date', 'monthly_rent', 'tenant_email', 'tenant_phone', 'deposit'];

const WIN_W = 1240;
const WIN_H = 760;
const COPILOT_W = 416;
const LEASE_W = 424;

type Draft = Record<string, string>;

const renderInline = (t: string) =>
  t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') ? <strong key={i} style={{ color: INK, fontWeight: 700 }}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>);

/* ─────────────── Felt i kontraktsutkast (display-only) ─────────────── */
const LeaseField = ({ icon, label, value, placeholder, suffix, lit }: any) => {
  const filled = !!(value && String(value).trim());
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: MUTED2, fontFamily: FH }}>
        {icon}{label}
        {filled && <Check className="w-3 h-3 ml-auto" style={{ color: GREEN }} strokeWidth={3} />}
      </label>
      <div className="relative">
        <div className="w-full h-[52px] rounded-2xl px-4 flex items-center text-[14.5px] transition-all"
          style={{
            background: lit ? '#f5f0fe' : '#FBFAF8',
            border: `1.5px solid ${lit ? ACCENT : LINE}`,
            color: filled ? INK : '#b9b4ad',
            boxShadow: lit ? '0 0 0 4px rgba(124,58,237,0.12)' : 'none',
            paddingRight: suffix ? 48 : undefined,
          }}>
          {value || placeholder}
        </div>
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold" style={{ color: MUTED2 }}>{suffix}</span>}
      </div>
    </div>
  );
};

const SectionHead = ({ children }: any) => (
  <div className="flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
    <p className="text-[12.5px] font-bold tracking-tight" style={{ color: INK2, fontFamily: FH }}>{children}</p>
  </div>
);

/* ─────────────── Hovedkomponent ─────────────── */
export default function ContractDemo({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const isPdf = !!pdfMode;

  // state
  const [started, setStarted] = useState(false);     // kommando sendt → meldingsvisning
  const [pickIdx, setPickIdx] = useState(-1);         // hvilken chip som markeres
  const [sending, setSending] = useState(false);      // typing-dots
  const [reply, setReply] = useState(false);          // svar 1 vist
  const [reply2, setReply2] = useState(false);        // svar 2 vist
  const [leaseOpen, setLeaseOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ contract_type: 'tidsubestemt' });
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);
  const [tick, setTick] = useState(0); // re-render bump

  const timers = useRef<any[]>([]);
  const clearAll = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; };
  const at = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

  const reset = useCallback(() => {
    clearAll();
    setStarted(false); setPickIdx(-1); setSending(false); setReply(false); setReply2(false);
    setLeaseOpen(false); setDraft({ contract_type: 'tidsubestemt' }); setFlash({});
    setReady(false); setSent(false); setTick((t) => t + 1);
  }, []);

  // PDF: statisk representativt sluttbilde (alt utfylt, klar til å sende)
  useEffect(() => {
    if (!isPdf) return;
    clearAll();
    const d: Draft = { contract_type: 'tidsubestemt' };
    FILL.forEach((f) => (d[f.k] = f.v));
    setStarted(true); setReply(true); setReply2(true); setLeaseOpen(true);
    setDraft(d); setReady(true); setSent(false);
  }, [isPdf]);

  // Tidslinje
  const run = useCallback(() => {
    reset();
    const d: Draft = { contract_type: 'tidsubestemt' };
    at(900, () => setPickIdx(1));
    at(2000, () => { setPickIdx(-1); setStarted(true); setSending(true); });
    at(3300, () => { setSending(false); setReply(true); });
    at(4000, () => setLeaseOpen(true));
    // fyll feltene
    FILL.forEach((f, i) => {
      const t = 4900 + i * 760;
      at(t, () => {
        d[f.k] = f.v;
        setDraft({ ...d });
        setFlash((fl) => ({ ...fl, [f.k]: true }));
        timers.current.push(setTimeout(() => setFlash((fl) => { const n = { ...fl }; delete n[f.k]; return n; }), 1300));
      });
    });
    const fillEnd = 4900 + FILL.length * 760;
    at(fillEnd + 300, () => { setReady(true); setReply2(true); });
    at(fillEnd + 1700, () => setSent(true));
  }, [reset]);

  // start/stopp ved aktiv slide
  useEffect(() => {
    if (isPdf) return;
    if (active) { run(); }
    else { reset(); }
    return () => clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isPdf]);

  // skalering til å passe i sliden
  const [scale, setScale] = useState(isPdf ? 0.9 : 0.74);
  useEffect(() => {
    if (isPdf) { setScale(0.9); return; }
    const upd = () => {
      const availH = window.innerHeight - 248;
      const availW = window.innerWidth - 130;
      setScale(Math.max(0.5, Math.min(availH / WIN_H, availW / WIN_W, 0.92)));
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [isPdf]);

  const filledCount = ESSENTIALS.filter((k) => (draft[k] || '').toString().trim()).length;
  const pct = Math.round((filledCount / ESSENTIALS.length) * 100);
  const listDim = leaseOpen;

  return (
    <div className="relative mx-auto" style={{ width: WIN_W * scale, height: WIN_H * scale }} data-tick={tick}>
      <div style={{
        width: WIN_W, height: WIN_H, transform: `scale(${scale})`, transformOrigin: 'top left',
        position: 'absolute', top: 0, left: 0, borderRadius: 18, overflow: 'hidden', background: CANVAS,
        boxShadow: '0 4px 10px rgba(20,15,10,0.05), 0 34px 90px rgba(20,15,10,0.17)', border: '1px solid #e4dfd6',
      }}>
        {/* prikk-grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)', backgroundSize: '24px 24px', opacity: 0.16 }} />

        {/* ── OPERASJONSSENTRAL (hovedflate) ── */}
        <div className="absolute inset-0 overflow-hidden transition-all duration-500"
          style={{ paddingRight: COPILOT_W, filter: listDim ? 'blur(1.5px)' : 'none' }}>
          <div className="px-10 py-9 h-full" style={{ maxWidth: 880 }}>
            {/* header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
              <span className="text-[10.5px] tracking-[0.2em] uppercase" style={{ color: MUTED, fontWeight: 700 }}>Operasjonssentral · Lørdag 20. juni</span>
            </div>
            <h1 className="text-[50px] leading-[0.98]" style={{ color: INK, fontFamily: FH, fontWeight: 800, letterSpacing: '-0.035em' }}>Autopilot</h1>
            <p className="text-[15px] mt-3.5" style={{ color: INK2 }}>Du har <strong style={{ color: INK }}>3</strong> gjøremål.</p>

            {/* handlingsknapper */}
            <div className="flex items-center gap-2.5 mt-6 mb-7">
              {[{ I: ListFilter, l: 'Filter' }, { I: SlidersHorizontal, l: 'Regelverk' }, { I: RefreshCw, l: 'Oppdater' }].map(({ I, l }) => (
                <span key={l} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full"
                  style={{ border: `1px solid ${HAIRLINE}`, color: INK2, background: '#fff', fontFamily: FH, fontWeight: 600, fontSize: 13.5, boxShadow: '0 1px 3px rgba(10,10,10,0.04)' }}>
                  <I className="w-4 h-4" strokeWidth={2.2} />{l}
                </span>
              ))}
            </div>

            {/* kort */}
            <div className="flex flex-col gap-3.5">
              {TASKS.map((a) => {
                const cc = CAT[a.cat];
                const exec = !!a.cta;
                return (
                  <div key={a.id} className="relative bg-white rounded-[22px] overflow-hidden"
                    style={{ border: `1px solid ${HAIRLINE}`, boxShadow: '0 2px 8px rgba(10,10,10,0.03)' }}>
                    <div className="flex items-center gap-5 p-5">
                      <div className="w-16 h-16 rounded-[16px] shrink-0 flex items-center justify-center" style={{ background: cc.bg, border: `1px solid ${HAIRLINE}` }}>
                        <cc.Icon className="w-6 h-6" strokeWidth={2.1} style={{ color: cc.fg }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.dot }} />
                          <p className="text-[10.5px] uppercase tracking-[0.13em] truncate" style={{ color: MUTED, fontWeight: 700 }}>
                            {a.cat}<span className="opacity-40"> · </span><span style={{ color: INK2 }}>{a.unit}</span>
                          </p>
                        </div>
                        <p className="text-[18px] leading-[1.25] truncate" style={{ color: INK, fontFamily: FH, fontWeight: 700, letterSpacing: '-0.01em' }}>{a.title}</p>
                        <p className="text-[13px] truncate mt-1" style={{ color: MUTED }}>{a.sub}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: MUTED }}><Clock className="w-4 h-4" strokeWidth={2.2} /></span>
                        {exec ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full" style={{ background: BRAND, color: INK, fontFamily: FH, fontWeight: 700, fontSize: 13 }}>
                            <Zap className="w-3.5 h-3.5" strokeWidth={2.6} />{a.cta}
                          </span>
                        ) : (
                          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: MUTED, background: SUBTLE }}><ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.4} /></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11.5px] text-center mt-8 flex items-center justify-center gap-1.5" style={{ color: MUTED }}>
              Klikk et gjøremål for full kontekst <span className="opacity-50">·</span> <Zap className="w-3 h-3" style={{ color: ACCENT }} /> kjører handlingen direkte
            </p>
          </div>
        </div>

        {/* dim-overlay over listen når kontrakt åpnes */}
        <div className="absolute top-0 bottom-0 left-0 transition-opacity duration-500 pointer-events-none"
          style={{ right: COPILOT_W + LEASE_W, background: 'rgba(10,10,10,0.30)', opacity: leaseOpen ? 1 : 0 }} />

        {/* ── KONTRAKTSUTKAST (kanvas) ── */}
        <div className="absolute top-0 bottom-0 flex flex-col transition-transform duration-[450ms]"
          style={{
            right: COPILOT_W, width: LEASE_W, background: '#fff', borderLeft: `1px solid ${LINE}`,
            boxShadow: '-12px 0 44px rgba(10,10,10,0.13)',
            transform: leaseOpen ? 'translateX(0)' : 'translateX(100%)',
            transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
          }}>
          {/* header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#ecfdf5' }}>
                <FileSignature className="w-[18px] h-[18px]" style={{ color: '#047857' }} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-bold leading-tight tracking-tight" style={{ color: INK, fontFamily: FH }}>Kontraktsutkast</p>
                <p className="text-[12px] mt-0.5 truncate" style={{ color: MUTED2 }}>Olaf Ryes vei 11C, 5007 Bergen · enhet 10</p>
              </div>
            </div>
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ color: MUTED2 }}><X className="w-[18px] h-[18px]" strokeWidth={2.2} /></span>
          </div>

          {/* hint + fremdrift */}
          <div className="px-6 pb-4 shrink-0 flex flex-col gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3.5 py-1.5 w-fit" style={{ background: '#f5f0fe' }}>
              <Sparkles className="w-3 h-3" style={{ color: ACCENT }} strokeWidth={2.4} />
              <span className="text-[11px] font-semibold" style={{ color: '#5b21b6' }}>Fyll selv, skriv eller snakk — feltene oppdateres live</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#EFEDE9' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: ready ? GREEN : INK, borderRadius: 999, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
              <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: MUTED2, fontFamily: FH }}>{filledCount}/{ESSENTIALS.length}</span>
            </div>
          </div>

          {/* body */}
          <div className="flex-1 overflow-hidden px-6 py-5 flex flex-col gap-7 border-t" style={{ borderColor: LINE }}>
            <div className="flex flex-col gap-5">
              <SectionHead>Leietaker</SectionHead>
              <LeaseField icon={<User className="w-3 h-3" />} label="Navn" value={draft.tenant_name} placeholder="F.eks. Kari Nordmann" lit={flash.tenant_name} />
              <LeaseField icon={<Mail className="w-3 h-3" />} label="E-post" value={draft.tenant_email} placeholder="kari@epost.no" lit={flash.tenant_email} />
              <LeaseField icon={<Phone className="w-3 h-3" />} label="Telefon" value={draft.tenant_phone} placeholder="900 00 000" lit={flash.tenant_phone} />
            </div>
            <div className="flex flex-col gap-5">
              <SectionHead>Leieforhold</SectionHead>
              <LeaseField icon={<CalendarDays className="w-3 h-3" />} label="Innflytting" value={draft.start_date} placeholder="dd.mm.åååå" lit={flash.start_date} />
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2 block" style={{ color: MUTED2, fontFamily: FH }}>Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'tidsubestemt', l: 'Løpende' }, { v: 'tidsbestemt', l: 'Tidsbestemt' }].map((o) => {
                    const on = (draft.contract_type || 'tidsubestemt') === o.v;
                    return (
                      <span key={o.v} className="h-11 rounded-2xl text-[13px] font-semibold flex items-center justify-center"
                        style={{ background: on ? INK : '#FBFAF8', color: on ? '#fff' : INK2, border: `1.5px solid ${on ? INK : LINE}`, fontFamily: FH }}>{o.l}</span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <SectionHead>Økonomi</SectionHead>
              <LeaseField icon={<Wallet className="w-3 h-3" />} label="Månedsleie" value={draft.monthly_rent} placeholder="0" suffix="kr" lit={flash.monthly_rent} />
              <LeaseField icon={<Wallet className="w-3 h-3" />} label="Depositum" value={draft.deposit} placeholder="0" suffix="kr" lit={flash.deposit} />
            </div>
          </div>

          {/* footer */}
          <div className="px-6 py-5 shrink-0 border-t" style={{ borderColor: LINE }}>
            <div className="w-full h-[52px] rounded-full text-white text-[14.5px] font-bold inline-flex items-center justify-center gap-2 transition-all"
              style={{ background: sent ? GREEN : INK, opacity: ready ? 1 : 0.4, fontFamily: FH }}>
              {sent ? <><Check className="w-4 h-4" strokeWidth={2.6} /> Sendt til signering</> : <>Se over og send <ArrowUpRight className="w-4 h-4" strokeWidth={2.4} /></>}
            </div>
            <p className="text-[10.5px] text-center mt-2.5" style={{ color: MUTED2 }}>
              {sent ? 'Kontrakten er sendt til partene for signering.' : ready ? 'Du ser over alt og sender selv — ingenting sendes automatisk.' : 'Fyll inn leietaker, innflytting og månedsleie for å gå videre.'}
            </p>
          </div>
        </div>

        {/* ── AUTOPILOT (copilot) ── */}
        <div className="absolute top-0 bottom-0 right-0 flex flex-col" style={{ width: COPILOT_W, background: '#fff', borderLeft: `1px solid ${LINE}` }}>
          {/* header */}
          <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b" style={{ borderColor: LINE }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: INK }}>
                <Sparkles className="w-4 h-4" strokeWidth={2.2} style={{ color: BRAND }} />
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold leading-none" style={{ color: INK, fontFamily: FH }}>Autopilot</p>
                <p className="text-[11px] mt-1 truncate" style={{ color: MUTED2 }}>{leaseOpen ? 'Ser på: Kontrakt · Olaf Ryes vei 11C' : 'Ser på: Operasjonssentralen'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0" style={{ color: MUTED2 }}>
              <RotateCcw className="w-4 h-4" strokeWidth={2} /><Maximize2 className="w-4 h-4 ml-2.5" strokeWidth={2} /><X className="w-4 h-4 ml-2.5" strokeWidth={2.2} style={{ color: INK }} />
            </div>
          </div>

          {/* body */}
          <div className="flex-1 overflow-hidden px-5 py-6">
            {!started ? (
              <div className="pt-4">
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: SOFT }}>
                  <Sparkles className="w-6 h-6" strokeWidth={1.8} style={{ color: INK }} />
                </span>
                <h3 className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Hva kan jeg hjelpe med?</h3>
                <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: MUTED2 }}>
                  Spør om porteføljen, eller be meg gjøre noe — som å lage en leiekontrakt fra én setning. Du kan også snakke.
                </p>
                <div className="mt-6 space-y-2.5">
                  {SUGGESTIONS.map((s, i) => (
                    <div key={s} className="w-full text-left px-4 py-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all"
                      style={{ background: i === pickIdx ? '#fff' : 'transparent', boxShadow: i === pickIdx ? '0 8px 22px -10px rgba(124,58,237,0.4)' : 'none', border: `1px solid ${i === pickIdx ? '#e7dcff' : 'transparent'}` }}>
                      <span className="text-[13px]" style={{ color: i === pickIdx ? INK : INK2 }}>{s}</span>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: i === pickIdx ? ACCENT : MUTED }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-7">
                {/* bruker-kommando */}
                <div className="flex justify-end" style={{ animation: 'cdRise 0.3s ease both' }}>
                  <div className="max-w-[82%] px-4 py-3 rounded-[20px] rounded-br-[7px] text-[14px] leading-[1.5]" style={{ background: INK, color: '#fff' }}>{COMMAND}</div>
                </div>
                {/* svar */}
                {(sending || reply) && (
                  <div className="flex gap-3" style={{ animation: 'cdRise 0.3s ease both' }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: SOFT, border: `1px solid ${LINE}` }}>
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={2} style={{ color: INK }} />
                    </span>
                    {sending ? (
                      <span className="flex gap-1.5 items-center px-3 py-2.5 rounded-2xl" style={{ background: SOFT }}>
                        {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: MUTED, animation: `cdDot 1.1s ${i * 0.18}s infinite` }} />)}
                      </span>
                    ) : (
                      <div className="flex-1 min-w-0 space-y-3">
                        <p className="text-[14px] leading-[1.68]" style={{ color: INK2 }}>{renderInline(REPLY)}</p>
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: MUTED }}><Volume2 className="w-3.5 h-3.5" strokeWidth={2} />Les opp</span>
                      </div>
                    )}
                  </div>
                )}
                {/* svar 2 */}
                {reply2 && (
                  <div className="flex gap-3" style={{ animation: 'cdRise 0.3s ease both' }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: SOFT, border: `1px solid ${LINE}` }}>
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={2} style={{ color: INK }} />
                    </span>
                    <p className="flex-1 text-[14px] leading-[1.68]" style={{ color: INK2 }}>{REPLY2}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* composer */}
          <div className="px-4 pb-4 pt-2 shrink-0">
            <div className="flex items-end gap-2 rounded-[22px] p-2" style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 6px 20px -12px rgba(10,10,10,0.18)' }}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: SOFT, color: INK2 }}><Mic className="w-4 h-4" strokeWidth={2} /></span>
              <span className="flex-1 text-[14px] py-2.5" style={{ color: '#b9b4ad' }}>Spør eller be om noe…</span>
              <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: BRAND, color: INK }}><AudioLines className="w-4 h-4" strokeWidth={2.4} /></span>
            </div>
            <p className="text-[10.5px] text-center mt-2" style={{ color: MUTED2 }}>Autopilot kan ta feil — sjekk viktige detaljer før du sender.</p>
          </div>
        </div>
      </div>

      {/* spill igjen */}
      {!isPdf && (
        <button onClick={run} aria-label="Spill av demoen på nytt"
          className="absolute -bottom-11 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:-translate-y-0.5"
          style={{ border: '1px solid rgba(28,22,16,0.12)', color: 'rgba(28,22,16,0.6)', background: 'rgba(255,255,255,0.7)', fontFamily: F, fontSize: 12.5, fontWeight: 600 }}>
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} /> Spill igjen
        </button>
      )}

      <style>{`
        @keyframes cdRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cdDot { 0%,100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
      `}</style>
    </div>
  );
}
