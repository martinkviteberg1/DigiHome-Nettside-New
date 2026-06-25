// Lettvekts-klient mot Emergent LLM-gateway (OpenAI-kompatibel).
// Brukes server-side for AI-innsiktslaget. Nøkkel: EMERGENT_LLM_KEY.

const LLM_URL = 'https://integrations.emergentagent.com/llm/v1/chat/completions';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function chatLLM({ messages, model = 'gpt-4o-mini', temperature = 0.3, maxTokens = 700, retries = 4 }) {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) throw new Error('EMERGENT_LLM_KEY mangler');

  const backoff = [300, 600, 1200, 2000];
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(LLM_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (content) return content;
        lastErr = new Error('Tomt LLM-svar');
      } else {
        const t = await res.text().catch(() => '');
        lastErr = new Error(`LLM ${res.status}: ${t.slice(0, 160)}`);
        // 4xx (utenom 408/429) er ikke verdt å prøve på nytt
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw lastErr;
      }
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
    }
    if (attempt < retries) {
      const base = backoff[Math.min(attempt, backoff.length - 1)];
      await sleep(base + Math.floor(Math.random() * 200)); // jitter
    }
  }
  console.error('[chatLLM] feilet etter retries:', lastErr && lastErr.message);
  throw lastErr || new Error('LLM utilgjengelig');
}
