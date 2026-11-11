import { and, eq } from 'drizzle-orm';
import { getDb } from '@/services/database/client';
import { tasks, userSettings } from '@/services/database/schema';
import { notifications } from '@/services/notifications';
import { todayISO } from '@/utils/date';

const DEFAULT_EVENING_TIME = '20:00';

async function getSetting(key: string): Promise<string | undefined> {
  const rows = await getDb()
    .select({ value: userSettings.value })
    .from(userSettings)
    .where(eq(userSettings.key, key));
  return rows[0]?.value ?? undefined;
}

async function countRemainingToday(): Promise<number> {
  const rows = await getDb()
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.targetDate, todayISO()),
        eq(tasks.completed, false),
        eq(tasks.inAttic, false),
        eq(tasks.isPlan, false)
      )
    );
  return rows.length;
}

async function fireEveningReminder(): Promise<void> {
  const remaining = await countRemainingToday();
  const body =
    remaining > 0
      ? `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left for today. Time to wrap up and plan tomorrow.`
      : 'All of today\'s tasks are done. Plan tomorrow.';
  await notifications.send('Sandhour — evening', body);
}

function currentHHMM(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let lastFiredDate = '';

/**
 * Start the daily evening planning reminder. Ticks every minute and fires once
 * when the local clock reaches the configured time (default 20:00). Time-bound,
 * so no catch-up: launching after the time simply skips today's reminder.
 * Returns a stop function.
 */
export function startEveningReminder(): () => void {
  const tick = async () => {
    try {
      const target = (await getSetting('eveningReminderTime')) || DEFAULT_EVENING_TIME;
      const today = todayISO();
      if (currentHHMM() === target && lastFiredDate !== today) {
        lastFiredDate = today;
        await fireEveningReminder();
      }
    } catch (err) {
      console.error('Evening reminder tick failed:', err);
    }
  };

  void tick();
  const timer = setInterval(tick, 60_000);
  return () => clearInterval(timer);
}
