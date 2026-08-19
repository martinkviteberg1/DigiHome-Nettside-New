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

// ────────────────────────────────────────────────────────────────────────────
// Chat-varsel: nydelig, e-postsikker HTML. Tabellbasert med inline-stiler
// (Outlook/Gmail-trygt), varm off-white bakgrunn som matcher portalen,
// avsender-avatar, meldingsboble med uthevede @-tagger, trådkontekst,
// vedleggs-chips og tydelig CTA. Ingen sporing (sendes med personlig:true).
// ────────────────────────────────────────────────────────────────────────────
const EPOST_AVATAR_FARGER = ['#7c3aed', '#0a7d55', '#b45309', '#be185d', '#0e7490', '#4338ca', '#a16207', '#15803d'];

const eskaperHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const epostAvatarFarge = (navn) => {
  let h = 0;
  const s = String(navn || '?');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return EPOST_AVATAR_FARGER[h % EPOST_AVATAR_FARGER.length];
};

const epostInitialer = (navn) => String(navn || '?')
  .trim().split(/\s+/).slice(0, 2).map((d) => d[0] || '').join('').toUpperCase() || '?';

const epostFilStorrelse = (b) => {
  const n = Number(b) || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(n / 1024))} kB`;
};

export function byggChatEpost({
  avsenderNavn = 'Ukjent',
  tekst = '',
  mentions = [],
  vedlegg = [],
  bilder = [], // [{cid, name, hero}] — CID-innebygde bilder (forhåndsbeskåret server-side)
  flereBilder = 0, // antall bilder utover de som vises i galleriet
  erTraad = false,
  traadNavn = null,
  rotTekst = null,
  chatUrl = '',
  tidspunkt = new Date(),
} = {}) {
  const farge = epostAvatarFarge(avsenderNavn);
  const initialer = epostInitialer(avsenderNavn);
  const fornavn = String(avsenderNavn).trim().split(/\s+/)[0] || avsenderNavn;
  let klokkeslett = '';
  try {
    klokkeslett = new Date(tidspunkt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', weekday: 'long', hour: '2-digit', minute: '2-digit' });
    klokkeslett = klokkeslett.charAt(0).toUpperCase() + klokkeslett.slice(1);
  } catch (e) { klokkeslett = ''; }

  // Meldingskropp: escape først, deretter uthev @-tagger (lengste navn først
  // slik at «Martin Kviteberg» ikke delvis matches av «Martin»).
  let kropp = eskaperHtml(tekst).replace(/\n/g, '<br/>');
  const navnListe = (mentions || []).map((m) => m?.name).filter(Boolean).sort((a, b) => b.length - a.length);
  for (const navn of navnListe) {
    const moenster = eskaperHtml(navn).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    kropp = kropp.replace(
      new RegExp(`@${moenster}`, 'g'),
      `<span style="display:inline-block;background-color:#ede7fb;color:#5b21b6;font-weight:700;border-radius:6px;padding:0 6px;">@${eskaperHtml(navn)}</span>`,
    );
  }
  if (!kropp && ((bilder || []).length || (vedlegg || []).length)) {
    kropp = `<span style="color:#78716c;">Delte ${(bilder || []).length ? 'bilder' : 'vedlegg'} med deg</span>`;
  }

  // Skjult preheader: innboksens forhåndsvisningslinje viser selve meldingen
  const preheader = `${avsenderNavn}: ${String(tekst || (bilder || []).map((b) => b.name).join(', ') || (vedlegg || []).map((v) => v.name).join(', ')).slice(0, 130)}`;

  // BILDEGALLERI (CID-inline): 1 bilde = full bredde · oddetall = hero øverst
  // + par-rader under · partall = to-kolonners grid. Bildene er beskåret
  // server-side til like proporsjoner, så radene alltid ligger kant i kant.
  let galleriHtml = '';
  if ((bilder || []).length) {
    const alle = bilder.slice(0, 5);
    let deler = '';
    let rest = alle;
    if (alle.length === 1) {
      deler = `<img src="cid:${alle[0].cid}" alt="${eskaperHtml(alle[0].name)}" width="488" style="display:block;width:100%;max-width:488px;height:auto;border-radius:16px;border:0;" />`;
      rest = [];
    } else if (alle.length % 2 === 1) {
      deler = `<img src="cid:${alle[0].cid}" alt="${eskaperHtml(alle[0].name)}" width="488" style="display:block;width:100%;max-width:488px;height:auto;border-radius:16px;border:0;margin:0 0 8px;" />`;
      rest = alle.slice(1);
    }
    for (let i = 0; i + 1 < rest.length; i += 2) {
      deler += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="50%" valign="top" style="padding:0 4px 8px 0;"><img src="cid:${rest[i].cid}" alt="${eskaperHtml(rest[i].name)}" width="239" style="display:block;width:100%;height:auto;border-radius:14px;border:0;" /></td>
                <td width="50%" valign="top" style="padding:0 0 8px 4px;"><img src="cid:${rest[i + 1].cid}" alt="${eskaperHtml(rest[i + 1].name)}" width="239" style="display:block;width:100%;height:auto;border-radius:14px;border:0;" /></td>
              </tr></table>`;
    }
    galleriHtml = `
            <tr><td colspan="3" style="padding-top:14px;">
              ${deler}
              ${flereBilder > 0 ? `<p style="margin:2px 0 0;font-size:11.5px;color:#8b6bc7;font-weight:600;">+ ${flereBilder} ${flereBilder === 1 ? 'bilde' : 'bilder'} til — se alle i chatten</p>` : ''}
            </td></tr>`;
  }

  const vedleggHtml = (vedlegg || []).length ? `
            <tr><td colspan="3" style="padding-top:12px;">
              ${vedlegg.slice(0, 6).map((v) => `<span style="display:inline-block;background-color:#ffffff;border:1px solid #e9e5de;border-radius:10px;padding:7px 12px;font-size:12px;color:#44403c;margin:0 6px 6px 0;">📎&nbsp;<b>${eskaperHtml(v.name)}</b>&nbsp;<span style="color:#a6a19a;">${epostFilStorrelse(v.size)}</span></span>`).join('')}
            </td></tr>` : '';

  const traadHtml = erTraad ? `
            <tr><td colspan="3" style="padding-top:18px;">
              <p style="margin:0 0 7px;font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8b6bc7;">I tråden${traadNavn ? ` «${eskaperHtml(traadNavn)}»` : ''}</p>
              ${rotTekst ? `<p style="margin:0;padding:9px 13px;border-left:3px solid #dcd2f2;background-color:#faf9fd;border-radius:0 10px 10px 0;font-size:12.5px;line-height:1.5;color:#78716c;">${eskaperHtml(rotTekst)}${String(rotTekst).length >= 80 ? '…' : ''}</p>` : ''}
            </td></tr>` : '';

  const html = `<div style="background-color:#f4f2ee;padding:30px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#f4f2ee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${eskaperHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;">
      <tr><td style="padding:0 8px 14px;">
        <span style="font-size:13.5px;font-weight:800;letter-spacing:0.02em;color:#1c1917;">DigiHome<span style="color:#7c3aed;">.</span></span>
        <span style="font-size:11.5px;color:#a6a19a;">&nbsp;·&nbsp;Teamchat</span>
      </td></tr>
      <tr><td style="background-color:#ffffff;border-radius:20px;padding:24px 26px;box-shadow:0 1px 3px rgba(28,25,23,0.05),0 14px 44px -22px rgba(28,25,23,0.18);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td colspan="3" style="padding-bottom:16px;">
            <div style="width:42px;height:5px;border-radius:99px;background-color:#6d28d9;font-size:0;line-height:0;">&nbsp;</div>
          </td></tr>
          <tr>
            <td width="48" valign="top">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;border-radius:20px;background-color:${farge};color:#ffffff;font-size:14px;font-weight:800;">${initialer}</td>
              </tr></table>
            </td>
            <td valign="middle">
              <p style="margin:0;font-size:15px;line-height:1.35;color:#1c1917;"><b>${eskaperHtml(avsenderNavn)}</b> <span style="color:#8a857d;">nevnte deg${erTraad ? ' i en tråd' : ' i teamchatten'}</span></p>
              <p style="margin:3px 0 0;font-size:11.5px;color:#b3ada3;">${klokkeslett}</p>
            </td>
            <td valign="middle" align="right" style="padding-left:10px;white-space:nowrap;">
              <a href="${chatUrl}" style="display:inline-block;background-color:#f2edfc;color:#5b21b6;text-decoration:none;font-size:12px;font-weight:700;padding:9px 14px;border-radius:11px;white-space:nowrap;">${erTraad ? 'Åpne tråden' : 'Åpne chatten'}&nbsp;→</a>
            </td>
          </tr>
          ${traadHtml}
          <tr><td colspan="3" style="padding-top:14px;">
            <div style="background-color:#f5f1fc;border-radius:4px 18px 18px 18px;padding:15px 18px;font-size:15px;line-height:1.6;color:#292524;">${kropp}</div>
          </td></tr>
          ${galleriHtml}
          ${vedleggHtml}
          <tr><td colspan="3" style="padding-top:22px;">
            <a href="${chatUrl}" style="display:inline-block;background-color:#141414;color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:700;padding:13px 26px;border-radius:12px;">${erTraad ? 'Åpne tråden' : 'Åpne chatten'}&nbsp;&nbsp;→</a>
          </td></tr>
          <tr><td colspan="3" style="padding-top:14px;">
            <p style="margin:0;font-size:11.5px;color:#a6a19a;">Svar på e-posten — den går rett til ${eskaperHtml(fornavn)}.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 10px 0;">
        <p style="margin:0;font-size:10.5px;line-height:1.6;color:#b8b2a9;">Du får denne e-posten fordi du ble @tagget i DigiHome-teamchatten. Andre meldinger varsles kun i portalen.</p>
      </td></tr>
    </table>
  </td></tr></table>
</div>`;

  const text = `${avsenderNavn} nevnte deg${erTraad ? ` i tråden${traadNavn ? ` «${traadNavn}»` : ''}` : ' i teamchatten'}: ${tekst || [...(bilder || []).map((b) => b.name), ...(vedlegg || []).map((v) => v.name)].join(', ')}${chatUrl ? ` — Åpne: ${chatUrl}` : ''}`;
  return { html, text };
}

