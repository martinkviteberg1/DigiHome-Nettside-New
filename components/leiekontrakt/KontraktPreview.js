'use client';

/* Tro, «papir»-aktig forhåndsvisning av husleiekontrakten. Fylles fra utkastet;
   tomme felt vises som en diskret prikkelinje. Autoritativ PDF genereres i appen
   ved signering — dette er den visuelle forhåndsvisningen. */

import React from 'react';
import { T, display, DIM, SVAK, HAIR } from '@/components/forside/v4/tokens';
import { BOLIGTYPE, MOBLERING, DEPOSITUM_TYPE } from '@/lib/leiekontrakt';

const kr = (n) => (Number(n) || 0).toLocaleString('nb-NO').replace(/\u00A0/g, ' ');
const datoNb = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); };

function Linje({ etikett, verdi }) {
  const har = verdi != null && String(verdi).trim() !== '';
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]">
      <span className="shrink-0 text-[10.5px] uppercase tracking-[0.07em]" style={{ color: SVAK }}>{etikett}</span>
      {har ? (
        <span className="text-right text-[12.5px] font-medium" style={{ color: T.ink }}>{verdi}</span>
      ) : (
        <span className="h-px w-[130px] self-center" style={{ borderBottom: `1px dashed ${HAIR}` }} />
      )}
    </div>
  );
}

function Para({ nr, tittel, children }) {
  return (
    <div className="border-t pt-2.5" style={{ borderColor: HAIR }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: T.ink }}>§ {nr} · {tittel}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function KontraktPreview({ u = {}, kompakt = false }) {
  const b = u.bolig || {}; const l = u.leietaker || {}; const v = u.vilkaar || {}; const o = u.owner || {};
  const depBelop = v.depositumMnd && v.leie ? v.depositumMnd * v.leie : 0;
  const adr = [b.adresse, [b.postnr, b.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const typeLinje = [BOLIGTYPE[b.type], b.sqm ? `${b.sqm} m²` : '', b.soverom ? `${b.soverom} soverom` : ''].filter(Boolean).join(' · ');
  return (
    <div className="overflow-hidden rounded-[12px]" style={{ background: '#fffdf9', boxShadow: `0 34px 64px -36px rgba(21,19,15,0.4), inset 0 0 0 1px ${HAIR}` }}>
      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center justify-between">
          <p className="text-[16px]" style={{ ...display }}>Husleiekontrakt</p>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ background: 'rgba(31,157,85,0.1)', color: T.gronn }}>Husleieloven</span>
        </div>
        <p className="mt-0.5 text-[9.5px]" style={{ color: SVAK }}>Avtale om leie av bolig · lov av 26. mars 1999 nr. 17</p>
        <div className="mt-4 space-y-2.5">
          <Para nr="1" tittel="Partene">
            <Linje etikett="Utleier" verdi={o.kind === 'bedrift' ? (o.firma || o.navn) : o.navn} />
            <Linje etikett="Leietaker" verdi={l.kind === 'bedrift' ? (l.firma || l.navn) : l.navn} />
          </Para>
          <Para nr="2" tittel="Leieobjektet">
            <Linje etikett="Adresse" verdi={adr} />
            <Linje etikett="Type" verdi={typeLinje} />
            <Linje etikett="Møblering" verdi={MOBLERING[b.mobilering]} />
            {b.matrikkel_str ? <Linje etikett="Matrikkel" verdi={b.matrikkel_str} /> : null}
            {b.bruksenhetsnummer ? <Linje etikett="Bolignr" verdi={b.bruksenhetsnummer} /> : null}
          </Para>
          <Para nr="3" tittel="Leieforhold">
            <Linje etikett="Form" verdi={v.kontraktstype === 'tidsbestemt' ? 'Tidsbestemt' : 'Tidsubestemt (løpende)'} />
            <Linje etikett="Overtakelse" verdi={datoNb(v.start)} />
            {v.kontraktstype === 'tidsbestemt' ? <Linje etikett="Til" verdi={datoNb(v.slutt)} /> : null}
            <Linje etikett="Oppsigelse" verdi={v.oppsigelse ? `${v.oppsigelse} måneder` : ''} />
          </Para>
          <Para nr="4" tittel="Husleie">
            <Linje etikett="Per måned" verdi={v.leie ? `${kr(v.leie)} kr` : ''} />
            <Linje etikett="Forfall" verdi={v.forfallsdag ? `den ${v.forfallsdag}.` : ''} />
            <Linje etikett="Strøm/utgifter" verdi={v.utgifterInkludert ? 'Inkludert' : 'Kommer i tillegg'} />
          </Para>
          <Para nr="5" tittel="Depositum">
            <Linje etikett="Type" verdi={DEPOSITUM_TYPE[v.depositumType]} />
            {v.depositumType !== 'ingen' ? <Linje etikett="Beløp" verdi={depBelop ? `${kr(depBelop)} kr (${v.depositumMnd} mnd)` : ''} /> : null}
          </Para>
          {v.saerlige ? (
            <Para nr="6" tittel="Særlige bestemmelser">
              <p className="whitespace-pre-line text-[11.5px] leading-relaxed" style={{ color: DIM }}>{v.saerlige}</p>
            </Para>
          ) : null}
        </div>
        {!kompakt ? (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: HAIR }}>
            {['Utleier', 'Leietaker'].map((r) => (
              <div key={r}>
                <span className="block h-8 rounded-[6px]" style={{ background: 'rgba(212,150,255,0.1)', boxShadow: `inset 0 0 0 1px ${HAIR}` }} />
                <p className="mt-1 text-[9px]" style={{ color: SVAK }}>{r} · signeres med BankID</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
