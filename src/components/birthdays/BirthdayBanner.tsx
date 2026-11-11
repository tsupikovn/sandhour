import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useBirthdaysStore } from '@/stores/birthdaysStore';
import { useTasksStore } from '@/stores/tasksStore';
import { isBirthdayOn, turningAge } from '@/utils/birthday';
import { todayISO } from '@/utils/date';

/**
 * Shows "Happy birthday <name>" in red for everyone whose birthday is today. Appears
 * on its own on the day and stays until the person is ticked off (remembered per
 * year), or the day ends.
 */
export const BirthdayBanner: React.FC = () => {
  const items = useBirthdaysStore((s) => s.items);
  const markCongratulated = useBirthdaysStore((s) => s.markCongratulated);
  // Follow the store's date so the banner rolls over at midnight with the list.
  const today = useTasksStore((s) => s.date) || todayISO();
  const year = Number(today.slice(0, 4));

  const due = items.filter((b) => isBirthdayOn(b, today) && b.congratulatedYear !== year);
  if (due.length === 0) return null;

  return (
    <section className="py-4 border-y border-dune-red/50">
      <AnimatePresence initial={false}>
        {due.map((b) => {
          const age = turningAge(b, today);
          return (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-baseline gap-3 py-1"
            >
              <span className="shrink-0 font-display text-sm tracking-widest uppercase text-dune-red">
                Happy birthday
              </span>
              <span className="flex-1 min-w-0 font-body text-sm text-dune-red">
                {b.name}
                {age !== undefined && (
                  <span className="font-mono text-[11px] text-dune-text-muted">
                    {' '}
                    · turns {age}
                  </span>
                )}
              </span>
              <button
                onClick={() => markCongratulated(b.id, year)}
                title="Done — hide until next year"
                className="shrink-0 self-center p-1 text-dune-text-muted hover:text-dune-red transition-colors duration-300"
              >
                <Check size={14} strokeWidth={1.5} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </section>
  );
};
