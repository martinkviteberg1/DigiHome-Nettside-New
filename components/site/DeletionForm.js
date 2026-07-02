'use client';

// Skjema for kontosletting (Apple 5.1.1(v)) — sender forespørsel til backend.
import { useState } from 'react';
import { Loader2, CheckCircle2, Trash2 } from 'lucide-react';

export default function DeletionForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState(''); // honeypot
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (state === 'loading') return;
    setState('loading'); setErr('');
    try {
      const res = await fetch('/api/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, website: hp }),
      });
      const j = await res.json();
      if (j.ok) setState('done');
      else { setState('error'); setErr(j.error || 'Noe gikk galt — prøv igjen eller send e-post.'); }
    } catch (_) {
      setState('error'); setErr('Nettverksfeil — prøv igjen eller send e-post til personvern@digihome.no.');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex items-start gap-3" data-testid="deletion-success">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-[15px] text-emerald-900">Forespørselen er mottatt</p>
          <p className="text-[14px] text-emerald-800 mt-1">Du får en bekreftelse på e-post innen 72 timer, og slettingen fullføres innen 30 dager. Har du spørsmål underveis, kontakt personvern@digihome.no.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#e8e1d7] bg-white p-6 space-y-4" data-testid="deletion-form">
      <div>
        <label htmlFor="del-email" className="block text-[13px] font-semibold text-[#0a0a0a] mb-1.5">E-postadressen kontoen er registrert på *</label>
        <input id="del-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="din@epost.no"
          className="w-full h-12 rounded-xl border border-[#ddd] px-4 text-[15px] outline-none focus:border-[#9333EA] transition-colors" />
      </div>
      <div>
        <label htmlFor="del-msg" className="block text-[13px] font-semibold text-[#0a0a0a] mb-1.5">Melding (valgfritt)</label>
        <textarea id="del-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="F.eks. hvilken rolle du har (leietaker/utleier), eller andre detaljer"
          className="w-full rounded-xl border border-[#ddd] px-4 py-3 text-[15px] outline-none focus:border-[#9333EA] transition-colors resize-none" />
      </div>
      {/* honeypot — skjult for mennesker */}
      <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} />
      {err && <p className="text-[13px] text-rose-600">{err}</p>}
      <button type="submit" disabled={state === 'loading'}
        className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold hover:bg-black transition-colors disabled:opacity-60">
        {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Send forespørsel om sletting
      </button>
      <p className="text-[12px] text-[#888]">Vi bekrefter identiteten din via den registrerte e-postadressen før sletting gjennomføres.</p>
    </form>
  );
}
