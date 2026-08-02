'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Home, Loader2, MapPin, ShieldCheck } from 'lucide-react';

const PropertyInterestPage = () => {
  const [params, setParams] = useState(null);
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const next = {
      property: q.get('property') || '',
      e: q.get('e') || '',
      t: q.get('t') || '',
      c: q.get('c') || '',
      r: q.get('r') || '',
      pt: q.get('pt') || '',
    };
    setParams(next);
    const lookup = new URLSearchParams({ property: next.property });
    if (next.c) lookup.set('c', next.c);
    if (next.r) lookup.set('r', next.r);
    if (next.pt) lookup.set('pt', next.pt);
    fetch(`/api/newsletter/property-interest/lookup?${lookup.toString()}`)
      .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!ok || !body.ok) throw new Error(body.error || 'Kunne ikke åpne boliglenken');
        setData(body);
        setState('ready');
      })
      .catch((err) => { setError(err.message); setState('error'); });
  }, []);

  const meta = useMemo(() => {
    const p = data?.property;
    if (!p) return '';
    return [p.area || p.city, p.bedrooms ? `${p.bedrooms} soverom` : null, p.sqm ? `${p.sqm} m²` : null, p.availableFrom ? `Ledig ${p.availableFrom}` : null].filter(Boolean).join(' · ');
  }, [data]);

  const confirm = async () => {
    if (!params || state === 'submitting') return;
    setState('submitting');
    setError('');
    try {
      const res = await fetch('/api/newsletter/property-interest/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: params.property,
          campaign: params.c,
          r: params.r,
          pt: params.pt,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || 'Kunne ikke registrere interessen');
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('ready');
    }
  };

  const property = data?.property;
  const images = Array.isArray(property?.images) ? property.images.filter(Boolean) : [];
  const image = images.length ? images[Math.min(imgIdx, images.length - 1)] : '';
  // FINN-lenken kommer fra boligberikelsen i admin. Den vises som sekundær
  // utgang — hovedhandlingen er å registrere interessen hos oss, ellers går
  // henvendelsen via FINNs skjema og aldri inn i DigiHome.
  const finnUrl = typeof property?.finnUrl === 'string' ? property.finnUrl : '';
  // Plattformens egen boligside: full adresse, «Møt utleieren», visningsbooking,
  // chat og BankID-signering. Vi lenker bare dit når boligen har bilder — ellers
  // sender vi folk til en tom side.
  const publicUrl = images.length && typeof property?.publicUrl === 'string' ? property.publicUrl : '';

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f4f1ed] text-[#171513]">
      <header className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <a href="/" aria-label="DigiHome til forsiden"><img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-5 w-auto" /></a>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#77716a]"><ShieldCheck className="h-4 w-4 text-[#7A3EC8]" /> Trygg bekreftelse</span>
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 pb-14 pt-4 sm:px-8 sm:pt-10">
        {state === 'loading' ? (
          <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#7A3EC8]" /><span className="ml-3 text-[14px] text-[#77716a]">Henter boligen …</span></div>
        ) : state === 'error' ? (
          <div className="rounded-3xl border border-[#e6e1db] bg-white p-8 text-center shadow-[0_18px_60px_-40px_rgba(0,0,0,.35)] sm:p-12">
            <Home className="mx-auto h-9 w-9 text-[#a69f97]" />
            <h1 className="mt-5 text-[30px] font-bold tracking-[-0.035em]">Lenken kunne ikke åpnes</h1>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#77716a]">{error || 'Be om en ny lenke fra DigiHome.'}</p>
          </div>
        ) : state === 'done' ? (
          <div className="rounded-3xl border border-[#e6e1db] bg-white p-8 text-center shadow-[0_18px_60px_-40px_rgba(0,0,0,.35)] sm:p-14" data-testid="property-interest-success">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#17131b]"><CheckCircle2 className="h-8 w-8 text-[#d298ff]" /></span>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A3EC8]">Interessen er registrert</p>
            <h1 className="mx-auto mt-3 max-w-xl text-[34px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[44px]">Takk{data?.firstName ? `, ${data.firstName}` : ''}!</h1>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#6d6760]">Vi har lagt <strong>{property?.title}</strong> til på leietakerprofilen din. Teamet vårt følger opp videre.</p>
            <a href="/" className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#d298ff] px-6 text-[13px] font-bold text-[#14081f]">Til DigiHome</a>
            {publicUrl || finnUrl ? (
              <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {publicUrl ? (
                  <a href={publicUrl} target="_blank" rel="noreferrer" data-testid="property-interest-public-done"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7A3EC8] underline decoration-[#d8c4f5] underline-offset-4 transition hover:text-[#5c2a9c]">
                    Se hele boligen og book visning <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                {finnUrl ? (
                  <a href={finnUrl} target="_blank" rel="noreferrer" data-testid="property-interest-finn-done"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6d6760] underline decoration-[#d5cec6] underline-offset-4 transition hover:text-[#171513]">
                    Se annonsen på FINN <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#e4dfd8] bg-white shadow-[0_22px_70px_-42px_rgba(0,0,0,.4)]" data-testid="property-interest-card">
            {images.length ? (
              <div className="relative bg-[#eeeae5]">
                <img src={image} alt={property?.title || 'Ledig bolig'} className="h-[240px] w-full object-cover sm:h-[360px]" />
                {images.length > 1 ? (
                  <>
                    <button type="button" aria-label="Forrige bilde" onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#171513] shadow-sm transition hover:bg-white">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button type="button" aria-label="Neste bilde" onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#171513] shadow-sm transition hover:bg-white">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white" data-testid="property-interest-image-count">
                      {Math.min(imgIdx, images.length - 1) + 1} / {images.length}
                    </span>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center bg-[#eeeae5]"><Home className="h-10 w-10 text-[#b4ada5]" /></div>
            )}
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto px-6 pt-4 sm:px-10" data-testid="property-interest-thumbs">
                {images.slice(0, 12).map((src, i) => (
                  <button key={`${src}-${i}`} type="button" onClick={() => setImgIdx(i)} aria-label={`Vis bilde ${i + 1}`}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === Math.min(imgIdx, images.length - 1) ? 'border-[#7A3EC8]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="p-6 sm:p-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A3EC8]">Ledig bolig</p>
              <h1 className="mt-3 text-[30px] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[42px]">{property?.title}</h1>
              {meta ? <p className="mt-3 flex items-start gap-2 text-[13.5px] leading-relaxed text-[#6d6760]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7A3EC8]" /> {meta}</p> : null}
              {property?.monthlyRentBand ? <p className="mt-4 text-[17px] font-bold text-[#171513]">{property.monthlyRentBand}</p> : null}

              {!data?.available ? (
                <div className="mt-7 rounded-2xl bg-amber-50 px-5 py-4 text-[13px] leading-relaxed text-amber-800">Denne boligen er dessverre ikke ledig lenger. Vi sender deg gjerne andre aktuelle boliger senere.</div>
              ) : data?.preview ? (
                <div className="mt-7 rounded-2xl bg-[#f5edfc] px-5 py-4 text-[13px] leading-relaxed text-[#654b7d]">Dette er en forhåndsvisning. I den personlige e-posten blir knappen under aktiv og registrerer interessen på riktig leietakerprofil.</div>
              ) : (
                <>
                  <button type="button" onClick={confirm} disabled={state === 'submitting'} data-testid="property-interest-confirm" className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#d298ff] px-6 text-[15px] font-bold text-[#14081f] transition hover:bg-[#c983ff] disabled:opacity-60 sm:w-auto sm:min-w-[260px]">
                    {state === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Ja, jeg er interessert {state !== 'submitting' ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                  <p className="mt-3 text-[11.5px] leading-relaxed text-[#8b8580]">Klikket registrerer interessen på leietakerprofilen din. Ingen bindende avtale.</p>
                </>
              )}
              {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[12.5px] text-red-700">{error}</p> : null}
              {publicUrl || finnUrl ? (
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {publicUrl ? (
                    <a href={publicUrl} target="_blank" rel="noreferrer" data-testid="property-interest-public"
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7A3EC8] underline decoration-[#d8c4f5] underline-offset-4 transition hover:text-[#5c2a9c]">
                      Se hele boligen og book visning <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {finnUrl ? (
                    <a href={finnUrl} target="_blank" rel="noreferrer" data-testid="property-interest-finn"
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6d6760] underline decoration-[#d5cec6] underline-offset-4 transition hover:text-[#171513]">
                      Se annonsen på FINN <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default PropertyInterestPage;
