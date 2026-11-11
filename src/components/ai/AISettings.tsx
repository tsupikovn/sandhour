import { useEffect, useState } from 'react';
import { useAIStore } from '@/stores/aiStore';
import { useVocabStore } from '@/stores/vocabStore';
import {
  CUSTOM_PRESETS,
  PROVIDERS,
  PROVIDER_ORDER,
  type AIPermissions,
  type AIProvider,
  type AISettings as Settings,
  type ProviderConfig,
} from '@/types/ai';

const PERMS: { key: keyof AIPermissions; label: string }[] = [
  { key: 'tasks', label: "Today's tasks" },
  { key: 'attic', label: 'How many tasks are in the attic' },
];

const PRIVACY: Record<AIProvider, string> = {
  gemini:
    'On the free tier, Google may use your requests to improve its models. Do not send confidential data.',
  openai:
    'Requests (your messages and the data ticked above) are sent to OpenAI. Do not send confidential data.',
  anthropic:
    'Requests (your messages and the data ticked above) are sent to Anthropic. Do not send confidential data.',
  custom:
    'Requests are sent to the address you entered. Make sure you trust that service; a local model (Ollama) keeps everything on your machine.',
};

const labelClass = 'font-display text-xs tracking-widest text-dune-text-muted uppercase mb-2';
const inputClass =
  'w-full bg-transparent border-b border-dune-border-primary focus:border-dune-accent outline-none py-2 font-mono text-sm text-dune-text-primary placeholder:text-dune-text-muted transition-colors duration-300';
const chipClass = (active: boolean) =>
  `font-mono text-[11px] px-2 py-1 border transition-colors duration-300 ${
    active
      ? 'border-dune-accent text-dune-accent'
      : 'border-dune-border-primary text-dune-text-muted hover:text-dune-text-secondary'
  }`;

const cloneSettings = (s: Settings): Settings => ({
  provider: s.provider,
  providers: {
    gemini: { ...s.providers.gemini },
    openai: { ...s.providers.openai },
    anthropic: { ...s.providers.anthropic },
    custom: { ...s.providers.custom },
  },
  permissions: { ...s.permissions },
});

export const AISettings: React.FC = () => {
  const settings = useAIStore((s) => s.settings);
  const saveSettings = useAIStore((s) => s.saveSettings);
  const toggleSettings = useAIStore((s) => s.toggleSettings);

  const [draft, setDraft] = useState<Settings>(() => cloneSettings(settings));

  // The stored settings can arrive after this form mounts. Re-seed the draft
  // then, so a saved key is always shown and never overwritten by a blank field.
  // Keyed on the content, not the object: the store hands out a fresh object on
  // every reload, and an identical one must not wipe edits in progress.
  const storedSnapshot = JSON.stringify(settings);
  useEffect(() => {
    setDraft(cloneSettings(JSON.parse(storedSnapshot) as Settings));
  }, [storedSnapshot]);

  const provider = draft.provider;
  const meta = PROVIDERS[provider];
  const cfg = draft.providers[provider];

  const patchConfig = (patch: Partial<ProviderConfig>) =>
    setDraft((d) => ({
      ...d,
      providers: { ...d.providers, [d.provider]: { ...d.providers[d.provider], ...patch } },
    }));

  const save = async () => {
    const cleaned = cloneSettings(draft);
    for (const id of PROVIDER_ORDER) {
      const c = cleaned.providers[id];
      c.apiKey = c.apiKey.trim();
      c.model = c.model.trim();
      if (c.baseUrl !== undefined) c.baseUrl = c.baseUrl.trim().replace(/\/+$/, '');
    }
    await saveSettings(cleaned);
    toggleSettings(false);
    // The word-of-the-day card may have been waiting for a working provider.
    if (!useVocabStore.getState().word) void useVocabStore.getState().reload();
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div>
        <div className={labelClass}>Provider</div>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_ORDER.map((id) => (
            <button
              key={id}
              onClick={() => setDraft((d) => ({ ...d, provider: id }))}
              className={chipClass(provider === id)}
            >
              {PROVIDERS[id].label}
            </button>
          ))}
        </div>
      </div>

      {provider === 'custom' && (
        <div>
          <div className={labelClass}>API address</div>
          <input
            value={cfg.baseUrl ?? ''}
            onChange={(e) => patchConfig({ baseUrl: e.target.value })}
            placeholder="https://…/v1"
            className={inputClass}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {CUSTOM_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => patchConfig({ baseUrl: p.baseUrl })}
                className={chipClass(cfg.baseUrl === p.baseUrl)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="font-mono text-[11px] text-dune-text-muted mt-2 leading-relaxed">
            Any service with an OpenAI-compatible API works. Requests go to
            “address/chat/completions”.
          </p>
        </div>
      )}

      <div>
        <div className={labelClass}>Model</div>
        <input
          value={cfg.model}
          onChange={(e) => patchConfig({ model: e.target.value })}
          placeholder="Model name, as in the provider's docs"
          className={inputClass}
        />
        {meta.models.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {meta.models.map((m) => (
              <button key={m} onClick={() => patchConfig({ model: m })} className={chipClass(cfg.model === m)}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className={labelClass}>API key</div>
        <input
          type="password"
          value={cfg.apiKey}
          onChange={(e) => patchConfig({ apiKey: e.target.value })}
          placeholder={meta.keyHint}
          className={inputClass}
        />
        <p className="font-mono text-[11px] text-dune-text-muted mt-2 leading-relaxed">
          Keys are stored locally on this computer, one per provider.
          {meta.keyUrl && <> Get one at {meta.keyUrl}</>}
        </p>
      </div>

      <div>
        <div className={labelClass}>What the assistant can see</div>
        <div className="space-y-1">
          {PERMS.map((p) => (
            <label
              key={p.key}
              className="flex items-center gap-3 py-1.5 cursor-pointer font-body text-sm text-dune-text-secondary"
            >
              <input
                type="checkbox"
                checked={draft.permissions[p.key]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    permissions: { ...d.permissions, [p.key]: e.target.checked },
                  }))
                }
                className="accent-dune-accent"
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div className="border border-dune-warning/50 p-3">
        <div className="font-display text-[10px] tracking-widest text-dune-warning uppercase mb-1">
          Privacy
        </div>
        <p className="font-body text-xs text-dune-text-secondary leading-relaxed">
          {PRIVACY[provider]}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="font-display text-sm tracking-widest uppercase text-dune-accent hover:text-dune-text-primary transition-colors duration-300"
        >
          Save
        </button>
      </div>
    </div>
  );
};
