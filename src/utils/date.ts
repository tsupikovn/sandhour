import { format, formatDistanceToNow, parseISO, differenceInDays, addDays, getDay } from 'date-fns';

/** Today's date as `YYYY-MM-DD` (local time) — the canonical task `targetDate`. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Current timestamp as ISO string — used for `createdAt`, `completedAt`, etc. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Shift a `YYYY-MM-DD` date by `n` days (can be negative), returning `YYYY-MM-DD`. */
export function addDaysISO(iso: string, n: number): string {
  return format(addDays(parseISO(iso), n), 'yyyy-MM-dd');
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Indexed by JS `getDay()`: 0 = Sunday … 6 = Saturday.
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format `YYYY-MM-DD` as a day heading, e.g. "May 29". */
export function formatDayHeading(dateISO: string): string {
  const [, m, d] = dateISO.split('-').map(Number);
  return `${MONTHS[m - 1] ?? ''} ${d}`.trim();
}

/** Short weekday for a `YYYY-MM-DD` date: "Mon" … "Sun". */
export function weekdayShort(dateISO: string): string {
  try {
    return WEEKDAYS_SHORT[getDay(parseISO(dateISO))] ?? '';
  } catch {
    return '';
  }
}

/** Compact hint for the add-task input, e.g. "Fri, Sep 11". */
export function formatDateHint(dateISO: string): string {
  const [, m, d] = dateISO.split('-').map(Number);
  return `${weekdayShort(dateISO)}, ${MONTHS_SHORT[m - 1] ?? ''} ${d}`;
}

export interface ParsedDate {
  /** The input with any recognised date/time tokens stripped from the tail. */
  text: string;
  /** Resolved `YYYY-MM-DD` if a date was recognised. */
  date?: string;
  /** `HH:MM` (24h) if a time was recognised. */
  time?: string;
}

const WEEKDAY_TOKENS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTH_TOKENS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/** Words that only made sense in front of the date we just removed ("call Sam at 3pm"). */
const DANGLING = new Set(['at', 'on', 'by', 'for', 'this', '@']);

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` if the parts form a real calendar day, else `null`. */
function realDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Resolve a month/day with no year to its next occurrence: this year, or next
 * year if that day has already passed.
 */
function upcoming(month: number, day: number, todayIso: string): string | null {
  const year = Number(todayIso.slice(0, 4));
  const thisYear = realDate(year, month, day);
  if (thisYear && thisYear >= todayIso) return thisYear;
  return realDate(year + 1, month, day) ?? thisYear;
}

/** Nearest strictly-future date whose weekday is `targetDow` (0=Sun…6=Sat). */
function nextWeekdayISO(todayIso: string, targetDow: number): string {
  const todayDow = getDay(parseISO(todayIso));
  let diff = (targetDow - todayDow + 7) % 7;
  if (diff === 0) diff = 7; // "fri" typed on a Friday means next week's
  return addDaysISO(todayIso, diff);
}

/** `15:00`, `3pm`, `3:30pm`, `noon` → `HH:MM`. */
function matchTimeToken(tok: string): string | null {
  const low = tok.toLowerCase();
  if (low === 'noon') return '12:00';

  let m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(low);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;

  m = /^(1[0-2]|0?[1-9])(?::([0-5]\d))?(am|pm)$/.exec(low);
  if (m) {
    let hour = Number(m[1]) % 12;
    if (m[3] === 'pm') hour += 12;
    return `${pad(hour)}:${m[2] ?? '00'}`;
  }
  return null;
}

/**
 * Two numbers with a separator. A slash reads month-first (`3/12` = March 12),
 * a dot day-first (`12.03` = 12 March) — unless only the other order is a valid
 * date (`25/12` can only be 25 December).
 */
function numericMonthDay(a: number, b: number, monthFirst: boolean): [number, number] | null {
  const primary: [number, number] = monthFirst ? [a, b] : [b, a];
  const swapped: [number, number] = [primary[1], primary[0]];
  const valid = ([mo, d]: [number, number]) => mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
  if (valid(primary)) return primary;
  if (valid(swapped)) return swapped;
  return null;
}

/** A single-word date: `today`, `tomorrow`, `fri`, `+3`, `2026-03-12`, `3/12`, `12.03.2026`. */
function matchDateToken(tok: string, todayIso: string): string | null {
  const low = tok.toLowerCase();
  if (low === 'today') return todayIso;
  if (low === 'tomorrow') return addDaysISO(todayIso, 1);
  if (low in WEEKDAY_TOKENS) return nextWeekdayISO(todayIso, WEEKDAY_TOKENS[low]);

  let m = /^\+(\d{1,3})$/.exec(low);
  if (m) return addDaysISO(todayIso, Number(m[1]));

  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(low);
  if (m) return realDate(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /^(\d{1,2})([/.])(\d{1,2})(?:\2(\d{4}))?$/.exec(low);
  if (m) {
    const md = numericMonthDay(Number(m[1]), Number(m[3]), m[2] === '/');
    if (!md) return null;
    return m[4] ? realDate(Number(m[4]), md[0], md[1]) : upcoming(md[0], md[1], todayIso);
  }

  return null;
}

/**
 * A date spelled with a month name at the very end of the words: `dec 25`,
 * `25 dec`, `december 25th`, optionally followed by a year. Returns the date
 * and how many words it took.
 */
function matchMonthNameDate(
  words: string[],
  todayIso: string
): { date: string; used: number } | null {
  const clean = (w: string) => w.toLowerCase().replace(/[.,]$/, '');
  const asDay = (w: string) => {
    const m = /^(\d{1,2})(?:st|nd|rd|th)?$/.exec(clean(w));
    return m ? Number(m[1]) : null;
  };
  const asMonth = (w: string) => MONTH_TOKENS[clean(w)] ?? null;
  const asYear = (w: string) => (/^\d{4}$/.test(clean(w)) ? Number(clean(w)) : null);

  const tryAt = (offset: number, year: number | null) => {
    const a = words[words.length - offset - 2];
    const b = words[words.length - offset - 1];
    if (a === undefined || b === undefined) return null;
    const pair =
      asMonth(a) !== null && asDay(b) !== null
        ? { month: asMonth(a)!, day: asDay(b)! }
        : asDay(a) !== null && asMonth(b) !== null
          ? { month: asMonth(b)!, day: asDay(a)! }
          : null;
    if (!pair) return null;
    const date =
      year !== null ? realDate(year, pair.month, pair.day) : upcoming(pair.month, pair.day, todayIso);
    return date ? { date, used: offset + 2 } : null;
  };

  const last = words[words.length - 1];
  const year = last !== undefined ? asYear(last) : null;
  return (year !== null ? tryAt(1, year) : null) ?? tryAt(0, null);
}

/**
 * Parse a date and/or time from the *tail* of a task string, so typing
 * "call the workshop tomorrow 3pm" schedules it. Recognises `today`, `tomorrow`,
 * weekday names (short or full → the nearest future one), `+N` days, numeric
 * dates (`3/12`, `12.03`, `2026-03-12`), month names (`dec 25`, `25 dec`) and a
 * time (`15:00`, `3pm`, `noon`). Whatever is recognised is stripped from `text`;
 * if no date is found, `date` is undefined and the caller picks the default.
 */
export function parseRelativeDate(input: string, today: string = todayISO()): ParsedDate {
  const words = input.trimEnd().split(/\s+/);
  let date: string | undefined;
  let time: string | undefined;

  // Consume from the end — at most one date and one time, in either order.
  while (words.length > 0) {
    const last = words[words.length - 1];
    if (!time) {
      const t = matchTimeToken(last);
      if (t) {
        time = t;
        words.pop();
        continue;
      }
    }
    if (!date) {
      const named = matchMonthNameDate(words, today);
      if (named) {
        date = named.date;
        words.splice(words.length - named.used, named.used);
        continue;
      }
      const d = matchDateToken(last, today);
      if (d) {
        date = d;
        words.pop();
        continue;
      }
    }
    break;
  }

  // "call Sam at 3pm" → "call Sam", not "call Sam at".
  if ((date || time) && words.length > 1 && DANGLING.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }

  return { text: words.join(' ').trim(), date, time };
}

/** Relative phrase from an ISO timestamp, e.g. "5 days ago". */
export function relativeFromNow(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

/** Whole days elapsed since an ISO timestamp (>= 0 for the past). */
export function daysSince(iso: string): number {
  try {
    return differenceInDays(new Date(), parseISO(iso));
  } catch {
    return 0;
  }
}
