'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader2, Lock, BarChart3, Users, CreditCard, FileText, LogOut,
  Menu, X, ChevronRight, ShieldCheck, Sparkles,
} from 'lucide-react';
import InnsiktDashboard from '@/components/admin/InnsiktDashboard';

const SESSION_KEY = 'dh_admin_session';
const LEGACY_KEY = 'dh_admin_key';

const NAV = [
  {
    group: 'Analyse',
    items: [
      { k: 'innsikt', l: 'Innsikt', icon: BarChart3, desc: 'Trafikk · Leads · Annonser · Ytelse' },
    ],
  },
  {
    group: 'Forretning',
    items: [
      { k: 'kunder', l: 'Kunder', icon: Users, soon: true, desc: 'Kundeinformasjon fra DigiHome-appen' },
      { k: 'abonnementer', l: 'Abonnementer', icon: CreditCard, soon: true, desc: 'Aktive avtaler & fakturering' },
    ],
  },
  {
    group: 'Innhold',
    items: [
      { k: 'artikler', l: 'Artikler', icon: FileText, href: '/admin/artikler' },
    ],
  },
];

const SECTION_TITLES = {
  innsikt: { t: 'Innsikt', s: 'Førsteparts analyse · cookieless · GDPR-trygt' },
  kunder: { t: 'Kunder', s: 'Kommer snart — hentes fra DigiHome-plattformen' },
  abonnementer: { t: 'Abonnementer', s: 'Kommer snart — aktive avtaler & fakturering' },
};

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [err, setErr] = useState('');
  const [section, setSection] = useState('innsikt');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Gjenopprett sesjon ved oppstart
  useEffect(() => {
    let t = '';
    try { t = localStorage.getItem(SESSION_KEY) || ''; } catch (e) {}
    if (!t) { setChecking(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/admin/auth/me?key=${encodeURIComponent(t)}`);
        if (res.ok) {
          const j = await res.json();
          setToken(t); setUser(j.user);
          try { localStorage.setItem(LEGACY_KEY, t); } catch (e) {}
        } else {
          try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
        }
      } catch (e) {}
      finally { setChecking(false); }
    })();
  }, []);

  const doLogin = async (e) => {
    if (e) e.preventDefault();
    setErr(''); setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Innlogging feilet'); setLoggingIn(false); return; }
      setToken(j.token); setUser(j.user);
      try { localStorage.setItem(SESSION_KEY, j.token); localStorage.setItem(LEGACY_KEY, j.token); } catch (e) {}
    } catch (e2) { setErr('Nettverksfeil — prøv igjen'); }
    finally { setLoggingIn(false); }
  };

  const logout = () => {
    try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
    setToken(''); setUser(null); setEmail(''); setPassword(''); setSection('innsikt');
  };

  // --- Laster sesjon ---
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f4]">
        <Loader2 className="w-6 h-6 animate-spin text-[#cf97fc]" />
      </div>
    );
  }

  // --- Innlogging ---
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-24 h-[520px] w-[520px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.20) 0%, rgba(207,151,252,0) 70%)' }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(207,151,252,0.12) 0%, rgba(207,151,252,0) 70%)' }} />
        <div className="relative w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <span className="h-2.5 w-2.5 rounded-full bg-[#cf97fc]" />
            <span className="text-white text-[20px] font-bold tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome</span>
            <span className="text-white/40 text-[12px] font-medium border border-white/15 rounded-full px-2 py-0.5">Admin</span>
          </div>
          <h1 className="text-white text-[26px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Logg inn</h1>
          <p className="text-white/45 text-[14px] mt-1.5">Tilgang til innsikt, leads og forretning.</p>

          <form onSubmit={doLogin} className="mt-7 space-y-3">
            <div>
              <label className="text-white/60 text-[12px] font-semibold uppercase tracking-[0.08em]">E-post</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="username" placeholder="navn@digihome.no"
                className="mt-1.5 w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/12 text-white placeholder:text-white/25 outline-none focus:border-[#cf97fc] focus:bg-white/[0.06] text-[15px] transition-colors"
                data-testid="admin-email-input"
              />
            </div>
            <div>
              <label className="text-white/60 text-[12px] font-semibold uppercase tracking-[0.08em]">Passord</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" placeholder="••••••••"
                className="mt-1.5 w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/12 text-white placeholder:text-white/25 outline-none focus:border-[#cf97fc] focus:bg-white/[0.06] text-[15px] transition-colors"
                data-testid="admin-password-input"
              />
            </div>
            {err && <p className="text-[13px] text-rose-400 flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> {err}</p>}
            <button
              type="submit" disabled={loggingIn}
              data-testid="admin-login-btn"
              className="w-full h-12 rounded-xl bg-white text-[#0a0a0a] font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Logg inn <ChevronRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-white/30 text-[12px] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Kryptert sesjon · noindex · kun for DigiHome-teamet</p>
        </div>
      </div>
    );
  }

  // --- Innlogget: sidebar-shell ---
  const initials = (user && user.name ? user.name : (user && user.email || 'A')).slice(0, 1).toUpperCase();
  const sectionMeta = SECTION_TITLES[section] || { t: section, s: '' };

  const NavList = () => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {NAV.map((grp) => (
        <div key={grp.group}>
          <p className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/30">{grp.group}</p>
          <div className="space-y-1">
            {grp.items.map((it) => {
              const Icon = it.icon;
              const active = section === it.k;
              const common = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all group';
              const content = (
                <>
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#cf97fc]' : 'text-white/50 group-hover:text-white/80'}`} />
                  <span className="flex-1 text-left">{it.l}</span>
                  {it.soon && <span className="text-[9.5px] font-semibold uppercase tracking-wide text-[#cf97fc] bg-[#cf97fc]/12 rounded-full px-1.5 py-0.5">Snart</span>}
                  {it.href && <ChevronRight className="w-3.5 h-3.5 text-white/25" />}
                </>
              );
              if (it.href) {
                return (
                  <a key={it.k} href={it.href} className={`${common} text-white/70 hover:bg-white/[0.06] hover:text-white`}>{content}</a>
                );
              }
              return (
                <button
                  key={it.k}
                  onClick={() => { setSection(it.k); setSidebarOpen(false); }}
                  className={`${common} ${active ? 'bg-white/[0.08] text-white' : 'text-white/70 hover:bg-white/[0.05] hover:text-white'}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const SidebarInner = () => (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-white/[0.07] shrink-0">
        <span className="h-2.5 w-2.5 rounded-full bg-[#cf97fc]" />
        <span className="text-white text-[17px] font-bold tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome</span>
        <span className="text-white/40 text-[11px] font-medium border border-white/15 rounded-full px-2 py-0.5">Admin</span>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <NavList />
      <div className="px-3 py-3 border-t border-white/[0.07] shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-full bg-[#cf97fc] text-[#0a0a0a] flex items-center justify-center text-[14px] font-bold shrink-0">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[13px] font-semibold truncate">{user && user.email}</p>
            <p className="text-white/35 text-[11px] capitalize">{(user && user.role) || 'admin'}</p>
          </div>
          <button onClick={logout} title="Logg ut" className="text-white/40 hover:text-rose-400 transition-colors p-1.5"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f6f4] flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 sticky top-0 h-screen">
        <SidebarInner />
      </aside>

      {/* Sidebar — mobil drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full"><SidebarInner /></div>
        </div>
      )}

      {/* Hovedinnhold */}
      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <div className="sticky top-0 z-30 bg-[#f7f6f4]/85 backdrop-blur-md border-b border-black/[0.05]">
          <div className="h-16 px-4 sm:px-8 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden h-9 w-9 rounded-lg bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-center text-[#444]"><Menu className="w-5 h-5" /></button>
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-bold text-[#0a0a0a] tracking-[-0.02em] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{sectionMeta.t}</h1>
              <p className="text-[12px] text-[#999] mt-1 truncate">{sectionMeta.s}</p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-6 max-w-[1280px]">
          {section === 'innsikt' && <InnsiktDashboard apiKey={token} />}
          {section === 'kunder' && <ComingSoon icon={Users} title="Kunder" body="Her samler vi all kundeinformasjon fra DigiHome-plattformen — kontrakter, eiendommer, kontaktlogg og status. Vi kobler dette på i neste fase." />}
          {section === 'abonnementer' && <ComingSoon icon={CreditCard} title="Abonnementer" body="Oversikt over aktive avtaler, fakturering og inntekt per kunde — hentet direkte fra app-prosjektet. Kommer i neste fase." />}
        </div>
      </main>
    </div>
  );
}

function ComingSoon({ icon: Icon, title, body }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-10 sm:p-14 text-center max-w-2xl mx-auto mt-6">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-5"><Icon className="w-8 h-8 text-[#cf97fc]" /></div>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#cf97fc] bg-[#cf97fc]/10 rounded-full px-3 py-1 mb-4"><Sparkles className="w-3 h-3" /> Kommer snart</div>
      <h2 className="text-[24px] font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h2>
      <p className="text-[15px] text-[#666] mt-3 leading-relaxed">{body}</p>
    </div>
  );
}
