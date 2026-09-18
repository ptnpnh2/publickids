import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgreement, useFamily, useMe, useMembers } from '@/hooks/useData';
import { Button, Card, Field } from '@/components/ui';
import { getOrCreateAgreement, resolveChange, updateAgreement } from '@/services/agreement';

/** Plain language, real choices, age-appropriate assent, reviewed every 4–6 weeks. */
export default function Agreement() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const members = useMembers();
  const agreement = useAgreement();
  const [intro, setIntro] = useState('');
  const [rules, setRules] = useState<{ id: string; text: string; relatedPrivilege?: string }[]>([]);
  const [weeks, setWeeks] = useState(5);
  useEffect(() => {
    if (family && !agreement) void getOrCreateAgreement(family.id, t('agreement.defaultIntro'), [t('agreement.defaultRule1'), t('agreement.defaultRule2'), t('agreement.defaultRule3')]);
  }, [family, agreement, t]);
  useEffect(() => {
    if (agreement) { setIntro(agreement.intro); setRules(agreement.rules); setWeeks(agreement.reviewEveryWeeks); }
  }, [agreement]);
  if (!agreement || !me || !family) return null;
  const isParent = me.role === 'parent' || me.role === 'coparent';
  const kids = members.filter((m) => m.role === 'child');
  const reviewDue = new Date(agreement.nextReviewAt) <= new Date();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('agreement.title')}</h1>
      <p className="muted text-sm">{t('agreement.explain')}</p>
      {reviewDue && <Card>📅 {t('agreement.reviewDue')}</Card>}
      <Card>
        <Field label={t('agreement.intro')}><textarea className="input" rows={3} disabled={!isParent} value={intro} onChange={(e) => setIntro(e.target.value)} /></Field>
        <Field label={t('agreement.rules')} hint={t('agreement.rulesHint')}>
          {rules.map((r, i) => (
            <div key={r.id} className="flex gap-2 mb-1">
              <input className="input" disabled={!isParent} value={r.text} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
              <input className="input w-32" disabled={!isParent} placeholder={t('agreement.privilege')} value={r.relatedPrivilege ?? ''} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, relatedPrivilege: e.target.value || undefined } : x)))} />
              {isParent && <Button variant="ghost" onClick={() => setRules(rules.filter((_, j) => j !== i))}>✕</Button>}
            </div>
          ))}
          {isParent && <Button variant="ghost" className="text-sm" onClick={() => setRules([...rules, { id: `r${Date.now()}`, text: '' }])}>＋ {t('agreement.addRule')}</Button>}
        </Field>
        <Field label={t('agreement.reviewEvery')}><input className="input" type="number" min={4} max={6} disabled={!isParent} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></Field>
        {isParent && <Button onClick={() => updateAgreement(me.id, family.id, { intro, rules: rules.filter((r) => r.text.trim()), reviewEveryWeeks: Math.min(6, Math.max(4, weeks)) })}>{t('common.save')}</Button>}
        <p className="muted text-xs mt-2">{t('agreement.versionLine', { v: agreement.version, date: new Date(agreement.nextReviewAt).toLocaleDateString() })}</p>
      </Card>
      <Card>
        <h2 className="font-bold mb-1">{t('agreement.assents')}</h2>
        {kids.map((k) => {
          const a = agreement.assents.find((x) => x.memberId === k.id);
          return (
            <p key={k.id} className="text-sm">{k.child?.avatar.emoji} {k.name}: {a ? (a.version === agreement.version ? `✓ v${a.version}` : t('agreement.assentOld', { v: a.version })) : t('agreement.notYet')}</p>
          );
        })}
        <p className="muted text-xs mt-2">{t('agreement.assentNote')}</p>
      </Card>
      {agreement.changeRequests.length > 0 && (
        <Card>
          <h2 className="font-bold mb-1">{t('agreement.changeRequests')}</h2>
          {agreement.changeRequests.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-1 text-sm border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="flex-1">{members.find((m) => m.id === c.memberId)?.name}: “{c.text}” <span className="chip">{t(`agreement.cr.${c.status}`)}</span></span>
              {isParent && c.status === 'open' && (
                <>
                  <Button variant="secondary" className="text-xs" onClick={() => resolveChange(me.id, family.id, c.id, 'accepted')}>{t('common.accept')}</Button>
                  <Button variant="ghost" className="text-xs" onClick={() => resolveChange(me.id, family.id, c.id, 'declined')}>{t('common.decline')}</Button>
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
