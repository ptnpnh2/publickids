import { analyzeSeries, metricFor, type ExerciseKind, type RepResult, type Sample } from '@/domain/reps';

/**
 * On-device pose analysis of a recorded clip (MediaPipe Pose Landmarker, lite).
 * The video never leaves the device for counting. Assets are served from
 * `<base>/pose/` (see scripts/fetch-pose-assets.mjs).
 */
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const MODEL_VERSION = 'pose_landmarker_lite/float16/1';
const FPS = 8;

type Landmarker = import('@mediapipe/tasks-vision').PoseLandmarker;
let landmarkerPromise: Promise<Landmarker> | null = null;

async function getLandmarker(): Promise<Landmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(`${BASE}pose/wasm`);
      const create = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `${BASE}pose/pose_landmarker_lite.task`, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      try {
        return await create('GPU');
      } catch {
        return await create('CPU'); // headless or old devices without WebGL
      }
    })().catch((e) => {
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

export interface ClipAnalysis extends RepResult {
  model: string;
}

export async function analyzeClip(blob: Blob, kind: ExerciseKind, onProgress?: (pct: number) => void): Promise<ClipAnalysis> {
  const landmarker = await getLandmarker();
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const url = URL.createObjectURL(blob);
  try {
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('video.decode'));
    });
    // Some browsers report Infinity until the end is sought once.
    if (!Number.isFinite(video.duration)) {
      video.currentTime = 1e9;
      await new Promise((r) => (video.onseeked = () => r(null)));
    }
    const duration = Math.min(video.duration || 0, 60);
    const total = Math.max(1, Math.floor(duration * FPS));
    const samples: Sample[] = [];
    for (let i = 0; i <= total; i++) {
      const t = Math.min(duration, i / FPS);
      video.currentTime = t;
      await new Promise((r) => (video.onseeked = () => r(null)));
      const res = landmarker.detectForVideo(video, Math.round(t * 1000) + i); // strictly increasing timestamps
      const lm = res.landmarks?.[0];
      if (lm) {
        const m = metricFor(kind, lm as { x: number; y: number; z?: number; visibility?: number }[]);
        if (m) samples.push({ t, value: m.value, quality: m.quality });
      }
      onProgress?.(Math.round((i / total) * 100));
    }
    return { ...analyzeSeries(kind, samples, total + 1), model: MODEL_VERSION };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}

// Exposed for diagnostics (the smoke test calls it); harmless in production.
if (typeof window !== 'undefined') (window as unknown as { __analyzeClip?: typeof analyzeClip }).__analyzeClip = analyzeClip;
