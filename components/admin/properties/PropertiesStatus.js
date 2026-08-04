'use client';

// ---------------------------------------------------------------------------
// STATUS FOR NETTSIDEN
//
// Erstatter tre stablede tekstpaneler (personvern-forklaring, publiseringspanel
// og datakvalitetsvarsel) med ÉN flate. Prinsippet: tall og handling er alltid
// synlig, forklaring er alltid ett klikk unna.
//
// Flisene er filtre. Da slutter tallene å være noe man leser og blir noe man
// bruker — «1 mangler innhold» er et spørsmål, og et klikk er svaret.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import { Globe, Eye, HelpCircle, ChevronDown, AlertTriangle, Copy } from 'lucide-react';
import { GATE } from '@/lib/listings';

const TONE = {
  green: { n: 'text-[#1f7a4d]', ring: 'ring-[#7fc79e]', bg: 'hover:bg-[#f2faf5]' },
  violet: { n: 'text-[#6b4fd8]', ring: 'ring-[#b9a3ee]', bg: 'hover:bg-[#f8f5ff]' },
  amber: { n: 'text-[#b07d00]', ring: 'ring-[#e8c26a]', bg: 'hover:bg-[#fffaef]' },
  grey: { n: 'text-[#66625c]', ring: 'ring-[#d6d2cc]', bg: 'hover:bg-[#faf9f7]' },
};

