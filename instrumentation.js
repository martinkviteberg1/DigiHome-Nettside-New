// Next.js instrumentation — kjøres ÉN gang når serverprosessen starter.
// Vi starter dagsplanleggeren for fristpåminnelser her (kun i Node-runtime,
// aldri i edge/build). Se lib/reminder-scheduler.js.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { startReminderScheduler } = await import('./lib/reminder-scheduler');
    startReminderScheduler();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[instrumentation] kunne ikke starte fristpåminnelser:', e && e.message);
  }
}
