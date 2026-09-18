import { db, nowISO, uid } from '@/db/schema';
import type { AgeBand, ChildProfile, Family, Locale, Member, Role, ThemeName } from '@/domain/types';
import { BASE_SETTINGS, applyPreset } from '@/domain/presets';
import { DEFAULT_MOMENTUM } from '@/domain/momentum';
import { generateRecoveryCodes, hashSecret } from './crypto';
import { audit } from './audit';

export function defaultChildProfile(band: AgeBand, theme: ThemeName = 'sunny'): ChildProfile {
  const base: ChildProfile = {
    ageBand: band,
    literacy: 'full',
    visualDensity: 'medium',
    audioSupport: false,
    independence: 'shared',
    planningHorizonDays: 3,
    proofComplexity: 'simple',
    celebration: 'fun',
    reducedMotion: false,
    highContrast: false,
    largeTargets: false,
    soundOff: false,
    simplifiedLanguage: false,
    extraProcessingTime: false,
    theme,
    momentumSkin: 'neutral',
    avatar: { emoji: '🦊', unlocked: [], equipped: [] },
    independenceMode: false,
    appFreeDays: [],
    fadingReminders: false,
    sickDays: [],
    season: 'meadow',
    castle: [],
  };
  switch (band) {
    case '4-6':
      return { ...base, literacy: 'pictures', visualDensity: 'low', audioSupport: true, independence: 'guided', planningHorizonDays: 1, proofComplexity: 'none', largeTargets: true, simplifiedLanguage: true };
    case '7-9':
      return { ...base, literacy: 'simple', planningHorizonDays: 1, proofComplexity: 'simple' };
    case '10-12':
      return { ...base, planningHorizonDays: 3, proofComplexity: 'standard' };
    case 'teen':
      return { ...base, independence: 'self', planningHorizonDays: 7, proofComplexity: 'standard', celebration: 'quiet', theme: 'space' };
  }
}

export interface CreateFamilyInput {
  familyName: string;
  locale: Locale;
  parentName: string;
  email: string;
  password: string;
  superUserPassword: string;
}

export async function createFamily(input: CreateFamilyInput): Promise<{ family: Family; parent: Member; recoveryCodes: string[] }> {
  const codes = generateRecoveryCodes();
  const familyId = uid();
  const family: Family = {
    id: familyId,
    name: input.familyName,
    locale: input.locale,
    settings: applyPreset('balanced', BASE_SETTINGS),
    momentum: { ...DEFAULT_MOMENTUM },
    recoveryCodeHashes: await Promise.all(codes.map((c) => hashSecret(c))),
    createdAt: nowISO(),
  };
  const parent: Member = {
    id: uid(),
    familyId,
    name: input.parentName,
    role: 'parent',
    emoji: '🧑',
    locale: input.locale,
    email: input.email.trim().toLowerCase(),
    passwordHash: await hashSecret(input.password),
    isSupervisor: true,
    isSuperUser: true,
    createdAt: nowISO(),
  };
  // The super-user is a separate credential kept for recovery and role changes.
  const superUser: Member = {
    id: uid(),
    familyId,
    name: 'Recovery owner',
    role: 'parent',
    emoji: '🔐',
    locale: input.locale,
    email: `superuser@${familyId}`,
    passwordHash: await hashSecret(input.superUserPassword),
    isSupervisor: false,
    isSuperUser: true,
    createdAt: nowISO(),
  };
  await db.transaction('rw', db.families, db.members, db.audit, async () => {
    await db.families.add(family);
    await db.members.bulkAdd([parent, superUser]);
  });
  await audit({ familyId, actorId: parent.id, action: 'family.create', targetType: 'family', targetId: familyId });
  return { family, parent, recoveryCodes: codes };
}

export async function addChild(input: { familyId: ID; name: string; emoji: string; band: AgeBand; pin: string; locale: Locale; theme?: ThemeName; actorId: ID }): Promise<Member> {
  const child: Member = {
    id: uid(),
    familyId: input.familyId,
    name: input.name,
    role: 'child',
    emoji: input.emoji,
    locale: input.locale,
    pinHash: await hashSecret(input.pin),
    isSupervisor: false,
    isSuperUser: false,
    child: { ...defaultChildProfile(input.band, input.theme), avatar: { emoji: input.emoji, unlocked: [], equipped: [] } },
    createdAt: nowISO(),
  };
  await db.members.add(child);
  await db.momentum.put({ id: child.id, familyId: input.familyId, childId: child.id, levelKey: 'starting', since: nowISO(), pausedForReview: false });
  await audit({ familyId: input.familyId, actorId: input.actorId, action: 'member.addChild', targetType: 'member', targetId: child.id });
  return child;
}

type ID = string;

export async function addAdult(input: { familyId: ID; name: string; role: Exclude<Role, 'child'>; email: string; password: string; locale: Locale; scopedChildIds?: ID[]; approvalLimit?: number; actorId: ID }): Promise<Member> {
  const m: Member = {
    id: uid(),
    familyId: input.familyId,
    name: input.name,
    role: input.role,
    emoji: input.role === 'nanny' ? '🧑‍🍼' : input.role === 'sponsor' ? '🎁' : '🧑',
    locale: input.locale,
    email: input.email.trim().toLowerCase(),
    passwordHash: await hashSecret(input.password),
    isSupervisor: false,
    isSuperUser: false,
    scopedChildIds: input.scopedChildIds,
    approvalLimit: input.approvalLimit,
    createdAt: nowISO(),
  };
  await db.members.add(m);
  await audit({ familyId: input.familyId, actorId: input.actorId, action: 'member.addAdult', targetType: 'member', targetId: m.id, after: { role: m.role } });
  return m;
}

export async function updateMember(actorId: ID, id: ID, patch: Partial<Member>, childExplanation?: string): Promise<void> {
  const before = await db.members.get(id);
  if (!before) return;
  await db.members.update(id, patch);
  await audit({ familyId: before.familyId, actorId, action: 'member.update', targetType: 'member', targetId: id, before: pick(before, patch), after: patch, childExplanation });
}

export async function updateChildProfile(actorId: ID, childId: ID, patch: Partial<ChildProfile>, childExplanation?: string): Promise<void> {
  const m = await db.members.get(childId);
  if (!m?.child) return;
  await db.members.update(childId, { child: { ...m.child, ...patch } });
  await audit({ familyId: m.familyId, actorId, action: 'child.profile', targetType: 'member', targetId: childId, after: patch, childExplanation });
}

export async function updateFamily(actorId: ID, familyId: ID, patch: Partial<Family>, childExplanation?: string): Promise<void> {
  const before = await db.families.get(familyId);
  if (!before) return;
  await db.families.update(familyId, patch);
  await audit({ familyId, actorId, action: 'family.update', targetType: 'family', targetId: familyId, before: pick(before, patch), after: patch, childExplanation });
}

function pick<T extends object>(obj: T, keysOf: object): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(keysOf) as (keyof T)[]) out[k] = obj[k];
  return out;
}

export async function regenerateRecoveryCodes(actorId: ID, familyId: ID): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await db.families.update(familyId, { recoveryCodeHashes: await Promise.all(codes.map((c) => hashSecret(c))) });
  await audit({ familyId, actorId, action: 'family.recoveryCodes', targetType: 'family', targetId: familyId });
  return codes;
}
