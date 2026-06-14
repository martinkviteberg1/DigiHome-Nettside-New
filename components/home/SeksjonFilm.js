'use client';

/*
  Seksjon 2 — «Slik fungerer DigiHome» (lys autofilm).
  Full 100svh-seksjon under heroen. Spiller av seg selv når den er i view:
  5 scener (Annonse → Visninger → Leietaker → Kontrakt → Utbetaling) med myk
  crossfade, looper. Tekst venstre + levende produkt-mockup høyre.
  Helt i lyst tema (#FEFBFA, grafitt/lavendel/emerald) — matcher den lyse heroen.
  Bygget i React (ingen MP4) — rører ikke /video render-pipelinen.
*/

import { useEffect, useRef, useState } from 'react';
import {
  Check, MapPin, CalendarDays, Clock, ShieldCheck, BadgeCheck,
  PenLine, TrendingUp, Star, Banknote, Sparkles,
} from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack } from '@/components/video/filmUtils';

const LISTING_IMG = 'https://images.unsplash.com/photo-1633505899118-4ca6bd143043?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxub3JkaWMlMjBpbnRlcmlvcnxlbnwwfHx8d2hpdGV8MTc4MTQzNDg4OHww&ixlib=rb-4.1.0&q=85&w=900';

const DUR = 4.8;          // sekunder per scene
const CF = 0.15;          // andel av scenen som krysstoner til neste (~0.7s)

/* ---------- delte byggesteiner ---------- */
function Soft({ children, className = '', style }) {
  return (
    <div
      className={`relative rounded-[22px] bg-white border border-hairline ${className}`}
      style={{ boxShadow: '0 34px 80px rgba(26,23,38,0.14), 0 4px 14px rgba(26,23,38,0.05)', ...style }}
    >
      {children}
    </div>
  );
}

function CheckRow({ p, at, icon: Icon, label, value }) {
  const inP = easeOutCubic(seg(p, at, at + 0.12));
  const ok = easeOutBack(seg(p, at + 0.1, at + 0.24));
  if (inP <= 0.01) return null;
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ opacity: inP, transform: `translateX(${((1 - inP) * 10).toFixed(1)}px)` }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fill">
        <Icon className="h-4 w-4 text-ink/70" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-medium text-ink truncate">{label}</span>
        {value && <span className="block text-xs text-taupe truncate">{value}</span>}
      </span>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{
          background: '#E8F4EE', border: '1px solid rgba(24,121,78,0.4)',
          transform: `scale(${Math.max(0, Math.min(ok, 1.1)).toFixed(2)})`,
        }}
      >
        <Check className="h-3.5 w-3.5" style={{ color: '#18794E' }} strokeWidth={3} />
      </span>
    </div>
  );
}

/* ---------- SCENE 1 — ANNONSE ---------- */
function AnnonseMock({ p }) {
  const rise = easeOutCubic(seg(p, 0.02, 0.2));
  const pub = easeOutBack(seg(p, 0.42, 0.6));
  const finn = easeOutCubic(seg(p, 0.5, 0.66));
  const air = easeOutCubic(seg(p, 0.62, 0.78));
  return (
    <Soft className="overflow-hidden w-full" style={{ opacity: rise, transform: `translateY(${((1 - rise) * 24).toFixed(0)}px)` }}>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LISTING_IMG} alt="Leilighet i Bergen" className="w-full h-full object-cover" draggable="false" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,8,16,0.22), transparent 40%)' }} />
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-ink">Til leie</span>
        {pub > 0.02 && (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: 'rgba(24,121,78,0.92)', transform: `scale(${Math.max(0, Math.min(pub, 1.1)).toFixed(2)})` }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Publisert
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0" style={{ color: '#9B5BD6' }} />
          <span className="text-[15px] font-semibold text-ink">Møhlenprisbakken 14</span>
          <span className="text-[15px] text-taupe">· Bergen</span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-quiet">
          <span>3 rom</span><span>·</span><span>74 m²</span><span>·</span><span>Leilighet</span>
        </div>
        <div className="mt-3.5 flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-ink tracking-[-0.01em]">25 500 kr</span>
            <span className="text-sm text-taupe">/mnd</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-fill px-2.5 py-1 text-[11px] font-semibold text-ink/70">
            <TrendingUp className="h-3 w-3 text-lavender" /> Optimal pris
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-hairline flex items-center gap-2">
          {[['Finn.no', finn], ['Airbnb', air]].map(([name, v]) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: v > 0.5 ? '#E8F4EE' : '#F0EAE2',
                color: v > 0.5 ? '#18794E' : 'rgba(124,116,102,0.9)',
                opacity: (0.5 + 0.5 * v).toFixed(2),
              }}
            >
              {v > 0.5 ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-taupe/50" />}
              {name}
            </span>
          ))}
          <span className="ml-auto text-xs text-taupe">+ 4 kanaler</span>
        </div>
      </div>
    </Soft>
  );
}

