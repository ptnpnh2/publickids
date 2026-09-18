import { db, nowISO, uid } from '@/db/schema';
import type { AuditEntry } from '@/domain/types';

export async function audit(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void> {
  await db.audit.add({ ...entry, id: uid(), createdAt: nowISO() });
}
