import { db, nowISO, uid } from '@/db/schema';
import type { Jar, MoneyEntry } from '@/domain/types';
import { jarBalances, monthlyInterest, round2, splitAcrossJars } from '@/domain/money';
import { audit } from './audit';

/** Separate extra-job money ledger (§1.5, V2). Never mixed with points. */
export async function recordEarning(familyId: string, childId: string, amount: number, reason: string, refId: string): Promise<void> {
  const fam = (await db.families.get(familyId))!;
  if (!fam.settings.money.enabled || amount <= 0) return;
  const split = splitAcrossJars(amount, fam.settings.money.jars);
  const rows: MoneyEntry[] = (Object.keys(split) as Jar[])
    .filter((j) => split[j] > 0)
    .map((jar) => ({ id: uid(), familyId, childId, kind: 'earn', amount: split[jar], jar, reason, refType: 'submission', refId, settled: false, createdAt: nowISO() }));
  await db.money.bulkAdd(rows);
}

export async function requestPayout(actorId: string, childId: string, jar: Jar, amount: number): Promise<void> {
  const child = (await db.members.get(childId))!;
  const entries = await db.money.where('childId').equals(childId).toArray();
  const bal = jarBalances(entries, childId)[jar];
  if (amount <= 0 || amount > bal) throw new Error('money.notEnough');
  await db.money.add({ id: uid(), familyId: child.familyId, childId, kind: jar === 'give' ? 'give' : jar === 'spend' ? 'spend' : 'payout', amount: -round2(amount), jar, reason: `money.${jar}Out`, settled: false, createdAt: nowISO() });
  await audit({ familyId: child.familyId, actorId, action: 'money.payout', targetType: 'member', targetId: childId, after: { jar, amount } });
}

export async function markSettled(actorId: string, entryId: string): Promise<void> {
  const e = (await db.money.get(entryId))!;
  await db.money.update(entryId, { settled: true });
  await audit({ familyId: e.familyId, actorId, action: 'money.settled', targetType: 'money', targetId: entryId });
}

export async function moveBetweenJars(childId: string, from: Jar, to: Jar, amount: number): Promise<void> {
  const child = (await db.members.get(childId))!;
  const entries = await db.money.where('childId').equals(childId).toArray();
  if (amount <= 0 || amount > jarBalances(entries, childId)[from] || from === to) throw new Error('money.notEnough');
  const now = nowISO();
  await db.money.bulkAdd([
    { id: uid(), familyId: child.familyId, childId, kind: 'move', amount: -round2(amount), jar: from, reason: `money.moveTo.${to}`, settled: true, createdAt: now },
    { id: uid(), familyId: child.familyId, childId, kind: 'move', amount: round2(amount), jar: to, reason: `money.moveFrom.${from}`, settled: true, createdAt: now },
  ]);
}

/** Parent-funded 'interest' on the save jar, once per calendar month. */
export async function applyMonthlyInterest(familyId: string, childId: string, now = new Date()): Promise<number> {
  const fam = (await db.families.get(familyId))!;
  if (!fam.settings.money.enabled) return 0;
  const entries = await db.money.where('childId').equals(childId).toArray();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (entries.some((e) => e.kind === 'interest' && e.createdAt.startsWith(monthKey))) return 0;
  const amount = monthlyInterest(jarBalances(entries, childId).save, fam.settings.money.interestPctMonthly);
  if (amount <= 0) return 0;
  await db.money.add({ id: uid(), familyId, childId, kind: 'interest', amount, jar: 'save', reason: 'money.interest', settled: true, createdAt: now.toISOString() });
  return amount;
}
