'use client';

/* ═════════════════════════════════════════════════════════════════════════════
   TEAMCHAT — flytende boble nede til høyre, tilgjengelig på alle admin-sider.
   Supermoderne 2026-uttrykk: frostet glass, spring-animasjoner, gradient-glød,
   grupperte meldinger (à la Linear/Slack) og myke mikrointeraksjoner.

   · Én global kanal («generelt») — datamodellen er kanal-klar for senere.
   · @-tagging med autocomplete; taggede får e-post + varsel i klokken.
     Vanlige meldinger varsles KUN med uleste-badge her.
   · Polling: status hvert 15. sek (lukket), nye meldinger hvert 8. sek (åpen).
   · Kun interne roller — investor/eier ser den aldri (håndheves i API-et).
   ═════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageCircle, X, Loader2, ArrowUp, Trash2, AtSign, Reply, ArrowLeft, CornerDownRight, Pencil, Link2, Plus, Search, MessagesSquare, ClipboardList } from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const AVATAR_FARGER = ['#6d28d9', '#0a7d55', '#b3562e', '#1d4ed8', '#9a6b1c', '#be185d', '#0e7490', '#4d7c0f'];
const avatarFarge = (navn) => {
  let h = 0;
  for (const c of String(navn || '')) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_FARGER[h % AVATAR_FARGER.length];
};
const initialer = (navn) => String(navn || '?').trim().split(/\s+/).slice(0, 2).map((d) => d[0]).join('').toUpperCase();
const klokke = (iso) => { try { return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const dagLabel = (iso) => {
  const d = new Date(iso); const iDag = new Date(); const iGaar = new Date(Date.now() - 864e5);
  if (d.toDateString() === iDag.toDateString()) return 'I dag';
  if (d.toDateString() === iGaar.toDateString()) return 'I går';
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: d.getFullYear() !== iDag.getFullYear() ? 'numeric' : undefined });
};
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Grupperer meldinger: dag-separatorer + fortsettelser (samme avsender < 5 min).
   Brukes både i hovedstrømmen og i trådvisningen. */
const grupperMeldinger = (meldinger) => {
  const ut = [];
  let sisteDag = '';
  let forrige = null;
  for (const mld of meldinger) {
    const dag = dagLabel(mld.createdAt);
    if (dag !== sisteDag) { ut.push({ separator: dag, id: `sep-${dag}-${mld.id}` }); sisteDag = dag; forrige = null; }
    const fortsettelse = forrige && forrige.userId === mld.userId
      && (new Date(mld.createdAt) - new Date(forrige.createdAt)) < 5 * 60 * 1000;
    ut.push({ ...mld, fortsettelse });
    forrige = mld;
  }
  return ut;
};

/* Meldingstekst med uthevede @-tagger */
function MeldingTekst({ text, mentions }) {
  const deler = useMemo(() => {
    const navn = (mentions || []).map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!navn.length) return [{ t: text }];
    const re = new RegExp(`(@(?:${navn.map(escRe).join('|')}))`, 'g');
    return String(text).split(re).map((del) => (del.startsWith('@') && navn.includes(del.slice(1)) ? { t: del, tag: true } : { t: del }));
  }, [text, mentions]);
  return (
    <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.55] text-[#26221e]">
      {deler.map((d, i) => (d.tag
        ? <span key={i} className="rounded-[6px] bg-gradient-to-r from-[#f0ebfa] to-[#ece4fb] px-1.5 py-[1px] font-semibold text-[#6d28d9]">{d.t}</span>
        : <React.Fragment key={i}>{d.t}</React.Fragment>))}
    </p>
  );
}

