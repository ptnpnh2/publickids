import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useChildren, useIncidents, useSubmissions, useTasks } from '@/hooks/useData';
import { Card } from '@/components/ui';
import { buildDigest } from '@/domain/digest';
import { addDays, parseDateKey, weekStart } from '@/domain/time';

/** Weekly three-card digest: What worked / Where friction appeared / One suggested adjustment, plus System Balance Review. */
export default function Digest() {
  const { t } = useTranslation();
  const kids = useChildren();
  const tasks = useTasks();
  const subs = useSubmissions();
  const incidents = useIncidents();
  const now = new Date();
  const ws = weekStart(now);
  const prevWs = weekStart(addDays(parseDateKey(ws), -7));
  const cards = useMemo(
    () =>
      kids.map((k) => {
        const mine = subs.filter((s) => s.childId === k.id);
        const week = mine.filter((s) => s.dateKey >= ws);
        const prev = mine.filter((s) => s.dateKey >= prevWs && s.dateKey < ws);
        const delays = week.filter((s) => s.resolvedAt && s.status === 'approved').map((s) => (new Date(s.resolvedAt!).getTime() - new Date(s.submittedAt).getTime()) / 60_000);
        return { kid: k, digest: buildDigest({ tasks: tasks.filter((x) => x.assignedChildIds.includes(k.id)), submissions: week, prevSubmissions: prev, incidents: incidents.filter((i) => i.childId === k.id && i.createdAt >= ws), approvalDelaysMin: delays }) };
      }),
    [kids, subs, tasks, incidents, ws, prevWs],
  );
  return (
    <div className="space-y-4">
      <h1 className="page-title">{t('digest.title')}</h1>
      <p className="muted text-sm">{t('digest.weekOf', { date: parseDateKey(ws).toLocaleDateString() })}</p>
      {cards.map(({ kid, digest }) => (
        <div key={kid.id} className="space-y-2">
          <h2 className="font-bold text-lg">{kid.child?.avatar.emoji} {kid.name}</h2>
          <Card>
            <h3 className="font-bold">✅ {t('digest.worked.title')}</h3>
            <ul className="text-sm list-disc ml-5">{digest.worked.map((w, i) => <li key={i}>{t(w.key, w.params)}</li>)}</ul>
          </Card>
          <Card>
            <h3 className="font-bold">🌀 {t('digest.friction.title')}</h3>
            <ul className="text-sm list-disc ml-5">{digest.friction.map((w, i) => <li key={i}>{t(w.key, w.params)}</li>)}</ul>
          </Card>
          <Card>
            <h3 className="font-bold">💡 {t('digest.suggest.title')}</h3>
            <p className="text-sm">{t(digest.suggestion.key, digest.suggestion.params)}</p>
          </Card>
          <Card>
            <h3 className="font-bold">⚖️ {t('balance.title')}</h3>
            <ul className="text-sm list-disc ml-5">{digest.balance.map((w, i) => <li key={i}>{t(w.key, w.params)}</li>)}</ul>
            <p className="muted text-xs mt-2">{t('balance.disclaimer')}</p>
          </Card>
        </div>
      ))}
      {kids.length === 0 && <p className="muted">{t('auth.noKids')}</p>}
    </div>
  );
}
