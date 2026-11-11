import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { CompactWidget } from '@/components/widget/CompactWidget';
import { MorningRitual } from '@/components/rituals/MorningRitual';
import { AIChat } from '@/components/ai/AIChat';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useAIStore } from '@/stores/aiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useAtticStore } from '@/stores/atticStore';
import { useCalendarTasksStore } from '@/stores/calendarTasksStore';
import { usePlansStore } from '@/stores/plansStore';
import { useBirthdaysStore } from '@/stores/birthdaysStore';
import { useRitualStore } from '@/stores/ritualStore';
import { useInboxStore } from '@/stores/inboxStore';
import { migrateUnfinishedToAttic, catchUpOverdueToAttic } from '@/services/attic';
import { startDayChangeWatcher } from '@/services/dayChange';
import { INBOX_CHANGED } from '@/services/inbox';
import { startEveningReminder } from '@/services/scheduler';
import { todayISO } from '@/utils/date';

/** Reload the today list, the Attic and the calendar after a migration. */
async function refreshViews(): Promise<void> {
  await useTasksStore.getState().loadForDate(todayISO());
  await useAtticStore.getState().load();
  await useCalendarTasksStore.getState().load();
}

function App() {
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadSettings().catch((err) => console.error('Settings load failed:', err));
    useAIStore.getState().load().catch((err) => console.error('AI settings load failed:', err));
  }, [loadSettings]);

  // On launch: sweep any overdue tasks the 23:59 scheduler may have missed (app
  // closed at midnight) — only tasks from previous days are touched. Then offer
  // the morning ritual if it hasn't been done today. (The daily DB snapshot runs
  // earlier, on the Rust side, before the database is opened.)
  useEffect(() => {
    (async () => {
      // Initialise the loaded date for the Today list and prime the calendar.
      await useTasksStore
        .getState()
        .loadForDate(todayISO())
        .catch((err) => console.error('Initial tasks load failed:', err));
      useCalendarTasksStore.getState().load().catch((err) => console.error('Calendar load failed:', err));
      useCalendarTasksStore
        .getState()
        .loadExpanded()
        .catch((err) => console.error('Calendar expand-state load failed:', err));
      usePlansStore.getState().load().catch((err) => console.error('Plans load failed:', err));
      useBirthdaysStore.getState().load().catch((err) => console.error('Birthdays load failed:', err));
      try {
        const moved = await catchUpOverdueToAttic();
        if (moved > 0) {
          console.info(`[attic] startup catch-up moved ${moved} task(s)`);
          await refreshViews();
        }
      } catch (err) {
        console.error('Attic catch-up failed:', err);
      } finally {
        useRitualStore.getState().checkAndMaybeShow();
      }
    })();
  }, []);

  // Handle the local calendar day rolling over while the app stays open:
  // reload today's tasks (now a fresh, empty day), the Attic and the calendar
  // (a task dated for the new day now belongs to today's list).
  useEffect(() => {
    const stop = startDayChangeWatcher((today) => {
      useTasksStore.getState().loadForDate(today).catch((err) => console.error('Day-change tasks reload failed:', err));
      useAtticStore.getState().load().catch((err) => console.error('Day-change attic reload failed:', err));
      useCalendarTasksStore.getState().load().catch((err) => console.error('Day-change calendar reload failed:', err));
    });
    return stop;
  }, []);

  // Run the migration when the 23:59 scheduler fires.
  useEffect(() => {
    const handler = async () => {
      try {
        const moved = await migrateUnfinishedToAttic();
        console.info(`[attic] migration moved ${moved} task(s)`);
        await refreshViews();
      } catch (err) {
        console.error('Attic migration failed:', err);
      }
    };
    const scheduled = listen('attic-migrate', handler);
    return () => {
      scheduled.then((fn) => fn());
    };
  }, []);

  // Daily evening planning reminder (20:00).
  useEffect(() => {
    const stopReminder = startEveningReminder();
    return () => {
      stopReminder();
    };
  }, []);

  // Keep the inbox in sync — including items added from the quick-add window.
  useEffect(() => {
    const inbox = useInboxStore.getState();
    inbox.load().catch((err) => console.error('Inbox load failed:', err));
    const unlisten = listen(INBOX_CHANGED, () => {
      useInboxStore.getState().load().catch((err) => console.error('Inbox reload failed:', err));
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <>
      <CompactWidget />
      <MorningRitual />
      <AIChat />
      <SettingsPanel />
    </>
  );
}

export default App;
