// ---------------------------------------------------------------------------
// Lead-e-poster (SendGrid): auto-kvittering til lead + umiddelbar varsling
// til admin. Innfrir «Svar umiddelbart»-løftet fra landingssidene.
// Alle kall er best-effort — de skal ALDRI velte selve lead-flyten.
// ---------------------------------------------------------------------------
import { sendHtmlEmail, emailConfigured, isUndeliverableTestAddress } from '@/lib/email';
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
// To-nivå-modellen: menneskelige etiketter for valgt spor. Full forvaltning
// kommuniserer ALDRI pris — kun «tilbud».
const TIER_LABEL = { selvforvaltning: 'Selvforvaltning (5 %)', full_forvaltning: 'Full forvaltning (tilbud)' };

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

// E-postklienter (Outlook, Gmail m.fl.) håndterer webfonts dårlig — @font-face
// ga uskarp/rar fallback-rendering. Ren systemstack = skarpt og lesbart overalt.
const HEAD_FF = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BODY_FF = HEAD_FF;

// Visningshjelpere: skjemaverdier lagres i små bokstaver («leilighet»),
// grunnboken roper i CAPS («LILLENG ANITA») — begge normaliseres pent.
const cap = (s) => { const t = String(s == null ? '' : s).trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };
const titleCase = (s) => String(s == null ? '' : s).trim().toLowerCase()
  .replace(/(^|[\s\-'])([a-zæøåäöü])/g, (m, pre, ch) => pre + ch.toUpperCase())
  // Selskapsformer skal forbli i versaler («Eksempel Eiendom AS», ikke «As»).
  .replace(/\b(As|Asa|Da|Ans|Sa|Ba|Kf|Iks|Nuf)\b/g, (m) => m.toUpperCase());

// Felles «Warm Ink Editorial»-ramme for e-poster (inline CSS = maks klientstøtte).
// Logo serveres via /api/media/... — /public følger IKKE med standalone-bygget
// i produksjon, så direkte public-stier ga 404 i e-postklienten.
function shell({ title, bodyHtml, preheader = '' }) {
  const logoUrl = `${BASE_URL}/api/media/email-logo.png`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<style>
  @media only screen and (max-width:600px) {
    .dh-outer { padding: 20px 10px !important; }
    .dh-pad { padding: 26px 20px 30px !important; }
    .dh-h1 { font-size: 24px !important; letter-spacing: -0.5px !important; }
    .dh-btns td { display: block !important; padding: 0 0 10px 0 !important; }
    .dh-btns a { display: block !important; text-align: center !important; }
    .dh-photo-cell { width: 84px !important; padding: 18px 0 18px 18px !important; }
    .dh-photo { width: 68px !important; height: 68px !important; }
    .dh-card-text { padding: 18px 18px 18px 14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F1EC;font-family:${BODY_FF};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dh-outer" style="background:#F5F1EC;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 6px 22px;">
          <a href="${esc(BASE_URL)}" style="text-decoration:none;">
            <img src="${esc(logoUrl)}" alt="DigiHome" width="133" height="32" style="display:block;width:133px;height:32px;border:0;" />
          </a>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:24px;box-shadow:0 12px 40px rgba(10,10,10,0.07);">
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
  const boligMeta = [
    lead.bedrooms != null ? `${lead.bedrooms} soverom` : '',
    lead.sqm ? `${lead.sqm} m²` : '',
    cap(lead.property_type),
  ].filter(Boolean).join(' · ');
  // To-nivå-modellen: kvitteringen speiler valgt spor. Selvforvaltning =
  // avtale + konto-oppsett. Full forvaltning = tilbud (ALDRI pris i teksten).
  const isSelf = lead.tier === 'selvforvaltning';
  const isFull = lead.tier === 'full_forvaltning';
  // Provisjonert automatisk (14/7): kontoen finnes allerede når kvitteringen
  // sendes — kunden fikk engangs-innlogging på suksess-skjermen + velkomst-
  // e-post m/ varig magic-link fra plattformen.
  const hasAccount = isSelf && lead.platform_account && lead.platform_account.onboarding_url;
  const eyebrow = isSelf ? 'Avtale registrert' : isFull ? 'Tilbud på vei' : 'Vi er i gang';
  const heading = isSelf
    ? `Velkommen${fn ? ', ' + esc(fn) : ''} — avtalen din er registrert.`
    : isFull
      ? `Takk${fn ? ', ' + esc(fn) : ''} — vi lager et tilbud til deg.`
      : `Takk${fn ? ', ' + esc(fn) : ''} — vi ser på boligen din nå.`;
  const introHtml = isSelf
    ? `Du har valgt <b style="color:#0A0A0A;">selvforvaltning — 5&nbsp;% per utleieforhold</b>, uten faste kostnader eller bindingstid.
        ${hasAccount
          ? `<b style="color:#0A0A0A;">Kontoen din er allerede klar</b> — du har fått en egen velkomst-e-post med innloggingslenke til plattformen.`
          : `Vi setter opp kontoen din nå og sender deg tilgang på e-post — <b style="color:#0A0A0A;">som regel i løpet av dagen</b>.`}`
    : isFull
      ? `Du har valgt <b style="color:#0A0A0A;">full forvaltning</b>. Jeg går gjennom boligen sammen med teamet vårt i Bergen,
        og kontakter deg med et <b style="color:#0A0A0A;">skreddersydd, uforpliktende tilbud</b> — som regel i løpet av dagen.`
      : `Jeg går gjennom detaljene sammen med teamet vårt i Bergen, og tar kontakt for en uforpliktende prat
        — <b style="color:#0A0A0A;">som regel i løpet av dagen</b>, og senest neste virkedag.`;
  const steps = isSelf
    ? [
        hasAccount
          ? ['1', 'Kontoen din er klar', 'Logg inn via velkomst-e-posten — alt klart til utleie.']
          : ['1', 'Vi setter opp kontoen din', 'Du får e-post med tilgang til plattformen — alt klart til utleie.'],
        ['2', 'Publiser boligen', 'Annonsering på Finn.no, digitale kontrakter og signering.'],
        ['3', 'Lei ut — vi tar 5 %', 'Automatisk husleie og oppgjør. Ingen faste kostnader.'],
      ]
    : isFull
      ? [
          ['1', 'Gratis vurdering', 'Vi analyserer boligen og markedet, og forteller deg hva den kan tjene.'],
          ['2', 'Skreddersydd tilbud', 'En lokal rådgiver ringer deg med et konkret, uforpliktende tilbud.'],
          ['3', 'Vi tar oss av alt', 'Annonsering, leietakere, oppfølging — du mottar bare inntekten.'],
        ]
      : [
          ['1', 'Gratis vurdering', 'Vi analyserer boligen og markedet, og forteller deg hva den kan tjene.'],
          ['2', 'Vi klargjør og annonserer', 'Styling, foto og annonsering der leietakerne leter.'],
          ['3', 'Du mottar inntekten', 'Husleie, kontrakter og vedlikehold — vi håndterer alt.'],
        ];
  // Klikk-aksept-kvittering (kun selvforvaltning) — tidsstempel for integritet.
  const termsHtml = isSelf && lead.terms_accepted && lead.terms_accepted.at
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;background:#EAF7EF;border-radius:14px;">
        <tr><td style="padding:13px 18px;font-size:13px;color:#1F7A4D;font-family:${BODY_FF};">
          &#10003;&nbsp; Avtale om selvforvaltning godtatt digitalt — ${esc(new Date(lead.terms_accepted.at).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', dateStyle: 'long', timeStyle: 'short' }))}
        </td></tr>
      </table>` : '';
  const bodyHtml = `
    <img src="${BASE_URL}/api/media/email-hero.jpg" alt="" width="560" style="display:block;width:100%;height:auto;border:0;border-radius:24px 24px 0 0;" />
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="dh-pad" style="padding:36px 40px 40px;">

      <p style="margin:0;font-size:11px;font-weight:500;letter-spacing:2.4px;text-transform:uppercase;color:#9B5BD6;font-family:${BODY_FF};">${eyebrow}</p>
      <h1 class="dh-h1" style="margin:12px 0 0;font-size:31px;line-height:1.1;letter-spacing:-1px;color:#0A0A0A;font-family:${HEAD_FF};font-weight:700;">${heading}</h1>
      <p style="margin:18px 0 0;font-size:15.5px;line-height:1.7;color:#57504A;font-family:${BODY_FF};">
        ${introHtml}
      </p>

      ${lead.address ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:#F7F2EB;border-radius:16px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:10.5px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#B4AB9F;font-family:${BODY_FF};">Din bolig</p>
          <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#0A0A0A;font-family:${HEAD_FF};">${esc(lead.address)}${lead.postal_code ? ', ' + esc(lead.postal_code) : ''}</p>
          ${boligMeta ? `<p style="margin:3px 0 0;font-size:12.5px;color:#8A8178;font-family:${BODY_FF};">${esc(boligMeta)}</p>` : ''}
        </td></tr>
      </table>` : ''}
      ${termsHtml}

      <!-- Sarah-kort -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;background:#FBF7F1;border-radius:18px;">
        <tr>
          <td valign="middle" class="dh-photo-cell" style="padding:24px 0 24px 24px;width:104px;">
            <img src="${BASE_URL}/api/media/team-sarah.jpg" alt="Sarah Sleeman" width="88" height="88" class="dh-photo" style="display:block;width:88px;height:88px;border-radius:20px;border:0;" />
          </td>
          <td valign="middle" class="dh-card-text" style="padding:24px 24px 24px 18px;">
            <p style="margin:0;font-size:14.5px;line-height:1.65;color:#57504A;font-style:italic;font-family:${BODY_FF};">«Jeg går personlig gjennom henvendelsen din — snakkes snart!»</p>
            <p style="margin:14px 0 0;font-size:16px;font-weight:700;color:#0A0A0A;font-family:${HEAD_FF};">Sarah Sleeman</p>
            <p style="margin:2px 0 0;font-size:12.5px;color:#8A8178;font-family:${BODY_FF};">Daglig leder, DigiHome</p>
            <p style="margin:11px 0 0;font-size:13px;font-family:${BODY_FF};">
              <a href="tel:${esc(site.phoneHref)}" style="color:#9B5BD6;font-weight:600;text-decoration:none;">${esc(site.phone)}</a>
              <span style="color:#D8CFC3;">&nbsp;·&nbsp;</span>
              <a href="mailto:sarah@digihome.no" style="color:#9B5BD6;font-weight:600;text-decoration:none;">sarah@digihome.no</a>
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:34px 0 0;font-size:11px;font-weight:500;letter-spacing:2.4px;text-transform:uppercase;color:#B4AB9F;font-family:${BODY_FF};">Slik fungerer det</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 0;">
        ${steps.map(([n, t, d]) => `
        <tr><td style="padding:11px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" style="width:46px;"><span style="display:inline-block;width:30px;height:30px;line-height:30px;border-radius:999px;background:#F1E8FD;color:#7A3EC8;font-size:13.5px;font-weight:700;text-align:center;font-family:${HEAD_FF};">${n}</span></td>
            <td><p style="margin:0;font-size:15px;font-weight:700;color:#0A0A0A;font-family:${HEAD_FF};">${t}</p>
                <p style="margin:3px 0 0;font-size:13.5px;line-height:1.6;color:#57504A;font-family:${BODY_FF};">${d}</p></td>
          </tr></table>
        </td></tr>`).join('')}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dh-btns" style="margin:30px 0 0;"><tr>
        <td style="padding-right:10px;"><a href="${esc(BASE_URL)}/bli-utleier" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Se hvordan det fungerer&nbsp;&nbsp;&rarr;</a></td>
        <td><a href="tel:${esc(site.phoneHref)}" style="display:inline-block;background:#F0EAE2;color:#0A0A0A;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Ring Sarah</a></td>
      </tr></table>

      <p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #EDE7DF;font-size:12.5px;color:#A79D91;text-align:center;font-family:${BODY_FF};">
        Helt uforpliktende&nbsp;&nbsp;·&nbsp;&nbsp;0 kr oppstart&nbsp;&nbsp;·&nbsp;&nbsp;Ingen bindingstid&nbsp;&nbsp;·&nbsp;&nbsp;Lokalt team i Bergen
      </p>

    </td></tr></table>`;
  const preheader = isSelf
    ? 'Selvforvaltning registrert — du får tilgang på e-post. — Sarah'
    : isFull
      ? 'Takk! Vi kontakter deg med et uforpliktende tilbud — som regel i løpet av dagen. — Sarah'
      : 'Takk! Jeg går gjennom detaljene og tar kontakt — som regel i løpet av dagen. — Sarah';
  const subject = isSelf
    ? 'Avtalen din er registrert — vi setter opp kontoen din'
    : isFull
      ? 'Vi lager et skreddersydd tilbud til deg — helt uforpliktende'
      : 'Vi har mottatt henvendelsen din — jeg tar kontakt i løpet av dagen';
  return {
    subject,
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
  const hjemmelshaver = [titleCase(lead.registry_owner_name), lead.registry_orgnr ? `org.nr ${lead.registry_orgnr}` : ''].filter(Boolean).join(' · ');
  const refHost = (lead.lead_source_type === 'referral' || att.channel === 'Henvisning') ? referrerHost(att.referrer) : '';
  // Landingsside som klikkbar lenke til selve siden (full URL).
  const lpPath = String(att.landing_page || '').trim();
  const lpUrl = lpPath ? (lpPath.startsWith('http') ? lpPath : `${BASE_URL}${lpPath.startsWith('/') ? '' : '/'}${lpPath}`) : '';
  const lpHtml = lpUrl ? `<a href="${esc(lpUrl)}" style="color:#7A3EC8;font-weight:600;text-decoration:underline;">${esc(lpPath === '/' ? 'Forsiden' : lpPath)}</a>` : '';
  // FINN-kode skal aldri presenteres som gateadresse. Eldre klienter kunne sende
  // bare koden i address-feltet; e-posten normaliserer også disse defensivt.
  const rawAddress = String(lead.address || '').trim();
  const addressFinnCode = (/^(\d{8,10})$/.exec(rawAddress) || [])[1] || '';
  const finnUrl = String(lead.finn_url || (addressFinnCode ? `https://www.finn.no/${addressFinnCode}` : '')).trim();
  const finnCode = addressFinnCode || ((finnUrl.match(/(?:finnkode=|finn\.no\/)(\d{8,10})/i) || [])[1] || '');
  const finnHtml = /^https:\/\/(?:www\.)?finn\.no\//i.test(finnUrl)
    ? `<a href="${esc(finnUrl)}" style="color:#0063C6;font-weight:600;text-decoration:underline;">Åpne FINN-annonsen${finnCode ? ` (${esc(finnCode)})` : ''}</a>`
    : '';
  const addressDisplay = addressFinnCode ? '' : (rawAddress
    ? (lead.postal_code && !rawAddress.includes(String(lead.postal_code)) ? `${rawAddress}, ${lead.postal_code}` : rawAddress)
    : '');
  const locationDisplay = !addressDisplay ? [lead.postal_code, lead.city].filter(Boolean).join(' ') : '';

  // rowHtml: tredje element `raw=true` betyr at verdien allerede er trygg HTML.
  const rowHtml = ([k, v, raw]) => `
      <tr>
        <td style="padding:9px 14px 9px 0;font-size:12.5px;color:#8A8178;white-space:nowrap;vertical-align:top;border-bottom:1px solid #F3EEE8;width:130px;font-family:${BODY_FF};">${esc(k)}</td>
        <td style="padding:9px 0;font-size:14px;font-weight:600;color:#0A0A0A;border-bottom:1px solid #F3EEE8;font-family:${BODY_FF};">${raw ? v : esc(v)}</td>
      </tr>`;
  const section = (label, pairs) => {
    const rows = pairs.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!rows.length) return '';
    return `
      <p style="margin:26px 0 0;font-size:10.5px;font-weight:500;letter-spacing:2.2px;text-transform:uppercase;color:#B4AB9F;font-family:${BODY_FF};">${esc(label)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0;">${rows.map(rowHtml).join('')}</table>`;
  };
  const pill = (text, bg, color) => `<span style="display:inline-block;background:${bg};color:${color};font-size:12px;font-weight:600;padding:6px 13px;border-radius:999px;font-family:${BODY_FF};">${esc(text)}</span>`;

  const notat = cleanNotesForDisplay(lead.notes);
  // Selvbetjent løp: avtale allerede akseptert → dette er en NY KUNDE, ikke et
  // lead som skal ringes. Egen eyebrow/emne + infoboks i stedet for hast-CTA.
  const selfService = lead.self_service === true || (lead.tier === 'selvforvaltning' && lead.terms_accepted);
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="dh-pad" style="padding:36px 40px 38px;">

      <p style="margin:0;font-size:11px;font-weight:500;letter-spacing:2.4px;text-transform:uppercase;color:${selfService ? '#7A3EC8' : '#18794E'};font-family:${BODY_FF};">${selfService ? 'Ny selvbetjent kunde · avtale inngått' : 'Nytt lead · svar umiddelbart'}</p>
      <h1 class="dh-h1" style="margin:10px 0 0;font-size:26px;line-height:1.12;letter-spacing:-0.7px;color:#0A0A0A;font-family:${HEAD_FF};font-weight:700;">${esc(lead.name || 'Ukjent navn')}</h1>
      <p style="margin:7px 0 0;font-size:13px;color:#8A8178;font-family:${BODY_FF};">Mottatt ${new Date(lead.createdAt || Date.now()).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 0;"><tr>
        ${platform || typeLabel ? `<td style="padding-right:8px;">${pill(platform ? `${typeLabel} · ${platform}` : typeLabel, '#F1E8FD', '#7A3EC8')}</td>` : ''}
        <td style="padding-right:8px;">${pill(cap(lead.lead_type || kind), '#E9F7EF', '#1F7A4D')}</td>
        ${lead.tier ? `<td style="padding-right:8px;">${pill(TIER_LABEL[lead.tier] || lead.tier, '#FDF0DC', '#9A6B15')}</td>` : ''}
        ${lead.source ? `<td>${pill(cap(lead.source), '#F0EAE2', '#57504A')}</td>` : ''}
      </tr></table>

      ${selfService ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#F6F0FE;border-radius:14px;">
        <tr><td style="padding:14px 18px;font-size:13px;line-height:1.6;color:#5B3E85;font-family:${BODY_FF};">
          <b style="color:#4A2E75;">Selvbetjent løp:</b> Avtalen (5&nbsp;% per utleieforhold) er akseptert digitalt i skjemaet — dette er en kunde, ikke et salgslead.
          ${lead.provisioning_status === 'provisioned'
            ? `<b style="color:#1B7A46;">Kontoen ble opprettet automatisk</b> — kunden fikk innloggingslenke umiddelbart (og velkomst-e-post fra plattformen). Ingen handling nødvendig.`
            : lead.provisioning_status === 'pending_manual'
              ? `Automatisk provisjonering svarte <b style="color:#8a6d3b;">pending_manual</b> — forvalter fullfører kontoen manuelt hos plattformen.`
              : `<b style="color:#B42318;">Automatisk provisjonering feilet</b> — <b style="color:#4A2E75;">opprett kontoen manuelt i CRM-et</b> (kunden er lovet tilgang i løpet av dagen).`}
        </td></tr>
      </table>` : ''}

      ${section('Kontakt', [
        ['E-post', lead.email], ['Telefon', lead.phone],
        ['Adresse', addressDisplay],
        ['Lokasjon', locationDisplay || (finnUrl && !addressDisplay ? 'Gateadresse ikke oppgitt i FINN-annonsen' : '')],
        ['FINN-annonse', finnHtml, true],
      ])}
      ${section('Boligen', [
        ['Boligtype', cap(lead.property_type)], ['Soverom', lead.bedrooms],
        ['Areal', lead.sqm ? `${lead.sqm} m²` : ''],
        ['Ønsket modell', RENTAL_LABEL[rentalRaw] || cap(rentalRaw)],
        ['Valgt spor', lead.tier ? (TIER_LABEL[lead.tier] || cap(lead.tier)) : ''],
        ['Avtale', lead.terms_accepted && lead.terms_accepted.at
          ? `Godtatt digitalt ${new Date(lead.terms_accepted.at).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })} (${lead.terms_accepted.version || 'v1'})` : ''],
        ['Matrikkel', matrikkel], ['Bygningstype', cap(lead.bygningstype)],
        ['Hjemmelshaver', hjemmelshaver], ['Ønsket område', cap(lead.preferred_area)],
      ])}
      ${section('Sporing', [
        ['Kampanje', cap(att.campaign)], ['Annonse', cap(att.content)],
        ['Henvist fra', refHost], ['Landingsside', lpHtml, true],
      ])}

      ${notat ? `
      <p style="margin:26px 0 0;font-size:10.5px;font-weight:500;letter-spacing:2.2px;text-transform:uppercase;color:#B4AB9F;font-family:${BODY_FF};">Notat fra ${esc(firstName(lead.name) || 'leadet')}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;background:#F7F2EB;border-radius:14px;">
        <tr><td style="padding:15px 18px;font-size:14px;line-height:1.65;color:#57504A;font-style:italic;font-family:${BODY_FF};">«${esc(notat)}»</td></tr>
      </table>` : ''}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dh-btns" style="margin:28px 0 0;"><tr>
        ${lead.phone ? `<td style="padding-right:10px;"><a href="tel:${esc(String(lead.phone).replace(/\s/g, ''))}" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Ring ${esc(firstName(lead.name) || 'lead')} nå&nbsp;&nbsp;&rarr;</a></td>` : ''}
        <td><a href="${esc(BASE_URL)}/admin" style="display:inline-block;background:#F0EAE2;color:#0A0A0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Åpne admin</a></td>
      </tr></table>
      ${lead.email ? `<p style="margin:18px 0 0;font-size:12.5px;color:#8A8178;font-family:${BODY_FF};">Svar på denne e-posten for å svare ${esc(firstName(lead.name) || 'leadet')} direkte.</p>` : ''}

    </td></tr></table>`;
  return {
    subject: selfService
      ? `Ny kunde (selvforvaltning): ${lead.name || lead.email || lead.phone || 'ukjent'} — opprett konto`
      : `Nytt lead: ${lead.name || lead.email || lead.phone || 'ukjent'} (${lead.lead_type || kind})${platform ? ' · ' + platform : (typeLabel ? ' · ' + typeLabel : '')}`,
    html: shell({ title: selfService ? 'Ny selvbetjent kunde' : 'Nytt lead', bodyHtml, preheader: `${lead.name || ''} · ${lead.address || lead.preferred_area || ''}` }),
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

// --- «Varm lead»-varsling: eksisterende ÅPEN lead viste interesse på nytt ----
// Fyres når hybrid-dedupen i /api/leads stempler re-engasjement på en
// eksisterende lead i stedet for å opprette duplikat. Mottakere styres av
// NL_INTEREST_NOTIFY (kommaseparert) med fallback til LEAD_NOTIFY_RECIPIENTS.
const VIA_LABEL = {
  'nyhetsbrev-ettklikk': 'Nyhetsbrev — ettklikks-bekreftelse',
  'sommerkampanje-2026': 'Sommerkampanjen (skjema)',
  nettside: 'Nettsiden (skjema)',
};
export async function sendReEngagedNotification(lead, entry = {}) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  const raw = (process.env.NL_INTEREST_NOTIFY || '').trim();
  const to = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : leadNotifyRecipients();
  if (!to.length) return { ok: false, skipped: 'ingen-mottakere' };

  const viaLabel = VIA_LABEL[entry.via] || cap(entry.via) || 'Nettsiden';
  const first = firstName(lead.name);
  const sinceDate = lead.createdAt
    ? new Date(lead.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const row = (label, value) => (value ? `
      <tr>
        <td style="padding:7px 14px 7px 0;font-size:12px;font-weight:600;letter-spacing:0.4px;color:#B4AB9F;white-space:nowrap;vertical-align:top;font-family:${BODY_FF};">${esc(label)}</td>
        <td style="padding:7px 0;font-size:14px;color:#2B2622;font-family:${BODY_FF};">${esc(value)}</td>
      </tr>` : '');

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="dh-pad" style="padding:34px 40px 38px;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#C2410C;font-family:${BODY_FF};">Varm lead — viste interesse igjen</p>
      <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#0A0A0A;font-family:${HEAD_FF};">${esc(lead.name || lead.email || 'Ukjent kontakt')}</h1>
      <p style="margin:12px 0 0;font-size:14.5px;line-height:1.65;color:#57504A;font-family:${BODY_FF};">
        ${esc(first || 'Denne kontakten')} ligger allerede som åpen lead${sinceDate ? ` (registrert ${esc(sinceDate)})` : ''} og har nettopp bekreftet interesse på nytt via <strong style="color:#0A0A0A;">${esc(viaLabel)}</strong>. Ingen duplikat er opprettet — dette er stemplet på den eksisterende leaden. Anbefalt: ring denne først.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
        ${row('Telefon', lead.phone)}
        ${row('E-post', lead.email)}
        ${row('Adresse', lead.address)}
        ${row('Kampanje', entry.campaign || '')}
        ${row('Status på lead', lead.status || 'new')}
      </table>
      ${entry.note ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#FFF4EC;border-radius:14px;">
        <tr><td style="padding:15px 18px;font-size:13.5px;line-height:1.6;color:#7C4A21;font-family:${BODY_FF};">${esc(entry.note)}</td></tr>
      </table>` : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dh-btns" style="margin:26px 0 0;"><tr>
        ${lead.phone ? `<td style="padding-right:10px;"><a href="tel:${esc(String(lead.phone).replace(/\s/g, ''))}" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Ring ${esc(first || 'lead')} nå&nbsp;&nbsp;&rarr;</a></td>` : ''}
        <td><a href="${esc(BASE_URL)}/admin" style="display:inline-block;background:#F0EAE2;color:#0A0A0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Åpne admin</a></td>
      </tr></table>
    </td></tr></table>`;

  return sendHtmlEmail({
    to,
    subject: `Varm lead — viste interesse igjen: ${lead.name || lead.email || 'ukjent'} · ${viaLabel}`,
    html: shell({ title: 'Varm lead', bodyHtml, preheader: `${lead.name || ''} bekreftet interesse på nytt via ${viaLabel}` }),
    fromName: 'DigiHome Leads',
    replyTo: lead.email || undefined,
    individual: false,
  });
}

export function buildPropertyInterestNotification(tenant = {}, property = {}, ctx = {}) {
  const first = firstName(tenant.name);
  const who = tenant.name || tenant.email || 'En leietaker';
  const place = property.district || property.area || property.city || '';
  const headline = property.title || (place ? `Bolig i ${place}` : 'Bolig');
  const facts = [
    property.type ? cap(property.type) : null,
    property.bedrooms ? `${property.bedrooms} soverom` : null,
    property.sqm ? `${property.sqm} m²` : null,
  ].filter(Boolean).join(' · ');
  const others = (Array.isArray(tenant.property_interests) ? tenant.property_interests : [])
    .filter((x) => String(x.propertyId) !== String(property.externalId || property.id));
  const isNewLead = !!ctx.tenantCreated;

  // Interesse-posten (kanonisk form fra lib/listings). Den bærer full adresse,
  // plattformens enhets-ID, hva interessenten krysset av for og fritekstmeldingen.
  // Alt dette skal stå i varselet — forvalteren skal kunne svare uten å åpne noe.
  const it = ctx.interest || {};
  const address = it.propertyAddress || property.street || property.fullAddress || '';
  const scopeLabel = it.scopeLabel || '';
  const showScope = !!scopeLabel && (it.rentalScope === 'begge' || it.rentalScope === 'rom');
  const msg = String(it.message || tenant.notes || '').trim().slice(0, 2000);
  const unitId = String(it.unitId || property.externalId || property.id || '');
  const listingUrl = it.propertyUrl || '';
  const fromNewsletter = /nyhetsbrev/.test(String(it.source || ctx.source || '')) || !!ctx.campaignId;
  const viaText = fromNewsletter
    ? (ctx.campaignTitle ? ` fra nyhetsbrevet «${esc(ctx.campaignTitle)}»` : ' fra nyhetsbrevet')
    : ' på boligsiden vår';
  const mailtoReply = tenant.email
    ? `mailto:${encodeURIComponent(tenant.email)}?subject=${encodeURIComponent(`Svar fra DigiHome: ${property.title || address || 'boligen du meldte interesse for'}`)}`
    : '';

  const row = (label, value) => (value ? `
      <tr>
        <td style="padding:7px 14px 7px 0;font-size:12px;font-weight:600;letter-spacing:0.4px;color:#B4AB9F;white-space:nowrap;vertical-align:top;font-family:${BODY_FF};">${esc(label)}</td>
        <td style="padding:7px 0;font-size:14px;color:#2B2622;font-family:${BODY_FF};">${esc(value)}</td>
      </tr>` : '');

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="dh-pad" style="padding:34px 40px 38px;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#7C3AED;font-family:${BODY_FF};">Boliginteresse — vil se bolig</p>
      <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#0A0A0A;font-family:${HEAD_FF};">${esc(headline)}</h1>
      <p style="margin:12px 0 0;font-size:14.5px;line-height:1.65;color:#57504A;font-family:${BODY_FF};">
        <strong style="color:#0A0A0A;">${esc(who)}</strong> meldte nettopp interesse for denne boligen${viaText}.
        ${tenant.phone ? `Ring ${esc(first || 'leietakeren')} nå — interessen er ferskest i dag.` : 'Vi har ikke telefonnummer, så svar på denne e-posten for å nå leietakeren direkte.'}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
        ${row('Adresse', address)}
        ${row('Område', place)}
        ${row('Fakta', facts)}
        ${showScope ? row('Interessert i', scopeLabel) : ''}
        ${row('Månedsleie', property.monthlyRentBand)}
        ${row('Ledig fra', property.availableFrom)}
        ${row('Leietaker', tenant.name)}
        ${row('Telefon', tenant.phone)}
        ${row('E-post', tenant.email)}
        ${row('Kampanje', ctx.campaignTitle || ctx.campaignId || '')}
        ${row('Enhets-ID', unitId)}
        ${others.length ? row('Andre boliger', `${others.length} annen interesse${others.length === 1 ? '' : 'r'} fra samme person`) : ''}
      </table>
      ${msg ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:#FBF8F3;border-radius:14px;">
        <tr><td style="padding:16px 18px;font-family:${BODY_FF};">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#B4AB9F;">Melding fra ${esc(first || 'interessenten')}</p>
          <p style="margin:8px 0 0;font-size:14.5px;line-height:1.7;color:#2B2622;white-space:pre-line;">${esc(msg)}</p>
        </td></tr>
      </table>` : ''}
      ${isNewLead ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#F5F3FF;border-radius:14px;">
        <tr><td style="padding:15px 18px;font-size:13.5px;line-height:1.6;color:#5B21B6;font-family:${BODY_FF};">Ny leietakerprofil ble opprettet automatisk fra nyhetsbrevlista — denne personen sto ikke som lead fra før.</td></tr>
      </table>` : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dh-btns" style="margin:26px 0 0;"><tr>
        ${tenant.phone ? `<td style="padding-right:10px;"><a href="tel:${esc(String(tenant.phone).replace(/\s/g, ''))}" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Ring ${esc(first || 'leietaker')} nå&nbsp;&nbsp;&rarr;</a></td>` : ''}
        ${mailtoReply ? `<td style="padding-right:10px;"><a href="${mailtoReply}" style="display:inline-block;background:#F0EAE2;color:#0A0A0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Svar ${esc(first || 'interessenten')}</a></td>` : ''}
        <td><a href="${esc(listingUrl || `${BASE_URL}/admin`)}" style="display:inline-block;background:#F0EAE2;color:#0A0A0A;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">${listingUrl ? 'Se boligen' : 'Åpne admin'}</a></td>
      </tr></table>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.7;color:#8A8178;font-family:${BODY_FF};">
        Svarer du på denne e-posten, går svaret rett til ${esc(tenant.email || 'interessenten')}.
      </p>
    </td></tr></table>`;

  const preheader = `${who} meldte interesse for ${address || headline}${place ? ` (${place})` : ''}`;
  return {
    subject: `Boliginteresse: ${who} vil se ${address || headline}${showScope ? ` — ${scopeLabel.toLowerCase()}` : ''}`,
    preheader,
    html: shell({ title: 'Boliginteresse', bodyHtml, preheader }),
  };
}

// --- Boliginteresse: leietaker meldte interesse for en KONKRET bolig --------
// Fyres kun FØRSTE gang en leietaker melder interesse for en gitt bolig, så
// gjentatte klikk fra samme person ikke spammer teamet. Mottakere styres av
// NL_INTEREST_NOTIFY med fallback til LEAD_NOTIFY_RECIPIENTS.
//
// E-posten er laget for å kunne handles på UTEN å åpne admin: navn, telefon og
// bolig står i klartekst, og «Ring»-knappen er en tel:-lenke. Svar går rett til
// leietakeren (replyTo), slik at 24-timersløftet faktisk kan innfris.
export async function sendPropertyInterestNotification(tenant = {}, property = {}, ctx = {}) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  const to = interestNotifyRecipients();
  if (!to.length) return { ok: false, skipped: 'ingen-mottakere' };
  // QA-leads (reserverte testdomener) skal ikke vekke forvalterteamet. Et varsel
  // som viser seg å være en probe koster tillit til varslene som er ekte.
  // recipients returneres som ANTALL — aldri adresser i et API-svar.
  if (isUndeliverableTestAddress(tenant.email)) {
    return { ok: false, skipped: 'test-lead', recipients: to.length };
  }

  const built = buildPropertyInterestNotification(tenant, property, ctx);
  return sendHtmlEmail({
    to,
    subject: built.subject,
    html: built.html,
    fromName: 'DigiHome Leads',
    replyTo: tenant.email || undefined,
    individual: false,
  });
}

// --- Kvittering til INTERESSENTEN -------------------------------------------
// Interessenten skal vite tre ting umiddelbart: at henvendelsen kom fram, hva
// den gjelder (adresse + om det er hele enheten eller rom), og at det kommer et
// svar fra et menneske. Reply-To peker på forvalterteamet, så et svar fra
// interessenten havner der noen faktisk leser — ikke i en no-reply-boks.
export function buildPropertyInterestReceipt(tenant = {}, property = {}, ctx = {}) {
  const fn = firstName(tenant.name);
  const it = ctx.interest || {};
  const address = it.propertyAddress || property.street || property.fullAddress || property.area || '';
  const headline = it.propertyTitle || property.title || address || 'boligen';
  const place = it.propertyDistrict || property.district || property.area || property.city || '';
  const showScope = !!it.scopeLabel && (it.rentalScope === 'begge' || it.rentalScope === 'rom');
  const msg = String(it.message || tenant.notes || '').trim().slice(0, 2000);
  const listingUrl = it.propertyUrl || '';
  const facts = [
    property.bedrooms ? `${property.bedrooms} soverom` : null,
    property.sqm ? `${property.sqm} m²` : null,
    property.monthlyRentBand || null,
  ].filter(Boolean).join(' · ');

  const row = (label, value) => (value ? `
      <tr>
        <td style="padding:7px 14px 7px 0;font-size:12px;font-weight:600;letter-spacing:0.4px;color:#B4AB9F;white-space:nowrap;vertical-align:top;font-family:${BODY_FF};">${esc(label)}</td>
        <td style="padding:7px 0;font-size:14px;color:#2B2622;font-family:${BODY_FF};">${esc(value)}</td>
      </tr>` : '');

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="dh-pad" style="padding:34px 40px 38px;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#7C3AED;font-family:${BODY_FF};">Interessen er registrert</p>
      <h1 class="dh-h1" style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:#0A0A0A;font-family:${HEAD_FF};">Takk${fn ? `, ${esc(fn)}` : ''}!</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#57504A;font-family:${BODY_FF};">
        Vi har registrert at du er interessert i <strong style="color:#0A0A0A;">${esc(address || headline)}</strong>${place ? ` i ${esc(place)}` : ''}.
        En av forvalterne våre går gjennom henvendelsen og tar kontakt${tenant.phone ? ' på telefon eller e-post' : ' på e-post'} — normalt samme dag på hverdager.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
        ${row('Bolig', headline)}
        ${row('Adresse', address)}
        ${row('Detaljer', facts)}
        ${showScope ? row('Du er interessert i', it.scopeLabel) : ''}
        ${row('Ledig fra', property.availableFrom)}
      </table>
      ${msg ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:#FBF8F3;border-radius:14px;">
        <tr><td style="padding:16px 18px;font-family:${BODY_FF};">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#B4AB9F;">Dette skrev du</p>
          <p style="margin:8px 0 0;font-size:14.5px;line-height:1.7;color:#2B2622;white-space:pre-line;">${esc(msg)}</p>
        </td></tr>
      </table>` : ''}
      ${listingUrl ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dh-btns" style="margin:26px 0 0;"><tr>
        <td><a href="${esc(listingUrl)}" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Se boligen igjen&nbsp;&nbsp;&rarr;</a></td>
      </tr></table>` : ''}
      <p style="margin:20px 0 0;font-size:12.5px;line-height:1.7;color:#8A8178;font-family:${BODY_FF};">
        Har du spørsmål før vi rekker å ringe? Bare svar på denne e-posten — den går rett til forvalterteamet.
        Vi bruker opplysningene dine kun til å følge opp denne henvendelsen.
      </p>
    </td></tr></table>`;

  const preheader = `Vi har registrert interessen din for ${address || headline} — du hører fra oss snart.`;
  return {
    subject: `Interessen din for ${address || headline} er registrert`,
    preheader,
    html: shell({ title: 'Interessen er registrert', bodyHtml, preheader }),
  };
}

function interestNotifyRecipients() {
  const raw = (process.env.NL_INTEREST_NOTIFY || '').trim();
  return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : leadNotifyRecipients();
}

export async function sendPropertyInterestReceipt(tenant = {}, property = {}, ctx = {}) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  if (!tenant.email) return { ok: false, skipped: 'ingen-epost' };
  const built = buildPropertyInterestReceipt(tenant, property, ctx);
  return sendHtmlEmail({
    to: tenant.email,
    subject: built.subject,
    html: built.html,
    fromName: 'DigiHome',
    // Svar fra interessenten skal lande hos forvalterteamet, ikke i tomrommet.
    replyTo: interestNotifyRecipients()[0] || undefined,
    individual: true,
    categories: ['boliginteresse-kvittering'],
  });
}

// --- Forvalterens SVAR til interessenten ------------------------------------
// Kalles av POST /api/property-interest/reply. Svaret kan komme fra
// marketing-admin eller fra forvalteren i DigiHome-plattformen — begge veier
// ender i samme e-post, med boligen som kontekst og forvalteren som avsender du
// kan svare til. Da blir det en samtale, ikke en blindvei.
export function buildInterestReplyEmail({ tenant = {}, interest = {}, message = '', fromName = '', property = {} } = {}) {
  const fn = firstName(tenant.name);
  const address = interest.propertyAddress || property.street || property.area || '';
  const headline = interest.propertyTitle || property.title || address || 'boligen';
  const listingUrl = interest.propertyUrl || '';
  const showScope = !!interest.scopeLabel && (interest.rentalScope === 'begge' || interest.rentalScope === 'rom');
  const body = String(message || '').trim().slice(0, 6000);
  const sender = String(fromName || '').trim() || 'DigiHome';

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="dh-pad" style="padding:34px 40px 38px;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#7C3AED;font-family:${BODY_FF};">Svar fra DigiHome</p>
      <h1 class="dh-h1" style="margin:10px 0 0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#0A0A0A;font-family:${HEAD_FF};">${esc(address || headline)}</h1>
      ${showScope ? `<p style="margin:8px 0 0;font-size:13px;color:#8A8178;font-family:${BODY_FF};">Din interesse: ${esc(interest.scopeLabel)}</p>` : ''}
      <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#57504A;font-family:${BODY_FF};">Hei${fn ? ` ${esc(fn)}` : ''},</p>
      <div style="margin:10px 0 0;font-size:15px;line-height:1.75;color:#2B2622;white-space:pre-line;font-family:${BODY_FF};">${esc(body)}</div>
      <p style="margin:22px 0 0;font-size:15px;line-height:1.7;color:#2B2622;font-family:${BODY_FF};">
        Vennlig hilsen<br><strong>${esc(sender)}</strong><br><span style="color:#8A8178;font-size:13.5px;">DigiHome</span>
      </p>
      ${listingUrl ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dh-btns" style="margin:26px 0 0;"><tr>
        <td><a href="${esc(listingUrl)}" style="display:inline-block;background:#0A0A0A;color:#fff;font-size:14px;font-weight:700;padding:13px 24px;border-radius:999px;text-decoration:none;font-family:${HEAD_FF};">Se boligen&nbsp;&nbsp;&rarr;</a></td>
      </tr></table>` : ''}
      <p style="margin:20px 0 0;font-size:12.5px;line-height:1.7;color:#8A8178;font-family:${BODY_FF};">Du kan svare direkte på denne e-posten.</p>
    </td></tr></table>`;

  const preheader = `Svar om ${address || headline}`;
  return {
    subject: `Svar fra DigiHome om ${address || headline}`,
    preheader,
    html: shell({ title: 'Svar fra DigiHome', bodyHtml, preheader }),
  };
}

export async function sendInterestReplyEmail({ tenant = {}, interest = {}, message = '', fromName = '', fromEmail = '', property = {} } = {}) {
  if (!emailConfigured()) return { ok: false, skipped: 'sendgrid-ikke-konfigurert' };
  if (!tenant.email) return { ok: false, skipped: 'ingen-epost' };
  if (!String(message || '').trim()) return { ok: false, skipped: 'ingen-melding' };
  const built = buildInterestReplyEmail({ tenant, interest, message, fromName, property });
  return sendHtmlEmail({
    to: tenant.email,
    subject: built.subject,
    html: built.html,
    fromName: fromName ? `${fromName} · DigiHome` : 'DigiHome',
    replyTo: fromEmail || interestNotifyRecipients()[0] || undefined,
    individual: true,
    categories: ['boliginteresse-svar'],
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
