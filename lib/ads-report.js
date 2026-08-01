// Ukentlig management-rapport: henter data (Google+Meta+leads), bygger KPI-er,
// alarmer og anbefalinger, og rendrer en e-postvennlig HTML.
import { runAdsWithMetrics, listCampaignsDetailed, defaultCustomerId, googleAdsNativeConfigured } from '@/lib/google-ads-native';
import { fetchMetaAdsWithInsights, metaAdsConfigured } from '@/lib/meta-ads';
import { buildRecommendations } from '@/lib/ads-recommendations';
import { buildAlerts, aggregate } from '@/lib/ads-monitor';
import { sendHtmlEmail, reportRecipients } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO')} kr`;
const nf = (n) => Math.round(Number(n) || 0).toLocaleString('nb-NO');

export async function buildReportData(db, { customerId } = {}) {
  const cid = customerId || defaultCustomerId();
  const now = Date.now();
  const since7 = now - 7 * 86400000, prevFrom = now - 14 * 86400000, prevTo = now - 7 * 86400000;
  const gOn = googleAdsNativeConfigured(), mOn = metaAdsConfigured();

  const [gCur, gPrev, mCur, mPrev, campaigns] = await Promise.all([
    gOn ? runAdsWithMetrics({ since: new Date(since7).toISOString(), until: new Date(now).toISOString(), customerId: cid }).then((r) => r.ads).catch(() => []) : [],
    gOn ? runAdsWithMetrics({ since: new Date(prevFrom).toISOString(), until: new Date(prevTo).toISOString(), customerId: cid }).then((r) => r.ads).catch(() => []) : [],
    mOn ? fetchMetaAdsWithInsights({ since: ymd(since7), until: ymd(now), lifetimeFallback: false }).catch(() => []) : [],
    mOn ? fetchMetaAdsWithInsights({ since: ymd(prevFrom), until: ymd(prevTo), lifetimeFallback: false }).catch(() => []) : [],
    gOn ? listCampaignsDetailed(cid).catch(() => []) : [],
  ]);
  const allCur = [...gCur, ...mCur], allPrev = [...gPrev, ...mPrev];
  const curAgg = aggregate(allCur), prevAgg = aggregate(allPrev);
  const gAgg = aggregate(gCur), mAgg = aggregate(mCur);

  // Leads fra DB (siste 7 dager) + vunne i vinduet
  const sinceIso = new Date(since7).toISOString();
  let newLeads = 0, wonCount = 0, wonValue = 0;
  try {
    const leadDocs = await db.collection('leads').find({ created_at: { $gte: sinceIso } }, { projection: { _id: 0, status: 1 } }).toArray();
    const tenantDocs = await db.collection('tenant_leads').find({ created_at: { $gte: sinceIso } }, { projection: { _id: 0, status: 1 } }).toArray();
    newLeads = leadDocs.length + tenantDocs.length;
    const wonDocs = await db.collection('leads').find({ status: 'won' }, { projection: { _id: 0, wonValue: 1, won_at: 1, updated_at: 1, created_at: 1 } }).toArray();
    const wonWin = wonDocs.filter((d) => new Date(d.won_at || d.updated_at || d.created_at || 0).getTime() >= since7);
    wonCount = wonWin.length;
    wonValue = wonWin.reduce((s, d) => s + (Number(d.wonValue) || 0), 0);
  } catch (e) { /* tom DB ok */ }

  const recommendations = buildRecommendations({ googleAds: gCur, metaAds: mCur, campaigns });
  const alerts = buildAlerts({ googleAds: gCur, metaAds: mCur, current: curAgg, previous: prevAgg });

  const topAds = [...allCur].sort((a, b) => b.cost - a.cost).slice(0, 5);
  const worstAds = allCur.filter((a) => a.cost >= 100 && a.conversions === 0).sort((a, b) => b.cost - a.cost).slice(0, 5);
  const wow = (cur, prev) => (prev > 0 ? round2(((cur - prev) / prev) * 100) : null);

  return {
    period: 'siste 7 dager',
    totals: {
      cost: round2(curAgg.cost), clicks: curAgg.clicks, impressions: curAgg.impressions, conversions: round2(curAgg.conversions),
      newLeads, wonCount, wonValue: round2(wonValue),
      cpl: newLeads > 0 ? round2(curAgg.cost / newLeads) : null,
      cac: wonCount > 0 ? round2(curAgg.cost / wonCount) : null,
      roasAds: curAgg.cost > 0 ? round2(curAgg.convValue / curAgg.cost) : null,
      roasTrue: curAgg.cost > 0 && wonValue > 0 ? round2(wonValue / curAgg.cost) : null,
    },
    wow: { cost: wow(curAgg.cost, prevAgg.cost), conversions: wow(curAgg.conversions, prevAgg.conversions) },
    channels: {
      google: { cost: round2(gAgg.cost), conversions: round2(gAgg.conversions), clicks: gAgg.clicks },
      meta: { cost: round2(mAgg.cost), conversions: round2(mAgg.conversions), clicks: mAgg.clicks },
    },
    topAds, worstAds, recommendations, alerts,
    generatedAt: new Date().toISOString(),
  };
}

