'use client';

/* ───────────────────────────────────────────────────────────────────────────
   ModellPresentasjon — det interaktive budsjettverktøyet vist PÅ en deck-slide.

   · Laster NØYAKTIG samme plan som /admin/budsjett (samme endepunkt, samme motor).
   · Monterer BudsjettModell i «presentasjon»-modus: sliderne er levende og
     regner om i sanntid, men ingenting lagres (ren hva-om på scenen).
   · Kun internt/presenter (adminKey kreves) — eksterne lenker ser den aldri.
   · Monteres først når kapitlet besøkes (tung flate), og holdes montert etter.
─────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import BudsjettModell from '@/components/admin/BudsjettModell';
import TechModell from '@/components/admin/TechModell';

export default function ModellPresentasjon({ apiKey = '', planId = '', aktiv = false }) {
  const api = useCallback(async (path, opts = {}) => {
    const url = `/api/admin/budsjett/${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || `Feil (${r.status})`);
    return j;
  }, [apiKey]);

  const [plan, setPlan] = useState(null);
  const [feil, setFeil] = useState('');
  const [montert, setMontert] = useState(false);
  useEffect(() => { if (aktiv) setMontert(true); }, [aktiv]);

  useEffect(() => {
    if (!montert || !apiKey) return undefined;
    let avbrutt = false;
    (async () => {
      try {
        let id = planId;
        if (!id) {
          const l = await api('planer');
          const p = (l.planer || []).find((x) => x.investorSynlig && x.type === 'modell' && x.selskap !== 'tech')
            || (l.planer || []).find((x) => x.type === 'modell' && x.selskap !== 'tech')
            || (l.planer || []).find((x) => x.type === 'modell')
            || (l.planer || [])[0];
          id = p && p.id;
        }
        if (!id) throw new Error('Fant ingen budsjettmodell å vise.');
        const j = await api(`plan?id=${encodeURIComponent(id)}`);
        if (!avbrutt) setPlan(j.plan);
      } catch (e) { if (!avbrutt) setFeil((e && e.message) || 'Kunne ikke laste modellen.'); }
    })();
    return () => { avbrutt = true; };
  }, [montert, apiKey, planId, api]);

  if (feil) {
    return <div className="flex min-h-[40vh] items-center justify-center rounded-[20px] bg-black/[0.03] px-6 text-center text-[13.5px] text-[#b3261e]">{feil}</div>;
  }
  if (!plan) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-[20px] bg-black/[0.02] text-[#8f8a82]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0ebfa]"><SlidersHorizontal className="h-5 w-5 text-[#7a3fa8]" /></span>
        <p className="flex items-center gap-2 text-[13.5px]"><Loader2 className="h-4 w-4 animate-spin" /> Laster den levende modellen …</p>
      </div>
    );
  }
  const erTech = plan.selskap === 'tech' || plan.type === 'tech';
  return (
    <div className="rounded-[20px] bg-[#f7f6f3] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] sm:p-4" data-testid={`modell-presentasjon-${erTech ? 'tech' : 'dh'}`}>
      {erTech
        ? <TechModell key={plan.id} plan={plan} api={api} apiKey={apiKey} presentasjon />
        : <BudsjettModell key={plan.id} plan={plan} api={api} apiKey={apiKey} presentasjon />}
    </div>
  );
}
