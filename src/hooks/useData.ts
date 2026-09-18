import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useSession } from '@/services/session';
import type { Member } from '@/domain/types';

export function useFamily() {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.families.get(familyId) : undefined), [familyId]);
}

export function useMe() {
  const memberId = useSession((s) => s.session?.memberId);
  return useLiveQuery(() => (memberId ? db.members.get(memberId) : undefined), [memberId]);
}

export function useMembers() {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.members.where('familyId').equals(familyId).filter((m) => !m.archived).toArray() : []), [familyId]) ?? [];
}

export function useChildren(): Member[] {
  const members = useMembers();
  const me = useMe();
  const scoped = me?.role === 'nanny' || me?.role === 'sponsor' ? me.scopedChildIds : undefined;
  return members.filter((m) => m.role === 'child' && (!scoped || scoped.includes(m.id)));
}

export function useTasks() {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.tasks.where('familyId').equals(familyId).filter((t) => !t.archived).toArray() : []), [familyId]) ?? [];
}

export function useStages(childId?: string) {
  return useLiveQuery(() => (childId ? db.taskStages.where('childId').equals(childId).toArray() : []), [childId]) ?? [];
}

export function useSubmissions(childId?: string) {
  const familyId = useSession((s) => s.session?.familyId);
  return (
    useLiveQuery(() => {
      if (!familyId) return [];
      return childId ? db.submissions.where('childId').equals(childId).toArray() : db.submissions.where('familyId').equals(familyId).toArray();
    }, [familyId, childId]) ?? []
  );
}

export function useLedger(childId?: string) {
  const familyId = useSession((s) => s.session?.familyId);
  return (
    useLiveQuery(() => {
      if (!familyId) return [];
      return childId ? db.ledger.where('childId').equals(childId).toArray() : db.ledger.where('familyId').equals(familyId).toArray();
    }, [familyId, childId]) ?? []
  );
}

export function useBalance(childId?: string): number {
  const entries = useLedger(childId);
  return entries.reduce((s, e) => s + e.amount, 0);
}

export function useRewards() {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.rewards.where('familyId').equals(familyId).toArray() : []), [familyId]) ?? [];
}

export function useRedemptions(childId?: string) {
  const familyId = useSession((s) => s.session?.familyId);
  return (
    useLiveQuery(() => {
      if (!familyId) return [];
      return childId ? db.redemptions.where('childId').equals(childId).toArray() : db.redemptions.where('familyId').equals(familyId).toArray();
    }, [familyId, childId]) ?? []
  );
}

export function useGoals(childId?: string) {
  const familyId = useSession((s) => s.session?.familyId);
  return (
    useLiveQuery(() => {
      if (!familyId) return [];
      return childId ? db.goals.where('childId').equals(childId).toArray() : db.goals.where('familyId').equals(familyId).toArray();
    }, [familyId, childId]) ?? []
  );
}

export function useCoop() {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.coopGoals.where('familyId').equals(familyId).filter((g) => g.status !== 'archived').first() : undefined), [familyId]);
}

export function useMomentum(childId?: string) {
  return useLiveQuery(() => (childId ? db.momentum.get(childId) : undefined), [childId]);
}

export function useIncidents(childId?: string) {
  const familyId = useSession((s) => s.session?.familyId);
  return (
    useLiveQuery(() => {
      if (!familyId) return [];
      return childId ? db.incidents.where('childId').equals(childId).toArray() : db.incidents.where('familyId').equals(familyId).toArray();
    }, [familyId, childId]) ?? []
  );
}

export function useAgreement() {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.agreements.get(familyId) : undefined), [familyId]);
}

export function useAudit(limit = 200) {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.audit.where('familyId').equals(familyId).reverse().sortBy('createdAt').then((a) => a.slice(0, limit)) : []), [familyId, limit]) ?? [];
}

export function useKudos(toId?: string) {
  return useLiveQuery(() => (toId ? db.kudos.where('toId').equals(toId).reverse().sortBy('createdAt') : []), [toId]) ?? [];
}

export function useMedia(id?: string) {
  return useLiveQuery(() => (id ? db.media.get(id) : undefined), [id]);
}

export function useMoney(childId?: string) {
  const familyId = useSession((s) => s.session?.familyId);
  return (
    useLiveQuery(() => {
      if (!familyId) return [];
      return childId ? db.money.where('childId').equals(childId).toArray() : db.money.where('familyId').equals(familyId).toArray();
    }, [familyId, childId]) ?? []
  );
}

export function useReminders(childId?: string) {
  return useLiveQuery(() => (childId ? db.reminders.where('childId').equals(childId).toArray() : []), [childId]) ?? [];
}

export function useCameraEvents() {
  const familyId = useSession((s) => s.session?.familyId);
  return useLiveQuery(() => (familyId ? db.cameraEvents.where('familyId').equals(familyId).toArray() : []), [familyId]) ?? [];
}
