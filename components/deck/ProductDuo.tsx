'use client';
/**
 * ProductDuo — investor-slide-innhold: «Én motor. To produkter.»
 * Venstre: B2B forvalter-plattform (desktop) — PIXEL-NØYAKTIG lik den ekte
 *          forvalter-portalen (AdminLayout + AdminDashboard «Oversikt»).
 * Høyre:  B2C privat-utleier-app (mobil — Owner Portal).
 * Ren, profesjonell komposisjon: to enheter, minimale etiketter, mye luft.
 */
import React from 'react';
import {
  LayoutDashboard, Gauge, MessageSquare, UserCheck, CalendarDays,
  Building2, FileText, AlertCircle, DollarSign, Home, Users, TrendingUp,
  Search, Bell, Wrench, ChevronRight, MapPin, Sparkles,
} from 'lucide-react';

/* ekte portal-DNA */
const PJ = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const INK = '#1a1a1a', SUB = '#6b6358', MUTED = '#a09888', FAINT = '#9b9080';
const BORDER = '#ece7df', CARD = '#ffffff', BG = '#faf8f5', SIDEBAR = '#1a1a1a';
const ACCENT = '#7c3aed', LILAC = '#cf97fc', GREEN = '#6aab8e', BLUE = '#5b8def', SLATE = '#64748b', ROSE = '#e5484d';
/* deck-typografi for etiketter */
const F: React.CSSProperties = { fontFamily: "var(--font-body), 'ABC Diatype', sans-serif" };
const FH: React.CSSProperties = { fontFamily: "var(--font-heading), 'PP Right Grotesk', sans-serif" };

