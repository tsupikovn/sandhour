import { useState } from 'react';
import { useAIStore } from '@/stores/aiStore';

export const ChatInput: React.FC = () => {
  const [text, setText] = useState('');
  const send = useAIStore((s) => s.send);
  const sending = useAIStore((s) => s.sending);

  const submit = () => {
    if (!text.trim() || sending) return;
    send(text);
    setText('');
  };

  return (
    <div className="flex items-end gap-3 border-t border-dune-border-subtle pt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Ask about your day…"
        className="flex-1 bg-transparent outline-none resize-none font-mono text-sm text-dune-text-primary placeholder:text-dune-text-muted leading-relaxed"
      />
      <button
        onClick={submit}
        disabled={!text.trim() || sending}
        className="shrink-0 font-display text-xs tracking-widest uppercase text-dune-accent hover:text-dune-text-primary disabled:opacity-40 transition-colors duration-300"
      >
        {sending ? '…' : 'Send'}
      </button>
    </div>
  );
};
