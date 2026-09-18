import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChildren, useFamily, useGoals, useMe, useRewards } from '@/hooks/useData';
import { Button, Card, Field, Modal, Segmented, Empty } from '@/components/ui';
import { abandonGoal, createGoal, createReward, updateReward } from '@/services/rewards';
import type { Reward, RewardSection } from '@/domain/types';

export default function Rewards() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const rewards = useRewards().filter((r) => r.status !== 'proposed');
  const goals = useGoals();
  const [editing, setEditing] = useState<Partial<Reward> | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goal, setGoal] = useState({ childId: '', title: '', emoji: '🎯', target: 40 });
  const isParent = me?.role === 'parent' || me?.role === 'coparent';

  async function save() {
    if (!me || !family || !editing?.title) return;
    if (editing.id) await updateReward(me.id, editing.id, editing);
    else await createReward(me.id, { familyId: family.id, title: editing.title, emoji: editing.emoji ?? '🎁', section: editing.section ?? 'quick', cost: editing.cost ?? 5, availability: editing.availability ?? 'always', weeklyBudget: editing.weeklyBudget, childIds: editing.childIds, status: 'active' });
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('nav.rewards')}</h1>
        {isParent && <Button onClick={() => setEditing({ section: 'quick', cost: 5, availability: 'always', emoji: '🎁' })}>＋ {t('reward.new')}</Button>}
      </div>
      <p className="muted text-xs">{t('store.neverStore')}</p>
      {rewards.length === 0 && <Empty text={t('reward.empty')} emoji="🎁" />}
      {rewards.map((r) => (
        <Card key={r.id} className="flex items-center gap-3" onClick={() => isParent && setEditing(r)}>
          <span className="text-2xl">{r.emoji}</span>
          <span className="flex-1">
            <span className="font-bold block">{r.title}</span>
            <span className="muted text-xs">{t(`store.section.${r.section}`)} · {t(`availability.${r.availability}`)}{r.weeklyBudget ? ` · ${t('reward.budget', { n: r.weeklyBudget })}` : ''}</span>
          </span>
          <span className="chip">⭐ {r.cost}</span>
          {r.status === 'archived' && <span className="chip">{t('common.archived')}</span>}
        </Card>
      ))}

      <div className="flex items-center justify-between mt-6">
        <h2 className="text-xl font-bold">{t('goal.parentTitle')}</h2>
        {isParent && <Button variant="secondary" onClick={() => { setGoal({ ...goal, childId: kids[0]?.id ?? '' }); setGoalOpen(true); }}>＋ {t('goal.new')}</Button>}
      </div>
      <p className="muted text-xs">{t('goal.focusHint')}</p>
      {goals.filter((g) => g.status === 'active' || g.status === 'reached').map((g) => (
        <Card key={g.id} className="flex items-center gap-3">
          <span className="text-2xl">{g.emoji}</span>
          <span className="flex-1">
            <span className="font-bold block">{g.title} · {kids.find((k) => k.id === g.childId)?.name}</span>
            <span className="muted text-xs">{g.savedPoints}/{g.targetPoints} ⭐ · {g.primary ? t('goal.primary') : t('goal.secondary')} · {t(`goal.status.${g.status}`)}</span>
          </span>
          {isParent && g.status === 'active' && <Button variant="ghost" onClick={() => me && abandonGoal(me.id, g.id)}>{t('goal.abandon')}</Button>}
        </Card>
      ))}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t('reward.edit') : t('reward.new')}>
        {editing && (
          <>
            <div className="flex gap-2 mb-3">
              <input className="input w-16 text-center" value={editing.emoji ?? ''} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} aria-label="emoji" />
              <input className="input" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder={t('reward.titlePlaceholder')} />
            </div>
            <Field label={t('reward.section')}>
              <select className="input" value={editing.section} onChange={(e) => setEditing({ ...editing, section: e.target.value as RewardSection })}>
                {(['quick', 'save_for', 'family', 'extra_job_money'] as RewardSection[]).map((s) => (
                  <option key={s} value={s}>{t(`store.section.${s}`)}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('reward.cost')}>
                <input className="input" type="number" min={1} value={editing.cost ?? 5} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) })} />
              </Field>
              <Field label={t('reward.budgetLabel')}>
                <input className="input" type="number" min={0} value={editing.weeklyBudget ?? 0} onChange={(e) => setEditing({ ...editing, weeklyBudget: Number(e.target.value) || undefined })} />
              </Field>
            </div>
            <Field label={t('reward.availability')}>
              <Segmented value={editing.availability ?? 'always'} onChange={(availability) => setEditing({ ...editing, availability })} options={[{ value: 'always', label: t('availability.always') }, { value: 'weekend', label: t('availability.weekend') }, { value: 'scheduled', label: t('availability.scheduled') }]} />
            </Field>
            <Field label={t('reward.forWhom')}>
              <div className="flex flex-wrap gap-2">
                {kids.map((k) => {
                  const on = !editing.childIds?.length || editing.childIds.includes(k.id);
                  return (
                    <button key={k.id} type="button" className={`btn ${on ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { const cur = editing.childIds?.length ? editing.childIds : kids.map((x) => x.id); setEditing({ ...editing, childIds: on ? cur.filter((x) => x !== k.id) : [...cur, k.id] }); }}>
                      {k.child?.avatar.emoji} {k.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={save}>{t('common.save')}</Button>
              {editing.id && <Button variant="secondary" onClick={async () => { if (me && editing.id) { await updateReward(me.id, editing.id, { status: editing.status === 'archived' ? 'active' : 'archived' }); setEditing(null); } }}>{editing.status === 'archived' ? t('common.restore') : t('common.archive')}</Button>}
            </div>
          </>
        )}
      </Modal>
      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={t('goal.new')}>
        <Field label={t('common.child')}>
          <select className="input" value={goal.childId} onChange={(e) => setGoal({ ...goal, childId: e.target.value })}>
            {kids.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2 mb-3">
          <input className="input w-16 text-center" value={goal.emoji} onChange={(e) => setGoal({ ...goal, emoji: e.target.value })} aria-label="emoji" />
          <input className="input" value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} placeholder={t('onboarding.goalPlaceholder')} />
        </div>
        <Field label={t('goal.target')}>
          <input className="input" type="number" min={5} value={goal.target} onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) })} />
        </Field>
        <Button className="w-full" disabled={!goal.title.trim() || !goal.childId} onClick={async () => { if (me && family) { await createGoal(me.id, { familyId: family.id, childId: goal.childId, title: goal.title, emoji: goal.emoji, targetPoints: goal.target, primary: !goals.some((g) => g.childId === goal.childId && g.status === 'active' && g.primary), status: 'active' }); setGoalOpen(false); } }}>
          {t('common.save')}
        </Button>
      </Modal>
    </div>
  );
}
