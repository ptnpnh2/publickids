import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useChildren, useFamily, useMe, useStages } from '@/hooks/useData';
import { Button, Card, ErrorText, Field, Segmented, Toggle } from '@/components/ui';
import { archiveTask, createTask, setStage, updateTask, activeTrainingCount } from '@/services/tasks';
import { BASE_POINT_OPTIONS, suggestBasePoints } from '@/domain/economy';
import { STAGES, nextStage, prevStage } from '@/domain/stages';
import { isSensitiveTask } from '@/domain/verification';
import type { BasePoints, ProofMethod, Task, TaskCategory, VerificationMode, ApproverTier } from '@/domain/types';

const CATEGORIES: TaskCategory[] = ['selfcare', 'contribution', 'routine', 'learning', 'extra_job', 'repair'];
const PROOFS: ProofMethod[] = ['none', 'self_check', 'parent_observed', 'photo', 'audio', 'video'];

export default function TaskEditor() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const existing = useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id]);
  const [form, setForm] = useState<Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'familyId'>>({
    title: '', emoji: '🧹', category: 'contribution', currency: 'points', basePoints: 2, fairness: 'fairness.2', microSteps: [''], estimatedMinutes: 5, completionDefinition: '',
    window: { start: '16:00', end: '20:00' }, schedule: { type: 'daily' }, proofMethod: 'self_check', verificationMode: 'ai_assist', approverTier: 'caregiver', assignedChildIds: [], active: true,
  });
  const [effort, setEffort] = useState<{ effort: 1 | 2 | 3; complexity: 1 | 2 | 3; independence: 1 | 2 | 3 }>({ effort: 2, complexity: 1, independence: 2 });
  const [error, setError] = useState<string | null>(null);
  const [capWarn, setCapWarn] = useState<string | null>(null);
  useEffect(() => {
    if (existing) {
      const { id: _i, createdAt: _c, createdBy: _b, familyId: _f, ...rest } = existing;
      void _i; void _c; void _b; void _f;
      setForm(rest);
    }
  }, [existing]);
  useEffect(() => {
    void (async () => {
      if (!family || form.currency !== 'points') return setCapWarn(null);
      for (const cid of form.assignedChildIds) {
        const n = await activeTrainingCount(cid);
        if (n >= family.settings.activeTrainingCap && !existing?.assignedChildIds.includes(cid)) return setCapWarn(t('task.capWarn', { name: kids.find((k) => k.id === cid)?.name, n: family.settings.activeTrainingCap }));
      }
      setCapWarn(null);
    })();
  }, [form.assignedChildIds, form.currency, family, existing, kids, t]);

  const sensitive = isSensitiveTask(form.title, form.completionDefinition);
  const patch = (p: Partial<typeof form>) => setForm({ ...form, ...p });

  async function save() {
    if (!me || !family) return;
    setError(null);
    if (!form.title.trim()) return setError('task.needTitle');
    if (!form.assignedChildIds.length) return setError('task.needChild');
    const clean = { ...form, microSteps: form.microSteps.filter((s) => s.trim()), fairness: `fairness.${form.basePoints}` };
    try {
      if (existing) await updateTask(me.id, existing.id, clean, 'task.updatedExplain');
      else await createTask(me.id, { ...clean, familyId: family.id });
      nav('/parent/tasks');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">{existing ? t('task.edit') : t('task.new')}</h1>
      <Card>
        <div className="flex gap-2">
          <input className="input w-16 text-center" value={form.emoji} onChange={(e) => patch({ emoji: e.target.value })} aria-label="emoji" />
          <input className="input" placeholder={t('task.titlePlaceholder')} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <Field label={t('task.category')} hint={t(`categoryHint.${form.category}`)}>
          <select className="input" value={form.category} onChange={(e) => { const category = e.target.value as TaskCategory; patch({ category, currency: category === 'repair' ? 'ack' : form.currency, approverTier: category === 'extra_job' ? 'parent' : form.approverTier }); }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`category.${c}`)}</option>
            ))}
          </select>
        </Field>
        <Field label={t('task.currency')} hint={t('task.currencyHint')}>
          <Segmented value={form.currency} onChange={(currency) => patch({ currency })} options={[{ value: 'ack', label: `👏 ${t('currency.ack')}` }, { value: 'points', label: `⭐ ${t('currency.points')}` }]} />
        </Field>
        {form.currency === 'points' && (
          <Field label={t('task.basePoints')} hint={t('task.basePointsHint')}>
            <div className="flex gap-2 mb-2">
              {BASE_POINT_OPTIONS.map((p) => (
                <button key={p} type="button" className={`btn ${form.basePoints === p ? 'btn-primary' : 'btn-secondary'} flex-1`} onClick={() => patch({ basePoints: p })}>
                  {p}
                </button>
              ))}
            </div>
            <details className="text-sm">
              <summary className="muted cursor-pointer">{t('task.suggestValue')}</summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['effort', 'complexity', 'independence'] as const).map((k) => (
                  <label key={k}>
                    <span className="label">{t(`task.${k}`)}</span>
                    <select className="input" value={effort[k]} onChange={(e) => { const next = { ...effort, [k]: Number(e.target.value) as 1 | 2 | 3 }; setEffort(next); patch({ basePoints: suggestBasePoints({ estimatedMinutes: form.estimatedMinutes, ...next }) as BasePoints }); }}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </label>
                ))}
              </div>
            </details>
          </Field>
        )}
        <Field label={t('task.microSteps')} hint={t('task.microStepsHint')}>
          {form.microSteps.map((s, i) => (
            <input key={i} className="input mb-1" value={s} onChange={(e) => { const m = [...form.microSteps]; m[i] = e.target.value; patch({ microSteps: m }); }} placeholder={`${i + 1}.`} />
          ))}
          {form.microSteps.length < 5 && (
            <Button variant="ghost" className="text-sm" onClick={() => patch({ microSteps: [...form.microSteps, ''] })}>
              ＋ {t('task.addStep')}
            </Button>
          )}
        </Field>
        <Field label={t('task.doneWhen')}>
          <input className="input" value={form.completionDefinition} onChange={(e) => patch({ completionDefinition: e.target.value })} placeholder={t('task.doneWhenPlaceholder')} />
        </Field>
        <Field label={t('task.imageUrl')} hint={t('task.imageHint')}>
          <input className="input" value={form.imageUrl ?? ''} onChange={(e) => patch({ imageUrl: e.target.value || undefined })} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label={t('task.minutes')}>
            <input className="input" type="number" min={1} value={form.estimatedMinutes} onChange={(e) => patch({ estimatedMinutes: Number(e.target.value) })} />
          </Field>
          <Field label={t('task.windowStart')}>
            <input className="input" type="time" value={form.window.start} onChange={(e) => patch({ window: { ...form.window, start: e.target.value } })} />
          </Field>
          <Field label={t('task.windowEnd')}>
            <input className="input" type="time" value={form.window.end} onChange={(e) => patch({ window: { ...form.window, end: e.target.value } })} />
          </Field>
        </div>
        <Field label={t('task.schedule')}>
          <Segmented value={form.schedule.type} onChange={(type) => patch({ schedule: { ...form.schedule, type, days: type === 'weekly' ? form.schedule.days ?? [6] : undefined } })} options={[{ value: 'daily', label: t('schedule.daily') }, { value: 'weekdays', label: t('schedule.weekdays') }, { value: 'weekly', label: t('schedule.weekly') }, { value: 'once', label: t('schedule.once') }]} />
          {form.schedule.type === 'weekly' && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} type="button" className={`btn flex-1 text-xs ${form.schedule.days?.includes(d) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { const days = form.schedule.days ?? []; patch({ schedule: { ...form.schedule, days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] } }); }}>
                  {t(`weekday.${d}`)}
                </button>
              ))}
            </div>
          )}
          {form.schedule.type === 'once' && <input className="input mt-2" type="date" value={form.schedule.date ?? ''} onChange={(e) => patch({ schedule: { ...form.schedule, date: e.target.value } })} />}
        </Field>
        <Field label={t('task.proof')} hint={t('task.proofHint')}>
          <select className="input" value={form.proofMethod} onChange={(e) => patch({ proofMethod: e.target.value as ProofMethod })}>
            {PROOFS.filter((p) => !(sensitive && (p === 'photo' || p === 'video'))).map((p) => (
              <option key={p} value={p}>{t(`proof.${p}`)}</option>
            ))}
          </select>
          {sensitive && <p className="text-xs mt-1" style={{ color: 'var(--warn)' }}>{t('task.sensitiveWarn')}</p>}
        </Field>
        <Field label={t('task.verification')} hint={t(`verificationHint.${form.verificationMode}`)}>
          <Segmented value={form.verificationMode} onChange={(verificationMode: VerificationMode) => patch({ verificationMode })} options={[{ value: 'manual', label: t('verification.manual') }, { value: 'ai_assist', label: t('verification.ai_assist') }, { value: 'auto', label: t('verification.auto') }]} />
        </Field>
        <Field label={t('task.approver')}>
          <Segmented value={form.approverTier} onChange={(approverTier: ApproverTier) => patch({ approverTier })} options={[{ value: 'auto', label: t('approver.auto') }, { value: 'caregiver', label: t('approver.caregiver') }, { value: 'parent', label: t('approver.parent') }]} />
        </Field>
        <Field label={t('task.assign')}>
          <div className="flex flex-wrap gap-2">
            {kids.map((k) => (
              <button key={k.id} type="button" className={`btn ${form.assignedChildIds.includes(k.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => patch({ assignedChildIds: form.assignedChildIds.includes(k.id) ? form.assignedChildIds.filter((x) => x !== k.id) : [...form.assignedChildIds, k.id] })}>
                {k.child?.avatar.emoji} {k.name}
              </button>
            ))}
          </div>
          {capWarn && <p className="text-xs mt-1" style={{ color: 'var(--warn)' }}>{capWarn}</p>}
        </Field>
        <Field label={t('task.choiceGroup')} hint={t('task.choiceGroupHint')}>
          <input className="input" value={form.choiceGroup ?? ''} onChange={(e) => patch({ choiceGroup: e.target.value || undefined })} />
        </Field>
        {form.category === 'extra_job' && (
          <Field label={t('task.moneyAmount', { cur: family?.settings.money.currency })} hint={family?.settings.money.enabled ? t('task.moneyHint') : t('task.moneyDisabled')}>
            <input className="input" type="number" min={0} step={0.5} value={form.moneyAmount ?? ''} onChange={(e) => patch({ moneyAmount: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </Field>
        )}
        <Field label={t('task.exercise')} hint={t('task.exerciseHint')}>
          <div className="flex gap-2">
            <select className="input" value={form.exercise?.kind ?? ''} onChange={(e) => patch({ exercise: e.target.value ? { kind: e.target.value as NonNullable<Task['exercise']>['kind'], reps: form.exercise?.reps ?? 10 } : undefined })}>
              <option value="">—</option>
              {(['pushups', 'squats', 'plank', 'jumps', 'other'] as const).map((k) => <option key={k} value={k}>{t(`exercise.${k}`)}</option>)}
            </select>
            {form.exercise && <input className="input w-24" type="number" min={1} value={form.exercise.reps} onChange={(e) => patch({ exercise: { ...form.exercise!, reps: Number(e.target.value) } })} aria-label={t('task.reps')} />}
          </div>
        </Field>
        {form.proofMethod === 'video' && (
          <>
            <Toggle label={t('task.nonce')} checked={!!form.nonce} onChange={(nonce) => patch({ nonce })} />
            <p className="muted text-xs -mt-1 mb-2">{t('task.nonceHint')}</p>
            {family?.settings.camera.enabled && form.exercise && (
              <Field label={t('task.camera')} hint={t('task.cameraHint')}>
                <select className="input" value={form.cameraId ?? ''} onChange={(e) => patch({ cameraId: e.target.value || undefined })}>
                  <option value="">—</option>
                  {family.settings.camera.cameras.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.zone}</option>)}
                </select>
              </Field>
            )}
          </>
        )}
        {form.category === 'learning' && (
          <Field label={t('task.reading')} hint={t('task.readingHint')}>
            <div className="grid gap-2">
              <input className="input" placeholder={t('task.bookTitle')} value={form.reading?.bookTitle ?? ''} onChange={(e) => patch({ reading: e.target.value ? { bookTitle: e.target.value, reflectEvery: form.reading?.reflectEvery ?? 3, quiz: form.reading?.quiz } : undefined })} />
              {form.reading && (
                <>
                  <label className="text-sm flex items-center gap-2">{t('task.reflectEvery')} <input className="input w-20" type="number" min={0} max={10} value={form.reading.reflectEvery} onChange={(e) => patch({ reading: { ...form.reading!, reflectEvery: Number(e.target.value) } })} /></label>
                  {(form.reading.quiz ?? []).map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input" placeholder={t('task.quizQ')} value={q.q} onChange={(e) => patch({ reading: { ...form.reading!, quiz: form.reading!.quiz!.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) } })} />
                      <input className="input" placeholder={t('task.quizA')} value={q.a} onChange={(e) => patch({ reading: { ...form.reading!, quiz: form.reading!.quiz!.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) } })} />
                    </div>
                  ))}
                  {(form.reading.quiz?.length ?? 0) < 3 && <Button variant="ghost" className="text-sm" onClick={() => patch({ reading: { ...form.reading!, quiz: [...(form.reading!.quiz ?? []), { q: '', a: '' }] } })}>＋ {t('task.addQuiz')}</Button>}
                </>
              )}
            </div>
          </Field>
        )}
        <Toggle label={t('task.coop')} checked={!!form.coop} onChange={(coop) => patch({ coop })} />
        <Toggle label={t('task.active')} checked={form.active} onChange={(active) => patch({ active })} />
        <ErrorText error={error} />
        <div className="flex gap-2 mt-3">
          <Button className="flex-1" onClick={save}>{t('common.save')}</Button>
          {existing && (
            <Button variant="secondary" onClick={async () => { if (me) { await archiveTask(me.id, existing.id); nav('/parent/tasks'); } }}>
              {t('common.archive')}
            </Button>
          )}
        </div>
      </Card>
      {existing && existing.assignedChildIds.map((cid) => <StageCard key={cid} task={existing} childId={cid} />)}
    </div>
  );
}

