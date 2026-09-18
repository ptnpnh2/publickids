import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChildren, useTasks } from '@/hooks/useData';
import { Card, Empty } from '@/components/ui';

export default function Tasks() {
  const { t } = useTranslation();
  const tasks = useTasks().filter((x) => !x.proposedBy);
  const kids = useChildren();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('nav.tasks')}</h1>
        <Link to="/parent/tasks/new" className="btn btn-primary">
          ＋ {t('task.new')}
        </Link>
      </div>
      <p className="muted text-sm">{t('task.capHint')}</p>
      {tasks.length === 0 && <Empty text={t('task.empty')} />}
      {tasks.map((x) => (
        <Link key={x.id} to={`/parent/tasks/${x.id}`}>
          <Card className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{x.emoji}</span>
            <span className="flex-1 min-w-0">
              <span className="font-bold block truncate">{x.title}</span>
              <span className="muted text-xs">
                {t(`category.${x.category}`)} · {x.window.start}–{x.window.end} · {t(`proof.${x.proofMethod}`)} · {x.assignedChildIds.map((id) => kids.find((k) => k.id === id)?.name).filter(Boolean).join(', ')}
              </span>
            </span>
            <span className="chip">{x.currency === 'points' ? `⭐ ${x.basePoints}` : '👏'}</span>
            {!x.active && <span className="chip">{t('common.paused')}</span>}
          </Card>
        </Link>
      ))}
    </div>
  );
}