function Tile({ n, label, tone = 'grey', active, onClick, hint }) {
  const t = TONE[tone] || TONE.grey;
  return (
    <button
      type="button" onClick={onClick} title={hint}
      className={`group rounded-xl border border-[#f0eeea] px-3.5 py-3 text-left transition-all ${t.bg} ${active ? `ring-2 ${t.ring} border-transparent` : ''}`}
    >
      <p className={`text-[22px] font-bold leading-none tabular-nums ${n ? t.n : 'text-[#d6d2cc]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{n}</p>
      <p className="mt-1.5 text-[11.5px] font-medium leading-tight text-[#8a8580]">{label}</p>
    </button>
  );
}

export default function PropertiesStatus({
  pub, noImages = [], duplicates = [], finnLinked = [], total = 0,
  activeFilter, onFilter,
}) {
  const [openList, setOpenList] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);

  const ready = pub?.ready || [];
  const almost = pub?.almost || [];
  const published = pub?.published || [];
  const todo = ready.length + almost.length;

  return (
    <section className="rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] p-4 sm:p-5" data-testid="props-publish-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Ledige boliger på nettsiden</h3>
          <p className="mt-0.5 text-[12px] text-[#a8a29a]">Bare komplette boliger som er satt synlige, vises offentlig.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <a href="/ledige-boliger" target="_blank" rel="noopener noreferrer" data-testid="props-open-listings"
            className="h-8 px-3 rounded-full bg-[#f5f5f4] text-[12px] font-semibold text-[#555] hover:bg-[#ebebe9] inline-flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Åpne siden
          </a>
          <a href="/ledige-boliger?forhandsvis=1" target="_blank" rel="noopener noreferrer" data-testid="props-preview-listings"
            title="Viser også boliger som er klare, men ikke publisert. Krever at du er innlogget her."
            className="h-8 px-3 rounded-full bg-[#f0ebff] text-[12px] font-semibold text-[#6b4fd8] hover:bg-[#e6dcff] inline-flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Forhåndsvis
          </a>
          <button type="button" onClick={() => setOpenHelp((v) => !v)} aria-label="Slik virker denne siden"
            title="Slik virker denne siden"
            className={`h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors ${openHelp ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f4] text-[#999] hover:text-[#0a0a0a]'}`}>
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tallene er filtre */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Tile n={published.length} label="Publisert" tone="green" active={activeFilter === 'publisert'}
          onClick={() => onFilter(activeFilter === 'publisert' ? 'alle' : 'publisert')}
          hint="Synlig på /ledige-boliger nå" />
        <Tile n={ready.length} label="Klar, ikke publisert" tone="violet" active={activeFilter === 'klar'}
          onClick={() => onFilter(activeFilter === 'klar' ? 'alle' : 'klar')}
          hint="Innholdet er komplett — mangler bare at du slår på «Synlig»" />
        <Tile n={almost.length} label="Mangler innhold" tone="amber" active={activeFilter === 'manglerpub'}
          onClick={() => onFilter(activeFilter === 'manglerpub' ? 'alle' : 'manglerpub')}
          hint="Kan ikke publiseres før bilder, pris, areal og adresse er på plass" />
        <Tile n={noImages.length} label="Uten bilder" tone="grey" active={activeFilter === 'utenbilder'}
          onClick={() => onFilter(activeFilter === 'utenbilder' ? 'alle' : 'utenbilder')}
          hint="Plattformeksporten har ingen bilder — koble utleierens FINN-annonse" />
      </div>

      {/* Arbeidsliste — bare når det finnes noe å gjøre */}
      {todo > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setOpenList((v) => !v)} data-testid="props-todo-toggle"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0a0a0a] hover:text-[#6b4fd8]">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openList ? '' : '-rotate-90'}`} />
            {openList ? 'Skjul' : 'Vis'} hva som gjenstår ({todo})
          </button>

          {openList && (
            <div className="mt-2.5 space-y-1.5" data-testid="props-todo-list">
              {ready.length > 0 && (
                <p className="rounded-lg bg-[#f8f5ff] px-3 py-2 text-[12px] leading-relaxed text-[#5b4499]">
                  <b>{ready.length === 1 ? 'Én bolig er klar' : `${ready.length} boliger er klare`}</b> — slå på «Synlig» på kortet: {ready.map((r) => r.area || r.title).join(', ')}.
                </p>
              )}
              {almost.map((r) => {
                const first = r.gate.blocking.find((c) => c !== 'skjult');
                return (
                  <div key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-[#faf9f7] px-3 py-2 text-[12px]">
                    <span className="font-semibold text-[#0a0a0a]">{r.area || r.title}</span>
                    <span className="text-[#b07d00]">{r.gate.blocking.filter((c) => c !== 'skjult').map((c) => GATE[c]?.label || c).join(' · ')}</span>
                    <span className="text-[#b8b2aa]">— {GATE[first]?.fix || 'fyll ut i utleiemodulen'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Duplikater er det eneste som overrasker nok til å fortjene plass */}
      {duplicates.length > 0 && (
        <button type="button" onClick={() => onFilter(activeFilter === 'duplikat' ? 'alle' : 'duplikat')}
          data-testid="props-quality-banner"
          className="mt-3 flex w-full items-center gap-2 rounded-lg bg-[#fffaef] px-3 py-2 text-left text-[12px] text-[#8a6500] hover:bg-[#fff5e0]">
          <Copy className="w-3.5 h-3.5 shrink-0" />
          <span><b>{duplicates.length} mulige duplikater</b> — identiske på gate, type, soverom, areal og bildeantall. Rydd i DigiHome-appen.</span>
        </button>
      )}

      {/* Forklaringen — samlet på ett sted, av som standard */}
      {openHelp && (
        <div className="mt-3 rounded-xl bg-[#faf9f7] px-4 py-3.5 text-[12px] leading-relaxed text-[#66625c]" data-testid="props-help">
          <ul className="space-y-2">
            <li className="flex gap-2"><span className="text-[#c4bdb4]">·</span><span>Listen speiler <b>«Enheter»</b> i DigiHome-appen. Eier, leietaker og kontraktsleie vises <b>bare her, bak innlogging</b>.</span></li>
            <li className="flex gap-2"><span className="text-[#c4bdb4]">·</span><span>Boligsiden og nyhetsbrevet får full gateadresse, størrelse og <b>eksakt annonsert månedsleie</b> — som i enhver annen utleieannonse — men aldri eier, leietaker eller kontraktsleie.</span></li>
            <li className="flex gap-2"><span className="text-[#c4bdb4]">·</span><span>Nye boliger er <b>skjult som standard</b>. Mangler plattformen bilder eller pris, kan du koble utleierens FINN-annonse eller fylle inn selv under «Rediger boligdata» — vi skriver aldri noe tilbake til plattformen.{finnLinked.length > 0 ? ` ${finnLinked.length} bolig${finnLinked.length === 1 ? '' : 'er'} er alt koblet.` : ''}</span></li>
            <li className="flex gap-2"><span className="text-[#c4bdb4]">·</span><span>Flere boliger i samme gate er normalt — eksporten fjerner husnummer. Vi flagger bare rader som er identiske på gate, type, soverom, areal og bildeantall.</span></li>
          </ul>
        </div>
      )}

      {total > 0 && published.length === 0 && ready.length === 0 && almost.length === 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#faf9f7] px-3 py-2 text-[12px] text-[#8a8580]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#c4bdb4]" /> Ingen ledige boliger å publisere akkurat nå.
        </p>
      )}
    </section>
  );
}
