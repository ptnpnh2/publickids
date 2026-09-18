import type { AuditEntry, LedgerEntry, MomentumState, Submission, Task } from './types';

export interface BalanceMetric {
  key: string; // i18n key under balance.metric
  value: number;
  unit: 'pct' | 'count' | 'ratio';
  status: 'ok' | 'watch' | 'act';
  params?: Record<string, string | number>;
}

/**
 * Advanced System Balance Review (§2.7-2, §5 economy health): observable
 * patterns only. Never claims to detect laziness, honesty, personality, mood or
 * motivation.
 */
export function balanceReview(input: {
  tasks: Task[];
  submissions: Submission[]; // last 8 weeks
  ledger: LedgerEntry[]; // last 8 weeks
  audit: AuditEntry[]; // last 8 weeks
  momentum: MomentumState[];
  levelKeys: string[];
}): BalanceMetric[] {
  const approved = input.submissions.filter((s) => s.status === 'approved');
  const withProof = approved.filter((s) => s.proofMethod === 'photo' || s.proofMethod === 'video' || s.proofMethod === 'audio');
  const proofBurden = pct(withProof.length, approved.length);
  const appeals = input.submissions.filter((s) => s.appeal).length;
  const appealRate = pct(appeals, Math.max(input.submissions.length, 1));
  const needsLook = input.submissions.filter((s) => s.status === 'needs_look' || s.status === 'retry').length;
  const doubtRate = pct(needsLook, Math.max(input.submissions.length, 1));
  const base = input.ledger.filter((e) => e.kind === 'earn').reduce((s, e) => s + e.amount, 0);
  const bonus = input.ledger.filter((e) => e.kind === 'bonus').reduce((s, e) => s + e.amount, 0);
  const bonusRatio = base ? Math.round((bonus / base) * 100) : 0;
  const rewardLight = approved.filter((s) => !s.ledgerEntryId).length;
  const rewardLightPct = pct(rewardLight, approved.length);
  const independent = pct(approved.filter((s) => s.independentStart).length, approved.length);
  const proposals = input.audit.filter((a) => a.action === 'task.propose' || a.action === 'reward.propose' || a.action === 'goal.propose').length;
  const overrides = input.audit.filter((a) => a.action === 'momentum.config').length;
  const autoApproved = approved.filter((s) => s.autoApproved).length;
  const aiErrors = input.audit.filter((a) => a.action === 'ai.errorRecorded').length;
  const pointTasks = input.tasks.filter((t) => t.active && t.currency === 'points').length;
  const topLevel = input.momentum.filter((m) => input.levelKeys.indexOf(m.levelKey) >= input.levelKeys.length - 1).length;

  return [
    { key: 'proofBurden', value: proofBurden, unit: 'pct', status: proofBurden > 60 ? 'act' : proofBurden > 40 ? 'watch' : 'ok' },
    { key: 'doubtRate', value: doubtRate, unit: 'pct', status: doubtRate > 25 ? 'act' : doubtRate > 10 ? 'watch' : 'ok' },
    { key: 'appealRate', value: appealRate, unit: 'pct', status: appealRate > 15 ? 'act' : appealRate > 5 ? 'watch' : 'ok' },
    { key: 'bonusRatio', value: bonusRatio, unit: 'pct', status: bonusRatio > 15 ? 'act' : bonusRatio > 10 ? 'watch' : 'ok' },
    { key: 'rewardLight', value: rewardLightPct, unit: 'pct', status: 'ok' },
    { key: 'independentStarts', value: independent, unit: 'pct', status: independent < 30 && approved.length > 10 ? 'watch' : 'ok' },
    { key: 'negotiation', value: proposals, unit: 'count', status: proposals > 8 ? 'watch' : 'ok' },
    { key: 'overrides', value: overrides, unit: 'count', status: overrides > 2 ? 'watch' : 'ok' },
    { key: 'autoApproved', value: autoApproved, unit: 'count', status: aiErrors > 2 ? 'act' : 'ok', params: { errors: aiErrors } },
    { key: 'pointTasks', value: pointTasks, unit: 'count', status: pointTasks > 5 ? 'watch' : 'ok' },
    { key: 'topLevel', value: topLevel, unit: 'count', status: 'ok' },
  ];
}

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
