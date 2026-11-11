import { useState } from 'react';
import { Plus } from 'lucide-react';
import { formatDateHint, parseRelativeDate, todayISO } from '@/utils/date';

export interface AddTaskPayload {
  text: string;
  /** Resolved `YYYY-MM-DD` — a parsed date, or `defaultDate`/today. */
  date: string;
  /** `HH:MM` if the user typed a time. */
  time?: string;
  /** Whether the user actually typed a date (vs falling back to a default). */
  hasDate: boolean;
}

interface AddTaskInputProps {
  onAdd: (payload: AddTaskPayload) => void;
  /** Fallback date when the text carries none (Plan view passes tomorrow). */
  defaultDate?: string;
  placeholder?: string;
}

export const AddTaskInput: React.FC<AddTaskInputProps> = ({ onAdd, defaultDate, placeholder }) => {
  const [text, setText] = useState('');
  const today = todayISO();
  const parsed = parseRelativeDate(text, today);
  const effectiveDate = parsed.date ?? defaultDate ?? today;
  const showHint = text.trim().length > 0 && Boolean(parsed.date || parsed.time);

  const submit = () => {
    const clean = parsed.text.trim();
    if (!clean) return;
    onAdd({ text: clean, date: effectiveDate, time: parsed.time, hasDate: Boolean(parsed.date) });
    setText('');
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <Plus size={16} strokeWidth={1.5} className="shrink-0 text-dune-text-muted" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        placeholder={placeholder ?? 'New task…'}
        className="flex-1 min-w-0 bg-transparent outline-none font-body text-sm text-dune-text-primary placeholder:text-dune-text-muted"
      />
      {showHint && (
        <span className="shrink-0 font-mono text-[11px] text-dune-text-muted">
          → {formatDateHint(effectiveDate)}
          {parsed.time ? ` ${parsed.time}` : ''}
        </span>
      )}
    </div>
  );
};
