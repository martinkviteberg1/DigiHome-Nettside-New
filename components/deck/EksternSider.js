'use client';

import React from 'react';
import { EASE, T, display } from '../forside/v4/motion';
import { DIM, SVAK, HAIR, LYS_DIM, LYS_SVAK, LYS_HAIR, Etikett, Tittel, Punktum, Kilde, Tall, Prikkby, inn } from './EksternDeck';

/* ---------------------------------------------------------------------------
   EksternSider — the twelve pages of the outward-facing deck (English).

   TALL is the numbers snapshot. Everything here is static and dated; change
   the snapshot, not the pages. Sources for market figures sit on the page.
--------------------------------------------------------------------------- */

export const TALL = {
  per: '22 September 2026',
  funksjoner: 77,
  medAi: 9,
  stopp: 11,
  automatiske: 8,
  eiereSignert: 19,          // owner customers won (CRM)
  henvendelser: 35,          // inbound owner inquiries since launch (CRM)
  omsetningTilNaa: 146500,   // NOK booked to date (finance module)
  svarInnen24t: 100,         // % of owner inquiries answered within 24 h, last 30 days
  /* Market — Norway */
  utleieboliger: 750000,     // Husbanken 2025
  leierHusholdninger: 609855, // SSB 2024
  leieandel: 23.6,           // % of households renting, SSB 2024
  privatAndel: 70,           // share rented from private individuals (Husbanken)
  profAndel: '11–13',        // professional landlords
  kommunalAndel: 17,
  /* Nordics — share of population in rented dwellings */
  norden: [['Sweden', 35], ['Finland', 33], ['Denmark', 42]],
};

const nb = (n) => Math.round(n).toLocaleString('en-GB').replace(/,/g, '\u00A0');

/* ── shared bits ─────────────────────────────────────────────────────────── */
function Flis({ aktiv, i, stor, tekst, morkt, tall }) {
  return (
    <div className="rounded-[18px] p-5 sm:p-6" style={{ background: morkt ? 'rgba(244,241,234,0.05)' : '#FFFFFF', boxShadow: `inset 0 0 0 1px ${morkt ? LYS_HAIR : HAIR}`, ...inn(aktiv, i) }}>
      <p className="text-[clamp(30px,3vw,44px)]" style={{ ...display, color: morkt ? T.offwhite : T.ink, letterSpacing: '-0.03em' }}>{tall !== undefined ? <Tall aktiv={aktiv} til={tall.til} fmt={tall.fmt} /> : stor}</p>
      <p className="mt-2 text-[14px] leading-[1.45]" style={{ color: morkt ? LYS_DIM : DIM }}>{tekst}</p>
    </div>
  );
}

function Portrett({ src, navn, rolle, tekst, aktiv, i, size = 88 }) {
  return (
    <div style={inn(aktiv, i)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={navn} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size, filter: 'grayscale(1)', boxShadow: `0 0 0 1px ${HAIR}` }} />
      <p className="mt-4 text-[18px] font-medium leading-[1.2]" style={{ color: T.ink }}>{navn}</p>
      <p className="text-[13px]" style={{ color: T.lilla }}>{rolle}</p>
      <p className="mt-2 text-[13.5px] leading-[1.5]" style={{ color: DIM }}>{tekst}</p>
    </div>
  );
}

/* ── 01 Cover ─────────────────────────────────────────────────────────────── */
function Forside({ aktiv }) {
  return (
    <div className="relative">
      <Prikkby aktiv={aktiv} className="pointer-events-none absolute -inset-x-16 -top-40 h-[560px] w-[calc(100%+128px)] opacity-70 lg:-top-56" />
      <div className="relative">
        <p className="text-[13px] font-medium" style={{ color: T.lilla, ...inn(aktiv, 0, 8) }}>DigiHome · Investor &amp; partner deck · September 2026</p>
        <h1 className="mt-6 text-[clamp(48px,8vw,124px)]" style={{ ...display, color: T.offwhite, maxWidth: '12ch', ...inn(aktiv, 1, 24) }}>Rental management, run by software<Punktum /></h1>
        <p className="mt-8 max-w-[48ch] text-[clamp(17px,1.4vw,22px)] leading-[1.45]" style={{ color: LYS_DIM, ...inn(aktiv, 3) }}>Built by property managers in Bergen. Now available to rental agencies and property companies across Norway.</p>
        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-2 text-[12.5px]" style={{ color: LYS_SVAK, ...inn(aktiv, 4, 8) }}>
          <span>Bergen, Norway</span><span>digihome.no</span><span>12 pages · numbers as of {TALL.per}</span>
        </div>
      </div>
    </div>
  );
}

