import { db, nowISO, uid } from '@/db/schema';
import type { Member } from '@/domain/types';
import { reminderAllowed } from '@/domain/reminders';
import { dateKey, minutesOf } from '@/domain/time';

/** Runs while the child's app is open: one bounded, routine-linked reminder when a window opens. */
export async function runReminderSweep(child: Member, notify: (title: string, body: string) => void, t: (k: string, p?: Record<string, unknown>) => string): Promise<number> {
  const fam = (await db.families.get(child.familyId))!;
  const key = dateKey();
  const tasks = await db.tasks.where('assignedChildIds').equals(child.id).filter((x) => x.active && !x.archived && !x.proposedBy).toArray();
  const subs = await db.submissions.where('[childId+dateKey]').equals([child.id, key]).toArray();
  let sent = 0;
  for (const task of tasks) {
    const existing = await db.reminders.where('[taskId+childId+dateKey]').equals([task.id, child.id, key]).toArray();
    const hasSubmission = subs.some((s) => s.taskId === task.id && s.status !== 'retry');
    if (!reminderAllowed({ settings: fam.settings, child, task, dateKey: key, existing, hasSubmission })) continue;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const kind = minutesOf(task.window.end) - cur <= 30 ? 'closing_soon' : 'window_open';
    await db.reminders.add({ id: uid(), familyId: child.familyId, childId: child.id, taskId: task.id, dateKey: key, kind, createdAt: nowISO() });
    notify(`${task.emoji} ${task.title}`, t(kind === 'closing_soon' ? 'reminder.closingSoon' : 'reminder.windowOpen', { end: task.window.end }));
    sent++;
  }
  return sent;
}

export async function reminderCountToday(childId: string, taskId: string): Promise<number> {
  return db.reminders.where('[taskId+childId+dateKey]').equals([taskId, childId, dateKey()]).count();
}
