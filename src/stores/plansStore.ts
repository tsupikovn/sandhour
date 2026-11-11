import { create } from 'zustand';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { tasks as tasksTable } from '@/services/database/schema';
import { mapTaskRow } from '@/services/database/mappers';
import { useTasksStore } from '@/stores/tasksStore';
import { nowISO, todayISO } from '@/utils/date';
import type { Task } from '@/types/task';

interface PlansState {
  items: Task[];
  loading: boolean;
  load: () => Promise<void>;
  /** Record an undated plan. */
  addPlan: (text: string) => Promise<void>;
  updateText: (id: string, text: string) => Promise<void>;
  /** Give a plan a date — it stops being a plan and becomes a normal task. */
  schedule: (id: string, date: string, time?: string, text?: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const rows = await getDb()
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.isPlan, true),
          eq(tasksTable.inAttic, false),
          eq(tasksTable.completed, false)
        )
      )
      .orderBy(asc(tasksTable.createdAt));
    set({ items: rows.map(mapTaskRow), loading: false });
  },

  addPlan: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID();
    const createdAt = nowISO();
    // `target_date` is a NOT NULL formality; it is ignored while is_plan = 1.
    await getDb().insert(tasksTable).values({
      id,
      text: trimmed,
      completed: false,
      createdAt,
      targetDate: todayISO(),
      priority: 0,
      inAttic: false,
      isPlan: true,
    });
    const plan: Task = {
      id,
      text: trimmed,
      completed: false,
      createdAt,
      targetDate: todayISO(),
      priority: 0,
      inAttic: false,
      isPlan: true,
    };
    set({ items: [...get().items, plan] });
  },

  updateText: async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await getDb().update(tasksTable).set({ text: trimmed }).where(eq(tasksTable.id, id));
    set({ items: get().items.map((t) => (t.id === id ? { ...t, text: trimmed } : t)) });
  },

  schedule: async (id, date, time, text) => {
    const patch: { isPlan: boolean; targetDate: string; scheduledTime: string | null; text?: string } = {
      isPlan: false,
      targetDate: date,
      scheduledTime: time ?? null,
    };
    if (text && text.trim()) patch.text = text.trim();
    await getDb().update(tasksTable).set(patch).where(eq(tasksTable.id, id));
    set({ items: get().items.filter((t) => t.id !== id) });
    // It is now a dated task: refresh the day list (the calendar is refreshed by
    // the caller to avoid a store import cycle).
    await useTasksStore.getState().loadForDate(todayISO());
  },

  deleteTask: async (id) => {
    await getDb().delete(tasksTable).where(eq(tasksTable.id, id));
    set({ items: get().items.filter((t) => t.id !== id) });
  },
}));
