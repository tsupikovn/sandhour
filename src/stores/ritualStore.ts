import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { dailyRituals } from '@/services/database/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { todayISO, nowISO } from '@/utils/date';

export interface RitualResult {
  top3: string[]; // task ids
}

interface RitualState {
  visible: boolean;
  /** Show automatically if not yet done today and it's past 06:00. */
  checkAndMaybeShow: () => Promise<void>;
  /** Force-open (dev trigger / manual). */
  open: () => void;
  /** Persist a completed ritual and close. */
  complete: (result: RitualResult) => Promise<void>;
  /** Mark today's ritual as handled (dismissed) and close. */
  skip: () => Promise<void>;
}

async function hasRitualToday(): Promise<boolean> {
  const rows = await getDb()
    .select({ id: dailyRituals.id })
    .from(dailyRituals)
    .where(eq(dailyRituals.ritualDate, todayISO()));
  return rows.length > 0;
}

async function upsertRitual(fields: { top3Tasks?: string }): Promise<void> {
  const today = todayISO();
  const completedAt = nowISO();
  await getDb()
    .insert(dailyRituals)
    .values({
      id: crypto.randomUUID(),
      ritualDate: today,
      top3Tasks: fields.top3Tasks ?? null,
      completedAt,
    })
    .onConflictDoUpdate({
      target: dailyRituals.ritualDate,
      set: { ...fields, completedAt },
    });
}

export const useRitualStore = create<RitualState>((set) => ({
  visible: false,

  checkAndMaybeShow: async () => {
    try {
      const done = await hasRitualToday();
      const morning = useSettingsStore.getState().morningRitualTime || '07:00';
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const nowHHMM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      if (!done && nowHHMM >= morning) set({ visible: true });
    } catch (err) {
      console.error('Ritual check failed:', err);
    }
  },

  open: () => set({ visible: true }),

  complete: async (result) => {
    await upsertRitual({ top3Tasks: JSON.stringify(result.top3) });
    set({ visible: false });
  },

  skip: async () => {
    await upsertRitual({});
    set({ visible: false });
  },
}));
