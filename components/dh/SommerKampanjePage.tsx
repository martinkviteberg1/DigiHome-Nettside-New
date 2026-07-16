'use client';

/*
 * /sommer — Sommerkampanje 2026 landingsside.
 * 10 % forvaltningshonorar + 0 kr oppstart · frist 10. juli.
 * Mål: konvertere klikk fra nyhetsbrevet (og annonser) til leads.
 * Nyhetsbrev-attribusjon: ?c=<campaignId>&r=<rid> registreres på leaden.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AddressAutocomplete } from '@/components/dh/AddressAutocomplete';
import { track, getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart } from '@/lib/gtag';

const AC = '#d298ff';
const DEADLINE = new Date('2026-07-10T23:59:59+02:00');

const INCLUDED = [
  { t: 'Annonsering og visninger', d: 'Profesjonelle bilder, FINN-annonse og utvelgelse av riktig leietaker.' },
  { t: 'Kontrakt med BankID', d: 'Trygg leiekontrakt, e-signering og depositumskonto — alt digitalt.' },
  { t: 'All kommunikasjon', d: 'Vi håndterer leietaker gjennom hele leieforholdet. Du kobles kun på ved behov.' },
  { t: 'Husleie rett på konto', d: 'Automatisk innkreving — vi følger opp og purrer om det trengs.' },
];

// «Magic link»-hjelpere: e-post ligger base64url-kodet i ?e= på nyhetsbrev-CTAer.
// Vises kun delvis maskert i UI (trygt hvis lenken videresendes).
const decodeB64url = (v: string) => {
  try {
    const b = String(v || '').replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(window.atob(b)));
  } catch (e) { return ''; }
};
const maskEmail = (em: string) => {
  const [u, d] = String(em || '').split('@');
  if (!u || !d) return '';
  return `${u.slice(0, 2)}····@${d}`;
};

export default function SommerKampanjePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [postal, setPostal] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const startedRef = useRef(false);
  const nlRef = useRef({ c: '', r: '' });

  // «Magic link» (ettklikks-interesse fra nyhetsbrev): ?e=<b64url-epost>&t=<hmac>
  // Lead opprettes ALDRI automatisk ved sidevisning (e-postskannere GET-er alle
  // lenker) — kun ved aktivt klikk som sender POST til /api/interesse/confirm.
  const [magic, setMagic] = useState<any>({ status: 'none', firstName: '', e: '', t: '', maskedEmail: '', err: '' });
  const [magicPhone, setMagicPhone] = useState('');

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      nlRef.current = { c: sp.get('c') || '', r: sp.get('r') || '' };
      const e = sp.get('e') || '';
      const t = sp.get('t') || '';
      if (e && t) {
        setMagic((m: any) => ({ ...m, status: 'loading', e, t, maskedEmail: maskEmail(decodeB64url(e)) }));
        fetch(`/api/interesse/lookup?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`)
          .then((r) => r.json().then((j) => ({ okHttp: r.ok, j })).catch(() => ({ okHttp: false, j: {} as any })))
          .then(({ okHttp, j }: any) => {
            if (okHttp && j.ok) {
              setMagic((m: any) => ({ ...m, status: 'ready', firstName: j.firstName || '' }));
              try { track('magic_link_view', { form: 'sommer', campaign: 'sommer2026' }); } catch (e2) {}
            } else {
              // Ugyldig/utløpt token → stille fallback til vanlig skjema
              setMagic((m: any) => ({ ...m, status: 'none' }));
            }
          })
          .catch(() => setMagic((m: any) => ({ ...m, status: 'none' })));
      }
    } catch (e) {}
    track('page_view_campaign', { campaign: 'sommer2026' });
  }, []);

  const daysLeft = useMemo(() => {
    const ms = DEADLINE.getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }, []);
  const expired = daysLeft <= 0;

  const markStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { track('form_start', { form: 'sommer' }); trackLeadStart('sommer'); } catch (e) {}
  };

  const valid = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 8 && /\S+@\S+\.\S+/.test(email);
  // Adresse er valgfri — men er den fylt inn, MÅ den være valgt fra listen
  // (postnummer + husnummer). Hindrer ufullstendige adresser i CRM-et.
  const addressOk = !address.trim() || (!!postal && /\d/.test(address));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!valid || sending) return;
    if (!addressOk) {
      setErr('Velg adressen fra forslagslisten — da får vi med postnummer og husnummer.');
      return;
    }
    setSending(true);
    setErr('');
    try {
      const nl = nlRef.current;
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: '+47 ' + phone.replace(/\D/g, ''),
          email: email.trim(),
          address: address.trim(),
          postal_code: postal,
          lead_type: 'huseier',
          rental_model: 'langtid',
          source: 'sommerkampanje-2026',
          notes: `Sommerkampanje 2026: 10 % forvaltningshonorar + 0 kr oppstart (frist 10. juli)${nl.c ? ` · Fra nyhetsbrev (kampanje ${nl.c})` : ''}`,
          nl_campaign: nl.c || undefined,
          nl_rid: nl.r || undefined,
          attribution: getLeadAttribution(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data.success || data.ok)) throw new Error('Innsending feilet');
      try {
        track('lead_submit', { form: 'sommer', campaign: 'sommer2026' });
        trackLead({ formId: 'sommer', source: 'sommerkampanje-2026', leadId: data?.data?.id, email, phone: '+47 ' + phone });
      } catch (e2) {}
      setDone(true);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e3) {}
    } catch {
      try { track('form_error', { form: 'sommer', kind: 'submit' }); } catch (e4) {}
      setErr('Noe gikk galt. Prøv igjen — eller ring oss på telefon.');
    } finally {
      setSending(false);
    }
  };

  // Ettklikks-bekreftelse — sender POST (aldri GET) med signert token.
  const confirmMagic = async () => {
    if (magic.status === 'confirming' || expired) return;
    const phoneDigits = magicPhone.replace(/\D/g, '');
    if (magic.status === 'needPhone' && phoneDigits.length < 8) {
      setMagic((m: any) => ({ ...m, err: 'Fyll inn et gyldig telefonnummer (8 siffer).' }));
      return;
    }
    const prevStatus = magic.status;
    setMagic((m: any) => ({ ...m, status: 'confirming', err: '' }));
    try {
      const nl = nlRef.current;
      const res = await fetch('/api/interesse/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          e: magic.e,
          t: magic.t,
          phone: phoneDigits.length >= 8 ? '+47 ' + phoneDigits : undefined,
          campaign: 'sommer2026',
          nl_campaign: nl.c || undefined,
          nl_rid: nl.r || undefined,
          attribution: getLeadAttribution(),
        }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (res.ok && j.ok) {
        try {
          track('lead_submit', { form: 'sommer-ettklikk', campaign: 'sommer2026' });
          trackLead({ formId: 'sommer-ettklikk', source: 'nyhetsbrev-ettklikk', leadId: j.leadId });
        } catch (e2) {}
        setDone(true);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e3) {}
      } else if (j && j.needPhone) {
        // Kontakten mangler telefonnummer — be om det (eneste feltet vi trenger)
        setMagic((m: any) => ({ ...m, status: 'needPhone', err: '' }));
      } else {
        try { track('form_error', { form: 'sommer-ettklikk', kind: 'confirm' }); } catch (e4) {}
        setMagic((m: any) => ({ ...m, status: prevStatus === 'needPhone' ? 'needPhone' : 'ready', err: 'Noe gikk galt. Prøv igjen — eller bruk skjemaet.' }));
      }
    } catch {
      setMagic((m: any) => ({ ...m, status: prevStatus === 'needPhone' ? 'needPhone' : 'ready', err: 'Noe gikk galt. Prøv igjen — eller bruk skjemaet.' }));
    }
  };

  const magicActive = magic.status === 'loading' || magic.status === 'ready' || magic.status === 'confirming' || magic.status === 'needPhone';

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Minimal header */}
      <header className="border-b border-[#f0ede8]">
        <div className="max-w-[1080px] mx-auto px-5 h-[64px] flex items-center justify-between">
          <Link href="/" aria-label="DigiHome forside">
            <img src="/deck-logo-dark.svg" alt="DigiHome" className="h-[26px] w-auto" />
          </Link>
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#716b63]">Sommerkampanje 2026</span>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-5 pb-24">
        {done ? (
          /* ---------- Kvittering ---------- */
          <div className="max-w-[560px] mx-auto text-center pt-20" data-testid="sommer-success">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(210,152,255,0.16)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a052e0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h1 className="text-[30px] sm:text-[36px] font-bold tracking-[-0.03em] leading-[1.1] mt-7">Takk! Kampanjeprisen er reservert for deg.</h1>
            <p className="text-[15.5px] text-[#666] leading-[1.65] mt-4">Vi har registrert henvendelsen din med sommerkampanjen — <strong className="text-[#0a0a0a]">10 % forvaltningshonorar og 0 kr i oppstart</strong>.</p>
            <div className="inline-flex items-center gap-3.5 mt-9 rounded-2xl border border-[#f0ede8] bg-[#fafaf8] px-5 py-4 text-left">
              <img src="/sarah-sleeman.jpg" alt="Sarah Sleeman" className="w-[52px] h-[52px] rounded-full object-cover" />
              <div>
                <p className="text-[14px] font-bold">Sarah Sleeman tar kontakt innen 24 timer</p>
                <p className="text-[12.5px] text-[#716b63] mt-0.5">Daglig leder, DigiHome</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 pt-12 sm:pt-16">
            {/* ---------- Venstre: tilbudet ---------- */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5" style={{ background: 'rgba(210,152,255,0.14)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a052e0' }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b3fb0]">
                  {expired ? 'Kampanjen er avsluttet' : `Gjelder til 10. juli · ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dager'} igjen`}
                </span>
              </div>
              <h1 className="text-[38px] sm:text-[52px] font-bold tracking-[-0.035em] leading-[1.04] mt-6">
                10 % forvaltnings­honorar.
                <br />
                <span style={{ color: '#a052e0' }}>0 kr i oppstart.</span>
              </h1>
              <p className="text-[16px] sm:text-[17px] text-[#666] leading-[1.65] mt-5 max-w-[520px]">
                Sommeren er høysesong for utleie i Bergen. Registrer deg innen 10. juli, så får du full forvaltning til kampanjepris — vi tar oss av alt, du får leien rett på konto.
              </p>

              <div className="mt-10 space-y-0 divide-y divide-[#f0ede8] border-y border-[#f0ede8]">
                {INCLUDED.map((x, i) => (
                  <div key={i} className="flex gap-4 py-5">
                    <span className="text-[13px] font-bold tabular-nums mt-0.5" style={{ color: '#a052e0' }}>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-[15px] font-semibold">{x.t}</p>
                      <p className="text-[13.5px] text-[#888] leading-[1.6] mt-1">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-[#78726a] leading-[1.6] mt-6 max-w-[480px]">
                Kampanjen gjelder nye avtaler om full forvaltning inngått innen 10. juli 2026. Ingen bindingstid, ingen skjulte gebyrer. Uforpliktende registrering — vi tar kontakt for en kort prat først.
              </p>
            </div>

            {/* ---------- Høyre: skjema eller ettklikks-bekreftelse ---------- */}
            <div>
              {magicActive ? (
                /* «Magic link» fra nyhetsbrev: vi kjenner mottakeren — ett klikk holder */
                <div className="rounded-3xl border border-[#eee7f5] bg-[#fdfcfe] p-6 sm:p-7 lg:sticky lg:top-8" style={{ boxShadow: '0 20px 60px -30px rgba(160,82,224,0.18)' }} data-testid="sommer-magic">
                  {magic.status === 'loading' ? (
                    <div className="py-10 text-center" data-testid="sommer-magic-loading">
                      <div className="w-10 h-10 rounded-full border-[3px] border-[#eee7f5] mx-auto animate-spin" style={{ borderTopColor: '#a052e0' }} />
                      <p className="text-[13.5px] text-[#716b63] mt-4">Henter opplysningene dine…</p>
                    </div>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(210,152,255,0.14)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a052e0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7b3fb0]">Fra nyhetsbrevet</span>
                      </div>
                      <p className="text-[21px] font-bold tracking-[-0.01em] mt-4" data-testid="sommer-magic-greeting">
                        Hei{magic.firstName ? ` ${magic.firstName}` : ''}!
                      </p>
                      <p className="text-[14px] text-[#666] leading-[1.65] mt-2">
                        Vi har allerede opplysningene dine{magic.maskedEmail ? <> (<span className="font-semibold text-[#0a0a0a]">{magic.maskedEmail}</span>)</> : null}. Ett klikk under, så er kampanjeprisen din — <strong className="text-[#0a0a0a]">ingen skjema</strong>.
                      </p>

                      <div className="mt-5 rounded-2xl border border-[#eee7f5] bg-white px-4 py-3.5">
                        <p className="text-[13px] font-bold" style={{ color: '#a052e0' }}>10 % forvaltningshonorar · 0 kr i oppstart</p>
                        <p className="text-[11.5px] text-[#716b63] mt-0.5">Reserveres for deg — gjelder til 10. juli</p>
                      </div>

                      {magic.status === 'needPhone' ? (
                        <div className="mt-5">
                          <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Telefon — så ringer vi deg *</label>
                          <div className="flex">
                            <span className="h-[46px] px-3 rounded-l-xl border border-r-0 border-[#e8e2ef] bg-[#f7f4fa] text-[13.5px] text-[#888] flex items-center">+47</span>
                            <input value={magicPhone} onChange={(e) => setMagicPhone(e.target.value.replace(/[^\d\s]/g, ''))} placeholder="900 00 000" inputMode="tel" data-testid="sommer-magic-phone" autoFocus
                              className="w-full h-[46px] rounded-r-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
                          </div>
                          <p className="text-[11.5px] text-[#78726a] mt-1.5">Vi mangler bare telefonnummeret ditt — resten har vi.</p>
                        </div>
                      ) : null}

                      {magic.err ? <p className="text-[13px] text-red-600 mt-4" data-testid="sommer-magic-error">{magic.err}</p> : null}

                      <button type="button" onClick={confirmMagic} disabled={magic.status === 'confirming' || expired} data-testid="sommer-magic-confirm"
                        className="w-full h-[52px] rounded-full mt-5 text-[15px] font-bold transition-all disabled:opacity-40"
                        style={{ background: '#0a0a0a', color: '#fff' }}>
                        {magic.status === 'confirming' ? 'Bekrefter…' : expired ? 'Kampanjen er avsluttet' : 'Ja, sikre kampanjeprisen for meg →'}
                      </button>
                      <p className="text-[11.5px] text-[#716b63] text-center mt-3">Helt uforpliktende — vi tar kontakt for en kort prat først.</p>

                      <div className="flex items-center gap-2.5 mt-5 pt-5 border-t border-[#f0ede8]">
                        <img src="/sarah-sleeman.jpg" alt="Sarah Sleeman" className="w-[34px] h-[34px] rounded-full object-cover" />
                        <p className="text-[11.5px] text-[#716b63] leading-[1.5]">Sarah Sleeman (daglig leder) tar personlig kontakt innen 24 timer.</p>
                      </div>

                      <button type="button" onClick={() => setMagic((m: any) => ({ ...m, status: 'none' }))} data-testid="sommer-magic-fallback"
                        className="block w-full text-center text-[12px] text-[#bbb] underline underline-offset-2 mt-4 hover:text-[#666]">
                        Ikke deg{magic.firstName ? `, ${magic.firstName}` : ''}? Bruk skjemaet i stedet
                      </button>
                    </>
                  )}
                </div>
              ) : (
              <form onSubmit={submit} className="rounded-3xl border border-[#eee7f5] bg-[#fdfcfe] p-6 sm:p-7 lg:sticky lg:top-8" style={{ boxShadow: '0 20px 60px -30px rgba(160,82,224,0.18)' }} data-testid="sommer-form">
                <p className="text-[17px] font-bold tracking-[-0.01em]">Sikre deg kampanjeprisen</p>
                <p className="text-[13px] text-[#716b63] mt-1">Tar under ett minutt — helt uforpliktende.</p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Navn *</label>
                    <input value={name} onChange={(e) => { markStart(); setName(e.target.value); }} placeholder="Fornavn Etternavn" data-testid="sommer-name"
                      className="w-full h-[46px] rounded-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Telefon *</label>
                    <div className="flex">
                      <span className="h-[46px] px-3 rounded-l-xl border border-r-0 border-[#e8e2ef] bg-[#f7f4fa] text-[13.5px] text-[#888] flex items-center">+47</span>
                      <input value={phone} onChange={(e) => { markStart(); setPhone(e.target.value.replace(/[^\d\s]/g, '')); }} placeholder="900 00 000" inputMode="tel" data-testid="sommer-phone"
                        className="w-full h-[46px] rounded-r-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">E-post *</label>
                    <input value={email} onChange={(e) => { markStart(); setEmail(e.target.value); }} placeholder="din@epost.no" inputMode="email" data-testid="sommer-email"
                      className="w-full h-[46px] rounded-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#555] block mb-1.5">Adresse på utleieboligen <span className="font-normal text-[#78726a]">(valgfritt)</span></label>
                    <AddressAutocomplete
                      value={address}
                      onChange={(v: string) => { markStart(); setAddress(v); setPostal(''); if (err) setErr(''); }}
                      onSelect={(s: any) => { setAddress(s.address); setPostal(s.postalCode || ''); }}
                      requireSelection
                      placeholder="F.eks. Nordnesveien 13, Bergen"
                      dataTestId="sommer-address"
                      inputClassName="w-full h-[46px] rounded-xl border border-[#e8e2ef] bg-white px-3.5 text-[14.5px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]"
                    />
                  </div>
                </div>

                {err ? <p className="text-[13px] text-red-600 mt-4" data-testid="sommer-error">{err}</p> : null}

                <button type="submit" disabled={!valid || sending || expired} data-testid="sommer-submit"
                  className="w-full h-[52px] rounded-full mt-6 text-[15px] font-bold transition-all disabled:opacity-40"
                  style={{ background: '#0a0a0a', color: '#fff' }}>
                  {sending ? 'Sender…' : expired ? 'Kampanjen er avsluttet' : 'Få kampanjeprisen →'}
                </button>

                <div className="flex items-center gap-2.5 mt-5">
                  <img src="/sarah-sleeman.jpg" alt="Sarah Sleeman" className="w-[34px] h-[34px] rounded-full object-cover" />
                  <p className="text-[11.5px] text-[#716b63] leading-[1.5]">Sarah Sleeman (daglig leder) tar personlig kontakt innen 24 timer.</p>
                </div>
              </form>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#f0ede8]">
        <div className="max-w-[1080px] mx-auto px-5 h-[58px] flex items-center justify-between">
          <span className="text-[12px] text-[#bbb]">DigiHome · Bergen</span>
          <Link href="/" className="text-[12px] text-[#716b63] hover:text-[#0a0a0a]">digihome.no</Link>
        </div>
      </footer>
    </div>
  );
}