export default function ChatBoble({ token, user }) {
  const [aapen, setAapen] = useState(false);
  const [vis, setVis] = useState(false); // for inn-animasjon
  const [meldinger, setMeldinger] = useState([]);
  const [laster, setLaster] = useState(false);
  const [tekst, setTekst] = useState('');
  const [sender, setSender] = useState(false);
  const [ulest, setUlest] = useState(0);
  const [brukere, setBrukere] = useState([]);
  const [mention, setMention] = useState(null); // {query, start}
  const [valgte, setValgte] = useState({}); // name -> id
  const [feil, setFeil] = useState('');
  const [fokus, setFokus] = useState(false);
  const [traad, setTraad] = useState(null); // rotmelding for åpen tråd (null = hovedstrøm)
  const [traadMeldinger, setTraadMeldinger] = useState([]); // svarene i den åpne tråden
  const [traadLaster, setTraadLaster] = useState(false);
  const [nyttSidenSist, setNyttSidenSist] = useState(null); // ISO — plassering av «Nytt siden sist»-linjen
  const [pendingTraad, setPendingTraad] = useState(null); // trådid fra dyplenke (?traad=)
  const [fane, setFane] = useState('chat'); // 'chat' | 'traader'
  const [traader, setTraader] = useState([]); // trådoversikten
  const [traadSok, setTraadSok] = useState('');
  const [redigererNavn, setRedigererNavn] = useState(false);
  const [navnUtkast, setNavnUtkast] = useState('');
  const [visSakVelger, setVisSakVelger] = useState(false);
  const [sakSok, setSakSok] = useState('');
  const [sakListe, setSakListe] = useState(null); // null = ikke lastet ennå
  const [sakJobber, setSakJobber] = useState(false); // kobling/oppretting pågår
  const listeRef = useRef(null);
  const traadListeRef = useRef(null);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const aapenRef = useRef(false);
  aapenRef.current = aapen;
  const traadRef = useRef(null);
  traadRef.current = traad;
  const faneRef = useRef('chat');
  faneRef.current = fane;
  const lesteTraaderRef = useRef(new Set()); // tråder åpnet i denne økten (badge nulles)

  /* Dyplenke fra e-postvarsler: /admin?chat=1 åpner chatten — ?traad=<id> rett inn i tråden */
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has('chat')) {
        setAapen(true);
        if (p.get('traad')) setPendingTraad(p.get('traad'));
        p.delete('chat');
        p.delete('traad');
        const q = p.toString();
        window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash);
      }
    } catch (e) {}
  }, []);

  /* Andre komponenter (f.eks. sak-skuffen) kan åpne en tråd direkte via
     window-event: dispatchEvent(new CustomEvent('dh-aapne-traad', {detail:{traadId}})) */
  useEffect(() => {
    const h = (e) => {
      const id = e?.detail?.traadId;
      if (!id) return;
      setAapen(true);
      setPendingTraad(String(id));
    };
    window.addEventListener('dh-aapne-traad', h);
    return () => window.removeEventListener('dh-aapne-traad', h);
  }, []);

  const api = useCallback(async (sti, opts = {}) => {
    const skille = sti.includes('?') ? '&' : '?';
    const r = await fetch(`/api/admin/chat/${sti}${skille}key=${encodeURIComponent(token)}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Noe gikk galt');
    return j;
  }, [token]);

  const scrollNed = useCallback(() => {
    requestAnimationFrame(() => {
      if (listeRef.current) listeRef.current.scrollTop = listeRef.current.scrollHeight;
    });
  }, []);

  const scrollTraadNed = useCallback(() => {
    requestAnimationFrame(() => {
      if (traadListeRef.current) traadListeRef.current.scrollTop = traadListeRef.current.scrollHeight;
    });
  }, []);

  /* Trådoversikten — badge for tråder brukeren alt har åpnet i økten nulles,
     ellers beholdes høyeste kjente ulest-tall (server nuller ved merk-lest). */
  const lastTraader = useCallback(async () => {
    try {
      const j = await api('traader');
      if (!j.traader) return;
      setTraader((prev) => {
        const prevMap = new Map(prev.map((t) => [t.id, t]));
        return j.traader.map((t) => {
          if (lesteTraaderRef.current.has(t.id)) return { ...t, uleste: t.uleste || 0 };
          const p = prevMap.get(t.id);
          return { ...t, uleste: Math.max(t.uleste || 0, p?.uleste || 0) };
        });
      });
    } catch (e) {}
  }, [api]);

  /* Uleste-status: poll hvert 15. sek når lukket */
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    const hent = async () => {
      if (aapenRef.current) return;
      try { const j = await api('status'); if (alive) setUlest(j.ulest || 0); } catch (e) {}
    };
    hent();
    const iv = setInterval(hent, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [token, api]);

  /* Åpen: last meldinger + brukere, merk lest (svaret gir «Nytt siden sist»-punktet),
     poll oppdateringer hvert 8. sek — hovedstrøm m/ trådtellere + evt. åpen tråd */
  useEffect(() => {
    if (!aapen || !token) return undefined;
    let alive = true;
    setLaster(true);
    (async () => {
      try {
        const [j, ur] = await Promise.all([
          api('meldinger'),
          fetch(`/api/admin/users?key=${encodeURIComponent(token)}`).then((r) => r.json()).catch(() => ({})),
          lastTraader(), // lastes FØR merk-lest slik at ulest-badges per tråd fanges
        ]);
        if (!alive) return;
        setMeldinger(j.meldinger || []);
        const alleU = ur.members || ur.users || ur.personer || (Array.isArray(ur) ? ur : []);
        setBrukere(alleU.filter((u) => ['owner', 'admin', 'bruker', 'partner'].includes(u.role)));
        setUlest(0);
        // Merk lest — API-et returnerer FORRIGE lesetidspunkt, som blir
        // «Nytt siden sist»-linjen. Vises kun hvis andre faktisk har skrevet noe nytt.
        const lest = await api('lest', { method: 'PUT', body: {} }).catch(() => ({}));
        if (!alive) return;
        const harNytt = lest.forrigeLestAt
          && (j.meldinger || []).some((m) => m.createdAt > lest.forrigeLestAt && m.userId !== user?.id);
        if (harNytt) {
          setNyttSidenSist(lest.forrigeLestAt);
          // Scroll slik at markøren er synlig — du fortsetter der du slapp
          setTimeout(() => {
            const el = listeRef.current?.querySelector('[data-nytt-siden-sist]');
            if (el) el.scrollIntoView({ block: 'center' });
            else scrollNed();
          }, 90);
        } else {
          scrollNed();
        }
      } catch (e) { if (alive) setFeil(e.message); }
      if (alive) setLaster(false);
    })();
    const iv = setInterval(async () => {
      try {
        // Hovedstrømmen: full refetch gir ferske trådtellere («3 svar») i tillegg til nye meldinger
        const j = await api('meldinger');
        if (!alive || !j.meldinger) return;
        setMeldinger((prev) => {
          const sig = (l) => l.map((m) => `${m.id}:${m.traad?.antall || 0}`).join('|');
          if (sig(prev) === sig(j.meldinger)) return prev;
          const nyttNederst = j.meldinger.length && j.meldinger[j.meldinger.length - 1].id !== prev[prev.length - 1]?.id;
          if (nyttNederst) { scrollNed(); api('lest', { method: 'PUT', body: {} }).catch(() => {}); }
          return j.meldinger;
        });
        // Åpen tråd: hent evt. nye svar
        const t = traadRef.current;
        if (t && !t.laster) {
          const jt = await api(`meldinger?traad=${encodeURIComponent(t.id)}`);
          if (!alive || !jt.meldinger) return;
          setTraadMeldinger((prev) => {
            const svar = jt.meldinger.filter((m) => m.id !== t.id);
            if (svar.length === prev.length && svar[svar.length - 1]?.id === prev[prev.length - 1]?.id) return prev;
            scrollTraadNed();
            return svar;
          });
        }
        // Trådoversikten holdes fersk (badge på fanen + listen)
        await lastTraader();
      } catch (e) {}
    }, 8000);
    return () => {
      alive = false; clearInterval(iv);
      // Nullstill ved lukking — neste åpning beregner markør og tråd på nytt
      setTraad(null); setTraadMeldinger([]); setNyttSidenSist(null);
      setFane('chat'); setVisSakVelger(false); setRedigererNavn(false);
    };
  }, [aapen, token, api, scrollNed, scrollTraadNed, lastTraader, user?.id]);

  /* Inn-animasjon + autofokus */
  useEffect(() => {
    if (aapen) {
      const t = setTimeout(() => { setVis(true); inputRef.current?.focus(); }, 20);
      return () => clearTimeout(t);
    }
    setVis(false);
    return undefined;
  }, [aapen]);

  /* Åpne en tråd — fra svar-knapp, trådchip, oversikten eller dyplenke (?traad=<id>) */
  const aapneTraad = useCallback(async (rotEllerId) => {
    const rotId = typeof rotEllerId === 'string' ? rotEllerId : (rotEllerId.threadId || rotEllerId.id);
    lesteTraaderRef.current.add(rotId);
    setTraader((prev) => prev.map((t) => (t.id === rotId ? { ...t, uleste: 0 } : t)));
    setRedigererNavn(false); setVisSakVelger(false); setSakSok('');
    setTraad(typeof rotEllerId === 'object' && rotEllerId.text ? rotEllerId : { id: rotId, laster: true });
    setTraadMeldinger([]);
    setTraadLaster(true);
    setFeil('');
    try {
      const jt = await api(`meldinger?traad=${encodeURIComponent(rotId)}`);
      const alle = jt.meldinger || [];
      const rot = alle.find((m) => !m.threadId) || alle[0];
      if (!rot) throw new Error('Tråden finnes ikke lenger');
      setTraad(rot);
      setTraadMeldinger(alle.filter((m) => m.id !== rot.id));
      requestAnimationFrame(() => inputRef.current?.focus());
      scrollTraadNed();
    } catch (e) { setFeil(e.message); setTraad(null); }
    setTraadLaster(false);
  }, [api, scrollTraadNed]);

  const lukkTraad = useCallback(() => {
    setTraad(null); setTraadMeldinger([]); setFeil('');
    setRedigererNavn(false); setVisSakVelger(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  /* Trådnavn: lagres på rotmeldingen — synkes til hovedstrøm og oversikt */
  const lagreTraadNavn = async () => {
    const rot = traadRef.current;
    if (!rot) return;
    const navn = navnUtkast.trim().slice(0, 80);
    setRedigererNavn(false);
    if (navn === (rot.traadNavn || '')) return;
    try {
      await api('traad', { method: 'PUT', body: { id: rot.id, navn } });
      const nyNavn = navn || null;
      setTraad((t) => (t && t.id === rot.id ? { ...t, traadNavn: nyNavn } : t));
      setMeldinger((prev) => prev.map((m) => (m.id === rot.id ? { ...m, traadNavn: nyNavn } : m)));
      setTraader((prev) => prev.map((t) => (t.id === rot.id ? { ...t, navn: nyNavn } : t)));
    } catch (e) { setFeil(e.message); }
  };

  /* Sak-kobling: hent saksliste (én gang), koble/koble fra */
  const hentSaker = async () => {
    if (sakListe !== null) return;
    try {
      const r = await fetch(`/api/admin/tasks?key=${encodeURIComponent(token)}`);
      const j = await r.json().catch(() => ({}));
      setSakListe(Array.isArray(j.tasks) ? j.tasks : []);
    } catch (e) { setSakListe([]); }
  };

  const kobleSak = async (sakId) => {
    const rot = traadRef.current;
    if (!rot || sakJobber) return;
    setSakJobber(true); setFeil('');
    try {
      const j = await api('traad', { method: 'PUT', body: { id: rot.id, sakId: sakId || null } });
      const sak = sakId ? (j.sak || null) : null;
      setTraad((t) => (t && t.id === rot.id ? { ...t, sakId: sak?.id || null, sak } : t));
      setMeldinger((prev) => prev.map((m) => (m.id === rot.id ? { ...m, sakId: sak?.id || null } : m)));
      setTraader((prev) => prev.map((t) => (t.id === rot.id ? { ...t, sak } : t)));
      setVisSakVelger(false); setSakSok('');
    } catch (e) { setFeil(e.message); }
    setSakJobber(false);
  };

  /* Opprett en ny sak direkte fra tråden — trådinnholdet blir beskrivelsen,
     og saken kobles automatisk tilbake til tråden */
  const opprettSakFraTraad = async () => {
    const rot = traadRef.current;
    if (!rot || sakJobber) return;
    setSakJobber(true); setFeil('');
    try {
      const dato = (iso) => { try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
      const linjer = [
        `Opprettet fra teamchat-tråd${rot.traadNavn ? ` «${rot.traadNavn}»` : ''}.`,
        '',
        `**${rot.userName}** (${dato(rot.createdAt)}): ${rot.text}`,
      ];
      if (traadMeldinger.length) {
        linjer.push('', 'Svar i tråden:');
        for (const m of traadMeldinger.slice(0, 30)) linjer.push(`- **${m.userName}** (${dato(m.createdAt)}): ${m.text}`);
      }
      const r = await fetch(`/api/admin/tasks?key=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: (rot.traadNavn || rot.text || 'Sak fra teamchat').slice(0, 120),
          description: linjer.join('\n').slice(0, 7900),
          notify: false,
          actor: user?.name || 'Admin',
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.task?.id) throw new Error(j.error || 'Kunne ikke opprette saken');
      await kobleSak(j.task.id);
    } catch (e) { setFeil(e.message); }
    setSakJobber(false);
  };

  /* Dyplenke ?traad=<id>: åpne tråden så snart chatten er åpen og token klar */
  useEffect(() => {
    if (!aapen || !token || !pendingTraad) return;
    const id = pendingTraad;
    setPendingTraad(null);
    aapneTraad(id);
  }, [aapen, token, pendingTraad, aapneTraad]);

  /* @-tagging: finn aktiv «@query» rett før markøren */
  const oppdaterTekst = (e) => {
    const v = e.target.value;
    setTekst(v);
    const pos = e.target.selectionStart ?? v.length;
    const foer = v.slice(0, pos);
    const m = foer.match(/(^|\s)@([\wæøåÆØÅ.-]{0,30})$/);
    setMention(m ? { query: m[2].toLowerCase(), start: pos - m[2].length - 1 } : null);
  };

  const mentionTreff = useMemo(() => {
    if (!mention) return [];
    return brukere
      .filter((u) => u.name && u.name.toLowerCase().includes(mention.query))
      .slice(0, 6);
  }, [mention, brukere]);

  const velgMention = (u) => {
    const pos = inputRef.current?.selectionStart ?? tekst.length;
    const nyTekst = `${tekst.slice(0, mention.start)}@${u.name} ${tekst.slice(pos)}`;
    setTekst(nyTekst);
    setValgte((v) => ({ ...v, [u.name]: u.id }));
    setMention(null);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const nyPos = mention.start + u.name.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nyPos, nyPos);
      }
    });
  };

  const send = async () => {
    const t = tekst.trim();
    if (!t || sender) return;
    setSender(true); setFeil('');
    try {
      const mentions = Object.entries(valgte)
        .filter(([navn]) => t.includes(`@${navn}`))
        .map(([, id]) => ({ id }));
      const iTraad = traadRef.current;
      const j = await api('meldinger', { method: 'POST', body: { text: t, mentions, threadId: iTraad ? iTraad.id : null } });
      if (iTraad) {
        setTraadMeldinger((prev) => [...prev, j.melding]);
        // Oppdater trådtelleren på rotmeldingen i hovedstrømmen umiddelbart
        setMeldinger((prev) => prev.map((m) => (m.id === iTraad.id
          ? { ...m, traad: { antall: (m.traad?.antall || 0) + 1, sisteAt: j.melding.createdAt, navn: [...new Set([...(m.traad?.navn || []), j.melding.userName])].slice(0, 4) } }
          : m)));
        scrollTraadNed();
      } else {
        setMeldinger((prev) => [...prev, j.melding]);
        scrollNed();
      }
      setTekst(''); setValgte({}); setMention(null);
    } catch (e) { setFeil(e.message); }
    setSender(false);
  };

  const slett = async (id, fraTraad = false) => {
    try {
      await api(`meldinger?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const rot = traadRef.current;
      if (rot && id === rot.id) {
        // Rotmeldingen: API-et sletter hele tråden — lukk visningen
        setMeldinger((prev) => prev.filter((x) => x.id !== id));
        lukkTraad();
      } else if (fraTraad) {
        setTraadMeldinger((prev) => prev.filter((x) => x.id !== id));
        if (rot) {
          setMeldinger((prev) => prev.map((m) => (m.id === rot.id && m.traad
            ? { ...m, traad: m.traad.antall > 1 ? { ...m.traad, antall: m.traad.antall - 1 } : undefined }
            : m)));
        }
      } else {
        setMeldinger((prev) => prev.filter((x) => x.id !== id));
      }
    } catch (e) { setFeil(e.message); }
  };

  const paaTast = (e) => {
    if (mention && mentionTreff.length && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault(); velgMention(mentionTreff[0]); return;
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') setMention(null);
  };

  /* Badge-visning av @-tagger direkte i skrivefeltet: et speil-lag bak
     textareaen rendrer samme tekst med pillebakgrunn på valgte tagger.
     Selve textarea-teksten er transparent (caret/markering beholdes), og
     identisk font/metrikk gjør at alt ligger perfekt på linje. Pillen lages
     med box-shadow (påvirker ikke layout) — derfor forskyves ingen tegn. */
  const inputDeler = useMemo(() => {
    const navn = Object.keys(valgte).filter((n) => tekst.includes(`@${n}`)).sort((a, b) => b.length - a.length);
    if (!navn.length) return [{ t: tekst }];
    const re = new RegExp(`(@(?:${navn.map(escRe).join('|')}))`, 'g');
    return tekst.split(re).map((del) => (del.startsWith('@') && navn.includes(del.slice(1)) ? { t: del, tag: true } : { t: del }));
  }, [tekst, valgte]);

  const erAdminRolle = ['owner', 'admin'].includes(user?.role);
  const minId = user?.id;

  /* Hovedstrømmen gruppert — med «Nytt siden sist»-linjen satt inn foran første
     melding fra andre etter forrige lesetidspunkt */
  const grupper = useMemo(() => {
    const ut = grupperMeldinger(meldinger);
    if (nyttSidenSist) {
      const foerste = meldinger.find((m) => m.createdAt > nyttSidenSist && m.userId !== minId);
      if (foerste) {
        const idx = ut.findIndex((r) => r.id === foerste.id);
        if (idx >= 0) {
          ut[idx] = { ...ut[idx], fortsettelse: false }; // full header etter markøren
          ut.splice(idx, 0, { nyttSidenSist: true, id: 'nytt-siden-sist' });
        }
      }
    }
    return ut;
  }, [meldinger, nyttSidenSist, minId]);

  /* Svarene i åpen tråd gruppert (samme dag-/fortsettelseslogikk) */
  const traadGrupper = useMemo(() => grupperMeldinger(traadMeldinger), [traadMeldinger]);

  /* Antall tråder med uleste svar (badge på Tråder-fanen) */
  const traaderUlest = useMemo(() => traader.filter((t) => (t.uleste || 0) > 0).length, [traader]);

  /* Søk i trådoversikten: navn, rottekst, deltakere og sakstittel */
  const filtrerteTraader = useMemo(() => {
    const q = traadSok.trim().toLowerCase();
    if (!q) return traader;
    return traader.filter((t) => (t.navn || '').toLowerCase().includes(q)
      || (t.tekst || '').toLowerCase().includes(q)
      || (t.userName || '').toLowerCase().includes(q)
      || (t.deltakere || []).some((n) => String(n).toLowerCase().includes(q))
      || (t.sak?.title || '').toLowerCase().includes(q));
  }, [traader, traadSok]);

  /* Saksvelgeren: filtrert på søk, nyeste først (maks 8 treff) */
  const filtrerteSaker = useMemo(() => {
    if (!Array.isArray(sakListe)) return [];
    const q = sakSok.trim().toLowerCase();
    const liste = q ? sakListe.filter((s) => (s.title || '').toLowerCase().includes(q)) : sakListe;
    return liste.slice(0, 8);
  }, [sakListe, sakSok]);

  /* Én meldingsrad — gjenbrukes i hovedstrømmen og trådvisningen */
  const radJSX = (rad, iTraad = false) => (
    <div key={rad.id} data-testid={iTraad ? 'chat-traad-melding' : 'chat-melding'}
      className={`group relative flex items-start gap-2.5 rounded-[12px] px-2 py-1 transition-colors hover:bg-white/80 ${rad.fortsettelse ? 'mt-0' : 'mt-2'}`}
      style={{ animation: 'dhChatMeldingInn 200ms ease-out both' }}>
      {rad.fortsettelse ? (
        <span className="w-7 shrink-0 pt-[3px] text-right text-[9px] font-medium text-[#c2beb8] opacity-0 transition-opacity group-hover:opacity-100">{klokke(rad.createdAt)}</span>
      ) : (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.14)]" style={{ background: `linear-gradient(135deg, ${avatarFarge(rad.userName)}, ${avatarFarge(rad.userName)}cc)` }}>
          {initialer(rad.userName)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {!rad.fortsettelse && (
          <p className="flex items-baseline gap-2">
            <span className="text-[12.5px] font-bold text-[#1c1917]">{rad.userName}</span>
            <span className="text-[10px] font-medium text-[#c2beb8]">{klokke(rad.createdAt)}</span>
          </p>
        )}
        <MeldingTekst text={rad.text} mentions={rad.mentions} />
        {!iTraad && (rad.traad || rad.traadNavn || rad.sakId) && (
          <button onClick={() => aapneTraad(rad)} data-testid="chat-traad-chip"
            className="mt-1.5 flex max-w-full items-center gap-1.5 rounded-[10px] bg-white py-1 pl-1.5 pr-2 text-left transition-all hover:-translate-y-px active:scale-[0.98]"
            style={{ boxShadow: '0 1px 4px rgba(20,16,40,0.07), inset 0 0 0 1px rgba(109,40,217,0.16)' }}>
            {rad.traad && (
              <span className="flex shrink-0 items-center">
                {(rad.traad.navn || []).slice(0, 3).map((n, i) => (
                  <span key={n} className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[7px] font-bold text-white ring-[1.5px] ring-white" style={{ background: avatarFarge(n), marginLeft: i ? -5 : 0 }}>{initialer(n)}</span>
                ))}
              </span>
            )}
            {rad.traadNavn && <span className="truncate text-[11px] font-bold text-[#1c1917]">{rad.traadNavn}</span>}
            {rad.sakId && <ClipboardList className="h-3 w-3 shrink-0 text-[#0a7d55]" title="Koblet til sak" />}
            <span className="shrink-0 text-[11px] font-bold text-[#6d28d9]">{rad.traad ? `${rad.traad.antall} svar` : 'Åpne tråd'}</span>
            {rad.traad && <span className="shrink-0 text-[10px] font-medium text-[#b3ada3]">siste {klokke(rad.traad.sisteAt)}</span>}
          </button>
        )}
      </div>
      <div className="absolute -top-1.5 right-2 flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
        {!iTraad && (
          <button onClick={() => aapneTraad(rad)} title="Svar i tråd" data-testid={`chat-svar-${rad.id}`}
            className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-white text-[#a6a19a] shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:text-[#6d28d9] active:scale-90">
            <Reply className="h-3 w-3" />
          </button>
        )}
        {(rad.userId === minId || erAdminRolle) && (
          <button onClick={() => slett(rad.id, iTraad)} title="Slett meldingen"
            className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-white text-[#c2beb8] shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:text-[#c2413b] active:scale-90">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes dhChatMeldingInn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dhChatBadgePop { 0% { transform: scale(0.4); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }
        @keyframes dhChatPuls { 0%, 100% { box-shadow: 0 0 0 0 rgba(109,40,217,0.35); } 55% { box-shadow: 0 0 0 9px rgba(109,40,217,0); } }
      `}</style>

      {/* Panel */}
      {aapen && (
        <div
          data-testid="chat-panel"
          className="fixed bottom-[92px] right-4 z-[70] flex flex-col overflow-hidden rounded-[24px] sm:right-5"
          style={{
            width: 'min(408px, calc(100vw - 24px))',
            height: 'min(620px, calc(100vh - 120px))',
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            boxShadow: '0 32px 90px rgba(20,16,40,0.28), 0 2px 8px rgba(20,16,40,0.08), inset 0 0 0 1px rgba(255,255,255,0.7), 0 0 0 1px rgba(0,0,0,0.05)',
            opacity: vis ? 1 : 0,
            transform: vis ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.94)',
            transformOrigin: 'bottom right',
            transition: 'opacity 180ms ease-out, transform 260ms cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        >
          {/* Topp — gradient-aksent + avatarstabel */}
          <div className="relative border-b border-black/[0.05] px-4 pb-3 pt-3.5">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[#6d28d9] via-[#9d6bff] to-transparent" />
            <div className="flex items-center justify-between gap-2">
              {traad ? (
                <div className="flex min-w-0 items-center gap-2">
                  <button onClick={lukkTraad} data-testid="chat-traad-tilbake" title="Tilbake til chatten"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[#57534e] transition-all hover:bg-black/[0.05] hover:text-[#1c1917] active:scale-90">
                    <ArrowLeft className="h-[17px] w-[17px]" />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-bold leading-tight text-[#1c1917]" style={heading}>{traad.traadNavn || 'Tråd'}</p>
                    <p className="truncate text-[11px] leading-tight text-[#a6a19a]">Startet av <span className="font-semibold text-[#8b6bc7]">{traad.userName || '…'}</span> — holdes utenfor hovedstrømmen</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-[12px]"
                    style={{ background: 'linear-gradient(135deg, #1c1917 20%, #3b2373 130%)', boxShadow: '0 6px 16px rgba(59,35,115,0.35)' }}>
                    <MessageCircle className="h-[17px] w-[17px] text-white" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-white" title="Tilkoblet" />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-bold leading-tight text-[#1c1917]" style={heading}>Teamchat</p>
                    <p className="text-[11px] leading-tight text-[#a6a19a]">Intern · <span className="font-semibold text-[#8b6bc7]">@tag</span> gir e-postvarsel</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {!traad && brukere.length > 0 && (
                  <span className="mr-1 hidden items-center sm:flex" title={brukere.map((u) => u.name).join(', ')}>
                    {brukere.slice(0, 4).map((u, i) => (
                      <span key={u.id} className="flex h-6 w-6 items-center justify-center rounded-full text-[8.5px] font-bold text-white ring-2 ring-white" style={{ background: avatarFarge(u.name), marginLeft: i ? -7 : 0 }}>
                        {initialer(u.name)}
                      </span>
                    ))}
                    {brukere.length > 4 && <span className="ml-1 text-[10.5px] font-semibold text-[#a6a19a]">+{brukere.length - 4}</span>}
                  </span>
                )}
                <button onClick={() => setAapen(false)} data-testid="chat-lukk" className="rounded-[9px] p-1.5 text-[#a6a19a] transition-all hover:bg-black/[0.05] hover:text-[#1c1917] active:scale-90" title="Lukk">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Faner: Chat | Tråder — skjules inne i en åpen tråd */}
          {!traad && (
            <div className="flex items-center gap-1 border-b border-black/[0.05] px-3 py-2">
              <button onClick={() => setFane('chat')} data-testid="chat-fane-chat"
                className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${fane === 'chat' ? 'text-white' : 'text-[#a6a19a] hover:bg-black/[0.04] hover:text-[#57534e]'}`}
                style={fane === 'chat' ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.25)' } : {}}>
                Chat
              </button>
              <button onClick={() => { setFane('traader'); lastTraader(); }} data-testid="chat-fane-traader"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${fane === 'traader' ? 'text-white' : 'text-[#a6a19a] hover:bg-black/[0.04] hover:text-[#57534e]'}`}
                style={fane === 'traader' ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.25)' } : {}}>
                <MessagesSquare className="h-3 w-3" />
                Tråder
                {traader.length > 0 && <span className={`text-[10px] font-semibold ${fane === 'traader' ? 'text-white/70' : 'text-[#c2beb8]'}`}>{traader.length}</span>}
                {traaderUlest > 0 && (
                  <span data-testid="chat-traader-ulest" className="flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[8.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{traaderUlest}</span>
                )}
              </button>
            </div>
          )}

          {/* Meldinger — hovedstrøm eller åpen tråd */}
          {traad ? (
            <div ref={traadListeRef} className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-traad-panel">
              {/* Meta: trådnavn + sak-kobling */}
              {traad.text && (
                <div className="mb-2 flex items-center gap-1.5">
                  {redigererNavn ? (
                    <input
                      autoFocus
                      value={navnUtkast}
                      onChange={(e) => setNavnUtkast(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') lagreTraadNavn(); if (e.key === 'Escape') setRedigererNavn(false); }}
                      onBlur={lagreTraadNavn}
                      placeholder="Gi tråden et navn…"
                      maxLength={80}
                      data-testid="chat-traad-navn-input"
                      className="min-w-0 flex-1 rounded-[10px] bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-[#1c1917] outline-none placeholder:text-[#b3ada3]"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(109,40,217,0.4), 0 4px 14px rgba(109,40,217,0.1)' }}
                    />
                  ) : (
                    <button onClick={() => { setNavnUtkast(traad.traadNavn || ''); setRedigererNavn(true); }} data-testid="chat-traad-navn"
                      title={traad.traadNavn ? 'Endre trådnavnet' : 'Gi tråden et navn'}
                      className="flex min-w-0 items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-white/80">
                      <Pencil className="h-3 w-3 shrink-0 text-[#b3ada3]" />
                      <span className={`truncate text-[12.5px] ${traad.traadNavn ? 'font-bold text-[#1c1917]' : 'font-medium text-[#b3ada3]'}`}>{traad.traadNavn || 'Gi tråden et navn…'}</span>
                    </button>
                  )}
                  <span className="min-w-[8px] flex-1" />
                  {traad.sak ? (
                    <span className="flex max-w-[190px] shrink-0 items-center gap-1 rounded-[10px] bg-white py-1 pl-2 pr-1" style={{ boxShadow: 'inset 0 0 0 1px rgba(10,125,85,0.25), 0 1px 4px rgba(20,16,40,0.06)' }} data-testid="chat-traad-sak-chip">
                      <ClipboardList className="h-3 w-3 shrink-0 text-[#0a7d55]" />
                      <a href={`/admin/saker/${encodeURIComponent(traad.sak.id)}`} className="truncate text-[11px] font-bold text-[#0a7d55] hover:underline" title={`Åpne saken: ${traad.sak.title}`}>{traad.sak.title}</a>
                      <button onClick={() => kobleSak(null)} title="Koble fra saken" className="rounded-[6px] p-0.5 text-[#a6a19a] transition-colors hover:bg-black/[0.05] hover:text-[#c2413b]">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => { setVisSakVelger((v) => !v); hentSaker(); }} data-testid="chat-traad-koble-sak"
                      className="flex shrink-0 items-center gap-1 rounded-[10px] bg-white px-2 py-1.5 text-[11px] font-bold text-[#57534e] transition-all hover:text-[#0a7d55] active:scale-[0.97]"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 1px 4px rgba(20,16,40,0.05)' }}>
                      <Link2 className="h-3 w-3" />
                      Koble til sak
                    </button>
                  )}
                </div>
              )}
              {visSakVelger && !traad.sak && (
                <div className="mb-2 rounded-[14px] bg-white p-2" style={{ boxShadow: '0 8px 28px rgba(20,16,40,0.12), inset 0 0 0 1px rgba(0,0,0,0.05)' }} data-testid="chat-sak-velger">
                  <div className="flex items-center gap-1.5 rounded-[9px] bg-[#faf9f7] px-2 py-1.5" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
                    <Search className="h-3 w-3 shrink-0 text-[#b3ada3]" />
                    <input autoFocus value={sakSok} onChange={(e) => setSakSok(e.target.value)} placeholder="Søk i saker…"
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-[#1c1917] outline-none placeholder:text-[#b3ada3]" data-testid="chat-sak-sok" />
                  </div>
                  <div className="mt-1 max-h-[150px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {sakListe === null && <p className="px-2 py-2 text-[11px] text-[#a6a19a]">Henter saker…</p>}
                    {Array.isArray(sakListe) && filtrerteSaker.length === 0 && <p className="px-2 py-2 text-[11px] text-[#a6a19a]">Ingen saker matcher søket.</p>}
                    {filtrerteSaker.map((s) => (
                      <button key={s.id} onClick={() => kobleSak(s.id)} disabled={sakJobber} data-testid={`chat-sak-valg-${s.id}`}
                        className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-[#f5f2fc] disabled:opacity-50">
                        <ClipboardList className="h-3 w-3 shrink-0 text-[#a6a19a]" />
                        <span className="truncate text-[12px] font-semibold text-[#1c1917]">{s.title}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={opprettSakFraTraad} disabled={sakJobber} data-testid="chat-opprett-sak-fra-traad"
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-[9px] py-1.5 text-[11.5px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #0a7d55, #0a6b49)', boxShadow: '0 3px 10px rgba(10,125,85,0.25)' }}>
                    {sakJobber ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Opprett ny sak fra tråden
                  </button>
                </div>
              )}
              {/* Rotmeldingen — festet øverst med lilla aksent */}
              {traad.text && (
                <div className="rounded-[14px] bg-white px-1 pb-1.5 pt-0.5" style={{ boxShadow: '0 1px 5px rgba(20,16,40,0.06), inset 0 0 0 1px rgba(109,40,217,0.14)', animation: 'dhChatMeldingInn 200ms ease-out both' }}>
                  {radJSX({ ...traad, fortsettelse: false }, true)}
                </div>
              )}
              <div className="my-3 flex items-center gap-2 px-1">
                <CornerDownRight className="h-3 w-3 text-[#b3ada3]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#a6a19a]">{traadMeldinger.length === 1 ? '1 svar' : `${traadMeldinger.length} svar`}</span>
                <span className="h-px flex-1 bg-black/[0.06]" />
              </div>
              {traadLaster && (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#c2beb8]" /></div>
              )}
              {!traadLaster && traadMeldinger.length === 0 && (
                <p className="px-4 py-6 text-center text-[12px] leading-relaxed text-[#a6a19a]">Ingen svar ennå — start tråden under. Diskusjonen holdes samlet her, utenfor hovedstrømmen.</p>
              )}
              {traadGrupper.map((rad) => (rad.separator ? (
                <div key={rad.id} className="my-3.5 flex items-center justify-center">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a6a19a] shadow-[0_1px_4px_rgba(0,0,0,0.06),inset_0_0_0_1px_rgba(0,0,0,0.04)]">{rad.separator}</span>
                </div>
              ) : radJSX(rad, true)))}
            </div>
          ) : fane === 'traader' ? (
            <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-traader-liste">
              {traader.length > 3 && (
                <div className="mb-2.5 flex items-center gap-1.5 rounded-[11px] bg-white px-2.5 py-2" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 1px 4px rgba(20,16,40,0.04)' }}>
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#b3ada3]" />
                  <input value={traadSok} onChange={(e) => setTraadSok(e.target.value)} placeholder="Søk i tråder, navn eller saker…"
                    className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#1c1917] outline-none placeholder:text-[#b3ada3]" data-testid="chat-traad-sok" />
                  {traadSok && <button onClick={() => setTraadSok('')} className="text-[#b3ada3] hover:text-[#57534e]"><X className="h-3.5 w-3.5" /></button>}
                </div>
              )}
              {traader.length === 0 && (
                <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px]" style={{ background: 'linear-gradient(135deg, #f0ebfa, #e5d9fb)' }}>
                    <MessagesSquare className="h-5 w-5 text-[#6d28d9]" />
                  </span>
                  <p className="text-[14px] font-bold text-[#1c1917]" style={heading}>Ingen tråder ennå</p>
                  <p className="max-w-[260px] text-[12px] leading-relaxed text-[#a6a19a]">Hold musen over en melding i chatten og trykk svar-pilen — så starter du en tråd som holder diskusjonen samlet.</p>
                </div>
              )}
              {traader.length > 0 && filtrerteTraader.length === 0 && (
                <p className="py-10 text-center text-[12px] text-[#a6a19a]">Ingen tråder matcher søket.</p>
              )}
              {filtrerteTraader.map((t) => (
                <button key={t.id} onClick={() => aapneTraad(t.id)} data-testid={`chat-traad-rad-${t.id}`}
                  className="mb-2 w-full rounded-[14px] bg-white/90 p-2.5 text-left transition-all hover:-translate-y-px hover:bg-white active:scale-[0.99]"
                  style={{ boxShadow: (t.uleste || 0) > 0 ? '0 2px 10px rgba(109,40,217,0.12), inset 0 0 0 1px rgba(109,40,217,0.25)' : '0 1px 5px rgba(20,16,40,0.06), inset 0 0 0 1px rgba(0,0,0,0.04)', animation: 'dhChatMeldingInn 200ms ease-out both' }}>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.14)]" style={{ background: `linear-gradient(135deg, ${avatarFarge(t.userName)}, ${avatarFarge(t.userName)}cc)` }}>
                      {initialer(t.userName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="truncate text-[13px] font-bold text-[#1c1917]">{t.navn || t.tekst}</span>
                        {(t.uleste || 0) > 0 && (
                          <span className="flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{t.uleste}</span>
                        )}
                      </p>
                      {t.navn && <p className="truncate text-[11px] text-[#a6a19a]">{t.tekst}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        {(t.deltakere || []).length > 0 && (
                          <span className="flex items-center">
                            {t.deltakere.slice(0, 3).map((n, i) => (
                              <span key={n} className="flex h-[16px] w-[16px] items-center justify-center rounded-full text-[6.5px] font-bold text-white ring-[1.5px] ring-white" style={{ background: avatarFarge(n), marginLeft: i ? -4 : 0 }}>{initialer(n)}</span>
                            ))}
                          </span>
                        )}
                        <span className="text-[10.5px] font-bold text-[#6d28d9]">{t.antallSvar === 1 ? '1 svar' : `${t.antallSvar} svar`}</span>
                        <span className="text-[10px] font-medium text-[#b3ada3]">{dagLabel(t.sisteAt)} {klokke(t.sisteAt)}</span>
                        {t.sak && (
                          <span className="flex min-w-0 items-center gap-1 rounded-[7px] bg-[#eef7f2] px-1.5 py-[2px]" title={`Koblet til sak: ${t.sak.title}`}>
                            <ClipboardList className="h-2.5 w-2.5 shrink-0 text-[#0a7d55]" />
                            <span className="truncate text-[9.5px] font-bold text-[#0a7d55]">{t.sak.title}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div ref={listeRef} className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', background: 'linear-gradient(180deg, rgba(250,249,247,0.6), rgba(255,255,255,0.35))' }} data-testid="chat-meldinger">
              {laster && (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#c2beb8]" /></div>
              )}
              {!laster && meldinger.length === 0 && (
                <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[16px]" style={{ background: 'linear-gradient(135deg, #f0ebfa, #e5d9fb)' }}>
                    <AtSign className="h-5 w-5 text-[#6d28d9]" />
                  </span>
                  <p className="text-[14px] font-bold text-[#1c1917]" style={heading}>Si hei til teamet</p>
                  <p className="max-w-[260px] text-[12px] leading-relaxed text-[#a6a19a]">Skriv den første meldingen. Tag noen med @ — da får de varsel på e-post.</p>
                </div>
              )}
              {grupper.map((rad) => (rad.separator ? (
                <div key={rad.id} className="my-3.5 flex items-center justify-center first:mt-1">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a6a19a] shadow-[0_1px_4px_rgba(0,0,0,0.06),inset_0_0_0_1px_rgba(0,0,0,0.04)]">{rad.separator}</span>
                </div>
              ) : rad.nyttSidenSist ? (
                <div key={rad.id} data-nytt-siden-sist data-testid="chat-nytt-siden-sist" className="my-3 flex items-center gap-2 px-1">
                  <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #a78bfa)' }} />
                  <span className="rounded-full px-2.5 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.09em] text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 8px rgba(109,40,217,0.35)' }}>Nytt siden sist</span>
                  <span className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, #a78bfa)' }} />
                </div>
              ) : radJSX(rad, false)))}
            </div>
          )}

          {/* Komponist — skjules i trådoversikten (der velger man en tråd først) */}
          {(traad || fane === 'chat') ? (
          <div className="relative px-3 pb-3 pt-2">
            {feil && <p className="mb-1.5 px-1 text-[11.5px] text-[#b3261e]" data-testid="chat-feil">{feil}</p>}
            {mention && mentionTreff.length > 0 && (
              <div className="absolute bottom-full left-3 z-10 mb-1.5 w-[268px] overflow-hidden rounded-[14px] py-1"
                style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', boxShadow: '0 16px 48px rgba(20,16,40,0.2), inset 0 0 0 1px rgba(0,0,0,0.05)' }}
                data-testid="chat-mention-dropdown">
                <p className="px-3 pb-0.5 pt-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#c2beb8]">Tag en kollega · ↵ velger</p>
                {mentionTreff.map((u, i) => (
                  <button key={u.id} onClick={() => velgMention(u)} data-testid={`chat-mention-${u.id}`}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-[#f5f2fc] ${i === 0 ? 'bg-[#f8f6fd]' : ''}`}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: avatarFarge(u.name) }}>{initialer(u.name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[#1c1917]">{u.name}</span>
                      {u.tittel && <span className="block truncate text-[10.5px] text-[#a6a19a]">{u.tittel}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-[18px] bg-white p-1.5 transition-shadow"
              style={{ boxShadow: fokus ? 'inset 0 0 0 1px rgba(109,40,217,0.45), 0 6px 24px rgba(109,40,217,0.12)' : 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 2px 8px rgba(20,16,40,0.05)' }}>
              <div className="relative min-w-0 flex-1">
                {/* Speil-laget med badges — nøyaktig samme typografi som textareaen */}
                <div ref={overlayRef} aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-2.5 py-2 text-[13.5px] leading-snug text-[#1c1917]">
                  {inputDeler.map((d, i) => (d.tag
                    ? <span key={i} className="rounded-[5px] text-[#6d28d9]" style={{ background: '#ece4fb', boxShadow: '0 0 0 2.5px #ece4fb', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{d.t}</span>
                    : <React.Fragment key={i}>{d.t}</React.Fragment>))}
                  {'\u200b'}
                </div>
                <textarea
                  ref={inputRef}
                  value={tekst}
                  onChange={oppdaterTekst}
                  onKeyDown={paaTast}
                  onClick={oppdaterTekst}
                  onFocus={() => setFokus(true)}
                  onBlur={() => setFokus(false)}
                  onScroll={(e) => { if (overlayRef.current) overlayRef.current.scrollTop = e.target.scrollTop; }}
                  placeholder={traad ? 'Svar i tråden… @ for å tagge' : 'Skriv en melding… @ for å tagge'}
                  rows={Math.min(4, Math.max(1, tekst.split('\n').length))}
                  data-testid="chat-input"
                  className="relative block max-h-[110px] w-full resize-none bg-transparent px-2.5 py-2 text-[13.5px] leading-snug text-transparent caret-[#1c1917] outline-none focus:outline-none placeholder:text-[#b3ada3]"
                />
              </div>
              <button onClick={send} disabled={sender || !tekst.trim()} data-testid="chat-send" title="Send (Enter)"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] text-white transition-all hover:brightness-110 active:scale-90 disabled:opacity-25"
                style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 4px 12px rgba(59,35,115,0.3)' }}>
                {sender ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 px-2 text-[10px] text-[#c2beb8]">{traad ? '↵ send · svaret havner kun i denne tråden' : '↵ send · ⇧↵ ny linje · @-taggede varsles på e-post'}</p>
          </div>
          ) : (
            <p className="border-t border-black/[0.05] px-4 py-2.5 text-center text-[10.5px] text-[#b3ada3]">Velg en tråd for å svare — eller start en ny fra en melding i chatten</p>
          )}
        </div>
      )}

      {/* Boblen */}
      <button
        onClick={() => setAapen((o) => !o)}
        data-testid="chat-boble"
        title={aapen ? 'Lukk teamchat' : 'Åpne teamchat'}
        className="fixed bottom-4 right-4 z-[70] flex h-[56px] w-[56px] items-center justify-center rounded-full text-white transition-all hover:scale-[1.07] active:scale-95 sm:bottom-5 sm:right-5"
        style={{
          background: 'linear-gradient(135deg, #1c1917 25%, #3b2373 130%)',
          boxShadow: '0 12px 36px rgba(20,16,40,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
          animation: !aapen && ulest > 0 ? 'dhChatPuls 2.2s ease-in-out infinite' : 'none',
        }}
      >
        <span className="transition-transform duration-200" style={{ transform: aapen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          {aapen ? <X className="h-[22px] w-[22px]" /> : <MessageCircle className="h-[22px] w-[22px]" />}
        </span>
        {!aapen && ulest > 0 && (
          <span data-testid="chat-badge"
            className="absolute -right-0.5 -top-0.5 flex h-[21px] min-w-[21px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold text-white ring-2 ring-[#faf9f7]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', animation: 'dhChatBadgePop 260ms cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {ulest > 99 ? '99+' : ulest}
          </span>
        )}
      </button>
    </>
  );
}
