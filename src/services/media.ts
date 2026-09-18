import { grayStats, phashFromGray } from '@/domain/phash';

/** On-device resize + grayscale + pHash before anything leaves the device. */
export async function prepareImage(file: Blob, maxSide = 1280): Promise<{ blob: Blob; mime: string; hash: string; gray: number[]; stats: { mean: number; std: number } }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.82));

  const small = document.createElement('canvas');
  small.width = 32;
  small.height = 32;
  const sctx = small.getContext('2d')!;
  sctx.drawImage(bitmap, 0, 0, 32, 32);
  const data = sctx.getImageData(0, 0, 32, 32).data;
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  bitmap.close();
  return { blob, mime: 'image/jpeg', hash: phashFromGray(gray), gray, stats: grayStats(gray) };
}

export async function recordAudio(maxSeconds = 60): Promise<{ stop: () => Promise<Blob>; stream: MediaStream }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  const timer = setTimeout(() => rec.state === 'recording' && rec.stop(), maxSeconds * 1000);
  const stop = () =>
    new Promise<Blob>((resolve) => {
      clearTimeout(timer);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      };
      if (rec.state === 'recording') rec.stop();
      else rec.onstop?.(new Event('stop'));
    });
  return { stop, stream };
}
