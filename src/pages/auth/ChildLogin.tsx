import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { loginChild } from '@/services/auth';
import { useSession } from '@/services/session';
import { ErrorText } from '@/components/ui';

/** Shared-device flow: pick a picture, then a 4-digit PIN with big keys. */
export default function ChildLogin() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setSession = useSession((s) => s.setSession);
  const kids = useLiveQuery(() => db.members.filter((m) => m.role === 'child' && !m.archived).toArray(), []) ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function press(d: string) {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4 && picked) {
      const s = await loginChild(picked, next);
      if (!s) {
        setError('auth.wrongPin');
        setPin('');
        return;
      }
      setSession(s);
      nav('/kid/today');
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4 text-center">{picked ? t('auth.enterPin') : t('auth.whoAreYou')}</h1>
      {!picked ? (
        <div className="grid grid-cols-2 gap-3">
          {kids.map((k) => (
            <button key={k.id} className="card text-center pop" style={{ minHeight: 120 }} onClick={() => setPicked(k.id)}>
              <div className="text-5xl">{k.child?.avatar.emoji ?? k.emoji}</div>
              <div className="font-bold mt-2">{k.name}</div>
            </button>
          ))}
          {kids.length === 0 && <p className="muted col-span-2 text-center">{t('auth.noKids')}</p>}
        </div>
      ) : (
        <div>
          <div className="flex justify-center gap-3 my-4" aria-label={t('auth.enterPin')}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--primary)', background: pin.length > i ? 'var(--primary)' : 'transparent' }} />
            ))}
          </div>
          <ErrorText error={error} />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
              <button key={i} className="btn btn-secondary text-2xl" style={{ minHeight: 64 }} disabled={d === ''} onClick={() => (d === '⌫' ? setPin(pin.slice(0, -1)) : press(d))} aria-label={d}>
                {d}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost w-full mt-4" onClick={() => { setPicked(null); setPin(''); }}>
            {t('common.back')}
          </button>
        </div>
      )}
      <Link to="/welcome" className="btn btn-ghost w-full mt-2 text-sm">
        {t('welcome.parentLogin')}
      </Link>
    </div>
  );
}
