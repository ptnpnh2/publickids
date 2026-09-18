import type { BasePoints, LedgerEntry, Task, TaskCategory, Stage } from './types';

export const BASE_POINT_OPTIONS: BasePoints[] = [1, 2, 3, 5];

/** Categories that may carry the Consistency Boost. Money-eligible jobs, grades,
 *  kindness, repair and graduated habits are excluded (§1.9). */
export function isBoostEligible(task: Pick<Task, 'category' | 'currency'>, stage: Stage): boolean {
  if (task.currency !== 'points') return false;
  if (stage === 'graduated') return false;
  const eligible: TaskCategory[] = ['routine', 'learning', 'contribution', 'selfcare'];
  return eligible.includes(task.category);
}

/** Suggest a base value from time, effort, complexity and independence — never age. */
export function suggestBasePoints(input: {
  estimatedMinutes: number;
  effort: 1 | 2 | 3;
  complexity: 1 | 2 | 3;
  independence: 1 | 2 | 3;
}): BasePoints {
  const time = input.estimatedMinutes <= 5 ? 1 : input.estimatedMinutes <= 15 ? 2 : 3;
  const score = time + input.effort + input.complexity + input.independence; // 4..12
  if (score <= 5) return 1;
  if (score <= 7) return 2;
  if (score <= 9) return 3;
  return 5;
}

export function fairnessText(points: BasePoints): string {
  return { 1: 'fairness.1', 2: 'fairness.2', 3: 'fairness.3', 5: 'fairness.5' }[points];
}

/** Balance is the sum of all signed ledger amounts for a child. */
export function balanceOf(entries: LedgerEntry[], childId: string): number {
  return entries.filter((e) => e.childId === childId).reduce((s, e) => s + e.amount, 0);
}

export function canSpend(entries: LedgerEntry[], childId: string, cost: number): boolean {
  return cost >= 0 && balanceOf(entries, childId) >= cost;
}

/**
 * Weekly Consistency Boost bonus (§1.9): eligible points × (coefficient − 1),
 * rounded once and capped at `capPct` % of eligible points. Never compounds and
 * never goes below zero unless a Supervisor explicitly configured a coefficient
 * below 1.00 (in which case the app already warned and confirmed).
 */
export function weeklyBonus(eligiblePoints: number, coefficient: number, capPct: number): number {
  if (eligiblePoints <= 0) return 0;
  const raw = eligiblePoints * (coefficient - 1);
  const cap = (eligiblePoints * capPct) / 100;
  const bounded = raw >= 0 ? Math.min(raw, cap) : Math.max(raw, -cap);
  return Math.round(bounded);
}

/** Sum of eligible base points earned in a set of ledger entries. */
export function eligiblePointsIn(entries: LedgerEntry[]): number {
  return entries
    .filter((e) => e.kind === 'earn' && e.eligibleForBoost)
    .reduce((s, e) => s + (e.basePoints ?? e.amount), 0);
}

/** Goal milestones crossed when saved points move from `before` to `after`. */
export function milestonesCrossed(target: number, before: number, after: number): number[] {
  if (target <= 0) return [];
  const out: number[] = [];
  for (const pct of [25, 50, 75, 100]) {
    const threshold = (target * pct) / 100;
    if (before < threshold && after >= threshold) out.push(pct);
  }
  return out;
}

/** Estimate weeks to reach a goal from normal weeks — not grinding. */
export function weeksToGoal(remaining: number, avgWeeklyPoints: number): number | null {
  if (remaining <= 0) return 0;
  if (avgWeeklyPoints <= 0) return null;
  return Math.ceil(remaining / avgWeeklyPoints);
}
