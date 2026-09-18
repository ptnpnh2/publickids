import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, ErrorText, Field, Segmented } from '@/components/ui';
import { useFamily, useMe } from '@/hooks/useData';
import { addChild } from '@/services/family';
import { createTask } from '@/services/tasks';
import { createGoal, createReward } from '@/services/rewards';
import { startStarter } from '@/services/starter';
import { getOrCreateAgreement } from '@/services/agreement';
import { AVATAR_CHOICES, REWARD_TEMPLATES, taskFromTemplate, templatesFor } from '@/services/templates';
import { updateChildProfile } from '@/services/family';
import { uid, nowISO } from '@/db/schema';
import type { AgeBand, CelebrationStyle, ThemeName } from '@/domain/types';

/** Ten-minute onboarding: one child, 3 tasks, 2 rewards, 1 goal, a theme and a celebration style. */
export default function Onboarding() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const family = useFamily();
  const me = useMe();
  const [step, setStep] = useState(0);
  const [child, setChild] = useState({ name: '', emoji: AVATAR_CHOICES[0], band: '7-9' as AgeBand, pin: '' });
  const [taskKeys, setTaskKeys] = useState<string[]>([]);
  const [rewardKeys, setRewardKeys] = useState<string[]>(['pickDinner', 'extraStory']);
  const [goal, setGoal] = useState({ title: '', emoji: '🧱', target: 40 });
  const [theme, setTheme] = useState<ThemeName>('sunny');
  const [celebration, setCelebration] = useState<CelebrationStyle>('fun');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const templates = templatesFor(child.band);

  function toggle(list: string[], key: string, max: number, set: (v: string[]) => void) {
    if (list.includes(key)) set(list.filter((k) => k !== key));
    else if (list.length < max) set([...list, key]);
  }

  async function finish() {
    if (!family || !me) return;
    setBusy(true);
    setError(null);
    try {
      const kid = await addChild({ familyId: family.id, name: child.name, emoji: child.emoji, band: child.band, pin: child.pin, locale: family.locale, theme, actorId: me.id });
      await updateChildProfile(me.id, kid.id, { celebration, theme });
      for (const key of taskKeys) {
        const tpl = templates.find((x) => x.key === key)!;
        const task = taskFromTemplate(tpl, t, { id: uid(), familyId: family.id, createdBy: me.id, createdAt: nowISO(), assignedChildIds: [kid.id] });
        const { id: _id, createdAt: _c, createdBy: _b, ...rest } = task;
        void _id; void _c; void _b;
        await createTask(me.id, rest);
      }
      for (const key of rewardKeys) {
        const r = REWARD_TEMPLATES.find((x) => x.key === key)!;
        await createReward(me.id, { familyId: family.id, title: t(`rewardTemplates.${r.key}`), emoji: r.emoji, section: r.section, cost: r.cost, availability: 'always', status: 'active' });
      }
      if (goal.title) await createGoal(me.id, { familyId: family.id, childId: kid.id, title: goal.title, emoji: goal.emoji, targetPoints: goal.target, primary: true, status: 'active' });
      await getOrCreateAgreement(family.id, t('agreement.defaultIntro'), [t('agreement.defaultRule1'), t('agreement.defaultRule2'), t('agreement.defaultRule3')]);
      await startStarter(me.id, family.id);
      nav('/parent/starter');
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    <Card key="child">
      <h2 className="font-bold text-lg mb-2">{t('onboarding.childTitle')}</h2>
      <Field label={t('onboarding.childName')}>
        <input className="input" value={child.name} onChange={(e) => setChild({ ...child, name: e.target.value })} />
      </Field>
      <Field label={t('onboarding.avatar')}>
        <div className="flex flex-wrap gap-2">
          {AVATAR_CHOICES.map((a) => (
            <button key={a} type="button" className={`text-3xl rounded-xl p-1 ${child.emoji === a ? 'ring-2' : ''}`} style={{ minWidth: 'var(--target)' }} onClick={() => setChild({ ...child, emoji: a })}>
              {a}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('onboarding.ageBand')} hint={t('onboarding.ageHint')}>
        <Segmented value={child.band} onChange={(band) => { setChild({ ...child, band }); setTaskKeys([]); }} options={(['4-6', '7-9', '10-12', 'teen'] as AgeBand[]).map((b) => ({ value: b, label: t(`ageBand.${b}`) }))} />
      </Field>
      <Field label={t('onboarding.pin')} hint={t('onboarding.pinHint')}>
        <input className="input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={child.pin} onChange={(e) => setChild({ ...child, pin: e.target.value.replace(/\D/g, '') })} />
      </Field>
    </Card>,
    <Card key="tasks">
      <h2 className="font-bold text-lg">{t('onboarding.tasksTitle')}</h2>
      <p className="muted text-sm mb-3">{t('onboarding.tasksHint')}</p>
      <div className="grid gap-2">
        {templates.map((tpl) => (
          <button key={tpl.key} type="button" className={`card text-left flex items-center gap-3 ${taskKeys.includes(tpl.key) ? 'ring-2' : ''}`} onClick={() => toggle(taskKeys, tpl.key, 3, setTaskKeys)}>
            <span className="text-2xl">{tpl.emoji}</span>
            <span className="flex-1">
              <span className="font-semibold block">{t(`templates.${tpl.key}.title`)}</span>
              <span className="muted text-xs">{t(`category.${tpl.category}`)} · {tpl.basePoints} {t('common.pts')} · {tpl.minutes} {t('common.min')}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>,
    <Card key="rewards">
      <h2 className="font-bold text-lg">{t('onboarding.rewardsTitle')}</h2>
      <p className="muted text-sm mb-3">{t('onboarding.rewardsHint')}</p>
      <div className="grid gap-2">
        {REWARD_TEMPLATES.map((r) => (
          <button key={r.key} type="button" className={`card text-left flex items-center gap-3 ${rewardKeys.includes(r.key) ? 'ring-2' : ''}`} onClick={() => toggle(rewardKeys, r.key, 2, setRewardKeys)}>
            <span className="text-2xl">{r.emoji}</span>
            <span className="flex-1 font-semibold">{t(`rewardTemplates.${r.key}`)}</span>
            <span className="chip">{r.cost} {t('common.pts')}</span>
          </button>
        ))}
      </div>
      <h3 className="font-bold mt-4">{t('onboarding.goalTitle')}</h3>
      <p className="muted text-sm mb-2">{t('onboarding.goalHint')}</p>
      <div className="flex gap-2">
        <input className="input w-16 text-center" value={goal.emoji} onChange={(e) => setGoal({ ...goal, emoji: e.target.value })} aria-label="emoji" />
        <input className="input" placeholder={t('onboarding.goalPlaceholder')} value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} />
        <input className="input w-24" type="number" min={10} value={goal.target} onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) })} aria-label={t('common.pts')} />
      </div>
    </Card>,
    <Card key="style">
      <h2 className="font-bold text-lg mb-2">{t('onboarding.styleTitle')}</h2>
      <Field label={t('onboarding.theme')}>
        <Segmented value={theme} onChange={setTheme} options={[{ value: 'sunny', label: t('theme.sunny') }, { value: 'space', label: t('theme.space') }]} />
      </Field>
      <Field label={t('onboarding.celebration')} hint={t('onboarding.celebrationHint')}>
        <Segmented value={celebration} onChange={setCelebration} options={[{ value: 'quiet', label: t('celebration.quiet') }, { value: 'fun', label: t('celebration.fun') }, { value: 'big', label: t('celebration.big') }]} />
      </Field>
      <p className="muted text-sm">{t('onboarding.starterNote')}</p>
    </Card>,
  ];

  const canNext = [child.name.trim().length > 0 && child.pin.length === 4, taskKeys.length >= 1, true, true][step];

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        {steps.map((_, i) => (
          <span key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? 'var(--primary)' : 'var(--border)' }} />
        ))}
      </div>
      {steps[step]}
      <ErrorText error={error} />
      <div className="flex gap-2 mt-4">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            {t('common.back')}
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {t('common.continue')}
          </Button>
        ) : (
          <Button className="flex-1" disabled={busy} onClick={finish}>
            {t('onboarding.finish')}
          </Button>
        )}
      </div>
    </div>
  );
}
