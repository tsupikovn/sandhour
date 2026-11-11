import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { addInboxItems } from '@/services/inbox';

/**
 * Content of the always-ready "inbox-quick" window, revealed by Ctrl+Shift+I.
 * Just a text field: Enter saves (one item per line), Shift+Enter adds a line,
 * Esc or losing focus hides the window. The window itself is transparent, so
 * we render a single centered card.
 */
export const QuickAddModal: React.FC = () => {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // The window is transparent — keep the page background clear.
    document.body.style.background = 'transparent';

    const win = getCurrentWindow();
    ref.current?.focus();

    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (focused) ref.current?.focus();
      else win.hide(); // dismiss when the user clicks away
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const close = () => getCurrentWindow().hide();

  const submit = async () => {
    const added = await addInboxItems(text.split('\n'));
    setText('');
    if (added >= 0) await close();
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-3 bg-transparent">
      <div className="w-full bg-dune-bg-secondary/95 border border-dune-border-primary p-4 shadow-none">
        <div className="font-display text-[11px] tracking-widest text-dune-text-muted uppercase mb-2">
          Quick capture
        </div>
        <textarea
          ref={ref}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              setText('');
              close();
            }
          }}
          rows={2}
          placeholder="Jot down a thought… Enter saves, Shift+Enter adds a line"
          className="w-full bg-transparent outline-none resize-none font-body text-sm text-dune-text-primary placeholder:text-dune-text-muted leading-relaxed"
        />
      </div>
    </div>
  );
};
