import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChildren, useFamily, useMe, useMedia, useRedemptions, useRewards, useSubmissions, useTasks, useGoals, useIncidents } from '@/hooks/useData';
import { Button, Card, Empty, ErrorText, Modal, Toast, useToast } from '@/components/ui';
import { approveMany, approveSubmission, requestRetry, resolveAppeal, resolveHelp } from '@/services/submissions';
import { resolveRedemption, updateReward } from '@/services/rewards';
import { db } from '@/db/schema';
import { praiseOptions, flagsGenericPraise } from '@/domain/praise';
import { updateTask } from '@/services/tasks';
import { resolveIncidentAppeal } from '@/services/incidents';
import { audit } from '@/services/audit';
import type { Submission } from '@/domain/types';

/** Parent batch approval with AI summary, Praise Coach and help-path routing. */
export default function Approvals() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const tasks = useTasks();
  const subs = useSubmissions();
  const redemptions = useRedemptions();
  const rewards = useRewards();
  const goals = useGoals();
  const incidents = useIncidents();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [praiseFor, setPraiseFor] = useState<Submission | null>(null);
  const [praiseText, setPraiseText] = useState('');

  const kidIds = new Set(kids.map((k) => k.id));
  const pending = useMemo(() => subs.filter((s) => kidIds.has(s.childId) && (s.status === 'submitted' || s.status === 'needs_look')).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [subs, kids]);
  const helps = subs.filter((s) => kidIds.has(s.childId) && s.status === 'help');
  const appeals = subs.filter((s) => kidIds.has(s.childId) && s.appeal?.status === 'open');
  const audits = subs.filter((s) => kidIds.has(s.childId) && s.autoApproved && s.auditSample && !s.feedback);
  const pendingRedemptions = redemptions.filter((r) => r.status === 'requested' && kidIds.has(r.childId));
  const proposedRewards = rewards.filter((r) => r.status === 'proposed');
  const proposedTasks = tasks.filter((x) => x.proposedBy);
  const proposedGoals = goals.filter((g) => g.status === 'proposed');
  const incidentAppeals = incidents.filter((i) => i.appeal?.status === 'open');
  const taskOf = (id: string) => tasks.find((x) => x.id === id);
  const kidOf = (id: string) => kids.find((k) => k.id === id);
  const isParent = me?.role === 'parent' || me?.role === 'coparent';

  async function approve(ids: string[], feedback?: string) {
    if (!me) return;
    setError(null);
    const r = await approveMany(me.id, ids, feedback);
    setSelected([]);
    if (r.failed) setError('approve.someNotAllowed');
    toast.show(t('approve.done', { n: r.ok }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('nav.approve')}</h1>
        {pending.length > 0 && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSelected(selected.length === pending.length ? [] : pending.map((s) => s.id))}>
              {selected.length === pending.length ? t('approve.none') : t('approve.all')}
            </Button>
            <Button disabled={!selected.length} onClick={() => approve(selected)}>
              ✅ {t('approve.selected', { n: selected.length })}
            </Button>
          </div>
        )}
      </div>
      <ErrorText error={error} />
      {pending.length === 0 && helps.length === 0 && appeals.length === 0 && pendingRedemptions.length === 0 && proposedRewards.length === 0 && proposedTasks.length === 0 && proposedGoals.length === 0 && audits.length === 0 && incidentAppeals.length === 0 && <Empty emoji="🛋️" text={t('approve.empty')} />}

      {pending.map((s) => {
        const task = taskOf(s.taskId);
        const kid = kidOf(s.childId);
        if (!task || !kid) return null;
        return (
          <Card key={s.id}>
            <div className="flex items-start gap-3">
              <input type="checkbox" className="w-6 h-6 mt-1" checked={selected.includes(s.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id))} aria-label={t('approve.select')} />
              <div className="flex-1 min-w-0">
                <div className="font-bold">
                  {kid.child?.avatar.emoji} {kid.name} · {task.emoji} {task.title}
                </div>
                <div className="muted text-xs">
                  {new Date(s.submittedAt).toLocaleString()} · {t(`proof.${s.proofMethod}`)} · ⭐ {task.currency === 'points' ? task.basePoints : 0}
                  {s.status === 'needs_look' && <span className="chip ml-2">{t('status.needs_look')}</span>}
                </div>
                {s.note && <p className="text-sm mt-1">📝 {s.note}</p>}
                {s.ai && (
                  <p className="text-xs mt-1 muted">
                    🤖 {t(`ai.rec.${s.ai.recommendation}`)} ({Math.round(s.ai.confidence * 100)}%) · {t(s.ai.explanation, { defaultValue: s.ai.explanation })}
                  </p>
                )}
                <ProofPreview id={s.proofBlobId} mime={s.proofMime} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button onClick={() => approve([s.id])}>✅ {t('approve.approve')}</Button>
              <Button variant="secondary" onClick={() => { setPraiseFor(s); setPraiseText(''); }}>
                💬 {t('praise.title')}
              </Button>
              <Button variant="secondary" onClick={async () => { if (me) { await requestRetry(me.id, s.id); toast.show(t('approve.retrySent')); } }}>
                🔁 {t('approve.tryAnother')}
              </Button>
            </div>
          </Card>
        );
      })}

      {helps.map((s) => {
        const task = taskOf(s.taskId);
        const kid = kidOf(s.childId);
        if (!task || !kid) return null;
        return (
          <Card key={s.id}>
            <div className="font-bold">
              🙋 {kid.name} · {task.emoji} {task.title}
            </div>
            <p className="text-sm mt-1">
              {t(`help.${s.help}`)}
              {s.note ? ` — ${s.note}` : ''}
            </p>
            <p className="muted text-xs mt-1">{t(`help.route.${s.help}`)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="secondary" onClick={() => me && resolveHelp(me.id, s.id, 'taught')}>{t('help.action.teach')}</Button>
              <Button variant="secondary" onClick={async () => { if (me) { await updateTask(me.id, task.id, { basePoints: task.basePoints, microSteps: task.microSteps.slice(0, 3) }, 'task.simplified'); await resolveHelp(me.id, s.id, 'simplified'); } }}>{t('help.action.simplify')}</Button>
              <Button variant="secondary" onClick={async () => { if (me) { await updateTask(me.id, task.id, { window: { start: task.window.start, end: '21:00' } }, 'task.rescheduled'); await resolveHelp(me.id, s.id, 'rescheduled'); } }}>{t('help.action.reschedule')}</Button>
            </div>
          </Card>
        );
      })}

      {appeals.map((s) => {
        const task = taskOf(s.taskId);
        const kid = kidOf(s.childId);
        return (
          <Card key={s.id}>
            <div className="font-bold">
              ⚖️ {kid?.name} · {task?.title}
            </div>
            <p className="text-sm mt-1">“{s.appeal?.reason}”</p>
            <div className="flex gap-2 mt-3">
              <Button onClick={() => me && resolveAppeal(me.id, s.id, true)}>{t('appeal.uphold')}</Button>
              <Button variant="secondary" onClick={() => me && resolveAppeal(me.id, s.id, false)}>{t('appeal.decline')}</Button>
            </div>
          </Card>
        );
      })}

      {incidentAppeals.map((i) => (
        <Card key={i.id}>
          <div className="font-bold">⚖️ {kidOf(i.childId)?.name} · {t('repair.appeal')}</div>
          <p className="text-sm mt-1">{i.description}</p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => me && resolveIncidentAppeal(me.id, i.id, true)}>{t('appeal.uphold')}</Button>
            <Button variant="secondary" onClick={() => me && resolveIncidentAppeal(me.id, i.id, false)}>{t('appeal.decline')}</Button>
          </div>
        </Card>
      ))}

      {audits.map((s) => (
        <Card key={s.id}>
          <div className="font-bold">🔍 {t('approve.auditSample')} · {kidOf(s.childId)?.name} · {taskOf(s.taskId)?.title}</div>
          <p className="muted text-xs">{s.ai?.explanation && t(s.ai.explanation, { defaultValue: s.ai.explanation })}</p>
          <div className="flex gap-2 mt-2">
            <Button variant="secondary" onClick={() => db.submissions.update(s.id, { feedback: '✓' })}>{t('approve.auditOk')}</Button>
            <Button variant="secondary" onClick={async () => { if (me) { await requestRetry(me.id, s.id, 'audit'); await audit({ familyId: s.familyId, actorId: me.id, action: 'ai.errorRecorded', targetType: 'submission', targetId: s.id, before: s.ai }); } }}>{t('approve.auditWrong')}</Button>
          </div>
        </Card>
      ))}

      {isParent && pendingRedemptions.map((r) => {
        const reward = rewards.find((x) => x.id === r.rewardId);
        return (
          <Card key={r.id}>
            <div className="font-bold">
              🎁 {kidOf(r.childId)?.name} · {reward?.emoji} {reward?.title} · ⭐ {r.cost}
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={() => me && resolveRedemption(me.id, r.id, 'fulfilled')}>{t('store.fulfil')}</Button>
              <Button variant="secondary" onClick={() => me && resolveRedemption(me.id, r.id, 'declined')}>{t('store.declineRefund')}</Button>
            </div>
          </Card>
        );
      })}

      {isParent && proposedRewards.map((r) => (
        <Card key={r.id}>
          <div className="font-bold">💡 {t('store.proposedBy', { name: kidOf(r.proposedBy ?? '')?.name })}: {r.emoji} {r.title} · ⭐ {r.cost}</div>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => me && updateReward(me.id, r.id, { status: 'active' })}>{t('common.accept')}</Button>
            <Button variant="secondary" onClick={() => me && updateReward(me.id, r.id, { status: 'archived' })}>{t('common.decline')}</Button>
          </div>
        </Card>
      ))}

      {isParent && proposedTasks.map((x) => (
        <Card key={x.id}>
          <div className="font-bold">💡 {t('task.proposedBy', { name: kidOf(x.proposedBy ?? '')?.name })}: {x.emoji} {x.title} · ⭐ {x.basePoints}</div>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => me && updateTask(me.id, x.id, { proposedBy: undefined, active: true })}>{t('common.accept')}</Button>
            <Button variant="secondary" onClick={() => me && updateTask(me.id, x.id, { archived: true, active: false })}>{t('common.decline')}</Button>
          </div>
        </Card>
      ))}

      {isParent && proposedGoals.map((g) => (
        <Card key={g.id}>
          <div className="font-bold">💡 {kidOf(g.childId)?.name}: {g.emoji} {g.title} · ⭐ {g.targetPoints}</div>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => db.goals.update(g.id, { status: 'active' })}>{t('common.accept')}</Button>
            <Button variant="secondary" onClick={() => db.goals.update(g.id, { status: 'abandoned' })}>{t('common.decline')}</Button>
          </div>
        </Card>
      ))}

      <Modal open={!!praiseFor} onClose={() => setPraiseFor(null)} title={t('praise.title')}>
        {praiseFor && family && (() => {
          const task = taskOf(praiseFor.taskId)!;
          const kid = kidOf(praiseFor.childId)!;
          const opts = praiseOptions({ taskTitle: task.title, stepsCount: task.microSteps.length, independentStart: praiseFor.independentStart, stage: 'learning', childName: kid.name });
          return (
            <>
              <p className="muted text-sm mb-2">{t('praise.hint')}</p>
              <div className="grid gap-2 mb-3">
                {opts.map((o) => (
                  <button key={o.kind} className="card text-left text-sm" onClick={() => setPraiseText(t(o.key, o.params))}>
                    <span className="chip mb-1">{t(`praise.kind.${o.kind}`)}</span>
                    <div>{t(o.key, o.params)}</div>
                  </button>
                ))}
              </div>
              <textarea className="input" rows={3} value={praiseText} onChange={(e) => setPraiseText(e.target.value)} placeholder={t('praise.placeholder')} />
              {flagsGenericPraise(praiseText) && <p className="text-xs mt-1" style={{ color: 'var(--warn)' }}>{t('praise.genericWarning')}</p>}
              <div className="flex gap-2 mt-3">
                <Button className="flex-1" onClick={async () => { if (me) { await approveSubmission(me.id, praiseFor.id, { feedback: praiseText || undefined }); setPraiseFor(null); toast.show(t('approve.done', { n: 1 })); } }}>
                  ✅ {t('praise.approveWith')}
                </Button>
              </div>
            </>
          );
        })()}
      </Modal>
      <Toast message={toast.message} onDone={toast.clear} />
    </div>
  );
}

function ProofPreview({ id, mime }: { id?: string; mime?: string }) {
  const media = useMedia(id);
  const url = useMemo(() => (media ? URL.createObjectURL(media.blob) : null), [media]);
  if (!media || !url) return null;
  if ((mime ?? media.mime).startsWith('image/')) return <img src={url} alt="" className="rounded-xl mt-2 max-h-56 object-cover" />;
  if ((mime ?? media.mime).startsWith('audio/')) return <audio src={url} controls className="mt-2 w-full" />;
  if ((mime ?? media.mime).startsWith('video/')) return <video src={url} controls className="mt-2 w-full rounded-xl max-h-64" />;
  return null;
}
