'use client';
/* ---------------------------------------------------------------------------
   Forslag – det private forslaget til Martin og Øyvind som én lang, rolig side.
   Et brev, ikke et deck: papir, blekk, hårlinjer. Ingen scener, ingen autoplay.
   Innholdet bor i ./innhold.js – dette er bare form.
--------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import EierApp from '../../forside/v4/EierApp';
import {
  AVSENDERE, BYGGER, FOOTER, HERO, HILSEN, HVORFOR, INVITASJON, KORT, MALBILDET, SEKSJONER, STED_DATO, STRUKTUR, TILBUD, VEIEN, VERSJON,
} from './innhold';

const sek = (id) => SEKSJONER.find((s) => s.id === id);

/* Seksjonshode: nummer + navn (øyebryn) og tittel. */
function Hode({ id, tittel, em }) {
  const s = sek(id);
  return (
    <div className="fs-sec-head">
      <div className="fs-eyebrow fs-reveal"><span className="n">{s.nr}</span><span>{s.navn}</span></div>
      <h2 id={`${id}-h`} className="fs-h2 fs-reveal mt-4" data-delay="1">{tittel}{em ? <> <em>{em}</em></> : null}</h2>
    </div>
  );
}

function Seksjon({ id, children }) {
  return (
    <section id={id} className="fs-sec" aria-labelledby={`${id}-h`} data-testid={`fs-sec-${id}`}>
      <div className="fs-wide">{children}</div>
    </section>
  );
}

