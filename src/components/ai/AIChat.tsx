import { useEffect, useRef } from 'react';
import { Bot, Settings, X } from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AISettings } from './AISettings';

export const AIChat: React.FC = () => {
  const open = useAIStore((s) => s.chatOpen);
  const settingsOpen = useAIStore((s) => s.settingsOpen);
  const messages = useAIStore((s) => s.messages);
  const sending = useAIStore((s) => s.sending);
  const close = useAIStore((s) => s.close);
  const toggleSettings = useAIStore((s) => s.toggleSettings);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Esc closes the assistant and returns to the widget.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dune-bg-primary">
      <header className="flex items-center justify-between h-12 px-5 border-b border-dune-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} strokeWidth={1.5} className="text-dune-accent" />
          <span className="font-display text-sm tracking-widest uppercase text-dune-text-primary">
            Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleSettings()}
            title="AI settings"
            className={`p-1.5 transition-colors duration-300 ${
              settingsOpen ? 'text-dune-accent' : 'text-dune-text-muted hover:text-dune-text-primary'
            }`}
          >
            <Settings size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={close}
            title="Close"
            className="p-1.5 text-dune-text-muted hover:text-dune-text-primary transition-colors duration-300"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {settingsOpen ? (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AISettings />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <p className="py-8 text-center font-body text-sm text-dune-text-muted leading-relaxed">
                Ask how to shape your day. The assistant can see your tasks
                for today.
              </p>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {sending && <div className="h-px bg-dune-accent animate-pulse mx-4" />}
            <div ref={bottomRef} />
          </div>
          <div className="pt-3">
            <ChatInput />
          </div>
        </div>
      )}
    </div>
  );
};
