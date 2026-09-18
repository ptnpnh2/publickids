import type { ReflectionKind } from './types';

export const REFLECTION_KINDS: ReflectionKind[] = ['retell', 'drawing', 'passage', 'note', 'quiz', 'conversation', 'selflog'];

/** Reflection is occasional, never after every session (§2.3 reading). */
export function reflectionDue(sessionsSoFar: number, reflectEvery: number): boolean {
  if (reflectEvery <= 0) return false;
  return sessionsSoFar > 0 && sessionsSoFar % reflectEvery === 0;
}

/** Soft plausibility signal for a passage/note (adult signal only, never a verdict). */
export function passagePlausible(text: string, bookText?: string): 'match' | 'unknown' | 'no_match' {
  const t = text.trim().toLowerCase();
  if (!bookText || t.length < 12) return 'unknown';
  const hay = bookText.toLowerCase().replace(/\s+/g, ' ');
  const probe = t.replace(/\s+/g, ' ').slice(0, 60);
  return hay.includes(probe) ? 'match' : 'no_match';
}

export function quizScore(answers: string[], quiz: { q: string; a: string }[]): number {
  if (!quiz.length) return 0;
  const ok = quiz.filter((q, i) => (answers[i] ?? '').trim().toLowerCase().includes(q.a.trim().toLowerCase())).length;
  return Math.round((ok / quiz.length) * 100);
}
