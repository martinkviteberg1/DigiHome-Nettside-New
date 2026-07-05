// ---------------------------------------------------------------------------
// Nyhetsbrev-motor v2 — Mailchimp-klasse.
//
//  • Kampanjer med livssyklus: draft → sent (collection `newsletters`)
//  • Blokkbasert innhold: heading, text, bullets, button, image, quote,
//    divider, spacer, cta-card, signature
//  • Tema (aksentfarge), merge-tags ({{first_name}}, {{name}})
//  • Sporing: åpningspiksel + klikk-redirect (unik per mottaker via HMAC-rid)
//  • Målgrupper: segmenter + manuell ekskludering per e-post
//  • Avmelding: HMAC-signert lenke → `email_optouts` (respekteres ALLTID)
//  • Ingen rå HTML fra bruker — alt escapes.
// ---------------------------------------------------------------------------
import crypto from 'crypto';

export const NEWSLETTER_COLL = 'newsletters';
export const OPTOUT_COLL = 'email_optouts';
export const NL_EVENTS_COLL = 'newsletter_events';

const SECRET = () =>
  (process.env.NEWSLETTER_SECRET || process.env.AGENT_BRIDGE_SECRET || process.env.SENDGRID_API_KEY || 'dh-nl').toString();

export const normEmail = (e) => (e || '').toString().trim().toLowerCase();
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// --- Tokens -----------------------------------------------------------------
export function unsubToken(email) {
  return crypto.createHmac('sha256', SECRET()).update(normEmail(email)).digest('hex').slice(0, 32);
}
export function verifyUnsubToken(email, token) {
  const want = unsubToken(email);
  try { return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(String(token || ''))); } catch (e) { return false; }
}
export function buildUnsubUrl(baseUrl, email) {
  const e = Buffer.from(normEmail(email), 'utf8').toString('base64url');
  return `${(baseUrl || '').replace(/\/$/, '')}/api/newsletter/unsubscribe?e=${e}&t=${unsubToken(email)}`;
}
// Kort mottaker-id for sporing (ikke reverserbar til e-post)
export function recipientId(email) {
  return crypto.createHmac('sha256', SECRET() + ':rid').update(normEmail(email)).digest('hex').slice(0, 16);
}

// --- Absolutte asset-URLer for e-post (bilder må peke på offentlig host) ------
const ASSET_BASE = () =>
  (process.env.NEWSLETTER_ASSET_BASE || process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
export function absAssetUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `${ASSET_BASE()}${s.startsWith('/') ? '' : '/'}${s}`;
}
export const SENDER_DEFAULT = {
  name: 'Sarah Sleeman',
  title: 'Daglig leder, DigiHome',
  photoUrl: '/sarah-sleeman.jpg',
};

// --- Temaer -------------------------------------------------------------------
export const THEMES = {
  lavendel: { accent: '#d298ff', soft: '#f5edfc' },
  skifer: { accent: '#0a0a0a', soft: '#f0f0f0' },
  salvie: { accent: '#7fc79e', soft: '#e9f4ee' },
  rav: { accent: '#f0c86b', soft: '#faf3e2' },
};
export function themeOf(key) { return THEMES[key] || THEMES.lavendel; }

// --- Hjelpere -----------------------------------------------------------------
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function applyMergeTags(str, recipient = {}) {
  const name = (recipient.name || '').toString().trim();
  const first = name ? name.split(/\s+/)[0] : 'der';
  return String(str ?? '')
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*name\s*\}\}/gi, name || 'der');
}

function withUtm(url, campaignSlug) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get('utm_source')) {
      u.searchParams.set('utm_source', 'nyhetsbrev');
      u.searchParams.set('utm_medium', 'email');
      if (campaignSlug) u.searchParams.set('utm_campaign', campaignSlug);
    }
    return u.toString();
  } catch (e) { return url; }
}

// Pakk lenke i klikk-sporing (om sporing er aktiv for denne rendringen)
function trackLink(url, ctx) {
  const finalUrl = withUtm(url, ctx.slug);
  if (!ctx.trackBase || !ctx.campaignId || !ctx.rid) return finalUrl;
  return `${ctx.trackBase}/api/newsletter/click?c=${encodeURIComponent(ctx.campaignId)}&r=${encodeURIComponent(ctx.rid)}&u=${encodeURIComponent(finalUrl)}`;
}

