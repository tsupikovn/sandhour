import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { userSettings } from '@/services/database/schema';
import { setAlwaysOnTop as applyAlwaysOnTop } from '@/lib/tauri-api';
import {
  DEFAULT_SETTINGS,
  VOCAB_LEVELS,
  type ThemeMode,
  type VocabLevel,
} from '@/types/settings';

interface SettingsState {
  theme: ThemeMode;
  alwaysOnTop: boolean;
  morningRitualTime: string;
  eveningReminderTime: string;
  notificationsEnabled: boolean;
  vocabLanguage: string;
  vocabLevel: VocabLevel;
  loaded: boolean;
  panelOpen: boolean;

  load: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setMorningRitualTime: (time: string) => Promise<void>;
  setEveningReminderTime: (time: string) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setVocabLanguage: (language: string) => Promise<void>;
  setVocabLevel: (level: VocabLevel) => Promise<void>;
  openPanel: () => void;
  closePanel: () => void;
}

export async function readSetting(key: string): Promise<string | undefined> {
  const rows = await getDb()
    .select({ value: userSettings.value })
    .from(userSettings)
    .where(eq(userSettings.key, key));
  return rows[0]?.value ?? undefined;
}

async function writeSetting(key: string, value: string): Promise<void> {
  await getDb()
    .insert(userSettings)
    .values({ key, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: userSettings.key,
      set: { value, updatedAt: new Date().toISOString() },
    });
}

export function parseVocabLevel(raw: string | undefined): VocabLevel {
  return (VOCAB_LEVELS as string[]).includes(raw ?? '') ? (raw as VocabLevel) : DEFAULT_SETTINGS.vocabLevel;
}

function applyThemeAttribute(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: DEFAULT_SETTINGS.theme,
  alwaysOnTop: DEFAULT_SETTINGS.alwaysOnTop,
  morningRitualTime: DEFAULT_SETTINGS.morningRitualTime,
  eveningReminderTime: DEFAULT_SETTINGS.eveningReminderTime,
  notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
  vocabLanguage: DEFAULT_SETTINGS.vocabLanguage,
  vocabLevel: DEFAULT_SETTINGS.vocabLevel,
  loaded: false,
  panelOpen: false,

  load: async () => {
    const [themeRaw, aotRaw, morning, evening, notif, vocabLang, vocabLevel] = await Promise.all([
      readSetting('theme'),
      readSetting('alwaysOnTop'),
      readSetting('morningRitualTime'),
      readSetting('eveningReminderTime'),
      readSetting('notificationsEnabled'),
      readSetting('vocabLanguage'),
      readSetting('vocabLevel'),
    ]);

    const theme: ThemeMode = themeRaw === 'light' ? 'light' : 'dark';
    const alwaysOnTop = aotRaw === 'true';

    applyThemeAttribute(theme);
    await applyAlwaysOnTop(alwaysOnTop);

    set({
      theme,
      alwaysOnTop,
      morningRitualTime: morning ?? DEFAULT_SETTINGS.morningRitualTime,
      eveningReminderTime: evening ?? DEFAULT_SETTINGS.eveningReminderTime,
      notificationsEnabled: notif !== 'false',
      vocabLanguage: vocabLang?.trim() || DEFAULT_SETTINGS.vocabLanguage,
      vocabLevel: parseVocabLevel(vocabLevel),
      loaded: true,
    });
  },

  toggleAlwaysOnTop: async () => {
    const next = !get().alwaysOnTop;
    await applyAlwaysOnTop(next);
    await writeSetting('alwaysOnTop', String(next));
    set({ alwaysOnTop: next });
  },

  setTheme: async (theme) => {
    applyThemeAttribute(theme);
    await writeSetting('theme', theme);
    set({ theme });
  },

  setMorningRitualTime: async (time) => {
    await writeSetting('morningRitualTime', time);
    set({ morningRitualTime: time });
  },

  setEveningReminderTime: async (time) => {
    await writeSetting('eveningReminderTime', time);
    set({ eveningReminderTime: time });
  },

  setNotificationsEnabled: async (enabled) => {
    await writeSetting('notificationsEnabled', String(enabled));
    set({ notificationsEnabled: enabled });
  },

  setVocabLanguage: async (language) => {
    const value = language.trim();
    if (!value) return;
    await writeSetting('vocabLanguage', value);
    set({ vocabLanguage: value });
  },

  setVocabLevel: async (level) => {
    await writeSetting('vocabLevel', level);
    set({ vocabLevel: level });
  },

  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
}));
