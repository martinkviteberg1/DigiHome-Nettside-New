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
import { sortDistrictGroups } from '@/lib/geo-bergen';
import { dedupeFacts } from '@/lib/listings';

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
// Ettklikks-interesse («magic link»): eget formålstoken på CTA-lenker slik at
// landingssider kan gjenkjenne mottakeren og registrere interesse uten skjema.
export function interestToken(email) {
  return crypto.createHmac('sha256', SECRET() + ':interest').update(normEmail(email)).digest('hex').slice(0, 32);
}
export function verifyInterestToken(email, token) {
  const want = interestToken(email);
  try { return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(String(token || ''))); } catch (e) { return false; }
}

// Boliginteresse-token uten PII i URL: kampanje + rid + bolig-ID signeres.
export function propertyInterestToken(campaignId, rid, propertyId) {
  return crypto.createHmac('sha256', SECRET() + ':property-interest')
    .update(`${String(campaignId || '')}:${String(rid || '')}:${String(propertyId || '')}`)
    .digest('hex').slice(0, 40);
}
export function verifyPropertyInterestToken(campaignId, rid, propertyId, token) {
  const want = propertyInterestToken(campaignId, rid, propertyId);
  try { return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(String(token || ''))); } catch (e) { return false; }
}

export function buildUnsubUrl(baseUrl, email, campaignId = '') {
  const e = Buffer.from(normEmail(email), 'utf8').toString('base64url');
  const c = campaignId ? `&c=${encodeURIComponent(String(campaignId).slice(0, 64))}` : '';
  return `${(baseUrl || '').replace(/\/$/, '')}/api/newsletter/unsubscribe?e=${e}&t=${unsubToken(email)}${c}`;
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
  // Deploy-sikkert: /public følger ikke med standalone-bygget i produksjon.
  // Alle ikke-API-stier serveres derfor via /api/media/<sti> (objektlagring).
  // ?v=2 buster en tidligere CDN-cachet 404 (nyhetsbrev-hero 5. juli).
  const path = s.startsWith('/') ? s : `/${s}`;
  const safe = path.startsWith('/api/') ? path : `/api/media${path}${path.includes('?') ? '&' : '?'}v=2`;
  return `${ASSET_BASE()}${safe}`;
}
export const SENDER_DEFAULT = {
  name: 'Sarah Sleeman',
  title: 'Daglig leder, DigiHome',
  photoUrl: '/sarah-sleeman.jpg',
};

// --- Temaer -------------------------------------------------------------------
// `deep` = mørk variant av aksenten — brukes til hakemerker/tekst på lys bunn.
export const THEMES = {
  lavendel: { accent: '#d298ff', soft: '#f5edfc', deep: '#7A3EC8' },
  skifer: { accent: '#0a0a0a', soft: '#f0f0f0', deep: '#0a0a0a' },
  salvie: { accent: '#7fc79e', soft: '#e9f4ee', deep: '#2e7d54' },
  rav: { accent: '#f0c86b', soft: '#faf3e2', deep: '#9a7014' },
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

// E-postklienter (særlig Outlook mobil) ignorerer object-fit/fast CSS-høyde —
// bilder krympes eller strekkes. Løsning: utsnittet bakes inn i selve bildefilen
// via serverside-beskjæring (?w=&h=&fx=&fy= på asset-endepunktet, 2x for retina).
// Da trenger <img> aldri fast høyde: width:100% + height:auto er trygt overalt.
function croppedSrc(url, dispW, dispH, fx, fy) {
  if (!dispH) return null;
  const abs = absAssetUrl(url);
  if (!/\/api\/newsletter\/asset\?/.test(abs)) return null; // kun opplastede assets kan transformeres
  try {
    const u = new URL(abs);
    u.searchParams.set('w', String(dispW * 2));
    u.searchParams.set('h', String(Math.round(dispH * 2)));
    u.searchParams.set('fx', String(fx));
    u.searchParams.set('fy', String(fy));
    return u.toString();
  } catch (e) { return null; }
}

function withUtm(url, ctx) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get('utm_source')) {
      u.searchParams.set('utm_source', 'nyhetsbrev');
      u.searchParams.set('utm_medium', 'email');
      if (ctx.slug) u.searchParams.set('utm_campaign', ctx.slug);
    }
    // Personlig ettklikks-token på INTERNE lenker: landingssiden gjenkjenner
    // mottakeren og kan registrere interesse uten skjema (bekreftes med POST —
    // e-postskannere som GET-er lenker kan aldri opprette leads).
    if (ctx.email && !u.searchParams.get('t')) {
      let internal = /(^|\.)digihome\.no$/i.test(u.hostname);
      if (!internal && ctx.trackBase) {
        try { internal = u.hostname === new URL(ctx.trackBase).hostname; } catch (e2) { /* ugyldig tracking-base gir vanlig ekstern lenke */ }
      }
      if (internal && !/\/boliginteresse\/?$/i.test(u.pathname)) {
        u.searchParams.set('e', Buffer.from(normEmail(ctx.email), 'utf8').toString('base64url'));
        u.searchParams.set('t', interestToken(ctx.email));
        if (ctx.campaignId && !u.searchParams.get('c')) u.searchParams.set('c', ctx.campaignId);
        if (ctx.rid && !u.searchParams.get('r')) u.searchParams.set('r', ctx.rid);
      }
    }
    return u.toString();
  } catch (e) { return url; }
}

// Pakk lenke i klikk-sporing (om sporing er aktiv for denne rendringen)
function trackLink(url, ctx) {
  const finalUrl = withUtm(url, ctx);
  if (!ctx.trackBase || !ctx.campaignId || !ctx.rid) return finalUrl;
  return `${ctx.trackBase}/api/newsletter/click?c=${encodeURIComponent(ctx.campaignId)}&r=${encodeURIComponent(ctx.rid)}&u=${encodeURIComponent(finalUrl)}`;
}

// --- Blokk-rendring (600px, tabellbasert, inline CSS) --------------------------
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

// Standard motiv i kartseksjonen: vårt eget flyfoto av Bergen i skumring — ekte
// by, egen fil, og jpg (webp faller ut i Outlook). Redaktøren kan laste opp sitt
// eget bilde, f.eks. et skjermbilde av kartet med boligene. Serveres via
// /api/media fordi /public ikke følger med standalone-bygget i produksjon.
const MAP_IMAGE = '/bergen-rooftops-email.jpg';

