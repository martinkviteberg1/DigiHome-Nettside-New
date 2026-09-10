// PowerOffice Go v2 — regnskapsintegrasjon (les-only), FLERSELSKAP.
// App-nøkkel + abonnementsnøkkel hører til integrasjonen (delt, i .env).
// Klientnøkkelen er UNIK per selskap (DigiHome AS, DigiHome Tech AS, …) og lagres
// i databasen — hvert selskap har sitt eget regnskap. Alle funksjoner tar en
// kontekst { clientKey, env } så vi kan hente riktig selskaps tall.
//
// Auth: OAuth2 client-credentials. Basic base64(ApplicationKey:ClientKey) + Ocp-Apim-Subscription-Key
// → bearer-token (~20 min, ingen refresh). Token caches i minnet per klientnøkkel.
// Nøkler forlater aldri serveren.

const APP_KEY = process.env.POWEROFFICE_APP_KEY || '';
const SUB_KEY = process.env.POWEROFFICE_SUBSCRIPTION_KEY || '';
export const PO_DEFAULT_ENV = (process.env.POWEROFFICE_ENV || 'demo').toLowerCase();
export const PO_BOOTSTRAP_CLIENT_KEY = process.env.POWEROFFICE_CLIENT_KEY || '';

function erProd(env) { return env === 'production' || env === 'prod'; }

// App- og abonnementsnøkkel velges ETTER selskapets miljø (demo/prod har hvert sitt par).
// Faller tilbake til de generiske nøklene (bakoverkompatibelt) om miljø-spesifikke mangler.
function creds(env) {
  const prod = erProd(env);
  const app = (prod ? process.env.POWEROFFICE_APP_KEY_PROD : process.env.POWEROFFICE_APP_KEY_DEMO) || APP_KEY;
  const sub = (prod ? process.env.POWEROFFICE_SUBSCRIPTION_KEY_PROD : process.env.POWEROFFICE_SUBSCRIPTION_KEY_DEMO) || SUB_KEY;
  return { app, sub };
}

function urls(env) {
  const prod = erProd(env);
  return {
    auth: prod ? 'https://goapi.poweroffice.net/OAuth/Token' : 'https://goapi.poweroffice.net/Demo/OAuth/Token',
    base: prod ? 'https://goapi.poweroffice.net/v2' : 'https://goapi.poweroffice.net/demo/v2',
  };
}

// Er integrasjonsnøklene til stede for (minst) ett miljø? (valgfritt: sjekk et bestemt miljø)
export function poFellesKonfigurert(env) {
  if (env) { const c = creds(env); return Boolean(c.app && c.sub); }
  const d = creds('demo'); const p = creds('production');
  return Boolean((d.app && d.sub) || (p.app && p.sub));
}

function normCtx(ctx = {}) {
  return {
    clientKey: ctx.clientKey || '',
    env: (ctx.env || PO_DEFAULT_ENV).toLowerCase(),
  };
}

// ── Token-cache per klientnøkkel ────────────────────────────────────────────
const _tokenCache = new Map(); // `${env}::${clientKey}` -> { token, utlop }

async function hentToken(ctx) {
  const { clientKey, env } = normCtx(ctx);
  const { app, sub } = creds(env);
  if (!app || !sub) throw new Error(`PowerOffice er ikke konfigurert for ${erProd(env) ? 'produksjon' : 'demo'} (mangler app-/abonnementsnøkkel)`);
  if (!clientKey) throw new Error('Mangler klientnøkkel for selskapet');
  const key = `${env}::${clientKey}`;
  const cached = _tokenCache.get(key);
  if (cached && Date.now() < cached.utlop - 60_000) return cached.token;
  const basic = Buffer.from(`${app}:${clientKey}`).toString('base64');
  const r = await fetch(urls(env).auth, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': sub,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`PowerOffice token-feil ${r.status}: ${t.slice(0, 280)}`);
  }
  const d = await r.json();
  _tokenCache.set(key, { token: d.access_token, utlop: Date.now() + (Number(d.expires_in || 1200) * 1000) });
  return d.access_token;
}

