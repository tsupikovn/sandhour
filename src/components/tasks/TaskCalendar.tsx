import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  format,
  parseISO,
} from 'date-fns';
import { useCalendarTasksStore } from '@/stores/calendarTasksStore';
import { useBirthdaysStore } from '@/stores/birthdaysStore';
import { isBirthdayOn, turningAge } from '@/utils/birthday';
import { todayISO, formatDayHeading, weekdayShort } from '@/utils/date';
import { TaskItem } from './TaskItem';
import { AddTaskInput } from './AddTaskInput';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export const TaskCalendar: React.FC = () => {
  const items = useCalendarTasksStore((s) => s.items);
  const expanded = useCalendarTasksStore((s) => s.expanded);
  const toggleExpanded = useCalendarTasksStore((s) => s.toggleExpanded);
  const selectedDate = useCalendarTasksStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarTasksStore((s) => s.setSelectedDate);
  const load = useCalendarTasksStore((s) => s.load);
  const addForDate = useCalendarTasksStore((s) => s.addForDate);
  const updateText = useCalendarTasksStore((s) => s.updateText);
  const reschedule = useCalendarTasksStore((s) => s.reschedule);
  const moveToPlans = useCalendarTasksStore((s) => s.moveToPlans);
  const deleteTask = useCalendarTasksStore((s) => s.deleteTask);

  const birthdays = useBirthdaysStore((s) => s.items);

  const [cursor, setCursor] = useState(() => startOfMonth(parseISO(selectedDate)));

  useEffect(() => {
    load().catch((err) => console.error('Load calendar tasks failed:', err));
  }, [load]);

  const today = todayISO();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor]);

  const datesWithTasks = useMemo(() => new Set(items.map((t) => t.targetDate)), [items]);
  const dayTasks = useMemo(
    () => items.filter((t) => t.targetDate === selectedDate),
    [items, selectedDate]
  );

  const dayBirthdays = useMemo(
    () => birthdays.filter((b) => isBirthdayOn(b, selectedDate)),
    [birthdays, selectedDate]
  );

  const monthLabel = format(cursor, 'LLLL yyyy');
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const selectedIsToday = selectedDate === today;

  const pickDay = (d: Date) => {
    setSelectedDate(iso(d));
    if (!isSameMonth(d, cursor)) setCursor(startOfMonth(d));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        {expanded ? (
          <button
            onClick={() => setCursor((c) => addMonths(c, -1))}
            title="Previous month"
            className="p-1 text-dune-text-muted hover:text-dune-text-primary transition-colors duration-300"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
        ) : (
          <span className="w-6" />
        )}
        <button
          onClick={() => toggleExpanded()}
          title={expanded ? 'Collapse calendar' : 'Expand calendar'}
          className="flex items-center gap-1.5 select-none bg-transparent border-0 p-0 cursor-pointer"
        >
          <span className="font-display text-sm tracking-widest text-dune-text-primary uppercase">
            {monthTitle}
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={`text-dune-text-muted transition-transform duration-300 ${
              expanded ? '' : '-rotate-90'
            }`}
          />
        </button>
        {expanded ? (
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            title="Next month"
            className="p-1 text-dune-text-muted hover:text-dune-text-primary transition-colors duration-300"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        ) : (
          <span className="w-6" />
        )}
      </div>
      <div className="border-t border-dune-border-subtle" />

      {!expanded && (
        <p className="py-3 text-center font-mono text-[11px] uppercase tracking-wide text-dune-text-muted">
          {items.length > 0 ? `Scheduled tasks: ${items.length}` : 'Click to expand'}
        </p>
      )}

      {expanded && (
      <>
      <div className="grid grid-cols-7 gap-1 mt-3">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center font-mono text-[10px] uppercase text-dune-text-muted pb-1">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const dayISO = iso(d);
          const inMonth = isSameMonth(d, cursor);
          const isToday = dayISO === today;
          const isSelected = dayISO === selectedDate;
          const has = datesWithTasks.has(dayISO);
          const hasBirthday = birthdays.some((b) => isBirthdayOn(b, dayISO));
          return (
            <button
              key={dayISO}
              onClick={() => pickDay(d)}
              className={`relative flex flex-col items-center justify-center h-9 rounded-sm font-mono text-xs transition-colors duration-200 ${
                isSelected ? 'bg-dune-bg-tertiary' : 'hover:bg-dune-bg-secondary'
              } ${
                isToday
                  ? 'text-dune-accent font-medium'
                  : inMonth
                    ? 'text-dune-text-secondary'
                    : 'text-dune-text-muted/40'
              }`}
            >
              {format(d, 'd')}
              {(has || hasBirthday) && (
                <span aria-hidden className="absolute bottom-1 flex gap-0.5">
                  {has && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isToday ? 'bg-dune-accent' : 'bg-dune-text-muted'
                      }`}
                    />
                  )}
                  {hasBirthday && <span className="w-1 h-1 rounded-full bg-dune-red" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-dune-text-secondary">
            {formatDayHeading(selectedDate)} · {weekdayShort(selectedDate)}
            {selectedIsToday ? ' · today' : ''}
          </span>
          {selectedDate !== today && (
            <button
              onClick={() => {
                setSelectedDate(today);
                setCursor(startOfMonth(parseISO(today)));
              }}
              className="font-mono text-[11px] uppercase tracking-wide text-dune-text-muted hover:text-dune-accent transition-colors duration-300"
            >
              → today
            </button>
          )}
        </div>
        <div className="border-t border-dune-border-subtle" />

        {dayBirthdays.map((b) => {
          const age = turningAge(b, selectedDate);
          return (
            <p key={b.id} className="pt-3 font-body text-sm text-dune-red">
              <span className="font-display text-xs tracking-widest uppercase">Birthday</span>{' '}
              {b.name}
              {age !== undefined && (
                <span className="font-mono text-[11px] text-dune-text-muted">
                  {' '}
                  · turns {age}
                </span>
              )}
            </p>
          );
        })}

        {selectedIsToday ? (
          <p className="py-4 text-center font-body text-sm text-dune-text-muted">
            Today's tasks are in the list below.
          </p>
        ) : (
          <>
            {dayTasks.length === 0 && (
              <p className="py-4 text-center font-body text-sm text-dune-text-muted">
                No tasks for this day.
              </p>
            )}

            <AnimatePresence initial={false}>
              {dayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  hideCheckbox
                  onUpdateText={(text) => updateText(task.id, text)}
                  onSchedulePick={(date, time) => reschedule(task.id, date, time)}
                  onMoveToPlans={() => moveToPlans(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </AnimatePresence>

            <AddTaskInput
              onAdd={({ text, date, time }) => addForDate(text, date, time)}
              defaultDate={selectedDate}
              placeholder={`Task for ${formatDayHeading(selectedDate)}…`}
            />
          </>
        )}
      </div>
      </>
      )}
    </section>
  );
};
