import { db, nowISO, uid } from '@/db/schema';
import type { AIResult, HelpKind, Member, ProofMethod, Submission, Task } from '@/domain/types';
import { isBoostEligible } from '@/domain/economy';
import { rewardProbability } from '@/domain/stages';
import { autoApprovalAllowed, canApprove, pickAuditSample, successfulReviewCount } from '@/domain/verification';
import { dateKey } from '@/domain/time';
import { appendLedger } from './ledger';
import { audit } from './audit';
import { ensureStage } from './tasks';
import { verifyProof } from './verification';
import { COSMETICS } from './templates';
import { recordEarning } from './money';
import { castleTiles } from '@/domain/quests';
import { reminderCountToday } from './reminders';
import type { ReflectionKind } from '@/domain/types';

export interface SubmitInput {
  task: Task;
  child: Member;
  proofMethod: ProofMethod;
  media?: { blob: Blob; mime: string; hash?: string; gray?: number[] };
  note?: string;
  reminderCount?: number;
  independentStart?: boolean;
  nonce?: { code: string; issuedAt: string; expiresAt: string };
  repsClaimed?: number;
  reflection?: { kind: ReflectionKind; text?: string; mediaId?: string };
  cameraClip?: { cameraId: string; requestedAt: string; seconds: number };
}

/** Child submits the least burdensome acceptable proof. AI (if enabled) only
 *  pre-screens; it never rejects. */
export async function submitTask(input: SubmitInput): Promise<Submission> {
  const { task, child } = input;
  const family = (await db.families.get(task.familyId))!;
  const key = dateKey();
  const existing = await db.submissions.where('[taskId+childId]').equals([task.id, child.id]).filter((s) => s.dateKey === key && s.status !== 'withdrawn' && s.status !== 'retry').first();
  if (existing) return existing;

  let proofBlobId: string | undefined;
  if (input.media) {
    proofBlobId = uid();
    await db.media.add({ id: proofBlobId, familyId: task.familyId, blob: input.media.blob, mime: input.media.mime, createdAt: nowISO() });
  }
  const sub: Submission = {
    id: uid(),
    familyId: task.familyId,
    taskId: task.id,
    childId: child.id,
    dateKey: key,
    status: 'submitted',
    proofMethod: input.proofMethod,
    proofBlobId,
    proofHash: input.media?.hash,
    proofMime: input.media?.mime,
    note: input.note,
    submittedAt: nowISO(),
    reminderCount: input.reminderCount ?? (await reminderCountToday(child.id, task.id)),
    independentStart: false,
    nonce: input.nonce,
    repsClaimed: input.repsClaimed,
    reflection: input.reflection,
    cameraClip: input.cameraClip,
  };
  sub.independentStart = input.independentStart ?? sub.reminderCount === 0;

  // Optional AI pre-screen (mode 2/3). Mode 1 keeps AI silent.
  if (family.settings.aiEnabled && task.verificationMode !== 'manual' && input.proofMethod !== 'none' && input.proofMethod !== 'self_check' && input.proofMethod !== 'parent_observed') {
    const prior = await db.submissions.where('familyId').equals(task.familyId).filter((s) => !!s.proofHash && s.id !== sub.id).toArray();
    const ai: AIResult = await verifyProof({
      type: input.proofMethod,
      media: input.media,
      task,
      priorHashes: prior.map((s) => s.proofHash!),
      locale: child.locale,
    });
    sub.ai = ai;
    if (ai.recommendation === 'needs_look') sub.status = 'needs_look';
    const all = await db.submissions.where('[taskId+childId]').equals([task.id, child.id]).toArray();
    const history = successfulReviewCount(all, task.id, child.id);
    if (autoApprovalAllowed({ mode: task.verificationMode, tier: task.approverTier, aiEnabled: true, successfulReviews: history, minHistory: family.settings.autoApproveMinHistory, ai })) {
      await db.submissions.add(sub);
      await approveSubmission('ai', sub.id, { auto: true, auditSample: pickAuditSample(family.settings.autoApproveAuditPct) });
      return (await db.submissions.get(sub.id))!;
    }
  }
  await db.submissions.add(sub);
  await audit({ familyId: task.familyId, actorId: child.id, action: 'submission.create', targetType: 'submission', targetId: sub.id, after: { taskId: task.id, proofMethod: sub.proofMethod } });
  return sub;
}

