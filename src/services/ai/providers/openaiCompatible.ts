import { extractJson } from '@/utils/json';
import { postJson, throwForStatus } from './http';

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAITarget {
  /** API root without a trailing slash, e.g. `https://api.openai.com/v1`. */
  baseUrl: string;
  apiKey: string;
  model: string;
  label: string;
}

function endpoint(baseUrl: string): string {
  return `${baseUrl.trim().replace(/\/+$/, '')}/chat/completions`;
}

function authHeaders(apiKey: string): Record<string, string> {
  // A local model (Ollama, LM Studio) has no key — send no Authorization at all.
  return apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {};
}

function replyText(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  // Some servers return an array of content parts.
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim();
  }
  return '';
}

/**
 * Sampling and token-limit parameters are deliberately left out: their names and
 * allowed values differ between models and servers (`max_tokens` vs
 * `max_completion_tokens`, fixed temperature on reasoning models), and a request
 * with only `model` and `messages` is accepted everywhere.
 */
export async function chatOpenAI(target: OpenAITarget, messages: OpenAIMessage[]): Promise<string> {
  const reply = await postJson(endpoint(target.baseUrl), authHeaders(target.apiKey), {
    model: target.model,
    messages,
  });
  if (!reply.ok) throwForStatus(reply, target.label);
  const text = replyText(reply.data);
  if (!text) throw new Error('The model returned an empty reply.');
  return text;
}

/** Ask for a JSON object. Falls back to a plain request if JSON mode is refused. */
export async function jsonOpenAI<T = unknown>(target: OpenAITarget, prompt: string): Promise<T> {
  const messages: OpenAIMessage[] = [{ role: 'user', content: prompt }];
  const url = endpoint(target.baseUrl);
  const headers = authHeaders(target.apiKey);

  let reply = await postJson(url, headers, {
    model: target.model,
    messages,
    response_format: { type: 'json_object' },
  });
  if (reply.status === 400) {
    // Not every compatible server implements `response_format`.
    reply = await postJson(url, headers, { model: target.model, messages });
  }
  if (!reply.ok) throwForStatus(reply, target.label);

  const text = replyText(reply.data);
  if (!text) throw new Error('The model returned an empty reply.');
  return extractJson<T>(text);
}
