'use client';

// Klient-renderer for den eksterne delingslenken. Henter den offentlige, les-only
// datapakken og viser samme moderne rapport som i admin (uten redigering).

import React, { useEffect, useState } from 'react';
import { Loader2, Printer, ShieldAlert } from 'lucide-react';
import StyrerapportVisning, { blokkTilRaw } from '@/components/admin/StyrerapportVisning';

const FEIL_TEKST = {
  ukjent: { t: 'Lenken finnes ikke', d: 'Denne delingslenken er ugyldig eller fjernet.' },
  trukket: { t: 'Lenken er trukket tilbake', d: 'Eieren har deaktivert denne delingslenken. Ta kontakt for en ny lenke.' },
  utlopt: { t: 'Lenken er utløpt', d: 'Denne delingslenken har passert utløpsdatoen. Be om en oppdatert lenke.' },
};

export default function DeltRapport({ token }) {
  const [status, setStatus] = useState('laster'); // laster | ok | <feilkode>
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let av = false;
    (async () => {
      try {
        const r = await fetch(`/api/styrerapport/del/${encodeURIComponent(token)}`, { cache: 'no-store' });
        const j = await r.json();
        if (av) return;
        if (r.ok && j.ok) { setPayload(j); setStatus('ok'); }
        else setStatus(j.feil || 'ukjent');
      } catch (e) { if (!av) setStatus('ukjent'); }
    })();
    return () => { av = true; };
  }, [token]);

  if (status === 'laster') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCFB]">
        <span className="inline-flex items-center gap-3 text-[15px] text-black/50"><Loader2 className="h-5 w-5 animate-spin" /> Laster styrerapport …</span>
      </div>
    );
  }

  if (status !== 'ok') {
    const f = FEIL_TEKST[status] || FEIL_TEKST.ukjent;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCFB] px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_10px_40px_-16px_rgba(0,0,0,0.3)]"><ShieldAlert className="h-7 w-7 text-[#8b5cf6]" /></div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{f.t}</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[#5b5b57]">{f.d}</p>
        </div>
      </div>
    );
  }

  const r = payload.rapport || {};
  const innhold = {
    tittel: r.tittel || 'Styrerapport',
    motedato: r.motedato || '',
    periodeLabel: r.periodeLabel || '',
    sammendrag: r.sammendrag || '',
    askRaw: (r.ask || []).join('\n'),
    blokker: (r.blokker || []).map((b) => ({ id: b.id, type: b.type, tittel: b.tittel || '', raw: blokkTilRaw(b) })),
  };
  const visRegnskap = payload.lenke?.inkluderRegnskap !== false && !!payload.regnskap;

  const handlinger = (
    <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#D6CFC4] bg-white px-2.5 text-[12.5px] font-semibold text-[#3A3733] transition-colors hover:border-[#0A0A0A] sm:px-3"><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Skriv ut / PDF</span></button>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <StyrerapportVisning
        innhold={innhold}
        edit={null}
        data={payload}
        regnskap={payload.regnskap || null}
        visRegnskap={visRegnskap}
        visning="share"
        lenke={payload.lenke}
        handlinger={handlinger}
      />
    </div>
  );
}
