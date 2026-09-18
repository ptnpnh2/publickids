import { describe, expect, it } from 'vitest';
import { jarBalances, monthlyInterest, splitAcrossJars, validateJars } from './money';
import { makeNonce, nonceValid, videoWithinCaps } from './nonce';
import { DEFAULT_CAMERA, canRequestClip, zoneAllowed } from './camera';
import { castleTiles, SEASONS, seasonProgress } from './quests';
import { passagePlausible, quizScore, reflectionDue } from './reading';
import { balanceReview } from './balance';
import { reminderAllowed } from './reminders';
import { BASE_SETTINGS } from './presets';
import type { Member, MoneyEntry, Task } from './types';

describe('money ledger', () => {
  it('splits across jars with remainder to save and validates percentages', () => {
    expect(splitAcrossJars(10, { save: 50, spend: 40, give: 10 })).toEqual({ save: 5, spend: 4, give: 1 });
    expect(splitAcrossJars(1, { save: 50, spend: 40, give: 10 })).toEqual({ save: 0.5, spend: 0.4, give: 0.1 });
    expect(validateJars({ save: 50, spend: 40, give: 10 })).toBe(true);
    expect(validateJars({ save: 50, spend: 40, give: 20 })).toBe(false);
  });
  it('tracks jar balances per child and monthly interest', () => {
    const e = (jar: MoneyEntry['jar'], amount: number): MoneyEntry => ({ id: 'x', familyId: 'f', childId: 'c', kind: 'earn', amount, jar, reason: '', settled: false, createdAt: '' });
    expect(jarBalances([e('save', 5), e('spend', 4), e('save', -2)], 'c')).toEqual({ save: 3, spend: 4, give: 0 });
    expect(monthlyInterest(50, 2)).toBe(1);
    expect(monthlyInterest(0, 2)).toBe(0);
  });
});

describe('nonce video proofs', () => {
  it('issues a word+number that expires in 10 minutes', () => {
    const now = new Date('2026-09-18T10:00:00Z');
    const n = makeNonce(() => 0.5, now);
    expect(n.code).toMatch(/^[a-z]+ \d{2}$/);
    expect(nonceValid(n, new Date('2026-09-18T10:05:00Z'))).toBe(true);
    expect(nonceValid(n, new Date('2026-09-18T10:11:00Z'))).toBe(false);
    expect(nonceValid(undefined)).toBe(false);
  });
  it('caps video length and size', () => {
    expect(videoWithinCaps(30, 1_000_000)).toBe(true);
    expect(videoWithinCaps(61, 1_000_000)).toBe(false);
    expect(videoWithinCaps(30, 30_000_000)).toBe(false);
  });
});

describe('camera connector guardrails', () => {
  const task: Pick<Task, 'category' | 'exercise' | 'proofMethod'> = { category: 'learning', exercise: { kind: 'pushups', reps: 10 }, proofMethod: 'video' };
  const camera = { id: 'cam', name: 'Mat', zone: 'living room mat', window: { start: '00:00', end: '23:59' }, childAssent: { c: '2026-01-01' } };
  const settings = { ...DEFAULT_CAMERA, enabled: true, parentConsentAt: '2026-01-01', cameras: [camera] };
  it('refuses sensitive zones', () => {
    expect(zoneAllowed('living room mat')).toBe(true);
    expect(zoneAllowed('bedroom corner')).toBe(false);
    expect(zoneAllowed('bathroom')).toBe(false);
  });
  it('is off by default and needs consent, assent, eligibility, window and limits', () => {
    expect(canRequestClip({ settings: DEFAULT_CAMERA, camera, childId: 'c', task, clipsToday: 0, seconds: 20 }).reason).toBe('disabled');
    expect(canRequestClip({ settings: { ...settings, parentConsentAt: undefined }, camera, childId: 'c', task, clipsToday: 0, seconds: 20 }).reason).toBe('no_consent');
    expect(canRequestClip({ settings, camera, childId: 'other', task, clipsToday: 0, seconds: 20 }).reason).toBe('no_assent');
    expect(canRequestClip({ settings, camera, childId: 'c', task: { ...task, exercise: undefined }, clipsToday: 0, seconds: 20 }).reason).toBe('not_eligible');
    expect(canRequestClip({ settings, camera, childId: 'c', task, clipsToday: 5, seconds: 20 }).reason).toBe('limit');
    expect(canRequestClip({ settings, camera, childId: 'c', task, clipsToday: 0, seconds: 90 }).reason).toBe('clip_length');
    expect(canRequestClip({ settings, camera, childId: 'c', task, clipsToday: 0, seconds: 20 }).ok).toBe(true);
  });
});

