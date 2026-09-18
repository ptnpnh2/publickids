import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, ErrorText, Field } from '@/components/ui';
import { loginAdult } from '@/services/auth';
import { useSession } from '@/services/session';

export default function ParentLogin() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setSession = useSession((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = await loginAdult(email, password);
    if (!s) return setError('auth.invalid');
    setSession(s);
    nav('/parent/approvals');
  }
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{t('welcome.parentLogin')}</h1>
      <form onSubmit={submit}>
        <Field label={t('auth.email')}>
          <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('auth.password')}>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorText error={error} />
        <Button type="submit" className="w-full mt-2">
          {t('common.login')}
        </Button>
      </form>
      <Link to="/welcome" className="btn btn-ghost w-full mt-2">
        {t('common.back')}
      </Link>
    </div>
  );
}
