// Dependency-free tests for the pure logic: date/time parsing in task text,
// birthday maths, tolerant JSON extraction and settings normalisation.
// Run with `npm test`. Every case passes an explicit "today", so results do not
// depend on the day the suite runs.
import {
  parseBirthdayInput,
  isBirthdayOn,
  nextOccurrenceISO,
  daysUntilBirthday,
  turningAge,
  formatBirthday,
} from '../src/utils/birthday';
import {
  parseRelativeDate,
  formatDayHeading,
  formatDateHint,
  weekdayShort,
} from '../src/utils/date';
import { extractJson } from '../src/utils/json';
import { normalizeAISettings, isConfigured } from '../src/types/ai';
import { DEFAULT_SETTINGS, VOCAB_LANGUAGES } from '../src/types/settings';

let failed = 0;
let passed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    failed++;
    console.log(`FAIL ${name}\n   got  ${g}\n   want ${w}`);
  } else passed++;
}

// 2026-11-11 is a Wednesday.
const T = '2026-11-11';
const p = (s: string) => parseRelativeDate(s, T);

// --- task tail parsing
eq('no date', p('buy bread'), { text: 'buy bread' });
eq('tomorrow', p('call the workshop tomorrow'), { text: 'call the workshop', date: '2026-11-12' });
eq('tomorrow + 24h time', p('call the workshop tomorrow 15:00'), { text: 'call the workshop', date: '2026-11-12', time: '15:00' });
eq('time before date', p('call the workshop 15:00 tomorrow'), { text: 'call the workshop', date: '2026-11-12', time: '15:00' });
eq('3pm', p('call Sam at 3pm'), { text: 'call Sam', time: '15:00' });
eq('3:30pm fri', p('dentist fri 3:30pm'), { text: 'dentist', date: '2026-11-13', time: '15:30' });
eq('12am', p('launch 12am'), { text: 'launch', time: '00:00' });
eq('12pm', p('lunch 12pm'), { text: 'lunch', time: '12:00' });
eq('noon', p('lunch tomorrow noon'), { text: 'lunch', date: '2026-11-12', time: '12:00' });
eq('today', p('finish report today'), { text: 'finish report', date: T });
eq('weekday short', p('gym mon'), { text: 'gym', date: '2026-11-16' });
eq('weekday full', p('gym Saturday'), { text: 'gym', date: '2026-11-14' });
eq('same weekday -> next week', p('review wed'), { text: 'review', date: '2026-11-18' });
eq('on friday strips "on"', p('ship it on friday'), { text: 'ship it', date: '2026-11-13' });
eq('by fri strips "by"', p('pay rent by fri'), { text: 'pay rent', date: '2026-11-13' });
eq('plus days', p('follow up +3'), { text: 'follow up', date: '2026-11-14' });
eq('iso', p('renew passport 2027-01-05'), { text: 'renew passport', date: '2027-01-05' });
eq('slash month first', p('party 12/25'), { text: 'party', date: '2026-12-25' });
eq('slash past -> next year', p('taxes 4/15'), { text: 'taxes', date: '2027-04-15' });
eq('slash with year', p('trip 3/12/2027'), { text: 'trip', date: '2027-03-12' });
eq('slash unambiguous day first', p('party 25/12'), { text: 'party', date: '2026-12-25' });
eq('dot day first', p('party 25.12'), { text: 'party', date: '2026-12-25' });
eq('dot ambiguous day first', p('visit 05.12'), { text: 'visit', date: '2026-12-05' });
eq('month name', p('gifts dec 20'), { text: 'gifts', date: '2026-12-20' });
eq('day month', p('gifts 20 dec'), { text: 'gifts', date: '2026-12-20' });
eq('ordinal + full month', p('gifts december 20th'), { text: 'gifts', date: '2026-12-20' });
eq('month name with year', p('conference mar 3 2027'), { text: 'conference', date: '2027-03-03' });
eq('month name + time', p('flight dec 20 6am'), { text: 'flight', date: '2026-12-20', time: '06:00' });
eq('month name past -> next year', p('renew jan 5'), { text: 'renew', date: '2027-01-05' });
eq('invalid date left alone', p('odd 2/30'), { text: 'odd 2/30' });
eq('impossible ISO date is left as text', p('x 2027-02-29'), { text: 'x 2027-02-29' });
eq('date word mid-sentence is not consumed', p('tomorrow never dies'), { text: 'tomorrow never dies' });
eq('number alone is not a date', p('buy 5'), { text: 'buy 5' });
eq('only a date -> empty text', p('tomorrow'), { text: '', date: '2026-11-12' });
eq('does not strip a lone preposition word', p('at 3pm'), { text: 'at', time: '15:00' });
eq('empty', p('   '), { text: '' });

