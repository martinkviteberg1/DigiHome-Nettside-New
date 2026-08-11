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

// Reserverte testdomener (RFC 2606/6761) kan aldri motta e-post. Slipper vi dem
// gjennom til SendGrid får vi garantert bounce, og bounce-raten er det Gmail og
// Outlook måler avsenderomdømmet vårt på. QA-prober og demo-data skal ikke
// kunne skade leveringsevnen til ekte nyhetsbrev.
const TEST_DOMAIN = /@(?:example\.(?:com|net|org)|test|invalid|localhost|localdomain|digihome\.test)$/i;
export function isUndeliverableTestAddress(addr) {
  return TEST_DOMAIN.test(String(addr || '').trim());
}

export function reportRecipients() {
  return (process.env.ADS_REPORT_RECIPIENTS || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Sender HTML-epost. Standard: individuell e-post per mottaker (personvern:
// mottakerne ser ikke hverandre). Med individual:false sendes ÉN e-post med
// alle i Til-feltet (brukes for interne team-varsler, f.eks. lead-varsling).
// headers: valgfrie ekstra-headere (f.eks. List-Unsubscribe for one-click
// avmelding — bedrer plassering i Gmail/Outlook og er påkrevd for bulk 2024+).
export async function sendHtmlEmail({ to, subject, html, text, fromName = 'DigiHome', replyTo, individual = true, headers, categories, sendAt, attachments } = {}) {
  ensureInit();
  const asked = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const recipients = asked.filter((a) => !isUndeliverableTestAddress(a));
  if (!recipients.length) {
    if (asked.length) return { ok: false, skipped: 'test-mottaker', recipients: [] };
    throw new Error('Ingen mottakere');
  }
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
  // Vedlegg (f.eks. PDF-møteprotokoll): [{ content: base64, filename, type }]
  if (Array.isArray(attachments) && attachments.length) {
    msg.attachments = attachments
      .filter((a) => a && a.content && a.filename)
      .slice(0, 5)
      .map((a) => ({ content: a.content, filename: a.filename, type: a.type || 'application/octet-stream', disposition: 'attachment' }));
  }
  if (Number.isFinite(Number(sendAt)) && Number(sendAt) > Math.floor(Date.now() / 1000)) msg.sendAt = Math.floor(Number(sendAt));
  try {
    // send() = én e-post med alle i Til-feltet · sendMultiple() = én per mottaker
    const out = individual ? await sgMail.sendMultiple(msg) : await sgMail.send(msg);
    const statusCode = Array.isArray(out) && out[0] ? out[0].statusCode : 202;
    // Forbrukstelling (estimat) — fire-and-forget, feiler stille.
    import('@/lib/mongodb')
      .then(({ getDb }) => getDb())
      .then((db) => import('@/lib/ext-usage').then(({ logExtUsage }) => logExtUsage(db, 'sendgrid', recipients.length)))
      .catch(() => {});
    return { ok: true, statusCode, recipients };
  } catch (e) {
    const body = e && e.response && e.response.body;
    throw new Error((body && JSON.stringify(body)) || e.message);
  }
}
