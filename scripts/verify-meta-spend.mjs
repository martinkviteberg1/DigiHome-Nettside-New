// Verifiser at forbruket vi viser stemmer med Meta (konto-nivå = fasit i Ads Manager).
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const VER = env.META_API_VERSION || 'v21.0';
const ACC = env.META_AD_ACCOUNT_ID;
const TOKEN = env.META_SYSTEM_USER_TOKEN;
const KEY = 'dh_admin_b3Kx92Qz7Lm4';

async function metaAccountInsights(preset) {
  const u = new URL(`https://graph.facebook.com/${VER}/${ACC}/insights`);
  u.searchParams.set('level', 'account');
  u.searchParams.set('fields', 'spend,impressions,clicks,date_start,date_stop');
  u.searchParams.set('date_preset', preset);
  u.searchParams.set('access_token', TOKEN);
  const j = await (await fetch(u)).json();
  const r = (j.data && j.data[0]) || {};
  return { spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0, from: r.date_start, to: r.date_stop };
}

async function metaAdLevelSum(preset) {
  // Summer på annonse-nivå (slik tabellen vår gjør)
  let u = new URL(`https://graph.facebook.com/${VER}/${ACC}/insights`);
  u.searchParams.set('level', 'ad');
  u.searchParams.set('fields', 'ad_id,spend,impressions,clicks');
  u.searchParams.set('date_preset', preset);
  u.searchParams.set('limit', '500');
  u.searchParams.set('access_token', TOKEN);
  let j = await (await fetch(u)).json();
  let rows = j.data || [];
  let guard = 0;
  while (j.paging && j.paging.next && guard++ < 10) { j = await (await fetch(j.paging.next)).json(); rows = rows.concat(j.data || []); }
  return rows.reduce((t, r) => ({ spend: t.spend + (Number(r.spend) || 0), impressions: t.impressions + (Number(r.impressions) || 0), clicks: t.clicks + (Number(r.clicks) || 0), n: t.n + 1 }), { spend: 0, impressions: 0, clicks: 0, n: 0 });
}

async function ourTable(period) {
  const j = await (await fetch(`http://localhost:3000/api/admin/ads/table?key=${KEY}&googlePeriod=${period}&metaPeriod=${period}&refresh=1`)).json();
  const metaPeriodRows = (j.ads || []).filter((a) => a.channel === 'meta' && a.statsScope === 'period');
  const sum = metaPeriodRows.reduce((t, r) => ({ cost: t.cost + (r.cost || 0), impressions: t.impressions + (r.impressions || 0), clicks: t.clicks + (r.clicks || 0), n: t.n + 1 }), { cost: 0, impressions: 0, clicks: 0, n: 0 });
  return sum;
}

async function ourOverview(period) {
  const j = await (await fetch(`http://localhost:3000/api/admin/ads/overview?key=${KEY}&googlePeriod=${period}&metaPeriod=${period}&metaRefresh=1`)).json();
  const m = j.meta || {};
  return { cost: (m.totals && m.totals.cost) ?? m.cost, raw: m.totals || null, period: m.period };
}

const fmt = (n) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 }).format(n);

for (const period of ['last_7d', 'last_30d']) {
  console.log(`\n===== PERIODE: ${period} =====`);
  const acc = await metaAccountInsights(period);
  console.log(`META KONTO-NIVÅ (fasit, ${acc.from} → ${acc.to}): spend=${fmt(acc.spend)} kr, klikk=${acc.clicks}, visn=${acc.impressions}`);
  const adSum = await metaAdLevelSum(period);
  console.log(`META ANNONSE-NIVÅ (sum ${adSum.n} annonser):        spend=${fmt(adSum.spend)} kr, klikk=${adSum.clicks}, visn=${adSum.impressions}`);
  const ours = await ourTable(period);
  console.log(`VÅR TABELL (sum ${ours.n} meta-rader m/period-scope): spend=${fmt(ours.cost)} kr, klikk=${ours.clicks}, visn=${ours.impressions}`);
  const ov = await ourOverview(period);
  console.log(`VÅR OVERSIKT (Statistikk-fanen):`, JSON.stringify(ov).slice(0, 200));
  const diff = Math.abs(acc.spend - ours.cost);
  console.log(diff < 1 ? `✅ AVVIK: ${fmt(diff)} kr — tallene stemmer` : `⚠️ AVVIK: ${fmt(diff)} kr (${fmt((diff / (acc.spend || 1)) * 100)} %)`);
}
