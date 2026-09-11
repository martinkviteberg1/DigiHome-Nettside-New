// Spamvern for offentlige lead-skjemaer — null eksterne avhengigheter.
// Kombinerer honeypot, engangs-/testdomener, innsendingstid, innhold og
// nettleser-metadata til én score. Over terskel → stille karantene (ingen
// e-postvarsling, ingen videresending til plattformen). Ekte kunder med
// normal e-post, normal utfyllingstid og en ekte nettleser scorer ~0.

// Kjente engangs-/kastbare-/test-domener. Eksakt treff ELLER subdomene av disse.
const THROWAWAY_DOMAINS = new Set([
  // SendGrid inbound-sink (nøyaktig det spam-eksemplet brukte)
  'sink.sendgrid.net', 'sendgrid.net', 'em.sendgrid.net',
  // Klassiske engangs-tjenester
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz',
  'guerrillamail.net', 'guerrillamail.de', 'guerrillamailblock.com', 'sharklasers.com', 'grr.la',
  '10minutemail.com', '10minutemail.net', '20minutemail.com', '10mail.org',
  'tempmail.com', 'temp-mail.org', 'tempmail.net', 'tempmailo.com', 'tempr.email',
  'tmail.ws', 'tmpmail.org', 'tmpmail.net', 'tmpeml.com', 'moakt.com',
  'trashmail.com', 'trashmail.net', 'trash-mail.com', 'wegwerfmail.de', 'wegwerfemail.de',
  'yopmail.com', 'yopmail.net', 'yopmail.fr',
  'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc', 'mailnesia.com', 'mailnull.com',
  'throwawaymail.com', 'fakeinbox.com', 'fakemail.net', 'mytemp.email', 'mohmal.com',
  'emailondeck.com', 'spam4.me', 'mailcatch.com', 'inboxbear.com', 'discard.email',
  'mailsac.com', 'harakirimail.com', 'einrot.com', 'spambog.com', 'tempinbox.com',
  'byom.de', 'cuvox.de', 'dayrep.com', 'jourrapide.com', 'rhyta.com', 'teleworm.us', 'armyspy.com',
  // Åpenbare plassholder-/test-domener
  'example.com', 'example.org', 'example.net', 'test.com', 'test.no', 'test.org',
  'domain.com', 'mail.com.no', 'nowhere.no', 'invalid.com', 'localhost',
]);

// Åpenbare plassholder-/test-telefonnumre (kun sifre sammenlignes).
const PLACEHOLDER_PHONES = new Set([
  '4790000011', '90000011', '90000000', '99999999', '12345678', '11111111', '00000000',
  '4712345678', '4700000000', '4799999999', '47900000011', '12341234',
]);

// Grovkornet spam-innhold (lenkespam / typiske bot-fraser).
const SPAM_INNHOLD = /\b(viagra|cialis|casino|porn|escort|loan approval|payday loan|bitcoin doubler|crypto\s?invest|forex|seo services|backlinks?|guest post|link building|buy followers|cheap\s+(rolex|watches))\b/i;

function hentDomene(epost) {
  const at = String(epost || '').toLowerCase().trim().split('@');
  if (at.length !== 2 || !at[1]) return '';
  return at[1].replace(/[>).,;\s]+$/, '');
}

function erThrowawayDomene(domene) {
  if (!domene) return false;
  if (THROWAWAY_DOMAINS.has(domene)) return true;
  for (const d of THROWAWAY_DOMAINS) {
    if (domene.endsWith('.' + d)) return true;
  }
  return false;
}

function sifre(v) {
  return String(v || '').replace(/\D+/g, '');
}

