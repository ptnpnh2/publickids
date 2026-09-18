import { describe, expect, it } from 'vitest';
import { canApplyResponseCost, correctionHeavy, nextIncidentStatus } from './consequences';
import { autoApprovalAllowed, canApprove, isSensitiveTask } from './verification';
import { hamming, looksDuplicate, phashFromGray } from './phash';
import { flagsGenericPraise, praiseOptions } from './praise';
import { buildDigest } from './digest';
import type { Task } from './types';

describe('consequences', () => {
  it('follows Pause → Understand → Repair → Support → Close', () => {
    expect(nextIncidentStatus('pause')).toBe('understand');
    expect(nextIncidentStatus('support')).toBe('closed');
    expect(nextIncidentStatus('closed')).toBeNull();
  });
  it('response cost is off by default and parent-only', () => {
    expect(canApplyResponseCost({ enabled: false, actorRole: 'parent', privilege: 'tv', hours: 2 }).ok).toBe(false);
    expect(canApplyResponseCost({ enabled: true, actorRole: 'nanny', privilege: 'tv', hours: 2 }).ok).toBe(false);
    expect(canApplyResponseCost({ enabled: true, actorRole: 'parent', privilege: 'tv', hours: 200 }).ok).toBe(false);
    expect(canApplyResponseCost({ enabled: true, actorRole: 'parent', privilege: 'tv', hours: 2 }).ok).toBe(true);
  });
  it('flags correction-heavy weeks', () => {
    expect(correctionHeavy(1, 10)).toBe(false);
    expect(correctionHeavy(5, 8)).toBe(true);
  });
});

describe('verification', () => {
  const task: Task = {
    id: 't', familyId: 'f', title: 'Make bed', emoji: '🛏️', category: 'selfcare', currency: 'points', basePoints: 2, fairness: '', microSteps: [], estimatedMinutes: 3,
    completionDefinition: '', window: { start: '07:00', end: '09:00' }, schedule: { type: 'daily' }, proofMethod: 'photo', verificationMode: 'ai_assist', approverTier: 'caregiver',
    assignedChildIds: ['c'], active: true, createdBy: 'p', createdAt: '',
  };
  it('nanny can approve caregiver-tier tasks within the limit only', () => {
    expect(canApprove('nanny', 'caregiver', task, 3, undefined, 'c')).toBe(true);
    expect(canApprove('nanny', 'caregiver', { ...task, basePoints: 5 }, 3, undefined, 'c')).toBe(false);
    expect(canApprove('nanny', 'parent', task, 3, undefined, 'c')).toBe(false);
    expect(canApprove('nanny', 'caregiver', task, 3, ['other'], 'c')).toBe(false);
    expect(canApprove('sponsor', 'caregiver', task, 3, undefined, 'c')).toBe(false);
  });
  it('auto-approval requires history, high confidence and clean signals', () => {
    const ai = { recommendation: 'looks_ok' as const, confidence: 0.9, explanation: '', signals: [], model: 'x', version: '1', at: '' };
    expect(autoApprovalAllowed({ mode: 'auto', tier: 'auto', aiEnabled: true, successfulReviews: 10, minHistory: 10, ai })).toBe(true);
    expect(autoApprovalAllowed({ mode: 'auto', tier: 'auto', aiEnabled: true, successfulReviews: 3, minHistory: 10, ai })).toBe(false);
    expect(autoApprovalAllowed({ mode: 'auto', tier: 'parent', aiEnabled: true, successfulReviews: 10, minHistory: 10, ai })).toBe(false);
    expect(autoApprovalAllowed({ mode: 'auto', tier: 'auto', aiEnabled: true, successfulReviews: 10, minHistory: 10, ai: { ...ai, signals: ['dup'] } })).toBe(false);
  });
  it('rejects sensitive proof templates', () => {
    expect(isSensitiveTask('Take a bath', 'photo of bath')).toBe(true);
    expect(isSensitiveTask('Set the table', 'plates on table')).toBe(false);
  });
});

describe('phash', () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  // A blurred random field: broadband low-frequency content like a real photo.
  const raw = Array.from({ length: 1024 }, () => rnd() * 255);
  const scene = raw.map((_, i) => {
    const x = i % 32;
    const y = Math.floor(i / 32);
    let s = 0;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < 32 && yy >= 0 && yy < 32) {
          s += raw[yy * 32 + xx];
          n++;
        }
      }
    return s / n;
  });
  const noisy = scene.map((v) => v + (rnd() - 0.5) * 8);
  const inverted = scene.map((_, i) => scene[(i * 37) % 1024]);
  it('is stable under small noise and differs for different images', () => {
    const a = phashFromGray(scene);
    expect(a).toHaveLength(16);
    expect(hamming(a, phashFromGray(noisy))).toBeLessThanOrEqual(6);
    expect(looksDuplicate(a, phashFromGray(inverted))).toBe(false);
  });
});

describe('praise coach', () => {
  it('offers observation, strategy and reflection', () => {
    const o = praiseOptions({ taskTitle: 'Make bed', stepsCount: 3, independentStart: true, stage: 'learning', childName: 'Ana' });
    expect(o.map((x) => x.kind)).toEqual(['observation', 'strategy', 'reflection']);
    expect(flagsGenericPraise("You're so smart!")).toBe(true);
    expect(flagsGenericPraise('You remembered all three steps without a reminder')).toBe(false);
  });
});

describe('digest', () => {
  it('suggests simplifying when corrections are frequent', () => {
    const inc = { id: 'i', familyId: 'f', childId: 'c', description: '', status: 'closed' as const, createdBy: 'p', createdAt: '', coolingOffUntil: '', causes: [] };
    const d = buildDigest({ tasks: [], submissions: [], prevSubmissions: [], incidents: [inc, inc, inc], approvalDelaysMin: [] });
    expect(d.suggestion.key).toBe('digest.suggest.simplify');
  });
});
