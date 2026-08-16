'use client';

/* ═══════════════ Offentlig signeringsside — forhåndsvisning før BankID ═══════
   Signataren lander her fra DigiHome-e-posten: ser HELE dokumentet (rendret
   side for side med pdf.js), tittel, melding, frist og hvem som signerer —
   før de klikker «Signer med BankID» og sendes til Posten. Rolig, premium
   DigiHome-flate. Tilgang krever gyldig jobbId+sid (to uuid-er fra e-posten). */

import { useEffect, useRef, useState, use } from 'react';

const fmtDatoNb = (iso) => new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

export default function SignerDokumentSide({ params }) {
  const p = typeof params?.then === 'function' ? use(params) : params;
  const jobbId = p?.jobbId || '';
  const sid = p?.sid || '';

  const [info, setInfo] = useState(null);
  const [feil, setFeil] = useState('');
  const [sider, setSider] = useState(0);
  const [rendret, setRendret] = useState(0);
  const [pdfFeil, setPdfFeil] = useState(false);
  const beholderRef = useRef(null);

  // 1) Hent visningsdata
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/signer-info/${jobbId}/${sid}`);
        const j = await r.json();
        if (!j.ok) { setFeil(j.error || 'Signeringslenken er ugyldig'); return; }
        setInfo(j);
      } catch (e) { setFeil('Kunne ikke laste signeringsoppdraget — prøv igjen'); }
    })();
  }, [jobbId, sid]);

  // 2) Render PDF-en side for side (pdf.js — fungerer likt på mobil og desktop)
  useEffect(() => {
    if (!info) return undefined;
    let avbrutt = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const res = await fetch(`/api/signer-dokument/${jobbId}/${sid}`);
        if (!res.ok) throw new Error('dokument');
        const data = await res.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        if (avbrutt) return;
        setSider(doc.numPages);
        const beholder = beholderRef.current;
        if (!beholder) return;
        beholder.innerHTML = '';
        const bredde = Math.min(beholder.clientWidth || 680, 760);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages; n += 1) {
          if (avbrutt) return;
          const side = await doc.getPage(n);
          const vp0 = side.getViewport({ scale: 1 });
          const skala = bredde / vp0.width;
          const vp = side.getViewport({ scale: skala * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
          canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
          canvas.style.display = 'block';
          canvas.style.background = '#fff';
          canvas.style.borderRadius = '10px';
          canvas.style.boxShadow = '0 2px 18px -6px rgba(28,25,23,0.22)';
          canvas.style.margin = '0 auto 14px';
          canvas.style.maxWidth = '100%';
          beholder.appendChild(canvas);
          await side.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          setRendret(n);
        }
      } catch (e) {
        if (!avbrutt) setPdfFeil(true);
      }
    })();
    return () => { avbrutt = true; };
  }, [info, jobbId, sid]);

  const S = {
    side: { minHeight: '100dvh', background: '#f6f5f2', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", paddingBottom: 110 },
    topp: { maxWidth: 800, margin: '0 auto', padding: '22px 18px 0' },
    kort: { maxWidth: 800, margin: '14px auto 0', background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 18, padding: '24px 24px 20px' },
    etikett: { margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#8b5cf6' },
    tittel: { margin: '6px 0 0', fontSize: 22, lineHeight: 1.3, letterSpacing: '-0.015em', color: '#0a0a0a', fontWeight: 700 },
    meta: { margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: '#78716c' },
    dokOmr: { maxWidth: 800, margin: '18px auto 0', padding: '0 18px' },
    bunn: { position: 'fixed', left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(0,0,0,0.07)', padding: '12px 18px calc(12px + env(safe-area-inset-bottom))' },
    bunnInn: { maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
    knapp: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0a0a0a', color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '14px 28px', borderRadius: 999, border: 'none', cursor: 'pointer' },
  };

  if (feil) {
    return (
      <main style={{ ...S.side, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 0 }}>
        <div style={{ ...S.kort, maxWidth: 440, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0a0a0a' }}>DigiHome</p>
          <h1 style={{ margin: '16px 0 0', fontSize: 19, color: '#0a0a0a' }}>Lenken virker ikke</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: '#78716c' }}>{feil}</p>
        </div>
      </main>
    );
  }
  if (!info) {
    return (
      <main style={{ ...S.side, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 0 }}>
        <p style={{ fontSize: 13, color: '#a8a29a' }}>Laster signeringsoppdraget …</p>
      </main>
    );
  }

  const alleredeSignert = info.signatar?.status === 'SIGNERT';
  const avsluttet = info.jobbStatus !== 'I_GANG';
  const kanSignere = info.paaTur && !alleredeSignert && !avsluttet;

  return (
    <main style={S.side}>
      {/* Topp */}
      <div style={S.topp}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: '#0a0a0a' }}>DigiHome</p>
      </div>

      {/* Oppdragskort */}
      <div style={S.kort}>
        <p style={S.etikett}>Til signering</p>
        <h1 style={S.tittel}>{info.tittel}</h1>
        {info.melding && <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.65, color: '#555' }}>{info.melding}</p>}
        <p style={S.meta}>
          Fra <strong style={{ color: '#44403c' }}>{info.avsender}</strong>
          {info.signatar?.navn ? <> · Du signerer som <strong style={{ color: '#44403c' }}>{info.signatar.navn}</strong></> : null}
          {' '}· Frist <strong style={{ color: '#44403c' }}>{fmtDatoNb(info.frist)}</strong>
          {info.antall > 1 ? <> · {info.signert} av {info.antall} har signert</> : null}
        </p>
        {alleredeSignert && (
          <p style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 600, color: '#059669', background: '#ecfdf5', borderRadius: 10, padding: '10px 14px' }}>Du har allerede signert dette dokumentet. Takk!</p>
        )}
        {!alleredeSignert && avsluttet && (
          <p style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 600, color: '#78716c', background: '#faf9f7', borderRadius: 10, padding: '10px 14px' }}>
            {info.jobbStatus === 'FULLFORT' ? 'Signeringsrunden er fullført.' : info.jobbStatus === 'KANSELLERT' ? 'Signeringsrunden er kansellert av avsenderen.' : 'Signeringsrunden er avsluttet.'}
          </p>
        )}
        {!alleredeSignert && !avsluttet && !info.paaTur && (
          <p style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 600, color: '#9a6b1c', background: '#fdf6e7', borderRadius: 10, padding: '10px 14px' }}>Det er ikke din tur ennå — du får e-post når forrige signatar er ferdig.</p>
        )}
      </div>

      {/* Dokumentforhåndsvisning */}
      <div style={S.dokOmr} data-testid="signer-dokument-visning">
        <p style={{ margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a29a', textAlign: 'center' }}>
          Dokumentet{sider ? ` · ${sider} side${sider === 1 ? '' : 'r'}` : ''}
        </p>
        {pdfFeil ? (
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '26px 20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13.5, color: '#78716c' }}>Forhåndsvisningen kunne ikke lastes.</p>
            <a href={`/api/signer-dokument/${jobbId}/${sid}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 10, fontSize: 13.5, fontWeight: 600, color: '#8b5cf6' }}>Åpne dokumentet (PDF) →</a>
          </div>
        ) : (
          <>
            {rendret === 0 && <p style={{ textAlign: 'center', fontSize: 12.5, color: '#b0aca6', padding: '18px 0' }}>Laster dokumentet …</p>}
            <div ref={beholderRef} />
          </>
        )}
        <p style={{ margin: '4px 0 0', textAlign: 'center' }}>
          <a href={`/api/signer-dokument/${jobbId}/${sid}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#a8a29a', textDecoration: 'underline' }}>Last ned PDF</a>
        </p>
      </div>

      {/* Signeringslinje */}
      <div style={S.bunn}>
        <div style={S.bunnInn}>
          <div style={{ flex: '1 1 auto', minWidth: 180 }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#a8a29a' }}>
              Signeringen utføres trygt hos <strong style={{ color: '#78716c' }}>Posten signering</strong> med <strong style={{ color: '#78716c' }}>BankID</strong>
            </p>
          </div>
          {kanSignere ? (
            <a href={`/api/signer/${jobbId}/${sid}`} style={S.knapp} data-testid="signer-bankid-knapp">
              Signer med BankID
              <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>→</span>
            </a>
          ) : (
            <span style={{ ...S.knapp, background: '#e7e5e0', color: '#a8a29a', cursor: 'default' }}>
              {alleredeSignert ? 'Allerede signert' : avsluttet ? 'Avsluttet' : 'Venter på din tur'}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
