import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SecureAccessBanner } from '../components/SecureAccessBanner';
import OwnerTasks from './OwnerTasks';
import OwnerOnboardingChecklist from './OwnerOnboardingChecklist';
import {
  TrendingUp, ArrowRight, ChevronRight, ArrowUpRight,
  MapPin, MessageSquare, Building2, UserPlus,
  ClipboardList, ImagePlus, Wallet, Briefcase,
  DollarSign, Wrench, Sparkles, CheckCircle2, Megaphone, FileSignature, ClipboardCheck, ShieldCheck,
} from 'lucide-react';

/* ═══ DigiHome brand fonts (loaded via @font-face i /public/index.html) ═══ */
const heading = { fontFamily: "'PP Right Grotesk', 'Plus Jakarta Sans', sans-serif" };
const body = { fontFamily: "'ABC Diatype', 'Work Sans', sans-serif" };

/* Signatur ink→lavendel-hero brukt gjennom hele kommandosentralen */
const INK_HERO = 'linear-gradient(150deg,#2E2547 0%,#1A1612 58%,#171310 100%)';

const nok = (n: number) => (n || 0).toLocaleString('nb-NO').replace(/\s/g, '\u202F');
const initials = (name: string) => (name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

/* ═══ count-up (kubisk ease-out) ═══ */
function useCountUp(target: number, dur = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / dur, 1);
      setV(Math.round((target || 0) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

/* ═══ Belegg-ring (lys) ═══ */
function OccupancyRing({ pct, size = 52, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = pct >= 90 ? '#6D4FB0' : pct > 0 ? '#b45309' : '#D1D5DB';
  const [off, setOff] = useState(c);
  useEffect(() => { const t = setTimeout(() => setOff(c - (pct / 100) * c), 80); return () => clearTimeout(t); }, [pct, c]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece6da" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[14px] font-bold tabular-nums" style={{ ...heading, color: '#111827' }}>{pct}%</span>
      </div>
    </div>
  );
}

/* ═══ Belegg-ring (på mørk hero — lavendel) ═══ */
function HeroRing({ pct, size = 96, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [off, setOff] = useState(c);
  useEffect(() => { const t = setTimeout(() => setOff(c - (pct / 100) * c), 120); return () => clearTimeout(t); }, [pct, c]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid="kpi-occupancy">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#CBA6F7" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[23px] font-bold text-white tabular-nums leading-none" style={heading}>{pct}%</span>
        <span className="text-[9px] uppercase tracking-[0.16em] text-white/45 font-bold mt-1">belegg</span>
      </div>
    </div>
  );
}

/* ═══ Reveal wrapper (fade-up med stagger) ═══ */
function Reveal({ children, delay = 0, className = '' }: any) {
  return (
    <div className={className} style={{ animation: `dhFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ═══ Status-chip for eiendom ═══ */
function statusChip(pct: number) {
  if (pct >= 90) return { l: 'Fullt utleid', c: '#6D4FB0', bg: '#F1EAFB' };
  if (pct > 0) return { l: 'Delvis utleid', c: '#b45309', bg: '#fffbeb' };
  return { l: 'Ledig', c: '#6B7280', bg: '#F3F4F6' };
}

/* ═══ BUILDING CARD ═══ */
function BuildingCard({ property }: any) {
  const cover = (property.photos || [])[0];
  const occ = property.occupied_count || 0;
  const total = property.rentable_count || 0;
  const occPct = total > 0 ? Math.round(occ / total * 100) : 0;
  const chip = statusChip(occPct);

  return (
    <Link to="/portal/eier/objekter" data-testid={`property-card-${property.id}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-[#E5E7EB] hover:border-[#111827]/15 hover:shadow-[0_8px_30px_rgba(26,22,18,0.08)] hover:-translate-y-[2px] transition-all duration-300">
      {/* Cover */}
      <div className="relative h-[168px] overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#f2ede5 0%,#f6f2ec 45%,#F1EAFB 100%)' }}>
            <Building2 className="w-9 h-9" style={{ color: '#9CA3AF' }} strokeWidth={1.4} />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/70 backdrop-blur-sm" style={{ color: '#6B7280' }}>
              <ImagePlus className="w-3 h-3" strokeWidth={1.8} /> Legg til bilde
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" style={{ opacity: cover ? 1 : 0 }} />
        <div className="absolute top-3 left-3">
          <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md" style={{ color: chip.c, background: `${chip.bg}e6` }} data-testid={`property-status-${property.id}`}>{chip.l}</span>
        </div>
        {cover && (
          <div className="absolute bottom-3 left-4 right-4">
            <div className="flex items-center gap-1.5 mb-0.5"><MapPin className="w-3 h-3 text-white/60" strokeWidth={1.6} /><span className="text-[11px] text-white/70">{property.city || 'Bergen'}</span></div>
            <h3 className="text-[17px] font-bold text-white tracking-[-0.01em] truncate" style={heading}>{property.name || property.address?.split(',')[0]}</h3>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {!cover && <h3 className="text-[15px] font-bold text-[#111827] tracking-[-0.01em] truncate mb-0.5" style={heading}>{property.name || property.address?.split(',')[0]}</h3>}
          <p className="text-[13px] text-[#6B7280] truncate" style={body}>{property.address}</p>
          <div className="flex items-center gap-2 mt-2">
            <OccupancyRing pct={occPct} size={34} stroke={4} />
            <div className="leading-tight">
              <p className="text-[12.5px] font-semibold text-[#111827]">{occ} av {total} {total === 1 ? 'enhet' : 'enheter'}</p>
              <p className="text-[11px] text-[#9CA3AF]">utleid</p>
            </div>
          </div>
        </div>
        {property.monthly_rent > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[21px] font-bold text-[#111827] tabular-nums tracking-[-0.02em]" style={heading}>{nok(property.monthly_rent)}</p>
            <p className="text-[11px] text-[#6B7280]">kr/mnd</p>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ═══ Hurtighandlinger — slank pill-stripe (State B) ═══ */
function QuickActions({ items }: any) {
  const list = items || [
    { to: '/portal/eier/lag-annonse', label: 'Lag annonse', icon: Megaphone, id: 'create-ad' },
    { to: '/portal/kontrakter/ny', label: 'Opprett leiekontrakt', icon: FileSignature, id: 'create-lease' },
    { to: '/portal/eier/meldinger', label: 'Send melding', icon: MessageSquare, id: 'message' },
    { to: '/portal/depositum', label: 'Aktiver depositum', icon: Wallet, id: 'deposit' },
    { to: '/portal/innboarding/forvalter', label: 'Inviter forvalter', icon: Briefcase, id: 'invite-manager' },
  ];
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="owner-quick-actions">
      {list.map((a: any) => (
        <Link key={a.id} to={a.to} data-testid={`quick-action-${a.id}`}
          className="group shrink-0 inline-flex items-center gap-2.5 h-12 pl-2.5 pr-5 rounded-full bg-white border border-[#E5E7EB] hover:border-[#6D4FB0]/30 hover:shadow-[0_8px_24px_rgba(109,79,176,0.10)] hover:-translate-y-[1px] transition-all">
          <span className="w-8 h-8 rounded-full bg-[#F1EAFB] flex items-center justify-center group-hover:bg-[#6D4FB0] transition-colors">
            <a.icon className="w-4 h-4 text-[#6D4FB0] group-hover:text-white transition-colors" strokeWidth={1.7} />
          </span>
          <span className="text-[13.5px] font-semibold text-[#111827] whitespace-nowrap">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

/* ═══ INNTEKT-FLIS — delt av portefølje- og enkelt-hero ═══ */
function IncomeTile({ monthly, annual }: any) {
  const val = useCountUp(monthly);
  return (
    <div className="rounded-[24px] p-7 sm:p-9 relative overflow-hidden" style={{ background: INK_HERO }}>
      <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC33,transparent 70%)' }} />
      <div className="absolute -left-12 bottom-0 w-52 h-52 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC14,transparent 70%)' }} />
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#CF97FC55,transparent)' }} />
      <div className="relative">
        <p className="text-[10px] text-white/50 uppercase tracking-[0.16em] font-bold mb-3" style={body}>Månedlig leieinntekt</p>
        <p className="text-[48px] sm:text-[64px] font-bold text-white tabular-nums tracking-[-0.04em] leading-[0.88]" style={heading} data-testid="kpi-monthly-income">
          {nok(val)} <span className="text-[22px] sm:text-[26px] font-normal text-white/45">kr</span>
        </p>
        <div className="flex items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-white/70 bg-white/[0.07] rounded-full pl-2 pr-3 py-1">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#CBA6F7' }} strokeWidth={2} />
            {nok(annual)} kr estimert i år
          </span>
        </div>
        <Link to="/portal/eier/okonomi" data-testid="live-hero-economy-cta"
          className="inline-flex items-center gap-2 mt-7 h-11 px-5 rounded-full bg-white text-[#111827] text-[13.5px] font-semibold hover:bg-white/90 active:scale-[0.98] transition-all">
          Se full økonomi <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

/* ═══ LIVE-HERO (portefølje) — inntekt + belegg-ring ═══ */
function LiveHero({ monthly, annual, occPct, occupied, total, activeLeases, openCases }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-5" data-testid="owner-live-hero">
      <IncomeTile monthly={monthly} annual={annual} />
      <div className="rounded-[24px] p-7 relative overflow-hidden flex flex-col items-center justify-center text-center" style={{ background: INK_HERO }}>
        <div className="absolute -right-8 -top-10 w-44 h-44 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC33,transparent 70%)' }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#CF97FC55,transparent)' }} />
        <div className="relative flex flex-col items-center">
          <HeroRing pct={occPct} size={116} stroke={9} />
          <div className="flex items-stretch gap-5 mt-6">
            <div className="text-center px-1">
              <p className="text-[22px] font-bold text-white tabular-nums leading-none" style={heading}>{occupied}<span className="text-white/40">/{total}</span></p>
              <p className="text-[10.5px] text-white/45 mt-1.5">utleid</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center px-1">
              <p className="text-[22px] font-bold text-white tabular-nums leading-none" style={heading}>{activeLeases}</p>
              <p className="text-[10.5px] text-white/45 mt-1.5">kontrakter</p>
            </div>
            {openCases > 0 && (
              <>
                <div className="w-px bg-white/10" />
                <div className="text-center px-1">
                  <p className="text-[22px] font-bold text-[#FCA5A5] tabular-nums leading-none" style={heading}>{openCases}</p>
                  <p className="text-[10.5px] text-white/45 mt-1.5">saker</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ SINGLE-HERO (én utleie) — inntekt + leietaker/kontrakt ═══ */
function SingleHero({ monthly, annual, lease }: any) {
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }) : null;
  const tenantName = lease?.tenant_name || 'Leietaker';
  const since = fmt(lease?.start_date);
  const until = fmt(lease?.end_date);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5" data-testid="owner-single-hero">
      <IncomeTile monthly={monthly} annual={annual} />
      <div className="rounded-[24px] p-7 sm:p-8 relative overflow-hidden flex flex-col" style={{ background: INK_HERO }} data-testid="single-tenant-tile">
        <div className="absolute -right-8 -top-10 w-44 h-44 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC33,transparent 70%)' }} />
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#CF97FC55,transparent)' }} />
        <div className="relative flex flex-col h-full">
          <p className="text-[10px] text-white/50 uppercase tracking-[0.16em] font-bold mb-4" style={body}>Din leietaker</p>
          {lease ? (
            <>
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#CF97FC]/[0.18] flex items-center justify-center shrink-0">
                  <span className="text-[15px] font-bold text-[#E7D6FF]" style={heading}>{initials(tenantName)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[18px] font-bold text-white truncate" style={heading}>{tenantName}</p>
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#CBA6F7] mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Aktiv leieavtale</span>
                </div>
              </div>
              <div className="flex gap-6 mt-5 pt-5 border-t border-white/10">
                <div>
                  <p className="text-[9.5px] text-white/40 uppercase tracking-[0.1em] font-bold">Utleid siden</p>
                  <p className="text-[13.5px] font-semibold text-white mt-1 capitalize">{since || '—'}</p>
                </div>
                <div>
                  <p className="text-[9.5px] text-white/40 uppercase tracking-[0.1em] font-bold">Leieperiode</p>
                  <p className="text-[13.5px] font-semibold text-white mt-1 capitalize">{until || 'Løpende'}</p>
                </div>
              </div>
              <div className="flex gap-2.5 mt-auto pt-6">
                <Link to="/portal/eier/meldinger" data-testid="single-message-tenant" className="flex-1 h-10 rounded-full bg-white text-[#111827] text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-white/90 transition-all"><MessageSquare className="w-4 h-4" strokeWidth={1.8} /> Send melding</Link>
                <Link to="/portal/eier/dokumenter" data-testid="single-view-contract" className="flex-1 h-10 rounded-full bg-white/[0.08] ring-1 ring-white/15 text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-white/[0.14] transition-all"><FileSignature className="w-4 h-4" strokeWidth={1.8} /> Se kontrakt</Link>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-white/[0.08] flex items-center justify-center mb-3"><UserPlus className="w-6 h-6 text-[#CBA6F7]" strokeWidth={1.6} /></div>
              <p className="text-[15px] font-semibold text-white">Ingen aktiv leieavtale</p>
              <Link to="/portal/kontrakter/ny" className="text-[12.5px] text-[#CBA6F7] font-semibold mt-1 hover:underline">Opprett leiekontrakt →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ SINGLE PROPERTY CARD — én bolig, bred horisontal ═══ */
function SinglePropertyCard({ property }: any) {
  const cover = (property.photos || [])[0];
  const occ = property.occupied_count || 0;
  const total = property.rentable_count || 0;
  const occPct = total > 0 ? Math.round(occ / total * 100) : 0;
  const chip = statusChip(occPct);
  return (
    <Link to="/portal/eier/objekter" data-testid={`property-card-${property.id}`}
      className="group flex flex-col sm:flex-row rounded-[20px] overflow-hidden bg-white border border-[#E5E7EB] hover:border-[#6D4FB0]/25 hover:shadow-[0_16px_44px_rgba(109,79,176,0.10)] transition-all duration-300">
      <div className="relative sm:w-[280px] h-[180px] sm:h-auto shrink-0 overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
        ) : (
          <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#f2ede5 0%,#f6f2ec 45%,#F1EAFB 100%)' }}>
            <Building2 className="w-9 h-9" style={{ color: '#9CA3AF' }} strokeWidth={1.4} />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/70" style={{ color: '#6B7280' }}><ImagePlus className="w-3 h-3" strokeWidth={1.8} /> Legg til bilde</span>
          </div>
        )}
        <div className="absolute top-3 left-3"><span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md" style={{ color: chip.c, background: `${chip.bg}e6` }}>{chip.l}</span></div>
      </div>
      <div className="flex-1 p-6 sm:p-7 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.6} /><span className="text-[12px] text-[#6B7280]">{property.city || 'Norge'}</span></div>
        <h3 className="text-[22px] font-bold text-[#111827] tracking-[-0.02em]" style={heading}>{property.name || property.address?.split(',')[0]}</h3>
        <p className="text-[13.5px] text-[#6B7280] mt-0.5">{property.address}</p>
        <div className="flex items-center gap-6 mt-5">
          <div className="flex items-center gap-2.5">
            <OccupancyRing pct={occPct} size={40} stroke={4} />
            <div><p className="text-[13px] font-semibold text-[#111827]">{occ} av {total} {total === 1 ? 'enhet' : 'enheter'}</p><p className="text-[11px] text-[#9CA3AF]">utleid</p></div>
          </div>
          {property.monthly_rent > 0 && (
            <div className="pl-6 border-l border-[#F3F4F6]"><p className="text-[22px] font-bold text-[#111827] tabular-nums tracking-[-0.02em]" style={heading}>{nok(property.monthly_rent)}</p><p className="text-[11px] text-[#6B7280]">kr/mnd</p></div>
          )}
          <div className="ml-auto self-center hidden sm:flex items-center gap-1.5 text-[13px] font-semibold text-[#6D4FB0] group-hover:gap-2.5 transition-all">Se detaljer <ArrowRight className="w-4 h-4" strokeWidth={2} /></div>
        </div>
      </div>
    </Link>
  );
}

/* ═══ INNTEKT PER ENHET — ekte data fra /api/portal/owner/economy ═══ */
function IncomePerUnit({ api }: any) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [month, setMonth] = useState('');
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    api('get', '/api/portal/owner/economy')
      .then((r: any) => { setRows(r.data?.data || []); setMonth(r.data?.month || ''); })
      .catch(() => setRows([]));
  }, [api]);
  useEffect(() => { if (rows) { const t = setTimeout(() => setGrown(true), 150); return () => clearTimeout(t); } }, [rows]);

  const monthLabel = month ? new Date(month + '-01').toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }) : '';
  const active = (rows || []).filter((u: any) => (u.gross || 0) > 0).sort((a: any, b: any) => b.gross - a.gross).slice(0, 6);
  const max = active.reduce((m: number, u: any) => Math.max(m, u.gross || 0), 0) || 1;

  return (
    <div className="rounded-2xl bg-white border border-[#E5E7EB] p-6 sm:p-8" data-testid="income-per-unit">
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-[-0.025em]" style={heading}>Inntekt per enhet</h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5 capitalize">Brutto leie{monthLabel ? ` · ${monthLabel}` : ''}</p>
        </div>
        <Link to="/portal/eier/okonomi" className="text-[12px] font-semibold text-[#6D4FB0] hover:underline inline-flex items-center gap-1 shrink-0 mt-1">Se økonomi <ArrowUpRight className="w-3.5 h-3.5" /></Link>
      </div>
      {rows === null ? (
        <div className="space-y-5">{[0, 1, 2].map((i) => <div key={i} className="space-y-2"><div className="h-3 w-40 rounded bg-[#F3F4F6] animate-pulse" /><div className="h-2.5 rounded-full bg-[#F3F4F6] animate-pulse" /></div>)}</div>
      ) : active.length > 0 ? (
        <div className="space-y-5">
          {active.map((u: any, i: number) => (
            <div key={u.unit_id} data-testid={`income-unit-${i}`}>
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="text-[14px] font-semibold text-[#111827] truncate">{u.unit_title || 'Enhet'}</span>
                <span className="text-[15px] font-bold text-[#111827] tabular-nums shrink-0" style={heading}>{nok(u.gross)} kr</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#F1EAFB] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: grown ? `${Math.max(6, Math.round((u.gross / max) * 100))}%` : '0%', background: 'linear-gradient(90deg,#7C5CC4,#CF97FC)', transition: `width 1s cubic-bezier(0.16,1,0.3,1) ${i * 90}ms` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-[#9CA3AF]">
                <span>Netto {nok(u.net)} kr</span>
                <span>{u.fee_pct}% forvaltning</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-8" data-testid="income-per-unit-empty">
          <div className="w-12 h-12 rounded-2xl bg-[#F1EAFB] flex items-center justify-center mb-3"><DollarSign className="w-6 h-6 text-[#6D4FB0]" strokeWidth={1.6} /></div>
          <p className="text-[15px] font-semibold text-[#111827]">Ingen inntekt registrert ennå</p>
          <p className="text-[13px] text-[#6B7280] mt-1">Inntekt per enhet vises her når leien er aktiv.</p>
        </div>
      )}
    </div>
  );
}

/* ═══ START-HERO — ikke utleid ennå (kom i gang) ═══ */
function StartHero({ hasProperties }: any) {
  return (
    <div className="rounded-[24px] p-7 sm:p-10 relative overflow-hidden" style={{ background: INK_HERO }} data-testid="owner-start-hero">
      <div className="absolute -right-10 -top-16 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC38,transparent 70%)' }} />
      <div className="absolute -left-16 -bottom-10 w-60 h-60 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC1a,transparent 70%)' }} />
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#CF97FC55,transparent)' }} />
      <div className="relative max-w-[600px]">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#E7D6FF] bg-white/[0.07] ring-1 ring-white/10 rounded-full px-3 py-1.5 mb-5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#CBA6F7' }} strokeWidth={2} /> Din utleie starter her
        </span>
        <h2 className="text-white text-[28px] sm:text-[36px] font-bold tracking-[-0.035em] leading-[1.02]" style={heading}>
          {hasProperties ? 'La oss få boligen din utleid' : 'Velkommen til DigiHome'}
        </h2>
        <p className="text-white/60 text-[14.5px] leading-[1.6] mt-3.5 max-w-[520px]">
          {hasProperties
            ? 'Publiser en proff annonse på FINN og DigiHome, eller opprett leiekontrakt direkte hvis du allerede har en leietaker. Vi tar deg trygt gjennom hele veien.'
            : 'Boligene dine dukker opp her så snart de er registrert. Ta kontakt med forvalteren din for å komme i gang med utleien.'}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-7">
          {hasProperties ? (
            <>
              <Link to="/portal/eier/lag-annonse" data-testid="start-hero-primary"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-[#111827] text-[14px] font-semibold hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(207,151,252,0.18)]">
                <Megaphone className="w-[18px] h-[18px]" strokeWidth={1.8} /> Lag annonse
              </Link>
              <Link to="/portal/kontrakter/ny" data-testid="start-hero-secondary"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white/[0.06] ring-1 ring-white/15 text-white text-[14px] font-semibold hover:bg-white/[0.12] active:scale-[0.98] transition-all">
                <FileSignature className="w-[18px] h-[18px]" strokeWidth={1.8} /> Opprett leiekontrakt
              </Link>
            </>
          ) : (
            <>
              <Link to="/portal/eier/meldinger" data-testid="start-hero-primary"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-[#111827] text-[14px] font-semibold hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(207,151,252,0.18)]">
                <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.8} /> Kontakt forvalter
              </Link>
              <Link to="/portal/eier/objekter" data-testid="start-hero-secondary"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white/[0.06] ring-1 ring-white/15 text-white text-[14px] font-semibold hover:bg-white/[0.12] active:scale-[0.98] transition-all">
                <Building2 className="w-[18px] h-[18px]" strokeWidth={1.8} /> Se boligene mine
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ START-CHOICE HERO — 3 likestilte veier inn (State A) ═══ */
function StartChoiceHero({ hasUnits }: any) {
  // Eier uten bolig: «Lag annonse» går til wizarden (som legger til enheten via ?from=portal),
  // mens kontrakt/registrer krever en enhet først → lettvekts «Legg til bolig»-gate.
  const gate = (next: string) => `/portal/eier/legg-til-bolig?next=${next}`;
  const paths = [
    { id: 'create-ad', icon: Megaphone, title: 'Finn en leietaker', desc: 'Publiser en proff annonse på FINN og DigiHome.', to: '/portal/eier/lag-annonse' },
    { id: 'create-lease', icon: FileSignature, title: 'Jeg har leietaker', desc: 'Lag og signer leiekontrakt med BankID.', to: hasUnits ? '/portal/kontrakter/ny' : gate('create-lease') },
    { id: 'register-lease', icon: ClipboardCheck, title: 'Leietaker bor her alt', desc: 'Registrer det løpende leieforholdet.', to: hasUnits ? '/portal/leieforhold/registrer-eksisterende' : gate('register-lease') },
  ];
  return (
    <div className="rounded-[24px] p-7 sm:p-10 relative overflow-hidden" style={{ background: INK_HERO }} data-testid="owner-start-choice">
      <div className="absolute -right-10 -top-16 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC38,transparent 70%)' }} />
      <div className="absolute -left-16 -bottom-10 w-60 h-60 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#CF97FC1a,transparent 70%)' }} />
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#CF97FC55,transparent)' }} />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#E7D6FF] bg-white/[0.07] ring-1 ring-white/10 rounded-full px-3 py-1.5 mb-5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#CBA6F7' }} strokeWidth={2} /> Din utleie starter her
        </span>
        <h2 className="text-white text-[28px] sm:text-[36px] font-bold tracking-[-0.035em] leading-[1.02]" style={heading}>La oss få boligen din utleid</h2>
        <p className="text-white/60 text-[14.5px] leading-[1.6] mt-3.5 max-w-[540px]" style={body}>
          Velg der du er i prosessen akkurat nå, så tar vi deg trygt videre — steg for steg.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8">
          {paths.map((p) => (
            <Link key={p.id} to={p.to} data-testid={`start-path-${p.id}`}
              className="group relative rounded-2xl p-6 bg-white/[0.055] ring-1 ring-white/[0.12] hover:bg-white/[0.1] hover:ring-[#CF97FC]/40 hover:-translate-y-[3px] transition-all duration-300 overflow-hidden">
              <div className="absolute -right-8 -top-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle,#CF97FC30,transparent 70%)' }} />
              <div className="relative flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.06]"
                  style={{ background: 'linear-gradient(150deg,#9C6BE6 0%,#6D4FB0 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 24px rgba(109,79,176,0.4)' }}>
                  <p.icon className="w-[22px] h-[22px] text-white" strokeWidth={1.9} />
                </div>
                <ArrowUpRight className="w-[18px] h-[18px] text-white/30 group-hover:text-[#CBA6F7] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" strokeWidth={2} />
              </div>
              <p className="relative text-[16px] font-bold text-white tracking-[-0.01em]" style={heading}>{p.title}</p>
              <p className="relative text-[12.5px] text-white/55 mt-1.5 leading-[1.55]">{p.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ TRYGGHET-STRIPE — premium verdi-tiles (State A) ═══ */
function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: 'Signering med BankID', desc: 'Juridisk trygg leiekontrakt, signert digitalt av alle parter.' },
    { icon: Wallet, title: 'Depositumskonto', desc: 'Opprett en trygg, separat depositumskonto på få minutter.' },
    { icon: Sparkles, title: 'Alt på ett sted', desc: 'Husleie, dokumenter og oppfølging — samlet og automatisk.' },
  ];
  return (
    <div data-testid="owner-trust-strip">
      <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-[-0.025em] mb-5" style={heading}>Trygg utleie, hele veien</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} data-testid={`trust-tile-${i}`}
              className="rounded-[20px] bg-white border border-[#E5E7EB] p-6 sm:p-7 hover:shadow-[0_10px_30px_rgba(26,22,18,0.06)] transition-shadow duration-300">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(150deg,#F5EEFC 0%,#E9DBFB 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 6px 18px rgba(109,79,176,0.14)' }}>
                <Icon className="w-[22px] h-[22px] text-[#6D4FB0]" strokeWidth={1.7} />
              </div>
              <p className="text-[16px] font-bold text-[#111827] tracking-[-0.01em]" style={heading}>{it.title}</p>
              <p className="mt-1.5 text-[13px] text-[#6B7280] leading-[1.55]">{it.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ Attention feed item ═══ */
function AttentionRow({ icon: Icon, tone, eyebrow, title, sub, to, children, testid }: any) {
  const toneMap: any = {
    warning: { bg: '#fffbeb', ic: '#b45309', icbg: '#f59e0b1a', bd: '#f59e0b33' },
    danger: { bg: '#fef2f2', ic: '#b91c1c', icbg: '#b91c1c14', bd: '#b91c1c26' },
    ink: { bg: '#ffffff', ic: '#6D4FB0', icbg: '#6D4FB014', bd: '#E5E7EB' },
  };
  const c = toneMap[tone] || toneMap.ink;
  const inner = (
    <div className="flex items-center gap-4 p-5">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.icbg }}>
        <Icon className="w-5 h-5" style={{ color: c.ic }} strokeWidth={1.7} />
      </div>
      <div className="flex-1 min-w-0">
        {eyebrow && <p className="text-[10px] tracking-[0.14em] uppercase font-bold mb-0.5" style={{ color: c.ic, ...body }}>{eyebrow}</p>}
        <p className="text-[15px] font-semibold text-[#111827] truncate">{title}</p>
        {sub && <p className="text-[12px] text-[#6B7280] mt-0.5 truncate">{sub}</p>}
      </div>
      {children ? children : <ChevronRight className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#111827] group-hover:translate-x-0.5 transition-all shrink-0" strokeWidth={1.8} />}
    </div>
  );
  const cls = "block rounded-2xl border transition-all group";
  const style = { background: c.bg, borderColor: c.bd };
  return to
    ? <Link to={to} data-testid={testid} className={`${cls} hover:shadow-[0_6px_24px_rgba(26,22,18,0.07)]`} style={style}>{inner}</Link>
    : <div data-testid={testid} className={cls} style={style}>{inner}</div>;
}

/* ═══ MAIN ═══ */
export default function OwnerDashboard() {
  const { api, user, refreshUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ownerApprovals, setOwnerApprovals] = useState<any[]>([]);
  const [pendingContributions, setPendingContributions] = useState<any[]>([]);

  useEffect(() => {
    api('get', '/api/portal/owner/dashboard').then((r: any) => { setData(r.data.data); setLoading(false); }).catch(() => setLoading(false));
    api('get', '/api/portal/owner/vendor-approvals').then((r: any) => setOwnerApprovals(r.data.data || [])).catch(() => {});
    api('get', '/api/owner-contributions/pending').then((r: any) => setPendingContributions(r.data?.data || [])).catch(() => {});
  }, [api]);

  const handleOwnerApproval = async (assignmentId: any, approved: any) => {
    try {
      await api('post', `/api/vendor-assignments/${assignmentId}/owner-approve`, { approved });
      setOwnerApprovals((prev: any) => prev.filter((a: any) => a.id !== assignmentId));
    } catch { /* noop */ }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F7F5F1]"><div className="max-w-[1520px] mx-auto px-4 sm:px-8 lg:px-12 py-10">
      <div className="h-10 w-56 rounded-xl bg-[#F3F4F6] animate-pulse mb-8" />
      <div className="h-40 rounded-[24px] bg-[#F3F4F6] animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">{[0, 1, 2].map(i => <div key={i} className="h-32 rounded-2xl bg-[#F3F4F6] animate-pulse" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[0, 1].map(i => <div key={i} className="h-64 rounded-2xl bg-[#F3F4F6] animate-pulse" />)}</div>
    </div></div>
  );
  if (!data) return (
    <div className="min-h-screen bg-[#F7F5F1] flex items-center justify-center p-6">
      <div className="rounded-2xl bg-[#fef2f2] border border-[#b91c1c26] p-8 text-center max-w-sm" data-testid="owner-dashboard-error">
        <p className="text-[15px] font-semibold text-[#b91c1c] mb-1">Kunne ikke laste oversikten</p>
        <p className="text-[13px] text-[#6B7280] mb-5">Sjekk tilkoblingen og prøv igjen.</p>
        <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-full bg-[#111827] text-white text-[13px] font-semibold">Prøv igjen</button>
      </div>
    </div>
  );

  const { kpis, properties, recent_leases, recent_cases, owner } = data;
  const isSelfService = !!(data as any).is_self_service;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'God morgen' : hour < 17 ? 'God ettermiddag' : 'God kveld';
  const firstName = owner?.name?.split(' ')[0] || 'Huseier';

  const totalUnits = kpis.total_rentable || properties.reduce((s: number, p: any) => s + (p.rentable_count || 0), 0);
  const occupiedUnits = properties.reduce((s: number, p: any) => s + (p.occupied_count || 0), 0);
  const occPct = totalUnits > 0 ? Math.round(occupiedUnits / totalUnits * 100) : 0;
  const openCases = (recent_cases || []).filter((c: any) => ['open', 'in_progress', 'triaged'].includes(c.status));

  const hasProperties = properties.length > 0;
  const isLive = (kpis.active_leases || 0) > 0 || occupiedUnits > 0;
  // De fleste selvbetjeningseiere har ÉN utleieenhet → egen personlig visning.
  const isSingle = totalUnits <= 1 && properties.length <= 1;
  const singleProp = properties[0];
  const singleLease = (recent_leases || []).find((l: any) => l.status === 'active') || (recent_leases || [])[0];

  // Kontekstuell oppsummeringslinje
  let summary: string;
  if (isLive && isSingle) {
    const addr = singleProp?.address?.split(',')[0] || singleProp?.name || 'Boligen din';
    const bits: string[] = [`${addr} er utleid`];
    if (kpis.monthly_income > 0) bits.push(`${nok(kpis.monthly_income)} kr/mnd`);
    if (kpis.open_cases) bits.push(`${kpis.open_cases} ${kpis.open_cases === 1 ? 'sak venter' : 'saker venter'}`);
    summary = bits.join(' · ');
  } else if (isLive) {
    const bits: string[] = [];
    if (kpis.monthly_income > 0) bits.push(`Porteføljen din tjener ${nok(kpis.monthly_income)} kr/mnd`);
    bits.push(`${occupiedUnits} av ${totalUnits} ${totalUnits === 1 ? 'enhet' : 'enheter'} utleid`);
    if (kpis.open_cases) bits.push(`${kpis.open_cases} ${kpis.open_cases === 1 ? 'sak venter' : 'saker venter'}`);
    summary = bits.join(' · ');
  } else {
    summary = hasProperties
      ? `${properties.length} ${properties.length === 1 ? 'bolig' : 'boliger'} klar for utleie — la oss komme i gang`
      : 'Kom i gang med din første utleie';
  }

  const attentionCount = ownerApprovals.length + pendingContributions.length + (kpis.open_cases ? 1 : 0);

  const renderAttentionFeed = (showEmpty: boolean) => (
    <Reveal delay={150}>
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-5">
          <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-[-0.025em]" style={heading}>Trenger din oppmerksomhet</h2>
          {attentionCount > 0 && <span className="text-[11px] font-bold text-white bg-[#6D4FB0] rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center tabular-nums" data-testid="attention-count">{attentionCount}</span>}
        </div>
        <div className="space-y-3" data-testid="attention-feed">
          {ownerApprovals.map((a: any) => (
            <AttentionRow key={a.id} testid={`attention-approval-${a.id}`} icon={DollarSign} tone="warning" eyebrow="Godkjenning kreves"
              title={`${a.vendor_name} — ${nok(a.vendor_response?.price)} kr`} sub={a.case_title}>
              <div className="flex gap-2 shrink-0">
                <button onClick={(e) => { e.preventDefault(); handleOwnerApproval(a.id, false); }} data-testid={`approval-decline-${a.id}`} className="h-9 px-4 rounded-xl border border-[#e5e2dd] text-[13px] font-medium text-[#6B7280] hover:bg-white transition-colors">Avslå</button>
                <button onClick={(e) => { e.preventDefault(); handleOwnerApproval(a.id, true); }} data-testid={`approval-approve-${a.id}`} className="h-9 px-5 rounded-xl bg-[#111827] text-white text-[13px] font-semibold hover:bg-[#333] transition-colors">Godkjenn</button>
              </div>
            </AttentionRow>
          ))}
          {pendingContributions.map((c: any) => (
            <AttentionRow key={c.unit_id} testid={`attention-contribution-${c.unit_id}`} icon={ClipboardList} tone="ink"
              eyebrow={c.status === 'in_progress' ? 'Fortsett der du slapp' : 'Forvalter trenger din hjelp'}
              title={`Hjelp oss klargjøre ${c.unit_title || c.unit_address || 'boligen'}`}
              sub="Fasiliteter, highlights og husregler — ca. 10 min"
              to={c.property_id ? `/portal/eier/eiendommer/${c.property_id}/enheter/${c.unit_id}/bidra` : '/portal/eier/objekter'} />
          ))}
          {kpis.open_cases > 0 && (
            <AttentionRow testid="attention-cases" icon={Wrench} tone="danger" eyebrow="Vedlikehold"
              title={`${kpis.open_cases} ${kpis.open_cases === 1 ? 'sak' : 'saker'} venter på oppfølging`}
              sub={openCases.slice(0, 2).map((c: any) => c.title).join(' · ')} to="/portal/eier/saker" />
          )}
          {attentionCount === 0 && showEmpty && (
            <div className="rounded-2xl bg-white border border-[#E5E7EB] p-8 flex flex-col items-center text-center" data-testid="attention-empty">
              <div className="w-12 h-12 rounded-2xl bg-[#f0fdf4] flex items-center justify-center mb-3"><CheckCircle2 className="w-6 h-6 text-[#15803d]" strokeWidth={1.7} /></div>
              <p className="text-[15px] font-semibold text-[#111827] flex items-center gap-1.5">Alt er i skjønneste orden <Sparkles className="w-4 h-4 text-[#6D4FB0]" /></p>
              <p className="text-[13px] text-[#6B7280] mt-1">Ingenting krever handling akkurat nå.</p>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );

  const PropertiesSection = (
    <Reveal delay={200}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-[-0.025em]" style={heading}>{properties.length === 1 ? 'Min eiendom' : 'Mine eiendommer'}</h2>
        <Link to="/portal/eier/objekter" className="text-[12px] font-semibold text-[#6D4FB0] hover:underline inline-flex items-center gap-1">Se alle <ArrowUpRight className="w-3.5 h-3.5" /></Link>
      </div>
      {properties.length > 0 ? (
        <div className={`grid ${properties.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-5 mb-10`}>
          {properties.map((p: any) => <BuildingCard key={p.id} property={p} />)}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[#E5E7EB] p-10 flex flex-col items-center text-center mb-10" data-testid="properties-empty">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#f2ede5,#F1EAFB)' }}><Building2 className="w-7 h-7 text-[#9CA3AF]" strokeWidth={1.4} /></div>
          <p className="text-[16px] font-bold text-[#111827]" style={heading}>Ingen eiendommer ennå</p>
          <p className="text-[13px] text-[#6B7280] mt-1 mb-5">{isSelfService ? 'Legg til din første bolig for å komme i gang med utleien.' : 'Ta kontakt med forvalteren din for å komme i gang.'}</p>
          {isSelfService && (
            <Link to="/portal/eier/legg-til-bolig?next=add" data-testid="properties-empty-cta"
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-[#111827] text-white text-[13px] font-semibold hover:bg-[#2E2547] active:scale-[0.98] transition-all">
              Legg til bolig
            </Link>
          )}
        </div>
      )}
    </Reveal>
  );

  return (
    <div className="min-h-screen bg-[#F7F5F1]" style={body}>
      <style>{`@keyframes dhWave{0%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-8deg)}40%{transform:rotate(14deg)}50%{transform:rotate(-4deg)}60%{transform:rotate(10deg)}70%,100%{transform:rotate(0)}}@keyframes dhFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="max-w-[1520px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10">

        {/* Header + kontekstuell oppsummering */}
        <Reveal className="flex items-center gap-4 sm:gap-5 mb-3">
          <div className="w-16 h-16 rounded-full bg-[#111827] flex items-center justify-center shrink-0 shadow-sm ring-2 ring-[#E5E7EB] overflow-hidden">
            {owner?.avatar_url
              ? <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-[21px] font-bold text-white" style={heading}>{initials(owner?.name)}</span>}
          </div>
          <div>
            <p className="text-[14px] text-[#6B7280] mb-1">{greeting}</p>
            <h1 className="text-[42px] sm:text-[52px] font-bold text-[#111827] tracking-[-0.04em] leading-[0.9]" style={heading} data-testid="owner-greeting">
              {firstName} <span className="inline-block" style={{ animation: 'dhWave 2s ease-in-out 1' }}>&#128075;</span>
            </h1>
          </div>
        </Reveal>
        <Reveal delay={60}><p className="text-[16px] text-[#6B7280] mb-10 ml-[84px] -mt-1" data-testid="owner-summary">{summary}</p></Reveal>

        {user?.needs_password_setup && <SecureAccessBanner api={api} refreshUser={refreshUser} />}

        {isLive ? (
          isSingle ? (
            /* ═══════════════ TILSTAND B1 — ÉN UTLEIE (den vanlige eieren) ═══════════════ */
            <>
              <Reveal delay={90}>
                <div className="mb-5">
                  <SingleHero monthly={kpis.monthly_income} annual={kpis.annual_estimate} lease={singleLease} />
                </div>
              </Reveal>

              <Reveal delay={110}>
                <div className="mb-10">
                  <QuickActions items={[
                    { to: '/portal/eier/meldinger', label: 'Send melding', icon: MessageSquare, id: 'message' },
                    { to: '/portal/eier/dokumenter', label: 'Se kontrakt', icon: FileSignature, id: 'contract' },
                    { to: '/portal/depositum', label: 'Aktiver depositum', icon: Wallet, id: 'deposit' },
                    { to: '/portal/eier/saker', label: 'Meld en sak', icon: Wrench, id: 'case' },
                    { to: '/portal/eier/okonomi', label: 'Se økonomi', icon: DollarSign, id: 'economy' },
                  ]} />
                </div>
              </Reveal>

              {renderAttentionFeed(true)}

              {singleProp && (
                <Reveal delay={200}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-[-0.025em]" style={heading}>Din bolig</h2>
                    <Link to="/portal/eier/objekter" className="text-[12px] font-semibold text-[#6D4FB0] hover:underline inline-flex items-center gap-1">Se detaljer <ArrowUpRight className="w-3.5 h-3.5" /></Link>
                  </div>
                  <SinglePropertyCard property={singleProp} />
                </Reveal>
              )}
            </>
          ) : (
            /* ═══════════════ TILSTAND B2 — PORTEFØLJE (flere enheter) ═══════════════ */
            <>
              <Reveal delay={90}>
                <div className="mb-5">
                  <LiveHero monthly={kpis.monthly_income} annual={kpis.annual_estimate} occPct={occPct}
                    occupied={occupiedUnits} total={totalUnits} activeLeases={kpis.active_leases} openCases={kpis.open_cases} />
                </div>
              </Reveal>

              <Reveal delay={110}><div className="mb-10"><QuickActions /></div></Reveal>

              {renderAttentionFeed(true)}

              <Reveal delay={180}><div className="mb-10"><IncomePerUnit api={api} /></div></Reveal>

              {PropertiesSection}
            </>
          )
        ) : (
          /* ═══════════════ TILSTAND A — IKKE UTLEID ENNÅ ═══════════════ */
          <>
            <Reveal delay={90}><div className="mb-8">{(hasProperties || isSelfService) ? <StartChoiceHero hasUnits={totalUnits > 0} /> : <StartHero hasProperties={false} />}</div></Reveal>

            {/* Animert «kom i gang»-sjekkliste (selvforvalter) */}
            <Reveal delay={105}><OwnerOnboardingChecklist /></Reveal>

            <Reveal delay={120}><OwnerTasks /></Reveal>

            {attentionCount > 0 && renderAttentionFeed(false)}

            {hasProperties && (
              properties.length === 1 && singleProp ? (
                <Reveal delay={150}>
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-[22px] sm:text-[24px] font-bold text-[#111827] tracking-[-0.025em]" style={heading}>Din bolig</h2>
                      <Link to="/portal/eier/objekter" className="text-[12px] font-semibold text-[#6D4FB0] hover:underline inline-flex items-center gap-1">Se detaljer <ArrowUpRight className="w-3.5 h-3.5" /></Link>
                    </div>
                    <SinglePropertyCard property={singleProp} />
                  </div>
                </Reveal>
              ) : (
                PropertiesSection
              )
            )}

            <Reveal delay={180}><TrustStrip /></Reveal>
          </>
        )}
      </div>
    </div>
  );
}
