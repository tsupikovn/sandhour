import { create } from 'zustand';
import { and, asc, eq, gte } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { tasks as tasksTable, userSettings } from '@/services/database/schema';
import { mapTaskRow } from '@/services/database/mappers';
import { useTasksStore } from '@/stores/tasksStore';
import { usePlansStore } from '@/stores/plansStore';
import { todayISO } from '@/utils/date';
import type { Task } from '@/types/task';

/**
 * Dated tasks shown on the calendar: today and future, not archived, not plans,
 * not done. When a date becomes "today", these surface in today's
 * list automatically (that list queries target_date = today).
 */
const EXPANDED_KEY = 'calendarExpanded';

interface CalendarTasksState {
  items: Task[];
  loading: boolean;
  selectedDate: string;
  /** Whether the calendar block is expanded (persisted in user_settings). */
  expanded: boolean;
  load: () => Promise<void>;
  loadExpanded: () => Promise<void>;
  toggleExpanded: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  addForDate: (text: string, date: string, time?: string) => Promise<void>;
  updateText: (id: string, text: string) => Promise<void>;
  reschedule: (id: string, date: string, time?: string) => Promise<void>;
  /** Drop the date — send the task back to Plans. */
  moveToPlans: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useCalendarTasksStore = create<CalendarTasksState>((set, get) => ({
  items: [],
  loading: false,
  selectedDate: todayISO(),
  expanded: true,

  loadExpanded: async () => {
    const rows = await getDb()
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(eq(userSettings.key, EXPANDED_KEY));
    set({ expanded: rows[0]?.value !== 'false' });
  },

  toggleExpanded: async () => {
    const next = !get().expanded;
    set({ expanded: next });
    await getDb()
      .insert(userSettings)
      .values({ key: EXPANDED_KEY, value: String(next), updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: userSettings.key,
        set: { value: String(next), updatedAt: new Date().toISOString() },
      });
  },

  load: async () => {
    set({ loading: true });
    const rows = await getDb()
      .select()
      .from(tasksTable)
      .where(
        and(
          gte(tasksTable.targetDate, todayISO()),
          eq(tasksTable.inAttic, false),
          eq(tasksTable.isPlan, false),
          eq(tasksTable.completed, false)
        )
      )
      .orderBy(asc(tasksTable.targetDate), asc(tasksTable.scheduledTime), asc(tasksTable.createdAt));
    set({ items: rows.map(mapTaskRow), loading: false });
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  addForDate: async (text, date, time) => {
    // Reuse the task store so a task added for today also lands in today's list.
    await useTasksStore.getState().addTask({ text, targetDate: date, scheduledTime: time });
    await get().load();
  },

  updateText: async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await getDb().update(tasksTable).set({ text: trimmed }).where(eq(tasksTable.id, id));
    set({ items: get().items.map((t) => (t.id === id ? { ...t, text: trimmed } : t)) });
  },

  reschedule: async (id, date, time) => {
    const patch: { targetDate: string; scheduledTime?: string | null } = { targetDate: date };
    if (time !== undefined) patch.scheduledTime = time ?? null;
    await getDb().update(tasksTable).set(patch).where(eq(tasksTable.id, id));
    await get().load();
    if (date === todayISO()) useTasksStore.getState().loadForDate(todayISO());
  },

  moveToPlans: async (id) => {
    await getDb().update(tasksTable).set({ isPlan: true }).where(eq(tasksTable.id, id));
    set({ items: get().items.filter((t) => t.id !== id) });
    usePlansStore.getState().load();
  },

  deleteTask: async (id) => {
    await getDb().delete(tasksTable).where(eq(tasksTable.id, id));
    set({ items: get().items.filter((t) => t.id !== id) });
  },
}));
