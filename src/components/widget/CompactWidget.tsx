import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { TodayList } from '@/components/tasks/TodayList';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';
import { PlansList } from '@/components/tasks/PlansList';
import { AtticView } from '@/components/attic/AtticView';
import { InboxView } from '@/components/inbox/InboxView';
import { WordOfDay } from '@/components/vocab/WordOfDay';
import { BirthdayBanner } from '@/components/birthdays/BirthdayBanner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { EveningReminder } from '@/components/rituals/EveningReminder';
import { useInboxStore } from '@/stores/inboxStore';
import { usePlansStore } from '@/stores/plansStore';

type View = 'today' | 'plans' | 'attic' | 'inbox';

export const CompactWidget: React.FC = () => {
  const [view, setView] = useState<View>('today');
  const inboxCount = useInboxStore((s) => s.items.length);
  const plansCount = usePlansStore((s) => s.items.length);

  const navItem = (key: View, label: string, badge?: number) => (
    <button
      onClick={() => setView(key)}
      className={`flex items-center gap-1.5 font-display text-xs tracking-widest uppercase pb-1 border-b transition-colors duration-300 ${
        view === key
          ? 'text-dune-text-primary border-dune-accent'
          : 'text-dune-text-muted border-transparent hover:text-dune-text-secondary'
      }`}
    >
      {label}
      {badge ? (
        <span className="font-mono text-[10px] text-dune-accent">{badge}</span>
      ) : null}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-dune-bg-primary text-dune-text-primary">
      <Header />

      <nav className="flex items-center gap-6 px-6 pt-4 shrink-0">
        {navItem('today', 'Today')}
        {navItem('plans', 'Plans', plansCount)}
        {navItem('attic', 'Attic')}
        {navItem('inbox', 'Inbox', inboxCount)}
      </nav>

      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-28">
        <div className="space-y-8 max-w-md mx-auto">
          {view === 'today' && (
            <>
              <BirthdayBanner />
              <WordOfDay />
              <TaskCalendar />
              <TodayList />
            </>
          )}
          {view === 'plans' && <PlansList />}
          {view === 'attic' && <AtticView />}
          {view === 'inbox' && <InboxView />}
        </div>
      </main>

      <EveningReminder />
      <ThemeToggle />
    </div>
  );
};
