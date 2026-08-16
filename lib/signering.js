// ═══════════════════ Posten signering (BankID) — portalflyt ═══════════════════
// Full integrasjon mot https://api.signering.posten.no (Digihome Tech AS,
// org.nr 835674622). Autentisering: mTLS med virksomhetssertifikat (Commfides
// .p12) som lastes opp i admin og lagres i MongoDB (passord AES-256-GCM-
// kryptert med SESSION_SECRET). Dokumentpakken er en signert ASiC-E-container
// (ZIP med document.pdf + manifest.xml + META-INF/signatures.xml, XAdES-B).
//
// Flyt: opprettSigneringsjobb() → Posten varsler signatarer per e-post/SMS →
// pollSignering() (cron) henter statusendringer fra kø → ved FULLFØRT lastes
// signert PAdES-PDF ned og lagres som ny, LÅST versjon av dokumentet.
// ══════════════════════════════════════════════════════════════════════════════

import crypto from 'node:crypto';
import https from 'node:https';
import forge from 'node-forge';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

export const SIGN_CONFIG_COLL = 'signering_config';
export const SIGN_JOBB_COLL = 'signering_jobber';

const ORGNR = () => (process.env.POSTEN_ORGNR || '835674622').trim();
const KO = () => (process.env.POSTEN_POLLING_QUEUE || 'digihome-saker').trim();
const BASE = () => `https://api.signering.posten.no/api/${ORGNR()}`;

// ── Kryptering av sertifikatpassord (AES-256-GCM, nøkkel fra SESSION_SECRET) ──
function kryptoNokkel() {
  const s = process.env.SESSION_SECRET || '';
  if (!s) throw new Error('SESSION_SECRET mangler i miljøet');
  return crypto.createHash('sha256').update(`dh-signering:${s}`).digest();
}
export function krypter(tekst) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', kryptoNokkel(), iv);
  const data = Buffer.concat([c.update(String(tekst), 'utf8'), c.final()]);
  return `${iv.toString('hex')}.${c.getAuthTag().toString('hex')}.${data.toString('hex')}`;
}
export function dekrypter(blob) {
  const [ivH, tagH, dataH] = String(blob || '').split('.');
  const d = crypto.createDecipheriv('aes-256-gcm', kryptoNokkel(), Buffer.from(ivH, 'hex'));
  d.setAuthTag(Buffer.from(tagH, 'hex'));
  return Buffer.concat([d.update(Buffer.from(dataH, 'hex')), d.final()]).toString('utf8');
}

// ── Sertifikat: parse .p12, valider og hent nøkkel/sertifikatkjede ────────────
export function parseP12(p12Base64, passord) {
  let p12;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.decode64(String(p12Base64 || '')));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, String(passord ?? ''));
  } catch (e) {
    throw new Error('Kunne ikke åpne sertifikatet — feil passord eller ugyldig .p12-fil');
  }
  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []),
  ];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const key = keyBags[0] && keyBags[0].key;
  if (!key) throw new Error('Fant ingen privat nøkkel i .p12-filen');
  const certs = certBags.map((b) => b.cert).filter(Boolean);
  if (!certs.length) throw new Error('Fant ingen sertifikater i .p12-filen');
  // Leaf = sertifikatet hvis offentlige nøkkel matcher den private nøkkelen
  const leaf = certs.find((c) => {
    try { return c.publicKey && c.publicKey.n && key.n && c.publicKey.n.compareTo(key.n) === 0; } catch (e) { return false; }
  }) || certs[0];
  const kjede = [leaf, ...certs.filter((c) => c !== leaf)];
  const attr = (c, navn) => { const a = c.subject.getField(navn); return a ? a.value : ''; };
  const utloper = leaf.validity && leaf.validity.notAfter ? new Date(leaf.validity.notAfter).toISOString() : null;
  return {
    keyPem: forge.pki.privateKeyToPem(key),
    kjedeB64: kjede.map((c) => forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(c)).getBytes())),
    // PEM-kjede for TLS (Node/OpenSSL 3 støtter ikke legacy-PKCS12 direkte)
    kjedePem: kjede.map((c) => forge.pki.certificateToPem(c)),
    leafDer: Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(leaf)).getBytes(), 'binary'),
    subjectCN: attr(leaf, 'CN') || 'Ukjent',
    subjectOrg: attr(leaf, 'O') || '',
    subjectSerial: (leaf.subject.getField({ name: 'serialNumber' }) || {}).value || '',
    issuerAttrs: leaf.issuer.attributes,
    serialNumberHex: leaf.serialNumber,
    utloper,
    utlopt: utloper ? new Date(utloper) < new Date() : false,
  };
}

