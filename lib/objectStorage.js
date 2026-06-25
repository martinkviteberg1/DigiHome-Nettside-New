/**
 * Emergent managed object storage — deploy-safe media delivery.
 *
 * Next.js `output: 'standalone'` kopierer IKKE `/public`-mappen inn i
 * produksjonsbygget, så statiske bilder/videoer 404-er på deployet versjon.
 * Vi laster derfor alle mediefiler opp til Emergent sin objektlagring og
 * serverer dem tilbake via backend (`/api/media/...`). Samme mønster som
 * hovedplattformen (digihome) bruker for signerte PDF-er.
 *
 * Auth: init med EMERGENT_LLM_KEY → får en session-scoped storage_key som
 * gjenbrukes. 403 ⇒ nøkkel er utløpt, vi re-initialiserer og prøver én gang til.
 */

const STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage';
export const APP_NAME = 'digihome';
export const PUBLIC_PREFIX = `${APP_NAME}/public`;

let _storageKey = null;

async function initStorage() {
  if (_storageKey) return _storageKey;
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) throw new Error('EMERGENT_LLM_KEY mangler — kan ikke initialisere objektlagring');
  const resp = await fetch(`${STORAGE_URL}/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emergent_key: key }),
  });
  if (!resp.ok) throw new Error(`Objektlagring init feilet: ${resp.status}`);
  const data = await resp.json();
  _storageKey = data.storage_key;
  return _storageKey;
}

function resetKey() {
  _storageKey = null;
}

/** Last opp bytes til objektlagring. Retry én gang ved utløpt nøkkel (403). */
export async function putObject(path, body, contentType) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = await initStorage();
    const resp = await fetch(`${STORAGE_URL}/objects/${path}`, {
      method: 'PUT',
      headers: { 'X-Storage-Key': key, 'Content-Type': contentType || 'application/octet-stream' },
      body,
    });
    if (resp.status === 403 && attempt === 0) {
      resetKey();
      continue;
    }
    if (!resp.ok) throw new Error(`putObject feilet: ${resp.status}`);
    return resp.json();
  }
  throw new Error('putObject feilet etter retry');
}

/**
 * Hent bytes fra objektlagring. Returnerer { buffer, contentType } eller
 * null om filen ikke finnes (404). Retry én gang ved utløpt nøkkel (403).
 */
export async function getObject(path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = await initStorage();
    const resp = await fetch(`${STORAGE_URL}/objects/${path}`, {
      headers: { 'X-Storage-Key': key },
    });
    if (resp.status === 403 && attempt === 0) {
      resetKey();
      continue;
    }
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`getObject feilet: ${resp.status}`);
    const arr = await resp.arrayBuffer();
    return {
      buffer: Buffer.from(arr),
      contentType: resp.headers.get('Content-Type') || 'application/octet-stream',
    };
  }
  throw new Error('getObject feilet etter retry');
}
