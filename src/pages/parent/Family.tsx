import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMe, useMembers } from '@/hooks/useData';
import { Card } from '@/components/ui';

export default function Family() {
  const { t } = useTranslation();
  const me = useMe();
  const members = useMembers().filter((m) => !m.email?.startsWith('superuser@'));
  const isParent = me?.role === 'parent' || me?.role === 'coparent';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('nav.family')}</h1>
        {isParent && (
          <Link to="/parent/family/new" className="btn btn-primary">
            ＋ {t('family.add')}
          </Link>
        )}
      </div>
      {members.map((m) => (
        <Card key={m.id} className="flex items-center gap-3">
          <span className="text-2xl">{m.child?.avatar.emoji ?? m.emoji}</span>
          <span className="flex-1">
            <span className="font-bold block">{m.name}</span>
            <span className="muted text-xs">
              {t(`role.${m.role}`)}
              {m.isSupervisor ? ` · ${t('role.supervisor')}` : ''}
              {m.child ? ` · ${t(`ageBand.${m.child.ageBand}`)}` : ''}
            </span>
          </span>
          {m.role === 'child' && (
            <Link to={`/parent/family/${m.id}/progress`} className="btn btn-secondary text-sm">
              📈
            </Link>
          )}
          {isParent && (
            <Link to={`/parent/family/${m.id}`} className="btn btn-ghost text-sm">
              {t('common.edit')}
            </Link>
          )}
        </Card>
      ))}
      <p className="muted text-xs">{t('family.rolesNote')}</p>
    </div>
  );
}
