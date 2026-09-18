import { db, nowISO, uid } from '@/db/schema';
import type { LedgerEntry, LedgerKind } from '@/domain/types';
import { balanceOf } from '@/domain/economy';

/** Append-only. Never edits or deletes; corrections are reversal entries. */
export async function appendLedger(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry> {
  const e: LedgerEntry = { ...entry, id: uid(), createdAt: nowISO() };
  if (e.amount < 0) {
    const all = await db.ledger.where('childId').equals(e.childId).toArray();
    if (balanceOf(all, e.childId) + e.amount < 0) throw new Error('ledger.negativeBalance');
  }
  await db.ledger.add(e);
  return e;
}

export async function childBalance(childId: string): Promise<number> {
  const all = await db.ledger.where('childId').equals(childId).toArray();
  return balanceOf(all, childId);
}

/** Reverse a specific entry (undo). Protected historical earnings are never
 *  removed by consequences; this exists for the adult's own mistakes only. */
export async function reverseEntry(actorId: string, entryId: string, reason: string): Promise<LedgerEntry | null> {
  const e = await db.ledger.get(entryId);
  if (!e) return null;
  const already = await db.ledger.where('refId').equals(entryId).filter((x) => x.kind === 'reversal').first();
  if (already) return already;
  const kinds: LedgerKind[] = ['reversal'];
  void kinds;
  return appendLedger({ familyId: e.familyId, childId: e.childId, kind: 'reversal', amount: -e.amount, reason, refType: 'ledger', refId: entryId, approverId: actorId });
}
