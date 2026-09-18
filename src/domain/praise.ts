/**
 * Praise Coach (§1.4): three editable options — a specific observation,
 * strategy recognition, and a reflection question. Templates are i18n keys with
 * interpolation; the parent always edits or replaces them before sending.
 */
export interface PraiseInput {
  taskTitle: string;
  stepsCount: number;
  independentStart: boolean;
  stage: string;
  childName: string;
}

export interface PraiseOption {
  kind: 'observation' | 'strategy' | 'reflection';
  key: string;
  params: Record<string, string | number>;
}

export function praiseOptions(input: PraiseInput): PraiseOption[] {
  const params = { task: input.taskTitle, steps: input.stepsCount, name: input.childName };
  return [
    {
      kind: 'observation',
      key: input.independentStart ? 'praise.observation.independent' : 'praise.observation.steps',
      params,
    },
    { kind: 'strategy', key: input.stage === 'learning' ? 'praise.strategy.learning' : 'praise.strategy.routine', params },
    { kind: 'reflection', key: 'praise.reflection', params },
  ];
}

/** Trait labels and generic praise the coach avoids; used by tests and lint of parent text. */
export const AVOID_PATTERNS = [/so smart/i, /amazing job/i, /good (boy|girl)/i, /genius/i];

export function flagsGenericPraise(text: string): boolean {
  return AVOID_PATTERNS.some((p) => p.test(text));
}
