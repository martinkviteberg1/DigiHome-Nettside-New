// Test av ASiC-E/XAdES-bygging: bygger pakke med testsertifikat og verifiserer
// (1) zip-struktur, (2) alle digests, (3) RSA-signaturen over SignedInfo.
import crypto from 'node:crypto';
import fs from 'node:fs';
import JSZip from 'jszip';
import { parseP12, lagAsice, byggManifest } from '../lib/signering.js';

const p12b64 = fs.readFileSync('/tmp/sert/test.p12').toString('base64');
const info = parseP12(p12b64, 'test123');
console.log('P12 OK — subject:', info.subjectCN, '| utløper:', info.utloper, '| kjede:', info.kjedeB64.length);

const pdf = Buffer.from('%PDF-1.4 testdokument for signering');
const manifestXml = byggManifest({
  signatarer: [
    { navn: 'Martin', epost: 'martin@example.com', mobil: '+47 900 00 000', rekkefolge: 1 },
    { navn: 'Anna', epost: 'anna@example.com', rekkefolge: 2 },
  ],
  tittel: 'Styreprotokoll Q1 <test> & Co',
  melding: 'Vennligst signer.',
  dagerFrist: 10,
});
console.log('MANIFEST:', manifestXml.slice(0, 400));

const asice = await lagAsice({
  pdf, manifestXml,
  keyPem: info.keyPem, kjedeB64: info.kjedeB64, leafDer: info.leafDer,
  issuerAttrs: info.issuerAttrs, serialNumberHex: info.serialNumberHex,
});
console.log('ASICE størrelse:', asice.length, 'bytes');

// Verifiser
const zip = await JSZip.loadAsync(asice);
const filnavn = Object.keys(zip.files);
console.log('ZIP-innhold:', filnavn);
const sigXml = await zip.file('META-INF/signatures.xml').async('string');
const zPdf = await zip.file('document.pdf').async('nodebuffer');
const zMan = await zip.file('manifest.xml').async('nodebuffer');

const dg = (b) => crypto.createHash('sha256').update(b).digest('base64');
const dgPdf = sigXml.match(/URI="document.pdf">.*?<DigestValue>([^<]+)</s)[1];
const dgMan = sigXml.match(/URI="manifest.xml">.*?<DigestValue>([^<]+)</s)[1];
console.log('PDF-digest OK:', dgPdf === dg(zPdf));
console.log('Manifest-digest OK:', dgMan === dg(zMan));

// SignedProperties-digest: kanonisk = selve elementet slik det står (kompakt, med xmlns)
const spStart = sigXml.indexOf('<SignedProperties');
const spSlutt = sigXml.indexOf('</SignedProperties>') + '</SignedProperties>'.length;
const sp = sigXml.slice(spStart, spSlutt);
const dgSp = sigXml.match(/#SignedProperties">.*?<DigestValue>([^<]+)</s)[1];
console.log('SignedProperties-digest OK:', dgSp === dg(Buffer.from(sp, 'utf8')));

// Signaturverifikasjon over SignedInfo
const siStart = sigXml.indexOf('<SignedInfo');
const siSlutt = sigXml.indexOf('</SignedInfo>') + '</SignedInfo>'.length;
const si = sigXml.slice(siStart, siSlutt);
const sigVal = sigXml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)[1];
const pubPem = fs.readFileSync('/tmp/sert/testcert.pem', 'utf8');
const ok = crypto.verify('RSA-SHA256', Buffer.from(si, 'utf8'), crypto.createPublicKey(pubPem), Buffer.from(sigVal, 'base64'));
console.log('RSA-SHA256-signatur OK:', ok);

// Sjekk kanoniske krav: ingen self-closing-tagger i signerte deler
console.log('Ingen self-closing i signatures.xml:', !/\/>/.test(sigXml.replace(/<\?xml[^>]*\?>/, '')));
console.log(ok && dgPdf === dg(zPdf) && dgMan === dg(zMan) && dgSp === dg(Buffer.from(sp, 'utf8')) ? '✅ ALLE SJEKKER BESTÅTT' : '❌ NOE FEILET');
