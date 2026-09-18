import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChildren, useCoop, useFamily, useMe } from '@/hooks/useData';
import { Button, Card, Field, Progress } from '@/components/ui';
import { adjustCoopTarget, createCoop } from '@/services/coop';

export default function Coop() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const coop = useCoop();
  const [form, setForm] = useState({ title: '', emoji: '🏕️', target: 20, celebration: '' });
  const [target, setTarget] = useState(coop?.targetCount ?? 20);
  const total = coop ? Object.values(coop.contributions).reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="space-y-4">
      <h1 className="page-title">{t('coop.title')}</h1>
      <p className="muted text-sm">{t('coop.explain')}</p>
      {coop && (
        <Card>
          <h2 className="font-bold">{coop.emoji} {coop.title}</h2>
          <Progress value={total} max={coop.targetCount} className="my-2" />
          <p className="text-sm">{total}/{coop.targetCount} · {t(`coop.status.${coop.status}`)}</p>
          <ul className="text-sm mt-2">
            {kids.map((k) => <li key={k.id}>{k.child?.avatar.emoji} {k.name}: {coop.contributions[k.id] ?? 0} <span className="muted text-xs">({t('coop.parentOnlySees')})</span></li>)}
          </ul>
          <div className="flex gap-2 mt-3 items-end">
            <Field label={t('coop.adjustTarget')}><input className="input" type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></Field>
            <Button variant="secondary" onClick={() => me && adjustCoopTarget(me.id, coop.id, target)}>{t('common.apply')}</Button>
          </div>
        </Card>
      )}
      <Card>
        <h2 className="font-bold mb-2">{coop ? t('coop.newReplaces') : t('coop.new')}</h2>
        <div className="flex gap-2 mb-3">
          <input className="input w-16 text-center" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} aria-label="emoji" />
          <input className="input" placeholder={t('coop.titlePlaceholder')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <Field label={t('coop.targetCount')} hint={t('coop.targetHint')}><input className="input" type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} /></Field>
        <Field label={t('coop.celebration')} hint={t('coop.celebrationHint')}><input className="input" value={form.celebration} onChange={(e) => setForm({ ...form, celebration: e.target.value })} /></Field>
        <Button disabled={!form.title.trim()} onClick={async () => { if (me && family) { await createCoop(me.id, family.id, form.title, form.emoji, form.target, form.celebration || undefined); setForm({ ...form, title: '' }); } }}>{t('common.save')}</Button>
      </Card>
    </div>
  );
}
