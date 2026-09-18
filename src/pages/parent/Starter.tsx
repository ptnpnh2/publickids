import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useChildren, useFamily, useGoals, useMe, useRewards, useSubmissions, useTasks } from '@/hooks/useData';
import { Button, Card, Progress } from '@/components/ui';
import { STARTER_DAYS, completeStarter, startStarter, starterDay } from '@/services/starter';

/** Seven-day Starter Mode checklist with a guaranteed practice success. */
export default function Starter() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const tasks = useTasks();
  const rewards = useRewards();
  const goals = useGoals();
  const subs = useSubmissions();
  if (!family || !me) return null;
  const day = starterDay(family);
  const checks = [
    { ok: kids.length >= 1, label: t('starter.check.child'), to: '/parent/family' },
    { ok: tasks.filter((x) => x.active).length >= 3, label: t('starter.check.tasks'), to: '/parent/tasks' },
    { ok: rewards.filter((r) => r.status === 'active').length >= 2, label: t('starter.check.rewards'), to: '/parent/rewards' },
    { ok: goals.some((g) => g.status === 'active'), label: t('starter.check.goal'), to: '/parent/rewards' },
    { ok: subs.some((s) => s.status === 'approved'), label: t('starter.check.success'), to: '/parent/approvals' },
  ];
  const done = checks.filter((c) => c.ok).length;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('starter.title')}</h1>
      <p className="muted text-sm">{t('starter.explain')}</p>
      {day ? (
        <Card>
          <h2 className="font-bold">{t('starter.dayOf', { day })}</h2>
          <Progress value={day} max={STARTER_DAYS} className="my-2" />
          <p className="text-sm">{t(`starter.tip.${Math.min(day, 7)}`)}</p>
        </Card>
      ) : family.starter?.completedAt ? (
        <Card>🎉 {t('starter.completed')}</Card>
      ) : (
        <Button onClick={() => startStarter(me.id, family.id)}>{t('starter.begin')}</Button>
      )}
      <Card>
        <h2 className="font-bold mb-2">{t('starter.checklist')} ({done}/{checks.length})</h2>
        {checks.map((c, i) => (
          <Link key={i} to={c.to} className="flex items-center gap-2 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <span>{c.ok ? '✅' : '⬜'}</span>
            <span className="flex-1">{c.label}</span>
            <span className="muted">›</span>
          </Link>
        ))}
        {day && done === checks.length && <Button className="mt-3" onClick={() => completeStarter(me.id, family.id)}>{t('starter.finish')}</Button>}
      </Card>
      <Card>
        <h2 className="font-bold mb-1">{t('starter.installTitle')}</h2>
        <p className="text-sm">{t('starter.installHint')}</p>
      </Card>
    </div>
  );
}
