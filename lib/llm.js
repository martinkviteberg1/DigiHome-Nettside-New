// Lettvekts LLM-klient med leverandørkjede (OpenAI-kompatibelt API-format).
//
// PRIMÆR:   Egen OpenAI-nøkkel (OPENAI_API_KEY) mot api.openai.com
//           → eksakt fakturering i OpenAI-dashbordet, ingen mellomledd.
// FALLBACK: Emergent LLM-gateway (EMERGENT_LLM_KEY)
//           → null nedetid hvis egen nøkkel feiler (kvote, 401, nedetid).
//
// Self-metering: hvert vellykkede kall logges i llm_usage med tokens,
// estimert pris OG hvilken leverandør som svarte (provider).
import { getDb } from '@/lib/mongodb';
import { logLlmUsage } from '@/lib/llm-usage';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function providerChain() {
  const chain = [];
  if (process.env.OPENAI_API_KEY) {
    chain.push({ name: 'openai', url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY });
  }
  if (process.env.EMERGENT_LLM_KEY) {
    chain.push({ name: 'emergent', url: 'https://integrations.emergentagent.com/llm/v1/chat/completions', key: process.env.EMERGENT_LLM_KEY });
  }
  return chain;
}

export async function chatLLM({ messages, model = 'gpt-4o-mini', temperature = 0.3, maxTokens = 700, retries = 4, feature = 'general' }) {
  const chain = providerChain();
  if (!chain.length) throw new Error('Ingen LLM-nøkkel konfigurert (OPENAI_API_KEY / EMERGENT_LLM_KEY)');

  const backoff = [300, 600, 1200, 2000];
  let lastErr;
  for (const prov of chain) {
    // Maks 2 forsøk per leverandør før vi går videre i kjeden (retries fordeles).
    const provTries = Math.max(1, Math.min(2, retries));
    for (let attempt = 0; attempt < provTries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      try {
        const res = await fetch(prov.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${prov.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
          if (content) {
            // Self-metering: logg tokenforbruk (fire-and-forget, feiler stille).
            if (data.usage) {
              getDb().then((db) => logLlmUsage(db, { model, feature, usage: data.usage, provider: prov.name })).catch(() => {});
            }
            return content;
          }
          lastErr = new Error(`Tomt LLM-svar (${prov.name})`);
        } else {
          const t = await res.text().catch(() => '');
          lastErr = new Error(`LLM ${prov.name} ${res.status}: ${t.slice(0, 160)}`);
          // 4xx (utenom 408/429) på denne leverandøren → hopp rett til neste
          // i kjeden (feil nøkkel/kvote løses ikke av retry mot samme).
          if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) break;
        }
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
      }
      if (attempt < provTries - 1) {
        const base = backoff[Math.min(attempt, backoff.length - 1)];
        await sleep(base + Math.floor(Math.random() * 200)); // jitter
      }
    }
  }
  console.error('[chatLLM] alle leverandører feilet:', lastErr && lastErr.message);
  throw lastErr || new Error('LLM utilgjengelig');
}
