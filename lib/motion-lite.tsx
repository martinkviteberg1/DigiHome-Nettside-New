'use client';

// ---------------------------------------------------------------------------
// Lett, drop-in erstatning for framer-motion sin brukte overflate.
// Mål: fjerne framer-motion (~50 KB gz + hydrerings-/runtime-kost) fra
// markedssidene. Bruker ren CSS-transition + IntersectionObserver.
//
// Støtter: motion.<tag> med initial/animate/whileInView/transition/variants
// (inkl. funksjons-varianter via `custom`), AnimatePresence (passthrough —
// exit/out-animasjon faller bort), useReducedMotion, MotionConfig.
// Ikke støttet (bevisst, lav verdi): layout/layoutId-sliding, stagger, drag,
// whileHover/whileTap (ingen brukes på markedssidene).
// ---------------------------------------------------------------------------

import React, { forwardRef, useEffect, useRef, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    try { mq.addEventListener('change', handler); } catch { (mq as any).addListener(handler); }
    return () => { try { mq.removeEventListener('change', handler); } catch { (mq as any).removeListener(handler); } };
  }, []);
  return reduced;
}

export function MotionConfig({ children }: any) {
  return <>{children}</>;
}

// AnimatePresence: render children direkte. Mount-animasjon spiller; exit faller bort.
export function AnimatePresence({ children }: any) {
  return <>{children}</>;
}

const TRANSFORM_KEYS = new Set(['x', 'y', 'z', 'scale', 'scaleX', 'scaleY', 'rotate', 'rotateX', 'rotateY', 'skewX', 'skewY']);
const SKIP_STYLE_KEYS = new Set(['transition', 'transitionEnd']);
const MOTION_PROPS = new Set([
  'initial', 'animate', 'whileInView', 'whileHover', 'whileTap', 'whileFocus', 'whileDrag',
  'exit', 'variants', 'transition', 'viewport', 'custom', 'layout', 'layoutId', 'layoutDependency',
  'drag', 'dragConstraints', 'dragElastic', 'dragMomentum', 'mode',
  'onAnimationComplete', 'onAnimationStart', 'onViewportEnter', 'onViewportLeave',
  'transformTemplate', 'transformValues', 'inherit', 'onUpdate', 'as',
]);

function px(v: any) { return typeof v === 'number' ? `${v}px` : v; }
function deg(v: any) { return typeof v === 'number' ? `${v}deg` : v; }

function toTransform(t: any): string {
  const p: string[] = [];
  if (t.x !== undefined) p.push(`translateX(${px(t.x)})`);
  if (t.y !== undefined) p.push(`translateY(${px(t.y)})`);
  if (t.scale !== undefined) p.push(`scale(${t.scale})`);
  if (t.scaleX !== undefined) p.push(`scaleX(${t.scaleX})`);
  if (t.scaleY !== undefined) p.push(`scaleY(${t.scaleY})`);
  if (t.rotate !== undefined) p.push(`rotate(${deg(t.rotate)})`);
  if (t.rotateX !== undefined) p.push(`rotateX(${deg(t.rotateX)})`);
  if (t.rotateY !== undefined) p.push(`rotateY(${deg(t.rotateY)})`);
  if (t.skewX !== undefined) p.push(`skewX(${deg(t.skewX)})`);
  if (t.skewY !== undefined) p.push(`skewY(${deg(t.skewY)})`);
  return p.join(' ');
}

// Løs et mål (objekt eller variant-navn) til et rent objekt. Funksjons-varianter kalles med custom.
function resolveTarget(target: any, variants: any, custom: any): any {
  let t = target;
  if (typeof t === 'string') t = variants ? variants[t] : {};
  if (typeof t === 'function') t = t(custom);
  return t || {};
}

function buildStyle(target: any, variants: any, custom: any): any {
  const t = resolveTarget(target, variants, custom);
  const style: any = {};
  Object.keys(t).forEach((k) => {
    if (TRANSFORM_KEYS.has(k) || SKIP_STYLE_KEYS.has(k)) return;
    style[k] = t[k];
  });
  const transform = toTransform(t);
  if (transform) style.transform = transform;
  return style;
}

function transitionCss(transition: any, target: any, variants: any, custom: any): string {
  const resolved = resolveTarget(target, variants, custom);
  const t = (resolved && resolved.transition) || transition || {};
  const dur = t.duration != null ? t.duration : 0.6;
  const delay = t.delay != null ? t.delay : 0;
  let ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  if (Array.isArray(t.ease) && t.ease.length === 4) ease = `cubic-bezier(${t.ease.join(',')})`;
  else if (typeof t.ease === 'string') {
    const map: any = { linear: 'linear', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out', circIn: 'ease-in', circOut: 'ease-out', anticipate: 'ease-in-out' };
    ease = map[t.ease] || 'ease-out';
  }
  return `${dur}s ${ease} ${delay}s`;
}

const MotionImpl = forwardRef(function MotionImpl(props: any, ref: any) {
  const {
    as = 'div', initial, animate, whileInView, transition, variants, viewport,
    custom, style: userStyle, children, ...rest
  } = props;

  const reduced = useReducedMotion();
  const innerRef = useRef<any>(null);
  const setRef = (node: any) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const hasInView = whileInView !== undefined;
  const target = hasInView ? whileInView : animate;

  const [active, setActive] = useState<boolean>(() => {
    if (hasInView) return false;
    if (animate === undefined) return true;
    return false;
  });

  // Animer ved mount (animate uten whileInView)
  useEffect(() => {
    if (hasInView) return;
    if (reduced) { setActive(true); return; }
    if (animate === undefined) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
    return () => cancelAnimationFrame(id);
  }, [reduced, hasInView, animate]);

  // whileInView via IntersectionObserver
  useEffect(() => {
    if (!hasInView) return;
    if (reduced) { setActive(true); return; }
    const el = innerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setActive(true); return; }
    const once = !viewport || viewport.once !== false;
    const amount = viewport && typeof viewport.amount === 'number' ? viewport.amount : 0.15;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { setActive(true); if (once) obs.disconnect(); }
        else if (!once) setActive(false);
      });
    }, { threshold: Math.min(Math.max(amount, 0), 1), rootMargin: '0px 0px -8% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasInView, reduced, viewport]);

  let computed: any;
  if (reduced) {
    computed = buildStyle(target !== undefined ? target : animate, variants, custom);
  } else if (active) {
    computed = buildStyle(target, variants, custom);
    computed.transition = `all ${transitionCss(transition, target, variants, custom)}`;
  } else {
    computed = buildStyle(initial, variants, custom);
    computed.transition = `all ${transitionCss(transition, target, variants, custom)}`;
  }

  const finalStyle = { willChange: 'transform, opacity', ...(userStyle || {}), ...computed };

  const cleanRest: any = {};
  Object.keys(rest).forEach((k) => { if (!MOTION_PROPS.has(k)) cleanRest[k] = rest[k]; });

  const Tag: any = as;
  return <Tag ref={setRef} style={finalStyle} {...cleanRest}>{children}</Tag>;
});

const cache = new Map<string, any>();
function getMotionComponent(tag: string) {
  if (cache.has(tag)) return cache.get(tag);
  const Comp = forwardRef((props: any, ref: any) => <MotionImpl as={tag} {...props} ref={ref} />);
  (Comp as any).displayName = `motion.${tag}`;
  cache.set(tag, Comp);
  return Comp;
}

export const motion: any = new Proxy({}, {
  get: (_t, key: string) => getMotionComponent(key),
});

export default motion;
