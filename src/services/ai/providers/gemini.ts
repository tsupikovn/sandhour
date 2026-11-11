import { extractJson } from '@/utils/json';

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface GeminiTurn {
  role: 'user' | 'model';
  text: string;
}

/** Shared POST + error handling. Returns the raw parsed JSON response. */
async function call(body: unknown, apiKey: string, model: string): Promise<any> {
  const res = await fetch(ENDPOINT(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new Error('Rate limit reached. Wait a minute and try again.');
  }
  if (res.status === 400 || res.status === 403) {
    throw new Error('The API key was rejected. Check it in the settings.');
  }
  if (res.status === 404) {
    throw new Error('Model not found. Check the model name in the settings.');
  }
  if (!res.ok) {
    throw new Error(`Gemini error (${res.status}). Try again.`);
  }

  const data = await res.json();
  if (data?.promptFeedback?.blockReason) {
    throw new Error('The request was blocked by safety filters.');
  }
  return data;
}

function extractText(data: any): string {
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? '').join('').trim();
}

/** Free-form chat completion. */
export async function sendToGemini(
  history: GeminiTurn[],
  systemPrompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const data = await call(
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    },
    apiKey,
    model
  );
  const text = extractText(data);
  if (!text) throw new Error('The model returned an empty reply.');
  return text;
}

/** Structured completion — asks the model for JSON and parses it. */
export async function generateGeminiJson<T = unknown>(
  prompt: string,
  apiKey: string,
  model: string
): Promise<T> {
  const data = await call(
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
        temperature: 0.9,
      },
    },
    apiKey,
    model
  );
  return extractJson<T>(extractText(data));
}
