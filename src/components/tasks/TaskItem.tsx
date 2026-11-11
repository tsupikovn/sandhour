import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Trash2, Bookmark, CalendarPlus } from 'lucide-react';
import type { Task } from '@/types/task';
import { useSettingsStore } from '@/stores/settingsStore';
import { parseRelativeDate, formatDateHint, todayISO } from '@/utils/date';

interface TaskItemProps {
  task: Task;
  onDelete: () => void;
  onToggle?: () => void;
  onUpdateText?: (text: string) => void;
  onTogglePriority?: () => void;
  /**
   * If the edited text gains a date, hand it off instead of a plain text update.
   * In the Today list this moves the task to that day; in Plans it schedules it.
   */
  onMoveWithText?: (date: string, text: string, time?: string) => void;
  /**
   * When true (Plans), any parsed date triggers `onMoveWithText`, including
   * today; otherwise only a future date does.
   */
  moveOnAnyDate?: boolean;
  /** Calendar only: strip the date, sending the task back to Plans. */
  onMoveToPlans?: () => void;
  /** Pick a concrete date (+ time) via a calendar control. */
  onSchedulePick?: (date: string, time?: string) => void;
  /** Hide the checkbox (calendar and Plans views). */
  hideCheckbox?: boolean;
  /** Plans view: a thin dot marker in place of the checkbox. */
  leadingDot?: boolean;
  /** Enter edit mode on a single click (Plans) instead of a double click. */
  editOnClick?: boolean;
}

