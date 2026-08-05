// ANALYSE — SEO/AEO-grunnlag fra EKTE data i Search Console (produksjon).
// Ingen anbefalinger uten tall.
//   node scripts/analyse-seo.mjs [days]
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const DAYS = Number(process.argv[2] || 90);
const g = await import('/app/lib/gsc.js');
console.log('GSC konfigurert:', g.gscConfigured());
const st = await g.gscStatus().catch((e) => ({ error: e.message }));
console.log('Status:', JSON.stringify(st).slice(0, 300));

const until = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10); // GSC har ~3 dagers etterslep
const since = new Date(Date.now() - (DAYS + 3) * 86400000).toISOString().slice(0, 10);
console.log(`\nPeriode: ${since} → ${until} (${DAYS} dager)\n`);

const q = async (dimensions, extra = {}) => {
  try {
    const r = await g.searchAnalytics({ startDate: since, endDate: until, dimensions, rowLimit: 200, ...extra });
    return r?.rows || [];
  } catch (e) { console.log(`  (feilet: ${String(e.message).slice(0, 160)})`); return []; }
};

const pct = (v) => `${(Number(v || 0) * 100).toFixed(1)} %`;
const pos = (v) => Number(v || 0).toFixed(1);

// ── Totalt ────────────────────────────────────────────────────────────────
const tot = await q([]);
const t = tot[0] || {};
console.log('══════════ TOTALT ══════════');
console.log(`Klikk ${t.clicks || 0} · visninger ${t.impressions || 0} · CTR ${pct(t.ctr)} · snittposisjon ${pos(t.position)}`);

// ── Søk vi ALLEREDE vises på ──────────────────────────────────────────────
const queries = await q(['query']);
console.log(`\n══════════ SØKEORD (${queries.length}) ══════════`);
const byImpr = [...queries].sort((a, b) => b.impressions - a.impressions);
console.log('\nMest visninger:');
for (const r of byImpr.slice(0, 25)) {
  console.log(`  ${String(r.impressions).padStart(5)} visn · ${String(r.clicks).padStart(3)} klikk · CTR ${pct(r.ctr).padStart(7)} · pos ${pos(r.position).padStart(5)} · ${r.keys[0]}`);
}

// De største mulighetene: mange visninger, posisjon 4–20, lav CTR.
// Der finnes trafikken vi ikke tar.
console.log('\nSTØRSTE MULIGHETER (pos 4–20, sortert på tapte visninger):');
const opp = queries.filter((r) => r.position >= 3.5 && r.position <= 20 && r.impressions >= 10)
  .sort((a, b) => b.impressions - a.impressions);
for (const r of opp.slice(0, 25)) {
  console.log(`  ${String(r.impressions).padStart(5)} visn · CTR ${pct(r.ctr).padStart(7)} · pos ${pos(r.position).padStart(5)} · ${r.keys[0]}`);
}

// Spørsmålssøk = AEO-gull. Disse er det AI-motorer og Google-utvidelser svarer på.
console.log('\nSPØRSMÅLSSØK (AEO — hva folk faktisk spør om):');
const qWords = /^(hva|hvor|hvordan|hvorfor|når|hvem|kan|må|skal|bør|er det|finnes|koster|lønner)/i;
const questions = queries.filter((r) => qWords.test(r.keys[0]) || r.keys[0].includes('?'))
  .sort((a, b) => b.impressions - a.impressions);
if (!questions.length) console.log('  (ingen)');
for (const r of questions.slice(0, 25)) {
  console.log(`  ${String(r.impressions).padStart(5)} visn · ${String(r.clicks).padStart(3)} klikk · pos ${pos(r.position).padStart(5)} · ${r.keys[0]}`);
}

// ── Sider ─────────────────────────────────────────────────────────────────
const pages = await q(['page']);
console.log(`\n══════════ SIDER (${pages.length}) ══════════`);
for (const r of [...pages].sort((a, b) => b.impressions - a.impressions).slice(0, 30)) {
  const p = String(r.keys[0]).replace('https://digihome.no', '') || '/';
  console.log(`  ${String(r.impressions).padStart(5)} visn · ${String(r.clicks).padStart(3)} klikk · CTR ${pct(r.ctr).padStart(7)} · pos ${pos(r.position).padStart(5)} · ${p}`);
}

// ── Enhet + land ──────────────────────────────────────────────────────────
console.log('\n══════════ ENHET ══════════');
for (const r of await q(['device'])) console.log(`  ${r.keys[0].padEnd(8)} ${String(r.impressions).padStart(5)} visn · ${r.clicks} klikk · CTR ${pct(r.ctr)} · pos ${pos(r.position)}`);
