import { db, nowISO, uid } from '@/db/schema';
import type { Locale } from '@/domain/types';
import { addChild, createFamily } from './family';
import { createTask } from './tasks';
import { createGoal, createReward } from './rewards';
import { getOrCreateAgreement } from './agreement';
import { startStarter } from './starter';
import { REWARD_TEMPLATES, taskFromTemplate, templatesFor } from './templates';

export const DEMO = {
  email: 'demo@family.test',
  password: 'demo1234',
  superUserPassword: 'recovery-demo-1234',
  kids: [
    { name: 'Ana', emoji: '🦊', band: '7-9' as const, pin: '1234' },
    { name: 'Max', emoji: '🦖', band: '10-12' as const, pin: '5678' },
  ],
};

/** Seed a sample family so a visitor can try the app without setting anything up. Example data, not real people. */
export async function seedDemoFamily(locale: Locale, t: (k: string) => string): Promise<void> {
  const existing = await db.members.where('email').equals(DEMO.email).first();
  if (existing) return;
  const { family, parent } = await createFamily({ familyName: 'Demo family', locale, parentName: 'Sam', email: DEMO.email, password: DEMO.password, superUserPassword: DEMO.superUserPassword });
  for (const k of DEMO.kids) {
    const kid = await addChild({ familyId: family.id, name: k.name, emoji: k.emoji, band: k.band, pin: k.pin, locale, actorId: parent.id });
    for (const tpl of templatesFor(k.band).slice(0, 3)) {
      const task = taskFromTemplate(tpl, t, { id: uid(), familyId: family.id, createdBy: parent.id, createdAt: nowISO(), assignedChildIds: [kid.id] });
      const { id: _i, createdAt: _c, createdBy: _b, ...rest } = task;
      void _i; void _c; void _b;
      await createTask(parent.id, { ...rest, window: { start: '00:00', end: '23:59' } });
    }
    await createGoal(parent.id, { familyId: family.id, childId: kid.id, title: k.band === '7-9' ? 'Lego castle' : 'Skateboard', emoji: k.band === '7-9' ? '🏰' : '🛹', targetPoints: 40, primary: true, status: 'active' });
  }
  for (const r of REWARD_TEMPLATES.slice(0, 4)) {
    await createReward(parent.id, { familyId: family.id, title: t(`rewardTemplates.${r.key}`), emoji: r.emoji, section: r.section, cost: r.cost, availability: 'always', status: 'active' });
  }
  await getOrCreateAgreement(family.id, t('agreement.defaultIntro'), [t('agreement.defaultRule1'), t('agreement.defaultRule2'), t('agreement.defaultRule3')]);
  await startStarter(parent.id, family.id);
}
