import type { Incident, IncidentStatus } from './types';

export const INCIDENT_FLOW: IncidentStatus[] = ['pause', 'understand', 'repair', 'support', 'closed'];

export const CAUSE_OPTIONS = ['unclear_expectations', 'missing_skill', 'sensory_overload', 'fatigue', 'stress', 'unrealistic_task', 'none'] as const;

export function nextIncidentStatus(s: IncidentStatus): IncidentStatus | null {
  const i = INCIDENT_FLOW.indexOf(s);
  return i >= 0 && i < INCIDENT_FLOW.length - 1 ? INCIDENT_FLOW[i + 1] : null;
}

export function coolingOffOver(incident: Incident, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(incident.coolingOffUntil).getTime();
}

/**
 * Response cost is off by default. When enabled it may only pause a small,
 * pre-agreed privilege related to the rule for a bounded time; it can never
 * touch points, goals, purchased rewards or basic needs (§1.6).
 */
export function canApplyResponseCost(input: { enabled: boolean; actorRole: string; privilege?: string; hours: number }): { ok: boolean; reason?: string } {
  if (!input.enabled) return { ok: false, reason: 'responseCost.disabled' };
  if (input.actorRole !== 'parent' && input.actorRole !== 'coparent') return { ok: false, reason: 'responseCost.parentOnly' };
  if (!input.privilege) return { ok: false, reason: 'responseCost.needPrivilege' };
  if (input.hours <= 0 || input.hours > 48) return { ok: false, reason: 'responseCost.bounded' };
  return { ok: true };
}

/** Correction-heavy pattern that should trigger coaching (§1.6-5). */
export function correctionHeavy(incidentsThisWeek: number, approvalsThisWeek: number): boolean {
  if (incidentsThisWeek < 3) return false;
  return incidentsThisWeek >= approvalsThisWeek / 2;
}
