import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Building2, DollarSign, FileText, LogOut, MessageSquare, Wrench, Menu, X } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

const NAV_ITEMS = [
  { to: '/portal/eier', label: 'Oversikt', icon: LayoutDashboard, exact: true },
  { to: '/portal/eier/meldinger', label: 'Meldinger', icon: MessageSquare },
  { to: '/portal/eier/saker', label: 'Saker', icon: Wrench },
  { to: '/portal/eier/objekter', label: 'Mine eiendommer', icon: Building2, dynamicLabel: true },
  { to: '/portal/eier/okonomi', label: 'Økonomi', icon: DollarSign },
  { to: '/portal/eier/dokumenter', label: 'Dokumenter', icon: FileText },
];

export const getAvatar = (name: any, size = 80) =>
  `https://i.pravatar.cc/${size}?u=${encodeURIComponent((name || 'default') + '-dh')}`;

export const PROP_IMAGES = [
  '/prop-exterior1.webp', '/interior-openplan.webp', '/prop-exterior2.webp',
  '/interior-kitchen.webp', '/prop-exterior3.webp', '/interior-living.webp',
  '/prop-exterior4.webp', '/interior-bedroom.webp', '/bergen-houses.webp',
];

export default function OwnerLayout() {
  const { user, logout, api, impersonation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/logg-inn'); };
  const [unreadCount, setUnreadCount] = useState(0);
  const [unitCount, setUnitCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isImpersonated = user?.is_impersonated || !!impersonation;

  useEffect(() => {
    const fetchUnread = () => {
      api('get', '/api/portal/owner/conversations').then((r: any) => {
        const total = (r.data.data || []).reduce((s: any, c: any) => s + (c.unread_count || 0), 0);
        setUnreadCount(total);
      }).catch(() => {});
    };
    api('get', '/api/units').then((r: any) => setUnitCount((r.data.data || []).length)).catch(() => {});
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [api]);

  // Lukk mobilmenyen når man navigerer
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  // Lås body-scroll når mobilmeny er åpen
  useEffect(() => {
    if (mobileNavOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileNavOpen]);

  const nav = NAV_ITEMS.map((item: any) => item.dynamicLabel ? { ...item, label: unitCount <= 1 ? 'Min eiendom' : 'Mine eiendommer' } : item);

  const SidebarBody = (
    <>
      <div className="relative px-6 pt-6 pb-6 flex items-center justify-between">
        <div className="absolute -top-16 -left-8 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(207,151,252,0.18),transparent 70%)' }} />
        <div className="relative">
          <Link to="/"><img src="/logo-light.svg" alt="DigiHome" className="h-[18px] w-auto" /></Link>
          <p className="text-[10px] text-white/40 mt-2.5 font-semibold uppercase tracking-[0.12em]">Huseierportal</p>
        </div>
        <button onClick={() => setMobileNavOpen(false)} aria-label="Lukk meny"
          className="relative lg:hidden w-9 h-9 -mr-1.5 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
          data-testid="owner-mobile-nav-close">
          <X className="w-5 h-5" strokeWidth={1.8} />
        </button>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {nav.map((item: any) => {
          const Icon = item.icon;
          const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to}
              onClick={() => setMobileNavOpen(false)}
              data-testid={`owner-nav-${item.to.split('/').pop() || 'oversikt'}`}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all relative ${
                active ? 'bg-[#CF97FC]/[0.14] text-[#F4EFE7]' : 'text-[#A89F92] hover:text-[#F4EFE7] hover:bg-white/[0.05]'
              }`}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[#CF97FC]" />}
              <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#CF97FC]' : ''}`} strokeWidth={1.6} />
              {item.label}
              {item.label === 'Meldinger' && unreadCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#CF97FC] text-[#141009] text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="relative px-4 pb-5 pt-4 border-t border-[#2A2520] mt-auto">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition-all cursor-pointer mb-2">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#CF97FC]/30" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#CF97FC]/[0.16] flex items-center justify-center shrink-0">
              <span className="text-[12px] font-bold text-[#D9B4FF]">{(user?.name || '?').split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#F4EFE7] truncate">{user?.name}</p>
            <p className="text-[11px] text-[#A89F92] truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-3.5 py-2 w-full rounded-lg text-[12px] text-[#A89F92] hover:text-[#F4EFE7] hover:bg-white/[0.05] transition-all">
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> Logg ut
        </button>
      </div>
    </>
  );

  return (
    <div className={`min-h-screen bg-[#F7F5F1] lg:flex ${isImpersonated ? 'pt-10' : ''}`} style={{ fontFamily: "'ABC Diatype', 'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      {/* ─── Mobil toppbar ─── */}
      <header className={`lg:hidden sticky z-30 flex items-center gap-3 h-14 px-4 bg-[#F7F5F1]/90 backdrop-blur-xl border-b border-[#E5E7EB] ${isImpersonated ? 'top-10' : 'top-0'}`}
        data-testid="owner-mobile-topbar">
        <button onClick={() => setMobileNavOpen(true)} aria-label="Åpne meny"
          className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-[#111827] hover:bg-black/5 transition-colors relative"
          data-testid="owner-mobile-nav-open">
          <Menu className="w-[22px] h-[22px]" strokeWidth={1.8} />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6D4FB0]" />}
        </button>
        <Link to="/portal/eier" className="flex items-center gap-2 min-w-0">
          <img src="/logo-dark.svg" alt="DigiHome" className="h-[17px] w-auto" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] truncate">Huseier</span>
        </Link>
        <div className="flex-1" />
        <NotificationBell />
      </header>

      {/* ─── Mobil backdrop ─── */}
      {mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] animate-[fadeIn_0.2s_ease]"
          data-testid="owner-mobile-backdrop" />
      )}

      {/* ─── Sidebar (desktop fast + mobil skuff) ─── */}
      <aside style={{ background: 'linear-gradient(180deg,#15110D 0%,#0E0C0B 45%)' }} className={`w-[268px] sm:w-[280px] lg:w-[240px] bg-[#0E0C0B] border-r border-[#2A2520] flex flex-col shrink-0 fixed left-0 z-50 overflow-hidden transition-transform duration-300 ease-out
        ${isImpersonated ? 'top-10 bottom-0' : 'inset-y-0'}
        ${mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full pointer-events-none'} lg:translate-x-0 lg:shadow-none lg:z-40 lg:pointer-events-auto`}
        data-testid="owner-sidebar">
        {SidebarBody}
      </aside>

      {/* ─── Hovedinnhold ─── */}
      <main className="flex-1 min-w-0 lg:ml-[240px]">
        <div className="hidden lg:block" style={{ position: 'fixed', top: isImpersonated ? 56 : 16, right: 20, zIndex: 60 }}>
          <NotificationBell />
        </div>
        <Outlet />
      </main>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }` }} />
    </div>
  );
}
