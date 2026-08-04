'use client';

// ---------------------------------------------------------------------------
// ETTERSPØRSEL — boligvarsler koblet mot boligene som mangler innhold
//
// Dette panelet finnes for å svare på ett spørsmål forvalteren faktisk har:
// «hvilken bolig skal jeg fikse først?». Svaret er ikke alfabetisk eller
// kronologisk — det er den boligen flest boligsøkere venter på.
//
// Derfor sorterer vi på antall matchende boligvarsler, og viser hva som mangler
// på samme rad. En bolig med 4 ventende søkere som bare mangler prisantydning
// er den mest lønnsomme halvtimen i uka.
// ---------------------------------------------------------------------------
import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Users, TrendingUp, Loader2, RefreshCw } from 'lucide-react';

const KR = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const STATE_STYLE = {
  publisert: { label: 'Publisert', cls: 'bg-[#e7f6ee] text-[#1f7a4d]' },
  klar: { label: 'Klar, skjult', cls: 'bg-[#f0ebff] text-[#6b4fd8]' },
  mangler: { label: 'Mangler innhold', cls: 'bg-[#fff4e0] text-[#a67c00]' },
};

export default function DemandPanel({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/housing-alerts?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) { /* panelet er tillegg — feiler stille */ }
    setLoading(false);
  }, [apiKey]);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]" data-testid="demand-panel-loading">
        <p className="inline-flex items-center gap-2 text-[12.5px] text-[#8a8580]"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Henter etterspørsel…</p>
      </div>
    );
  }

  const d = data?.demand || null;
  const rows = data?.properties || [];
  const waiting = rows.filter((r) => r.matches > 0);
  const shown = showAll ? rows : waiting.slice(0, 8);

  // TOM TILSTAND SKAL VÆRE STILLE. Et fullt panel med tre setninger forklaring
  // for «0 varsler» stjeler plassen til boligene under. Én rad er nok.
  if (!d?.active) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]" data-testid="demand-panel">
        <Bell className="h-3.5 w-3.5 shrink-0 text-[#c4bdb4]" />
        <span className="text-[12.5px] text-[#8a8580]" data-testid="demand-summary">
          <b className="text-[#0a0a0a]" data-testid="demand-empty">Ingen boligvarsler ennå</b>
          {' '}— skjemaet på <a href="/ledige-boliger" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#7c3aed]">/ledige-boliger</a> fanger boligsøkere også når vi ikke har noe ledig.
        </span>
        <button type="button" onClick={load} disabled={loading} data-testid="demand-refresh"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-[#a8a29a] hover:bg-[#f5f4f2] hover:text-[#0a0a0a] disabled:opacity-60">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-4 sm:p-5" data-testid="demand-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0a0a0a] inline-flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <Bell className="w-3.5 h-3.5 text-[#7c3aed]" /> Etterspørsel — boligvarsler
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#8a8580]" data-testid="demand-summary">
            <b className="text-[#0a0a0a]">{d?.active || 0}</b> aktive boligvarsler
            {d?.withCriteria ? <> · {d.withCriteria} har oppgitt kriterier</> : null}
            {d?.medianBudget ? <> · medianbudsjett <b className="text-[#0a0a0a]">{KR(d.medianBudget)} kr/mnd</b></> : null}
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} data-testid="demand-refresh"
          className="h-8 px-3 rounded-full bg-[#f5f5f4] text-[12px] font-semibold text-[#555] hover:bg-[#ebebe9] inline-flex items-center gap-1.5 disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Oppdater
        </button>
      </div>

      {!d?.active ? (
        <p className="mt-3 rounded-lg bg-[#f8f7f5] px-3 py-2.5 text-[12px] leading-relaxed text-[#8a8580]" data-testid="demand-empty">
          Ingen boligvarsler ennå. Skjemaet på <a href="/ledige-boliger" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#7c3aed]">/ledige-boliger</a> fanger
          boligsøkere også når vi ikke har noe ledig — bydel, størrelse og budsjett. Da vises det her hvilke boliger det faktisk venter folk på.
        </p>
      ) : (
        <>
          {(d.districts?.length > 0 || d.bedrooms?.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5" data-testid="demand-facets">
              {(d.districts || []).map((x) => (
                <span key={`dd-${x.label}`} className="inline-flex items-center gap-1 rounded-full bg-[#f0ebff] px-2.5 py-1 text-[11.5px] font-semibold text-[#6b4fd8]">
                  {x.label} <span className="opacity-60 tabular-nums">{x.count}</span>
                </span>
              ))}
              {(d.bedrooms || []).map((x) => (
                <span key={`db-${x.label}`} className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f4] px-2.5 py-1 text-[11.5px] font-semibold text-[#66625c]">
                  {x.label} <span className="opacity-60 tabular-nums">{x.count}</span>
                </span>
              ))}
            </div>
          )}

          {waiting.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">
                <TrendingUp className="w-3 h-3" /> Boliger det venter folk på
              </p>
              <div className="space-y-1.5" data-testid="demand-properties">
                {shown.map((r) => {
                  const st = STATE_STYLE[r.state] || STATE_STYLE.mangler;
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg bg-[#faf9f7] px-3 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#7c3aed] px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                        <Users className="w-3 h-3" /> {r.matches}
                      </span>
                      <span className="text-[12.5px] font-semibold text-[#0a0a0a]">{r.area || r.title}</span>
                      {r.district && <span className="text-[11.5px] text-[#a8a29a]">{r.district}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                      {r.missingLabels?.length > 0 && (
                        <span className="text-[11.5px] text-[#c08a2e]">{r.missingLabels.join(' · ')}</span>
                      )}
                      {r.fix && <span className="text-[11.5px] text-[#b8b2aa]">— {r.fix}</span>}
                    </div>
                  );
                })}
              </div>
              {rows.length > shown.length && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-[11.5px] font-semibold text-[#7c3aed]">
                  {showAll ? 'Vis færre' : `Vis alle ${rows.length} ledige boliger`}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-[#f8f7f5] px-3 py-2.5 text-[12px] leading-relaxed text-[#8a8580]">
              Ingen av de ledige boligene matcher kriteriene i varslene ennå.
            </p>
          )}
        </>
      )}
    </div>
  );
}
