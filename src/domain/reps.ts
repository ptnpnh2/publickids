/**
 * On-device repetition counting from pose landmarks (V2 exercise proofs).
 * Pure math over per-frame samples so it is testable without a model. The
 * result is decision support for the parent, never a verdict (§2.3).
 */
export type ExerciseKind = 'pushups' | 'squats' | 'plank' | 'jumps' | 'other';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** MediaPipe Pose landmark indices. */
export const LM = { lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 } as const;

export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

export interface Sample {
  t: number; // seconds
  value: number; // metric (angle in degrees, or normalised height 0..1)
  quality: number; // 0..1 landmark visibility
}

const vis = (l: Landmark | undefined) => (l ? l.visibility ?? 1 : 0);

/** Per-frame metric for the exercise, or null when the needed joints are not visible. */
export function metricFor(kind: ExerciseKind, lm: Landmark[]): { value: number; quality: number } | null {
  const g = (i: number) => lm[i];
  const mean = (a: number, b: number) => (a + b) / 2;
  switch (kind) {
    case 'pushups': {
      const pts = [LM.lShoulder, LM.lElbow, LM.lWrist, LM.rShoulder, LM.rElbow, LM.rWrist].map(g);
      if (pts.some((p) => !p)) return null;
      const quality = Math.min(...pts.map(vis));
      const value = mean(angleDeg(g(LM.lShoulder), g(LM.lElbow), g(LM.lWrist)), angleDeg(g(LM.rShoulder), g(LM.rElbow), g(LM.rWrist)));
      return { value, quality };
    }
    case 'squats': {
      const pts = [LM.lHip, LM.lKnee, LM.lAnkle, LM.rHip, LM.rKnee, LM.rAnkle].map(g);
      if (pts.some((p) => !p)) return null;
      const quality = Math.min(...pts.map(vis));
      const value = mean(angleDeg(g(LM.lHip), g(LM.lKnee), g(LM.lAnkle)), angleDeg(g(LM.rHip), g(LM.rKnee), g(LM.rAnkle)));
      return { value, quality };
    }
    case 'plank': {
      const pts = [LM.lShoulder, LM.lHip, LM.lAnkle, LM.rShoulder, LM.rHip, LM.rAnkle].map(g);
      if (pts.some((p) => !p)) return null;
      const quality = Math.min(...pts.map(vis));
      const value = mean(angleDeg(g(LM.lShoulder), g(LM.lHip), g(LM.lAnkle)), angleDeg(g(LM.rShoulder), g(LM.rHip), g(LM.rAnkle)));
      return { value, quality };
    }
    case 'jumps':
    case 'other': {
      const pts = [LM.lHip, LM.rHip].map(g);
      if (pts.some((p) => !p)) return null;
      // Height: 1 - y so "up" is larger, like the angle metrics.
      return { value: 1 - mean(g(LM.lHip).y, g(LM.rHip).y), quality: Math.min(...pts.map(vis)) };
    }
  }
}

export function smooth(series: number[], window = 3): number[] {
  const half = Math.floor(window / 2);
  return series.map((_, i) => {
    const s = series.slice(Math.max(0, i - half), Math.min(series.length, i + half + 1));
    return s.reduce((a, b) => a + b, 0) / s.length;
  });
}

/** Hysteresis cycle counter: a rep = go below `low` then back above `high`. */
export function countCycles(series: number[], low: number, high: number): { count: number; cycles: [number, number][] } {
  let state: 'up' | 'down' = 'up';
  let start = 0;
  const cycles: [number, number][] = [];
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (state === 'up' && v < low) {
      state = 'down';
      start = i;
    } else if (state === 'down' && v > high) {
      state = 'up';
      cycles.push([start, i]);
    }
  }
  return { count: cycles.length, cycles };
}

export interface RepResult {
  count: number; // reps, or seconds held for plank
  confidence: number; // 0..1
  trackedPct: number; // share of frames with usable landmarks
  seconds: number;
  unit: 'reps' | 'seconds';
}

const THRESHOLDS: Record<Exclude<ExerciseKind, 'jumps' | 'other' | 'plank'>, { low: number; high: number }> = {
  pushups: { low: 105, high: 150 },
  squats: { low: 115, high: 160 },
};

/** Turn a sampled metric series into a count with an honest confidence. */
export function analyzeSeries(kind: ExerciseKind, samples: Sample[], totalFrames: number): RepResult {
  const seconds = samples.length ? samples[samples.length - 1].t - samples[0].t : 0;
  const usable = samples.filter((s) => s.quality >= 0.5);
  const trackedPct = totalFrames > 0 ? Math.round((usable.length / totalFrames) * 100) : 0;
  if (usable.length < 4) return { count: 0, confidence: 0, trackedPct, seconds, unit: kind === 'plank' ? 'seconds' : 'reps' };
  const values = smooth(usable.map((s) => s.value));

  if (kind === 'plank') {
    let held = 0;
    for (let i = 1; i < usable.length; i++) if (values[i] > 155) held += usable[i].t - usable[i - 1].t;
    const conf = Math.min(1, trackedPct / 100) * (held > 0 ? 1 : 0.3);
    return { count: Math.round(held), confidence: round2(conf), trackedPct, seconds, unit: 'seconds' };
  }

  let low: number;
  let high: number;
  if (kind === 'jumps' || kind === 'other') {
    const sorted = [...values].sort((a, b) => a - b);
    const p20 = sorted[Math.floor(sorted.length * 0.2)];
    const p80 = sorted[Math.floor(sorted.length * 0.8)];
    const span = p80 - p20;
    if (span < 0.03) return { count: 0, confidence: 0.2, trackedPct, seconds, unit: 'reps' };
    low = p20 + span * 0.3;
    high = p20 + span * 0.7;
  } else {
    ({ low, high } = THRESHOLDS[kind]);
  }
  const { count, cycles } = countCycles(values, low, high);
  // Regularity: coefficient of variation of cycle lengths; irregular cycles lower confidence.
  const lengths = cycles.map(([a, b]) => usable[b].t - usable[a].t);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / Math.max(lengths.length, 1);
  const cv = lengths.length > 1 ? Math.sqrt(lengths.reduce((a, l) => a + (l - meanLen) ** 2, 0) / lengths.length) / meanLen : 0.5;
  const regularity = Math.max(0, 1 - cv);
  const confidence = count === 0 ? 0.2 : round2(Math.min(1, (trackedPct / 100) * (0.5 + 0.5 * regularity)));
  return { count, confidence, trackedPct, seconds, unit: 'reps' };
}

/** Claimed vs counted disagreement worth a parent's look (never a rejection). */
export function repsMismatch(claimed: number | undefined, counted: Pick<RepResult, 'count' | 'confidence'> | undefined): boolean {
  if (claimed === undefined || !counted || counted.confidence < 0.5) return false;
  return Math.abs(claimed - counted.count) > Math.max(2, claimed * 0.2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
