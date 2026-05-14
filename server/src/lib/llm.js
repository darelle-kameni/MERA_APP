// Wrapper LLM multi-provider avec auto-fallback.
//
// Ordre de priorité (configurable via LLM_PROVIDER) :
//   1. Groq        (recommandé, free tier ~14400 req/jour, latence ~200ms)
//   2. Gemini      (fallback, free tier 1500 req/jour)
//   3. Anthropic   (si clé fournie)
//   4. Mock        (toujours dispo, réponses scénarisées — zéro clé requise)
//
// Usage:
//   const text = await llmInvoke({ system, prompt, max_tokens, json });
//   // json:true → parse la réponse en JSON (retry si parse échoue)

const PROVIDER_ORDER = ['groq', 'gemini', 'anthropic', 'mock'];

const MODELS = {
  groq:      process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile',
  gemini:    process.env.GEMINI_MODEL    || 'gemini-1.5-flash',
  anthropic: process.env.ANTHROPIC_MODEL || 'claude-opus-4-7',
};

const isAvailable = {
  groq:      () => !!process.env.GROQ_API_KEY,
  gemini:    () => !!process.env.GEMINI_API_KEY,
  anthropic: () => !!process.env.ANTHROPIC_API_KEY,
  mock:      () => true,
};

// ─── Groq (compatible OpenAI) ─────────────────────────────────
const callGroq = async ({ system, prompt, max_tokens = 1024, json }) => {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const body = {
    model: MODELS.groq,
    messages,
    max_tokens,
    temperature: 0.3,
  };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`groq ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
};

// ─── Gemini (Google AI Studio) ────────────────────────────────
const callGemini = async ({ system, prompt, max_tokens = 1024, json }) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: max_tokens, temperature: 0.3 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (json) body.generationConfig.responseMimeType = 'application/json';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
};

// ─── Anthropic Claude ─────────────────────────────────────────
const callAnthropic = async ({ system, prompt, max_tokens = 1024 }) => {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: MODELS.anthropic,
    max_tokens,
    thinking: { type: 'disabled' },
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
};

// ─── Mock (réponses scénarisées pour démo offline) ────────────
const MOCK_RESPONSES = {
  chat: [
    "D'accord, je vais analyser votre situation. Pouvez-vous me dire depuis combien de temps vous ressentez ces symptômes ?",
    "Merci pour ces informations. Avez-vous remarqué d'autres signes comme de la fièvre, des maux de tête ou de la fatigue ?",
    "Je vous recommande de consulter rapidement un médecin si les symptômes persistent au-delà de 48h. En attendant, reposez-vous et hydratez-vous bien.",
    "Sur la base de vos réponses, il pourrait s'agir d'une infection bénigne. Mais seul un examen clinique permettra de confirmer. Souhaitez-vous que je vous mette en contact avec un soignant ?",
  ],
  predict: () => JSON.stringify({
    urgency_level: 'MODERE',
    systemic_predictions: [
      { disease: 'Infection respiratoire bénigne', probability: 65, severity: 'modere', trigger_factors: 'Climat humide, contact avec personnes malades' },
      { disease: 'Déshydratation légère', probability: 42, severity: 'faible', trigger_factors: 'Hydratation insuffisante' },
      { disease: 'Fatigue chronique', probability: 28, severity: 'faible', trigger_factors: 'Manque de sommeil' },
    ],
    recommendations: 'Consultation médicale conseillée sous 48h si fièvre persiste. Hydratation +2L/j, repos. Surveiller apparition de nouveaux symptômes.',
  }),
};

let mockChatIndex = 0;
const callMock = async ({ prompt, json }) => {
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 500)); // simule latence
  if (json) return MOCK_RESPONSES.predict();
  // Pour les chats, tourner sur les réponses mock
  const reply = MOCK_RESPONSES.chat[mockChatIndex % MOCK_RESPONSES.chat.length];
  mockChatIndex++;
  return reply;
};

const CALLERS = { groq: callGroq, gemini: callGemini, anthropic: callAnthropic, mock: callMock };

// ─── API publique ─────────────────────────────────────────────
export const llmInvoke = async ({ system, prompt, max_tokens, json } = {}) => {
  if (!prompt || typeof prompt !== 'string') throw new Error('prompt_required');

  const preferred = process.env.LLM_PROVIDER;
  const order = preferred && PROVIDER_ORDER.includes(preferred)
    ? [preferred, ...PROVIDER_ORDER.filter((p) => p !== preferred)]
    : PROVIDER_ORDER;

  let lastError = null;
  for (const provider of order) {
    if (!isAvailable[provider]()) continue;
    try {
      const text = await CALLERS[provider]({ system, prompt, max_tokens, json });
      return { text, provider, model: MODELS[provider] || 'mock' };
    } catch (err) {
      console.warn(`[llm] ${provider} failed: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError || new Error('no_llm_provider_available');
};

// Helper : invoque le LLM et parse la réponse JSON (retry une fois si parse échoue)
export const llmInvokeJSON = async ({ system, prompt, max_tokens } = {}) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, provider, model } = await llmInvoke({
      system: (system ? system + '\n\n' : '') + 'Réponds UNIQUEMENT en JSON valide sans markdown ni texte autour.',
      prompt,
      max_tokens,
      json: true,
    });
    try {
      // Robust JSON extraction : retire d'éventuels fences ``` autour
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      return { data: JSON.parse(cleaned), provider, model };
    } catch (err) {
      if (attempt === 1) throw new Error(`json_parse_failed: ${err.message} | content=${text.slice(0, 200)}`);
    }
  }
};

export const availableProviders = () => PROVIDER_ORDER.filter((p) => isAvailable[p]());