/* ---------- SCENE 2 — VISNINGER ---------- */
const VISITORS = [
  ['Emma Nilsen', 'Ons 14. · 17:00'],
  ['Jonas Berg', 'Tor 15. · 18:00'],
  ['Sara Lie', 'Tor 15. · 18:30'],
];
function VisningerMock({ p }) {
  const rise = easeOutCubic(seg(p, 0.02, 0.2));
  const count = Math.round(14 * easeOutCubic(seg(p, 0.12, 0.45)));
  return (
    <Soft className="w-full p-5" style={{ opacity: rise, transform: `translateY(${((1 - rise) * 24).toFixed(0)}px)` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill">
            <CalendarDays className="h-5 w-5 text-lavender" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink leading-tight">Visninger</p>
            <p className="text-xs text-taupe">Booket automatisk</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-bold text-ink leading-none tabular-nums">{count}</p>
          <p className="text-xs text-taupe mt-0.5">interessenter</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {VISITORS.map(([name, when], i) => {
          const at = 0.42 + i * 0.16;
          const inP = easeOutCubic(seg(p, at, at + 0.14));
          const ok = easeOutBack(seg(p, at + 0.12, at + 0.28));
          if (inP <= 0.01) return null;
          return (
            <div
              key={name}
              className="flex items-center gap-3 rounded-xl bg-fill/70 px-3 py-2.5"
              style={{ opacity: inP, transform: `translateX(${((1 - inP) * 12).toFixed(1)}px)` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold text-ink/70 border border-hairline">
                {name.split(' ').map((w) => w[0]).join('')}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium text-ink truncate">{name}</span>
                <span className="flex items-center gap-1 text-xs text-taupe"><Clock className="h-3 w-3" /> {when}</span>
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: '#E8F4EE', color: '#18794E', opacity: clamp01(ok * 1.4), transform: `scale(${Math.max(0.6, Math.min(ok, 1.08)).toFixed(2)})` }}
              >
                <Check className="h-3 w-3" strokeWidth={3} /> Bekreftet
              </span>
            </div>
          );
        })}
      </div>
    </Soft>
  );
}

/* ---------- SCENE 3 — LEIETAKER ---------- */
function ScoreRing({ p }) {
  const pct = Math.round(96 * easeOutCubic(seg(p, 0.2, 0.72)));
  const R = 30, C = 2 * Math.PI * R;
  const off = C * (1 - pct / 100);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 76, height: 76 }}>
      <svg width="76" height="76" className="-rotate-90">
        <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(26,23,38,0.08)" strokeWidth="6" />
        <circle cx="38" cy="38" r={R} fill="none" stroke="#9B5BD6" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} />
      </svg>
      <span className="absolute text-[17px] font-bold text-ink tabular-nums">{pct}</span>
    </div>
  );
}
function LeietakerMock({ p }) {
  const rise = easeOutCubic(seg(p, 0.02, 0.2));
  return (
    <Soft className="w-full p-5" style={{ opacity: rise, transform: `translateY(${((1 - rise) * 24).toFixed(0)}px)` }}>
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[18px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #9B5BD6, #CF97FC)' }}>
          EN
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-ink leading-tight">Emma Nilsen</p>
          <p className="flex items-center gap-1 text-xs text-quiet mt-0.5"><ShieldCheck className="h-3.5 w-3.5 text-lavender" /> Verifisert leietaker</p>
        </div>
        <ScoreRing p={p} />
      </div>
      <div className="mt-3 pt-2 border-t border-hairline">
        <CheckRow p={p} at={0.34} icon={TrendingUp} label="Inntekt" value="3,1× månedsleie" />
        <CheckRow p={p} at={0.46} icon={Star} label="Kredittsjekk" value="Score A · ingen anmerkninger" />
        <CheckRow p={p} at={0.58} icon={BadgeCheck} label="Referanser" value="2 av 2 bekreftet" />
        <CheckRow p={p} at={0.70} icon={ShieldCheck} label="Identitet" value="Bekreftet med BankID" />
      </div>
    </Soft>
  );
}

/* ---------- SCENE 4 — KONTRAKT ---------- */
function KontraktMock({ p }) {
  const rise = easeOutCubic(seg(p, 0.02, 0.2));
  const lines = [0.86, 0.7, 0.92, 0.6];
  const sign = easeInOutCubic(seg(p, 0.42, 0.62));
  const stamp = easeOutBack(seg(p, 0.6, 0.78));
  return (
    <Soft className="w-full p-6" style={{ opacity: rise, transform: `translateY(${((1 - rise) * 24).toFixed(0)}px)` }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">Leiekontrakt</p>
          <p className="text-xs text-taupe">Møhlenprisbakken 14 · 12 mnd</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fill">
          <PenLine className="h-4 w-4 text-lavender" />
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {lines.map((w, i) => {
          const lp = easeOutCubic(seg(p, 0.16 + i * 0.05, 0.3 + i * 0.05));
          return <div key={i} className="h-2 rounded-full bg-fill" style={{ width: `${(w * 100 * lp).toFixed(0)}%`, opacity: lp }} />;
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-hairline grid grid-cols-2 gap-3">
        {[['Utleier', 'K. Nordmann'], ['Leietaker', 'E. Nilsen']].map(([role, who], i) => {
          const s = easeOutCubic(seg(p, 0.44 + i * 0.08, 0.6 + i * 0.08));
          return (
            <div key={role} className="rounded-xl bg-fill/70 px-3 py-2.5" style={{ opacity: 0.4 + 0.6 * s }}>
              <p className="text-[11px] uppercase tracking-[0.12em] text-taupe">{role}</p>
              <p className="mt-1 text-[15px] text-ink" style={{ fontFamily: 'cursive', opacity: s }}>{who}</p>
            </div>
          );
        })}
      </div>
      {stamp > 0.02 && (
        <div
          className="mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5"
          style={{ background: '#E8F4EE', opacity: clamp01(stamp * 1.3), transform: `scale(${Math.max(0.7, Math.min(stamp, 1.05)).toFixed(2)})` }}
        >
          <Check className="h-4 w-4" style={{ color: '#18794E' }} strokeWidth={3} />
          <span className="text-sm font-semibold" style={{ color: '#18794E' }}>Signert med BankID</span>
        </div>
      )}
    </Soft>
  );
}

/* ---------- SCENE 5 — UTBETALING ---------- */
function UtbetalingMock({ p }) {
  const rise = easeOutCubic(seg(p, 0.02, 0.2));
  const amount = Math.round(25500 * easeOutCubic(seg(p, 0.22, 0.66))).toLocaleString('nb-NO');
  const check = easeOutBack(seg(p, 0.66, 0.82));
  const sub = easeOutCubic(seg(p, 0.74, 0.9));
  const bloom = Math.sin(clamp01(seg(p, 0.55, 0.9)) * Math.PI);
  return (
    <Soft className="w-full p-7 overflow-hidden" style={{ opacity: rise, transform: `translateY(${((1 - rise) * 24).toFixed(0)}px)` }}>
      <span
        className="pointer-events-none absolute"
        style={{ inset: '-10% 10% 30% 10%', background: 'radial-gradient(ellipse 60% 60% at 50% 40%, rgba(16,185,129,0.12), rgba(155,91,214,0.06) 50%, transparent 74%)', opacity: bloom.toFixed(2) }}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill">
            <Banknote className="h-5 w-5 text-lavender" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink leading-tight">Leie mottatt</p>
            <p className="text-xs text-taupe">Konto •••• 4291</p>
          </div>
        </div>
        {check > 0.02 && (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: '#E8F4EE', border: '1px solid rgba(24,121,78,0.4)', transform: `scale(${Math.max(0.5, Math.min(check, 1.1)).toFixed(2)})` }}
          >
            <Check className="h-4 w-4" style={{ color: '#18794E' }} strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="relative mt-6 flex items-baseline tabular-nums">
        <span className="font-heading font-bold text-ink" style={{ fontSize: 'clamp(40px,6vw,58px)', letterSpacing: '-0.02em' }}>{amount}</span>
        <span className="font-heading font-bold text-taupe ml-1.5" style={{ fontSize: 'clamp(20px,3vw,28px)' }}>kr</span>
      </div>
      <div className="relative mt-4 flex items-center gap-2" style={{ opacity: sub }}>
        <Sparkles className="h-4 w-4 text-lavender" />
        <span className="text-sm text-quiet">Hver måned · helt automatisk</span>
      </div>
    </Soft>
  );
}

/* ---------- scene-definisjoner ---------- */
const SCENES = [
  { num: '01', label: 'ANNONSE', title: 'Annonsen?', sub: 'Skrevet, priset og publisert på Finn og Airbnb — automatisk.', Mock: AnnonseMock },
  { num: '02', label: 'VISNINGER', title: 'Visningene?', sub: 'Interessenter får svar på minuttet, og visninger bookes — helt selv.', Mock: VisningerMock },
  { num: '03', label: 'LEIETAKER', title: 'Leietakeren?', sub: 'Inntekt, kreditt og identitet sjekkes og verifiseres automatisk.', Mock: LeietakerMock },
  { num: '04', label: 'KONTRAKT', title: 'Kontrakten?', sub: 'Signert digitalt med BankID — trygt og ferdig på minutter.', Mock: KontraktMock },
  { num: '05', label: 'UTBETALING', title: 'Leien?', sub: 'Tikker inn på konto hver måned. Du gjør ingenting.', Mock: UtbetalingMock },
];
const TOTAL = DUR * SCENES.length;

/* ---------- venstre tekstkolonne ---------- */
function SceneText({ scene, p }) {
  const kick = easeOutCubic(seg(p, 0.0, 0.18));
  const titleP = easeOutCubic(seg(p, 0.06, 0.28));
  const subP = easeOutCubic(seg(p, 0.16, 0.4));
  return (
    <div>
      <div className="flex items-center gap-3" style={{ opacity: kick, transform: `translateY(${((1 - kick) * 10).toFixed(1)}px)` }}>
        <span className="font-heading text-[15px] font-bold text-lavender">{scene.num}</span>
        <span className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(155,91,214,0.8), rgba(155,91,214,0.06))' }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-taupe">{scene.label}</span>
      </div>
      <h2
        className="mt-6 font-heading font-bold text-ink tracking-[-0.03em] leading-[1.02]"
        style={{ fontSize: 'clamp(40px,5.2vw,68px)', opacity: titleP, transform: `translateY(${((1 - titleP) * 16).toFixed(1)}px)` }}
      >
        {scene.title}
      </h2>
      <p
        className="mt-5 text-lg sm:text-xl text-quiet leading-relaxed max-w-md"
        style={{ opacity: subP, transform: `translateY(${((1 - subP) * 14).toFixed(1)}px)` }}
      >
        {scene.sub}
      </p>
    </div>
  );
}

/* ===================== HOVEDKOMPONENT ===================== */
export function SeksjonFilm() {
  const ref = useRef(null);
  const [T, setT] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !inView) return;
    let raf, last = performance.now(), acc = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last; last = now; acc += dt;
      if (acc < 32) return; // ~30 fps
      const step = acc / 1000; acc = 0;
      setT((prev) => (prev + step) % TOTAL);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce]);

  const idx = Math.floor(T / DUR) % SCENES.length;
  const frac = (T / DUR) - Math.floor(T / DUR);
  const nxt = (idx + 1) % SCENES.length;

  const layerState = (s) => {
    let o = 0, p = 0;
    if (s === idx) {
      p = frac;
      o = frac < 1 - CF ? 1 : 1 - easeInOutCubic((frac - (1 - CF)) / CF);
    } else if (s === nxt && frac >= 1 - CF) {
      const x = (frac - (1 - CF)) / CF;
      o = easeInOutCubic(x);
      p = x * CF;
    }
    return { o, p };
  };

  const seek = (i) => setT(i * DUR + 0.02);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[660px] overflow-hidden bg-[#FEFBFA] text-ink">
      {/* rolig lavendel-ambient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 50% 44% at 88% 18%, rgba(155,91,214,0.055), transparent 64%), radial-gradient(ellipse 46% 40% at 6% 88%, rgba(207,151,252,0.045), transparent 66%)' }}
      />

      {/* seksjons-eyebrow */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16 pt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-taupe">Slik fungerer DigiHome</p>
        </div>
      </div>

      {/* scene-lag (tekst + mockup), krysstonet */}
      {SCENES.map((scene, s) => {
        const { o, p } = layerState(s);
        if (o <= 0.001) return null;
        const Mock = scene.Mock;
        return (
          <div key={s} className="absolute inset-0" style={{ opacity: o.toFixed(3), willChange: 'opacity' }}>
            <div className="h-full max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center h-full pt-20 pb-24 lg:pt-24 lg:pb-28">
                <SceneText scene={scene} p={p} />
                <div className="flex justify-center lg:justify-end">
                  <div className="w-full max-w-[400px] lg:max-w-[440px]">
                    <Mock p={p} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* kapittel-navigasjon (vedvarende) */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16 pb-9">
          <div className="flex items-center gap-3">
            {SCENES.map((scene, i) => {
              const active = i === idx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => seek(i)}
                  className="group flex items-center gap-2 outline-none"
                  aria-label={`Gå til ${scene.label}`}
                >
                  <span className="relative h-1 overflow-hidden rounded-full transition-all duration-300" style={{ width: active ? 44 : 22, background: 'rgba(26,23,38,0.12)' }}>
                    {active && (
                      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(frac * 100).toFixed(0)}%`, background: '#9B5BD6' }} />
                    )}
                    {!active && <span className="absolute inset-0 rounded-full bg-transparent group-hover:bg-taupe/30 transition-colors" />}
                  </span>
                  <span className={`hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${active ? 'text-ink' : 'text-taupe/60 group-hover:text-taupe'}`}>
                    {scene.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
