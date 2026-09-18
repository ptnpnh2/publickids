import type { MomentumConfig, MomentumLevel, MomentumState, Submission, Task, TaskStage } from './types';
import { isScheduledOn, lastNDateKeys } from './time';

export const DEFAULT_MOMENTUM: MomentumConfig = {
  version: 1,
  weeklyCapPct: 15,
  gracePeriodDays: 14,
  levels: [
    { key: 'starting', name: 'Starting', coefficient: 1.0, minPct: 0, windowDays: 0, requiresGraduatedHabit: false, requiresFewerReminders: false },
    { key: 'steady', name: 'Steady', coefficient: 1.05, minPct: 70, windowDays: 14, requiresGraduatedHabit: false, requiresFewerReminders: false },
    { key: 'strong', name: 'Strong', coefficient: 1.1, minPct: 80, windowDays: 28, requiresGraduatedHabit: false, requiresFewerReminders: true },
    { key: 'self_directed', name: 'Self-Directed', coefficient: 1.15, minPct: 85, windowDays: 42, requiresGraduatedHabit: true, requiresFewerReminders: true },
  ],
};

export const MOMENTUM_SKINS: Record<string, string[]> = {
  neutral: ['Starting', 'Steady', 'Strong', 'Self-Directed'],
  space: ['Launchpad', 'Orbit', 'Cruise', 'Pathfinder'],
  garden: ['Seed', 'Sprout', 'Bloom', 'Orchard'],
};

export interface ConfigWarning {
  kind: 'below_one' | 'above_max' | 'cap_high' | 'order';
  levelKey?: string;
  value?: number;
}

/** Warnings shown before a Supervisor publishes a configuration (§1.9). */
export function validateMomentumConfig(cfg: MomentumConfig): ConfigWarning[] {
  const w: ConfigWarning[] = [];
  for (const l of cfg.levels) {
    if (l.coefficient < 1) w.push({ kind: 'below_one', levelKey: l.key, value: l.coefficient });
    if (l.coefficient > 1.25) w.push({ kind: 'above_max', levelKey: l.key, value: l.coefficient });
  }
  if (cfg.weeklyCapPct > 25) w.push({ kind: 'cap_high', value: cfg.weeklyCapPct });
  for (let i = 1; i < cfg.levels.length; i++) {
    if (cfg.levels[i].minPct < cfg.levels[i - 1].minPct) w.push({ kind: 'order', levelKey: cfg.levels[i].key });
  }
  return w;
}

/** Economy-impact forecast: bonus for a typical week at each level. */
export function forecastWeeklyBonus(cfg: MomentumConfig, typicalEligiblePoints: number): { key: string; bonus: number }[] {
  return cfg.levels.map((l) => {
    const raw = typicalEligiblePoints * (l.coefficient - 1);
    const cap = (typicalEligiblePoints * cfg.weeklyCapPct) / 100;
    const bounded = raw >= 0 ? Math.min(raw, cap) : Math.max(raw, -cap);
    return { key: l.key, bonus: Math.round(bounded) };
  });
}

export function levelsFor(cfg: MomentumConfig, childId: string): MomentumLevel[] {
  return cfg.childOverrides?.[childId]?.levels ?? cfg.levels;
}

export function capFor(cfg: MomentumConfig, childId: string): number {
  return cfg.childOverrides?.[childId]?.weeklyCapPct ?? cfg.weeklyCapPct;
}

export interface WindowStats {
  windowDays: number;
  commitments: number;
  met: number;
  pct: number;
  independentStarts: number;
  reminders: number;
}

/**
 * Consistency over a rolling window: "selected commitments" are scheduled,
 * point-earning tasks assigned to the child that were not on a sick day, a
 * vacation day, an app-free day, or before a Fresh Start.
 */