async function poFetch(path, params, ctx) {
  const { env } = normCtx(ctx);
  const { sub } = creds(env);
  const token = await hentToken(ctx);
  const url = new URL(`${urls(env).base}${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': sub,
      'User-Agent': 'digihome-admin/1.0',
    },
    cache: 'no-store',
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const e = new Error(`PowerOffice ${path} ${r.status}: ${t.slice(0, 280)}`);
    e.status = r.status;
    throw e;
  }
  const data = await r.json();
  return Array.isArray(data) ? data : (data.items || data.value || data);
}

async function poFetchAlle(path, params, ctx) {
  const rader = [];
  let side = 1;
  const sideStorrelse = 5000;
  for (let i = 0; i < 40; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const batch = await poFetch(path, { ...(params || {}), PageNumber: side, PageSize: sideStorrelse }, ctx);
    const arr = Array.isArray(batch) ? batch : [];
    rader.push(...arr);
    if (arr.length < sideStorrelse) break;
    side += 1;
  }
  return rader;
}

// ── Kontoplan-cache per klientnøkkel (10 min) ───────────────────────────────
const _kontoCache = new Map(); // clientKey -> { tid, kart }

async function hentKontoKart(ctx) {
  const { clientKey } = normCtx(ctx);
  const cached = _kontoCache.get(clientKey);
  if (cached && Date.now() - cached.tid < 10 * 60_000) return cached.kart;
  const kontoer = await poFetchAlle('/GeneralLedgerAccounts', {}, ctx);
  const kart = new Map();
  for (const k of kontoer) kart.set(Number(k.AccountNo), { navn: k.Name, type: k.GeneralLedgerAccountType });
  _kontoCache.set(clientKey, { tid: Date.now(), kart });
  return kart;
}

const RESULTAT_TYPER = new Set(['Income', 'Expense']);
const MND_NAVN = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

// ── Klientstatus / tilkobling ───────────────────────────────────────────────
export async function poKlientInfo(ctx) {
  const info = await poFetch('/ClientIntegrationInformation', {}, ctx);
  return {
    klientId: info.ClientId || null,
    klientNavn: info.ClientName || null,
    abonnementer: info.ActiveClientSubscriptions || [],
    gyldigePrivilegier: (info.ValidPrivileges || []).length,
    manglendePrivilegier: info.InvalidPrivileges || [],
    lesetilgangHovedbok: (info.ValidPrivileges || []).some((p) => /AccountTransaction|GeneralLedgerAccount|TrialBalance/.test(p)),
  };
}

// ── Resultat (P&L) for et kalenderår, per måned + per konto ──────────────────
const _resCache = new Map(); // `${clientKey}::${ar}` -> { tid, data }

export async function poResultat({ ar }, ctx) {
  const { clientKey } = normCtx(ctx);
  const aarNr = Number(ar) || new Date().getFullYear();
  const ck = `${clientKey}::${aarNr}`;
  const cached = _resCache.get(ck);
  if (cached && Date.now() - cached.tid < 3 * 60_000) return cached.data;

  const kontoKart = await hentKontoKart(ctx);
  const trans = await poFetchAlle('/AccountTransactions', { fromDate: `${aarNr}-01-01`, toDate: `${aarNr}-12-31` }, ctx);

  const maaneder = MND_NAVN.map((navn, i) => ({ mnd: i + 1, navn, inntekt: 0, kostnad: 0, resultat: 0 }));
  const inntektPerKonto = new Map();
  const kostnadPerKonto = new Map();
  let antall = 0;

  for (const t of trans) {
    const kontonr = Number(t.AccountNo);
    const meta = kontoKart.get(kontonr);
    const type = meta ? meta.type : null;
    if (!RESULTAT_TYPER.has(type)) continue;
    const belop = Number(t.Amount) || 0;
    const mIdx = Number(String(t.PostingDate || '').slice(5, 7)) - 1;
    if (mIdx < 0 || mIdx > 11) continue;
    antall += 1;
    if (type === 'Income') {
      const inntekt = -belop;
      maaneder[mIdx].inntekt += inntekt;
      inntektPerKonto.set(kontonr, (inntektPerKonto.get(kontonr) || 0) + inntekt);
    } else {
      maaneder[mIdx].kostnad += belop;
      kostnadPerKonto.set(kontonr, (kostnadPerKonto.get(kontonr) || 0) + belop);
    }
  }

  let sumInntekt = 0;
  let sumKostnad = 0;
  for (const m of maaneder) {
    m.inntekt = Math.round(m.inntekt);
    m.kostnad = Math.round(m.kostnad);
    m.resultat = m.inntekt - m.kostnad;
    sumInntekt += m.inntekt;
    sumKostnad += m.kostnad;
  }

  const tilListe = (map) => Array.from(map.entries())
    .map(([kontonr, belop]) => ({ kontonr, navn: (kontoKart.get(kontonr) || {}).navn || `Konto ${kontonr}`, belop: Math.round(belop) }))
    .filter((x) => Math.abs(x.belop) >= 1)
    .sort((a, b) => Math.abs(b.belop) - Math.abs(a.belop));

  const data = {
    ok: true,
    ar: aarNr,
    valuta: 'NOK',
    maaneder,
    sum: { inntekt: Math.round(sumInntekt), kostnad: Math.round(sumKostnad), resultat: Math.round(sumInntekt - sumKostnad) },
    inntektKontoer: tilListe(inntektPerKonto),
    kostnadKontoer: tilListe(kostnadPerKonto),
    antallTransaksjoner: antall,
    hentet: new Date().toISOString(),
  };
  _resCache.set(ck, { tid: Date.now(), data });
  return data;
}

// ── Saldobalanse (balanse) per dato, gruppert ────────────────────────────────
export async function poSaldobalanse({ dato }, ctx) {
  const d = dato || `${new Date().getFullYear()}-12-31`;
  const kontoKart = await hentKontoKart(ctx);
  const rader = await poFetchAlle('/TrialBalance', { date: d }, ctx);
  const grupper = {
    eiendeler: { navn: 'Eiendeler', sum: 0, kontoer: [] },
    egenkapital: { navn: 'Egenkapital', sum: 0, kontoer: [] },
    gjeld: { navn: 'Gjeld', sum: 0, kontoer: [] },
  };
  for (const r of rader) {
    const kontonr = Number(r.AccountNo);
    const meta = kontoKart.get(kontonr);
    const type = meta ? meta.type : null;
    const saldo = Number(r.Balance) || 0;
    if (Math.abs(saldo) < 1) continue;
    let g = null;
    if (type === 'Asset') g = grupper.eiendeler;
    else if (type === 'Equity') g = grupper.egenkapital;
    else if (type === 'Liability') g = grupper.gjeld;
    else continue;
    const visSaldo = type === 'Asset' ? saldo : -saldo;
    g.sum += visSaldo;
    g.kontoer.push({ kontonr, navn: r.AccountName || (meta || {}).navn || `Konto ${kontonr}`, saldo: Math.round(visSaldo) });
  }
  for (const key of Object.keys(grupper)) {
    grupper[key].sum = Math.round(grupper[key].sum);
    grupper[key].kontoer.sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
  }
  return {
    ok: true,
    dato: d,
    valuta: 'NOK',
    grupper,
    balansesjekk: Math.round(grupper.eiendeler.sum - grupper.egenkapital.sum - grupper.gjeld.sum),
    hentet: new Date().toISOString(),
  };
}