/* ── 02 Problem ───────────────────────────────────────────────────────────── */
const VERKTOY = ['Listing portal', 'E-signing', 'Deposit account', 'Invoicing', 'Case inbox', 'Spreadsheets', 'Accounting system'];
function Problem({ aktiv }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <Etikett aktiv={aktiv}>The problem</Etikett>
        <Tittel aktiv={aktiv}>Managing rental homes is still a manual craft<Punktum /></Tittel>
        <p className="mt-8 max-w-[52ch] text-[clamp(17px,1.3vw,21px)] leading-[1.5]" style={{ color: DIM, ...inn(aktiv, 2) }}>From the first inquiry to the annual statement, a rental agency touches eleven steps and six to eight disconnected tools. Every new home adds hours. Every hundred homes adds a hire.</p>
        <ul className="mt-8 flex flex-wrap gap-2" style={inn(aktiv, 3)}>
          {VERKTOY.map((v, i) => <li key={v} className="rounded-full px-3 py-1.5 text-[13px]" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: DIM, animation: aktiv ? `v4-steg-inn 500ms ${EASE} ${300 + i * 60}ms both` : 'none', opacity: aktiv ? undefined : 0 }}>{v}</li>)}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:pt-10">
        <Flis aktiv={aktiv} i={2} tall={{ til: 11 }} tekst="steps per tenancy, from inquiry to annual statement" />
        <Flis aktiv={aktiv} i={3} stor="6–8" tekst="disconnected tools in a typical agency" />
        <Flis aktiv={aktiv} i={4} stor="~45 min" tekst="admin per home, per month" />
        <Flis aktiv={aktiv} i={5} stor="~70 %" tekst="of that is routine — collection, reminders, reconciliation, owner reports" />
        <p className="col-span-2 text-[12px] leading-[1.5]" style={{ color: SVAK, ...inn(aktiv, 6, 8) }}>Time figures are our operating estimate from managing homes in Bergen; they are the defaults in our public savings calculator.</p>
      </div>
    </div>
  );
}

