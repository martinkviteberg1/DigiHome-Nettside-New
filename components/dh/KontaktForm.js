'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle2, Send } from 'lucide-react';

export default function KontaktForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || (!form.email && !form.phone)) { setStatus('error'); return; }
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          notes: form.message, lead_type: 'kontakt', source: 'kontakt',
        }),
      });
      if (res.ok) { setStatus('done'); setForm({ name: '', email: '', phone: '', message: '' }); }
      else setStatus('error');
    } catch (e) { setStatus('error'); }
  };

  if (status === 'done') {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_18px_60px_-26px_rgba(0,0,0,0.18)] text-center">
        <div className="w-14 h-14 rounded-full bg-[#eafaf0] flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7 text-emerald-500" /></div>
        <h3 className="text-[22px] font-bold text-[#1f1f1f] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Takk for henvendelsen!</h3>
        <p className="text-[15px] text-[#666] leading-relaxed">Vi tar kontakt med deg så snart som mulig — vanligvis innen én virkedag.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-3xl p-7 sm:p-9 shadow-[0_18px_60px_-26px_rgba(0,0,0,0.18)] space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12.5px] font-semibold text-[#666] mb-1.5">Navn *</label>
          <input value={form.name} onChange={set('name')} required placeholder="Ditt navn" className="w-full h-12 px-4 rounded-xl border border-[#e6e3df] bg-[#fdfcfb] outline-none focus:border-[#cf97fc] focus-visible:outline-none text-[15px] transition-colors" data-testid="kontakt-name" />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-[#666] mb-1.5">Telefon</label>
          <input value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="+47 …" className="w-full h-12 px-4 rounded-xl border border-[#e6e3df] bg-[#fdfcfb] outline-none focus:border-[#cf97fc] focus-visible:outline-none text-[15px] transition-colors" data-testid="kontakt-phone" />
        </div>
      </div>
      <div>
        <label className="block text-[12.5px] font-semibold text-[#666] mb-1.5">E-post</label>
        <input value={form.email} onChange={set('email')} type="email" inputMode="email" placeholder="din@epost.no" className="w-full h-12 px-4 rounded-xl border border-[#e6e3df] bg-[#fdfcfb] outline-none focus:border-[#cf97fc] focus-visible:outline-none text-[15px] transition-colors" data-testid="kontakt-email" />
      </div>
      <div>
        <label className="block text-[12.5px] font-semibold text-[#666] mb-1.5">Melding</label>
        <textarea value={form.message} onChange={set('message')} rows={4} placeholder="Hva kan vi hjelpe deg med?" className="w-full px-4 py-3 rounded-xl border border-[#e6e3df] bg-[#fdfcfb] outline-none focus:border-[#cf97fc] focus-visible:outline-none text-[15px] resize-none transition-colors" data-testid="kontakt-message" />
      </div>
      {status === 'error' && <p className="text-[13px] text-rose-500">Fyll inn navn og enten e-post eller telefon.</p>}
      <button type="submit" disabled={status === 'sending'} data-testid="kontakt-submit" className="w-full h-13 py-3.5 rounded-xl bg-[#1f1f1f] text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60">
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send melding</>}
      </button>
    </form>
  );
}
