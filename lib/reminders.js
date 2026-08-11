// ═══════════════════════ Fristpåminnelser (saker + deloppgaver) ═══════════════════════
// Sender e-post dagen FØR en sak eller deloppgave forfaller. Kjøres av en
// intern dagsplanlegger (lib/reminder-scheduler.js) og kan trigges manuelt via
// endepunktet /api/cron/reminders. Designet er:
//  • IDEMPOTENT: hver (mottaker × sak/deloppgave × frist) låses atomisk i
//    reminder_log før utsending, slik at ingen får dobbelt varsel — selv om
//    planleggeren kjører flere ganger, ved omstart eller på flere instanser.
//  • BATCHET: én e-post per person per kjøring som lister ALT vedkommende har
//    som forfaller i morgen (sak vedkommende er ansvarlig for / følger, og
//    deloppgaver vedkommende er ansvarlig for).
//  • BEST-EFFORT: feiler stille per mottaker; en sak går aldri tapt fordi
//    SendGrid er nede.
import { getDb } from './mongodb';
import { sendHtmlEmail, emailConfigured } from './email';
import crypto from 'crypto';

const cryptoRandomId = () => crypto.randomUUID();

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PRI_LABEL = { 1: 'P1 · Kritisk', 2: 'P2 · Normal', 3: 'P3 · Lav' };

// Oslo-dato (YYYY-MM-DD) forskjøvet N dager. Bruker UTC-aritmetikk på selve
// datotallene sletter sommertid-fella (vi jobber kun med kalenderdatoer).
export function osloDatoOffset(dager = 0) {
  const iso = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dager));
  return dt.toISOString().slice(0, 10);
}

