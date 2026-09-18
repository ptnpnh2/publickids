// Copies the MediaPipe vision WASM runtime from node_modules and downloads the
// lite pose model into public/pose/ so on-device rep counting works offline and
// same-origin (no third-party fetches at runtime). Runs on postinstall.
import { mkdirSync, copyFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), 'public', 'pose');
const wasmOut = join(out, 'wasm');
mkdirSync(wasmOut, { recursive: true });
const src = join(process.cwd(), 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  if (existsSync(join(src, f))) copyFileSync(join(src, f), join(wasmOut, f));
}
const model = join(out, 'pose_landmarker_lite.task');
if (!existsSync(model) || statSync(model).size < 1_000_000) {
  const url = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    writeFileSync(model, Buffer.from(await res.arrayBuffer()));
    console.log('pose model downloaded');
  } catch (e) {
    console.warn(`pose model not downloaded (${e.message}); rep counting will be unavailable until public/pose/pose_landmarker_lite.task exists`);
  }
}