// --- formatting
eq('day heading', formatDayHeading('2026-05-29'), 'May 29');
eq('weekday', weekdayShort('2026-11-11'), 'Wed');
eq('hint', formatDateHint('2026-09-11'), 'Fri, Sep 11');

// --- birthdays
const b = (s: string) => parseBirthdayInput(s, 2026);
eq('bd Mar 12', b('Mar 12'), { month: 3, day: 12, year: null });
eq('bd March 12, 1990', b('March 12, 1990'), { month: 3, day: 12, year: 1990 });
eq('bd 12 Mar 1990', b('12 Mar 1990'), { month: 3, day: 12, year: 1990 });
eq('bd 12th of March', b('12th of March'), { month: 3, day: 12, year: null });
eq('bd Sept. 3', b('Sept. 3'), { month: 9, day: 3, year: null });
eq('bd may', b('May 9'), { month: 5, day: 9, year: null });
eq('bd iso', b('1990-03-12'), { month: 3, day: 12, year: 1990 });
eq('bd slash M/D', b('3/12'), { month: 3, day: 12, year: null });
eq('bd slash M/D/Y', b('3/12/1990'), { month: 3, day: 12, year: 1990 });
eq('bd slash unambiguous D/M', b('25/12'), { month: 12, day: 25, year: null });
eq('bd dot D.M', b('12.03.1990'), { month: 3, day: 12, year: 1990 });
eq('bd 31 apr invalid', b('Apr 31'), null);
eq('bd feb 29 no year ok', b('Feb 29'), { month: 2, day: 29, year: null });
eq('bd feb 29 non-leap invalid', b('Feb 29 1999'), null);
eq('bd future year invalid', b('Jan 1 2030'), null);
eq('bd two-letter month rejected', b('ma 5'), null);
eq('bd garbage', b('someday'), null);
eq('bd empty', b(' '), null);

const anna = { month: 11, day: 11, year: 1990 };
eq('bd today', isBirthdayOn(anna, T), true);
eq('bd next after', nextOccurrenceISO(anna, '2026-11-12'), '2027-11-11');
eq('bd days until', daysUntilBirthday({ month: 12, day: 3 }, T), 22);
eq('bd leap on feb 28', isBirthdayOn({ month: 2, day: 29 }, '2027-02-28'), true);
eq('bd age', turningAge(anna, T), 36);
eq('bd format', formatBirthday(anna), 'November 11, 1990');
eq('bd format no year', formatBirthday({ month: 5, day: 9 }), 'May 9');

// --- misc
eq('json fenced', extractJson('```json\n{"a":1}\n```'), { a: 1 });
eq('default language', DEFAULT_SETTINGS.vocabLanguage, 'Spanish');
eq('english not offered', VOCAB_LANGUAGES.includes('English'), false);
eq('turkish offered', VOCAB_LANGUAGES.includes('Turkish'), true);
eq('default language is in the list', VOCAB_LANGUAGES.includes(DEFAULT_SETTINGS.vocabLanguage), true);
eq('fresh settings not configured', isConfigured(normalizeAISettings(null)), false);
eq('perms shape', normalizeAISettings({ permissions: { tasks: false, attic: true, calendar: true } }).permissions, { tasks: false, attic: true });

console.log(failed === 0 ? `ALL ${passed} PASSED` : `${failed} FAILED, ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
