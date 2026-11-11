export type ThemeMode = 'dark' | 'light';

export interface AppSettings {
  theme: ThemeMode;
  alwaysOnTop: boolean;
  morningRitualTime: string; // HH:MM
  eveningReminderTime: string; // HH:MM
  notificationsEnabled: boolean;
  /** Language learned in the word-of-the-day card (an English name, free-form). */
  vocabLanguage: string;
  /** CEFR level of the suggested words. */
  vocabLevel: VocabLevel;
}

export type VocabLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const VOCAB_LEVELS: VocabLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Suggestions only — any language name can be typed in. English is left out on
 * purpose: translations are given in English, so it is the one language the
 * card cannot teach.
 */
export const VOCAB_LANGUAGES = [
  'Italian',
  'Turkish',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Chinese',
  'Japanese',
  'Korean',
  'Russian',
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  alwaysOnTop: false,
  morningRitualTime: '07:00',
  eveningReminderTime: '20:00',
  notificationsEnabled: true,
  vocabLanguage: 'Spanish',
  vocabLevel: 'B2',
};
