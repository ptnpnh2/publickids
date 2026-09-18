import { db, nowISO, uid } from '@/db/schema';
import type { CoopGoal } from '@/domain/types';
import { audit } from './audit';

/** Private contributions, flexible targets, no blame (§1.7, §2.5). */
export async function createCoop(actorId: string, familyId: string, title: string, emoji: string, targetCount: number, celebration?: string): Promise<CoopGoal> {
  const others = await db.coopGoals.where('familyId').equals(familyId).filter((g) => g.status === 'active').toArray();
  for (const o of others) await db.coopGoals.update(o.id, { status: 'archived' });
  const g: CoopGoal = { id: uid(), familyId, title, emoji, targetCount, contributions: {}, status: 'active', celebration, createdAt: nowISO() };
  await db.coopGoals.add(g);
  await audit({ familyId, actorId, action: 'coop.create', targetType: 'coopGoal', targetId: g.id, after: { title, targetCount } });
  return g;
}

export async function adjustCoopTarget(actorId: string, id: string, targetCount: number): Promise<void> {
  const g = (await db.coopGoals.get(id))!;
  const total = Object.values(g.contributions).reduce((a, b) => a + b, 0);
  await db.coopGoals.update(id, { targetCount, status: total >= targetCount ? 'reached' : 'active' });
  await audit({ familyId: g.familyId, actorId, action: 'coop.adjust', targetType: 'coopGoal', targetId: id, after: { targetCount } });
}
