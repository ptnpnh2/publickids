import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useFamily, useMe } from '@/hooks/useData';
import { useSession } from '@/services/session';
import { setLocale } from '@/i18n';

export function useApplyProfile() {
  const me = useMe();
  useEffect(() => {
    const root = document.documentElement;
    const c = me?.child;
    root.dataset.theme = c?.theme ?? 'sunny';
    root.dataset.contrast = c?.highContrast ? 'high' : 'normal';
    root.dataset.targets = c?.largeTargets ? 'large' : 'normal';
    root.dataset.motion = c?.reducedMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'reduced' : 'normal';
    if (me?.locale) setLocale(me.locale);
  }, [me]);
}

export function Shell({ items }: { items: { to: string; label: string; emoji: string }[] }) {
  useApplyProfile();
  const { t } = useTranslation();
  const family = useFamily();
  const me = useMe();
  const setSession = useSession((s) => s.setSession);
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return (
    <div className="max-w-2xl mx-auto min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 no-print">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {me?.child?.avatar.emoji ?? me?.emoji ?? '🏆'}
          </span>
          <div>
            <div className="font-bold leading-tight">{me?.name}</div>
            <div className="muted text-xs">{family?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!online && <span className="chip">{t('common.offline')}</span>}
          <button className="btn btn-ghost text-sm" onClick={() => setSession(null)} aria-label={t('common.switchUser')}>
            {t('common.switchUser')}
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 border-t no-print" style={{ background: 'var(--card)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-2xl mx-auto flex">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `flex-1 flex flex-col items-center py-2 text-xs font-semibold ${isActive ? '' : 'muted'}`} style={({ isActive }) => ({ minHeight: 'var(--target)', color: isActive ? 'var(--primary)' : undefined })}>
              <span className="text-xl" aria-hidden>
                {it.emoji}
              </span>
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
