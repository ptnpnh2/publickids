import { useTranslation } from 'react-i18next';
import { useAudit, useMembers } from '@/hooks/useData';
import { Card } from '@/components/ui';

export default function AuditLog() {
  const { t } = useTranslation();
  const entries = useAudit(300);
  const members = useMembers();
  const who = (id: string) => (id === 'ai' ? '🤖 AI' : id === 'system' ? '⚙️' : members.find((m) => m.id === id)?.name ?? id.slice(0, 6));
  return (
    <div className="space-y-2">
      <h1 className="page-title">{t('audit.title')}</h1>
      <p className="muted text-sm">{t('audit.explain')}</p>
      {entries.map((e) => (
        <Card key={e.id} className="text-sm py-2">
          <div className="flex justify-between gap-2">
            <span className="font-semibold">{who(e.actorId)} · {t(`auditAction.${e.action}`, { defaultValue: e.action })}</span>
            <span className="muted text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</span>
          </div>
          {e.after !== undefined && <pre className="muted text-xs whitespace-pre-wrap break-all mt-1">{JSON.stringify(e.after)}</pre>}
          {e.childExplanation && <p className="text-xs mt-1">🧒 {t(e.childExplanation, { defaultValue: e.childExplanation })}</p>}
        </Card>
      ))}
    </div>
  );
}
