#!/usr/bin/env node
/* Leser alle Lighthouse JSON-rapporter i /app/_perf/lh og beregner
   median + min/max (spredning) per kategori og per nøkkelmetrikk,
   delt på mobil/desktop. Skriver tabell til stdout + JSON til summary.json */
const fs = require('fs');
const path = require('path');
const DIR = process.env.OUTDIR || '/app/_perf/lh';

const median = (arr) => {
  const s = arr.filter((x) => typeof x === 'number' && !isNaN(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const rng = (arr) => {
  const s = arr.filter((x) => typeof x === 'number' && !isNaN(x));
  if (!s.length) return [null, null];
  return [Math.min(...s), Math.max(...s)];
};
const r2 = (n) => (n == null ? '—' : Math.round(n));
const r3 = (n) => (n == null ? '—' : (Math.round(n * 1000) / 1000));

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'summary.json');
const groups = {}; // key: slug|form
for (const f of files) {
  const m = f.match(/^(.*)-(mobile|desktop)-(\d+)\.json$/);
  if (!m) continue;
  const [, slug, form] = m;
  const key = `${slug}|${form}`;
  groups[key] = groups[key] || [];
  try {
    const lhr = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    groups[key].push(lhr);
  } catch (e) { console.error('parse fail', f); }
}

const out = {};
const rows = [];
for (const key of Object.keys(groups).sort()) {
  const [slug, form] = key.split('|');
  const lhrs = groups[key];
  const cat = (id) => lhrs.map((l) => Math.round((l.categories?.[id]?.score ?? 0) * 100));
  const aud = (id) => lhrs.map((l) => l.audits?.[id]?.numericValue);
  const perf = cat('performance');
  const a11y = cat('accessibility');
  const bp = cat('best-practices');
  const seo = cat('seo');
  const lcp = aud('largest-contentful-paint');
  const tbt = aud('total-blocking-time');
  const cls = aud('cumulative-layout-shift');
  const fcp = aud('first-contentful-paint');
  const si = aud('speed-index');
  const tti = aud('interactive');
  const row = {
    page: slug, form, runs: lhrs.length,
    perf: { median: median(perf), range: rng(perf), all: perf },
    a11y: { median: median(a11y), range: rng(a11y), all: a11y },
    bp: { median: median(bp), range: rng(bp), all: bp },
    seo: { median: median(seo), range: rng(seo), all: seo },
    LCP_ms: { median: median(lcp), range: rng(lcp) },
    TBT_ms: { median: median(tbt), range: rng(tbt) },
    CLS: { median: median(cls), range: rng(cls), all: cls.map((x) => r3(x)) },
    FCP_ms: { median: median(fcp), range: rng(fcp) },
    SI_ms: { median: median(si), range: rng(si) },
    TTI_ms: { median: median(tti), range: rng(tti) },
  };
  out[key] = row;
  rows.push(row);
}

fs.writeFileSync(path.join(DIR, 'summary.json'), JSON.stringify(out, null, 2));

// Print tabell
const pad = (s, n) => String(s).padEnd(n);
console.log('\n=================== LIGHTHOUSE MEDIAN (av N kjøringer) ===================');
for (const r of rows) {
  console.log(`\n### ${r.page}  [${r.form}]  (${r.runs} kjøringer)`);
  console.log(pad('Kategori', 16) + pad('Median', 9) + 'Spredning (min–max)');
  console.log('-'.repeat(54));
  console.log(pad('Performance', 16) + pad(r2(r.perf.median), 9) + `${r2(r.perf.range[0])}–${r2(r.perf.range[1])}`);
  console.log(pad('Accessibility', 16) + pad(r2(r.a11y.median), 9) + `${r2(r.a11y.range[0])}–${r2(r.a11y.range[1])}`);
  console.log(pad('Best Practices', 16) + pad(r2(r.bp.median), 9) + `${r2(r.bp.range[0])}–${r2(r.bp.range[1])}`);
  console.log(pad('SEO', 16) + pad(r2(r.seo.median), 9) + `${r2(r.seo.range[0])}–${r2(r.seo.range[1])}`);
  console.log('-'.repeat(54));
  console.log(pad('LCP (ms)', 16) + pad(r2(r.LCP_ms.median), 9) + `${r2(r.LCP_ms.range[0])}–${r2(r.LCP_ms.range[1])}`);
  console.log(pad('TBT (ms)', 16) + pad(r2(r.TBT_ms.median), 9) + `${r2(r.TBT_ms.range[0])}–${r2(r.TBT_ms.range[1])}`);
  console.log(pad('CLS', 16) + pad(r3(r.CLS.median), 9) + `[${r.CLS.all.join(', ')}]`);
  console.log(pad('FCP (ms)', 16) + pad(r2(r.FCP_ms.median), 9) + `${r2(r.FCP_ms.range[0])}–${r2(r.FCP_ms.range[1])}`);
  console.log(pad('Speed Index', 16) + pad(r2(r.SI_ms.median), 9) + `${r2(r.SI_ms.range[0])}–${r2(r.SI_ms.range[1])}`);
}
console.log('\nSummary skrevet til', path.join(DIR, 'summary.json'));