/* ───────────── B2B · Forvalter-plattform (desktop) — tro mot AdminLayout/AdminDashboard ───────────── */
function SideItem({ icon: Icon, label, active, badge, badgeColor }: any) {
  return (
    <div className="relative flex items-center gap-2.5 rounded-lg mx-2 px-2.5 py-[7px]"
      style={{ background: active ? 'linear-gradient(90deg, rgba(207,151,252,0.20), rgba(207,151,252,0.04))' : 'transparent' }}>
      {active && <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 rounded-r-full" style={{ width: 4, height: 22, background: 'linear-gradient(to bottom, #cf97fc, #7c5cff)', boxShadow: '0 0 12px rgba(207,151,252,0.65)' }} />}
      <Icon className="w-[15px] h-[15px] shrink-0" style={{ color: active ? LILAC : 'rgba(255,255,255,0.5)' }} strokeWidth={1.9} />
      <span className="text-[11.5px] font-medium flex-1 truncate" style={{ fontFamily: PJ, color: active ? '#fff' : 'rgba(255,255,255,0.55)' }}>{label}</span>
      {badge && <span className="text-[7.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontFamily: PJ, background: badgeColor || 'rgba(207,151,252,0.22)', color: badgeColor ? '#fff' : LILAC }}>{badge}</span>}
    </div>
  );
}

function DesktopMock() {
  const kpis = [
    { icon: Building2, color: GREEN, value: '142', label: 'Eiendommer', live: true },
    { icon: Home, color: BLUE, value: '142', label: 'Enheter', sub: '137 utleid' },
    { icon: Users, color: SLATE, value: '137', label: 'Leietakere' },
    { icon: AlertCircle, color: ROSE, value: '3', label: 'Åpne saker', sub: 'Krever oppfølging' },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ width: 824, background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 40px 90px -38px rgba(26,22,18,0.45)' }}>
      {/* window chrome */}
      <div className="flex items-center gap-2 px-4" style={{ height: 32, background: '#f3efe9', borderBottom: `1px solid ${BORDER}` }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e2d6c6' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e9ddcd' }} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#efe5d6' }} />
        <span className="mx-auto text-[10px] font-medium" style={{ fontFamily: PJ, color: MUTED }}>app.digihome.no/forvalter</span>
      </div>
      <div className="flex" style={{ height: 502 }}>
        {/* sidebar */}
        <div className="shrink-0 flex flex-col py-3.5" style={{ width: 190, background: SIDEBAR }}>
          <div className="flex items-center gap-2 px-4 mb-4">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md text-white text-[10px] font-bold" style={{ background: 'linear-gradient(135deg,#cf97fc,#7c5cff)', fontFamily: PJ }}>H</span>
            <span className="text-[13px] font-bold text-white tracking-tight" style={{ fontFamily: PJ }}>digihome</span>
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] px-4 pt-2 pb-1.5" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.35)' }}>Arbeid</p>
          <SideItem icon={LayoutDashboard} label="Oversikt" active />
          <SideItem icon={Gauge} label="Operasjonssentral" badge="Ny" />
          <SideItem icon={MessageSquare} label="Innboks" />
          <SideItem icon={UserCheck} label="Leads" badge="Pro" />
          <SideItem icon={CalendarDays} label="Kalender" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] px-4 pt-3.5 pb-1.5" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.35)' }}>Drift</p>
          <SideItem icon={Building2} label="Eiendommer" />
          <SideItem icon={FileText} label="Kontrakter" />
          <SideItem icon={AlertCircle} label="Saker" />
          <SideItem icon={DollarSign} label="Økonomi" />
          <div className="mt-auto mx-2 flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0"><img src="/team/martin-kviteberg-face.jpg" alt="" className="w-full h-full object-cover" /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white truncate" style={{ fontFamily: PJ }}>Martin Kviteberg</p>
              <p className="text-[9px] truncate" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.45)' }}>Forvalter</p>
            </div>
          </div>
        </div>
        {/* main */}
        <div className="flex-1 px-6 py-5 overflow-hidden" style={{ background: BG }}>
          {/* header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-[23px] font-bold tracking-[-0.03em] leading-tight" style={{ fontFamily: PJ, color: INK }}>God morgen, Martin <span style={{ fontSize: 19 }}>👋</span></h1>
              <p className="text-[12.5px] mt-1" style={{ fontFamily: PJ, color: MUTED }}>torsdag 12. juni</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12.5px] font-medium" style={{ fontFamily: PJ, color: INK, background: CARD, border: `1px solid ${BORDER}` }}>Saker <span className="min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1" style={{ background: ROSE }}>3</span></span>
              <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12.5px] font-semibold text-white" style={{ fontFamily: PJ, background: INK }}><Building2 className="w-3.5 h-3.5" />Eiendommer</span>
            </div>
          </div>
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.color}1f` }}><Icon className="w-[18px] h-[18px]" style={{ color: k.color }} strokeWidth={2} /></span>
                    {k.live && <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider" style={{ fontFamily: PJ, color: GREEN }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />Live</span>}
                  </div>
                  <p className="text-[24px] font-bold tabular-nums leading-none tracking-tight" style={{ fontFamily: PJ, color: INK }}>{k.value}</p>
                  <p className="text-[12.5px] mt-1.5" style={{ fontFamily: PJ, color: SUB }}>{k.label}</p>
                  {k.sub && <p className="text-[11px] font-semibold mt-0.5" style={{ fontFamily: PJ, color: k.color === ROSE ? ROSE : GREEN }}>{k.sub}</p>}
                </div>
              );
            })}
          </div>
          {/* portfolio banner */}
          <div className="relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden" style={{ background: 'rgba(124,58,237,0.07)' }}>
            <div className="absolute top-[-40%] right-[-4%] w-[220px] h-[220px] rounded-full" style={{ background: ACCENT, opacity: 0.08 }} />
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.20)' }}><TrendingUp className="w-6 h-6" style={{ color: ACCENT }} strokeWidth={2} /></span>
            <div className="flex-1 min-w-0 relative">
              <p className="text-[15px] font-semibold mb-0.5" style={{ fontFamily: PJ, color: INK }}>Porteføljen presterer godt</p>
              <p className="text-[13px]" style={{ fontFamily: PJ, color: SUB }}>1,25 M kr/mnd · 137 av 142 enheter utleid (96 %)</p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-[12.5px] font-semibold text-white relative" style={{ fontFamily: PJ, background: INK }}>Se portefølje <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── B2C · Privat-utleier-app (mobil — Owner Portal) ───────────── */
