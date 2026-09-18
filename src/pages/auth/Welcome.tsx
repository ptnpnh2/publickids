import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { SUPPORTED_LOCALES, setLocale } from '@/i18n';
import i18n from '@/i18n';
import { useState } from 'react';
import { DEMO, seedDemoFamily } from '@/services/demo';
import type { Locale } from '@/domain/types';

export default function Welcome() {
  const { t } = useTranslation();
  const families = useLiveQuery(() => db.families.toArray(), []) ?? [];
  const hasFamily = families.length > 0;
  const [busy, setBusy] = useState(false);
  const demoExists = families.some((f) => f.name === 'Demo family');
  async function demo() {
    setBusy(true);
    await seedDemoFamily((i18n.language as Locale) ?? 'en', t);
    setBusy(false);
  }
  return (
    <div className="max-w-md mx-auto min-h-dvh flex flex-col justify-center px-4 py-8 gap-4">
      <div className="text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="text-2xl font-extrabold mt-2">{t('app.name')}</h1>
        <p className="muted mt-1">{t('app.tagline')}</p>
      </div>
      <div className="flex justify-center gap-2 no-print">
        {SUPPORTED_LOCALES.map((l) => (
          <button key={l} className={`chip ${i18n.language === l ? 'font-bold' : ''}`} onClick={() => setLocale(l)}>
            {t(`locale.${l}`)}
          </button>
        ))}
      </div>
      {hasFamily ? (
        <>
          <Link to="/login/child" className="btn btn-primary text-lg">
            🧒 {t('welcome.kidLogin')}
          </Link>
          <Link to="/login/parent" className="btn btn-secondary">
            🧑 {t('welcome.parentLogin')}
          </Link>
          <Link to="/create" className="btn btn-ghost text-sm">
            {t('welcome.createAnother')}
          </Link>
          {demoExists && <DemoCard />}
        </>
      ) : (
        <>
          <Link to="/create" className="btn btn-primary text-lg">
            {t('welcome.createFamily')}
          </Link>
          <p className="muted text-sm text-center">{t('welcome.localNote')}</p>
          <button className="btn btn-secondary" disabled={busy} onClick={demo}>
            🧪 {t('welcome.tryDemo')}
          </button>
        </>
      )}
    </div>
  );
}

function DemoCard() {
  const { t } = useTranslation();
  return (
    <div className="card text-sm">
      <p className="font-bold mb-1">{t('welcome.demoTitle')}</p>
      <p>
        {t('welcome.demoParent')}: <code>{DEMO.email}</code> / <code>{DEMO.password}</code>
      </p>
      <p>
        {t('welcome.demoKids')}: {DEMO.kids.map((k) => `${k.emoji} ${k.name} — PIN ${k.pin}`).join(' · ')}
      </p>
      <p className="muted text-xs mt-1">{t('welcome.demoNote')}</p>
    </div>
  );
}
