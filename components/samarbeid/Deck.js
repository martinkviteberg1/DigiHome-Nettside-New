'use client';
/* ---------------------------------------------------------------------------
   Scrolldeck: én seksjon per skjerm med scroll-snap. Hver seksjon er en fast scene
   (1280×720) som skaleres som helhet til viewporten (tak MAX_SCALE – stor skjerm
   gir luft, ikke større skrift). Under FLOW_BELOW rendres seksjonene som én lang side.
   Merket står i skjermens øvre venstre hjørne og «···»-knappen (replay, autoplay,
   oversikt, PDF) i øvre høyre – utenfor scenen. P → PDF · A → autoplay · O → oversikt.
--------------------------------------------------------------------------- */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, Download, LayoutGrid, MoreHorizontal, Pause, Play, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { glowBackground, vignette, DeckLayerContext } from './cine';
import { ReplayContext } from './demo';
import { FLOW_BELOW, FONT, H, MAX_SCALE, PALETTES, W } from './theme';

const measure = () => {
  if (typeof window === 'undefined') return { flow: false, s: 1, vw: W, vh: H };
  const vw = window.innerWidth; const vh = window.innerHeight;
  return { flow: vw < FLOW_BELOW, s: Math.min(vw / W, vh / H, MAX_SCALE), vw, vh };
};
const useStage = () => {
  const [st, setSt] = useState(measure);
  useEffect(() => {
    const on = () => setSt(measure());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return st;
};

/* Plasserer et element i scenens koordinater (1280×720, skalert) midt i viewporten. */
const stageStyle = (s) => ({ position: 'absolute', left: '50%', top: '50%', width: W, height: H, transform: `translate(-50%, -50%) scale(${s})` });

export const Brand = ({ P, withName = true, name = 'DigiHome Tech' }) => (
  <span className="flex items-center gap-2.5 select-none">
    <img src="/brand/digihome-icon-purple.svg" alt="" width={18} height={18} style={{ display: 'block', width: 18, height: 18 }} />
    {withName && <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', color: P.ink, transition: 'color 900ms ease' }}>{name}</span>}
  </span>
);

const MenuItem = ({ onClick, label, kbd, Icon, testid }) => (
  <button role="menuitem" onClick={onClick} data-testid={testid} className="w-full flex items-center justify-between h-9 px-3 rounded-xl transition-colors hover:bg-black/[0.04]">
    <span>{label}</span>
    <span className="flex items-center gap-2" style={{ opacity: 0.55 }}>{kbd && <kbd className="text-[11px] font-medium" style={{ fontFamily: 'inherit' }}>{kbd}</kbd>}{Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />}</span>
  </button>
);

/* `config` velger decket: seksjonsregister, URL-rot, tittel. */
export default function Deck({ initial = 0, config }) {
  const SLIDES = config.slides;
  const router = useRouter();
  const [layerHost, setLayerHost] = useState(null);
  const [i, setI] = useState(initial);
  const iRef = useRef(initial);
  useEffect(() => { iRef.current = i; }, [i]);
  const { flow, s, vw, vh } = useStage();
  /* Header i skjermens hjørner, i scenens skala (aldri under 0,85). */
  const hs = flow ? 1 : Math.min(Math.max(s, 0.85), MAX_SCALE);
  const scroller = useRef(null);
  const sections = useRef([]);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const doReplay = useCallback(() => { setReplay((n) => n + 1); }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  /* Til/fra coveret byttes det rett. Etter byttet fra coveret er scrolleren låst et øyeblikk (`lock`), så hjulets etterløp ikke drar decket videre til 02. */
  const [lock, setLock] = useState(false);
  const go = useCallback((k, smooth = true) => {
    const target = Math.max(0, Math.min(SLIDES.length - 1, k));
    const el = sections.current[target];
    const cur = iRef.current;
    const cut = Math.abs(target - cur) > 1 || (!flow && (target === 0 || cur === 0));
    if (!flow && cur === 0 && target > 0) { setLock(true); window.setTimeout(() => setLock(false), 1200); }
    el?.scrollIntoView({ behavior: smooth && !cut ? 'smooth' : 'auto', block: 'start' });
  }, [SLIDES.length, flow]);
  /* Fra coveret: coveret får spille utgangen sin før byttet – det svarer med preventDefault og kaller `done` når det er klart. */
  const leaving = useRef(false);
  const leaveCover = useCallback((k) => {
    if (leaving.current) return;
    leaving.current = true;
    const done = () => { leaving.current = false; go(k); };
    const ev = new CustomEvent('deck:cover-exit', { cancelable: true, detail: { done, cancel: () => { leaving.current = false; } } });
    window.dispatchEvent(ev);
    if (!ev.defaultPrevented) done();
  }, [go]);
  const ROOT = config.root;
  const onPrint = useCallback(() => router.push(`${ROOT}?print=1&auto=1`), [router, ROOT]);
  /* Autoplay: hver seksjon får sin fortelletid (+ et pust), så neste. Stopper ved manuell navigasjon og på siste seksjon. */
  const [auto, setAuto] = useState(false);
  const [overview, setOverview] = useState(false);
  const nav = useCallback((k) => { setAuto(false); if (!flow && iRef.current === 0 && k === 1) leaveCover(1); else go(k); }, [go, flow, leaveCover]);
  useEffect(() => { leaving.current = false; }, [i]);
  const [coverReady, setCoverReady] = useState(false);
  useEffect(() => { if (i === 0) setCoverReady(false); }, [i]);
  useEffect(() => { const on = () => setCoverReady(true); window.addEventListener('deck:cover-ready', on); return () => window.removeEventListener('deck:cover-ready', on); }, []);
  /* På coveret er scrolleren låst: hjul og sveip går via `nav`. */
  const navRef = useRef(nav);
  navRef.current = nav;
  useEffect(() => {
    const el = scroller.current;
    if (!el || flow) return undefined;
    let acc = 0; let last = 0; let y0 = 0;
    const onWheel = (e) => {
      if (iRef.current !== 0) return;
      const now = performance.now();
      if (now - last > 400) acc = 0;
      last = now; acc += e.deltaY;
      if (acc > 60) { acc = 0; navRef.current(1); }
    };
    const onTouchStart = (e) => { y0 = e.touches[0]?.clientY ?? 0; };
    const onTouchEnd = (e) => { if (iRef.current === 0 && y0 - (e.changedTouches[0]?.clientY ?? y0) > 60) navRef.current(1); };
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { el.removeEventListener('wheel', onWheel); el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, [flow]);
  const toggleAuto = useCallback(() => {
    setAuto((a) => { if (!a) setReplay((n) => n + 1); return !a; });
  }, []);
  const DWELL = 2.2;
  useEffect(() => {
    if (!auto || flow) return undefined;
    if (i >= SLIDES.length - 1) { setAuto(false); return undefined; }
    const id = window.setTimeout(() => go(i + 1), (SLIDES[i].duration + DWELL) * 1000);
    return () => clearTimeout(id);
  }, [auto, i, flow, go, replay, SLIDES]);

  useEffect(() => { if (initial > 0) go(initial, false); }, []); // eslint-disable-line
  /* Forhåndslast bilder. */
  useEffect(() => { (config.preload || []).forEach((src) => { const im = new Image(); im.decoding = 'async'; im.src = src; }); }, [config.preload]);
  /* Hver gang man kommer tilbake til en seksjon spiller den fra start: besøksteller per seksjon inngår i nøkkelen → remount. */
  const visits = useRef(SLIDES.map((_, k) => (k === initial ? 1 : 0)));
  const [, bump] = useState(0);
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const k = Number(e.target.dataset.index);
        visits.current[k] += 1;
        if (visits.current[k] > 1) bump((n) => n + 1);
        setI(k);
      });
    }, { root: scroller.current, threshold: 0.6 });
    sections.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    const def = SLIDES[i];
    const want = i === 0 ? ROOT : `${ROOT}/${def.id}`;
    if (window.location.pathname !== want) window.history.replaceState(null, '', want + window.location.search);
    document.title = i === 0 ? config.title : `${def.nav} – ${config.title}`;
  }, [i, ROOT, SLIDES, config.title]);
  useEffect(() => {
    const onKey = (e) => {
      if (document.body.dataset.deckModal) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': e.preventDefault(); nav(i + 1); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': e.preventDefault(); nav(i - 1); break;
        case 'Home': e.preventDefault(); nav(0); break;
        case 'End': e.preventDefault(); nav(SLIDES.length - 1); break;
        case 'p': case 'P': onPrint(); break;
        case 'r': case 'R': doReplay(); break;
        case 'a': case 'A': if (!flow) toggleAuto(); break;
        case 'o': case 'O': if (!flow) setOverview((o) => !o); break;
        case 'Escape': if (overview) setOverview(false); else if (menuOpen) setMenuOpen(false); else if (auto) setAuto(false); else nav(0); break;
        default: if (/^[1-9]$/.test(e.key) && Number(e.key) <= SLIDES.length) nav(Number(e.key) - 1);
      }
    };
    const onNext = (e) => (e.detail?.auto ? go(i + 1) : nav(i + 1));
    window.addEventListener('keydown', onKey);
    window.addEventListener('deck:next', onNext);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('deck:next', onNext); };
  }, [i, nav, go, onPrint, menuOpen, doReplay, toggleAuto, overview, auto, flow, SLIDES.length]);

  /* En slide kan skifte deckets tone underveis – `deck:tone`. Nullstilles ved slidebytte. */
  const [toneOv, setToneOv] = useState(null);
  useEffect(() => { setToneOv(null); }, [i]);
  useEffect(() => { const on = (e) => setToneOv(e.detail?.tone ?? null); window.addEventListener('deck:tone', on); return () => window.removeEventListener('deck:tone', on); }, []);
  const tone = toneOv ?? SLIDES[i].tone;
  const P = PALETTES[tone];
  const dark = tone === 'dark';
  const L = SLIDES[i].light;
  /* Pekeren gir mockuper en svak 3D-helling – kun på scenen. */
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (flow || !el || window.matchMedia('(pointer: coarse)').matches) return undefined;
    let raf = 0; let tx = 0; let ty = 0;
    const paint = () => {
      raf = 0;
      const tr = `perspective(1600px) rotateY(${(tx * 4).toFixed(2)}deg) rotateX(${(-ty * 3).toFixed(2)}deg)`;
      el.querySelectorAll('.deck-section-wrap[data-active="true"] .deck-tilt').forEach((n) => { n.style.transform = tr; });
    };
    const onMove = (e) => { tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1; if (!raf) raf = requestAnimationFrame(paint); };
    const onLeave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(paint); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => { window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf); };
  }, [flow]);
  const [hinted, setHinted] = useState(false);
  useEffect(() => { if (i > 0) setHinted(true); }, [i]);
  /* ETT LYS, som keyframes: fra der det står → fader ut → flyttes til banens start → rir til målet. */
  const lightAnim = useMemo(() => {
    const ox = (vw - W * s) / 2; const oy = (vh - H * s) / 2;
    const pt = (p) => [ox + p.x * W * s, oy + p.y * H * s];
    const [fx, fy] = pt(L.from ?? L.to); const [tx, ty] = pt(L.to);
    const fade = 0.3; const total = fade + L.delay + L.duration;
    const t = (sec) => Math.min(1, sec / total);
    const start = t(fade + L.delay);
    const seg = (k) => start + (1 - start) * k;
    const ride = L.from ? 'linear' : 'easeOut';
    return {
      size: L.size * s,
      initial: { opacity: 0, x: fx, y: fy },
      animate: { x: [null, fx, fx, tx], y: [null, fy, fy, ty], opacity: L.out ? [null, 0, 0, 1, 1, 0] : [null, 0, 0, 1] },
      transition: {
        duration: total,
        x: { times: [0, t(fade), start, 1], ease: ['easeOut', 'linear', ride] },
        y: { times: [0, t(fade), start, 1], ease: ['easeOut', 'linear', ride] },
        opacity: L.out ? { times: [0, t(fade), start, seg(0.12), seg(0.7), 1], ease: 'easeInOut' } : { times: [0, t(fade), start, Math.min(1, seg(0.55))], ease: 'easeInOut' },
      },
    };
  }, [L, s, vw, vh]);

  const brand = (
    <button onClick={() => nav(0)} className="flex items-center select-none" aria-label={config.title} data-testid="deck-logo" style={{ opacity: i === 0 && config.brandOnCover === false && !flow ? 0 : 1, transition: 'opacity 400ms' }}>
      <Brand P={P} withName={i !== 0} />
    </button>
  );
  const menu = (
    <div className="relative" ref={menuRef} data-testid="deck-menu">
      <button onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Meny" data-testid="deck-menu-button"
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors outline-none focus-visible:ring-1 focus-visible:ring-black/15" style={{ color: P.ink, background: menuOpen ? P.hair : 'transparent' }}>
        <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.75} />
      </button>
      {menuOpen && (
        <div role="menu" data-testid="deck-menu-panel" className="absolute right-0 mt-2 w-60 rounded-2xl p-1.5 text-[13px]"
          style={{ background: dark ? '#1d1a16' : '#fff', color: P.ink, border: `1px solid ${P.hair}`, boxShadow: dark ? '0 12px 40px rgba(0,0,0,0.5)' : '0 12px 40px rgba(21,19,15,0.10)' }}>
          <MenuItem onClick={() => { setMenuOpen(false); doReplay(); }} label="Spill seksjonen igjen" kbd="R" Icon={RotateCcw} testid="deck-replay" />
          <MenuItem onClick={() => { setMenuOpen(false); toggleAuto(); }} label={auto ? 'Stopp automatisk visning' : 'Automatisk visning'} kbd="A" Icon={auto ? Pause : Play} testid="deck-autoplay" />
          <MenuItem onClick={() => { setMenuOpen(false); setOverview(true); }} label="Oversikt" kbd="O" Icon={LayoutGrid} testid="deck-overview-open" />
          <MenuItem onClick={() => { setMenuOpen(false); onPrint(); }} label="Last ned PDF" kbd="P" Icon={Download} testid="deck-print" />
          <div className="px-3 pt-2 pb-2 text-[11.5px] leading-relaxed" style={{ color: P.muted }} data-testid="deck-menu-confidential">Konfidensielt. Delt med navngitte mottakere – ikke videresend.</div>
        </div>
      )}
    </div>
  );
  /* Skinnen i høyre kant: én strek per seksjon, den aktive lengre og i blekk. Hold over → navnene. */
  const rail = (
    <nav aria-label="Seksjoner" data-testid="deck-rail" className="deck-rail absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-end" style={{ padding: '0 18px', gap: 9 }}>
      {SLIDES.map((sl, k) => (
        <button key={sl.id} onClick={(e) => { e.currentTarget.blur(); nav(k); }} aria-label={sl.nav} aria-current={k === i ? 'step' : undefined} data-testid={`deck-rail-${sl.id}`} className="flex items-center justify-end gap-3 outline-none" style={{ height: 9 }}>
          <span className="deck-rail-label" style={{ fontSize: 11.5, color: k === i ? P.ink : P.muted, letterSpacing: '-0.005em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{k === 0 ? sl.nav : `${String(k).padStart(2, '0')} ${sl.nav}`}</span>
          <span aria-hidden style={{ position: 'relative', display: 'block', height: 1, width: k === i ? 22 : 10, background: k === i ? P.ink : P.rule, transition: 'width 380ms cubic-bezier(.22,1,.36,1), background-color 300ms' }}>
            {k === i && auto && <motion.span key={`${i}-${replay}`} data-testid="deck-rail-progress" style={{ position: 'absolute', left: 0, top: -1, height: 3, borderRadius: 2, background: P.accent, boxShadow: `0 0 10px rgba(${P.glow},0.6)` }} initial={{ width: 0 }} animate={{ width: 22 }} transition={{ duration: SLIDES[i].duration + DWELL, ease: 'linear' }} />}
          </span>
        </button>
      ))}
    </nav>
  );
  const hint = (
    <div className="absolute pointer-events-none" style={{ bottom: 22, right: 64 }} data-testid="deck-hint">
      <motion.div data-testid="deck-scroll-hint" className="flex items-center gap-2" style={{ fontSize: 12, color: P.muted, letterSpacing: '-0.005em' }}
        initial={{ opacity: 0 }} animate={{ opacity: i === 0 && !hinted && !auto && !overview ? 1 : 0 }} transition={{ delay: i === 0 && !hinted && !auto ? 5 : 0, duration: 0.9 }}>
        <span>Klikk eller bla nedover</span><ArrowDown className="deck-bob w-3.5 h-3.5" strokeWidth={1.75} />
      </motion.div>
      <AnimatePresence>
        {auto && (
          <motion.div key="auto" data-testid="deck-autoplay-status" className="absolute bottom-0 right-0 flex items-center gap-2 whitespace-nowrap" style={{ fontSize: 12, color: P.muted, letterSpacing: '-0.005em' }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <span aria-hidden className="deck-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: P.accent, boxShadow: `0 0 10px rgba(${P.glow},0.6)` }} />
            <span>Spiller av</span><span style={{ opacity: 0.6 }}>{' · A'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  /* Oversikten: alle seksjonene som stille miniatyrer i et rutenett med fire kolonner. */
  const ov = useMemo(() => {
    const pad = 64; const gap = 18; const top = 92; const bottom = 56; const label = 26; const rows = Math.ceil(SLIDES.length / 4);
    const k = Math.min((vw - 2 * pad - 3 * gap) / 4 / W, (vh - top - bottom - (rows - 1) * gap - rows * label) / rows / H);
    return { k, gap, top };
  }, [vw, vh, SLIDES.length]);
  const overviewPanel = (
    <AnimatePresence>
      {overview && !flow && (
        <motion.div data-testid="deck-overview" role="dialog" aria-modal="true" aria-label="Oversikt" className="absolute inset-0" onClick={() => setOverview(false)}
          style={{ background: dark ? 'rgba(21,19,15,0.965)' : 'rgba(243,241,236,0.97)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>
          <div className="absolute left-1/2 -translate-x-1/2 grid" style={{ top: ov.top, gridTemplateColumns: `repeat(4, ${Math.round(W * ov.k)}px)`, gap: ov.gap }}>
            {SLIDES.map((sl, k) => (
              <motion.div key={sl.id} role="button" tabIndex={0} data-testid={`deck-overview-${sl.id}`} aria-label={sl.nav} aria-current={k === i ? 'step' : undefined} onClick={(e) => { e.stopPropagation(); setOverview(false); nav(k); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOverview(false); nav(k); } }} className="deck-thumb text-left outline-none cursor-pointer"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.18, delay: 0 } }} transition={{ duration: 0.55, delay: 0.03 * k, ease: [0.22, 1, 0.36, 1] }}>
                <div className="deck-thumb-frame" style={{ width: Math.round(W * ov.k), height: Math.round(H * ov.k), overflow: 'hidden', borderRadius: 6, position: 'relative', contain: 'strict', background: PALETTES[sl.tone].bg, boxShadow: k === i ? `0 0 0 1.5px ${P.ink}, 0 18px 40px -20px rgba(0,0,0,0.25)` : `0 0 0 1px ${P.hair}, 0 18px 40px -24px rgba(0,0,0,0.2)` }}>
                  <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${ov.k})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                    <sl.Component animate={false} index={k} total={SLIDES.length} />
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1, color: k === i ? P.ink : P.muted, letterSpacing: '-0.005em', fontVariantNumeric: 'tabular-nums' }}>{k === 0 ? sl.nav : `${String(k).padStart(2, '0')} ${sl.nav}`}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} className="fixed inset-0 antialiased" style={{ background: flow ? P.bg : `${vignette(tone)}, ${P.bg}`, color: P.ink, fontFamily: FONT, transition: 'background-color 900ms ease, color 900ms ease' }} lang="nb" data-testid="deck-root" data-slide={SLIDES[i].id} data-tone={dark ? 'dark' : 'light'} data-mode={flow ? 'flow' : 'stage'} data-scale={s.toFixed(3)}>
      <div aria-hidden className="deck-dots" data-testid="deck-dots" />
      <div ref={setLayerHost} data-testid="deck-layer" className="absolute inset-0 pointer-events-none" aria-hidden />
      {!flow && (
        <motion.div key={replay} aria-hidden data-testid="deck-light" className="absolute pointer-events-none" style={{ left: 0, top: 0, width: lightAnim.size, height: lightAnim.size, marginLeft: -lightAnim.size / 2, marginTop: -lightAnim.size / 2 }}
          initial={lightAnim.initial} animate={lightAnim.animate} transition={lightAnim.transition}>
          <div className="w-full h-full rounded-full" style={{ background: glowBackground(P, L.strength || 0.18), willChange: 'transform' }} />
        </motion.div>
      )}
      <ReplayContext.Provider value={replay}>
        <DeckLayerContext.Provider value={layerHost}>
          <div ref={scroller} className="deck-scroll absolute inset-0 overflow-y-auto" style={{ scrollSnapType: flow ? 'none' : 'y mandatory', overflowY: !flow && (i === 0 || lock) ? 'hidden' : 'auto', cursor: config.coverClick && i === 0 && !flow && coverReady ? 'pointer' : undefined }} data-testid="deck-scroll" data-locked={!flow && (i === 0 || lock) ? 'true' : 'false'}
            onClick={() => { if (config.coverClick && iRef.current === 0 && !flow) nav(1); }}>
            {SLIDES.map((sl, k) => (
              <div key={sl.id} ref={(el) => { sections.current[k] = el; }} data-index={k} data-testid={`deck-section-${sl.id}`} className={`deck-section-wrap ${flow ? 'deck-flow' : ''}`} data-active={k === i ? 'true' : 'false'} aria-hidden={k !== i}
                style={flow ? { minHeight: '100%' } : { position: 'relative', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
                {flow
                  ? <sl.Component animate index={k} total={SLIDES.length} active={k === i} flow />
                  : <div className="deck-stage" style={stageStyle(s)}>{Math.abs(k - i) <= 1 && <sl.Component key={`v${Math.max(1, visits.current[k])}`} animate index={k} total={SLIDES.length} standalone={false} active={k === i} flow={false} />}</div>}
              </div>
            ))}
          </div>
        </DeckLayerContext.Provider>
      </ReplayContext.Provider>

      {overviewPanel}
      {!flow && rail}
      {!flow && hint}
      {flow && <div aria-hidden className="absolute left-0 right-0 top-0 pointer-events-none" style={{ height: 88, background: `linear-gradient(to bottom, ${P.bg} 0%, ${P.bg} 40%, ${P.bg}00 100%)`, transition: 'background 400ms ease' }} />}
      <div className="absolute left-0 top-0" style={{ transform: `scale(${hs})`, transformOrigin: 'top left' }} data-testid="deck-header">
        <div style={{ padding: '22px 24px' }}>{brand}</div>
      </div>
      <div className="absolute right-0 top-0" style={{ transform: `scale(${hs})`, transformOrigin: 'top right' }}>
        <div style={{ padding: '18px 20px' }}>{menu}</div>
      </div>
    </div>
  );
}
