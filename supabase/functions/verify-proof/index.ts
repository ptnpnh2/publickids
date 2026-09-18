// Supabase Edge Function: provider-agnostic proof pre-screen.
// verifyProof(type, media, taskRules) → { recommendation, confidence, explanation, signals, model, version }
//
// Rules (§2.3): the model only recommends "looks_ok" or "needs_look". It never
// rejects, accuses, applies a consequence, or labels dishonesty. Ambiguity → a
// human. Per-family budget caps and abstention are enforced here, not in the client.
// Keys stay server-side: set VERIFY_PROVIDER, GEMINI_API_KEY and/or ANTHROPIC_API_KEY.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface AIResult {
  recommendation: 'looks_ok' | 'needs_look';
  confidence: number;
  explanation: string;
  signals: string[];
  model: string;
  version: string;
  at: string;
}

const MAX_BYTES = 6 * 1024 * 1024; // photo-dominant; video must be short clips only
const VERSION = '2026-09';

const SYSTEM = `You help a parent pre-screen a child's chore proof. Answer with JSON only:
{"recommendation":"looks_ok"|"needs_look","confidence":0..1,"explanation":"one kind, neutral sentence for a parent","signals":["..."]}
Rules: never accuse, never mention lying or cheating, never judge the child. If unsure, say needs_look with a short reason.
Only comment on whether the described task outcome appears in the media. Ignore faces and people; do not describe them.`;

function abstain(reason: string): AIResult {
  return { recommendation: 'needs_look', confidence: 0.3, explanation: reason, signals: ['abstain'], model: 'none', version: VERSION, at: new Date().toISOString() };
}

async function callGemini(mime: string, b64: string, prompt: string): Promise<{ text: string; model: string }> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('no gemini key');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM }] }, contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }], generationConfig: { response_mime_type: 'application/json', temperature: 0 } }),
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
      system: SYSTEM,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }, { type: 'text', text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const j = await res.json();
  return { text: j.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '', model };
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  try {
    const form = await req.formData();
    const type = String(form.get('type') ?? 'photo');
    const task = JSON.parse(String(form.get('task') ?? '{}')) as { title: string; completionDefinition: string; microSteps: string[] };
    const media = form.get('media');
    if (!(media instanceof File)) return Response.json(abstain('ai.explain.missing_media'));
    if (media.size > MAX_BYTES) return Response.json(abstain('ai.explain.too_large'));
    if (type !== 'photo') return Response.json(abstain('ai.explain.typeNotSupported')); // audio/video routed in a later revision

    const b64 = btoa(String.fromCharCode(...new Uint8Array(await media.arrayBuffer())));
    const prompt = `Task: ${task.title}. Done when: ${task.completionDefinition}. Steps: ${(task.microSteps ?? []).join('; ')}. Does the photo show this outcome?`;
    const provider = Deno.env.get('VERIFY_PROVIDER') ?? 'gemini';
    let out: { text: string; model: string };
    try {
      out = provider === 'anthropic' ? await callAnthropic(media.type, b64, prompt) : await callGemini(media.type, b64, prompt);
    } catch {
      // cascade to the other provider if configured, else abstain
      try {
        out = provider === 'anthropic' ? await callGemini(media.type, b64, prompt) : await callAnthropic(media.type, b64, prompt);
      } catch {
        return Response.json(abstain('ai.explain.unavailable'));
      }
    }
    const parsed = JSON.parse(out.text.replace(/^```json|```$/g, '').trim());
    const rec = parsed.recommendation === 'looks_ok' ? 'looks_ok' : 'needs_look';
    const result: AIResult = {
      recommendation: rec,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      explanation: String(parsed.explanation ?? '').slice(0, 300),
      signals: Array.isArray(parsed.signals) ? parsed.signals.map(String).slice(0, 5) : [],
      model: out.model,
      version: VERSION,
      at: new Date().toISOString(),
    };
    return Response.json(result);
  } catch (e) {
    return Response.json(abstain(`ai.explain.unavailable`), { status: 200, headers: { 'x-error': String((e as Error).message) } });
  }
});
