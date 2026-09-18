import type { AgeBand, Task, TaskCategory, ProofMethod, BasePoints, Reward } from '@/domain/types';

export interface TaskTemplate {
  key: string;
  emoji: string;
  category: TaskCategory;
  basePoints: BasePoints;
  minutes: number;
  proof: ProofMethod;
  window: { start: string; end: string };
  steps: number; // number of micro-step i18n keys under templates.<key>.step<n>
  bands: AgeBand[];
}

/** Age-informed, culturally adaptable starter templates (§2.2). Titles, steps
 *  and completion definitions live in i18n under `templates.<key>`. */
export const TASK_TEMPLATES: TaskTemplate[] = [
  { key: 'teeth', emoji: '🪥', category: 'selfcare', basePoints: 1, minutes: 3, proof: 'self_check', window: { start: '07:00', end: '09:00' }, steps: 3, bands: ['4-6', '7-9'] },
  { key: 'bed', emoji: '🛏️', category: 'selfcare', basePoints: 1, minutes: 3, proof: 'photo', window: { start: '07:00', end: '10:00' }, steps: 3, bands: ['4-6', '7-9', '10-12', 'teen'] },
  { key: 'toys', emoji: '🧸', category: 'contribution', basePoints: 2, minutes: 10, proof: 'photo', window: { start: '17:00', end: '19:30' }, steps: 3, bands: ['4-6', '7-9'] },
  { key: 'clothes', emoji: '👕', category: 'contribution', basePoints: 1, minutes: 5, proof: 'self_check', window: { start: '18:00', end: '20:30' }, steps: 3, bands: ['4-6', '7-9', '10-12', 'teen'] },
  { key: 'table', emoji: '🍽️', category: 'contribution', basePoints: 2, minutes: 5, proof: 'parent_observed', window: { start: '17:30', end: '19:30' }, steps: 3, bands: ['7-9', '10-12', 'teen'] },
  { key: 'homework', emoji: '📚', category: 'routine', basePoints: 3, minutes: 30, proof: 'self_check', window: { start: '15:00', end: '19:00' }, steps: 4, bands: ['7-9', '10-12', 'teen'] },
  { key: 'reading', emoji: '📖', category: 'learning', basePoints: 2, minutes: 15, proof: 'self_check', window: { start: '18:00', end: '20:30' }, steps: 3, bands: ['7-9', '10-12', 'teen'] },
  { key: 'room', emoji: '🧹', category: 'contribution', basePoints: 3, minutes: 20, proof: 'photo', window: { start: '10:00', end: '19:00' }, steps: 5, bands: ['10-12', 'teen'] },
  { key: 'pushups', emoji: '💪', category: 'learning', basePoints: 2, minutes: 5, proof: 'self_check', window: { start: '07:00', end: '20:00' }, steps: 3, bands: ['10-12', 'teen'] },
  { key: 'dishes', emoji: '🧽', category: 'contribution', basePoints: 3, minutes: 15, proof: 'photo', window: { start: '18:30', end: '21:00' }, steps: 4, bands: ['10-12', 'teen'] },
  { key: 'car', emoji: '🚗', category: 'extra_job', basePoints: 5, minutes: 45, proof: 'photo', window: { start: '10:00', end: '18:00' }, steps: 4, bands: ['10-12', 'teen'] },
  { key: 'garden', emoji: '🌱', category: 'extra_job', basePoints: 5, minutes: 40, proof: 'photo', window: { start: '10:00', end: '18:00' }, steps: 3, bands: ['10-12', 'teen'] },
];

export function templatesFor(band: AgeBand): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => t.bands.includes(band));
}

export function taskFromTemplate(
  tpl: TaskTemplate,
  t: (k: string) => string,
  base: Pick<Task, 'id' | 'familyId' | 'createdBy' | 'createdAt' | 'assignedChildIds'>,
): Task {
  const steps = Array.from({ length: tpl.steps }, (_, i) => t(`templates.${tpl.key}.step${i + 1}`));
  const currency = tpl.category === 'selfcare' || tpl.category === 'contribution' ? 'points' : 'points';
  return {
    ...base,
    title: t(`templates.${tpl.key}.title`),
    emoji: tpl.emoji,
    category: tpl.category,
    currency,
    basePoints: tpl.basePoints,
    fairness: `fairness.${tpl.basePoints}`,
    microSteps: steps,
    estimatedMinutes: tpl.minutes,
    completionDefinition: t(`templates.${tpl.key}.done`),
    window: tpl.window,
    schedule: tpl.category === 'extra_job' ? { type: 'weekly', days: [6] } : { type: 'daily' },
    proofMethod: tpl.proof,
    verificationMode: 'ai_assist',
    approverTier: tpl.category === 'extra_job' ? 'parent' : tpl.basePoints <= 2 ? 'auto' : 'caregiver',
    active: true,
  };
}

export interface RewardTemplate {
  key: string;
  emoji: string;
  section: Reward['section'];
  cost: number;
}

export const REWARD_TEMPLATES: RewardTemplate[] = [
  { key: 'pickDinner', emoji: '🍕', section: 'quick', cost: 6 },
  { key: 'extraStory', emoji: '📚', section: 'quick', cost: 4 },
  { key: 'screenTime', emoji: '🎮', section: 'quick', cost: 8 },
  { key: 'stayUp', emoji: '🌙', section: 'quick', cost: 10 },
  { key: 'movieNight', emoji: '🎬', section: 'family', cost: 15 },
  { key: 'parkTrip', emoji: '🛝', section: 'family', cost: 20 },
  { key: 'lego', emoji: '🧱', section: 'save_for', cost: 60 },
  { key: 'book', emoji: '📕', section: 'save_for', cost: 30 },
];

/** Avatar cosmetics unlock at approved-count milestones; they never decay. */
export const COSMETICS: { id: string; emoji: string; unlockAt: number }[] = [
  { id: 'hat', emoji: '🎩', unlockAt: 3 },
  { id: 'glasses', emoji: '🕶️', unlockAt: 7 },
  { id: 'cape', emoji: '🦸', unlockAt: 12 },
  { id: 'crown', emoji: '👑', unlockAt: 20 },
  { id: 'rocket', emoji: '🚀', unlockAt: 30 },
  { id: 'pet', emoji: '🐶', unlockAt: 45 },
  { id: 'castle', emoji: '🏰', unlockAt: 60 },
  { id: 'rainbow', emoji: '🌈', unlockAt: 80 },
];

export const AVATAR_CHOICES = ['🦊', '🐼', '🦄', '🐯', '🐸', '🦉', '🐙', '🦖', '🐰', '🐨'];
