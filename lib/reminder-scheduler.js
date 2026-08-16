// ═══════════════════════ Dagsplanlegger for fristpåminnelser ═══════════════════════
// Kjører i Next.js-serverprosessen (via instrumentation.js). BEVISST uten node-
// only-avhengigheter (mongodb/@sendgrid) — de kan ikke bundles inn i
// instrumentation-bygget. Planleggeren gjør kun (1) en tidssjekk (ren JS) og
// (2) et internt HTTP-kall til /api/cron/reminders?daily=1, som håndterer den
// atomiske dagslåsen og selve utsendingen i API-serverbundelen der SendGrid/
// Mongo fungerer normalt.
const SEND_HOUR = Math.max(0, Math.min(23, parseInt(process.env.REMINDER_HOUR || '7', 10) || 7));
const INTERVAL_MS = 30 * 60 * 1000; // 30 min

function osloHour() {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
  return parseInt(h, 10) || 0;
}

async function tick() {
  try {
    if (osloHour() < SEND_HOUR) return; // for tidlig på dagen
    const port = process.env.PORT || 3000;
    const secret = (process.env.CRON_SECRET || '').trim();
    const key = (process.env.ADMIN_KEY || '').trim();
    // Legitimasjon KUN i header (aldri i URL — holder nøkkelen ute av logger).
    const url = `http://127.0.0.1:${port}/api/cron/reminders?daily=1`;
    const headers = {};
    if (secret) headers['x-cron-secret'] = secret;
    else if (key) headers['x-admin-key'] = key;
    const r = await fetch(url, { method: 'POST', headers });
    const j = await r.json().catch(() => ({}));
    if (j && j.ran !== false) {
      // eslint-disable-next-line no-console
      console.log('[fristpåminnelser] kjørt:', JSON.stringify(j));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[fristpåminnelser] feil i tick:', e && e.message);
  }
}

export function startReminderScheduler() {
  if (global.__reminderSchedulerStarted) return;
  global.__reminderSchedulerStarted = true;
  // eslint-disable-next-line no-console
  console.log(`[fristpåminnelser] planlegger startet (sender fra kl. ${String(SEND_HOUR).padStart(2, '0')}:00 Oslo, sjekk hvert ${INTERVAL_MS / 60000}. min)`);
  // Første sjekk kort tid etter oppstart (fanger opp servere som starter etter SEND_HOUR).
  setTimeout(tick, 20 * 1000);
  setInterval(tick, INTERVAL_MS);
  // Signeringspolling (Posten): hvert 2. min. Endepunktet gjør selv ingenting
  // hvis ingen aktive jobber, og respekterer Postens X-Next-permitted-poll-time.
  setTimeout(signeringTick, 30 * 1000);
  setInterval(signeringTick, 2 * 60 * 1000);
}

async function signeringTick() {
  try {
    const port = process.env.PORT || 3000;
    const secret = (process.env.CRON_SECRET || '').trim();
    const key = (process.env.ADMIN_KEY || '').trim();
    if (!secret && !key) return;
    // Legitimasjon KUN i header (aldri i URL)
    const headers = {};
    if (secret) headers['x-cron-secret'] = secret;
    else headers['x-admin-key'] = key;
    const r = await fetch(`http://127.0.0.1:${port}/api/cron/signering`, { method: 'POST', headers });
    const j = await r.json().catch(() => ({}));
    if (j && j.hendelser) {
      // eslint-disable-next-line no-console
      console.log('[signering] statusendringer behandlet:', j.hendelser);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[signering] feil i tick:', e && e.message);
  }
}
