import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useInboxStore } from '@/stores/inboxStore';
import { InboxItem } from './InboxItem';

export const InboxView: React.FC = () => {
  const items = useInboxStore((s) => s.items);
  const loading = useInboxStore((s) => s.loading);
  const load = useInboxStore((s) => s.load);
  const sendToToday = useInboxStore((s) => s.sendToToday);
  const sendToAttic = useInboxStore((s) => s.sendToAttic);
  const remove = useInboxStore((s) => s.remove);

  useEffect(() => {
    load().catch((err) => console.error('Load inbox failed:', err));
  }, [load]);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-sm tracking-widest text-dune-text-primary uppercase">
          Inbox
        </h2>
        <span className="font-mono text-xs text-dune-text-muted">{items.length}</span>
      </div>
      <div className="border-t border-dune-border-subtle" />

      {!loading && items.length === 0 && (
        <p className="py-8 text-center font-body text-sm text-dune-text-muted leading-relaxed">
          Empty. Press Ctrl+Shift+I from any application to jot down a
          thought.
        </p>
      )}

      <AnimatePresence initial={false}>
        {items.map((item) => (
          <InboxItem
            key={item.id}
            item={item}
            onToday={() => sendToToday(item)}
            onAttic={() => sendToAttic(item)}
            onDelete={() => remove(item.id)}
          />
        ))}
      </AnimatePresence>
    </section>
  );
};
