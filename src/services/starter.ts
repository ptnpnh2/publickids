import { db, nowISO } from '@/db/schema';
import type { Family } from '@/domain/types';
import { audit } from './audit';

/** Seven-day Starter Mode: 3 tasks, 2 rewards, 1 goal, a theme, a celebration style, and a guaranteed practice success. */
export const STARTER_DAYS = 7;

export function starterDay(family: Family, now = new Date()): number | null {
  if (!family.starter || family.starter.completedAt) return null;
  const d = Math.floor((now.getTime() - new Date(family.starter.startedAt).getTime()) / 86_400_000) + 1;
  return d > STARTER_DAYS ? null : d;
}

export async function startStarter(actorId: string, familyId: string): Promise<void> {
  await db.families.update(familyId, { starter: { startedAt: nowISO() } });
  await audit({ familyId, actorId, action: 'starter.begin', targetType: 'family', targetId: familyId });
}

export async function completeStarter(actorId: string, familyId: string): Promise<void> {
  const f = (await db.families.get(familyId))!;
  await db.families.update(familyId, { starter: { startedAt: f.starter?.startedAt ?? nowISO(), completedAt: nowISO() } });
  await audit({ familyId, actorId, action: 'starter.complete', targetType: 'family', targetId: familyId });
}

export async function freshStart(actorId: string, childId: string): Promise<void> {
  const m = (await db.members.get(childId))!;
  await db.members.update(childId, { child: { ...m.child!, freshStartAt: nowISO() } });
  await audit({ familyId: m.familyId, actorId, action: 'child.freshStart', targetType: 'member', targetId: childId, childExplanation: 'freshStart.explain' });
}
