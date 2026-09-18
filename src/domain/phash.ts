/**
 * Perceptual hash (DCT-based, 64-bit) for duplicate-proof detection.
 * Works on a 32x32 grayscale array so it can run in a worker, in tests, or
 * on-device before upload. Never treated as proof of anything on its own.
 */
const SIZE = 32;
const LOW = 8;

function dct1d(input: number[]): number[] {
  const n = input.length;
  const out = new Array<number>(n).fill(0);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += input[i] * Math.cos((Math.PI / n) * (i + 0.5) * k);
    out[k] = sum * (k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n));
  }
  return out;
}

export function phashFromGray(gray: number[] | Float32Array | Uint8ClampedArray): string {
  if (gray.length !== SIZE * SIZE) throw new Error(`expected ${SIZE * SIZE} samples`);
  const rows: number[][] = [];
  for (let y = 0; y < SIZE; y++) rows.push(dct1d(Array.from(gray.slice(y * SIZE, (y + 1) * SIZE))));
  const cols: number[][] = [];
  for (let x = 0; x < LOW; x++) cols.push(dct1d(rows.map((r) => r[x])));
  const vals: number[] = [];
  for (let y = 0; y < LOW; y++) for (let x = 0; x < LOW; x++) vals.push(cols[x][y]);
  const rest = vals.slice(1);
  const sorted = [...rest].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let bits = '';
  for (const v of vals) bits += v > median ? '1' : '0';
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export const DUPLICATE_THRESHOLD = 6;

export function looksDuplicate(a: string, b: string): boolean {
  return hamming(a, b) <= DUPLICATE_THRESHOLD;
}

/** Image statistics used as soft signals only. */
export function grayStats(gray: number[] | Float32Array | Uint8ClampedArray): { mean: number; std: number } {
  let s = 0;
  for (let i = 0; i < gray.length; i++) s += gray[i];
  const mean = s / gray.length;
  let v = 0;
  for (let i = 0; i < gray.length; i++) v += (gray[i] - mean) ** 2;
  return { mean, std: Math.sqrt(v / gray.length) };
}
