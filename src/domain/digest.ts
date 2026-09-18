import type { Incident, Submission, Task } from './types';

export interface DigestCard {
  worked: { key: string; params?: Record<string, string | number> }[];
  friction: { key: string; params?: Record<string, string | number> }[];
  suggestion: { key: string; params?: Record<string, string | number> };
  balance: { key: string; params?: Record<string, string | number> }[];
}

/**
 * Weekly three-card digest (§2.7-1) and System Balance Review (§2.7-2).
 * Reports observable patterns only; never claims to detect laziness, honesty,
 * personality, mood, or intrinsic motivation.
 */
export function buildDigest(input: {
  tasks: Task[];
  submissions: Submission[]; // this week
  prevSubmissions: Submission[]; // last week
  incidents: Incident[]; // this week
  approvalDelaysMin: number[];
  parentMinutesPerDay?: number;
}): DigestCard {
  const approved = input.submissions.filter((s) => s.status === 'approved');
  const prevApproved = input.prevSubmissions.filter((s) => s.status === 'approved');
  const independent = approved.filter((s) => s.independentStart).length;
  const help = input.submissions.filter((s) => s.status === 'help').length;
  const needsLook = input.submissions.filter((s) => s.status === 'needs_look' || s.status === 'retry').length;
  const photoHeavy = approved.filter((s) => s.proofMethod === 'photo' || s.proofMethod === 'video').length;
  const avgDelay = input.approvalDelaysMin.length ? Math.round(input.approvalDelaysMin.reduce((a, b) => a + b, 0) / input.approvalDelaysMin.length) : 0;

  const worked: DigestCard['worked'] = [];
  if (approved.length) worked.push({ key: 'digest.worked.completed', params: { n: approved.length } });
  if (independent) worked.push({ key: 'digest.worked.independent', params: { n: independent } });
  if (approved.length > prevApproved.length) worked.push({ key: 'digest.worked.up', params: { n: approved.length - prevApproved.length } });
  if (!worked.length) worked.push({ key: 'digest.worked.none' });

  const friction: DigestCard['friction'] = [];
  if (help) friction.push({ key: 'digest.friction.help', params: { n: help } });
  if (needsLook) friction.push({ key: 'digest.friction.needsLook', params: { n: needsLook } });
  if (input.incidents.length >= 3) friction.push({ key: 'digest.friction.corrections', params: { n: input.incidents.length } });
  if (avgDelay > 120) friction.push({ key: 'digest.friction.delay', params: { n: avgDelay } });
  if (!friction.length) friction.push({ key: 'digest.friction.none' });

  let suggestion: DigestCard['suggestion'] = { key: 'digest.suggest.keep' };
  if (input.incidents.length >= 3) suggestion = { key: 'digest.suggest.simplify' };
  else if (help >= 2) suggestion = { key: 'digest.suggest.teach' };
  else if (avgDelay > 120) suggestion = { key: 'digest.suggest.batch' };
  else if (approved.length && photoHeavy / approved.length > 0.6) suggestion = { key: 'digest.suggest.reduceProof' };
  else if (independent && independent / Math.max(approved.length, 1) > 0.7) suggestion = { key: 'digest.suggest.graduate' };

  const balance: DigestCard['balance'] = [];
  if (approved.length && photoHeavy / approved.length > 0.6) balance.push({ key: 'balance.proofBurden' });
  if (prevApproved.length && independent / Math.max(approved.length, 1) < prevApproved.filter((s) => s.independentStart).length / prevApproved.length) balance.push({ key: 'balance.independentDown' });
  const activePointTasks = input.tasks.filter((t) => t.active && t.currency === 'points').length;
  if (activePointTasks > 5) balance.push({ key: 'balance.tooManyTasks', params: { n: activePointTasks } });
  if (!balance.length) balance.push({ key: 'balance.ok' });

  return { worked, friction, suggestion, balance };
}