// --- Blokk-rendring (600px, tabellbasert, inline CSS) --------------------------
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

function renderBlock(b, ctx) {
  const t = b?.type;
  const th = ctx.theme;
  if (t === 'heading') {
    return `<tr><td style="padding:8px 40px 4px;"><h2 style="margin:12px 0 4px;font-family:${FONT};font-size:23px;line-height:1.25;font-weight:700;color:#0a0a0a;letter-spacing:-0.02em;">${esc(ctx.merge(b.text))}</h2></td></tr>`;
  }
  if (t === 'text') {
    const paras = String(ctx.merge(b.text || '')).split(/\n{2,}/).map((p) =>
      `<p style="margin:10px 0;font-family:${FONT};font-size:15px;line-height:1.75;color:#555555;">${esc(p).replace(/\n/g, '<br/>')}</p>`
    ).join('');
    return `<tr><td style="padding:0 40px;">${paras}</td></tr>`;
  }
  if (t === 'bullets') {
    const items = (b.items || []).filter(Boolean).map((it) =>
      `<tr><td width="18" valign="top" style="padding:5px 0;"><span style="display:inline-block;width:7px;height:7px;border-radius:99px;background:${th.accent};margin-top:6px;"></span></td><td style="padding:4px 0;font-family:${FONT};font-size:15px;line-height:1.65;color:#444444;">${esc(ctx.merge(it))}</td></tr>`
    ).join('');
    return `<tr><td style="padding:6px 40px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items}</table></td></tr>`;
  }
  if (t === 'button') {
    const url = trackLink(b.url || '#', ctx);
    return `<tr><td align="center" style="padding:18px 40px;">
      <a href="${esc(url)}" target="_blank" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:999px;">${esc(ctx.merge(b.label || 'Les mer'))}&nbsp;&nbsp;&rarr;</a>
    </td></tr>`;
  }
  if (t === 'image') {
    if (!b.url) return '';
    // Valgfri fast høyde + object-fit (cover/contain/fill). Settes i editoren
    // med dra-håndtak. object-fit støttes av Apple Mail/Gmail/webmail — klienter
    // uten støtte viser bildet uskalert (innholdet er fortsatt synlig).
    const h = Number(b.height) > 0 ? Math.round(Number(b.height)) : 0;
    const fit = ['cover', 'contain', 'fill'].includes(b.fit) ? b.fit : 'cover';
    const style = h
      ? `display:block;width:100%;max-width:520px;height:${h}px;object-fit:${fit};border-radius:12px;`
      : 'display:block;width:100%;max-width:520px;border-radius:12px;';
    return `<tr><td style="padding:14px 40px;">
      <img src="${esc(absAssetUrl(b.url))}" alt="${esc(b.alt || '')}" width="520"${h ? ` height="${h}"` : ''} style="${style}" />
    </td></tr>`;
  }
  if (t === 'quote') {
    return `<tr><td style="padding:12px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${th.soft};border-radius:12px;"><tr>
        <td width="4" style="background:${th.accent};border-radius:12px 0 0 12px;">&nbsp;</td>
        <td style="padding:18px 22px;">
          <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.7;color:#333333;font-style:italic;">&ldquo;${esc(ctx.merge(b.text))}&rdquo;</p>
          ${b.author ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:12.5px;color:#888888;">&mdash; ${esc(b.author)}</p>` : ''}
        </td>
      </tr></table>
    </td></tr>`;
  }
  if (t === 'divider') {
    return `<tr><td style="padding:14px 40px;"><div style="height:1px;background:#eeeeee;line-height:1px;">&nbsp;</div></td></tr>`;
  }
  if (t === 'spacer') {
    const h = b.size === 'l' ? 40 : b.size === 's' ? 12 : 24;
    return `<tr><td style="height:${h}px;line-height:${h}px;font-size:1px;">&nbsp;</td></tr>`;
  }
  if (t === 'cta-card') {
    const url = trackLink(b.url || '#', ctx);
    return `<tr><td style="padding:16px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${th.soft};border-radius:16px;"><tr><td align="center" style="padding:28px 28px;">
        <p style="margin:0 0 6px;font-family:${FONT};font-size:18px;font-weight:700;color:#0a0a0a;">${esc(ctx.merge(b.title || ''))}</p>
        ${b.text ? `<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:1.65;color:#555555;">${esc(ctx.merge(b.text))}</p>` : ''}
        <a href="${esc(url)}" target="_blank" style="display:inline-block;background:${th.accent};color:#1f1f1f;font-family:${FONT};font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:999px;">${esc(b.label || 'Ja, jeg er interessert')}</a>
        ${b.footnote ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:12px;color:#999999;">${esc(b.footnote)}</p>` : ''}
      </td></tr></table>
    </td></tr>`;
  }
  if (t === 'hero') {
    if (!b.url) return '';
    const h = Number(b.height) > 0 ? Math.round(Number(b.height)) : 0;
    const fit = ['cover', 'contain', 'fill'].includes(b.fit) ? b.fit : 'cover';
    const style = h
      ? `display:block;width:100%;max-width:600px;height:${h}px;object-fit:${fit};`
      : 'display:block;width:100%;max-width:600px;height:auto;';
    return `<tr><td style="padding:0;">
      <img src="${esc(absAssetUrl(b.url))}" alt="${esc(b.alt || '')}" width="600"${h ? ` height="${h}"` : ''} style="${style}" />
    </td></tr>`;
  }
  if (t === 'properties') {
    // Boligkort fra Boliger-modulen (snapshot lagret i blokken ved valg).
    const items = (b.items || []).filter((p) => p && p.title).slice(0, 6);
    if (!items.length) return '';
    const url = trackLink(b.url || 'https://digihome.no/bli-leietaker', ctx);
    const card = (p) => `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #ece8e2;border-radius:14px;overflow:hidden;">
        ${p.image ? `<tr><td><a href="${esc(url)}" target="_blank" style="text-decoration:none;"><img src="${esc(absAssetUrl(p.image))}" alt="${esc(p.title)}" width="248" height="140" style="display:block;width:100%;height:140px;object-fit:cover;border:0;" /></a></td></tr>` : ''}
        <tr><td style="padding:12px 14px 14px;">
          <p style="margin:0;font-family:${FONT};font-size:13.5px;font-weight:700;color:#0a0a0a;line-height:1.35;">${esc(p.title)}</p>
          ${p.meta ? `<p style="margin:4px 0 0;font-family:${FONT};font-size:11.5px;color:#999999;line-height:1.45;">${esc(p.meta)}</p>` : ''}
          ${p.band ? `<p style="margin:7px 0 0;font-family:${FONT};font-size:12px;font-weight:700;color:#0a0a0a;">${esc(p.band)}</p>` : ''}
        </td></tr>
      </table>`;
    let rows = '';
    for (let i = 0; i < items.length; i += 2) {
      rows += `<tr>
        <td width="50%" valign="top" style="padding:6px 6px 6px 0;">${card(items[i])}</td>
        <td width="50%" valign="top" style="padding:6px 0 6px 6px;">${items[i + 1] ? card(items[i + 1]) : '&nbsp;'}</td>
      </tr>`;
    }
    return `<tr><td style="padding:12px 40px;">
      ${b.title ? `<h3 style="margin:6px 0 10px;font-family:${FONT};font-size:19px;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em;">${esc(ctx.merge(b.title))}</h3>` : ''}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
      ${b.cta ? `<p style="margin:12px 0 0;text-align:center;"><a href="${esc(url)}" target="_blank" style="font-family:${FONT};font-size:13px;font-weight:700;color:#7A3EC8;text-decoration:underline;">${esc(b.cta)}&nbsp;&rarr;</a></p>` : ''}
    </td></tr>`;
  }
  if (t === 'offer') {
    const url = trackLink(b.url || '#', ctx);
    return `<tr><td style="padding:18px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0a0a0a;border-radius:20px;"><tr><td align="center" style="padding:36px 30px 34px;">
        ${b.eyebrow ? `<p style="margin:0 0 14px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${th.accent};">${esc(ctx.merge(b.eyebrow))}</p>` : ''}
        <p style="margin:0;font-family:${FONT};font-size:58px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">${esc(b.big || '')}</p>
        ${b.bigLabel ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:15px;color:#bbbbbb;">${esc(ctx.merge(b.bigLabel))}</p>` : ''}
        ${b.second ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:18px auto 0;"><tr><td style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);border-radius:999px;padding:8px 18px;"><span style="font-family:${FONT};font-size:13.5px;font-weight:600;color:#ffffff;">${esc(ctx.merge(b.second))}</span></td></tr></table>` : ''}
        ${b.deadline ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:12.5px;color:${th.accent};font-weight:600;">${esc(ctx.merge(b.deadline))}</p>` : ''}
        <a href="${esc(url)}" target="_blank" style="display:inline-block;margin-top:22px;background:${th.accent};color:#1f1f1f;font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:999px;">${esc(ctx.merge(b.label || 'Ja, jeg vil vite mer'))}&nbsp;&nbsp;&rarr;</a>
        ${b.footnote ? `<p style="margin:14px 0 0;font-family:${FONT};font-size:11.5px;color:#888888;">${esc(b.footnote)}</p>` : ''}
      </td></tr></table>
    </td></tr>`;
  }
  if (t === 'sender') {
    const photo = absAssetUrl(b.photoUrl || SENDER_DEFAULT.photoUrl);
    return `<tr><td style="padding:16px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fafaf8;border:1px solid #f0ede8;border-radius:16px;"><tr>
        <td width="92" valign="middle" style="padding:18px 0 18px 20px;">
          <img src="${esc(photo)}" alt="${esc(b.name || '')}" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:999px;object-fit:cover;" />
        </td>
        <td valign="middle" style="padding:18px 20px 18px 16px;">
          ${b.note ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:14px;line-height:1.6;color:#555555;font-style:italic;">&ldquo;${esc(ctx.merge(b.note))}&rdquo;</p>` : ''}
          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:700;color:#0a0a0a;">${esc(b.name || '')}</p>
          <p style="margin:2px 0 0;font-family:${FONT};font-size:12.5px;color:#999999;">${esc(b.title || '')}</p>
        </td>
      </tr></table>
    </td></tr>`;
  }
  if (t === 'signature') {
    const initials = (b.name || 'D').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return `<tr><td style="padding:16px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="46" valign="middle"><div style="width:42px;height:42px;border-radius:99px;background:${th.soft};color:#8b6aad;font-family:${FONT};font-size:15px;font-weight:700;text-align:center;line-height:42px;">${esc(initials)}</div></td>
        <td valign="middle" style="padding-left:12px;">
          <p style="margin:0;font-family:${FONT};font-size:14.5px;font-weight:700;color:#0a0a0a;">${esc(b.name || '')}</p>
          <p style="margin:1px 0 0;font-family:${FONT};font-size:12.5px;color:#999999;">${esc(b.title || '')}</p>
        </td>
      </tr></table>
    </td></tr>`;
  }
  return '';
}

// options: { trackBase, campaignId, rid } aktiverer åpnings-/klikksporing
// testNote: valgfri melding fra avsender — gult banner øverst (kun testutsendinger)
export function renderNewsletterHtml({ subject, preheader, blocks = [], theme = 'lavendel', unsubUrl = '#', campaignSlug = '', recipient = null, tracking = null, testNote = '' } = {}) {
  const th = themeOf(theme);
  const ctx = {
    theme: th,
    slug: campaignSlug,
    merge: (s) => applyMergeTags(s, recipient || {}),
    trackBase: tracking?.trackBase || '',
    campaignId: tracking?.campaignId || '',
    rid: tracking?.rid || '',
  };
  const inner = blocks.map((b) => renderBlock(b, ctx)).join('\n');
  const heroFirst = (blocks[0] || {}).type === 'hero';
  const year = new Date().getFullYear();
  const pixel = (ctx.trackBase && ctx.campaignId && ctx.rid)
    ? `<img src="${ctx.trackBase}/api/newsletter/open?c=${encodeURIComponent(ctx.campaignId)}&r=${encodeURIComponent(ctx.rid)}" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" alt="" />`
    : '';
  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(ctx.merge(subject || 'DigiHome'))}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3f0;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f3f0;">${esc(ctx.merge(preheader))}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3f0;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr><td style="padding:6px 8px 18px;">
          <img src="${esc(absAssetUrl('/api/media/email-logo.png'))}" alt="DigiHome" height="26" style="display:block;height:26px;width:auto;border:0;" />
        </td></tr>
        ${testNote ? `<tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border:1px solid #f0dfa0;border-radius:14px;"><tr><td style="padding:14px 18px;">
            <p style="margin:0 0 4px;font-family:${FONT};font-size:10.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#b08a2e;">Melding fra avsender &middot; vises kun i test</p>
            <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.65;color:#5f4d1d;">${esc(testNote).replace(/\n/g, '<br/>')}</p>
          </td></tr></table>
        </td></tr>` : ''}
        <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${heroFirst ? '' : `<tr><td style="height:5px;background:${th.accent};line-height:5px;font-size:1px;">&nbsp;</td></tr>
            <tr><td style="height:26px;line-height:26px;font-size:1px;">&nbsp;</td></tr>`}
            ${inner}
            <tr><td style="height:34px;line-height:34px;font-size:1px;">&nbsp;</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 12px 8px;" align="center">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.7;color:#999999;">
            DigiHome AS &middot; Bergen &middot; <a href="https://digihome.no" style="color:#999999;">digihome.no</a>
          </p>
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.7;color:#999999;">
            Du mottar denne e-posten fordi du har vært i kontakt med DigiHome.
            <a href="${esc(unsubUrl)}" style="color:#a463e8;text-decoration:underline;">Meld deg av her</a>.
          </p>
          <p style="margin:8px 0 0;font-family:${FONT};font-size:11px;color:#bbbbbb;">&copy; ${year} DigiHome AS</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  ${pixel}
</body>
</html>`;
}

// --- Målgrupper -----------------------------------------------------------------
export const SEGMENTS = [
  { key: 'kunder', label: 'Kunder (vunnede utleiere)', consent: 'safe', note: 'Kundeforhold — trygt å sende (mfl. §15)' },
  { key: 'abonnenter', label: 'Nyhetsbrev-abonnenter', consent: 'safe', note: 'Eksplisitt samtykke via påmelding på nettsiden' },
  { key: 'leads', label: 'Åpne utleier-leads', consent: 'gray', note: 'Aktiv dialog — oppfølging OK, generelt nyhetsbrev er grå sone' },
  { key: 'leietakere', label: 'Leietaker-leads', consent: 'gray', note: 'Aktiv dialog — samme vurdering som leads' },
];

async function optoutSet(db) {
  const rows = await db.collection(OPTOUT_COLL).find({}, { projection: { _id: 0, email: 1 } }).limit(100000).toArray();
  return new Set(rows.map((r) => normEmail(r.email)).filter(Boolean));
}

async function fetchSegment(db, key) {
  const proj = { projection: { _id: 0, name: 1, email: 1, status: 1 } };
  if (key === 'kunder') {
    return db.collection('leads').find({ status: 'won', email: { $exists: true, $nin: [null, ''] } }, proj).limit(20000).toArray();
  }
  if (key === 'leads') {
    return db.collection('leads').find({ status: { $in: ['new', 'contacted', 'qualified'] }, email: { $exists: true, $nin: [null, ''] } }, proj).limit(20000).toArray();
  }
  if (key === 'leietakere') {
    return db.collection('tenant_leads').find({ status: { $ne: 'lost' }, email: { $exists: true, $nin: [null, ''] } }, proj).limit(20000).toArray();
  }
  if (key === 'abonnenter') {
    return db.collection('newsletter_subscribers').find({ consent: true, email: { $exists: true, $nin: [null, ''] } }, proj).limit(50000).toArray();
  }
  return [];
}

// Netto mottakere: dedupe på e-post (kunder > abonnenter > leads > leietakere),
// minus avmeldte, ugyldige og manuelt ekskluderte. `extraEmails` = manuelt
// tillagte mottakere (segment 'manuell') — avmeldte respekteres ALLTID.
export async function resolveAudience(db, segments = [], excludedEmails = [], extraEmails = []) {
  const chosen = SEGMENTS.filter((s) => segments.includes(s.key)).map((s) => s.key);
  const optouts = await optoutSet(db);
  const excluded = new Set((excludedEmails || []).map(normEmail));
  const seen = new Set();
  const recipients = [];
  let skippedOptout = 0, skippedDup = 0, skippedInvalid = 0, skippedManual = 0;
  const consider = (r, segKey) => {
    const email = normEmail(r.email);
    if (!EMAIL_RE.test(email)) { skippedInvalid++; return; }
    if (seen.has(email)) { skippedDup++; return; }
    seen.add(email);
    if (optouts.has(email)) { skippedOptout++; return; }
    if (excluded.has(email)) { skippedManual++; return; }
    recipients.push({ email, name: (r.name || '').toString().slice(0, 120), segment: segKey });
  };
  // Manuelt tillagte først (eksplisitt avsender-intensjon vinner dedupe)
  for (const x of (extraEmails || []).slice(0, 500)) {
    const item = typeof x === 'string' ? { email: x, name: '' } : { email: x?.email, name: x?.name || '' };
    consider(item, 'manuell');
  }
  for (const key of ['kunder', 'abonnenter', 'leads', 'leietakere']) {
    if (!chosen.includes(key)) continue;
    const rows = await fetchSegment(db, key);
    for (const r of rows) consider(r, key);
  }
  return { recipients, skipped: { optout: skippedOptout, duplicate: skippedDup, invalid: skippedInvalid, manual: skippedManual } };
}

export async function audienceCounts(db) {
  const optouts = await optoutSet(db);
  const out = [];
  for (const seg of SEGMENTS) {
    const rows = await fetchSegment(db, seg.key);
    const emails = new Set();
    for (const r of rows) {
      const e = normEmail(r.email);
      if (EMAIL_RE.test(e) && !optouts.has(e)) emails.add(e);
    }
    out.push({ ...seg, count: emails.size });
  }
  return { segments: out, optouts: optouts.size };
}

// --- Validering -------------------------------------------------------------------
// Klamp valgfri bildehøyde (px) — null = auto (naturlig høyde).
const sanHeight = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.max(60, Math.min(900, n)) : null;
};
const sanFit = (v) => (['cover', 'contain', 'fill'].includes(v) ? v : 'cover');

export function sanitizeBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const b of raw.slice(0, 60)) {
    const t = b?.type;
    if (t === 'heading') out.push({ type: 'heading', text: String(b.text || '').slice(0, 300) });
    else if (t === 'text') out.push({ type: 'text', text: String(b.text || '').slice(0, 8000) });
    else if (t === 'bullets') out.push({ type: 'bullets', items: (Array.isArray(b.items) ? b.items : []).slice(0, 12).map((x) => String(x || '').slice(0, 300)) });
    else if (t === 'button') out.push({ type: 'button', label: String(b.label || 'Les mer').slice(0, 120), url: String(b.url || 'https://digihome.no').slice(0, 600) });
    else if (t === 'image') out.push({ type: 'image', url: String(b.url || '').slice(0, 600), alt: String(b.alt || '').slice(0, 200), height: sanHeight(b.height), fit: sanFit(b.fit) });
    else if (t === 'quote') out.push({ type: 'quote', text: String(b.text || '').slice(0, 1200), author: String(b.author || '').slice(0, 120) });
    else if (t === 'divider') out.push({ type: 'divider' });
    else if (t === 'spacer') out.push({ type: 'spacer', size: ['s', 'm', 'l'].includes(b.size) ? b.size : 'm' });
    else if (t === 'cta-card') out.push({ type: 'cta-card', title: String(b.title || '').slice(0, 200), text: String(b.text || '').slice(0, 1000), label: String(b.label || 'Ja takk').slice(0, 120), url: String(b.url || 'https://digihome.no').slice(0, 600), footnote: String(b.footnote || '').slice(0, 200) });
    else if (t === 'signature') out.push({ type: 'signature', name: String(b.name || '').slice(0, 120), title: String(b.title || '').slice(0, 160) });
    else if (t === 'hero') out.push({ type: 'hero', url: String(b.url || '').slice(0, 600), alt: String(b.alt || '').slice(0, 200), height: sanHeight(b.height), fit: sanFit(b.fit) });
    else if (t === 'properties') out.push({
      type: 'properties',
      title: String(b.title || '').slice(0, 200),
      cta: String(b.cta || '').slice(0, 120),
      url: String(b.url || 'https://digihome.no/bli-leietaker').slice(0, 600),
      items: (Array.isArray(b.items) ? b.items : []).slice(0, 6).map((p) => ({
        pid: String(p?.pid || '').slice(0, 64),
        title: String(p?.title || '').slice(0, 160),
        image: String(p?.image || '').slice(0, 600),
        meta: String(p?.meta || '').slice(0, 160),
        band: String(p?.band || '').slice(0, 60),
      })).filter((p) => p.title),
    });
    else if (t === 'offer') out.push({
      type: 'offer',
      eyebrow: String(b.eyebrow || '').slice(0, 120),
      big: String(b.big || '').slice(0, 40),
      bigLabel: String(b.bigLabel || '').slice(0, 160),
      second: String(b.second || '').slice(0, 160),
      deadline: String(b.deadline || '').slice(0, 160),
      label: String(b.label || 'Ja, jeg vil vite mer').slice(0, 120),
      url: String(b.url || 'https://digihome.no').slice(0, 600),
      footnote: String(b.footnote || '').slice(0, 240),
    });
    else if (t === 'sender') out.push({
      type: 'sender',
      name: String(b.name || '').slice(0, 120),
      title: String(b.title || '').slice(0, 160),
      note: String(b.note || '').slice(0, 500),
      photoUrl: String(b.photoUrl || '').slice(0, 600),
    });
  }
  return out;
}

// Kun blokker med reelt innhold (for send-validering)
export function hasContent(blocks) {
  return (blocks || []).some((b) => {
    if (b.type === 'divider' || b.type === 'spacer') return false;
    if (b.type === 'bullets') return (b.items || []).some((x) => x && x.trim());
    if (b.type === 'image' || b.type === 'hero') return !!b.url;
    if (b.type === 'properties') return (b.items || []).length > 0;
    if (b.type === 'cta-card') return !!(b.title || b.text);
    if (b.type === 'offer') return !!(b.big || b.eyebrow);
    if (b.type === 'sender') return !!b.name;
    if (b.type === 'signature') return !!b.name;
    return !!((b.text || b.label || '').trim());
  });
}

export function slugifyCampaign(subject) {
  return String(subject || 'nyhetsbrev').toLowerCase()
    .replace(/[æå]/g, 'a').replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'nyhetsbrev';
}

// --- Startpunkter (maler) ------------------------------------------------------------
export const TEMPLATES = [
  {
    key: 'tom', label: 'Tom', desc: 'Start helt fra bunnen', blocks: [],
  },
  {
    key: 'sommer', label: 'Sommerkampanje 2026', desc: 'Verdensklasse tilbudsutsending — 10 % honorar, 0 kr oppstart, frist 10. juli',
    blocks: [
      { type: 'hero', url: 'https://digihome.no/bergen-rooftops.webp', alt: 'Bergen om sommeren' },
      { type: 'heading', text: '{{first_name}}, sommeren er høysesong for utleie i Bergen' },
      { type: 'text', text: 'Hei {{first_name}}!\n\nAkkurat nå flytter studenter, nyansatte og tilflyttere til byen — og leieprisene er på årets høyeste nivå. Har du en bolig som står tom, eller vurderer du utleie? Da er dette det beste tidspunktet på hele året.\n\nFor å gjøre valget enkelt har vi satt sammen et sommertilbud vi aldri har gitt før:' },
      { type: 'offer', eyebrow: 'Sommerkampanje · Begrenset periode', big: '10 %', bigLabel: 'forvaltningshonorar — alt inkludert', second: '+ 0 kr i oppstartskostnad', deadline: 'Gjelder alle som registrerer seg innen 10. juli', label: 'Ja, jeg vil vite mer', url: 'https://digihome.no/sommer', footnote: 'Uforpliktende — vi tar kontakt for en kort prat. Ett klikk, ingen skjema nå.' },
      { type: 'bullets', items: ['Annonsering, visninger og utvelgelse av leietaker', 'Kontrakt med BankID-signering og depositumskonto', 'All kommunikasjon med leietaker — hele leieforholdet', 'Husleie rett på konto — vi purrer om det trengs'] },
      { type: 'quote', text: 'DigiHome gjorde hele utleieprosessen helt sorgløs for oss. Alt bare fungerer.', author: 'Huseier i Bergen sentrum' },
      { type: 'sender', name: 'Sarah Sleeman', title: 'Daglig leder, DigiHome', note: 'Jeg svarer personlig på alle henvendelser fra denne kampanjen — du hører fra meg innen 24 timer.', photoUrl: '/sarah-sleeman.jpg' },
    ],
  },
  {
    key: 'signatur', label: 'DigiHome Signatur', desc: 'Vårt vakreste oppsett — klart til å fylle med innhold',
    blocks: [
      { type: 'heading', text: '{{first_name}}, her er en oppdatering fra oss' },
      { type: 'text', text: 'Hei {{first_name}}!\n\nSkriv hovedbudskapet ditt her — kort, varmt og konkret.' },
      { type: 'bullets', items: ['Første poeng', 'Andre poeng', 'Tredje poeng'] },
      { type: 'button', label: 'Les mer', url: 'https://digihome.no' },
      { type: 'divider' },
      { type: 'signature', name: 'Martin Kviteberg', title: 'DigiHome — lokalt team i Bergen' },
    ],
  },
  {
    key: 'tilbud', label: 'Tilbudskampanje', desc: 'Vekk huseier-leads som ikke har signert — tydelig tilbud + ett-klikks interesse',
    blocks: [
      { type: 'heading', text: '{{first_name}}, klar for en enklere utleie?' },
      { type: 'text', text: 'Vi tar oss av alt det praktiske — annonsering, visninger, kontrakt, depositum og oppfølging — slik at du kan lene deg tilbake og motta leien hver måned.' },
      { type: 'bullets', items: ['Gratis verdivurdering og leieprisanalyse', 'Profesjonell annonse og håndtering av visninger', 'Trygg kontrakt, BankID-signering og depositumskonto', 'Full oppfølging av leietaker — du slipper bryet'] },
      { type: 'cta-card', title: 'Er du interessert i å leie ut?', text: 'Vi har allerede opplysningene dine. Trykk under, så tar vi kontakt for en uforpliktende prat.', label: 'Ja, jeg er interessert', url: 'https://digihome.no/bli-utleier', footnote: 'Ett klikk — du trenger ikke fylle ut noe skjema.' },
      { type: 'quote', text: 'DigiHome gjorde hele utleieprosessen helt sorgløs for oss.', author: 'Eiendomseier i Bergen' },
      { type: 'signature', name: 'Martin Kviteberg', title: 'DigiHome — lokalt team i Bergen' },
    ],
  },
  {
    key: 'kunngjoring', label: 'Kunngjøring', desc: 'Del nyheter med ett tydelig budskap',
    blocks: [
      { type: 'heading', text: 'En nyhet fra DigiHome' },
      { type: 'text', text: 'Fortell hva som er nytt, hvorfor det er relevant for mottakeren, og hva de bør gjøre videre.' },
      { type: 'image', url: '', alt: '' },
      { type: 'button', label: 'Se nyheten', url: 'https://digihome.no' },
    ],
  },
  {
    key: 'digest', label: 'Nyhetsdigest', desc: 'Flere saker i ett ryddig oppsett',
    blocks: [
      { type: 'heading', text: 'Dette skjer i leiemarkedet i Bergen' },
      { type: 'text', text: 'Kort intro om hva denne utgaven inneholder.' },
      { type: 'divider' },
      { type: 'heading', text: 'Sak 1' },
      { type: 'text', text: 'Kort oppsummering av første sak.' },
      { type: 'divider' },
      { type: 'heading', text: 'Sak 2' },
      { type: 'text', text: 'Kort oppsummering av andre sak.' },
      { type: 'button', label: 'Les alt på digihome.no', url: 'https://digihome.no/artikler' },
    ],
  },
  {
    key: 'reengasjement', label: 'Re-engasjement', desc: 'Vekk liv i kalde leads',
    blocks: [
      { type: 'heading', text: 'Hei {{first_name}} — fortsatt aktuelt å leie ut?' },
      { type: 'text', text: 'Det er en stund siden sist. Leiemarkedet i Bergen har endret seg — kanskje boligen din kan tjene mer nå enn da du sjekket sist.' },
      { type: 'cta-card', title: 'Få en fersk vurdering', text: 'Gratis og uforpliktende — svar umiddelbart.', label: 'Se hva boligen kan tjene nå', url: 'https://digihome.no/bli-utleier', footnote: 'Tar under ett minutt.' },
      { type: 'signature', name: 'Martin Kviteberg', title: 'DigiHome — lokalt team i Bergen' },
    ],
  },
];

export function templateBlocks(key) {
  const t = TEMPLATES.find((x) => x.key === key);
  return t ? JSON.parse(JSON.stringify(t.blocks)) : [];
}

// 1x1 transparent GIF for åpningssporing
export const TRACKING_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
