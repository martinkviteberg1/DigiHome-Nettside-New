'use client';

/* ───────────────────────────────────────────────────────────────────────────
   FaktureringModul — DigiHome Tech AS sin lisensfakturering, bygget som en
   ekte økonomimodul:

   • Månedskjøring  — én rad per kunde for valgt måned. Frys → kontroller →
                      utkast i PowerOffice → send i Go. Bulk-handlinger.
   • Fakturaer      — historikk over frosne måneder og utkast, med PDF.
   • Kunder         — kunderegister med plan, grunnlag og kundedata.
   • Prisplaner     — priskatalogen (volumtrinn, trinnmodell, ledig-faktor …).
   • Innstillinger  — PowerOffice-selskap, selger, betaling, faktura. Kun her.

   All beregning skjer på serveren (lib/pris.js). Frosset grunnlag vinner.
─────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useState } from 'react';
import { ReceiptText, CalendarCheck, FileText, Users, Layers, Settings2, Loader2 } from 'lucide-react';
import { LILLA, forrigeMnd } from './fakturering/felles';
import Maanedskjoring from './fakturering/Maanedskjoring';
import Fakturaer from './fakturering/Fakturaer';
import Kunder from './fakturering/Kunder';
import Planer from './fakturering/Planer';
import Innstillinger from './fakturering/Innstillinger';

const FANER = [
  { k: 'kjoring', l: 'Månedskjøring', icon: CalendarCheck },
  { k: 'fakturaer', l: 'Fakturaer', icon: FileText },
  { k: 'kunder', l: 'Kunder', icon: Users },
  { k: 'planer', l: 'Prisplaner', icon: Layers },
  { k: 'innstillinger', l: 'Innstillinger', icon: Settings2 },
];

export default function FaktureringModul({ apiKey = '', onNaviger }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [tab, setTab] = useState('kjoring');
  const [data, setData] = useState(null); // { settings, planer, kunder }
  const [maaned, setMaaned] = useState(forrigeMnd());
  const [tick, setTick] = useState(0); // bump → fanene laster på nytt

  const lastData = useCallback(async () => {
    try { const r = await fetch(`/api/admin/pris/data?${q}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) setData(d); } catch (e) {}
  }, [q]);
  useEffect(() => { lastData(); }, [lastData]);
  const endret = useCallback(async () => { await lastData(); setTick((t) => t + 1); }, [lastData]);

  const gaaTil = (k) => { setTab(k); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-[24px] font-semibold tracking-[-0.02em] text-black/90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: LILLA, color: '#fff' }}><ReceiptText className="h-5 w-5" strokeWidth={2} /></span>
            Fakturering
          </h1>
          <p className="mt-1.5 text-[13.5px] text-black/50">Plattformlisensen fra DigiHome Tech AS — grunnlag, frysing og utkast til PowerOffice. Fakturanummer og utsending skjer i Go.</p>
        </div>
        <div className="flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-black/[0.04] p-1 sm:w-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FANER.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors sm:px-3.5 ${tab === t.k ? 'bg-white text-black/90 shadow-sm' : 'text-black/50 hover:text-black/80'}`}><t.icon className="h-4 w-4" /> {t.l}</button>
          ))}
        </div>
      </div>

      {!data ? <div className="flex h-64 items-center justify-center text-black/40"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Laster …</div> : (
        <>
          {tab === 'kjoring' ? <Maanedskjoring q={q} data={data} maaned={maaned} setMaaned={setMaaned} onGaaTil={gaaTil} tick={tick} onEndret={endret} /> : null}
          {tab === 'fakturaer' ? <Fakturaer q={q} data={data} tick={tick} onEndret={endret} /> : null}
          {tab === 'kunder' ? <Kunder q={q} data={data} maaned={maaned} onLagret={endret} tick={tick} /> : null}
          {tab === 'planer' ? <Planer q={q} data={data} onLagret={endret} /> : null}
          {tab === 'innstillinger' ? <Innstillinger q={q} data={data} onLagret={endret} onGaaTilRegnskap={() => (onNaviger ? onNaviger('regnskap') : null)} /> : null}
        </>
      )}
    </div>
  );
}