/** Help paths never mean failure: they route the adult toward teaching, simplifying, rescheduling or accommodating. */
export async function requestHelp(task: Task, child: Member, help: HelpKind, note?: string): Promise<Submission> {
  const sub: Submission = {
    id: uid(), familyId: task.familyId, taskId: task.id, childId: child.id, dateKey: dateKey(), status: 'help', proofMethod: 'none', help, note,
    submittedAt: nowISO(), reminderCount: 0, independentStart: false,
  };
  await db.submissions.add(sub);
  await audit({ familyId: task.familyId, actorId: child.id, action: 'submission.help', targetType: 'submission', targetId: sub.id, after: { help } });
  return sub;
}

export interface ApproveOptions {
  auto?: boolean;
  auditSample?: boolean;
  feedback?: string;
  repsCounted?: number;
}

async function deleteRawProof(sub: Submission, familyId: string): Promise<void> {
  const fam = await db.families.get(familyId);
  if (fam?.settings.deleteRawProofOnResolve !== false && sub.proofBlobId) {
    await db.media.delete(sub.proofBlobId);
    await db.submissions.update(sub.id, { proofBlobId: undefined });
  }
}

export async function approveSubmission(actorId: string, submissionId: string, opts: ApproveOptions = {}): Promise<void> {
  const sub = await db.submissions.get(submissionId);
  if (!sub || sub.status === 'approved') return;
  const task = (await db.tasks.get(sub.taskId))!;
  const family = (await db.families.get(sub.familyId))!;
  if (actorId !== 'ai') {
    const actor = (await db.members.get(actorId))!;
    if (!canApprove(actor.role, task.approverTier, task, actor.approvalLimit ?? family.settings.nannyApprovalLimit, actor.scopedChildIds, sub.childId)) {
      throw new Error('approve.notAllowed');
    }
  }
  const stage = await ensureStage(sub.familyId, task.id, sub.childId);
  const boosted = stage.boosterUntil && new Date(stage.boosterUntil).getTime() > Date.now();
  const probability = boosted ? 1 : rewardProbability(stage.stage);
  // Thinning is predictable, never random (§1.2): at the Independent stage every
  // second approved completion of this task earns points; the child sees the rule.
  let thinnedOk = true;
  if (probability > 0 && probability < 1) {
    const priorApproved = await db.submissions.where('[taskId+childId]').equals([task.id, sub.childId]).filter((s) => s.status === 'approved').count();
    thinnedOk = priorApproved % 2 === 1;
  }
  const earnsPoints = task.currency === 'points' && task.category !== 'repair' && probability > 0 && thinnedOk;
  let ledgerEntryId: string | undefined;
  if (earnsPoints) {
    const eligible = isBoostEligible(task, stage.stage);
    const e = await appendLedger({
      familyId: sub.familyId, childId: sub.childId, kind: 'earn', amount: task.basePoints, basePoints: task.basePoints, eligibleForBoost: eligible,
      reason: task.title, refType: 'submission', refId: sub.id, approverId: actorId, configVersion: family.momentum.version,
    });
    ledgerEntryId = e.id;
  }
  await db.submissions.update(sub.id, { status: 'approved', resolvedAt: nowISO(), resolvedBy: actorId, autoApproved: !!opts.auto, auditSample: !!opts.auditSample, feedback: opts.feedback, ledgerEntryId, ...(opts.repsCounted !== undefined ? { repsCounted: opts.repsCounted } : {}) });
  await deleteRawProof(sub, sub.familyId);
  await unlockCosmetics(sub.childId);
  if (task.coop) await contributeCoop(sub.familyId, sub.childId);
  if (task.category === 'extra_job' && task.moneyAmount) await recordEarning(sub.familyId, sub.childId, task.moneyAmount, task.title, sub.id);
  await audit({ familyId: sub.familyId, actorId, action: opts.auto ? 'submission.autoApprove' : 'submission.approve', targetType: 'submission', targetId: sub.id, after: { points: earnsPoints ? task.basePoints : 0 } });
}

