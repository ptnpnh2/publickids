import { describe, expect, it } from 'vitest';
import { balanceOf, isBoostEligible, milestonesCrossed, suggestBasePoints, weeklyBonus } from './economy';
import type { LedgerEntry } from './types';

describe('weeklyBonus', () => {
  it('multiplies eligible points by (coefficient - 1) and rounds once', () => {
    expect(weeklyBonus(40, 1.05, 15)).toBe(2);
    expect(weeklyBonus(40, 1.1, 15)).toBe(4);
    expect(weeklyBonus(40, 1.15, 15)).toBe(6);
  });
  it('caps at the weekly cap percentage and never compounds', () => {
    expect(weeklyBonus(100, 1.5, 15)).toBe(15);
    expect(weeklyBonus(0, 1.5, 15)).toBe(0);
  });
  it('bounds negative coefficients symmetrically (Supervisor-confirmed only)', () => {
    expect(weeklyBonus(100, 0.5, 15)).toBe(-15);
  });
});

describe('boost eligibility', () => {
  it('excludes money-eligible jobs, repair, acknowledgment-only and graduated habits', () => {
    expect(isBoostEligible({ category: 'extra_job', currency: 'points' }, 'learning')).toBe(false);
    expect(isBoostEligible({ category: 'repair', currency: 'points' }, 'learning')).toBe(false);
    expect(isBoostEligible({ category: 'routine', currency: 'ack' }, 'learning')).toBe(false);
    expect(isBoostEligible({ category: 'routine', currency: 'points' }, 'graduated')).toBe(false);
    expect(isBoostEligible({ category: 'routine', currency: 'points' }, 'practicing')).toBe(true);
  });
});

describe('suggestBasePoints', () => {
  it('uses 1/2/3/5 only and never age', () => {
    expect(suggestBasePoints({ estimatedMinutes: 3, effort: 1, complexity: 1, independence: 1 })).toBe(1);
    expect(suggestBasePoints({ estimatedMinutes: 30, effort: 3, complexity: 3, independence: 3 })).toBe(5);
    expect([1, 2, 3, 5]).toContain(suggestBasePoints({ estimatedMinutes: 10, effort: 2, complexity: 2, independence: 1 }));
  });
});

describe('balance and milestones', () => {
  const e = (childId: string, amount: number): LedgerEntry => ({
    id: Math.random().toString(36), familyId: 'f', childId, kind: 'earn', amount, reason: 'x', createdAt: new Date().toISOString(),
  });
  it('sums signed amounts per child', () => {
    expect(balanceOf([e('a', 3), e('a', -1), e('b', 5)], 'a')).toBe(2);
  });
  it('reports 25/50/75/100 crossings', () => {
    expect(milestonesCrossed(100, 20, 55)).toEqual([25, 50]);
    expect(milestonesCrossed(100, 99, 100)).toEqual([100]);
    expect(milestonesCrossed(100, 10, 12)).toEqual([]);
  });
});