const duneTransition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onDelete,
  onToggle,
  onUpdateText,
  onTogglePriority,
  onMoveWithText,
  moveOnAnyDate,
  onMoveToPlans,
  onSchedulePick,
  hideCheckbox,
  leadingDot,
  editOnClick,
}) => {
  const theme = useSettingsStore((s) => s.theme);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [picking, setPicking] = useState(false);
  const [pickDate, setPickDate] = useState('');
  const [pickTime, setPickTime] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    if (!onUpdateText) return;
    setDraft(task.text);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    // Editing doubles as scheduling: a trailing date ("… tomorrow") reschedules.
    if (onMoveWithText) {
      const parsed = parseRelativeDate(draft, todayISO());
      if (parsed.date && (moveOnAnyDate || parsed.date > todayISO())) {
        onMoveWithText(parsed.date, parsed.text || task.text, parsed.time);
        return;
      }
    }
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.text) onUpdateText?.(trimmed);
    else setDraft(task.text);
  };

  const confirmPick = () => {
    if (!pickDate) return;
    onSchedulePick?.(pickDate, pickTime || undefined);
    setPicking(false);
    setPickDate('');
    setPickTime('');
  };

  // Live preview of a date/time typed into the tail while editing.
  const previewParsed = editing && onMoveWithText ? parseRelativeDate(draft, todayISO()) : null;
  const previewDate =
    previewParsed?.date && (moveOnAnyDate || previewParsed.date > todayISO())
      ? previewParsed.date
      : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={duneTransition}
      className="border-b border-dune-border-subtle/60"
    >
      <div className="group flex items-center gap-3 py-3">
        {leadingDot ? (
          <span
            aria-hidden
            className="shrink-0 w-2 text-center font-mono text-[11px] text-dune-text-muted"
          >
            ·
          </span>
        ) : (
          !hideCheckbox &&
          onToggle && (
            <button
              onClick={onToggle}
              aria-label={task.completed ? 'Mark as not done' : 'Mark as done'}
              className={`shrink-0 w-4 h-4 border flex items-center justify-center transition-colors duration-500 ${
                task.completed
                  ? 'border-dune-text-muted bg-dune-bg-tertiary'
                  : 'border-dune-border-primary hover:border-dune-text-primary'
              }`}
            >
              {task.completed && (
                <Check size={11} strokeWidth={2} className="text-dune-text-muted" />
              )}
            </button>
          )
        )}

        <div className="flex-1 min-w-0">
          {editing && onUpdateText ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') {
                  setDraft(task.text);
                  setEditing(false);
                }
              }}
              className="w-full bg-transparent border-b border-dune-accent outline-none font-body text-sm text-dune-text-primary"
            />
          ) : (
            <span
              onClick={editOnClick ? startEditing : undefined}
              onDoubleClick={editOnClick ? undefined : startEditing}
              title={
                onUpdateText
                  ? editOnClick
                    ? 'Click to rename'
                    : 'Double-click to edit'
                  : undefined
              }
              className={`relative inline-block max-w-full font-body text-sm leading-relaxed ${
                onUpdateText ? 'cursor-text' : ''
              }`}
            >
              <span
                className={`transition-colors duration-500 ${
                  task.completed ? 'text-dune-text-muted' : 'text-dune-text-primary'
                }`}
              >
                {task.text}
              </span>
              <motion.span
                aria-hidden
                initial={false}
                animate={{ scaleX: task.completed ? 1 : 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ originX: 0 }}
                className="absolute left-0 top-1/2 w-full h-px bg-dune-text-muted"
              />
            </span>
          )}
        </div>

        {editing && previewDate && (
          <span className="shrink-0 font-mono text-[11px] text-dune-accent">
            → {formatDateHint(previewDate)}
            {previewParsed?.time ? ` ${previewParsed.time}` : ''}
          </span>
        )}

        {task.scheduledTime && (
          <span className="shrink-0 font-mono text-[11px] text-dune-text-muted tabular-nums">
            {task.scheduledTime}
          </span>
        )}

        {onSchedulePick && (
          <button
            onClick={() => setPicking((v) => !v)}
            title="Set a date"
            className={`shrink-0 p-1 transition-colors duration-300 ${
              picking ? 'text-dune-accent' : 'text-dune-text-muted hover:text-dune-accent'
            }`}
          >
            <CalendarPlus size={15} strokeWidth={1.5} />
          </button>
        )}

        {onMoveToPlans && (
          <button
            onClick={onMoveToPlans}
            title="Remove the date — back to Plans"
            className="shrink-0 p-1 text-dune-text-muted opacity-0 group-hover:opacity-100 hover:text-dune-text-primary transition-opacity duration-300"
          >
            <Bookmark size={14} strokeWidth={1.5} />
          </button>
        )}

        {onTogglePriority && (
          <button
            onClick={onTogglePriority}
            title={task.priority > 0 ? 'Unmark as important' : 'Mark as important'}
            className={`shrink-0 p-1 transition-opacity duration-300 ${
              task.priority > 0
                ? 'text-dune-accent opacity-100'
                : 'text-dune-text-muted opacity-0 group-hover:opacity-100 hover:text-dune-text-primary'
            }`}
          >
            <Star size={14} strokeWidth={1.5} />
          </button>
        )}

        <button
          onClick={onDelete}
          title="Delete"
          className="shrink-0 p-1 text-dune-text-muted opacity-0 group-hover:opacity-100 hover:text-dune-danger transition-opacity duration-300"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </div>

      {picking && onSchedulePick && (
        <div className="flex items-center gap-2 pb-3 pl-5">
          <input
            type="date"
            value={pickDate}
            min={todayISO()}
            onChange={(e) => setPickDate(e.target.value)}
            style={{ colorScheme: theme }}
            className="bg-transparent border-b border-dune-border-subtle outline-none font-mono text-xs text-dune-text-secondary focus:border-dune-accent"
          />
          <input
            type="time"
            value={pickTime}
            onChange={(e) => setPickTime(e.target.value)}
            style={{ colorScheme: theme }}
            className="bg-transparent border-b border-dune-border-subtle outline-none font-mono text-xs text-dune-text-secondary focus:border-dune-accent"
          />
          <button
            onClick={confirmPick}
            disabled={!pickDate}
            className="font-mono text-[11px] uppercase tracking-wide text-dune-accent disabled:text-dune-text-muted transition-colors duration-300"
          >
            done
          </button>
        </div>
      )}
    </motion.div>
  );
};