function StageCard({ task, childId }: { task: Task; childId: string }) {
  const { t } = useTranslation();
  const me = useMe();
  const kids = useChildren();
  const stages = useStages(childId);
  const kid = kids.find((k) => k.id === childId);
  const st = stages.find((s) => s.taskId === task.id);
  const stage = st?.stage ?? 'learning';
  const [assent, setAssent] = useState(true);
  return (
    <Card>
      <h2 className="font-bold">
        {kid?.child?.avatar.emoji} {kid?.name} · {t('stage.title')}
      </h2>
      <div className="flex gap-1 my-2">
        {STAGES.map((s, i) => (
          <span key={s} className="chip" style={{ opacity: i <= STAGES.indexOf(stage) ? 1 : 0.4 }}>{t(`stage.${s}`)}</span>
        ))}
      </div>
      <p className="muted text-xs">{t(`stage.explain.${stage}`)}</p>
      {st?.boosterUntil && new Date(st.boosterUntil) > new Date() && <p className="text-xs mt-1">🔋 {t('stage.boosterUntil', { date: new Date(st.boosterUntil).toLocaleDateString() })}</p>}
      <Toggle label={t('stage.childAssent')} checked={assent} onChange={setAssent} />
      <div className="flex flex-wrap gap-2 mt-2">
        {prevStage(stage) && (
          <Button variant="secondary" onClick={() => me && setStage(me.id, task.id, childId, prevStage(stage)!, assent)}>← {t(`stage.${prevStage(stage)}`)}</Button>
        )}
        {nextStage(stage) && (
          <Button onClick={() => me && setStage(me.id, task.id, childId, nextStage(stage)!, assent)}>{t(`stage.${nextStage(stage)}`)} →</Button>
        )}
        <Button variant="ghost" onClick={() => me && setStage(me.id, task.id, childId, stage, assent, 7)}>🔋 {t('stage.booster')}</Button>
      </div>
    </Card>
  );
}
