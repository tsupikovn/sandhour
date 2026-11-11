import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAIStore } from '@/stores/aiStore';
import { useVocabStore } from '@/stores/vocabStore';
import { BirthdaysSettings } from '@/components/birthdays/BirthdaysSettings';
import { VOCAB_LANGUAGES, VOCAB_LEVELS, type ThemeMode } from '@/types/settings';
import { PROVIDERS, activeConfig, isConfigured } from '@/types/ai';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h3 className="font-display text-xs tracking-widest text-dune-text-muted uppercase">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
  <button
    onClick={onClick}
    className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1 border transition-colors duration-300 ${
      on
        ? 'border-dune-accent text-dune-accent'
        : 'border-dune-border-primary text-dune-text-muted hover:text-dune-text-secondary'
    }`}
  >
    {on ? 'On' : 'Off'}
  </button>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="font-body text-sm text-dune-text-secondary">{label}</span>
    {children}
  </div>
);

const chip = (active: boolean) =>
  `font-mono text-[11px] uppercase tracking-wide px-2 py-1 border transition-colors duration-300 ${
    active
      ? 'border-dune-accent text-dune-accent'
      : 'border-dune-border-primary text-dune-text-muted hover:text-dune-text-secondary'
  }`;

/** Which language the word-of-the-day card teaches, and at what level. */
const VocabSettings: React.FC = () => {
  const language = useSettingsStore((s) => s.vocabLanguage);
  const level = useSettingsStore((s) => s.vocabLevel);
  const setLanguage = useSettingsStore((s) => s.setVocabLanguage);
  const setLevel = useSettingsStore((s) => s.setVocabLevel);

  const isPreset = VOCAB_LANGUAGES.includes(language);
  const [custom, setCustom] = useState(isPreset ? '' : language);

  useEffect(() => {
    setCustom(VOCAB_LANGUAGES.includes(language) ? '' : language);
  }, [language]);

  // Each language keeps its own word history, so switching just changes the deck.
  const pickLanguage = async (value: string) => {
    const next = value.trim();
    if (!next || next === language) return;
    await setLanguage(next);
    void useVocabStore.getState().reload();
  };

  const pickLevel = async (value: (typeof VOCAB_LEVELS)[number]) => {
    if (value === level) return;
    await setLevel(value);
    void useVocabStore.getState().reload();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {VOCAB_LANGUAGES.map((l) => (
          <button key={l} onClick={() => void pickLanguage(l)} className={chip(language === l)}>
            {l}
          </button>
        ))}
      </div>
      <Row label="Another language">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={() => void pickLanguage(custom)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void pickLanguage(custom);
          }}
          placeholder="e.g. Georgian"
          className={`${timeField} w-44 text-right ${!isPreset ? 'border-dune-accent' : ''}`}
        />
      </Row>
      <Row label="Level">
        <div className="flex gap-1.5">
          {VOCAB_LEVELS.map((l) => (
            <button key={l} onClick={() => void pickLevel(l)} className={chip(level === l)}>
              {l}
            </button>
          ))}
        </div>
      </Row>
      <p className="font-mono text-[11px] text-dune-text-muted leading-relaxed">
        Words are picked by the AI assistant and explained in English. Each language
        keeps its own review history, so nothing is lost when you switch.
      </p>
    </>
  );
};

const timeField =
  'bg-transparent border-b border-dune-border-primary focus:border-dune-accent outline-none py-1 font-mono text-sm text-dune-text-primary transition-colors duration-300';

export const SettingsPanel: React.FC = () => {
  const open = useSettingsStore((s) => s.panelOpen);
  const close = useSettingsStore((s) => s.closePanel);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const alwaysOnTop = useSettingsStore((s) => s.alwaysOnTop);
  const toggleAlwaysOnTop = useSettingsStore((s) => s.toggleAlwaysOnTop);
  const morning = useSettingsStore((s) => s.morningRitualTime);
  const setMorning = useSettingsStore((s) => s.setMorningRitualTime);
  const evening = useSettingsStore((s) => s.eveningReminderTime);
  const setEvening = useSettingsStore((s) => s.setEveningReminderTime);
  const notifications = useSettingsStore((s) => s.notificationsEnabled);
  const setNotifications = useSettingsStore((s) => s.setNotificationsEnabled);
  const aiSettings = useAIStore((s) => s.settings);

  if (!open) return null;

  const openAISettings = () => {
    close();
    useAIStore.getState().open();
    useAIStore.getState().toggleSettings(true);
  };

  const themeBtn = (value: ThemeMode, label: string) => (
    <button
      onClick={() => setTheme(value)}
      className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1 border transition-colors duration-300 ${
        theme === value
          ? 'border-dune-accent text-dune-accent'
          : 'border-dune-border-primary text-dune-text-muted hover:text-dune-text-secondary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dune-bg-primary">
      <header className="flex items-center justify-between h-12 px-5 border-b border-dune-border-subtle shrink-0">
        <span className="font-display text-sm tracking-widest uppercase text-dune-text-primary">
          Settings
        </span>
        <button
          onClick={close}
          className="p-1.5 text-dune-text-muted hover:text-dune-text-primary transition-colors duration-300"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-md mx-auto space-y-8">
          <Section title="General">
            <Row label="Theme">
              <div className="flex gap-2">
                {themeBtn('dark', 'Dark')}
                {themeBtn('light', 'Light')}
              </div>
            </Row>
            <Row label="Keep on top">
              <Toggle on={alwaysOnTop} onClick={() => toggleAlwaysOnTop()} />
            </Row>
          </Section>

          <Section title="Times">
            <Row label="Morning ritual">
              <input
                type="time"
                value={morning}
                onChange={(e) => setMorning(e.target.value)}
                className={timeField}
              />
            </Row>
            <Row label="Evening reminder">
              <input
                type="time"
                value={evening}
                onChange={(e) => setEvening(e.target.value)}
                className={timeField}
              />
            </Row>
          </Section>

          <Section title="Notifications">
            <Row label="System notifications">
              <Toggle on={notifications} onClick={() => setNotifications(!notifications)} />
            </Row>
            <p className="font-mono text-[11px] text-dune-text-muted leading-relaxed">
              At most 7 a day, at least 30 minutes apart.
            </p>
          </Section>

          <Section title="Shortcuts">
            <Row label="Quick capture to Inbox">
              <span className="font-mono text-xs text-dune-text-primary">Ctrl+Shift+I</span>
            </Row>
            <p className="font-mono text-[11px] text-dune-text-muted leading-relaxed">
              Esc closes the capture window. The shortcut is not configurable yet.
            </p>
          </Section>

          <Section title="Word of the day">
            <VocabSettings />
          </Section>

          <Section title="Birthdays">
            <BirthdaysSettings />
          </Section>

          <Section title="Assistant">
            <div>
              <div className="font-body text-sm text-dune-text-secondary">AI provider</div>
              <div className="mt-1 font-mono text-xs text-dune-text-primary break-words">
                {PROVIDERS[aiSettings.provider].label}
                {isConfigured(aiSettings)
                  ? ` · ${activeConfig(aiSettings).model}`
                  : ' · not set up'}
              </div>
            </div>
            <p className="font-mono text-[11px] text-dune-text-muted leading-relaxed">
              Works with Gemini, OpenAI, Claude, or any service with an
              OpenAI-compatible API — including a local model.
            </p>
            <button
              onClick={openAISettings}
              className="font-display text-xs tracking-widest uppercase text-dune-accent hover:text-dune-text-primary transition-colors duration-300"
            >
              Provider, model and key →
            </button>
          </Section>

        </div>
      </div>
    </div>
  );
};
