'use client';

/* ═══════════════ ProduktAdmin — administrer Produkt → Komponenter ═══════════════
   Modal for Utvikling-området: opprett/endre/slett produkter og kuraterte
   komponenter per produkt. Egen fil for å holde TasksTab.js-monolitten nede.
   API: GET/POST /api/admin/dev-products, PUT/DELETE /api/admin/dev-products/:id */

import { useState, useEffect } from 'react';
import { Boxes, X, Plus, Trash2, Loader2, Pencil, Check, CornerDownLeft } from 'lucide-react';

const PALETT = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#6366f1', '#14b8a6', '#71717a'];
const heading = { fontFamily: 'var(--font-heading)' };

export default function ProduktAdmin({ api, products = [], onChanged, onClose, visToast }) {
  const [nyttNavn, setNyttNavn] = useState('');
  const [nyFarge, setNyFarge] = useState(PALETT[0]);
  const [lagrer, setLagrer] = useState(false);
  const [redigerId, setRedigerId] = useState(null); // produkt-id under navneendring
  const [redigerNavn, setRedigerNavn] = useState('');
  const [kompTekst, setKompTekst] = useState({}); // {produktId: 'ny komponent…'}
  const [jobber, setJobber] = useState(''); // produkt-id med pågående kall

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kall = async (sti, opts, feilmelding) => {
    try {
      const r = await api(sti, opts);
      const j = await r.json();
      if (!j.ok) { visToast && visToast(j.error || feilmelding); return null; }
      onChanged && (await onChanged());
      return j;
    } catch (e) {
      visToast && visToast(feilmelding);
      return null;
    }
  };

  const opprett = async () => {
    const navn = nyttNavn.trim();
    if (!navn || lagrer) return;
    setLagrer(true);
    const j = await kall('dev-products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: navn, color: nyFarge }),
    }, 'Kunne ikke opprette produktet');
    if (j) { setNyttNavn(''); visToast && visToast(`Produktet «${navn}» opprettet`); }
    setLagrer(false);
  };

  const lagreNavn = async (p) => {
    const navn = redigerNavn.trim();
    setRedigerId(null);
    if (!navn || navn === p.name) return;
    setJobber(p.id);
    await kall(`dev-products/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: navn }),
    }, 'Kunne ikke endre navnet');
    setJobber('');
  };

  const settFarge = async (p, farge) => {
    if (farge === p.color) return;
    setJobber(p.id);
    await kall(`dev-products/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: farge }),
    }, 'Kunne ikke endre fargen');
    setJobber('');
  };

  const leggTilKomponent = async (p) => {
    const navn = (kompTekst[p.id] || '').trim();
    if (!navn) return;
    setJobber(p.id);
    const j = await kall(`dev-products/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ components: [...(p.components || []), { name: navn }] }),
    }, 'Kunne ikke legge til komponenten');
    if (j) setKompTekst((prev) => ({ ...prev, [p.id]: '' }));
    setJobber('');
  };

  const fjernKomponent = async (p, kompId) => {
    setJobber(p.id);
    await kall(`dev-products/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ components: (p.components || []).filter((c) => c.id !== kompId) }),
    }, 'Kunne ikke fjerne komponenten');
    setJobber('');
  };

  const slettProdukt = async (p) => {
    setJobber(p.id);
    const j = await kall(`dev-products/${p.id}`, { method: 'DELETE' }, 'Kunne ikke slette produktet');
    if (j) visToast && visToast(`Produktet «${p.name}» slettet`);
    setJobber('');
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center md:items-start md:px-4 md:pt-[8vh]">
      <div className="absolute inset-0 bg-[#0a0a0a]/35 backdrop-blur-[2px] dh-fade" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)] dh-panel-in md:max-h-[82vh] md:max-w-xl md:rounded-2xl md:shadow-[0_24px_80px_rgba(0,0,0,0.28)]" data-testid="product-admin-modal">
        {/* Grab-handle — kun mobil */}
        <div className="flex shrink-0 justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        {/* Topplinje */}
        <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.05] px-5 py-3 md:px-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#f4f0fb]"><Boxes className="h-3.5 w-3.5 text-[#8b5cf6]" /></span>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#999]">Produkter og komponenter</p>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-[#999] transition-colors hover:bg-[#f3f2f0] hover:text-[#555]" aria-label="Lukk" data-testid="product-admin-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 md:px-6">
          <p className="text-[12.5px] leading-relaxed text-[#999]">
            Utviklingssaker knyttes til <span className="font-semibold text-[#666]">ett produkt</span> og eventuelt én komponent i produktet.
            Bruk labels for frie, tverrgående temaer.
          </p>

          {/* Produktliste */}
          <div className="mt-4 space-y-3">
            {products.map((p) => (
              <div key={p.id} className="rounded-2xl border border-black/[0.06] bg-[#fdfdfc] p-3.5" data-testid={`product-row-${p.id}`}>
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: p.color }} />
                  {redigerId === p.id ? (
                    <input
                      autoFocus value={redigerNavn}
                      onChange={(e) => setRedigerNavn(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') lagreNavn(p); if (e.key === 'Escape') setRedigerId(null); }}
                      onBlur={() => lagreNavn(p)}
                      data-testid={`product-name-input-${p.id}`}
                      className="h-8 min-w-0 flex-1 rounded-lg border border-[#8b5cf6]/40 bg-white px-2.5 text-[14px] font-semibold outline-none ring-2 ring-[#8b5cf6]/15"
                    />
                  ) : (
                    <p className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-[#1a1a1a]" style={heading}>{p.name}</p>
                  )}
                  {jobber === p.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#cf97fc]" />}
                  {redigerId !== p.id && (
                    <button
                      onClick={() => { setRedigerId(p.id); setRedigerNavn(p.name); }}
                      data-testid={`product-edit-${p.id}`}
                      className="shrink-0 rounded-lg p-1.5 text-[#bbb] transition-colors hover:bg-[#f3f2f0] hover:text-[#555]"
                      title="Endre navn"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => slettProdukt(p)}
                    data-testid={`product-delete-${p.id}`}
                    className="shrink-0 rounded-lg p-1.5 text-[#bbb] transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Slett produkt (kun mulig når ingen saker bruker det)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Fargevalg */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  {PALETT.map((f) => (
                    <button
                      key={f} onClick={() => settFarge(p, f)} title={f}
                      className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${p.color === f ? 'ring-2 ring-offset-1' : ''}`}
                      style={{ background: f, ...(p.color === f ? { '--tw-ring-color': f } : {}) }}
                      data-testid={`product-color-${p.id}-${f.slice(1)}`}
                    />
                  ))}
                </div>

                {/* Komponenter */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {(p.components || []).map((c) => (
                    <span key={c.id} className="group inline-flex items-center gap-1 rounded-full border border-black/[0.07] bg-white py-1 pl-2.5 pr-1.5 text-[12px] font-semibold text-[#555]" data-testid={`component-chip-${c.id}`}>
                      {c.name}
                      <button
                        onClick={() => fjernKomponent(p, c.id)}
                        className="rounded-full p-0.5 text-[#ccc] transition-colors hover:bg-rose-50 hover:text-rose-500"
                        title="Fjern komponent"
                        data-testid={`component-remove-${c.id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      value={kompTekst[p.id] || ''}
                      onChange={(e) => setKompTekst((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') leggTilKomponent(p); }}
                      placeholder="Ny komponent …"
                      data-testid={`component-input-${p.id}`}
                      className="h-7 w-36 rounded-full border border-dashed border-black/[0.12] bg-transparent px-3 text-[12px] outline-none transition-all placeholder:text-[#c2beb8] focus:border-[#8b5cf6]/50 focus:bg-white"
                    />
                    {(kompTekst[p.id] || '').trim() && (
                      <button onClick={() => leggTilKomponent(p)} className="rounded-full bg-[#0a0a0a] p-1 text-white" data-testid={`component-add-${p.id}`}>
                        <CornerDownLeft className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!products.length && (
              <div className="rounded-2xl border border-dashed border-black/[0.1] py-8 text-center">
                <Boxes className="mx-auto h-6 w-6 text-[#d5d2cc]" />
                <p className="mt-2 text-[13px] text-[#aaa]">Ingen produkter ennå — legg til det første under.</p>
              </div>
            )}
          </div>
        </div>

        {/* Nytt produkt */}
        <div className="shrink-0 border-t border-black/[0.06] px-5 py-4 md:px-6" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Nytt produkt</p>
          <div className="flex items-center gap-2">
            <input
              value={nyttNavn}
              onChange={(e) => setNyttNavn(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') opprett(); }}
              placeholder="F.eks. Mobil app"
              data-testid="product-new-name"
              className="h-10 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] outline-none transition-all placeholder:text-[#bbb] hover:border-black/[0.16] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
            />
            <div className="flex shrink-0 items-center gap-1">
              {PALETT.slice(0, 5).map((f) => (
                <button
                  key={f} onClick={() => setNyFarge(f)} title={f}
                  className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${nyFarge === f ? 'ring-2 ring-offset-1' : ''}`}
                  style={{ background: f, ...(nyFarge === f ? { '--tw-ring-color': f } : {}) }}
                  data-testid={`product-new-color-${f.slice(1)}`}
                />
              ))}
            </div>
            <button
              onClick={opprett}
              disabled={!nyttNavn.trim() || lagrer}
              data-testid="product-new-add"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
            >
              {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="text-[13px] font-semibold">Legg til</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