// ── Oppsett: lagre/hente sertifikat i DB ──────────────────────────────────────
export async function lagreOppsett(db, { p12Base64, passord }) {
  if (!p12Base64) return { ok: false, error: 'Sertifikatfil mangler', status: 400 };
  if (String(p12Base64).length > 200000) return { ok: false, error: 'Sertifikatfilen er for stor', status: 400 };
  let info;
  try { info = parseP12(p12Base64, passord); } catch (e) { return { ok: false, error: e.message, status: 400 }; }
  if (info.utlopt) return { ok: false, error: `Sertifikatet utløp ${info.utloper.slice(0, 10)} — last opp et gyldig sertifikat`, status: 400 };
  await db.collection(SIGN_CONFIG_COLL).updateOne(
    { id: 'posten' },
    {
      $set: {
        id: 'posten',
        p12: String(p12Base64),
        passordKryptert: krypter(String(passord ?? '')),
        subject: info.subjectCN,
        subjectOrg: info.subjectOrg,
        subjectSerial: info.subjectSerial,
        utloper: info.utloper,
        orgnr: ORGNR(),
        ko: KO(),
        oppdatert: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
  return { ok: true, subject: info.subjectCN, subjectOrg: info.subjectOrg, utloper: info.utloper };
}

export async function hentOppsett(db, { medHemmeligheter = false } = {}) {
  const cfg = await db.collection(SIGN_CONFIG_COLL).findOne({ id: 'posten' });
  if (!cfg || !cfg.p12) {
    // Fallback: sertifikat fra miljøvariabler (fungerer likt i preview og prod
    // uten manuelt oppsett i admin)
    if (process.env.POSTEN_P12_B64) {
      try {
        const info = parseP12(process.env.POSTEN_P12_B64, process.env.POSTEN_P12_PASSORD || '');
        return { konfigurert: true, kilde: 'miljø', subject: info.subjectCN, subjectOrg: info.subjectOrg, utloper: info.utloper, orgnr: ORGNR(), ko: KO() };
      } catch (e) { return { konfigurert: false, feil: `Miljøsertifikat ugyldig: ${e.message}` }; }
    }
    return null;
  }
  if (medHemmeligheter) return cfg;
  return {
    konfigurert: true,
    kilde: 'database',
    subject: cfg.subject,
    subjectOrg: cfg.subjectOrg,
    utloper: cfg.utloper,
    orgnr: cfg.orgnr,
    ko: cfg.ko,
    oppdatert: cfg.oppdatert,
  };
}

export async function slettOppsett(db) {
  await db.collection(SIGN_CONFIG_COLL).deleteOne({ id: 'posten' });
  return { ok: true };
}

async function hentMateriale(db) {
  const cfg = await db.collection(SIGN_CONFIG_COLL).findOne({ id: 'posten' });
  let info;
  let ko = KO();
  if (cfg && cfg.p12) {
    const passord = dekrypter(cfg.passordKryptert);
    info = parseP12(cfg.p12, passord);
    ko = cfg.ko || KO();
  } else if (process.env.POSTEN_P12_B64) {
    // Fallback: miljøvariabler (POSTEN_P12_B64 + POSTEN_P12_PASSORD)
    info = parseP12(process.env.POSTEN_P12_B64, process.env.POSTEN_P12_PASSORD || '');
  } else {
    throw new Error('Virksomhetssertifikat er ikke konfigurert — gå til Signering-oppsett');
  }
  if (info.utlopt) throw new Error('Virksomhetssertifikatet er utløpt — last opp et nytt');
  // TLS-materiale som PEM (Node/OpenSSL 3 håndterer ikke Commfides-PKCS12 direkte)
  return { tls: { key: info.keyPem, cert: info.kjedePem.join('') }, info, ko };
}

// ── HTTPS med mTLS (PEM key/cert). Postens API-server bruker virksomhetssertifikat som
//    ikke er utstedt til domenenavnet → hostname-sjekk må hoppes over, men
//    kjeden valideres fortsatt. Faller tilbake til uvalidert kjede kun hvis
//    rot-CA (Buypass/Commfides) mangler i Node sitt CA-lager. ────────────────
function httpsKall({ metode, url, headers = {}, body = null, tls }, tillatUsikret = false) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      method: metode,
      host: u.hostname,
      port: 443,
      path: `${u.pathname}${u.search}`,
      key: tls.key,
      cert: tls.cert,
      headers,
      rejectUnauthorized: !tillatUsikret,
      checkServerIdentity: () => undefined, // server-sertifikatet er ikke domenebundet
      timeout: 45000,
    }, (res) => {
      const biter = [];
      res.on('data', (d) => biter.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(biter) }));
    });
    req.on('timeout', () => { req.destroy(new Error('Tidsavbrudd mot Posten signering')); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
async function postenKall(opts) {
  try {
    return await httpsKall(opts, false);
  } catch (e) {
    const m = String(e && (e.code || e.message) || '');
    if (/UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER|SELF_SIGNED|CERT_/i.test(m)) {
      // eslint-disable-next-line no-console
      console.warn('[signering] CA-kjede kunne ikke valideres lokalt — fortsetter uten kjede-validering (mTLS beskytter fortsatt)');
      return httpsKall(opts, true);
    }
    throw e;
  }
}

// ── XML-hjelpere ──────────────────────────────────────────────────────────────
const xesc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hentTag = (xml, tag) => { const m = String(xml).match(new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`)); return m ? m[1].trim() : ''; };

// ── ASiC-E: bygg signert dokumentpakke (XAdES-B, jf. Postens profil) ─────────
// Alle XML-strenger genereres i kanonisk form (C14N 1.0): ingen whitespace
// mellom elementer, ingen self-closing-tagger, navnerom på apex-elementene,
// attributter i kanonisk rekkefølge. Digestene beregnes over nøyaktig samme
// bytes som en validator vil kanonikalisere til.
export async function lagAsice({ pdf, manifestXml, keyPem, kjedeB64, leafDer, issuerAttrs, serialNumberHex }) {
  const sha256b64 = (buf) => crypto.createHash('sha256').update(buf).digest('base64');
  const manifestBuf = Buffer.from(manifestXml, 'utf8');

  const certSha1 = crypto.createHash('sha1').update(leafDer).digest('base64');
  // IssuerName på Java-format: "CN=…, OU=…, O=…, C=NO" (mest spesifikk først)
  const issuerName = [...issuerAttrs].reverse()
    .map((a) => `${a.shortName || a.name || (a.type ? `OID.${a.type}` : 'X')}=${a.value}`)
    .join(', ');
  const serialDec = BigInt(`0x${serialNumberHex}`).toString(10);
  const sigTid = new Date().toISOString();

  const DS = 'http://www.w3.org/2000/09/xmldsig#';
  const signedProps = `<SignedProperties xmlns="http://uri.etsi.org/01903/v1.3.2#" xmlns:ns2="${DS}" Id="SignedProperties">`
    + '<SignedSignatureProperties>'
    + `<SigningTime>${sigTid}</SigningTime>`
    + '<SigningCertificate><Cert><CertDigest>'
    + '<ns2:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ns2:DigestMethod>'
    + `<ns2:DigestValue>${certSha1}</ns2:DigestValue>`
    + '</CertDigest><IssuerSerial>'
    + `<ns2:X509IssuerName>${xesc(issuerName)}</ns2:X509IssuerName>`
    + `<ns2:X509SerialNumber>${serialDec}</ns2:X509SerialNumber>`
    + '</IssuerSerial></Cert></SigningCertificate>'
    + '</SignedSignatureProperties>'
    + '<SignedDataObjectProperties>'
    + '<DataObjectFormat ObjectReference="#ID_0"><MimeType>application/pdf</MimeType></DataObjectFormat>'
    + '<DataObjectFormat ObjectReference="#ID_1"><MimeType>application/xml</MimeType></DataObjectFormat>'
    + '</SignedDataObjectProperties>'
    + '</SignedProperties>';

  const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  const signedInfo = `<SignedInfo xmlns="${DS}">`
    + `<CanonicalizationMethod Algorithm="${C14N}"></CanonicalizationMethod>`
    + '<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod>'
    + '<Reference Id="ID_0" URI="document.pdf">'
    + '<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>'
    + `<DigestValue>${sha256b64(pdf)}</DigestValue>`
    + '</Reference>'
    + '<Reference Id="ID_1" URI="manifest.xml">'
    + '<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>'
    + `<DigestValue>${sha256b64(manifestBuf)}</DigestValue>`
    + '</Reference>'
    + '<Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#SignedProperties">'
    + `<Transforms><Transform Algorithm="${C14N}"></Transform></Transforms>`
    + '<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>'
    + `<DigestValue>${sha256b64(Buffer.from(signedProps, 'utf8'))}</DigestValue>`
    + '</Reference>'
    + '</SignedInfo>';

  const signatureValue = crypto.sign('RSA-SHA256', Buffer.from(signedInfo, 'utf8'), keyPem).toString('base64');
  const sertifikater = kjedeB64.map((c) => `<X509Certificate>${c}</X509Certificate>`).join('');

  const signaturesXml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'
    + '<XAdESSignatures xmlns="http://uri.etsi.org/2918/v1.2.1#">'
    + `<Signature xmlns="${DS}" Id="Signature">`
    + signedInfo
    + `<SignatureValue>${signatureValue}</SignatureValue>`
    + `<KeyInfo><X509Data>${sertifikater}</X509Data></KeyInfo>`
    + `<Object><QualifyingProperties xmlns="http://uri.etsi.org/01903/v1.3.2#" xmlns:ns2="${DS}" Target="#Signature">`
    + signedProps
    + '</QualifyingProperties></Object>'
    + '</Signature>'
    + '</XAdESSignatures>';

  const zip = new JSZip();
  zip.file('document.pdf', pdf);
  zip.file('manifest.xml', manifestBuf);
  zip.file('META-INF/signatures.xml', Buffer.from(signaturesXml, 'utf8'));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// ── Manifest for portalflyt: signatarer adressert med kontaktinfo (e-post/SMS),
//    valgfri rekkefølge (order 0-9). Identifikator i signert dokument: NAME. ──
function normMobil(m) {
  const r = String(m || '').replace(/[\s\-.]/g, '');
  if (/^\+47\d{8}$/.test(r)) return r.slice(3);
  if (/^0047\d{8}$/.test(r)) return r.slice(4);
  return r;
}
export function byggManifest({ signatarer, tittel, melding, dagerFrist }) {
  const signerXml = signatarer.map((s) => {
    const orderAttr = Number.isInteger(s.rekkefolge) ? ` order="${Math.max(0, Math.min(9, s.rekkefolge))}"` : '';
    const varsler = [
      s.epost ? `<email address="${xesc(s.epost)}"></email>` : '',
      s.mobil ? `<sms number="${xesc(normMobil(s.mobil))}"></sms>` : '',
    ].join('');
    return `<signer${orderAttr}><identified-by-contact-information></identified-by-contact-information><notifications>${varsler}</notifications></signer>`;
  }).join('');
  const sekunder = Math.min(90 * 86400, Math.max(86400, Math.round((Number(dagerFrist) || 10) * 86400)));
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<portal-signature-job-manifest xmlns="http://signering.posten.no/schema/v1">'
    + `<signers>${signerXml}</signers>`
    + `<sender><organization-number>${ORGNR()}</organization-number></sender>`
    + `<title>${xesc(String(tittel).slice(0, 80))}</title>`
    + '<nonsensitive-title>Dokument til signering fra DigiHome</nonsensitive-title>'
    + (melding ? `<description>${xesc(String(melding).slice(0, 220))}</description>` : '')
    + `<documents><document href="document.pdf" mime="application/pdf"><title>${xesc(String(tittel).slice(0, 80))}</title></document></documents>`
    + `<availability><available-seconds>${sekunder}</available-seconds></availability>`
    // identifier-in-signed-documents utelates bevisst: 'NAME' krever egen
    // aktivering hos Posten (FEATURE_NOT_AVAILABLE for org-en per nå) —
    // standarden (fødselsnummer + navn i signert PAdES) brukes i stedet.
    + '</portal-signature-job-manifest>';
}

// ── DIREKTEFLYT: DigiHome sender egne e-poster med signeringsknapp ──────────
// Manifest for direkteflyt: signatarer identifiseres med vår interne uuid
// (signer-identifier) — ingen fødselsnummer sendes til Posten på forhånd.
export function byggDirectManifest({ signatarer, tittel, melding }) {
  const signerXml = signatarer.map((s) => `<signer><signer-identifier>${xesc(s.sid)}</signer-identifier></signer>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<direct-signature-job-manifest xmlns="http://signering.posten.no/schema/v1">'
    + signerXml
    + `<sender><organization-number>${ORGNR()}</organization-number></sender>`
    + `<title>${xesc(String(tittel).slice(0, 80))}</title>`
    + (melding ? `<description>${xesc(String(melding).slice(0, 220))}</description>` : '')
    + `<documents><document href="document.pdf" mime="application/pdf"><title>${xesc(String(tittel).slice(0, 80))}</title></document></documents>`
    // identifier-in-signed-documents utelates: NAME krever egen aktivering hos
    // Posten — standard (fødselsnr.+navn i signert PAdES) brukes.
    + '</direct-signature-job-manifest>';
}

// Hvem har tur nå? (sekvensiell: laveste rekkefolge blant de som venter)
export function signatarerPaaTur(jobb) {
  const venter = (jobb.signatarer || []).filter((s) => s.status === 'VENTER');
  if (!venter.length) return [];
  const medRekkefolge = venter.filter((s) => Number.isInteger(s.rekkefolge));
  if (!medRekkefolge.length) return venter; // parallelt: alle samtidig
  const minR = Math.min(...medRekkefolge.map((s) => s.rekkefolge));
  return venter.filter((s) => (Number.isInteger(s.rekkefolge) ? s.rekkefolge === minR : false));
}

// DigiHome-brandet signerings-e-post med knapp → vår redirect-rute som henter
// fersk engangs-URL fra Posten per klikk (lenken i e-posten utløper aldri).
export async function sendSignaturEpost(jobb, signatar) {
  const { sendHtmlEmail, emailConfigured } = await import('./email');
  if (!emailConfigured() || !signatar.epost) return false;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const lenke = `${base}/signering/dokument/${jobb.id}/${signatar.sid}`;
  const frist = new Date(new Date(jobb.opprettet || Date.now()).getTime() + (jobb.dagerFrist || 10) * 86400000)
    .toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  const hilsenNavn = signatar.navn ? signatar.navn.split(' ')[0] : '';
  const filNavn = String(jobb.filNavn || 'Dokument.pdf');
  const antall = (jobb.signatarer || []).length;
  const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  // Tabellbasert og «bulletproof» (Outlook-trygg): ingen flexbox, ingen
  // eksterne bilder, rolig DigiHome-palett — svart CTA, én lilla aksent.
  const html = `<!DOCTYPE html>
<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Til signering</title></head>
<body style="margin:0;padding:0;background:#f4f3f0;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Se dokumentet og signer med BankID — frist ${frist}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;">
    <tr><td align="center" style="padding:40px 16px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">

        <!-- Avsenderlinje -->
        <tr><td style="padding:0 6px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:${F};font-size:16px;font-weight:800;letter-spacing:-0.02em;color:#0a0a0a;">DigiHome</td>
            <td align="right" style="font-family:${F};font-size:10.5px;font-weight:700;letter-spacing:0.1em;color:#a8a29a;">SIKKER SIGNERING</td>
          </tr></table>
        </td></tr>

        <!-- Kort -->
        <tr><td style="background:#ffffff;border:1px solid #e9e7e2;border-radius:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

            <tr><td style="padding:34px 36px 0;">
              <p style="margin:0;font-family:${F};font-size:11px;font-weight:700;letter-spacing:0.12em;color:#7c3aed;">TIL SIGNERING</p>
              <h1 style="margin:10px 0 0;font-family:${F};font-size:25px;line-height:1.25;letter-spacing:-0.02em;font-weight:700;color:#0a0a0a;">${xesc(jobb.tittel)}</h1>
              <p style="margin:16px 0 0;font-family:${F};font-size:14.5px;line-height:1.65;color:#57534e;">Hei${hilsenNavn ? ` ${xesc(hilsenNavn)}` : ''} — ${jobb.melding ? xesc(jobb.melding) : 'du er bedt om å signere dokumentet under elektronisk med BankID.'}</p>
            </td></tr>

            <!-- Dokumentbrikke -->
            <tr><td style="padding:22px 36px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;border:1px solid #efede8;border-radius:14px;"><tr>
                <td width="66" style="padding:14px 0 14px 16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td width="44" height="44" align="center" style="background:#f3eefe;border-radius:11px;font-family:${F};font-size:10.5px;font-weight:800;letter-spacing:0.04em;color:#7c3aed;">PDF</td>
                  </tr></table>
                </td>
                <td style="padding:14px 16px 14px 12px;">
                  <p style="margin:0;font-family:${F};font-size:13.5px;font-weight:600;color:#1c1917;">${xesc(filNavn)}</p>
                  <p style="margin:3px 0 0;font-family:${F};font-size:12px;color:#a8a29a;">Du ser hele dokumentet før du signerer</p>
                </td>
              </tr></table>
            </td></tr>

            <!-- CTA -->
            <tr><td align="left" style="padding:24px 36px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td align="center" bgcolor="#0a0a0a" style="border-radius:999px;">
                  <a href="${lenke}" style="display:inline-block;font-family:${F};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;padding:15px 30px;border-radius:999px;">Se dokumentet og signer med BankID&nbsp;&nbsp;&rarr;</a>
                </td>
              </tr></table>
              <p style="margin:12px 0 0;font-family:${F};font-size:12px;line-height:1.6;color:#a8a29a;">Knappen åpner en sikker DigiHome-side der du ser hele dokumentet før BankID-signeringen starter.</p>
            </td></tr>

            <!-- Meta -->
            <tr><td style="padding:26px 36px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0eee9;">
                <tr>
                  <td style="padding:13px 0 0;font-family:${F};font-size:12.5px;color:#a8a29a;">Frist</td>
                  <td align="right" style="padding:13px 0 0;font-family:${F};font-size:12.5px;font-weight:600;color:#1c1917;">${frist}</td>
                </tr>
                <tr>
                  <td style="padding:9px 0 0;font-family:${F};font-size:12.5px;color:#a8a29a;">Avsender</td>
                  <td align="right" style="padding:9px 0 0;font-family:${F};font-size:12.5px;font-weight:600;color:#1c1917;">Digihome Tech AS</td>
                </tr>
                ${antall > 1 ? `<tr>
                  <td style="padding:9px 0 0;font-family:${F};font-size:12.5px;color:#a8a29a;">Signatarer</td>
                  <td align="right" style="padding:9px 0 0;font-family:${F};font-size:12.5px;font-weight:600;color:#1c1917;">${antall} personer</td>
                </tr>` : ''}
              </table>
            </td></tr>

            <!-- Bunn i kortet -->
            <tr><td style="padding:24px 36px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0eee9;"><tr>
                <td style="padding:16px 0 0;font-family:${F};font-size:11.5px;line-height:1.65;color:#b5b1aa;">
                  Signeringen er juridisk bindende og utføres trygt hos <span style="color:#78716c;font-weight:600;">Posten signering</span> med <span style="color:#78716c;font-weight:600;">BankID</span>.<br>
                  Fungerer ikke knappen? Kopier lenken: <a href="${lenke}" style="color:#7c3aed;text-decoration:underline;word-break:break-all;">${lenke.replace('https://', '')}</a>
                </td>
              </tr></table>
            </td></tr>

          </table>
        </td></tr>

        <!-- Under kortet -->
        <tr><td align="center" style="padding:18px 12px 8px;">
          <p style="margin:0;font-family:${F};font-size:11px;line-height:1.7;color:#b5b1aa;">Denne lenken er personlig for deg — ikke videresend e-posten.<br>Digihome Tech AS · Org.nr 835 674 622</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
  try {
    const r = await sendHtmlEmail({
      to: signatar.epost,
      subject: `Til signering: ${jobb.tittel}`,
      html,
      fromName: 'DigiHome',
      categories: ['signering'],
    });
    return !!(r && r.ok !== false);
  } catch (e) { return false; }
}

// ── Opprett signeringsoppdrag hos Posten ─────────────────────────────────────
export async function opprettSigneringsjobb(db, { filId, tittel, melding, signatarer, dagerFrist, av, avId = null, autoArkiv = null }) {
  const fil = await db.collection('task_files').findOne({ id: String(filId || '') });
  if (!fil) return { ok: false, error: 'Filen finnes ikke', status: 404 };
  const erPdf = /pdf$/i.test(String(fil.type || '')) || /\.pdf$/i.test(String(fil.name || ''));
  if (!erPdf) return { ok: false, error: 'Kun PDF kan sendes til signering — konverter dokumentet til PDF først', status: 400 };
  if (fil.laast) return { ok: false, error: 'Dokumentet er låst (allerede signert). Last opp en ny versjon for å signere på nytt.', status: 400 };
  const aktiv = await db.collection(SIGN_JOBB_COLL).findOne({ filId: fil.id, status: 'I_GANG' });
  if (aktiv) return { ok: false, error: 'Dokumentet har allerede en aktiv signeringsrunde', status: 409 };

  const rene = (Array.isArray(signatarer) ? signatarer : [])
    .map((s) => ({
      navn: String(s.navn || '').trim().slice(0, 100),
      epost: String(s.epost || '').trim().toLowerCase().slice(0, 150),
      mobil: String(s.mobil || '').trim().slice(0, 20),
      rekkefolge: Number.isInteger(s.rekkefolge) ? s.rekkefolge : undefined,
    }))
    .filter((s) => s.epost);
  if (!rene.length) return { ok: false, error: 'Minst én signatar med e-postadresse kreves', status: 400 };
  if (rene.length > 10) return { ok: false, error: 'Maks 10 signatarer', status: 400 };
  for (const s of rene) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.epost)) return { ok: false, error: `Ugyldig e-post: ${s.epost}`, status: 400 };
  }

  const mat = await hentMateriale(db);
  const pdf = Buffer.from(fil.data || '', 'base64');
  if (pdf.length > 10 * 1024 * 1024) return { ok: false, error: 'PDF-en er større enn Postens grense på 10 MB', status: 400 };

  // DIREKTEFLYT: vi sender egne DigiHome-e-poster med signeringsknapp —
  // signataren klikker → vår /api/signer-rute henter fersk engangs-URL fra
  // Posten → 302 rett inn i BankID-signeringen. Ingen kode å taste.
  const jobbId = uuidv4();
  const medSid = rene.map((s) => ({ ...s, sid: uuidv4() }));
  const manifestXml = byggDirectManifest({ signatarer: medSid, tittel: tittel || fil.name, melding });
  const asice = await lagAsice({
    pdf, manifestXml,
    keyPem: mat.info.keyPem, kjedeB64: mat.info.kjedeB64, leafDer: mat.info.leafDer,
    issuerAttrs: mat.info.issuerAttrs, serialNumberHex: mat.info.serialNumberHex,
  });

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const metadataXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<direct-signature-job-request xmlns="http://signering.posten.no/schema/v1">'
    + `<reference>${jobbId}</reference>`
    + '<exit-urls>'
    + `<completion-url>${xesc(`${baseUrl}/signering/ferdig`)}</completion-url>`
    + `<rejection-url>${xesc(`${baseUrl}/signering/avvist`)}</rejection-url>`
    + `<error-url>${xesc(`${baseUrl}/signering/feil`)}</error-url>`
    + '</exit-urls>'
    + '<status-retrieval-method>POLLING</status-retrieval-method>'
    + `<polling-queue>${xesc(mat.ko)}</polling-queue>`
    + '</direct-signature-job-request>';

  const grense = `dhsignering${crypto.randomBytes(12).toString('hex')}`;
  const kropp = Buffer.concat([
    Buffer.from(`--${grense}\r\nContent-Type: application/xml\r\n\r\n${metadataXml}\r\n`, 'utf8'),
    Buffer.from(`--${grense}\r\nContent-Type: application/octet-stream\r\n\r\n`, 'utf8'),
    asice,
    Buffer.from(`\r\n--${grense}--\r\n`, 'utf8'),
  ]);

  const res = await postenKall({
    metode: 'POST',
    url: `${BASE()}/direct/signature-jobs`,
    headers: {
      'Content-Type': `multipart/mixed; boundary=${grense}`,
      'Content-Length': String(kropp.length),
      Accept: 'application/xml',
    },
    body: kropp,
    tls: mat.tls,
  });
  const svarTekst = res.body.toString('utf8');
  if (res.status < 200 || res.status >= 300) {
    const feil = [hentTag(svarTekst, 'error-code'), hentTag(svarTekst, 'error-message') || hentTag(svarTekst, 'message')].filter(Boolean).join(': ') || svarTekst.slice(0, 500) || `HTTP ${res.status}`;
    return { ok: false, error: `Posten avviste oppdraget: ${feil}`, status: 502 };
  }
  const postenJobId = hentTag(svarTekst, 'signature-job-id');
  const statusUrl = hentTag(svarTekst, 'status-url');
  if (!postenJobId) return { ok: false, error: 'Uventet svar fra Posten (mangler signature-job-id)', status: 502 };

  // Koble hver signatar til sin signer-URL (for ferske redirect-URL-er per klikk)
  const signerBlokker = [...svarTekst.matchAll(/<(?:[\w-]+:)?signer\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?signer>/g)];
  for (const [, href, innhold] of signerBlokker) {
    const sidM = innhold.match(/<(?:[\w-]+:)?signer-identifier>([^<]*)<\/(?:[\w-]+:)?signer-identifier>/);
    const treff = sidM && medSid.find((s) => s.sid === sidM[1].trim());
    if (treff) treff.signerUrl = href;
  }

  const now = new Date().toISOString();
  const jobb = {
    id: jobbId,
    flyt: 'direkte',
    filId: fil.id,
    taskId: fil.taskId,
    filNavn: fil.name,
    postenJobId,
    statusUrl,
    status: 'I_GANG',
    tittel: String(tittel || fil.name).slice(0, 80),
    melding: String(melding || '').slice(0, 220),
    dagerFrist: Math.max(1, Math.min(90, Number(dagerFrist) || 10)),
    signatarer: medSid.map((s) => ({ ...s, status: 'VENTER', signertAt: null, epostSendtAt: null })),
    ko: mat.ko,
    av: String(av || '').slice(0, 120),
    avId: avId || null,
    autoArkiv: autoArkiv && autoArkiv.aktiv ? { aktiv: true, synlighet: autoArkiv.synlighet || 'styret' } : null,
    opprettet: now,
    oppdatert: now,
  };
  await db.collection(SIGN_JOBB_COLL).insertOne({ ...jobb });

  // Send DigiHome-e-post til dem som har tur (alle ved parallell signering,
  // kun første ved sekvensiell rekkefølge)
  for (const s of signatarerPaaTur(jobb)) {
    const sendt = await sendSignaturEpost(jobb, s);
    if (sendt) {
      s.epostSendtAt = new Date().toISOString();
      await db.collection(SIGN_JOBB_COLL).updateOne(
        { id: jobb.id, 'signatarer.sid': s.sid },
        { $set: { 'signatarer.$.epostSendtAt': s.epostSendtAt } },
      );
    }
  }

  // Sørg for at polleren våkner raskt
  await db.collection(SIGN_CONFIG_COLL).updateOne({ id: 'posten' }, { $set: { nestePoll: now } }, { upsert: true });
  return { ok: true, jobb };
}

// Offentlig visningsdata for signeringssiden (forhåndsvisning før BankID).
// Krever gyldig jobbId+sid (to uuid-er) — ingen sensitive felter utover det
// signataren uansett skal se og signere.
export async function hentSignerVisning(db, jobbId, sid) {
  const jobb = await db.collection(SIGN_JOBB_COLL).findOne({ id: String(jobbId || '') }, { projection: { _id: 0 } });
  if (!jobb || jobb.flyt !== 'direkte') return { ok: false, error: 'Signeringsoppdraget finnes ikke', status: 404 };
  const signatar = (jobb.signatarer || []).find((s) => s.sid === String(sid || ''));
  if (!signatar) return { ok: false, error: 'Ugyldig signeringslenke', status: 404 };
  const frist = new Date(new Date(jobb.opprettet).getTime() + (jobb.dagerFrist || 10) * 86400000).toISOString();
  const paaTur = jobb.status === 'I_GANG' && signatarerPaaTur(jobb).some((s) => s.sid === signatar.sid);
  return {
    ok: true,
    tittel: jobb.tittel,
    melding: jobb.melding || '',
    filNavn: jobb.filNavn,
    avsender: 'Digihome Tech AS',
    frist,
    jobbStatus: jobb.status,
    signatar: { navn: signatar.navn || '', status: signatar.status },
    paaTur,
    antall: (jobb.signatarer || []).length,
    signert: (jobb.signatarer || []).filter((s) => s.status === 'SIGNERT').length,
    // Full signatarliste (kun navn + status — aldri andres e-post/lenker)
    signatarer: (jobb.signatarer || []).map((s) => ({
      navn: s.navn || 'Signatar',
      status: s.status,
      signertAt: s.signertAt || null,
      deg: s.sid === signatar.sid,
      rekkefolge: Number.isInteger(s.rekkefolge) ? s.rekkefolge : null,
    })),
  };
}

// Offentlig dokumentstrøm for forhåndsvisning (kun med gyldig jobbId+sid).
// Kansellerte runder sperres; ellers serveres gjeldende versjon av filen.
export async function hentSignerDokument(db, jobbId, sid) {
  const jobb = await db.collection(SIGN_JOBB_COLL).findOne({ id: String(jobbId || '') });
  if (!jobb || jobb.flyt !== 'direkte') return null;
  if (jobb.status === 'KANSELLERT') return null;
  if (!(jobb.signatarer || []).some((s) => s.sid === String(sid || ''))) return null;
  const fil = await db.collection('task_files').findOne({ id: jobb.filId }, { projection: { _id: 0, data: 1, name: 1, type: 1 } });
  return fil || null;
}

// Hent fersk engangs-redirect-URL for en signatar (kalles fra den offentlige
// /api/signer/:jobbId/:sid-ruten når signataren klikker i e-posten)
export async function hentSignerRedirect(db, jobbId, sid) {
  const jobb = await db.collection(SIGN_JOBB_COLL).findOne({ id: String(jobbId || '') });
  if (!jobb || jobb.flyt !== 'direkte') return { ok: false, error: 'Signeringsoppdraget finnes ikke', status: 404 };
  if (jobb.status === 'KANSELLERT') return { ok: false, error: 'Signeringsrunden er kansellert', status: 410 };
  if (jobb.status !== 'I_GANG') return { ok: false, error: 'Signeringsrunden er avsluttet', status: 410 };
  const signatar = (jobb.signatarer || []).find((s) => s.sid === String(sid || ''));
  if (!signatar || !signatar.signerUrl) return { ok: false, error: 'Ugyldig signeringslenke', status: 404 };
  if (signatar.status === 'SIGNERT') return { ok: false, error: 'Du har allerede signert dette dokumentet', status: 409 };
  const paaTur = signatarerPaaTur(jobb).some((s) => s.sid === signatar.sid);
  if (!paaTur) return { ok: false, error: 'Det er ikke din tur ennå — du får e-post når forrige signatar er ferdig', status: 425 };

  const mat = await hentMateriale(db);
  const oppdaterXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<direct-signer-update-request xmlns="http://signering.posten.no/schema/v1"><redirect-url/></direct-signer-update-request>';
  const res = await postenKall({
    metode: 'POST',
    url: signatar.signerUrl,
    headers: { 'Content-Type': 'application/xml', Accept: 'application/xml', 'Content-Length': String(Buffer.byteLength(oppdaterXml)) },
    body: Buffer.from(oppdaterXml, 'utf8'),
    tls: mat.tls,
  });
  const svar = res.body.toString('utf8');
  if (res.status < 200 || res.status >= 300) {
    return { ok: false, error: `Kunne ikke hente signeringsside (HTTP ${res.status})`, status: 502 };
  }
  const redirectUrl = hentTag(svar, 'redirect-url');
  if (!redirectUrl) return { ok: false, error: 'Uventet svar fra Posten', status: 502 };
  return { ok: true, redirectUrl };
}

// ── Kanseller aktivt oppdrag ─────────────────────────────────────────────────
export async function kansellerSignering(db, jobbId, av = '') {
  const jobb = await db.collection(SIGN_JOBB_COLL).findOne({ id: String(jobbId || '') });
  if (!jobb) return { ok: false, error: 'Signeringsjobb ikke funnet', status: 404 };
  if (jobb.status !== 'I_GANG') return { ok: false, error: 'Jobben er ikke aktiv', status: 400 };
  const now = new Date().toISOString();
  if (jobb.flyt === 'direkte') {
    // Direkteflyt har ingen kanseller-API hos Posten — vi sperrer i stedet
    // signeringslenkene våre (hentSignerRedirect nekter), så ingen kommer inn.
    await db.collection(SIGN_JOBB_COLL).updateOne({ id: jobb.id }, { $set: { status: 'KANSELLERT', kansellertAv: String(av).slice(0, 120), oppdatert: now } });
    return { ok: true };
  }
  const mat = await hentMateriale(db);
  const res = await postenKall({
    metode: 'POST',
    url: jobb.cancellationUrl,
    headers: { Accept: 'application/xml', 'Content-Length': '0' },
    tls: mat.tls,
  });
  if (res.status < 200 || res.status >= 300 && res.status !== 409) {
    return { ok: false, error: `Kansellering feilet (HTTP ${res.status})`, status: 502 };
  }
  await db.collection(SIGN_JOBB_COLL).updateOne({ id: jobb.id }, { $set: { status: 'KANSELLERT', kansellertAv: String(av).slice(0, 120), oppdatert: now } });
  return { ok: true };
}

// ── Statuspolling: henter én endring om gangen fra køen til den er tom.
//    VIKTIG: bekreft (confirmation-url) FØRST etter at DB-oppdatering og
//    PAdES-nedlasting er trygt lagret — køen er destruktiv. ─────────────────
const SIGNATAR_STATUS = { SIGNED: 'SIGNERT', REJECTED: 'AVVIST', EXPIRED: 'UTLOPT', WAITING: 'VENTER', BLOCKED: 'BLOKKERT', RESERVED: 'RESERVERT', CONTACT_INFORMATION_MISSING: 'MANGLER_KONTAKTINFO', NOT_APPLICABLE: 'IKKE_AKTUELL', FAILED: 'FEILET' };
const JOBB_STATUS = { IN_PROGRESS: 'I_GANG', COMPLETED_SUCCESSFULLY: 'FULLFORT', FAILED: 'FEILET' };

export async function pollSignering(db, { maks = 15 } = {}) {
  const cfg = await db.collection(SIGN_CONFIG_COLL).findOne({ id: 'posten' });
  if (!(cfg && cfg.p12) && !process.env.POSTEN_P12_B64) return { ok: false, error: 'Ikke konfigurert', skip: true };
  const aktivePortal = await db.collection(SIGN_JOBB_COLL).countDocuments({ status: 'I_GANG', flyt: { $ne: 'direkte' } });
  const aktiveDirekte = await db.collection(SIGN_JOBB_COLL).countDocuments({ status: 'I_GANG', flyt: 'direkte' });
  const aktive = aktivePortal + aktiveDirekte;
  if (!aktive) return { ok: true, aktive: 0, hendelser: 0 };
  if (cfg && cfg.nestePoll && new Date(cfg.nestePoll) > new Date()) return { ok: true, venter: true, nestePoll: cfg.nestePoll, hendelser: 0 };
  const mat = await hentMateriale(db);
  let hendelser = 0;
  // Poll begge køene (portal = eldre jobber, direkte = nye) til de er tomme
  const flows = [];
  if (aktivePortal) flows.push({ url: `${BASE()}/portal/signature-jobs?polling_queue=${encodeURIComponent(mat.ko)}`, direkte: false });
  if (aktiveDirekte) flows.push({ url: `${BASE()}/direct/signature-jobs?polling_queue=${encodeURIComponent(mat.ko)}`, direkte: true });
  for (const flow of flows) {
    for (let i = 0; i < maks; i += 1) {
      const res = await postenKall({
        metode: 'GET',
        url: flow.url,
        headers: { Accept: 'application/xml' },
        tls: mat.tls,
      });
      const nesteHeader = res.headers['x-next-permitted-poll-time'];
      if (nesteHeader) {
        await db.collection(SIGN_CONFIG_COLL).updateOne({ id: 'posten' }, { $set: { nestePoll: new Date(nesteHeader).toISOString(), sistPoll: new Date().toISOString() } }, { upsert: true });
      } else {
        await db.collection(SIGN_CONFIG_COLL).updateOne({ id: 'posten' }, { $set: { sistPoll: new Date().toISOString() } }, { upsert: true });
      }
      if (res.status === 204 || res.status === 429) break; // tom kø eller for tidlig
      if (res.status < 200 || res.status >= 300) break;

      const xml = res.body.toString('utf8');
      try {
        if (flow.direkte) await behandleDirectStatus(db, mat, xml);
        else await behandleStatusEndring(db, mat, xml);
        hendelser += 1;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[signering] klarte ikke behandle statusendring:', e && e.message);
        break; // ikke bekreftet → kommer tilbake i køen om 10 min
      }
    }
  }
  return { ok: true, aktive, hendelser };
}

// ── Automatisk purring når fristen nærmer seg ────────────────────────────────
// Sender én automatisk påminnelse per runde når ≤3 dager gjenstår av fristen
// (og runden er minst ett døgn gammel, slik at korte frister ikke purres
// umiddelbart). Kalles fra cron-endepunktet hvert minutt — flagget
// autoPurretAt sørger for at det aldri sendes mer enn én gang.
export async function autoPurring(db) {
  const naa = Date.now();
  const jobber = await db.collection(SIGN_JOBB_COLL)
    .find({ status: 'I_GANG', autoPurretAt: { $exists: false } })
    .toArray();
  let sendt = 0;
  for (const jobb of jobber) {
    const opprettetMs = new Date(jobb.opprettet || 0).getTime();
    const fristMs = opprettetMs + (Number(jobb.dagerFrist) || 10) * 86400000;
    const igjen = fristMs - naa;
    if (igjen <= 0 || igjen > 3 * 86400000) continue; // ikke i purrevinduet
    if (naa - opprettetMs < 86400000) continue; // for fersk runde
    for (const s of signatarerPaaTur(jobb)) {
      if (await sendSignaturEpost(jobb, s)) {
        sendt += 1;
        await db.collection(SIGN_JOBB_COLL).updateOne(
          { id: jobb.id, 'signatarer.sid': s.sid },
          { $set: { 'signatarer.$.purretAt': new Date().toISOString() } },
        ).catch(() => {});
      }
    }
    await db.collection(SIGN_JOBB_COLL).updateOne({ id: jobb.id }, { $set: { autoPurretAt: new Date().toISOString() } });
    try {
      const { filLogg } = await import('./dokumenter');
      await filLogg(db, jobb.filId, 'Automatisk påminnelse sendt — fristen nærmer seg', '');
    } catch (e) { /* stille */ }
  }
  return { ok: true, sendt };
}

// ── Presis «poll så snart Posten tillater det» ────────────────────────────────
// Posten håndhever X-Next-Permitted-Poll-Time og STRAFFER for tidlig polling
// med eskalerende 429-vinduer. Derfor: aldri nullstill ventetiden og poll
// blindt — planlegg i stedet en engangs-poll i det sekundet vinduet åpner.
// Brukes av exit-sidene (signatar har nettopp signert/avvist) og av den
// manuelle Oppdater-knappen. Én ventende timer om gangen per prosess.
let _pollTimer = null;
export async function pollSnarest(db) {
  const cfg = await db.collection(SIGN_CONFIG_COLL).findOne({ id: 'posten' }, { projection: { nestePoll: 1 } });
  const naa = Date.now();
  const tillatt = cfg && cfg.nestePoll ? new Date(cfg.nestePoll).getTime() : naa;
  const delay = Math.max(0, tillatt - naa) + 750; // liten margin mot klokkeskjevhet
  if (delay > 15 * 60 * 1000) return { ok: true, planlagt: false, nestePoll: cfg?.nestePoll || null }; // cron tar den
  if (_pollTimer) clearTimeout(_pollTimer);
  _pollTimer = setTimeout(() => {
    _pollTimer = null;
    pollSignering(db).catch(() => {});
  }, delay);
  if (_pollTimer.unref) _pollTimer.unref();
  return { ok: true, planlagt: true, omMs: delay, nestePoll: cfg?.nestePoll || null };
}

// ── Felles etterbehandling ved fullført/stoppet runde ────────────────────────
// (1) In-app-varsler til avsender + sakseier/følgere. (2) Auto-arkivering av
// det signerte dokumentet hvis runden ble opprettet med det valget. Feiler
// alltid stille — statusbehandlingen skal aldri veltes av etterarbeid.
async function etterStatusOppdatering(db, jobb, jobbStatus, now) {
  if (jobbStatus !== 'FULLFORT' && jobbStatus !== 'FEILET') return;
  try {
    const mottakere = new Set(jobb.avId ? [jobb.avId] : []);
    let varselTaskId = null;
    let varselTittel = jobb.tittel || jobb.filNavn || 'Dokument';
    if (jobb.taskId && jobb.taskId !== 'DOKUMENTER') {
      const vTask = await db.collection('tasks').findOne({ id: jobb.taskId }, { projection: { id: 1, title: 1, assigneeId: 1, followers: 1 } });
      if (vTask) {
        varselTaskId = vTask.id;
        varselTittel = vTask.title || varselTittel;
        if (vTask.assigneeId) mottakere.add(vTask.assigneeId);
        for (const f of (vTask.followers || [])) if (f) mottakere.add(f);
      }
    }
    const varselTekst = jobbStatus === 'FULLFORT'
      ? `Alle har signert «${jobb.tittel}» med BankID — signert PDF ligger klar`
      : `Signeringsrunden for «${jobb.tittel}» stoppet (avvist eller utløpt)`;
    for (const uid of mottakere) {
      await db.collection('notifications').insertOne({
        id: crypto.randomUUID(), userId: uid, type: 'status', taskId: varselTaskId,
        taskTitle: String(varselTittel).slice(0, 200), actor: 'Posten signering',
        text: varselTekst.slice(0, 300), read: false, createdAt: now,
      }).catch(() => {});
    }
  } catch (e) { /* stille */ }
  if (jobbStatus === 'FULLFORT' && jobb.autoArkiv && jobb.autoArkiv.aktiv) {
    try {
      const { settArkiv } = await import('./dokumenter');
      await settArkiv(db, jobb.filId, { aktiv: true, synlighet: jobb.autoArkiv.synlighet || 'styret' }, 'Posten signering');
    } catch (e) { /* stille */ }
  }
}

// Direkteflyt: per-signatar-status via signer-attributtet (= vår sid).
// Ved sekvensiell rekkefølge sendes e-post til nestemann når forrige signerer.
async function behandleDirectStatus(db, mat, xml) {
  const postenJobId = hentTag(xml, 'signature-job-id');
  const raaJobbStatus = (xml.match(/<(?:[\w-]+:)?signature-job-status>([^<]*)<\/(?:[\w-]+:)?signature-job-status>/) || [])[1] || '';
  const jobbStatus = JOBB_STATUS[raaJobbStatus] || raaJobbStatus || 'UKJENT';
  const confirmationUrl = hentTag(xml, 'confirmation-url');
  const padesUrl = hentTag(xml, 'pades-url');
  const jobb = await db.collection(SIGN_JOBB_COLL).findOne({ postenJobId, flyt: 'direkte' });
  const now = new Date().toISOString();

  if (jobb) {
    const oppdaterte = (jobb.signatarer || []).map((s) => ({ ...s }));
    // <status signer="sid" since="...">SIGNED</status> (signer-attr mangler ved én signatar)
    const statuser = [...xml.matchAll(/<(?:[\w-]+:)?status\b([^>]*)>([^<]*)<\/(?:[\w-]+:)?status>/g)];
    statuser.forEach(([, attrs, verdi], idx) => {
      const sid = (attrs.match(/signer="([^"]*)"/) || [])[1] || '';
      const siden = (attrs.match(/since="([^"]*)"/) || [])[1] || null;
      let mål = sid ? oppdaterte.find((s) => s.sid === sid) : null;
      if (!mål && !sid && oppdaterte.length === 1) mål = oppdaterte[0];
      if (!mål && oppdaterte[idx]) mål = oppdaterte[idx];
      if (mål) {
        const st = verdi.trim();
        mål.status = SIGNATAR_STATUS[st] || st || mål.status;
        if (st === 'SIGNED') mål.signertAt = siden || now;
      }
    });

    let signertVersjon = null;
    if (jobbStatus === 'FULLFORT' && padesUrl) {
      const pades = await postenKall({
        metode: 'GET', url: padesUrl, headers: { Accept: 'application/octet-stream, application/pdf' },
        tls: mat.tls,
      });
      if (pades.status >= 200 && pades.status < 300 && pades.body.length > 500) {
        const { nyVersjon } = await import('./dokumenter');
        const nyttNavn = String(jobb.filNavn || 'dokument.pdf').replace(/\.pdf$/i, '') + ' (signert).pdf';
        const r = await nyVersjon(db, jobb.filId, {
          name: nyttNavn, type: 'application/pdf',
          data: pades.body.toString('base64'),
        }, 'Posten signering', { laas: true, loggTekst: 'Signert PAdES-dokument mottatt fra Posten signering' });
        if (r.ok) signertVersjon = r.versjon;
      } else {
        throw new Error(`PAdES-nedlasting feilet (HTTP ${pades.status})`);
      }
    }

    await db.collection(SIGN_JOBB_COLL).updateOne(
      { id: jobb.id },
      { $set: { status: jobbStatus, signatarer: oppdaterte, padesHentet: !!signertVersjon, signertVersjon, oppdatert: now } },
    );

    // Sekvensiell: send e-post til nestemann som nå har fått tur
    if (jobbStatus === 'I_GANG') {
      const oppdatertJobb = { ...jobb, signatarer: oppdaterte };
      for (const s of signatarerPaaTur(oppdatertJobb)) {
        if (!s.epostSendtAt) {
          const sendt = await sendSignaturEpost(oppdatertJobb, s);
          if (sendt) {
            await db.collection(SIGN_JOBB_COLL).updateOne(
              { id: jobb.id, 'signatarer.sid': s.sid },
              { $set: { 'signatarer.$.epostSendtAt': new Date().toISOString() } },
            );
          }
        }
      }
    }

    const antallSignert = oppdaterte.filter((s) => s.status === 'SIGNERT').length;
    const tekst = jobbStatus === 'FULLFORT'
      ? `Alle har signert «${jobb.tittel}» — signert PDF lagret som ny versjon`
      : jobbStatus === 'FEILET'
        ? `Signeringsrunden for «${jobb.tittel}» stoppet (avvist eller utløpt)`
        : `Signeringsstatus for «${jobb.tittel}»: ${antallSignert}/${oppdaterte.length} har signert`;
    await db.collection('tasks').updateOne(
      { id: jobb.taskId },
      { $push: { activity: { at: now, actor: 'Posten signering', text: tekst } }, $set: { updatedAt: now } },
    ).catch(() => {});
    await db.collection('task_files').updateOne(
      { id: jobb.filId },
      { $set: { 'signering.status': jobbStatus, 'signering.oppdatert': now }, $push: { logg: { at: now, av: 'Posten signering', tekst } } },
    ).catch(() => {});
    await etterStatusOppdatering(db, jobb, jobbStatus, now);
  }

  // Bekreft mottak — ETTER at alt er lagret
  if (confirmationUrl) {
    const bekreft = await postenKall({
      metode: 'POST', url: confirmationUrl, headers: { 'Content-Length': '0' },
      tls: mat.tls,
    });
    if (bekreft.status < 200 || bekreft.status >= 300) throw new Error(`Bekreftelse feilet (HTTP ${bekreft.status})`);
  }
}

async function behandleStatusEndring(db, mat, xml) {
  const referanse = hentTag(xml, 'reference');
  const postenJobId = hentTag(xml, 'signature-job-id');
  const raaStatus = hentTag(xml, 'status')?.replace(/<[^>]*>/g, '').trim();
  const jobbStatus = JOBB_STATUS[raaStatus] || raaStatus || 'UKJENT';
  const confirmationUrl = hentTag(xml, 'confirmation-url');
  const padesUrl = hentTag(xml, 'pades-url');

  const jobb = referanse
    ? await db.collection(SIGN_JOBB_COLL).findOne({ id: referanse })
    : await db.collection(SIGN_JOBB_COLL).findOne({ postenJobId });
  const now = new Date().toISOString();

  if (jobb) {
    // Per-signatar-status: match på e-post (identifier) eller rekkefølge
    const signaturBlokker = [...xml.matchAll(/<(?:[\w-]+:)?signature>([\s\S]*?)<\/(?:[\w-]+:)?signature>/g)].map((m) => m[1]);
    const oppdaterte = (jobb.signatarer || []).map((s) => ({ ...s }));
    signaturBlokker.forEach((blokk, idx) => {
      const st = (blokk.match(/<(?:[\w-]+:)?status[^>]*>([^<]*)<\/(?:[\w-]+:)?status>/) || [])[1] || '';
      const siden = (blokk.match(/<(?:[\w-]+:)?status[^>]*since="([^"]*)"/) || [])[1] || null;
      const epost = (blokk.match(/<(?:[\w-]+:)?email[^>]*address="([^"]*)"/) || [])[1] || '';
      const mobil = (blokk.match(/<(?:[\w-]+:)?sms[^>]*number="([^"]*)"/) || [])[1] || '';
      let mål = null;
      if (epost) mål = oppdaterte.find((s) => s.epost && s.epost.toLowerCase() === epost.toLowerCase());
      if (!mål && mobil) mål = oppdaterte.find((s) => normMobil(s.mobil) === normMobil(mobil));
      if (!mål && oppdaterte[idx]) mål = oppdaterte[idx];
      if (mål) {
        mål.status = SIGNATAR_STATUS[st] || st || mål.status;
        if (st === 'SIGNED') mål.signertAt = siden || now;
      }
    });

    let signertVersjon = null;
    if (jobbStatus === 'FULLFORT' && padesUrl) {
      // Last ned signert PAdES-PDF og lagre som ny, låst versjon av dokumentet
      const pades = await postenKall({
        metode: 'GET', url: padesUrl, headers: { Accept: 'application/octet-stream, application/pdf' },
        tls: mat.tls,
      });
      if (pades.status >= 200 && pades.status < 300 && pades.body.length > 500) {
        const { nyVersjon } = await import('./dokumenter');
        const nyttNavn = String(jobb.filNavn || 'dokument.pdf').replace(/\.pdf$/i, '') + ' (signert).pdf';
        const r = await nyVersjon(db, jobb.filId, {
          name: nyttNavn, type: 'application/pdf',
          data: pades.body.toString('base64'),
        }, 'Posten signering', { laas: true, loggTekst: 'Signert PAdES-dokument mottatt fra Posten signering' });
        if (r.ok) signertVersjon = r.versjon;
      } else {
        throw new Error(`PAdES-nedlasting feilet (HTTP ${pades.status})`);
      }
    }

    await db.collection(SIGN_JOBB_COLL).updateOne(
      { id: jobb.id },
      { $set: { status: jobbStatus, signatarer: oppdaterte, padesHentet: !!signertVersjon, signertVersjon, oppdatert: now } },
    );
    // Aktivitet + in-app-varsel på saken
    const tekst = jobbStatus === 'FULLFORT'
      ? `Alle har signert «${jobb.tittel}» — signert PDF lagret som ny versjon`
      : jobbStatus === 'FEILET'
        ? `Signeringsrunden for «${jobb.tittel}» stoppet (avvist/utløpt)`
        : `Signeringsstatus oppdatert for «${jobb.tittel}»: ${oppdaterte.filter((s) => s.status === 'SIGNERT').length}/${oppdaterte.length} har signert`;
    await db.collection('tasks').updateOne(
      { id: jobb.taskId },
      { $push: { activity: { at: now, actor: 'Posten signering', text: tekst } }, $set: { updatedAt: now } },
    ).catch(() => {});
    await db.collection('task_files').updateOne(
      { id: jobb.filId },
      { $set: { 'signering.status': jobbStatus, 'signering.oppdatert': now }, $push: { logg: { at: now, av: 'Posten signering', tekst } } },
    ).catch(() => {});
    await etterStatusOppdatering(db, jobb, jobbStatus, now);
  }

  // Bekreft mottak — ETTER at alt er lagret
  if (confirmationUrl) {
    const bekreft = await postenKall({
      metode: 'POST', url: confirmationUrl, headers: { 'Content-Length': '0' },
      tls: mat.tls,
    });
    if (bekreft.status < 200 || bekreft.status >= 300) throw new Error(`Bekreftelse feilet (HTTP ${bekreft.status})`);
  }
}

export async function listSigneringsjobber(db, filId) {
  return db.collection(SIGN_JOBB_COLL)
    .find(filId ? { filId: String(filId) } : {}, { projection: { _id: 0 } })
    .sort({ opprettet: -1 })
    .limit(30)
    .toArray();
}
