'use client';
/**
 * ProductDuo — investor-slide-innhold: «Én motor. To produkter.»
 * Venstre: B2B forvalter-plattform (desktop). Høyre: B2C privat-utleier-app (mobil).
 * Tro mot den ekte appen (Owner Portal + Forvalter-plattform), samme autopilot-motor i bunn.
 */
import React from 'react';
import { LayoutGrid, Wallet, Users, Sparkles, Activity, Cpu, MapPin, Search, MessageSquare, Phone, DollarSign, Building2, Wrench, ChevronRight, Home, Bell, Plus } from 'lucide-react';

const INK = '#1a1a1a', INK0 = '#0a0a0a', SUB = '#736857', FAINT = '#9b9080';
const LINE = '#ebe6df', DIV = '#e8e4df', SURF = '#ffffff', SURF2 = '#fbfaf8', CANVAS = '#faf8f5';
const LILAC = '#cf97fc', LILAC_TXT = '#7c3aed', LILAC_BG = 'rgba(207,151,252,0.13)', SUCCESS = '#3f7d52';
const F: React.CSSProperties = { fontFamily: "var(--font-body), 'ABC Diatype', sans-serif" };
const FH: React.CSSProperties = { fontFamily: "var(--font-heading), 'PP Right Grotesk', sans-serif" };

