import { Sun, Moon } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Fixed bottom-right toggle between the dark (night desert) and light
 * (day desert) palettes. The choice is persisted in settings.
 */
export const ThemeToggle: React.FC = () => {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className="fixed bottom-4 right-4 z-40 p-2 text-dune-text-secondary hover:text-dune-accent transition-colors duration-300"
    >
      {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
    </button>
  );
};