/* ── 03 Insight ───────────────────────────────────────────────────────────── */
const INNSIKT = [
  ['We are property managers', 'DigiHome manages rental homes for owners in Bergen — every day, on the system in this deck.'],
  ['We built it because nothing did the whole job', 'No product ran the chain from inquiry to annual statement: sales, contract, rent, cases, client account, settlement.'],
  ['Now it is available to others', 'Rental agencies and property companies run on the same system — and keep their owners, brand and decisions.'],
];
function Innsikt({ aktiv }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <Etikett aktiv={aktiv}>Why we exist</Etikett>
        <Tittel aktiv={aktiv}>We didn't set out to sell software. We needed it<Punktum /></Tittel>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {INNSIKT.map(([t, d], i) => (
            <li key={t} style={inn(aktiv, 2 + i)}>
              <p className="text-[12.5px] tabular-nums" style={{ color: T.lilla }}>0{i + 1}</p>
              <p className="mt-2 text-[17px] font-medium leading-[1.25]" style={{ color: T.ink }}>{t}</p>
              <p className="mt-2 text-[14px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
            </li>
          ))}
        </ol>
      </div>
      <figure className="rounded-[22px] p-7 lg:col-span-5 lg:mt-16" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}, 0 40px 90px -60px rgba(21,19,15,0.35)`, ...inn(aktiv, 4) }}>
        <blockquote className="text-[clamp(18px,1.4vw,22px)] leading-[1.4]" style={{ color: T.ink }}>
          “We looked for one system that took the whole run, from the first inquiry to the owner's settlement. It didn't exist. So we built it ourselves — on our own homes, with our own mistakes. Everything in this deck is something we needed.”
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v4/martin-320.webp" alt="" width={44} height={44} className="rounded-full object-cover" style={{ width: 44, height: 44, filter: 'grayscale(1)' }} />
          <span><span className="block text-[14.5px] font-medium" style={{ color: T.ink }}>Martin C. Kviteberg</span><span className="block text-[12.5px]" style={{ color: SVAK }}>Chief Product Officer, DigiHome</span></span>
        </figcaption>
      </figure>
    </div>
  );
}

/* ── 04 Product ───────────────────────────────────────────────────────────── */
const STOPP = [['Inquiry'], ['Offer'], ['Mandate'], ['Listing'], ['Viewing'], ['Contract', 'you choose the tenant'], ['Move-in'], ['Rent'], ['Cases', 'you choose the contractor'], ['Settlement', 'you approve the payout'], ['Annual statement']];
const AUTOMATISK = [
  ['Before the tenant', 'Listing text and photo enhancement, publishing on FINN, viewing bookings, BankID identity check and credit check with consent.'],
  ['During the tenancy', 'Contract via BankID, deposit account with Keyhole, move-in protocol room by room, invoicing, reminders, cases with category and deadline.'],
  ['The money', 'Client account, fee deduction, owner payout, settlement report per owner, PowerOffice Go and Fiken, annual statement.'],
];
function Produkt({ aktiv }) {
  return (
    <div>
      <Etikett aktiv={aktiv}>The product</Etikett>
      <Tittel aktiv={aktiv} maks="22ch">One system. Eleven stops. Eight run themselves<Punktum /></Tittel>
      {/* The line */}
      <div className="relative mt-14" style={inn(aktiv, 2)}>
        <span aria-hidden="true" className="absolute left-0 right-0 top-[7px] h-px origin-left" style={{ background: 'rgba(21,19,15,0.2)', transform: aktiv ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 1400ms ${EASE} 200ms` }} />
        <ol className="grid grid-cols-11 gap-1">
          {STOPP.map(([navn, dere], i) => (
            <li key={navn} className="min-w-0">
              <span className="relative block h-[15px] w-[15px]">
                <span className="absolute inset-[3px] rounded-full" style={{ background: dere ? T.lilla : 'rgba(21,19,15,0.55)', boxShadow: `0 0 0 3px ${T.canvas}`, transform: aktiv ? 'scale(1)' : 'scale(0)', transition: `transform 500ms cubic-bezier(0.34,1.4,0.64,1) ${300 + i * 90}ms` }} />
                {dere ? <span className="absolute inset-[-3px] rounded-full" style={{ boxShadow: `inset 0 0 0 1px ${T.lilla}`, opacity: aktiv ? 1 : 0, transition: `opacity 400ms ${EASE} ${500 + i * 90}ms` }} /> : null}
              </span>
              <p className="mt-3 text-[clamp(10px,0.85vw,13.5px)] leading-[1.25]" style={{ color: dere ? T.ink : DIM, fontWeight: dere ? 500 : 400, ...inn(aktiv, 3 + i * 0.5, 6) }}>{navn}</p>
              {dere ? <p className="mt-1 hidden text-[11px] leading-[1.3] md:block" style={{ color: T.lilla, ...inn(aktiv, 4 + i * 0.5, 6) }}>{dere}</p> : null}
            </li>
          ))}
        </ol>
        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: SVAK, ...inn(aktiv, 6, 6) }}>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: 'rgba(21,19,15,0.55)' }} />The system does it</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: T.lilla }} />A human decides</span>
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {AUTOMATISK.map(([t, d], i) => (
          <div key={t} style={inn(aktiv, 6 + i)}>
            <p className="text-[16px] font-medium" style={{ color: T.ink }}>{t}</p>
            <p className="mt-2 text-[14px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
          </div>
        ))}
      </div>
      <Kilde aktiv={aktiv} i={9}>{TALL.funksjoner} functions in production · {TALL.medAi} powered by language models · everything not marked “coming” is live today and can be shown in a demo.</Kilde>
    </div>
  );
}

