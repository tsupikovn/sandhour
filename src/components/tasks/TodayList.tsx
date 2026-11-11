import { AnimatePresence } from 'framer-motion';
import { useTasksStore } from '@/stores/tasksStore';
import { useCalendarTasksStore } from '@/stores/calendarTasksStore';
import { todayISO, formatDayHeading } from '@/utils/date';
import { TaskItem } from './TaskItem';
import { AddTaskInput } from './AddTaskInput';

export const TodayList: React.FC = () => {
  // The loaded date is owned by the store (initialised in App and kept in sync by
  // the day-change watcher and the 23:59 migration), so this list never computes
  // "today" on its own.
  const date = useTasksStore((s) => s.date) || todayISO();

  const items = useTasksStore((s) => s.items);
  const loading = useTasksStore((s) => s.loading);
  const addTask = useTasksStore((s) => s.addTask);
  const toggleTask = useTasksStore((s) => s.toggleTask);
  const moveTo = useTasksStore((s) => s.moveTo);
  const deleteTask = useTasksStore((s) => s.deleteTask);
  const updateTaskText = useTasksStore((s) => s.updateTaskText);
  const setPriority = useTasksStore((s) => s.setPriority);

  const remaining = items.filter((t) => !t.completed).length;

  const handleAdd = async (text: string, targetDate: string, scheduledTime?: string) => {
    await addTask({ text, targetDate, scheduledTime });
    if (targetDate > todayISO()) useCalendarTasksStore.getState().load();
  };

  const handleMoveWithText = async (
    id: string,
    targetDate: string,
    text: string,
    time?: string
  ) => {
    await moveTo(id, targetDate, { text, scheduledTime: time });
    if (targetDate > todayISO()) useCalendarTasksStore.getState().load();
  };

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-sm tracking-widest text-dune-text-primary uppercase">
          Today's tasks
        </h2>
        <span className="font-mono text-xs text-dune-text-muted">{formatDayHeading(date)}</span>
      </div>
      <div className="border-t border-dune-border-subtle" />

      {!loading && items.length === 0 && (
        <p className="py-8 text-center font-body text-sm text-dune-text-muted">
          Nothing yet. Write down today's first task.
        </p>
      )}

      <AnimatePresence initial={false}>
        {items.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task.id)}
            onDelete={() => deleteTask(task.id)}
            onUpdateText={(text) => updateTaskText(task.id, text)}
            onTogglePriority={() => setPriority(task.id, task.priority > 0 ? 0 : 1)}
            onMoveWithText={(d, text, time) => handleMoveWithText(task.id, d, text, time)}
          />
        ))}
      </AnimatePresence>

      <AddTaskInput onAdd={({ text, date: d, time }) => handleAdd(text, d, time)} />

      {items.length > 0 && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-wide text-dune-text-muted">
          Left: {remaining}
        </div>
      )}
    </section>
  );
};
