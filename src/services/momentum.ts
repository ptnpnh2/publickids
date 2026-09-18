import { db, nowISO } from '@/db/schema';
import type { Member, MomentumConfig, MomentumState } from '@/domain/types';
import { applyReview, capFor, evaluateLevel, levelsFor, nextState, validateMomentumConfig } from '@/domain/momentum';
import { eligiblePointsIn, weeklyBonus } from '@/domain/economy';
import { addDays, dateKey, parseDateKey, weekStart, lastNDateKeys } from '@/domain/time';
import { appendLedger } from './ledger';
import { audit } from './audit';

export function excludedDaysFor(child: Member, now = new Date()): Set<string> {
  const c = child.child!;
  const set = new Set<string>(c.sickDays);
  if (c.vacationUntil) {
    const until = new Date(c.vacationUntil);
    for (const k of lastNDateKeys(60, now)) if (parseDateKey(k).getTime() <= until.getTime() && parseDateKey(k).getTime() >= now.getTime() - 60 * 86_400_000) set.add(k);
  }
  for (const k of lastNDateKeys(60, now)) if (c.appFreeDays.includes(parseDateKey(k).getDay())) set.add(k);
  return set;
}

export async function refreshMomentum(child: Member, now = new Date()): Promise<{ state: MomentumState; promoted: boolean; reviewDue: boolean }> {
  const family = (await db.families.get(child.familyId))!;
  const levels = levelsFor(family.momentum, child.id);
  const tasks = await db.tasks.where('familyId').equals(child.familyId).toArray();
  const stages = await db.taskStages.where('childId').equals(child.id).toArray();
  const submissions = await db.submissions.where('childId').equals(child.id).toArray();
  const freshStartKey = child.child?.freshStartAt ? dateKey(new Date(child.child.freshStartAt)) : undefined;
  const evaluation = evaluateLevel(levels, child.id, tasks, stages, submissions, { now, excludedDays: excludedDaysFor(child, now), freshStartKey });
  const current = (await db.momentum.get(child.id)) ?? { id: child.id, familyId: child.familyId, childId: child.id, levelKey: levels[0].key, since: nowISO(), pausedForReview: false };
  const r = nextState(current, levels, evaluation.qualifiedKey, family.momentum.gracePeriodDays, now);
  await db.momentum.put(r.state);
  if (r.promoted) await audit({ familyId: child.familyId, actorId: 'system', action: 'momentum.promote', targetType: 'momentum', targetId: child.id, after: { level: r.state.levelKey }, childExplanation: 'momentum.explainPromote' });
  return r;
}

/** Parent-child review after the grace period: lower by at most one level; never removes points. */
export async function reviewMomentum(actorId: string, childId: string, lower: boolean): Promise<void> {
  const family = (await db.families.get((await db.members.get(childId))!.familyId))!;
  const state = (await db.momentum.get(childId))!;
  const next = applyReview(state, levelsFor(family.momentum, childId), lower, new Date());
  await db.momentum.put(next);
  await audit({ familyId: family.id, actorId, action: 'momentum.review', targetType: 'momentum', targetId: childId, before: { level: state.levelKey }, after: { level: next.levelKey }, childExplanation: 'momentum.explainReview' });
}

/** Safety-rule incidents pause the bonus for human review. */
export async function pauseMomentum(actorId: string, childId: string, paused: boolean): Promise<void> {
  const state = await db.momentum.get(childId);
  if (!state) return;
  await db.momentum.update(childId, { pausedForReview: paused });
  await audit({ familyId: state.familyId, actorId, action: paused ? 'momentum.pause' : 'momentum.resume', targetType: 'momentum', targetId: childId });
}

/**
 * Close any past weeks that have not been closed: weekly bonus = eligible points ×
 * (coefficient − 1), rounded once, capped. Recorded as a separate ledger entry.
 */
export async function closeWeeks(child: Member, now = new Date()): Promise<number> {
  const family = (await db.families.get(child.familyId))!;
  const state = (await db.momentum.get(child.id)) ?? (await refreshMomentum(child, now)).state;
  const thisWeek = weekStart(now);
  let cursor = state.lastWeekClosed ? dateKey(addDays(parseDateKey(state.lastWeekClosed), 7)) : weekStart(new Date(child.createdAt));
  let closed = 0;
  while (cursor < thisWeek) {
    const end = dateKey(addDays(parseDateKey(cursor), 7));
    const entries = await db.ledger.where('childId').equals(child.id).filter((e) => e.createdAt >= cursor && e.createdAt < end).toArray();
    const eligible = eligiblePointsIn(entries);
    const levels = levelsFor(family.momentum, child.id);
    const level = levels.find((l) => l.key === state.levelKey) ?? levels[0];
    const bonus = state.pausedForReview ? 0 : weeklyBonus(eligible, level.coefficient, capFor(family.momentum, child.id));
    if (bonus !== 0) {
      await appendLedger({ familyId: child.familyId, childId: child.id, kind: 'bonus', amount: bonus, basePoints: eligible, eligibleForBoost: false, coefficient: level.coefficient, reason: `momentum.weeklyBonus`, refType: 'week', refId: cursor, configVersion: family.momentum.version });
    }
    cursor = end;
    closed++;
  }
  if (closed) await db.momentum.update(child.id, { lastWeekClosed: dateKey(addDays(parseDateKey(thisWeek), -7)) });
  return closed;
}

/** Supervisor publishes a configuration: previewed, logged, prospective, child-visible. */
export async function publishMomentumConfig(actorId: string, familyId: string, cfg: MomentumConfig, confirmedWarnings: boolean): Promise<void> {
  const warnings = validateMomentumConfig(cfg);
  if (warnings.length && !confirmedWarnings) throw new Error('momentum.confirmWarnings');
  const family = (await db.families.get(familyId))!;
  const next: MomentumConfig = { ...cfg, version: family.momentum.version + 1, updatedBy: actorId, updatedAt: nowISO() };
  await db.families.update(familyId, { momentum: next });
  await audit({ familyId, actorId, action: 'momentum.config', targetType: 'family', targetId: familyId, before: family.momentum, after: next, childExplanation: 'momentum.explainConfig' });
}