function PhoneMock() {
  return (
    <div className="relative rounded-[38px] p-[7px]" style={{ width: 244, background: '#0a0a0a', boxShadow: '0 44px 90px -38px rgba(26,22,18,0.5), 0 0 0 1px rgba(26,22,18,0.06)' }}>
      <div className="rounded-[32px] overflow-hidden" style={{ background: BG, height: 478 }}>
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] font-bold" style={{ fontFamily: PJ, color: INK }}>9:41</span>
          <span className="w-3.5 h-2 rounded-[2px]" style={{ border: `1px solid ${INK}`, opacity: 0.5 }} />
        </div>
        <div className="px-4 pt-1">
          <p className="text-[11px]" style={{ fontFamily: PJ, color: SUB }}>God morgen</p>
          <p className="text-[22px] font-bold tracking-[-0.03em] leading-tight" style={{ fontFamily: PJ, color: INK }}>Martin <span style={{ fontSize: 18 }}>👋</span></p>
          {/* property card */}
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ background: '#0a0a0a' }}>
            <div className="relative" style={{ height: 88 }}>
              <img src="/bergen-houses.webp" alt="" className="w-full h-full object-cover" style={{ opacity: 0.88 }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.88), transparent 68%)' }} />
              <div className="absolute bottom-2 left-3 right-3">
                <div className="flex items-center gap-1 mb-0.5"><MapPin className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.55)' }} /><span className="text-[9px]" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.55)' }}>Bergen</span></div>
                <p className="text-[13px] font-semibold text-white tracking-tight" style={{ fontFamily: PJ }}>Camilla Colletts gate 14A</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px]" style={{ fontFamily: PJ, color: 'rgba(255,255,255,0.55)' }}>Utleid · Anna Berg</span>
              <span className="text-[12px] font-bold text-white tabular-nums" style={{ fontFamily: PJ }}>16 800 <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.55)' }}>kr/mnd</span></span>
            </div>
          </div>
          {/* kpi tiles */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div className="rounded-xl px-2.5 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: FAINT }}>Inntekt mnd</p>
              <p className="text-[14px] font-bold tabular-nums" style={{ fontFamily: PJ, color: INK }}>16 800 kr</p>
            </div>
            <div className="rounded-xl px-2.5 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: PJ, color: FAINT }}>Neste utbetaling</p>
              <p className="text-[14px] font-bold" style={{ fontFamily: PJ, color: INK }}>28. jun</p>
            </div>
          </div>
          {/* forvalter card */}
          <div className="mt-2.5 rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"><img src="/team/martin-kviteberg-face.jpg" alt="" className="w-full h-full object-cover" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ fontFamily: PJ, color: FAINT }}>Din forvalter</p>
              <p className="text-[12px] font-semibold truncate" style={{ fontFamily: PJ, color: INK }}>Sarah Lia</p>
            </div>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: 'rgba(207,151,252,0.14)' }}><MessageSquare className="w-3.5 h-3.5" style={{ color: ACCENT }} /></span>
          </div>
        </div>
        {/* tab bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 pt-2 pb-3" style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${BORDER}` }}>
          {[{ i: Home, l: 'Oversikt', on: true }, { i: DollarSign, l: 'Økonomi' }, { i: Wrench, l: 'Saker' }, { i: MessageSquare, l: 'Meldinger' }].map((t) => {
            const Icon = t.i;
            return (
              <div key={t.l} className="flex flex-col items-center gap-0.5">
                <Icon className="w-[17px] h-[17px]" style={{ color: t.on ? ACCENT : FAINT }} strokeWidth={t.on ? 2.2 : 1.7} />
                <span className="text-[7.5px] font-semibold" style={{ fontFamily: PJ, color: t.on ? INK : FAINT }}>{t.l}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeviceLabel({ tag, plan }: { tag: string; plan: string }) {
  return (
    <div className="text-center mt-6">
      <p className="text-[12.5px] font-bold uppercase tracking-[0.2em]" style={{ ...FH, color: INK }}>{tag}</p>
      <p className="text-[12px] mt-1.5" style={{ ...F, color: '#8a8276' }}>{plan}</p>
    </div>
  );
}

export default function ProductDuo({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const show = active || pdfMode;
  const anim = (d: number) => (show && !pdfMode ? `pd-in 0.85s cubic-bezier(0.16,1,0.3,1) ${d}s both` : undefined);
  return (
    <div className="w-full mx-auto" style={{ maxWidth: 1280 }}>
      <style>{`@keyframes pd-in { from { opacity:0; transform: translateY(22px); filter: blur(7px); } to { opacity:1; transform: translateY(0); filter: blur(0); } }`}</style>
      <div className="flex items-end justify-center" style={{ gap: 64 }}>
        <div className="flex flex-col items-center" style={{ animation: anim(0.1), opacity: show ? undefined : 0 }}>
          <DesktopMock />
          <DeviceLabel tag="B2B · Forvalter-plattform" plan="For profesjonelle forvaltere · Pro / Enterprise" />
        </div>
        <div className="flex flex-col items-center" style={{ animation: anim(0.26), opacity: show ? undefined : 0 }}>
          <PhoneMock />
          <DeviceLabel tag="B2C · Privat-utleier-app" plan="For private utleiere · Gratis / Essential" />
        </div>
      </div>
    </div>
  );
}