/** "Needs a parent's look" / "Try another proof": neutral language, retry path, never a clawback. */
export async function requestRetry(actorId: string, submissionId: string, note?: string): Promise<void> {
  const sub = await db.submissions.get(submissionId);
  if (!sub) return;
  await db.submissions.update(sub.id, { status: 'retry', resolvedAt: nowISO(), resolvedBy: actorId, note: note ?? sub.note });
  await deleteRawProof(sub, sub.familyId);
  await audit({ familyId: sub.familyId, actorId, action: 'submission.retry', targetType: 'submission', targetId: sub.id, childExplanation: 'submission.retryExplain' });
}

export async function resolveHelp(actorId: string, submissionId: string, note?: string): Promise<void> {
  const sub = await db.submissions.get(submissionId);
  if (!sub) return;
  await db.submissions.update(sub.id, { status: 'withdrawn', resolvedAt: nowISO(), resolvedBy: actorId, note });
  await audit({ familyId: sub.familyId, actorId, action: 'submission.helpResolved', targetType: 'submission', targetId: sub.id });
}

export async function approveMany(actorId: string, ids: string[], feedback?: string): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await approveSubmission(actorId, id, { feedback });
      ok++;
    } catch {
      failed++;
    }
  }
  return { ok, failed };
}

/** Child appeal; "This is incorrect" restores the intended reward when upheld and logs the AI error. */
export async function appeal(childId: string, submissionId: string, reason: string): Promise<void> {
  const sub = await db.submissions.get(submissionId);
  if (!sub) return;
  await db.submissions.update(sub.id, { appeal: { reason, at: nowISO(), status: 'open' } });
  await audit({ familyId: sub.familyId, actorId: childId, action: 'submission.appeal', targetType: 'submission', targetId: sub.id, after: { reason } });
}

export async function resolveAppeal(actorId: string, submissionId: string, uphold: boolean, note?: string): Promise<void> {
  const sub = await db.submissions.get(submissionId);
  if (!sub?.appeal) return;
  await db.submissions.update(sub.id, { appeal: { ...sub.appeal, status: uphold ? 'upheld' : 'declined', resolvedAt: nowISO(), note } });
  if (uphold && sub.status !== 'approved') {
    await db.submissions.update(sub.id, { status: 'submitted' });
    await approveSubmission(actorId, sub.id, { feedback: note });
    if (sub.ai) await audit({ familyId: sub.familyId, actorId, action: 'ai.errorRecorded', targetType: 'submission', targetId: sub.id, before: sub.ai });
  }
  await audit({ familyId: sub.familyId, actorId, action: 'submission.appealResolved', targetType: 'submission', targetId: sub.id, after: { uphold } });
}

async function unlockCosmetics(childId: string): Promise<void> {
  const m = await db.members.get(childId);
  if (!m?.child) return;
  const count = await db.submissions.where('childId').equals(childId).filter((s) => s.status === 'approved').count();
  const unlocked = COSMETICS.filter((c) => count >= c.unlockAt).map((c) => c.id);
  const merged = Array.from(new Set([...m.child.avatar.unlocked, ...unlocked]));
  const castle = castleTiles(count);
  if (merged.length !== m.child.avatar.unlocked.length || castle.length !== (m.child.castle ?? []).length) {
    await db.members.update(childId, { child: { ...m.child, castle, avatar: { ...m.child.avatar, unlocked: merged } } });
  }
}

async function contributeCoop(familyId: string, childId: string): Promise<void> {
  const goal = await db.coopGoals.where('familyId').equals(familyId).filter((g) => g.status === 'active').first();
  if (!goal) return;
  const contributions = { ...goal.contributions, [childId]: (goal.contributions[childId] ?? 0) + 1 };
  const total = Object.values(contributions).reduce((a, b) => a + b, 0);
  await db.coopGoals.update(goal.id, { contributions, status: total >= goal.targetCount ? 'reached' : 'active' });
}

/** Retention sweep: raw media older than the retention window is deleted. */
export async function sweepMedia(familyId: string): Promise<number> {
  const fam = await db.families.get(familyId);
  if (!fam) return 0;
  const cutoff = new Date(Date.now() - fam.settings.rawProofRetentionDays * 86_400_000).toISOString();
  const old = await db.media.where('familyId').equals(familyId).filter((m) => m.createdAt < cutoff).toArray();
  for (const m of old) {
    await db.media.delete(m.id);
    const sub = await db.submissions.filter((s) => s.proofBlobId === m.id).first();
    if (sub) await db.submissions.update(sub.id, { proofBlobId: undefined });
  }
  return old.length;
}
