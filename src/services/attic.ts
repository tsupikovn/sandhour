import { and, eq, lt, lte, type SQL } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { tasks } from '@/services/database/schema';
import { todayISO, nowISO } from '@/utils/date';

/**
 * Move unfinished, not-yet-archived tasks matching `dateCond` into the Attic
 * (set `in_attic = 1`, stamp `moved_to_attic_at`). Nothing is deleted.
 * Returns how many tasks were moved.
 */
async function migrate(dateCond: SQL | undefined): Promise<number> {
  const db = getDb();
  const predicate = and(
    dateCond,
    eq(tasks.completed, false),
    eq(tasks.inAttic, false),
    eq(tasks.isPlan, false)
  );

  // Count first — the sqlite-proxy driver doesn't surface rowsAffected on UPDATE.
  const candidates = await db.select({ id: tasks.id }).from(tasks).where(predicate);
  if (candidates.length === 0) return 0;

  await db.update(tasks).set({ inAttic: true, movedToAtticAt: nowISO() }).where(predicate);
  return candidates.length;
}

/**
 * The daily rollover (fired at 23:59 by the Rust scheduler, and by the debug
 * triggers): move everything dated today or earlier. At end of day this clears
 * the day's unfinished work; future-dated tasks are left untouched.
 */
export function migrateUnfinishedToAttic(): Promise<number> {
  return migrate(lte(tasks.targetDate, todayISO()));
}

/**
 * Startup catch-up: if the app wasn't running at 23:59, sweep tasks from
 * *previous* days (strictly before today) into the Attic so they don't become
 * orphaned. Today's fresh tasks are deliberately excluded.
 */
export function catchUpOverdueToAttic(): Promise<number> {
  return migrate(lt(tasks.targetDate, todayISO()));
}
