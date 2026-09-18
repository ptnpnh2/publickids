import { db, nowISO, uid } from '@/db/schema';
import type { Goal, Redemption, Reward } from '@/domain/types';
import { milestonesCrossed } from '@/domain/economy';
import { appendLedger, childBalance } from './ledger';
import { audit } from './audit';
import { weekStart } from '@/domain/time';

export async function createReward(actorId: string, input: Omit<Reward, 'id' | 'createdAt'>): Promise<Reward> {
  const r: Reward = { ...input, id: uid(), createdAt: nowISO() };
  await db.rewards.add(r);
  await audit({ familyId: r.familyId, actorId, action: r.status === 'proposed' ? 'reward.propose' : 'reward.create', targetType: 'reward', targetId: r.id, after: { title: r.title, cost: r.cost } });
  return r;
}

export async function updateReward(actorId: string, id: string, patch: Partial<Reward>): Promise<void> {
  const before = await db.rewards.get(id);
  if (!before) return;
  await db.rewards.update(id, patch);
  await audit({ familyId: before.familyId, actorId, action: 'reward.update', targetType: 'reward', targetId: id, after: patch });
}

export async function redeemReward(childId: string, rewardId: string): Promise<Redemption> {
  const reward = (await db.rewards.get(rewardId))!;
  if (reward.status !== 'active') throw new Error('reward.unavailable');
  if (reward.availability === 'weekend' && ![0, 6].includes(new Date().getDay())) throw new Error('reward.weekendOnly');
  if (reward.weeklyBudget) {
    const ws = weekStart(new Date());
    const used = await db.redemptions.where('childId').equals(childId).filter((r) => r.rewardId === rewardId && r.status !== 'declined' && r.createdAt >= ws).count();
    if (used >= reward.weeklyBudget) throw new Error('reward.budget');
  }
  if ((await childBalance(childId)) < reward.cost) throw new Error('reward.notEnough');
  const entry = await appendLedger({ familyId: reward.familyId, childId, kind: 'redeem', amount: -reward.cost, reason: reward.title, refType: 'reward', refId: reward.id });
  const red: Redemption = { id: uid(), familyId: reward.familyId, rewardId, childId, cost: reward.cost, status: 'requested', ledgerEntryId: entry.id, createdAt: nowISO() };
  await db.redemptions.add(red);
  await audit({ familyId: reward.familyId, actorId: childId, action: 'reward.redeem', targetType: 'redemption', targetId: red.id, after: { cost: reward.cost } });
  return red;
}

export async function resolveRedemption(actorId: string, id: string, status: 'approved' | 'fulfilled' | 'declined'): Promise<void> {
  const r = await db.redemptions.get(id);
  if (!r) return;
  await db.redemptions.update(id, { status, resolvedAt: nowISO() });
  if (status === 'declined' && r.ledgerEntryId) {
    await appendLedger({ familyId: r.familyId, childId: r.childId, kind: 'reversal', amount: r.cost, reason: 'reward.declinedRefund', refType: 'ledger', refId: r.ledgerEntryId, approverId: actorId });
  }
  await audit({ familyId: r.familyId, actorId, action: `redemption.${status}`, targetType: 'redemption', targetId: id });
}

export async function createGoal(actorId: string, input: Omit<Goal, 'id' | 'createdAt' | 'savedPoints' | 'milestones'>): Promise<Goal> {
  if (input.primary && input.status === 'active') {
    const others = await db.goals.where('childId').equals(input.childId).filter((g) => g.status === 'active' && g.primary).toArray();
    for (const o of others) await db.goals.update(o.id, { primary: false });
  }
  const g: Goal = { ...input, id: uid(), savedPoints: 0, milestones: [], createdAt: nowISO() };
  await db.goals.add(g);
  await audit({ familyId: g.familyId, actorId, action: g.status === 'proposed' ? 'goal.propose' : 'goal.create', targetType: 'goal', targetId: g.id, after: { title: g.title, target: g.targetPoints } });
  return g;
}

/** Move points from the balance into the goal. Returns milestones crossed. */
export async function saveToGoal(childId: string, goalId: string, amount: number): Promise<number[]> {
  const g = (await db.goals.get(goalId))!;
  if (g.status !== 'active' || amount <= 0) return [];
  const remaining = g.targetPoints - g.savedPoints;
  const n = Math.min(amount, remaining, await childBalance(childId));
  if (n <= 0) return [];
  await appendLedger({ familyId: g.familyId, childId, kind: 'goal_save', amount: -n, reason: g.title, refType: 'goal', refId: g.id });
  const after = g.savedPoints + n;
  const crossed = milestonesCrossed(g.targetPoints, g.savedPoints, after);
  await db.goals.update(g.id, { savedPoints: after, milestones: [...g.milestones, ...crossed], status: after >= g.targetPoints ? 'reached' : 'active' });
  return crossed;
}

export async function abandonGoal(actorId: string, goalId: string): Promise<void> {
  const g = (await db.goals.get(goalId))!;
  if (g.savedPoints > 0) await appendLedger({ familyId: g.familyId, childId: g.childId, kind: 'goal_refund', amount: g.savedPoints, reason: g.title, refType: 'goal', refId: g.id, approverId: actorId });
  await db.goals.update(goalId, { status: 'abandoned' });
  await audit({ familyId: g.familyId, actorId, action: 'goal.abandon', targetType: 'goal', targetId: goalId });
}
