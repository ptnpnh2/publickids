import { db, nowISO, uid } from '@/db/schema';
import type { Agreement } from '@/domain/types';
import { audit } from './audit';

export async function getOrCreateAgreement(familyId: string, intro: string, defaultRules: string[]): Promise<Agreement> {
  const existing = await db.agreements.get(familyId);
  if (existing) return existing;
  const a: Agreement = {
    id: familyId, familyId, version: 1, intro, rules: defaultRules.map((text, i) => ({ id: `r${i + 1}`, text })), reviewEveryWeeks: 5,
    nextReviewAt: new Date(Date.now() + 5 * 7 * 86_400_000).toISOString(), assents: [], changeRequests: [], updatedAt: nowISO(),
  };
  await db.agreements.add(a);
  return a;
}

export async function updateAgreement(actorId: string, familyId: string, patch: Partial<Agreement>): Promise<void> {
  const a = (await db.agreements.get(familyId))!;
  const bump = patch.rules || patch.intro ? 1 : 0;
  await db.agreements.update(familyId, { ...patch, version: a.version + bump, updatedAt: nowISO(), nextReviewAt: new Date(Date.now() + (patch.reviewEveryWeeks ?? a.reviewEveryWeeks) * 7 * 86_400_000).toISOString() });
  await audit({ familyId, actorId, action: 'agreement.update', targetType: 'agreement', targetId: familyId, after: patch, childExplanation: 'agreement.explainUpdate' });
}

/** Age-appropriate assent, never a forced signature: the child can also request a change instead. */
export async function assent(memberId: string, familyId: string): Promise<void> {
  const a = (await db.agreements.get(familyId))!;
  await db.agreements.update(familyId, { assents: [...a.assents.filter((x) => x.memberId !== memberId), { memberId, at: nowISO(), version: a.version }] });
  await audit({ familyId, actorId: memberId, action: 'agreement.assent', targetType: 'agreement', targetId: familyId, after: { version: a.version } });
}

export async function requestChange(memberId: string, familyId: string, text: string): Promise<void> {
  const a = (await db.agreements.get(familyId))!;
  await db.agreements.update(familyId, { changeRequests: [...a.changeRequests, { id: uid(), memberId, text, at: nowISO(), status: 'open' }] });
  await audit({ familyId, actorId: memberId, action: 'agreement.changeRequest', targetType: 'agreement', targetId: familyId, after: { text } });
}

export async function resolveChange(actorId: string, familyId: string, id: string, status: 'accepted' | 'declined'): Promise<void> {
  const a = (await db.agreements.get(familyId))!;
  await db.agreements.update(familyId, { changeRequests: a.changeRequests.map((c) => (c.id === id ? { ...c, status } : c)) });
  await audit({ familyId, actorId, action: 'agreement.changeResolved', targetType: 'agreement', targetId: familyId, after: { id, status } });
}
