import type { Jar, MoneyEntry, MoneySettings } from './types';

export const DEFAULT_MONEY: MoneySettings = { enabled: false, currency: 'EUR', interestPctMonthly: 2, jars: { save: 50, spend: 40, give: 10 } };

/** Money stays separate from points and applies only to extra jobs (§1.5). */
export function jarBalances(entries: MoneyEntry[], childId: string): Record<Jar, number> {
  const out: Record<Jar, number> = { save: 0, spend: 0, give: 0 };
  for (const e of entries) if (e.childId === childId) out[e.jar] = round2(out[e.jar] + e.amount);
  return out;
}

export function totalEarned(entries: MoneyEntry[], childId: string): number {
  return round2(entries.filter((e) => e.childId === childId && e.kind === 'earn').reduce((s, e) => s + e.amount, 0));
}

export function unsettledPayouts(entries: MoneyEntry[], childId: string): MoneyEntry[] {
  return entries.filter((e) => e.childId === childId && e.kind === 'payout' && !e.settled);
}

/** Split an earned amount across the jars by the family's percentages; rounding remainder goes to 'save'. */
export function splitAcrossJars(amount: number, jars: MoneySettings['jars']): Record<Jar, number> {
  const spend = round2((amount * jars.spend) / 100);
  const give = round2((amount * jars.give) / 100);
  const save = round2(amount - spend - give);
  return { save, spend, give };
}

/** Parent-funded interest on the save jar, computed monthly and rounded once. */
export function monthlyInterest(saveBalance: number, pctMonthly: number): number {
  if (saveBalance <= 0 || pctMonthly <= 0) return 0;
  return round2((saveBalance * pctMonthly) / 100);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function validateJars(jars: MoneySettings['jars']): boolean {
  return jars.save >= 0 && jars.spend >= 0 && jars.give >= 0 && jars.save + jars.spend + jars.give === 100;
}
