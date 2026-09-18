import type { AIResult } from '@/domain/types';
import type { VerifyInput, Verifier } from '@/domain/verification';
import { looksDuplicate } from '@/domain/phash';

/**
 * Provider-agnostic gateway: verifyProof(type, media, taskRules).
 * Cascade: cheap local checks first (duplicate hash, blank image); a remote
 * model only when configured. Every result is a recommendation with
 * confidence and a written explanation; doubts route to a human. The gateway
 * never rejects, accuses, applies a consequence or labels dishonesty.
 */
export const heuristicVerifier: Verifier = {
  name: 'local-heuristic',
  async verify(input: VerifyInput): Promise<AIResult> {
    const signals: string[] = [];
    if (input.media?.hash && input.priorHashes.some((h) => looksDuplicate(h, input.media!.hash!))) signals.push('duplicate_media');
    if (input.type === 'photo' && input.media && input.media.blob.size < 3_000) signals.push('very_small_image');
    if (!input.media && (input.type === 'photo' || input.type === 'audio' || input.type === 'video')) signals.push('missing_media');
    const needsLook = signals.length > 0;
    return {
      recommendation: needsLook ? 'needs_look' : 'looks_ok',
      confidence: needsLook ? 0.6 : 0.5,
      explanation: needsLook ? `ai.explain.${signals[0]}` : 'ai.explain.localOnly',
      signals,
      model: 'local-heuristic',
      version: '1',
      at: new Date().toISOString(),
    };
  },
};

/** Remote verifier through a Supabase Edge Function (server-side keys, cascade routing, abstention). */
export function remoteVerifier(baseUrl: string, anonKey: string): Verifier {
  return {
    name: 'edge-verify-proof',
    async verify(input) {
      const form = new FormData();
      form.set('type', input.type);
      form.set('task', JSON.stringify(input.task));
      form.set('locale', input.locale);
      form.set('priorHashes', JSON.stringify(input.priorHashes));
      if (input.media) form.set('media', input.media.blob, `proof.${input.media.mime.split('/')[1] ?? 'bin'}`);
      const res = await fetch(`${baseUrl}/functions/v1/verify-proof`, { method: 'POST', headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey }, body: form });
      if (!res.ok) throw new Error(`verify-proof ${res.status}`);
      return (await res.json()) as AIResult;
    },
  };
}

let active: Verifier = heuristicVerifier;

export function configureVerifier(v: Verifier): void {
  active = v;
}

export async function verifyProof(input: VerifyInput): Promise<AIResult> {
  // Always run the cheap local checks; escalate to the remote model only when they are clean.
  const local = await heuristicVerifier.verify(input);
  if (local.recommendation === 'needs_look' || active === heuristicVerifier) return local;
  try {
    const remote = await active.verify(input);
    return { ...remote, signals: [...local.signals, ...remote.signals] };
  } catch {
    // Abstain: a model outage is never a rejection; the parent simply reviews.
    return { ...local, explanation: 'ai.explain.unavailable', confidence: 0.3 };
  }
}
