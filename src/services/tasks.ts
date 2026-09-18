import { db, nowISO, uid } from '@/db/schema';
import type { Member, Stage, Task, TaskStage } from '@/domain/types';
import { audit } from './audit';
import { isSensitiveTask } from '@/domain/verification';

export async function createTask(actorId: string, input: Omit<Task, 'id' | 'createdAt' | 'createdBy'>): Promise<Task> {
  if (isSensitiveTask(input.title, input.completionDefinition) && (input.proofMethod === 'photo' || input.proofMethod === 'video')) {
    throw new Error('task.sensitiveProof');
  }
  const task: Task = { ...input, id: uid(), createdBy: actorId, createdAt: nowISO(), microSteps: input.microSteps.slice(0, 5) };
  await db.tasks.add(task);
  for (const childId of task.assignedChildIds) await ensureStage(task.familyId, task.id, childId);
  await audit({ familyId: task.familyId, actorId, action: task.proposedBy ? 'task.propose' : 'task.create', targetType: 'task', targetId: task.id, after: { title: task.title, basePoints: task.basePoints } });
  return task;
}

export async function updateTask(actorId: string, id: string, patch: Partial<Task>, childExplanation?: string): Promise<void> {
  const before = await db.tasks.get(id);
  if (!before) return;
  if (patch.microSteps) patch.microSteps = patch.microSteps.slice(0, 5);
  await db.tasks.update(id, patch);
  if (patch.assignedChildIds) for (const childId of patch.assignedChildIds) await ensureStage(before.familyId, id, childId);
  await audit({ familyId: before.familyId, actorId, action: 'task.update', targetType: 'task', targetId: id, before: subset(before, patch), after: patch, childExplanation });
}

export async function archiveTask(actorId: string, id: string): Promise<void> {
  await updateTask(actorId, id, { archived: true, active: false });
}

export async function ensureStage(familyId: string, taskId: string, childId: string): Promise<TaskStage> {
  const id = `${taskId}:${childId}`;
  const existing = await db.taskStages.get(id);
  if (existing) return existing;
  const s: TaskStage = { id, familyId, taskId, childId, stage: 'learning', since: nowISO() };
  await db.taskStages.add(s);
  return s;
}

/** Stage transitions are confirmed by a parent and the child together (§1.2). */
export async function setStage(actorId: string, taskId: string, childId: string, stage: Stage, childAssent: boolean, boosterDays?: number): Promise<void> {
  const s = await ensureStage((await db.tasks.get(taskId))!.familyId, taskId, childId);
  const boosterUntil = boosterDays ? new Date(Date.now() + boosterDays * 86_400_000).toISOString() : undefined;
  await db.taskStages.update(s.id, { stage, since: nowISO(), boosterUntil, confirmedBy: { parentId: actorId, childAssent } });
  await audit({ familyId: s.familyId, actorId, action: 'stage.change', targetType: 'taskStage', targetId: s.id, before: { stage: s.stage }, after: { stage, boosterUntil }, childExplanation: `stage.explain.${stage}` });
}

/** Active-training cap: at most N habits per child earn frequent points at once (§2.2). */
export async function activeTrainingCount(childId: string): Promise<number> {
  const tasks = await db.tasks.where('assignedChildIds').equals(childId).filter((t) => t.active && !t.archived && t.currency === 'points').toArray();
  const stages = await db.taskStages.where('childId').equals(childId).toArray();
  return tasks.filter((t) => {
    const st = stages.find((s) => s.taskId === t.id)?.stage ?? 'learning';
    return (st === 'learning' || st === 'practicing') && (t.category === 'routine' || t.category === 'learning' || t.category === 'selfcare' || t.category === 'contribution');
  }).length;
}

export async function tasksForChild(child: Member): Promise<Task[]> {
  return db.tasks.where('assignedChildIds').equals(child.id).filter((t) => t.active && !t.archived && !t.proposedBy).toArray();
}

function subset<T extends object>(obj: T, keysOf: object): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(keysOf) as (keyof T)[]) out[k] = obj[k];
  return out;
}
