import { motion } from 'framer-motion';
import { CalendarPlus, Archive, Trash2 } from 'lucide-react';
import type { InboxItem as Item } from '@/services/inbox';
import { relativeFromNow } from '@/utils/date';

interface InboxItemProps {
  item: Item;
  onToday: () => void;
  onAttic: () => void;
  onDelete: () => void;
}

export const InboxItem: React.FC<InboxItemProps> = ({ item, onToday, onAttic, onDelete }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-start gap-3 py-3 border-b border-dune-border-subtle/60"
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm leading-relaxed text-dune-text-primary">{item.text}</p>
        <p className="mt-1 font-mono text-[11px] text-dune-text-muted">
          {relativeFromNow(item.createdAt)}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={onToday}
          title="To today's tasks"
          className="p-1 text-dune-text-muted hover:text-dune-accent"
        >
          <CalendarPlus size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={onAttic}
          title="To the attic"
          className="p-1 text-dune-text-muted hover:text-dune-text-primary"
        >
          <Archive size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1 text-dune-text-muted hover:text-dune-danger"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  );
};
