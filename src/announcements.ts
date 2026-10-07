import { schoolClock } from './schedule.js';

export type BellOverride = { date: string; periods: { number: number; start: number; end: number }[] };

const months: Record<string, number> = {
 januari: 1, january: 1, februari: 2, february: 2, maret: 3, march: 3,
 april: 4, mei: 5, may: 5, juni: 6, june: 6, juli: 7, july: 7,
 agustus: 8, august: 8, september: 9, oktober: 10, october: 10,
 november: 11, desember: 12, december: 12,
};

export function validateBellOverrides(value: unknown): BellOverride[] {
 if (!Array.isArray(value) || value.length > 60) throw new Error('Use at most 60 dated bell schedules.');
 const dates = new Set<string>();
 return value.map(raw => {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid bell schedule.');
  const { date, periods } = raw as Record<string, unknown>;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('A full announcement date is required.');
  const calendar = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date) throw new Error('Invalid announcement date.');
  if (calendar.getUTCDay() === 0 || calendar.getUTCDay() === 6) throw new Error('The announcement date must be a school weekday.');
  if (dates.has(date)) throw new Error('Only one bell schedule is allowed per date.');
  dates.add(date);
  if (!Array.isArray(periods) || !periods.length || periods.length > 10) throw new Error('Include between 1 and 10 numbered timeslots.');
  let previousEnd = 0;
  const clean = periods.map((period, index) => {
   if (!period || typeof period !== 'object') throw new Error('Invalid timeslot.');
   const { number, start, end } = period as Record<string, unknown>;
   if (number !== index + 1) throw new Error('Timeslots must be numbered consecutively from 1, without duplicates.');
   if (typeof start !== 'number' || typeof end !== 'number' || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end >= 1440 || end <= start) throw new Error(`Timeslot ${number} has an invalid time range.`);
   if (index > 0 && start < previousEnd) throw new Error(`Timeslot ${number} overlaps the previous timeslot.`);
   previousEnd = end;
   return { number: index + 1, start, end };
  });
  return { date, periods: clean };
 }).sort((a, b) => a.date.localeCompare(b.date));
}

export function parseAnnouncement(text: string): BellOverride {
 if (!text.trim()) throw new Error('Paste an announcement first.');
 if (text.length > 20000) throw new Error('The announcement is too long (maximum 20,000 characters).');
 const dates = new Set<string>();
 for (const match of text.matchAll(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/gi)) {
  const month = months[match[2].toLowerCase()];
  if (month) dates.add(`${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`);
 }
 for (const match of text.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g)) dates.add(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
 for (const match of text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) dates.add(match[0]);
 if (dates.size !== 1) throw new Error(dates.size ? 'Found multiple dates. Paste one announcement at a time.' : 'Could not find a date. Include a full date such as 7 Oktober 2026.');
 const periods: BellOverride['periods'] = [];
 for (const line of text.split(/\r?\n/)) {
  if (!/^\s*\d+[.)]\s*/.test(line)) continue;
  const match = line.match(/^\s*(\d+)[.)]\s*(\d{1,2})[.:](\d{2})\s*[-–—−]\s*(\d{1,2})[.:](\d{2})\s*$/);
  if (!match) throw new Error(`Could not read this timeslot: ${line.trim()}. Use a format like 1. 07.00 - 07.30.`);
  const [, number, startHour, startMinute, endHour, endMinute] = match;
  if (+startHour > 23 || +endHour > 23 || +startMinute > 59 || +endMinute > 59) throw new Error(`Timeslot ${number} has an invalid clock time.`);
  periods.push({ number: +number, start: +startHour * 60 + +startMinute, end: +endHour * 60 + +endMinute });
 }
 return validateBellOverrides([{ date: [...dates][0], periods }])[0];
}

// Date checks also apply to offline caches, so expiry never needs a running tab or cron job.
export function unexpiredOverrides(overrides: BellOverride[] = [], now = new Date()) {
 return overrides.filter(override => override.date >= schoolClock(now).date);
}
