import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgreement, useFamily, useIncidents, useMe, useMomentum, useMoney, useStages, useSubmissions, useTasks } from '@/hooks/useData';
import { SEASONS, seasonProgress } from '@/domain/quests';
import { jarBalances } from '@/domain/money';
import { moveBetweenJars } from '@/services/money';
import { PageTitle, Ring } from '@/components/ui';
import { Button, Card, Modal, Segmented, Toggle } from '@/components/ui';
import { updateChildProfile, updateMember } from '@/services/family';
import { COSMETICS } from '@/services/templates';
import { MOMENTUM_SKINS, levelIndex, levelsFor, windowStats } from '@/domain/momentum';
import { excludedDaysFor } from '@/services/momentum';
import { assent, requestChange } from '@/services/agreement';
import { appealIncident } from '@/services/incidents';
import { freshStart } from '@/services/starter';
import { db, uid, nowISO } from '@/db/schema';
import { setLocale } from '@/i18n';
import type { CelebrationStyle, Locale, ThemeName } from '@/domain/types';

/** Private progress, avatar, momentum explanation, settings, agreement, repair and reflection. */
export default function Me() {
  const { t } = useTranslation();
  const me = useMe();
  const family = useFamily();
  const tasks = useTasks();
  const stages = useStages(me?.id);
  const subs = useSubmissions(me?.id);
  const momentum = useMomentum(me?.id);
  const agreement = useAgreement();
  const incidents = useIncidents(me?.id);
  const money = useMoney(me?.id);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState('');
  const [reflectOpen, setReflectOpen] = useState(false);
  const [reflect, setReflect] = useState<{ difficulty?: 'easy' | 'okay' | 'hard'; whatHelped: string }>({ whatHelped: '' });
  if (!me?.child || !family) return null;
  const c = me.child;
  const levels = levelsFor(family.momentum, me.id);
  const li = momentum ? levelIndex(levels, momentum.levelKey) : 0;
  const skin = MOMENTUM_SKINS[c.momentumSkin];
  const w7 = windowStats(me.id, tasks, stages, subs, 7, { excludedDays: excludedDaysFor(me), freshStartKey: c.freshStartAt?.slice(0, 10) });
  const w28 = windowStats(me.id, tasks, stages, subs, 28, { excludedDays: excludedDaysFor(me), freshStartKey: c.freshStartAt?.slice(0, 10) });
  const approvedCount = subs.filter((s) => s.status === 'approved').length;
  const openIncidents = incidents.filter((i) => i.status !== 'closed');
  const myAssent = agreement?.assents.find((a) => a.memberId === me.id && a.version === agreement.version);
  const set = (patch: Partial<typeof c>) => updateChildProfile(me.id, me.id, patch);

  async function toggleEquip(id: string) {
    const equipped = c.avatar.equipped.includes(id) ? c.avatar.equipped.filter((x) => x !== id) : [...c.avatar.equipped, id];
    await set({ avatar: { ...c.avatar, equipped } });
  }

  return (
    <div className="space-y-4">
      <PageTitle>{t('nav.me')}</PageTitle>
      <Card className="text-center">
        <div className="text-6xl">
          {c.avatar.emoji}
          {c.avatar.equipped.map((id) => COSMETICS.find((x) => x.id === id)?.emoji).join('')}
        </div>
        <p className="font-bold mt-1">{me.name}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {COSMETICS.map((cos) => {
            const unlocked = c.avatar.unlocked.includes(cos.id);
            return (
              <button key={cos.id} disabled={!unlocked} className={`text-2xl rounded-xl p-1 ${c.avatar.equipped.includes(cos.id) ? 'ring-2' : ''}`} style={{ minWidth: 'var(--target)', opacity: unlocked ? 1 : 0.35 }} onClick={() => toggleEquip(cos.id)} title={unlocked ? '' : t('avatar.unlockAt', { n: cos.unlockAt })}>
                {cos.emoji}
              </button>
            );
          })}
        </div>
        <p className="muted text-xs mt-2">{t('avatar.neverSad', { n: approvedCount })}</p>
      </Card>

      <Card>
        {(() => {
          const season = SEASONS.find((s) => s.id === c.season) ?? SEASONS[0];
          const p = seasonProgress(season, approvedCount);
          return (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-extrabold">{season.emoji} {t('quest.title')}: {t(season.nameKey)}</h2>
                <Ring value={p.done} max={p.total} size={48} stroke="var(--primary)" />
              </div>
              <p className="muted text-xs mt-1">{t('quest.neverExpires')}</p>
              <div className="grid-tiles mt-3">
                {[...p.creatures, ...p.gear].map((x) => (
                  <div key={x.id} className="text-2xl text-center rounded-xl py-1" style={{ background: x.unlocked ? 'var(--accent-soft)' : 'var(--bg-2)', opacity: x.unlocked ? 1 : 0.35 }} title={x.unlocked ? '' : t('avatar.unlockAt', { n: x.at })}>
                    {x.unlocked ? x.emoji : '❔'}
                  </div>
                ))}
              </div>
              {p.next && <p className="text-xs mt-2">{t('quest.next', { n: p.next.at - approvedCount, emoji: p.next.emoji })}</p>}
              <div className="mt-3">
                <div className="text-xs font-bold uppercase tracking-wide muted mb-1">{t('quest.castle')}</div>
                <div className="text-2xl tracking-wider">{(c.castle ?? []).join('') || '🌱'}</div>
                <p className="muted text-xs">{t('quest.castleHint')}</p>
              </div>
              <label className="label mt-3">{t('quest.pickSeason')}</label>
              <Segmented value={season.id} onChange={(id) => set({ season: id })} options={SEASONS.map((s) => ({ value: s.id, label: `${s.emoji} ${t(s.nameKey)}` }))} />
            </>
          );
        })()}
      </Card>

      <Card>
        <h2 className="font-bold">{t('me.progress')}</h2>
        <p className="text-sm mt-1">{t('me.window7', { met: w7.met, total: w7.commitments })}</p>
        <p className="text-sm">{t('me.window28', { pct: w28.pct })}</p>
        <p className="text-sm">{t('me.independent', { n: w28.independentStarts })}</p>
        <p className="muted text-xs mt-2">{t('me.privateNote')}</p>
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" onClick={() => freshStart(me.id, me.id)}>
            🌱 {t('freshStart.button')}
          </Button>
          <Button variant="ghost" onClick={() => setReflectOpen(true)}>
            💭 {t('reflect.button')}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">
          {t('momentum.title')}: {c.momentumSkin === 'neutral' ? levels[li]?.name : skin[li]}
        </h2>
        <p className="text-sm mt-1">{t('momentum.childExplain')}</p>
        <div className="flex gap-1 mt-2">
          {levels.map((l, i) => (
            <span key={l.key} className="chip" style={{ opacity: i <= li ? 1 : 0.4 }}>
              {c.momentumSkin === 'neutral' ? l.name : skin[i]}
            </span>
          ))}
        </div>
        {momentum?.pausedForReview && <p className="muted text-xs mt-2">{t('momentum.pausedChild')}</p>}
        <label className="label mt-3">{t('momentum.skin')}</label>
        <Segmented value={c.momentumSkin} onChange={(momentumSkin) => set({ momentumSkin })} options={[{ value: 'neutral', label: t('skin.neutral') }, { value: 'space', label: t('skin.space') }, { value: 'garden', label: t('skin.garden') }]} />
      </Card>

      {family.settings.money.enabled && (
        <Card>
          {(() => {
            const jars = jarBalances(money, me.id);
            const cur = family.settings.money.currency;
            return (
              <>
                <h2 className="font-extrabold">💶 {t('money.myMoney')}</h2>
                <p className="muted text-xs">{t('money.childHint')}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {(['save', 'spend', 'give'] as const).map((j) => (
                    <div key={j} className="rounded-2xl p-2 text-center" style={{ background: 'var(--bg-2)' }}>
                      <div className="text-xl">{{ save: '🏦', spend: '🛒', give: '🎁' }[j]}</div>
                      <div className="display font-extrabold">{jars[j].toFixed(2)}</div>
                      <div className="muted text-xs">{t(`money.jar.${j}`)} · {cur}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" className="text-sm" disabled={jars.spend < 1} onClick={() => moveBetweenJars(me.id, 'spend', 'save', Math.min(1, jars.spend))}>🛒→🏦 1</Button>
                  <Button variant="secondary" className="text-sm" disabled={jars.save < 1} onClick={() => moveBetweenJars(me.id, 'save', 'give', Math.min(1, jars.save))}>🏦→🎁 1</Button>
                </div>
                <p className="muted text-xs mt-2">{t('money.interestNote', { pct: family.settings.money.interestPctMonthly })}</p>
              </>
            );
          })()}
        </Card>
      )}

      <Card>
        <h2 className="font-bold mb-2">{t('me.stages')}</h2>
        {tasks.filter((x) => x.assignedChildIds.includes(me.id) && x.active).map((x) => (
          <div key={x.id} className="flex items-center gap-2 py-1 text-sm">
            <span>{x.emoji}</span>
            <span className="flex-1">{x.title}</span>
            <span className="chip">{t(`stage.${stages.find((s) => s.taskId === x.id)?.stage ?? 'learning'}`)}</span>
          </div>
        ))}
      </Card>

      {openIncidents.length > 0 && (
        <Card>
          <h2 className="font-bold">{t('repair.childTitle')}</h2>
          {openIncidents.map((i) => (
            <div key={i.id} className="py-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm">{i.description}</p>
              <p className="muted text-xs">{t(`incident.explain.${i.status}`)}</p>
              {i.responseCost && <p className="text-xs mt-1">{t('incident.responseCostChild', { privilege: i.responseCost.privilege, until: new Date(i.responseCost.until).toLocaleString() })}</p>}
              {i.repairPlan && <p className="text-sm mt-1">🔧 {i.repairPlan}</p>}
              {!i.appeal && (
                <Button variant="ghost" className="text-sm" onClick={() => appealIncident(me.id, i.id, t('appeal.childDefault'))}>
                  {t('appeal.incorrect')}
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      {agreement && (
        <Card>
          <h2 className="font-bold">{t('agreement.title')}</h2>
          <p className="text-sm mt-1">{agreement.intro}</p>
          <ul className="list-disc ml-5 text-sm mt-2">
            {agreement.rules.map((r) => (
              <li key={r.id}>{r.text}</li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            {myAssent ? <span className="chip">✓ {t('agreement.assented')}</span> : <Button onClick={() => assent(me.id, family.id)}>{t('agreement.assent')}</Button>}
            <Button variant="secondary" onClick={() => setChangeOpen(true)}>
              {t('agreement.requestChange')}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-bold mb-2">{t('me.settings')}</h2>
        <label className="label">{t('onboarding.theme')}</label>
        <Segmented value={c.theme} onChange={(theme: ThemeName) => set({ theme })} options={[{ value: 'sunny', label: t('theme.sunny') }, { value: 'space', label: t('theme.space') }, { value: 'forest', label: t('theme.forest') }, { value: 'ocean', label: t('theme.ocean') }]} />
        <label className="label mt-3">{t('onboarding.celebration')}</label>
        <Segmented value={c.celebration} onChange={(celebration: CelebrationStyle) => set({ celebration })} options={[{ value: 'quiet', label: t('celebration.quiet') }, { value: 'fun', label: t('celebration.fun') }, { value: 'big', label: t('celebration.big') }]} />
        <label className="label mt-3">{t('common.language')}</label>
        <Segmented value={me.locale} onChange={(locale: Locale) => { setLocale(locale); void updateMember(me.id, me.id, { locale }); }} options={[{ value: 'en', label: 'EN' }, { value: 'uk', label: 'UA' }, { value: 'es', label: 'ES' }]} />
        <div className="mt-2">
          <Toggle label={t('a11y.soundOff')} checked={c.soundOff} onChange={(soundOff) => set({ soundOff })} />
          <Toggle label={t('a11y.reducedMotion')} checked={c.reducedMotion} onChange={(reducedMotion) => set({ reducedMotion })} />
          <Toggle label={t('a11y.highContrast')} checked={c.highContrast} onChange={(highContrast) => set({ highContrast })} />
          <Toggle label={t('a11y.largeTargets')} checked={c.largeTargets} onChange={(largeTargets) => set({ largeTargets })} />
          <Toggle label={t('a11y.audio')} checked={c.audioSupport} onChange={(audioSupport) => set({ audioSupport })} />
        </div>
      </Card>

      <Modal open={changeOpen} onClose={() => setChangeOpen(false)} title={t('agreement.requestChange')}>
        <textarea className="input" rows={3} value={changeText} onChange={(e) => setChangeText(e.target.value)} />
        <Button className="w-full mt-3" disabled={!changeText.trim()} onClick={async () => { await requestChange(me.id, family.id, changeText); setChangeOpen(false); setChangeText(''); }}>
          {t('common.send')}
        </Button>
      </Modal>
      <Modal open={reflectOpen} onClose={() => setReflectOpen(false)} title={t('reflect.title')}>
        <Segmented value={reflect.difficulty ?? 'okay'} onChange={(difficulty) => setReflect({ ...reflect, difficulty })} options={[{ value: 'easy', label: t('reflect.easy') }, { value: 'okay', label: t('reflect.okay') }, { value: 'hard', label: t('reflect.hard') }]} />
        <label className="label mt-3">{t('reflect.whatHelped')}</label>
        <input className="input" value={reflect.whatHelped} onChange={(e) => setReflect({ ...reflect, whatHelped: e.target.value })} />
        <Button className="w-full mt-3" onClick={async () => { await db.reflections.add({ id: uid(), familyId: family.id, childId: me.id, refType: 'week', difficulty: reflect.difficulty ?? 'okay', whatHelped: reflect.whatHelped, createdAt: nowISO() }); setReflectOpen(false); }}>
          {t('common.send')}
        </Button>
      </Modal>
    </div>
  );
}
