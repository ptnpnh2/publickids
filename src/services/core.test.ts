import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/schema';
import { addChild, createFamily } from './family';
import { loginAdult, loginChild, elevate } from './auth';
import { createTask, setStage } from './tasks';
import { approveSubmission, requestRetry, submitTask, appeal, resolveAppeal, requestHelp } from './submissions';
import { childBalance } from './ledger';
import { createGoal, createReward, redeemReward, resolveRedemption, saveToGoal } from './rewards';
import { closeWeeks, publishMomentumConfig, refreshMomentum } from './momentum';
import { openIncident, advanceIncident, applyResponseCost } from './incidents';
import { DEFAULT_MOMENTUM } from '@/domain/momentum';
import { requestPayout, markSettled } from './money';
import { jarBalances } from '@/domain/money';
import type { Task } from '@/domain/types';

async function setup() {
  const { family, parent, recoveryCodes } = await createFamily({ familyName: 'Test', locale: 'en', parentName: 'Pat', email: 'p@x.io', password: 'secret123', superUserPassword: 'super123' });
  const child = await addChild({ familyId: family.id, name: 'Ana', emoji: '🦊', band: '7-9', pin: '1234', locale: 'en', actorId: parent.id });
  const base: Omit<Task, 'id' | 'createdAt' | 'createdBy'> = {
    familyId: family.id, title: 'Make bed', emoji: '🛏️', category: 'selfcare', currency: 'points', basePoints: 2, fairness: 'fairness.2', microSteps: ['a', 'b'],
    estimatedMinutes: 3, completionDefinition: 'Bed is flat', window: { start: '00:00', end: '23:59' }, schedule: { type: 'daily' }, proofMethod: 'self_check',
    verificationMode: 'manual', approverTier: 'caregiver', assignedChildIds: [child.id], active: true,
  };
  const task = await createTask(parent.id, base);
  return { family, parent, child, task, recoveryCodes, base };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('core family loop', () => {
  it('logs in adults and children', async () => {
    const { child, recoveryCodes, family } = await setup();
    expect(await loginAdult('p@x.io', 'secret123')).not.toBeNull();
    expect(await loginAdult('p@x.io', 'wrong')).toBeNull();
    expect(await loginChild(child.id, '1234')).not.toBeNull();
    expect(await loginChild(child.id, '0000')).toBeNull();
    expect(await elevate(family.id, 'super123')).toBe('superuser');
    expect(await elevate(family.id, recoveryCodes[0])).toBe('recovery');
    expect(await elevate(family.id, recoveryCodes[0])).toBeNull(); // single use
  });

  it('submit → approve → points → redeem → goal', async () => {
    const { parent, child, task, family } = await setup();
    const sub = await submitTask({ task, child, proofMethod: 'self_check' });
    expect(sub.status).toBe('submitted');
    await approveSubmission(parent.id, sub.id, { feedback: 'You remembered both steps.' });
    expect(await childBalance(child.id)).toBe(2);
    const reward = await createReward(parent.id, { familyId: family.id, title: 'Story', emoji: '📚', section: 'quick', cost: 1, availability: 'always', status: 'active' });
    const red = await redeemReward(child.id, reward.id);
    expect(await childBalance(child.id)).toBe(1);
    await resolveRedemption(parent.id, red.id, 'declined');
    expect(await childBalance(child.id)).toBe(2);
    const goal = await createGoal(parent.id, { familyId: family.id, childId: child.id, title: 'Lego', emoji: '🧱', targetPoints: 4, primary: true, status: 'active' });
    expect(await saveToGoal(child.id, goal.id, 2)).toEqual([25, 50]);
    expect(await childBalance(child.id)).toBe(0);
    await expect(redeemReward(child.id, reward.id)).rejects.toThrow('reward.notEnough');
  });

  it('never allows the balance below zero and keeps the ledger append-only', async () => {
    const { parent, child, task, family } = await setup();
    const sub = await submitTask({ task, child, proofMethod: 'self_check' });
    await approveSubmission(parent.id, sub.id);
    const reward = await createReward(parent.id, { familyId: family.id, title: 'Big', emoji: '🎁', section: 'save_for', cost: 50, availability: 'always', status: 'active' });
    await expect(redeemReward(child.id, reward.id)).rejects.toThrow();
    expect(await db.ledger.count()).toBe(1);
  });

  it('retry path and appeal restore the intended reward', async () => {
    const { parent, child, task } = await setup();
    const sub = await submitTask({ task, child, proofMethod: 'self_check' });
    await requestRetry(parent.id, sub.id, 'needs a look');
    expect((await db.submissions.get(sub.id))!.status).toBe('retry');
    await appeal(child.id, sub.id, 'I did it');
    await resolveAppeal(parent.id, sub.id, true);
    expect((await db.submissions.get(sub.id))!.status).toBe('approved');
    expect(await childBalance(child.id)).toBe(2);
  });

  it('help requests are not failures and earn nothing silently', async () => {
    const { child, task } = await setup();
    const h = await requestHelp(task, child, 'too_hard');
    expect(h.status).toBe('help');
    expect(await childBalance(child.id)).toBe(0);
  });

  it('graduated habits earn acknowledgment only', async () => {
    const { parent, child, task } = await setup();
    await setStage(parent.id, task.id, child.id, 'graduated', true);
    const sub = await submitTask({ task, child, proofMethod: 'self_check' });
    await approveSubmission(parent.id, sub.id);
    expect(await childBalance(child.id)).toBe(0);
    expect((await db.submissions.get(sub.id))!.status).toBe('approved');
  });

  it('momentum starts at the first level and weekly close adds no bonus there', async () => {
    const { child } = await setup();
    const r = await refreshMomentum(child);
    expect(r.state.levelKey).toBe('starting');
    expect(await closeWeeks(child)).toBe(0);
  });

  it('supervisor config below 1.00 requires confirmation', async () => {
    const { parent, family } = await setup();
    const cfg = { ...DEFAULT_MOMENTUM, levels: DEFAULT_MOMENTUM.levels.map((l, i) => (i === 1 ? { ...l, coefficient: 0.9 } : l)) };
    await expect(publishMomentumConfig(parent.id, family.id, cfg, false)).rejects.toThrow('momentum.confirmWarnings');
    await publishMomentumConfig(parent.id, family.id, cfg, true);
    expect((await db.families.get(family.id))!.momentum.version).toBe(2);
  });

  it('consequences follow the repair flow, response cost is off by default and never touches points', async () => {
    const { parent, child, task, family } = await setup();
    const sub = await submitTask({ task, child, proofMethod: 'self_check' });
    await approveSubmission(parent.id, sub.id);
    const inc = await openIncident(parent.id, { familyId: family.id, childId: child.id, description: 'Toys left out' });
    await expect(advanceIncident(parent.id, inc.id, {})).rejects.toThrow('incident.coolingOff');
    await expect(applyResponseCost(parent.id, inc.id, 'tv', 2)).rejects.toThrow('responseCost.disabled');
    expect(await childBalance(child.id)).toBe(2);
  });

  it('extra jobs feed the separate money ledger, never points-for-money mixing', async () => {
    const { parent, child, family, base } = await setup();
    await db.families.update(family.id, { settings: { ...(await db.families.get(family.id))!.settings, money: { enabled: true, currency: 'EUR', interestPctMonthly: 2, jars: { save: 50, spend: 40, give: 10 } } } });
    const job = await createTask(parent.id, { ...base, title: 'Wash the car', category: 'extra_job', moneyAmount: 10, approverTier: 'parent', basePoints: 5 });
    const sub = await submitTask({ task: job, child, proofMethod: 'self_check' });
    await approveSubmission(parent.id, sub.id);
    const entries = await db.money.where('childId').equals(child.id).toArray();
    expect(jarBalances(entries, child.id)).toEqual({ save: 5, spend: 4, give: 1 });
    expect(await childBalance(child.id)).toBe(5); // points stay separate
    await requestPayout(parent.id, child.id, 'spend', 4);
    const payout = (await db.money.where('childId').equals(child.id).toArray()).find((e) => e.kind === 'spend')!;
    expect(payout.settled).toBe(false);
    await markSettled(parent.id, payout.id);
    expect((await db.money.get(payout.id))!.settled).toBe(true);
    await expect(requestPayout(parent.id, child.id, 'give', 5)).rejects.toThrow('money.notEnough');
  });
});
