import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { useAtticStore } from '@/stores/atticStore';
import { daysSince } from '@/utils/date';
import { AtticItem } from './AtticItem';
import type { Task } from '@/types/task';

type GroupKey = 'week' | 'month' | 'old';

const GROUP_TITLES: Record<GroupKey, string> = {
  week: 'This week',
  month: 'This month',
  old: 'Long-time residents',
};
const GROUP_ORDER: GroupKey[] = ['week', 'month', 'old'];

function bucketOf(task: Task): GroupKey {
  const age = daysSince(task.movedToAtticAt ?? task.createdAt);
  if (age <= 7) return 'week';
  if (age <= 30) return 'month';
  return 'old';
}

export const AtticView: React.FC = () => {
  const items = useAtticStore((s) => s.items);
  const loading = useAtticStore((s) => s.loading);
  const load = useAtticStore((s) => s.load);
  const returnToToday = useAtticStore((s) => s.returnToToday);
  const deleteTask = useAtticStore((s) => s.deleteTask);

  const [query, setQuery] = useState('');

  useEffect(() => {
    load().catch((err) => console.error('Load attic failed:', err));
  }, [load]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? items.filter((t) => t.text.toLowerCase().includes(q)) : items;
    const map: Record<GroupKey, Task[]> = { week: [], month: [], old: [] };
    for (const t of filtered) map[bucketOf(t)].push(t);
    return map;
  }, [items, query]);

  const total = groups.week.length + groups.month.length + groups.old.length;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-sm tracking-widest text-dune-text-primary uppercase">
          Attic
        </h2>
        <span className="font-mono text-xs text-dune-text-muted">{items.length}</span>
      </div>

      <div className="flex items-center gap-3 py-2 mb-2 border-b border-dune-border-subtle">
        <Search size={14} strokeWidth={1.5} className="shrink-0 text-dune-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the attic…"
          className="flex-1 bg-transparent outline-none font-body text-sm text-dune-text-primary placeholder:text-dune-text-muted"
        />
      </div>

      {!loading && items.length === 0 && (
        <p className="py-8 text-center font-body text-sm text-dune-text-muted">
          The attic is empty. Unfinished tasks end up here.
        </p>
      )}

      {!loading && items.length > 0 && total === 0 && (
        <p className="py-8 text-center font-body text-sm text-dune-text-muted">
          Nothing found.
        </p>
      )}

      {GROUP_ORDER.map((key) =>
        groups[key].length > 0 ? (
          <div key={key} className="mb-6">
            <div className="font-display text-xs tracking-widest text-dune-text-muted uppercase mt-4 mb-1">
              {GROUP_TITLES[key]}
            </div>
            <AnimatePresence initial={false}>
              {groups[key].map((task) => (
                <AtticItem
                  key={task.id}
                  task={task}
                  onReturn={() => returnToToday(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : null
      )}
    </section>
  );
};
