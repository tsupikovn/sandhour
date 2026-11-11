import { create } from 'zustand';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { tasks as tasksTable } from '@/services/database/schema';
import { mapTaskRow as mapRow } from '@/services/database/mappers';
import { nowISO } from '@/utils/date';
import type { Task, CreateTaskInput } from '@/types/task';

/**
 * Sort order for the today list: unfinished tasks first (top-3 priority above
 * the rest, then by creation order), completed tasks sink to the bottom.
 */
function sortTasks(items: Task[]): Task[] {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

interface TasksState {
  date: string;
  items: Task[];
  loading: boolean;
  loadForDate: (date: string) => Promise<void>;
  /** Creates the task and returns its generated id. */
  addTask: (input: CreateTaskInput) => Promise<string>;
  toggleTask: (id: string) => Promise<void>;
  updateTaskText: (id: string, text: string) => Promise<void>;
  setPriority: (id: string, priority: number) => Promise<void>;
  /** Reschedule a task to another date; it leaves the current view if the date differs. */
  moveTo: (id: string, date: string, patch?: { text?: string; scheduledTime?: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  date: '',
  items: [],
  loading: false,

  loadForDate: async (date) => {
    set({ loading: true, date });
    const rows = await getDb()
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.targetDate, date),
          eq(tasksTable.inAttic, false),
          eq(tasksTable.isPlan, false)
        )
      );
    set({ items: sortTasks(rows.map(mapRow)), loading: false });
  },

  addTask: async (input) => {
    const id = crypto.randomUUID();
    const createdAt = nowISO();
    const task: Task = {
      id,
      text: input.text,
      completed: false,
      createdAt,
      targetDate: input.targetDate,
      scheduledTime: input.scheduledTime,
      priority: input.priority ?? 0,
      inAttic: false,
      isPlan: false,
    };
    await getDb().insert(tasksTable).values({
      id,
      text: task.text,
      completed: false,
      createdAt,
      targetDate: task.targetDate,
      scheduledTime: task.scheduledTime ?? null,
      priority: task.priority,
      inAttic: false,
    });
    // Only show in the current view if it belongs to the loaded date.
    if (task.targetDate === get().date) {
      set({ items: sortTasks([...get().items, task]) });
    }
    return id;
  },

  toggleTask: async (id) => {
    const current = get().items.find((t) => t.id === id);
    if (!current) return;
    const completed = !current.completed;
    const completedAt = completed ? nowISO() : undefined;
    await getDb()
      .update(tasksTable)
      .set({ completed, completedAt: completedAt ?? null })
      .where(eq(tasksTable.id, id));
    const items = get().items.map((t) =>
      t.id === id ? { ...t, completed, completedAt } : t
    );
    set({ items: sortTasks(items) });
  },

  updateTaskText: async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await getDb().update(tasksTable).set({ text: trimmed }).where(eq(tasksTable.id, id));
    set({
      items: get().items.map((t) => (t.id === id ? { ...t, text: trimmed } : t)),
    });
  },

  setPriority: async (id, priority) => {
    await getDb().update(tasksTable).set({ priority }).where(eq(tasksTable.id, id));
    set({
      items: sortTasks(get().items.map((t) => (t.id === id ? { ...t, priority } : t))),
    });
  },

  moveTo: async (id, date, patch) => {
    const update: { targetDate: string; text?: string; scheduledTime?: string | null } = {
      targetDate: date,
    };
    if (patch?.text) update.text = patch.text;
    if (patch?.scheduledTime !== undefined) update.scheduledTime = patch.scheduledTime;
    await getDb().update(tasksTable).set(update).where(eq(tasksTable.id, id));
    // Drop it from the current list if it no longer belongs to the loaded date
    // (gives the exit animation); keep it if somehow rescheduled to the same day.
    if (date !== get().date) {
      set({ items: get().items.filter((t) => t.id !== id) });
    } else {
      set({
        items: get().items.map((t) =>
          t.id === id
            ? { ...t, ...(patch?.text ? { text: patch.text } : {}), scheduledTime: patch?.scheduledTime ?? t.scheduledTime }
            : t
        ),
      });
    }
  },

  deleteTask: async (id) => {
    await getDb().delete(tasksTable).where(eq(tasksTable.id, id));
    set({ items: get().items.filter((t) => t.id !== id) });
  },
}));