/* ── 05 AI ────────────────────────────────────────────────────────────────── */
const CHAT = [
  { fra: 'dem', t: 'Hi — there has been no hot water in the flat since yesterday.' },
  { fra: 'oss', t: 'Thanks, Emma. I have opened a case and sent it to Jonas, who picks the plumber. You will hear back here as soon as the time is set — most likely today.', kilde: 'Case 4812 created · Strandgaten 12' },
  { fra: 'dem', t: 'Can I get a rent reduction for this?' },
  { fra: 'oss', t: 'That is for Jonas to decide. I have passed your question on, and he will answer you here.', loft: 'Escalated to Jonas Haugland · property manager' },
];
const ALDRI = ['Approve costs', 'Promise rent reductions', 'Choose tenants'];
const LESER = ['Property card', 'Contracts', 'Cases', 'Settlements', 'Listings', 'Viewing calendar'];
function Ai({ aktiv }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-5">
        <Etikett morkt aktiv={aktiv}>The assistant</Etikett>
        <Tittel morkt aktiv={aktiv} maks="20ch">An AI colleague that knows every home — and where to stop<Punktum /></Tittel>
        <p className="mt-8 max-w-[44ch] text-[16.5px] leading-[1.5]" style={{ color: LYS_DIM, ...inn(aktiv, 2) }}>The assistant sits in the team list like everyone else. It reads the contract, the case, the listing and the settlement, and answers tenants, owners and prospects. Anything that costs money goes to a human.</p>
        <div className="mt-8 grid grid-cols-2 gap-6" style={inn(aktiv, 3)}>
          <div>
            <p className="text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Reads</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">{LESER.map((l) => <li key={l} className="rounded-full px-2.5 py-1 text-[12.5px]" style={{ background: 'rgba(244,241,234,0.08)', color: T.offwhite }}>{l}</li>)}</ul>
          </div>
          <div>
            <p className="text-[12.5px] font-medium" style={{ color: LYS_SVAK }}>Never does</p>
            <ul className="mt-2 flex flex-col gap-1.5">{ALDRI.map((l) => <li key={l} className="flex items-center gap-2 text-[13.5px]" style={{ color: T.offwhite }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />{l}</li>)}</ul>
          </div>
        </div>
      </div>
      <div className="lg:col-span-7 lg:pt-8">
        <div className="rounded-[22px] p-5 sm:p-6" style={{ background: 'rgba(244,241,234,0.05)', boxShadow: `inset 0 0 0 1px ${LYS_HAIR}`, ...inn(aktiv, 2) }}>
          <div className="flex items-center justify-between text-[12.5px]" style={{ color: LYS_SVAK }}>
            <span className="inline-flex items-center gap-2"><span className="inline-grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-medium" style={{ background: 'rgba(244,241,234,0.12)', color: T.offwhite }}>EL</span>Emma Lie · tenant · Strandgaten 12</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Answering: DigiHome assistant</span>
          </div>
          <ol className="mt-5 flex flex-col gap-3">
            {CHAT.map((m, i) => {
              const oss = m.fra === 'oss';
              return (
                <li key={i} className={`flex ${oss ? 'justify-end' : 'justify-start'}`} style={{ ...inn(aktiv, 3 + i * 1.4, 10) }}>
                  <div className="max-w-[78%]">
                    <div className="rounded-[14px] px-4 py-3 text-[14px] leading-[1.45]" style={{ background: oss ? T.lilla : 'rgba(244,241,234,0.1)', color: oss ? T.ink : T.offwhite, borderTopLeftRadius: oss ? 14 : 5, borderTopRightRadius: oss ? 5 : 14 }}>{m.t}</div>
                    {m.kilde ? <p className="mt-1.5 text-right text-[11.5px]" style={{ color: LYS_SVAK }}>Source: {m.kilde}</p> : null}
                    {m.loft ? <p className="mt-1.5 inline-flex items-center gap-1.5 text-right text-[11.5px]" style={{ color: T.lilla }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />{m.loft}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <Kilde morkt aktiv={aktiv} i={9}>Messages are interpreted by language models. Rent, reminders and settlements follow fixed rules. Anything that costs money is approved by a human — that is the product, not a limitation.</Kilde>
      </div>
    </div>
  );
}

/* ── 06 Where we are ──────────────────────────────────────────────────────── */
function Status({ aktiv }) {
  return (
    <div>
      <Etikett aktiv={aktiv}>Where we are · {TALL.per}</Etikett>
      <Tittel aktiv={aktiv} maks="20ch">Live, operating, earning<Punktum /></Tittel>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Flis aktiv={aktiv} i={2} stor="In production" tekst={`${TALL.funksjoner} functions across the whole chain. The AI assistant answers tenants, owners and prospects today.`} />
        <Flis aktiv={aktiv} i={3} tall={{ til: TALL.eiereSignert }} tekst={`owner customers signed, from ${TALL.henvendelser} inbound inquiries since launch — no outbound sales yet`} />
        <Flis aktiv={aktiv} i={4} tall={{ til: TALL.omsetningTilNaa, fmt: (n) => `NOK ${nb(n)}` }} tekst="revenue booked to date — management fees and services" />
        <Flis aktiv={aktiv} i={5} tall={{ til: TALL.svarInnen24t, fmt: (n) => `${Math.round(n)} %` }} tekst="of owner inquiries answered within 24 hours, last 30 days" />
        <Flis aktiv={aktiv} i={6} stor="Own portfolio" tekst="Our management business in Bergen is the platform's first and most demanding customer. Every feature is used before it is sold." />
        <Flis aktiv={aktiv} i={7} stor="Bootstrapped" tekst="Founder-funded so far, with below-market founder salaries. Preparing our first external round." />
      </div>
      <Kilde aktiv={aktiv} i={9}>Figures from our own operating systems (CRM and finance module) as of {TALL.per}. Detail, cohorts and the budget model are in the data room.</Kilde>
    </div>
  );
}

/* ── 07 Customers ─────────────────────────────────────────────────────────── */
const KUNDER = [
  ['Homeowners', 'One or a few homes. Rent out yourself for 5 % of collected rent — or hand the whole job to our management team, quote within 24 hours.', 'Self-service or full management', false],
  ['Property companies', 'Portfolios of rental units. One system for tenants, rent, cases, owner reporting and accounting — instead of spreadsheets and disconnected tools.', 'Priced per unit', false],
  ['Rental agencies & managers', 'Run your owners\u2019 homes on the system we run ours on: client account, settlements, the assistant. Your brand, your owners, your decisions.', 'Priced per unit · our growth focus', true],
];
function Kunder({ aktiv }) {
  return (
    <div>
      <Etikett aktiv={aktiv}>Who we serve</Etikett>
      <Tittel aktiv={aktiv} maks="22ch">Three customers. One price logic: per tenancy<Punktum /></Tittel>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {KUNDER.map(([t, d, p, fokus], i) => (
          <div key={t} className="flex flex-col rounded-[20px] p-6 sm:p-7" style={{ background: fokus ? T.ink : '#FFFFFF', color: fokus ? T.offwhite : T.ink, boxShadow: fokus ? 'none' : `inset 0 0 0 1px ${HAIR}`, ...inn(aktiv, 2 + i) }}>
            <p className="text-[12.5px] tabular-nums" style={{ color: T.lilla }}>0{i + 1}</p>
            <p className="mt-3 text-[clamp(22px,1.8vw,28px)]" style={{ ...display, letterSpacing: '-0.025em' }}>{t}</p>
            <p className="mt-4 flex-1 text-[14.5px] leading-[1.5]" style={{ color: fokus ? LYS_DIM : DIM }}>{d}</p>
            <p className="mt-6 text-[13px] font-medium" style={{ color: fokus ? T.lilla : T.ink }}>{p}</p>
          </div>
        ))}
      </div>
      <Kilde aktiv={aktiv} i={6}>Tenants use the tenant portal and app every day — free of charge. They are users, not paying customers.</Kilde>
    </div>
  );
}

/* ── 08 Business model ────────────────────────────────────────────────────── */
function Modell({ aktiv }) {
  return (
    <div>
      <Etikett morkt aktiv={aktiv}>Business model</Etikett>
      <Tittel morkt aktiv={aktiv} maks="18ch">Two engines. One platform<Punktum /></Tittel>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {[
          ['Digihome AS', 'Property management', 'Fees of 8–15 % of rent on the homes we manage in Bergen. Revenue today, proof of the product, and the place every feature is used first.', 'People and margin'],
          ['Digihome Tech AS', 'Software', 'A per-tenancy subscription for rental agencies and property companies. Near-zero marginal cost per added tenancy. The management business is Tech\u2019s first customer.', 'Scales'],
        ].map(([n, r, d, tag], i) => (
          <div key={n} className="rounded-[20px] p-6 sm:p-7" style={{ background: 'rgba(244,241,234,0.05)', boxShadow: `inset 0 0 0 1px ${LYS_HAIR}`, ...inn(aktiv, 2 + i) }}>
            <p className="flex items-center justify-between text-[12.5px]" style={{ color: LYS_SVAK }}><span>{r}</span><span style={{ color: T.lilla }}>{tag}</span></p>
            <p className="mt-3 text-[clamp(24px,2vw,32px)]" style={{ ...display, color: T.offwhite, letterSpacing: '-0.025em' }}>{n}</p>
            <p className="mt-4 text-[14.5px] leading-[1.5]" style={{ color: LYS_DIM }}>{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3" style={inn(aktiv, 4)}>
        {[
          ['Price per tenancy', 'The fee follows the customer\u2019s portfolio: more homes, more revenue, same team on our side.'],
          ['Money flows create stickiness', 'Client account, fee deduction, owner payouts and accounting integrations — the system becomes the ledger, not a tool beside it.'],
          ['One group', 'Digihome Group AS owns 100 % of both companies. One board, one product, two revenue lines.'],
        ].map(([t, d]) => (
          <div key={t}><p className="text-[15.5px] font-medium" style={{ color: T.offwhite }}>{t}</p><p className="mt-2 text-[14px] leading-[1.5]" style={{ color: LYS_DIM }}>{d}</p></div>
        ))}
      </div>
    </div>
  );
}

/* ── 09 Market ────────────────────────────────────────────────────────────── */
function Marked({ aktiv }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <Etikett aktiv={aktiv}>Market · Norway</Etikett>
        <Tittel aktiv={aktiv} maks="20ch">750,000 rented homes. Seven in ten are managed by a private individual<Punktum /></Tittel>
        <p className="mt-8 max-w-[50ch] text-[clamp(16px,1.25vw,20px)] leading-[1.5]" style={{ color: DIM, ...inn(aktiv, 2) }}>The supply is fragmented and mostly amateur. The agencies and managers who serve those private owners are our customers — and today they scale by hiring. Per-tenancy software changes that equation.</p>
        <div className="mt-8" style={inn(aktiv, 3)}>
          <p className="text-[12.5px] font-medium" style={{ color: SVAK }}>The Nordics — share of people living in rented homes</p>
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {TALL.norden.map(([l, p]) => <li key={l} className="rounded-[14px] px-4 py-3" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}` }}><p className="text-[24px]" style={{ ...display, color: T.ink }}>{p} %</p><p className="text-[12.5px]" style={{ color: SVAK }}>{l}</p></li>)}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:pt-10">
        <Flis aktiv={aktiv} i={2} tall={{ til: TALL.utleieboliger, fmt: (n) => nb(n) }} tekst="rented homes in Norway (Husbanken, 2025)" />
        <Flis aktiv={aktiv} i={3} tall={{ til: TALL.leieandel, fmt: (n) => `${n.toFixed(1)} %` }} tekst={`of households rent — ${nb(TALL.leierHusholdninger)} households (SSB, 2024)`} />
        <Flis aktiv={aktiv} i={4} tall={{ til: TALL.privatAndel, fmt: (n) => `~${Math.round(n)} %` }} tekst="rented from private individuals — basement flats and second homes" />
        <Flis aktiv={aktiv} i={5} stor={`${TALL.profAndel} %`} tekst={`professional landlords; ~${TALL.kommunalAndel} % municipal`} />
        <Kilde aktiv={aktiv} i={6}>Sources: Husbanken, “Leiemarkedet 2025”; SSB, Boforhold registerbasert 2024 and Leiemarkedsundersøkelsen 2025; Statistics Sweden, Statistics Finland, Statistics Denmark (tenure shares).</Kilde>
      </div>
    </div>
  );
}

/* ── 10 Go-to-market ──────────────────────────────────────────────────────── */
const FASER = [
  ['Now', 'Own operation in Bergen', 'The platform runs our own homes. Every feature is used by us before it is sold to anyone.', 'live'],
  ['Next', 'Partner programme', 'Five rental agencies get the owner inquiries digihome.no generates in their area, and run them on the system.', 'in progress'],
  ['Then', 'National, per unit', 'Rental agencies and property companies across Norway on per-tenancy pricing. The Nordics after Norway — same structure, same problem.', 'planned'],
];
const KANALER = ['Inbound from digihome.no — guides, calculators, market data', 'The agencies\u2019 existing owners', 'Integrations: FINN, BankID, Keyhole, PowerOffice Go, Fiken'];
function Gtm({ aktiv }) {
  return (
    <div>
      <Etikett aktiv={aktiv}>Go-to-market</Etikett>
      <Tittel aktiv={aktiv} maks="22ch">Bergen first. Then the agencies. Then the country<Punktum /></Tittel>
      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {FASER.map(([naar, t, d, st], i) => (
          <li key={t} className="rounded-[20px] p-6 sm:p-7" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}`, ...inn(aktiv, 2 + i) }}>
            <p className="flex items-center justify-between text-[12.5px]"><span style={{ color: T.lilla }}>{naar}</span><span className="inline-flex items-center gap-1.5" style={{ color: SVAK }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: st === 'live' ? T.gronn : st === 'in progress' ? T.lilla : 'rgba(21,19,15,0.25)' }} />{st}</span></p>
            <p className="mt-3 text-[clamp(22px,1.8vw,28px)]" style={{ ...display, color: T.ink, letterSpacing: '-0.025em' }}>{t}</p>
            <p className="mt-4 text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-2" style={inn(aktiv, 5)}>
        <span className="mr-2 self-center text-[12.5px] font-medium" style={{ color: SVAK }}>Channels</span>
        {KANALER.map((k) => <span key={k} className="rounded-full px-3 py-1.5 text-[13px]" style={{ background: '#FFFFFF', boxShadow: `inset 0 0 0 1px ${HAIR}`, color: DIM }}>{k}</span>)}
      </div>
    </div>
  );
}

/* ── 11 Team ──────────────────────────────────────────────────────────────── */
const TEAM = [
  ['/brand/sarah-sleeman-360.webp', 'Sarah Sleeman', 'CEO · board member', 'Licensed real estate agent with six years in advisory roles at DNB. Leads client acquisition and the management business.'],
  ['/v4/martin-320.webp', 'Martin C. Kviteberg', 'CPO · board member', 'Founded BnbSpesialisten, one of Norway\u2019s first professional rental operators; ten years at Adonis AS through to its exit. Owns the product.'],
  ['/team/kevin-ai-v2.webp', 'Kevin Ha', 'AI-driven development', 'NHH-educated economist and former DNB analyst. Builds and automates the platform.'],
  ['/team-erik.webp', 'Erik Hoffmann-Dahl', 'Chair of the board', 'Lawyer and partner at Hoffmann Thinn. Designed the group structure for growth and the coming round.'],
  ['/team/jens-petter-glittenberg.webp', 'Jens-Petter Glittenberg', 'Board member', 'Co-founder of Meltwater (2001–2021), where he helped scale the company globally. Chair of CARN Capital.'],
];
function Team({ aktiv }) {
  return (
    <div>
      <Etikett aktiv={aktiv}>Team and board</Etikett>
      <Tittel aktiv={aktiv} maks="24ch">Operators, a product founder, and a board that has scaled before<Punktum /></Tittel>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
        {TEAM.map(([src, n, r, d], i) => <Portrett key={n} src={src} navn={n} rolle={r} tekst={d} aktiv={aktiv} i={2 + i} />)}
      </div>
      <Kilde aktiv={aktiv} i={8}>Sarah and Martin sit on the board of both companies and work full time in the business.</Kilde>
    </div>
  );
}

/* ── 12 The road ahead ────────────────────────────────────────────────────── */
function Veien({ aktiv, variant }) {
  const investor = variant !== 'partner';
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <Etikett morkt aktiv={aktiv}>The road ahead</Etikett>
        <Tittel morkt aktiv={aktiv} maks="18ch">{investor ? <>We are raising our first external round<Punktum /></> : <>From our portfolio to the country<Punktum /></>}</Tittel>
        <p className="mt-8 max-w-[46ch] text-[clamp(16px,1.25vw,20px)] leading-[1.5]" style={{ color: LYS_DIM, ...inn(aktiv, 2) }}>{investor ? 'To take the platform from our own portfolio to rental agencies and property companies across Norway. The plan, the budget model and the cap table are in the data room — with live tracking of spend against plan.' : 'The platform runs our own homes today. Next, five partner agencies run theirs on it — then agencies and property companies across Norway, on per-tenancy pricing.'}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {[['Partners', 'Five agencies live on the platform, with the inquiries digihome.no generates in their area.'], ['Product', 'Settlement and accounting flows fully automated; the assistant across every channel.'], ['Reach', 'Per-tenancy pricing to agencies and property companies nationwide. Nordic-ready structure.']].map(([t, d], i) => (
            <li key={t} style={inn(aktiv, 3 + i)}><p className="text-[15px] font-medium" style={{ color: T.offwhite }}>{t}</p><p className="mt-1.5 text-[13.5px] leading-[1.5]" style={{ color: LYS_DIM }}>{d}</p></li>
          ))}
        </ul>
      </div>
      <div className="rounded-[22px] p-7 lg:col-span-5 lg:mt-14" style={{ background: 'rgba(244,241,234,0.05)', boxShadow: `inset 0 0 0 1px ${LYS_HAIR}`, ...inn(aktiv, 4) }}>
        <p className="text-[12.5px] font-medium" style={{ color: T.lilla }}>Talk to us</p>
        <p className="mt-3 text-[clamp(24px,2vw,32px)]" style={{ ...display, color: T.offwhite, letterSpacing: '-0.025em' }}>Sarah Sleeman</p>
        <p className="text-[13.5px]" style={{ color: LYS_SVAK }}>CEO, DigiHome</p>
        <ul className="mt-5 flex flex-col gap-1.5 text-[15px]" style={{ color: T.offwhite }}>
          <li><a href="mailto:sarah@digihome.no" className="underline decoration-[rgba(244,241,234,0.3)] underline-offset-4 hover:decoration-[#F4F1EA]">sarah@digihome.no</a></li>
          <li><a href="tel:+4790958313" className="underline decoration-[rgba(244,241,234,0.3)] underline-offset-4 hover:decoration-[#F4F1EA]">+47 909 58 313</a></li>
          <li><a href="https://digihome.no/utleiemeglere" className="underline decoration-[rgba(244,241,234,0.3)] underline-offset-4 hover:decoration-[#F4F1EA]">digihome.no/utleiemeglere</a></li>
        </ul>
        <p className="mt-6 text-[12px] leading-[1.5]" style={{ color: LYS_SVAK }}>Digihome AS · Org. no. 835 595 242 · Kokstadvegen 46, 5257 Kokstad, Norway</p>
      </div>
    </div>
  );
}

export const SIDER = [
  { id: 'cover', navn: 'Cover', morkt: true, C: Forside },
  { id: 'problem', navn: 'The problem', C: Problem },
  { id: 'insight', navn: 'Why we exist', C: Innsikt },
  { id: 'product', navn: 'The product', bred: true, C: Produkt },
  { id: 'assistant', navn: 'The assistant', morkt: true, C: Ai },
  { id: 'status', navn: 'Where we are', C: Status },
  { id: 'customers', navn: 'Who we serve', C: Kunder },
  { id: 'model', navn: 'Business model', morkt: true, C: Modell },
  { id: 'market', navn: 'Market', C: Marked },
  { id: 'gtm', navn: 'Go-to-market', C: Gtm },
  { id: 'team', navn: 'Team and board', bred: true, C: Team },
  { id: 'road', navn: 'The road ahead', morkt: true, C: Veien },
];