export function windowStats(
  childId: string,
  tasks: Task[],
  stages: TaskStage[],
  submissions: Submission[],
  windowDays: number,
  opts: { now?: Date; excludedDays?: Set<string>; freshStartKey?: string } = {},
): WindowStats {
  const keys = lastNDateKeys(Math.max(windowDays, 1), opts.now ?? new Date()).filter(
    (k) => !opts.excludedDays?.has(k) && (!opts.freshStartKey || k >= opts.freshStartKey),
  );
  const mine = tasks.filter(
    (t) => t.active && !t.archived && t.currency === 'points' && t.assignedChildIds.includes(childId) && t.category !== 'repair',
  );
  const stageOf = (taskId: string) => stages.find((s) => s.taskId === taskId && s.childId === childId)?.stage ?? 'learning';
  let commitments = 0;
  let met = 0;
  let independentStarts = 0;
  let reminders = 0;
  for (const k of keys) {
    for (const t of mine) {
      if (stageOf(t.id) === 'graduated') continue;
      if (!isScheduledOn(t.schedule, k)) continue;
      commitments++;
      const s = submissions.find((x) => x.taskId === t.id && x.childId === childId && x.dateKey === k);
      if (s && s.status === 'approved') {
        met++;
        if (s.independentStart) independentStarts++;
        reminders += s.reminderCount;
      }
    }
  }
  return { windowDays, commitments, met, pct: commitments ? Math.round((met / commitments) * 100) : 0, independentStarts, reminders };
}

export interface LevelEvaluation {
  qualifiedKey: string;
  stats: Record<string, WindowStats>;
}

/** Highest level whose qualification holds; everyone qualifies for the first. */
export function evaluateLevel(
  levels: MomentumLevel[],
  childId: string,
  tasks: Task[],
  stages: TaskStage[],
  submissions: Submission[],
  opts: { now?: Date; excludedDays?: Set<string>; freshStartKey?: string } = {},
): LevelEvaluation {
  const stats: Record<string, WindowStats> = {};
  let qualifiedKey = levels[0]?.key ?? 'starting';
  const hasGraduated = stages.some((s) => s.childId === childId && s.stage === 'graduated');
  for (let i = 1; i < levels.length; i++) {
    const l = levels[i];
    const st = windowStats(childId, tasks, stages, submissions, l.windowDays, opts);
    stats[l.key] = st;
    const enoughData = st.commitments >= Math.min(l.windowDays, 7);
    const fewerReminders = !l.requiresFewerReminders || st.met === 0 || st.reminders / Math.max(st.met, 1) < 0.5;
    const ok = enoughData && st.pct >= l.minPct && fewerReminders && (!l.requiresGraduatedHabit || hasGraduated);
    if (ok) qualifiedKey = l.key;
    else break; // levels are ordered; stop at the first failing rung
  }
  return { qualifiedKey, stats };
}

export function levelIndex(levels: MomentumLevel[], key: string): number {
  return Math.max(0, levels.findIndex((l) => l.key === key));
}

/**
 * Apply the promotion / grace rules to a state:
 * - promotion: immediate, one level at a time, celebrated privately
 * - lower level: only after `gracePeriodDays` and a parent-child review, one level at a time
 */
export function nextState(
  state: MomentumState,
  levels: MomentumLevel[],
  qualifiedKey: string,
  gracePeriodDays: number,
  now: Date,
): { state: MomentumState; promoted: boolean; reviewDue: boolean } {
  const cur = levelIndex(levels, state.levelKey);
  const q = levelIndex(levels, qualifiedKey);
  if (state.pausedForReview) return { state, promoted: false, reviewDue: true };
  if (q > cur) {
    const target = levels[cur + 1].key;
    return { state: { ...state, levelKey: target, since: now.toISOString(), candidateLowerKey: undefined, candidateSince: undefined }, promoted: true, reviewDue: false };
  }
  if (q < cur) {
    const candidateSince = state.candidateSince ?? now.toISOString();
    const days = (now.getTime() - new Date(candidateSince).getTime()) / 86_400_000;
    const reviewDue = days >= gracePeriodDays;
    return { state: { ...state, candidateLowerKey: levels[cur - 1].key, candidateSince }, promoted: false, reviewDue };
  }
  return { state: { ...state, candidateLowerKey: undefined, candidateSince: undefined }, promoted: false, reviewDue: false };
}

/** A review can lower the level by exactly one step; it never removes points. */
export function applyReview(state: MomentumState, levels: MomentumLevel[], lower: boolean, now: Date): MomentumState {
  const cur = levelIndex(levels, state.levelKey);
  const base = { ...state, lastReviewAt: now.toISOString(), pausedForReview: false, candidateLowerKey: undefined, candidateSince: undefined };
  if (lower && cur > 0) return { ...base, levelKey: levels[cur - 1].key, since: now.toISOString() };
  return base;
}