function wowBadge(v) {
  if (v == null) return '';
  const up = v >= 0;
  const color = up ? '#16a34a' : '#dc2626';
  const arrow = up ? '\u25B2' : '\u25BC';
  return `<span style="color:${color};font-size:12px;font-weight:600;">${arrow} ${Math.abs(v)} %</span>`;
}
const SEV_COLOR = { high: '#dc2626', medium: '#d97706', low: '#7c5cff' };

export function renderReportHtml(data) {
  const t = data.totals;
  const kpi = (label, value, sub = '') => `
    <td style="padding:14px 16px;background:#faf9f7;border-radius:12px;">
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.04em;">${label}</div>
      <div style="font-size:22px;font-weight:700;color:#0a0a0a;margin-top:4px;">${value}</div>
      ${sub ? `<div style="margin-top:2px;">${sub}</div>` : ''}
    </td>`;
  const adRow = (a) => `
    <tr>
      <td style="padding:8px 10px;font-size:13px;color:#0a0a0a;border-bottom:1px solid #f3f3f3;">
        <span style="font-size:10px;font-weight:700;color:${a.channel === 'meta' ? '#1877F2' : '#0F9D58'};">${a.channel === 'meta' ? 'Meta' : 'Google'}</span>&nbsp; ${(a.name || '').slice(0, 46)}
      </td>
      <td style="padding:8px 10px;font-size:13px;text-align:right;color:#0a0a0a;border-bottom:1px solid #f3f3f3;">${kr(a.cost)}</td>
      <td style="padding:8px 10px;font-size:13px;text-align:right;color:#666;border-bottom:1px solid #f3f3f3;">${nf(a.clicks)}</td>
      <td style="padding:8px 10px;font-size:13px;text-align:right;color:#666;border-bottom:1px solid #f3f3f3;">${a.conversions ? nf(a.conversions) : '\u2013'}</td>
    </tr>`;
  const alertItem = (al) => `
    <div style="padding:12px 14px;border-left:3px solid ${SEV_COLOR[al.severity] || '#999'};background:#fafafa;border-radius:8px;margin-bottom:8px;">
      <div style="font-size:13.5px;font-weight:600;color:#0a0a0a;">${al.title}</div>
      <div style="font-size:12.5px;color:#777;margin-top:3px;line-height:1.5;">${al.detail}</div>
    </div>`;
  const recItem = (r) => `
    <div style="padding:10px 14px;background:#f7f5f1;border-radius:8px;margin-bottom:6px;">
      <span style="font-size:10px;font-weight:700;color:#fff;background:${SEV_COLOR[r.severity] || '#999'};padding:2px 6px;border-radius:4px;">${(r.severity || '').toUpperCase()}</span>
      <span style="font-size:13px;color:#0a0a0a;font-weight:600;margin-left:6px;">${r.title}</span>
      ${r.estimatedSaving ? `<span style="font-size:12px;color:#16a34a;font-weight:600;"> · ${kr(r.estimatedSaving)} spart</span>` : ''}
    </div>`;

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1efeb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0a0a0a;border-radius:18px 18px 0 0;padding:28px 28px 22px;">
      <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.01em;">DigiHome \u2014 Ukentlig annonserapport</div>
      <div style="color:#9a9a9a;font-size:13px;margin-top:4px;">${data.period} \u00B7 generert ${new Date(data.generatedAt).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
    <div style="background:#fff;border-radius:0 0 18px 18px;padding:24px 22px 28px;">
      <table width="100%" cellspacing="8" cellpadding="0" style="border-collapse:separate;"><tr>
        ${kpi('Forbruk', kr(t.cost), wowBadge(data.wow.cost))}
        ${kpi('Nye leads', nf(t.newLeads), t.cpl != null ? `<span style="font-size:12px;color:#999;">CPL ${kr(t.cpl)}</span>` : '')}
        ${kpi('Vunne kunder', nf(t.wonCount), t.cac != null ? `<span style="font-size:12px;color:#999;">CAC ${kr(t.cac)}</span>` : '')}
      </tr><tr>
        ${kpi('Konverteringer', nf(t.conversions), wowBadge(data.wow.conversions))}
        ${kpi('ROAS (lukket sløyfe)', t.roasTrue != null ? `${t.roasTrue}\u00D7` : '\u2013', t.wonValue ? `<span style="font-size:12px;color:#999;">${kr(t.wonValue)} verdi</span>` : '<span style="font-size:11px;color:#bbb;">venter på vunnet-verdi</span>')}
        ${kpi('Fordeling', `${nf(data.channels.google.cost ? (data.channels.google.cost / (t.cost || 1)) * 100 : 0)}% / ${nf(data.channels.meta.cost ? (data.channels.meta.cost / (t.cost || 1)) * 100 : 0)}%`, '<span style="font-size:11px;color:#bbb;">Google / Meta</span>')}
      </tr></table>

      ${data.alerts.length ? `<h3 style="font-size:15px;color:#0a0a0a;margin:24px 0 10px;">\u26A0\uFE0F Varsler (${data.alerts.length})</h3>${data.alerts.map(alertItem).join('')}` : ''}

      ${data.recommendations.length ? `<h3 style="font-size:15px;color:#0a0a0a;margin:24px 0 10px;">\uD83D\uDCA1 Topp anbefalinger</h3>${data.recommendations.slice(0, 5).map(recItem).join('')}` : ''}

      <h3 style="font-size:15px;color:#0a0a0a;margin:24px 0 8px;">Topp annonser (forbruk)</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><th style="text-align:left;font-size:10px;color:#aaa;text-transform:uppercase;padding:0 10px 6px;">Annonse</th><th style="text-align:right;font-size:10px;color:#aaa;text-transform:uppercase;padding:0 10px 6px;">Kost</th><th style="text-align:right;font-size:10px;color:#aaa;text-transform:uppercase;padding:0 10px 6px;">Klikk</th><th style="text-align:right;font-size:10px;color:#aaa;text-transform:uppercase;padding:0 10px 6px;">Konv.</th></tr>
        ${data.topAds.length ? data.topAds.map(adRow).join('') : '<tr><td colspan="4" style="padding:12px;color:#999;font-size:13px;">Ingen aktive annonser i perioden.</td></tr>'}
      </table>

      ${data.worstAds.length ? `<h3 style="font-size:15px;color:#0a0a0a;margin:22px 0 8px;">\uD83D\uDD34 Sl\u00f8sing (0 konv.)</h3><table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${data.worstAds.map(adRow).join('')}</table>` : ''}

      <div style="margin-top:26px;padding-top:18px;border-top:1px solid #f0f0f0;font-size:12px;color:#aaa;line-height:1.6;">
        Automatisk rapport fra DigiHome annonse-intelligens. Detaljer og handlinger finner du i admin-dashbordet under \u00abAnnonser\u00bb.
      </div>
    </div>
  </div>
</body></html>`;
}

// Bygg + send ukentlig rapport. Lagrer i ads_reports.
export async function sendWeeklyReport(db, { recipients, customerId } = {}) {
  const to = (recipients && recipients.length ? recipients : reportRecipients());
  if (!to.length) return { ok: false, error: 'Ingen mottakere konfigurert (ADS_REPORT_RECIPIENTS)' };
  const data = await buildReportData(db, { customerId });
  const html = renderReportHtml(data);
  const subject = `DigiHome ukerapport \u00B7 ${kr(data.totals.cost)} forbruk \u00B7 ${nf(data.totals.newLeads)} leads`;
  const res = await sendHtmlEmail({ to, subject, html });
  const doc = { id: uuidv4(), at: new Date().toISOString(), recipients: to, subject, summary: data.totals, alerts: data.alerts.length, recommendations: data.recommendations.length, sendResult: { ok: res.ok, statusCode: res.statusCode } };
  await db.collection('ads_reports').insertOne({ ...doc });
  return { ok: true, recipients: to, subject, summary: data.totals };
}
