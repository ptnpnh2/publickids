import { db, nowISO, uid } from '@/db/schema';
import type { Incident, IncidentStatus } from '@/domain/types';
import { canApplyResponseCost, nextIncidentStatus } from '@/domain/consequences';
import { audit } from './audit';
import { pauseMomentum } from './momentum';

export async function openIncident(actorId: string, input: { familyId: string; childId: string; description: string; ruleId?: string; safetyRule?: boolean }): Promise<Incident> {
  const actor = (await db.members.get(actorId))!;
  if (actor.role !== 'parent' && actor.role !== 'coparent') throw new Error('incident.parentOnly'); // never nanny, never AI
  const family = (await db.families.get(input.familyId))!;
  const inc: Incident = {
    id: uid(), familyId: input.familyId, childId: input.childId, ruleId: input.ruleId, description: input.description, status: 'pause', createdBy: actorId,
    createdAt: nowISO(), coolingOffUntil: new Date(Date.now() + family.settings.coolingOffMinutes * 60_000).toISOString(), causes: [],
  };
  await db.incidents.add(inc);
  if (input.safetyRule) await pauseMomentum(actorId, input.childId, true);
  await audit({ familyId: inc.familyId, actorId, action: 'incident.open', targetType: 'incident', targetId: inc.id, childExplanation: 'incident.explainOpen' });
  return inc;
}

export async function advanceIncident(actorId: string, id: string, patch: Partial<Incident>): Promise<void> {
  const inc = (await db.incidents.get(id))!;
  const next: IncidentStatus | null = nextIncidentStatus(inc.status);
  if (!next) return;
  if (inc.status === 'pause' && new Date(inc.coolingOffUntil).getTime() > Date.now()) throw new Error('incident.coolingOff');
  const update: Partial<Incident> = { ...patch, status: next };
  if (next === 'closed') {
    update.closedAt = nowISO();
    const state = await db.momentum.get(inc.childId);
    if (state?.pausedForReview) await pauseMomentum(actorId, inc.childId, false);
  }
  await db.incidents.update(id, update);
  await audit({ familyId: inc.familyId, actorId, action: `incident.${next}`, targetType: 'incident', targetId: id, after: patch, childExplanation: `incident.explain.${next}` });
}

export async function applyResponseCost(actorId: string, id: string, privilege: string, hours: number): Promise<void> {
  const inc = (await db.incidents.get(id))!;
  const family = (await db.families.get(inc.familyId))!;
  const actor = (await db.members.get(actorId))!;
  const check = canApplyResponseCost({ enabled: family.settings.responseCostEnabled, actorRole: actor.role, privilege, hours });
  if (!check.ok) throw new Error(check.reason);
  await db.incidents.update(id, { responseCost: { privilege, until: new Date(Date.now() + hours * 3_600_000).toISOString() } });
  await audit({ familyId: inc.familyId, actorId, action: 'incident.responseCost', targetType: 'incident', targetId: id, after: { privilege, hours }, childExplanation: 'incident.explainResponseCost' });
}

/** One-tap undo for the adult. */
export async function undoIncident(actorId: string, id: string): Promise<void> {
  const inc = (await db.incidents.get(id))!;
  await db.incidents.update(id, { status: 'closed', undoneAt: nowISO(), closedAt: nowISO(), responseCost: undefined });
  const state = await db.momentum.get(inc.childId);
  if (state?.pausedForReview) await pauseMomentum(actorId, inc.childId, false);
  await audit({ familyId: inc.familyId, actorId, action: 'incident.undo', targetType: 'incident', targetId: id });
}

export async function appealIncident(childId: string, id: string, reason: string): Promise<void> {
  const inc = (await db.incidents.get(id))!;
  await db.incidents.update(id, { appeal: { reason, at: nowISO(), status: 'open' } });
  await audit({ familyId: inc.familyId, actorId: childId, action: 'incident.appeal', targetType: 'incident', targetId: id });
}

export async function resolveIncidentAppeal(actorId: string, id: string, uphold: boolean): Promise<void> {
  const inc = (await db.incidents.get(id))!;
  if (!inc.appeal) return;
  await db.incidents.update(id, { appeal: { ...inc.appeal, status: uphold ? 'upheld' : 'declined' }, ...(uphold ? { responseCost: undefined } : {}) });
  await audit({ familyId: inc.familyId, actorId, action: 'incident.appealResolved', targetType: 'incident', targetId: id, after: { uphold } });
}
