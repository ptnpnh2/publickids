import type { FamilySettings, Preset } from './types';

export const BASE_SETTINGS: FamilySettings = {
  preset: 'balanced',
  responseCostEnabled: false,
  coolingOffMinutes: 20,
  activeTrainingCap: 3,
  autoApproveAuditPct: 10,
  autoApproveMinHistory: 10,
  nannyApprovalLimit: 3,
  quietHours: { start: '20:30', end: '07:00' },
  schoolMode: false,
  holidayMode: false,
  remindersPerTask: 1,
  deleteRawProofOnResolve: true,
  aiEnabled: true,
  rawProofRetentionDays: 7,
};

export function applyPreset(preset: Preset, current: FamilySettings): FamilySettings {
  switch (preset) {
    case 'simple':
      return { ...current, preset, activeTrainingCap: 2, remindersPerTask: 1, aiEnabled: false, responseCostEnabled: false };
    case 'balanced':
      return { ...BASE_SETTINGS, ...current, preset: 'balanced', activeTrainingCap: 3, aiEnabled: true };
    case 'independent':
      return { ...current, preset, activeTrainingCap: 3, remindersPerTask: 0, aiEnabled: true };
    case 'custom':
      return { ...current, preset };
  }
}

/** Protections that no preset or Supervisor can switch off (§2.7-11). */
export const NON_EDITABLE_PROTECTIONS = [
  'protect.basicNeeds',
  'protect.privacy',
  'protect.historicalEarnings',
  'protect.noShame',
  'protect.noAiConsequences',
  'protect.noNegativeBalance',
] as const;
