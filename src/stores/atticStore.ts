import { create } from 'zustand';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { tasks as tasksTable } from '@/services/database/schema';
import { mapTaskRow } from '@/services/database/mappers';
import { todayISO } from '@/utils/date';
import type { Task } from '@/types/task';

interface AtticState {
  items: Task[];
  loading: boolean;
  load: () => Promise<void>;
  returnToToday: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useAtticStore = create<AtticState>((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const rows = await getDb()
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.inAttic, true))
      .orderBy(desc(tasksTable.movedToAtticAt));
    set({ items: rows.map(mapTaskRow), loading: false });
  },

  returnToToday: async (id) => {
    await getDb()
      .update(tasksTable)
      .set({ inAttic: false, movedToAtticAt: null, targetDate: todayISO() })
      .where(eq(tasksTable.id, id));
    set({ items: get().items.filter((t) => t.id !== id) });
  },

  deleteTask: async (id) => {
    await getDb().delete(tasksTable).where(eq(tasksTable.id, id));
    set({ items: get().items.filter((t) => t.id !== id) });
  },
}));
