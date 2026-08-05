'use client';

// ---------------------------------------------------------------------------
// «Lukket sløyfe» — fikk Google, Meta og GA4 beskjed om at leadet ble kunde?
//
// Bakgrunn (aug. 2026): konverteringshandlingen «DigiHome – Vunnet utleier» i
// Google Ads sto på 0 konverteringer, og det så ut som en ødelagt integrasjon.
// Sannheten var at INGEN av de vunne leadene hadde en gclid — koden hoppet
// riktig av, men i stillhet. Uten dette panelet er forskjellen mellom
// «integrasjonen er nede» og «vi mangler klikk-ID» umulig å se.
//
// Derfor viser vi alltid ÅRSAK, ikke bare grønn/rød. Årsakene krever helt ulike
// tiltak: mangler_gclid → bedre klikk-ID-fangst · ingen_samtykke → samtykkerate
// · ikke_konfigurert → miljøvariabler.
// ---------------------------------------------------------------------------

import React from 'react';
import { CheckCircle2, MinusCircle, AlertTriangle, Link2 } from 'lucide-react';
// Samme forklaringstekster som backend bruker — én kilde til sannhet.
import { SKIP_REASON_TEXT as REASON_TEXT } from '@/lib/closed-loop-reasons';

function Row({ label, state, hint }) {
  const tone = state === 'ok'
    ? { Icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' }
    : state === 'error'
      ? { Icon: AlertTriangle, cls: 'text-red-600', bg: 'bg-red-50' }
      : { Icon: MinusCircle, cls: 'text-[#bbb]', bg: 'bg-[#f7f7f7]' };
  const { Icon, cls, bg } = tone;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Icon className={`h-3.5 w-3.5 ${cls}`} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#1f1f1f]">{label}</p>
        {hint ? <p className="text-[11.5px] leading-snug text-[#999]">{hint}</p> : null}
      </div>
    </div>
  );
}

function describe(sig) {
  if (!sig) return { state: 'idle', hint: 'ikke sendt' };
  if (sig.ok) {
    const when = sig.at ? new Date(sig.at).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : null;
    return { state: 'ok', hint: when ? `sendt ${when}` : 'sendt' };
  }
  if (sig.skipped) return { state: 'idle', hint: `hoppet over — ${REASON_TEXT[sig.reason] || sig.reason || 'ukjent årsak'}` };
  return { state: 'error', hint: sig.error ? String(sig.error).slice(0, 120) : 'feilet' };
}

export default function ClosedLoopPanel({ lead }) {
  const d = lead || {};
  const isWon = d.status === 'won';

  const google = describe(d.googleAdsWon);
  const meta = describe(d.metaCapiWon);
  const ga4 = describe(d.ga4Won);
  const capiLead = describe(d.metaCapi);

  const anySignal = d.googleAdsWon || d.metaCapiWon || d.ga4Won || d.metaCapi;
  if (!isWon && !anySignal) return null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f] mb-1 flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5 text-[#b39ddb]" /> Lukket sløyfe
      </p>
      <p className="text-[11.5px] text-[#999] mb-2.5">
        {isWon
          ? 'Har annonseplattformene fått vite at dette ble en kunde?'
          : 'Signaler sendt for dette leadet.'}
      </p>
      <div className="divide-y divide-[#f2f2f2]">
        <Row label="Meta — Lead ved innsending" state={capiLead.state} hint={capiLead.hint} />
        {isWon ? <Row label="Google Ads — Vunnet utleier" state={google.state} hint={google.hint} /> : null}
        {isWon ? <Row label="Meta — Purchase ved vunnet" state={meta.state} hint={meta.hint} /> : null}
        {isWon ? <Row label="GA4 — purchase ved vunnet" state={ga4.state} hint={ga4.hint} /> : null}
      </div>
      {isWon && d.googleAdsWon && d.googleAdsWon.skipped && d.googleAdsWon.reason === 'mangler_gclid' ? (
        <p className="mt-2.5 rounded-lg bg-[#fffbeb] px-2.5 py-2 text-[11.5px] leading-snug text-[#92400e]">
          Uten klikk-ID kan ikke Google knytte kunden til annonsen. Klikk-ID lagres kun
          ved markedsføringssamtykke — samtykkeraten er derfor direkte utslagsgivende for
          hvor godt Google kan optimalisere.
        </p>
      ) : null}
    </div>
  );
}
