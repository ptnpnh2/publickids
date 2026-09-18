import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBalance, useFamily, useMe, useMomentum, useStages, useSubmissions, useTasks, useKudos } from '@/hooks/useData';
import { dateKey, isScheduledOn, windowState } from '@/domain/time';
import { Empty } from '@/components/ui';
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
      const ws = windowState(task.window);
      if (ws === 'before') later.push(task);
      else now.push(task);
    }
    // Choice-based assignment: once one task of a group is done, the siblings drop out of Now.
    const filteredNow = now.filter((x) => !x.choiceGroup || !seenChoice.has(x.choiceGroup));
    const order = (a: Task, b: Task) => a.window.end.localeCompare(b.window.end);
    return { now: filteredNow.sort(order).slice(0, 5), later: later.sort(order), done, help };
  }, [tasks, subs, me, today]);

  const levels = family && me ? levelsFor(family.momentum, me.id) : [];
  const li = momentum ? levelIndex(levels, momentum.levelKey) : 0;
  const skin = MOMENTUM_SKINS[me?.child?.momentumSkin ?? 'neutral'];
  const levelName = me?.child?.momentumSkin && me.child.momentumSkin !== 'neutral' ? skin[li] : levels[li]?.name;
  const stageOf = (taskId: string) => stages.find((s) => s.taskId === taskId)?.stage ?? 'learning';

  if (me?.child?.graduatedFromApp) {
    return <Empty emoji="🎓" text={t('today.graduated')} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('today.title', { name: me?.name })}</h1>
        <div className="chip text-base">⭐ {balance}</div>
      </div>
      {levelName && (
        <p className="muted text-sm">
          {t('today.momentum', { level: levelName })} · <Link to="/kid/me" className="underline">{t('today.whatIsThis')}</Link>
        </p>
      )}
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
            <div key={sub.id} className="card flex items-center gap-3">
              <span className="text-2xl">{task.emoji}</span>
              <span className="flex-1">
                <span className="font-semibold block">{task.title}</span>
                <span className="muted text-xs">{t(`help.${sub.help}`)} · {t('today.waitingParent')}</span>
              </span>
            </div>
          ))}
        </Section>
      )}
      {done.length > 0 && (
        <Section title={t('today.done')} emoji="✅">
          {done.map(({ task, sub }) => (
            <Link key={sub.id} to={`/kid/task/${task.id}`} className="card flex items-center gap-3">
              <span className="text-2xl">{task.emoji}</span>
              <span className="flex-1">
                <span className="font-semibold block">{task.title}</span>
                <span className="muted text-xs">{t(`status.${sub.status}`)}{sub.feedback ? ` · 💬 ${sub.feedback}` : ''}</span>
              </span>
              {sub.status === 'approved' && task.currency === 'points' && sub.ledgerEntryId && <span className="chip">+{task.basePoints}</span>}
              {sub.status === 'approved' && !sub.ledgerEntryId && <span className="chip">👏</span>}
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-bold muted text-sm uppercase tracking-wide mb-2">
        {emoji} {title}
      </h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function TaskCard({ task, stage, state, retry }: { task: Task; stage: string; state: 'before' | 'open' | 'closed'; retry?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to={`/kid/task/${task.id}`} className="card flex items-center gap-3 pop" style={{ minHeight: 72 }}>
      <span className="text-3xl" aria-hidden>
        {task.emoji}
      </span>
      <span className="flex-1 min-w-0">
        <span className="font-bold block truncate">{task.title}</span>
        <span className="muted text-xs">
          {task.window.start}–{task.window.end} · {task.estimatedMinutes} {t('common.min')}
          {retry ? ` · ${t('status.retry')}` : ''}
          {state === 'closed' ? ` · ${t('today.windowClosed')}` : ''}
        </span>
      </span>
      {task.currency === 'points' && stage !== 'graduated' ? <span className="chip">⭐ {task.basePoints}</span> : <span className="chip">👏</span>}
    </Link>
  );
}
