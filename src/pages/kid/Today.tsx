import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBalance, useFamily, useGoals, useMe, useMomentum, useStages, useSubmissions, useTasks, useKudos } from '@/hooks/useData';
import { dateKey, isScheduledOn, windowState } from '@/domain/time';
import { Empty, Ring, Section } from '@/components/ui';
import { levelsFor, MOMENTUM_SKINS, levelIndex } from '@/domain/momentum';
import type { Submission, Task } from '@/domain/types';

/** One Today screen: Now / Later / Done with only 3–5 primary cards. */
export default function Today() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const tasks = useTasks();
  const stages = useStages(me?.id);
  const subs = useSubmissions(me?.id);
  const balance = useBalance(me?.id);
  const momentum = useMomentum(me?.id);
  const kudos = useKudos(me?.id);
  const goals = useGoals(me?.id);
  const goal = goals.find((g) => g.status === 'active' && g.primary) ?? goals.find((g) => g.status === 'active');
  const today = dateKey();
  const dow = new Date().getDay();
  const appFree = me?.child?.appFreeDays.includes(dow);

  const { now, later, done, help } = useMemo(() => {
    const mine = tasks.filter((x) => me && x.active && x.assignedChildIds.includes(me.id) && !x.proposedBy && isScheduledOn(x.schedule, today));
    const todaySub = (task: Task): Submission | undefined => subs.find((s) => s.taskId === task.id && s.dateKey === today && s.status !== 'withdrawn');
    const now: Task[] = [];
    const later: Task[] = [];
    const done: { task: Task; sub: Submission }[] = [];
    const help: { task: Task; sub: Submission }[] = [];
    const seenChoice = new Set<string>();
    for (const task of mine) {
      const sub = todaySub(task);
      if (sub && sub.status !== 'retry') {
        if (sub.status === 'help') help.push({ task, sub });
        else done.push({ task, sub });
        if (task.choiceGroup) seenChoice.add(task.choiceGroup);
        continue;
      }
      if (windowState(task.window) === 'before') later.push(task);
      else now.push(task);
    }
    const filteredNow = now.filter((x) => !x.choiceGroup || !seenChoice.has(x.choiceGroup));
    const order = (a: Task, b: Task) => a.window.end.localeCompare(b.window.end);
    return { now: filteredNow.sort(order).slice(0, 5), later: later.sort(order), done, help };
  }, [tasks, subs, me, today]);

  const levels = family && me ? levelsFor(family.momentum, me.id) : [];
  const li = momentum ? levelIndex(levels, momentum.levelKey) : 0;
  const skin = MOMENTUM_SKINS[me?.child?.momentumSkin ?? 'neutral'];
  const levelName = me?.child?.momentumSkin && me.child.momentumSkin !== 'neutral' ? skin[li] : levels[li]?.name;
  const stageOf = (taskId: string) => stages.find((s) => s.taskId === taskId)?.stage ?? 'learning';
  const doneCount = done.length;
  const total = doneCount + now.length + later.length + help.length;

  if (me?.child?.graduatedFromApp) return <Empty emoji="🎓" text={t('today.graduated')} />;

  return (
    <div className="space-y-5">
      <div className="hero">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="display text-2xl font-extrabold leading-tight">{t('today.title', { name: me?.name })}</h1>
            <p className="muted text-sm mt-0.5">{total ? t('today.progressLine', { done: doneCount, total }) : t('today.freeDay')}</p>
            {levelName && (
              <Link to="/kid/me" className="chip mt-2" style={{ background: 'color-mix(in srgb, var(--primary-contrast) 18%, transparent)', color: 'var(--primary-contrast)' }}>
                ⚡ {t('today.momentum', { level: levelName })}
              </Link>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wide muted">{t('common.pts')}</div>
            <div className="display text-3xl font-extrabold">⭐ {balance}</div>
          </div>
        </div>
        {goal && (
          <Link to="/kid/goal" className="mt-3 flex items-center gap-3 rounded-2xl p-2" style={{ background: 'color-mix(in srgb, var(--primary-contrast) 14%, transparent)' }}>
            <Ring value={goal.savedPoints} max={goal.targetPoints} size={52} stroke="currentColor" label={<span>{goal.emoji}</span>} />
            <div className="flex-1 min-w-0">
              <div className="font-extrabold truncate">{goal.title}</div>
              <div className="muted text-xs">
                {goal.savedPoints} / {goal.targetPoints} ⭐
              </div>
            </div>
            <span aria-hidden>›</span>
          </Link>
        )}
      </div>

      {appFree && <div className="card">{t('today.appFree')}</div>}
      {kudos[0] && <div className="card">💌 {kudos[0].text}</div>}

      <Section title={t('today.now')} emoji="🔥">
        {now.length === 0 && <Empty emoji="🌈" text={later.length ? t('today.nothingNow') : t('today.allDone')} />}
        {now.map((task) => (
          <TaskCard key={task.id} task={task} stage={stageOf(task.id)} state={windowState(task.window)} retry={subs.some((s) => s.taskId === task.id && s.dateKey === today && s.status === 'retry')} />
        ))}
      </Section>
      {later.length > 0 && (
        <Section title={t('today.later')} emoji="🕒">
          {later.map((task) => (
            <TaskCard key={task.id} task={task} stage={stageOf(task.id)} state="before" />
          ))}
        </Section>
      )}
      {help.length > 0 && (
        <Section title={t('today.helpSent')} emoji="🙋">
          {help.map(({ task, sub }) => (
            <div key={sub.id} className="card task-card">
              <span className="task-emoji">{task.emoji}</span>
              <span className="flex-1">
                <span className="font-extrabold block">{task.title}</span>
                <span className="muted text-xs">
                  {t(`help.${sub.help}`)} · {t('today.waitingParent')}
                </span>
              </span>
            </div>
          ))}
        </Section>
      )}
      {done.length > 0 && (
        <Section title={t('today.done')} emoji="✅">
          {done.map(({ task, sub }) => (
            <Link key={sub.id} to={`/kid/task/${task.id}`} className="card task-card">
              <span className="task-emoji" style={{ background: sub.status === 'approved' ? 'var(--ok-soft)' : 'var(--primary-soft)' }}>
                {task.emoji}
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-extrabold block truncate">{task.title}</span>
                <span className="muted text-xs">
                  {t(`status.${sub.status}`)}
                  {sub.feedback ? ` · 💬 ${sub.feedback}` : ''}
                </span>
              </span>
              {sub.status === 'approved' && task.currency === 'points' && sub.ledgerEntryId && <span className="chip chip-ok">+{task.basePoints}</span>}
              {sub.status === 'approved' && !sub.ledgerEntryId && <span className="chip chip-ok">👏</span>}
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function TaskCard({ task, stage, state, retry }: { task: Task; stage: string; state: 'before' | 'open' | 'closed'; retry?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to={`/kid/task/${task.id}`} className="card task-card pop" style={{ opacity: state === 'before' ? 0.75 : 1 }}>
      <span className="task-emoji" aria-hidden>
        {task.emoji}
      </span>
      <span className="flex-1 min-w-0">
        <span className="font-extrabold block truncate">{task.title}</span>
        <span className="muted text-xs">
          {task.window.start}–{task.window.end} · {task.estimatedMinutes} {t('common.min')}
          {task.exercise ? ` · ${task.exercise.reps} × ${t(`exercise.${task.exercise.kind}`)}` : ''}
          {retry ? ` · ${t('status.retry')}` : ''}
          {state === 'closed' ? ` · ${t('today.windowClosed')}` : ''}
        </span>
      </span>
      {task.category === 'extra_job' && task.moneyAmount ? <span className="chip chip-accent">💶 {task.moneyAmount}</span> : task.currency === 'points' && stage !== 'graduated' ? <span className="chip">⭐ {task.basePoints}</span> : <span className="chip chip-ok">👏</span>}
    </Link>
  );
}
