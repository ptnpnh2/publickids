import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, ErrorText, Field } from '@/components/ui';
import { createFamily } from '@/services/family';
import { sessionFor } from '@/services/auth';
import { useSession } from '@/services/session';
import i18n from '@/i18n';
import type { Locale } from '@/domain/types';

export default function CreateFamily() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setSession = useSession((s) => s.setSession);
  const [form, setForm] = useState({ familyName: '', parentName: '', email: '', password: '', superUserPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) return setError('auth.passwordShort');
    if (form.superUserPassword.length < 8 || form.superUserPassword === form.password) return setError('auth.superUserDifferent');
    setBusy(true);
    try {
      const { parent, recoveryCodes } = await createFamily({ ...form, locale: (i18n.language as Locale) ?? 'en' });
      setSession(sessionFor(parent));
      setCodes(recoveryCodes);
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (codes) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Card>
          <h1 className="text-xl font-bold">{t('auth.recoveryTitle')}</h1>
          <p className="muted text-sm mt-1">{t('auth.recoveryHint')}</p>
          <ul className="grid grid-cols-2 gap-2 my-4 font-mono text-sm">
            {codes.map((c) => (
              <li key={c} className="chip justify-center">
                {c}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              🖨️ {t('common.print')}
            </Button>
            <Button onClick={() => nav('/onboarding')}>{t('auth.savedCodes')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('welcome.createFamily')}</h1>
      <form onSubmit={submit}>
        <Field label={t('auth.familyName')}>
          <input className="input" required value={form.familyName} onChange={set('familyName')} />
        </Field>
        <Field label={t('auth.yourName')}>
          <input className="input" required value={form.parentName} onChange={set('parentName')} />
        </Field>
        <Field label={t('auth.email')}>
          <input className="input" type="email" required autoComplete="username" value={form.email} onChange={set('email')} />
        </Field>
        <Field label={t('auth.password')} hint={t('auth.passwordHint')}>
          <input className="input" type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label={t('auth.superUserPassword')} hint={t('auth.superUserHint')}>
          <input className="input" type="password" required autoComplete="new-password" value={form.superUserPassword} onChange={set('superUserPassword')} />
        </Field>
        <p className="muted text-xs mb-3">{t('auth.consentNote')}</p>
        <ErrorText error={error} />
        <Button type="submit" disabled={busy} className="w-full mt-2">
          {t('common.continue')}
        </Button>
      </form>
    </div>
  );
}
