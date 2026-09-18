import { describe, expect, it } from 'vitest';
import { DEFAULT_MOMENTUM, applyReview, evaluateLevel, forecastWeeklyBonus, nextState, validateMomentumConfig } from './momentum';
import type { MomentumState, Submission, Task, TaskStage } from './types';
import { dateKey, addDays } from './time';

const task = (id: string): Task => ({
  id, familyId: 'f', title: id, emoji: '🧹', category: 'routine', currency: 'points', basePoints: 2, fairness: '', microSteps: [],
  estimatedMinutes: 5, completionDefinition: '', window: { start: '07:00', end: '20:00' }, schedule: { type: 'daily' }, proofMethod: 'self_check',
  verificationMode: 'manual', approverTier: 'caregiver', assignedChildIds: ['c'], active: true, createdBy: 'p', createdAt: new Date().toISOString(),
});

function subs(taskId: string, days: number, approvedEvery: number, now: Date): Submission[] {
  const out: Submission[] = [];
  for (let i = 0; i < days; i++) {
    if (i % approvedEvery !== 0) continue;
    const key = dateKey(addDays(now, -i));
    out.push({ id: `${taskId}${i}`, familyId: 'f', taskId, childId: 'c', dateKey: key, status: 'approved', proofMethod: 'self_check', submittedAt: '', reminderCount: 0, independentStart: true });
  }
  return out;
}

describe('validateMomentumConfig', () => {
  it('has no warnings for the recommended defaults', () => {
    expect(validateMomentumConfig(DEFAULT_MOMENTUM)).toEqual([]);
  });
  it('warns for coefficients below 1.00, above 1.25 and high caps', () => {
    const cfg = { ...DEFAULT_MOMENTUM, weeklyCapPct: 40, levels: DEFAULT_MOMENTUM.levels.map((l, i) => ({ ...l, coefficient: i === 1 ? 0.9 : i === 2 ? 1.4 : l.coefficient })) };
    const kinds = validateMomentumConfig(cfg).map((w) => w.kind);
    expect(kinds).toContain('below_one');
    expect(kinds).toContain('above_max');
    expect(kinds).toContain('cap_high');
  });
});

describe('evaluateLevel', () => {
  const now = new Date(2026, 8, 17, 12);
  it('starts everyone at the first level', () => {
    const r = evaluateLevel(DEFAULT_MOMENTUM.levels, 'c', [task('t')], [], [], { now });
    expect(r.qualifiedKey).toBe('starting');
  });
  it('promotes to steady at 70%+ over 14 days', () => {
    const r = evaluateLevel(DEFAULT_MOMENTUM.levels, 'c', [task('t')], [], subs('t', 14, 1, now), { now });
    expect(['steady', 'strong']).toContain(r.qualifiedKey);
  });
  it('does not reach self-directed without a graduated habit', () => {
    const r = evaluateLevel(DEFAULT_MOMENTUM.levels, 'c', [task('t')], [], subs('t', 42, 1, now), { now });
    expect(r.qualifiedKey).toBe('strong');
    const stages: TaskStage[] = [{ id: 'x', familyId: 'f', taskId: 'other', childId: 'c', stage: 'graduated', since: '' }];
    expect(evaluateLevel(DEFAULT_MOMENTUM.levels, 'c', [task('t')], stages, subs('t', 42, 1, now), { now }).qualifiedKey).toBe('self_directed');
  });
  it('ignores sick days and days before a Fresh Start', () => {
    const excluded = new Set([dateKey(addDays(now, -1)), dateKey(addDays(now, -2))]);
    const r = evaluateLevel(DEFAULT_MOMENTUM.levels, 'c', [task('t')], [], subs('t', 14, 1, now), { now, excludedDays: excluded });
    expect(r.stats.steady.commitments).toBe(12);
  });
});

describe('nextState', () => {
  const now = new Date();
  const state: MomentumState = { id: 'c', familyId: 'f', childId: 'c', levelKey: 'strong', since: '', pausedForReview: false };
  it('promotes one level at a time', () => {
    const r = nextState({ ...state, levelKey: 'starting' }, DEFAULT_MOMENTUM.levels, 'strong', 14, now);
    expect(r.promoted).toBe(true);
    expect(r.state.levelKey).toBe('steady');
  });
  it('never demotes automatically; flags review after grace', () => {
    const r1 = nextState(state, DEFAULT_MOMENTUM.levels, 'starting', 14, now);
    expect(r1.state.levelKey).toBe('strong');
    expect(r1.reviewDue).toBe(false);
    const later = new Date(now.getTime() + 15 * 86_400_000);
    const r2 = nextState(r1.state, DEFAULT_MOMENTUM.levels, 'starting', 14, later);
    expect(r2.state.levelKey).toBe('strong');
    expect(r2.reviewDue).toBe(true);
    const reviewed = applyReview(r2.state, DEFAULT_MOMENTUM.levels, true, later);
    expect(reviewed.levelKey).toBe('steady');
  });
});

describe('forecast', () => {
  it('shows per-level bonus for a typical week', () => {
    expect(forecastWeeklyBonus(DEFAULT_MOMENTUM, 40).map((f) => f.bonus)).toEqual([0, 2, 4, 6]);
  });
});
