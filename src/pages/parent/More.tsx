import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFamily, useMe } from '@/hooks/useData';
import { Card } from '@/components/ui';
import { starterDay } from '@/services/starter';

export default function More() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const day = family ? starterDay(family) : null;
  const items = [
    { to: '/parent/digest', emoji: '📬', label: t('digest.title') },
    { to: '/parent/repair', emoji: '🔧', label: t('repair.title') },
    { to: '/parent/coop', emoji: '🤝', label: t('coop.title') },
    { to: '/parent/agreement', emoji: '🤝', label: t('agreement.title') },
    { to: '/parent/momentum', emoji: '📈', label: t('momentum.title'), supervisor: true },
    { to: '/parent/settings', emoji: '⚙️', label: t('settings.title') },
    { to: '/parent/audit', emoji: '🧾', label: t('audit.title') },
    { to: '/parent/guide', emoji: '📖', label: t('guide.title') },
    { to: '/parent/starter', emoji: '🚀', label: day ? t('starter.dayOf', { day }) : t('starter.title') },
  ];
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-extrabold mb-2">{t('nav.more')}</h1>
      {items.map((i) => (
        <Link key={i.to} to={i.to}>
          <Card className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{i.emoji}</span>
            <span className="flex-1 font-semibold">{i.label}</span>
            {i.supervisor && !me?.isSupervisor && <span className="chip">{t('role.supervisor')}</span>}
            <span className="muted">›</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
