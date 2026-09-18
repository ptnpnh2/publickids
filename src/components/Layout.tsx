import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useFamily, useMe } from '@/hooks/useData';
import { useSession } from '@/services/session';
import { setLocale } from '@/i18n';
import { runReminderSweep } from '@/services/reminders';
import { Toast } from './ui';

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

/** Bounded, routine-linked reminders while the child's app is open (§2.7-7). */
function useReminders() {
  const me = useMe();
  const { t } = useTranslation();
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!me?.child) return;
    const notify = (title: string, body: string) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(title, { body });
      else setToast(`${title} — ${body}`);
    };
    const tick = () => void runReminderSweep(me, notify, t);
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [me, t]);
  return { toast, clear: () => setToast(null) };
}

export function Shell({ items }: { items: { to: string; label: string; emoji: string }[] }) {
  useApplyProfile();
  const { t } = useTranslation();
  const family = useFamily();
  const me = useMe();
  const setSession = useSession((s) => s.setSession);
  const reminders = useReminders();
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return (
    <div className="max-w-2xl mx-auto min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-4 pt-3 pb-2 no-print">
        <div className="row">
          <span className="text-3xl" aria-hidden>
            {me?.child?.avatar.emoji ?? me?.emoji ?? '🏆'}
          </span>
          <div>
            <div className="font-extrabold leading-tight display">{me?.name}</div>
            <div className="muted text-xs">{family?.name}</div>
          </div>
        </div>
        <div className="row gap-2">
          {!online && <span className="chip chip-warn">{t('common.offline')}</span>}
          <button className="btn btn-ghost text-sm" onClick={() => setSession(null)} aria-label={t('common.switchUser')}>
            {t('common.switchUser')}
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 pb-28">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 no-print" style={{ background: 'color-mix(in srgb, var(--card) 92%, transparent)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-2xl mx-auto flex">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-ico" aria-hidden>
                {it.emoji}
              </span>
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Toast message={reminders.toast} onDone={reminders.clear} />
    </div>
  );
}
