// Supabase Edge Function: provider-agnostic proof pre-screen.
// verifyProof(type, media, taskRules) → { recommendation, confidence, explanation, signals, model, version, repsCounted? }
//
// Rules (§2.3): the model only recommends "looks_ok" or "needs_look". It never
// rejects, accuses, applies a consequence, or labels dishonesty. Ambiguity → a
// human. Video is only ever a short clip (≤60 s, ≤20 MB inline) and is used for
// objective actions (repetition counting, nonce presence); never identity.
// Keys stay server-side: set GEMINI_API_KEY (video + photo) and optionally
// ANTHROPIC_API_KEY (photo fallback) and VERIFY_PROVIDER=gemini|anthropic.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface AIResult {
  recommendation: 'looks_ok' | 'needs_look';
  confidence: number;
  explanation: string;
  signals: string[];
  model: string;
  version: string;
  at: string;
  repsCounted?: number;
}

const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // Gemini inline limit; longer clips are refused, not uploaded elsewhere
const VERSION = '2026-09.2';

const SYSTEM_PHOTO = `You help a parent pre-screen a child's chore proof. Answer with JSON only:
{"recommendation":"looks_ok"|"needs_look","confidence":0..1,"explanation":"one kind, neutral sentence for a parent","signals":["..."]}
Rules: never accuse, never mention lying or cheating, never judge the child. If unsure, say needs_look with a short reason.
Only comment on whether the described task outcome appears in the media. Ignore faces and people; do not describe them.`;

const SYSTEM_VIDEO = `You help a parent pre-screen a child's short exercise video. Answer with JSON only:
{"recommendation":"looks_ok"|"needs_look","confidence":0..1,"repsCounted":integer,"nonceSeen":true|false|null,"explanation":"one kind, neutral sentence for a parent","signals":["..."]}
Count full repetitions of the named exercise (for plank, count seconds held). If a challenge code is given, report whether it is clearly said or shown (nonceSeen); null if none was given.
Rules: never accuse, never mention lying or cheating, never judge the child, never identify or describe who is in the video.
If the view is unclear, occluded, or you are unsure of the count, lower confidence and say needs_look with a short reason.`;

function abstain(reason: string): AIResult {
  return { recommendation: 'needs_look', confidence: 0.3, explanation: reason, signals: ['abstain'], model: 'none', version: VERSION, at: new Date().toISOString() };
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

async function callGemini(system: string, mime: string, b64: string, prompt: string): Promise<{ text: string; model: string }> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('no gemini key');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const j = await res.json();
  return { text: j.candidates?.[0]?.content?.parts?.[0]?.text ?? '', model };
}

async function callAnthropic(mime: string, b64: string, prompt: string): Promise<{ text: string; model: string }> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('no anthropic key');
  const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system: SYSTEM_PHOTO,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }, { type: 'text', text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const j = await res.json();
  return { text: j.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '', model };
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```json\s*|```$/g, '').trim();
  return JSON.parse(cleaned);
}

function finish(parsed: Record<string, unknown>, model: string, extraSignals: string[] = []): AIResult {
  const rec = parsed.recommendation === 'looks_ok' ? 'looks_ok' : 'needs_look';
  const signals = [...(Array.isArray(parsed.signals) ? parsed.signals.map(String).slice(0, 5) : []), ...extraSignals];
  const out: AIResult = {
    recommendation: signals.length ? 'needs_look' : rec,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    explanation: String(parsed.explanation ?? '').slice(0, 300),
    signals,
    model,
    version: VERSION,
    at: new Date().toISOString(),
  };
  if (Number.isInteger(parsed.repsCounted)) out.repsCounted = Number(parsed.repsCounted);
  return out;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  try {
    const form = await req.formData();
    const type = String(form.get('type') ?? 'photo');
    const task = JSON.parse(String(form.get('task') ?? '{}')) as { title: string; completionDefinition: string; microSteps: string[] };
    const media = form.get('media');
    if (!(media instanceof File)) return Response.json(abstain('ai.explain.missing_media'));

    if (type === 'video') {
      if (media.size > MAX_VIDEO_BYTES) return Response.json(abstain('ai.explain.too_large'));
      const exercise = form.get('exercise') ? (JSON.parse(String(form.get('exercise'))) as { kind: string; reps: number }) : null;
      const nonce = form.get('nonce') ? String(form.get('nonce')) : null;
      const b64 = toBase64(await media.arrayBuffer());
      const prompt = [
        exercise ? `Exercise: ${exercise.kind}, target ${exercise.reps}.` : `Task: ${task.title}. Done when: ${task.completionDefinition}.`,
        nonce ? `Challenge code the child should say or show: "${nonce}".` : 'No challenge code.',
        'Count and answer as JSON.',
      ].join(' ');
      try {
        const out = await callGemini(SYSTEM_VIDEO, media.type || 'video/mp4', b64, prompt);
        const parsed = parseJson(out.text);
        const extra: string[] = [];
        if (nonce && parsed.nonceSeen === false) extra.push('nonce_not_seen');
        return Response.json(finish(parsed, out.model, extra));
      } catch {
        return Response.json(abstain('ai.explain.unavailable'));
      }
    }

    if (type !== 'photo') return Response.json(abstain('ai.explain.typeNotSupported'));
    if (media.size > MAX_PHOTO_BYTES) return Response.json(abstain('ai.explain.too_large'));
    const b64 = toBase64(await media.arrayBuffer());
    const prompt = `Task: ${task.title}. Done when: ${task.completionDefinition}. Steps: ${(task.microSteps ?? []).join('; ')}. Does the photo show this outcome?`;
    const provider = Deno.env.get('VERIFY_PROVIDER') ?? 'gemini';
    let out: { text: string; model: string };
    try {
      out = provider === 'anthropic' ? await callAnthropic(media.type, b64, prompt) : await callGemini(SYSTEM_PHOTO, media.type, b64, prompt);
    } catch {
      try {
        out = provider === 'anthropic' ? await callGemini(SYSTEM_PHOTO, media.type, b64, prompt) : await callAnthropic(media.type, b64, prompt);
      } catch {
        return Response.json(abstain('ai.explain.unavailable'));
      }
    }
    return Response.json(finish(parseJson(out.text), out.model));
  } catch (e) {
    return Response.json(abstain('ai.explain.unavailable'), { status: 200, headers: { 'x-error': String((e as Error).message) } });
  }
});
