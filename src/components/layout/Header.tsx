import { Sparkles, Sunrise, Settings, Pin, Minus, X } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useRitualStore } from '@/stores/ritualStore';
import { useAIStore } from '@/stores/aiStore';
import { minimizeWindow, closeWindow } from '@/lib/tauri-api';

/**
 * Frameless window header. The title area carries `data-tauri-drag-region` so
 * the whole bar drags the window; the control buttons opt out of dragging so
 * their clicks register.
 */
export const Header: React.FC = () => {
  const alwaysOnTop = useSettingsStore((s) => s.alwaysOnTop);
  const toggleAlwaysOnTop = useSettingsStore((s) => s.toggleAlwaysOnTop);
  const openRitual = useRitualStore((s) => s.open);
  const openAI = useAIStore((s) => s.open);
  const openSettings = useSettingsStore((s) => s.openPanel);

  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between h-12 px-4 select-none border-b border-dune-border-subtle"
    >
      <span
        data-tauri-drag-region
        className="font-display text-base tracking-widest text-dune-text-primary uppercase"
      >
        Sandhour
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={openAI}
          title="Assistant"
          className="p-1.5 text-dune-text-muted hover:text-dune-accent transition-colors duration-300"
        >
          <Sparkles size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={openRitual}
          title="Morning ritual"
          className="p-1.5 text-dune-text-muted hover:text-dune-accent transition-colors duration-300"
        >
          <Sunrise size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={openSettings}
          title="Settings"
          className="p-1.5 text-dune-text-muted hover:text-dune-text-primary transition-colors duration-300"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
        <span className="w-px h-4 mx-1 bg-dune-border-subtle" aria-hidden />
        <button
          onClick={toggleAlwaysOnTop}
          title={alwaysOnTop ? 'Unpin' : 'Keep on top'}
          className={`p-1.5 transition-colors duration-300 ${
            alwaysOnTop
              ? 'text-dune-accent'
              : 'text-dune-text-muted hover:text-dune-text-primary'
          }`}
        >
          <Pin size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={minimizeWindow}
          title="Minimize"
          className="p-1.5 text-dune-text-muted hover:text-dune-text-primary transition-colors duration-300"
        >
          <Minus size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={closeWindow}
          title="Hide to tray"
          className="p-1.5 text-dune-text-muted hover:text-dune-danger transition-colors duration-300"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
