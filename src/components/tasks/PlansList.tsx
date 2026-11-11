import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePlansStore } from '@/stores/plansStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useCalendarTasksStore } from '@/stores/calendarTasksStore';
import { todayISO } from '@/utils/date';
import { TaskItem } from './TaskItem';
import { AddTaskInput } from './AddTaskInput';

export const PlansList: React.FC = () => {
  const items = usePlansStore((s) => s.items);
  const loading = usePlansStore((s) => s.loading);
  const load = usePlansStore((s) => s.load);
  const updateText = usePlansStore((s) => s.updateText);
  const schedule = usePlansStore((s) => s.schedule);
  const deleteTask = usePlansStore((s) => s.deleteTask);

  useEffect(() => {
    load().catch((err) => console.error('Load plans failed:', err));
  }, [load]);

  // Giving a plan a date turns it into a dated task — refresh the calendar too.
  const handleSchedule = async (id: string, date: string, time?: string, text?: string) => {
    await schedule(id, date, time, text);
    useCalendarTasksStore.getState().load();
  };

  // A date typed into the add-field means it was never really a plan — create a
  // normal task straight away; otherwise record an undated plan.
  const handleAdd = async (text: string, date: string, time: string | undefined, hasDate: boolean) => {
    if (hasDate) {
      await useTasksStore.getState().addTask({ text, targetDate: date, scheduledTime: time });
      await useCalendarTasksStore.getState().load();
      useTasksStore.getState().loadForDate(todayISO());
    } else {
      await usePlansStore.getState().addPlan(text);
    }
  };

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-sm tracking-widest text-dune-text-primary uppercase">
          Plans
        </h2>
        <span className="font-mono text-xs text-dune-text-muted">{items.length}</span>
      </div>
      <div className="border-t border-dune-border-subtle" />

      {!loading && items.length === 0 && (
        <p className="py-8 text-center font-body text-sm text-dune-text-muted leading-relaxed">
          Things waiting for their day. Write a plan down now — give it a date later
          with the calendar button, or by adding “tomorrow”, “fri” or “dec 25” to its text.
        </p>
      )}

      <AnimatePresence initial={false}>
        {items.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            hideCheckbox
            leadingDot
            editOnClick
            onUpdateText={(text) => updateText(task.id, text)}
            onMoveWithText={(date, text, time) => handleSchedule(task.id, date, time, text)}
            moveOnAnyDate
            onSchedulePick={(date, time) => handleSchedule(task.id, date, time)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}
      </AnimatePresence>

      <AddTaskInput
        onAdd={({ text, date, time, hasDate }) => handleAdd(text, date, time, hasDate)}
        placeholder="Write down a plan…"
      />
    </section>
  );
};
