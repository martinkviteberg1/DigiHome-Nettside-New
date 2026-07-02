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

// Felles «Warm Ink Editorial»-ramme for e-poster (inline CSS = maks klientstøtte).
function shell({ title, bodyHtml, preheader = '' }) {
  return `<!DOCTYPE html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F5F1EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EC;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 8px 18px;">
          <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#0A0A0A;">Digi<span style="color:#9B5BD6;">Home</span></span>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:22px;padding:36px 32px;box-shadow:0 8px 30px rgba(10,10,10,0.06);">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:22px 8px 0;text-align:center;color:#8A8178;font-size:12px;line-height:1.7;">
          ${esc(site.legalName)} · Org.nr ${esc(site.orgNr)}<br>
          ${esc(site.address.street)}, ${esc(site.address.postal)} ${esc(site.address.city)} · <a href="tel:${esc(site.phoneHref)}" style="color:#8A8178;">${esc(site.phone)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// --- 1) Auto-kvittering til lead (huseier/investor) --------------------------
export async function sendLeadAutoReceipt(lead) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  if (!lead || !lead.email) return { ok: false, skipped: 'lead-mangler-epost' };
  const fn = firstName(lead.name);
  const addr = lead.address ? ` om <b>${esc(lead.address)}</b>` : '';
  const bodyHtml = `
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#9B5BD6;">Vi er i gang</p>
    <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15;letter-spacing:-0.8px;color:#0A0A0A;">Takk${fn ? ', ' + esc(fn) : ''}! Vi ser på boligen din nå.</h1>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#57504A;">
      Vi har mottatt henvendelsen din${addr}. En lokal forvalter i Bergen går gjennom detaljene,
      og du hører fra oss <b>umiddelbart</b> — som regel i løpet av minutter i åpningstiden.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      ${[
        ['1', 'Gratis vurdering', 'Vi analyserer boligen og markedet, og forteller deg hva den kan tjene.'],
        ['2', 'Vi klargjør og annonserer', 'Styling, foto og annonsering der leietakerne leter.'],
        ['3', 'Du mottar inntekten', 'Husleie, kontrakter og vedlikehold — vi håndterer alt.'],
      ].map(([n, t, d]) => `
      <tr><td style="padding:9px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td valign="top" style="width:40px;"><span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:9px;background:#0A0A0A;color:#fff;font-size:13px;font-weight:700;text-align:center;">${n}</span></td>
          <td><p style="margin:0;font-size:14.5px;font-weight:700;color:#0A0A0A;">${t}</p>
              <p style="margin:2px 0 0;font-size:13.5px;line-height:1.55;color:#57504A;">${d}</p></td>
        </tr></table>
      </td></tr>`).join('')}
    </table>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#57504A;">
      Haster det? Ring oss direkte på <a href="tel:${esc(site.phoneHref)}" style="color:#9B5BD6;font-weight:700;text-decoration:none;">${esc(site.phone)}</a>.
    </p>
    <p style="margin:18px 0 0;padding-top:18px;border-top:1px solid #EDE7DF;font-size:12.5px;color:#8A8178;">
      Helt uforpliktende · 0 kr oppstart · Ingen bindingstid
    </p>`;
  return sendHtmlEmail({
    to: lead.email,
    subject: 'Vi har mottatt henvendelsen din — svar kommer umiddelbart',
    html: shell({ title: 'DigiHome — kvittering', bodyHtml, preheader: 'En lokal forvalter ser på boligen din nå. Du hører fra oss umiddelbart.' }),
    fromName: 'DigiHome',
  });
}

// --- 2) Umiddelbar varsling til admin ---------------------------------------
export async function sendLeadAdminNotification(lead, { kind = 'huseier' } = {}) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  const to = leadNotifyRecipients();
  if (!to.length) return { ok: false, skipped: 'ingen-mottakere' };
  const att = lead.attribution || {};
  const rows = [
    ['Navn', lead.name], ['E-post', lead.email], ['Telefon', lead.phone],
    ['Adresse', [lead.address, lead.postal_code].filter(Boolean).join(', ')],
    ['Type', lead.lead_type || kind], ['Boligtype', lead.property_type],
    ['Soverom', lead.bedrooms], ['Areal', lead.sqm ? `${lead.sqm} m²` : ''],
    ['Ønsket område', lead.preferred_area],
    ['Kilde', lead.source], ['Kanal', lead.lead_source_type],
    ['Kampanje', [att.utm_source, att.utm_campaign].filter(Boolean).join(' / ')],
    ['Landingsside', att.landing_page], ['Notat', lead.notes],
  ].filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  const bodyHtml = `
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#18794E;">Nytt lead · svar umiddelbart</p>
    <h1 style="margin:10px 0 0;font-size:24px;line-height:1.15;letter-spacing:-0.6px;color:#0A0A0A;">${esc(lead.name || 'Ukjent navn')}</h1>
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
  return sendHtmlEmail({
    to,
    subject: `Nytt lead: ${lead.name || lead.email || lead.phone || 'ukjent'} (${lead.lead_type || kind})${att.utm_source ? ' · ' + att.utm_source : ''}`,
    html: shell({ title: 'Nytt lead', bodyHtml, preheader: `${lead.name || ''} · ${lead.address || lead.preferred_area || ''}` }),
    fromName: 'DigiHome Leads',
    replyTo: lead.email || undefined,
  });
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
