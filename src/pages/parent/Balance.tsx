import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useAudit, useFamily, useLedger, useSubmissions, useTasks } from '@/hooks/useData';
import { Card, PageTitle } from '@/components/ui';
import { balanceReview } from '@/domain/balance';

/** Advanced System Balance Review (V2): 8-week observable patterns, never character judgments. */
export default function Balance() {
  const { t } = useTranslation();
  const family = useFamily();
  const tasks = useTasks();
  const subs = useSubmissions();
  const ledger = useLedger();
  const audit = useAudit(2000);
  const momentum = useLiveQuery(() => (family ? db.momentum.where('familyId').equals(family.id).toArray() : []), [family?.id]) ?? [];
  const since = useMemo(() => new Date(Date.now() - 56 * 86_400_000).toISOString(), []);
  const metrics = useMemo(
    () =>
      family
        ? balanceReview({
            tasks,
            submissions: subs.filter((s) => s.submittedAt >= since),
            ledger: ledger.filter((e) => e.createdAt >= since),
            audit: audit.filter((a) => a.createdAt >= since),
            momentum,
            levelKeys: family.momentum.levels.map((l) => l.key),
          })
        : [],
    [family, tasks, subs, ledger, audit, momentum, since],
  );
  const color = { ok: 'var(--ok)', watch: 'var(--warn)', act: '#d64545' } as const;
  return (
    <div className="space-y-4">
      <PageTitle>⚖️ {t('balance.title')}</PageTitle>
      <p className="muted text-sm">{t('balance.explain8w')}</p>
      <div className="grid gap-2">
        {metrics.map((m) => (
          <Card key={m.key} flat className="flex items-center gap-3">
            <span className="badge-dot" style={{ background: color[m.status] }} aria-label={t(`balance.status.${m.status}`)} />
            <span className="flex-1">
              <span className="font-extrabold block">{t(`balance.metric.${m.key}`)}</span>
              <span className="muted text-xs">{t(`balance.hint.${m.key}`, m.params)}</span>
            </span>
            <span className="display text-xl font-extrabold">
              {m.value}
              {m.unit === 'pct' ? '%' : ''}
            </span>
          </Card>
        ))}
      </div>
      <p className="muted text-xs">{t('balance.disclaimer')}</p>
    </div>
  );
}