function harLenke(v) {
  return /(https?:\/\/|www\.|\[url|<a\s|\.(ru|cn|top|xyz|click)\b)/i.test(String(v || ''));
}

// Ser strengen ut som tilfeldig tastetrykk? (lange konsonantklynger / ingen vokaler)
function virkerGibberish(navn) {
  const n = String(navn || '').trim();
  if (n.length < 5) return false;
  const bokstaver = n.replace(/[^a-zA-ZæøåÆØÅ]/g, '');
  if (bokstaver.length < 5) return false;
  const vokaler = (bokstaver.match(/[aeiouyæøåAEIOUYÆØÅ]/g) || []).length;
  const andelVokal = vokaler / bokstaver.length;
  const langKonsonantklynge = /[bcdfghjklmnpqrstvwxz]{6,}/i.test(bokstaver);
  return andelVokal < 0.12 || langKonsonantklynge;
}

/**
 * Vurder om en lead-innsending er spam.
 * @param {object} body  Rå request-body fra skjemaet.
 * @param {object} ctx   { ip, userAgent }
 * @returns {{ spam: boolean, score: number, reasons: string[] }}
 */
export function vurderLeadSpam(body = {}, ctx = {}) {
  const reasons = [];
  let score = 0;
  const add = (n, why) => { score += n; reasons.push(why); };

  // 1) HONEYPOT — skjulte felter som ekte brukere aldri ser/fyller ut.
  const honeypot = [body.website, body.url, body.fax, body.company_website, body.hp_field]
    .map((v) => String(v || '').trim()).find(Boolean);
  if (honeypot) add(100, 'honeypot_utfylt');

  // 2) E-POST: engangs-/test-domene, eller ugyldig form.
  const epost = String(body.email || '').trim();
  const domene = hentDomene(epost);
  if (epost) {
    if (erThrowawayDomene(domene)) add(100, `engangsdomene:${domene}`);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(epost)) add(25, 'ugyldig_epost_form');
  }

  // 3) INNSENDINGSTID — skjemaet sendt urealistisk raskt = bot.
  const elapsed = Number(body.elapsed_ms);
  if (Number.isFinite(elapsed) && elapsed >= 0) {
    if (elapsed < 800) add(70, `for_rask:${elapsed}ms`);
    else if (elapsed < 1500) add(45, `rask:${elapsed}ms`);
    else if (elapsed < 2500) add(20, `litt_rask:${elapsed}ms`);
  }

  // 4) PLASSHOLDER-TELEFON.
  const tlf = sifre(body.phone);
  if (tlf) {
    const alleLike = /^(\d)\1{6,}$/.test(tlf);
    const sekvens = /(01234567|12345678|23456789|98765432|87654321)/.test(tlf);
    if (PLACEHOLDER_PHONES.has(tlf) || alleLike || sekvens) add(35, `plassholder_tlf:${tlf}`);
  }

  // 5) TEST-/DUMMY-ADRESSE.
  const adresse = String(body.address || '').toLowerCase();
  if (/\b(test|prøve|prove|dummy|asdf|qwerty|lorem|ipsum|fake|xxxx)\b/.test(adresse)) add(25, 'test_adresse');

  // 6) LENKER / SPAM-INNHOLD i navn eller melding.
  const navn = String(body.name || '');
  const melding = String(body.notes || body.message || '');
  if (harLenke(navn)) add(45, 'lenke_i_navn');
  const antLenker = (melding.match(/https?:\/\//gi) || []).length;
  if (antLenker >= 2) add(35, `lenker_i_melding:${antLenker}`);
  else if (harLenke(melding)) add(15, 'lenke_i_melding');
  if (SPAM_INNHOLD.test(navn + ' ' + melding)) add(40, 'spam_nokkelord');

  // 7) GIBBERISH-NAVN.
  if (virkerGibberish(navn)) add(15, 'gibberish_navn');

  // 8) NETTLESER-METADATA — ekte besøkende har UA + attribusjon/visitorId.
  //    Rene skript-POST-er mangler ofte begge deler.
  const ua = String(ctx.userAgent || '');
  const erNettleser = /Mozilla|AppleWebKit|Chrome|Safari|Firefox|Edg|OPR/i.test(ua);
  if (!erNettleser) add(30, ua ? 'ua_ikke_nettleser' : 'ua_mangler');
  const attr = body.attribution && typeof body.attribution === 'object' ? body.attribution : null;
  const harMeta = !!(attr && (attr.visitorId || attr.sessionId || attr.landing_page || attr.referrer)) || !!body.visitorId || !!body.ga_client_id;
  if (!harMeta) add(15, 'mangler_nettleser_metadata');

  const THRESHOLD = 60;
  return { spam: score >= THRESHOLD, score, reasons };
}

export const SPAM_THRESHOLD = 60;