function renderBlock(b, ctx) {
  const t = b?.type;
  const th = ctx.theme;
  if (t === 'heading') {
    return `<tr><td style="padding:8px 40px 4px;"><h2 style="margin:12px 0 4px;font-family:${FONT};font-size:25px;line-height:1.25;font-weight:800;color:#0f0f0f;letter-spacing:-0.025em;">${esc(ctx.merge(b.text))}</h2></td></tr>`;
  }
  if (t === 'text') {
    const paras = String(ctx.merge(b.text || '')).split(/\n{2,}/).map((p) =>
      `<p style="margin:10px 0;font-family:${FONT};font-size:15px;line-height:1.8;color:#4a4a4a;">${esc(p).replace(/\n/g, '<br/>')}</p>`
    ).join('');
    return `<tr><td style="padding:0 40px;">${paras}</td></tr>`;
  }
  if (t === 'bullets') {
    const deep = th.deep || '#7A3EC8';
    const items = (b.items || []).filter(Boolean).map((it) =>
      `<tr><td width="28" valign="top" style="padding:6px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="19" height="19" align="center" valign="middle" bgcolor="${th.soft}" style="background:${th.soft};border-radius:99px;font-family:${FONT};font-size:11px;font-weight:800;color:${deep};line-height:19px;">&#10003;</td></tr></table></td><td style="padding:5px 0;font-family:${FONT};font-size:15px;line-height:1.7;color:#444444;">${esc(ctx.merge(it))}</td></tr>`
    ).join('');
    return `<tr><td style="padding:6px 40px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items}</table></td></tr>`;
  }
  if (t === 'button') {
    const url = trackLink(b.url || '#', ctx);
    return `<tr><td align="center" style="padding:18px 40px;">
      <a href="${esc(url)}" target="_blank" class="dh-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;background:#0a0a0a;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;line-height:1.4;text-decoration:none;padding:14px 34px;border-radius:999px;">${esc(ctx.merge(b.label || 'Les mer'))}&nbsp;&nbsp;&rarr;</a>
    </td></tr>`;
  }
  if (t === 'image') {
    if (!b.url) return '';
    // Valgfri fast høyde: utsnittet bakes fortrinnsvis inn i selve bildet på
    // serveren (croppedSrc) — object-fit brukes kun som fallback for eksterne
    // bilder som ikke kan transformeres.
    const h = Number(b.height) > 0 ? Math.round(Number(b.height)) : 0;
    const fit = ['cover', 'contain', 'fill'].includes(b.fit) ? b.fit : 'cover';
    const fx = Number.isFinite(Number(b.focalX)) ? Math.max(0, Math.min(100, Math.round(Number(b.focalX)))) : 50;
    const fy = Number.isFinite(Number(b.focalY)) ? Math.max(0, Math.min(100, Math.round(Number(b.focalY)))) : 50;
    const cropped = fit === 'cover' ? croppedSrc(b.url, 520, h, fx, fy) : null;
    if (cropped) {
      return `<tr><td style="padding:14px 40px;">
      <img src="${esc(cropped)}" alt="${esc(b.alt || '')}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:12px;" />
    </td></tr>`;
    }
    const pos = `${fx}% ${fy}%`;
    const style = h
      ? `display:block;width:100%;max-width:520px;height:${h}px;object-fit:${fit};object-position:${pos};border-radius:12px;`
      : 'display:block;width:100%;max-width:520px;height:auto;border-radius:12px;';
    return `<tr><td style="padding:14px 40px;">
      <img src="${esc(absAssetUrl(b.url))}" alt="${esc(b.alt || '')}" width="520" style="${style}" />
    </td></tr>`;
  }
  if (t === 'quote') {
    const deep = th.deep || '#7A3EC8';
    return `<tr><td style="padding:14px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${th.soft};border-radius:18px;"><tr>
        <td style="padding:26px 28px 22px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:0.55;color:${th.accent};">&ldquo;</div>
          <p style="margin:10px 0 0;font-family:${FONT};font-size:15.5px;line-height:1.72;color:#333333;font-style:italic;">${esc(ctx.merge(b.text))}</p>
          ${b.author ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
            <td valign="middle" style="padding-right:10px;"><div style="width:24px;height:2px;background:${deep};font-size:1px;line-height:2px;">&nbsp;</div></td>
            <td valign="middle"><span style="font-family:${FONT};font-size:12.5px;font-weight:700;color:#7a7a7a;">${esc(b.author)}</span></td>
          </tr></table>` : ''}
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
  if (t === 'map') {
    // KARTSEKSJON — «se hvor boligene ligger».
    // Lenken limes inn av redaktøren (typisk FINN sin kartvisning). Uten lenke
    // rendres blokken IKKE: en død kartknapp i en e-post er verre enn ingen
    // kartseksjon i det hele tatt. Editoren viser en tydelig påminnelse i stedet.
    //
    // Designet er bevisst mørkt: brevet ellers er lyse boligkort, og ett mørkt
    // panel gir rytme og løfter kartet fram som noe eget. Knappen er hvit
    // (invertert) fordi det er den ene handlingen i seksjonen.
    const href = String(b.url || '').trim();
    if (!href) return '';
    const url = trackLink(href, ctx);
    const img = b.imageUrl ? absAssetUrl(b.imageUrl) : '';
    const areas = (ctx.propertyDistricts || []);
    const label = ctx.merge(b.label || 'Åpne kartvisningen');
    return `<tr><td class="dh-px" style="padding:14px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#100f0e;border-radius:22px;overflow:hidden;">
        ${img ? `<tr><td style="padding:0;line-height:0;font-size:0;"><a href="${esc(url)}" target="_blank" style="text-decoration:none;display:block;"><img src="${esc(img)}" alt="${esc(b.alt || 'Kart over boligene')}" width="518" style="display:block;width:100%;max-width:518px;height:auto;border:0;border-radius:22px 22px 0 0;" /></a></td></tr>` : ''}
        <tr><td class="dh-card" style="padding:26px 26px 28px;">
          <p style="margin:0 0 10px;font-family:${FONT};font-size:10.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#c9a9f5;">Kart</p>
          ${b.title ? `<h3 style="margin:0;font-family:${FONT};font-size:21px;font-weight:800;line-height:1.28;letter-spacing:-0.028em;color:#ffffff;">${esc(ctx.merge(b.title))}</h3>` : ''}
          ${b.text ? `<p style="margin:10px 0 0;font-family:${FONT};font-size:14px;line-height:1.65;color:#a8a29a;">${esc(ctx.merge(b.text))}</p>` : ''}
          ${areas.length ? `<p style="margin:14px 0 0;font-family:${FONT};font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:#8b857d;">${esc(areas.join(' · '))}</p>` : ''}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td>
            <a href="${esc(url)}" target="_blank" class="dh-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;background:#ffffff;color:#0a0a0a;font-family:${FONT};font-size:13.5px;font-weight:700;line-height:1.4;text-decoration:none;padding:14px 26px;border-radius:999px;">${esc(label)}&nbsp;&nbsp;&rarr;</a>
          </td></tr></table>
          ${b.footnote ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:11px;line-height:1.55;color:#7d776f;">${esc(ctx.merge(b.footnote))}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>`;
  }

  if (t === 'cta-card') {
    const url = trackLink(b.url || '#', ctx);
    return `<tr><td style="padding:16px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${th.soft};border-radius:18px;"><tr><td align="center" style="padding:32px 30px;">
        <p style="margin:0 0 6px;font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-0.015em;color:#0f0f0f;">${esc(ctx.merge(b.title || ''))}</p>
        ${b.text ? `<p style="margin:0 0 18px;font-family:${FONT};font-size:14px;line-height:1.7;color:#5a5a5a;">${esc(ctx.merge(b.text))}</p>` : ''}
        <a href="${esc(url)}" target="_blank" class="dh-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;background:#0f0f0f;color:#ffffff;font-family:${FONT};font-size:14.5px;font-weight:700;line-height:1.4;text-decoration:none;padding:14px 36px;border-radius:999px;">${esc(b.label || 'Ja, jeg er interessert')}&nbsp;&nbsp;&rarr;</a>
        ${b.footnote ? `<p style="margin:13px 0 0;font-family:${FONT};font-size:12px;color:#979797;">${esc(b.footnote)}</p>` : ''}
      </td></tr></table>
    </td></tr>`;
  }
  if (t === 'hero') {
    if (!b.url) return '';
    const h = Number(b.height) > 0 ? Math.round(Number(b.height)) : 0;
    const fit = ['cover', 'contain', 'fill'].includes(b.fit) ? b.fit : 'cover';
    const fx = Number.isFinite(Number(b.focalX)) ? Math.max(0, Math.min(100, Math.round(Number(b.focalX)))) : 50;
    const fy = Number.isFinite(Number(b.focalY)) ? Math.max(0, Math.min(100, Math.round(Number(b.focalY)))) : 50;
    // Foretrukket: server-beskåret utsnitt → width:100% + height:auto er trygt i ALLE klienter
    const cropped = fit === 'cover' ? croppedSrc(b.url, 600, h, fx, fy) : null;
    if (cropped) {
      return `<tr><td style="padding:0;">
      <img src="${esc(cropped)}" alt="${esc(b.alt || '')}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
    </td></tr>`;
    }
    const pos = `${fx}% ${fy}%`;
    const style = h
      ? `display:block;width:100%;max-width:600px;height:${h}px;object-fit:${fit};object-position:${pos};`
      : 'display:block;width:100%;max-width:600px;height:auto;';
    return `<tr><td style="padding:0;">
      <img src="${esc(absAssetUrl(b.url))}" alt="${esc(b.alt || '')}" width="600" style="${style}" />
    </td></tr>`;
  }
  if (t === 'properties') {
    // BOLIGKORT — hjertet i «Ledige boliger»-brevet.
    // Layout: bilde i full bredde, deretter en typografisk trapp
    //   bydel · ledig fra   →   tittel   →   adresse · fakta   →   pris + CTA
    // Alt er tabellbasert med inline CSS, ingen flex/grid og ingen fast
    // bildehøyde (object-fit ignoreres av flere klienter og ville strukket
    // boligbildene). Hvert kort får egen signert interesse-URL per mottaker.
    const items = (b.items || []).filter((p) => p && p.title);
    if (!items.length) return '';
    const deep = th.deep || '#7A3EC8';
    const card = (p, opts = {}) => {
      const propertyId = String(p.pid || p.localId || '').slice(0, 80);
      const interestTarget = p.url || `${(ctx.trackBase || ASSET_BASE()).replace(/\/$/, '')}/boliginteresse?property=${encodeURIComponent(propertyId)}`;
      let personalizedTarget = interestTarget;
      if (ctx.campaignId && ctx.rid && propertyId) {
        try {
          const iu = new URL(interestTarget);
          iu.searchParams.set('c', ctx.campaignId);
          iu.searchParams.set('r', ctx.rid);
          iu.searchParams.set('pt', propertyInterestToken(ctx.campaignId, ctx.rid, propertyId));
          personalizedTarget = iu.toString();
        } catch (e) { /* preview uten gyldig base beholder vanlig URL */ }
      }
      const url = trackLink(personalizedTarget, ctx);
      // Når boligene er gruppert etter bydel står bydelen allerede i
      // gruppetittelen — da gjentar vi den ikke på hvert kort.
      const eyebrow = [opts.hideDistrict || !p.district || p.district === 'Andre områder' ? '' : p.district, p.available || '']
        .filter(Boolean).join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;');
      const factLine = (p.address || p.facts)
        ? [p.address, dedupeFacts(p.title, p.facts)].filter(Boolean).join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;')
        : esc(p.meta || '');
      const price = p.band ? esc(p.band).replace(/\s*kr\/mnd\s*$/i, '').replace(/(\d)\s(?=\d)/g, '$1&nbsp;') : '';
      // Utleieenhet vises bare når den avviker fra det forventede (hele
      // enheten). Da er den viktig — ellers er den støy på et kort som skal
      // leses i to sekunder.
      const scopeChip = (p.scope && p.scope !== 'hele')
        ? [p.scopeLabel || (p.scope === 'rom' ? 'Rom i bofellesskap' : 'Hele enheten eller rom'), p.rooms].filter(Boolean).join('&nbsp;&middot;&nbsp;')
        : '';
      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:1px solid #efece6;border-radius:20px;overflow:hidden;">
        ${p.image ? `<tr><td style="padding:0;line-height:0;font-size:0;"><a href="${esc(url)}" target="_blank" style="text-decoration:none;display:block;"><img src="${esc(absAssetUrl(p.image))}" alt="${esc(p.title)}" width="518" style="display:block;width:100%;max-width:518px;height:auto;border:0;border-radius:20px 20px 0 0;" /></a></td></tr>` : ''}
        <tr><td class="dh-card" style="padding:22px 24px 24px;">
          ${eyebrow ? `<p style="margin:0 0 9px;font-family:${FONT};font-size:10.5px;font-weight:800;letter-spacing:0.13em;text-transform:uppercase;color:${deep};">${eyebrow}</p>` : ''}
          <a href="${esc(url)}" target="_blank" style="text-decoration:none;color:#0a0a0a;"><span style="font-family:${FONT};font-size:19.5px;font-weight:800;line-height:1.3;letter-spacing:-0.022em;color:#0a0a0a;">${esc(p.title)}</span></a>
          ${factLine ? `<p style="margin:9px 0 0;font-family:${FONT};font-size:13.5px;line-height:1.6;color:#7b746c;">${factLine}</p>` : ''}
          ${scopeChip ? `<p style="margin:11px 0 0;"><span style="display:inline-block;background:#F3ECFD;color:#6D28D9;font-family:${FONT};font-size:10.5px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;padding:6px 11px;border-radius:999px;">${scopeChip}</span></p>` : ''}
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:17px;border-top:1px solid #f2efea;"><tr>
            <td class="dh-row" valign="middle" style="padding:17px 0 0;">
              ${price
                ? `<span style="font-family:${FONT};font-size:17.5px;font-weight:800;letter-spacing:-0.015em;color:#0a0a0a;white-space:nowrap;">${price}</span><span style="font-family:${FONT};font-size:12.5px;font-weight:600;color:#8b847b;">&nbsp;kr/mnd${p.scope === 'rom' ? '&nbsp;per&nbsp;rom' : ''}</span>`
                : `<span style="font-family:${FONT};font-size:13.5px;font-weight:600;color:#8b847b;">Pris på forespørsel</span>`}
            </td>
            <td class="dh-row" align="right" valign="middle" style="padding:17px 0 0;">
              <a href="${esc(url)}" target="_blank" class="dh-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;background:#0a0a0a;color:#ffffff;font-family:${FONT};font-size:13px;font-weight:700;line-height:1.4;text-decoration:none;padding:13px 22px;border-radius:999px;white-space:nowrap;">Se bolig og meld interesse&nbsp;&nbsp;&rarr;</a>
            </td>
          </tr></table>
        </td></tr>
      </table>`;
    };
    const threshold = Math.max(2, Number(b.groupingThreshold) || 6);
    const shouldGroup = b.grouping === 'always' || (b.grouping !== 'off' && items.length >= threshold);
    // Bydelsrekkefølge: 'auto' = største bydel først, «Andre områder» sist.
    // 'manual' = bydelene kommer i samme rekkefølge som redaktørens boligliste
    // (første bolig fra en bydel bestemmer hvor bydelen havner). Boligene INNE i
    // hver bydel følger alltid redaktørens rekkefølge.
    const entries = shouldGroup
      ? Object.entries(items.reduce((acc, item) => { const key = item.district || 'Andre områder'; (acc[key] ||= []).push(item); return acc; }, {}))
      : [];
    const groups = shouldGroup
      ? (b.groupOrder === 'manual' ? entries : sortDistrictGroups(entries))
      : [['', items]];
    const cards = groups.map(([district, groupItems], gi) => {
      const header = district ? `<tr><td style="padding:${gi === 0 ? '6px' : '26px'} 0 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="border-bottom:1px solid #f0ede8;padding-bottom:11px;"><span style="font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:-0.005em;color:#0a0a0a;">${esc(district)}</span></td>
          <td align="right" style="border-bottom:1px solid #f0ede8;padding-bottom:11px;"><span style="font-family:${FONT};font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#a8a096;">${groupItems.length} ${groupItems.length === 1 ? 'bolig' : 'boliger'}</span></td>
        </tr></table>
      </td></tr>` : '';
      return `${header}${groupItems.map((p) => `<tr><td style="padding:8px 0;">${card(p, { hideDistrict: !!district })}</td></tr>`).join('')}`;
    }).join('');
    // Blokk-CTA nederst («Se alle ledige boliger»). Lå i editoren, men ble ikke
    // rendret i e-posten — nå kommer den med, som en rolig sekundærhandling.
    const blockCta = b.cta
      ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;"><tr><td align="center">
          <a href="${esc(trackLink(b.url || `${ASSET_BASE()}/ledige-boliger`, ctx))}" target="_blank" class="dh-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;border:1px solid #ddd8d0;background:#ffffff;color:#0a0a0a;font-family:${FONT};font-size:13.5px;font-weight:700;line-height:1.4;text-decoration:none;padding:13px 28px;border-radius:999px;">${esc(ctx.merge(b.cta))}&nbsp;&nbsp;&rarr;</a>
        </td></tr></table>`
      : '';
    return `<tr><td class="dh-px" style="padding:14px 40px;">
      ${b.title ? `<h3 style="margin:6px 0 4px;font-family:${FONT};font-size:23px;font-weight:800;color:#0a0a0a;letter-spacing:-0.028em;line-height:1.25;">${esc(ctx.merge(b.title))}</h3>` : ''}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${cards}</table>
      ${blockCta}
    </td></tr>`;
  }
  if (t === 'offer') {
    const url = trackLink(b.url || '#', ctx);
    // Tilbudslinjer: tittel venstre — gjennomstreket normalpris + nå-pris høyre.
    // Verdensklasse mørkt kort: gradient (fallback solid), badge-eyebrow,
    // stort tall m/gjennomstreket normalpris, glass-panel, deadline-chip, stor CTA.
    const lines = (Array.isArray(b.items) ? b.items : []).filter((x) => x && (x.title || x.now)).slice(0, 4);
    // Priser skal aldri brekke midt i tallet («1 245 kr» holdes samlet med nbsp),
    // men lange verdier som «1 245 kr (−50 %)» kan brytes ETTER kr på smale skjermer.
    const priceHtml = (s) => esc(ctx.merge(s || ''))
      .replace(/(\d)\s(?=\d)/g, '$1&nbsp;')
      .replace(/(\d)\s+(kr)\b/gi, '$1&nbsp;$2');
    const lineRows = lines.map((x, i) => `
          <tr>
            <td align="left" style="padding:14px 4px;${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.10);' : ''}">
              <span style="font-family:${FONT};font-size:14px;font-weight:600;color:#f5f5f5;">${esc(ctx.merge(x.title || ''))}</span>
            </td>
            <td align="right" style="padding:14px 4px;${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.10);' : ''}">
              ${x.was ? `<span style="font-family:${FONT};font-size:12.5px;color:#8d8d8d;"><s style="text-decoration:line-through;">${priceHtml(x.was)}</s></span> ` : ''}<span style="font-family:${FONT};font-size:15.5px;font-weight:800;color:${th.accent};">${priceHtml(x.now)}</span>
            </td>
          </tr>`).join('');
    return `<tr><td style="padding:20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#0a0a0a" style="background:#0a0a0a;background:linear-gradient(150deg,#191223 0%,#0b0a0d 50%,#1d1328 100%);border-radius:24px;"><tr><td align="center" class="dh-offer" style="padding:42px 36px 40px;">
        ${b.eyebrow ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td align="center" style="border:1px solid rgba(255,255,255,0.22);border-radius:999px;padding:8px 20px;"><span style="font-family:${FONT};font-size:10.5px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${th.accent};">${esc(ctx.merge(b.eyebrow))}</span></td></tr></table>` : ''}
        <p class="dh-big" style="margin:${b.eyebrow ? '24px' : '0'} 0 0;font-family:${FONT};font-size:64px;line-height:1;font-weight:800;letter-spacing:-0.035em;color:#ffffff;">${esc(b.big || '')}</p>
        ${b.was ? `<p style="margin:10px 0 0;font-family:${FONT};font-size:14px;color:#8d8d8d;"><s style="text-decoration:line-through;">${esc(ctx.merge(b.was))}</s></p>` : ''}
        ${b.bigLabel ? `<p style="margin:${b.was ? '4px' : '9px'} 0 0;font-family:${FONT};font-size:15px;color:#d0d0d0;">${esc(ctx.merge(b.bigLabel))}</p>` : ''}
        ${b.second ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:18px auto 0;"><tr><td style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);border-radius:999px;padding:8px 18px;"><span style="font-family:${FONT};font-size:13.5px;font-weight:600;color:#ffffff;">${esc(ctx.merge(b.second))}</span></td></tr></table>` : ''}
        ${lineRows ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;"><tr><td class="dh-panel" style="padding:6px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${lineRows}</table></td></tr></table>` : ''}
        ${b.deadline ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 0;"><tr><td align="center" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:8px 18px;"><span style="font-family:${FONT};font-size:12.5px;font-weight:700;letter-spacing:0.02em;color:${th.accent};">${esc(ctx.merge(b.deadline))}</span></td></tr></table>` : ''}
        <a href="${esc(url)}" target="_blank" class="dh-btn" style="display:inline-block;max-width:100%;box-sizing:border-box;margin-top:26px;background:${th.accent};color:#141414;font-family:${FONT};font-size:15.5px;font-weight:800;line-height:1.4;text-decoration:none;padding:17px 48px;border-radius:999px;">${esc(ctx.merge(b.label || 'Ja, jeg vil vite mer'))}&nbsp;&nbsp;&rarr;</a>
        ${b.footnote ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:11.5px;line-height:1.65;color:#8d8d8d;">${esc(b.footnote)}</p>` : ''}
      </td></tr></table>
    </td></tr>`;
  }
  if (t === 'stat') {
    // Markedsinnsikt fra ekstern kilde: store nøkkeltall + tekst + kildehenvisning.
    // Lys temafarget kort — kilden vises alltid nederst (etterrettelighet).
    const deep = th.deep || '#7A3EC8';
    const stats = (Array.isArray(b.stats) ? b.stats : []).filter((x) => x && (x.value || x.label)).slice(0, 3);
    const w = stats.length ? Math.floor(100 / stats.length) : 100;
    const statCells = stats.map((x) => `
          <td width="${w}%" align="center" valign="top" style="padding:16px 8px 6px;">
            <p class="dh-statval" style="margin:0;font-family:${FONT};font-size:34px;line-height:1.05;font-weight:800;letter-spacing:-0.03em;color:${deep};">${esc(ctx.merge(x.value || ''))}</p>
            ${x.label ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:11px;line-height:1.5;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8a8a8a;">${esc(ctx.merge(x.label))}</p>` : ''}
          </td>`).join('');
    const srcText = esc(ctx.merge(b.source || ''));
    const srcHtml = b.source
      ? (b.sourceUrl
        ? `${srcText}&nbsp;&nbsp;<a href="${esc(trackLink(b.sourceUrl, ctx))}" target="_blank" style="color:${deep};text-decoration:none;font-weight:700;white-space:nowrap;">Les mer&nbsp;&rarr;</a>`
        : srcText)
      : '';
    // Bilde øverst i kortet: høyde/fokuspunkt/tilpasning styres i editoren
    // (som hero). Standard uten satt høyde = bannerformat 240 px. Opplastede
    // assets serverside-beskjæres (trygt i alle klienter); eksterne URL-er kan
    // ikke transformeres og bruker object-fit som fallback.
    const sH = Number(b.height) > 0 ? Math.round(Number(b.height)) : null;
    const sFit = ['cover', 'contain', 'fill'].includes(b.fit) ? b.fit : 'cover';
    const sFx = Number.isFinite(Number(b.focalX)) ? Math.max(0, Math.min(100, Math.round(Number(b.focalX)))) : 50;
    const sFy = Number.isFinite(Number(b.focalY)) ? Math.max(0, Math.min(100, Math.round(Number(b.focalY)))) : 50;
    const sCropH = sH || 240;
    const sCropped = b.imageUrl && sFit === 'cover' ? croppedSrc(b.imageUrl, 520, sCropH, sFx, sFy) : null;
    const statImg = b.imageUrl ? (sCropped || absAssetUrl(b.imageUrl)) : '';
    const statImgStyle = sCropped
      ? 'display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:18px 18px 0 0;'
      : (sH
        ? `display:block;width:100%;max-width:520px;height:${sH}px;object-fit:${sFit};object-position:${sFx}% ${sFy}%;border:0;border-radius:18px 18px 0 0;`
        : 'display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:18px 18px 0 0;');
    return `<tr><td style="padding:16px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${th.soft};border-radius:18px;">
        ${statImg ? `<tr><td style="padding:0;"><img src="${esc(statImg)}" alt="" width="520" style="${statImgStyle}" /></td></tr>` : ''}
        <tr><td class="dh-stat" style="padding:28px 30px 22px;">
        ${b.eyebrow ? `<p style="margin:0 0 7px;font-family:${FONT};font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${deep};">${esc(ctx.merge(b.eyebrow))}</p>` : ''}
        ${b.title ? `<p style="margin:0;font-family:${FONT};font-size:19px;font-weight:800;letter-spacing:-0.015em;line-height:1.35;color:#0f0f0f;">${esc(ctx.merge(b.title))}</p>` : ''}
        ${statCells ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:4px;"><tr>${statCells}</tr></table>` : ''}
        ${b.text ? `<p style="margin:${statCells ? '8px' : '12px'} 0 0;font-family:${FONT};font-size:14px;line-height:1.75;color:#4a4a4a;">${esc(ctx.merge(b.text)).replace(/\n/g, '<br/>')}</p>` : ''}
        ${srcHtml ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:18px;"><tr><td style="border-top:1px solid rgba(0,0,0,0.08);padding-top:12px;"><p style="margin:0;font-family:${FONT};font-size:11.5px;line-height:1.6;color:#8a8a8a;">${srcHtml}</p></td></tr></table>` : ''}
      </td></tr></table>
    </td></tr>`;
  }
  if (t === 'sender') {
    const photo = absAssetUrl(b.photoUrl || SENDER_DEFAULT.photoUrl);
    return `<tr><td style="padding:16px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fafaf8;border:1px solid #eeebe5;border-radius:18px;"><tr>
        <td width="96" valign="middle" style="padding:20px 0 20px 22px;">
          <img src="${esc(photo)}" alt="${esc(b.name || '')}" width="74" height="74" style="display:block;width:74px;height:74px;border-radius:999px;object-fit:cover;border:3px solid #ffffff;" />
        </td>
        <td valign="middle" style="padding:20px 22px 20px 16px;">
          ${b.note ? `<p style="margin:0 0 10px;font-family:${FONT};font-size:14px;line-height:1.65;color:#4d4d4d;font-style:italic;">&ldquo;${esc(ctx.merge(b.note))}&rdquo;</p>` : ''}
          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:800;color:#0f0f0f;">${esc(b.name || '')}</p>
          <p style="margin:2px 0 0;font-family:${FONT};font-size:12.5px;color:#979797;">${esc(b.title || '')}</p>
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
    email: (recipient && recipient.email) || '',
    trackBase: tracking?.trackBase || '',
    campaignId: tracking?.campaignId || '',
    rid: tracking?.rid || '',
    // Bydelene som faktisk er med i brevet — kartseksjonen bruker dem til å
    // fortelle hvor boligene ligger, uten at redaktøren må skrive det manuelt.
    propertyDistricts: [...new Set((blocks || [])
      .filter((b) => b?.type === 'properties')
      .flatMap((b) => (b.items || []).map((i) => i?.district))
      .filter((d) => d && d !== 'Andre områder'))].slice(0, 6),
  };
  const innerRaw = blocks.map((b) => renderBlock(b, ctx)).join('\n');
  // Mobil-hook: alle celler med 40px sidepadding får .dh-px (media query i <head>
  // reduserer til 22px på smale skjermer). Gjøres sentralt så hver blokk-renderer
  // slipper å huske klassen. Overskrifter får .dh-h1 (mindre font på mobil).
  const inner = innerRaw
    .replace(/<td style="padding:([^"]*\s|)40px/g, '<td class="dh-px" style="padding:$140px')
    .replace(/<h2 style="margin:12px 0 4px;/g, '<h2 class="dh-h1" style="margin:12px 0 4px;');
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
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
  <!-- Lås fargeskjema: uten dette snur Apple Mail/Outlook fargene i mørk modus
       og lyse kort blir grå-i-grå. Vi styrer designet selv. -->
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${esc(ctx.merge(subject || 'DigiHome'))}</title>
  <!--[if mso]><style>* { font-family: 'Segoe UI', Arial, sans-serif !important; }</style><![endif]-->
  <style>
    /* Grunnhygiene: Outlook respekterer bare eksakte linjehøyder, og iOS
       oppskalerer skrift i e-post uten text-size-adjust. */
    body, table, td, p, a, span { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    td, p { mso-line-height-rule:exactly; }
    img { -ms-interpolation-mode:bicubic; }
    a { color:inherit; }
    /* Mobiltilpasning — respekteres av Gmail, Apple Mail, Outlook-appene m.fl. */
    @media only screen and (max-width:620px) {
      .dh-px { padding-left:22px !important; padding-right:22px !important; }
      .dh-h1 { font-size:21px !important; line-height:1.3 !important; }
      .dh-big { font-size:46px !important; }
      .dh-offer { padding-left:22px !important; padding-right:22px !important; }
      .dh-panel { padding-left:12px !important; padding-right:12px !important; }
      .dh-stat { padding-left:20px !important; padding-right:20px !important; }
      .dh-statval { font-size:27px !important; }
      .dh-stack { display:block !important; width:100% !important; padding:6px 0 !important; }
      .dh-btn { display:block !important; max-width:100% !important; text-align:center !important; padding-left:22px !important; padding-right:22px !important; }
      /* Boligkort: litt strammere sider, og pris/knapp under hverandre. */
      .dh-card { padding-left:18px !important; padding-right:18px !important; }
      .dh-row { display:block !important; width:100% !important; text-align:left !important; padding:14px 0 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f1ee;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f3f1ee;">${esc(ctx.merge(preheader))}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ee;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr><td align="center" style="padding:8px 8px 24px;">
          <img src="${esc(absAssetUrl('/api/media/email-logo.png'))}" alt="DigiHome" height="28" style="display:block;height:28px;width:auto;border:0;margin:0 auto;" />
        </td></tr>
        ${testNote ? `<tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border:1px solid #f0dfa0;border-radius:14px;"><tr><td style="padding:14px 18px;">
            <p style="margin:0 0 4px;font-family:${FONT};font-size:10.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#b08a2e;">Melding fra avsender &middot; vises kun i test</p>
            <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.65;color:#5f4d1d;">${esc(testNote).replace(/\n/g, '<br/>')}</p>
          </td></tr></table>
        </td></tr>` : ''}
        <tr><td style="background:#ffffff;border:1px solid #eceae5;border-radius:24px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${heroFirst ? '' : `<tr><td style="height:5px;background:${th.accent};background:linear-gradient(90deg,${th.accent} 0%,${th.deep || th.accent} 55%,${th.accent} 100%);line-height:5px;font-size:1px;">&nbsp;</td></tr>
            <tr><td style="height:28px;line-height:28px;font-size:1px;">&nbsp;</td></tr>`}
            ${inner}
            <tr><td style="height:36px;line-height:36px;font-size:1px;">&nbsp;</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 12px 8px;" align="center">
          <img src="${esc(absAssetUrl('/api/media/email-logo.png'))}" alt="" height="18" style="display:block;height:18px;width:auto;border:0;margin:0 auto 10px;opacity:0.75;" />
          <p style="margin:0 0 3px;font-family:${FONT};font-size:12px;line-height:1.7;color:#9c9c9c;">Utleie gjort enkelt &mdash; lokalt team i Bergen</p>
          <p style="margin:0 0 10px;font-family:${FONT};font-size:12px;line-height:1.7;color:#9c9c9c;">
            DigiHome AS &middot; Bergen &middot; <a href="https://digihome.no" style="color:#9c9c9c;">digihome.no</a>
          </p>
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.7;color:#9c9c9c;">
            Du mottar denne e-posten fordi du har vært i kontakt med DigiHome.
            <a href="${esc(unsubUrl)}" style="color:#a463e8;text-decoration:underline;">Meld deg av her</a>.
          </p>
          <p style="margin:12px 0 0;font-family:${FONT};font-size:11px;color:#c2c2c2;">&copy; ${year} DigiHome AS</p>
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

// Åpne statuser i salgspipelinen (inkl. granulære: befaring + tilbud sendt)
const OPEN_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'viewing', 'offer'];

async function fetchSegment(db, key) {
  const proj = { projection: { _id: 0, id: 1, name: 1, email: 1, status: 1, attribution: 1 } };
  const impProj = { projection: { _id: 0, id: 1, name: 1, email: 1, status: 1, override: 1, channel: 1 } };
  // Historiske leads (Historikk-synken) lever i imported_leads med samme
  // salgsstatuser — de skal selvsagt kunne motta nyhetsbrev også.
  // Effektiv status = override.status ?? status. Arkiverte er alltid utenfor.
  const impRows = async (leadType, statusFilter) => {
    try {
      const rows = await db.collection('imported_leads')
        .find({ lead_type: leadType === 'leietaker' ? 'leietaker' : { $ne: 'leietaker' }, email: { $exists: true, $nin: [null, ''] }, deleted: { $ne: true } }, impProj)
        .limit(20000).toArray();
      return rows
        .map((r) => ({ id: r.id || '', name: r.name || '', email: r.email, status: (r.override && r.override.status) || r.status || 'new', channel: (r.override && r.override.channel) || r.channel || '', historic: true }))
        .filter((r) => statusFilter(r.status));
    } catch (e) { return []; }
  };
  if (key === 'kunder') {
    const own = await db.collection('leads').find({ status: 'won', email: { $exists: true, $nin: [null, ''] }, deleted: { $ne: true } }, proj).limit(20000).toArray();
    const imp = await impRows('huseier', (s) => s === 'won');
    return [...own.map((r) => ({ ...r, channel: r.attribution?.channel || '' })), ...imp];
  }
  if (key === 'leads') {
    const own = await db.collection('leads').find({ status: { $in: OPEN_LEAD_STATUSES }, email: { $exists: true, $nin: [null, ''] }, deleted: { $ne: true } }, proj).limit(20000).toArray();
    const imp = await impRows('huseier', (s) => OPEN_LEAD_STATUSES.includes(s));
    return [...own.map((r) => ({ ...r, channel: r.attribution?.channel || '' })), ...imp];
  }
  if (key === 'leietakere') {
    const own = await db.collection('tenant_leads').find({ status: { $nin: ['lost', 'disqualified'] }, email: { $exists: true, $nin: [null, ''] }, deleted: { $ne: true } }, proj).limit(20000).toArray();
    const imp = await impRows('leietaker', (s) => !['lost', 'disqualified'].includes(s));
    return [...own.map((r) => ({ ...r, channel: r.attribution?.channel || '' })), ...imp];
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
    recipients.push({
      id: (r.id || '').toString().slice(0, 80),
      email,
      name: (r.name || '').toString().slice(0, 120),
      segment: segKey,
      status: (r.status || '').toString().slice(0, 20),
      historic: !!r.historic,
      channel: (r.channel || '').toString().slice(0, 40),
    });
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
// Fokuspunkt 0–100 % (object-position) — hvor bildet «ankres» ved beskjæring
const sanFocal = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50;
};

export function sanitizeBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const b of raw.slice(0, 60)) {
    const t = b?.type;
    if (t === 'heading') out.push({ type: 'heading', text: String(b.text || '').slice(0, 300) });
    else if (t === 'text') out.push({ type: 'text', text: String(b.text || '').slice(0, 8000) });
    else if (t === 'bullets') out.push({ type: 'bullets', items: (Array.isArray(b.items) ? b.items : []).slice(0, 12).map((x) => String(x || '').slice(0, 300)) });
    else if (t === 'button') out.push({ type: 'button', label: String(b.label || 'Les mer').slice(0, 120), url: String(b.url || 'https://digihome.no').slice(0, 600) });
    else if (t === 'image') out.push({ type: 'image', url: String(b.url || '').slice(0, 600), alt: String(b.alt || '').slice(0, 200), height: sanHeight(b.height), fit: sanFit(b.fit), focalX: sanFocal(b.focalX), focalY: sanFocal(b.focalY) });
    else if (t === 'quote') out.push({ type: 'quote', text: String(b.text || '').slice(0, 1200), author: String(b.author || '').slice(0, 120) });
    else if (t === 'divider') out.push({ type: 'divider' });
    else if (t === 'spacer') out.push({ type: 'spacer', size: ['s', 'm', 'l'].includes(b.size) ? b.size : 'm' });
    else if (t === 'map') out.push({
      type: 'map',
      title: String(b.title || '').slice(0, 200),
      text: String(b.text || '').slice(0, 600),
      // Kartlenken (typisk FINN sin kartvisning). Uten den rendres blokken ikke.
      url: String(b.url || '').slice(0, 900),
      label: String(b.label || 'Åpne kartvisningen').slice(0, 120),
      imageUrl: String(b.imageUrl || '').slice(0, 600),
      alt: String(b.alt || '').slice(0, 200),
      footnote: String(b.footnote || '').slice(0, 200),
    });
    else if (t === 'cta-card') out.push({ type: 'cta-card', title: String(b.title || '').slice(0, 200), text: String(b.text || '').slice(0, 1000), label: String(b.label || 'Ja takk').slice(0, 120), url: String(b.url || 'https://digihome.no').slice(0, 600), footnote: String(b.footnote || '').slice(0, 200) });
    else if (t === 'signature') out.push({ type: 'signature', name: String(b.name || '').slice(0, 120), title: String(b.title || '').slice(0, 160) });
    else if (t === 'hero') out.push({ type: 'hero', url: String(b.url || '').slice(0, 600), alt: String(b.alt || '').slice(0, 200), height: sanHeight(b.height), fit: sanFit(b.fit), focalX: sanFocal(b.focalX), focalY: sanFocal(b.focalY) });
    else if (t === 'properties') out.push({
      type: 'properties',
      title: String(b.title || '').slice(0, 200),
      cta: String(b.cta || '').slice(0, 120),
      url: String(b.url || '').slice(0, 600),
      items: (Array.isArray(b.items) ? b.items : []).map((p) => ({
        pid: String(p?.pid || '').slice(0, 80),
        localId: String(p?.localId || '').slice(0, 80),
        title: String(p?.title || '').slice(0, 160),
        // Hvor tittelen/prisen kommer fra (redigert/finn/plattform/avledet).
        // Rent redaksjonell sporbarhet — vises i editoren, aldri i e-posten.
        titleSource: ['redigert', 'finn', 'finn_full', 'plattform', 'avledet'].includes(p?.titleSource) ? p.titleSource : null,
        bandSource: ['plattform', 'finn'].includes(p?.bandSource) ? p.bandSource : null,
        image: String(p?.image || '').slice(0, 600),
        meta: String(p?.meta || '').slice(0, 240),
        // Strukturerte linjer for det moderne boligkortet (adresse / fakta /
        // ledig fra). Eldre utkast har bare `meta` — kortet faller tilbake.
        address: String(p?.address || '').slice(0, 160),
        facts: String(p?.facts || '').slice(0, 120),
        available: String(p?.available || '').slice(0, 80),
        band: String(p?.band || '').slice(0, 80),
        // Utleieenhet (hele enheten / rom i bofellesskap / begge) + romtelling.
        scope: ['hele', 'rom', 'begge'].includes(p?.scope) ? p.scope : null,
        scopeLabel: String(p?.scopeLabel || '').slice(0, 80),
        rooms: String(p?.rooms || '').slice(0, 60),
        status: String(p?.status || 'active').slice(0, 20),
        district: String(p?.district || '').slice(0, 100),
        url: String(p?.url || '').slice(0, 600),
      })).filter((p) => p.pid && p.title),
      grouping: ['off', 'auto', 'always'].includes(b.grouping) ? b.grouping : 'auto',
      groupingThreshold: Math.max(2, Math.min(50, Number(b.groupingThreshold) || 6)),
      groupOrder: b.groupOrder === 'manual' ? 'manual' : 'auto',
    });
    else if (t === 'offer') out.push({
      type: 'offer',
      eyebrow: String(b.eyebrow || '').slice(0, 120),
      big: String(b.big || '').slice(0, 40),
      was: String(b.was || '').slice(0, 60),
      bigLabel: String(b.bigLabel || '').slice(0, 160),
      second: String(b.second || '').slice(0, 160),
      items: (Array.isArray(b.items) ? b.items : []).slice(0, 4).map((x) => ({
        title: String(x?.title || '').slice(0, 120),
        was: String(x?.was || '').slice(0, 60),
        now: String(x?.now || '').slice(0, 60),
      })).filter((x) => x.title || x.now),
      deadline: String(b.deadline || '').slice(0, 160),
      label: String(b.label || 'Ja, jeg vil vite mer').slice(0, 120),
      url: String(b.url || 'https://digihome.no').slice(0, 600),
      footnote: String(b.footnote || '').slice(0, 240),
    });
    else if (t === 'stat') out.push({
      type: 'stat',
      eyebrow: String(b.eyebrow || '').slice(0, 120),
      title: String(b.title || '').slice(0, 200),
      stats: (Array.isArray(b.stats) ? b.stats : []).slice(0, 3).map((x) => ({
        value: String(x?.value || '').slice(0, 40),
        label: String(x?.label || '').slice(0, 120),
      })).filter((x) => x.value || x.label),
      text: String(b.text || '').slice(0, 2000),
      source: String(b.source || '').slice(0, 240),
      sourceUrl: String(b.sourceUrl || '').slice(0, 600),
      imageUrl: String(b.imageUrl || '').slice(0, 600),
      height: sanHeight(b.height),
      fit: sanFit(b.fit),
      focalX: sanFocal(b.focalX),
      focalY: sanFocal(b.focalY),
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
    // Kartseksjonen teller som innhold først når lenken er limt inn — ellers
    // rendres den ikke, og et brev med bare en tom kartblokk ville vært tomt.
    if (b.type === 'map') return !!String(b.url || '').trim();
    if (b.type === 'cta-card') return !!(b.title || b.text);
    if (b.type === 'offer') return !!(b.big || b.eyebrow);
    if (b.type === 'stat') return !!(b.title || b.text || (b.stats || []).some((x) => x && (x.value || x.label)));
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
      { type: 'hero', url: '/bergen-rooftops-email.jpg', alt: 'Bergen om sommeren' }, // JPEG: WebP vises ikke i Outlook
      { type: 'heading', text: '{{first_name}}, sommeren er høysesong for utleie i Bergen' },
      { type: 'text', text: 'Hei {{first_name}}!\n\nAkkurat nå flytter studenter, nyansatte og tilflyttere til byen — og leieprisene er på årets høyeste nivå. Har du en bolig som står tom, eller vurderer du utleie? Da er dette det beste tidspunktet på hele året.\n\nFor å gjøre valget enkelt har vi satt sammen et sommertilbud vi aldri har gitt før:' },
      { type: 'offer', eyebrow: 'Sommerkampanje · Begrenset periode', big: '10 %', was: 'Normalt 15 %', bigLabel: 'forvaltningshonorar — alt inkludert', second: '', items: [
        { title: 'Oppstartskostnad', was: '', now: '0 kr' },
        { title: 'Første visning', was: '625 kr', now: 'Gratis' },
        { title: 'Markedspakke', was: '2 490 kr', now: '1 245 kr (−50 %)' },
      ], deadline: 'Gjelder alle som registrerer seg innen 10. juli', label: 'Ja, jeg vil vite mer', url: 'https://digihome.no/sommer', footnote: 'Normalpriser inkl. mva. Uforpliktende — vi tar kontakt for en kort prat. Ett klikk, ingen skjema nå.' },
      { type: 'bullets', items: ['Annonsering, visninger og utvelgelse av leietaker', 'Kontrakt med BankID-signering og depositumskonto', 'All kommunikasjon med leietaker — hele leieforholdet', 'Husleie rett på konto — vi purrer om det trengs'] },
      { type: 'quote', text: 'DigiHome gjorde hele utleieprosessen helt sorgløs for oss. Alt bare fungerer.', author: 'Huseier i Bergen sentrum' },
      { type: 'sender', name: 'Sarah Sleeman', title: 'Daglig leder, DigiHome', note: 'Jeg svarer personlig på alle henvendelser fra denne kampanjen — du hører fra meg innen 24 timer.', photoUrl: '/sarah-sleeman.jpg' },
    ],
  },
  {
    key: 'boliger', label: 'Ledige boliger', desc: 'Premium boligutsendelse til leietakere — velg så mange boliger du ønsker',
    blocks: [
      { type: 'hero', url: '/email-hero.jpg', alt: 'Et lyst og moderne hjem fra DigiHome' },
      { type: 'heading', text: '{{first_name}}, her er boliger vi tror du vil like' },
      { type: 'text', text: 'Hei {{first_name}}!\n\nVi har samlet et utvalg boliger som er tilgjengelige nå. Se detaljene under og meld interesse på den boligen som passer deg — det tar bare noen sekunder.' },
      { type: 'properties', title: 'Ledige boliger akkurat nå', items: [], cta: '', url: '' },
      // Kartseksjonen ligger klar i malen, men vises ikke i e-posten før
      // redaktøren har limt inn kartlenken (f.eks. FINN sin kartvisning).
      { type: 'map', title: 'Se boligene på kart', text: 'Åpne kartvisningen for å se hvor boligene ligger — og hvor nær de er jobb, skole og bybanen.', url: '', label: 'Åpne kartvisningen', imageUrl: MAP_IMAGE, alt: 'Kart over Bergen', footnote: 'Kartet åpnes i nytt vindu.' },
      { type: 'cta-card', title: 'Fant du ikke den rette denne gangen?', text: 'Vi får jevnlig inn nye boliger. Hold profilen din oppdatert, så er det enklere for oss å finne en god match.', label: 'Oppdater leietakerprofilen', url: 'https://digihome.no/bli-leietaker', footnote: 'Du kan alltid melde deg av via lenken nederst i e-posten.' },
      { type: 'sender', name: 'Sarah Sleeman', title: 'Daglig leder, DigiHome', note: 'Har du spørsmål om en bolig, er det bare å svare på denne e-posten.', photoUrl: '/sarah-sleeman.jpg' },
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
