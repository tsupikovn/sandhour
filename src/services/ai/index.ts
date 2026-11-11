import { sendToGemini, generateGeminiJson, type GeminiTurn } from './providers/gemini';
import { chatOpenAI, jsonOpenAI, OPENAI_BASE_URL, type OpenAITarget } from './providers/openaiCompatible';
import { chatAnthropic, jsonAnthropic } from './providers/anthropic';
import { buildAIContext, buildSystemPrompt } from './contextBuilder';
import { activeConfig, isConfigured, PROVIDERS, type AISettings, type ChatMessage } from '@/types/ai';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

function openAITarget(settings: AISettings): OpenAITarget {
  const cfg = activeConfig(settings);
  return {
    baseUrl: settings.provider === 'custom' ? (cfg.baseUrl ?? '') : OPENAI_BASE_URL,
    apiKey: cfg.apiKey,
    model: cfg.model.trim(),
    label: settings.provider === 'custom' ? 'provider' : PROVIDERS.openai.label,
  };
}

function assertConfigured(settings: AISettings): void {
  if (!isConfigured(settings)) {
    throw new Error('No AI provider is set up. Add a key and a model in the assistant settings.');
  }
}

/** Free-form completion with a system prompt, on whichever provider is selected. */
async function complete(settings: AISettings, system: string, turns: Turn[]): Promise<string> {
  assertConfigured(settings);
  const cfg = activeConfig(settings);

  switch (settings.provider) {
    case 'gemini': {
      const history: GeminiTurn[] = turns.map((t) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        text: t.text,
      }));
      return sendToGemini(history, system, cfg.apiKey.trim(), cfg.model.trim());
    }
    case 'anthropic':
      return chatAnthropic(
        cfg.apiKey,
        cfg.model.trim(),
        turns.map((t) => ({ role: t.role, content: t.text })),
        system
      );
    case 'openai':
    case 'custom':
      return chatOpenAI(openAITarget(settings), [
        { role: 'system', content: system },
        ...turns.map((t) => ({ role: t.role, content: t.text })),
      ]);
  }
}

/** Ask the selected provider for a JSON object and parse it. */
export async function completeJson<T = unknown>(settings: AISettings, prompt: string): Promise<T> {
  assertConfigured(settings);
  const cfg = activeConfig(settings);

  switch (settings.provider) {
    case 'gemini':
      return generateGeminiJson<T>(prompt, cfg.apiKey.trim(), cfg.model.trim());
    case 'anthropic':
      return jsonAnthropic<T>(cfg.apiKey, cfg.model.trim(), prompt);
    case 'openai':
    case 'custom':
      return jsonOpenAI<T>(openAITarget(settings), prompt);
  }
}

/** Send the conversation to the configured provider and return the reply text. */
export async function sendChat(messages: ChatMessage[], settings: AISettings): Promise<string> {
  const ctx = await buildAIContext(settings.permissions);
  const systemPrompt = buildSystemPrompt(ctx);

  const turns: Turn[] = messages
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role, text: m.content }));

  return complete(settings, systemPrompt, turns);
}
