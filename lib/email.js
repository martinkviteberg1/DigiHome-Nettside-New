// SendGrid-klient (server-side). Bruker SENDGRID_API_KEY + SENDGRID_FROM_EMAIL.
import sgMail from '@sendgrid/mail';

const API_KEY = (process.env.SENDGRID_API_KEY || '').trim();
const FROM_EMAIL = (process.env.SENDGRID_FROM_EMAIL || 'hei@digihome.no').trim();
let inited = false;

function ensureInit() {
  if (!API_KEY) throw new Error('SENDGRID_API_KEY mangler i miljøet');
  if (!inited) { sgMail.setApiKey(API_KEY); inited = true; }
}

export function emailConfigured() { return !!API_KEY; }

export function reportRecipients() {
  return (process.env.ADS_REPORT_RECIPIENTS || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Sender HTML-epost. Standard: individuell e-post per mottaker (personvern:
// mottakerne ser ikke hverandre). Med individual:false sendes ÉN e-post med
// alle i Til-feltet (brukes for interne team-varsler, f.eks. lead-varsling).
// headers: valgfrie ekstra-headere (f.eks. List-Unsubscribe for one-click
// avmelding — bedrer plassering i Gmail/Outlook og er påkrevd for bulk 2024+).
export async function sendHtmlEmail({ to, subject, html, text, fromName = 'DigiHome', replyTo, individual = true, headers, categories } = {}) {
  ensureInit();
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) throw new Error('Ingen mottakere');
  const fallback = (text || String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 5000);
  const msg = {
    to: recipients,
    from: { email: FROM_EMAIL, name: fromName },
    subject: subject || 'DigiHome-rapport',
    text: fallback,
    html: html || '',
  };
  if (replyTo) msg.replyTo = replyTo;
  if (headers && typeof headers === 'object') msg.headers = headers;
  if (Array.isArray(categories) && categories.length) msg.categories = categories.slice(0, 10);
  try {
    // send() = én e-post med alle i Til-feltet · sendMultiple() = én per mottaker
    const out = individual ? await sgMail.sendMultiple(msg) : await sgMail.send(msg);
    const statusCode = Array.isArray(out) && out[0] ? out[0].statusCode : 202;
    return { ok: true, statusCode, recipients };
  } catch (e) {
    const body = e && e.response && e.response.body;
    throw new Error((body && JSON.stringify(body)) || e.message);
  }
}
