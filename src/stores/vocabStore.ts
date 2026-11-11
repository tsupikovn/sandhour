import { create } from 'zustand';
import { getWordOfDay, skipWord, type VocabRequest, type VocabWord } from '@/services/vocab';
import { useAIStore } from '@/stores/aiStore';
import { readSetting, parseVocabLevel } from '@/stores/settingsStore';
import { isConfigured } from '@/types/ai';
import { DEFAULT_SETTINGS } from '@/types/settings';

interface VocabState {
  word: VocabWord | null;
  /** The language and level the card is currently showing. */
  language: string;
  level: string;
  loading: boolean;
  error: string | null;
  noKey: boolean;
  load: () => Promise<void>;
  /** Drop the shown word and load again — after the language or provider changed. */
  reload: () => Promise<void>;
  skip: () => Promise<void>;
}

/**
 * Read everything a request needs straight from the DB, so the card does not
 * depend on the order in which the settings stores happen to finish loading.
 */
async function buildRequest(): Promise<VocabRequest> {
  await useAIStore.getState().load();
  const [language, level] = await Promise.all([
    readSetting('vocabLanguage'),
    readSetting('vocabLevel'),
  ]);
  return {
    settings: useAIStore.getState().settings,
    language: language?.trim() || DEFAULT_SETTINGS.vocabLanguage,
    level: parseVocabLevel(level),
  };
}

/** Set when a reload is requested while a request is still in flight. */
let reloadQueued = false;

export const useVocabStore = create<VocabState>((set, get) => ({
  word: null,
  language: DEFAULT_SETTINGS.vocabLanguage,
  level: DEFAULT_SETTINGS.vocabLevel,
  loading: false,
  error: null,
  noKey: false,

  load: async () => {
    if (get().loading) return; // guard against concurrent/double loads (StrictMode)
    set({ loading: true, error: null });
    try {
      const req = await buildRequest();
      set({ language: req.language, level: req.level });
      if (!isConfigured(req.settings)) {
        set({ noKey: true, loading: false });
        return;
      }
      const word = await getWordOfDay(req);
      set({ word, loading: false, noKey: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Something went wrong', loading: false });
    }
    if (reloadQueued) {
      // Settings changed mid-request — what we just loaded may be for the old ones.
      reloadQueued = false;
      await get().reload();
    }
  },

  reload: async () => {
    if (get().loading) {
      reloadQueued = true;
      return;
    }
    set({ word: null, error: null, noKey: false });
    await get().load();
  },

  skip: async () => {
    const current = get().word;
    if (!current) return;
    set({ loading: true, error: null });
    try {
      const req = await buildRequest();
      if (!isConfigured(req.settings)) {
        set({ noKey: true, loading: false });
        return;
      }
      const word = await skipWord(current.id, req);
      set({ word, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Something went wrong', loading: false });
    }
  },
}));