/* ───────────── B2B · Forvalter-plattform (desktop) ───────────── */
function DesktopMock() {
  const nav = [
    { icon: LayoutGrid, label: 'Oversikt', on: true },
    { icon: Activity, label: 'Pipeline' },
    { icon: Building2, label: 'Eiendommer' },
    { icon: Wallet, label: 'Økonomi' },
    { icon: Users, label: 'Team' },
  ];
  const kpis = [
    { label: 'Boliger', value: '142' },
    { label: 'Belegg', value: '96%' },
    { label: 'MRR', value: '1,84M' },
  ];
  const props = [
    { img: '/bergen-houses.webp', name: 'Camilla Colletts gate 14', stat: '8 enheter · 100%' },
    { img: '/interior-living.webp', name: 'Møllergata 4', stat: '6 enheter · 96%' },
    { img: '/bryggen-alley.webp', name: 'Kong Oscars gate 18', stat: '12 enheter · 92%' },
    { img: '/interior-kitchen.webp', name: 'Nygårdsgaten 31', stat: '4 enheter · 100%' },
  ];
  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{ background: SURF, border: `1px solid ${LINE}`, boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 30px 70px -34px rgba(26,22,18,0.42)' }}>
      {/* window chrome */}
      <div className="flex items-center gap-2 px-4" style={{ height: 34, background: SURF2, borderBottom: `1px solid ${DIV}` }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e6d9c8' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ece1d2' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f1e8db' }} />
        <span className="mx-auto text-[10px] font-semibold tracking-tight" style={{ ...F, color: FAINT }}>app.digihome.no · Forvalter</span>
      </div>
      <div className="flex" style={{ height: 300 }}>
        {/* sidebar */}
        <div className="shrink-0 flex flex-col px-3 py-4" style={{ width: 132, background: INK0 }}>
          <div className="flex items-center gap-1.5 px-1 mb-5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-[9px] font-bold" style={{ background: 'linear-gradient(135deg,#cf97fc,#7c5cff)' }}>H</span>
            <span className="text-[12px] font-bold text-white" style={FH}>digihome</span>
          </div>
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.label} className="flex items-center gap-2 rounded-lg px-2 py-1.5 mb-0.5" style={{ background: n.on ? 'rgba(255,255,255,0.10)' : 'transparent' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: n.on ? LILAC : 'rgba(255,255,255,0.5)' }} strokeWidth={1.8} />
                <span className="text-[11px] font-medium" style={{ ...F, color: n.on ? '#fff' : 'rgba(255,255,255,0.62)' }}>{n.label}</span>
              </div>
            );
          })}
        </div>
        {/* main */}
        <div className="flex-1 p-4 overflow-hidden" style={{ background: CANVAS }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ ...F, color: FAINT }}>Portefølje</p>
              <p className="text-[16px] font-bold tracking-[-0.02em]" style={{ ...FH, color: INK }}>Alle eiendommer</p>
            </div>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: SURF, border: `1px solid ${LINE}` }}><Search className="w-3.5 h-3.5" style={{ color: FAINT }} /></div>
          </div>
          {/* kpi */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl px-2.5 py-2" style={{ background: SURF, border: `1px solid ${LINE}` }}>
                <p className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ ...F, color: FAINT }}>{k.label}</p>
                <p className="text-[16px] font-bold tabular-nums tracking-[-0.02em]" style={{ ...FH, color: INK }}>{k.value}</p>
              </div>
            ))}
          </div>
          {/* property grid */}
          <div className="grid grid-cols-2 gap-2">
            {props.map((p) => (
              <div key={p.name} className="rounded-xl overflow-hidden flex items-center gap-2.5 p-1.5 pr-2.5" style={{ background: SURF, border: `1px solid ${LINE}` }}>
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0" style={{ background: '#ece6dd' }}><img src={p.img} alt="" className="w-full h-full object-cover" /></div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate" style={{ ...FH, color: INK }}>{p.name}</p>
                  <p className="text-[9.5px] truncate" style={{ ...F, color: SUB }}>{p.stat}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── B2C · Privat-utleier-app (mobil — Owner Portal) ───────────── */
function PhoneMock() {
  return (
    <div className="relative" style={{ width: 232 }}>
      <div className="relative rounded-[36px] p-[7px]" style={{ background: '#0a0a0a', boxShadow: '0 40px 80px -36px rgba(26,22,18,0.5), 0 0 0 1px rgba(26,22,18,0.06)' }}>
        <div className="rounded-[30px] overflow-hidden" style={{ background: CANVAS, height: 452 }}>
          {/* statusbar */}
          <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
            <span className="text-[10px] font-bold" style={{ ...F, color: INK }}>9:41</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-2 rounded-[2px]" style={{ border: `1px solid ${INK}`, opacity: 0.6 }} /></span>
          </div>
          {/* content */}
          <div className="px-4 pt-1">
            <p className="text-[11px]" style={{ ...F, color: SUB }}>God morgen</p>
            <p className="text-[22px] font-semibold tracking-[-0.03em] leading-tight" style={{ ...FH, color: INK }}>Martin <span style={{ fontSize: 18 }}>👋</span></p>
            {/* property card */}
            <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: INK0 }}>
              <div className="relative" style={{ height: 84 }}>
                <img src="/bergen-houses.webp" alt="" className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.85), transparent 70%)' }} />
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="flex items-center gap-1 mb-0.5"><MapPin className="w-2.5 h-2.5 text-white/55" /><span className="text-[9px] text-white/55" style={F}>Bergen</span></div>
                  <p className="text-[13px] font-semibold text-white tracking-tight" style={FH}>Camilla Colletts gate 14A</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[10px] text-white/55" style={F}>Utleid · Anna Berg</span>
                <span className="text-[12px] font-bold text-white tabular-nums" style={FH}>16 800 <span className="text-[9px] text-white/55">kr/mnd</span></span>
              </div>
            </div>
            {/* kpi tiles */}
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <div className="rounded-xl px-2.5 py-2" style={{ background: SURF, border: `1px solid ${LINE}` }}>
                <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ ...F, color: FAINT }}>Inntekt mnd</p>
                <p className="text-[14px] font-bold tabular-nums" style={{ ...FH, color: INK }}>16 800 kr</p>
              </div>
              <div className="rounded-xl px-2.5 py-2" style={{ background: SURF, border: `1px solid ${LINE}` }}>
                <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ ...F, color: FAINT }}>Neste utbetaling</p>
                <p className="text-[14px] font-bold" style={{ ...FH, color: INK }}>28. jun</p>
              </div>
            </div>
            {/* forvalter card */}
            <div className="mt-2.5 rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: SURF, border: `1px solid ${LINE}` }}>
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ background: '#ece6dd' }}><img src="/team/martin-kviteberg-face.jpg" alt="" className="w-full h-full object-cover" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ ...F, color: FAINT }}>Din forvalter</p>
                <p className="text-[12px] font-semibold truncate" style={{ ...FH, color: INK }}>Sarah Lia</p>
              </div>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: LILAC_BG }}><MessageSquare className="w-3.5 h-3.5" style={{ color: LILAC_TXT }} /></span>
            </div>
          </div>
          {/* tab bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 pt-2 pb-3" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${LINE}` }}>
            {[{ i: Home, l: 'Oversikt', on: true }, { i: DollarSign, l: 'Økonomi' }, { i: Wrench, l: 'Saker' }, { i: MessageSquare, l: 'Meldinger' }].map((t) => {
              const Icon = t.i;
              return (
                <div key={t.l} className="flex flex-col items-center gap-0.5">
                  <Icon className="w-4 h-4" style={{ color: t.on ? LILAC_TXT : FAINT }} strokeWidth={t.on ? 2.2 : 1.7} />
                  <span className="text-[7.5px] font-semibold" style={{ ...F, color: t.on ? INK : FAINT }}>{t.l}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FuncRow({ icon: Icon, title, sub }: any) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0 mt-0.5" style={{ background: LILAC_BG }}><Icon className="w-[16px] h-[16px]" style={{ color: LILAC_TXT }} strokeWidth={1.9} /></span>
      <div>
        <p className="text-[14px] font-bold tracking-[-0.01em]" style={{ ...FH, color: INK }}>{title}</p>
        <p className="text-[12px] leading-snug" style={{ ...F, color: SUB }}>{sub}</p>
      </div>
    </div>
  );
}

function Badge({ label, plan }: { label: string; plan: string }) {
  return (
    <div className="flex items-center justify-between w-full mb-5">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: LILAC_TXT }} />
        <span className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ ...F, color: INK }}>{label}</span>
      </div>
      <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-md" style={{ ...F, color: SUB, background: SURF, border: `1px solid ${LINE}` }}>{plan}</span>
    </div>
  );
}

export default function ProductDuo({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const show = active || pdfMode;
  const anim = (d: number) => (show && !pdfMode ? `pd-in 0.8s cubic-bezier(0.16,1,0.3,1) ${d}s both` : undefined);
  return (
    <div className="w-full mx-auto" style={{ maxWidth: 1280 }}>
      <style>{`@keyframes pd-in { from { opacity:0; transform: translateY(20px); filter: blur(6px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }`}</style>
      <div className="grid items-stretch" style={{ gridTemplateColumns: '1.1fr 60px 0.9fr' }}>
        {/* B2B */}
        <div className="flex flex-col" style={{ animation: anim(0.1), opacity: show ? undefined : 0 }}>
          <Badge label="B2B · Forvaltere" plan="Pro · Enterprise" />
          <div className="flex-1 flex items-center"><DesktopMock /></div>
          <div className="mt-6 space-y-3.5">
            <FuncRow icon={LayoutGrid} title="Pipeline & portefølje" sub="Alle leads og boliger i sanntid — én oversikt." />
            <FuncRow icon={Wallet} title="Automatisert drift & økonomi" sub="Husleie, oppgjør, saker og rapporter går av seg selv." />
            <FuncRow icon={Users} title="Team, roller & integrasjoner" sub="FINN, BankID og regnskap koblet direkte inn." />
          </div>
        </div>

        {/* divider med motor-node */}
        <div className="relative flex items-center justify-center">
          <div className="absolute top-0 bottom-0 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${DIV} 14%, ${DIV} 86%, transparent)` }} />
          <div className="relative flex flex-col items-center gap-2 px-1" style={{ animation: anim(0.36), opacity: show ? undefined : 0 }}>
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl" style={{ background: INK0, boxShadow: `0 0 0 6px ${CANVAS}, 0 10px 24px -10px rgba(26,22,18,0.5)` }}><Cpu className="w-5 h-5" style={{ color: LILAC }} strokeWidth={1.8} /></span>
            <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-center leading-tight" style={{ ...F, color: FAINT, width: 56 }}>Samme motor</span>
          </div>
        </div>

        {/* B2C */}
        <div className="flex flex-col" style={{ animation: anim(0.24), opacity: show ? undefined : 0 }}>
          <Badge label="B2C · Private utleiere" plan="Gratis · Essential · Hybrid" />
          <div className="flex-1 flex items-center justify-center"><PhoneMock /></div>
          <div className="mt-6 space-y-3.5">
            <FuncRow icon={Plus} title="Registrer boligen på minutter" sub="Last opp bilder — AI fyller ut resten." />
            <FuncRow icon={Sparkles} title="AI tar annonse, visning & kontrakt" sub="Hele utleien skjer på autopilot for deg." />
            <FuncRow icon={Activity} title="Se leie, saker & status" sub="Inntekt, utbetalinger og forvalter — i lomma." />
          </div>
        </div>
      </div>
    </div>
  );
}
