/**
 * Freshness challenge for optional higher-value video proofs (§2.3): the app
 * reveals a short word + number at task start; the child says or shows it in
 * the recording. It proves *when*, never *who* — the parent still decides.
 */
const WORDS = ['apple', 'tiger', 'rocket', 'river', 'piano', 'castle', 'lemon', 'comet', 'dragon', 'pebble', 'maple', 'violet', 'cactus', 'lantern', 'walrus', 'meadow'];

export const NONCE_TTL_MIN = 10;

export function makeNonce(rand: () => number = Math.random, now: Date = new Date()): { code: string; issuedAt: string; expiresAt: string } {
  const word = WORDS[Math.floor(rand() * WORDS.length)];
  const n = 10 + Math.floor(rand() * 90);
  return { code: `${word} ${n}`, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + NONCE_TTL_MIN * 60_000).toISOString() };
}

export function nonceValid(nonce: { expiresAt: string } | undefined, now: Date = new Date()): boolean {
  return !!nonce && new Date(nonce.expiresAt).getTime() > now.getTime();
}

/** Video proofs are capped to keep AI cost and burden bounded (§6). */
export const MAX_VIDEO_SECONDS = 60;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function videoWithinCaps(seconds: number, bytes: number): boolean {
  return seconds > 0 && seconds <= MAX_VIDEO_SECONDS && bytes > 0 && bytes <= MAX_VIDEO_BYTES;
}
