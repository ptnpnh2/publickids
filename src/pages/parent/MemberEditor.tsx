import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useChildren, useFamily, useMe } from '@/hooks/useData';
import { Button, Card, ErrorText, Field, Modal, Segmented, Toggle } from '@/components/ui';
import { addAdult, addChild, updateChildProfile, updateMember } from '@/services/family';
import { elevate } from '@/services/auth';
import { hashSecret } from '@/services/crypto';
import { isElevated, useSession } from '@/services/session';
import { AVATAR_CHOICES } from '@/services/templates';
import type { AgeBand, ChildProfile, Role } from '@/domain/types';
import { appUrl } from '@/services/url';

export default function MemberEditor() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const me = useMe();
  const family = useFamily();
  const kids = useChildren();
  const session = useSession((s) => s.session);
  const elevateSession = useSession((s) => s.elevate);
  const existing = useLiveQuery(() => (id ? db.members.get(id) : undefined), [id]);
  const [kind, setKind] = useState<'child' | 'adult'>('child');
  const [child, setChild] = useState({ name: '', emoji: AVATAR_CHOICES[1], band: '7-9' as AgeBand, pin: '' });
  const [adult, setAdult] = useState({ name: '', role: 'coparent' as Exclude<Role, 'child'>, email: '', password: '', scoped: [] as string[], limit: 3 });
  const [error, setError] = useState<string | null>(null);
  const [elevOpen, setElevOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [newPin, setNewPin] = useState('');
  useEffect(() => {
    if (existing?.child) setChild({ name: existing.name, emoji: existing.child.avatar.emoji, band: existing.child.ageBand, pin: '' });
    if (existing && existing.role !== 'child') { setKind('adult'); setAdult({ name: existing.name, role: existing.role as Exclude<Role, 'child'>, email: existing.email ?? '', password: '', scoped: existing.scopedChildIds ?? [], limit: existing.approvalLimit ?? 3 }); }
  }, [existing]);

  const elevated = isElevated(session);
  const needsElevation = existing && existing.role !== 'child';

  async function save() {
    if (!me || !family) return;
    setError(null);
    try {
      if (existing) {
        if (existing.role === 'child') {
          await updateMember(me.id, existing.id, { name: child.name, ...(newPin.length === 4 ? { pinHash: await hashSecret(newPin) } : {}) });
          await updateChildProfile(me.id, existing.id, { ageBand: child.band, avatar: { ...existing.child!.avatar, emoji: child.emoji } });
        } else {
          if (!elevated) return setElevOpen(true); // role changes need the super-user
          await updateMember(me.id, existing.id, { name: adult.name, role: adult.role, scopedChildIds: adult.role === 'nanny' || adult.role === 'sponsor' ? adult.scoped : undefined, approvalLimit: adult.role === 'nanny' ? adult.limit : undefined }, 'member.roleChanged');
        }
      } else if (kind === 'child') {
        if (child.pin.length !== 4) return setError('onboarding.pinHint');
        await addChild({ familyId: family.id, name: child.name, emoji: child.emoji, band: child.band, pin: child.pin, locale: family.locale, actorId: me.id });
      } else {
        if (!elevated) return setElevOpen(true);
        if (adult.password.length < 8) return setError('auth.passwordShort');
        await addAdult({ familyId: family.id, name: adult.name, role: adult.role, email: adult.email, password: adult.password, locale: family.locale, scopedChildIds: adult.role === 'nanny' || adult.role === 'sponsor' ? adult.scoped : undefined, approvalLimit: adult.role === 'nanny' ? adult.limit : undefined, actorId: me.id });
      }
      nav('/parent/family');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doElevate() {
    if (!family) return;
    const r = await elevate(family.id, secret);
    if (!r) return setError('auth.invalid');
    elevateSession(10);
    setElevOpen(false);
    setSecret('');
  }

  const setProfile = (patch: Partial<ChildProfile>) => me && existing && updateChildProfile(me.id, existing.id, patch);
  const c = existing?.child;

  return (
    <div className="space-y-4">
      <h1 className="page-title">{existing ? t('common.edit') : t('family.add')}</h1>
      {!existing && <Segmented value={kind} onChange={setKind} options={[{ value: 'child', label: t('role.child') }, { value: 'adult', label: t('family.adult') }]} />}
      <Card>
        {kind === 'child' ? (
          <>
            <Field label={t('onboarding.childName')}><input className="input" value={child.name} onChange={(e) => setChild({ ...child, name: e.target.value })} /></Field>
            <Field label={t('onboarding.avatar')}>
              <div className="flex flex-wrap gap-2">
                {AVATAR_CHOICES.map((a) => (
                  <button key={a} type="button" className={`text-3xl rounded-xl p-1 ${child.emoji === a ? 'ring-2' : ''}`} onClick={() => setChild({ ...child, emoji: a })}>{a}</button>
                ))}
              </div>
            </Field>
            <Field label={t('onboarding.ageBand')} hint={t('onboarding.ageHint')}>
              <Segmented value={child.band} onChange={(band) => setChild({ ...child, band })} options={(['4-6', '7-9', '10-12', 'teen'] as AgeBand[]).map((b) => ({ value: b, label: t(`ageBand.${b}`) }))} />
            </Field>
            {existing ? (
              <Field label={t('family.newPin')} hint={t('onboarding.pinHint')}><input className="input" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} /></Field>
            ) : (
              <Field label={t('onboarding.pin')} hint={t('onboarding.pinHint')}><input className="input" inputMode="numeric" maxLength={4} value={child.pin} onChange={(e) => setChild({ ...child, pin: e.target.value.replace(/\D/g, '') })} /></Field>
            )}
          </>
        ) : (
          <>
            <Field label={t('auth.yourName')}><input className="input" value={adult.name} onChange={(e) => setAdult({ ...adult, name: e.target.value })} /></Field>
            <Field label={t('family.role')} hint={t(`roleHint.${adult.role}`)}>
              <select className="input" value={adult.role} onChange={(e) => setAdult({ ...adult, role: e.target.value as Exclude<Role, 'child'> })}>
                {(['parent', 'coparent', 'nanny', 'sponsor'] as const).map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
              </select>
            </Field>
            {!existing && (
              <>
                <Field label={t('auth.email')}><input className="input" type="email" value={adult.email} onChange={(e) => setAdult({ ...adult, email: e.target.value })} /></Field>
                <Field label={t('auth.password')} hint={t('family.tempPassword')}><input className="input" type="text" value={adult.password} onChange={(e) => setAdult({ ...adult, password: e.target.value })} /></Field>
              </>
            )}
            {(adult.role === 'nanny' || adult.role === 'sponsor') && (
              <Field label={t('family.scopedChildren')}>
                <div className="flex flex-wrap gap-2">
                  {kids.map((k) => (
                    <button key={k.id} type="button" className={`btn ${adult.scoped.includes(k.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdult({ ...adult, scoped: adult.scoped.includes(k.id) ? adult.scoped.filter((x) => x !== k.id) : [...adult.scoped, k.id] })}>{k.child?.avatar.emoji} {k.name}</button>
                  ))}
                </div>
              </Field>
            )}
            {adult.role === 'nanny' && (
              <Field label={t('family.approvalLimit')} hint={t('family.approvalLimitHint')}><input className="input" type="number" min={1} max={5} value={adult.limit} onChange={(e) => setAdult({ ...adult, limit: Number(e.target.value) })} /></Field>
            )}
            {existing && me?.isSuperUser && (
              <Toggle label={t('role.supervisor')} checked={!!existing.isSupervisor} onChange={(v) => me && updateMember(me.id, existing.id, { isSupervisor: v }, 'member.supervisorChanged')} />
            )}
            {needsElevation && !elevated && <p className="muted text-xs">{t('family.needsSuperUser')}</p>}
          </>
        )}
        <ErrorText error={error} />
        <div className="flex gap-2 mt-3">
          <Button className="flex-1" onClick={save}>{t('common.save')}</Button>
          {existing && me && existing.id !== me.id && (
            <Button variant="secondary" onClick={async () => { if (existing.role !== 'child' && !elevated) return setElevOpen(true); await updateMember(me.id, existing.id, { archived: true }); nav('/parent/family'); }}>{t('common.archive')}</Button>
          )}
        </div>
      </Card>

      {c && existing && (
        <Card>
          <h2 className="font-bold mb-1">{t('profile.title')}</h2>
          <p className="muted text-xs mb-3">{t('profile.hint')}</p>
          <Field label={t('profile.literacy')}><Segmented value={c.literacy} onChange={(literacy) => setProfile({ literacy })} options={[{ value: 'pictures', label: t('profile.pictures') }, { value: 'simple', label: t('profile.simple') }, { value: 'full', label: t('profile.full') }]} /></Field>
          <Field label={t('profile.independence')}><Segmented value={c.independence} onChange={(independence) => setProfile({ independence })} options={[{ value: 'guided', label: t('profile.guided') }, { value: 'shared', label: t('profile.shared') }, { value: 'self', label: t('profile.self') }]} /></Field>
          <Field label={t('profile.proofComplexity')}><Segmented value={c.proofComplexity} onChange={(proofComplexity) => setProfile({ proofComplexity })} options={[{ value: 'none', label: t('profile.none') }, { value: 'simple', label: t('profile.simple') }, { value: 'standard', label: t('profile.standard') }]} /></Field>
          <Field label={t('profile.planning')}><Segmented value={String(c.planningHorizonDays) as '1' | '3' | '7'} onChange={(v) => setProfile({ planningHorizonDays: Number(v) as 1 | 3 | 7 })} options={[{ value: '1', label: t('profile.day1') }, { value: '3', label: t('profile.day3') }, { value: '7', label: t('profile.day7') }]} /></Field>
          <Toggle label={t('a11y.audio')} checked={c.audioSupport} onChange={(audioSupport) => setProfile({ audioSupport })} />
          <Toggle label={t('a11y.simplifiedLanguage')} checked={c.simplifiedLanguage} onChange={(simplifiedLanguage) => setProfile({ simplifiedLanguage })} />
          <Toggle label={t('a11y.largeTargets')} checked={c.largeTargets} onChange={(largeTargets) => setProfile({ largeTargets })} />
          <Toggle label={t('a11y.highContrast')} checked={c.highContrast} onChange={(highContrast) => setProfile({ highContrast })} />
          <Toggle label={t('a11y.reducedMotion')} checked={c.reducedMotion} onChange={(reducedMotion) => setProfile({ reducedMotion })} />
          <Toggle label={t('a11y.extraTime')} checked={c.extraProcessingTime} onChange={(extraProcessingTime) => setProfile({ extraProcessingTime })} />
          <h3 className="font-bold mt-4">{t('independence.title')}</h3>
          <p className="muted text-xs mb-2">{t('independence.hint')}</p>
          <Toggle label={t('independence.mode')} checked={c.independenceMode} onChange={(independenceMode) => setProfile({ independenceMode })} />
          <Toggle label={t('independence.fadingReminders')} checked={c.fadingReminders} onChange={(fadingReminders) => setProfile({ fadingReminders })} />
          <Field label={t('independence.appFreeDays')}>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} type="button" className={`btn flex-1 text-xs ${c.appFreeDays.includes(d) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setProfile({ appFreeDays: c.appFreeDays.includes(d) ? c.appFreeDays.filter((x) => x !== d) : [...c.appFreeDays, d] })}>{t(`weekday.${d}`)}</button>
              ))}
            </div>
          </Field>
          <Field label={t('independence.vacationUntil')}><input className="input" type="date" value={c.vacationUntil?.slice(0, 10) ?? ''} onChange={(e) => setProfile({ vacationUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></Field>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="secondary" onClick={() => setProfile({ sickDays: Array.from(new Set([...c.sickDays, new Date().toISOString().slice(0, 10)])) })}>🤒 {t('independence.sickToday')}</Button>
            <Button variant="secondary" onClick={() => window.open(appUrl(`/parent/family/${existing.id}/progress?print=1`), '_blank')}>🖨️ {t('independence.printRoutine')}</Button>
            {!c.graduatedFromApp ? (
              <Button variant="ghost" onClick={() => setProfile({ graduatedFromApp: new Date().toISOString() })}>🎓 {t('independence.graduate')}</Button>
            ) : (
              <Button variant="ghost" onClick={() => setProfile({ graduatedFromApp: undefined })}>{t('independence.ungraduate')}</Button>
            )}
          </div>
        </Card>
      )}

      <Modal open={elevOpen} onClose={() => setElevOpen(false)} title={t('family.superUserTitle')}>
        <p className="muted text-sm mb-2">{t('family.superUserHint')}</p>
        <input className="input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
        <ErrorText error={error} />
        <Button className="w-full mt-3" onClick={doElevate}>{t('common.continue')}</Button>
      </Modal>
    </div>
  );
}
