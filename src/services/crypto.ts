/** Password / PIN hashing with WebCrypto (PBKDF2-SHA256). Local mode only; a
 *  synced backend uses Supabase Auth for adults instead. */
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashSecret(secret: string, salt?: string): Promise<string> {
  const s = salt ?? toHex(crypto.getRandomValues(new Uint8Array(8)).buffer);
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(s), iterations: 50_000, hash: 'SHA-256' }, key, 256);
  return `${s}$${toHex(bits)}`;
}

export async function verifySecret(secret: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const [salt] = stored.split('$');
  return (await hashSecret(secret, salt)) === stored;
}

export function generateRecoveryCodes(n = 8): string[] {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: n }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}
