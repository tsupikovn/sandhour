import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useBirthdaysStore } from '@/stores/birthdaysStore';
import { daysUntilBirthday, formatBirthday, parseBirthdayInput } from '@/utils/birthday';
import { todayISO } from '@/utils/date';

const fieldClass =
  'bg-transparent border-b border-dune-border-primary focus:border-dune-accent outline-none py-1 font-body text-sm text-dune-text-primary placeholder:text-dune-text-muted transition-colors duration-300';

function countdown(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** The birthday list editor shown inside the settings panel. */
export const BirthdaysSettings: React.FC = () => {
  const items = useBirthdaysStore((s) => s.items);
  const add = useBirthdaysStore((s) => s.add);
  const remove = useBirthdaysStore((s) => s.remove);

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();

  // Soonest first, so the list doubles as "who's coming up".
  const sorted = useMemo(
    () =>
      [...items]
        .map((b) => ({ b, days: daysUntilBirthday(b, today) }))
        .sort((x, y) => x.days - y.days || x.b.name.localeCompare(y.b.name)),
    [items, today]
  );

  const submit = async () => {
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    const parsed = parseBirthdayInput(date, Number(today.slice(0, 4)));
    if (!parsed) {
      setError('Could not read that date. Try: Mar 12, March 12 1990, 3/12 or 1990-03-12.');
      return;
    }
    await add(name, parsed);
    setName('');
    setDate('');
    setError(null);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void submit();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={onKey}
          placeholder="Name"
          className={`${fieldClass} flex-1 min-w-0`}
        />
        <input
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
          }}
          onKeyDown={onKey}
          placeholder="Mar 12 1990"
          className={`${fieldClass} w-28 font-mono`}
        />
        <button
          onClick={() => void submit()}
          className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-dune-accent hover:text-dune-text-primary transition-colors duration-300"
        >
          + add
        </button>
      </div>

      {error && <p className="font-mono text-[11px] text-dune-red leading-relaxed">{error}</p>}

      {sorted.length === 0 ? (
        <p className="font-mono text-[11px] text-dune-text-muted leading-relaxed">
          No birthdays yet. The year is optional. On the day, a red “Happy birthday”
          reminder appears at the top of the Today tab.
        </p>
      ) : (
        <div>
          {sorted.map(({ b, days }) => (
            <div
              key={b.id}
              className="group flex items-start gap-3 py-2 border-b border-dune-border-subtle/60"
            >
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm leading-relaxed text-dune-text-primary">{b.name}</p>
                <p className="font-mono text-[11px] text-dune-text-muted">
                  {formatBirthday(b)} ·{' '}
                  <span className={days === 0 ? 'text-dune-red' : undefined}>{countdown(days)}</span>
                </p>
              </div>
              <button
                onClick={() => remove(b.id)}
                title="Delete"
                className="shrink-0 p-1 text-dune-text-muted opacity-0 group-hover:opacity-100 hover:text-dune-danger transition-opacity duration-300"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
