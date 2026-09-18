import { describe, expect, it } from 'vitest';
import { analyzeSeries, angleDeg, countCycles, metricFor, repsMismatch, type Landmark, type Sample } from './reps';

const lm = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });

function pose(elbowAngleDeg: number): Landmark[] {
  // Build 33 landmarks; arms shoulder→elbow→wrist with the requested angle, legs straight.
  const arr: Landmark[] = Array.from({ length: 33 }, () => lm(0.5, 0.5));
  const rad = (elbowAngleDeg * Math.PI) / 180;
  for (const side of [0, 1]) {
    const sx = 0.4 + side * 0.2;
    arr[11 + side] = lm(sx, 0.4);
    arr[13 + side] = lm(sx, 0.5);
    arr[15 + side] = lm(sx + Math.sin(rad) * 0.1, 0.5 - Math.cos(rad) * 0.1 + 0.2 * (1 - Math.cos(rad)));
    arr[23 + side] = lm(sx, 0.7);
    arr[25 + side] = lm(sx, 0.85);
    arr[27 + side] = lm(sx, 1.0);
  }
  return arr;
}

describe('reps: geometry', () => {
  it('computes joint angles', () => {
    expect(Math.round(angleDeg(lm(0, 0), lm(0, 1), lm(0, 2)))).toBe(180);
    expect(Math.round(angleDeg(lm(0, 0), lm(0, 1), lm(1, 1)))).toBe(90);
  });
  it('returns null when joints are missing and low quality when barely visible', () => {
    expect(metricFor('pushups', [])).toBeNull();
    const p = pose(170);
    p[13].visibility = 0.1;
    expect(metricFor('pushups', p)!.quality).toBeCloseTo(0.1);
  });
});

describe('reps: cycle counting', () => {
  it('counts full down-up cycles with hysteresis and ignores jitter', () => {
    const series = [170, 160, 120, 90, 80, 100, 140, 165, 170, 168, 150, 95, 85, 120, 160, 172, 149, 152, 171];
    expect(countCycles(series, 105, 150).count).toBe(2);
  });
  it('produces a confident count for a regular push-up series', () => {
    const samples: Sample[] = [];
    let t = 0;
    for (let rep = 0; rep < 5; rep++) {
      for (const v of [170, 150, 120, 95, 85, 95, 125, 155, 170]) samples.push({ t: (t += 0.125), value: v, quality: 0.9 });
    }
    const r = analyzeSeries('pushups', samples, samples.length);
    expect(r.count).toBe(5);
    expect(r.unit).toBe('reps');
    expect(r.confidence).toBeGreaterThan(0.7);
  });
  it('is unconfident when tracking is poor', () => {
    const samples: Sample[] = Array.from({ length: 20 }, (_, i) => ({ t: i * 0.125, value: 170, quality: 0.2 }));
    const r = analyzeSeries('pushups', samples, 80);
    expect(r.count).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.trackedPct).toBe(0);
  });
  it('measures plank hold in seconds and counts jumps by hip height', () => {
    const plank: Sample[] = Array.from({ length: 41 }, (_, i) => ({ t: i * 0.25, value: 175, quality: 0.9 }));
    expect(analyzeSeries('plank', plank, 41)).toMatchObject({ count: 10, unit: 'seconds' });
    const jumps: Sample[] = [];
    let t = 0;
    for (let rep = 0; rep < 4; rep++) for (const v of [0.4, 0.42, 0.5, 0.58, 0.6, 0.55, 0.45, 0.4]) jumps.push({ t: (t += 0.125), value: v, quality: 0.9 });
    expect(analyzeSeries('jumps', jumps, jumps.length).count).toBe(4);
  });
});

describe('reps: mismatch signal', () => {
  const counted = { count: 10, confidence: 0.8, trackedPct: 90, seconds: 20, unit: 'reps' as const };
  it('flags large disagreements only when the count is confident', () => {
    expect(repsMismatch(10, counted)).toBe(false);
    expect(repsMismatch(12, counted)).toBe(false);
    expect(repsMismatch(20, counted)).toBe(true);
    expect(repsMismatch(20, { ...counted, confidence: 0.3 })).toBe(false);
    expect(repsMismatch(undefined, counted)).toBe(false);
  });
});
