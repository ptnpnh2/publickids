import { db } from '@/db/schema';
import type { Member, Session } from '@/domain/types';
import { verifySecret } from './crypto';
import { audit } from './audit';

export function sessionFor(m: Member): Session {
  return { memberId: m.id, familyId: m.familyId, role: m.role, isSupervisor: m.isSupervisor, isSuperUser: m.isSuperUser };
}

export async function loginAdult(email: string, password: string): Promise<Session | null> {
  const m = await db.members.where('email').equals(email.trim().toLowerCase()).first();
  if (!m || m.role === 'child' || m.archived) return null;
  if (!(await verifySecret(password, m.passwordHash))) {
    await audit({ familyId: m.familyId, actorId: 'system', action: 'login.failed', targetType: 'member', targetId: m.id });
    return null;
  }
  await audit({ familyId: m.familyId, actorId: m.id, action: 'login', targetType: 'member', targetId: m.id });
  return sessionFor(m);
}

export async function loginChild(memberId: string, pin: string): Promise<Session | null> {
  const m = await db.members.get(memberId);
  if (!m || m.role !== 'child') return null;
  if (!(await verifySecret(pin, m.pinHash))) return null;
  await audit({ familyId: m.familyId, actorId: m.id, action: 'login', targetType: 'member', targetId: m.id });
  return sessionFor(m);
}

/** Elevation for role changes and recovery: super-user password or an unused recovery code. */
export async function elevate(familyId: string, secret: string): Promise<'superuser' | 'recovery' | null> {
  const superUsers = await db.members.where('familyId').equals(familyId).filter((m) => m.isSuperUser).toArray();
  for (const su of superUsers) if (await verifySecret(secret, su.passwordHash)) return 'superuser';
  const fam = await db.families.get(familyId);
  if (fam) {
    for (const h of fam.recoveryCodeHashes) {
      if (await verifySecret(secret.trim().toUpperCase(), h)) {
        await db.families.update(familyId, { recoveryCodeHashes: fam.recoveryCodeHashes.filter((x) => x !== h) });
        await audit({ familyId, actorId: 'system', action: 'recovery.codeUsed', targetType: 'family', targetId: familyId });
        return 'recovery';
      }
    }
  }
  return null;
}
