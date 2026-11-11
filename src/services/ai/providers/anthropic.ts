import { extractJson } from '@/utils/json';
import { postJson, throwForStatus } from './http';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const LABEL = 'Anthropic';

export interface AnthropicTurn {
  role: 'user' | 'assistant';
  content: string;
}

function headers(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey.trim(),
    'anthropic-version': '2023-06-01',
    // The request carries the app's Origin; Anthropic requires this opt-in for
    // calls made directly from a client application.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

function replyText(data: any): string {
  const blocks: { type?: string; text?: string }[] = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();
}

async function call(
  apiKey: string,
  model: string,
  turns: AnthropicTurn[],
  system?: string
): Promise<string> {
  const reply = await postJson(ENDPOINT, headers(apiKey), {
    model,
    max_tokens: 2048,
    ...(system ? { system } : {}),
    messages: turns,
  });
  if (!reply.ok) throwForStatus(reply, LABEL);
  const text = replyText(reply.data);
  if (!text) throw new Error('The model returned an empty reply.');
  return text;
}

export function chatAnthropic(
  apiKey: string,
  model: string,
  turns: AnthropicTurn[],
  system: string
): Promise<string> {
  return call(apiKey, model, turns, system);
}

export async function jsonAnthropic<T = unknown>(
  apiKey: string,
  model: string,
  prompt: string
): Promise<T> {
  return extractJson<T>(await call(apiKey, model, [{ role: 'user', content: prompt }]));
}
