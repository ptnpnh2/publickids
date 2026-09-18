import { useTranslation } from 'react-i18next';
import { useFamily, useMe } from '@/hooks/useData';
import { Button, Card, Field, Segmented, Toggle } from '@/components/ui';
import { regenerateRecoveryCodes, updateFamily, updateMember } from '@/services/family';
import { applyPreset, NON_EDITABLE_PROTECTIONS } from '@/domain/presets';
import { setLocale } from '@/i18n';
import { useState } from 'react';
import { isElevated, useSession } from '@/services/session';
import type { Locale, Preset } from '@/domain/types';

export default function Settings() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const session = useSession((s) => s.session);
  const [codes, setCodes] = useState<string[] | null>(null);
  if (!family || !me) return null;
  const s = family.settings;
  const isParent = me.role === 'parent' || me.role === 'coparent';
  const set = (patch: Partial<typeof s>, explain?: string) => updateFamily(me.id, family.id, { settings: { ...s, ...patch, preset: 'custom' } }, explain);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('settings.title')}</h1>
      <Card>
        <Field label={t('settings.preset')} hint={t(`presetHint.${s.preset}`)}>
          <Segmented value={s.preset} onChange={(preset: Preset) => updateFamily(me.id, family.id, { settings: applyPreset(preset, s) }, 'settings.presetChanged')} options={(['simple', 'balanced', 'independent', 'custom'] as Preset[]).map((p) => ({ value: p, label: t(`preset.${p}`) }))} />
        </Field>
        <Field label={t('common.language')}>
          <Segmented value={me.locale} onChange={(locale: Locale) => { setLocale(locale); void updateMember(me.id, me.id, { locale }); }} options={[{ value: 'en', label: 'EN' }, { value: 'uk', label: 'UA' }, { value: 'es', label: 'ES' }]} />
        </Field>
      </Card>
      {isParent && (
        <Card>
          <h2 className="font-bold mb-2">{t('settings.economy')}</h2>
          <Field label={t('settings.activeCap')} hint={t('settings.activeCapHint')}>
            <input className="input" type="number" min={1} max={5} value={s.activeTrainingCap} onChange={(e) => set({ activeTrainingCap: Number(e.target.value) })} />
          </Field>
          <Field label={t('settings.nannyLimit')}>
            <input className="input" type="number" min={1} max={5} value={s.nannyApprovalLimit} onChange={(e) => set({ nannyApprovalLimit: Number(e.target.value) })} />
          </Field>
          <Toggle label={t('settings.aiEnabled')} checked={s.aiEnabled} onChange={(aiEnabled) => set({ aiEnabled })} />
          <Field label={t('settings.auditPct')}>
            <input className="input" type="number" min={0} max={100} value={s.autoApproveAuditPct} onChange={(e) => set({ autoApproveAuditPct: Number(e.target.value) })} />
          </Field>
          <Field label={t('settings.autoHistory')} hint={t('settings.autoHistoryHint')}>
            <input className="input" type="number" min={1} value={s.autoApproveMinHistory} onChange={(e) => set({ autoApproveMinHistory: Number(e.target.value) })} />
          </Field>
        </Card>
      )}
      {isParent && (
        <Card>
          <h2 className="font-bold mb-2">{t('settings.consequences')}</h2>
          <Toggle label={t('settings.responseCost')} checked={s.responseCostEnabled} onChange={(responseCostEnabled) => set({ responseCostEnabled }, 'settings.responseCostChanged')} />
          <p className="muted text-xs">{t('settings.responseCostHint')}</p>
          <Field label={t('settings.coolingOff')}>
            <input className="input" type="number" min={0} value={s.coolingOffMinutes} onChange={(e) => set({ coolingOffMinutes: Number(e.target.value) })} />
          </Field>
        </Card>
      )}
      <Card>
        <h2 className="font-bold mb-2">{t('settings.reminders')}</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('settings.quietStart')}><input className="input" type="time" value={s.quietHours.start} onChange={(e) => set({ quietHours: { ...s.quietHours, start: e.target.value } })} /></Field>
          <Field label={t('settings.quietEnd')}><input className="input" type="time" value={s.quietHours.end} onChange={(e) => set({ quietHours: { ...s.quietHours, end: e.target.value } })} /></Field>
        </div>
        <Field label={t('settings.remindersPerTask')}><input className="input" type="number" min={0} max={2} value={s.remindersPerTask} onChange={(e) => set({ remindersPerTask: Number(e.target.value) })} /></Field>
        <Toggle label={t('settings.schoolMode')} checked={s.schoolMode} onChange={(schoolMode) => set({ schoolMode })} />
        <Toggle label={t('settings.holidayMode')} checked={s.holidayMode} onChange={(holidayMode) => set({ holidayMode })} />
        {'Notification' in window && Notification.permission !== 'granted' && (
          <Button variant="secondary" className="mt-2" onClick={() => Notification.requestPermission()}>🔔 {t('settings.enableNotifications')}</Button>
        )}
      </Card>
      <Card>
        <h2 className="font-bold mb-2">{t('settings.privacy')}</h2>
        <Toggle label={t('settings.deleteRaw')} checked={s.deleteRawProofOnResolve} onChange={(deleteRawProofOnResolve) => set({ deleteRawProofOnResolve })} />
        <Field label={t('settings.retentionDays')}><input className="input" type="number" min={1} max={30} value={s.rawProofRetentionDays} onChange={(e) => set({ rawProofRetentionDays: Number(e.target.value) })} /></Field>
        <p className="muted text-xs">{t('settings.privacyNote')}</p>
      </Card>
      <Card>
        <h2 className="font-bold mb-2">{t('settings.protections')}</h2>
        <ul className="text-sm list-disc ml-5">
          {NON_EDITABLE_PROTECTIONS.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      </Card>
      {me.isSuperUser && (
        <Card>
          <h2 className="font-bold mb-2">{t('settings.recovery')}</h2>
          {codes ? (
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm">{codes.map((c) => <li key={c} className="chip justify-center">{c}</li>)}</ul>
          ) : (
            <Button variant="secondary" disabled={!isElevated(session)} onClick={async () => setCodes(await regenerateRecoveryCodes(me.id, family.id))}>{t('settings.regenerateCodes')}</Button>
          )}
          {!isElevated(session) && <p className="muted text-xs mt-1">{t('family.needsSuperUser')}</p>}
        </Card>
      )}
    </div>
  );
}
