import { useTranslation } from 'react-i18next';
import { useFamily, useMe } from '@/hooks/useData';
import { Button, Card, ErrorText, Field, Segmented, Toggle } from '@/components/ui';
import { regenerateRecoveryCodes, updateFamily, updateMember } from '@/services/family';
import { applyPreset, NON_EDITABLE_PROTECTIONS } from '@/domain/presets';
import { setLocale } from '@/i18n';
import { useState } from 'react';
import { isElevated, useSession } from '@/services/session';
import type { CameraConfig, Locale, Preset } from '@/domain/types';
import { zoneAllowed } from '@/domain/camera';
import { uid, nowISO } from '@/db/schema';
import { Link } from 'react-router-dom';
import { PageTitle } from '@/components/ui';

export default function Settings() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const session = useSession((s) => s.session);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [newCam, setNewCam] = useState({ name: '', zone: '', start: '16:00', end: '19:00' });
  const [camError, setCamError] = useState<string | null>(null);
  if (!family || !me) return null;
  const s = family.settings;
  const isParent = me.role === 'parent' || me.role === 'coparent';
  const set = (patch: Partial<typeof s>, explain?: string) => updateFamily(me.id, family.id, { settings: { ...s, ...patch, preset: 'custom' } }, explain);

  return (
    <div className="space-y-4">
      <PageTitle>{t('settings.title')}</PageTitle>
      <Card>
        <Field label={t('settings.preset')} hint={t(`presetHint.${s.preset}`)}>
          <Segmented value={s.preset} onChange={(preset: Preset) => updateFamily(me.id, family.id, { settings: applyPreset(preset, s) }, 'settings.presetChanged')} options={(['simple', 'balanced', 'independent', 'custom'] as Preset[]).map((p) => ({ value: p, label: t(`preset.${p}`) }))} />
        </Field>
        <Field label={t('common.language')}>
          <Segmented value={me.locale} onChange={(locale: Locale) => { setLocale(locale); void updateMember(me.id, me.id, { locale }); }} options={[{ value: 'en', label: 'EN' }, { value: 'uk', label: 'UA' }, { value: 'es', label: 'ES' }, { value: 'ru', label: 'RU' }]} />
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
      {isParent && (
        <Card>
          <h2 className="font-bold mb-1">📹 {t('camera.title')}</h2>
          <p className="muted text-xs mb-2">{t('camera.explain')}</p>
          <Toggle label={t('camera.enable')} checked={s.camera.enabled} onChange={(enabled) => set({ camera: { ...s.camera, enabled, parentConsentAt: enabled ? s.camera.parentConsentAt ?? nowISO() : s.camera.parentConsentAt } }, 'camera.changed')} />
          {s.camera.enabled && (
            <>
              <Field label={t('camera.gateway')} hint={t('camera.gatewayHint')}><input className="input" placeholder="http://192.168.1.20:8787" value={s.camera.gatewayUrl ?? ''} onChange={(e) => set({ camera: { ...s.camera, gatewayUrl: e.target.value } })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('camera.maxClip')}><input className="input" type="number" min={5} max={60} value={s.camera.maxClipSeconds} onChange={(e) => set({ camera: { ...s.camera, maxClipSeconds: Math.min(60, Number(e.target.value)) } })} /></Field>
                <Field label={t('camera.dailyLimit')}><input className="input" type="number" min={1} max={20} value={s.camera.dailyClipLimit} onChange={(e) => set({ camera: { ...s.camera, dailyClipLimit: Number(e.target.value) } })} /></Field>
              </div>
              <Toggle label={t('camera.deleteClips')} checked={s.camera.deleteClipsOnResolve} onChange={(deleteClipsOnResolve) => set({ camera: { ...s.camera, deleteClipsOnResolve } })} />
              {s.camera.cameras.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-2 divider text-sm">
                  <span className="flex-1"><b>{c.name}</b> · {c.zone} · {c.window.start}–{c.window.end} · {t('camera.assents', { n: Object.keys(c.childAssent).length })}</span>
                  <Button variant="ghost" className="text-xs" onClick={() => set({ camera: { ...s.camera, cameras: s.camera.cameras.filter((x) => x.id !== c.id) } })}>✕</Button>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input className="input" placeholder={t('camera.name')} value={newCam.name} onChange={(e) => setNewCam({ ...newCam, name: e.target.value })} />
                <input className="input" placeholder={t('camera.zone')} value={newCam.zone} onChange={(e) => setNewCam({ ...newCam, zone: e.target.value })} />
                <input className="input" type="time" value={newCam.start} onChange={(e) => setNewCam({ ...newCam, start: e.target.value })} />
                <input className="input" type="time" value={newCam.end} onChange={(e) => setNewCam({ ...newCam, end: e.target.value })} />
              </div>
              <ErrorText error={camError} />
              <Button variant="secondary" className="mt-2" disabled={!newCam.name.trim()} onClick={() => { if (!zoneAllowed(newCam.zone)) return setCamError('camera.reason.zone'); setCamError(null); const cam: CameraConfig = { id: uid(), name: newCam.name, zone: newCam.zone, window: { start: newCam.start, end: newCam.end }, childAssent: {} }; set({ camera: { ...s.camera, cameras: [...s.camera.cameras, cam] } }, 'camera.changed'); setNewCam({ name: '', zone: '', start: '16:00', end: '19:00' }); }}>＋ {t('camera.add')}</Button>
              <ul className="muted text-xs mt-3 list-disc ml-5">
                <li>{t('camera.rule1')}</li><li>{t('camera.rule2')}</li><li>{t('camera.rule3')}</li><li>{t('camera.rule4')}</li>
              </ul>
            </>
          )}
        </Card>
      )}
      {isParent && (
        <Card>
          <h2 className="font-bold mb-1">💶 {t('money.title')}</h2>
          <p className="muted text-xs">{t('money.explain')}</p>
          <Link to="/parent/money" className="btn btn-secondary mt-2">{t('money.open')}</Link>
        </Card>
      )}
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
