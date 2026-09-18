import type { DateKey, Schedule } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date = new Date()): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);
}

/** Monday of the week containing `d`, as a DateKey. */
export function weekStart(d: Date): DateKey {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7; // Monday = 0
  r.setDate(r.getDate() - day);
  return dateKey(r);
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export type WindowState = 'before' | 'open' | 'closed';

export function windowState(win: { start: string; end: string }, now: Date = new Date()): WindowState {
  const cur = now.getHours() * 60 + now.getMinutes();
  if (cur < minutesOf(win.start)) return 'before';
  if (cur > minutesOf(win.end)) return 'closed';
  return 'open';
}

export function isScheduledOn(schedule: Schedule, key: DateKey): boolean {
  const d = parseDateKey(key);
  switch (schedule.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return d.getDay() >= 1 && d.getDay() <= 5;
    case 'weekly':
      return (schedule.days ?? []).includes(d.getDay());
    case 'once':
      return schedule.date === key;
  }
}

export function isQuietHours(q: { start: string; end: string }, now: Date = new Date()): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = minutesOf(q.start);
  const e = minutesOf(q.end);
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}

export function lastNDateKeys(n: number, end: Date = new Date()): DateKey[] {
  const keys: DateKey[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(dateKey(addDays(end, -i)));
  return keys;
}
