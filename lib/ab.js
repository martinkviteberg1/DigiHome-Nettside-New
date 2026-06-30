'use client';
// Lettvekts A/B-testing for onboarding/CTA.
// - Deterministisk variant pr. besøkende (sticky), deler visitor-ID med analytics (dh_vid).
// - Tildelinger lagres i localStorage 'dh_ab' og festes automatisk på alle analytics-events
//   (meta.ab) + lead-attribusjon, slik at admin-funnelen kan bryte konvertering ned pr. variant.

const AB_KEY = 'dh_ab';
const VID_KEY = 'dh_vid';

function lsGet(key) {
  try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null; } catch (e) { return null; }
}
function lsSet(key, val) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(key, val); } catch (e) {}
}

// Stabil hash (FNV-aktig) → ikke-kryptografisk, kun for jevn fordeling.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h | 0);
}

function readAssignments() {
  try { return JSON.parse(lsGet(AB_KEY) || '{}') || {}; } catch (e) { return {}; }
}

// Tildel (eller hent) variant for et eksperiment. Sticky pr. besøkende.
export function getVariant(experiment, variants = ['A', 'B']) {
  if (typeof window === 'undefined') return variants[0];
  const map = readAssignments();
  if (map[experiment] && variants.includes(map[experiment])) return map[experiment];
  let vid = lsGet(VID_KEY);
  if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); lsSet(VID_KEY, vid); }
  const variant = variants[hashStr(vid + ':' + experiment) % variants.length];
  map[experiment] = variant;
  lsSet(AB_KEY, JSON.stringify(map));
  return variant;
}

// Alle aktive tildelinger { eksperiment: variant } — festes på events + lead-attribusjon.
export function getAssignments() { return readAssignments(); }
