import { db, nowISO, uid } from '@/db/schema';
import type { CameraConfig, Member, Task } from '@/domain/types';
import { canRequestClip } from '@/domain/camera';
import { dateKey } from '@/domain/time';
import { audit } from './audit';

/**
 * Optional IP-camera connector (§2.3, V2). Talks only to a local, read-only
 * gateway (see gateway/README.md) that returns a short event clip. No
 * continuous ingest, no history browsing, no live stream from the app.
 */
export async function requestCameraClip(child: Member, task: Task, seconds: number): Promise<{ blob: Blob; mime: string } | { error: string }> {
  const fam = (await db.families.get(child.familyId))!;
  const camera = fam.settings.camera.cameras.find((c) => c.id === task.cameraId);
  const today = dateKey();
  const clipsToday = await db.cameraEvents.where('childId').equals(child.id).filter((e) => e.createdAt.startsWith(today)).count();
  const check = canRequestClip({ settings: fam.settings.camera, camera, childId: child.id, task, clipsToday, seconds });
  if (!check.ok) return { error: `camera.reason.${check.reason}` };
  const ev = { id: uid(), familyId: child.familyId, childId: child.id, taskId: task.id, cameraId: camera!.id, status: 'requested' as const, seconds, createdAt: nowISO() };
  await db.cameraEvents.add(ev);
  await audit({ familyId: child.familyId, actorId: child.id, action: 'camera.request', targetType: 'cameraEvent', targetId: ev.id, after: { cameraId: camera!.id, seconds } });
  try {
    const res = await fetch(`${fam.settings.camera.gatewayUrl!.replace(/\/$/, '')}/clip`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cameraId: camera!.id, seconds, purpose: task.exercise?.kind ?? 'action' }),
    });
    if (!res.ok) throw new Error(`gateway ${res.status}`);
    const blob = await res.blob();
    await db.cameraEvents.update(ev.id, { status: 'received' });
    return { blob, mime: blob.type || 'video/mp4' };
  } catch (e) {
    await db.cameraEvents.update(ev.id, { status: 'failed', note: (e as Error).message });
    return { error: 'camera.reason.gateway' };
  }
}

export async function giveChildAssent(childId: string, cameraId: string): Promise<void> {
  const child = (await db.members.get(childId))!;
  const fam = (await db.families.get(child.familyId))!;
  const cameras: CameraConfig[] = fam.settings.camera.cameras.map((c) => (c.id === cameraId ? { ...c, childAssent: { ...c.childAssent, [childId]: nowISO() } } : c));
  await db.families.update(fam.id, { settings: { ...fam.settings, camera: { ...fam.settings.camera, cameras } } });
  await audit({ familyId: fam.id, actorId: childId, action: 'camera.assent', targetType: 'family', targetId: fam.id, after: { cameraId } });
}
