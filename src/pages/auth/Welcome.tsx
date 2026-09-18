import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { SUPPORTED_LOCALES, setLocale } from '@/i18n';
import i18n from '@/i18n';

export default function Welcome() {
  const { t } = useTranslation();
  const families = useLiveQuery(() => db.families.toArray(), []) ?? [];
  const hasFamily = families.length > 0;
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
        </>
      ) : (
        <>
          <Link to="/create" className="btn btn-primary text-lg">
            {t('welcome.createFamily')}
          </Link>
          <p className="muted text-sm text-center">{t('welcome.localNote')}</p>
        </>
      )}
    </div>
  );
}
