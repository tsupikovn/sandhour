import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { birthdays as birthdaysTable } from '@/services/database/schema';
import { nowISO } from '@/utils/date';
import type { BirthdayDate } from '@/utils/birthday';

export interface Birthday extends BirthdayDate {
  id: string;
  name: string;
  /** The last year this person was marked as congratulated. */
  congratulatedYear?: number;
}

interface BirthdaysState {
  items: Birthday[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (name: string, date: BirthdayDate) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Hide the birthday reminder for this person until next year. */
  markCongratulated: (id: string, year: number) => Promise<void>;
}

export const useBirthdaysStore = create<BirthdaysState>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    const rows = await getDb().select().from(birthdaysTable);
    set({
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        month: r.month,
        day: r.day,
        year: r.year ?? null,
        congratulatedYear: r.congratulatedYear ?? undefined,
      })),
      loaded: true,
    });
  },

  add: async (name, date) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID();
    await getDb().insert(birthdaysTable).values({
      id,
      name: trimmed,
      month: date.month,
      day: date.day,
      year: date.year ?? null,
      createdAt: nowISO(),
    });
    set({
      items: [...get().items, { id, name: trimmed, month: date.month, day: date.day, year: date.year ?? null }],
    });
  },

  remove: async (id) => {
    await getDb().delete(birthdaysTable).where(eq(birthdaysTable.id, id));
    set({ items: get().items.filter((b) => b.id !== id) });
  },

  markCongratulated: async (id, year) => {
    await getDb()
      .update(birthdaysTable)
      .set({ congratulatedYear: year })
      .where(eq(birthdaysTable.id, id));
    set({
      items: get().items.map((b) => (b.id === id ? { ...b, congratulatedYear: year } : b)),
    });
  },
}));
