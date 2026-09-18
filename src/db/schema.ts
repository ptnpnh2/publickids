import Dexie, { type EntityTable } from 'dexie';
import type {
  Agreement, AuditEntry, CoopGoal, Family, Goal, Incident, Kudos, LedgerEntry, Media, Member, MomentumState,
  Redemption, Reflection, Reward, Submission, Task, TaskStage,
} from '@/domain/types';

/**
 * Local-first store (IndexedDB). Table names and columns mirror
 * supabase/migrations/0001_init.sql so records can be synced later.
 */
export class KidsDB extends Dexie {
  families!: EntityTable<Family, 'id'>;
  members!: EntityTable<Member, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  taskStages!: EntityTable<TaskStage, 'id'>;
  submissions!: EntityTable<Submission, 'id'>;
  media!: EntityTable<Media, 'id'>;
  ledger!: EntityTable<LedgerEntry, 'id'>;
  rewards!: EntityTable<Reward, 'id'>;
  redemptions!: EntityTable<Redemption, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  coopGoals!: EntityTable<CoopGoal, 'id'>;
  momentum!: EntityTable<MomentumState, 'id'>;
  incidents!: EntityTable<Incident, 'id'>;
  agreements!: EntityTable<Agreement, 'id'>;
  audit!: EntityTable<AuditEntry, 'id'>;
  reflections!: EntityTable<Reflection, 'id'>;
  kudos!: EntityTable<Kudos, 'id'>;

  constructor(name = 'kids-incentives') {
    super(name);
    this.version(1).stores({
      families: 'id',
      members: 'id, familyId, role, email',
      tasks: 'id, familyId, active, *assignedChildIds',
      taskStages: 'id, familyId, taskId, childId',
      submissions: 'id, familyId, taskId, childId, dateKey, status, [childId+dateKey], [taskId+childId]',
      media: 'id, familyId, createdAt',
      ledger: 'id, familyId, childId, kind, createdAt, refId',
      rewards: 'id, familyId, status, section',
      redemptions: 'id, familyId, childId, status, createdAt',
      goals: 'id, familyId, childId, status',
      coopGoals: 'id, familyId, status',
      momentum: 'id, familyId',
      incidents: 'id, familyId, childId, status, createdAt',
      agreements: 'id, familyId',
      audit: 'id, familyId, createdAt, actorId',
      reflections: 'id, familyId, childId, createdAt',
      kudos: 'id, familyId, toId, createdAt',
    });
  }
}

export const db = new KidsDB();

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const nowISO = () => new Date().toISOString();