export default function Forslag({ start }) {
  const rootRef = useRef(null);
  const [aktiv, setAktiv] = useState(SEKSJONER[0].id);

  /* Avdekking: hvert .fs-reveal glir inn én gang når det kommer i bildet. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const els = Array.from(root.querySelectorAll('.fs-reveal'));
    if (typeof IntersectionObserver === 'undefined') { els.forEach((e) => e.classList.add('is-in')); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  /* Aktiv seksjon i skinnen. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const secs = SEKSJONER.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setAktiv(en.target.id); });
    }, { rootMargin: '-38% 0px -58% 0px', threshold: 0 });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  /* Fremdrift i topplinjen. */
  useEffect(() => {
    const bar = document.getElementById('fs-progress');
    if (!bar) return undefined;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, h.scrollTop / max) : 0})`;
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  /* /samarbeid/<seksjon> hopper til seksjonen. */
  useEffect(() => {
    if (!start) return undefined;
    const el = document.getElementById(start);
    if (!el) return undefined;
    const t = window.setTimeout(() => el.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, [start]);

  const print = () => { if (typeof window !== 'undefined') window.print(); };

  return (
    <main ref={rootRef} className="fs" data-testid="forslag">
      {/* Topplinje */}
      <header className="fs-top" data-testid="fs-top">
        <div id="fs-progress" className="fs-progress" aria-hidden="true" />
        <div className="fs-wide fs-top-inner">
          <a href="#topp" className="inline-flex items-center gap-3" aria-label="DigiHome – til toppen">
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[15px] w-auto" />
          </a>
          <div className="fs-top-meta">
            <span className="lang">Privat forslag · {VERSJON}</span>
            <span className="kort">Privat forslag</span>
          </div>
        </div>
      </header>

      {/* Sideskinne */}
      <nav className="fs-rail" aria-label="Innhold" data-testid="fs-rail">
        {SEKSJONER.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={aktiv === s.id ? 'is-active' : ''} aria-current={aktiv === s.id ? 'true' : undefined}>
            <span className="n">{s.nr}</span><span>{s.navn}</span>
          </a>
        ))}
      </nav>

      {/* Hero – brevets første side */}
      <section id="topp" className="fs-hero" data-testid="fs-hero">
        <div className="fs-wide">
          <div className="fs-eyebrow">{HERO.eyebrow}</div>
          <p className="fs-til mt-7">{HERO.til}</p>
          <h1 className="fs-h1 mt-5">{HERO.tittel} <em>{HERO.tittelEm}</em></h1>
          <p className="fs-lead mt-8 max-w-[640px]">{HERO.lead}</p>
          <div className="mt-10 flex items-center gap-4">
            <div className="fs-avatars" aria-hidden="true">
              {AVSENDERE.map((a) => <img key={a.navn} src={a.img} alt="" className="fs-avatar" style={{ objectPosition: a.pos }} />)}
            </div>
            <div>
              <div className="text-[14.5px]" style={{ color: 'var(--ink)' }}>{HERO.fra}</div>
              <div className="fs-small">{TILBUD.selskap} · Bergen</div>
            </div>
          </div>
        </div>
      </section>

      {/* 01 Kort fortalt */}
      <Seksjon id="kort-fortalt">
        <div className="fs-prose">
          <Hode id="kort-fortalt" tittel={KORT.tittel} />
        </div>
        <div className="fs-kort mt-8">
          {KORT.punkter.map((p, i) => (
            <div key={p.k} className="fs-reveal" data-delay={String(i)}>
              <div className="fs-label">{p.k}</div>
              <p className="fs-p">{p.t}</p>
            </div>
          ))}
        </div>
      </Seksjon>

      {/* 02 Målbildet */}
      <Seksjon id="malbildet">
        <div className="fs-prose">
          <Hode id="malbildet" tittel={MALBILDET.tittel} />
          {MALBILDET.avsnitt.map((a, i) => <p key={i} className={`fs-p fs-reveal${i === 0 ? '' : ''}`}>{a}</p>)}
        </div>
        <div className="fs-steps fs-reveal" data-testid="fs-steps">
          {MALBILDET.steg.map((s) => (
            <div key={s.navn} className={`fs-step${s.naa ? ' is-now' : ''}`}>
              <span className="dot" aria-hidden="true" />
              <div className="navn">{s.navn}</div>
              <div className="tekst">{s.tekst}</div>
            </div>
          ))}
        </div>
        <figure className="fs-figure fs-reveal">
          <img src={MALBILDET.bilde.src} alt={MALBILDET.bilde.alt} loading="lazy" decoding="async" style={{ objectPosition: '50% 42%' }} />
          <figcaption className="fs-small">{MALBILDET.bilde.tekst}</figcaption>
        </figure>
      </Seksjon>

      {/* 03 Det vi bygger */}
      <Seksjon id="det-vi-bygger">
        <div className="fs-bygger">
          <div>
            <Hode id="det-vi-bygger" tittel={BYGGER.tittel} />
            {BYGGER.avsnitt.map((a, i) => <p key={i} className="fs-p fs-reveal">{a}</p>)}
            <div className="fs-roller fs-reveal">
              {BYGGER.roller.map((r) => (
                <div key={r.k}><div className="k">{r.k}</div><div className="t">{r.t}</div></div>
              ))}
            </div>
          </div>
          <figure className="fs-phone fs-reveal" data-delay="1" aria-label="Eierappen">
            <div className="fs-phone-scale"><EierApp k={3} kl="20:41" adresse="Nygårdsgaten 5" /></div>
            <figcaption className="fs-small">{BYGGER.bildetekst}</figcaption>
          </figure>
        </div>
      </Seksjon>

      {/* 04 Strukturen */}
      <Seksjon id="strukturen">
        <div className="fs-prose">
          <Hode id="strukturen" tittel={STRUKTUR.tittel} />
          <p className="fs-ingress fs-reveal">{STRUKTUR.ingress}</p>
        </div>
        <div className="fs-struktur fs-reveal" data-testid="fs-struktur">
          <div className="fs-box is-this">
            <div className="merke">{STRUKTUR.tech.merke}</div>
            <div className="navn">{STRUKTUR.tech.navn}</div>
            <p className="tekst">{STRUKTUR.tech.tekst}</p>
            <ul>{STRUKTUR.tech.punkter.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <div className="fs-kobling" aria-hidden="true">
            <span className="lbl">{STRUKTUR.kobling.over}</span>
            <span className="line" />
            <span className="lbl">{STRUKTUR.kobling.under}</span>
          </div>
          <div className="fs-box">
            <div className="merke">{STRUKTUR.forvaltning.merke}</div>
            <div className="navn">{STRUKTUR.forvaltning.navn}</div>
            <p className="tekst">{STRUKTUR.forvaltning.tekst}</p>
            <ul>{STRUKTUR.forvaltning.punkter.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
        <div className="fs-prose">
          {STRUKTUR.avsnitt.map((a, i) => <p key={i} className="fs-p fs-reveal mt-10">{a}</p>)}
          <div className="fs-note fs-reveal">
            <div className="k">{STRUKTUR.note.k}</div>
            <p className="t">{STRUKTUR.note.t}</p>
          </div>
        </div>
      </Seksjon>

      {/* 05 Hvorfor dere */}
      <Seksjon id="hvorfor-dere">
        <div className="fs-prose">
        <Hode id="hvorfor-dere" tittel={HVORFOR.tittel} />
        <p className="fs-ingress fs-reveal">{HVORFOR.ingress}</p>
        <div className="fs-liste">
          {HVORFOR.punkter.map((p, i) => (
            <div key={p.k} className="fs-reveal">
              <div className="n">{String(i + 1).padStart(2, '0')}</div>
              <div><div className="k">{p.k}</div><p className="t">{p.t}</p></div>
            </div>
          ))}
        </div>
        <blockquote className="fs-sitat fs-reveal"><p className="fs-quote">{HVORFOR.sitat}</p></blockquote>
        </div>
      </Seksjon>

      {/* 06 Invitasjonen */}
      <Seksjon id="invitasjonen">
        <div className="fs-prose">
          <Hode id="invitasjonen" tittel={INVITASJON.tittel} />
        </div>
        <div className="fs-tilbud" data-testid="fs-tilbud">
          <div className="fs-reveal">
            <div className="fs-stor" data-testid="fs-andel" aria-label={TILBUD.andel}><span>{INVITASJON.storTall}</span><span className="pst">%</span></div>
            <p className="fs-stor-tekst">{INVITASJON.storTekst}</p>
            <div className="fs-stor-meta">
              <span className="fs-pill is-lilla">Verdsettelse {TILBUD.verdsettelse}</span>
              <span className="fs-pill">Ingen vesting</span>
              <span className="fs-pill">Rettet emisjon</span>
            </div>
          </div>
          <div className="fs-terms fs-reveal" data-delay="1">
            {INVITASJON.vilkaar.map((v) => (
              <div key={v.k} className="fs-term">
                <div className="k">{v.k}</div>
                <div><div className="v">{v.v}</div>{v.s ? <div className="s">{v.s}</div> : null}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="fs-prose">
          <p className="fs-p fs-stille fs-reveal">{INVITASJON.stille}</p>
        </div>
      </Seksjon>

      {/* 07 Veien videre */}
      <Seksjon id="veien-videre">
        <div className="fs-prose">
        <Hode id="veien-videre" tittel={VEIEN.tittel} />
        <ol className="fs-tidslinje">
          {VEIEN.steg.map((s, i) => (
            <li key={s.k} className="fs-tid fs-reveal">
              <span className="dot" aria-hidden="true" />
              <div className="n">Steg {i + 1}</div>
              <div className="k">{s.k}</div>
              <p className="t">{s.t}</p>
            </li>
          ))}
        </ol>
        </div>
      </Seksjon>

      {/* 08 Hilsen */}
      <Seksjon id="hilsen">
        <div className="fs-prose">
          <Hode id="hilsen" tittel={HILSEN.tittel} />
          <p className="fs-ingress fs-reveal">{HILSEN.tekst}</p>
          <p className="fs-p fs-reveal mt-10">{HILSEN.hilsen}</p>
        </div>
        <div className="fs-sign fs-reveal" data-testid="fs-signaturer">
          {AVSENDERE.map((a) => (
            <div key={a.navn} className="person">
              <img src={a.img} alt={a.navn} style={{ objectPosition: a.pos }} />
              <div><div className="navn">{a.navn}</div><div className="rolle">{a.rolle}</div></div>
            </div>
          ))}
        </div>
        <p className="fs-small mt-10">{STED_DATO}</p>
      </Seksjon>

      {/* Bunn */}
      <footer className="fs-foot">
        <div className="fs-wide fs-foot-inner">
          <div className="fs-small max-w-[560px]">
            <p>{FOOTER.linje1} {FOOTER.linje2}</p>
            <p className="mt-1.5">{FOOTER.selskap}</p>
          </div>
          <button type="button" className="fs-print" onClick={print} data-testid="fs-print"><Printer size={15} strokeWidth={1.75} />{FOOTER.print}</button>
        </div>
      </footer>
    </main>
  );
}
