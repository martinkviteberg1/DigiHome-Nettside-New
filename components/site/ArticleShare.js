'use client';

import { useState } from 'react';
import { Link2, Check, Share2, Linkedin, Facebook } from 'lucide-react';

// ---------------------------------------------------------------------------
// Deling. Bruker Web Share API når den finnes (mobil), ellers kopier-lenke
// pluss to direkte delingslenker.
//
// Ingen tredjeparts delingsskript: de laster sporingskode fra andre domener,
// noe som både saboterer samtykkestyringen vår og koster ytelse.
// ---------------------------------------------------------------------------
export default function ArticleShare({ title = '', compact = false }) {
  const [copied, setCopied] = useState(false);

  const currentUrl = () => (typeof window === 'undefined' ? '' : window.location.href);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      /* utilgjengelig utklippstavle — delingslenkene under fungerer fortsatt */
    }
  };

  const native = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, url: currentUrl() }); return true; } catch (e) { return false; }
    }
    return false;
  };

  const onShare = async () => { if (!(await native())) copy(); };

  const btn = 'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full border border-black/[0.09] bg-white text-[13px] font-medium text-[#4a4a4a] hover:border-[#d9c9f5] hover:text-[#7c3aed] transition-colors';

  if (compact) {
    return (
      <button type="button" onClick={onShare} className={btn} aria-label="Del artikkelen">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
        {copied ? 'Kopiert' : 'Del'}
      </button>
    );
  }

  const share = (kind) => {
    const u = encodeURIComponent(currentUrl());
    const href = kind === 'li'
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${u}`
      : `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    window.open(href, '_blank', 'noopener,noreferrer,width=640,height=560');
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" onClick={onShare} className={btn}>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? 'Lenke kopiert' : 'Kopier lenke'}
      </button>
      <button type="button" onClick={() => share('li')} className={btn} aria-label="Del på LinkedIn">
        <Linkedin className="w-3.5 h-3.5" /> LinkedIn
      </button>
      <button type="button" onClick={() => share('fb')} className={btn} aria-label="Del på Facebook">
        <Facebook className="w-3.5 h-3.5" /> Facebook
      </button>
    </div>
  );
}