describe('quests never expire or decay', () => {
  it('unlocks creatures and gear monotonically', () => {
    const p0 = seasonProgress(SEASONS[0], 0);
    const p1 = seasonProgress(SEASONS[0], 12);
    expect(p0.done).toBe(0);
    expect(p1.done).toBeGreaterThan(p0.done);
    expect(p1.next?.at).toBeGreaterThan(12);
    expect(castleTiles(9)).toHaveLength(2);
  });
});

describe('reading reflection', () => {
  it('is occasional, never every session', () => {
    expect(reflectionDue(1, 3)).toBe(false);
    expect(reflectionDue(3, 3)).toBe(true);
    expect(reflectionDue(3, 0)).toBe(false);
  });
  it('gives soft signals only', () => {
    expect(passagePlausible('fox jumped over the lazy dog today', 'The quick brown fox jumped over the lazy dog today.')).toBe('match');
    expect(passagePlausible('short', 'x')).toBe('unknown');
    expect(quizScore(['Paris', 'blue'], [{ q: 'Capital?', a: 'paris' }, { q: 'Color?', a: 'red' }])).toBe(50);
  });
});

describe('balance review', () => {
  it('flags high proof burden and bonus ratio', () => {
    const sub = (proof: string, ledger?: string) => ({ id: Math.random().toString(), familyId: 'f', taskId: 't', childId: 'c', dateKey: '2026-09-01', status: 'approved' as const, proofMethod: proof as 'photo', submittedAt: '', reminderCount: 0, independentStart: true, ledgerEntryId: ledger });
    const m = balanceReview({ tasks: [], submissions: [sub('photo', 'l'), sub('photo', 'l'), sub('self_check', 'l')], ledger: [{ id: '1', familyId: 'f', childId: 'c', kind: 'earn', amount: 10, reason: '', createdAt: '' }, { id: '2', familyId: 'f', childId: 'c', kind: 'bonus', amount: 2, reason: '', createdAt: '' }], audit: [], momentum: [], levelKeys: ['starting'] });
    expect(m.find((x) => x.key === 'proofBurden')!.status).toBe('act');
    expect(m.find((x) => x.key === 'bonusRatio')!.status).toBe('act');
  });
});

describe('bounded reminders', () => {
  const child = { id: 'c', child: { appFreeDays: [], independenceMode: false, fadingReminders: false, independence: 'shared' } } as unknown as Member;
  const task = { schedule: { type: 'daily' }, window: { start: '00:00', end: '23:59' } } as Task;
  const now = new Date(2026, 8, 18, 12, 0);
  it('allows one reminder per task by default and none once submitted or in quiet hours', () => {
    const settings = { ...BASE_SETTINGS, quietHours: { start: '20:00', end: '07:00' } };
    expect(reminderAllowed({ settings, child, task, dateKey: '2026-09-18', existing: [], hasSubmission: false, now })).toBe(true);
    expect(reminderAllowed({ settings, child, task, dateKey: '2026-09-18', existing: [{} as never], hasSubmission: false, now })).toBe(false);
    expect(reminderAllowed({ settings, child, task, dateKey: '2026-09-18', existing: [], hasSubmission: true, now })).toBe(false);
    expect(reminderAllowed({ settings, child, task, dateKey: '2026-09-18', existing: [], hasSubmission: false, now: new Date(2026, 8, 18, 22, 0) })).toBe(false);
  });
  it('fades to zero for self-planning independence mode', () => {
    const c2 = { ...child, child: { ...child.child, independenceMode: true, independence: 'self' } } as unknown as Member;
    expect(reminderAllowed({ settings: BASE_SETTINGS, child: c2, task, dateKey: '2026-09-18', existing: [], hasSubmission: false, now })).toBe(false);
  });
});
