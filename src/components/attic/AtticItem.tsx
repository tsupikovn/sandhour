import { motion } from 'framer-motion';
import { CornerUpLeft, Trash2 } from 'lucide-react';
import type { Task } from '@/types/task';
import { relativeFromNow } from '@/utils/date';

interface AtticItemProps {
  task: Task;
  onReturn: () => void;
  onDelete: () => void;
}

export const AtticItem: React.FC<AtticItemProps> = ({ task, onReturn, onDelete }) => {
  const moved = task.movedToAtticAt ?? task.createdAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-start gap-3 py-3 border-b border-dune-border-subtle/60"
    >
      <span
        aria-hidden
        className={`mt-2 shrink-0 w-1.5 h-1.5 ${
          task.priority > 0 ? 'bg-dune-accent' : 'bg-dune-border-primary'
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className="font-body text-sm leading-relaxed text-dune-text-secondary">{task.text}</p>
        <p className="mt-1 font-mono text-[11px] text-dune-text-muted">moved here {relativeFromNow(moved)}</p>
      </div>

      <button
        onClick={onReturn}
        title="Back to today"
        className="shrink-0 p-1 text-dune-text-muted opacity-0 group-hover:opacity-100 hover:text-dune-accent transition-opacity duration-300"
      >
        <CornerUpLeft size={14} strokeWidth={1.5} />
      </button>
      <button
        onClick={onDelete}
        title="Delete forever"
        className="shrink-0 p-1 text-dune-text-muted opacity-0 group-hover:opacity-100 hover:text-dune-danger transition-opacity duration-300"
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
};
