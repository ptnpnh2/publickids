import type { AIResult, ApproverTier, Role, Submission, Task, VerificationMode } from './types';

/** Input to the provider-agnostic gateway: verifyProof(type, media, taskRules). */
export interface VerifyInput {
  type: Task['proofMethod'];
  media?: { blob: Blob; mime: string; hash?: string };
  task: Pick<Task, 'title' | 'completionDefinition' | 'microSteps' | 'category'>;
  priorHashes: string[];
  locale: string;
}

export interface Verifier {
  name: string;
  verify(input: VerifyInput): Promise<AIResult>;
}

/** Sensitive proof templates are never offered (§2.3 privacy by default). */
export const SENSITIVE_KEYWORDS = ['bath', 'shower', 'toilet', 'bedroom night', 'eat all', 'finish plate', 'weigh', 'medic'];

export function isSensitiveTask(title: string, definition: string): boolean {
  const s = `${title} ${definition}`.toLowerCase();
  return SENSITIVE_KEYWORDS.some((k) => s.includes(k));
}

/** Minimum approver for a task tier (§2.3 "who can approve what"). */
export function canApprove(role: Role, tier: ApproverTier, task: Task, nannyLimit: number, scoped: string[] | undefined, childId: string): boolean {
  if (role === 'parent' || role === 'coparent') return true;
  if (role === 'nanny') {
    if (tier === 'parent') return false;
    if (task.category === 'extra_job') return false;
    if (scoped && !scoped.includes(childId)) return false;
    return task.basePoints <= nannyLimit;
  }
  return false;
}

/**
 * Auto-approval (mode 3) is only offered after a successful manual-review
 * history for a low-stakes task, with high confidence and clean signals.
 */
export function autoApprovalAllowed(input: {
  mode: VerificationMode;
  tier: ApproverTier;
  aiEnabled: boolean;
  successfulReviews: number;
  minHistory: number;
  ai?: AIResult;
}): boolean {
  if (!input.aiEnabled || input.mode !== 'auto' || input.tier !== 'auto') return false;
  if (input.successfulReviews < input.minHistory) return false;
  if (!input.ai || input.ai.recommendation !== 'looks_ok') return false;
  return input.ai.confidence >= 0.85 && input.ai.signals.length === 0;
}

export function pickAuditSample(pct: number, rand: () => number = Math.random): boolean {
  return rand() * 100 < pct;
}

export function successfulReviewCount(submissions: Submission[], taskId: string, childId: string): number {
  return submissions.filter((s) => s.taskId === taskId && s.childId === childId && s.status === 'approved' && !s.autoApproved).length;
}
