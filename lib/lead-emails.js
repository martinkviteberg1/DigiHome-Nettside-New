// ---------------------------------------------------------------------------
// Lead-e-poster (SendGrid): auto-kvittering til lead + umiddelbar varsling
// til admin. Innfrir «Svar umiddelbart»-løftet fra landingssidene.
// Alle kall er best-effort — de skal ALDRI velte selve lead-flyten.
// ---------------------------------------------------------------------------
import { sendHtmlEmail, emailConfigured } from '@/lib/email';
import { site } from '@/lib/site';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');

function leadNotifyRecipients() {
  const raw = process.env.LEAD_NOTIFY_RECIPIENTS || process.env.ADS_REPORT_RECIPIENTS || process.env.ADMIN_SEED_EMAIL || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const firstName = (name) => (String(name || '').trim().split(/\s+/)[0] || '').slice(0, 40);

// --- Attribusjons-hjelpere: gjør «paid» om til «Betalt annonse · Google Ads» ---
const SOURCE_TYPE_LABEL = {
  paid: 'Betalt annonse', paid_social: 'Betalt annonse (sosialt)', social: 'Sosialt',
  organic: 'Organisk søk', referral: 'Henvisning', email: 'E-post', direct: 'Direkte', manual: 'Manuell',
};
const RENTAL_LABEL = { dynamisk: 'Dynamisk', korttid: 'Korttid', kortid: 'Korttid', langtid: 'Langtid', hybrid: 'Hybrid' };

// Hvilken annonseplattform kom klikket fra? (gclid/gbraid/wbraid = Google Ads,
// msclkid = Microsoft, fbclid/source = Meta). Tom streng hvis ukjent.
function adPlatform(att = {}) {
  const src = String(att.source || '').toLowerCase();
  const med = String(att.medium || '').toLowerCase();
  if (att.gclid || att.gbraid || att.wbraid) return 'Google Ads';
  if (att.msclkid) return 'Microsoft Ads';
  const metaish = src.includes('facebook') || src.includes('instagram') || src === 'fb' || src === 'meta' || !!att.fbclid;
  if (metaish) return (att.is_paid || /paid|cpc|cpm/.test(med)) ? 'Meta Ads' : 'Facebook/Instagram';
  if (src.includes('google')) return 'Google (organisk)';
  if (src.includes('bing')) return 'Bing';
  return '';
}

function referrerHost(ref) {
  try { return new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
}

// Fjern auto-genererte segmenter fra Notat (de vises som egne rader i stedet):
// «Ønsket modell: …», «Matrikkel: …, Type: …, Hjemmelshaver: …», «Eiendom N: …».
function cleanNotesForDisplay(notes) {
  if (!notes) return '';
  let n = String(notes);
  n = n.replace(/(?:^|\.\s*)Ønsket modell:\s*[^.]+/g, '');
  n = n.replace(/(?:^|\.\s*)Matrikkel:\s*[^.]+/g, '');
  n = n.replace(/(?:^|\.\s*)Eiendom \d+:\s*[^.]+/g, '');
  return n.replace(/^[\s.]+/, '').replace(/\s{2,}/g, ' ').trim();
}

// Merkevarefonter (lastes via @font-face — Apple Mail/iOS viser dem, Gmail/Outlook
// faller pent tilbake til systemfont). Overskrifter: PP Right Grotesk · Brødtekst: ABC Diatype.
const HEAD_FF = "'PP Right Grotesk','Right Grotesk',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const BODY_FF = "'ABC Diatype','Diatype',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

// Felles «Warm Ink Editorial»-ramme for e-poster (inline CSS = maks klientstøtte).
// Logo som PNG fra mørk ink-variant (SVG blokkeres av Gmail/Outlook).
function shell({ title, bodyHtml, preheader = '' }) {
  const logoUrl = `${BASE_URL}/email-logo.png`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<style>
  @font-face { font-family: 'PP Right Grotesk'; src: url('${BASE_URL}/fonts/right-grotesk/PPRightGrotesk-Bold.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
  @font-face { font-family: 'PP Right Grotesk'; src: url('${BASE_URL}/fonts/right-grotesk/PPRightGrotesk-Regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: 'ABC Diatype'; src: url('${BASE_URL}/fonts/diatype/ABCDiatype-Regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: 'ABC Diatype'; src: url('${BASE_URL}/fonts/diatype/ABCDiatype-Medium.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
</style></head>
<body style="margin:0;padding:0;background:#F5F1EC;font-family:${BODY_FF};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EC;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 6px 22px;">
          <a href="${esc(BASE_URL)}" style="text-decoration:none;">
            <img src="${esc(logoUrl)}" alt="DigiHome" width="133" height="32" style="display:block;width:133px;height:32px;border:0;" />
          </a>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:24px;padding:42px 40px 38px;box-shadow:0 12px 40px rgba(10,10,10,0.07);">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:26px 10px 0;text-align:center;color:#8A8178;font-size:12px;line-height:1.9;font-family:${BODY_FF};">
          <a href="${esc(BASE_URL)}" style="color:#57504A;font-weight:600;text-decoration:none;">digihome.no</a>
          &nbsp;·&nbsp; <a href="tel:${esc(site.phoneHref)}" style="color:#57504A;font-weight:600;text-decoration:none;">${esc(site.phone)}</a>
          &nbsp;·&nbsp; <a href="${esc(BASE_URL)}/personvern" style="color:#8A8178;text-decoration:underline;">Personvern</a><br>
          ${esc(site.legalName)} · Org.nr ${esc(site.orgNr)} · ${esc(site.address.street)}, ${esc(site.address.postal)} ${esc(site.address.city)}<br>
          © ${year} DigiHome
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// --- 1) Auto-kvittering til lead (huseier/investor) --------------------------
// Signert Sarah (daglig leder) med personlig kort. Bygger emne+HTML
// (gjenbrukes av forhåndsvisning i admin).
export function buildLeadReceipt(lead = {}) {
  const fn = firstName(lead.name);
  const addr = lead.address ? ` om <b style="color:#0A0A0A;">${esc(lead.address)}</b>` : '';
  const bodyHtml = `
    <p style="margin:0;font-size:11.5px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#9B5BD6;font-family:${BODY_FF};">Vi er i gang</p>
    <h1 style="margin:12px 0 0;font-size:30px;line-height:1.12;letter-spacing:-0.9px;color:#0A0A0A;font-family:${HEAD_FF};font-weight:700;">Takk${fn ? ', ' + esc(fn) : ''} — vi ser på boligen din nå.</h1>
    <p style="margin:18px 0 0;font-size:15.5px;line-height:1.7;color:#57504A;font-family:${BODY_FF};">
      Vi har mottatt henvendelsen din${addr}. Jeg går gjennom detaljene sammen med teamet vårt i Bergen,
      og tar kontakt for en uforpliktende prat — <b style="color:#0A0A0A;">som regel i løpet av dagen</b>, og senest neste virkedag.
    </p>

    <!-- Sarah-kort -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;background:#F7F2EB;border-radius:18px;">
      <tr>
        <td valign="top" style="padding:22px 0 22px 22px;width:92px;">
          <img src="${BASE_URL}/team-sarah.jpg" alt="Sarah Sleeman" width="80" height="80" style="display:block;width:80px;height:80px;border-radius:16px;border:0;object-fit:cover;" />
        </td>
        <td valign="top" style="padding:22px 22px 22px 18px;">
          <p style="margin:0;font-size:14.5px;line-height:1.6;color:#57504A;font-style:italic;font-family:${BODY_FF};">«Jeg går personlig gjennom henvendelsen din — snakkes snart!»</p>
          <p style="margin:12px 0 0;font-size:15.5px;font-weight:700;color:#0A0A0A;font-family:${HEAD_FF};">Sarah Sleeman</p>
          <p style="margin:2px 0 0;font-size:12.5px;color:#8A8178;font-family:${BODY_FF};">Daglig leder, DigiHome</p>
          <p style="margin:10px 0 0;font-size:13px;font-family:${BODY_FF};">
            <a href="tel:${esc(site.phoneHref)}" style="color:#9B5BD6;font-weight:600;text-decoration:none;">${esc(site.phone)}</a>
            <span style="color:#C9BFB4;">&nbsp;·&nbsp;</span>
            <a href="mailto:sarah@digihome.no" style="color:#9B5BD6;font-weight:600;text-decoration:none;">sarah@digihome.no</a>
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:30px 0 0;font-size:11.5px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#B4AB9F;font-family:${BODY_FF};">Slik fungerer det</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0;">
      ${[
        ['1', 'Gratis vurdering', 'Vi analyserer boligen og markedet, og forteller deg hva den kan tjene.'],
        ['2', 'Vi klargjør og annonserer', 'Styling, foto og annonsering der leietakerne leter.'],
        ['3', 'Du mottar inntekten', 'Husleie, kontrakter og vedlikehold — vi håndterer alt.'],
      ].map(([n, t, d]) => `
      <tr><td style="padding:10px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td valign="top" style="width:42px;"><span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:10px;background:#0A0A0A;color:#fff;font-size:13px;font-weight:700;text-align:center;font-family:${HEAD_FF};">${n}</span></td>
          <td><p style="margin:0;font-size:15px;font-weight:700;color:#0A0A0A;font-family:${HEAD_FF};">${t}</p>
              <p style="margin:3px 0 0;font-size:13.5px;line-height:1.6;color:#57504A;font-family:${BODY_FF};">${d}</p></td>
        </tr></table>
      </td></tr>`).join('')}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr>
      <td style="padding-right:10px;"><a href="${esc(BASE_URL)}/bli-utleier" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Se hvordan det fungerer</a></td>
      <td><a href="tel:${esc(site.phoneHref)}" style="display:inline-block;background:#F0EAE2;color:#0A0A0A;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Ring oss</a></td>
    </tr></table>

    <p style="margin:26px 0 0;padding-top:20px;border-top:1px solid #EDE7DF;font-size:12.5px;color:#8A8178;font-family:${BODY_FF};">
      Helt uforpliktende · 0 kr oppstart · Ingen bindingstid
    </p>`;
  const preheader = 'Takk! Jeg går gjennom detaljene og tar kontakt — som regel i løpet av dagen. — Sarah';
  return {
    subject: 'Vi har mottatt henvendelsen din — jeg tar kontakt i løpet av dagen',
    html: shell({ title: 'DigiHome — kvittering', bodyHtml, preheader }),
  };
}

export async function sendLeadAutoReceipt(lead) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  if (!lead || !lead.email) return { ok: false, skipped: 'lead-mangler-epost' };
  const { subject, html } = buildLeadReceipt(lead);
  // Avsender «Sarah i DigiHome» — svar går rett til daglig leder.
  return sendHtmlEmail({ to: lead.email, subject, html, fromName: 'Sarah i DigiHome', replyTo: 'sarah@digihome.no' });
}

// --- 2) Umiddelbar varsling til admin ---------------------------------------
// Bygger emne+HTML (gjenbrukes av forhåndsvisning i admin).
export function buildLeadAdminNotification(lead = {}, { kind = 'huseier' } = {}) {
  const att = lead.attribution || {};
  const platform = adPlatform(att);
  const typeLabel = SOURCE_TYPE_LABEL[lead.lead_source_type] || lead.lead_source_type || '';
  const rentalRaw = (lead.units && lead.units[0] && lead.units[0].rental_model) || lead.rental_model || '';
  const matrikkel = [lead.matrikkel_number, lead.seksjonsnr ? `seksjon ${lead.seksjonsnr}` : '', lead.andelsnr ? `andel ${lead.andelsnr}` : ''].filter(Boolean).join(' · ');
  const hjemmelshaver = [lead.registry_owner_name, lead.registry_orgnr ? `org.nr ${lead.registry_orgnr}` : ''].filter(Boolean).join(' · ');
  const clickIds = [
    att.gclid ? `gclid: ${String(att.gclid).slice(0, 24)}…` : '',
    (att.gbraid || att.wbraid) ? `braid: ${String(att.gbraid || att.wbraid).slice(0, 18)}…` : '',
    att.fbclid ? `fbclid: ${String(att.fbclid).slice(0, 24)}…` : '',
  ].filter(Boolean).join(' · ');
  const refHost = (lead.lead_source_type === 'referral' || att.channel === 'Henvisning') ? referrerHost(att.referrer) : '';
  const rows = [
    ['Navn', lead.name], ['E-post', lead.email], ['Telefon', lead.phone],
    ['Adresse', [lead.address, lead.postal_code].filter(Boolean).join(', ')],
    ['Type', lead.lead_type || kind], ['Boligtype', lead.property_type],
    ['Soverom', lead.bedrooms], ['Areal', lead.sqm ? `${lead.sqm} m²` : ''],
    ['Ønsket modell', RENTAL_LABEL[rentalRaw] || rentalRaw],
    ['Matrikkel', matrikkel], ['Bygningstype', lead.bygningstype], ['Hjemmelshaver', hjemmelshaver],
    ['Ønsket område', lead.preferred_area],
    ['Kilde', lead.source],
    ['Kanal', platform ? `${typeLabel} · ${platform}` : typeLabel],
    ['Kampanje', att.campaign], ['Annonse', att.content], ['Søkeord', att.term],
    ['Henvist fra', refHost],
    ['Klikk-ID', clickIds],
    ['Landingsside', att.landing_page], ['Notat', cleanNotesForDisplay(lead.notes)],
  ].filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  const bodyHtml = `
    <p style="margin:0;font-size:11.5px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#18794E;font-family:${BODY_FF};">Nytt lead · svar umiddelbart</p>
    <h1 style="margin:10px 0 0;font-size:24px;line-height:1.15;letter-spacing:-0.6px;color:#0A0A0A;font-family:${HEAD_FF};font-weight:700;">${esc(lead.name || 'Ukjent navn')}</h1>
    <p style="margin:6px 0 0;font-size:13.5px;color:#8A8178;">Mottatt ${new Date(lead.createdAt || Date.now()).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })} · ${esc(lead.source || '')}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-top:1px solid #EDE7DF;">
      ${rows.map(([k, v]) => `
      <tr>
        <td style="padding:8px 12px 8px 0;font-size:12.5px;color:#8A8178;white-space:nowrap;vertical-align:top;border-bottom:1px solid #F3EEE8;">${esc(k)}</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;color:#0A0A0A;border-bottom:1px solid #F3EEE8;">${esc(v)}</td>
      </tr>`).join('')}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;"><tr>
      ${lead.phone ? `<td style="padding-right:10px;"><a href="tel:${esc(String(lead.phone).replace(/\s/g, ''))}" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none;">Ring ${esc(firstName(lead.name) || 'lead')} nå</a></td>` : ''}
      <td><a href="${esc(BASE_URL)}/admin" style="display:inline-block;background:#F0EAE2;color:#0A0A0A;font-size:14px;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none;">Åpne admin</a></td>
    </tr></table>
    ${lead.email ? `<p style="margin:16px 0 0;font-size:12.5px;color:#8A8178;">Svar på denne e-posten for å svare ${esc(firstName(lead.name) || 'leadet')} direkte.</p>` : ''}`;
  return {
    subject: `Nytt lead: ${lead.name || lead.email || lead.phone || 'ukjent'} (${lead.lead_type || kind})${platform ? ' · ' + platform : (typeLabel ? ' · ' + typeLabel : '')}`,
    html: shell({ title: 'Nytt lead', bodyHtml, preheader: `${lead.name || ''} · ${lead.address || lead.preferred_area || ''}` }),
    replyTo: lead.email || undefined,
  };
}

export async function sendLeadAdminNotification(lead, { kind = 'huseier' } = {}) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  const to = leadNotifyRecipients();
  if (!to.length) return { ok: false, skipped: 'ingen-mottakere' };
  const { subject, html, replyTo } = buildLeadAdminNotification(lead, { kind });
  // individual:false → ÉN e-post med hele teamet i Til-feltet (kan svare-alle).
  return sendHtmlEmail({ to, subject, html, fromName: 'DigiHome Leads', replyTo, individual: false });
}

// --- Samlet fyring (non-fatal) — returnerer status for lagring på lead-dok. --
export async function fireLeadEmails(lead, { kind = 'huseier', receipt = true } = {}) {
  const out = { receipt: null, adminNotify: null };
  if (!emailConfigured()) return out;
  const tasks = [];
  if (receipt && lead.email) {
    tasks.push(sendLeadAutoReceipt(lead)
      .then((r) => { out.receipt = { ok: !!r.ok, at: new Date().toISOString(), skipped: r.skipped || null }; })
      .catch((e) => { out.receipt = { ok: false, at: new Date().toISOString(), error: String(e.message || e).slice(0, 300) }; }));
  }
  tasks.push(sendLeadAdminNotification(lead, { kind })
    .then((r) => { out.adminNotify = { ok: !!r.ok, at: new Date().toISOString(), skipped: r.skipped || null }; })
    .catch((e) => { out.adminNotify = { ok: false, at: new Date().toISOString(), error: String(e.message || e).slice(0, 300) }; }));
  await Promise.allSettled(tasks);
  return out;
}
