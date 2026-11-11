/** A birthday is a recurring month/day; the birth year is optional. */
export interface BirthdayDate {
  month: number; // 1-12
  day: number; // 1-31
  year?: number | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Days in a month, counting February as 29 so a leap-day birthday is valid. */
function maxDay(month: number): number {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

/**
 * The date a birthday is celebrated on in a given year. Someone born on
 * 29 February is congratulated on 28 February in non-leap years.
 */
export function occurrenceISO(b: BirthdayDate, year: number): string {
  const day = b.month === 2 && b.day === 29 && !isLeapYear(year) ? 28 : b.day;
  return `${year}-${pad(b.month)}-${pad(day)}`;
}

export function isBirthdayOn(b: BirthdayDate, dateISO: string): boolean {
  return occurrenceISO(b, Number(dateISO.slice(0, 4))) === dateISO;
}

/** The next celebration date on or after `todayISO`. */
export function nextOccurrenceISO(b: BirthdayDate, todayISO: string): string {
  const year = Number(todayISO.slice(0, 4));
  const thisYear = occurrenceISO(b, year);
  return thisYear >= todayISO ? thisYear : occurrenceISO(b, year + 1);
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `todayISO` to the next celebration (0 = today). */
export function daysUntilBirthday(b: BirthdayDate, todayISO: string): number {
  return Math.round((toUTC(nextOccurrenceISO(b, todayISO)) - toUTC(todayISO)) / 86_400_000);
}

/** The age reached on the celebration that falls in the year of `dateISO`. */
export function turningAge(b: BirthdayDate, dateISO: string): number | undefined {
  if (!b.year) return undefined;
  const age = Number(dateISO.slice(0, 4)) - b.year;
  return age > 0 ? age : undefined;
}

/** "March 12" or "March 12, 1990". */
export function formatBirthday(b: BirthdayDate): string {
  const base = `${MONTHS[b.month - 1] ?? ''} ${b.day}`.trim();
  return b.year ? `${base}, ${b.year}` : base;
}

/** Month number for a full name or any prefix of three or more letters ("sept"). */
function monthFromWord(word: string): number | null {
  const w = word.replace(/\.$/, '');
  if (w.length < 3) return null;
  const idx = MONTHS.findIndex((m) => m.toLowerCase().startsWith(w));
  return idx === -1 ? null : idx + 1;
}

/**
 * Parse what a person types for a birthday. Accepted forms:
 *
 * - month names — `Mar 12`, `March 12, 1990`, `12 Mar 1990`, `12th of March`
 * - ISO — `1990-03-12`
 * - slashes, month first — `3/12`, `3/12/1990`
 * - dots, day first — `12.03`, `12.03.1990`
 *
 * With slashes or dots, if only the other order makes a valid date (`25/12`),
 * that order is used. Returns `null` for anything that is not a real calendar
 * day, or whose year is implausible.
 */
export function parseBirthdayInput(input: string, currentYear: number): BirthdayDate | null {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\bof\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  let day: number;
  let month: number;
  let year: number | undefined;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const numeric = /^(\d{1,2})([/.])(\d{1,2})(?:\2(\d{4}))?$/.exec(text);
  const monthFirst = /^([a-z]+\.?) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/.exec(text);
  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+\.?)(?: (\d{4}))?$/.exec(text);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[3]);
    const valid = (mo: number, d: number) => mo >= 1 && mo <= 12 && d >= 1 && d <= maxDay(mo);
    const primary: [number, number] = numeric[2] === '/' ? [a, b] : [b, a];
    if (valid(primary[0], primary[1])) [month, day] = primary;
    else if (valid(primary[1], primary[0])) [month, day] = [primary[1], primary[0]];
    else return null;
    year = numeric[4] ? Number(numeric[4]) : undefined;
  } else if (monthFirst || dayFirst) {
    const word = monthFirst ? monthFirst[1] : dayFirst![2];
    const found = monthFromWord(word);
    if (found === null) return null;
    month = found;
    day = Number(monthFirst ? monthFirst[2] : dayFirst![1]);
    const y = monthFirst ? monthFirst[3] : dayFirst![3];
    year = y ? Number(y) : undefined;
  } else {
    return null;
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > maxDay(month)) return null;
  if (year !== undefined) {
    if (year < 1900 || year > currentYear) return null;
    if (month === 2 && day === 29 && !isLeapYear(year)) return null;
  }
  return { month, day, year: year ?? null };
}
