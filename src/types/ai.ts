/**
 * - `gemini`    — Google AI Studio
 * - `openai`    — OpenAI
 * - `anthropic` — Anthropic (Claude)
 * - `custom`    — any OpenAI-compatible endpoint (OpenRouter, Groq, DeepSeek,
 *                 Mistral, a local Ollama / LM Studio, …) at a user-given URL
 */
export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'custom';
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  error?: boolean;
}

/** Which of the user's data the assistant may be shown. */
export interface AIPermissions {
  tasks: boolean;
  attic: boolean;
}

/** Credentials are kept per provider, so switching never loses a key. */
export interface ProviderConfig {
  apiKey: string;
  model: string;
  /** Only used by `custom`: the API root, e.g. `https://openrouter.ai/api/v1`. */
  baseUrl?: string;
}

export interface AISettings {
  provider: AIProvider;
  providers: Record<AIProvider, ProviderConfig>;
  permissions: AIPermissions;
}

export interface ProviderMeta {
  label: string;
  /** Suggested model ids; the field stays free-text. */
  models: string[];
  keyHint: string;
  keyUrl?: string;
}

export const PROVIDERS: Record<AIProvider, ProviderMeta> = {
  gemini: {
    label: 'Google Gemini',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    keyHint: 'Google AI Studio key',
    keyUrl: 'aistudio.google.com/app/apikey',
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-5-mini', 'gpt-5', 'gpt-4o-mini'],
    keyHint: 'OpenAI key (sk-…)',
    keyUrl: 'platform.openai.com/api-keys',
  },
  anthropic: {
    label: 'Anthropic Claude',
    models: ['claude-sonnet-5', 'claude-haiku-4-5-20251001', 'claude-opus-5'],
    keyHint: 'Anthropic key (sk-ant-…)',
    keyUrl: 'console.anthropic.com/settings/keys',
  },
  custom: {
    label: 'Other (OpenAI-compatible)',
    models: [],
    keyHint: 'API key, if the service needs one',
  },
};

export const PROVIDER_ORDER: AIProvider[] = ['gemini', 'openai', 'anthropic', 'custom'];

/** Quick-fill endpoints for the `custom` provider. */
export const CUSTOM_PRESETS: { label: string; baseUrl: string }[] = [
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1' },
  { label: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1' },
];

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  providers: {
    gemini: { apiKey: '', model: 'gemini-2.5-flash' },
    openai: { apiKey: '', model: 'gpt-5-mini' },
    anthropic: { apiKey: '', model: 'claude-sonnet-5' },
    custom: { apiKey: '', model: '', baseUrl: '' },
  },
  permissions: { tasks: true, attic: true },
};

/** The config of the currently selected provider. */
export function activeConfig(settings: AISettings): ProviderConfig {
  return settings.providers[settings.provider];
}

/**
 * Whether the selected provider can be called. A custom endpoint may be a local
 * model with no key at all, so there it is the URL and model that matter.
 */
export function isConfigured(settings: AISettings): boolean {
  const cfg = activeConfig(settings);
  if (settings.provider === 'custom') return Boolean(cfg.baseUrl?.trim() && cfg.model.trim());
  return Boolean(cfg.apiKey.trim() && cfg.model.trim());
}

/**
 * Turn whatever JSON is stored in the DB into a complete, valid settings object:
 * unknown providers fall back to the default, missing fields get defaults, and
 * anything of the wrong type is ignored.
 */
export function normalizeAISettings(raw: unknown): AISettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: AISettings = {
    provider: DEFAULT_AI_SETTINGS.provider,
    providers: {
      gemini: { ...DEFAULT_AI_SETTINGS.providers.gemini },
      openai: { ...DEFAULT_AI_SETTINGS.providers.openai },
      anthropic: { ...DEFAULT_AI_SETTINGS.providers.anthropic },
      custom: { ...DEFAULT_AI_SETTINGS.providers.custom },
    },
    permissions: { ...DEFAULT_AI_SETTINGS.permissions },
  };

  const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

  const stored = src.providers;
  if (stored && typeof stored === 'object') {
    for (const id of PROVIDER_ORDER) {
      const cfg = (stored as Record<string, unknown>)[id];
      if (!cfg || typeof cfg !== 'object') continue;
      const c = cfg as Record<string, unknown>;
      out.providers[id] = {
        apiKey: str(c.apiKey) ?? out.providers[id].apiKey,
        model: str(c.model) || out.providers[id].model,
        ...(id === 'custom' ? { baseUrl: str(c.baseUrl) ?? '' } : {}),
      };
    }
  }

  const provider = str(src.provider);
  if (provider && (PROVIDER_ORDER as string[]).includes(provider)) {
    out.provider = provider as AIProvider;
  }

  if (src.permissions && typeof src.permissions === 'object') {
    const p = src.permissions as Record<string, unknown>;
    for (const key of Object.keys(out.permissions) as (keyof AIPermissions)[]) {
      if (typeof p[key] === 'boolean') out.permissions[key] = p[key] as boolean;
    }
  }

  return out;
}

export interface AIContext {
  currentDateTime: string;
  todayTasks?: { text: string; completed: boolean; priority: number; time?: string }[];
  atticSummary?: { totalCount: number };
}
