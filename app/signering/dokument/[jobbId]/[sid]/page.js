'use client';

/* ═══════════════ Offentlig signeringsside — forhåndsvisning før BankID ═══════
   Verdensklasse, rolig DigiHome-flate: brand-typografi (Right Grotesk +
   Diatype), dokumentet rendret side for side (pdf.js), responsivt oppsett —
   desktop: dokument + sticky sidepanel · mobil: stablet med sticky
   BankID-linje nederst. Tilgang krever gyldig jobbId+sid fra e-posten. */

import { useEffect, useRef, useState, use } from 'react';

const fmtDatoNb = (iso) => new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtKort = (iso) => new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });

const STATUS_PRIKK = {
  SIGNERT: 'bg-emerald-500',
  VENTER: 'bg-[#d6d3cd]',
  AVVIST: 'bg-rose-500',
  UTLOPT: 'bg-amber-500',
};

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

  // 1) Visningsdata
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

  // 2) Render PDF side for side (pdf.js — likt på mobil og desktop)
  useEffect(() => {
    if (!info) return undefined;
    let avbrutt = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';
        const res = await fetch(`/api/signer-dokument/${jobbId}/${sid}`);
        if (!res.ok) throw new Error('dokument');
        const data = await res.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        if (avbrutt) return;
        setSider(doc.numPages);
        const beholder = beholderRef.current;
        if (!beholder) return;
        beholder.innerHTML = '';
        const bredde = Math.min(beholder.clientWidth || 680, 820);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages; n += 1) {
          if (avbrutt) return;
          const side = await doc.getPage(n);
          const vp0 = side.getViewport({ scale: 1 });
          const skala = bredde / vp0.width;
          const vp = side.getViewport({ scale: skala * dpr });
          const ramme = document.createElement('div');
          ramme.style.cssText = 'margin:0 auto 22px;max-width:100%;';
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.cssText = `width:${Math.floor(vp.width / dpr)}px;height:${Math.floor(vp.height / dpr)}px;display:block;background:#fff;border-radius:6px;box-shadow:0 1px 2px rgba(28,25,23,0.06),0 14px 40px -18px rgba(28,25,23,0.25);border:1px solid rgba(0,0,0,0.05);max-width:100%;margin:0 auto;`;
          const tall = document.createElement('p');
          tall.textContent = `Side ${n} av ${doc.numPages}`;
          tall.style.cssText = 'margin:9px 0 0;text-align:center;font-size:10.5px;letter-spacing:0.06em;color:#b8b4ad;font-variant-numeric:tabular-nums;';
          ramme.appendChild(canvas);
          ramme.appendChild(tall);
          beholder.appendChild(ramme);
          await side.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          setRendret(n);
        }
      } catch (e) {
        if (!avbrutt) setPdfFeil(true);
      }
    })();
    return () => { avbrutt = true; };
  }, [info, jobbId, sid]);

  /* ── Feiltilstand / lasting ─────────────────────────────────────────────── */
  if (feil) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f5f4f1] px-4 font-body">
        <div className="w-full max-w-[420px] rounded-2xl border border-black/[0.07] bg-white p-8 text-center shadow-[0_14px_40px_-20px_rgba(28,25,23,0.2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="mx-auto h-[17px] w-auto" />
          <h1 className="mt-7 font-heading text-[19px] font-bold tracking-tight text-[#0a0a0a]">Lenken virker ikke</h1>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#78716c]">{feil}</p>
        </div>
      </main>
    );
  }
  if (!info) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f5f4f1] font-body">
        <div className="flex items-center gap-2.5 text-[13px] text-[#a8a29a]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[#d6d3cd] border-t-[#57534e]" />
          Laster signeringsoppdraget …
        </div>
      </main>
    );
  }

  const alleredeSignert = info.signatar?.status === 'SIGNERT';
  const avsluttet = info.jobbStatus !== 'I_GANG';
  const kanSignere = info.paaTur && !alleredeSignert && !avsluttet;
  const flere = (info.signatarer || []).length > 1;

  const StatusMelding = () => {
    if (alleredeSignert) return (
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-[13px] font-medium leading-relaxed text-emerald-800">
        <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        Du har allerede signert dette dokumentet. Takk!
      </div>
    );
    if (avsluttet) return (
      <div className="mt-4 rounded-xl bg-[#f5f4f1] px-3.5 py-3 text-[13px] font-medium leading-relaxed text-[#78716c]">
        {info.jobbStatus === 'FULLFORT' ? 'Signeringsrunden er fullført — alle har signert.' : info.jobbStatus === 'KANSELLERT' ? 'Signeringsrunden er kansellert av avsenderen.' : 'Signeringsrunden er avsluttet.'}
      </div>
    );
    if (!info.paaTur) return (
      <div className="mt-4 rounded-xl bg-[#fdf6e7] px-3.5 py-3 text-[13px] font-medium leading-relaxed text-[#9a6b1c]">
        Det er ikke din tur ennå — du får e-post når forrige signatar er ferdig.
      </div>
    );
    return null;
  };

  const SignerKnapp = ({ bred = false }) => kanSignere ? (
    <a
      href={`/api/signer/${jobbId}/${sid}`}
      data-testid="signer-bankid-knapp"
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-7 py-[15px] text-[15px] font-semibold text-white shadow-[0_10px_26px_-12px_rgba(10,10,10,0.5)] transition-all hover:bg-black hover:shadow-[0_14px_30px_-12px_rgba(10,10,10,0.55)] active:scale-[0.99] ${bred ? 'w-full' : ''}`}
    >
      Signer med BankID
      <span aria-hidden className="translate-x-0 text-[17px] leading-none transition-transform group-hover:translate-x-0.5">→</span>
    </a>
  ) : (
    <span className={`inline-flex items-center justify-center rounded-full bg-[#eceae5] px-7 py-[15px] text-[14.5px] font-semibold text-[#a8a29a] ${bred ? 'w-full' : ''}`}>
      {alleredeSignert ? 'Allerede signert' : avsluttet ? 'Avsluttet' : 'Venter på din tur'}
    </span>
  );

  const InfoPanel = ({ medKnapp }) => (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_16px_44px_-24px_rgba(28,25,23,0.16)] sm:p-7">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Til signering</p>
      <h1 className="mt-2.5 font-heading text-[23px] font-bold leading-[1.2] tracking-tight text-[#0a0a0a] sm:text-[26px]">{info.tittel}</h1>
      {info.melding && <p className="mt-3.5 text-[14px] leading-relaxed text-[#57534e]">{info.melding}</p>}

      {/* Meta — hårfine delelinjer */}
      <dl className="mt-5 border-t border-black/[0.06]">
        <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.05] py-2.5">
          <dt className="text-[12px] text-[#a8a29a]">Avsender</dt>
          <dd className="text-right text-[12.5px] font-semibold text-[#1c1917]">{info.avsender}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.05] py-2.5">
          <dt className="text-[12px] text-[#a8a29a]">Frist</dt>
          <dd className="text-right text-[12.5px] font-semibold tabular-nums text-[#1c1917]">{fmtDatoNb(info.frist)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.05] py-2.5">
          <dt className="text-[12px] text-[#a8a29a]">Dokument</dt>
          <dd className="min-w-0 truncate text-right text-[12.5px] font-semibold text-[#1c1917]">{info.filNavn}{sider ? <span className="font-normal text-[#a8a29a]"> · {sider} s.</span> : ''}</dd>
        </div>
      </dl>

      {/* Signatarer m/status */}
      {flere && (
        <div className="mt-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#b8b4ad]">Signatarer</p>
          <ul className="mt-2 space-y-1.5">
            {info.signatarer.map((s, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[13px]">
                <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${STATUS_PRIKK[s.status] || STATUS_PRIKK.VENTER}`} />
                <span className={`min-w-0 flex-1 truncate ${s.deg ? 'font-semibold text-[#0a0a0a]' : 'text-[#57534e]'}`}>{s.navn}{s.deg ? ' (deg)' : ''}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-[#b8b4ad]">
                  {s.status === 'SIGNERT' ? `Signert${s.signertAt ? ` ${fmtKort(s.signertAt)}` : ''}` : s.status === 'AVVIST' ? 'Avvist' : 'Venter'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <StatusMelding />

      {medKnapp && (
        <div className="mt-6">
          <SignerKnapp bred />
          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-[#a8a29a]">
            Juridisk bindende signering hos <span className="font-semibold text-[#78716c]">Posten signering</span> med <span className="font-semibold text-[#78716c]">BankID</span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-dvh bg-[#f5f4f1] pb-28 font-body lg:pb-16">
      {/* Toppbar */}
      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-[#f5f4f1]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[16px] w-auto" />
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Sikker signering
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-5">
        {/* Desktop: dokument venstre + sticky panel høyre · Mobil: panel øverst */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">

          {/* Infopanel — mobil (øverst) */}
          <div className="mt-5 lg:hidden">
            <InfoPanel medKnapp={false} />
          </div>

          {/* Dokument */}
          <section className="mt-6 lg:order-1 lg:mt-8" data-testid="signer-dokument-visning">
            {pdfFeil ? (
              <div className="rounded-2xl border border-black/[0.07] bg-white px-6 py-10 text-center">
                <p className="text-[13.5px] text-[#78716c]">Forhåndsvisningen kunne ikke lastes.</p>
                <a href={`/api/signer-dokument/${jobbId}/${sid}`} target="_blank" rel="noreferrer" className="mt-2.5 inline-block text-[13.5px] font-semibold text-[#7c3aed] hover:underline">Åpne dokumentet (PDF) →</a>
              </div>
            ) : (
              <>
                {rendret === 0 && (
                  <div className="mx-auto max-w-[820px] space-y-4">
                    <div className="aspect-[1/1.35] w-full animate-pulse rounded-md border border-black/[0.05] bg-white shadow-[0_14px_40px_-18px_rgba(28,25,23,0.18)]" />
                    <p className="text-center text-[11px] tracking-wide text-[#b8b4ad]">Laster dokumentet …</p>
                  </div>
                )}
                <div ref={beholderRef} />
                {rendret > 0 && (
                  <p className="mt-1 pb-2 text-center">
                    <a href={`/api/signer-dokument/${jobbId}/${sid}`} target="_blank" rel="noreferrer" className="text-[11.5px] text-[#a8a29a] underline decoration-[#d6d3cd] underline-offset-2 hover:text-[#78716c]">Last ned PDF</a>
                  </p>
                )}
              </>
            )}
          </section>

          {/* Infopanel — desktop (sticky høyre) */}
          <aside className="hidden lg:order-2 lg:mt-8 lg:block lg:sticky lg:top-[76px]">
            <InfoPanel medKnapp />
          </aside>
        </div>
      </div>

      {/* Sticky signeringslinje — kun mobil/nettbrett */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.07] bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-[560px]">
          <SignerKnapp bred />
          <p className="mt-1.5 text-center text-[10.5px] text-[#b8b4ad]">Posten signering · BankID · Juridisk bindende</p>
        </div>
      </div>
    </main>
  );
}
