import type { Stage } from './types';

export const STAGES: Stage[] = ['learning', 'practicing', 'independent', 'graduated'];

export function nextStage(s: Stage): Stage | null {
  const i = STAGES.indexOf(s);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function prevStage(s: Stage): Stage | null {
  const i = STAGES.indexOf(s);
  return i > 0 ? STAGES[i - 1] : null;
}

/** How often approval should give points at a stage (thinning schedule). */
export function rewardProbability(stage: Stage): number {
  switch (stage) {
    case 'learning':
      return 1; // immediate, every time
    case 'practicing':
      return 1; // still every time, but the child sees the fading plan
    case 'independent':
      return 0.5; // intermittent bonus + feedback
    case 'graduated':
      return 0; // acknowledgment only
  }
}

/**
 * Stable-completion signal for suggesting graduation: no fixed countdown,
 * just consistency across normal disruptions, fewer reminders and a
 * reward-light trial (§1.2).
 */
export function suggestGraduation(input: { pct28: number; remindersPerCompletion: number; independentStartPct: number; stage: Stage }): boolean {
  if (input.stage === 'graduated') return false;
  return input.pct28 >= 85 && input.remindersPerCompletion < 0.3 && input.independentStartPct >= 70;
}