// Sender HTML-epost. Standard: individuell e-post per mottaker (personvern:
// mottakerne ser ikke hverandre). Med individual:false sendes ÉN e-post med
// alle i Til-feltet (brukes for interne team-varsler, f.eks. lead-varsling).
// headers: valgfrie ekstra-headere (f.eks. List-Unsubscribe for one-click
// avmelding — bedrer plassering i Gmail/Outlook og er påkrevd for bulk 2024+).
export async function sendHtmlEmail({ to, subject, html, text, fromName = 'DigiHome', replyTo, individual = true, headers, categories, sendAt, attachments, personlig = true } = {}) {
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
  // STANDARD: ingen sporing. SendGrids link-omskriving (url####.sendgrid.net)
  // og sporingspiksel er markedsføringssignaler som gjør at Outlook oftere
  // legger e-posten i «Annet» i stedet for «Prioritert» — og ser phishy ut i
  // signerings-/BankID-kontekst. All DigiHome-post er transaksjonell person-
  // til-person; vil en flyt ha klikkstatistikk, send personlig:false eksplisitt.
  if (personlig) {
    msg.trackingSettings = {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false },
      subscriptionTracking: { enable: false },
    };
  }
  if (Array.isArray(categories) && categories.length) msg.categories = categories.slice(0, 10);
  // Vedlegg: [{ content: base64, filename, type, disposition?, contentId? }]
  // disposition 'inline' + contentId brukes for bilder som vises i selve
  // e-posten (<img src="cid:...">) — e-postklient-trygt og uten offentlig URL.
  if (Array.isArray(attachments) && attachments.length) {
    msg.attachments = attachments
      .filter((a) => a && a.content && a.filename)
      .slice(0, 8)
      .map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.type || 'application/octet-stream',
        disposition: a.disposition === 'inline' ? 'inline' : 'attachment',
        ...(a.contentId ? { content_id: a.contentId } : {}),
      }));
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
