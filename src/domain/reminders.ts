import type { FamilySettings, Member, Reminder, Task } from './types';
import { isQuietHours, isScheduledOn, windowState } from './time';

/** Bounded reminders (§2.7-7): one per task by default, quiet hours, school/holiday modes, fading in Independence Mode. */
export function reminderAllowed(input: {
  settings: FamilySettings;
  child: Member;
  task: Task;
  dateKey: string;
  existing: Reminder[]; // today's reminders for this task
  hasSubmission: boolean;
  now?: Date;
}): boolean {
  const { settings, child, task } = input;
  const now = input.now ?? new Date();
  if (input.hasSubmission) return false;
  if (!isScheduledOn(task.schedule, input.dateKey)) return false;
  if (windowState(task.window, now) !== 'open') return false;
  if (isQuietHours(settings.quietHours, now)) return false;
  if (settings.holidayMode) return false;
  const c = child.child;
  if (c?.appFreeDays.includes(now.getDay())) return false;
  if (c?.vacationUntil && new Date(c.vacationUntil) > now) return false;
  let cap = settings.remindersPerTask;
  if (c?.independenceMode || c?.fadingReminders) cap = Math.min(cap, 1);
  if (c?.independenceMode && c.independence === 'self') cap = 0;
  return input.existing.length < cap;
}
