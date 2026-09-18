import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChildren, useFamily, useMe, useMoney } from '@/hooks/useData';
import { Button, Card, ErrorText, Field, PageTitle, Toggle } from '@/components/ui';
import { jarBalances, totalEarned, unsettledPayouts, validateJars } from '@/domain/money';
import { markSettled, requestPayout } from '@/services/money';
import { updateFamily } from '@/services/family';
import type { Jar } from '@/domain/types';

/** Extra-job money ledger (V2): separate from points; save / spend / give jars; parent-funded interest. */
export default function Money() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const money = useMoney();
  const [error, setError] = useState<string | null>(null);
  const [payout, setPayout] = useState<{ childId: string; jar: Jar; amount: number }>({ childId: '', jar: 'spend', amount: 1 });
  if (!family || !me) return null;
  const m = family.settings.money;
  const isParent = me.role === 'parent' || me.role === 'coparent';
  const setMoney = (patch: Partial<typeof m>) => updateFamily(me.id, family.id, { settings: { ...family.settings, money: { ...m, ...patch } } }, 'money.settingsChanged');

  return (
    <div className="space-y-4">
      <PageTitle>💶 {t('money.title')}</PageTitle>
      <p className="muted text-sm">{t('money.explain')}</p>
      {isParent && (
        <Card>
          <Toggle label={t('money.enable')} checked={m.enabled} onChange={(enabled) => setMoney({ enabled })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('money.currency')}><input className="input" value={m.currency} maxLength={3} onChange={(e) => setMoney({ currency: e.target.value.toUpperCase() })} /></Field>
            <Field label={t('money.interest')} hint={t('money.interestHint')}><input className="input" type="number" min={0} max={10} step={0.5} value={m.interestPctMonthly} onChange={(e) => setMoney({ interestPctMonthly: Number(e.target.value) })} /></Field>
          </div>
          <Field label={t('money.jarsSplit')} hint={t('money.jarsHint')}>
            <div className="grid grid-cols-3 gap-2">
              {(['save', 'spend', 'give'] as Jar[]).map((j) => (
                <label key={j} className="text-center">
                  <span className="muted text-xs block">{t(`money.jar.${j}`)}</span>
                  <input className="input text-center" type="number" min={0} max={100} value={m.jars[j]} onChange={(e) => { const jars = { ...m.jars, [j]: Number(e.target.value) }; if (validateJars(jars)) setMoney({ jars }); else setError('money.jarsInvalid'); }} />
                </label>
              ))}
            </div>
          </Field>
          <ErrorText error={error} />
        </Card>
      )}
      {kids.map((k) => {
        const jars = jarBalances(money, k.id);
        const open = unsettledPayouts(money, k.id);
        return (
          <Card key={k.id}>
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">{k.child?.avatar.emoji} {k.name}</h2>
              <span className="chip chip-accent">{t('money.earned')}: {totalEarned(money, k.id).toFixed(2)} {m.currency}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {(['save', 'spend', 'give'] as Jar[]).map((j) => (
                <div key={j} className="rounded-2xl p-2 text-center" style={{ background: 'var(--bg-2)' }}>
                  <div className="display font-extrabold text-lg">{jars[j].toFixed(2)}</div>
                  <div className="muted text-xs">{t(`money.jar.${j}`)}</div>
                </div>
              ))}
            </div>
            {open.length > 0 && (
              <div className="mt-3">
                <div className="label">{t('money.unsettled')}</div>
                {open.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 py-1 text-sm divider">
                    <span className="flex-1">{t(e.reason, { defaultValue: e.reason })} · {Math.abs(e.amount).toFixed(2)} {m.currency} · {new Date(e.createdAt).toLocaleDateString()}</span>
                    {isParent && <Button variant="secondary" className="text-xs" onClick={() => markSettled(me.id, e.id)}>✓ {t('money.settle')}</Button>}
                  </div>
                ))}
              </div>
            )}
            {isParent && (
              <div className="grid gap-2 mt-3 items-end" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                <Field label={t('money.jarLabel')}>
                  <select className="input" value={payout.childId === k.id ? payout.jar : 'spend'} onChange={(e) => setPayout({ childId: k.id, jar: e.target.value as Jar, amount: payout.amount })}>
                    {(['spend', 'save', 'give'] as Jar[]).map((j) => <option key={j} value={j}>{t(`money.jar.${j}`)}</option>)}
                  </select>
                </Field>
                <Field label={t('money.amount')}><input className="input" type="number" min={0.5} step={0.5} value={payout.childId === k.id ? payout.amount : 1} onChange={(e) => setPayout({ childId: k.id, jar: payout.childId === k.id ? payout.jar : 'spend', amount: Number(e.target.value) })} /></Field>
                <Button className="mb-3" onClick={async () => { setError(null); try { await requestPayout(me.id, k.id, payout.childId === k.id ? payout.jar : 'spend', payout.childId === k.id ? payout.amount : 1); } catch (err) { setError((err as Error).message); } }}>{t('money.payout')}</Button>
              </div>
            )}
          </Card>
        );
      })}
      <p className="muted text-xs">{t('money.neverGrades')}</p>
    </div>
  );
}
