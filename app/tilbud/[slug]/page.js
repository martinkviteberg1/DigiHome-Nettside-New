'use client';

/* ═══════════ OFFENTLIG TILBUDSSIDE — /tilbud/[slug] ═══════════
   Den personlige siden en huseier får tilsendt (via FINN-melding/telefon):
   · boligen deres, med AI-stylede «slik kan annonsen se ut»-bilder (merket)
   · ærlig regnestykke: anbefalt leie, honorar, netto til eier
   · hva DigiHome tar seg av + kontaktskjema (opt-in — de kontakter OSS)
   Åpninger spores (spor=1) og vises i Salgsradar-pipelinen. */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';

const heading = { fontFamily: 'var(--font-heading)' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');

export default function TilbudSide() {
  const params = useParams();
  const slug = String(params?.slug || '');
  const [tilbud, setTilbud] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [skjema, setSkjema] = useState({ navn: '', telefon: '', melding: '' });
  const [sender, setSender] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [aktivStylet, setAktivStylet] = useState(0);
  const [visOriginal, setVisOriginal] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const r = await fetch(`/api/tilbud?slug=${encodeURIComponent(slug)}&spor=1`);
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || 'Fant ikke tilbudet');
        setTilbud(j.tilbud);
      } catch (e) { setFeil(e.message); }
      setLaster(false);
    })();
  }, [slug]);

  const send = async () => {
    if (sender || !skjema.navn.trim() || !skjema.telefon.trim()) return;
    setSender(true);
    try {
      const r = await fetch('/api/tilbud/kontakt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...skjema }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Noe gikk galt');
      setSendt(true);
    } catch (e) { setFeil(e.message); }
    setSender(false);
  };

  const r = tilbud?.regnestykke || {};
  const gevinst = r.gevinstMnd;
  const stylet = tilbud?.stylet || [];
  const valgtStylet = stylet[aktivStylet] || null;

  const fakta = useMemo(() => [
    tilbud?.boligtype, tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null,
  ].filter(Boolean), [tilbud]);

  if (laster) {
    return <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;
  }
  if (!tilbud) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-6">
        <p className="text-center text-[14px] text-[#999]">{feil || 'Fant ikke tilbudet.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1c1917]" data-testid="tilbud-side">
      <div className="mx-auto max-w-[760px] px-5 py-10 sm:py-14">
        {/* Topp */}
        <p className="text-[13px] font-bold tracking-tight" style={heading}>DigiHome</p>
        <h1 className="mt-5 text-[26px] font-bold leading-tight tracking-[-0.02em] sm:text-[32px]" style={heading}>
          Vi så boligen din på FINN — her er hva vi kan gjøre for den
        </h1>
        <p className="mt-2 text-[14px] text-[#78716c]">
          {tilbud.adresse}{tilbud.postnr ? `, ${tilbud.postnr}` : ''}
          {fakta.length ? <span className="text-[#b3ada3]"> · {fakta.join(' · ')}</span> : null}
        </p>

        {/* Bilder: AI-stylet hovedbilde + før/etter */}
        {valgtStylet ? (
          <div className="mt-7">
            <div className="relative overflow-hidden rounded-2xl bg-[#eee] shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visOriginal ? valgtStylet.kildeUrl : `/api/tilbud/bilde?id=${valgtStylet.id}`}
                alt={visOriginal ? 'Original fra annonsen' : 'AI-stylet illustrasjon'}
                className="block h-auto w-full"
                data-testid="tilbud-hovedbilde"
              />
              <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10.5px] font-semibold text-white backdrop-blur-sm">
                {visOriginal ? 'Slik ser annonsen ut i dag' : 'Slik kan den se ut — AI-stylet illustrasjon'}
              </span>
              <button
                onClick={() => setVisOriginal((v) => !v)}
                data-testid="tilbud-for-etter"
                className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3.5 py-1.5 text-[11.5px] font-bold text-[#1c1917] shadow-sm backdrop-blur-sm transition-transform active:scale-95"
              >
                {visOriginal ? 'Se etter →' : '← Se før'}
              </button>
            </div>
            {stylet.length > 1 && (
              <div className="mt-2.5 flex gap-2 overflow-x-auto">
                {stylet.map((s, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.id} src={`/api/tilbud/bilde?id=${s.id}`} alt="" onClick={() => { setAktivStylet(i); setVisOriginal(false); }}
                    className={`h-14 w-20 shrink-0 cursor-pointer rounded-lg object-cover transition-all ${i === aktivStylet ? 'ring-2 ring-[#8b5cf6]' : 'opacity-60 hover:opacity-100'}`} />
                ))}
              </div>
            )}
          </div>
        ) : (tilbud.bilder || [])[0] ? (
          <div className="mt-7 overflow-hidden rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tilbud.bilder[0]} alt="" className="block h-auto w-full" />
          </div>
        ) : null}

        {/* Regnestykket */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)]" data-testid="tilbud-regnestykke">
          <div className="border-b border-black/[0.05] px-6 py-4">
            <p className="text-[15px] font-bold" style={heading}>Regnestykket — helt konkret</p>
          </div>
          <div className="px-6 py-2">
            {[
              ['Leie vi anbefaler å legge oss på', `${tall(r.anbefaltLeie)} kr/mnd`, false],
              [`Vårt honorar (${r.honorarPct} % eks. mva)`, `− ${tall(r.honorarMnd)} kr/mnd`, false],
              ['Netto til deg — uten å løfte en finger', `${tall(r.nettoTilEier)} kr/mnd`, true],
            ].map(([l, v, sterk]) => (
              <div key={l} className={`flex items-baseline justify-between gap-4 py-3 ${sterk ? '' : 'border-b border-black/[0.04]'}`}>
                <span className={`text-[13px] ${sterk ? 'font-bold text-[#1c1917]' : 'text-[#78716c]'}`}>{l}</span>
                <span className={`shrink-0 tabular-nums ${sterk ? 'text-[18px] font-bold text-[#1f7a45]' : 'text-[14px] font-semibold text-[#44403c]'}`} style={heading}>{v}</span>
              </div>
            ))}
          </div>
          {gevinst != null && (
            <div className={`px-6 py-3.5 text-[12.5px] font-medium ${gevinst > 0 ? 'bg-[#eef6f0] text-[#1f7a45]' : 'bg-[#fafaf8] text-[#78716c]'}`}>
              {gevinst > 0
                ? <>Det er <b>{tall(gevinst)} kr mer i måneden</b> ({tall(r.gevinstAar)} kr/år) enn annonsert pris i dag — og vi tar hele jobben.</>
                : <>Annonsert pris i dag er {tall(r.dagensPris)} kr/mnd. Med oss slipper du annonsering, visninger, kontrakter og oppfølging — og boligen presenteres som bildene over.</>}
            </div>
          )}
        </div>

        {/* Hva DigiHome tar seg av */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[
            ['Annonsering som treffer', 'Profesjonell annonse med styling — og prisen markedet faktisk betaler.'],
            ['Visninger og utvelgelse', 'Vi møter interessentene, sjekker referanser og finner riktig leietaker.'],
            ['Kontrakt og depositum', 'Trygg leiekontrakt, depositumskonto og innflytting — alt dokumentert.'],
            ['Oppfølging hele leieforholdet', 'Én kontakt for leietaker, purringer og småting — du får bare rapporten.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
              <p className="text-[13px] font-bold" style={heading}>{t}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#78716c]">{d}</p>
            </div>
          ))}
        </div>

        {/* Kontakt */}
        <div className="mt-8 rounded-2xl bg-[#0a0a0a] p-6 text-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]" data-testid="tilbud-kontakt">
          {sendt ? (
            <div className="py-4 text-center">
              <p className="text-[17px] font-bold" style={heading}>Takk! Vi ringer deg i dag eller i morgen.</p>
              <p className="mt-1.5 text-[13px] text-white/60">Helt uforpliktende — vi tar en kort prat om boligen og hva vi kan få til.</p>
            </div>
          ) : (
            <>
              <p className="text-[16px] font-bold" style={heading}>Nysgjerrig? Ta en uforpliktende prat</p>
              <p className="mt-1 text-[12.5px] text-white/55">Legg igjen navn og nummer, så ringer vi deg — ingen bindinger, ingen mas.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={skjema.navn} onChange={(e) => setSkjema((s) => ({ ...s, navn: e.target.value }))} placeholder="Navn" data-testid="tilbud-navn"
                  className="h-11 rounded-lg border border-white/10 bg-white/[0.07] px-3.5 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
                <input value={skjema.telefon} onChange={(e) => setSkjema((s) => ({ ...s, telefon: e.target.value }))} placeholder="Telefon" data-testid="tilbud-telefon"
                  className="h-11 rounded-lg border border-white/10 bg-white/[0.07] px-3.5 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
              </div>
              <textarea value={skjema.melding} onChange={(e) => setSkjema((s) => ({ ...s, melding: e.target.value }))} placeholder="Melding (valgfritt)" rows={2}
                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-[13.5px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
              {feil && <p className="mt-2 text-[12px] text-rose-300">{feil}</p>}
              <button onClick={send} disabled={sender || !skjema.navn.trim() || !skjema.telefon.trim()} data-testid="tilbud-send"
                className="mt-3 h-11 w-full rounded-lg bg-white text-[13.5px] font-bold text-[#0a0a0a] transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-40">
                {sender ? 'Sender…' : 'Ring meg opp'}
              </button>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-[10.5px] leading-relaxed text-[#b8b2a9]">
          Stylede bilder er AI-genererte illustrasjoner basert på annonsens egne foto — møblering og dekor er veiledende.
          Honorar oppgis eks. mva. DigiHome AS · digihome.no
        </p>
      </div>
    </div>
  );
}
