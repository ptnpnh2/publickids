import type { CameraConfig, CameraSettings, Task } from './types';
import { minutesOf } from './time';

export const DEFAULT_CAMERA: CameraSettings = { enabled: false, cameras: [], maxClipSeconds: 30, dailyClipLimit: 5, deleteClipsOnResolve: true };

/** Zones that are never allowed for camera proof (§2.3 guardrails). */
export const FORBIDDEN_ZONE_WORDS = ['bed', 'bath', 'toilet', 'shower', 'dressing', 'wardrobe', 'kitchen table', 'dining', 'спальн', 'ванн', 'туалет', 'dormitorio', 'baño'];

export function zoneAllowed(zone: string): boolean {
  const z = zone.toLowerCase();
  return z.trim().length > 0 && !FORBIDDEN_ZONE_WORDS.some((w) => z.includes(w));
}

/** Only objective, repeatable actions qualify — never eating, self-care or anything sensitive. */
export function taskEligibleForCamera(task: Pick<Task, 'category' | 'exercise' | 'proofMethod'>): boolean {
  return !!task.exercise && (task.category === 'learning' || task.category === 'routine') && task.proofMethod === 'video';
}

export interface CameraCheck {
  ok: boolean;
  reason?: 'disabled' | 'no_consent' | 'no_assent' | 'zone' | 'window' | 'limit' | 'clip_length' | 'not_eligible' | 'no_camera';
}

export function canRequestClip(input: {
  settings: CameraSettings;
  camera: CameraConfig | undefined;
  childId: string;
  task: Pick<Task, 'category' | 'exercise' | 'proofMethod'>;
  clipsToday: number;
  seconds: number;
  now?: Date;
}): CameraCheck {
  const { settings, camera } = input;
  if (!settings.enabled) return { ok: false, reason: 'disabled' };
  if (!settings.parentConsentAt) return { ok: false, reason: 'no_consent' };
  if (!camera) return { ok: false, reason: 'no_camera' };
  if (!camera.childAssent[input.childId]) return { ok: false, reason: 'no_assent' };
  if (!zoneAllowed(camera.zone)) return { ok: false, reason: 'zone' };
  if (!taskEligibleForCamera(input.task)) return { ok: false, reason: 'not_eligible' };
  const now = input.now ?? new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  if (cur < minutesOf(camera.window.start) || cur > minutesOf(camera.window.end)) return { ok: false, reason: 'window' };
  if (input.clipsToday >= settings.dailyClipLimit) return { ok: false, reason: 'limit' };
  if (input.seconds <= 0 || input.seconds > Math.min(settings.maxClipSeconds, 60)) return { ok: false, reason: 'clip_length' };
  return { ok: true };
}