const fmtDato = (d) => {
  try { return new Date(`${d}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; }
};

function byggEpost({ navn, items, base }) {
  const rad = (it) => {
    const merke = it.kind === 'deloppgave'
      ? '<span style="display:inline-block;font-size:11px;font-weight:700;color:#6d28d9;background:#ede9fe;border-radius:6px;padding:1px 7px;margin-right:6px">Deloppgave</span>'
      : '<span style="display:inline-block;font-size:11px;font-weight:700;color:#b45309;background:#fef3c7;border-radius:6px;padding:1px 7px;margin-right:6px">Sak</span>';
    const kontekst = it.kind === 'deloppgave'
      ? `<div style="color:#999;font-size:12px;margin-top:2px">i saken «${esc(it.taskTitle)}»</div>` : '';
    const pri = it.kind === 'sak' && it.priority ? `<span style="color:#999;font-size:12px;margin-left:6px">${esc(PRI_LABEL[it.priority] || '')}</span>` : '';
    return `<tr><td style="padding:10px 0;border-top:1px solid #f0efec">
      <div style="color:#111;font-size:14px;font-weight:600;line-height:1.45">${merke}${esc(it.title)}${pri}</div>
      ${kontekst}
      <div style="color:#b45309;font-size:12.5px;font-weight:600;margin-top:3px">Forfaller i morgen · ${esc(fmtDato(it.due))}</div>
    </td></tr>`;
  };
  const flertall = items.length > 1;
  return `
  <div style="background:#f6f5f3;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="background:#0a0a0a;padding:18px 24px"><span style="color:#fff;font-size:15px;font-weight:700">DigiHome</span> <span style="color:rgba(255,255,255,0.45);font-size:12px;margin-left:6px">Saker · påminnelse</span></div>
      <div style="padding:26px 24px">
        <p style="margin:0;color:#8b5cf6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Frist i morgen</p>
        <h2 style="margin:8px 0 4px;color:#0a0a0a;font-size:19px;line-height:1.3">Hei${navn ? ` ${esc(navn.split(' ')[0])}` : ''} 👋</h2>
        <p style="margin:0 0 8px;color:#666;font-size:13.5px;line-height:1.55">Du har ${flertall ? `${items.length} ting` : 'én ting'} som forfaller i morgen:</p>
        <table style="border-collapse:collapse;width:100%">${items.map(rad).join('')}</table>
        <a href="${base}/admin" style="display:inline-block;margin-top:20px;background:#0a0a0a;color:#fff;text-decoration:none;font-size:13.5px;font-weight:600;padding:11px 20px;border-radius:99px">Åpne Saker i admin →</a>
      </div>
    </div>
  </div>`;
}

// Kjør påminnelser for saker/deloppgaver som forfaller i MORGEN (Oslo-tid).
// db kan sendes inn for å gjenbruke en eksisterende tilkobling (fra API-ruten);
// ellers åpnes en egen. Returnerer et sammendrag for logging/respons.
export async function runDueReminders(dbArg = null, { dryRun = false } = {}) {
  const db = dbArg || (await getDb());
  const imorgen = osloDatoOffset(1);
  const summary = { dato: imorgen, kandidatSaker: 0, kandidatDeloppgaver: 0, mottakere: 0, sendt: 0, hoppetOver: 0, epostKonfigurert: emailConfigured(), dryRun };

  // Hent alle personer én gang (id → {name,email,notifPrefs}).
  const personer = await db.collection('admin_users')
    .find({}, { projection: { _id: 0, id: 1, name: 1, email: 1, notifPrefs: 1 } }).toArray();
  const personById = new Map(personer.map((p) => [p.id, p]));

  // Aktive saker (ikke arkivert, ikke ferdig) som er relevante: enten forfaller
  // selv i morgen, eller har en deloppgave som forfaller i morgen.
  const saker = await db.collection('tasks')
    .find({ archived: { $ne: true }, status: { $ne: 'done' } }, { projection: { _id: 0 } }).toArray();

  // Bygg kandidat-items gruppert per mottaker-id.
  const perMottaker = new Map(); // id → [item]
  const leggTil = (mottakerId, item) => {
    if (!mottakerId) return;
    if (!perMottaker.has(mottakerId)) perMottaker.set(mottakerId, []);
    perMottaker.get(mottakerId).push(item);
  };

  for (const t of saker) {
    // Sak-frist i morgen → varsle ansvarlig + følgere.
    if (t.dueDate === imorgen) {
      summary.kandidatSaker += 1;
      const mottakere = new Set([t.assigneeId, ...(Array.isArray(t.followers) ? t.followers : [])].filter(Boolean));
      for (const mid of mottakere) {
        leggTil(mid, { kind: 'sak', key: `sak:${t.id}:${imorgen}:${mid}`, taskId: t.id, title: t.title, due: imorgen, priority: t.priority });
      }
    }
    // Deloppgaver med frist i morgen → varsle deloppgavens ansvarlig.
    for (const s of (Array.isArray(t.subtasks) ? t.subtasks : [])) {
      if (s && !s.done && s.due === imorgen && s.assigneeId) {
        summary.kandidatDeloppgaver += 1;
        leggTil(s.assigneeId, { kind: 'deloppgave', key: `sub:${t.id}:${s.id}:${imorgen}:${s.assigneeId}`, taskId: t.id, title: s.text, due: imorgen, taskTitle: t.title });
      }
    }
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');

  for (const [mottakerId, items] of perMottaker.entries()) {
    const person = personById.get(mottakerId);
    if (!person || !person.email) { summary.hoppetOver += items.length; continue; }

    // Idempotens: prøv å KLABBE hver key atomisk. upsertedCount===1 betyr at
    // nettopp DENNE kjøringen var først → skal sendes. Ellers alt håndtert.
    const claimed = [];
    for (const it of items) {
      if (dryRun) { claimed.push(it); continue; }
      try {
        const r = await db.collection('reminder_log').updateOne(
          { key: it.key },
          { $setOnInsert: { key: it.key, recipientId: mottakerId, at: new Date().toISOString() } },
          { upsert: true },
        );
        if (r.upsertedCount === 1) claimed.push(it); else summary.hoppetOver += 1;
      } catch (e) { summary.hoppetOver += 1; }
    }
    if (!claimed.length) continue;

    summary.mottakere += 1;
    if (dryRun) { summary.sendt += claimed.length; continue; }

    // In-app-varsel per påminnelse (innboksen får alltid alt).
    try {
      for (const it of claimed) {
        await db.collection('notifications').insertOne({
          id: cryptoRandomId(), userId: mottakerId, type: 'frist', taskId: it.taskId || null,
          taskTitle: String(it.kind === 'deloppgave' ? it.taskTitle : it.title).slice(0, 200),
          actor: 'System', text: `${it.kind === 'deloppgave' ? 'Deloppgave' : 'Sak'} forfaller i morgen: ${String(it.title).slice(0, 120)}`,
          read: false, createdAt: new Date().toISOString(),
        });
      }
    } catch (e) { /* stille */ }

    // E-post — respekter brukerens preferanse for kategorien 'frist'.
    if (person.notifPrefs && person.notifPrefs.email && person.notifPrefs.email.frist === false) {
      summary.sendt += claimed.length; // regnet som varslet (in-app), e-post avslått
      continue;
    }
    try {
      const html = byggEpost({ navn: person.name, items: claimed, base });
      const emne = claimed.length > 1
        ? `Påminnelse: ${claimed.length} frister i morgen`
        : `Påminnelse: «${claimed[0].title}» forfaller i morgen`;
      await sendHtmlEmail({ to: person.email, subject: emne, html, fromName: 'DigiHome Saker', individual: false, categories: ['frist-paaminnelse'] });
      summary.sendt += claimed.length;
    } catch (e) {
      // Utsending feilet → frigi klaimene slik at neste kjøring prøver igjen.
      try { await db.collection('reminder_log').deleteMany({ key: { $in: claimed.map((c) => c.key) } }); } catch (e2) {}
      summary.hoppetOver += claimed.length;
    }
  }

  return summary;
}
