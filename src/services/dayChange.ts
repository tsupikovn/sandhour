import { todayISO } from '@/utils/date';

/**
 * Watch for the local calendar day rolling over while the app stays open.
 * Ticks every minute, comparing `todayISO()` against a cached value; when it
 * changes, `onChange(today)` fires once. Mirrors `startEveningReminder`: returns
 * a stop function, and a missed midnight is simply picked up on the next tick.
 */
export function startDayChangeWatcher(onChange: (today: string) => void): () => void {
  let current = todayISO();

  const tick = () => {
    const today = todayISO();
    if (today !== current) {
      current = today;
      try {
        onChange(today);
      } catch (err) {
        console.error('Day-change handler failed:', err);
      }
    }
  };

  const timer = setInterval(tick, 60_000);
  return () => clearInterval(timer);
}
