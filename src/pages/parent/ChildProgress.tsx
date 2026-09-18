import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useFamily, useLedger, useMomentum, useStages, useSubmissions, useTasks } from '@/hooks/useData';
import { Card } from '@/components/ui';
import { levelsFor, windowStats } from '@/domain/momentum';
import { excludedDaysFor } from '@/services/momentum';
import { suggestGraduation } from '@/domain/stages';
import { isScheduledOn } from '@/domain/time';

/** Private per-child progress for parents; also the printable routine (?print=1). */
export default function ChildProgress() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [params] = useSearchParams();
  const family = useFamily();
  const kid = useLiveQuery(() => (id ? db.members.get(id) : undefined), [id]);
  const tasks = useTasks().filter((x) => id && x.assignedChildIds.includes(id) && x.active);
  const stages = useStages(id);
  const subs = useSubmissions(id);
  const ledger = useLedger(id);
  const momentum = useMomentum(id);
  useEffect(() => {
    if (params.get('print') && kid) setTimeout(() => window.print(), 400);
  }, [params, kid]);
  if (!kid?.child || !family) return null;
  const ex = excludedDaysFor(kid);
  const fresh = kid.child.freshStartAt?.slice(0, 10);
  const w28 = windowStats(kid.id, tasks, stages, subs, 28, { excludedDays: ex, freshStartKey: fresh });
  const level = levelsFor(family.momentum, kid.id).find((l) => l.key === momentum?.levelKey);
  const earned = ledger.filter((e) => e.kind === 'earn').reduce((s, e) => s + e.amount, 0);
  const bonus = ledger.filter((e) => e.kind === 'bonus').reduce((s, e) => s + e.amount, 0);
  const balance = ledger.reduce((s, e) => s + e.amount, 0);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <h1 className="page-title">{kid.child.avatar.emoji} {kid.name}</h1>
      <Card>
        <h2 className="font-bold">{t('progress.routine')}</h2>
        <ul className="mt-2">
          {tasks.filter((x) => isScheduledOn(x.schedule, todayKey) || params.get('print')).sort((a, b) => a.window.start.localeCompare(b.window.start)).map((x) => (
            <li key={x.id} className="flex gap-2 py-1 border-t text-sm" style={{ borderColor: 'var(--border)' }}>
              <span>☐</span><span className="w-24">{x.window.start}–{x.window.end}</span><span>{x.emoji} {x.title}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="no-print">
        <h2 className="font-bold">{t('me.progress')}</h2>
        <p className="text-sm">{t('me.window28', { pct: w28.pct })} · {t('me.independent', { n: w28.independentStarts })} · {t('progress.reminders', { n: w28.reminders })}</p>
        <p className="text-sm">{t('momentum.title')}: {level?.name} (×{level?.coefficient.toFixed(2)})</p>
        <p className="text-sm">⭐ {t('progress.earned')}: {earned} · {t('progress.bonus')}: {bonus} · {t('progress.balance')}: {balance}</p>
        <p className="muted text-xs mt-1">{t('progress.baseVsBonus', { pct: earned ? Math.round((bonus / earned) * 100) : 0 })}</p>
      </Card>
      <Card className="no-print">
        <h2 className="font-bold mb-1">{t('progress.graduation')}</h2>
        {tasks.map((x) => {
          const st = stages.find((s) => s.taskId === x.id)?.stage ?? 'learning';
          const mine = subs.filter((s) => s.taskId === x.id && s.status === 'approved');
          const remPer = mine.length ? mine.reduce((s, m) => s + m.reminderCount, 0) / mine.length : 0;
          const indPct = mine.length ? Math.round((mine.filter((m) => m.independentStart).length / mine.length) * 100) : 0;
          const tw = windowStats(kid.id, [x], stages, subs, 28, { excludedDays: ex, freshStartKey: fresh });
          const suggest = suggestGraduation({ pct28: tw.pct, remindersPerCompletion: remPer, independentStartPct: indPct, stage: st });
          return (
            <p key={x.id} className="text-sm py-1 border-t" style={{ borderColor: 'var(--border)' }}>
              {x.emoji} {x.title} · {t(`stage.${st}`)} · {tw.pct}% {suggest && <span className="chip">🎓 {t('progress.suggestGraduate')}</span>}
            </p>
          );
        })}
      </Card>
    </div>
  );
}
