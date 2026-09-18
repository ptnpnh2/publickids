import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';

/** Parents-only guidance: concise family rules plus one rotating evidence-based tip, collapsed by default. */
export default function Guide() {
  const { t } = useTranslation();
  const tipIndex = useMemo(() => Math.floor(Date.now() / 86_400_000) % 7, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('guide.title')}</h1>
      <Card>
        <h2 className="font-bold">💡 {t('guide.tipOfDay')}</h2>
        <p className="text-sm mt-1">{t(`guide.tip.${tipIndex}`)}</p>
      </Card>
      {['loop', 'points', 'praise', 'consequences', 'progress', 'privacy', 'seekHelp'].map((k) => (
        <details key={k} className="card">
          <summary className="font-bold cursor-pointer">{t(`guide.${k}.title`)}</summary>
          <p className="text-sm mt-2 whitespace-pre-line">{t(`guide.${k}.body`)}</p>
        </details>
      ))}
    </div>
  );
}
